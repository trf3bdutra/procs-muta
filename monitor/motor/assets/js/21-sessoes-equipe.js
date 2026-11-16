
/* Ab Initio · Sessões de julgamento — lista e marcos das sessões, planilha da sessão, designação e regras.
   Motor de etiquetas e critérios de designação portados do CMT-Triagem (30-label-rules.js e 84-regras-sessao.js).
   Guarda o trabalho neste navegador e grava no procs-muta (acervo/operacional.json, apoio/regras/*.json, apoio/equipe.json). */
(function () {
  'use strict';
  if (window.CMTSessao) return;
  var W = window, Dc = document;
  var LS = 'cmt.sessao.v1';
  var N = function (s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dig = function (s) { return String(s == null ? '' : s).replace(/\D/g, ''); };
  var uid = function () { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var hoje = function () { return new Date().toISOString().slice(0, 10); };
  var br = function (iso) { return /^\d{4}-\d{2}-\d{2}/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : (iso || ''); };
  var isoDeBr = function (s) { var m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; };

  /* ================= vocabulário das regras de etiquetas ================= */
  var EF = {
    ED: { g: 'Tipo de julgamento', t: 'ED · Embargos de declaração', s: 'ED' },
    AgInt: { g: 'Tipo de julgamento', t: 'AgInt · Agravo interno ou regimental', s: 'AgInt' },
    JR: { g: 'Tipo de julgamento', t: 'JR · Juízo de retratação', s: 'JR' },
    META: { g: 'Metas', t: 'META pelo número da etiqueta', s: 'META' },
    meta: { g: 'Metas', t: 'Meta do CNJ (número fixo)', s: 'Meta', v: 'número da meta' },
    tema: { g: 'Tema e especificidade', t: 'Tema', s: 'Tema', v: 'tema' },
    esp: { g: 'Tema e especificidade', t: 'Especificidade', s: 'Esp.', v: 'especificidade' },
    mpf: { g: 'MPF', t: 'Atuação do MPF', s: 'MPF', v: 'hipótese' },
    ignorar: { g: 'Ignorar', t: 'Ignorar (não classifica nada)', s: 'Ignorar' }
  };
  var TIPOS = ['ED', 'AgInt', 'JR'];
  var MODOS = { inicio: 'começa por', igual: 'é igual a', contem: 'contém', fim: 'termina com', regex: 'expressão regular' };
  /* sintaxe dos termos no editor: =igual  *contém  $termina  /regex/  (sem prefixo: começa por) */
  function termoDeTexto(l) {
    l = String(l || '').trim(); if (!l) return null;
    if (/^\/.+\/$/.test(l)) return { t: l.slice(1, -1), m: 'regex' };
    if (l[0] === '=') return { t: l.slice(1).trim(), m: 'igual' };
    if (l[0] === '*') return { t: l.slice(1).trim(), m: 'contem' };
    if (l[0] === '$') return { t: l.slice(1).trim(), m: 'fim' };
    return { t: l, m: 'inicio' };
  }
  function termoParaTexto(x) { return x.m === 'regex' ? '/' + x.t + '/' : x.m === 'igual' ? '=' + x.t : x.m === 'contem' ? '*' + x.t : x.m === 'fim' ? '$' + x.t : x.t; }
  function regra(ef, termos, extra) { return Object.assign({ id: uid(), on: true, ef: ef, v: '', termos: termos, exceto: [], classes: [], nome: '', nota: '' }, extra || {}); }
  var PADRAO = { ED: ['ED', 'EDcl', 'EmbDecl', 'Embargos de declaração', 'Embargo de declaração', '*intimar ED', '*Acolher ED'], AgInt: ['AgInt', 'AgRg', 'Agravo interno', 'Agravo regimental'],
    JR: ['JR', 'Juízo de retratação', 'Retratação'], META: ['META', 'Metas', '*META 2', '*[META', '! META'], ignorar: ['*origem', '*1º grau', '*1o grau', '*primeiro grau', '*instância de origem'] };
  function regrasPadrao() {
    return Object.keys(PADRAO).map(function (k) {
      var r = regra(k, PADRAO[k].map(termoDeTexto), { id: 'pad-' + k, origem: 'padrão' });
      if (k === 'ED') r.exceto = [{ t: 'embargos a execucao', m: 'contem' }, { t: 'embargos de terceiro', m: 'contem' }, { t: 'embargos à execução', m: 'contem' }];
      if (k === 'AgInt') r.nota = 'Agravo interno contra decisão monocrática.';
      return r;
    });
  }
  var EQUIPE_PADRAO = [
    ['Dalete', 'equipe', []], ['Debora', 'equipe', ['Débora']], ['Estela', 'equipe', ['Estela Carneiro']], ['Giovana', 'equipe', []], ['José', 'equipe', ['José V.']],
    ['Maria Eduarda', 'equipe', []], ['Rodrigo', 'equipe', []], ['Victor', 'equipe', ['Víctor Neres', 'Víctor']], ['Wellington', 'equipe', []],
    ['Alexander', 'assessoria', ['Alex']], ['Bruno', 'assessoria', []], ['Renato', 'assessoria', []], ['Saffioti', 'assessoria', []], ['Salah', 'assessoria', []], ['Vanilda', 'assessoria', []]
  ].map(function (x) { return { id: 'm-' + N(x[0]).replace(/\W+/g, '-'), nome: x[0], papel: x[1], aliases: x[2], cargo: '', atribuicoes: [], pref: [], exp: [], nao: [], aus: [], nota: '' }; });
  /* grafias da equipe antiga do painel que são a mesma pessoa */
  var MESMO = { 'alex': 'Alexander', 'duda': 'Maria Eduarda', 'debora': 'Debora' };
  var CRIT = ['julg', 'tema', 'hist', 'esp', 'sec', 'pron'];
  var CRIT_T = { julg: 'Julgamento, META e recurso', tema: 'Tema ou assunto', hist: 'Histórico de assuntos', esp: 'Especialidade (preferência e experiência)', sec: 'Seção', pron: 'Pronunciamento (padrão)' };
  var CRIT_N = {
    julg: 'O tipo de julgamento (ED, AgInt, JR, agravo de instrumento) vence o assunto. META decide primeiro só na correção; na minuta, é o último critério, usado quando nenhum outro indicou alguém.',
    tema: 'Assunto do processo → servidor. Os assuntos ficam agrupados por seção e, dentro dela, por ramo do direito (tabela apoio/assuntos.json).',
    hist: 'Primeiro a tabela abaixo (assunto → servidor). Sem indicação nela, prioriza quem já minutou ou corrigiu o mesmo assunto: sessões anteriores e etiquetas do acervo com o nome do servidor ("Revisado X", "Conferido X" contam como correção).',
    esp: 'Primeiro a tabela abaixo (especificidade, assunto ou seção → servidor). Sem indicação nela, usa a ficha do servidor: preferência pesa mais que experiência; "não gosta" afasta.',
    sec: 'Seção competente → servidor.',
    pron: 'Quem recebe o que nenhum critério anterior resolveu.'
  };
  function desigPadrao() { var on = {}; CRIT.forEach(function (k) { on[k] = { d: true, c: true }; }); return { ordem: CRIT.slice(), on: on, rows: {}, equilibrar: true }; }

  /* ================= estado ================= */
  var S = carregar();
  function carregar() {
    var b = { v: 1, regras: regrasPadrao(), equipe: clone(EQUIPE_PADRAO), desig: desigPadrao(), sessoes: [], atual: '', gab: 'Gab. A da Turma Regional de Mato Grosso do Sul', equipePainel: false };
    try { var d = JSON.parse(localStorage.getItem(LS) || 'null'); if (d && d.v === 1) { b = Object.assign(b, d); } } catch (e) {}
    if (!b.desig || !Array.isArray(b.desig.ordem)) b.desig = desigPadrao();
    CRIT.forEach(function (k) { if (b.desig.ordem.indexOf(k) < 0) b.desig.ordem.push(k); if (!b.desig.on[k]) b.desig.on[k] = { d: true, c: true }; });
    return b;
  }
  var tSave = 0;
  function salvar() { clearTimeout(tSave); tSave = setTimeout(function () { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { toast('Não foi possível guardar neste navegador: ' + e.message); } pill(); }, 200); }
  function sessaoReal() { return S.atual ? S.sessoes.find(function (x) { return x.id === S.atual; }) || null : null; }
  /* pré-pauta: a mesma planilha da sessão, com a lista da seleção prévia (ss.previa) no lugar dos itens da pauta */
  var VISTAS = new WeakMap();
  function vistaPrevia(ss) { var v = VISTAS.get(ss); if (!v) { v = Object.create(ss); VISTAS.set(ss, v); } ss.previa = ss.previa || []; v.itens = ss.previa; v.__previa = true; return v; }
  /* importado o PDF, a pauta é fixa: a pré-pauta fica encerrada e não há lista paralela */
  function preAberta(ss) { return !!ss && !(ss.itens || []).length; }
  function sessao() { var ss = sessaoReal(); if (ss && UI.versao === 'pre' && !preAberta(ss)) UI.versao = 'pos'; return ss && UI.versao === 'pre' ? vistaPrevia(ss) : ss; }
  function nomesNoPainel(ss) { var c = comp(), out = [br(ss.data)]; if (c && c.sessions) c.sessions.forEach(function (n) { var m = (c.sessionDetails || {})[n] || {}; if ((m.date || isoDeBr(n)) === ss.data && out.indexOf(n) < 0) out.push(n); }); return out; }
  function linhasSelecao(ss) { var c = comp(); if (!c || !c.rows) return []; var nomes = nomesNoPainel(ss);
    return c.rows.filter(function (r) { return r['Seleção Prévia'] === 'SELECIONADO PREVIAMENTE' && nomes.indexOf(r['Sessão Destino'] || '') >= 0; }).sort(function (a, b) { return (Number(a._preOrder) || 0) - (Number(b._preOrder) || 0); }); }
  function fmtCnj(v) { var d = dig(v); return d.length === 20 ? d.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6') : String(v || ''); }
  /* a lista da pré-pauta acompanha a seleção prévia do acervo; designações e anotações de cada processo ficam */
  function sincronizarPrevia(ss) {
    var rows = linhasSelecao(ss), antes = new Map((ss.previa || []).map(function (i) { return [dig(i.cnj), i]; })), mudou = rows.length !== (ss.previa || []).length;
    var exc = ss.exclPre || {}; rows = rows.filter(function (r) { return !exc[dig(r.Processo || r.processo)]; });
    var nova = rows.map(function (r, i) { var cj = fmtCnj(r.Processo || r.processo), o = antes.get(dig(cj));
      if (!o) { mudou = true; o = { cnj: cj, item: '', assunto: r.Assunto || r.assunto_judicial || '', classe: r.classe_judicial || r.Classe || '', partes: '', relator: S.gab, servidor: r.SERVIDOR || '', corretor: r.CORRETOR || '', porD: '', porC: '', tipoManual: '', resultado: '', dataMinuta: '', dataCorrecao: '', dataLiberacao: '', obs: '' }; }
      var it = String(r['Numeração Prévia'] || i + 1); if (o.item !== it) { o.item = it; mudou = true; } return o; });
    var ja = {}; nova.forEach(function (o) { ja[dig(o.cnj)] = 1; });
    var nx = nova.reduce(function (m, o) { return Math.max(m, +o.item || 0); }, 0);
    (ss.previa || []).forEach(function (o) { if (o.manual && !ja[dig(o.cnj)]) { var ni = String(++nx); if (o.item !== ni) { o.item = ni; mudou = true; } nova.push(o); ja[dig(o.cnj)] = 1; } });
    if (nova.length !== (ss.previa || []).length) mudou = true;
    if (mudou) { ss.previa = nova; HIST = null; salvar(); }
    return ss.previa || [];
  }

  /* ================= painel (componente principal) ================= */
  function comp() { return W.__painelCentralComponent || null; }
  function fundirEquipePainel() {
    var c = comp(); if (!c || S.equipePainel || !c.globalConfigSnapshot) return;
    var cfg; try { cfg = c.globalConfigSnapshot(); } catch (e) { return; }
    var mem = (cfg.team && cfg.team.members) || [], cat = {}; ((cfg.team && cfg.team.catalog) || []).forEach(function (a) { cat[a.id] = a.name; });
    if (!mem.length) return;
    mem.forEach(function (m) {
      var nome = MESMO[N(m.name)] || m.name, x = membro(nome);
      var atrib = (m.functions || []).map(function (f) { return cat[f] || (f === 'minutar' ? 'Elaboração de minutas' : f === 'corrigir' ? 'Correção de minutas' : f); });
      if (!x) { x = { id: 'm-' + uid(), nome: nome.length <= 3 ? nome : nome.charAt(0) + nome.slice(1).toLowerCase(), papel: 'equipe', aliases: [], cargo: '', atribuicoes: [], pref: [], exp: [], nao: [], aus: [], nota: 'Veio da equipe antiga do painel.' }; S.equipe.push(x); }
      if (N(m.name) !== N(x.nome) && (x.aliases || []).every(function (a) { return N(a) !== N(m.name); })) (x.aliases = x.aliases || []).push(m.name);
      if (m.hierarchy && m.hierarchy !== 'Membro do Time' && !x.cargo) x.cargo = m.hierarchy;
      atrib.forEach(function (a) { x.atribuicoes = x.atribuicoes || []; if (x.atribuicoes.indexOf(a) < 0) x.atribuicoes.push(a); });
      (m.absences || []).forEach(function (a) { if (a.from && a.to && !(x.aus || []).some(function (y) { return y.de === a.from && y.ate === a.to; })) (x.aus = x.aus || []).push({ de: a.from, ate: a.to }); });
    });
    S.equipePainel = true; salvar();
  }
  function calendario() { var c = comp(); try { return (c && c.selectionCalendar && c.selectionCalendar()) || { weekdays: [1, 2, 3, 4, 5], excluded: [] }; } catch (e) { return { weekdays: [1, 2, 3, 4, 5], excluded: [] }; } }
  function gravarCalendario(cal) {
    var c = comp(); if (!c) return;
    c._prePanelState = c._prePanelState || { prefs: {}, daily: {}, ui: {} }; c._prePanelState.calendar = cal;
    try { c.syncConfigSeed && c.syncConfigSeed(); c.saveDeb && c.saveDeb(); c.refresh && c.refresh(); } catch (e) {}
  }
  /* marcos: a sessão da pauta e a sessão do painel (Seleção Prévia) são a mesma; os prazos ficam iguais nas duas */
  var FASE_PAINEL = { pauta: 'pautaDeadline', inicio: 'prepStart', minutas: 'minutasDeadline', liberacao: 'releaseDeadline' };
  function marcosDoPainel(ss) {
    var c = comp(), m = c && c.sessionDetails && c.sessionDetails[br(ss.data)]; if (!m) return;
    ss.fases = ss.fases || {}; Object.keys(FASE_PAINEL).forEach(function (k) { if (!ss.fases[k] && m[FASE_PAINEL[k]]) ss.fases[k] = m[FASE_PAINEL[k]]; });
  }
  function marcosParaPainel(ss) {
    var c = comp(); if (!c || !c.setSessionMeta || !ss.data) return;
    var nome = br(ss.data);
    try {
      c.setSessionMeta(nome, 'date', ss.data);
      if (S.gab) c.setSessionMeta(nome, 'gabinete', S.gab);
      Object.keys(FASE_PAINEL).forEach(function (k) { if ((ss.fases || {})[k] != null) c.setSessionMeta(nome, FASE_PAINEL[k], ss.fases[k] || ''); });
    } catch (e) { toast('Não consegui atualizar a sessão no painel: ' + e.message); }
  }
  /* assuntos do procs-muta (apoio/assuntos.json): seção e ramo de cada assunto, para a seção competente e os filtros */
  var CATALOGO = null;
  function ramoCurto(r) {
    var d = N(r).replace(/^direito\s+(?:(?:a|da|do|de)\s+)?/, '');
    if (!d) return '';
    if (/^administrativo/.test(d)) return 'Administrativo e Dir. Público';
    if (/^processual civil/.test(d)) return 'Processual Civil e do Trabalho';
    var s = String(r).replace(/^DIREITO\s+(?:(?:À|A|DA|DO|DE)\s+)?/i, '').toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  async function carregarAssuntos() {
    if (!W.ProcsMuta) return;
    try {
      var d = JSON.parse(await W.ProcsMuta.ler('apoio/assuntos.json'));
      CATALOGO = (d.registros || []).map(function (a) {
        return { id: a.id, name: a.nome, aliases: a.sinonimos || [], section: a.secao || '', ramo: a.ramo || '', ramoCurto: ramoCurto(a.ramo), cnjCode: a.codigoCNJ || '',
          tags: a.etiquetas || [], specs: a.especificacoes || [], active: a.ativo !== false, sectionBasis: a.fundamentoSecao || '' };
      });
      aplicarCatalogo(true);
    } catch (e) { console.warn('[sessão] apoio/assuntos.json:', e.message); }
  }
  var catKey = '';
  function aplicarCatalogo(forcar) {
    var c = comp(); if (!c || !CATALOGO) return;
    var rows = c.rows || [], key = rows.length + '|' + (rows[0] && rows[0].processo);
    if (!forcar && c.subjectCatalog === CATALOGO && key === catKey) return;
    c.subjectCatalog = CATALOGO; catKey = key;
    rows.forEach(function (r) { try { r['Seção Competente'] = c.secaoCompetente(r); r['Ramo'] = c.ramoAssunto ? c.ramoAssunto(r) : ''; } catch (e) {} });
    try { c.refresh && c.refresh(); } catch (e) {}
  }
  /* sessões que o painel já conhecia (Seleção Prévia) entram na lista, sem pauta */
  function sessoesDoPainel() {
    var c = comp(); if (!c || !REPO.lido || S.sessoesPainel || !c.sessions || !c.sessionDetails) return;
    (c.sessions || []).forEach(function (nome) {
      var m = c.sessionDetails[nome] || {}, data = m.date || isoDeBr(nome); if (!data || S.sessoes.some(function (x) { return x.data === data; })) return;
      S.sessoes.push(novaSessao(data, { pauta: m.pautaDeadline || m.deadline || '', inicio: m.prepStart || '', minutas: m.minutasDeadline || '', liberacao: m.releaseDeadline || '' }));
    });
    S.sessoesPainel = true; salvar(); render();
  }
  function novaSessao(data, fases) { return { id: 's' + data + '-' + Math.random().toString(36).slice(2, 5), data: data, hora: '', numero: '', arquivo: '', fases: Object.assign({ pauta: '', inicio: '', minutas: '', liberacao: '' }, fases || {}), itens: [] }; }
  setInterval(function () { aplicarCatalogo(false); if (REPO.lido) fundirEquipePainel(); sessoesDoPainel(); }, 1500);

  /* ================= procs-muta: leitura e gravação =================
     acervo/sessoes/calendario.json  calendário de sessões (datas, hora, marcos)
     acervo/sessoes/AAAA-MM-DD.json  pauta de cada sessão (item, quem minuta, quem corrige, entregas)
     apoio/regras/etiquetas.json · apoio/regras/designacao.json · apoio/equipe.json */
  var ARQ = { cal: 'acervo/sessoes/calendario.json', regras: 'apoio/regras/etiquetas.json', desig: 'apoio/regras/designacao.json', equipe: 'apoio/equipe.json' };
  var ROT = { cal: 'calendário de sessões', regras: 'regras de etiquetas', desig: 'regras de designação', equipe: 'equipe' };
  var REPO = { lido: false, erro: '', gravando: false };
  var arqSessao = function (data) { return 'acervo/sessoes/' + data + '.json'; };
  function rotulo(k) { return ROT[k] || (k.indexOf('ses:') === 0 ? 'pauta de ' + br(k.slice(4)) : k.indexOf('del:') === 0 ? 'exclusão de ' + br(k.slice(4)) : k); }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function calParaRepo(ss) {
    var f = ss.fases || {};
    return { nome: br(ss.data), date: ss.data, hora: ss.hora || '', numeroPje: ss.numero || '', arquivo: ss.arquivo || '', planilha: ss.planilha || '', gabinete: S.gab,
      marcos: { pautarAte: f.pauta || '', inicioPreparacao: f.inicio || '', entregaMinutas: f.minutas || '', liberacao: f.liberacao || '' }, processos: (ss.itens || []).length, previa: (ss.itens || []).length ? 0 : (ss.previa || []).length, cor: ss.cor || '', excluidosPre: Object.keys(ss.exclPre || {}), publicada: !!ss.publicada, marcosPublicados: !!(ss.marcosPub || ss.publicada) };
  }
  function itensParaRepo(ss, lista) {
    return (lista || ss.itens || []).map(function (it) { return { cnj: it.cnj, item: it.item || '', assunto: it.assunto || '', classe: it.classe || '', partes: it.partes || '',
      servidor: it.servidor || '', corretor: it.corretor || '', criterioMinuta: it.porD || '', criterioCorrecao: it.porC || '', julgamento: it.tipoManual || '', resultado: it.resultado || '',
      dataMinuta: it.dataMinuta || '', dataCorrecao: it.dataCorrecao || '', dataLiberacao: it.dataLiberacao || '', obs: it.obs || '', ctl: ctlDe(it) }; });
  }
  var CTL_K = ['detalhes','mpf','parecer','prelim','tempest','preparo','repres','midias','resJulg','consect','honor','topico','intercor','etapa','meta','manual','cartao','editadoPor','editadoEm'];
  function ctlDe(it) { var o = {}; CTL_K.forEach(function (k) { if (it[k]) o[k] = it[k]; }); return o; }
  function itemDoRepo(it) {
    return { cnj: it.cnj, item: String(it.item || ''), assunto: it.assunto || '', classe: it.classe || '', partes: it.partes || '', relator: S.gab,
      servidor: it.servidor || '', corretor: it.corretor || '', porD: it.criterioMinuta || '', porC: it.criterioCorrecao || '', tipoManual: it.julgamento || '', resultado: it.resultado || '',
      dataMinuta: it.dataMinuta || '', dataCorrecao: it.dataCorrecao || '', dataLiberacao: it.dataLiberacao || '', obs: it.obs || '', ...(it.ctl || {}) };
  }
  function sessaoDoRepo(o, itens, previa, regrasDesignacao) {
    var data = o.date || isoDeBr(o.nome), m = o.marcos || {};
    return { id: 's' + data + '-r', data: data, hora: o.hora || '', cor: o.cor || '', publicada: !!o.publicada, marcosPub: !!(o.marcosPublicados || o.publicada), numero: o.numeroPje || '', arquivo: o.arquivo || '', planilha: o.planilha || '',
      fases: { pauta: m.pautarAte || '', inicio: m.inicioPreparacao || '', minutas: m.entregaMinutas || '', liberacao: m.liberacao || '' },
      itens: (itens || o.itens || []).map(itemDoRepo), previa: (previa || []).map(itemDoRepo), desigOverride: regrasDesignacao || o.regrasDesignacao || null, exclPre: (o.excluidosPre || []).reduce(function (a, k) { a[k] = 1; return a; }, {}) };
  }
  function chaves() {
    var k = Object.keys(ARQ).slice();
    S.sessoes.forEach(function (ss) { if (ss.itens.length || (ss.previa || []).length || ss.desigOverride || (S.sync || {})['ses:' + ss.data]) k.push('ses:' + ss.data); });
    (S.apagadas || []).forEach(function (d) { if ((S.sync || {})['ses:' + d] && !S.sessoes.some(function (x) { return x.data === d; })) k.push('del:' + d); });
    return k;
  }
  function conteudo(k) {
    if (k === 'cal') { var cx = calendario(), ex = expediente(); return JSON.stringify({ sessoes: ordenadas().slice().sort(function (a, b) { return a.data.localeCompare(b.data); }).map(calParaRepo),
      expediente: { diasSemana: cx.weekdays || [1, 2, 3, 4, 5], semExpediente: (cx.excluded || []).slice().sort(), nomes: ex.nomes || {}, tipos: ex.tipos || {}, semPrazo: (ex.semPrazo || []).slice().sort(), recesso: ex.recesso || [] } }); }
    if (k.indexOf('ses:') === 0) { var ss = S.sessoes.find(function (x) { return x.data === k.slice(4); }); return JSON.stringify(ss ? ((ss.previa || []).length ? { itens: itensParaRepo(ss), previa: itensParaRepo(ss, ss.previa), regrasDesignacao: ss.desigOverride || null } : { itens: itensParaRepo(ss), regrasDesignacao: ss.desigOverride || null }) : null); }
    if (k.indexOf('del:') === 0) return 'del';
    return JSON.stringify(k === 'regras' ? S.regras : k === 'desig' ? S.desig : S.equipe);
  }
  function pendentes() { S.sync = S.sync || {}; return chaves().filter(function (k) { return S.sync[k] !== hash(conteudo(k)); }); }
  async function carregarRepo() {
    if (!W.ProcsMuta) { REPO.lido = true; return; }
    var ler = async function (rel) { try { return JSON.parse(await W.ProcsMuta.ler(rel)); } catch (e) { if (!/404/.test(e.message)) REPO.erro = e.message; return null; } };
    S.sync = S.sync || {};
    var antes = pendentes(), sujoSes = S.sync.cal && antes.some(function (k) { return k === 'cal' || /^(ses|del):/.test(k); });
    var cal = await ler(ARQ.cal), sessoes = null;
    if (cal && cal.expediente && !(S.sync.cal && antes.indexOf('cal') >= 0)) { var ce = cal.expediente; S.expediente = { nomes: ce.nomes || {}, tipos: ce.tipos || {}, semPrazo: ce.semPrazo || [], recesso: ce.recesso || expediente().recesso };
      try { var c0 = calendario(); if (Array.isArray(ce.semExpediente) && JSON.stringify((c0.excluded || []).slice().sort()) !== JSON.stringify(ce.semExpediente)) gravarCalendario({ weekdays: ce.diasSemana || c0.weekdays || [1, 2, 3, 4, 5], excluded: ce.semExpediente.slice() }); } catch (e) {} }
    if (cal && Array.isArray(cal.sessoes)) {
      var docs = await Promise.all(cal.sessoes.map(function (o) { return o.processos || o.previa ? ler(arqSessao(o.date)) : Promise.resolve(null); }));
      sessoes = cal.sessoes.map(function (o, i) { return sessaoDoRepo(o, docs[i] && Array.isArray(docs[i].itens) ? docs[i].itens : [], docs[i] && Array.isArray(docs[i].previa) ? docs[i].previa : [], docs[i] && docs[i].regrasDesignacao); });
    } else {
      var op = await ler('acervo/operacional.json');   /* formato anterior: sessões dentro do operacional */
      if (op && Array.isArray(op.sessoes) && op.sessoes.length) sessoes = op.sessoes.map(function (o) { return sessaoDoRepo(o); });
    }
    var v = { regras: await ler(ARQ.regras), desig: await ler(ARQ.desig), equipe: await ler(ARQ.equipe) };
    var val = { regras: v.regras && Array.isArray(v.regras.registros) ? v.regras.registros : null,
      desig: v.desig && v.desig.criterios && Array.isArray(v.desig.criterios.ordem) ? v.desig.criterios : null,
      equipe: v.equipe && Array.isArray(v.equipe.registros) ? v.equipe.registros : null };
    var mantidas = [];
    if (sessoes) {
      if (sujoSes) mantidas.push('sessões');
      else {
        var atual = (sessao() || {}).data; S.sessoes = sessoes; var a = S.sessoes.find(function (x) { return x.data === atual; }); S.atual = a ? a.id : ''; S.sessoesPainel = true; S.apagadas = [];
        if (cal) { S.sync.cal = hash(conteudo('cal')); S.sessoes.forEach(function (ss) { if (ss.itens.length || (ss.previa || []).length) S.sync['ses:' + ss.data] = hash(conteudo('ses:' + ss.data)); }); }
      }
    }
    ['regras', 'desig', 'equipe'].forEach(function (k) {
      if (!val[k]) return;
      if (S.sync[k] && S.sync[k] !== hash(conteudo(k))) { mantidas.push(ROT[k]); return; }
      if (k === 'regras') S.regras = val[k]; else if (k === 'desig') S.desig = val[k]; else { S.equipe = val[k]; S.equipePainel = true; }
      S.sync[k] = hash(conteudo(k));
    });
    if (S.desig) CRIT.forEach(function (k) { if (S.desig.ordem.indexOf(k) < 0) S.desig.ordem.push(k); if (!S.desig.on[k]) S.desig.on[k] = { d: true, c: true }; });
    REPO.lido = true; HIST = null; RX.clear(); salvar(); render();
    if (mantidas.length) toast('Alterações deste navegador ainda não gravadas: ' + mantidas.join(', ') + '.');
    if (REPO.erro) toast('procs-muta: ' + REPO.erro);
  }
  /* liberar ou retirar a pauta da equipe grava na hora: a Ex Officio e a Consulta do Modus Operandi refletem em seguida */
  /* publicação para a equipe, em duas partes: os marcos da sessão (calendário e página inicial da Ex Officio) e a listagem da pauta
     (processos, minutas, correções). Publicar a listagem publica também os marcos; retirar os marcos retira também a listagem. */
  async function publicar(sx, oque) {
    oque = oque || 'pauta';
    if (oque === 'marcos') { sx.marcosPub = !(sx.marcosPub || sx.publicada); if (!sx.marcosPub) sx.publicada = false; }
    else { sx.publicada = !sx.publicada; if (sx.publicada) sx.marcosPub = true; }
    salvar(); render();
    var msg = oque === 'marcos' ? (sx.marcosPub ? 'Marcos da sessão de ' + br(sx.data) + ' publicados para a equipe' : 'Marcos da sessão de ' + br(sx.data) + ' retirados da equipe' + (sx.publicada ? '' : ' (com a listagem)'))
      : (sx.publicada ? 'Pauta de ' + br(sx.data) + ' liberada para a equipe (listagem e marcos)' : 'Listagem da pauta de ' + br(sx.data) + ' retirada da equipe (os marcos continuam publicados)');
    if (!W.ProcsMuta || !W.ProcsMuta.gravar || !REPO.lido) { toast(msg + ' neste navegador. Grave no procs-muta para valer.'); return; }
    await gravar();
    toast(msg + (oque === 'pauta' && sx.publicada ? ': já aparece na Ex Officio e na Consulta do Modus Operandi.' : '.'));
    render();
  }
  async function gravar() {
    if (!W.ProcsMuta || !W.ProcsMuta.gravar) { toast('Gravação no procs-muta indisponível nesta página.'); return { ok: false, erro: 'Gravação no procs-muta indisponível nesta página.' }; }
    if (!REPO.lido) return { ok: false, erro: 'O procs-muta ainda não foi lido; aguarde a carga antes de gravar.' };
    if (REPO.gravando) return { ok: false, ocupado: true, erro: 'Gravação em andamento.' };
    var P = pendentes(); if (!P.length) { toast('Nada a gravar: tudo igual ao procs-muta.'); return { ok: true, nada: true, partes: [] }; }
    REPO.gravando = true; pill(); var RES;
    try {
      var files = {}, agora = new Date().toISOString();
      /* o que a equipe gravou pela Ex Officio depois da última leitura prevalece sobre a cópia deste navegador */
      for (var pi = 0; pi < P.length; pi++) { var kk = P[pi]; if (kk.indexOf('ses:') !== 0) continue; var sx = S.sessoes.find(function (x) { return x.data === kk.slice(4); }); if (!sx) continue;
        var rem = null; try { rem = JSON.parse(await W.ProcsMuta.ler(arqSessao(sx.data))); } catch (e) { rem = null; } if (!rem) continue;
        ['itens', 'previa'].forEach(function (ln) { (rem[ln] || []).forEach(function (ri) { var rc = ri.ctl || {}; if (!rc.editadoEm) return; var li = (sx[ln] || []).find(function (x) { return dig(x.cnj) === dig(ri.cnj); }); if (!li || (li.editadoEm || '') >= rc.editadoEm) return;
          ['dataMinuta', 'dataCorrecao', 'dataLiberacao', 'obs'].forEach(function (f) { li[f] = ri[f] || ''; });
          ['mpf', 'parecer', 'prelim', 'tempest', 'preparo', 'repres', 'midias', 'resJulg', 'consect', 'honor', 'topico', 'intercor'].forEach(function (f) { li[f] = rc[f] || ''; });
          li.cartao = Object.assign({}, li.cartao || {}, rc.cartao || {}); li.editadoPor = rc.editadoPor; li.editadoEm = rc.editadoEm; }); }); }
      P.forEach(function (k) {
        if (k === 'cal') files[ARQ.cal] = JSON.stringify({ schema: 'gabcmt.calendario-sessoes', versao: 1, atualizadoEm: agora, sessoes: JSON.parse(conteudo('cal')).sessoes, expediente: JSON.parse(conteudo('cal')).expediente }, null, 1) + '\n';
        else if (k.indexOf('ses:') === 0) { var d = k.slice(4); files[arqSessao(d)] = JSON.stringify(Object.assign({ schema: 'gabcmt.sessao', versao: 1, nome: br(d), date: d, atualizadoEm: agora, itens: [] }, (function (x) { return Array.isArray(x) ? { itens: x } : x || {}; })(JSON.parse(conteudo(k)))), null, 1) + '\n'; }
        else if (k.indexOf('del:') === 0) files[arqSessao(k.slice(4))] = null;
        else files[ARQ[k]] = JSON.stringify(k === 'regras' ? { schema: 'gabcmt.regras.etiquetas', versao: 1, atualizadoEm: agora, registros: S.regras }
          : k === 'desig' ? { schema: 'gabcmt.regras.designacao', versao: 1, atualizadoEm: agora, criterios: S.desig }
          : { schema: 'gabcmt.equipe', versao: 1, atualizadoEm: agora, registros: S.equipe }, null, 1) + '\n';
      });
      if (P.some(function (k) { return k === 'cal' || /^(ses|del):/.test(k); })) {
        var op = null; try { op = JSON.parse(await W.ProcsMuta.ler('acervo/operacional.json')); } catch (e) {}
        if (op && op.schema === 'gabA.operacional') {
          var pautas = {}; S.sessoes.forEach(function (ss) { ss.itens.forEach(function (it) { (pautas[dig(it.cnj)] = pautas[dig(it.cnj)] || []).push({ sessao: ss.data, item: it.item || '', resultado: it.resultado || '' }); }); });
          var prod = {}; ordenadas().slice().sort(function (a, b) { return a.data.localeCompare(b.data); }).forEach(function (ss) { (ss.previa || []).concat(ss.itens).forEach(function (it) { var d = dig(it.cnj), P0 = prod[d] || (prod[d] = {});
            [['MINUTADO', it.dataMinuta], ['CORRIGIDO', it.dataCorrecao], ['LIBERADO', it.dataLiberacao], ['Data da Liberação', it.dataLiberacao], ['SERVIDOR', it.servidor], ['CORRETOR', it.corretor]].forEach(function (kv) { if (kv[1]) P0[kv[0]] = kv[1]; }); }); });
          var regs = op.registros || [], vistos = {}, mud = false;
          regs.forEach(function (r) { var P1 = prod[dig(r.processo)]; if (!P1 || !r.pauta) return; r.producao = r.producao || {}; var alt = false;
            Object.keys(P1).forEach(function (k) { if (r.producao[k] !== P1[k]) { r.producao[k] = P1[k]; alt = true; } }); if (alt) { (r.origem = r.origem || {}).atualizado_em = agora; mud = true; } });
          regs.forEach(function (r) { var d = dig(r.processo); vistos[d] = 1; var novo = (pautas[d] || []).sort(function (a, b) { return a.sessao.localeCompare(b.sessao); });
            if (r.pauta) { var atual = r.pauta.sessoes || [], mesc = novo.map(function (n) { var x = atual.find(function (y) { return y.sessao === n.sessao; }); return x ? Object.assign({}, x, { item: n.item || x.item, resultado: n.resultado || x.resultado }) : n; });
              atual.forEach(function (x) { if (!mesc.some(function (n) { return n.sessao === x.sessao; }) && x.sessao < new Date().toISOString().slice(0, 10)) mesc.push(x); }); mesc.sort(function (a, b) { return a.sessao.localeCompare(b.sessao); });
              if (JSON.stringify(atual) !== JSON.stringify(mesc)) { r.pauta.sessoes = mesc; (r.origem = r.origem || {}).atualizado_em = agora; mud = true; } return; }
            if (JSON.stringify(r.pautas || []) !== JSON.stringify(novo)) { if (novo.length) r.pautas = novo; else delete r.pautas; r.atualizado_em = agora; mud = true; } });
          Object.keys(pautas).forEach(function (d) { if (vistos[d]) return; var c = (S.sessoes.reduce(function (x, ss) { return x || ss.itens.find(function (i) { return dig(i.cnj) === d; }); }, null) || {}).cnj || d;
            var ss = pautas[d].sort(function (a, b) { return a.sessao.localeCompare(b.sessao); });
            regs.push(op.schema_versao >= 2 ? { processo: c, origem: { atualizado_em: agora }, triagem: {}, producao: {}, pauta: { sessoes: ss } } : { processo: c, pautas: ss, atualizado_em: agora }); mud = true; });
          if (mud) { op.registros = regs; op.atualizado_em = agora; files['acervo/operacional.json'] = JSON.stringify(op, null, 1) + '\n'; }
        }
      }
      await W.ProcsMuta.gravar(files, 'Ab Initio: ' + P.map(rotulo).join(', '));
      P.forEach(function (k) { if (k.indexOf('del:') === 0) delete S.sync['ses:' + k.slice(4)]; else S.sync[k] = hash(conteudo(k)); });
      S.apagadas = (S.apagadas || []).filter(function (d) { return P.indexOf('del:' + d) < 0; });
      salvar(); toast('Gravado no procs-muta: ' + P.map(rotulo).join(', ') + '.'); RES = { ok: true, partes: P.map(rotulo), em: new Date().toISOString() };
    } catch (e) { toast('Falha ao gravar: ' + e.message); RES = { ok: false, erro: e.message }; }
    REPO.gravando = false; pill(); return RES;
  }
  function pill() {
    var P = REPO.lido ? pendentes() : [];
    ['cs-pill', 'cs-pill2'].forEach(function (id) { var el = Dc.getElementById(id); if (!el) return;
    el.className = 'cs-pill' + (P.length ? ' sujo' : '');
    if (id === 'cs-pill2') { el.title = P.length ? 'Não gravado: ' + P.map(function (k) { return rotulo(k); }).join(', ') : ''; el.innerHTML = REPO.gravando ? 'Gravando…' : !REPO.lido ? 'Lendo…' : P.length ? '● ' + P.length + ' alteração(ões) não gravada(s) <button class="cs-btn gold" data-cs="gravar">Gravar</button>' : '✓ Igual ao procs-muta'; return; }
    el.innerHTML = REPO.gravando ? 'Gravando no procs-muta…' : !REPO.lido ? 'Lendo o procs-muta…' : P.length
      ? '● Não gravado: ' + esc(P.map(function (k) { return rotulo(k); }).join(', ')) + ' <button class="cs-btn gold" data-cs="gravar">Gravar no procs-muta</button>'
      : '✓ Igual ao procs-muta'; });
  }

  /* ================= acervo ================= */
  var AC = { key: '', by: new Map(), rows: [] };
  function acervo() {
    var c = W.__painelCentralComponent, rows = (c && c.rows) || [];
    var key = rows.length + '|' + (rows[0] && (rows[0].processo || rows[0].Processo));
    if (AC.key !== key) { var m = new Map(); rows.forEach(function (r) { var k = dig(r.processo || r.Processo); if (k) m.set(k, r); }); AC = { key: key, by: m, rows: rows }; HIST = null; }
    return AC;
  }
  function etiquetas(r) {
    var s = r ? (r['Etiquetas'] || r['Etiquetas Originais'] || r.etiquetas || '') : '';
    if (Array.isArray(s)) return s.map(String).filter(Boolean);
    return String(s).replace(/(\d)\s*,\s*(\d+\s*%)/g, '$1¤$2').split(/\s*[,;|\n]\s*/).map(function (t) { return t.replace('¤', ',').trim(); }).filter(Boolean);
  }
  function campo(r, nomes) { for (var i = 0; i < nomes.length; i++) { var v = r && r[nomes[i]]; if (v != null && String(v).trim()) return String(v).trim(); } return ''; }

  /* ================= motor de etiquetas ================= */
  var RX = new Map();
  function rx(raw) { if (RX.has(raw)) return RX.get(raw); var re = null; try { re = new RegExp(N(raw), 'i'); } catch (e) {} RX.set(raw, re); return re; }
  function casa(d, x) {
    var q = N(x.t); if (!q) return false;
    switch (x.m) {
      case 'igual': return d === q;
      case 'contem': return d.indexOf(q) >= 0;
      case 'fim': return d.slice(-q.length) === q;
      case 'regex': var re = rx(x.t); return !!re && re.test(d);
      default: return d === q || (d.indexOf(q) === 0 && !/[a-z]/.test(d.charAt(q.length)));
    }
  }
  function ativas() { return S.regras.filter(function (r) { return r.on && r.termos.length && (!EF[r.ef] || !EF[r.ef].v || r.v); }); }
  function casaRegra(r, d) { return r.termos.some(function (x) { return casa(d, x); }) && !r.exceto.some(function (x) { return casa(d, x); }); }
  function classeOK(r, classe) { return !r.classes.length || !classe || r.classes.some(function (c) { return N(c) === N(classe); }); }
  /* números de meta: 1 ou 2 dígitos logo após "meta(s)", de 1 a 12 (anos e datas não contam) */
  function numerosMeta(d) {
    var out = [], re = /metas?\s*(?:cnj\s*)?[-:#]?\s*0?(\d{1,2})(?!\d)((?:\s*(?:e|,|\/)\s*0?\d{1,2}(?!\d))*)/g, m;
    while ((m = re.exec(d))) { [m[1]].concat((m[2] || '').match(/\d{1,2}/g) || []).forEach(function (n) { n = String(Number(n)); if (+n >= 1 && +n <= 12 && out.indexOf(n) < 0) out.push(n); }); }
    return out;
  }
  function classificar(tags, classe) {
    var R = ativas(), out = { tipo: '', metas: [], tema: [], esp: [], mpf: [], ign: [], usadas: [], livres: [] };
    var vivas = [];
    tags.forEach(function (t) {
      var d = N(t), H = R.filter(function (r) { return casaRegra(r, d) && classeOK(r, classe); });
      if (H.some(function (r) { return r.ef === 'ignorar'; })) { out.ign.push(t); return; }
      vivas.push([t, d, H]); if (H.length) out.usadas.push(t); else out.livres.push(t);
    });
    for (var i = 0; i < TIPOS.length && !out.tipo; i++) { var k = TIPOS[i]; if (vivas.some(function (v) { return v[2].some(function (r) { return r.ef === k; }); })) out.tipo = k; }
    var push = function (a, v) { if (v && a.indexOf(v) < 0) a.push(v); };
    vivas.forEach(function (v) {
      v[2].forEach(function (r) {
        if (r.ef === 'meta') push(out.metas, String(r.v));
        else if (r.ef === 'META') { var ns = numerosMeta(v[1]); if (ns.length) ns.forEach(function (n) { push(out.metas, n); }); else if (!v[2].some(function (x) { return x.ef === 'meta'; })) push(out.metas, '?'); }
        else if (r.ef === 'tema' || r.ef === 'esp' || r.ef === 'mpf') push(out[r.ef], r.v);
      });
    });
    out.metas = out.metas.filter(function (m) { return m !== '?' || out.metas.length === 1; });
    return out;
  }
  function recursoDaClasse(classe) {
    var c = N(classe);
    if (/agravo de instrumento|(^|\W)ai(\W|$)/.test(c)) return 'AI';
    if (/remessa necessaria/.test(c) && /apela/.test(c)) return 'ApelRemNec';
    if (/remessa necessaria/.test(c)) return 'RemNec';
    if (/efeito suspensivo/.test(c)) return 'SuspApel';
    if (/apelacao/.test(c)) return 'ApCiv';
    return c ? String(classe).split(' - ')[0].slice(0, 12) : '';
  }

  /* ================= leitura da pauta (PDF do PJe) ================= */
  var MESES = { janeiro: '01', fevereiro: '02', marco: '03', abril: '04', maio: '05', junho: '06', julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12' };
  var CNJ = '(\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4})';
  function lerPauta(texto) {
    var src = String(texto || '').replace(/\r/g, '');
    var data = '', hora = '', num = '';
    var m1 = /(\d{1,2})\s+de\s+([A-Za-zçÇãõáéíóú]+)\s+de\s+(\d{4})\s+[àa]s\s+(\d{2}:\d{2})/i.exec(src);
    if (m1 && MESES[N(m1[2])]) { data = m1[3] + '-' + MESES[N(m1[2])] + '-' + String(m1[1]).padStart(2, '0'); hora = m1[4]; }
    var m2 = /Sess[aã]o de\s+(\d{2})\/(\d{2})\/(\d{4})\s+[àa]s\s+(\d{2}:\d{2})/i.exec(src); if (!data && m2) { data = m2[3] + '-' + m2[2] + '-' + m2[1]; hora = m2[4]; }
    var m3 = /Sess[aã]o\s*#\s*(\d+)/i.exec(src); if (m3) num = m3[1];
    var limpo = src.replace(/Sess[aã]o de Julgamento[^\n]{0,200}?P[aá]gina\s+\d+\s+de\s+\d+/g, ' ').replace(/P[aá]gina\s+\d+\s+de\s+\d+/g, ' ').replace(/^\s*Sess[aã]o de Julgamento .*$/gm, ' ');
    var re = new RegExp('#\\s*(\\d{1,4})\\s+' + CNJ, 'g'), starts = [], m;
    while ((m = re.exec(limpo))) starts.push({ i: m.index, fim: re.lastIndex, item: m[1], cnj: m[2] });
    if (!starts.length) { re = new RegExp('Processo\\s+' + CNJ, 'g'); while ((m = re.exec(limpo))) starts.push({ i: m.index, fim: re.lastIndex, item: '', cnj: m[1] }); }
    var LAB = ['Assunto principal', 'Assunto', 'Classe', 'Relator', 'Órgão julgador', 'Orgao julgador', 'Partes', 'Número de ordem', 'Numero de ordem'];
    var itens = [];
    starts.forEach(function (s, k) {
      var chunk = limpo.slice(s.fim, k + 1 < starts.length ? starts[k + 1].i : limpo.length).replace(/\s+/g, ' ')
        .replace(/Sess[aã]o de Julgamento\s.{0,200}?P[aá]gina\s+\d+\s+de\s+\d+/gi, ' ').replace(/P[aá]gina\s+\d+\s+de\s+\d+/gi, ' ').replace(/\s+/g, ' ').trim();
      var f = function (rot) {
        var r = new RegExp('(?:^|\\s)' + rot + '\\s+(.*?)(?=\\s(?:' + LAB.join('|') + ')\\s|$)', 'i').exec(chunk);
        return r ? r[1].replace(/\s*Processos Pautados\s*$/i, '').trim() : '';
      };
      var item = s.item || f('N[uú]mero de ordem');
      itens.push({ item: item, cnj: s.cnj, assunto: f('Assunto principal') || f('Assunto'), classe: f('Classe'), relator: f('Relator') || f('[ÓO]rg[aã]o julgador'), partes: f('Partes') });
    });
    return { data: data, hora: hora, numero: num, itens: itens };
  }
  function pdfjs() {
    if (W.pdfjsLib) return Promise.resolve(W.pdfjsLib);
    return new Promise(function (res, rej) {
      var t = Dc.createElement('script'); t.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      t.onload = function () { try { W.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; } catch (e) {} res(W.pdfjsLib); };
      t.onerror = function () { rej(new Error('Não consegui carregar o leitor de PDF (pdf.js). Verifique a internet.')); };
      Dc.head.appendChild(t);
    });
  }
  async function textoDoPdf(file) {
    var lib = await pdfjs(), pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise, out = [];
    for (var p = 1; p <= pdf.numPages; p++) {
      var tc = await (await pdf.getPage(p)).getTextContent(), lastY = null, linha = [];
      tc.items.forEach(function (it) {
        var y = it.transform ? Math.round(it.transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) { out.push(linha.join(' ')); linha = []; }
        linha.push(it.str); lastY = y; if (it.hasEOL) { out.push(linha.join(' ')); linha = []; lastY = null; }
      });
      if (linha.length) out.push(linha.join(' '));
      out.push('');
    }
    return out.join('\n');
  }

  /* ================= montagem da sessão ================= */
  function infoItem(it) {
    var r = acervo().by.get(dig(it.cnj)) || null;
    var tags = etiquetas(r), classe = campo(r, ['Classe', 'classe_judicial', 'DataJud · Classe']) || it.classe;
    var c = classificar(tags, classe);
    var assunto = campo(r, ['Assunto', 'Assunto_Principal', 'assunto_judicial']) || it.assunto || '';
    return { r: r, tags: tags, c: c, classe: classe, recurso: recursoDaClasse(it.classe || classe), assunto: assunto,
      secao: campo(r, ['Seção Competente']) || secaoDoCatalogo(assunto) || 'Sem seção', ramo: campo(r, ['Ramo']) || ramoDoCatalogo(assunto), status: campo(r, ['Status de Julgamento']) };
  }
  function itemCatalogo(a) { var k = N(a); return k && CATALOGO ? CATALOGO.find(function (s) { return s.active !== false && (N(s.name) === k || s.aliases.some(function (x) { return N(x) === k; })); }) : null; }
  function secaoDoCatalogo(a) { var s = itemCatalogo(a); return s ? s.section : ''; }
  function ramoDoCatalogo(a) { var s = itemCatalogo(a); return s ? s.ramoCurto : ''; }
  var RESULTADOS = ['', 'Julgado', 'Retirado', 'Adiado', 'Pedido de vista', 'Não julgado'];
  /* outras sessões em que o processo esteve, com o resultado */
  function outrasPautas(cnjv, ssAtual) {
    var d = dig(cnjv), out = [];
    S.sessoes.forEach(function (ss) { if (ssAtual && ss.id === ssAtual.id) return; var i = ss.itens.find(function (x) { return dig(x.cnj) === d; }); if (i) out.push({ data: ss.data, resultado: i.resultado || '' }); });
    return out.sort(function (a, b) { return a.data.localeCompare(b.data); });
  }
  function julgKey(it, inf) {
    if (it.tipoManual && it.tipoManual !== '—') return it.tipoManual;
    /* "—" fixa o 1º julgamento: tira ED/AgInt/JR da etiqueta, mas a META continua valendo para a designação */
    if (!it.tipoManual && inf.c.tipo) return inf.c.tipo;
    if (it.tipoManual === '—') return inf.c.metas.length || /^M\d/i.test(it.meta || '') ? 'META' : '';
    if (inf.c.metas.length) return 'META';
    if (inf.recurso === 'AI') return 'AI';
    return '';
  }
  function marcas(it, inf) {
    var m = [], k = julgKey(it, inf);
    if (k && k !== 'META') m.push(['tipo', k]);
    inf.c.metas.forEach(function (n) { m.push(['meta', n === '?' ? 'META' : 'META ' + n]); });
    if (k !== 'AI' && inf.recurso === 'AI') m.push(['tipo', 'AI']);
    inf.c.tema.forEach(function (v) { m.push(['tema', v]); });
    inf.c.esp.forEach(function (v) { m.push(['esp', v]); });
    inf.c.mpf.forEach(function (v) { m.push(['mpf', 'MPF · ' + v]); });
    return m;
  }

  /* ================= designação e correção ================= */
  var HIST = null;
  function membro(nome) { var k = N(nome); return k ? S.equipe.find(function (m) { return N(m.nome) === k || (m.aliases || []).some(function (a) { return N(a) === k; }); }) || null : null; }
  function faz(m, kind) { return kind === 'd' ? (m.minuta != null ? !!m.minuta : m.papel === 'equipe') : (m.correcao != null ? !!m.correcao : m.papel === 'assessoria'); }
  function pool(kind) { return S.equipe.filter(function (m) { return faz(m, kind); }); }
  function ausente(m, ss) {
    var de = (ss.fases && ss.fases.inicio) || ss.data, ate = (ss.fases && ss.fases.minutas) || ss.data;
    return (m.aus || []).some(function (a) { return a.de && a.ate && !(a.ate < de || a.de > ate); });
  }
  function historico() {
    if (HIST) return HIST;
    var H = { d: new Map(), c: new Map() }, add = function (k, nome, a) { if (!a) return; var key = N(nome) + '|' + N(a); H[k].set(key, (H[k].get(key) || 0) + 1); };
    S.sessoes.forEach(function (ss) { ss.itens.forEach(function (i) { if (i.servidor) add('d', i.servidor, i.assunto); if (i.corretor) add('c', i.corretor, i.assunto); }); });
    acervo().rows.forEach(function (r) {
      var a = campo(r, ['Assunto', 'Assunto_Principal']); if (!a) return;
      etiquetas(r).forEach(function (t) {
        var d = N(t), mm = /^(revisado|conferido|corrigido)\s+(?:dr\.?\s+)?(.+)$/.exec(d);
        if (mm) { var x = membro(mm[2]); if (x) add('c', x.nome, a); return; }
        var y = membro(t); if (y) add(y.papel === 'assessoria' ? 'c' : 'd', y.nome, a);
      });
    });
    HIST = H; return H;
  }
  function pesoItem(i) { var r = acervo().by.get(dig(i.cnj)), v = r ? Number(String(r.Dificuldade || r.COMPLEXIDADE || '').replace(',', '.')) : 0; return v > 0 ? v : 1; }
  function carga(nome, kind, ss) { return ss.itens.filter(function (i) { return N(kind === 'd' ? i.servidor : i.corretor) === N(nome); }).reduce(function (a, i) { return a + pesoItem(i); }, 0); }
  function desigEfetiva(ss) { return ss && ss.desigOverride ? ss.desigOverride : S.desig; }
  function desigNaTela() { var ss = sessaoReal(); return UI.aba === 'desig' && UI.desigEscopo === 'sessao' && ss ? (ss.desigOverride || (ss.desigOverride = clone(S.desig))) : S.desig; }
  function linha(cid, key, ss) { var k = cid + ':' + N(key), D = ss ? desigEfetiva(ss) : desigNaTela(); return D.rows[k] || { d: '', c: '' }; }
  function escolher(kind, it, ss) {
    var D = desigEfetiva(ss);
    var inf = infoItem(it), a = N(inf.assunto), P = pool(kind).filter(function (m) { return m.auto !== false && !ausente(m, ss); });
    var mapa = function (cid, chaves) { for (var j = 0; j < chaves.length; j++) { var x = ok(linha(cid, chaves[j], ss)[kind]); if (x) return x; } return ''; };
    var ok = function (nome) { var m = membro(nome); return m && P.indexOf(m) >= 0 ? m.nome : ''; };
    var menos = function (L) {
      return L.sort(function (x, y) {
        var cx = carga(x.m.nome, kind, ss), cy = carga(y.m.nome, kind, ss);
        return D.equilibrar !== false ? (y.p > 0) - (x.p > 0) || cx - cy || y.p - x.p : y.p - x.p || cx - cy;
      })[0];
    };
    for (var i = 0; i < D.ordem.length; i++) {
      var cid = D.ordem[i]; if (!D.on[cid] || !D.on[cid][kind]) continue;
      var v = '';
      if (cid === 'julg') { var jk = julgKey(it, inf); if (jk && !(kind === 'd' && jk === 'META')) v = ok(linha('julg', jk, ss)[kind]); }
      else if (cid === 'tema') v = mapa('tema', inf.c.tema.concat([inf.assunto]));
      else if (cid === 'hist' && (v = mapa('hist', [inf.assunto]))) {}
      else if (cid === 'hist' && a) { var H = historico()[kind], L = P.map(function (m) { return { m: m, p: H.get(N(m.nome) + '|' + a) || 0 }; }).filter(function (x) { return x.p > 0; }); var b = menos(L); if (b) v = b.m.nome; }
      else if (cid === 'esp' && (v = mapa('esp', inf.c.esp.concat([inf.assunto, inf.secao])))) {}
      else if (cid === 'esp' && a) {
        var tem = function (lst) { return (lst || []).some(function (e) { var k = N(e); return k && (a === k || a.indexOf(k) >= 0 || k.indexOf(a) >= 0); }); };
        var L2 = P.filter(function (m) { return !tem(m.nao) && (tem(m.pref) || tem(m.exp)); }).map(function (m) { return { m: m, p: tem(m.pref) ? 2 : 1 }; });
        var b2 = menos(L2); if (b2) v = b2.m.nome;
      }
      else if (cid === 'sec') v = ok(linha('sec', inf.secao, ss)[kind]);
      else if (cid === 'pron') v = ok(linha('pron', 'Voto', ss)[kind]);
      if (v) return { nome: v, por: CRIT_T[cid] };
    }
    if (kind === 'd' && inf.c.metas.length && D.on.julg && D.on.julg.d) { var vm = ok(linha('julg', 'META', ss).d); if (vm) return { nome: vm, por: 'META (último critério da minuta)' }; }
    return null;
  }
  function designar(kind, todos) {
    var ss = sessao(); if (!ss) return;
    var n = 0;
    ss.itens.slice().sort(function (x, y) { return (+x.item || 0) - (+y.item || 0); }).forEach(function (it) {
      var atual = kind === 'd' ? it.servidor : it.corretor;
      if (atual && !todos) return;
      var e = escolher(kind, it, ss); if (!e) return;
      if (kind === 'd') { it.servidor = e.nome; it.porD = e.por; } else { it.corretor = e.nome; it.porC = e.por; }
      n++;
    });
    HIST = null; salvar(); render(); toast(n + (kind === 'd' ? ' minuta(s) designada(s).' : ' correção(ões) designada(s).'));
  }

  /* ================= arquivos do procs-muta (exportação) ================= */
  function docRegras() { return { schema: 'gabcmt.regras.etiquetas', versao: 1, atualizadoEm: new Date().toISOString(), registros: S.regras }; }
  function docDesig() { return { schema: 'gabcmt.regras.designacao', versao: 1, atualizadoEm: new Date().toISOString(), criterios: S.desig }; }
  function docEquipe() { return { schema: 'gabcmt.equipe', versao: 1, atualizadoEm: new Date().toISOString(), registros: S.equipe }; }
  function docSessao(ss) {
    return { nome: br(ss.data), date: ss.data, hora: ss.hora, numeroPje: ss.numero, arquivo: ss.arquivo, fases: ss.fases,
      itens: ss.itens.map(function (it) { var inf = infoItem(it); return { cnj: it.cnj, item: it.item, assunto: inf.assunto, classe: it.classe, recurso: inf.recurso,
        marcacoes: marcas(it, inf).map(function (m) { return m[1]; }), servidor: it.servidor || '', corretor: it.corretor || '', obs: it.obs || '', noAcervo: !!inf.r }; }) };
  }
  function baixar(nome, texto, tipo) { var a = Dc.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo || 'application/json' })); a.download = nome; Dc.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

  /* listas do Controle de Pauta (Excel padrão: pautas bimestrais, 1 aba por sessão) */
  var CP = {
    classe: ['ApCiv', 'RemNec', 'ApRemNec', 'AI'],
    apreciacao: ['1º julg', 'ED', 'AgInt', 'Retrat', 'QO'],
    etapa: ['Minutado', 'Corrigido', 'Liberado'],
    mpf: ['Sem hipótese', 'Interesse público (178 I)', 'Incapaz (178 II)', 'Litígio coletivo terra (178 III)', 'Mandado de segurança', 'ACP/ação popular', 'Improbidade', 'Indígenas (CF 232)', 'Idoso em risco', 'Reforma agrária'],
    parecer: ['Com parecer', 'Aguardando parecer', 'Intimado sem manifestação'],
    prelim: ['Sem preliminares', 'Há preliminares', 'Preliminar de ofício'],
    tempest: ['Tempestivo', 'Intempestivo', 'Não verificado', 'Não se aplica'],
    preparo: ['Comprovado', 'Justiça gratuita', 'Isento (DPU/ente público)', 'Não recolhido', 'Não se aplica', 'Não verificado'],
    repres: ['Regular', 'Dispensada (proc. público/DPU)', 'Irregular – intimar', 'Não verificado'],
    midias: ['Juntadas', 'Faltantes', 'Não se aplica', 'Não verificado'],
    resJulg: ['Provido', 'Parcialmente provido', 'Desprovido', 'Não conhecido', 'Prejudicado', 'Rejeitados', 'Acolhidos sem efeito infringente', 'Acolhidos com efeito infringente', 'Retratação exercida', 'Acórdão mantido'],
    simnao: ['Sim', 'Não'],
    honor: ['Majorados', 'Mantidos', 'Invertidos', 'Fixados', 'Redistribuídos', 'Sem honorários recursais'],
    desfecho: ['Julgado', 'Retirado', 'Adiado'],
    meta: ['M2A', 'M2B', 'M4', 'M6', 'M7', 'M10', '★', 'M2A ★', 'M2B ★', 'M4 ★', 'M6 ★', 'M7 ★', 'M10 ★', 'M?']
  };
  function cpClasse(c) { c = N(c); if (/agravo de instrumento/.test(c)) return 'AI'; if (/apela/.test(c) && /remessa/.test(c)) return 'ApRemNec'; if (/remessa/.test(c)) return 'RemNec'; if (/apela/.test(c)) return 'ApCiv'; return ''; }
  function cpApreciacao(it, inf) { var k = julgKey(it, inf); return k === 'ED' ? 'ED' : k === 'AgInt' ? 'AgInt' : k === 'JR' ? 'Retrat' : '1º julg'; }
  function cpMeta(it, inf) { if (it.meta) return it.meta; var mk = marcas(it, inf).filter(function (m) { return m[0] === 'meta'; }).map(function (m) { return m[1]; }).join(' ');
    var n = (mk.match(/\d+\s*[AB]?/gi) || []).map(function (x) { return 'M' + x.replace(/\s+/g, '').toUpperCase(); }); var r = inf.r || {}, cx = Number(String(r.Dificuldade || '').replace(',', '.'));
    return (n.join(' ') + (cx >= 3 ? ' ★' : '')).trim(); }
  function cpDefault(it, inf, k) { var r = inf.r || {}, v = '';
    if (k === 'tempest') { v = String(r.Tempestividade || ''); if (/intemp/i.test(v)) return 'Intempestivo'; if (/tempest/i.test(v)) return 'Tempestivo'; return 'Não verificado'; }
    if (k === 'preparo') { v = String(r.Preparo || ''); if (/ajg|gratuit/i.test(v)) return 'Justiça gratuita'; if (/isen|dispens/i.test(v)) return 'Isento (DPU/ente público)'; if (/n[aã]o recolh/i.test(v)) return 'Não recolhido'; if (/recolh|comprov/i.test(v)) return 'Comprovado'; if (/n[aã]o se aplica/i.test(v)) return 'Não se aplica'; return 'Não verificado'; }
    if (k === 'repres') { v = String(r['Representação'] || ''); if (/irreg/i.test(v)) return 'Irregular – intimar'; if (/regular/i.test(v)) return 'Regular'; if (/dispens/i.test(v)) return 'Dispensada (proc. público/DPU)'; return 'Não verificado'; }
    if (k === 'midias') { v = String(r['Mídias'] || ''); if (/pendent|faltant/i.test(v)) return 'Faltantes'; if (/h[aá] m[ií]dia|juntad/i.test(v)) return 'Juntadas'; if (/n[aã]o se aplica/i.test(v)) return 'Não se aplica'; return 'Não verificado'; }
    if (k === 'mpf') { v = String(r['MPF - Custos Legis'] || ''); if (/incapaz/i.test(v)) return 'Incapaz (178 II)'; if (/ind[ií]gen/i.test(v)) return 'Indígenas (CF 232)'; if (/idoso/i.test(v)) return 'Idoso em risco'; if (/interesse p/i.test(v)) return 'Interesse público (178 I)'; return ''; }
    if (k === 'parecer') { v = String(r.MPF || ''); if (/com parecer/i.test(v)) return 'Com parecer'; if (/aguard/i.test(v)) return 'Aguardando parecer'; return ''; }
    return ''; }
  function cpVal(it, inf, k) { return it[k] || cpDefault(it, inf, k); }
  function cpEtapa(it) { return it.dataLiberacao ? 'Liberado' : it.dataCorrecao ? 'Corrigido' : it.dataMinuta ? 'Minutado' : 'A fazer'; }
  function cpPend(it, inf) { var P = [], v = function (k) { return cpVal(it, inf, k); };
    if (v('tempest') === 'Intempestivo') P.push('Intempestivo'); if (v('preparo') === 'Não recolhido') P.push('Preparo não recolhido'); if (/^Irregular/.test(v('repres'))) P.push('Representação irregular'); if (v('midias') === 'Faltantes') P.push('Mídias faltantes');
    if (v('mpf') && v('mpf') !== 'Sem hipótese' && v('parecer') !== 'Com parecer') P.push('Parecer do MPF pendente'); return P.join(' · '); }
  function planilhaLinhas(ss) {
    return ss.itens.slice().sort(function (a, b) { return (+a.item || 0) - (+b.item || 0); }).map(function (it) {
      var inf = infoItem(it), v = function (k) { return cpVal(it, inf, k); };
      return { 'Item': +it.item || it.item, 'Processo': it.cnj, 'Classe': cpClasse(it.classe || inf.classe) || (it.classe || inf.classe || ''), 'Assunto': inf.assunto, 'Detalhes': it.obs || '', 'Pendências': cpPend(it, inf),
        'Etapa': cpEtapa(it), 'Minutado em': it.dataMinuta ? br(it.dataMinuta) : '', 'Servidor': it.servidor || '', 'Revisor': it.corretor || '', 'Intervenção MPF': v('mpf'), 'Parecer MPF': v('parecer'), 'Preliminares': v('prelim'),
        'Tempestividade': v('tempest'), 'Preparo': v('preparo'), 'Representação': v('repres'), 'Mídias': v('midias'), 'Resultado': it.resJulg || '', 'Consectários': it.consect || '', 'Honorários': it.honor || '', 'Tópico-síntese': it.topico || '',
        'Desfecho': it.resultado || '', 'Intercorrência': it.intercor || '', 'Meta': cpMeta(it, inf), 'Apreciação': cpApreciacao(it, inf) };
    });
  }
  /* Controle de Pauta no molde oficial (planilha de 30/11): o modelo em assets/modelos tem o cabeçalho com painel,
     fórmulas, listas suspensas e cores; aqui só se preenchem a data, os prazos e as linhas (a partir da 21) */
  var PL_COLS = ['Item', 'Processo', 'Classe', 'Assunto', 'Detalhes', 'Pendências', 'Etapa', 'Minutado em', 'Servidor', 'Revisor', 'Intervenção MPF', 'Parecer MPF', 'Preliminares', 'Tempestividade', 'Preparo', 'Representação', 'Mídias', 'Resultado', 'Consectários', 'Honorários', 'Tópico-síntese', 'Desfecho', 'Intercorrência', 'Meta', 'Apreciação'];
  function serialData(v) { v = String(v || ''); var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v) || /^(\d{2})\/(\d{2})\/(\d{4})/.exec(v); if (!m) return null; var y = +(m[1].length === 4 ? m[1] : m[3]), mo = +m[2], d = +(m[1].length === 4 ? m[3] : m[1]); return (Date.UTC(y, mo - 1, d) - Date.UTC(1899, 11, 30)) / 864e5; }
  function xmlEsc(v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''); }
  function colLetra(i) { var s = ''; i++; while (i) { var r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; }
  async function exportarModelo(ss, linhas, nome) {
    var X = W.XLSX, CFB = X.CFB; if (linhas.length > 300) throw new Error('mais de 300 itens');
    var resp = await fetch('assets/modelos/controle-de-pauta.xlsx', { cache: 'no-cache' }); if (!resp.ok) throw new Error('modelo ' + resp.status);
    var cfb = CFB.read(new Uint8Array(await resp.arrayBuffer()), { type: 'array' });
    var ler = function (n) { var i = cfb.FullPaths.findIndex(function (p) { return p.slice(-n.length - 1) === '/' + n; }), e = i >= 0 ? cfb.FileIndex[i] : null; if (!e) throw new Error('modelo sem ' + n); return { e: e, t: new TextDecoder().decode(e.content) }; };
    var grava = function (o, t) { o.e.content = new TextEncoder().encode(t); o.e.size = o.e.content.length; };
    var V = {}, f = ss.fases || {}, dd = br(ss.data).slice(0, 5).replace('/', '-');
    var put = function (ref, v, num) { if (v == null || v === '') return; V[ref] = num ? { n: v } : { s: v }; };
    put('R1', serialData(ss.data), true); put('E3', serialData(f.minutas), true); put('K3', serialData(f.liberacao), true);
    linhas.forEach(function (l, i) { var r = 21 + i;
      PL_COLS.forEach(function (k, ci) { var v = l[k], ref = colLetra(ci) + r;
        if (k === 'Pendências') return;
        if (k === 'Etapa') { if (v === 'Corrigido' || v === 'Liberado') V[ref] = { s: v, f: true }; return; }
        if (k === 'Minutado em') { put(ref, serialData(v), true); return; }
        if (k === 'Item') { var n = Number(v); put(ref, isNaN(n) || v === '' ? v : n, !isNaN(n) && v !== ''); return; }
        put(ref, v == null ? '' : String(v)); }); });
    var sh = ler('xl/worksheets/sheet1.xml');
    var xml = sh.t.replace(/<c r="([A-Z]+[0-9]+)"( s="\d+")?( t="[a-z]+")?(?:\/>|>(?:<f>[\s\S]*?<\/f>)?(?:<v>[^<]*<\/v>|<v\/>)?<\/c>)/g, function (m, ref, st) {
      var o = V[ref]; if (!o) return m; if (/<f>/.test(m) && !o.f) return m;
      return o.n != null ? '<c r="' + ref + '"' + (st || '') + '><v>' + o.n + '</v></c>' : '<c r="' + ref + '"' + (st || '') + ' t="inlineStr"><is><t xml:space="preserve">' + xmlEsc(o.s) + '</t></is></c>'; });
    grava(sh, xml);
    var wbx = ler('xl/workbook.xml'); grava(wbx, wbx.t.replace(/name="Sess[^"]*"/, 'name="Sessão ' + dd + '"'));
    try { var tb = ler('xl/tables/table1.xml'); grava(tb, tb.t.replace(/(name|displayName)="Pauta_[^"]*"/g, '$1="Pauta_' + dd.replace('-', '') + '"')); } catch (e) {}
    var out = CFB.write(cfb, { type: 'array', fileType: 'zip' });
    var a = Dc.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = nome; Dc.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    return true;
  }
  function exportarXlsx() {
    var ss = sessao(); if (!ss) return;
    var X = W.XLSX, linhas = planilhaLinhas(ss), nome = 'Pauta_Sessao_' + br(ss.data || hoje()).replace(/\//g, '-') + '.xlsx';
    if (X && X.CFB && W.fetch && W.TextDecoder) { exportarModelo(ss, linhas, nome).then(function () { toast('Controle de Pauta de ' + br(ss.data) + ' no molde oficial: ' + linhas.length + ' itens.'); }).catch(function (e) { toast('Molde oficial indisponível (' + e.message + '): saiu a versão simples.'); exportarSimples(ss, linhas, nome); }); return; }
    exportarSimples(ss, linhas, nome);
  }
  function exportarSimples(ss, linhas, nome) {
    var X = W.XLSX;
    if (!X) { var h = Object.keys(linhas[0] || {}); baixar(nome.replace('.xlsx', '.csv'), [h.join(';')].concat(linhas.map(function (l) { return h.map(function (k) { return '"' + String(l[k]).replace(/"/g, '""') + '"'; }).join(';'); })).join('\n'), 'text/csv'); return; }
    var wb = X.utils.book_new(), ws = X.utils.json_to_sheet(linhas);
    ws['!cols'] = [6, 26, 10, 34, 30, 28, 11, 12, 14, 14, 22, 18, 16, 14, 18, 18, 14, 22, 12, 16, 12, 10, 24, 10, 10].map(function (w) { return { wch: w }; });
    X.utils.book_append_sheet(wb, ws, 'Sessão ' + br(ss.data).slice(0, 5).replace(/\//g, '-'));
    X.writeFile(wb, nome);
  }

  /* ================= interface ================= */
  var UI = { aba: 'sessoes', dlg: null, q: '', f: '', fSec: '', fRamo: '', temaQ: '', temaTodos: false, abertos: {}, regraAberta: '', etqQ: '', etqLim: 80 };
  try { UI.vistaPl = localStorage.getItem('cs_vista_pl') || 'cards'; } catch (e) { UI.vistaPl = 'cards'; }
  var CSS = '\
#cs-root{position:fixed;inset:0;z-index:2147483600;background:#f4f2ec;color:#1d2433;font:13.5px/1.45 Figtree,Inter,system-ui,Arial,sans-serif;display:flex;flex-direction:column}\
#cs-root[hidden]{display:none}\
.cs-tsep{width:1px;background:rgba(255,255,255,.2);margin:4px 6px}\
.cs-pill{font-size:12px;color:#bfe8cf;display:flex;align-items:center;gap:8px}.cs-pill.sujo{color:#f5d08a}.cs-pill .cs-btn{padding:5px 10px}\
.cs-ses{display:grid;grid-template-columns:120px minmax(0,1fr) auto;gap:14px;align-items:center;background:#fff;border:1px solid #e1ddd2;border-radius:12px;padding:12px 16px;margin-bottom:8px}\
.cs-ses.prox{border-color:#c4953c;box-shadow:0 0 0 2px rgba(196,149,60,.22)}\
.cs-ses.passada{opacity:.5}.cs-ses.passada:hover{opacity:.85}\
.cs-ses .dt{font-size:22px;font-weight:800;color:#1f2442;line-height:1.1}.cs-ses .dt small{display:block;font-size:11px;font-weight:700;color:#5d6475;letter-spacing:.04em;text-transform:uppercase}\
.cs-ses .mk{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}\
.cs-tag{display:inline-block;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:800;background:#fdf2dc;color:#8a5a00}\
.cs-tag.ok{background:#e6f3ec;color:#1b6b46}.cs-tag.gr{background:#eef0f4;color:#5d6475}\
.cs-grp{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#5d6475;margin:16px 0 6px}\
.cs-dlg{position:fixed;inset:0;z-index:5;background:rgba(20,22,50,.5);display:flex;align-items:center;justify-content:center;padding:18px}\
.cs-dlg[hidden]{display:none}\
.cs-dlg>.box{background:#f4f2ec;border-radius:14px;width:min(1280px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}\
.cs-dlg .hd{background:#1f2442;color:#fff;padding:12px 18px;display:flex;align-items:center;gap:12px}\
.cs-dlg .hd h2{margin:0;font-size:16px}\
.cs-dlg .bd{overflow:auto;padding:14px 18px}\
.cs-dlg .ft{padding:10px 18px;border-top:1px solid #e1ddd2;display:flex;gap:8px;justify-content:flex-end;align-items:center;background:#fff}\
.cs-dlg tr.mud td{background:#fffbea}\
.cs-srv{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px;align-items:start}\
.cs-srv details{background:#fff;border:1px solid #e1ddd2;border-radius:10px;padding:8px 10px}\
.cs-srv summary{cursor:pointer;display:flex;justify-content:space-between;gap:8px;font-weight:800}\
.cs-srv ol{margin:6px 0 0;padding-left:0;list-style:none;font-size:12px;max-height:180px;overflow:auto}\
#cs-root *{box-sizing:border-box}\
.cs-top{background:#1f2442;color:#fff;display:flex;align-items:center;gap:14px;padding:10px 18px;flex-wrap:wrap}\
.cs-top h1{font-size:17px;margin:0;font-weight:800;letter-spacing:.01em}\
.cs-top small{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#d8b46a;font-weight:800}\
.cs-tabs{display:flex;gap:4px;margin-left:8px;flex-wrap:wrap}\
.cs-tabs button{border:1px solid rgba(255,255,255,.18);background:transparent;color:#d0cdf3;border-radius:999px;padding:6px 13px;font:700 12.5px inherit;cursor:pointer}\
.cs-tabs button[aria-pressed=true]{background:#c4953c;border-color:#c4953c;color:#1f2442}\
.cs-sp{flex:1}\
.cs-x{border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;font-weight:700}\
.cs-body{flex:1;overflow:auto;padding:16px 20px 60px}\
.cs-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}\
.cs-btn{border:1px solid #cfd3dd;background:#fff;color:#1d2433;border-radius:8px;padding:7px 12px;cursor:pointer;font:600 12.5px inherit;white-space:nowrap}\
.cs-btn:hover{border-color:#c4953c}\
.cs-btn.pri{background:#1f2442;color:#fff;border-color:#1f2442}\
.cs-btn.gold{background:#c4953c;color:#1f2442;border-color:#c4953c}\
.cs-btn[disabled]{opacity:.45;cursor:not-allowed}\
.cs-in,.cs-sel{border:1px solid #cfd3dd;border-radius:8px;padding:7px 10px;font:inherit;background:#fff;color:inherit}\
.cs-card{background:#fff;border:1px solid #e1ddd2;border-radius:12px;padding:14px 16px;margin-bottom:12px}\
.cs-card h2{font-size:15px;margin:0 0 4px}\
.cs-card p.n{margin:0 0 8px;color:#5d6475;font-size:12.5px}\
.cs-kpis{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}\
.cs-kpi{background:#fff;border:1px solid #e1ddd2;border-radius:10px;padding:8px 12px;min-width:92px;cursor:pointer}\
.cs-kpi b{display:block;font-size:20px;line-height:1.1}\
.cs-kpi span{font-size:11px;color:#5d6475;text-transform:uppercase;letter-spacing:.06em;font-weight:700}\
.cs-kpi[aria-pressed=true]{border-color:#c4953c;box-shadow:0 0 0 2px rgba(196,149,60,.25)}\
.cs-tbl{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:1px solid #e1ddd2;border-radius:12px;overflow:hidden}\
.cs-tbl th{position:sticky;top:0;background:#1f2442;color:#e9e6ff;text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;padding:8px;z-index:1}\
.cs-tbl td{border-top:1px solid #eeeae0;padding:7px 8px;vertical-align:top}\
.cs-tbl tr.fora td{background:#fff6ec}\
#cs-root:has(#cs-body[data-aba="planilha"]) .cs-top{display:none!important}\
#cs-root:has(#cs-body[data-aba="equipe"]) .cs-tabs{display:none!important}#cs-root:has(#cs-body[data-aba="equipe"]) .cs-top h1{font-size:0!important}#cs-root:has(#cs-body[data-aba="equipe"]) .cs-top h1:after{content:"Equipe";font-size:22px}\
.sx-h{display:flex;flex-wrap:wrap;gap:12px 18px;align-items:center;background:#fff;border:1px solid #e1e7ec;border-radius:20px;padding:16px 22px 14px;margin:0 0 14px;box-shadow:0 1px 3px rgba(20,38,60,.06);font-family:Figtree,system-ui,sans-serif}\
.sx-t{flex:1 1 360px;min-width:0}.sx-ic{margin-left:auto}.sx-m{flex-basis:100%}.sx-ic .cs-pill{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}.sx-ic .cs-pill .cs-btn{padding:2px 10px;font-size:11.5px}.sx-ey{display:block;font:800 10.5px Figtree,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#b8862b}.sx-tt{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.sx-tt h2{margin:0;font:800 26px Figtree,sans-serif;letter-spacing:-.02em;color:#14263c}.sx-tt .cs-sel{font-size:12.5px;max-width:240px}.sx-t small{color:#5d6b78;font-size:12.5px}\
.sx-v{display:inline-flex;background:#eef2f5;border-radius:999px;padding:3px}.sx-v button{border:0;background:transparent;border-radius:999px;padding:7px 14px;font:800 12.5px Figtree,sans-serif;color:#3d4c5c;cursor:pointer;display:inline-flex;gap:7px;align-items:center}.sx-v button b{font-size:11px;background:rgba(20,38,60,.08);border-radius:999px;padding:1px 7px}.sx-v button[aria-pressed=true]{background:#1b3553;color:#fff}.sx-v button[aria-pressed=true] b{background:rgba(255,255,255,.18)}.sx-v button:disabled{opacity:.45;cursor:not-allowed}\
.sx-ic{display:inline-flex;align-items:center;gap:6px}.sx-ic button{width:36px;height:36px;display:grid;place-items:center;border:1px solid #d6dde4;background:#fff;border-radius:999px;color:#1b3553;cursor:pointer}.sx-ic button:hover{border-color:#c4953c;color:#8a6116}.sx-ic button:disabled{opacity:.4;cursor:not-allowed}.sx-ic button.dz:hover{border-color:#c45a4a;color:#a8322a}.sx-ic .cs-pill{margin-right:4px;background:#e8f5ef;color:#1a7f5a;border:1px solid #b9e0cd;border-radius:999px;padding:4px 10px;font:700 11.5px Figtree,sans-serif}.sx-ic .cs-pill.sujo{background:#fff4e0;color:#8a5a00;border-color:#efd39c}\
.sx-m{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px 18px;padding-top:12px;border-top:1px solid #eef1f4}.sx-m label{display:flex;align-items:center;gap:8px;font:700 11px Figtree,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#5d6b78}.sx-m .cs-in{font-size:12.5px}\
@media(max-width:1100px){.sx-h{grid-template-columns:1fr}}\
.pn{background:#fff;border:1px solid #e1ddd2;border-top:3px solid #c46a1f;border-radius:14px;margin:0 0 14px;overflow:hidden}.pn-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:10px 14px}.pn-h>b{font-size:14px;color:#1f2442}.pn-tabs{display:inline-flex;gap:4px;margin-left:auto}.pn-tabs button{border:1px solid #d8d2c6;background:#f7f5f0;color:#3d4c5c;border-radius:999px;padding:5px 12px;font:700 12px Figtree,sans-serif;cursor:pointer}.pn-tabs button[aria-pressed=true]{background:#1f2442;border-color:#1f2442;color:#fff}\
.pn-min{width:30px;height:30px;border:1px solid #d8d2c6;border-radius:999px;background:#fff;cursor:pointer;display:inline-grid;place-items:center}.pn-min::before{content:"";width:7px;height:7px;border-right:2px solid #3d4c5c;border-bottom:2px solid #3d4c5c;transform:translateY(2px) rotate(-135deg)}.pn.min .pn-min::before{transform:translateY(-2px) rotate(45deg)}\
.pn-b{padding:4px 14px 14px;border-top:1px solid #eeeae0}.pn-n{margin:8px 0;color:#5d6475;font-size:12.5px}.pn-ok{color:#1a7f5a;font-weight:700}.pn-tw{max-height:340px;overflow:auto;border-radius:10px;border:1px solid #e1ddd2;margin-bottom:8px}.pn-t{border:0}.pn-t td{font-size:12px}.pn-t td.pd{background:#fff8dc}.pn-t td.pm{background:#f1ebfa}.pn-t td small{display:block;color:#7e8b99;font-size:10.5px}\
.pn-cf{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:0 14px 10px;padding:9px 12px;border-radius:10px;background:#eef3f8;font-size:12.5px}.pn-cf .w{color:#a8322a;font-weight:700}.pn-cf .n{color:#8a5a00;font-weight:700}.pn-cf details{flex-basis:100%}.pn-cf p{margin:4px 0;font-size:11.5px}\
.pn-cg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:6px 0 10px}.pn-cg>div{border:1px solid #e1ddd2;border-radius:10px;padding:7px 10px;background:#fbfaf7}.pn-cg b{display:block;font-size:12.5px}.pn-cg span{font-size:11.5px;color:#5d6475}.pn-aus{margin:4px 0 8px;color:#a8322a;font-size:12.5px}.cs-ses-ac{flex-wrap:wrap;justify-content:flex-end}\
.cp-it{display:flex;align-items:center;gap:4px;justify-content:space-between;min-width:74px}.cp-it b{min-width:22px;text-align:center}\
.cp-xb{border:1px solid #d8e1e8;background:#fff;color:#526a7e;border-radius:6px;width:22px;height:22px;padding:0;font-size:12px;line-height:1;cursor:pointer}.cp-xb:hover{background:#f1f5f8}.cp-xb.cp-del{color:#a7433d;opacity:.35}.cp-tbl tr:hover .cp-xb.cp-del{opacity:1}.cp-xb.cp-del:hover{background:#fbeceb;border-color:#e8ceca}\
.cp-tbl tr.cp-aberto td{border-bottom-color:transparent}.cp-tbl tr.cp-xrow>td{padding:0 0 12px;background:#f3f6f8!important;position:static}.cp-tbl tr.cp-xrow>td:first-child{position:static}\
.cp-card-host{position:sticky;left:0;width:min(1180px,calc(100vw - var(--ixw,0px) - 80px));padding:10px 12px 0}\
.cp-add{display:inline-flex;gap:6px;align-items:center}.cp-add .cs-in{width:230px;font-family:ui-monospace,Consolas,monospace}\
.pc{border:1px solid #ccd8df;border-radius:14px;background:#fff;box-shadow:0 8px 26px #21394c12;overflow:hidden;color:#1e3448;font-size:12px;white-space:normal}\
.pc-hd{display:grid;grid-template-columns:auto minmax(220px,1.3fr) minmax(180px,1fr) auto;gap:12px;align-items:center;padding:14px 16px 10px}\
.pc-it{min-width:40px;height:40px;display:grid;place-items:center;border-radius:11px;background:#edf2f7;border:1px solid #d9e2e8;color:#385d7c;font-size:15px;font-weight:850}\
.pc-id,.pc-as{min-width:0;display:flex;flex-direction:column;gap:3px}.pc-id small,.pc-as small{color:#64778a;font-size:11px;overflow:hidden;text-overflow:ellipsis}\
.pc-cnj{font:750 13.5px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;color:#183b5b;text-decoration:none}.pc-cnj:hover{text-decoration:underline}.pc-as b{font-size:12.5px}\
.pc-ac{display:flex;gap:5px}.pc-b{border:1px solid #d8e1e8;border-radius:8px;background:#fff;color:#526a7e;min-height:30px;padding:0 10px;font-size:11px;font-weight:750;cursor:pointer}.pc-b:hover{background:#f4f7f8}.pc-b.dz{color:#a7433d}.pc-b.dz:hover{background:#fbeceb}\
.pc-mr{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:0 16px 12px 68px}.pc-ch{display:inline-flex;align-items:center;min-height:21px;padding:0 9px;border-radius:999px;background:#eef3f6;color:#536b7e;font-size:10px;font-weight:800}\
.pc-ch.k{background:#e9eff8;color:#315d87}.pc-ch.m{background:#f7f0df;color:#8c6419}.pc-ch.w{background:#fbe9e3;color:#a03a12}.pc-ch.n{background:#f1ebfa;color:#5b3f7c}\
.pc-own{display:flex;gap:8px;margin-left:auto}.pc-own label{display:flex;flex-direction:column;gap:2px;font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64778a}.pc-own .cs-sel{font-size:11.5px;max-width:170px}\
.pc-tl{display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:10px 16px;border-top:1px solid #e8edf0;border-bottom:1px solid #e8edf0;background:#fbfcfd}\
.pc-st{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px;border:1px solid #d8e1e8;border-radius:9px;background:#fff;color:#75889a;font-size:10.5px;font-weight:750;cursor:pointer}.pc-st b{font-size:14px}\
.pc-st.ok.s1{border-color:#c3d7eb;background:#edf4fb;color:#2d6fa8}.pc-st.ok.s2{border-color:#b9d8c5;background:#eaf5ee;color:#28744b}.pc-st.ok.s3{border-color:#d7c9ea;background:#f3eef9;color:#7352a5}.pc-st.at{box-shadow:0 0 0 2px #c9a24a55}\
.pc-cn{height:1px;flex:0 1 22px;min-width:8px;background:#cdd7dd}.pc-dts{display:flex;gap:10px;margin-left:auto;flex-wrap:wrap}.pc-dts label{display:flex;align-items:center;gap:5px;font-size:10px;color:#708294;font-weight:700}.pc-dts .cs-in{font-size:11px;padding:2px 5px}\
.pc-bd{padding:14px 16px 16px;background:#f7f9fa}.pc-sg{display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:10px;margin-bottom:12px}\
.pc-s{padding:10px 12px;border:1px solid #d8e1e8;border-radius:11px;background:#fff;min-width:0}.pc-s h4{display:flex;align-items:center;gap:7px;margin:0 0 7px;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase}.pc-s h4 i{width:8px;height:8px;border-radius:50%;background:#9babb6}\
.pc-s.inc{border-color:#e8ceca;background:#fffaf9}.pc-s.inc h4 i{background:#a7433d}.pc-s.pd{border-color:#ead4a7;background:#fffaf0}.pc-s.pd h4 i{background:#9a6a16}.pc-s p{margin:0;color:#556c7f;line-height:1.45}.pc-s .cs-in{width:100%;font-size:11.5px;box-sizing:border-box}.pc-s textarea{resize:vertical}\
.pc-cnt{display:inline-flex;align-items:center;gap:3px;min-width:34px;height:30px;padding:0 8px;border:1px solid #d8e1e8;border-radius:8px;color:#8a98a6;font-size:12px}.pc-cnt b{font-size:10px}.pc-cnt.al{color:#9a6a16;border-color:#ead4a7;background:#fffaf0}.pc-cnt.in{color:#a7433d;border-color:#e8ceca;background:#fffaf9}.pc-cnt.so{color:#2d6fa8;border-color:#c3d7eb;background:#edf4fb}\
.pc-sp{font-size:10.5px;color:#708294;margin-left:6px}.pc-b.on{background:#183b5b;color:#fff;border-color:#183b5b}.pc-b.pri{background:#183b5b;color:#fff;border-color:#183b5b}.pc-b:disabled{opacity:.45;cursor:default}\
.pc-tb{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.pc-tp{border:1px solid #d8e1e8;border-radius:11px;background:#fff;padding:10px 12px;margin-bottom:12px}.pc-tp p{margin:0 0 6px;color:#556c7f;line-height:1.45}.pc-tp .cs-in{width:100%;box-sizing:border-box}.pc-hl{margin:0;padding-left:18px;color:#556c7f}\
.pc-sg{grid-template-columns:1.1fr 1fr 1fr 1.1fr!important}.pc-s.so{border-color:#c3d7eb;background:#f6faff}.pc-s.so h4 i{background:#2d6fa8}.pc-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px}.pc-row .cs-sel,.pc-row .cs-in{width:auto!important;flex:1 1 110px;min-width:0}\
.pc-ck{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#3d5468;margin-right:8px;white-space:nowrap}.pc-al{list-style:none;margin:0;padding:0;display:grid;gap:4px}.pc-al li{display:flex;gap:4px}.pc-al .cs-in{flex:1}\
.pc-x{border:1px solid #e8ceca;background:#fff;color:#a7433d;border-radius:6px;padding:2px 7px;font-size:10.5px;font-weight:700;cursor:pointer}.pc-mut{display:block;color:#7a8b9a;font-size:10.5px;margin-top:4px}.pc-ok{color:#28744b;font-weight:800}.pc-no{color:#a7433d;font-weight:800}\
.pc-pn{grid-template-columns:repeat(2,minmax(0,1fr))!important}.pc-pn section.pc-wide{grid-column:1/-1}.pc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:18px}.pc-v{min-width:0;display:flex;flex-direction:column;gap:4px}.pc-v .cs-in,.pc-v .cs-sel,.pc-v textarea{width:100%;box-sizing:border-box;font-size:11.5px}\
.pc-pt{flex:1 1 140px;font-size:11px}.pc-rec{display:grid;grid-template-columns:auto 1fr 1.2fr .8fr 1.3fr auto;gap:6px;align-items:center;padding:6px 0;border-top:1px dashed #e6ecf0}.pc-rec b{font-size:11px;color:#183b5b}.pc-rec .cs-in,.pc-rec .cs-sel{width:100%;box-sizing:border-box;font-size:11.5px}\
.pc-sub{margin:12px 0 4px;font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#8a6b2c}.pc-gq{display:grid;gap:4px}.pc-q{display:flex;justify-content:space-between;gap:10px;padding:5px 8px;border:1px solid #e3e9ee;border-radius:8px;font-size:11.5px}.pc-sn{display:flex;gap:10px;white-space:nowrap}.pc-sn label{display:inline-flex;gap:3px;align-items:center}\
@media (max-width:1100px){.pc-sg{grid-template-columns:1fr 1fr!important}.pc-grid,.pc-pn{grid-template-columns:1fr!important}.pc-rec{grid-template-columns:1fr 1fr}}\
html[data-theme=dark] .pc-tp,html[data-theme=dark] .pc-q,html[data-theme=dark] .pc-cnt,html[data-theme=dark] .pc-x{background:#132a3b;border-color:#27465c}html[data-theme=dark] .pc-ck,html[data-theme=dark] .pc-tp p,html[data-theme=dark] .pc-hl,html[data-theme=dark] .pc-q{color:#c9d6e1}html[data-theme=dark] .pc-s.so{background:#122a40;border-color:#2d5a80}html[data-theme=dark] .pc-rec b{color:#e9c46a}html[data-theme=dark] .pc-b.on,html[data-theme=dark] .pc-b.pri{background:#c9a24a;color:#0b1c28;border-color:#c9a24a}\
.cp-tbl .pc .cs-in,.cp-tbl .pc .cs-sel{max-width:none}.pc-pz{display:block;line-height:1.5}.cs-btn.pub{background:#eaf5ee;border-color:#9fcfb1;color:#28744b;font-weight:800}.sx-ic .sx-pub{width:auto!important;padding:0 10px!important;font-size:11.5px;font-weight:800;color:#64778a}.sx-ic .sx-pub.on{background:#eaf5ee!important;border-color:#9fcfb1!important;color:#28744b!important}\
html[data-theme=dark] .cs-btn.pub,html[data-theme=dark] .sx-ic .sx-pub.on{background:#163428!important;border-color:#2f6b4c!important;color:#8fd4ac!important}\
.pc-list{display:grid;gap:10px}.pc-host .pc{box-shadow:0 4px 14px #21394c0d}.pc-host:not(.ab) .pc-tl{border-bottom:0}.pc-ft{display:flex;align-items:center;gap:10px;padding:8px 16px 10px;border-top:1px solid #e8edf0}.pc-ft .pc-mut{margin:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
.pc-xp{border:0;background:transparent;color:#315f82;font-weight:800;font-size:11px;cursor:pointer;white-space:nowrap}.cp-vis{display:inline-flex;border:1px solid #d8e1e8;border-radius:10px;overflow:hidden}.cp-vis .cs-btn{border:0;border-radius:0}.cp-vis .cs-btn[aria-pressed=true]{background:#183b5b;color:#fff}\
html[data-theme=dark] .pc-ft{border-color:#27465c}html[data-theme=dark] .pc-xp{color:#e9c46a}html[data-theme=dark] .cp-vis{border-color:#27465c}html[data-theme=dark] .cp-vis .cs-btn[aria-pressed=true]{background:#c9a24a;color:#0b1c28}\
.pc-host:not(.ab) .pc-hd{padding:9px 14px 4px}.pc-host:not(.ab) .pc-it{min-width:34px;height:34px;font-size:13px}.pc-host:not(.ab) .pc-mr{padding:0 14px 8px 60px}.pc-host:not(.ab) .pc-own label{flex-direction:row;align-items:center;gap:6px}.pc-host:not(.ab) .pc-own .cs-sel{font-size:11px;padding:2px 6px}\
.pc-host:not(.ab) .pc-tl{padding:6px 14px}.pc-host:not(.ab) .pc-st{height:27px;padding:0 8px}.pc-host:not(.ab) .pc-dts{display:none}.pc-host:not(.ab) .pc-ft{padding:5px 14px 7px}.pc-host:not(.ab) .pc-cnt,.pc-host:not(.ab) .pc-b{min-height:26px;height:26px}\
.pc-tags{display:flex;flex-wrap:wrap;gap:4px}.pc-pn{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.pc-pn section{border:1px solid #d8e1e7;border-radius:12px;background:#fff;padding:10px 12px;min-width:0}\
.pc-pn h3{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:11.5px;color:#183b5b}.pc-pn h3 em{font-style:normal;width:20px;height:20px;display:grid;place-items:center;border-radius:6px;background:#183b5b;color:#fff;font-size:10px}\
.pc-f{display:grid;grid-template-columns:104px minmax(0,1fr);gap:8px;align-items:center;padding:4px 0;border-top:1px dashed #e6ecf0}.pc-f:first-of-type{border-top:0}.pc-f>span{color:#64778a;font-size:10.5px;font-weight:700}.pc-f .cs-sel{max-width:none;width:100%;font-size:11.5px}\
@media (max-width:1100px){.pc-pn{grid-template-columns:1fr 1fr}.pc-sg{grid-template-columns:1fr}.pc-hd{grid-template-columns:auto 1fr;}}\
html[data-theme=dark] .cp-xb,html[data-theme=dark] .pc-b,html[data-theme=dark] .pc-st{background:#183447;border-color:#27465c;color:#c9d6e1}html[data-theme=dark] .cp-tbl tr.cp-xrow>td{background:#0f2433!important}\
html[data-theme=dark] .pc{background:#132a3b;border-color:#27465c;color:#e3ebf2}html[data-theme=dark] .pc-tl,html[data-theme=dark] .pc-bd{background:#10273a;border-color:#27465c}html[data-theme=dark] .pc-s,html[data-theme=dark] .pc-pn section{background:#132a3b;border-color:#27465c}\
html[data-theme=dark] .pc-it,html[data-theme=dark] .pc-ch{background:#183447;border-color:#27465c;color:#c9d6e1}html[data-theme=dark] .pc-cnj,html[data-theme=dark] .pc-pn h3{color:#e9c46a}html[data-theme=dark] .pc-pn h3 em{background:#c9a24a;color:#0b1c28}\
html[data-theme=dark] .pc-id small,html[data-theme=dark] .pc-as small,html[data-theme=dark] .pc-f>span,html[data-theme=dark] .pc-s p,html[data-theme=dark] .pc-own label,html[data-theme=dark] .pc-dts label{color:#9fb3c4}html[data-theme=dark] .pc-f{border-color:#27465c}\
html[data-theme=dark] .pc-s.inc{background:#2a1c1f;border-color:#6b3a36}html[data-theme=dark] .pc-s.pd{background:#2a2416;border-color:#6b5426}html[data-theme=dark] .pc-st.ok.s1{background:#16324a;color:#8fc0ec}html[data-theme=dark] .pc-st.ok.s2{background:#163428;color:#8fd4ac}html[data-theme=dark] .pc-st.ok.s3{background:#2a2140;color:#c5aef0}\
.cp-wrap{overflow:auto;max-height:calc(100vh - 220px);border-radius:12px;border:1px solid #e1ddd2}.cp-wrap .cp-tbl{border:0;border-radius:0;width:max-content;min-width:100%;overflow:visible}\
.cp-tbl th{white-space:nowrap}.cp-tbl td,.cp-tbl th{font-size:12px}.cp-tbl th:first-child,.cp-tbl td:first-child{position:sticky;left:0;z-index:2;background:inherit}.cp-tbl thead th{background:#dce3ee;color:#1f3a5f;border-bottom:1px solid #c3cedc;font-weight:800}.cp-tbl thead th:first-child{z-index:3;background:#dce3ee}html[data-theme=dark] .cp-tbl thead th{background:#183447!important;color:#e9c46a!important;border-color:#27465c}.cp-tbl tbody td:first-child{background:#fff}\
.cp-tbl .cs-sel,.cp-tbl .cs-in{font-size:12px;padding:3px 6px;max-width:180px}.cp-tbl .cp-det{min-width:200px;max-width:none}.cp-tbl td.cp-ass{max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cp-tbl td.cp-pd{min-width:150px;color:#8a5a00;font-weight:700}\
.cp-tbl tr.cp-cor td{background:#e8f1fb}.cp-tbl tr.cp-lib td{background:#f1ebfa}.cp-tbl tr.cp-pend td{background:#fff8dc}.cp-tbl tr.cp-pos td:first-child{box-shadow:inset 4px 0 0 #c45a4a}.cp-tbl .cs-cnj{color:#1f2442;font-weight:700;text-decoration:none;border-bottom:1px dashed #9aa}.cp-tbl .cs-cnj:hover{color:#8a6116}\
.cs-tbl td.num{font-variant-numeric:tabular-nums;font-weight:800;color:#1f2442}\
.cs-cnj{font-family:ui-monospace,Consolas,monospace;font-size:12px;white-space:nowrap}\
.cs-mut{color:#5d6475;font-size:12px}\
.cs-chip{display:inline-block;border-radius:999px;padding:1px 8px;margin:1px 3px 1px 0;font-size:11px;font-weight:800;border:1px solid transparent;white-space:nowrap}\
.cs-chip.tipo{background:#e8ecff;color:#2b3aa8}.cs-chip.meta{background:#fde7dc;color:#a03a12}.cs-chip.tema{background:#e6f3ec;color:#1b6b46}.cs-chip.esp{background:#f2ecff;color:#5b3aa8}.cs-chip.mpf{background:#eef3f7;color:#2c5c80}.cs-chip.etq{background:#f3f1ea;color:#5d6475;font-weight:600}\
.cs-tbl select{max-width:150px}\
.cs-ent label{display:flex;justify-content:space-between;gap:4px;font-size:10.5px;color:#5d6475;margin-bottom:2px}.cs-ent input{padding:2px 4px;font-size:11px;width:118px}\
.cs-por{display:block;font-size:10.5px;color:#8a7a55;margin-top:2px}\
.cs-empty{padding:40px;text-align:center;color:#5d6475;border:1px dashed #cfd3dd;border-radius:12px;background:#fff}\
.cs-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:14px}\
@media(max-width:1000px){.cs-grid{grid-template-columns:1fr}}\
.cs-rule{border:1px solid #e1ddd2;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fff}\
.cs-rule.off{opacity:.55}\
.cs-rule .h{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\
.cs-rule .h b{font-size:13.5px}\
.cs-rule textarea{width:100%;min-height:70px;border:1px solid #cfd3dd;border-radius:8px;padding:6px 8px;font:12.5px ui-monospace,Consolas,monospace}\
.cs-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0}\
.cs-row label{font-size:12px;color:#5d6475;display:flex;gap:6px;align-items:center}\
.cs-etq{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid #f0ece2;font-size:12.5px}\
.cs-etq .ef{font-size:11px}\
.cs-crit{border:1px solid #e1ddd2;border-radius:10px;background:#fff;margin-bottom:8px}\
.cs-crit>summary{display:flex;gap:8px;align-items:center;padding:9px 12px;cursor:pointer;font-weight:800;list-style:none}\
.cs-crit>summary::-webkit-details-marker{display:none}\
.cs-crit .nn{background:#1f2442;color:#fff;border-radius:6px;padding:1px 7px;font-size:11px}\
.cs-crit .in{padding:0 12px 12px}\
.cs-tg{border:1px solid #cfd3dd;background:#fff;border-radius:999px;padding:2px 9px;font:700 11px inherit;cursor:pointer;color:#5d6475}\
.cs-tg[aria-pressed=true]{background:#e6f3ec;border-color:#1b6b46;color:#1b6b46}\
.cs-mini{width:100%;border-collapse:collapse;font-size:12.5px}\
.cs-mini td,.cs-mini th{padding:5px 6px;border-top:1px solid #f0ece2;text-align:left}\
.cs-team{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}\
.cs-mem{border:1px solid #e1ddd2;border-radius:10px;background:#fff;padding:10px 12px}\
.cs-mem input,.cs-mem textarea,.cs-mem select{width:100%;margin-top:3px}\
.cs-mem textarea{min-height:44px;border:1px solid #cfd3dd;border-radius:8px;padding:5px 8px;font:12.5px inherit}\
.cs-mem label{display:block;font-size:11px;color:#5d6475;font-weight:700;margin-top:6px;text-transform:uppercase;letter-spacing:.05em}\
.cs-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#1f2442;color:#fff;padding:9px 16px;border-radius:9px;font-weight:700;z-index:2147483647;opacity:0;transition:opacity .2s;pointer-events:none}\
.cs-toast.on{opacity:1}\
.cs-h2g{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#5d6475;margin:26px 0 10px;font-weight:800}\
.cs-note{font-size:12px;color:#5d6475;background:#fbf7ec;border:1px solid #ecdcb7;border-radius:8px;padding:8px 10px;margin-bottom:12px}\
';
  var root = null;
  function montar() {
    if (root) return root;
    var st = Dc.createElement('style'); st.textContent = CSS; Dc.head.appendChild(st);
    root = Dc.createElement('div'); root.id = 'cs-root'; root.hidden = true;
    root.innerHTML = '<div class="cs-top"><div><small>Ab Initio · Gabinete A</small><h1>Sessões de julgamento</h1></div>' +
      '<div class="cs-tabs" role="tablist"><button data-aba="sessoes">Sessões</button><button data-aba="marcos">Marcos e prazos</button><button data-aba="planilha" id="cs-tab-planilha">Planilha da sessão</button>' +
      '<span class="cs-tsep"></span><button data-aba="regras">Regras de etiquetas</button><button data-aba="desig">Regras de designação</button></div>' +
      '<span class="cs-sp"></span><span id="cs-pill" class="cs-pill"></span><button class="cs-x" data-cs="fechar">Voltar ao acervo</button></div><div class="cs-body" id="cs-body"></div><div id="cs-dlg" class="cs-dlg" hidden></div>' +
      '<input type="file" id="cs-pdf" accept=".pdf,.json,.txt" hidden><input type="file" id="cs-imp" accept=".json" hidden><div class="cs-toast" id="cs-toast"></div>';
    Dc.body.appendChild(root);
    root.addEventListener('click', clique);
    root.addEventListener('change', mudou);
    root.addEventListener('input', digitou);
    root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-cs-add-cnj]')) { e.preventDefault(); var b = root.querySelector('[data-cs="cp-add"]'); if (b) acaoLinha(b); } });
    var dl = Dc.getElementById('cs-dlg'); dl.addEventListener('click', function (e) { e.stopPropagation(); cliqueDlg(e); }); dl.addEventListener('change', function (e) { e.stopPropagation(); mudouDlg(e); });
    root.addEventListener('click', function (e) {
      var s = e.target.closest('summary'); if (!s || e.target.closest('button')) return; var d = s.parentElement; if (!d || !d.dataset) return;
      if (d.dataset.csSec) UI.abertos['sec:' + d.dataset.csSec] = !d.open; else if (d.dataset.csCid) UI.abertos['crit:' + d.dataset.csCid] = !d.open;
    });
    return root;
  }
  function toast(t) { var el = Dc.getElementById('cs-toast'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('on'); }, 2600); }
  function abrir(aba) { montar(); if (aba) UI.aba = aba; root.hidden = false; Dc.documentElement.style.overflow = 'hidden'; render(); }
  function fechar() { if (root) root.hidden = true; Dc.documentElement.style.overflow = ''; }
  /* ---------- Calendário de sessões no topo da Visão geral das pautas ---------- */
  var CAL = { el: null, sig: '' };
  var CAL_FER = [['2026-11-02', 'Finados'], ['2026-11-15', 'Procl. República'], ['2026-11-20', 'Consc. Negra'], ['2026-12-08', 'Imac. Conceição [VALIDAR]'], ['2026-12-25', 'Natal']];
  function calSlot() {
    var slot = Dc.getElementById('cc-cal-slot'); if (!slot || !W.CMTCalendario) return;
    var lim = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10), prog = {};
    var sess = S.sessoes.filter(function (s) { return s.data && s.data >= lim; }).sort(function (a, b) { return a.data.localeCompare(b.data); }).map(function (s) {
      var f = s.fases || {}, it = s.itens || [];
      prog[s.data] = { minutadas: it.filter(function (x) { return x.dataMinuta; }).length, corrigidas: it.filter(function (x) { return x.dataCorrecao; }).length, liberadas: it.filter(function (x) { return x.dataLiberacao; }).length };
      return { date: s.data, hora: s.hora || '', marcos: { pautarAte: f.pauta || '', inicioPreparacao: f.inicio || '', entregaMinutas: f.minutas || '', liberacao: f.liberacao || '' }, processos: it.length, _id: s.id, cor: s.cor || '' };
    });
    var sig = JSON.stringify([sess, prog, feriadosCal(), expediente().recesso]);
    if (!CAL.el) { CAL.el = Dc.createElement('div'); CAL.el.id = 'cc-cal'; }
    slot.replaceWith(CAL.el);
    if (sig === CAL.sig) return;
    CAL.sig = sig;
    W.CMTCalendario.montar(CAL.el, { sessoes: sess }, { progresso: prog, feriados: feriadosCal(), recesso: expediente().recesso,
      abrir: function (dt) { var x = sess.find(function (y) { return y.date === dt; }); if (x && W.CMTSessao) W.CMTSessao.abrirSessao(x._id, 'pos'); } });
  }
  function render() {
    if (!root || root.hidden) return;
    root.querySelectorAll('.cs-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.aba === UI.aba)); });
    var body = Dc.getElementById('cs-body'), y = body.scrollTop, mesma = body.dataset.aba === UI.aba;
    body.dataset.aba = UI.aba;
    var ss0 = sessao(), tp = Dc.getElementById('cs-tab-planilha'); if (tp) tp.textContent = ss0 ? 'Planilha · ' + br(ss0.data) : 'Planilha da sessão';
    body.innerHTML = UI.aba === 'regras' ? telaRegras() : UI.aba === 'desig' ? telaDesig() : UI.aba === 'equipe' ? telaEquipe() : UI.aba === 'sessoes' ? '<div id="cc-cal-slot"></div>' + telaSessoes() + '<h2 class="cs-h2g">Marcos de todas as sessões</h2>' + telaMarcos(true) + telaExpediente() : UI.aba === 'marcos' ? telaMarcos() : telaPlanilha();
    pill(); renderDlg();
    if (UI.aba === 'sessoes') { try { calSlot(); } catch (e) { console.warn('[calendário]', e); } }
    if (mesma) body.scrollTop = y;
  }
  function opts(kind, val) {
    var L = pool(kind), h = '<option value="">—</option>';
    L.forEach(function (m) { h += '<option' + (N(m.nome) === N(val) ? ' selected' : '') + '>' + esc(m.nome) + '</option>'; });
    if (val && !membro(val)) h += '<option selected>' + esc(val) + '</option>';
    return h;
  }

  /* ---------- Sessões: a mais próxima no topo, depois as futuras; as passadas ao fim, esmaecidas ---------- */
  function ordenadas() {
    var d = hoje(), fut = S.sessoes.filter(function (x) { return (x.data || '') >= d; }).sort(function (a, b) { return a.data.localeCompare(b.data); }),
      pas = S.sessoes.filter(function (x) { return (x.data || '') < d; }).sort(function (a, b) { return b.data.localeCompare(a.data); });
    return fut.concat(pas);
  }
  function resumoDesig(ss) { var n = ss.itens.length; return { n: n, d: ss.itens.filter(function (i) { return i.servidor; }).length, c: ss.itens.filter(function (i) { return i.corretor; }).length }; }
  var DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  function diaSem(iso) { var d = new Date(iso + 'T12:00:00Z'); return isNaN(d) ? '' : DIAS[d.getUTCDay()]; }

  /* expediente: dias de trabalho, dias sem expediente (com nome), recesso e ausências da equipe */
  function expediente() { var E = S.expediente || (S.expediente = { nomes: {}, recesso: ['2026-12-20', '2027-01-20'] }); E.nomes = E.nomes || {}; E.tipos = E.tipos || {}; E.semPrazo = E.semPrazo || []; E.recesso = E.recesso || []; return E; }
  /* expediente do gabinete para a ficha, o prontuário e o calendário forense */
  W.CMTExpediente = function () { var c = calendario(), E = expediente(); return { diasSemana: (c.weekdays || [1, 2, 3, 4, 5]).slice(), semExpediente: (c.excluded || []).slice().sort(), nomes: E.nomes, tipos: E.tipos, semPrazo: E.semPrazo.slice(), recesso: E.recesso.slice() }; };
  function feriadosCal() { var E = expediente(), M = {}; CAL_FER.forEach(function (f) { M[f[0]] = f[1]; }); (calendario().excluded || []).forEach(function (d) { M[d] = E.nomes[d] || M[d] || 'Sem expediente'; }); return Object.keys(M).sort().map(function (d) { return [d, M[d]]; }); }
  /* Calendário do gabinete · expediente e prazos: o calendário do Controle de Pauta (meses, datas sem expediente com tipo, “não conta para prazo”,
     sugestão de feriados da Justiça Federal por ano). Grava em acervo/sessoes/calendario.json (expediente), lido pela Ex Officio e pela ficha. */
  var XP = { mes: '', meses: 3, ano: '', sug: false, sel: null, q: '', tipo: '', passadas: false };
  function FR() { return W.CMTForense || (W.parent && W.parent.CMTForense) || null; }
  var XP_COR = { 'Feriado nacional': 't1', 'Feriado da Justiça Federal': 't2', 'Recesso forense': 't3', 'Feriado estadual': 't4', 'Feriado municipal': 't4', 'Ponto facultativo': 't5', 'Suspensão de expediente': 't6', 'Outro': 't6' };
  var XP_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function xpAdd(s0, n) { var d = new Date(s0 + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function xpGrava(excl) { var c = calendario(); gravarCalendario({ weekdays: (c.weekdays || [1, 2, 3, 4, 5]).slice(), excluded: Array.from(new Set(excl)).sort() }); salvar(); CAL.sig = ''; render(); }
  function xpPoe(datas, tipo, nome, sp) { var c = calendario(), E = expediente(), ex = (c.excluded || []).slice();
    datas.forEach(function (d) { if (ex.indexOf(d) < 0) ex.push(d); E.tipos[d] = tipo || 'Outro'; if (nome) E.nomes[d] = nome; var k = E.semPrazo.indexOf(d); if (sp && k < 0) E.semPrazo.push(d); if (!sp && k >= 0) E.semPrazo.splice(k, 1); });
    E.semPrazo.sort(); xpGrava(ex); }
  function xpTira(d) { var c = calendario(), E = expediente(); delete E.nomes[d]; delete E.tipos[d]; E.semPrazo = E.semPrazo.filter(function (x) { return x !== d; }); xpGrava((c.excluded || []).filter(function (x) { return x !== d; })); }
  function xpMes(y, m, c, E, Fr, hj) {
    var ini = y + '-' + ('0' + m).slice(-2) + '-01', dw = new Date(ini + 'T12:00:00Z').getUTCDay(), d = xpAdd(ini, -dw), h = '', uteis = 0, ex = {}, sp = {};
    (c.excluded || []).forEach(function (x) { ex[x] = 1; }); E.semPrazo.forEach(function (x) { sp[x] = 1; });
    for (var i = 0; i < 42; i++) { var mm = +d.slice(5, 7), w = new Date(d + 'T12:00:00Z').getUTCDay(); if (i >= 35 && mm !== m) break;
      if (mm !== m) h += '<span class="xp-d fora"></span>';
      else { var trab = (c.weekdays || []).indexOf(w) >= 0, tp = ex[d] ? (E.tipos[d] || 'Outro') : '', mot = Fr ? Fr.motivo(d, W.CMTExpediente()) : '', cls = 'xp-d' + (!trab ? ' fds' : '') + (ex[d] ? ' ex ' + XP_COR[tp] : '') + (mot && !ex[d] ? ' np' : '') + (sp[d] ? ' sp' : '') + (d === hj ? ' hj' : '');
        if (trab && !ex[d]) uteis++;
        var tt = [ex[d] ? (E.nomes[d] || tp) + ' · ' + tp : '', mot ? 'não conta para prazo: ' + mot : (mot === '' && trab ? 'conta para prazo' : '')].filter(Boolean).join(' · ');
        h += '<button type="button" class="' + cls + '" data-xp-dia="' + d + '" title="' + esc(br(d) + (tt ? ' · ' + tt : '') + ' · clique para ' + (ex[d] ? 'tirar' : 'marcar sem expediente')) + '">' + (+d.slice(8)) + '</button>'; }
      d = xpAdd(d, 1); }
    return '<div class="xp-m"><div class="xp-mh"><b>' + XP_MES[m - 1] + ' ' + y + '</b><span>' + uteis + ' dias de trabalho</span></div><div class="xp-g">' + ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(function (x, k) { return '<span class="xp-w' + ((c.weekdays || []).indexOf(k) >= 0 ? '' : ' off') + '">' + x + '</span>'; }).join('') + h + '</div></div>';
  }
  function telaExpediente() {
    var cal = calendario(), E = expediente(), Fr = FR(), DS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], hj = hoje(), TIPOS = Fr ? Fr.TIPOS : ['Outro'];
    if (!XP.mes) XP.mes = hj.slice(0, 7); if (!XP.ano) XP.ano = hj.slice(0, 4);
    var y = +XP.mes.slice(0, 4), m = +XP.mes.slice(5, 7), meses = '';
    for (var k = 0; k < XP.meses; k++) { var mm = (m - 1 + k) % 12 + 1, yy = y + Math.floor((m - 1 + k) / 12); meses += xpMes(yy, mm, cal, E, Fr, hj); }
    var ex = (cal.excluded || []).slice().sort(), sp = {}; E.semPrazo.forEach(function (x) { sp[x] = 1; });
    var L = ex.filter(function (d) { return (XP.passadas || d >= hj.slice(0, 4) + '-01-01') && (!XP.tipo || (E.tipos[d] || 'Outro') === XP.tipo) && (!XP.q || (br(d) + ' ' + (E.nomes[d] || '') + ' ' + (E.tipos[d] || '')).toLowerCase().indexOf(XP.q.toLowerCase()) >= 0); });
    var noAno = ex.filter(function (d) { return d.slice(0, 4) === XP.ano; }), spAno = noAno.filter(function (d) { return sp[d]; }).length;
    var sug = '';
    if (XP.sug && Fr) { var S0 = Fr.sugestoes(+XP.ano); if (!XP.sel) { XP.sel = {}; S0.forEach(function (x) { if (x.on && ex.indexOf(x.date) < 0) XP.sel[x.date] = 1; }); }
      sug = '<div class="xp-sug"><div class="cs-row"><b>Sugestão para</b><select class="cs-sel" data-xp-ano>' + [-1, 0, 1, 2].map(function (o) { var a = String(+hj.slice(0, 4) + o); return '<option' + (a === XP.ano ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select><span class="cs-mut">feriados nacionais, da Justiça Federal (Lei 5.010/66) e de MS; pontos facultativos desmarcados</span></div>' +
        '<div class="xp-sl">' + S0.map(function (x) { var ja = ex.indexOf(x.date) >= 0; return '<label class="xp-si' + (ja ? ' ja' : '') + '"><input type="checkbox" data-xp-sel="' + x.date + '"' + (XP.sel[x.date] ? ' checked' : '') + (ja ? ' disabled' : '') + '><span class="xp-dt">' + br(x.date) + '</span><span>' + esc(x.label) + '</span><i class="xp-tp ' + XP_COR[x.type] + '">' + esc(x.type) + '</i>' + (ja ? '<em>já no calendário</em>' : '') + '</label>'; }).join('') + '</div>' +
        '<div class="cs-row"><button class="cs-btn pri" data-cs="xp-sug-aplicar">Adicionar ' + Object.keys(XP.sel).length + ' data(s)</button><button class="cs-btn" data-cs="xp-sug">Fechar</button></div></div>'; }
    return '<h2 class="cs-h2g">Calendário do gabinete · expediente e prazos</h2><div class="xp">' +
      '<div class="cs-card xp-top"><div class="xp-kpi"><div><span>Dias de trabalho na semana</span><b>' + (cal.weekdays || []).length + '</b></div><div><span>Datas sem expediente em ' + XP.ano + '</span><b>' + noAno.length + '</b></div><div><span>Que não contam para prazo</span><b>' + spAno + '</b></div><div><span>Recesso do expediente</span><b class="sm">' + (E.recesso[0] ? br(E.recesso[0]) + ' a ' + br(E.recesso[1] || '') : '—') + '</b></div></div>' +
        '<div class="cs-row">' + DS.map(function (d, i) { return '<button class="cs-tg" data-cs-dia="' + i + '" aria-pressed="' + ((cal.weekdays || []).indexOf(i) >= 0) + '">' + d + '</button>'; }).join('') +
        '<span style="flex:1"></span><label class="cs-mut">Recesso do expediente de <input type="date" class="cs-in" data-xp-rec="0" value="' + esc(E.recesso[0] || '') + '"></label><label class="cs-mut">a <input type="date" class="cs-in" data-xp-rec="1" value="' + esc(E.recesso[1] || '') + '"></label></div></div>' +
      '<div class="xp-l"><div class="cs-card xp-cal"><div class="cs-row"><button class="cs-btn" data-cs="xp-prev" aria-label="Meses anteriores">‹</button><b>' + XP_MES[m - 1] + ' ' + y + '</b><button class="cs-btn" data-cs="xp-next" aria-label="Próximos meses">›</button><button class="cs-btn" data-cs="xp-hoje">Hoje</button><span style="flex:1"></span><select class="cs-sel" data-xp-meses>' + [1, 3, 6].map(function (n) { return '<option value="' + n + '"' + (n === XP.meses ? ' selected' : '') + '>' + n + (n === 1 ? ' mês' : ' meses') + '</option>'; }).join('') + '</select></div>' +
        '<div class="xp-ms">' + meses + '</div><div class="xp-leg"><span><i class="lg w"></i>dia de trabalho</span><span><i class="lg t1"></i>feriado</span><span><i class="lg t3"></i>recesso</span><span><i class="lg t5"></i>ponto facultativo</span><span><i class="lg t6"></i>suspensão / outro</span><span><i class="lg np"></i>não conta para prazo (regra)</span><span><i class="lg sp"></i>marcada: não conta para prazo</span></div></div>' +
      '<div class="cs-card xp-lista"><div class="cs-row"><h2 style="margin:0">Datas sem expediente</h2><span class="cs-mut">' + ex.length + ' datas</span><span style="flex:1"></span><button class="cs-btn gold" data-cs="xp-sug">⚑ Feriados da Justiça Federal</button></div>' + sug +
        '<div class="xp-add"><label>De<input type="date" class="cs-in" data-xp-de></label><label>Até <small>(opcional)</small><input type="date" class="cs-in" data-xp-ate></label><label>Tipo<select class="cs-sel" data-xp-ntipo>' + TIPOS.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select></label>' +
          '<label class="w">Descrição<input class="cs-in" data-xp-nome-novo placeholder="ex.: Imaculada Conceição"></label><label class="ck"><input type="checkbox" data-xp-sp-novo checked> não conta para prazo</label><button class="cs-btn pri" data-cs="xp-add">Adicionar</button></div>' +
        '<div class="cs-row"><input class="cs-in" data-xp-q value="' + esc(XP.q) + '" placeholder="Buscar data ou descrição" style="flex:1"><select class="cs-sel" data-xp-ftipo><option value="">Todos os tipos</option>' + TIPOS.map(function (t) { return '<option' + (t === XP.tipo ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select><label class="cs-mut"><input type="checkbox" data-xp-passadas' + (XP.passadas ? ' checked' : '') + '> anos anteriores</label></div>' +
        '<div class="xp-it">' + (L.map(function (d) { return '<div class="xp-r' + (d < hj ? ' pass' : '') + '"><span class="xp-dt">' + br(d) + '<small>' + DS[new Date(d + 'T12:00:00Z').getUTCDay()] + '</small></span><input class="cs-in" data-xp-nome="' + d + '" value="' + esc(E.nomes[d] || '') + '" placeholder="descrição">' +
          '<select class="cs-sel" data-xp-tipo="' + d + '">' + TIPOS.map(function (t) { return '<option' + (t === (E.tipos[d] || 'Outro') ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select><label class="cs-mut ck"><input type="checkbox" data-xp-sp="' + d + '"' + (sp[d] ? ' checked' : '') + '> não conta p/ prazo</label><button class="cs-btn" data-cs="xp-del" data-d="' + d + '" title="Tirar do calendário">×</button></div>'; }).join('') || '<p class="cs-mut">Nenhuma data com esse filtro.</p>') + '</div></div></div>' +
      '<p class="cs-mut xp-nota">' + esc(Fr ? Fr.NOTA : '') + ' O recesso do expediente vale para os marcos das sessões.</p></div>';
  }
  function telaSessoes() {
    var d = hoje(), L = ordenadas(), prox = L.find(function (x) { return x.data >= d; });
    var h = '<div class="cs-bar"><button class="cs-btn gold" data-cs="pdf">Importar pauta (PDF)</button><span class="cs-mut">A data da pauta indica a sessão; se ela ainda não existir, é criada.</span>' +
      '<span class="cs-sp" style="flex:1"></span><label class="cs-mut">Nova sessão <input type="date" class="cs-in" data-cs-nova-data></label><button class="cs-btn pri" data-cs="nova-sessao">Cadastrar</button></div>';
    if (!L.length) return h + '<div class="cs-empty"><b>Nenhuma sessão cadastrada.</b><br>Cadastre uma sessão ou importe a pauta.</div>';
    var grupo = '';
    L.forEach(function (ss) {
      var g = ss === prox ? 'Próxima sessão' : ss.data >= d ? 'Sessões futuras' : 'Sessões realizadas';
      if (g !== grupo) { grupo = g; h += '<div class="cs-grp">' + g + '</div>'; }
      var r = resumoDesig(ss), f = ss.fases || {}, cls = ss === prox ? ' prox' : ss.data < d ? ' passada' : '';
      var mk = [['Peço dia', f.pauta], ['Início', f.inicio], ['Minutas', f.minutas], ['Liberação', f.liberacao]].filter(function (x) { return x[1]; })
        .map(function (x) { return '<span class="cs-tag gr">' + x[0] + ' ' + esc(br(x[1]).slice(0, 5)) + '</span>'; }).join('');
      var npv = r.n ? 0 : linhasSelecao(ss).length;
      var st = (npv ? '<span class="cs-tag gr">seleção prévia ' + npv + '</span>' : '') + (!r.n ? '<span class="cs-tag">sem pauta</span>' : '<span class="cs-tag ok">' + r.n + ' processos</span>' +
        '<span class="cs-tag ' + (r.d === r.n ? 'ok' : '') + '">minutas ' + r.d + '/' + r.n + '</span><span class="cs-tag ' + (r.c === r.n ? 'ok' : '') + '">correções ' + r.c + '/' + r.n + '</span>');
      h += '<div class="cs-ses' + cls + '"><div class="dt"><small>' + esc(diaSem(ss.data)) + (ss.hora ? ' · ' + esc(ss.hora) : '') + '</small>' + esc(br(ss.data)) + '</div>' +
        '<div><div class="mk">' + st + (ss.numero ? '<span class="cs-tag gr">PJe #' + esc(ss.numero) + '</span>' : '') + '</div><div class="mk">' + (mk || '<span class="cs-mut">marcos não informados</span>') + '</div></div>' +
        '<div class="cs-row cs-ses-ac" style="margin:0">' + (r.n ? '' : '<button class="cs-btn" data-ses="' + esc(ss.id) + '" data-acao="pre" title="Seleção prévia feita na Triagem">Pré-pauta' + (npv ? ' · ' + npv : '') + '</button>') +
        (r.n ? '<button class="cs-btn pri" data-ses="' + esc(ss.id) + '" title="Pauta oficial importada do PDF">Pauta · ' + r.n + '</button>' : '') +
        '<button class="cs-btn gold" data-ses="' + esc(ss.id) + '" data-acao="importar" title="O PDF dá o número oficial de cada item e confere com a pré-pauta">' + (r.n ? 'Reimportar PDF' : 'Importar PDF') + '</button>' +
        '<button class="cs-btn' + (ss.marcosPub || ss.publicada ? ' pub' : '') + '" data-ses="' + esc(ss.id) + '" data-acao="publicar-marcos" aria-pressed="' + !!(ss.marcosPub || ss.publicada) + '" title="' + (ss.marcosPub || ss.publicada ? 'Marcos publicados para a equipe (calendário e página inicial): clique para retirar' : 'Marcos não publicados: clique para mostrar à equipe as datas desta sessão (peço dia, preparação, entrega das minutas, liberação), sem a lista de processos') + '">' + (ss.marcosPub || ss.publicada ? '● Marcos' : '○ Marcos') + '</button>' +
        '<button class="cs-btn' + (ss.publicada ? ' pub' : '') + '" data-ses="' + esc(ss.id) + '" data-acao="publicar" aria-pressed="' + !!ss.publicada + '" title="' + (ss.publicada ? 'Listagem publicada na Ex Officio: clique para retirar' : 'Listagem não publicada: clique para liberar os processos desta pauta à equipe (Ex Officio e Consulta do Modus Operandi)') + '">' + (ss.publicada ? '● Pauta' : '○ Pauta') + '</button>' +
        '<button class="cs-btn" data-ses="' + esc(ss.id) + '" data-acao="apagar" title="Apagar sessão">×</button></div></div>';
    });
    return h;
  }
  function telaMarcos(geral) {
    var d = hoje(), L = ordenadas();
    var h = geral ? '<div class="cs-note">Hora e marcos de cada sessão, editáveis aqui de uma vez. Os mesmos campos aparecem no cabeçalho da página de cada sessão.</div>' : '<div class="cs-note">Datas de cada sessão. Os marcos valem para a Seleção Prévia do acervo e aparecem na lista de sessões. Para mudar a data do julgamento, cadastre a nova sessão e apague a antiga.</div>' +
      '<div class="cs-bar"><label class="cs-mut">Nova sessão <input type="date" class="cs-in" data-cs-nova-data></label><button class="cs-btn pri" data-cs="nova-sessao">Cadastrar</button></div>';
    if (geral) h = h.replace(/<div class="cs-bar">[\s\S]*$/, '');
    if (!L.length) return h + '<div class="cs-empty">Nenhuma sessão cadastrada.</div>';
    h += '<table class="cs-tbl"><thead><tr><th>Julgamento</th><th>Hora</th><th>Cor</th><th>Pautar até (peço dia)</th><th>Início da preparação</th><th>Entrega das minutas</th><th>Liberação dos votos</th><th>Pauta</th><th></th></tr></thead><tbody>';
    L.forEach(function (ss) {
      var f = ss.fases || {}, inp = function (k) { return '<input type="date" class="cs-in" data-cs-ses="' + esc(ss.id) + '" data-cs-fase="' + k + '" value="' + esc(f[k] || '') + '">'; };
      h += '<tr style="' + (ss.data < d ? 'opacity:.5' : '') + '"><td class="num">' + esc(br(ss.data)) + '<div class="cs-mut" style="font-weight:600">' + esc(diaSem(ss.data)) + '</div></td>' +
        '<td><input type="time" class="cs-in" data-cs-hora="' + esc(ss.id) + '" value="' + esc(ss.hora || '') + '"></td>' +
        '<td class="cs-corc"><input type="color" data-cs-cor="' + esc(ss.id) + '" value="' + esc(ss.cor || '#8a98a3') + '" title="' + (ss.cor ? 'Cor travada: o calendário usa sempre esta cor' : 'Cor automática: escolha uma cor para travá-la') + '">' + (ss.cor ? '<button class="cs-btn" data-cs="cor-auto" data-cs-ses-cor="' + esc(ss.id) + '" title="Destravar (volta à cor automática)">🔒</button>' : '<span class="cs-mut">auto</span>') + '</td>' +
        '<td>' + inp('pauta') + '</td><td>' + inp('inicio') + '</td><td>' + inp('minutas') + '</td><td>' + inp('liberacao') + '</td>' +
        '<td>' + (ss.itens.length ? '<button class="cs-btn" data-ses="' + esc(ss.id) + '">' + ss.itens.length + ' processos</button>' : '<button class="cs-btn gold" data-ses="' + esc(ss.id) + '" data-acao="importar">Importar</button>') + '</td>' +
        '<td><button class="cs-btn" data-ses="' + esc(ss.id) + '" data-acao="apagar" title="Apagar sessão">×</button></td></tr>';
    });
    return h + '</tbody></table>';
  }

  /* ---------- Designar: prévia pelas regras vigentes, ajuste e confirmação ---------- */
  function abrirDlg(ss) { UI.dlg = { id: ss.id, kinds: { d: true, c: true }, refazer: false, so: false, abertos: {} }; previa(); renderDlg(); }
  function previa() {
    var g = UI.dlg, ss0 = S.sessoes.find(function (x) { return x.id === g.id; }); if (!ss0) { UI.dlg = null; return; }
    var ss = UI.versao === 'pre' && preAberta(ss0) ? vistaPrevia(ss0) : ss0, cl = clone(ss0); cl.itens = clone(ss.itens);   /* na pré-pauta, designa a lista da seleção prévia */
    if (g.refazer) cl.itens.forEach(function (i) { if (g.kinds.d && i.porD !== 'manual') { i.servidor = ''; i.porD = ''; } if (g.kinds.c && i.porC !== 'manual') { i.corretor = ''; i.porC = ''; } });
    ['d', 'c'].forEach(function (kind) {
      if (!g.kinds[kind]) return;
      cl.itens.slice().sort(function (x, y) { return (+x.item || 0) - (+y.item || 0); }).forEach(function (it) {
        if (kind === 'd' ? it.servidor : it.corretor) return;
        var e = escolher(kind, it, cl); if (!e) return;
        if (kind === 'd') { it.servidor = e.nome; it.porD = e.por; } else { it.corretor = e.nome; it.porC = e.por; }
      });
    });
    g.cl = cl; g.orig = ss;
  }
  function renderDlg() {
    var box = Dc.getElementById('cs-dlg'); if (!box) return;
    var g = UI.dlg; if (!g || !g.cl) { box.hidden = true; box.innerHTML = ''; return; }
    var ss = g.orig, cl = g.cl, D = desigEfetiva(ss), por = new Map(ss.itens.map(function (i) { return [i.cnj, i]; }));
    var mud = cl.itens.filter(function (i) { var o = por.get(i.cnj) || {}; return (o.servidor || '') !== (i.servidor || '') || (o.corretor || '') !== (i.corretor || ''); });
    var semD = cl.itens.filter(function (i) { return !i.servidor; }).length, semC = cl.itens.filter(function (i) { return !i.corretor; }).length;
    var regras = D.ordem.map(function (cid, ix) {
      var on = D.on[cid] || {}, nl = Object.keys(D.rows).filter(function (k) { return k.indexOf(cid + ':') === 0 && (D.rows[k].d || D.rows[k].c); }).length;
      var det = cid === 'hist' ? 'histórico de cada servidor' : cid === 'esp' ? 'fichas da equipe' : nl + ' indicação(ões)';
      return '<li style="margin:2px 0' + (on.d || on.c ? '' : ';opacity:.45') + '"><b>' + (ix + 1) + '. ' + esc(CRIT_T[cid]) + '</b> <span class="cs-mut">· ' + det + ' · ' +
        [on.d ? 'minuta' : '', on.c ? 'correção' : ''].filter(Boolean).join(' e ') + (on.d || on.c ? '' : 'desligado') + '</span></li>';
    }).join('');
    var srv = {}; cl.itens.forEach(function (i) { [['d', i.servidor], ['c', i.corretor]].forEach(function (p) { if (!p[1]) return; var s = srv[p[1]] = srv[p[1]] || { d: [], c: [] }; s[p[0]].push(i); }); });
    var srvH = Object.keys(srv).sort(function (a, b) { return (srv[b].d.length + srv[b].c.length) - (srv[a].d.length + srv[a].c.length); }).map(function (nome) {
      var s = srv[nome], li = function (L, rot) { return L.length ? '<li style="margin-top:4px;font-weight:700;color:#5d6475">' + rot + '</li>' + L.sort(function (x, y) { return (+x.item || 0) - (+y.item || 0); }).map(function (i) { return '<li><b>#' + esc(i.item) + '</b> <span class="cs-cnj">' + esc(i.cnj) + '</span> <span class="cs-mut">' + esc(infoItem(i).assunto) + '</span></li>'; }).join('') : ''; };
      return '<details' + (g.abertos[nome] ? ' open' : '') + ' data-dlg-srv="' + esc(nome) + '"><summary><span>' + esc(nome) + '</span><span class="cs-mut">' + (s.d.length ? s.d.length + ' min.' : '') + (s.d.length && s.c.length ? ' · ' : '') + (s.c.length ? s.c.length + ' corr.' : '') + '</span></summary><ol>' + li(s.d, 'Minutas') + li(s.c, 'Correções') + '</ol></details>';
    }).join('');
    var L = (g.so ? mud : cl.itens).slice().sort(function (x, y) { return (+x.item || 0) - (+y.item || 0); });
    var linhas = L.map(function (i) {
      var o = por.get(i.cnj) || {}, inf = infoItem(i), ch = (o.servidor || '') !== (i.servidor || '') || (o.corretor || '') !== (i.corretor || '');
      return '<tr class="' + (ch ? 'mud' : '') + '" data-dcnj="' + esc(i.cnj) + '"><td class="num">' + esc(i.item) + '</td><td><span class="cs-cnj">' + esc(i.cnj) + '</span><div class="cs-mut">' + esc(inf.assunto) + '</div></td>' +
        '<td class="cs-mut">' + esc(inf.secao) + (inf.ramo ? '<div>' + esc(inf.ramo) + '</div>' : '') + '</td><td>' + marcas(i, inf).map(function (m) { return '<span class="cs-chip ' + m[0] + '">' + esc(m[1]) + '</span>'; }).join('') + '</td>' +
        '<td><select class="cs-sel" data-dlg-who="d">' + opts('d', i.servidor) + '</select><span class="cs-por">' + esc(i.servidor ? i.porD || '' : 'ninguém indicado') + (o.servidor && o.servidor !== i.servidor ? ' · antes: ' + esc(o.servidor) : '') + '</span></td>' +
        '<td><select class="cs-sel" data-dlg-who="c">' + opts('c', i.corretor) + '</select><span class="cs-por">' + esc(i.corretor ? i.porC || '' : 'ninguém indicado') + (o.corretor && o.corretor !== i.corretor ? ' · antes: ' + esc(o.corretor) : '') + '</span></td></tr>';
    }).join('');
    box.hidden = false;
    var y = box.querySelector('.bd') ? box.querySelector('.bd').scrollTop : 0;
    box.innerHTML = '<div class="box"><div class="hd"><h2>Designar · sessão de ' + esc(br(ss.data)) + '</h2><span class="cs-mut" style="color:#d0cdf3">' + cl.itens.length + ' processos</span><span style="flex:1"></span><button class="cs-x" data-dlg="cancelar">Fechar</button></div><div class="bd">' +
      '<div class="cs-grid"><div class="cs-card"><h2>Regras vigentes</h2><p class="n">Tentadas em ordem até uma indicar alguém. Para mudar, use a aba Designação e equipe.</p><ol style="list-style:none;padding:0;margin:0;font-size:12.5px">' + regras + '</ol>' +
      '<div class="cs-row" style="margin-top:8px"><button class="cs-btn" data-dlg="regras">Editar regras</button><span class="cs-mut">Equilibrar a carga: ' + (D.equilibrar !== false ? 'ligado' : 'desligado') + '</span></div></div>' +
      '<div class="cs-card"><h2>O que designar</h2><div class="cs-row"><button class="cs-tg" data-dlg="k-d" aria-pressed="' + g.kinds.d + '">Minutas</button><button class="cs-tg" data-dlg="k-c" aria-pressed="' + g.kinds.c + '">Correções</button></div>' +
      '<div class="cs-row"><button class="cs-tg" data-dlg="vazios" aria-pressed="' + !g.refazer + '">Só os processos sem ninguém</button><button class="cs-tg" data-dlg="refazer" aria-pressed="' + g.refazer + '">Refazer tudo (mantém as escolhas manuais)</button></div>' +
      '<div class="cs-kpis" style="margin:10px 0 0"><div class="cs-kpi"><b>' + mud.length + '</b><span>Alterações</span></div><div class="cs-kpi"><b>' + semD + '</b><span>Sem minuta</span></div><div class="cs-kpi"><b>' + semC + '</b><span>Sem correção</span></div></div></div></div>' +
      '<div class="cs-card"><h2>Por servidor</h2><p class="n">Quantos processos ficam com cada um, com o número do item e o processo.</p><div class="cs-srv">' + (srvH || '<span class="cs-mut">Ninguém designado.</span>') + '</div></div>' +
      '<div class="cs-bar"><button class="cs-tg" data-dlg="so" aria-pressed="' + g.so + '">Só os processos alterados</button><span class="cs-mut">As linhas em amarelo mudam ao confirmar. A troca manual de um nome fica marcada como escolha manual.</span></div>' +
      '<table class="cs-tbl"><thead><tr><th>Item</th><th>Processo</th><th>Seção e ramo</th><th>Marcações</th><th>Minuta</th><th>Correção</th></tr></thead><tbody>' + (linhas || '<tr><td colspan="6" class="cs-mut">Nenhum processo.</td></tr>') + '</tbody></table>' +
      '</div><div class="ft"><span class="cs-mut" style="margin-right:auto">Nada muda na planilha antes de confirmar.</span><button class="cs-btn" data-dlg="cancelar">Cancelar</button><button class="cs-btn gold" data-dlg="confirmar"' + (mud.length ? '' : ' disabled') + '>Confirmar designação (' + mud.length + ')</button></div></div>';
    if (y) box.querySelector('.bd').scrollTop = y;
  }
  function cliqueDlg(e) {
    var g = UI.dlg; if (!g) return;
    var sm = e.target.closest('[data-dlg-srv]>summary'); if (sm) { var nm = sm.parentElement.dataset.dlgSrv; g.abertos[nm] = !sm.parentElement.open; return; }
    var t = e.target.closest('[data-dlg]'); if (!t) return; var a = t.dataset.dlg;
    if (a === 'cancelar') { UI.dlg = null; renderDlg(); return; }
    if (a === 'regras') { UI.dlg = null; UI.aba = 'desig'; render(); return; }
    if (a === 'k-d' || a === 'k-c') { g.kinds[a.slice(2)] = !g.kinds[a.slice(2)]; previa(); renderDlg(); return; }
    if (a === 'vazios' || a === 'refazer') { g.refazer = a === 'refazer'; previa(); renderDlg(); return; }
    if (a === 'so') { g.so = !g.so; renderDlg(); return; }
    if (a === 'confirmar') {
      var por = new Map(g.cl.itens.map(function (i) { return [i.cnj, i]; })), n = 0;
      g.orig.itens.forEach(function (i) { var x = por.get(i.cnj); if (!x) return; if ((i.servidor || '') !== (x.servidor || '') || (i.corretor || '') !== (x.corretor || '')) n++; i.servidor = x.servidor; i.porD = x.porD; i.corretor = x.corretor; i.porC = x.porC; });
      UI.dlg = null; HIST = null; salvar(); render(); toast(n + ' processo(s) designado(s). Grave no procs-muta quando quiser.'); return;
    }
  }
  function mudouDlg(e) {
    var g = UI.dlg, t = e.target, tr = t.closest('tr[data-dcnj]'); if (!g || !tr || !t.dataset.dlgWho) return;
    var it = g.cl.itens.find(function (i) { return i.cnj === tr.dataset.dcnj; }); if (!it) return;
    if (t.dataset.dlgWho === 'd') { it.servidor = t.value; it.porD = 'manual'; } else { it.corretor = t.value; it.porC = 'manual'; }
    renderDlg();
  }

  /* ---------- Planilha da sessão ---------- */

  /* painel da sessão: 1) regras de etiquetas, 2) designação e correção; nada é aplicado sem confirmação */
  function propostas(rows) {
    return rows.map(function (x) { var it = x.it, inf = x.inf, a0 = Object.assign({}, it, { tipoManual: '', meta: '' });
      var k = julgKey(a0, inf), ap = k === 'ED' || k === 'AgInt' || k === 'JR' || k === 'AI' ? k : '—', meta = cpMeta(a0, inf), mpf = cpDefault(it, inf, 'mpf');
      var dif = [], man = [];
      if ((it.tipoManual || (ap === '—' ? '—' : '')) !== ap) (it.tipoManual ? man : dif).push('ap');
      if (meta && (it.meta || '') !== meta) (it.meta ? man : dif).push('meta');
      if (mpf && (it.mpf || '') !== mpf) (it.mpf ? man : dif).push('mpf');
      return { it: it, inf: inf, ap: ap, meta: meta, mpf: mpf, dif: dif, man: man }; }).filter(function (p) { return p.dif.length || p.man.length; });
  }
  var AP_T = { '—': '1º julg', ED: 'ED', AgInt: 'AgInt', JR: 'Retrat', AI: 'AI', META: 'META', '': 'auto' };
  function painelSessao(ss, rows) {
    var min = !!UI.pnMin, aba = UI.pnAba || 'regras', P = propostas(rows), sel = UI.pnSel || (UI.pnSel = {});
    var semD = rows.filter(function (x) { return !x.it.servidor; }).length, semC = rows.filter(function (x) { return !x.it.corretor; }).length;
    var h = '<div class="pn' + (min ? ' min' : '') + '"><div class="pn-h"><b>Regras e designações</b><span class="cs-mut">' + (P.filter(function (p) { return p.dif.length; }).length ? P.filter(function (p) { return p.dif.length; }).length + ' processo(s) com sugestão das regras' : 'marcações das regras conferidas') + ' · ' + (semD ? semD + ' sem minuta' : 'minutas designadas') + ' · ' + (semC ? semC + ' sem correção' : 'correções designadas') + '</span>' +
      '<span class="pn-tabs"><button data-cs="pn-aba" data-pn="regras" aria-pressed="' + (aba === 'regras') + '">1 · Regras de etiquetas</button><button data-cs="pn-aba" data-pn="desig" aria-pressed="' + (aba === 'desig') + '">2 · Designação e correção</button></span>' +
      '<button class="pn-min" data-cs="pn-min" title="' + (min ? 'Expandir' : 'Minimizar') + '" aria-label="' + (min ? 'Expandir' : 'Minimizar') + '"></button></div>';
    if (min) return h + '</div>';
    var cf = ss.conferencia;
    if (cf && !ss.__previa) h += '<div class="pn-cf"><b>Conferência do PDF com a pré-pauta</b><span>' + cf.ok + ' selecionado(s) entraram na pauta com o número oficial</span>' + (cf.fora.length ? '<span class="w">' + cf.fora.length + ' selecionado(s) ficaram fora da pauta</span>' : '') + (cf.novos.length ? '<span class="n">' + cf.novos.length + ' pautado(s) sem seleção prévia: confira as regras e designe</span>' : '') +
      '<button class="cs-btn" data-cs="cf-x">Dispensar</button>' + (cf.fora.length || cf.novos.length ? '<details><summary>ver os processos</summary>' + (cf.fora.length ? '<p><b>Fora da pauta</b> (seguem na seleção prévia; desmarque na Triagem se for o caso): ' + cf.fora.map(esc).join(' · ') + '</p>' : '') + (cf.novos.length ? '<p><b>Sem seleção prévia</b>: ' + cf.novos.map(esc).join(' · ') + '</p>' : '') + '</details>' : '') + '</div>';
    if (aba === 'regras') {
      var pend = P.filter(function (p) { return p.dif.length; });
      h += '<div class="pn-b"><p class="pn-n">As regras de etiquetas leem as etiquetas do PJe de cada processo e sugerem apreciação, meta e intervenção do MPF. Confira e fixe; o que você já alterou à mão aparece como <i>manual</i> e só muda se você marcar.</p>';
      if (!P.length) h += '<p class="pn-ok">Tudo conferido: as marcações da planilha batem com as regras.</p>';
      else h += '<div class="pn-tw"><table class="cs-tbl pn-t"><thead><tr><th><input type="checkbox" data-cs-pn-all' + (pend.length && pend.every(function (p) { return sel[p.it.cnj] !== false; }) ? ' checked' : '') + '></th><th>Item</th><th>Processo</th><th>Apreciação</th><th>Meta</th><th>Intervenção MPF</th><th>Etiquetas convertidas</th></tr></thead><tbody>' +
        P.map(function (p) { var it = p.it, on = sel[it.cnj] != null ? sel[it.cnj] : !!p.dif.length, cel = function (k, pro, cur) { var d = p.dif.indexOf(k) >= 0, mn = p.man.indexOf(k) >= 0; return '<td class="' + (d ? 'pd' : mn ? 'pm' : '') + '">' + (d || mn ? '<b>' + esc(pro || '—') + '</b>' + (cur ? '<small>' + (mn ? 'manual: ' : 'atual: ') + esc(cur) + '</small>' : '') : '<span class="cs-mut">' + esc(cur || pro || '—') + '</span>') + '</td>'; };
          return '<tr><td><input type="checkbox" data-cs-pn="' + esc(it.cnj) + '"' + (on ? ' checked' : '') + '></td><td class="num">' + esc(it.item) + '</td><td><a href="#" class="cs-cnj" data-cs-ficha="' + esc(it.cnj) + '">' + esc(it.cnj) + '</a></td>' +
            cel('ap', AP_T[p.ap], it.tipoManual ? AP_T[it.tipoManual] || it.tipoManual : '') + cel('meta', p.meta, it.meta) + cel('mpf', p.mpf, it.mpf) +
            '<td>' + marcas(it, p.inf).map(function (mk) { return '<span class="cs-chip ' + mk[0] + '">' + esc(mk[1]) + '</span>'; }).join('') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="cs-row"><button class="cs-btn pri" data-cs="pn-fixar">Fixar as marcadas</button><button class="cs-btn" data-cs="pn-ir-regras">Editar as regras de etiquetas</button><span class="cs-mut">Depois de fixar, passe à aba 2 para designar.</span></div>';
      h += '</div>';
    } else {
      var cg = {}; rows.forEach(function (x) { [['d', x.it.servidor], ['c', x.it.corretor]].forEach(function (q) { if (!q[1]) return; var s = cg[q[1]] = cg[q[1]] || { d: 0, c: 0, pd: 0, pc: 0 }; s[q[0]]++; s['p' + q[0]] += pesoItem(x.it); }); });
      var aus = S.equipe.filter(function (mb) { return ausente(mb, ss); }).map(function (mb) { return mb.nome; });
      h += '<div class="pn-b"><p class="pn-n">A prévia aplica as regras de designação e de correção (ordem e critérios em Configurações › Designação e equipe), equilibra a carga ponderada pela complexidade e pula quem está ausente no período da sessão. Nada muda até você confirmar; designações manuais são mantidas.</p>' +
        (aus.length ? '<p class="pn-aus">Ausentes no período: <b>' + aus.map(esc).join(', ') + '</b></p>' : '') +
        '<div class="pn-cg">' + (Object.keys(cg).length ? Object.keys(cg).sort(function (a, b) { return (cg[b].pd + cg[b].pc) - (cg[a].pd + cg[a].pc); }).map(function (k) { var s = cg[k]; return '<div><b>' + esc(k) + '</b><span>' + (s.d ? s.d + ' min. · carga ' + String(s.pd).replace('.', ',') : '') + (s.d && s.c ? '<br>' : '') + (s.c ? s.c + ' corr.' : '') + '</span></div>'; }).join('') : '<span class="cs-mut">Nenhuma designação ainda.</span>') + '</div>' +
        '<div class="cs-row"><button class="cs-btn gold" data-cs="designar">Prévia da designação…</button><button class="cs-btn" data-cs="pn-ir-desig">Editar regras de designação</button><button class="cs-btn" data-cs="limpar-desig">Limpar designações</button><span class="cs-mut">' + semD + ' sem minuta · ' + semC + ' sem correção</span></div></div>';
    }
    return h + '</div>';
  }
  /* ---------- cartão integral do processo na pauta (modelo GabCMT · Controle de Pauta) ---------- */
  var CX_REQ = ['Regularidade formal', 'Interesse recursal', 'Cabimento', 'Dialeticidade', 'Legitimidade recursal', 'Preclusão', 'Inovação recursal', 'Ausência de impugnação específica'];
  var CX_REC = ['Agravo de instrumento', 'Apelação', 'Apelação adesiva', 'Remessa necessária', 'Agravo interno', 'Embargos de declaração', 'RE/REsp · retratação', 'Recurso ordinário', 'Outro'];
  var CX_TJ = ['Agravo de Instrumento', 'Apelação', 'Remessa Necessária', 'Embargos de Declaração', 'Agravo Interno', 'Juízo de Retratação'];
  var CX_GUIA = {
    'Agravo de Instrumento': ['A decisão agravada está identificada (ID e data)?', 'A hipótese de cabimento (art. 1.015 do CPC ou Tema 988/STJ) está identificada?', 'O pedido de efeito suspensivo ou de tutela recursal já foi apreciado?', 'Há providência de comunicação ao juízo de origem?'],
    'Apelação': ['Sentença e recurso estão identificados (ID e data)?', 'Há capítulos da sentença não impugnados?', 'Há matéria de ordem pública a examinar de ofício?', 'Os fatos decisivos estão ligados a documento e ID?'],
    'Remessa Necessária': ['A hipótese do art. 496 do CPC está configurada?', 'O proveito econômico supera o limite legal?', 'Há recurso voluntário a julgar em conjunto?'],
    'Embargos de Declaração': ['O vício alegado (omissão, contradição, obscuridade, erro material) está identificado?', 'Os embargos pretendem rejulgamento da causa?', 'Há pedido de prequestionamento?', 'É caso de multa do art. 1.026, § 2º, do CPC?'],
    'Agravo Interno': ['Os fundamentos da decisão agravada foram impugnados especificamente?', 'A decisão agravada está identificada (ID e data)?', 'É caso de multa do art. 1.021, § 4º, do CPC?'],
    'Juízo de Retratação': ['O tema ou precedente vinculante está identificado?', 'O acórdão submetido diverge da tese firmada?', 'Houve embargos ao acórdão submetido?']
  };
  function cxObj(it) { return it.cartao || (it.cartao = {}); }
  function cxGet(it, p) { var o = it.cartao || {}; p.split('.').forEach(function (k) { o = o == null ? undefined : o[k]; }); return o == null ? '' : o; }
  function cxSet(it, p, v) { var o = cxObj(it), ks = p.split('.'); ks.slice(0, -1).forEach(function (k, i) { if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; }); o[ks[ks.length - 1]] = v; }
  function cxTipoJ(it, inf) {
    var c = it.cartao || {}; if (c.tipoJ) return c.tipoJ;
    var k = julgKey(it, inf), cl = N(it.classe || inf.classe || '');
    if (k === 'ED') return 'Embargos de Declaração'; if (k === 'AgInt') return 'Agravo Interno'; if (k === 'JR') return 'Juízo de Retratação';
    if (/agravo de instrumento/.test(cl) || inf.recurso === 'AI') return 'Agravo de Instrumento'; if (/remessa/.test(cl)) return 'Remessa Necessária'; return 'Apelação';
  }
  function cxDiaUtil(d, F, rec) { var w = d.getUTCDay(), s = d.toISOString().slice(0, 10); return w !== 0 && w !== 6 && !F[s] && !(rec[0] && s >= rec[0] && s <= rec[1]); }
  function cxPrazo(it) {
    var a = (it.cartao || {}).adm || {}; if (!a.intim) return null;
    var n = (+a.prazo || 15) * (a.dobro ? 2 : 1), F = {}, rec = expediente().recesso || [];
    feriadosCal().forEach(function (f) { F[f[0]] = 1; });
    var d = new Date(a.intim + 'T12:00:00Z'), cont = 0, g = 0;
    while (cont < n && g++ < 400) { d.setUTCDate(d.getUTCDate() + 1); if (cxDiaUtil(d, F, rec)) cont++; }
    var fim = d.toISOString().slice(0, 10);
    return { fim: fim, n: n, ok: a.prot ? a.prot <= fim : null };
  }
  /* perfil do caso para pesquisa no Modus Operandi (modelos, precedentes, parágrafos) */
  function perfilCaso(it, inf) {
    var C = it.cartao || {}, a = C.adm || {}, o = C.orig || {}, j = C.jul || {};
    var x = { processo: it.cnj, classe: it.classe || inf.classe || '', assunto: inf.assunto || '', secao: inf.secao || '', ramo: inf.ramo || '',
      subassuntos: C.subassuntos || '', especificidades: C.especificidades || '', questoes: C.questoes || '',
      tipoJulgamento: cxTipoJ(it, inf), decisaoOrigem: o.tipo || '', recursos: (C.recursos || []).map(function (r) { return [r.tipo, r.parte].filter(Boolean).join(' · '); }).filter(Boolean),
      tempestividade: it.tempest || '', preparo: it.preparo || '', requisito: a.req || '', mpf: [it.parecer, (C.mpfx || {}).sentido].filter(Boolean).join(' · '),
      ai: C.ai || null, remessa: C.rem || null, ed: C.ed ? { vicio: C.ed.vicio || '' } : null, retratacao: C.jr ? { tema: C.jr.tema || '', tribunal: C.jr.trib || '' } : null,
      resultado: it.resJulg || '', consectarios: it.consect || '', honorarios: it.honor || '', multa: j.multa || '', etiquetas: inf.tags || [] };
    Object.keys(x).forEach(function (k) { if (x[k] == null || x[k] === '' || (Array.isArray(x[k]) && !x[k].length)) delete x[k]; });
    return x;
  }
  function cartaoPauta(it, inf, ss, PRE, sel, v, mini) {
    var r = inf.r, C = it.cartao || {}, et = cpEtapa(it), pend = cpPend(it, inf), ant = outrasPautas(it.cnj, ss), meta = cpMeta(it, inf);
    var cf = function (ks) { return r ? campo(r, ks) : ''; };
    var partes = it.partes || [cf(['Polo Ativo', 'polo_ativo', 'Autor']), cf(['Polo Passivo', 'polo_passivo', 'Réu'])].filter(Boolean).join(' × ');
    var origem = cf(['Órgão Julgador de Origem', 'Origem', 'orgao_origem', 'Vara de Origem']);
    var tj = cxTipoJ(it, inf);
    var G = function (p) { return cxGet(it, p); };
    var inp = function (p, ph, tipo, re) { return '<input class="cs-in" data-cs-cx="' + p + '"' + (re ? ' data-cs-re' : '') + ' type="' + (tipo || 'text') + '" value="' + esc(G(p)) + '" placeholder="' + esc(ph || '') + '">'; };
    var sx = function (p, L, re) { var val = G(p); return '<select class="cs-sel" data-cs-cx="' + p + '"' + (re ? ' data-cs-re' : '') + '><option value="">—</option>' + L.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>'; };
    var ck = function (p, rot, re) { return '<label class="pc-ck"><input type="checkbox" data-cs-cx="' + p + '"' + (re ? ' data-cs-re' : '') + (G(p) ? ' checked' : '') + '>' + rot + '</label>'; };
    var ta = function (p, ph) { return '<textarea class="cs-in" rows="2" data-cs-cx="' + p + '" placeholder="' + esc(ph || '') + '">' + esc(G(p)) + '</textarea>'; };
    var linha = function (rot, html) { return '<div class="pc-f"><span>' + rot + '</span><div class="pc-v">' + html + '</div></div>'; };
    var dt = function (k) { return '<input type="date" class="cs-in" data-cs-dt="' + k + '" value="' + esc(it[k] || '') + '">'; };
    /* etapas */
    var st = [['A fazer', '·', ''], ['Minutado', '✎', 'dataMinuta'], ['Corrigido', '✓', 'dataCorrecao'], ['Liberado', '➤', 'dataLiberacao']];
    var ordem = { 'A fazer': 0, 'Minutado': 1, 'Corrigido': 2, 'Liberado': 3 }[et];
    var tl = st.map(function (x, i) { return (i ? '<i class="pc-cn"></i>' : '') + '<button class="pc-st' + (i <= ordem && i ? ' ok s' + i : '') + (i === ordem ? ' at' : '') + '" data-cs="cp-et" data-v="' + x[0] + '" title="Marcar como ' + x[0].toLowerCase() + '"><b>' + x[1] + '</b>' + x[0] + '</button>'; }).join('');
    var chips = '<span class="pc-ch k">' + esc(tj) + '</span>' + (C.relacionado ? '<span class="pc-ch">' + esc(C.relacionado) + '</span>' : '') +
      (meta && meta !== 'Não' && meta !== '—' ? '<span class="pc-ch m">' + esc(meta) + '</span>' : '') +
      (inf.secao ? '<span class="pc-ch">' + esc(inf.secao) + '</span>' : '') + (r ? '' : '<span class="pc-ch w">fora do acervo</span>') + (it.manual ? '<span class="pc-ch">incluído manualmente</span>' : '') +
      ant.map(function (y) { return '<span class="pc-ch n">pauta ' + esc(br(y.data).slice(0, 5)) + (y.resultado ? ' · ' + esc(y.resultado) : '') + '</span>'; }).join('');
    var h = '<div class="pc">' +
      '<div class="pc-hd"><div class="pc-it">' + esc(it.item || '—') + '</div>' +
        '<div class="pc-id"><a href="#" class="pc-cnj" data-cs-ficha="' + esc(it.cnj) + '" title="Abrir a ficha do processo">' + esc(it.cnj) + '</a><small>' + esc(partes || 'partes não informadas') + '</small></div>' +
        '<div class="pc-as"><b>' + esc(inf.assunto || 'assunto não informado') + '</b><small>Classe judicial: ' + esc([it.classe || inf.classe, inf.secao].filter(Boolean).join(' · ')) + '</small></div>' +
        '<div class="pc-ac"><button class="pc-b pri" data-cs="cx-comp" title="Pesquisar no Modus Operandi (modelos, precedentes e parágrafos) com os dados deste cartão">◈ Compêndio</button>' +
        '<button class="pc-b" data-cs-ficha="' + esc(it.cnj) + '" title="Abrir a ficha completa">▣ Ficha</button>' +
        '<button class="pc-b dz" data-cs="cp-del" title="Excluir da ' + (PRE ? 'pré-pauta' : 'pauta') + '">Excluir</button><button class="pc-b" data-cs="cp-exp" title="' + (mini ? 'Expandir' : 'Recolher') + '">' + (mini ? '▾' : '▴') + '</button></div></div>' +
      '<div class="pc-mr">' + chips + '<span class="pc-own"><label>Servidor · minuta<select class="cs-sel" data-cs-who="d">' + opts('d', it.servidor) + '</select></label><label>Corretor<select class="cs-sel" data-cs-who="c">' + opts('c', it.corretor) + '</select></label></span></div>' +
      '<div class="pc-tl">' + tl + '<button class="pc-b" data-cs="cp-undo" title="Volta uma etapa"' + (ordem ? '' : ' disabled') + '>Desfazer</button><span class="pc-sp">Status: <b>' + esc(et) + '</b></span>' +
        '<span class="pc-dts"><label>Minutado ' + dt('dataMinuta') + '</label><label>Corrigido ' + dt('dataCorrecao') + '</label><label>Liberado ' + dt('dataLiberacao') + '</label></span></div>';
    if (mini) return h + '<div class="pc-ft"><span class="pc-mut">' + esc([C.subassuntos, C.especificidades, pend && 'Pendências: ' + pend, it.intercor && 'Intercorrência: ' + it.intercor].filter(Boolean).join(' · ') || 'Caso ainda não caracterizado.') + '</span><button class="pc-xp" data-cs="cp-exp">Expandir ficha ↓</button></div></div>';
    h += '<div class="pc-bd">';
    var pts = (partes || '').split(/\s+[x×]\s+/).filter(Boolean);
    var sec0 = '<section class="pc-wide"><h3><em>◈</em>Caracterização do caso <small class="pc-mut">· dados que alimentam a pesquisa no Modus Operandi</small></h3><div class="pc-grid">' +
      linha('Assunto', esc(inf.assunto || '—')) + linha('Tipo de julgamento', '<select class="cs-sel" data-cs-cx="tipoJ" data-cs-re><option value="">auto: ' + esc(cxTipoJ({ tipoManual: it.tipoManual, classe: it.classe }, inf)) + '</option>' + CX_TJ.map(function (o) { return '<option' + (o === C.tipoJ ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>') +
      linha('Subassuntos', ta('subassuntos', 'subassuntos (do inteiro teor)')) + linha('Especificidades', ta('especificidades', 'peculiaridades do caso, distinções')) +
      linha('Questões controvertidas', ta('questoes', 'o que o recurso discute, ponto a ponto')) + linha('Recurso relacionado', inp('relacionado', 'ex.: Apelação relacionada nº …', 'text', 1)) + '</div></section>';
    var sec1 = '<section><h3><em>§</em>Processo e origem</h3>' +
      linha('Partes e papéis', pts.length ? pts.map(function (p, i) { return '<div class="pc-row"><span class="pc-pt">' + esc(p) + '</span>' + sx('papeis.' + i, ['Autor(a)', 'Réu/ré', 'Terceiro']) + '</div>'; }).join('') : '—') +
      linha('Decisão na origem', sx('orig.tipo', ['Decisão interlocutória', 'Sentença', 'Decisão monocrática', 'Acórdão'])) +
      linha('ID da decisão', inp('orig.id', 'ID')) + linha('Data', inp('orig.data', '', 'date')) +
      linha('Juízo de origem', inp('orig.juizo', origem || 'vara / juízo')) + linha('Julgador(a)', inp('orig.julgador', 'nome')) +
      linha('Acessórios', '<div class="pc-row">' + ck('orig.acc.custas', 'Custas', 1) + ck('orig.acc.honor', 'Honorários', 1) + ck('orig.acc.tutela', 'Tutela', 1) + ck('orig.acc.valor', 'Valor da causa', 1) + '</div>') +
      (G('orig.acc.custas') ? linha('Custas', inp('orig.custas', 'informação / valor')) : '') + (G('orig.acc.honor') ? linha('Honorários', inp('orig.honor', 'contexto (base, percentual)')) : '') +
      (G('orig.acc.tutela') ? linha('Tutela', inp('orig.tutela', 'deferida / indeferida · ID')) : '') + (G('orig.acc.valor') ? linha('Valor da causa', inp('orig.valor', cf(['Valor da Causa', 'valor_causa']) || 'R$')) : '') + '</section>';
    var pz = cxPrazo(it);
    var sec2 = '<section><h3><em>1</em>Regularidade e admissibilidade</h3>' +
      linha('Tempestividade', sel('tempest', CP.tempest, v('tempest'))) +
      linha('Intimação · protocolo', '<div class="pc-row">' + inp('adm.intim', '', 'date', 1) + inp('adm.prot', '', 'date', 1) + '</div>') +
      linha('Prazo (dias úteis)', '<div class="pc-row">' + inp('adm.prazo', '15', 'number', 1) + ck('adm.dobro', 'Em dobro', 1) + '</div>') +
      linha('Prévia do prazo', pz ? '<div class="pc-pz"><b>' + esc(br(pz.fim)) + '</b> · ' + pz.n + ' dias úteis' + (pz.ok == null ? '' : pz.ok ? ' · <span class="pc-ok">protocolo dentro do prazo</span>' : ' · <span class="pc-no">protocolo após o prazo</span>') + '<small class="pc-mut">Estimativa com fins de semana, feriados e recesso do expediente; não substitui a conferência.</small></div>' : '<span class="pc-mut">Informe a intimação para ver a estimativa.</span>') +
      linha('Preparo', sel('preparo', CP.preparo, v('preparo')) + '<div class="pc-row">' + ck('adm.dpu', 'Dispensa DPU') + ck('adm.ajg', 'AJG') + '</div>') +
      linha('Outro requisito', sx('adm.req', CX_REQ) + inp('adm.reqObs', 'observação')) +
      linha('Preliminares', sel('prelim', CP.prelim, v('prelim'))) + linha('Representação', sel('repres', CP.repres, v('repres'))) +
      linha('Mídias', sel('midias', CP.midias, v('midias'))) +
      linha('Intervenção do MPF', sel('mpf', CP.mpf, v('mpf'))) + linha('Parecer do MPF', sel('parecer', CP.parecer, v('parecer'))) +
      linha('Sentido do parecer', sx('mpfx.sentido', ['Prosseguimento do feito', 'Provimento do recurso', 'Não provimento do recurso', 'Outro'])) +
      linha('ID do parecer', inp('mpfx.id', 'ID')) + '</section>';
    var recs = C.recursos || [];
    var temAI = tj === 'Agravo de Instrumento' || recs.some(function (x) { return x.tipo === 'Agravo de instrumento'; }), temRem = tj === 'Remessa Necessária' || recs.some(function (x) { return x.tipo === 'Remessa necessária'; });
    var sec3 = '<section class="pc-wide"><h3><em>2</em>Recursos, autos e outras peças</h3>' +
      (recs.length ? recs.map(function (x, i) { var b = 'recursos.' + i + '.'; return '<div class="pc-rec"><b>Recurso ' + (i + 1) + '</b>' + sx(b + 'parte', ['Parte autora', 'Parte ré', 'União', 'INSS', 'Fazenda Nacional', 'Ambas', 'Outra']) + sx(b + 'tipo', CX_REC, 1) + inp(b + 'id', 'ID') +
        sx(b + 'contra', ['Intimada para responder', 'Prazo em curso', 'Apresentada', 'Não apresentada', 'Dispensada / não se aplica', 'Não mencionar']) + '<button class="pc-x" data-cs="cx-del" data-k="recursos" data-i="' + i + '" title="Remover">Remover</button></div>'; }).join('') : '<p class="pc-mut">Nenhum recurso registrado.</p>') +
      '<div class="pc-row"><button class="pc-b" data-cs="cx-add" data-k="recursos">+ Adicionar recurso</button><button class="pc-b" data-cs="cx-add" data-k="pecas">+ Outra peça</button><small class="pc-mut">IDs e datas ficam junto ao respectivo documento.</small></div>' +
      ((C.pecas || []).length ? '<div class="pc-sub">Outras peças</div>' + C.pecas.map(function (x, i) { return '<div class="pc-rec">' + inp('pecas.' + i + '.desc', 'parecer / documento relacionado') + inp('pecas.' + i + '.id', 'ID') + inp('pecas.' + i + '.data', '', 'date') + '<button class="pc-x" data-cs="cx-del" data-k="pecas" data-i="' + i + '">Remover</button></div>'; }).join('') : '') +
      '<div class="pc-grid">' +
      (temAI ? linha('AI · decisão agravada · ID', inp('ai.id', 'ID')) + linha('AI · data da decisão', inp('ai.data', '', 'date')) +
        linha('AI · hipótese (art. 1.015)', sx('ai.hip', ['Tutela provisória', 'Mérito do processo', 'Exibição de documento', 'Intervenção de terceiros', 'Execução / cumprimento', 'Tema 988 · urgência', 'Outra'])) +
        linha('AI · efeito suspensivo / tutela', sx('ai.efeito', ['Não requerido', 'Deferido', 'Indeferido', 'Pendente de análise'])) : '') +
      (temRem ? linha('Remessa · hipótese (art. 496)', sx('rem.hip', ['Contra ente público', 'Embargos à execução fiscal'])) + linha('Remessa · proveito econômico', inp('rem.proveito', 'R$ / estimativa')) : '') +
      (tj === 'Embargos de Declaração' ? linha('ED · acórdão embargado · ID', inp('ed.id', 'ID')) + linha('ED · data do acórdão', inp('ed.data', '', 'date')) +
        linha('ED · vício alegado', sx('ed.vicio', ['Omissão', 'Contradição', 'Obscuridade', 'Erro material', 'Mais de um vício'])) + linha('ED · ponto dos embargos', ta('ed.ponto', 'o que se alega')) : '') +
      (tj === 'Agravo Interno' ? linha('AgInt · decisão agravada · ID', inp('agint.id', 'ID')) + linha('AgInt · data da decisão', inp('agint.data', '', 'date')) + linha('AgInt · síntese da decisão', ta('agint.sintese', 'síntese')) + linha('AgInt · fundamentos', ta('agint.fund', 'fundamentos do agravo')) : '') +
      (tj === 'Juízo de Retratação' ? linha('Retratação · acórdão · ID', inp('jr.id', 'ID')) + linha('Retratação · data do acórdão', inp('jr.data', '', 'date')) + linha('Retratação · precedente / tema', inp('jr.tema', 'Tema nº …')) +
        linha('Retratação · tribunal', sx('jr.trib', ['STF', 'STJ'])) + linha('Retratação · embargos ao acórdão', sx('jr.ed', ['Não houve', 'Opostos e rejeitados', 'Opostos e acolhidos', 'Parcialmente acolhidos', 'Não conhecidos'])) + linha('Retratação · questão submetida', ta('jr.questao', 'questão')) : '') +
      '</div></section>';
    var multa = tj === 'Embargos de Declaração' || tj === 'Agravo Interno';
    var gq = CX_GUIA[tj] || [];
    var sec4 = '<section class="pc-wide"><h3><em>3</em>Julgamento · minuta</h3><div class="pc-grid">' +
      linha('Resultado', sel('resJulg', CP.resJulg, it.resJulg || '')) + linha('Consectários', sel('consect', CP.simnao, it.consect || '')) +
      linha('Honorários', sel('honor', CP.honor, it.honor || '')) + (multa ? linha('Multa', sx('jul.multa', ['Sem multa', 'Protelatórios · art. 1.026, § 2º', 'Reiteração · art. 1.026, § 3º', 'Art. 1.021, § 4º'])) : linha('Remessa necessária', ck('jul.remessa', 'Configurada'))) +
      linha('Tópico-síntese', sel('topico', CP.simnao, it.topico || '') + ta('jul.topico', 'texto do tópico-síntese')) +
      linha('Fundamentos', ta('jul.fund', 'fundamentos centrais do voto')) +
      linha('Comentário ao corretor', ta('jul.coment', 'observação complementar ao corretor')) + '</div>' +
      '<small class="pc-mut">Os campos de recursos e de julgamento variam conforme o tipo (' + esc(tj) + '). Confira o regime aplicável antes de concluir.</small>' +
      (gq.length ? '<div class="pc-sub">Análise guiada · ' + esc(tj) + '</div><div class="pc-gq">' + gq.map(function (q, i) { var p = 'guia.' + tj.replace(/\W+/g, '') + '.' + i, val = G(p); return '<div class="pc-q"><span>' + esc(q) + '</span><span class="pc-sn">' + ['Sim', 'Não'].map(function (o) { return '<label><input type="radio" name="' + esc(it.cnj + p) + '" data-cs-cx="' + p + '" value="' + o + '"' + (val === o ? ' checked' : '') + '>' + o + '</label>'; }).join('') + '</span></div>'; }).join('') + '</div>' : '') +
      '</section>';
    h += '<div class="pc-pn">' + sec0 + sec1 + sec2 + sec3 + sec4 + '</div></div></div>';
    return h;
  }
  function telaPlanilha() {
    var ss = sessao(), A = acervo(); if (ss) marcosDoPainel(ss);
    var sel = '<select class="cs-sel" data-cs-sel="sessao">' + (S.sessoes.length ? '' : '<option>nenhuma sessão</option>') +
      ordenadas().map(function (x) { return '<option value="' + esc(x.id) + '"' + (ss && x.id === ss.id ? ' selected' : '') + '>' + esc(br(x.data) + (x.hora ? ' · ' + x.hora : '') + ' · ' + (x.itens.length ? x.itens.length + ' itens' : 'sem pauta')) + '</option>'; }).join('') + '</select>';
    if (!ss) return '<div class="cs-empty"><b>Nenhuma sessão aberta.</b><br>Escolha uma sessão na aba <b>Sessões</b> ou importe a pauta de uma delas.</div>';
    var PRE = !!ss.__previa, sr = sessaoReal() || ss, npre = (sr.previa || []).length, npos = (sr.itens || []).length, fz = sr.fases || {};
    var IC = {pdf: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M12 11v6"/><path d="m9 14 3-3 3 3"/>', xlsx: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M12 17v-6"/><path d="m9 14 3 3 3-3"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>', back: '<path d="M15 18l-6-6 6-6"/>', del: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/>'}, ico = function (k) { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + IC[k] + '</svg>'; };
    var fi = function (k, rot) { return '<label><span>' + rot + '</span><input type="date" class="cs-in" data-cs-fase="' + k + '" value="' + esc(fz[k] || '') + '"></label>'; };
    var h = '<div class="sx-h"><div class="sx-t"><span class="sx-ey">Pautas · ' + (PRE ? 'pré-pauta (seleção prévia)' : 'pauta oficial') + '</span><div class="sx-tt"><h2>Sessão de ' + esc(br(sr.data)) + '</h2>' + sel + '</div>' +
      '<small>' + esc(diaSem(sr.data)) + (sr.hora ? ' · ' + esc(sr.hora) : '') + (sr.numero ? ' · PJe #' + esc(sr.numero) : '') + (sr.arquivo && !PRE ? ' · ' + esc(sr.arquivo) : '') + '</small></div>' +
      '<div class="sx-v" role="tablist"><button data-cs="sx-ver" data-v="pre" aria-pressed="' + PRE + '"' + (npos ? ' disabled title="Pauta oficial importada: a pré-pauta foi encerrada"' : '') + '>Pré-pauta<b>' + (npos ? '—' : npre) + '</b></button><button data-cs="sx-ver" data-v="pos" aria-pressed="' + !PRE + '"' + (npos ? '' : ' disabled title="Importe o PDF da pauta"') + '>Pauta<b>' + npos + '</b></button></div>' +
      '<div class="sx-ic"><span id="cs-pill2" class="cs-pill"></span>' +
      '<button data-cs="pdf-sessao" title="' + (npos ? 'Reimportar o PDF da pauta (números oficiais e conferência com a pré-pauta)' : 'Importar o PDF da pauta') + '">' + ico('pdf') + '</button>' +
      '<button data-cs="xlsx" title="Baixar a planilha no padrão do Controle de Pauta (.xlsx)"' + (ss.itens.length ? '' : ' disabled') + '>' + ico('xlsx') + '</button>' +
      '<button data-cs="copiar" title="Copiar a lista de processos"' + (ss.itens.length ? '' : ' disabled') + '>' + ico('copy') + '</button>' +
      '<button data-cs="sx-pub-marcos" class="sx-pub' + (sr.marcosPub || sr.publicada ? ' on' : '') + '" title="' + (sr.marcosPub || sr.publicada ? 'Marcos publicados para a equipe: clique para retirar' : 'Publicar para a equipe só os marcos da sessão (datas), sem a lista de processos') + '">' + (sr.marcosPub || sr.publicada ? '● Marcos' : '○ Marcos') + '</button>' +
      '<button data-cs="sx-pub" class="sx-pub' + (sr.publicada ? ' on' : '') + '" title="' + (sr.publicada ? 'Listagem publicada na Ex Officio: clique para retirar' : 'Publicar para a equipe a listagem da pauta (processos)') + '">' + (sr.publicada ? '● Pauta' : '○ Pauta') + '</button>' +
      '<button data-cs="sx-geral" title="Voltar à visão geral das sessões">' + ico('back') + '</button>' +
      '<button data-cs="apagar-sessao" class="dz" title="Apagar a sessão">' + ico('del') + '</button></div>' +
      '<div class="sx-m">' + fi('pauta', 'Peço dia') + fi('inicio', 'Início da preparação') + fi('minutas', 'Entrega das minutas') + fi('liberacao', 'Liberação') + '</div></div>';
    if (!A.rows.length) h += '<div class="cs-note">O acervo ainda não está carregado no painel. Sem ele, a planilha mostra só os dados da pauta, sem etiquetas, seção e histórico.</div>';
    if (!ss.itens.length && PRE) return h + '<div class="cs-empty"><b>Nenhum processo na seleção prévia desta sessão.</b><br>Os processos entram pela Triagem, no botão de seleção prévia do prontuário ou da planilha.</div>';
    if (!ss.itens.length) return h + '<div class="cs-empty"><b>Esta sessão ainda não tem pauta.</b><br>Importe o PDF do <i>Resumo do Espelho de Pauta</i> do PJe. O Ab Initio lê o número do item e o processo, cruza com o acervo e aplica as regras.</div>';
    var rows = ss.itens.map(function (it) { return { it: it, inf: infoItem(it) }; });
    var conta = { todos: rows.length, meta: 0, ED: 0, AgInt: 0, JR: 0, AI: 0, semD: 0, semC: 0, fora: 0 };
    rows.forEach(function (x) { var k = julgKey(x.it, x.inf); if (x.inf.c.metas.length) conta.meta++; if (conta[k] != null && k !== 'meta') conta[k]++; if (k !== 'AI' && x.inf.recurso === 'AI') conta.AI++; if (!x.it.servidor) conta.semD++; if (!x.it.corretor) conta.semC++; if (!x.inf.r) conta.fora++; });
    var kp = [['', 'Itens', conta.todos], ['meta', 'META', conta.meta], ['ED', 'ED', conta.ED], ['AgInt', 'AgInt', conta.AgInt], ['AI', 'Agr. instr.', conta.AI], ['JR', 'JR', conta.JR], ['semD', 'Sem minuta', conta.semD], ['semC', 'Sem correção', conta.semC], ['fora', 'Fora do acervo', conta.fora]];
    h += painelSessao(ss, rows);
    h += '<div class="cs-kpis">' + kp.map(function (k) { return '<button class="cs-kpi" data-cs-f="' + k[0] + '" aria-pressed="' + (UI.f === k[0]) + '"><b>' + k[2] + '</b><span>' + k[1] + '</span></button>'; }).join('') + '</div>';
    var cg = {}; pool('d').concat(pool('c')).forEach(function (m) { cg[m.nome] = [carga(m.nome, 'd', ss), carga(m.nome, 'c', ss)]; });
    var cgTxt = Object.keys(cg).filter(function (k) { return cg[k][0] || cg[k][1]; }).map(function (k) { return '<span class="cs-chip etq">' + esc(k) + ': ' + (cg[k][0] ? cg[k][0] + ' min.' : '') + (cg[k][0] && cg[k][1] ? ' · ' : '') + (cg[k][1] ? cg[k][1] + ' corr.' : '') + '</span>'; }).join('');
    if (false && cgTxt) h += '<div class="cs-card" style="padding:10px 14px"><b style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#5d6475">Carga por servidor</b><div style="margin-top:4px">' + cgTxt + '</div></div>';
    var opc = function (campo, rot, val) { var cnt = {}; rows.forEach(function (x) { var v = x.inf[campo] || '—'; cnt[v] = (cnt[v] || 0) + 1; });
      return '<select class="cs-sel" data-cs-filtro="' + campo + '"><option value="">' + rot + '</option>' + Object.keys(cnt).sort().map(function (v) { return '<option value="' + esc(v) + '"' + (v === val ? ' selected' : '') + '>' + esc(v) + ' (' + cnt[v] + ')</option>'; }).join('') + '</select>'; };
    h += '<div class="cs-bar"><input class="cs-in" style="flex:1;min-width:240px" placeholder="Filtrar por processo, assunto, servidor, etiqueta…" data-cs-q value="' + esc(UI.q) + '">' + opc('secao', 'Todas as seções', UI.fSec) + opc('ramo', 'Todos os ramos', UI.fRamo) +
      '<span class="cp-add"><input class="cs-in" data-cs-add-cnj placeholder="Incluir processo · nº CNJ" title="Inclui um processo avulso nesta ' + (PRE ? 'pré-pauta' : 'pauta') + '"><button class="cs-btn" data-cs="cp-add">+ Incluir</button></span>' +
      '<span class="cp-vis" role="group" aria-label="Forma da listagem"><button class="cs-btn" data-cs="cp-vis" data-v="tab" aria-pressed="' + (UI.vistaPl !== 'cards') + '">▦ Planilha</button><button class="cs-btn" data-cs="cp-vis" data-v="cards" aria-pressed="' + (UI.vistaPl === 'cards') + '">▤ Cartões</button></span>' +
      '<button class="cs-btn ghost" data-cs="cp-exp-all" title="Expandir ou recolher todos os cartões">' + (UI.expTodos ? 'Recolher todos' : 'Expandir todos') + '</button></div>';
    var q = N(UI.q);
    var L = rows.filter(function (x) {
      var k = julgKey(x.it, x.inf), f = UI.f;
      if (f === 'meta' && !x.inf.c.metas.length) return false;
      if (['ED', 'AgInt', 'JR'].indexOf(f) >= 0 && k !== f) return false;
      if (f === 'AI' && x.inf.recurso !== 'AI') return false;
      if (UI.fSec && (x.inf.secao || '—') !== UI.fSec) return false; if (UI.fRamo && (x.inf.ramo || '—') !== UI.fRamo) return false;
      if (f === 'semD' && x.it.servidor) return false; if (f === 'semC' && x.it.corretor) return false; if (f === 'fora' && x.inf.r) return false;
      if (q && N([x.it.cnj, x.it.item, x.inf.assunto, x.it.classe, x.it.servidor, x.it.corretor, x.inf.tags.join(' '), x.it.partes].join(' ')).indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return (+a.it.item || 0) - (+b.it.item || 0); });
    var sel = function (k, lista, val, ph) { return '<select class="cs-sel cp-s" data-cs-cp="' + k + '"><option value="">' + (ph || '—') + '</option>' + lista.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + (val && lista.indexOf(val) < 0 ? '<option selected>' + esc(val) + '</option>' : '') + '</select>'; };
    var COLS = ['Item', 'Processo', 'Classe', 'Assunto', 'Detalhes', 'Pendências', 'Etapa', 'Minutado em', 'Servidor', 'Revisor', 'Intervenção MPF', 'Parecer MPF', 'Preliminares', 'Tempestividade', 'Preparo', 'Representação', 'Mídias', 'Resultado', 'Consectários', 'Honorários', 'Tópico-síntese', 'Desfecho', 'Intercorrência', 'Meta', 'Apreciação'];
    if (UI.vistaPl === 'cards') {
      h += '<div class="pc-list">' + L.map(function (x) { var it = x.it, ab = !!(UI.exp && UI.exp[dig(it.cnj)]) || UI.expTodos;
        return '<div class="pc-host' + (ab ? ' ab' : '') + '" data-cnj="' + esc(it.cnj) + '">' + cartaoPauta(it, x.inf, ss, PRE, sel, function (k) { return cpVal(it, x.inf, k); }, !ab) + '</div>'; }).join('') + '</div>';
      if (!L.length) h += '<div class="cs-empty" style="margin-top:10px">Nenhum item com esse filtro.</div>';
      return h;
    }
    h += '<div class="cp-wrap"><table class="cs-tbl cp-tbl"><thead><tr>' + COLS.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>';
    L.forEach(function (x) {
      var it = x.it, inf = x.inf, v = function (k) { return cpVal(it, inf, k); }, et = cpEtapa(it), pend = cpPend(it, inf), ant = outrasPautas(it.cnj, ss);
      var cls = [inf.r ? '' : 'fora', et === 'Liberado' ? 'cp-lib' : et === 'Corrigido' ? 'cp-cor' : '', pend ? 'cp-pend' : '', /Retirado|Adiado/.test(it.resultado || '') || it.intercor ? 'cp-pos' : ''].join(' ');
      var aberto = !!(UI.exp && UI.exp[dig(it.cnj)]) || UI.expTodos;
      h += '<tr class="' + cls + (aberto ? ' cp-aberto' : '') + '" data-cnj="' + esc(it.cnj) + '"><td class="num"><div class="cp-it"><button class="cp-xb" data-cs="cp-exp" aria-expanded="' + aberto + '" title="' + (aberto ? 'Recolher' : 'Expandir') + ' o cartão do processo">' + (aberto ? '▾' : '▸') + '</button><b>' + esc(it.item || (it.manual ? '+' : '')) + '</b><button class="cp-xb cp-del" data-cs="cp-del" title="Excluir da ' + (PRE ? 'pré-pauta' : 'pauta') + '">×</button></div></td>' +
        '<td><a href="#" class="cs-cnj" data-cs-ficha="' + esc(it.cnj) + '" title="Abrir a ficha do processo">' + esc(it.cnj) + '</a>' + (inf.r ? '' : '<div class="cs-mut" style="color:#a03a12">não está no acervo</div>') + (ant.length ? '<div class="cs-mut" style="color:#5b3f7c">pautas anteriores: ' + ant.map(function (y) { return esc(br(y.data).slice(0, 5) + (y.resultado ? ' · ' + y.resultado : '')); }).join('; ') + '</div>' : '') + '</td>' +
        '<td title="' + esc(it.classe || inf.classe || '') + '">' + esc(cpClasse(it.classe || inf.classe) || it.classe || inf.classe || '') + '</td>' +
        '<td class="cp-ass" title="' + esc(inf.assunto) + '">' + esc(inf.assunto) + '</td>' +
        '<td><input class="cs-in cp-det" data-cs-obs value="' + esc(it.obs || '') + '" placeholder="anotações"></td>' +
        '<td class="cp-pd">' + esc(pend) + '</td>' +
        '<td><select class="cs-sel cp-s" data-cs-etapa><option value="">' + (et === 'A fazer' ? 'A fazer' : et) + '</option>' + ['Corrigido', 'Liberado'].map(function (o) { return '<option' + (o === et ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '<option value="__limpa">desfazer</option></select></td>' +
        '<td><input type="date" class="cs-in" data-cs-dt="dataMinuta" value="' + esc(it.dataMinuta || '') + '"></td>' +
        '<td><select class="cs-sel" data-cs-who="d">' + opts('d', it.servidor) + '</select>' + (it.servidor && it.porD ? '<span class="cs-por">' + esc(it.porD) + '</span>' : '') + '</td>' +
        '<td><select class="cs-sel" data-cs-who="c">' + opts('c', it.corretor) + '</select>' + (it.corretor && it.porC ? '<span class="cs-por">' + esc(it.porC) + '</span>' : '') + '</td>' +
        '<td>' + sel('mpf', CP.mpf, v('mpf')) + '</td><td>' + sel('parecer', CP.parecer, v('parecer')) + '</td><td>' + sel('prelim', CP.prelim, v('prelim')) + '</td>' +
        '<td>' + sel('tempest', CP.tempest, v('tempest')) + '</td><td>' + sel('preparo', CP.preparo, v('preparo')) + '</td><td>' + sel('repres', CP.repres, v('repres')) + '</td><td>' + sel('midias', CP.midias, v('midias')) + '</td>' +
        '<td>' + sel('resJulg', CP.resJulg, it.resJulg || '') + '</td><td>' + sel('consect', CP.simnao, it.consect || '') + '</td><td>' + sel('honor', CP.honor, it.honor || '') + '</td><td>' + sel('topico', CP.simnao, it.topico || '') + '</td>' +
        '<td><select class="cs-sel cp-s" data-cs-res>' + ['', 'Julgado', 'Retirado', 'Adiado'].concat(['Julgado', 'Retirado', 'Adiado', ''].indexOf(it.resultado || '') < 0 ? [it.resultado] : []).map(function (o) { return '<option value="' + esc(o) + '"' + ((it.resultado || '') === o ? ' selected' : '') + '>' + (o || '—') + '</option>'; }).join('') + '</select></td>' +
        '<td><input class="cs-in" data-cs-cp-txt="intercor" value="' + esc(it.intercor || '') + '" placeholder="motivo · chamado"></td>' +
        '<td>' + sel('meta', CP.meta, cpMeta(it, inf)) + '</td>' +
        '<td><select class="cs-sel cp-s" data-cs-tipo>' + [['', 'auto: ' + cpApreciacao(it, inf)], ['—', '1º julg'], ['ED', 'ED'], ['AgInt', 'AgInt'], ['JR', 'Retrat'], ['AI', 'AI'], ['META', 'META']].map(function (o) { return '<option value="' + o[0] + '"' + ((it.tipoManual || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></td></tr>';
      if (aberto) h += '<tr class="cp-xrow" data-cnj="' + esc(it.cnj) + '"><td colspan="' + COLS.length + '"><div class="cp-card-host">' + cartaoPauta(it, inf, ss, PRE, sel, v) + '</div></td></tr>';
    });
    h += '</tbody></table></div>';
    if (!L.length) h += '<div class="cs-empty" style="margin-top:10px">Nenhum item com esse filtro.</div>';
    return h;
  }

  /* ---------- Regras de etiquetas ---------- */
  function contagemEtiquetas() {
    var m = new Map(); acervo().rows.forEach(function (r) { var vistas = {}; etiquetas(r).forEach(function (t) { var d = N(t); if (!d || vistas[d]) return; vistas[d] = 1; var x = m.get(d) || { t: t, n: 0 }; x.n++; m.set(d, x); }); });
    return [].concat(Array.from(m.values())).sort(function (a, b) { return b.n - a.n; });
  }
  function efeitoDe(t) {
    var d = N(t), H = ativas().filter(function (r) { return casaRegra(r, d); });
    if (H.some(function (r) { return r.ef === 'ignorar'; })) return [['etq', 'ignorada']];
    return H.map(function (r) { var cls = TIPOS.indexOf(r.ef) >= 0 ? 'tipo' : (r.ef === 'META' || r.ef === 'meta') ? 'meta' : r.ef; var rot = r.ef === 'META' ? ('META ' + numerosMeta(d).join(', ')).trim() : r.ef === 'meta' ? 'Meta ' + r.v : EF[r.ef].v ? EF[r.ef].s + ': ' + r.v : EF[r.ef].s; return [cls, rot]; });
  }
  function alcance(r) { var n = 0, ex = []; contagemEtiquetas().forEach(function (e) { if (casaRegra(r, N(e.t))) { n += e.n; if (ex.length < 6) ex.push(e.t); } }); return { n: n, ex: ex }; }
  function telaRegras() {
    var h = '<div class="cs-note">As regras convertem etiquetas do acervo em marcações (META, ED, AgInt, JR, tema, especificidade, MPF) ou mandam ignorá-las. A etiqueta continua no acervo principal; no painel aparece só a marcação. ' +
      'Termos: sem prefixo = <b>começa por</b>; <code>=</code> igual; <code>*</code> contém; <code>$</code> termina com; <code>/…/</code> expressão regular. Um termo por linha.</div>';
    h += '<div class="cs-bar"><select class="cs-sel" data-cs-novo-ef>' + Object.keys(EF).map(function (k) { return '<option value="' + k + '">' + esc(EF[k].t) + '</option>'; }).join('') + '</select><button class="cs-btn pri" data-cs="nova-regra">Nova regra</button>' +
      '<button class="cs-btn" data-cs="exp-regras">Exportar regras (JSON)</button><button class="cs-btn" data-cs="imp">Importar JSON</button><button class="cs-btn" data-cs="regras-padrao">Restaurar padrão</button></div>';
    h += '<div class="cs-grid"><div>';
    S.regras.forEach(function (r) {
      var a = alcance(r), aberta = UI.regraAberta === r.id;
      h += '<div class="cs-rule' + (r.on ? '' : ' off') + '" data-regra="' + esc(r.id) + '"><div class="h"><button class="cs-tg" data-cs="on-regra" aria-pressed="' + r.on + '">' + (r.on ? 'ativa' : 'desligada') + '</button>' +
        '<b>' + esc(r.nome || EF[r.ef].t) + (r.v ? ' · ' + esc(r.v) : '') + '</b><span class="cs-mut">' + a.n + ' processo(s)</span><span class="cs-sp" style="flex:1"></span>' +
        '<button class="cs-btn" data-cs="abrir-regra">' + (aberta ? 'Fechar' : 'Editar') + '</button></div>' +
        '<div class="cs-mut" style="margin-top:4px">' + r.termos.map(function (x) { return '<code>' + esc(termoParaTexto(x)) + '</code>'; }).join(' ') + (a.ex.length ? ' · ex.: ' + a.ex.map(esc).join(', ') : '') + '</div>';
      if (aberta) {
        h += '<div class="cs-row"><label>Efeito <select class="cs-sel" data-rf="ef">' + Object.keys(EF).map(function (k) { return '<option value="' + k + '"' + (k === r.ef ? ' selected' : '') + '>' + esc(EF[k].t) + '</option>'; }).join('') + '</select></label>' +
          (EF[r.ef].v ? '<label>' + esc(EF[r.ef].v) + ' <input class="cs-in" data-rf="v" value="' + esc(r.v) + '"></label>' : '') +
          '<label>Nome <input class="cs-in" data-rf="nome" value="' + esc(r.nome) + '"></label></div>' +
          '<label class="cs-mut">Termos (um por linha)</label><textarea data-rf="termos">' + esc(r.termos.map(termoParaTexto).join('\n')) + '</textarea>' +
          '<label class="cs-mut">Exceções (um por linha; padrão: contém)</label><textarea data-rf="exceto" style="min-height:44px">' + esc(r.exceto.map(function (x) { return x.m === 'contem' ? x.t : termoParaTexto(x); }).join('\n')) + '</textarea>' +
          '<div class="cs-row"><label>Só para as classes (separe por ;) <input class="cs-in" style="min-width:260px" data-rf="classes" value="' + esc(r.classes.join('; ')) + '"></label><label>Nota <input class="cs-in" style="min-width:220px" data-rf="nota" value="' + esc(r.nota) + '"></label></div>' +
          '<div class="cs-row"><button class="cs-btn pri" data-cs="salvar-regra">Aplicar</button><button class="cs-btn" data-cs="apagar-regra">Apagar regra</button></div>';
      }
      h += '</div>';
    });
    h += '</div><div><div class="cs-card"><h2>Etiquetas do acervo</h2><p class="n">Cada etiqueta, quantos processos a têm e o que as regras fazem com ela.</p>' +
      '<input class="cs-in" style="width:100%" placeholder="Buscar etiqueta…" data-cs-etq value="' + esc(UI.etqQ) + '"><div id="cs-etq-list">' + listaEtiquetas() + '</div></div></div></div>';
    return h;
  }
  function listaEtiquetas() {
    var q = N(UI.etqQ), L = contagemEtiquetas().filter(function (e) { return !q || N(e.t).indexOf(q) >= 0; });
    if (!L.length) return '<p class="cs-mut">' + (acervo().rows.length ? 'Nenhuma etiqueta.' : 'Carregue o acervo no painel para ver as etiquetas.') + '</p>';
    return L.slice(0, UI.etqLim).map(function (e) { var ef = efeitoDe(e.t); return '<div class="cs-etq"><span>' + esc(e.t) + ' <span class="cs-mut">· ' + e.n + '</span></span><span class="ef">' + (ef.length ? ef.map(function (x) { return '<span class="cs-chip ' + x[0] + '">' + esc(x[1]) + '</span>'; }).join('') : '<span class="cs-mut">sem regra</span>') + '</span></div>'; }).join('') +
      (L.length > UI.etqLim ? '<p class="cs-mut">Mostrando ' + UI.etqLim + ' de ' + L.length + '. Use a busca para achar as demais.</p>' : '');
  }

  /* assuntos agrupados por seção e ramo; por padrão, os da sessão aberta e os que já têm regra */
  var SECOES = ['1ª Seção', '2ª Seção', '3ª Seção', 'Sem seção'];
  function telaTemas(ss, D, cid) {
    cid = cid || 'tema';
    var m = new Map(), put = function (a, sec, ramo, n) {
      var k = N(a); if (!k) return; var x = m.get(k);
      if (!x) { x = { a: a, sec: sec || 'Sem seção', ramo: ramo || 'Sem ramo', n: 0 }; m.set(k, x); }
      x.n += n;
    };
    (ss ? ss.itens : []).forEach(function (it) { var inf = infoItem(it); put(inf.assunto, inf.secao, inf.ramo, 1); (cid === 'tema' ? inf.c.tema : cid === 'esp' ? inf.c.esp : []).forEach(function (v) { put(v, inf.secao, inf.ramo, 1); }); });
    Object.keys(D.rows).filter(function (k) { return k.indexOf(cid + ':') === 0; }).forEach(function (k) {
      var r = D.rows[k]; if (!(r.d || r.c)) return; var a = r.cap || k.slice(cid.length + 1); put(a, secaoDoCatalogo(a) || (SECOES.indexOf(a) >= 0 ? a : ''), ramoDoCatalogo(a), 0);
    });
    if (UI.temaTodos && CATALOGO) CATALOGO.forEach(function (s) { if (s.active !== false) put(s.name, s.section, s.ramoCurto, 0); });
    var q = N(UI.temaQ), L = Array.from(m.values()).filter(function (x) { return !q || N(x.a + ' ' + x.ramo + ' ' + x.sec).indexOf(q) >= 0; });
    var h = '<div class="cs-bar" style="margin:4px 0 8px"><input class="cs-in" style="flex:1;min-width:220px" placeholder="Buscar assunto ou ramo…" data-cs-temaq value="' + esc(UI.temaQ) + '">' +
      '<button class="cs-tg" data-cs="tema-todos" aria-pressed="' + !!UI.temaTodos + '">' + (UI.temaTodos ? 'Todos os assuntos da tabela' : 'Só os da sessão e os com regra') + '</button></div>';
    if (!L.length) return h + '<p class="cs-mut">' + (ss || UI.temaTodos ? 'Nenhum assunto com esse filtro.' : 'Importe uma pauta ou mostre todos os assuntos da tabela.') + '</p>';
    SECOES.concat(Array.from(new Set(L.map(function (x) { return x.sec; }))).filter(function (s) { return SECOES.indexOf(s) < 0; })).forEach(function (sec) {
      var LS2 = L.filter(function (x) { return x.sec === sec; }); if (!LS2.length) return;
      var nSess = LS2.reduce(function (s, x) { return s + x.n; }, 0), nReg = LS2.filter(function (x) { var r = linha(cid, x.a); return r.d || r.c; }).length;
      var chv = 'sec:' + cid + '|' + sec, aberta = q ? true : UI.abertos[chv] != null ? UI.abertos[chv] : LS2.length <= 40;
      h += '<details class="cs-crit" style="margin:6px 0"' + (aberta ? ' open' : '') + ' data-cs-sec="' + esc(cid + '|' + sec) + '"><summary style="font-size:13px">' + esc(sec) +
        '<span class="cs-mut" style="font-weight:600">' + LS2.length + ' assunto(s)' + (nSess ? ' · ' + nSess + ' processo(s) na sessão' : '') + (nReg ? ' · ' + nReg + ' com regra' : '') + '</span></summary><div class="in">' +
        '<table class="cs-mini"><thead><tr><th>Assunto</th><th style="width:170px">Minuta</th><th style="width:170px">Correção</th></tr></thead><tbody>';
      var ramos = Array.from(new Set(LS2.map(function (x) { return x.ramo; }))).sort(function (a, b) { return (a === 'Sem ramo') - (b === 'Sem ramo') || a.localeCompare(b, 'pt-BR'); });
      ramos.forEach(function (ramo) {
        var LR = LS2.filter(function (x) { return x.ramo === ramo; }).sort(function (a, b) { return b.n - a.n || a.a.localeCompare(b.a, 'pt-BR'); });
        h += '<tr><td colspan="3" style="background:#f4eefa;color:#5b3f7c;font-weight:800;font-size:11.5px;letter-spacing:.03em">' + esc(ramo) + ' <span style="font-weight:600;opacity:.75">· ' + LR.length + '</span></td></tr>';
        LR.forEach(function (x) {
          var r = linha(cid, x.a);
          h += '<tr><td style="padding-left:16px"><b>' + esc(x.a) + '</b> <span class="cs-mut">' + (x.n ? x.n + ' na sessão' : '') + '</span></td><td><select class="cs-sel" data-cs-map="' + cid + '|d|' + esc(x.a) + '">' + opts('d', r.d) + '</select></td><td><select class="cs-sel" data-cs-map="' + cid + '|c|' + esc(x.a) + '">' + opts('c', r.c) + '</select></td></tr>';
        });
      });
      h += '</tbody></table></div></details>';
    });
    return h;
  }

  /* ---------- Designação e equipe ---------- */
  function telaDesig() {
    var ss = sessao(), ativo = sessaoReal(), porSessao = !!(ativo && UI.desigEscopo === 'sessao'), D = porSessao ? desigNaTela() : S.desig;
    var h = '<div class="cs-note">Os critérios são tentados em ordem, do primeiro ao último, até um deles indicar alguém. Cada critério pode valer para a minuta (equipe), para a correção (assessoria) ou para as duas. Servidores com ausência no período de preparação da sessão ficam de fora.</div>';
    h += '<div class="cs-card" style="margin:10px 0;border-left:4px solid #28789d"><b>Escopo das regras: ' + (porSessao ? 'sessão de ' + esc(br(ativo.data)) : 'gerais do gabinete') + '</b><p class="cs-mut">As regras gerais servem de referência. Personalizações da sessão ficam salvas apenas no arquivo dessa sessão, sem alterar as demais.</p>' + (ativo ? '<div class="cs-row"><button class="cs-btn" data-cs="desig-escopo-geral">Regras gerais</button><button class="cs-btn pri" data-cs="desig-escopo-sessao">Personalizar esta sessão</button>' + (ativo.desigOverride ? '<button class="cs-btn" data-cs="desig-escopo-reset">Restaurar regras gerais nesta sessão</button>' : '') + '</div>' : '') + '</div>';
    h += '<div class="cs-bar"><button class="cs-tg" data-cs="equilibrar" aria-pressed="' + (D.equilibrar !== false) + '" title="Ligado: entre os que têm histórico ou especialidade, recebe quem está com menos processos na sessão. Desligado: recebe quem tem mais histórico.">Equilibrar a carga</button><button class="cs-btn" data-cs="exp-desig">Exportar regras de designação (JSON)</button><button class="cs-btn" data-cs="exp-equipe">Exportar equipe (JSON)</button><button class="cs-btn" data-cs="imp">Importar JSON</button></div>';
    D.ordem.forEach(function (cid, ix) {
      var ab = UI.abertos['crit:' + cid]; h += '<details class="cs-crit" data-cs-cid="' + cid + '"' + ((ab != null ? ab : ix < 2) ? ' open' : '') + '><summary><span class="nn">' + (ix + 1) + '</span>' + esc(CRIT_T[cid]) + '<span style="flex:1"></span>' +
        '<button class="cs-tg" data-cs-on="' + cid + ':d" aria-pressed="' + !!D.on[cid].d + '">Minuta</button><button class="cs-tg" data-cs-on="' + cid + ':c" aria-pressed="' + !!D.on[cid].c + '">Correção</button>' +
        (ix ? '<button class="cs-tg" data-cs-up="' + cid + '" title="Subir">↑</button>' : '') + '</summary><div class="in"><p class="cs-mut" style="margin:0 0 6px">' + esc(CRIT_N[cid]) + '</p>';
      var linhas = [];
      if (cid === 'julg') linhas = [['ED', 'embargos de declaração'], ['AgInt', 'agravo interno'], ['JR', 'juízo de retratação'], ['META', 'processos com META'], ['AI', 'agravo de instrumento']];
      else if (cid === 'sec') linhas = [['1ª Seção', ''], ['2ª Seção', ''], ['3ª Seção', ''], ['Sem seção', '']];
      else if (cid === 'pron') linhas = [['Voto', 'padrão dos processos de pauta']];
      else if (cid === 'tema' || cid === 'hist' || cid === 'esp') h += telaTemas(ss, D, cid);
      if (linhas.length) {
        h += '<table class="cs-mini"><thead><tr><th>' + (cid === 'tema' ? 'Assunto' : 'Hipótese') + '</th><th>Minuta</th><th>Correção</th></tr></thead><tbody>' + linhas.map(function (l) {
          var r = linha(cid, l[0]);
          return '<tr><td><b>' + esc(l[0]) + '</b> <span class="cs-mut">' + esc(l[1]) + '</span></td><td><select class="cs-sel" data-cs-map="' + cid + '|d|' + esc(l[0]) + '">' + opts('d', r.d) + '</select></td><td><select class="cs-sel" data-cs-map="' + cid + '|c|' + esc(l[0]) + '">' + opts('c', r.c) + '</select></td></tr>';
        }).join('') + '</tbody></table>';
      }
      h += '</div></details>';
    });
    h += '<div class="cs-card" style="margin-top:14px"><h2>Calendário de trabalho</h2><p class="n">Dias de trabalho, datas sem expediente e o que não conta para prazo ficam no calendário do gabinete (aba Sessões › Calendário do gabinete · expediente e prazos).</p><div class="cs-row"><button class="cs-btn pri" data-aba="sessoes">Abrir o calendário do gabinete</button></div></div>';
    return h;
  }

  /* ---------- Equipe: avisos, solicitações de ausência, ausências e cadastro (dados que a Ex Officio usa) ---------- */
  var EQ = { sol: null, av: null, lendo: false, erro: '' };
  var ARQ_SOL = 'apoio/equipe-solicitacoes.json', ARQ_AV = 'apoio/equipe-avisos.json';
  async function eqLer(rel, vazio) { try { return JSON.parse(await W.ProcsMuta.ler(rel)); } catch (e) { if (/404/.test(e.message)) return vazio; throw e; } }
  function eqCarregar() {
    if (EQ.lendo || !W.ProcsMuta) return; EQ.lendo = true;
    Promise.all([eqLer(ARQ_SOL, { schema: 'gabcmt.equipe.solicitacoes', versao: 1, registros: [] }), eqLer(ARQ_AV, { schema: 'gabcmt.equipe.avisos', versao: 1, registros: [] })])
      .then(function (r) { EQ.sol = r[0]; EQ.av = r[1]; EQ.erro = ''; }).catch(function (e) { EQ.erro = e.message; }).then(function () { EQ.lendo = false; if (UI.aba === 'equipe') render(); });
  }
  async function eqGravar(rel, mut, msg) {
    var atual = await eqLer(rel, rel === ARQ_SOL ? { schema: 'gabcmt.equipe.solicitacoes', versao: 1, registros: [] } : { schema: 'gabcmt.equipe.avisos', versao: 1, registros: [] });
    atual.registros = atual.registros || []; mut(atual); atual.atualizadoEm = new Date().toISOString();
    var f = {}; f[rel] = JSON.stringify(atual, null, 1) + '\n'; await W.ProcsMuta.gravar(f, msg);
    if (rel === ARQ_SOL) EQ.sol = atual; else EQ.av = atual;
  }
  async function eqAcao(t) {
    var k = t.dataset.cs;
    try {
      if (k === 'eq-ler') { EQ.sol = EQ.av = null; eqCarregar(); return; }
      if (k === 'eq-aviso') {
        var ti = (root.querySelector('[data-eq-av-t]') || {}).value || '', me = (root.querySelector('[data-eq-av-m]') || {}).value || '';
        if (!ti.trim()) { toast('Informe o título do aviso.'); return; }
        await eqGravar(ARQ_AV, function (o) { o.registros.unshift({ id: 'av-' + Date.now().toString(36), time: new Date().toISOString(), user: 'Responsável', title: ti.trim(), message: me.trim(), link: '', linkTxt: '', nivel: 'info', painel: true, notificacao: true, para: [], ate: '', fixo: false }); }, 'Ab Initio: aviso à equipe · ' + ti.trim());
        toast('Aviso publicado para a equipe.'); render(); return;
      }
      if (k === 'eq-aviso-del') { if (!W.confirm('Excluir este aviso? Ele sai do painel inicial e das notificações de todos.')) return; var ida = t.dataset.id;
        await eqGravar(ARQ_AV, function (o) { o.registros = o.registros.filter(function (x) { return x.id !== ida; }); }, 'Ab Initio: aviso retirado'); toast('Aviso retirado.'); render(); return; }
      if (k === 'eq-aprovar' || k === 'eq-recusar') {
        var id = t.dataset.id, obs = (root.querySelector('[data-eq-obs="' + id + '"]') || {}).value || '', ok = k === 'eq-aprovar', reg = null;
        await eqGravar(ARQ_SOL, function (o) { reg = o.registros.find(function (x) { return x.id === id; }); if (!reg || reg.estado !== 'pendente') throw new Error('A solicitação já foi decidida ou cancelada.');
          reg.estado = ok ? 'aprovada' : 'recusada'; reg.decididoEm = new Date().toISOString(); reg.decididoPor = 'Responsável'; if (obs.trim()) reg.obs = obs.trim(); }, 'Ab Initio: ausência de ' + (t.dataset.nome || '') + ' ' + (ok ? 'aprovada' : 'recusada'));
        if (ok && reg) { var mb = S.equipe.find(function (x) { return N(x.nome) === N(reg.nome) || (x.aliases || []).some(function (a) { return N(a) === N(reg.nome); }); });
          if (mb) { mb.aus = mb.aus || []; if (!mb.aus.some(function (a) { return a.de === reg.de && a.ate === reg.ate; })) mb.aus.push({ de: reg.de, ate: reg.ate }); HIST = null; salvar(); toast('Ausência aprovada e lançada para ' + mb.nome + '. Grave no procs-muta para valer na designação.'); }
          else toast('Aprovada, mas ' + reg.nome + ' não está no cadastro da equipe: lance a ausência à mão.'); }
        else toast(ok ? 'Aprovada.' : 'Solicitação recusada.');
        render(); return;
      }
    } catch (e) { toast('Não gravou: ' + e.message); }
  }
  /* Aba Equipe: painel do responsável. Topo com indicadores; à esquerda o que pede decisão (solicitações) e quem está fora;
     à direita os avisos; abaixo o cadastro, um cartão por servidor com carga na próxima sessão e perfil recolhível. */
  var URL_EQ = 'https://trf3-muta.vercel.app/equipe/';
  function telaEquipe() {
    if (!EQ.sol && !EQ.lendo && !EQ.erro) eqCarregar();
    var hj = hoje(), em30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    var sol = ((EQ.sol || {}).registros || []).filter(function (x) { return x.estado !== 'cancelada'; }).sort(function (a, b) { return (a.estado === 'pendente' ? 0 : 1) - (b.estado === 'pendente' ? 0 : 1) || String(b.criadoEm).localeCompare(String(a.criadoEm)); });
    var pend = sol.filter(function (x) { return x.estado === 'pendente'; });
    var aus = []; S.equipe.forEach(function (mb) { (mb.aus || []).forEach(function (a, i) { aus.push({ mb: mb, a: a, i: i }); }); }); aus.sort(function (x, y) { return x.a.de.localeCompare(y.a.de); });
    var foraHoje = aus.filter(function (x) { return x.a.de <= hj && x.a.ate >= hj; }), prox = aus.filter(function (x) { return x.a.ate >= hj && x.a.de <= em30; });
    var pub = S.sessoes.filter(function (s) { return s.publicada && s.data >= hj; }).length;
    var ps = ordenadas().filter(function (s) { return s.data >= hj && (s.itens || []).length; }).sort(function (a, b) { return a.data.localeCompare(b.data); })[0];
    var kpi = function (n, t, s, c) { return '<div class="eqm-k' + (c ? ' ' + c : '') + '"><b>' + n + '</b><span>' + t + '</span><small>' + s + '</small></div>'; };
    var h = '<div class="eqm">' +
      '<div class="eqm-hd"><div><p>Pedidos de ausência e o cadastro usado na designação das pautas. Avisos e notificações à equipe ficam na <b>Ex Officio</b>.</p></div>' +
      '<div class="eqm-ac">' + (EQ.erro ? '<span class="eqm-err" title="' + esc(EQ.erro) + '">Erro ao ler do procs-muta</span>' : EQ.lendo ? '<span class="eqm-mut">Lendo…</span>' : '') +
      '<button class="cs-btn" data-cs="eq-ler">↻ Ler de novo</button><a class="cs-btn pri" href="' + URL_EQ + '" target="_blank" rel="noopener">Abrir a Ex Officio ↗</a></div></div>' +
      '<div class="eqm-ks">' + kpi(S.equipe.length, 'servidores', S.equipe.filter(function (m) { return faz(m, 'd'); }).length + ' minutam · ' + S.equipe.filter(function (m) { return faz(m, 'c'); }).length + ' corrigem') +
        kpi(pend.length, 'pedidos pendentes', pend.length ? 'aguardam a sua decisão' : 'nada a decidir', pend.length ? 'al' : '') +
        kpi(foraHoje.length, 'fora hoje', foraHoje.length ? foraHoje.map(function (x) { return x.mb.nome; }).join(', ') : 'equipe completa', foraHoje.length ? 'am' : '') +
        kpi(prox.length, 'ausências em 30 dias', prox.length ? 'programadas ou em curso' : 'nenhuma prevista') +
        kpi(pub, 'pautas liberadas', 'futuras, visíveis à equipe') + '</div>';
    /* coluna esquerda: solicitações e ausências */
    h += '<div class="eqm-g"><div class="eqm-col">';
    h += '<section class="eqm-c"><div class="eqm-ch"><h3>Solicitações de ausência</h3>' + (pend.length ? '<span class="eqm-tag al">' + pend.length + ' pendente' + (pend.length > 1 ? 's' : '') + '</span>' : '') + '</div>' +
      (EQ.lendo && !EQ.sol ? '<p class="eqm-mut">Lendo…</p>' : sol.length ? sol.slice(0, 12).map(function (x) { var p = x.estado === 'pendente';
        return '<div class="eqm-sol' + (p ? ' pend' : '') + '"><div class="eqm-av">' + esc(String(x.nome || '?').slice(0, 2).toUpperCase()) + '</div><div class="eqm-tx"><b>' + esc(x.nome) + '</b><span>' + esc(x.tipo) + ' · ' + esc(br(x.de)) + (x.ate !== x.de ? ' a ' + esc(br(x.ate)) : '') + '</span>' + (x.motivo ? '<small>' + esc(x.motivo) + '</small>' : '') + (x.obs ? '<small>Obs.: ' + esc(x.obs) + '</small>' : '') + '</div>' +
          (p ? '<div class="eqm-dec"><input class="cs-in" placeholder="observação (opcional)" data-eq-obs="' + esc(x.id) + '"><div><button class="cs-btn pri" data-cs="eq-aprovar" data-id="' + esc(x.id) + '" data-nome="' + esc(x.nome) + '">Aprovar</button><button class="cs-btn" data-cs="eq-recusar" data-id="' + esc(x.id) + '" data-nome="' + esc(x.nome) + '">Recusar</button></div></div>'
             : '<span class="eqm-est ' + esc(x.estado) + '">' + esc(x.estado) + '</span>') + '</div>'; }).join('') : '<p class="eqm-mut">Nenhuma solicitação. Os pedidos chegam da página inicial da Ex Officio.</p>') + '</section></div><div class="eqm-col">';
    h += '<section class="eqm-c"><div class="eqm-ch"><h3>Ausências</h3><span class="eqm-mut">quem está fora no preparo de uma sessão sai da designação automática</span></div>' +
      '<div class="eqm-form"><select class="cs-sel" data-cs-aus-m>' + S.equipe.map(function (mb) { return '<option value="' + esc(mb.id) + '">' + esc(mb.nome) + '</option>'; }).join('') + '</select><input type="date" class="cs-in" data-cs-aus-de><span class="eqm-mut">a</span><input type="date" class="cs-in" data-cs-aus-ate><button class="cs-btn pri" data-cs="aus-add">Registrar</button></div>' +
      (aus.length ? '<div class="eqm-aus">' + aus.filter(function (x) { return x.a.ate >= new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10); }).map(function (x) { var ag = x.a.de <= hj && x.a.ate >= hj, past = x.a.ate < hj;
        return '<div class="eqm-ai' + (ag ? ' ag' : past ? ' past' : '') + '"><b>' + esc(x.mb.nome) + '</b><span>' + esc(br(x.a.de)) + (x.a.ate !== x.a.de ? ' a ' + esc(br(x.a.ate)) : '') + '</span><em>' + (ag ? 'fora agora' : past ? 'encerrada' : 'programada') + '</em><button class="eqm-x" data-cs="aus-del" data-aus-m="' + esc(x.mb.id) + '" data-aus-i="' + x.i + '" title="Remover">×</button></div>'; }).join('') + '</div>'
        + (prox.length ? '' : '<p class="eqm-mut">Ninguém fora nos próximos 30 dias.</p>') : '<p class="eqm-mut">Nenhuma ausência registrada.</p>') + '</section>';
    h += '</div></div>';
    /* cadastro */
    var H = historico();
    h += '<section class="eqm-c"><div class="eqm-ch"><h3>Cadastro da equipe</h3><span class="eqm-mut"><b>Minuta</b> e <b>Correção</b>: o que cada um recebe. <b>Automático</b> desligado: só por escolha manual.' + (ps ? ' Carga: sessão de ' + esc(br(ps.data)) + '.' : '') + '</span></div>' +
      '<div class="eqm-form"><input class="cs-in" placeholder="Nome do novo servidor" data-cs-novo-nome><select class="cs-sel" data-cs-novo-papel><option value="equipe">equipe (minuta)</option><option value="assessoria">assessoria (correção)</option></select><button class="cs-btn pri" data-cs="novo-membro">Acrescentar</button></div><div class="eqm-team">';
    S.equipe.forEach(function (m) {
      var top = function (k) { var L = []; H[k].forEach(function (n, key) { var p = key.split('|'); if (p[0] === N(m.nome)) L.push([p[1], n]); }); return L.sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3).map(function (x) { return x[0] + ' (' + x[1] + ')'; }).join(', '); };
      var fora = (m.aus || []).find(function (a) { return a.de <= hj && a.ate >= hj; }), cd = ps ? carga(m.nome, 'd', ps) : 0, cc = ps ? carga(m.nome, 'c', ps) : 0;
      h += '<div class="eqm-m' + (fora ? ' fora' : '') + '" data-mem="' + esc(m.id) + '"><div class="eqm-mh"><div class="eqm-av">' + esc(String(m.nome).slice(0, 2).toUpperCase()) + '</div><div class="eqm-tx"><b>' + esc(m.nome) + '</b><span>' + esc([m.cargo].concat(m.atribuicoes || []).filter(Boolean).join(' · ') || 'sem cargo informado') + '</span></div>' +
        (fora ? '<span class="eqm-tag am">fora até ' + esc(br(fora.ate).slice(0, 5)) + '</span>' : '') + '<button class="eqm-x" data-cs="apagar-membro" title="Remover do cadastro">×</button></div>' +
        '<div class="eqm-tg"><button class="cs-tg" data-mf-tg="minuta" aria-pressed="' + faz(m, 'd') + '">Minuta</button><button class="cs-tg" data-mf-tg="correcao" aria-pressed="' + faz(m, 'c') + '">Correção</button><button class="cs-tg" data-mf-tg="auto" aria-pressed="' + (m.auto !== false) + '">Automático</button></div>' +
        (ps ? '<div class="eqm-cg"><span><b>' + cd + '</b> minuta' + (cd === 1 ? '' : 's') + '</span><span><b>' + cc + '</b> correç' + (cc === 1 ? 'ão' : 'ões') + '</span></div>' : '') +
        ((m.escopos || []).length ? '<p class="eqm-mut">Escopos: ' + esc(m.escopos.join(' | ')) + '</p>' : '') + (m.nota ? '<p class="eqm-mut">' + esc(m.nota) + '</p>' : '') +
        '<details class="eqm-pf"><summary>Perfil, preferências e histórico</summary>' + (top('d') || top('c') ? '<p class="eqm-mut">' + esc([top('d') ? 'Minutou: ' + top('d') : '', top('c') ? 'Corrigiu: ' + top('c') : ''].filter(Boolean).join(' · ')) + '</p>' : '') +
        '<label>Apelidos (separe por ;)</label><input class="cs-in" data-mf="aliases" value="' + esc((m.aliases || []).join('; ')) + '">' +
        '<label>Preferência</label><textarea data-mf="pref">' + esc((m.pref || []).join('\n')) + '</textarea>' +
        '<label>Experiência</label><textarea data-mf="exp">' + esc((m.exp || []).join('\n')) + '</textarea>' +
        '<label>Não gosta</label><textarea data-mf="nao">' + esc((m.nao || []).join('\n')) + '</textarea>' +
        '<label>Ausências (AAAA-MM-DD a AAAA-MM-DD, uma por linha)</label><textarea data-mf="aus">' + esc((m.aus || []).map(function (a) { return a.de + ' a ' + a.ate; }).join('\n')) + '</textarea></details></div>';
    });
    return h + '</div></section></div>';
  }

  /* ================= eventos ================= */
  async function importarArquivo(file) {
    try {
      var nome = file.name || '', texto, p;
      if (/\.pdf$/i.test(nome)) { toast('Lendo o PDF…'); texto = await textoDoPdf(file); p = lerPauta(texto); }
      else { texto = await file.text(); if (/^\s*\{/.test(texto)) { var j = JSON.parse(texto); p = { data: isoDeBr(j.data) || j.data || '', hora: j.hora || '', numero: '', itens: (j.itens || []).map(function (x) { return { item: String(x.item || ''), cnj: x.cnj, assunto: x.assunto || '', classe: x.classe || '', relator: x.relator || '', partes: x.partes || '' }; }) }; } else p = lerPauta(texto); }
      var gab = N(S.gab || ''), meus = p.itens.filter(function (x) { return !gab || !x.relator || N(x.relator).indexOf(gab) >= 0; });
      if (!meus.length) { var em = 'Não encontrei processos do ' + (S.gab || 'gabinete') + ' nesse arquivo.'; toast(em); return { ok: false, erro: em }; }
      var alvo = UI.importarPara ? S.sessoes.find(function (x) { return x.id === UI.importarPara; }) : null; UI.importarPara = '';
      if (alvo && p.data && alvo.data !== p.data && !W.confirm('A pauta é da sessão de ' + br(p.data) + ', e não de ' + br(alvo.data) + '. Importar na sessão de ' + br(p.data) + '?')) return { ok: false, cancelado: true, erro: 'Importação cancelada.' };
      var ss = S.sessoes.find(function (x) { return x.data && x.data === p.data; });
      if (ss && ss.itens.length && !W.confirm('Já existe a sessão de ' + br(p.data) + '. Atualizar a lista de itens? As designações dos processos que continuam na pauta são mantidas.')) return { ok: false, cancelado: true, erro: 'Importação cancelada.' };
      var antigos = new Map(((ss && ss.previa) || []).concat((ss && ss.itens) || []).map(function (i) { return [dig(i.cnj), i]; }));
      var itens = meus.map(function (x) { var o = antigos.get(dig(x.cnj)) || {}; return Object.assign({ servidor: '', corretor: '', obs: '', tipoManual: '' }, o, x); });
      var prevL = ((ss && ss.previa) || []).map(function (i) { return dig(i.cnj); }), pautL = itens.map(function (i) { return dig(i.cnj); });
      var conf = prevL.length ? { em: hoje(), ok: pautL.filter(function (c) { return prevL.indexOf(c) >= 0; }).length, fora: ((ss && ss.previa) || []).filter(function (i) { return pautL.indexOf(dig(i.cnj)) < 0; }).map(function (i) { return i.cnj; }), novos: itens.filter(function (i) { return prevL.indexOf(dig(i.cnj)) < 0; }).map(function (i) { return i.cnj; }) } : null;
      if (ss) { ss.itens = itens; ss.arquivo = nome; ss.numero = p.numero || ss.numero; }
      else { ss = novaSessao(p.data || hoje()); ss.hora = p.hora; ss.numero = p.numero; ss.arquivo = nome; ss.itens = itens; S.sessoes.push(ss); }
      if (p.hora && !ss.hora) ss.hora = p.hora;
      ss.conferencia = conf; UI.pnMin = false; UI.pnAba = 'regras'; UI.pnSel = {};
      marcosDoPainel(ss); marcosParaPainel(ss);
      S.atual = ss.id; UI.versao = 'pos'; UI.f = ''; UI.q = ''; UI.fSec = ''; UI.fRamo = ''; HIST = null; salvar(); UI.aba = 'planilha'; render();
      var fora = itens.filter(function (it) { return !acervo().by.get(dig(it.cnj)); }).length;
      toast(itens.length + ' processos importados' + (fora ? ' · ' + fora + ' fora do acervo' : '') + '.');
      return { ok: true, id: ss.id, data: ss.data, n: itens.length, fora: fora };
    } catch (e) { toast('Falha ao importar: ' + e.message); return { ok: false, erro: 'Falha ao importar: ' + e.message }; }
  }
  async function importarJson(file) {
    try {
      var j = JSON.parse(await file.text());
      if (j.schema === 'gabcmt.regras.etiquetas' && Array.isArray(j.registros)) { S.regras = j.registros; toast('Regras de etiquetas importadas.'); }
      else if (j.schema === 'gabcmt.regras.designacao' && j.criterios) { S.desig = j.criterios; toast('Regras de designação importadas.'); }
      else if (j.schema === 'gabcmt.equipe' && Array.isArray(j.registros)) { S.equipe = j.registros; toast('Equipe importada.'); }
      else if (j.etqRegras && Array.isArray(j.etqRegras.regras)) { S.regras = j.etqRegras.regras; toast('Regras do CMT-Triagem importadas.'); }
      else if (Array.isArray(j.team)) {
        S.equipe = j.team.map(function (m) { return { id: m.id || uid(), nome: m.nome, papel: m.papel || 'equipe', aliases: m.aliases || [], pref: (m.esp && m.esp.pref) || [], exp: (m.esp && m.esp.exp) || [], nao: (m.esp && m.esp.nao) || [], aus: (m.aus || []).filter(function (a) { return a && a.de && a.ate; }), nota: m.prefTxt || '' }; });
        if (j.regras && Array.isArray(j.regras.ordem)) { S.desig = Object.assign(desigPadrao(), j.regras); }
        toast('Equipe e regras do CMT-Triagem importadas.');
      } else { toast('Formato de JSON não reconhecido.'); return; }
      HIST = null; salvar(); render();
    } catch (e) { toast('JSON inválido: ' + e.message); }
  }
  /* incluir, excluir e expandir linhas da planilha da sessão */
  function acaoLinha(t) {
    var ss = sessao(), sr = sessaoReal(); if (!ss || !sr) return; var k = t.dataset.cs, PRE = !!ss.__previa;
    if (k === 'cp-exp-all') { UI.expTodos = !UI.expTodos; if (!UI.expTodos) UI.exp = {}; render(); return; }
    if (k === 'cp-add') {
      var inp = root.querySelector('[data-cs-add-cnj]'), d = dig(inp && inp.value);
      if (d.length !== 20) { toast('Informe o número CNJ completo (20 dígitos).'); if (inp) inp.focus(); return; }
      if (ss.itens.some(function (i) { return dig(i.cnj) === d; })) { toast('O processo já está nesta ' + (PRE ? 'pré-pauta' : 'pauta') + '.'); return; }
      var r = acervo().by.get(d) || null, n = ss.itens.reduce(function (m, i) { return Math.max(m, +i.item || 0); }, 0);
      var o = { cnj: fmtCnj(d), item: PRE ? String(n + 1) : '', assunto: r ? campo(r, ['Assunto', 'Assunto_Principal', 'assunto_judicial']) : '', classe: r ? campo(r, ['Classe', 'classe_judicial']) : '', partes: '', relator: S.gab,
        servidor: r ? (r.SERVIDOR || '') : '', corretor: r ? (r.CORRETOR || '') : '', porD: '', porC: '', tipoManual: '', resultado: '', dataMinuta: '', dataCorrecao: '', dataLiberacao: '', obs: '', manual: true };
      ss.itens.push(o); if (PRE && sr.exclPre) delete sr.exclPre[d];
      UI.exp = UI.exp || {}; UI.exp[d] = true; HIST = null; salvar(); render();
      toast('Processo ' + o.cnj + ' incluído' + (r ? '' : ' (não está no acervo)') + '.'); return;
    }
    var tr = t.closest('[data-cnj]'); if (!tr) return; var dc = dig(tr.dataset.cnj), it = ss.itens.find(function (i) { return dig(i.cnj) === dc; }); if (!it) return;
    if (k === 'cp-exp') { UI.exp = UI.exp || {}; if (UI.expTodos) { UI.expTodos = false; ss.itens.forEach(function (i) { UI.exp[dig(i.cnj)] = true; }); } UI.exp[dc] = !UI.exp[dc]; render(); return; }
    if (k === 'cp-del') {
      if (!W.confirm('Excluir o processo ' + it.cnj + (it.item ? ' (item ' + it.item + ')' : '') + ' da ' + (PRE ? 'pré-pauta' : 'pauta') + '?' + (PRE && !it.manual ? '\nEle continua selecionado no acervo, mas deixa de entrar nesta pré-pauta.' : '') + ' Designações e anotações do processo nesta lista se perdem.')) return;
      ss.itens.splice(ss.itens.indexOf(it), 1); if (PRE && !it.manual) { sr.exclPre = sr.exclPre || {}; sr.exclPre[dc] = 1; }
      if (UI.exp) delete UI.exp[dc]; HIST = null; salvar(); render(); toast('Processo ' + it.cnj + ' excluído.'); return;
    }
    if (k === 'cp-undo') { if (it.dataLiberacao) it.dataLiberacao = ''; else if (it.dataCorrecao) it.dataCorrecao = ''; else it.dataMinuta = ''; salvar(); render(); return; }
    if (k === 'cx-comp') { var pf = perfilCaso(it, infoItem(it)), js = JSON.stringify(pf, null, 1);
      try { (W.parent.navigator || navigator).clipboard.writeText(js); } catch (er) {}
      var Lc = null; try { Lc = (W.top || W).location; } catch (er) { Lc = null; }
      if (Lc && /^https?:$/.test(Lc.protocol)) { var sr0 = sessaoReal(); (W.top || W).open(Lc.origin + '/compendio/#' + (sr0 ? 'consulta=' + sr0.data + '/' + encodeURIComponent(it.item || it.cnj) + '&' : '') + 'caso=' + encodeURIComponent(JSON.stringify(pf)), 'cmt-compendio'); toast('Modus Operandi aberto com o perfil do caso (também copiado).'); }
      else toast('Perfil do caso copiado. O Modus Operandi abre pelo site publicado (trf3-muta.vercel.app).');
      return; }
    if (k === 'cx-tab') { UI.cxTab = UI.cxTab || {}; UI.cxTab[dc] = UI.cxTab[dc] === t.dataset.v ? '' : t.dataset.v; render(); return; }
    if (k === 'cx-add') { var co = cxObj(it), lk = t.dataset.k; co[lk] = co[lk] || [];
      co[lk].push(lk === 'alertas' ? (t.dataset.v || '') : lk === 'recursos' ? { parte: '', tipo: '', id: '', contra: '' } : { desc: '', id: '', data: '' }); salvar(); render();
      if (lk === 'alertas' && !t.dataset.v) { var ins = root.querySelectorAll('.pc-host[data-cnj="' + it.cnj + '"] [data-cs-cx^="alertas."], tr.cp-xrow[data-cnj="' + it.cnj + '"] [data-cs-cx^="alertas."]'); if (ins.length) ins[ins.length - 1].focus(); } return; }
    if (k === 'cx-del') { var cd = cxObj(it)[t.dataset.k] || []; cd.splice(+t.dataset.i, 1); salvar(); render(); return; }
    if (k === 'cp-et') { var d0 = hoje(), vv = t.dataset.v;
      if (vv === 'A fazer') { it.dataMinuta = ''; it.dataCorrecao = ''; it.dataLiberacao = ''; }
      else if (vv === 'Minutado') { it.dataMinuta = it.dataMinuta || d0; it.dataCorrecao = ''; it.dataLiberacao = ''; }
      else if (vv === 'Corrigido') { it.dataMinuta = it.dataMinuta || d0; it.dataCorrecao = it.dataCorrecao || d0; it.dataLiberacao = ''; }
      else { it.dataMinuta = it.dataMinuta || d0; it.dataCorrecao = it.dataCorrecao || d0; it.dataLiberacao = it.dataLiberacao || d0; }
      salvar(); render(); return; }
  }
  function clique(e) {
    var fc = e.target.closest('[data-cs-ficha]'); if (fc) { e.preventDefault(); try { var P = W.parent && W.parent.CMTProntuario; if (P && P.abrir) P.abrir(fc.dataset.csFicha, [].slice.call(Dc.querySelectorAll('[data-cs-ficha]')).map(function (x) { return x.dataset.csFicha; })); } catch (er) {} return; }
    var t = e.target.closest('[data-aba],[data-cs],[data-cs-f],[data-cs-on],[data-cs-up],[data-cs-dia],[data-ses],[data-mf-tg],[data-xp-dia]'); if (!t) return;
    if (t.dataset.xpDia) { var xd = t.dataset.xpDia, xc = calendario(); if ((xc.excluded || []).indexOf(xd) >= 0) { xpTira(xd); return; }
      var xf = FR(), xr = xf ? xf.motivo(xd, W.CMTExpediente()) : '', xs = xf ? xf.sugestoes(+xd.slice(0, 4)).filter(function (o) { return o.date === xd; })[0] : null;
      xpPoe([xd], xs ? xs.type : 'Outro', xs ? xs.label : (xr || ''), xs ? xs.semPrazo : !!xr); toast('Sem expediente em ' + br(xd) + '.'); return; }
    if (/^xp-/.test(t.dataset.cs || '')) { var xa = t.dataset.cs, XF = FR();
      if (xa === 'xp-prev' || xa === 'xp-next') { var xy = +XP.mes.slice(0, 4), xm = +XP.mes.slice(5, 7) - 1 + (xa === 'xp-next' ? XP.meses : -XP.meses); xy += Math.floor(xm / 12); xm = ((xm % 12) + 12) % 12; XP.mes = xy + '-' + ('0' + (xm + 1)).slice(-2); render(); return; }
      if (xa === 'xp-hoje') { XP.mes = hoje().slice(0, 7); render(); return; }
      if (xa === 'xp-sug') { XP.sug = !XP.sug; XP.sel = null; render(); return; }
      if (xa === 'xp-sug-aplicar' && XF) { var xl = XF.sugestoes(+XP.ano).filter(function (o) { return XP.sel && XP.sel[o.date]; }); xl.forEach(function (o) { xpPoe([o.date], o.type, o.label, o.semPrazo); }); XP.sug = false; XP.sel = null; render(); toast(xl.length + ' data(s) adicionada(s) ao calendário.'); return; }
      if (xa === 'xp-add') { var de = root.querySelector('[data-xp-de]').value, ate = root.querySelector('[data-xp-ate]').value || de; if (!de) { toast('Informe a data.'); return; } if (ate < de) { toast('A data final é anterior à inicial.'); return; }
        var xds = []; for (var xq = de, g = 0; xq <= ate && g < 400; xq = xpAdd(xq, 1), g++) xds.push(xq);
        xpPoe(xds, root.querySelector('[data-xp-ntipo]').value, root.querySelector('[data-xp-nome-novo]').value.trim(), root.querySelector('[data-xp-sp-novo]').checked); toast(xds.length + ' data(s) sem expediente.'); return; }
      if (xa === 'xp-del') { xpTira(t.dataset.d); return; }
      return; }
    if (t.dataset.mfTg) { var mt = S.equipe.find(function (x) { return x.id === t.closest('[data-mem]').dataset.mem; }); if (!mt) return; var kk = t.dataset.mfTg;
      if (kk === 'auto') mt.auto = mt.auto === false; else { mt.minuta = faz(mt, 'd'); mt.correcao = faz(mt, 'c'); mt[kk] = !mt[kk]; mt.papel = mt.correcao && !mt.minuta ? 'assessoria' : 'equipe'; }
      HIST = null; salvar(); render(); return; }
    if (t.dataset.cs === 'cor-auto') { var sx0 = S.sessoes.find(function (x) { return x.id === t.dataset.csSesCor; }); if (sx0) { sx0.cor = ''; salvar(); CAL.sig = ''; render(); } return; }
    if (t.dataset.aba) { UI.aba = t.dataset.aba; render(); return; }
    if (t.dataset.ses) { var sx = S.sessoes.find(function (x) { return x.id === t.dataset.ses; }); if (!sx) return; var acao = t.dataset.acao;
      if (acao === 'publicar') { publicar(sx, 'pauta'); return; }
      if (acao === 'publicar-marcos') { publicar(sx, 'marcos'); return; }
      if (acao === 'importar') { UI.importarPara = sx.id; var fp = Dc.getElementById('cs-pdf'); fp.value = ''; fp.click(); return; }
      if (acao === 'apagar') { if (!W.confirm('Apagar a sessão de ' + br(sx.data) + (sx.itens.length ? ' e a planilha com ' + sx.itens.length + ' processos' : '') + '? A exclusão vai para o procs-muta na próxima gravação.')) return; S.sessoes = S.sessoes.filter(function (x) { return x !== sx; }); (S.apagadas = S.apagadas || []).push(sx.data); if (S.atual === sx.id) S.atual = ''; salvar(); render(); return; }
      S.atual = sx.id; UI.versao = acao === 'pre' && preAberta(sx) ? 'pre' : 'pos'; if (UI.versao === 'pre') sincronizarPrevia(sx); UI.f = ''; UI.q = ''; UI.fSec = ''; UI.fRamo = ''; UI.aba = 'planilha'; salvar(); render(); return; }
    if (t.dataset.csF != null) { UI.f = UI.f === t.dataset.csF ? '' : t.dataset.csF; render(); return; }
    if (/^eq-/.test(t.dataset.cs || '')) { eqAcao(t); return; }
    if (t.dataset.cs === 'sx-pub') { var sp = sessaoReal(); if (sp) publicar(sp, 'pauta'); return; }
    if (t.dataset.cs === 'sx-pub-marcos') { var sp2 = sessaoReal(); if (sp2) publicar(sp2, 'marcos'); return; }
    if (t.dataset.cs === 'cp-vis') { UI.vistaPl = t.dataset.v; try { localStorage.setItem('cs_vista_pl', UI.vistaPl); } catch (er) {} render(); return; }
    if (/^cp-(exp|del|et|add|exp-all|undo)$|^cx-(add|del|tab|comp)$/.test(t.dataset.cs || '')) { acaoLinha(t); return; }
    if (t.dataset.csOn) { e.preventDefault(); var p = t.dataset.csOn.split(':'), D = desigNaTela(); D.on[p[0]][p[1]] = !D.on[p[0]][p[1]]; salvar(); render(); return; }
    if (t.dataset.csDia != null) { var cal0 = calendario(), wd = (cal0.weekdays || []).slice(), d0 = +t.dataset.csDia, ix = wd.indexOf(d0); if (ix >= 0) wd.splice(ix, 1); else wd.push(d0); gravarCalendario({ weekdays: wd.sort(), excluded: (cal0.excluded || []).slice() }); render(); return; }
    if (t.dataset.csUp) { e.preventDefault(); var o = desigNaTela().ordem, i = o.indexOf(t.dataset.csUp); if (i > 0) { o.splice(i - 1, 0, o.splice(i, 1)[0]); salvar(); render(); } return; }
    var a = t.dataset.cs, ss = sessao(), card = t.closest('[data-regra]'), mem = t.closest('[data-mem]');
    if (a === 'desig-escopo-geral') { UI.desigEscopo = 'geral'; render(); return; }
    if (a === 'desig-escopo-sessao') { var sd = sessaoReal(); if (!sd) return; if (!sd.desigOverride) sd.desigOverride = clone(S.desig); UI.desigEscopo = 'sessao'; salvar(); render(); return; }
    if (a === 'desig-escopo-reset') { var sr = sessaoReal(); if (!sr || !W.confirm('Restaurar nesta sessão as regras gerais?')) return; sr.desigOverride = null; UI.desigEscopo = 'geral'; salvar(); render(); return; }
    if (a === 'fechar') return fechar();
    if (a === 'pn-min') { UI.pnMin = !UI.pnMin; render(); return; }
    if (a === 'pn-abrir') { UI.pnMin = false; render(); var pnx = root.querySelector('.pn'); if (pnx) pnx.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    if (a === 'pn-aba') { UI.pnAba = t.dataset.pn; UI.pnMin = false; render(); return; }
    if (a === 'cf-x') { if (ss) { var sr = sessaoReal(); if (sr) sr.conferencia = null; salvar(); render(); } return; }
    if (a === 'pn-ir-regras') { UI.aba = 'regras'; render(); return; }
    if (a === 'pn-ir-desig') { UI.aba = 'desig'; render(); return; }
    if (a === 'pn-fixar') { if (!ss) return; var rws = ss.itens.map(function (it) { return { it: it, inf: infoItem(it) }; }), n0 = 0;
      propostas(rws).forEach(function (p) { var on = (UI.pnSel || {})[p.it.cnj] != null ? UI.pnSel[p.it.cnj] : !!p.dif.length; if (!on) return; p.it.tipoManual = p.ap; if (p.meta) p.it.meta = p.meta; if (p.mpf) p.it.mpf = p.mpf; n0++; });
      UI.pnSel = {}; salvar(); if (n0) UI.pnAba = 'desig'; render(); toast(n0 ? n0 + ' processo(s) com as marcações das regras fixadas. Agora, a designação.' : 'Nada marcado para fixar.'); return; }
    if (a === 'pdf') { var f = Dc.getElementById('cs-pdf'); f.value = ''; f.click(); return; }
    if (a === 'imp') { var g = Dc.getElementById('cs-imp'); g.value = ''; g.click(); return; }
    if (a === 'designar' && ss) { abrirDlg(ss); return; }
    if (a === 'gravar') { gravar(); return; }
    if (a === 'nova-sessao') { var nd = root.querySelector('[data-cs-nova-data]').value; if (!nd) { toast('Informe a data do julgamento.'); return; } if (S.sessoes.some(function (x) { return x.data === nd; })) { toast('Já existe a sessão de ' + br(nd) + '.'); return; } var ns = novaSessao(nd); S.sessoes.push(ns); marcosParaPainel(ns); salvar(); render(); toast('Sessão de ' + br(nd) + ' cadastrada.'); return; }
    if (a === 'xlsx') return exportarXlsx();
    if (a === 'sx-ver') { var srv = sessaoReal(); if (!srv) return; UI.versao = t.dataset.v === 'pre' && preAberta(srv) ? 'pre' : 'pos'; if (UI.versao === 'pre') sincronizarPrevia(srv); UI.f = ''; salvar(); render(); return; }
    if (a === 'sx-geral') { UI.aba = 'sessoes'; render(); return; }
    if (a === 'pdf-sessao') { var sp = sessaoReal(); UI.importarPara = sp ? sp.id : ''; var fp2 = Dc.getElementById('cs-pdf'); fp2.value = ''; fp2.click(); return; }
    if (a === 'copiar' && ss) { var txt = ss.itens.slice().sort(function (x, y) { return (+x.item || 0) - (+y.item || 0); }).map(function (i) { return i.cnj; }).join('\n');
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast(ss.itens.length + ' processos copiados.'); }).catch(function () { W.prompt('Copie a lista:', txt.replace(/\n/g, ' ')); }); return; }
    if (a === 'exp-sessao' && ss) return baixar('sessao-' + ss.data + '.json', JSON.stringify(docSessao(ss), null, 1));
    if (a === 'exp-regras') return baixar('etiquetas.json', JSON.stringify(docRegras(), null, 1));
    if (a === 'exp-desig') return baixar('designacao.json', JSON.stringify(docDesig(), null, 1));
    if (a === 'exp-equipe') return baixar('equipe.json', JSON.stringify(docEquipe(), null, 1));
    if (a === 'limpar-desig' && ss) { if (!W.confirm('Limpar todas as designações de minuta e correção desta sessão?')) return; ss.itens.forEach(function (i) { i.servidor = ''; i.corretor = ''; i.porD = ''; i.porC = ''; }); salvar(); render(); return; }
    if (a === 'apagar-sessao' && ss) { if (!W.confirm('Apagar a sessão de ' + br(ss.data) + '? A exclusão vai para o procs-muta na próxima gravação.')) return; S.sessoes = S.sessoes.filter(function (x) { return x !== ss; }); (S.apagadas = S.apagadas || []).push(ss.data); S.atual = ''; UI.aba = 'sessoes'; salvar(); render(); return; }
    if (a === 'nova-regra') { var ef = root.querySelector('[data-cs-novo-ef]').value, r = regra(ef, []); S.regras.unshift(r); UI.regraAberta = r.id; salvar(); render(); return; }
    if (a === 'salvar-cal') {
      var dias = [], erro = '', E = expediente(), nomes = {};
      var dt = function (s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : isoDeBr(s); };
      root.querySelector('[data-cs-cal]').value.split('\n').forEach(function (l) {
        l = l.trim(); if (!l) return; var m = /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})(?:\s*(?:a|-|até)\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}))?\s*(.*)$/.exec(l);
        if (!m || !dt(m[1])) { erro = l; return; }
        var d = new Date(dt(m[1]) + 'T12:00:00Z'), fim = new Date((dt(m[2] || '') || dt(m[1])) + 'T12:00:00Z'), nm = (m[3] || '').replace(/^[·\-–:\s]+/, '').trim();
        for (var k = 0; d <= fim && k < 400; k++) { var iso = d.toISOString().slice(0, 10); dias.push(iso); if (nm) nomes[iso] = nm; else if (E.nomes[iso]) nomes[iso] = E.nomes[iso]; d.setUTCDate(d.getUTCDate() + 1); }
      });
      if (erro) { toast('Data não reconhecida: ' + erro); return; }
      E.nomes = nomes; root.querySelectorAll('[data-cs-rec]').forEach(function (x) { E.recesso[+x.dataset.csRec] = x.value; }); salvar(); CAL.sig = '';
      gravarCalendario({ weekdays: (calendario().weekdays || [1, 2, 3, 4, 5]).slice(), excluded: Array.from(new Set(dias)).sort() }); render(); toast('Calendário aplicado.'); return;
    }
    if (a === 'aus-add') { var mb = S.equipe.find(function (x) { return x.id === root.querySelector('[data-cs-aus-m]').value; }), de = root.querySelector('[data-cs-aus-de]').value, ate = root.querySelector('[data-cs-aus-ate]').value || de;
      if (!mb || !de) { toast('Escolha o servidor e a data de início.'); return; } if (ate < de) { toast('A data final é anterior à inicial.'); return; }
      (mb.aus = mb.aus || []).push({ de: de, ate: ate }); HIST = null; salvar(); render(); toast('Ausência de ' + mb.nome + ' registrada.'); return; }
    if (a === 'aus-del') { var mb2 = S.equipe.find(function (x) { return x.id === t.dataset.ausM; }); if (mb2 && mb2.aus) { mb2.aus.splice(+t.dataset.ausI, 1); HIST = null; salvar(); render(); } return; }
    if (a === 'tema-todos') { e.preventDefault(); UI.temaTodos = !UI.temaTodos; render(); return; }
    if (a === 'equilibrar') { var D = desigNaTela(); D.equilibrar = D.equilibrar === false; salvar(); render(); return; }
    if (a === 'regras-padrao') { if (!W.confirm('Substituir todas as regras de etiquetas pelas regras-padrão?')) return; S.regras = regrasPadrao(); salvar(); render(); return; }
    if (card) {
      var rg = S.regras.find(function (x) { return x.id === card.dataset.regra; }); if (!rg) return;
      if (a === 'on-regra') { rg.on = !rg.on; salvar(); render(); return; }
      if (a === 'abrir-regra') { UI.regraAberta = UI.regraAberta === rg.id ? '' : rg.id; render(); return; }
      if (a === 'apagar-regra') { if (!W.confirm('Apagar esta regra?')) return; S.regras = S.regras.filter(function (x) { return x !== rg; }); salvar(); render(); return; }
      if (a === 'salvar-regra') {
        var q = function (k) { var el = card.querySelector('[data-rf="' + k + '"]'); return el ? el.value : ''; };
        rg.ef = q('ef') || rg.ef; rg.v = EF[rg.ef].v ? q('v').trim() : ''; rg.nome = q('nome').trim(); rg.nota = q('nota').trim();
        rg.termos = q('termos').split('\n').map(termoDeTexto).filter(Boolean);
        rg.exceto = q('exceto').split('\n').map(function (l) { l = l.trim(); if (!l) return null; var x = termoDeTexto(l); if (x.m === 'inicio' && !/^[=*$\/]/.test(l)) x.m = 'contem'; return x; }).filter(Boolean);
        rg.classes = q('classes').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        UI.regraAberta = ''; RX.clear(); salvar(); render(); toast('Regra aplicada.'); return;
      }
    }
    if (a === 'novo-membro') { var nm = root.querySelector('[data-cs-novo-nome]').value.trim(); if (!nm) return; var pp = root.querySelector('[data-cs-novo-papel]').value; S.equipe.push({ id: 'm-' + uid(), nome: nm, papel: pp, minuta: pp === 'equipe', correcao: pp === 'assessoria', auto: true, aliases: [], pref: [], exp: [], nao: [], aus: [], nota: '' }); salvar(); render(); return; }
    if (mem && a === 'apagar-membro') { var mm = S.equipe.find(function (x) { return x.id === mem.dataset.mem; }); if (mm && W.confirm('Remover ' + mm.nome + ' da equipe?')) { S.equipe = S.equipe.filter(function (x) { return x !== mm; }); salvar(); render(); } return; }
  }
  function mudou(e) {
    var t = e.target, ss = sessao(), tr = t.closest('[data-cnj]');
    if (t.dataset && (t.dataset.xpNome || t.dataset.xpTipo || t.dataset.xpSp || t.dataset.xpRec != null || t.dataset.xpSel || t.hasAttribute('data-xp-ano') || t.hasAttribute('data-xp-meses') || t.hasAttribute('data-xp-q') || t.hasAttribute('data-xp-ftipo') || t.hasAttribute('data-xp-passadas'))) {
      var XE = expediente();
      if (t.dataset.xpNome) { if (t.value.trim()) XE.nomes[t.dataset.xpNome] = t.value.trim(); else delete XE.nomes[t.dataset.xpNome]; salvar(); CAL.sig = ''; return; }
      if (t.dataset.xpTipo) { XE.tipos[t.dataset.xpTipo] = t.value; salvar(); render(); return; }
      if (t.dataset.xpSp) { var xk = XE.semPrazo.indexOf(t.dataset.xpSp); if (t.checked && xk < 0) XE.semPrazo.push(t.dataset.xpSp); if (!t.checked && xk >= 0) XE.semPrazo.splice(xk, 1); XE.semPrazo.sort(); salvar(); render(); return; }
      if (t.dataset.xpRec != null) { XE.recesso[+t.dataset.xpRec] = t.value; salvar(); CAL.sig = ''; render(); return; }
      if (t.dataset.xpSel) { XP.sel = XP.sel || {}; if (t.checked) XP.sel[t.dataset.xpSel] = 1; else delete XP.sel[t.dataset.xpSel]; render(); return; }
      if (t.hasAttribute('data-xp-ano')) { XP.ano = t.value; XP.sel = null; render(); return; }
      if (t.hasAttribute('data-xp-meses')) { XP.meses = +t.value; render(); return; }
      if (t.hasAttribute('data-xp-q')) { XP.q = t.value; render(); return; }
      if (t.hasAttribute('data-xp-ftipo')) { XP.tipo = t.value; render(); return; }
      if (t.hasAttribute('data-xp-passadas')) { XP.passadas = t.checked; render(); return; }
    }
    if (t.id === 'cs-pdf' && t.files[0]) return importarArquivo(t.files[0]);
    if (t.id === 'cs-imp' && t.files[0]) return importarJson(t.files[0]);
    if (t.dataset.csFiltro) { if (t.dataset.csFiltro === 'secao') UI.fSec = t.value; else UI.fRamo = t.value; render(); return; }
    if (t.dataset.csSel === 'sessao') { UI.desigEscopo = 'geral'; S.atual = t.value; if (UI.versao === 'pre') { var sxv = sessaoReal(); if (sxv) sincronizarPrevia(sxv); } UI.f = ''; UI.fSec = ''; UI.fRamo = ''; salvar(); render(); return; }
    if (t.dataset.csFase) { var sf = t.dataset.csSes ? S.sessoes.find(function (x) { return x.id === t.dataset.csSes; }) : ss; if (!sf) return; sf.fases = sf.fases || {}; sf.fases[t.dataset.csFase] = t.value; salvar(); marcosParaPainel(sf); return; }
    if ('csPnAll' in t.dataset) { var ssa = sessao(); if (ssa) propostas(ssa.itens.map(function (it) { return { it: it, inf: infoItem(it) }; })).forEach(function (p) { if (p.dif.length) (UI.pnSel || (UI.pnSel = {}))[p.it.cnj] = t.checked; }); render(); return; }
    if (t.dataset.csPn) { (UI.pnSel || (UI.pnSel = {}))[t.dataset.csPn] = t.checked; return; }
    if (t.dataset.csCor) { var sc = S.sessoes.find(function (x) { return x.id === t.dataset.csCor; }); if (sc) { sc.cor = t.value; salvar(); CAL.sig = ''; render(); } return; }
    if (t.dataset.csHora) { var sh = S.sessoes.find(function (x) { return x.id === t.dataset.csHora; }); if (sh) { sh.hora = t.value; salvar(); } return; }
    if (tr && ss) {
      var it = ss.itens.find(function (i) { return i.cnj === tr.dataset.cnj; }); if (!it) return;
      if (t.dataset.csWho) { if (t.dataset.csWho === 'd') { it.servidor = t.value; it.porD = 'manual'; } else { it.corretor = t.value; it.porC = 'manual'; } HIST = null; salvar(); render(); return; }
      if ('csTipo' in t.dataset) { it.tipoManual = t.value; salvar(); render(); return; }
      if (t.dataset.csCx) { cxSet(it, t.dataset.csCx, t.type === 'checkbox' ? t.checked : t.type === 'radio' ? (t.checked ? t.value : '') : t.value); salvar(); if ('csRe' in t.dataset) render(); return; }
      if ('csObs' in t.dataset) { it.obs = t.value; salvar(); return; }
      if (t.dataset.csDt) { it[t.dataset.csDt] = t.value; salvar(); return; }
      if ('csRes' in t.dataset) { it.resultado = t.value; salvar(); render(); return; }
      if (t.dataset.csCp) { it[t.dataset.csCp] = t.value; salvar(); render(); return; }
      if (t.dataset.csCpTxt) { it[t.dataset.csCpTxt] = t.value; salvar(); return; }
      if ('csEtapa' in t.dataset) { var d0 = hoje(); if (t.value === 'Corrigido') { it.dataMinuta = it.dataMinuta || d0; it.dataCorrecao = it.dataCorrecao || d0; it.dataLiberacao = ''; } else if (t.value === 'Liberado') { it.dataMinuta = it.dataMinuta || d0; it.dataCorrecao = it.dataCorrecao || d0; it.dataLiberacao = it.dataLiberacao || d0; } else if (t.value === '__limpa') { it.dataCorrecao = ''; it.dataLiberacao = ''; } salvar(); render(); return; }
    }
    if (t.dataset.csMap) { var p = t.dataset.csMap.split('|'), key = p[0] + ':' + N(p[2]), D = desigNaTela(); var r = D.rows[key] || (D.rows[key] = { d: '', c: '', cap: p[2] }); r[p[1]] = t.value; salvar(); render(); return; }
    var mem = t.closest('[data-mem]');
    if (mem && t.dataset.mf) {
      var m = S.equipe.find(function (x) { return x.id === mem.dataset.mem; }); if (!m) return; var k = t.dataset.mf;
      if (k === 'papel') m.papel = t.value;
      else if (k === 'aliases') m.aliases = t.value.split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      else if (k === 'aus') m.aus = t.value.split('\n').map(function (l) { var x = /(\d{4}-\d{2}-\d{2})\s*(?:a|-|até)\s*(\d{4}-\d{2}-\d{2})/.exec(l); return x ? { de: x[1], ate: x[2] } : null; }).filter(Boolean);
      else m[k] = t.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      HIST = null; salvar(); if (k === 'papel' || k === 'aliases') render(); return;
    }
  }
  var tQ = 0;
  function digitou(e) {
    var t = e.target;
    if ('csQ' in t.dataset) { clearTimeout(tQ); tQ = setTimeout(function () { UI.q = t.value; render(); var el = root.querySelector('[data-cs-q]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 250); }
    if ('csTemaq' in t.dataset) { clearTimeout(tQ); tQ = setTimeout(function () { UI.temaQ = t.value; render(); var el = root.querySelector('[data-cs-temaq]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 250); }
    if ('csEtq' in t.dataset) { UI.etqQ = t.value; var box = Dc.getElementById('cs-etq-list'); if (box) box.innerHTML = listaEtiquetas(); }
  }

  carregarRepo();

  carregarAssuntos();
  W.CMTSessao = { abrir: abrir, fechar: fechar, lerPauta: lerPauta, classificar: classificar, numerosMeta: numerosMeta, estado: function () { return S; },
    abrirSessao: function (id, versao) { var sx = S.sessoes.find(function (x) { return x.id === id; }); if (!sx) return false; S.atual = sx.id; UI.versao = versao === 'pre' && preAberta(sx) ? 'pre' : 'pos'; if (UI.versao === 'pre') sincronizarPrevia(sx); UI.f = ''; UI.q = ''; UI.fSec = ''; UI.fRamo = ''; salvar(); abrir('planilha'); return true; },
    versao: function () { return UI.versao === 'pre' ? 'pre' : 'pos'; },
    previa: function (id) { var sx = S.sessoes.find(function (x) { return x.id === id; }); return sx && preAberta(sx) ? linhasSelecao(sx).length || (sx.previa || []).length : 0; },
    importar: function (file, id) { UI.importarPara = id || ''; return importarArquivo(file); },
    aba: function () { return root && !root.hidden ? UI.aba : ''; },
    novaSessao: function (data) { if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) return { erro: 'Informe a data do julgamento.' }; if (S.sessoes.some(function (x) { return x.data === data; })) return { erro: 'Já existe a sessão de ' + br(data) + '.' }; var ns = novaSessao(data); S.sessoes.push(ns); marcosParaPainel(ns); salvar(); if (root && !root.hidden) render(); return { id: ns.id }; },
    fase: function (id, k, v) { var sf = S.sessoes.find(function (x) { return x.id === id; }); if (!sf) return false; sf.fases = sf.fases || {}; sf.fases[k] = v || ''; salvar(); marcosParaPainel(sf); if (root && !root.hidden) render(); return true; },
    hora: function (id, v) { var sf = S.sessoes.find(function (x) { return x.id === id; }); if (!sf) return false; sf.hora = v || ''; salvar(); if (root && !root.hidden) render(); return true; },
    pronta: function (id, quando) { var sf = S.sessoes.find(function (x) { return x.id === id; }); if (!sf) return false; sf.pronta = quando || ''; salvar(); if (root && !root.hidden) render(); return true; },
    linhas: function (id, versao) { var ss = S.sessoes.find(function (x) { return x.id === id; }); if (!ss) return [];
      var lista = versao === 'pre' && preAberta(ss) ? sincronizarPrevia(ss) : ss.itens;
      return lista.slice().sort(function (a, b) { return (+a.item || 0) - (+b.item || 0); }).map(function (it) { var inf = infoItem(it), mk = marcas(it, inf), r = inf.r || {};
        return { item: it.item, cnj: it.cnj, classe: it.classe || inf.classe || '', assunto: inf.assunto, secao: inf.secao, ramo: inf.ramo || '', julg: julgKey(it, inf), recurso: inf.recurso || '',
          metas: mk.filter(function (m) { return m[0] === 'meta'; }).map(function (m) { return m[1]; }), marcacoes: mk.map(function (m) { return m[1]; }),
          servidor: it.servidor || '', corretor: it.corretor || '', dataMinuta: it.dataMinuta || '', dataCorrecao: it.dataCorrecao || '', dataLiberacao: it.dataLiberacao || '',
          resultado: it.resultado || '', obs: it.obs || '', noAcervo: !!inf.r, dist: r['data_distribuição'] || r.data_distribuicao || '', tarefa: r.tarefa_atual || '', prioridade: r.prioridade || r.Prioridade || '',
          anteriores: outrasPautas(it.cnj, ss).map(function (x) { return br(x.data) + (x.resultado ? ' (' + x.resultado + ')' : ''); }) }; }); },
    planilha: function (id) { var sx = S.sessoes.find(function (x) { return x.id === id; }); return sx ? planilhaLinhas(sx) : []; },
    exportarXlsx: function (id) { var sx = S.sessoes.find(function (x) { return x.id === id; }); if (!sx) return false; S.atual = sx.id; exportarXlsx(); return true; },
    acervoDe: function (cnj) { try { return acervo().by.get(dig(cnj)) || null; } catch (e) { return null; } },
    catalogo: function () { return CATALOGO; }, ramoCurto: ramoCurto,
    regrasDesignacaoSessao: function (id) { var ss = S.sessoes.find(function (x) { return x.id === id || x.data === id; }); return ss ? clone(desigEfetiva(ss)) : null; },
    definirRegrasSessao: function (id, novo) { var ss = S.sessoes.find(function (x) { return x.id === id || x.data === id; }); if (!ss) return false; ss.desigOverride = novo ? clone(novo) : null; salvar(); if (root && !root.hidden) render(); return true; },
    /* esteira de Pautas (Ab Initio): leituras e ações das etapas 2 a 4 */
    conversoes: function (id) { var ss = S.sessoes.find(function (x) { return x.id === id; }); if (!ss) return null; var R = ativas();
      return ss.itens.slice().sort(function (a, b) { return (+a.item || 0) - (+b.item || 0); }).map(function (it) { var inf = infoItem(it), r = inf.r || {};
        var tags = inf.tags.map(function (t) { var d = N(t), H = R.filter(function (g) { return casaRegra(g, d) && classeOK(g, inf.classe); });
          return { e: t, ign: H.some(function (g) { return g.ef === 'ignorar'; }), regras: H.map(function (g) { return { id: g.id, nome: g.nome || '', ef: g.ef, v: g.v || '', rot: (EF[g.ef] || {}).s || g.ef }; }) }; });
        var pr = propostas([{ it: it, inf: inf }])[0] || null;
        return { item: it.item, cnj: it.cnj, assunto: inf.assunto, classe: inf.classe, recurso: inf.recurso, secao: inf.secao, tarefa: r.tarefa_atual || '', tipo: julgKey(it, inf), c: inf.c, tags: tags,
          mpf: it.mpf || '', meta: it.meta || '', tipoManual: it.tipoManual || '', proposta: pr ? { ap: pr.ap, meta: pr.meta, mpf: pr.mpf, dif: pr.dif, man: pr.man } : null }; }); },
    aplicarConversoes: function (id, cnjs) { var ss = S.sessoes.find(function (x) { return x.id === id; }); if (!ss) return 0; var quer = new Set((cnjs || []).map(dig)), n = 0;
      propostas(ss.itens.map(function (it) { return { it: it, inf: infoItem(it) }; })).forEach(function (p) { if (!p.dif.length || !quer.has(dig(p.it.cnj))) return; p.it.tipoManual = p.ap; if (p.meta) p.it.meta = p.meta; if (p.mpf) p.it.mpf = p.mpf; n++; });
      if (n) { salvar(); if (root && !root.hidden) render(); } return n; },
    designacao: function (id) { var ss = S.sessoes.find(function (x) { return x.id === id; }); if (!ss) return null; var D = desigEfetiva(ss);
      var de = (ss.fases && ss.fases.inicio) || ss.data, ate = (ss.fases && ss.fases.minutas) || ss.data;
      var linhas = ss.itens.slice().sort(function (a, b) { return (+a.item || 0) - (+b.item || 0); }).map(function (it) { var inf = infoItem(it);
        return { item: it.item, cnj: it.cnj, assunto: inf.assunto, classe: inf.classe, recurso: inf.recurso, secao: inf.secao, tipo: julgKey(it, inf), servidor: it.servidor || '', corretor: it.corretor || '', porD: it.porD || '', porC: it.porC || '',
          sugD: it.servidor ? null : escolher('d', it, ss), sugC: it.corretor ? null : escolher('c', it, ss) }; });
      var gente = function (kind) { return pool(kind).map(function (m) { return { nome: m.nome, ausente: ausente(m, ss), atual: ss.itens.filter(function (i) { return N(kind === 'd' ? i.servidor : i.corretor) === N(m.nome); }).length }; }); };
      return { criterios: D.ordem.map(function (cid) { return { id: cid, t: CRIT_T[cid] || cid, d: !!(D.on[cid] && D.on[cid].d), c: !!(D.on[cid] && D.on[cid].c) }; }), equilibrar: D.equilibrar !== false, escopo: ss.desigOverride ? 'sessao' : 'geral',
        periodo: { de: de, ate: ate }, minutantes: gente('d'), corretores: gente('c'), linhas: linhas }; },
    aplicarDesignacao: function (id, lista) { var ss = S.sessoes.find(function (x) { return x.id === id; }); if (!ss) return 0; var by = new Map(ss.itens.map(function (i) { return [dig(i.cnj), i]; })), n = 0;
      (lista || []).forEach(function (o) { var it = by.get(dig(o.cnj)); if (!it) return; var m = 0;
        if (o.d && !it.servidor) { it.servidor = o.d; it.porD = o.porD || 'esteira'; m = 1; } if (o.c && !it.corretor) { it.corretor = o.c; it.porC = o.porC || 'esteira'; m = 1; } n += m; });
      if (n) { HIST = null; salvar(); if (root && !root.hidden) render(); } return n; },
    confirmarPauta: function (id) { var ss = S.sessoes.find(function (x) { return x.id === id; }); if (!ss || !ss.itens.length) return false; ss.conferencia = Object.assign({}, ss.conferencia || {}, { confirmada: hoje() }); salvar(); return true; },
    /* publicar a pauta à equipe (Ex Officio): libera a listagem e os marcos; retirar devolve só os marcos */
    publicar: function (id, on) { var ss = S.sessoes.find(function (x) { return x.id === id; }); if (!ss || !ss.itens.length) return false; ss.pronta = on === false ? '' : hoje(); ss.publicada = on !== false; if (ss.publicada) ss.marcosPub = true; salvar(); if (root && !root.hidden) render(); return true; },
    /* publicar só os marcos da sessão (calendário e página inicial da Ex Officio); retirar os marcos retira também a listagem */
    /* equipe editada na página Pautas: quem minuta, quem corrige e quem entra na designação automática */
    equipeDefinir: function (nome, campo, valor) { var m = membro(nome); if (!m || ['minuta', 'correcao', 'auto'].indexOf(campo) < 0) return false; m[campo] = !!valor; HIST = null; salvar(); return true; },
    publicarMarcos: function (id, on) { var ss = S.sessoes.find(function (x) { return x.id === id; }); if (!ss) return false; ss.marcosPub = on !== false; if (!ss.marcosPub) { ss.publicada = false; ss.pronta = ''; } salvar(); if (root && !root.hidden) render(); return true; },
    /* seleção prévia no acervo: devolve à Triagem (tira a marca), passa à sessão indicada ou marca como pautado (destino 'pautar'); grava o operacional como o botão Gravar triagem */
    /* regras criadas pela esteira, sem sair da página Pautas */
    efeitosEtiqueta: function () { return Object.keys(EF).map(function (k) { return { k: k, t: EF[k].t, v: EF[k].v || '' }; }); },
    criarRegraEtiqueta: function (termo, ef, v) { termo = String(termo || '').trim(); if (!termo || !EF[ef] || (EF[ef].v && !String(v || '').trim())) return false;
      S.regras.push(regra(ef, [{ t: termo, m: 'igual' }], { v: String(v || '').trim(), nome: termo, origem: 'esteira' })); HIST = null; salvar(); if (root && !root.hidden) render(); return true; },
    regraAssunto: function (id, assunto, d, c) { var ss = S.sessoes.find(function (x) { return x.id === id; }); if (!assunto || (!d && !c)) return false; var D = ss && ss.desigOverride ? ss.desigOverride : S.desig;
      var key = 'tema:' + N(assunto), r = D.rows[key] || (D.rows[key] = { d: '', c: '', cap: assunto }); if (d) r.d = d; if (c) r.c = c; HIST = null; salvar(); if (root && !root.hidden) render(); return true; },
    previaDaTriagem: function (id) { var ss = S.sessoes.find(function (x) { return x.id === id; }); if (!ss) return []; return linhasSelecao(ss).map(function (r) { return dig(r.Processo || r.processo); }); },
    /* marcas de seleção prévia na Triagem apontando para sessão que já passou, sem pauta que as recebesse */
    previaVencida: function () { var c = comp(); if (!c || !c.rows) return []; var h = hoje(), g = {};
      c.rows.forEach(function (r) { if (r['Seleção Prévia'] !== 'SELECIONADO PREVIAMENTE' || r['Status de Julgamento'] === 'PAUTADO' || r['Status de Julgamento'] === 'JULGADO') return; var n = r['Sessão Destino'] || '', m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(n); if (!m) return; var d = m[3] + '-' + m[2] + '-' + m[1]; if (d >= h) return;
        var sx = S.sessoes.find(function (x) { return x.data === d; }); if (sx && sx.itens.some(function (i) { return dig(i.cnj) === dig(r.Processo || r.processo); })) return;
        (g[d] = g[d] || { data: d, nome: n, cnjs: [] }).cnjs.push(dig(r.Processo || r.processo)); });
      return Object.keys(g).sort().map(function (k) { return g[k]; }); },
    moverPrevia: function (id, cnjs, destinoId) { var todas = id === '*', ss = todas ? { id: '*', data: '', itens: [] } : S.sessoes.find(function (x) { return x.id === id; }), c = comp(); if (!ss || !c || !c.rows) return { n: 0, erro: 'Triagem não carregada.' };
      var pautar = destinoId === 'pautar', dest = destinoId && !pautar ? S.sessoes.find(function (x) { return x.id === destinoId; }) : null; if (destinoId && !pautar && !dest) return { n: 0, erro: 'Sessão de destino não encontrada.' };
      var quer = new Set((cnjs || []).map(dig)), nomes = todas ? null : nomesNoPainel(ss), n = 0;
      c.rows.forEach(function (r) { if (!quer.has(dig(r.Processo || r.processo)) || r['Seleção Prévia'] !== 'SELECIONADO PREVIAMENTE') return; if (nomes && r['Sessão Destino'] && nomes.indexOf(r['Sessão Destino']) < 0) return;
        if (pautar) { if (!r['Sessão Destino']) r['Sessão Destino'] = br(ss.data); if (c.setJudgment) c.setJudgment(r, 'PAUTADO'); else r['Status de Julgamento'] = 'PAUTADO'; }
        else if (dest) r['Sessão Destino'] = br(dest.data); else if (c.setJudgment) c.setJudgment(r, ''); else { r['Seleção Prévia'] = ''; r['Sessão Destino'] = ''; } n++; });
      if (!n) return { n: 0 }; try { c.refresh(); } catch (e) {}
      if (pautar || todas) {} else if (preAberta(ss)) sincronizarPrevia(ss); else { ss.previa = (ss.previa || []).filter(function (i) { return !quer.has(dig(i.cnj)); }); salvar(); }
      var g = W.CMTOperacional && W.CMTOperacional.gravar ? W.CMTOperacional.gravar(c.rows) : null;
      return { n: n, gravando: g }; },
    contagem: function () { var d = hoje(); return S.sessoes.filter(function (x) { return x.data >= d; }).length; }, gravar: gravar, pendentes: pendentes, recarregar: function () { return pendentes().length ? Promise.resolve(false) : carregarRepo().then(function () { return true; }); }, repoLido: function () { return !!REPO.lido; }, gravando: function () { return !!REPO.gravando; }, repo: function () { return REPO; }, regras: function () { return S.regras.filter(function (r) { return r.on; }).length; } };
})();

