/* ===== Padrão comum das páginas do Compendium (Ementário, Minuta-Matriz, Modelos, Diretrizes e banco de trechos)
   Só forma: abertura de altura fixa (com o número da página ou o quadro "Já disponível"), exportações com rótulo na barra da
   Minuta-Matriz, trilho de filtros recolhível e filtros dos Modelos em lista com contagem. Nada aqui filtra, busca ou grava:
   os botões novos acionam os controles de sempre (botões, selects e campos que o ementario.js e o editorial_d.js já tratam),
   e tudo é refeito, sem duplicar, a cada vez que essas páginas se redesenham. ===== */
(function(){
  'use strict';
  var D=document,esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var nrm=function(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();};
  function por(h,html){if(h.__pa!==html){h.__pa=html;h.innerHTML=html;}}

  /* ---------- abertura ---------- */
  function slot(h){var d=null;for(var i=0;i<h.children.length;i++)if(h.children[i].classList.contains('pa-dir'))d=h.children[i];
    if(!d){d=D.createElement('div');d.className='pa-dir';var t=h.querySelector('.pg-t');if(t&&t.nextSibling)h.insertBefore(d,t.nextSibling);else h.appendChild(d);}return d;}
  function numero(c){var t=(c&&c.textContent||'').replace(/\s+/g,' ').trim(),m=/^([\d.]+)\s+de\s+([\d.]+)\s+(.+)$/.exec(t);
    if(!m)return t?'<p class="pa-l">'+esc(t)+'</p>':'';
    return '<p class="pa-n"><b>'+esc(m[1])+'</b>'+(m[1]!==m[2]?'<span> de '+esc(m[2])+'</span>':'')+'</p><p class="pa-l">'+esc(m[3].replace(/^([^·]*?)(\s*·|$)/,function(x,a,b){return a+(m[1]!==m[2]?' no filtro':'')+b;}))+'</p>';}
  function dev(x){var t=(x.textContent||'').replace(/\s+/g,' ').trim().replace(/^Em desenvolvimento\.\s*/i,''),i=t.search(/J[áa] dispon[íi]vel\s*:/i);
    var pre=i>=0?t.slice(0,i).trim():t,L=i>=0?t.slice(i).replace(/^J[áa] dispon[íi]vel\s*:\s*/i,'').replace(/\.\s*$/,'').split(/\s*;\s*/).filter(Boolean):[];
    return {pre:pre,itens:L.map(function(s){return s.charAt(0).toUpperCase()+s.slice(1);})};}
  /* data da última coleta na Base de Jurisprudência do TRF-3 (precedentes/jurisprudencia/MANIFESTO.json, gravada pelo build) */
  function coleta(){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(window.EMENT_COLETA||'');
    return m?'<p class="pa-c" title="'+(window.EMENT_COLETA_FONTE||'Base de Jurisprudência do TRF-3 (web.trf3.jus.br/jurisprudencia)')+'">'+(window.EMENT_COLETA_ROT||'Última coleta no TRF-3')+': <b>'+m[3]+'/'+m[2]+'/'+m[1]+'</b></p>':'';}
  /* seletor Relator / Turma do Ementário: o Compendium (julgados do Relator, os únicos usados como padrão) e o Collegium
     (demais gabinetes da Turma Regional de MS, só consulta) são páginas separadas, com bases separadas; o seletor troca de
     uma para a outra levando a busca, o modo (índice ou texto integral) e o tipo */
  function fonteSel(){var t=!!window.EMENT_FONTE;
    return '<div class="pa-fonte" role="group" aria-label="Base do ementário"><a href="/amicus/compendium/#v=ement" target="_top" data-fonte="relator"'+(t?'':' aria-current="page"')+' title="Julgados do Relator (Des. Fed. Carlos Muta): curados e série histórica — base dos padrões do gabinete">Relator</a>'+
      '<a href="/amicus/#collegium" target="_top" data-fonte="turma"'+(t?' aria-current="page"':'')+' title="Julgados da Turma Regional de MS (Relator e demais gabinetes) — consulta, não é padrão do gabinete">Turma</a></div>';}
  D.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('.pa-fonte a[data-fonte]');if(!a||a.getAttribute('aria-current')==='page'){if(a)e.preventDefault();return;}
    e.preventDefault();var q=D.getElementById('e-q'),qm=D.querySelector('input[name="e-qm"]:checked'),tp=D.querySelector('#e-tipo button[aria-pressed="true"]');
    var parts=window.VDM_ementQueryParts?window.VDM_ementQueryParts():null;var h=['v=ement'],v=parts?parts.join(' '):q&&q.value.trim(),t=tp&&tp.getAttribute('data-v');if(parts&&parts.length)h.push('qt='+encodeURIComponent(JSON.stringify(parts)));
    if(v)h.push('q='+encodeURIComponent(v));if(v&&qm&&qm.value==='ft')h.push('qm=ft');if(t==='Acórdão')h.push('t=A');else if(t==='Monocrática')h.push('t=M');
    /* a Turma (Collegium) é aba do /amicus: o recorte segue no endereço da aba; fora de iframe, a navegação é na própria janela */
    var hr=a.getAttribute('href'),dest=hr.split('#')[0]+'#'+(a.getAttribute('data-fonte')==='turma'?'collegium&':'')+h.join('&');try{(window.top||window).location.href=dest;}catch(er){location.href=dest;}});
  /* seletor de modo do Minutário (Minutário · Modelos · Parágrafos), no desenho do Relator/Turma do Ementário */
  function modoSel(){if(!window.VDM_minAtual)return '';var a=window.VDM_minAtual();if(['pecas','mod','par'].indexOf(a)<0)return '';
    return '<div class="pa-fonte pa-modo" role="group" aria-label="Modo do Minutário">'+[['pecas','Minutário','Estrutura da peça e folha de trabalho'],['mod','Modelos','Modelos do gabinete, matrizes incluídas'],['par','Parágrafos','Banco de parágrafos-padrão']].map(function(x){
      return '<a href="#v=edit&amp;s='+x[0]+'" data-xmodo="'+x[0]+'"'+(a===x[0]?' aria-current="page"':'')+' title="'+x[2]+'">'+x[1]+'</a>';}).join('')+(a==='pecas'?'<button type="button" data-dconfmin aria-controls="dk-conf" aria-expanded="false">Conformidade</button>':'')+'</div>';}
  D.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('.pa-modo a[data-xmodo]');if(!a)return;e.preventDefault();
    if(a.getAttribute('aria-current')!=='page'&&window.VDM_minModo)window.VDM_minModo(a.getAttribute('data-xmodo'));});
  function abertura(){
    D.querySelectorAll('.pg-h').forEach(function(h){h.classList.add('pa-ab');});
    var he=D.querySelector('#v-ement .pg-h');
    if(he){var c=D.querySelector('#v-ement #e-cnt');por(slot(he),fonteSel()+(c?numero(c)+coleta():''));}
    var hx=D.querySelector('#v-edit .pg-h');
    if(hx){var x=D.getElementById('x-dev'),s=slot(hx),tt=hx.querySelector('.pg-t'),kk=tt&&tt.querySelector('.dkk'),bd=tt&&tt.querySelector('.pa-dev');
      var on=x&&!x.hidden&&(x.textContent||'').trim(),dir=D.querySelector('#v-edit #x-alt.x-alt-dir:not([hidden])'),mod=/MODELOS/i.test((kk&&kk.textContent)||'');
      if(dir&&!on){/* Entradas rápidas: coluna própria do manual; abertura sem duplicação. */
        por(s,'');hx.classList.remove('pa-com-dev');if(bd)bd.remove();var pr0=tt&&tt.querySelector('.pa-pre');if(pr0)pr0.remove();if(typeof dkConf==='function')dkConf();return;}
      if(on){var v=dev(x);
        if(!bd&&kk){bd=D.createElement('span');bd.className='pa-dev';kk.parentNode.insertBefore(bd,kk.nextSibling);}
        if(bd){bd.textContent='Em desenvolvimento';bd.title=v.pre;}
        var pr=tt.querySelector('.pa-pre'),ds=D.getElementById('x-desc');if(!pr&&ds){pr=D.createElement('p');pr.className='pa-pre';ds.parentNode.insertBefore(pr,ds.nextSibling);}if(pr&&pr.textContent!==v.pre)pr.textContent=v.pre;
        var c3=D.querySelector('#v-edit #e-cnt');
        por(s,modoSel()+(mod?(c3?numero(c3):''):''));
        hx.classList.toggle('pa-com-dev',mod);}
      else{if(bd)bd.remove();var pr2=tt&&tt.querySelector('.pa-pre');if(pr2)pr2.remove();var c2=D.querySelector('#v-edit #e-cnt');por(s,modoSel()+(c2&&D.querySelector('#v-edit #e-layout')&&!D.querySelector('#x-banco[hidden] #e-layout')?numero(c2):''));hx.classList.remove('pa-com-dev');}if(typeof dkConf==='function')dkConf();}
  }

  /* ---------- Minuta-Matriz: exportações com rótulo ---------- */
  var ROT={'data-xcp':'Copiar peça','data-xdocx':'.docx','data-xpdf':'PDF','data-dconf':'Conferir'};
  function exportacoes(){D.querySelectorAll('#x-top .dexp button').forEach(function(b){for(var a in ROT)if(b.hasAttribute(a)&&!b.querySelector('.pa-tx')){var s=D.createElement('span');s.className='pa-tx';s.textContent=ROT[a];b.appendChild(s);}});}

  /* ---------- trilho: grupos recolhíveis ---------- */
  var REC={},VER={};
  function ativo(el){var b=el.querySelector('[aria-pressed="true"]');if(b){var tx=(b.querySelector('span')||b).textContent.trim();return /^tod[oa]s$/i.test(tx)?'':tx;}
    var sl=el.querySelector('select');if(sl&&sl.value){var o=sl.options[sl.selectedIndex];return (o&&o.textContent||'').replace(/\s*\(\d[\d.]*\)\s*$/,'').trim();}return '';}
  function trilho(){
    D.querySelectorAll('#e-aside > .lab').forEach(function(lab){
      var nome=nrm(lab.getAttribute('data-pa-n')||lab.textContent),cx=[],n=lab.nextElementSibling;
      while(n&&!n.classList.contains('lab')&&!n.classList.contains('mfil')){cx.push(n);n=n.nextElementSibling;}
      if(!lab.hasAttribute('data-pa-n')){lab.setAttribute('data-pa-n',lab.textContent.trim());lab.setAttribute('role','button');lab.tabIndex=0;}
      var fech=!!REC[nome],sel='';cx.forEach(function(c){c.classList.toggle('pa-rec',fech);if(!sel)sel=ativo(c);});
      lab.setAttribute('aria-expanded',String(!fech));
      var tx=lab.getAttribute('data-pa-n')+(fech&&sel?' · '+sel:'');if(lab.__tx!==tx){lab.__tx=tx;lab.innerHTML='<span>'+esc(lab.getAttribute('data-pa-n'))+'</span>'+(fech&&sel?'<em>'+esc(sel)+'</em>':'');}
    });
    /* Modelos: filtros em lista com contagem, no lugar das caixas de seleção (o select continua lá e é ele que filtra) */
    D.querySelectorAll('#e-aside .mfil label.msel').forEach(function(lb){
      var sl=lb.querySelector('select[data-mf]');if(!sl)return;var k=sl.getAttribute('data-mf'),cab=lb.querySelector('span');
      lb.classList.add('pa-msel');
      if(cab&&!cab.hasAttribute('data-pa-n')){cab.setAttribute('data-pa-n',cab.textContent.trim());cab.setAttribute('role','button');cab.tabIndex=0;cab.classList.add('pa-lab');}
      var nome='m:'+k,fech=!!REC[nome],O=[].slice.call(sl.options).map(function(o){var m=/^(.*?)\s*\((\d[\d.]*)\)\s*$/.exec(o.textContent.trim());return {v:o.value,t:m?m[1]:o.textContent.trim(),n:m?m[2]:''};});
      var cur=sl.value,todos=!!VER[k],vis=todos?O:O.slice(0,6);if(!todos&&cur&&!vis.some(function(o){return o.v===cur;}))vis=vis.concat(O.filter(function(o){return o.v===cur;}));
      if(cab){cab.setAttribute('aria-expanded',String(!fech));var sel=fech&&cur?O.filter(function(o){return o.v===cur;})[0]:null,tx=cab.getAttribute('data-pa-n')+(sel?'|'+sel.t:'');
        if(cab.__tx!==tx){cab.__tx=tx;cab.innerHTML='<span>'+esc(cab.getAttribute('data-pa-n'))+'</span>'+(sel?'<em>'+esc(sel.t)+'</em>':'');}}
      var ls=lb.parentNode.querySelector('.pa-lst[data-mf="'+k+'"]');if(!ls){ls=D.createElement('div');ls.className='glist pa-lst';ls.setAttribute('data-mf',k);lb.parentNode.insertBefore(ls,lb.nextSibling);}
      ls.classList.toggle('pa-rec',fech);
      por(ls,vis.map(function(o){return '<button type="button" data-pa-mf="'+esc(k)+'" data-v="'+esc(o.v)+'" aria-pressed="'+(o.v===cur)+'"><span>'+esc(o.v?o.t:'Todos')+'</span><small>'+esc(o.n)+'</small></button>';}).join('')+
        (O.length>6?'<button type="button" class="pa-mais" data-pa-ver="'+esc(k)+'">'+(todos?'Mostrar menos':'Mostrar todos ('+(O.length-1)+')')+'</button>':''));
    });
  }
  function alterna(nome){REC[nome]=!REC[nome];trilho();}
  D.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('#e-aside > .lab[data-pa-n], #e-aside .pa-lab, [data-pa-mf], [data-pa-ver]');if(!t)return;
    if(t.hasAttribute('data-pa-mf')){var sl=D.querySelector('#e-aside select[data-mf="'+t.getAttribute('data-pa-mf')+'"]');if(sl){sl.value=t.getAttribute('data-v');sl.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(agenda,0);}return;}
    if(t.hasAttribute('data-pa-ver')){var k=t.getAttribute('data-pa-ver');VER[k]=!VER[k];trilho();return;}
    e.preventDefault();
    if(t.classList.contains('pa-lab')){var s2=t.closest('label')&&t.closest('label').querySelector('select[data-mf]');if(s2)alterna('m:'+s2.getAttribute('data-mf'));return;}
    alterna(nrm(t.getAttribute('data-pa-n')));});
  D.addEventListener('keydown',function(e){if(e.key!=='Enter'&&e.key!==' ')return;var t=e.target.closest&&e.target.closest('#e-aside > .lab[data-pa-n], #e-aside .pa-lab');if(!t)return;e.preventDefault();t.click();});

  /* ---------- tudo junto, refeito quando as páginas se redesenham ---------- */
  var fila=0;
  function roda(){fila=0;try{abertura();exportacoes();trilho();}catch(er){console.warn('[padrão das páginas]',er);}}
  function agenda(){if(!fila)fila=(window.requestAnimationFrame||setTimeout)(roda);}
  try{new MutationObserver(agenda).observe(D.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','aria-pressed','aria-selected']});}catch(er){setInterval(roda,800);}
  D.addEventListener('cmt-acesso',agenda);D.addEventListener('change',agenda,true);
  agenda();
})();
