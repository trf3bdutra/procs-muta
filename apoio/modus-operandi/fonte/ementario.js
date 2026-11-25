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
  x._ramo=ramo;x._ass=ass;if(!x.mat&&ass)x.mat=matAss(ass);
}
function prev(x){return String(x.e||'').replace(/^…/,'').replace(/^\s*Vistos\.?\s*/i,'');}
function titulo(x){var e=prev(x);if(x.t==='A'){var m=e.match(/^((?:[^.]{2,90}\.\s*){1,3})/);return (m?m[1]:e).trim();}return e.split(/(?<=\.)\s/)[0];}
function siglaO(o){if(!o)return 'órgão n/i';if(/Mato Grosso do Sul/.test(o))return 'TRMS';return o.replace(' Turma','ª T').replace('ªª','ª').replace(' Seção','ª S').replace('Órgão Especial','OE').replace('Vice-Presidência','VP').replace('Presidência','PRES');}

/* tipo de caso: "Matéria · tipo · aspecto distintivo" (padrao/tipo-caso.json), o mesmo padrão dos processos do gabinete;
   a matéria (1º segmento, nome canônico) liga o precedente ao processo */
var TCV={},TCA={};(function(){var V=window.TIPO_CASO||{};(V.materias||[]).forEach(function(m){[m.nome].concat(m.aliases||[]).forEach(function(a){TCV[nz(a).trim()]=m.nome;});(m.assuntos||[]).forEach(function(a){TCA[nz(a).trim()]=m.nome;});});})();
function tcSegs(s){return String(s||'').split(/\s+·\s+|;\s+|\s+›\s+/).map(function(z){return z.trim().replace(/[ .]+$/,'');}).filter(Boolean);}
function matDe(s){var p=nz(tcSegs(s)[0]||'').trim();if(!p)return '';if(TCV[p])return TCV[p];var b='';Object.keys(TCV).forEach(function(a){if(a.length>b.length&&(p.indexOf(a+' ')===0||p.indexOf(a+'(')===0))b=a;});return b?TCV[b]:'';}
function matAss(s){var k=nz(s).trim();return k?(TCA[k]||matDe(s)):'';}
function tcResto(x){var m=nz(x.mat),a=nz(x._ass);return tcSegs(x.tc).filter(function(z){var k=nz(z);return k!==m&&k!==a;}).join(' · ');}
function tcIgual(a,b){var r=tcResto(a);return !!r&&a.mat===b.mat&&nz(r)===nz(tcResto(b));}
var DIM={
  t:{n:'Tipo',v:function(x){return x.t==='A'?'Acórdão':'Monocrática';}},
  apr:{n:'Apreciação',v:function(x){return x._apr||'Julgamento do recurso';}},
  ramo:{n:'Ramo',v:function(x){return x._ramo||'Sem ramo informado';}},
  ass:{n:'Assunto',v:function(x){return x._ass||'Sem assunto catalogado';}},
  mat:{n:'Matéria',v:function(x){return x.mat||'Sem matéria';}},
  tc:{n:'Tipo de caso',v:function(x){return tcResto(x)||'Sem tipo de caso';}},
  c:{n:'Classe',v:function(x){return x.c||'—';}},
  o:{n:'Órgão',v:function(x){return x.o||'Órgão não informado';}},
  res:{n:'Resultado',v:function(x){return x._res;}},
  y:{n:'Mês',v:function(x){return x.y||'—';}}
};
var DIMS=['t','apr','ramo','mat','ass','tc','c','o','res','y'];
if(window.EMENT_FONTE){DIM.rl={n:'Relator',v:function(x){return x.rl||'Relator não informado';}};DIMS.splice(1,0,'rl');}
var MODOS=[['lista','Lista'],['mapa','Mapa mental'],['tempo','Linha do tempo'],['matriz','Matriz']];
var Y4=(function(){var d=new Date();return (d.getFullYear()-4)+'-'+('0'+(d.getMonth()+1)).slice(-2);})();
var E={idx:null,err:null,carregando:false,F:{},q:'',qm:'idx',ord:'data',y1:'',y2:'',modo:'lista',shown:60,open:{},sel:null,mais:{},
  dm:{mapa:['ramo','ass','res'],fluxo:['apr','ramo','res'],matriz:['apr','res'],tempo:'res'},mmOpen:null,clsNome:{}};
var EM={sub:'prec',q:{}};
try{var sv=JSON.parse(localStorage.getItem('vdm-ement2')||'null');if(sv){if(sv.modo&&/^(lista|mapa|tempo|matriz)$/.test(sv.modo))E.modo=sv.modo;if(sv.dm)E.dm=Object.assign(E.dm,sv.dm);}}catch(e){}
(function(){function fx(v){return v==='sub'?'tc':v;}Object.keys(E.dm).forEach(function(k){var v=E.dm[k];E.dm[k]=Array.isArray(v)?v.map(fx):fx(v);});})();
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
      var x={id:r.id,t:/^voto/i.test(r.pronunciamento||'Voto')?'A':'M',n:r.processo,c:r.classeSigla||r.especie||'',cl:r.classe||'',o:r.orgao||'',d:r.dataJulgamento||'',p:r.dataPublicacao||'',e:r.ementa||'',r:r.resultado||'',temas:r.temas||'',tese:r.tese||'',disp:r.dispositivosCitados||'',jur:r.jurisprudenciaCitada||'',it:!!r.inteiroTeor,tc:r.tipoCaso||r.subassunto||'',tcS:!!(r.tcSug||r.subSug),mat:r.materia||'',tags:String(r.espTags||'').split(/\s*;\s*/).filter(Boolean),esp:r.esp||'',obs:r.obs||'',proc:r.proc||null,rast:r.rast||null};
      if(!x.mat)x.mat=matDe(x.tc)||matAss(r.assunto);x.y=(x.d||'').slice(0,7);x._apr=apreciacao(r);x._ramo=ramoDe(r.ramoDireito);x._rd=r.ramoDireito||'';x._ass=r.assunto||null;
      x._res=SENT[r.sentidoResultado]||(x.r?classRes(x.r):'Sem classificação');
      x._q=nz([x.n,x.c,x.cl,x.o,x.e,x.r,x.temas,x._ass,x.mat,x.tc,x.tags.join(' '),x.esp,x.tese,x.proc?(x.proc.pt||[]).concat(x.proc.ac||[]).map(function(z){return z[1];}).join(' '):''].join(' '));if(x.c&&x.cl)E.clsNome[x.c]=x.cl;return x;});
    d.sort(function(a,b){return (b.d||'').localeCompare(a.d||'');});
    E.idx=d;E.carregando=false;if(EM.sub==='prec')render();
    serie(d);
  }).catch(function(e){E.carregando=false;$('#e-out').innerHTML='<p class="empty">Não foi possível abrir a base do gabinete ('+esc(e.message)+').</p>';});
}
function passa(x,excl){
  if(E.plist&&!E.plist.set[x.n]&&!E.plist.set[repCnj(x.n)])return false;
  for(var k in E.F){if(k===excl||!E.F[k])continue;if(DIM[k].v(x)!==E.F[k])return false;}
  if(excl!=='y'){if(E.y1&&x.y<E.y1)return false;if(E.y2&&x.y>E.y2)return false;}
  if(excl==='__q')return true;
  if(E.ft){if(!E.ft.hits[x.id]&&!(x.sid&&E.ft.hits[x.sid]))return false;}
  else if(E.qp&&!casa(E.qp,x._q))return false;
  return true;
}
function filtrados(){
  var L=E.idx.filter(function(x){return passa(x);});
  if(E.ord==='rel'&&(E.ft||E.qp)){L.forEach(function(x){x._sc=E.ft?((E.ft.hits[x.id]||E.ft.hits[x.sid]||{}).n||0):conta1(E.qp,x._q);});L.sort(function(a,b){return b._sc-a._sc||(b.d||'').localeCompare(a.d||'');});}
  return L;
}
/* contexto das visualizações (precedentes, modelos-matriz ou parágrafos-padrão) */
var CX=null,CXP0=null;
function CXC(){return CX||CXP0;}
function conta(L,dim){var m={};L.forEach(function(x){var v=CXC().DIM[dim].v(x);m[v]=(m[v]||0)+1;});return Object.keys(m).map(function(k){return [k,m[k]];}).sort(function(a,b){return b[1]-a[1]||a[0].localeCompare(b[0]);});}
function top(L,dim,n){var c=conta(L,dim);if(c.length<=n)return c;var r=c.slice(0,n),o=0;c.slice(n).forEach(function(z){o+=z[1];});r.push(['__outros',o,c.length-n]);return r;}
function rot(k,extra){return k==='__outros'?'Outros ('+extra+')':k;}
var CORRES={};function corRes(v){if(!(v in CORRES)){var ord=['Desprovido','Provido','Parcialmente provido','Embargos rejeitados','Embargos acolhidos','Não conhecido','Prejudicado ou extinto','Seguimento negado','Extinção','Outro'];var i=ord.indexOf(v);CORRES[v]=i>=0?PAL[i]:PAL[9];}return CORRES[v];}

function render(){
  if(!E.idx||EM.sub!=='prec')return;
  CX=null;if(!CXP0)CXP0={DIM:DIM,DIMS:DIMS,dm:E.dm,st:E,nome:'precedentes',ass:'ass',aplica:aplicaSel};
  var L=filtrados();
  renderAside();
  $('#e-cnt').innerHTML='<b>'+n0(L.length)+'</b> de '+n0(E.idx.length)+' julgados'+(E.ft?' · '+(E.ft.busy?'lendo '+esc(E.ft.atual||'')+' ('+E.ft.lidos+' de '+E.ft.total+')…':'texto integral: '+E.ft.total+' arquivo(s) anuais'):'');
  qBar();
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
function selDim(k,i,v,lab){return '<label>'+lab+' <select data-d="'+k+'" data-i="'+i+'">'+CXC().DIMS.filter(function(d){return k!=='tempo'||d!=='y';}).map(function(d){return '<option value="'+d+'"'+(d===v?' selected':'')+'>'+CXC().DIM[d].n+'</option>';}).join('')+'</select></label>';}
function dimsCtl(){
  var C=CXC(),k=C.st.modo,h='';
  if(k==='mapa')h=selDim(k,0,C.dm.mapa[0],'Níveis')+selDim(k,1,C.dm.mapa[1],'›')+selDim(k,2,C.dm.mapa[2],'›');
  else if(k==='fluxo')h=selDim(k,0,E.dm.fluxo[0],'Colunas')+selDim(k,1,E.dm.fluxo[1],'→')+selDim(k,2,E.dm.fluxo[2],'→');
  else if(k==='matriz')h=selDim(k,0,C.dm.matriz[0],'Linhas')+selDim(k,1,C.dm.matriz[1],'Colunas');
  else if(k==='tempo')h=selDim(k,0,C.dm.tempo,'Cor por');
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
  if(anos.indexOf(Y4)<0){anos.push(Y4);anos.sort();}
  var opt=function(v){return '<option value="">—</option>'+anos.map(function(y){return '<option value="'+y+'"'+(y===v?' selected':'')+'>'+mesL(y)+'</option>';}).join('');};
  a+='<div class="lab">Período</div><div class="e-yr"><select id="e-y1" aria-label="Ano inicial">'+opt(E.y1)+'</select> a <select id="e-y2" aria-label="Ano final">'+opt(E.y2)+'</select></div>';
  var base=function(d){return E.idx.filter(function(x){return passa(x,d);});};
  if(DIM.rl)a+=facet('rl','Relator',base('rl'),8);
  a+=facet('apr','Apreciação',base('apr'),6)+facet('ramo','Ramo',base('ramo'),8)+facet('mat','Matéria',base('mat'),8)+facet('ass','Assunto',base('ass'),8)+facet('tc','Tipo de caso',base('tc'),8)+facet('res','Resultado',base('res'),8)+facet('o','Órgão julgador',base('o'),6)+facet('c','Classe',base('c'),8);
  if(window.EMENT_NOTA)a+='<div class="note">'+window.EMENT_NOTA+' ('+(SER.ok?n0(SER.n)+' registros':'carregando')+').</div>';else
  a+='<div class="note">Julgamentos do Relator: os curados do gabinete (procs-muta · precedentes, com ramo, assunto e resultado catalogados) e a série histórica da Base de Jurisprudência do TRF-3 ('+(SER.ok?n0(SER.n)+' registros, 1999-2026':'carregando')+'), sem curadoria: ramo, assunto e resultado vêm da ementa, por classificação automática. Inteiro teor disponível para '+n0(E.idx.filter(function(x){return x.it;}).length)+' julgamentos.</div>';
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
  if(E.plist)h.push('<span class="e-chip"><small>'+esc(E.plist.pre||'Citam')+'</small> '+esc(E.plist.lab)+'<button data-x="__p" aria-label="Remover filtro">×</button></span>');
  if(E.q&&(E.qp||E.ft))h.push('<span class="e-chip"><small>'+(E.ft?'Texto integral':'Busca')+'</small> '+esc(E.ft?E.ft.q:E.q)+'<button data-x="__q" aria-label="Remover busca">×</button></span>');
  if(h.length>1)h.push('<button class="e-clr" id="e-clr">Limpar todos</button>');
  $('#e-chips').innerHTML=h.join('');
  $$('#e-chips [data-x]').forEach(function(b){b.onclick=function(){var d=b.getAttribute('data-x');if(d==='__p'){E.plist=null;}else if(d==='__y'){E.y1=E.y2='';}else if(d==='__q'){E.q='';E.qn=null;E.qp=null;E.ft=null;FT.tok++;$('#e-q').value='';}else E.F[d]='';E.sel=null;E.mmOpen=null;E.shown=60;render();};});
  var c=$('#e-clr');if(c)c.onclick=function(){E.plist=null;E.F={};E.y1=E.y2='';E.q='';E.qn=null;E.qp=null;E.ft=null;FT.tok++;$('#e-q').value='';E.sel=null;E.mmOpen=null;render();};
}
/* seleção feita nas visualizações: aplicar como filtro ou ver a lista */
function selecionar(f,n){
  var ok=Object.keys(f).every(function(k){return f[k]!=='__outros';});
  CXC().st.sel={f:f,n:n,ok:ok};selBar();itensRecorte();
  $$('.e-viz .on').forEach(function(e){e.classList.remove('on');});
}
function selBar(){
  var C=CXC(),s=C.st.sel,el=$('#e-sel');
  if(!s||C.st.modo==='lista'){el.innerHTML='';return;}
  var d=Object.keys(s.f).map(function(k){return '<b>'+(k==='y'&&anoSel(s.f[k])?'Ano':C.DIM[k].n)+':</b> '+esc(k==='y'?mesL(s.f[k]):rot(s.f[k],'vários'));}).join(' › ');
  el.innerHTML='<div class="e-selb"><span>'+d+' · '+n0(s.n)+' '+C.nome+'</span><span class="sp"></span>'+(s.ok?'<button class="btn gold" id="e-sap">Filtrar</button><button class="btn" id="e-svl">Ver na lista</button>':'<span class="meta">“Outros” reúne vários valores: escolha um grupo nomeado.</span>')+'<button class="btn" id="e-sx">×</button></div>';
  if(s.ok){$('#e-sap').onclick=function(){CX=C===CXP0?null:C;C.aplica(false);};$('#e-svl').onclick=function(){CX=C===CXP0?null:C;C.aplica(true);};}
  $('#e-sx').onclick=function(){CX=C===CXP0?null:C;C.st.sel=null;selBar();itensRecorte();$$('.e-viz .on').forEach(function(e){e.classList.remove('on');});};
}
function aplicaSel(lista){var f=E.sel.f;Object.keys(f).forEach(function(k){if(k==='y'&&anoSel(f[k])){var mz=E.idx.map(function(x){return x.y;}).filter(function(y){return y&&y.slice(0,4)===f[k];}).sort();E.y1=mz[0]||f[k]+'-01';E.y2=mz[mz.length-1]||f[k]+'-12';}else if(k==='y'){E.y1=E.y2=f[k];}else E.F[k]=f[k];});E.sel=null;E.mmOpen=null;E.shown=60;if(lista)E.modo='lista';salvar();render();window.scrollTo(0,0);}

/* ---- Lista (linhas compactas, como a pesquisa de jurisprudência) e painel lateral ---- */
var ICO={chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',cit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6"/></svg>',doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>'};
var APRS={'Julgamento do recurso':'','Embargos de declaração':'ED','Agravo interno':'AgInt','Juízo de retratação':'Retratação'};
function linha(x){
  var op=!!E.open[x.id],sel=E.det===x.id,tit=x._ass||titulo(x)||'(sem assunto)';
  var h='<li class="e-proc'+(sel?' sel':'')+(op?' open':'')+'" data-id="'+x.id+'"><div class="e-crow" data-act="abrir">';
  h+='<div class="e-c0"><button class="e-chev" data-act="tg" aria-expanded="'+op+'" aria-label="'+(op?'Recolher':'Expandir')+'">'+ICO.chev+'</button><span class="e-tag '+x.t+'" title="'+(x.t==='A'?'Acórdão':'Decisão monocrática')+'">'+x.t+'</span></div>';
  h+='<div class="e-c1"><span class="e-num">'+esc(x.n)+'</span><span class="e-sub" title="'+esc(x.cl||'')+'">'+esc(x.c||'')+' · '+esc(x.cl||'')+'</span></div>';
  h+='<div class="e-c2"><span class="e-ass" title="'+esc(tit+(x.tc?' › '+x.tc:''))+'">'+esc(tit)+(tcResto(x)?'<span class="e-subl"> › '+esc(tcResto(x))+'</span>':'')+'</span><div class="e-ctags">'+(APRS[x._apr]?'<span class="e-ct apr" title="'+esc(x._apr)+'">'+esc(APRS[x._apr])+'</span>':'')+(x.rl?'<span class="e-ct org" title="Relator: '+esc(x.rl)+'">'+esc(x.rl.replace(/^(DES(EMBARGADOR[A]?)?\.? ?FED(ERAL)?\.?|JUIZ[A]? FEDERAL CONVOCAD[OA]|JU[IÍ]ZA? CONV\.?)\s*/i,'').split(/\s+/).slice(-2).join(' '))+'</span>':'')+'<span class="e-ct org" title="'+esc(x.o||'Órgão não informado')+'">'+esc(siglaO(x.o))+'</span>'+(x._ramo?'<span class="e-ct ramo">'+esc(x._ramo)+'</span>':'')+'<span class="e-ct res" style="--rc:'+corRes(x._res)+'" title="'+esc(x.r||x._res)+'">'+esc(x._res)+'</span>'+(x.it?'<span class="e-ct dash" title="Inteiro teor na base">inteiro teor</span>':'')+'</div></div>';
  var sn=trechoLinha(x);
  h+='<div class="e-c3"><span class="e-dt" title="Julgado em">'+fmtD(x.d)+'</span><button class="e-ib" data-act="cit" title="Copiar citação" aria-label="Copiar citação">'+ICO.cit+'</button><button class="e-ib" data-act="abrir" title="Abrir" aria-label="Abrir">'+ICO.doc+'</button></div></div>';
  if(sn)h+='<div class="e-snip">'+sn+'</div>';
  if(op){
    h+='<div class="e-cbody"><div class="e-pnl"><div class="e-lb">Ementa</div><div class="e-tx">'+refs(prev(x).length>900?prev(x).slice(0,900)+'…':prev(x))+'</div>'+(x.r?'<div class="e-note"><b>Resultado:</b> '+esc(x.r)+'</div>':'')+'</div>';
    h+='<div class="e-pnl"><div class="e-lb">Dados</div>'+[['Apreciação',x._apr],['Classe',x.cl],['Órgão',x.o||'não informado'],['Julgamento',fmtD(x.d)],['Publicação',x.p?fmtD(x.p):'—'],['Ramo',x._rd||x._ramo],['Assunto',x._ass],['Temas',x.temas]].filter(function(z){return z[1];}).map(function(z){return '<div class="e-pr"><span class="e-pl">'+z[0]+'</span><span class="e-pv">'+(z[0]==='Temas'?refs(z[1]):esc(z[1]))+'</span></div>';}).join('')+'</div>';
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
  return (x.c||'')+' '+x.n+', Rel. '+(x.rl?x.rl:'Des. Fed. CARLOS MUTA')+', [VALIDAR: veículo] '+fmtD(x.p||x.d)+': "'+String(x.e||'').replace(/\s*\n\s*/g,' ').trim()+'"';
}
function painel(html,ondeSplit){
  var d=$('#e-det');if(d&&d.parentNode.classList.contains('rot'))d=null;
  if(ondeSplit&&d&&largo()){d.hidden=false;d.parentNode.classList.add('on');d.innerHTML=html;d.scrollTop=0;return d;}
  var dr=$('#e-dr'),b=$('#e-drb');dr.hidden=false;b.innerHTML=html;b.scrollTop=0;return b;
}
function ppValor(k,v){if(k==='Valor da causa'&&/^\d+(\.\d+)?$/.test(v))return 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});if(k==='Distribuição')return v.replace(/\s+\d{2}:\d{2}(:\d{2})?$/,'').replace(/^(\d{4})-(\d{2})-(\d{2})$/,'$3/$2/$1');return v;}
function ppPartes(P){
  if(!P)return '';
  /* partes e advogados: do cabeçalho do inteiro teor (PJe), quando houver; senão, do acervo */
  var pt=(P.pt||[]).filter(function(z){return !/^RELATOR$/i.test(z[0]);}),ac=P.ac||[],h='';
  var linhas=[];
  if(pt.length){var g={},ord=[];pt.forEach(function(z){var k=z[0].replace(/^ADVOGADO do\(a\)\s*/i,'');var adv=/^ADVOGADO|^PROCURADOR|^CURADOR|^REPRESENTANTE/i.test(z[0]);var chave=adv?k:z[0];if(!g[chave]){g[chave]={p:[],a:[]};ord.push(chave);}(adv?g[chave].a:g[chave].p).push(z[1]);});
    ord.forEach(function(k){var o=g[k];if(!o.p.length&&!o.a.length)return;linhas.push('<div class="pp-pt"><span class="r">'+esc(k.charAt(0)+k.slice(1).toLowerCase())+'</span><span class="v">'+o.p.map(esc).join('<br>')+(o.a.length?'<small>'+o.a.map(function(a){return 'Adv. '+esc(a);}).join('<br>')+'</small>':'')+'</span></div>');});}
  else{var M={};ac.forEach(function(z){M[z[0]]=z[1];});
    if(M['Polo ativo']||M['Advogado do polo ativo'])linhas.push('<div class="pp-pt"><span class="r">Polo ativo</span><span class="v">'+esc(M['Polo ativo']||'não exibido')+(M['Advogado do polo ativo']?'<small>Adv. '+esc(M['Advogado do polo ativo'])+'</small>':'')+'</span></div>');
    if(M['Polo passivo']||M['Advogado do polo passivo'])linhas.push('<div class="pp-pt"><span class="r">Polo passivo</span><span class="v">'+esc(M['Polo passivo']||'não exibido')+(M['Advogado do polo passivo']?'<small>Adv. '+esc(M['Advogado do polo passivo'])+'</small>':'')+'</span></div>');}
  var info=ac.filter(function(z){return !/^(Polo|Advogado)/.test(z[0])&&z[0]!=='Etiquetas';});
  var et=ac.filter(function(z){return z[0]==='Etiquetas';})[0];
  if(!linhas.length&&!info.length&&!et)return '';
  h+='<div class="pp-k" style="margin-top:14px">Partes e processo</div><div class="pp-proc">'+linhas.join('')+(info.length?'<div class="pp-pg">'+info.map(function(z){return '<div><span>'+esc(z[0])+'</span>'+esc(ppValor(z[0],z[1]))+'</div>';}).join('')+'</div>':'')+(et?'<div class="pp-et"><span>Etiquetas do PJe</span>'+String(et[1]).split(/\s*,\s*/).filter(Boolean).map(function(t){return '<i>'+esc(t)+'</i>';}).join('')+'</div>':'')+'</div>';
  return h;
}
function abrirIT(x){
  if(!x)return;E.det=x.id;
  $$('#e-out li.e-proc.sel').forEach(function(l){l.classList.remove('sel');});var li=$('#e-out li.e-proc[data-id="'+x.id+'"]');if(li)li.classList.add('sel');
  var it=(BASE&&BASE.it&&BASE.it[x.id])||x._it;
  if(!it&&x.sid&&!x._itBusca){x._itBusca=1;textoSerie(x).then(function(){if(E.det===x.id)abrirIT(x);}).catch(function(){});}
  var ct=citados([x.temas,x.tese,x.e,x.r,x.jur,x.disp,it].join('\n'));
  var ass=x._ass||titulo(x)||'(sem assunto)';
  /* 1. cabeçalho: identificação, área › assunto › tipo de caso, resultado e datas */
  var h='<div class="e-dhead pp"><div class="e-dtit"><span class="e-tag '+x.t+'">'+(x.t==='A'?'Acórdão':'Decisão monocrática')+'</span><span class="e-num big">'+esc(x.n)+'</span><button class="e-dx" data-dx title="Fechar (Esc)" aria-label="Fechar">×</button></div>';
  h+='<div class="pp-path">'+esc(x._rd||x._ramo||'Área não informada')+'</div><h2 class="pp-ass">'+esc(ass)+(tcResto(x)?'<span class="pp-sub"> › '+esc(tcResto(x))+'</span>':'')+'</h2>'+(x.tc?'<p class="pp-tc" title="Matéria · tipo · aspecto distintivo — o mesmo padrão dos processos; a matéria liga o precedente ao processo">Tipo de caso: <b>'+esc(x.tc)+'</b>'+(x.tcS?' <small title="Sugerido pelo agrupamento automático; conferir na curadoria">sugerido</small>':'')+'</p>':'');
  h+='<div class="pp-chips"><span class="pp-res" style="--rc:'+corRes(x._res)+'">'+esc(x._res)+'</span>'+(x._apr?'<span>'+esc(x._apr)+'</span>':'')+'<span title="'+esc(x.cl||'')+'">'+esc(x.c||x.cl||'')+'</span><span title="'+esc(x.o||'')+'">'+esc(siglaO(x.o))+'</span>'+(it?'<span class="ok">inteiro teor</span>':'')+'</div>';
  h+='<div class="pp-dt">Julgado em <b>'+fmtD(x.d)+'</b>'+(x.p?' · publicado em <b>'+fmtD(x.p)+'</b>':'')+' · Rel. '+esc(x.rl||'CARLOS MUTA')+(x.cl?' · '+esc(x.cl):'')+'</div>';
  h+='<div class="e-dacts"><button class="e-mini pri" data-dcit>'+ICO.cit+'Copiar citação</button><button class="e-mini" data-dem>Copiar ementa</button>'+(it?'<button class="e-mini" data-dit>Copiar inteiro teor</button>':'')+'<button class="e-mini" data-ddocx>.docx</button><button class="e-mini" data-dpdf>PDF</button></div></div>';
  h+='<div class="e-dbody pp-b">';
  /* 2. tese e resultado */
  if(x.tese||x.r)h+='<div class="pp-top">'+(x.tese?'<div class="pp-card"><div class="pp-k">Tese</div><div>'+refs(x.tese)+'</div></div>':'')+(x.r?'<div class="pp-card res" style="--rc:'+corRes(x._res)+'"><div class="pp-k">Resultado</div><div>'+refs(x.r)+'</div></div>':'')+'</div>';
  /* 3. partes, advogados e dados do processo */
  h+=ppPartes(x.proc);
  /* 4. ementa */
  var em=String(x.e||'');
  h+='<div class="pp-k" style="margin-top:14px">Ementa</div><div class="e-box serif pp-em'+(em.length>1200?' cut':'')+'">'+refs(em)+'</div>'+(em.length>1200?'<button class="pp-more" data-ppm>Ver ementa inteira</button>':'');
  /* 5. especificidades */
  if(x.tags.length||x.esp)h+='<div class="pp-k" style="margin-top:14px">Especificidades</div>'+(x.tags.length?'<div class="e-chipl pp-tags">'+x.tags.map(function(t){return '<span>'+esc(t)+'</span>';}).join('')+'</div>':'')+(x.esp?'<div class="e-box" style="margin-top:6px">'+refs(x.esp)+'</div>':'');
  /* 6. cita: enunciados e normas, dispositivos e jurisprudência citados */
  if(ct.enun.length||ct.norm.length||x.disp||x.jur){h+='<div class="pp-k" style="margin-top:14px">Cita</div>';
    if(ct.enun.length||ct.norm.length)h+='<div class="e-chipl pp-cita">'+ct.enun.map(function(t){return '<span class="en">'+refs(t)+'</span>';}).join('')+ct.norm.map(function(t){return '<span class="no">'+refs(t)+'</span>';}).join('')+'</div>';
    if(x.disp)h+='<div class="pp-ci"><span>Dispositivos citados</span>'+refs(x.disp)+'</div>';
    if(x.jur)h+='<div class="pp-ci"><span>Jurisprudência citada</span>'+refs(x.jur)+'</div>';}
  h+=repLinksDoProcesso(x.n||x.proc);
  /* 7. correspondentes */
  var TG={};x.tags.forEach(function(t){TG[nz(t)]=1;});
  var CR=E.idx.filter(function(z){return z.id!==x.id;}).map(function(z){var c=z.tags.filter(function(t){return TG[nz(t)];});var sc=(tcIgual(x,z)?3:0)+c.length+(z._ass&&z._ass===x._ass?1:0);return {z:z,c:c,sc:sc};}).filter(function(o){return o.sc>=3;}).sort(function(a,b){return b.sc-a.sc||String(b.z.d).localeCompare(String(a.z.d));});
  if(CR.length)h+='<div class="pp-k" style="margin-top:16px">Correspondentes <small>'+CR.length+' com o mesmo tipo de caso ou especificidades em comum</small></div><ul class="pp-rel cr">'+CR.slice(0,6).map(function(o){var z=o.z;return '<li data-pprel="'+z.id+'"><div class="l1"><span class="e-tag '+z.t+'">'+z.t+'</span><b>'+esc(z.n)+'</b><span class="meta">'+fmtD(z.d)+'</span><span class="pp-res sm" style="--rc:'+corRes(z._res)+'">'+esc(z._res)+'</span></div><div class="l2">'+(tcIgual(x,z)?'<span class="eq">'+esc(tcResto(z))+'</span>':'')+o.c.slice(0,4).map(function(t){return '<span>'+esc(t)+'</span>';}).join('')+'</div></li>';}).join('')+'</ul>';
  /* 8. inteiro teor e observações, recolhíveis */
  if(!it&&x.sid&&!x._itFalhou)h+='<p class="meta" style="margin-top:14px">Carregando o texto integral da série histórica…</p>';
  if(it)h+='<details class="pp-d"'+(x.serie?' open':'')+'><summary>Inteiro teor <small>'+n0(it.length)+' caracteres</small></summary><div class="e-texto">'+refs(it)+'</div></details>';
  if(x.obs)h+='<details class="pp-d"><summary>Observações do registro</summary><div class="e-box">'+esc(x.obs)+'</div></details>';
  /* 9. mesmo assunto no gabinete */
  var MS=E.idx.filter(function(z){return z._ass&&z._ass===x._ass;}),outros=MS.filter(function(z){return z.id!==x.id;}).sort(function(a,b){return String(b.d).localeCompare(String(a.d));});
  if(MS.length>1){var cr={};MS.forEach(function(z){cr[z._res]=(cr[z._res]||0)+1;});var ord=Object.keys(cr).sort(function(a,b){return cr[b]-cr[a];});
    h+='<div class="pp-k" style="margin-top:18px">Mesmo assunto no gabinete <small>'+MS.length+' julgados</small></div><div class="pp-bar">'+ord.map(function(k){return '<i style="width:'+(100*cr[k]/MS.length)+'%;background:'+corRes(k)+'" title="'+esc(k)+': '+cr[k]+'"></i>';}).join('')+'</div><div class="pp-leg">'+ord.slice(0,4).map(function(k){return '<span><i style="background:'+corRes(k)+'"></i>'+esc(k)+' '+Math.round(100*cr[k]/MS.length)+'%</span>';}).join('')+'</div>';
    h+='<ul class="pp-rel">'+outros.slice(0,5).map(function(z){return '<li data-pprel="'+z.id+'"><span class="e-tag '+z.t+'">'+z.t+'</span><b>'+esc(z.n)+'</b><span class="meta">'+fmtD(z.d)+'</span><span class="pp-res sm" style="--rc:'+corRes(z._res)+'">'+esc(z._res)+'</span></li>';}).join('')+'</ul>'+(outros.length>5?'<button class="pp-more" data-ppall>Ver os '+MS.length+' julgados do assunto</button>':'');}
  /* 10. rastreabilidade */
  var R=x.rast||{};
  if(x.serie)R=window.EMENT_FONTE?{arq:'precedentes/collegium/'+(x.t==='A'?'acordaos':'monocraticas')+'/'+x.ano+'.json.gz',ln:'—',cur:'sem curadoria (Diário de Justiça Eletrônico Nacional · CNJ)'}:{arq:'precedentes/jurisprudencia/'+(x.t==='A'?'acordaos':'monocraticas')+'/'+x.ano+'.json.gz',ln:'—',cur:'série histórica sem curadoria (Base de Jurisprudência do TRF-3)'};
  h+='<div class="pp-rast"><div class="pp-k">Rastreabilidade</div><code>'+(R.it?'SHA-256 do inteiro teor: '+esc(R.it.sha)+'<br>Inteiro teor: '+esc(R.it.arq)+' · linha '+R.it.ln+'<br>':'')+'Registro: '+esc(R.arq||'precedentes/precedentes.jsonl')+' · linha '+(R.ln||'—')+' · id '+esc(x.id)+(R.idAnt?'<br>Id anterior: '+esc(R.idAnt):'')+'<br>Curadoria: '+esc(R.cur||'—')+'</code>'+(R.fonte?'<p>'+esc(R.fonte)+'</p>':'')+(R.origens&&R.origens.length?'<p>Origens: '+R.origens.map(esc).join(' · ')+'</p>':'')+'<p>A versão oficial é o documento assinado no PJe e a publicação no diário. A citação traz [VALIDAR: veículo], porque a base não registra o veículo de publicação.</p></div></div>';
  var box=painel(h,true);
  box.querySelector('[data-dx]').onclick=function(){fecharIT();};
  box.querySelector('[data-dcit]').onclick=function(){copiar(citacao(x),'Citação copiada; confira o veículo de publicação');};
  box.querySelector('[data-dem]').onclick=function(){copiar(x.e,'Ementa copiada');};
  var bi=box.querySelector('[data-dit]');if(bi)bi.onclick=function(){copiar(it,'Inteiro teor copiado');};
  var tit=(x.c||'')+' '+x.n+' · '+(x.t==='A'?'Acórdão':'Decisão monocrática')+' · '+fmtD(x.d);
  box.querySelector('[data-ddocx]').onclick=function(){baixarDocx(rcPrecedente(x),true,tit,(x.c||'')+'_'+x.n);};
  box.querySelector('[data-dpdf]').onclick=function(){baixarPdf(rcPrecedente(x),true,tit,(x.c||'')+'_'+x.n);};
  var bm=box.querySelector('[data-ppm]');if(bm)bm.onclick=function(){box.querySelector('.pp-em').classList.remove('cut');bm.remove();};
  $$('[data-pprel]',box).forEach(function(l){l.onclick=function(){var z=porId(l.getAttribute('data-pprel'));if(z)abrirIT(z);};});
  var ba=box.querySelector('[data-ppall]');if(ba)ba.onclick=function(){setF('ass',x._ass);};
}
function fecharIT(){$('#e-dr').hidden=true;var d=$('#e-det');if(d&&!d.hidden){d.hidden=true;d.innerHTML='';d.parentNode.classList.remove('on');}E.det=null;$$('#e-out li.e-proc.sel').forEach(function(l){l.classList.remove('sel');});}
$('#e-dr').addEventListener('click',function(e){if(e.target.id==='e-dr')fecharIT();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&(!$('#e-dr').hidden||($('#e-det')&&!$('#e-det').hidden)))fecharIT();});
$('#e-out').addEventListener('click',function(e){
  if(e.target.closest('.ref.go'))return;
  var b=e.target.closest('[data-act]');if(!b)return;var c=b.closest('[data-id]');if(!c)return;var x=porId(c.getAttribute('data-id'));if(!x)return;
  var a=b.getAttribute('data-act');
  e.stopPropagation();
  if(a==='tg'){if(E.open[x.id])delete E.open[x.id];else E.open[x.id]=1;c.outerHTML=linha(x);}
  else if(a==='cit')copiar(citacao(x),'Citação copiada; confira o veículo de publicação');
  else if(a==='abrir'){if(E.det===x.id&&largo()&&!$('#e-det').hidden){fecharIT();return;}abrirIT(x);}
});
var qT;$('#e-q').addEventListener('input',function(e){clearTimeout(qT);qT=setTimeout(function(){if(EM.sub!=='prec'){EM.q[EM.sub]=e.target.value.trim();(EM.sub==='mod'?mRender:pRender)();return;}E.q=e.target.value.trim();if(E.qm==='ft'){if(!E.q){E.ft=null;FT.tok++;render();}return;}E.ft=null;E.qp=parseQ(E.q);E.shown=60;E.sel=null;E.mmOpen=null;render();},220);});
$('#e-q').addEventListener('keydown',function(e){if(e.key!=='Enter'||EM.sub!=='prec')return;e.preventDefault();clearTimeout(qT);E.q=e.target.value.trim();buscar();});
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
function vMapa(L,out){var C=CXC();
  var D=C.dm.mapa,lim=[8,6,5];
  function grupo(lst,nivel,path){
    return top(lst,D[nivel],lim[nivel]).map(function(z){
      var key=path.concat([z[0]]).join('\u0001'),sub=z[0]==='__outros'?[]:lst.filter(function(x){return C.DIM[D[nivel]].v(x)===z[0];});
      return {k:z[0],n:z[1],x:z[2],key:key,niv:nivel,path:path.concat([z[0]]),lst:sub};
    });
  }
  if(!C.st.mmOpen){C.st.mmOpen={};var g=grupo(L,0,[]);if(g[0]&&g[0].k!=='__outros'){C.st.mmOpen[g[0].key]=1;var g2=grupo(g[0].lst,1,g[0].path);if(g2[0]&&g2[0].k!=='__outros')C.st.mmOpen[g2[0].key]=1;}}
  var rows=[],RH=26,COL=250,X0=150;
  function lay(lst,nivel,path){
    var ns=grupo(lst,nivel,path),ys=[];
    ns.forEach(function(nd){
      if(nivel<2&&C.st.mmOpen[nd.key]&&nd.lst.length){nd.ch=lay(nd.lst,nivel+1,nd.path);nd.y=(nd.ch[0].y+nd.ch[nd.ch.length-1].y)/2;}
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
  s='<g><rect x="6" y="'+(ry-20)+'" width="'+(X0-12)+'" height="40" rx="10" fill="var(--gold-soft)" stroke="var(--gold)"/><text x="'+(X0/2)+'" y="'+(ry-3)+'" text-anchor="middle" style="font-weight:800;fill:var(--gold)">'+n0(L.length)+'</text><text x="'+(X0/2)+'" y="'+(ry+12)+'" text-anchor="middle" class="mutt">'+esc(C.nome)+'</text></g>'+s;
  var head=D.map(function(d,i){return '<text x="'+(X0+i*COL+40)+'" y="12" class="mutt" style="font-weight:800;letter-spacing:.08em">'+C.DIM[d].n.toUpperCase()+'</text>';}).join('');
  var IC=itCfg(C);
  out.innerHTML='<p class="e-help">Clique em um ramo para abrir ou fechar os galhos; o galho selecionado pode virar filtro. Ao lado, os assuntos e '+(IC?IC.rot.toLowerCase():'os itens')+' do recorte.</p><div class="e-mm'+(IC?' com-itl':'')+'"><div class="e-viz">'+svgEl(W,H+10,head+s)+'</div>'+(C.ass?'<aside class="e-asl">'+painelAssuntos(L)+'</aside>':'')+(IC?'<aside class="e-itl" aria-label="'+esc(IC.rot)+' do recorte"></aside>':'')+'</div>';
  out.__L=L;out.__C=C;itensRecorte();
  $$('.e-asl [data-av]',out).forEach(function(b){b.addEventListener('click',function(){CX=C===CXP0?null:C;selecionar({ass:b.getAttribute('data-av')},+b.getAttribute('data-n'));$$('.e-asl .on',out).forEach(function(x){x.classList.remove('on');});b.classList.add('on');});});
  var idx={};(function reg(ns){ns.forEach(function(nd){idx[nd.key]=nd;if(nd.ch)reg(nd.ch);});})(raiz);
  $$('.e-viz .nd',out).forEach(function(g){
    function act(){CX=C===CXP0?null:C;var nd=idx[g.getAttribute('data-key')];if(!nd)return;
      if(nd.niv<2&&nd.k!=='__outros'&&nd.lst.length){if(C.st.mmOpen[nd.key])delete C.st.mmOpen[nd.key];else C.st.mmOpen[nd.key]=1;}
      var f={};nd.path.forEach(function(v,i){f[D[i]]=v;});
      vMapa(L,out);selecionar(f,nd.n);var ng=out.querySelector('[data-key="'+CSS.escape(nd.key)+'"]');if(ng)ng.classList.add('on');}
    g.addEventListener('click',act);g.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();act();}});
  });
}
/* ---- Painel de itens do recorte (no mapa mental, ao lado dos assuntos): precedentes ou modelos do recorte; com um ramo ou assunto selecionado, só os dele ---- */
function itCfg(C){
  if(C&&C===CXP0)return {rot:'Precedentes',tit:function(x){return x._ass||titulo(x)||'(sem assunto)';},sub:function(x){return [x.n,fmtD(x.d),x._res].filter(Boolean).join(' · ');},
    abre:function(x){E.modo='lista';E.sel=null;E.mmOpen=null;salvar();render();setTimeout(function(){abrirIT(x);},0);}};
  if(typeof CXM!=='undefined'&&C===CXM)return {rot:'Modelos',tit:function(m){return m.nomeModelo||m.id;},sub:function(m){return [mJulg(m),m.resultado?classRes(m.resultado):''].filter(Boolean).join(' · ');},
    abre:function(m){MS.sel=m.id;MVZ.modo='lista';MVZ.sel=null;mRender();window.scrollTo(0,0);}};
  return null;}
