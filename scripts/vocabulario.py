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


def _resolve(alvo, ctx):
    ctx = ctx or {}
    obs = re.sub(r'\(proc\. público/DPU\)|DPU/ente público', '', ctx.get('obs') or '', flags=re.I)
    dpu = _sim(ctx.get('dpu')) or bool(re.search(r'DPU|Defensoria', obs, re.I))
    ajg = _sim(ctx.get('ajg'))
    if alvo == '@dispensado':
        return 'Assistência da DPU' if dpu else 'Justiça gratuita' if ajg else 'Isento (ente público/MP)'
    if alvo == '@isento':
        return 'Assistência da DPU' if dpu else 'Isento (ente público/MP)'
    if alvo == '@dispensada':
        return 'Dispensada (DPU)' if dpu else 'Dispensada (procurador público)'
    return alvo


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
