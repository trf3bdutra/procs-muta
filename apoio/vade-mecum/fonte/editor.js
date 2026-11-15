/* ================= VERSÃO EDITOR: adicionar, editar e excluir modelos-matriz, parágrafos-padrão, peças do Editorial e diretrizes =================
   Só entra no Vade_Mecum_CMT_editor.html. As alterações valem na hora nesta página; para gravar, "Enviar ao GitHub" faz um commit
   em trf3bdutra/procs-muta (token informado na hora, guardado só na memória desta aba) ou "Baixar arquivos" gera um .zip com os
   arquivos da base, nos caminhos do repositório. O GitHub valida a base e reconstrói o Vade Mecum depois do commit. */
var EDM=null;try{EDM=JSON.parse($('#editor-meta').textContent);}catch(e){EDM=null;}
var EDS={col:'mod',id:null,q:'',tipoNovo:'preferencia',log:[],sujo:{},token:'',conf:null};
var EDCOL={mod:'Modelos-matriz',par:'Parágrafos-padrão',pec:'Editorial (peças)',dir:'Diretrizes'};
var EDARQ={mod:'modelos',par:'paragrafos',pec:'pecas',dir:'diretrizes'};
/* mesmo formato do json.dumps do Python (separadores “, ” e “: ”), para o diff ficar limpo */
function pyDumps(v){if(v===null||v===undefined)return 'null';if(Array.isArray(v))return '['+v.map(pyDumps).join(', ')+']';if(typeof v==='object')return '{'+Object.keys(v).map(function(k){return JSON.stringify(k)+': '+pyDumps(v[k]);}).join(', ')+'}';return JSON.stringify(v);}
function edHoje(){return new Date().toISOString().slice(0,10);}
function edAgora(){return new Date().toISOString().replace(/\.\d+Z$/,'Z');}
function edLista(){
  if(EDS.col==='mod')return (BASE&&BASE.mod)||[];
  if(EDS.col==='par')return (BASE&&BASE.par)||[];
  if(EDS.col==='pec')return ED.pecas.pecas;
  return ED.padrao.registros;}
function edRot(c,r){
  if(c==='mod')return {t:r.nomeModelo||r.id,s:[r.assunto,r.classeSigla||r.especie,r.especieModelo].filter(Boolean).join(' · ')};
  if(c==='par')return {t:r.titulo||r.id,s:[r.id,STL[r.status]||r.status,r.categoria].filter(Boolean).join(' · ')};
  if(c==='pec')return {t:r.t||r.id,s:[r.id,r.grupo,(r.elementos||[]).length+' trechos'].filter(Boolean).join(' · ')};
  return {t:r.titulo||r.expressao||r.verbo||r.motivo||r.mensagem||r.id,s:[r.id,r.tipo,r.grupo].filter(Boolean).join(' · ')};}
/* campos por coleção: [chave, rótulo, tipo (t, a, s, l, j, b), opções] */
var ED_MOD=[['nomeModelo','Nome do modelo','a'],['especieModelo','Espécie','s',['voto-matriz','voto-padrao','decisao','despacho']],['pronunciamento','Pronunciamento','t'],
  ['classe','Classe','t'],['classeSigla','Sigla da classe','t'],['especie','Espécie (sigla)','t'],['assunto','Assunto','t'],['temas','Temas','t'],['resultado','Resultado / dispositivo','a'],
  ['tese','Tese','a'],['causaPedir','Causa de pedir','a'],['preliminares','Preliminares','a'],['honorarios','Honorários','a'],['especificidades','Especificidades','a'],['especificidadesTags','Marcadores (separados por ;)','t'],
  ['fundamentacao','Fundamentação resumida','A'],['processosAssociados','Processos associados','a'],['statusCuradoria','Situação da curadoria','t'],['fonte','Origem','t'],['dataReferencia','Data de referência (AAAA-MM-DD)','t']];
var ED_PAR=[['titulo','Título','t'],['texto','Texto','A'],['status','Situação','s',['padrao','preferencial','variante','estrutural','especifico','anterior','pedido']],['categoria','Categoria','t'],
  ['nivelCategoria','Onde entra (categoria)','t'],['nivelSubsecao','Subseção','t'],['nivelTema','Tema','t'],['nivelEspecificidade','Especificidade','t'],['uso','Quando usar','a'],['especificidadesTags','Marcadores (separados por ;)','t'],['fonte','Origem','t'],
  ['variaveis','Variáveis (JSON)','j'],['vinculos','Vínculos (JSON)','j']];
