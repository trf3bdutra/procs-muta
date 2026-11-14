#!/usr/bin/env python3
"""Liga o repertório do Vade Mecum CMT aos precedentes que o citam.

  python3 scripts/repertorio/vincular.py VADE_MECUM.html|repertorio.json [--saida apoio/usos-repertorio] [--html]

Com --html (entrada .html), grava também os usos automáticos dentro do próprio Vade Mecum
(bloco <script id="usos-auto">), somados aos usos lançados à mão na planilha.

Lê os itens do repertório (Temas, Súmulas, Jurisprudência, Normas) — do snapshot embutido no
Vade_Mecum_CMT.html ou de um JSON com as mesmas abas — e procura cada um nos campos
jurisprudenciaCitada, temas, dispositivosCitados e ementa de precedentes/precedentes.jsonl.

Gera:
  <saida>.json  {codigo: [processo, ...]} com os dados de cada uso
  <saida>.csv   no formato da aba "Usos no gabinete" da planilha (colar ou importar)
"""
import csv, json, re, sys, unicodedata
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
ABAS = ("Temas", "Súmulas", "Jurisprudência", "Normas")


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")


def num(s):
    return re.sub(r"\D", "", s or "").lstrip("0")


def ler_repertorio(caminho):
    texto = Path(caminho).read_text(encoding="utf-8")
    if caminho.endswith(".html"):
        m = re.search(r'<script type="application/json" id="snapshot">(.*?)</script>', texto, re.S)
        texto = m.group(1)
    return json.loads(texto)


# ---------- extração das citações de cada precedente ----------
TRIB = r"(STF|STJ|TFR|TNU|TRF-?\d)"


def tribunal_do_trecho(trecho, atual):
    m = re.match(r"\s*" + TRIB + r"\b", trecho)
    return m.group(1).replace("-", "") if m else atual


def lista_numeros(s):
    """'1.075, 499/STF e 733' → [('1075', None), ('499', 'STF'), ('733', None)]"""
    out = []
    for m in re.finditer(r"(\d{1,4}(?:\.\d{3})?)(?:\s*/\s*" + TRIB + r")?", s):
        out.append((num(m.group(1)), m.group(2).replace("-", "") if m.group(2) else None))
    return out


def temas_e_sumulas(texto):
    temas, sumulas = set(), set()
    trib = None
    for trecho in re.split(r";", texto or ""):
        trib = tribunal_do_trecho(trecho, trib)
        for m in re.finditer(r"Temas?\s+((?:\d{1,4}(?:\.\d{3})?(?:\s*/\s*" + TRIB + r")?(?:\s*,\s*|\s+e\s+)?)+)", trecho):
            fim = trecho[m.end():m.end() + 12]
            t_fim = re.match(r"\s*(?:do|da|/)\s*" + TRIB, fim)
            for n, t in lista_numeros(m.group(1)):
                temas.add((t or (t_fim.group(1).replace("-", "") if t_fim else trib), n))
        for m in re.finditer(r"S[úu]mulas?\s+(Vinculantes?\s+)?((?:\d{1,4}(?:\s*/\s*" + TRIB + r")?(?:\s*,\s*|\s+e\s+)?)+)", trecho, re.I):
            vinc = bool(m.group(1))
            fim = trecho[m.end():m.end() + 14]
            t_fim = re.match(r"\s*(?:do|da|/)\s*(?:extinto\s+)?" + TRIB, fim)
            for n, t in lista_numeros(m.group(2)):
                tt = t or (t_fim.group(1).replace("-", "") if t_fim else ("STF" if vinc else trib))
                sumulas.add((tt, "SV" if vinc else "S", n))
    return temas, sumulas


ALIAS_DIPLOMA = {"CPC": ["CPC", "Lei 13.105/2015"], "Constituição Federal": ["CF", "Constituição"],
                 "CTN": ["CTN", "Lei 5.172/1966"], "Código Civil": ["CC", "Código Civil", "Lei 10.406/2002"],
                 "Lei 6.830/1980 (LEF)": ["LEF", "Lei 6.830/1980"]}


