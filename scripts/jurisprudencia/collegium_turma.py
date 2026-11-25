#!/usr/bin/env python3
"""Collegium com a Turma inteira: junta, na publicação, os julgados dos Gabs. B e C (precedentes/collegium)
e a série do Relator Carlos Muta (precedentes/jurisprudencia), sem duplicar nada no Git.

Pré-requisito: busca/ gerada nas duas pastas (scripts/jurisprudencia/gerar_busca.py, com e sem --pasta).
Saída (--saida, ex.: site/public/collegium): indice.json.gz unificado (os do Relator com rl="CARLOS MUTA"
e g="Gab. A"), resumo.json com o Relator entre os relatores e busca/ com os textos das duas séries
(a proveniência DJEN, origem-*.json.gz, continua só dos julgados do Collegium)."""
import argparse, gzip, json, shutil
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
REL, GAB = "CARLOS MUTA", "Gab. A"


def ler_gz(p):
    return json.load(gzip.open(p))


def grava_gz(p, obj=None, dado=None):
    if dado is None:
        dado = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    with open(p, "wb") as fo:
        with gzip.GzipFile(fileobj=fo, mode="wb", mtime=0, compresslevel=9) as g:
            g.write(dado)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", required=True)
    ap.add_argument("--collegium", default=str(RAIZ / "precedentes/collegium"))
    ap.add_argument("--relator", default=str(RAIZ / "precedentes/jurisprudencia"))
    a = ap.parse_args()
    C, M, S = Path(a.collegium), Path(a.relator), Path(a.saida)
    (S / "busca").mkdir(parents=True, exist_ok=True)

    # índice unificado, do mais recente para o mais antigo
    col = ler_gz(C / "indice.json.gz")
    rel = [dict(x, rl=REL, g=GAB) for x in ler_gz(M / "indice.json.gz")]
    ids = {x["id"] for x in col}
    assert not any(x["id"] in ids for x in rel), "ids repetidos entre as séries"
    tudo = sorted(col + rel, key=lambda x: x.get("d") or "", reverse=True)
    grava_gz(S / "indice.json.gz", tudo)

    # resumo: o Relator entra entre os relatores
    r = json.loads((C / "resumo.json").read_text(encoding="utf-8"))
    na = sum(1 for x in rel if x.get("t") == "A")
    r.setdefault("totais", {})
    r["totais"]["acordaos"] = r["totais"].get("acordaos", 0) + na
    r["totais"]["monocraticas"] = r["totais"].get("monocraticas", 0) + len(rel) - na
    pr = dict(r.get("por_relator") or {})
    pr[REL] = len(rel)
    r["por_relator"] = dict(sorted(pr.items(), key=lambda kv: -kv[1]))
    ds = [x["d"] for x in rel if x.get("d")]
    if ds:
        r.setdefault("periodo", {})["de"] = min([r["periodo"].get("de") or ds[0]] + ds)
    r["inclui_relator"] = True
    (S / "resumo.json").write_text(json.dumps(r, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # busca: textos das duas séries no mesmo arquivo por tipo e ano; proveniência só do Collegium
    mc = json.loads((C / "busca/indice.json").read_text(encoding="utf-8"))
    mm = json.loads((M / "busca/indice.json").read_text(encoding="utf-8"))
    for f in (C / "busca").glob("origem-*.json.gz"):
        shutil.copy2(f, S / "busca" / f.name)
    arqs = {}
    for k in sorted(set(mc["arquivos"]) | set(mm["arquivos"])):
        dado = b""
        n = 0
        for B, man in ((C, mc), (M, mm)):
            if k in man["arquivos"]:
                dado += gzip.open(B / "busca" / f"{k}.txt.gz").read()
                n += man["arquivos"][k]["registros"]
        out = S / "busca" / f"{k}.txt.gz"
        grava_gz(out, dado=dado)
        arqs[k] = {"registros": n, "bytes": out.stat().st_size}
    man = dict(mc, arquivos=arqs)
    (S / "busca/indice.json").write_text(json.dumps(man, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Collegium com o Relator: {len(tudo)} julgados ({len(col)} dos Gabs. B e C, {len(rel)} do Relator); {len(arqs)} arquivos de busca")


if __name__ == "__main__":
    main()
