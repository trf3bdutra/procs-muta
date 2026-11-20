/* Muta · Ementário (mesma base do Ementário do Compêndio)
   Fontes, publicadas no site do gabinete pelo workflow vercel-monitor.yml:
     /jurisprudencia/curados.json.gz       ementário curado (precedentes/precedentes.jsonl)
     /jurisprudencia/curados-texto.json.gz inteiros teores dos curados (precedentes/inteiros-teores)
     /jurisprudencia/indice.json.gz        série histórica do Relator, resumida (1999 em diante)
     /jurisprudencia/busca/A-AAAA.txt.gz   texto integral por espécie e ano (id, ementa, texto)
   Busca com a sintaxe do Compêndio: termos soltos = todos (E); OU entre termos; "frase exata";
   -termo exclui; radical* (aposentad*); sem diferença de acento e maiúsculas. */
(function () {
'use strict';
var SITE = Muta.SITE, J = SITE + '/jurisprudencia/';
var $ = function (id) { return document.getElementById(id); };
function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function nz(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function dig(s) { return String(s || '').replace(/\D/g, ''); }
function isoBr(s) { var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] : (s || ''); }
function fmtData(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : (d || ''); }
function titulo1(s) { return String(s || '').toLowerCase().replace(/(^|\s|\/)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\b(De|Da|Do|Das|Dos|E|Em|Ou)\b/g, function (w) { return w.toLowerCase(); }); }
function n0(n) { return Number(n || 0).toLocaleString('pt-BR'); }

var B = { ok: false, carregando: null, erro: '', idx: [], man: null, nCur: 0, nSer: 0, textosCur: null };
var V = { res: [], shown: 0, sel: null, ft: null, qp: null, tok: 0 };
var PAGE = 25;

/* ---------- Carga ---------- */
function deSerie(r) {
  var x = { id: r.id, sid: r.id, cur: false, t: r.t === 'M' ? 'M' : 'A', n: r.n || '', c: r.c || '', cl: titulo1(r.cl), o: r.o || '', d: r.d || '', p: isoBr(r.p),
    e: r.e || '', r: r.r || '', it: r.k === 'integral', ano: r.y || String(r.d || '').slice(0, 4) };
  x._q = nz([x.n, x.c, x.cl, x.o, x.e, x.r].join(' ')); return x;
}
function deCurado(r) {
  var x = { id: r.id, sid: '', cur: true, t: 'A', n: r.n || '', c: r.c || '', cl: r.cl || '', o: r.o || '', d: r.d || '', p: r.p || '',
    e: r.e || '', r: r.r || '', ass: r.as || '', temas: r.tm || '', tese: r.ts || '', tc: r.tc || r.sb || '', mat: r.mt || '', u: r.u || '', it: !!r.it, ano: String(r.d || '').slice(0, 4) };
  if (/monocr|decis/i.test(r.pr || '')) x.t = 'M';
  x._q = nz([x.n, x.c, x.cl, x.o, x.e, x.r, x.ass, x.temas, x.tese, x.mat, x.tc].join(' ')); return x;
}
function carregar(forcar) {
  if (B.carregando) return B.carregando;
  if (B.ok && !forcar) return Promise.resolve();
  status('Abrindo o Ementário do Compêndio…');
  erro('');
  var cur = Muta.baixarTexto(J + 'curados.json.gz').then(JSON.parse).catch(function (e) { B.erroCur = e.message; return null; });
  var ser = Muta.baixarTexto(J + 'indice.json.gz').then(JSON.parse);
  var man = Muta.baixarTexto(J + 'busca/indice.json').then(JSON.parse).catch(function () { return null; });
  B.carregando = Promise.all([cur, ser, man]).then(function (v) {
    var C = (v[0] && v[0].registros || []).map(deCurado), I = v[1] || [], por = {};
    B.man = v[2] && v[2].arquivos || null;
    C.forEach(function (x) { por[dig(x.n) + '|' + x.d] = x; });
    var add = [];
    I.forEach(function (r) {
      var c = por[dig(r.n) + '|' + (r.d || '')];
      if (c) { if (!c.sid) { c.sid = r.id; c.ano = r.y || String(r.d || '').slice(0, 4); if (r.k === 'integral') c.it = true; } return; }
      add.push(deSerie(r));
    });
    B.idx = C.concat(add).sort(function (a, b) { return (b.d || '').localeCompare(a.d || ''); });
    B.nCur = C.length; B.nSer = I.length; B.ok = true;
    status(resumo());
    if (B.erroCur) erro('O ementário curado não abriu (' + B.erroCur + '); a busca segue só na série histórica.');
  }).catch(function (e) {
    erro('Não foi possível abrir o Ementário do Compêndio: ' + e.message + '. Confira a conexão com a internet.');
    status('');
  }).then(function () { B.carregando = null; buscar(); });
  render();
  return B.carregando;
}
function resumo() {
  var top = B.idx.length ? B.idx[0].d : '';
  return n0(B.idx.length) + ' julgados, sem repetição (' + n0(B.nCur) + ' curados do gabinete e a série histórica do Relator)' + (top ? ' · mais recente: ' + fmtData(top) : '') + '.';
}

/* ---------- Consulta (mesma sintaxe do Compêndio) ---------- */
var STOP = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1, o: 1, a: 1, os: 1, as: 1, em: 1, no: 1, na: 1, nos: 1, nas: 1, ao: 1, aos: 1, para: 1, por: 1, com: 1, que: 1, se: 1, um: 1, uma: 1 };
function reEsc(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function termoSrc(w) {
  var pre = /\*$/.test(w); w = w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''); if (!w) return null;
  return '(?:^|[^a-z0-9])(' + reEsc(w) + (pre ? '[a-z0-9]*' : '') + ')' + (pre ? '' : '(?![a-z0-9])');
}
function fraseSrc(f) { var ws = nz(f).split(/[^a-z0-9]+/).filter(Boolean); if (!ws.length) return null; return '(?:^|[^a-z0-9])(' + ws.map(reEsc).join('[^a-z0-9]+') + ')(?![a-z0-9])'; }
function parseQ(q) {
  q = String(q || '').trim(); if (!q) return null;
  var rx = /(-?)"([^"]*)"?|(\S+)/g, m, T = [];
  while ((m = rx.exec(q))) T.push(m[2] !== undefined ? { neg: !!m[1], ph: m[2] } : { w: m[3] });
  var cls = [], nots = [], ou = false, termos = [];
  T.forEach(function (t) {
    if (t.w && /^(ou|or|\|)$/i.test(t.w)) { ou = cls.length > 0; return; }
    var neg = t.ph !== undefined ? t.neg : (t.w.length > 1 && t.w[0] === '-');
    var w = t.w !== undefined ? nz(neg ? t.w.slice(1) : t.w) : null;
    if (w !== null && !neg && !ou && STOP[w.replace(/[^a-z0-9]/g, '')]) return;
    var src = t.ph !== undefined ? fraseSrc(t.ph) : termoSrc(w); if (!src) { ou = false; return; }
    var o = { src: src, re: new RegExp(src) };
    if (neg) nots.push(o); else { if (ou) cls[cls.length - 1].push(o); else cls.push([o]); termos.push(o); }
    ou = false;
  });
  return cls.length || nots.length ? { q: q, cls: cls, nots: nots, termos: termos } : null;
}
function casa(P, t) {
  for (var i = 0; i < P.cls.length; i++) { var ok = false; for (var j = 0; j < P.cls[i].length; j++) if (P.cls[i][j].re.test(t)) { ok = true; break; } if (!ok) return false; }
  for (var k = 0; k < P.nots.length; k++) if (P.nots[k].re.test(t)) return false;
  return true;
}
function conta1(P, t) { var n = 0; P.termos.forEach(function (o) { var g = new RegExp(o.src, 'g'), m; while ((m = g.exec(t))) { n++; if (n > 500) break; } }); return n; }
/* trecho do texto original com os termos destacados (n = mesmo texto normalizado, mesmas posições) */
function trecho(orig, n, P, larg) {
  if (!P || !P.termos.length) return '';
  if (n.length !== orig.length) orig = n;
  var M = []; P.termos.forEach(function (o, k) { var g = new RegExp(o.src, 'g'), m, c = 0; while ((m = g.exec(n)) && c < 300) { var ini = m.index + m[0].length - m[1].length; M.push([ini, ini + m[1].length, k]); c++; if (g.lastIndex === m.index) g.lastIndex++; } });
  if (!M.length) return '';
  M.sort(function (a, b) { return a[0] - b[0]; });
  var L = larg || 150, W = L * 2.2, best = 0, bd = -1, bc = -1;
  for (var i = 0, j = 0; i < M.length; i++) {
    while (j < M.length && M[j][0] - M[i][0] <= W) j++;
    var ks = {}, d = 0; for (var q = i; q < j; q++) if (!ks[M[q][2]]) { ks[M[q][2]] = 1; d++; }
    if (d > bd || (d === bd && j - i > bc)) { bd = d; bc = j - i; best = i; }
  }
  var c0 = M[best][0], i0 = Math.max(0, c0 - Math.round(L * 0.5)), i1 = Math.min(orig.length, c0 + W + Math.round(L * 0.4)), h = '', p = i0;
  var sp = orig.lastIndexOf(' ', i0 + 12); if (sp > i0 - 20 && sp > 0 && sp < c0) { i0 = sp + 1; p = i0; }
  M.forEach(function (r) { if (r[0] < p || r[1] > i1) return; h += esc(orig.slice(p, r[0])) + '<mark>' + esc(orig.slice(r[0], r[1])) + '</mark>'; p = r[1]; });
  h += esc(orig.slice(p, i1));
  return (i0 > 0 ? '…' : '') + h.replace(/\u2029+/g, ' ¶ ') + (i1 < orig.length ? '…' : '');
}

