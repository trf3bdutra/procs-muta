#!/usr/bin/env python3
"""Porta única da base gabcmt (padrão 1.0).

  python3 gerar.py                 valida tudo, atualiza padrao/manifesto.json e confere a compatibilidade
  python3 gerar.py --compat        além disso, regrava data/paradigmas.json e banco/*.json a partir da base nova
  python3 gerar.py --importar A.json [B.json …]
                                   acrescenta/atualiza registros vindos dos apps (exportações gabA.* ou gabcmt.*),
                                   mesclando por id, e depois valida

Regras: nada é apagado; o que vem de fora entra só se passar no esquema; o manifesto registra
contagens e hash de cada arquivo, e é por ele que os apps conferem a versão do padrão.
"""
import json, re, sys, hashlib, glob, datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
VERSAO_PADRAO = "1.0.0"
ESQ = json.loads((RAIZ / "padrao/esquema.json").read_text(encoding="utf-8"))


# ---------- leitura e escrita ----------
def ler_json(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def ler_jsonl(p):
    return [json.loads(l) for l in Path(p).read_text(encoding="utf-8").splitlines() if l.strip()]


def gravar_jsonl(p, regs):
    Path(p).write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in regs), encoding="utf-8")


def gravar_json(p, doc):
    Path(p).write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def arquivos():
    """(caminho relativo, formato, nome do registro, extra) de cada arquivo previsto no esquema."""
    out = []
    for padrao, info in ESQ["arquivos"].items():
        for p in sorted(glob.glob(str(RAIZ / padrao))):
            out.append((str(Path(p).relative_to(RAIZ)), info["formato"], info["registro"], info.get("extra", {})))
    return out


def registros(rel, formato):
    return ler_jsonl(RAIZ / rel) if formato == "jsonl" else ler_json(RAIZ / rel)["registros"]


# ---------- validação (subconjunto do JSON Schema: type, required, enum, pattern, $ref) ----------
TIPOS = {"string": str, "boolean": bool, "integer": int, "object": dict, "array": list}


def validar(valor, regra, caminho, erros):
    if "$ref" in regra:
        regra = ESQ["$defs"][regra["$ref"].split("/")[-1]]
    t = regra.get("type")
    if t and not isinstance(valor, TIPOS[t]) or (t == "integer" and isinstance(valor, bool)):
        erros.append(f"{caminho}: esperado {t}, veio {type(valor).__name__}")
        return
    if "enum" in regra and valor not in regra["enum"]:
        erros.append(f"{caminho}: valor '{valor}' fora de {regra['enum']}")
    if "pattern" in regra and isinstance(valor, str) and not re.search(regra["pattern"], valor):
        erros.append(f"{caminho}: '{valor[:60]}' não segue o padrão {regra['pattern']}")
    if isinstance(valor, dict):
        for c in regra.get("required", []):
            if c not in valor:
                erros.append(f"{caminho}: falta o campo obrigatório '{c}'")
        for c, sub in regra.get("properties", {}).items():
            if c in valor:
                validar(valor[c], sub, f"{caminho}.{c}", erros)


def validar_tudo():
    erros, contagem = [], {}
    for rel, formato, nome, extra in arquivos():
        regs = registros(rel, formato)
        ids = set()
        for k, r in enumerate(regs):
            validar(r, ESQ["$defs"][nome], f"{rel}[{k}:{r.get('id', '?')}]", erros)
            if r.get("id") in ids:
                erros.append(f"{rel}: id repetido {r.get('id')}")
            ids.add(r.get("id"))
        if formato == "json":
            doc = ler_json(RAIZ / rel)
            for campo, nome_x in extra.items():
                for k, r in enumerate(doc.get(campo, [])):
                    validar(r, ESQ["$defs"][nome_x], f"{rel}.{campo}[{k}]", erros)
        contagem[rel] = len(regs)
    # integridade cruzada: todo precedente com inteiroTeor=true tem texto, e todo texto tem precedente
    prec = {r["id"]: r for r in ler_jsonl(RAIZ / "paradigmas/precedentes.jsonl")}
    textos = {t["id"] for p in glob.glob(str(RAIZ / "paradigmas/inteiros-teores/*.jsonl")) for t in ler_jsonl(p)}
    for i in textos - set(prec):
        erros.append(f"inteiro teor sem precedente: {i}")
    for i, r in prec.items():
        if r.get("inteiroTeor") and i not in textos:
            erros.append(f"precedente marcado com inteiro teor, mas sem texto: {i}")
    return erros, contagem


