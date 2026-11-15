/* ================= VERSÃO AVANÇADA · EDITOR: modelos-matriz, parágrafos-padrão, peças do Editorial e diretrizes =================
   As alterações valem na hora nesta página e ficam guardadas como rascunho neste navegador até serem enviadas.
   Para gravar: no site do gabinete (/editor/), "Gravar no GitHub" envia ao servidor, que confere o acesso de editor (apoio/acessos.json)
   e faz o commit em trf3bdutra/procs-muta; aberto como arquivo, o envio usa um token pessoal (só na memória desta aba);
   "Baixar arquivos" gera o .zip com os arquivos da base nos caminhos do repositório. */
var EDM=null;try{EDM=JSON.parse($('#editor-meta').textContent);}catch(e){EDM=null;}
var EDS={col:'mod',id:null,q:'',tipoNovo:'preferencia',token:'',conf:null,dirty:false,prev:false,f:{mod:{},par:{},pec:{},dir:{},nor:{}},
  orig:{mod:{},par:{},pec:{},dir:{},nor:{}},dlg:'',restaura:null,lido:false};
var EDCOL={mod:'Modelos-matriz',par:'Parágrafos-padrão',pec:'Peças do Editorial',dir:'Diretrizes',nor:'Normas'};
var EDARQ={mod:'modelos',par:'paragrafos',pec:'pecas',dir:'diretrizes',nor:'normas'};
/* gravação pelo servidor do site (login da Pauta da equipe + acesso de editor) */
function edSrv(){return !!(window.CMT_SITE&&window.CMT_ACESSO&&window.CMT_ACESSO().editor);}
var EDK='vdm-ed-rascunho-v1';
/* mesmo formato do json.dumps do Python (separadores “, ” e “: ”), para o diff ficar limpo */
function pyDumps(v){if(v===null||v===undefined)return 'null';if(Array.isArray(v))return '['+v.map(pyDumps).join(', ')+']';if(typeof v==='object')return '{'+Object.keys(v).map(function(k){return JSON.stringify(k)+': '+pyDumps(v[k]);}).join(', ')+'}';return JSON.stringify(v);}
function edHoje(){return new Date().toISOString().slice(0,10);}
function edAgora(){return new Date().toISOString().replace(/\.\d+Z$/,'Z');}
function edListaDe(c){
  if(c==='mod')return (BASE&&BASE.mod)||[];
  if(c==='par')return (BASE&&BASE.par)||[];
  if(c==='pec')return ED.pecas.pecas;
  if(c==='nor')return ED.normasComplemento||(ED.normasComplemento=[]);
  return ED.padrao.registros;}
function edLista(){return edListaDe(EDS.col);}
function edAcha(c,id){return edListaDe(c).filter(function(z){return z.id===id;})[0];}
function edTipoMod(r){var e=r.especieModelo||'';return /^voto/.test(e)?'Acórdão':e==='despacho'?'Despacho':'Decisão';}
function edRot(c,r){
  if(c==='mod')return {t:r.nomeModelo||r.id,s:[edTipoMod(r),r.assunto,r.classeSigla||r.especie].filter(Boolean).join(' · ')};
  if(c==='par')return {t:r.titulo||r.id,s:[STL[r.status]||r.status,r.categoria,r.id].filter(Boolean).join(' · ')};
  if(c==='nor')return {t:[r['Norma'],r['Dispositivo']?'art. '+r['Dispositivo']:''].filter(Boolean).join(', ')||r.id,s:[r['Assunto'],r.id].filter(Boolean).join(' · ')};
  if(c==='pec')return {t:r.t||r.id,s:[r.grupo,(r.elementos||[]).length+' trechos',r.id].filter(Boolean).join(' · ')};
  return {t:r.titulo||r.expressao||r.verbo||r.motivo||r.mensagem||r.id,s:[r.tipo,r.grupo,r.id].filter(Boolean).join(' · ')};}

/* ---------- alterações pendentes: original de cada registro tocado, situação e rascunho no navegador ---------- */
function edJ(x){return JSON.stringify(x,function(k,v){return k.charAt(0)==='_'&&k!=='_topicos'&&k!=='_estrutura'?undefined:v;});}
/* substitui o conteúdo do registro sem trocar o objeto (as vistas guardam referências) */
function edPoe(r,n){Object.keys(r).forEach(function(k){delete r[k];});Object.keys(n).forEach(function(k){r[k]=n[k];});return r;}
function edToca(c,r,novo){if(!(r.id in EDS.orig[c]))EDS.orig[c][r.id]=novo?'__novo__':edJ(r);}
function edSit(c,id){var o=EDS.orig[c][id];if(o===undefined)return '';var cur=edAcha(c,id);
  if(o==='__novo__')return cur?'novo':'';if(!cur)return 'excluído';return edJ(cur)===o?'':'editado';}
function edPendentes(){var P=[];Object.keys(EDS.orig).forEach(function(c){Object.keys(EDS.orig[c]).forEach(function(id){var s=edSit(c,id);if(!s){delete EDS.orig[c][id];return;}
  var cur=edAcha(c,id),r=cur||JSON.parse(EDS.orig[c][id]);P.push({col:c,id:id,sit:s,t:edRot(c,r).t});});});return P;}
function edSujo(c){return Object.keys(EDS.orig[c]).some(function(id){return !!edSit(c,id);});}
function edGuarda(){var P=edPendentes();try{if(!P.length){localStorage.removeItem(EDK);return;}
  var d={ts:edAgora(),sha:{},cols:{}};Object.keys(EDARQ).forEach(function(c){d.sha[c]=(EDM.arquivos[EDARQ[c]]||{}).sha||'';});
  P.forEach(function(p){var L=edListaDe(p.col),cur=edAcha(p.col,p.id);(d.cols[p.col]=d.cols[p.col]||{})[p.id]={sit:p.sit,rec:cur?edLimpa(cur):null,idx:cur?L.indexOf(cur):-1};});
  localStorage.setItem(EDK,JSON.stringify(d));}catch(e){}}
function edLeRascunho(){if(EDS.lido)return;EDS.lido=true;var d=null;try{d=JSON.parse(localStorage.getItem(EDK)||'null');}catch(e){}
  if(!d||!d.cols)return;var n=0,mudou=false;Object.keys(d.cols).forEach(function(c){n+=Object.keys(d.cols[c]).length;if(d.sha&&EDM.arquivos[EDARQ[c]]&&d.sha[c]&&d.sha[c]!==EDM.arquivos[EDARQ[c]].sha)mudou=true;});
  if(n)EDS.restaura={d:d,n:n,mudou:mudou};}
function edRestaura(){var d=EDS.restaura&&EDS.restaura.d;EDS.restaura=null;if(!d)return;
  Object.keys(d.cols).forEach(function(c){var L=edListaDe(c);Object.keys(d.cols[c]).forEach(function(id){var x=d.cols[c][id],cur=edAcha(c,id);
    if(x.sit==='excluído'){if(cur){edToca(c,cur);L.splice(L.indexOf(cur),1);}return;}
    if(cur){edToca(c,cur);edPoe(cur,x.rec);}else{edToca(c,x.rec,true);L.splice(Math.max(0,Math.min(x.idx,L.length)),0,x.rec);}});});
  edAtualizaVista();edGuarda();toast('Rascunho restaurado');}
function edDescartaRascunho(){EDS.restaura=null;try{localStorage.removeItem(EDK);}catch(e){}}
function edDesfaz(c,id){var o=EDS.orig[c][id];if(o===undefined)return;var L=edListaDe(c),cur=edAcha(c,id);
  if(o==='__novo__'){if(cur)L.splice(L.indexOf(cur),1);}
  else{var r=JSON.parse(o);if(cur)edPoe(cur,r);else{var i=(EDS.pos&&EDS.pos[c+'|'+id]);L.splice(i>=0&&i<=L.length?i:0,0,r);}}
  delete EDS.orig[c][id];if(EDS.col===c&&EDS.id===id&&o==='__novo__')EDS.id=null;EDS.dirty=false;edAtualizaVista();edGuarda();}

/* ---------- campos por coleção: [chave, rótulo, tipo (t, a, A, s, j), opções, obrigatório] ---------- */
var ED_MOD=[['nomeModelo','Nome do modelo','a',null,1],['especieModelo','Tipo','s',['voto-matriz','voto-padrao','decisao','despacho']],['pronunciamento','Pronunciamento','t'],
  ['classe','Classe','t'],['classeSigla','Sigla da classe','t'],['especie','Espécie (sigla)','t'],['assunto','Assunto','t',null,1],['temas','Temas','t'],['resultado','Resultado / dispositivo','a'],
  ['tese','Tese','a'],['causaPedir','Causa de pedir','a'],['preliminares','Preliminares','a'],['honorarios','Honorários','a'],['especificidades','Especificidades','a'],['especificidadesTags','Marcadores (separados por ;)','t'],
  ['fundamentacao','Fundamentação resumida','A'],['processosAssociados','Processos associados','a'],['statusCuradoria','Situação da curadoria','t'],['fonte','Origem','t'],['dataReferencia','Data de referência (AAAA-MM-DD)','t']];
var ED_PAR=[['titulo','Título','t',null,1],['texto','Texto','A',null,1],['status','Situação','s',['padrao','preferencial','variante','estrutural','especifico','anterior','pedido']],['categoria','Categoria','t'],
  ['nivelCategoria','Onde entra (categoria)','t'],['nivelSubsecao','Subseção','t'],['nivelTema','Tema','t'],['nivelEspecificidade','Especificidade','t'],['uso','Quando usar','a'],['especificidadesTags','Marcadores (separados por ;)','t'],['fonte','Origem','t'],
  ['variaveis','Variáveis (JSON)','j'],['vinculos','Vínculos (JSON)','j']];
