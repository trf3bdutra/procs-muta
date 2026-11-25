/* Prontuário universal · Triagem e sinalizações (entra depois de universal-julgamento.js, no mesmo ponto do gabinete.js).
   - Acompanhamento: card expansível no alto da Triagem, antes do roteiro, com o encaminhamento (próximo ato, destino,
     seleção prévia) e o acompanhamento (responsável, próxima ação). Os campos são os de sempre; só mudam de lugar.
   - Sinalizações: saem do cartão e abrem numa janela móvel (arrastar pelo título), que fica aberta entre as gravações.
   - Registro no acervo: vai para dentro de "Autuação e contexto". */
(function(){
  if(!document.getElementById('pv-tri-css')){var st=document.createElement('style');st.id='pv-tri-css';st.textContent=
    '.pv-acomp{margin:0 0 10px;padding:0}.pv-acomp>summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;font-weight:600}'+
    '.pv-acomp>summary::-webkit-details-marker{display:none}.pv-acomp>summary small{font-weight:400;opacity:.75;margin-left:6px}.pv-acomp>summary::after{content:"⌄";opacity:.6}.pv-acomp[open]>summary::after{content:"⌃"}'+
    '.pv-acomp .pv-acomp-b{padding:0 12px 12px}.pv-acomp .pv-tri-enc{border:0;box-shadow:none;padding:0;margin:0}.pv-acomp .pv-followup{margin-top:10px}'+
    '.pv-sn-bar{display:flex;justify-content:flex-end;margin:6px 0 2px}.pv-sn-bar button{font:inherit;font-size:12px;padding:4px 10px;border-radius:14px;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer;opacity:.85}'+
    '.pv-sn-bar button b{color:#d9822b;margin-left:4px}'+
    '.pv-sn-dlg{position:fixed;margin:0;z-index:50;width:min(440px,92vw);max-height:75vh;overflow:auto;padding:0;border-radius:10px;border:1px solid rgba(127,127,127,.4);box-shadow:0 12px 32px rgba(0,0,0,.35);background:var(--bg,#14202b);color:inherit}'+
    '.pv-sn-dlg .pv-sn-h{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;cursor:move;user-select:none;border-bottom:1px solid rgba(127,127,127,.25);position:sticky;top:0;background:inherit}'+
    '.pv-sn-dlg .pv-sn-h button{font:inherit;background:transparent;border:0;color:inherit;font-size:18px;cursor:pointer;line-height:1}.pv-sn-dlg .pv-sn-c{padding:8px 12px 12px}'+
    '.pv-reg{margin-top:10px}';document.head.appendChild(st);}
  var base=render0;
  render0=function(){
    base();
    var top=caixa.querySelector('.pc.pm');if(!top)return;
    /* sinalizações: do cartão para a janela */
    var sn=top.querySelector('details.pm-sn'),fol=null,n=0;
    if(sn){
      var body=sn.querySelector('.sn-b'),sig=body&&body.querySelector('#g-sn');fol=body&&body.querySelector('.pv-followup');
      if(fol)fol.remove();
      var reg=[];if(body)[].slice.call(body.children).forEach(function(c){if(c!==sig)reg.push(c);});
      var aut=top.querySelector('details.pm-aut1');
      if(aut&&reg.length){var r=document.createElement('section');r.className='pv-reg';r.innerHTML='<h4 class="pm-mer-h">Registro no acervo</h4>';reg.forEach(function(c){r.appendChild(c);});aut.appendChild(r);}
      n=sig?sig.querySelectorAll('.sn-i:not(.ok)').length:0;
      var bar=document.createElement('div');bar.className='pv-sn-bar';
      bar.innerHTML='<button type="button" data-pv-sn aria-haspopup="dialog" title="Sinalizações: pendências, avisos e intercorrências">⚑ Sinalizações'+(n?'<b>'+n+' em aberto</b>':'')+'</button>';
      sn.replaceWith(bar);
      var d=document.createElement('dialog');d.id='pv-sn-dlg';d.className='pv-sn-dlg';d.setAttribute('aria-label','Sinalizações');
      d.innerHTML='<div class="pv-sn-h" data-pv-sn-arrastar><b>Sinalizações</b><button type="button" data-pv-sn-x aria-label="Fechar">×</button></div><div class="pv-sn-c"></div>';
      if(sig)d.querySelector('.pv-sn-c').appendChild(sig);
      caixa.appendChild(d);
      var pos=G.pvSnPos||{x:Math.max(8,(window.innerWidth-440)/2),y:80};d.style.left=pos.x+'px';d.style.top=pos.y+'px';
      if(G.pvSnAb)try{d.show();}catch(e){d.setAttribute('open','');}
    }
    /* Triagem: Acompanhamento antes do roteiro */
    if(G.aba==='Processo'&&G.rot==='tri'){
      var enc=caixa.querySelector('#pv-tri-enc'),rtop=caixa.querySelector('.rt-em-proc .rt-top')||caixa.querySelector('.rt-em-proc');
      if(enc&&rtop){
        var ac=document.createElement('details');ac.className='card pv-acomp';ac.id='pv-acomp';if(G.pvAcAb)ac.open=true;
        var dest=destGrav()||'destino a definir';
        ac.innerHTML='<summary>Acompanhamento<small>'+esc(dest)+(S(V('triagem','Seleção Prévia'))?' · seleção prévia: '+esc(V('triagem','Seleção Prévia')):'')+'</small></summary><div class="pv-acomp-b"></div>';
        var b=ac.querySelector('.pv-acomp-b');b.appendChild(enc);if(fol)b.appendChild(fol);
        rtop.parentNode.insertBefore(ac,rtop);
      }
    }
  };
  caixa.addEventListener('toggle',function(e){if(e.target&&e.target.id==='pv-acomp')G.pvAcAb=e.target.open;},true);
  /* "Editar na Triagem" (cartão) abre o Acompanhamento antes de rolar até o encaminhamento */
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-pv-enc]'))G.pvAcAb=true;},true);
  caixa.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-pv-sn],[data-pv-sn-x]');if(!b)return;e.preventDefault();
    var d=$('pv-sn-dlg');if(!d)return;
    if(b.hasAttribute('data-pv-sn-x')){G.pvSnAb=false;d.close();return;}
    G.pvSnAb=!G.pvSnAb;if(G.pvSnAb){try{d.show();}catch(x){d.setAttribute('open','');}}else d.close();
  });
  /* arrastar a janela pelo título; a posição fica para as próximas aberturas */
  caixa.addEventListener('pointerdown',function(e){
    var h=e.target.closest&&e.target.closest('[data-pv-sn-arrastar]');if(!h||e.target.closest('button'))return;
    var d=h.closest('dialog'),r=d.getBoundingClientRect(),ox=e.clientX-r.left,oy=e.clientY-r.top;e.preventDefault();
    function mv(ev){var x=Math.min(Math.max(0,ev.clientX-ox),window.innerWidth-60),y=Math.min(Math.max(0,ev.clientY-oy),window.innerHeight-40);d.style.left=x+'px';d.style.top=y+'px';G.pvSnPos={x:x,y:y};}
    function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);}
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
  });
})();
