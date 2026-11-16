/* barra da equipe no Modus Operandi: mesmos botões do Ex Officio; aqui só os contadores de notificações e diligências (o usuário e o Sair ficam no chip de acesso) */
(function(){
  function nq(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();}
  function j(u){return fetch(u,{credentials:'same-origin',cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}
  function bdg(id,n){var b=document.querySelector(id);if(!b)return;b.hidden=!n;b.textContent=n>99?'99+':n;}
  document.addEventListener('cmt-acesso',function(ev){var u=(ev.detail||{}).usuario||'';if(!u){bdg('#eq-cnot',0);bdg('#eq-cpen',0);return;}
    j('/api/notificacoes').then(function(x){var lido='';try{lido=localStorage.getItem('eq_not_lido_'+nq(u))||'';}catch(e){}bdg('#eq-cnot',(x.events||[]).filter(function(e){return e.time>lido&&(e.action!=='aviso-geral'||e.notificacao!==false);}).length);}).catch(function(){});
    j('/api/pendencias').then(function(x){bdg('#eq-cpen',(x.tasks||[]).filter(function(t){return t.stage!=='done'&&nq(t.assignee)===nq(u);}).length);}).catch(function(){});
  });
})();

/* endereço das seções (#v=edit&s=mod) e links da pill fora do site */
(function(){
  var SITE=/^https?:$/.test(location.protocol);
  if(!SITE)Array.prototype.forEach.call(document.querySelectorAll('[data-eqlink],.eq-cmp[href]'),function(a){a.href='https://trf3-muta.vercel.app'+a.getAttribute('href');});
  function vai(){var p={};location.hash.replace(/^#/,'').split('&').forEach(function(kv){var i=kv.indexOf('=');if(i>0)p[kv.slice(0,i)]=decodeURIComponent(kv.slice(i+1));});
    if(!p.v)return;var t=document.querySelector('.tab[data-v="'+p.v+'"]');if(!t||t.hidden)return;
    if(p.v==='edit'&&window.VDM_irEditorial){window.VDM_irEditorial(p.s);return;}
    if(t.getAttribute('aria-selected')!=='true')t.click();
    if(p.s&&p.v!=='edit'){var sb=document.querySelector('#v-'+p.v+' [data-s="'+p.s+'"]');if(sb)sb.click();}}
  document.addEventListener('cmt-acesso',function(){setTimeout(vai,0);},{once:true});
  window.addEventListener('hashchange',vai);
})();
