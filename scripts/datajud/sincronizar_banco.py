#!/usr/bin/env python3
"""Atualiza acervo/fonte.json (acervo fonte) no repositório procs-muta a partir do DataJud."""
import argparse
import csv
import hashlib
import io
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from cliente import ClienteDatajud, ErroConsulta, carregar_chave
from sincronizar import chave_publica_wiki


def agora():
    return datetime.now(timezone.utc).isoformat()


def canon(v):
    return json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def cnj(v):
    return re.sub(r"\D", "", str(v or ""))


def lista(v):
    return v if isinstance(v, list) else [v] if v else []


def resumo(regs):
    regs = sorted(regs, key=lambda r: str(r.get("dataHoraUltimaAtualizacao", "")))
    latest = regs[-1]
    movs = [m for r in regs for m in lista(r.get("movimentos")) if isinstance(m, dict)]
    movimento = max(movs, key=lambda m: str(m.get("dataHora", "")), default={})
    assuntos = {str(a.get("codigo", "")): a for r in regs for a in lista(r.get("assuntos")) if isinstance(a, dict)}
    return {"graus": sorted({str(r.get("grau", "")) for r in regs}), "classe": latest.get("classe", {}),
            "orgaoJulgador": latest.get("orgaoJulgador", {}), "assuntos": list(assuntos.values()),
            "dataAjuizamento": latest.get("dataAjuizamento", ""), "ultimaMovimentacao": movimento,
            "dataAtualizacao": latest.get("dataHoraUltimaAtualizacao", ""), "registros": len(regs)}


def atualizar(doc, state, coleta, consultado=None, acrescentar=False):
    """acrescentar=False (padrão): o DataJud só complementa os processos que já estão na fonte; quem decide quem
    está no gabinete é scripts/painel/atualizar_fonte.py (PJe + Power BI). O órgão no DataJud inclui baixados."""
    consultado = consultado or agora()
    local = doc.setdefault("registros", [])
    por_id = {cnj(r.get("processo") or r.get("Processo")): r for r in local if cnj(r.get("processo") or r.get("Processo"))}
    grupos = {}
    for r in coleta.get("registros", []):
        n = cnj(r.get("numeroProcesso"))
        if len(n) == 20: grupos.setdefault(n, []).append(r)
    eventos, hashes_novos = [], {}
    for n, fontes in sorted(grupos.items()):
        s = resumo(fontes); h = hashlib.sha256(canon(s).encode()).hexdigest(); hashes_novos[n] = h
        antigo = state.get("hashes", {}).get(n)
        proc = por_id.get(n)
        if proc is None and not acrescentar:
            continue
        cat = "novos" if proc is None else "iguais" if antigo is None or antigo == h else "atualizados"
        if proc is None:
            proc = {"id": "acv-" + n, "processo": n}; local.append(proc); por_id[n] = proc
        old_fields = {k: proc.get(k) for k in ("DataJud · Situação", "DataJud · Conferir", "DataJud · Observação")}
        proc.update({"DataJud · Classe": (s.get("classe") or {}).get("nome", ""),
                     "DataJud · Código Classe": (s.get("classe") or {}).get("codigo", ""),
                     "DataJud · Assunto Principal": ((s.get("assuntos") or [{}])[0]).get("nome", ""),
                     "DataJud · Código Assunto": ((s.get("assuntos") or [{}])[0]).get("codigo", ""),
                     "DataJud · Assuntos": "; ".join(a.get("nome", "") for a in s.get("assuntos", []) if a.get("nome")),
                     "DataJud · Órgão Julgador": (s.get("orgaoJulgador") or {}).get("nome", ""),
                     "DataJud · Código Órgão": (s.get("orgaoJulgador") or {}).get("codigo", ""),
                     "DataJud · Ajuizamento": s.get("dataAjuizamento", ""),
                     "DataJud · Graus": ", ".join(s.get("graus", [])),
                     "DataJud · Situação": "observado", "DataJud · Conferir": "Sim" if cat in ("novos", "atualizados") else "",
                     "DataJud · Última coleta": consultado, "DataJud · Último movimento": (s.get("ultimaMovimentacao") or {}).get("nome", ""),
                     "DataJud · Data movimento": (s.get("ultimaMovimentacao") or {}).get("dataHora", ""),
                     "atualizado_em": consultado})
        eventos.append({"categoria": cat, "processo": n, "resumo": s,
                        "primeiraLeitura": consultado if antigo is None else state.get("primeirasLeituras", {}).get(n, consultado),
                        "mudancas": [k for k in proc if k.startswith("DataJud ·")], "avisos": []})
    ausentes = {n for n in set(state.get("hashes", {})) - set(hashes_novos) if n in por_id}
    for n in sorted(ausentes):
        proc = por_id.get(n)
        if proc:
            proc["DataJud · Situação"] = "ausente da consulta; conferir"
            proc["DataJud · Conferir"] = "Sim"
            proc["DataJud · Última coleta"] = consultado
        eventos.append({"categoria": "ausentes", "processo": n, "resumo": {}, "avisos": [],
                        "observacao": "Não apareceu nesta consulta; mantido no acervo."})
    doc["schema"] = doc.get("schema", "gabA.acervo")
    doc["schema_versao"] = doc.get("schema_versao", 2)
    doc["atualizado_em"] = consultado
    for k in ("DataJud · Classe", "DataJud · Código Classe", "DataJud · Assunto Principal", "DataJud · Código Assunto", "DataJud · Assuntos", "DataJud · Órgão Julgador", "DataJud · Código Órgão", "DataJud · Ajuizamento", "DataJud · Graus", "DataJud · Situação", "DataJud · Conferir", "DataJud · Última coleta", "DataJud · Último movimento", "DataJud · Data movimento"):
        if k not in doc.setdefault("colunas", []): doc["colunas"].append(k)
    state["hashes"] = hashes_novos
    state.setdefault("primeirasLeituras", {}).update({n: consultado for n in hashes_novos if n not in state.get("primeirasLeituras", {})})
    state["consultadoEm"] = consultado
    counts = {k: sum(1 for e in eventos if e["categoria"] == k) for k in ("novos", "atualizados", "iguais", "ausentes")}
    report = {"schema": "gabcmt.datajud.relatorio", "consultadoEm": consultado, "tribunal": coleta.get("tribunal", "trf3"),
              "orgao": coleta.get("orgao", "91624"), "coletaCompleta": True, "totalRegistrosDatajud": coleta.get("total", len(grupos)),
              "totais": {**counts, "semCobertura": 0}, "processos": eventos,
              "observacao": "Ausências não removem processos. Conferir os autos para situação e prazos."}
    return doc, state, report


