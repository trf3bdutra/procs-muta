"""Leitura condensada dos autos para a triagem: python3 ler.py <lote> <cnj-prefixo> [lim_recurso]"""
import json, gzip, os, re, sys
R = '/home/claude/procs-muta/'
lote, pref = sys.argv[1], sys.argv[2]
LIMR = int(sys.argv[3]) if len(sys.argv) > 3 else 4500
L = json.load(open(R + f'acervo/lotes/{lote}.json'))
it = next(x for x in L['itens'] if x['processo'].startswith(pref))
cnj = it['processo']
f = cnj + '.json.gz'
a = json.load(gzip.open(R + 'acervo/autos/' + f))
lista = json.loads(a['lista']) if isinstance(a['lista'], str) else a['lista']
partes = re.split(r'===== ID (\d+) \| [^\n]*?=====', a.get('texto') or '')
tx = {}
for k in range(1, len(partes) - 1, 2):
    tx[partes[k]] = partes[k + 1]
if len(tx) < 2:
    partes = re.split(r'===== ID (\d+) \|', a.get('texto') or '')
    for k in range(1, len(partes) - 1, 2):
        tx[partes[k]] = partes[k + 1]
print('#', cnj, '|', f, '|', it.get('recurso'), '| assunto:', it.get('assunto'))
print('PARTES:', it.get('partes'))
print('ETQ:', it.get('etiquetas'), '| CHEGADA:', it.get('chegada'), '| faltam:', a.get('faltam'))
print('SIT:', json.dumps(it.get('situacao_atual'), ensure_ascii=False)[:500])

def limpa(b):
    b = re.sub(r'\s+', ' ', b)
    b = re.sub(r'PODER JUDICI[ÁA]RIO\s*Tribunal Regional Federal da 3ª Região.{0,300}?balcao-virtual', ' ', b, flags=re.I)
    b = re.sub(r'(AGRAVO DE INSTRUMENTO|APELAÇÃO CÍVEL|REMESSA NECESSÁRIA CÍVEL) \(\d+\) Nº [\d.-]+ ?RELATOR: [A-Z ]+', ' ', b)
    b = re.sub(r'Assinado eletronicamente por:.{0,200}?Número do documento: \d+', ' ', b)
    b = re.sub(r'https?://\S+', '', b)
    b = re.sub(r'Num\. \d+ - Pág\. \d+', '', b)
    return b.strip()

def corta_cab(b):
    m = re.search(r'(DECIS[ÃA]O|DESPACHO|CERTID[ÃA]O|ACÓRD[ÃA]O|E M E N T A|EMENTA|RELAT[ÓO]RIO|Vistos|Trata-se)', b[:1800])
    if m and re.search(r'ADVOGADO|AGRAVANTE|AGRAVADO|APELANTE|INTERESSADO', b[:m.start()]):
        return b[m.start():]
    return b

def lim(t, d):
    """(cabeça, cauda) por espécie."""
    x = (t + ' ' + d).lower()
    if re.search(r'outras pe[çc]as|documento comprobat|documentos diversos|anexo', x):
        if re.search(r'decis|despacho|senten', d.lower()):
            return (900, 700)
        return (0, 0)
    if re.search(r'contrarraz|contraminuta|resposta|impugna', x):
        return (500, 900)
    if re.search(r'agravo interno|embargos de declara', x):
        return (900, 700)
    if re.search(r'agravo de instrumento|apela|peti[çc][ãa]o inicial|recurso', x):
        return (1300, 900)
    if re.search(r'parecer', x):
        return (350, 900)
    if re.search(r'decis|despacho|senten|ac[óo]rd|voto|ementa', x):
        return (700, 1100)
    if re.search(r'peti[çc]|manifesta', x):
        return (450, 450)
    if re.search(r'certid', x):
        return (500, 0)
    return (250, 0)

print('DOCS: ' + ' ; '.join(f'{d[0]} {d[1][:40]} {d[4]} ({len(tx.get(str(d[0]), ""))})' for d in lista))
print()
for d in sorted(lista, key=lambda d: int(d[0])):
    i = str(d[0]); t = limpa(tx.get(i, ''))
    if not t:
        continue
    t = corta_cab(t)
    if re.search(r'Documentos Diversos|Outros Documentos|^Anexo|Procura|Substabelec|Comprovante|Custas|Guia', d[1] or '', re.I) and not re.search(r'Pagamento realizado|aguardando', t[:400], re.I):
        print(f'\n## ID {i} · {d[1]} · {d[4]} :: ' + t[:220]); continue
    h, c = lim(d[1] or '', d[2] or '')
    if h == 0:
        continue
    print(f'\n## ID {i} · {d[1]} · {d[4]}' + (f' · {d[2][:80]}' if d[2] and d[2] != d[1] else ''))
    if len(t) <= h + c + 300:
        print(t)
    else:
        print(t[:h] + (' […] …FIM: ' + t[-c:] if c else ' […]'))
