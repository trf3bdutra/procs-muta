#!/usr/bin/env python3
"""Acrescenta à série histórica (precedentes/jurisprudencia) acórdãos colhidos só com a ementa.

Uso:  python3 scripts/jurisprudencia/acrescentar_ementas.py LOTE.json --coleta AAAA-MM-DD --criterio "texto"
                                                             [--raiz .] [--simular]

LOTE.json: lista de objetos {processo, classe ("Sigla - NOME"), orgao, julg (DD/MM/AAAA),
pub ("DJEN DATA: DD/MM/AAAA" ou "Intimação via sistema DATA: DD/MM/AAAA"), ementa}, como sai da
lista resumida da Base de Jurisprudência do TRF-3 (Relator: CARLOS MUTA).

Regras (as mesmas da coleta da série):
- duplicado = mesmo número, mesma data de julgamento e mesma classe; fica o que já está na série
  (a versão do lote, só com ementa, nunca é a mais completa) e nada é apagado;
- registros novos entram como conteudo_texto "apenas_ementa", sem partes, resultado, inteiro teor
  nem links de impressão (não se completa nada por suposição); a próxima coleta completa os substitui;
- ids novos continuam a numeração da série (A26101, A26102…);
- atualiza o arquivo do ano, indice.json.gz, MANIFESTO.json (registros, arquivos, totais, contagem
  por ano e histórico em "coletas_incrementais") e SHA256SUMS; o total nunca cai.
"""
import argparse, gzip, hashlib, json, re
from collections import Counter
from pathlib import Path


def iso(br):
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", br or "")
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None


def sha(t):
    return hashlib.sha256((t or "").encode("utf-8")).hexdigest()


def grava_gz(p, obj):
    dado = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    with open(p, "wb") as fo:
        with gzip.GzipFile(fileobj=fo, mode="wb", mtime=0, compresslevel=9) as g:
            g.write(dado)


def resumo(e, n=377):
    t = re.sub(r"\s+", " ", e or "").strip()
    if len(t) <= n:
        return t
    return t[:n].rsplit(" ", 1)[0] + "…"


