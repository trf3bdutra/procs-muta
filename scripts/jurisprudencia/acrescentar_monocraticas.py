#!/usr/bin/env python3
"""Acrescenta à série histórica (precedentes/jurisprudencia) decisões monocráticas colhidas com inteiro teor.

Uso:  python3 scripts/jurisprudencia/acrescentar_monocraticas.py LOTE.json --coleta AAAA-MM-DD --criterio "texto"
                                                                  [--lacuna "texto"] [--raiz .] [--simular]

LOTE.json: lista de objetos {processo, classe ("Sigla - NOME"), dec (DD/MM/AAAA),
pub ("DJEN Data: DD/MM/AAAA" ou "Intimação via sistema Data: DD/MM/AAAA"), texto (inteiro teor)},
como saem da página de cada decisão na Base de Jurisprudência do TRF-3 (coleção Monocráticas).

Regras (as mesmas de acrescentar_ementas.py): duplicado = mesmo número, data da decisão e classe, e fica
o que já está na série; nada é apagado; ids novos continuam a numeração (M07158…); órgão julgador lido
do cabeçalho do documento; dispositivo = do "Ante o exposto" ao fim; atualiza arquivo do ano, índice,
MANIFESTO (com a lacuna, se houver) e SHA256SUMS. O total nunca cai.
"""
import argparse, gzip, hashlib, json, re
from collections import Counter
from pathlib import Path

import importlib.util
_spec = importlib.util.spec_from_file_location("ae", Path(__file__).with_name("acrescentar_ementas.py"))
ae = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ae)


def normaliza(t):
    t = (t or "").replace("\r\n", "\n")
    return re.sub(r"\n\s*\n+", "\n", t).strip()


def orgao(t):
    m = re.search(r"Tribunal Regional Federal da 3ª Região(?: - [^\n]*)?\n([^\n]+)", t)
    return m.group(1).strip() if m else None


def dispositivo(t):
    i = [m.start() for m in re.finditer(r"Ante o exposto", t)]
    return t[i[-1]:].strip() if i else None


def registro(r, ident):
    sigla, _, nome = (r["classe"] or "").partition(" - ")
    texto = normaliza(r["texto"])
    m = re.match(r"(.*?)\s*Data:\s*(\d{2}/\d{2}/\d{4})", r["pub"])
    return {
        "id": ident, "seq": None, "numero_processo": r["processo"], "classe_sigla": sigla.strip() or None,
        "classe": nome.strip() or None, "relator": "Desembargador Federal LUIS CARLOS HIROKI MUTA",
        "orgao_julgador": orgao(texto), "orgao_julgador_fonte": "cabeçalho do documento",
        "data_decisao": r["dec"], "data_decisao_iso": ae.iso(r["dec"]),
        "publicacao_veiculo": m.group(1).strip() if m else None, "data_publicacao": m.group(2) if m else None,
        "dispositivo": dispositivo(texto),
        "link_pje": "https://pje2g.trf3.jus.br/pje/ConsultaPublica/listView.seam?numProcesso=" + re.sub(r"\D", "", r["processo"]),
        "link_impressao": None, "caracteres": len(texto), "inteiro_teor": texto,
        "sha256_inteiro_teor": ae.sha(texto), "conteudo_texto": "integral",
    }


def resumo_e(texto):
    i = texto.find("Vistos")
    return ae.resumo(texto[i:] if i >= 0 else texto)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lote")
    ap.add_argument("--coleta", required=True)
    ap.add_argument("--criterio", required=True)
    ap.add_argument("--lacuna", default=None)
    ap.add_argument("--raiz", default=".")
    ap.add_argument("--simular", action="store_true")
    a = ap.parse_args()
    J = Path(a.raiz) / "precedentes/jurisprudencia"
    man = json.loads((J / "MANIFESTO.json").read_text(encoding="utf-8"))
    idx = json.load(gzip.open(J / "indice.json.gz"))
    total_antes = len(man["registros"])

    anos, chaves = {}, {}
    def ano(y):
        if y not in anos:
            p = J / "monocraticas" / f"{y}.json.gz"
            anos[y] = json.load(gzip.open(p)) if p.exists() else {"tipo": "monocraticas", "ano": y, "total": 0, "registros": []}
            chaves[y] = {(x["numero_processo"], x["data_decisao"], x["classe_sigla"]) for x in anos[y]["registros"]}
        return anos[y]

    prox = max(int(r["id"][1:]) for r in man["registros"] if r["id"].startswith("M")) + 1
    lote = json.loads(Path(a.lote).read_text(encoding="utf-8"))
    novos, dup = [], 0
    for r in lote:
        y = ae.iso(r["dec"])[:4]
        d = ano(y)
        k = (r["processo"], r["dec"], (r["classe"] or "").partition(" - ")[0].strip())
        if k in chaves[y]:
            dup += 1
            continue
        reg = registro(r, f"M{prox:05d}")
        prox += 1
        chaves[y].add(k)
        d["registros"].append(reg)
        novos.append((y, reg))
    print(f"lote: {len(lote)} · já na série: {dup} · novos: {len(novos)} · por ano: {dict(Counter(y for y, _ in novos))}")
    if a.simular or not novos:
        return

    for y, d in anos.items():
        d["total"] = len(d["registros"])
        ae.grava_gz(J / "monocraticas" / f"{y}.json.gz", d)
    for y, reg in novos:
        idx.append({"id": reg["id"], "t": "M", "n": reg["numero_processo"], "c": reg["classe_sigla"], "cl": reg["classe"],
                    "o": reg["orgao_julgador"], "d": reg["data_decisao_iso"], "p": reg["data_publicacao"],
                    "v": reg["publicacao_veiculo"], "a": "relator", "k": "integral", "e": resumo_e(reg["inteiro_teor"]),
                    "r": re.sub(r"\s+", " ", reg["dispositivo"] or "").strip() or None, "y": y})
        man["registros"].append({"id": reg["id"], "arquivo": f"dados/monocraticas/{y}.json.gz",
                                 "sha256_inteiro_teor": reg["sha256_inteiro_teor"]})
    ae.grava_gz(J / "indice.json.gz", idx)

    assert len(man["registros"]) >= total_antes, "o total caiu"
    man["totais"]["monocraticas"] += len(novos)
    cont = man["contagem_por_ano"]["monocraticas"]
    for y, _ in novos:
        cont[y] = cont.get(y, 0) + 1
    man["contagem_por_ano"]["monocraticas"] = dict(sorted(cont.items()))
    reg_col = {"data": a.coleta, "colecao": "monocraticas", "criterio": a.criterio, "lidos": len(lote),
               "ja_na_serie": dup, "acrescentados": len(novos), "conteudo_texto": "integral"}
    if a.lacuna:
        reg_col["lacuna"] = a.lacuna
    man.setdefault("coletas_incrementais", []).append(reg_col)

    arqs = {x["arquivo"]: x for x in man["arquivos"]}
    for rel in [f"monocraticas/{y}.json.gz" for y in anos] + ["indice.json.gz"]:
        p, chave = J / rel, f"dados/{rel}"
        if chave not in arqs:
            arqs[chave] = {"arquivo": chave}
            man["arquivos"].append(arqs[chave])
        arqs[chave].update(bytes=p.stat().st_size, sha256=ae.sha_arq(p))
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
