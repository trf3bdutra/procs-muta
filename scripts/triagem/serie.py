# -*- coding: utf-8 -*-
"""Monta ou atualiza um lote de série entre lotes de triagem (acervo/lotes/adp-serie-<id>.json).

O lote de série reúne, por assunto, processos já triados em outros lotes (mesmo registro, copiado), com grupos que
separam as variações (quem recorre, resultado da sentença, espécie). Os registros continuam também nos lotes de origem.

Uso: python3 scripts/triagem/serie.py <spec.json>
spec = {"id": "militar-reforma", "titulo": "...", "descricao": "...", "grupos": [{"id","rotulo","cor","resultado"}],
        "itens": [{"lote": "adp-ap-1s", "processo": "...", "grupo": "M1"}]}
"""
import datetime, json, sys
from pathlib import Path

R = Path(__file__).resolve().parents[2]
spec = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
HOJE = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=4)).date().isoformat()
lid = 'adp-serie-' + spec['id']
p = R / 'acervo/lotes' / (lid + '.json')
base = json.loads((R / 'acervo/lotes/adp-serie-perdimento.json').read_text(encoding='utf-8'))
L = json.loads(p.read_text(encoding='utf-8')) if p.exists() else {
    'schema': 'gabcmt.lote', 'versao': 1, 'tipo': 'triagem', 'tarefa': 'Analisar tipo de decisão a proferir', 'origem': 'Triagem · séries entre lotes',
    'id': lid, 'sessoes': [], 'filtro': {}, 'criado_por': 'Bruno', 'colunas': base.get('colunas', []), 'grupo_outros': {'rotulo': 'A triar', 'cor': '#9aa0a8'},
    'minutas': 'acervo/minutas/' + lid + '/<processo>.json', 'itens': []}
L['titulo'] = spec['titulo']; L['descricao'] = spec.get('descricao', L.get('descricao', ''))
L['grupos'] = spec['grupos']; L['atualizado_em'] = HOJE
fontes = {}
atual = {i['processo']: i for i in L['itens']}
for x in spec['itens']:
    if x['lote'] not in fontes:
        fontes[x['lote']] = {i['processo']: i for i in json.loads((R / 'acervo/lotes' / (x['lote'] + '.json')).read_text(encoding='utf-8'))['itens']}
    src = fontes[x['lote']].get(x['processo'])
    if not src:
        print('não achado:', x); continue
    it = json.loads(json.dumps(src))
    it['grupo'] = x['grupo']
    if isinstance(it.get('triagem'), dict): it['triagem']['grupo'] = x['grupo']
    it['observacao'] = (str(it.get('observacao') or '') + (' · ' if it.get('observacao') else '') + 'Também no lote ' + x['lote'])[:2000] if 'Também no lote' not in str(it.get('observacao') or '') else it.get('observacao')
    atual[x['processo']] = it
L['itens'] = list(atual.values())
for n, it in enumerate(L['itens'], 1): it['item'] = n
p.write_text(json.dumps(L, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(lid, len(L['itens']), 'processos', {g['id']: sum(1 for i in L['itens'] if i.get('grupo') == g['id']) for g in L['grupos']})
