/* Cognitio: sessão institucional, sem credencial paralela. */
(function(W){
 'use strict';
 async function lerSessao(fetcher=W.fetch.bind(W)){
   const r=await fetcher('/api/login',{method:'GET',credentials:'same-origin',cache:'no-store'});
   if(r.status===401)return null;
   if(!r.ok)throw new Error('Não foi possível verificar a sessão do Office (HTTP '+r.status+').');
   const j=await r.json();
   if(!j||typeof j.usuario!=='string'||!j.usuario.trim())throw new Error('Sessão institucional inválida.');
   return j;
 }
 async function entrar(usuario,senha,fetcher=W.fetch.bind(W)){
   const r=await fetcher('/api/login',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario,senha})});
   if(!r.ok){let j={};try{j=await r.json()}catch(e){}throw new Error(j.erro||'Não foi possível entrar no Office.');}
   const sessao=await lerSessao(fetcher);if(!sessao)throw new Error('O navegador não manteve a sessão do Office.');return sessao;
 }
 async function ponte(fetcher=W.fetch.bind(W)){
   const r=await fetcher('/api/acesso?gh=1&office=1&p=',{method:'GET',credentials:'same-origin',cache:'no-store'});
   if(!r.ok)throw new Error('A sessão do Office não tem acesso ao acervo (HTTP '+r.status+').');
 }
 function podeGerarRelatorio(s){
   return !!(s&&typeof s.usuario==='string'&&s.usuario.trim()&&(s.gestor===true||s.perfil==='editor'||s.usuario.trim().toLowerCase()==='bruno'));
 }
 W.CognitioAuth={lerSessao,entrar,ponte,podeGerarRelatorio};
})(typeof window!=='undefined'?window:globalThis);
