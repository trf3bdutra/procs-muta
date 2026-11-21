"""Visão rápida dos pendentes: python3 visao.py <lote> <cnj...|--falt61>"""
import json, sys, re
src = open('/home/claude/work/situacao.py').read().split('SITFIX = {')[0]
sys.argv = [sys.argv[0], sys.argv[1]] + sys.argv[2:]
g = {}; exec(src, g)
L = g['lote']; alvo = sys.argv[2:]
if alvo == ['--falt61']:
    F = json.load(open('/home/claude/work/falt61.json')); tri = {it['processo'] for it in L['itens'] if it.get('prontuario_triagem')}
    alvo = [x for x in F if x not in tri]
for it in L['itens']:
    if not any(it['processo'].startswith(a) for a in alvo): continue
    s = g['situ'](it) or {}; s.pop('_movs', None)
    c = g['carregar'](it['processo']); movs = c[2][:2] if c else []
    print('#', it['processo'], '|', it.get('assunto'), '|', (it.get('partes') or '')[:110], '| docs', len(c[0]) if c else 0)
    for k in ('ultima_decisao', 'ultima_decisao_relevante', 'ultima_peca'):
        if s.get(k): print('   ', k[7:], ':', s[k][:230])
    if movs: print('    mov:', ' | '.join(movs))
