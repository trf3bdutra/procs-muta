"""Completa, na curadoria de cada precedente, os campos usados nos cards de processo:
subassunto, especificidades e observações.

- catalogacao.subassuntoSugerido: sugestão automática a partir do rótulo do agrupamento
  (catalogacao.temaRotulo): a parte que distingue o caso dentro do assunto (não repete o assunto,
  não é genérica e não aparece em quase todos os julgados do mesmo assunto). É recalculada a cada
  execução. O subassunto conferido vai em curadoria.subassunto, preenchido na curadoria.
- curadoria.observacoes: recebe as notas sobre o registro (fonte, inteiro teor não juntado,
  registro bruto) que estavam em curadoria.especificidades.
- curadoria.especificidades: fica com o conteúdo de mérito; as etiquetas continuam em
  curadoria.especificidadesTags.

Uso: python3 scripts/catalogo/subassunto.py
"""
import json, re, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
ARQ = RAIZ / "precedentes/precedentes.jsonl"
NOTA = re.compile(r"pesquisa de jurisprud[eê]ncia do TRF3|inteiro teor n[aã]o juntado|Registro bruto|Classe registrada na pesquisa", re.I)
VAZIAS = {"de", "da", "do", "das", "dos", "e", "a", "o", "em", "por", "para", "art", "lei", "cf", "88"}


def nz(s):
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


def toks(s):
    return {t for t in re.findall(r"[a-z0-9]+", nz(s)) if t not in VAZIAS and len(t) > 2}


def repete(seg, assunto):
    a, b = toks(seg), toks(assunto)
    if not a or not b:
        return False
    return len(a & b) / len(a) >= 0.5


GENERICOS = re.compile(r"^(rejei[cç][aã]o|acolhimento|provimento|desprovimento|embargos de declara[cç][aã]o|recurso|apela[cç][aã]o|agravo|omiss[aã]o|contradi[cç][aã]o|obscuridade)$", re.I)


def segmentos(rotulo):
    rot = re.sub(r"^Embargos de declaração\s*·\s*", "", rotulo or "").strip()
    return [s.strip(" .") for s in re.split(r"\.\s+", rot) if s.strip(" .")]


def sugerir(assunto, rotulo, df, total):
    """Escolhe a parte do rótulo que distingue o caso dentro do assunto: não repete o assunto,
    não é genérica e não aparece em quase todos os julgados do mesmo assunto."""
    cand = [s for s in segmentos(rotulo) if not repete(s, assunto) and not GENERICOS.match(s)]
    if not cand:
        return ""
    lim = 0.6 * total if total >= 5 else total + 1
    bons = [s for s in cand if df.get(nz(s), 0) < lim] or cand
    s = max(bons, key=lambda x: df.get(nz(x), 0))
    return s[0].upper() + s[1:]


def main():
    linhas = [json.loads(l) for l in ARQ.read_text(encoding="utf-8").splitlines() if l.strip()]
    n_sub = n_obs = 0
    df, tot = {}, {}
    for r in linhas:
        a = r.get("assunto") or ""
        tot[a] = tot.get(a, 0) + 1
        for sg in set(nz(x) for x in segmentos((r.get("catalogacao") or {}).get("temaRotulo"))):
            df.setdefault(a, {})[sg] = df.setdefault(a, {}).get(sg, 0) + 1
    for r in linhas:
        cur = r.setdefault("curadoria", {"status": "bruto"})
        esp = cur.get("especificidades") or ""
        if esp and NOTA.search(esp):
            obs = cur.get("observacoes") or ""
            cur["observacoes"] = (obs + " " + esp).strip() if esp not in obs else obs
            cur["especificidades"] = ""
            n_obs += 1
        a = r.get("assunto") or ""
        cat = r.setdefault("catalogacao", {})
        sg = sugerir(a, cat.get("temaRotulo"), df.get(a, {}), tot.get(a, 0))
        if sg:
            cat["subassuntoSugerido"] = sg
            n_sub += 1
        else:
            cat.pop("subassuntoSugerido", None)
    ARQ.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in linhas), encoding="utf-8")
    print(f"{len(linhas)} precedentes · {n_sub} subassuntos sugeridos · {n_obs} observações movidas")


if __name__ == "__main__":
    main()
