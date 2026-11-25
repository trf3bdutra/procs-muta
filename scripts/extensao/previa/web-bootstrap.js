/* Ambiente institucional da mesma HERO: sem Chrome simulado, sem rascunho compartilhado. */
(function(){
 'use strict';
 const q=new URLSearchParams(location.search),cnj=String(q.get('cnj')||'').replace(/\D/g,'');
 const bank=new Map();
 window.MutaWebStorage={getItem:k=>bank.has(k)?bank.get(k):null,setItem:(k,v)=>bank.set(k,String(v)),removeItem:k=>bank.delete(k)};
 let matriz={};try{const f=window.frameElement;if(f&&f.dataset.cnj===cnj)matriz=JSON.parse(f.dataset.matriz||'{}');}catch(e){}
 window.MUTA_WEB=Object.freeze({cnj:cnj.length===20?cnj:'',modo:q.get('modo')==='pro'?'pro':'tri',leitura:q.get('leitura')==='1',matriz});
 document.documentElement.classList.add('muta-web');
 if(window.MUTA_WEB.leitura){const f0=window.fetch.bind(window);window.fetch=function(u,o){const m=String((o&&o.method)||(u&&u.method)||'GET').toUpperCase(),url=new URL((u&&u.url)||String(u),location.href);if(m!=='GET'&&m!=='HEAD'&&url.pathname!=='/api/login')return Promise.resolve(new Response(JSON.stringify({erro:'Prontuário em modo de leitura.'}),{status:403,headers:{'Content-Type':'application/json'}}));return f0(u,o);};}
 document.addEventListener('DOMContentLoaded',()=>{
  if(!window.MUTA_WEB.cnj){const g=document.getElementById('gab');if(g)g.textContent='Número de processo inválido.';return;}
  if(window.MutaAbas)MutaAbas.ir('pront');
  if(window.MUTA_WEB.leitura){const g=document.getElementById('gab');const bloquear=()=>{g.querySelectorAll('input,textarea,select,button[data-et],button[data-fk],button[data-des-ed]').forEach(x=>{x.disabled=true;});};new MutationObserver(bloquear).observe(g,{childList:true,subtree:true});bloquear();}
 });
})();