# ---------- manifesto ----------
def atualizar_manifesto(contagem):
    man = {"padrao": "gabcmt", "versao": VERSAO_PADRAO,
           "compatibilidade": "apps declaram a versão maior que leem (1); versão menor nova só acrescenta campos",
           "atualizadoEm": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
           "areas": {"paradigmas": "processos já julgados pelo relator (precedentes, inteiros teores, modelos)",
                     "referencias": "diretrizes, parágrafos-padrão, citações (jurisprudência e normas), assuntos e temas",
                     "acervo": "repositório privado brndutra/gabcmt-dados"},
           "arquivos": {}}
    for rel, n in sorted(contagem.items()):
        dados = (RAIZ / rel).read_bytes()
        man["arquivos"][rel] = {"registros": n, "bytes": len(dados), "sha256": hashlib.sha256(dados).hexdigest()}
    antigo = RAIZ / "padrao/manifesto.json"
    if antigo.exists():
        velho = ler_json(antigo)
        if velho.get("arquivos") == man["arquivos"]:
            man["atualizadoEm"] = velho.get("atualizadoEm", man["atualizadoEm"])
    gravar_json(antigo, man)
    return man


# ---------- compatibilidade com os apps atuais (data/paradigmas.json e banco/*.json) ----------
def dmy(iso):
    return f"{iso[8:10]}/{iso[5:7]}/{iso[0:4]}" if iso else ""


def precedente_antigo(r):
    leg = r.get("_legado")
    cur = r.get("curadoria", {})
    mv = r.get("modeloVinculado", {})
    v = {"id": r.get("idAnterior") or r["id"], "processo": r["processo"], "tipo": "Precedente",
         "pronunciamento": r.get("pronunciamento", ""), "especie": r.get("especie", ""),
         "assunto": r.get("assunto", ""), "temas": r.get("temas", ""), "resultado": r.get("resultado", ""),
         "sessao": leg["sessao"] if leg else dmy(r.get("dataJulgamento")), "fonte": r.get("fonte", ""),
         "data": leg["data"] if leg else r.get("dataPublicacao", ""), "classe": r.get("classe", ""), "classeSigla": r.get("classeSigla", ""),
         "ementaIntegral": r.get("ementa", ""), "ementaCabecalho": r.get("ementaCabecalho", ""), "ramoDireito": r.get("ramoDireito", ""),
         "dispositivosCitados": r.get("dispositivosCitados", ""), "jurisprudenciaCitada": r.get("jurisprudenciaCitada", ""),
         "orgaoJulgador": r.get("orgao", ""), "assuntoOrigem": r.get("assuntoOrigem", ""),
         "statusCuradoria": cur.get("status", "bruto"), "urlFonte": r.get("urlFonte", "")}
    for c in ["tese", "fundamentacao", "causaPedir", "especificidades", "especificidadesTags", "preliminares", "honorarios",
              "parteNotavel", "papelNotavel", "processosAssociados"]:
        v[c] = cur.get(c, "")
    v["primeiroGrau"] = (r.get("primeiroGrau") or {}).get("juizo", "") if leg else ""
    for c in ["formatoModelo", "nomeModelo", "textoModelo", "esqueletoModelo", "paragrafosModelo"]:
        v[c] = mv.get(c, "")
    if leg:
        v.update(leg.get("valores", {}))
        v = {c: v.get(c, "") for c in leg["campos"]}
    return v


def modelo_antigo(m):
    v = {k: x for k, x in m.items() if k not in ("idAnterior", "especieModelo", "dataReferencia")}
    v["id"] = m.get("idAnterior") or m["id"]
    for c in ("atualizadoEm", "historico"):
        if v.get(c) in ("", [], None):
            v.pop(c, None)
    return v


def compat_docs():
    # todos os precedentes da base (os que vieram do banco antigo mantêm o desenho exato; os novos entram no fim):
    # o servidor no Replit lê data/paradigmas.json e assim enxerga a base inteira
    prec = [precedente_antigo(r) for r in ler_jsonl(RAIZ / "paradigmas/precedentes.jsonl")]
    prec.sort(key=lambda x: x["id"])
    mods = [modelo_antigo(m) for m in ler_json(RAIZ / "paradigmas/modelos.json")["registros"]]
    cit = ler_json(RAIZ / "referencias/citacoes.json")["registros"]
    tira = lambda x: {k: v for k, v in x.items() if k not in ("categoria", "origem")}
    cat = {"assuntos": ler_json(RAIZ / "referencias/assuntos.json")["registros"],
           "jurisprudencia": [tira(x) for x in cit if x["categoria"] == "jurisprudencia"],
           "paragrafos": ler_json(RAIZ / "referencias/paragrafos.json")["registros"],
           "normas": [tira(x) for x in cit if x["categoria"] == "norma"],
           "redacao": ler_json(RAIZ / "referencias/diretrizes.json")["registros"]}
    return prec, mods, cat


