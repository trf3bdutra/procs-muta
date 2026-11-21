
/* Modo Triagem · leitor de um Prontuário por vez sobre a lista na tela (↑ ↓ navegam, Enter marca triado e avança, Esc volta à lista) */
(function(){
  var LS='pr_triados', st={on:true,i:0,filtro:'todos'}, last='';
  function tri(){try{return JSON.parse(localStorage.getItem(LS)||'{}')}catch(e){return {}}}
  function setTri(m){try{localStorage.setItem(LS,JSON.stringify(m))}catch(e){}}
  function cards(){return [].slice.call(document.querySelectorAll('[data-tri-card]'));}
  function pend(c){var t=c.querySelector('.pr-pend textarea, textarea[placeholder*="falta"]'); return !!(t&&t.value.trim());}
  function lista(){var T=tri(), L=cards(); L.forEach(function(c){c.classList.toggle('pr-triado',!!T[c.dataset.triCard]);});
    if(st.filtro==='atriar') return L.filter(function(c){return !T[c.dataset.triCard];}); if(st.filtro==='pend') return L.filter(pend); return L;}
  function bar(){var L=cards(); if(!L.length){document.body.classList.remove('pr-leitor'); var b0=document.getElementById('pr-leitor-bar'); if(b0) b0.remove(); return null;}
    var b=document.getElementById('pr-leitor-bar'); var host=L[0].parentElement;
    if(!b){b=document.createElement('div'); b.id='pr-leitor-bar'; b.addEventListener('click',clique);}
    if(b.nextElementSibling!==L[0] && b.parentElement!==host) host.insertBefore(b,host.firstChild); else if(b.parentElement!==host) host.insertBefore(b,host.firstChild);
    return b;}
  function pintar(){var b=bar(); if(!b) return; var T=tri(), all=cards(), L=lista(), n=L.length;
    if(st.i>=n) st.i=Math.max(0,n-1);
    document.body.classList.toggle('pr-leitor',st.on);
    all.forEach(function(c){c.classList.remove('pr-atual');}); if(st.on&&L[st.i]) L[st.i].classList.add('pr-atual');
    var tri_n=all.filter(function(c){return T[c.dataset.triCard];}).length, pd=all.filter(pend).length;
    var h='<b>'+(st.on?(n?(st.i+1)+' de '+n:'nenhum'):all.length+' processos')+'</b><span class="s">· '+tri_n+' triados · '+pd+' com pendência</span>'+
      '<button data-l="ant" title="Anterior (↑)">‹</button><button data-l="prox" title="Próximo (↓)">›</button><button class="pri" data-l="ok" title="Marcar triado e avançar (Enter)">'+(L[st.i]&&T[L[st.i].dataset.triCard]?'Triado ✓':'Marcar triado')+'</button>'+
      '<span class="s">Mostrar:</span><button data-f="todos" class="'+(st.filtro==='todos'?'on':'')+'">todos</button><button data-f="atriar" class="'+(st.filtro==='atriar'?'on':'')+'">a triar</button><button data-f="pend" class="'+(st.filtro==='pend'?'on':'')+'">com pendência</button>'+
      '<button data-l="modo">'+(st.on?'Ver lista':'Um por vez')+'</button><span class="k">↑ ↓ navegam · Enter marca triado · Esc volta à lista</span>';
    var sig=h+st.i+st.on; if(b.__s!==sig){b.innerHTML=h; b.__s=sig;}
  }
  function ir(n){var L=lista(); if(!L.length) return; st.i=(st.i+n+L.length)%L.length; pintar(); var c=L[st.i]; if(c) c.scrollIntoView({block:'start'}); var b=document.getElementById('pr-leitor-bar'); if(b) b.scrollIntoView({block:'start'});}
  function marcar(){var L=lista(), c=L[st.i]; if(!c) return; var T=tri(); T[c.dataset.triCard]=new Date().toISOString(); setTri(T); if(st.filtro==='atriar') pintar(); else ir(1);}
  function clique(e){var l=e.target.closest('[data-l]'), f=e.target.closest('[data-f]');
    if(f){st.filtro=f.dataset.f; st.i=0; pintar(); return;}
    if(!l) return; var k=l.dataset.l; if(k==='ant') ir(-1); else if(k==='prox') ir(1); else if(k==='ok') marcar(); else if(k==='modo'){st.on=!st.on; pintar();}}
  document.addEventListener('keydown',function(e){ if(!cards().length||!st.on) return; if(e.target.closest&&e.target.closest('input,select,textarea,[contenteditable]')) return;
    if(e.key==='ArrowDown'){e.preventDefault(); ir(1);} else if(e.key==='ArrowUp'){e.preventDefault(); ir(-1);} else if(e.key==='Enter'){e.preventDefault(); marcar();} });
  setInterval(function(){var L=cards(), sig=L.map(function(c){return c.dataset.triCard;}).join(','); if(sig!==last){last=sig; st.i=0; st.on=true;} pintar();},700);
})();