function itensRecorte(){var out=$('#e-out'),pn=out&&out.querySelector('.e-itl');if(!pn||!out.__L)return;var C=out.__C,IC=itCfg(C);if(!IC)return;
  var s=C.st.sel,L=out.__L,V=s&&s.ok?L.filter(function(x){return Object.keys(s.f).every(function(k){return C.DIM[k]&&(k==='y'&&anoSel(s.f[k])?C.DIM.y.v(x).slice(0,4)===s.f[k]:C.DIM[k].v(x)===s.f[k]);});}):L,lim=pn.__lim||40;
  pn.__V=V;
  pn.innerHTML='<div class="lab">'+esc(IC.rot)+' do recorte <small>'+n0(V.length)+'</small></div>'+(s&&s.ok?'<p class="meta">Só os do item selecionado no mapa.</p>':'')+
    '<div class="e-itl-l">'+V.slice(0,lim).map(function(x,i){return '<button type="button" data-ii="'+i+'" title="Abrir"><b>'+esc(IC.tit(x))+'</b><small>'+esc(IC.sub(x))+'</small></button>';}).join('')+'</div>'+
    (V.length>lim?'<button type="button" class="e-itl-m">Mostrar mais ('+n0(V.length-lim)+')</button>':'');
  if(!pn.__liga){pn.__liga=1;pn.addEventListener('click',function(e){var b=e.target.closest('[data-ii],.e-itl-m');if(!b)return;
    if(b.classList.contains('e-itl-m')){pn.__lim=(pn.__lim||40)+40;itensRecorte();return;}
    var x=pn.__V&&pn.__V[+b.getAttribute('data-ii')];if(x){CX=C===CXP0?null:C;IC.abre(x);}});}}
/* ---- Painel lateral de assuntos (dentro do mapa mental) ---- */
function painelAssuntos(L){
  var t=conta(L,'ass').filter(function(z){return z[0]!=='Sem assunto catalogado';}),mx=t.length?t[0][1]:1;
  if(!t.length)return '<div class="lab">Assuntos</div><p class="meta">Sem assunto catalogado no recorte.</p>';
  return '<div class="lab">Assuntos do recorte <small>'+t.length+'</small></div><div class="e-asl-l">'+t.slice(0,40).map(function(z){var sub=L.filter(function(x){return CXC().DIM.ass.v(x)===z[0];}),c=conta(sub,'res');
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
/* ---- Linha do tempo: barras empilhadas por mês; por ano quando o período passa de 5 anos (Ementário) ---- */
function anoSel(v){return /^\d{4}$/.test(String(v||''));}
function vTempo(L,out){var C=CXC(),LT=L,d=C.dm.tempo;
  var ms=[];L.forEach(function(x){var y=C.DIM.y.v(x);if(/^\d{4}-\d{2}$/.test(y))ms.push(y);});
  if(!ms.length){out.innerHTML='<p class="empty">Sem datas para o recorte.</p>';return;}
  ms.sort();var c0=ms[0].split('-').map(Number),c1=ms[ms.length-1].split('-').map(Number),nm=(c1[0]-c0[0])*12+c1[1]-c0[1]+1;
  var longo=nm>60&&C.aplica===aplicaSel,A0=c0[0],A1=c1[0],tz=longo&&anoSel(C.st.tz)&&+C.st.tz>=A0&&+C.st.tz<=A1?C.st.tz:'';
  if(tz){L=L.filter(function(x){return String(C.DIM.y.v(x)).slice(0,4)===tz;});c0=[+tz,1];c1=[+tz,12];}
  var porAno=longo&&!tz,ch=function(y){return porAno?y.slice(0,4):y;};
  var t=top(L,d,7),keys=t.map(function(z){return z[0];}),kset={};keys.forEach(function(k){kset[k]=1;});
  var anos={};L.forEach(function(x){var y=C.DIM.y.v(x);if(!/^\d{4}-\d{2}$/.test(y))return;y=ch(y);var v=C.DIM[d].v(x);if(!kset[v])v='__outros';anos[y]=anos[y]||{_t:0};anos[y][v]=(anos[y][v]||0)+1;anos[y]._t++;});
  var lista=[];if(porAno){for(var a=c0[0];a<=c1[0];a++)lista.push(String(a));}
  else for(var yy=c0[0],mm=c0[1];yy<c1[0]||(yy===c1[0]&&mm<=c1[1]);){lista.push(yy+'-'+String(mm).padStart(2,'0'));if(++mm>12){mm=1;yy++;}}
  var n=lista.length,mx=0;Object.keys(anos).forEach(function(y){mx=Math.max(mx,anos[y]._t);});
  var Wc=Math.max(640,(out.clientWidth||1040)-28),W=Math.max(640,Math.min(Wc,n*(tz?64:40)+80)),H=320,PL=46,PB=28,bw=(W-PL-10)/n,s='';
  var rotX=function(Y){return porAno?Y:mesL(Y);},passo=Math.max(1,Math.ceil((porAno?36:46)/bw));
  function cor(k,i){return d==='res'?corRes(k):(k==='__outros'?PAL[9]:PAL[i%PAL.length]);}
  for(var g=0;g<=4;g++){var v=Math.round(mx*g/4),y=H-PB-(H-PB-14)*g/4;s+='<line x1="'+PL+'" x2="'+(W-6)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(PL-6)+'" y="'+(y+4)+'" text-anchor="end" class="mutt">'+n0(v)+'</text>';}
  lista.forEach(function(Y,ix){var o=anos[Y],x=PL+ix*bw+bw*.12,w=bw*.76,yb=H-PB;
    if(o)keys.forEach(function(k,i){var c=o[k];if(!c)return;var h=c/mx*(H-PB-14);yb-=h;s+='<rect class="bx" data-y="'+Y+'" data-v="'+esc(k)+'" data-n="'+c+'" x="'+x.toFixed(1)+'" y="'+yb.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(.5,h).toFixed(1)+'" fill="'+cor(k,i)+'"><title>'+rotX(Y)+' · '+esc(rot(k,t[i][2]))+': '+n0(c)+(o._t!==c?' (total '+n0(o._t)+')':'')+'</title></rect>';});
    if(ix%passo===0)s+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(H-PB+16)+'" text-anchor="middle" class="mutt'+(porAno?' e-tza':'')+'"'+(porAno?' data-tz="'+Y+'"><title>Ver os meses de '+Y+'</title>':'>')+rotX(Y)+'</text>';});
  var leg='<div class="e-leg">'+t.map(function(z,i){return '<span><i style="background:'+cor(z[0],i)+'"></i>'+esc(rot(z[0],z[2]))+' · '+n0(z[1])+'</span>';}).join('')+'</div>';
  var tit=porAno?'Julgamentos por ano. Clique no ano, abaixo das barras, ou dê dois cliques na barra para abrir os meses.':tz?'Julgamentos por mês em '+tz+'.':(C.tempoTit||'Julgamentos por mês.');
  var bt=function(v,tx,dis,lab){return '<button class="btn" data-tz="'+v+'"'+(dis?' disabled':'')+' aria-label="'+esc(lab||tx)+'">'+esc(tx)+'</button>';},nav='';
  if(tz)nav='<div class="e-tnav">'+bt('','‹ Todos os anos',false,'Voltar à visão por ano')+'<span class="sp"></span>'+bt(String(+tz-1),'‹ '+(+tz-1),+tz-1<A0,'Ano anterior')+'<b>'+tz+'</b>'+bt(String(+tz+1),(+tz+1)+' ›',+tz+1>A1,'Ano seguinte')+'</div>';
  else if(porAno)nav='<div class="e-tnav"><span class="meta">'+A0+'–'+A1+' · por ano</span><span class="sp"></span><label class="meta">Abrir o ano <select id="e-tzs" aria-label="Abrir os meses do ano"><option value="">—</option>'+lista.map(function(Y){return '<option value="'+Y+'">'+Y+(anos[Y]?' ('+n0(anos[Y]._t)+')':'')+'</option>';}).join('')+'</select></label></div>';
  out.innerHTML='<p class="e-help">'+esc(tit)+' Clique em um segmento para selecionar '+(porAno?'o ano':'o mês')+' e o grupo.</p>'+nav+'<div class="e-viz">'+svgEl(W,H,s)+leg+'</div>';
  var vai=function(v){C.st.tz=v;C.st.sel=null;selBar();vTempo(LT,out);var e=out.querySelector('.e-tnav');if(e)e.scrollIntoView({block:'nearest'});};
  $$('[data-tz]',out).forEach(function(b){b.addEventListener('click',function(){vai(b.getAttribute('data-tz'));});});
  var zs=$('#e-tzs',out);if(zs)zs.onchange=function(){if(zs.value)vai(zs.value);};
  if(porAno)$$('.bx',out).forEach(function(r){r.addEventListener('dblclick',function(){vai(r.getAttribute('data-y'));});});
  $$('.bx',out).forEach(function(r){r.addEventListener('click',function(){CX=C===CXP0?null:C;var f={y:r.getAttribute('data-y')};f[d]=r.getAttribute('data-v');selecionar(f,+r.getAttribute('data-n'));r.classList.add('on');});});
}
/* ---- Matriz ---- */
function vMatriz(L,out){
  var CC=CXC(),R=CC.dm.matriz[0],C=CC.dm.matriz[1];
  if(R===C){out.innerHTML='<p class="empty">Escolha dimensões diferentes para linhas e colunas.</p>';return;}
  var tr=top(L,R,15),tc=top(L,C,9),rk={},ck={};tr.forEach(function(z){rk[z[0]]=1;});tc.forEach(function(z){ck[z[0]]=1;});
  var m={},mx=0;L.forEach(function(x){var a=CC.DIM[R].v(x),b=CC.DIM[C].v(x);if(!rk[a])a='__outros';if(!ck[b])b='__outros';var k=a+'\u0001'+b;m[k]=(m[k]||0)+1;if(m[k]>mx)mx=m[k];});
  var h='<table class="e-mx"><thead><tr><th>'+esc(CC.DIM[R].n)+' \\ '+esc(CC.DIM[C].n)+'</th>'+tc.map(function(z){return '<th title="'+esc(rot(z[0],z[2]))+'">'+esc(trunc(rot(z[0],z[2]),22))+'</th>';}).join('')+'<th>Total</th></tr></thead><tbody>';
  tr.forEach(function(r){h+='<tr><th title="'+esc(rot(r[0],r[2]))+'">'+esc(trunc(rot(r[0],r[2]),40))+'</th>';tc.forEach(function(c){var v=m[r[0]+'\u0001'+c[0]]||0,al=v?(.12+.78*Math.sqrt(v/mx)):0;h+=v?'<td data-a="'+esc(r[0])+'" data-b="'+esc(c[0])+'" data-n="'+v+'" style="background:rgba(212,171,88,'+al.toFixed(2)+')'+(al>.6?';color:#1d1f22;font-weight:700':'')+'">'+n0(v)+'</td>':'<td class="z">·</td>';});h+='<td class="z"><b>'+n0(r[1])+'</b></td></tr>';});
  h+='</tbody></table>';
  out.innerHTML='<p class="e-help">Cruzamento de duas dimensões; a intensidade da cor acompanha a quantidade. Clique em uma célula para selecionar.</p><div class="e-viz">'+h+'</div>';
  $$('td[data-a]',out).forEach(function(td){td.addEventListener('click',function(){CX=CC===CXP0?null:CC;var f={};f[R]=td.getAttribute('data-a');f[C]=td.getAttribute('data-b');selecionar(f,+td.getAttribute('data-n'));td.classList.add('on');});});
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
var XS={sub:'estrutura',ed:'pecas',peca:'',grupo:'',vg:'palavras',q:''};
/* Editorial reúne Peças, Modelos, Parágrafos e Diretrizes; Modelos e Parágrafos usam o painel de busca do Ementário, que muda de seção */
var XDESC={pecas:'Molde-padrão de cada peça: a estrutura vem pronta, com versões, campos, regras e orientações; a fundamentação é do caso.',mod:'Modelos de acórdão, decisão e despacho, prontos para preencher com os dados do caso.',par:'Parágrafos-padrão por matéria e situação, com campos que se preenchem com o caso.',};
function layoutEm(v){var L=$('#e-layout'),S=$(v);if(!L||!S||L.parentNode===S)return;if(v==='#v-edit')S.insertBefore(L,$('#x-wrap'));else S.appendChild(L);}
function man(){var db=window.VDM_DB&&window.VDM_DB();return ((db&&db['Diretrizes'])||[]).filter(function(r){return r['Código'];});}
function manCap(c){return man().filter(function(r){return String(r['Capítulo']||'').indexOf(c)===0;});}
function manTxt(r){return [r['Título'],r['Orientação'],r['Evitar'],r['Observação'],r['Grupo']].join(' ');}
function manCard(r){var st=r['Status']&&!/^vigente$/i.test(r['Status']);return '<article class="card" style="--gc:var(--line)"><div class="hd"><span class="pill">'+esc(r['Grupo']||'')+'</span>'+(st?'<span class="pill" style="color:var(--warn);border-color:var(--warn)">'+esc(r['Status'])+'</span>':'')+'</div>'+(r['Título']?'<h3>'+esc(r['Título'])+'</h3>':'')+'<div class="fields">'+(r['Orientação']?'<div class="field good"><b>Preferir</b><p>'+refs(r['Orientação'])+'</p></div>':'')+(r['Evitar']?'<div class="field bad"><b>Evitar</b><p>'+refs(r['Evitar'])+'</p></div>':'')+(r['Observação']?'<div class="field"><b>Observação</b><p>'+refs(r['Observação'])+'</p></div>':'')+'</div></article>';}
var MANG={relatorio:'Relatório',voto:'Voto',ementa:'Ementa',monocratica:'Decisões e despachos'};
var FO={};
function foTag(){return '';}
function hit(txt){return !XS.q||nz(txt).indexOf(nz(XS.q))>=0;}
function regs(t){return ((ED&&ED.padrao&&ED.padrao.registros)||[]).filter(function(r){return r.tipo===t||(t==='preferencia'&&!r.tipo&&r.preferir);});}
function grp(r){return r.grupo||'Termos e grafias';}
function xRender(){
  if(!ED){$('#x-main').innerHTML='<p class="empty">Dados do editorial indisponíveis.</p>';return;}
  if(XS.ed==='dir'){XS.ed='pecas';var td=document.querySelector('.tab[data-v="dir"]');if(td){td.click();return;}}
  var ed=XS.ed||'pecas';$$('#x-sub button').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-s')===ed));});
  var xd=$('#x-desc');if(xd)xd.textContent=XDESC[ed]||'';
  if(ed==='mod'||ed==='par'){$('#x-wrap').hidden=true;layoutEm('#v-edit');EM.sub=ed;fecharIT();mostrar();return;}
  if($('#e-layout').parentNode===$('#v-edit'))layoutEm('#v-ement');
  XS.sub='estrutura';$('#x-wrap').hidden=false;
  if(window.VDM_marcaNav)window.VDM_marcaNav();
  if(XD.proc&&!XD.ac&&!XD.naoAchou&&!XD._busca){XD._busca=1;xBuscaProc();return;}
  xPagina();
}
$$('#x-sub button').forEach(function(b){b.addEventListener('click',function(){XS.ed=b.getAttribute('data-s');xRender();window.scrollTo(0,0);});});
/* ===== Diretrizes em formato de manual: sumário à esquerda, capítulos numerados, busca e impressão ===== */
var XM={q:''};
/* ===== Diretrizes · quadro de entradas rápidas (apoio/diretrizes-rapidas.json): registra na hora o que o Desembargador fixar, antes de ganhar lugar no manual ===== */
var RAP={vivo:null,tipo:'Padronização',txt:'',orig:'',filtro:'novas',grav:false};
var RAP_TIPOS=['Padronização','Diretriz','Comando','Atualização'];
function rapLista(){return (RAP.vivo||(ED&&ED.rapidas)||[]).slice().sort(function(a,b){return String(b.data||'').localeCompare(String(a.data||''))||String(b.id).localeCompare(String(a.id));});}
function rapPode(){return !!(window.CMT_SITE&&window.CMT_ACESSO&&window.CMT_ACESSO().editor);}
function rapJ(x){return JSON.stringify(x,function(k,v){return k.charAt(0)==='_'&&k!=='_topicos'&&k!=='_estrutura'?undefined:v;});}
function rapData(d){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(d||'');return m?m[3]+'/'+m[2]+'/'+m[1]:esc(d||'');}
function rapItem(r,pode,semInc){var inc=!semInc&&r.situacao==='incorporada';return '<li class="'+(inc?'inc':'')+'"><div class="rap-m"><span class="rap-t">'+esc(r.tipo||'Entrada')+'</span><span>'+rapData(r.data)+'</span>'+(r.autor?'<span>'+esc(r.autor)+'</span>':'')+(inc?'<span class="rap-ok">incorporada'+(r.destino?' em '+esc(r.destino):'')+'</span>':'')+'</div>'+
      '<p>'+xFm(r.texto||'')+'</p>'+(r.origem?'<p class="rap-o">Origem: '+esc(r.origem)+'</p>':'')+
      (pode?'<div class="rap-a">'+(semInc?'':inc?'<button class="e-mini" data-rapsit="'+esc(r.id)+'">Voltar para “a incorporar”</button>':'<button class="e-mini" data-rapinc="'+esc(r.id)+'">Marcar como incorporada</button>')+'<button class="e-mini" data-rapdel="'+esc(r.id)+'">Excluir</button></div>':'')+'</li>';}
function rapHtml(nq,duas){
  var L=rapLista(),nov=L.filter(function(r){return r.situacao!=='incorporada';}).length,pode=rapPode();
  var V=L.filter(function(r){return (RAP.filtro==='todas'||(RAP.filtro==='novas'?r.situacao!=='incorporada':r.situacao==='incorporada'))&&(!nq||nz([r.tipo,r.texto,r.origem,r.destino].join(' ')).indexOf(nq)>=0);});
  var h='<div class="rap-h"><div><h2>Entradas rápidas</h2><p>Diretrizes, comandos, atualizações e padronizações fixadas pelo Desembargador, registradas na hora; depois ganham lugar definitivo no manual, nos modelos ou nos parágrafos.</p></div>'+
    (duas?'':'<div class="rap-f" role="group" aria-label="Filtrar entradas">'+[['novas','A incorporar ('+nov+')'],['incorp','Incorporadas'],['todas','Todas']].map(function(x){return '<button data-rapf="'+x[0]+'" aria-pressed="'+(RAP.filtro===x[0])+'">'+x[1]+'</button>';}).join('')+'</div>')+'</div>';
  if(pode)h+='<div class="rap-novo"><select data-raptipo aria-label="Tipo da entrada">'+RAP_TIPOS.map(function(t){return '<option'+(t===RAP.tipo?' selected':'')+'>'+t+'</option>';}).join('')+'</select>'+
    '<textarea data-raptxt rows="2" placeholder="Nova entrada: o que foi fixado, em uma ou duas frases (Ctrl+Enter salva)" aria-label="Texto da entrada">'+esc(RAP.txt)+'</textarea>'+
    '<input data-raporig placeholder="Origem (opcional): processo, reunião, despacho…" value="'+esc(RAP.orig)+'" aria-label="Origem">'+
    '<button class="btn" data-rapadd'+(RAP.grav?' disabled':'')+'>'+(RAP.grav?'Gravando…':'Registrar')+'</button></div>';
  else h+='<p class="rap-ro">'+(window.CMT_SITE?'Leitura. Quem registra, incorpora e exclui entradas é o perfil Editor.':'Aberto como arquivo: o registro de entradas funciona no site do gabinete, para o perfil Editor.')+'</p>';
  /* duas=true (aba do editor): o registro à esquerda e a lista de entradas ao lado, sem a separação incorporar/incorporada */
  if(duas){nq=nq||nz(RAP.q||'');var T=L.filter(function(r){return !nq||nz([r.tipo,r.texto,r.origem,r.destino].join(' ')).indexOf(nq)>=0;});
    var bq='<div class="lp-tq rap-tq"><input type="search" id="rap-q" value="'+esc(RAP.q||'')+'" placeholder="Buscar nas entradas" aria-label="Buscar nas entradas">'+(T.length!==L.length?'<small>'+T.length+' de '+L.length+'</small>':'')+'</div>';
    var fm=pode?'<div class="rap-novo rap-fm">'+bq+'<p class="rap-fk">Nova entrada</p><div class="rap-l1"><select data-raptipo aria-label="Tipo da entrada">'+RAP_TIPOS.map(function(t){return '<option'+(t===RAP.tipo?' selected':'')+'>'+t+'</option>';}).join('')+'</select><button class="rap-reg" data-rapadd'+(RAP.grav?' disabled':'')+'>'+(RAP.grav?'Gravando…':'Registrar')+'</button></div>'+
      '<textarea data-raptxt rows="3" placeholder="O que foi fixado, em uma ou duas frases (Ctrl+Enter salva)" aria-label="Texto da entrada">'+esc(RAP.txt)+'</textarea>'+
      '<input data-raporig placeholder="Origem (opcional): processo, reunião, despacho…" value="'+esc(RAP.orig)+'" aria-label="Origem"></div>'
      :'<div class="rap-fm">'+bq+'<p class="rap-fk">Nova entrada</p><p class="rap-ro">'+(window.CMT_SITE?'Leitura. Quem registra e exclui entradas é o perfil Editor.':'Aberto como arquivo: o registro funciona no site do gabinete, para o perfil Editor.')+'</p></div>';
    var X='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    /* mesmo desenho das leituras de Parágrafos e Peças: cabeçalho com sobretítulo, título serifado e texto corrido */
    return '<div class="lp-ler rap-lp"><header class="lp-hd"><p class="mn-k">Compendium · editor do Desembargador</p><h1>Entradas rápidas</h1><p class="lp-sub" title="Diretrizes, comandos, atualizações e padronizações fixadas pelo Desembargador, registradas na hora.">Fixadas pelo Desembargador, registradas na hora.</p></header>'+
      '<div class="lp-grid rap-g">'+fm+'<div class="lp-doc"><h2>Entradas<small>'+T.length+'</small></h2>'+
      (T.length?T.map(function(r){return '<div class="lp-c mn-ed rap-e"><p class="lp-m">'+esc(r.tipo||'Entrada')+' · '+rapData(r.data)+(r.autor?' · '+esc(r.autor):'')+'</p><div class="lp-t"><p>'+xFm(r.texto||'')+'</p></div>'+(r.origem?'<p class="lp-u"><b>Origem</b>'+esc(r.origem)+'</p>':'')+
        (pode?'<button type="button" class="mn-pen rap-del" data-rapdel="'+esc(r.id)+'" title="Excluir a entrada" aria-label="Excluir a entrada">'+X+'</button>':'')+'</div>';}).join('')
       :'<p class="lp-sub">'+(L.length?'Nenhuma entrada com esta busca.':'Nenhuma entrada ainda.')+'</p>')+'</div></div></div>';}
  h+=V.length?'<ol class="rap-l">'+V.map(function(r){return rapItem(r,pode);}).join('')+'</ol>'
    :'<p class="rap-v">'+(L.length?'Nenhuma entrada neste filtro.':'Nenhuma entrada ainda.')+'</p>';
  return h;}
function rapGrava(ops,msg,ok){RAP.grav=true;xManual();
  fetch('/api/editor',{method:'POST',credentials:'same-origin',cache:'no-store',headers:Object.assign({'Content-Type':'application/json'},(typeof EDCMT!=='undefined'&&EDCMT)?{'x-cmt':'1','x-cmt-chave':EDCMTK}:{}),body:JSON.stringify({msg:msg,colecoes:{rap:ops}})})
  .then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok)throw new Error(j.erro||('HTTP '+r.status));return j;});})
  .then(function(){RAP.grav=false;ok();xManual();toast('Gravado no Breviário');})
  .catch(function(e){RAP.grav=false;xManual();toast('Não foi possível gravar: '+e.message);});}