var ED_DIR={preferencia:[['grupo','Grupo','t'],['titulo','Título','t'],['preferir','Preferir','a'],['evitar','Evitar','a'],['regra','Regra','t'],['base','Base','t']],
  conectivo:[['expressao','Expressão','t'],['funcao','Função','a'],['base','Base','t']],verbo:[['verbo','Verbo','t'],['construcao','Construção','a'],['emprego','Emprego','a'],['base','Base','t']],
  correcao:[['motivo','Motivo (como aparece no aviso)','a'],['padrao','Padrão (expressão regular)','t'],['flags','Flags','t'],['substituir','Substituir por','t']],
  alerta:[['mensagem','Mensagem','a'],['escopo','Onde (ementa, voto, relatório…)','t'],['padrao','Padrão (expressão regular)','t'],['flags','Flags','t']]};
var ED_NOR=[['Código','Código (identificador)','t',null,1],['Diploma','Diploma','t',null,1],['Nome do diploma','Nome do diploma','t'],['Norma','Norma (como é citada)','t',null,1],['Dispositivo','Dispositivo','t',null,1],
  ['Assunto','Assunto','t'],['Texto literal','Texto literal','A'],['Observação','Observação','a']];
var ED_DIRPRE={preferencia:'red-dir-',conectivo:'red-con-',verbo:'red-vrb-',correcao:'red-cor-',alerta:'red-ale-'};
function edSug(k){var c={};edLista().forEach(function(r){var v=r[k];if(typeof v==='string'&&v&&v.length<80)c[v]=(c[v]||0)+1;});return Object.keys(c).sort(function(a,b){return c[b]-c[a];}).slice(0,80);}
function edCampo(r,f){var k=f[0],v=r[k],id='edf-'+k.replace(/[^A-Za-z0-9_-]/g,'_'),h='<label class="edf'+(f[4]?' req':'')+'"><span>'+esc(f[1])+(f[4]?' <i>obrigatório</i>':'')+'</span>';
  if(f[2]==='s')h+='<select id="'+id+'" data-k="'+k+'">'+(f[3].indexOf(v)<0&&v?'<option>'+esc(v)+'</option>':'')+f[3].map(function(o){return '<option'+(o===v?' selected':'')+'>'+esc(o)+'</option>';}).join('')+'</select>';
  else if(f[2]==='a'||f[2]==='A')h+='<textarea id="'+id+'" data-k="'+k+'" class="ed-auto" rows="'+(f[2]==='A'?6:2)+'">'+esc(v==null?'':v)+'</textarea>';
  else if(f[2]==='j')h+='<textarea id="'+id+'" data-k="'+k+'" data-json="1" rows="4" spellcheck="false" class="mono ed-auto">'+esc(v==null?'':JSON.stringify(v,null,1))+'</textarea>';
  else{var sg=edSug(k);h+='<input id="'+id+'" data-k="'+k+'" value="'+esc(v==null?'':v)+'"'+(sg.length?' list="'+id.replace('edf-','edl-')+'"':'')+'>'+(sg.length?'<datalist id="'+id.replace('edf-','edl-')+'">'+sg.map(function(o){return '<option value="'+esc(o)+'">';}).join('')+'</datalist>':'');}
  return h+'</label>';}

/* ---------- esqueleto do modelo: tópicos com texto, ativo e opcional ---------- */
function edEsq(r){var e=typeof r.esqueletoModelo==='string'?jp(r.esqueletoModelo):r.esqueletoModelo;e=e||{_topicos:[]};var T=e._topicos||[],na=T.filter(function(t){return (e[t.id]||{}).ativo!==false;}).length;
  return '<div class="edg"><div class="edgh">Texto do modelo · tópicos <small>'+na+' de '+T.length+' ativos · na ordem da peça · desmarque “ativo” para o tópico entrar recolhido</small><span class="edg-a"><button class="e-mini" data-edtop-all="1">Abrir todos</button><button class="e-mini" data-edtop-all="0">Recolher inativos</button></span></div><div id="ed-tops">'+T.map(function(t,i){var b=e[t.id]||{};return edTop(t,b,i);}).join('')+'</div><button class="e-mini" data-edtop-add>+ Tópico</button></div>';}
function edTop(t,b,i){var at=b.ativo!==false,tx=b.texto||'',ph=/\{\{/.test(tx);
  return '<div class="edt'+(at?'':' off')+(at||tx.length>0&&!ph?'':' min')+'" data-tid="'+esc(t.id)+'" data-extra="'+esc(JSON.stringify(Object.keys(t).filter(function(k){return ['id','titulo','opcional'].indexOf(k)<0;}).reduce(function(o,k){o[k]=t[k];return o;},{})))+'"><div class="edt-h"><button class="e-ib edt-tg" data-edtop-tg title="Mostrar ou recolher o texto" aria-label="Mostrar ou recolher o texto">▾</button><input class="edt-t" value="'+esc(t.titulo||t.id)+'" aria-label="Título do tópico"><small class="edt-n">'+(tx?tx.length+' car.':'vazio')+'</small><label class="edck"><input type="checkbox" class="edt-a"'+(at?' checked':'')+'> ativo</label><label class="edck"><input type="checkbox" class="edt-o"'+(t.opcional?' checked':'')+'> opcional</label><span class="edt-b"><button class="e-ib" data-edtop-up title="Subir">↑</button><button class="e-ib" data-edtop-dn title="Descer">↓</button><button class="e-ib" data-edtop-del title="Excluir tópico">✕</button></span></div><textarea class="edt-x ed-auto" rows="2">'+esc(tx)+'</textarea></div>';}
function edLerEsq(r){var era=typeof r.esqueletoModelo==='string',ant=(era?jp(r.esqueletoModelo):r.esqueletoModelo)||{_estrutura:'padrao',_topicos:[]};
  var o=JSON.parse(JSON.stringify(ant)),T=[],vivos={};
  $$('#ed-tops .edt').forEach(function(d,i){var id=d.getAttribute('data-tid')||('t'+Date.now().toString(36)+i),ex=jp(d.getAttribute('data-extra'))||{},orig=(ant._topicos||[]).filter(function(t){return t.id===id;})[0];
    var t=orig?JSON.parse(JSON.stringify(orig)):{id:id};t.titulo=d.querySelector('.edt-t').value.trim()||id;t.opcional=d.querySelector('.edt-o').checked;if(!orig)Object.keys(ex).forEach(function(k){t[k]=ex[k];});T.push(t);vivos[id]=1;
    var b=o[id]&&typeof o[id]==='object'?o[id]:{};b.texto=d.querySelector('.edt-x').value;b.ativo=d.querySelector('.edt-a').checked;o[id]=b;});
  o._topicos=T;(ant._topicos||[]).forEach(function(t){if(!vivos[t.id])delete o[t.id];});
  if(JSON.stringify(o)===JSON.stringify(ant))return r.esqueletoModelo;
  return era||r.esqueletoModelo==null?pyDumps(o):o;}
/* ---------- peça do Editorial: trechos com fórmula, regras e alternativas ---------- */
function edPeca(p){
  var h='<div class="ed-grid"><label class="edf req"><span>Título da peça <i>obrigatório</i></span><input data-pk="t" value="'+esc(p.t||'')+'"></label><label class="edf"><span>Grupo</span><input value="'+esc(p.grupo||'')+'" disabled></label></div><label class="edf"><span>Resumo</span><textarea data-pk="resumo" rows="2" class="ed-auto">'+esc(p.resumo||'')+'</textarea></label><label class="edf"><span>Notas (uma por linha)</span><textarea data-pk="notas" rows="2" class="ed-auto">'+esc((p.notas||[]).join('\n'))+'</textarea></label>';
  h+='<div class="edg"><div class="edgh">Trechos <small>na ordem da folha · '+(p.elementos||[]).length+'</small></div><div id="ed-els">'+(p.elementos||[]).map(edEl).join('')+'</div><button class="e-mini" data-edel-add>+ Trecho</button></div>';
  return h;}
function edEl(e){return '<div class="edt edel" data-orig="'+esc(JSON.stringify(e))+'"><div class="edt-h"><button class="e-ib edt-tg" data-edtop-tg title="Mostrar ou recolher" aria-label="Mostrar ou recolher">▾</button><input class="edt-t" value="'+esc(e.n||'')+'" aria-label="Nome do trecho"><small class="edt-n">'+((e.alts||[]).length?(e.alts.length+' alternativas'):'')+'</small><label class="edck"><input type="checkbox" class="ede-o"'+(e.opc?' checked':'')+'> opcional</label><span class="edt-b"><button class="e-ib" data-edtop-up title="Subir">↑</button><button class="e-ib" data-edtop-dn title="Descer">↓</button><button class="e-ib" data-edtop-del title="Excluir trecho">✕</button></span></div>'+
  '<div class="edt-c"><label class="edf sm"><span>Fórmula</span><textarea class="ede-f ed-auto" rows="2">'+esc(e.f||'')+'</textarea></label><label class="edf sm"><span>Regras (uma por linha)</span><textarea class="ede-r ed-auto" rows="1">'+esc((e.r||[]).join('\n'))+'</textarea></label>'+
  '<div class="ede-alts">'+(e.alts||[]).map(edAlt).join('')+'</div><button class="e-mini" data-edalt-add>+ Alternativa</button></div></div>';}
function edAlt(a){return '<div class="edalt" data-orig="'+esc(JSON.stringify(a))+'"><input class="eda-l" value="'+esc(a.lab||'')+'" placeholder="Rótulo" aria-label="Rótulo da alternativa"><textarea class="eda-f ed-auto" rows="1" placeholder="Texto da alternativa">'+esc(a.f||'')+'</textarea><button class="e-ib" data-edalt-del title="Excluir alternativa">✕</button>'+(a.sub?'<small class="meta">com '+a.sub.length+' subalternativas (mantidas)</small>':'')+'</div>';}
function edLerPeca(p){
  $$('#ed-form [data-pk]').forEach(function(i){var k=i.getAttribute('data-pk');if(k==='notas')p.notas=i.value.split('\n').map(function(x){return x.trim();}).filter(Boolean);else p[k]=i.value;});
  p.elementos=$$('#ed-els .edel').map(function(d){var e=jp(d.getAttribute('data-orig'))||{};e.n=d.querySelector('.edt-t').value.trim();e.f=d.querySelector('.ede-f').value;
    var rr=d.querySelector('.ede-r').value.split('\n').map(function(x){return x.trim();}).filter(Boolean);if(rr.length||'r' in e)e.r=rr;
    var al=$$('.edalt',d).map(function(a){var o=jp(a.getAttribute('data-orig'))||{};o.lab=a.querySelector('.eda-l').value.trim();o.f=a.querySelector('.eda-f').value;return o;}).filter(function(a){return a.lab||a.f;});
    if(al.length)e.alts=al;else delete e.alts;if(d.querySelector('.ede-o').checked)e.opc=true;else delete e.opc;return e;});
  if(!p.t)return 'Informe o título da peça.';return '';}

/* ---------- pré-visualização (lê o formulário, sem aplicar) ---------- */
function edPrevia(){var c=EDS.col,h='';
  if(c==='mod'){$$('#ed-tops .edt').forEach(function(d){if(!d.querySelector('.edt-a').checked)return;var t=d.querySelector('.edt-x').value.trim();if(!t)return;
      h+='<div class="edp-b"><span>'+esc(d.querySelector('.edt-t').value)+'</span>'+t.split(/\n+/).map(function(l){return '<p>'+edMarcaCampos(l)+'</p>';}).join('')+'</div>';});
    return h||'<p class="meta">Nenhum tópico ativo com texto.</p>';}
  if(c==='par'){var t=($('#edf-texto')||{}).value||'';return t.split(/\n+/).map(function(l){return '<p>'+edMarcaCampos(l)+'</p>';}).join('')||'<p class="meta">Sem texto.</p>';}
  if(c==='nor'){var tl=($('#edf-Texto_literal')||{}).value||'';return tl.split(/\n+/).map(function(l){return '<p>'+esc(l)+'</p>';}).join('')||'<p class="meta">Sem texto literal.</p>';}
  if(c==='pec'){$$('#ed-els .edel').forEach(function(d){h+='<div class="edp-b"><span>'+esc(d.querySelector('.edt-t').value)+(d.querySelector('.ede-o').checked?' · opcional':'')+'</span>'+d.querySelector('.ede-f').value.split(/\n+/).filter(Boolean).map(function(l){return '<p>'+edMarcaCampos(l)+'</p>';}).join('')+'</div>';});return h;}
  return '<p class="meta">Sem pré-visualização para diretrizes.</p>';}
function edMarcaCampos(l){return esc(l).replace(/\{\{([^}]*)\}\}|\{([^}|]*)(?:\|([^}]*))?\}|\[([^\]]*)\]/g,function(m,a,b,c2,d){return '<mark class="edp-f">'+esc(a||c2||b||d||'')+'</mark>';});}
function edAtualizaPrevia(){var p=$('#ed-prev');if(p&&EDS.prev)p.innerHTML=edPrevia();}

