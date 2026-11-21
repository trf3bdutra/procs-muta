#!/usr/bin/env python3
"""Incorpora julgados novos à série histórica — só acréscimo, nunca reescrita.

Uso:
  python3 scripts/jurisprudencia/incorporar.py NOVOS.json [NOVOS2.json ...] [--raiz .]
  python3 scripts/jurisprudencia/incorporar.py --conferir

Cada arquivo de entrada é uma lista de registros já no esquema da série (ver
normalizar_coleta.py). O tipo vem dos campos: `data_julgamento_iso` -> acordaos,
`data_decisao_iso` -> monocraticas.

Descarta o que já existe pelo par (numero_processo, data de julgamento/decisão), acrescenta
os novos ao fim do arquivo do ano, acrescenta as entradas resumidas ao fim do indice.json.gz
e refaz MANIFESTO.json e SHA256SUMS. Nenhum registro antigo é alterado, reordenado ou removido.
"""
import argparse, datetime, gzip, hashlib, json, re, sys
from pathlib import Path

PREFIXO = {"acordaos": "A", "monocraticas": "M"}
LIM_EMENTA = 380


def grava_gz(caminho, dado):
    nome = Path(caminho).name
    nome = nome[:-3] if nome.endswith(".gz") else nome
    with open(caminho, "wb") as fo:
        with gzip.GzipFile(filename=nome, fileobj=fo, mode="wb", mtime=0, compresslevel=9) as g:
            g.write(json.dumps(dado, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))


def le_gz(caminho):
    return json.load(gzip.open(caminho))


def tipo_de(reg):
    return "acordaos" if "data_julgamento_iso" in reg else "monocraticas"


def chave(reg):
    return (reg.get("numero_processo"), reg.get("data_julgamento_iso") or reg.get("data_decisao_iso"))


def corta(texto):
    if not texto:
        return None
    t = re.sub(r"\s+", " ", texto).strip()
    if len(t) <= LIM_EMENTA:
        return t
    return t[:LIM_EMENTA].rsplit(" ", 1)[0] + "…"


def corpo_ementa(reg):
    if tipo_de(reg) == "acordaos":
        em = reg.get("ementa") or ""
        m = re.search(r"\n\s*Ementa\s*\n", em)
        return em[m.end():] if m else em
    it = reg.get("inteiro_teor") or ""
    m = re.search(r"\n\s*(DECIS[ÃA]O|DESPACHO)\s*\n", it)
    return it[m.end():] if m else it


def entrada_indice(reg, rid, tipo, ano):
    return {
        "id": rid,
        "t": PREFIXO[tipo],
        "n": reg.get("numero_processo"),
        "c": reg.get("classe_sigla"),
        "cl": reg.get("classe"),
        "o": reg.get("orgao_julgador"),
        "d": reg.get("data_julgamento_iso") or reg.get("data_decisao_iso"),
        "p": reg.get("data_publicacao"),
        "v": reg.get("publicacao_veiculo"),
        "a": reg.get("atuacao_muta", "relator"),
        "k": reg.get("conteudo_texto"),
        "e": corta(corpo_ementa(reg)),
        "r": corta(reg.get("resultado_colegiado") or reg.get("dispositivo")),
        "y": ano,
    }


