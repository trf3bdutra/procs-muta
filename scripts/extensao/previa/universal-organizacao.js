/* 0.73 · organização do prontuário universal (só apresentação; nada grava nem muda permissões):
   sinalizações e urgência na barra do prontuário (0.73.2; antes numa linha própria), Solicitações só com as categorias que têm registro (na vista "Todas")
   e atalho do aviso "Autos ainda não lidos" para a aba Autos. */
(function(){
 var ROT={pd:'pendências',ic:'intercorrências',av:'avisos'};
 function organizar(){
  /* anotações vazias: uma linha tracejada com "+ registrar"; clicar abre a edição */
  caixa.querySelectorAll('.hero-ann-card').forEach(function(c){var t=c.querySelector('.hero-ann-text');var vazia=!!(t&&t.classList.contains('muted')&&/^não registrad/i.test(t.textContent.trim()));c.classList.toggle('pv-ann-vazia',vazia);
   if(vazia&&!c.__pv){c.__pv=1;c.addEventListener('click',function(e){if(e.target.closest('button'))return;var ed=c.querySelector('.hero-ann-tools button[title^="Editar"]');if(ed)ed.click();});}});
  /* Etapas contém os contadores; o cabeçalho usa os indicadores do núcleo da extensão. */
  var hd=caixa.querySelector('.hero-header-nav');
  /* Faces por setas, sem título no display; descrição acessível permanece nas setas. */
  var lb=hd&&hd.querySelector('.hero-face-label');if(lb){lb.hidden=true;lb.textContent='';}
  caixa.querySelectorAll('.pv3-solicitacoes').forEach(function(sb){
   sb.classList.toggle('pv-sol-todas',(heroTopo.tipoSol||'Todas')==='Todas');
   sb.querySelectorAll('.hero-sol-panel').forEach(function(p){var t=p.querySelector('textarea'),vazio=!p.querySelector('.hero-sol-item')&&!(t&&String(t.value||'').trim());if(vazio)p.setAttribute('data-pv-vazio','');else p.removeAttribute('data-pv-vazio');});
   var ps=sb.querySelector('.hero-sol-panels');if(ps&&!(ps.nextElementSibling&&ps.nextElementSibling.classList.contains('pv-sol-vazio'))){var v=document.createElement('p');v.className='muted pv-sol-vazio';v.textContent='Nenhuma solicitação registrada. Use “+ Solicitação” para registrar.';ps.after(v);}
  });
 }
 var _hop=heroOrganizarProntuario;
 heroOrganizarProntuario=function(){var r=_hop.apply(this,arguments);try{organizar();}catch(e){if(window.console)console.warn('[organização]',e);}return r;};
 window.MutaGabinete=window.MutaGabinete||{};
 window.MutaGabinete.irAutos=function(){G.aba='Autos';render();var c=caixa.querySelector('#g-lei');if(c)c.scrollIntoView({block:'start'});};
 caixa.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('.hero-sol-type,[data-au-ir]');if(!t)return;
  if(t.hasAttribute('data-au-ir')){e.preventDefault();e.stopImmediatePropagation();window.MutaGabinete.irAutos();return;}
  setTimeout(function(){var sb=t.closest('.pv3-solicitacoes');if(sb)sb.classList.toggle('pv-sol-todas',t.textContent.trim()==='Todas');},0);});
})();

/* 0.73.5: o Gerador (relatório e ementa pela ficha) sai do Minutário e entra na Produção do prontuário, depois do roteiro */
(function(){
 var GER={aberto:false};
 try{if(localStorage.getItem('hero18810:minModo')==='ger')localStorage.setItem('hero18810:minModo','cmp');}catch(e){}
 var _pm=producaoMinuta;
 var _pmN=0;producaoMinuta=function(){_pmN++;var h;try{h=_pm.apply(this,arguments);}finally{_pmN--;}if(_pmN)return h;return h+'<details class="gg pv-gerador" id="pv-gerador"'+(GER.aberto?' open':'')+'><summary><h4>Gerador</h4><span class="gn">relatório e ementa pela ficha · nada é gravado</span></summary><div class="pv-ger-corpo" id="pv-ger-app"></div></details>';};
 function pintarGer(){var g=caixa.querySelector('#pv-ger-app'),M=window.MutaGerador;if(!g||!GER.aberto)return;
  if(!M||!M.html){g.innerHTML='<p class="muted">Gerador indisponível.</p>';return;}
  try{g.innerHTML=M.html();if(window.MutaModelosHero&&window.MutaModelosHero.montarGerador)window.MutaModelosHero.montarGerador(g);ajustarGer(g);}catch(e){g.innerHTML='<p class="muted">Gerador indisponível: '+esc(e&&e.message||e)+'</p>';}}
 /* tipo de julgamento (Encaminhamento) e resultado (Julgamento) não se escolhem no Gerador: ele lê a ficha */
 function ajustarGer(g){g.querySelectorAll('.gr-l').forEach(function(l){if(l.querySelector('[data-gr-tipo],[data-gr-res]'))l.remove();});
  g.querySelectorAll('.gr-av').forEach(function(p){if(/^Sem resultado do voto na ficha/.test(p.textContent.trim()))p.innerHTML='Sem resultado na ficha: registre-o no painel Julgamento para completar a ementa (cabeçalho e item IV). <button type="button" class="lnk" data-pv-jg="">Ir para Julgamento</button>';});
  var cfg=g.querySelector('.gr-cfg');if(cfg&&!cfg.querySelector('.gr-l,.gr-av,select'))cfg.remove();}
 var _hop2=heroOrganizarProntuario;
 heroOrganizarProntuario=function(){var r=_hop2.apply(this,arguments);try{pintarGer();}catch(e){}return r;};
 caixa.addEventListener('toggle',function(e){if(e.target&&e.target.id==='pv-gerador'){GER.aberto=e.target.open;if(GER.aberto)pintarGer();}},true);
 caixa.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#pv-ger-app button');if(!b||!window.MutaGerador||!window.MutaGerador.acao)return;
  if(b.dataset.grIr){e.preventDefault();G.aba='Processo';G.rot='tri';render();if(window.MutaGabinete&&window.MutaGabinete.ir)window.MutaGabinete.ir(b.dataset.grIr);return;}
  if(window.MutaGerador.acao(b))pintarGer();});
 /* quem ainda pedir o Gerador do Minutário vem para cá */
 window.MutaGabinete=window.MutaGabinete||{};
 window.MutaGabinete.irGerador=function(){if(window.MutaAbas)window.MutaAbas.ir('pront');G.aba='Processo';G.rot='pro';GER.aberto=true;render();var d=caixa.querySelector('#pv-gerador');if(d){d.open=true;pintarGer();d.scrollIntoView({block:'start'});}};
 document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-mm="ger"]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();window.MutaGabinete.irGerador();},true);
})();