/* ---------- painel ---------- */
function edAbrir(col,id){if(EDS.dirty&&!edAplicar(true))return;EDS.col=col||EDS.col;EDS.id=id||EDS.id;if(col&&id)EDS.id=id;EDS.conf=null;var o=$('#ed-ov');if(!o){o=document.createElement('div');o.id='ed-ov';o.className='ed-ov';o.setAttribute('role','dialog');o.setAttribute('aria-label','Editor do CMT Compêndio');document.body.appendChild(o);}
  o.hidden=false;document.body.classList.add('ed-on');base().then(function(){edLeRascunho();edRender();}).catch(function(e){o.innerHTML='<p class="empty">Base indisponível ('+esc(e.message)+').</p>';});}
function edFechar(){if(EDS.dirty&&!edAplicar(true))return;var o=$('#ed-ov');if(o)o.hidden=true;document.body.classList.remove('ed-on');}
function edFiltrar(L){var c=EDS.col,f=EDS.f[c],q=nz(EDS.q);
  return L.filter(function(r){
    if(f.so&&!edSit(c,r.id))return false;
    if(c==='mod'){if(f.tipo&&edTipoMod(r)!==f.tipo)return false;if(f.ass&&r.assunto!==f.ass)return false;}
    if(c==='par'){if(f.st&&r.status!==f.st)return false;if(f.cat&&r.categoria!==f.cat)return false;}
    if(c==='dir'&&f.tipo&&r.tipo!==f.tipo)return false;
    if(c==='pec'&&f.g&&r.grupo!==f.g)return false;
    if(c==='nor'&&f.ass&&r['Assunto']!==f.ass)return false;
    if(!q)return true;var x=edRot(c,r);return nz(x.t+' '+x.s+' '+(r.texto||r.fundamentacao||r.preferir||r.resumo||r['Texto literal']||'')).indexOf(q)>=0;});}