/* ---------- Filtros ---------- */
function filtros() { return { tipo: $('acv-tipo').value, desde: parseInt($('acv-desde').value, 10) || 0 }; }
function passa(x, F) {
  if (F.tipo === 'cur' && !x.cur) return false;
  if ((F.tipo === 'A' || F.tipo === 'M') && x.t !== F.tipo) return false;
  if (F.desde && (parseInt(x.ano, 10) || 0) < F.desde) return false;
  return true;
}

/* ---------- Busca ---------- */
function buscar() {
  if (!B.ok) { render(); return; }
  V.tok++; V.ft = null; V.shown = 0;
  var q = $('acv-q').value.trim(), F = filtros(), d = dig(q);
  var base = B.idx.filter(function (x) { return passa(x, F); });
  if (!q) { V.qp = null; V.res = base; render(); return; }
  /* número de processo: casa pelos dígitos, com ou sem pontuação */
  if (/^[\d.\-\s]+$/.test(q) && d.length >= 7) { V.qp = null; V.res = base.filter(function (x) { return dig(x.n).indexOf(d) > -1; }); render(); return; }
  var P = parseQ(q);
  if (!P) { V.qp = null; V.res = base; render(); return; }
  if ($('acv-modo').value === 'ft') { buscaIntegral(P, base); return; }
  V.qp = P; V.res = base.filter(function (x) { return casa(P, x._q); });
  render();
}