function rapCarrega(){if(!window.CMT_SITE)return;fetch('/api/rapidas',{credentials:'same-origin',cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(j){RAP.vivo=j.registros||[];if(!$('#v-dir').hidden)xManual();}).catch(function(){});}
document.addEventListener('cmt-acesso',function(){rapCarrega();if(!$('#v-dir').hidden&&ED)xManual();});
function rapAcha(id){return (RAP.vivo||(ED&&ED.rapidas)||[]).filter(function(r){return r.id===id;})[0];}
function rapBase(){if(!RAP.vivo)RAP.vivo=((ED&&ED.rapidas)||[]).slice();return RAP.vivo;}
function rapNovo(){var t=RAP.txt.trim();if(!t){toast('Escreva a entrada');return;}var A=window.CMT_ACESSO?window.CMT_ACESSO():{};
  var d=new Date(),id='rap-'+d.toISOString().slice(0,10).replace(/-/g,'')+'-'+d.getTime().toString(36).slice(-5);
  var rec={id:id,data:d.toISOString().slice(0,10),tipo:RAP.tipo,texto:t,origem:RAP.orig.trim(),autor:A.usuario||'',situacao:'nova',destino:''};
  rapGrava([{op:'set',id:id,rec:rec,orig:'__novo__',idx:0}],'Breviário: entrada rápida ('+RAP.tipo.toLowerCase()+')',function(){rapBase().unshift(rec);RAP.txt='';RAP.orig='';});}
function rapMuda(id,fn,msg){var r=rapAcha(id);if(!r)return;var o=rapJ(r),n=JSON.parse(o);if(fn(n)===false)return;
  rapGrava([{op:'set',id:id,rec:n,orig:o,idx:0}],msg,function(){var L=rapBase();var i=L.indexOf(rapAcha(id));if(i>=0)L[i]=n;});}
/* manual gerado das diretrizes (dados): no editor, é o que se edita no lugar; no Compendium vale o manual de redação de editorial_d.js */
function xManualDados(){
  var q0=XP.q;XP.q=XM.q;var nq=nz(XM.q),f=function(){return !nq||nz([].slice.call(arguments).join(' ')).indexOf(nq)>=0;};
  var CAP=[],FF={};ED.pecas.forma.forEach(function(x){FF[x.t]=x.r;});
  function li(L){return L.length?'<ul class="mn-ul">'+L.map(function(x){return '<li>'+xFm(x)+'</li>';}).join('')+'</ul>':'';}
  /* no editor (manual dentro de #ed-man), as regras que vêm das diretrizes ganham lápis e "+ Nova regra" */
  var ED_MN=!!(window.VDM_PAGINA_EDITOR&&$('#x-man')&&$('#x-man').closest('#ed-man')),PEN='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
  function rid(r){return ED_MN&&r&&/^R/.test(r.fo||'')?r.id:'';}
  function mud(id){return typeof edSit==='function'&&edSit('dir',id)?' mud':'';}
  function pen(id){return '<button type="button" class="mn-pen" data-mnpen="'+esc(id)+'" title="Editar" aria-label="Editar">'+PEN+'</button>';}
  function nova(tipo,grupo,rot){return ED_MN&&!nq?'<button type="button" class="mn-nova" data-mnnovo="'+esc(tipo+'|'+(grupo||''))+'">+ '+esc(rot||'Nova regra')+'</button>':'';}
  function regra(t,o,e,obs,id){if(id)return '<div class="mn-r mn-ed'+mud(id)+'" data-dirid="'+esc(id)+'">'+(t?'<h4>'+esc(t)+'</h4>':'')+(o?'<p><span class="xlb ok">Preferir</span>'+xFm(o)+'</p>':'')+(e?'<p><span class="xlb no">Evitar</span>'+xFm(e)+'</p>':'')+(obs?'<p class="mn-obs">'+xFm(obs)+'</p>':'')+pen(id)+'</div>';
    return '<div class="mn-r">'+(t?'<h4>'+esc(t)+'</h4>':'')+(o?'<p><span class="xlb ok">Preferir</span>'+xFm(o)+'</p>':'')+(e?'<p><span class="xlb no">Evitar</span>'+xFm(e)+'</p>':'')+(obs?'<p class="mn-obs">'+xFm(obs)+'</p>':'')+'</div>';}
  function cap(id,t,secs){secs=secs.filter(function(z){return z[1];});if(secs.length)CAP.push({id:id,t:t,secs:secs});}
  /* 1. Estrutura das peças */
  var PE=[['relatorio','Relatório'],['voto','Voto'],['ementa','Ementa'],['acordao','Proclamação'],['monocratica','Decisão monocrática'],['despacho','Despacho']],BY=xBY();
  cap('estrutura','Estrutura das peças',PE.map(function(p){var pc=BY[p[0]]||{},es=estruturaRegras(p[0]).filter(function(r){return f(r.titulo,r.pref,r.ev);}),no=(pc.notas||[]).filter(function(x){return f(x);}),el=(pc.elementos||[]).filter(function(e){return f(e.n,(e.r||[]).join(' '));});
    var h=(pc.resumo&&f(pc.resumo)?'<p class="mn-lead">'+xFm(pc.resumo)+'</p>':'')+(el.length?'<ol class="mn-seq">'+el.map(function(e){return '<li><b>'+esc(e.n.replace(/^\d+\.\s*/,''))+'</b>'+((e.r||[]).length?' — '+e.r.map(xFm).join(' '):'')+'</li>';}).join('')+'</ol>':'')+es.map(function(r){return regra(r.titulo,r.pref,r.ev,'',rid(r));}).join('')+(no.length?'<div class="mn-nota"><b>Notas</b>'+li(no)+'</div>':'');
    return [p[1],h&&(no.length||es.length||el.length||!nq)?h:''];}));
  /* 2. Frase e parágrafo */
  var RI=redacaoItens().filter(function(r){return f(r.titulo,r.pref,r.ev,r.obs);}),gs=[];RI.forEach(function(r){if(gs.indexOf(r.rg)<0)gs.push(r.rg);});
  cap('frase','Frase e parágrafo',RED_ORD.filter(function(x){return gs.indexOf(x)>=0;}).concat(gs.filter(function(x){return RED_ORD.indexOf(x)<0;})).map(function(g){return [PAR_TIT[g]||g,RI.filter(function(r){return r.rg===g;}).map(function(r){return regra(r.titulo,r.pref,r.ev,r.obs,rid(r));}).join('')+nova('preferencia',{'Regras gerais':'D. Frase e vocabulário','Fatos e prova':'B. Fatos e prova','Fundamentação':'C. Fundamentação'}[g]||'D. Frase e vocabulário')];}));
  /* 3. Citação */
  var CT=citacaoItens(),FC=(FF['Citação de precedente']||[]).filter(function(x){return f(x);});
  cap('citacao','Citação de precedentes',[['Forma da citação',li(FC)],['Regras',CT.CI.map(function(r){return regra(r.titulo,r.pref,r.ev,'',rid(r));}).join('')+CT.M3.map(function(r){return regra(r['Título'],r['Orientação'],r['Evitar'],r['Observação']);}).join('')+nova('preferencia','E. Citação')]]);
  /* 4. Dispositivo e fecho */
  cap('dispositivo','Dispositivo e fecho',[['Regras',estiloItens().filter(function(r){return r.g==='F. Dispositivo e fecho'&&f(r.titulo,r.pref,r.ev);}).map(function(r){return regra(r.titulo,r.pref,r.ev,'',rid(r));}).join('')+nova('preferencia','F. Dispositivo e fecho')]]);
  /* 5. Vocabulário */
  var TI=termosIntegrados().filter(function(r){return !ehGrafia(r)&&f(r.ad,r.ev.join(' '),r.obs.join(' '));}),CV=conectivosVerbos(),C=CV.C.filter(function(r){return f(r.a,r.b,r.uso);}),V=CV.V.filter(function(r){return f(r.a,r.b,r.c,r.uso);});
  function tab(cab,rows){return rows.length?'<table class="mn-t"><thead><tr>'+cab.map(function(c){return '<th>'+c+'</th>';}).join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table>':'';}
  cap('vocabulario','Vocabulário',[['Termos',tab(['<span class="ok">Adotar</span>','<span class="no">Evitar</span>','Observação'],TI.map(function(r){return '<tr><td class="tok">'+(r.ad?esc(r.ad):'—')+(r.conf?'<div class="meta"><mark class="v">[VALIDAR]</mark> orientação oposta: “'+esc(r.conf)+'”</div>':'')+'</td><td class="tno">'+esc(r.ev.join(' · '))+'</td><td>'+esc(r.obs.join(' '))+'</td></tr>';}))],
    ['Conectivos e transições',tab(['Conectivo','Função'],C.map(function(r){return '<tr><td><b>'+esc(r.a)+'</b></td><td>'+esc(r.b||'')+(r.uso?'<div class="meta">'+esc(r.uso)+'</div>':'')+'</td></tr>';}))],
    ['Verbos e construções',tab(['Verbo','Construção e emprego'],V.map(function(r){return '<tr><td><b>'+esc(r.a)+'</b></td><td>'+esc([r.b,r.c,r.uso].filter(Boolean).join(' · '))+'</td></tr>';}))]]);
  /* 6. Grafias, normas e remissões */
  var G=termosIntegrados().filter(function(r){return ehGrafia(r)&&f(r.ad,r.ev.join(' '),r.obs.join(' '));}),N=(ED.normas||[]).filter(function(r){return f(r.sigla,r.nome,r.prosa,(r.aliases||[]).join(' '));}),FR=(FF['Normas e referências']||[]).concat(FF['Enumeração e remissões']||[]).filter(function(x){return f(x);});
  cap('grafias','Grafias, normas e remissões',[['Grafias',tab(['<span class="ok">Grafar</span>','<span class="no">Evitar</span>'],G.map(function(r){return '<tr><td class="tok">'+esc(r.ad||'—')+(r.obs.length?'<div class="meta">'+esc(r.obs.join(' '))+'</div>':'')+'</td><td class="tno">'+esc(r.ev.join(' · '))+'</td></tr>';}))],
    ['Grafia de normas',tab(['Sigla','Na prosa'],N.map(function(r){return '<tr><td><b>'+esc(r.sigla)+'</b><div class="meta">'+esc(r.nome)+'</div></td><td>'+esc(r.prosa)+'</td></tr>';}))],['Normas, referências e remissões',li(FR)]]);
  /* 7. Formatação */
  cap('formatacao','Formatação para o PJe',[['Regras',li((FF['Formatação para o PJe']||[]).filter(function(x){return f(x);}))]]);
  /* 8. Matéria rural */
  cap('rural','Matéria rural',[['Regras',estiloItens().filter(function(r){return (r.g==='G. Matéria rural'||/voto rural/i.test(r.titulo||''))&&f(r.titulo,r.pref,r.ev);}).map(function(r){return regra(r.titulo,r.pref,r.ev,'',rid(r));}).join('')+nova('preferencia','G. Matéria rural')]]);
  /* 9. Verificações automáticas */
  var AL=regs('alerta').filter(function(r){return f(r.mensagem,r.escopo);}),CO=regs('correcao').filter(function(r){return f(r.motivo,r.substituir);});
  cap('verificacoes','Verificações automáticas da minuta',[['Alertas',(ED_MN?tab(['Aviso','Palavra procurada','Onde',''],AL.map(function(r){return '<tr class="mn-ed'+mud(r.id)+'" data-dirid="'+esc(r.id)+'"><td>'+xFm(r.mensagem||'')+'</td><td class="meta">'+esc(typeof edPalDe==='function'&&edPalDe(r.padrao)!==null?edPalDe(r.padrao):'regra especial')+'</td><td class="meta">'+esc(r.escopo||'toda a peça')+'</td><td>'+pen(r.id)+'</td></tr>';}))
      :tab(['Aviso','Onde'],AL.map(function(r){return '<tr><td>'+xFm(r.mensagem||'')+'</td><td class="meta">'+esc(r.escopo||'toda a peça')+'</td></tr>';})))+nova('alerta','','Novo alerta')],
    ['Correções sugeridas',(ED_MN?tab(['Correção','Palavra procurada','Substituir por',''],CO.map(function(r){return '<tr class="mn-ed'+mud(r.id)+'" data-dirid="'+esc(r.id)+'"><td>'+xFm(r.motivo||'')+'</td><td class="meta">'+esc(typeof edPalDe==='function'&&edPalDe(r.padrao)!==null?edPalDe(r.padrao):'regra especial')+'</td><td class="meta">'+esc(r.substituir||'—')+'</td><td>'+pen(r.id)+'</td></tr>';}))
      :tab(['Correção'],CO.map(function(r){return '<tr><td>'+xFm(r.motivo||'')+'</td></tr>';})))+nova('correcao','','Nova correção')]]);
  /* 10. Tensões */
  var TS=(ED.pecas.tensoes||[]).filter(function(t){return f(t.t,t.a,t.b);}),PR=manCap('08').filter(function(r){return f(manTxt(r));});
  cap('tensoes','Tensões entre orientações',[['Em aberto',TS.map(function(t){return '<div class="mn-r"><h4>'+esc(t.t)+' <mark class="v">[VALIDAR]</mark></h4><p><span class="xlb">A</span>'+xFm(t.a)+'</p><p><span class="xlb">B</span>'+xFm(t.b)+'</p></div>';}).join('')],['Propostas em avaliação · não vigentes',PR.map(function(r){return regra(r['Título'],r['Orientação'],'',r['Observação']);}).join('')]]);
  /* estrutura das peças fica no fim do manual */
  var ie=-1;CAP.forEach(function(c,i){if(c.id==='estrutura')ie=i;});if(ie>=0)CAP.push(CAP.splice(ie,1)[0]);
  XP.q=q0;
  var toc='<nav class="mn-toc" aria-label="Sumário"><div class="mn-tq"><input id="mn-q" type="search" placeholder="Buscar no manual" aria-label="Buscar no manual" value="'+esc(XM.q)+'"></div><div class="lab" style="margin-top:0">Sumário</div><a class="mn-toc-r" href="#mn-rap" data-mngo="rap">Entradas rápidas'+(rapLista().filter(function(r){return r.situacao!=='incorporada';}).length?' <i>'+rapLista().filter(function(r){return r.situacao!=='incorporada';}).length+'</i>':'')+'</a><ol>'+CAP.map(function(c,i){return '<li><a href="#mn-'+c.id+'" data-mngo="'+c.id+'">'+(i+1)+'. '+esc(c.t)+'</a>'+(c.secs.length>1?'<ol>'+c.secs.map(function(s,j){return '<li><a href="#mn-'+c.id+'-'+j+'" data-mngo="'+c.id+'-'+j+'">'+esc(s[0])+'</a></li>';}).join('')+'</ol>':'')+'</li>';}).join('')+'</ol></nav>';
  var body='<header class="mn-hd"><p class="mn-k">Gabinete do Desembargador Federal Carlos Muta · Turma Regional de MS</p><h1>Manual de redação</h1><p class="mn-sub">Diretrizes de estrutura, frase, citação, vocabulário, grafia e formatação das peças do gabinete.</p><div class="mn-bar"><button class="btn ghost" data-mnprint>Imprimir ou salvar em PDF</button></div></header>'+'<section class="mn-rap" id="mn-rap">'+rapHtml(nq)+'</section>'+
    (CAP.length?CAP.map(function(c,i){return '<section class="mn-cap" id="mn-'+c.id+'"><h2><span>'+(i+1)+'</span>'+esc(c.t)+'</h2>'+c.secs.map(function(s,j){return '<div class="mn-sec" id="mn-'+c.id+'-'+j+'">'+(c.secs.length>1||s[0]!=='Regras'?'<h3>'+(i+1)+'.'+(j+1)+' '+esc(s[0])+'</h3>':'')+s[1]+'</div>';}).join('')+'</section>';}).join(''):'<p class="empty">Nada encontrado no manual.</p>');
  var foco=document.activeElement&&document.activeElement.id==='mn-q',pos=foco?document.activeElement.selectionStart:0;
  $('#x-man').innerHTML='<div class="mn-wrap">'+toc+'<article class="mn-doc">'+body+'</article></div>';
  if(foco){var qi=$('#mn-q');qi.focus();try{qi.setSelectionRange(pos,pos);}catch(e){}}
}
$('#x-man').addEventListener('click',function(e){var a=e.target.closest('[data-mngo]');if(a){e.preventDefault();var el=document.getElementById('mn-'+a.getAttribute('data-mngo'));if(el)el.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(e.target.closest('[data-mnprint]')){var w=window.open('','_blank');if(!w){toast('Permita janelas para imprimir');return;}w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Manual de redação</title><style>'+MN_PRINT+'</style></head><body>'+$('.mn-doc').innerHTML+'</body></html>');w.document.close();setTimeout(function(){w.print();},300);}});
$('#x-man').addEventListener('click',function(e){var b=e.target.closest('[data-rapf],[data-rapadd],[data-rapinc],[data-rapsit],[data-rapdel]');if(!b)return;
  if(b.hasAttribute('data-rapf')){RAP.filtro=b.getAttribute('data-rapf');xManual();return;}
  if(b.hasAttribute('data-rapadd')){rapNovo();return;}
  var id=b.getAttribute('data-rapinc')||b.getAttribute('data-rapsit')||b.getAttribute('data-rapdel');
  if(b.hasAttribute('data-rapinc')){var dst=window.prompt('Onde foi incorporada? (ex.: Manual · Vocabulário, modelo, parágrafo)','');if(dst===null)return;rapMuda(id,function(n){n.situacao='incorporada';n.destino=dst.trim();},'Breviário: entrada rápida incorporada');return;}
  if(b.hasAttribute('data-rapsit')){rapMuda(id,function(n){n.situacao='nova';n.destino='';},'Breviário: entrada rápida reaberta');return;}
  if(b.hasAttribute('data-rapdel')){if(!window.confirm('Excluir esta entrada rápida?'))return;var r=rapAcha(id);if(!r)return;
    rapGrava([{op:'del',id:id,orig:rapJ(r)}],'Breviário: entrada rápida excluída',function(){var L=rapBase();L.splice(L.indexOf(rapAcha(id)),1);});}});
$('#x-man').addEventListener('input',function(e){if(e.target.matches('[data-raptxt]')){RAP.txt=e.target.value;return;}if(e.target.matches('[data-raporig]')){RAP.orig=e.target.value;return;}});
$('#x-man').addEventListener('change',function(e){if(e.target.matches('[data-raptipo]'))RAP.tipo=e.target.value;});
$('#x-man').addEventListener('keydown',function(e){if(e.target.matches('[data-raptxt]')&&(e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();rapNovo();}});
$('#x-man').addEventListener('input',function(e){if(e.target.id!=='mn-q')return;clearTimeout(xManual._t);var v=e.target.value;xManual._t=setTimeout(function(){XM.q=v.trim();xManual();},180);});
var MN_PRINT='body{font-family:Georgia,serif;font-size:11pt;color:#111;max-width:17cm;margin:1.5cm auto}h1{font-size:20pt;margin:0}h2{font-size:14pt;border-bottom:1px solid #999;padding-bottom:3pt;margin-top:18pt}h2 span{margin-right:8pt}h3{font-size:11.5pt;margin:12pt 0 4pt}h4{margin:8pt 0 2pt;font-size:10.5pt}.mn-bar{display:none}table{border-collapse:collapse;width:100%;font-size:9.5pt}td,th{border:1px solid #bbb;padding:3pt 5pt;vertical-align:top;text-align:left}.xlb{font:700 7.5pt sans-serif;text-transform:uppercase;margin-right:5pt}.xlb.ok,.ok{color:#2f6b3c}.xlb.no,.no{color:#9a3d2e}.meta,.mn-obs{color:#555;font-size:9.5pt}p{margin:3pt 0}';
var ACO_PARTES=['relatorio','voto','ementa','acordao'];
function regraCard(r){return '<article class="card" style="--gc:var(--line)">'+(r.titulo?'<h3 style="margin-top:0">'+esc(r.titulo)+'</h3>':'')+'<div class="fields">'+(r.pref?'<div class="field good"><b>Preferir</b><p>'+refs(r.pref)+'</p></div>':'')+(r.ev?'<div class="field bad"><b>Evitar</b><p>'+refs(r.ev)+'</p></div>':'')+(r.obs?'<div class="field"><b>Observação</b><p>'+refs(r.obs)+'</p></div>':'')+'</div></article>';}
XS.min={};
/* Formatação de cada peça para colar no PJe, com amostra na página */
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
var RED_ORD=['Regras gerais','Fatos e prova','Fundamentação'];
var PAR_TIT={'Regras gerais':'Frase e parágrafo','Fatos e prova':'Parágrafos de fatos e prova','Fundamentação':'Parágrafos de fundamentação'};
/* Estrutura de parágrafos: último tópico da Estrutura das peças (antiga subaba Redação) */
function citacaoItens(){
  var FF={};ED.pecas.forma.forEach(function(f){FF[f.t]=f.r;});
  return {fc:(FF['Citação de precedente']||[]).filter(hit),CI:estiloItens().filter(function(r){return r.g==='E. Citação'&&hit([r.titulo,r.pref,r.ev].join(' '));}),M3:manCap('03').filter(function(r){return hit(manTxt(r));})};
}
/* Regras de estrutura (grupo A das diretrizes): exibidas na peça a que se referem, em Estrutura das peças */
var EST_PECA={'red-dir-01':['voto','monocratica'],'red-dir-03':['monocratica'],'red-dir-04':['relatorio','monocratica']};
function ehEstrutura(r){return r.g==='A. Estrutura'&&!/voto rural/i.test(r.titulo||'');}
function estruturaRegras(id){return estiloItens().filter(function(r){if(!ehEstrutura(r))return false;var ps=EST_PECA[r.id];return ps?ps.indexOf(id)>=0:id==='voto';});}
function redGrupo(r){if(/^Manual ·/.test(r.g)||r.g==='D. Frase e vocabulário')return 'Regras gerais';return String(r.g).replace(/^[A-Z]\.\s*/,'');}
function redacaoItens(){return estiloItens().filter(function(r){return r.g!=='A. Estrutura'&&r.g!=='Termos e grafias'&&r.g!=='E. Citação'&&r.g!=='F. Dispositivo e fecho'&&r.g!=='G. Matéria rural'&&!/voto rural/i.test(r.titulo||'')&&!/^Manual · Vocabul/.test(r.g);}).map(function(r){r.rg=redGrupo(r);return r;});}
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
var VG=[['palavras','Termos, conectivos e verbos',[['xv-ter','Termos'],['xv-con','Conectivos e transições'],['xv-ver','Verbos e construções'],['xv-res','Verbos de resultado']]],['forma','Grafias, normas e remissões',[['xv-gra','Grafias'],['xv-nor','Grafia de normas'],['xv-ref','Normas, referências e remissões']]]];
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
/* ================= EDITORIAL: página única (folha anotada, orientações à esquerda, consulta à direita) ================= */
var XP={pc:'acordao',v:{acordao:'ap',decisao:'mono'},alt:{},abre:{},fora:{},res:{},mrec:'ap',sel:null,tab:'par',q:''};
var XPECAS={acordao:{t:'Acórdão',var:[['ap','Apelação'],['dap','Dupla apelação'],['aprn','Apelação e remessa necessária'],['ai','Agravo de instrumento'],['ed','Embargos de declaração'],['agint','Agravo interno']]},decisao:{t:'Decisão monocrática',var:[['mono','Decisão monocrática'],['desp','Despacho']]}};
var XALT={'relatorio|Contrarrazões':['Houve','Não houve'],'relatorio|Referências aos autos':['ID','ID com folhas'],'voto|Transição ao mérito':['Sem preliminar','Após preliminar'],'voto|Enfrentamento das alegações':['Nem se alegue','Contrariamente'],'voto|Síntese':['Em suma','Assim'],'ementa|II. QUESTÃO EM DISCUSSÃO':['Uma questão','Duas questões']};
var XOPC={'voto|Sobrestamento sem suspensão':1,'voto|Honorários recursais':1,'voto|Consectários':1,'ed|Erro material de ofício':1,'ed|Voto com correção':1,'ed|Ementa com correção':1,'ed|Efeitos infringentes':1,'ed|Multa protelatória':1,'despacho|Baixa à origem para exame dos ED':1};
var XFUNDE={'relatorio|Abertura (variante)':'relatorio|Abertura','agint|Multa: sem precedente qualificado':'agint|Multa: precedente qualificado'};
var XNOMEV={ed:'embargos de declaração',agint:'agravo interno'};
function xBY(){var o={};ED.pecas.pecas.forEach(function(p){o[p.id]=p;});return o;}
function xTrechos(pid,nomes){
  var BY=xBY(),L=[],por={};if(!BY[pid])return L;
  BY[pid].elementos.forEach(function(e){if(nomes&&nomes.indexOf(e.n)<0)return;var k=pid+'|'+e.n;
    if(XFUNDE[k]&&por[XFUNDE[k]]){var lb=e.n.replace(/^.*?:\s*/,'');if(e.n==='Abertura (variante)')lb='À sentença';por[XFUNDE[k]].alts.push({lab:lb.charAt(0).toUpperCase()+lb.slice(1),f:e.f,r:e.r});return;}
    var t={k:k,pid:pid,n:e.n==='Multa: precedente qualificado'?'Multa do artigo 1.021, § 4º':e.n,r:e.r||[],opc:!!XOPC[k]||!!e.opc,alts:[],info:e.info||null,pad:e.padroes||null};
    if(e.alts&&e.alts.length){t.alts=e.alts.map(function(x){return {lab:x.lab,f:x.f,r:[],sub:x.sub};});por[k]=t;L.push(t);return;}
    var linhas=String(e.f||'').split('\n').filter(Boolean),rot=XALT[k];
    var pref=linhas.length>1&&linhas.every(function(l){return /^[A-ZÁÉÍÓÚ][^:“]{2,40}:\s*“/.test(l);});
    if(pref)linhas.forEach(function(l){var m=l.match(/^([^:]+):\s*(.*)$/);t.alts.push({lab:m[1],f:m[2].replace(/^“/,'').replace(/”\.?$/,''),r:[]});});
    else if(rot&&linhas.length>1)linhas.forEach(function(l,i){t.alts.push({lab:rot[i]||('Forma '+(i+1)),f:l,r:[]});});
    else t.alts.push({lab:e.n==='Multa: precedente qualificado'?'Com precedente qualificado':'',f:e.f,r:[]});
    por[k]=t;L.push(t);});
  return L;
}
function xPadrao(v,parte,base){return {k:v+'|'+parte+'-padrao',pid:v,n:parte==='relatorio'?'Relatório padronizado':'Ementa padronizada',r:[],opc:false,alts:[{lab:'',f:(base?base+' ':'')+'[VALIDAR: '+(parte==='relatorio'?'relatório':'ementa')+' padronizado de '+XNOMEV[v]+']',r:[]}]};}
/* ===== Matrizes estruturais (recurso × resultado): moldes extraídos das decisões da Turma, sem matéria ===== */
var XREC={ap:'ap',dap:'ap',aprn:'rn',ai:'ai',ed:'ed'},XRECN=[['ap','Apelação'],['ai','Agravo de instrumento'],['rn','Remessa necessária']];
function xMatN(m){var x=/Extraído de (\d+)/.exec(m.fonte||'');return x?+x[1]:0;}
function xMats(pc,rec){var tp=pc==='acordao'?'a':'m',R={apelacao:'ap',agravode:'ai',remessan:'rn',embargos:'ed'};
  return (ED.matrizes||[]).filter(function(m){if(m.padrao)return m.tp===tp&&m.rec===rec;var x=/trms-(a|m)-([a-z]+)-/.exec(m.id);return x&&x[1]===tp&&R[x[2]]===rec;}).sort(function(a,b){return (a.padrao?1:0)-(b.padrao?1:0)||xMatN(b)-xMatN(a);});}
function xRecAtual(){return XP.pc==='acordao'?XREC[XP.v.acordao]||null:(XP.v.decisao==='mono'?XP.mrec:'desp');}
function xMatAtual(){var rec=xRecAtual();if(!rec)return null;var id=XP.res[XP.pc+':'+rec+':'+XP.v[XP.pc]];return id?(ED.matrizes||[]).filter(function(m){return m.id===id;})[0]||null:null;}
function xPctLab(t){t=String(t||'');var opc=/^opcional/.test(t),s=t.replace(/^opcional\s*·\s*/,''),m=/\s*\((\d+)%\)\s*$/.exec(s),p=m?m[1]:'';s=s.replace(/\s*\(\d+%\)\s*$/,'');return {lab:(s.charAt(0).toUpperCase()+s.slice(1))+(p?' · '+p+'%':''),pct:p,opc:opc};}
function xSemVoc(f){return String(f||'').replace(/^Senhores Desembargadores,\s*/,'').replace(/^[a-zà-ú]/,function(c){return c.toUpperCase();});}
function xPadTrechos(m){var e=m.esq||{},L=[];
  (e._topicos||[]).forEach(function(tp){var b=e[tp.id]||{},f=String(b.texto||'').trim();if(!f)return;
    L.push({k:'mx:'+m.id+'|'+tp.id,pid:'voto',n:tp.titulo||tp.id,r:[],opc:b.ativo===false,alts:[{lab:'',f:f,r:[]}],tp:tp.id});});
  return L;}
function xMatTrechos(m){
  if(m.padrao)return xPadTrechos(m);
  var e=m.esq||{},P=m.par||[],L=[];
  (e._topicos||[]).forEach(function(tp){
    var b=e[tp.id]||{},base=String(b.texto||'').trim(),G={},ords=[],i=0;
    P.filter(function(p){return p.posicao===tp.id;}).forEach(function(p){if(!G[p.ordem]){G[p.ordem]=[];ords.push(p.ordem);}G[p.ordem].push(p);});
    ords.sort(function(x,y){return x-y;});
    var grupos=ords.map(function(o){var V=G[o].sort(function(x,y){return (x.versao||0)-(y.versao||0);}).map(function(p){var l=xPctLab(p.titulo);return {lab:l.lab,f:xSemVoc(p.texto),r:[],pct:l.pct,opc:l.opc};});return {o:o,V:V,opc:V.every(function(z){return z.opc;})};});
    function nome(){i++;return i===1?tp.titulo:tp.titulo+' · '+i;}
    function livre(){L.push({k:'mx:'+m.id+'|'+tp.id,pid:'voto',n:nome(),r:['Redação livre: preencher com os dados do caso.'],opc:!!tp.opcional&&b.ativo===false,alts:[{lab:'',f:base,r:[]}],tp:tp.id});}
    var lead=0;while(lead<grupos.length&&!grupos[lead].opc)lead++;
    grupos.forEach(function(g,gi){if(base&&gi===lead)livre();
      L.push({k:'mx:'+m.id+'|'+tp.id+'#'+g.o,pid:'voto',n:nome(),r:g.V.length===1&&g.V[0].pct?['Presente em '+g.V[0].pct+'% das decisões que formaram a matriz.']:['Os percentuais indicam a frequência de cada redação nas decisões que formaram a matriz.'],opc:g.opc,alts:g.V.map(function(a){return {lab:a.lab,f:a.f,r:[]};}),tp:tp.id});});
    if(base&&lead>=grupos.length)livre();
  });
  return L;}
function xVotoMat(m,v){
  if(m.padrao)return xTrechos('voto',['Cabeçalho','Vocativo']).concat(xMatTrechos(m));
  var T=xMatTrechos(m),ed=v==='ed',H=xTrechos('voto',['Honorários recursais'])[0],C=xTrechos('voto',['Consectários'])[0],out=xTrechos('voto',['Cabeçalho','Vocativo']);
  out=out.concat(T.filter(function(t){return t.tp!=='honor'&&t.tp!=='disp';}));
  if(!ed){var hm=[];T.filter(function(t){return t.tp==='honor';}).forEach(function(t){hm=hm.concat(t.alts.map(function(a){return {lab:a.lab,f:a.f,r:a.r,base:true};}));});
    if(H)out.push(hm.length?{k:'mx:'+m.id+'|honor',pid:'voto',n:H.n,r:H.r,info:H.info,opc:false,alts:H.alts.concat(hm)}:H);
    if(C)out.push(C);}
  return out.concat(T.filter(function(t){return t.tp==='disp';})).concat(xTrechos('voto',['Encerramento']));}
function xMonoMat(m){
  var T=xMatTrechos(m),G=xTrechos('monocratica'),out=[];
  G.forEach(function(t){if(t.n==='Fundamentação')out=out.concat(T.filter(function(x){return x.tp==='fund';}));
    else if(t.n==='Dispositivo')out=out.concat(T.filter(function(x){return x.tp==='disp';}));
    else if(t.n==='Destino dos autos'||t.n==='Local e data'){var F=T.filter(function(x){return x.tp==='fecho';});if(!F.length)out.push(t);else if(t.n==='Local e data')out=out.concat(F);}
    else out.push(t);});
  return out;}
function xMatRes(m){if(m.padrao)return 'Padrão do gabinete: '+m.nome.charAt(0)+m.nome.slice(1).toLowerCase()+'. Os tópicos recolhidos entram pelo “+”.';return 'Molde extraído de '+(xMatN(m)||'')+' decisões da Turma ('+m.resultado+'). Os trechos trazem as redações mais frequentes, com o percentual de uso; os campos em amarelo recebem a matéria do caso.';}
function xPartes(){return xPartesDe(XP.pc,XP.v[XP.pc],xMatAtual());}
function xPartesDe(pc,v,mx){
  var BY=xBY();
  if(pc==='acordao'){
    var c=v!=='ed'&&v!=='agint',vt=c?null:BY[v],rp=BY['rel-'+v];
    var voto=c?xTrechos('voto'):xTrechos('voto',['Cabeçalho','Vocativo']).concat(xTrechos(v).filter(function(t){return !/^(Voto|Ementa) com correção$/.test(t.n);})).concat(v==='ed'?xTrechos('ed',['Voto com correção']):[]).concat(xTrechos('voto',['Encerramento']));
    var rel=rp?xTrechos('rel-'+v):c?xTrechos('relatorio'):[xPadrao(v,'relatorio','')].concat(xTrechos('relatorio',['Encerramento']));
    var em=c?xTrechos('ementa'):[xPadrao(v,'ementa','')].concat(v==='ed'?xTrechos('ed',['Ementa com correção']):[]);
    if(mx)voto=xVotoMat(mx,v);
    return [{id:'ementa',t:'Ementa',pj:'EMENTA',tr:em,notas:BY.ementa.notas||[]},{id:'relatorio',t:'Relatório',pj:'RELATÓRIO',tr:rel,notas:BY.relatorio.notas||[],res:rp?rp.resumo:''},
      {id:'voto',t:'Voto',pj:'VOTO',tr:voto,notas:(BY.voto.notas||[]).concat(c?[]:vt.notas||[]),res:mx?xMatRes(mx):c?'':vt.resumo},{id:'acordao',t:'Proclamação',pj:'ACÓRDÃO',tr:xTrechos('acordao'),notas:BY.acordao.notas||[]}];
  }
  if(v==='desp'&&mx)return [{id:'despacho',t:'Despacho',tr:xMatTrechos(mx),notas:BY.despacho.notas||[],res:xMatRes(mx)}];
  return v==='mono'?[{id:'monocratica',t:'Decisão monocrática',tr:mx?xMonoMat(mx):xTrechos('monocratica'),notas:BY.monocratica.notas||[],ex:BY.monocratica.exemplos,res:mx?xMatRes(mx):''}]:[{id:'despacho',t:'Despacho',tr:xTrechos('despacho'),notas:BY.despacho.notas||[]}];
}
/* Campos preenchíveis: sem chaves nem colchetes à vista; só o nome do campo, em amarelo, editável. O texto fixo não se edita. */
var FILL={},AUTO={},PADR={};
(function(){try{(ED.pecas.pecas||[]).forEach(function(p){(p.elementos||[]).forEach(function(e){if(e.padroes)Object.keys(e.padroes).forEach(function(k){PADR[k]=e.padroes[k];});});});}catch(e){}})();
function campoValor(k,nome,ctx){return FILL[k]||(ctx&&ctx.auto&&AUTO[nome])||PADR[nome]||'';}
var RE_CAMPO=/\{\{([^}]*)\}\}|\[PREENCHER:\s*([^\]]*)\]|\[(?!VALIDAR)(?![.…\s]*\])([^\[\]<>\n]{1,80})\]|\u0001([^\u0002]*)\u0002|(\[(?:\.\.\.|…)\]|…)/g;
/* {{…}} dos modelos: fica no campo só a definição do que se preenche; o texto fixo que vier junto fica fora do campo */
function expandeChave(c){c=String(c||'').trim();var m;
  if(/\[PREENCHER/.test(c)){m=/^([^—\[]{1,40}?)\s+—\s+([\s\S]+)$/.exec(c);return m?m[2]:c;}
  if((m=/^(.*?)\s*…\s*—\s*(.+)$/.exec(c)))return (m[1]?m[1]+' ':'')+'[PREENCHER: '+m[2]+']';
  if((m=/^([^—]{3,40}?)\s+—\s+(.+)$/.exec(c))&&/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(m[2])){return m[2].length>25?m[2]:'[PREENCHER: '+m[1]+': '+m[2]+']';}
  return '[PREENCHER: '+c+']';}
function preCampos(raw){return String(raw||'').replace(/\{\{([^}]*)\}\}/g,function(_,c){return expandeChave(c);});}
function campoNome(a,b,c,d,e){return e?'…':(String(a||b||c||d||'').trim()||'…');}
function comCampos(raw,ctx,fmt){var P=[];var t=preCampos(raw).replace(RE_CAMPO,function(m,a,b,c,d,e){P.push(campoNome(a,b,c,d,e));return '\uE000'+(P.length-1)+'\uE001';});
  return fmt(t).replace(/\uE000(\d+)\uE001/g,function(_,i){var nome=P[+i],k=ctx.k+'#'+(ctx.i++),v=FILL[k],au=!v&&campoValor(k,nome,ctx);return '<span class="fill'+(v?' ok':au?' ok auto':'')+'" contenteditable="true" spellcheck="true" role="textbox" aria-label="'+esc(nome)+'" data-fk="'+esc(k)+'" data-ph="'+esc(nome)+'"'+(au?' title="Preenchido automaticamente; edite se precisar"':'')+'>'+esc(v||au||'')+'</span>';});}
/* ===== Cópia com a formatação do PJe (Arial 12, justificado, recuo de 2,5 cm; ementa sem recuo; citação em bloco) ===== */
var PJF='font-family:Arial,sans-serif;font-size:12pt;line-height:1.5;';
function camposR(raw,ctx){return preCampos(raw).replace(RE_CAMPO,function(m,a,b,c,d,e){var nome=campoNome(a,b,c,d,e),k=ctx.k+'#'+(ctx.i++),v=campoValor(k,nome,ctx);return v?v:''+nome+'';});}
function rcEsc(t,html){return html?esc(t).replace(/([^]*)/g,'<span style="background:#ffff00">$1</span>'):t.replace(/([^]*)/g,'[$1]');}
/* uma linha de texto vira um parágrafo do PJe */
function rcLinha(l,parte,n,html){
  var t=rcEsc(l,html);
  if(parte==='ementa'){var st=PJF+'text-align:justify;text-indent:0;margin:0 0 6pt;';
    if(!html)return t;
    if(n==='Cabeçalho'||/^[IV]+\.\s/.test(l))t='<b>'+t+'</b>';else if(/^\d+\.\s/.test(l))t=t.replace(/^(\d+\.)/,'<b>$1</b>');else if(n==='Rodapé'&&/^[^:]{6,40}:\s/.test(l))t=t.replace(/^([^:]+:)/,'<i>$1</i>');
    return '<p style="'+st+'">'+t+'</p>';}
  var cit=/^\s*“/.test(l)||(n==='Precedente'&&/“[^”]*”/.test(l));
  if(!html)return t;
  return '<p style="'+PJF+'text-align:justify;'+(cit?'margin:6pt 0 6pt 2.5cm;font-style:italic;text-indent:0;':'text-indent:2.5cm;margin:0 0 6pt;')+'">'+t+'</p>';
}
/* partes → documento; comTitulo: põe RELATÓRIO, VOTO etc. (para colar fora do PJe) */
function rcDoc(partes,comTitulo,html){
  var out=[];
  partes.forEach(function(pt){
    if(comTitulo&&pt.pj)out.push(html?'<p style="'+PJF+'text-align:center;font-weight:bold;margin:12pt 0 6pt;">'+esc(pt.pj)+'</p>':pt.pj);
    pt.itens.forEach(function(it){
      if(it.rn)out.push(rcLinha(it.n,'ementa','',html));
      String(it.txt||'').split('\n').filter(function(x){return x.trim();}).forEach(function(l){out.push(rcLinha(l.trim(),pt.parte,it.n,html));});
    });
  });
  return html?'<div style="'+PJF+'">'+out.join('')+'</div>':out.join('\n');
}
function copiarRico(partes,comTitulo,msg){
  var h=rcDoc(partes,comTitulo,true),t=rcDoc(partes,comTitulo,false);
  function fb(){var d=document.createElement('div');d.contentEditable='true';d.style.cssText='position:fixed;left:-9999px;top:0;background:#fff;color:#000';d.innerHTML=h;document.body.appendChild(d);var r=document.createRange();r.selectNodeContents(d);var s=getSelection();s.removeAllRanges();s.addRange(r);try{document.execCommand('copy');toast(msg);}catch(e){copiar(t,msg);}s.removeAllRanges();d.remove();}
  try{if(window.ClipboardItem&&navigator.clipboard&&navigator.clipboard.write){navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([h],{type:'text/html'}),'text/plain':new Blob([t],{type:'text/plain'})})]).then(function(){toast(msg);},fb);}else fb();}catch(e){fb();}
}
/* coleta do que está na folha (alternativa escolhida, opcionais abertos, campos preenchidos, minúscula após o vocativo) */
function rcColher(PT,get){
  var aposVoc=false;
  return PT.map(function(pt){var parte=pt.parte;
    var itens=pt.trs.filter(function(t){return (!t.opc||get.abre[t.k])&&!xSai(t,pt.trs,get.alt,get.fora);}).map(function(t){
      var E=escolha(t,get.alt),a=E.a||{},rn=parte==='ementa'&&/^[IV]+\./.test(t.n);
      var txt=a.f?camposR(a.f,{k:get.kp(t)+'@'+E.key,i:0,auto:get.auto}):(rn?'':''+t.n+'');
      if(aposVoc){if(a.f)txt=txt.replace(/^(\s*)(\S)/,function(_,s,c){return s+c.toLowerCase();});aposVoc=false;}
      if(t.n==='Vocativo')aposVoc=true;
      return {n:t.n,txt:txt,rn:rn,k:t.k};});
    return {pj:pt.pj,parte:parte,itens:itens};});
}
function rcEditorial(){var PT=(XP._PT||xPartes()).map(function(pt){return {pj:pt.pj||'',parte:pt.id==='ementa'?'ementa':pt.id,trs:pt.tr};});return rcColher(PT,{alt:XP.alt,abre:XP.abre,fora:XP.fora,auto:true,kp:function(t){return t.k;}});}
function rcModelo(){var m=MS._m;var PT=(MS._P||[]).map(function(pt){return {pj:pt.pj,parte:pt.pj==='EMENTA'?'ementa':(pt.pj==='RELATÓRIO'?'relatorio':pt.pj==='ACÓRDÃO'?'acordao':'voto'),trs:pt.trs};});return rcColher(PT,{alt:MS.alt,abre:MS.abre,fora:MS.fora,kp:function(t){return m.id+'|'+t.k;}});}
/* ===== Baixar .docx e PDF (mesma formatação da cópia: Arial 12, justificado, recuo 2,5 cm; ementa sem recuo; citação em bloco) ===== */
var CRC_T=(function(){var t=[];for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(u){var c=0xFFFFFFFF;for(var i=0;i<u.length;i++)c=CRC_T[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function zipStore(files){var enc=new TextEncoder(),parts=[],cen=[],off=0;
  function u16(v){return [v&255,(v>>>8)&255];}function u32(v){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];}
  files.forEach(function(f){var nm=enc.encode(f.n),dt=enc.encode(f.d),cr=crc32(dt);
    var lh=[].concat(u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(cr),u32(dt.length),u32(dt.length),u16(nm.length),u16(0));
    parts.push(new Uint8Array(lh),nm,dt);
    cen.push(new Uint8Array([].concat(u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(cr),u32(dt.length),u32(dt.length),u16(nm.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off))),nm);
    off+=lh.length+nm.length+dt.length;});
  var cs=0;cen.forEach(function(c){cs+=c.length;});
  var end=new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cs),u32(off),u16(0)));
  return new Blob(parts.concat(cen,[end]),{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});}
function xe(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
/* runs: [{t,b,i,hl}] → XML */
function wRuns(R){return R.map(function(r){return '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'+(r.b?'<w:b/>':'')+(r.i?'<w:i/>':'')+(r.hl?'<w:highlight w:val="yellow"/>':'')+'<w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">'+xe(r.t)+'</w:t></w:r>';}).join('');}
function wSplit(t,b,i){var R=[],re=/([^]*)/g,last=0,m;while((m=re.exec(t))){if(m.index>last)R.push({t:t.slice(last,m.index),b:b,i:i});R.push({t:m[1],b:b,i:i,hl:1});last=re.lastIndex;}if(last<t.length)R.push({t:t.slice(last),b:b,i:i});return R;}
function wPara(R,o){o=o||{};return '<w:p><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="'+(o.center?'center':'both')+'"/><w:ind w:left="'+(o.left||0)+'" w:firstLine="'+(o.first||0)+'"/></w:pPr>'+wRuns(R)+'</w:p>';}
function wLinha(l,parte,n){
  if(parte==='ementa'){
    if(n==='Cabeçalho'||/^[IV]+\.\s/.test(l))return wPara(wSplit(l,1,0));
    var m=/^(\d+\.)(.*)$/.exec(l);if(m)return wPara([{t:m[1],b:1}].concat(wSplit(m[2],0,0)));
    m=n==='Rodapé'&&/^([^:]{6,40}:)(\s.*)$/.exec(l);if(m)return wPara([{t:m[1],i:1}].concat(wSplit(m[2],0,0)));
    return wPara(wSplit(l,0,0));}
  var cit=/^\s*“/.test(l)||(n==='Precedente'&&/“[^”]*”/.test(l));
  return cit?wPara(wSplit(l,0,1),{left:1417}):wPara(wSplit(l,0,0),{first:1417});
}
function docxDe(partes,comTitulo,titulo){
  var b=[];
  if(titulo)b.push(wPara([{t:titulo,b:1}],{center:1}));
  partes.forEach(function(pt){
    if(comTitulo&&pt.pj)b.push(wPara([{t:pt.pj,b:1}],{center:1}));
    pt.itens.forEach(function(it){if(it.rn)b.push(wLinha(it.n,'ementa',''));String(it.txt||'').split('\n').filter(function(x){return x.trim();}).forEach(function(l){b.push(wLinha(l.trim(),pt.parte,it.n));});});
  });
  var doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+b.join('')+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>';
  return zipStore([
    {n:'[Content_Types].xml',d:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'},
    {n:'_rels/.rels',d:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'},
    {n:'word/document.xml',d:doc}]);
}
function nomeArq(t){return String(t||'documento').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,70)||'documento';}
function baixarBlob(bl,nome){var a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=nome;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},800);}
function baixarDocx(partes,comTitulo,titulo,arq){baixarBlob(docxDe(partes,comTitulo,titulo),nomeArq(arq)+'.docx');toast('Arquivo .docx gerado');}
/* PDF: abre a impressão do navegador com a página formatada; escolha "Salvar como PDF" */
function baixarPdf(partes,comTitulo,titulo,arq){
  var h=rcDoc(partes,comTitulo,true);
  var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+esc(nomeArq(arq))+'</title><style>@page{size:A4;margin:3cm 2cm 2cm 3cm}body{margin:0;font-family:Arial,sans-serif;font-size:12pt;color:#000}h1{font-size:12pt;text-align:center;margin:0 0 12pt}span[style*="ffff00"]{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>'+(titulo?'<h1>'+esc(titulo)+'</h1>':'')+h+'</body></html>';
  var f=document.createElement('iframe');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.appendChild(f);
  var d=f.contentWindow.document;d.open();d.write(html);d.close();
  setTimeout(function(){try{f.contentWindow.focus();f.contentWindow.print();}catch(e){toast('Não foi possível abrir a impressão');}setTimeout(function(){f.remove();},60000);},250);
  toast('Na janela de impressão, escolha “Salvar como PDF”');
}
/* precedente → documento */
function rcPrecedente(x){
  var it=BASE&&BASE.it&&BASE.it[x.id],em=String(x.e||'').split('\n'),P=[];
  P.push({pj:'EMENTA',parte:'ementa',itens:[{n:'Cabeçalho',txt:em[0]||''},{n:'',txt:em.slice(1).join('\n')}]});
  if(x.r)P.push({pj:'RESULTADO',parte:'voto',itens:[{n:'',txt:x.r}]});
  if(it)P.push({pj:'INTEIRO TEOR',parte:'voto',itens:[{n:'',txt:it}]});
  P.push({pj:'CITAÇÃO',parte:'voto',itens:[{n:'Precedente',txt:citacao(x)}]});
  return P;
}
function camposT(raw,ctx){return preCampos(raw).replace(RE_CAMPO,function(m,a,b,c,d,e){var nome=campoNome(a,b,c,d,e),k=ctx.k+'#'+(ctx.i++),v=campoValor(k,nome,ctx);return v||('['+nome+']');});}
document.addEventListener('input',function(e){var f=e.target.closest&&e.target.closest('.fill');if(!f)return;var v=f.textContent.trim();f.classList.remove('auto');f.removeAttribute('title');if(v){FILL[f.getAttribute('data-fk')]=v;f.classList.add('ok');}else{delete FILL[f.getAttribute('data-fk')];f.classList.remove('ok');}if(f.closest('#x-main')){clearTimeout(xAutoAplica._t);xAutoAplica._t=setTimeout(xAutoAplica,250);xRascunho();}});
document.addEventListener('focusout',function(e){var f=e.target.closest&&e.target.closest('.fill');if(!f)return;if(!f.textContent.trim()){f.textContent='';f.classList.remove('ok');delete FILL[f.getAttribute('data-fk')];}});
document.addEventListener('keydown',function(e){var f=e.target.closest&&e.target.closest('.fill');if(f&&e.key==='Enter'){e.preventDefault();f.blur();}},true);
document.addEventListener('paste',function(e){var f=e.target.closest&&e.target.closest('.fill');if(!f)return;e.preventDefault();var t=(e.clipboardData||window.clipboardData).getData('text').replace(/\s+/g,' ');document.execCommand('insertText',false,t);});
/* alternativa escolhida num trecho; uma alternativa pode abrir sub-alternativas (ex.: Houve contrarrazões › com ou sem preliminar) */
function escolha(t,ST){var ai=Math.min(ST[t.k]||0,Math.max(0,t.alts.length-1)),a=t.alts[ai]||{f:''};
  if(a.sub&&a.sub.length){var si=Math.min(ST[t.k+'/s']||0,a.sub.length-1);return {ai:ai,si:si,key:ai+'.'+si,a:{lab:a.lab,f:a.sub[si].f,r:a.r||[]},sub:a.sub};}
  return {ai:ai,si:-1,key:''+ai,a:a,sub:null};}
function subSel(t,E,attr){return E.sub?'<div class="xalt sub">'+E.sub.map(function(x,i){return '<button '+attr+'="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===E.si)+'">'+esc(x.lab)+'</button>';}).join('')+'</div>':'';}
/* a abertura que já diz o que decidiu a sentença dispensa o tópico Sentença */
function sentNaAbertura(trs,ST){var ab=trs.filter(function(t){return /^Abertura/.test(t.n);})[0];if(!ab)return false;var a=escolha(ab,ST).a||{};return /senten[çc]a/i.test(a.f||'');}
function xSai(t,trs,ST,fora){return !!(fora&&fora[t.k])||(t.n==='Sentença'&&sentNaAbertura(trs,ST));}
/* trechos que não se retiram: cabeçalho e vocativo do voto, “É o relatório.” e “É como voto.” */
function xFixo(parte,t){return semRotulo(parte,t.n)||t.alts.length===1&&/^\s*É (o relatório|como voto)\.?\s*$/.test(t.alts[0].f||'');}
function semRotulo(parte,n){return parte==='voto'&&/^(Cabeçalho|Vocativo)$/.test(n);}
function xFm(l){return refs(l).replace(/\[VALIDAR[^\]]*\]/g,function(m){return '<mark class="v">'+m+'</mark>';});}
function xParas(f,parte,n,extra,ctx){
  var L=String(f).split('\n').filter(function(x){return x.trim();});
  return L.map(function(l,i){var c,tx=ctx?comCampos(l,ctx,xFm):xFm(l);
    if(parte==='ementa'){c='em';
      if(n==='Cabeçalho'||/^[IV]+\.\s/.test(l))tx='<b>'+tx+'</b>';
      else if(/^\d+\.\s/.test(l))tx=tx.replace(/^(\d+\.)/,'<b>$1</b>');
      else if(n==='Rodapé'&&/^[^:]{6,40}:\s/.test(l))tx=tx.replace(/^([^:]+:)/,'<i>$1</i>');}
    else c=(/^“/.test(l)||(n==='Precedente'&&/“[^”]*”/.test(l)))?'cit':'std';
    return '<p class="'+c+'">'+tx+(i===L.length-1?extra:'')+'</p>';}).join('');
}
function xInfo(I){return '<div class="xinfo">'+(I.txt?'<p>'+xFm(I.txt)+'</p>':'')+(I.linhas&&I.linhas.length?'<table><thead><tr>'+I.cab.map(function(c){return '<th>'+esc(c)+'</th>';}).join('')+'</tr></thead><tbody>'+I.linhas.map(function(l){return '<tr>'+l.map(function(c,i){return (i?'<td>':'<th>')+xFm(c)+(i?'</td>':'</th>');}).join('')+'</tr>';}).join('')+'</tbody></table>':'')+'</div>';}
function xLista(L){return L.length?'<ul>'+L.join('')+'</ul>':'';}

/* ===== Dados da peça e coerência: o dispositivo do voto alimenta a ementa e a proclamação; o processo e a parte recorrente preenchem o que der ===== */
var XD={proc:'',rec:'',ac:null,naoAchou:false},XRK='vdm-xp-rascunho';
XP.vb={};
function xDispTexto(PT){var r='';(PT||[]).forEach(function(pt){if(pt.id!=='voto'&&pt.id!=='monocratica')return;pt.tr.forEach(function(t){if(!/Dispositivo/.test(t.n)||(t.opc&&!XP.abre[t.k])||xSai(t,pt.tr,XP.alt,XP.fora))return;var E=escolha(t,XP.alt);if(E.a&&E.a.f)r=camposT(E.a.f,{k:t.k+'@'+E.key,i:0});});});
  r=String(r).split('\n')[0].trim().replace(/^Ante o exposto,\s*/i,'').replace(/^com (esteio|fundamento) no art(igo|\.)\s*932[^,]*,\s*(do )?(CPC|Código de Processo Civil)?,?\s*/i,'').replace(/\.\s*$/,'').trim();
  if(!r||/^\[?(…|\.\.\.)\]?$/.test(r)||/^\[/.test(r))return '';return r;}
var XVERB=[['não conheço','não conheceu'],['nego','negou'],['dou','deu'],['rejeito','rejeitou'],['acolho','acolheu'],['conheço','conheceu'],['julgo','julgou'],['determino','determinou'],['homologo','homologou'],['corrijo','corrigiu'],['concedo','concedeu'],['denego','denegou'],['declaro','declarou'],['extingo','extinguiu'],['mantenho','manteve'],['reformo','reformou'],['anulo','anulou'],['defiro','deferiu'],['indefiro','indeferiu'],['fixo','fixou'],['condeno','condenou'],['reconheço','reconheceu'],['casso','cassou'],['restabeleço','restabeleceu']];
function xTerceira(s){XVERB.forEach(function(v){s=s.replace(new RegExp('(^|[\\s,;])'+v[0]+'(?=[\\s,;.]|$)','g'),function(_,a){return a+v[1];});});return s;}
function xEmDisp(s){
  var R=[[/^nego provimento (à|ao|às|aos) (.+?)(?=,|;| para | e (?:corrijo|determino)|$)/,'desprovid'],[/^dou (?:parcial provimento|provimento parcial) (à|ao|às|aos) (.+?)(?=,|;| para |$)/,'parcialmente provid'],[/^dou provimento (à|ao|às|aos) (.+?)(?=,|;| para |$)/,'provid'],
    [/^rejeito (os|as|o|a) (.+?)(?=,|;| e corrijo|$)/,'rejeitad'],[/^acolho parcialmente (os|as|o|a) (.+?)(?=,|;| para |$)/,'parcialmente acolhid'],[/^acolho (os|as|o|a) (.+?)(?=,|;| para |$)/,'acolhid'],[/^não conheço (dos|das|do|da) (.+?)(?=,|;| e (?:rejeito|nego)|$)/,'não conhecid'],[/^julgo prejudicad[oa]s? (os|as|o|a) (.+?)(?=,|;|$)/,'prejudicad']];
  for(var i=0;i<R.length;i++){var m=R[i][0].exec(s);if(!m)continue;
    var art=m[1].replace(/^d/,'').replace(/^à$/,'a').replace(/^às$/,'as').replace(/^ao$/,'o').replace(/^aos$/,'os'),o=m[2].replace(/ e (à|ao|às|aos|a|o|os|as) /g,' e ').trim();
    var pl=/s$/.test(art)||/ e /.test(o),fem=/^a/.test(art),fim=R[i][1]+(fem?'a':'o')+(pl?'s':''),out=o.charAt(0).toUpperCase()+o.slice(1)+' '+fim;
    if(/efeitos (modificativos|infringentes)/.test(s))out+=', com efeitos modificativos';
    var resto=[];if(/corrijo/.test(s))resto.push('Erro material corrigido de ofício.');
    var m2=/ e (rejeito|nego provimento) /.exec(s);if(m2){var sub=xEmDisp(s.slice(m2.index+3));if(sub)resto.unshift(sub);}
    return out+'.'+(resto.length?' '+resto.join(' '):'');}
  return '';}
function xAuto(PT){AUTO={};var d=xDispTexto(PT);
  if(d){AUTO.resultado=xTerceira(d);var em=xEmDisp(d);if(em){AUTO['dispositivo da ementa']=em;AUTO['CONCLUSÃO']=em.split('.')[0].toUpperCase();}}
  xAutoCaso();}
/* variáveis do caso: vêm do processo informado (acervo) e do recorrente; valem na Peça e nos modelos-matriz */
var VARS_CASO=[['processo','Número do processo'],['CLASSE','Classe processual, do acervo'],['ASSUNTO','Assunto principal, do acervo'],['RAMO','Ramo do direito, pela árvore do CNJ'],
  ['polo ativo','Polo ativo, do acervo'],['polo passivo','Polo passivo, do acervo'],['recorrente','Recorrente informado na barra da peça'],['o autor / a autora','Recorrente, na forma da peça'],['a agravante','Agravante, na forma da peça'],
  ['resultado','Resultado, pelo dispositivo escolhido na peça'],['CONCLUSÃO','Conclusão do cabeçalho da ementa'],['dispositivo da ementa','Item IV da ementa, pelo dispositivo']];
function xAutoCaso(){
  if(XD.proc)AUTO.processo=XD.proc;
  if(XD.ac){if(XD.ac[0])AUTO.CLASSE=XD.ac[0].toUpperCase();if(XD.ac[1])AUTO.ASSUNTO=XD.ac[1].toUpperCase();if(XD.ac[2])AUTO['polo ativo']=XD.ac[2];if(XD.ac[3])AUTO['polo passivo']=XD.ac[3];
    /* ramo: raiz do assunto principal na árvore do CNJ; ED, agravo interno e agravo de instrumento levam também o processual civil */
    var mt=XD.ac[4];if(mt)AUTO.RAMO=mt==='PROCESSUAL CIVIL'?'DIREITO PROCESSUAL CIVIL':(/^(ed|agint|ai)$/.test(XP.v[XP.pc]||'')?'DIREITO PROCESSUAL CIVIL E '+mt:'DIREITO '+mt);}
  if(XD.rec){AUTO.recorrente=XD.rec;AUTO['o autor / a autora']=XD.rec;AUTO['a agravante']=XD.rec;}}
window.VDM_varsCaso=function(){var L=VARS_CASO.map(function(v){return {nome:v[0],d:v[1],v:AUTO[v[0]]||''};});
  Object.keys(PADR).forEach(function(k){L.push({nome:k,d:'Valor-padrão do gabinete',v:PADR[k]});});return L;};
function xAutoAplica(){if(!XP._PT)return;xAuto(XP._PT);$$('#x-main .fill').forEach(function(f){var k=f.getAttribute('data-fk');if(FILL[k]||document.activeElement===f)return;var n=f.getAttribute('data-ph'),v=AUTO[n]||PADR[n]||'';if(f.textContent!==v)f.textContent=v;f.classList.toggle('ok',!!v);f.classList.toggle('auto',!!v);});}
function xRascunho(){clearTimeout(xRascunho._t);xRascunho._t=setTimeout(function(){try{var F={};Object.keys(FILL).forEach(function(k){if(!/^mod-|^par:/.test(k))F[k]=FILL[k];});localStorage.setItem(XRK,JSON.stringify({pc:XP.pc,v:XP.v,alt:XP.alt,abre:XP.abre,fora:XP.fora,res:XP.res,mrec:XP.mrec,vb:XP.vb,d:{proc:XD.proc,rec:XD.rec},F:F}));}catch(e){}},400);}
(function(){try{var r=JSON.parse(localStorage.getItem(XRK)||'null');if(!r)return;['pc','v','alt','abre','fora','res','mrec','vb'].forEach(function(k){if(r[k])XP[k]=r[k];});if(r.F)Object.keys(r.F).forEach(function(k){FILL[k]=r.F[k];});if(r.d){XD.proc=r.d.proc||'';XD.rec=r.d.rec||'';}}catch(e){}})();
function xLimpar(){XP.alt={};XP.abre={};XP.fora={};XP.res={};XP.vb={};XP.sel=null;Object.keys(FILL).forEach(function(k){if(!/^mod-|^par:/.test(k))delete FILL[k];});XD={proc:'',rec:'',ac:null,naoAchou:false};xRascunho();xPagina();toast('Peça limpa');}
function xNumProc(s){var d=String(s||'').replace(/\D/g,'');return d.length===20?d.slice(0,7)+'-'+d.slice(7,9)+'.'+d.slice(9,13)+'.'+d.slice(13,14)+'.'+d.slice(14,16)+'.'+d.slice(16):String(s||'').trim();}
function xBuscaProc(){if(!XD.proc){XD.ac=null;XD.naoAchou=false;xPagina();return;}base().then(function(B){var n=xNumProc(XD.proc);XD.proc=n;XD.ac=(B.ac&&(B.ac[n]||B.ac[n.replace(/\D/g,"")]))||null;XD.naoAchou=!XD.ac;xRascunho();xPagina();}).catch(function(){XD.naoAchou=true;xPagina();});}
/* conferência antes de copiar ou baixar: campos em aberto, [VALIDAR], alertas e correções das diretrizes */
function xConfere(D){var it=[],AL=regs('alerta'),CO=regs('correcao');
  function rx(r){try{return new RegExp(r.padrao,String(r.flags||'').replace(/g/g,''));}catch(e){return null;}}
  D.forEach(function(pt){pt.itens.forEach(function(x){var t=String(x.txt||''),m=t.match(/[^]*/g);
    if(m)it.push({g:'Campos em aberto',k:x.k,n:x.n,d:m.length+(m.length>1?' campos: ':' campo: ')+m.slice(0,3).map(function(z){return z.slice(1,-1);}).join(', ')+(m.length>3?'…':'')});
    if(/\[VALIDAR/.test(t))it.push({g:'A validar',k:x.k,n:x.n,d:'Trecho marcado [VALIDAR]'});
    var pl=t.replace(/[^]*/g,' ');
    AL.forEach(function(r){var esc0=r.escopo;if(esc0&&esc0!==pt.parte&&!(esc0==='voto'&&pt.parte==='monocratica'))return;var re=rx(r);if(re&&re.test(pl))it.push({g:'Redação',k:x.k,n:x.n,d:r.mensagem||r.id});});
    CO.forEach(function(r){var re=rx(r);if(re&&re.test(pl))it.push({g:'Redação',k:x.k,n:x.n,d:r.motivo||r.id});});});});
  return it;}
function xAntes(D,acao){var it=xConfere(D);if(!it.length){acao();return;}XP._acao=acao;
  var G={};it.forEach(function(x){(G[x.g]=G[x.g]||[]).push(x);});
  var h='<div class="xconf" role="dialog" aria-label="Conferência da peça"><div class="xconfc"><h3>Antes de copiar</h3><p class="meta">'+['Campos em aberto','A validar','Redação'].filter(function(g){return G[g];}).map(function(g){return G[g].length+' '+g.toLowerCase();}).join(' · ')+'. Clique num item para ir ao trecho.</p>'+
    ['Campos em aberto','A validar','Redação'].filter(function(g){return G[g];}).map(function(g){return '<div class="xgk">'+g+'</div><ul>'+G[g].slice(0,40).map(function(x){return '<li><button data-xir="'+esc(x.k||'')+'"><b>'+esc(x.n||'Trecho')+'</b> · '+xFm(x.d)+'</button></li>';}).join('')+'</ul>';}).join('')+
    '<div class="e-dacts"><button class="btn" data-xsegue>Continuar assim mesmo</button><button class="btn ghost" data-xvoltaconf>Voltar à peça</button></div></div></div>';
  var o=document.createElement('div');o.id='xconf';o.innerHTML=h;document.body.appendChild(o);var b=o.querySelector('[data-xvoltaconf]');if(b)b.focus();}
function xConfFecha(){var o=$('#xconf');if(o)o.remove();}
document.addEventListener('click',function(e){if(!e.target.closest('#xconf'))return;var b;
  if(e.target.closest('[data-xsegue]')){xConfFecha();if(XP._acao)XP._acao();XP._acao=null;return;}
  if(e.target.closest('[data-xvoltaconf]')||e.target.classList.contains('xconf')){xConfFecha();return;}
  if((b=e.target.closest('[data-xir]'))){xConfFecha();var k=b.getAttribute('data-xir'),el=k&&document.querySelector('#x-main [data-xk="'+CSS.escape(k)+'"]');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('flash');setTimeout(function(){el.classList.remove('flash');},1600);}}});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('#xconf'))xConfFecha();});
/* barra fixa: variante, resultado, dados da peça e ações */
function xBarra(){
  var v=XP.v[XP.pc],rec=xRecAtual(),MX=rec?xMats(XP.pc,rec):[],cur=xMatAtual(),desp=XP.pc==='decisao'&&v==='desp';
  function opt(m){return '<option value="'+esc(m.id)+'"'+(cur&&cur.id===m.id?' selected':'')+'>'+esc(xCap(m.resultado))+(m.padrao?'':' · '+xMatN(m))+'</option>';}
  var h='<div class="xbar"><label class="xbs"><span>Variante</span><select data-xsv>'+XPECAS[XP.pc].var.map(function(o){return '<option value="'+o[0]+'"'+(v===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label>';
  if(XP.pc==='decisao'&&v==='mono')h+='<label class="xbs"><span>Recurso</span><select data-xsrec>'+XRECN.map(function(o){return '<option value="'+o[0]+'"'+(XP.mrec===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label>';
  if(MX.length){var fr=MX.filter(function(m){return m.padrao||xMatN(m)>=50;}),ou=MX.filter(function(m){return !(m.padrao||xMatN(m)>=50);});
    h+='<label class="xbs"><span>'+(desp?'Padrão':'Resultado')+'</span><select data-xsres><option value="">'+(desp?'Despacho geral':'Estrutura geral')+'</option>'+(fr.length?'<optgroup label="Mais frequentes">'+fr.map(opt).join('')+'</optgroup>':'')+(ou.length?'<optgroup label="Menos frequentes">'+ou.map(opt).join('')+'</optgroup>':'')+'</select></label>';}
  h+='<label class="xbs"><span>Processo</span><input data-xproc placeholder="nº do processo" value="'+esc(XD.proc)+'" size="24" inputmode="numeric"></label>';
  h+='<label class="xbs"><span>Recorrente</span><input data-xrecp list="xrecl" placeholder="quem recorre" value="'+esc(XD.rec)+'" size="16"><datalist id="xrecl">'+['a parte autora','o autor','a autora','o INSS','a União','a Caixa Econômica Federal','a Fazenda Nacional','a parte ré'].map(function(x){return '<option value="'+x+'">';}).join('')+'</datalist></label>';
  h+='<span class="xbsp"></span><span class="xdl"><button class="btn" data-xcp title="Peça inteira, com os títulos, para colar fora do PJe">Copiar peça</button><button class="btn ghost" data-xdocx title="Baixar a peça em Word">.docx</button><button class="btn ghost" data-xpdf title="Salvar a peça em PDF">PDF</button><button class="btn ghost" data-xlimpar title="Desfazer escolhas, campos e dados desta peça">Limpar</button></span></div>';
  if(XD.ac)h+='<div class="xbinfo">'+esc([XD.ac[0],XD.ac[1],[XD.ac[2],XD.ac[3]].filter(Boolean).join(' × ')].filter(Boolean).join(' · '))+'</div>';
  else if(XD.proc&&XD.naoAchou)h+='<div class="xbinfo meta">Processo não localizado no acervo do gabinete; os campos seguem manuais.</div>';
  return h;}
function xRegrasIn(t){var ai=Math.min(XP.alt[t.k]||0,Math.max(0,t.alts.length-1)),rr=(t.r||[]).concat((t.alts[ai]||{}).r||[]);
  return '<div class="xnt-in">'+(rr.length?xLista(rr.map(function(r){return '<li>'+xFm(r)+'</li>';})):'<p class="meta" style="margin:0">Sem regra específica além da fórmula.</p>')+(window.VDM_EDITOR&&xBY()[t.pid]?'<button class="e-mini ed-in" data-edpec="'+esc(t.pid)+'">Editar esta peça</button>':'')+'</div>';}
function xPagina(){
  var PT=xPartes(),v=XP.v[XP.pc],h='',aposVoc=false;XP._PT=PT;xAuto(PT);var FMT=((ED.pecas.forma.filter(function(f){return f.t==='Formatação para o PJe';})[0]||{}).r)||[];
  PT.forEach(function(pt){
    h+=PT.length>1?'<div class="xpj" id="xp-'+pt.id+'">'+pt.pj+' <small>(inserido pelo PJe)</small><button class="xpjc" data-xcpp="'+pt.id+'" title="Copiar '+esc(pt.t.toLowerCase())+', com a formatação do PJe" aria-label="Copiar '+esc(pt.t.toLowerCase())+'"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button></div>':'<div id="xp-'+pt.id+'"></div>';
    pt.tr.forEach(function(t){
      if(t.n==='Sentença'&&sentNaAbertura(pt.tr,XP.alt))return;
      if(XP.fora[t.k]){h+='<button class="xopc fora" data-xvolta="'+esc(t.k)+'">+ '+esc(t.n)+' <small>· retirado</small></button>';return;}
      if(t.opc&&!XP.abre[t.k]){h+='<button class="xopc" data-xabre="'+esc(t.k)+'">+ '+esc(t.n)+' <small>· opcional</small></button>';return;}
      var E=escolha(t,XP.alt),ai=E.ai,a=E.a,min=false;
      if(aposVoc&&a.f){min=true;aposVoc=false;a={lab:a.lab,f:a.f.charAt(0).toLowerCase()+a.f.slice(1),r:a.r};}
      var ph=aposVoc&&!a.f;if(t.n==='Vocativo')aposVoc=true;else if(ph)aposVoc=false;
      h+='<div class="xblk'+(XP.sel===t.k?' on':'')+'" data-xk="'+esc(t.k)+'"><span class="xtg">'+(semRotulo(pt.id,t.n)?'':esc(t.n))+(t.opc?'<br><span class="xop" data-xfecha="'+esc(t.k)+'">recolher</span>':xFixo(pt.id,t)?'':'<br><span class="xop xret" data-xfora="'+esc(t.k)+'" title="Retirar da peça, da cópia e do .docx">retirar</span>')+'</span>'+
        (t.alts.length>1?(function(){var nb=t.alts.filter(function(x){return !x.base;}).length,hb=nb&&nb<t.alts.length,vb=XP.vb[t.k]||(t.alts[ai]&&t.alts[ai].base);return '<div class="xalt">'+t.alts.map(function(x,i){if(x.base&&hb&&!vb)return '';return '<button'+(x.base&&hb?' class="b"':'')+' data-xalt="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===ai)+'">'+esc(x.lab)+'</button>';}).join('')+(hb?'<button class="xbtog" data-xbase="'+esc(t.k)+'">'+(vb?'menos':'+ '+(t.alts.length-nb)+' da base')+'</button>':'')+'</div>';})():'')+subSel(t,E,'data-xsub')+
        (pt.id==='ementa'&&/^[IV]+\./.test(t.n)?'<p class="em"><b>'+esc(t.n)+'</b></p>':'')+
        (a.f?xParas(a.f,pt.id,t.n,min&&!/^\s*(\[|\{\{|…)/.test(a.f)?' <span class="xop" title="Primeiro parágrafo após o vocativo">inicia em minúscula</span>':'',{k:t.k+'@'+E.key,i:0,auto:true}):(pt.id==='ementa'&&/^[IV]+\./.test(t.n)?(t.r.length?'<p class="xph em">'+esc(t.r[0])+'</p>':''):'<p class="xph'+(pt.id==='ementa'?' em':' std')+'">'+(ph?'em minúscula · ':'')+esc(t.n)+(t.r.length?': '+esc(t.r[0]):'')+'</p>'))+(t.info?'<details class="xinfo-d"'+(XP.sel===t.k?' open':'')+'><summary>Tabela de referência</summary>'+xInfo(t.info)+'</details>':'')+(XP.sel===t.k?xRegrasIn(t):'')+'</div>';});
  });
  /* esquerda: peças, sumário e orientações */
  var sel=null;PT.forEach(function(pt){pt.tr.forEach(function(t){if(t.k===XP.sel)sel={t:t,pt:pt};});});
  var g='';
  if(!sel)g+='<p class="meta" style="margin:0 0 6px">Clique num trecho da folha para ver as regras dele logo abaixo do trecho.</p>';
  var DF=estiloItens().filter(function(r){return r.g==='F. Dispositivo e fecho';});
  PT.forEach(function(pt){
    var bl='',es=estruturaRegras(pt.id),mc=MANG[pt.id]?manCap('02').filter(function(r){return r['Grupo']===MANG[pt.id];}):[];
    if(pt.res)bl+='<p class="meta" style="margin:0 0 4px">'+esc(pt.res)+'</p>';
    if(es.length)bl+='<div class="xgk">Estrutura</div>'+xLista(es.map(function(r){return '<li><b>'+esc(r.titulo)+'.</b> '+xFm(r.pref||'')+(r.ev?' <span class="xev">Evitar: '+xFm(r.ev)+'</span>':'')+'</li>';}));
    if(pt.notas&&pt.notas.length)bl+='<div class="xgk">Notas</div>'+xLista(pt.notas.map(function(x){return '<li>'+xFm(x)+'</li>';}));
    if(pt.id==='voto'&&DF.length)bl+='<div class="xgk">Dispositivo e fecho</div>'+xLista(DF.map(function(r){return '<li><b>'+esc(r.titulo||'')+'.</b> '+xFm(r.pref||'')+(r.ev?' <span class="xev">Evitar: '+xFm(r.ev)+'</span>':'')+'</li>';}));
    if(mc.length)bl+='<div class="xgk">Regras complementares</div>'+xLista(mc.map(function(r){return '<li><b>'+esc(r['Título']||'')+'.</b> '+xFm(r['Orientação']||'')+(r['Evitar']?' <span class="xev">Evitar: '+xFm(r['Evitar'])+'</span>':'')+'</li>';}));
    if(pt.ex)bl+='<p style="margin:6px 0 0"><button class="btn" data-xex>Ver modelos-matriz de decisão monocrática →</button></p>';
    if(bl)g+='<details class="xgd"'+((sel&&sel.pt.id===pt.id)||PT.length===1?' open':'')+'><summary>'+esc(pt.t)+'</summary>'+bl+'</details>';});
  var fm=XP.pc==='acordao'?(sel&&sel.pt.id==='ementa'?[FMT[0],FMT[2],FMT[3]]:[FMT[0],FMT[1],FMT[3]]):[FMT[0],FMT[1]];
  g+='<details class="xgd"><summary>Formatação</summary>'+xLista(fm.filter(Boolean).map(function(x){return '<li>'+xFm(x)+'</li>';}))+'</details>';
  var TS=(ED.pecas.tensoes||[]),PR=manCap('08');
  if(TS.length||PR.length)g+='<details class="xgd"><summary>Tensões entre orientações <small>'+(TS.length+PR.length)+'</small></summary>'+TS.map(function(t){return '<div class="xten"><b>'+esc(t.t)+' <mark class="v">[VALIDAR]</mark></b><p><span class="xlb">A</span>'+xFm(t.a)+'</p><p><span class="xlb">B</span>'+xFm(t.b)+'</p></div>';}).join('')+(PR.length?'<div class="xgk">Propostas em avaliação · não vigentes</div>'+xLista(PR.map(function(r){return '<li><b>'+esc(r['Título']||'')+'.</b> '+xFm(r['Orientação']||'')+'</li>';})):'')+'</details>';
  var side='<div class="lab" style="margin-top:0">Peças</div><div class="glist">'+Object.keys(XPECAS).map(function(k){return '<button data-xpc="'+k+'" aria-pressed="'+(XP.pc===k)+'"><span>'+XPECAS[k].t+'</span><small>'+XPECAS[k].var.length+' variantes</small></button>';}).join('')+'</div>';
  if(PT.length>1)side+='<div class="lab">Sumário</div><div class="glist">'+PT.map(function(pt){return '<button data-xgo="'+pt.id+'"><span>'+pt.t+'</span><small>'+pt.tr.filter(function(t){return !t.opc&&!xSai(t,pt.tr,XP.alt,XP.fora);}).length+'</small></button>';}).join('')+'</div>';
  side+='<div class="lab">Orientações da peça</div>'+g;
  var as=$('#x-aside'),st=as.scrollTop;as.innerHTML=side;as.scrollTop=st;
  $('#x-main').innerHTML=xBarra()+'<div class="xsheet">'+h+'</div>';
  xRef();
  xRascunho();
}
function xCap(t){t=String(t||'');return t.charAt(0).toUpperCase()+t.slice(1);}
function xResRow(){
  var v=XP.v[XP.pc],rec=xRecAtual(),h='';
  if(XP.pc==='decisao'&&v==='mono')h+='<div class="xvar xres"><span class="meta">Recurso</span>'+XRECN.map(function(x){return '<button data-xrec="'+x[0]+'" aria-pressed="'+(XP.mrec===x[0])+'">'+x[1]+'</button>';}).join('')+'</div>';
  var MX=rec?xMats(XP.pc,rec):[],cur=xMatAtual();
  if(MX.length)h+='<div class="xvar xres"><span class="meta">'+(XP.pc==='decisao'&&v==='desp'?'Padrão':'Resultado')+'</span><button data-xres="" aria-pressed="'+(!cur)+'" title="Estrutura-base, sem resultado definido">'+(XP.pc==='decisao'&&v==='desp'?'Despacho geral':'Estrutura geral')+'</button>'+MX.map(function(m){return '<button data-xres="'+esc(m.id)+'" aria-pressed="'+(!!cur&&cur.id===m.id)+'" title="'+esc(m.padrao?m.nome:xMatN(m)+' decisões da Turma')+'">'+esc(xCap(m.resultado))+'</button>';}).join('')+'</div>';
  return h;}
/* direita: consulta (parágrafos, citação, vocabulário, forma) */
function xRefTab(tab){
  var q=nz(XP.q),f=function(){return !q||nz([].slice.call(arguments).join(' ')).indexOf(q)>=0;},h='',n=0;
  function item(t,o,e,obs){return '<div class="xri">'+(t?'<b>'+esc(t)+'</b>':'')+(o?'<p><span class="xlb ok">Preferir</span>'+xFm(o)+'</p>':'')+(e?'<p><span class="xlb no">Evitar</span>'+xFm(e)+'</p>':'')+(obs?'<p class="meta" style="margin:2px 0 0">'+xFm(obs)+'</p>':'')+'</div>';}
  function grp(t,c){return '<div class="xrg">'+esc(t)+' <small>'+c+'</small></div>';}
  var FF={};ED.pecas.forma.forEach(function(x){FF[x.t]=x.r;});
  if(tab==='par'){var R=redacaoItens().filter(function(r){return f(r.titulo,r.pref,r.ev,r.obs);}),gs=[];R.forEach(function(r){if(gs.indexOf(r.rg)<0)gs.push(r.rg);});
    RED_ORD.filter(function(x){return gs.indexOf(x)>=0;}).concat(gs.filter(function(x){return RED_ORD.indexOf(x)<0;})).forEach(function(gr){var A=R.filter(function(r){return r.rg===gr;});n+=A.length;h+=grp(PAR_TIT[gr]||gr,A.length)+A.map(function(r){return item(r.titulo,r.pref,r.ev,r.obs);}).join('');});}
  else if(tab==='cit'){var F=(FF['Citação de precedente']||[]).filter(function(x){return f(x);}),CI=estiloItens().filter(function(r){return r.g==='E. Citação'&&f(r.titulo,r.pref,r.ev);}),M3=manCap('03').filter(function(r){return f(r['Título'],r['Orientação'],r['Evitar'],r['Observação']);});n=F.length+CI.length+M3.length;
    if(F.length)h+=grp('Forma da citação',F.length)+'<div class="xri fo"><span class="xlb ok">Usar</span>'+xLista(F.map(function(x){return '<li>'+xFm(x)+'</li>';}))+'</div>';
    if(CI.length+M3.length)h+=grp('Regras',CI.length+M3.length)+CI.map(function(r){return item(r.titulo,r.pref,r.ev);}).join('')+M3.map(function(r){return item(r['Título'],r['Orientação'],r['Evitar'],r['Observação']);}).join('');}
  else if(tab==='voc'){var TI=termosIntegrados().filter(function(r){return !ehGrafia(r)&&f(r.ad,r.ev.join(' '),r.obs.join(' '));}),CV=conectivosVerbos(),C=CV.C.filter(function(r){return f(r.a,r.b,r.uso);}),V=CV.V.filter(function(r){return f(r.a,r.b,r.c,r.uso);});
    var RS=[['Recurso','provido / desprovido'],['Embargos de declaração','acolhidos / rejeitados'],['Mandado de segurança','segurança concedida / denegada']].filter(function(r){return f(r[0],r[1]);});n=TI.length+C.length+V.length+RS.length;
    if(TI.length)h+=grp('Termos',TI.length)+'<table class="xrt"><thead><tr><th class="ok">Adotar</th><th class="no">Evitar</th></tr></thead><tbody>'+TI.map(function(r){return '<tr><td class="tok">'+(r.ad?esc(r.ad):'—')+(r.conf?'<div class="meta"><mark class="v">[VALIDAR]</mark> orientação oposta: “'+esc(r.conf)+'”</div>':'')+(r.obs.length?'<div class="meta">'+esc(r.obs.join(' '))+'</div>':'')+'</td><td class="tno">'+esc(r.ev.join(' · '))+'</td></tr>';}).join('')+'</tbody></table>';
    if(C.length)h+=grp('Conectivos e transições',C.length)+'<table class="xrt"><tbody>'+C.map(function(r){return '<tr><td><b>'+esc(r.a)+'</b></td><td>'+esc(r.b||'')+(r.uso?'<div class="meta">'+esc(r.uso)+'</div>':'')+'</td></tr>';}).join('')+'</tbody></table>';
    if(V.length)h+=grp('Verbos e construções',V.length)+'<table class="xrt"><tbody>'+V.map(function(r){return '<tr><td><b>'+esc(r.a)+'</b></td><td>'+esc([r.b,r.c,r.uso].filter(Boolean).join(' · '))+'</td></tr>';}).join('')+'</tbody></table>';
    if(RS.length)h+=grp('Verbos de resultado',RS.length)+'<table class="xrt"><tbody>'+RS.map(function(r){return '<tr><td><b>'+esc(r[0])+'</b></td><td>'+esc(r[1])+'</td></tr>';}).join('')+'</tbody></table>';}
  else{var G=termosIntegrados().filter(function(r){return ehGrafia(r)&&f(r.ad,r.ev.join(' '),r.obs.join(' '));}),N=(ED.normas||[]).filter(function(r){return f(r.sigla,r.nome,r.prosa,(r.aliases||[]).join(' '));}),FR=(FF['Normas e referências']||[]).concat(FF['Enumeração e remissões']||[]).filter(function(x){return f(x);});n=G.length+N.length+FR.length;
    if(G.length)h+=grp('Grafias',G.length)+'<table class="xrt"><thead><tr><th class="ok">Grafar</th><th class="no">Evitar</th></tr></thead><tbody>'+G.map(function(r){return '<tr><td class="tok">'+esc(r.ad||'—')+(r.obs.length?'<div class="meta">'+esc(r.obs.join(' '))+'</div>':'')+'</td><td class="tno">'+esc(r.ev.join(' · '))+'</td></tr>';}).join('')+'</tbody></table>';
    if(N.length)h+=grp('Grafia de normas',N.length)+'<table class="xrt"><tbody>'+N.map(function(r){return '<tr><td><b>'+esc(r.sigla)+'</b><div class="meta">'+esc(r.nome)+'</div></td><td>'+esc(r.prosa)+'</td></tr>';}).join('')+'</tbody></table>';
    if(FR.length)h+=grp('Normas, referências e remissões',FR.length)+'<div class="xri">'+xLista(FR.map(function(x){return '<li>'+xFm(x)+'</li>';}))+'</div>';}
  return {h:h,n:n};
}
function xRef(){
  var T=[['par','Parágrafos'],['cit','Citação'],['voc','Vocabulário'],['forma','Forma']],R={};T.forEach(function(t){R[t[0]]=xRefTab(t[0]);});
  var el=$('#x-ref'),foco=document.activeElement&&document.activeElement.id==='x-rq',pos=foco?document.activeElement.selectionStart:0;
  el.innerHTML='<div class="xrtabs" role="tablist">'+T.map(function(t){return '<button role="tab" data-xrt="'+t[0]+'" aria-selected="'+(XP.tab===t[0])+'">'+t[1]+(XP.q?' <small>'+R[t[0]].n+'</small>':'')+'</button>';}).join('')+'</div><input id="x-rq" type="search" placeholder="Buscar nas orientações…" aria-label="Buscar nas orientações" value="'+esc(XP.q)+'"><div class="xrb">'+(R[XP.tab].h||'<p class="meta">Nada encontrado.</p>')+'</div>';
  if(foco){var q=$('#x-rq');q.focus();try{q.setSelectionRange(pos,pos);}catch(e){}}
}
function xCopiar(qual){var D=rcEditorial();if(qual)D=D.filter(function(pt){return pt.parte===qual;});xAntes(D,function(){copiarRico(D,!qual&&D.length>1,qual?'Parte copiada com a formatação do PJe':'Peça copiada com a formatação do PJe');});}
$('#v-edit').addEventListener('click',function(e){
  var b;
  if(e.target.closest('.ref')||e.target.closest('.fill'))return;
  if((b=e.target.closest('[data-xpc]'))){XP.pc=b.getAttribute('data-xpc');XP.sel=null;xPagina();return;}
  if((b=e.target.closest('[data-xv]'))){XP.v[XP.pc]=b.getAttribute('data-xv');XP.sel=null;xPagina();return;}
  if((b=e.target.closest('[data-xres]'))){XP.res[XP.pc+':'+xRecAtual()+':'+XP.v[XP.pc]]=b.getAttribute('data-xres');XP.sel=null;xPagina();return;}
  if((b=e.target.closest('[data-xrec]'))){XP.mrec=b.getAttribute('data-xrec');XP.sel=null;xPagina();return;}
  if((b=e.target.closest('[data-xgo]'))){var el=document.getElementById('xp-'+b.getAttribute('data-xgo'));if(el)el.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if((b=e.target.closest('[data-xsub]'))){XP.alt[b.getAttribute('data-xsub')+'/s']=+b.getAttribute('data-i');XP.sel=b.getAttribute('data-xsub');xPagina();return;}
  if((b=e.target.closest('[data-xalt]'))){XP.alt[b.getAttribute('data-xalt')]=+b.getAttribute('data-i');XP.sel=b.getAttribute('data-xalt');xPagina();return;}
  if((b=e.target.closest('[data-xabre]'))){XP.abre[b.getAttribute('data-xabre')]=1;XP.sel=b.getAttribute('data-xabre');xPagina();return;}
  if((b=e.target.closest('[data-xfecha]'))){delete XP.abre[b.getAttribute('data-xfecha')];XP.sel=null;xPagina();return;}
  if((b=e.target.closest('[data-xfora]'))){XP.fora[b.getAttribute('data-xfora')]=1;XP.sel=null;xPagina();return;}
  if((b=e.target.closest('[data-xvolta]'))){delete XP.fora[b.getAttribute('data-xvolta')];XP.sel=b.getAttribute('data-xvolta');xPagina();return;}
  if((b=e.target.closest('[data-xrt]'))){XP.tab=b.getAttribute('data-xrt');xRef();return;}
  if((b=e.target.closest('[data-xcpp]'))){xCopiar(b.getAttribute('data-xcpp'));return;}
  if(e.target.closest('[data-xcp]')){xCopiar();return;}
  if(e.target.closest('[data-xdocx]')||e.target.closest('[data-xpdf]')){var D=rcEditorial(),mx0=xMatAtual(),nm=XPECAS[XP.pc].t+' '+(XPECAS[XP.pc].var.filter(function(z){return z[0]===XP.v[XP.pc];})[0]||['',''])[1]+(mx0?' '+mx0.resultado:'')+(XD.proc?' '+XD.proc:''),fn=e.target.closest('[data-xdocx]')?baixarDocx:baixarPdf;xAntes(D,function(){fn(D,D.length>1,'',nm);});return;}
  if(e.target.closest('[data-xex]')){irModelos('Decisão');return;}
  if((b=e.target.closest('[data-xbase]'))){var kb=b.getAttribute('data-xbase');XP.vb[kb]=!XP.vb[kb];xPagina();return;}
  if(e.target.closest('[data-xlimpar]')){xLimpar();return;}
  if(e.target.closest('select,input,summary,.xbar'))return;
  if((b=e.target.closest('.xblk'))){var k=b.getAttribute('data-xk');XP.sel=XP.sel===k?null:k;
    if(XP.sel){var tn=(b.querySelector('.xtg')||{}).textContent||'';if(/Precedente|Cita|Jurisprud/i.test(tn))XP.tab='cit';else if(/Dispositivo|Síntese|Conclus/i.test(tn))XP.tab='voc';}
    xPagina();}
});
$('#v-edit').addEventListener('change',function(e){var t=e.target;
  if(t.matches('[data-xsv]')){XP.v[XP.pc]=t.value;XP.sel=null;xPagina();}
  else if(t.matches('[data-xsrec]')){XP.mrec=t.value;XP.sel=null;xPagina();}
  else if(t.matches('[data-xsres]')){XP.res[XP.pc+':'+xRecAtual()+':'+XP.v[XP.pc]]=t.value;XP.sel=null;xPagina();}
  else if(t.matches('[data-xproc]')){XD.proc=t.value.trim();xBuscaProc();}
  else if(t.matches('[data-xrecp]')){XD.rec=t.value.trim();xRascunho();xPagina();}});
$('#v-edit').addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.matches&&e.target.matches('[data-xproc],[data-xrecp]')){e.preventDefault();e.target.blur();}});
$('#v-edit').addEventListener('input',function(e){if(e.target.id!=='x-rq')return;clearTimeout(xRef._t);var v=e.target.value;xRef._t=setTimeout(function(){XP.q=v.trim();xRef();},160);});


/* ================= SÉRIE HISTÓRICA E BUSCA =================
   Base integral: os julgados curados (procs-muta · precedentes) + a série histórica do Relator
   (precedentes/jurisprudencia: 1999-2026, acórdãos e monocráticas), publicada no site em /jurisprudencia/.
   Busca: termos soltos = todos (E); OU entre termos; "frase exata"; -termo exclui; radical* (aposentad*);
   sem diferença de acento e maiúsculas; artigos e preposições soltos são ignorados.
   Índice: número, classe, órgão, ementa, resultado e catalogação, na hora.
   Texto integral: ementa e inteiro teor; baixa só os arquivos anuais do recorte (filtros e período). */
var SER={base:null,ok:false,erro:'',n:0,man:null};
var FT={cache:{},ordem:[],tok:0};
var STOP={de:1,da:1,do:1,das:1,dos:1,e:1,o:1,a:1,os:1,as:1,em:1,no:1,na:1,nos:1,nas:1,ao:1,aos:1,para:1,por:1,com:1,que:1,se:1,um:1,uma:1};
function baixaGz(url){
  return fetch(url,{cache:'force-cache'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();}).then(function(b){
    var u=new Uint8Array(b);
    if(u[0]===0x1f&&u[1]===0x8b){if(typeof DecompressionStream==='undefined')throw new Error('navegador sem descompressão');return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();}
    return new TextDecoder('utf-8').decode(u);});
}
function titulo1(s){return String(s||'').toLowerCase().replace(/(^|\s|\/)(\S)/g,function(m,a,b){return a+b.toUpperCase();}).replace(/\b(De|Da|Do|Das|Dos|E|Em|Ou)\b/g,function(w){return w.toLowerCase();});}
function isoBr(s){var m=/^(\d{2})\/(\d{2})\/(\d{4})/.exec(s||'');return m?m[3]+'-'+m[2]+'-'+m[1]:(s||'');}
function deSerie(r){
  var x={id:r.id,sid:r.id,serie:1,t:r.t==='A'?'A':'M',n:r.n,c:r.c||'',cl:titulo1(r.cl),o:r.o||'',d:r.d||'',p:isoBr(r.p),e:r.e||'',r:r.r||'',
    temas:'',tese:'',disp:'',jur:'',it:r.k==='integral',tags:[],sub:'',esp:'',ano:r.y||String(r.d||'').slice(0,4)};
  x.y=(x.d||'').slice(0,7);x._apr=apreciacao({ementa:x.e,resultado:x.r,classeSigla:x.c});ramoAss(x);x._rd='';
  x._res=x.r?classRes(x.r):'Sem classificação';
  if(r.rl)x.rl=r.rl;if(r.g)x.gab=r.g;
  x._q=nz([x.n,x.c,x.cl,x.o,x.e,x.r,x._ass,x.rl||''].join(' '));if(x.c&&x.cl&&!E.clsNome[x.c])E.clsNome[x.c]=x.cl;return x;
}
function serie(cur){
  SER.base=/^https?:/.test(location.protocol)?(window.EMENT_FONTE||'/jurisprudencia/'):null;
  if(!SER.base){SER.erro='a série histórica só abre no site';return;}
  Promise.all([baixaGz(SER.base+'indice.json.gz').then(JSON.parse),baixaGz(SER.base+'busca/indice.json').then(JSON.parse).catch(function(){return null;})]).then(function(v){
    var I=v[0],M=v[1],por={};SER.man=M&&M.arquivos||null;
    cur.forEach(function(x){por[String(x.n).replace(/\D/g,'')+'|'+x.d]=x;});
    var add=[];
    I.forEach(function(r){var k=String(r.n||'').replace(/\D/g,'')+'|'+(r.d||''),c=por[k];
      if(c){if(!c.sid){c.sid=r.id;c.ano=r.y||String(r.d||'').slice(0,4);}return;}
      add.push(deSerie(r));});
    E.idx=cur.concat(add).sort(function(a,b){return (b.d||'').localeCompare(a.d||'');});
    POR_ID=null;SER.ok=true;SER.n=I.length;
    if(E.q&&E.qm==='idx')E.qp=parseQ(E.q);
    if(EM.sub==='prec')render();
  }).catch(function(e){SER.erro=e.message;if(EM.sub==='prec')render();});
}
function reEsc(t){return t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function termoSrc(w){
  var pre=/\*$/.test(w);w=w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g,'');if(!w)return null;
  return '(?:^|[^a-z0-9])('+reEsc(w)+(pre?'[a-z0-9]*':'')+')'+(pre?'':'(?![a-z0-9])');
}
function fraseSrc(f){var ws=nz(f).split(/[^a-z0-9]+/).filter(Boolean);if(!ws.length)return null;return '(?:^|[^a-z0-9])('+ws.map(reEsc).join('[^a-z0-9]+')+')(?![a-z0-9])';}
/* consulta → {cls: [[alternativas OU] E ...], nots: [...]} */
function parseQ(q){
  q=String(q||'').trim();if(!q)return null;
  var rx=/(-?)"([^"]*)"?|(\S+)/g,m,T=[];
  while((m=rx.exec(q)))T.push(m[2]!==undefined?{neg:!!m[1],ph:m[2]}:{w:m[3]});
  var cls=[],nots=[],ou=false,termos=[];
  T.forEach(function(t){
    if(t.w&&/^(ou|or|\|)$/i.test(t.w)){ou=cls.length>0;return;}
    var neg=t.ph!==undefined?t.neg:(t.w.length>1&&t.w[0]==='-');
    var w=t.w!==undefined?nz(neg?t.w.slice(1):t.w):null;
    if(w!==null&&!neg&&!ou&&STOP[w.replace(/[^a-z0-9]/g,'')]){return;}
    var src=t.ph!==undefined?fraseSrc(t.ph):termoSrc(w);if(!src){ou=false;return;}
    var o={src:src,re:new RegExp(src)};
    if(neg)nots.push(o);else{if(ou)cls[cls.length-1].push(o);else cls.push([o]);termos.push(o);}
    ou=false;
  });
  return cls.length||nots.length?{q:q,cls:cls,nots:nots,termos:termos}:null;
}
function casa(P,t){
  for(var i=0;i<P.cls.length;i++){var ok=false;for(var j=0;j<P.cls[i].length;j++)if(P.cls[i][j].re.test(t)){ok=true;break;}if(!ok)return false;}
  for(var k=0;k<P.nots.length;k++)if(P.nots[k].re.test(t))return false;
  return true;
}
function conta1(P,t){var n=0;P.termos.forEach(function(o){var g=new RegExp(o.src,'g'),m;while((m=g.exec(t))){n++;if(n>500)break;}});return n;}
/* trecho do texto original com os termos destacados (n = mesmo texto normalizado, mesmas posições) */
function trecho(orig,n,P,larg){
  if(!P||!P.termos.length)return '';
  if(n.length!==orig.length)orig=n;
  var M=[];P.termos.forEach(function(o,k){var g=new RegExp(o.src,'g'),m,c=0;while((m=g.exec(n))&&c<300){var ini=m.index+m[0].length-m[1].length;M.push([ini,ini+m[1].length,k]);c++;if(g.lastIndex===m.index)g.lastIndex++;}});
  if(!M.length)return '';
  M.sort(function(a,b){return a[0]-b[0];});
  /* janela com mais termos diferentes da busca (e, no empate, mais ocorrências): o trecho que interessa, não o cabeçalho */
  var L=larg||170,W=L*2.4,best=0,bd=-1,bc=-1;
  for(var i=0,j=0;i<M.length;i++){
    while(j<M.length&&M[j][0]-M[i][0]<=W)j++;
    var ks={},d=0;for(var q=i;q<j;q++)if(!ks[M[q][2]]){ks[M[q][2]]=1;d++;}
    if(d>bd||(d===bd&&j-i>bc)){bd=d;bc=j-i;best=i;}
    if(bd===P.termos.length&&bc>=P.termos.length*2)break;
  }
  var c0=M[best][0],i0=Math.max(0,c0-Math.round(L*0.5)),i1=Math.min(orig.length,c0+W+Math.round(L*0.4)),h='',p=i0;
  var sp=orig.lastIndexOf(' ',i0+12);if(sp>i0-20&&sp>0&&sp<c0)i0=sp+1,p=i0;
  M.forEach(function(r){if(r[0]<p||r[1]>i1)return;h+=esc(orig.slice(p,r[0]))+'<mark>'+esc(orig.slice(r[0],r[1]))+'</mark>';p=r[1];});
  h+=esc(orig.slice(p,i1));
  return (i0>0?'…':'')+h.replace(/\u2029+/g,' ¶ ')+(i1<orig.length?'…':'');
}
function trechoLinha(x){
  if(E.ft){var hh=E.ft.hits[x.id]||(x.sid&&E.ft.hits[x.sid]);return hh?hh.sn+(hh.n>1?' <small class="e-snn">'+n0(hh.n)+' ocorrências</small>':''):'';}
  if(E.qp){var e=prev(x);return trecho(e,nz(e),E.qp,110);}
  return '';
}
function avalia(P,orig,n){if(!casa(P,n))return null;return {n:conta1(P,n),sn:trecho(orig,n,P)};}
function arquivoTxt(nome){
  if(FT.cache[nome])return Promise.resolve(FT.cache[nome]);
  return baixaGz(SER.base+'busca/'+nome+'.txt.gz').then(function(t){var n=nz(t);var o={t:t,n:n.length===t.length?n:null};FT.cache[nome]=o;FT.ordem.push(nome);while(FT.ordem.length>8)delete FT.cache[FT.ordem.shift()];return o;});
}
function textoSerie(x){
  var nome=(x.serie&&x.t?x.t:x.sid.charAt(0))+'-'+x.ano;
  return arquivoTxt(nome).then(function(o){
    var t=o.t,i=t.indexOf('\n'+x.sid+'\t');if(i<0&&t.indexOf(x.sid+'\t')===0)i=-1;else if(i<0){x._itFalhou=1;return;}
    var a=i+1,b=t.indexOf('\n',a);var l=t.slice(a,b<0?t.length:b).split('\t');
    var em=(l[1]||'').replace(/\u2029/g,'\n'),it=(l[2]||'').replace(/\u2029/g,'\n');
    if(em&&x.serie)x.e=em;x._it=it||em;
  });
}
function buscar(){
  E.shown=60;E.sel=null;E.mmOpen=null;FT.tok++;
  if(!E.q){E.qp=null;E.ft=null;render();return;}
  if(E.qm!=='ft'){E.ft=null;E.qp=parseQ(E.q);render();return;}
  buscaIntegral();
}
function buscaIntegral(){
  var P=parseQ(E.q);if(!P){E.ft=null;render();return;}
  if(!P.cls.length){toast('Use ao menos um termo que não seja de exclusão');return;}
  var tok=FT.tok,base=E.idx.filter(function(x){return passa(x,'__q');}),cand={},need={};
  var ft={q:E.q,P:P,hits:{},lidos:0,total:0,busy:true,atual:''};
  base.forEach(function(x){
    if(x.sid&&SER.base){cand[x.sid]=1;need[(x.serie&&x.t?x.t:x.sid.charAt(0))+'-'+x.ano]=1;return;}
    var t=((BASE&&BASE.it&&BASE.it[x.id])||'');var o=(x.e||'')+'\u2029'+t,h=avalia(P,o,nz(o));if(h)ft.hits[x.id]=h;});
  var nomes=Object.keys(need).filter(function(k){return !SER.man||SER.man[k];}).sort().reverse();
  ft.total=nomes.length;E.ft=ft;E.qp=null;render();
  var i=0;
  (function prox(){
    if(tok!==FT.tok)return;
    if(i>=nomes.length){ft.busy=false;ft.atual='';render();return;}
    var nome=nomes[i];ft.atual=nome.replace('A-','acórdãos de ').replace('M-','monocráticas de ');render();
    arquivoTxt(nome).then(function(o){
      if(tok!==FT.tok)return;
      var t=o.t,n=o.n,p=0;
      while(p<t.length){
        var f=t.indexOf('\n',p);if(f<0)f=t.length;
        var a=t.indexOf('\t',p);
        if(a>p&&a<f){var id=t.slice(p,a);
          if(cand[id]){var tn=n?n.slice(a+1,f):nz(t.slice(a+1,f));if(casa(P,tn)){ft.hits[id]={n:conta1(P,tn),sn:trecho(t.slice(a+1,f),tn,P)};}}}
        p=f+1;
      }
      i++;ft.lidos=i;setTimeout(prox,0);
    }).catch(function(e){i++;ft.lidos=i;ft.falhas=(ft.falhas||0)+1;setTimeout(prox,0);});
  })();
}
var QAJ=false;
function qBar(){
  var el=$('#e-qmodo');if(!el)return;
  var ftOk=!!SER.base;
  el.innerHTML='<label><input type="radio" name="e-qm" value="idx"'+(E.qm!=='ft'?' checked':'')+'> <b>Índice</b> <small>número, classe, ementa e resultado · instantâneo</small></label>'+
    '<label'+(ftOk?'':' class="off" title="A busca no texto integral só funciona no site"')+'><input type="radio" name="e-qm" value="ft"'+(E.qm==='ft'?' checked':'')+(ftOk?'':' disabled')+'> <b>Texto integral</b> <small>ementa e inteiro teor · baixa os anos do recorte</small></label>'+
    '<span class="sp"></span>'+((E.qp||E.ft)?'<label class="e-ord">Ordenar <select id="e-ord"><option value="data"'+(E.ord!=='rel'?' selected':'')+'>mais recentes</option><option value="rel"'+(E.ord==='rel'?' selected':'')+'>mais ocorrências</option></select></label>':'')+
    '<button class="btn gold" id="e-qgo">Buscar</button><button class="btn" id="e-qaj" aria-expanded="'+QAJ+'" title="Como buscar">?</button>'+
    (QAJ?'<div class="e-qaj"><b>Como buscar</b><ul><li><code>aposentadoria especial ruído</code>: todos os termos, em qualquer ordem</li><li><code>"tempo especial"</code>: a frase exata</li><li><code>vigilante OU vigia</code>: um ou outro</li><li><code>aposentad*</code>: palavras que começam assim</li><li><code>-rural</code>: exclui quem tem o termo</li><li>Acentos e maiúsculas não importam; artigos e preposições soltos são ignorados.</li><li><b>Índice</b> procura na hora em número, classe, órgão, ementa e resultado. <b>Texto integral</b> procura também no inteiro teor: escolha antes o período e os filtros, para baixar menos anos.</li></ul></div>':'')+
    (SER.ok?'':SER.erro?'<div class="e-qinfo">Série histórica indisponível ('+esc(SER.erro)+'); a busca vale para os julgados curados.</div>':'<div class="e-qinfo">Carregando a série histórica (1999-2026)…</div>');
  $$('input[name="e-qm"]',el).forEach(function(r){r.onchange=function(){E.qm=r.value;clearTimeout(qT);E.q=$('#e-q').value.trim();if(E.q)buscar();else{E.qp=null;E.ft=null;render();}};});
  $('#e-qgo').onclick=function(){E.q=$('#e-q').value.trim();buscar();};
  $('#e-qaj').onclick=function(){QAJ=!QAJ;qBar();};
  var so=$('#e-ord');if(so)so.onchange=function(){E.ord=so.value;render();};
}

/* ================= EMENTÁRIO · subabas ================= */
function mostrar(){
  var p=EM.sub==='prec';if(window.VDM_marcaNav)window.VDM_marcaNav();
  $$('#e-sub button').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-s')===EM.sub));});
  ['#e-modes','#e-chips','#e-sel'].forEach(function(s){$(s).hidden=false;$(s).innerHTML='';});
  $('#e-aside').parentNode.classList.remove('sem-aside');
  $('#e-q').value=p?(E.q||''):(EM.q[EM.sub]||'');
  var qm=$('#e-qmodo');if(qm){qm.hidden=!p;if(!p)qm.innerHTML='';}
  $('#e-q').placeholder=p?'Buscar: termos, "frase exata", OU, -excluir, radical*…':EM.sub==='mod'?'Buscar nos modelos-matriz: nome, assunto, tese, texto…':'Buscar nos parágrafos-padrão…';
  if(p){if(E.idx)render();else carregar();return;}
  $('#e-out').innerHTML='<p class="empty">Abrindo a base do gabinete…</p>';
  base().then(function(){if(EM.sub==='mod')mRender();else if(EM.sub==='par')pRender();}).catch(function(e){$('#e-out').innerHTML='<p class="empty">Não foi possível abrir a base do gabinete ('+esc(e.message)+').</p>';});
}
$$('#e-sub button').forEach(function(b){b.addEventListener('click',function(){EM.sub=b.getAttribute('data-s');fecharIT();mostrar();window.scrollTo(0,0);});});
function irEmentarioProc(nums,lab,pre){
  var set={};nums.forEach(function(n){var s=String(n||'').trim();if(s){set[s]=1;var d=repCnj(s);if(d.length===20)set[d]=1;}});
  E.F={};E.q='';E.qn=null;E.qp=null;E.ft=null;FT.tok++;E.y1=E.y2='';E.plist={set:set,lab:lab,pre:pre};E.modo='lista';E.sel=null;E.mmOpen=null;E.shown=60;$('#e-q').value='';
  EM.sub='prec';$$('#e-sub button').forEach(function(z){z.setAttribute('aria-selected',String(z.getAttribute('data-s')==='prec'));});
  var b=document.querySelector('.tab[data-v="ement"]');if(b&&b.getAttribute('aria-selected')==='true'){fecharIT();mostrar();}else if(b)b.click();window.scrollTo(0,0);
}
/* endereço vindo do Ex Officio (prontuário · precedentes relacionados):
   #v=ement&proc=N1,N2&lab=… abre o Ementário só com esses julgados; #v=ement&q=termos abre a busca com os termos;
   opcionais (painel de busca do Amicus): qm=ft (texto integral), t=A|M (acórdãos ou monocráticas), rl=RELATOR (Collegium) */
(function(){
  function lerHash(){var p={};location.hash.replace(/^#/,'').split('&').forEach(function(kv){var i=kv.indexOf('=');if(i>0)p[kv.slice(0,i)]=decodeURIComponent(kv.slice(i+1));});return p;}
  var ult='';
  function vai(){var p=lerHash();if(p.v!=='ement'||(!p.proc&&!p.q&&!p.rl&&!p.t))return;if(location.hash===ult)return;ult=location.hash;
    if(p.proc){irEmentarioProc(p.proc.split(',').filter(Boolean),p.lab||'processo do prontuário','Relacionados a');return;}
    irEmentarioProc([],'',null);E.plist=null;E.q=p.q||'';$('#e-q').value=E.q;
    if(p.t==='A'||p.t==='M')E.F.t=p.t==='A'?'Acórdão':'Monocrática';
    if(p.rl&&DIM.rl)E.F.rl=p.rl;
    E.qm=p.qm==='ft'&&E.q?'ft':'idx';
    /* a busca no texto integral precisa do manifesto da série; espera até ele chegar (no máximo 20 s) */
    var n=0;(function tenta(){if(E.qm==='ft'&&!SER.ok&&!SER.erro&&n++<66){setTimeout(tenta,300);return;}try{if(E.q)buscar();else render();}catch(e){}})();}
  window.addEventListener('hashchange',vai);
  document.addEventListener('cmt-acesso',function(){setTimeout(vai,60);},{once:true});
  setTimeout(vai,700);
})();
function irModelos(tipo){XS.ed='mod';EM.sub='mod';MS.tipo=tipo||'Acórdão';MS.ass='';MS.cls='';MS.jul='';EM.q.mod='';MLIM=40;irEditorial('mod');}
window.VDM_irEditorial=function(s){irEditorial(s);};
function irEditorial(s){XS.ed=s||XS.ed;var b=document.querySelector('.tab[data-v="edit"]');if(b&&b.getAttribute('aria-selected')==='true')xRender();else if(b)b.click();window.scrollTo(0,0);}
function jp(s){try{return typeof s==='string'?JSON.parse(s||'null'):s;}catch(e){return null;}}
function marcarR(t){return refs(t).replace(/\{\{([^}]*)\}\}/g,'<mark>{{$1}}</mark>').replace(/\[PREENCHER:([^\]]*)\]/g,'<mark>[PREENCHER:$1]</mark>').replace(/\[VALIDAR([^\]]*)\]/g,'<mark>[VALIDAR$1]</mark>');}
function marcar(t){return esc(t).replace(/\{\{([^}]*)\}\}/g,'<mark>{{$1}}</mark>').replace(/\[PREENCHER:([^\]]*)\]/g,'<mark>[PREENCHER:$1]</mark>').replace(/\[VALIDAR([^\]]*)\]/g,'<mark>[VALIDAR$1]</mark>');}
/* ---- Modos de exibição (os mesmos dos precedentes) para modelos-matriz e parágrafos-padrão ---- */
function vzBarra(C,re){
  var M=C.modos,m='<div class="seg" role="group" aria-label="Modo de visualização">'+M.map(function(z){return '<button data-vm="'+z[0]+'" aria-pressed="'+(C.st.modo===z[0])+'">'+z[1]+'</button>';}).join('')+'</div>';
  CX=C;m+=dimsCtl();
  $('#e-modes').innerHTML=m;
  $$('#e-modes [data-vm]').forEach(function(b){b.onclick=function(){C.st.modo=b.getAttribute('data-vm');C.st.sel=null;C.st.mmOpen=null;re();};});
  $$('#e-modes select[data-d]').forEach(function(sl){sl.onchange=function(){var k=sl.getAttribute('data-d'),i=+sl.getAttribute('data-i');if(Array.isArray(C.dm[k]))C.dm[k][i]=sl.value;else C.dm[k]=sl.value;C.st.mmOpen=null;C.st.sel=null;re();};});
  var F=C.F(),ch=Object.keys(F).filter(function(k){return F[k];}).map(function(k){return '<span class="e-chip"><small>'+esc(C.DIM[k].n)+'</small> '+esc(k==='y'?mesL(F[k]):F[k])+'<button data-vx="'+k+'" aria-label="Remover filtro">×</button></span>';});
  $('#e-chips').innerHTML=ch.join('');$$('#e-chips [data-vx]').forEach(function(b){b.onclick=function(){delete F[b.getAttribute('data-vx')];C.st.sel=null;re();};});
  selBar();
}
function vzMostra(C,L,out){CX=C;if(!L.length){out.innerHTML='<p class="empty">Nada com esses filtros.</p>';return;}({mapa:vMapa,tempo:vTempo,matriz:vMatriz})[C.st.modo](L,out);}
/* ---- Modelos ---- */
var MS={tipo:'Acórdão',apr:'',jul:'',ass:'',cls:'',mais:{},modo:'lista',fora:{}},MLIM=40;
function mTipo(m){var e=m.especieModelo||'';return /^voto/.test(e)?'Acórdão':e==='despacho'?'Despacho':'Decisão';}
function mAss(m){return m.assunto||'Sem assunto';}
function mApr(m){var s=String(m.classeSigla||'')+' '+String(m.especie||''),n=nz([m.nomeModelo,m.assunto,m.processo].join(' '));
  if(m.especieModelo==='despacho')return 'Providência (despacho)';
  if(/\bED|EDcl/.test(s)||/embargos de declaracao|omissao, contradicao/.test(n))return 'Embargos de declaração';
  if(/AgInt/.test(s)||/agravo interno/.test(n))return 'Agravo interno';
  if(/retratacao/.test(n))return 'Juízo de retratação';
  return 'Julgamento do recurso';}
function mCls(m){return m.classeSigla||m.especie||'—';}
/* tipo de julgamento: o recurso ou a classe que se julga */
var MVZ={modo:'lista',sel:null,mmOpen:null},MSF={};
function mJulg(m){var c=String(m.classeSigla||m.especie||'');
  if(/retratacao/.test(nz((m.nomeModelo||'')+' '+(m.assunto||''))))return 'Juízo de retratação';
  if(/^ED\b|EDcl/.test(c))return 'Embargos de declaração';if(/AgInt/.test(c))return 'Agravo interno';if(/^AI\b/.test(c))return 'Agravo de instrumento';
  if(/ApCiv.*RemNec/.test(c))return 'Apelação e remessa necessária';if(/RemNec/.test(c))return 'Remessa necessária';if(/ApCiv|Ap\b/.test(c))return 'Apelação';if(/^MS\b/.test(c))return 'Mandado de segurança';
  var t=rrTipoJulg(m);return {ed:'Embargos de declaração',ain:'Agravo interno',ai:'Agravo de instrumento',rn:'Remessa necessária',apc:'Apelação',ades:'Apelação'}[t]||'Sem classe definida';}
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
  if(ro.passos.length)h+='<h3 class="e-sec">Sequência do voto</h3><ol class="x-ol">'+ro.passos.map(function(p){return '<li>'+refs(p.charAt(0).toUpperCase()+p.slice(1))+'</li>';}).join('')+'</ol>'+(ro.seqEv?'<p class="meta"><b>Evitar:</b> '+refs(ro.seqEv)+'</p>':'');
  if(ro.dir.length)h+='<h3 class="e-sec">Diretrizes da matéria</h3>'+ro.dir.map(function(r){return '<div class="x-dir"><b>'+esc(r.titulo||'')+'</b>'+(r.preferir?'<p>'+refs(r.preferir)+'</p>':'')+(r.evitar?'<p class="ev"><span>Evitar:</span> '+refs(r.evitar)+'</p>':'')+'</div>';}).join('');
  return h+'</div>';
}
function rotCol(ro){
  var h='<div class="lab" style="margin-top:0">Roteiro · '+esc(ro.nome)+'</div>';
  if(ro.passos.length)h+='<div class="e-rk">Sequência do voto</div><ol class="x-ol">'+ro.passos.map(function(p){return '<li>'+refs(p.charAt(0).toUpperCase()+p.slice(1))+'</li>';}).join('')+'</ol>'+(ro.seqEv?'<p class="meta"><b>Evitar:</b> '+refs(ro.seqEv)+'</p>':'');
  if(ro.dir.length)h+='<div class="e-rk">Diretrizes</div>'+ro.dir.map(function(r){return '<div class="x-dir"><b>'+esc(r.titulo||'')+'</b>'+(r.preferir?'<p>'+refs(r.preferir)+'</p>':'')+(r.evitar?'<p class="ev"><span>Evitar:</span> '+refs(r.evitar)+'</p>':'')+'</div>';}).join('');
  return h;
}
function mostraRoteiro(){
  var ro=roteiroDe(MS.ass);if(!ro)return false;
  var box=painel(rotHtml(ro,MS.ass),true);var x=box.querySelector('[data-dx]');if(x)x.onclick=function(){fecharIT();};return true;
}
/* ---- Modelos no padrão do Editorial: lista e filtros à esquerda, folha ao centro, ficha à direita ---- */
MS.sel=null;MS.alt={};MS.abre={};MS.blk=null;
function mFm(t){return refs(t).replace(/\{\{([^}]*)\}\}/g,'<mark class="v">{{$1}}</mark>').replace(/\[PREENCHER:([^\]]*)\]/g,'<mark class="v">[PREENCHER:$1]</mark>').replace(/\[VALIDAR([^\]]*)\]/g,'<mark class="v">[VALIDAR$1]</mark>');}
function mFmV(t){return refs(t).replace(/\[VALIDAR([^\]]*)\]/g,'<mark class="v">[VALIDAR$1]</mark>');}
function mParas(f,ctx){var L=String(f||'').split('\n').filter(function(x){return x.trim();});return L.map(function(l){return '<p class="'+(/^\s*“/.test(l)?'cit':'std')+'">'+comCampos(l.trim(),ctx,mFmV)+'</p>';}).join('');}
/* trechos do modelo: cada tópico vira um trecho; versões e parágrafos alternativos vão para o seletor */
function mTrechos(m){
  return mSecoes(m).map(function(s){
    var base=s.bl.filter(function(b){return b.tit==null;}),pars=s.bl.filter(function(b){return b.tit!=null;}),alts=[];
    if(pars.length){pars.forEach(function(p,i){alts.push({lab:(p.tit||('Versão '+(p.ver!=null?p.ver:i+1))).replace(/\s*\(\d+%\)\s*$/,function(z){return z;}),f:p.txt,op:p.op});});}
    else base.forEach(function(b,i){alts.push({lab:base.length>1?'Forma '+(i+1):'',f:b.txt});});
    var opc=base.length&&base.some(function(b){return String(b.txt||'').trim();})?base.every(function(b){return b.ativo===false;}):!!s.t.opcional;
    return {k:m.id+'|'+s.t.id,n:s.t.titulo||s.t.id,g:s.t.grupo||'',opc:opc,alts:alts};
  });
}
function mLista(L){
  var g={},ord=[];L.forEach(function(m){var k=mAss(m);if(!g[k]){g[k]=[];ord.push(k);}g[k].push(m);});
  return ord.map(function(k){return '<div class="mgk">'+esc(k)+' <small>'+g[k].length+'</small></div>'+g[k].map(function(m){var ap=mApr(m);return '<button class="mli" data-msel="'+esc(m.id)+'" aria-pressed="'+(MS.sel===m.id)+'"><span class="t">'+esc(m.nomeModelo||m.id)+'</span><span class="s">'+esc(mCls(m))+(ap&&ap!=='Julgamento do recurso'&&ap!=='Providência (despacho)'?' · '+esc(ap):'')+(m.resultado?' · '+esc(String(m.resultado).slice(0,40)):'')+'</span></button>';}).join('');}).join('');
}
function mRender(){
  var M=(BASE&&BASE.mod)||[],q=nz(EM.q.mod||'');
  var passa=function(m,ex){if(ex!=='tipo'&&MS.tipo&&mTipo(m)!==MS.tipo)return false;if(ex!=='ass'&&MS.ass&&mAss(m)!==MS.ass)return false;if(ex!=='jul'&&MS.jul&&mJulg(m)!==MS.jul)return false;for(var fk in MSF){if(MSF[fk]&&MDIM[fk].v(m)!==MSF[fk])return false;}if(ex!=='cls'&&MS.cls&&mCls(m)!==MS.cls)return false;
    if(q){if(!m._q)m._q=nz([m.nomeModelo,m.assunto,m.temas,m.tese,m.resultado,m.fundamentacao,m.classe,m.pronunciamento,mTextoBase(m)].join(' '));if(m._q.indexOf(q)<0)return false;}return true;};
  function cnt(ex,fn){var c={};M.filter(function(m){return passa(m,ex);}).forEach(function(m){var k=fn(m);c[k]=(c[k]||0)+1;});return Object.keys(c).map(function(k){return [k,c[k]];}).sort(function(a,b){return b[1]-a[1]||a[0].localeCompare(b[0]);});}
  var ct=cnt('tipo',mTipo),ctm={};ct.forEach(function(z){ctm[z[0]]=z[1];});
  function sel(dim,lab,c){return '<label class="msel"><span>'+lab+'</span><select data-mf="'+dim+'"><option value="">Todos ('+c.reduce(function(a,z){return a+z[1];},0)+')</option>'+c.map(function(z){return '<option value="'+esc(z[0])+'"'+(MS[dim]===z[0]?' selected':'')+'>'+esc(z[0])+' ('+z[1]+')</option>';}).join('')+'</select></label>';}
  var L=M.filter(function(m){return passa(m);}).sort(function(x,y){return mAss(x).localeCompare(mAss(y))||String(x.nomeModelo).localeCompare(String(y.nomeModelo));});
  if(!L.some(function(m){return m.id===MS.sel;}))MS.sel=L.length?L[0].id:null;
  var a='<div class="lab" style="margin-top:0">Tipo</div><div class="seg" id="m-tipo">'+['Acórdão','Decisão','Despacho'].map(function(t){return '<button data-v="'+t+'" aria-pressed="'+(MS.tipo===t)+'" title="'+(ctm[t]||0)+' modelos">'+t+'</button>';}).join('')+'</div>';
  a+='<div class="mfil">'+sel('jul','Tipo de julgamento',cnt('jul',mJulg))+sel('ass','Assunto',cnt('ass',mAss))+sel('cls','Classe',cnt('cls',mCls))+'</div>';
  a+='<div class="lab">Modelos-matriz <small>'+L.length+'</small></div><div class="mlist">'+(L.length?mLista(L):'<p class="meta">Nenhum modelo-matriz com esses filtros.</p>')+'</div>';
  var as=$('#e-aside'),st=as.querySelector('.mlist')?as.querySelector('.mlist').scrollTop:0;as.innerHTML=a;var ml=as.querySelector('.mlist');if(ml)ml.scrollTop=st;
  $('#e-cnt').innerHTML='<b>'+n0(L.length)+'</b> de '+n0(M.length)+' modelos-matriz';
  var m=M.filter(function(z){return z.id===MS.sel;})[0];
  vzBarra(CXM,mRender);
  if(MVZ.modo!=='lista'){vzMostra(CXM,L,$('#e-out'));return;}
  if(!m){$('#e-out').innerHTML='<p class="empty">Nenhum modelo-matriz com esses filtros.</p>';return;}
  mFolha(m);
}
var MDIM={t:{n:'Tipo',v:mTipo},jul:{n:'Tipo de julgamento',v:function(m){return mJulg(m);}},ass:{n:'Assunto',v:function(m){return mAss(m);}},cls:{n:'Classe',v:function(m){return mCls(m);}},
  res:{n:'Resultado',v:function(m){return m.resultado?classRes(m.resultado):'Sem resultado';}},y:{n:'Mês',v:function(m){return (m.dataReferencia||'').slice(0,7)||'—';}}};
var CXM={DIM:MDIM,DIMS:['t','jul','ass','cls','res','y'],dm:{mapa:['jul','ass','res'],matriz:['jul','res'],tempo:'res'},st:MVZ,nome:'modelos-matriz',ass:'ass',tempoTit:'Modelos-matriz por mês de referência.',
  modos:[['lista','Lista'],['mapa','Mapa mental'],['tempo','Linha do tempo'],['matriz','Matriz']],F:function(){return MSF;},
  aplica:function(lista){var f=MVZ.sel.f;Object.keys(f).forEach(function(k){if(k==='t')MS.tipo=f[k];else if(k==='jul'||k==='ass'||k==='cls')MS[k]=f[k];else MSF[k]=f[k];});MVZ.sel=null;MVZ.mmOpen=null;if(lista)MVZ.modo='lista';MS.sel=null;mRender();window.scrollTo(0,0);}};
/* ---- Referências rápidas ao lado dos modelos (apoio/referencias-rapidas.json) ---- */
MS.tab=MS.tab||'ficha';MS.refAss=null;
function RR(){return (BASE&&BASE.ref)||null;}
var RR_STOP={de:1,da:1,do:1,das:1,dos:1,e:1,a:1,o:1,em:1,por:1,para:1,art:1,lei:1,cf:1,com:1,sem:1,na:1,no:1,ao:1,os:1,as:1,voto:1,matriz:1,tipo:1,julgamento:1,decisao:1,monocratica:1};
function rrTok(s){return nz(s).split(/[^a-z0-9]+/).filter(function(t){return t.length>2&&!RR_STOP[t];});}
var RR_SIN=[[/rural|segurad[oa] especial|boia/,'Rural e segurado especial'],[/incapacidade|auxilio-doenca|auxilio doenca|invalidez/,'Benefícios por incapacidade'],[/assistencial|bpc|loas|203/,'BPC/LOAS'],[/pens[aã]o por morte|revis/,'Pensão por morte e revisões'],[/especial|ppp|ruido|epi/,'Tempo especial'],[/28,86|servidor/,'Servidores civis e militares'],[/execu[cç][aã]o fiscal|cda|divida ativa/,'Execução fiscal'],[/medicamento|saude|sus/,'Saúde e medicamentos'],[/fgts/,'FGTS e servidores'],[/desapropria/,'Desapropriação e reforma agrária'],[/funrural/,'FUNRURAL'],[/pis|cofins|icms/,'ICMS na base do PIS/COFINS'],[/improbidade/,'Improbidade administrativa'],[/licita/,'Licitações e contratos'],[/conselho/,'Conselhos profissionais'],[/ambiental/,'Multas ambientais']];
function rrAssunto(m){
  var R=RR();if(!R)return null;var L=R.assuntos.itens;
  if(MS.refAss){var f=L.filter(function(a){return a.t===MS.refAss;})[0];if(f)return f;}
  var txt=nz((m.assunto||'')+' '+(m.nomeModelo||''));
  for(var i=0;i<RR_SIN.length;i++)if(RR_SIN[i][0].test(txt)){var g=L.filter(function(a){return a.t===RR_SIN[i][1];})[0];if(g)return g;}
  var T=rrTok(m.assunto||''),best=null,bs=0;
  L.forEach(function(a){var A=rrTok(a.t+' '+a.d+' '+(a.tags||[]).join(' ')),sc=0;T.forEach(function(t){if(A.indexOf(t)>=0)sc++;});if(sc>bs){bs=sc;best=a;}});
  return bs>=1?best:null;
}
/* via recursal pelo tipo de julgamento do modelo (o recurso que se julga), não pela classe do processo */
function rrTipoJulg(m){
  var ap=mApr(m),t=nz((m.nomeModelo||'')+' '+(m.especie||'')+' '+(m.pronunciamento||''));
  if(/^Embargos de declara/.test(ap)||/embargos de declara|\bedcl\b|\bed\b/.test(t))return 'ed';
  if(/^Agravo interno/.test(ap)||/agravo interno|\bagint\b/.test(t))return 'ain';
  if(/agravo de instrumento|\bai\b/.test(t))return 'ai';
  if(/remessa/.test(t))return 'rn';
  if(/adesiv/.test(t))return 'ades';
  if(/apela/.test(t))return 'apc';
  var c=nz((m.classeSigla||'')+' '+(m.classe||''));
  return /\bai\b|agravo de instrumento/.test(c)?'ai':/remnec|remessa/.test(c)?'rn':/apciv|apelac/.test(c)?'apc':/\bed\b|edcl|embargos/.test(c)?'ed':/agint|agravo interno/.test(c)?'ain':'';
}
function rrVia(m){var R=RR();if(!R)return null;var id=rrTipoJulg(m);return R.vias.filter(function(v){return v.id===id;})[0]||null;}
function rrLexico(m){
  var R=RR();if(!R)return [];var res=nz((m.resultado||'')+' '+(m.nomeModelo||'')),tp=mTipo(m),ap=mApr(m),w={};
  if(/nao conhec|nao conheco/.test(res)){w['Juízo de admissibilidade']=1;w['Não conhecer do recurso']=1;}
  else{w['Conhecer do recurso']=1;}
  if(/provid|provimento|desprov|nego|dou/.test(res)){w['Dar provimento']=1;w['Negar provimento']=1;}
  if(tp!=='Despacho'){w['Honorários recursais']=1;w['Consectários legais']=1;}
  if(tp==='Decisão')w['Julgamento monocrático']=1;
  if(/^Embargos/.test(ap))w['Prequestionamento']=1;
  if(/retrata/.test(nz(ap+' '+res)))w['Juízo de retratação']=1;
  if(/remessa/.test(nz(m.classe||'')))w['Remessa necessária']=1;
  return R.lexico.itens.filter(function(l){return w[l.t];});
}
function rrArts(m){
  var R=RR();if(!R)return [];var tp=mTipo(m),w={'15':1,'10':1};if(tp==='Decisão')w['33']=1;if(tp==='Acórdão'){w['143']=1;w['133A']=1;}
  return R.regimento.filter(function(a){return w[a.art];});
}
function rrHtml(m){
  var R=RR();if(!R)return '<p class="meta">Referências rápidas indisponíveis nesta cópia.</p>';
  var h='<p class="meta rr-av">'+esc(R.aviso)+'</p>';
  var v=rrVia(m);
  if(v){h+='<details class="rr" open><summary>'+esc(v.nome)+' <small>tipo de julgamento</small></summary><div class="pp-pg rr-pg">'+[['Prazo',v.prazo],['Cabe contra',v.contra],['Órgão julgador',v.orgao],['Sustentação oral',v.sust],['Base',v.base]].filter(function(z){return z[1];}).map(function(z){return '<div><span>'+z[0]+'</span>'+refs(z[1])+'</div>';}).join('')+'</div>'+
    (v.ess&&v.ess.length?'<div class="rr-k">Pontos-chave</div><ul>'+v.ess.map(function(x){return '<li>'+refs(x)+'</li>';}).join('')+'</ul>':'')+
    (v.atn?'<div class="rr-atn">'+refs(v.atn)+'</div>':'')+
    (v.minuta&&v.minuta.length?'<div class="rr-k">Na minuta</div><ul>'+v.minuta.map(function(x){return '<li>'+refs(x)+'</li>';}).join('')+'</ul>':'')+'</details>';}
  var a=rrAssunto(m),G={};R.assuntos.grupos.forEach(function(g){G[g.id]=g;});
  h+='<details class="rr" open><summary>Assunto recorrente</summary><label class="msel" style="margin:4px 0 8px"><span>Assunto</span><select data-rrass><option value="">'+(a?'Sugerido: '+esc(a.t):'Escolher…')+'</option>'+R.assuntos.grupos.map(function(g){return '<optgroup label="'+esc(g.t)+'">'+R.assuntos.itens.filter(function(i){return i.g===g.id;}).map(function(i){return '<option'+(MS.refAss===i.t?' selected':'')+'>'+esc(i.t)+'</option>';}).join('')+'</optgroup>';}).join('')+'</select></label>';
  if(a){var sec=R.secoes.filter(function(s){return a.sec&&s.n===a.sec;})[0];
    h+='<div class="rr-as"><b>'+esc(a.t)+'</b>'+(a.sec?'<span class="rr-sec">'+esc(a.sec)+'</span>':'')+'<p>'+refs(a.d)+'</p>'+(a.pts&&a.pts.length?'<ul>'+a.pts.map(function(x){return '<li>'+refs(x)+'</li>';}).join('')+'</ul>':'')+(a.tags&&a.tags.length?'<div class="e-chipl pp-cita">'+a.tags.map(function(t){return '<span class="en">'+refs(t)+'</span>';}).join('')+'</div>':'')+(sec?'<p class="meta" style="margin:8px 0 0">'+esc(sec.n)+' ('+esc(sec.t)+', '+esc(sec.b)+'): '+esc(sec.m.slice(0,3).join('; '))+(sec.m.length>3?'…':'')+'</p>':(G[a.g]&&G[a.g].p?'<p class="meta" style="margin:8px 0 0">'+esc(G[a.g].p)+'</p>':''))+'</div>';}
  else h+='<p class="meta">Nenhum assunto recorrente corresponde a este modelo. Escolha acima, se quiser.</p>';
  h+='</details>';
  var rq=R.requisitos,nc=/nao conhec/.test(nz((m.resultado||'')+' '+(m.nomeModelo||'')));
  h+='<details class="rr"'+(nc?' open':'')+'><summary>Requisitos de admissibilidade</summary>'+['intr','extr'].filter(function(k){return rq[k];}).map(function(k){var q=rq[k];return '<div class="rr-k">'+esc(q.t)+'</div><p class="meta" style="margin:0 0 4px">'+esc(q.p||'')+'</p>'+q.i.map(function(i){return '<div class="rr-req"><b>'+esc(i.t)+'</b><p>'+refs(i.pl||'')+'</p>'+(i.tc?'<p class="tc">'+refs(i.tc)+'</p>':'')+'</div>';}).join('');}).join('')+'</details>';
  var LX=rrLexico(m);
  if(LX.length)h+='<details class="rr"><summary>Léxico do dispositivo <small>'+LX.length+'</small></summary>'+LX.map(function(l){return '<div class="rr-req"><b>'+esc(l.t)+'</b>'+(l.lat?'<span class="rr-sec">'+esc(l.lat)+'</span>':'')+'<p>'+refs(l.d)+'</p>'+(l.det&&l.det.length?'<ul>'+l.det.map(function(x){return '<li>'+refs(x)+'</li>';}).join('')+'</ul>':'')+'</div>';}).join('')+'</details>';
  var AR=rrArts(m);
  if(AR.length)h+='<details class="rr"><summary>Regimento Interno <small>'+AR.length+'</small></summary>'+AR.map(function(x){return '<div class="rr-req"><b><a href="#" data-rrart="'+esc(x.art)+'">RITRF3, art. '+esc(x.art)+'</a></b> · '+esc(x.titulo)+'<p>'+esc(x.nota)+'</p></div>';}).join('')+'</details>';
  return h;
}
function irRegimento(n){var t=document.querySelector('.tab[data-v="rep"]');if(t)t.click();var b=document.querySelector('#v-rep .sub button[data-s="reg"]');if(b)b.click();setTimeout(function(){var r=rgArtPorNum(n);if(r)rgAbrir(r);},60);}
/* processos em que o modelo-matriz ou o parágrafo-padrão foi usado, separados em acórdãos e decisões monocráticas */
var PRECP=null;function precPorProc(){if(!PRECP){PRECP={};((BASE&&BASE.prec)||[]).forEach(function(r){(PRECP[r.processo]=PRECP[r.processo]||[]).push(r);});}return PRECP;}
var PRECI=null;function precPorId(id){if(!PRECI){PRECI={};((BASE&&BASE.prec)||[]).forEach(function(r){PRECI[r.id]=r;});}return PRECI[id];}
function usosHtml(nums,recs,rotulo,nota){
  var P=precPorProc(),A=[],M=[],fora=[];
  if(recs)recs.forEach(function(r){if(r)((/^voto/i.test(r.pronunciamento||'Voto'))?A:M).push(r);});
  (nums||[]).forEach(function(n){var L=P[n];if(!L){fora.push(n);return;}L.forEach(function(r){((/^voto/i.test(r.pronunciamento||'Voto'))?A:M).push(r);});});
  var tot=A.length+M.length;if(!tot&&!fora.length)return '<div class="xrg">Usado em</div><p class="meta" style="margin:0">'+esc(nota||'Nenhum uso localizado na base.')+'</p>';
  function li(r){return '<li><span class="e-tag '+(/^voto/i.test(r.pronunciamento||'Voto')?'A':'M')+'">'+(/^voto/i.test(r.pronunciamento||'Voto')?'A':'M')+'</span><b>'+esc(r.processo)+'</b><span class="meta">'+fmtD(r.dataJulgamento)+'</span></li>';}
  var all=A.concat(M).sort(function(a,b){return String(b.dataJulgamento).localeCompare(String(a.dataJulgamento));});
  var ns=all.map(function(r){return r.processo;});
  return '<div class="xrg">Usado em <small>'+A.length+' acórdãos · '+M.length+' monocráticas'+(fora.length?' · '+fora.length+' fora da base':'')+'</small></div>'+(all.length?'<ul class="us-l">'+all.slice(0,8).map(li).join('')+'</ul>'+(all.length>8?'<p class="meta" style="margin:2px 0">+ '+(all.length-8)+'</p>':'')+'<button class="e-mini" data-usver="'+esc(ns.join(','))+'" data-uslab="'+esc(rotulo)+'">Ver no Ementário ('+all.length+')</button>':'')+(fora.length?'<p class="meta" style="margin:6px 0 0">Fora da base: '+esc(fora.slice(0,6).join(', '))+(fora.length>6?'…':'')+'</p>':'')+(nota?'<p class="meta" style="margin:6px 0 0;font-size:11px">'+esc(nota)+'</p>':'');
}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-usver]');if(!b)return;e.preventDefault();irEmentarioProc(b.getAttribute('data-usver').split(',').filter(Boolean),b.getAttribute('data-uslab'));});
function mPartes(m){
  var T=mTrechos(m),tp=mTipo(m);
  if(tp!=='Acórdão')return [{pj:'',trs:T.map(function(t){t.parte='voto';return t;})}];
  var ap=mApr(m),tj=rrTipoJulg(m),v=/^Embargos de declara/.test(ap)||tj==='ed'?'ed':/^Agravo interno/.test(ap)||tj==='ain'?'agint':tj==='ai'?'ai':tj==='rn'?'aprn':/apelac[oõ]es|ambas as partes|duplas? apela/.test(nz(m.nomeModelo||''))?'dap':'ap',P=xPartesDe('acordao',v);
  function ed(pt){return pt.tr.map(function(t){return {k:'ed:'+t.k,n:t.n,g:'',opc:t.opc,alts:t.alts,parte:pt.id,info:t.info,r:t.r||[]};});}
  var cab=xTrechos('voto',['Cabeçalho','Vocativo']).map(function(t){return {k:'ed:'+t.k,n:t.n,g:'',opc:false,alts:t.alts,parte:'voto',r:t.r||[]};});
  return [{pj:'EMENTA',trs:m.ementaIntegral?mEmenta(m):ed(P[0])},{pj:'RELATÓRIO',trs:ed(P[1])},{pj:'VOTO',trs:cab.concat(T.map(function(t){t.parte='voto';return t;}))},{pj:'ACÓRDÃO',trs:ed(P[3])}];
}
/* ementa do acórdão de origem (modelos extraídos do catálogo): cabeçalho, seções I–IV e referências, sem alteração */
function mEmenta(m){
  var e=String(m.ementaIntegral).replace(/\r/g,''),L=e.split('\n'),out=[],cur=null,i0=0;
  function bl(n,f){out.push({k:'em:'+out.length,n:n,g:'',opc:false,alts:[{lab:'',f:f.replace(/\n{2,}/g,'\n').trim()}],parte:'ementa',r:[]});}
  bl('Cabeçalho',L[0]||'');
  L.slice(1).forEach(function(l){var t=l.trim(),h=t.match(/^(I{1,3}|IV)\.\s*(.+)$/);
    if(/^[_\-]{3,}$/.test(t)){if(cur){bl(cur.n,cur.f);}cur={n:'Referências',f:''};return;}
    if(h&&t.length<60){if(cur)bl(cur.n,cur.f);cur={n:h[1]+'. '+h[2].charAt(0).toUpperCase()+h[2].slice(1).toLowerCase(),f:''};return;}
    if(!cur)cur={n:'Ementa',f:''};cur.f+=l+'\n';});
  if(cur&&cur.f.trim())bl(cur.n,cur.f);
  return out;}
/* dados do caso na ficha do modelo: o processo preenche as variáveis ({{CLASSE}}, {{ASSUNTO}}, {{RAMO}}, {{polo ativo}}…) */
function mCasoHtml(){var ac=XD.ac,info=ac?[ac[0],ac[1],[ac[2],ac[3]].filter(Boolean).join(' × ')].filter(Boolean).join(' · '):(XD.proc&&XD.naoAchou?'processo fora do acervo: variáveis do acervo ficam em aberto':'informe o processo para preencher as variáveis do caso');
  return '<label class="m-caso"><span>Caso</span><input data-mproc placeholder="nº do processo" value="'+esc(XD.proc||'')+'" inputmode="numeric" aria-label="Número do processo do caso"><small>'+esc(info)+'</small></label>';}
document.addEventListener('change',function(e){var t=e.target;if(!t.matches||!t.matches('[data-mproc]'))return;XD.proc=t.value.trim();XD.ac=null;XD.naoAchou=false;
  var fim=function(){xRascunho();if(MS._m)mFolha(MS._m);};if(!XD.proc){fim();return;}
  base().then(function(B){var n=xNumProc(XD.proc);XD.proc=n;XD.ac=(B.ac&&(B.ac[n]||B.ac[n.replace(/\D/g,"")]))||null;XD.naoAchou=!XD.ac;fim();}).catch(function(){XD.naoAchou=true;fim();});});
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.matches&&e.target.matches('[data-mproc]')){e.preventDefault();e.target.blur();}});
function mFolha(m){
  xAutoCaso();var PT=mPartes(m),tp=mTipo(m),h='';
  PT.forEach(function(pt){var lastG=null;
    if(pt.pj)h+='<div class="xpj">'+pt.pj+' <small>(inserido pelo PJe)</small><button class="xpjc" data-mcpp="'+pt.pj+'" title="Copiar '+esc(pt.pj==='ACÓRDÃO'?'proclamação':pt.pj.toLowerCase())+', com a formatação do PJe" aria-label="Copiar '+esc(pt.pj==='ACÓRDÃO'?'proclamação':pt.pj.toLowerCase())+'"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button></div>';
    pt.trs.forEach(function(t){
      if(t.g&&t.g!==lastG){h+='<div class="mgrp">'+esc(t.g)+'</div>';lastG=t.g;}
      if(t.n==='Sentença'&&sentNaAbertura(pt.trs,MS.alt))return;
      if(MS.fora[t.k]){h+='<button class="xopc fora" data-mvolta="'+esc(t.k)+'">+ '+esc(t.n)+' <small>· retirado</small></button>';return;}
      if(t.opc&&!MS.abre[t.k]){h+='<button class="xopc" data-mabre="'+esc(t.k)+'">+ '+esc(t.n)+' <small>· opcional</small></button>';return;}
      var E=escolha(t,MS.alt),ai=E.ai,a=E.a||{f:''},ctx={k:m.id+'|'+t.k+'@'+E.key,i:0,auto:true};
      h+='<div class="xblk'+(MS.blk===t.k?' on':'')+'" data-mk="'+esc(t.k)+'"><span class="xtg">'+(semRotulo(t.parte,t.n)?'':esc(t.n))+(t.opc?'<br><span class="xop" data-mfecha="'+esc(t.k)+'">recolher</span>':xFixo(t.parte,t)?'':'<br><span class="xop xret" data-mfora="'+esc(t.k)+'" title="Retirar da peça, da cópia e do .docx">retirar</span>')+'</span>'+
        (t.alts.length>1?'<div class="xalt">'+t.alts.map(function(x,i){return '<button data-malt="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===ai)+'" title="'+esc(x.lab)+'">'+esc(x.lab.length>34?x.lab.slice(0,33)+'…':x.lab)+'</button>';}).join('')+'</div>':'')+subSel(t,E,'data-msub')+
        (t.parte==='ementa'&&/^[IV]+\./.test(t.n)?'<p class="em"><b>'+esc(t.n)+'</b></p>':'')+
        (a.f?(t.parte==='voto'?mParas(a.f,ctx):xParas(a.f,t.parte,t.n,'',ctx)):(t.parte==='ementa'&&/^[IV]+\./.test(t.n)&&!(t.r&&t.r[0])?'':'<p class="xph '+(t.parte==='ementa'?'em':'std')+'">'+(t.parte==='voto'?esc(t.n)+': redação livre':esc((t.r&&t.r[0])||t.n))+'</p>'))+(t.info?xInfo(t.info):'')+'</div>';});
  });
  /* ficha à direita */
  var F=[['Pronunciamento',m.pronunciamento],['Apreciação',mApr(m)],['Classe',m.classe||m.classeSigla],['Assunto',m.assunto],['Temas',m.temas],['Resultado',m.resultado],['Causa de pedir',m.causaPedir],['Preliminares',m.preliminares],['Honorários',m.honorarios],['Situação',m.statusCuradoria]].filter(function(z){return z[1];});
  var mc=citados([m.temas,m.tese,m.fundamentacao,mTextoBase(m)].join('\n')),ro=roteiroDe(m.assunto);
  var r='<div class="mfh"><span class="e-tag '+(tp==='Acórdão'?'A':tp==='Decisão'?'M':'')+'">'+esc(tp)+'</span><h3>'+esc(m.nomeModelo||m.id)+'</h3>'+mCasoHtml()+'<div class="e-dacts"><button class="e-mini pri" data-mcpb>Copiar peça</button><button class="e-mini" data-mcpe>Copiar esqueleto</button><button class="e-mini" data-mdocx>.docx</button><button class="e-mini" data-mpdf>PDF</button>'+(window.VDM_EDITOR?'<button class="e-mini ed-in" data-edmod="'+esc(m.id)+'">Editar</button>':'')+'</div><div class="mtabs" role="tablist"><button role="tab" data-mtab="ficha" aria-selected="'+(MS.tab!=='ref')+'">Ficha</button><button role="tab" data-mtab="ref" aria-selected="'+(MS.tab==='ref')+'">Referências rápidas</button></div></div><div class="mfb">';
  if(MS.tab==='ref'){r+=rrHtml(m)+'</div>';}else{
  r+='<div class="pp-pg">'+F.map(function(z){return '<div><span>'+esc(z[0])+'</span>'+(z[0]==='Temas'?refs(z[1]):esc(z[1]))+'</div>';}).join('')+'</div>';
  if(m.tese)r+='<div class="xrg">Tese</div><div class="xri">'+refs(m.tese)+'</div>';
  if(m.especificidades)r+='<div class="xrg">Especificidades</div><div class="xri">'+refs(m.especificidades)+'</div>';
  if(m.fundamentacao)r+='<div class="xrg">Fundamentação resumida</div><div class="xri">'+refs(m.fundamentacao)+'</div>';
  if(mc.enun.length||mc.norm.length)r+='<div class="xrg">O modelo cita</div><div class="e-chipl pp-cita">'+mc.enun.map(function(t){return '<span class="en">'+refs(t)+'</span>';}).join('')+mc.norm.map(function(t){return '<span class="no">'+refs(t)+'</span>';}).join('')+'</div>';
  r+=usosHtml((String(m.processosAssociados||'').match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g)||[]),null,'Modelo-matriz: '+(m.nomeModelo||m.id),m.fonte&&/Extraído de/.test(m.fonte)?m.fonte:'');
  if(ro)r+='<div class="xrg">Roteiro da matéria</div><div class="mrot">'+rotCol(ro)+'</div>';
  if(m.fonte)r+='<p class="meta" style="margin-top:14px;font-size:11.5px">Origem: '+esc(m.fonte)+' · '+esc(m.id)+'</p>';
  r+='</div>';}
  $('#e-out').innerHTML='<div class="mpag"><div class="mcen"><div class="xsheet">'+h+'</div></div><aside class="mfic" aria-label="Ficha do modelo">'+r+'</aside></div>';
  MS._P=PT;MS._m=m;
}
function mTexto(sk){var P=MS._P||[],m=MS._m;return P.map(function(pt){return (pt.pj?pt.pj+'\n\n':'')+pt.trs.filter(function(t){return (!t.opc||MS.abre[t.k])&&!xSai(t,pt.trs,MS.alt,MS.fora);}).map(function(t){var E=escolha(t,MS.alt),a=E.a;var rn=t.parte==='ementa'&&/^[IV]+\./.test(t.n);return sk?'['+t.n+']':(a&&a.f?(rn?t.n+'\n':'')+camposT(a.f,{k:m.id+'|'+t.k+'@'+E.key,i:0}):(rn?t.n:'['+t.n+']'));}).join('\n\n');}).join('\n\n');}
$('#e-out').addEventListener('change',function(e){var s=e.target.closest('[data-rrass]');if(!s||EM.sub!=='mod')return;MS.refAss=s.value||null;mFolha(MS._m);});
$('#e-aside').addEventListener('change',function(e){var s=e.target.closest('[data-mf]');if(!s||EM.sub!=='mod')return;MS[s.getAttribute('data-mf')]=s.value;MS.alt={};MS.abre={};mRender();});
$('#e-aside').addEventListener('click',function(e){if(EM.sub!=='mod')return;var b;
  if((b=e.target.closest('#m-tipo button'))){MS.tipo=b.getAttribute('data-v');MS.ass='';MS.cls='';MS.apr='';MS.jul='';MS.sel=null;mRender();return;}
  if((b=e.target.closest('[data-msel]'))){MS.sel=b.getAttribute('data-msel');if(MVZ.modo!=='lista'){MVZ.modo='lista';MVZ.sel=null;mRender();return;}MS.blk=null;MS.refAss=null;MS.fora={};$$('#e-aside [data-msel]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});var m=((BASE&&BASE.mod)||[]).filter(function(z){return z.id===MS.sel;})[0];if(m)mFolha(m);window.scrollTo(0,0);}
});
$('#e-out').addEventListener('click',function(e){if(EM.sub!=='mod')return;var b;
  if(e.target.closest('.ref')||e.target.closest('.fill'))return;
  if((b=e.target.closest('[data-msub]'))){MS.alt[b.getAttribute('data-msub')+'/s']=+b.getAttribute('data-i');MS.blk=b.getAttribute('data-msub');mFolha(MS._m);return;}
  if((b=e.target.closest('[data-malt]'))){MS.alt[b.getAttribute('data-malt')]=+b.getAttribute('data-i');MS.blk=b.getAttribute('data-malt');mFolha(MS._m);return;}
  if((b=e.target.closest('[data-mabre]'))){MS.abre[b.getAttribute('data-mabre')]=1;MS.blk=b.getAttribute('data-mabre');mFolha(MS._m);return;}
  if((b=e.target.closest('[data-mfecha]'))){delete MS.abre[b.getAttribute('data-mfecha')];mFolha(MS._m);return;}
  if((b=e.target.closest('[data-mfora]'))){MS.fora[b.getAttribute('data-mfora')]=1;MS.blk=null;mFolha(MS._m);return;}
  if((b=e.target.closest('[data-mvolta]'))){delete MS.fora[b.getAttribute('data-mvolta')];MS.blk=b.getAttribute('data-mvolta');mFolha(MS._m);return;}
  if((b=e.target.closest('[data-mcpp]'))){var q=b.getAttribute('data-mcpp');copiarRico(rcModelo().filter(function(pt){return pt.pj===q;}),false,'Parte copiada com a formatação do PJe');return;}
  if(e.target.closest('[data-mcpb]')){var D=rcModelo();copiarRico(D,D.length>1,'Modelo copiado com a formatação do PJe');return;}
  if(e.target.closest('[data-mcpe]')){copiar(mTexto(true),'Esqueleto copiado');return;}
  if(e.target.closest('[data-mdocx]')||e.target.closest('[data-mpdf]')){var D2=rcModelo();(e.target.closest('[data-mdocx]')?baixarDocx:baixarPdf)(D2,D2.length>1,'',MS._m.nomeModelo||MS._m.id);return;}
  if((b=e.target.closest('[data-mtab]'))){MS.tab=b.getAttribute('data-mtab');var sc=$('.mfic')?$('.mfic').scrollTop:0;mFolha(MS._m);return;}
  if((b=e.target.closest('[data-rrart]'))){e.preventDefault();irRegimento(b.getAttribute('data-rrart'));return;}
  if((b=e.target.closest('.xblk[data-mk]'))){MS.blk=MS.blk===b.getAttribute('data-mk')?null:b.getAttribute('data-mk');$$('#e-out .xblk').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-mk')===MS.blk);});}
},true);
/* ---- Parágrafos-padrão ---- */
var PS={cat:'',sub:'',st:'',sel:null},PVZ={modo:'lista',sel:null,mmOpen:null},PSF={};
var STL={padrao:'Padrão',estrutural:'Estrutural',variante:'Variante',especifico:'Específico',preferencial:'Preferencial',anterior:'Anterior',pedido:'Pedido'};
function pVars(t,txt){return String(t||'').replace(/\{(\w+)(?:\|([^}]+))?\}/g,function(_,c,r){return txt?'['+(r||c)+']':'\u0001'+(r||c)+'\u0002';});}
function pHtml(t){return esc(pVars(t,false)).replace(/\u0001([^\u0002]*)\u0002/g,'<mark>[$1]</mark>');}
var PCOR={'Abertura':'#7fa3c9','Fundamento':'#5f9bb0','Aplicação':'#b98a6a','Documentação':'#8fb59a','Genéricos':'#a58fc9','Seção':'#c78c79','Encerramento':'#d4ab58','Outros':'#8a96a3'};
function pCor(c){return PCOR[c]||'#8a96a3';}
function pRender(){
  var P=(BASE&&BASE.par)||[],q=nz(EM.q.par||'');
  var base0=P.filter(function(p){if(PS.bl&&!/\n/.test(p.texto||''))return false;if(PS.vi&&!(p.vinculos||[]).length)return false;return !q||nz([p.titulo,p.texto,p.categoria,p.uso,p.nivelTema,p.nivelEspecificidade,p.especificidadesTags].join(' ')).indexOf(q)>=0;});
  var tree={},cats=[];base0.forEach(function(p){var c=p.nivelCategoria||'Outros',s=p.nivelSubsecao||'Geral';if(!tree[c]){tree[c]={_n:0};cats.push(c);}tree[c]._n++;tree[c][s]=(tree[c][s]||0)+1;});
  var nb=P.filter(function(p){return /\n/.test(p.texto||'');}).length,nv=P.filter(function(p){return (p.vinculos||[]).length;}).length;
  var a='<div class="lab" style="margin-top:0">Mostrar</div><div class="n-chips"><button class="n-chip" data-pbl aria-pressed="'+(!!PS.bl)+'">Só blocos<small>'+nb+'</small></button><button class="n-chip" data-pvi aria-pressed="'+(!!PS.vi)+'">Com vínculos<small>'+nv+'</small></button></div>';
  a+='<div class="lab">Onde entra</div><div class="glist tree"><button data-pc="" data-ps="" aria-pressed="'+(!PS.cat&&!PS.sub)+'"><span>Todos os parágrafos</span><small>'+base0.length+'</small></button>';
  cats.forEach(function(c){a+='<button class="rh pcat" style="--pc:'+pCor(c)+'" data-pc="'+esc(c)+'" data-ps="" aria-pressed="'+(PS.cat===c&&!PS.sub)+'"><span><i class="pdot"></i>'+esc(c)+'</span><small>'+tree[c]._n+'</small></button>';
    Object.keys(tree[c]).filter(function(k){return k!=='_n';}).sort().forEach(function(s){a+='<button class="sa" data-pc="'+esc(c)+'" data-ps="'+esc(s)+'" aria-pressed="'+(PS.cat===c&&PS.sub===s)+'"><span>'+esc(s)+'</span><small>'+tree[c][s]+'</small></button>';});});
  a+='</div>';
  var sts={};base0.forEach(function(p){sts[p.status]=(sts[p.status]||0)+1;});
  a+='<div class="lab">Situação</div><div class="glist"><button data-pst="" aria-pressed="'+(!PS.st)+'"><span>Todas</span><small>'+base0.length+'</small></button>'+Object.keys(sts).sort(function(x,y){return sts[y]-sts[x];}).map(function(k){return '<button data-pst="'+esc(k)+'" aria-pressed="'+(PS.st===k)+'"><span>'+esc(STL[k]||k)+'</span><small>'+sts[k]+'</small></button>';}).join('')+'</div>';
  a+='<div class="note">Parágrafos-padrão do gabinete (procs-muta · modelos/paragrafos.json). Um registro pode ser um bloco de vários parágrafos. Os campos em amarelo são preenchidos com os dados dos autos.</div>';
  var as=$('#e-aside'),st0=as.scrollTop;as.innerHTML=a;as.scrollTop=st0;
  $$('#e-aside [data-pbl]').forEach(function(b){b.onclick=function(){PS.bl=!PS.bl;pRender();};});
  $$('#e-aside [data-pvi]').forEach(function(b){b.onclick=function(){PS.vi=!PS.vi;pRender();};});
  $$('#e-aside [data-pc]').forEach(function(b){b.onclick=function(){PS.cat=b.getAttribute('data-pc');PS.sub=b.getAttribute('data-ps');pRender();};});
  $$('#e-aside [data-pst]').forEach(function(b){b.onclick=function(){PS.st=b.getAttribute('data-pst');pRender();};});
  var L=base0.filter(function(p){if(Object.keys(PSF).some(function(k){return PSF[k]&&PDIM[k].v(p)!==PSF[k];}))return false;return (!PS.cat||(p.nivelCategoria||'Outros')===PS.cat)&&(!PS.sub||(p.nivelSubsecao||'Geral')===PS.sub)&&(!PS.st||p.status===PS.st);});
  $('#e-cnt').innerHTML='<b>'+L.length+'</b> de '+P.length+' parágrafos';
  vzBarra(CXPA,pRender);
  if(PVZ.modo!=='lista'){vzMostra(CXPA,L,$('#e-out'));return;}
  var grupos={},ord=[];L.forEach(function(p){var g=(p.nivelCategoria||'Outros')+' › '+(p.nivelSubsecao||'Geral');if(!grupos[g]){grupos[g]=[];ord.push(g);}grupos[g].push(p);});
  /* variantes: parágrafos do mesmo tema em que há preferencial, variante, redação anterior ou pedido; o preferencial vem à frente e as variantes ficam sob ele */
  var VST={preferencial:1,variante:1,anterior:1,pedido:1},TEMA={};P.forEach(function(p){var k=[p.nivelCategoria,p.nivelSubsecao,p.nivelTema].join('|');(TEMA[k]=TEMA[k]||[]).push(p);});
  function pFam(p){var F=TEMA[[p.nivelCategoria,p.nivelSubsecao,p.nivelTema].join('|')]||[];return F.length>1&&F.some(function(z){return VST[z.status];})?F:null;}
  function pPref(F){var pr=F.filter(function(z){return z.status==='preferencial';})[0];if(pr)return {p:pr,sug:false};var o=F.filter(function(z){return z.status!=='anterior'&&z.status!=='pedido';});o=(o.length?o:F).slice().sort(function(x,y){return ((y._usos||[]).length)-((x._usos||[]).length);});return {p:o[0],sug:true};}
  function pRow(p,pf){var tx=pVars(p.texto,false).replace(RE_CAMPO,function(m,a,b,c,d,e){return campoNome(a,b,c,d,e);});
    return '<li class="n-row p-row'+(PS.sel===p.id?' sel':'')+(pf?' p-pref':'')+'" data-pid="'+esc(p.id)+'" tabindex="0" style="--gc:'+pCor(p.nivelCategoria||'Outros')+'"><div class="n-id">'+(pf?'<span class="n-m pst" title="'+(pf.sug?'Preferencial sugerido: o mais usado nos inteiros teores da base':'Preferencial do gabinete')+'">★ Preferencial</span>':'<span class="n-m">'+esc(STL[p.status]||p.status||'')+'</span>')+(/\n/.test(p.texto||'')?'<span class="n-m pbl" title="Bloco de '+String(p.texto).split(/\n\s*\n|\n/).filter(function(z){return z.trim();}).length+' parágrafos">bloco</span>':'')+'</div><div class="n-tx"><div class="t">'+esc(p.titulo||p.id)+'</div><div class="s">'+esc(tx.length>220?tx.slice(0,220)+'…':tx)+'</div></div><div class="n-mk">'+((p.vinculos||[]).length?'<span class="n-m u" title="Tem correspondências em outras partes">'+p.vinculos.length+' vínculo'+(p.vinculos.length>1?'s':'')+'</span>':'')+'<button class="e-ib" data-pcp="'+esc(p.id)+'" title="Copiar" aria-label="Copiar parágrafo">'+ICO.cit+'</button></div></li>';}
  var h=ord.map(function(g){var cg=pCor(g.split(' › ')[0]),vist={},rows='',n=grupos[g].length,ids={};grupos[g].forEach(function(p){ids[p.id]=1;});
    grupos[g].forEach(function(p){if(vist[p.id])return;var F=pFam(p);
      if(!F){vist[p.id]=1;rows+=pRow(p,null);return;}
      var pf=pPref(F),V=F.filter(function(z){return z!==pf.p&&ids[z.id];});F.forEach(function(z){vist[z.id]=1;});
      if(!ids[pf.p.id]){V.forEach(function(z){rows+=pRow(z,null);});return;}
      rows+=pRow(pf.p,pf)+(V.length?'<li class="p-vars"><details'+(V.some(function(z){return z.id===PS.sel;})?' open':'')+'><summary>'+V.length+' variante'+(V.length>1?'s':'')+'</summary><ul class="n-ls">'+V.map(function(z){return pRow(z,null);}).join('')+'</ul></details></li>':'');});
    return '<section class="n-grp"><h3 style="--pc:'+cg+'" class="pgh"><i class="pdot"></i>'+esc(g)+' <small>'+n+'</small></h3><ul class="n-ls">'+rows+'</ul></section>';}).join('');
  $('#e-out').innerHTML=h?'<div class="e-split'+(PS.sel&&largo()?' on':'')+'"><div class="e-lcol">'+h+'</div><section class="e-det" id="e-det"'+(PS.sel&&largo()?'':' hidden')+'></section></div>':'<p class="empty">Nenhum parágrafo encontrado.</p>';
  if(PS.sel&&largo()){var ps=P.filter(function(z){return z.id===PS.sel;})[0];if(ps)pAbrir(ps);}
}
var PDIM={cat:{n:'Onde entra',v:function(p){return p.nivelCategoria||'Outros';}},sub:{n:'Subseção',v:function(p){return p.nivelSubsecao||'Geral';}},tema:{n:'Tema',v:function(p){return p.nivelTema||'—';}},
  st:{n:'Situação',v:function(p){return STL[p.status]||p.status||'—';}},forma:{n:'Forma',v:function(p){return /\n/.test(p.texto||'')?'Bloco':'Parágrafo';}},
  uso:{n:'Uso na base',v:function(p){return (p._usos||[]).length?'Usado nos inteiros teores':'Não localizado';}},vin:{n:'Vínculos',v:function(p){return (p.vinculos||[]).length?'Com vínculos':'Sem vínculos';}}};
var CXPA={DIM:PDIM,DIMS:['cat','sub','tema','st','forma','uso','vin'],dm:{mapa:['cat','sub','st'],matriz:['cat','st']},st:PVZ,nome:'parágrafos',ass:null,
  modos:[['lista','Lista'],['mapa','Mapa mental'],['matriz','Matriz']],F:function(){return PSF;},
  aplica:function(lista){var f=PVZ.sel.f;Object.keys(f).forEach(function(k){if(k==='cat')PS.cat=f[k];else if(k==='sub')PS.sub=f[k];else if(k==='st'){var key=Object.keys(STL).filter(function(z){return STL[z]===f[k];})[0];PS.st=key||f[k];}else PSF[k]=f[k];});PVZ.sel=null;PVZ.mmOpen=null;if(lista)PVZ.modo='lista';pRender();window.scrollTo(0,0);}};
function pAbrir(p){
  PS.sel=p.id;$$('#e-out .p-row').forEach(function(r){r.classList.toggle('sel',r.getAttribute('data-pid')===p.id);});
  var h='<div class="e-dhead"><div class="e-dtit"><span class="e-tag apr">'+esc(STL[p.status]||p.status||'Parágrafo')+'</span><span class="e-dname">'+esc(p.titulo||p.id)+'</span><button class="e-dx" data-dx title="Fechar (Esc)" aria-label="Fechar">×</button></div><p class="meta" style="margin:6px 0 0">'+esc([p.nivelCategoria,p.nivelSubsecao,p.nivelTema,p.nivelEspecificidade].filter(Boolean).join(' › '))+'</p>';
  h+='<div class="n-of"><div class="lb ok">Texto</div><div class="e-box serif ok">'+comCampos(pVars(p.texto,false),(xAutoCaso(),{k:'par:'+p.id,i:0,auto:true}),refs)+'</div></div><div class="e-dacts"><button class="e-mini pri" data-pcp2>Copiar parágrafo</button>'+(window.VDM_EDITOR?'<button class="e-mini ed-in" data-edpar="'+esc(p.id)+'">Editar</button>':'')+'</div></div><div class="e-dbody">';
  if(p.uso)h+='<h3 class="e-sec">Quando usar</h3><div class="e-box">'+refs(p.uso)+'</div>';
  if(p.especificidadesTags)h+='<h3 class="e-sec">Especificidades</h3><div class="e-chipl">'+String(p.especificidadesTags).split(/;\s*/).filter(Boolean).map(function(t){return '<span>'+esc(t)+'</span>';}).join('')+'</div>';
  h+='<div class="pus">'+usosHtml([],(p._usos||[]).map(precPorId),'Parágrafo-padrão: '+(p.titulo||p.id),'Busca pelo trecho fixo nos '+n0(Object.keys((BASE&&BASE.it)||{}).length)+' inteiros teores da base.')+'</div>';
  var VL=p.vinculos||[];
  if(VL.length){var PN={paragrafo:'Outros parágrafos',relatorio:'Relatório',ementa:'Ementa',voto:'Voto',proclamacao:'Proclamação'},gv={},ov=[];VL.forEach(function(v){var k=v.parte||'paragrafo';if(!gv[k]){gv[k]=[];ov.push(k);}gv[k].push(v);});
    h+='<h3 class="e-sec">Correspondências <small>'+VL.length+'</small></h3><div class="pv">'+ov.map(function(k){return '<div class="pvg"><div class="pvk">'+esc(PN[k]||k)+'</div>'+gv[k].map(function(v){var q=v.ref?((BASE&&BASE.par)||[]).filter(function(z){return z.id===v.ref;})[0]:null;
      return '<div class="pvi'+(v.opcional?' op':'')+'">'+(v.rotulo?'<b>'+esc(v.rotulo)+'</b>':'')+(v.opcional?'<span class="pvo">opcional</span>':'<span class="pvo ob">vai junto</span>')+(q?'<div class="pvt"><a href="#" data-pvref="'+esc(q.id)+'">'+esc(q.titulo||q.id)+'</a></div><div class="e-box serif">'+comCampos(pVars(q.texto,false),{k:'par:'+q.id,i:0},refs)+'</div>':v.texto?'<div class="e-box serif">'+comCampos(v.texto,{k:'pv:'+p.id+':'+k,i:0},refs)+'</div>':'')+'</div>';}).join('')+'</div>';}).join('')+'</div>';}
  var vs=[];String(p.texto||'').replace(/\{(\w+)(?:\|([^}]+))?\}/g,function(_,c,r){var v=r||c;if(vs.indexOf(v)<0)vs.push(v);});
  if(vs.length)h+='<h3 class="e-sec">Campos a preencher</h3><div class="e-chipl">'+vs.map(function(v){return '<span>'+esc(v)+'</span>';}).join('')+'</div>';
  var box=painel(h+'</div>',true);
  box.querySelector('[data-dx]').onclick=function(){PS.sel=null;fecharIT();$$('#e-out .p-row.sel').forEach(function(r){r.classList.remove('sel');});};
  $$('[data-pvref]',box).forEach(function(a){a.onclick=function(ev){ev.preventDefault();var q=((BASE&&BASE.par)||[]).filter(function(z){return z.id===a.getAttribute('data-pvref');})[0];if(q)pAbrir(q);};});
  box.querySelector('[data-pcp2]').onclick=function(){copiarRico([{pj:'',parte:'voto',itens:[{n:p.titulo,txt:camposR(pVars(p.texto,false),{k:'par:'+p.id,i:0})}]}],false,'Parágrafo copiado com a formatação do PJe');};
}
$('#e-out').addEventListener('click',function(e){
  var pc=e.target.closest('[data-pcp]');
  if(pc){e.stopPropagation();var p=((BASE&&BASE.par)||[]).filter(function(x){return x.id===pc.getAttribute('data-pcp');})[0];if(p)copiar(camposT(pVars(p.texto,false),{k:'par:'+p.id,i:0}),'Parágrafo copiado');return;}
  if(e.target.closest('.ref'))return;
  var pr=e.target.closest('.p-row');
  if(pr){var p2=((BASE&&BASE.par)||[]).filter(function(x){return x.id===pr.getAttribute('data-pid');})[0];if(p2){if(PS.sel===p2.id&&largo()&&$('#e-det')&&!$('#e-det').hidden){PS.sel=null;fecharIT();pr.classList.remove('sel');return;}pAbrir(p2);}}
});

/* ================= ENUNCIADOS (temas e súmulas juntos; lista, tabela e mapa; painel lateral) ================= */
var NS={q:'',tipo:'',grupo:'todos',f:{},ramo:'',ass:'',open:{},sel:null,modo:'lista',mm:{}},NL=[],NIDX={};
try{var nsv=JSON.parse(localStorage.getItem('vdm-enun2')||'null');if(nsv&&/^(lista|tabela|mapa)$/.test(nsv.modo))NS.modo=nsv.modo;}catch(e){}
function nSalva(){try{localStorage.setItem('vdm-enun2',JSON.stringify({modo:NS.modo}));}catch(e){}}
function fmtNum(n){var x=String(n||'').replace(/\D/g,'');return x?x.replace(/\B(?=(\d{3})+(?!\d))/g,'.'):String(n||'');}
function nSusp(t){var s=nz(t['Suspensão de processos']);if(!s)return '';if(s.indexOf('nacional')>=0)return 'nac';if(s.indexOf('so ')===0||s.indexOf('recursos')>=0)return 'resp';if(s.indexOf('sem')===0)return 'nao';return '';}
function nPrep(){
  var db=window.VDM_DB&&window.VDM_DB();if(!db)return false;
  var A=window.VDM_assuntos(),U=window.VDM_usos();NL=[];NIDX={};
  (db['Temas']||[]).forEach(function(t){var of=t['Tese oficial (texto literal)'],rs=t['Resumo do gabinete'],tr=t['Tribunal'];NL.push({k:t['Código'],tipo:tr==='STF'?'Tema STF':'Tema STJ',trib:tr,lab:'Tema '+fmtNum(t['Tema']),full:'Tema '+fmtNum(t['Tema'])+'/'+tr,num:+String(t['Tema']).replace(/\D/g,''),tit:t['Título']||of||rs,of:of,rs:rs,obs:t['Observação'],fonte:t['Fonte da transcrição'],sit:t['Situação'],sk:nSusp(t),desde:t['Suspensão desde'],ato:t['Ato de suspensão'],link:t['Link oficial'],asl:t['Assunto'],tema:1,cit:'Tema '+fmtNum(t['Tema'])+'/'+tr+': '+(of||rs)});});
  (db['Súmulas']||[]).forEach(function(s){var sv=/vinculante/i.test(s['Tipo']),tf=s['Tribunal']==='TFR',n=s['Número'];var full=sv?'Súmula Vinculante '+n:tf?'Súmula '+n+' do extinto TFR':'Súmula '+n+'/'+s['Tribunal'];
    NL.push({k:s['Código'],tipo:sv?'Súmula vinculante':tf?'Súmula TFR':'Súmula',trib:sv?'SV':s['Tribunal'],lab:(sv?'SV ':'Súm. ')+n,full:full,num:+String(n).replace(/\D/g,''),tit:s['Enunciado'],enun:s['Enunciado'],obs:s['Observação'],fonte:s['Fonte da transcrição'],asl:s['Assunto'],cit:full+': “'+s['Enunciado']+'”'});});
  NL.forEach(function(x){var as=String(x.asl||'').split(';').map(function(a){return a.trim();}).filter(Boolean);x.ass=as[0]||'(sem assunto)';var a=A.ASN[x.ass];x.ramo=(a&&a['Ramo'])||'Outros';x.cor=(a&&a['Cor'])||'var(--gold)';x.us=U[x.k]||[];x.u=x.us.length;x._q=nz([x.full,x.tit,x.of,x.rs,x.enun,x.asl,x.obs,x.trib].join(' '));NIDX[x.k]=x;});
  if(!Object.keys(NS.open).length){var r0=A.ramos[0];if(r0)NS.open[r0]=1;}
  return true;
}
var NTIPOS=['Tema STF','Tema STJ','Súmula vinculante','Súmula','Súmula TFR'];
var NFL=[['of','Com tese oficial',function(x){return x.tema&&x.of;}],['sp','Com suspensão',function(x){return x.sk==='nac'||x.sk==='resp';}],['ci','Citados pelo gabinete',function(x){return x.u>0;}]];
function nPassa(x,ex){
  if(NS.grupo==='temas'&&!x.tema)return false;if(NS.grupo==='sumulas'&&x.tema)return false;
  if(ex!=='tipo'&&NS.tipo&&x.tipo!==NS.tipo)return false;
  for(var i=0;i<NFL.length;i++)if(NS.f[NFL[i][0]]&&!NFL[i][2](x))return false;
  if(ex!=='ass'){if(NS.ass&&x.ass!==NS.ass)return false;if(NS.ramo&&x.ramo!==NS.ramo)return false;}
  if(NS.q){var p=nz(NS.q).split(/\s+/).filter(Boolean);for(var j=0;j<p.length;j++)if(x._q.indexOf(p[j])<0)return false;}
  return true;
}
function nOrd(A){return A.sort(function(x,y){var sx=(x.sk==='nac'||x.sk==='resp')?1:0,sy=(y.sk==='nac'||y.sk==='resp')?1:0;return sy-sx||y.u-x.u||(x.tema?0:1)-(y.tema?0:1)||x.num-y.num;});}
function nRender(){
  if(!nPrep())return;
  var A=window.VDM_assuntos();
  var tiposG=NTIPOS.filter(function(t){return NS.grupo==='todos'||(NS.grupo==='temas'?/^Tema/.test(t):/^Súmula/.test(t));});
  if(NS.tipo&&tiposG.indexOf(NS.tipo)<0)NS.tipo='';
  var bt=NL.filter(function(x){return nPassa(x,'tipo');});
  var a='<div class="lab">Buscar</div><input class="q n-q" id="n-q" type="search" placeholder="Número, palavra, assunto…" value="'+esc(NS.q)+'" aria-label="Buscar enunciados">';
  a+='<div class="lab">Tipo</div><div class="n-chips">'+['<button class="n-chip" data-nt="" aria-pressed="'+(!NS.tipo)+'">Todos<small>'+bt.length+'</small></button>'].concat(tiposG.map(function(t){var n=bt.filter(function(x){return x.tipo===t;}).length;return '<button class="n-chip" data-nt="'+t+'" aria-pressed="'+(NS.tipo===t)+'">'+t+'<small>'+n+'</small></button>';})).join('')+'</div>';
  a+='<div class="lab">Destaques</div><div class="n-chips">'+NFL.map(function(f){var n=NL.filter(function(x){return nPassa(x)&&f[2](x);}).length;return '<button class="n-chip" data-nf="'+f[0]+'" aria-pressed="'+(!!NS.f[f[0]])+'">'+f[1]+'<small>'+n+'</small></button>';}).join('')+'</div>';
  var ba=NL.filter(function(x){return nPassa(x,'ass');}),cr={},ca={};ba.forEach(function(x){cr[x.ramo]=(cr[x.ramo]||0)+1;ca[x.ass]=(ca[x.ass]||0)+1;});
  var tr='<button data-nr="" data-na="" aria-pressed="'+(!NS.ramo&&!NS.ass)+'"><span>Todas as matérias</span><small>'+ba.length+'</small></button>';
  A.ramos.forEach(function(r){if(!cr[r])return;var o=!!NS.open[r];tr+='<button class="r'+(o?' open':'')+'" data-nr="'+esc(r)+'" data-na="" aria-pressed="'+(NS.ramo===r&&!NS.ass)+'"><span class="car">▸</span><span>'+esc(r)+'</span><small>'+cr[r]+'</small></button>';
    if(o){var as=A.AS.filter(function(z){return (z['Ramo']||'Outros')===r;}).map(function(z){return z['Assunto'];});if(r==='Outros')Object.keys(ca).forEach(function(k){if(!A.ASN[k]&&as.indexOf(k)<0)as.push(k);});
      as.forEach(function(z){if(!ca[z])return;tr+='<button class="a" data-nr="" data-na="'+esc(z)+'" aria-pressed="'+(NS.ass===z)+'"><i style="background:'+esc((A.ASN[z]&&A.ASN[z]['Cor'])||'var(--mut)')+'"></i><span>'+esc(z)+'</span><small>'+ca[z]+'</small></button>';});}});
  a+='<div class="lab">Ramos e assuntos</div><div class="n-tree">'+tr+'</div>';
  var as0=$('#n-aside'),st=as0.scrollTop,foco=document.activeElement&&document.activeElement.id==='n-q',pos=foco?document.activeElement.selectionStart:0;
  as0.innerHTML=a;as0.scrollTop=st;if(foco){var qi=$('#n-q');qi.focus();try{qi.setSelectionRange(pos,pos);}catch(e){}}
  var V=NL.filter(function(x){return nPassa(x);}),sp=NL.filter(function(x){return x.sk==='nac'||x.sk==='resp';}),nT=V.filter(function(x){return x.tema;}).length;
  $('#n-sum').innerHTML='<span><b>'+V.length+'</b> enunciados · '+nT+' temas · '+(V.length-nT)+' súmulas</span>'+(sp.length?'<button class="n-flag" id="n-spf" title="Ver os temas com suspensão">⚠ '+sp.length+(sp.length>1?' suspensões em vigor: ':' suspensão em vigor: ')+sp.map(function(x){return esc(x.full);}).join(', ')+'</button>':'');
  $('#n-modos').innerHTML=[['lista','Lista'],['tabela','Tabela'],['mapa','Mapa por assunto']].map(function(m){return '<button data-nm="'+m[0]+'" aria-pressed="'+(NS.modo===m[0])+'">'+m[1]+'</button>';}).join('');
  var out=$('#n-out');
  if(!V.length){out.innerHTML='<p class="empty">Nada encontrado com esses filtros.</p>';}
  else if(NS.modo==='tabela')out.innerHTML=nTabela(V);
  else if(NS.modo==='mapa')out.innerHTML=nMapa(V);
  else{var g={};V.forEach(function(x){(g[x.ass]=g[x.ass]||[]).push(x);});var ordA=A.AS.map(function(z){return z['Assunto'];}).concat(Object.keys(g).filter(function(k){return !A.ASN[k];}));
    var h='',last=null;ordA.forEach(function(z){var L=g[z];if(!L)return;var r=(A.ASN[z]&&A.ASN[z]['Ramo'])||'Outros';if(r!==last){h+='<div class="ramo-t">'+esc(r)+'</div>';last=r;}
      h+='<section class="n-grp"><h3>'+esc(z)+' <small>'+L.length+'</small></h3><ul class="n-ls">'+nOrd(L).map(nRow).join('')+'</ul></section>';});
    out.innerHTML=h;}
  if(NS.sel&&NIDX[NS.sel]&&!$('#n-wrap').classList.contains('nodet'))nAbrir(NIDX[NS.sel]);
}
function nMk(x){return (x.sk==='nac'?'<span class="n-m sp">suspende · nacional</span>':x.sk==='resp'?'<span class="n-m sp">suspende · REsp/RE</span>':'')+(x.tema?(x.of?'<span class="n-m of">tese oficial</span>':'<span class="n-m rs">resumo</span>'):'')+(x.u?'<span class="n-m u" title="Acórdãos e decisões do gabinete que citam">'+x.u+(x.u>1?' citações':' citação')+'</span>':'');}
function nRow(x){return '<li class="n-row'+(NS.sel===x.k?' sel':'')+'" data-nk="'+esc(x.k)+'" style="--gc:'+esc(x.cor)+'" tabindex="0"><div class="n-id"><span class="n-tb '+esc(x.trib)+'">'+esc(x.trib)+'</span><b>'+esc(x.lab.replace(/^Tema /,''))+'</b></div><div class="n-tx"><div class="t">'+esc(x.tema?x.tit:x.enun)+'</div><div class="s">'+esc(x.tema?(x.of||x.rs||''):x.ass)+'</div></div><div class="n-mk">'+nMk(x)+'</div></li>';}
function nSp(x){if(!x.tema)return '<span class="meta">—</span>';if(x.sk==='nac')return '<span class="t-sp nac">Sim · nacional</span>';if(x.sk==='resp')return '<span class="t-sp resp">Sim · só REsp/RE</span>';if(x.sk==='nao')return '<span class="t-sp nao">Não</span>';return '<span class="t-sp ni">Não informado</span>';}
function nTabela(V){
  return '<table class="n-tbl"><thead><tr><th>Enunciado</th><th>Suspende processos?</th><th>Assunto</th><th>Título ou texto</th><th>Tese oficial</th><th>Citações</th></tr></thead><tbody>'+nOrd(V.slice()).map(function(x){var t=x.tema?(x.tit||''):x.enun;
    return '<tr class="n-row-t'+(NS.sel===x.k?' sel':'')+'" data-nk="'+esc(x.k)+'"><th><span class="n-tb '+esc(x.trib)+'">'+esc(x.trib)+'</span> '+esc(x.lab.replace(/^Tema /,''))+'</th><td>'+nSp(x)+'</td><td>'+esc(x.ass)+'</td><td>'+esc(t.length>180?t.slice(0,180)+'…':t)+'</td><td class="c">'+(x.tema?(x.of?'✓':'—'):'enunciado')+'</td><td class="c">'+(x.u||'—')+'</td></tr>';}).join('')+'</tbody></table>';
}
function nMapa(V){
  var A=window.VDM_assuntos(),tree={};V.forEach(function(x){(tree[x.ramo]=tree[x.ramo]||{})[x.ass]=(tree[x.ramo][x.ass]||[]).concat([x]);});
  var rs=A.ramos.filter(function(r){return tree[r];});if(!Object.keys(NS.mm).length&&rs[0])NS.mm['r:'+rs[0]]=1;
  var RH=24,X0=110,C=[0,190,430],rows=0,ns=[];
  rs.forEach(function(r){var nr={k:'r:'+r,lab:r,n:0,v:0,ch:[]};Object.keys(tree[r]).forEach(function(z){nr.n+=tree[r][z].length;});
    if(NS.mm[nr.k])Object.keys(tree[r]).sort(function(p,q){return tree[r][q].length-tree[r][p].length;}).forEach(function(z){var L=nOrd(tree[r][z].slice()),na={k:'a:'+z,lab:z,n:L.length,v:1,ch:[],cor:(A.ASN[z]&&A.ASN[z]['Cor'])};
      if(NS.mm[na.k]){L.slice(0,14).forEach(function(x){rows++;na.ch.push({k:'x:'+x.k,lab:x.full,x:x,v:2,y:rows*RH});});if(L.length>14){rows++;na.ch.push({k:'m:'+z,lab:'+ '+(L.length-14)+' no assunto',v:2,y:rows*RH});}}
      if(na.ch.length)na.y=(na.ch[0].y+na.ch[na.ch.length-1].y)/2;else{rows++;na.y=rows*RH;}nr.ch.push(na);});
    if(nr.ch.length)nr.y=(nr.ch[0].y+nr.ch[nr.ch.length-1].y)/2;else{rows++;nr.y=rows*RH;}ns.push(nr);});
  var H=rows*RH+30,ry=(ns[0].y+ns[ns.length-1].y)/2,W=X0+C[2]+380,sv='';
  function lk(p,q,r2,s2){return '<path class="lk" d="M'+p+','+q+' C'+(p+(r2-p)/2)+','+q+' '+(p+(r2-p)/2)+','+s2+' '+r2+','+s2+'"/>';}
  function nd(n){var x=X0+C[n.v]+30,lf=n.v===2,cor=n.cor||(n.v===0?'var(--gold)':n.x?(n.x.of||!n.x.tema?'var(--good)':'var(--warn)'):'var(--mut)');
    return '<g class="nd" data-nmk="'+esc(n.k)+'" tabindex="0"><circle cx="'+x+'" cy="'+n.y+'" r="'+(lf?4:7)+'" fill="'+cor+'"/>'+(!lf?'<text x="'+(x-3.4)+'" y="'+(n.y+3.5)+'" style="font-size:10px;font-weight:800;fill:var(--gold-ink)">'+(n.ch.length?'–':'+')+'</text>':'')+'<text x="'+(x+(lf?9:12))+'" y="'+(n.y+4)+'">'+esc(n.lab.length>40?n.lab.slice(0,39)+'…':n.lab)+(n.n?' <tspan class="mutt">'+n.n+'</tspan>':'')+(n.x?' <tspan class="mutt">'+esc(String(n.x.tema?n.x.tit:n.x.enun).slice(0,46))+'…</tspan>':'')+'</text></g>';}
  function walk(L,px,py){L.forEach(function(n){var x=X0+C[n.v]+30;sv+=lk(px,py,x,n.y);if(n.ch&&n.ch.length)walk(n.ch,x,n.y);});L.forEach(function(n){sv+=nd(n);});}
  walk(ns,X0,ry);
  sv='<rect x="6" y="'+(ry-20)+'" width="'+(X0-12)+'" height="40" rx="10" fill="var(--gold-soft)" stroke="var(--gold)"/><text x="'+(X0/2)+'" y="'+(ry-3)+'" text-anchor="middle" style="font-weight:800;fill:var(--gold)">'+V.length+'</text><text x="'+(X0/2)+'" y="'+(ry+12)+'" text-anchor="middle" class="mutt">enunciados</text>'+sv;
  return '<p class="e-help">Clique em um ramo ou assunto para abrir os galhos; clique em um enunciado para abrir o painel. Verde: tese oficial ou enunciado; âmbar: só resumo.</p><div class="e-viz"><svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Mapa por ramo e assunto">'+sv+'</svg></div>';
}
function nOficial(x){
  if(!x.tema)return '<div class="n-of"><div class="lb ok">Enunciado</div><div class="e-box serif ok">'+refs(x.enun)+'</div></div>';
  if(x.of)return '<div class="n-of"><div class="lb ok">Tese oficial</div><div class="e-box serif ok">'+refs(x.of)+'</div></div>';
  return '<div class="n-of"><div class="lb w">Tese oficial não transcrita · resumo do gabinete</div><div class="e-box serif w">'+refs(x.rs||'—')+'</div></div>';
}
function nAbrir(x){
  NS.sel=x.k;$$('.n-row,.n-row-t').forEach(function(r){r.classList.toggle('sel',r.getAttribute('data-nk')===x.k);});
  $('#n-wrap').classList.remove('nodet');
  var ac=x.us.filter(function(u){return /ac[oó]rd/i.test(u['Tipo de decisão']);}).length;
  var h='<div class="e-dhead"><div class="e-dtit"><span class="n-tb '+esc(x.trib)+'">'+esc(x.trib)+'</span><span class="e-dname">'+esc(x.full)+'</span><button class="e-dx" data-ndx title="Fechar (Esc)" aria-label="Fechar">×</button></div>'+(x.tema&&x.tit?'<h2 class="n-tit">'+esc(x.tit)+'</h2>':'')+nOficial(x)+'<div class="e-dacts"><button class="e-mini pri" data-ncp>Copiar</button>'+(x.link?'<a class="e-mini" href="'+esc(x.link)+'" target="_blank" rel="noopener">Base oficial ↗</a>':'')+(x.u?'<button class="e-mini" data-nem>Ver precedentes do gabinete ('+x.u+')</button>':'')+'</div>'+(x.sk==='nac'||x.sk==='resp'?'<div class="n-alert"><b>'+(x.sk==='nac'?'Suspensão nacional de processos':'Suspensão só de recursos especiais/extraordinários')+'</b>'+(x.desde?' · desde '+esc(x.desde):'')+(x.ato?' · '+esc(x.ato):'')+'</div>':'')+'</div><div class="e-dbody">';
  if(x.tema&&x.of&&x.rs)h+='<h3 class="e-sec">Resumo do gabinete</h3><div class="e-box">'+refs(x.rs)+'</div>';
  if(x.obs)h+='<h3 class="e-sec">Observação</h3><div class="e-box">'+refs(x.obs)+'</div>';
  h+='<h3 class="e-sec">Matéria</h3><p class="meta" style="margin:0">'+esc(x.ramo)+' › '+esc(x.ass)+(x.sit?' · situação: '+esc(x.sit):'')+'</p>';
  h+='<h3 class="e-sec">Citações no gabinete <small>'+ac+' acórdãos · '+(x.u-ac)+' monocráticas</small></h3>'+(x.u?'<ul class="n-us">'+x.us.slice(0,80).map(function(u){return '<li><b>'+esc(u['Processo'])+'</b><span class="meta">'+esc([u['Tipo de decisão'],u['Data'],u['Órgão julgador']].filter(Boolean).join(' · '))+'</span></li>';}).join('')+'</ul>'+(x.u>80?'<p class="meta">+ '+(x.u-80)+'</p>':''):'<p class="meta">Nenhuma citação registrada.</p>');
  if(x.fonte)h+='<p class="meta" style="margin-top:14px">'+esc(x.fonte)+'</p>';
  var d=$('#n-det');d.innerHTML=h+'</div>';d.scrollTop=0;
  d.querySelector('[data-ndx]').onclick=nFecha;
  d.querySelector('[data-ncp]').onclick=function(){copiar(x.cit,'Copiado');};
  var em=d.querySelector('[data-nem]');if(em)em.onclick=function(){irEmentarioProc(x.us.map(function(u){return u['Processo'];}),x.full);};
}
function nFecha(){NS.sel=null;$('#n-wrap').classList.add('nodet');$$('.n-row.sel,.n-row-t.sel').forEach(function(r){r.classList.remove('sel');});}
$('#v-temas').addEventListener('click',function(e){
  var t=e.target.closest('[data-nt]');if(t){NS.tipo=t.getAttribute('data-nt');nRender();return;}
  var f=e.target.closest('[data-nf]');if(f){var k=f.getAttribute('data-nf');NS.f[k]=!NS.f[k];nRender();return;}
  var m=e.target.closest('[data-nm]');if(m){NS.modo=m.getAttribute('data-nm');nSalva();nRender();return;}
  if(e.target.closest('#n-spf')){NS.f={sp:1};NS.ass='';NS.ramo='';NS.tipo='';NS.grupo='todos';nRender();return;}
  var r=e.target.closest('.n-tree button');if(r){var ra=r.getAttribute('data-nr'),a=r.getAttribute('data-na');
    if(ra){var ja=NS.ramo===ra&&!NS.ass;NS.open[ra]=ja?!NS.open[ra]:true;NS.ramo=ja&&!NS.open[ra]?'':ra;NS.ass='';}else if(a){NS.ass=NS.ass===a?'':a;NS.ramo='';}else{NS.ramo='';NS.ass='';}nRender();return;}
  var g=e.target.closest('.e-viz .nd');if(g){var k2=g.getAttribute('data-nmk');if(k2.indexOf('x:')===0){if(NIDX[k2.slice(2)])nAbrir(NIDX[k2.slice(2)]);return;}if(k2.indexOf('m:')===0){NS.ass=k2.slice(2);NS.ramo='';NS.modo='lista';nRender();return;}if(NS.mm[k2])delete NS.mm[k2];else NS.mm[k2]=1;nRender();return;}
  var row=e.target.closest('.n-row,.n-row-t');if(row&&!e.target.closest('a,.ref')){var x=NIDX[row.getAttribute('data-nk')];if(x)nAbrir(x);}
});
$('#v-temas').addEventListener('keydown',function(e){if(e.key==='Enter'){var row=e.target.closest('.n-row');if(row&&NIDX[row.getAttribute('data-nk')])nAbrir(NIDX[row.getAttribute('data-nk')]);}});
$('#v-temas').addEventListener('input',function(e){if(e.target.id!=='n-q')return;clearTimeout(nSalva._t);nSalva._t=setTimeout(function(){NS.q=e.target.value.trim();nRender();},180);});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&NS.sel&&!$('#v-temas').hidden)nFecha();});
$$('#v-temas .sub button').forEach(function(b){b.addEventListener('click',function(){NS.grupo=b.getAttribute('data-s');$$('#v-temas .sub button').forEach(function(z){z.setAttribute('aria-selected',String(z===b));});NS.tipo='';nRender();});});
window.VDM_enun=nRender;
window.VDM_enunTab=function(){return /^Súmula/.test(NS.tipo||'')?'Súmulas':'Temas';};

