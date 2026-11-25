#!/usr/bin/env python3
"""Leitura do Diário de Justiça Eletrônico Nacional (DJEN, CNJ) para o TRF-3 — módulo comum.

API pública: https://comunicaapi.pje.jus.br/api/v1/comunicacao
  siglaTribunal=TRF3 · orgaoId=<id> · dataDisponibilizacaoInicio/Fim=AAAA-MM-DD · itensPorPagina=100 · pagina=N
  (cada consulta devolve no máximo 10.000 itens; por isso a leitura é dia a dia)

Órgãos (idOrgao no DJEN):
  101584  Gab. A da Turma Regional de Mato Grosso do Sul   — Des. Fed. Carlos Muta (série histórica do Relator)
  98372   Gab. B da Turma Regional de Mato Grosso do Sul   — Collegium
  102009  Gab. C da Turma Regional de Mato Grosso do Sul   — Collegium
  (o Relator também aparece como "Gab. 42 - DES. FED. CARLOS MUTA" e "Gab. 06 - DES. FED. CARLOS MUTA")

A mesma decisão vem uma vez por destinatário intimado: tira-se a repetição pelo processo, tipo e tamanho do texto.
A data da assinatura (= data do julgamento ou da decisão) está no número do documento do link do PJe (x=AAMMDD…);
conferida contra a série do Relator em 398 de 398 casos (25/11/2026).

Este módulo só usa a biblioteca padrão; a rede precisa alcançar comunicaapi.pje.jus.br (o computador do gabinete
alcança; o ambiente em nuvem do Claude, não).
"""
import json, re, time, urllib.parse, urllib.request
from datetime import date, timedelta

API = "https://comunicaapi.pje.jus.br/api/v1/comunicacao"
ORG_RELATOR = [101584]
ORG_COLLEGIUM = {98372: "Gab. B da Turma Regional de Mato Grosso do Sul", 102009: "Gab. C da Turma Regional de Mato Grosso do Sul"}
TIPOS = ("Acórdão",)  # mais as "Decisão Monocrática Terminativa …"

PAPEIS = (r"APELANTE|APELADO|AGRAVANTE|AGRAVADO|EMBARGANTE|EMBARGADO|IMPETRANTE|IMPETRADO|PARTE AUTORA|PARTE R[EÉ]|"
          r"JUIZO RECORRENTE|INTERESSADO|TERCEIRO INTERESSADO|EXEQUENTE|EXECUTADO|RECORRENTE|RECORRIDO|REQUERENTE|"
          r"REQUERIDO|AUTOR|R[EÉ]U|SUCEDIDO|SUCESSOR|REPRESENTANTE|ASSISTENTE|SUSCITANTE|SUSCITADO|PACIENTE|CUSTOS LEGIS")
ROTULO = re.compile(r"((?:ADVOGADO|PROCURADOR) do\(a\) (?:%s)|%s)\s*:\s*" % (PAPEIS, PAPEIS))
FIM_CAB = re.compile(r"\s(RELAT[ÓO]RIO|DECIS[ÃA]O|VOTO|EMENTA|D E C I S [ÃA] O)\s")


def norm(t):
    return re.sub(r"\s+", " ", t or "").strip()


RX_EMENTA = re.compile(r"\s(?:E\s?M\s?E\s?N\s?T\s?A|Ementa):?\s")   # "EMENTA", "E M E N T A", "Ementa" ou "Ementa:" (documentos antigos)
RX_ACORDAO = re.compile(r"\s(?:A\s?C\s?[ÓO]\s?R\s?D\s?[ÃA]\s?O)\s")
RX_RELATOR = re.compile(r"(?:Desembargador(?:a)? Federal|Ju[ií]za? Federal Convocad[oa]|Ju[ií]za? Federal)\s+"
                        r"([A-ZÀ-Ú][A-Za-zÀ-ú .'-]+?)\s*\((?:Relator|Relatora)\)")


def ultimo(rx, t, ate=None):
    u = None
    for m in rx.finditer(t):
        if ate is not None and m.start() >= ate:
            break
        u = m
    return (u.start(), u.end()) if u else (-1, -1)


