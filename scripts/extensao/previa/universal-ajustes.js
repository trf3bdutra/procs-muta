/* Ajustes da prévia universal: usa as preferências e os eventos reais do HERO.
   Nenhuma alteração de autorização, gravação ou dados do processo. */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id);},b=$('pv-ajustes');
  if(!b)return;
  var dlg=document.createElement('dialog');
  dlg.id='pv-ajustes-dialog';dlg.className='dlg pv-ajustes-dialog';
  dlg.setAttribute('aria-labelledby','pv-ajustes-titulo');
  dlg.innerHTML='<div class="pv-ajustes-head"><div><h2 id="pv-ajustes-titulo">Ajustes</h2><small class="muted">Preferências do HERO18810 neste navegador</small></div><button type="button" class="btn line sm" id="pv-ajustes-fechar" aria-label="Fechar ajustes">×</button></div>'+
    '<section class="pv-ajustes-sec"><h3>Aparência</h3><label class="pv-ajustes-select"><span>Tema do painel</span><select id="pv-ajustes-tema"><option value="claro">Claro</option><option value="escuro">Escuro</option></select></label></section>'+
    '<section class="pv-ajustes-sec"><h3>Integração com o PJe</h3><label class="pv-ajustes-row"><span><b>Acompanhar o PJe</b><small>Abre o prontuário do processo selecionado.</small></span><input type="checkbox" id="pv-ajustes-seguir"></label><label class="pv-ajustes-row"><span><b>Trocar de aba automaticamente</b><small>Alterna entre Autos e Minutário conforme a tela do PJe.</small></span><input type="checkbox" id="pv-ajustes-aba"></label><label class="pv-ajustes-row"><span><b>Preencher campos automaticamente</b><small>Usa a leitura dos autos para preencher campos vazios; não substitui dados gravados.</small></span><input type="checkbox" id="pv-ajustes-auto"></label></section>'+
    '<section class="pv-ajustes-sec" id="pv-ajustes-gestao" hidden><h3>Gestão</h3><button type="button" class="pv-ajustes-control btn line" id="pv-ajustes-controle"><span><b>Controle</b><small>Prazos, avisos e catálogo de etiquetas</small></span><span aria-hidden="true">›</span></button></section>'+
    '<div class="pv-ajustes-foot"><small class="muted">As preferências são aplicadas imediatamente. A gravação real continua bloqueada no modo Universal.</small><button type="button" class="btn solid sm" id="pv-ajustes-ok">Concluir</button></div>';
  document.body.appendChild(dlg);
  var tema=$('pv-ajustes-tema'),seguir=$('pv-ajustes-seguir'),aba=$('pv-ajustes-aba'),auto=$('pv-ajustes-auto');
  function gestorAutenticado(){var S=window.MutaSessao,u=S&&S.estado?S.estado():null;return !!(u&&u.estado==='on'&&u.gestor);}
  function sync(){
    var gestao=$('pv-ajustes-gestao'),ctl=$('pv-ajustes-controle'),permitido=gestorAutenticado();gestao.hidden=!permitido;ctl.disabled=!permitido;
    var s=$('pje-seguir'),a=$('pje-aba'),A=window.MutaAutos,T=window.MutaTema;
    tema.value=T?T.atual():document.documentElement.dataset.tema||'escuro';tema.disabled=!$('pje-tema');
    seguir.checked=!!(s&&s.checked);seguir.disabled=!s;
    aba.checked=!!(a&&a.checked);aba.disabled=!a||!seguir.checked;
    auto.disabled=!(A&&A.autoLigado&&A.autoLigar);if(!auto.disabled)auto.checked=A.autoLigado();
  }
  function toggle(id,input){var el=$(id);if(el&&el.checked!==input.checked)el.click();sync();}
  seguir.addEventListener('change',function(){toggle('pje-seguir',seguir);});
  aba.addEventListener('change',function(){toggle('pje-aba',aba);});
  tema.addEventListener('change',function(){var T=window.MutaTema,t=$('pje-tema');if(T&&t&&T.atual()!==tema.value)t.click();sync();});
  auto.addEventListener('change',function(){var A=window.MutaAutos;if(A&&A.autoLigar)A.autoLigar(auto.checked);sync();});
  b.addEventListener('click',function(){sync();if(!dlg.open)dlg.showModal();});
  function fechar(){if(dlg.open)dlg.close();}
  $('pv-ajustes-fechar').addEventListener('click',fechar);
  $('pv-ajustes-ok').addEventListener('click',fechar);
  $('pv-ajustes-controle').addEventListener('click',function(){if(!gestorAutenticado()){sync();return;}if(window.MutaAbas){fechar();window.MutaAbas.ir('ctl');}});
  if(window.MutaSessao&&window.MutaSessao.ouvir)window.MutaSessao.ouvir(sync);
  sync();
  dlg.addEventListener('close',function(){var p=$('tu-sino');if(p)p.focus();});
  document.addEventListener('change',function(e){if(dlg.open&&(e.target.id==='pje-seguir'||e.target.id==='pje-aba'))sync();});
  Array.from(document.querySelectorAll('#pv-nav-main button')).forEach(function(t){
    var l=t.querySelector('.nav-text b');if(l){var n=l.textContent.trim();t.title=n;t.setAttribute('aria-label',n);}
  });
  document.body.classList.add('pv-ajustes-ready');
})();
