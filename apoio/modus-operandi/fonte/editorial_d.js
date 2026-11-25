/* ===== Editorial · Minuta-Matriz — arquitetura D (folha com abas, canhoto e orientações) ===== */
/* ===== Editorial · Peças — arquitetura D =====
   Mesmo motor da página Peças (XP, xPartes, escolha, comCampos, FILL/AUTO, cópia, .docx, PDF, conferência, rascunho);
   muda só a apresentação: barra única no topo, folha com abas por parte, canhoto do trecho à esquerda e orientações à direita. */
document.body.classList.add('dsk');
var DK={parte:'',cl:'ap'};
var DAJ=/*__DAJ__*/{}; var DROT=/*__DROT__*/{};
/* ===== Roteiro da minuta: perguntas do catálogo do gabinete, na posição do bloco aberto =====
   Camadas: roteiro-mestre + espécie do recurso + assunto escolhido + transversais. Só exibe; não escreve na peça. */
var DROTP={relatorio:['Relatório'],
  voto:['Admissibilidade','Preliminares e prejudiciais','Decisão recorrida','Questão em discussão','Moldura jurídica','Na espécie: fatos','Na espécie: provas','Aplicação ao caso','Fecho da questão','Consectários','Honorários','Complementos','Dispositivo','Encerramento'],
  ementa:['Ementa e acórdão','Revisão redacional'],acordao:['Ementa e acórdão']};
DROTP.monocratica=DROTP.voto;DROTP['acordao-completo']=DROTP.relatorio.concat(DROTP.voto,DROTP.ementa);
function dkRotPos(id){if(DROTP[id])return DROTP[id];if(/^rel-/.test(id))return DROTP.relatorio;if(id==='ed'||id==='agint')return DROTP.voto;return [];}
function dkRotEsp(){var jg=dkJg(),cl=dkCl(),L=[];
  if(jg==='ed')L.push('Embargos de declaração');else if(jg==='agint')L.push('Agravo interno');
  else if(cl==='ai')L.push('Agravo de instrumento');
  else{L.push('Apelação cível');if(cl==='aprn'||jg==='dap')L.push('Remessa necessária');}
  if(dkPron()==='mono')L.push('Decisão monocrática');
  return L;}
var DROTB=[
  ['relatorio',/^Abertura/,['Relatório'],0],['relatorio',/^Razões|^Vícios|^Ementa embargada/,['Relatório'],1],['relatorio',/Contrarraz|Contraminuta|Resposta|Ministério|Parecer|^Encerramento/,['Relatório'],2],
  ['voto',/^Abertura/,['Admissibilidade','Preliminares e prejudiciais','Decisão recorrida','Questão em discussão']],['voto',/^Transição/,['Questão em discussão']],
  ['voto',/^Moldura|^Fundamentação/,['Moldura jurídica']],['voto',/^Exame do caso|^Caso vertente/,['Na espécie: fatos','Na espécie: provas']],
  ['voto',/^Enfrentamento|^Precedente/,['Aplicação ao caso']],['voto',/^Síntese|^Fecho/,['Fecho da questão']],
  ['voto',/^Honorários/,['Honorários']],['voto',/^Consectários/,['Consectários']],['voto',/^Dispositivo/,['Dispositivo','Complementos']],['voto',/^Encerramento/,['Encerramento']],
  ['monocratica',/^Abertura/,['Admissibilidade']],['monocratica',/^Relato/,['Decisão recorrida']],['monocratica',/^Marco decisório/,['Decisão recorrida','Questão em discussão']],
  ['monocratica',/^Fundamentação/,['Moldura jurídica','Na espécie: fatos','Na espécie: provas','Aplicação ao caso','Fecho da questão']],
  ['monocratica',/^Dispositivo/,['Dispositivo','Consectários','Honorários','Complementos']],
  ['ementa',/^Rodapé/,['Ementa e acórdão','Revisão redacional']],['ementa',/./,['Ementa e acórdão']]];
function dkRotBloco(pid,n){var b=/^rel-/.test(pid)?'relatorio':pid;
  for(var i=0;i<DROTB.length;i++){var o=DROTB[i];if(o[0]===b&&o[1].test(n||''))return o;}return null;}
function dkRotAssuntos(){return (DROT.blocos||[]).filter(function(b){return b.g==='assunto';}).map(function(b){return b.nome;});}
function dkRotItem(b,it,av,ff){
  var st=av&&av.s,bd=st==='ok'?'<span class="xrs ok" title="Conferido pela ficha e pelo texto">✓</span>':st==='al'?'<span class="xrs al" title="Conferir">⚠</span>':'';
  var f=ff!=null?ff:it.f,i=-1;if(f){DK.rotF=DK.rotF||[];i=DK.rotF.push(f)-1;}
  return '<li class="xri'+(it.e?' ess':'')+(st?' s-'+st:'')+'">'+bd+'<b>'+esc(it.q)+'</b>'+(it.e?' <span class="xrie">essencial</span>':'')+
    (av&&av.m?'<p class="xrm">'+esc(av.m)+'</p>':'')+
    (it.o?'<p>'+xFm(it.o)+'</p>':'')+
    (f?'<p class="xrif">'+esc(f).replace(/\n/g,'<br>')+'</p><p class="xrfa"><button type="button" class="lnk" data-xrcp="'+i+'">Copiar fórmula</button></p>':'')+
    '<small>'+esc(b.nome)+(it.fn?' · '+esc(it.fn):'')+'</small></li>';}
/* roteiro aplicado ao caso: cada pergunta lê a ficha do processo aberto e, no bloco selecionado, o texto da folha.
   Situação: ok (atendido), al (conferir, com o motivo) ou na (não se aplica a este caso: fica recolhido). Sem dado, o item fica neutro. */
function dkRotNorm(v){return String(v==null?'':v).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
function dkRotCtx(t){
  var P=window.CQX&&CQX.tem()?CQX.P():null,J=P?CQX.J():null,cp=(J&&P&&String(J.processo||'').replace(/\D/g,'')===String(P.processo||'').replace(/\D/g,'')&&J.campos)||{};
  var g=function(k){var v=cp[k];return v==null?'':typeof v==='object'?JSON.stringify(v):String(v).trim();};
  var txt='';if(t&&t.k){var el=document.querySelector('#x-main [data-xk="'+(window.CSS&&CSS.escape?CSS.escape(t.k):t.k)+'"]');if(el)txt=el.textContent||'';}
  var tj=dkRotNorm(g('triagem.Tipo de Julgamento')||(P&&(P.tipoJulgamento||P.classe))||''),r=dkRotNorm(g('producao.Voto - Resultado')||(P&&P.resultado)||'');
  var res=/rejeit/.test(r)?'rej':/acolhid/.test(r)?'aco':/parcial/.test(r)?'par':/nao conhec/.test(r)?'nc':/desprov|negad|nego provimento|negar provimento|improvid/.test(r)?'des':/provid|dado provimento|dou provimento/.test(r)?'pro':'';
  var rec=cp['origem.Recursos'];if(typeof rec==='string'){try{rec=JSON.parse(rec);}catch(e){rec=null;}}rec=Array.isArray(rec)?rec:[];
  var partes=dkRotNorm(Object.keys(cp).filter(function(k){return /polo/i.test(k);}).map(function(k){return cp[k];}).join(' ')+' '+(P&&P.partes||''));
  return {tem:!!P&&Object.keys(cp).length>0,g:g,txt:dkRotNorm(txt),tj:tj,res:res,rec:rec,ed:/embargos de declara/.test(tj),rn:/remessa/.test(tj),ms:/mandado de seguran|msciv/.test(tj),ai:/agravo de instrumento/.test(tj),
    inss:/\binss\b|instituto nacional do seguro/.test(partes),ajg:/^sim$/i.test(g('triagem.AJG'))};}
var DROT_VERBO={des:/neg(o|ar)(-lhe)? provimento/,pro:/dou provimento|dar provimento/,par:/dou parcial provimento|dar parcial provimento/,nc:/nao conhec/,rej:/rejeit/,aco:/acolh/};
function dkRotAval(it,C){if(!C||!C.tem)return null;var q=it.q,g=C.g,x=C.txt,ok=function(m){return {s:'ok',m:m||''};},al=function(m){return {s:'al',m:m};},na=function(m){return {s:'na',m:m||''};};
  var nat=g('producao.Natureza da condenação'),sc=nat==='Sem condenação';
  if(/^Dispositivo coerente/.test(q)){if(!x)return null;var E=[];
    if(/nos termos da fundamenta/.test(x))E.push('tirar "nos termos da fundamentação"');
    if(!C.ed&&/apela/.test(C.tj)&&/\brecurso\b/.test(x.replace(/recurso adesivo/g,'')))E.push('usar "apelação", não "recurso"');
    if(/procedenc/.test(x))E.push('"procedência/improcedência" é só da sentença');
    if(C.res&&DROT_VERBO[C.res]&&!DROT_VERBO[C.res].test(x))E.push('o verbo não corresponde ao resultado da ficha');
    return E.length?al(E.join('; ')):ok();}
  if(/^Tipo de voto no PJe/.test(q)){var tv=dkRotNorm(g('triagem.Tipo de Voto'));if(!tv)return al('Tipo de voto não registrado na ficha.');
    if(/procedenc/.test(tv))return al('"Procedência" é só da sentença.');if(C.ed&&/provid/.test(tv))return al('Embargos são acolhidos ou rejeitados, nunca providos.');
    if(C.res==='des'&&!/nao provid|desprov|negad/.test(tv))return al('Tipo de voto não bate com o resultado (desprovido).');return ok();}
  if(/^Recurso adesivo e remessa/.test(q)){var ad=/^sim$/i.test(g('triagem.Recurso adesivo'));if(!C.rn&&!ad&&C.rec.length<2)return na('Sem adesivo, remessa ou segundo recurso.');
    if(x&&C.rn&&!/remessa/.test(x))return al('A remessa necessária não está no dispositivo.');if(x&&ad&&!/adesivo/.test(x))return al('O recurso adesivo não está no dispositivo.');return x?ok():null;}
  if(/^Sucumbência recursal/.test(q)){if(C.ms)return al('Mandado de segurança: sem honorários (art. 25 da Lei 12.016/2009).');if(C.ai)return na('Agravo de instrumento: honorários na ação originária.');
    if(!x)return null;if(/validar|incompat/.test(x))return al('O bloco ainda tem pendência [VALIDAR].');if(/98, § 3/.test(x)&&!C.ajg)return al('Ressalva da gratuidade sem AJG na ficha.');return ok();}
  if(/^Hipóteses sem majoração/.test(q))return C.ms?al('Mandado de segurança: não há honorários.'):null;
  if(/^Sem honorários na origem/.test(q))return g('origem.Sentença - Honorários')?na('A sentença fixou honorários.'):al('A ficha não registra honorários na sentença.');
  if(/^Beneficiário da gratuidade/.test(q))return C.ajg?ok('AJG na ficha: exigibilidade suspensa.'):na('Sem AJG na ficha.');
  if(/^Previdenciário/.test(q))return C.inss||nat==='Previdenciária'?null:na('Não é previdenciário.');
  if(/^Regime anterior|^Selic a partir|^Critério específico/.test(q))return sc?na('Sem condenação.'):null;
  if(/^Juros de mora em benefício/.test(q))return sc?na('Sem condenação.'):C.inss||nat==='Previdenciária'?null:na('Não é benefício previdenciário.');
  if(/^A reforma altera/.test(q))return C.res==='pro'||C.res==='par'?al('Resultado altera a sentença: rever sucumbência e consectários.'):C.res?na('Sentença mantida.'):null;
  if(/^Pessoa natural|^ADC 80|^Pessoa jurídica/.test(q)){var gr=g('triagem.Gratuidade pedida no recurso')||g('producao.Gratuidade no julgamento');if(!gr)return na('Gratuidade não está em discussão.');
    var tp=g('triagem.Gratuidade - Tipo de pessoa');if(/^Pessoa natural/.test(q)&&tp==='Pessoa jurídica')return na('Pessoa jurídica.');if(/^Pessoa jurídica/.test(q)&&tp==='Pessoa natural')return na('Pessoa natural.');
    if(/^ADC 80/.test(q)){var aj=g('origem.Origem - Data de ajuizamento');if(!aj)return al('Data de ajuizamento não registrada na ficha.');return aj<'2026-09-16'?na('Ajuizada antes da ata da ADC 80 (16/09/2026): vale o Tema 1.178/STJ.'):al('Ajuizada após a ata: aplicar a ADC 80.');}
    return null;}
  if(/^Pedidos residuais/.test(q)){var mf=/^sim$/i.test(g('triagem.Má-fé alegada'));if(mf&&x&&!/ma-fe|litigancia/.test(x))return al('Má-fé alegada: enfrentar.');return mf?(x?ok():al('Má-fé alegada: enfrentar.')):null;}
  return null;}
/* fórmula do roteiro com os dados do caso: parte recorrente e ressalva da gratuidade só com AJG */
function dkRotFormula(f,C){if(!f||!C||!C.tem)return f;var p=(C.rec[0]&&(C.rec[0].parte||C.rec[0].recorrente))||'';
  f=f.replace(/\[, observada a gratuidade([^\]]*)\]/,C.ajg?', observada a gratuidade$1':'');
  if(p)f=f.replace(/\[a parte\]|\[o autor \/ a autora\]/g,p);return f;}
function dkRotLista(L,C){var V=L.map(function(x){return {x:x,a:dkRotAval(x.i,C)};}),na=V.filter(function(v){return v.a&&v.a.s==='na';}),vi=V.filter(function(v){return !(v.a&&v.a.s==='na');});
  var li=function(v){return dkRotItem(v.x.b,v.x.i,v.a,dkRotFormula(v.x.i.f,C));};
  return xLista(vi.map(li))+(na.length?'<details class="xrna"><summary>'+na.length+(na.length>1?' itens não se aplicam':' item não se aplica')+' a este caso</summary>'+xLista(na.map(li))+'</details>':'');}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-xrcp]');if(!b)return;var f=(DK.rotF||[])[+b.getAttribute('data-xrcp')];if(f)dkCopy(f,'Fórmula copiada');});
/* assunto do roteiro pelo caso aberto (assunto, tipo de caso, especificidades), até a escolha à mão no seletor */
var DROT_AUTO=[[/28,86/,/28[,.]86|0005019-15\.1997/],[/^PIS\/COFINS: cr/,/(pis|cofins)[\s\S]*(credit|monof|ressarc)/],[/^PIS\/COFINS: ex/,/pis|cofins/],[/^PASEP/,/pasep/],
['Anuidades de conselhos profissionais',/anuidade|conselho (regional|federal)/],[/^Execução fiscal/,/execucao fiscal|embargos a execucao fiscal|\bcda\b/],[/^Perdimento/,/perdimento|aduan/],
[/^Multas/,/multa administrativa|ambiental|auto de infracao/],[/^Tributos federais/,/tribut|repeticao de indebito|compensacao|imposto|contribuic/],['FGTS',/fgts/],['Saúde',/medicament|saude|tratamento|internac|\bsus\b/],
['BPC/LOAS',/\bbpc\b|loas|assistencial|prestacao continuada|amparo social/],['Pensão por morte',/pensao por morte/],[/^Tempo especial/,/tempo especial|aposentadoria especial|atividade especial|insalubr/],
[/^Rural/,/rural|segurado especial|ruricola|boia-fria/],[/^Benefícios por incapacidade/,/incapacidade|auxilio-doenca|auxilio doenca|aposentadoria por invalidez/],
['Revisões e decadência',/revisao de beneficio|revisao da rmi|decadencia|\brmi\b/],['Servidor público',/servidor|vencimento|remuneracao|gratificac/]];
function dkRotAuto(){var P=window.CQX&&CQX.tem()?CQX.P():null;if(!P)return '';
var t=[P.assunto,P.subassuntos,P.especificidades,P.materiaEspecial].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),L=dkRotAssuntos();
for(var i=0;i<DROT_AUTO.length;i++){var r=DROT_AUTO[i];if(!r[1].test(t))continue;var x=L.filter(function(n){return typeof r[0]==='string'?n===r[0]:r[0].test(n);})[0];if(x)return x;}return '';}
function dkRotAs(){return DK.rotAsMan?(DK.rotAs||''):dkRotAuto();}
function dkRotCamadas(){var esp=dkRotEsp(),as=dkRotAs();
  return (DROT.blocos||[]).filter(function(b){return b.g==='mestre'||b.g==='transversal'||(b.g==='especie'&&esp.indexOf(b.nome)>=0)||(b.g==='assunto'&&b.nome===as);});}
function dkRotSel(){var cur=dkRotAs(),opc='<option value="">Sem assunto</option>'+dkRotAssuntos().map(function(x){return '<option value="'+esc(x)+'"'+(x===cur?' selected':'')+'>'+esc(x)+(x===cur&&!DK.rotAsMan?' · pelo caso':'')+'</option>';}).join('');
  return '<div class="xrsel"><label for="drot-as">Assunto</label><select id="drot-as">'+opc+'</select></div>';}
/* roteiro do trecho selecionado, no canhoto */
/* roteiro fora do Minutário por ora: o catálogo (roteiros.json) está em Diretrizes › Padrões decisórios › Roteiros por assunto */
var DK_ROT_MIN=false;
function dkRotTrecho(pid,n,t){
  if(!DK_ROT_MIN)return '';
  var o=dkRotBloco(pid,n);if(!o)return '';
  var usa=dkRotCamadas(),L=[];
  usa.forEach(function(b){(b.itens||[]).forEach(function(it){if(o[2].indexOf(it.pos)>=0)L.push({b:b,i:it});});});
  if(o[3]!=null)L=L.filter(function(x,i){return x.b.g!=='mestre'||i===o[3];});
  if(!L.length)return '';
  L.sort(function(x,y){return (y.i.e?1:0)-(x.i.e?1:0);});
  var ne=L.filter(function(x){return x.i.e;}).length;
  return '<div class="cf xrot"><div class="cfl">Roteiro <span class="pill">'+L.length+'</span>'+(ne?'<em class="xrie">'+ne+(ne>1?' essenciais':' essencial')+'</em>':'')+'</div>'+
    dkRotSel()+dkRotLista(L,dkRotCtx(t))+'</div>';}
/* roteiro da parte inteira, no painel de orientações, quando nenhum trecho está selecionado */
function dkRoteiro(pid){
  if(!DK_ROT_MIN)return '';
  var poss=dkRotPos(pid),B=DROT.blocos||[];if(!poss.length||!B.length)return '';
  var esp=dkRotEsp(),n=0,ess=0,corpo='',usa=dkRotCamadas(),C=dkRotCtx(null);DK.rotF=[];
  (DROT.posicoes||[]).forEach(function(ps){
    if(poss.indexOf(ps)<0)return;
    var L=[];usa.forEach(function(b){(b.itens||[]).forEach(function(it){if(it.pos===ps)L.push({b:b,i:it});});});
    if(!L.length)return;
    L.sort(function(x,y){return (y.i.e?1:0)-(x.i.e?1:0);});n+=L.length;
    var ne=L.filter(function(x){return x.i.e;}).length;ess+=ne;
    DK.rotPs=DK.rotPs||{};
    corpo+='<details class="xrps"'+(DK.rotPs[ps]?' open':'')+' data-rotps="'+esc(ps)+'"><summary>'+esc(ps)+'<small>'+L.length+(ne?' · '+ne+(ne>1?' essenciais':' essencial'):'')+'</small></summary>'+
      dkRotLista(L,C)+'</details>';});
  if(!n)return '';
  return '<div class="dori xrot"><div class="ohd"><p class="kick2">Roteiro · '+esc(String(pid==='relatorio'?'relatório':pid).toUpperCase())+'</p><span class="xrqt">'+n+' · '+ess+(ess>1?' essenciais':' essencial')+'</span></div>'+
    '<p class="ointro">Perguntas do catálogo do gabinete para esta parte. Ao abrir um bloco, fica só o roteiro dele.</p>'+
    dkRotSel()+'<p class="xrn">'+esc(esp.join(' · '))+'</p>'+corpo+'</div>';}

document.addEventListener('change',function(e){if(e.target&&e.target.id==='drot-as'){DK.rotAs=e.target.value;DK.rotAsMan=true;xPagina();}});
document.addEventListener('toggle',function(e){var el=e.target;if(el&&el.hasAttribute&&el.hasAttribute('data-rotps')){DK.rotPs=DK.rotPs||{};DK.rotPs[el.getAttribute('data-rotps')]=el.open;}},true);
var DPREL=/*__DPREL__*/[];
var DEMP=/*__DEMP__*/{};
var DICO={
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  docx:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 12.5l1.2 5 1.8-4 1.8 4 1.2-5"/></svg>',
  pdf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>',
  limpar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/></svg>'};
function dkCopy(txt,msg){function fb(){var a=document.createElement('textarea');a.value=txt;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast(msg||'Copiado');}catch(e){toast('Não foi possível copiar');}a.remove();}
  try{navigator.clipboard.writeText(txt).then(function(){toast(msg||'Copiado');},fb);}catch(e){fb();}}
