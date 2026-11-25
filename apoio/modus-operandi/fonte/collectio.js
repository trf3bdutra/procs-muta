/* Collectio: gestão dos bancos; Minutário e redação de casos continuam no Compendium. */
(function(){
 if(!window.VDM_COLLECTIO)return;
 var D=document, nav=D.getElementById('cmp-nav');
 if(nav){
  nav.setAttribute('aria-label','Seções do Collectio');
  nav.innerHTML='<div class="cn-in"><button type="button" class="cn-b" data-ct-view="mod">Modelos</button><button type="button" class="cn-b" data-ct-view="par">Parágrafos</button><button type="button" class="cn-b" data-ct-manage hidden>Editar banco</button></div>';
 }
 function sync(){var sub=D.querySelector('#x-sub [aria-selected=true]'),v=sub&&sub.getAttribute('data-s')||'mod';
  D.querySelectorAll('[data-ct-view]').forEach(function(b){b.setAttribute('aria-current',String(b.getAttribute('data-ct-view')===v));});
  var m=D.querySelector('[data-ct-manage]');if(m)m.hidden=!(window.CMT_ACESSO&&window.CMT_ACESSO().editor);
 }
 function open(v){window.VDM_irEditorial(v==='par'?'par':'mod');sync();}
 function initial(){var p=new URLSearchParams(location.hash.slice(1)),s=p.get('s');open(s==='par'||/^#par=/.test(location.hash)?'par':'mod');}
 if(nav)nav.addEventListener('click',function(e){var b=e.target.closest('[data-ct-view],[data-ct-manage]');if(!b)return;
  if(b.hasAttribute('data-ct-manage')){if(window.CMT_ACESSO&&window.CMT_ACESSO().editor&&window.VDM_abrirEditorBanco){var cur=nav.querySelector('[data-ct-view][aria-current=true]');window.VDM_abrirEditorBanco(cur?cur.dataset.ctView:'mod');}return;}
  var v=b.getAttribute('data-ct-view');history.replaceState(null,'','#v=edit&s='+v);open(v);
 });
 D.addEventListener('cmt-acesso',function(){initial();sync();});window.addEventListener('hashchange',initial);
 initial();sync();
})();
