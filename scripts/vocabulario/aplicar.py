# -*- coding: utf-8 -*-
"""Aplica o vocabulário único (padrao/vocabulario.json) a todas as telas que listam esses campos.

1. padrao/vocabulario.js      dados embutidos (VOC, usado pelas páginas e pela extensão)
2. padrao/ficha.json          opções dos campos da ficha (Tempestividade, Preparo, Representação, Prelim., Mídias,
                              MPF - Custos Legis, MPF)
3. padrao/lia/campos-prontuario.json e o LIA_CAMPOS embutido na Ex Officio (prontuário das pautas)
4. DROPDOWNS do motor do Caput (caput/motor/index.html)
5. o módulo VOC embutido nas páginas (entre <!-- voc:inicio --> e <!-- voc:fim -->) e copiado para a extensão

Uso: python3 scripts/vocabulario/aplicar.py   (rodar de novo depois de editar padrao/vocabulario.json)
"""
import json, re, sys
from pathlib import Path

R = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(R / 'scripts'))
import vocabulario as V  # noqa: E402

D = V.D
mud = []


def grava(p, txt, antes):
    if txt != antes:
        p.write_text(txt, encoding='utf-8'); mud.append(str(p.relative_to(R)))


# 1. módulo JS com os dados
pj = R / 'padrao/vocabulario.js'
js0 = pj.read_text(encoding='utf-8')
dados = json.dumps({'versao': D['versao'], 'campos': {k: {'rotulo': f['rotulo'], 'opcoes': f['opcoes'], 'sinonimos': f['sinonimos']}
                                                     for k, f in D['campos'].items()}}, ensure_ascii=False, separators=(',', ':'))
js = re.sub(r'/\*VOC-DADOS\*/.*?/\*VOC-FIM\*/', lambda m: '/*VOC-DADOS*/' + dados + '/*VOC-FIM*/', js0, flags=re.S)
grava(pj, js, js0)

# 2. ficha
pf = R / 'padrao/ficha.json'
f0 = pf.read_text(encoding='utf-8'); F = json.loads(f0)
porchave = {f['ficha']: k for k, f in D['campos'].items() if f.get('ficha') and k != 'destino'}
ROT = {'MPF - Custos Legis': 'Hipótese de intervenção (custos legis)'}
for a in F['abas']:
    for g in a['grupos']:
        for c in g.get('campos', []):
            k = porchave.get(c.get('chave'))
            if k and c.get('secao') == (D['campos'][k].get('secao') or 'triagem'):
                c['tipo'] = 'lista'; c['opcoes'] = V.lista(k); c['vocabulario'] = k
                if c['chave'] in ROT: c['rotulo'] = ROT[c['chave']]
grava(pf, json.dumps(F, ensure_ascii=False, indent=1) + '\n', f0)


# 3. prontuário (arquivo e cópia embutida na Ex Officio)
def campos_lia(obj):
    for sec in obj.values():
        if not isinstance(sec, list):
            continue
        for e in sec:
            if isinstance(e, list) and len(e) > 3 and isinstance(e[3], list) and ':' in e[0]:
                k = e[0].split(':', 1)[1]
                if k in D['campos'] and D['campos'][k].get('prontuario') == k:
                    e[3] = V.lista(k)
    return obj


pl = R / 'padrao/lia/campos-prontuario.json'
l0 = pl.read_text(encoding='utf-8')
grava(pl, json.dumps(campos_lia(json.loads(l0)), ensure_ascii=False, indent=1) + '\n', l0)
pe = R / 'apoio/ex-officio/index.html'
e0 = pe.read_text(encoding='utf-8')
e1 = re.sub(r'var LIA_CAMPOS=(\{.*?\});\n', lambda m: 'var LIA_CAMPOS=' + json.dumps(campos_lia(json.loads(m.group(1))), ensure_ascii=False) + ';\n', e0, count=1)
grava(pe, e1, e0)

# 4. DROPDOWNS do motor do Caput
pm = R / 'caput/motor/index.html'
m0 = pm.read_text(encoding='utf-8')
dd = {f['motor']: V.lista(k) for k, f in D['campos'].items() if f.get('motor') and k in ('tempest', 'preparo', 'repres', 'midias', 'parecer', 'mpf')}
dd['MPF - Custos Legis'] = [''] + [x for x in dd['MPF - Custos Legis'] if x != 'Sem hipótese']
ordem = ['Tempestividade', 'Preparo', 'Representação', 'Mídias', 'MPF', 'MPF - Custos Legis']
bloco = 'DROPDOWNS = {\n' + ',\n'.join('  ' + json.dumps(k, ensure_ascii=False) + ': ' + json.dumps(dd[k], ensure_ascii=False, separators=(',', ':')) for k in ordem) + '\n};'
m1 = re.sub(r'DROPDOWNS = \{\n.*?\n\};', lambda m: bloco, m0, count=1, flags=re.S)
grava(pm, m1, m0)

# 5. módulo VOC nas páginas e na extensão
mod = (R / 'padrao/vocabulario.js').read_text(encoding='utf-8')
tag = '<!-- voc:inicio --><script>\n' + mod + '</script><!-- voc:fim -->\n'
for rel in ['apoio/ex-officio/index.html', 'apoio/ex-officio/lotes/index.html', 'caput/triagem/index.html', 'caput/motor/index.html']:
    p = R / rel; t0 = p.read_text(encoding='utf-8')
    if '<!-- voc:inicio -->' in t0:
        t = re.sub(r'<!-- voc:inicio -->.*?<!-- voc:fim -->\n', lambda m: tag, t0, count=1, flags=re.S)
    else:
        i = t0.find('<script'); t = t0[:i] + tag + t0[i:]
    grava(p, t, t0)
for rel in ['extensao/vocabulario.js', 'apoio/ex-officio/api/_vocabulario.js']:
    px = R / rel; x0 = px.read_text(encoding='utf-8') if px.exists() else ''
    grava(px, mod, x0)
ph = R / 'extensao/painel.html'; h0 = ph.read_text(encoding='utf-8')
if 'vocabulario.js' not in h0:
    grava(ph, h0.replace('<script src="comum.js"></script>', '<script src="vocabulario.js"></script>\n<script src="comum.js"></script>', 1), h0)

print('vocabulário', D['versao'], '·', len(mud), 'arquivo(s):', ', '.join(mud) or 'nada a mudar')
