/* ================= VERSÃO AVANÇADA · EDITOR: modelos-matriz, parágrafos-padrão, peças do Editorial e diretrizes =================
   As alterações valem na hora nesta página e ficam guardadas como rascunho neste navegador até serem enviadas.
   Para gravar: no site do gabinete (/editor/), "Gravar no GitHub" envia ao servidor, que confere o acesso de editor (apoio/acessos.json)
   e faz o commit em trf3bdutra/procs-muta; aberto como arquivo, o envio usa um token pessoal (só na memória desta aba);
   "Baixar arquivos" gera o .zip com os arquivos da base nos caminhos do repositório. */
var EDM=null;try{EDM=JSON.parse($('#editor-meta').textContent);}catch(e){EDM=null;}
var EDS={col:'mod',id:null,q:'',tipoNovo:'preferencia',token:'',conf:null,dirty:false,prev:false,f:{mod:{},par:{},pec:{},dir:{},nor:{}},
  orig:{mod:{},par:{},pec:{},dir:{},nor:{}},dlg:'',restaura:null,lido:false};
var EDCOL={mod:'Modelos-matriz',par:'Parágrafos-padrão',pec:'Peças do Editorial',dir:'Diretrizes',nor:'Normas'};
if(window.VDM_COLLECTIO){EDCOL={mod:'Modelos',par:'Parágrafos-padrão'};}
var EDARQ={mod:'modelos',par:'paragrafos',pec:'pecas',dir:'diretrizes',nor:'normas'};
/* aberto dentro do painel do desembargador (/editor/?cmt=1): grava em nome do CMT, só parágrafos, peças e diretrizes,
   e depois de gravar oferece avisar a equipe (mural e notificações de todos) */
