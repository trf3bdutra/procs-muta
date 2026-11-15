#!/usr/bin/env python3
"""Separa o acervo: fonte (PJe, Power BI, DataJud) x operacional (trabalho do gabinete).

Uso:  python3 scripts/painel/separar_fonte.py [--raiz .]

- Tira de acervo/fonte.json as colunas preenchidas pelo gabinete e o estado interno do Painel ("_", "painel").
- Grava em acervo/operacional.json só os valores reais, com os nomes da Ficha.
- Descarta os valores padrão que o Painel Central atribui na importação (não são dado verificado).
- Idempotente: rodar de novo não duplica nada.
"""
import argparse, csv, io, json
from pathlib import Path

# colunas do gabinete (nomes da Ficha) que não pertencem ao fonte
GABINETE = ["Tempestividade", "Preparo", "Representação", "Regularidade", "MPF", "Mídias",
            "Status de Julgamento", "Etiquetas Operacionais", "AJG", "DPU (controle)",
            "Impedimento / Suspeição", "Contrarrazões - Situação", "META", "SERVIDOR", "MINUTADO",
            "Dificuldade", "Sessão original", "Sessão Destino", "Seleção Prévia", "JULGAMENTO"]

# valores padrão do Painel Central: não são informação
PADRAO = {
    "Tempestividade": {"Não Verificado"}, "Preparo": {"Não Verificado"}, "Representação": {"Não Verificado"},
    "MPF": {"Não se Aplica"}, "Mídias": {"Não se Aplica"}, "Status de Julgamento": {"PENDENTE"},
    "Regularidade": {"Representação ainda não verificada."},
    "Etiquetas Operacionais": {'[{"name":"VERIFICAR REPRESENTAÇÃO","status":"pendente"}]', "[]"},
}


def vazio(v):
    return v is None or v == "" or v is False or v == [] or v == {}


def util_painel(d):
    """Estado interno do Painel: só o que não é vazio nem marcador técnico de migração."""
    if not isinstance(d, dict):
        return {}
    ignorar = {"_tagListsInitialized", "_preReviewMigrated", "_metaTagSignature", "_restrictionTagSignature",
               "_pjeFields", "_tagOriginalSource", "_preOrder", "_julgadorColegiado", "_pjeCreated"}
    return {k: v for k, v in d.items() if k not in ignorar and not vazio(v)}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--raiz", type=Path, default=Path("."))
    raiz = ap.parse_args().raiz
    pf, po = raiz / "acervo/fonte.json", raiz / "acervo/operacional.json"
    fonte = json.loads(pf.read_text(encoding="utf-8"))
    oper = json.loads(po.read_text(encoding="utf-8"))
    por_cnj = {r["processo"]: r for r in oper.get("registros", [])}
    movidos = descartados = 0

    for r in fonte["registros"]:
        dest = {}
        for c in GABINETE:
            if c not in r:
                continue
            v = r.pop(c)
            if vazio(v) or str(v).strip() in PADRAO.get(c, set()):
                descartados += 1
            else:
                dest[c] = v
        painel = util_painel(r.pop("_", None))
        if painel:
            dest["_painel"] = painel
        if not dest:
            continue
        o = por_cnj.setdefault(r["processo"], {"processo": r["processo"], "pautas": []})
        for c, v in dest.items():
            if c not in o or vazio(o[c]):
                o[c] = v; movidos += 1
        o["atualizado_em"] = fonte.get("atualizado_em") or o.get("atualizado_em", "")

    # estado global do Painel (regras, preferências) também é operacional
    if "painel" in fonte:
        oper.setdefault("painel", fonte.pop("painel"))
    fonte["colunas"] = [c for c in fonte.get("colunas", []) if c not in GABINETE and c != "_"]
    fonte["saneamento"] = ("Só dados de origem: planilhas do PJe e do Power BI e DataJud. Sem celulares, telefones, "
                           "e-mails e CPF (repositório público). Sigilosos já vêm mascarados (###) na origem. "
                           "O trabalho do gabinete fica em acervo/operacional.json.")

    cols = list(dict.fromkeys(oper.get("colunas", []) + GABINETE + ["_painel"]))
    oper["colunas"] = cols
    oper["registros"] = sorted(por_cnj.values(), key=lambda x: x["processo"])
    oper["descricao"] = ("Trabalho do gabinete por processo (nomes de campo da Ficha): triagem, admissibilidade, MPF, "
                         "metas, elaboração e passagens por pauta. Valores padrão do Painel não são gravados.")

    pf.write_text(json.dumps(fonte, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    po.write_text(json.dumps(oper, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    out = io.StringIO(newline="")
    w = csv.DictWriter(out, fieldnames=fonte["colunas"] or sorted({k for x in fonte["registros"] for k in x}),
                       extrasaction="ignore")
    w.writeheader(); w.writerows(fonte["registros"])
    (raiz / "acervo/fonte.csv").write_text("﻿" + out.getvalue(), encoding="utf-8")
    print(f"movidos para o operacional: {movidos} · padrões descartados: {descartados} · "
          f"registros operacionais: {len(oper['registros'])}")


if __name__ == "__main__":
    main()
