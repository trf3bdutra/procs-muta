/* Muta · aba Diretrizes (0.11)
   As diretrizes do gabinete no formato do manual do Compendium: os capítulos do Manual CMT (apoio/vade-mecum.json:
   regra, orientação, o que evitar e o padrão) e as regras de redação da lista de caça (apoio/diretrizes.json), do pacote
   /extensao/dados/base.json.gz. Pesquisável; a busca roda no navegador. */
(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
var FT = window.MutaFontes, caixa = $('dir-app');
var D = { q: '', vista: 'manual', man: null, red: null, erro: '', cap: '', tab:'par', parte:'' };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function N(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
/* 0.47: as Diretrizes são uma parte da aba Minuta */
function aberta() { var p = $('panel-min'), d = $('dir-app'); return !!(p && !p.hidden && d && !d.hidden); }
function carregar() {
  if (D.man || D.erro) return Promise.resolve();
  return FT.base().then(function (d) { D.man = d.manual || []; D.red = d.diretrizes || []; }, function (e) { D.erro = 'Não foi possível baixar o Breviário: ' + e.message; });
}
var ESCOPO = { ementa: 'Ementa', voto: 'Voto', relatorio: 'Relatório', geral: 'Geral', acordao: 'Acórdão', decisao: 'Decisão', todo: 'Toda a peça' };
function casa(x, t) { var h = N(Object.keys(x).map(function (k) { return typeof x[k] === 'string' ? x[k] : ''; }).join(' ')); return t.every(function (w) { return h.indexOf(w) >= 0; }); }
function manualOriginal(){var M=window.MutaManualCanhoto,g=window.MutaGabinete,des=g&&g.destino?N(g.destino()):'',p=D.parte||(/despacho/.test(des)?'despacho':/monocr/.test(des)?'monocratica':'relatorio'),T=[['relatorio','Relatório'],['voto','Voto'],['ementa','Ementa'],['acordao','Proclamação'],['monocratica','Decisão monocrática'],['despacho','Despacho']],tabs=[['par','Parágrafos'],['cit','Citação'],['voc','Vocabulário'],['forma','Forma']],R={};tabs.forEach(function(t){R[t[0]]=M.tab(t[0],D.q);});return '<div class="dori man"><div class="ohd"><p class="kick2">Manual · '+esc(T.find(function(t){return t[0]===p;})[1])+'</p></div><select class="mc-parte" id="mc-parte" aria-label="Parte da peça">'+T.map(function(t){return '<option value="'+t[0]+'"'+(t[0]===p?' selected':'')+'>'+t[1]+'</option>';}).join('')+'</select>'+M.geral(p)+'<div class="xrtabs" role="tablist" style="margin-top:10px">'+tabs.map(function(t){return '<button role="tab" data-xrt="'+t[0]+'" aria-selected="'+(D.tab===t[0])+'">'+t[1]+(D.q?' <small>'+R[t[0]].n+'</small>':'')+'</button>';}).join('')+'</div><input id="x-rq" type="search" placeholder="Buscar nas orientações…" aria-label="Buscar nas orientações" value="'+esc(D.q)+'"><div class="xrb">'+(R[D.tab].h||'<p class="meta">Nada encontrado.</p>')+'</div></div>';}
function render() {
  if (!caixa || !aberta()) return;
  if(D.vista==='manual'&&window.MutaManualCanhoto){var a=document.activeElement,f=a&&a.id==='x-rq',pos=f?a.selectionStart:0;caixa.innerHTML='<div class="pp-top"><span class="seg"><button type="button" data-v="manual" aria-selected="true">Manual</button><button type="button" data-v="red" aria-selected="false">Lista de caça</button></span></div>'+manualOriginal();if(f){var q=$('x-rq');q.focus();try{q.setSelectionRange(pos,pos);}catch(e){}}return;}
  if (D.erro) { caixa.innerHTML = '<div class="err-box">' + esc(D.erro) + '</div>'; return; }
  if (!D.man) { caixa.innerHTML = '<div class="empty">Baixando o Breviário do gabinete…</div>'; return; }
  var t = N(D.q).split(/\s+/).filter(Boolean), foco = document.activeElement && document.activeElement.id === 'dr-q', h;
  var top = '<div class="pp-top"><input type="search" id="dr-q" placeholder="Buscar no Breviário" value="' + esc(D.q) + '">' +
    '<span class="seg"><button type="button" data-v="manual" aria-selected="' + (D.vista === 'manual') + '">Manual · ' + D.man.length + '</button><button type="button" data-v="red" aria-selected="' + (D.vista === 'red') + '">Lista de caça · ' + D.red.length + '</button></span>' + (D.vista === 'manual' ? '@@IDX@@' : '') + '</div>';
  if (D.vista === 'manual') {
    var L = D.man.filter(function (x) { return !t.length || casa(x, t); }), caps = [], porCap = {};
    L.forEach(function (x) { if (!porCap[x.cap]) { porCap[x.cap] = []; caps.push(x.cap); } porCap[x.cap].push(x); });
    top = top.replace('@@IDX@@', '<nav class="dr-idx">' + caps.map(function (c) { return '<a href="#dr-' + esc(N(c).replace(/[^a-z0-9]+/g, '-')) + '" title="Ir para o capítulo">' + esc(c) + ' <small>' + porCap[c].length + '</small></a>'; }).join('') + '</nav>');
    h = '' +
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
  caixa.addEventListener('input', function (e) { if (e.target.id !== 'dr-q' && e.target.id !== 'x-rq') return; clearTimeout(tq); tq = setTimeout(function () { D.q = e.target.value; render(); }, 250); });
  caixa.addEventListener('change',function(e){if(e.target.id==='mc-parte'){D.parte=e.target.value;render();}});
  caixa.addEventListener('click', function (e) {
    var tab=e.target.closest('[data-xrt]');if(tab){D.tab=tab.dataset.xrt;render();return;}
    var b = e.target.closest('[data-v]'); if (b) { D.vista = b.dataset.v; render(); if(D.vista==='red')carregar().then(render); return; }
    var a = e.target.closest('.dr-idx a'); if (a) { e.preventDefault(); var x = document.querySelector(a.getAttribute('href')); if (x) x.scrollIntoView({ block: 'start' }); }
  });
}
window.MutaDiretrizes = { abrir: function () { render(); if(!window.MutaManualCanhoto||D.vista==='red')carregar().then(render); } };
})();
