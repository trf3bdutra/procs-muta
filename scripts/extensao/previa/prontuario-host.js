/* Hospeda o MESMO prontuário compilado da HERO, não uma cópia de seus campos. */
(function(W){
 'use strict';
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dg=s=>String(s||'').replace(/\D/g,'');
 function html(cnj,opts){opts=opts||{};const n=dg(cnj);if(n.length!==20)return '<p>CNJ inválido.</p>';
 const u='/extensao/previa/painel/web.html?cnj='+n+'&modo='+(opts.modo==='pro'?'pro':'tri')+(opts.leitura?'&leitura=1':'');
 return '<iframe class="cmt-hero-frame" title="Prontuário Universal HERO18810" data-cnj="'+n+'" data-matriz="'+esc(JSON.stringify(opts.matriz||{}))+'" src="'+esc(u)+'" loading="lazy" style="display:block;width:100%;height:min(780px,85vh);min-height:440px;border:1px solid #d5d9de;background:transparent;border-radius:6px"></iframe>';}
 function abrir(cnj,opts){const d=document.createElement('dialog');d.style.cssText='width:min(96vw,850px);max-height:94vh;border:1px solid #adb5bd;border-radius:8px;padding:12px;background:Canvas;color:CanvasText;';d.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><b>Prontuário Universal · HERO18810</b><button type="button" data-fechar aria-label="Fechar">×</button></div>'+html(cnj,opts);
 document.body.append(d);d.querySelector('[data-fechar]').onclick=async()=>{const f=d.querySelector('iframe');try{const g=f&&f.contentWindow.MutaGabinete;if(g)await g.gravarPendente();d.close();}catch(e){alert('Não foi possível gravar. Confira o prontuário antes de fechar.');}};d.addEventListener('close',()=>d.remove(),{once:true});d.addEventListener('cancel',e=>{e.preventDefault();d.querySelector('[data-fechar]').click();});d.showModal();}
 W.CMTUniversal={html,abrir};
})(window);