/* pronunciamento × classe × tipo de julgamento → variante do motor */
var DCL_AC=[['ap','Apelação'],['aprn','Apelação e remessa necessária'],['ai','Agravo de instrumento']];
var DJG=[['rec','Do próprio recurso'],['dap','Dupla apelação'],['ed','Embargos de declaração'],['agint','Agravo interno']];
function dkPron(){return XP.pc==='acordao'?'ac':XP.v.decisao==='desp'?'desp':'mono';}
function dkJg(){var v=XP.v.acordao;return (v==='ed'||v==='agint'||v==='dap')?v:'rec';}
function dkCl(){var v=XP.v.acordao;if(v==='ap'||v==='aprn'||v==='ai')DK.cl=v;else if(v==='dap')DK.cl='ap';return DK.cl;}
function dkSetAc(cl,jg){if(jg==='dap'&&cl!=='ap')cl='ap';DK.cl=cl;XP.v.acordao=jg==='rec'?cl:jg;}
function dkOpt(L,cur,dis){return L.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===cur?' selected':'')+(dis&&dis(o[0])?' disabled':'')+'>'+esc(o[1])+'</option>';}).join('');}
function xBarraD(){
  var pr=dkPron(),v=XP.v[XP.pc],rec=xRecAtual(),MX=rec?xMats(XP.pc,rec):[],cur=xMatAtual(),desp=pr==='desp';
  var h='<div class="dbar"><label>Pronunciamento<select data-dprs aria-label="Pronunciamento">'+dkOpt([['ac','Acórdão'],['mono','Monocrática'],['desp','Despacho']],pr)+'</select></label>';
  if(pr==='ac'){var cl=dkCl(),jg=dkJg();
    h+='<label>Classe processual<select data-dcl>'+dkOpt(DCL_AC,cl)+'</select></label>';
    h+='<label>Tipo de julgamento<select data-djg>'+dkOpt(DJG,jg,function(k){return k==='dap'&&cl!=='ap';})+'</select></label>';}
  else if(pr==='mono')h+='<label>Classe processual<select data-xsrec>'+dkOpt(XRECN,XP.mrec)+'</select></label>';
  if(MX.length){var fr=MX.filter(function(m){return m.padrao||xMatN(m)>=50;}),ou=MX.filter(function(m){return !(m.padrao||xMatN(m)>=50);});
    function opt(m){return '<option value="'+esc(m.id)+'"'+(cur&&cur.id===m.id?' selected':'')+'>'+esc(xCap(m.resultado))+(m.padrao?'':' · '+xMatN(m))+'</option>';}
    h+='<label>'+(desp?'Padrão':'Resultado')+'<select data-xsres><option value="">'+(desp?'Despacho geral':'Estrutura geral')+'</option>'+(fr.length?'<optgroup label="Mais frequentes">'+fr.map(opt).join('')+'</optgroup>':'')+(ou.length?'<optgroup label="Menos frequentes">'+ou.map(opt).join('')+'</optgroup>':'')+'</select></label>';}
  h+='<span class="dbsp"></span><div class="dexp" role="group" aria-label="Exportar"><button type="button" data-xcp title="Copiar a peça inteira, com a formatação do PJe" aria-label="Copiar peça">'+DICO.copy+'</button><button type="button" data-xdocx title="Baixar em Word (.docx)" aria-label="Baixar .docx">'+DICO.docx+'</button><button type="button" data-xpdf title="Salvar em PDF" aria-label="Salvar PDF">'+DICO.pdf+'</button><button type="button" data-xlimpar title="Limpar escolhas, campos e dados desta peça" aria-label="Limpar">'+DICO.limpar+'</button></div></div>';
  return h;}
/* ajuda do construtor (dicionário do relatório), por trecho */
var DAJM=[['relatorio',/^Abertura/,['id:formaAbertura','id:tipoPrincipal','id:objetoAcao','id:julgamentoTipo']],['relatorio',/^Sentença/,['id:sentencaIds','id:sentencaResultado','id:sentencaFundamento','id:sentencaProvidencias','id:sentencaHonorarios','id:sentencaCustas']],
  ['relatorio',/^Razões|Vícios|Ementa embargada/,['rec:ids','rec:verbo','rec:preliminares','rec:teses','rec:pedidos','rec:formaAleg','rec:transicaoMerito']],['relatorio',/Contrarraz|Contraminuta|Resposta/,['contra:parte','contra:ids','contra:preliminares','contra:merito','contra:pedidos']],
  ['relatorio',/Ministério Público/,['id:mpDenominacao','id:mpfModo','id:mpfIds']],['relatorio',/Encerramento/,['oc:tipo','oc:posicao','oc:parte','oc:ids','oc:resultado','oc:texto']],
  ['voto',/Honorários/,['ok:resultado','ok:perc','ok:base','ok:ajg','ok:dpu','ok:semHon']],['ementa',/CASO EM EXAME/,['caso:text']],['ementa',/QUESTÃO/,['questao:text']],
  ['ementa',/RAZÕES/,['razao:conclusao','razao:fundamento','razao:precedente','razao:aplicacao']],['ementa',/DISPOSITIVO/,['disp:text']],['ementa',/^Cabeçalho/,['id:areaDireito','id:classeRecurso','id:tipoAcao','id:temaPrincipal','id:cabComplementos','id:resultadoCab']]];
function dkAjTxt(s){var P=String(s).split(/\s*·\s*(?=(?:Exemplo|Sai assim|Evite):)/);
  return '<p>'+xFm(P[0])+P.slice(1).map(function(x){var m=/^(Exemplo|Sai assim|Evite):\s*([\s\S]*)$/.exec(x);if(!m)return '';var c=m[1]==='Exemplo'?'ex':m[1]==='Evite'?'ev':'sai';return '<span class="'+c+'">'+(c==='ex'?'Ex.: ':c==='ev'?'Evite: ':'')+xFm(m[2])+'</span>';}).join('')+'</p>';}
function dkAjuda(pid,n){var ks=[];DAJM.forEach(function(m){if(m[0]===pid&&m[1].test(n))ks=ks.concat(m[2]);});ks=ks.filter(function(k){return DAJ[k];});
  return ks.length?'<div class="cf daj"><div class="cfl">Como preencher <span class="pill">construtor</span></div>'+ks.map(function(k){return dkAjTxt(DAJ[k]);}).join('')+'</div>':'';}
/* tempestividade: dias úteis (art. 219 do CPC), feriados nacionais fixos e recesso de 20/12 a 20/1 (art. 220) */
function dkD(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
function dkF(d){return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();}
var DKFER=['01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'];
function dkUtil(d){var w=d.getDay(),md=('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2),mo=d.getMonth()+1,di=d.getDate();
  if(w===0||w===6)return false;if(DKFER.indexOf(md)>=0)return false;if((mo===12&&di>=20)||(mo===1&&di<=20))return false;return true;}
function dkProx(d){var x=new Date(d.getTime());do{x.setDate(x.getDate()+1);}while(!dkUtil(x));return x;}
function dkTempCalc(box){var g=function(k){return box.querySelector('[data-dtc="'+k+'"]');};var c=dkD(g('ci').value),it=dkD(g('in').value),pz=+g('pz').value||15,dob=g('db').checked,out=box.querySelector('.dout');
  if(!c){out.className='dout';out.innerHTML='<span class="meta">Informe a data da consulta à intimação (ou do fim dos 10 dias para consultá-la).</span>';return;}
  var n=dob?pz*2:pz,ini=dkProx(dkProx(c)),fim=ini,i;for(i=1;i<n;i++)fim=dkProx(fim);
  var ok=it?it.getTime()<=fim.getTime():null,txt='iniciando-se a contagem do prazo recursal em '+dkF(ini)+', com término em '+dkF(fim)+'.'+(it?' Tendo sido o recurso interposto em '+dkF(it)+', é '+(ok?'tempestivo':'intempestivo')+'.':'');
  out.className='dout'+(ok===true?' ok':ok===false?' no':'');out.innerHTML='<b>'+n+' dias úteis'+(dob?' (em dobro)':'')+'.</b> Intimação em '+dkF(dkProx(c))+'; início em '+dkF(ini)+'; término em '+dkF(fim)+(it?'; interposição em '+dkF(it)+' → <b>'+(ok?'tempestivo':'intempestivo')+'</b>':'')+'.<br><span class="meta">Feriados móveis, locais e suspensões do tribunal não entram na conta [VALIDAR].</span>';
  box._txt=txt;}
function dkTemp(){return '<div class="cf" data-dtemp><div class="cfl">Tempestividade <span class="pill">cálculo</span></div><div class="dfd"><label>Consulta à intimação eletrônica<input type="date" data-dtc="ci"></label><div class="g2"><label>Prazo (dias úteis)<input type="number" min="1" value="15" data-dtc="pz"></label><label>Interposição<input type="date" data-dtc="in"></label></div><label class="dck"><input type="checkbox" data-dtc="db"> Em dobro (Fazenda Pública, MP, Defensoria · arts. 180, 183 e 186 do CPC)</label></div><div class="dout"><span class="meta">Informe a data da consulta à intimação (ou do fim dos 10 dias para consultá-la).</span></div><button type="button" class="dbt" data-dtcp>'+DICO.copy+' Copiar parágrafo de tempestividade</button></div>';}
function dkPrel(){if(!DPREL.length)return '';return '<div class="cf"><div class="cfl">Admissibilidade e preliminares <span class="pill">'+DPREL.length+' parágrafos</span></div>'+DPREL.map(function(p,i){return '<details class="dmd"><summary>'+esc(p.titulo)+'</summary><div class="tx">'+(p.uso?'<p class="meta" style="margin:0 0 4px">'+esc(p.uso)+'</p>':'')+xFm(p.texto)+'<br><button type="button" class="dbt" data-dpcp="'+i+'">'+DICO.copy+' Copiar</button></div></details>';}).join('')+'</div>';}
/* padrões redacionais da ementa, colhidos dos precedentes do gabinete */
function dkEmenta(n){var v=XP.v.acordao,h='',L;
  if(/^Cabeçalho/.test(n)&&(L=(DEMP.cab||{})[v]||(DEMP.cab||{}).ap))h='<div class="cf"><div class="cfl">Conclusão do cabeçalho <span class="pill">precedentes</span></div>'+L.map(function(x){return '<button type="button" class="dfm" data-dfcp="'+esc(x[0])+'">'+esc(x[0])+(x[1]?'<small>'+esc(x[1])+'</small>':'')+'</button>';}).join('')+'<p class="meta" style="margin:6px 0 0">'+esc(DEMP.cabNota||'')+'</p></div>';
  if(/CASO EM EXAME/.test(n)&&(L=(DEMP.caso||{})[v]||(DEMP.caso||{}).ap))h='<div class="cf"><div class="cfl">Abertura do caso em exame <span class="pill">'+esc((DJG.concat(DCL_AC).filter(function(o){return o[0]===v;})[0]||['',''])[1])+'</span></div>'+L.map(function(x){return '<button type="button" class="dfm" data-dfcp="'+esc(x[0])+'">'+esc(x[0])+(x[1]?'<small>'+esc(x[1])+'</small>':'')+'</button>';}).join('')+'</div>';
  if(/QUESTÃO/.test(n)&&DEMP.questao)h='<div class="cf"><div class="cfl">Fórmulas mais usadas <span class="pill">precedentes</span></div>'+DEMP.questao.map(function(x){return '<button type="button" class="dfm" data-dfcp="'+esc(x[0])+'">'+esc(x[0])+'<small>'+esc(x[1])+'</small></button>';}).join('')+'<p class="meta" style="margin:6px 0 0">'+esc(DEMP.questaoNota||'')+'</p></div>';
  if(/RAZÕES/.test(n)&&DEMP.razoes)h='<div class="cf"><div class="cfl">Medida das razões <span class="pill">precedentes</span></div><ul>'+DEMP.razoes.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div>';
  return h;}
function dkCanTrecho(sel){var t=sel.t,pt=sel.pt,E=escolha(t,XP.alt),ai=E.ai,h='';
  h+='<div class="cvh"><div><p class="cvk">'+esc(pt.t)+(t.opc?' · opcional':'')+'</p><p class="cvt">'+esc(t.n)+'</p></div><button type="button" class="cvx" data-dsel="" title="Fechar o trecho" aria-label="Fechar o trecho">×</button></div>';
  if(t.alts.length>1)h+='<div class="cf"><div class="cfl">Versões do texto <span class="pill">'+t.alts.length+'</span></div><div class="dvl">'+t.alts.map(function(x,i){return '<button type="button" data-xalt="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===ai)+'">'+esc(x.lab||('Versão '+(i+1)))+'</button>';}).join('')+'</div>'+(E.sub?'<div class="dvl" style="margin-top:6px">'+E.sub.map(function(x,i){return '<button type="button" data-xsub="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===E.si)+'">'+esc(x.lab)+'</button>';}).join('')+'</div>':'')+'</div>';
  var rr=(t.r||[]).concat((t.alts[Math.min(XP.alt[t.k]||0,Math.max(0,t.alts.length-1))]||{}).r||[]);
  h+='<div class="cf"><div class="cfl">Regras do trecho'+(rr.length?' <span class="pill">'+rr.length+'</span>':'')+'</div>'+(rr.length?xLista(rr.map(function(r){return '<li>'+xFm(r)+'</li>';})):'<p class="meta" style="margin:0">Sem regra específica além da fórmula.</p>')+'</div>';
  if(t.info)h+='<div class="cf"><div class="cfl">Tabela de referência</div>'+xInfo(t.info)+'</div>';
  h+=dkAjuda(pt.id,t.n);
  if(pt.id==='ementa')h+=dkEmenta(t.n);
  if((pt.id==='voto'&&/^(Abertura|Transição ao mérito)/.test(t.n))||(pt.id==='monocratica'&&/^(Marco decisório|Fundamentação)/.test(t.n)))h+=dkTemp()+dkPrel();
  if(!t.opc&&!xFixo(pt.id,t))h+='<div class="cf"><button type="button" class="dact" data-xfora="'+esc(t.k)+'">Retirar este trecho da peça</button></div>';
  else if(t.opc)h+='<div class="cf"><button type="button" class="dact" data-xfecha="'+esc(t.k)+'">Recolher este trecho opcional</button></div>';
  return h;}
function dkCanPeca(PT,pt){var h='<div class="cvh"><div><p class="cvk">'+esc(XPECAS[XP.pc].t)+'</p><p class="cvt">'+esc(pt.t)+'</p></div></div>';
  if(pt.res)h+='<div class="cf"><p class="meta" style="margin:0">'+esc(pt.res)+'</p></div>';
  h+='<div class="cf"><div class="cfl">Trechos <span class="pill">'+pt.tr.length+'</span></div><div class="dtl">'+pt.tr.map(function(t){if(t.n==='Sentença'&&sentNaAbertura(pt.tr,XP.alt))return '';var fo=XP.fora[t.k],op=t.opc&&!XP.abre[t.k];return '<button type="button" class="'+(fo||op?'op':'')+'" data-'+(fo?'xvolta':op?'xabre':'dsel')+'="'+esc(t.k)+'"><span>'+esc(t.n)+'</span><small>'+(fo?'retirado':op?'opcional':t.alts.length>1?t.alts.length+' versões':'')+'</small></button>';}).join('')+'</div><p class="meta" style="margin:8px 0 0">Clique num trecho da folha para abrir aqui as versões, as regras e os apoios dele.</p></div>';
  if(pt.ex)h+='<div class="cf"><button class="dbt" data-xex>Modelos-matriz de decisão monocrática →</button></div>';
  h+=dkRascunhoAnterior();
  return h;}