function edOpc(L,k,cur,todos){var c={};L.forEach(function(r){var v=typeof k==='function'?k(r):r[k];if(v)c[v]=(c[v]||0)+1;});
  return '<option value="">'+todos+'</option>'+Object.keys(c).sort(function(a,b){return a.localeCompare(b,'pt');}).map(function(v){return '<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(v)+' ('+c[v]+')</option>';}).join('');}
function edFiltrosHtml(L){var c=EDS.col,f=EDS.f[c],h='';
  if(c==='mod')h='<div class="seg ed-seg">'+['','Acórdão','Decisão','Despacho'].map(function(t){var n=t?L.filter(function(r){return edTipoMod(r)===t;}).length:L.length;return '<button data-edf="tipo" data-v="'+t+'" aria-pressed="'+((f.tipo||'')===t)+'">'+(t||'Todos')+' <small>'+n+'</small></button>';}).join('')+'</div><select data-edfs="ass" aria-label="Assunto">'+edOpc(L.filter(function(r){return !f.tipo||edTipoMod(r)===f.tipo;}),'assunto',f.ass,'Todos os assuntos')+'</select>';
  else if(c==='par')h='<select data-edfs="st" aria-label="Situação">'+edOpc(L,function(r){return r.status;},f.st,'Todas as situações')+'</select><select data-edfs="cat" aria-label="Categoria">'+edOpc(L,'categoria',f.cat,'Todas as categorias')+'</select>';
  else if(c==='nor')h='<select data-edfs="ass" aria-label="Assunto">'+edOpc(L,'Assunto',f.ass,'Todos os assuntos')+'</select>';
  else if(c==='dir')h='<select data-edfs="tipo" aria-label="Tipo">'+edOpc(L,'tipo',f.tipo,'Todos os tipos')+'</select>';
  else h='<select data-edfs="g" aria-label="Grupo">'+edOpc(L,'grupo',f.g,'Todos os grupos')+'</select>';
  return '<div class="ed-filt">'+h+'<label class="edck"><input type="checkbox" data-edfso'+(f.so?' checked':'')+'> só com alterações</label></div>';}
function edRender(){
  var o=$('#ed-ov');if(!o)return;var L=edLista(),F=edFiltrar(L),P=edPendentes();
  var top='<div class="ed-top"><b class="ed-tit">Editor</b><div class="seg ed-cols">'+Object.keys(EDCOL).map(function(c){return '<button data-edcol="'+c+'" aria-pressed="'+(EDS.col===c)+'">'+EDCOL[c]+(edSujo(c)?' <i class="ed-dot" title="Com alterações não enviadas"></i>':'')+'</button>';}).join('')+'</div><span style="flex:1"></span>'+
    '<button class="e-mini ed-pend'+(P.length?' on':'')+'" data-edpend title="Ver, abrir e desfazer as alterações">'+(P.length?P.length+(P.length>1?' alterações':' alteração'):'Sem alterações')+'</button><span class="meta">'+(P.length?'guardadas neste navegador':'')+'</span>'+
    '<button class="btn ghost" data-edzip'+(P.length?'':' disabled')+'>Baixar arquivos</button><button class="btn" data-edgit'+(P.length?'':' disabled')+'>Gravar no GitHub</button><button class="e-ib ed-help" data-edhelp title="Atalhos e ajuda" aria-label="Atalhos e ajuda">?</button><button class="e-dx" data-edx title="Fechar o editor (Esc)" aria-label="Fechar o editor">×</button></div>';
  if(EDS.restaura)top+='<div class="ed-rest"><b>Há '+EDS.restaura.n+' alteraç'+(EDS.restaura.n>1?'ões':'ão')+' não enviada'+(EDS.restaura.n>1?'s':'')+'</b> de '+esc(edData(EDS.restaura.d.ts))+'.'+(EDS.restaura.mudou?' A base mudou desde então: confira antes de enviar.':'')+' <button class="e-mini pri" data-edrest>Restaurar</button><button class="e-mini" data-edrestx>Descartar</button></div>';
  var nov=EDS.col==='pec'?'':'<div class="ed-new">'+(EDS.col==='dir'?'<select data-edtipo aria-label="Tipo da diretriz nova">'+Object.keys(ED_DIR).map(function(t){return '<option'+(t===EDS.tipoNovo?' selected':'')+'>'+t+'</option>';}).join('')+'</select>':'')+'<button class="e-mini pri" data-ednovo>+ Novo</button></div>';
  var lst='<aside class="ed-list"><input type="search" id="ed-q" placeholder="Buscar…  ( / )" value="'+esc(EDS.q)+'" aria-label="Buscar registros">'+edFiltrosHtml(L)+nov+'<div class="ed-n">'+F.length+' de '+L.length+'</div><ul role="listbox">'+F.slice(0,500).map(function(r){var x=edRot(EDS.col,r),s=edSit(EDS.col,r.id);return '<li data-edid="'+esc(r.id)+'" class="'+(r.id===EDS.id?'on':'')+'" tabindex="0" role="option" aria-selected="'+(r.id===EDS.id)+'"><b>'+(s?'<i class="ed-sit s-'+s.replace('í','i')+'" title="'+s+'"></i>':'')+esc(x.t.length>90?x.t.slice(0,90)+'…':x.t)+'</b><small>'+esc(x.s)+'</small></li>';}).join('')+(F.length>500?'<li class="meta">Refine a busca para ver os demais.</li>':'')+'</ul></aside>';
  var r=EDS.id&&edAcha(EDS.col,EDS.id);
  var frm='<section class="ed-form'+(EDS.prev?' com-prev':'')+'" id="ed-form">'+(r?edForm(r):'<div class="empty ed-vazio"><p>Escolha um registro à esquerda ou crie um novo.</p><p class="meta">As alterações valem na hora nesta página e ficam guardadas neste navegador até o envio. Use <kbd>Ctrl</kbd>+<kbd>S</kbd> para aplicar.</p></div>')+'</section>';
  var foco=document.activeElement&&document.activeElement.id==='ed-q',pos=foco?document.activeElement.selectionStart:0,sc=$('#ed-form')?$('#ed-form').scrollTop:0,lsc=o.querySelector('.ed-list ul')?o.querySelector('.ed-list ul').scrollTop:0;
  o.innerHTML=top+'<div class="ed-body">'+lst+frm+'</div>'+(EDS.dlg||'');
  EDS.dirty=false;edAutoTodos();edAtualizaPrevia();
  if(foco){var qi=$('#ed-q');qi.focus();try{qi.setSelectionRange(pos,pos);}catch(e){}}
  if(EDS.mantem){$('#ed-form').scrollTop=sc;var ul=o.querySelector('.ed-list ul');if(ul)ul.scrollTop=lsc;EDS.mantem=false;}
  else{var on=o.querySelector('.ed-list li.on');if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest'});}
}
function edData(ts){var d=new Date(ts);return isNaN(d)?ts:d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
function edForm(r){
  var c=EDS.col,s=edSit(c,r.id),h='<div class="ed-fh"><div><span class="e-tag">'+EDCOL[c]+'</span>'+(s?'<span class="e-tag ed-st s-'+s.replace('í','i')+'">'+s+'</span>':'')+'<h3>'+esc(edRot(c,r).t)+'</h3><code>'+esc(r.id)+'</code></div><div class="e-dacts">'+
    '<span class="ed-dirty" id="ed-dirty" hidden>alterações não aplicadas</span><button class="e-mini pri" data-edsalvar title="Aplicar (Ctrl+S)">Aplicar alterações</button>'+
    '<button class="e-mini'+(EDS.prev?' on':'')+'" data-edprev title="Mostrar o texto como fica na peça">Pré-visualizar</button>'+
    (s?'<button class="e-mini" data-eddesf title="Voltar ao que está na base">Desfazer alterações</button>':'')+
    (c!=='pec'?'<button class="e-mini" data-eddup>Duplicar</button>':'')+(c!=='pec'?(EDS.conf===r.id?'<button class="e-mini ed-del" data-eddel2>Confirmar exclusão</button><button class="e-mini" data-edcanc>Cancelar</button>':'<button class="e-mini ed-del" data-eddel>Excluir</button>'):'')+'</div></div>';
  var corpo='';
  if(c==='mod'){var dados='<div class="ed-grid">'+ED_MOD.map(function(f){return edCampo(r,f);}).join('')+'</div>';
    corpo=edEsq(r)+'<details class="edg" open><summary>Ficha do modelo</summary>'+dados+'</details><details class="edg"><summary>Parágrafos alternativos do modelo (JSON, avançado)</summary><textarea id="ed-pm" rows="6" class="mono ed-auto" spellcheck="false">'+esc(typeof r.paragrafosModelo==='string'?r.paragrafosModelo:JSON.stringify(r.paragrafosModelo||[]))+'</textarea></details>';}
  else if(c==='par')corpo='<div class="ed-grid">'+ED_PAR.map(function(f){return edCampo(r,f);}).join('')+'</div><p class="meta">Campos variáveis no texto: {nome} ou {nome|rótulo}; colchetes [ … ] viram campo a preencher.</p>';
  else if(c==='pec')corpo=edPeca(r);
  else if(c==='nor')corpo='<div class="ed-grid">'+ED_NOR.map(function(f){return edCampo(r,f);}).join('')+'</div><p class="meta">Dispositivos que completam as normas do Vade Mecum (apoio/vade-mecum.json); código repetido no Vade Mecum prevalece.</p>';
  else corpo='<div class="ed-grid">'+(ED_DIR[r.tipo]||[]).map(function(f){return edCampo(r,f);}).join('')+'</div>';
  return h+'<div class="ed-fcols"><div class="ed-fmain">'+corpo+'</div>'+(EDS.prev?'<aside class="ed-prev"><div class="edgh">Pré-visualização <small>campos em destaque</small></div><div id="ed-prev" class="serif"></div></aside>':'')+'</div>';}
function edLerForm(r){
  var erro='';
  if(EDS.col==='pec')return edLerPeca(r);
  $$('#ed-form [data-k]').forEach(function(i){var k=i.getAttribute('data-k'),v=i.value;
    if(i.getAttribute('data-json')){if(!v.trim()){delete r[k];return;}try{r[k]=JSON.parse(v);}catch(e){erro='JSON inválido em “'+k+'”.';}return;}
    if(v===''&&!(k in r))return;r[k]=v;});
  if(EDS.col==='mod'){r.esqueletoModelo=edLerEsq(r);var pm=$('#ed-pm');if(pm){try{var pj=JSON.parse(pm.value||'[]'),pa=typeof r.paragrafosModelo==='string'?jp(r.paragrafosModelo):r.paragrafosModelo;if(JSON.stringify(pj)!==JSON.stringify(pa))r.paragrafosModelo=typeof r.paragrafosModelo==='string'?pyDumps(pj):pj;}catch(e){erro='JSON inválido nos parágrafos alternativos.';}}
    if(r.dataReferencia&&!/^\d{4}-\d{2}-\d{2}$/.test(r.dataReferencia))erro='Data de referência no formato AAAA-MM-DD.';if(!r.assunto)erro='Informe o assunto.';if(!r.nomeModelo)erro='Informe o nome do modelo.';}
  if(EDS.col==='par'&&(!r.titulo||!r.texto))erro='Título e texto são obrigatórios.';
  if(EDS.col==='nor'){if(!r['Código']||!r['Norma']||!r['Dispositivo']||!r['Diploma'])erro='Código, diploma, norma e dispositivo são obrigatórios.';
    else if(r['Código']!==r.id&&EDS.orig.nor[r.id]!=='__novo__')erro='O código de norma já gravada não muda: use Duplicar, ajuste o código na cópia e exclua a antiga.';else if(r['Código']!==r.id&&edAcha('nor',r['Código']))erro='Já existe a norma de código '+r['Código']+'.';else r.id=r['Código'];}
  if(EDS.col==='par'&&!r.categoria)r.categoria=[r.nivelCategoria,r.nivelSubsecao].filter(Boolean).join(' › ')||'Genéricos';
  return erro;}
/* aplica o formulário aberto; silencioso = chamado ao trocar de registro, fechar ou enviar */
function edAplicar(silencioso){var r=EDS.id&&edAcha(EDS.col,EDS.id);if(!r){EDS.dirty=false;return true;}
  var antes=edJ(r),copia=JSON.parse(antes),er=edLerForm(copia);
  if(er){toast(er);var d=$('#ed-dirty');if(d){d.hidden=false;d.textContent=er;}return false;}
  if(edJ(copia)!==antes){if(EDS.col==='mod')copia.atualizadoEm=edAgora();edToca(EDS.col,r);
    if(copia.id!==r.id){var oc=EDS.orig[EDS.col];delete oc[r.id];oc[copia.id]='__novo__';EDS.id=copia.id;}
    edPoe(r,copia);edAtualizaVista();edGuarda();if(!silencioso)toast('Alterações aplicadas e guardadas neste navegador');}
  else if(!silencioso)toast('Nada mudou');
  EDS.dirty=false;return true;}
function edMarcaSujo(){if(EDS.dirty)return;EDS.dirty=true;var d=$('#ed-dirty');if(d){d.hidden=false;d.textContent='alterações não aplicadas';}var b=$('[data-edsalvar]');if(b)b.classList.add('pulse');$$('[data-edgit],[data-edzip]').forEach(function(x){x.disabled=false;});}
function edAtualizaVista(){try{PRECP=null;PRECI=null;if(!$('#v-edit').hidden)xRender();}catch(e){}}
function edNovo(){if(EDS.dirty&&!edAplicar(true))return;var c=EDS.col,L=edLista(),r;
  if(c==='mod'){var ref=L.filter(function(m){var e=jp(m.esqueletoModelo);return e&&e._estrutura==='padrao';})[0],e=ref?jp(ref.esqueletoModelo):{_estrutura:'padrao',_topicos:[]},o={_estrutura:e._estrutura,_topicos:e._topicos};(e._topicos||[]).forEach(function(t){o[t.id]={texto:t.id==='fecho'?'É como voto.':'',ativo:!t.opcional};});
    var tp=EDS.f.mod.tipo==='Decisão'?'decisao':EDS.f.mod.tipo==='Despacho'?'despacho':'voto-matriz';
    r={id:'mod-modelo-ed-'+Date.now().toString(36),processo:'',tipo:'Modelo',pronunciamento:tp==='voto-matriz'?'Voto':tp==='despacho'?'Despacho':'Decisão monocrática terminativa',especie:'',assunto:EDS.f.mod.ass||'',temas:'',tese:'',fundamentacao:'',especificidades:'',resultado:'',fonte:'Editor do CMT Compêndio',formatoModelo:'Modelo-matriz',nomeModelo:'Novo modelo-matriz',textoModelo:'',esqueletoModelo:JSON.stringify(o),paragrafosModelo:'[]',classe:'',classeSigla:'',statusCuradoria:'',especieModelo:tp,dataReferencia:edHoje(),atualizadoEm:edAgora(),historico:[]};}
  else if(c==='nor'){var cn='NOVA-'+Date.now().toString(36).toUpperCase();r={id:cn,'Código':cn,'Diploma':'','Nome do diploma':'','Norma':'','Dispositivo':'','Assunto':EDS.f.nor.ass||'','Texto literal':'','Observação':''};}
  else if(c==='par')r={id:'par.'+Date.now().toString(36),categoria:EDS.f.par.cat||'Genéricos',titulo:'Novo parágrafo-padrão',status:EDS.f.par.st||'padrao',texto:'',nivelTema:'',nivelEspecificidade:'',nivelCategoria:'Genéricos',nivelSubsecao:''};
  else{var t=EDS.tipoNovo,pre=ED_DIRPRE[t],mx=0;L.forEach(function(x){if(x.id.indexOf(pre)===0){var n=parseInt(x.id.slice(pre.length),10);if(n>mx)mx=n;}});r={id:pre+String(mx+1).padStart(2,'0'),tipo:t};ED_DIR[t].forEach(function(f){r[f[0]]='';});}
  L.unshift(r);edToca(c,r,true);EDS.id=r.id;EDS.q='';edAtualizaVista();edGuarda();edRender();var p=$('#ed-form input, #ed-form textarea');if(p)p.focus();}
function edDup(r){if(EDS.dirty&&!edAplicar(true))return;var c=EDS.col,n=JSON.parse(JSON.stringify(r,function(k,v){return k.charAt(0)==='_'&&k!=='_topicos'&&k!=='_estrutura'?undefined:v;}));
  if(c==='mod'){n.id='mod-modelo-ed-'+Date.now().toString(36);n.nomeModelo=(n.nomeModelo||'')+' (cópia)';n.atualizadoEm=edAgora();n.historico=[];}
  else if(c==='nor'){n.id=r.id+'-C'+Date.now().toString(36).slice(-3).toUpperCase();n['Código']=n.id;}
  else if(c==='par'){n.id=r.id+'.c'+Date.now().toString(36).slice(-3);n.titulo=(n.titulo||'')+' (cópia)';}
  else{var pre=ED_DIRPRE[r.tipo]||'red-x-',mx=0;edLista().forEach(function(x){if(x.id.indexOf(pre)===0){var k=parseInt(x.id.slice(pre.length),10);if(k>mx)mx=k;}});n.id=pre+String(mx+1).padStart(2,'0');}
  var L=edLista();L.splice(L.indexOf(r)+1,0,n);edToca(c,n,true);EDS.id=n.id;edAtualizaVista();edGuarda();edRender();toast('Cópia criada: '+n.id);}
function edDlgPend(){var P=edPendentes();return '<div class="ed-dlg" role="dialog" aria-label="Alterações não enviadas"><div class="ed-dlgc"><h3>Alterações não enviadas</h3>'+(P.length?'<p class="meta">Ficam guardadas neste navegador até o envio ao GitHub ou o download dos arquivos.</p><ul class="ed-pl">'+P.map(function(p){return '<li><span class="e-tag ed-st s-'+p.sit.replace('í','i')+'">'+p.sit+'</span><b>'+esc(p.t.slice(0,90))+'</b><small>'+esc(EDCOL[p.col])+' · '+esc(p.id)+'</small><span class="e-dacts">'+(p.sit!=='excluído'?'<button class="e-mini" data-edpabre="'+p.col+'|'+esc(p.id)+'">Abrir</button>':'')+'<button class="e-mini" data-edpdesf="'+p.col+'|'+esc(p.id)+'">Desfazer</button></span></li>';}).join('')+'</ul><div class="e-dacts"><button class="btn ghost" data-edpdall>Desfazer todas</button><button class="btn" data-eddlgx>Fechar</button></div>':'<p>Nenhuma alteração pendente.</p><div class="e-dacts"><button class="btn" data-eddlgx>Fechar</button></div>')+'</div></div>';}
function edDlgAjuda(){return '<div class="ed-dlg" role="dialog" aria-label="Ajuda do editor"><div class="ed-dlgc"><h3>Como funciona o editor</h3><ul class="ed-logl"><li>Edite à vontade: ao trocar de registro, de coleção ou fechar, o que está no formulário é aplicado sozinho.</li><li>Tudo o que foi aplicado fica guardado <b>neste navegador</b>, mesmo se a página for recarregada, até ser enviado.</li><li>“Alterações” lista o que mudou, com opção de abrir ou desfazer cada item.</li><li>Para gravar na base: <b>Enviar ao GitHub</b> (commit direto) ou <b>Baixar arquivos</b> (.zip nos caminhos do repositório).</li></ul><h3>Atalhos</h3><ul class="ed-logl"><li><kbd>@@</kbd> dentro de um texto: inserir variável do caso ({{CLASSE}}, {{ASSUNTO}}, {{RAMO}}, {{polo ativo}}…), que se preenche sozinha com o processo informado · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd> transformar a seleção em campo {{ }}</li><li><kbd>Ctrl</kbd>+<kbd>S</kbd> aplicar · <kbd>/</kbd> buscar · <kbd>↑</kbd> <kbd>↓</kbd> navegar na lista · <kbd>Enter</kbd> abrir · <kbd>Alt</kbd>+<kbd>N</kbd> novo · <kbd>Esc</kbd> fechar</li></ul><div class="e-dacts"><button class="btn" data-eddlgx>Fechar</button></div></div></div>';}
/* caixas de texto que acompanham o conteúdo */
function edAuto(t){if(!t||!t.classList||!t.classList.contains('ed-auto'))return;t.style.height='auto';t.style.height=Math.min(Math.max(t.scrollHeight+2,38),window.innerHeight*0.7)+'px';}
function edAutoTodos(){$$('#ed-form textarea.ed-auto').forEach(function(t){if(!t.closest('.min'))edAuto(t);});}
function edVai(id){if(id===EDS.id)return;if(EDS.dirty&&!edAplicar(true))return;EDS.id=id;EDS.conf=null;EDS.mantem=true;edRender();var f=$('#ed-form');if(f)f.scrollTop=0;}
document.addEventListener('click',function(e){
  var o=e.target.closest('#ed-ov');var b;
  if((b=e.target.closest('[data-edmod]'))){e.preventDefault();edAbrir('mod',b.getAttribute('data-edmod'));return;}
  if((b=e.target.closest('[data-edpar]'))){e.preventDefault();edAbrir('par',b.getAttribute('data-edpar'));return;}
  if((b=e.target.closest('[data-edpec]'))){e.preventDefault();edAbrir('pec',b.getAttribute('data-edpec'));return;}
  if(e.target.closest('[data-edabre]')){edAbrir();return;}
  if(!o)return;
  if(e.target.closest('[data-edx]')){edFechar();return;}
  if((b=e.target.closest('[data-edcol]'))){if(EDS.dirty&&!edAplicar(true))return;EDS.col=b.getAttribute('data-edcol');EDS.id=null;EDS.q='';EDS.conf=null;edRender();return;}
  if((b=e.target.closest('[data-edid]'))){edVai(b.getAttribute('data-edid'));return;}
  if(e.target.closest('[data-ednovo]')){edNovo();return;}
  if((b=e.target.closest('[data-edf]'))){var c0=EDS.col;EDS.f[c0][b.getAttribute('data-edf')]=b.getAttribute('data-v');if(b.getAttribute('data-edf')==='tipo')EDS.f[c0].ass='';EDS.mantem=false;edRender();return;}
  if(e.target.closest('[data-edrest]')){edRestaura();edRender();return;}
  if(e.target.closest('[data-edrestx]')){edDescartaRascunho();edRender();return;}
  if(e.target.closest('[data-edpend]')){if(EDS.dirty&&!edAplicar(true))return;EDS.dlg=edDlgPend();edRender();return;}
  if(e.target.closest('[data-edhelp]')){EDS.dlg=edDlgAjuda();EDS.mantem=true;edRender();return;}
  if((b=e.target.closest('[data-edpabre]'))){var pa=b.getAttribute('data-edpabre').split('|');EDS.dlg='';EDS.col=pa[0];EDS.id=pa.slice(1).join('|');EDS.q='';edRender();return;}
  if((b=e.target.closest('[data-edpdesf]'))){var pd=b.getAttribute('data-edpdesf').split('|');edDesfaz(pd[0],pd.slice(1).join('|'));EDS.dlg=edDlgPend();edRender();toast('Alteração desfeita');return;}
  if(e.target.closest('[data-edpdall]')){edPendentes().forEach(function(p){edDesfaz(p.col,p.id);});EDS.dlg=edDlgPend();edRender();toast('Todas as alterações desfeitas');return;}
  var L=edLista(),r=EDS.id&&edAcha(EDS.col,EDS.id);
  if(e.target.closest('[data-edsalvar]')&&r){if(edAplicar(false)){EDS.mantem=true;edRender();}return;}
  if(e.target.closest('[data-edprev]')){EDS.prev=!EDS.prev;var dd=EDS.dirty;if(dd&&!edAplicar(true))return;EDS.mantem=true;edRender();return;}
  if(e.target.closest('[data-eddesf]')&&r){edDesfaz(EDS.col,r.id);EDS.mantem=true;edRender();toast('Registro voltou ao que está na base');return;}
  if(e.target.closest('[data-eddup]')&&r){edDup(r);return;}
  if(e.target.closest('[data-eddel]')){EDS.conf=EDS.id;EDS.mantem=true;var dd2=EDS.dirty;edRender();return;}
  if(e.target.closest('[data-edcanc]')){EDS.conf=null;EDS.mantem=true;edRender();return;}
  if(e.target.closest('[data-eddel2]')&&r){edToca(EDS.col,r);EDS.pos=EDS.pos||{};EDS.pos[EDS.col+'|'+r.id]=L.indexOf(r);L.splice(L.indexOf(r),1);EDS.id=null;EDS.conf=null;EDS.dirty=false;edAtualizaVista();edGuarda();edRender();toast('Registro excluído nesta página; dá para desfazer em “Alterações”');return;}
  if(e.target.closest('[data-edtop-add]')){$('#ed-tops').insertAdjacentHTML('beforeend',edTop({id:'t'+Date.now().toString(36),titulo:'Novo tópico'},{texto:'',ativo:true},0));edMarcaSujo();var nt=$('#ed-tops .edt:last-child .edt-x');if(nt)nt.focus();return;}
  if(e.target.closest('[data-edel-add]')){$('#ed-els').insertAdjacentHTML('beforeend',edEl({n:'Novo trecho',f:'',r:[],fo:'M'}));edMarcaSujo();return;}
  if((b=e.target.closest('[data-edalt-add]'))){b.previousElementSibling.insertAdjacentHTML('beforeend',edAlt({lab:'',f:''}));edMarcaSujo();return;}
  if((b=e.target.closest('[data-edalt-del]'))){b.closest('.edalt').remove();edMarcaSujo();edAtualizaPrevia();return;}
  if((b=e.target.closest('[data-edtop-tg]'))){var tg=b.closest('.edt');tg.classList.toggle('min');edAuto(tg.querySelector('textarea'));return;}
  if((b=e.target.closest('[data-edtop-all]'))){var ab=b.getAttribute('data-edtop-all')==='1';$$('#ed-tops .edt').forEach(function(d){d.classList.toggle('min',!ab&&!d.querySelector('.edt-a').checked);});edAutoTodos();return;}
  if((b=e.target.closest('[data-edtop-up]'))){var d=b.closest('.edt');if(d.previousElementSibling){d.parentNode.insertBefore(d,d.previousElementSibling);edMarcaSujo();edAtualizaPrevia();}return;}
  if((b=e.target.closest('[data-edtop-dn]'))){var d2=b.closest('.edt');if(d2.nextElementSibling){d2.parentNode.insertBefore(d2.nextElementSibling,d2);edMarcaSujo();edAtualizaPrevia();}return;}
  if((b=e.target.closest('[data-edtop-del]'))){b.closest('.edt').remove();edMarcaSujo();edAtualizaPrevia();return;}
  if(e.target.closest('[data-edzip]')){if(EDS.dirty&&!edAplicar(true))return;edZip();return;}
  if(e.target.closest('[data-edgit]')){if(EDS.dirty&&!edAplicar(true))return;EDS.dlg=edDlgToken();edRender();var t=$('#ed-tok')||$('#ed-msg');if(t)t.focus();return;}
  if(e.target.closest('[data-eddlgx]')){EDS.dlg='';EDS.mantem=true;edRender();return;}
  if(e.target.closest('[data-edenviar]')){if(edSrv()){edEnviarSrv(($('#ed-msg')||{}).value||'');return;}var tk=$('#ed-tok');if(tk&&tk.value.trim())EDS.token=tk.value.trim();if(!EDS.token){toast('Informe o token');return;}var msg=($('#ed-msg')||{}).value||'';edEnviar(msg);return;}
});
var edPrevT;
document.addEventListener('input',function(e){
  if(e.target.id==='ed-q'){clearTimeout(edRender._t);var v=e.target.value;edRender._t=setTimeout(function(){EDS.q=v;edRender();},160);return;}
  if(e.target.closest&&e.target.closest('#ed-form')){edMarcaSujo();edAuto(e.target);var tt=e.target.closest('.edt');if(tt&&e.target.classList.contains('edt-x')){var n=tt.querySelector('.edt-n');if(n)n.textContent=e.target.value?e.target.value.length+' car.':'vazio';}
    clearTimeout(edPrevT);edPrevT=setTimeout(edAtualizaPrevia,250);}
});
document.addEventListener('change',function(e){var t=e.target;if(!t.closest||!t.closest('#ed-ov'))return;
  if(t.matches('[data-edtipo]')){EDS.tipoNovo=t.value;return;}
  if(t.matches('[data-edfs]')){EDS.f[EDS.col][t.getAttribute('data-edfs')]=t.value;edRender();return;}
  if(t.matches('[data-edfso]')){EDS.f[EDS.col].so=t.checked;edRender();return;}
  if(t.closest('#ed-form')){edMarcaSujo();if(t.classList.contains('edt-a')){var d=t.closest('.edt');d.classList.toggle('off',!t.checked);}edAtualizaPrevia();}});
document.addEventListener('keydown',function(e){var o=$('#ed-ov');if(!o||o.hidden)return;
  if((e.ctrlKey||e.metaKey)&&(e.key==='s'||e.key==='S')){e.preventDefault();if(EDS.id&&edAplicar(false)){EDS.mantem=true;edRender();}return;}
  if(e.altKey&&(e.key==='n'||e.key==='N')&&EDS.col!=='pec'){e.preventDefault();edNovo();return;}
  if(e.key==='Escape'){if(EDS.dlg){EDS.dlg='';EDS.mantem=true;edRender();}else edFechar();return;}
  var ed=/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'');
  if(e.key==='/'&&!ed){e.preventDefault();var q=$('#ed-q');if(q)q.focus();return;}
  var li=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.ed-list li[data-edid]');
  if(li&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();var n=e.key==='ArrowDown'?li.nextElementSibling:li.previousElementSibling;if(n&&n.getAttribute('data-edid'))n.focus();return;}
  if(li&&e.key==='Enter'){e.preventDefault();var id=li.getAttribute('data-edid');edVai(id);var nl=document.querySelector('.ed-list li[data-edid="'+CSS.escape(id)+'"]');if(nl)nl.focus();return;}
  if(document.activeElement&&document.activeElement.id==='ed-q'&&e.key==='ArrowDown'){var f1=$('.ed-list li[data-edid]');if(f1){e.preventDefault();f1.focus();}}
});
window.addEventListener('beforeunload',function(e){if(EDS.dirty){edAplicar(true);}if(edPendentes().length){e.preventDefault();e.returnValue='';}});
/* ---------- arquivos da base ---------- */
function edLimpa(x){return JSON.parse(JSON.stringify(x,function(k,v){return k.charAt(0)==='_'&&k!=='_topicos'&&k!=='_estrutura'?undefined:v;}));}
function edArquivo(c){var a=EDM.arquivos[EDARQ[c]],agora=edAgora();
  if(c==='mod')return {path:a.path,txt:JSON.stringify({schema:a.head.schema,versao:a.head.versao,atualizadoEm:agora,registros:edLimpa(BASE.mod)},null,1)+'\n'};
  if(c==='par')return {path:a.path,txt:JSON.stringify({schema:a.head.schema,versao:a.head.versao,atualizadoEm:agora,registros:edLimpa(BASE.par)},null,1)+'\n'};
  if(c==='pec')return {path:a.path,txt:JSON.stringify(ED.pecas,null,2)+'\n'};
  if(c==='nor'){var o={};Object.keys(a.head).forEach(function(k){o[k]=a.head[k];});o.atualizadoEm=agora.slice(0,10);o.registros=edLimpa(edListaDe('nor'));return {path:a.path,txt:JSON.stringify(o,null,1)+'\n'};}
  return {path:a.path,txt:JSON.stringify({schema:ED.padrao.schema,versao:ED.padrao.versao,atualizadoEm:agora,registros:ED.padrao.registros},null,1)+'\n'};}
function edMudados(){return Object.keys(EDARQ).filter(edSujo).map(edArquivo);}
function edZip(){var F=edMudados();if(!F.length)return;var bl=zipStore(F.map(function(f){return {n:f.path,d:f.txt};}));baixarBlob(new Blob([bl],{type:'application/zip'}),'cmt-compendio-alteracoes-'+edHoje()+'.zip');toast('Arquivos gerados nos caminhos do repositório; o rascunho continua guardado até o envio');}
function edResumo(){var c={};edPendentes().forEach(function(l){var k=EDCOL[l.col];c[k]=(c[k]||0)+1;});return Object.keys(c).map(function(k){return k.toLowerCase()+': '+c[k];}).join('; ');}
function edDlgToken(){var F=edMudados(),P=edPendentes();return '<div class="ed-dlg" role="dialog" aria-label="Gravar no GitHub"><div class="ed-dlgc"><h3>Gravar no GitHub</h3><p class="meta">Um commit em <b>'+esc(EDM.repo)+'</b> ('+esc(EDM.ramo)+') com '+F.map(function(f){return '<code>'+esc(f.path)+'</code>';}).join(', ')+'. Em seguida o GitHub valida a base e reconstrói o Compêndio.</p>'+
  '<ul class="ed-logl">'+P.slice(0,14).map(function(l){return '<li>'+esc(EDCOL[l.col])+' · '+esc(l.sit)+' · '+esc(l.t.slice(0,70))+'</li>';}).join('')+(P.length>14?'<li>+ '+(P.length-14)+'</li>':'')+'</ul>'+
  '<label class="edf"><span>Descrição do commit</span><input id="ed-msg" value="'+esc('Editor do CMT Compêndio: '+edResumo())+'"></label>'+(edSrv()?'<p class="meta">Gravação pelo site do gabinete, em nome de <b>'+esc(window.CMT_ACESSO().usuario)+'</b>.</p>':EDS.token?'<p class="meta">Token desta sessão já informado.</p>':'<label class="edf"><span>Token do GitHub (permissão Contents: leitura e escrita no repositório). Fica só na memória desta aba.</span><input id="ed-tok" type="password" autocomplete="off"></label>')+
  '<div class="e-dacts"><button class="btn" data-edenviar>Enviar</button><button class="btn ghost" data-eddlgx>Cancelar</button></div><p class="meta" id="ed-st"></p></div></div>';}
function edGh(caminho,opt){opt=opt||{};return fetch('https://api.github.com/repos/'+EDM.repo+'/'+caminho,{method:opt.method||'GET',cache:'no-store',headers:Object.assign({'Accept':'application/vnd.github+json','Authorization':'Bearer '+EDS.token,'X-GitHub-Api-Version':'2022-11-28'},opt.body?{'Content-Type':'application/json'}:{}),body:opt.body?JSON.stringify(opt.body):undefined}).then(function(r){if(!r.ok)return r.text().then(function(t){var m='';try{m=JSON.parse(t).message;}catch(e){m=t.slice(0,120);}throw new Error(r.status+' '+m);});return r.json();});}
/* envio pelo servidor: só as operações (registro como está agora e como estava ao ser tocado); o servidor confere conflitos e faz o commit */
function edEnviarSrv(msg){var P=edPendentes();if(!P.length)return;var C={};
  P.forEach(function(p){var L=edListaDe(p.col),cur=edAcha(p.col,p.id);(C[p.col]=C[p.col]||[]).push(p.sit==='excluído'?{op:'del',id:p.id,orig:EDS.orig[p.col][p.id]}:{op:'set',id:p.id,rec:edLimpa(cur),orig:EDS.orig[p.col][p.id],idx:L.indexOf(cur)});});
  var bt=$('[data-edenviar]');if(bt)bt.disabled=true;edSt('Gravando…');
  fetch('/api/editor',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({msg:msg,colecoes:C})})
  .then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok)throw new Error(j.erro||('HTTP '+r.status));return j;});})
  .then(function(j){EDS.orig={mod:{},par:{},pec:{},dir:{},nor:{}};edGuarda();
    EDS.dlg='<div class="ed-dlg"><div class="ed-dlgc"><h3>Gravado</h3><p>'+j.alteracoes+' alteraç'+(j.alteracoes>1?'ões':'ão')+' no commit <a href="'+esc(j.url)+'" target="_blank" rel="noopener">'+esc(String(j.commit).slice(0,7))+'</a>. O GitHub valida a base e reconstrói o Compêndio em alguns minutos; até lá, esta página mostra a versão editada.</p><div class="e-dacts"><button class="btn" data-eddlgx>Fechar</button></div></div></div>';edRender();})
  .catch(function(e){edSt('Não foi possível gravar: '+e.message);if(bt)bt.disabled=false;});}