var ED_DIR={preferencia:[['grupo','Grupo','t'],['titulo','Título','t'],['preferir','Preferir','a'],['evitar','Evitar','a'],['regra','Regra','t'],['base','Base','t']],
  conectivo:[['expressao','Expressão','t'],['funcao','Função','a'],['base','Base','t']],verbo:[['verbo','Verbo','t'],['construcao','Construção','a'],['emprego','Emprego','a'],['base','Base','t']],
  correcao:[['motivo','Motivo (como aparece no aviso)','a'],['padrao','Padrão (expressão regular)','t'],['flags','Flags','t'],['substituir','Substituir por','t']],
  alerta:[['mensagem','Mensagem','a'],['escopo','Onde (ementa, voto, relatório…)','t'],['padrao','Padrão (expressão regular)','t'],['flags','Flags','t']]};
var ED_DIRPRE={preferencia:'red-dir-',conectivo:'red-con-',verbo:'red-vrb-',correcao:'red-cor-',alerta:'red-ale-'};
function edSug(k){var c={};edLista().forEach(function(r){var v=r[k];if(typeof v==='string'&&v&&v.length<80)c[v]=(c[v]||0)+1;});return Object.keys(c).sort(function(a,b){return c[b]-c[a];}).slice(0,60);}
function edCampo(r,f){var k=f[0],v=r[k],id='edf-'+k,h='<label class="edf"><span>'+esc(f[1])+'</span>';
  if(f[2]==='s')h+='<select id="'+id+'" data-k="'+k+'">'+(f[3].indexOf(v)<0&&v?'<option>'+esc(v)+'</option>':'')+f[3].map(function(o){return '<option'+(o===v?' selected':'')+'>'+esc(o)+'</option>';}).join('')+'</select>';
  else if(f[2]==='a'||f[2]==='A')h+='<textarea id="'+id+'" data-k="'+k+'" rows="'+(f[2]==='A'?12:3)+'">'+esc(v==null?'':v)+'</textarea>';
  else if(f[2]==='j')h+='<textarea id="'+id+'" data-k="'+k+'" data-json="1" rows="4" spellcheck="false" class="mono">'+esc(v==null?'':JSON.stringify(v,null,1))+'</textarea>';
  else{var sg=edSug(k);h+='<input id="'+id+'" data-k="'+k+'" value="'+esc(v==null?'':v)+'"'+(sg.length?' list="edl-'+k+'"':'')+'>'+(sg.length?'<datalist id="edl-'+k+'">'+sg.map(function(o){return '<option value="'+esc(o)+'">';}).join('')+'</datalist>':'');}
  return h+'</label>';}
/* esqueleto do modelo: tópicos com texto, ativo e opcional */
function edEsq(r){var e=typeof r.esqueletoModelo==='string'?jp(r.esqueletoModelo):r.esqueletoModelo;e=e||{_topicos:[]};
  return '<div class="edg"><div class="edgh">Tópicos do modelo <small>na ordem da peça; desmarque “ativo” para o tópico entrar recolhido</small></div><div id="ed-tops">'+(e._topicos||[]).map(function(t,i){var b=e[t.id]||{};return edTop(t,b,i);}).join('')+'</div><button class="e-mini" data-edtop-add>+ Tópico</button></div>';}
function edTop(t,b,i){return '<div class="edt" data-tid="'+esc(t.id)+'" data-extra="'+esc(JSON.stringify(Object.keys(t).filter(function(k){return ['id','titulo','opcional'].indexOf(k)<0;}).reduce(function(o,k){o[k]=t[k];return o;},{})))+'"><div class="edt-h"><input class="edt-t" value="'+esc(t.titulo||t.id)+'" aria-label="Título do tópico"><label class="edck"><input type="checkbox" class="edt-a"'+(b.ativo!==false?' checked':'')+'> ativo</label><label class="edck"><input type="checkbox" class="edt-o"'+(t.opcional?' checked':'')+'> opcional</label><span class="edt-b"><button class="e-ib" data-edtop-up title="Subir">↑</button><button class="e-ib" data-edtop-dn title="Descer">↓</button><button class="e-ib" data-edtop-del title="Excluir tópico">✕</button></span></div><textarea class="edt-x" rows="3">'+esc(b.texto||'')+'</textarea></div>';}
function edLerEsq(r){var era=typeof r.esqueletoModelo==='string',ant=(era?jp(r.esqueletoModelo):r.esqueletoModelo)||{_estrutura:'padrao',_topicos:[]};
  var o=JSON.parse(JSON.stringify(ant)),T=[],vivos={};
  $$('#ed-tops .edt').forEach(function(d,i){var id=d.getAttribute('data-tid')||('t'+Date.now().toString(36)+i),ex=jp(d.getAttribute('data-extra'))||{},orig=(ant._topicos||[]).filter(function(t){return t.id===id;})[0];
    var t=orig?JSON.parse(JSON.stringify(orig)):{id:id};t.titulo=d.querySelector('.edt-t').value.trim()||id;t.opcional=d.querySelector('.edt-o').checked;if(!orig)Object.keys(ex).forEach(function(k){t[k]=ex[k];});T.push(t);vivos[id]=1;
    var b=o[id]&&typeof o[id]==='object'?o[id]:{};b.texto=d.querySelector('.edt-x').value;b.ativo=d.querySelector('.edt-a').checked;o[id]=b;});
  o._topicos=T;(ant._topicos||[]).forEach(function(t){if(!vivos[t.id])delete o[t.id];});
  if(JSON.stringify(o)===JSON.stringify(ant))return r.esqueletoModelo;
  return era||r.esqueletoModelo==null?pyDumps(o):o;}