/* campo de ID: azul-acinzentado, distinto do amarelo de redação */
function dkMarcaIds(r){$$('.fill',r).forEach(function(f){var p=f.previousSibling,t=p&&p.nodeType===3?p.nodeValue:(p&&p.textContent)||'';if(/\bIDs?[’']?s?\s*(?:n?º\s*)?$/.test(t)||/^ID/.test(f.getAttribute('data-ph')||''))f.classList.add('idf');});}
function xPagina(){
  var PT=xPartes(),FMT=((ED.pecas.forma.filter(function(f){return f.t==='Formatação para o PJe';})[0]||{}).r)||[];XP._PT=PT;xAuto(PT);
  var ids=PT.map(function(p){return p.id;}),sel=null;
  PT.forEach(function(p){p.tr.forEach(function(t){if(t.k===XP.sel&&!dkFixoCanhoto(p,t))sel={t:t,pt:p};});});
  if(!sel)XP.sel=null;
  if(sel)DK.parte=sel.pt.id;else if(ids.indexOf(DK.parte)<0)DK.parte=ids.indexOf('relatorio')>=0?'relatorio':ids[0];
  var pt=PT.filter(function(p){return p.id===DK.parte;})[0];
  /* topo */
  var wrap=$('#x-wrap'),top=$('#x-top');if(!top){top=document.createElement('div');top.id='x-top';wrap.insertBefore(top,wrap.firstChild);}
  top.innerHTML=xBarra();
  /* folha */
  var tabs='<div class="dtabs" role="tablist" aria-label="Partes da peça">'+PT.map(function(p,i){var n=p.tr.filter(function(t){return !t.opc&&!xSai(t,p.tr,XP.alt,XP.fora);}).length;return '<button type="button" class="ftab'+(p.id===DK.parte?' on':'')+'" role="tab" aria-selected="'+(p.id===DK.parte)+'" data-dparte="'+p.id+'"><span class="n">'+(i+1)+'</span>'+esc(p.t)+'<small>'+n+'</small></button>';}).join('')+'<span class="dtsp"></span>'+(PT.length>1?'<button type="button" class="dcpp" data-xcpp="'+pt.id+'" title="Copiar '+esc(pt.t.toLowerCase())+' com a formatação do PJe">'+DICO.copy+'<span> Copiar '+esc(pt.t.toLowerCase())+'</span></button>':'')+'</div>';
  var h=pt.pj?'<div class="dpj" id="xp-'+pt.id+'">'+esc(pt.pj)+' <small>(inserido pelo PJe)</small></div>':'<div id="xp-'+pt.id+'" style="height:6px"></div>',aposVoc=false,opcs=[];
  function flush(){if(opcs.length){h+='<div class="dopc">'+opcs.join('')+'</div>';opcs=[];}}
  pt.tr.forEach(function(t){
    if(t.n==='Sentença'&&sentNaAbertura(pt.tr,XP.alt))return;
    if(XP.fora[t.k]){opcs.push('<button type="button" class="ch fora" data-xvolta="'+esc(t.k)+'">+ '+esc(t.n)+' <i>retirado</i></button>');return;}
    if(t.opc&&!XP.abre[t.k]){opcs.push('<button type="button" class="ch" data-xabre="'+esc(t.k)+'">+ '+esc(t.n)+' <i>opcional</i></button>');return;}
    flush();
    var E=escolha(t,XP.alt),ai=E.ai,a=E.a,min=false;
    if(aposVoc&&a.f){min=true;aposVoc=false;a={lab:a.lab,f:a.f.charAt(0).toLowerCase()+a.f.slice(1),r:a.r};}
    var ph=aposVoc&&!a.f;if(t.n==='Vocativo')aposVoc=true;else if(ph)aposVoc=false;
    var vers='';if(t.alts.length>1){var nb=t.alts.filter(function(x){return !x.base;}).length,hb=nb&&nb<t.alts.length,vb=XP.vb[t.k]||(t.alts[ai]&&t.alts[ai].base);
      vers='<div class="vs" role="group" aria-label="Versões">'+t.alts.map(function(x,i){if(x.base&&hb&&!vb)return '';return '<button type="button"'+(x.base&&hb?' class="b"':'')+' data-xalt="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===ai)+'">'+esc(x.lab||('Versão '+(i+1)))+'</button>';}).join('')+'</div>'+(hb?'<button type="button" class="dact" data-xbase="'+esc(t.k)+'">'+(vb?'menos':'+ '+(t.alts.length-nb)+' da base')+'</button>':'');}
    var sub=E.sub?'<div class="vs sub" role="group">'+E.sub.map(function(x,i){return '<button type="button" data-xsub="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===E.si)+'">'+esc(x.lab)+'</button>';}).join('')+'</div>':'';
    var acts=t.opc?'<button type="button" class="dact" data-xfecha="'+esc(t.k)+'" title="Tirar o trecho opcional da peça">recolher</button>':xFixo(pt.id,t)?'':'<button type="button" class="dact" data-xfora="'+esc(t.k)+'" title="Retirar da peça, da cópia e do .docx">retirar</button>';
    var rn=(t.r||[]).length;
    var body=(pt.id==='ementa'&&/^[IV]+\./.test(t.n)?'<p class="em"><b>'+esc(t.n)+'</b></p>':'')+
      (a.f?xParas(a.f,pt.id,t.n,min&&!/^\s*(\[|\{\{|…)/.test(a.f)?' <span class="drn" title="Primeiro parágrafo após o vocativo">inicia em minúscula</span>':'',{k:t.k+'@'+E.key,i:0,auto:true})
        :(pt.id==='ementa'&&/^[IV]+\./.test(t.n)?(t.r.length?'<p class="xph em">'+esc(t.r[0])+'</p>':''):'<p class="xph'+(pt.id==='ementa'?' em':' std')+'">'+(ph?'em minúscula · ':'')+esc(t.n)+(t.r.length?': '+esc(t.r[0]):'')+'</p>'));
    h+='<div class="xblk'+(XP.sel===t.k?' on':'')+'" data-xk="'+esc(t.k)+'"><div class="band"><span class="bl">'+esc(t.n)+'</span>'+vers+sub+'<span class="dsp"></span>'+(rn?'<span class="drn">'+rn+(rn>1?' regras':' regra')+'</span>':'')+(t.info?'<span class="drn">tabela</span>':'')+acts+'</div><div class="dbody">'+body+'</div></div>';
  });
  flush();
  $('#x-main').innerHTML=tabs+'<div class="xsheet">'+h+'</div>';
  dkMarcaIds($('#x-main'));
  /* canhoto */
  var as=$('#x-aside'),st=as.scrollTop;
  as.innerHTML='<div class="dcan-h"><span>CANHOTO</span><small>'+(sel?'trecho selecionado':'peça')+'</small></div><div class="dcan">'+(sel?dkCanTrecho(sel):dkCanPeca(PT,pt))+'</div>';
  as.scrollTop=sel?0:st;
  var tb=as.querySelector('[data-dtemp]');if(tb){if(DK.temp)['ci','pz','in','db'].forEach(function(k){var el=tb.querySelector('[data-dtc="'+k+'"]');if(k==='db')el.checked=!!DK.temp.db;else if(DK.temp[k])el.value=DK.temp[k];});dkTempCalc(tb);}
  /* orientações da parte ativa */
  var DF=estiloItens().filter(function(r){return r.g==='F. Dispositivo e fecho';}),g='',bl='',es=estruturaRegras(pt.id),mc=MANG[pt.id]?manCap('02').filter(function(r){return r['Grupo']===MANG[pt.id];}):[];
  if(es.length)bl+='<details class="xgd" open><summary>Estrutura</summary>'+xLista(es.map(function(r){return '<li><b>'+esc(r.titulo)+'.</b> '+xFm(r.pref||'')+(r.ev?' <span class="xev">Evitar: '+xFm(r.ev)+'</span>':'')+'</li>';}))+'</details>';
  if(pt.notas&&pt.notas.length)bl+='<details class="xgd"'+(es.length?'':' open')+'><summary>Notas</summary>'+xLista(pt.notas.map(function(x){return '<li>'+xFm(x)+'</li>';}))+'</details>';
  if((pt.id==='voto'||pt.id==='monocratica')&&DF.length)bl+='<details class="xgd"><summary>Dispositivo e fecho</summary>'+xLista(DF.map(function(r){return '<li><b>'+esc(r.titulo||'')+'.</b> '+xFm(r.pref||'')+(r.ev?' <span class="xev">Evitar: '+xFm(r.ev)+'</span>':'')+'</li>';}))+'</details>';
  if(mc.length)bl+='<details class="xgd"><summary>Regras complementares</summary>'+xLista(mc.map(function(r){return '<li><b>'+esc(r['Título']||'')+'.</b> '+xFm(r['Orientação']||'')+(r['Evitar']?' <span class="xev">Evitar: '+xFm(r['Evitar'])+'</span>':'')+'</li>';}))+'</details>';
  g+=bl;
  var fm=XP.pc==='acordao'?(pt.id==='ementa'?[FMT[0],FMT[2],FMT[3]]:[FMT[0],FMT[1],FMT[3]]):[FMT[0],FMT[1]];
  g+='<details class="xgd"><summary>Formatação</summary>'+xLista(fm.filter(Boolean).map(function(x){return '<li>'+xFm(x)+'</li>';}))+'</details>';
  var TS=(ED.pecas.tensoes||[]),PR=manCap('08');
  if(TS.length||PR.length)g+='<details class="xgd"><summary>Tensões entre orientações <small>'+(TS.length+PR.length)+'</small></summary>'+TS.map(function(t){return '<div class="xten"><b>'+esc(t.t)+' <mark class="v">[VALIDAR]</mark></b><p><span class="xlb">A</span>'+xFm(t.a)+'</p><p><span class="xlb">B</span>'+xFm(t.b)+'</p></div>';}).join('')+(PR.length?'<div class="xgk">Propostas em avaliação · não vigentes</div>'+xLista(PR.map(function(r){return '<li><b>'+esc(r['Título']||'')+'.</b> '+xFm(r['Orientação']||'')+'</li>';})):'')+'</details>';
  XP._G={h:g,t:pt.t};
  xRef();
  xRascunho();
}
function xRef(){
  var T=[['par','Parágrafos'],['cit','Citação'],['voc','Vocabulário'],['forma','Forma']],R={};T.forEach(function(t){R[t[0]]=xRefTab(t[0]);});
  var el=$('#x-ref'),foco=document.activeElement&&document.activeElement.id==='x-rq',pos=foco?document.activeElement.selectionStart:0,G=XP._G||{h:'',t:''};
  el.innerHTML='<div class="dori"><p class="kick2"><span>Orientações editoriais</span><span>'+esc(G.t)+'</span></p>'+G.h+'</div>'+
    '<div class="dori"><p class="kick2"><span>Consulta de redação</span></p><div class="xrtabs" role="tablist">'+T.map(function(t){return '<button role="tab" data-xrt="'+t[0]+'" aria-selected="'+(XP.tab===t[0])+'">'+t[1]+(XP.q?' <small>'+R[t[0]].n+'</small>':'')+'</button>';}).join('')+'</div><input id="x-rq" type="search" placeholder="Buscar nas orientações…" aria-label="Buscar nas orientações" value="'+esc(XP.q)+'"><div class="xrb">'+(R[XP.tab].h||'<p class="meta">Nada encontrado.</p>')+'</div></div>';
  if(foco){var q=$('#x-rq');q.focus();try{q.setSelectionRange(pos,pos);}catch(e){}}
}
$('#v-edit').addEventListener('click',function(e){var b;
  function fim(){e.preventDefault();e.stopImmediatePropagation();}
  if((b=e.target.closest('[data-dpr]'))){fim();var p=b.getAttribute('data-dpr');if(p==='ac')XP.pc='acordao';else{XP.pc='decisao';XP.v.decisao=p==='desp'?'desp':'mono';}XP.sel=null;DK.parte='';xPagina();return;}
  if((b=e.target.closest('[data-dparte]'))){fim();DK.parte=b.getAttribute('data-dparte');XP.sel=null;xPagina();window.scrollTo({top:Math.min(window.scrollY,$('#x-wrap').getBoundingClientRect().top+window.scrollY-90),behavior:'smooth'});return;}
  if((b=e.target.closest('[data-dsel]'))){fim();XP.sel=b.getAttribute('data-dsel')||null;xPagina();if(XP.sel){var el=document.querySelector('.xblk[data-xk="'+(window.CSS&&CSS.escape?CSS.escape(XP.sel):XP.sel)+'"]');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});}return;}
  if((b=e.target.closest('[data-dpcp]'))){fim();var p0=DPREL[+b.getAttribute('data-dpcp')];if(p0)dkCopy(p0.texto,'Parágrafo copiado');return;}
  if((b=e.target.closest('[data-dfcp]'))){fim();dkCopy(b.getAttribute('data-dfcp'),'Fórmula copiada');return;}
  if((b=e.target.closest('[data-dtcp]'))){fim();var bx=b.closest('[data-dtemp]');dkTempCalc(bx);var base=(DPREL.filter(function(p){return p.id==='prel.m.tempestividade';})[0]||{}).texto||'';
    if(!bx._txt){toast('Informe as datas');return;}dkCopy(base.replace(/iniciando-se a contagem[\s\S]*$/,bx._txt),'Parágrafo de tempestividade copiado');return;}
  if(e.target.closest('#x-aside')&&e.target.closest('input,select,label,details,summary'))e.stopImmediatePropagation();
});
$('#v-edit').addEventListener('change',function(e){var t=e.target;
  if(t.matches('[data-dcl]')){dkSetAc(t.value,dkJg()==='dap'&&t.value!=='ap'?'rec':dkJg());XP.sel=null;DK.parte='';xPagina();}
  else if(t.matches('[data-djg]')){dkSetAc(dkCl(),t.value);XP.sel=null;DK.parte='';xPagina();}
  else if(t.matches('[data-dtc]')){var bx=t.closest('[data-dtemp]');DK.temp={ci:bx.querySelector('[data-dtc="ci"]').value,pz:bx.querySelector('[data-dtc="pz"]').value,in:bx.querySelector('[data-dtc="in"]').value,db:bx.querySelector('[data-dtc="db"]').checked};dkTempCalc(bx);}});
$('#v-edit').addEventListener('input',function(e){if(e.target.matches&&e.target.matches('[data-dtc]')){var bx=e.target.closest('[data-dtemp]');dkTempCalc(bx);}});
/* conferência antes de copiar: o item leva à aba da parte e seleciona o trecho */
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#xconf [data-xir]');if(!b)return;var k=b.getAttribute('data-xir');if(k){XP.sel=k;xPagina();}},true);

/* Minuta-Matriz é instrutor geral: sem construtor de caso concreto nesta página */
DK.fonte='mat';DK.mod='';DK.modq='';DK.inc={};DK.pick='';DK.pickq='';DK.rtab='';DK.fonteManual=false;
try{var _dk=JSON.parse(localStorage.getItem('dk-ed-d')||'{}');DK.man=!!_dk.man;if(_dk.mod)DK.mod=String(_dk.mod);if(_dk.fonte==='mod'&&DK.mod)DK.fonte='mod';if(_dk.inc&&typeof _dk.inc==='object')DK.inc=_dk.inc;}catch(e){}
function dkGuarda(){try{localStorage.setItem('dk-ed-d',JSON.stringify({man:DK.man,fonte:DK.fonte==='m28'?'mat':DK.fonte,mod:DK.mod,inc:DK.inc}));}catch(e){}}

/* ===== orientações (painel direito): editoriais e jurídicas do bloco selecionado ===== */
/* orientações por parte e bloco: fonte única em orientacoes.json (a mesma do capítulo do Breviário), injetada no build */
var DORI=/*__DORI__*/{};
var ORI=(DORI.itens||[]).map(function(o){return [o.pid,new RegExp(o.re),o.ed||[],o.ju||[]];});
var ORI_ALIAS={'Recurso':'Razões','Parecer':'Ministério Público','Fundamentação':'Moldura jurídica','Caso vertente':'Exame do caso','Encerramento':'Síntese','Síntese do caso':'Relato'};
function dkRegras(pid,n){var nm=ORI_ALIAS[n]||n,R=[];(ED.pecas.pecas||[]).forEach(function(p){var vv=XP.pc==='acordao'?XP.v.acordao:'';if(p.id!==pid&&!(pid==='relatorio'&&p.id==='rel-'+vv)&&!(pid==='voto'&&p.id===vv))return;(p.elementos||[]).forEach(function(e){if(e.n===nm||e.n===n)(e.r||[]).forEach(function(x){if(R.indexOf(x)<0)R.push(x);});});});return R;}
function dkOri(pid,n){for(var i=0;i<ORI.length;i++){var o=ORI[i];if(o[0]===pid&&o[1].test(n||''))return o;}return null;}
function xRef(){
  var el=$('#x-ref');if(!el)return;var foco=document.activeElement&&document.activeElement.id==='x-rq',pos=foco?document.activeElement.selectionStart:0;
  var sel=XP._SEL,pid=DK.parte,pt=(XP._PT||[]).filter(function(p){return p.id===pid;})[0]||{t:''},n=sel?sel.n:'',o=dkOri(pid,n||(pid==='ementa'?'Cabeçalho':''))||(!n?ORI.filter(function(x){return x[0]===pid;})[0]:null),RG=sel?dkRegras(pid,n):[];
  var ed=(o?o[2]:[]).slice(),ju=o?o[3]:[];
  if(pid==='ementa'&&sel){var mk={'Cabeçalho':'CABEÇALHO','I. CASO EM EXAME':'CASO EM EXAME','II. QUESTÃO EM DISCUSSÃO':'QUESTÃO EM DISCUSSÃO','III. RAZÕES DE DECIDIR':'RAZÕES DE DECIDIR','Itens':'ITENS','Rodapé':'RODAPÉ'}[n];if(mk)ed.sort(function(a,b){return (b[0]===mk)-(a[0]===mk);});}
  RG.forEach(function(r){if(!ed.some(function(x){return x[1]===r;}))ed.push(['REGRA DO TRECHO',r]);});
  var tit=sel?n.replace(/^[IV]+\.\s*/,''):pt.t;
  var h='<div class="dori"><div class="ohd"><p class="kick2">Orientações · '+esc(String(tit).toUpperCase())+'</p><button type="button" class="oman" data-dman aria-pressed="'+!!DK.man+'">manual</button></div>'+
    '<p class="ointro">'+(sel?'Regras do bloco selecionado na folha.':pid==='ementa'?'Como montar uma boa ementa: modelo CNJ 154/2024 adaptado, derivado do voto.':'Regras gerais da parte; ao abrir um bloco, aparecem as dele.')+'</p>'+
    '<p class="okk">Editoriais</p>'+(ed.length?ed.map(function(x,i){return '<div class="ori'+(i===0&&sel?' at':'')+'"><p class="kick2">'+esc(x[0])+'</p><p>'+xFm(x[1])+'</p></div>';}).join(''):'<p class="ovz">Sem regra editorial própria além da estrutura.</p>')+
    '<p class="okk jur">Jurídicas</p>'+(ju.length?ju.map(function(x){return '<div class="ori"><p class="kick2">'+esc(x[0])+'</p><p>'+xFm(x[1])+'</p></div>';}).join(''):'<p class="ovz">Sem orientação jurídica própria neste bloco.</p>')+'</div>';
  if(!sel)h+=dkRoteiro(pid);
  if(DK.man){var T=[['par','Parágrafos'],['cit','Citação'],['voc','Vocabulário'],['forma','Forma']],R={};T.forEach(function(t){R[t[0]]=xRefTab(t[0]);});var G=XP._G||{h:''};
    h+='<div class="dori man"><div class="ohd"><p class="kick2">Manual · '+esc(pt.t||'')+'</p></div>'+G.h+'<div class="xrtabs" role="tablist" style="margin-top:10px">'+T.map(function(t){return '<button role="tab" data-xrt="'+t[0]+'" aria-selected="'+(XP.tab===t[0])+'">'+t[1]+(XP.q?' <small>'+R[t[0]].n+'</small>':'')+'</button>';}).join('')+'</div><input id="x-rq" type="search" placeholder="Buscar nas orientações…" aria-label="Buscar nas orientações" value="'+esc(XP.q)+'"><div class="xrb">'+(R[XP.tab].h||'<p class="meta">Nada encontrado.</p>')+'</div></div>';}
  /* orientações fora do canhoto: estão no Breviário (capítulo 7) e, o que importa ao bloco, no balão sobre a folha (dkBalao);
     aqui fica só o material do caso aberto (modelos relacionados e parágrafos) */
  h=window.CQX&&CQX.tem()&&!dk28()?'<div class="dori"><p class="kick2"><span>Material do caso</span></p></div>'+CQX.painel():'';
  el.innerHTML=h;
  if(foco){var q=$('#x-rq');if(q){q.focus();try{q.setSelectionRange(pos,pos);}catch(e){}}}
}
/* barra: Minuta-Matriz e modelos escolhidos expressamente */

function xBarra(){var h=xBarraD();

  if(dkModeloAtivo())h=h.replace(/<label>(Resultado|Padrão)<select data-xsres>[\s\S]*?<\/select><\/label>/,'');
  h=h.replace(/<label>(Texto|Pronunciamento)(<div class="dseg"[\s\S]*?<\/div>)<\/label>/g,'$2');
  h=h.replace(/<label>(Pronunciamento|Classe processual|Tipo de julgamento|Resultado|Padrão)<select/g,function(_,l){return '<label><span>'+({'Classe processual':'Classe','Tipo de julgamento':'Julgamento'}[l]||l)+'</span><select';});
  h=h.replace('<div class="dbar">','<div class="dbar"><div class="dgrp">').replace('<span class="dbsp"></span>','</div><span class="dbsp"></span>');
  h=h.replace('aria-label="Limpar">'+DICO.limpar+'</button>','aria-label="Limpar">'+DICO.limpar+'</button><button type="button" class="pri" data-dconf title="Conferir a peça: campos em aberto, trechos a validar e alertas de redação" aria-label="Conferir">'+DICO.conf+'</button>');
  return h;}
DICO.conf='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 13l2 2 4-4"/></svg>';
var DSIG={'Abertura':'ABR','Sentença':'SEN','Razões':'RAZ','Recurso':'RAZ','Razões do primeiro apelante':'RAZ','Razões do segundo apelante':'RAZ','Contrarrazões':'CTR','Contraminuta':'CTR','Resposta':'CTR','Ministério Público':'MP','Parecer':'MP','Ocorrência':'OCO','Encerramento':'FEC','Cabeçalho':'CAB','Vocativo':'VOC','Transição ao mérito':'TRA','Moldura jurídica':'MOL','Fundamentação':'FUN','Exame do caso':'CAS','Caso vertente':'CAS','Enfrentamento das alegações':'ENF','Precedente':'PRE','Síntese':'SÍN','Honorários recursais':'HON','Consectários':'CON','Dispositivo':'DIS','Itens':'ITE','Rodapé':'ROD','Fórmula':'PRO','Relato':'REL','Síntese do caso':'REL','Marco decisório':'MAR','Comunicação':'COM','Destino dos autos':'DES','Local e data':'LOC','Assinatura':'ASS','Fecho':'FEC','Ementa embargada':'EME','Vícios alegados':'VÍC'};
function dkSig(n){if(DSIG[n])return DSIG[n];var m=/^([IV]+)\./.exec(n);if(m)return m[1];var d=/^(\d)\./.exec(n);if(d)return d[1];return String(n).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase();}
function dkResumo(t){if(XP.fora[t.k])return 'retirado';if(t.opc&&!XP.abre[t.k])return 'opcional';var E=escolha(t,XP.alt);if(t.alts.length>1)return (E.a.lab||'')+(E.sub?' · '+E.sub[E.si].lab:'');var f=String(E.a.f||'').replace(/\s+/g,' ').trim();return f.length>34?f.slice(0,32)+'…':f;}
function dkFixoCanhoto(pt,t){var f=t.alts.length===1?String(t.alts[0].f||'').trim():'';return !t.opc&&(xFixo(pt.id,t)&&!!f&&!/@|\{\{|\[…|…/.test(f)||/^(Vistos\.|DECIDO\.)$/i.test(f));}
function dkOutros(pt,sel){var L=pt.tr.filter(function(t){return !dkFixoCanhoto(pt,t)&&!(t.n==='Sentença'&&sentNaAbertura(pt.tr,XP.alt));});if(!L.length||sel&&L.length<2)return '';
  return '<div class="dout2"><div class="cfl">'+(sel?'Outros blocos':'Blocos da parte')+'</div><ol>'+L.map(function(t,i){if(sel&&t.k===sel.k)return '';var fo=XP.fora[t.k],op=t.opc&&!XP.abre[t.k];return '<li><button type="button" data-'+(fo?'xvolta':op?'xabre':'dsel')+'="'+esc(t.k)+'"><span class="n">'+('0'+(i+1)).slice(-2)+'</span><b>'+esc(t.n)+'</b><small>'+esc(dkResumo(t))+' ›</small></button></li>';}).join('')+'</ol></div>';}
function dkHead(){var h=$('#v-edit .pg-h');if(!h)return;var ed=XS.ed||'pecas',t=$('#v-edit .pg-t h1'),k=$('#v-edit .pg-t .dkk');if(!k&&t){k=document.createElement('p');k.className='dkk';t.parentNode.insertBefore(k,t);}
  var I={pecas:['PADRÃO · MINUTÁRIO','Minutário','Estrutura do pronunciamento conforme o tipo de julgamento. Ao abrir um processo, os campos recebem os dados disponíveis da ficha e da pauta. Na ausência de modelo específico, a Minuta-Matriz sustenta a redação; modelos temáticos são oferecidos separadamente.',''],par:['PADRÃO · PARÁGRAFOS','Parágrafos-padrão','Trechos prontos por matéria e situação, com campos que se preenchem com o caso. Busque, abra e copie para a minuta.',''],mod:['PADRÃO · MODELOS','Modelos','Modelos de acórdão, decisão e despacho extraídos de votos e decisões do Relator, para consulta.','Os modelos ainda não são regra do gabinete: a curadoria está em andamento e a maior parte deles não foi revisada como padrão. Já disponível: busca e filtros por tipo, julgamento, assunto e classe; leitura da peça completa, com ficha e referências rápidas; preenchimento das variáveis pelo número do processo; cópia da peça ou do esqueleto, .docx e PDF.'],dir:['BREVIÁRIO DO GABINETE','Breviário','Entradas rápidas do que o Desembargador fixar e o manual de redação do gabinete: frase, citação, vocabulário, grafias, formatação e estrutura das peças.']}[ed]||['','Editorial',''];
  if(k)k.textContent=I[0];if(t)t.textContent=I[1];var d=$('#x-desc');if(d)d.textContent=I[2];var dv=$('#x-dev');if(!dv&&d){dv=document.createElement('p');dv.id='x-dev';d.parentNode.insertBefore(dv,d.nextSibling);}if(dv){dv.hidden=!I[3];dv.innerHTML=I[3]?'<b>Em desenvolvimento.</b> '+esc(I[3]):'';}
  var sb=$('#x-sub');if(sb&&!sb.querySelector('.dgp')){var gp=document.createElement('span');gp.className='dgp';gp.setAttribute('role','group');gp.setAttribute('aria-label','Padrão: versões alternativas');gp.innerHTML='<span class="dgl" data-n="01">Padrão</span><span class="dgs"></span>';
    sb.insertBefore(gp,sb.firstChild);['pecas','mod'].forEach(function(k){var b=sb.querySelector('button[data-s="'+k+'"]');if(b)gp.querySelector('.dgs').appendChild(b);});}
  $$('#x-sub button').forEach(function(b){var k=b.getAttribute('data-s'),n={dir:'02'}[k];if(n)b.setAttribute('data-n',n);else b.removeAttribute('data-n');var tx={pecas:'Minutário',mod:'Modelos',dir:'Breviário'}[k];if(tx&&b.textContent!==tx)b.textContent=tx;});}
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('#x-sub button'))setTimeout(dkHead,0);});
function xPagina(){
  if(dk28()){var w28=$('#x-wrap'),t28=$('#x-top');if(!t28){t28=document.createElement('div');t28.id='x-top';w28.insertBefore(t28,w28.firstChild);}t28.innerHTML=dkBarraUnica(true);dkModo28(true);CQX.render28();dkHead();return;}
  dkModo28(false);
  var PT=xPartes(),FMT=((ED.pecas.forma.filter(function(f){return f.t==='Formatação para o PJe';})[0]||{}).r)||[];XP._PT=PT;xAuto(PT);
  var ids=PT.map(function(p){return p.id;}),sel=null;
  PT.forEach(function(p){p.tr.forEach(function(t){if(t.k===XP.sel&&!dkFixoCanhoto(p,t))sel={t:t,pt:p};});});
  if(!sel)XP.sel=null;
  if(sel)DK.parte=sel.pt.id;else if(ids.indexOf(DK.parte)<0)DK.parte=ids.indexOf('relatorio')>=0?'relatorio':ids[0];
  var pt=PT.filter(function(p){return p.id===DK.parte;})[0];XP._SEL=sel?sel.t:null;
  var wrap=$('#x-wrap'),top=$('#x-top');if(!top){top=document.createElement('div');top.id='x-top';wrap.insertBefore(top,wrap.firstChild);}
  top.innerHTML=dkBarraUnica();
  /* folha */
  var tabs='<div class="dtabs" role="tablist" aria-label="Partes da peça">'+PT.map(function(p,i){var n=p.tr.filter(function(t){return !t.opc&&!xSai(t,p.tr,XP.alt,XP.fora);}).length;return '<button type="button" class="ftab'+(p.id===DK.parte?' on':'')+'" role="tab" aria-selected="'+(p.id===DK.parte)+'" data-dparte="'+p.id+'"><span class="n">'+('0'+(i+1)).slice(-2)+'</span>'+esc(p.t)+'<small>'+n+'</small></button>';}).join('')+'<span class="dtsp"></span>'+(PT.length>1?'<button type="button" class="dcpp" data-xcpp="'+pt.id+'" title="Copiar '+esc(pt.t.toLowerCase())+' com a formatação do PJe">'+DICO.copy+'<span> Copiar '+esc(pt.t.toLowerCase())+'</span></button>':'')+'</div>';
  var h=pt.pj?'<div class="dpj" id="xp-'+pt.id+'">'+esc(pt.pj)+' <small>(inserido pelo PJe)</small></div>':'<div id="xp-'+pt.id+'" style="height:6px"></div>',aposVoc=false,opcs=[];
  function flush(){if(opcs.length){h+='<div class="dopc">'+opcs.join('')+'</div>';opcs=[];}}
  pt.tr.forEach(function(t){
    if(t.n==='Sentença'&&sentNaAbertura(pt.tr,XP.alt))return;
    if(XP.fora[t.k]){opcs.push('<button type="button" class="ch fora" data-xvolta="'+esc(t.k)+'">+ '+esc(t.n)+' <i>retirado</i></button>');return;}
    if(t.opc&&!XP.abre[t.k]){opcs.push('<button type="button" class="ch" data-xabre="'+esc(t.k)+'">+ '+esc(t.n)+' <i>opcional</i></button>');return;}
    flush();
    var E=escolha(t,XP.alt),ai=E.ai,a=E.a,min=false;
    if(aposVoc&&a.f){min=true;aposVoc=false;a={lab:a.lab,f:a.f.charAt(0).toLowerCase()+a.f.slice(1),r:a.r};}
    var ph=aposVoc&&!a.f;if(t.n==='Vocativo')aposVoc=true;else if(ph)aposVoc=false;
    var vers='';if(t.alts.length>1){var nb=t.alts.filter(function(x){return !x.base;}).length,hb=nb&&nb<t.alts.length,vb=XP.vb[t.k]||(t.alts[ai]&&t.alts[ai].base);
      vers='<div class="vs" role="group" aria-label="Versões">'+t.alts.map(function(x,i){if(x.base&&hb&&!vb)return '';return '<button type="button"'+(x.base&&hb?' class="b"':'')+' data-xalt="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===ai)+'">'+esc(x.lab||('Versão '+(i+1)))+'</button>';}).join('')+'</div>'+(hb?'<button type="button" class="dact" data-xbase="'+esc(t.k)+'">'+(vb?'menos':'+ '+(t.alts.length-nb)+' da base')+'</button>':'');}
    var sub=E.sub?'<div class="vs sub" role="group">'+E.sub.map(function(x,i){return '<button type="button" data-xsub="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===E.si)+'">'+esc(x.lab)+'</button>';}).join('')+'</div>':'';
    var pick=pt.id!=='acordao'&&!dkFixoCanhoto(pt,t)&&!xFixo(pt.id,t)?'<button type="button" class="dact dpk" data-dpick="'+esc(t.k)+'" title="Incluir neste bloco um parágrafo do banco de parágrafos-padrão">+ parágrafo</button>':'';
    var acts=t.opc?'<button type="button" class="dact" data-xfecha="'+esc(t.k)+'" title="Tirar o trecho opcional da peça">recolher</button>':(dkFixoCanhoto(pt,t)||xFixo(pt.id,t)?'':'<button type="button" class="dact" data-xfora="'+esc(t.k)+'" title="Retirar da peça, da cópia e do .docx">retirar</button>');
    var rn=(t.r||[]).length,tag='';
    var body=(pt.id==='ementa'&&/^[IV]+\./.test(t.n)?'<p class="em"><b>'+esc(t.n)+'</b></p>':'')+
      (a.f?xParas(a.f,pt.id,t.n,min&&!/^\s*(\[|\{\{|…)/.test(a.f)?' <span class="drn" title="Primeiro parágrafo após o vocativo">inicia em minúscula</span>':'',{k:t.k+'@'+E.key,i:0,auto:true})
        :(pt.id==='ementa'&&/^[IV]+\./.test(t.n)?(t.r.length?'<p class="xph em">'+esc(t.r[0])+'</p>':''):'<p class="xph'+(pt.id==='ementa'?' em':' std')+'">'+(ph?'em minúscula · ':'')+esc(t.n)+(t.r.length?': '+esc(t.r[0]):'')+'</p>'));
    h+='<div class="xblk'+(XP.sel===t.k?' on':'')+'" data-xk="'+esc(t.k)+'"><div class="band"><span class="bl">'+esc(t.n)+'</span>'+vers+sub+tag+'<span class="dsp"></span>'+(rn?'<span class="drn">'+rn+(rn>1?' regras':' regra')+'</span>':'')+(t.info?'<span class="drn">tabela</span>':'')+(t.inc?'<span class="drn">'+t.inc+' do banco</span>':'')+pick+acts+'</div><div class="dbody"><span class="ptg">'+esc(dkSig(t.n))+'</span>'+body+'</div></div>';
  });
  flush();
  if(PT.length>1){var ix=ids.indexOf(pt.id),pv=PT[ix-1],nx=PT[ix+1];h+='<div class="dnav">'+(pv?'<button type="button" data-dparte="'+pv.id+'">← '+('0'+ix).slice(-2)+' '+esc(pv.t)+'</button>':'<span></span>')+'<span class="dnp">PARTE '+(ix+1)+' DE '+PT.length+'</span>'+(nx?'<button type="button" data-dparte="'+nx.id+'">'+('0'+(ix+2)).slice(-2)+' '+esc(nx.t)+' →</button>':'<span></span>')+'</div>';}
  $('#x-main').innerHTML=tabs+'<div class="xsheet">'+h+'</div>';
  dkMarcaIds($('#x-main'));
  /* Canhoto único: os campos da fórmula permanecem editáveis com ou sem ficha. */
  var as=$('#x-aside');if(!$('#dcan-top')){as.innerHTML='<div class="dcan-h"><span>CANHOTO</span><small id="dcan-mode"></small></div><div class="dcan"><div id="dcan-top"></div><div id="dcan-bot"></div></div>';}
  as.classList.remove('cxon');if(DK._ls!==XP.sel){DK._ls=XP.sel;DK.aj=false;}
  $('#dcan-mode').textContent=sel?'trecho selecionado':'peça';
  $('#dcan-top').innerHTML=sel?dkCanTrecho(sel):dkCanPeca(PT,pt);
  $('#dcan-bot').innerHTML=dkOutros(pt,sel?sel.t:null);
  var tb=as.querySelector('[data-dtemp]');if(tb){if(DK.temp)['ci','pz','in','db'].forEach(function(k){var el=tb.querySelector('[data-dtc="'+k+'"]');if(k==='db')el.checked=!!DK.temp.db;else if(DK.temp[k])el.value=DK.temp[k];});dkTempCalc(tb);}
  dkHead();
  /* manual da parte (orientações gerais, formatação e tensões) */
  var DF=estiloItens().filter(function(r){return r.g==='F. Dispositivo e fecho';}),g='',es=estruturaRegras(pt.id),mc=MANG[pt.id]?manCap('02').filter(function(r){return r['Grupo']===MANG[pt.id];}):[];
  if(es.length)g+='<details class="xgd" open><summary>Estrutura</summary>'+xLista(es.map(function(r){return '<li><b>'+esc(r.titulo)+'.</b> '+xFm(r.pref||'')+(r.ev?' <span class="xev">Evitar: '+xFm(r.ev)+'</span>':'')+'</li>';}))+'</details>';
  if(pt.notas&&pt.notas.length)g+='<details class="xgd"><summary>Notas</summary>'+xLista(pt.notas.map(function(x){return '<li>'+xFm(x)+'</li>';}))+'</details>';
  if((pt.id==='voto'||pt.id==='monocratica')&&DF.length)g+='<details class="xgd"><summary>Dispositivo e fecho</summary>'+xLista(DF.map(function(r){return '<li><b>'+esc(r.titulo||'')+'.</b> '+xFm(r.pref||'')+(r.ev?' <span class="xev">Evitar: '+xFm(r.ev)+'</span>':'')+'</li>';}))+'</details>';
  if(mc.length)g+='<details class="xgd"><summary>Regras complementares</summary>'+xLista(mc.map(function(r){return '<li><b>'+esc(r['Título']||'')+'.</b> '+xFm(r['Orientação']||'')+(r['Evitar']?' <span class="xev">Evitar: '+xFm(r['Evitar'])+'</span>':'')+'</li>';}))+'</details>';
  var fm=XP.pc==='acordao'?(pt.id==='ementa'?[FMT[0],FMT[2],FMT[3]]:[FMT[0],FMT[1],FMT[3]]):[FMT[0],FMT[1]];
  g+='<details class="xgd"><summary>Formatação</summary>'+xLista(fm.filter(Boolean).map(function(x){return '<li>'+xFm(x)+'</li>';}))+'</details>';
  var TS=(ED.pecas.tensoes||[]),PR=manCap('08');
  if(TS.length||PR.length)g+='<details class="xgd"><summary>Tensões entre orientações <small>'+(TS.length+PR.length)+'</small></summary>'+TS.map(function(t){return '<div class="xten"><b>'+esc(t.t)+' <mark class="v">[VALIDAR]</mark></b><p><span class="xlb">A</span>'+xFm(t.a)+'</p><p><span class="xlb">B</span>'+xFm(t.b)+'</p></div>';}).join('')+(PR.length?'<div class="xgk">Propostas em avaliação · não vigentes</div>'+xLista(PR.map(function(r){return '<li><b>'+esc(r['Título']||'')+'.</b> '+xFm(r['Orientação']||'')+'</li>';})):'')+'</details>';
  XP._G={h:g,t:pt.t};
  xRef();
  xRascunho();
}
$('#v-edit').addEventListener('click',function(e){var b;function fim(){e.preventDefault();e.stopImmediatePropagation();}
  if((b=e.target.closest('[data-dman]'))){fim();DK.man=!DK.man;dkGuarda();xRef();return;}
  if((b=e.target.closest('[data-dconf]'))){fim();xAntes(rcEditorial(),function(){toast('Conferência sem pendências');});return;}
  if(e.target.closest('[data-dpr]')){setTimeout(function(){xPagina();},0);}
},true);
$('#v-edit').addEventListener('change',function(e){var t=e.target;if(t.matches('[data-dcl],[data-djg],[data-xsrec]'))setTimeout(function(){xPagina();},0);
  if(t.matches('[data-dprs]')){var p=t.value;if(p==='ac')XP.pc='acordao';else{XP.pc='decisao';XP.v.decisao=p==='desp'?'desp':'mono';}XP.sel=null;DK.parte='';xPagina();}});

/* ===== Canhoto refinado: ações do bloco, campos do bloco, apoios recolhíveis ===== */
function dkCampoRot(f){var ph=f.getAttribute('data-ph')||'',idf=f.classList.contains('idf');if(idf)return 'ID';if(ph&&ph!=='…'&&ph!=='...')return ph;
  var p=f.previousSibling,t='';while(p&&t.length<60){t=(p.textContent||'')+t;p=p.previousSibling;}t=t.replace(/\s+/g,' ').trim().split(' ').slice(-4).join(' ');return t?'após “'+t+'”':'Campo';}
function dkCampos(k){var B=document.querySelector('#x-main .xblk[data-xk="'+(window.CSS&&CSS.escape?CSS.escape(k):k)+'"]');if(!B)return '';var F=$$('.fill',B);if(!F.length)return '';
  var ids=F.filter(function(f){return f.classList.contains('idf');}),tx=F.filter(function(f){return !f.classList.contains('idf');});
  function inp(f){var nome=f.getAttribute('data-ph')||'',key=f.getAttribute('data-fk'),v=FILL[key]||AUTO[dkAlias(nome)]||f.textContent.trim(),au=!FILL[key]&&campoConfirmado(AUTO[dkAlias(nome)]);return '<label class="dfl'+(f.classList.contains('idf')?' id':'')+(au?' au':'')+'"><span>'+esc(dkCampoRot(f))+(au?' <i>da ficha ou do padrão</i>':'')+'</span><input data-dfk="'+esc(f.getAttribute('data-fk'))+'" value="'+esc(v)+'" placeholder="'+(f.classList.contains('idf')?'só números':'escreva aqui')+'"'+(f.classList.contains('idf')?' inputmode="numeric"':'')+'></label>';}
  return '<div class="cf"><div class="cfl">Campos do bloco <span class="pill">'+F.filter(function(f){return campoConfirmado(f.textContent);}).length+' de '+F.length+'</span></div><div class="dfls">'+F.map(inp).join('')+'</div><p class="meta" style="margin:6px 0 0">Amarelo é texto do caso; azul é ID, que entra na peça ao copiar.</p></div>';}
function dkCanTrecho(sel){var t=sel.t,pt=sel.pt,E=escolha(t,XP.alt),ai=E.ai,h='',aj=dkAjuda(pt.id,t.n);
  h+='<div class="cvh"><div><p class="cvk">Bloco selecionado · '+esc(pt.t)+(t.opc?' · opcional':'')+'</p><p class="cvt">'+esc(t.n)+(aj?' <button type="button" class="dq" data-daj aria-pressed="'+!!DK.aj+'" title="Como preencher este bloco">?</button>':'')+'</p></div><button type="button" class="cvx" data-dsel="" title="Fechar o bloco" aria-label="Fechar o bloco">×</button></div>';
  if(aj&&DK.aj)h+=aj.replace('class="cf daj"','class="cf daj open"');
  if(t.alts.length>1){var nb=t.alts.filter(function(x){return !x.base;}).length,hb=nb&&nb<t.alts.length,vb=XP.vb[t.k]||(t.alts[ai]&&t.alts[ai].base);
    h+='<div class="cf"><div class="cfl">'+esc(t.n)+' <span class="pill">'+esc(E.a.lab||'')+'</span></div><div class="dpl">'+t.alts.map(function(x,i){if(x.base&&hb&&!vb)return '';return '<button type="button" data-xalt="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===ai)+'"'+(x.base?' class="b"':'')+'>'+esc(x.lab||('Versão '+(i+1)))+'</button>';}).join('')+(hb?'<button type="button" class="mais" data-xbase="'+esc(t.k)+'">'+(vb?'menos':'+ '+(t.alts.length-nb)+' da base')+'</button>':'')+'</div>'+
      (E.sub?'<div class="cfl" style="margin-top:10px">Variação</div><div class="dpl">'+E.sub.map(function(x,i){return '<button type="button" data-xsub="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===E.si)+'">'+esc(x.lab)+'</button>';}).join('')+'</div>':'')+'</div>';}
  h+=dkCampos(t.k);
  DK.rotF=[];h+=dkRotTrecho(t.pid||pt.id,t.n,t);
  if(t.info)h+='<details class="cf dsec"><summary class="cfl">Tabela de referência</summary>'+xInfo(t.info)+'</details>';
  if(pt.id==='ementa')h+=dkEmenta(t.n);
  if((pt.id==='voto'&&/^(Abertura|Transição ao mérito)/.test(t.n))||(pt.id==='monocratica'&&/^(Marco decisório|Fundamentação)/.test(t.n)))
    h+=dkTemp().replace('<div class="cf" data-dtemp><div class="cfl">Tempestividade <span class="pill">cálculo</span></div>','<details class="cf dsec" data-dtemp'+(DK.op_temp?' open':'')+' data-dop="temp"><summary class="cfl">Tempestividade <span class="pill">cálculo</span></summary>').replace(/<\/div>$/,'</details>')+
       dkPrel().replace('<div class="cf"><div class="cfl">Admissibilidade e preliminares <span class="pill">'+DPREL.length+' parágrafos</span></div>','<details class="cf dsec"'+(DK.op_prel?' open':'')+' data-dop="prel"><summary class="cfl">Admissibilidade e preliminares <span class="pill">'+DPREL.length+'</span></summary>').replace(/<\/div>$/,'</details>');
  var ac=t.opc?'<button type="button" class="dact" data-xfecha="'+esc(t.k)+'">Recolher este bloco opcional</button>':(!xFixo(pt.id,t)?'<button type="button" class="dact" data-xfora="'+esc(t.k)+'">Retirar este bloco da peça</button>':'');
  if(ac)h+='<div class="cf dacts">'+ac+'</div>';
  return h;}
function dkCanPeca(PT,pt){var n=pt.tr.filter(function(t){return !t.opc&&!dkFixoCanhoto(pt,t)&&!xSai(t,pt.tr,XP.alt,XP.fora);}).length,op=pt.tr.filter(function(t){return t.opc&&!XP.abre[t.k];}).length,fo=pt.tr.filter(function(t){return !dkFixoCanhoto(pt,t)&&XP.fora[t.k];}).length;
  var F=$$('#x-main .fill'),ok=F.filter(function(f){return f.textContent.trim();}).length;
  var h='<div class="cvh"><div><p class="cvk">'+esc(XPECAS[XP.pc].t)+' · parte '+(PT.indexOf(pt)+1)+' de '+PT.length+'</p><p class="cvt">'+esc(pt.t)+'</p></div></div>';
  h+='<div class="cf"><div class="dkpi"><div><b>'+n+'</b><span>blocos</span></div><div><b>'+op+'</b><span>opcionais</span></div><div><b>'+ok+'/'+F.length+'</b><span>campos</span></div></div>'+(fo?'<p class="meta" style="margin:8px 0 0">'+fo+(fo>1?' blocos retirados':' bloco retirado')+'.</p>':'')+'</div>';
  if(pt.res)h+='<div class="cf"><p class="meta" style="margin:0">'+esc(pt.res)+'</p></div>';
  h+='<p class="meta" style="margin:10px 0 0">Clique num bloco da folha ou da lista abaixo para escolher a versão e preencher os campos dele.</p>';
  if(pt.ex)h+='<div class="cf"><button class="dbt" data-xex>Modelos-matriz de decisão monocrática →</button></div>';
  h+=dkRascunhoAnterior();
  return h;}
$('#v-edit').addEventListener('click',function(e){var b;
  if((b=e.target.closest('[data-daj]'))){e.preventDefault();e.stopImmediatePropagation();DK.aj=!DK.aj;xPagina();return;}
  if((b=e.target.closest('details[data-dop]>summary'))){var d=b.parentNode;setTimeout(function(){DK['op_'+d.getAttribute('data-dop')]=d.open;},0);}
},true);
$('#v-edit').addEventListener('input',function(e){var t=e.target;if(!t.matches||!t.matches('[data-dfk]'))return;
  var f=document.querySelector('#x-main .fill[data-fk="'+(window.CSS&&CSS.escape?CSS.escape(t.getAttribute('data-dfk')):t.getAttribute('data-dfk'))+'"]');if(!f)return;
  f.textContent=t.value;f.dispatchEvent(new Event('input',{bubbles:true}));t.closest('.dfl').classList.remove('au');
  var c=t.closest('.cf'),P=c&&c.querySelector('.pill');if(P){var I=$$('[data-dfk]',c);P.textContent=I.filter(function(x){return campoConfirmado(x.value);}).length+' de '+I.length;}});
$('#v-edit').addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.matches&&e.target.matches('[data-dfk]')){e.preventDefault();var I=$$('#x-aside [data-dfk]'),i=I.indexOf(e.target);if(I[i+1])I[i+1].focus();else e.target.blur();}});
/* resumo do bloco na lista: texto já preenchido da folha */
var _dkRes=dkResumo;dkResumo=function(t){if(XP.fora[t.k]||(t.opc&&!XP.abre[t.k])||t.alts.length>1)return _dkRes(t);var B=document.querySelector('#x-main .xblk[data-xk="'+(window.CSS&&CSS.escape?CSS.escape(t.k):t.k)+'"] .dbody');if(!B)return _dkRes(t);var c=B.cloneNode(true);$$('.ptg',c).forEach(function(x){x.remove();});$$('.fill',c).forEach(function(f){if(!f.textContent.trim())f.textContent='…';});var x=c.textContent.replace(/\s+/g,' ').trim();return x.length>34?x.slice(0,32)+'…':x;};
/* a folha avisa o canhoto quando um campo muda direto no texto */
document.addEventListener('input',function(e){var f=e.target.closest&&e.target.closest('#x-main .fill');if(!f)return;var I=document.querySelector('#x-aside [data-dfk="'+(window.CSS&&CSS.escape?CSS.escape(f.getAttribute('data-fk')):'')+'"]');if(I&&document.activeElement!==I)I.value=f.textContent.trim();});


/* ===== Editorial: Minuta-Matriz (com o banco de trechos ao fim) e Modelos ===== */
function xRender(){
  if(!ED){$('#x-main').innerHTML='<p class="empty">Dados do editorial indisponíveis.</p>';return;}
  var ed=XS.ed||'pecas';$$('#x-sub button').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-s')===ed));});
  var bk=$('#x-banco');
  dkVolta();
  if(ed==='consulta'){XS.ed=ed='pecas';$$('#x-sub button').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-s')==='pecas'));});}
  if(ed==='dir'){$('#x-wrap').hidden=true;if(bk)bk.hidden=true;if($('#e-layout').parentNode!==$('#v-ement'))layoutEm('#v-ement');
    var a=$('#x-alt');if(!a){a=document.createElement('div');a.id='x-alt';$('#v-edit').appendChild(a);}a.hidden=false;a.className='x-alt-'+ed;
    var el=$('#x-man');if(el)a.appendChild(el);
    if(ED)xManual();else $('#x-man').innerHTML='<p class="empty">Dados do editorial indisponíveis.</p>';
    if(window.VDM_marcaNav)window.VDM_marcaNav();dkHead();return;}
  if(ed==='mod'){$('#x-wrap').hidden=true;if(bk)bk.hidden=true;layoutEm('#v-edit');EM.sub='mod';fecharIT();mostrar();dkHead();return;}
  if(!bk){bk=document.createElement('section');bk.id='x-banco';bk.setAttribute('aria-label','Banco de trechos');
    bk.innerHTML='<header class="bk-h"><p class="dkk">BANCO DE TRECHOS</p><h2>Parágrafos-padrão</h2><p>Trechos prontos por matéria e situação, com campos que se preenchem com o caso. Busque, abra e copie para a minuta.</p></header>';
    $('#v-edit').appendChild(bk);}
  var L=$('#e-layout');if(L&&L.parentNode!==bk)bk.appendChild(L);
  /* Parágrafos: modo do Minutário, como Modelos; o banco ocupa a página e a folha sai */
  if(ed==='par'){$('#x-wrap').hidden=true;bk.hidden=false;EM.sub='par';fecharIT();mostrar();dkHead();
    if(window.VDM_marcaNav)window.VDM_marcaNav();if(window.VDM_cnSync)setTimeout(window.VDM_cnSync,0);return;}
  XS.sub='estrutura';$('#x-wrap').hidden=false;bk.hidden=true;
  if(window.VDM_marcaNav)window.VDM_marcaNav();
  xPagina();
  if(window.VDM_cnSync)setTimeout(window.VDM_cnSync,0);
}

/* Diretrizes e Consulta entram na navegação interna do Editorial: o conteúdo é levado para dentro da página e volta ao sair */
function dkVolta(){var m=$('#x-man'),c=$('#cq'),a=$('#x-alt');if(m&&a&&m.parentNode===a)$('#v-dir').appendChild(m);if(c&&a&&c.parentNode===a){var w=$('#v-consulta .cq-wrap')||$('#v-consulta');w.appendChild(c);}if(a)a.hidden=true;}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('.tab[data-v="dir"],.tab[data-v="consulta"]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();irEditorial(t.getAttribute('data-v')==='consulta'?'pecas':t.getAttribute('data-v'));},true);
document.addEventListener('cmt-acesso',function(){if(XS.ed==='dir'&&!$('#v-edit').hidden)setTimeout(function(){if(XS.ed==='dir')xManual();},1500);});

/* Repertório único: motores e identificadores anteriores permanecem para links e referências. */
(function(){
  var views=['temas','rep'],hd=document.createElement('div');hd.className='pg-h rep-unified-head';
  var tabs=[['temas','Enunciados'],['juris','Jurisprudência'],['normas','Normas'],['reg','Regimento']];
  hd.innerHTML='<div class="pg-t"><p class="dkk">AVANÇADO · REFERÊNCIAS JURÍDICAS</p><h1>Repertório</h1><p>Enunciados, jurisprudência, normas e Regimento Interno · fontes e citações do gabinete.</p></div><div class="rep-unified-tools"><div class="rep-unified-tabs" role="tablist" aria-label="Repertório">'+tabs.map(function(x){return '<button type="button" role="tab" data-rs="'+x[0]+'" aria-selected="false">'+x[1]+'</button>';}).join('')+'</div><div class="rep-cross-search"><label for="rep-cross-q" class="sr-only">Busca transversal no repertório</label><input id="rep-cross-q" class="q" type="search" placeholder="Buscar em todas as fontes…" autocomplete="off"><button type="button" data-rep-cross-clear title="Limpar busca">×</button></div><div id="rep-cross-results" hidden aria-live="polite"></div></div>';
  function visible(){return views.find(function(v){var x=document.getElementById('v-'+v);return x&&!x.hidden;});}
  function sync(){var v=visible();if(!v)return;var s=document.getElementById('v-'+v);s.classList.add('rep-unificado');if(hd.parentNode!==s)s.insertBefore(hd,s.firstChild);var active=v==='temas'?'temas':(window.VDM_repTab&&({Jurisprudência:'juris',Normas:'normas',Regimento:'reg'})[window.VDM_repTab()]||'juris');hd.querySelectorAll('[data-rs]').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.rs===active));});}
  function abre(k){if(window.VDM_repertorioAbrir)window.VDM_repertorioAbrir(k);sync();}
  function busca(){var q=hd.querySelector('#rep-cross-q').value.trim(),out=hd.querySelector('#rep-cross-results');out.hidden=!q;out.innerHTML=q&&window.VDM_repertorioBusca?window.VDM_repertorioBusca(q):'';}
  hd.addEventListener('click',function(e){var b=e.target.closest('[data-rs]');if(b){abre(b.dataset.rs);return;}if(e.target.closest('[data-rep-cross-clear]')){hd.querySelector('#rep-cross-q').value='';busca();return;}var r=e.target.closest('[data-rep-result]');if(r){hd.querySelector('#rep-cross-q').value='';busca();if(window.VDM_repertorioAbrir)window.VDM_repertorioAbrir(r.dataset.repGrupo,r.dataset.repResult);sync();}});
  hd.querySelector('#rep-cross-q').addEventListener('input',function(){clearTimeout(hd._busca);hd._busca=setTimeout(busca,140);});
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.tab,.cn-b,[data-rs],.dd button,[data-rep-link]'))setTimeout(sync,0);});
  window.addEventListener('hashchange',function(){setTimeout(sync,0);});document.addEventListener('cmt-acesso',function(){setTimeout(sync,0);});window.VDM_repSync=sync;setTimeout(sync,0);
})();
/* ===== Diretrizes: manual de redação novo (diretrizes_manual.html), com Padrões decisórios só no acesso avançado ===== */
function dirAv(){try{return !!(window.CMT_ACESSO&&window.CMT_ACESSO().avancado);}catch(e){return false;}}
function xManual(){if(window.VDM_RAP_TAB&&window.VDM_RAPTAB){window.VDM_RAPTAB();return;}if(window.VDM_MN_DADOS&&typeof xManualDados==='function'){xManualDados();return;}var M=$('#x-man');if(!M)return;var f=document.getElementById('dir-fr');
  if(!f||!M.contains(f)){var src=document.getElementById('dir-manual');if(!src){M.innerHTML='<p class="empty">Manual de redação indisponível.</p>';return;}
    M.innerHTML='<iframe id="dir-fr" title="Breviário · Manual de redação" scrolling="no"></iframe>';f=M.querySelector('#dir-fr');
    f.addEventListener('load',function(){dirPrep(f);});var h='';try{h=JSON.parse(src.textContent);}catch(e){}f.srcdoc=h;return;}
  dirPrep(f);}
function dirAjusta(f){try{var D=f.contentDocument;var h=Math.max(D.documentElement.scrollHeight,D.body.scrollHeight);if(Math.abs((parseInt(f.style.height)||0)-h)>2)f.style.height=h+'px';}catch(e){}}
/* Entradas rápidas: ouvintes únicos do painel lateral do Breviário. */
function rapLiga(R){
  R.addEventListener('click',function(e){var b=e.target.closest('[data-rapf],[data-rapadd],[data-rapinc],[data-rapsit],[data-rapdel]');if(!b)return;
      if(b.hasAttribute('data-rapf')){RAP.filtro=b.getAttribute('data-rapf');xManual();return;}
      if(b.hasAttribute('data-rapadd')){rapNovo();return;}
      var id=b.getAttribute('data-rapinc')||b.getAttribute('data-rapsit')||b.getAttribute('data-rapdel');
      if(b.hasAttribute('data-rapinc')){var dst=window.prompt('Onde foi incorporada? (ex.: Manual · Vocabulário, modelo, parágrafo)','');if(dst===null)return;rapMuda(id,function(n){n.situacao='incorporada';n.destino=dst.trim();},'Breviário: entrada rápida incorporada');return;}
      if(b.hasAttribute('data-rapsit')){rapMuda(id,function(n){n.situacao='nova';n.destino='';},'Breviário: entrada rápida reaberta');return;}
      if(b.hasAttribute('data-rapdel')){if(!window.confirm('Excluir esta entrada rápida?'))return;var x=rapAcha(id);if(!x)return;
        rapGrava([{op:'del',id:id,orig:rapJ(x)}],'Breviário: entrada rápida excluída',function(){var L=rapBase();L.splice(L.indexOf(rapAcha(id)),1);});}});
  R.addEventListener('input',function(e){if(e.target.matches('[data-raptxt]'))RAP.txt=e.target.value;else if(e.target.matches('[data-raporig]'))RAP.orig=e.target.value;});
  R.addEventListener('change',function(e){if(e.target.matches('[data-raptipo]'))RAP.tipo=e.target.value;});
  R.addEventListener('keydown',function(e){if(e.target.matches('[data-raptxt]')&&(e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();rapNovo();}});
}
window.rapLiga=rapLiga;
function dirPrep(f){var D=f.contentDocument;if(!D||!D.body)return;
  D.documentElement.setAttribute('data-theme',document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light');
  var av=dirAv(),st=D.getElementById('dk-av');if(!st){st=D.createElement('style');st.id='dk-av';(D.head||D.documentElement).appendChild(st);}
  st.textContent="\nhtml,body{overflow:hidden!important;height:auto!important}\n.top{position:relative!important;top:auto!important;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border:0!important;box-shadow:none!important;padding:0}\n.top .brand,.mn-hd{display:none!important}\n.top-in{max-width:none!important;margin:12px 40px 0!important;padding:5px 7px!important;gap:5px 8px!important;background:var(--paper);border:1px solid var(--line2);align-items:center;flex-wrap:wrap}\n.top .abas{height:33px;flex:none;border:1px solid var(--line2);border-radius:0!important;background:transparent;padding:0!important}\n.top .abas button{height:31px!important;padding:0 9px!important;font:600 12px var(--sans)!important;border-radius:0!important}\n.top .mn-bar{flex:1 1 240px;min-width:0}\n.top .mn-bar input{height:33px!important;border-radius:0!important;background-color:var(--paper);font-size:12px!important;padding-left:33px}\n.top .mn-tools{gap:0;flex-wrap:wrap;align-items:center}\n.top .mn-tools .btn{height:33px!important;font:600 12px var(--sans);padding:0 10px;border-radius:0!important}\n.top .mn-tools .btn+.btn{border-left:0}\n.top .mn-tools .btn.ico{width:33px;padding:0}\n.top .mn-cnt:not(:empty){margin:0 7px;font-size:11px}\n.top .prog{margin:0 40px}\n.xman{width:100%;max-width:1920px!important;padding:22px 40px 60px!important}\n.mn-wrap{grid-template-columns:minmax(150px,210px) minmax(0,1fr) minmax(280px,340px);gap:20px;align-items:start}\n.mn-toc{min-width:0;padding-right:8px}\n.mn-doc{width:100%;max-width:880px;justify-self:center;min-width:0}\n.mn-doc>.mn-cap:first-of-type{margin-top:0}\n#mn-rap{grid-column:3;grid-row:1;display:flex!important;flex-direction:column;gap:8px;min-width:0;max-height:680px;overflow:auto;scrollbar-width:thin;align-self:start;border:1px solid var(--line2);border-radius:0;background:var(--paper);box-shadow:none;padding:12px;margin:0}\n#mn-rap .rap-h{display:flex;flex-direction:column;gap:8px}\n#mn-rap .rap-h h2{font:700 16px var(--sans);margin:0;color:var(--ink)}\n#mn-rap .rap-h p{font-size:12px;line-height:1.4;margin:4px 0}\n#mn-rap .rap-f{display:flex;flex-wrap:wrap;gap:0;border:1px solid var(--line2)}\n#mn-rap .rap-f button{flex:1 1 auto;min-width:0;border:0;border-right:1px solid var(--line2);background:var(--soft);padding:6px;font:600 11px var(--sans);cursor:pointer}\n#mn-rap .rap-f button:last-child{border-right:0}\n#mn-rap .rap-f button[aria-pressed=true]{background:var(--acc);color:var(--paper)}\n#mn-rap .rap-novo{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px}\n#mn-rap .rap-novo textarea,#mn-rap .rap-novo input{grid-column:1/-1}\n#mn-rap .rap-novo textarea,#mn-rap .rap-novo select,#mn-rap .rap-novo input{width:100%;min-width:0;box-sizing:border-box;padding:6px;border:1px solid var(--line2);border-radius:0;background:var(--soft);color:var(--ink);font:12px var(--sans)}\n#mn-rap .rap-novo textarea{min-height:72px;resize:vertical;order:-1}\n#mn-rap .rap-novo select,#mn-rap .rap-novo input,#mn-rap .rap-novo .btn{min-height:32px;border-radius:0}\n#mn-rap .rap-l{list-style:none;display:grid;gap:8px;margin:0;padding:0}\n#mn-rap .rap-l li{border-top:1px solid var(--line);padding:8px 0 0;font-size:12px;line-height:1.45;overflow-wrap:anywhere}\n#mn-rap .rap-l p{margin:3px 0}\n#mn-rap .rap-m{display:flex;gap:5px;flex-wrap:wrap;font:600 10px var(--sans);color:var(--mut);text-transform:uppercase}\n#mn-rap .rap-t{color:var(--gold)}\n#mn-rap .rap-o,#mn-rap .rap-ro,#mn-rap .rap-v{font-size:11px;line-height:1.45;color:var(--mut)}\n#mn-rap .rap-a{display:flex;gap:4px;flex-wrap:wrap}\n#mn-rap .rap-a button{height:auto;min-height:27px;font-size:11px;border-radius:0;white-space:normal}\n.mn-toc .lab.tp{cursor:pointer;display:flex;align-items:center;gap:6px}\n.mn-toc .lab.tp:after{content:\"▾\";font-size:10px}\n.mn-toc .lab.tp.pa-fch:after{content:\"▸\"}\n.mn-toc .lab.tp.pa-fch+ol{display:none}\n@media(max-width:1200px){.xman{padding:18px 24px 50px!important}.top-in{margin:12px 24px 0!important}.mn-wrap{grid-template-columns:minmax(130px,175px) minmax(0,1fr) minmax(240px,285px);gap:12px}}\n@media(max-width:980px){.mn-wrap{grid-template-columns:minmax(0,1fr) minmax(240px,290px);gap:12px}.mn-toc{grid-column:1/-1;max-height:210px;border-radius:0}.mn-doc{grid-column:1;grid-row:2}#mn-rap{grid-column:2;grid-row:2}.top .mn-bar{order:0}}\n@media(max-width:680px){.xman{padding:14px 12px 40px!important}.top-in{margin:8px 12px 0!important}.mn-wrap{grid-template-columns:minmax(0,1fr)}.mn-toc{grid-column:1;grid-row:1}.mn-doc{grid-column:1;grid-row:3}#mn-rap{grid-column:1;grid-row:2;max-height:420px}.top .mn-bar{flex-basis:100%}.top .mn-tools{width:100%;gap:0}}\n@media print{#mn-rap,.top,.mn-toc{display:none!important}.xman{padding:0!important;max-width:none!important}.mn-wrap{display:block!important}.mn-doc{max-width:none!important}}\n"+(av?'':'[data-abab="padroes"],[data-aba="padroes"],.top .abas{display:none!important}');
  var wrap=D.querySelector('.mn-wrap'),entradas=D.getElementById('mn-rap');
  if(wrap&&entradas&&entradas.parentNode!==wrap){wrap.appendChild(entradas);entradas.removeAttribute('data-aba');entradas.setAttribute('aria-label','Entradas rápidas do Breviário');}
  if(!D.__pa){D.__pa=1;D.addEventListener('click',function(e){var l=e.target.closest&&e.target.closest('.mn-toc .lab.tp');if(!l)return;l.classList.toggle('pa-fch');dirAjusta(f);});}
  if(!av&&D.body.getAttribute('data-aba')==='padroes'){var mb=D.querySelector('[data-abab="manual"]');if(mb)mb.click();}
  var r=D.getElementById('mn-rap');if(r)r.innerHTML=rapHtml('');
  if(!D.__dk){D.__dk=1;rapLiga(D);
    try{new (f.contentWindow.ResizeObserver||ResizeObserver)(function(){dirAjusta(f);}).observe(D.body);}catch(e){setInterval(function(){dirAjusta(f);},800);}}
  dirAjusta(f);}
document.addEventListener('cmt-acesso',function(){var f=document.getElementById('dir-fr');if(f)dirPrep(f);});
try{new MutationObserver(function(){var f=document.getElementById('dir-fr');if(f&&f.contentDocument)f.contentDocument.documentElement.setAttribute('data-theme',document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light');}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});}catch(e){}

/* ===== Navegação única do Compendium, dentro da barra do cabeçalho (como as abas do Ex Officio): sem "Editorial";
   abas comuns (Ementário · Padrão: Minuta-Matriz e Modelos · Diretrizes; a Consulta saiu da navegação e só abre pelo botão do cartão no Ex Officio) e abas do acesso avançado (Enunciados · Repertório · Enciclopédia) ===== */
(function(){var top=document.querySelector('header.top');if(!top)return;
  var IT=[['ement','Ementário'],['dir','Breviário'],['pecas','Minutário'],['||'],['rep','Repertório','Acesso avançado'],['enc','Enciclopédia']];
  var bar=document.createElement('nav');bar.id='cmp-nav';bar.setAttribute('aria-label','Seções do Compendium');
  var h='<div class="cn-in">';IT.forEach(function(x){if(x[0]==='|'){h+='<span class="cn-sep" aria-hidden="true"></span>';return;}if(x[0]==='||'){h+='<span class="cn-sep av" data-av hidden aria-hidden="true"></span>';return;}
    var av=['temas','rep','enc'].indexOf(x[0])>=0;h+=(x[2]?'<span class="cn-g'+(av?' av':'')+'"'+(av?' data-av hidden':'')+'>'+x[2]+'</span>':'')+'<button type="button" class="cn-b" data-cn="'+x[0]+'"'+(av?' data-av hidden':'')+' aria-current="false">'+x[1]+'</button>';});
  bar.innerHTML=h+'</div>';var sp=top.querySelector('.eqsp');if(sp)top.insertBefore(bar,sp);else top.parentNode.insertBefore(bar,top.nextSibling);document.body.classList.add(sp?'cmp-nav-dentro':'cmp-nav-fora');
  function aba(v){var t=document.querySelector('.tab[data-v="'+v+'"]');if(t)t.click();}
  function atual(){var vs=function(id){var e=document.getElementById(id);return e&&!e.hidden;};if(vs('v-ement'))return 'ement';if(vs('v-edit'))return ['par','mod','pecas'].indexOf(XS.ed||'pecas')>=0?'pecas':XS.ed;
    var r=['temas','rep','enc'].filter(function(v){return vs('v-'+v);})[0];return r==='temas'?'rep':r||'';}
  function sync(){var a=atual();$$('.cn-b',bar).forEach(function(b){b.setAttribute('aria-current',String(b.getAttribute('data-cn')===a));});}
  bar.addEventListener('click',function(e){var b=e.target.closest('.cn-b');if(!b)return;var v=b.getAttribute('data-cn');
    if(v==='ement')aba('ement');else if(v==='rep'&&window.VDM_repertorioAbrir)window.VDM_repertorioAbrir('temas');else if(['rep','enc'].indexOf(v)>=0)aba(v);else irEditorial(v);setTimeout(sync,0);window.scrollTo(0,0);});
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.tab,#x-sub button,[data-rs]'))setTimeout(sync,0);});
  window.addEventListener('hashchange',function(){setTimeout(sync,60);});document.addEventListener('cmt-acesso',function(){setTimeout(sync,60);});
  window.VDM_cnSync=sync;setTimeout(sync,0);})();

/* ===== Celular: filtros laterais (Ementário, Modelos, Banco de trechos, Enunciados, Repertório) recolhidos atrás de um botão ===== */
(function(){
  [['e-aside'],['n-aside'],['r-aside']].forEach(function(x){var a=document.getElementById(x[0]);if(!a||a.previousElementSibling&&a.previousElementSibling.classList.contains('mf-bt'))return;
    var b=document.createElement('button');b.type='button';b.className='mf-bt';b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls',x[0]);b.innerHTML='<span>Filtros e navegação</span><i aria-hidden="true">▾</i>';
    a.parentNode.insertBefore(b,a);a.classList.add('mf-col');
    b.addEventListener('click',function(){var o=a.classList.toggle('mf-aberto');b.setAttribute('aria-expanded',String(o));});});
})();

/* ===== Minuta-Matriz com o caso (antes, página Consulta) e texto da folha: Minuta-Matriz, modelo do gabinete ou matriz modular =====
   O caso (ficha do processo, aberta pelo número, ou item da pauta da sessão, que traz o cartão e a ficha) vem de consulta.js (window.CQX). A folha segue o motor da Minuta-Matriz:
   com um modelo escolhido, o voto (ou a decisão, ou o despacho) vem do modelo e o resto da peça vem da estrutura do gabinete. */
function dkPronMod(m){var t=mTipo(m);return t==='Acórdão'?'ac':t==='Despacho'?'desp':'mono';}
function dkModelo(){if(!DK.mod)return null;if(!BASE){if(!DK._bl){DK._bl=1;base().then(function(){DK._bl=0;if(!$('#v-edit').hidden)xPagina();});}return null;}
  var L=BASE.mod||[];for(var i=0;i<L.length;i++)if(L[i].id===DK.mod)return L[i];return null;}
/* modelo que de fato preenche a folha: escolhido e do mesmo pronunciamento da barra */
function dkModeloAtivo(){if(DK.fonte!=='mod')return null;var m=dkModelo();return m&&dkPronMod(m)===dkPron()?m:null;}
function dkTrModelo(m,pid){return mTrechos(m).map(function(t){return {k:'md:'+t.k,pid:pid,n:t.n,g:t.g,r:[],opc:t.opc,alts:t.alts.map(function(a){return {lab:a.lab,f:a.f,r:[]};}),md:1};});}
function dkPartesModelo(m,PT){
  var pr=dkPron(),BY=xBY(),nm=m.nomeModelo||m.id,res='Modelo do gabinete: '+nm+'. O texto dos blocos vem do modelo; os campos em amarelo recebem os dados do caso. Nada do modelo vale como fato deste processo.';
  if(pr==='ac'){var em=PT[0],rel=PT[1],ac=PT[3];
    if(m.ementaIntegral){em={};for(var k in PT[0])em[k]=PT[0][k];em.ref={t:'Ementa do acórdão-fonte do modelo',f:String(m.ementaIntegral)};}
    return [em,rel,{id:'voto',t:'Voto',pj:'VOTO',tr:xTrechos('voto',['Cabeçalho','Vocativo']).concat(dkTrModelo(m,'voto')),notas:(BY.voto||{}).notas||[],res:res,md:1},ac];}
  if(pr==='mono')return [{id:'monocratica',t:'Decisão monocrática',tr:dkTrModelo(m,'monocratica'),notas:(BY.monocratica||{}).notas||[],res:res,md:1}];
  return [{id:'despacho',t:'Despacho',tr:dkTrModelo(m,'despacho'),notas:(BY.despacho||{}).notas||[],res:res,md:1}];}
/* parágrafos do banco incluídos num bloco: entram no fim do texto do bloco (folha, cópia, .docx, conferência) */
function dkPar(id){var L=(BASE&&BASE.par)||[];for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i];return null;}
function dkParTxt(id){var p=dkPar(id);if(!p)return '';return String(p.texto||'').trim().replace(/(^|[^{])\{([^{}]{1,120})\}(?!\})/g,'$1{{$2}}').replace(/\{\{([^{}|]{1,120})\|([^{}]{1,120})\}\}/g,'{{$2}}');}
function dkComInc(PT){var I=DK.inc||{};if(!Object.keys(I).length)return PT;
  PT.forEach(function(pt){pt.tr=pt.tr.map(function(t){var L=(I[t.k]||[]).map(dkParTxt).filter(Boolean);if(!L.length)return t;
    var junta=function(f){return (String(f||'').trim()?String(f).replace(/\s+$/,'')+'\n':'')+L.join('\n');},c={};for(var k in t)c[k]=t[k];
    c.alts=(t.alts.length?t.alts:[{lab:'',f:''}]).map(function(a){var b={};for(var j in a)b[j]=a[j];b.f=junta(a.f);if(a.sub)b.sub=a.sub.map(function(s){var z={};for(var q in s)z[q]=s[q];z.f=junta(s.f);return z;});return b;});
    c.inc=L.length;return c;});});
  return PT;}
var _xPartesBase=xPartes;
/* Estrutura única: a ficha alimenta os campos, sem substituir os blocos. */
xPartes=function(){var PT=_xPartesBase(),m=dkModeloAtivo();if(m)PT=dkPartesModelo(m,PT);return dkComInc(PT);};
var _xLimparBase=xLimpar;xLimpar=function(){DK.inc={};DK.pick='';dkGuarda();_xLimparBase();};
/* ---------- texto da folha: seletor na barra ---------- */
function dkJulgDe(m){return ({ed:'ed',ain:'agint',ai:'ai',rn:'rn',apc:'ap',ades:'ap'})[rrTipoJulg(m)]||'';}
function dkJulgAtual(){if(XP.pc==='acordao'){var v=XP.v.acordao;return {ap:'ap',dap:'ap',aprn:'ap',ai:'ai',ed:'ed',agint:'agint'}[v]||'';}return XP.v.decisao==='desp'?'':({ap:'ap',ai:'ai',rn:'rn'})[XP.mrec]||'';}
function dkModOpts(){
  if(!BASE)return '<option value="">Minuta-Matriz · padrão</option><option disabled>Carregando os modelos…</option>';
  var pr=dkPron(),q='',cur=DK.fonte==='mod'?DK.mod:'',jg=dkJulgAtual(),R=window.CQX&&CQX.tem()&&CQX.R(),ja={},o='<option value=""'+(DK.fonte==='mat'?' selected':'')+'>Minuta-Matriz · padrão</option>';
  var L=(BASE.mod||[]).filter(function(m){if(dkPronMod(m)!==pr)return false;if(!q||m.id===cur)return true;if(!m._dq)m._dq=nz([m.nomeModelo,m.assunto,m.temas,m.tese,m.classe,m.resultado,mTextoBase(m)].join(' '));return m._dq.indexOf(q)>=0;});
  function op(m,pre){ja[m.id]=1;var n=String(m.nomeModelo||m.id);return '<option value="'+esc(m.id)+'"'+(m.id===cur?' selected':'')+' title="'+esc(n)+'">'+esc((pre||'')+(n.length>110?n.slice(0,108)+'…':n))+'</option>';}
  if(window.CQX&&CQX.e28()&&pr==='ac'&&(!q||'28,86% cumprimento individual acp matriz'.indexOf(q)>=0||DK.fonte==='m28'))o+='<optgroup label="Matrizes"><option value="m28"'+(DK.fonte==='m28'?' selected':'')+'>★ 28,86% · cumprimento individual da ACP</option></optgroup>';
  if(R){/* processo aberto: todos os modelos do pronunciamento, da maior para a menor correspondência com o caso */
    var S={},EL={};(R.modTodos||[]).forEach(function(z){S[z.x.id]=z.s||0;if(z.el&&z.el.ok)EL[z.x.id]=1;});
    var ordS=function(a,b){return (S[b.id]||0)-(S[a.id]||0)||String(a.nomeModelo).localeCompare(String(b.nomeModelo),'pt');};
    var el=L.filter(function(m){return EL[m.id];}).sort(ordS),
        rs=L.filter(function(m){return !EL[m.id]&&(!jg||dkJulgDe(m)===jg);}).sort(ordS),
        ot=L.filter(function(m){return !EL[m.id]&&jg&&dkJulgDe(m)!==jg;}).sort(ordS);
    if(el.length)o+='<optgroup label="Mais aderentes ao caso">'+el.map(function(m){return op(m,'★ ');}).join('')+'</optgroup>';
    if(rs.length)o+='<optgroup label="Demais modelos · por correspondência">'+rs.map(function(m){return op(m);}).join('')+'</optgroup>';
    if(ot.length)o+='<optgroup label="Outros tipos de julgamento">'+ot.map(function(m){return op(m);}).join('')+'</optgroup>';
    return o;}
  var mesmo=L.filter(function(m){return !ja[m.id]&&(!jg||dkJulgDe(m)===jg);}),outros=L.filter(function(m){return !ja[m.id]&&jg&&dkJulgDe(m)!==jg;});
  var G={},ord=[];mesmo.forEach(function(m){var a=mAss(m);if(!G[a]){G[a]=[];ord.push(a);}G[a].push(m);});ord.sort(function(a,b){return a.localeCompare(b,'pt');});
  o+=ord.map(function(a){return '<optgroup label="'+esc(a)+'">'+G[a].sort(function(x,y){return String(x.nomeModelo).localeCompare(String(y.nomeModelo),'pt');}).map(function(m){return op(m);}).join('')+'</optgroup>';}).join('');
  if(outros.length)o+='<optgroup label="Outros tipos de julgamento">'+outros.map(function(m){return op(m);}).join('')+'</optgroup>';
  return o;}
function dkBarraTexto(){var e28=!!(window.CQX&&CQX.e28()),f=DK.fonte==='m28'&&!e28?'mat':DK.fonte,m=dkModelo(),fora=f==='mod'&&m&&dkPronMod(m)!==dkPron();
  var h='<div class="dgrp dtxt">';
  h+='<label class="dmodl"><span>Modelo</span><select data-dmod aria-label="Modelo do gabinete">'+dkModOpts()+'</select></label>'+(window.CQX&&CQX.tem()?'<button type="button" class="dsug-b" data-dsug aria-expanded="'+!!DK.sug+'" title="Modelos sugeridos para o processo aberto">Para o caso ▾</button>':'');
  h+='</div>';
  if(fora)h+='<span class="dcx-nota">O modelo escolhido é de '+esc(mTipo(m).toLowerCase())+': a folha segue a Minuta-Matriz neste pronunciamento.</span>';
  else if(f==='mod'&&!m&&BASE)h+='<span class="dcx-nota">Escolha um modelo: até lá, a folha segue a Minuta-Matriz.</span>';
  return h;}
function dkBarraUnica(modular){var estrutura=modular?'':xBarra().replace(/^<div class="dbar">/,'').replace(/<\/div>$/,'').replace('<div class="dgrp">','<div class="dgrp destrutura">').replace(/(<div class="dseg"[\s\S]*?<\/div>)/,'<div class="d-pr-field"><span>Pronunciamento</span>$1</div>');return '<div class="dbar d-unica'+(modular?' d-unica-modular':'')+'"><div class="d-caso-grupo">'+(window.CQX?CQX.barra():'')+'</div><div class="d-estrutura-grupo">'+estrutura+'</div>'+dkBarraTexto()+'</div>'+(window.CQX?CQX.extra():'');}
function dkFonte(v){if(v==='m28'&&!(window.CQX&&CQX.e28()))return;
  if(v==='mod'&&!dkModelo()){DK.rtab='caso';xPagina();var q=document.querySelector('#x-top [data-dmod]');if(q)q.focus();return;}
  if(v==='mat'){DK.mod='';var P=window.CQX&&CQX.tem()?CQX.P():null;if(P){dkAplicaCaso(P,{tipo:'mat',mat:CQX.matrizDoCaso(P)});return;}}
  DK.fonte=v;DK.fonteManual=true;XP.sel=null;DK.pick='';dkGuarda();xPagina();}
function dkUsaModelo(id){var m=(BASE&&BASE.mod||[]).filter(function(x){return x.id===id;})[0];if(!m)return;
  var pr=dkPronMod(m),caso=!!(window.CQX&&CQX.tem()),jg=dkJulgAtual(),mj=dkJulgDe(m);
  if(caso&&(pr!==dkPron()||(jg&&mj&&jg!==mj&&!(XP.v.acordao==='aprn'&&mj==='rn')))){toast('Modelo de outro tipo de julgamento. Selecione um modelo compatível com o processo.');return;}
  DK.fonte='mod';DK.mod=id;DK.fonteManual=true;
  if(pr!==dkPron()){if(pr==='ac')XP.pc='acordao';else{XP.pc='decisao';XP.v.decisao=pr==='desp'?'desp':'mono';}}
  XP.sel=null;DK.parte='';DK.pick='';dkGuarda();xPagina();}
function dkFonteDoCaso(){DK.fonteManual=false;DK.fonte='mat';DK.mod='';XP.sel=null;DK.pick='';dkGuarda();xPagina();}
/* caso carregado: a barra vai para o pronunciamento, a classe, o julgamento e o resultado do caso; o processo preenche as variáveis do acervo */
function dkAplicaCaso(P,sg){
  var tj=nz(P.tipoJulgamento||''),cl=nz(P.classe||''),v=/embargos de declar/.test(tj)?'ed':/agravo interno/.test(tj)?'agint':/agravo de instrumento/.test(tj)||/agravo de instrumento/.test(cl)?'ai':(/remessa/.test(tj)||/remessa/.test(cl))?'aprn':'ap';
  if(v==='ap'&&(P.recursos||[]).filter(function(r){return /apela/i.test(r);}).length>1)v='dap';
  var novo=String(XD.proc||'').replace(/\D/g,'')!==String(P.processo||'').replace(/\D/g,'');
  if(novo){DK.sug=true;XP.alt={};XP.abre={};XP.fora={};XP.vb={};XP.res={};XD.rec='';Object.keys(FILL).forEach(function(k){if(!/^mod-|^par:/.test(k))delete FILL[k];});DK.inc={};DK.rotAs='';DK.rotAsMan=false;}
  XP.v.acordao=v;if(v==='ap'||v==='aprn'||v==='ai')DK.cl=v;
  /* destino na ficha: monocrática abre a decisão monocrática; senão, acórdão */
  if(/despacho/i.test((P.destino||'')+' '+tj)){XP.pc='decisao';XP.v.decisao='desp';}else if(/monocr/i.test((P.destino||'')+' '+tj)){XP.pc='decisao';XP.v.decisao='mono';XP.mrec=v==='ai'?'ai':/remessa/.test(tj)&&!/apela/.test(tj)?'rn':'ap';}else XP.pc='acordao';
  var mt=sg&&sg.mat,rec=xRecAtual(),key=XP.pc+':'+rec+':'+XP.v[XP.pc];if(rec){delete XP.res[key];if(mt&&xMats(XP.pc,rec).some(function(m){return m.id===mt.id;}))XP.res[key]=mt.id;}
  DK.fonteManual=false;DK.fonte='mat';DK.mod='';
  XP.sel=null;DK.parte='';DK.pick='';DK.modq='';DK.rtab='caso';dkGuarda();
  XD.proc=P.processo||'';XD.ac=null;XD.naoAchou=false;
  irEditorial('pecas');
  if(XD.proc)xBuscaProc();}
/* matriz modular (28,86%): motor próprio, que desenha canhoto, folha e painel no lugar dos da Minuta-Matriz */
function dk28(){return DK.fonte==='m28'&&!!(window.CQX&&CQX.e28());}
function dkModo28(on){var wrap=$('#x-wrap'),cq=$('#cq');if(!wrap||!cq)return;wrap.classList.toggle('d28',on);
  if(on){if(cq.parentNode!==wrap)wrap.appendChild(cq);}
  else if(cq.parentNode===wrap){var w=$('#v-consulta .cq-wrap')||$('#v-consulta');if(w)w.appendChild(cq);}}
/* ---------- canhoto do bloco: parágrafos do banco incluídos e busca no banco ---------- */
function dkIncHtml(t){var L=(DK.inc[t.k]||[]),ab=DK.pick===t.k,caso=!!(window.CQX&&CQX.tem());
  var h='<div class="cf dinc"><div class="cfl">Parágrafos do banco <span class="pill">'+L.length+'</span></div>';
  if(L.length)h+='<ol class="dinc-l">'+L.map(function(id,i){var p=dkPar(id);return '<li><span>'+esc(p?(p.titulo||p.id):id)+'</span><button type="button" data-dincmv="'+esc(t.k)+'|'+i+'|-1" title="Subir"'+(i?'':' disabled')+'>↑</button><button type="button" data-dincmv="'+esc(t.k)+'|'+i+'|1" title="Descer"'+(i<L.length-1?'':' disabled')+'>↓</button><button type="button" data-dincrm="'+esc(t.k)+'|'+i+'" title="Retirar do bloco">×</button></li>';}).join('')+'</ol>';
  if(ab)h+='<div class="cq-pick"><div class="cq-pick-h"><input id="dk-pickq" value="'+esc(DK.pickq||'')+'" placeholder="Buscar no banco: título, tema ou texto" autocomplete="off" aria-label="Buscar no banco de parágrafos"><button type="button" class="dbt" data-dpickx>Fechar</button></div>'+
    '<p class="meta">'+(DK.pickq?'Resultados da busca.':'Sugestões pelo bloco'+(caso?' e pelo caso':'')+'. Busque para ver outros.')+' Clique para incluir ou retirar.</p><ol class="cq-pick-l" id="dk-pickl">'+(window.CQX?CQX.pickLista(t.n,t.k,DK.pickq):'')+'</ol></div>';
  else h+='<button type="button" class="dbt" data-dpick="'+esc(t.k)+'">+ Incluir parágrafo do banco</button>';
  return h+'</div>';}

/* Prontuário de trabalho: lacunas reais da versão/parte ativa da folha, não uma segunda ficha. */
var DKPR={cnj:'',modo:'pendentes'};
function dkProntLacunas(){
 var all=Array.from(document.querySelectorAll('#x-main .xblk .fill[data-fk]')),seen=new Set(),L=[];
 all.forEach(function(f){var key=f.getAttribute('data-fk'),blk=f.closest('.xblk'),ph=f.getAttribute('data-ph')||'',alias=dkAlias(ph),v=String(FILL[key]||AUTO[alias]||f.textContent||'').trim();
  if(!key||!blk||seen.has(key))return;seen.add(key);
  L.push({key:key,bloco:blk.getAttribute('data-xk'),titulo:(blk.querySelector('.bl')||{}).textContent||'Trecho',label:dkCampoRot(f)||ph||'Campo da minuta',v:v,auto:!FILL[key]&&!!AUTO[alias]});
 });
 return L;
}
function dkProntLacunasHtml(){
 var L=dkProntLacunas(),pend=L.filter(function(x){return !campoConfirmado(x.v);}),show=DKPR.modo==='todos'?L:pend;
 var h='<div class="dk-pront-progress"><b>'+pend.length+' campo(s) em aberto</b><small>'+L.length+' lacunas na parte atual</small></div><div class="dk-pront-modes" role="group" aria-label="Filtrar campos">'+[['pendentes','Em aberto'],['todos','Todos']].map(function(x){return '<button type="button" data-dkpr-modo="'+x[0]+'" aria-pressed="'+(DKPR.modo===x[0])+'">'+x[1]+'</button>';}).join('')+'</div>';
 if(!L.length)return h+'<p class="meta">A versão atual não contém campos de preenchimento direto. Confira os blocos de texto e as orientações.</p>';
 if(!show.length)return h+'<p class="meta">Nenhuma lacuna direta em aberto nesta parte. Isso não equivale à revisão jurídica da minuta.</p>';
 h+='<ol class="dk-pront-lacunas">'+show.map(function(x){return '<li><button type="button" data-dkpr-campo="'+esc(x.key)+'" data-dkpr-bloco="'+esc(x.bloco)+'"><span><b>'+esc(x.label)+'</b><small>'+esc(x.titulo)+(campoConfirmado(x.v)?' · '+(x.auto?'Valor da ficha ou do padrão':'Preenchido na minuta'):' · pendente de validação')+'</small></span><i aria-hidden="true">'+(campoConfirmado(x.v)?'✓':'→')+'</i></button></li>';}).join('')+'</ol>';
 return h;
}
function dkProntuarioAtivo(){
 if(!window.CQX||!CQX.tem())return '';
 var cnj=String((CQX.P()||{}).processo||'');if(DKPR.cnj!==cnj)DKPR={cnj:cnj,modo:'pendentes'};
 return '<section class="cf dk-pront-ativo"><div class="cfl">Prontuário de trabalho <span class="pill">parte ativa</span></div><div id="dk-pront-lacunas">'+dkProntLacunasHtml()+'</div><p class="meta">Clique no campo para preencher no canhoto ou na folha. Alterações de redação não gravam na ficha.</p><details class="dk-pront-ficha"><summary>Consultar ficha do processo</summary>'+CQX.prontuario()+'</details></section>';
}
function dkProntAtualizar(){var p=document.getElementById('dk-pront-lacunas');if(p)p.innerHTML=dkProntLacunasHtml();}
document.addEventListener('click',function(ev){var t=ev.target,b=t.closest&&t.closest('[data-dkpr-modo],[data-dkpr-campo]');if(!b||!b.closest('#v-edit'))return;
 ev.preventDefault();ev.stopImmediatePropagation();
 if(b.hasAttribute('data-dkpr-modo')){DKPR.modo=b.getAttribute('data-dkpr-modo');dkProntAtualizar();return;}
 var key=b.getAttribute('data-dkpr-campo'),block=b.getAttribute('data-dkpr-bloco');XP.sel=block;xPagina();
 var f=Array.from(document.querySelectorAll('#x-aside [data-dfk]')).find(function(x){return x.getAttribute('data-dfk')===key;})||Array.from(document.querySelectorAll('#x-main .fill[data-fk]')).find(function(x){return x.getAttribute('data-fk')===key;});
 if(f){f.scrollIntoView({block:'nearest'});if(f.matches('input,textarea,[contenteditable="true"]'))f.focus();}
},true);
document.addEventListener('input',function(ev){var t=ev.target;if(t.closest&&t.closest('#v-edit')&&(t.matches('[data-dfk]')||t.closest('#x-main .fill')))dkProntAtualizar();});

/* parágrafos do banco: não ficam no canhoto; abrem num painel flutuante junto do bloco (dkFlutuante), pelo "+ parágrafo" da margem */
var _dkCanTrechoBase=dkCanTrecho;dkCanTrecho=function(sel){return dkProntuarioAtivo()+_dkCanTrechoBase(sel);};
var _dkCanPecaBase=dkCanPeca;dkCanPeca=function(PT,pt){var h=dkProntuarioAtivo()+_dkCanPecaBase(PT,pt);
  if(pt.ref)h+='<details class="cf dsec dref"><summary class="cfl">'+esc(pt.ref.t)+' <span class="pill">referência</span></summary><p class="meta" style="margin:6px 0">Forma de ementa do caso-exemplo: os fatos e o resultado não são deste processo.</p><div class="dref-t">'+esc(pt.ref.f).replace(/\n/g,'<br>')+'</div></details>';
  return h;};
/* ---------- eventos ---------- */
document.addEventListener('click',function(e){var t=e.target,b;if(!t.closest||!t.closest('#v-edit'))return;
  function fim(){e.preventDefault();e.stopImmediatePropagation();}
  if((b=t.closest('[data-dfonte]'))){fim();dkFonte(b.getAttribute('data-dfonte'));return;}
  if((b=t.closest('[data-drtab]'))){fim();DK.rtab=b.getAttribute('data-drtab');xRef();return;}
  if((b=t.closest('[data-dpick]'))){fim();var k=b.getAttribute('data-dpick');DK.pick=k;DK.pickq='';XP.sel=k;xPagina();var q=$('#dk-pickq');if(q)q.focus();return;}
  if(t.closest('[data-dpickx]')){fim();DK.pick='';DK.pickq='';var kx=XP.sel;xPagina();var bx=kx&&document.querySelector('#x-main .xblk[data-xk="'+(window.CSS&&CSS.escape?CSS.escape(kx):kx)+'"] [data-dpick]');if(bx)bx.focus();return;}
  if((b=t.closest('[data-dpar]'))){fim();var x=b.getAttribute('data-dpar'),j=x.lastIndexOf('|'),kk=x.slice(0,j),id=x.slice(j+1),L=DK.inc[kk]=DK.inc[kk]||[],n=L.indexOf(id);
    if(n>=0)L.splice(n,1);else L.push(id);if(!L.length)delete DK.inc[kk];dkGuarda();XP.sel=kk;xPagina();var q2=$('#dk-pickq');if(q2){q2.focus();var v=q2.value.length;try{q2.setSelectionRange(v,v);}catch(er){}}return;}
  if((b=t.closest('[data-dincrm]'))){fim();var p=b.getAttribute('data-dincrm').split('|'),i=+p.pop(),k2=p.join('|');(DK.inc[k2]||[]).splice(i,1);if(DK.inc[k2]&&!DK.inc[k2].length)delete DK.inc[k2];dkGuarda();xPagina();return;}
  if((b=t.closest('[data-dincmv]'))){fim();var p2=b.getAttribute('data-dincmv').split('|'),d=+p2.pop(),i2=+p2.pop(),k3=p2.join('|'),M=DK.inc[k3]||[],j2=i2+d;if(j2<0||j2>=M.length)return;var tmp=M[i2];M[i2]=M[j2];M[j2]=tmp;dkGuarda();xPagina();return;}
},true);
document.addEventListener('change',function(e){var t=e.target;if(!t.matches||!t.closest('#v-edit'))return;
  if(t.matches('[data-dmod]')){if(!t.value){dkFonte('mat');return;}if(t.value==='m28'){dkFonte('m28');return;}dkUsaModelo(t.value);}});
document.addEventListener('input',function(e){var t=e.target;if(!t.matches||!t.closest('#v-edit'))return;
  if(t.matches('[data-dmodq]')){DK.modq=t.value;var s=document.querySelector('#x-top [data-dmod]');if(s)s.innerHTML=dkModOpts();return;}
  if(t.id==='dk-pickq'){DK.pickq=t.value;var ol=$('#dk-pickl'),sel=XP._SEL;if(ol&&sel&&window.CQX)ol.innerHTML=CQX.pickLista(sel.n,sel.k,DK.pickq);
    var m=t.closest('.cq-pick'),mt=m&&m.querySelector('.meta');if(mt)mt.textContent=(DK.pickq?'Resultados da busca.':'Sugestões pelo bloco. Busque para ver outros.')+' Clique para incluir ou retirar.';}});
document.addEventListener('keydown',function(e){var t=e.target;if(t&&t.id==='dk-pickq'&&e.key==='Escape'){DK.pick='';DK.pickq='';xPagina();}});

/* ===== Campos automáticos (@apelido) e manuais ({{orientação}}) =====
   @apelido: campo da ficha do processo (apelidos em padrao/ficha.json, catálogo em window.CAMPOS_AUTO) ou valor que a peça e o caso calculam.
   Com o processo aberto, entra o valor; sem valor, o campo fica pendente, com o rótulo à vista, e aceita digitação.
   {{orientação}}: campo manual; o texto de dentro diz o que escrever. */
var ARR=(function(){var M={};((window.CAMPOS_AUTO||{}).campos||[]).forEach(function(c){M[c.a]=c;});return M;})();
function arrRot(a){var c=ARR[a];return c?c.r:a;}
var RE_ARR=/(^|[^\w@.\/])@([a-z][a-z0-9_]{1,48})\b/g;
/* Rótulos antigos só são associados quando a correspondência é inequívoca; orientações jurídicas continuam manuais. */
var DK_ALIAS={'id da sentença':'sentenca_id','id sentença':'sentenca_id','data da sentença':'sentenca_data','juízo de origem':'juizo_origem','juiz de origem':'juiz_origem','resultado da sentença':'sentenca_resultado','fundamento da sentença':'sentenca_fundamento','id da decisão impugnada':'impugnada_id','data da decisão impugnada':'impugnada_data','id do parecer mpf':'parecer_mpf_id','id do parecer do mpf':'parecer_mpf_id','id da procuração':'procuracao_id','síntese processual':'sintese_processual','síntese fática':'sintese_fatica','id do recurso':'recursos_ids','ids dos recursos':'recursos_ids','data do recurso':'recursos_data','id das contrarrazões':'contrarrazoes_ids'};
function dkAlias(n){var a=DK_ALIAS[String(n||'').trim().toLowerCase()];return a&&ARR[a]?'@'+a:n;}
var _campoValorFicha=campoValor;campoValor=function(k,nome,ctx){return _campoValorFicha(k,dkAlias(nome),ctx);};
var _preCamposBase=preCampos;preCampos=function(raw){return _preCamposBase(String(raw||'').replace(RE_ARR,function(m,pre,a){return ARR[a]?pre+'[PREENCHER: @'+a+']':m;}));};
var _comCamposBase=comCampos;comCampos=function(raw,ctx,fmt){return _comCamposBase(raw,ctx,fmt).replace(/<span class="fill([^"]*)"([^>]*?) aria-label="@([a-z0-9_]+)"([^>]*?)data-ph="@\3"/g,function(m,cl,a1,a,a2){
  var r=arrRot(a);return '<span class="fill'+cl+' arr"'+a1+' aria-label="'+esc(r)+'"'+a2+'data-ph="@'+a+'" data-rot="'+esc(r)+'"'+(/ auto/.test(cl)?'':' title="Campo da ficha: '+esc(r)+' (@'+a+'). Abra o processo na barra ou escreva aqui."');});};
/* na cópia, no .docx e na conferência, o campo da ficha ainda vazio aparece pelo rótulo */
var _camposRBase=camposR;camposR=function(raw,ctx){return _camposRBase(raw,ctx).replace(/@([a-z0-9_]+)/g,function(m,a){return ''+arrRot(a)+'';});};
var _camposTBase=camposT;camposT=function(raw,ctx){return _camposTBase(raw,ctx).replace(/\[@([a-z0-9_]+)\]/g,function(m,a){return '['+arrRot(a)+']';});};
/* valores: ficha do processo aberto (campos “seção.Campo” e, para os do acervo, “acervo.coluna”) e os valores que a peça e o caso já calculam */
function dkValorFicha(v){if(v==null)return '';if(Array.isArray(v))return v.map(function(x){return x&&typeof x==='object'?Object.keys(x).map(function(z){return x[z];}).filter(Boolean).join(' · '):String(x);}).filter(Boolean).join('; ');return String(v);}
/* Fórmulas visíveis, com fragmentos da mesma composição da HERO. Nunca inferir ausência de manifestação. */
function dkFragmentosFicha(V){
  var R={};V=V||{};
  function put(k,v){v=String(v||'').trim();if(v)R[k]=v;}
  function fim(t){return String(t||'').trim().replace(/\.$/,'');}
  function recurso(n,t){
    var m=/^(?:Apelou|Agravou)\s+(.+?)\s+(\(IDs?\b[^\n]*?\)), alegando, em suma, que:\s*([\s\S]+)$/i.exec(String(t||''));
    if(m){put('recurso_'+n+'_parte',m[1]);put('recurso_'+n+'_referencia',m[2]);put('recurso_'+n+'_razoes',fim(m[3]));}
  }
  recurso(1,V.razoes_primeiro_recurso||V.razoes_recursais);recurso(2,V.razoes_segundo_recurso);
  var extra=String(V.razoes_recursais||'').split('\n\n').slice(1);if(extra.length&&R.recurso_1_razoes)put('recurso_1_razoes_todas',R.recurso_1_razoes+'.\n\n'+fim(extra.join('\n\n')));
  var m=/^(Houve|Não houve)\s+(?:contrarrazões|contraminuta)([\s\S]*)$/i.exec(String(V.contrarrazoes_relatorio||''));
  if(m){put('resposta_ocorrencia',m[1]);put('resposta_complemento',fim(m[2]));}
  else if(V.contrarrazoes_relatorio)put('resposta_ocorrencia',V.contrarrazoes_relatorio);
  m=/^A Procuradoria Regional da República\s+([\s\S]+)$/.exec(String(V.parecer_relatorio||''));
  if(m)put('parecer_manifestacao',fim(m[1]));else if(V.parecer_relatorio)put('parecer_manifestacao',fim(V.parecer_relatorio));
  m=/^Alegou-se\s+(.+?), inclusive em prequestionamento, pois:\s*([\s\S]+)$/.exec(String(V.vicios_relatorio||''));
  if(m){put('ed_vicio_redacao',m[1]);put('ed_pontos_redacao',fim(m[2]));}
  m=/^Alegou\s+(.+?), em suma\s+(\(IDs?\b[^\n]*?\)):\s*([\s\S]+)$/.exec(String(V.razoes_agravo_interno||''));
  if(m){put('agint_parte',m[1]);put('agint_referencia',m[2]);put('agint_razoes',fim(m[3]));}
  m=/^Trata-se de agravo de instrumento à decisão\s+\(IDs?\b[^\n]*?\)\s+que\s+([\s\S]+)$/.exec(String(V.abertura_relatorio||''));
  if(m)put('decisao_agravada_sintese',fim(m[1]));
  m=/^Trata-se de\s+([\s\S]+)$/.exec(String(V.abertura_relatorio||''));if(m)put('relato_objeto',fim(m[1]));
  put('dispositivo_conclusao',fim(String(V.dispositivo_voto||'').replace(/^Ante o exposto,\s*/i,'')));
  put('honorarios_solucao',fim(String(V.honorarios_recursais_texto||'').replace(/^Pela sucumbência recursal,\s*/i,'')));
  return R;
}
var _xAutoCasoBase=xAutoCaso;xAutoCaso=function(){_xAutoCasoBase();
  var dados=(typeof MS!=='undefined'&&XS.ed==='mod'&&MS.fichaCaso&&String(MS.fichaCaso.P.processo||'').replace(/\D/g,'')===String(XD.proc||'').replace(/\D/g,''))?MS.fichaCaso:null;
  var P=dados?dados.P:(window.CQX&&CQX.tem()?CQX.P():null),J=dados?dados.J:(P?CQX.J():null);if(P&&String(P.processo||'').replace(/\D/g,'')!==String(XD.proc||'').replace(/\D/g,'')){P=null;J=null;}var cp=(J&&String(J.processo||'').replace(/\D/g,'')===String(P.processo||'').replace(/\D/g,'')&&J.campos)||{};
  Object.keys(ARR).forEach(function(a){var c=ARR[a],v='';if(c.s==='*')return;delete AUTO['@'+a];
    if(c.s)v=cp[c.s+'.'+c.c];else{var fs=c.f||[],keys=[c.c].concat(fs);if(fs.length>1)keys.push(fs.join('.'));keys.some(function(n){v=cp['acervo.'+n];return v!=null&&v!=='';});}
    if(c.col){if(typeof v==='string'){try{v=JSON.parse(v);}catch(er){v=[];}}v=Array.isArray(v)?v.map(function(row){return row&&row[c.col];}).filter(function(x){return x!=null&&String(x).trim()!=='';}):[];}
    v=dkValorFicha(v).trim();if(v)AUTO['@'+a]=v;});
  var E={processo:'processo',classe:'CLASSE',assunto:'ASSUNTO',ramo:'RAMO',polo_ativo:'polo ativo',polo_passivo:'polo passivo',recorrente:'recorrente',resultado:'resultado',conclusao:'CONCLUSÃO',dispositivo_ementa:'dispositivo da ementa',classe_ementa:'CLASSE',assunto_ementa:'ASSUNTO'};
  ['classe','assunto','polo_ativo','polo_passivo'].forEach(function(a){if(AUTO['@'+a])AUTO[E[a]]=a==='classe'||a==='assunto'?String(AUTO['@'+a]).toUpperCase():AUTO['@'+a];});
  /* Resultado redacional deriva do dispositivo escolhido, não do rótulo classificatório da ficha. */
  Object.keys(E).forEach(function(a){if(!AUTO['@'+a]&&AUTO[E[a]])AUTO['@'+a]=AUTO[E[a]];});
  // Variáveis compostas da mesma ficha e do mesmo gerador da HERO.
  ['abertura_relatorio','resultado_decisao_recorrida','comandos_dispositivos','frase_honorarios_origem','razoes_recursais','contrarrazoes_relatorio','parecer_relatorio','caso_em_exame','questao_em_discussao','razoes_primeiro_recurso','razoes_segundo_recurso','razoes_agravo_interno','vicios_relatorio','ementa_embargada_literal','sentenca_paragrafo','parecer_sentido_redacional','dispositivo_voto','honorarios_recursais_texto','honorarios_ementa','dispositivo_ementa_ficha','acordao_recorrido_id','decisao_agravada_id'].forEach(function(a){delete AUTO['@'+a];});
  if(P&&J&&String(J.processo||'').replace(/\D/g,'')===String(P.processo||'').replace(/\D/g,'')&&window.MutaGerador&&MutaGerador.comporFicha){
    var fo={};Object.keys(cp).forEach(function(k){if(k.indexOf('acervo.')===0)fo[k.slice(7)]=cp[k];});
    fo.classe_judicial=fo.classe_judicial||P.classe||'';fo.Assunto=fo.Assunto||P.assunto||'';
    var tj=String(cp['triagem.Tipo de Julgamento']||P.tipoJulgamento||fo.classe_judicial||'');
    if(/apela|remessa|agravo|embargos de declara|retrata/i.test(tj)){
      var D=MutaGerador.comporFicha(cp,fo);
      Object.keys(D.variaveis||{}).forEach(function(a){if(D.variaveis[a])AUTO['@'+a]=D.variaveis[a];});
       var F=dkFragmentosFicha(D.variaveis);Object.keys(F).forEach(function(a){if(!D.variaveis[a])AUTO['@'+a]=F[a];});
       /* Cada recurso conserva os seus próprios dados. Não concatenar recursos em campo do primeiro. */

    }else if(/mandado de seguran[çc]a|msciv/i.test(tj)){
      var H=MutaGerador.comporFicha(cp,fo,'Apelação').variaveis;AUTO['@honorarios_recursais_texto']=H.honorarios_recursais_texto;
    }
  }
  if(AUTO['@ramo_direito'])AUTO['@ramo']=String(AUTO['@ramo_direito']).replace(/^direito\s+/i,'').toUpperCase();
  /* cabeçalho da ementa: classe e assunto em maiúsculas, da ficha quando o acervo embutido não tiver o processo */
  ['classe','assunto'].forEach(function(a){if(!AUTO['@'+a+'_ementa']&&AUTO['@'+a])AUTO['@'+a+'_ementa']=String(AUTO['@'+a]).toUpperCase();});
  if(P){var C={processo:P.processo,classe:P.classe,assunto:P.assunto,tipo_julgamento:P.tipoJulgamento,tipo_de_caso:P.subassuntos,especificidades:P.especificidades,alegacoes:P.questoes,resultado_julgamento:P.resultado,honorarios_julgamento:P.honorarios};Object.keys(C).forEach(function(a){if(C[a]&&!AUTO['@'+a])AUTO['@'+a]=dkValorFicha(C[a]);});['classe','assunto'].forEach(function(a){if(AUTO['@'+a]){AUTO[a.toUpperCase()]=String(AUTO['@'+a]).toUpperCase();AUTO['@'+a+'_ementa']=AUTO[a.toUpperCase()];}});}};
/* Redação condicional: preservar o sentido do gerador, sem uma versão "por fonte". */
var _dkEscolhaIntegrada=escolha;
escolha=function(t,ST){var E=_dkEscolhaIntegrada(t,ST),f=E.a.f||'',n=f;
  if(/@resposta_ocorrencia/.test(f)){
    var s=AUTO['@resposta_ocorrencia']||'';
    if(/^não houve$/i.test(s))n=f.replace(' @resposta_complemento','');
    else if(/^\[VALIDAR:/.test(s))n='@resposta_ocorrencia';
  }
  if(f==='A Procuradoria Regional da República @parecer_manifestacao.'&&/^Intimada, a Procuradoria Regional da República não se manifestou\.$/.test(AUTO['@parecer_relatorio']||''))n='Intimada, a Procuradoria Regional da República não se manifestou.';
  if(f==='A Procuradoria Regional da República @parecer_manifestacao.'&&/^\[VALIDAR:/.test(AUTO['@parecer_relatorio']||''))n='@parecer_manifestacao';
  if(f==='Pela sucumbência recursal, @honorarios_solucao.'&&AUTO['@honorarios_recursais_texto']&&!/^Pela sucumbência recursal,/i.test(AUTO['@honorarios_recursais_texto']))n='@honorarios_solucao.';
  if(n!==f){E.a=Object.assign({},E.a,{f:n});}
  return E;
};

/* Migração dos blocos alterados: mantém os campos e as escolhas das fórmulas que continuam
   idênticas. Campos de fórmulas antigas sem correspondência são conservados para consulta,
   nunca reinterpretados como um novo ID ou outro campo. */
var DK_FORMULAS_MAP={"relatorio|Abertura (variante)":[-1,0],"relatorio|Sentença":[-1,-1],"relatorio|Razões":[-1,-1],"relatorio|Contrarrazões":[-1,1,2],"relatorio|Ministério Público":[-1,1,2,3,4],"voto|Moldura jurídica":[-1,0],"voto|Exame do caso":[-1,0,0],"voto|Precedente":[-1,-1],"voto|Honorários recursais":[-1,1,2,3,4,5,6,-1,7,8,9,10],"voto|Dispositivo":[-1,-1,-1],"ementa|I. CASO EM EXAME":[-1,0],"ementa|II. QUESTÃO EM DISCUSSÃO":[-1,0],"ementa|III. RAZÕES DE DECIDIR":[-1,0],"ementa|IV. DISPOSITIVO":[0,-1],"ementa|Rodapé":[-1,0],"monocratica|Relato":[-1,-1],"monocratica|Fundamentação":[-1,0],"monocratica|Dispositivo":[-1,-1],"rel-ap|Sentença":[-1,-1],"rel-ap|Razões":[-1,-1],"rel-ap|Contrarrazões":[-1,1,2],"rel-ap|Ministério Público":[-1,1,2,3,4,5],"rel-dap|Abertura":[-1,-1],"rel-dap|Razões do primeiro apelante":[-1,-1],"rel-dap|Razões do segundo apelante":[-1,-1],"rel-dap|Contrarrazões":[-1,1,2],"rel-dap|Ministério Público":[-1,1,2,3,4,5],"rel-aprn|Abertura":[-1,-1,-1],"rel-aprn|Razões":[-1,-1],"rel-aprn|Contrarrazões":[-1,1,2],"rel-aprn|Ministério Público":[-1,1,2,3,4,5,6],"rel-ai|Abertura":[-1,-1],"rel-ai|Razões":[-1,-1],"rel-ai|Contraminuta":[-1,1,2],"rel-ai|Ministério Público":[-1,1,2,3,4,5],"rel-ed|Abertura":[-1,-1,-1],"rel-ed|Ementa embargada":[-1,-1],"rel-ed|Vícios alegados":[-1,-1],"rel-ed|Resposta":[-1,1,2,3],"rel-ed|Ministério Público":[-1,1,2,3,4,5],"rel-agint|Abertura":[-1,-1],"rel-agint|Razões":[-1,-1],"rel-agint|Contraminuta":[-1,1,2]};
var DK_FORMULAS_ANTERIORES=null;
(function(){try{var k='vdm-minutario-formulas-v2';var anterior=localStorage.getItem(k+'-rascunho-anterior');
  if(anterior){var b=JSON.parse(anterior);DK_FORMULAS_ANTERIORES=b.campos?b:{proc:XD.proc||'',campos:b};}
  if(localStorage.getItem(k))return;
  var antigos={},novos={},excluir=[];
  Object.keys(FILL).forEach(function(f){var m=/^(.*?)@(\d+)(\.\d+)?(#\d+)$/.exec(f),L=m&&DK_FORMULAS_MAP[m[1]];
    if(!L)return;var i=L[+m[2]];if(i===+m[2])return;
    excluir.push(f);if(i>=0)novos[m[1]+'@'+i+(m[3]||'')+m[4]]=FILL[f];else antigos[f]=FILL[f];
  });
  excluir.forEach(function(f){delete FILL[f];});Object.keys(novos).forEach(function(f){FILL[f]=novos[f];});
  Object.keys(DK_FORMULAS_MAP).forEach(function(f){if(!Object.prototype.hasOwnProperty.call(XP.alt,f))return;var i=DK_FORMULAS_MAP[f][XP.alt[f]];if(i>=0)XP.alt[f]=i;else{delete XP.alt[f];delete XP.alt[f+'/s'];}});
  if(Object.keys(antigos).length){DK_FORMULAS_ANTERIORES={proc:XD.proc||'',campos:antigos};localStorage.setItem(k+'-rascunho-anterior',JSON.stringify(DK_FORMULAS_ANTERIORES));}
  localStorage.setItem(k,'1');xRascunho();
}catch(e){}})();
function dkRascunhoAnterior(){var b=DK_FORMULAS_ANTERIORES;if(!b||String(b.proc||'').replace(/\D/g,'')!==String(XD.proc||'').replace(/\D/g,''))return '';
  var ks=Object.keys(b.campos||{});if(!ks.length)return '';return '<details class="cf dsec"><summary class="cfl">Campos do rascunho anterior · '+ks.length+'</summary><p class="meta">Valores de fórmulas substituídas, preservados para consulta. Copie o que for pertinente para os novos campos.</p>'+ks.map(function(k){return '<div class="dfl"><span>'+esc(k.split('@')[0].split('|').pop())+'</span><textarea readonly rows="3">'+esc(b.campos[k])+'</textarea></div>';}).join('')+'</details>';
}
/* canhoto “Campos do bloco”: o campo da ficha aparece pelo rótulo */
var _dkCampoRotBase=dkCampoRot;dkCampoRot=function(f){var ph=dkAlias(f.getAttribute('data-ph')||'');if(ph.charAt(0)==='@')return arrRot(ph.slice(1))+' · ficha';return _dkCampoRotBase(f);};

/* Canhoto e folha consultam a mesma fonte, inclusive depois do recálculo dos campos. */
var _xAutoAplicaCanhoto=xAutoAplica;
xAutoAplica=function(){_xAutoAplicaCanhoto();$$('#x-aside [data-dfk]').forEach(function(input){if(document.activeElement===input)return;var key=input.getAttribute('data-dfk'),f=$$('#x-main .fill').filter(function(x){return x.getAttribute('data-fk')===key;})[0];if(!f)return;input.value=f.textContent.trim();var l=input.closest('.dfl');if(l)l.classList.toggle('au',f.classList.contains('auto'));});};

/* ===== Canhoto único: as orientações e o roteiro (antigo painel direito, #x-ref) ficam dentro do canhoto.
   O nó #x-ref é mudado de lugar, não recriado: xRef, o painel Caso e a Consulta continuam escrevendo nele.
   Sem bloco: resumo da parte, lista de blocos e orientações. Com bloco: o bloco, as regras dele e os outros blocos. Os modelos do caso ficam no seletor Modelo da barra; a conformidade, no banner. ===== */
function dkJunta(){var as=$('#x-aside'),ref=$('#x-ref'),c=as&&as.querySelector('.dcan'),bot=$('#dcan-bot');if(!ref||!c||!bot)return;
  ref.setAttribute('aria-label','Orientações e roteiro');ref.classList.add('dorip');
  if(XP.sel){if(bot.previousSibling!==ref||ref.parentNode!==c)c.insertBefore(ref,bot);}
  else if(bot.nextSibling!==ref||ref.parentNode!==c)c.insertBefore(ref,bot.nextSibling);}
/* exportações (Copiar peça, .docx, PDF, limpar, Conferir) saem da barra do topo e entram na pílula do "Copiar <parte>", logo acima da folha */
var DPILL={'data-xcp':'Copiar peça','data-xdocx':'.docx','data-xpdf':'PDF','data-xlimpar':'Limpar','data-dconf':'Conferir'};
function dkPilula(){var ex=$('#x-top .dexp'),tb=$('#x-main .dtabs');if(!ex||!tb)return;
  var pl=document.createElement('div');pl.className='dpill';pl.setAttribute('role','group');pl.setAttribute('aria-label','Copiar e exportar');
  var cp=tb.querySelector('.dcpp');if(cp)pl.appendChild(cp);
  $$('button',ex).forEach(function(b){for(var a in DPILL)if(b.hasAttribute(a)&&!b.querySelector('.pa-tx')&&a!=='data-xlimpar'){var s=document.createElement('span');s.className='pa-tx';s.textContent=DPILL[a];b.appendChild(s);}pl.appendChild(b);});
  var w=document.createElement('div');w.className='dpillw';w.appendChild(pl);tb.appendChild(w);ex.remove();}
/* painel flutuante dos parágrafos do banco, preso ao bloco: abre pelo "+ parágrafo" da margem, mostra os incluídos (ordem e retirada)
   e a busca no banco; fecha por "Fechar" ou Esc. Os cliques dentro dele não chegam à seleção do bloco. */
function dkFlutuante(){var k=DK.pick;if(!k)return;var B=document.querySelector('#x-main .xblk[data-xk="'+(window.CSS&&CSS.escape?CSS.escape(k):k)+'"]'),t=XP._SEL;
  if(!B||!t||t.k!==k){DK.pick='';return;}
  var p=document.createElement('div');p.className='dflut';p.setAttribute('role','dialog');p.setAttribute('aria-label','Parágrafos do banco · '+t.n);
  p.innerHTML='<div class="dflut-h"><b>Parágrafos do banco</b><span>'+esc(t.n)+'</span></div>'+dkIncHtml(t);
  p.addEventListener('click',function(e){e.stopPropagation();});B.classList.add('dflut-on');B.appendChild(p);
  var r=p.getBoundingClientRect();if(r.bottom>window.innerHeight&&r.height<window.innerHeight)window.scrollBy({top:r.bottom-window.innerHeight+16,behavior:'smooth'});}
/* modelos para o caso: painel preso ao seletor "Modelo" da barra (abre sozinho quando um processo novo é aberto);
   aplicar um modelo o põe no seletor e fecha o painel; fecha também por fora, por Esc ou pelo botão */
function dkSugAbre(on){DK.sug=!!on;var g=$('#x-top .dtxt'),v=g&&g.querySelector('.dsug');if(v)v.remove();
  var bt=g&&g.querySelector('[data-dsug]');if(bt)bt.setAttribute('aria-expanded',String(DK.sug));
  if(!DK.sug||!g||!(window.CQX&&CQX.tem()))return;
  var d=document.createElement('div');d.className='dsug';d.setAttribute('role','dialog');d.setAttribute('aria-label','Modelos para o caso');
  d.innerHTML='<div class="dsug-h"><b>Modelos para o caso</b><button type="button" class="dsug-x" data-dsugx aria-label="Fechar">×</button></div>'+CQX.solucoes();g.appendChild(d);}
function dkSugRender(){var d=$('#x-top .dtxt .dsug');if(!d||!(window.CQX&&CQX.tem()))return;
  d.innerHTML='<div class="dsug-h"><b>Modelos para o caso</b><button type="button" class="dsug-x" data-dsugx aria-label="Fechar">×</button></div>'+CQX.solucoes();}
var _dkUsaM=dkUsaModelo;dkUsaModelo=function(){DK.sug=false;return _dkUsaM.apply(this,arguments);};
var _dkFonteB=dkFonte;dkFonte=function(){DK.sug=false;return _dkFonteB.apply(this,arguments);};
document.addEventListener('click',function(e){var t=e.target;if(!t.closest)return;
  if(t.closest('[data-dsug]')){e.preventDefault();e.stopImmediatePropagation();dkSugAbre(!DK.sug);if(DK.sug){var q=$('#cq-modelq');if(q)q.focus();}return;}
  if(t.closest('[data-dsugx]')){e.preventDefault();e.stopImmediatePropagation();dkSugAbre(false);return;}
  if(DK.sug&&!t.closest('.dsug'))dkSugAbre(false);},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&DK.sug&&e.target.closest&&(e.target.closest('.dsug')||e.target===document.body))dkSugAbre(false);});
/* Conformidade no banner, expandida no fluxo. */
DK.confOpen=false;
function dkConf(){var V=$('#v-edit'),banner=V&&V.querySelector('.pg-h');if(!banner)return;var el=$('#dk-conf'),btn=banner.querySelector('[data-dconfmin]'),on=!V.hidden&&(XS.ed||'pecas')==='pecas'&&$('#x-wrap')&&!$('#x-wrap').hidden,open=!!(on&&DK.confOpen);
if(!el){el=document.createElement('section');el.id='dk-conf';el.setAttribute('aria-label','Conformidade do caso');el.hidden=true;banner.appendChild(el);}
if(el.hidden===open)el.hidden=!open;if(banner.classList.contains('dk-conf-open')!==open)banner.classList.toggle('dk-conf-open',open);if(btn&&btn.getAttribute('aria-expanded')!==String(open))btn.setAttribute('aria-expanded',String(open));if(!open)return;
var C=window.CQX&&CQX.tem()?CQX.conformidade():null,h='<div class="dkc-h"><b>Conformidade do caso</b>'+(C&&C.n?'<span class="dkc-n">'+C.ok+'/'+C.n+' em ordem</span>':'')+'</div><div class="dkc-b">'+(C?C.h:'<p class="meta">Abra um processo ou item para consultar a conformidade.</p>')+'</div>';if(el.__conf!==h){el.__conf=h;el.innerHTML=h;}}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#v-edit [data-dconfmin]');if(!b)return;e.preventDefault();DK.confOpen=!DK.confOpen;dkConf();});
var _xRefConf=xRef;xRef=function(){var r=_xRefConf.apply(this,arguments);dkConf();return r;};
var _xRenderConf=xRender;xRender=function(){var r=_xRenderConf.apply(this,arguments);dkConf();return r;};
/* balão de orientações: o que importa ao bloco (regras do trecho, editoriais e jurídicas de orientacoes.json) surge com o cursor
   sobre o texto do bloco ou sobre o título da parte; some ao sair, ao clicar, ao digitar ou ao rolar. O completo está no Breviário. */
var DBAL={t:0,k:''};
/* rótulo em caixa alta → frase ("ARTIGO 489, I, DO CPC" → "Artigo 489, I, do CPC"), mantendo siglas e romanos */
function dkRotCaixa(s){var SIG=/^(CPC|CF|STJ|STF|CNJ|MPF|MS|ED|TRF|TNU|INSS|EC|ACP|I|II|III|IV|V|VI|VII|VIII|IX|X)$/,P=String(s).split(/(\s+)/);
  return P.map(function(w,i){var c=w.replace(/[^A-Za-zÀ-ÿ]/g,'');if(SIG.test(c)||(c.length===1&&i===P.length-1))return w;w=w.toLowerCase();return i===0?w.charAt(0).toUpperCase()+w.slice(1):w;}).join('');}
function dkBalaoHtml(pid,n){var o=dkOri(pid,n||(pid==='ementa'?'Cabeçalho':''))||(!n?ORI.filter(function(x){return x[0]===pid;})[0]:null),RG=n?dkRegras(pid,n):[];
  var ed=(o?o[2]:[]).slice(),ju=o?o[3]:[];
  if(pid==='ementa'&&n){var mk={'Cabeçalho':'CABEÇALHO','I. CASO EM EXAME':'CASO EM EXAME','II. QUESTÃO EM DISCUSSÃO':'QUESTÃO EM DISCUSSÃO','III. RAZÕES DE DECIDIR':'RAZÕES DE DECIDIR','Itens':'ITENS','Rodapé':'RODAPÉ'}[n];if(mk)ed=ed.filter(function(x){return x[0]===mk;});}
  RG=RG.filter(function(r){return !ed.some(function(x){return x[1]===r;});});
  if(!ed.length&&!ju.length&&!RG.length)return '';
  var li=function(L,cls){return L.map(function(x){return '<li class="'+cls+'">'+(x[0]?'<b>'+esc(dkRotCaixa(x[0]))+'.</b> ':'')+xFm(x[1])+'</li>';}).join('');};
  return '<p class="dbal-k">'+esc(n?n.replace(/^[IV]+\.\s*/,''):'Orientações da parte')+'</p><ul>'+li(RG.map(function(r){return ['',r];}),'rg')+li(ed,'ed')+li(ju,'ju')+'</ul><p class="dbal-f">Completo no Breviário › Orientações por parte e bloco</p>';}
function dkBalaoFecha(){clearTimeout(DBAL.t);DBAL.k='';var b=document.getElementById('dk-balao');if(b)b.hidden=true;}
function dkBalaoPos(b,x,y){var w=b.offsetWidth,h=b.offsetHeight,X=Math.min(x+16,window.innerWidth-w-10),Y=y+18;if(Y+h>window.innerHeight-10)Y=Math.max(10,y-h-14);b.style.left=Math.max(10,X)+'px';b.style.top=Y+'px';}
document.addEventListener('mousemove',function(e){var t=e.target;if(!t.closest){return;}
  var alvo=t.closest('#x-main .xblk .dbody,#x-main .dpj');
  if(!alvo||t.closest('.dflut,.band,button,select,input')||DK.pick||DK.sug){if(DBAL.k)dkBalaoFecha();else clearTimeout(DBAL.t);return;}
  var blk=alvo.closest('.xblk'),n=blk?((blk.querySelector('.bl')||{}).textContent||''):'',k=(DK.parte||'')+'|'+n,b=document.getElementById('dk-balao');
  if(k===DBAL.k&&b&&!b.hidden){dkBalaoPos(b,e.clientX,e.clientY);return;}
  clearTimeout(DBAL.t);DBAL.k='';if(b)b.hidden=true;var x=e.clientX,y=e.clientY;
  DBAL.t=setTimeout(function(){var h=dkBalaoHtml(DK.parte,n);if(!h)return;var bb=document.getElementById('dk-balao');
    if(!bb){bb=document.createElement('div');bb.id='dk-balao';bb.setAttribute('role','tooltip');document.body.appendChild(bb);}
    bb.innerHTML=h;bb.hidden=false;DBAL.k=k;dkBalaoPos(bb,x,y);},450);});
['mousedown','keydown','scroll','wheel'].forEach(function(ev){window.addEventListener(ev,function(){if(DBAL.k||DBAL.t)dkBalaoFecha();},true);});
document.addEventListener('mouseleave',dkBalaoFecha);
(function(){var _xp=xPagina;xPagina=function(){var r=_xp.apply(this,arguments);dkJunta();dkPilula();dkFlutuante();dkSugAbre(DK.sug);dkConf();return r;};})();

/* Minutário com três modos (Minutário · Modelos · Parágrafos), trocados pelo seletor da abertura, como o Relator/Turma do Ementário */
window.VDM_minAtual=function(){return XS.ed||'pecas';};
window.VDM_minModo=function(v){if(['pecas','mod','par'].indexOf(v)<0)return;irEditorial(v);window.scrollTo(0,0);};
