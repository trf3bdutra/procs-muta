/* barra da equipe no Compêndio público: mesmos botões da Pauta da equipe (Início, Pauta, Compêndio, notificações, pendências, tema, usuário, Sair) */
(function(){
  function nq(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();}
  function j(u,op){op=op||{};op.credentials='same-origin';return fetch(u,op).then(function(r){if(!r.ok){var e=new Error(r.status);e.status=r.status;throw e;}return r.status===204?{}:r.json();});}
  function $(s){return document.querySelector(s);}
  function bdg(id,n){var b=$(id);if(!b)return;b.hidden=!n;b.textContent=n>99?'99+':n;}
  j('/api/login').then(function(r){var u=r.usuario||'';if(!u)throw 0;
    $('#eq-ini').textContent=u.slice(0,2).toUpperCase();$('#eq-nome').textContent=u;$('#eq-u').hidden=false;$('#eq-sair').hidden=false;$('#eq-entrar').hidden=true;
    j('/api/notificacoes').then(function(x){var lido='';try{lido=localStorage.getItem('eq_not_lido_'+nq(u))||'';}catch(e){}bdg('#eq-cnot',(x.events||[]).filter(function(e){return e.time>lido;}).length);}).catch(function(){});
    j('/api/pendencias').then(function(x){bdg('#eq-cpen',(x.tasks||[]).filter(function(t){return t.stage!=='done'&&nq(t.assignee)===nq(u);}).length);}).catch(function(){});
  }).catch(function(){var a=$('#eq-entrar');if(a)a.hidden=false;});
  var s=$('#eq-sair');if(s)s.onclick=function(){j('/api/login',{method:'DELETE'}).catch(function(){}).then(function(){location.href='/equipe/';});};
})();
