"""Tipo de caso dos precedentes do Compêndio, no mesmo padrão dos processos do gabinete.

Tipo de caso = "Matéria · tipo · aspecto distintivo" (padrao/tipo-caso.json). Substitui o antigo
"subassunto" do Ementário e do Repositório, para que o precedente e o processo usem a mesma
cadeia e a busca de precedentes compare a mesma matéria.

Precedentes (precedentes/precedentes.jsonl):
- catalogacao.materia: matéria canônica do assunto do catálogo (vocabulário comum); assunto sem
  matéria no vocabulário: o próprio assunto.
- catalogacao.tipoCasoSugerido: "Matéria · assunto (quando não repete a matéria) · aspecto
  distintivo"; sem aspecto, só "Matéria · assunto". O aspecto é a parte do rótulo do agrupamento (catalogacao.temaRotulo) que distingue
  o caso dentro do assunto: não repete o assunto, não é genérica e não aparece em quase todos os
  julgados do mesmo assunto. Recalculado a cada execução. O tipo de caso conferido vai em
  curadoria.tipoCaso, preenchido na curadoria (o antigo curadoria.subassunto é migrado para lá).
- curadoria.observacoes: recebe as notas sobre o registro (fonte, inteiro teor não juntado,
  registro bruto) que estavam em curadoria.especificidades.
- curadoria.especificidades: fica com o conteúdo de mérito; as etiquetas continuam em
  curadoria.especificidadesTags.

Repositório (apoio/vade-mecum.json, aba Jurisprudência): a coluna "Subassunto" passa a
"Tipo de caso", com a matéria canônica no 1º segmento.

Uso: python3 scripts/catalogo/tipo_caso.py
"""
import json, re, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / 'scripts'))
from tipocaso import nz, segs, repete, cadeia, materia_de, materia_do_assunto, materia_do_ramo, MATERIAS  # noqa: E402

ARQ = RAIZ / "precedentes/precedentes.jsonl"
VDM = RAIZ / "apoio/vade-mecum.json"
NOTA = re.compile(r"pesquisa de jurisprud[eê]ncia do TRF3|inteiro teor n[aã]o juntado|Registro bruto|Classe registrada na pesquisa", re.I)
GENERICOS = re.compile(r"^(rejei[cç][aã]o|acolhimento|provimento|desprovimento|embargos de declara[cç][aã]o|recurso|apela[cç][aã]o|agravo|omiss[aã]o|contradi[cç][aã]o|obscuridade)$", re.I)


def segmentos(rotulo):
    rot = re.sub(r"^Embargos de declaração\s*·\s*", "", rotulo or "").strip()
    return [s.strip(" .") for s in re.split(r"\.\s+", rot) if s.strip(" .")]


def aspecto(assunto, rotulo, df, total):
    """Parte do rótulo que distingue o caso dentro do assunto: não repete o assunto,
    não é genérica e não aparece em quase todos os julgados do mesmo assunto."""
    cand = [s for s in segmentos(rotulo) if not repete(s, assunto) and not GENERICOS.match(s)]
    if not cand:
        return ""
    lim = 0.6 * total if total >= 5 else total + 1
    bons = [s for s in cand if df.get(nz(s), 0) < lim] or cand
    s = max(bons, key=lambda x: df.get(nz(x), 0))
    return s[0].upper() + s[1:]


def materia_e_tipo(assunto, ramo=""):
    """Matéria canônica e o segmento "tipo" (o assunto, quando não repete a matéria). Assunto fora do
    vocabulário: matéria do ramo do direito, com o assunto como tipo; sem ramo, o próprio assunto."""
    a = (assunto or "").strip()
    m = materia_do_assunto(a) or materia_de(a)
    if not m:
        mr = materia_do_ramo(ramo)
        return (mr, a) if mr else (a, "")
    if nz(m) == nz(a) or nz(m) in nz(a) or repete(a, m):
        return m, ""
    return m, a


def precedentes():
    linhas = [json.loads(l) for l in ARQ.read_text(encoding="utf-8").splitlines() if l.strip()]
    n_tc = n_obs = n_mig = 0
    df, tot = {}, {}
    for r in linhas:
        a = r.get("assunto") or ""
        tot[a] = tot.get(a, 0) + 1
        for sg in set(nz(x) for x in segmentos((r.get("catalogacao") or {}).get("temaRotulo"))):
            df.setdefault(a, {})[sg] = df.setdefault(a, {}).get(sg, 0) + 1
    sem = {}
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
        cat.pop("subassuntoSugerido", None)
        m, tipo = materia_e_tipo(a, r.get("ramoDireito"))
        if a and m == a and m not in MATERIAS:
            sem[a] = sem.get(a, 0) + 1
        if m:
            cat["materia"] = m
        else:
            cat.pop("materia", None)
        asp = aspecto(a, cat.get("temaRotulo"), df.get(a, {}), tot.get(a, 0))
        tc = cadeia(m, tipo, asp)
        if tc:
            cat["tipoCasoSugerido"] = tc
            n_tc += 1
        else:
            cat.pop("tipoCasoSugerido", None)
        if "subassunto" in cur:
            v = cur.pop("subassunto")
            if v and not cur.get("tipoCaso"):
                cur["tipoCaso"] = v if materia_de(v) else cadeia(m, tipo, v)
                n_mig += 1
    ARQ.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in linhas), encoding="utf-8")
    print(f"{len(linhas)} precedentes · {n_tc} tipos de caso sugeridos · {n_mig} subassuntos curados migrados · {n_obs} observações movidas")
    if sem:
        print("assuntos sem matéria no vocabulário (padrao/tipo-caso.json):",
              "; ".join(f"{k} ({v})" for k, v in sorted(sem.items(), key=lambda x: -x[1])))


def repositorio():
    if not VDM.exists():
        return
    V = json.loads(VDM.read_text(encoding="utf-8"))
    J = V.get("Jurisprudência") or []
    n = 0
    for p in J:
        if "Subassunto" in p or "Tipo de caso" not in p:
            v = p.pop("Subassunto", "") or p.get("Tipo de caso", "")
            out = []
            for um in [x for x in re.split(r"\s*;\s*", v or "") if x.strip()]:
                S = segs(um)
                if S and nz(materia_de(S[0])) == nz(S[0]):
                    out.append(" · ".join(S))
                else:
                    m, tipo = materia_e_tipo(p.get("Assunto"))
                    out.append(cadeia(m, *S))
            tc = "; ".join(out)
            novo = {}
            for k, x in p.items():
                novo[k] = x
                if k == "Assunto":
                    novo["Tipo de caso"] = tc
            if "Tipo de caso" not in novo:
                novo["Tipo de caso"] = tc
            p.clear(); p.update(novo)
            n += 1
    VDM.write_text(json.dumps(V, ensure_ascii=False, separators=(",", ":")) + ("\n" if VDM.read_text(encoding="utf-8").endswith("\n") else ""), encoding="utf-8")
    print(f"Repositório: {n} julgados com o tipo de caso no lugar do subassunto")


if __name__ == "__main__":
    precedentes()
    repositorio()
