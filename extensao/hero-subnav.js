/* HERO: uma faixa de subabas no cabeçalho, com as ações reais preservadas nos módulos.
   Os botões visíveis encaminham cliques aos controles originais (delegação e permissões intactas). */
(function(){
  'use strict';
  var host=document.getElementById('hero-area-header-tabs');
  if(!host)return;
  var specs=[
    ['panel-pront','.hero-v53-tabs',function(p){return p.getAttribute('aria-labelledby')==='tab-processo'?'Processo':'Prontuário';}],
    ['panel-pauta','.gx-modos','Pauta'],
    ['panel-min','.hero-review-view-tabs','Corretor'],
    ['panel-dil','.gx-modos','Diligências'],
    ['panel-del','.gx-modos','Notificações']
  ],source=null,signature='',queued=false;
  function buttons(el){return el?Array.from(el.querySelectorAll(':scope > button')).filter(function(b){return !b.hidden;}):[];}
  function sync(){
    queued=false;
    var next=null,label='';
    for(var i=0;i<specs.length;i++){
      var sp=specs[i],p=document.getElementById(sp[0]);
      if(p&&!p.hidden&&(!sp[3]||sp[3](p))){next=p.querySelector(sp[1]);label=typeof sp[2]==='function'?sp[2](p):sp[2];break;}
    }
    var bs=buttons(next);
    if(!bs.length)next=null;
    if(source&&source!==next){source.classList.remove('hero-subnav-source');source.removeAttribute('data-hero-subnav-mounted');}
    source=next;
    if(!source){host.hidden=true;host.replaceChildren();signature='';return;}
    var key=JSON.stringify([label,bs.map(function(b){return [b.textContent,b.getAttribute('aria-selected'),b.disabled,b.title,b.getAttribute('aria-controls')];})]);
    if(key!==signature){
      var focus=host.contains(document.activeElement)?Number(document.activeElement.dataset.heroSubtab):-1;
      host.replaceChildren();
      bs.forEach(function(b,i){
        var proxy=document.createElement('button');proxy.type='button';proxy.dataset.heroSubtab=String(i);
        proxy.setAttribute('role','tab');proxy.setAttribute('aria-selected',b.getAttribute('aria-selected')||'false');
        if(b.hasAttribute('aria-controls'))proxy.setAttribute('aria-controls',b.getAttribute('aria-controls'));
        proxy.textContent=b.textContent;proxy.disabled=b.disabled;proxy.title=b.title;
        proxy.tabIndex=proxy.getAttribute('aria-selected')==='true'?0:-1;
        host.appendChild(proxy);
      });
      signature=key;host.setAttribute('aria-label',label+' · subabas');
      if(focus>=0&&host.children[focus]&&!host.children[focus].disabled)host.children[focus].focus({preventScroll:true});
    }
    host.hidden=false;source.classList.add('hero-subnav-source');source.setAttribute('data-hero-subnav-mounted','true');
  }
  function schedule(){if(!queued){queued=true;queueMicrotask(sync);}}
  host.addEventListener('click',function(e){var b=e.target.closest('[data-hero-subtab]');if(!b||b.disabled)return;var real=buttons(source)[Number(b.dataset.heroSubtab)];if(real&&!real.disabled)real.click();schedule();});
  host.addEventListener('keydown',function(e){
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    var all=Array.from(host.children).filter(function(b){return !b.disabled;});if(!all.length)return;
    var i=all.indexOf(document.activeElement),n=e.key==='Home'?0:e.key==='End'?all.length-1:(i+(e.key==='ArrowLeft'?-1:1)+all.length)%all.length;
    e.preventDefault();all[n].focus();all[n].click();
  });
  var obs=new MutationObserver(schedule);
  specs.forEach(function(sp){var p=document.getElementById(sp[0]);if(p)obs.observe(p,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','aria-selected','aria-labelledby','disabled','title']});});
  sync();
})();
