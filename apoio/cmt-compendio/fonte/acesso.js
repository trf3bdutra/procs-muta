/* ================= ACESSO: um só Compêndio, com modo padrão e modo avançado =================
   O modo avançado (Enunciados, Repertório, Enciclopédia e atalho para o Monitor) e o editor dependem do login da Pauta da equipe
   e de apoio/acessos.json; o conteúdo da Enciclopédia só vem do servidor (/api/compendio) para quem tem acesso. */
(function(){
  var SITE=/^https?:$/.test(location.protocol);
  var AC={usuario:'',avancado:false,editor:false,ok:false,enc:0},MODO='avancado';
  try{MODO=localStorage.getItem('cmt-modo')||'avancado';}catch(e){}
  function q(s){return document.querySelector(s);}
  function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function api(u,o){o=o||{};o.credentials='same-origin';o.cache='no-store';if(o.body)o.headers={'Content-Type':'application/json'};
    return fetch(u,o).then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok)throw new Error(j.erro||('HTTP '+r.status));return j;});});}
  function avOn(){return AC.avancado&&MODO==='avancado';}
  function aplica(){var av=avOn();document.documentElement.classList.toggle('modo-av',av);
    Array.prototype.forEach.call(document.querySelectorAll('[data-av]'),function(el){el.hidden=!av;var w=el.parentElement;if(w&&w.classList.contains('tabw'))w.hidden=!av;});
    var cur=q('.tab[aria-selected="true"]');if(!av&&cur&&cur.hasAttribute('data-av')){var b=q('.tab[data-v="ement"]');if(b)b.click();}
    var ed0=!!window.VDM_EDITOR;window.VDM_EDITOR=!!AC.editor||!!window.VDM_PAGINA_EDITOR;
    if(ed0!==window.VDM_EDITOR){try{var v=function(id){var x=q(id);return x&&!x.hidden;};if(v('#v-edit')&&typeof xRender==='function')xRender();if(v('#v-ement')&&typeof EM!=='undefined'){if(EM.sub==='mod'&&typeof mRender==='function')mRender();else if(EM.sub==='par'&&typeof pRender==='function')pRender();}}catch(x){}}
    if(av&&!AC.enc){AC.enc=1;api('/api/compendio').then(function(j){if(window.VDM_encDados)window.VDM_encDados(j.enciclopedia);}).catch(function(x){AC.enc=0;if(window.VDM_encDados)window.VDM_encDados(null,x.message);});}
    chip();if(window.VDM_marcaNav)window.VDM_marcaNav();}
  function chip(){var c=q('#ac-chip');if(!c)return;
    if(!SITE){c.innerHTML='<span class="ac-off" title="Aberto como arquivo: o modo avançado e o editor funcionam no site do gabinete, com login">modo padrão</span>';return;}
    if(!AC.ok){c.innerHTML='';return;}
    if(!AC.usuario){c.innerHTML='<button class="ac-btn" data-acentra title="Entrar com o login da Pauta da equipe">Entrar</button>';return;}
    var h='<span class="ac-u" title="Conectado como '+e(AC.usuario)+'">'+e(AC.usuario)+'</span>';
    if(AC.avancado&&!window.VDM_PAGINA_EDITOR)h+='<span class="ac-seg" role="group" aria-label="Modo do Compêndio"><button data-acmodo="padrao" aria-pressed="'+(MODO!=='avancado')+'">Padrão</button><button data-acmodo="avancado" aria-pressed="'+(MODO==='avancado')+'">Avançado</button></span>';
    if(AC.editor&&!window.VDM_PAGINA_EDITOR)h+='<a class="ac-btn" href="/editor/">Editor</a>';
    if(window.VDM_PAGINA_EDITOR)h+='<a class="ac-btn" href="/compendio/">Compêndio</a>';
    c.innerHTML=h+'<button class="ac-sair" data-acsai title="Sair">Sair</button>';}
  function dlgLogin(){var o=q('#ac-dlg');if(!o){o=document.createElement('div');o.id='ac-dlg';o.className='ac-dlg';document.body.appendChild(o);}
    o.hidden=false;o.innerHTML='<form class="ac-dlgc" role="dialog" aria-label="Entrar"><h3>Entrar</h3><p class="meta">O mesmo nome e a mesma senha da Pauta da equipe.</p><label><span>Nome</span><select id="ac-nome" required><option value="">Carregando…</option></select></label><label><span>Senha</span><input id="ac-senha" type="password" autocomplete="current-password" required></label><p class="ac-er" id="ac-er" hidden></p><div class="ac-acts"><button class="btn" type="submit">Entrar</button><button class="btn ghost" type="button" data-acfecha>Cancelar</button></div></form>';
    api('/api/equipe').then(function(j){var ult='';try{ult=localStorage.getItem('eq_ultimo')||'';}catch(x){}q('#ac-nome').innerHTML='<option value="">Escolha o seu nome</option>'+(j.equipe||[]).map(function(n){return '<option'+(n===ult?' selected':'')+'>'+e(n)+'</option>';}).join('');if(ult)q('#ac-senha').focus();}).catch(function(x){q('#ac-nome').innerHTML='<option value="">'+e(x.message)+'</option>';});
    o.querySelector('form').addEventListener('submit',function(ev){ev.preventDefault();var er=q('#ac-er');er.hidden=true;var n=q('#ac-nome').value;
      api('/api/login',{method:'POST',body:JSON.stringify({usuario:n,senha:q('#ac-senha').value})}).then(function(){try{localStorage.setItem('eq_ultimo',n);}catch(x){}o.hidden=true;return verifica();}).catch(function(x){er.textContent=x.message;er.hidden=false;});});}
  function verifica(){if(!SITE){AC.ok=true;aplica();document.dispatchEvent(new CustomEvent('cmt-acesso',{detail:AC}));return Promise.resolve(AC);}
    return api('/api/acesso').then(function(j){AC.usuario=j.usuario||'';AC.avancado=!!j.avancado;AC.editor=!!j.editor;}).catch(function(){AC.usuario='';AC.avancado=false;AC.editor=false;})
      .then(function(){AC.ok=true;aplica();document.dispatchEvent(new CustomEvent('cmt-acesso',{detail:AC}));return AC;});}
  window.CMT_ACESSO=function(){return AC;};window.CMT_verifica=verifica;window.CMT_login=dlgLogin;window.CMT_SITE=SITE;
  document.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('[data-acentra],[data-acmodo],[data-acsai],[data-acfecha]');
    if(b){if(b.hasAttribute('data-acentra'))dlgLogin();else if(b.hasAttribute('data-acfecha'))q('#ac-dlg').hidden=true;
      else if(b.hasAttribute('data-acmodo')){MODO=b.getAttribute('data-acmodo');try{localStorage.setItem('cmt-modo',MODO);}catch(x){}aplica();}
      else if(b.hasAttribute('data-acsai'))api('/api/login',{method:'DELETE'}).catch(function(){}).then(function(){AC.enc=0;return verifica();});return;}
    if(!window.VDM_PAGINA_EDITOR){var x=ev.target.closest&&ev.target.closest('[data-edmod],[data-edpar],[data-edpec]');
      if(x){ev.preventDefault();var col=x.hasAttribute('data-edmod')?'mod':x.hasAttribute('data-edpar')?'par':'pec';location.href='/editor/#'+col+'='+encodeURIComponent(x.getAttribute('data-ed'+col));}}});
  aplica();verifica();
})();
