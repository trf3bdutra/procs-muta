"""Preenche, na ficha única (acervo/operacional.json), os campos do prontuário de triagem do Caput
a partir dos lotes de triagem: O que falta sanar, Síntese Processual, Hipóteses Monocrática, Próxima ação e Especificidades.
Só preenche campo vazio (ou texto gerado pela situação, iniciado por '► Situação')."""
import json, re, sys
REPO = '/home/claude/procs-muta'
lotes = sys.argv[1:] or ['adp-remessas', 'adp-ap-3s']
O = json.load(open(f'{REPO}/acervo/operacional.json', encoding='utf-8'))
R = {r['processo']: r for r in O['registros']}
n = 0; mud = {}
def poe(sec, k, v, gerado=False):
    global n
    if not v: return
    cur = sec.get(k, '')
    if cur and cur != v and not (gerado and str(cur).startswith('► Situação')): return
    if cur == v: return
    sec[k] = v; n += 1; mud[k] = mud.get(k, 0) + 1
for lid in lotes:
    L = json.load(open(f'{REPO}/acervo/lotes/{lid}.json', encoding='utf-8'))
    for it in L['itens']:
        if not it.get('triagem'): continue
        r = R.get(it['processo'])
        if not r: continue
        t = r.setdefault('triagem', {}); o = r.setdefault('origem', {})
        res = it.get('resultado', '')
        val = []
        for m in re.finditer(r'\[VALIDAR: ([^\]]+)\]', res): val += [x.strip() for x in m.group(1).split(';') if x.strip()]
        val += [p for p in (it.get('pendencias') or []) if isinstance(p, str)]
        falta = '\n'.join(('' if v.startswith('[VALIDAR') else '[VALIDAR] ') + v for v in dict.fromkeys(val))
        poe(t, 'O que falta sanar', falta)
        sa = (it.get('situacao_atual') or {}).get('resumo', '')
        poe(t, 'Síntese Processual', sa, gerado=True)
        esp = it.get('especificidades', '') or ''
        if sa and esp.startswith(sa): esp = esp[len(sa):].lstrip(' ·')
        poe(t, 'Especificidades', esp, gerado=True)
        poe(t, 'Hipóteses Monocrática', (it.get('triagem') or {}).get('monocratica', ''))
        m = re.search(r'Proposta pelos precedentes: (.+?)(?: \[VALIDAR: [^\]]+\])?$', res)
        prox = (m.group(1).strip() if m else (it.get('triagem') or {}).get('ato', ''))
        poe(o, 'Próxima ação', prox[:400])
open(f'{REPO}/acervo/operacional.json', 'w', encoding='utf-8').write(json.dumps(O, ensure_ascii=False, indent=1) + '\n')
print('campos gravados:', n, mud)