def artigos(texto):
    """'CPC, artigos 85, §§ 2º a 6º e 11, 98, § 3º, e 535' → {'CPC': {'85','98','535'}}"""
    out = defaultdict(set)
    for trecho in re.split(r";", texto or ""):
        m = re.match(r"\s*([^,]+?),\s*(?:artigos?|arts?\.?)\s+(.*)", trecho, re.S)
        if not m:
            continue
        dipl = re.sub(r"\s*n[º°o]\.?\s*", " ", m.group(1)).strip()
        paragrafo, prev = False, ","
        for tok in re.findall(r"§+|\d+(?:\.\d{3})?(?:º|°)?(?:-[A-Z])?|,|\be\b|\ba\b|[IVXLC]+\b|\S", m.group(2)):
            if tok.startswith("§"):
                paragrafo = True
            elif re.match(r"\d", tok):
                if prev in (",", ",e", "artigo") or not paragrafo:
                    if not (paragrafo and prev in ("a", "e")):
                        out[dipl].add(re.sub(r"[º°]", "", tok).replace(".", ""))
                        paragrafo = False
            if tok == ",":
                prev = ","
            elif tok == "e" and prev == ",":
                prev = ",e"
            else:
                prev = tok if tok in ("a", "e") else "x"
    return out


# ---------- correspondência item × precedente ----------
def chave_jur(item):
    classe = sem_acento(item.get("Classe", "")).lower()
    numero = item.get("Número", "")
    if re.search(r"\d{7}-?\d{2}", numero):           # número CNJ do processo
        return ("cnj", num(numero))
    return ("classe", classe, num(numero))


