/* 0.73 · organização do prontuário universal (só apresentação; nada grava nem muda permissões):
   sinalizações e urgência na barra do prontuário (0.73.2; antes numa linha própria), Solicitações só com as categorias que têm registro (na vista "Todas")
   e atalho do aviso "Autos ainda não lidos" para a aba Autos. */
(function(){
 var ROT={pd:'pendências',ic:'intercorrências',av:'avisos'};
 function organizar(){
  /* anotações vazias: uma linha tracejada com "+ registrar"; clicar abre a edição */
  caixa.querySelectorAll('.hero-ann-card').forEach(function(c){var t=c.querySelector('.hero-ann-text');var vazia=!!(t&&t.classList.contains('muted')&&/^não registrad/i.test(t.textContent.trim()));c.classList.toggle('pv-ann-vazia',vazia);
   if(vazia&&!c.__pv){c.__pv=1;c.addEventListener('click',function(e){if(e.target.closest('button'))return;var ed=c.querySelector('.hero-ann-tools button[title^="Editar"]');if(ed)ed.click();});}});
  caixa.querySelectorAll('.hero-sn-ind .hero-sn-mini').forEach(function(b){if(b.querySelector('.pv-snr'))return;var k=Object.keys(ROT).filter(function(x){return b.classList.contains(x);})[0];if(!k)return;var s=document.createElement('span');s.className='pv-snr';s.textContent=ROT[k];b.append(s);});
  var u=caixa.querySelector('.hero-urg-short');if(u&&!u.querySelector('.pv-snr')){var s=document.createElement('span');s.className='pv-snr';s.textContent='urgência';u.append(s);}
  /* sinalizações e urgência numa linha própria, abaixo de Encaminhamento | Monitoramento */
  /* sinalizações e urgência na barra do prontuário (ao lado das setas e da fase); o card abre logo abaixo dela */
  var hd=caixa.querySelector('.hero-header-nav'),ind=caixa.querySelector('.hero-sn-ind');
  if(hd&&ind&&u&&!hd.querySelector('.pv-sn-row')){var row=document.createElement('div');row.className='pv-sn-row';row.append(ind,u);hd.append(row);}
  var pane=caixa.querySelector('#hero-dock-pane-sinalizacoes');if(hd&&pane&&hd.nextElementSibling!==pane)hd.after(pane);
  /* faces por setas: o nome da face atual fica visível ao lado da fase */
  var lb=hd&&hd.querySelector('.hero-face-label');if(lb){lb.hidden=false;lb.textContent=hd.getAttribute('aria-label')||'';}
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