/* ================= REPERTÓRIO (jurisprudencial, normativo e Regimento) em lista e painel ================= */
var RP={sub:'juris',q:{},trib:'',f:{},ramo:'',ass:'',open:{},sel:null,modo:{juris:'lista',normas:'lista'},org:'diploma',dip:'',parte:'',tit:'',rev:true};
function rpDB(){return (window.VDM_DB&&window.VDM_DB())||{};}
function rpUsos(k){var U=window.VDM_usos?window.VDM_usos():{};return U[k]||[];}
function asl(s){return String(s||'').split(';').map(function(a){return a.trim();}).filter(Boolean);}
function precLab(p){var cl=String(p['Classe']||'').split(' '),suf=['AgR','ED','AgR-ED','MC','AgInt'].indexOf(cl[cl.length-1])>=0&&cl.length>1?cl.pop():'';return cl.join(' ')+' '+p['Número']+(p['UF']?'/'+p['UF']:'')+(suf?' '+suf:'');}
function rpItens(){
  var db=rpDB(),A=window.VDM_assuntos();
  if(RP.sub==='juris')return (db['Jurisprudência']||[]).map(function(p){var as=asl(p['Assunto']),u=rpUsos(p['Código']);var a=A.ASN[as[0]];
    return {k:p['Código'],raw:p,lab:precLab(p),trib:p['Tribunal'],tit:p['Tipo de caso']||p['Subassunto']||p['Ementa']||'',sub:[p['Relator'],p['Publicação']].filter(Boolean).join(' · '),ass:as[0]||'(sem assunto)',ramo:(a&&a['Ramo'])||'Outros',cor:(a&&a['Cor'])||'var(--gold)',ema:p['Ementa'],us:u,u:u.length,oc:+p['Citações contadas no arquivo original']||0,
      _q:nz(Object.keys(p).map(function(k){return p[k];}).join(' ')+' '+precLab(p))};});
  if(RP.sub==='normas')return (db['Normas']||[]).map(function(n){var as=asl(n['Assunto']),u=rpUsos(n['Código']);var a=A.ASN[as[0]];var lab=n['Dispositivo']?n['Diploma']+', art. '+n['Dispositivo']:n['Norma'];
    return {k:n['Código'],raw:n,lab:lab,dip:n['Diploma'],tit:n['Texto literal']||'',sub:n['Nome do diploma']||n['Norma'],ass:as[0]||'(sem assunto)',asAll:as,ramo:(a&&a['Ramo'])||'Outros',cor:(a&&a['Cor'])||'var(--gold)',us:u,u:u.length,
      num:parseFloat(String(n['Dispositivo']||'').replace(/\./g,''))||0,_q:nz(Object.keys(n).map(function(k){return n[k];}).join(' '))};});
  return [];
}
var RTR={STF:'var(--stf)',STJ:'var(--stj)',TRF3:'var(--trf)',TRF4:'var(--trf)'};
function rpPassa(x,ex){
  var q=nz(RP.q[RP.sub]||'');
  if(RP.sub==='juris'&&ex!=='trib'&&RP.trib&&x.trib!==RP.trib)return false;
  if(RP.f.ema&&RP.sub==='juris'&&!x.ema)return false;if(RP.f.ci&&!x.u)return false;
  if(ex!=='ass'){if(RP.sub==='normas'&&RP.org==='diploma'){if(RP.dip&&x.dip!==RP.dip)return false;}else{if(RP.ass&&(x.asAll||[x.ass]).indexOf(RP.ass)<0)return false;if(RP.ramo&&x.ramo!==RP.ramo)return false;}}
  if(q){var p=q.split(/\s+/);for(var i=0;i<p.length;i++)if(x._q.indexOf(p[i])<0)return false;}
  return true;
}
function rpTree(L){
  var A=window.VDM_assuntos(),cr={},ca={};L.forEach(function(x){cr[x.ramo]=(cr[x.ramo]||0)+1;(x.asAll||[x.ass]).forEach(function(a){ca[a]=(ca[a]||0)+1;});});
  if(!Object.keys(RP.open).length&&A.ramos[0])RP.open[A.ramos[0]]=1;
  var tr='<button data-rr="" data-ra="" aria-pressed="'+(!RP.ramo&&!RP.ass)+'"><span>Todas as matérias</span><small>'+L.length+'</small></button>';
  A.ramos.forEach(function(r){if(!cr[r])return;var o=!!RP.open[r];tr+='<button class="r'+(o?' open':'')+'" data-rr="'+esc(r)+'" data-ra="" aria-pressed="'+(RP.ramo===r&&!RP.ass)+'"><span class="car">▸</span><span>'+esc(r)+'</span><small>'+cr[r]+'</small></button>';
    if(o){var as=A.AS.filter(function(z){return (z['Ramo']||'Outros')===r;}).map(function(z){return z['Assunto'];});if(r==='Outros')Object.keys(ca).forEach(function(k){if(!A.ASN[k]&&as.indexOf(k)<0)as.push(k);});
      as.forEach(function(z){if(!ca[z])return;tr+='<button class="a" data-rr="" data-ra="'+esc(z)+'" aria-pressed="'+(RP.ass===z)+'"><i style="background:'+esc((A.ASN[z]&&A.ASN[z]['Cor'])||'var(--mut)')+'"></i><span>'+esc(z)+'</span><small>'+ca[z]+'</small></button>';});}});
  return '<div class="n-tree">'+tr+'</div>';
}
/* diploma no painel: número (ou sigla) e título; ordem: Constituição e emendas, códigos, leis complementares, leis, decretos e atos */
function dipTitulo(d,o){o=o||{};var nome=o.nome||'',norma=o.norma||'';
  var num=/^(Constituição|Código Civil)/.test(d)?(norma&&norma!==d&&!/Constituição/.test(norma)?norma:d):d.replace(/\s*\(.*\)$/,'');
  var tit=nome&&nz(nome)!==nz(num)&&nz(nome)!==nz(d)?nome:'';
  if(/^(CPC|CTN)$/.test(d)){num=d+' · '+norma;}
  if(d==='Código Civil'){num='CC · '+norma;tit=nome;}
  if(d==='Constituição Federal'){num='CF/1988';tit='Constituição Federal';}
  var TD={'EC 113/2021':'Regime de precatórios e atualização de débitos da Fazenda Pública','LC 118/2005':'Alterações no CTN (prescrição da repetição de indébito)'};if(TD[d])tit=TD[d];
  return {num:num,tit:tit,full:[d,nome,norma].filter(Boolean).join(' · ')};}