/* peça do Editorial: trechos com fórmula, regras e alternativas */
function edPeca(p){
  var h='<label class="edf"><span>Título da peça</span><input data-pk="t" value="'+esc(p.t||'')+'"></label><label class="edf"><span>Resumo</span><textarea data-pk="resumo" rows="2">'+esc(p.resumo||'')+'</textarea></label><label class="edf"><span>Notas (uma por linha)</span><textarea data-pk="notas" rows="4">'+esc((p.notas||[]).join('\n'))+'</textarea></label>';
  h+='<div class="edg"><div class="edgh">Trechos <small>na ordem da folha</small></div><div id="ed-els">'+(p.elementos||[]).map(edEl).join('')+'</div><button class="e-mini" data-edel-add>+ Trecho</button></div>';
  return h;}
function edEl(e){return '<div class="edt edel" data-orig="'+esc(JSON.stringify(e))+'"><div class="edt-h"><input class="edt-t" value="'+esc(e.n||'')+'" aria-label="Nome do trecho"><label class="edck"><input type="checkbox" class="ede-o"'+(e.opc?' checked':'')+'> opcional</label><span class="edt-b"><button class="e-ib" data-edtop-up title="Subir">↑</button><button class="e-ib" data-edtop-dn title="Descer">↓</button><button class="e-ib" data-edtop-del title="Excluir trecho">✕</button></span></div>'+
  '<label class="edf sm"><span>Fórmula</span><textarea class="ede-f" rows="3">'+esc(e.f||'')+'</textarea></label><label class="edf sm"><span>Regras (uma por linha)</span><textarea class="ede-r" rows="2">'+esc((e.r||[]).join('\n'))+'</textarea></label>'+
  '<div class="ede-alts">'+(e.alts||[]).map(edAlt).join('')+'</div><button class="e-mini" data-edalt-add>+ Alternativa</button></div>';}
function edAlt(a){return '<div class="edalt" data-orig="'+esc(JSON.stringify(a))+'"><input class="eda-l" value="'+esc(a.lab||'')+'" placeholder="Rótulo" aria-label="Rótulo da alternativa"><textarea class="eda-f" rows="2" placeholder="Texto da alternativa">'+esc(a.f||'')+'</textarea><button class="e-ib" data-edalt-del title="Excluir alternativa">✕</button>'+(a.sub?'<small class="meta">com '+a.sub.length+' subalternativas (mantidas)</small>':'')+'</div>';}
function edLerPeca(p){
  $$('#ed-form [data-pk]').forEach(function(i){var k=i.getAttribute('data-pk');if(k==='notas')p.notas=i.value.split('\n').map(function(x){return x.trim();}).filter(Boolean);else p[k]=i.value;});
  p.elementos=$$('#ed-els .edel').map(function(d){var e=jp(d.getAttribute('data-orig'))||{};e.n=d.querySelector('.edt-t').value.trim();e.f=d.querySelector('.ede-f').value;
    var rr=d.querySelector('.ede-r').value.split('\n').map(function(x){return x.trim();}).filter(Boolean);if(rr.length||'r' in e)e.r=rr;
    var al=$$('.edalt',d).map(function(a){var o=jp(a.getAttribute('data-orig'))||{};o.lab=a.querySelector('.eda-l').value.trim();o.f=a.querySelector('.eda-f').value;return o;}).filter(function(a){return a.lab||a.f;});
    if(al.length)e.alts=al;else delete e.alts;if(d.querySelector('.ede-o').checked)e.opc=true;else delete e.opc;return e;});}