def grava(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp=path.with_suffix(path.suffix+".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    os.replace(tmp,path)


def exportar_csv(doc, caminho):
    cols=doc.get("colunas") or sorted({k for r in doc.get("registros",[]) for k in r})
    out=io.StringIO(newline="")
    w=csv.DictWriter(out, fieldnames=cols, extrasaction="ignore");w.writeheader()
    w.writerows({**r, "Processo": r.get("Processo") or r.get("processo", "")} for r in doc.get("registros",[]))
    caminho.write_text("\ufeff"+out.getvalue(),encoding="utf-8")


def main():
    p=argparse.ArgumentParser();p.add_argument("--acervo",type=Path,required=True);p.add_argument("--orgao",default="91624");p.add_argument("--tribunal",default="trf3");p.add_argument("--aplicar",action="store_true");p.add_argument("--chave-wiki",action="store_true");a=p.parse_args()
    root=a.acervo; path=root/"acervo/fonte.json";doc=json.loads(path.read_text(encoding="utf-8"));sp=root/"acervo/datajud/estado.json";state=json.loads(sp.read_text()) if sp.exists() else {}
    key=carregar_chave() or (chave_publica_wiki() if a.chave_wiki else None)
    coleta=ClienteDatajud(chave=key).coletar_orgao(a.orgao,a.tribunal,tamanho=200)
    novo,state,report=atualizar(doc,state,coleta)
    print(json.dumps({"coletaCompleta":True,"totais":report["totais"],"consultadoEm":report["consultadoEm"]}))
    if a.aplicar:
        grava(path,novo);grava(sp,state);grava(root/"acervo/datajud/ultimo-relatorio.json",report)
        grava(root/"acervo/datajud/relatorios"/(report["consultadoEm"][:10]+".json"),report)
        exportar_csv(novo,root/"acervo/fonte.csv")

if __name__ == "__main__":
    try: main()
    except (ErroConsulta,OSError,ValueError,KeyError) as e:
        print("DataJud interrompido:", str(e) if isinstance(e,ErroConsulta) else type(e).__name__,file=sys.stderr);sys.exit(1)
