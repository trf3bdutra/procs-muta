#!/usr/bin/env python3
"""Monta apoio/vade-mecum/Vade_Mecum_CMT.html a partir desta pasta e da base do procs-muta.

Fontes (todas no procs-muta):
  template.html · ementario.js · ementario.css      página e código
  snapshot.json · usos_auto.json                    cópia da planilha do Vade Mecum e usos localizados
  editorial_pecas.json                              estrutura das peças, forma, expressões a evitar e tensões
  ../../diretrizes.json · ../../repertorio.json     banco de redação e grafia de normas
  ../../../modelos/modelos.json · paragrafos.json   modelos e parágrafos-padrão
  ../../../precedentes/precedentes.jsonl · inteiros-teores/*.jsonl   ementário do Relator
Uso: python3 build.py
"""
import json, gzip, base64, pathlib
H = pathlib.Path(__file__).resolve().parent
RAIZ = H.parents[2]
def js(o): return json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
def jl(p): return [json.loads(l) for l in p.read_text(encoding='utf-8').splitlines() if l.strip()]
ler = lambda p: json.loads(p.read_text(encoding='utf-8'))

dir_ = ler(RAIZ/'apoio/diretrizes.json')
rep = ler(RAIZ/'apoio/repertorio.json')
editorial = {'padrao': {'schema': dir_.get('schema'), 'versao': dir_.get('versao'), 'atualizadoEm': dir_.get('atualizadoEm'), 'registros': dir_['registros']},
             'normas': [r for r in rep['registros'] if r.get('categoria') == 'norma'],
             'pecas': ler(H/'editorial_pecas.json')}
K = ['id', 'processo', 'classe', 'classeSigla', 'especie', 'pronunciamento', 'orgao', 'dataJulgamento', 'dataPublicacao', 'assunto', 'temas',
     'ramoDireito', 'ementa', 'resultado', 'sentidoResultado', 'dispositivosCitados', 'jurisprudenciaCitada']
prec = []
for r in jl(RAIZ/'precedentes/precedentes.jsonl'):
    x = {k: r[k] for k in K if r.get(k) not in (None, '', [], {})}
    tese = (r.get('curadoria') or {}).get('tese')
    if tese: x['tese'] = tese
    if r.get('inteiroTeor'): x['inteiroTeor'] = True
    prec.append(x)
it = {}
for f in sorted((RAIZ/'precedentes/inteiros-teores').glob('*.jsonl')):
    for r in jl(f):
        if r.get('inteiroTeor'): it[r['id']] = r['inteiroTeor']
mod = ler(RAIZ/'modelos/modelos.json')['registros']
par = ler(RAIZ/'modelos/paragrafos.json')['registros']
pacote = {'prec': prec, 'it': it, 'mod': mod, 'par': par}
gz = base64.b64encode(gzip.compress(json.dumps(pacote, ensure_ascii=False, separators=(',', ':')).encode(), 9)).decode()

t = (H/'template.html').read_text(encoding='utf-8')
for a, b in [('/*__USOS__*/', (H/'usos_auto.json').read_text(encoding='utf-8').strip()),
             ('/*__DATA__*/', (H/'snapshot.json').read_text(encoding='utf-8').strip()),
             ('/*__EDITORIAL__*/', js(editorial)),
             ('<script type="application/octet-stream" id="modelos-gz">/*__MODELOS__*/</script>', '<script type="application/octet-stream" id="base-gz">' + gz + '</script>'),
             ('</style>\n</head>', (H/'ementario.css').read_text(encoding='utf-8') + '</style>\n</head>'),
             ('</script>\n</body>', '</script>\n<script>\n' + (H/'ementario.js').read_text(encoding='utf-8') + '</script>\n</body>')]:
    assert t.count(a) == 1, a[:60]
    t = t.replace(a, b)
out = H.parent/'Vade_Mecum_CMT.html'
out.write_text(t, encoding='utf-8')
print(f'ok {out} {len(t)//1024} KB · {len(prec)} precedentes, {len(it)} inteiros teores, {len(mod)} modelos, {len(par)} parágrafos')
