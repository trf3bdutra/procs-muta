"""Leitura rápida de apelação: python3 ap.py <cnj10> [LOTE env]"""
import os, sys, re
os.environ.setdefault('LOTE', 'adp-remessas')
_av = sys.argv; sys.argv = ['x', os.environ['LOTE']]; g = {}; exec(open('/home/claude/work/situacao.py').read().split('SITFIX = {')[0], g); sys.argv = _av
def L(t): return re.sub(r'Assinado eletronicamente por:.{0,200}?Número do documento: \d+', ' ', re.sub(r'\s+', ' ', t or ''))
for it in g['lote']['itens']:
    if not it['processo'].startswith(sys.argv[1]): continue
    lista, tx, movs = g['carregar'](it['processo']); docs = sorted(lista, key=g['chave'])
    for d in docs:
        tp = d[1] or ''; raw = tx.get(str(d[0]), ''); t = L(raw)
        if re.match(r'(Apela|Recurso)', tp):
            heads = re.findall(r'(?:^|\s)((?:[IVX]+|\d+(?:\.\d+)*)\s?[-–.)]\s?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ ,/()-]{8,90})(?=\s)', t)
            print(f'== {tp} {d[0]} {d[4]} [{len(t)}] tópicos:', ' | '.join(dict.fromkeys(h.strip() for h in heads))[:900])
            mk = list(re.finditer(r'(?i)(ante o exposto|diante do exposto|requer|pugna)', t)); print('   FIM:', t[mk[-1].start():mk[-1].start() + 700] if mk else t[-700:])
        elif re.match(r'Contrarraz', tp):
            heads = re.findall(r'(?:^|\s)((?:[IVX]+|\d+(?:\.\d+)*)\s?[-–.)]\s?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ ,/()-]{8,90})(?=\s)', t)
            print(f'== CR {d[0]} {d[4]} [{len(t)}]:', t[100:300], '| tópicos:', ' | '.join(dict.fromkeys(h.strip() for h in heads))[:400])
        elif re.match(r'(Certid|Intima|Ato ordin)', tp) and re.search(r'(?i)tempestiv|decurso|decorreu|prazo', t[:1500]): print(f'   cert {d[0]} {d[4]}:', t[200:420])
    if movs: print('MOV:', ' | '.join(m for m in movs if re.search(r'(?i)decorrido|ci[êe]ncia|expedi', m))[:900])
