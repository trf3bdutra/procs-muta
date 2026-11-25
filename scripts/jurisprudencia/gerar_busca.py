#!/usr/bin/env python3
"""Arquivos de busca em texto integral da série histórica (precedentes/jurisprudencia/busca/).

Uso:  python3 scripts/jurisprudencia/gerar_busca.py [--raiz .] [--pasta precedentes/jurisprudencia | precedentes/collegium]

Um arquivo por tipo e ano (A-AAAA.txt.gz acórdãos, M-AAAA.txt.gz monocráticas), uma linha por julgado:
  id <TAB> ementa <TAB> texto (inteiro teor; sem ele, o resultado)
Quebras de linha viram U+2029 (um caractere), para a linha caber numa só e o navegador achar a posição exata
do termo no texto original. Lido pelo ementário do Compendium (busca "Texto integral"), que baixa só os anos
do recorte. Idempotente; manifesto em busca/indice.json.
"""
import argparse, gzip, json, re
from pathlib import Path

P = " "


def limpa(t):
    t = str(t or "").replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")
    t = re.sub(r"[  ]{2,}", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t.strip())
    return t.replace("\n", P)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--raiz", default=".")
    ap.add_argument("--pasta", default="precedentes/jurisprudencia", help="precedentes/collegium para o Collegium")
    a = ap.parse_args()
    J = Path(a.raiz) / a.pasta; S = J / "busca"; S.mkdir(exist_ok=True)
    man = {"schema": "gabcmt.jurisprudencia.busca", "formato": "id\\tementa\\ttexto; quebras = U+2029", "arquivos": {}}
    for pasta, t in (("acordaos", "A"), ("monocraticas", "M")):
        for f in sorted((J / pasta).glob("*.json.gz")):
            ano = f.name[:4]
            regs = json.load(gzip.open(f)).get("registros", [])
            if J.name == "collegium":
                import hashlib
                campos = ("id", "numero_processo", "relator", "gabinete", "id_orgao_djen",
                          "data", "data_iso", "data_fonte", "data_disponibilizacao_djen",
                          "tipo_documento", "conteudo_texto", "link_documento_djen", "link_pje",
                          "caracteres_texto_djen", "sha256_ementa")
                proveniencia = {}
                for pos, reg in enumerate(regs, 1):
                    item = {k: reg[k] for k in campos if reg.get(k) is not None}
                    item["posicao"] = pos
                    item["arquivo"] = f"{pasta}/{f.name}"
                    item["sha256_registro"] = hashlib.sha256(
                        json.dumps(reg, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
                    ).hexdigest()
                    if reg.get("texto_guardado"):
                        item["sha256_excerto"] = hashlib.sha256(reg["texto_guardado"].encode("utf-8")).hexdigest()
                    proveniencia[reg["id"]] = item
                out_meta = S / f"origem-{t}-{ano}.json.gz"
                with open(out_meta, "wb") as fo:
                    with gzip.GzipFile(fileobj=fo, mode="wb", mtime=0, compresslevel=9) as g:
                        g.write(json.dumps(proveniencia, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
            linhas = []
            for r in regs:
                txt = r.get("inteiro_teor") or r.get("resultado_colegiado") or r.get("texto_guardado") or ""
                linhas.append(f'{r["id"]}\t{limpa(r.get("ementa"))}\t{limpa(txt)}')
            dado = ("\n".join(linhas) + "\n").encode("utf-8")
            out = S / f"{t}-{ano}.txt.gz"
            with open(out, "wb") as fo:
                with gzip.GzipFile(fileobj=fo, mode="wb", mtime=0, compresslevel=9) as g:
                    g.write(dado)
            man["arquivos"][f"{t}-{ano}"] = {"registros": len(regs), "bytes": out.stat().st_size}
    (S / "indice.json").write_text(json.dumps(man, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(len(man["arquivos"]), "arquivos;", sum(v["bytes"] for v in man["arquivos"].values()) // 1_000_000, "MB")


if __name__ == "__main__":
    main()
