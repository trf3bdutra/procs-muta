#!/usr/bin/env python3
"""Matriz de minutas por servidor: quem minutou o quê, por tipo de minuta, seção e assunto.

Fontes (cada processo e tipo conta uma vez; vale a fonte mais recente):
  acervo/sessoes/AAAA-MM-DD.json                pautas do Caput (servidor, classe, julgamento ED/AgInt/JR)
  acervo/planilhas/controle-de-pauta-*.json     Controle de Pauta aposentado (classe, seção, servidor)
  acervo/planilhas/pauta-2026-*-bimestre.json   pautas dos bimestres (apreciação 1º julg / ED / Retrat)
  acervo/operacional.json                       ficha: SERVIDOR e Destino (monocráticas)
Classe, seção e assunto que faltarem vêm de acervo/fonte.json. Nomes e apelidos resolvem pelo apoio/equipe.json.

Uso: python3 scripts/equipe/matriz_minutas.py            mostra a matriz
     python3 scripts/equipe/matriz_minutas.py --gravar   grava apoio/equipe-matriz.json"""
import json, re, sys, glob, pathlib, unicodedata, collections, datetime

R = pathlib.Path(__file__).resolve().parents[2]
ler = lambda p: json.loads((R / p).read_text(encoding='utf-8'))
dg = lambda s: re.sub(r'\D', '', str(s or ''))
N = lambda s: ''.join(c for c in unicodedata.normalize('NFD', str(s or '')) if unicodedata.category(c) != 'Mn').strip().upper()

TIPOS = ['Apelação', 'Apelação e remessa', 'Remessa necessária', 'Agravo de instrumento', 'Embargos de declaração',
         'Agravo interno', 'Juízo de retratação', 'Decisão monocrática', 'Outras classes']

EQ = ler('apoio/equipe.json')['registros']
IDX = {}
for m in EQ:
    for n in [m['nome']] + (m.get('aliases') or []): IDX[N(n)] = m['nome']
pessoa = lambda v: IDX.get(N(v), str(v or '').strip().title()) if str(v or '').strip() else ''

FONTE = {dg(r.get('processo')): r for r in ler('acervo/fonte.json')['registros']}

def tipo(classe, aprec=''):
    a, c = N(aprec), N(classe)
    if a in ('ED',) or a.startswith('EMBARGOS DE DECL'): return 'Embargos de declaração'
    if a in ('AGINT', 'AGRAVO INTERNO'): return 'Agravo interno'
    if a in ('JR', 'RETRAT') or a.startswith('JUIZO DE RETRAT'): return 'Juízo de retratação'
    if 'AGRAVO DE INSTRUMENTO' in c or c in ('AI',): return 'Agravo de instrumento'
    if 'APELACAO' in c and 'REMESSA' in c: return 'Apelação e remessa'
    if 'REMESSA' in c: return 'Remessa necessária'
    if 'APELACAO' in c and 'EFEITO SUSPENSIVO' not in c: return 'Apelação'
    return 'Outras classes' if c else 'Apelação'   # sem classe na pauta e no acervo: 1º julgamento colegiado

REG = {}   # (processo, tipo) -> registro; fontes lidas da mais antiga para a mais recente
def poe(proc, serv, tp, classe, secao, assunto, fonte, data):
    p = dg(proc); s = pessoa(serv)
    if len(p) != 20 or not s: return
    f = FONTE.get(p, {})
    REG[(p, tp)] = {'processo': p, 'servidor': s, 'tipo': tp,
                    'classe': classe or f.get('classe_judicial') or f.get('DataJud · Classe') or '',
                    'secao': secao or f.get('Seção Competente') or '',
                    'assunto': assunto or f.get('Assunto') or f.get('assunto_judicial') or '', 'fonte': fonte, 'data': data}

# 1. ficha (mais antiga em precedência): só o que não aparece nas pautas
for r in ler('acervo/operacional.json')['registros']:
    pr = r.get('producao') or {}; s = pr.get('SERVIDOR')
    if not s: continue
    f = FONTE.get(dg(r['processo']), {}); cl = f.get('classe_judicial') or f.get('DataJud · Classe') or ''
    tp = 'Decisão monocrática' if N(pr.get('Destino')) == 'MONOCRATICA' else tipo(cl)
    poe(r['processo'], s, tp, cl, '', '', 'ficha', pr.get('MINUTADO') or '')
# 2. pautas dos bimestres
for arq in sorted(glob.glob(str(R / 'acervo/planilhas/pauta-2026-*-bimestre.json'))):
    for ses, L in json.loads(pathlib.Path(arq).read_text(encoding='utf-8'))['pautas'].items():
        for x in L:
            ap = x.get('Apreciação') or ''
            if N(x.get('Assunto')) in ('ED', 'AGINT'): ap = x['Assunto']
            f = FONTE.get(dg(x.get('Processo')), {})
            poe(x.get('Processo'), x.get('Servidor'), tipo(f.get('classe_judicial') or '', ap), '', '', '' if N(x.get('Assunto')) in ('ED', 'AGINT') else x.get('Assunto'), 'pauta ' + ses, x.get('Minutado em') or '')