function textosCurados() {
  if (B.textosCur) return Promise.resolve(B.textosCur);
  return Muta.baixarTexto(J + 'curados-texto.json.gz').then(JSON.parse).then(function (o) { B.textosCur = o && o.textos || {}; return B.textosCur; })
    .catch(function () { B.textosCur = {}; return B.textosCur; });
}
var FT = { cache: {}, ordem: [] };
function arquivoTxt(nome) {
  if (FT.cache[nome]) return Promise.resolve(FT.cache[nome]);
  return Muta.baixarTexto(J + 'busca/' + nome + '.txt.gz').then(function (t) {
    var n = nz(t), o = { t: t, n: n.length === t.length ? n : null };
    FT.cache[nome] = o; FT.ordem.push(nome); while (FT.ordem.length > 6) delete FT.cache[FT.ordem.shift()];
    return o;
  });
}
/* linhas do arquivo anual: id \t ementa \t texto */
function linhaDe(o, sid) {
  var t = o.t, i = t.indexOf('\n' + sid + '\t'), a;
  if (i > -1) a = i + 1; else if (t.indexOf(sid + '\t') === 0) a = 0; else return null;
  var b = t.indexOf('\n', a); return { a: a, b: b < 0 ? t.length : b };
}
function buscaIntegral(P, base) {
  if (!P.cls.length) { erro('Use ao menos um termo que não seja de exclusão.'); return; }
  erro('');
  var tok = V.tok, porSid = {}, need = {}, curSem = [];
  base.forEach(function (x) {
    if (x.sid) { porSid[x.sid] = x; need[x.sid.charAt(0) + '-' + x.ano] = 1; }
    else if (x.cur) curSem.push(x);
  });
  var nomes = Object.keys(need).filter(function (k) { return !B.man || B.man[k]; }).sort(function (a, b) { return b.slice(2).localeCompare(a.slice(2)) || a.localeCompare(b); });
  var ft = { P: P, hits: {}, lidos: 0, total: nomes.length + (curSem.length ? 1 : 0), busy: true };
  V.ft = ft; V.qp = null; V.res = []; render();
  function aceita(x, orig, n) { if (!casa(P, n)) return; ft.hits[x.id] = { n: conta1(P, n), sn: trecho(orig, n, P) }; }
  function fim() {
    if (tok !== V.tok) return;
    ft.busy = false;
    V.res = base.filter(function (x) { return ft.hits[x.id]; });
    render();
  }
  var cadeia = Promise.resolve();
  if (curSem.length) cadeia = cadeia.then(function () {
    return textosCurados().then(function (T) {
      if (tok !== V.tok) return;
      curSem.forEach(function (x) { var o = (x.e || '') + '\u2029' + (T[x.id] || ''); aceita(x, o, nz(o)); });
      ft.lidos++; parcial();
    });
  });
  function parcial() { if (tok !== V.tok) return; V.res = base.filter(function (x) { return ft.hits[x.id]; }); render(); }
  nomes.forEach(function (nome) {
    cadeia = cadeia.then(function () {
      if (tok !== V.tok) return;
      ft.atual = nome; status('Lendo o texto integral: ' + (nome[0] === 'A' ? 'acórdãos' : 'monocráticas') + ' de ' + nome.slice(2) + ' (' + (ft.lidos + 1) + ' de ' + ft.total + ')…');
      return arquivoTxt(nome).then(function (o) {
        if (tok !== V.tok) return;
        var t = o.t, n = o.n || nz(t), a = 0;
        while (a < t.length) {
          var b = t.indexOf('\n', a); if (b < 0) b = t.length;
          var tab = t.indexOf('\t', a);
          if (tab > a && tab < b) {
            var x = porSid[t.slice(a, tab)];
            if (x) { var orig = t.slice(tab + 1, b), nn = o.n ? n.slice(tab + 1, b) : nz(orig); aceita(x, orig, nn); }
          }
          a = b + 1;
        }
        ft.lidos++; parcial();
      }).catch(function (e) { ft.lidos++; ft.falhas = (ft.falhas || 0) + 1; });
    });
  });
  cadeia.then(function () { if (tok === V.tok) { status(resumo()); fim(); } });
}