def citacoes_jur(texto):
    """conjunto de chaves de julgados citados no texto"""
    t = sem_acento(texto or "")
    out = {("cnj", num(m)) for m in re.findall(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}", t)}
    for m in re.finditer(r"((?:(?:AgInt|AgRg|EDcl)\s+(?:no|nos|na)\s+)*(?:EDcl\s+)?(?:REsp|AREsp|EREsp|RE|ARE|ADI|ADC|ADPF|RMS|MS|HC|AI|Rcl|CC)(?:\s+(?:AgR|ED|MC)(?:-ED)?)?)\s+(\d{1,3}(?:\.\d{3})+|\d{3,7})", t):
        out.add(("classe", m.group(1).lower(), num(m.group(2))))
        out.add(("numero", num(m.group(2))))
    return out


def embutir(html, usos):
    texto = Path(html).read_text(encoding="utf-8")
    linhas = [{"Código do item": c, "Tipo de decisão": "Acórdão", "Processo": u["processo"],
               "Data": f"{u['dataJulgamento'][8:10]}/{u['dataJulgamento'][5:7]}/{u['dataJulgamento'][:4]}" if u["dataJulgamento"] else "",
               "Órgão julgador": u["orgao"], "Link": u["urlFonte"], "Observação": "localizado automaticamente nos precedentes"}
              for c, lst in sorted(usos.items()) for u in lst]
    bloco = '<script type="application/json" id="usos-auto">' + json.dumps(linhas, ensure_ascii=False).replace("</", "<\\/") + "</script>"
    texto = re.sub(r'<script type="application/json" id="usos-auto">.*?</script>\n?', "", texto, flags=re.S)
    texto = texto.replace('<script type="application/json" id="snapshot">', bloco + "\n" + '<script type="application/json" id="snapshot">', 1)
    if "USOS_AUTO" not in texto:
        texto = texto.replace("var AS=[],ASN={},USOS={};", "var AS=[],ASN={},USOS={};\nvar USOS_AUTO=(function(){try{return JSON.parse(document.getElementById('usos-auto').textContent);}catch(e){return [];}})();", 1)
        texto = texto.replace(
            "(USOS[k]=USOS[k]||[]).push(u);});\n}",
            "(USOS[k]=USOS[k]||[]).push(u);});\n"
            "  USOS_AUTO.forEach(function(u){var k=u['Código do item'];var L=(USOS[k]=USOS[k]||[]);"
            "if(!L.some(function(x){return (x['Processo']||'').trim()===u['Processo'];}))L.push(u);});\n}", 1)
        texto = texto.replace(
            "return '<ul class=\"ulist\">'+L.map(",
            "var mais=L.length>40?'<p class=\"meta\">… e mais '+(L.length-40)+' processos.</p>':'';L=L.slice(0,40);\n  return mais.replace(/^/,'')+'<ul class=\"ulist\">'+L.map(", 1)
    Path(html).write_text(texto, encoding="utf-8")
    print(f"Vade Mecum atualizado: {html} ({len(linhas)} usos automáticos embutidos)")


def main(args):
    if not args:
        raise SystemExit(__doc__)
    saida = RAIZ / (args[args.index("--saida") + 1] if "--saida" in args else "apoio/usos-repertorio")
    rep = ler_repertorio(args[0])
    precs = [json.loads(l) for l in (RAIZ / "precedentes/precedentes.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]

    usos = defaultdict(list)
    trib_por_tema = defaultdict(set)
    for it in rep.get("Temas", []):
        trib_por_tema[num(it["Tema"])].add(it["Tribunal"])
    tema_unico = defaultdict(bool, {n: len(t) == 1 for n, t in trib_por_tema.items()})   # tema sem tribunal no texto
    for p in precs:
        cit = " ; ".join(filter(None, [p.get("jurisprudenciaCitada"), p.get("temas")]))
        temas, sumulas = temas_e_sumulas(cit + " ; " + (p.get("ementa") or ""))
        juris = citacoes_jur(cit + " " + (p.get("ementa") or ""))
        arts = artigos(p.get("dispositivosCitados"))
        achados = []
        for it in rep.get("Temas", []):
            k = (it["Tribunal"], num(it["Tema"]))
            if k in temas or ((None, k[1]) in temas and tema_unico[k[1]]):
                achados.append(it["Código"])
        for it in rep.get("Súmulas", []):
            tipo = "SV" if "vinculante" in it.get("Tipo", "").lower() else "S"
            trib = "TFR" if "TFR" in it.get("Tipo", "") else it["Tribunal"]
            if (trib, tipo, num(it["Número"])) in sumulas:
                achados.append(it["Código"])
        for it in rep.get("Jurisprudência", []):
            k = chave_jur(it)
            if k in juris or (k[0] == "classe" and len(k[2]) >= 5 and ("numero", k[2]) in juris):
                achados.append(it["Código"])
        for it in rep.get("Normas", []):
            nomes = ALIAS_DIPLOMA.get(it["Diploma"], [it["Diploma"].split(" (")[0], it.get("Norma", "")])
            art = num(it.get("Dispositivo", "").split()[0]) if it.get("Dispositivo") else ""
            for dipl, nums in arts.items():
                if any(sem_acento(n).lower() and sem_acento(dipl).lower().startswith(sem_acento(n).lower()) for n in nomes if n):
                    if not art or art in {num(x) for x in nums}:
                        achados.append(it["Código"])
                        break
        for c in dict.fromkeys(achados):
            usos[c].append({"processo": p["processo"], "precedente": p["id"], "dataJulgamento": p.get("dataJulgamento", ""),
                            "especie": p.get("especie", ""), "orgao": p.get("orgao", ""), "urlFonte": p.get("urlFonte", "")})

    for v in usos.values():
        v.sort(key=lambda u: u["dataJulgamento"], reverse=True)
    saida.parent.mkdir(parents=True, exist_ok=True)
    doc = {"schema": "gabcmt.apoio.usos-repertorio", "geradoPor": "scripts/repertorio/vincular.py",
           "itens": len(usos), "usos": sum(len(v) for v in usos.values()), "registros": dict(sorted(usos.items()))}
    saida.with_suffix(".json").write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    with open(saida.with_suffix(".csv"), "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["Código do item", "Tipo de decisão", "Processo", "Data", "Órgão julgador", "Link", "Observação"])
        for c, lst in sorted(usos.items()):
            for u in lst:
                d = u["dataJulgamento"]
                w.writerow([c, "Acórdão", u["processo"], f"{d[8:10]}/{d[5:7]}/{d[:4]}" if d else "", u["orgao"],
                            u["urlFonte"], f"automático · {u['precedente']}"])
    if "--html" in args and args[0].endswith(".html"):
        embutir(args[0], usos)
    total = sum(len(rep.get(a, [])) for a in ABAS)
    print(f"{len(usos)} de {total} itens do repertório citados em precedentes; {doc['usos']} usos")
    for a in ABAS:
        cods = [it["Código"] for it in rep.get(a, [])]
        print(f"  {a}: {sum(1 for c in cods if c in usos)} de {len(cods)} itens com uso")


if __name__ == "__main__":
    main(sys.argv[1:])
