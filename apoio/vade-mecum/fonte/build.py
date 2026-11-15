#!/usr/bin/env python3
"""Monta apoio/vade-mecum/Vade_Mecum_CMT.html a partir desta pasta e da base do procs-muta.

Fontes (todas no procs-muta):
  template.html · ementario.js · ementario.css      página e código
  snapshot.json · usos_auto.json                    cópia da planilha do Vade Mecum e usos localizados
  editorial_pecas.json                              estrutura das peças, forma, expressões a evitar e tensões
  ../../diretrizes.json · ../../repertorio.json     banco de redação e grafia de normas
  ../../../modelos/modelos.json · paragrafos.json   modelos e parágrafos-padrão
  ../../../precedentes/precedentes.jsonl · inteiros-teores/*.jsonl   ementário do Relator
  ../../referencias-rapidas.json                   referências rápidas ao lado dos modelos
  ../../../acervo/fonte.json                        partes, advogados e dados do processo, quando o processo está no acervo
Uso: python3 build.py
"""
import json, gzip, base64, pathlib, hashlib, re
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
# inteiro teor: texto, arquivo, linha e partes do cabeçalho do PJe
it, itRef = {}, {}
for f in sorted((RAIZ/'precedentes/inteiros-teores').glob('*.jsonl')):
    for n, l in enumerate(f.read_text(encoding='utf-8').splitlines(), 1):
        if not l.strip(): continue
        r = json.loads(l)
        if r.get('inteiroTeor'):
            it[r['id']] = r['inteiroTeor']
            itRef[r['id']] = {'arq': str(f.relative_to(RAIZ)), 'ln': n, 'sha': hashlib.sha256(r['inteiroTeor'].encode('utf-8')).hexdigest()}
SEMDOC = re.compile(r'\s*[-–,]?\s*\b(CPF|CNPJ)\b:?\s*[\d.\-/]+|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b')
def limpa(v): return SEMDOC.sub('', v).strip(' -–,')
def partes_it(txt):
    cab = txt.split('RELATÓRIO')[0]
    out = []
    for m in re.finditer(r'^\s*([A-ZÁÉÍÓÚÇÃÕ][A-ZÁÉÍÓÚÇÃÕa-z /().]{2,40}):\s*(.+?)\s*$', cab, re.M):
        rot, val = re.sub(r'\s+', ' ', m.group(1)).strip(), m.group(2).strip()
        if rot.lower() in ('https', 'http', 'cep') or not val: continue
        out.append([rot, limpa(val)])
    return out
# acervo: dados do processo (sem telefones, e-mails ou CPF)
AC = {}
try:
    for a in ler(RAIZ/'acervo/fonte.json')['registros']:
        if a.get('processo'): AC[a['processo']] = a
except Exception:
    pass
PK = [('Polo ativo', 'polo_ativo'), ('Advogado do polo ativo', 'advogado_pa'), ('Polo passivo', 'polo_passivo'), ('Advogado do polo passivo', 'advogado_pp'),
      ('MPF', 'MPF'), ('Seção de origem', 'Seção de Origem'), ('Seção competente', 'Seção Competente'), ('Assunto CNJ', 'Assunto_Principal'),
      ('Distribuição', 'data_distribuição'), ('Valor da causa', 'Valor_da_Causa'), ('Prioridade', 'prioridade'), ('Etiquetas', 'Etiquetas')]
def proc_ac(a):
    o = []
    for rot, k in PK:
        v = str(a.get(k) or '').strip()
        if v and v not in ('####', 'nan', 'None'): o.append([rot, limpa(v)])
    return o
prec = []
for ln, r in enumerate((RAIZ/'precedentes/precedentes.jsonl').read_text(encoding='utf-8').splitlines(), 1):
    if not r.strip(): continue
    r = json.loads(r)
    x = {k: r[k] for k in K if r.get(k) not in (None, '', [], {})}
    cur, cat = r.get('curadoria') or {}, r.get('catalogacao') or {}
    if cur.get('tese'): x['tese'] = cur['tese']
    if cur.get('subassunto'): x['subassunto'] = cur['subassunto']
    elif cat.get('subassuntoSugerido'): x['subassunto'], x['subSug'] = cat['subassuntoSugerido'], True
    if cur.get('especificidadesTags'): x['espTags'] = cur['especificidadesTags']
    if cur.get('especificidades'): x['esp'] = cur['especificidades']
    if cur.get('observacoes'): x['obs'] = cur['observacoes']
    if r.get('inteiroTeor'): x['inteiroTeor'] = True
    rt = {'arq': 'precedentes/precedentes.jsonl', 'ln': ln, 'cur': cur.get('status', '')}
    if r.get('fonte'): rt['fonte'] = r['fonte']
    if r.get('origens'): rt['origens'] = r['origens']
    if r.get('idAnterior'): rt['idAnt'] = r['idAnterior']
    if r['id'] in itRef: rt['it'] = itRef[r['id']]
    x['rast'] = rt
    pg = r.get('primeiroGrau') or {}
    pp = partes_it(it[r['id']]) if r['id'] in it else []
    pa = proc_ac(AC[r['processo']]) if r.get('processo') in AC else []
    if pg.get('juizo'): pa.insert(0, ['Juízo de origem', pg['juizo'] + (' · ' + pg['juiz'] if pg.get('juiz') else '')])
    if pp or pa: x['proc'] = {'pt': pp, 'ac': pa}
    prec.append(x)
mod = ler(RAIZ/'modelos/modelos.json')['registros']
par = ler(RAIZ/'modelos/paragrafos.json')['registros']
ref = ler(RAIZ/'apoio/referencias-rapidas.json')
pacote = {'prec': prec, 'it': it, 'mod': mod, 'par': par, 'ref': ref}
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