function edSt(t){var s=$('#ed-st');if(s)s.textContent=t;}
function edEnviar(msg){
  var F=edMudados();if(!F.length)return;var ref,tree;edSt('Conferindo a versão no GitHub…');
  Promise.all(F.map(function(f){var a=Object.keys(EDM.arquivos).map(function(k){return EDM.arquivos[k];}).filter(function(x){return x.path===f.path;})[0];
      return edGh('contents/'+f.path+'?ref='+EDM.ramo).then(function(j){if(a&&a.sha&&j.sha!==a.sha)throw new Error('“'+f.path+'” mudou no GitHub depois que esta página foi gerada. As alterações continuam guardadas neste navegador: abra a versão atualizada do Compêndio e restaure o rascunho, ou baixe os arquivos.');});}))
  .then(function(){edSt('Gravando…');return edGh('git/ref/heads/'+EDM.ramo);})
  .then(function(j){ref=j.object.sha;return edGh('git/commits/'+ref);})
  .then(function(j){tree=j.tree.sha;return Promise.all(F.map(function(f){return edGh('git/blobs',{method:'POST',body:{content:f.txt,encoding:'utf-8'}}).then(function(b){return {path:f.path,mode:'100644',type:'blob',sha:b.sha};});}));})
  .then(function(T){return edGh('git/trees',{method:'POST',body:{base_tree:tree,tree:T}}).then(function(t){return {t:t,T:T};});})
  .then(function(x){return edGh('git/commits',{method:'POST',body:{message:(msg||'Editor do CMT Compêndio')+'\n\nAlterações feitas no editor do CMT Compêndio.',tree:x.t.sha,parents:[ref]}}).then(function(c){return {c:c,T:x.T};});})
  .then(function(x){return edGh('git/refs/heads/'+EDM.ramo,{method:'PATCH',body:{sha:x.c.sha}}).then(function(){return x;});})
  .then(function(x){x.T.forEach(function(t){Object.keys(EDM.arquivos).forEach(function(k){if(EDM.arquivos[k].path===t.path)EDM.arquivos[k].sha=t.sha;});});
    EDS.orig={mod:{},par:{},pec:{},dir:{},nor:{}};edGuarda();EDS.dlg='<div class="ed-dlg"><div class="ed-dlgc"><h3>Enviado</h3><p>Commit <a href="'+esc(x.c.html_url||('https://github.com/'+EDM.repo+'/commit/'+x.c.sha))+'" target="_blank" rel="noopener">'+esc(x.c.sha.slice(0,7))+'</a> gravado em '+esc(EDM.ramo)+'. O GitHub valida a base e reconstrói o Compêndio em alguns minutos.</p><div class="e-dacts"><button class="btn" data-eddlgx>Fechar</button></div></div></div>';edRender();})
  .catch(function(e){edSt('Não foi possível enviar: '+e.message);if(/^401|^403/.test(e.message))EDS.token='';});}
