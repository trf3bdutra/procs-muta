/* Muta · aba Diretrizes (0.11)
   As diretrizes do gabinete no formato do manual do Compendium: os capítulos do Manual CMT (apoio/vade-mecum.json:
   regra, orientação, o que evitar e o padrão) e as regras de redação da lista de caça (apoio/diretrizes.json), do pacote
   /extensao/dados/base.json.gz. Pesquisável; a busca roda no navegador. */
(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
var FT = window.MutaFontes, caixa = $('dir-app');
var D = { q: '', vista: 'manual', man: null, red: null, erro: '', cap: '' };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function N(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function aberta() { var p = $('panel-dir'); return p && !p.hidden; }
function carregar() {
  if (D.man || D.erro) return Promise.resolve();
  return FT.base().then(function (d) { D.man = d.manual || []; D.red = d.diretrizes || []; }, function (e) { D.erro = 'Não foi possível baixar as diretrizes: ' + e.message; });
}
var ESCOPO = { ementa: 'Ementa', voto: 'Voto', relatorio: 'Relatório', geral: 'Geral', acordao: 'Acórdão', decisao: 'Decisão', todo: 'Toda a peça' };
function casa(x, t) { var h = N(Object.keys(x).map(function (k) { return typeof x[k] === 'string' ? x[k] : ''; }).join(' ')); return t.every(function (w) { return h.indexOf(w) >= 0; }); }
function render() {
  if (!caixa || !aberta()) return;
  if (D.erro) { caixa.innerHTML = '<div class="err-box">' + esc(D.erro) + '</div>'; return; }
  if (!D.man) { caixa.innerHTML = '<div class="empty">Baixando as diretrizes do gabinete…</div>'; return; }
  var t = N(D.q).split(/\s+/).filter(Boolean), foco = document.activeElement && document.activeElement.id === 'dr-q', h;
  var top = '<div class="pp-top"><input type="search" id="dr-q" placeholder="Buscar nas diretrizes" value="' + esc(D.q) + '">' +
    '<span class="seg"><button type="button" data-v="manual" aria-selected="' + (D.vista === 'manual') + '">Manual · ' + D.man.length + '</button><button type="button" data-v="red" aria-selected="' + (D.vista === 'red') + '">Lista de caça · ' + D.red.length + '</button></span></div>';
  if (D.vista === 'manual') {
    var L = D.man.filter(function (x) { return !t.length || casa(x, t); }), caps = [], porCap = {};
    L.forEach(function (x) { if (!porCap[x.cap]) { porCap[x.cap] = []; caps.push(x.cap); } porCap[x.cap].push(x); });
    h = '<nav class="dr-idx">' + caps.map(function (c) { return '<a href="#dr-' + esc(N(c).replace(/[^a-z0-9]+/g, '-')) + '">' + esc(c) + ' <small>' + porCap[c].length + '</small></a>'; }).join('') + '</nav>' +
      caps.map(function (c) {
        return '<section class="dr-cap" id="dr-' + esc(N(c).replace(/[^a-z0-9]+/g, '-')) + '"><h3>' + esc(c) + '</h3>' + porCap[c].map(function (x) {
          return '<article class="dr-i"><div class="dr-h"><span class="dr-t">' + esc(x.tipo) + '</span><b>' + esc(x.titulo) + '</b><small class="mono">' + esc(x.id) + '</small></div>' +
            (x.orientacao ? '<p>' + esc(x.orientacao) + '</p>' : '') + (x.evitar ? '<p class="dr-ev"><b>Evitar:</b> ' + esc(x.evitar) + '</p>' : '') + '</article>';
        }).join('') + '</section>';
      }).join('') + (L.length ? '' : '<div class="empty">Nenhuma diretriz com esses termos.</div>');
  } else {
    var R = D.red.filter(function (x) { return !t.length || casa(x, t); }), por = {}, ord = [];
    R.forEach(function (x) { var k = ESCOPO[x.escopo] || x.escopo || 'Geral'; if (!por[k]) { por[k] = []; ord.push(k); } por[k].push(x); });
    h = ord.map(function (k) {
      return '<section class="dr-cap"><h3>' + esc(k) + '</h3>' + por[k].map(function (x) {
        return '<article class="dr-i"><div class="dr-h"><span class="dr-t ' + esc(x.tipo) + '">' + esc(x.tipo) + '</span><b>' + esc(x.msg) + '</b></div>' + (x.subst ? '<p class="dr-ev"><b>Use:</b> ' + esc(x.subst) + '</p>' : '') + '</article>';
      }).join('') + '</section>';
    }).join('') + (R.length ? '' : '<div class="empty">Nenhuma regra com esses termos.</div>');
  }
  caixa.innerHTML = top + h;
  if (foco) { var q = $('dr-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
}
var tq = 0;
if (caixa) {
  caixa.addEventListener('input', function (e) { if (e.target.id !== 'dr-q') return; clearTimeout(tq); tq = setTimeout(function () { D.q = e.target.value; render(); }, 250); });
  caixa.addEventListener('click', function (e) {
    var b = e.target.closest('[data-v]'); if (b) { D.vista = b.dataset.v; render(); return; }
    var a = e.target.closest('.dr-idx a'); if (a) { e.preventDefault(); var x = document.querySelector(a.getAttribute('href')); if (x) x.scrollIntoView({ block: 'start' }); }
  });
}
window.MutaDiretrizes = { abrir: function () { render(); carregar().then(render); } };
})();
