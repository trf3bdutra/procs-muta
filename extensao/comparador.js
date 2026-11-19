/* Muta · motor de comparação de textos (abas Comparar e Lote)
   Parágrafos alinhados por LCS (iguais) e, nos trechos diferentes, pareados pela semelhança, na ordem; dentro do par,
   palavra a palavra. Trechos de modelo a preencher ({{…}}, [PREENCHER …], [DATA], [ID]…) valem como vagas: o texto do
   editor que ocupa a vaga aparece como preenchimento, não como acréscimo. Parágrafo do modelo que é só vaga absorve os
   parágrafos do editor que caem no lugar dele. Funções puras: também rodam nos testes (Node). */
(function (raiz) {
'use strict';
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function nrm(t, ws) {
  t = String(t || '');
  if (ws) t = t.replace(/[“”«»„]/g, '"').replace(/[‘’`´ʼ]/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' ');
  return t.trim();
}
var VAGA = /\{\{[^}]*\}\}|\[\[[^\]]*\]\]|\[(?:PREENCHER|VALIDAR|DATA|ID|VALOR|NOME|N|F|NÚMERO|NUMERO|PARTE|ÓRGÃO|ORGAO|DOCUMENTO|FATO)[^\]]*\]/gi;
var SO_VAGA = /^(?:\s|[.,;:])*(?:(?:\{\{[^}]*\}\}|\[[^\]]*\])(?:\s|[.,;:—–-])*)+$/;
function ehVaga(p) { return SO_VAGA.test(String(p || '')); }
function lcs(a, b, eq) {
  var n = a.length, m = b.length, D = [], i, j;
  for (i = 0; i <= n; i++) D.push(new Uint32Array(m + 1));
  for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) D[i][j] = eq(a[i], b[j]) ? D[i + 1][j + 1] + 1 : Math.max(D[i + 1][j], D[i][j + 1]);
  var r = []; i = 0; j = 0;
  while (i < n && j < m) { if (eq(a[i], b[j])) { r.push(['=', a[i], b[j]]); i++; j++; } else if (D[i + 1][j] >= D[i][j + 1]) r.push(['-', a[i++]]); else r.push(['+', b[j++]]); }
  while (i < n) r.push(['-', a[i++]]); while (j < m) r.push(['+', b[j++]]);
  return r;
}
/* palavras do modelo, com cada vaga como um só item */
function tokensModelo(t) {
  var out = [], last = 0, m; VAGA.lastIndex = 0;
  t = String(t || '');
  while ((m = VAGA.exec(t))) {
    t.slice(last, m.index).split(/\s+/).forEach(function (w) { if (w) out.push({ w: w }); });
    /* pontuação colada na vaga vai com ela: "{{abertura}}." */
    var fim = VAGA.lastIndex, pt = /^[.,;:)]+/.exec(t.slice(fim));
    if (pt) { fim += pt[0].length; VAGA.lastIndex = fim; }
    out.push({ w: t.slice(m.index, fim), vaga: true }); last = fim;
  }
  t.slice(last).split(/\s+/).forEach(function (w) { if (w) out.push({ w: w }); });
  return out;
}
/* diferença palavra a palavra: a = modelo/referência, b = editor */
function difPal(a, b, ws) {
  var A = tokensModelo(a), B = String(b || '').split(/\s+/).filter(Boolean).map(function (w) { return { w: w }; });
  if (A.length * B.length > 360000) return { h: '<del>' + esc(a) + '</del> <ins>' + esc(b) + '</ins>', igual: 0, tot: Math.max(A.length, B.length) };
  var ops = lcs(A, B, function (x, y) { return !x.vaga && nrm(x.w, ws) === nrm(y.w, ws); }), h = '', ig = 0;
  /* vaga seguida (ou precedida) de palavras só do editor: preenchimento */
  for (var i = 0; i < ops.length; i++) {
    if (ops[i][0] === '-' && ops[i][1].vaga) {
      var j = i + 1; while (j < ops.length && ops[j][0] === '+') { ops[j][0] = 'v'; j++; }
      if (j === i + 1) { var k = i - 1; while (k >= 0 && ops[k][0] === '+') { ops[k][0] = 'v'; k--; } }
      ops[i][0] = j > i + 1 || (i > 0 && ops[i - 1][0] === 'v') ? 'p' : '-';
    }
  }
  var cur = '', buf = [];
  function sai() {
    if (!buf.length) return; var t = esc(buf.join(' '));
    h += (h ? ' ' : '') + (cur === '-' ? '<del>' + t + '</del>' : cur === '+' ? '<ins>' + t + '</ins>' : cur === 'v' ? '<mark class="cx-vg">' + t + '</mark>' : cur === 'p' ? '<span class="cx-ph">' + t + '</span>' : t);
    buf = [];
  }
  var tot = 0;
  ops.forEach(function (o) {
    if (o[0] !== cur) { sai(); cur = o[0]; }
    buf.push(o[1].w);
    if (o[0] === '=') ig++;
    if (o[0] !== 'p' && o[0] !== 'v') tot++;
  });
  sai();
  return { h: h, igual: ig, tot: Math.max(tot, 1) };
}
/* semelhança entre parágrafos: palavras com mais de 3 letras em comum (Jaccard), sem as vagas */
function palavras(t) {
  var o = {};
  nrm(String(t || '').replace(VAGA, ' '), true).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).forEach(function (w) { if (w.length > 3) o[w] = 1; });
  return o;
}
function semelhanca(a, b) {
  var A = typeof a === 'object' ? a : palavras(a), B = typeof b === 'object' ? b : palavras(b), ka = Object.keys(A), kb = Object.keys(B), c = 0;
  if (!ka.length || !kb.length) return 0;
  ka.forEach(function (w) { if (B[w]) c++; });
  return c / (ka.length + kb.length - c);
}
/* pareia, na ordem, os parágrafos que sobraram de cada lado (maior soma de semelhanças acima do mínimo) */
function pareia(dl, ad, min) {
  var n = dl.length, m = ad.length, S = [], P = [], i, j;
  var Wd = dl.map(palavras), Wa = ad.map(palavras);
  for (i = 0; i <= n; i++) { S.push(new Float64Array(m + 1)); P.push(new Uint8Array(m + 1)); }
  for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) {
    var s = semelhanca(Wd[i], Wa[j]), par = s >= min ? S[i + 1][j + 1] + s : -1, a = S[i + 1][j], b = S[i][j + 1];
    if (par >= a && par >= b && par >= 0) { S[i][j] = par; P[i][j] = 1; } else if (a >= b) { S[i][j] = a; P[i][j] = 2; } else { S[i][j] = b; P[i][j] = 3; }
  }
  var r = []; i = 0; j = 0;
  while (i < n && j < m) { if (P[i][j] === 1) { r.push({ i: i, j: j }); i++; j++; } else if (P[i][j] === 2) r.push({ i: i++, j: null }); else r.push({ i: null, j: j++ }); }
  while (i < n) r.push({ i: i++, j: null }); while (j < m) r.push({ i: null, j: j++ });
  return r;
}
/* Compara A (referência: [{h: título} | {p: parágrafo}]) com B (parágrafos do editor). opts: ws (ignorar espaços, aspas e
   travessões), sd (só as diferenças), min (semelhança mínima para parear; padrão 0,3).
   Devolve { html, npar, pct, faltam (parágrafos da referência ausentes), sobram (só no editor), vagas } */
function comparar(A, B, opts) {
  opts = opts || {}; var ws = opts.ws !== false, sd = !!opts.sd, min = opts.min == null ? 0.3 : opts.min;
  var PA = [], tit = {};
  A.forEach(function (x) { if (x.h) tit[PA.length] = (tit[PA.length] || []).concat(x.h); else if (x.p && String(x.p).trim()) PA.push(String(x.p).trim()); });
  var PB = (B || []).map(function (x) { return String(x).trim(); }).filter(Boolean);
  if (PA.length * PB.length > 250000) return { erro: 'Textos grandes demais para comparar de uma vez: escolha uma parte (Relatório, Voto ou Ementa).' };
  var idx = {}; PA.forEach(function (p, i) { (idx[p] = idx[p] || []).push(i); });
  var ops = lcs(PA, PB, function (x, y) { return nrm(x, ws) === nrm(y, ws); });
  var h = '', ig = 0, tot = 0, eqn = 0, dl = [], ad = [], npar = 0, faltam = [], sobram = [], vagas = 0, posA = 0;
  function titulos() { (tit[posA] || []).forEach(function (t) { h += '<p class="cx-h">' + esc(t) + '</p>'; }); }
  function flushEq() { if (eqn) { h += '<p class="eq">' + eqn + ' parágrafo' + (eqn > 1 ? 's iguais' : ' igual') + '</p>'; eqn = 0; } }
  function flush() {
    if (!dl.length && !ad.length) return;
    /* pares entre os parágrafos fixos do modelo e os do editor, na ordem; depois, cada grupo de vagas ({{…}}) recebe os
       parágrafos do editor sem par que ficam entre os vizinhos já pareados */
    var fixos = [], ondeFixo = [];
    dl.forEach(function (p, k) { if (typeof p === 'string' && !ehVaga(p)) { ondeFixo.push(k); fixos.push(p); } });
    var par = {}, usadoB = {};
    pareia(fixos, ad, min).forEach(function (pr) { if (pr.i != null && pr.j != null) { par[ondeFixo[pr.i]] = pr.j; usadoB[pr.j] = 1; } });
    var prox = 0;
    function insAte(lim) { for (; prox < lim; prox++) if (!usadoB[prox]) { h += '<p><ins>' + esc(ad[prox]) + '</ins></p>'; tot += ad[prox].split(/\s+/).length; npar++; sobram.push(ad[prox]); } }
    for (var k = 0; k < dl.length; k++) {
      if (typeof dl[k] !== 'string') { dl[k].h.forEach(function (t) { h += '<p class="cx-h">' + esc(t) + '</p>'; }); continue; }
      if (ehVaga(dl[k])) {
        var g = [dl[k]]; while (k + 1 < dl.length && typeof dl[k + 1] === 'string' && ehVaga(dl[k + 1])) g.push(dl[++k]);
        var lim = ad.length; for (var x = k + 1; x < dl.length; x++) if (par[x] != null) { lim = par[x]; break; }
        var abs = []; for (; prox < lim; prox++) if (!usadoB[prox]) abs.push(ad[prox]);
        if (abs.length) {
          vagas += g.length;
          h += '<div class="cx-slot">' + g.map(function (v) { return '<p class="cx-ph">' + esc(v) + '</p>'; }).join('') + abs.map(function (p) { return '<p><mark class="cx-vg">' + esc(p) + '</mark></p>'; }).join('') + '</div>';
          /* o texto que ocupa a vaga não conta na porcentagem: ela mede a fidelidade ao texto fixo da fonte */
        } else g.forEach(function (v) { h += '<p class="cx-ph">' + esc(v) + '</p>'; });
        continue;
      }
      if (par[k] != null) {
        insAte(par[k]);
        var d = difPal(dl[k], ad[par[k]], ws); h += '<p>' + d.h + '</p>'; ig += d.igual; tot += d.tot; npar++;
        prox = Math.max(prox, par[k] + 1);
      } else { h += '<p><del>' + esc(dl[k]) + '</del></p>'; tot += dl[k].split(/\s+/).length; npar++; faltam.push(dl[k]); }
    }
    insAte(ad.length);
    dl = []; ad = [];
  }
  ops.forEach(function (o) {
    if (o[0] === '=') { flush(); if (tit[posA]) { flushEq(); titulos(); } posA++; var w = o[1].split(/\s+/).length; ig += w; tot += w; if (sd) eqn++; else { flushEq(); h += '<p class="so">' + esc(o[1]) + '</p>'; } }
    else if (o[0] === '-') { flushEq(); if (tit[posA]) dl.push({ h: tit[posA] }); posA++; dl.push(o[1]); }
    else { flushEq(); ad.push(o[1]); }
  });
  flush(); flushEq();
  return { html: h || '<p class="none">Sem diferenças.</p>', npar: npar, pct: tot ? (npar ? Math.min(99, Math.floor(100 * ig / tot)) : 100) : 100, faltam: faltam, sobram: sobram, vagas: vagas };
}
/* partes do texto do editor (minuta do PJe): cabeçalho, relatório, voto, ementa, acórdão */
var CAB = [['relatorio', /^relat[óo]rio\.?$/i], ['voto', /^voto(\s*[-–—].*)?\.?$/i], ['ementa', /^e\s*m\s*e\s*n\s*t\s*a\.?$/i], ['acordao', /^ac[óo]rd[ãa]o\.?$/i], ['voto', /^voto[- ]vista\.?$/i]];
function partes(paragrafos) {
  var out = { cabecalho: [], relatorio: [], voto: [], ementa: [], acordao: [] }, cur = 'cabecalho', achou = false;
  (paragrafos || []).forEach(function (p, i) {
    var t = String(typeof p === 'string' ? p : p.t || '').trim(); if (!t) return;
    for (var k = 0; k < CAB.length; k++) if (CAB[k][1].test(t)) { cur = CAB[k][0]; achou = true; return; }
    out[cur].push(typeof p === 'string' ? { t: t, i: i } : Object.assign({ i: i }, p));
  });
  out.achou = achou;
  return out;
}
var API = { esc: esc, nrm: nrm, lcs: lcs, difPal: difPal, palavras: palavras, semelhanca: semelhanca, pareia: pareia, comparar: comparar, partes: partes, ehVaga: ehVaga, VAGA: VAGA };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else raiz.MutaComparador = API;
})(typeof window !== 'undefined' ? window : this);