document.body.classList.add('vdm-ed');
/* entrada pelo cabeçalho; aviso de rascunho guardado; na página do editor, abre sozinho (registro indicado no endereço: #mod=id) */
(function(){var h=$('#theme');var b='<button class="btn ed-btn" data-edabre title="Adicionar, editar e excluir modelos-matriz, parágrafos-padrão, peças do Editorial, diretrizes e normas">Editor</button>';if(h)h.insertAdjacentHTML('beforebegin',b);else document.body.insertAdjacentHTML('afterbegin',b);
  try{var d=JSON.parse(localStorage.getItem(EDK)||'null');if(d&&d.cols){var n=0;Object.keys(d.cols).forEach(function(c){n+=Object.keys(d.cols[c]).length;});if(n){var bt=document.querySelector('[data-edabre]');if(bt){bt.insertAdjacentHTML('beforeend',' <i class="ed-badge" title="Alterações guardadas e não enviadas">'+n+'</i>');}}}}catch(e){}
  function alvo(){var m=/^#(mod|par|pec|dir|nor)=(.+)$/.exec(location.hash||'');return m?[m[1],decodeURIComponent(m[2])]:[];}
  function semAcesso(){var o=$('#ed-ov');if(!o){o=document.createElement('div');o.id='ed-ov';o.className='ed-ov';document.body.appendChild(o);}o.hidden=false;document.body.classList.add('ed-on');
    var A=window.CMT_ACESSO?window.CMT_ACESSO():{};o.innerHTML='<div class="ed-top"><b class="ed-tit">Editor</b><span style="flex:1"></span><a class="btn ghost" href="/compendio/">Ir para o Compêndio</a></div><div class="empty ed-vazio"><p>'+(A.usuario?'O login <b>'+esc(A.usuario)+'</b> não tem acesso de editor.':'Entre com o login da Pauta da equipe para editar.')+'</p><p class="meta">Quem edita está em apoio/acessos.json, no procs-muta.</p>'+(A.usuario?'':'<p><button class="btn" data-acentra>Entrar</button></p>')+'</div>';}
  if(!window.VDM_PAGINA_EDITOR)return;
  function abre(){var a=alvo();if(edSrv()||!window.CMT_SITE){var o=$('#ed-ov');if(o&&!o.querySelector('.ed-body'))o.remove();edAbrir(a[0],a[1]);}else semAcesso();}
  document.addEventListener('cmt-acesso',abre);window.addEventListener('hashchange',function(){var a=alvo();if(a.length&&(edSrv()||!window.CMT_SITE))edAbrir(a[0],a[1]);});})();
/* ---------- campos preenchíveis e variáveis do caso: barra sobre o texto em edição e atalho @@ ---------- */
var EDV={ta:null,ini:-1,q:'',sel:0,itens:[]};
function edTxtAlvo(t){return t&&t.tagName==='TEXTAREA'&&t.closest&&t.closest('#ed-form')&&!t.classList.contains('mono');}
function edUsados(){var c={};edLista().forEach(function(r){var s=EDS.col==='mod'?r.esqueletoModelo:EDS.col==='par'?r.texto:EDS.col==='pec'?JSON.stringify(r.elementos||[]):'';String(s||'').replace(/\{\{([^}]{1,60})\}\}/g,function(m,a){a=a.trim();c[a]=(c[a]||0)+1;});});
  return Object.keys(c).sort(function(a,b){return c[b]-c[a];}).slice(0,40);}