function dipOrdem(L){function r(d){return /^Constitui/.test(d)?0:/^EC /.test(d)?1:/^(CPC|CTN|Código)/.test(d)?2:/^LC /.test(d)?3:/^Lei /.test(d)?4:/^Decreto/.test(d)?5:6;}
  function ano(d){var m=/\/(\d{4})/.exec(d);return m?+m[1]:0;}
  return L.slice().sort(function(a,b){return r(a)-r(b)||ano(a)-ano(b)||a.localeCompare(b,'pt');});}
function rpBusca(ph){return '<div class="lab">Buscar</div><input class="q n-q" id="r-q2" type="search" placeholder="'+ph+'" value="'+esc(RP.q[RP.sub]||'')+'" aria-label="Buscar no repertório">';}
function rpAside(h){var as0=$('#r-aside'),st=as0.scrollTop,foco=document.activeElement&&document.activeElement.id==='r-q2',pos=foco?document.activeElement.selectionStart:0;as0.innerHTML=h;as0.scrollTop=st;if(foco){var qi=$('#r-q2');qi.focus();try{qi.setSelectionRange(pos,pos);}catch(e){}}}
function rpRender(){
  if(!window.VDM_DB||!window.VDM_DB())return;
  $$('#v-rep .sub button').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-s')===RP.sub));});
  if(RP.sub==='reg'){rgRender();return;}
  var L0=rpItens(),a=rpBusca(RP.sub==='juris'?'Classe, número, relator, assunto, ementa…':'Diploma, artigo, palavra, assunto…');
  if(RP.sub==='juris'){var tribs=[];L0.forEach(function(x){if(tribs.indexOf(x.trib)<0)tribs.push(x.trib);});var bt=L0.filter(function(x){return rpPassa(x,'trib');});
    a+='<div class="lab">Tribunal</div><div class="n-chips">'+['<button class="n-chip" data-rt="" aria-pressed="'+(!RP.trib)+'">Todos<small>'+bt.length+'</small></button>'].concat(tribs.map(function(t){return '<button class="n-chip" data-rt="'+esc(t)+'" aria-pressed="'+(RP.trib===t)+'">'+esc(t)+'<small>'+bt.filter(function(x){return x.trib===t;}).length+'</small></button>';})).join('')+'</div>';}
  var FLs=RP.sub==='juris'?[['ema','Com ementa transcrita',function(x){return x.ema;}],['ci','Citados pelo gabinete',function(x){return x.u>0;}]]:[['ci','Citados pelo gabinete',function(x){return x.u>0;}]];
  a+='<div class="lab">Destaques</div><div class="n-chips">'+FLs.map(function(f){var n=L0.filter(function(x){return rpPassa(x)&&f[2](x);}).length;return '<button class="n-chip" data-rf="'+f[0]+'" aria-pressed="'+(!!RP.f[f[0]])+'">'+f[1]+'<small>'+n+'</small></button>';}).join('')+'</div>';
  var ba=L0.filter(function(x){return rpPassa(x,'ass');});
  if(RP.sub==='normas'){a+='<div class="lab">Organizar por</div><div class="n-chips"><button class="n-chip" data-ro="diploma" aria-pressed="'+(RP.org==='diploma')+'">Diploma</button><button class="n-chip" data-ro="assunto" aria-pressed="'+(RP.org==='assunto')+'">Assunto</button></div>';
    if(RP.org==='diploma'){var dc={},dord=[],dn={};ba.forEach(function(x){if(!dc[x.dip]){dc[x.dip]=0;dord.push(x.dip);dn[x.dip]={nome:x.raw['Nome do diploma']||'',norma:x.raw['Norma']||''};}dc[x.dip]++;});dord=dipOrdem(dord);
      a+='<div class="lab">Diplomas</div><div class="n-tree n-dips"><button data-rd="" aria-pressed="'+(!RP.dip)+'"><span>Todos os diplomas</span><small>'+ba.length+'</small></button>'+dord.map(function(d){var t=dipTitulo(d,dn[d]);return '<button data-rd="'+esc(d)+'" aria-pressed="'+(RP.dip===d)+'" title="'+esc(t.full)+'"><span><b>'+esc(t.num)+'</b>'+(t.tit?'<em>'+esc(t.tit)+'</em>':'')+'</span><small>'+dc[d]+'</small></button>';}).join('')+'</div>';}
    else a+='<div class="lab">Ramos e assuntos</div>'+rpTree(ba);}
  else a+='<div class="lab">Ramos e assuntos</div>'+rpTree(ba);
  rpAside(a);
  var V=L0.filter(function(x){return rpPassa(x);});
  $('#r-sum').innerHTML='<span><b>'+V.length+'</b> '+(RP.sub==='juris'?'precedentes · '+V.filter(function(x){return x.ema;}).length+' com ementa':'dispositivos · '+(function(){var s={};V.forEach(function(x){s[x.dip]=1;});return Object.keys(s).length;})()+' diplomas')+' · '+V.filter(function(x){return x.u;}).length+' citados pelo gabinete</span>';
  $('#r-modos').innerHTML=[['lista','Lista'],['tabela','Tabela']].map(function(m){return '<button data-rm="'+m[0]+'" aria-pressed="'+(RP.modo[RP.sub]===m[0])+'">'+m[1]+'</button>';}).join('');
  var out=$('#r-out');
  if(!V.length){out.innerHTML='<p class="empty">Nada encontrado com esses filtros.</p>';return;}
  var ord=function(A){return A.sort(function(x,y){return y.u-x.u||(RP.sub==='juris'?((y.ema?1:0)-(x.ema?1:0)||y.oc-x.oc):((x.num||0)-(y.num||0)));});};
  if(RP.modo[RP.sub]==='tabela'){
    out.innerHTML=RP.sub==='juris'?'<table class="n-tbl"><thead><tr><th>Precedente</th><th>Assunto</th><th>Tipo de caso</th><th>Relator</th><th>Publicação</th><th>Ementa</th><th>Citações</th></tr></thead><tbody>'+ord(V.slice()).map(function(x){var p=x.raw;return '<tr class="n-row-t'+(RP.sel===x.k?' sel':'')+'" data-rk="'+esc(x.k)+'"><th><span class="n-tb" style="background:'+(RTR[x.trib]||'var(--stf)')+'">'+esc(x.trib)+'</span> '+esc(x.lab)+'</th><td>'+esc(x.ass)+'</td><td>'+esc(p['Tipo de caso']||p['Subassunto']||'')+'</td><td>'+esc(p['Relator']||'')+'</td><td>'+esc(p['Publicação']||'')+'</td><td class="c">'+(x.ema?'✓':'—')+'</td><td class="c">'+(x.u||'—')+'</td></tr>';}).join('')+'</tbody></table>'
      :'<table class="n-tbl"><thead><tr><th>Dispositivo</th><th>Norma</th><th>Assunto</th><th>Texto</th><th>Citações</th></tr></thead><tbody>'+ord(V.slice()).map(function(x){var t=x.tit;return '<tr class="n-row-t'+(RP.sel===x.k?' sel':'')+'" data-rk="'+esc(x.k)+'"><th>'+esc(x.lab)+'</th><td>'+esc(x.raw['Norma']||'')+'</td><td>'+esc((x.asAll||[]).join('; '))+'</td><td>'+esc(t.length>160?t.slice(0,160)+'…':t)+'</td><td class="c">'+(x.u||'—')+'</td></tr>';}).join('')+'</tbody></table>';
  }else{
    var g={},ordG=[],A=window.VDM_assuntos();
    var chave=RP.sub==='normas'&&RP.org==='diploma'?function(x){return x.dip;}:function(x){return RP.ass&&(x.asAll||[]).indexOf(RP.ass)>=0?RP.ass:x.ass;};
    V.forEach(function(x){var k=chave(x);if(!g[k]){g[k]=[];ordG.push(k);}g[k].push(x);});
    if(!(RP.sub==='normas'&&RP.org==='diploma'))ordG=A.AS.map(function(z){return z['Assunto'];}).filter(function(k){return g[k];}).concat(ordG.filter(function(k){return !A.ASN[k];}));
    else ordG=dipOrdem(ordG);
    var h='',last=null;
    if(RP.sub==='juris'&&RP.ass&&/pis/i.test(RP.ass)&&(rpDB()['Matriz PIS-Cofins']||[]).length){var M={},MO=[];rpDB()['Matriz PIS-Cofins'].forEach(function(m){if(!M[m['Grupo']]){M[m['Grupo']]=[];MO.push(m['Grupo']);}M[m['Grupo']].push(m['Nota']);});h+='<details class="matriz" open><summary>Matriz de teses de PIS e Cofins</summary>'+MO.map(function(gg){return '<b>'+esc(gg)+'</b><ol>'+M[gg].map(function(n){return '<li>'+refs(n)+'</li>';}).join('')+'</ol>';}).join('')+'</details>';}
    ordG.forEach(function(k){var L=g[k];if(!(RP.sub==='normas'&&RP.org==='diploma')){var r=(A.ASN[k]&&A.ASN[k]['Ramo'])||'Outros';if(r!==last){h+='<div class="ramo-t">'+esc(r)+'</div>';last=r;}}
      var sub=RP.sub==='normas'&&RP.org==='diploma'?(L[0].raw['Nome do diploma']||''):'';
      h+='<section class="n-grp"><h3>'+esc(k)+' <small>'+(sub?esc(sub)+' · ':'')+L.length+'</small></h3><ul class="n-ls">'+ord(L).map(rpRow).join('')+'</ul></section>';});
    out.innerHTML=h;
  }
  if(RP.sel&&!$('#r-wrap').classList.contains('nodet')){var xs=L0.filter(function(z){return z.k===RP.sel;})[0];if(xs)rpAbrir(xs);else rpFecha();}
}
function rpRow(x){
  var mk=(RP.sub==='juris'?(x.ema?'<span class="n-m of">ementa</span>':'<span class="n-m rs">sem ementa</span>'):'')+(x.u?'<span class="n-m u">'+x.u+(x.u>1?' citações':' citação')+'</span>':'');
  var id=RP.sub==='juris'?'<span class="n-tb" style="background:'+(RTR[x.trib]||'var(--stf)')+'">'+esc(x.trib)+'</span><b>'+esc(x.lab.replace(/\/[A-Z]{2}\b.*$/,''))+'</b>':'<span class="n-tb" style="background:var(--gold)">'+esc(x.dip.length>10?x.dip.slice(0,10)+'…':x.dip)+'</span><b>'+esc(x.raw['Dispositivo']?'art. '+x.raw['Dispositivo']:'—')+'</b>';
  return '<li class="n-row'+(RP.sel===x.k?' sel':'')+'" data-rk="'+esc(x.k)+'" style="--gc:'+esc(x.cor)+'" tabindex="0"><div class="n-id">'+id+'</div><div class="n-tx"><div class="t">'+esc(RP.sub==='juris'?x.lab+((x.raw['Tipo de caso']||x.raw['Subassunto'])?' · '+(x.raw['Tipo de caso']||x.raw['Subassunto']):''):x.tit)+'</div><div class="s">'+esc(RP.sub==='juris'?(x.sub+(x.ema?' · '+x.ema:'')):x.sub)+'</div></div><div class="n-mk">'+mk+'</div></li>';
}
function rpAbrir(x){
  RP.sel=x.k;$$('#v-rep .n-row,#v-rep .n-row-t').forEach(function(r){r.classList.toggle('sel',r.getAttribute('data-rk')===x.k);});
  $('#r-wrap').classList.remove('nodet');
  var p=x.raw,ac=x.us.filter(function(u){return /ac[oó]rd/i.test(u['Tipo de decisão']);}).length,h,cit;
  if(RP.sub==='juris'){
    cit=x.lab+(p['Relator']?', Rel. '+p['Relator']:'')+(p['Publicação']?', '+p['Publicação']:'')+(p['Ementa']?': “'+p['Ementa']+'”':'');
    h='<div class="e-dhead"><div class="e-dtit"><span class="n-tb" style="background:'+(RTR[x.trib]||'var(--stf)')+'">'+esc(x.trib)+'</span><span class="e-dname">'+esc(x.lab)+'</span><button class="e-dx" data-rdx title="Fechar (Esc)" aria-label="Fechar">×</button></div><p class="meta" style="margin:6px 0 0">'+esc(x.sub)+'</p>';
    h+='<div class="n-of">'+(x.ema?'<div class="lb ok">Ementa</div><div class="e-box serif ok">'+refs(x.ema)+'</div>':'<div class="lb w">Ementa não transcrita</div>')+'</div>';
  }else{
    cit=p['Texto literal']||'';
    h='<div class="e-dhead"><div class="e-dtit"><span class="n-tb" style="background:var(--gold)">'+esc(x.dip)+'</span><span class="e-dname">'+esc(p['Dispositivo']?'Art. '+p['Dispositivo']:p['Norma'])+'</span><button class="e-dx" data-rdx title="Fechar (Esc)" aria-label="Fechar">×</button></div><p class="meta" style="margin:6px 0 0">'+esc([p['Nome do diploma'],p['Norma']].filter(Boolean).join(' · '))+'</p>';
    h+='<div class="n-of"><div class="lb ok">Texto literal</div><div class="e-box serif ok">'+refs(p['Texto literal']||'—')+'</div></div>';
  }
  h+='<div class="e-dacts"><button class="e-mini pri" data-rcp>'+(RP.sub==='juris'?'Copiar citação':'Copiar texto')+'</button>'+(p['Link']?'<a class="e-mini" href="'+esc(p['Link'])+'" target="_blank" rel="noopener">Inteiro teor ↗</a>':'')+(x.u?'<button class="e-mini" data-rem>Ver precedentes do gabinete ('+x.u+')</button>':'')+'</div></div><div class="e-dbody">';
  if(RP.sub==='juris'){h+='<h3 class="e-sec">Matéria</h3><p class="meta" style="margin:0">'+esc(x.ramo)+' › '+esc(p['Assunto']||'')+((p['Tipo de caso']||p['Subassunto'])?' › '+esc(p['Tipo de caso']||p['Subassunto']):'')+'</p>';
    if(p['Temas relacionados'])h+='<h3 class="e-sec">Temas relacionados</h3><div class="e-chipl">'+asl(p['Temas relacionados']).map(function(t){return '<span>'+refs(t)+'</span>';}).join('')+'</div>';
    if(x.oc)h+='<p class="meta" style="margin-top:10px">'+x.oc+' citações contadas no arquivo original.</p>';}
  else{if(p['Observação'])h+='<h3 class="e-sec">Observação</h3><div class="e-box">'+refs(p['Observação'])+'</div>';
    h+='<h3 class="e-sec">Assuntos</h3><div class="e-chipl">'+(x.asAll||[]).map(function(a){return '<span>'+esc(a)+'</span>';}).join('')+'</div>';}
  h+='<h3 class="e-sec">Citações no gabinete <small>'+ac+' acórdãos · '+(x.u-ac)+' monocráticas</small></h3>'+(x.u?'<ul class="n-us">'+x.us.slice(0,80).map(function(u){return '<li><b>'+esc(u['Processo'])+'</b><span class="meta">'+esc([u['Tipo de decisão'],u['Data'],u['Órgão julgador']].filter(Boolean).join(' · '))+'</span></li>';}).join('')+'</ul>'+(x.u>80?'<p class="meta">+ '+(x.u-80)+'</p>':''):'<p class="meta">Nenhuma citação registrada.</p>');
  var d=$('#r-det');d.innerHTML=h+'</div>';d.scrollTop=0;
  d.querySelector('[data-rdx]').onclick=rpFecha;d.querySelector('[data-rcp]').onclick=function(){copiar(cit,'Copiado');};
  var em=d.querySelector('[data-rem]');if(em)em.onclick=function(){irEmentarioProc(x.us.map(function(u){return u['Processo'];}),x.lab);};
}
function rpFecha(){RP.sel=null;$('#r-wrap').classList.add('nodet');$$('#v-rep .n-row.sel,#v-rep .n-row-t.sel').forEach(function(r){r.classList.remove('sel');});}
/* ---- Regimento: sumário em árvore, artigos em lista e o artigo no painel ---- */
function rgDados(){return (rpDB()['Regimento']||[]).slice().sort(function(a,b){return (+a['Ordem'])-(+b['Ordem']);});}
function rgArtPorNum(n){var k=dn(n);return rgDados().filter(function(r){return r['Tipo']==='Artigo'&&dn(String(r['Rótulo']).replace(/^Art\.\s*/,''))===k;})[0]||null;}
function rgRender(){
  var R=rgDados(),q=nz(RP.q.reg||'');
  var arts=R.filter(function(r){return r['Tipo']==='Artigo'&&(!RP.rev||r['Vigência']!=='Revogado')&&(!q||nz(r['Rótulo']+' '+r['Título ou texto']+' '+r['Notas de redação']).indexOf(q)>=0);});
  var cntP={},cntT={};arts.forEach(function(r){cntP[r['Parte']]=(cntP[r['Parte']]||0)+1;var kt=r['Parte']+'|'+r['Título'];cntT[kt]=(cntT[kt]||0)+1;});
  var a=rpBusca('Artigo, palavra, nota…')+'<div class="lab">Mostrar</div><div class="n-chips"><button class="n-chip" data-rv aria-pressed="'+RP.rev+'">Ocultar revogados</button></div><div class="lab">Sumário</div><div class="n-tree"><button data-rp="" data-rti="" aria-pressed="'+(!RP.parte)+'"><span>Regimento inteiro</span><small>'+arts.length+'</small></button>';
  R.filter(function(r){return r['Tipo']==='Parte';}).forEach(function(p){var key=p['Rótulo']+' – '+p['Título ou texto'],o=RP.parte===key;
    a+='<button class="r'+(o?' open':'')+'" data-rp="'+esc(key)+'" data-rti="" aria-pressed="'+(o&&!RP.tit)+'"><span class="car">▸</span><span>'+esc(p['Rótulo'])+' · '+esc(p['Título ou texto'])+'</span><small>'+(cntP[key]||0)+'</small></button>';
    if(o)R.filter(function(t){return t['Tipo']==='Título'&&t['Parte']===key;}).forEach(function(t){var kt=t['Rótulo']+' – '+t['Título ou texto'];a+='<button class="a" data-rp="'+esc(key)+'" data-rti="'+esc(kt)+'" aria-pressed="'+(RP.tit===kt)+'"><span>'+esc(t['Rótulo'])+' · '+esc(t['Título ou texto'])+'</span><small>'+(cntT[key+'|'+kt]||0)+'</small></button>';});});
  a+='</div>';
  rpAside(a);
  var V=arts.filter(function(r){return (!RP.parte||r['Parte']===RP.parte)&&(!RP.tit||r['Título']===RP.tit);});
  $('#r-sum').innerHTML='<span><b>'+V.length+'</b> artigos'+(q?' encontrados':'')+'</span>';$('#r-modos').innerHTML='';
  var h='',lp=null,lc=null;
  V.forEach(function(r){var cab=[r['Título'],r['Capítulo']].filter(Boolean).join(' › ');if(r['Parte']!==lp){h+=(lp!==null?'</ul>':'')+'<div class="ramo-t">'+esc(r['Parte'])+'</div><ul class="n-ls">';lp=r['Parte'];lc=null;}
    if(cab!==lc){h+='</ul><h3 class="rg-h">'+esc(cab||'Disposições')+(r['Seção']?' <small>'+esc(r['Seção'])+'</small>':'')+'</h3><ul class="n-ls">';lc=cab;}
    var t=String(r['Título ou texto']||'').replace(/^Art\.\s*[\dºA-Z-]+\s*[-–.]?\s*/,'');
    h+='<li class="n-row rg'+(RP.sel===r['Código']?' sel':'')+'" data-gk="'+esc(r['Código'])+'" tabindex="0"><div class="n-id"><b>'+esc(r['Rótulo'])+'</b></div><div class="n-tx"><div class="t">'+esc(t.split('\n')[0])+'</div></div><div class="n-mk">'+(r['Vigência']==='Revogado'?'<span class="n-m sp">revogado</span>':'')+'</div></li>';});
  $('#r-out').innerHTML=V.length?h+'</ul>':'<p class="empty">Nenhum artigo encontrado.</p>';
  if(RP.sel&&!$('#r-wrap').classList.contains('nodet')){var rr=R.filter(function(z){return z['Código']===RP.sel;})[0];if(rr&&rr['Tipo']==='Artigo')rgAbrir(rr);}
}
function rgAbrir(r){
  RP.sel=r['Código'];$$('#v-rep .n-row').forEach(function(z){z.classList.toggle('sel',z.getAttribute('data-gk')===r['Código']);});$('#r-wrap').classList.remove('nodet');
  var h='<div class="e-dhead"><div class="e-dtit"><span class="n-tb" style="background:var(--gold)">RITRF3</span><span class="e-dname">'+esc(r['Rótulo'])+'</span>'+(r['Vigência']==='Revogado'?'<span class="n-m sp">revogado</span>':'')+'<button class="e-dx" data-rdx title="Fechar (Esc)" aria-label="Fechar">×</button></div><p class="meta" style="margin:6px 0 0">'+esc([r['Parte'],r['Título'],r['Capítulo'],r['Seção']].filter(Boolean).join(' › '))+'</p>';
  h+='<div class="n-of"><div class="lb ok">Texto</div><div class="e-box serif ok">'+refs(r['Título ou texto'],'reg')+'</div></div><div class="e-dacts"><button class="e-mini pri" data-rcp>Copiar</button></div></div><div class="e-dbody">';
  if(r['Notas de redação'])h+='<h3 class="e-sec">Notas de redação</h3><div class="e-box">'+refs(r['Notas de redação'],'reg')+'</div>';
  var d=$('#r-det');d.innerHTML=h+'</div>';d.scrollTop=0;
  d.querySelector('[data-rdx]').onclick=rpFecha;d.querySelector('[data-rcp]').onclick=function(){copiar('RITRF3, '+String(r['Rótulo']).replace(/^Art\. /,'art. ')+': '+r['Título ou texto'],'Copiado');};
}
$('#v-rep').addEventListener('click',function(e){
  var t;
  if((t=e.target.closest('[data-rt]'))){RP.trib=t.getAttribute('data-rt');rpRender();return;}
  if((t=e.target.closest('[data-rf]'))){var k=t.getAttribute('data-rf');RP.f[k]=!RP.f[k];rpRender();return;}
  if((t=e.target.closest('[data-rm]'))){RP.modo[RP.sub]=t.getAttribute('data-rm');rpRender();return;}
  if((t=e.target.closest('[data-ro]'))){RP.org=t.getAttribute('data-ro');RP.dip='';RP.ass='';RP.ramo='';rpRender();return;}
  if((t=e.target.closest('[data-rd]'))){RP.dip=t.getAttribute('data-rd');rpRender();return;}
  if((t=e.target.closest('[data-rv]'))){RP.rev=!RP.rev;rpRender();return;}
  if((t=e.target.closest('[data-rp]'))){var p=t.getAttribute('data-rp'),ti=t.getAttribute('data-rti');if(!p){RP.parte='';RP.tit='';}else if(ti){RP.parte=p;RP.tit=RP.tit===ti?'':ti;}else{RP.parte=RP.parte===p&&!RP.tit?'':p;RP.tit='';}rpRender();return;}
  if((t=e.target.closest('.n-tree [data-rr]'))){var ra=t.getAttribute('data-rr'),a=t.getAttribute('data-ra');if(ra){var ja=RP.ramo===ra&&!RP.ass;RP.open[ra]=ja?!RP.open[ra]:true;RP.ramo=ja&&!RP.open[ra]?'':ra;RP.ass='';}else if(a){RP.ass=RP.ass===a?'':a;RP.ramo='';}else{RP.ramo='';RP.ass='';}rpRender();return;}
  if(e.target.closest('a,.ref'))return;
  if((t=e.target.closest('[data-gk]'))){var r=rgDados().filter(function(z){return z['Código']===t.getAttribute('data-gk');})[0];if(r)rgAbrir(r);return;}
  if((t=e.target.closest('[data-rk]'))){var x=rpItens().filter(function(z){return z.k===t.getAttribute('data-rk');})[0];if(x)rpAbrir(x);}
});
$('#v-rep').addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.closest('.n-row'))e.target.closest('.n-row').click();});
$('#v-rep').addEventListener('input',function(e){if(e.target.id!=='r-q2')return;clearTimeout(rpRender._t);rpRender._t=setTimeout(function(){RP.q[RP.sub]=e.target.value.trim();rpRender();},180);});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&RP.sel&&!$('#v-rep').hidden)rpFecha();});
$$('#v-rep .sub button').forEach(function(b){b.addEventListener('click',function(){RP.sub=b.getAttribute('data-s');RP.sel=null;RP.ass='';RP.ramo='';RP.dip='';RP.trib='';RP.f={};$('#r-wrap').classList.add('nodet');rpRender();});});
window.VDM_rep=rpRender;
window.VDM_repTab=function(){return ({juris:'Jurisprudência',normas:'Normas',reg:'Regimento'})[RP.sub];};


