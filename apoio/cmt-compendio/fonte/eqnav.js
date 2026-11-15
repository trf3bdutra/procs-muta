/* barra da equipe no Compêndio: mesmos botões da Pauta da equipe; aqui só os contadores de notificações e diligências (o usuário e o Sair ficam no chip de acesso) */
(function(){
  function nq(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();}
  function j(u){return fetch(u,{credentials:'same-origin',cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}
  function bdg(id,n){var b=document.querySelector(id);if(!b)return;b.hidden=!n;b.textContent=n>99?'99+':n;}
  document.addEventListener('cmt-acesso',function(ev){var u=(ev.detail||{}).usuario||'';if(!u){bdg('#eq-cnot',0);bdg('#eq-cpen',0);return;}
    j('/api/notificacoes').then(function(x){var lido='';try{lido=localStorage.getItem('eq_not_lido_'+nq(u))||'';}catch(e){}bdg('#eq-cnot',(x.events||[]).filter(function(e){return e.time>lido&&(e.action!=='aviso-geral'||e.notificacao!==false);}).length);}).catch(function(){});
    j('/api/pendencias').then(function(x){bdg('#eq-cpen',(x.tasks||[]).filter(function(t){return t.stage!=='done'&&nq(t.assignee)===nq(u);}).length);}).catch(function(){});
  });
})();
