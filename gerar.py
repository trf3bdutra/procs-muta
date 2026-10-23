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
    v = {"id": r.get("idAnterior") or "par-" + r["processo"].replace(".", "-"), "processo": r["processo"], "tipo": "Precedente",
         "pronunciamento": r.get("pronunciamento", ""), "especie": r.get("especie", ""),
         "assunto": r.get("assunto", ""), "temas": r.get("temas", ""), "resultado": r.get("resultado", ""),
         "sessao": leg["sessao"] if leg else dmy(r.get("dataJulgamento")), "fonte": r.get("fonte", ""),
         "data": leg["data"] if leg else r.get("dataPublicacao", ""), "classe": r.get("classe", ""), "classeSigla": r.get("classeSigla", ""),
         "ementaIntegral": r.get("ementa", ""), "ementaCabecalho": r.get("ementaCabecalho", ""), "ramoDireito": r.get("ramoDireito", ""),
         "dispositivosCitados": r.get("dispositivosCitados", ""), "jurisprudenciaCitada": r.get("jurisprudenciaCitada", ""),
         "orgaoJulgador": r.get("orgao", ""), "assuntoOrigem": r.get("assuntoOrigem", ""),
         "statusCuradoria": cur.get("status", "bruto"), "urlFonte": r.get("urlFonte", "")}
    for c in ["tese", "fundamentacao", "causaPedir", "especificidades", "especificidadesTags", "preliminares", "honorarios",
              "primeiroGrau", "parteNotavel", "papelNotavel", "processosAssociados"]:
        v[c] = cur.get(c, "")
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
    prec = [precedente_antigo(r) for r in ler_jsonl(RAIZ / "paradigmas/precedentes.jsonl") if r.get("_legado")]
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
    rel.append(f"precedentes: {len(ap)} no banco atual, {len(np_)} gerados; faltando {len(faltam)}; "
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


def gravar_compat(prec, mods, cat):
    atual = ler_json(RAIZ / "data/paradigmas.json")
    atual["bancos"]["Precedente"]["registros"] = prec
    atual["bancos"]["Modelo-matriz"]["registros"] = mods
    for k, regs in cat.items():
        atual["catalogos"][k]["registros"] = regs
        b = ler_json(RAIZ / f"banco/{k}.json")
        b["registros"] = regs
        gravar_json(RAIZ / f"banco/{k}.json", b)
    gravar_json(RAIZ / "data/paradigmas.json", atual)


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
            orig = (lambda j: "superiores" if (j.get("tribunal") or "").upper() in {"STF", "STJ", "TST", "TSE", "STM", "TNU"}
                    else "trf3" if (j.get("tribunal") or "").upper() == "TRF3" else "outros-tribunais") if cat == "jurisprudencia" else (lambda j: "legislacao")
            mesclar_json(RAIZ / "referencias/citacoes.json", [{"categoria": cat, "origem": orig(j), **j} for j in regs])
        elif sch == "gabcmt.paradigmas.precedentes" or (sch == "gabA.paradigmas" and doc.get("banco_tipo") == "Precedente"):
            raise SystemExit(f"{c}: importação de precedentes pelos apps entra na etapa 3 (Construtor adaptado); "
                             "por ora use scripts/migrar.py")
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
