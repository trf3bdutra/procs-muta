#!/usr/bin/env python3
"""Completa a série histórica com documentos do Diário de Justiça Eletrônico Nacional (DJEN, CNJ).

Uso:  python3 scripts/jurisprudencia/completar_djen.py DJEN.json --coleta AAAA-MM-DD --criterio "texto"
                                                       [--raiz .] [--simular]

Fonte: API pública do DJEN (comunicaapi.pje.jus.br/api/v1/comunicacao), filtrada por siglaTribunal=TRF3 e
orgaoId=101584 (Gab. A da Turma Regional de Mato Grosso do Sul). DJEN.json é uma lista de objetos
{p (processo com máscara), t (tipoDocumento), d (data de disponibilização), c (classe), cc (código da classe),
o (órgão), l (link do documento no PJe), x (texto integral)}, já sem repetições por destinatário.

O que faz:
- Acórdãos: os registros da série com conteudo_texto "apenas_ementa" recebem o inteiro teor do DJEN quando o
  número do processo e a data do julgamento coincidem; passam a "integral", com partes, resultado e hash.
- Monocráticas ("Decisão Monocrática Terminativa…"): entram as que ainda não estão na série (mesmo processo e
  mesmo início de texto), com ids novos (M…).
- Data da decisão/julgamento: lida do número do documento no link do PJe (x=AAMMDDhhmmss…, data da assinatura),
  conferida contra a série em 398 de 398 casos na coleta de 25/11/2026; registrada em data_decisao_fonte.
- O texto do DJEN vem numa linha só (sem quebras de parágrafo); fica assim.
- Atualiza arquivos do ano, índice, MANIFESTO (contagens e coletas_incrementais) e SHA256SUMS. O total nunca cai.
"""
import argparse, gzip, json, re
from collections import Counter
from pathlib import Path
import importlib.util

_spec = importlib.util.spec_from_file_location("ae", Path(__file__).with_name("acrescentar_ementas.py"))
ae = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ae)

PAPEIS = (r"APELANTE|APELADO|AGRAVANTE|AGRAVADO|EMBARGANTE|EMBARGADO|IMPETRANTE|IMPETRADO|PARTE AUTORA|PARTE R[EÉ]|"
          r"JUIZO RECORRENTE|INTERESSADO|TERCEIRO INTERESSADO|EXEQUENTE|EXECUTADO|RECORRENTE|RECORRIDO|REQUERENTE|"
          r"REQUERIDO|AUTOR|R[EÉ]U|SUCEDIDO|SUCESSOR|REPRESENTANTE|ASSISTENTE|OPOENTE|OPOSTO|CUSTOS LEGIS")
ROTULO = re.compile(r"((?:ADVOGADO|PROCURADOR) do\(a\) (?:%s)|%s)\s*:\s*" % (PAPEIS, PAPEIS))
FIM_CAB = re.compile(r"\s(RELAT[ÓO]RIO|DECIS[ÃA]O|VOTO|EMENTA|D E C I S [ÃA] O)\s")


def norm(t):
    return re.sub(r"\s+", " ", t or "").strip()


def data_link(link):
    m = re.search(r"x=(\d{6})", link or "")
    return f"{m.group(1)[4:6]}/{m.group(1)[2:4]}/20{m.group(1)[:2]}" if m else None


def partes(texto):
    i = re.search(r"RELATOR(?:\(A\))?:", texto)
    if not i:
        return []
    cab = texto[i.end():]
    f = FIM_CAB.search(cab)
    cab = cab[:f.start()] if f else cab[:3000]
    pedacos = ROTULO.split(cab)
    out = []
    for k in range(1, len(pedacos) - 1, 2):
        nome = pedacos[k + 1].strip(" ,;")
        if nome:
            out.append({"polo": pedacos[k].strip(), "nome": nome})
    return out


