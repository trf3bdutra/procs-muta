(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s);};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function nz(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
function fmtD(d){return d?String(d).split('-').reverse().join('/'):'—';}
function n0(n){return Number(n||0).toLocaleString('pt-BR');}
function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(function(){t.classList.remove('on');},1800);}
function copiar(txt,msg){
  function fb(){var a=document.createElement('textarea');a.value=txt;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast(msg);}catch(e){toast('Não foi possível copiar');}a.remove();}
  try{navigator.clipboard.writeText(txt).then(function(){toast(msg);},fb);}catch(e){fb();}
}
var MESES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function mesL(y){var m=/^(\d{4})-(\d{2})$/.exec(y||'');return m?MESES[+m[2]-1]+'/'+m[1].slice(2):(y||'—');}
var PAL=['#d4ab58','#7fa3c9','#8fb59a','#c78c79','#a58fc9','#6fb5b0','#c9a0b8','#9aa36b','#e0a64f','#8a96a3'];

/* ================= EMENTÁRIO ================= */
/* Base do gabinete (procs-muta) embutida no arquivo: precedentes, inteiros teores, modelos e parágrafos-padrão */
var BASE=null,BASEP=null;
function base(){
  if(BASE)return Promise.resolve(BASE);if(BASEP)return BASEP;
  var el=document.getElementById('base-gz'),t=(el&&el.textContent||'').trim();
  if(!t||t.indexOf('/*__')===0)return Promise.reject(new Error('base do gabinete ausente no arquivo'));
  if(typeof DecompressionStream==='undefined')return Promise.reject(new Error('navegador sem suporte a descompressão; use Chrome, Edge ou Firefox atual'));
  var bin=atob(t),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  BASEP=new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text().then(function(x){BASE=JSON.parse(x);return BASE;});
  return BASEP;
}
/* classificação derivada do índice: automática, sujeita a conferência */
function classRes(r){
  var s=nz(r);
  if(!s)return 'Sem dispositivo no índice';
  if(/prejudicad|perda (superveniente )?(de |do )?objeto/.test(s))return 'Prejudicado';
  if(/embarg/.test(s)&&/acolh/.test(s)&&!/rejeit|nao acolh/.test(s))return 'Embargos acolhidos';
  if(/rejeit\w*\s+(os\s+)?embarg|embarg[^.]{0,40}rejeit/.test(s))return 'Embargos rejeitados';
  if(/parcial\s+provimento|provimento\s+parcial|parcialmente\s+provid|provid\w*\s+em\s+parte|parcial\s+procedencia/.test(s))return 'Parcialmente provido';
  if(/nao\s+conhe|nao\s+conhecimento|deix\w+\s+de\s+conhec/.test(s))return 'Não conhecido';
  if(/neg\w*\s*(-?lhe\s+)?seguimento/.test(s))return 'Seguimento negado';
  if(/neg\w*\s*(-?lhe\s+)?(\w+\s+){0,2}provimento|desprov|improv/.test(s))return 'Desprovido';
  if(/(dar|deu|dou|dando|deram|dado)\s*(-?lhe\s+)?(\w+\s+){0,2}provimento|provejo|\bprovid[oa]s?\b/.test(s))return 'Provido';
  if(/procedente o conflito|conflito\s+(negativo|positivo)/.test(s))return 'Conflito de competência';
  if(/indefiro a (peticao )?inicial|indeferi\w* (a )?(peticao )?inicial/.test(s))return 'Inicial indeferida';
  if(/homolog/.test(s))return 'Homologação';
  if(/extin/.test(s))return 'Extinção';
  if(/concedo a seguranca|denego a seguranca|concedid|denegad/.test(s))return 'Segurança/ordem';
  if(/anul/.test(s))return 'Anulação';
  return 'Outro';
}
var MAT=[['tribut','Tributário'],['previd','Previdenciário'],['assist','Assistencial'],['aduan','Aduaneiro'],['ambient','Ambiental'],['adminis','Administrativo'],['constitu','Constitucional'],['econom','Econômico'],['empres','Empresarial'],['consum','Consumidor'],['internac','Internacional'],['sanit','Sanitário'],['penal','Penal'],['civil','Civil']];
var RAMO0=/^(direito|processual|processo|constitu|tribut|previd|adminis|assist|civil|aduan|ambient|penal|econom)/;
var RAMOW=/\b(direitos?|processual|processo|constitucional|tributario|administrativo|previdenciario|assistencial|civil|aduaneiro|ambiental|economico|penal|empresarial|e|do|da)\b/g;
var CLSW=/^(agravos?|apela|embargos|remessa|reexame|recurso|acao rescis|conflito|suspens|e m e n t a|cautelar|decido|artigo 557|557)/;
function segs(e){return String(e||'').replace(/…/g,'').split(/\.\s+|\s+[-–]\s+/).slice(0,7).map(function(x){return x.trim();}).filter(Boolean);}
function ramoAss(x){
  var S=segs(x.e),ramo=null,ass=null;
  if(S.length&&RAMO0.test(nz(S[0]))){
    for(var i=0;i<Math.min(3,S.length)&&!ramo;i++){var n=nz(S[i]);if(n.length>70)continue;
      for(var j=0;j<MAT.length;j++){var k=MAT[j][0];if(n.indexOf(k)>=0&&!((k==='civil'||k==='penal')&&n.indexOf('process')>=0)){ramo=MAT[j][1];break;}}}
    if(!ramo)ramo=nz(S[0]).indexOf('penal')>=0?'Processual penal':'Processual civil';
    for(var a=1;a<S.length;a++){var s=S[a],m=nz(s);
      if(s.length<4||s.length>70)continue;
      if(s!==s.toUpperCase())break;
      if(CLSW.test(m))continue;
      if(!m.replace(RAMOW,'').replace(/[^a-z]/g,''))continue;
      ass=s.charAt(0)+s.slice(1).toLowerCase();break;}
  }
  x._ramo=ramo;x._ass=ass;
}
function prev(x){return String(x.e||'').replace(/^…/,'').replace(/^\s*Vistos\.?\s*/i,'');}
function titulo(x){var e=prev(x);if(x.t==='A'){var m=e.match(/^((?:[^.]{2,90}\.\s*){1,3})/);return (m?m[1]:e).trim();}return e.split(/(?<=\.)\s/)[0];}
function siglaO(o){if(!o)return 'órgão n/i';if(/Mato Grosso do Sul/.test(o))return 'TRMS';return o.replace(' Turma','ª T').replace('ªª','ª').replace(' Seção','ª S').replace('Órgão Especial','OE').replace('Vice-Presidência','VP').replace('Presidência','PRES');}

var DIM={
  t:{n:'Tipo',v:function(x){return x.t==='A'?'Acórdão':'Monocrática';}},
  apr:{n:'Apreciação',v:function(x){return x._apr||'Julgamento do recurso';}},
  ramo:{n:'Ramo',v:function(x){return x._ramo||'Sem ramo informado';}},
  ass:{n:'Assunto',v:function(x){return x._ass||'Sem assunto catalogado';}},
  c:{n:'Classe',v:function(x){return x.c||'—';}},
  o:{n:'Órgão',v:function(x){return x.o||'Órgão não informado';}},
  res:{n:'Resultado',v:function(x){return x._res;}},
  y:{n:'Mês',v:function(x){return x.y||'—';}}
};
var DIMS=['t','apr','ramo','ass','c','o','res','y'];
var MODOS=[['lista','Lista'],['mapa','Mapa mental'],['tempo','Linha do tempo'],['matriz','Matriz']];
var E={idx:null,err:null,carregando:false,F:{},q:'',y1:'',y2:'',modo:'lista',shown:60,open:{},sel:null,mais:{},
  dm:{mapa:['ramo','ass','res'],fluxo:['apr','ramo','res'],matriz:['apr','res'],tempo:'res'},mmOpen:null,clsNome:{}};
var EM={sub:'prec',q:{}};
try{var sv=JSON.parse(localStorage.getItem('vdm-ement2')||'null');if(sv){if(sv.modo&&/^(lista|mapa|tempo|matriz)$/.test(sv.modo))E.modo=sv.modo;if(sv.dm)E.dm=Object.assign(E.dm,sv.dm);}}catch(e){}
function salvar(){try{localStorage.setItem('vdm-ement2',JSON.stringify({modo:E.modo,dm:E.dm}));}catch(e){}}

