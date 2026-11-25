/* Vínculo de peças do PJe 1G ao processo do segundo grau. Nunca injeta documentos na cronologia 2G. */
(function(){
 'use strict';
 var K='Origem - Peças vinculadas 1G', S=function(v){return String(v==null?'':v).trim();},dg=function(v){return S(v).replace(/\D/g,'');},esc=function(v){return S(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
 function G(){return window.MutaGabinete;}
 function ref(){var g=G(),f=g&&g.fo()||{},v=S(g&&g.V('origem','Origem - Processo de referência')||f.Processo_Referencia||'');return dg(v).length===20?v:'';}
 function bloqueado(){var s=window.MutaSigilo;return !!(s&&(s.bloqueado()||s.sigiloso()));}
 function contexto(){var g=G(),r=ref(),p=window.MutaPje;return {pai:g&&g.cnj()||'',ref:r,aberto:!!(p&&p.primeiroGrau&&p.primeiroGrau()&&dg(p.processo())===dg(r)&&r)};}
 var C={key:'',docs:[],sel:{},busy:false,msg:'',confirm:false,search:''};
 function sync(){var x=contexto(),k=dg(x.pai)+'|'+dg(x.ref);if(k!==C.key){C={key:k,docs:[],sel:{},busy:false,msg:'',confirm:false,search:''};}return x;}
 function redraw(){if(G())G().render();}
 function linhas(){var a=G().V('origem',K);return Array.isArray(a)?a:[];}
 function tem(x,rs){return rs.some(function(y){return dg(y.cnj_referencia)===dg(x.cnj_referencia)&&S(y.id)===S(x.id);});}
 function data(t){var m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(S(t));return m?m[3]+'-'+m[2]+'-'+m[1]:/^\d{4}-\d{2}-\d{2}$/.test(S(t))?t:'';}
 function linhasDaLeitura(r,ref){var m=new Map();(r.itens||[]).forEach(function(i){(i.docs||[]).forEach(function(d){if(!/^\d{6,30}$/.test(S(d.id))||/sigilos|segredo de just|acesso restrito/i.test(S(d.tipo)))return;m.set(S(d.id),{cnj_referencia:ref,id:S(d.id),data:data(i.data),documento:S(d.tipo).slice(0,300),id_origem:/^\d{6,30}$/.test(S(d.origem))?S(d.origem):''});});});return Array.from(m.values());}
 function html(){var x=sync();if(!x.ref||dg(x.pai)===dg(x.ref))return '';
 var rs=linhas(),L=C.docs.filter(function(d){return !tem(d,rs)&&(!C.search||S(d.documento+' '+d.id).toLowerCase().indexOf(C.search.toLowerCase())>=0);}),n=Object.keys(C.sel).filter(function(id){return C.sel[id]&&C.docs.some(function(d){return d.id===id&&!tem(d,rs);});}).length;
 var h='<div class="gf w ref1g"><div class="ref1g-head"><b>Peças do processo de referência</b><span class="chip">1º grau · '+rs.length+'</span></div><small class="muted">'+esc(x.ref)+'</small>';
 if(bloqueado())return h+'<p class="muted">Vínculo indisponível em processo sigiloso.</p></div>';
 h+=rs.map(function(d){return '<div class="ref1g-doc"><b>'+esc(d.documento)+'</b><small>ID '+esc(d.id)+' · '+esc(d.data||'data não informada')+' · 1º grau</small>'+((dg(d.cnj_referencia)!==dg(x.ref))?'<small>Referência anterior: '+esc(d.cnj_referencia)+'</small>':'')+'</div>';}).join('');
 h+='<button type="button" class="btn line sm" data-ref1g="ler" '+(!x.aberto||C.busy?'disabled':'')+'>'+(C.busy?'Processando…':'Ler peças do PJe 1G')+'</button>';
 if(!x.aberto)h+='<small class="muted">Abra o processo de referência nos autos digitais do PJe de primeiro grau. O prontuário de segundo grau permanecerá aberto.</small>';
 if(C.docs.length&&x.aberto){h+='<input type="search" data-ref1g-busca placeholder="Filtrar por tipo ou ID" value="'+esc(C.search)+'"><div class="ref1g-head"><small>'+L.length+' disponível(is) · '+n+' selecionada(s)</small><button type="button" class="lnk" data-ref1g="limpar">Limpar seleção</button></div><div class="ref1g-list">'+L.map(function(d){return '<label class="ref1g-item"><input type="checkbox" data-ref1g-id="'+esc(d.id)+'" '+(C.sel[d.id]?'checked':'')+'><span><b>'+esc(d.documento)+'</b><small>ID '+esc(d.id)+' · '+esc(d.data||'—')+'</small></span></label>';}).join('')+'</div><label class="ref1g-item"><input type="checkbox" data-ref1g-conf '+(C.confirm?'checked':'')+'><small>Confirmo que as peças selecionadas podem ser registradas na ficha compartilhada.</small></label><button type="button" class="btn solid sm" data-ref1g="gravar" '+(!n||n>60||!C.confirm||C.busy?'disabled':'')+'>Vincular '+n+' peça(s)</button><small class="muted">Somente identificação documental. Não copia texto, PDF ou movimentações. Até 60 por operação.</small>';}
 if(C.msg)h+='<small role="status" class="ref1g-msg">'+esc(C.msg)+'</small>';return h+'</div>';
 }
 function ler(){var x=sync(),state=C;if(!x.aberto||state.busy||bloqueado())return;state.busy=true;state.msg='';redraw();window.MutaPje.lerReferencia(x.ref).then(function(r){if(C!==state||sync().pai!==x.pai||!contexto().aberto)return;state.docs=linhasDaLeitura(r,x.ref);state.sel={};state.confirm=false;state.msg=state.docs.length+' peças disponíveis na cronologia carregada.'+(r.omitidos?' Peças restritas omitidas.':'');},function(e){state.msg=e.message||String(e);}).finally(function(){state.busy=false;if(C===state)redraw();});}
 function gravar(){var x=sync(),state=C;if(!x.aberto||state.busy||!state.confirm||bloqueado())return;var rows=state.docs.filter(function(d){return state.sel[d.id]&&!tem(d,linhas());});if(!rows.length||rows.length>60)return;
 state.busy=true;state.msg='';redraw();
 // A gravação normal (inclusive a simulação da prévia) mantém o CNJ do prontuário.
 Promise.resolve().then(function(){if(C!==state||contexto().pai!==x.pai||!contexto().aberto||bloqueado())throw Error('Contexto alterado; nenhuma peça foi vinculada.');G().marcar('origem.'+K,rows);return G().gravar();}).then(function(j){if(j&&j.recusados&&j.recusados.length)throw Error('O servidor recusou a gravação.');state.sel={};state.confirm=false;state.msg=rows.length+' peça(s) vinculada(s)'+(location.pathname.endsWith('/universal.html')?' na simulação.':'.');},function(e){state.msg='Não gravou: '+e.message;}).finally(function(){state.busy=false;if(C===state)redraw();});
 }
 document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-ref1g]');if(!a)return;e.preventDefault();e.stopPropagation();if(a.dataset.ref1g==='ler')ler();else if(a.dataset.ref1g==='gravar')gravar();else if(a.dataset.ref1g==='limpar'){C.sel={};redraw();}},true);
 document.addEventListener('change',function(e){var t=e.target;if(t.hasAttribute('data-ref1g-id')){C.sel[t.dataset.ref1gId]=t.checked;redraw();}else if(t.hasAttribute('data-ref1g-conf')){C.confirm=t.checked;redraw();}else if(t.hasAttribute('data-ref1g-busca')){C.search=t.value;redraw();}},true);
 var ultimo='';
 document.addEventListener('muta:referencia',function(){if(!G())return;var x=sync(),k=x.aberto?dg(x.pai)+'|'+dg(x.ref):'';if(k!==ultimo){ultimo=k;if(k&&G().abrirReferencia)G().abrirReferencia();else if(C.docs.length)redraw();}});
 window.MutaReferencia={html:html,linhasDaLeitura:linhasDaLeitura,tem:tem};
})();
