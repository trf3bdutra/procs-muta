/* Matriz e proposta: os registros importados continuam de leitura; os campos editáveis
   são os campos canônicos já utilizados pelo Minutário. Não confundir proposta com voto. */
(function(){
 var base=corpoRoteiro;
 function texto(k,alt){var v=V('triagem',k);return S(v)||S(alt);}
 function linha(rot,v){return '<div class="gf w"><span class="gl">'+esc(rot)+'</span><span class="ro">'+esc(S(v)||'—')+'</span></div>';}
 function bloco(){
   var m=window.MUTA_WEB&&window.MUTA_WEB.matriz||{};
   var h='<details class="gg pv-matriz" open><summary><h4>'+(window.MUTA_PREVIA?'Análise e Indexação':'Matriz e proposta')+'</h4><span class="gn">Triagem · Compendium</span></summary><div class="gr">';
   h+=linha('Coleção',texto('Registro - Lote',m.lote))+linha('Grupo / matriz',texto('Registro - Grupo',m.grupo))+linha('Variações',texto('Registro - Variações',m.variacoes));
   h+=linha('Proposta registrada na triagem',texto('Registro - Proposta',m.proposta))+linha('Modelo indicado na triagem',texto('Registro - Modelo',m.modelo));
   h+=linha('Resultado proposto pelo grupo',m.resultado);
   h+='<p class="muted">O registro de triagem não é resultado do julgamento. Os campos abaixo integram a ficha única.</p>';
   [['triagem','Tema','Tipo de caso / matéria'],['triagem','Alegações','Questões controvertidas'],['triagem','Especificidades','Particularidades'],['producao','Modelo aplicável','Modelo ou minuta-matriz'],['producao','Variação do modelo','Variação do modelo'],['producao','Tópico-síntese','Tópico-síntese'],['producao','Precedentes aplicáveis','Precedentes aplicáveis'],['producao','Distinção de precedente','Distinções']].forEach(function(x){h+=campoRot(x[0],x[1],x[2]);});
   return h+'</div></details>';
 }
 corpoRoteiro=function(){return base()+bloco();};
})();

