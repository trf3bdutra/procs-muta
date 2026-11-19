#!/usr/bin/env python3
"""Matriz de minutas por servidor: quem minutou o quê, por tipo de minuta, seção e assunto.

Fontes (cada processo e tipo conta uma vez; vale a fonte mais recente):
  acervo/sessoes/AAAA-MM-DD.json                pautas do Caput (servidor, classe, julgamento ED/AgInt/JR)
  acervo/planilhas/controle-de-pauta-*.json     Controle de Pauta aposentado (classe, seção, servidor)
  acervo/planilhas/pauta-2026-*-bimestre.json   pautas dos bimestres (apreciação 1º julg / ED / Retrat)
  acervo/operacional.json                       ficha: SERVIDOR e Destino (monocráticas)
  acervo/planilhas/historico-por-servidor.json  histórico por servidor (14 pautas do OneDrive, 27/04 a 13/11/2026; redator e conferente);
                                                fonte complementar, a de menor precedência; a matriz marca o que só ele traz
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
def poe(proc, serv, tp, classe, secao, assunto, fonte, data, detalhe='', corretor=''):
    p = dg(proc); s = pessoa(serv)
    if len(p) != 20 or not (s or (fonte.startswith('histórico') and corretor)): return   # do histórico, vale também a conferência sem autoria identificada
    f = FONTE.get(p, {})
    ant = REG.get((p, tp), {})
    REG[(p, tp)] = {'processo': p, 'servidor': s, 'tipo': tp,
                    'classe': classe or f.get('classe_judicial') or f.get('DataJud · Classe') or '',
                    'secao': secao or f.get('Seção Competente') or '',
                    'assunto': assunto or f.get('Assunto') or f.get('assunto_judicial') or '', 'fonte': fonte, 'data': data, 'detalhe': detalhe,
                    'corretor': '' if '/' in str(corretor or '') else pessoa(corretor)}   # corretor composto ("Bruno/Alex") era provisório: não conta
    for k in ('classe', 'secao', 'assunto', 'detalhe', 'data', 'corretor'):   # a fonte mais recente vale, mas não apaga o que a anterior sabia
        if not REG[(p, tp)][k] and ant.get(k): REG[(p, tp)][k] = ant[k]

# 0. histórico por servidor (acervo/planilhas/historico-por-servidor.json, pautas do OneDrive): o mais antigo em precedência
HIST = R / 'acervo/planilhas/historico-por-servidor.json'
if HIST.exists():
    for e in json.loads(HIST.read_text(encoding='utf-8'))['registros']:
        if not e.get('redator') and not e.get('conferente'): continue
        a0 = re.split(r'\s+—\s+', e.get('assunto') or '')[0].strip()
        ed = bool(re.search(r'\bED\b', e.get('aba') or '')) or N(a0) == 'ED' or N(a0).startswith('EMBARGOS DE DECLARACAO')
        det = (e.get('detalhe') if ed or not a0 else a0) or ''
        f = FONTE.get(dg(e['processo']), {}); cl = f.get('classe_judicial') or f.get('DataJud · Classe') or ''
        poe(e['processo'], e.get('redator') or '', tipo(cl, 'ED' if ed else ''), cl, '', '', 'histórico ' + e.get('sessao', ''), e.get('dataMinuta') or '', det, e.get('conferente') or '')
# 1. ficha: só o que não aparece nas pautas
for r in ler('acervo/operacional.json')['registros']:
    pr = r.get('producao') or {}; s = pr.get('SERVIDOR')
    if not s: continue
    f = FONTE.get(dg(r['processo']), {}); cl = f.get('classe_judicial') or f.get('DataJud · Classe') or ''
    tp = 'Decisão monocrática' if N(pr.get('Destino')) == 'MONOCRATICA' else tipo(cl)
    poe(r['processo'], s, tp, cl, '', '', 'ficha', pr.get('MINUTADO') or '', '', pr.get('CORRETOR') or '')
# 2. pautas dos bimestres
for arq in sorted(glob.glob(str(R / 'acervo/planilhas/pauta-2026-*-bimestre.json'))):
    for ses, L in json.loads(pathlib.Path(arq).read_text(encoding='utf-8'))['pautas'].items():
        for x in L:
            ap = x.get('Apreciação') or ''
            if N(x.get('Assunto')) in ('ED', 'AGINT'): ap = x['Assunto']
            f = FONTE.get(dg(x.get('Processo')), {})
            poe(x.get('Processo'), x.get('Servidor'), tipo(f.get('classe_judicial') or '', ap), '', '', '' if N(x.get('Assunto')) in ('ED', 'AGINT') else x.get('Assunto'), 'pauta ' + ses, x.get('Minutado em') or '', x.get('Detalhes') or '', x.get('Revisor') or '')
# 3. Controle de Pauta aposentado
for arq in sorted(glob.glob(str(R / 'acervo/planilhas/controle-de-pauta-*.json'))):
    for ses, L in json.loads(pathlib.Path(arq).read_text(encoding='utf-8'))['pautas'].items():
        for x in L:
            poe(x.get('Processo CNJ'), x.get('Servidor'), tipo(x.get('Classe processual')), x.get('Classe processual'), x.get('Seção'), x.get('Assunto'), 'controle ' + ses, '', '', x.get('Corretor/revisor') or '')
# 4. sessões do Caput (mais recentes)
for arq in sorted(glob.glob(str(R / 'acervo/sessoes/2*.json'))):
    S = json.loads(pathlib.Path(arq).read_text(encoding='utf-8'))
    for i in S.get('itens') or []:
        ap = i.get('julgamento') if i.get('julgamento') not in ('', '—', 'META', 'AI') else ''
        poe(i.get('cnj'), i.get('servidor'), tipo(i.get('classe'), ap), i.get('classe'), '', i.get('assunto'), 'sessão ' + S.get('date', pathlib.Path(arq).stem), i.get('dataMinuta') or '', '', i.get('corretor') or '')

regs = list(REG.values())
# ramo do direito (TPU/CNJ, apoio/assuntos-cnj.json): pelo código do assunto no acervo; senão pelo nome do assunto
CNJ = ler('apoio/assuntos-cnj.json')['assuntos']
RAMO_COD = {str(k): v.get('ramo') for k, v in CNJ.items()}
RAMO_NOME = {}
for v in sorted(CNJ.values(), key=lambda v: v.get('processos') or 0):
    RAMO_NOME[N(v.get('nome'))] = v.get('ramo')
def ramo(x):
    f = FONTE.get(x['processo'], {}); c = str(f.get('DataJud · Código Assunto') or '')
    if N(x['assunto']) in RAMO_NOME: return RAMO_NOME[N(x['assunto'])]
    return RAMO_COD.get(c) or ''
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
# pauta antiga sem assunto: o 1º trecho de Detalhes, quando é nome de assunto conhecido (ex.: "APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO · …")
CONHECIDOS = {N(x['assunto']): x['assunto'] for x in regs if x['assunto']}
for k, v in CNJ.items(): CONHECIDOS.setdefault(N(v.get('nome')), v.get('nome'))
APELIDO = {  # rótulos curtos das pautas antigas → assunto do gabinete
    'BPC': 'Benefício Assistencial (Art. 203,V CF/88)', 'APOSENTADORIA POR IDADE RURAL': 'Aposentadoria Rural (Art. 48/51)',
    'PROCESSUAL - APOSENTADORIA RURAL': 'Aposentadoria Rural (Art. 48/51)', 'CONVERSAO DE TEMPO ESPECIAL': 'Averbação/Cômputo/Conversão de tempo de serviço especial',
    'APOSENTADORIA HIBRIDA': 'Aposentadoria Híbrida (Art. 48/106)', 'APOSENTADORIA POR INVALIDEZ': 'Aposentadoria por Incapacidade Permanente',
    'ATC PCD': 'Pessoa com Deficiência', 'ATC PESSOA COM DEFICIENCIA': 'Pessoa com Deficiência', 'SALARIO MATERNIDADE RURAL': 'Salário-Maternidade (Art. 71/73)',
    'AUXILIO-RECLUSAO': 'Auxílio-Reclusão (Art. 80)', 'APOSENTADORIA POR IDADE': 'Aposentadoria por Idade (Art. 48/51)',
    'AUXILIO-DOENCA': 'Auxílio por Incapacidade Temporária', 'BPC-LOAS': 'Benefício Assistencial (Art. 203,V CF/88)', 'APOSENTADORIA POR INCAPACIDADE': 'Aposentadoria por Incapacidade Permanente',
    'AVERBACAO DE TEMPO DE SERVICO': 'Averbação/Cômputo de tempo de serviço  rural (empregado/empregador)', 'ACAO DE REVISAO': 'Reajustes e Revisões Específicos'}
def assunto_de(c):
    k = N(c)
    if not k: return ''
    if k in APELIDO: return APELIDO[k]
    if k in CONHECIDOS: return CONHECIDOS[k]
    cand = sorted((v for kk, v in CONHECIDOS.items() if kk.startswith(k + ' ') or kk.startswith(k + ' (')), key=len)
    if cand: return cand[0]
    dentro = sorted((v for kk, v in CONHECIDOS.items() if len(kk) >= 12 and kk in k), key=len, reverse=True)   # "AI Aposentadoria por …" → o assunto contido
    return dentro[0] if dentro else ''
for x in regs:
    if not x['assunto'] and x.get('detalhe'):
        x['assunto'] = assunto_de(re.split(r'\s*[·|]\s*', x['detalhe'])[0])
        if not x['assunto'] and x['fonte'].startswith('histórico') and x['tipo'] != 'Embargos de declaração' and len(x['detalhe']) <= 80 and '\n' not in x['detalhe']: x['assunto'] = re.split(r'\s*[·|]\s*', x['detalhe'])[0].strip().rstrip('.')   # rótulo da pauta, como veio
        if x['assunto'] and not x['secao'] and SEC.get(N(x['assunto'])): x['secao'] = SEC[N(x['assunto'])].most_common(1)[0][0]; x['secaoInferida'] = True
for x in regs: x['ramo'] = ramo(x)
def ses_de(f):   # data da pauta a partir da fonte ("sessão 2026-11-13", "controle 26-10-2026", "pauta 27/04/2026", "histórico 2026-06-08")
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', f)
    if m: return m[0]
    m = re.search(r'(\d{2})[-/](\d{2})[-/](\d{4})', f)
    return f'{m[3]}-{m[2]}-{m[1]}' if m else ''
for x in regs: x['sessao'] = ses_de(x['fonte'])
ativos = {m['nome'] for m in EQ}
por = collections.defaultdict(list)
for x in regs:
    if x['servidor']: por[x['servidor']].append(x)
for x in regs:
    if x['corretor'] and x['corretor'] not in por: por[x['corretor']] = []

def perfil(nome, L):
    t = collections.Counter(x['tipo'] for x in L); s = collections.Counter(x['secao'] or 'sem seção' for x in L)
    a = collections.Counter(x['assunto'] for x in L if x['assunto']); rm = collections.Counter(x['ramo'] or 'sem ramo' for x in L)
    m = next((e for e in EQ if e['nome'] == nome), {}); cr = [x for x in regs if x['corretor'] == nome]
    return {'servidor': nome, 'noCadastro': nome in ativos, 'minutaNoCadastro': m.get('minuta'), 'total': len(L), 'correcoes': len(cr), 'assuntosCorrigidos': dict(collections.Counter(x['assunto'] for x in cr if x['assunto']).most_common(12)),
            'tipos': {k: t.get(k, 0) for k in TIPOS}, 'secoes': dict(s.most_common()), 'ramos': dict(rm.most_common()), 'assuntos': dict(a.most_common(12)),
            'cadastro': {'exp': m.get('exp') or [], 'pref': m.get('pref') or [], 'nao': m.get('nao') or []}}

saida = {'schema': 'gabcmt.equipe.matriz', 'versao': 1, 'geradoEm': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
         'geradoPor': 'scripts/equipe/matriz_minutas.py', 'tipos': TIPOS,
         'servidores': sorted((perfil(n, L) for n, L in por.items()), key=lambda p: -p['total']),
         # uma linha por minuta: [redator, tipo, seção, ramo, assunto, corretor, só do histórico (1) ou das pautas do Git (0), data da pauta, data da minuta]
         'minutas': sorted([x['servidor'], x['tipo'], x['secao'], x['ramo'], x['assunto'], x['corretor'], 1 if x['fonte'].startswith('histórico') else 0, x['sessao'], x['data'] or ''] for x in regs)}

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