var EDCMT=!!window.VDM_PAGINA_EDITOR&&!window.VDM_COLLECTIO&&/[?&]cmt=1(?:&|$)/.test(location.search);
var EDCMTK=(function(){try{return localStorage.getItem('cmt_k')||sessionStorage.getItem('cmt_k')||'';}catch(e){return '';}})();
if(EDCMT){delete EDCOL.mod;delete EDCOL.nor;EDCOL.par='Parágrafos';EDCOL.pec='Peças';EDS.col='par';document.documentElement.classList.add('ed-cmt');}
/* gravação pelo servidor do site (login da Ex Officio + acesso de editor) */
function edSrv(){return !!(window.CMT_SITE&&window.CMT_ACESSO&&window.CMT_ACESSO().editor);}
var EDK=window.VDM_COLLECTIO?'collectio-ed-rascunho-v1':'vdm-ed-rascunho-v1';
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
function edPendentes(){var P=[];Object.keys(EDS.orig).forEach(function(c){if((EDCMT||window.VDM_COLLECTIO)&&!EDCOL[c])return;Object.keys(EDS.orig[c]).forEach(function(id){var s=edSit(c,id);if(!s){delete EDS.orig[c][id];return;}
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
  Object.keys(d.cols).forEach(function(c){if(window.VDM_COLLECTIO&&!EDCOL[c])return;var L=edListaDe(c);Object.keys(d.cols[c]).forEach(function(id){var x=d.cols[c][id],cur=edAcha(c,id);
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
  ['nivelCategoria','Onde entra (categoria)','s',['Abertura','Fundamento','Aplicação','Encerramento','Genéricos','Documentação']],['nivelSubsecao','Subseção','t'],['nivelTema','Tema','t'],['nivelEspecificidade','Especificidade','t'],['uso','Quando usar','a'],['especificidadesTags','Marcadores (separados por ;)','t'],['fonte','Origem','t'],
  ['variaveis','Variáveis (JSON)','j'],['vinculos','Vínculos (JSON)','j']];
var ED_DIR={preferencia:[['grupo','Grupo','t'],['titulo','Título','t'],['preferir','Preferir','a'],['evitar','Evitar','a'],['regra','Regra','t'],['base','Base','t']],
  conectivo:[['expressao','Expressão','t'],['funcao','Função','a'],['base','Base','t']],verbo:[['verbo','Verbo','t'],['construcao','Construção','a'],['emprego','Emprego','a'],['base','Base','t']],
  correcao:[['motivo','Motivo (como aparece no aviso)','a'],['padrao','Padrão (expressão regular)','t'],['flags','Flags','t'],['substituir','Substituir por','t']],
  alerta:[['mensagem','Mensagem','a'],['escopo','Onde (ementa, voto, relatório…)','t'],['padrao','Padrão (expressão regular)','t'],['flags','Flags','t']]};
var ED_NOR=[['Código','Código (identificador)','t',null,1],['Diploma','Diploma','t',null,1],['Nome do diploma','Nome do diploma','t'],['Norma','Norma (como é citada)','t',null,1],['Dispositivo','Dispositivo','t',null,1],
  ['Assunto','Assunto','t'],['Texto literal','Texto literal','A'],['Observação','Observação','a']];
var ED_DIRPRE={preferencia:'red-dir-',conectivo:'red-con-',verbo:'red-vrb-',correcao:'red-cor-',alerta:'red-ale-'};
function edSug(k){var c={};edLista().forEach(function(r){var v=r[k];if(typeof v==='string'&&v&&v.length<80)c[v]=(c[v]||0)+1;});return Object.keys(c).sort(function(a,b){return c[b]-c[a];}).slice(0,80);}
/* no painel do desembargador, o padrão de busca das correções e alertas aparece como palavra ou expressão, sem expressão regular */
var EDPAL=/^(?:\\b)?((?:[^\\\[\]().*+?{}|^$]|\\s\+)+?)(?:\\b)?$/,EDPALS=/^(?:[^\\\[\]().*+?{}|^$]|\\s\+)+$/;
function edPalDe(v){v=String(v||'');var m=EDPAL.exec(v);if(m)return m[1].replace(/\\s\+/g,' ');
  var g=/^\\b\((?:\?:)?(.+)\)\\b$/.exec(v);if(g){var P=g[1].split('|');if(P.every(function(p){return EDPALS.test(p);}))return P.map(function(p){return p.replace(/\\s\+/g,' ');}).join(', ');}
  return null;}
function edPalEsc(w){return w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');}
function edPalPara(w){w=String(w||'').trim();if(!w)return '';var P=w.split(/\s*,\s*/).filter(Boolean);
  if(P.length>1)return '\\b(?:'+P.map(edPalEsc).join('|')+')\\b';
  return (/^[A-Za-z0-9_]/.test(w)?'\\b':'')+edPalEsc(w)+(/[A-Za-z0-9_]$/.test(w)?'\\b':'');}
if(EDCMT){ED_PAR=ED_PAR.map(function(f){return f[0]==='variaveis'?['variaveis','Campos a preencher','vv']:f[0]==='vinculos'?['vinculos','Trechos ligados','vl']:f;});
  ED_DIR.correcao=[['motivo','Motivo (como aparece no aviso)','a'],['padrao','Palavra ou expressão a procurar','w'],['substituir','Substituir por','t']];
  ED_DIR.alerta=[['mensagem','Mensagem','a'],['escopo','Onde (ementa, voto, relatório…)','t'],['padrao','Palavra ou expressão a procurar','w']];}
function edCampo(r,f){var k=f[0],v=r[k],id='edf-'+k.replace(/[^A-Za-z0-9_-]/g,'_'),h='<label class="edf'+(f[4]?' req':'')+'"><span>'+esc(f[1])+(f[4]?' <i>obrigatório</i>':'')+'</span>';
  /* campos e vínculos do parágrafo: só a leitura, em palavras (a estrutura técnica fica como está) */
  if(f[2]==='vv'||f[2]==='vl'){var L0=Array.isArray(v)?v:[],cp=function(t){t=String(t||'');return t===t.toUpperCase()?t.charAt(0)+t.slice(1).toLowerCase():t;};
    var it=L0.map(function(x){return f[2]==='vv'?cp(x.rotulo||x.campo||'')+(x.preencher_manualmente?' (à mão)':''):cp(x.rotulo||x.ref||x.parte||'')+(x.opcional?' · opcional':'');}).filter(Boolean);
    return h+(it.length?'<span class="ed-chips">'+it.map(function(t){return '<i>'+esc(t)+'</i>';}).join('')+'</span>':'<span class="meta">nenhum</span>')+'</label>';}
  if(f[2]==='w'){var pw=edPalDe(v);return pw===null?h+'<p class="meta">Regra de busca especial, mantida como está.</p></label>':h+'<input id="'+id+'" data-k="'+k+'" data-pal="1" value="'+esc(pw)+'" placeholder="ex.: writ  ·  várias, separadas por vírgula"></label>';}
  if(f[2]==='s')h+='<select id="'+id+'" data-k="'+k+'">'+(f[3].indexOf(v)<0&&v?'<option>'+esc(v)+'</option>':'')+f[3].map(function(o){return '<option'+(o===v?' selected':'')+'>'+esc(o)+'</option>';}).join('')+'</select>';
  else if(f[2]==='a'||f[2]==='A')h+='<textarea id="'+id+'" data-k="'+k+'" class="ed-auto" rows="'+(f[2]==='A'?6:2)+'">'+esc(v==null?'':v)+'</textarea>';
  else if(f[2]==='j')h+='<textarea id="'+id+'" data-k="'+k+'" data-json="1" rows="4" spellcheck="false" class="mono ed-auto">'+esc(v==null?'':JSON.stringify(v,null,1))+'</textarea>';
  else{var sg=edSug(k);h+='<input id="'+id+'" data-k="'+k+'" value="'+esc(v==null?'':v)+'"'+(sg.length?' list="'+id.replace('edf-','edl-')+'"':'')+'>'+(sg.length?'<datalist id="'+id.replace('edf-','edl-')+'">'+sg.map(function(o){return '<option value="'+esc(o)+'">';}).join('')+'</datalist>':'');}
  return h+'</label>';}

/* ---------- esqueleto do modelo: tópicos com texto, ativo e opcional ---------- */
/* Editor modular: rascunho isolado; só edAplicar persiste alterações. */
var EDM={id:'',tab:'grupos',D:null};
function edmDraft(r){if(EDM.id!==r.id||!EDM.D){EDM={id:r.id,tab:'grupos',D:JSON.parse(JSON.stringify(modeloEstrutura(r)))};}return EDM.D;}
function edmGet(p){return p.split('.').reduce(function(o,k){return o[k];},EDM.D);}
function edmSet(p,v){var a=p.split('.'),k=a.pop(),o=a.length?edmGet(a.join('.')):EDM.D;o[k]=v;}
function edmField(p,lab,val,kind,opts){var at=' data-edmp="'+esc(p)+'"';return '<label class="edf"><span>'+esc(lab)+'</span>'+(kind==='textarea'?'<textarea rows="3"'+at+'>'+esc(val||'')+'</textarea>':kind==='select'?'<select'+at+'>'+opts.map(function(x){return '<option value="'+esc(x[0])+'"'+(String(val||'')===x[0]?' selected':'')+'>'+esc(x[1])+'</option>';}).join('')+'</select>':'<input'+at+' value="'+esc(val||'')+'">')+'</label>';}
function edmBtn(act,p,txt){return '<button type="button" class="e-mini" data-edma="'+act+'" data-edmpath="'+esc(p)+'">'+esc(txt)+'</button>';}
function edmRow(p,title,body){return '<details class="edm-row"><summary>'+esc(title)+'</summary><div class="edm-body">'+body+'<div class="edm-actions">'+edmBtn('up',p,'↑')+edmBtn('down',p,'↓')+edmBtn('del',p,'Excluir')+'</div></div></details>';}
function edmLines(p,items,label){return (items||[]).map(function(x,i){return '<div class="edm-line">'+edmField(p+'.'+i,label+' '+(i+1),x,'textarea')+edmBtn('del',p+'.'+i,'×')+'</div>';}).join('')+edmBtn('line',p,'+ '+label);}
function edmView(r){var D=edmDraft(r),tab=EDM.tab,H='',mods=(D.modulos||[]).map(function(m){return [m.id,m.titulo+' · '+m.id];});
 if(tab==='grupos'){H=D.grupos.map(function(g,i){var p='grupos.'+i,R=g.relatorio||{},body='<div class="edm-grid">'+edmField(p+'.nome','Nome',g.nome)+edmField(p+'.julgamento','Julgamento',g.julgamento,'select',[['','Qualquer'],['ap','Apelação'],['ed','Embargos de declaração'],['agint','Agravo interno'],['ai','Agravo de instrumento'],['aprn','Apelação e remessa']])+edmField(p+'.resJulg','Resultado',g.resJulg)+'</div><h4>Sequência de módulos</h4>';
 body+=(g.receita||[]).map(function(x,j){var q=p+'.receita.'+j;return '<div class="edm-recipe">'+(x.umDe?'<div class="edm-options">'+x.umDe.map(function(v,k){return edmField(q+'.umDe.'+k,'Alternativa '+(k+1),v,'select',[['','Sem módulo']].concat(mods))+edmBtn('del',q+'.umDe.'+k,'×');}).join('')+edmBtn('alternative',q+'.umDe','+ Alternativa')+'</div>':edmField(q+'.mod','Módulo',x.mod,'select',[['','Selecionar']].concat(mods))+'<label class="edck"><input type="checkbox" data-edmp="'+q+'.opcional"'+(x.opcional?' checked':'')+'> Opcional</label>')+edmBtn('up',q,'↑')+edmBtn('down',q,'↓')+edmBtn('del',q,'×')+'</div>';}).join('')+edmBtn('recipe',p+'.receita','+ Módulo')+edmBtn('choice',p+'.receita','+ Alternativas excludentes');
 body+='<h4>Relatório</h4>'+edmLines(p+'.relatorio.paragrafos',R.paragrafos,'Parágrafo')+'<h4>Dispositivo</h4>'+edmField(p+'.dispositivo','Redação',g.dispositivo,'textarea')+edmField(p+'.acordao','Proclamação',g.acordao,'textarea');
 return edmRow(p,g.id+' · '+g.nome,body);}).join('')+edmBtn('group','grupos','+ Grupo');}
 if(tab==='modulos'){H=D.modulos.map(function(m,i){var p='modulos.'+i,body='<div class="edm-grid">'+edmField(p+'.titulo','Título',m.titulo)+edmField(p+'.tipo','Natureza',m.tipo,'select',[['nucleo','Obrigatório'],['opcional','Opcional'],['fixo','Fixo'],['honorarios','Honorários']])+edmField(p+'.gatilho','Gatilho de aplicação',m.gatilho)+'</div>';body+=(m.versoes||[]).map(function(v,j){var q=p+'.versoes.'+j;return edmRow(q,v.rotulo||'Versão '+(j+1),edmField(q+'.rotulo','Versão',v.rotulo)+edmField(q+'.origem','Fonte',v.origem)+edmLines(q+'.paragrafos',v.paragrafos,'Parágrafo'));}).join('')+edmBtn('version',p+'.versoes','+ Versão');return edmRow(p,m.id+' · '+m.titulo,body);}).join('')+edmBtn('module','modulos','+ Módulo');}
 if(tab==='variaveis'){H=D.variaveis.map(function(v,i){var p='variaveis.'+i;return edmRow(p,'{{'+v.id+'}} · '+v.rotulo,'<div class="edm-grid">'+edmField(p+'.id','Identificador',v.id)+edmField(p+'.rotulo','Rótulo',v.rotulo)+edmField(p+'.tipo','Tipo',v.tipo,'select',[['texto','Texto'],['longo','Texto longo'],['opcoes','Opções']])+edmField(p+'.ficha','Apelido canônico da ficha',v.ficha)+edmField(p+'.padrao','Valor-padrão',v.padrao)+'</div>'+edmField(p+'.ajuda','Orientação',v.ajuda,'textarea')+edmLines(p+'.opcoes',v.opcoes,'Opção'));}).join('')+edmBtn('variable','variaveis','+ Variável');}
 return '<div id="ed-modular-ui" class="edg edm"><div class="edgh">Estrutura modular <small>Grupos · módulos · versões · variáveis</small></div><div class="edm-tabs">'+[['grupos','Grupos'],['modulos','Módulos'],['variaveis','Variáveis']].map(function(x){return '<button type="button" data-edmt="'+x[0]+'" aria-pressed="'+(tab===x[0])+'">'+x[1]+' <small>'+D[x[0]].length+'</small></button>';}).join('')+'</div><div class="edm-content">'+H+'</div></div>';}
function edmRefresh(){var r=edAcha(EDS.col,EDS.id),el=$('#ed-modular-ui');if(r&&el){var open=Array.from(el.querySelectorAll('details[open]')).map(function(x){return x.querySelector('summary').textContent;});el.outerHTML=edmView(r);$$('#ed-modular-ui details').forEach(function(x){if(open.indexOf(x.querySelector('summary').textContent)>=0)x.open=true;});}}
function edmArray(p){try{var a=edmGet(p);if(Array.isArray(a))return a;}catch(e){}var keys=p.split('.'),o=EDM.D;keys.forEach(function(k,i){if(o[k]==null)o[k]=i===keys.length-1?[]:{};o=o[k];});return o;}
function edmValidate(D){var ids=new Set(),gs=new Set(),vs=new Set();if(!D.grupos.length)return 'Crie pelo menos um grupo.';for(var m of D.modulos){if(!m.id||ids.has(m.id)||!m.titulo||!m.versoes.length)return 'Módulo sem identificação, duplicado ou sem versão.';ids.add(m.id);}for(var g of D.grupos){if(!g.id||gs.has(g.id)||!g.nome)return 'Grupo sem identificação ou duplicado.';gs.add(g.id);for(var x of g.receita||[]){if(x.umDe){if(!x.umDe.length||x.umDe.some(function(k){return k&&!ids.has(k);}))return 'Alternativas inválidas no grupo '+g.nome;}else if(!ids.has(x.mod))return 'Módulo ausente no grupo '+g.nome;}}for(var v of D.variaveis){if(!/^[a-z][a-z0-9_]*$/.test(v.id)||vs.has(v.id))return 'Variável inválida ou duplicada: '+v.id;vs.add(v.id);}return '';}
document.addEventListener('input',function(ev){var t=ev.target;if(!t.closest||!t.closest('#ed-modular-ui')||!t.hasAttribute('data-edmp'))return;edmSet(t.getAttribute('data-edmp'),t.type==='checkbox'?t.checked:t.value);edMarcaSujo();});
document.addEventListener('click',function(ev){var t=ev.target.closest&&ev.target.closest('#ed-modular-ui [data-edmt],#ed-modular-ui [data-edma]');if(!t)return;ev.preventDefault();if(t.hasAttribute('data-edmt')){EDM.tab=t.getAttribute('data-edmt');edmRefresh();return;}var a=t.getAttribute('data-edma'),p=t.getAttribute('data-edmpath'),id='m'+Date.now().toString(36),arr;
 if(['del','up','down'].includes(a)){var k=p.split('.'),i=+k.pop();arr=edmGet(k.join('.'));if(a==='del'){if(k.join('.')==='modulos'&&EDM.D.grupos.some(function(g){return g.receita.some(function(x){return x.mod===arr[i].id||(x.umDe||[]).includes(arr[i].id);});})){toast('Retire o módulo dos grupos antes de excluir.');return;}arr.splice(i,1);}else{var j=i+(a==='up'?-1:1);if(j>=0&&j<arr.length){var x=arr[i];arr[i]=arr[j];arr[j]=x;}}}
 else{arr=edmArray(p);var x={group:{id:id,nome:'Novo grupo',receita:[],relatorio:{paragrafos:[]}},module:{id:id,titulo:'Novo módulo',tipo:'nucleo',versoes:[{rotulo:'Padrão',paragrafos:['']}]},version:{rotulo:'Nova versão',paragrafos:['']},variable:{id:'var_'+id,rotulo:'Nova variável',tipo:'texto'},recipe:{mod:EDM.D.modulos[0]&&EDM.D.modulos[0].id||'',opcional:false},choice:{umDe:['']},line:'',alternative:''};arr.push(x[a]);}
 edMarcaSujo();edmRefresh();});
function edEsq(r){return edmView(r);}
/* Editor legado preservado para referência. */
function edEsqLegado(r){var e=typeof r.esqueletoModelo==='string'?jp(r.esqueletoModelo):r.esqueletoModelo;e=e||{_topicos:[]};var T=e._topicos||[],na=T.filter(function(t){return (e[t.id]||{}).ativo!==false;}).length;
  return '<div class="edg"><div class="edgh">Texto do modelo · tópicos <small>'+na+' de '+T.length+' ativos · na ordem da peça · desmarque “ativo” para o tópico entrar recolhido</small><span class="edg-a"><button class="e-mini" data-edtop-all="1">Abrir todos</button><button class="e-mini" data-edtop-all="0">Recolher inativos</button></span></div><div id="ed-tops">'+T.map(function(t,i){var b=e[t.id]||{};return edTop(t,b,i);}).join('')+'</div><button class="e-mini" data-edtop-add>+ Tópico</button></div>';}
function edTop(t,b,i){var at=b.ativo!==false,tx=b.texto||'',ph=/\{\{/.test(tx);
  return '<div class="edt'+(at?'':' off')+(at||tx.length>0&&!ph?'':' min')+'" data-tid="'+esc(t.id)+'" data-extra="'+esc(JSON.stringify(Object.keys(t).filter(function(k){return ['id','titulo','opcional'].indexOf(k)<0;}).reduce(function(o,k){o[k]=t[k];return o;},{})))+'"><div class="edt-h"><button class="e-ib edt-tg" data-edtop-tg title="Mostrar ou recolher o texto" aria-label="Mostrar ou recolher o texto">▾</button><input class="edt-t" value="'+esc(t.titulo||t.id)+'" aria-label="Título do tópico"><small class="edt-n">'+(tx?tx.length+' car.':'vazio')+'</small><label class="edck"><input type="checkbox" class="edt-a"'+(at?' checked':'')+'> ativo</label><label class="edck"><input type="checkbox" class="edt-o"'+(t.opcional?' checked':'')+'> opcional</label><span class="edt-b"><button class="e-ib" data-edtop-up title="Subir">↑</button><button class="e-ib" data-edtop-dn title="Descer">↓</button><button class="e-ib" data-edtop-del title="Excluir tópico">✕</button></span></div><textarea class="edt-x ed-auto" rows="2">'+esc(tx)+'</textarea></div>';}
function edLerEsq(r){if(r.modular)return r.esqueletoModelo;var era=typeof r.esqueletoModelo==='string',ant=(era?jp(r.esqueletoModelo):r.esqueletoModelo)||{_estrutura:'padrao',_topicos:[]};
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
function edAbrir(col,id){if(window.VDM_COLLECTIO&&(!edSrv()||col&&!['mod','par'].includes(col)))return;if(EDS.dirty&&!edAplicar(true))return;EDS.col=col||EDS.col;EDS.id=id||EDS.id;if(col&&id)EDS.id=id;EDS.conf=null;var o=$('#ed-ov');if(!o){o=document.createElement('div');o.id='ed-ov';o.className='ed-ov';o.setAttribute('role','dialog');o.setAttribute('aria-label',window.VDM_COLLECTIO?'Editor dos bancos do Collectio':'Editor do Compendium');document.body.appendChild(o);}
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
function edRender(){if(!EDS.dirty)EDM={id:'',tab:'grupos',D:null};
  var o=$('#ed-ov');if(!o)return;var L=edLista(),F=edFiltrar(L),P=edPendentes();
  var top='<div class="ed-top"><b class="ed-tit">Editor</b><div class="seg ed-cols">'+Object.keys(EDCOL).map(function(c){return '<button data-edcol="'+c+'" aria-pressed="'+(EDS.col===c)+'">'+EDCOL[c]+(edSujo(c)?' <i class="ed-dot" title="Com alterações não enviadas"></i>':'')+'</button>';}).join('')+'</div><span style="flex:1"></span>'+
    '<button class="e-mini ed-pend'+(P.length?' on':'')+'" data-edpend title="Ver, abrir e desfazer as alterações">'+(P.length?P.length+(P.length>1?' alterações':' alteração'):'Sem alterações')+'</button><span class="meta">'+(P.length?'guardadas neste navegador':'')+'</span>'+
    '<button class="btn ghost" data-edzip'+(P.length?'':' disabled')+'>Baixar arquivos</button><button class="btn" data-edgit'+(P.length?'':' disabled')+'>Gravar no GitHub</button><button class="e-ib ed-help" data-edhelp title="Atalhos e ajuda" aria-label="Atalhos e ajuda">?</button><button class="e-dx" data-edx title="Fechar o editor (Esc)" aria-label="Fechar o editor">×</button></div>';
  if(EDS.restaura)top+='<div class="ed-rest"><b>Há '+EDS.restaura.n+' alteraç'+(EDS.restaura.n>1?'ões':'ão')+' não enviada'+(EDS.restaura.n>1?'s':'')+'</b> de '+esc(edData(EDS.restaura.d.ts))+'.'+(EDS.restaura.mudou?' A base mudou desde então: confira antes de enviar.':'')+' <button class="e-mini pri" data-edrest>Restaurar</button><button class="e-mini" data-edrestx>Descartar</button></div>';
  var nov=EDS.col==='pec'?'':'<div class="ed-new">'+(EDS.col==='dir'?'<select data-edtipo aria-label="Tipo da diretriz nova">'+Object.keys(ED_DIR).map(function(t){return '<option'+(t===EDS.tipoNovo?' selected':'')+'>'+t+'</option>';}).join('')+'</select>':'')+'<button class="e-mini pri" data-ednovo>+ Novo</button></div>';
  var lst='<aside class="ed-list"><input type="search" id="ed-q" placeholder="Buscar…  ( / )" value="'+esc(EDS.q)+'" aria-label="Buscar registros">'+edFiltrosHtml(L)+nov+'<div class="ed-n">'+F.length+' de '+L.length+'</div><ul role="listbox">'+F.slice(0,500).map(function(r){var x=edRot(EDS.col,r),s=edSit(EDS.col,r.id);return '<li data-edid="'+esc(r.id)+'" class="'+(r.id===EDS.id?'on':'')+'" tabindex="0" role="option" aria-selected="'+(r.id===EDS.id)+'"><b>'+(s?'<i class="ed-sit s-'+s.replace('í','i')+'" title="'+s+'"></i>':'')+esc(x.t.length>90?x.t.slice(0,90)+'…':x.t)+'</b><small>'+esc(x.s)+'</small></li>';}).join('')+(F.length>500?'<li class="meta">Refine a busca para ver os demais.</li>':'')+'</ul></aside>';
  var r=EDS.id&&edAcha(EDS.col,EDS.id);
  var frm='<section class="ed-form'+(EDS.prev?' com-prev':'')+'" id="ed-form">'+(r?edForm(r):EDS.col==='dir'?'<div class="ed-man" id="ed-man"></div>':'<div class="empty ed-vazio"><p>Escolha um registro à esquerda ou crie um novo.</p><p class="meta">As alterações valem na hora nesta página e ficam guardadas neste navegador até o envio. Use <kbd>Ctrl</kbd>+<kbd>S</kbd> para aplicar.</p></div>')+'</section>';
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
    corpo=edEsq(r)+edEmForm(r)+'<details class="edg" open><summary>Ficha do modelo</summary>'+dados+'</details><details class="edg"><summary>Parágrafos alternativos do modelo (JSON, avançado)</summary><textarea id="ed-pm" rows="6" class="mono ed-auto" spellcheck="false">'+esc(typeof r.paragrafosModelo==='string'?r.paragrafosModelo:JSON.stringify(r.paragrafosModelo||[]))+'</textarea></details>';}
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
    if(i.getAttribute('data-pal')){if(edPalDe(r[k])===v.trim())return;r[k]=edPalPara(v);if(r[k]&&!r.flags)r.flags='i';return;}
    if(v===''&&!(k in r))return;r[k]=v;});
  if(EDS.col==='mod'){edEmLer(r);var mm=$('#ed-modular-ui');if(mm&&EDM.id===r.id){var D=JSON.parse(JSON.stringify(EDM.D)),err=edmValidate(D);if(err)erro=err;else r.modular=D;}r.esqueletoModelo=edLerEsq(r);var pm=$('#ed-pm');if(pm){try{var pj=JSON.parse(pm.value||'[]'),pa=typeof r.paragrafosModelo==='string'?jp(r.paragrafosModelo):r.paragrafosModelo;if(JSON.stringify(pj)!==JSON.stringify(pa))r.paragrafosModelo=typeof r.paragrafosModelo==='string'?pyDumps(pj):pj;}catch(e){erro='JSON inválido nos parágrafos alternativos.';}}
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
function edAtualizaVista(){try{PRECP=null;PRECI=null;if(!$('#v-edit').hidden)xRender();if(!$('#v-dir').hidden)xManual();}catch(e){}}
function edNovo(){if(EDS.dirty&&!edAplicar(true))return;var c=EDS.col,L=edLista(),r;
  if(c==='mod'){var ref=L.filter(function(m){var e=jp(m.esqueletoModelo);return e&&e._estrutura==='padrao';})[0],e=ref?jp(ref.esqueletoModelo):{_estrutura:'padrao',_topicos:[]},o={_estrutura:e._estrutura,_topicos:e._topicos};(e._topicos||[]).forEach(function(t){o[t.id]={texto:t.id==='fecho'?'É como voto.':'',ativo:!t.opcional};});
    var tp=EDS.f.mod.tipo==='Decisão'?'decisao':EDS.f.mod.tipo==='Despacho'?'despacho':'voto-matriz';
    r={modular:{schema:'gabcmt-matrizes-modulares-1',grupos:[{id:'geral',nome:'Estrutura do modelo',receita:[],relatorio:{paragrafos:[]}}],modulos:[],variaveis:[]},id:'mod-modelo-ed-'+Date.now().toString(36),processo:'',tipo:'Modelo',pronunciamento:tp==='voto-matriz'?'Voto':tp==='despacho'?'Despacho':'Decisão monocrática terminativa',especie:'',assunto:EDS.f.mod.ass||'',temas:'',tese:'',fundamentacao:'',especificidades:'',resultado:'',fonte:'Editor do Compendium',formatoModelo:'Modelo-matriz',nomeModelo:'Novo modelo-matriz',textoModelo:'',esqueletoModelo:JSON.stringify(o),paragrafosModelo:'[]',classe:'',classeSigla:'',statusCuradoria:'',especieModelo:tp,dataReferencia:edHoje(),atualizadoEm:edAgora(),historico:[]};}
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
  if((b=e.target.closest('[data-edntf]'))){edNotificar(b);return;}
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
  if(e.target.closest('[data-edtop-add]')){$('#ed-tops').insertAdjacentHTML('beforeend',edTop({id:'t'+Date.now().toString(36),titulo:'Novo tópico'},{texto:'',ativo:true},0));edMarcaSujo();edBlocos();var nt=$('#ed-tops .edt:last-child .edt-x');if(nt)nt.focus();return;}
  if(e.target.closest('[data-edel-add]')){$('#ed-els').insertAdjacentHTML('beforeend',edEl({n:'Novo trecho',f:'',r:[],fo:'M'}));edMarcaSujo();return;}
  if((b=e.target.closest('[data-edalt-add]'))){b.previousElementSibling.insertAdjacentHTML('beforeend',edAlt({lab:'',f:''}));edMarcaSujo();return;}
  if((b=e.target.closest('[data-edalt-del]'))){b.closest('.edalt').remove();edMarcaSujo();edAtualizaPrevia();return;}
  if((b=e.target.closest('[data-edtop-tg]'))){var tg=b.closest('.edt');tg.classList.toggle('min');edAuto(tg.querySelector('textarea'));return;}
  if((b=e.target.closest('[data-edtop-all]'))){var ab=b.getAttribute('data-edtop-all')==='1';$$('#ed-tops .edt').forEach(function(d){d.classList.toggle('min',!ab&&!d.querySelector('.edt-a').checked);});edAutoTodos();return;}
  if((b=e.target.closest('[data-edtop-up]'))){var d=b.closest('.edt');if(d.previousElementSibling){d.parentNode.insertBefore(d,d.previousElementSibling);edMarcaSujo();edAtualizaPrevia();edBlocos();}return;}
  if((b=e.target.closest('[data-edtop-dn]'))){var d2=b.closest('.edt');if(d2.nextElementSibling){d2.parentNode.insertBefore(d2.nextElementSibling,d2);edMarcaSujo();edAtualizaPrevia();edBlocos();}return;}
  if((b=e.target.closest('[data-edtop-del]'))){b.closest('.edt').remove();edMarcaSujo();edAtualizaPrevia();edBlocos();return;}
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
function edMudados(){return Object.keys(EDARQ).filter(function(c){return (!(EDCMT||window.VDM_COLLECTIO)||EDCOL[c])&&edSujo(c);}).map(edArquivo);}
function edZip(){var F=edMudados();if(!F.length)return;var bl=zipStore(F.map(function(f){return {n:f.path,d:f.txt};}));baixarBlob(new Blob([bl],{type:'application/zip'}),'modus-operandi-alteracoes-'+edHoje()+'.zip');toast('Arquivos gerados nos caminhos do repositório; o rascunho continua guardado até o envio');}
function edResumo(){var c={};edPendentes().forEach(function(l){var k=EDCOL[l.col];c[k]=(c[k]||0)+1;});return Object.keys(c).map(function(k){return k.toLowerCase()+': '+c[k];}).join('; ');}
function edDlgToken(){var F=edMudados(),P=edPendentes();return '<div class="ed-dlg" role="dialog" aria-label="'+(EDCMT?'Salvar alterações':'Gravar no GitHub')+'"><div class="ed-dlgc"><h3>'+(EDCMT?'Salvar alterações':'Gravar no GitHub')+'</h3>'+(EDCMT?'<p class="meta">Passam a valer no Compendium em alguns minutos, em nome do CMT.</p>':'<p class="meta">Um commit em <b>'+esc(EDM.repo)+'</b> ('+esc(EDM.ramo)+') com '+F.map(function(f){return '<code>'+esc(f.path)+'</code>';}).join(', ')+'. Em seguida o GitHub valida a base e reconstrói o Compendium.</p>')+
  '<ul class="ed-logl">'+P.slice(0,14).map(function(l){return '<li>'+esc(EDCOL[l.col])+' · '+esc(l.sit)+' · '+esc(l.t.slice(0,70))+'</li>';}).join('')+(P.length>14?'<li>+ '+(P.length-14)+'</li>':'')+'</ul>'+
  '<label class="edf"><span>'+(EDCMT?'Descrição':'Descrição do commit')+'</span><input id="ed-msg" value="'+esc('Editor do Compendium: '+edResumo())+'"></label>'+(EDCMT?'':edSrv()?'<p class="meta">Gravação pelo site do gabinete, em nome de <b>'+esc(window.CMT_ACESSO().usuario)+'</b>.</p>':EDS.token?'<p class="meta">Token desta sessão já informado.</p>':'<label class="edf"><span>Token do GitHub (permissão Contents: leitura e escrita no repositório). Fica só na memória desta aba.</span><input id="ed-tok" type="password" autocomplete="off"></label>')+
  '<div class="e-dacts"><button class="btn" data-edenviar>'+(EDCMT?'Salvar':'Enviar')+'</button><button class="btn ghost" data-eddlgx>Cancelar</button></div><p class="meta" id="ed-st"></p></div></div>';}
function edGh(caminho,opt){opt=opt||{};return fetch('https://api.github.com/repos/'+EDM.repo+'/'+caminho,{method:opt.method||'GET',cache:'no-store',headers:Object.assign({'Accept':'application/vnd.github+json','Authorization':'Bearer '+EDS.token,'X-GitHub-Api-Version':'2022-11-28'},opt.body?{'Content-Type':'application/json'}:{}),body:opt.body?JSON.stringify(opt.body):undefined}).then(function(r){if(!r.ok)return r.text().then(function(t){var m='';try{m=JSON.parse(t).message;}catch(e){m=t.slice(0,120);}throw new Error(r.status+' '+m);});return r.json();});}
/* envio pelo servidor: só as operações (registro como está agora e como estava ao ser tocado); o servidor confere conflitos e faz o commit */
function edEnviarSrv(msg){var P=edPendentes();if(!P.length)return;var C={};
  P.forEach(function(p){var L=edListaDe(p.col),cur=edAcha(p.col,p.id);(C[p.col]=C[p.col]||[]).push(p.sit==='excluído'?{op:'del',id:p.id,orig:EDS.orig[p.col][p.id]}:{op:'set',id:p.id,rec:edLimpa(cur),orig:EDS.orig[p.col][p.id],idx:L.indexOf(cur)});});
  var bt=$('[data-edenviar]');if(bt)bt.disabled=true;edSt('Gravando…');
  var Nt=edNtf(P);
  fetch('/api/editor',{method:'POST',credentials:'same-origin',cache:'no-store',headers:Object.assign({'Content-Type':'application/json'},EDCMT?{'x-cmt':'1','x-cmt-chave':EDCMTK}:{}),body:JSON.stringify({msg:msg,colecoes:C})})
  .then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok)throw new Error(j.erro||('HTTP '+r.status));return j;});})
  .then(function(j){EDS.orig={mod:{},par:{},pec:{},dir:{},nor:{}};edGuarda();
    EDS.dlg='<div class="ed-dlg"><div class="ed-dlgc"><h3>'+(EDCMT?'Salvo':'Gravado')+'</h3><p>'+j.alteracoes+' alteraç'+(j.alteracoes>1?'ões':'ão')+' no commit <a href="'+esc(j.url)+'" target="_blank" rel="noopener">'+esc(String(j.commit).slice(0,7))+'</a>. O GitHub valida a base e reconstrói o Compendium em alguns minutos; até lá, esta página mostra a versão editada.</p>'+
      (EDCMT?'<label class="edf"><span>Aviso à equipe · título</span><input id="ed-ntf-t" maxlength="160" value="'+esc(Nt.t)+'"></label>'+
        '<label class="edf"><span>Mensagem (pode ajustar antes de enviar)</span><textarea id="ed-ntf-m" rows="8" maxlength="2000">'+esc(Nt.m)+'</textarea></label>'+
        '<p class="meta">Vai para o mural e para as notificações de toda a equipe, em nome do CMT.</p>':'')+
      '<div class="e-dacts">'+(EDCMT?'<button class="btn" data-edntf>Notificar equipe</button>':'')+'<button class="btn'+(EDCMT?' ghost':'')+'" data-eddlgx>Fechar</button></div><p class="meta" id="ed-st"></p></div></div>';edRender();})
  .catch(function(e){edSt('Não foi possível gravar: '+e.message);if(bt)bt.disabled=false;});}
function edSt(t){var s=$('#ed-st');if(s)s.textContent=t;}
/* aviso à equipe depois de gravar pelo painel do desembargador: mural e notificação de todos, em nome do CMT */
function edNotificar(b){var t=($('#ed-ntf-t')||{}).value||'',m=($('#ed-ntf-m')||{}).value||'';if(!t.trim()){edSt('Escreva o título do aviso.');return;}
  b.disabled=true;edSt('Avisando a equipe…');
  fetch('/api/painel?cmt=1',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','x-cmt-chave':EDCMTK},body:JSON.stringify({acao:'aviso',titulo:t.trim(),texto:m.trim()})})
  .then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok)throw new Error(j.erro||('HTTP '+r.status));return j;});})
  .then(function(){b.textContent='Equipe notificada';edSt('Aviso publicado no mural e enviado às notificações de toda a equipe.');})
  .catch(function(e){b.disabled=false;edSt('Não foi possível avisar: '+e.message);});}
function edEnviar(msg){
  var F=edMudados();if(!F.length)return;var ref,tree;edSt('Conferindo a versão no GitHub…');
  Promise.all(F.map(function(f){var a=Object.keys(EDM.arquivos).map(function(k){return EDM.arquivos[k];}).filter(function(x){return x.path===f.path;})[0];
      return edGh('contents/'+f.path+'?ref='+EDM.ramo).then(function(j){if(a&&a.sha&&j.sha!==a.sha)throw new Error('“'+f.path+'” mudou no GitHub depois que esta página foi gerada. As alterações continuam guardadas neste navegador: abra a versão atualizada do Compendium e restaure o rascunho, ou baixe os arquivos.');});}))
  .then(function(){edSt('Gravando…');return edGh('git/ref/heads/'+EDM.ramo);})
  .then(function(j){ref=j.object.sha;return edGh('git/commits/'+ref);})
  .then(function(j){tree=j.tree.sha;return Promise.all(F.map(function(f){return edGh('git/blobs',{method:'POST',body:{content:f.txt,encoding:'utf-8'}}).then(function(b){return {path:f.path,mode:'100644',type:'blob',sha:b.sha};});}));})
  .then(function(T){return edGh('git/trees',{method:'POST',body:{base_tree:tree,tree:T}}).then(function(t){return {t:t,T:T};});})
  .then(function(x){return edGh('git/commits',{method:'POST',body:{message:(msg||'Editor do Compendium')+'\n\nAlterações feitas no editor do Compendium.',tree:x.t.sha,parents:[ref]}}).then(function(c){return {c:c,T:x.T};});})
  .then(function(x){return edGh('git/refs/heads/'+EDM.ramo,{method:'PATCH',body:{sha:x.c.sha}}).then(function(){return x;});})
  .then(function(x){x.T.forEach(function(t){Object.keys(EDM.arquivos).forEach(function(k){if(EDM.arquivos[k].path===t.path)EDM.arquivos[k].sha=t.sha;});});
    EDS.orig={mod:{},par:{},pec:{},dir:{},nor:{}};edGuarda();EDS.dlg='<div class="ed-dlg"><div class="ed-dlgc"><h3>Enviado</h3><p>Commit <a href="'+esc(x.c.html_url||('https://github.com/'+EDM.repo+'/commit/'+x.c.sha))+'" target="_blank" rel="noopener">'+esc(x.c.sha.slice(0,7))+'</a> gravado em '+esc(EDM.ramo)+'. O GitHub valida a base e reconstrói o Compendium em alguns minutos.</p><div class="e-dacts"><button class="btn" data-eddlgx>Fechar</button></div></div></div>';edRender();})
  .catch(function(e){edSt('Não foi possível enviar: '+e.message);if(/^401|^403/.test(e.message))EDS.token='';});}
document.body.classList.add('vdm-ed');
/* entrada pelo cabeçalho; aviso de rascunho guardado; na página do editor, abre sozinho (registro indicado no endereço: #mod=id) */
(function(){var h=$('#theme');var b='<button class="btn ed-btn" data-edabre title="Adicionar, editar e excluir modelos-matriz, parágrafos-padrão, peças do Editorial, diretrizes e normas">Editor</button>';if(h)h.insertAdjacentHTML('beforebegin',b);else document.body.insertAdjacentHTML('afterbegin',b);
  try{var d=JSON.parse(localStorage.getItem(EDK)||'null');if(d&&d.cols){var n=0;Object.keys(d.cols).forEach(function(c){n+=Object.keys(d.cols[c]).length;});if(n){var bt=document.querySelector('[data-edabre]');if(bt){bt.insertAdjacentHTML('beforeend',' <i class="ed-badge" title="Alterações guardadas e não enviadas">'+n+'</i>');}}}}catch(e){}
  function alvo(){var m=/^#(mod|par|pec|dir|nor)=(.+)$/.exec(location.hash||'');return m?[m[1],decodeURIComponent(m[2])]:[];}
  function semAcesso(){var o=$('#ed-ov');if(!o){o=document.createElement('div');o.id='ed-ov';o.className='ed-ov';document.body.appendChild(o);}o.hidden=false;document.body.classList.add('ed-on');
    var A=window.CMT_ACESSO?window.CMT_ACESSO():{};o.innerHTML='<div class="ed-top"><b class="ed-tit">Editor</b><span style="flex:1"></span><a class="btn ghost" href="/modus/">Ir para o Compendium</a></div><div class="empty ed-vazio"><p>'+(A.usuario?'O login <b>'+esc(A.usuario)+'</b> não tem acesso de editor.':'Entre com o login da Ex Officio para editar.')+'</p><p class="meta">Quem edita está em apoio/acessos.json, no procs-muta.</p>'+(A.usuario?'':'<p><button class="btn" data-acentra>Entrar</button></p>')+'</div>';}
  window.VDM_abrirEditorBanco=function(col){if(edSrv())edAbrir(col==='par'?'par':'mod');};
  if(!window.VDM_PAGINA_EDITOR)return;
  function abre(){var a=alvo();if(window.VDM_COLLECTIO&&(!a.length||!['mod','par'].includes(a[0])))return;if(edSrv()||!window.CMT_SITE){var o=$('#ed-ov');if(o&&!o.querySelector('.ed-body'))o.remove();edAbrir(a[0],a[1]);}else semAcesso();}
  document.addEventListener('cmt-acesso',abre);window.addEventListener('hashchange',function(){var a=alvo();if(a.length&&(edSrv()||!window.CMT_SITE))edAbrir(a[0],a[1]);});})();
/* ---------- campos: automáticos (@apelido, da ficha do processo; atalho @) e manuais ({{orientação}}): barra sobre o texto em edição ---------- */
var EDV={ta:null,ini:-1,q:'',sel:0,itens:[]};
function edTxtAlvo(t){return t&&t.tagName==='TEXTAREA'&&t.closest&&t.closest('#ed-form')&&!t.closest('.mn-f')&&!t.classList.contains('mono');}
function edUsados(){var c={};edLista().forEach(function(r){var s=EDS.col==='mod'?r.esqueletoModelo:EDS.col==='par'?r.texto:EDS.col==='pec'?JSON.stringify(r.elementos||[]):'';String(s||'').replace(/\{\{([^}]{1,60})\}\}/g,function(m,a){a=a.trim();c[a]=(c[a]||0)+1;});});
  return Object.keys(c).sort(function(a,b){return c[b]-c[a];}).slice(0,40);}
function edVarsLista(q){var V=((window.CAMPOS_AUTO||{}).campos||[]).map(function(c){return {nome:c.a,d:c.r+(c.g?' · '+c.g:''),v:'',g:'Campos automáticos (@): ficha do processo e peça',arr:true};}),nomes={};V.forEach(function(v){nomes[v.nome]=1;});
  edUsados().forEach(function(n){if(!nomes[n])V.push({nome:n,d:'Campo já usado nesta coleção',v:'',g:'Campos já usados'});});
  var qq=nz(q||'').trim();if(!qq)return V.slice(0,30);
  function nota(v){var n=nz(v.nome);return n.indexOf(qq)===0?0:n.split(/[^a-z0-9]+/).some(function(w){return w.indexOf(qq)===0;})?1:n.indexOf(qq)>=0?2:nz(v.d).indexOf(qq)>=0?3:9;}
  return V.map(function(v){return [nota(v),v];}).filter(function(x){return x[0]<9;}).sort(function(a,b){return a[0]-b[0];}).map(function(x){return x[1];}).slice(0,30);}
function edInsere(ta,txt,selIni,selFim){var a=ta.selectionStart,b=ta.selectionEnd;ta.focus();ta.setRangeText(txt,a,b,'end');if(selIni!=null)ta.setSelectionRange(a+selIni,a+selFim);ta.dispatchEvent(new Event('input',{bubbles:true}));}
function edCampoNovo(ta){var a=ta.selectionStart,b=ta.selectionEnd,s=ta.value.slice(a,b);if(s){edInsere(ta,'{{'+s.trim()+'}}');}else edInsere(ta,'{{orientação do campo}}',2,21);}
function edTbMostra(ta){var tb=$('#ed-tb');if(!tb){tb=document.createElement('div');tb.id='ed-tb';tb.className='ed-tb';tb.setAttribute('role','toolbar');tb.setAttribute('aria-label','Inserir campos');
    tb.innerHTML='<button data-edtb="campo" title="Campo manual: transforma a seleção em {{orientação}}, ou insere um campo novo; o texto de dentro diz o que escrever">{{ }} Campo manual</button><button data-edtb="var" title="Inserir campo automático, preenchido com a ficha do processo (atalho: @)">@ Campo da ficha</button><button data-edtb="ID" title="Inserir [ID]">[ID]</button><button data-edtb="DATA" title="Inserir [DATA]">[DATA]</button><button data-edtb="VALIDAR" title="Marcar trecho a validar">[VALIDAR]</button>';
    tb.addEventListener('mousedown',function(e){e.preventDefault();});document.body.appendChild(tb);}
  EDV.ta=ta;var r=ta.getBoundingClientRect();tb.hidden=false;tb.style.top=Math.max(4,r.top-tb.offsetHeight-4)+'px';tb.style.left=Math.max(4,Math.min(r.left,window.innerWidth-tb.offsetWidth-8))+'px';}
function edTbEsconde(){var tb=$('#ed-tb');if(tb)tb.hidden=true;}
function edCaret(ta){var m=document.createElement('div'),cs=getComputedStyle(ta);['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','border','boxSizing','whiteSpace','wordWrap','width'].forEach(function(k){m.style[k]=cs[k];});
  m.style.position='absolute';m.style.visibility='hidden';m.style.whiteSpace='pre-wrap';m.style.wordWrap='break-word';m.textContent=ta.value.slice(0,ta.selectionStart);var sp=document.createElement('span');sp.textContent='​';m.appendChild(sp);document.body.appendChild(m);
  var r=ta.getBoundingClientRect(),x=r.left+sp.offsetLeft-ta.scrollLeft,y=r.top+sp.offsetTop-ta.scrollTop+parseFloat(cs.lineHeight||'18');m.remove();return {x:x,y:y};}
function edVmAbre(ta,ini,q){EDV.ta=ta;EDV.ini=ini;EDV.q=q;EDV.sel=0;EDV.itens=edVarsLista(q);var m=$('#ed-vm');if(!m){m=document.createElement('div');m.id='ed-vm';m.className='ed-vm';m.setAttribute('role','listbox');m.addEventListener('mousedown',function(e){e.preventDefault();var b=e.target.closest('[data-vi]');if(b)edVmEscolhe(+b.getAttribute('data-vi'));});document.body.appendChild(m);}
  if(!EDV.itens.length){m.innerHTML='<div class="ed-vm-v">Nenhum campo automático com “'+esc(q)+'”. Enter cria o campo manual {{'+esc(q||'orientação do campo')+'}}.</div>';}
  else{var g='';m.innerHTML=EDV.itens.map(function(v,i){var h=(v.g!==g?'<div class="ed-vm-g">'+esc(v.g)+'</div>':'');g=v.g;return h+'<button data-vi="'+i+'" role="option" class="'+(i===EDV.sel?'on':'')+'"><b>'+(v.arr?'@'+esc(v.nome):'{{'+esc(v.nome)+'}}')+'</b><small>'+esc(v.d)+(v.v?' · agora: '+esc(String(v.v).slice(0,40)):'')+'</small></button>';}).join('');}
  var c=edCaret(ta);m.hidden=false;m.style.left=Math.max(4,Math.min(c.x,window.innerWidth-m.offsetWidth-8))+'px';m.style.top=Math.min(c.y+4,window.innerHeight-m.offsetHeight-8)+'px';}
function edVmFecha(){var m=$('#ed-vm');if(m)m.hidden=true;EDV.ini=-1;}
function edVmEscolhe(i){var ta=EDV.ta;if(!ta||EDV.ini<0)return;var v=EDV.itens[i],nome=v?v.nome:(EDV.q||'orientação do campo'),fim=ta.selectionStart;
  ta.focus();ta.setRangeText(v&&v.arr?'@'+nome:'{{'+nome+'}}',EDV.ini,fim,'end');edVmFecha();ta.dispatchEvent(new Event('input',{bubbles:true}));}
function edVmMarca(){$$('#ed-vm [data-vi]').forEach(function(b,i){b.classList.toggle('on',i===EDV.sel);if(i===EDV.sel&&b.scrollIntoView)b.scrollIntoView({block:'nearest'});});}
document.addEventListener('focusin',function(e){if(edTxtAlvo(e.target))edTbMostra(e.target);else if(!(e.target.closest&&e.target.closest('#ed-tb,#ed-vm')))edTbEsconde();});
document.addEventListener('focusout',function(e){if(edTxtAlvo(e.target))setTimeout(function(){var a=document.activeElement;if(!edTxtAlvo(a)){edTbEsconde();edVmFecha();}},120);});
document.addEventListener('scroll',function(){var tb=$('#ed-tb');if(tb&&!tb.hidden&&EDV.ta&&document.activeElement===EDV.ta)edTbMostra(EDV.ta);edVmFecha();},true);
document.addEventListener('mousedown',function(e){var b=e.target.closest&&e.target.closest('[data-edtb]');if(!b)return;e.preventDefault();var ta=EDV.ta;if(!ta)return;var k=b.getAttribute('data-edtb');
  if(k==='campo')edCampoNovo(ta);else if(k==='var'){edInsere(ta,'@');edVmAbre(ta,ta.selectionStart-1,'');}else edInsere(ta,'['+k+']');});
document.addEventListener('input',function(e){var ta=e.target;if(!edTxtAlvo(ta))return;var antes=ta.value.slice(0,ta.selectionStart),m=/(^|[\s(“"'\/])@([a-z0-9_]{0,40})$/i.exec(antes);
  if(m)edVmAbre(ta,ta.selectionStart-m[2].length-1,m[2]);else if(EDV.ini>=0)edVmFecha();});
document.addEventListener('keydown',function(e){var m=$('#ed-vm');
  if(m&&!m.hidden&&EDV.ini>=0&&document.activeElement===EDV.ta){
    if(e.key==='ArrowDown'){e.preventDefault();EDV.sel=Math.min(EDV.sel+1,EDV.itens.length-1);edVmMarca();return;}
    if(e.key==='ArrowUp'){e.preventDefault();EDV.sel=Math.max(EDV.sel-1,0);edVmMarca();return;}
    if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();e.stopPropagation();edVmEscolhe(EDV.itens.length?EDV.sel:-1);return;}
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();edVmFecha();return;}}
  if(edTxtAlvo(e.target)&&(e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='c'||e.key==='C'||e.key==='k'||e.key==='K')){e.preventDefault();edCampoNovo(e.target);}
},true);
/* ---------- no painel do desembargador: o painel mostra as alterações e o Salvar na barra dele ---------- */
function edCmtAvisa(){if(!EDCMT||window.parent===window)return;var nr=0;try{nr=rapLista().filter(function(r){return r.situacao!=='incorporada';}).length;}catch(e){}
  try{window.parent.postMessage({tipo:'vdm-ed-cmt',n:edPendentes().length,col:EDS.rap?'rap':EDS.col,rap:nr,sujo:Object.keys(EDCOL).filter(edSujo)},location.origin);}catch(e){}}
if(EDCMT){var edRender0=edRender;edRender=function(){var r=edRender0.apply(this,arguments);edCmtAvisa();return r;};
  var edGuarda0=edGuarda;edGuarda=function(){var r=edGuarda0.apply(this,arguments);edCmtAvisa();return r;};
  window.VDM_ED_CMT={
    salvar:function(){if(EDS.dirty&&!edAplicar(true))return;if(!edPendentes().length){toast('Nada a salvar.');return;}EDS.dlg=edDlgToken();edRender();var t=$('#ed-msg');if(t)t.focus();},
    alteracoes:function(){if(EDS.dirty&&!edAplicar(true))return;EDS.dlg=edDlgPend();edRender();},
    n:function(){return edPendentes().length;}};}
/* ---------- Diretrizes sem registro escolhido: o centro mostra o manual de redação inteiro (o mesmo da aba Diretrizes do Compendium) ---------- */
(function(){var edRenderM=edRender;edRender=function(){var xm=$('#x-man');
  if(xm&&xm._casa&&xm.parentNode!==xm._casa.parentNode)xm._casa.parentNode.insertBefore(xm,xm._casa.nextSibling);
  window.VDM_MN_DADOS=false;
  var r=edRenderM.apply(this,arguments),alvo=$('#ed-man');
  if(alvo&&xm){if(!xm._casa){xm._casa=document.createComment('x-man');xm.parentNode.insertBefore(xm._casa,xm);}alvo.appendChild(xm);window.VDM_MN_DADOS=true;try{xManual();}catch(e){alvo.innerHTML='<p class="empty">Manual indisponível.</p>';}}
  return r;};
  var edFecharM=edFechar;edFechar=function(){window.VDM_MN_DADOS=false;var xm=$('#x-man');if(xm&&xm._casa&&xm.parentNode!==xm._casa.parentNode)xm._casa.parentNode.insertBefore(xm,xm._casa.nextSibling);return edFecharM.apply(this,arguments);};})();
/* ---------- modelo: tópicos do voto em quatro blocos (Abertura · Fundamento · Aplicação · Encerramento) ---------- */
var EDBLOCO={admiss:'Abertura',tutela:'Abertura',prelim:'Abertura',contro:'Abertura',rel:'Abertura',ctx:'Abertura',
  jurid:'Fundamento',citnorma:'Fundamento',citjur:'Fundamento',desenv:'Fundamento',fund:'Fundamento',
  fatos:'Aplicação',provas:'Aplicação',aplic:'Aplicação',concl:'Aplicação',prov:'Aplicação',
  provid:'Encerramento',consec:'Encerramento',honor:'Encerramento',disp:'Encerramento',fecho:'Encerramento'};
/* o rótulo do bloco fica no primeiro tópico de cada bloco (atributo, não elemento: subir e descer tópicos continua igual); tópico novo segue o bloco de cima */
function edBlocos(){var ant='';$$('#ed-tops .edt').forEach(function(d){var b=EDBLOCO[d.getAttribute('data-tid')]||ant;if(b&&b!==ant)d.setAttribute('data-bl',b);else d.removeAttribute('data-bl');ant=b;});}
(function(){var edRenderB=edRender;edRender=function(){var r=edRenderB.apply(this,arguments);if($('#ed-tops'))edBlocos();return r;};})();
/* ---------- modelo: ementa em campos (Cabeçalho · I · II · III · IV · referências), juntada de novo ao aplicar ---------- */
var EDEMH=['I. Caso em exame','II. Questão em discussão','III. Razões de decidir','IV. Dispositivo'],EDEMSEP='\n-------------------------------------------\n';
function edEmParte(t){t=String(t||'');if(!t.trim())return {cab:'',s:['','','',''],rod:'',h:EDEMH.slice(),sep:EDEMSEP};
  var re=/^[ \t]*(I|II|III|IV)\.[ \t].*$/gm,m,P=[],ord=['I','II','III','IV'];while((m=re.exec(t)))P.push({n:m[1],i:m.index,h:m[0].trim(),f:m.index+m[0].length});
  if(P.length!==4||P.some(function(p,k){return p.n!==ord[k];}))return null;
  var o={cab:t.slice(0,P[0].i).replace(/\s+$/,''),h:P.map(function(p){return p.h;}),s:[],rod:'',sep:EDEMSEP};
  P.forEach(function(p,k){o.s.push(t.slice(p.f,k<3?P[k+1].i:t.length).replace(/^\r?\n/,'').replace(/\s+$/,''));});
  var rd=/\r?\n-{5,}\r?\n/.exec(o.s[3]);if(rd){o.rod=o.s[3].slice(rd.index+rd[0].length);o.sep=rd[0];o.s[3]=o.s[3].slice(0,rd.index).replace(/\s+$/,'');}
  return o;}
function edEmJunta(o){var t=o.cab;o.s.forEach(function(x,k){t+='\n'+o.h[k]+'\n'+x;});if(o.rod.trim())t+=o.sep+o.rod;return t;}
function edEmForm(r){var o=edEmParte(r.ementaIntegral);
  if(!o)return '<details class="edg" open><summary>Ementa</summary><label class="edf"><span>Ementa (texto integral, fora do padrão I a IV)</span><textarea data-k="ementaIntegral" rows="10" class="ed-auto">'+esc(r.ementaIntegral||'')+'</textarea></label></details>';
  var c=function(k,rot,v,n){return '<label class="edf"><span>'+esc(rot)+'</span><textarea data-em="'+k+'" rows="'+n+'" class="ed-auto">'+esc(v)+'</textarea></label>';};
  return '<details class="edg ed-em" open id="ed-em" data-emh="'+esc(JSON.stringify({h:o.h,sep:o.sep}))+'"><summary>Ementa</summary>'+
    c('cab','Cabeçalho',o.cab,3)+o.s.map(function(x,k){return c('s'+k,o.h[k],x,k===2?6:3);}).join('')+c('rod','Referências citadas (dispositivos e jurisprudência)',o.rod,3)+'</details>';}
function edEmLer(r){var el=$('#ed-em');if(!el)return;var hm=jp(el.getAttribute('data-emh'))||{h:EDEMH,sep:EDEMSEP},v=function(k){var x=el.querySelector('[data-em="'+k+'"]');return x?x.value.replace(/\s+$/,''):'';};
  var o={cab:v('cab'),s:[v('s0'),v('s1'),v('s2'),v('s3')],rod:v('rod'),h:hm.h,sep:hm.sep},a=edEmParte(r.ementaIntegral);
  if(a&&a.cab===o.cab&&a.rod===o.rod&&a.s.every(function(x,k){return x===o.s[k];}))return;
  if(!o.cab&&!o.rod&&o.s.every(function(x){return !x;})){if(r.ementaIntegral)r.ementaIntegral='';return;}
  r.ementaIntegral=edEmJunta(o);}
/* ---------- Diretrizes editadas no próprio manual: lápis abre o formulário no lugar da regra; "+ Nova regra" cria já aberta ---------- */
var MNF={preferencia:[['titulo','Título','t'],['preferir','Preferir','a'],['evitar','Evitar','a']],
  alerta:[['mensagem','Aviso que aparece na minuta','a'],['padrao','Palavra ou expressão a procurar','w'],['escopo','Onde (ementa, voto, relatório…)','t']],
  correcao:[['motivo','Motivo (como aparece no aviso)','a'],['padrao','Palavra ou expressão a procurar','w'],['substituir','Substituir por','t']]};
function mnForm(r){var F=MNF[r.tipo]||MNF.preferencia;
  return '<div class="mn-f" data-mnf="'+esc(r.id)+'">'+F.map(function(f){var v=r[f[0]]==null?'':r[f[0]];
    if(f[2]==='w'){var w=edPalDe(v);return '<label><span>'+f[1]+'</span>'+(w===null?'<em class="mn-fx">Regra de busca especial, mantida como está.</em>':'<input data-mnc="'+f[0]+'" data-pal="1" value="'+esc(w)+'" placeholder="ex.: writ  ·  várias, separadas por vírgula">')+'</label>';}
    return '<label><span>'+f[1]+'</span>'+(f[2]==='a'?'<textarea data-mnc="'+f[0]+'" rows="'+(f[0]==='preferir'?3:2)+'">'+esc(v)+'</textarea>':'<input data-mnc="'+f[0]+'" value="'+esc(v)+'">')+'</label>';}).join('')+
    '<div class="mn-fa">'+(EDS.orig.dir&&EDS.orig.dir[r.id]==='__novo__'?'':'<button type="button" class="mn-fdel" data-mndel>Excluir</button>')+'<span style="flex:1"></span><button type="button" data-mnx>Cancelar</button><button type="button" class="pri" data-mnok>Aplicar</button></div></div>';}
function mnAbre(id){var el=document.querySelector('#ed-man [data-dirid="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]'),r=edAcha('dir',id);if(!el||!r)return;
  if(el.tagName==='TR'){var n=el.children.length;el.outerHTML='<tr class="mn-fr"><td colspan="'+n+'">'+mnForm(r)+'</td></tr>';}else el.outerHTML=mnForm(r);
  var f=document.querySelector('#ed-man [data-mnf="'+id+'"]');if(f){f.scrollIntoView({block:'nearest'});var i=f.querySelector('input,textarea');if(i)i.focus();}}
function mnNovo(tipo,grupo){var L=edListaDe('dir'),pre=ED_DIRPRE[tipo]||'red-dir-',mx=0;L.forEach(function(x){if(String(x.id).indexOf(pre)===0){var n=parseInt(String(x.id).slice(pre.length),10);if(n>mx)mx=n;}});
  var r={id:pre+String(mx+1).padStart(2,'0'),tipo:tipo};(MNF[tipo]||[]).forEach(function(f){r[f[0]]='';});if(grupo)r.grupo=grupo;if(tipo!=='preferencia')r.flags='i';
  L.unshift(r);edToca('dir',r,true);xManual();mnAbre(r.id);}
function mnVazio(r){return (MNF[r.tipo]||MNF.preferencia).every(function(f){return !String(r[f[0]]||'').trim();});}
document.addEventListener('click',function(e){if(!e.target.closest||!e.target.closest('#ed-man'))return;var b;
  if((b=e.target.closest('[data-mnpen]'))){var aberto=document.querySelector('#ed-man [data-mnf]');if(aberto)xManual();mnAbre(b.getAttribute('data-mnpen'));return;}
  if((b=e.target.closest('[data-mnnovo]'))){var tg=b.getAttribute('data-mnnovo').split('|');mnNovo(tg[0],tg[1]);return;}
  var f=e.target.closest('[data-mnf]');if(!f)return;var id=f.getAttribute('data-mnf'),r=edAcha('dir',id);if(!r)return;
  if(e.target.closest('[data-mnx]')){if(EDS.orig.dir[id]==='__novo__'&&mnVazio(r))edDesfaz('dir',id);xManual();return;}
  if((b=e.target.closest('[data-mndel]'))){if(!b.classList.contains('conf')){b.classList.add('conf');b.textContent='Confirmar exclusão';return;}edToca('dir',r);var L=edListaDe('dir');L.splice(L.indexOf(r),1);edGuarda();xManual();toast('Regra excluída (vale ao salvar)');return;}
  if(e.target.closest('[data-mnok]')){var n=JSON.parse(edJ(r));f.querySelectorAll('[data-mnc]').forEach(function(c){var k=c.getAttribute('data-mnc'),v=c.value;
      if(c.getAttribute('data-pal')){if(edPalDe(n[k])===v.trim())return;n[k]=edPalPara(v);if(n[k]&&!n.flags)n.flags='i';return;}n[k]=v.trim();});
    if(mnVazio(n)){toast('Preencha a regra antes de aplicar');return;}
    if(n.tipo==='preferencia'&&!n.titulo){toast('Dê um título à regra');return;}
    if(n.tipo!=='preferencia'&&!n.padrao){toast('Informe a palavra procurada');return;}
    if(edJ(n)!==edJ(r)){edToca('dir',r);edPoe(r,n);edGuarda();toast('Alteração aplicada; vale ao salvar');}
    xManual();var el=document.querySelector('#ed-man [data-dirid="'+id+'"]');if(el)el.scrollIntoView({block:'nearest'});return;}});
document.addEventListener('keydown',function(e){var f=e.target.closest&&e.target.closest('#ed-man [data-mnf]');if(!f)return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();var x=f.querySelector('[data-mnx]');if(x)x.click();}
  else if((e.ctrlKey||e.metaKey)&&(e.key==='Enter'||e.key==='s'||e.key==='S')){e.preventDefault();e.stopPropagation();var o=f.querySelector('[data-mnok]');if(o)o.click();}},true);
/* ---------- Entradas rápidas: aba própria do editor (ao lado das coleções) ---------- */
EDS.rap=false;
window.VDM_RAPTAB=function(){var el=$('#ed-rap');if(el)el.innerHTML=rapHtml('',true);edRapBtn();};
/* busca das Entradas rápidas, no topo da coluna esquerda */
document.addEventListener('input',function(e){if(!e.target||e.target.id!=='rap-q')return;var v=e.target.value;clearTimeout(window.VDM_RAPTAB._t);
  window.VDM_RAPTAB._t=setTimeout(function(){RAP.q=v;window.VDM_RAPTAB();var q=document.getElementById('rap-q');if(q){q.focus();try{q.setSelectionRange(v.length,v.length);}catch(x){}}},200);});
function edRapBtn(){var b=$('[data-edrap]'),n=rapLista().filter(function(r){return r.situacao!=='incorporada';}).length;if(b)b.innerHTML='Entradas rápidas'+(n?' <i class="ed-rapn">'+n+'</i>':'');}
(function(){var edRenderR=edRender;edRender=function(){window.VDM_RAP_TAB=!!EDS.rap;var r=edRenderR.apply(this,arguments);
  var seg=$('#ed-ov .ed-cols');if(seg&&!seg.querySelector('[data-edrap]')){seg.insertAdjacentHTML('beforeend','<button data-edrap aria-pressed="'+EDS.rap+'"></button>');edRapBtn();}
  if(EDS.rap){[].forEach.call(document.querySelectorAll('#ed-ov [data-edcol]'),function(b){b.setAttribute('aria-pressed','false');});
    var bd=$('#ed-ov .ed-body');if(bd){bd.classList.add('ed-rapb');bd.innerHTML='<section class="ed-rap" id="ed-rap">'+rapHtml('',true)+'</section>';if(window.rapLiga)window.rapLiga($('#ed-rap'));}}
  return r;};})();
document.addEventListener('click',function(e){if(!e.target.closest)return;
  if(e.target.closest('[data-edrap]')){if(EDS.dirty&&!edAplicar(true))return;EDS.rap=true;EDS.id=null;edRender();return;}
  if(e.target.closest('#ed-ov [data-edcol]'))EDS.rap=false;},true);
/* incorporar e excluir sem as caixas do navegador: confirmação no próprio cartão */
document.addEventListener('click',function(e){var R=e.target.closest&&e.target.closest('#ed-rap');if(!R)return;var b;
  if((b=e.target.closest('[data-rapinc]'))){e.stopPropagation();e.preventDefault();var id=b.getAttribute('data-rapinc'),a=b.closest('.rap-a');
    a.innerHTML='<input class="rap-dst" placeholder="Onde foi incorporada? (ex.: Diretrizes · Vocabulário, parágrafo, peça)"><button class="e-mini pri" data-rapincok="'+esc(id)+'">Confirmar</button><button class="e-mini" data-rapincx>Cancelar</button>';var i=a.querySelector('input');if(i)i.focus();return;}
  if((b=e.target.closest('[data-rapincok]'))){e.stopPropagation();var id2=b.getAttribute('data-rapincok'),v=(b.parentNode.querySelector('.rap-dst')||{}).value||'';
    rapMuda(id2,function(n){n.situacao='incorporada';n.destino=v.trim();},'Diretrizes: entrada rápida incorporada');return;}
  if(e.target.closest('[data-rapincx]')){e.stopPropagation();window.VDM_RAPTAB();return;}
  if((b=e.target.closest('[data-rapdel]'))&&!b.classList.contains('conf')){e.stopPropagation();e.preventDefault();b.classList.add('conf');b.textContent='Confirmar exclusão';return;}
  if((b=e.target.closest('[data-rapdel].conf'))){e.stopPropagation();e.preventDefault();var id3=b.getAttribute('data-rapdel'),x=rapAcha(id3);if(!x)return;
    rapGrava([{op:'del',id:id3,orig:rapJ(x)}],'Diretrizes: entrada rápida excluída',function(){var L=rapBase();L.splice(L.indexOf(rapAcha(id3)),1);});return;}},true);
/* ---------- textos padrão do aviso à equipe depois de salvar (título e mensagem; os dois continuam editáveis no diálogo) ---------- */
var EDNTF={
  nome:{par:['Parágrafo','Parágrafos','o'],pec:['Peça','Peças','a'],dir:['Diretriz','Diretrizes','a'],rap:['Entrada rápida','Entradas rápidas','a'],nor:['Norma','Normas','a'],mod:['Modelo','Modelos','o']},
  verbo:{novo:['Incluído','Incluída','incluído','incluída'],editado:['Alterado','Alterada','alterado','alterada'],'excluído':['Excluído','Excluída','excluído','excluída']},
  abertura:'O Desembargador atualizou o Compendium:',
  fecho:'As mudanças entram no Compendium em alguns minutos.'};
function edNtf(P){var N=EDNTF.nome,V=EDNTF.verbo,fem=function(c){return (N[c]||N.dir)[2]==='a';};
  var cols=[];P.forEach(function(p){if(cols.indexOf(p.col)<0)cols.push(p.col);});
  var t;if(P.length===1){var p0=P[0],n0=N[p0.col]||[EDCOL[p0.col],EDCOL[p0.col],'o'];t=n0[0]+' '+V[p0.sit][fem(p0.col)?3:2]+': '+String(p0.t||'').slice(0,110);}
  else if(cols.length===1){var n1=N[cols[0]]||[EDCOL[cols[0]],EDCOL[cols[0]]];t=n1[1]+' atualizad'+(fem(cols[0])?'as':'os')+': '+P.length+' alterações';}
  else t='Compendium atualizado: '+P.length+' alterações';
  var m=[EDNTF.abertura];cols.forEach(function(c){var nn=N[c]||[EDCOL[c],EDCOL[c]];m.push('','',nn[1].toUpperCase());
    P.filter(function(p){return p.col===c;}).slice(0,15).forEach(function(p){m.push('• '+V[p.sit][fem(c)?1:0]+': '+String(p.t||'').slice(0,140));});
    var r=P.filter(function(p){return p.col===c;}).length-15;if(r>0)m.push('• e mais '+r);});
  m.push('',EDNTF.fecho);return {t:t,m:m.join('\n').replace(/\n\n\n/g,'\n\n')};}
/* ---------- Parágrafos e Peças no editor do desembargador: leitura como na minuta, lápis para editar no lugar ---------- */
var LPCAT=['Abertura','Fundamento','Aplicação','Encerramento','Seção','Genéricos','Documentação'];
var LPST={padrao:'padrão',preferencial:'preferencial',variante:'variante',estrutural:'estrutural',especifico:'específico',anterior:'anterior',pedido:'pedido'};
var LPBLOCO={'Cabeçalho':'Abertura','Vocativo':'Abertura','Abertura':'Abertura','Sobrestamento sem suspensão':'Abertura','Transição ao mérito':'Fundamento','Moldura jurídica':'Fundamento','Precedente':'Fundamento',
  'Exame do caso':'Aplicação','Enfrentamento das alegações':'Aplicação','Síntese':'Aplicação','Honorários recursais':'Encerramento','Consectários':'Encerramento','Dispositivo':'Encerramento','Encerramento':'Encerramento'};
function lpTx(t){return String(t||'').split(/\n+/).map(function(par){var h=esc(par).replace(/\{\{?\s*([^{}|]+?)(?:\|([^{}]+?))?\s*\}?\}/g,function(m,a,b){return '<span class="lp-v">'+(b||a)+'</span>';})
  .replace(/\[([^\]]{1,80})\]/g,function(m,a){return '<span class="lp-v pf">'+a+'</span>';});return h?'<p>'+h+'</p>':'';}).join('');}
function lpPen(k,id){return '<button type="button" class="mn-pen" data-lppen="'+k+'|'+esc(id)+'" title="Editar" aria-label="Editar">'+'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></button>';}
function lpPar(r){return '<div class="lp-c mn-ed'+(edSit('par',r.id)?' mud':'')+'" data-lpid="par|'+esc(r.id)+'" id="lp-par-'+esc(r.id)+'"><h4>'+esc(r.titulo||'(sem título)')+'</h4>'+(String(r.texto||'').length>360?'<div class="lp-t lp-cl" data-lpcl title="Clique para ler inteiro">':'<div class="lp-t">')+lpTx(r.texto)+'</div>'+
  (r.uso?'<p class="lp-u"><b>Quando usar</b> '+esc(r.uso)+'</p>':'')+'<p class="lp-m">'+esc([LPST[r.status]||r.status,r.nivelSubsecao,r.nivelTema].filter(Boolean).join(' · '))+'</p>'+lpPen('par',r.id)+'</div>';}
/* em que peça o parágrafo entra: campo "peca" quando gravado; sem ele, lido do título, do texto e dos marcadores */
var LPPECA=['Voto','Monocrática','Despacho'],LPPECAT={'Voto':'Voto','Monocrática':'Monocráticas','Despacho':'Despachos'};
function lpPeca(r){if(LPPECA.indexOf(r.peca)>=0)return r.peca;var s=nz([r.titulo,r.texto,r.uso,r.especificidadesTags,r.nivelTema,r.categoria].join(' '));
  if(/\bdespach|\bintime-se\b|\bmanifeste-se\b|\bintimac/.test(s))return 'Despacho';
  if(/monocrat|decisao terminativa|\bdecido\b|unipessoal|artigo 932|art\. 932/.test(s))return 'Monocrática';return 'Voto';}
function lpSlug(t){return nz(t).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function lpParView(){var L=edFiltrar(edListaDe('par')),P={};
  L.forEach(function(r){var k=lpPeca(r),c=r.nivelCategoria||'Outros';(P[k]=P[k]||{})[c]=(P[k][c]||[]).concat([r]);});
  var ord=function(o){return Object.keys(o).sort(function(a,b){var i=LPCAT.indexOf(a),j=LPCAT.indexOf(b);return (i<0?99:i)-(j<0?99:j);});};
  var PK=LPPECA.filter(function(k){return P[k];}),n=function(k){return ord(P[k]).reduce(function(t,c){return t+P[k][c].length;},0);};
  var toc='<nav class="lp-toc" aria-label="Sumário">'+lpBusca('Buscar parágrafos',L.length,edListaDe('par').length)+PK.map(function(k){return '<a class="lp-tk" href="#lp-'+lpSlug(k)+'" data-lpgo="lp-'+lpSlug(k)+'">'+LPPECAT[k]+'<i>'+n(k)+'</i></a>'+
    ord(P[k]).map(function(c){return '<a href="#lp-'+lpSlug(k+'-'+c)+'" data-lpgo="lp-'+lpSlug(k+'-'+c)+'">'+esc(c)+'<i>'+P[k][c].length+'</i></a>';}).join('');}).join('')+'</nav>';
  var body='<header class="lp-hd"><p class="mn-k">Compendium · editor do Desembargador</p><h1>Parágrafos</h1><p class="lp-sub">Como entram na minuta, separados por peça. Passe o mouse e clique no lápis para editar ali mesmo; clique no texto para lê-lo inteiro.</p>'+
    '<div class="lp-bus"><button type="button" class="mn-nova" data-lpnovo="par">+ Novo parágrafo</button></div></header>'+
    (PK.length?PK.map(function(k,ii){return '<section class="lp-pk" id="lp-'+lpSlug(k)+'"><h2><span>'+(ii+1)+'</span>'+LPPECAT[k]+'<small>'+n(k)+'</small></h2>'+
      ord(P[k]).map(function(c){var S={},so=[];P[k][c].forEach(function(r){var x=r.nivelSubsecao||'Geral';if(!S[x]){S[x]=[];so.push(x);}S[x].push(r);});
        return '<div class="lp-cat" id="lp-'+lpSlug(k+'-'+c)+'"><h3>'+esc(c)+'<small>'+P[k][c].length+'</small></h3>'+so.map(function(x){return (so.length>1||x!=='Geral'?'<p class="lp-sub2">'+esc(x)+'</p>':'')+S[x].map(lpPar).join('');}).join('')+'</div>';}).join('')+'</section>';}).join('')
    :'<p class="empty">Nenhum parágrafo com esta busca ou filtro.</p>');
  return '<div class="lp-grid">'+toc+'<div class="lp-doc">'+body+'</div></div>';}
function lpEl(p,e,i){return '<div class="lp-c lp-el mn-ed'+(edSit('pec',p.id)?' mud':'')+'" data-lpid="pec|'+esc(p.id)+'|'+i+'"><h4><span class="lp-n">'+(i+1)+'</span>'+esc(String(e.n||'').replace(/^\d+\.\s*/,''))+'</h4>'+
  (e.f?'<div class="lp-t">'+lpTx(e.f)+'</div>':'')+((e.r||[]).length?'<ul class="lp-r">'+e.r.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'')+
  ((e.alts||[]).length?'<details class="lp-alt"><summary>'+e.alts.length+(e.alts.length>1?' alternativas':' alternativa')+'</summary>'+e.alts.map(function(a){return '<div><b>'+esc(a.lab||'Alternativa')+'</b>'+lpTx(a.f)+'</div>';}).join('')+'</details>':'')+lpPen('pec',p.id+'|'+i)+'</div>';}
function lpPecView(){var L=edListaDe('pec'),q=nz(EDS.q||''),G={},ord=[],nv=0;
  L.filter(function(p){return !q||nz(JSON.stringify(p)).indexOf(q)>=0;}).forEach(function(p){var g=p.grupo||'Outras';nv++;if(!G[g]){G[g]=[];ord.push(g);}G[g].push(p);});
  var toc='<nav class="lp-toc" aria-label="Sumário">'+lpBusca('Buscar nas peças',nv,L.length)+(ord.length?'':'<p class="lp-tv">Nenhuma peça com esta busca.</p>')+ord.map(function(g){return '<span class="lp-tk">'+esc(g)+'</span>'+G[g].map(function(p){return '<a href="#lp-pec-'+esc(p.id)+'" data-lpgo="lp-pec-'+esc(p.id)+'">'+esc(p.t||p.id)+'<i>'+(p.elementos||[]).length+'</i></a>';}).join('');}).join('')+'</nav>';
  return '<div class="lp-grid">'+toc+'<div class="lp-doc"><header class="lp-hd"><p class="mn-k">Compendium · editor do Desembargador</p><h1>Peças</h1><p class="lp-sub">A sequência de cada peça, trecho a trecho. O lápis edita o nome, a fórmula e as regras do trecho.</p></header>'+
    ord.map(function(g){return '<section class="lp-sec"><h2 class="lp-g">'+esc(g)+'</h2>'+G[g].map(function(p){var bl='';
      return '<article class="lp-pc" id="lp-pec-'+esc(p.id)+'"><h3 class="lp-pt">'+esc(p.t||p.id)+'</h3>'+(p.resumo?'<p class="lp-lead">'+esc(p.resumo)+'</p>':'')+
        (p.elementos||[]).map(function(e,i){var b=p.id==='voto'?LPBLOCO[String(e.n||'').replace(/^\d+\.\s*/,'')]:'',h='';if(b&&b!==bl){h='<p class="lp-bl">'+b+'</p>';bl=b;}return h+lpEl(p,e,i);}).join('')+
        ((p.notas||[]).length?'<div class="lp-not"><b>Notas</b><ul>'+p.notas.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div>':'')+'</article>';}).join('')+'</section>';}).join('')+'</div></div>';}
/* busca no topo da coluna esquerda (Parágrafos e Peças): mesmo estado EDS.q da lista do editor */
function lpBusca(ph,n,t){return '<div class="lp-tq"><input type="search" id="lp-q" value="'+esc(EDS.q||'')+'" placeholder="'+ph+'" aria-label="'+ph+'">'+(n!==t?'<small>'+n+' de '+t+'</small>':'')+'</div>';}
function lpVista(){var fm=$('#ed-form');if(!fm)return;var sc=fm.scrollTop;fm.innerHTML='<div class="lp-ler" id="ed-ler">'+(EDS.col==='par'?lpParView():lpPecView())+'</div>';fm.scrollTop=sc;}
function lpAtivo(){return EDCMT&&!EDS.rap&&!EDS.id&&(EDS.col==='par'||EDS.col==='pec');}
(function(){var edRenderL=edRender;edRender=function(){var r=edRenderL.apply(this,arguments);if(lpAtivo())lpVista();return r;};
  /* clicar na lista à esquerda leva ao parágrafo ou à peça na leitura (e abre o parágrafo para editar) */
  var edVaiL=edVai;edVai=function(id){if(!(EDCMT&&(EDS.col==='par'||EDS.col==='pec')))return edVaiL.apply(this,arguments);
    if(EDS.id){EDS.id=null;edRender();}var el=document.getElementById('lp-'+EDS.col+'-'+id);if(!el){EDS.q='';edRender();el=document.getElementById('lp-'+EDS.col+'-'+id);}
    if(el){el.scrollIntoView({block:'start',behavior:'smooth'});if(EDS.col==='par')lpAbre('par|'+id);}};
  var edNovoL=edNovo;edNovo=function(){var r=edNovoL.apply(this,arguments);if(EDCMT&&EDS.col==='par'&&EDS.id){var id=EDS.id;EDS.id=null;EDS.q='';edRender();lpAbre('par|'+id);var el=document.querySelector('[data-lpf]');if(el)el.scrollIntoView({block:'center'});}return r;};})();
function lpForm(k){var a=k.split('|');
  if(a[0]==='par'){var r=edAcha('par',a[1]);if(!r)return '';var op=function(L,v,lab){return (L.indexOf(v)<0&&v?'<option>'+esc(v)+'</option>':'')+L.map(function(o){return '<option value="'+esc(o)+'"'+(o===v?' selected':'')+'>'+esc(lab?lab[o]||o:o)+'</option>';}).join('');};
    return '<div class="mn-f lp-f" data-lpf="'+esc(k)+'"><label><span>Título</span><input data-lpc="titulo" value="'+esc(r.titulo||'')+'"></label>'+
      '<label><span>Texto</span><textarea data-lpc="texto" rows="'+Math.min(16,Math.max(5,Math.ceil(String(r.texto||'').length/90)))+'" class="lp-ta">'+esc(r.texto||'')+'</textarea></label>'+
      '<p class="lp-hint">Campos variáveis: {nome} ou {nome|rótulo}; trecho entre colchetes [ … ] vira campo a preencher.</p>'+
      '<label><span>Quando usar</span><textarea data-lpc="uso" rows="2">'+esc(r.uso||'')+'</textarea></label>'+
      '<div class="lp-2 lp-3"><label><span>Usado em</span><select data-lpc="peca">'+op(LPPECA,lpPeca(r))+'</select></label><label><span>Onde entra</span><select data-lpc="nivelCategoria">'+op(['Abertura','Fundamento','Aplicação','Encerramento','Genéricos','Documentação'],r.nivelCategoria||'')+'</select></label>'+
      '<label><span>Situação</span><select data-lpc="status">'+op(Object.keys(LPST),r.status||'padrao',LPST)+'</select></label></div>'+
      '<div class="mn-fa"><span style="flex:1"></span><button type="button" data-lpx>Cancelar</button><button type="button" class="pri" data-lpok>Aplicar</button></div></div>';}
  var p=edAcha('pec',a[1]),e=p&&(p.elementos||[])[+a[2]];if(!e)return '';
  return '<div class="mn-f lp-f" data-lpf="'+esc(k)+'"><label><span>Nome do trecho</span><input data-lpc="n" value="'+esc(e.n||'')+'"></label>'+
    '<label><span>Fórmula</span><textarea data-lpc="f" rows="'+Math.min(12,Math.max(3,Math.ceil(String(e.f||'').length/90)))+'" class="lp-ta">'+esc(e.f||'')+'</textarea></label>'+
    '<label><span>Regras (uma por linha)</span><textarea data-lpc="r" rows="3">'+esc((e.r||[]).join('\n'))+'</textarea></label>'+
    ((e.alts||[]).length?'<p class="lp-hint">As alternativas deste trecho continuam como estão.</p>':'')+
    '<div class="mn-fa"><span style="flex:1"></span><button type="button" data-lpx>Cancelar</button><button type="button" class="pri" data-lpok>Aplicar</button></div></div>';}
function lpAbre(k){var aberto=document.querySelector('#ed-ler [data-lpf]');if(aberto)lpVista();
  var el=document.querySelector('#ed-ler [data-lpid="'+k.replace(/"/g,'\\"')+'"]');if(!el)return;el.outerHTML=lpForm(k);
  var f=document.querySelector('#ed-ler [data-lpf]');if(f){var i=f.querySelector('input,textarea');if(i)i.focus();}}
document.addEventListener('click',function(e){if(!e.target.closest||!e.target.closest('#ed-ler'))return;var b;
  if((b=e.target.closest('[data-lpgo]'))){e.preventDefault();var al=document.getElementById(b.getAttribute('data-lpgo'));if(al)al.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if((b=e.target.closest('[data-lpcl]'))&&!e.target.closest('a,button')){b.classList.toggle('ab');return;}
  if((b=e.target.closest('[data-lppen]'))){lpAbre(b.getAttribute('data-lppen'));return;}
  if(e.target.closest('[data-lpnovo]')){edNovo();return;}
  var f=e.target.closest('[data-lpf]');if(!f)return;var a=f.getAttribute('data-lpf').split('|');
  if(e.target.closest('[data-lpx]')){if(a[0]==='par'){var r0=edAcha('par',a[1]);if(r0&&EDS.orig.par[a[1]]==='__novo__'&&!String(r0.texto||'').trim())edDesfaz('par',a[1]);}lpVista();return;}
  if(!e.target.closest('[data-lpok]'))return;var v={};f.querySelectorAll('[data-lpc]').forEach(function(c){v[c.getAttribute('data-lpc')]=c.value;});
  if(a[0]==='par'){var r=edAcha('par',a[1]);if(!v.titulo.trim()||!v.texto.trim()){toast('Título e texto são obrigatórios');return;}
    var n=JSON.parse(edJ(r));n.titulo=v.titulo.trim();n.texto=v.texto.replace(/\s+$/,'');n.uso=v.uso.trim();n.nivelCategoria=v.nivelCategoria;n.status=v.status;if(v.peca&&(r.peca||v.peca!==lpPeca(r)))n.peca=v.peca;
    if(edJ(n)!==edJ(r)){edToca('par',r);edPoe(r,n);edGuarda();toast('Alteração aplicada; vale ao salvar');}}
  else{var p=edAcha('pec',a[1]);var n2=JSON.parse(edJ(p)),el=n2.elementos[+a[2]];el.n=v.n.trim()||el.n;el.f=v.f.replace(/\s+$/,'');el.r=v.r.split('\n').map(function(x){return x.trim();}).filter(Boolean);
    if(edJ(n2)!==edJ(p)){edToca('pec',p);edPoe(p,n2);edGuarda();toast('Alteração aplicada; vale ao salvar');}}
  lpVista();var x=document.querySelector('#ed-ler [data-lpid="'+a.join('|')+'"]');if(x)x.scrollIntoView({block:'nearest'});});
document.addEventListener('keydown',function(e){var f=e.target.closest&&e.target.closest('#ed-ler [data-lpf]');if(!f)return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();f.querySelector('[data-lpx]').click();}
  else if((e.ctrlKey||e.metaKey)&&(e.key==='Enter'||e.key==='s'||e.key==='S')){e.preventDefault();e.stopPropagation();f.querySelector('[data-lpok]').click();}},true);
/* busca dos Parágrafos dentro da leitura: refaz só a leitura e devolve o cursor ao campo */
document.addEventListener('input',function(e){if(!e.target||e.target.id!=='lp-q')return;var v=e.target.value;clearTimeout(lpVista._t);
  lpVista._t=setTimeout(function(){EDS.q=v;lpVista();var q=document.getElementById('lp-q');if(q){q.focus();try{q.setSelectionRange(v.length,v.length);}catch(x){}}},220);});