# 3. Controle de Pauta aposentado
for arq in sorted(glob.glob(str(R / 'acervo/planilhas/controle-de-pauta-*.json'))):
    for ses, L in json.loads(pathlib.Path(arq).read_text(encoding='utf-8'))['pautas'].items():
        for x in L:
            poe(x.get('Processo CNJ'), x.get('Servidor'), tipo(x.get('Classe processual')), x.get('Classe processual'), x.get('Seção'), x.get('Assunto'), 'controle ' + ses, '')
# 4. sessões do Caput (mais recentes)
for arq in sorted(glob.glob(str(R / 'acervo/sessoes/2*.json'))):
    S = json.loads(pathlib.Path(arq).read_text(encoding='utf-8'))
    for i in S.get('itens') or []:
        ap = i.get('julgamento') if i.get('julgamento') not in ('', '—', 'META', 'AI') else ''
        poe(i.get('cnj'), i.get('servidor'), tipo(i.get('classe'), ap), i.get('classe'), '', i.get('assunto'), 'sessão ' + S.get('date', pathlib.Path(arq).stem), i.get('dataMinuta') or '')

regs = list(REG.values())
# assunto colado com o cabeçalho da pauta ("… Sessão de Julgamento ORDINÁRIA …") volta ao assunto
for x in regs: x['assunto'] = re.split(r'\s+Sess[ãa]o de Julgamento\b', x['assunto'])[0].strip()
# seção que falta (processo já fora do acervo): a seção mais frequente do mesmo assunto no acervo e nas pautas
SEC = collections.defaultdict(collections.Counter)
for f in FONTE.values():
    if f.get('Assunto') and f.get('Seção Competente'): SEC[N(f['Assunto'])][f['Seção Competente']] += 1
for x in regs:
    if x['assunto'] and x['secao']: SEC[N(x['assunto'])][x['secao']] += 1
for x in regs:
    if not x['secao'] and SEC.get(N(x['assunto'])): x['secao'] = SEC[N(x['assunto'])].most_common(1)[0][0]; x['secaoInferida'] = True
ativos = {m['nome'] for m in EQ}
por = collections.defaultdict(list)
for x in regs: por[x['servidor']].append(x)

def perfil(nome, L):
    t = collections.Counter(x['tipo'] for x in L); s = collections.Counter(x['secao'] or 'sem seção' for x in L)
    a = collections.Counter(x['assunto'] for x in L if x['assunto'])
    m = next((e for e in EQ if e['nome'] == nome), {})
    return {'servidor': nome, 'noCadastro': nome in ativos, 'minutaNoCadastro': m.get('minuta'), 'total': len(L),
            'tipos': {k: t.get(k, 0) for k in TIPOS}, 'secoes': dict(s.most_common()), 'assuntos': dict(a.most_common(12)),
            'cadastro': {'exp': m.get('exp') or [], 'pref': m.get('pref') or [], 'nao': m.get('nao') or []}}

saida = {'schema': 'gabcmt.equipe.matriz', 'versao': 1, 'geradoEm': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
         'geradoPor': 'scripts/equipe/matriz_minutas.py', 'tipos': TIPOS,
         'servidores': sorted((perfil(n, L) for n, L in por.items()), key=lambda p: -p['total'])}

if '--gravar' in sys.argv:
    alvo = R / 'apoio/equipe-matriz.json'
    try: antes = json.loads(alvo.read_text(encoding='utf-8'))
    except Exception: antes = {}
    if {k: v for k, v in antes.items() if k != 'geradoEm'} == {k: v for k, v in saida.items() if k != 'geradoEm'}:
        print('apoio/equipe-matriz.json sem mudança'); sys.exit(0)   # sem commit novo só pela data
    alvo.write_text(json.dumps(saida, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('apoio/equipe-matriz.json gravado:', len(regs), 'minutas,', len(saida['servidores']), 'servidores')
else:
    ab = ['Apel', 'Ap+RN', 'RN', 'AI', 'ED', 'AgInt', 'JR', 'Mono', 'Outr']
    print(f"{'servidor':15}" + ''.join(f'{a:>6}' for a in ab) + f"{'total':>7}")
    for p in saida['servidores']:
        print(f"{p['servidor'][:15]:15}" + ''.join(f"{p['tipos'][k]:>6}" for k in TIPOS) + f"{p['total']:>7}" + ('' if p['noCadastro'] else '  (fora do cadastro)'))
    print(len(regs), 'minutas')