def registro(r, ident):
    sigla, _, nome = (r["classe"] or "").partition(" - ")
    veic = re.sub(r"\s*DATA:.*$", "", r["pub"], flags=re.I).strip()
    em = (r["ementa"] or "").strip()
    return {
        "id": ident, "seq": None, "numero_processo": r["processo"], "classe_sigla": sigla.strip() or None,
        "classe": nome.strip() or None, "numero_classe_legado": None, "orgao_julgador": r["orgao"],
        "relator": "Desembargador Federal LUIS CARLOS HIROKI MUTA", "relator_no_documento": None,
        "data_julgamento": r["julg"], "data_julgamento_iso": iso(r["julg"]), "publicacao_veiculo": veic or None,
        "data_publicacao": re.search(r"(\d{2}/\d{2}/\d{4})", r["pub"]).group(1), "publicacao_complemento": None,
        "partes": [], "resultado_colegiado": None, "ementa": em, "inteiro_teor": None,
        "possui_inteiro_teor": False, "caracteres_inteiro_teor": 0,
        "link_pje": "https://pje2g.trf3.jus.br/pje/ConsultaPublica/listView.seam?numProcesso=" + re.sub(r"\D", "", r["processo"]),
        "link_integra_externa": None, "link_impressao": None, "link_pdf": None,
        "atuacao_muta": "relator", "sha256_inteiro_teor": None, "sha256_ementa": sha(em),
        "conteudo_texto": "apenas_ementa",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lote")
    ap.add_argument("--coleta", required=True)
    ap.add_argument("--criterio", required=True)
    ap.add_argument("--raiz", default=".")
    ap.add_argument("--simular", action="store_true")
    a = ap.parse_args()
    J = Path(a.raiz) / "precedentes/jurisprudencia"
    man = json.loads((J / "MANIFESTO.json").read_text(encoding="utf-8"))
    idx = json.load(gzip.open(J / "indice.json.gz"))
    total_antes = len(man["registros"])

    anos = {}
    def ano(y):
        if y not in anos:
            p = J / "acordaos" / f"{y}.json.gz"
            anos[y] = json.load(gzip.open(p)) if p.exists() else {"tipo": "acordaos", "ano": y, "total": 0, "registros": []}
        return anos[y]

    prox = max(int(r["id"][1:]) for r in man["registros"] if r["id"].startswith("A")) + 1
    lote = json.loads(Path(a.lote).read_text(encoding="utf-8"))
    novos, dup = [], 0
    chaves = {}
    for r in lote:
        y = iso(r["julg"])[:4]
        d = ano(y)
        if y not in chaves:
            chaves[y] = {(x["numero_processo"], x["data_julgamento"], x["classe_sigla"]) for x in d["registros"]}
        sigla = (r["classe"] or "").partition(" - ")[0].strip()
        k = (r["processo"], r["julg"], sigla)
        if k in chaves[y]:
            dup += 1
            continue
        reg = registro(r, f"A{prox:05d}")
        prox += 1
        chaves[y].add(k)
        d["registros"].append(reg)
        novos.append((y, reg))

    print(f"lote: {len(lote)} · já na série: {dup} · novos: {len(novos)} · por ano: {dict(Counter(y for y, _ in novos))}")
    if a.simular or not novos:
        return

    for y, d in anos.items():
        d["total"] = len(d["registros"])
        grava_gz(J / "acordaos" / f"{y}.json.gz", d)
    for y, reg in novos:
        idx.append({"id": reg["id"], "t": "A", "n": reg["numero_processo"], "c": reg["classe_sigla"], "cl": reg["classe"],
                    "o": reg["orgao_julgador"], "d": reg["data_julgamento_iso"], "p": reg["data_publicacao"],
                    "v": reg["publicacao_veiculo"], "a": "relator", "k": "apenas_ementa", "e": resumo(reg["ementa"]),
                    "r": None, "y": y})
        man["registros"].append({"id": reg["id"], "arquivo": f"dados/acordaos/{y}.json.gz",
                                 "sha256_inteiro_teor": None, "sha256_ementa": reg["sha256_ementa"]})
    grava_gz(J / "indice.json.gz", idx)

    assert len(man["registros"]) >= total_antes, "o total caiu"
    tot = man["totais"]
    tot["acordaos"] += len(novos)
    tot["acordaos_na_base"] = tot.get("acordaos_na_base", 0) + len(novos)
    pc = tot.setdefault("acordaos_por_conteudo_texto", {})
    pc["apenas_ementa"] = pc.get("apenas_ementa", 0) + len(novos)
    cont = man["contagem_por_ano"]["acordaos"]
    for y, _ in novos:
        cont[y] = cont.get(y, 0) + 1
    man["contagem_por_ano"]["acordaos"] = dict(sorted(cont.items()))
    man.setdefault("coletas_incrementais", []).append({
        "data": a.coleta, "colecao": "acordaos", "criterio": a.criterio, "lidos": len(lote),
        "ja_na_serie": dup, "acrescentados": len(novos), "conteudo_texto": "apenas_ementa",
        "observacao": "colhidos da lista resumida (ementa); sem partes, resultado, inteiro teor e links de impressão, "
                      "a completar pela próxima coleta completa"})

    arqs = {x["arquivo"]: x for x in man["arquivos"]}
    for rel in [f"acordaos/{y}.json.gz" for y in anos] + ["indice.json.gz"]:
        p, chave = J / rel, f"dados/{rel}"
        if chave not in arqs:
            arqs[chave] = {"arquivo": chave}
            man["arquivos"].append(arqs[chave])
        arqs[chave].update(bytes=p.stat().st_size, sha256=sha_arq(p))
    (J / "MANIFESTO.json").write_text(json.dumps(man, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    linhas = []
    for l in (J / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
        h, nome = l.split(None, 1)
        p = J / nome.strip().lstrip("*")
        linhas.append(f"{sha_arq(p) if p.exists() else h}  {nome.strip()}")
    (J / "SHA256SUMS").write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print(f"série: {total_antes} → {len(man['registros'])} registros")


def sha_arq(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


if __name__ == "__main__":
    main()
