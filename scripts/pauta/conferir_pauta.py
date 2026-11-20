#!/usr/bin/env python3
"""Conferência da pauta antes da sessão (ordem do Des. Muta, 19 e 20/11/2026).

Uso: python3 scripts/pauta/conferir_pauta.py 2026-11-30 [2026-12-07 ...] [--json saida.json]

Para cada processo da pauta com autos extraídos (acervo/autos/<CNJ>.json.gz):
  1. Embargos de declaração ou agravo interno contra acórdão assinado por outro relator
     (acórdão de outra Turma, anterior à redistribuição): o recurso deve ser devolvido ao órgão prolator.
  2. Mandado de segurança sem parecer do MPF depois da apelação: abrir vista ao MPF antes do julgamento.
Processos sem autos no acervo saem na lista "sem autos": a conferência deles depende da extração no PJe.
Os achados são indícios a confirmar no PJe [VALIDAR]; o script não grava nada na pauta.
"""
import gzip, json, os, re, sys

RELATOR = re.compile(r'MUTA', re.I)
MS = re.compile(r'MANDADO DE SEGURAN[ÇC]A C[ÍI]VEL|IMPETRANTE\s*:|IMPETRADO\s*:')

def data(s):
    m = re.match(r'(\d\d)/(\d\d)/(\d\d)', s or '')
    return '20' + m.group(3) + m.group(2) + m.group(1) if m else ''

def autos(cnj):
    p = f'acervo/autos/{cnj}.json.gz'
    if not os.path.exists(p):
        return None
    a = json.load(gzip.open(p))
    lista = json.loads(a['lista']) if isinstance(a.get('lista'), str) else (a.get('lista') or [])
    docs = a['docs'] if isinstance(a.get('docs'), str) else ' '.join(str(d.get('texto', '')) for d in (a.get('docs') or []) if isinstance(d, dict))
    return lista, docs

_MPF = None
def membros_mpf():
    """Autores de algum parecer no acervo: servem para reconhecer manifestação do MPF que não vem com o tipo Parecer."""
    global _MPF
    if _MPF is None:
        _MPF = set()
        for f in os.listdir('acervo/autos'):
            try:
                A = autos(f.split('.json')[0])
            except Exception:
                continue
            for d in (A[0] if A else []):
                if len(d) > 3 and str(d[1]).startswith('Parecer') and d[3]:
                    _MPF.add(re.sub(r'\s*-.*$', '', str(d[3])).strip().upper())
    return _MPF

def conferir(sessao):
    itens = json.load(open(f'acervo/sessoes/{sessao}.json'))['itens']
    achados, sem = [], []
    for it in itens:
        cnj = it['cnj']; A = autos(cnj)
        base = {'sessao': sessao, 'item': it.get('item'), 'cnj': cnj, 'minuta': it.get('servidor', ''), 'correcao': it.get('corretor', '')}
        if not A:
            sem.append(base); continue
        lista, docs = A
        L = [d for d in lista if len(d) > 4 and d[4]]
        acs = [d for d in L if str(d[1]).startswith('Acórd')]
        if acs:
            ult = max(acs, key=lambda d: data(d[4]))
            recs = [d for d in L if re.match(r'Embargos de Declara|Agravo Interno', str(d[1])) and data(d[4]) > data(ult[4])]
            if recs and not RELATOR.search(str(ult[3])):
                achados.append(dict(base, tipo='devolver', acordao=ult[0], data=ult[4][:8], relator=re.sub(r'\s*-\s*Magistrado.*', '', ult[3]),
                                    recurso=[(r[1], r[0]) for r in recs],
                                    alerta=f'Acórdão embargado (ID {ult[0]}, {ult[4][:8]}) assinado por {re.sub(r"\s*-\s*Magistrado.*", "", ult[3])}, não pelo Relator: recurso contra acórdão de outra Turma; devolver ao órgão prolator [VALIDAR no PJe]'))
        e_ms = bool(MS.search(docs)) or any(re.match(r'Informa[çc][õo]es Prestadas', str(d[1])) for d in L)
        if e_ms:
            aps = [data(d[4]) for d in L if re.match(r'Apela|Recurso|Remessa', str(d[1]))]
            ap = min(aps) if aps else ''
            M = membros_mpf()
            par = [d for d in L if str(d[1]).startswith('Parecer') or (re.match(r'Manifesta', str(d[1])) and re.sub(r'\s*-.*$', '', str(d[3])).strip().upper() in M)]
            depois = [d for d in par if ap and data(d[4]) > ap]
            if not depois and not (par and not ap):
                achados.append(dict(base, tipo='mpf', pareceres=[(d[0], d[4][:8]) for d in par],
                                    alerta='Mandado de segurança sem parecer do MPF no 2º grau: abrir vista antes do julgamento [VALIDAR no PJe]'))
    return achados, sem, len(itens)

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    out = sys.argv[sys.argv.index('--json') + 1] if '--json' in sys.argv else None
    tudo = {}
    for s in args:
        if out and s == out:
            continue
        ach, sem, n = conferir(s)
        tudo[s] = {'achados': ach, 'sem_autos': sem, 'total': n}
        print(f'== Pauta de {s}: {n} processos; {n - len(sem)} com autos conferidos; {len(sem)} sem autos no acervo')
        for a in ach:
            print(f"  item {a['item']:>4} {a['cnj']} ({a['minuta'] or '—'}/{a['correcao'] or '—'}) · {a['alerta']}")
    if out:
        json.dump(tudo, open(out, 'w'), ensure_ascii=False, indent=1)
