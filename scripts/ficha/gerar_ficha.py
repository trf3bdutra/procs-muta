#!/usr/bin/env python3
"""Gera padrao/ficha.json (ficha única padrão de processo) a partir de padrao/integracoes-ficha.md.

A ficha é a mesma do CMT-monitor: abas, grupos e campos, cada um com a chave e a seção onde fica
(fonte = só leitura; operacional · triagem/producao/pauta/origem = editável). Os apps leem este arquivo.
Uso: python3 scripts/ficha/gerar_ficha.py
"""
import json, re, pathlib
R = pathlib.Path(__file__).resolve().parents[2]
md = (R / 'padrao/integracoes-ficha.md').read_text(encoding='utf-8')
corpo = md.split('## Campos por aba', 1)[1].split('### Fora das abas', 1)[0]
abas, aba, grupo = [], None, None
TIPOS = {'lista': 'lista', 'texto': 'texto', 'texto longo': 'texto-longo', 'data': 'data', 'número': 'numero', 'Sim/—': 'simnao', 'sim/não': 'simnao', 'marcador': 'simnao'}
for l in corpo.splitlines():
    if l.startswith('### '):
        aba = {'aba': l[4:].strip(), 'grupos': []}; abas.append(aba); continue
    m = re.match(r'\*\*(.+)\*\*$', l.strip())
    if m:
        grupo = {'grupo': m.group(1), 'campos': []}; aba['grupos'].append(grupo); continue
    if not l.startswith('| ') or l.startswith('| Campo') or l.startswith('|---'):
        continue
    c = [x.strip() for x in l.strip().strip('|').split('|')]
    if len(c) < 6:
        continue
    rot, chave, tipo, onde, _, regra = c[:6]
    chave = chave.strip('`')
    mo = re.match(r'operacional · `(\w+)`', onde)
    secao = mo.group(1) if mo else None
    ft = re.match(r'fonte · `([^`]+)`', onde)
    calc = 'calculado' in tipo
    leitura = 'só leitura' in tipo
    t = 'texto'
    for k, v in TIPOS.items():
        if tipo.startswith(k):
            t = v
    campo = {'rotulo': rot, 'chave': chave, 'tipo': t}
    if secao:
        campo['secao'] = secao
    if ft:
        campo['fonte'] = [x.strip() for x in ft.group(1).split('·')]
    if leitura or not secao:
        campo['editavel'] = False
    elif calc:
        campo['calculado'] = True
    op = regra.split(';')[0]
    if t == 'lista' and ' / ' in op:
        campo['opcoes'] = [x.strip() for x in op.split(' / ') if x.strip()]
    if regra and 'opcoes' not in campo:
        campo['regra'] = regra
    elif ';' in regra:
        campo['regra'] = regra.split(';', 1)[1].strip()
    grupo['campos'].append(campo)
# campos do operacional que a Ficha usa e o mapa não lista: entram no grupo da seção correspondente
EXTRAS = {('Triagem', 'Urgência'): [('Nível da urgência', 'Urgência - Nível', 'texto'), ('Apreciação da urgência', 'Urgência - Apreciação', 'texto'), ('Data da urgência', 'Urgência - Data', 'data')],
          ('Triagem', 'Admissibilidade e regularidade'): [('Intimação / publicação', 'Tempest - Publicação', 'data'), ('Protocolo do recurso', 'Tempest - Protocolo', 'data'),
              ('Prazo legal (dias úteis)', 'Tempest - Prazo legal', 'numero'), ('Prazo em dobro', 'Tempest - Dobro', 'simnao'), ('Suspensões de prazo', 'Tempest - Suspensões', 'texto'),
              ('AJG', 'AJG', 'texto'), ('Impedimento / suspeição', 'Impedimento / Suspeição', 'texto')],
          ('Triagem', 'Matéria e gestão'): [('Tipo de julgamento', 'Tipo de Julgamento', 'texto'), ('Hipóteses de monocrática', 'Hipóteses Monocrática', 'texto'),
              ('Síntese processual', 'Síntese Processual', 'texto-longo'), ('Especificidades', 'Especificidades', 'texto-longo')],
          ('Produção', 'Elaboração e revisão'): [('Destino', 'Destino', 'texto'), ('Data da revisão', 'Data da Revisão', 'data'), ('Data da liberação', 'Data da Liberação', 'data'), ('Revisão · IDs', 'Rev - IDs', 'texto')]}
