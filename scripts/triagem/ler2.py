"""Leitura compacta para triagem: python3 ler2.py <cnj10> [...]"""
import sys, re, json
import os; _av = sys.argv; sys.argv = ['x', os.environ.get('LOTE', 'adp-ai')]; g = {}; exec(open('/home/claude/work/situacao.py').read().split('SITFIX = {')[0], g); sys.argv = _av
def L(t): 
    t = re.sub(r'\s+', ' ', t); t = re.sub(r'Assinado eletronicamente por:.{0,200}?Número do documento: \d+', ' ', t); t = re.sub(r'https?://\S+', '', t)
    t = re.sub(r'PODER JUDICI[ÁA]RIO\s*Tribunal Regional Federal da 3ª Região.{0,300}?(balcao-virtual|Mato Grosso do Sul)', ' ', t, flags=re.I); return t.strip()
def disp(t):
    low = t.lower(); mk = list(re.finditer(r'ante o exposto|posto isso|diante do exposto|pelo exposto|isto posto|em face do exposto|diante do quadro|nesses termos', low))
    return t[mk[-1].start():mk[-1].start() + 520] if mk else t[-450:]
for a in sys.argv[1:]:
    it = next(x for x in g['lote']['itens'] if x['processo'].startswith(a))
    lista, tx, movs = g['carregar'](it['processo']); docs = sorted(lista, key=g['chave'])
    print('#', it['processo'], '|', it.get('assunto'), '|', it.get('partes'), '| chegada', it.get('chegada'), '| etq', it.get('etiquetas'))
    print(' DOCS:', ' ; '.join(f"{d[0]} {(d[1] or '')[:26]} {d[4]} [{len(tx.get(str(d[0]), ''))}]" for d in docs))
    if movs: print(' MOV:', ' | '.join(movs[:4]))
    for d in docs:
        tp = d[1] or ''; t = L(tx.get(str(d[0]), '')); n = len(t)
        if n < 15: continue
        if re.match(r'(Documentos Diversos|Outras pe|Outros Doc|Documento Comprob|Procura|Substabelec|Intima[çc][ãa]o de Pauta)', tp, re.I):
            if re.search(r'GRU|PagTesouro|Pagamento realizado|COMPROVANTE DE PAGAMENTO|Pix|PIX', t[:3000]):
                v = sorted(set(re.findall(r'\b\d{1,3}(?:\.\d{3})*,\d{2}\b', t)))[:5]
                print(f'  $ {d[0]} {tp[:20]} {d[4]}:', 'PagTesouro' if re.search(r'PagTesouro|Pagamento realizado', t) else '', 'GRU' if 'GRU' in t else '', 'PIX' if re.search(r'\bPix\b|\bPIX\b', t) else '', 'Aguardando' if 'Aguardando' in t else '', v)
            continue
        if re.match(r'Peti[çc][ãa]o Inicial|Agravo de Instrumento$', tp, re.I):
            print(f'  ▶ {d[0]} {tp} {d[4]}: {t[:900]} […] PEDIDOS: {t[-650:]}')
        elif re.match(r'(Decis|Despacho|Ac[óo]rd|Voto|Ementa|Senten)', tp, re.I):
            if re.search(r'redistribu|Resolu[çc][ãa]o (PRES )?n?[º.]* ?33', t) and n < 4500: print(f'  ◆ {d[0]} {tp[:30]} {d[4]}: redistribuição (Res. 33) {t[-160:]}'); continue
            print(f'  ◆ {d[0]} {tp[:30]} {d[4]} [{n}]: {t[:350] if n > 1400 else ""} … {disp(t)}')
        elif re.match(r'(Contraminuta|Contrarraz|Resposta|Impugna)', tp, re.I):
            print(f'  ◇ {d[0]} {tp[:24]} {d[4]}: {t[:250]} … {t[-380:]}')
        elif re.match(r'Parecer', tp, re.I):
            print(f'  ⚖ {d[0]} {tp[:30]} {d[4]}: {t[-420:]}')
        elif re.match(r'(Certid|Informa|Ato ordinat)', tp, re.I):
            print(f'  · {d[0]} {tp[:20]} {d[4]}: {t[:260]}')
        else:
            print(f'  ○ {d[0]} {tp[:30]} {d[4]} [{n}]: {t[:330]} … {t[-260:]}')
    print()