/* ---------- painel ---------- */
function edAbrir(col,id){EDS.col=col||EDS.col;EDS.id=id||null;EDS.conf=null;var o=$('#ed-ov');if(!o){o=document.createElement('div');o.id='ed-ov';o.className='ed-ov';o.setAttribute('role','dialog');o.setAttribute('aria-label','Editor do Vade Mecum');document.body.appendChild(o);}
  o.hidden=false;document.body.classList.add('ed-on');base().then(edRender).catch(function(e){o.innerHTML='<p class="empty">Base indisponível ('+esc(e.message)+').</p>';});}
function edFechar(){var o=$('#ed-ov');if(o)o.hidden=true;document.body.classList.remove('ed-on');}
function edRender(){
  var o=$('#ed-ov'),L=edLista(),q=nz(EDS.q),F=L.filter(function(r){if(!q)return true;var x=edRot(EDS.col,r);return nz(x.t+' '+x.s+' '+(r.texto||r.fundamentacao||r.preferir||'')).indexOf(q)>=0;});
  var n=Object.keys(EDS.sujo).filter(function(k){return EDS.sujo[k];}).length;
  var top='<div class="ed-top"><b class="ed-tit">Editor</b><div class="seg">'+Object.keys(EDCOL).map(function(c){return '<button data-edcol="'+c+'" aria-pressed="'+(EDS.col===c)+'">'+EDCOL[c]+(EDS.sujo[c]?' <i class="ed-dot" title="Com alterações não enviadas"></i>':'')+'</button>';}).join('')+'</div><span style="flex:1"></span>'+
    '<span class="meta">'+(n?EDS.log.length+(EDS.log.length>1?' alterações não enviadas':' alteração não enviada'):'Sem alterações pendentes')+'</span><button class="btn ghost" data-edzip'+(n?'':' disabled')+'>Baixar arquivos</button><button class="btn" data-edgit'+(n?'':' disabled')+'>Enviar ao GitHub</button><button class="e-dx" data-edx title="Fechar o editor" aria-label="Fechar o editor">×</button></div>';
  var nov=EDS.col==='pec'?'':'<div class="ed-new">'+(EDS.col==='dir'?'<select data-edtipo>'+Object.keys(ED_DIR).map(function(t){return '<option'+(t===EDS.tipoNovo?' selected':'')+'>'+t+'</option>';}).join('')+'</select>':'')+'<button class="e-mini pri" data-ednovo>+ Novo</button></div>';
  var lst='<aside class="ed-list"><input type="search" id="ed-q" placeholder="Buscar…" value="'+esc(EDS.q)+'" aria-label="Buscar registros">'+nov+'<div class="ed-n">'+F.length+' de '+L.length+'</div><ul>'+F.slice(0,400).map(function(r){var x=edRot(EDS.col,r);return '<li data-edid="'+esc(r.id)+'" class="'+(r.id===EDS.id?'on':'')+'" tabindex="0"><b>'+esc(x.t.length>90?x.t.slice(0,90)+'…':x.t)+'</b><small>'+esc(x.s)+'</small></li>';}).join('')+'</ul></aside>';
  var r=L.filter(function(z){return z.id===EDS.id;})[0];
  var frm='<section class="ed-form" id="ed-form">'+(r?edForm(r):'<p class="empty">Escolha um registro à esquerda ou crie um novo.</p>')+'</section>';
  var foco=document.activeElement&&document.activeElement.id==='ed-q',pos=foco?document.activeElement.selectionStart:0,sc=$('#ed-form')?$('#ed-form').scrollTop:0,lsc=o.querySelector('.ed-list ul')?o.querySelector('.ed-list ul').scrollTop:0;
  o.innerHTML=top+'<div class="ed-body">'+lst+frm+'</div>'+(EDS.dlg||'');
  if(foco){var qi=$('#ed-q');qi.focus();try{qi.setSelectionRange(pos,pos);}catch(e){}}
  if(EDS.mantem){$('#ed-form').scrollTop=sc;var ul=o.querySelector('.ed-list ul');if(ul)ul.scrollTop=lsc;EDS.mantem=false;}
}
function edForm(r){
  var c=EDS.col,h='<div class="ed-fh"><div><span class="e-tag">'+EDCOL[c]+'</span><h3>'+esc(edRot(c,r).t)+'</h3><code>'+esc(r.id)+'</code></div><div class="e-dacts"><button class="e-mini pri" data-edsalvar>Aplicar alterações</button>'+(c!=='pec'?'<button class="e-mini" data-eddup>Duplicar</button>':'')+(c!=='pec'?(EDS.conf===r.id?'<button class="e-mini ed-del" data-eddel2>Confirmar exclusão</button><button class="e-mini" data-edcanc>Cancelar</button>':'<button class="e-mini ed-del" data-eddel>Excluir</button>'):'')+'</div></div>';
  if(c==='mod'){h+='<div class="ed-grid">'+ED_MOD.map(function(f){return edCampo(r,f);}).join('')+'</div>'+edEsq(r)+'<details class="edg"><summary>Parágrafos alternativos do modelo (JSON, avançado)</summary><textarea id="ed-pm" rows="8" class="mono" spellcheck="false">'+esc(typeof r.paragrafosModelo==='string'?r.paragrafosModelo:JSON.stringify(r.paragrafosModelo||[]))+'</textarea></details>';}
  else if(c==='par')h+='<div class="ed-grid">'+ED_PAR.map(function(f){return edCampo(r,f);}).join('')+'</div><p class="meta">Campos variáveis no texto: {nome} ou {nome|rótulo}; colchetes [ … ] viram campo a preencher.</p>';
  else if(c==='pec')h+=edPeca(r);
  else h+='<div class="ed-grid">'+(ED_DIR[r.tipo]||[]).map(function(f){return edCampo(r,f);}).join('')+'</div>';
  return h;}