/* Catálogo e índice inverso: só vínculos efetivamente registrados em VDM_usos,
   inclusive os usos manuais e os produzidos pelo vincular.py/build. */
var REP_LINK_CACHE={db:null,usos:null,lista:[],porProc:new Map()};
function repCnj(v){return String(v||'').replace(/\D/g,'');}
function repPermitido(){return !window.CMT_ACESSO||!!window.CMT_ACESSO().avancado;}
function repCatalogo(){
 var db=rpDB(),usos=window.VDM_usos?window.VDM_usos():{};
 if(REP_LINK_CACHE.db===db&&REP_LINK_CACHE.usos===usos)return REP_LINK_CACHE;
 var L=[],by=new Map();
 function add(grupo,r,label){var k=String(r['Código']||'').trim();if(!k)return;var u=usos[k]||[],tx=String(label||k);var x={k:k,grupo:grupo,label:tx,us:u,q:nz([tx,Object.keys(r).map(function(z){return r[z];}).join(' ')].join(' '))};L.push(x);
  u.forEach(function(v){var n=repCnj(v['Processo']);if(n.length!==20)return;var p=by.get(n);if(!p){p=new Map();by.set(n,p);}p.set(grupo+'|'+k,x);});
 }
 (db['Temas']||[]).forEach(function(r){add('temas',r,'Tema '+fmtNum(r['Tema'])+'/'+r['Tribunal']);});
 (db['Súmulas']||[]).forEach(function(r){add('temas',r,/vinculante/i.test(r['Tipo'])?'Súmula Vinculante '+r['Número']:'Súmula '+r['Número']+'/'+r['Tribunal']);});
 (db['Jurisprudência']||[]).forEach(function(r){add('juris',r,precLab(r)+(r['Tribunal']?' · '+r['Tribunal']:''));});
 (db['Normas']||[]).forEach(function(r){add('normas',r,(r['Diploma']||r['Norma'])+(r['Dispositivo']?', art. '+r['Dispositivo']:''));});
 (db['Regimento']||[]).filter(function(r){return r['Tipo']==='Artigo';}).forEach(function(r){add('reg',r,'RITRF3 · '+r['Rótulo']);});
 REP_LINK_CACHE={db:db,usos:usos,lista:L,porProc:by};return REP_LINK_CACHE;
}
var REP_ROT={temas:'Enunciados',juris:'Jurisprudência',normas:'Normas',reg:'Regimento'};
function repBuscaTransversal(q){
 if(!repPermitido())return '';var terms=nz(q).split(/\s+/).filter(Boolean);if(!terms.length)return '';
 var L=repCatalogo().lista.filter(function(x){return terms.every(function(t){return x.q.indexOf(t)>=0;});});
 return Object.keys(REP_ROT).map(function(g){var A=L.filter(function(x){return x.grupo===g;}).sort(function(a,b){return b.us.length-a.us.length||a.label.localeCompare(b.label);});return '<section><h4>'+REP_ROT[g]+' <small>'+A.length+'</small></h4>'+(A.length?A.slice(0,10).map(function(x){return '<button type="button" data-rep-grupo="'+g+'" data-rep-result="'+esc(x.k)+'"><span>'+esc(x.label)+'</span><small>'+x.us.length+' usos</small></button>';}).join('')+(A.length>10?'<p class="meta">Primeiros 10; refine a busca ou consulte a seção.</p>':''):'<p class="meta">Sem resultado.</p>')+'</section>';}).join('');
}
function repLinksDoProcesso(n){
 if(!repPermitido())return '';var M=repCatalogo().porProc.get(repCnj(n));if(!M||!M.size)return '';
 var L=Array.from(M.values());return '<div class="pp-k" style="margin-top:14px">Referências do Repertório <small>'+L.length+' vinculadas ao processo</small></div><div class="rep-citacoes">'+Object.keys(REP_ROT).map(function(g){var A=L.filter(function(x){return x.grupo===g;});return A.length?'<div class="rep-cit-grupo"><b>'+REP_ROT[g]+'</b><div>'+A.map(function(x){return '<button type="button" data-rep-link="'+esc(x.k)+'" data-rep-grupo="'+g+'" title="Abrir referência cadastrada">'+esc(x.label)+'</button>';}).join('')+'</div></div>':'';}).join('')+'</div><p class="meta">Vínculos registrados por processo; confira o texto do julgado para identificar a citação específica.</p>';
}
function repAbrirUnificado(grupo,k){
 if(!repPermitido()){toast('Repertório disponível no acesso avançado.');return false;}
 if(!REP_ROT[grupo])return false;
 var v=grupo==='temas'?'temas':'rep',tb=document.querySelector('.tab[data-v="'+v+'"]');if(!tb)return false;
 if(k&&typeof fecharIT==='function')fecharIT();
 if(tb.getAttribute('aria-selected')!=='true')tb.click();
 if(grupo==='temas'){if(k){if(!NIDX[k])nPrep();if(NIDX[k])nAbrir(NIDX[k]);}}
 else{var b=document.querySelector('#v-rep > .sub button[data-s="'+grupo+'"]');if(b&&RP.sub!==grupo)b.click();else if(RP.sub!==grupo){RP.sub=grupo;rpRender();}
  if(k&&grupo==='reg'){var r=rgDados().find(function(z){return z['Código']===k;});if(r)rgAbrir(r);}
  else if(k){var x=rpItens().find(function(z){return z.k===k;});if(x)rpAbrir(x);}
 }
 if(window.VDM_repSync)window.VDM_repSync();if(window.VDM_cnSync)window.VDM_cnSync();return true;
}
window.VDM_repertorioAbrir=repAbrirUnificado;window.VDM_repertorioBusca=repBuscaTransversal;
document.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('[data-rep-link]');if(!b)return;ev.preventDefault();ev.stopImmediatePropagation();repAbrirUnificado(b.dataset.repGrupo,b.dataset.repLink);},true);

