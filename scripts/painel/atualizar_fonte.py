#!/usr/bin/env python3
"""Acervo fonte = só os processos efetivamente no gabinete.

Uso:
  python3 scripts/painel/atualizar_fonte.py --pje PAINEL_GERENCIAL.csv --bi TRAMITACAO.xlsx --sigilosos SIGILOSOS.xlsx [--raiz .]
  python3 scripts/painel/atualizar_fonte.py --carga acervo/entrada/carga.json [--raiz .]
      (carga gravada pelo botão "Atualizar acervo fonte" da Base do gabinete; o GitHub Action acervo-fonte.yml a processa)

Fontes (as três juntas, sempre do mesmo dia):
  --pje        PJe 2G · Painel Gerencial (CSV ";"): processos em tarefa do gabinete; tarefa, data de chegada,
               prioridade e etiquetas.
  --bi         Power BI · Tramitação Total do Gab. A (xlsx): acervo em tramitação, inclusive o que está
               temporariamente na secretaria (prazo, intimação, juntada). Linhas "Sigilo(...)" são ignoradas.
  --sigilosos  Power BI · acervo sigiloso do Gab. A (xlsx).

Regra:
  - Fica na fonte quem aparece em pelo menos uma das três planilhas.
  - Quem volta ao gabinete entra de novo; quem não aparece em nenhuma (baixado, arquivado, redistribuído) sai.
  - As colunas das planilhas são refeitas do zero a cada carga; ficam preservados só os dados que elas não trazem
    (DataJud, advogados, DPU, MPF, distribuição no 1º grau, Seção Competente, classe/assunto do PJe).
  - acervo/operacional.json acompanha a fonte 1:1. Quem sai e tinha trabalho registrado (pautas, triagem, produção)
    vai para acervo/operacional-arquivo.json; se voltar, o registro é restaurado de lá. Histórico não se apaga.
Idempotente: rodar de novo com as mesmas planilhas não muda nada.
"""
import argparse, csv, datetime, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from separar_fonte import CAMPOS, achatar, vazio, PADRAO  # noqa: E402

BI_COLS = ["Ano", "Mês", "Gabinete", "Indicador", "Data_Distribuição", "Código_Classe", "Classe",
           "Código_Assunto_Principal", "Assunto_Principal", "Assuntos_do_Processo", "Pendente_1Julgamento",
           "Conclusão?", "Data_Conclusão", "Data_Fase", "Fase", "Complemento", "Última_Movimentação",
           "Data_Última_Movimentação", "Tempo_de_Tramitação", "Polo_Ativo", "Polo_Passivo", "Seção de Origem",
           "Valor_da_Causa", "Qtde"]
SIG_COLS = ["Nível_Sigilo", "Tempo_Última_Movimentação"]
# colunas de origem refeitas a cada carga (as do BI/sigilosos atuais e as de exportações antigas, já sem fonte)
REFEITAS = set(BI_COLS + SIG_COLS + [
    "Consta_Acervo_Gab_A", "Consta_Acervo_Sigiloso", "tarefa_atual", "data_entrada_tarefa", "prioridade",
    "Etiquetas", "etiquetas", "Etiquetas Originais", "fora_pje", "tarefa_anterior",
    "DAT_FIM", "NUM_CPF_MAGIST", "SIN_PRAZO_LEGAL", "SIN_SECRETARIA", "SIN_CONTADORIA", "SIN_REM_EXTERNA",
    "SIN_UFOR", "BASE", "K_TEMPO", "SIN_PEND_1JULG", "SIN_CLS", "DES_ULTIMA_MOVIME_SIGILO"])
dig = lambda s: re.sub(r"\D", "", str(s or ""))


def val(v):
    if v is None: return ""
    if isinstance(v, datetime.datetime): return v.strftime("%Y-%m-%d")
    if isinstance(v, float): return f"{v:.2f}"
    return str(v).strip()


def iso(d):
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", d or "")
    return f"{m[3]}-{m[2]}-{m[1]}" if m else (d or "")


def por_cnj(linhas, chave):
    return {dig(x.get(chave)): x for x in linhas if len(dig(x.get(chave))) == 20}


def ler_pje(p):
    with open(p, encoding="utf-8-sig") as f:
        return por_cnj(list(csv.DictReader(f, delimiter=";")), "Número do Processo")


def ler_xlsx(p):
    import openpyxl
    ws = openpyxl.load_workbook(p, data_only=True).active
    rows = list(ws.iter_rows(values_only=True))
    i = next(i for i, r in enumerate(rows) if r and "Processo" in r)
    return por_cnj([dict(zip(rows[i], r)) for r in rows[i + 1:] if r], "Processo")