function edLerForm(r){
  var erro='';
  if(EDS.col==='pec'){edLerPeca(r);return '';}
  $$('#ed-form [data-k]').forEach(function(i){var k=i.getAttribute('data-k'),v=i.value;
    if(i.getAttribute('data-json')){if(!v.trim()){delete r[k];return;}try{r[k]=JSON.parse(v);}catch(e){erro='JSON inválido em “'+k+'”.';}return;}
    if(v===''&&!(k in r))return;r[k]=v;});
  if(EDS.col==='mod'){r.esqueletoModelo=edLerEsq(r);var pm=$('#ed-pm');if(pm){try{var pj=JSON.parse(pm.value||'[]'),pa=typeof r.paragrafosModelo==='string'?jp(r.paragrafosModelo):r.paragrafosModelo;if(JSON.stringify(pj)!==JSON.stringify(pa))r.paragrafosModelo=typeof r.paragrafosModelo==='string'?pyDumps(pj):pj;}catch(e){erro='JSON inválido nos parágrafos alternativos.';}}
    if(r.dataReferencia&&!/^\d{4}-\d{2}-\d{2}$/.test(r.dataReferencia))erro='Data de referência no formato AAAA-MM-DD.';if(!r.assunto)erro='Informe o assunto.';r.atualizadoEm=edAgora();}
  if(EDS.col==='par'&&(!r.titulo||!r.texto))erro='Título e texto são obrigatórios.';
  if(EDS.col==='par'&&!r.categoria)r.categoria=[r.nivelCategoria,r.nivelSubsecao].filter(Boolean).join(' › ')||'Genéricos';
  return erro;}
function edMarca(acao,r){var c=EDS.col;EDS.sujo[c]=true;EDS.log.push({col:c,acao:acao,id:r.id,t:edRot(c,r).t});edAtualizaVista();}
function edAtualizaVista(){try{PRECP=null;PRECI=null;if(!$('#v-edit').hidden)xRender();if(!$('#v-ement').hidden){if(EM.sub==='mod')mRender();else if(EM.sub==='par')pRender();}}catch(e){}}
function edNovo(){var c=EDS.col,L=edLista(),r;
  if(c==='mod'){var ref=L.filter(function(m){var e=jp(m.esqueletoModelo);return e&&e._estrutura==='padrao';})[0],e=ref?jp(ref.esqueletoModelo):{_estrutura:'padrao',_topicos:[]},o={_estrutura:e._estrutura,_topicos:e._topicos};(e._topicos||[]).forEach(function(t){o[t.id]={texto:t.id==='fecho'?'É como voto.':'',ativo:!t.opcional};});
    r={id:'mod-modelo-ed-'+Date.now().toString(36),processo:'',tipo:'Modelo',pronunciamento:'Voto',especie:'',assunto:'',temas:'',tese:'',fundamentacao:'',especificidades:'',resultado:'',fonte:'Editor do Vade Mecum',formatoModelo:'Modelo-matriz',nomeModelo:'Novo modelo-matriz',textoModelo:'',esqueletoModelo:JSON.stringify(o),paragrafosModelo:'[]',classe:'',classeSigla:'',statusCuradoria:'',especieModelo:'voto-matriz',dataReferencia:edHoje(),atualizadoEm:edAgora(),historico:[]};}
  else if(c==='par')r={id:'par.'+Date.now().toString(36),categoria:'Genéricos',titulo:'Novo parágrafo-padrão',status:'padrao',texto:'',nivelTema:'',nivelEspecificidade:'',nivelCategoria:'Genéricos',nivelSubsecao:''};
  else{var t=EDS.tipoNovo,pre=ED_DIRPRE[t],mx=0;L.forEach(function(x){if(x.id.indexOf(pre)===0){var n=parseInt(x.id.slice(pre.length),10);if(n>mx)mx=n;}});r={id:pre+String(mx+1).padStart(2,'0'),tipo:t};ED_DIR[t].forEach(function(f){r[f[0]]='';});}
  L.unshift(r);EDS.id=r.id;edMarca('novo',r);edRender();}