def conferir_compat():
    """Compara, registro a registro, o que a base nova gera com os arquivos que os apps leem hoje."""
    prec, mods, cat = compat_docs()
    rel = []
    atual = ler_json(RAIZ / "data/paradigmas.json")
    ap = {x["id"]: x for x in atual["bancos"]["Precedente"]["registros"]}
    np_ = {x["id"]: x for x in prec}
    faltam = set(ap) - set(np_)
    alterados, enriquecidos = [], 0
    for i, x in ap.items():
        y = np_.get(i)
        if not y:
            continue
        for c, v in x.items():
            if y.get(c) != v:
                if v in ("", None):
                    enriquecidos += 1
                else:
                    alterados.append((i, c))
    rel.append(f"precedentes: {len(ap)} no banco atual, {len(np_)} gerados ({len(set(np_) - set(ap))} novos); faltando {len(faltam)}; "
               f"campos alterados {len(alterados)}; campos vazios agora preenchidos {enriquecidos}")
    am = {x["id"]: x for x in atual["bancos"]["Modelo-matriz"]["registros"]}
    nm = {x["id"]: x for x in mods}
    dif_m = [i for i in am if nm.get(i) != am[i]]
    rel.append(f"modelos-matriz: {len(am)} atuais, {len(nm)} gerados, diferentes {len(dif_m)}")
    for k, regs in cat.items():
        b = ler_json(RAIZ / f"banco/{k}.json")["registros"]
        rel.append(f"{k}: {'idêntico' if b == regs else 'DIFERENTE'} ({len(regs)})")
    ok = not faltam and not alterados and not dif_m and all("DIFERENTE" not in l for l in rel)
    return ok, rel, (prec, mods, cat), alterados[:10]


def gravar_json2(p, doc):
    """arquivos de compatibilidade: mesmo recuo (2) dos originais, para o diff mostrar só o que mudou"""
    Path(p).write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def gravar_compat(prec, mods, cat):
    atual = ler_json(RAIZ / "data/paradigmas.json")
    def na_ordem(antigos, novos):   # mantém a ordem do arquivo atual; os novos vão para o fim
        pos = {x["id"]: i for i, x in enumerate(antigos)}
        return sorted(novos, key=lambda x: pos.get(x["id"], len(pos)))
    atual["bancos"]["Precedente"]["registros"] = na_ordem(atual["bancos"]["Precedente"]["registros"], prec)
    atual["bancos"]["Modelo-matriz"]["registros"] = na_ordem(atual["bancos"]["Modelo-matriz"]["registros"], mods)
    for k, regs in cat.items():
        atual["catalogos"][k]["registros"] = regs
        b = ler_json(RAIZ / f"banco/{k}.json")
        b["registros"] = regs
        gravar_json2(RAIZ / f"banco/{k}.json", b)
    gravar_json2(RAIZ / "data/paradigmas.json", atual)


# ---------- formato antigo → padrão (espelha padrao/paradigmas.js · legado) ----------
MAPA = [("processo", "processo"), ("especie", "especie"), ("classe", "classe"), ("classeSigla", "classeSigla"),
        ("pronunciamento", "pronunciamento"), ("orgao", "orgaoJulgador"), ("assunto", "assunto"), ("assuntoOrigem", "assuntoOrigem"),
        ("temas", "temas"), ("ramoDireito", "ramoDireito"), ("ementaCabecalho", "ementaCabecalho"), ("ementa", "ementaIntegral"),
        ("resultado", "resultado"), ("dispositivosCitados", "dispositivosCitados"), ("jurisprudenciaCitada", "jurisprudenciaCitada"),
        ("fonte", "fonte"), ("urlFonte", "urlFonte")]
CUR = ["tese", "fundamentacao", "causaPedir", "especificidades", "especificidadesTags", "preliminares", "honorarios",
       "parteNotavel", "papelNotavel", "processosAssociados"]
MV = ["formatoModelo", "nomeModelo", "textoModelo", "esqueletoModelo", "paragrafosModelo"]
ESP = {"ApCiv": "ap", "ApelRemNec": "aprn", "RemNecCiv": "rn", "AI": "ai", "EDcl": "ed", "AgInt": "agint", "CCCiv": "cc",
       "AR": "ar", "MSCol": "ms", "SuspApel": "susp"}
SUPERIORES = {"STF", "STJ", "TST", "TSE", "STM", "TNU"}


