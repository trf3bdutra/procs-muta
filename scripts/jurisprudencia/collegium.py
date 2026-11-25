#!/usr/bin/env python3
"""Collegium: ementário dos demais gabinetes da Turma Regional de Mato Grosso do Sul (sem os julgados do Relator).

Uso:  python3 scripts/jurisprudencia/collegium.py LOTE.json --coleta AAAA-MM-DD --criterio "texto" [--raiz .] [--simular]

LOTE.json: lista de registros compactos do DJEN (scripts/jurisprudencia/djen.py › compacta, ou a coleta pelo navegador):
  {g (idOrgao), o (órgão), p (processo), t (tipoDocumento), d (disponibilização), c (classe), cc (código da classe),
   l (link do documento no PJe), rel (relator), cab (cabeçalho), em + res (acórdão: ementa e parágrafo do acórdão),
   disp + abre (monocrática: dispositivo e abertura), n (tamanho do texto no DJEN)}

Grava em precedentes/collegium/ (mesmo formato da série do Relator, para o mesmo ementário ler):
  acordaos/AAAA.json.gz · monocraticas/AAAA.json.gz · indice.json.gz (com rl = relator, g = gabinete) · MANIFESTO.json · SHA256SUMS
Repetição = mesmo processo, mesmo tipo e mesma data do julgamento: fica o registro já gravado (nada é apagado).
Não guarda o inteiro teor (só ementa e resultado, ou abertura e dispositivo); o link do documento no PJe vai junto.
Julgados do Relator (Gab. A, idOrgao 101584, ou relator CARLOS MUTA) nunca entram aqui.
"""
import argparse, gzip, hashlib, json, re
from collections import Counter
from pathlib import Path

PASTA = "precedentes/collegium"
SIGLA_RELATOR = 101584


def iso(br):
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", br or "")
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None


def sha(t):
    return hashlib.sha256((t or "").encode("utf-8")).hexdigest()


