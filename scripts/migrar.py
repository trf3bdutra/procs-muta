#!/usr/bin/env python3
"""Migração única (v1 → padrão 1.0): monta paradigmas/ e referencias/ a partir das bases atuais.

Fontes lidas (nenhuma é alterada):
  data/paradigmas.json                         precedentes (1.749), modelos-matriz (202) e catálogos
  banco/{assuntos,jurisprudencia,normas,paragrafos,redacao}.json
  catalogo-trf3/acordaos.jsonl                 acórdãos colhidos no portal do TRF3
  catalogo-trf3/*/T*.json, casos-sem-par.json  agrupamento automático por tema
  catalogo-trf3/inteiros-teores-*.json         inteiros teores (coleções)
  [opcional] --extra ARQ.json                  outras coleções de inteiros teores no mesmo formato

Uso:  python3 scripts/migrar.py [--extra arquivo.json ...]
Depois: python3 gerar.py  (valida, atualiza o manifesto e confere a compatibilidade)
"""
import json, re, sys, glob, unicodedata, collections
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
AGORA = "2026-10-23T00:00:00Z"


def ler(p):
    return json.loads((RAIZ / p).read_text(encoding="utf-8"))


def iso(d):
    """dd/mm/aaaa ou 'DJEN DATA: dd/mm/aaaa' → aaaa-mm-dd; ISO passa direto."""
    d = (d or "").strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", d):
        return d
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", d)
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else ""


def digitos(proc):
    return re.sub(r"\D", "", proc or "")


ESPECIE_COD = {"ApCiv": "ap", "ApelRemNec": "aprn", "RemNecCiv": "rn", "AI": "ai", "EDcl": "ed", "AgInt": "agint",
               "CCCiv": "cc", "AR": "ar", "MSCol": "ms", "SuspApel": "susp"}


def id_precedente(proc, julg_iso, especie):
    cod = ESPECIE_COD.get(especie) or slug(especie).replace("-", "") or "x"
    return f"acd-{digitos(proc)}-{julg_iso.replace('-', '') if julg_iso else 'semdata'}-{cod}"