def iso_de(d):
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", d or "")
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else (d if re.fullmatch(r"\d{4}-\d{2}-\d{2}", d or "") else "")


def id_precedente(proc, julg, esp):
    cod = ESP.get(esp) or re.sub(r"[^a-z0-9]", "", (esp or "").lower()) or "x"
    return f"acd-{re.sub(r'\D', '', proc)}-{julg.replace('-', '') if julg else 'semdata'}-{cod}"


def precedente_de_antigo(old, ex=None):
    import copy
    r = copy.deepcopy(ex) if ex else {
        "id": "", "processo": old.get("processo", ""), "especie": "", "classe": "", "classeSigla": "", "pronunciamento": "Voto",
        "orgao": "", "relator": "CARLOS MUTA", "relatorId": "mag-carlos-muta", "dataJulgamento": "", "dataPublicacao": "",
        "assunto": "", "assuntoOrigem": "", "temas": "", "ramoDireito": "", "ementaCabecalho": "", "ementa": "", "resultado": "",
        "sentidoResultado": "", "dispositivosCitados": "", "jurisprudenciaCitada": "",
        "primeiroGrau": {"juizo": "", "juiz": "", "magistradoId": ""}, "colegiado": [], "curadoria": {"status": "curado"},
        "catalogacao": {}, "inteiroTeor": False, "fonte": "", "urlFonte": "", "idAnterior": "", "origens": ["app"]}
    leg = (ex or {}).get("_legado") or {"campos": [], "sessao": "", "data": "", "valores": {}}
    valores = dict(leg.get("valores") or {})

    def mudou(c, novo):
        if c in valores:
            if valores[c] == novo:
                return False
            del valores[c]
        return True
    for n, a in MAPA:
        if a in old and mudou(a, old[a]):
            r[n] = "" if old[a] is None else old[a]
    if "sessao" in old:
        r["dataJulgamento"] = iso_de(old["sessao"])
    if "data" in old:
        r["dataPublicacao"] = iso_de(old["data"])
    r.setdefault("curadoria", {"status": "curado"})
    for c in CUR:
        if c in old:
            r["curadoria"][c] = "" if old[c] is None else old[c]
    if old.get("statusCuradoria"):
        r["curadoria"]["status"] = old["statusCuradoria"]
    if "primeiroGrau" in old:
        r["primeiroGrau"] = {**(r.get("primeiroGrau") or {}), "juizo": old["primeiroGrau"] or ""}
    mv = {c: old[c] for c in MV if old.get(c) not in (None, "")}
    if mv:
        r["modeloVinculado"] = mv
    else:
        r.pop("modeloVinculado", None)
    if not r["id"]:
        r["id"] = id_precedente(r["processo"], r["dataJulgamento"], r["especie"])
    r["idAnterior"] = old["id"] if old.get("id") and not str(old["id"]).startswith("acd-") else r.get("idAnterior", "")
    r["_legado"] = {"campos": list(old.keys()), "sessao": old.get("sessao", ""), "data": old.get("data", ""), "valores": valores}
    return r


def modelo_de_antigo(old, ex=None, quando=None):
    quando = quando or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if ex and modelo_antigo(ex) == old:
        return ex
    p = (old.get("pronunciamento") or "").lower()
    esp = ("voto-matriz" if (old.get("formatoModelo") or "").lower() == "modelo-matriz" else "voto-padrao") if p.startswith("voto") \
        else "despacho" if "despacho" in p else "decisao"
    hist = list((ex or {}).get("historico") or []) + ([{"em": quando, "alteracao": "editado num app (formato antigo)"}] if ex else [])
    return {**old, "idAnterior": old["id"], "id": ex["id"] if ex else "mod-" + re.sub(r"^par-(matriz-)?", "", old["id"]),
            "especieModelo": ex["especieModelo"] if ex else esp, "dataReferencia": old.get("data", ""), "atualizadoEm": quando,
            "historico": hist}


def citacao_de_antiga(j, categoria):
    trib = (j.get("tribunal") or "").upper()
    origem = "legislacao" if categoria == "norma" else "superiores" if trib in SUPERIORES else "trf3" if trib == "TRF3" else "outros-tribunais"
    return {"categoria": categoria, "origem": origem, **j}


def importar_precedentes(regs):
    arq = RAIZ / "paradigmas/precedentes.jsonl"
    atuais = ler_jsonl(arq)
    por_ant = {r.get("idAnterior"): r for r in atuais if r.get("idAnterior")}
    por_id = {r["id"]: r for r in atuais}
    n = 0
    for old in regs:
        ex = por_ant.get(old.get("id")) or por_id.get(old.get("id"))
        novo = precedente_de_antigo(old, ex)
        if ex and json.dumps(novo, sort_keys=True) == json.dumps(ex, sort_keys=True):
            continue
        por_id.pop(ex["id"], None) if ex else None
        por_id[novo["id"]] = novo
        n += 1
    lista = sorted(por_id.values(), key=lambda r: (r.get("dataJulgamento") or "0000", r["processo"]), reverse=True)
    gravar_jsonl(arq, lista)
    return n