var SENT={'desprovido':'Desprovido','provido':'Provido','parcialmente provido':'Parcialmente provido','rejeitados':'Embargos rejeitados','acolhidos':'Embargos acolhidos','prejudicado/extinto':'Prejudicado ou extinto','não conhecido':'Não conhecido','outro':'Outro'};
function ramoDe(rd){var n=nz(rd);if(!n)return null;var m=n.replace(/processual civil|processo civil|processual penal/g,'');for(var j=0;j<MAT.length;j++){if(m.indexOf(MAT[j][0])>=0)return MAT[j][1];}return n.indexOf('penal')>=0?'Processual penal':'Processual civil';}
function apreciacao(r){
  var cab=String(r.ementaCabecalho||r.ementa||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').split(/\.\s+/).slice(0,3).join('. ');
  var res=String(r.resultado||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').slice(0,200),st=r.sentidoResultado||'';
  if(cab.indexOf('RETRATACAO')>=0||res.indexOf('JUIZO DE RETRATACAO')===0)return 'Juízo de retratação';
  if(/AGRAVOS? (INTERNOS?|REGIMENTAL|LEGAL)/.test(cab)||/^AGRAVOS? (INTERNOS?|REGIMENTAL|LEGAL)/.test(res))return 'Agravo interno';
  if(st==='rejeitados'||st==='acolhidos'||cab.indexOf('EMBARGOS DE DECLARACAO')>=0||res.indexOf('EMBARGOS DE DECLARACAO')===0||r.classeSigla==='ED')return 'Embargos de declaração';
  return 'Julgamento do recurso';
}
function carregar(){
  if(E.idx||E.carregando)return;E.carregando=true;
  $('#e-out').innerHTML='<p class="empty">Abrindo a base do gabinete…</p>';
  base().then(function(B){
    var d=(B.prec||[]).map(function(r){
      var x={id:r.id,t:/^voto/i.test(r.pronunciamento||'Voto')?'A':'M',n:r.processo,c:r.classeSigla||r.especie||'',cl:r.classe||'',o:r.orgao||'',d:r.dataJulgamento||'',p:r.dataPublicacao||'',e:r.ementa||'',r:r.resultado||'',temas:r.temas||'',tese:r.tese||'',disp:r.dispositivosCitados||'',jur:r.jurisprudenciaCitada||'',it:!!r.inteiroTeor};
      x.y=(x.d||'').slice(0,7);x._apr=apreciacao(r);x._ramo=ramoDe(r.ramoDireito);x._rd=r.ramoDireito||'';x._ass=r.assunto||null;
      x._res=SENT[r.sentidoResultado]||(x.r?classRes(x.r):'Sem classificação');
      x._q=nz([x.n,x.c,x.cl,x.o,x.e,x.r,x.temas,x._ass,x.tese].join(' '));if(x.c&&x.cl)E.clsNome[x.c]=x.cl;return x;});
    d.sort(function(a,b){return (b.d||'').localeCompare(a.d||'');});
    E.idx=d;E.carregando=false;if(EM.sub==='prec')render();
  }).catch(function(e){E.carregando=false;$('#e-out').innerHTML='<p class="empty">Não foi possível abrir a base do gabinete ('+esc(e.message)+').</p>';});
}
function passa(x,excl){
  for(var k in E.F){if(k===excl||!E.F[k])continue;if(DIM[k].v(x)!==E.F[k])return false;}
  if(excl!=='y'){if(E.y1&&x.y<E.y1)return false;if(E.y2&&x.y>E.y2)return false;}
  if(E.qn){for(var i=0;i<E.qn.length;i++)if(x._q.indexOf(E.qn[i])<0)return false;}
  return true;
}
function filtrados(){return E.idx.filter(function(x){return passa(x);});}
function conta(L,dim){var m={};L.forEach(function(x){var v=DIM[dim].v(x);m[v]=(m[v]||0)+1;});return Object.keys(m).map(function(k){return [k,m[k]];}).sort(function(a,b){return b[1]-a[1]||a[0].localeCompare(b[0]);});}
function top(L,dim,n){var c=conta(L,dim);if(c.length<=n)return c;var r=c.slice(0,n),o=0;c.slice(n).forEach(function(z){o+=z[1];});r.push(['__outros',o,c.length-n]);return r;}
function rot(k,extra){return k==='__outros'?'Outros ('+extra+')':k;}
var CORRES={};function corRes(v){if(!(v in CORRES)){var ord=['Desprovido','Provido','Parcialmente provido','Embargos rejeitados','Embargos acolhidos','Não conhecido','Prejudicado ou extinto','Seguimento negado','Extinção','Outro'];var i=ord.indexOf(v);CORRES[v]=i>=0?PAL[i]:PAL[9];}return CORRES[v];}

function render(){
  if(!E.idx||EM.sub!=='prec')return;
  var L=filtrados();
  renderAside();
  $('#e-cnt').innerHTML='<b>'+n0(L.length)+'</b> de '+n0(E.idx.length)+' precedentes';
  var m='<div class="seg" role="group" aria-label="Modo de visualização">'+MODOS.map(function(z){return '<button data-m="'+z[0]+'" aria-pressed="'+(E.modo===z[0])+'">'+z[1]+'</button>';}).join('')+'</div>';
  m+=dimsCtl();
  m+='<span class="sp"></span><button class="btn" id="e-cpn" title="Copiar os números de processo filtrados">Copiar números</button><button class="btn" id="e-csv" title="Baixar planilha CSV dos filtrados">Baixar CSV</button>';
  $('#e-modes').innerHTML=m;
  $$('#e-modes [data-m]').forEach(function(b){b.onclick=function(){E.modo=b.getAttribute('data-m');E.sel=null;salvar();render();};});
  $$('#e-modes select[data-d]').forEach(function(s){s.onchange=function(){var k=s.getAttribute('data-d'),i=+s.getAttribute('data-i');if(Array.isArray(E.dm[k]))E.dm[k][i]=s.value;else E.dm[k]=s.value;E.mmOpen=null;E.sel=null;salvar();render();};});
  $('#e-cpn').onclick=function(){copiar(L.map(function(x){return x.n;}).join('\n'),n0(L.length)+' números copiados');};
  $('#e-csv').onclick=function(){baixarCsv(L);};
  chips();selBar();
  var out=$('#e-out');
  if(!L.length){out.innerHTML='<p class="empty">Nenhum precedente com esses filtros.</p>';return;}
  ({lista:vLista,mapa:vMapa,tempo:vTempo,matriz:vMatriz})[E.modo]?({lista:vLista,mapa:vMapa,tempo:vTempo,matriz:vMatriz})[E.modo](L,out):vLista(L,out);
}
function selDim(k,i,v,lab){return '<label>'+lab+' <select data-d="'+k+'" data-i="'+i+'">'+DIMS.filter(function(d){return k!=='tempo'||d!=='y';}).map(function(d){return '<option value="'+d+'"'+(d===v?' selected':'')+'>'+DIM[d].n+'</option>';}).join('')+'</select></label>';}
function dimsCtl(){
  var k=E.modo,h='';
  if(k==='mapa')h=selDim(k,0,E.dm.mapa[0],'Níveis')+selDim(k,1,E.dm.mapa[1],'›')+selDim(k,2,E.dm.mapa[2],'›');
  else if(k==='fluxo')h=selDim(k,0,E.dm.fluxo[0],'Colunas')+selDim(k,1,E.dm.fluxo[1],'→')+selDim(k,2,E.dm.fluxo[2],'→');
  else if(k==='matriz')h=selDim(k,0,E.dm.matriz[0],'Linhas')+selDim(k,1,E.dm.matriz[1],'Colunas');
  else if(k==='tempo')h=selDim(k,0,E.dm.tempo,'Cor por');
  return h?'<span class="dims">'+h+'</span>':'';
}
function facet(dim,lab,L,n){
  var c=conta(L,dim),ab=E.mais[dim],lim=ab?c.length:n,h='<div class="lab">'+lab+'</div><div class="glist">';
  h+='<button data-f="'+dim+'" data-v="" aria-pressed="'+(!E.F[dim])+'"><span>Todos</span><small>'+n0(L.length)+'</small></button>';
  c.slice(0,lim).forEach(function(z){var t=dim==='c'&&E.clsNome[z[0]]?' title="'+esc(E.clsNome[z[0]])+'"':'';h+='<button data-f="'+dim+'" data-v="'+esc(z[0])+'" aria-pressed="'+(E.F[dim]===z[0])+'"'+t+'>'+(dim==='res'?'<i style="background:'+corRes(z[0])+'"></i>':'')+'<span>'+esc(z[0])+'</span><small>'+n0(z[1])+'</small></button>';});
  if(E.F[dim]&&!c.some(function(z){return z[0]===E.F[dim];}))h+='<button data-f="'+dim+'" data-v="'+esc(E.F[dim])+'" aria-pressed="true"><span>'+esc(E.F[dim])+'</span><small>0</small></button>';
  h+='</div>';
  if(c.length>n)h+='<button class="e-gmore" data-mais="'+dim+'">'+(ab?'Mostrar menos':'Mostrar todos ('+c.length+')')+'</button>';
  return h;
}
function renderAside(){
  var a='<div class="lab">Tipo</div><div class="seg" id="e-tipo">'+[['','Todos'],['Acórdão','Acórdãos'],['Monocrática','Monocráticas']].map(function(z){return '<button data-v="'+z[0]+'" aria-pressed="'+((E.F.t||'')===z[0])+'">'+z[1]+'</button>';}).join('')+'</div>';
  var anos=conta(E.idx,'y').map(function(z){return z[0];}).filter(function(y){return /^\d{4}-\d{2}$/.test(y);}).sort();
  var opt=function(v){return '<option value="">—</option>'+anos.map(function(y){return '<option value="'+y+'"'+(y===v?' selected':'')+'>'+mesL(y)+'</option>';}).join('');};
  a+='<div class="lab">Período</div><div class="e-yr"><select id="e-y1" aria-label="Ano inicial">'+opt(E.y1)+'</select> a <select id="e-y2" aria-label="Ano final">'+opt(E.y2)+'</select></div>';
  var base=function(d){return E.idx.filter(function(x){return passa(x,d);});};
  a+=facet('apr','Apreciação',base('apr'),6)+facet('ramo','Ramo',base('ramo'),8)+facet('res','Resultado',base('res'),8)+facet('o','Órgão julgador',base('o'),6)+facet('c','Classe',base('c'),8);
  a+='<div class="note">Julgamentos do Relator na base do gabinete (procs-muta · precedentes), com ramo, assunto e resultado catalogados. Inteiro teor disponível para '+n0(E.idx.filter(function(x){return x.it;}).length)+' julgamentos.</div>';
  var as=$('#e-aside'),st=as.scrollTop;as.innerHTML=a;as.scrollTop=st;
  $$('#e-tipo button').forEach(function(b){b.onclick=function(){setF('t',b.getAttribute('data-v'));};});
  $$('#e-aside [data-f]').forEach(function(b){b.onclick=function(){var d=b.getAttribute('data-f'),v=b.getAttribute('data-v');setF(d,E.F[d]===v?'':v);};});
  $$('#e-aside [data-mais]').forEach(function(b){b.onclick=function(){var d=b.getAttribute('data-mais');E.mais[d]=!E.mais[d];renderAside();};});
  $('#e-y1').onchange=function(e){E.y1=e.target.value;E.shown=60;render();};
  $('#e-y2').onchange=function(e){E.y2=e.target.value;E.shown=60;render();};
}
function setF(d,v){if(d==='y'){E.y1=E.y2=v;}else E.F[d]=v;E.shown=60;E.sel=null;E.mmOpen=null;render();}
function chips(){
  var h=[];
  DIMS.forEach(function(d){if(E.F[d])h.push('<span class="e-chip"><small>'+DIM[d].n+'</small> '+esc(E.F[d])+'<button data-x="'+d+'" aria-label="Remover filtro">×</button></span>');});
  if(E.y1||E.y2)h.push('<span class="e-chip"><small>Período</small> '+(E.y1===E.y2?mesL(E.y1):mesL(E.y1||'')+' a '+mesL(E.y2||''))+'<button data-x="__y" aria-label="Remover filtro">×</button></span>');
  if(E.q)h.push('<span class="e-chip"><small>Busca</small> '+esc(E.q)+'<button data-x="__q" aria-label="Remover busca">×</button></span>');
  if(h.length>1)h.push('<button class="e-clr" id="e-clr">Limpar todos</button>');
  $('#e-chips').innerHTML=h.join('');
  $$('#e-chips [data-x]').forEach(function(b){b.onclick=function(){var d=b.getAttribute('data-x');if(d==='__y'){E.y1=E.y2='';}else if(d==='__q'){E.q='';E.qn=null;$('#e-q').value='';}else E.F[d]='';E.sel=null;E.mmOpen=null;E.shown=60;render();};});
  var c=$('#e-clr');if(c)c.onclick=function(){E.F={};E.y1=E.y2='';E.q='';E.qn=null;$('#e-q').value='';E.sel=null;E.mmOpen=null;render();};
}
/* seleção feita nas visualizações: aplicar como filtro ou ver a lista */
function selecionar(f,n){
  var ok=Object.keys(f).every(function(k){return f[k]!=='__outros';});
  E.sel={f:f,n:n,ok:ok};selBar();
  $$('.e-viz .on').forEach(function(e){e.classList.remove('on');});
}
function selBar(){
  var s=E.sel,el=$('#e-sel');
  if(!s||E.modo==='lista'){el.innerHTML='';return;}
  var d=Object.keys(s.f).map(function(k){return '<b>'+DIM[k].n+':</b> '+esc(k==='y'?mesL(s.f[k]):rot(s.f[k],'vários'));}).join(' › ');
  el.innerHTML='<div class="e-selb"><span>'+d+' · '+n0(s.n)+' precedentes</span><span class="sp"></span>'+(s.ok?'<button class="btn gold" id="e-sap">Filtrar</button><button class="btn" id="e-svl">Ver na lista</button>':'<span class="meta">“Outros” reúne vários valores: escolha um grupo nomeado.</span>')+'<button class="btn" id="e-sx">×</button></div>';
  if(s.ok){$('#e-sap').onclick=function(){aplicaSel(false);};$('#e-svl').onclick=function(){aplicaSel(true);};}
  $('#e-sx').onclick=function(){E.sel=null;selBar();$$('.e-viz .on').forEach(function(e){e.classList.remove('on');});};
}
function aplicaSel(lista){var f=E.sel.f;Object.keys(f).forEach(function(k){if(k==='y'){E.y1=E.y2=f[k];}else E.F[k]=f[k];});E.sel=null;E.mmOpen=null;E.shown=60;if(lista)E.modo='lista';salvar();render();window.scrollTo(0,0);}

/* ---- Lista (linhas compactas, como a pesquisa de jurisprudência) e painel lateral ---- */
var ICO={chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',cit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6"/></svg>',doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>'};
var APRS={'Julgamento do recurso':'','Embargos de declaração':'ED','Agravo interno':'AgInt','Juízo de retratação':'Retratação'};
function linha(x){
  var op=!!E.open[x.id],sel=E.det===x.id,tit=x._ass||titulo(x)||'(sem assunto)';
  var h='<li class="e-proc'+(sel?' sel':'')+(op?' open':'')+'" data-id="'+x.id+'"><div class="e-crow" data-act="abrir">';
  h+='<div class="e-c0"><button class="e-chev" data-act="tg" aria-expanded="'+op+'" aria-label="'+(op?'Recolher':'Expandir')+'">'+ICO.chev+'</button><span class="e-tag '+x.t+'" title="'+(x.t==='A'?'Acórdão':'Decisão monocrática')+'">'+x.t+'</span></div>';
  h+='<div class="e-c1"><span class="e-num">'+esc(x.n)+'</span><span class="e-sub" title="'+esc(x.cl||'')+'">'+esc(x.c||'')+' · '+esc(x.cl||'')+'</span></div>';
  h+='<div class="e-c2"><span class="e-ass" title="'+esc(tit)+'">'+esc(tit)+'</span><div class="e-ctags">'+(APRS[x._apr]?'<span class="e-ct apr" title="'+esc(x._apr)+'">'+esc(APRS[x._apr])+'</span>':'')+'<span class="e-ct org" title="'+esc(x.o||'Órgão não informado')+'">'+esc(siglaO(x.o))+'</span>'+(x._ramo?'<span class="e-ct ramo">'+esc(x._ramo)+'</span>':'')+'<span class="e-ct res" style="--rc:'+corRes(x._res)+'" title="'+esc(x.r||x._res)+'">'+esc(x._res)+'</span>'+(x.it?'<span class="e-ct dash" title="Inteiro teor na base">inteiro teor</span>':'')+'</div></div>';
  h+='<div class="e-c3"><span class="e-dt" title="Julgado em">'+fmtD(x.d)+'</span><button class="e-ib" data-act="cit" title="Copiar citação" aria-label="Copiar citação">'+ICO.cit+'</button><button class="e-ib" data-act="abrir" title="Abrir" aria-label="Abrir">'+ICO.doc+'</button></div></div>';
  if(op){
    h+='<div class="e-cbody"><div class="e-pnl"><div class="e-lb">Ementa</div><div class="e-tx">'+esc(prev(x).length>900?prev(x).slice(0,900)+'…':prev(x))+'</div>'+(x.r?'<div class="e-note"><b>Resultado:</b> '+esc(x.r)+'</div>':'')+'</div>';
    h+='<div class="e-pnl"><div class="e-lb">Dados</div>'+[['Apreciação',x._apr],['Classe',x.cl],['Órgão',x.o||'não informado'],['Julgamento',fmtD(x.d)],['Publicação',x.p?fmtD(x.p):'—'],['Ramo',x._rd||x._ramo],['Assunto',x._ass],['Temas',x.temas]].filter(function(z){return z[1];}).map(function(z){return '<div class="e-pr"><span class="e-pl">'+z[0]+'</span><span class="e-pv">'+esc(z[1])+'</span></div>';}).join('')+'</div>';
    h+='<div class="e-cfoot"><button class="e-mini" data-act="cit">'+ICO.cit+'Copiar citação</button><button class="e-mini pri" data-act="abrir">'+ICO.doc+(x.it?'Abrir inteiro teor':'Abrir ementa')+'</button></div></div>';
  }
  return h+'</li>';
}
function largo(){return window.matchMedia('(min-width:1180px)').matches;}
function vLista(L,out){
  if(E.det&&!L.some(function(x){return x.id===E.det;}))E.det=null;
  var sp=E.det&&largo();
  var h='<div class="e-split'+(sp?' on':'')+'"><div class="e-lcol"><ul class="e-res">'+L.slice(0,E.shown).map(linha).join('')+'</ul>';
  if(L.length>E.shown)h+='<div class="e-more"><button class="btn" id="e-mais">Mostrar mais ('+n0(L.length-E.shown)+' restantes)</button></div>';
  h+='</div><section class="e-det" id="e-det"'+(sp?'':' hidden')+'></section></div>';
  out.innerHTML=h;
  var b=$('#e-mais');if(b)b.onclick=function(){E.shown+=100;vLista(L,out);};
  if(sp)abrirIT(porId(E.det));
}
var POR_ID=null;
function porId(id){if(!POR_ID){POR_ID={};E.idx.forEach(function(x){POR_ID[x.id]=x;});}return POR_ID[id];}
function citacao(x){
  return (x.c||'')+' '+x.n+', Rel. Des. Fed. CARLOS MUTA, [VALIDAR: veículo] '+fmtD(x.p||x.d)+': "'+String(x.e||'').replace(/\s*\n\s*/g,' ').trim()+'"';
}
function painel(html,ondeSplit){
  var d=$('#e-det');
  if(ondeSplit&&d&&largo()){d.hidden=false;d.parentNode.classList.add('on');d.innerHTML=html;d.scrollTop=0;return d;}
  var dr=$('#e-dr'),b=$('#e-drb');dr.hidden=false;b.innerHTML=html;b.scrollTop=0;return b;
}
function abrirIT(x){
  if(!x)return;E.det=x.id;
  $$('#e-out li.e-proc.sel').forEach(function(l){l.classList.remove('sel');});var li=$('#e-out li.e-proc[data-id="'+x.id+'"]');if(li)li.classList.add('sel');
  var it=BASE&&BASE.it&&BASE.it[x.id];
  var h='<div class="e-dhead"><div class="e-dtit"><span class="e-tag '+x.t+'">'+(x.t==='A'?'Acórdão':'Decisão monocrática')+'</span><span class="e-num big">'+esc(x.n)+'</span><span class="e-tag">'+esc(x.c||'')+'</span>'+(APRS[x._apr]?'<span class="e-tag apr">'+esc(x._apr)+'</span>':'')+'<button class="e-dx" data-dx title="Fechar (Esc)" aria-label="Fechar">×</button></div>';
  h+='<div class="e-dmeta">'+[['Classe',x.cl||'—'],['Órgão julgador',x.o||'não informado'],['Julgamento',fmtD(x.d)],['Publicação',x.p?fmtD(x.p):'—'],['Relator','CARLOS MUTA'],['Apreciação',x._apr],['Ramo',x._rd||x._ramo||'—'],['Assunto',x._ass||'—'],['Resultado',x._res]].map(function(z){return '<div><span>'+z[0]+'</span>'+esc(z[1])+'</div>';}).join('')+'</div>';
  h+='<div class="e-dacts"><button class="e-mini pri" data-dcit>'+ICO.cit+'Copiar citação</button><button class="e-mini" data-dem>Copiar ementa</button>'+(it?'<button class="e-mini" data-dit>Copiar inteiro teor</button>':'')+'</div></div>';
  h+='<div class="e-dbody">';
  if(!it)h+='<div class="e-aviso">A base do gabinete tem a ementa e o resultado deste julgamento; o inteiro teor ainda não foi juntado.</div>';
  if(x.temas)h+='<h3 class="e-sec">Temas</h3><div class="e-chipl">'+x.temas.split(/;\s*/).filter(Boolean).map(function(t){return '<span>'+esc(t)+'</span>';}).join('')+'</div>';
  if(x.tese)h+='<h3 class="e-sec">Tese catalogada</h3><div class="e-box">'+esc(x.tese)+'</div>';
  h+='<h3 class="e-sec">Ementa</h3><div class="e-box serif">'+esc(x.e)+'</div>';
  if(x.r)h+='<h3 class="e-sec">Resultado</h3><div class="e-box ok">'+esc(x.r)+'</div>';
  if(x.disp)h+='<h3 class="e-sec">Dispositivos citados</h3><div class="e-box">'+esc(x.disp)+'</div>';
  if(x.jur)h+='<h3 class="e-sec">Jurisprudência citada</h3><div class="e-box">'+esc(x.jur)+'</div>';
  if(it)h+='<h3 class="e-sec">Inteiro teor <small>'+n0(it.length)+' caracteres</small></h3><div class="e-texto">'+esc(it)+'</div>';
  h+='<h3 class="e-sec">Origem</h3><p class="meta">Base do gabinete · procs-muta, precedentes/precedentes.jsonl · registro '+esc(x.id)+'. A citação traz [VALIDAR: veículo], porque a base não registra o veículo de publicação.</p></div>';
  var box=painel(h,true);
  box.querySelector('[data-dx]').onclick=function(){fecharIT();};
  box.querySelector('[data-dcit]').onclick=function(){copiar(citacao(x),'Citação copiada; confira o veículo de publicação');};
  box.querySelector('[data-dem]').onclick=function(){copiar(x.e,'Ementa copiada');};
  var bi=box.querySelector('[data-dit]');if(bi)bi.onclick=function(){copiar(it,'Inteiro teor copiado');};
}
function fecharIT(){$('#e-dr').hidden=true;var d=$('#e-det');if(d&&!d.hidden){d.hidden=true;d.innerHTML='';d.parentNode.classList.remove('on');}E.det=null;$$('#e-out li.e-proc.sel').forEach(function(l){l.classList.remove('sel');});}
$('#e-dr').addEventListener('click',function(e){if(e.target.id==='e-dr')fecharIT();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&(!$('#e-dr').hidden||($('#e-det')&&!$('#e-det').hidden)))fecharIT();});
$('#e-out').addEventListener('click',function(e){
  var b=e.target.closest('[data-act]');if(!b)return;var c=b.closest('[data-id]');if(!c)return;var x=porId(c.getAttribute('data-id'));if(!x)return;
  var a=b.getAttribute('data-act');
  e.stopPropagation();
  if(a==='tg'){if(E.open[x.id])delete E.open[x.id];else E.open[x.id]=1;c.outerHTML=linha(x);}
  else if(a==='cit')copiar(citacao(x),'Citação copiada; confira o veículo de publicação');
  else if(a==='abrir'){if(E.det===x.id&&largo()&&!$('#e-det').hidden){fecharIT();return;}abrirIT(x);}
});
var qT;$('#e-q').addEventListener('input',function(e){clearTimeout(qT);qT=setTimeout(function(){if(EM.sub!=='prec'){EM.q[EM.sub]=e.target.value.trim();(EM.sub==='mod'?mRender:pRender)();return;}E.q=e.target.value.trim();E.qn=E.q?nz(E.q).split(/\s+/).filter(Boolean):null;E.shown=60;E.sel=null;E.mmOpen=null;render();},220);});
function baixarCsv(L){
  var C=[['Tipo','Apreciação','Processo','Classe','Classe (nome)','Órgão','Julgamento','Publicação','Ramo','Assunto','Resultado','Temas','Texto do resultado','Registro']];
  L.forEach(function(x){C.push([x.t==='A'?'Acórdão':'Monocrática',x._apr,x.n,x.c,x.cl,x.o,fmtD(x.d),fmtD(x.p),x._ramo,x._ass,x._res,x.temas,x.r,x.id]);});
  var csv='﻿'+C.map(function(r){return r.map(function(v){v=String(v==null?'':v);return /[";\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(';');}).join('\r\n');
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='ementario-filtrado.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
}
/* ---- SVG helpers ---- */
function trunc(s,n){s=String(s);return s.length>n?s.slice(0,n-1)+'…':s;}
function svgEl(w,h,inner){return '<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="Visualização dos precedentes filtrados">'+inner+'</svg>';}

/* ---- Mapa mental: árvore horizontal recolhível ---- */
function vMapa(L,out){
  var D=E.dm.mapa,lim=[8,6,5];
  function grupo(lst,nivel,path){
    return top(lst,D[nivel],lim[nivel]).map(function(z){
      var key=path.concat([z[0]]).join('\u0001'),sub=z[0]==='__outros'?[]:lst.filter(function(x){return DIM[D[nivel]].v(x)===z[0];});
      return {k:z[0],n:z[1],x:z[2],key:key,niv:nivel,path:path.concat([z[0]]),lst:sub};
    });
  }
  if(!E.mmOpen){E.mmOpen={};var g=grupo(L,0,[]);if(g[0]&&g[0].k!=='__outros'){E.mmOpen[g[0].key]=1;var g2=grupo(g[0].lst,1,g[0].path);if(g2[0]&&g2[0].k!=='__outros')E.mmOpen[g2[0].key]=1;}}
  var rows=[],RH=26,COL=250,X0=150;
  function lay(lst,nivel,path){
    var ns=grupo(lst,nivel,path),ys=[];
    ns.forEach(function(nd){
      if(nivel<2&&E.mmOpen[nd.key]&&nd.lst.length){nd.ch=lay(nd.lst,nivel+1,nd.path);nd.y=(nd.ch[0].y+nd.ch[nd.ch.length-1].y)/2;}
      else{nd.y=rows.length*RH+36;rows.push(nd);}
      ys.push(nd);
    });
    return ys;
  }
  var raiz=lay(L,0,[]);
  var H=Math.max(rows.length*RH+44,120),W=X0+COL*3+60,ry=(raiz[0].y+raiz[raiz.length-1].y)/2;
  var mx=L.length,s='';
  function r(n){return 3+Math.sqrt(n/mx)*11;}
  function desenha(ns,px,py){
    ns.forEach(function(nd){
      var x=X0+nd.niv*COL+40;
      s+='<path class="lk" d="M'+px+','+py+' C'+(px+(x-px)/2)+','+py+' '+(px+(x-px)/2)+','+nd.y+' '+x+','+nd.y+'"/>';
      if(nd.ch)desenha(nd.ch,x,nd.y);
    });
    ns.forEach(function(nd){
      var x=X0+nd.niv*COL+40,cor=D[nd.niv]==='res'?corRes(nd.k):PAL[nd.niv];
      var abre=nd.niv<2&&nd.k!=='__outros'&&nd.lst.length;
      s+='<g class="nd" data-key="'+esc(nd.key)+'" tabindex="0"><circle cx="'+x+'" cy="'+nd.y+'" r="'+r(nd.n).toFixed(1)+'" fill="'+cor+'" fill-opacity="'+(nd.ch?1:.8)+'"/>'+(abre?'<text x="'+(x-3.5)+'" y="'+(nd.y+3.5)+'" style="font-size:10px;font-weight:800;fill:var(--gold-ink)">'+(nd.ch?'–':'+')+'</text>':'')+'<text x="'+(x+r(nd.n)+6)+'" y="'+(nd.y+4)+'"><title>'+esc(rot(nd.k,nd.x)+' · '+nd.n)+'</title>'+esc(trunc(rot(nd.k,nd.x),30))+' <tspan class="mutt">'+n0(nd.n)+'</tspan></text></g>';
    });
  }
  desenha(raiz,X0,ry);
  s='<g><rect x="6" y="'+(ry-20)+'" width="'+(X0-12)+'" height="40" rx="10" fill="var(--gold-soft)" stroke="var(--gold)"/><text x="'+(X0/2)+'" y="'+(ry-3)+'" text-anchor="middle" style="font-weight:800;fill:var(--gold)">'+n0(L.length)+'</text><text x="'+(X0/2)+'" y="'+(ry+12)+'" text-anchor="middle" class="mutt">precedentes</text></g>'+s;
  var head=D.map(function(d,i){return '<text x="'+(X0+i*COL+40)+'" y="12" class="mutt" style="font-weight:800;letter-spacing:.08em">'+DIM[d].n.toUpperCase()+'</text>';}).join('');
  out.innerHTML='<p class="e-help">Clique em um ramo para abrir ou fechar os galhos; o galho selecionado pode virar filtro. Ao lado, os assuntos do recorte.</p><div class="e-mm"><div class="e-viz">'+svgEl(W,H+10,head+s)+'</div><aside class="e-asl">'+painelAssuntos(L)+'</aside></div>';
  $$('.e-asl [data-av]',out).forEach(function(b){b.addEventListener('click',function(){selecionar({ass:b.getAttribute('data-av')},+b.getAttribute('data-n'));$$('.e-asl .on',out).forEach(function(x){x.classList.remove('on');});b.classList.add('on');});});
  var idx={};(function reg(ns){ns.forEach(function(nd){idx[nd.key]=nd;if(nd.ch)reg(nd.ch);});})(raiz);
  $$('.e-viz .nd',out).forEach(function(g){
    function act(){var nd=idx[g.getAttribute('data-key')];if(!nd)return;
      if(nd.niv<2&&nd.k!=='__outros'&&nd.lst.length){if(E.mmOpen[nd.key])delete E.mmOpen[nd.key];else E.mmOpen[nd.key]=1;}
      var f={};nd.path.forEach(function(v,i){f[D[i]]=v;});
      vMapa(L,out);selecionar(f,nd.n);var ng=out.querySelector('[data-key="'+CSS.escape(nd.key)+'"]');if(ng)ng.classList.add('on');}
    g.addEventListener('click',act);g.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();act();}});
  });
}
/* ---- Painel lateral de assuntos (dentro do mapa mental) ---- */
function painelAssuntos(L){
  var t=conta(L,'ass').filter(function(z){return z[0]!=='Sem assunto catalogado';}),mx=t.length?t[0][1]:1;
  if(!t.length)return '<div class="lab">Assuntos</div><p class="meta">Sem assunto catalogado no recorte.</p>';
  return '<div class="lab">Assuntos do recorte <small>'+t.length+'</small></div><div class="e-asl-l">'+t.slice(0,40).map(function(z){var sub=L.filter(function(x){return x._ass===z[0];}),c=conta(sub,'res');
    return '<button data-av="'+esc(z[0])+'" data-n="'+z[1]+'" title="'+esc(z[0])+'"><span class="l">'+esc(z[0])+'</span><small>'+n0(z[1])+'</small><span class="b" style="width:'+Math.max(8,z[1]/mx*100).toFixed(1)+'%">'+c.map(function(q){return '<i style="width:'+(q[1]/z[1]*100).toFixed(2)+'%;background:'+corRes(q[0])+'" title="'+esc(q[0]+': '+q[1])+'"></i>';}).join('')+'</span></button>';}).join('')+'</div>'+(t.length>40?'<p class="meta">+ '+(t.length-40)+' assuntos; use a busca ou os filtros.</p>':'');
}
/* ---- Fluxograma: Sankey em três colunas ---- */
function vFluxo(L,out){
  var D=E.dm.fluxo,N=[8,8,8],W=980,H=Math.max(380,Math.min(720,160+L.length/40)),PAD=10,NW=14,cols=[];
  D.forEach(function(d,i){var t=top(L,d,N[i]),keys={};t.forEach(function(z){keys[z[0]]=1;});cols.push({d:d,ns:t,keys:keys});});
  function chave(i,x){var v=DIM[D[i]].v(x);return cols[i].keys[v]?v:'__outros';}
  var tot=L.length,colX=[20,W/2-NW/2,W-NW-200];
  cols.forEach(function(c,i){var gap=PAD*(c.ns.length-1),sc=(H-40-gap)/tot,y=24;c.sc=sc;c.pos={};c.ns.forEach(function(z){c.pos[z[0]]={y:y,h:Math.max(1.5,z[1]*sc),n:z[1],x:z[2],o0:0,o1:0};y+=z[1]*sc+PAD;});});
  var s='',fl=[[],[]];
  for(var i=0;i<2;i++){var m={};L.forEach(function(x){var k=chave(i,x)+'\u0001'+chave(i+1,x);m[k]=(m[k]||0)+1;});
    var a=cols[i],b=cols[i+1];
    Object.keys(m).map(function(k){var p=k.split('\u0001');return {a:p[0],b:p[1],n:m[k]};}).sort(function(u,v){return a.pos[u.a].y-a.pos[v.a].y||b.pos[u.b].y-b.pos[v.b].y;}).forEach(function(f){
      var pa=a.pos[f.a],pb=b.pos[f.b],h=f.n*a.sc,y0=pa.y+pa.o1,y1=pb.y+pb.o0;pa.o1+=h;pb.o0+=h;
      var x0=colX[i]+NW,x1=colX[i+1],xm=(x0+x1)/2,cor=D[i+1]==='res'?corRes(f.b):(D[i]==='res'?corRes(f.a):PAL[(a.ns.findIndex(function(z){return z[0]===f.a;}))%PAL.length]);
      fl[i].push(f);
      s+='<path class="band" data-i="'+i+'" data-a="'+esc(f.a)+'" data-b="'+esc(f.b)+'" data-n="'+f.n+'" fill="'+cor+'" d="M'+x0+','+y0+' C'+xm+','+y0+' '+xm+','+y1+' '+x1+','+y1+' L'+x1+','+(y1+h)+' C'+xm+','+(y1+h)+' '+xm+','+(y0+h)+' '+x0+','+(y0+h)+' Z"><title>'+esc(rot(f.a,'vários')+' → '+rot(f.b,'vários')+': '+n0(f.n))+'</title></path>';
    });}
  cols.forEach(function(c,i){c.ns.forEach(function(z,j){var p=c.pos[z[0]],cor=c.d==='res'?corRes(z[0]):PAL[j%PAL.length];
    var tx=i===2?colX[i]+NW+6:colX[i]+NW+6,anc='start';
    s+='<g class="nd" data-c="'+i+'" data-v="'+esc(z[0])+'" data-n="'+z[1]+'"><rect x="'+colX[i]+'" y="'+p.y+'" width="'+NW+'" height="'+p.h+'" rx="2" fill="'+cor+'"/><text x="'+tx+'" y="'+(p.y+p.h/2+4)+'" text-anchor="'+anc+'" style="paint-order:stroke;stroke:var(--card);stroke-width:3px"><title>'+esc(rot(z[0],z[2])+' · '+z[1])+'</title>'+esc(trunc(rot(z[0],z[2]),i===2?28:24))+' <tspan class="mutt">'+n0(z[1])+'</tspan></text></g>';});});
  var head=cols.map(function(c,i){return '<text x="'+colX[i]+'" y="12" class="mutt" style="font-weight:800;letter-spacing:.08em">'+DIM[c.d].n.toUpperCase()+'</text>';}).join('');
  out.innerHTML='<p class="e-help">Cada faixa liga um grupo da coluna anterior ao da seguinte, na proporção dos precedentes. Clique em uma faixa ou em um bloco para selecionar.</p><div class="e-viz">'+svgEl(W,H,head+s)+'</div>';
  $$('.band',out).forEach(function(p){p.addEventListener('click',function(){var i=+p.getAttribute('data-i'),f={};f[D[i]]=p.getAttribute('data-a');f[D[i+1]]=p.getAttribute('data-b');selecionar(f,+p.getAttribute('data-n'));p.classList.add('on');});});
  $$('.nd',out).forEach(function(g){g.addEventListener('click',function(){var f={};f[D[+g.getAttribute('data-c')]]=g.getAttribute('data-v');selecionar(f,+g.getAttribute('data-n'));g.classList.add('on');});});
}
/* ---- Linha do tempo: barras empilhadas por ano ---- */
function vTempo(L,out){
  var d=E.dm.tempo,t=top(L,d,7),keys=t.map(function(z){return z[0];}),kset={};keys.forEach(function(k){kset[k]=1;});
  var anos={};L.forEach(function(x){var y=x.y;if(!/^\d{4}-\d{2}$/.test(y))return;var v=DIM[d].v(x);if(!kset[v])v='__outros';anos[y]=anos[y]||{_t:0};anos[y][v]=(anos[y][v]||0)+1;anos[y]._t++;});
  var ys=Object.keys(anos).sort();if(!ys.length){out.innerHTML='<p class="empty">Sem datas para o recorte.</p>';return;}
  var lista=[],c0=ys[0].split('-').map(Number),c1=ys[ys.length-1].split('-').map(Number);for(var yy=c0[0],mm=c0[1];yy<c1[0]||(yy===c1[0]&&mm<=c1[1]);mm++){if(mm>12){mm=1;yy++;if(yy>c1[0]||(yy===c1[0]&&mm>c1[1]))break;}lista.push(yy+'-'+String(mm).padStart(2,'0'));if(lista.length>240)break;}
  var n=lista.length,mx=0;ys.forEach(function(y){mx=Math.max(mx,anos[y]._t);});
  var W=Math.max(640,Math.min(1100,n*40+80)),H=320,PL=46,PB=28,bw=(W-PL-10)/n,s='';
  function cor(k,i){return d==='res'?corRes(k):(k==='__outros'?PAL[9]:PAL[i%PAL.length]);}
  for(var g=0;g<=4;g++){var v=Math.round(mx*g/4),y=H-PB-(H-PB-14)*g/4;s+='<line x1="'+PL+'" x2="'+(W-6)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(PL-6)+'" y="'+(y+4)+'" text-anchor="end" class="mutt">'+n0(v)+'</text>';}
  lista.forEach(function(Y,ix){var o=anos[Y],x=PL+ix*bw+bw*.12,w=bw*.76,yb=H-PB;
    if(o)keys.forEach(function(k,i){var c=o[k];if(!c)return;var h=c/mx*(H-PB-14);yb-=h;s+='<rect class="bx" data-y="'+Y+'" data-v="'+esc(k)+'" data-n="'+c+'" x="'+x.toFixed(1)+'" y="'+yb.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(.5,h).toFixed(1)+'" fill="'+cor(k,i)+'"><title>'+mesL(Y)+' · '+esc(rot(k,t[i][2]))+': '+n0(c)+'</title></rect>';});
    if(n<=24||ix%2===0)s+='<text x="'+(x+w/2)+'" y="'+(H-PB+16)+'" text-anchor="middle" class="mutt">'+mesL(Y)+'</text>';});
  var leg='<div class="e-leg">'+t.map(function(z,i){return '<span><i style="background:'+cor(z[0],i)+'"></i>'+esc(rot(z[0],z[2]))+' · '+n0(z[1])+'</span>';}).join('')+'</div>';
  out.innerHTML='<p class="e-help">Julgamentos por mês. Clique em um segmento para selecionar o mês e o grupo.</p><div class="e-viz">'+svgEl(W,H,s)+leg+'</div>';
  $$('.bx',out).forEach(function(r){r.addEventListener('click',function(){var f={y:r.getAttribute('data-y')};f[d]=r.getAttribute('data-v');selecionar(f,+r.getAttribute('data-n'));r.classList.add('on');});});
}
/* ---- Matriz ---- */
function vMatriz(L,out){
  var R=E.dm.matriz[0],C=E.dm.matriz[1];
  if(R===C){out.innerHTML='<p class="empty">Escolha dimensões diferentes para linhas e colunas.</p>';return;}
  var tr=top(L,R,15),tc=top(L,C,9),rk={},ck={};tr.forEach(function(z){rk[z[0]]=1;});tc.forEach(function(z){ck[z[0]]=1;});
  var m={},mx=0;L.forEach(function(x){var a=DIM[R].v(x),b=DIM[C].v(x);if(!rk[a])a='__outros';if(!ck[b])b='__outros';var k=a+'\u0001'+b;m[k]=(m[k]||0)+1;if(m[k]>mx)mx=m[k];});
  var h='<table class="e-mx"><thead><tr><th>'+esc(DIM[R].n)+' \\ '+esc(DIM[C].n)+'</th>'+tc.map(function(z){return '<th title="'+esc(rot(z[0],z[2]))+'">'+esc(trunc(rot(z[0],z[2]),22))+'</th>';}).join('')+'<th>Total</th></tr></thead><tbody>';
  tr.forEach(function(r){h+='<tr><th title="'+esc(rot(r[0],r[2]))+'">'+esc(trunc(rot(r[0],r[2]),40))+'</th>';tc.forEach(function(c){var v=m[r[0]+'\u0001'+c[0]]||0,al=v?(.12+.78*Math.sqrt(v/mx)):0;h+=v?'<td data-a="'+esc(r[0])+'" data-b="'+esc(c[0])+'" data-n="'+v+'" style="background:rgba(212,171,88,'+al.toFixed(2)+')'+(al>.6?';color:#1d1f22;font-weight:700':'')+'">'+n0(v)+'</td>':'<td class="z">·</td>';});h+='<td class="z"><b>'+n0(r[1])+'</b></td></tr>';});
  h+='</tbody></table>';
  out.innerHTML='<p class="e-help">Cruzamento de duas dimensões; a intensidade da cor acompanha a quantidade. Clique em uma célula para selecionar.</p><div class="e-viz">'+h+'</div>';
  $$('td[data-a]',out).forEach(function(td){td.addEventListener('click',function(){var f={};f[R]=td.getAttribute('data-a');f[C]=td.getAttribute('data-b');selecionar(f,+td.getAttribute('data-n'));td.classList.add('on');});});
}
/* ---- Assuntos: ranking com distribuição de resultados ---- */
function vAssuntos(L,out){
  var t=conta(L,'ass').filter(function(z){return z[0]!=='Sem assunto catalogado';}).slice(0,40),mx=t.length?t[0][1]:1;
  if(!t.length){out.innerHTML='<p class="empty">O recorte não tem assunto catalogado.</p>';return;}
  var rs=conta(L,'res').map(function(z){return z[0];});
  var h='<div class="e-ass">'+t.map(function(z){var sub=L.filter(function(x){return x._ass===z[0];}),c=conta(sub,'res');
    return '<button data-v="'+esc(z[0])+'" data-n="'+z[1]+'" title="'+esc(z[0])+'"><span class="l">'+esc(z[0])+'</span><span class="b" style="width:'+Math.max(6,z[1]/mx*100).toFixed(1)+'%">'+c.map(function(q){return '<i style="width:'+(q[1]/z[1]*100).toFixed(2)+'%;background:'+corRes(q[0])+'" title="'+esc(q[0]+': '+q[1])+'"></i>';}).join('')+'</span><small>'+n0(z[1])+'</small></button>';}).join('')+'</div>';
  var leg='<div class="e-leg">'+rs.slice(0,10).map(function(r){return '<span><i style="background:'+corRes(r)+'"></i>'+esc(r)+'</span>';}).join('')+'</div>';
  out.innerHTML='<p class="e-help">Assuntos mais frequentes do recorte, com a distribuição dos resultados. Clique para selecionar.</p><div class="e-viz">'+h+leg+'</div>';
  $$('.e-ass button',out).forEach(function(b){b.addEventListener('click',function(){selecionar({ass:b.getAttribute('data-v')},+b.getAttribute('data-n'));b.classList.add('on');});});
}

/* ================= EDITORIAL ================= */
var ED=null;
try{ED=JSON.parse($('#editorial').textContent);}catch(e){ED=null;}
var XS={sub:'estrutura',peca:'',grupo:'',vg:'palavras',q:''};
function man(){var db=window.VDM_DB&&window.VDM_DB();return ((db&&db['Diretrizes'])||[]).filter(function(r){return r['Código'];});}
function manCap(c){return man().filter(function(r){return String(r['Capítulo']||'').indexOf(c)===0;});}
function manTxt(r){return [r['Título'],r['Orientação'],r['Evitar'],r['Observação'],r['Grupo']].join(' ');}
function manCard(r){var st=r['Status']&&!/^vigente$/i.test(r['Status']);return '<article class="card" style="--gc:var(--line)"><div class="hd"><span class="pill">'+esc(r['Grupo']||'')+'</span>'+(st?'<span class="pill" style="color:var(--warn);border-color:var(--warn)">'+esc(r['Status'])+'</span>':'')+'</div>'+(r['Título']?'<h3>'+esc(r['Título'])+'</h3>':'')+'<div class="fields">'+(r['Orientação']?'<div class="field good"><b>Preferir</b><p>'+esc(r['Orientação'])+'</p></div>':'')+(r['Evitar']?'<div class="field bad"><b>Evitar</b><p>'+esc(r['Evitar'])+'</p></div>':'')+(r['Observação']?'<div class="field"><b>Observação</b><p>'+esc(r['Observação'])+'</p></div>':'')+'</div></article>';}
var MANG={relatorio:'Relatório',voto:'Voto',ementa:'Ementa',monocratica:'Decisões e despachos'};
var FO={};
function foTag(){return '';}
function hit(txt){return !XS.q||nz(txt).indexOf(nz(XS.q))>=0;}
function regs(t){return ((ED&&ED.padrao&&ED.padrao.registros)||[]).filter(function(r){return r.tipo===t||(t==='preferencia'&&!r.tipo&&r.preferir);});}
function grp(r){return r.grupo||'Termos e grafias';}
function xRender(){
  if(!ED){$('#x-out').innerHTML='<p class="empty">Dados do editorial indisponíveis.</p>';return;}
  $$('#x-sub button').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-s')===XS.sub));});
  if(XS.sub==='forma'){XS.sub='vocab';}
  (({estrutura:xEstrutura,estilo:xEstilo,vocab:xVocab})[XS.sub]||xEstrutura)();
}
function xAsideList(items,cur,attr,allLab,total){
  return '<div class="glist" id="x-gl"><button data-'+attr+'="" aria-pressed="'+(!cur)+'"><span>'+allLab+'</span><small>'+total+'</small></button>'+items.map(function(z){return '<button data-'+attr+'="'+esc(z[0])+'" aria-pressed="'+(cur===z[0])+'"><span>'+esc(z[1])+'</span><small>'+(z[2]==null?'':z[2])+'</small></button>';}).join('')+'</div>';
}
function bindAside(attr,key){$$('#x-gl [data-'+attr+']').forEach(function(b){b.onclick=function(){XS[key]=b.getAttribute('data-'+attr);xRender();window.scrollTo(0,0);};});}
function xEstrutura(){
  var P=ED.pecas.pecas,gs=[];P.forEach(function(p){if(gs.indexOf(p.grupo)<0)gs.push(p.grupo);});
  var a='<div class="lab">Peças</div><div class="glist" id="x-gl"><button data-p="" aria-pressed="'+(!XS.peca)+'"><span>Todas as peças</span><small>'+P.length+'</small></button>';
  gs.forEach(function(g){a+='<div class="k" style="margin:10px 8px 2px">'+esc(g)+'</div>'+P.filter(function(p){return p.grupo===g;}).map(function(p){return '<button data-p="'+p.id+'" aria-pressed="'+(XS.peca===p.id)+'"><span>'+esc(p.t)+'</span><small>'+p.elementos.length+'</small></button>';}).join('');});
  a+='</div><div class="note">Elementos e fórmulas de cada peça no padrão do gabinete. Divergências entre as orientações ficam em “Tensões entre orientações”, sem escolha prévia. Onde a fórmula depende do Relator ou dos autos, aparece [VALIDAR].</div>';
  $('#x-aside').innerHTML=a;bindAside('p','peca');
  var L=P.filter(function(p){return !XS.peca||p.id===XS.peca;}),cnt=0,h='';
  L.forEach(function(p){
    var els=p.elementos.filter(function(e){return hit(p.t+' '+e.n+' '+e.f+' '+e.r.join(' '));});
    if(XS.q&&!els.length&&!hit(p.t+' '+p.resumo))return;
    cnt+=els.length;
    h+='<section class="grp"><h2>'+esc(p.t)+' <small>'+esc(p.grupo)+' · '+els.length+' elementos</small></h2><p class="meta" style="margin:0 0 6px">'+esc(p.resumo)+'</p><div class="x-doc">';
    els.forEach(function(e){
      h+='<div class="x-el"><h4>'+esc(e.n)+' '+foTag(e.fo)+(e.ir?' <button class="x-go" data-ir="'+e.ir+'">ver a peça →</button>':'')+'</h4>'+(e.f?'<div class="x-f'+(/\[VALIDAR\]/.test(e.f)?' val':'')+'">'+esc(e.f)+'</div>':'')+(e.r.length?'<ul>'+e.r.map(function(r){return '<li>'+esc(r)+'</li>';}).join('')+'</ul>':'')+'</div>';
    });
    h+='</div>';
    if(p.notas&&p.notas.length)h+='<div class="note">'+p.notas.map(esc).join('<br>')+' '+foTag(p.notas_fo)+'</div>';
    var FM=formatacao(p.id);
    if(FM)h+=FM;
    if(p.id==='voto'){var DF=estiloItens().filter(function(r){return r.g==='F. Dispositivo e fecho'&&hit([r.titulo,r.pref,r.ev].join(' '));});
      if(DF.length){cnt+=DF.length;h+='<div class="k" style="margin-top:16px">Dispositivo e fecho</div><div class="grid">'+DF.map(function(r){return '<article class="card" style="--gc:var(--line)">'+(r.titulo?'<h3 style="margin-top:0">'+esc(r.titulo)+'</h3>':'')+'<div class="fields">'+(r.pref?'<div class="field good"><b>Preferir</b><p>'+esc(r.pref)+'</p></div>':'')+(r.ev?'<div class="field bad"><b>Evitar</b><p>'+esc(r.ev)+'</p></div>':'')+'</div></article>';}).join('')+'</div>';}}
    var MR=MANG[p.id]?manCap('02').filter(function(r){return r['Grupo']===MANG[p.id]&&hit(manTxt(r));}):[];
    if(MR.length){cnt+=MR.length;h+='<div class="k" style="margin-top:16px">Regras complementares · '+esc(MANG[p.id])+'</div><div class="grid">'+MR.map(manCard).join('')+'</div>';}
    if(p.exemplos)h+='<p style="margin:10px 0 0"><button class="btn" data-ex="'+p.exemplos+'">Ver modelos de decisão monocrática →</button></p>';
    h+='</section>';
  });
  if(!XS.peca&&(!XS.q||ED.pecas.tensoes.some(function(t){return hit(t.t+t.a+t.b);})))h+=xTensoes();
  $('#x-cnt').innerHTML='<b>'+cnt+'</b> elementos';
  $('#x-out').innerHTML=h||'<p class="empty">Nada encontrado.</p>';
  $$('#x-out [data-ir]').forEach(function(b){b.onclick=function(){XS.peca=b.getAttribute('data-ir');xRender();window.scrollTo(0,0);};});
  $$('#x-out [data-ex]').forEach(function(b){b.onclick=function(){irModelos('Monocrática');};});
}
/* Formatação de cada peça para colar no PJe, com amostra na página */
function formatacao(id){
  var F=(ED.pecas.forma.filter(function(f){return f.t==='Formatação para o PJe';})[0]||{}).r||[];if(!F.length)return '';
  var regras=id==='acordao-completo'?[F[3]]:id==='ementa'?[F[0],F[2]]:[F[0],F[1]];
  var peca=ED.pecas.pecas.filter(function(p){return p.id===id;})[0];
  var linhas=[];(peca.elementos||[]).forEach(function(e){String(e.f||'').split('\n').forEach(function(l){l=l.trim();if(l&&!/^\[VALIDAR/.test(l))linhas.push(l);});});
  var am='';
  if(id==='ementa'){am=linhas.map(function(l,i){var c=i===0?' class="pg-cab"':/^[IV]+\.\s/.test(l)?' class="pg-sub"':/^\d+\./.test(l)?' class="pg-it"':/^_{5,}/.test(l)?' class="pg-rule"':/:\s/.test(l)&&/relevante/.test(l)?' class="pg-rod"':'';
      if(c===' class="pg-it"')return '<p class="pg-noi"><b>'+esc(l.match(/^\d+\./)[0])+'</b>'+esc(l.replace(/^\d+\./,''))+'</p>';
      if(c===' class="pg-rod"'){var k=l.indexOf(':');return '<p class="pg-noi"><i>'+esc(l.slice(0,k+1))+'</i>'+esc(l.slice(k+1))+'</p>';}
      return '<p'+c+'>'+esc(l)+'</p>';}).join('');}
  else if(id==='acordao-completo'){am=['RELATÓRIO','VOTO','EMENTA','ACÓRDÃO'].map(function(t){return '<p class="pg-tit">'+t+' <small>(inserido pelo PJe)</small></p>';}).join('');}
  else am=linhas.slice(0,8).map(function(l){return '<p>'+esc(l)+'</p>';}).join('')+(id!=='despacho'?'<p class="pg-cit">“[...] trecho transcrito [...]”</p>':'');
  return '<div class="k" style="margin-top:16px">Formatação</div><div class="x-fmt"><ul>'+regras.filter(Boolean).map(function(r){return '<li>'+esc(r)+'</li>';}).join('')+'</ul><div class="pg'+(id==='ementa'?' pg-em':'')+'" aria-label="Amostra da formatação">'+am+'</div></div>';
}
function xTensoes(){
  var PR=manCap('08').filter(function(r){return hit(manTxt(r));});
  return '<section class="grp"><h2>Tensões entre orientações <small>sinalizar, não impor</small></h2>'+ED.pecas.tensoes.filter(function(t){return hit(t.t+t.a+t.b);}).map(function(t){return '<div class="x-card"><h3>'+esc(t.t)+' <span class="pill" style="color:var(--warn);border-color:var(--warn)">[VALIDAR]</span></h3><div class="x-ten"><div><b>Versão A</b>'+esc(t.a)+'</div><div><b>Versão B</b>'+esc(t.b)+'</div></div></div>';}).join('')+(PR.length?'<h2 style="margin-top:22px">Propostas em avaliação <small>não vigentes</small></h2><div class="grid">'+PR.map(manCard).join('')+'</div>':'')+'</section>';
}
var VOCG={'Termos e grafias':1,'D. Frase e vocabulário':1};
function ehVocab(g){return !!VOCG[g]||/^Manual · Vocabul/.test(g);}
function estiloItens(){
  var L=regs('preferencia').map(function(r){return {g:grp(r),id:r.id,regra:r.regra,titulo:r.titulo,pref:r.preferir,ev:r.evitar,base:r.base,fo:'R'};});
  var chave=function(x){return nz(x).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();};
  var idx={};L.forEach(function(it){if(it.pref&&chave(it.pref).length>3)idx[chave(it.pref)]=it;});
  man().filter(function(r){var c=String(r['Capítulo']||'');return c.indexOf('01')===0||c.indexOf('04')===0;}).forEach(function(r){
    var k=chave(r['Orientação']),ex=k.length>3&&idx[k];
    if(ex){ex.fo='R+D';ex.pag=r['Página'];return;}
    L.push({g:'Manual · '+(r['Grupo']||'Geral'),id:r['Código'],titulo:r['Título'],pref:r['Orientação'],ev:r['Evitar'],obs:r['Observação'],pag:r['Página'],fo:'D'});
  });
  return L;
}
var RED_ORD=['Regras gerais','Estrutura','Fatos e prova','Fundamentação'];
function redGrupo(r){if(/^Manual ·/.test(r.g)||r.g==='D. Frase e vocabulário')return 'Regras gerais';return String(r.g).replace(/^[A-Z]\.\s*/,'');}
function redacaoItens(){return estiloItens().filter(function(r){return r.g!=='Termos e grafias'&&r.g!=='E. Citação'&&r.g!=='F. Dispositivo e fecho'&&r.g!=='G. Matéria rural'&&!/voto rural/i.test(r.titulo||'')&&!/^Manual · Vocabul/.test(r.g);}).map(function(r){r.rg=redGrupo(r);return r;});}
function xEstilo(){
  var R=redacaoItens(),gs={};R.forEach(function(r){gs[r.rg]=(gs[r.rg]||0)+1;});
  var ord=RED_ORD.filter(function(g){return gs[g];}).concat(Object.keys(gs).filter(function(g){return RED_ORD.indexOf(g)<0;}));
  $('#x-aside').innerHTML='<div class="lab">Redação</div>'+xAsideList(ord.map(function(g){return [g,g,gs[g]];}),XS.grupo,'g','Todos os tópicos',R.length)+'<div class="note">Como escrever: regras gerais de frase e léxico, depois as regras de estrutura, prova e fundamentação. Dispositivo e fecho estão na Estrutura das peças; palavras, grafias e citação, em Vocabulário e forma.</div>';
  bindAside('g','grupo');
  var L=R.filter(function(r){return (!XS.grupo||r.rg===XS.grupo)&&hit([r.titulo,r.pref,r.ev,r.regra,r.obs].join(' '));});
  $('#x-cnt').innerHTML='<b>'+L.length+'</b> regras';
  var h='';
  ord.forEach(function(g){var A=L.filter(function(r){return r.rg===g;});if(!A.length)return;
    h+='<section class="grp"><h2>'+esc(g)+' <small>'+A.length+'</small></h2><div class="grid">'+A.map(function(r){
      return '<article class="card" style="--gc:var(--line)">'+(r.titulo?'<h3 style="margin-top:0">'+esc(r.titulo)+'</h3>':'')+'<div class="fields">'+(r.pref?'<div class="field good"><b>Preferir</b><p>'+esc(r.pref)+'</p></div>':'')+(r.ev?'<div class="field bad"><b>Evitar</b><p>'+esc(r.ev)+'</p></div>':'')+(r.obs?'<div class="field"><b>Observação</b><p>'+esc(r.obs)+'</p></div>':'')+'</div></article>';}).join('')+'</div></section>';});
  $('#x-out').innerHTML=h||'<p class="empty">Nenhuma regra encontrada.</p>';
}
function vocabMerge(tipo){
  var out=[],idx={},k=function(x){return nz(x).replace(/[“”"'.,;:…]/g,'').trim();};
  if(tipo==='conectivo'){
    man().filter(function(r){return r['Tipo']==='Conectivo';}).forEach(function(r){var it={a:r['Título'],b:r['Orientação']||r['Grupo'],oc:r['Ocorrências']||'',fo:'D'};idx[k(it.a)]=it;out.push(it);});
    regs('conectivo').forEach(function(r){var ex=idx[k(r.expressao)];if(ex){if(ex.fo.indexOf('R')<0)ex.fo+='+R';if(r.funcao&&nz(r.funcao)!==nz(ex.b))ex.b+=' · '+r.funcao;return;}out.push({a:r.expressao,b:r.funcao,oc:'',fo:'R'});});
  }else{
    man().filter(function(r){return r['Tipo']==='Verbo';}).forEach(function(r){var it={a:r['Título'],b:r['Orientação'],c:r['Observação'],fo:'D'};idx[k(it.a)]=it;out.push(it);});
    regs('verbo').forEach(function(r){var ex=idx[k(r.verbo)];if(ex){if(ex.fo.indexOf('R')<0)ex.fo+='+R';if(!ex.c)ex.c=r.emprego;return;}out.push({a:r.verbo,b:r.construcao,c:r.emprego,fo:'R'});});
  }
  return out;
}
/* Vocabulário integrado: termos e grafias de todas as fontes reunidos por termo, com divergências apontadas */
function vk(x){return nz(x).replace(/[’`´]/g,"'").replace(/[“”"«»]/g,'').replace(/\s+/g,' ').trim().replace(/[,;:…]+$/,'').replace(/(\w)\.$/,'$1');}
function termosIntegrados(){
  var rows=[],porAd={},porEv={};
  function termos(x){return String(x||'').split(/\s*(?:·|;| ou )\s*|\s+\/\s+/).map(function(t){return t.replace(/\s*\(.*?\)\s*$/,'').trim();}).filter(function(t){return t&&t.length<60;});}
  function add(ad,ev,obs,fo,ref,auto){
    ad=String(ad||'').trim();ev=String(ev||'').trim();
    var ka=vk(ad).replace(/…$/,'').trim(),r=ka&&porAd[ka];
    if(!r&&ka.length>3)Object.keys(porAd).some(function(k){if(k.length>3&&(ka.indexOf(k+' ')===0||k.indexOf(ka+' ')===0)){r=porAd[k];return true;}return false;});
    if(!r){var evs=termos(ev);for(var i=0;i<evs.length&&!r;i++){var ke=vk(evs[i]);if(ke.length>2&&porEv[ke]&&(!ad||!porEv[ke].ad||vk(porEv[ke].ad)===ka))r=porEv[ke];}}
    if(!r){r={ad:ad,ev:[],obs:[],fo:[],ref:[],auto:false};rows.push(r);if(ka)porAd[ka]=r;}
    if(ad&&!r.ad){r.ad=ad;porAd[ka]=r;}
    termos(ev).forEach(function(t){var kt=vk(t);if(kt&&!r.ev.some(function(z){return vk(z)===kt;}))r.ev.push(t);if(kt.length>2)porEv[kt]=r;});
    if(obs&&r.obs.indexOf(obs)<0)r.obs.push(obs);
    String(fo).split('+').forEach(function(f){if(f&&r.fo.indexOf(f)<0)r.fo.push(f);});
    if(ref&&r.ref.indexOf(ref)<0)r.ref.push(ref);
    if(auto)r.auto=true;
  }
  man().filter(function(r){return /^Vocabul/.test(r['Grupo']||'')&&r['Capítulo'].indexOf('04')===0;}).forEach(function(r){
    if(r['Título']&&!/^“/.test(r['Título'])&&r['Grupo']==='Vocabulário')add(r['Orientação'],r['Evitar'],r['Título'],'D',r['Código']+(r['Página']?', p. '+r['Página']:''));
    else if(r['Grupo']==='Vocabulário — adotar e evitar')add(r['Orientação'],r['Evitar'],'','D',r['Código']+(r['Página']?', p. '+r['Página']:''));
  });
  regs('preferencia').filter(function(r){return !r.grupo;}).forEach(function(r){add(r.preferir,r.evitar,'','R',r.id);});
  regs('correcao').forEach(function(r){var esq=String(r.motivo||'').split('→')[0],m=esq.match(/“([^”]+)”/);var ev=m?m[1]:'';var obs=m&&/equivalentes/.test(esq)?'Inclui equivalentes.':(!m?esq.trim():'');
    if(!ev&&/laudat/.test(r.motivo)){ev='Egrégio · Colendo · Excelso';}
    add(r.substituir||'',ev,obs,'R',r.id,true);});
  (ED.pecas.evitar.itens||[]).forEach(function(t){var c=t.replace(/[“”]/g,'');add('',c,'','M','');});
  /* divergências: termo adotado numa fonte e evitado noutra */
  var adset={};rows.forEach(function(r){if(r.ad)adset[vk(r.ad)]=r;});
  rows.forEach(function(r){r.ev.forEach(function(t){var o=adset[vk(t)];if(o&&o!==r){r.conf=o.ad;o.conf=t;}else if(o===r){r.conf=t;}});});
  rows.sort(function(a,b){return (b.conf?1:0)-(a.conf?1:0)||(a.ad?0:1)-(b.ad?0:1)||nz(a.ad||a.ev[0]).localeCompare(nz(b.ad||b.ev[0]));});
  return rows;
}
function usosLexicos(){
  /* regras de uso (frase e léxico) do Manual e do banco: ligadas aos conectivos e verbos quando tratam deles */
  var L=[];
  regs('preferencia').filter(function(r){return r.grupo==='D. Frase e vocabulário';}).forEach(function(r){L.push({t:r.titulo,pref:r.preferir,ev:r.evitar,fo:'R',id:r.id});});
  man().filter(function(r){return r['Grupo']==='Vocabulário'&&/^“/.test(r['Título']||'');}).forEach(function(r){L.push({t:r['Título'],pref:r['Orientação'],ev:r['Evitar'],fo:'D',id:r['Código']+(r['Página']?' · p. '+r['Página']:''),termo:r['Título'].replace(/[“”]/g,'')});});
  return L;
}
var VG=[['palavras','Termos, conectivos e verbos',[['xv-ter','Termos'],['xv-con','Conectivos e transições'],['xv-ver','Verbos e construções'],['xv-res','Verbos de resultado']]],['forma','Grafias, normas e remissões',[['xv-gra','Grafias'],['xv-nor','Grafia de normas'],['xv-ref','Normas, referências e remissões']]],['cit','Citação de precedentes',[]]];
function ehGrafia(r){var ad=r.ad||'',t=[ad].concat(r.ev).join(' | ');if(/sigla/i.test(r.obs.join(' ')))return true;if(ad.length>60)return false;
  return /\d/.test(t)||/\S\/\S/.test(t)||/n[º°]/i.test(t)||/\(g\.?\s?n/.test(t)||/\bID['’]?s\b/.test(t)||r.ev.concat([ad]).some(function(e){return /^[A-Z]{2,6}(?:['’]?s)?(\b|$)/.test(e);})||/sigla/i.test(r.obs.join(' '));}
function tabela(cab,rows,cls){return rows.length?'<div class="x-card"><table class="x-tbl'+(cls?' '+cls:'')+'"><thead><tr>'+cab.map(function(c){return '<th>'+c+'</th>';}).join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>':'<p class="empty">Nada encontrado.</p>';}
function linhaTermo(r){return '<tr'+(r.conf?' class="x-conf"':'')+'><td>'+(r.ad?esc(r.ad):'<span class="meta">—</span>')+(r.conf?'<div class="x-confm">[VALIDAR] há orientação em sentido oposto (“'+esc(r.conf)+'”)</div>':'')+'</td><td>'+r.ev.map(function(e){return '<span class="x-ev">'+esc(e)+'</span>';}).join(' ')+'</td><td>'+esc(r.obs.join(' '))+'</td></tr>';}
function conectivosVerbos(){
  var U=usosLexicos(),C=vocabMerge('conectivo'),V=vocabMerge('verbo');
  U.forEach(function(u){if(!u.termo)return;var k=vk(u.termo);var c=C.filter(function(r){return vk(r.a)===k;})[0];if(c){c.uso=(u.pref||'')+(u.ev?' Evitar: '+u.ev:'');return;}
    var v=V.filter(function(r){return vk(r.a)===k;})[0];if(v){v.uso=(u.pref||'')+(u.ev?' Evitar: '+u.ev:'');}else V.push({a:u.termo,b:'',c:u.pref+(u.ev?' Evitar: '+u.ev:'')});});
  return {C:C,V:V};
}
function xVocab(){
  if(!VG.some(function(z){return z[0]===XS.vg;}))XS.vg='palavras';
  var TI=termosIntegrados().filter(function(r){return !ehGrafia(r);}),CV=conectivosVerbos();
  var G=termosIntegrados().filter(ehGrafia),FF={};ED.pecas.forma.forEach(function(f){FF[f.t]=f.r;});
  var CITR=estiloItens().filter(function(r){return r.g==='E. Citação';}),MC=manCap('03');
  var RS0=[['Recurso','provido / desprovido'],['Embargos de declaração','acolhidos / rejeitados'],['Mandado de segurança','segurança concedida / denegada']];
  var cnts={palavras:TI.length+CV.C.length+CV.V.length+RS0.length,forma:G.length+(ED.normas||[]).length+(FF['Normas e referências']||[]).length+(FF['Enumeração e remissões']||[]).length,cit:(FF['Citação de precedente']||[]).length+CITR.length+MC.length};
  $('#x-aside').innerHTML='<div class="lab">Vocabulário e forma</div><div class="glist" id="x-gl">'+VG.map(function(z){var on=XS.vg===z[0];return '<button data-v="'+z[0]+'" aria-pressed="'+on+'"><span>'+z[1]+'</span><small>'+cnts[z[0]]+'</small></button>'+(on?z[2].map(function(s){return '<button class="l1" data-j="'+s[0]+'"><span>'+s[1]+'</span></button>';}).join(''):'');}).join('')+'</div><div class="note">Que palavras usar e como grafar, remeter e citar.</div>';
  $$('#x-gl [data-v]').forEach(function(b){b.onclick=function(){XS.vg=b.getAttribute('data-v');xRender();window.scrollTo(0,0);};});
  $$('#x-gl [data-j]').forEach(function(b){b.onclick=function(){var el=document.getElementById(b.getAttribute('data-j'));if(el)el.scrollIntoView({behavior:'smooth',block:'start'});};});
  var h='',n=0,ht=function(r){return hit([r.ad,r.ev.join(' '),r.obs.join(' ')].join(' '));};
  function sub(id,tit,small,body,qt){n+=qt;return '<h3 class="x-sub3" id="'+id+'">'+tit+(small!=null?' <small>'+small+'</small>':'')+'</h3>'+body;}
  if(XS.vg==='palavras'){
    var R=TI.filter(ht),C=CV.C.filter(function(r){return hit(r.a+' '+r.b+' '+(r.uso||''));}),V=CV.V.filter(function(r){return hit(r.a+' '+r.b+' '+r.c+' '+(r.uso||''));}),RS=RS0.filter(function(r){return hit(r.join(' '));});
    h='<section class="grp"><h2>Termos, conectivos e verbos</h2>';
    h+=sub('xv-ter','Termos','adotar e evitar',tabela(['Adotar','Evitar','Observação'],R.map(linhaTermo),'x-voc'),R.length);
    h+=sub('xv-con','Conectivos e transições',C.length,tabela(['Expressão','Função','Regra de uso','Ocorrências no acervo'],C.map(function(r){return '<tr><td>'+esc(r.a)+'</td><td>'+esc(r.b)+'</td><td>'+esc(r.uso||'')+'</td><td>'+esc(r.oc||'')+'</td></tr>';})),C.length);
    h+=sub('xv-ver','Verbos e construções',V.length,tabela(['Verbo','Construção','Emprego'],V.map(function(r){return '<tr><td>'+esc(r.a)+'</td><td>'+esc(r.b)+'</td><td>'+esc((r.c||'')+(r.uso?(r.c?' · ':'')+r.uso:''))+'</td></tr>';})),V.length);
    h+=sub('xv-res','Verbos de resultado','por classe',tabela(['Classe','Resultado'],RS.map(function(r){return '<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td></tr>';})),RS.length)+'</section>';
  }else if(XS.vg==='forma'){
    var Rg=G.filter(ht),N=(ED.normas||[]).filter(function(r){return hit([r.sigla,r.nome,r.prosa,(r.aliases||[]).join(' ')].join(' '));}),fr=(FF['Normas e referências']||[]).concat(FF['Enumeração e remissões']||[]).filter(hit);
    h='<section class="grp"><h2>Grafias, normas e remissões</h2>';
    h+=sub('xv-gra','Grafias','siglas e formas fixas',tabela(['Grafar','Evitar','Observação'],Rg.map(linhaTermo),'x-voc'),Rg.length);
    h+=sub('xv-nor','Grafia de normas',N.length,tabela(['Sigla','Nome','Na prosa','Tipo'],N.map(function(r){return '<tr><td>'+esc(r.sigla)+'</td><td>'+esc(r.nome)+'</td><td>'+esc(r.prosa)+'</td><td>'+esc(r.tipo)+'</td></tr>';})),N.length);
    h+=sub('xv-ref','Normas, referências e remissões',null,fr.length?'<div class="x-card"><ul>'+fr.map(function(r){return '<li>'+esc(r)+'</li>';}).join('')+'</ul></div>':'<p class="empty">Nada encontrado.</p>',fr.length)+'</section>';
  }else{
    var fc=(FF['Citação de precedente']||[]).filter(hit),CI=CITR.filter(function(r){return hit([r.titulo,r.pref,r.ev].join(' '));}),M3=MC.filter(function(r){return hit(manTxt(r));});n=fc.length+CI.length+M3.length;
    h='<section class="grp"><h2>Citação de precedentes</h2>'+(fc.length?'<div class="x-card"><ul>'+fc.map(function(r){return '<li>'+esc(r)+'</li>';}).join('')+'</ul></div>':'')+'<div class="grid">'+CI.map(function(r){return '<article class="card" style="--gc:var(--line)">'+(r.titulo?'<h3 style="margin-top:0">'+esc(r.titulo)+'</h3>':'')+'<div class="fields">'+(r.pref?'<div class="field good"><b>Preferir</b><p>'+esc(r.pref)+'</p></div>':'')+(r.ev?'<div class="field bad"><b>Evitar</b><p>'+esc(r.ev)+'</p></div>':'')+'</div></article>';}).join('')+M3.map(manCard).join('')+'</div></section>';
  }
  $('#x-cnt').innerHTML='<b>'+n+'</b> itens';
  $('#x-out').innerHTML=h;
}
function stripHtml(h){var d=document.createElement('div');d.innerHTML=String(h||'').replace(/<(script|style|iframe|object)[\s\S]*?<\/\1>/gi,'');$$('*',d).forEach(function(el){if(!/^(H3|P|UL|OL|LI|B|I|EM|STRONG|BR)$/.test(el.tagName)){el.replaceWith(document.createTextNode(el.textContent));}else{while(el.attributes.length)el.removeAttribute(el.attributes[0].name);}});return d.innerHTML;}
function xForma(){
  var G=termosIntegrados().filter(ehGrafia).filter(function(r){return hit([r.ad,r.ev.join(' '),r.obs.join(' ')].join(' '));});
  var N=(ED.normas||[]).filter(function(r){return hit([r.sigla,r.nome,r.prosa,(r.aliases||[]).join(' ')].join(' '));});
  var F={};ED.pecas.forma.forEach(function(f){F[f.t]=f.r.filter(function(r){return hit(f.t+' '+r);});});
  var CIT=estiloItens().filter(function(r){return r.g==='E. Citação'&&hit([r.titulo,r.pref,r.ev].join(' '));});
  var MC=manCap('03').filter(function(r){return hit(manTxt(r));});
  var T=[['xf-graf','Grafias',G.length],['xf-nor','Grafia de normas',N.length],['xf-cit','Citação de precedentes',(F['Citação de precedente']||[]).length+CIT.length+MC.length],['xf-ref','Normas, referências e remissões',(F['Normas e referências']||[]).length+(F['Enumeração e remissões']||[]).length],['xf-pje','Formatação para o PJe',(F['Formatação para o PJe']||[]).length]];
  $('#x-aside').innerHTML='<div class="lab">Forma e citação</div><div class="glist" id="x-gl">'+T.map(function(z){return '<button data-j="'+z[0]+'"><span>'+z[1]+'</span><small>'+z[2]+'</small></button>';}).join('')+'</div><div class="note">Como grafar e citar: siglas e formas fixas, nomes de normas, citação de precedentes, remissões aos autos e formatação para colar no PJe.</div>';
  $$('#x-gl [data-j]').forEach(function(b){b.onclick=function(){var el=document.getElementById(b.getAttribute('data-j'));if(el)el.scrollIntoView({behavior:'smooth',block:'start'});};});
  function lista(L){return L.length?'<div class="x-card"><ul>'+L.map(function(r){return '<li>'+esc(r)+'</li>';}).join('')+'</ul></div>':'';}
  var n=0,h='';
  if(G.length){n+=G.length;h+='<section class="grp" id="xf-graf"><h2>Grafias <small>'+G.length+'</small></h2>'+tabela(['Grafar','Evitar','Observação'],G.map(linhaTermo),'x-voc')+'</section>';}
  if(N.length){n+=N.length;h+='<section class="grp" id="xf-nor"><h2>Grafia de normas <small>'+N.length+'</small></h2>'+tabela(['Sigla','Nome','Na prosa','Tipo'],N.map(function(r){return '<tr><td>'+esc(r.sigla)+'</td><td>'+esc(r.nome)+'</td><td>'+esc(r.prosa)+'</td><td>'+esc(r.tipo)+'</td></tr>';}))+'</section>';}
  var fc=F['Citação de precedente']||[];
  if(fc.length||CIT.length||MC.length){n+=fc.length+CIT.length+MC.length;h+='<section class="grp" id="xf-cit"><h2>Citação de precedentes</h2>'+lista(fc)+(CIT.length||MC.length?'<div class="grid">'+CIT.map(function(r){return '<article class="card" style="--gc:var(--line)">'+(r.titulo?'<h3 style="margin-top:0">'+esc(r.titulo)+'</h3>':'')+'<div class="fields">'+(r.pref?'<div class="field good"><b>Preferir</b><p>'+esc(r.pref)+'</p></div>':'')+(r.ev?'<div class="field bad"><b>Evitar</b><p>'+esc(r.ev)+'</p></div>':'')+'</div></article>';}).join('')+MC.map(manCard).join('')+'</div>':'')+'</section>';}
  var fr=(F['Normas e referências']||[]).concat(F['Enumeração e remissões']||[]);
  if(fr.length){n+=fr.length;h+='<section class="grp" id="xf-ref"><h2>Normas, referências e remissões</h2>'+lista(fr)+'</section>';}
  var fp=F['Formatação para o PJe']||[];
  if(fp.length){n+=fp.length;h+='<section class="grp" id="xf-pje"><h2>Formatação para o PJe</h2>'+lista(fp)+'</section>';}
  $('#x-cnt').innerHTML='<b>'+n+'</b> itens';
  $('#x-out').innerHTML=h||'<p class="empty">Nada encontrado.</p>';
}
$$('#x-sub button').forEach(function(b){b.addEventListener('click',function(){XS.sub=b.getAttribute('data-s');XS.q='';$('#x-q').value='';xRender();});});
var xT;$('#x-q').addEventListener('input',function(e){clearTimeout(xT);xT=setTimeout(function(){XS.q=e.target.value.trim();xRender();},180);});

/* ================= EMENTÁRIO · subabas ================= */
function mostrar(){
  var p=EM.sub==='prec';if(window.VDM_marcaNav)window.VDM_marcaNav();
  $$('#e-sub button').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-s')===EM.sub));});
  ['#e-modes','#e-chips','#e-sel'].forEach(function(s){$(s).hidden=!p;});
  $('#e-aside').parentNode.classList.toggle('sem-aside',EM.sub==='par');
  $('#e-q').value=p?(E.q||''):(EM.q[EM.sub]||'');
  $('#e-q').placeholder=p?'Buscar por número, classe, assunto, tema ou ementa…':EM.sub==='mod'?'Buscar nos modelos: nome, assunto, tese, texto…':'Buscar nos parágrafos-padrão…';
  if(p){if(E.idx)render();else carregar();return;}
  $('#e-out').innerHTML='<p class="empty">Abrindo a base do gabinete…</p>';
  base().then(function(){if(EM.sub==='mod')mRender();else if(EM.sub==='par')pRender();}).catch(function(e){$('#e-out').innerHTML='<p class="empty">Não foi possível abrir a base do gabinete ('+esc(e.message)+').</p>';});
}
$$('#e-sub button').forEach(function(b){b.addEventListener('click',function(){EM.sub=b.getAttribute('data-s');fecharIT();mostrar();window.scrollTo(0,0);});});
function irModelos(tipo){EM.sub='mod';MS.tipo=tipo||'Acórdão';MS.ass='';MS.cls='';EM.q.mod='';MLIM=40;var b=document.querySelector('.tab[data-v="ement"]');if(b)b.click();}
function jp(s){try{return typeof s==='string'?JSON.parse(s||'null'):s;}catch(e){return null;}}
function marcar(t){return esc(t).replace(/\{\{([^}]*)\}\}/g,'<mark>{{$1}}</mark>').replace(/\[PREENCHER:([^\]]*)\]/g,'<mark>[PREENCHER:$1]</mark>').replace(/\[VALIDAR([^\]]*)\]/g,'<mark>[VALIDAR$1]</mark>');}
/* ---- Modelos ---- */
var MS={tipo:'Acórdão',apr:'',ass:'',cls:'',mais:{}},MLIM=40;
function mTipo(m){var e=m.especieModelo||'';return /^voto/.test(e)?'Acórdão':e==='despacho'?'Despacho':'Monocrática';}
function mAss(m){return m.assunto||'Sem assunto';}
function mApr(m){var s=String(m.classeSigla||'')+' '+String(m.especie||''),n=nz([m.nomeModelo,m.assunto,m.processo].join(' '));
  if(m.especieModelo==='despacho')return 'Providência (despacho)';
  if(/\bED|EDcl/.test(s)||/embargos de declaracao|omissao, contradicao/.test(n))return 'Embargos de declaração';
  if(/AgInt/.test(s)||/agravo interno/.test(n))return 'Agravo interno';
  if(/retratacao/.test(n))return 'Juízo de retratação';
  return 'Julgamento do recurso';}
function mCls(m){return m.classeSigla||m.especie||'—';}
function mSecoes(m){
  var e=jp(m.esqueletoModelo)||{},P=jp(m.paragrafosModelo)||[],out=[],usados={};
  (e._topicos||[]).forEach(function(t){var bl=[],b=e[t.id];
    if(b&&b.texto)bl.push({txt:b.texto,ativo:b.ativo!==false});
    P.filter(function(p){return p.posicao===t.id;}).sort(function(a,b){return (a.ordem||0)-(b.ordem||0)||String(a.versao||'').localeCompare(String(b.versao||''));}).forEach(function(p){bl.push({txt:p.texto,tit:p.titulo,ver:p.versao,op:p.opcional});});
    usados[t.id]=1;out.push({t:t,bl:bl});});
  var resto=P.filter(function(p){return !usados[p.posicao];});
  if(resto.length)out.push({t:{id:'_',titulo:'Outros trechos'},bl:resto.map(function(p){return {txt:p.texto,tit:p.titulo,ver:p.versao};})});
  return out;
}
function mTextoBase(m){
  var L=[];mSecoes(m).forEach(function(s){var temPar=s.bl.some(function(b){return b.tit!=null;});
    s.bl.forEach(function(b){if(b.tit==null){if(!temPar&&(b.ativo||!s.t.opcional))L.push(b.txt);}else if(b.ver==null||b.ver==='a'||b.ver===1||b.ver==='1')L.push(b.txt);});});
  return L.join('\n\n');
}
/* Roteiros e diretrizes por matéria (banco de redação): aparecem ao lado dos modelos do assunto */
function roteiros(){
  var P=regs('preferencia'),R=[];
  var rur=P.filter(function(r){return r.grupo==='G. Matéria rural';}),seq=P.filter(function(r){return /voto rural/i.test(r.titulo||'');})[0];
  if(rur.length||seq)R.push({re:/rural/i,nome:'Matéria rural',passos:seq?String(seq.preferir||'').split(/;\s*/).map(function(x){return x.replace(/\.$/,'').trim();}).filter(Boolean):[],seqEv:seq&&seq.evitar,dir:rur});
  return R;
}
function roteiroDe(ass){if(!ass)return null;return roteiros().filter(function(r){return r.re.test(ass);})[0]||null;}
function rotHtml(ro,ass){
  var h='<div class="e-dhead"><div class="e-dtit"><span class="e-tag apr">Roteiro</span><span class="e-dname">'+esc(ro.nome)+'</span><button class="e-dx" data-dx title="Fechar (Esc)" aria-label="Fechar">×</button></div><p class="meta" style="margin:8px 0 0">Assunto: '+esc(ass)+'</p></div><div class="e-dbody">';
  if(ro.passos.length)h+='<h3 class="e-sec">Sequência do voto</h3><ol class="x-ol">'+ro.passos.map(function(p){return '<li>'+esc(p.charAt(0).toUpperCase()+p.slice(1))+'</li>';}).join('')+'</ol>'+(ro.seqEv?'<p class="meta"><b>Evitar:</b> '+esc(ro.seqEv)+'</p>':'');
  if(ro.dir.length)h+='<h3 class="e-sec">Diretrizes da matéria</h3>'+ro.dir.map(function(r){return '<div class="x-dir"><b>'+esc(r.titulo||'')+'</b>'+(r.preferir?'<p>'+esc(r.preferir)+'</p>':'')+(r.evitar?'<p class="ev"><span>Evitar:</span> '+esc(r.evitar)+'</p>':'')+'</div>';}).join('');
  return h+'</div>';
}
function mostraRoteiro(){
  var ro=roteiroDe(MS.ass);if(!ro)return false;
  var box=painel(rotHtml(ro,MS.ass),true);var x=box.querySelector('[data-dx]');if(x)x.onclick=function(){fecharIT();};return true;
}
function mRender(){
  var M=(BASE&&BASE.mod)||[],q=nz(EM.q.mod||'');
  var passa=function(m,ex){if(ex!=='tipo'&&MS.tipo&&mTipo(m)!==MS.tipo)return false;if(ex!=='ass'&&MS.ass&&mAss(m)!==MS.ass)return false;if(ex!=='apr'&&MS.apr&&mApr(m)!==MS.apr)return false;if(ex!=='cls'&&MS.cls&&mCls(m)!==MS.cls)return false;
    if(q){if(!m._q)m._q=nz([m.nomeModelo,m.assunto,m.temas,m.tese,m.resultado,m.fundamentacao,m.classe,m.pronunciamento,mTextoBase(m)].join(' '));if(m._q.indexOf(q)<0)return false;}return true;};
  function cnt(ex,fn){var c={};M.filter(function(m){return passa(m,ex);}).forEach(function(m){var k=fn(m);c[k]=(c[k]||0)+1;});return Object.keys(c).map(function(k){return [k,c[k]];}).sort(function(a,b){return b[1]-a[1]||a[0].localeCompare(b[0]);});}
  var ct=cnt('tipo',mTipo),tot=ct.reduce(function(a,z){return a+z[1];},0),ctm={};ct.forEach(function(z){ctm[z[0]]=z[1];});
  var a='<div class="lab">Tipo</div><div class="seg" id="m-tipo">'+[['Acórdão','Acórdão',ctm['Acórdão']||0],['Monocrática','Monocrática',ctm['Monocrática']||0],['Despacho','Despacho',ctm['Despacho']||0]].map(function(z){return '<button data-v="'+z[0]+'" aria-pressed="'+(MS.tipo===z[0])+'" title="'+z[2]+' modelos">'+z[1]+'</button>';}).join('')+'</div>';
  function lista(dim,lab,c,n){var ab=MS.mais[dim],h='<div class="lab">'+lab+'</div><div class="glist"><button data-mf="'+dim+'" data-v="" aria-pressed="'+(!MS[dim])+'"><span>Todos</span><small>'+c.reduce(function(a,z){return a+z[1];},0)+'</small></button>'+c.slice(0,ab?c.length:n).map(function(z){return '<button data-mf="'+dim+'" data-v="'+esc(z[0])+'" aria-pressed="'+(MS[dim]===z[0])+'"><span>'+esc(z[0])+'</span><small>'+z[1]+'</small></button>';}).join('')+'</div>';if(c.length>n)h+='<button class="e-gmore" data-mm="'+dim+'">'+(ab?'Mostrar menos':'Mostrar todos ('+c.length+')')+'</button>';return h;}
  a+=lista('apr','Apreciação',cnt('apr',mApr),6)+lista('ass','Assunto',cnt('ass',mAss),12)+lista('cls','Classe',cnt('cls',mCls),8);
  a+='<div class="note">Base de modelos do gabinete (procs-muta · modelos/modelos.json): votos-matriz para acórdão, decisões monocráticas e despachos. Os trechos entre {{ }} são preenchidos com os dados dos autos.</div>';
  $('#e-aside').innerHTML=a;
  $$('#m-tipo button').forEach(function(b){b.onclick=function(){MS.tipo=b.getAttribute('data-v');MS.ass='';MS.cls='';MS.apr='';MLIM=40;mRender();};});
  $$('#e-aside [data-mf]').forEach(function(b){b.onclick=function(){var d=b.getAttribute('data-mf'),v=b.getAttribute('data-v');MS[d]=MS[d]===v?'':v;MLIM=40;mRender();};});
  $$('#e-aside [data-mm]').forEach(function(b){b.onclick=function(){var d=b.getAttribute('data-mm');MS.mais[d]=!MS.mais[d];mRender();};});
  var L=M.filter(function(m){return passa(m);}).sort(function(x,y){return mTipo(x).localeCompare(mTipo(y))||mAss(x).localeCompare(mAss(y))||String(x.nomeModelo).localeCompare(String(y.nomeModelo));});
  $('#e-cnt').innerHTML='<b>'+n0(L.length)+'</b> de '+n0(M.length)+' modelos';
  var cor={'Acórdão':'var(--stj)','Monocrática':'var(--trf)','Despacho':'var(--mut)'};
  var h=L.slice(0,MLIM).map(function(m){var tp=mTipo(m),st=m.statusCuradoria,ap=mApr(m);
    return '<li class="e-proc m-row" data-mid="'+esc(m.id)+'"><div class="e-crow m-crow" data-mact="ver"><div class="e-c0"><span class="e-tag '+(tp==='Acórdão'?'A':tp==='Monocrática'?'M':'')+'">'+esc(tp)+'</span></div><div class="e-c2"><span class="e-ass" title="'+esc(m.nomeModelo||'')+'">'+esc(m.nomeModelo||m.processo||m.id)+'</span><div class="e-ctags">'+(ap!=='Julgamento do recurso'&&ap!=='Providência (despacho)'?'<span class="e-ct apr">'+esc(ap)+'</span>':'')+'<span class="e-ct org">'+esc(mCls(m))+'</span><span class="e-ct">'+esc(mAss(m))+'</span>'+(m.resultado?'<span class="e-ct dash" title="'+esc(m.resultado)+'">'+esc(String(m.resultado).slice(0,60))+'</span>':'')+(st?'<span class="e-ct apr">'+esc(st)+'</span>':'')+'</div></div><div class="e-c3"><button class="e-ib" data-mact="cp" title="Copiar texto-base" aria-label="Copiar texto-base">'+ICO.cit+'</button><button class="e-ib" data-mact="ver" title="Ver modelo" aria-label="Ver modelo">'+ICO.doc+'</button></div></div></li>';}).join('');
  if(L.length>MLIM)h+='<div class="e-more"><button class="btn" id="m-mais">Mostrar mais ('+(L.length-MLIM)+')</button></div>';
  var rob=roteiroDe(MS.ass)&&!largo()?'<p><button class="btn gold" id="m-rot">Roteiro e diretrizes · '+esc(roteiroDe(MS.ass).nome)+'</button></p>':'';
  $('#e-out').innerHTML=rob+(L.length?'<div class="e-split"><div class="e-lcol"><ul class="e-res">'+h+'</ul></div><section class="e-det" id="e-det" hidden></section></div>':'<p class="empty">Nenhum modelo com esses filtros.</p>');
  var rb=$('#m-rot');if(rb)rb.onclick=mostraRoteiro;
  var mb=$('#m-mais');if(mb)mb.onclick=function(){MLIM+=80;mRender();};
  if(roteiroDe(MS.ass)&&largo())mostraRoteiro();
}
function mAbrir(m){
  var F=[['Pronunciamento',m.pronunciamento],['Apreciação',mApr(m)],['Classe',m.classe||m.classeSigla],['Assunto',m.assunto],['Temas',m.temas],['Causa de pedir',m.causaPedir],['Resultado',m.resultado],['Preliminares',m.preliminares],['Honorários',m.honorarios],['Processos associados',m.processosAssociados]].filter(function(z){return z[1];});
  var h='<div class="e-dhead"><div class="e-dtit"><span class="e-tag A">'+esc(mTipo(m))+'</span><span class="e-dname">'+esc(m.nomeModelo||m.id)+'</span><button class="e-dx" data-dx title="Fechar (Esc)" aria-label="Fechar">×</button></div>';
  h+='<div class="e-dmeta">'+F.slice(0,6).map(function(z){return '<div><span>'+z[0]+'</span>'+esc(z[1])+'</div>';}).join('')+'</div><div class="e-dacts"><button class="e-mini pri" data-mcp>Copiar texto-base</button>'+(roteiroDe(m.assunto)?'<button class="e-mini" data-mrot>Roteiro da matéria</button>':'')+'</div></div><div class="e-dbody">';
  if(m.tese)h+='<h3 class="e-sec">Tese</h3><div class="e-box">'+esc(m.tese)+'</div>';
  F.slice(6).forEach(function(z){h+='<h3 class="e-sec">'+z[0]+'</h3><div class="e-box">'+esc(z[1])+'</div>';});
  if(m.especificidades)h+='<h3 class="e-sec">Especificidades</h3><div class="e-box">'+esc(m.especificidades)+'</div>';
  if(m.fundamentacao)h+='<h3 class="e-sec">Fundamentação resumida</h3><div class="e-box">'+esc(m.fundamentacao)+'</div>';
  h+='<h3 class="e-sec">Estrutura do modelo</h3><div class="x-doc">';
  mSecoes(m).forEach(function(s){var t=s.t;
    h+='<div class="x-el"><h4>'+esc(t.titulo||t.id)+(t.grupo?' <span class="x-fo">'+esc(t.grupo)+'</span>':'')+(t.opcional?' <span class="pill">opcional</span>':'')+'</h4>';
    if(!s.bl.length)h+='<p class="meta">Tópico de redação livre.</p>';
    s.bl.forEach(function(x){h+=(x.tit!=null?'<p class="meta" style="margin:6px 0 0"><b>'+esc((x.ver!=null?'Versão '+x.ver+' · ':'')+(x.tit||''))+'</b>'+(x.op?' · opcional':'')+'</p>':'')+'<div class="x-f serif'+(x.ativo===false?' off':'')+'">'+marcar(x.txt)+'</div>';});
    h+='</div>';});
  h+='</div>'+(m.fonte?'<h3 class="e-sec">Origem</h3><p class="meta">'+esc(m.fonte)+' · '+esc(m.id)+'</p>':'')+'</div>';
  var box=painel(h,true);
  box.querySelector('[data-dx]').onclick=function(){fecharIT();};
  box.querySelector('[data-mcp]').onclick=function(){copiar(mTextoBase(m),'Texto-base do modelo copiado');};
  var br=box.querySelector('[data-mrot]');if(br)br.onclick=function(){var ro=roteiroDe(m.assunto),b2=painel(rotHtml(ro,m.assunto),true);b2.querySelector('[data-dx]').onclick=function(){fecharIT();};};
  $$('#e-out [data-mid]').forEach(function(c){c.classList.toggle('sel',c.getAttribute('data-mid')===m.id);});
}
/* ---- Parágrafos-padrão ---- */
var PS={cat:'',sub:'',st:''};
var STL={padrao:'Padrão',estrutural:'Estrutural',variante:'Variante',especifico:'Específico',preferencial:'Preferencial',anterior:'Anterior',pedido:'Pedido'};
function pVars(t,txt){return String(t||'').replace(/\{(\w+)(?:\|([^}]+))?\}/g,function(_,c,r){return txt?'['+(r||c)+']':'\u0001'+(r||c)+'\u0002';});}
function pHtml(t){return esc(pVars(t,false)).replace(/\u0001([^\u0002]*)\u0002/g,'<mark>[$1]</mark>');}
function pRender(){
  var P=(BASE&&BASE.par)||[],q=nz(EM.q.par||'');
  var base0=P.filter(function(p){return !q||nz([p.titulo,p.texto,p.categoria,p.uso,p.nivelTema,p.nivelEspecificidade,p.especificidadesTags].join(' ')).indexOf(q)>=0;});
  var tree={},cats=[];base0.forEach(function(p){var c=p.nivelCategoria||'Outros',s=p.nivelSubsecao||'Geral';if(!tree[c]){tree[c]={_n:0};cats.push(c);}tree[c]._n++;tree[c][s]=(tree[c][s]||0)+1;});
  var a='<div class="lab">Categorias</div><div class="glist tree"><button data-pc="" data-ps="" aria-pressed="'+(!PS.cat&&!PS.sub)+'"><span>Todos os parágrafos</span><small>'+base0.length+'</small></button>';
  cats.forEach(function(c){a+='<button class="rh" data-pc="'+esc(c)+'" data-ps="" aria-pressed="'+(PS.cat===c&&!PS.sub)+'"><span>'+esc(c)+'</span><small>'+tree[c]._n+'</small></button>';
    Object.keys(tree[c]).filter(function(k){return k!=='_n';}).sort().forEach(function(s){a+='<button class="sa" data-pc="'+esc(c)+'" data-ps="'+esc(s)+'" aria-pressed="'+(PS.cat===c&&PS.sub===s)+'"><span>'+esc(s)+'</span><small>'+tree[c][s]+'</small></button>';});});
  a+='</div>';
  var sts={};base0.forEach(function(p){sts[p.status]=(sts[p.status]||0)+1;});
  a+='<div class="lab">Situação</div><div class="glist"><button data-pst="" aria-pressed="'+(!PS.st)+'"><span>Todas</span><small>'+base0.length+'</small></button>'+Object.keys(sts).sort(function(x,y){return sts[y]-sts[x];}).map(function(k){return '<button data-pst="'+esc(k)+'" aria-pressed="'+(PS.st===k)+'"><span>'+esc(STL[k]||k)+'</span><small>'+sts[k]+'</small></button>';}).join('')+'</div>';
  a+='<div class="note">Parágrafos-padrão do gabinete (procs-muta · modelos/paragrafos.json). Os campos entre colchetes são preenchidos com os dados dos autos.</div>';
  /* sem sumário lateral nos parágrafos-padrão */
  PS.cat=PS.sub=PS.st='';
  $$('#e-aside [data-pc]').forEach(function(b){b.onclick=function(){PS.cat=b.getAttribute('data-pc');PS.sub=b.getAttribute('data-ps');pRender();};});
  $$('#e-aside [data-pst]').forEach(function(b){b.onclick=function(){PS.st=b.getAttribute('data-pst');pRender();};});
  var L=base0.filter(function(p){return (!PS.cat||(p.nivelCategoria||'Outros')===PS.cat)&&(!PS.sub||(p.nivelSubsecao||'Geral')===PS.sub)&&(!PS.st||p.status===PS.st);});
  $('#e-cnt').innerHTML='<b>'+L.length+'</b> de '+P.length+' parágrafos';
  var grupos={},ord=[];L.forEach(function(p){var g=(p.nivelCategoria||'Outros')+' › '+(p.nivelSubsecao||'Geral');if(!grupos[g]){grupos[g]=[];ord.push(g);}grupos[g].push(p);});
  var h=ord.map(function(g){return '<section class="grp"><h2>'+esc(g)+' <small>'+grupos[g].length+'</small></h2><div class="grid">'+grupos[g].map(function(p){
    return '<article class="card" data-pid="'+esc(p.id)+'" style="--gc:var(--line)"><div class="hd"><span class="pill">'+esc(STL[p.status]||p.status||'')+'</span>'+(p.nivelTema?'<span class="meta" style="margin:0">'+esc(p.nivelTema)+(p.nivelEspecificidade?' · '+esc(p.nivelEspecificidade):'')+'</span>':'')+'</div><h3>'+esc(p.titulo||p.id)+'</h3><div class="x-f">'+pHtml(p.texto)+'</div>'+(p.uso?'<p class="meta">'+esc(p.uso)+'</p>':'')+(p.especificidadesTags?'<div class="chips">'+String(p.especificidadesTags).split(/;\s*/).filter(Boolean).map(function(t){return '<span class="chip">'+esc(t)+'</span>';}).join('')+'</div>':'')+'<div class="ft"><span class="sp"></span><button class="btn" data-pcp="'+esc(p.id)+'">Copiar</button></div></article>';}).join('')+'</div></section>';}).join('');
  $('#e-out').innerHTML=h||'<p class="empty">Nenhum parágrafo encontrado.</p>';
}
$('#e-out').addEventListener('click',function(e){
  var b=e.target.closest('[data-mact]');
  if(b){e.stopPropagation();var c=b.closest('[data-mid]'),m=((BASE&&BASE.mod)||[]).filter(function(x){return x.id===c.getAttribute('data-mid');})[0];if(!m)return;if(b.getAttribute('data-mact')==='ver')mAbrir(m);else copiar(mTextoBase(m),'Texto-base do modelo copiado');return;}
  var pc=e.target.closest('[data-pcp]');
  if(pc){var p=((BASE&&BASE.par)||[]).filter(function(x){return x.id===pc.getAttribute('data-pcp');})[0];if(p)copiar(pVars(p.texto,true),'Parágrafo copiado');}
});

/* ================= navegação: subabas em menus suspensos no cabeçalho ================= */
(function(){
  var MAPA={temas:'#v-temas .sub',rep:'#v-rep .sub',ement:'#e-sub',edit:'#x-sub'};
  var aberto=null;
  function fechaTodos(){$$('.tabw.open').forEach(function(w){w.classList.remove('open');w.querySelector('.tab').setAttribute('aria-expanded','false');});aberto=null;}
  function atual(v){var r=$(MAPA[v]);var b=r&&r.querySelector('[aria-selected="true"]');return b?b.textContent:'';}
  function marca(){$$('.tabw').forEach(function(w){var v=w.getAttribute('data-w'),sub=w.querySelector('.tab-cur');if(sub)sub.textContent=atual(v);w.querySelectorAll('.dd button').forEach(function(i){var r=$(MAPA[v]),src=r&&r.querySelector('[data-s="'+i.getAttribute('data-s')+'"]');i.setAttribute('aria-current',String(!!(src&&src.getAttribute('aria-selected')==='true')));});});}
  $$('.tabs .tab').forEach(function(t){
    var v=t.getAttribute('data-v'),row=$(MAPA[v]);if(!row)return;
    var w=document.createElement('span');w.className='tabw';w.setAttribute('data-w',v);t.parentNode.insertBefore(w,t);w.appendChild(t);
    t.setAttribute('aria-haspopup','true');t.setAttribute('aria-expanded','false');
    t.insertAdjacentHTML('beforeend','<span class="tab-cur"></span><svg class="car" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>');
    var dd=document.createElement('div');dd.className='dd';dd.setAttribute('role','menu');
    dd.innerHTML=Array.prototype.map.call(row.querySelectorAll('button[data-s]'),function(b){return '<button role="menuitem" data-s="'+b.getAttribute('data-s')+'">'+b.textContent+'</button>';}).join('');
    w.appendChild(dd);
    dd.addEventListener('click',function(e){var i=e.target.closest('button[data-s]');if(!i)return;e.stopPropagation();fechaTodos();
      if(t.getAttribute('aria-selected')!=='true')t.click();
      var src=row.querySelector('button[data-s="'+i.getAttribute('data-s')+'"]');if(src)src.click();marca();window.scrollTo(0,0);});
    t.addEventListener('click',function(e){
      if(t.getAttribute('aria-selected')==='true'){e.stopImmediatePropagation();var o=w.classList.contains('open');fechaTodos();if(!o){w.classList.add('open');t.setAttribute('aria-expanded','true');aberto=w;}}
      else{fechaTodos();}
      setTimeout(marca,0);
    },true);
    w.addEventListener('mouseenter',function(){if(window.matchMedia('(hover:hover)').matches){fechaTodos();w.classList.add('open');t.setAttribute('aria-expanded','true');}});
    w.addEventListener('mouseleave',function(){if(window.matchMedia('(hover:hover)').matches)fechaTodos();});
  });
  document.addEventListener('click',function(e){if(!e.target.closest('.tabw'))fechaTodos();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')fechaTodos();});
  $$('.sub button[data-s]').forEach(function(b){b.addEventListener('click',function(){setTimeout(marca,0);});});
  marca();window.VDM_marcaNav=marca;
})();
/* ================= navegação ================= */
function irEmentario(f){
  E.F={};E.q='';E.qn=null;E.y1=E.y2='';$('#e-q').value='';Object.keys(f||{}).forEach(function(k){E.F[k]=f[k];});E.modo='lista';E.sel=null;E.mmOpen=null;
  EM.sub='prec';$$('#e-sub button').forEach(function(z){z.setAttribute('aria-selected',String(z.getAttribute('data-s')==='prec'));});var b=document.querySelector('.tab[data-v="ement"]');if(b)b.click();
}
var xFeito=false;
window.VDM_refresh=function(){if(!$('#v-edit').hidden)xRender();};
window.VDM_view=function(v){
  if(v==='ement')mostrar();
  if(v==='edit'){if(!xFeito){xFeito=true;}xRender();}
};
})();