def slug(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def especie_por_ementa(ementa, classe_sigla):
    cab = (ementa or "").split("\n")[0].upper()[:400]
    if "EMBARGOS DE DECLARA" in cab:
        return "EDcl"
    return classe_sigla or ""


CURADORIA = ["tese", "fundamentacao", "causaPedir", "especificidades", "especificidadesTags", "preliminares",
             "honorarios", "parteNotavel", "papelNotavel", "processosAssociados"]

# cadastro de magistrados: nome oficial, cargo, atuação e as grafias que aparecem em etiquetas e acórdãos
MAGISTRADOS = [
    {"id": "mag-carlos-muta", "nome": "Luis Carlos Hiroki Muta", "cargo": "Desembargador Federal",
     "atuacao": [{"orgao": "TRF3 · Turma Regional de Mato Grosso do Sul", "papel": "relator (gabinete A)"}],
     "aliases": ["CARLOS MUTA", "Carlos Muta", "LUIS CARLOS HIROKI MUTA", "Des. Fed. Carlos Muta"],
     "fonte": "acórdãos do portal do TRF3"},
    {"id": "mag-jean-marcos", "nome": "Jean Marcos", "cargo": "Desembargador Federal",
     "atuacao": [{"orgao": "TRF3 · Turma Regional de Mato Grosso do Sul", "papel": "vogal"}],
     "aliases": ["JEAN MARCOS", "Jean Marcos", "JEAN", "Jean", "Dr. Jean", "DR. JEAN"],
     "fonte": "acórdãos do portal do TRF3 (\"Votaram o Desembargador Federal JEAN MARCOS…\"); etiquetas de impedimento e suspeição"},
    {"id": "mag-ney-gustavo-paes-de-andrade", "nome": "Ney Gustavo Paes de Andrade", "cargo": "Juiz Federal",
     "atuacao": [{"orgao": "TRF3 · Turma Regional de Mato Grosso do Sul", "papel": "Juiz Federal Convocado (vogal)"},
                 {"orgao": "Seção Judiciária de Mato Grosso do Sul", "papel": "1º grau", "varas": []}],
     "aliases": ["NEY DE ANDRADE", "Ney de Andrade", "Ney Gustavo", "NEY", "Ney", "Dr. Ney", "DR. NEY", "Dr. Ney Gustavo"],
     "fonte": "acórdãos do portal do TRF3 (\"Juiz Federal Convocado NEY DE ANDRADE\"); notícia TRF3 440284 (nome completo); "
              "etiquetas de impedimento"},
]


def colegiado_do_texto(texto):
    """Ids dos magistrados que votaram, a partir do 'Votaram …' do acórdão."""
    m = re.search(r"Votaram ([^.]+)\.", texto or "")
    ids = []
    if m:
        for mg in MAGISTRADOS:
            if any(re.search(r"\b" + re.escape(a) + r"\b", m.group(1)) for a in mg["aliases"] if len(a) > 4):
                ids.append(mg["id"])
    return ids


def juizo_do_texto(texto):
    """Juízo de 1º grau mencionado no inteiro teor (vara federal ou comarca, na competência delegada)."""
    t = texto or ""
    m = re.search(r"JU[IÍ]ZO RECORRENTE:\s*([^\n]+)", t)
    if m:
        return m.group(1).strip()
    rel = re.search(r"\bRELAT[ÓO]RIO\b(.+?)\bVOTO\b", t, re.S)
    t = rel.group(1) if rel else ""
    m = re.search(r"(\d+ª\s+Vara\s+(?:Federal|Previdenci[aá]ria|C[ií]vel|Gabinete)[^,.;\n]{0,60}|Vara\s+[ÚU]nica[^,.;\n]{0,60}|"
                  r"Comarca\s+de\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç ]{2,40})", t, re.I)
    return m.group(1).strip() if m else ""
MODELO_VINC = ["formatoModelo", "nomeModelo", "textoModelo", "esqueletoModelo", "paragrafosModelo"]
CATALOGACAO = ["temaId", "temaRotulo", "temaTamanho", "temaRepresentante", "similaridadeTema", "grauIgualdade",
               "modeloTextoId", "modeloTextoTamanho"]


def vazio(v):
    return v in (None, "", [], {})


def main(extras):
    base = ler("data/paradigmas.json")
    P = base["bancos"]["Precedente"]["registros"]
    M = base["bancos"]["Modelo-matriz"]["registros"]
    catalogo = [json.loads(l) for l in (RAIZ / "catalogo-trf3/acordaos.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    agrup = []
    for f in sorted(glob.glob(str(RAIZ / "catalogo-trf3/*/*.json"))):
        for r in json.loads(Path(f).read_text(encoding="utf-8"))["registros"]:
            agrup.append(r)
    colecoes = [RAIZ / p for p in sorted(glob.glob(str(RAIZ / "catalogo-trf3/inteiros-teores-*.json")))] + [Path(e) for e in extras]

    prec = {}          # id → registro
    origem = collections.defaultdict(list)

    def chave(proc, julg_iso, especie):
        return id_precedente(proc, julg_iso, especie)

    def novo(proc):
        return {"id": "", "processo": proc, "especie": "", "classe": "", "classeSigla": "", "pronunciamento": "Voto",
                "orgao": "", "relator": "CARLOS MUTA", "relatorId": "mag-carlos-muta", "dataJulgamento": "", "dataPublicacao": "",
                "assunto": "", "assuntoOrigem": "", "temas": "", "ramoDireito": "",
                "ementaCabecalho": "", "ementa": "", "resultado": "", "sentidoResultado": "",
                "dispositivosCitados": "", "jurisprudenciaCitada": "",
                "primeiroGrau": {"juizo": "", "juiz": "", "magistradoId": ""}, "colegiado": [],
                "curadoria": {"status": "bruto"}, "catalogacao": {}, "inteiroTeor": False,
                "fonte": "", "urlFonte": "", "idAnterior": "", "origens": []}

    def preencher(r, campo, valor):
        if vazio(r.get(campo)) and not vazio(valor):
            r[campo] = valor

    # 1) precedentes do banco atual (prevalecem)
    for p in P:
        j = iso(p.get("sessao"))
        esp = p.get("especie", "")
        corr, leg_val = [], {}
        if p.get("ementaIntegral") and especie_por_ementa(p["ementaIntegral"], esp) == "EDcl" and esp != "EDcl":
            corr.append(f"espécie corrigida de {esp} para EDcl: a ementa é de embargos de declaração")
            leg_val["especie"] = esp
            esp = "EDcl"
        i = chave(p["processo"], j, esp)
        if i in prec:
            raise SystemExit(f"id repetido no banco: {i}")
        r = novo(p["processo"])
        r.update({"id": i, "idAnterior": p["id"], "especie": esp, "classe": p.get("classe", ""),
                  "classeSigla": p.get("classeSigla", ""), "pronunciamento": p.get("pronunciamento", ""),
                  "orgao": p.get("orgaoJulgador", ""), "dataJulgamento": j, "dataPublicacao": iso(p.get("data")),
                  "assunto": p.get("assunto", ""), "assuntoOrigem": p.get("assuntoOrigem", ""), "temas": p.get("temas", ""),
                  "ramoDireito": p.get("ramoDireito", ""), "ementaCabecalho": p.get("ementaCabecalho", ""),
                  "ementa": p.get("ementaIntegral", ""), "resultado": p.get("resultado", ""),
                  "dispositivosCitados": p.get("dispositivosCitados", ""), "jurisprudenciaCitada": p.get("jurisprudenciaCitada", ""),
                  "fonte": p.get("fonte", ""), "urlFonte": p.get("urlFonte", "")})
        cur = {k: p.get(k, "") for k in CURADORIA}
        r["primeiroGrau"]["juizo"] = p.get("primeiroGrau", "")
        cur["status"] = p.get("statusCuradoria") or "curado"
        r["curadoria"] = cur
        mv = {k: p[k] for k in MODELO_VINC if not vazio(p.get(k))}
        if mv:
            r["modeloVinculado"] = mv
        # guarda o desenho exato do registro antigo para a compatibilidade (campos presentes, inclusive vazios)
        r["_legado"] = {"campos": list(p.keys()), "sessao": p.get("sessao", ""), "data": p.get("data", ""), "valores": leg_val}
        if corr:
            r["correcoes"] = corr
        prec[i] = r
        origem[i].append("data/paradigmas.json")

    # 2) agrupamento automático do catálogo (traz temas e campos de catalogação)
    for t in agrup:
        j = iso(t.get("sessao"))
        i = chave(t["processo"], j, t.get("especie", ""))
        r = prec.get(i)
        if r is None:
            r = novo(t["processo"])
            r.update({"id": i, "idAnterior": t["id"], "especie": t.get("especie", ""), "classe": t.get("classe", ""),
                      "classeSigla": t.get("classeSigla", ""), "pronunciamento": t.get("pronunciamento", "Voto"),
                      "dataJulgamento": j, "dataPublicacao": iso(t.get("data")), "assunto": t.get("assunto", ""),
                      "assuntoOrigem": t.get("assuntoOrigem", ""), "temas": t.get("temas", ""), "fonte": t.get("fonte", "")})
            r["curadoria"] = {**{k: t.get(k, "") for k in CURADORIA}, "status": t.get("statusCuradoria") or "bruto"}
            prec[i] = r
        for a, b in [("orgao", "orgaoJulgador"), ("ramoDireito", "ramoDireito"), ("ementaCabecalho", "ementaCabecalho"),
                     ("ementa", "ementaIntegral"), ("resultado", "resultado"), ("dispositivosCitados", "dispositivosCitados"),
                     ("jurisprudenciaCitada", "jurisprudenciaCitada"), ("urlFonte", "urlFonte")]:
            preencher(r, a, t.get(b))
        preencher(r, "sentidoResultado", t.get("sentidoResultado"))
        r["catalogacao"].update({k: t[k] for k in CATALOGACAO if not vazio(t.get(k))})
        origem[i].append("catalogo-trf3 (agrupamento)")

    # 3) acórdãos colhidos no portal
    for c in catalogo:
        j = iso(c.get("julg"))
        sigla = (c.get("classe") or "").split(" - ")[0]
        i = chave(c["processo"], j, especie_por_ementa(c.get("ementa"), sigla))
        r = prec.get(i)
        if r is None:
            r = novo(c["processo"])
            r.update({"id": i, "especie": especie_por_ementa(c.get("ementa"), sigla), "classeSigla": sigla,
                      "dataJulgamento": j})
            prec[i] = r
        ce = c.get("ementa") or ""
        if (r.get("_legado") and r["especie"] == "EDcl" and ce and r["ementa"] and r["ementa"] != ce
                and especie_por_ementa(r["ementa"], "x") != "EDcl" and especie_por_ementa(ce, "x") == "EDcl"):
            r["_legado"]["valores"].update({"ementaIntegral": r["ementa"], "ementaCabecalho": r["ementaCabecalho"]})
            r.setdefault("correcoes", []).append("ementa substituída pela do portal: o banco trazia a ementa da apelação "
                                                 "neste registro de embargos de declaração")
            r["ementa"], r["ementaCabecalho"] = ce, ce.split("\n")[0]
        preencher(r, "classe", (c.get("classe") or "").split(" - ", 1)[-1].title() if c.get("classe") else "")
        preencher(r, "classeSigla", sigla)
        preencher(r, "orgao", c.get("orgao"))
        preencher(r, "dataPublicacao", iso(c.get("pub")))
        preencher(r, "ementa", c.get("ementa"))
        preencher(r, "ementaCabecalho", (c.get("ementa") or "").split("\n")[0])
        preencher(r, "assunto", c.get("assunto") if c.get("assunto") != (c.get("ementa") or "").split("\n")[0] else "")
        preencher(r, "temas", c.get("temas"))
        preencher(r, "dispositivosCitados", c.get("dispositivos"))
        preencher(r, "jurisprudenciaCitada", c.get("jurisprudencia"))
        if vazio(r["curadoria"].get("especificidades")) and c.get("especificidades"):
            r["curadoria"]["especificidades"] = c["especificidades"]
        r["catalogacao"]["nCatalogo"] = int(c.get("n") or 0)
        preencher(r, "fonte", "Pesquisa de Jurisprudência TRF3 — catálogo de acórdãos do relator")
        origem[i].append("catalogo-trf3/acordaos.jsonl")

    # 4) coleções de inteiros teores
    textos = {}
    temas_analise = collections.defaultdict(lambda: collections.Counter())
    for arq in colecoes:
        col = json.loads(Path(arq).read_text(encoding="utf-8"))
        rotulo = col.get("titulo", Path(arq).stem)
        for a in col["acordaos"]:
            j = iso(a.get("julgamento"))
            texto = a["inteiroTeor"].strip()
            m = re.search(r"\n\s*EMENTA\s*\n(.+?)\n\s*ACÓRDÃO", texto, re.S)
            ementa = m.group(1).strip() if m else ""
            sigla = (a.get("classe") or "").split(" - ")[0]
            i = chave(a["processo"], j, especie_por_ementa(ementa or a.get("ementaCabecalho", ""), sigla))
            r = prec.get(i)
            if r is None:
                r = novo(a["processo"])
                r.update({"id": i, "especie": especie_por_ementa(ementa, sigla), "classeSigla": sigla, "dataJulgamento": j,
                          "fonte": "Pesquisa de Jurisprudência TRF3 — inteiro teor"})
                prec[i] = r
            preencher(r, "classe", (a.get("classe") or "").split(" - ", 1)[-1].title())
            preencher(r, "orgao", a.get("orgao"))
            preencher(r, "dataPublicacao", iso(a.get("publicacao")))
            preencher(r, "ementa", ementa)
            preencher(r, "ementaCabecalho", a.get("ementaCabecalho") or (ementa.split("\n")[0] if ementa else ""))
            preencher(r, "resultado", a.get("resultado"))
            if a.get("subtipo"):
                r["catalogacao"]["temaSugerido"] = a["subtipo"]
                r["catalogacao"]["assuntoSugerido"] = a.get("tema", "")
                temas_analise[(a.get("tema", ""), a["subtipo"])][i] += 1
            if a.get("proporcaoTextoReplicado") is not None:
                r["catalogacao"]["proporcaoTextoReplicado"] = a["proporcaoTextoReplicado"]
            r["inteiroTeor"] = True
            if not r["primeiroGrau"]["juizo"]:
                r["primeiroGrau"]["juizo"] = juizo_do_texto(texto)
            r["colegiado"] = sorted(set(r["colegiado"]) | set(colegiado_do_texto(texto)))
            textos[i] = texto
            origem[i].append(str(Path(arq).relative_to(RAIZ)) if str(arq).startswith(str(RAIZ)) else Path(arq).name)

    for i, r in prec.items():
        r["origens"] = sorted(set(origem[i]))
        if not r["ementaCabecalho"] and r["ementa"]:
            r["ementaCabecalho"] = r["ementa"].split("\n")[0]

    lista = sorted(prec.values(), key=lambda r: (r["dataJulgamento"] or "0000", r["processo"]), reverse=True)

    (RAIZ / "paradigmas/inteiros-teores").mkdir(parents=True, exist_ok=True)
    with open(RAIZ / "paradigmas/precedentes.jsonl", "w", encoding="utf-8") as f:
        for r in lista:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    por_ano = collections.defaultdict(list)
    for i, t in textos.items():
        por_ano[prec[i]["dataJulgamento"][:4] or "semdata"].append({"id": i, "processo": prec[i]["processo"], "inteiroTeor": t})
    for ano, regs in por_ano.items():
        with open(RAIZ / f"paradigmas/inteiros-teores/{ano}.jsonl", "w", encoding="utf-8") as f:
            for x in sorted(regs, key=lambda x: x["id"]):
                f.write(json.dumps(x, ensure_ascii=False) + "\n")

    # 5) modelos
    def especie_modelo(m):
        p = (m.get("pronunciamento") or "").lower()
        if p.startswith("voto"):
            return "voto-matriz" if (m.get("formatoModelo") or "").lower() == "modelo-matriz" else "voto-padrao"
        if "despacho" in p:
            return "despacho"
        return "decisao"
    modelos = []
    for m in M:
        x = dict(m)
        x["idAnterior"] = m["id"]
        x["id"] = "mod-" + re.sub(r"^par-(matriz-)?", "", m["id"])
        x["especieModelo"] = especie_modelo(m)
        x["dataReferencia"] = m.get("data", "")
        x["atualizadoEm"] = m.get("atualizadoEm", "")
        x["historico"] = m.get("historico", [])
        modelos.append(x)
    escrever("paradigmas/modelos.json", "gabcmt.paradigmas.modelos", modelos)

    # 6) referências
    cat = base["catalogos"]
    escrever("referencias/diretrizes.json", "gabcmt.referencias.diretrizes", cat["redacao"]["registros"])
    escrever("referencias/paragrafos.json", "gabcmt.referencias.paragrafos", cat["paragrafos"]["registros"])
    superiores = {"STF", "STJ", "TST", "TSE", "STM", "TNU"}
    cit = []
    for j in cat["jurisprudencia"]["registros"]:
        trib = (j.get("tribunal") or "").upper()
        origem_c = "superiores" if trib in superiores else ("trf3" if trib == "TRF3" else "outros-tribunais")
        cit.append({"categoria": "jurisprudencia", "origem": origem_c, **j})
    for n in cat["normas"]["registros"]:
        cit.append({"categoria": "norma", "origem": "legislacao", **n})
    escrever("referencias/citacoes.json", "gabcmt.referencias.citacoes", cit)

    temas = {}
    for t in agrup:
        tid = t.get("temaId")
        if not tid:
            continue
        x = temas.setdefault(tid, {"id": f"tema-{tid}", "assunto": t.get("assunto", ""), "rotulo": t.get("temaRotulo", ""),
                                   "representante": t.get("temaRepresentante", ""), "quantidade": 0,
                                   "status": "a revisar", "origem": "agrupamento automático do catálogo"})
        x["quantidade"] += 1
    for (assunto, sub), ids in temas_analise.items():
        tid = "tema-" + slug(assunto)[:30] + "-" + slug(sub)[:50]
        temas[tid] = {"id": tid, "assunto": assunto, "rotulo": sub, "representante": "", "quantidade": sum(ids.values()),
                      "status": "a revisar", "origem": "análise de 23/10/2026 (veículos, saúde e concursos)"}
    # aprovados: os temas da análise de 23/10/2026; os demais seguem a ordem de revisão (assuntos com mais
    # precedentes primeiro e, dentro do assunto, os temas maiores)
    por_assunto = collections.Counter(r["assunto"] for r in lista)
    ordem = sorted((t for t in temas.values() if not t["origem"].startswith("análise")),
                   key=lambda t: (-por_assunto.get(t["assunto"], 0), -t["quantidade"]))
    for k, t in enumerate(ordem, 1):
        t["prioridadeRevisao"] = k
    for t in temas.values():
        if t["origem"].startswith("análise"):
            t["status"] = "aprovado"
    escrever("referencias/magistrados.json", "gabcmt.referencias.magistrados", MAGISTRADOS)
    escrever("referencias/assuntos.json", "gabcmt.referencias.assuntos", cat["assuntos"]["registros"],
             extra={"temas": sorted(temas.values(), key=lambda t: (t["assunto"], -t["quantidade"]))})

    print(f"precedentes: {len(lista)} | com inteiro teor: {len(textos)} | modelos: {len(modelos)} | "
          f"citações: {len(cit)} | temas: {len(temas)}")


def escrever(rel, schema, registros, extra=None):
    p = RAIZ / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    doc = {"schema": schema, "versao": "1.0.0", "atualizadoEm": AGORA, "registros": registros}
    if extra:
        doc.update(extra)
    p.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    args = sys.argv[1:]
    extras = [args[i + 1] for i, a in enumerate(args) if a == "--extra"]
    main(extras)
