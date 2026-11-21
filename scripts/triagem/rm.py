"""Pré-análise de remessas: python3 rm.py <cnj10...>  (LOTE=adp-remessas)"""
import os, sys, re, pickle, numpy as np
os.environ.setdefault('LOTE', 'adp-remessas')
_av = sys.argv; sys.argv = ['x', os.environ['LOTE']]; g = {}; exec(open('/home/claude/work/situacao.py').read().split('SITFIX = {')[0], g); sys.argv = _av
P = pickle.load(open('/home/claude/work/prec/prec.pkl', 'rb')); meta, X, vec = P['meta'], P['X'], P['vec']
trms = np.array(['Regional' in (m['o'] or '') for m in meta]); anos = np.array([int((m['d'] or '0000')[:4] or 0) for m in meta])
def L(t): return re.sub(r'Assinado eletronicamente por:.{0,200}?Número do documento: \d+', ' ', re.sub(r'\s+', ' ', t))
def disp(t):
    low = t.lower(); mk = list(re.finditer(r'ante o exposto|diante do exposto|posto isso|pelo exposto|isto posto|em face do exposto|ante todo o exposto', low))
    return t[mk[-1].start():mk[-1].start() + 700] if mk else t[-600:]
alvo = sys.argv[1:]
for it in g['lote']['itens']:
    if not any(it['processo'].startswith(a) for a in alvo): continue
    c = g['carregar'](it['processo'])
    if not c: print('#', it['processo'], 'SEM AUTOS'); continue
    lista, tx, movs = c; docs = sorted(lista, key=g['chave'])
    print('#', it['processo'], '|', it.get('classe'), '|', it.get('assunto'), '|', (it.get('partes') or '')[:100], '| etq', it.get('etiquetas'))
    sent = [d for d in docs if re.match(r'Senten', d[1] or '')]
    if not sent: sent = [d for d in docs if re.match(r'Decis', d[1] or '') and re.search(r'concedo (a|parcialmente a) segurança|denego a segurança|julgo (im)?procedente|julgo parcialmente procedente|extingo o processo', L(tx.get(str(d[0]), '')), re.I)]
    apel = [d for d in docs if re.match(r'(Apela|Recurso de Apela)', d[1] or '')]
    ed = [d for d in docs if re.match(r'Embargos de Declara', d[1] or '')]
    par = [d for d in docs if re.match(r'Parecer', d[1] or '')]
    print('  docs', len(docs), '| sentenças', [(d[0], d[4]) for d in sent], '| apelações', [(d[0], d[4]) for d in apel], '| ED', [(d[0], d[4]) for d in ed])
    if movs: print('  mov:', ' | '.join(movs[:3]))
    if sent:
        s = L(tx.get(str(sent[-1][0]), '')); i = s.find('Trata-se'); 
        print('  SENT ini:', s[i if i > 0 else 0:][:500]); print('  SENT disp:', disp(s)[:700])
        q = s[i if i > 0 else 0:][:1500]
        sc = (X @ vec.transform([q]).T).toarray().ravel() * np.where(trms, 1.3, 1.0) * np.where(anos >= 2023, 1.1, 1.0)
        for j in np.argsort(-sc)[:4]:
            m = meta[j]; print(f"   ~{sc[j]:.2f} {m['id']} {m['c']} {m['n']} {m['d']} {'TRMS' if trms[j] else (m['o'] or '-')[:10]} | {re.sub(chr(10),' ',(m['ementa'] or m['ini'] or ''))[:150]} | {re.sub(r'\\s+',' ',m['res'] or '')[-90:]}")
    for d in par[-2:]:
        print('  PAR', d[0], d[1][:30], d[4], ':', L(tx.get(str(d[0]), ''))[-260:])
    print()