SEC = {'Triagem': 'triagem', 'Produção': 'producao', 'Pauta': 'pauta', 'Processo': 'origem'}
for a in abas:
    for g in a['grupos']:
        tem = {c['chave'] for c in g['campos']}
        for rot, ch, t in EXTRAS.get((a['aba'], g['grupo']), []):
            if ch not in tem:
                g['campos'].append({'rotulo': rot, 'chave': ch, 'tipo': t, 'secao': SEC[a['aba']]})
# Produção em duas versões, conforme o destino do processo: sessão (colegiado) ou decisão monocrática
def _prod(a):
    C = {c['chave']: c for g in a['grupos'] for c in g['campos']}
    def g(nome, chaves, destino=None, rot=None):
        out = {'grupo': nome, 'campos': []}
        for k in chaves:
            if k in C:
                c = dict(C[k])
                if rot and k in rot: c['rotulo'] = rot[k]
                out['campos'].append(c)
        if destino: out['destino'] = destino
        return out
    a['seletor'] = {'secao': 'producao', 'chave': 'Destino', 'rotulo': 'Destino do julgamento',
                    'opcoes': [{'valor': '', 'rotulo': 'Sessão (colegiado)'}, {'valor': 'Monocrática', 'rotulo': 'Decisão monocrática'}],
                    'regra': 'vazio = sessão: Pautado, Minutado, Corrigido, Liberado, Sessão; Monocrática: Minutado, Corrigido, Assinado, Publicado'}
    a['grupos'] = [
        g('Designação e minuta', ['SERVIDOR', 'MINUTADO', 'Refinado']),
        g('Revisão', ['CORRETOR', 'CORRIGIDO', 'Data da Revisão', 'Rev - Atenção', 'Rev - Ementa', 'Rev - Subementa', 'Rev - Mérito', 'Rev - Honorários', 'Rev - IDs', 'Rev - Nota de atenção']),
        g('Relatório e voto', ['Relatório Padronizado', 'Adequação Ementa', 'Formatação Subementa', 'Voto - Resultado', 'Voto - Honorários', 'Tópico-síntese', 'Mídias Necessárias', 'Voto - Descrição'], 'sessao'),
        g('Liberação para a sessão', ['LIBERADO', 'Data da Liberação'], 'sessao'),
        g('Decisão monocrática', ['Voto - Resultado', 'Voto - Honorários', 'Voto - Descrição', 'Assinado', 'Data da Assinatura', 'Decisão - ID', 'Publicado'], 'monocratica',
          {'Voto - Resultado': 'Resultado da decisão', 'Voto - Honorários': 'Honorários na decisão', 'Voto - Descrição': 'Fundamentos da decisão'})]
for a in abas:
    if a['aba'] == 'Produção':
        _prod(a)
ordem = ['Processo', 'Triagem', 'Produção', 'Pauta']
abas.sort(key=lambda a: ordem.index(a['aba']) if a['aba'] in ordem else 99)
out = {'schema': 'gabcmt.padrao.ficha', 'versao': '1.0.0', 'origem': 'padrao/integracoes-ficha.md (Ficha do CMT-monitor), por scripts/ficha/gerar_ficha.py',
       'descricao': 'Ficha única padrão de processo, usada pelo CMT-monitor e pela Pauta da equipe. Campos com "secao" ficam em acervo/operacional.json (registro do processo, seção indicada) e são editáveis, salvo "editavel": false; campos com "fonte" vêm de acervo/fonte.json e são só leitura.',
       'abas': abas}
(R / 'padrao/ficha.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
n = sum(len(g['campos']) for a in abas for g in a['grupos'])
ed = sum(1 for a in abas for g in a['grupos'] for c in g['campos'] if c.get('secao') and c.get('editavel', True))
print(f'padrao/ficha.json: {len(abas)} abas, {n} campos, {ed} editáveis')
