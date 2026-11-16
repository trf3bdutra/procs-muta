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
  voto:['Admissibilidade','Preliminares e prejudiciais','Decisão recorrida','Questão em discussão','Moldura jurídica','Na espécie: fatos','Na espécie: provas','Aplicação ao caso','Fecho da questão','Consectários','Honorários','Complementos','Dispositivo'],
  ementa:['Ementa e acórdão','Revisão redacional'],acordao:['Ementa e acórdão']};
DROTP.monocratica=DROTP.voto;DROTP['acordao-completo']=DROTP.relatorio.concat(DROTP.voto,DROTP.ementa);
function dkRotPos(id){if(DROTP[id])return DROTP[id];if(/^rel-/.test(id))return DROTP.relatorio;if(id==='ed'||id==='agint')return DROTP.voto;return [];}
function dkRotEsp(){var jg=dkJg(),cl=dkCl(),L=[];
  if(jg==='ed')L.push('Embargos de declaração');else if(jg==='agint')L.push('Agravo interno');
  else if(cl==='ai')L.push('Agravo de instrumento');
  else{L.push('Apelação cível');if(cl==='aprn'||jg==='dap')L.push('Remessa necessária');}
  if(dkPron()==='mono')L.push('Decisão monocrática');
  return L;}
function dkRotAssuntos(){return (DROT.blocos||[]).filter(function(b){return b.g==='assunto';}).map(function(b){return b.nome;});}
function dkRotItem(b,it){
  return '<li class="xri'+(it.e?' ess':'')+'"><b>'+esc(it.q)+'</b>'+(it.e?' <span class="xrie">essencial</span>':'')+
    (it.o?'<p>'+xFm(it.o)+'</p>':'')+
    (it.f?'<p class="xrif">'+esc(it.f).replace(/\n/g,'<br>')+'</p>':'')+
    '<small>'+esc(b.nome)+(it.fn?' · '+esc(it.fn):'')+'</small></li>';}
function dkRoteiro(pid){
  var poss=dkRotPos(pid),B=DROT.blocos||[];if(!poss.length||!B.length)return '';
  var esp=dkRotEsp(),as=DK.rotAs||'',n=0,ess=0,corpo='';
  var usa=B.filter(function(b){return b.g==='mestre'||b.g==='transversal'||(b.g==='especie'&&esp.indexOf(b.nome)>=0)||(b.g==='assunto'&&b.nome===as);});
  (DROT.posicoes||[]).forEach(function(ps){
    if(poss.indexOf(ps)<0)return;
    var L=[];usa.forEach(function(b){(b.itens||[]).forEach(function(it){if(it.pos===ps)L.push({b:b,i:it});});});
    if(!L.length)return;
    L.sort(function(x,y){return (y.i.e?1:0)-(x.i.e?1:0);});n+=L.length;
    var ne=L.filter(function(x){return x.i.e;}).length;ess+=ne;
    DK.rotPs=DK.rotPs||{};
    corpo+='<details class="xrps"'+(DK.rotPs[ps]?' open':'')+' data-rotps="'+esc(ps)+'"><summary>'+esc(ps)+'<small>'+L.length+(ne?' · '+ne+(ne>1?' essenciais':' essencial'):'')+'</small></summary>'+
      xLista(L.map(function(x){return dkRotItem(x.b,x.i);}))+'</details>';});
  if(!n)return '';
  var opc='<option value="">Sem assunto</option>'+dkRotAssuntos().map(function(x){return '<option value="'+esc(x)+'"'+(x===as?' selected':'')+'>'+esc(x)+'</option>';}).join('');
  return '<div class="dori xrot"><div class="ohd"><p class="kick2">Roteiro · '+esc(String(pid==='relatorio'?'relatório':pid).toUpperCase())+'</p><span class="xrqt">'+n+' · '+ess+(ess>1?' essenciais':' essencial')+'</span></div>'+
    '<p class="ointro">Perguntas do catálogo do gabinete para esta parte: roteiro-mestre, espécie do recurso, assunto e transversais.</p>'+
    '<div class="xrsel"><label for="drot-as">Assunto</label><select id="drot-as">'+opc+'</select></div>'+
    '<p class="xrn">'+esc(esp.join(' · '))+'</p>'+corpo+'</div>';}
document.addEventListener('change',function(e){if(e.target&&e.target.id==='drot-as'){DK.rotAs=e.target.value;xRef();}});
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
  var h='<div class="dbar"><label>Pronunciamento<div class="dseg" role="group" aria-label="Pronunciamento">'+[['ac','Acórdão'],['mono','Monocrática'],['desp','Despacho']].map(function(o){return '<button type="button" data-dpr="'+o[0]+'" aria-pressed="'+(pr===o[0])+'">'+o[1]+'</button>';}).join('')+'</div></label>';
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
  h+='<div class="cf"><div class="cfl">Regras do trecho'+(rr.length?' <span class="pill">'+rr.length+'</span>':'')+'</div>'+(rr.length?xLista(rr.map(function(r){return '<li>'+xFm(r)+'</li>';})):'<p class="meta" style="margin:0">Sem regra específica além da fórmula.</p>')+(window.VDM_EDITOR&&xBY()[t.pid]?'<button class="e-mini ed-in" data-edpec="'+esc(t.pid)+'">Editar esta peça</button>':'')+'</div>';
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
  return h;}
