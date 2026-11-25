/* HERO · primeiro grau. Somente cronologia e identificação, sem selos, editor, extração ou comandos de gravação no PJe. */
(function(){
'use strict';
if(window.__mutaReferencia1G)return;window.__mutaReferencia1G=true;
var CNJ=/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;
function numeros(t){return Array.from(new Set(String(t||'').match(CNJ)||[]));}
function limpa(t){return String(t||'').replace(/\u00a0/g,' ').replace(/\u200b/g,'').replace(/\r/g,'').trim();}
function reservado(t){return /segredo de justi[çc]a|sigilos[oa]|acesso restrito|documento restrito/i.test(String(t||''));}
function identidade(){
 var nums=numeros(document.title),cab=document.querySelector('#navbar .titulo-topo,.titulo-topo,#pageHeader,.header-processo,#processoIdentificacao'),nc=numeros(cab&&cab.textContent);
 if(nums.length>1||nc.length>1||nums.length&&nc.length&&nums[0]!==nc[0])return '';
 return nums[0]||nc[0]||'';
}
function restrito(){
 var el=document.querySelector('#navbar,.titulo-topo,#pageHeader,.header-processo,#processoIdentificacao');
 return reservado(document.title)||reservado(el&&el.textContent)||!!(el&&Array.from(el.querySelectorAll('[title],[aria-label]')).some(function(n){return reservado(n.title)||reservado(n.getAttribute('aria-label'));}));
}
  var MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
  function dataBr(t) {
    var m = /(\d{1,2})\s+([a-zç]{3})\.?\s+(\d{4})/i.exec(t || ''), mm = m && MESES[m[2].toLowerCase()];
    return mm ? ('0' + m[1]).slice(-2) + '/' + ('0' + mm).slice(-2) + '/' + m[3] : '';
  }
  var RE_DOC = /^(\d{6,12})\s*-\s*(.+?)(?:\s*-\s*ID de origem\s*(\d+))?\s*$/;
  function lerCronologia() {
    var tl = document.getElementById('divTimeLine');
    if (!tl) return null;
    var data = '', itens = [], jaVisto = {};
    Array.prototype.forEach.call(tl.querySelectorAll('.media'), function (m) {
      if (m.classList.contains('div-data-rolagem')) return; /* data flutuante da rolagem */
      if (m.classList.contains('data')) { var d = dataBr(m.textContent); if (d) data = d; return; }
      if (!m.classList.contains('interno')) return;
      var it = { data: data, hora: '', docs: [], movs: [], ativo: m.classList.contains('active') }, vistos = {};
      Array.prototype.forEach.call(m.querySelectorAll('a'), function (a) {
        var x = RE_DOC.exec(limpa(a.innerText || a.textContent).replace(/\s+/g, ' '));
        if (!x || vistos[x[1]] || jaVisto[x[1]]) return; /* a página repete a lista inteira em ordem crescente: vale a primeira */
        vistos[x[1]] = jaVisto[x[1]] = 1;
        var tipo = x[2], desc = '', p = /^(.*?)\s*\((.*)\)\s*$/.exec(tipo);
        if (p && p[1]) { tipo = p[1]; desc = p[2]; }
        it.docs.push({ id: x[1], tipo: tipo.trim(), desc: desc.trim(), origem: x[3] || '' });
      });
      limpa(m.innerText || m.textContent).split('\n').forEach(function (l) {
        l = l.replace(/\s+/g, ' ').trim();
        if (!l) return;
        if (/^\d{2}:\d{2}$/.test(l)) { it.hora = l; return; }
        if (RE_DOC.test(l)) return;
        if (l.length >= 6 && l === l.toUpperCase() && /[A-ZÀ-Ü]{3}/.test(l)) it.movs.push(l);
      });
      if (it.docs.length || (it.movs.length && it.hora)) itens.push(it);
    });
    return itens;
  }

var ultimo='',timer;
function informar(){timer=null;var n=identidade(),k=n+'|'+!!document.getElementById('divTimeLine');if(k===ultimo)return;ultimo=k;try{chrome.runtime.sendMessage({tipo:'muta-processo',numero:n,classe:'',forca:n?3:0,via:'cabeçalho',ctx:document.getElementById('divTimeLine')?'autos':'',ed:false,host:location.host});}catch(e){}}
function agenda(){if(!timer)timer=setTimeout(informar,300);}
chrome.runtime.onMessage.addListener(function(m,s,reply){
 if(!m)return;
 if(m.tipo==='muta-reinformar'){ultimo='';agenda();return;}
 if(m.tipo!=='muta-autos-referencia')return;
 var tl=document.getElementById('divTimeLine');if(!tl)return;
 var numero=identidade();
 if(!numero||numero.replace(/\D/g,'')!==String(m.referencia||'').replace(/\D/g,'')){reply({erro:'O processo aberto no primeiro grau não corresponde à referência do prontuário.'});return;}
 if(restrito()){reply({erro:'Processo sinalizado como sigiloso. Não é permitido copiar as peças para a ficha compartilhada.'});return;}
 var proibidos=new Set();
 Array.from(tl.querySelectorAll('a')).forEach(function(a){var row=a.closest('.media.interno')||a,txt=[a.textContent,a.title,a.getAttribute('aria-label'),row.textContent].join(' ');var x=RE_DOC.exec(limpa(a.innerText||a.textContent).replace(/\s+/g,' '));if(x&&(reservado(txt)||Array.from(row.querySelectorAll('[title],[aria-label]')).some(function(n){return reservado(n.title)||reservado(n.getAttribute('aria-label'));})))proibidos.add(x[1]);});
 var itens=(lerCronologia()||[]).map(function(i){return {data:i.data,docs:i.docs.filter(function(d){return !proibidos.has(d.id)&&!reservado(d.tipo+' '+d.desc);}).map(function(d){return {id:d.id,tipo:d.tipo,origem:d.origem};})};}).filter(function(i){return i.docs.length;});
 reply({numero:numero,host:location.host,itens:itens,omitidos:proibidos.size});
});
if(document.body)new MutationObserver(agenda).observe(document.body,{childList:true,subtree:true,characterData:true});
window.addEventListener('focus',function(){ultimo='';agenda();});informar();
})();