function edVarsLista(q){var V=(window.VDM_varsCaso?window.VDM_varsCaso():[]).map(function(v){return {nome:v.nome,d:v.d,v:v.v,g:'Variáveis do caso'};}),nomes={};V.forEach(function(v){nomes[v.nome]=1;});
  edUsados().forEach(function(n){if(!nomes[n])V.push({nome:n,d:'Campo já usado nesta coleção',v:'',g:'Campos já usados'});});
  var qq=nz(q||'').trim();if(!qq)return V.slice(0,30);
  function nota(v){var n=nz(v.nome);return n.indexOf(qq)===0?0:n.split(/[^a-z0-9]+/).some(function(w){return w.indexOf(qq)===0;})?1:n.indexOf(qq)>=0?2:nz(v.d).indexOf(qq)>=0?3:9;}
  return V.map(function(v){return [nota(v),v];}).filter(function(x){return x[0]<9;}).sort(function(a,b){return a[0]-b[0];}).map(function(x){return x[1];}).slice(0,30);}
function edInsere(ta,txt,selIni,selFim){var a=ta.selectionStart,b=ta.selectionEnd;ta.focus();ta.setRangeText(txt,a,b,'end');if(selIni!=null)ta.setSelectionRange(a+selIni,a+selFim);ta.dispatchEvent(new Event('input',{bubbles:true}));}
function edCampoNovo(ta){var a=ta.selectionStart,b=ta.selectionEnd,s=ta.value.slice(a,b);if(s){edInsere(ta,'{{'+s.trim()+'}}');}else edInsere(ta,'{{campo}}',2,7);}
function edTbMostra(ta){var tb=$('#ed-tb');if(!tb){tb=document.createElement('div');tb.id='ed-tb';tb.className='ed-tb';tb.setAttribute('role','toolbar');tb.setAttribute('aria-label','Inserir campos');
    tb.innerHTML='<button data-edtb="campo" title="Transforma a seleção em campo a preencher, ou insere um campo novo">{{ }} Campo</button><button data-edtb="var" title="Inserir variável preenchida com os dados do caso (atalho: @@)">@@ Variável do caso</button><button data-edtb="ID" title="Inserir [ID]">[ID]</button><button data-edtb="DATA" title="Inserir [DATA]">[DATA]</button><button data-edtb="VALIDAR" title="Marcar trecho a validar">[VALIDAR]</button>';
    tb.addEventListener('mousedown',function(e){e.preventDefault();});document.body.appendChild(tb);}
  EDV.ta=ta;var r=ta.getBoundingClientRect();tb.hidden=false;tb.style.top=Math.max(4,r.top-tb.offsetHeight-4)+'px';tb.style.left=Math.max(4,Math.min(r.left,window.innerWidth-tb.offsetWidth-8))+'px';}
