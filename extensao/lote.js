/* Muta · aba Lote (Amicus Curiae · Collectio)
   Função principal: conferir a minuta registrada no lote com a minuta que está no editor do PJe
   (tarefa [Sessão] Aguardando a sessão), com a mesma comparação do botão "Comparar" do Collectio
   (parágrafos por LCS; dentro do parágrafo, palavra a palavra; opção de ignorar espaços, aspas e travessões).
     GET /api/painel?lote=1                      lotes visíveis
     GET /api/painel?lote=1&id=<lote>            o lote (itens com o cartão do prontuário)
     GET /api/painel?lote=1&id=<lote>&minuta=X   minuta do processo (X = 10 primeiros caracteres do número)
   O texto do editor vem do conteudo-pje.js (só leitura). Sem editor detectado, dá para colar o texto.
   Também mostra o perfil do processo no lote. A gestão do lote continua no Collectio (/amicus/collectio/). */
(function () {
'use strict';
var SITE = Muta.SITE, ses = window.MutaSessao, br = window.MutaProntuarioBridge;
var $ = function (id) { return document.getElementById(id); };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function dg(v) { return String(v || '').replace(/\D/g, ''); }
function brD(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(v || ''); }
var caixa = $('lote-app');
var C = { lista: null, lotes: {}, t: 0, carregando: null, erro: '' };   /* cache por 3 minutos */
var V = { chave: '', achados: [], sel: 0, minuta: {}, tok: 0, modo: 'cmp', vers: {}, vtx: {}, ref: {}, verv: {}, conf: {}, secv: '', msg: '' };
var CP = { texto: '', ps: null, fonte: '', colado: false, sec: 'auto', ws: true, sd: true, lendo: false, erro: '' };
var SECS = [['relatorio', 'Relatório'], ['voto', 'Voto'], ['ementa', 'Ementa'], ['acordao', 'Acórdão']];

function aberta() { var m = $('panel-min'), d = $('panel-lote'); return !!(m && !m.hidden && d && d.open && !d.hidden); }
function api(q) { return ses.api('/api/painel?lote=1' + (q ? '&' + q : '')); }
function base(forcar) {
  if (C.carregando) return C.carregando;
  if (!forcar && C.lista && Date.now() - C.t < 180e3) return Promise.resolve();
  C.erro = '';
  C.carregando = api('').then(function (L) {
    var lotes = L.lotes || [];
    return Promise.all(lotes.map(function (l) { return api('id=' + encodeURIComponent(l.id)).then(function (R) { return R.lote; }).catch(function () { return null; }); }))
      .then(function (R) { C.lista = lotes; C.lotes = {}; R.forEach(function (x) { if (x) C.lotes[x.id] = x; }); C.t = Date.now(); });
  }).catch(function (e) { C.erro = e.status === 401 ? '' : e.message; if (e.status === 401) C.lista = null; })
    .then(function () { C.carregando = null; });
  return C.carregando;
}
function procurar(chave) {
  var out = [];
  Object.keys(C.lotes).forEach(function (id) {
    (C.lotes[id].itens || []).forEach(function (it) { if (dg(it.processo) === chave) out.push({ lote: C.lotes[id], it: it }); });
  });
  return out.sort(function (a, b) { return String(b.it.sessao).localeCompare(String(a.it.sessao)); });
}
/* índice das versões e minuta vigente do processo; com o editor do PJe à vista, lê e confronta sozinho */
function prepararAchado() {
  var a = V.achados[V.sel]; if (!a) return;
  Promise.all([carregarIndice(), new Promise(function (ok) { minuta(a.lote.id, a.it, ok); })]).then(function () {
    render();
    var tela = window.MutaPje && window.MutaPje.tela ? window.MutaPje.tela() : '';
    if (!CP.texto && !CP.lendo && (tela === 'editor' || tela === '')) lerEditor(); else if (CP.texto) confrontar();
  });
}
function atualizar(forcar) {
  if (!caixa || !aberta()) return;
  var s = ses.estado();
  if (s.estado === 'verificando') { caixa.innerHTML = '<div class="empty">Verificando a sessão do Ex Officio…</div>'; return; }
  if (s.estado !== 'on') { ses.formulario(caixa, 'Entrar para ver os lotes'); return; }
  var tok = ++V.tok;
  if (!C.lista || forcar) caixa.innerHTML = '<div class="empty">Lendo os lotes do gabinete…</div>';
  base(forcar).then(function () {
    if (tok !== V.tok) return;
    var k = br.chaveAtual(), nova = (k && k !== 'avulso' ? k : '');
    if (nova !== V.chave) { CP.texto = ''; CP.fonte = ''; CP.colado = false; CP.erro = ''; CP.sec = 'auto'; }
    if (nova !== V.chave) { CP.ps = null; V.msg = ''; }
    V.chave = nova; V.achados = V.chave ? procurar(V.chave) : []; V.sel = 0;
    render(); prepararAchado();
  });
}

/* ---------- comparação (a mesma do Collectio: lotes/index.html, compara()) ---------- */
function nrm(t, ws) { t = String(t || ''); if (ws) t = t.replace(/[“”«»„]/g, '"').replace(/[‘’`´]/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' '); return t.trim(); }
function lcs(a, b, eq) {
  var n = a.length, m = b.length, D = [], i, j;
  for (i = 0; i <= n; i++) D.push(new Uint32Array(m + 1));
  for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) D[i][j] = eq(a[i], b[j]) ? D[i + 1][j + 1] + 1 : Math.max(D[i + 1][j], D[i][j + 1]);
  var r = []; i = 0; j = 0;
  while (i < n && j < m) { if (eq(a[i], b[j])) { r.push(['=', a[i], b[j]]); i++; j++; } else if (D[i + 1][j] >= D[i][j + 1]) r.push(['-', a[i++]]); else r.push(['+', b[j++]]); }
  while (i < n) r.push(['-', a[i++]]); while (j < m) r.push(['+', b[j++]]);
  return r;
}
function difPal(a, b, ws) {
  var A = a.split(/\s+/).filter(Boolean), B = b.split(/\s+/).filter(Boolean);
  if (A.length * B.length > 360000) return { h: '<del>' + esc(a) + '</del> <ins>' + esc(b) + '</ins>', igual: 0, tot: Math.max(A.length, B.length) };
  var ops = lcs(A, B, function (x, y) { return nrm(x, ws) === nrm(y, ws); }), h = '', ig = 0, cur = '', buf = [];
  function sai() { if (!buf.length) return; var t = esc(buf.join(' ')); h += (h ? ' ' : '') + (cur === '-' ? '<del>' + t + '</del>' : cur === '+' ? '<ins>' + t + '</ins>' : t); buf = []; }
  ops.forEach(function (o) { if (o[0] !== cur) { sai(); cur = o[0]; } buf.push(o[1]); if (o[0] === '=') ig++; }); sai();
  return { h: h, igual: ig, tot: Math.max(A.length, B.length) };
}
var TITULO = /^(relat[oó]rio|voto|ementa|ac[oó]rd[aã]o|vistos[,.]?|[eé] o (relat[oó]rio|voto)\.?)$/i;
function paragrafosEditor(t) { return String(t || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(function (x) { return x && !TITULO.test(x); }); }
function paragrafosLote(m, sec) {
  var A = [];
  SECS.forEach(function (s) { var v = (m.secoes || {})[s[0]]; if ((sec === '*' || sec === s[0]) && Array.isArray(v) && v.length) { A.push({ h: s[1] }); v.forEach(function (x) { if (String(x).trim()) A.push({ p: String(x).trim() }); }); } });
  return A;
}
/* "Automático": a parte da minuta do lote mais parecida com o texto do editor (palavras em comum) */
function palavras(t) { var o = {}; nrm(t, true).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).forEach(function (w) { if (w.length > 3) o[w] = 1; }); return o; }
function semelhanca(a, b) { var A = palavras(a), B = palavras(b), ka = Object.keys(A), kb = Object.keys(B), c = 0; if (!ka.length || !kb.length) return 0; ka.forEach(function (w) { if (B[w]) c++; }); return c / (ka.length + kb.length - c); }
function parteAuto(m, texto) {
  var melhor = '*', nota = -1, cands = SECS.map(function (s) { return s[0]; }).filter(function (k) { return Array.isArray((m.secoes || {})[k]) && m.secoes[k].length; }).concat(['*']);
  cands.forEach(function (k) { var tx = paragrafosLote(m, k).filter(function (x) { return x.p; }).map(function (x) { return x.p; }).join('\n'); var n = semelhanca(tx, texto) - (k === '*' ? 0.02 : 0); if (n > nota) { nota = n; melhor = k; } });
  return melhor;
}
function comparar(m) {
  var out = $('cp-out'), st = $('cp-st'); if (!out) return;
  var A0 = m && m.secoes ? m : null;
  if (!A0) { out.innerHTML = ''; return; }
  if (!CP.texto.trim()) { st.textContent = ''; out.innerHTML = '<p class="none">Leia o editor do PJe ou cole o texto da minuta para comparar.</p>'; return; }
  var sec = CP.sec === 'auto' ? parteAuto(m, CP.texto) : CP.sec;
  var A = paragrafosLote(m, sec), PA = A.filter(function (x) { return x.p; }).map(function (x) { return x.p; }), PB = paragrafosEditor(CP.texto), ws = CP.ws, sd = CP.sd;
  if (PA.length * PB.length > 250000) { st.textContent = 'Textos grandes demais para comparar de uma vez: escolha a parte (Relatório, Voto ou Ementa).'; out.innerHTML = ''; return; }
  var ops = lcs(PA, PB, function (x, y) { return nrm(x, ws) === nrm(y, ws); });
  var h = '', ig = 0, tot = 0, eqn = 0, dl = [], ad = [], npar = 0;
  function flushEq() { if (eqn) { h += '<p class="eq">' + eqn + ' parágrafo' + (eqn > 1 ? 's iguais' : ' igual') + '</p>'; eqn = 0; } }
  function flush() {
    var n = Math.max(dl.length, ad.length);
    for (var i = 0; i < n; i++) {
      if (dl[i] != null && ad[i] != null) { var d = difPal(dl[i], ad[i], ws); h += '<p>' + d.h + '</p>'; ig += d.igual; tot += d.tot; npar++; }
      else if (dl[i] != null) { h += '<p><del>' + esc(dl[i]) + '</del></p>'; tot += dl[i].split(/\s+/).length; npar++; }
      else { h += '<p><ins>' + esc(ad[i]) + '</ins></p>'; tot += ad[i].split(/\s+/).length; npar++; }
    }
    dl = []; ad = [];
  }
  ops.forEach(function (o) { if (o[0] === '=') { flush(); var w = o[1].split(/\s+/).length; ig += w; tot += w; if (sd) eqn++; else h += '<p class="so">' + esc(o[1]) + '</p>'; } else { flushEq(); (o[0] === '-' ? dl : ad).push(o[1]); } });
  flush(); flushEq();
  out.innerHTML = h || '<p class="none">Sem diferenças.</p>';
  var parte = sec === '*' ? 'minuta inteira' : SECS.filter(function (s) { return s[0] === sec; })[0][1].toLowerCase();
  st.textContent = (npar ? npar + ' parágrafo' + (npar > 1 ? 's' : '') + ' com diferença · ' + (tot ? Math.round(100 * ig / tot) : 100) + '% igual' : 'Textos iguais') + ' · comparado com: ' + parte + (CP.sec === 'auto' ? ' (automático)' : '');
}
function lerEditor() {
  if (!window.MutaPje || !window.MutaPje.lerEditor) return Promise.resolve();
  CP.lendo = true; CP.erro = ''; desenha();
  return window.MutaPje.lerEditor().then(function (r) {
    CP.texto = r.texto; CP.ps = r.paragrafos || null; CP.fonte = r.fonte + (r.outros ? ' · ' + (r.outros + 1) + ' editores na página; usado o maior visível' : ''); CP.colado = false;
    if (r.numero && dg(r.numero) !== V.chave) CP.erro = 'Atenção: o editor lido está nos autos ' + r.numero + ', não no processo do lote.';
  }).catch(function (e) { CP.erro = e.message; }).then(function () { CP.lendo = false; confrontar(); desenha(); });
}
function minutaAtual() { var a = V.achados[V.sel]; if (!a) return null; return V.minuta[a.lote.id + '/' + String(a.it.processo).slice(0, 10)] || null; }

/* ---------- 0.51 · versões, referência e confronto com o editor do PJe ----------
   Referência: a versão final, quando existe (o texto do PJe conferido depois da liberação); senão, a vigente. Qualquer versão pode
   ser vista e comparada. O confronto é por seção (relatório, voto, ementa, acórdão); o cabeçalho automático do PJe fica de fora. */
function chaveMin() { var a = V.achados[V.sel]; return a ? a.lote.id + '/' + String(a.it.processo).slice(0, 10) : ''; }
function indice() { return V.vers[chaveMin()] || null; }
function rotV(x) { return x ? x.id + (x.rotulo ? ' · ' + x.rotulo : '') + (x.final ? ' · final' : '') + (x.pje ? ' · no PJe' : '') : ''; }
function refPadrao() {
  var a = V.achados[V.sel], I = indice(); if (!a) return 'vig';
  var L = (I && I.versoes) || [], fin = (a.it.final && a.it.final.versao) || ((L.filter(function (x) { return x.final; }).slice(-1)[0] || {}).id);
  return fin || (I && I.vigente) || 'vig';
}
function refAtual() { var k = chaveMin(); return V.ref[k] || refPadrao(); }
function carregarIndice() {
  var a = V.achados[V.sel], k = chaveMin(); if (!a || V.vers[k]) return Promise.resolve(V.vers[k]);
  return api('id=' + encodeURIComponent(a.lote.id) + '&minuta=' + encodeURIComponent(String(a.it.processo).slice(0, 10)) + '&versoes=1')
    .then(function (I) { V.vers[k] = I || { versoes: [] }; return V.vers[k]; }, function () { V.vers[k] = { versoes: [], erro: 1 }; return V.vers[k]; });
}
/* texto de uma versão ('vig' ou a vigente = a minuta do lote, já lida) */
function textoVersao(v) {
  var a = V.achados[V.sel], k = chaveMin(), I = indice(); if (!a) return Promise.resolve(null);
  if (v === 'vig' || (I && v === I.vigente)) return V.minuta[k] ? Promise.resolve(V.minuta[k]) : new Promise(function (ok) { minuta(a.lote.id, a.it, ok); });
  var kv = k + '#' + v; if (V.vtx[kv]) return Promise.resolve(V.vtx[kv]);
  return api('id=' + encodeURIComponent(a.lote.id) + '&minuta=' + encodeURIComponent(String(a.it.processo).slice(0, 10)) + '&versao=' + encodeURIComponent(v))
    .then(function (m) { V.vtx[kv] = m; return m; }, function (e) { return { erro: e.message }; });
}
function secoesEd() {
  var ps = CP.ps && CP.ps.length ? CP.ps : String(CP.texto || '').split(/\n+/).map(function (t) { return { t: t }; });
  var MO = window.MutaConformidadeMotor, CX = window.MutaComparador;
  ps = ps.filter(function (p) { var t = String(p.t || '').trim(); return t && !(MO && MO.cabecalhoPje && MO.cabecalhoPje(t)); });
  var P = CX && CX.partes ? CX.partes(ps) : { achou: false }, o = {};
  if (!P.achou) return null;
  SECS.forEach(function (sx) { o[sx[0]] = (P[sx[0]] || []).map(function (p) { return String(p.t || '').trim(); }).filter(function (t) { return t && !TITULO.test(t); }); });
  return o;
}
function linhasSec(m, k) { var v = (m.secoes || {})[k]; return (Array.isArray(v) ? v : String(v || '').split(/\n+/)).map(function (x) { return String(x).trim(); }).filter(function (t) { return t && !TITULO.test(t); }); }
/* diferença de uma seção: parágrafos (LCS) e, dentro do parágrafo, palavras */
function difSec(PA, PB) {
  var ws = CP.ws, sd = CP.sd;
  if (PA.length * PB.length > 250000) return { npar: -1, h: '<p class="none">Seção grande demais para comparar de uma vez.</p>' };
  var ops = lcs(PA, PB, function (x, y) { return nrm(x, ws) === nrm(y, ws); }), h = '', ig = 0, tot = 0, eqn = 0, dl = [], ad = [], npar = 0;
  function flushEq() { if (eqn) { h += '<p class="eq">' + eqn + ' parágrafo' + (eqn > 1 ? 's iguais' : ' igual') + '</p>'; eqn = 0; } }
  function flush() {
    var n = Math.max(dl.length, ad.length);
    for (var i = 0; i < n; i++) {
      if (dl[i] != null && ad[i] != null) { var d = difPal(dl[i], ad[i], ws); h += '<p>' + d.h + '</p>'; ig += d.igual; tot += d.tot; npar++; }
      else if (dl[i] != null) { h += '<p><del>' + esc(dl[i]) + '</del></p>'; tot += dl[i].split(/\s+/).length; npar++; }
      else { h += '<p><ins>' + esc(ad[i]) + '</ins></p>'; tot += ad[i].split(/\s+/).length; npar++; }
    }
    dl = []; ad = [];
  }
  ops.forEach(function (o) { if (o[0] === '=') { flush(); var w = o[1].split(/\s+/).length; ig += w; tot += w; if (sd) eqn++; else h += '<p class="so">' + esc(o[1]) + '</p>'; } else { flushEq(); (o[0] === '-' ? dl : ad).push(o[1]); } });
  flush(); flushEq();
  return { npar: npar, pct: tot ? Math.round(100 * ig / tot) : 100, h: h || '<p class="none">Sem diferenças.</p>' };
}
/* confronto do editor com a referência; se diverge, procura entre as outras versões já conhecidas qual é a do PJe */
function confrontar() {
  var k = chaveMin(); if (!k) return;
  if (!CP.texto.trim()) { V.conf[k] = null; desenha(); return; }
  var ref = refAtual(), ed = secoesEd();
  textoVersao(ref).then(function (m) {
    if (!m || m.erro || !m.secoes) { V.conf[k] = { erro: (m && m.erro) || 'Versão sem texto.' }; desenha(); return; }
    var R = { ref: ref, secs: {}, total: 0, porSec: !!ed };
    if (ed) SECS.forEach(function (sx) { var PA = linhasSec(m, sx[0]), PB = ed[sx[0]] || []; if (!PA.length && !PB.length) return; var d = difSec(PA, PB); R.secs[sx[0]] = d; if (d.npar > 0) R.total += d.npar; });
    else { var PA = [], PB = paragrafosEditor(CP.texto); SECS.forEach(function (sx) { PA = PA.concat(linhasSec(m, sx[0])); }); var d = difSec(PA, PB); R.secs['*'] = d; R.total = Math.max(0, d.npar); }
    V.conf[k] = R; if (!R.secs[V.secv]) V.secv = (Object.keys(R.secs).filter(function (s) { return R.secs[s].npar; })[0]) || Object.keys(R.secs)[0];
    guardarConf(R); desenha();
    if (R.total && ed) qualVersao(ed, ref).then(function (v) { if (V.conf[k] === R) { R.pjeEm = v; desenha(); } });
  });
}
function qualVersao(ed, ref) {
  var I = indice(), cands = ((I && I.versoes) || []).map(function (x) { return x.id; }).filter(function (v) { return v !== ref; }).reverse().slice(0, 6);
  var igual = function (m) { return m && m.secoes && SECS.every(function (sx) { var A = linhasSec(m, sx[0]), B = ed[sx[0]] || []; return A.length === B.length && A.every(function (x, i) { return nrm(x, true) === nrm(B[i], true); }); }); };
  return cands.reduce(function (p, v) { return p.then(function (ach) { return ach || textoVersao(v).then(function (m) { return igual(m) ? v : ''; }); }); }, Promise.resolve(''));
}
/* o último confronto, para a tag "= Collectio" / "≠ Collectio" nos cartões da lista do PJe (conteudo-pje.js) */
function guardarConf(R) {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get('muta-collectio-conf').then(function (o) {
      var c = o['muta-collectio-conf'] || {}; c[V.chave] = { igual: !R.total, n: R.total, ref: R.ref, em: new Date().toISOString() };
      var ks = Object.keys(c); if (ks.length > 400) ks.sort(function (a, b) { return String(c[a].em).localeCompare(String(c[b].em)); }).slice(0, ks.length - 400).forEach(function (x) { delete c[x]; });
      return chrome.storage.local.set({ 'muta-collectio-conf': c });
    }).catch(function () {});
  } catch (e) {}
}
function veredito() {
  var k = chaveMin(), R = V.conf[k], I = indice(), L = (I && I.versoes) || [], ref = refAtual(), rx = L.filter(function (x) { return x.id === ref; })[0];
  var nomeRef = rx ? rotV(rx) : 'vigente';
  if (CP.lendo) return '<p class="lt-vd">Lendo o editor do PJe…</p>';
  if (!CP.texto.trim()) return '<p class="lt-vd muted">' + (CP.erro ? esc(CP.erro) + ' · ' : '') + 'Abra a minuta no editor do PJe e toque em Ler para conferir com o Collectio.</p>';
  if (!R) return '<p class="lt-vd">Conferindo…</p>';
  if (R.erro) return '<p class="lt-vd err">' + esc(R.erro) + '</p>';
  if (!R.total) return '<p class="lt-vd ok"><b>PJe igual ao Collectio</b> · referência ' + esc(nomeRef) + '</p>';
  var por = Object.keys(R.secs).filter(function (s) { return R.secs[s].npar > 0; }).map(function (s) { return (s === '*' ? 'minuta' : SECS.filter(function (x) { return x[0] === s; })[0][1].toLowerCase()) + ' ' + R.secs[s].npar; }).join(', ');
  var pj = R.pjeEm ? L.filter(function (x) { return x.id === R.pjeEm; })[0] : null;
  return '<p class="lt-vd dif"><b>' + R.total + ' parágrafo' + (R.total > 1 ? 's diferentes' : ' diferente') + '</b> (' + esc(por) + ') · referência ' + esc(nomeRef) + '</p>' +
    (pj ? '<p class="lt-vd dif2">O texto do PJe é a ' + esc(rotV(pj)) + (String(pj.em || '') < String((rx || {}).em || '') ? ': o Collectio tem versão mais nova, falta colar no PJe' : '') + '.</p>' : '');
}
function desenha() { if (!$('lt-corpo')) return; var h = $('lt-vd-box'); if (h) h.innerHTML = veredito() + acoesVd(); var c = $('lt-corpo'); c.innerHTML = corpo(); }
function acoesVd() {
  var a = V.achados[V.sel], R = V.conf[chaveMin()], ref = refAtual(); if (!a) return '';
  var podePje = R && !R.erro && !R.total && ref !== 'vig' && !(a.it.pje && a.it.pje.versao === ref);
  return '<div class="bar lt-ac"><button type="button" class="btn sm" data-cp="ler"' + (CP.lendo ? ' disabled' : '') + '>' + (CP.texto && !CP.colado ? 'Ler de novo' : 'Ler o editor') + '</button>' +
    (podePje ? '<button type="button" class="btn sm solid" data-lt="pje" title="Registra no Collectio que esta é a versão que está no PJe (e a data da correção, se faltava)">PJe conferido: marcar ' + esc(ref) + '</button>' : '') +
    (a.it.pje ? '<small class="muted">no PJe: ' + esc(a.it.pje.versao) + (a.it.pje.em ? ' em ' + brD(a.it.pje.em) : '') + (a.it.pje.por ? ' por ' + esc(a.it.pje.por) : '') + '</small>' : '') + '</div>';
}
function corpo() {
  var m = V.modo;
  if (m === 'min') return corpoMinuta();
  if (m === 'inf') return '';
  var R = V.conf[chaveMin()];
  if (!CP.texto.trim()) return '<details class="cp-colar"><summary>Colar o texto em vez de ler o editor</summary><textarea data-cp="txt" placeholder="Cole aqui a minuta do editor do PJe"></textarea></details>';
  if (!R || R.erro) return '';
  var ks = Object.keys(R.secs);
  return (ks.length > 1 ? '<div class="seg pmodos lt-secs" role="tablist">' + ks.map(function (s) { var d = R.secs[s]; return '<button type="button" role="tab" data-secv="' + s + '" aria-selected="' + (V.secv === s) + '">' + (s === '*' ? 'Minuta' : SECS.filter(function (x) { return x[0] === s; })[0][1]) + ' <i class="' + (d.npar ? 'dif' : 'ok') + '">' + (d.npar ? d.npar : '=') + '</i></button>'; }).join('') + '</div>' : '') +
    '<div class="bar cp-opc"><label><input type="checkbox" data-cp="ws"' + (CP.ws ? ' checked' : '') + '> ignorar espaços, aspas e travessões</label><label><input type="checkbox" data-cp="sd"' + (CP.sd ? ' checked' : '') + '> só as diferenças</label></div>' +
    '<div class="cx-lg"><span><del>riscado</del> só no Collectio</span><span><ins>verde</ins> só no PJe</span></div>' +
    '<div class="cx-out">' + ((R.secs[V.secv] || R.secs[ks[0]] || {}).h || '') + '</div>' +
    (CP.texto && !CP.colado ? '<p class="muted cp-fonte">Texto lido do PJe (' + esc(CP.fonte) + ')' + (R.porSec ? '' : ' · sem os títulos RELATÓRIO, VOTO, EMENTA e ACÓRDÃO no editor: comparada a minuta inteira') + '</p>' : '');
}
/* Minuta: as versões e o texto da escolhida, com Copiar por seção e a Conformidade da versão */
function corpoMinuta() {
  var I = indice(), L = ((I && I.versoes) || []).slice().reverse(), ref = refAtual(), vv = V.verv[chaveMin()] || ref;
  var lista = L.length ? '<div class="lt-vers">' + L.map(function (x) { return '<button type="button" class="lt-v' + (x.id === vv ? ' on' : '') + '" data-verv="' + esc(x.id) + '"><b>' + esc(x.id) + '</b>' + (x.final ? '<i class="f">final</i>' : '') + (x.pje ? '<i class="p">no PJe</i>' : '') + (I.vigente === x.id ? '<i class="vg">vigente</i>' : '') + (x.id === ref ? '<i class="r">referência</i>' : '') + '<small>' + esc(x.rotulo || '') + (x.em ? ' · ' + brD(x.em) : '') + '</small></button>'; }).join('') + '</div>'
    : '<p class="muted">Só a versão vigente (sem histórico de versões).</p>';
  var m = V.vtx[chaveMin() + '#' + vv] || ((vv === 'vig' || (I && vv === I.vigente)) ? minutaAtual() : null);
  if (!m) { textoVersao(vv).then(function () { if (V.modo === 'min') desenha(); }); return lista + '<p class="muted">Abrindo a versão…</p>'; }
  if (m.erro) return lista + '<p class="status err">' + esc(m.erro) + '</p>';
  var tem = SECS.filter(function (sx) { return linhasSec(m, sx[0]).length; });
  var conf = confVersao(m);
  return lista + '<div class="bar lt-vb">' + (vv !== ref ? '<button type="button" class="btn sm" data-lt="ref" data-v="' + esc(vv) + '">Usar como referência</button>' : '<small class="muted">é a referência do confronto</small>') + '</div>' + conf +
    tem.map(function (sx) { return '<details class="gg"><summary><h4>' + sx[1] + '</h4><button type="button" class="btn line sm" data-copsecv="' + sx[0] + '">Copiar</button></summary><pre class="lt-txt">' + esc(linhasSec(m, sx[0]).join('\n\n')) + '</pre></details>'; }).join('');
}
function confVersao(m) {
  var MO = window.MutaConformidadeMotor; if (!MO || !MO.analisar) return '';
  var ps = []; SECS.forEach(function (sx) { var L = linhasSec(m, sx[0]); if (L.length) { ps.push({ t: sx[1].toUpperCase() }); L.forEach(function (t) { ps.push({ t: t }); }); } });
  var R; try { var ctx = window.MutaConformidade && window.MutaConformidade.contexto ? window.MutaConformidade.contexto() : {}; R = MO.analisar(ps, ctx); } catch (e) { return ''; }
  var it = (R && R.itens) || [], n = { alta: 0, media: 0, baixa: 0 }; it.forEach(function (x) { n[x.sev] = (n[x.sev] || 0) + 1; });
  return '<details class="lt-conf"><summary><b>Conformidade desta versão</b> <span class="lt-cn a">' + n.alta + ' alta</span><span class="lt-cn m">' + n.media + ' média</span><span class="lt-cn b">' + n.baixa + ' baixa</span></summary>' +
    (it.length ? '<ul>' + it.slice(0, 14).map(function (x) { return '<li class="' + esc(x.sev) + '"><b>' + esc(x.grupo || '') + '</b> ' + esc(x.msg || '') + '</li>'; }).join('') + '</ul>' + (it.length > 14 ? '<small class="muted">e mais ' + (it.length - 14) + ' na aba Conformidade, depois de colar no PJe</small>' : '') : '<p class="muted">Nada a apontar.</p>') + '</details>';
}
/* ---------- desenho ---------- */
function campo(rotulo, v) { return v ? '<div class="lt-f"><span class="gl">' + esc(rotulo) + '</span><div>' + esc(v) + '</div></div>' : ''; }
function tabelaAjustes(aj) {
  if (!Array.isArray(aj) || !aj.length) return '';
  var cab = Array.isArray(aj[0]) && /se[cç][aã]o/i.test(String(aj[0][0] || '')) ? aj[0] : null, linhas = cab ? aj.slice(1) : aj;
  if (!linhas.length) return '';
  return '<div class="lt-f"><span class="gl">Ajustes da correção (' + linhas.length + ')</span><div class="gt-tab"><table>' + (cab ? '<thead><tr>' + cab.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead>' : '') +
    '<tbody>' + linhas.map(function (r) { r = Array.isArray(r) ? r : [r.secao, r.ajuste, r.tipo]; return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
}
function textoSec(v) { return Array.isArray(v) ? v.join('\n\n') : String(v || ''); }
function render() {
  if (C.erro) { caixa.innerHTML = '<div class="err-box">Não foi possível ler os lotes: ' + esc(C.erro) + '</div>'; return; }
  var lotes = C.lista || [], h = '';
  var links = '<div class="lt-lotes">' + lotes.map(function (l) { return '<a class="chip" target="_blank" rel="noopener noreferrer" href="' + SITE + '/amicus/collectio/?id=' + encodeURIComponent(l.id) + '">' + esc(l.titulo) + ' · ' + l.total + '</a>'; }).join(' ') + '</div>';
  if (!V.chave) { caixa.innerHTML = '<div class="empty"><h3>Nenhum processo aberto</h3>Abra os autos no PJe para conferir a minuta do lote.</div>' + (lotes.length ? '<p class="muted">Lotes do gabinete:</p>' + links : ''); return; }
  var num = Muta.formatarCnj(V.chave);
  if (!V.achados.length) { caixa.innerHTML = '<div class="empty"><h3>' + esc(num) + ' não está em nenhum lote</h3>Ou ainda não está visível para a equipe.</div>' + (lotes.length ? '<p class="muted">Lotes do gabinete:</p>' + links : ''); return; }
  if (V.achados.length > 1) h += '<div class="seg lt-sel">' + V.achados.map(function (a, i) { return '<button type="button" data-i="' + i + '" aria-selected="' + (i === V.sel) + '">' + esc(a.lote.titulo) + ' · ' + brD(a.it.sessao) + '</button>'; }).join('') + '</div>';
  var a = V.achados[V.sel], l = a.lote, it = a.it, eq = it.equipe || {}, dt = eq.datas || {};
  var grupo = (l.grupos || []).filter(function (g) { return g.id === it.grupo; })[0];
  var cor = grupo ? grupo.cor : ((l.grupo_outros || {}).cor || '#9aa0a8');
  var I = indice(), L = (I && I.versoes) || [], ref = refAtual();
  var selRef = L.length ? '<label class="lt-ref">Referência <select data-lt="refsel">' + L.slice().reverse().map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === ref ? ' selected' : '') + '>' + esc(rotV(x)) + (I.vigente === x.id ? ' · vigente' : '') + '</option>'; }).join('') + '</select></label>' : '<small class="muted">referência: vigente (sem histórico)</small>';
  var pes = function (rot, nome, d) { return nome ? '<span class="chip">' + rot + ': ' + esc(nome) + (d ? ' · ' + brD(d) : '') + '</span>' : ''; };
  h += '<article class="card lt" style="border-left:4px solid ' + esc(cor) + '">' +
    '<p class="kicker">' + esc(l.titulo) + ' · sessão de ' + brD(it.sessao) + ' · item ' + esc(it.item) + '</p>' +
    '<h2 class="display">' + esc(it.tipo_caso || (grupo && grupo.rotulo) || 'Processo do lote') + '</h2>' +
    '<div class="mono">' + esc(it.processo) + '</div><div class="muted">' + esc(it.recurso || '') + (it.partes ? ' · ' + esc(it.partes) : '') + '</div>' +
    '<div class="bar"><span class="chip">' + esc(eq.situacao || '—') + (dt.liberacao && /libera/i.test(eq.situacao || '') ? ' · ' + brD(dt.liberacao) : '') + '</span>' + pes('Minuta', eq.minuta, dt.minuta) + pes('Correção', eq.correcao, dt.correcao) + (dt.liberacao && !/libera/i.test(eq.situacao || '') ? '<span class="chip">Liberada · ' + brD(dt.liberacao) + '</span>' : '') + (it.final ? '<span class="chip">Final · ' + esc(it.final.versao) + '</span>' : '') + '</div>' +
    '<div class="bar lt-refbar">' + selRef + '<a class="btn line sm" target="_blank" rel="noopener noreferrer" href="' + SITE + '/amicus/collectio/?id=' + encodeURIComponent(l.id) + '#p=' + encodeURIComponent(it.sessao + '-' + it.item) + '">Abrir no Collectio</a><button type="button" class="btn line sm" data-atu>Atualizar</button></div>' +
    '<div id="lt-vd-box">' + veredito() + acoesVd() + '</div>' +
    (V.msg ? '<p class="status' + (/^Não/.test(V.msg) ? ' err' : ' ok') + '">' + esc(V.msg) + '</p>' : '') +
    '</article>' +
    '<div class="seg pmodos lt-modos" role="tablist" aria-label="Collectio">' + [['cmp', 'Editor × Collectio', 'confronto por seção'], ['min', 'Minuta', 'versões e texto'], ['inf', 'Informações', 'perfil, ajustes e transferir']].map(function (x) { return '<button type="button" role="tab" data-ltm="' + x[0] + '" aria-selected="' + (V.modo === x[0]) + '" title="' + x[2] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<section class="card lt-corpo" id="lt-corpo"></section>' +
    (V.modo === 'inf' ? infoHtml(l, it) : '');
  caixa.innerHTML = h;
  desenha();
}
function infoHtml(l, it) {
  var cols = {}; (l.colunas || []).forEach(function (c) { cols[c.id] = c.rotulo; });
  return '<section class="card lt-perfil"><h3 class="display">Perfil do processo no lote</h3>' +
    campo('Resultado', it.resultado) + campo('Modelo', it.modelo) +
    ((it.variacoes || []).length ? '<div class="lt-f"><span class="gl">Variações</span><div class="bar">' + it.variacoes.map(function (v) { return '<span class="chip">' + esc(cols[v] || v) + '</span>'; }).join('') + '</div></div>' : '') +
    campo('Observação', it.observacao) + campo('Peculiaridades (equipe)', it.peculiaridades) +
    (it.peculiaridades_relator && it.peculiaridades_relator !== it.peculiaridades ? campo('Peculiaridades (Relator)', it.peculiaridades_relator) : '') +
    campo('Orientação', it.orientacao) + campo('MPF', it.mpf) +
    ((it.pecas || []).length ? '<div class="lt-f"><span class="gl">Peças</span><ul class="lt-pecas">' + it.pecas.map(function (p) { return '<li><span>' + esc(p.peca || p.tipo || '') + '</span><button type="button" class="mono lnk" data-copia="' + esc(p.id || '') + '" title="Copiar o ID">' + esc(p.id || '') + '</button></li>'; }).join('') + '</ul></div>' : '') +
    tabelaAjustes(it.ajustes) +
    (Array.isArray(it.pendencias) && it.pendencias.length ? '<div class="lt-f"><span class="gl">Pendências</span><ul>' + it.pendencias.map(function (p) { return '<li>' + esc(typeof p === 'string' ? p : (p.texto || JSON.stringify(p))) + '</li>'; }).join('') + '</ul></div>' : (typeof it.pendencias === 'string' ? campo('Pendências', it.pendencias) : '')) +
    '</section>' + txHtml(l, it);
}
/* ---------- transferir o texto do editor do PJe para o Collectio (nova versão da minuta do processo no lote) ---------- */
var TX = { rotulo: '', vigente: true, prev: null, enviando: false, msg: '', erro: '' };
function hojeBr() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
function secoesEditor() {
  var E = window.MutaEditor ? window.MutaEditor.estado() : null, CX = window.MutaComparador;
  if (!E || !E.texto || !CX) return null;
  var P = CX.partes(E.paragrafos || []), o = {};
  if (!P.achou) return { erro: 'Não achei no editor os títulos RELATÓRIO, VOTO, EMENTA e ACÓRDÃO (um por linha). Sem eles, o Collectio não separa as partes.' };
  SECS.forEach(function (s) { o[s[0]] = (P[s[0]] || []).map(function (p) { return String(p.t || '').trim(); }).filter(Boolean); });
  return { secoes: o, fonte: E.fonte || 'editor do PJe', numero: E.numero || '' };
}
function txHtml(l, it) {
  var u = (ses.estado() || {}).usuario || '';
  if (!TX.rotulo) TX.rotulo = 'Texto do PJe · ' + (u ? u + ' · ' : '') + hojeBr();
  var p = TX.prev;
  return '<section class="card lt-tx" id="lt-tx"><p class="kicker">Transferir o texto do PJe para o Collectio</p>' +
    '<p class="muted">Nova versão no lote <b>' + esc(l.titulo) + '</b> (as anteriores ficam guardadas).</p>' +
    '<label class="lt-tx-f">Nome da versão <input type="text" data-tx="rotulo" maxlength="80" value="' + esc(TX.rotulo) + '"></label>' +
    '<label class="lt-tx-c"><input type="checkbox" data-tx="vigente"' + (TX.vigente ? ' checked' : '') + '> Tornar vigente (é a versão que o Collectio e o Relator veem); desmarcado, só guarda</label>' +
    (p && p.secoes ? '<p class="muted lt-tx-p">Lido agora' + (p.numero ? ' nos autos ' + esc(p.numero) : '') + ': ' + SECS.map(function (s) { return s[1] + ' ' + p.secoes[s[0]].length + ' §'; }).join(' · ') + '</p>' : '') +
    (p && p.erro ? '<p class="status err">' + esc(p.erro) + '</p>' : '') +
    (TX.erro ? '<p class="status err">' + esc(TX.erro) + '</p>' : '') + (TX.msg ? '<p class="status ok">' + esc(TX.msg) + '</p>' : '') +
    '<div class="bar"><button type="button" class="btn line" data-tx="ler">Ler o editor</button><button type="button" class="btn solid" data-tx="enviar"' + (TX.enviando ? ' disabled' : '') + '>' + (TX.enviando ? 'Transferindo…' : 'Transferir para o Collectio') + '</button></div></section>';
}
function txRedesenha() { var a = V.achados[V.sel], box = $('lt-tx'); if (!a || !box) return; var d = document.createElement('div'); d.innerHTML = txHtml(a.lote, a.it); box.replaceWith(d.firstChild); }
function txLer() {
  TX.erro = ''; TX.msg = '';
  return (window.MutaEditor ? window.MutaEditor.ler() : Promise.reject(new Error('Editor indisponível.'))).then(function () { TX.prev = secoesEditor(); txRedesenha(); return TX.prev; },
    function (e) { TX.prev = null; TX.erro = 'Não li o editor do PJe: ' + e.message + '. Abra a tarefa de minuta com o texto no editor.'; txRedesenha(); return null; });
}
function txEnviar() {
  var a = V.achados[V.sel]; if (!a) return;
  txLer().then(function (p) {
    if (!p || p.erro || !p.secoes) return;
    if (p.numero && String(p.numero).replace(/\D/g, '') !== V.chave) { TX.erro = 'O editor lido está nos autos ' + p.numero + ', não neste processo.'; txRedesenha(); return; }
    var n = SECS.reduce(function (t, s) { return t + p.secoes[s[0]].length; }, 0);
    if (!n) { TX.erro = 'O editor está vazio.'; txRedesenha(); return; }
    var msg = 'Gravar o texto do editor (' + SECS.map(function (s) { return s[1].toLowerCase() + ' ' + p.secoes[s[0]].length + ' §'; }).join(', ') + ') como nova versão "' + TX.rotulo + '" da minuta de ' + a.it.processo + ' no lote ' + a.lote.titulo + (TX.vigente ? ', vigente' : ', só guardada') + '?';
    var conf = Muta.confirmar ? Muta.confirmar(msg, 'Transferir') : Promise.resolve(window.confirm(msg));
    return Promise.resolve(conf).then(function (ok) {
      if (!ok) return;
      TX.enviando = true; TX.erro = ''; txRedesenha();
      return ses.api('/api/painel?lote=1', { method: 'POST', body: JSON.stringify({ acao: 'minuta-versao', id: a.lote.id, processo: a.it.processo, rotulo: TX.rotulo.trim() || 'Texto do PJe',
        origem: 'Editor do PJe (' + p.fonte + ') · transferido pela extensão HERO18810 em ' + hojeBr(), secoes: p.secoes, vigente: !!TX.vigente }) })
        .then(function (j) {
          TX.enviando = false; TX.msg = 'Gravado no Collectio: versão ' + ((j.versoes || []).slice(-1)[0] || {}).id + (j.trocouVigente ? ', vigente.' : ', guardada.'); TX.rotulo = '';
          var k = a.lote.id + '/' + String(a.it.processo).slice(0, 10); if (j.minuta) V.minuta[k] = j.minuta; else delete V.minuta[k];
          a.it.minuta = true; render();
        }, function (e) { TX.enviando = false; TX.erro = e.status === 401 ? 'Entre no Ex Officio para transferir.' : 'Não foi possível transferir: ' + e.message; txRedesenha(); });
    });
  });
}
function minuta(id, it, cb) {
  var mx = String(it.processo).slice(0, 10), chave = id + '/' + mx;
  if (V.minuta[chave]) { if (cb) cb(V.minuta[chave]); return; }
  api('id=' + encodeURIComponent(id) + '&minuta=' + encodeURIComponent(mx)).then(function (m) { V.minuta[chave] = m; if (cb) cb(m); })
    .catch(function (e) { var m = { erro: e.status === 404 ? 'Minuta não disponível para este processo no lote.' : 'Não foi possível abrir a minuta: ' + e.message }; if (e.status === 404) V.minuta[chave] = m; if (cb) cb(m); });
}
function marcarPje() {
  var a = V.achados[V.sel], ref = refAtual(); if (!a || ref === 'vig') return;
  V.msg = 'Gravando…'; render();
  ses.api('/api/painel?lote=1', { method: 'POST', body: JSON.stringify({ acao: 'minuta-pje', id: a.lote.id, processo: a.it.processo, versao: ref, marcado: true }) }).then(function (j) {
    a.it.pje = j.pje || { versao: ref }; delete V.vers[chaveMin()]; V.msg = 'Registrado no Collectio: a ' + ref + ' é a do PJe.'; carregarIndice().then(render);
  }, function (e) { V.msg = 'Não gravou: ' + (e.message || 'erro'); render(); });
}
function copiar(t, el) {
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { if (el) { var o = el.textContent; el.textContent = 'Copiado'; setTimeout(function () { el.textContent = o; }, 1200); } }).catch(function () {});
}
var tCol = 0;
caixa.addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.i != null) { V.sel = +b.dataset.i; render(); prepararAchado(); return; }
  if (b.hasAttribute('data-atu')) { V.minuta = {}; V.vers = {}; V.vtx = {}; V.conf = {}; atualizar(true); return; }
  if (b.dataset.ltm) { V.modo = b.dataset.ltm; render(); return; }
  if (b.dataset.secv) { V.secv = b.dataset.secv; desenha(); return; }
  if (b.dataset.verv) { V.verv[chaveMin()] = b.dataset.verv; desenha(); return; }
  if (b.dataset.lt === 'ref') { V.ref[chaveMin()] = b.dataset.v; V.modo = 'cmp'; render(); confrontar(); return; }
  if (b.dataset.lt === 'pje') { marcarPje(); return; }
  if (b.dataset.copsecv) { e.preventDefault(); var vv = V.verv[chaveMin()] || refAtual(), mv = V.vtx[chaveMin() + '#' + vv] || minutaAtual(); if (mv && mv.secoes) copiar(linhasSec(mv, b.dataset.copsecv).join('\n\n'), b); return; }
  if (b.dataset.cp === 'ler') { lerEditor(); return; }
  if (b.dataset.tx === 'ler') { txLer(); return; }
  if (b.dataset.tx === 'enviar') { txEnviar(); return; }
  if (b.dataset.copia) { copiar(b.dataset.copia, b); return; }
  if (b.dataset.copsec) { e.preventDefault(); var m = minutaAtual(); if (m && m.secoes) copiar(textoSec(m.secoes[b.dataset.copsec]), b); return; }
});
caixa.addEventListener('change', function (e) {
  if (e.target.dataset && e.target.dataset.tx === 'vigente') { TX.vigente = e.target.checked; return; }
  if (e.target.dataset && e.target.dataset.lt === 'refsel') { V.ref[chaveMin()] = e.target.value; V.verv[chaveMin()] = e.target.value; render(); confrontar(); return; }
  var t = e.target, k = t.dataset && t.dataset.cp; if (!k) return;
  if (k === 'ws') CP.ws = t.checked; else if (k === 'sd') CP.sd = t.checked; else return;
  confrontar();
});
caixa.addEventListener('input', function (e) {
  if (e.target.dataset && e.target.dataset.tx === 'rotulo') { TX.rotulo = e.target.value; return; }
  var t = e.target; if (!t.dataset || t.dataset.cp !== 'txt') return;
  clearTimeout(tCol); tCol = setTimeout(function () { CP.texto = t.value; CP.ps = null; CP.colado = !!t.value.trim(); CP.erro = ''; CP.fonte = ''; confrontar(); }, 600);
});
document.addEventListener('muta:prontuario', function () { if (aberta()) atualizar(false); autoAba(); });
/* 0.51: para o gestor, processo de lote abre a aba Minuta no Collectio (se ela estava no Comparar); fora de lote, volta ao Comparar */
var ultAuto = '';
function autoAba() {
  var s0 = ses.estado(); if (!s0 || !s0.gestor || !window.MutaGerador || !window.MutaGerador.modo) return;
  var k = br.chaveAtual(); if (!k || k === 'avulso' || k === ultAuto) return; ultAuto = k;
  temLote(k).then(function (tem) {
    var cur = ''; try { cur = localStorage.getItem('hero18810:minModo') || 'cmp'; } catch (e) {}
    if (tem && cur === 'cmp') window.MutaGerador.modo('lote');
    else if (!tem && cur === 'lote') window.MutaGerador.modo('cmp');
    if (tem && aberta()) atualizar(false);
  });
}
/* para a aba Comparar: as minutas registradas nos lotes para o processo (uma por lote em que ele está) */
function minutasDoProcesso(chave) {
  return base(false).then(function () {
    if (C.erro) throw new Error(C.erro);
    return Promise.all(procurar(chave).map(function (a) {
      var mx = String(a.it.processo).slice(0, 10), k = a.lote.id + '/' + mx;
      var p = V.minuta[k] ? Promise.resolve(V.minuta[k]) : api('id=' + encodeURIComponent(a.lote.id) + '&minuta=' + encodeURIComponent(mx)).then(function (m) { V.minuta[k] = m; return m; });
      return p.then(function (m) {
        var secoes = SECS.map(function (s) { var v = (m.secoes || {})[s[0]]; return { t: s[1], ps: Array.isArray(v) ? v : String(v || '').split(/\n+/) }; });
        return { id: k, rotulo: a.lote.titulo + (a.it.sessao ? ' · sessão de ' + brD(a.it.sessao) : '') + (a.it.item ? ', item ' + a.it.item : ''), secoes: secoes, atualizado: m.atualizado_em || '' };
      }, function (e) { return { id: k, rotulo: a.lote.titulo, erro: e.status === 404 ? 'Minuta não disponível no lote.' : e.message, secoes: [] }; });
    }));
  });
}
/* 0.51: o processo aberto está em algum lote? (a aba Minuta abre no Collectio para o gestor) */
function temLote(chave) { return base(false).then(function () { return !!procurar(chave).length; }, function () { return false; }); }
window.MutaLote = { temLote: temLote, transferir: function () { if (window.MutaAbas) window.MutaAbas.ir('min'); var d = $('panel-lote'); if (d && !d.open) { d.open = true; atualizar(false); } setTimeout(function () { var x = $('lt-tx'); if (x) x.scrollIntoView({ block: 'start' }); }, 500); }, abrir: function () { atualizar(false); }, sessao: function () { if (aberta()) atualizar(false); }, lerEditor: lerEditor, minutasDoProcesso: minutasDoProcesso };
})();