def ementa_e_acordao(t):
    """Ementa (do último título EMENTA antes do último ACÓRDÃO até ele) e o parágrafo do acórdão."""
    b0, b1 = ultimo(RX_ACORDAO, t)
    a0, a1 = ultimo(RX_EMENTA, t, b0 if b0 >= 0 else None)
    em = t[a1: b0 if b0 > a0 else None].strip() if a0 >= 0 else ""
    res = t[b1: b1 + 1600].strip() if b0 >= 0 else ""
    return em, res


def relator_corpo(t):
    """Relator pelo texto ("Desembargador Federal NOME (Relator)"), quando o cabeçalho só traz o gabinete."""
    m = RX_RELATOR.search(t or "")
    return m.group(1).strip() if m else ""


def interessa(tipo):
    return tipo == "Acórdão" or bool(re.match(r"Decis[ãa]o Monocr[áa]tica", tipo or ""))


def data_link(link):
    m = re.search(r"x=(\d{6})", link or "")
    return f"{m.group(1)[4:6]}/{m.group(1)[2:4]}/20{m.group(1)[:2]}" if m else None


def relator(texto):
    m = re.search(r"RELATOR(?:\(A\))?:\s*(.+?)\s+(?:%s|ADVOGADO|PROCURADOR)\b" % PAPEIS, texto)
    return m.group(1).strip() if m else ""


def partes(texto):
    i = re.search(r"RELATOR(?:\(A\))?:", texto)
    if not i:
        return []
    cab = texto[i.end():]
    f = FIM_CAB.search(cab)
    cab = cab[:f.start()] if f else cab[:3000]
    pedacos = ROTULO.split(cab)
    return [{"polo": pedacos[k].strip(), "nome": pedacos[k + 1].strip(" ,;")}
            for k in range(1, len(pedacos) - 1, 2) if pedacos[k + 1].strip(" ,;")]


def compacta(item, texto_integral=False):
    """Item do DJEN → registro compacto (o mesmo formato que a coleta pelo navegador produz)."""
    t = norm(item.get("texto"))
    x = {"g": item.get("idOrgao"), "o": item.get("nomeOrgao"), "p": item.get("numeroprocessocommascara"),
         "t": item.get("tipoDocumento"), "d": item.get("data_disponibilizacao"), "c": item.get("nomeClasse"),
         "cc": item.get("codigoClasse"), "l": item.get("link"), "rel": relator(t), "n": len(t)}
    i = re.search(r"\s(RELAT[ÓO]RIO|DECIS[ÃA]O)\s", t)
    x["cab"] = t[: min(i.start(), 3000) if i else 1500]
    x["rl2"] = relator_corpo(t)
    if x["t"] == "Acórdão":
        x["em"], x["res"] = ementa_e_acordao(t)
    else:
        a, v = t.rfind("Ante o exposto"), t.find("Vistos")
        x["disp"] = t[a: a + 1500] if a >= 0 else ""
        x["abre"] = t[v: v + 1500] if v >= 0 else t[:1500]
    if texto_integral:
        x["x"] = t
    return x


def _get(params, tentativas=3):
    url = API + "?" + urllib.parse.urlencode(params)
    for k in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"Accept": "application/json"}), timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:
            if k == tentativas - 1:
                raise
            time.sleep(3 * (k + 1))


def ler(org, inicio, fim, texto_integral=False, pausa=1.0, log=print):
    """Lê o DJEN dia a dia para um órgão, de inicio a fim (date), e devolve os registros compactos sem repetição."""
    vistos, out, erros = set(), [], []
    d = inicio
    while d <= fim:
        dia = d.isoformat()
        for pg in range(1, 101):
            try:
                j = _get({"siglaTribunal": "TRF3", "orgaoId": org, "dataDisponibilizacaoInicio": dia,
                          "dataDisponibilizacaoFim": dia, "itensPorPagina": 100, "pagina": pg})
            except Exception as e:
                erros.append(f"{org}@{dia}#{pg}: {e}")
                break
            itens = j.get("items") or []
            for it in itens:
                if not interessa(it.get("tipoDocumento")):
                    continue
                k = (it.get("numero_processo"), it.get("tipoDocumento"), len(norm(it.get("texto"))))
                if k in vistos:
                    continue
                vistos.add(k)
                out.append(compacta(it, texto_integral))
            time.sleep(pausa)
            if len(itens) < 100:
                break
        d += timedelta(days=1)
    log(f"DJEN órgão {org}: {inicio} a {fim} · {len(out)} documentos · {len(erros)} erros")
    return out, erros
