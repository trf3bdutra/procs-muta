/* Collectio: editor principal, modelos e parágrafos, sobre a mesma fonte canônica. */
(function(){
 if(!window.VDM_COLLECTIO)return;
 var D=document, nav=D.getElementById('cmp-nav');
 if(nav){
  nav.setAttribute('aria-label','Seções do Collectio');
  nav.innerHTML='<div class="cn-in"><button type="button" class="cn-b" data-ct-view="pecas">Editor</button><button type="button" class="cn-b" data-ct-view="mod">Modelos</button><button type="button" class="cn-b" data-ct-view="par">Parágrafos</button><button type="button" class="cn-b" data-ct-manage>Gerenciar banco</button></div>';
 }
 function sync(){var sub=D.querySelector('#x-sub [aria-selected=true]'),v=sub&&sub.getAttribute('data-s')||'pecas';
  D.querySelectorAll('[data-ct-view]').forEach(function(b){b.setAttribute('aria-current',String(b.getAttribute('data-ct-view')===v));});
  var m=D.querySelector('[data-ct-manage]');if(m)m.hidden=!(window.CMT_ACESSO&&window.CMT_ACESSO().editor);
 }
 function open(v){window.VDM_irEditorial(v);sync();}
 function initial(){var p=new URLSearchParams(location.hash.slice(1)),s=p.get('s');if(/^#(?:mod|par|pec|dir|nor)=/.test(location.hash))return;open(['pecas','mod','par'].includes(s)?s:'pecas');}
 if(nav)nav.addEventListener('click',function(e){var b=e.target.closest('[data-ct-view],[data-ct-manage]');if(!b)return;
  if(b.hasAttribute('data-ct-manage')){if(window.CMT_ACESSO&&window.CMT_ACESSO().editor&&typeof edAbrir==='function')edAbrir();return;}
  var v=b.getAttribute('data-ct-view');if(location.hash!=='#v=edit&s='+v)history.replaceState(null,'','#v=edit&s='+v);open(v);
 });
 D.addEventListener('click',function(e){if(e.target.closest('#x-sub button'))setTimeout(sync,0);});
 D.addEventListener('cmt-acesso',function(){sync();});window.addEventListener('hashchange',function(){if(!/^#(?:mod|par|pec|dir|nor)=/.test(location.hash))initial();});
 initial();sync();
})();