def refaz_manifesto(J, novos_por_tipo):
    man = json.load(open(J / "MANIFESTO.json", encoding="utf-8"))
    contagem, totais = {}, {}
    for tipo in ("monocraticas", "acordaos"):
        por_ano = {}
        for f in sorted((J / tipo).glob("*.json.gz")):
            por_ano[f.name[:4]] = le_gz(f)["total"]
        contagem[tipo] = por_ano
        totais[tipo] = sum(por_ano.values())
    man.setdefault("totais", {})["monocraticas"] = totais["monocraticas"]
    man["totais"]["acordaos"] = totais["acordaos"]
    man["contagem_por_ano"] = contagem
    man.setdefault("incorporacoes", []).append({
        "em": datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat(),
        "novos": novos_por_tipo,
        "totais": totais,
    })
    (J / "MANIFESTO.json").write_text(json.dumps(man, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return totais


def refaz_hashes(J):
    linhas = []
    for rel in [f"{t}/{f.name}" for t in ("monocraticas", "acordaos") for f in sorted((J / t).glob("*.json.gz"))] + ["indice.json.gz"]:
        h = hashlib.sha256((J / rel).read_bytes()).hexdigest()
        linhas.append(f"{h}  {rel}")
    (J / "SHA256SUMS").write_text("\n".join(linhas) + "\n", encoding="utf-8")


def conferir(J):
    idx = le_gz(J / "indice.json.gz")
    vistos, erros, total, pares_repetidos = {}, [], 0, 0
    for tipo in ("acordaos", "monocraticas"):
        for f in sorted((J / tipo).glob("*.json.gz")):
            d = le_gz(f)
            regs = d["registros"]
            total += len(regs)
            if d["total"] != len(regs):
                erros.append(f"{f.name}: total={d['total']} mas {len(regs)} registros")
            ids = [r["id"] for r in regs]
            if len(set(ids)) != len(ids):
                erros.append(f"{f.name}: ids repetidos")
            for r in regs:
                k = (PREFIXO[tipo],) + chave(r)
                if k in vistos:
                    pares_repetidos += 1
                vistos[k] = 1
                it = r.get("inteiro_teor")
                if it and r.get("sha256_inteiro_teor") and hashlib.sha256(it.encode()).hexdigest() != r["sha256_inteiro_teor"]:
                    erros.append(f"{f.name}: sha256 do inteiro teor não bate em {r['id']}")
    if len(idx) != total:
        erros.append(f"indice com {len(idx)} entradas, arquivos com {total} registros")
    print(f"{total} registros; {len(idx)} entradas no índice; {len(erros)} problema(s); "
          f"{pares_repetidos} par(es) processo+data repetidos (pré-existentes na série)")
    for e in erros[:40]:
        print("  -", e)
    return 1 if erros else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entradas", nargs="*")
    ap.add_argument("--raiz", default=".")
    ap.add_argument("--conferir", action="store_true")
    a = ap.parse_args()
    J = Path(a.raiz) / "precedentes/jurisprudencia"
    if a.conferir:
        sys.exit(conferir(J))
    if not a.entradas:
        ap.error("informe ao menos um arquivo de entrada ou --conferir")

    novos = []
    for e in a.entradas:
        novos += json.load(open(e, encoding="utf-8"))
    por_tipo = {}
    for r in novos:
        por_tipo.setdefault(tipo_de(r), []).append(r)

    idx = le_gz(J / "indice.json.gz")
    existentes = {(x["t"], x["n"], x["d"]) for x in idx}
    resumo, acrescentados = {}, 0

    for tipo, regs in por_tipo.items():
        pref = PREFIXO[tipo]
        vistos = set()
        aceitos = []
        for r in regs:
            n, d = chave(r)
            if not n or not d:
                print(f"  ignorado (sem processo ou data): {n} {d}")
                continue
            if (pref, n, d) in existentes or (n, d) in vistos:
                continue
            vistos.add((n, d))
            aceitos.append(r)
        por_ano = {}
        for r in aceitos:
            por_ano.setdefault((chave(r)[1])[:4], []).append(r)
        for ano, lote in sorted(por_ano.items()):
            f = J / tipo / f"{ano}.json.gz"
            if f.exists():
                d = le_gz(f)
            else:
                d = {"tipo": tipo, "ano": ano, "total": 0, "registros": []}
            seq = max((r.get("seq") or 0) for r in d["registros"]) if d["registros"] else 0
            lote = sorted(lote, key=lambda r: (chave(r)[1], chave(r)[0]))
            for r in lote:
                seq += 1
                r = dict(r)
                r["seq"] = seq
                r["id"] = f"{pref}{seq:05d}"
                ordenado = {"id": r["id"], "seq": r["seq"], **{k: v for k, v in r.items() if k not in ("id", "seq")}}
                d["registros"].append(ordenado)
                idx.append(entrada_indice(ordenado, r["id"], tipo, ano))
            d["total"] = len(d["registros"])
            grava_gz(f, d)
            print(f"  {tipo}/{ano}: +{len(lote)} -> {d['total']}")
            acrescentados += len(lote)
        resumo[tipo] = len(aceitos)

    if not acrescentados:
        print("nada novo; nenhum arquivo alterado")
        return
    grava_gz(J / "indice.json.gz", idx)
    totais = refaz_manifesto(J, resumo)
    refaz_hashes(J)
    print(f"{acrescentados} novos; totais: {totais}")


if __name__ == "__main__":
    main()