def importar_modelos(regs):
    arq = RAIZ / "paradigmas/modelos.json"
    doc = ler_json(arq)
    por_ant = {m.get("idAnterior"): m for m in doc["registros"]}
    por_id = {m["id"]: m for m in doc["registros"]}
    n = 0
    for old in regs:
        ex = por_ant.get(old.get("id"))
        novo = modelo_de_antigo(old, ex)
        if novo is ex:
            continue
        por_id[novo["id"]] = novo
        n += 1
    doc["registros"] = list(por_id.values())
    gravar_json(arq, doc)
    return n


# ---------- importação vinda dos apps ----------
def importar(caminhos):
    """Mescla exportações dos apps por id. Aceita gabcmt.* (formato novo) ou gabA.paradigmas/gabA.<catálogo> (antigo)."""
    destino = {"gabA.redacao": "referencias/diretrizes.json", "gabA.paragrafos": "referencias/paragrafos.json",
               "gabA.assuntos": "referencias/assuntos.json"}
    for c in caminhos:
        doc = ler_json(c)
        sch = doc.get("schema", "")
        regs = doc.get("registros", [])
        if sch.startswith("gabcmt.") and sch.count(".") == 2:
            area, cat = sch.split(".")[1:]
            alvo = RAIZ / f"{area}/{cat}.json"
            if not alvo.exists():
                raise SystemExit(f"{c}: categoria desconhecida {sch}")
            mesclar_json(alvo, regs)
        elif sch in destino:
            mesclar_json(RAIZ / destino[sch], regs)
        elif sch in ("gabA.jurisprudencia", "gabA.normas"):
            cat = "jurisprudencia" if sch.endswith("jurisprudencia") else "norma"
            mesclar_json(RAIZ / "referencias/citacoes.json", [citacao_de_antiga(j, cat) for j in regs])
        elif sch == "gabA.precedentes" or (sch == "gabA.paradigmas" and doc.get("banco_tipo") == "Precedente"):
            print(f"  precedentes alterados: {importar_precedentes(regs)}")
        elif sch == "gabA.modelos" or (sch == "gabA.paradigmas" and doc.get("banco_tipo") in ("Modelo", "Modelo-matriz")):
            print(f"  modelos alterados: {importar_modelos(regs)}")
        elif sch == "gabcmt.catalogos" or (sch == "gabA.paradigmas" and "bancos" in doc):
            for b in ("Precedente", "Modelo-matriz", "Modelo"):
                regs_b = (doc.get("bancos", {}).get(b) or {}).get("registros") or []
                if regs_b:
                    print(f"  {b}: {importar_precedentes(regs_b) if b == 'Precedente' else importar_modelos(regs_b)} alterado(s)")
        else:
            raise SystemExit(f"{c}: schema não reconhecido ({sch})")
        print(f"importado: {c} ({len(regs)} registros, {sch})")


def mesclar_json(alvo, novos):
    doc = ler_json(alvo)
    por_id = {r["id"]: r for r in doc["registros"]}
    for r in novos:
        por_id[r["id"]] = {**por_id.get(r["id"], {}), **r}
    doc["registros"] = list(por_id.values())
    doc["atualizadoEm"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    gravar_json(alvo, doc)


def main(args):
    if "--importar" in args:
        importar(args[args.index("--importar") + 1:])
    erros, contagem = validar_tudo()
    if erros:
        print(f"{len(erros)} erro(s) de validação:")
        for e in erros[:40]:
            print("  -", e)
        raise SystemExit(1)
    man = atualizar_manifesto(contagem)
    print(f"base válida — padrão {man['versao']}")
    for rel, info in man["arquivos"].items():
        print(f"  {rel}: {info['registros']} registros")
    ok, rel, docs, exemplos = conferir_compat()
    print("compatibilidade com data/paradigmas.json e banco/:")
    for l in rel:
        print("  -", l)
    if exemplos:
        print("  exemplos de campos alterados:", exemplos)
    if "--compat" in args:
        gravar_compat(*docs)
        print("arquivos de compatibilidade regravados")
    elif not ok:
        print("atenção: a base nova não reproduz exatamente os arquivos atuais (veja acima)")


if __name__ == "__main__":
    main(sys.argv[1:])