function edDup(r){var c=EDS.col,n=JSON.parse(JSON.stringify(r,function(k,v){return k.charAt(0)==='_'?undefined:v;}));
  if(c==='mod'){n.id='mod-modelo-ed-'+Date.now().toString(36);n.nomeModelo=(n.nomeModelo||'')+' (cópia)';n.atualizadoEm=edAgora();n.historico=[];}
  else if(c==='par'){n.id=r.id+'.c'+Date.now().toString(36).slice(-3);n.titulo=(n.titulo||'')+' (cópia)';}
  else{var pre=ED_DIRPRE[r.tipo]||'red-x-',mx=0;edLista().forEach(function(x){if(x.id.indexOf(pre)===0){var k=parseInt(x.id.slice(pre.length),10);if(k>mx)mx=k;}});n.id=pre+String(mx+1).padStart(2,'0');}
  var L=edLista();L.splice(L.indexOf(r)+1,0,n);EDS.id=n.id;edMarca('novo',n);edRender();toast('Cópia criada: '+n.id);}
document.addEventListener('click',function(e){
  var o=e.target.closest('#ed-ov');var b;
  if((b=e.target.closest('[data-edmod]'))){e.preventDefault();edAbrir('mod',b.getAttribute('data-edmod'));return;}
  if((b=e.target.closest('[data-edpar]'))){e.preventDefault();edAbrir('par',b.getAttribute('data-edpar'));return;}
  if((b=e.target.closest('[data-edpec]'))){e.preventDefault();edAbrir('pec',b.getAttribute('data-edpec'));return;}
  if(e.target.closest('[data-edabre]')){edAbrir();return;}
  if(!o)return;
  if(e.target.closest('[data-edx]')){edFechar();return;}
  if((b=e.target.closest('[data-edcol]'))){EDS.col=b.getAttribute('data-edcol');EDS.id=null;EDS.q='';edRender();return;}
  if((b=e.target.closest('[data-edid]'))){EDS.id=b.getAttribute('data-edid');EDS.conf=null;EDS.mantem=true;edRender();$('#ed-form').scrollTop=0;return;}
  if(e.target.closest('[data-ednovo]')){edNovo();return;}
  var L=edLista(),r=L.filter(function(z){return z.id===EDS.id;})[0];
  if(e.target.closest('[data-edsalvar]')&&r){var er=edLerForm(r);if(er){toast(er);return;}edMarca('editado',r);EDS.mantem=true;edRender();toast('Alterações aplicadas nesta página; envie ao GitHub para gravar');return;}
  if(e.target.closest('[data-eddup]')&&r){edDup(r);return;}
  if(e.target.closest('[data-eddel]')){EDS.conf=EDS.id;EDS.mantem=true;edRender();return;}
  if(e.target.closest('[data-edcanc]')){EDS.conf=null;EDS.mantem=true;edRender();return;}
  if(e.target.closest('[data-eddel2]')&&r){L.splice(L.indexOf(r),1);edMarca('excluído',r);EDS.id=null;EDS.conf=null;edRender();toast('Registro excluído nesta página; envie ao GitHub para gravar');return;}
  if(e.target.closest('[data-edtop-add]')){$('#ed-tops').insertAdjacentHTML('beforeend',edTop({id:'t'+Date.now().toString(36),titulo:'Novo tópico'},{texto:'',ativo:true},0));return;}
  if(e.target.closest('[data-edel-add]')){$('#ed-els').insertAdjacentHTML('beforeend',edEl({n:'Novo trecho',f:'',r:[],fo:'M'}));return;}
  if((b=e.target.closest('[data-edalt-add]'))){b.previousElementSibling.insertAdjacentHTML('beforeend',edAlt({lab:'',f:''}));return;}
  if((b=e.target.closest('[data-edalt-del]'))){b.closest('.edalt').remove();return;}
  if((b=e.target.closest('[data-edtop-up]'))){var d=b.closest('.edt');if(d.previousElementSibling)d.parentNode.insertBefore(d,d.previousElementSibling);return;}
  if((b=e.target.closest('[data-edtop-dn]'))){var d2=b.closest('.edt');if(d2.nextElementSibling)d2.parentNode.insertBefore(d2.nextElementSibling,d2);return;}
  if((b=e.target.closest('[data-edtop-del]'))){b.closest('.edt').remove();return;}
  if(e.target.closest('[data-edzip]')){edZip();return;}
  if(e.target.closest('[data-edgit]')){EDS.dlg=edDlgToken();edRender();var t=$('#ed-tok');if(t)t.focus();return;}
  if(e.target.closest('[data-eddlgx]')){EDS.dlg='';edRender();return;}
  if(e.target.closest('[data-edenviar]')){var tk=$('#ed-tok');if(tk&&tk.value.trim())EDS.token=tk.value.trim();if(!EDS.token){toast('Informe o token');return;}var msg=($('#ed-msg')||{}).value||'';edEnviar(msg);return;}
});
document.addEventListener('input',function(e){if(e.target.id!=='ed-q')return;clearTimeout(edRender._t);var v=e.target.value;edRender._t=setTimeout(function(){EDS.q=v;edRender();},160);});
document.addEventListener('change',function(e){if(e.target.matches&&e.target.matches('[data-edtipo]'))EDS.tipoNovo=e.target.value;});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('#ed-ov')&&!$('#ed-ov').hidden&&!EDS.dlg)edFechar();});
/* ---------- arquivos da base ---------- */
function edLimpa(x){return JSON.parse(JSON.stringify(x,function(k,v){return k.charAt(0)==='_'&&k!=='_topicos'&&k!=='_estrutura'?undefined:v;}));}
function edArquivo(c){var a=EDM.arquivos[EDARQ[c]],agora=edAgora();
  if(c==='mod')return {path:a.path,txt:JSON.stringify({schema:a.head.schema,versao:a.head.versao,atualizadoEm:agora,registros:edLimpa(BASE.mod)},null,1)+'\n'};
  if(c==='par')return {path:a.path,txt:JSON.stringify({schema:a.head.schema,versao:a.head.versao,atualizadoEm:agora,registros:edLimpa(BASE.par)},null,1)+'\n'};
  if(c==='pec')return {path:a.path,txt:JSON.stringify(ED.pecas,null,2)+'\n'};
  return {path:a.path,txt:JSON.stringify({schema:ED.padrao.schema,versao:ED.padrao.versao,atualizadoEm:agora,registros:ED.padrao.registros},null,1)+'\n'};}
