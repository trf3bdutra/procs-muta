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
function aberta() { var p = $(document.body.classList.contains('hero-redesign-v53')?'panel-dir':'panel-min'), d = $('dir-app'); return !!(p && !p.hidden && d && !d.hidden); }
function carregar() {
  if (D.man || D.erro) return Promise.resolve();
  return FT.base().then(function (d) { D.man = d.manual || []; D.red = d.diretrizes || []; }, function (e) { D.erro = 'Não foi possível baixar as Diretrizes: ' + e.message; });
}
var ESCOPO = { ementa: 'Ementa', voto: 'Voto', relatorio: 'Relatório', geral: 'Geral', acordao: 'Acórdão', decisao: 'Decisão', todo: 'Toda a peça' };
function casa(x, t) { var h = N(Object.keys(x).map(function (k) { return typeof x[k] === 'string' ? x[k] : ''; }).join(' ')); return t.every(function (w) { return h.indexOf(w) >= 0; }); }
function manualOriginal(){
 var M=window.MutaManualCanhoto,g=window.MutaGabinete,des=g&&g.destino?N(g.destino()):'',p=D.parte||(/despacho/.test(des)?'despacho':/monocr/.test(des)?'monocratica':'relatorio');
 var T=[['relatorio','Relatório'],['voto','Voto'],['ementa','Ementa'],['acordao','Proclamação'],['monocratica','Decisão monocrática'],['despacho','Despacho']];
 var tabs=[['par','Parágrafos'],['cit','Citação'],['voc','Vocabulário'],['forma','Forma']];
 var caps=(M.capitulos||[]).filter(function(c){return !/tensoes|propostas em avaliacao/.test(N(c.titulo));});
 var areas=[['contexto','Por peça'],['par','Parágrafos'],['cit','Citações'],['voc','Vocabulário'],['forma','Formatação']];
 if(caps.length)areas.push(['integral','Manual completo']);
 var mode=D.modo||'contexto';
 function select(id,label,L,val){return '<select id="'+id+'" aria-label="'+label+'">'+L.map(function(t){return '<option value="'+esc(t[0])+'"'+(t[0]===val?' selected':'')+'>'+esc(t[1])+'</option>';}).join('')+'</select>';}
 var h='<div class="acv-faixa dr-head"><div class="acv-form"><div class="af-l"><input id="x-rq" type="search" placeholder="Buscar nas Diretrizes…" aria-label="Buscar nas Diretrizes" value="'+esc(D.q)+'"><button type="button" class="tu-b" data-dr-clear aria-label="Limpar busca" title="Limpar busca">×</button></div><div class="af-l">'+select('dr-modo','Área de consulta',areas,mode)+(mode==='contexto'?select('mc-parte','Parte da peça',T,p):mode==='integral'?select('dr-capitulo','Capítulo',[['','Todos os capítulos']].concat(caps.map(function(c){return [c.id,c.titulo];})),D.cap):'')+'</div></div></div>';
 var query=N(D.q).split(/\s+/).filter(Boolean);
 function matches(t){return query.every(function(w){return N(t).includes(w);});}
 var body='';
 if(mode==='contexto'){
   var tmp=document.createElement('div');tmp.innerHTML=M.geral(p);
   Array.from(tmp.querySelectorAll('details.xgd')).forEach(function(d){var sum=d.querySelector('summary');if(sum&&/tensoes|propostas em avaliacao/.test(N(sum.textContent))){d.remove();return;}if(query.length){if(!matches(d.textContent))d.remove();else d.open=true;}});
   body='<h4 class="dr-section-title">'+esc((T.find(function(t){return t[0]===p;})||T[0])[1])+'</h4>'+tmp.innerHTML;
 }else if(mode==='integral'){
   body=caps.filter(function(c){return (!D.cap||c.id===D.cap)&&matches(c.titulo+' '+c.html.replace(/<[^>]*>/g,' '));}).map(function(c){var doc=new DOMParser().parseFromString(c.html,'text/html');doc.querySelectorAll('script,style,iframe,object,embed,form,button').forEach(function(x){x.remove();});doc.body.querySelectorAll('*').forEach(function(x){Array.from(x.attributes).forEach(function(a){if(/^on/i.test(a.name)||/^(src|srcset|href|style)$/i.test(a.name))x.removeAttribute(a.name);});});return '<details class="dr-chapter"'+(D.cap||query.length?' open':'')+'><summary>'+esc(c.titulo)+'</summary><div class="dr-chapter-body">'+doc.body.innerHTML+'</div></details>';}).join('');
 }else{var R=M.tab(mode,D.q);body='<div class="xrb">'+(R.h||'<p class="meta">Nada encontrado.</p>')+'</div>';}
 return h+'<div class="dori man dr-content">'+(body||'<p class="muted">Nenhuma orientação encontrada.</p>')+'</div>';
}
function render() {
  if (!caixa || !aberta()) return;
  if(D.vista==='manual'&&window.MutaManualCanhoto){var a=document.activeElement,f=a&&a.id==='x-rq',pos=f?a.selectionStart:0;caixa.innerHTML='<div class="dr-nav"><span class="seg"><button type="button" data-v="manual" aria-selected="true">Manual</button><button type="button" data-v="red" aria-selected="false">Lista de caça</button></span></div>'+manualOriginal();if(f){var q=$('x-rq');q.focus();try{q.setSelectionRange(pos,pos);}catch(e){}}return;}
  if (D.erro) { caixa.innerHTML = '<div class="err-box">' + esc(D.erro) + '</div>'; return; }
  if (!D.man) { caixa.innerHTML = '<div class="empty">Baixando as Diretrizes do gabinete…</div>'; return; }
  var t = N(D.q).split(/\s+/).filter(Boolean), foco = document.activeElement && document.activeElement.id === 'dr-q', h;
  var top = '<div class="pp-top dr-list-head"><input type="search" id="dr-q" placeholder="Buscar nas Diretrizes" value="' + esc(D.q) + '">' +
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
  caixa.addEventListener('change',function(e){if(e.target.id==='mc-parte'){D.parte=e.target.value;render();}else if(e.target.id==='dr-modo'){D.modo=e.target.value;render();}else if(e.target.id==='dr-capitulo'){D.cap=e.target.value;render();}});
  caixa.addEventListener('click', function (e) {
    if(e.target.closest('[data-dr-clear]')){D.q='';render();return;}
    var tab=e.target.closest('[data-xrt]');if(tab){D.tab=tab.dataset.xrt;render();return;}
    var b = e.target.closest('[data-v]'); if (b) { D.vista = b.dataset.v; render(); if(D.vista==='red')carregar().then(render); return; }
    var a = e.target.closest('.dr-idx a'); if (a) { e.preventDefault(); var x = document.querySelector(a.getAttribute('href')); if (x) x.scrollIntoView({ block: 'start' }); }
  });
}
window.MutaDiretrizes = { abrir: function () { render(); if(!window.MutaManualCanhoto||D.vista==='red')carregar().then(render); } };
})();
