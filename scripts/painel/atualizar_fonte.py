#!/usr/bin/env python3
"""Acervo fonte = processos em andamento no gabinete, com o paradeiro (tarefa do PJe) sempre atualizado.

Uso:
  python3 scripts/painel/atualizar_fonte.py --principal EM_ANDAMENTO.csv [--complementar X.xlsx ...] [--tarefa TAREFA.csv ...]
  python3 scripts/painel/atualizar_fonte.py --carga acervo/entrada/carga.json
      (carga gravada pelo botão "Atualizar acervo fonte" via padrao/acervo-fonte.js; o Action acervo-fonte.yml a processa)

Papéis das planilhas:
  principal     lista dos em andamento (PJe com a coluna Tarefa). Define quem está na fonte e onde está: entra quem
                aparece, sai quem não aparece. Cada planilha só refaz as próprias colunas, quando vem na carga.
  complementar  mais informações: relação detalhada do PJe ou outra planilha com número do processo. Só preenche quem
                já está na fonte. Planilhas do Power BI (tramitação, sigilosos) não são mais usadas: são ignoradas, e as
                colunas delas saem da fonte.
  tarefa        lista de uma tarefa do PJe. Atualiza o paradeiro de quem veio nela (e acrescenta quem faltava); quem estava
                naquela tarefa e não veio perde a tarefa (tarefa_anterior, saiu_da_tarefa_em), sem sair da fonte.
Sem planilha principal, a carga é parcial: ninguém sai da fonte.
Sempre preservados: DataJud, advogados, DPU, MPF, 1º grau, Seção Competente.
paradeiro_em = data da carga que confirmou ou mudou a tarefa.
acervo/operacional.json acompanha a fonte 1:1. Quem sai e tinha trabalho registrado vai para acervo/operacional-arquivo.json;
se voltar, o registro é restaurado de lá. Idempotente.
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
    "SIN_UFOR", "BASE", "K_TEMPO", "SIN_PEND_1JULG", "SIN_CLS", "DES_ULTIMA_MOVIME_SIGILO",
    "Órgão Julgador", "Colegiado", "Sigiloso", "Liminar Pendente", "Cargo Judicial", "Peso Prioridade", "Data Último Movimento"])
dig = lambda s: re.sub(r"\D", "", str(s or ""))


def val(v):
    if v is None: return ""
    if isinstance(v, datetime.datetime): return v.strftime("%Y-%m-%d")
    if isinstance(v, float): return f"{v:.2f}"
    return str(v).strip()


def iso(d):
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", d or "")
    return f"{m[3]}-{m[2]}-{m[1]}" if m else (d or "")


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


PJE_CHAVE, BI_CHAVE = "Número do Processo", "Processo"
CHAVES = ("Número do Processo", "Processo", "processo", "Nº Processo", "Número Processo")
PII = re.compile(r"cpf|celular|telefone|e-?mail", re.I)
# colunas de planilha genérica que viram campo da fonte (além das que já têm o mesmo nome na fonte)
ALIAS = {"Tarefa": "tarefa_atual", "Tarefa Atual": "tarefa_atual", "tarefa atual": "tarefa_atual",
         "Data de Chegada": "data_entrada_tarefa", "Data Entrada Tarefa": "data_entrada_tarefa",
         "Classe Judicial": "classe_judicial", "Assunto Judicial": "assunto_judicial", "Etiquetas": "Etiquetas",
         "Polo Ativo": "polo_ativo", "Polo Passivo": "polo_passivo", "Prioridade": "prioridade"}
# Power BI (tramitação e sigilosos) deixou de ser usado em 16/11/2026: as suas colunas saem da fonte a cada carga
LEGADO = set(BI_COLS) | set(SIG_COLS) | {"Consta_Acervo_Gab_A", "Consta_Acervo_Sigiloso", "fora_pje", "DAT_FIM", "NUM_CPF_MAGIST", "SIN_PRAZO_LEGAL", "SIN_SECRETARIA", "SIN_CONTADORIA", "SIN_REM_EXTERNA",
          "SIN_UFOR", "BASE", "K_TEMPO", "SIN_PEND_1JULG", "SIN_CLS", "DES_ULTIMA_MOVIME_SIGILO"}
PARADEIRO = ("tarefa_atual", "data_entrada_tarefa", "tarefa_anterior", "saiu_da_tarefa_em", "paradeiro_em")


def chave(linha):
    for k in CHAVES:
        if linha.get(k): return dig(linha[k])
    return ""


def tipo_de(linhas):
    h = set().union(*[set(x) for x in linhas[:50]]) if linhas else set()
    if "Número do Processo" in h and "Tarefa" in h: return "pje"
    if "Nível_Sigilo" in h: return "sigilosos"
    if "Processo" in h and ("Indicador" in h or "Tempo_de_Tramitação" in h): return "bi"
    return "generica"


def papel_padrao(tipo, linhas):
    """PJe com várias tarefas = principal (lista dos em andamento); com uma ou duas = de tarefa; o resto = complementar."""
    if tipo == "pje":
        return "principal" if len({x.get("Tarefa") for x in linhas if x.get("Tarefa")}) >= 3 else "tarefa"
    return "complementar"


# exportação da lista de uma tarefa do PJe (nomes em camelCase): mesmos campos do painel gerencial
PJE_LISTA = {"nomeTarefa": "Tarefa", "dataChegada": "Data de Chegada", "tagsProcessoList": "Etiquetas", "poloAtivo": "Polo Ativo",
             "poloPassivo": "Polo Passivo", "classeJudicial": "Classe", "assuntoPrincipal": "Assunto", "orgaoJulgador": "Órgão Julgador",
             "orgaoJulgadorColegiado": "Colegiado", "sigiloso": "Sigiloso", "cargoJudicial": "Cargo Judicial", "prioridade": "Prioridade"}


def normalizar_lista(x):
    if "nomeTarefa" not in x and "dataChegada" not in x: return x
    y = {PJE_LISTA.get(k, k): v for k, v in x.items()}
    if "Número do Processo" not in y and "Processo" in y: y["Número do Processo"] = y.pop("Processo")
    return y


def arquivo(nome, linhas, tipo=None, papel=None):
    linhas = [normalizar_lista({k: ("" if v is None else v) for k, v in x.items() if not PII.search(str(k))}) for x in linhas]
    if tipo in (None, "", "generica") and tipo_de(linhas) == "pje": tipo = "pje"
    tipo = tipo or tipo_de(linhas)
    if tipo == "pje": linhas = [{k: str(v) for k, v in x.items()} for x in linhas]
    regs = {}
    for x in linhas:
        d = chave(x)
        if len(d) == 20: regs[d] = x
    return {"nome": nome, "tipo": tipo, "papel": papel or papel_padrao(tipo, linhas), "regs": regs,
            "tarefas": sorted({x.get("Tarefa") or x.get("tarefa_atual") or "" for x in linhas} - {""})}


def ler_planilha(p):
    p = Path(p)
    if p.suffix.lower() == ".csv":
        with open(p, encoding="utf-8-sig") as f:
            t = f.read()
        sep = ";" if t.split("\n", 1)[0].count(";") >= t.split("\n", 1)[0].count(",") else ","
        return list(csv.DictReader(t.splitlines(), delimiter=sep))
    import openpyxl
    ws = openpyxl.load_workbook(p, data_only=True).active
    rows = list(ws.iter_rows(values_only=True))
    i = next(i for i, r in enumerate(rows) if r and any(str(v or "").strip() in CHAVES for v in r))
    h = [str(v or "").strip() for v in rows[i]]
    return [{k: (val(v) if isinstance(v, datetime.datetime) else v) for k, v in zip(h, r) if k} for r in rows[i + 1:] if r]


def ler_carga(p):
    c = json.loads(Path(p).read_text(encoding="utf-8"))
    if isinstance(c.get("arquivos"), list):                      # versão 2: lista de arquivos com papel
        return [arquivo(a.get("nome", ""), a.get("linhas") or [], a.get("tipo"), a.get("papel")) for a in c["arquivos"]]
    nomes = c.get("arquivos") or {}                               # versão 1: as três planilhas, todas principais
    return [arquivo(nomes.get(t, t), c.get(t) or [], t, "principal") for t in ("pje", "bi", "sigilosos") if c.get(t)]


# colunas do painel gerencial guardadas como vêm, para a pesquisa da Triagem (os critérios básicos do PJe)
PJE_EXTRA = ["Órgão Julgador", "Colegiado", "Sigiloso", "Liminar Pendente", "Cargo Judicial", "Peso Prioridade", "Data Último Movimento"]


def aplicar_pje(r, p):
    for c in PJE_EXTRA:
        if c in p: r[c] = val(p.get(c)) if not isinstance(p.get(c), str) else p.get(c).strip()
    r["tarefa_atual"] = p.get("Tarefa", ""); r["data_entrada_tarefa"] = iso(p.get("Data de Chegada", ""))
    if "Prioridade" in p: r["prioridade"] = "Sim" if str(p["Prioridade"]).lower() in ("true", "sim", "1") else "Não"
    if "Etiquetas" in p:
        for k in ("Etiquetas", "etiquetas", "Etiquetas Originais"): r[k] = p["Etiquetas"]
    for x, y in [("polo_ativo", "Polo Ativo"), ("polo_passivo", "Polo Passivo"), ("classe_judicial", "Classe"), ("assunto_judicial", "Assunto")]:
        if not r.get(x) and p.get(y): r[x] = p[y]


def aplicar_bi(r, b):
    for c in BI_COLS:
        v = f"{float(b[c]):.2f}" if c == "Valor_da_Causa" and b.get(c) not in (None, "") else val(b.get(c))
        if v or r.get(c): r[c] = v
    r["Consta_Acervo_Gab_A"] = "Sim"
    for x, y in [("data_distribuição", "Data_Distribuição"), ("ultimo_movimento", "Última_Movimentação"),
                 ("polo_ativo", "Polo_Ativo"), ("polo_passivo", "Polo_Passivo"), ("valor_causa", "Valor_da_Causa")]:
        if r.get(y): r[x] = r[y]
    if not r.get("classe_judicial") and r.get("Classe"): r["classe_judicial"] = r["Classe"]
    if not r.get("assunto_judicial") and r.get("Assunto_Principal"): r["assunto_judicial"] = r["Assunto_Principal"]


def aplicar_sig(r, s):
    for c in ["Ano", "Mês", "Gabinete", "Data_Distribuição"] + SIG_COLS:
        v = val(s.get(c))
        if v and (c in SIG_COLS or not r.get(c)): r[c] = v
    r["Consta_Acervo_Sigiloso"] = "Sim"
    if not r.get("data_distribuição") and r.get("Data_Distribuição"): r["data_distribuição"] = r["Data_Distribuição"]


def aplicar_generica(r, g, conhecidas):
    n = 0
    for k, v in g.items():
        if k in CHAVES: continue
        campo = ALIAS.get(k) or (k if k in conhecidas else None)
        if not campo or v in (None, ""): continue
        v = val(v)
        if campo in ("Etiquetas",):
            for e in ("Etiquetas", "etiquetas", "Etiquetas Originais"): r[e] = v
        else:
            r[campo] = iso(v) if campo.startswith("data") or campo.startswith("Data") else v
        n += 1
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--principal", action="append", default=[], help="lista dos em andamento: define quem está na fonte e onde")
    ap.add_argument("--complementar", action="append", default=[], help="mais informações; só preenche quem já está na fonte")
    ap.add_argument("--tarefa", action="append", default=[], help="lista de uma tarefa: atualiza o paradeiro de quem veio nela")
    ap.add_argument("--pje"); ap.add_argument("--bi"); ap.add_argument("--sigilosos")   # forma antiga: as três como principais
    ap.add_argument("--carga"); ap.add_argument("--raiz", default=".")
    a = ap.parse_args()
    raiz = Path(a.raiz); A = raiz / "acervo"
    agora = datetime.datetime.now(datetime.timezone.utc).isoformat()
    agora_z = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    hoje = agora[:10]
    if a.carga:
        arqs = ler_carga(a.carga)
    else:
        arqs = [arquivo(f, ler_planilha(f), papel="principal") for f in [a.pje, a.bi, a.sigilosos] if f]
        arqs += [arquivo(f, ler_planilha(f), papel=pp) for pp, fs in (("principal", a.principal), ("complementar", a.complementar), ("tarefa", a.tarefa)) for f in fs]
    arqs = [x for x in arqs if x["regs"]]
    bi_fora = [x["nome"] + " (Power BI: não é mais usado)" for x in arqs if x["tipo"] in ("bi", "sigilosos")]
    arqs = [x for x in arqs if x["tipo"] not in ("bi", "sigilosos")]
    if not arqs and bi_fora:
        sys.exit("Só planilhas do Power BI, que não são mais usadas: nada foi alterado.")
    limpeza = bool(a.carga) and bool(json.loads(Path(a.carga).read_text(encoding="utf-8")).get("limpeza"))
    if not arqs and not limpeza:
        sys.exit("Nenhuma planilha com processos: nada foi alterado.")

    doc = json.loads((A / "fonte.json").read_text(encoding="utf-8"))
    antigos = {dig(r.get("processo") or r.get("Processo")): r for r in doc["registros"]}
    conhecidas = set(doc.get("colunas", [])) | {k for r in doc["registros"] for k in r}
    principais = [x for x in arqs if x["papel"] == "principal"]
    de_tarefa = [x for x in arqs if x["papel"] == "tarefa"]
    st = {"arquivos": [f'{x["nome"]} ({x["tipo"]}, {x["papel"]}, {len(x["regs"])})' for x in arqs]}

    # quem está na fonte: com principal, só quem aparece nela (+ quem veio nas listas de tarefa, que estão em tarefa do gabinete);
    # sem principal, todos os de antes + os das listas de tarefa (ninguém sai)
    da_tarefa = set().union(*[set(x["regs"]) for x in de_tarefa]) if de_tarefa else set()
    membros = (set().union(*[set(x["regs"]) for x in principais]) | da_tarefa) if principais else (set(antigos) | da_tarefa)
    st.update(modo="completa" if principais else "parcial", processos=len(membros))

    regs, mudou = {}, False
    for d in membros:
        velho = antigos.get(d)
        r = dict(velho or {})
        # colunas sem planilha de origem (exportações antigas do BI) saem; as demais só mudam quando a planilha
        # daquele tipo vem na carga (PJe: tarefa e etiquetas; Power BI e sigilosos: as suas colunas e a marca Consta_Acervo_*)
        r = {k: v for k, v in r.items() if k not in LEGADO}
        if not r:
            x0 = next(x["regs"][d] for x in arqs if d in x["regs"])
            r = {"id": "acv-" + d, "processo": x0.get("Número do Processo") or x0.get("Processo") or x0.get("processo")}
        regs[d] = r

    # paradeiro (tarefa): PJe principal manda em todos; lista de tarefa manda nas tarefas que ela cobre
    pje_principal = [x for x in principais if x["tipo"] == "pje"]
    tarefa_por = {}
    for x in pje_principal + de_tarefa:
        for d, p in x["regs"].items(): tarefa_por[d] = p
    saiu_tarefa = 0
    for d, r in regs.items():
        if d in tarefa_por:
            antes = r.get("tarefa_atual", "")
            aplicar_pje(r, tarefa_por[d]); r.pop("tarefa_anterior", None); r.pop("saiu_da_tarefa_em", None)
            if antes != r["tarefa_atual"] or not r.get("paradeiro_em"): r["paradeiro_em"] = hoje
            continue
        cobre = bool(pje_principal) or any(r.get("tarefa_atual") in x["tarefas"] for x in de_tarefa)
        if cobre and r.get("tarefa_atual"):
            r["tarefa_anterior"] = r["tarefa_atual"]; r["tarefa_atual"] = ""; r["data_entrada_tarefa"] = ""
            r["saiu_da_tarefa_em"] = hoje; r["paradeiro_em"] = hoje; saiu_tarefa += 1
        elif principais and not pje_principal:                 # principal sem tarefa (ex.: Power BI): mantém o paradeiro conhecido
            pass
    st["sairam_da_tarefa"] = saiu_tarefa

    # complementos: Power BI e sigilosos são listas inteiras (refazem as suas colunas e a flag); genérica só preenche
    if bi_fora: st["ignoradas"] = bi_fora
    for x in arqs:
        if x["tipo"] == "generica":
            st.setdefault("genericas", {})[x["nome"]] = sum(aplicar_generica(regs[d], g, conhecidas) for d, g in x["regs"].items() if d in regs)

    novos = []
    for d in sorted(regs):
        r, velho = regs[d], antigos.get(d)
        if not r.get("Assunto") and r.get("assunto_judicial"): r["Assunto"] = r["assunto_judicial"]
        for k in ("data_distribuição", "Data_Distribuição", "Data_Conclusão", "Data_Última_Movimentação", "dt_distribuicao_1g", "data_entrada_tarefa"):
            if isinstance(r.get(k), str): r[k] = iso(r[k])
        r = {k: v for k, v in r.items() if not (v in ("", None) and (velho is None or k not in velho))}
        comparar = {k: v for k, v in r.items() if k != "atualizado_em"}
        if not velho or comparar != {k: v for k, v in velho.items() if k != "atualizado_em"}:
            r["atualizado_em"] = agora; mudou = True
        novos.append(r)
    ativos = set(regs)
    st["entraram"] = len(ativos - set(antigos)); st["sairam"] = len(set(antigos) - ativos)

    usadas = {k for r in novos for k, v in r.items() if not vazio(v)}
    cols = [c for c in doc.get("colunas", []) if c in usadas or c == "Processo"]
    cols += sorted(usadas - set(cols) - {"id", "processo", "atualizado_em"})
    mudou = mudou or len(novos) != len(antigos) or cols != doc.get("colunas")
    doc.update(registros=novos, colunas=cols, atualizado_em=agora if mudou else doc.get("atualizado_em", agora),
               regra="Fonte = processos em andamento no gabinete. A planilha principal (lista dos em andamento, com a tarefa do PJe) "
                     "define quem está e onde está: entra quem aparece, sai quem não aparece. Complementares (relação detalhada do PJe, "
                     "outras) só preenchem dados de quem já está. Lista de uma tarefa atualiza o paradeiro de quem veio nela; quem estava "
                     "naquela tarefa e não veio perde a tarefa, sem sair da fonte. scripts/painel/atualizar_fonte.py")
    (A / "fonte.json").write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    cel = lambda v: "" if v is None else ('"' + str(v).replace('"', '""') + '"' if re.search(r'[",\n\r]', str(v)) else str(v))
    linhas = [",".join(cel(c) for c in cols)] + [",".join(cel(r.get("processo") if c == "Processo" else r.get(c)) for c in cols) for r in novos]
    (A / "fonte.csv").write_text("\ufeff" + "\r\n".join(linhas) + "\r\n", encoding="utf-8", newline="")

    # operacional 1:1 com a fonte; quem sai com histórico vai para o arquivo; quem volta é restaurado
    op = json.loads((A / "operacional.json").read_text(encoding="utf-8"))
    pa = A / "operacional-arquivo.json"
    arq = json.loads(pa.read_text(encoding="utf-8")) if pa.exists() else {
        "schema": "gabA.operacional-arquivo", "descricao": "Trabalho registrado de processos que saíram do gabinete "
        "(baixados, arquivados, redistribuídos). Volta ao operacional se o processo voltar.", "registros": []}
    por = {dig(o["processo"]): o for o in op["registros"]}
    guardados = {dig(o["processo"]): o for o in arq["registros"]}
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
