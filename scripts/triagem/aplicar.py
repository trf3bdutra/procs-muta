"""Aplica out/<blk>_lote.json ao lote do repositório com a mesma regra do Index (acao 'itens') e grava no formato do app."""
import json, sys
R = '/home/claude/procs-muta/'
blk, lid = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'adp-ai')
TXT = ['recurso', 'partes', 'exequente', 'executado', 'assunto', 'assunto_detalhado', 'tipo_caso', 'especificidades', 'resultado', 'modelo', 'observacao', 'peculiaridades', 'mpf', 'grupo', 'classe', 'tarefa', 'etiquetas', 'chegada', 'bloco']
OBJ = ['triagem', 'situacao_atual', 'extracao', 'teor', 'prontuario_triagem']
LST = ['variacoes', 'pendencias', 'pecas']
p = R + f'acervo/lotes/{lid}.json'
lote = json.load(open(p))
mapa = {i['processo']: i for i in lote['itens']}
n = 0
for x in json.load(open(f'/home/claude/work/out/{blk}_lote.json')):
    it = mapa[x['processo']]
    for k in TXT:
        if k in x: it[k] = None if x[k] is None else str(x[k])[:2000]
    for k in OBJ:
        if isinstance(x.get(k), dict): it[k] = {**(it.get(k) or {}), **x[k]}
    for k in LST:
        if isinstance(x.get(k), list): it[k] = x[k][:80]
    n += 1
lote['atualizado_em'] = '2026-11-21'
open(p, 'w').write(json.dumps(lote, ensure_ascii=False, indent=1) + '\n')
print('aplicados', n)
