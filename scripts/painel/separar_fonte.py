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


def achatar(o):
    """Registro em seções → plano (para a separação); registro plano passa intacto."""
    if "triagem" not in o:
        return o
    plano = {"processo": o["processo"], "pautas": o.get("pauta", {}).get("sessoes", [])}
    for s in ("geral", "triagem", "producao", "pauta"):
        plano.update({k: v for k, v in (o.get(s) or {}).items() if k != "sessoes"})
    return plano


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
    por_cnj = {r["processo"]: achatar(r) for r in oper.get("registros", [])}
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

    # um registro operacional para cada processo do fonte (1:1), exceto os baixados/arquivados em definitivo;
    # baixado ou fora do fonte com trabalho registrado fica, marcado (histórico não se apaga)
    def baixado(r):
        t = str(r.get("tarefa_atual") or "").lower()
        return ("baixados ao juízo" in t or "arquivo permanente" in t or "baixados por" in t
                or r.get("ultimo_movimento") in ("Arquivado Definitivamente", "Baixa Definitiva"))
    def com_trabalho(o):
        return bool(o.get("pautas")) or any(not vazio(o[k]) and k not in ("processo", "pautas", "atualizado_em", "baixado", "fora_do_fonte")
                                            for k in o)
    ativos = {r["processo"] for r in fonte["registros"] if not baixado(r)}
    baixados = {r["processo"] for r in fonte["registros"]} - ativos
    for n in ativos:
        por_cnj.setdefault(n, {"processo": n, "pautas": []})
    for n in list(por_cnj):
        o = por_cnj[n]
        o.pop("baixado", None); o.pop("fora_do_fonte", None)
        if n in ativos:
            continue
        if not com_trabalho(o):
            del por_cnj[n]
        elif n in baixados:
            o["baixado"] = True
        else:
            o["fora_do_fonte"] = True

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




# ---------- organização do operacional em seções ----------
SECOES = {
    "triagem": ["Tempestividade", "Preparo", "Representação", "Regularidade", "MPF", "Mídias", "AJG", "DPU (controle)",
                "Impedimento / Suspeição", "Contrarrazões - Situação", "META", "Dificuldade", "Seleção Prévia",
                "_autoRestriction", "_magistradoRestricao", "_restricaoTipo", "_preparoAJG", "_preparoBeforeAJG",
                "_ajgFromDpu", "_dpuAuto", "_ajgAuto", "_autoMetaTags"],
    "producao": ["SERVIDOR", "MINUTADO", "_ementa", "_genV", "_recursos", "_contras", "_minutadoBy",
                 "_minutadoSession", "_prontoParaCorrecao"],
    "pauta": ["Status de Julgamento", "Sessão original", "Sessão Destino", "JULGAMENTO", "_pautaEntries", "_pautaHistory"],
}
GERAL = ["baixado", "fora_do_fonte"]


def secionar(o):
    """Registro plano → {processo, geral, triagem, producao, pauta}. Idempotente."""
    painel = o.pop("_painel", {}) or {}
    novo = {"processo": o.pop("processo")}
    plano = {**painel, **o}
    for s in ("geral", "triagem", "producao", "pauta"):
        sub = plano.pop(s, None)
        if isinstance(sub, dict):
            plano.update({k: v for k, v in sub.items() if k != "sessoes"})
            if s == "pauta" and "sessoes" in sub:
                plano["pautas"] = sub["sessoes"]
    geral = {k: plano.pop(k) for k in GERAL if k in plano}
    geral["atualizado_em"] = plano.pop("atualizado_em", "")
    novo["geral"] = geral
    for s, campos in SECOES.items():
        novo[s] = {c: plano.pop(c) for c in campos if c in plano and not vazio(plano[c])}
    novo["pauta"]["sessoes"] = plano.pop("pautas", [])          # histórico: sessão, item, resultado
    for k in list(plano):                                       # o que sobrar vai para geral
        if not vazio(plano[k]):
            novo["geral"][k] = plano.pop(k)
    return novo


def organizar(raiz=Path(".")):
    po = raiz / "acervo/operacional.json"
    oper = json.loads(po.read_text(encoding="utf-8"))
    oper["schema_versao"] = 2
    oper["registros"] = [secionar(r) for r in oper["registros"]]
    oper["secoes"] = {
        "geral": "situação do registro (baixado, fora do fonte), atualização e demais informações gerais",
        "triagem": SECOES["triagem"], "producao": SECOES["producao"],
        "pauta": SECOES["pauta"] + ["sessoes: [{sessao, item, resultado}] · histórico de inclusões, retiradas e adiamentos"],
    }
    oper.pop("colunas", None)
    po.write_text(json.dumps(oper, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("operacional organizado em seções:", len(oper["registros"]), "registros")


if __name__ == "__main__":
    main()
    organizar(Path(".") if len(__import__("sys").argv) < 3 else Path(__import__("sys").argv[2]))