/* ---------- Exibição ---------- */
function status(t) { var s = $('acv-status'); s.className = 'status'; s.textContent = t; }
function erro(msg) {
  var b = $('acv-error'); b.hidden = !msg; b.replaceChildren(); if (!msg) return;
  b.append(el('span', null, msg + ' '));
  var r = el('button', 'btn line', 'Tentar novamente'); r.type = 'button'; r.addEventListener('click', function () { carregar(true); }); b.append(r);
}
function rotuloTipo(x) { return x.cur ? 'Curado' : x.t === 'M' ? 'Monocrática' : 'Acórdão'; }
function render() {
  var list = $('acv-list'); list.replaceChildren(); V.shown = 0;
  if (!B.ok) {
    if (B.carregando) for (var i = 0; i < 4; i++) { var sk = el('div', 'row'); sk.style.opacity = '.5'; sk.style.height = '86px'; list.append(sk); }
    $('acv-more').hidden = true; detalhe(); return;
  }
  if (V.ft) {
    var ft = V.ft, info = el('p', 'status' + (ft.busy ? '' : ' ok'));
    info.textContent = (ft.busy ? 'Buscando no texto integral… ' : 'Texto integral: ') + n0(V.res.length) + ' julgado(s) encontrado(s)' + (ft.total ? ' · ' + ft.lidos + ' de ' + ft.total + ' arquivo(s) lido(s)' : '') + (ft.falhas ? ' · ' + ft.falhas + ' arquivo(s) não abriram' : '') + '.';
    list.append(info);
  } else if ($('acv-q').value.trim()) {
    list.append(el('p', 'status', n0(V.res.length) + ' julgado(s) encontrado(s).'));
  }
  if (!V.res.length) {
    if (!(V.ft && V.ft.busy)) { var em = el('div', 'empty'); em.append(el('h3', null, 'Nenhum julgado encontrado'), document.createTextNode('Tente termos mais gerais, o radical (aposentad*), o número do processo ou a busca no texto integral.')); list.append(em); }
    $('acv-more').hidden = true;
    if (V.sel && V.res.indexOf(V.sel) < 0 && !(V.ft && V.ft.busy)) V.sel = null;
    detalhe(); return;
  }
  if (!V.sel || V.res.indexOf(V.sel) < 0) V.sel = null;
  mais();
  detalhe();
}
function mais() {
  var list = $('acv-list');
  V.res.slice(V.shown, V.shown + PAGE).forEach(function (x) {
    var b = el('button', 'row' + (x.cur ? ' cur' : '')); b.type = 'button'; b.dataset.id = x.id; b.setAttribute('aria-pressed', x === V.sel);
    var meta = el('div', 'meta'); meta.append(el('span', 'mono', x.n || x.id), el('span', null, fmtData(x.d)), el('span', 'chip' + (x.cur ? ' chip-cur' : ''), rotuloTipo(x)));
    if (window.MutaProntuarioBridge && MutaProntuarioBridge.hasLink(x.id)) meta.append(el('span', 'chip chip-ok', 'Vinculado'));
    b.append(meta, el('div', 'cls', x.cl || x.c || 'Classe não informada'));
    var pv = el('div', 'prev'), h = V.ft && V.ft.hits[x.id];
    if (h) pv.innerHTML = h.sn + (h.n > 1 ? ' <small class="muted">· ' + n0(h.n) + ' ocorrências</small>' : '');
    else if (V.qp) { var tx = x.e || x.r || ''; var tr = trecho(tx, nz(tx), V.qp, 110); if (tr) pv.innerHTML = tr; else pv.textContent = tx || 'Sem texto no índice.'; }
    else pv.textContent = x.e || x.r || 'Sem texto no índice.';
    b.append(pv);
    b.addEventListener('click', function () {
      V.sel = x; list.querySelectorAll('.row').forEach(function (r) { r.setAttribute('aria-pressed', r === b); });
      detalhe(); var d = $('acv-detail'); if (d.getBoundingClientRect().top > window.innerHeight || window.innerWidth < 860) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    list.append(b);
  });
  V.shown = Math.min(V.shown + PAGE, V.res.length);
  var m = $('acv-more'); m.hidden = V.shown >= V.res.length; m.textContent = 'Carregar mais (' + n0(V.res.length - V.shown) + ' restantes)';
}
function copiar(texto, msg) {
  (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(texto) : Promise.reject()).then(function () { status(msg); })
    .catch(function () { status('Não foi possível copiar automaticamente; selecione o texto.'); });
}
function inteiroTeor(x) {
  if (x._it != null) return Promise.resolve(x._it);
  if (x.cur && !x.sid) return textosCurados().then(function (T) { x._it = T[x.id] || ''; return x._it; });
  if (!x.sid) return Promise.resolve('');
  return arquivoTxt(x.sid.charAt(0) + '-' + x.ano).then(function (o) {
    var l = linhaDe(o, x.sid); if (!l) { x._it = ''; return ''; }
    var c = o.t.slice(l.a, l.b).split('\t');
    var em = (c[1] || '').replace(/\u2029/g, '\n'), it = (c[2] || '').replace(/\u2029/g, '\n');
    if (em && !x.cur) x.e = em;
    x._it = it; return it;
  }).catch(function () { return textosCurados().then(function (T) { x._it = T[x.id] || ''; return x._it; }); });
}
function detalhe() {
  var d = $('acv-detail'); d.replaceChildren();
  var x = V.sel;
  if (!x) { var em = el('div', 'empty'); em.append(el('h3', null, 'Nenhum julgado selecionado'), document.createTextNode('Selecione um resultado para ler a ementa e o inteiro teor.')); d.append(em); return; }
  var br = window.MutaProntuarioBridge, linked = br && br.hasLink(x.id);
  d.append(el('p', 'kicker', rotuloTipo(x) + ' · julgado em ' + (fmtData(x.d) || 'data não informada') + (x.p ? ' · publicado em ' + fmtData(x.p) : '')),
    el('h2', 'display', x.cl || x.c || 'Classe não informada'), el('div', 'mono', x.n || x.id), el('div', 'muted', x.o || 'Órgão julgador não informado'));
  var bar = el('div', 'bar'); bar.style.marginTop = '10px';
  var lk = el('button', 'btn ' + (linked ? 'line' : 'solid'), linked ? 'Vinculado ao prontuário' : 'Vincular ao prontuário'); lk.type = 'button'; lk.disabled = !!linked;
  lk.addEventListener('click', function () {
    if (br && br.addLink({ id: x.id, n: x.n, cl: x.cl || x.c, d: fmtData(x.d) })) { status('Precedente vinculado ao prontuário de ' + (br.getFull().caso.numero || 'processo avulso') + '.'); detalhe(); }
  });
  var ce = el('button', 'btn line', 'Copiar ementa'); ce.type = 'button'; ce.addEventListener('click', function () { copiar(x.e || '', 'Ementa copiada.'); });
  var cn = el('button', 'btn line', 'Copiar número'); cn.type = 'button'; cn.addEventListener('click', function () { copiar(x.n || '', 'Número copiado.'); });
  var cx = el('button', 'btn line', 'Comparar com o editor'); cx.type = 'button';
  cx.addEventListener('click', function () { if (window.MutaComparar) window.MutaComparar.precedente(x.id); });
  bar.append(lk, ce, cn, cx);
  if (x.u) { var a = el('a', 'btn line', 'Fonte'); a.href = x.u; a.target = '_blank'; a.rel = 'noopener noreferrer'; bar.append(a); }
  d.append(bar);
  if (x.cur) {
    var cat = el('div', 'cat');
    [['Assunto', x.ass], ['Tipo de caso', x.tc], ['Temas', x.temas], ['Tese', x.tese]].forEach(function (p) { if (p[1]) { var r = el('p'); r.append(el('b', null, p[0] + ': '), document.createTextNode(p[1])); cat.append(r); } });
    if (cat.childNodes.length) d.append(cat);
  }
  d.append(el('p', 'tag', 'Ementa'), el('pre', null, x.e || 'Sem ementa no índice.'));
  if (x.r) d.append(el('p', 'tag', 'Resultado'), el('pre', 'res', x.r));
  var itBox = el('div');
  if (x.it || x.sid || x.cur) {
    var bi = el('button', 'btn line', 'Ler o inteiro teor'); bi.type = 'button';
    bi.addEventListener('click', function () {
      bi.disabled = true; bi.textContent = 'Abrindo o inteiro teor…';
      inteiroTeor(x).then(function (t) {
        itBox.replaceChildren(el('p', 'tag', 'Inteiro teor'));
        var pre = el('pre', 'it');
        if (t && V.ft && V.ft.P) { var h = t; pre.innerHTML = destacar(h, V.ft.P); } else if (t && V.qp) pre.innerHTML = destacar(t, V.qp); else pre.textContent = t || 'Inteiro teor indisponível na base; consulte a fonte no TRF-3.';
        itBox.append(pre);
        var m = pre.querySelector('mark'); if (m) m.scrollIntoView({ block: 'center' });
      });
    });
    itBox.append(bi);
  }
  d.append(itBox);
}
function destacar(t, P) {
  var n = nz(t); if (n.length !== t.length) return esc(t);
  var M = []; P.termos.forEach(function (o) { var g = new RegExp(o.src, 'g'), m, c = 0; while ((m = g.exec(n)) && c < 2000) { var ini = m.index + m[0].length - m[1].length; M.push([ini, ini + m[1].length]); c++; if (g.lastIndex === m.index) g.lastIndex++; } });
  M.sort(function (a, b) { return a[0] - b[0]; });
  var h = '', p = 0; M.forEach(function (r) { if (r[0] < p) return; h += esc(t.slice(p, r[0])) + '<mark>' + esc(t.slice(r[0], r[1])) + '</mark>'; p = r[1]; });
  return h + esc(t.slice(p));
}

/* ---------- Eventos ---------- */
$('acv-form').addEventListener('submit', function (e) { e.preventDefault(); V.sel = null; if (B.ok) buscar(); else carregar(); });
$('acv-clear').addEventListener('click', function () { $('acv-q').value = ''; $('acv-desde').value = ''; $('acv-tipo').value = ''; V.sel = null; erro(''); if (B.ok) { status(resumo()); buscar(); } });
$('acv-more').addEventListener('click', mais);
$('acv-tipo').addEventListener('change', function () { if (B.ok && $('acv-modo').value !== 'ft') buscar(); });
$('btn-refresh').addEventListener('click', function () { B.ok = false; FT.cache = {}; FT.ordem = []; B.textosCur = null; carregar(true); });
$('acv-compendio').href = SITE + '/amicus/compendium/#v=ement';

/* para a aba Comparar: o julgado (ementa e inteiro teor) pelo id do índice */
function julgado(id) {
  return carregar().then(function () {
    var x = null; for (var i = 0; i < B.idx.length; i++) if (B.idx[i].id === id) { x = B.idx[i]; break; }
    if (!x) return null;
    return inteiroTeor(x).then(function (it) {
      return { id: x.id, rotulo: [x.cl || x.c, x.n].filter(Boolean).join(' ') + (x.d ? ', julgado em ' + fmtData(x.d) : ''), ementa: x.e || '', inteiro: it || '' };
    });
  });
}
window.MutaEmentario = {
  julgado: julgado,
  abrir: function () { return carregar(); },
  atualizar: function () { if (B.ok) { var s = V.shown; render(); while (V.shown < s && V.shown < V.res.length) mais(); } },
  buscarNumero: function (n) { $('acv-q').value = n; $('acv-modo').value = 'idx'; V.sel = null; carregar().then(buscar); }
};
})();
