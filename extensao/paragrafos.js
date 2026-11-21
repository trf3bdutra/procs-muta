/* Muta · aba Parágrafos-padrão (0.11)
   O banco de parágrafos-padrão do gabinete (modelos/paragrafos.json, no pacote /extensao/dados/base.json.gz), pesquisável
   por palavras e por categoria. "Copiar" leva o texto para colar no editor do PJe; as vagas ({…}) ficam marcadas para
   preencher. A busca roda no navegador. */
(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
var FT = window.MutaFontes, caixa = $('par-app');
var P = { q: '', cat: '', erro: '', lista: null, abertos: {} };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function N(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function aberta() { var p = $('panel-par'); return p && !p.hidden; }
/* vagas: {nome} ou {nome|ROTULO}: aparecem destacadas; o texto copiado mantém a marca para preencher */
function comVagas(t) { return esc(t).replace(/\{([^{}|]*)(?:\|([^{}]*))?\}/g, function (m, a, b) { return '<mark class="pp-v" title="' + esc(a) + '">' + esc(b || a) + '</mark>'; }); }
function paraCopiar(t) { return String(t).replace(/\{([^{}|]*)(?:\|([^{}]*))?\}/g, function (m, a, b) { return '[' + (b || a).toUpperCase() + ']'; }); }
function carregar() {
  if (P.lista || P.erro) return Promise.resolve();
  return FT.base().then(function (d) { P.lista = (d.paragrafos || []).slice(); }, function (e) { P.erro = 'Não foi possível baixar os parágrafos-padrão: ' + e.message; });
}
function filtrados() {
  var t = N(P.q).split(/\s+/).filter(Boolean);
  return (P.lista || []).filter(function (p) {
    if (P.cat && p.cat.split(' › ')[0] !== P.cat) return false;
    if (!t.length) return true;
    var h = N(p.cat + ' ' + p.titulo + ' ' + p.texto);
    return t.every(function (w) { return h.indexOf(w) >= 0; });
  });
}
function render() {
  if (!caixa || !aberta()) return;
  if (P.erro) { caixa.innerHTML = '<div class="err-box">' + esc(P.erro) + '</div>'; return; }
  if (!P.lista) { caixa.innerHTML = '<div class="empty">Baixando os parágrafos-padrão do gabinete…</div>'; return; }
  var cats = []; P.lista.forEach(function (p) { var c = p.cat.split(' › ')[0]; if (cats.indexOf(c) < 0) cats.push(c); });
  var L = filtrados(), foco = document.activeElement && document.activeElement.id === 'pp-q';
  var grupos = {}, ordem = [];
  L.forEach(function (p) { if (!grupos[p.cat]) { grupos[p.cat] = []; ordem.push(p.cat); } grupos[p.cat].push(p); });
  caixa.innerHTML = '<div class="pp-top"><input type="search" id="pp-q" placeholder="Buscar: honorários, gratuidade, tempestividade…" value="' + esc(P.q) + '">' +
    '<select id="pp-cat" title="Filtrar por categoria"><option value="">Todas as categorias</option>' + cats.map(function (c) { return '<option' + (c === P.cat ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
    '<p class="muted pp-n">' + L.length + ' de ' + P.lista.length + ' parágrafos · as partes destacadas são vagas a preencher</p></div>' +
    ordem.map(function (c) {
      return '<h4 class="tr-g">' + esc(c) + ' <small class="muted">' + grupos[c].length + '</small></h4>' + grupos[c].map(function (p) {
        return '<article class="pp-i"><div class="pp-h"><b>' + esc(p.titulo) + '</b><span class="pp-ac"><button type="button" class="btn solid sm" data-ins="' + esc(p.id) + '" title="Inserir no editor do PJe, na posição do cursor">Inserir</button><button type="button" class="btn line sm" data-cp="' + esc(p.id) + '">Copiar</button></span></div><p class="pp-t">' + comVagas(p.texto) + '</p></article>';
      }).join('');
    }).join('') + (L.length ? '' : '<div class="empty">Nenhum parágrafo com esses termos.</div>');
  if (foco) { var q = $('pp-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
}
var tq = 0;
if (caixa) {
  caixa.addEventListener('input', function (e) { if (e.target.id !== 'pp-q') return; clearTimeout(tq); tq = setTimeout(function () { P.q = e.target.value; render(); }, 250); });
  caixa.addEventListener('change', function (e) { if (e.target.id === 'pp-cat') { P.cat = e.target.value; render(); } });
  caixa.addEventListener('click', function (e) {
    var bi = e.target.closest('[data-ins]');
    if (bi) {
      var pi = (P.lista || []).filter(function (x) { return x.id === bi.dataset.ins; })[0]; if (!pi || !window.MutaPje || !window.MutaPje.inserir) return;
      var tx = paraCopiar(pi.texto), html = tx.split(/\n+/).map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('');
      bi.disabled = true; bi.textContent = 'Inserindo…';
      window.MutaPje.inserir(html, tx).then(function (r) { bi.textContent = 'Inserido ' + (r.onde || ''); }, function (er) { bi.textContent = 'Copiado'; bi.title = er.message; })
        .then(function () { setTimeout(function () { bi.disabled = false; bi.textContent = 'Inserir'; }, 1800); });
      return;
    }
    var b = e.target.closest('[data-cp]'); if (!b) return;
    var p = (P.lista || []).filter(function (x) { return x.id === b.dataset.cp; })[0]; if (!p) return;
    (navigator.clipboard ? navigator.clipboard.writeText(paraCopiar(p.texto)) : Promise.reject()).then(function () { b.textContent = 'Copiado'; setTimeout(function () { b.textContent = 'Copiar'; }, 1200); }, function () {});
  });
}
window.MutaParagrafos = { abrir: function () { render(); carregar().then(render); } };
})();