function edMudados(){return Object.keys(EDS.sujo).filter(function(c){return EDS.sujo[c];}).map(edArquivo);}
function edZip(){var F=edMudados();if(!F.length)return;var bl=zipStore(F.map(function(f){return {n:f.path,d:f.txt};}));baixarBlob(new Blob([bl],{type:'application/zip'}),'vade-mecum-alteracoes-'+edHoje()+'.zip');toast('Arquivos gerados nos caminhos do repositório');}
function edResumo(){var c={};EDS.log.forEach(function(l){var k=EDCOL[l.col];c[k]=(c[k]||0)+1;});return Object.keys(c).map(function(k){return k.toLowerCase()+': '+c[k];}).join('; ');}
function edDlgToken(){var F=edMudados();return '<div class="ed-dlg" role="dialog" aria-label="Enviar ao GitHub"><div class="ed-dlgc"><h3>Enviar ao GitHub</h3><p class="meta">Um commit em <b>'+esc(EDM.repo)+'</b> ('+esc(EDM.ramo)+') com '+F.map(function(f){return '<code>'+esc(f.path)+'</code>';}).join(', ')+'. Em seguida o GitHub valida a base e reconstrói o Vade Mecum.</p>'+
  '<ul class="ed-logl">'+EDS.log.slice(-12).map(function(l){return '<li>'+esc(EDCOL[l.col])+' · '+esc(l.acao)+' · '+esc(l.t.slice(0,70))+'</li>';}).join('')+(EDS.log.length>12?'<li>+ '+(EDS.log.length-12)+'</li>':'')+'</ul>'+
  '<label class="edf"><span>Descrição do commit</span><input id="ed-msg" value="'+esc('Editor do Vade Mecum: '+edResumo())+'"></label>'+(EDS.token?'<p class="meta">Token desta sessão já informado.</p>':'<label class="edf"><span>Token do GitHub (permissão Contents: leitura e escrita no repositório). Fica só na memória desta aba.</span><input id="ed-tok" type="password" autocomplete="off"></label>')+
  '<div class="e-dacts"><button class="btn" data-edenviar>Enviar</button><button class="btn ghost" data-eddlgx>Cancelar</button></div><p class="meta" id="ed-st"></p></div></div>';}