/* campo de ID: azul-acinzentado, distinto do amarelo de redação */
function dkMarcaIds(r){$$('.fill',r).forEach(function(f){var p=f.previousSibling,t=p&&p.nodeType===3?p.nodeValue:(p&&p.textContent)||'';if(/\bIDs?[’']?s?\s*(?:n?º\s*)?$/.test(t)||/^ID/.test(f.getAttribute('data-ph')||''))f.classList.add('idf');});}
function xPagina(){
  var PT=xPartes(),FMT=((ED.pecas.forma.filter(function(f){return f.t==='Formatação para o PJe';})[0]||{}).r)||[];XP._PT=PT;xAuto(PT);
  var ids=PT.map(function(p){return p.id;}),sel=null;
  PT.forEach(function(p){p.tr.forEach(function(t){if(t.k===XP.sel)sel={t:t,pt:p};});});
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
DK.cx=false;try{var _dk=JSON.parse(localStorage.getItem('dk-ed-d')||'{}');DK.man=!!_dk.man;}catch(e){}
function dkGuarda(){try{localStorage.setItem('dk-ed-d',JSON.stringify({man:DK.man}));}catch(e){}}
var KX={ready:false,falhou:false};function cxQual(){return '';}function cxBoot(){}function cxMostra(){}function cxSyncBar(){}function cxPartes(){return [];}
var CXSEC={};
/* ===== orientações (painel direito): editoriais e jurídicas do bloco selecionado ===== */
var ORI=[
 ['relatorio',/^Abertura/,[['FORMA A','Parágrafo único: “Trata-se de apelação à sentença (ID …) que …”; Forma B só por escolha, em previdenciário ou sentença com três ou mais comandos.'],['DECISÃO RECORRIDA','Verbo nuclear e comandos enumerados; honorários e custas em nova frase.']],[['ARTIGO 489, I, DO CPC','O relatório traz as partes, a identificação do caso, a suma do pedido e da resposta e as principais ocorrências.']]],
 ['relatorio',/^Senten/,[['COMANDOS','Comandos da sentença enumerados; honorários e custas em nova frase.']],[['ARTIGO 489, I, DO CPC','Suma do pedido, da resposta e das principais ocorrências.']]],
 ['relatorio',/^(Recurso|Razões|Vícios)/,[['ALEGAÇÕES','“alegando, em suma:” + infinitivo, ou “alegando, em suma, que:” + verbo flexionado; itens numerados.'],['PEDIDO','Fechar com o pedido: “pelo que requereu …”.']],[['EFEITO DEVOLUTIVO','A apelação devolve ao tribunal a matéria impugnada (artigo 1.013, caput, do CPC).'],['PRELIMINARES','Preliminares do recurso entram no relatório e são decididas antes do mérito (artigo 938 do CPC).']]],
 ['relatorio',/^(Contrarraz|Contraminuta|Resposta)/,[['PARÁGRAFO PRÓPRIO','Contrarrazões em parágrafo próprio, depois das razões.'],['COM PRELIMINAR','Indicar qual preliminar foi apontada (ex.: ilegitimidade ativa).'],['RELATÓRIO','Conciso, objetivo e descritivo; sem adjetivação; fecho “É o relatório.”']],[['PRAZO','Contrarrazões em 15 dias (artigo 1.010, § 1º, do CPC); no agravo de instrumento, contraminuta (artigo 1.019, II).'],['PRELIMINAR','A preliminar das contrarrazões é enfrentada no voto, na abertura.']]],
 ['relatorio',/^(Parecer|Ministério)/,[['DENOMINAÇÃO','Em 2º grau, Procuradoria Regional da República, por extenso.'],['MODO','Prosseguimento, mérito, sem exame do mérito, sem hipótese de intervenção ou sem interesse público.']],[['INTERVENÇÃO','O Ministério Público intervém como fiscal da ordem jurídica nas hipóteses do artigo 178 do CPC.']]],
 ['relatorio',/^Ocorr/,[['ORDEM DIRETA','Memoriais, efeito suspensivo, embargos e incidentes, cada um em parágrafo próprio, na posição em que ocorreram.']],[['ARTIGO 489, I, DO CPC','O relatório registra as principais ocorrências havidas no andamento do processo.']]],
 ['relatorio',/^Encerramento/,[['FECHO','“É o relatório.” em parágrafo próprio.']],[]],
 ['voto',/^(Abertura|Cabeçalho|Vocativo)/,[['VOCATIVO','“Senhores Desembargadores,” abre o primeiro parágrafo; a frase segue em minúscula.'],['ORDEM','Admissibilidade → efeito suspensivo → perda do objeto → questões processuais.'],['PRELIMINAR','Decisão em frase curta, com o objeto e o ID; depois “Com efeito,” com os fatos.']],[['PRAZO','15 dias úteis (artigos 219 e 1.003, § 5º, do CPC); em dobro para a Fazenda Pública (artigo 183).'],['PREPARO','Entes públicos e autarquias dispensados (artigo 1.007, § 1º, do CPC).'],['CABIMENTO','Apelação contra sentença (artigo 1.009); agravo de instrumento no rol do artigo 1.015.']]],
 ['voto',/^Sobrestamento/,[['SEM SUSPENSÃO','Registrar o tema e por que o caso não se suspende.']],[['SOBRESTAMENTO','Suspensão por afetação de repetitivo ou repercussão geral (artigos 1.036 e 1.037, II, do CPC).']]],
 ['voto',/^(Transição|Moldura|Fundamentação)/,[['MOLDURA','Norma e jurisprudência antes do caso; “No mérito,” abre a transição.']],[['FUNDAMENTAÇÃO','Enfrentar os argumentos capazes de infirmar a conclusão (artigo 489, § 1º, IV, do CPC).'],['PRECEDENTES','Seguir ou distinguir precedentes com os fundamentos determinantes (artigos 927 e 489, § 1º, V e VI, do CPC).']]],
 ['voto',/^(Exame do caso|Caso vertente|Enfrentamento)/,[['CASO CONCRETO','Fato → prova (com ID) → norma → consequência. Uma ideia por frase.'],['ENFRENTAMENTO','“Nem se alegue …” ou “Contrariamente …” para afastar a tese do recurso.']],[['ARGUMENTOS','Enfrentar os argumentos capazes de infirmar a conclusão (artigo 489, § 1º, IV, do CPC).'],['ÔNUS DA PROVA','Artigo 373 do CPC.']]],
 ['voto',/^Precedente/,[['CITAÇÃO','“Em casos que tais, assim tem decidido esta Turma Regional:” e transcrição em bloco.']],[['PRECEDENTES','Observar os precedentes do artigo 927 do CPC; distinguir com fundamento (artigo 489, § 1º, VI).']]],
 ['voto',/^(Síntese|Encerramento)/,[['SÍNTESE','“Em suma,” ou “Assim,”, em uma frase.'],['HONORÁRIOS','“Pela sucumbência recursal, … deve suportar condenação adicional (artigo 85, § 11, do CPC)…”']],[['MAJORAÇÃO','Tema 1.059/STJ: só no desprovimento ou não conhecimento do recurso do vencido.'],['SEM MAJORAÇÃO','Parcial provimento, embargos de declaração, agravo interno, sentença anulada, recurso do MPF.'],['MANDADO DE SEGURANÇA','Sem honorários (artigo 25 da Lei 12.016/2009).']]],
 ['voto',/^Honor/,[['FÓRMULA','“Pela sucumbência recursal, … deve suportar condenação adicional (artigo 85, § 11, do CPC)…”'],['GRATUIDADE','Com gratuidade do devedor: “observada a gratuidade de justiça concedida (artigo 98, § 3º, do CPC)”.']],[['MAJORAÇÃO','Tema 1.059/STJ: só no desprovimento ou não conhecimento do recurso do vencido.'],['SEM MAJORAÇÃO','Parcial provimento, embargos de declaração, agravo interno, sentença anulada, recurso do MPF.'],['MANDADO DE SEGURANÇA','Sem honorários (artigo 25 da Lei 12.016/2009).']]],
 ['voto',/^Consect/,[['POR PERÍODO','Índices e juros por período, conforme o Manual de Cálculos da Justiça Federal vigente.']],[['CORREÇÃO E JUROS','Temas 810/STF e 905/STJ; a partir de 9/12/2021, Selic (artigo 3º da EC 113/2021).']]],
 ['voto',/^Dispositivo/,[['RESULTADO','Resultado expresso: conhecer ou não; dar ou negar provimento; nos embargos, acolher ou rejeitar.'],['FECHO','“É como voto.” em parágrafo próprio.']],[['JULGAMENTO NÃO UNÂNIME','Apelação com resultado não unânime: prosseguimento com outros julgadores (artigo 942 do CPC).']]],
 ['voto',/^\d\.\s*(Vícios|Rediscussão|Enfrentamento|Natureza)/,[['SEQUÊNCIA FIXA','Vícios, rediscussão, enfrentamento, natureza do inconformismo, prequestionamento.']],[['VÍCIOS','Obscuridade, contradição, omissão ou erro material (artigo 1.022 do CPC).']]],
 ['voto',/Prequestionamento/,[['FÓRMULA','Prequestionamento ficto, sem repetir as teses.']],[['ARTIGO 1.025 DO CPC','Os elementos suscitados consideram-se incluídos no acórdão para fins de prequestionamento.']]],
 ['voto',/Multa protelatória/,[['FUNDAMENTO','Indicar por que os embargos são protelatórios.']],[['ARTIGO 1.026, § 2º, DO CPC','Embargos manifestamente protelatórios: multa de até 2% do valor atualizado da causa.']]],
 ['voto',/^Multa:/,[['FUNDAMENTO','Só com votação unânime e recurso manifestamente inadmissível ou improcedente.']],[['ARTIGO 1.021, § 4º, DO CPC','Multa entre 1% e 5% do valor atualizado da causa.']]],
 ['ementa',/./,[['CABEÇALHO','Negrito e caixa alta. Ramo → classe → assunto → conclusão, em até 3 linhas.'],['CASO EM EXAME','Sem “Trata-se de”.'],['QUESTÃO EM DISCUSSÃO','Um só item: “A questão em discussão consiste em saber se …”.'],['RAZÕES DE DECIDIR','Um fundamento por item.'],['ITENS','Numeração contínua e em negrito. Frases com até 40 palavras e menos de 5 vírgulas. Sem ID.'],['RODAPÉ','Rótulos em itálico após “__________”.']],[['O QUE DEVE CONSTAR','O caso, a questão decidida, os fundamentos determinantes e o resultado, tal como no voto.'],['TESE','Só quando houver tese de julgamento; não incluir a seção por obrigação.'],['RODAPÉ','Dispositivos e precedentes efetivamente usados no voto; ordem STF → STJ → TRF-3; TNU vedada.']]],
 ['acordao',/./,[['ESPELHO DO VOTO','O resultado repete literalmente o dispositivo do voto.'],['JULGADORES','Vêm preenchidos e podem ser trocados.']],[['MAIORIA NA APELAÇÃO','Resultado não unânime: prosseguimento com outros julgadores (artigo 942 do CPC).']]],
 ['monocratica',/^(Abertura|Relato|Síntese)/,[['RELATO','Síntese objetiva do caso e do recurso, com IDs.']],[['ARTIGO 932 DO CPC','O relator decide monocraticamente nas hipóteses dos incisos III a V.']]],
 ['monocratica',/^(Marco|Fundamenta)/,[['ENQUADRAMENTO','Enquadrar no artigo 932 antes de decidir: “Segundo a Corte Superior…”.']],[['JULGAMENTO MONOCRÁTICO','Artigo 932, III a V, do CPC; Súmula 568/STJ.']]],
 ['monocratica',/^Dispositivo/,[['FÓRMULA','“Ante o exposto, com esteio no artigo 932, … do CPC, …”.']],[['ARTIGO 932 DO CPC','Indicar o inciso aplicado.']]],
 ['monocratica',/./,[['FECHO','Publique-se. Intime-se. Local e data.']],[['AGRAVO INTERNO','Cabe agravo interno da decisão monocrática (artigo 1.021 do CPC).']]],
 ['despacho',/./,[['OBJETO','Uma providência por despacho, em frase direta.']],[['DESPACHO','Ato sem conteúdo decisório (artigo 203, § 3º, do CPC).']]]];
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
    '<p class="ointro">'+(sel?'Regras do bloco selecionado na folha.':pid==='ementa'?'Como montar uma boa ementa: modelo CNJ 154/2024 adaptado, derivado do voto.':'Clique num bloco da folha para ver as regras dele.')+'</p>'+
    '<p class="okk">Editoriais</p>'+(ed.length?ed.map(function(x,i){return '<div class="ori'+(i===0&&sel?' at':'')+'"><p class="kick2">'+esc(x[0])+'</p><p>'+xFm(x[1])+'</p></div>';}).join(''):'<p class="ovz">Sem regra editorial própria além da estrutura.</p>')+
    '<p class="okk jur">Jurídicas</p>'+(ju.length?ju.map(function(x){return '<div class="ori"><p class="kick2">'+esc(x[0])+'</p><p>'+xFm(x[1])+'</p></div>';}).join(''):'<p class="ovz">Sem orientação jurídica própria neste bloco.</p>')+'</div>';
  h+=dkRoteiro(pid);
  if(DK.man){var T=[['par','Parágrafos'],['cit','Citação'],['voc','Vocabulário'],['forma','Forma']],R={};T.forEach(function(t){R[t[0]]=xRefTab(t[0]);});var G=XP._G||{h:''};
    h+='<div class="dori man"><div class="ohd"><p class="kick2">Manual · '+esc(pt.t||'')+'</p></div>'+G.h+'<div class="xrtabs" role="tablist" style="margin-top:10px">'+T.map(function(t){return '<button role="tab" data-xrt="'+t[0]+'" aria-selected="'+(XP.tab===t[0])+'">'+t[1]+(XP.q?' <small>'+R[t[0]].n+'</small>':'')+'</button>';}).join('')+'</div><input id="x-rq" type="search" placeholder="Buscar nas orientações…" aria-label="Buscar nas orientações" value="'+esc(XP.q)+'"><div class="xrb">'+(R[XP.tab].h||'<p class="meta">Nada encontrado.</p>')+'</div></div>';}
  el.innerHTML=h;
  if(foco){var q=$('#x-rq');if(q){q.focus();try{q.setSelectionRange(pos,pos);}catch(e){}}}
}
/* barra: modo do texto (construtor ou modelos) */

function xBarra(){var h=xBarraD(),q=DK.cx;

  if(cxQual())h=h.replace(/<label>(Resultado|Padrão)<select data-xsres>[\s\S]*?<\/select><\/label>/,'');
  h=h.replace(/<label>(Texto|Pronunciamento)(<div class="dseg"[\s\S]*?<\/div>)<\/label>/g,'$2');
  h=h.replace(/<label>(Classe processual|Tipo de julgamento|Resultado|Padrão)<select/g,function(_,l){return '<label><span>'+({'Classe processual':'Classe','Tipo de julgamento':'Julgamento'}[l]||l)+'</span><select';});
  h=h.replace('<div class="dbar">','<div class="dbar"><div class="dgrp">').replace('<span class="dbsp"></span>','</div><span class="dbsp"></span>');
  h=h.replace('aria-label="Limpar">'+DICO.limpar+'</button>','aria-label="Limpar">'+DICO.limpar+'</button><button type="button" class="pri" data-dconf title="Conferir a peça: campos em aberto, trechos a validar e alertas de redação" aria-label="Conferir">'+DICO.conf+'</button>');
  return h;}
DICO.conf='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 13l2 2 4-4"/></svg>';
var DSIG={'Abertura':'ABR','Sentença':'SEN','Razões':'RAZ','Recurso':'RAZ','Razões do primeiro apelante':'RAZ','Razões do segundo apelante':'RAZ','Contrarrazões':'CTR','Contraminuta':'CTR','Resposta':'CTR','Ministério Público':'MP','Parecer':'MP','Ocorrência':'OCO','Encerramento':'FEC','Cabeçalho':'CAB','Vocativo':'VOC','Transição ao mérito':'TRA','Moldura jurídica':'MOL','Fundamentação':'FUN','Exame do caso':'CAS','Caso vertente':'CAS','Enfrentamento das alegações':'ENF','Precedente':'PRE','Síntese':'SÍN','Honorários recursais':'HON','Consectários':'CON','Dispositivo':'DIS','Itens':'ITE','Rodapé':'ROD','Fórmula':'PRO','Relato':'REL','Síntese do caso':'REL','Marco decisório':'MAR','Comunicação':'COM','Destino dos autos':'DES','Local e data':'LOC','Assinatura':'ASS','Fecho':'FEC','Ementa embargada':'EME','Vícios alegados':'VÍC'};
function dkSig(n){if(DSIG[n])return DSIG[n];var m=/^([IV]+)\./.exec(n);if(m)return m[1];var d=/^(\d)\./.exec(n);if(d)return d[1];return String(n).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase();}
function dkResumo(t){if(XP.fora[t.k])return 'retirado';if(t.opc&&!XP.abre[t.k])return 'opcional';var E=escolha(t,XP.alt);if(t.alts.length>1)return (E.a.lab||'')+(E.sub?' · '+E.sub[E.si].lab:'');var f=String(E.a.f||'').replace(/\s+/g,' ').trim();return f.length>34?f.slice(0,32)+'…':f;}
function dkOutros(pt,sel){var L=pt.tr.filter(function(t){return !(t.n==='Sentença'&&sentNaAbertura(pt.tr,XP.alt));});if(L.length<2)return '';
  return '<div class="dout2"><div class="cfl">'+(sel?'Outros blocos':'Blocos da parte')+'</div><ol>'+L.map(function(t,i){if(sel&&t.k===sel.k)return '';var fo=XP.fora[t.k],op=t.opc&&!XP.abre[t.k];return '<li><button type="button" data-'+(fo?'xvolta':op?'xabre':'dsel')+'="'+esc(t.k)+'"><span class="n">'+('0'+(i+1)).slice(-2)+'</span><b>'+esc(t.n)+'</b><small>'+esc(dkResumo(t))+' ›</small></button></li>';}).join('')+'</ol></div>';}
function dkHead(){var h=$('#v-edit .pg-h');if(!h)return;var ed=XS.ed||'pecas',t=$('#v-edit .pg-t h1'),k=$('#v-edit .pg-t .dkk');if(!k&&t){k=document.createElement('p');k.className='dkk';t.parentNode.insertBefore(k,t);}
  var I={pecas:['PADRÃO · MINUTA-MATRIZ','Minuta-Matriz','Molde-padrão de cada peça: a estrutura vem pronta, com versões, campos, regras e orientações; a fundamentação é do caso.'],mod:['PADRÃO · MODELOS','Modelos','Modelos de acórdão, decisão e despacho, prontos para preencher com os dados do caso.'],dir:['DIRETRIZES DO GABINETE','Diretrizes','Entradas rápidas do que o Desembargador fixar e o manual de redação do gabinete: frase, citação, vocabulário, grafias, formatação e estrutura das peças.'],consulta:['CONSULTA DO CASO PAUTADO','Consulta','Escolha a sessão e o item: o Modus Operandi lê o cartão do processo e reúne o material aplicável.']}[ed]||['','Editorial',''];
  if(k)k.textContent=I[0];if(t)t.textContent=I[1];var d=$('#x-desc');if(d)d.textContent=I[2];
  var sb=$('#x-sub');if(sb&&!sb.querySelector('.dgp')){var gp=document.createElement('span');gp.className='dgp';gp.setAttribute('role','group');gp.setAttribute('aria-label','Padrão: versões alternativas');gp.innerHTML='<span class="dgl" data-n="01">Padrão</span><span class="dgs"></span>';
    sb.insertBefore(gp,sb.firstChild);['pecas','mod'].forEach(function(k){var b=sb.querySelector('button[data-s="'+k+'"]');if(b)gp.querySelector('.dgs').appendChild(b);});}
  $$('#x-sub button').forEach(function(b){var k=b.getAttribute('data-s'),n={dir:'02',consulta:'03'}[k];if(n)b.setAttribute('data-n',n);else b.removeAttribute('data-n');var tx={pecas:'Minuta-Matriz',mod:'Modelos',dir:'Diretrizes',consulta:'Consulta'}[k];if(tx&&b.textContent!==tx)b.textContent=tx;});}
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('#x-sub button'))setTimeout(dkHead,0);});
function xPagina(){
  var q=cxQual(),PT=q?cxPartes():xPartes(),FMT=((ED.pecas.forma.filter(function(f){return f.t==='Formatação para o PJe';})[0]||{}).r)||[];XP._PT=PT;xAuto(PT);
  var ids=PT.map(function(p){return p.id;}),sel=null;
  PT.forEach(function(p){p.tr.forEach(function(t){if(t.k===XP.sel)sel={t:t,pt:p};});});
  if(!sel&&XP.sel&&q){var m=/^cx:([^:]+):([^:]+):/.exec(XP.sel);if(m)PT.forEach(function(p){if(p.id===m[1])p.tr.forEach(function(t){if(!sel&&t.n===m[2]){sel={t:t,pt:p};XP.sel=t.k;}});});}
  if(!sel)XP.sel=null;
  if(sel)DK.parte=sel.pt.id;else if(ids.indexOf(DK.parte)<0)DK.parte=ids.indexOf('relatorio')>=0?'relatorio':ids[0];
  var pt=PT.filter(function(p){return p.id===DK.parte;})[0];XP._SEL=sel?sel.t:null;DK.cxSel=sel&&q?sel.t:null;
  var wrap=$('#x-wrap'),top=$('#x-top');if(!top){top=document.createElement('div');top.id='x-top';wrap.insertBefore(top,wrap.firstChild);}
  top.innerHTML=xBarra();
  /* folha */
  var tabs='<div class="dtabs" role="tablist" aria-label="Partes da peça">'+PT.map(function(p,i){var n=p.tr.filter(function(t){return !t.opc&&!xSai(t,p.tr,XP.alt,XP.fora);}).length;return '<button type="button" class="ftab'+(p.id===DK.parte?' on':'')+'" role="tab" aria-selected="'+(p.id===DK.parte)+'" data-dparte="'+p.id+'"><span class="n">'+('0'+(i+1)).slice(-2)+'</span>'+esc(p.t)+'<small>'+n+'</small></button>';}).join('')+'<span class="dtsp"></span>'+(PT.length>1?'<button type="button" class="dcpp" data-xcpp="'+pt.id+'" title="Copiar '+esc(pt.t.toLowerCase())+' com a formatação do PJe">'+DICO.copy+'<span> Copiar '+esc(pt.t.toLowerCase())+'</span></button>':'')+'</div>';
  var h=pt.pj?'<div class="dpj" id="xp-'+pt.id+'">'+esc(pt.pj)+' <small>(inserido pelo PJe)</small></div>':'<div id="xp-'+pt.id+'" style="height:6px"></div>',aposVoc=false,opcs=[];
  if(q&&!pt.tr.length)h+='<p class="dvazio">O construtor ainda não gerou esta parte. Preencha os dados no canhoto.</p>';
  function flush(){if(opcs.length){h+='<div class="dopc">'+opcs.join('')+'</div>';opcs=[];}}
  pt.tr.forEach(function(t){
    if(t.n==='Sentença'&&sentNaAbertura(pt.tr,XP.alt))return;
    if(XP.fora[t.k]){opcs.push('<button type="button" class="ch fora" data-xvolta="'+esc(t.k)+'">+ '+esc(t.n)+' <i>retirado</i></button>');return;}
    if(t.opc&&!XP.abre[t.k]){opcs.push('<button type="button" class="ch" data-xabre="'+esc(t.k)+'">+ '+esc(t.n)+' <i>opcional</i></button>');return;}
    flush();
    var E=escolha(t,XP.alt),ai=E.ai,a=E.a,min=false;
    if(!t.cx&&aposVoc&&a.f){min=true;aposVoc=false;a={lab:a.lab,f:a.f.charAt(0).toLowerCase()+a.f.slice(1),r:a.r};}
    var ph=!t.cx&&aposVoc&&!a.f;if(t.n==='Vocativo')aposVoc=true;else if(ph)aposVoc=false;
    var vers='';if(t.alts.length>1){var nb=t.alts.filter(function(x){return !x.base;}).length,hb=nb&&nb<t.alts.length,vb=XP.vb[t.k]||(t.alts[ai]&&t.alts[ai].base);
      vers='<div class="vs" role="group" aria-label="Versões">'+t.alts.map(function(x,i){if(x.base&&hb&&!vb)return '';return '<button type="button"'+(x.base&&hb?' class="b"':'')+' data-xalt="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===ai)+'">'+esc(x.lab||('Versão '+(i+1)))+'</button>';}).join('')+'</div>'+(hb?'<button type="button" class="dact" data-xbase="'+esc(t.k)+'">'+(vb?'menos':'+ '+(t.alts.length-nb)+' da base')+'</button>':'');}
    var sub=E.sub?'<div class="vs sub" role="group">'+E.sub.map(function(x,i){return '<button type="button" data-xsub="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===E.si)+'">'+esc(x.lab)+'</button>';}).join('')+'</div>':'';
    var acts=t.opc?'<button type="button" class="dact" data-xfecha="'+esc(t.k)+'" title="Tirar o trecho opcional da peça">recolher</button>':(xFixo(pt.id,t)?'':'<button type="button" class="dact" data-xfora="'+esc(t.k)+'" title="Retirar da peça, da cópia e do .docx">retirar</button>');
    var rn=t.cx?dkRegras(pt.id,t.n).length:(t.r||[]).length,tag='';
    var body=(pt.id==='ementa'&&/^[IV]+\./.test(t.n)?'<p class="em"><b>'+esc(t.n)+'</b></p>':'')+
      (a.f?xParas(a.f,pt.id,t.cx&&pt.id==='ementa'&&!/^[IV]+\./.test(t.n)&&t.n!=='Cabeçalho'?'Rodapé':t.n,min&&!/^\s*(\[|\{\{|…)/.test(a.f)?' <span class="drn" title="Primeiro parágrafo após o vocativo">inicia em minúscula</span>':'',{k:t.k+'@'+E.key,i:0,auto:!t.cx})
        :(pt.id==='ementa'&&/^[IV]+\./.test(t.n)?(t.r.length?'<p class="xph em">'+esc(t.r[0])+'</p>':''):'<p class="xph'+(pt.id==='ementa'?' em':' std')+'">'+(ph?'em minúscula · ':'')+esc(t.n)+(t.r.length?': '+esc(t.r[0]):'')+'</p>'));
    h+='<div class="xblk'+(XP.sel===t.k?' on':'')+(t.cx?' cxb':'')+'" data-xk="'+esc(t.k)+'"><div class="band"><span class="bl">'+esc(t.n)+'</span>'+vers+sub+tag+'<span class="dsp"></span>'+(rn?'<span class="drn">'+rn+(rn>1?' regras':' regra')+'</span>':'')+(t.info?'<span class="drn">tabela</span>':'')+acts+'</div><div class="dbody"><span class="ptg">'+esc(dkSig(t.n))+'</span>'+body+'</div></div>';
  });
  flush();
  if(PT.length>1){var ix=ids.indexOf(pt.id),pv=PT[ix-1],nx=PT[ix+1];h+='<div class="dnav">'+(pv?'<button type="button" data-dparte="'+pv.id+'">← '+('0'+ix).slice(-2)+' '+esc(pv.t)+'</button>':'<span></span>')+'<span class="dnp">PARTE '+(ix+1)+' DE '+PT.length+'</span>'+(nx?'<button type="button" data-dparte="'+nx.id+'">'+('0'+(ix+2)).slice(-2)+' '+esc(nx.t)+' →</button>':'<span></span>')+'</div>';}
  $('#x-main').innerHTML=tabs+'<div class="xsheet">'+h+'</div>';
  dkMarcaIds($('#x-main'));
  if(q)$$('#x-main .cxb .fill').forEach(function(f){f.setAttribute('contenteditable','false');f.title='Preencha no canhoto (construtor)';f.classList.add('cxf');});
  /* canhoto: topo e apoios em blocos fixos; o quadro do construtor fica no meio e nunca é recriado */
  var as=$('#x-aside');if(!$('#dcan-top')){as.innerHTML='<div class="dcan-h"><span>CANHOTO</span><small id="dcan-mode"></small></div><div class="dcan"><div id="dcan-top"></div><div id="cx-host" style="display:none"></div><div id="dcan-bot"></div></div>';}
  as.classList.toggle('cxon',!!q);if(DK._ls!==XP.sel){DK._ls=XP.sel;DK.aj=false;}
  $('#dcan-mode').textContent=q?'construtor':sel?'trecho selecionado':'peça';
  if(q){var st='';
    st='<div class="cvh"><div><p class="cvk">'+esc(pt.t)+(sel?'':' · dados do caso')+'</p><p class="cvt">'+esc(sel?sel.t.n:(pt.id==='relatorio'?'Processo':pt.id==='voto'?'Blocos do voto':pt.id==='ementa'?'Integração e cabeçalho':pt.id==='acordao'?'Proclamação':'Decisão'))+'</p></div>'+(sel?'<button type="button" class="cvx" data-dsel="" title="Voltar aos dados da parte" aria-label="Fechar o bloco">×</button>':'')+'</div>';
    if(pt.id==='acordao'){st+=sel?dkCanTrecho(sel).replace(/^<div class="cvh">[\s\S]*?<\/div><\/div>/,''):'<div class="cf"><p class="meta" style="margin:0">A proclamação segue o dispositivo do voto montado no construtor. Clique na fórmula para ver as versões.</p></div>';}
    else st+='<p class="cxnota">'+(CXSEC[pt.id]?'Seção do construtor ligada a este bloco. O texto da folha se atualiza enquanto você preenche.':'')+'</p>';
    $('#dcan-top').innerHTML=st;
    var bt='';if(pt.id==='ementa'&&sel)bt+=dkEmenta(sel.t.n);
    if(sel&&pt.id!=='acordao'&&!xFixo(pt.id,sel.t))bt+='<div class="cf"><button type="button" class="dact" data-xfora="'+esc(sel.t.k)+'">Retirar este bloco da peça</button></div>';
    $('#dcan-bot').innerHTML=bt+dkOutros(pt,sel&&sel.t);
  }else{
    $('#dcan-top').innerHTML=(KX.falhou&&DK.cx&&dkPron()!=='desp'?'<p class="cxnota">O construtor não carregou neste navegador; segue o modo Modelo.</p>':DK.cx&&!KX.ready&&dkPron()!=='desp'?'<p class="cxnota">Carregando o construtor do gabinete…</p>':DK.cx&&dkPron()==='desp'?'<p class="cxnota">Despacho segue os modelos do Modus Operandi.</p>':'')+(sel?dkCanTrecho(sel):dkCanPeca(PT,pt));
    $('#dcan-bot').innerHTML=dkOutros(pt,sel?sel.t:null);
    var tb=as.querySelector('[data-dtemp]');if(tb){if(DK.temp)['ci','pz','in','db'].forEach(function(k){var el=tb.querySelector('[data-dtc="'+k+'"]');if(k==='db')el.checked=!!DK.temp.db;else if(DK.temp[k])el.value=DK.temp[k];});dkTempCalc(tb);}
  }
  if(DK.cx)cxBoot();
  cxMostra();
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
  if(e.target.closest('[data-dpr]')){setTimeout(function(){cxSyncBar();xPagina();},0);}
},true);
$('#v-edit').addEventListener('change',function(e){var t=e.target;if(t.matches('[data-dcl],[data-djg],[data-xsrec]'))setTimeout(function(){cxSyncBar();xPagina();},0);});

/* ===== Canhoto refinado: ações do bloco, campos do bloco, apoios recolhíveis ===== */
function dkCampoRot(f){var ph=f.getAttribute('data-ph')||'',idf=f.classList.contains('idf');if(idf)return 'ID';if(ph&&ph!=='…'&&ph!=='...')return ph;
  var p=f.previousSibling,t='';while(p&&t.length<60){t=(p.textContent||'')+t;p=p.previousSibling;}t=t.replace(/\s+/g,' ').trim().split(' ').slice(-4).join(' ');return t?'após “'+t+'”':'Campo';}
function dkCampos(k){var B=document.querySelector('#x-main .xblk[data-xk="'+(window.CSS&&CSS.escape?CSS.escape(k):k)+'"]');if(!B)return '';var F=$$('.fill',B);if(!F.length)return '';
  var ids=F.filter(function(f){return f.classList.contains('idf');}),tx=F.filter(function(f){return !f.classList.contains('idf');});
  function inp(f){var v=f.textContent.trim(),au=f.classList.contains('auto');return '<label class="dfl'+(f.classList.contains('idf')?' id':'')+(au?' au':'')+'"><span>'+esc(dkCampoRot(f))+(au?' <i>automático</i>':'')+'</span><input data-dfk="'+esc(f.getAttribute('data-fk'))+'" value="'+esc(v)+'" placeholder="'+(f.classList.contains('idf')?'só números':'escreva aqui')+'"'+(f.classList.contains('idf')?' inputmode="numeric"':'')+'></label>';}
  return '<div class="cf"><div class="cfl">Campos do bloco <span class="pill">'+F.filter(function(f){return f.textContent.trim();}).length+' de '+F.length+'</span></div><div class="dfls">'+F.map(inp).join('')+'</div><p class="meta" style="margin:6px 0 0">Amarelo é texto do caso; azul é ID, que entra na peça ao copiar.</p></div>';}
function dkCanTrecho(sel){var t=sel.t,pt=sel.pt,E=escolha(t,XP.alt),ai=E.ai,h='',aj=dkAjuda(pt.id,t.n);
  h+='<div class="cvh"><div><p class="cvk">Bloco selecionado · '+esc(pt.t)+(t.opc?' · opcional':'')+'</p><p class="cvt">'+esc(t.n)+(aj?' <button type="button" class="dq" data-daj aria-pressed="'+!!DK.aj+'" title="Como preencher este bloco">?</button>':'')+'</p></div><button type="button" class="cvx" data-dsel="" title="Fechar o bloco" aria-label="Fechar o bloco">×</button></div>';
  if(aj&&DK.aj)h+=aj.replace('class="cf daj"','class="cf daj open"');
  if(t.alts.length>1){var nb=t.alts.filter(function(x){return !x.base;}).length,hb=nb&&nb<t.alts.length,vb=XP.vb[t.k]||(t.alts[ai]&&t.alts[ai].base);
    h+='<div class="cf"><div class="cfl">'+esc(t.n)+' <span class="pill">'+esc(E.a.lab||'')+'</span></div><div class="dpl">'+t.alts.map(function(x,i){if(x.base&&hb&&!vb)return '';return '<button type="button" data-xalt="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===ai)+'"'+(x.base?' class="b"':'')+'>'+esc(x.lab||('Versão '+(i+1)))+'</button>';}).join('')+(hb?'<button type="button" class="mais" data-xbase="'+esc(t.k)+'">'+(vb?'menos':'+ '+(t.alts.length-nb)+' da base')+'</button>':'')+'</div>'+
      (E.sub?'<div class="cfl" style="margin-top:10px">Variação</div><div class="dpl">'+E.sub.map(function(x,i){return '<button type="button" data-xsub="'+esc(t.k)+'" data-i="'+i+'" aria-pressed="'+(i===E.si)+'">'+esc(x.lab)+'</button>';}).join('')+'</div>':'')+'</div>';}
  h+=dkCampos(t.k);
  if(t.info)h+='<details class="cf dsec"><summary class="cfl">Tabela de referência</summary>'+xInfo(t.info)+'</details>';
  if(pt.id==='ementa')h+=dkEmenta(t.n);
  if((pt.id==='voto'&&/^(Abertura|Transição ao mérito)/.test(t.n))||(pt.id==='monocratica'&&/^(Marco decisório|Fundamentação)/.test(t.n)))
    h+=dkTemp().replace('<div class="cf" data-dtemp><div class="cfl">Tempestividade <span class="pill">cálculo</span></div>','<details class="cf dsec" data-dtemp'+(DK.op_temp?' open':'')+' data-dop="temp"><summary class="cfl">Tempestividade <span class="pill">cálculo</span></summary>').replace(/<\/div>$/,'</details>')+
       dkPrel().replace('<div class="cf"><div class="cfl">Admissibilidade e preliminares <span class="pill">'+DPREL.length+' parágrafos</span></div>','<details class="cf dsec"'+(DK.op_prel?' open':'')+' data-dop="prel"><summary class="cfl">Admissibilidade e preliminares <span class="pill">'+DPREL.length+'</span></summary>').replace(/<\/div>$/,'</details>');
  var ac=t.opc?'<button type="button" class="dact" data-xfecha="'+esc(t.k)+'">Recolher este bloco opcional</button>':(!xFixo(pt.id,t)?'<button type="button" class="dact" data-xfora="'+esc(t.k)+'">Retirar este bloco da peça</button>':'');
  if(ac||window.VDM_EDITOR)h+='<div class="cf dacts">'+ac+(window.VDM_EDITOR&&xBY()[t.pid]?'<button class="e-mini ed-in" data-edpec="'+esc(t.pid)+'">Editar esta peça</button>':'')+'</div>';
  return h;}
function dkCanPeca(PT,pt){var n=pt.tr.filter(function(t){return !t.opc&&!xSai(t,pt.tr,XP.alt,XP.fora);}).length,op=pt.tr.filter(function(t){return t.opc&&!XP.abre[t.k];}).length,fo=pt.tr.filter(function(t){return XP.fora[t.k];}).length;
  var F=$$('#x-main .fill'),ok=F.filter(function(f){return f.textContent.trim();}).length;
  var h='<div class="cvh"><div><p class="cvk">'+esc(XPECAS[XP.pc].t)+' · parte '+(PT.indexOf(pt)+1)+' de '+PT.length+'</p><p class="cvt">'+esc(pt.t)+'</p></div></div>';
  h+='<div class="cf"><div class="dkpi"><div><b>'+n+'</b><span>blocos</span></div><div><b>'+op+'</b><span>opcionais</span></div><div><b>'+ok+'/'+F.length+'</b><span>campos</span></div></div>'+(fo?'<p class="meta" style="margin:8px 0 0">'+fo+(fo>1?' blocos retirados':' bloco retirado')+'.</p>':'')+'</div>';
  if(pt.res)h+='<div class="cf"><p class="meta" style="margin:0">'+esc(pt.res)+'</p></div>';
  h+='<p class="meta" style="margin:10px 0 0">Clique num bloco da folha ou da lista abaixo para escolher a versão e preencher os campos dele.</p>';
  if(pt.ex)h+='<div class="cf"><button class="dbt" data-xex>Modelos-matriz de decisão monocrática →</button></div>';
  return h;}
$('#v-edit').addEventListener('click',function(e){var b;
  if((b=e.target.closest('[data-daj]'))){e.preventDefault();e.stopImmediatePropagation();DK.aj=!DK.aj;xPagina();return;}
  if((b=e.target.closest('details[data-dop]>summary'))){var d=b.parentNode;setTimeout(function(){DK['op_'+d.getAttribute('data-dop')]=d.open;},0);}
},true);
$('#v-edit').addEventListener('input',function(e){var t=e.target;if(!t.matches||!t.matches('[data-dfk]'))return;
  var f=document.querySelector('#x-main .fill[data-fk="'+(window.CSS&&CSS.escape?CSS.escape(t.getAttribute('data-dfk')):t.getAttribute('data-dfk'))+'"]');if(!f)return;
  f.textContent=t.value;f.dispatchEvent(new Event('input',{bubbles:true}));t.closest('.dfl').classList.remove('au');
  var c=t.closest('.cf'),P=c&&c.querySelector('.pill');if(P){var I=$$('[data-dfk]',c);P.textContent=I.filter(function(x){return x.value.trim();}).length+' de '+I.length;}});
$('#v-edit').addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.matches&&e.target.matches('[data-dfk]')){e.preventDefault();var I=$$('#x-aside [data-dfk]'),i=I.indexOf(e.target);if(I[i+1])I[i+1].focus();else e.target.blur();}});
/* resumo do bloco na lista: texto já preenchido da folha */
var _dkRes=dkResumo;dkResumo=function(t){if(XP.fora[t.k]||(t.opc&&!XP.abre[t.k])||t.alts.length>1)return _dkRes(t);var B=document.querySelector('#x-main .xblk[data-xk="'+(window.CSS&&CSS.escape?CSS.escape(t.k):t.k)+'"] .dbody');if(!B)return _dkRes(t);var c=B.cloneNode(true);$$('.ptg',c).forEach(function(x){x.remove();});$$('.fill',c).forEach(function(f){if(!f.textContent.trim())f.textContent='…';});var x=c.textContent.replace(/\s+/g,' ').trim();return x.length>34?x.slice(0,32)+'…':x;};
/* a folha avisa o canhoto quando um campo muda direto no texto */
document.addEventListener('input',function(e){var f=e.target.closest&&e.target.closest('#x-main .fill');if(!f)return;var I=document.querySelector('#x-aside [data-dfk="'+(window.CSS&&CSS.escape?CSS.escape(f.getAttribute('data-fk')):'')+'"]');if(I&&document.activeElement!==I)I.value=f.textContent.trim();});


/* ===== Editorial: Minuta-Matriz (com o banco de trechos ao fim) e Modelos ===== */
function xRender(){
  if(!ED){$('#x-main').innerHTML='<p class="empty">Dados do editorial indisponíveis.</p>';return;}
  var irBanco=XS.ed==='par';if(irBanco)XS.ed='pecas';
  var ed=XS.ed||'pecas';$$('#x-sub button').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-s')===ed));});
  var bk=$('#x-banco');
  dkVolta();
  if(ed==='dir'||ed==='consulta'){$('#x-wrap').hidden=true;if(bk)bk.hidden=true;if($('#e-layout').parentNode!==$('#v-ement'))layoutEm('#v-ement');
    var a=$('#x-alt');if(!a){a=document.createElement('div');a.id='x-alt';$('#v-edit').appendChild(a);}a.hidden=false;a.className='x-alt-'+ed;
    var el=ed==='dir'?$('#x-man'):$('#cq');if(el)a.appendChild(el);
    if(ed==='dir'){if(ED)xManual();else $('#x-man').innerHTML='<p class="empty">Dados do editorial indisponíveis.</p>';}else if(window.CQ_render)window.CQ_render();
    if(window.VDM_marcaNav)window.VDM_marcaNav();dkHead();return;}
  if(ed==='mod'){$('#x-wrap').hidden=true;if(bk)bk.hidden=true;layoutEm('#v-edit');EM.sub='mod';fecharIT();mostrar();dkHead();return;}
  XS.sub='estrutura';$('#x-wrap').hidden=false;
  if(!bk){bk=document.createElement('section');bk.id='x-banco';bk.setAttribute('aria-label','Banco de trechos');
    bk.innerHTML='<header class="bk-h"><p class="dkk">BANCO DE TRECHOS</p><h2>Parágrafos-padrão</h2><p>Trechos prontos por matéria e situação, com campos que se preenchem com o caso. Busque, abra e copie para a minuta.</p></header>';
    $('#v-edit').appendChild(bk);}
  bk.hidden=false;var L=$('#e-layout');if(L&&L.parentNode!==bk)bk.appendChild(L);
  EM.sub='par';fecharIT();mostrar();
  if(window.VDM_marcaNav)window.VDM_marcaNav();
  xPagina();
  if(irBanco)setTimeout(function(){bk.scrollIntoView({behavior:'smooth',block:'start'});},60);
  if(window.VDM_cnSync)setTimeout(window.VDM_cnSync,0);
}

/* Diretrizes e Consulta entram na navegação interna do Editorial: o conteúdo é levado para dentro da página e volta ao sair */
function dkVolta(){var m=$('#x-man'),c=$('#cq'),a=$('#x-alt');if(m&&a&&m.parentNode===a)$('#v-dir').appendChild(m);if(c&&a&&c.parentNode===a){var w=$('#v-consulta .cq-wrap')||$('#v-consulta');w.appendChild(c);}if(a)a.hidden=true;}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('.tab[data-v="dir"],.tab[data-v="consulta"]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();irEditorial(t.getAttribute('data-v'));},true);
document.addEventListener('cmt-acesso',function(){if(XS.ed==='dir'&&!$('#v-edit').hidden)setTimeout(function(){if(XS.ed==='dir')xManual();},1500);});

/* ===== Referenciais (acesso avançado): Enunciados, Repertório e Enciclopédia num só menu, com navegação interna como a do Editorial ===== */
(function(){
  var RV=['temas','rep','enc'],RI={temas:['01','Enunciados','AVANÇADO · ENUNCIADOS','Temas repetitivos, de repercussão geral e súmulas, com as teses e os usos no gabinete.'],
    rep:['02','Repertório','AVANÇADO · REPERTÓRIO','Jurisprudência, normas e Regimento citados nas peças do gabinete.'],
    enc:['03','Enciclopédia','AVANÇADO · ENCICLOPÉDIA','Recursos, guias práticos, rotina do gabinete, PJe, competência, matérias, léxico e Regimento.']};
  var ult='temas';
  var et=document.querySelector('.tab[data-v="edit"]');if(!et)return;var ancora=et.closest('.tabw')||et;
  var rt=document.createElement('button');rt.className='tab';rt.type='button';rt.setAttribute('role','tab');rt.setAttribute('data-v','refs');rt.setAttribute('data-av','');rt.setAttribute('aria-selected','false');rt.hidden=true;
  rt.innerHTML='Referenciais<span class="tab-cur"></span>';ancora.parentNode.insertBefore(rt,ancora.nextSibling);
  var hd=document.createElement('div');hd.className='pg-h dref';
  hd.innerHTML='<div class="sub pg-seg" role="tablist" aria-label="Referenciais">'+RV.map(function(v){return '<button type="button" data-rs="'+v+'" data-n="'+RI[v][0]+'" aria-selected="false">'+RI[v][1]+'</button>';}).join('')+'</div><div class="pg-t"><p class="dkk"></p><h1></h1><p class="dsc"></p></div>';
  function vis(){for(var i=0;i<RV.length;i++){var s=document.getElementById('v-'+RV[i]);if(s&&!s.hidden)return RV[i];}return '';}
  function sync(){var v=vis();rt.setAttribute('aria-selected',String(!!v));rt.querySelector('.tab-cur').textContent=v?RI[v][1]:'';
    if(!v)return;ult=v;document.body.classList.add('dsk');var s=document.getElementById('v-'+v);if(hd.parentNode!==s)s.insertBefore(hd,s.firstChild);
    $$('[data-rs]',hd).forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-rs')===v));});
    hd.querySelector('.dkk').textContent=RI[v][2];hd.querySelector('h1').textContent=RI[v][1];hd.querySelector('.dsc').textContent=RI[v][3];}
  function abre(v){var t=document.querySelector('.tab[data-v="'+v+'"]');if(t)t.click();setTimeout(sync,0);}
  rt.addEventListener('click',function(e){e.preventDefault();abre(vis()||ult);});
  hd.addEventListener('click',function(e){var b=e.target.closest('[data-rs]');if(!b)return;abre(b.getAttribute('data-rs'));window.scrollTo(0,0);});
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.tab,.tabw .dd button'))setTimeout(sync,0);});
  window.addEventListener('hashchange',function(){setTimeout(sync,50);});
  document.addEventListener('cmt-acesso',function(){setTimeout(sync,50);});
})();

/* ===== Diretrizes: manual de redação novo (diretrizes_manual.html), com Padrões decisórios só no acesso avançado ===== */
function dirAv(){try{return !!(window.CMT_ACESSO&&window.CMT_ACESSO().avancado);}catch(e){return false;}}
function xManual(){var M=$('#x-man');if(!M)return;var f=document.getElementById('dir-fr');
  if(!f||!M.contains(f)){var src=document.getElementById('dir-manual');if(!src){M.innerHTML='<p class="empty">Manual de redação indisponível.</p>';return;}
    M.innerHTML='<iframe id="dir-fr" title="Diretrizes · Manual de redação" scrolling="no"></iframe>';f=M.querySelector('#dir-fr');
    f.addEventListener('load',function(){dirPrep(f);});var h='';try{h=JSON.parse(src.textContent);}catch(e){}f.srcdoc=h;return;}
  dirPrep(f);}
function dirAjusta(f){try{var D=f.contentDocument;var h=Math.max(D.documentElement.scrollHeight,D.body.scrollHeight);if(Math.abs((parseInt(f.style.height)||0)-h)>2)f.style.height=h+'px';}catch(e){}}
function dirPrep(f){var D=f.contentDocument;if(!D||!D.body)return;
  D.documentElement.setAttribute('data-theme',document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light');
  var av=dirAv(),st=D.getElementById('dk-av');if(!st){st=D.createElement('style');st.id='dk-av';(D.head||D.documentElement).appendChild(st);}
  st.textContent='html,body{overflow:hidden!important;height:auto!important}.top{position:relative!important;top:auto!important}'+(av?'':'[data-abab="padroes"],[data-aba="padroes"]{display:none!important}');
  if(!av&&D.body.getAttribute('data-aba')==='padroes'){var mb=D.querySelector('[data-abab="manual"]');if(mb)mb.click();}
  var r=D.getElementById('mn-rap');if(r)r.innerHTML=rapHtml('');
  if(!D.__dk){D.__dk=1;
    D.addEventListener('click',function(e){var b=e.target.closest('[data-rapf],[data-rapadd],[data-rapinc],[data-rapsit],[data-rapdel]');if(!b)return;
      if(b.hasAttribute('data-rapf')){RAP.filtro=b.getAttribute('data-rapf');xManual();return;}
      if(b.hasAttribute('data-rapadd')){rapNovo();return;}
      var id=b.getAttribute('data-rapinc')||b.getAttribute('data-rapsit')||b.getAttribute('data-rapdel');
      if(b.hasAttribute('data-rapinc')){var dst=window.prompt('Onde foi incorporada? (ex.: Manual · Vocabulário, modelo, parágrafo)','');if(dst===null)return;rapMuda(id,function(n){n.situacao='incorporada';n.destino=dst.trim();},'Diretrizes: entrada rápida incorporada');return;}
      if(b.hasAttribute('data-rapsit')){rapMuda(id,function(n){n.situacao='nova';n.destino='';},'Diretrizes: entrada rápida reaberta');return;}
      if(b.hasAttribute('data-rapdel')){if(!window.confirm('Excluir esta entrada rápida?'))return;var x=rapAcha(id);if(!x)return;
        rapGrava([{op:'del',id:id,orig:rapJ(x)}],'Diretrizes: entrada rápida excluída',function(){var L=rapBase();L.splice(L.indexOf(rapAcha(id)),1);});}});
    D.addEventListener('input',function(e){if(e.target.matches('[data-raptxt]'))RAP.txt=e.target.value;else if(e.target.matches('[data-raporig]'))RAP.orig=e.target.value;});
    D.addEventListener('change',function(e){if(e.target.matches('[data-raptipo]'))RAP.tipo=e.target.value;});
    D.addEventListener('keydown',function(e){if(e.target.matches('[data-raptxt]')&&(e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();rapNovo();}});
    try{new (f.contentWindow.ResizeObserver||ResizeObserver)(function(){dirAjusta(f);}).observe(D.body);}catch(e){setInterval(function(){dirAjusta(f);},800);}}
  dirAjusta(f);}
document.addEventListener('cmt-acesso',function(){var f=document.getElementById('dir-fr');if(f)dirPrep(f);});
try{new MutationObserver(function(){var f=document.getElementById('dir-fr');if(f&&f.contentDocument)f.contentDocument.documentElement.setAttribute('data-theme',document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light');}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});}catch(e){}

/* ===== Navegação única do Modus Operandi, numa faixa abaixo do cabeçalho: sem "Editorial";
   abas comuns (Ementário · Padrão: Minuta-Matriz e Modelos · Diretrizes · Consulta) e abas do acesso avançado (Enunciados · Repertório · Enciclopédia) ===== */
(function(){var top=document.querySelector('header.top');if(!top)return;
  var IT=[['ement','Ementário'],['|'],['pecas','Minuta-Matriz','Padrão'],['mod','Modelos'],['|'],['dir','Diretrizes'],['consulta','Consulta'],['||'],['temas','Enunciados','Acesso avançado'],['rep','Repertório'],['enc','Enciclopédia']];
  var bar=document.createElement('nav');bar.id='cmp-nav';bar.setAttribute('aria-label','Seções do Modus Operandi');
  var h='<div class="cn-in">';IT.forEach(function(x){if(x[0]==='|'){h+='<span class="cn-sep" aria-hidden="true"></span>';return;}if(x[0]==='||'){h+='<span class="cn-sep av" data-av hidden aria-hidden="true"></span>';return;}
    var av=['temas','rep','enc'].indexOf(x[0])>=0;h+=(x[2]?'<span class="cn-g'+(av?' av':'')+'"'+(av?' data-av hidden':'')+'>'+x[2]+'</span>':'')+'<button type="button" class="cn-b" data-cn="'+x[0]+'"'+(av?' data-av hidden':'')+' aria-current="false">'+x[1]+'</button>';});
  bar.innerHTML=h+'</div>';top.parentNode.insertBefore(bar,top.nextSibling);document.body.classList.add('cmp-nav-fora');
  function aba(v){var t=document.querySelector('.tab[data-v="'+v+'"]');if(t)t.click();}
  function atual(){var vs=function(id){var e=document.getElementById(id);return e&&!e.hidden;};if(vs('v-ement'))return 'ement';if(vs('v-edit'))return XS.ed==='par'?'pecas':(XS.ed||'pecas');
    var r=['temas','rep','enc'].filter(function(v){return vs('v-'+v);})[0];return r||'';}
  function sync(){var a=atual();$$('.cn-b',bar).forEach(function(b){b.setAttribute('aria-current',String(b.getAttribute('data-cn')===a));});}
  bar.addEventListener('click',function(e){var b=e.target.closest('.cn-b');if(!b)return;var v=b.getAttribute('data-cn');
    if(v==='ement')aba('ement');else if(['temas','rep','enc'].indexOf(v)>=0)aba(v);else irEditorial(v);setTimeout(sync,0);window.scrollTo(0,0);});
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
