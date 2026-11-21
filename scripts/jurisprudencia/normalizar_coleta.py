#!/usr/bin/env python3
"""Converte a coleta bruta da Base de Jurisprudência do TRF-3 no formato da série histórica.

Entrada: JSON (lista) com um objeto por julgado, como extraído da lista de resultados de
`web.trf3.jus.br/jurisprudencia` (ver precedentes/jurisprudencia/README.md, "Coleta semanal"):

  numero_processo, infos (spans de .informacoes-basicas), relator_span, pub_dado,
  ementa (texto de .info-ementa), documento (texto de .info-acordao),
  link_integra_externa, link_pje, link_inteiro_teor, link_pdf

Saída: JSON (lista) de registros no esquema de acordaos/ ou monocraticas/, pronto para
`incorporar.py`. Campos que a base não traz ficam ausentes (null).

Uso:  python3 scripts/jurisprudencia/normalizar_coleta.py bruto.json --tipo acordaos -o novos.json
"""
import argparse, hashlib, json, re

BASE = "https://web.trf3.jus.br"

POLO = re.compile(r'^([A-ZÁÂÃÉÊÍÓÔÕÚÇ][A-ZÁÂÃÉÊÍÓÔÕÚÇ \.\-/]*(?:\(?s?\)?)?(?:\s+do\(a\)\s+[A-ZÁÂÃÉÊÍÓÔÕÚÇ ]+)?)\s*:\s*(.+)$')
CORTE_CAB = re.compile(r'^(RELAT[ÓO]RIO|EMENTA|VOTO|DECIS[ÃA]O|DESPACHO|AC[ÓO]RD[ÃA]O)\b', re.I)
ENDERECO = re.compile(r'^(PODER|TRIBUNAL|AV|AVENIDA|RUA|PRA[ÇC]A|CEP|HTTPS?)\b', re.I)


def absoluto(link):
    if not link:
        return None
    return link if link.startswith("http") else BASE + link


def cabecalho(doc):
    out = []
    for ln in (doc or "").split("\n"):
        s = ln.strip()
        if CORTE_CAB.match(s):
            break
        out.append(s)
    return out


def partes(doc):
    res = []
    for s in cabecalho(doc):
        if not s or ":" not in s:
            continue
        m = POLO.match(s)
        if not m:
            continue
        polo = m.group(1).strip().rstrip(":").strip()
        if polo.upper().startswith("RELATOR") or ENDERECO.match(polo):
            continue
        nome = m.group(2).strip()
        if nome:
            res.append({"polo": polo, "nome": nome})
    return res


def relator_no_documento(doc):
    for s in cabecalho(doc):
        if re.match(r"^RELATOR", s, re.I):
            return s
    return None


def resultado_colegiado(doc):
    i = (doc or "").rfind("Vistos e relatados")
    if i < 0:
        return None
    resto = doc[i:]
    corte = re.search(r"\n\s*\n", resto)
    return re.sub(r"\s+", " ", resto[: corte.start()] if corte else resto).strip()


def orgao_do_cabecalho(doc):
    ls = [l.strip() for l in (doc or "").split("\n")[:8]]
    for i, l in enumerate(ls):
        if l.startswith("Tribunal Regional Federal da 3"):
            for c in ls[i + 1 : i + 3]:
                if not c or ENDERECO.match(c) or "CEP:" in c:
                    continue
                return c
            if " - " in l:
                return l.split(" - ", 1)[1].strip()
    return None


def corpo_ementa(ementa):
    if not ementa:
        return None
    m = re.search(r"\n\s*Ementa\s*\n", ementa)
    return ementa[m.end():].strip() if m else ementa.strip()


def corpo_decisao(doc):
    m = re.search(r"\n\s*(DECIS[ÃA]O|DESPACHO)\s*\n", doc or "")
    return (doc[m.end():].strip() if m else (doc or "").strip()) or None


def data_de(infos, rotulos):
    for s in infos:
        if any(s.startswith(r) for r in rotulos):
            m = re.search(r"(\d{2})/(\d{2})/(\d{4})", s)
            if m:
                return f"{m.group(1)}/{m.group(2)}/{m.group(3)}", f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return None, None


