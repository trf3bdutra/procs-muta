/* Cognitio: sessão institucional, sem credencial paralela. */
(function(W){
 'use strict';
 async function lerSessao(fetcher=W.fetch.bind(W)){
   const r=await fetcher('/api/login',{method:'GET',credentials:'same-origin',cache:'no-store'});
   if(r.status===401)return lerConsulta(fetcher);
   if(!r.ok)throw new Error('Não foi possível verificar a sessão do Office (HTTP '+r.status+').');
   const j=await r.json();
   if(!j||typeof j.usuario!=='string'||!j.usuario.trim())throw new Error('Sessão institucional inválida.');
   return j;
 }
 /* link de consulta (cookie cmt_cons): sessão só de leitura, sem login do Office */
 async function lerConsulta(fetcher=W.fetch.bind(W)){
   let r;try{r=await fetcher('/api/acesso?consulta=1',{method:'GET',credentials:'same-origin',cache:'no-store'});}catch(e){return null;}
   if(!r||!r.ok)return null;
   let j=null;try{j=await r.json();}catch(e){return null;}
   if(!j||j.leitura!==true||typeof j.usuario!=='string'||!j.usuario.trim())return null;
   return Object.assign({},j,{gestor:false,leitura:true});
 }
 async function entrarConsulta(chave,nome,fetcher=W.fetch.bind(W)){
   const r=await fetcher('/api/acesso?consulta=1',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({chave,nome})});
   if(!r.ok){let j={};try{j=await r.json()}catch(e){}throw new Error(j.erro||'Não foi possível abrir a consulta.');}
   const s=await lerConsulta(fetcher);if(!s)throw new Error('O navegador não manteve o acesso de consulta.');return s;
 }
 async function sairConsulta(fetcher=W.fetch.bind(W)){try{await fetcher('/api/acesso?consulta=1',{method:'DELETE',credentials:'same-origin',cache:'no-store'});}catch(e){}}
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
   return !!(s&&!s.leitura&&typeof s.usuario==='string'&&s.usuario.trim()&&(s.gestor===true||s.perfil==='editor'||s.usuario.trim().toLowerCase()==='bruno'));
 }
 W.CognitioAuth={lerSessao,lerConsulta,entrar,entrarConsulta,sairConsulta,ponte,podeGerarRelatorio};
})(typeof window!=='undefined'?window:globalThis);
