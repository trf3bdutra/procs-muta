#!/usr/bin/env python3
"""Gera uma cópia autônoma da página Competências da equipe (caput/competencias/index.html) com os dados embutidos,
para abrir fora do Caput (artefato, arquivo enviado). No Caput a página lê e grava ao vivo pelo motor; esta cópia só lê.

Uso: python3 scripts/equipe/pagina_competencias.py SAIDA.html"""
import json, sys, pathlib
R = pathlib.Path(__file__).resolve().parents[2]
ler = lambda p: json.loads((R / p).read_text(encoding='utf-8'))
eq = ler('apoio/equipe.json')['registros']
dg = ler('apoio/regras/designacao.json')['criterios']
dados = {'equipe': [{k: m.get(k) for k in ['nome', 'cargo', 'papel', 'minuta', 'correcao', 'auto', 'exp', 'pref', 'nao', 'aliases', 'nota', 'matriz']} for m in eq if m['nome'] != 'CM'],
         'matriz': ler('apoio/equipe-matriz.json'), 'desig': {'ordem': dg['ordem'], 'rows': dg['rows']}, 'prod': ler('apoio/regras/produtividade.json')}
pag = (R / 'caput/competencias/index.html').read_text(encoding='utf-8')
alvo = '<script id="dados" type="application/json">{}</script>'
assert pag.count(alvo) == 1, 'marcador dos dados não encontrado'
pag = pag.replace(alvo, '<script id="dados" type="application/json">' + json.dumps(dados, ensure_ascii=False).replace('</', '<\\/') + '</script>')
pathlib.Path(sys.argv[1]).write_text(pag, encoding='utf-8')
print(sys.argv[1], len(pag), 'bytes')