function edTbEsconde(){var tb=$('#ed-tb');if(tb)tb.hidden=true;}
function edCaret(ta){var m=document.createElement('div'),cs=getComputedStyle(ta);['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','border','boxSizing','whiteSpace','wordWrap','width'].forEach(function(k){m.style[k]=cs[k];});
  m.style.position='absolute';m.style.visibility='hidden';m.style.whiteSpace='pre-wrap';m.style.wordWrap='break-word';m.textContent=ta.value.slice(0,ta.selectionStart);var sp=document.createElement('span');sp.textContent='​';m.appendChild(sp);document.body.appendChild(m);
  var r=ta.getBoundingClientRect(),x=r.left+sp.offsetLeft-ta.scrollLeft,y=r.top+sp.offsetTop-ta.scrollTop+parseFloat(cs.lineHeight||'18');m.remove();return {x:x,y:y};}
function edVmAbre(ta,ini,q){EDV.ta=ta;EDV.ini=ini;EDV.q=q;EDV.sel=0;EDV.itens=edVarsLista(q);var m=$('#ed-vm');if(!m){m=document.createElement('div');m.id='ed-vm';m.className='ed-vm';m.setAttribute('role','listbox');m.addEventListener('mousedown',function(e){e.preventDefault();var b=e.target.closest('[data-vi]');if(b)edVmEscolhe(+b.getAttribute('data-vi'));});document.body.appendChild(m);}
  if(!EDV.itens.length){m.innerHTML='<div class="ed-vm-v">Nenhuma variável com “'+esc(q)+'”. Enter cria o campo {{'+esc(q||'campo')+'}}.</div>';}
  else{var g='';m.innerHTML=EDV.itens.map(function(v,i){var h=(v.g!==g?'<div class="ed-vm-g">'+esc(v.g)+'</div>':'');g=v.g;return h+'<button data-vi="'+i+'" role="option" class="'+(i===EDV.sel?'on':'')+'"><b>{{'+esc(v.nome)+'}}</b><small>'+esc(v.d)+(v.v?' · agora: '+esc(String(v.v).slice(0,40)):'')+'</small></button>';}).join('');}
  var c=edCaret(ta);m.hidden=false;m.style.left=Math.max(4,Math.min(c.x,window.innerWidth-m.offsetWidth-8))+'px';m.style.top=Math.min(c.y+4,window.innerHeight-m.offsetHeight-8)+'px';}
function edVmFecha(){var m=$('#ed-vm');if(m)m.hidden=true;EDV.ini=-1;}
function edVmEscolhe(i){var ta=EDV.ta;if(!ta||EDV.ini<0)return;var v=EDV.itens[i],nome=v?v.nome:(EDV.q||'campo'),fim=ta.selectionStart;
  ta.focus();ta.setRangeText('{{'+nome+'}}',EDV.ini,fim,'end');edVmFecha();ta.dispatchEvent(new Event('input',{bubbles:true}));}
function edVmMarca(){$$('#ed-vm [data-vi]').forEach(function(b,i){b.classList.toggle('on',i===EDV.sel);if(i===EDV.sel&&b.scrollIntoView)b.scrollIntoView({block:'nearest'});});}
document.addEventListener('focusin',function(e){if(edTxtAlvo(e.target))edTbMostra(e.target);else if(!(e.target.closest&&e.target.closest('#ed-tb,#ed-vm')))edTbEsconde();});
document.addEventListener('focusout',function(e){if(edTxtAlvo(e.target))setTimeout(function(){var a=document.activeElement;if(!edTxtAlvo(a)){edTbEsconde();edVmFecha();}},120);});
document.addEventListener('scroll',function(){var tb=$('#ed-tb');if(tb&&!tb.hidden&&EDV.ta&&document.activeElement===EDV.ta)edTbMostra(EDV.ta);edVmFecha();},true);
document.addEventListener('mousedown',function(e){var b=e.target.closest&&e.target.closest('[data-edtb]');if(!b)return;e.preventDefault();var ta=EDV.ta;if(!ta)return;var k=b.getAttribute('data-edtb');
  if(k==='campo')edCampoNovo(ta);else if(k==='var'){edInsere(ta,'@@');edVmAbre(ta,ta.selectionStart-2,'');}else edInsere(ta,'['+k+']');});
document.addEventListener('input',function(e){var ta=e.target;if(!edTxtAlvo(ta))return;var antes=ta.value.slice(0,ta.selectionStart),m=/@@([^@{}\[\]\n]{0,40})$/.exec(antes);if(m&&(/\s\s$/.test(m[1])||(/\s/.test(m[1])&&!edVarsLista(m[1]).length)))m=null;
  if(m)edVmAbre(ta,ta.selectionStart-m[0].length,m[1]);else if(EDV.ini>=0)edVmFecha();});
document.addEventListener('keydown',function(e){var m=$('#ed-vm');
  if(m&&!m.hidden&&EDV.ini>=0&&document.activeElement===EDV.ta){
    if(e.key==='ArrowDown'){e.preventDefault();EDV.sel=Math.min(EDV.sel+1,EDV.itens.length-1);edVmMarca();return;}
    if(e.key==='ArrowUp'){e.preventDefault();EDV.sel=Math.max(EDV.sel-1,0);edVmMarca();return;}
    if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();e.stopPropagation();edVmEscolhe(EDV.itens.length?EDV.sel:-1);return;}
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();edVmFecha();return;}}
  if(edTxtAlvo(e.target)&&(e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='c'||e.key==='C'||e.key==='k'||e.key==='K')){e.preventDefault();edCampoNovo(e.target);}
},true);