def ler_carga(p):
    c = json.loads(Path(p).read_text(encoding="utf-8"))
    pje = [{k: ("" if v is None else str(v)) for k, v in x.items()} for x in c.get("pje") or []]  # como no CSV
    return (por_cnj(pje, "Número do Processo"), por_cnj(c.get("bi") or [], "Processo"),
            por_cnj(c.get("sigilosos") or [], "Processo"))


def com_trabalho(o):
    p = achatar(o)
    if p.get("pautas"): return True
    for k, v in p.items():
        if k in ("processo", "pautas", "atualizado_em", "baixado", "fora_do_fonte", "Etiquetas") or vazio(v): continue
        if v in PADRAO.get(k, ()): continue
        return True
    return False


def registro_operacional(proc, etiquetas, agora):
    o = {"processo": proc, "origem": {c: "" for c in CAMPOS["origem"]}}
    o["origem"]["atualizado_em"] = agora
    for s in ("triagem", "producao", "pauta"):
        o[s] = {c: "" for c in CAMPOS[s]}
    o["triagem"]["Etiquetas"] = etiquetas
    o["pauta"]["sessoes"] = []
    return o


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pje"); ap.add_argument("--bi"); ap.add_argument("--sigilosos"); ap.add_argument("--carga")
    ap.add_argument("--raiz", default=".")
    a = ap.parse_args()
    if not a.carga and not (a.pje and a.bi and a.sigilosos):
        ap.error("informe --carga ou as três planilhas (--pje, --bi e --sigilosos)")
    raiz = Path(a.raiz); A = raiz / "acervo"
    agora = datetime.datetime.now(datetime.timezone.utc).isoformat()
    agora_z = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    pje, bi, sig = ler_carga(a.carga) if a.carga else (ler_pje(a.pje), ler_xlsx(a.bi), ler_xlsx(a.sigilosos))
    if not (pje and bi and sig):
        sys.exit("Falta uma das três planilhas (PJe, Power BI ou sigilosos) ou ela veio vazia: nada foi alterado.")

    doc = json.loads((A / "fonte.json").read_text(encoding="utf-8"))
    antigos = {dig(r.get("processo") or r.get("Processo")): r for r in doc["registros"]}
    ativos = set(pje) | set(bi) | set(sig)
    st = {"pje": len(pje), "bi": len(bi), "sigilosos": len(sig), "ativos": len(ativos)}

    novos, mudou = [], False
    for d in sorted(ativos):
        velho = antigos.get(d)
        r = {k: v for k, v in (velho or {}).items() if k not in REFEITAS}
        p, b, s = pje.get(d), bi.get(d), sig.get(d)
        proc = (p or {}).get("Número do Processo") or (b or {}).get("Processo") or (s or {}).get("Processo")
        r.setdefault("id", "acv-" + d); r["processo"] = r.get("processo") or proc
        if b:
            for c in BI_COLS:
                v = f"{float(b[c]):.2f}" if c == "Valor_da_Causa" and b.get(c) is not None else val(b.get(c))
                if v: r[c] = v
            r["Consta_Acervo_Gab_A"] = "Sim"
            for x, y in [("data_distribuição", "Data_Distribuição"), ("ultimo_movimento", "Última_Movimentação"),
                         ("polo_ativo", "Polo_Ativo"), ("polo_passivo", "Polo_Passivo"), ("valor_causa", "Valor_da_Causa")]:
                if r.get(y): r[x] = r[y]
        if s:
            for c in ["Ano", "Mês", "Gabinete", "Data_Distribuição"] + SIG_COLS:
                v = val(s.get(c))
                if v and (c in SIG_COLS or not r.get(c)): r[c] = v
            r["Consta_Acervo_Sigiloso"] = "Sim"
            if not r.get("data_distribuição") and r.get("Data_Distribuição"): r["data_distribuição"] = r["Data_Distribuição"]
        if p:
            r["tarefa_atual"] = p["Tarefa"]; r["data_entrada_tarefa"] = iso(p["Data de Chegada"])
            r["prioridade"] = "Sim" if p["Prioridade"] == "true" else "Não"
            for k in ("Etiquetas", "etiquetas", "Etiquetas Originais"): r[k] = p["Etiquetas"]
            for x, y in [("polo_ativo", "Polo Ativo"), ("polo_passivo", "Polo Passivo")]:
                if not r.get(x) and p.get(y): r[x] = p[y]
        cl = r.get("Classe") or (p or {}).get("Classe")
        asn = r.get("Assunto_Principal") or (p or {}).get("Assunto")
        if not r.get("classe_judicial") and cl: r["classe_judicial"] = cl
        if not r.get("assunto_judicial") and asn: r["assunto_judicial"] = asn
        if not r.get("Assunto") and r.get("assunto_judicial"): r["Assunto"] = r["assunto_judicial"]
        for k in ("data_distribuição", "Data_Distribuição", "Data_Conclusão", "Data_Última_Movimentação", "dt_distribuicao_1g"):
            if isinstance(r.get(k), str): r[k] = iso(r[k])
        comparar = {k: v for k, v in r.items() if k != "atualizado_em"}
        if not velho or comparar != {k: v for k, v in velho.items() if k != "atualizado_em"}:
            r["atualizado_em"] = agora; mudou = True
        novos.append(r)
    st["entraram"] = len(ativos - set(antigos)); st["sairam"] = len(set(antigos) - ativos)

    usadas = {k for r in novos for k, v in r.items() if not vazio(v)}
    cols = [c for c in doc.get("colunas", []) if c in usadas or c == "Processo"]
    cols += sorted(usadas - set(cols) - {"id", "processo", "atualizado_em"})
    mudou = mudou or len(novos) != len(antigos) or cols != doc.get("colunas")
    doc.update(registros=novos, colunas=cols, atualizado_em=agora if mudou else doc.get("atualizado_em", agora),
               regra="Só processos efetivamente no gabinete: em tarefa do gabinete no PJe ou no acervo do Power BI "
                     "(tramitação e sigilosos). Entra quem volta; sai quem foi baixado, arquivado ou redistribuído. "
                     "scripts/painel/atualizar_fonte.py")
    (A / "fonte.json").write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    cel = lambda v: "" if v is None else ('"' + str(v).replace('"', '""') + '"' if re.search(r'[",\n\r]', str(v)) else str(v))
    linhas = [",".join(cel(c) for c in cols)] + [",".join(cel(r.get("processo") if c == "Processo" else r.get(c)) for c in cols) for r in novos]
    (A / "fonte.csv").write_text("﻿" + "\r\n".join(linhas) + "\r\n", encoding="utf-8", newline="")

    # operacional 1:1 com a fonte; quem sai com histórico vai para o arquivo; quem volta é restaurado
    op = json.loads((A / "operacional.json").read_text(encoding="utf-8"))
    pa = A / "operacional-arquivo.json"
    arq = json.loads(pa.read_text(encoding="utf-8")) if pa.exists() else {
        "schema": "gabA.operacional-arquivo", "descricao": "Trabalho registrado de processos que saíram do gabinete "
        "(baixados, arquivados, redistribuídos). Volta ao operacional se o processo voltar.", "registros": []}
    por = {dig(o["processo"]): o for o in op["registros"]}
    guardados = {dig(o["processo"]): o for o in arq["registros"]}
    hoje = agora[:10]
    st.update(op_arquivados=0, op_descartados=0, op_restaurados=0, op_criados=0)
    for d, o in list(por.items()):
        if d in ativos: continue
        del por[d]
        if com_trabalho(o):
            o.setdefault("origem", {}).pop("baixado", None); o["origem"].pop("fora_do_fonte", None)
            o["origem"]["saiu_do_gabinete"] = hoje
            guardados[d] = o; st["op_arquivados"] += 1
        else:
            st["op_descartados"] += 1
    etq = {dig(r["processo"]): r.get("Etiquetas", "") for r in novos}
    for d in ativos:
        o = por.get(d)
        if o is None and d in guardados:
            o = guardados.pop(d); o["origem"].pop("saiu_do_gabinete", None); st["op_restaurados"] += 1
        elif o is None:
            o = registro_operacional(next(r["processo"] for r in novos if dig(r["processo"]) == d), etq.get(d, ""), agora_z)
            st["op_criados"] += 1
        o.setdefault("origem", {}).pop("baixado", None); o["origem"].pop("fora_do_fonte", None)
        por[d] = o
    mexeu = any(st[k] for k in ("op_arquivados", "op_descartados", "op_restaurados", "op_criados"))
    op["registros"] = sorted(por.values(), key=lambda x: x["processo"])
    arq["registros"] = sorted(guardados.values(), key=lambda x: x["processo"])
    if mexeu or "atualizado_em" not in arq:
        op["atualizado_em"] = agora_z; arq["atualizado_em"] = agora_z
    (A / "operacional.json").write_text(json.dumps(op, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    pa.write_text(json.dumps(arq, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    st.update(fonte=len(novos), operacional=len(op["registros"]), arquivo=len(arq["registros"]))
    print(json.dumps(st, ensure_ascii=False))


if __name__ == "__main__":
    main()