def publicacao(infos):
    for s in infos:
        m = re.match(r"(.+?)\s+DATA:\s*(\d{2}/\d{2}/\d{4})", s)
        if m:
            return m.group(1).strip(), m.group(2)
    return None, None


def classe_de(infos):
    for s in infos:
        if " - " in s and not s.startswith(("Julgamento", "Decisão", "Desembargador")) and "DATA:" not in s:
            sig, nome = s.split(" - ", 1)
            return sig.strip(), nome.strip()
    return None, None


def sha(t):
    return hashlib.sha256(t.encode("utf-8")).hexdigest() if t else None


def acordao(b):
    infos = b.get("infos") or []
    doc = b.get("documento")
    sig, cl = classe_de(infos)
    dj, dji = data_de(infos, ("Julgamento",))
    veic, dp = publicacao(infos)
    rel = b.get("relator_span")
    return {
        "numero_processo": b.get("numero_processo"),
        "classe_sigla": sig,
        "classe": cl,
        "numero_classe_legado": None,
        "orgao_julgador": next((s for s in infos if s and s != f"{sig} - {cl}" and "DATA:" not in s
                                and not s.startswith(("Julgamento", "Desembargador", "Juiz"))), None),
        "relator": rel,
        "relator_no_documento": relator_no_documento(doc),
        "data_julgamento": dj,
        "data_julgamento_iso": dji,
        "publicacao_veiculo": veic,
        "data_publicacao": dp,
        "publicacao_complemento": None,
        "partes": partes(doc),
        "resultado_colegiado": resultado_colegiado(doc),
        "ementa": b.get("ementa"),
        "inteiro_teor": doc,
        "possui_inteiro_teor": bool(doc),
        "caracteres_inteiro_teor": len(doc) if doc else 0,
        "link_pje": absoluto(b.get("link_pje")),
        "link_integra_externa": b.get("link_integra_externa"),
        "link_impressao": absoluto(b.get("link_inteiro_teor")),
        "link_pdf": absoluto(b.get("link_pdf")),
        "atuacao_muta": "relator" if rel and "MUTA" in rel.upper() else "relator para o acórdão (relator originário diverso)",
        "sha256_inteiro_teor": sha(doc),
        "sha256_ementa": sha(b.get("ementa")),
        "conteudo_texto": "integral" if doc and b.get("ementa") else ("apenas_acordao" if doc else "apenas_ementa"),
    }


def monocratica(b):
    infos = b.get("infos") or []
    doc = b.get("documento")
    sig, cl = classe_de(infos)
    dd, ddi = data_de(infos, ("Decisão", "Julgamento"))
    veic, dp = publicacao(infos)
    return {
        "numero_processo": b.get("numero_processo"),
        "classe_sigla": sig,
        "classe": cl,
        "relator": b.get("relator_span"),
        "orgao_julgador": orgao_do_cabecalho(doc),
        "orgao_julgador_fonte": "cabeçalho do documento",
        "data_decisao": dd,
        "data_decisao_iso": ddi,
        "publicacao_veiculo": veic,
        "data_publicacao": dp,
        "dispositivo": None,
        "link_pje": absoluto(b.get("link_pje")),
        "link_impressao": absoluto(b.get("link_inteiro_teor")),
        "caracteres": len(doc) if doc else 0,
        "inteiro_teor": doc,
        "sha256_inteiro_teor": sha(doc),
        "conteudo_texto": "integral" if doc else None,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada")
    ap.add_argument("--tipo", required=True, choices=("acordaos", "monocraticas"))
    ap.add_argument("-o", "--saida", required=True)
    a = ap.parse_args()
    bruto = json.load(open(a.entrada, encoding="utf-8"))
    f = acordao if a.tipo == "acordaos" else monocratica
    regs = [f(b) for b in bruto]
    faltando = [r["numero_processo"] for r in regs
                if not r.get("numero_processo") or not (r.get("data_julgamento_iso") or r.get("data_decisao_iso"))]
    json.dump(regs, open(a.saida, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{len(regs)} registros -> {a.saida}" + (f"; {len(faltando)} sem chave: {faltando}" if faltando else ""))


if __name__ == "__main__":
    main()