function edGh(caminho,opt){opt=opt||{};return fetch('https://api.github.com/repos/'+EDM.repo+'/'+caminho,{method:opt.method||'GET',cache:'no-store',headers:Object.assign({'Accept':'application/vnd.github+json','Authorization':'Bearer '+EDS.token,'X-GitHub-Api-Version':'2022-11-28'},opt.body?{'Content-Type':'application/json'}:{}),body:opt.body?JSON.stringify(opt.body):undefined}).then(function(r){if(!r.ok)return r.text().then(function(t){var m='';try{m=JSON.parse(t).message;}catch(e){m=t.slice(0,120);}throw new Error(r.status+' '+m);});return r.json();});}
function edSt(t){var s=$('#ed-st');if(s)s.textContent=t;}
function edEnviar(msg){
  var F=edMudados();if(!F.length)return;var ref,tree;edSt('Conferindo a versão no GitHub…');
  Promise.all(F.map(function(f){var a=Object.keys(EDM.arquivos).map(function(k){return EDM.arquivos[k];}).filter(function(x){return x.path===f.path;})[0];
      return edGh('contents/'+f.path+'?ref='+EDM.ramo).then(function(j){if(a&&a.sha&&j.sha!==a.sha)throw new Error('“'+f.path+'” mudou no GitHub depois que este editor foi gerado. Baixe os arquivos (para não perder as alterações) e abra o editor atualizado.');});}))
  .then(function(){edSt('Gravando…');return edGh('git/ref/heads/'+EDM.ramo);})
  .then(function(j){ref=j.object.sha;return edGh('git/commits/'+ref);})
  .then(function(j){tree=j.tree.sha;return Promise.all(F.map(function(f){return edGh('git/blobs',{method:'POST',body:{content:f.txt,encoding:'utf-8'}}).then(function(b){return {path:f.path,mode:'100644',type:'blob',sha:b.sha};});}));})
  .then(function(T){return edGh('git/trees',{method:'POST',body:{base_tree:tree,tree:T}}).then(function(t){return {t:t,T:T};});})
  .then(function(x){return edGh('git/commits',{method:'POST',body:{message:(msg||'Editor do Vade Mecum')+'\n\nAlterações feitas no editor do Vade Mecum.',tree:x.t.sha,parents:[ref]}}).then(function(c){return {c:c,T:x.T};});})
  .then(function(x){return edGh('git/refs/heads/'+EDM.ramo,{method:'PATCH',body:{sha:x.c.sha}}).then(function(){return x;});})
  .then(function(x){x.T.forEach(function(t){Object.keys(EDM.arquivos).forEach(function(k){if(EDM.arquivos[k].path===t.path)EDM.arquivos[k].sha=t.sha;});});
    EDS.sujo={};EDS.log=[];EDS.dlg='<div class="ed-dlg"><div class="ed-dlgc"><h3>Enviado</h3><p>Commit <a href="'+esc(x.c.html_url||('https://github.com/'+EDM.repo+'/commit/'+x.c.sha))+'" target="_blank" rel="noopener">'+esc(x.c.sha.slice(0,7))+'</a> gravado em '+esc(EDM.ramo)+'. O GitHub valida a base e reconstrói o Vade Mecum em alguns minutos.</p><div class="e-dacts"><button class="btn" data-eddlgx>Fechar</button></div></div></div>';edRender();})
  .catch(function(e){edSt('Não foi possível enviar: '+e.message);if(/^401|^403/.test(e.message))EDS.token='';});}
document.body.classList.add('vdm-ed');
/* entrada pelo cabeçalho */
(function(){var h=$('#openSheet');var b='<button class="btn ed-btn" data-edabre title="Adicionar, editar e excluir modelos-matriz, parágrafos-padrão, peças do Editorial e diretrizes">Editor</button>';if(h)h.insertAdjacentHTML('beforebegin',b);else document.body.insertAdjacentHTML('afterbegin',b);})();