/* Revisão da prévia: reutiliza o prontuário real, sem afetar o painel instalado nem web.html. */
(function(){
 if(!window.MUTA_PREVIA)return;
 var CAT=['Decisões e atos judiciais','Recursos e respostas','Pareceres e manifestações','Representação processual','Peças postulatórias','Documentos e provas','Certidões e expedientes','Outras peças e ocorrências'];
 var DOC='origem.Classificação documental',view='categoria',order='desc',query='',relevant=false,cnj='',editor=null,fieldGroup='',fieldSearch='';
 function rows(sec,k){var v=V(sec,k);return Array.isArray(v)?v:[];}
 function restricted(){var s=window.MutaSigilo;return !!(s&&(s.bloqueado()||s.sigiloso()));}
 function docBlocked(d){var s=window.MutaSigilo;return !!(s&&((s.docBloqueado&&s.docBloqueado(d))||(s.docSigiloso&&s.docSigiloso(d))));}
 function cat(d){if(CAT.includes(d.categoria))return d.categoria;var t=N(S(d.tipo)+' '+S(d.titulo));
 if(/contrarrazo|contraminuta|apelacao|agravo|embargo|recurso/.test(t)&&!/^(decisao|acordao|sentenca)/.test(t))return CAT[1];
 if(/sentenca|acordao|decisao|despacho/.test(t))return CAT[0];
 if(/parecer|ministerio publico/.test(t))return CAT[2];
 if(/procuracao|substabelec/.test(t))return CAT[3];
 if(/inicial|contestacao|replica|peticao/.test(t))return CAT[4];
 if(/certidao|intimacao|expediente/.test(t))return CAT[6];
 if(/laudo|prova|documento/.test(t))return CAT[5];return CAT[7];}
 function valid(id){return /^\d{1,30}$/.test(S(id));}
 function docs(){
  if(restricted())return [];
  var M=new Map(), AU=window.MutaAutos,live=AU&&AU.doProcesso&&AU.doProcesso(),blocked=new Set((live&&live.lista||[]).filter(docBlocked).map(d=>S(d.id)));
  function add(r){var id=S(r.id);if(!valid(id)||blocked.has(id))return;var o=M.get(id)||{id:id};Object.keys(r).forEach(function(k){if(S(r[k]))o[k]=r[k];});M.set(id,o);}
  function ids(v,r){(S(v).match(/\d+/g)||[]).forEach(id=>add(Object.assign({},r,{id:id})));}
  rows('origem','Autos - Documentos').forEach(r=>add({id:r.id,tipo:r.documento,data:r.data}));
  rows('triagem','Registro - Peças').forEach(r=>add({id:r.id,tipo:r.peca,data:r.data,detalhamento:r.nota||r.trecho}));
  rows('origem','Outras peças').forEach(r=>ids(r.ids,{tipo:r.tipo,data:r.data,detalhamento:r.texto}));
  rows('origem','Origem - Peças vinculadas 1G').forEach(r=>add({id:r.id,tipo:r.documento,data:r.data,instancia:'1º grau',cnj_referencia:r.cnj_referencia}));
  [['Sentença - ID','Sentença','1º grau','Sentença - Data'],['1G - Decisão ID','Decisão','1º grau','1G - Decisão Data'],['2G - Monocrática ID','Decisão monocrática','2º grau','2G - Monocrática Data'],['Acórdão - ID','Acórdão','2º grau','2G - Acórdão Data']].forEach(x=>ids(V('origem',x[0]),{tipo:x[1],instancia:x[2],data:V('origem',x[3]),categoria:CAT[0]}));
  ids(V('triagem','Impugnada - ID')||V('origem','Impugnada - ID'),{tipo:'Ato impugnado',categoria:CAT[0],pertinencia_atual:'Sim'});
  rows('origem','Recursos').forEach(r=>ids(r.ids||r.id,{tipo:r.tipo||'Recurso',data:r.data,categoria:CAT[1]}));
  rows('origem','Contrarrazões').forEach(r=>ids(r.ids||r.id,{tipo:'Contrarrazões',data:r.data,categoria:CAT[1]}));
  rows('triagem','Procurações').forEach(r=>ids(r.id,{tipo:'Procuração',data:r.data,categoria:CAT[3]}));
  ids(V('triagem','ID da Procuração'),{tipo:'Procuração',categoria:CAT[3]});
  ids(V('triagem','ID do Parecer MPF'),{tipo:'Parecer MPF',data:V('triagem','MPF - Data'),categoria:CAT[2]});
  (live&&live.lista||[]).forEach(r=>{if(!docBlocked(r))add({id:r.id,tipo:r.tipo,titulo:r.desc||r.tipo,data:r.data});});
  rows('origem','Classificação documental').forEach(add);
  return Array.from(M.values()).map(d=>Object.assign(d,{categoria:cat(d)}));
 }
 function model(){return campoModelo('origem','Classificação documental');}
 function button(a,t){return '<button type="button" class="btn line sm" data-pv2="'+esc(a)+'">'+esc(t)+'</button>';}
 function input(c,v){var k=c.chave,at=' data-pv2-col="'+esc(k)+'" aria-label="'+esc(c.rotulo)+'"',opts=k==='categoria'?CAT:k==='pertinencia_atual'?['Sim','Não','A conferir']:c.opcoes;
 if(opts){var l=[''].concat(opts);if(v&&!l.includes(v))l.push(v);return '<select'+at+'>'+l.map(x=>'<option value="'+esc(x)+'"'+(x===v?' selected':'')+'>'+esc(x||'—')+'</option>').join('')+'</select>';}
 return c.tipo==='texto-longo'?'<textarea rows="3"'+at+'>'+esc(v)+'</textarea>':'<input'+at+' value="'+esc(v)+'">';}
 function form(){if(!editor||!model()||!editavel(model())||restricted())return '';
 var cs=model().colunas||[],priority=['id','titulo','detalhamento','data','tipo','categoria','instancia','cnj_referencia','pertinencia_atual','ato_impugnado','recursos_vinculados'],ordered=priority.map(k=>cs.find(c=>c.chave===k)).filter(Boolean),other=cs.filter(c=>!priority.includes(c.chave)),renderCol=c=>'<label class="gf'+(c.tipo==='texto-longo'||c.chave==='titulo'?' w':'')+'"><span class="gl">'+esc(c.rotulo)+'</span>'+input(c,S(editor[c.chave]))+'</label>';
 return '<div class="pv2-editor"><div class="pv2-head"><b>'+(editor._new?'Nova peça':'Editar peça')+'</b>'+button('cancel','Cancelar')+'</div><div class="gr">'+ordered.map(renderCol).join('')+'</div><details class="gg"><summary><h4>Campos especializados e classificação funcional</h4></summary><div class="gr">'+other.map(renderCol).join('')+'</div></details><div class="pv2-head"><small class="muted" id="pv2-error">Registro na ficha · somente nesta prévia.</small>'+button('save','Gravar peça')+'</div></div>';}
 function dateKey(v){var s=S(v),m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);return m?m[3]+'-'+m[2]+'-'+m[1]:/^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):'';}
 function index(){if(restricted())return '';var D=docs(),q=N(query),L=D.filter(d=>(!relevant||N(d.pertinencia_atual)==='sim')&&(!q||N([d.id,d.titulo,d.tipo,d.detalhamento,d.categoria].join(' ')).includes(q)));
 L.sort((a,b)=>{var x=dateKey(a.data),y=dateKey(b.data);return (view==='categoria'?CAT.indexOf(a.categoria)-CAT.indexOf(b.categoria):0)||(!x&&!y?0:!x?1:!y?-1:(order==='asc'?1:-1)*x.localeCompare(y));});
 var h='<section class="pv2-index" id="pv2-index"><div class="pv2-head"><b>Índice documental integrado</b><small class="muted">'+D.length+' documentos</small>'+(model()&&editavel(model())?button('new','+ Peça'):'')+'</div><input class="pv2-search" data-pv2-query placeholder="Buscar ID, título ou detalhamento" aria-label="Buscar documentos" value="'+esc(query)+'"><div class="seg pv2-modes">'+['categoria','cronologia'].map(k=>'<button type="button" data-pv2="view:'+k+'" aria-selected="'+(view===k)+'">'+(k==='categoria'?'Por categoria':'Cronológico')+'</button>').join('')+'</div><div class="pv2-head"><label class="pv2-check"><input type="checkbox" data-pv2-relevant'+(relevant?' checked':'')+'> Em apreciação</label>'+button('order',order==='asc'?'Mais antigos primeiro':'Mais recentes primeiro')+'</div>'+form();
 var last='';L.forEach(d=>{if(view==='categoria'&&last!==d.categoria){last=d.categoria;h+='<h4 class="pv2-cat">'+esc(last)+'</h4>';}h+='<details class="pv2-doc"><summary><span><b>'+esc(d.titulo||d.tipo||'Documento')+'</b><small>'+esc([d.data||'Sem data',d.instancia,'ID '+d.id].filter(Boolean).join(' · '))+'</small></span>'+(N(d.pertinencia_atual)==='sim'?'<small class="pv2-current">Em apreciação</small>':'')+'</summary><div class="pv2-doc-body">'+(view==='cronologia'?'<small class="muted">'+esc(d.categoria)+'</small>':'')+(d.detalhamento?'<p>'+esc(d.detalhamento)+'</p>':'<small class="muted">Sem detalhamento registrado.</small>')+(d.ato_impugnado?'<small>Ato impugnado: '+esc(d.ato_impugnado)+'</small>':'')+(d.recursos_vinculados?'<small>Recursos: '+esc(d.recursos_vinculados)+'</small>':'')+'<div class="pv2-head">'+button('copy:'+d.id,'Copiar ID')+(model()&&editavel(model())?button('edit:'+d.id,'Editar peça'):'')+'</div></div></details>';});
 return h+(L.length?'':'<p class="muted">Nenhuma peça nesta visualização.</p>')+'</section>';}
 var baseAutos=corpoAutos;
 corpoAutos=function(){var t=document.createElement('template');t.innerHTML=baseAutos();var root=t.content.querySelector('#g-docs');if(root&&!restricted()){var x=document.createElement('div');x.innerHTML=index();var h=root.querySelector('.pc-sh');if(h)h.after(x.firstElementChild);else root.prepend(x.firstElementChild);}var box=document.createElement('div');box.append(t.content);return box.innerHTML;};
 /* Inventário de campos: acesso sob demanda, com os mesmos renderizadores e permissões. */
 function groups(){var out=[];(G.F&&G.F.abas||[]).forEach(b=>(b.grupos||[]).forEach((g,i)=>out.push({id:b.aba+'|'+i,name:b.aba+' · '+g.grupo,fields:g.campos||[]})));return out;}
 function fieldBox(){var gs=groups(),g=gs.find(x=>x.id===fieldGroup),q=N(fieldSearch),cs=g?g.fields.filter(c=>!q||N(c.rotulo+' '+c.chave).includes(q)):[];return '<details class="gg pv2-fields"'+(fieldGroup?' open':'')+'><summary><h4>Todos os campos da ficha</h4><span class="gn">'+gs.reduce((n,x)=>n+x.fields.length,0)+'</span></summary><div class="pv2-inventory"><small class="muted">Consulta e edição dos campos canônicos, conforme permissões e natureza do registro.</small><select data-pv2-group aria-label="Seção da ficha"><option value="">Selecionar seção…</option>'+gs.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===fieldGroup?' selected':'')+'>'+esc(x.name)+' · '+x.fields.length+'</option>').join('')+'</select>'+(g?'<input data-pv2-fieldsearch aria-label="Buscar campo" placeholder="Buscar campo nesta seção" value="'+esc(fieldSearch)+'"><div class="gr">'+cs.map(c=>campo(c)).join('')+'</div>':'')+'</div></details>';}
 var baseHero=heroOrganizarProntuario;
 heroOrganizarProntuario=function(){baseHero();var top=caixa.querySelector('.pc.pm'),p=caixa.querySelector('.hero-top-pages'),l=top&&top.querySelector('.pm-l1');if(!top||!p)return;
 if(cnj!==G.cnj){cnj=G.cnj;editor=null;query='';fieldGroup='';fieldSearch='';}
 if(l&&p.contains(l)){l.classList.add('pv2-fixed-id');p.before(l);}
 var body=caixa.querySelector('.gbody');if(body&&!restricted()&&!body.querySelector('.pv2-fields')){var t=document.createElement('template');t.innerHTML=fieldBox();body.append(t.content);}
 };
 caixa.addEventListener('input',function(e){var t=e.target;if(editor&&t.dataset.pv2Col)editor[t.dataset.pv2Col]=t.value;},true);
 caixa.addEventListener('change',function(e){var t=e.target;if(editor&&t.dataset.pv2Col)editor[t.dataset.pv2Col]=t.value;
 if(t.hasAttribute('data-pv2-query')){query=t.value;render();}else if(t.hasAttribute('data-pv2-relevant')){relevant=t.checked;render();}else if(t.hasAttribute('data-pv2-group')){fieldGroup=t.value;fieldSearch='';render();}else if(t.hasAttribute('data-pv2-fieldsearch')){fieldSearch=t.value;render();}},true);
 caixa.addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.target.hasAttribute('data-pv2-query')||e.target.hasAttribute('data-pv2-fieldsearch'))){e.preventDefault();e.target.dispatchEvent(new Event('change',{bubbles:true}));}},true);
 caixa.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-pv2]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();var a=b.dataset.pv2;
 if(a.startsWith('view:'))view=a.slice(5);else if(a==='order')order=order==='asc'?'desc':'asc';else if(a==='cancel')editor=null;else if(a.startsWith('copy:')){if(navigator.clipboard)navigator.clipboard.writeText(a.slice(5));return;}
 else if(a==='new'&&model()&&editavel(model())&&!restricted()){editor={_new:true,categoria:CAT[7]};}
 else if(a.startsWith('edit:')&&model()&&editavel(model())&&!restricted()){var d=docs().find(x=>x.id===a.slice(5));if(!d)return;editor=Object.assign({},d,{_original:d.id});}
 else if(a==='save'&&editor&&model()&&editavel(model())&&!restricted()){
 var err=$('pv2-error'),id=S(editor.id);if(!valid(id)||!S(editor.titulo)){if(err)err.textContent='Informe ID numérico e título.';return;}
 if(editor._original&&editor._original!==id){if(err)err.textContent='O ID existente não pode ser trocado; cadastre outra peça.';return;}
 if(editor._new&&docs().some(d=>d.id===id)){if(err)err.textContent='ID já existente. Edite o registro correspondente.';return;}
 var R=rows('origem','Classificação documental').map(r=>Object.assign({},r)),i=R.findIndex(r=>S(r.id)===id),data={};(model().colunas||[]).forEach(c=>{if(Object.prototype.hasOwnProperty.call(editor,c.chave))data[c.chave]=editor[c.chave];});data.id=id;if(i<0)R.push(data);else R[i]=Object.assign({},R[i],data);marcar(DOC,R);editor=null;agendar(400);
 }render();},true);
})();