def resultado(texto):
    i = texto.rfind("ACÓRDÃO")
    if i < 0:
        return None, None
    par = texto[i + len("ACÓRDÃO"):].strip()
    m = re.search(r"(Vistos e relatados.*?nos termos do relat[óo]rio e voto[^.]*\.)", par)
    completo = norm(m.group(1)) if m else norm(par[:1500])
    r = re.search(r",\s*((?:por unanimidade|por maioria)[^.]*?),?\s*nos termos", completo)
    return completo, (r.group(1).strip() if r else None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("djen")
    ap.add_argument("--coleta", required=True)
    ap.add_argument("--criterio", required=True)
    ap.add_argument("--raiz", default=".")
    ap.add_argument("--simular", action="store_true")
    a = ap.parse_args()
    J = Path(a.raiz) / "precedentes/jurisprudencia"
    man = json.loads((J / "MANIFESTO.json").read_text(encoding="utf-8"))
    idx = json.load(gzip.open(J / "indice.json.gz"))
    pidx = {x["id"]: x for x in idx}
    pman = {x["id"]: x for x in man["registros"]}
    total_antes = len(man["registros"])
    itens = json.loads(Path(a.djen).read_text(encoding="utf-8"))

    arqs = {}
    def arq(tipo, y):
        k = (tipo, y)
        if k not in arqs:
            p = J / tipo / f"{y}.json.gz"
            arqs[k] = json.load(gzip.open(p)) if p.exists() else {"tipo": tipo, "ano": y, "total": 0, "registros": []}
        return arqs[k]

    # acórdãos: completar os "apenas_ementa"
    completados = 0
    for i in [x for x in itens if x["t"] == "Acórdão"]:
        dj = data_link(i["l"])
        if not dj:
            continue
        d = arq("acordaos", dj[6:])
        for r in d["registros"]:
            if r["numero_processo"] == i["p"] and r["data_julgamento"] == dj and r["conteudo_texto"] == "apenas_ementa":
                texto = norm(i["x"])
                completo, curto = resultado(texto)
                r.update(inteiro_teor=texto, possui_inteiro_teor=True, caracteres_inteiro_teor=len(texto),
                         sha256_inteiro_teor=ae.sha(texto), conteudo_texto="integral",
                         partes=partes(texto) or r.get("partes") or [], resultado_colegiado=completo,
                         relator_no_documento="RELATOR: " + (i.get("o") or ""),
                         link_integra_externa="http://www.trf3.jus.br/trf3r/index.php?id=20&op=resultado&processo="
                                              + re.sub(r"\D", "", r["numero_processo"]),
                         link_documento_djen=i["l"], fonte_inteiro_teor="DJEN")
                if r["id"] in pidx:
                    pidx[r["id"]].update(k="integral", r=curto)
                if r["id"] in pman:
                    pman[r["id"]]["sha256_inteiro_teor"] = r["sha256_inteiro_teor"]
                completados += 1

    # monocráticas: acrescentar as que faltam
    prox = max(int(r["id"][1:]) for r in man["registros"] if r["id"].startswith("M")) + 1
    siglas = Counter()
    for x in idx:  # sigla da classe pelo nome, como a série já registra
        if x.get("c") and x.get("cl"):
            siglas[(x["cl"].upper(), x["c"])] += 1
    sigla_de = {}
    for (nome, sg), n in siglas.most_common():
        sigla_de.setdefault(nome, sg)
    novas = []
    for i in [x for x in itens if x["t"].startswith("Decisão Monocrática")]:
        dj = data_link(i["l"])
        if not dj:
            continue
        y = dj[6:]
        d = arq("monocraticas", y)
        t = norm(i["x"])
        if any(r["numero_processo"] == i["p"] and (norm(r.get("inteiro_teor"))[:3000] == t[:3000]
               or norm(r.get("inteiro_teor"))[-600:] == t[-600:]) for r in d["registros"]):
            continue
        disp = None
        k = [m.start() for m in re.finditer(r"Ante o exposto", t)]
        if k:
            disp = t[k[-1]:]
        sigla = sigla_de.get((i.get("c") or "").upper())
        orgao = re.search(r"Tribunal Regional Federal da 3ª Região - ([^\n]+?) \1", t)
        reg = {"id": f"M{prox:05d}", "seq": None, "numero_processo": i["p"], "classe_sigla": sigla,
               "classe": (i.get("c") or "").upper() or None, "codigo_classe": i.get("cc"),
               "relator": "Desembargador Federal LUIS CARLOS HIROKI MUTA",
               "orgao_julgador": orgao.group(1) if orgao else None, "orgao_julgador_fonte": "cabeçalho do documento",
               "data_decisao": dj, "data_decisao_iso": ae.iso(dj), "data_decisao_fonte": "número do documento no PJe (DJEN)",
               "publicacao_veiculo": "DJEN", "data_publicacao": None,
               "data_disponibilizacao_djen": "/".join(reversed(i["d"].split("-"))),
               "tipo_documento": i["t"], "dispositivo": disp,
               "link_pje": "https://pje2g.trf3.jus.br/pje/ConsultaPublica/listView.seam?numProcesso=" + re.sub(r"\D", "", i["p"]),
               "link_impressao": None, "link_documento_djen": i["l"], "caracteres": len(t), "inteiro_teor": t,
               "sha256_inteiro_teor": ae.sha(t), "conteudo_texto": "integral", "fonte_inteiro_teor": "DJEN"}
        prox += 1
        d["registros"].append(reg)
        novas.append((y, reg))

    print(f"acórdãos completados: {completados} · monocráticas novas: {len(novas)} {dict(Counter(y for y, _ in novas))}")
    if a.simular:
        return

    for (tipo, y), d in arqs.items():
        d["total"] = len(d["registros"])
        ae.grava_gz(J / tipo / f"{y}.json.gz", d)
    for y, reg in novas:
        idx.append({"id": reg["id"], "t": "M", "n": reg["numero_processo"], "c": reg["classe_sigla"], "cl": reg["classe"],
                    "o": reg["orgao_julgador"], "d": reg["data_decisao_iso"], "p": reg["data_publicacao"], "v": "DJEN",
                    "a": "relator", "k": "integral",
                    "e": ae.resumo(reg["inteiro_teor"][reg["inteiro_teor"].find("Vistos"):] if "Vistos" in reg["inteiro_teor"] else reg["inteiro_teor"]),
                    "r": reg["dispositivo"], "y": y})
        man["registros"].append({"id": reg["id"], "arquivo": f"dados/monocraticas/{y}.json.gz",
                                 "sha256_inteiro_teor": reg["sha256_inteiro_teor"]})
    ae.grava_gz(J / "indice.json.gz", idx)

    assert len(man["registros"]) >= total_antes, "o total caiu"
    tot = man["totais"]
    pc = tot["acordaos_por_conteudo_texto"]
    pc["apenas_ementa"] -= completados
    pc["integral"] = pc.get("integral", 0) + completados
    tot["monocraticas"] += len(novas)
    cont = man["contagem_por_ano"]["monocraticas"]
    for y, _ in novas:
        cont[y] = cont.get(y, 0) + 1
    man["contagem_por_ano"]["monocraticas"] = dict(sorted(cont.items()))
    man.setdefault("coletas_incrementais", []).append({
        "data": a.coleta, "colecao": "acordaos e monocraticas", "fonte": "DJEN (CNJ) — comunicaapi.pje.jus.br, orgaoId 101584",
        "criterio": a.criterio, "lidos": len(itens), "acordaos_completados": completados,
        "monocraticas_acrescentadas": len(novas),
        "observacao": "texto do DJEN numa linha só; data da decisão lida do número do documento no PJe"})

    porarq = {x["arquivo"]: x for x in man["arquivos"]}
    for rel in [f"{t}/{y}.json.gz" for t, y in arqs] + ["indice.json.gz"]:
        p, chave = J / rel, f"dados/{rel}"
        if chave not in porarq:
            porarq[chave] = {"arquivo": chave}
            man["arquivos"].append(porarq[chave])
        porarq[chave].update(bytes=p.stat().st_size, sha256=ae.sha_arq(p))
    (J / "MANIFESTO.json").write_text(json.dumps(man, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    linhas = []
    for l in (J / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
        h, nome = l.split(None, 1)
        p = J / nome.strip().lstrip("*")
        linhas.append(f"{ae.sha_arq(p) if p.exists() else h}  {nome.strip()}")
    (J / "SHA256SUMS").write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print(f"série: {total_antes} → {len(man['registros'])} registros")


if __name__ == "__main__":
    main()
