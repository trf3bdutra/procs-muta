# -*- coding: utf-8 -*-
"""Vocabulário único do gabinete (padrao/vocabulario.json), o mesmo de padrao/vocabulario.js.

lista(campo)              opções na ordem oficial
norm(campo, valor, ctx)   converte valores antigos (ctx: {'ajg', 'dpu', 'obs'} resolve os genéricos antigos)
classe(campo, valor, ctx) 'regular', 'pendente', 'irregular' ou 'na' (as regras leem a classe, não o texto)
"""
import json, re, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
D = json.loads((RAIZ / 'padrao' / 'vocabulario.json').read_text(encoding='utf-8'))
CAMPOS = D['campos']


def N(s):
    s = unicodedata.normalize('NFD', '' if s is None else str(s))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', s.replace('–', '-').replace('—', '-')).strip().lower()


def _sim(x):
    return x is True or bool(re.match(r'^(sim|s|true|1|2)$', str('' if x is None else x).strip(), re.I))


def lista(c):
    f = CAMPOS.get(c)
    return [o[0] for o in f['opcoes']] if f else []


# Recorrente (1º nome do polo ativo do recurso). Isentos de custas na Justiça Federal: União, Estados, Municípios, DF,
# suas autarquias e fundações, e o MP (Lei 9.289/1996, artigo 4º, I e III). Conselhos de fiscalização profissional não
# são isentos (artigo 4º, parágrafo único) e a CEF paga preparo: com 'Dispensado' genérico, ficam 'Não verificado'.
_ISENTO = re.compile(r'^(UNIAO\b|FAZENDA NACIONAL|ESTADO D[EOA] |MUNICIPIO D[EOA] |DISTRITO FEDERAL|MINISTERIO PUBLICO|'
                     r'INSTITUTO NACIONAL|INSS\b|INSTITUTO BRASILEIRO D|IBAMA|ICMBIO|INSTITUTO CHICO MENDES|INCRA\b|DNIT\b|'
                     r'DEPARTAMENTO NACIONAL|FUNAI|FUNDACAO NACIONAL|FUNASA|AGENCIA NACIONAL|UNIVERSIDADE FEDERAL|'
                     r'FUNDACAO UNIVERSIDADE FEDERAL|INSTITUTO FEDERAL|BANCO CENTRAL|COMISSAO NACIONAL|'
                     r'(CHEFE|GERENTE|DELEGAD|SUPERINTENDENTE|REITOR|COMANDANTE|DIRETOR|PROCURADOR)\S*\b.*'
                     r'(INSS|FEDERAL|RECEITA|UNIAO|NACIONAL|POLICIA))')
_PAGA = re.compile(r'^(CAIXA ECONOMICA|CONSELHO (REGIONAL|FEDERAL)|CRE[A-Z]{0,2}\b|CRM\b|CRC\b|COREN\b|CRMV\b|ORDEM DOS ADVOGADOS)')


def _nome(x):
    return unicodedata.normalize('NFD', str(x or '')).encode('ascii', 'ignore').decode().upper().strip()


def recorrente(nome):
    """'isento' (ente público/MP), 'dpu' (a própria DPU), 'paga' (CEF, conselhos profissionais) ou ''."""
    n = _nome(nome)
    if not n:
        return ''
    if n.startswith('DEFENSORIA PUBLICA'):
        return 'dpu'
    if _ISENTO.match(n):
        return 'isento'
    return 'paga' if _PAGA.match(n) else ''


def _resolve(alvo, ctx):
    ctx = ctx or {}
    obs = re.sub(r'\(proc\. público/DPU\)|DPU/ente público|procurador público ou DPU', '', ctx.get('obs') or '', flags=re.I)
    dpu = _sim(ctx.get('dpu')) or bool(re.search(r'DPU|Defensoria', obs, re.I))
    ajg = _sim(ctx.get('ajg'))
    rc = recorrente(ctx.get('recorrente'))
    adv = bool(str(ctx.get('advogado') or '').strip())  # advogado particular do polo ativo: a DPU não o representa
    if alvo == '@dispensado':
        if rc == 'isento': return 'Isento (ente público/MP)'
        if rc == 'dpu': return 'Assistência da DPU'
        if rc == 'paga': return 'Não verificado'
        if dpu and not adv: return 'Assistência da DPU'
        return 'Justiça gratuita' if ajg else 'Assistência da DPU' if dpu else 'Isento (ente público/MP)'
    if alvo == '@isento':
        if rc == 'isento': return 'Isento (ente público/MP)'
        if rc == 'paga': return 'Não verificado'
        return 'Assistência da DPU' if dpu and not (adv and rc != 'dpu') else 'Isento (ente público/MP)'
    if alvo == '@dispensada':
        if rc == 'isento': return 'Dispensada (procurador público)'
        return 'Dispensada (DPU)' if dpu else 'Dispensada (procurador público)'
    return alvo


def coerente(c, v, ctx):
    """Corrige combinações impossíveis entre o valor e o recorrente (a DPU não assiste ente público, CEF nem conselho)."""
    rc = recorrente((ctx or {}).get('recorrente'))
    if c == 'preparo' and v == 'Assistência da DPU' and rc in ('isento', 'paga'):
        return 'Isento (ente público/MP)' if rc == 'isento' else 'Não verificado'
    if c == 'preparo' and v == 'Assistência da DPU' and not rc and str((ctx or {}).get('advogado') or '').strip() and _sim((ctx or {}).get('ajg')):
        return 'Justiça gratuita'
    if c == 'repres' and v == 'Dispensada (DPU)' and rc == 'isento':
        return 'Dispensada (procurador público)'
    return v


def norm(c, v, ctx=None):
    f = CAMPOS.get(c)
    s = ('' if v is None else str(v)).strip()
    if not f or not s:
        return s
    n = N(s)
    if c == 'repres' and n == 'regular' and ctx and re.match(r'^Dispensada', ctx.get('obs') or '', re.I):
        return _resolve('@dispensada', ctx)
    for o, _ in f['opcoes']:
        if o == s or N(o) == n:
            return o
    for o, alvo in f['sinonimos'].items():
        if o == s or N(o) == n:
            return _resolve(alvo, ctx)
    return s


def classe(c, v, ctx=None):
    f = CAMPOS.get(c)
    s = norm(c, v, ctx)
    for o, cl in (f['opcoes'] if f else []):
        if o == s:
            return cl
    return ''