def sha_arq(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def grava_gz(p, obj):
    p.parent.mkdir(parents=True, exist_ok=True)
    dado = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    with open(p, "wb") as fo:
        with gzip.GzipFile(fileobj=fo, mode="wb", mtime=0, compresslevel=9) as g:
            g.write(dado)


def ler_gz(p, padrao):
    return json.load(gzip.open(p)) if p.exists() else padrao


def resumo(e, n=377):
    t = re.sub(r"\s+", " ", e or "").strip()
    return t if len(t) <= n else t[:n].rsplit(" ", 1)[0] + "…"


def data_link(link):
    m = re.search(r"x=(\d{6})", link or "")
    return f"{m.group(1)[4:6]}/{m.group(1)[2:4]}/20{m.group(1)[:2]}" if m else None


CARGO = r"(?:Desembargador(?:a)? Federal|Ju[ií]z(?:a)? Federal(?: Convocad[oa])?)"


def relator_nome(x):
    """Nome do relator: no acórdão, "nos termos do voto do Desembargador Federal NOME (Relator)"; na monocrática,
    a assinatura "NOME Desembargador Federal" no fim; o cabeçalho do PJe traz só o gabinete ("Gab. B da Turma…")."""
    return canonico(_relator_bruto(x))


# o mesmo relator aparece com o nome completo ou abreviado; a forma usada é a mais frequente nos acórdãos
ALIAS = {"JEAN MARCOS FERREIRA": "JEAN MARCOS", "NEY GUSTAVO PAES DE ANDRADE": "NEY DE ANDRADE"}


def canonico(nome):
    n = re.sub(r"^(?:[A-Z]{2}\.\s+)+", "", re.sub(r"\s+", " ", nome or "").strip(" .-,;")).upper()
    return ALIAS.get(n, n)


def _relator_bruto(x):
    if x.get("rl2"):
        return x["rl2"]
    res, disp, cab = x.get("res") or "", x.get("disp") or "", x.get("rel") or ""
    m = re.search(r"voto d[oa] " + CARGO + r" ([A-ZÀ-Ú][A-ZÀ-Ú .'-]+?) \((?:Relator|Relatora)", res)
    if m:
        return m.group(1).strip()
    m = re.search(r"data da assinatura\.?\s+([A-ZÀ-Ú][A-ZÀ-Ú .'-]+?)\s+" + CARGO, disp)
    if m:
        return m.group(1).strip()
    m = re.search(r"([A-ZÀ-Ú][A-ZÀ-Ú .'-]{4,}?)\s+" + CARGO + r"\s*$", disp)
    if m:
        return m.group(1).strip()
    cab = re.sub(r"\s+", " ", cab).strip(" -,;")
    return "" if not cab or cab.lower().startswith("gab") else cab.upper()


PAPEIS = (r"APELANTE|APELADO|AGRAVANTE|AGRAVADO|EMBARGANTE|EMBARGADO|IMPETRANTE|IMPETRADO|PARTE AUTORA|PARTE R[EÉ]|"
          r"JUIZO RECORRENTE|INTERESSADO|TERCEIRO INTERESSADO|EXEQUENTE|EXECUTADO|RECORRENTE|RECORRIDO|REQUERENTE|"
          r"REQUERIDO|AUTOR|R[EÉ]U|SUCEDIDO|SUCESSOR|REPRESENTANTE|ASSISTENTE|SUSCITANTE|SUSCITADO|PACIENTE|CUSTOS LEGIS")
ROTULO = re.compile(r"((?:ADVOGADO|PROCURADOR) do\(a\) (?:%s)|%s)\s*:\s*" % (PAPEIS, PAPEIS))


def partes(cab):
    i = re.search(r"RELATOR(?:\(A\))?:", cab or "")
    if not i:
        return []
    pedacos = ROTULO.split(cab[i.end():])
    return [{"polo": pedacos[k].strip(), "nome": pedacos[k + 1].strip(" ,;")}
            for k in range(1, len(pedacos) - 1, 2) if pedacos[k + 1].strip(" ,;")]


def sem_cabecalho(abre, cab):
    """Abertura da decisão sem o cabeçalho do PJe (órgão, endereço, classe e partes), quando não há "Vistos"."""
    t = (abre or "").strip()
    if t.startswith("Vistos"):
        return t
    m = re.search(r"\s(?:D\s?E\s?C\s?I\s?S\s?[ÃA]\s?O|DECIS[ÃA]O)\s", t)
    if m:
        return t[m.end():].strip()
    c = (cab or "").strip()
    return t[len(c):].strip() if c and t.startswith(c[:60]) else t


def resultado(res):
    m = re.search(r"(Vistos e relatados.*?nos termos do relat[óo]rio e voto[^.]*\.)", res or "")
    completo = re.sub(r"\s+", " ", m.group(1) if m else (res or "")[:1500]).strip()
    r = re.search(r",\s*((?:por unanimidade|por maioria)[^.]*?),?\s*nos termos", completo)
    return completo or None, (r.group(1).strip() if r else None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lote")
    ap.add_argument("--coleta", required=True)
    ap.add_argument("--criterio", required=True)
    ap.add_argument("--raiz", default=".")
    ap.add_argument("--simular", action="store_true")
    a = ap.parse_args()
    R = Path(a.raiz)
    C = R / PASTA
    man = json.loads((C / "MANIFESTO.json").read_text(encoding="utf-8")) if (C / "MANIFESTO.json").exists() else {
        "schema": "gabcmt.collegium", "descricao": "Julgados dos demais gabinetes da Turma Regional de Mato Grosso do Sul, sem os do Relator",
        "fonte": "Diário de Justiça Eletrônico Nacional (CNJ) — comunicaapi.pje.jus.br",
        "orgaos": {"98372": "Gab. B da Turma Regional de Mato Grosso do Sul", "102009": "Gab. C da Turma Regional de Mato Grosso do Sul"},
        "registros": [], "arquivos": [], "coletas": []}
    idx = ler_gz(C / "indice.json.gz", [])
    total_antes = len(man["registros"])

    # siglas de classe pelo nome, como a série do Relator já registra
    sig = Counter()
    J = R / "precedentes/jurisprudencia/indice.json.gz"
    for x in (json.load(gzip.open(J)) if J.exists() else []):
        if x.get("c") and x.get("cl"):
            sig[(x["cl"].upper(), x["c"])] += 1
    sigla_de = {}
    for (nome, s), _ in sig.most_common():
        sigla_de.setdefault(nome, s)

    arqs, chaves = {}, {}
    def arq(tipo, y):
        if (tipo, y) not in arqs:
            arqs[(tipo, y)] = ler_gz(C / tipo / f"{y}.json.gz", {"tipo": tipo, "ano": y, "total": 0, "registros": []})
            chaves[(tipo, y)] = {(r["numero_processo"], r["data"]) for r in arqs[(tipo, y)]["registros"]}
        return arqs[(tipo, y)]

    prox = {"A": 1 + max([int(r["id"][2:]) for r in man["registros"] if r["id"].startswith("CA")] or [0]),
            "M": 1 + max([int(r["id"][2:]) for r in man["registros"] if r["id"].startswith("CM")] or [0])}
    lote = json.loads(Path(a.lote).read_text(encoding="utf-8"))
    # dentro do lote: um por processo+tipo+data, o de texto mais longo
    melhor = {}
    for x in lote:
        if str(x.get("g")) == str(SIGLA_RELATOR) or "MUTA" in relator_nome(x).upper():
            continue
        dj = data_link(x.get("l"))
        if not dj:
            continue
        k = (x["p"], "A" if x["t"] == "Acórdão" else "M", dj)
        if k not in melhor or (x.get("n") or 0) > (melhor[k].get("n") or 0):
            melhor[k] = x
    novos, dup = [], 0
    for (proc, t, dj), x in sorted(melhor.items(), key=lambda kv: (iso(kv[0][2]), kv[0][0])):
        y = dj[6:]
        tipo = "acordaos" if t == "A" else "monocraticas"
        d = arq(tipo, y)
        if (proc, dj) in chaves[(tipo, y)]:
            dup += 1
            continue
        nome_cl = (x.get("c") or "").upper()
        reg = {"id": f"C{t}{prox[t]:05d}", "numero_processo": proc, "classe_sigla": sigla_de.get(nome_cl),
               "classe": nome_cl or None, "codigo_classe": x.get("cc"), "orgao_julgador": "Turma Regional de Mato Grosso do Sul",
               "gabinete": x.get("o"), "id_orgao_djen": x.get("g"), "relator": relator_nome(x),
               "data": dj, "data_iso": iso(dj), "data_fonte": "número do documento no PJe (DJEN)",
               "data_disponibilizacao_djen": "/".join(reversed((x.get("d") or "").split("-"))),
               "tipo_documento": x.get("t"), "partes": partes(x.get("cab")),
               "link_documento_djen": x.get("l"),
               "link_pje": "https://pje2g.trf3.jus.br/pje/ConsultaPublica/listView.seam?numProcesso=" + re.sub(r"\D", "", proc),
               "caracteres_texto_djen": x.get("n")}
        if t == "A":
            completo, curto = resultado(x.get("res"))
            reg.update(ementa=(x.get("em") or "").strip(), resultado_colegiado=completo, resultado=curto,
                       conteudo_texto="ementa_e_resultado")
            reg["sha256_ementa"] = sha(reg["ementa"])
            e, r = resumo(reg["ementa"]), curto
        else:
            reg.update(abertura=sem_cabecalho(x.get("abre"), x.get("cab")), dispositivo=(x.get("disp") or "").strip() or None,
                       conteudo_texto="abertura_e_dispositivo")
            reg["texto_guardado"] = reg["abertura"] + (" … " + reg["dispositivo"] if reg["dispositivo"] else "")
            e, r = resumo(reg["abertura"]), resumo(reg["dispositivo"], 300) if reg["dispositivo"] else None
        prox[t] += 1
        chaves[(tipo, y)].add((proc, dj))
        d["registros"].append(reg)
        novos.append((tipo, y, reg))
        idx.append({"id": reg["id"], "t": t, "n": proc, "c": reg["classe_sigla"], "cl": reg["classe"], "o": reg["orgao_julgador"],
                    "d": reg["data_iso"], "p": None, "v": "DJEN", "a": "relator", "k": reg["conteudo_texto"], "e": e, "r": r,
                    "y": y, "rl": reg["relator"] or None, "g": reg["gabinete"]})
        man["registros"].append({"id": reg["id"], "arquivo": f"{tipo}/{y}.json.gz",
                                 "sha256": reg.get("sha256_ementa") or sha(reg.get("texto_guardado"))})

    print(f"lote: {len(lote)} · distintos: {len(melhor)} · já gravados: {dup} · novos: {len(novos)} "
          f"{dict(Counter((t, y) for t, y, _ in novos))}")
    if a.simular:
        return
    assert len(man["registros"]) >= total_antes, "o total caiu"
    for (tipo, y), d in arqs.items():
        d["total"] = len(d["registros"])
        grava_gz(C / tipo / f"{y}.json.gz", d)
    idx.sort(key=lambda x: (x.get("d") or ""), reverse=True)
    grava_gz(C / "indice.json.gz", idx)

    man["totais"] = {"acordaos": sum(1 for x in idx if x["t"] == "A"), "monocraticas": sum(1 for x in idx if x["t"] == "M")}
    man["por_relator"] = dict(Counter(x.get("rl") or "(não informado)" for x in idx).most_common())
    man["por_gabinete"] = dict(Counter(x.get("g") or "(não informado)" for x in idx).most_common())
    man["contagem_por_ano"] = {t: dict(sorted(Counter(x["y"] for x in idx if x["t"] == k).items())) for t, k in (("acordaos", "A"), ("monocraticas", "M"))}
    man["periodo"] = {"de": min((x["d"] for x in idx if x.get("d")), default=None), "ate": max((x["d"] for x in idx if x.get("d")), default=None)}
    man["ultima_coleta"] = a.coleta
    man["coletas"].append({"data": a.coleta, "criterio": a.criterio, "lidos": len(lote), "distintos": len(melhor),
                           "ja_gravados": dup, "acrescentados": len(novos)})
    arquivos = sorted([p for p in C.rglob("*.json.gz") if "busca" not in p.parts])
    man["arquivos"] = [{"arquivo": str(p.relative_to(C)), "bytes": p.stat().st_size, "sha256": sha_arq(p)} for p in arquivos]
    (C / "MANIFESTO.json").write_text(json.dumps(man, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (C / "SHA256SUMS").write_text("".join(f"{x['sha256']}  {x['arquivo']}\n" for x in man["arquivos"]), encoding="utf-8")
    print(f"Collegium: {total_antes} → {len(man['registros'])} registros")


if __name__ == "__main__":
    main()
