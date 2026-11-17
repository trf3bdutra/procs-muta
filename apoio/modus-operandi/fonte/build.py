#!/usr/bin/env python3
"""Monta apoio/modus-operandi/modus-operandi.html (modo padrão; modo avançado liberado pelo login, mesmo código) e modus-operandi-editor.html (editor)
a partir desta pasta e da base do procs-muta. Perfis (equipe, avancado, editor): apoio/acessos.json (funções em apoio/ex-officio/api).

Fontes (todas no procs-muta):
  template.html · ementario.js · ementario.css      página e código
  ../../vade-mecum.json · usos_auto.json            Vade Mecum (temas, súmulas, jurisprudência, normas, regimento…) e usos localizados
  editorial_pecas.json                              estrutura das peças, forma, expressões a evitar e tensões
  editorial_d.js · editorial_d.css · editorial_apoios.json   Minuta-Matriz (arquitetura D) e apoios do canhoto
  roteiros.json                                     roteiro da minuta (mestre, espécie, assunto e transversais)
  nav_editorial.css                                 barra do cabeçalho, gêmea da do Ex Officio
  padrao_paginas.js · padrao_paginas.css            padrão comum das páginas: abertura, barra de consulta e trilho
  diretrizes_manual.html                            manual de redação das Diretrizes (Padrões decisórios só no acesso avançado)
  ../../diretrizes.json · ../../repertorio.json     banco de redação e grafia de normas
  ../../../modelos/modelos.json · paragrafos.json   modelos-matriz e parágrafos-padrão
  ../../../modelos/matrizes-estruturais.json        moldes do Editorial por recurso e resultado
  ../../../precedentes/precedentes.jsonl · inteiros-teores/*.jsonl   ementário do Relator
  ../../referencias-rapidas.json                   referências rápidas ao lado dos modelos
  ../../repertorio-normativo-complemento.json      dispositivos do repertório normativo além dos da planilha
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
# repertório normativo: dispositivos acrescentados no procs-muta (somam-se aos da planilha)
editorial['normasComplemento'] = ler(RAIZ/'apoio/repertorio-normativo-complemento.json')['registros']
# quadro de entradas rápidas das Diretrizes (atualizado na hora pelo /api/rapidas no site)
editorial['rapidas'] = ler(RAIZ/'apoio/diretrizes-rapidas.json')['registros']
# matrizes estruturais (recurso × resultado, sem matéria): moldes do Editorial
def _js(v): return json.loads(v) if isinstance(v, str) else v
def _mold(m):
    return {'id': m['id'], 'nome': m.get('nomeModelo', ''), 'resultado': m.get('resultado', ''), 'classe': m.get('classe', ''), 'fonte': m.get('fonte', ''),
            'esq': _js(m.get('esqueletoModelo')) or {},
            'par': [{k: p.get(k) for k in ('posicao', 'ordem', 'versao', 'titulo', 'texto')} for p in (_js(m.get('paragrafosModelo')) or [])]}
# só as matrizes estruturais (recurso × resultado); os padrões de ED do mesmo arquivo já estão como alternativas do Editorial (editorial_pecas.json)
editorial['matrizes'] = [_mold(m) for m in ler(RAIZ/'modelos/matrizes-estruturais.json')['registros'] if m['id'].startswith('mod-matriz-trms-')]
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
# usos dos parágrafos-padrão: trecho fixo mais longo encontrado nos inteiros teores da base
import unicodedata
def nzp(t): return re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFD', t or '').encode('ascii', 'ignore').decode().lower()).strip()
ITN = [(k, nzp(v)) for k, v in it.items()]
for p in par:
    ch = [c for c in (nzp(x) for x in re.split(r'\{[^}]*\}|\[[^\]]*\]|…|\.\.\.', p.get('texto') or '')) if len(c) >= 35]
    if not ch: continue
    lg = max(ch, key=len)
    u = [k for k, t in ITN if lg in t]
    if u and len(u) <= 0.6 * len(ITN): p['_usos'] = u
ref = ler(RAIZ/'apoio/referencias-rapidas.json')
# acervo resumido para preencher a peça pelo número do processo: classe, assunto e polos (sem documentos)
def _v(x):
    x = limpa(str(x or '').strip()); return '' if x in ('####', 'None', 'nan') else x
# ramo do direito para o cabeçalho da ementa: raiz do assunto principal na árvore do CNJ (SGT/TPU)
_SGT = ler(RAIZ/'apoio/assuntos-cnj.json').get('assuntos', {}) if (RAIZ/'apoio/assuntos-cnj.json').exists() else {}
_MAT = {'DIREITO ADMINISTRATIVO E OUTRAS MATÉRIAS DE DIREITO PÚBLICO': 'ADMINISTRATIVO', 'DIREITO À EDUCAÇÃO': 'ADMINISTRATIVO',
        'DIREITO DA SAÚDE': 'ADMINISTRATIVO', 'DIREITO DO CONSUMIDOR': 'CIVIL', 'DIREITO PROCESSUAL CIVIL E DO TRABALHO': 'PROCESSUAL CIVIL',
        'DIREITO DO TRABALHO': 'DO TRABALHO'}
_SGTN = {}
for _v0 in _SGT.values():
    _SGTN.setdefault(nzp(_v0.get('nome')), set()).add(_v0.get('ramo'))
def ramo_mat(a):
    r = None
    for f in ('Código_Assunto_Principal', 'DataJud · Código Assunto'):
        c = str(a.get(f) or '').split('.')[0].split(';')[0].strip()
        if c in _SGT and _SGT[c].get('ramo'):
            r = _SGT[c]['ramo']; break
    if not r:
        for f in ('Assunto_Principal', 'assunto_judicial', 'Assunto'):
            k = _SGTN.get(nzp(str(a.get(f) or '').split('(')[0]), ())
            if len(k) == 1:
                r = next(iter(k)); break
    if not r:
        return ''
    return _MAT.get(r, re.sub(r'^DIREITO\s+', '', r))
acx = {}
for n, a in AC.items():
    acx[n] = [_v(a.get('Classe') or a.get('classe_judicial')), _v(a.get('Assunto_Principal') or a.get('assunto_judicial')), _v(a.get('polo_ativo') or a.get('Polo_Ativo')), _v(a.get('polo_passivo') or a.get('Polo_Passivo')), ramo_mat(a)]
pacote = {'prec': prec, 'it': it, 'mod': mod, 'par': par, 'ref': ref, 'ac': acx}
gz = base64.b64encode(gzip.compress(json.dumps(pacote, ensure_ascii=False, separators=(',', ':')).encode(), 9)).decode()

js_ = js
EDJ = js(editorial)
t0 = (H/'template.html').read_text(encoding='utf-8')
JS = (H/'ementario.js').read_text(encoding='utf-8')
# Editorial · Minuta-Matriz (arquitetura D): folha com abas, canhoto do bloco e orientações; substitui a apresentação da página Peças
_AP = ler(H/'editorial_apoios.json')
_ROT = ler(H/'roteiros.json')  # catálogo de roteiros por posição, espécie e assunto (Minuta-Matriz)
_ED = ((H/'editorial_d.js').read_text(encoding='utf-8').replace('/*__DAJ__*/{}', js(_AP['ajuda'])).replace('/*__DPREL__*/[]', js(_AP['preliminares'])).replace('/*__DEMP__*/{}', js(_AP['ementa'])).replace('/*__DROT__*/{}', js(_ROT)))
_ANC = "$('#v-edit').addEventListener('click',function(e){"
assert JS.count(_ANC) == 1
JS = JS.replace(_ANC, _ED + '\n' + _ANC)
def blob_sha(p):
    b = p.read_bytes(); return hashlib.sha1(b'blob %d\0' % len(b) + b).hexdigest()
ENC_SUBS = [('vias', 'Recursos'), ('qual', 'Qual via?'), ('guias', 'Guias práticos'), ('rotina', 'Rotina do gabinete'), ('pje', 'Caixas e fluxos do PJe'),
            ('comp', 'Competência'), ('mat', 'Matérias'), ('lex', 'Léxico'), ('reg', 'Regimento')]
ENC_SECAO = ('<section id="v-enc" hidden>\n  <div class="sub" role="tablist" id="enc-sub">' + ''.join(f'<button data-s="{k}" aria-selected="{str(k == "vias").lower()}">{n}</button>' for k, n in ENC_SUBS) +
             '</div>\n  <div class="layout">\n    <aside id="enc-aside" aria-label="Navegação da enciclopédia"></aside>\n    <div class="content">\n      <div class="bar" id="enc-bar"><input class="q" id="enc-q" type="search" aria-label="Buscar na enciclopédia"></div>\n      <div id="enc-out"></div>\n    </div>\n  </div>\n</section>\n\n')
def troca(t, a, b):
    assert t.count(a) == 1, a[:70]
    return t.replace(a, b)
def montar(var):
    """var = 'compendio' (um só código: modo padrão para todos; modo avançado liberado pelo login, ver acesso.js)
             'editor'    (página do editor: grava no procs-muta pelo servidor; /editor/)"""
    t = t0
    js = JS.replace('/*__EDITOR__*/', ((H/'editor.js').read_text(encoding='utf-8') if var == 'editor' else '') + '\n' + (H/'consulta.js').read_text(encoding='utf-8'))
    css = (H/'ementario.css').read_text(encoding='utf-8') + (H/'consulta.css').read_text(encoding='utf-8') + (H/'enciclopedia.css').read_text(encoding='utf-8') + (H/'editorial_d.css').read_text(encoding='utf-8')
    from escuro import escuro  # modo noturno de #v-edit (Minuta-Matriz, Modelos, Diretrizes), gerado de editorial_d.css
    css += escuro((H/'editorial_d.css').read_text(encoding='utf-8'))
    # abas do modo avançado: Enunciados, Repertório e Enciclopédia (escondidas até o login com acesso)
    t = troca(t, '<button class="tab" role="tab" data-v="temas" aria-selected="true">Enunciados</button>', '<button class="tab" role="tab" data-v="temas" aria-selected="false" data-av hidden>Enunciados</button>')
    t = troca(t, '<button class="tab" role="tab" data-v="rep" aria-selected="false">Repertório</button>', '<button class="tab" role="tab" data-v="rep" aria-selected="false" data-av hidden>Repertório</button>')
    a = '    <button class="tab" role="tab" data-v="edit" aria-selected="false">Editorial</button>\n'
    t = troca(t, a, a + '    <button class="tab" role="tab" data-v="enc" aria-selected="false" data-av hidden>Enciclopédia</button>\n')
    t = troca(t, '<section id="v-consulta" hidden>', ENC_SECAO + '<section id="v-consulta" hidden>')
    t = t.replace('<section id="v-temas">', '<section id="v-temas" hidden>', 1)
    # Diretrizes: manual de redação novo (documento próprio, embutido; Padrões decisórios só no acesso avançado)
    t = troca(t, '<section id="v-dir" hidden>', '<script type="application/json" id="dir-manual">' + json.dumps((H/'diretrizes_manual.html').read_text(encoding='utf-8'), ensure_ascii=False).replace('<', '\\u003c') + '</script>\n<section id="v-dir" hidden>')
    js = 'window.VDM_PUBLICO=true;\n' + js + '\n' + (H/'enciclopedia.js').read_text(encoding='utf-8') + '\n' + (H/'acesso.js').read_text(encoding='utf-8')
    # identidade gêmea do Ex Officio: cabeçalho, paleta e tema compartilhado (cmt-eq-tema)
    css += (H/'publico.css').read_text(encoding='utf-8') + (H/'acesso.css').read_text(encoding='utf-8')
    t = troca(t, '<div class="brand"><small>TRF3 · Gabinete CMT</small><b>Modus Operandi · Referenciais</b></div>',
              '<div class="brand tw"><i></i></div>')
    t = troca(t, '<header class="top">', '<header class="top nx">')
    ARR = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
    a = '  <div class="right">\n'
    SV = lambda d: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'
    t = troca(t, a, a + '    <a class="hb hbx nx-tx" id="eq-not" href="/equipe/#notificacoes" title="Notificações" aria-label="Notificações">' + SV('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>') + '<span>Notificações</span><i class="bdg" id="eq-cnot" hidden></i></a>'
              '<a class="hb hbx nx-tx" id="eq-pen" href="/equipe/#pendencias" title="Diligências" aria-label="Diligências">' + SV('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 15l2 2 4-4"/>') + '<span>Diligências</span><i class="bdg" id="eq-cpen" hidden></i></a>\n'
              '    <a class="mon-lnk" href="https://trf3-muta.vercel.app/" target="_blank" rel="noopener" title="Abrir o CMT-monitor" data-av hidden>Monitor ' + ARR + '</a>'
              + ('' if var == 'editor' else '<a class="mon-lnk" id="ed-lnk" href="/editor/" title="Abrir o editor do Compendium" hidden>Editor ' + ARR + '</a>') +
              '<button class="hb ic" id="eq-atu" type="button" onclick="location.reload()" title="Atualizar" aria-label="Atualizar">' + SV('<path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/>') + '</button>\n')
    # barra unificada com o Ex Officio: cadernos no título e as seções na faixa de baixo
    i0 = t.index('  <nav class="tabs" role="tablist"'); i1 = t.index('</nav>', i0) + len('</nav>\n')
    secoes = t[i0:i1]; t = t[:i0] + t[i1:]
    abas = secoes[secoes.index('>') + 1:secoes.rindex('</nav>')]
    ordem = ['ement', 'edit', 'dir', 'consulta', 'temas', 'rep', 'enc']
    lin = {}
    for l in abas.strip().split('\n'):
        l = l.strip(); lin[l.split('data-v="')[1].split('"')[0]] = l
    abas = ''.join(lin[v] for v in ordem if v in lin)
    SL = '<span class="nx-sl" aria-hidden="true">/</span>'
    rotulo = ('<a class="eq-cmp" href="/modus/">Compendium</a>' + SL + '<span class="eq-cmp eq-ed nx-on" aria-current="page">Editor<em>.</em></span>' if var == 'editor'
              else '<a class="eq-cmp nx-on" href="/modus/" aria-current="page">Compendium<em>.</em></a>')
    k = t.index('<div class="brand tw"><i></i></div>\n') + len('<div class="brand tw"><i></i></div>\n')
    # barra editorial (Expediente), gêmea do Ex Officio: cadernos no título; as abas (.tab) seguem no cabeçalho, ocultas, e a faixa #cmp-nav as aciona
    t = t[:k] + ('  <div class="nx-bc"><span class="nx-ey">Gabinete CMT</span><nav class="nx-cad" aria-label="Cadernos"><a class="nx-lk" href="/equipe/#inicio" data-eqlink>Ex Officio</a>' + SL + rotulo + '</nav></div>'
                 '<nav class="eqtabs eq-cpn" aria-label="Seções do Compendium"><span class="eq-grp"><span class="tabs eq-sec" role="tablist" aria-label="Seções do Compendium">' + abas + '</span></span></nav><span class="eqsp"></span>\n') + t[k:]
    a = '  </div>\n</header>\n'
    t = troca(t, a, '    <span id="ac-chip" class="ac-chip"></span>\n' + a)
    js += '\n' + (H/'eqnav.js').read_text(encoding='utf-8')
    js += '\n' + (H/'padrao_paginas.js').read_text(encoding='utf-8')   # padrão comum das páginas (abertura, barra, trilho)
    t = troca(t, "try{var th=localStorage.getItem('vdm-theme');if(th)document.documentElement.setAttribute('data-theme',th);}catch(e){}",
              "try{var th=localStorage.getItem('cmt-eq-tema')||'light';document.documentElement.setAttribute('data-theme',th);}catch(e){}")
    t = troca(t, "localStorage.setItem('vdm-theme',nv);", "localStorage.setItem('vdm-theme',nv);localStorage.setItem('cmt-eq-tema',nv);")
    pre = ''
    if var == 'editor':
        cab = lambda p: {k: v for k, v in ler(p).items() if k != 'registros'}
        meta = {'repo': 'trf3bdutra/procs-muta', 'ramo': 'main', 'arquivos': {
            'modelos': {'path': 'modelos/modelos.json', 'sha': blob_sha(RAIZ/'modelos/modelos.json'), 'head': cab(RAIZ/'modelos/modelos.json')},
            'paragrafos': {'path': 'modelos/paragrafos.json', 'sha': blob_sha(RAIZ/'modelos/paragrafos.json'), 'head': cab(RAIZ/'modelos/paragrafos.json')},
            'pecas': {'path': 'apoio/modus-operandi/fonte/editorial_pecas.json', 'sha': blob_sha(H/'editorial_pecas.json')},
            'diretrizes': {'path': 'apoio/diretrizes.json', 'sha': blob_sha(RAIZ/'apoio/diretrizes.json')},
            'normas': {'path': 'apoio/repertorio-normativo-complemento.json', 'sha': blob_sha(RAIZ/'apoio/repertorio-normativo-complemento.json'), 'head': cab(RAIZ/'apoio/repertorio-normativo-complemento.json')}}}
        pre = '<script type="application/json" id="editor-meta">' + js_(meta) + '</script>\n'
        css += (H/'editor.css').read_text(encoding='utf-8')
        js = 'window.VDM_EDITOR=true;window.VDM_PAGINA_EDITOR=true;\n' + js
        t = t.replace('<title>Modus Operandi</title>', '<title>Editor · Compendium · Gabinete CMT</title>', 1)
    else:
        t = t.replace('<title>Modus Operandi</title>', '<title>Compendium · Gabinete CMT</title>', 1)
    css += (H/'nav_editorial.css').read_text(encoding='utf-8') + (H/'tema_editorial.css').read_text(encoding='utf-8') + (H/'padrao_paginas.css').read_text(encoding='utf-8')
    return t, js, css, pre
def gerar_html(var):
    t, js, css, pre = montar(var)
    for a, b in [('/*__USOS__*/', (H/'usos_auto.json').read_text(encoding='utf-8').strip()),
             ('/*__DATA__*/', (RAIZ/'apoio/vade-mecum.json').read_text(encoding='utf-8').strip().replace('</', '<\\/')),
             ('/*__EDITORIAL__*/', EDJ),
             ('<script type="application/octet-stream" id="modelos-gz">/*__MODELOS__*/</script>', '<script type="application/octet-stream" id="base-gz">' + gz + '</script>'),
             ('</style>\n</head>', css + '</style>\n</head>'),
             ('</script>\n</body>', '</script>\n' + pre + '<script>\n' + js + '</script>\n</body>')]:
        assert t.count(a) == 1, a[:60]
        t = t.replace(a, b)
    out = H.parent/('modus-operandi-editor.html' if var == 'editor' else 'modus-operandi.html')
    out.write_text(t, encoding='utf-8')
    print(f'ok {out} {len(t)//1024} KB · {len(prec)} precedentes, {len(it)} inteiros teores, {len(mod)} modelos, {len(par)} parágrafos')
gerar_html('compendio')
gerar_html('editor')
velho = H.parent/'modus-operandi-avancado.html'
if velho.exists():
    velho.unlink()   # o modo avançado agora é o próprio modus-operandi.html, liberado pelo login