function citados(t){
  t=String(t||'');if(!NL.length)nPrep();var en=[],no=[],ke={},kn={},m;RE_REF.lastIndex=0;
  while((m=RE_REF.exec(t))){
    if(m[1]){var k='T'+String(m[2]).replace(/\D/g,'')+(m[3]||'').toUpperCase();if(!ke[k]){ke[k]=1;en.push('Tema '+m[2].replace(/\.$/,'')+(m[3]?'/'+m[3].toUpperCase():''));}}
    else if(m[4]){var k2='S'+(m[5]?'V':'')+String(m[6]).replace(/\D/g,'')+(m[7]||'').toUpperCase();if(!ke[k2]){ke[k2]=1;en.push('Súmula '+(m[5]?'Vinculante ':'')+m[6].replace(/\.$/,'')+(m[7]?'/'+m[7].toUpperCase():''));}}
    else if(m[8]){var N=achaNorma(m[9],m[11]);if(N){var k3=N['Código'];if(!kn[k3]){kn[k3]=1;no.push('art. '+N['Dispositivo']+' '+(/^(CPC|CTN|C[óo]digo)/i.test(m[11])?'do ':'da ')+m[11]);}}}
  }
  en=en.filter(function(x){return /\//.test(x)||!en.some(function(y){return y!==x&&y.indexOf(x+'/')===0;});});
  return {enun:en,norm:no};
}
/* ================= MENÇÕES: Tema, Súmula, artigo de lei e resolução viram balão ================= */
var REF={},RN=0;
function dn(x){return String(x||'').replace(/[º°ª.\s]/g,'').toLowerCase();}
function normasDB(){var db=window.VDM_DB&&window.VDM_DB();return (db&&db['Normas'])||[];}
function achaNorma(art,dip){
  var dl=nz(String(dip||'').trim());
  var cand=normasDB().filter(function(n){var D=n['Diploma']||'',N=n['Norma']||'';
    if(/^cpc$/.test(dl))return D==='CPC';if(/^ctn$/.test(dl))return D==='CTN';if(/^(cf|constituicao)/.test(dl))return D==='Constituição Federal';
    if(/^lef$/.test(dl))return /6\.830/.test(N);if(/^(cc|codigo civil)$/.test(dl))return D==='Código Civil';
    var m=dl.match(/([\d.]+)\/(\d{2,4})/);if(!m)return false;var mm=nz(N).match(/([\d.]+)\/(\d{2,4})/);
    return mm&&mm[1].replace(/\./g,'')===m[1].replace(/\./g,'')&&mm[2].slice(-2)===m[2].slice(-2)&&((/^lc/.test(dl)||/complementar/.test(dl))===/^lc/.test(nz(N)));});
  return cand.filter(function(n){return dn(n['Dispositivo'])===dn(art);})[0]||null;
}
var RE_REF=/\b(Temas?)\s+(?:n[º°.]\s*)?(\d[\d.]*)(?:\s*\/\s*(STF|STJ))?|\b(S[úu]mula)\s+(Vinculante\s+)?(?:n[º°.]\s*)?(\d[\d.]*)(?:\s*\/\s*(STF|STJ|TFR))?|\b(arts?\.|artigos?)\s*(\d[\d.]*(?:[º°])?(?:-[A-Z])?)((?:\s*,\s*(?:§\s*\d+[º°]?|inciso\s+[IVXLC]+|[IVXLC]+|par[áa]grafo [úu]nico|caput))*)\s*,?\s+(?:da|do|de)\s+(Lei\s+Complementar\s+(?:n[º°.]\s*)?[\d.]+\/\d{2,4}|Lei\s+(?:n[º°.]\s*)?[\d.]+\/\d{2,4}|LC\s+[\d.]+\/\d{2,4}|CTN|CPC|CF|LEF|Constitui[çc][ãa]o(?:\s+Federal)?|C[óo]digo\s+Civil)|\b(Res(?:\.|olução))\s+(CNJ|PRES|CJF)\s*(?:n[º°.]\s*)?(\d[\d.]*)\/(\d{4})/gi;
var RE_REG=new RegExp(RE_REF.source+'|\\b(arts?\\.|artigos?)\\s*(\\d+[º°]?(?:-?[A-Z])?)(?![\\d.])','gi');
function refs(t,ctx){
  t=String(t==null?'':t);if(!NL.length)nPrep();
  var RX=ctx==='reg'?RE_REG:RE_REF;
  var out='',i=0,m;RX.lastIndex=0;
  while((m=RX.exec(t))){var k=null,txt=m[0];
    if(m[16]){var ra=/^[^.;:]{0,40}?\b(?:da|do|de)\s+(?:Lei|LC|CTN|CPC|CF|LEF|Constitui|C[óo]digo|Decreto|Resolu|Emenda|Regimento Interno d[oe] (?:STF|STJ|Supremo))/i.test(t.slice(m.index+txt.length))?null:rgArtPorNum(m[17]);if(ra&&ra['Código']!==RP.sel){k='r'+(RN++);REF[k]={tit:'RITRF3, '+ra['Rótulo'],txt:ra['Título ou texto'],meta:(ra['Vigência']==='Revogado'?'Revogado · ':'')+'clique para abrir',goReg:ra['Código']};}}
    else 
if(m[1]){var num=+m[2].replace(/\./g,''),tr=m[3],A=NL.filter(function(x){return x.tema&&x.num===num&&(!tr||x.trib.toUpperCase()===tr.toUpperCase());});
      k='r'+(RN++);REF[k]=A.length?{tit:A.map(function(x){return x.full;}).join(' · '),txt:A.map(function(x){return (A.length>1?x.trib+': ':'')+(x.of||x.rs||x.tit);}).join('\n\n'),meta:A.length===1?(A[0].of?'Tese oficial':'Resumo do gabinete')+' · clique para abrir':'Mais de um tema com esse número',go:A.length===1?A[0].k:null}:{tit:'Tema '+m[2]+(tr?'/'+tr:''),txt:'',meta:'Tema não cadastrado nos Enunciados.'};}
    else if(m[4]){var n2=+m[6].replace(/\./g,''),sv=!!m[5],tr2=m[7],B=NL.filter(function(x){return !x.tema&&x.num===n2&&(sv?x.trib==='SV':(!tr2||x.trib.toUpperCase()===tr2.toUpperCase())&&x.trib!=='SV');});
      k='r'+(RN++);REF[k]=B.length?{tit:B.map(function(x){return x.full;}).join(' · '),txt:B.map(function(x){return x.enun;}).join('\n\n'),meta:B.length===1?'Enunciado · clique para abrir':'Mais de uma súmula com esse número',go:B.length===1?B[0].k:null}:{tit:'Súmula '+m[6]+(tr2?'/'+tr2:''),txt:'',meta:'Súmula não cadastrada nos Enunciados.'};}
    else if(m[8]){var N=achaNorma(m[9],m[11]);if(N){k='r'+(RN++);REF[k]={tit:N['Diploma']+', art. '+N['Dispositivo'],txt:N['Texto literal'],meta:N['Nome do diploma']||N['Norma'],goRep:N['Código']};}}
    else if(m[12]){var org=m[13].toUpperCase(),num3=m[14].replace(/\./g,''),R=normasDB().filter(function(n){var z=nz(n['Norma']);return z.indexOf(nz(org))>=0&&z.replace(/\./g,'').indexOf(num3+'/'+m[15])>=0;});
      k='r'+(RN++);REF[k]=R.length?{tit:R[0]['Norma'],txt:R.map(function(n){return (n['Dispositivo']?'Art. '+n['Dispositivo']+'. ':'')+n['Texto literal'];}).join('\n\n'),meta:R[0]['Nome do diploma']||'',goRep:R.length===1?R[0]['Código']:null}:{tit:'Resolução '+org+' '+m[14]+'/'+m[15],txt:'',meta:'Texto não cadastrado no repertório normativo do gabinete.'};}
    out+=esc(t.slice(i,m.index))+(k?'<span class="ref'+(REF[k].go||REF[k].goReg||REF[k].goRep?' go':'')+'" data-ref="'+k+'" tabindex="0">'+esc(txt)+'</span>':esc(txt));i=m.index+txt.length;}
  return out+esc(t.slice(i));
}
(function(){
  var bal=document.createElement('div');bal.id='vdm-bal';bal.setAttribute('role','tooltip');document.body.appendChild(bal);
  function show(el){var r=REF[el.getAttribute('data-ref')];if(!r)return;bal.innerHTML='<b>'+esc(r.tit)+'</b>'+(r.txt?'<div class="bt">'+esc(r.txt.length>700?r.txt.slice(0,700)+'…':r.txt)+'</div>':'')+(r.meta?'<div class="bm">'+esc(r.meta)+'</div>':'');bal.style.display='block';
    var b=el.getBoundingClientRect(),w=bal.offsetWidth,h=bal.offsetHeight,x=Math.min(window.innerWidth-w-10,Math.max(10,b.left)),y=b.bottom+8;if(y+h>window.innerHeight-10)y=b.top-h-8;bal.style.left=x+'px';bal.style.top=Math.max(10,y)+'px';}
  document.addEventListener('mouseover',function(e){var el=e.target.closest&&e.target.closest('.ref');if(el)show(el);});
  document.addEventListener('mouseout',function(e){if(e.target.closest&&e.target.closest('.ref'))bal.style.display='none';});
  document.addEventListener('focusin',function(e){var el=e.target.closest&&e.target.closest('.ref');if(el)show(el);});
  document.addEventListener('focusout',function(e){if(e.target.closest&&e.target.closest('.ref'))bal.style.display='none';});
  document.addEventListener('click',function(e){var el=e.target.closest&&e.target.closest('.ref');if(!el)return;e.stopPropagation();var r=REF[el.getAttribute('data-ref')];
    if(r&&(r.goReg||r.goRep||r.go)&&repPermitido()){bal.style.display='none';repAbrirUnificado(r.goReg?'reg':r.goRep?'normas':'temas',r.goReg||r.goRep||r.go);return;}show(el);},true);
  window.addEventListener('scroll',function(){bal.style.display='none';},true);
})();

/* ================= navegação: subabas em menus suspensos no cabeçalho ================= */
(function(){
  var MAPA={rep:'#v-rep .sub',edit:'#x-sub',enc:'#enc-sub'};
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
  E.F={};E.q='';E.qn=null;E.qp=null;E.ft=null;FT.tok++;E.y1=E.y2='';$('#e-q').value='';Object.keys(f||{}).forEach(function(k){E.F[k]=f[k];});E.modo='lista';E.sel=null;E.mmOpen=null;
  EM.sub='prec';$$('#e-sub button').forEach(function(z){z.setAttribute('aria-selected',String(z.getAttribute('data-s')==='prec'));});var b=document.querySelector('.tab[data-v="ement"]');if(b)b.click();
}
var xFeito=false;
window.VDM_refresh=function(){if(!$('#v-edit').hidden)xRender();if(!$('#v-dir').hidden)xManual();};
nRender();
window.VDM_view=function(v){
  if(v==='temas')nRender();
  if(v==='rep')rpRender();
  if((v==='temas'||v==='rep')&&window.VDM_repSync)window.VDM_repSync();
  if(v==='ement'){layoutEm('#v-ement');EM.sub='prec';$$('#e-sub button').forEach(function(z){z.setAttribute('aria-selected','true');});mostrar();}
  if(v==='edit'){if(!xFeito){xFeito=true;}xRender();}
  if(v==='dir'){if(ED)xManual();else $('#x-man').innerHTML='<p class="empty">Dados do editorial indisponíveis.</p>';}
};
/*__EDITOR__*/
})();
