/* Muta · ficha completa do prontuário (base: muta-independente-prontuario-completo)
   Ajustes da extensão: textos de aviso, confirmações no painel e gravação por processo (via prontuario.js). */
(function(){
'use strict';
var host=document.getElementById('prontuario-app'),bridge=window.MutaProntuarioBridge;
if(!host||!bridge)return;
var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);});};
var full=bridge.getFullSanitized(bridge.getFull()),timer=null,lastSaved=JSON.stringify(full);
var KIND={apel:'Apelação',rn:'Remessa necessária',ed:'Embargos de declaração',agint:'Agravo interno',jr:'Juízo de retratação',ai:'Agravo de instrumento'};
var ORDER=['apel','rn','ed','agint','jr','ai'];
var RESULT={
  apel:['Dar provimento','Dar parcial provimento','Negar provimento','Não conhecer','Anular a sentença','Extinguir sem resolução do mérito','Prejudicado'],
  rn:['Dar provimento à remessa','Dar parcial provimento à remessa','Negar provimento à remessa','Não conhecer da remessa (dispensa)'],
  ed:['Rejeitar','Acolher sem efeitos infringentes','Acolher com efeitos infringentes','Acolher em parte','Não conhecer'],
  agint:['Negar provimento','Dar provimento','Dar parcial provimento','Não conhecer','Prejudicado (retratação do relator)'],
  jr:['Exercer a retratação','Retratação parcial','Manter o acórdão'],
  ai:['Dar provimento','Dar parcial provimento','Negar provimento','Não conhecer','Prejudicado (perda do objeto)']
};
var FEES={
  apel:['Majorar (art. 85, § 11, CPC)','Manter','Inverter','Fixar','Redistribuir','Sem honorários recursais','Não se aplica'],
  rn:['Manter','Redistribuir','Inverter'],
  ed:['Sem honorários recursais','Readequar (efeitos infringentes)'],
  agint:['Sem majoração','Readequar (se provido)'],
  jr:['Manter','Readequar à retratação'],
  ai:['Sem honorários recursais','Majorar (se a decisão agravada fixou)']
};
var PENALTY={ed:['Sem multa','Protelatórios · até 2% (art. 1.026, § 2º)','Reiteração · até 10% (§ 3º)'],agint:['Sem multa','Art. 1.021, § 4º · 1% a 5%']};
var DIRECTED_COMMON={
  regularidade:[
    ['gen.temp','O recurso é tempestivo?','A resposta atualiza o campo Tempestividade. Confira o termo inicial e a calculadora antes de registrar.'],
    ['gen.prep','Há preparo regular ou hipótese de dispensa?','A resposta atualiza Preparo apenas quando o campo está vazio; confirme a guia ou a dispensa aplicável.'],
    ['gen.repr','A representação processual é regular?','A resposta atualiza o campo de Representação quando ainda não há conclusão registrada.'],
    ['gen.proc','Há procuração ou documento de representação válido nos autos?','A resposta registra a conferência sem inventar o ID. O número do documento permanece como dado a preencher.'],
    ['gen.imp','O julgador está livre de impedimento ou suspeição?','A resposta atualiza o campo Impedimento / Suspeição; individualize eventual óbice.'],
    ['com.admiss','Os requisitos de admissibilidade relevantes foram conferidos?','A resposta completa somente campos de regularidade vazios; confira cada conclusão nos autos.']
  ],
  origem:[
    ['gen.origem','A decisão de origem/impugnada está devidamente identificada?','Confira o tipo da decisão e, quando aplicável, o ID e a data do documento.'],
    ['com.questao','A questão em julgamento está delimitada?','Delimite em uma frase o que precisa ser decidido nesta sessão. O texto-base deve ser conferido e completado com os autos.']
  ],
  recursos:[
    ['gen.rec','Os recursos, contrarrazões e peças relevantes estão integralmente registrados?','Confira cada recurso, manifestação e peça pertinente ao julgamento.'],
    ['gen.mpf','A situação do MPF está definida para este caso?','Confira a necessidade de intervenção, a existência do parecer e seu sentido nos autos.'],
    ['com.fund','Os fundamentos relevantes foram identificados?','Considere alegações, preliminares e pontos que podem alterar o resultado e precisam ser enfrentados.']
  ],
  julgamento:[
    ['gen.result','O resultado do voto está definido?','A resposta registra a conferência sem alterar o resultado escolhido no campo.'],
    ['gen.hon','Honorários e consectários aplicáveis foram conferidos?','Considere resultado, sucumbência e consectários pertinentes à espécie.'],
    ['gen.disp','Fundamentação e dispositivo estão coerentes?','Confira conhecimento, conclusão, resultado do voto e redação do dispositivo.'],
    ['com.aplic','A subsunção da questão está concluída?','Relacione norma ou precedente, fatos e provas e a conclusão para a questão em julgamento.']
  ]
};
var DIRECTED_SPEC={
  apel:{
    regularidade:[['apel.dial','As razões enfrentam os fundamentos da sentença?','Verifique dialeticidade e delimite eventual não conhecimento.'],['apel.inov','Há inovação recursal relevante?','Distinguir matéria nova de questões cognoscíveis de ofício e hipóteses legais.']],
    origem:[['com.questao','O fundamento decisivo da sentença está identificado?','Identifique o fundamento que sustenta a conclusão impugnada.']],
    recursos:[['com.fund','As questões devolvidas pelo recurso estão delimitadas?','Enumere as questões efetivamente devolvidas e as preliminares.']],
    julgamento:[['com.aplic','Cada questão recebeu subsunção e conclusão próprias?','Para cada questão: norma ou precedente, fatos e provas, conclusão.']]
  },
  ai:{
    regularidade:[['ai.cab','O agravo de instrumento é cabível?','Verifique o artigo 1.015 do CPC ou a urgência que torna inútil aguardar a apelação (Tema 988/STJ).']],
    origem:[['com.questao','O objeto da decisão agravada está delimitado?','Identifique a providência deferida, indeferida ou determinada na origem.']],
    recursos:[['com.fund','Os limites devolvidos pelo agravo estão definidos?','Delimite matéria impugnada, tutela recursal e efeito suspensivo, sem antecipar o mérito da causa.']],
    julgamento:[['ai.super','Há fato superveniente que interfere no julgamento?','Verifique sentença, perda do objeto ou outro fato posterior relevante.']]
  },
  agint:{
    regularidade:[['agint.imp','Há impugnação específica da decisão monocrática?','Confronte as razões com cada fundamento autônomo da decisão agravada (artigo 1.021, § 1º, do CPC).']],
    origem:[['com.questao','O fundamento determinante da decisão agravada está identificado?','Registre qual fundamento sustentou a decisão monocrática.']],
    recursos:[['com.fund','As razões do agravo foram confrontadas com a decisão?','Indique os argumentos que pedem retratação ou reforma.']],
    julgamento:[['agint.ret','Há razão para retratação?','Registre a conclusão do relator antes do julgamento pela Turma.']]
  },
  ed:{
    regularidade:[['ed.vicio','Há vício integrativo no acórdão?','Examine omissão, contradição, obscuridade ou erro material; não confunda com mera rediscussão.']],
    origem:[['com.questao','O ponto embargado está precisamente delimitado?','Identifique o fundamento ou a conclusão do acórdão questionado.']],
    recursos:[['com.fund','A insurgência é integrativa, e não mera rediscussão?','Sintetize a alegação do embargante e a resposta necessária.']],
    julgamento:[['ed.mod','O reconhecimento do vício altera o resultado?','Responder depois de definido se existe vício integrativo.']]
  },
  rn:{
    regularidade:[['rn.suj','A sentença está sujeita à remessa necessária?','Confira hipóteses e dispensas do artigo 496 do CPC, inclusive limites de valor e precedentes aplicáveis.']],
    origem:[['com.questao','Os capítulos sujeitos ao reexame estão delimitados?','Indique quais capítulos da sentença estão efetivamente submetidos ao reexame.']],
    recursos:[['com.fund','Existe apelação concomitante a compatibilizar com a remessa?','Se houver apelação, delimite a sobreposição entre recurso e remessa.']],
    julgamento:[['com.aplic','Os limites do reexame foram respeitados?','Conclua sem agravar a situação da Fazenda (Súmula 45/STJ).']]
  },
  jr:{
    regularidade:[['jr.tema','O precedente vinculante aplicável foi corretamente identificado?','Registre o tema e o tribunal que motivaram a devolução para eventual retratação.']],
    origem:[['com.questao','A tese vinculante foi delimitada?','Formule a tese que deve ser confrontada com o acórdão.']],
    recursos:[['com.fund','O acórdão foi confrontado com a tese?','Indique onde há compatibilidade ou divergência em relação ao precedente.']],
    julgamento:[['jr.comp','A compatibilidade do acórdão com a tese foi definida?','Registre se o acórdão deve ser mantido ou submetido à retratação, e em qual extensão.']]
  }
};
var PM_POS={
  admiss:'regularidade',prelim:'regularidade',trans:'origem',contro:'origem',
  relat:'recursos',fatos:'recursos',provas:'recursos',
  jurid:'julgamento',aplic:'julgamento',concl:'julgamento',consec:'julgamento',
  honor:'julgamento',complem:'julgamento',disp:'julgamento',ementa:'julgamento',
  acord:'julgamento',revis:'julgamento'
};
var PM_GUIDE={
  mestre:[
    [6,'prelim','Algum tema afetado manda suspender este grau?','Ler o alcance da ordem de suspensão na decisão de afetação: muitas alcançam apenas REsp e AREsp na Vice-Presidência ou no Superior Tribunal de Justiça, o que não impede o julgamento da apelação.'],
    [15,'aplic','O caso se amolda à tese ou exige distinção?','Afastar precedente invocado pela parte exige demonstrar a distinção ou a superação (artigo 489, § 1º, VI, do CPC).'],
    [18,'consec','A reforma altera sucumbência, juros ou correção?','Consectários só quando há condenação; inverter ou redistribuir a sucumbência quando o resultado muda.']
  ],
  apc:[
    [0,'admiss','Efeito suspensivo: regra ou exceção?','Regra do artigo 1.012 do CPC; exceções do § 1º; pedido autônomo ao Tribunal conforme o § 3º. Examinado o mérito, o pedido fica prejudicado.'],
    [1,'prelim','Interlocutórias não agraváveis devolvidas em preliminar?','Suscitadas em preliminar de apelação ou em contrarrazões (artigo 1.009, § 1º, do CPC).']
  ],
  ai:[
    [0,'admiss','Cabimento: rol do artigo 1.015 do CPC ou urgência?','Taxatividade mitigada quando a espera pela apelação tornaria inútil o exame (Tema 988/STJ).'],
    [1,'admiss','Peças e comunicações em ordem?','Artigo 1.017 do CPC (instrução) e artigo 1.018 do CPC (comunicação ao juízo, nos autos físicos).'],
    [2,'prelim','Pedido de efeito suspensivo ou de tutela recursal?','Probabilidade do direito e perigo de dano (artigos 300 e 1.019, I, do CPC). Requisitos cumulativos: ausente um, fica prejudicado o outro.'],
    [3,'aplic','O exame ficou nos limites da decisão agravada?','Efeito restrito à matéria impugnada: não antecipar o mérito da causa; reexaminar os pressupostos da interlocutória.'],
    [4,'complem','Sobreveio sentença?','Perda superveniente do objeto do agravo.'],
    [5,'honor','Honorários a tratar?','Em regra, são tratados na ação originária; majorar somente se a decisão agravada os fixou.']
  ],
  ain:[
    [1,'prelim','Juízo de retratação considerado?','O relator pode retratar-se antes de levar o recurso à Turma.'],
    [2,'admiss','Impugnação específica da decisão monocrática?','Artigo 1.021, § 1º, do CPC; Súmula 182/STJ.'],
    [4,'complem','Multa por agravo manifestamente inadmissível ou improcedente?','Exige votação unânime (artigo 1.021, § 4º, do CPC). Distinção ou superação fundamentadamente alegada afasta a multa (Tema 1.201/STJ, item 2); alegação genérica não.']
  ],
  ed:[
    [1,'admiss','Prazo de cinco dias e vício apontado?','Omissão, contradição, obscuridade ou erro material (artigo 1.022 do CPC).'],
    [2,'aplic','Vício real ou rediscussão?','Rediscussão do mérito não é omissão. Demonstrar, ponto a ponto, onde o acórdão tratou da matéria.'],
    [3,'complem','Prequestionamento ficto registrado?','Artigo 1.025 do CPC. Atenção à forma correta: “com os apontamentos destacados”.'],
    [4,'complem','Efeitos infringentes?','Intimar o embargado antes (artigo 1.023, § 2º, do CPC).'],
    [5,'complem','Embargos protelatórios?','Multa (artigo 1.026, § 2º, do CPC); embargos com notório propósito de prequestionamento não são protelatórios (Súmula 98/STJ).']
  ],
  rn:[
    [0,'admiss','A sentença está sujeita ao reexame?','Hipóteses e dispensas do artigo 496 do CPC (valor, súmula, repetitivo, orientação administrativa). Previdenciário com condenação aferível por simples cálculo abaixo do limite do § 3º, I: remessa dispensada (Tema 1.081/STJ).'],
    [1,'aplic','Reexame sem agravar a Fazenda?','Súmula 45/STJ.']
  ],
  mono:[
    [1,'admiss','Fundamento legal da via singular expresso?','Citar o inciso do artigo 932 do CPC e o precedente que autoriza o julgamento monocrático.']
  ]
};
var PM_GUIDE_KIND={apel:'apc',ai:'ai',agint:'ain',ed:'ed',rn:'rn',jr:'mono'};
var PM_GUIDE_TITLE={mestre:'Roteiro-mestre',apc:'Apelação cível',ai:'Agravo de instrumento',ain:'Agravo interno',ed:'Embargos de declaração',rn:'Remessa necessária',mono:'Decisão monocrática'};
var PANEL_TITLE={regularidade:'Regularidade',origem:'Processo e origem',recursos:'Recursos e peças',julgamento:'Julgamento'};
function pmPanel(pos){return PM_POS[pos]||'julgamento';}
function panelGuideQuestions(panel,k){
  var out=[],common=DIRECTED_COMMON[panel]||[],specific=((DIRECTED_SPEC[k]||{})[panel]||[]);
  var specificRules=specific.map(function(x){return x[0];});
  common.filter(function(x){
    if(x[0]==='gen.temp'&&['jr','rn'].includes(k))return false;
    if(x[0]==='gen.prep'&&['ed','agint','jr','rn'].includes(k))return false;
    return !specificRules.includes(x[0]);
  }).forEach(function(x){out.push({rule:x[0],q:x[1],tip:x[2],source:'dir'});});
  specific.forEach(function(x){out.push({rule:x[0],q:x[1],tip:x[2],source:'dir'});});
  var master=(PM_GUIDE.mestre||[]).filter(function(x){return pmPanel(x[1])===panel;});
  master.forEach(function(x){out.push({rule:'pm:mestre:'+x[0],q:x[2],tip:x[3],source:'pm',position:x[1],title:PM_GUIDE_TITLE.mestre});});
  var spec=PM_GUIDE_KIND[k],steps=spec?PM_GUIDE[spec]||[]:[];
  steps.filter(function(x){return pmPanel(x[1])===panel;}).forEach(function(x){out.push({rule:'pm:'+spec+':'+x[0],q:x[2],tip:x[3],source:'pm',position:x[1],title:PM_GUIDE_TITLE[spec]});});
  return out.filter(function(x,i,a){return a.findIndex(function(y){return y.rule===x.rule;})===i;});
}
var norm=function(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();};
var localDate=function(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
var displayDate=function(v){return v&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):'—';};
var get=function(path){return path.split('.').reduce(function(o,k){return o==null?undefined:o[k];},full);};
var set=function(path,value){var a=path.split('.'),o=full;for(var i=0;i<a.length-1;i++){if(o[a[i]]==null)o[a[i]]= /^\d+$/.test(a[i+1])?[]:{};o=o[a[i]];}o[a[a.length-1]]=value;};
var has=function(v){return typeof v==='boolean'?v:String(v==null?'':v).trim()!==''&&v!=='—';};
var field=function(path,label,placeholder,type,cls){
  var v=get(path),val=esc(v||''),p=placeholder?` placeholder="${esc(placeholder)}"`:'';
  return `<div class="pf-field ${cls||''}" data-field="${esc(path)}"><label>${esc(label)}</label><input type="${type||'text'}" data-path="${esc(path)}" value="${val}"${p}></div>`;
};
var area=function(path,label,placeholder,cls){
  return `<div class="pf-field ${cls||''}" data-field="${esc(path)}"><label>${esc(label)}</label><textarea data-path="${esc(path)}" placeholder="${esc(placeholder||'')}">${esc(get(path)||'')}</textarea></div>`;
};
var select=function(path,label,options,cls){
  var value=String(get(path)||'');
  var list=options.length&&Array.isArray(options[0])&&String(options[0][0])===''?options:[['','—']].concat(options);
  return `<div class="pf-field ${cls||''}" data-field="${esc(path)}"><label>${esc(label)}</label><select data-path="${esc(path)}">${list.map(function(o){var v=Array.isArray(o)?o[0]:o,t=Array.isArray(o)?o[1]:o;return `<option value="${esc(v)}"${value===String(v)?' selected':''}>${esc(t)}</option>`;}).join('')}</select></div>`;
};
var check=function(path,label){
  return `<div class="pf-field" data-field="${esc(path)}"><label class="pf-check"><input type="checkbox" data-path="${esc(path)}"${get(path)?' checked':''}>${esc(label)}</label></div>`;
};
var group=function(n,title,id,body){
  return `<details class="card pf-card" data-group="${id}" open><summary><span class="pf-num">${n}</span><h2>${title}</h2><span class="pf-count" data-count="${id}">0/0</span></summary><div class="pf-body">${body}</div></details>`;
};
function detectKind(){
  var text=norm([full.caso.classe,full.caso.etiquetas,full.caso.subassunto].join(' '));
  if(/embargos? de declaracao|\bed\b/.test(text))return'ed';
  if(/agravo interno|\bagint\b/.test(text))return'agint';
  if(/juizo de retratacao|retratat|recurso especial.*devol|\bjr\b/.test(text))return'jr';
  if(/agravo de instrumento|\bai\b/.test(text))return'ai';
  if(/remessa necessaria|reexame necessario|\brn\b/.test(text))return'rn';
  return'apel';
}
function kind(){return ORDER.indexOf(full.caso.tipoManual)>-1?full.caso.tipoManual:detectKind();}
function optionList(values,current,emptyLabel){
  var list=[['',emptyLabel||'—']].concat(values.map(function(x){return Array.isArray(x)?x:[x,x];}));
  return list.map(function(o){return `<option value="${esc(o[0])}"${String(current||'')===String(o[0])?' selected':''}>${esc(o[1])}</option>`;}).join('');
}
function resourceHTML(r,i){
  var response=/embargos/i.test(r.especie||'')?'Manifestação da parte embargada':/agravo/i.test(r.especie||'')?'Contraminuta':'Contrarrazões';
  var status=r.contra&&r.contra.situacao||'';
  return `<div class="pf-resource"><div class="pf-res-h">Recurso ${i+1}<button type="button" class="pf-edit-only" data-action="remove-resource" data-index="${i}" aria-label="Remover recurso">×</button></div>
  <div class="pf-grid">
  <div class="pf-field"><label>Parte recorrente</label><select data-path="recursos.${i}.parte">${optionList(['Parte autora','Parte ré','União','INSS','Fazenda Nacional','Ambas','custom'],r.parte,'—')}</select></div>
  <div class="pf-field"><label>Espécie do recurso</label><select data-path="recursos.${i}.especie">${optionList(['Apelação','Apelação adesiva','Remessa necessária','Agravo de instrumento','Agravo interno','Embargos de declaração','Recurso especial / extraordinário (retratação)','Recurso ordinário','Outro'],r.especie,'—')}</select></div>
  ${field(`recursos.${i}.data`,'Data do recurso','','date')}
  ${field(`recursos.${i}.ids`,'ID(s) do recurso','+ ID')}
  ${r.parte==='custom'?field(`recursos.${i}.parteCustom`,'Nome da parte','Identifique a parte'):''}
  <div class="pf-field"><label>Sem ID</label><label class="pf-check"><input type="checkbox" data-path="recursos.${i}.semId"${r.semId?' checked':''}>Recurso sem ID</label></div>
  <div class="pf-field"><label>${esc(response)} · situação</label><select data-path="recursos.${i}.contra.situacao">${optionList([['intimada','Intimada para responder'],['prazo','Prazo em curso'],['apresentadas','Apresentada'],['nao','Não apresentada'],['dispensada','Dispensada / não se aplica'],['omitir','Não mencionar no relatório']],status,'—')}</select></div>
  ${field(`recursos.${i}.contra.data`,'Data da resposta','','date')}
  ${field(`recursos.${i}.contra.ids`,'ID(s) da resposta','+ ID')}
  <div class="pf-field"><label>Sem ID</label><label class="pf-check"><input type="checkbox" data-path="recursos.${i}.contra.semId"${r.contra&&r.contra.semId?' checked':''}>Resposta sem ID</label></div></div></div>`;
}
function pieceHTML(p,i){
  return `<div class="pf-resource"><div class="pf-res-h">Peça ${i+1}<button type="button" class="pf-edit-only" data-action="remove-piece" data-index="${i}" aria-label="Remover peça">×</button></div><div class="pf-grid">
  ${field(`pecas.${i}.tipo`,'Tipo','Ex.: procuração, mídia, certidão')}
  ${field(`pecas.${i}.id`,'ID','ID do documento')}
  ${field(`pecas.${i}.data`,'Data','','date')}
  ${field(`pecas.${i}.descricao`,'Descrição','Resumo curto','text','full')}
  </div></div>`;
}
function kindPanel(k){
  var t='recursoTipo.';
  if(k==='rn')return `<div class="pf-grid">${select(t+'rnInciso','Hipótese (art. 496)',['I · contra ente público','II · procedência de embargos à execução fiscal'])}${field(t+'rnValor','Proveito econômico','R$ 0,00 · limite de dispensa')}</div>`;
  if(k==='ed')return `<div class="pf-grid">${field(t+'edId','Acórdão embargado · ID','ID do acórdão')}${field(t+'edData','Data do acórdão','','date')}${field(t+'edOrgao','Órgão julgador','Turma')}${field(t+'edVicios','Vício(s) apontado(s)','omissão, contradição, obscuridade ou erro material')}${area(t+'edPonto','Ponto dos embargos','Ponto omitido, contraditório ou obscuro','full')}</div>`;
  if(k==='agint')return `<div class="pf-grid">${field(t+'agintId','Decisão agravada · ID','ID da decisão')}${field(t+'agintData','Data da decisão','','date')}${area(t+'agintSintese','O que decidiu · a partir do verbo','Síntese da decisão agravada','full')}${area(t+'agintFundamentos','Fundamentos do agravo','Argumentos dirigidos contra a decisão','full')}</div>`;
  if(k==='jr')return `<div class="pf-grid">${field(t+'jrId','Acórdão submetido · ID','ID do acórdão')}${field(t+'jrData','Data do acórdão','','date')}${field(t+'jrPrecedente','Precedente · tema','Tema ou precedente qualificado')}${field(t+'jrTribunal','Tribunal · devolução','STF, STJ etc.')}${field(t+'jrDevolucaoId','ID da devolução','ID do documento')}${field(t+'jrDevolucaoMes','Mês da devolução','julho/2026')}${select(t+'jrEd','Embargos ao acórdão',['Não houve','Opostos e rejeitados','Opostos e acolhidos','Parcialmente acolhidos','Não conhecidos'])}${area(t+'jrQuestao','Questão submetida · com o artigo','Questão a reapreciar','full')}</div>`;
  if(k==='ai')return `<div class="pf-grid">${field(t+'aiId','Decisão agravada · ID','ID da decisão')}${field(t+'aiData','Data da decisão','','date')}${select(t+'aiInciso','Hipótese (art. 1.015)',['I · tutela provisória','II · mérito do processo','VI · exibição de documento','IX · intervenção de terceiros','par. único · execução / cumprimento','Tema 988 · urgência (taxatividade mitigada)'])}${select(t+'aiEfeito','Efeito suspensivo / tutela recursal',['Não requerido','Deferido','Indeferido','Pendente de análise'])}</div>`;
  return `<p class="pf-hint">Registre os documentos e respostas do recurso nos itens acima. A apelação permite vincular remessa necessária no julgamento.</p>`;
}
function deadline(){
  var k=kind(),days=({apel:15,ai:15,agint:15,ed:5,rn:0,jr:0})[k]||0;
  if(!days)return 'Sem prazo recursal próprio para esta espécie.';
  var publicParty=/uniao|inss|fazenda|autarquia|municip|estado|instituto nacional|fazenda nacional/.test(norm(full.caso.autor+' '+full.caso.reu));
  var doubled=publicParty||full.regularidade.dpu,finalDays=days*(doubled?2:1),iso=full.regularidade.intimacao;
  if(!iso)return finalDays+' dias úteis'+(doubled?' · em dobro':'')+' · informe a data da intimação.';
  var d=new Date(iso+'T12:00:00');if(isNaN(d.getTime()))return 'Data de intimação inválida.';
  var n=0;while(n<finalDays){d.setDate(d.getDate()+1);if(d.getDay()!==0&&d.getDay()!==6)n++;}
  return finalDays+' dias úteis'+(doubled?' · em dobro':'')+' · termo final estimado '+d.toLocaleDateString('pt-BR')+' (sem calendário local de feriados).';
}
function updateProgress(){
  host.querySelectorAll('[data-group]').forEach(function(g){
    var fields=[].slice.call(g.querySelectorAll('.pf-field [data-path]')).filter(function(el){var typePanel=el.closest('[data-kind-panel]');return !typePanel||!typePanel.hidden;}),n=fields.filter(function(el){return has(el.type==='checkbox'?el.checked:el.value);}).length;
    var badge=g.querySelector('[data-count]');if(badge){badge.textContent=n+'/'+fields.length;badge.classList.toggle('complete',fields.length>0&&n===fields.length);}
  });
  var cards=[].slice.call(host.querySelectorAll('[data-guide-item]')),answered=cards.filter(function(card){var a=full.roteiro[card.dataset.guideKey];return a&&a.status;}).length;
  var guide=host.querySelector('#pf-guide-count');if(guide)guide.textContent=answered+'/'+cards.length+' perguntas respondidas';
  var pending=host.querySelector('#pf-guide-pending');
  if(pending){var unresolved=cards.filter(function(card){var a=full.roteiro[card.dataset.guideKey];return a&&a.status==='Não';});
    pending.innerHTML=unresolved.length?'<strong>'+unresolved.length+' ponto(s) para revisar</strong><ul>'+unresolved.map(function(card){return '<li>'+esc(card.querySelector('strong')?.textContent||'Questão do roteiro')+'</li>';}).join('')+'</ul>':'<span>Nenhuma pendência marcada como “Não”. Respostas não substituem a conferência dos autos.</span>';}
  host.querySelectorAll('.pf-field').forEach(function(w){var f=w.querySelector('[data-path]');if(f)w.classList.toggle('pf-empty',!has(f.type==='checkbox'?f.checked:f.value));});
  var links=bridge.getLinks()||[],lb=host.querySelector('#pf-link-count');if(lb)lb.textContent=String(links.length);
  var linkList=host.querySelector('#pf-links');if(linkList)linkList.innerHTML=links.length?links.map(function(x,i){return `<div><span class="mono">${esc(x.n||x.id)}</span><span>${esc([x.cl,x.d].filter(Boolean).join(' · '))}</span><button type="button" data-action="remove-link" data-index="${i}" class="pf-edit-only">Desvincular</button></div>`;}).join(''):'<span class="pf-hint">Nenhum precedente vinculado. Pesquise no Ementário e use “Vincular ao prontuário”.</span>';
}
function updateComputed(){
  var k=kind(),deadlineEl=host.querySelector('#pf-deadline');if(deadlineEl)deadlineEl.textContent=deadline();
  var notice=host.querySelector('.pf-notice');if(notice){notice.classList.toggle('urgent',!!full.caso.urgente);notice.innerHTML=full.caso.urgente?'<strong>URGENTE · sinalização só neste navegador.</strong> O rascunho fica só neste navegador; nenhum aviso é enviado à Pauta ou à equipe. Confira os autos e as regras antes de usar.':'<strong>Rascunho pessoal.</strong> Fica só neste navegador, um por processo. Para a equipe ver, use “Enviar o rascunho à ficha” em Ficha do gabinete. Confira os autos e as regras antes de usar.';}
  host.querySelectorAll('[data-kind-panel]').forEach(function(el){el.hidden=el.dataset.kindPanel!==k;});
  var prep=host.querySelector('[data-path="regularidade.preparo"]'),typeExempt=['ed','agint','jr','rn'].includes(k),autoExempt=full.regularidade.dpu||full.regularidade.ajg,blocked=typeExempt||autoExempt;
  if(prep){prep.disabled=full.modo==='ficha'||blocked;if(typeExempt&&!autoExempt)prep.value='Não se Aplica';if(autoExempt)prep.value='Dispensado';if(autoExempt)prep.title='Dispensado automaticamente por AJG/DPU';else if(typeExempt)prep.title='Não se aplica a esta espécie';}
  (full.recursos||[]).forEach(function(r,i){
    var rid=host.querySelector('[data-path="recursos.'+i+'.ids"]'),rno=host.querySelector('[data-path="recursos.'+i+'.semId"]');
    var cid=host.querySelector('[data-path="recursos.'+i+'.contra.ids"]'),cdate=host.querySelector('[data-path="recursos.'+i+'.contra.data"]');
    var cno=host.querySelector('[data-path="recursos.'+i+'.contra.semId"]'),cs=String(r.contra&&r.contra.situacao||'');
    if(rid)rid.disabled=full.modo==='ficha'||!!r.semId;
    if(rno)rno.disabled=full.modo==='ficha';
    if(cid)cid.disabled=full.modo==='ficha'||!!(r.contra&&r.contra.semId)||cs!=='apresentadas';
    if(cdate)cdate.disabled=full.modo==='ficha'||cs!=='apresentadas';
    if(cno)cno.disabled=full.modo==='ficha'||cs!=='apresentadas';
  });
  var status=host.querySelector('#pf-majority-note');if(status){var message='';
    if(full.julgamento.votacao==='Por maioria')message=k==='apel'?'Apelação por maioria: aplicar a técnica do art. 942 do CPC.':k==='ai'?'No agravo de instrumento, art. 942 somente se a maioria reformar decisão parcial de mérito (§ 3º, II).':k==='rn'?'O art. 942 não se aplica à remessa necessária (§ 4º, II).':['ed','agint','jr'].includes(k)?'O art. 942 não se aplica a esta espécie (§ 4º).':'Confira a hipótese de cabimento do art. 942.';
    status.textContent=message;status.classList.toggle('on',!!message);}
  var remessa=host.querySelector('[data-path="julgamento.remessa"]');if(remessa){if(k==='rn'&&full.roteiro['rn.suj']?.status!=='Não')full.julgamento.remessa=true;remessa.disabled=full.modo==='ficha'||!['apel','rn'].includes(k);remessa.checked=!!full.julgamento.remessa;}
  if(deadlineEl)deadlineEl.classList.toggle('on',!!deadlineEl.textContent);
  var rule=host.querySelector('#pf-rule-note');if(rule)rule.textContent=k==='apel'&&full.julgamento.remessa?'A remessa necessária e a apelação devem aparecer no mesmo dispositivo; a remessa não gera honorários recursais.':k==='rn'?'A remessa não é recurso e não gera majoração de honorários recursais (art. 85, § 11, CPC).':k==='ed'?'Sem honorários recursais nos embargos; readequação somente se houver efeitos infringentes.':k==='agint'?'Sem majoração no agravo interno; readequação apenas se provido.':k==='ai'?'Honorários recursais no agravo de instrumento somente se já fixados na decisão agravada.':k==='jr'?'Compare o acórdão com a tese do tema; registre distinção ou retratação com fundamentação.':'';
  var result=host.querySelector('#pf-result');if(result){var options=['',...(RESULT[k]||[])];result.innerHTML=optionList(options.slice(1),full.julgamento.resultado,'—');}
  var fees=host.querySelector('#pf-fees');if(fees)fees.innerHTML=optionList(FEES[k]||[],full.julgamento.honorarios,'—');
  var penalty=host.querySelector('#pf-penalty-wrap'),pen=host.querySelector('#pf-penalty');if(penalty){var list=PENALTY[k]||[];penalty.hidden=!list.length;if(pen)pen.innerHTML=optionList(list,full.julgamento.multa,'—');}
  var kindLabel=host.querySelector('#pf-kind-label');if(kindLabel)kindLabel.textContent=(full.caso.tipoManual?KIND[k]+' · manual':KIND[k]+' · classe/etiquetas');
  var modeText=host.querySelector('#pf-mode-hint');if(modeText)modeText.textContent=full.modo==='ficha'?'Ficha de leitura · campos vazios ocultos':'Preencher · todos os campos disponíveis';
  host.classList.toggle('pf-read',full.modo==='ficha');
  host.querySelectorAll('[data-path]').forEach(function(el){
    if(full.modo==='ficha'){if(el.type==='checkbox'||el.tagName==='SELECT')el.disabled=true;else el.readOnly=true;}
    else if(el.dataset.path!=='regularidade.preparo'&&el.dataset.path!=='julgamento.remessa'){
      el.disabled=false;
      var m=el.dataset.path.match(/^recursos\.(\d+)\.(ids|semId|contra\.ids|contra\.data|contra\.semId)$/);
      if(m){var r=full.recursos[Number(m[1])]||{},contra=r.contra||{},status=String(contra.situacao||'');
        if(m[2]==='ids')el.disabled=!!r.semId;
        if(m[2]==='contra.ids')el.disabled=!!contra.semId||status!=='apresentadas';
        if(m[2]==='contra.data'||m[2]==='contra.semId')el.disabled=status!=='apresentadas';
      }
    }
  });
  var procuraId=host.querySelector('[data-path="regularidade.procuracaoId"]');if(procuraId)procuraId.disabled=full.modo==='ficha'||full.regularidade.procuracao!=='Conferida';
  host.querySelectorAll('[data-action]').forEach(function(el){el.disabled=full.modo==='ficha';});
  host.querySelectorAll('[data-q-answer],[data-conf]').forEach(function(el){el.disabled=full.modo==='ficha';});
  host.querySelectorAll('[data-q-note]').forEach(function(el){el.readOnly=full.modo==='ficha';});
  host.querySelectorAll('[data-guide-item]').forEach(function(card){var a=full.roteiro[card.dataset.guideKey];card.hidden=full.modo==='ficha'&&!(a&&a.status);});
  var flow=full.workflow||{},flowLabel=host.querySelector('#pf-flow-label'),flowDetail=host.querySelector('#pf-flow-detail');
  var current=flow.liberadoEm?'Liberado':flow.duvida?'Com dúvida':flow.devolutiva?'Devolvido para ajuste':flow.corrigidoEm?'Corrigido':flow.minutadoEm?'Minutado':'Sem minuta';
  if(flowLabel)flowLabel.textContent=current;
  if(flowDetail)flowDetail.textContent=flow.duvida?'Há dúvida pendente. A liberação fica bloqueada até resolver a dúvida.':flow.devolutiva?'A minuta voltou para ajuste. Marque como corrigida depois de concluir a revisão.':flow.corrigidoEm&&!flow.liberadoEm?'Correção registrada localmente. Libere quando estiver pronta para a sessão.':'As transições são locais; nenhuma mensagem é enviada ao relator ou à equipe.';
  var doubt=host.querySelector('[data-action="mark-doubt"]'),release=host.querySelector('[data-action="mark-released"]'),corrected=host.querySelector('[data-action="mark-corrected"]'),returned=host.querySelector('[data-action="mark-return"]');
  if(doubt)doubt.textContent=flow.duvida?'Resolver dúvida':'Registrar dúvida';
  if(release){release.disabled=full.modo==='ficha'||!(flow.minutadoEm&&flow.corrigidoEm&&!flow.duvida&&!flow.devolutiva);release.title=release.disabled?'Exige minuta e correção, sem dúvida ou devolutiva pendente.':'';}
  if(corrected)corrected.disabled=full.modo==='ficha'||!flow.minutadoEm;
  if(returned)returned.disabled=full.modo==='ficha'||!flow.minutadoEm;
  host.querySelectorAll('[data-pf-mode]').forEach(function(b){b.setAttribute('aria-selected',b.dataset.pfMode===full.modo?'true':'false');});
  host.querySelectorAll('[data-stage]').forEach(function(b){b.setAttribute('aria-selected',b.dataset.stage===full.etapa?'true':'false');});
  host.querySelectorAll('[data-stage-panel]').forEach(function(p){p.hidden=p.dataset.stagePanel!==full.etapa;});
  updateProgress();
}
function guideCard(q){
  var key=q.rule,a=full.roteiro[key]||{},status=a.status||'';
  var detail=q.tip?`<details><summary>Contexto da verificação</summary><p>${esc(q.tip)}</p></details>`:'';
  var source=q.source==='pm'?(q.title+' · '+(PM_POS[q.position]||q.position)):'Análise do processo';
  return `<article class="pf-question" data-guide-item data-guide-key="${esc(key)}"><strong>${esc(q.q)}</strong><span class="pf-guide-source">${esc(source)}</span>${detail}
    <div class="pf-qcontrols">${['Sim','Não'].map(function(v){return `<button type="button" data-q-key="${esc(key)}" data-q-answer="${v}"${q.source==='dir'?' data-q-rule="'+esc(q.rule)+'"':''} aria-pressed="${status===v}">${v}</button>`;}).join('')}</div>
    ${status?`<p class="pf-guide-result ${status==='Não'?'pending':''}"><b>${status}</b> · ${q.source==='dir'?esc(guideEffect(q.rule,status)):'resposta registrada na análise do caso.'}</p>`:''}
    <textarea data-q-note="${esc(key)}" placeholder="Registro do caso, fundamento, conclusão ou ID pertinente">${esc(a.note||'')}</textarea></article>`;
}
function guideEffect(rule,status){
  var yes=status==='Sim';
  var texts={
    'gen.temp':yes?'Registra Tempestivo no campo próprio.':'Registra Intempestivo no campo próprio.',
    'gen.prep':yes?'Completa Preparo somente se o campo ainda estava vazio.':'Marca Preparo para conferência, sem inventar guia ou valor.',
    'gen.repr':yes?'Registra Representação regular.':'Registra representação a conferir.',
    'gen.proc':yes?'Registra a conferência; o ID continua sendo preenchido manualmente.':'Marca procuração/documento como pendente.',
    'gen.imp':yes?'Registra ausência de impedimento ou suspeição.':'Marca impedimento para individualização.',
    'gen.origem':yes?'Registra a conferência da decisão-base.':'Marca a identificação da decisão-base como pendente.',
    'gen.rec':yes?'Registra a conferência de recursos e peças.':'Marca recursos e peças para completar.',
    'gen.mpf':yes?'Registra a conferência da situação do MPF.':'Marca a situação do MPF para conferir.',
    'gen.result':yes?'Registra a conferência e preserva o resultado já escolhido.':'Marca a definição do resultado como pendente.',
    'gen.hon':yes?'Registra a conferência de honorários e consectários.':'Marca honorários e consectários para revisar.',
    'gen.disp':yes?'Registra a conferência de coerência entre fundamentação e dispositivo.':'Marca a coerência do dispositivo para revisar.',
    'com.admiss':yes?'Limpa apenas a pendência gerada por esta verificação.':'Gera pendência para revisar requisitos de admissibilidade não cobertos pelos campos individuais.',
    'com.questao':yes?'Pode inserir uma formulação-base revisável da questão.':'Mantém a questão como ponto a delimitar.',
    'com.fund':yes?'Pode inserir uma nota-base para conferir alegações e peças.':'Marca os fundamentos relevantes como pendentes.',
    'com.aplic':yes?'Pode inserir uma nota-base de subsunção para revisar.':'Marca a subsunção como pendente.',
    'ed.vicio':yes?'Registra vício existente, ainda sujeito à delimitação.':'Registra vício inexistente.',
    'ed.mod':yes?'Registra possível efeito modificativo.':'Registra integração sem alteração do resultado.',
    'agint.imp':yes?'Registra impugnação específica presente.':'Registra possível óbice de dialeticidade.',
    'agint.ret':yes?'Registra conclusão favorável à retratação.':'Registra conclusão contrária à retratação.',
    'ai.cab':yes?'Registra cabimento a partir do artigo 1.015, sujeito a conferência.':'Registra possível não cabimento.',
    'ai.super':yes?'Abre registro de fato superveniente para delimitar efeitos.':'Registra que não foi identificado fato superveniente.',
    'jr.comp':yes?'Registra compatibilidade e orientação de manutenção.':'Registra divergência para exame de retratação.',
    'jr.tema':yes?'Confirma a conferência; o tema e o precedente ficam preenchidos manualmente.':'Marca a identificação do precedente como pendente.',
    'rn.suj':yes?'Ativa a indicação local de remessa necessária.':'Desativa a indicação local de remessa necessária.',
    'apel.dial':yes?'Registra ausência de óbice de dialeticidade identificado.':'Registra possível não conhecimento total ou parcial.',
    'apel.inov':yes?'Registra inovação para delimitar a parcela não cognoscível.':'Registra ausência de inovação recursal identificada.'
  };
  return texts[rule]||'Resposta registrada; confira os autos e os campos relacionados.';
}
function applyGuideRule(rule,status){
  var yes=status==='Sim',a=full.analise,k=kind(),regular=full.regularidade;
  function autoText(key,text){
    var autoKey=key+'Auto',current=a.comum[key],previous=a.comum[autoKey];
    if(!current||current===previous){a.comum[key]=text;a.comum[autoKey]=text;}
  }
  function pendingText(key,text){
    var autoKey=key+'Auto',current=a.comum[key],previous=a.comum[autoKey];
    if(!current||current===previous){a.comum[key]=text;a.comum[autoKey]=text;}
  }
  function clearGenerated(key){
    var autoKey=key+'Auto';
    if(a.comum[key]&&a.comum[key]===a.comum[autoKey])a.comum[key]='';
    a.comum[autoKey]='';
  }
  if(rule==='gen.temp')regular.tempestividade=yes?'Tempestivo':'Intempestivo';
  else if(rule==='gen.prep'){if(yes){if(!regular.preparo||regular.preparo==='—')regular.preparo='Comprovado';}else if(!regular.preparo||regular.preparo==='—')regular.preparo='A conferir';}
  else if(rule==='gen.repr')regular.representacao=yes?'Regular':'A conferir';
  else if(rule==='gen.proc')regular.procuracao=yes?'Conferida':'Pendente';
  else if(rule==='gen.imp'){if(yes){if(!regular.impedimento)regular.impedimento='Sem impedimento';}else if(!regular.impedimento||regular.impedimento==='Sem impedimento')regular.impedimento='Impedimento';}
  else if(rule==='gen.origem')a.comum.origem=yes?'Conferida':'Pendente';
  else if(rule==='gen.rec')a.comum.recursos=yes?'Conferidos':'Pendente';
  else if(rule==='gen.mpf')a.comum.mpf=yes?'Conferido':'Pendente';
  else if(rule==='gen.result')a.comum.resultado=yes?'Conferido':'Pendente';
  else if(rule==='gen.hon')a.comum.honorarios=yes?'Conferidos':'Pendente';
  else if(rule==='gen.disp')a.comum.dispositivo=yes?'Conferido':'Pendente';
  else if(rule==='com.admiss'){
    if(yes&&(/^Pendência de admissibilidade/.test(regular.outroRequisito)||regular.outroRequisito==='Questão em julgamento ainda não delimitada'||regular.outroRequisito==='Dialeticidade — possível não conhecimento'||regular.outroRequisito==='Ausência de impugnação específica'))regular.outroRequisito='Sem óbice';
    else if(!yes&&(!regular.outroRequisito||regular.outroRequisito==='Sem óbice'))regular.outroRequisito='Pendência de admissibilidade — revisar requisitos adicionais';
  }else if(rule==='com.questao'){
    if(yes){if(!a.comum.questao)autoText('questao','Definir se '+(full.caso.assunto?full.caso.assunto.toLowerCase():'a pretensão deve ser acolhida')+' nos limites da '+KIND[k].toLowerCase()+'.');if(regular.outroRequisito==='Questão em julgamento ainda não delimitada')regular.outroRequisito='Sem óbice';}
    else{clearGenerated('questao');if(!regular.outroRequisito||regular.outroRequisito==='Sem óbice')regular.outroRequisito='Questão em julgamento ainda não delimitada';}
  }else if(rule==='com.fund'){
    if(yes)autoText('fundamentos','Fundamentos relevantes identificados; conferir alegações e preliminares nos recursos e peças.');
    else pendingText('fundamentos','PENDENTE — delimitar alegações, preliminares e fundamentos que podem alterar o resultado.');
  }else if(rule==='com.aplic'){
    if(yes)autoText('aplicacao','Moldura jurídica confrontada com os fatos e provas; revisar e completar a conclusão.');
    else pendingText('aplicacao','PENDENTE — concluir a subsunção da questão.');
  }else if(rule==='ed.vicio')a.ed.conclusaoVicio=yes?'existente sem alteração do resultado':'inexistente';
  else if(rule==='ed.mod'){if(yes){a.ed.natureza='efeitos infringentes';a.ed.conclusaoVicio='existente com alteração do resultado';}else if(a.ed.conclusaoVicio!=='inexistente')a.ed.conclusaoVicio='existente sem alteração do resultado';}
  else if(rule==='agint.imp'){a.agint.impugnacao=yes?'presente':'ausente';if(!yes)regular.outroRequisito='Ausência de impugnação específica';else if(regular.outroRequisito==='Ausência de impugnação específica')regular.outroRequisito='Sem óbice';}
  else if(rule==='agint.ret')a.agint.retratacao=yes?'sim':'não';
  else if(rule==='ai.cab')a.ai.cabimento=yes?(a.ai.cabimento||'art. 1.015'):'não cabível';
  else if(rule==='ai.super')a.ai.superveniente=yes?(a.ai.superveniente||'Há fato superveniente relevante — delimitar seus efeitos sobre o agravo.'):'Não identificado fato superveniente prejudicial ao julgamento.';
  else if(rule==='jr.comp'){a.jr.compatibilidade=yes?'acórdão compatível':'divergência integral';if(!a.jr.providencia)a.jr.providencia=yes?'Manter o acórdão por compatibilidade com o precedente.':'Examinar retratação e delimitar a extensão da adequação.';}
  else if(rule==='jr.tema'&&!yes&&!a.jr.tema)a.jr.tema='PENDENTE — identificar tema e precedente que motivaram a devolução.';
  else if(rule==='rn.suj'){a.rn.sujeicao=yes?'sujeita':'não sujeita';full.julgamento.remessa=yes;}
  else if(rule==='apel.dial'){a.apel.extensao=yes?'Recurso conhecido quanto às questões impugnadas; sem óbice de dialeticidade identificado.':'Não conhecer, total ou parcialmente, das questões sem impugnação específica.';if(!yes)regular.outroRequisito='Dialeticidade — possível não conhecimento';else if(regular.outroRequisito==='Dialeticidade — possível não conhecimento')regular.outroRequisito='Sem óbice';}
  else if(rule==='apel.inov')a.apel.inovacao=yes?'Há inovação recursal — delimitar a parcela não cognoscível.':'Não identificada inovação recursal relevante.';
}
function analysisFields(panel,k){
  var common={
    regularidade:area('analise.comum.admissibilidade','Questão de admissibilidade','Óbice, requisito ou conclusão que efetivamente interfere neste julgamento.','full'),
    origem:area('analise.comum.questao','Questão em julgamento','Formule em uma frase o que precisa ser decidido nesta sessão.','full'),
    recursos:area('analise.comum.fundamentos','Fundamentos relevantes','Alegações, preliminares e pontos que exigem enfrentamento.','full'),
    julgamento:area('analise.comum.aplicacao','Fundamentação aplicada','Norma/precedente → fatos e provas → conclusão para esta questão.','full')
  };
  var F={
    apel:{
      regularidade:select('analise.apel.dialeticidade','Impugnação específica',['presente','parcial','ausente'])+select('analise.apel.inovacao','Inovação recursal',['não identificada','identificada','questão cognoscível de ofício'])+area('analise.apel.extensao','Extensão do conhecimento','Delimite os pontos conhecidos e não conhecidos.','full'),
      origem:area('analise.apel.fundamentoSentenca','Fundamento decisivo da sentença','Fundamento que sustenta a conclusão impugnada.','full'),
      recursos:area('analise.apel.questoesDevolvidas','Questões devolvidas','Enumere questões e preliminares efetivamente devolvidas.','full'),
      julgamento:area('analise.apel.subsunção','Subsunção por questão','Norma ou precedente → fatos/provas → conclusão.','full')
    },
    ai:{
      regularidade:select('analise.ai.cabimento','Cabimento',['art. 1.015','taxatividade mitigada / urgência','outro fundamento','não cabível'])+area('analise.ai.cabimentoNota','Justificativa do cabimento','Fundamento para conhecer ou não conhecer.','full'),
      origem:area('analise.ai.objetoDecisao','Objeto da decisão agravada','Providência deferida, indeferida ou determinada na origem.','full'),
      recursos:select('analise.ai.tutela','Tutela recursal / efeito suspensivo',['não requerida','requerida e indeferida','requerida e deferida','prejudicada'])+area('analise.ai.limites','Limites do agravo','Matéria devolvida ao Tribunal, sem avançar além da decisão agravada.','full'),
      julgamento:area('analise.ai.superveniente','Situação superveniente','Sentença, perda de objeto ou outro fato posterior.','full')+area('analise.ai.conclusaoDecisao','Conclusão sobre a decisão agravada','Manter, reformar ou anular, com fundamento essencial.','full')
    },
    agint:{
      regularidade:select('analise.agint.impugnacao','Impugnação específica',['presente','parcial','ausente'])+area('analise.agint.pontoNaoImpugnado','Ponto não impugnado','Fundamento autônomo eventualmente não enfrentado.','full'),
      origem:area('analise.agint.fundamentoDecisao','Fundamento da decisão monocrática','Fundamento determinante da decisão agravada.','full'),
      recursos:area('analise.agint.razoes','Razões do agravo interno','Argumentos dirigidos contra a decisão.','full'),
      julgamento:select('analise.agint.retratacao','Retratação do relator',['não','parcial','sim'])+area('analise.agint.confronto','Confronto decisão × agravo','Explique por que manter, reformar ou retratar.','full')
    },
    ed:{
      regularidade:select('analise.ed.vicio','Vício alegado',['omissão','contradição','obscuridade','erro material','mais de um vício'])+area('analise.ed.delimitacao','Delimitação do vício','Qual ponto do acórdão é apontado como viciado?','full'),
      origem:area('analise.ed.pontoEmbargado','Trecho / ponto embargado','Identifique o fundamento ou conclusão do acórdão questionado.','full'),
      recursos:select('analise.ed.natureza','Natureza da insurgência',['vício integrativo','rediscussão do mérito','prequestionamento','efeitos infringentes'])+area('analise.ed.razao','Razão dos embargos','Sintetize a alegação e a resposta necessária.','full'),
      julgamento:select('analise.ed.conclusaoVicio','Conclusão sobre o vício',['inexistente','existente sem alteração do resultado','existente com alteração do resultado','parcialmente existente'])+area('analise.ed.integracao','Integração / correção necessária','O que deve ser integrado, esclarecido, corrigido ou mantido?','full')
    },
    jr:{
      regularidade:field('analise.jr.tema','Tema / precedente vinculante','Tema e tribunal'),
      origem:area('analise.jr.tese','Tese do precedente','Tese vinculante relevante para o juízo de retratação.','full'),
      recursos:area('analise.jr.confronto','Confronto com o acórdão','Em que ponto coincide ou diverge do precedente?','full'),
      julgamento:select('analise.jr.compatibilidade','Compatibilidade',['acórdão compatível','divergência parcial','divergência integral'])+area('analise.jr.providencia','Providência','Manter ou retratar, delimitando a extensão.','full')
    },
    rn:{
      regularidade:select('analise.rn.sujeicao','Sujeição ao reexame',['sujeita','não sujeita','parcialmente sujeita'])+area('analise.rn.fundamentoReexame','Fundamento','Hipótese e limite da remessa necessária.','full'),
      origem:area('analise.rn.capitulos','Capítulos submetidos','Capítulos da sentença efetivamente sujeitos ao reexame.','full'),
      recursos:area('analise.rn.apelacaoConcomitante','Apelação concomitante','Delimite eventual sobreposição entre recurso e remessa.','full'),
      julgamento:area('analise.rn.limitesReexame','Limites do reexame','Conclusão sem agravamento indevido da situação da Fazenda.','full')
    }
  };
  var extra=((F[k]||{})[panel])||'';
  return `<div class="pf-guide-fields">${common[panel]||''}${extra?`<div class="pf-kind-guide" data-kind-panel="${esc(k)}">${extra}</div>`:''}</div>`;
}
function guidePanel(panel,k){
  if(!full.guiado)return '';
  var questions=panelGuideQuestions(panel,k),direct=questions.filter(function(q){return q.source==='dir';}),pm=questions.filter(function(q){return q.source==='pm';});
  if(!direct.length&&!pm.length)return '';
  return `<section class="pf-guide-panel"><header><b>Análise jurídica dirigida · ${esc(PANEL_TITLE[panel])}</b><span>Tipo: ${esc(KIND[k])}</span></header>
    ${direct.length?`<div class="pf-guide-label">Verificações do prontuário</div><div class="pf-questions">${direct.map(guideCard).join('')}</div>${analysisFields(panel,k)}`:''}
    ${pm.length?`<div class="pf-guide-label">Análise jurídica complementar · Padrão Muta</div><div class="pf-questions">${pm.map(guideCard).join('')}</div>`:''}
  </section>`;
}
function render(restorePath){
  var y=window.scrollY,active=restorePath||null;
  if(!active){var ae=host.querySelector(':focus[data-path]');if(ae)active=ae.dataset.path;}
  var k=kind(),results=RESULT[k],pieces=full.pecas||[],resources=full.recursos||[];
  var kindOptions=[['','Automático · identificar pela classe/etiquetas']].concat(ORDER.map(function(x){return[x,KIND[x]];}));
  var prepOptions=['—','Comprovado','Dispensado','Não Recolhido','A conferir','Não se Aplica'];
  host.innerHTML=`<div class="pf-notice"><strong>Rascunho pessoal.</strong> Fica só neste navegador, um por processo. Para a equipe ver, use “Enviar o rascunho à ficha” em Ficha do gabinete. Confira os autos e as regras antes de usar.</div>
  <div class="pf-toolbar"><div class="seg" role="tablist" aria-label="Modo do prontuário"><button type="button" data-pf-mode="ficha">Ficha</button><button type="button" data-pf-mode="preencher">Preencher</button></div><button type="button" class="btn line pf-edit-only" id="pf-save">Salvar agora</button><button type="button" class="btn line pf-edit-only" id="pf-discard">Restaurar salvo</button><span id="pf-mode-hint" class="muted"></span><span id="pf-status" class="pf-status" role="status" aria-live="polite">Salvamento local automático</span></div>
  ${group('1','Identificação e classificação','caso',`<div class="pf-grid">
    ${field('caso.numero','Número do processo','0000000-00.0000.4.03.0000')}
    ${field('caso.item','Item da pauta','Nº do item')}
    ${field('caso.classe','Classe processual','Apelação Cível')}
    ${select('caso.tipoManual','Espécie do julgamento',kindOptions)}
    ${field('caso.autor','Polo ativo / parte autora','Parte autora')}
    ${field('caso.reu','Polo passivo / parte ré','Parte ré')}
    ${field('caso.assunto','Assunto','Assunto principal')}
    ${field('caso.subassunto','Subassunto','Tema específico')}
    ${field('caso.secao','Seção / órgão','Turma ou seção')}
    ${field('caso.etiquetas','Etiquetas e especificidades','Separadas por vírgula')}
    ${field('caso.meta','Meta / prioridade','Meta ou prioridade')}
    ${field('caso.servidor','Servidor(a) responsável','Nome')}
    ${field('caso.corretor','Revisor(a) / corretor(a)','Nome')}
    ${check('caso.urgente','Urgente · sinalização somente local')}
  </div><p class="pf-hint">Tipo atual: <strong id="pf-kind-label"></strong>. Automático usa classe, etiquetas e subassunto; uma escolha manual prevalece.</p>`)}
  ${group('2','Regularidade e admissibilidade','regularidade',`<div class="pf-grid">
    ${select('regularidade.tempestividade','Tempestividade',['Não Verificado','Tempestivo','Intempestivo','Não se Aplica'])}
    ${field('regularidade.intimacao','Data da intimação','', 'date')}
    ${select('regularidade.preparo','Preparo',prepOptions)}
    ${check('regularidade.dpu','DPU · prazo em dobro e dispensa de preparo')}
    ${check('regularidade.ajg','AJG · dispensa de preparo')}
    ${select('regularidade.representacao','Representação processual',['Regular','A conferir','Irregular','Não se Aplica'])}
    ${select('regularidade.procuracao','Procuração / documento de representação',['Conferida','Pendente','Não se Aplica'])}
    ${field('regularidade.procuracaoId','ID da procuração/documento','Preencha após conferir nos autos')}
    ${select('regularidade.midias','Mídias',['Não se aplica','Juntada','Faltante'])}
    ${field('regularidade.outroRequisito','Outro requisito / óbice','Sem óbice ou descreva')}
    ${select('regularidade.impedimento','Impedimento / suspeição',['Sem impedimento','Impedimento','Suspeição'])}
    ${select('regularidade.mpfAtuacao','Intervenção do MPF · custos legis',['Sim','Não'])}
    ${select('regularidade.mpfParecer','Parecer do MPF',['Com Parecer','Sem Parecer','Não se Aplica'])}
    ${select('regularidade.mpfSentido','Sentido do parecer',['Prosseguimento do feito','Provimento do recurso','Não provimento do recurso','Outro'])}
    ${field('regularidade.mpfId','ID do parecer','ID do documento')}
    ${area('regularidade.mpfInfo','Informações do parecer','Fundamentos ou observação adicional','full')}
  </div><div class="pf-alert" id="pf-deadline"></div><p class="pf-hint">O cálculo pula fins de semana; feriados locais e suspensões precisam ser conferidos nos autos e calendário oficial.</p>${guidePanel('regularidade',k)}`)}
  ${group('3','Processo e origem','origem',`<div class="pf-grid">
    ${field('origem.subassunto','Subassunto','Tema ou questão jurídica')}
    ${select('origem.decisao','Decisão na origem',['Sentença','Decisão interlocutória','Decisão monocrática','Acórdão'])}
    ${field('origem.decisaoId','ID da decisão','ID do documento')}
    ${field('origem.decisaoData','Data da decisão','','date')}
    ${field('origem.juizo','Juízo de origem','Vara / subseção')}
    ${field('origem.julgador','Julgador(a) de origem','Nome')}
    ${check('origem.custas','Custas fixadas na origem')}
    ${check('origem.honorarios','Honorários fixados na origem')}
    ${check('origem.tutela','Tutela concedida / analisada')}
    ${check('origem.valor','Valor fixado na origem')}
     ${area('origem.observacao','Observações sobre a origem','Informação útil para o voto','full')}
  </div>${guidePanel('origem',k)}`)}
  ${group('4','Recursos e outras peças','recursos',`<div class="pf-resources" id="pf-resources">${resources.map(resourceHTML).join('')}</div><button type="button" class="btn line pf-edit-only" data-action="add-resource" style="margin-top:6px">+ Adicionar recurso</button>
  <div class="pf-grid" style="margin-top:8px"><div class="pf-field"><label>Parte recorrente principal</label><select data-path="recursoTipo.recorrente">${optionList(['Parte autora','Parte ré','União','INSS','Fazenda Nacional','Ambas','Outra'],full.recursoTipo.recorrente,'—')}</select></div>${full.recursoTipo.recorrente==='Outra'?field('recursoTipo.recorrenteCustom','Identificação da parte','Nome da parte'):''}</div>
  <div class="pf-card" style="margin-top:7px;padding:7px;background:#f7f6f0" data-kind-panel="apel"><div class="pf-head"><h2>Apelação · recursos e peças</h2></div><p class="pf-hint">Registre também recursos adesivos e contrarrazões na lista acima.</p></div>
  <div data-kind-panel="rn" class="pf-card" style="margin-top:7px;padding:7px"><div class="pf-head"><h2>Remessa necessária</h2></div><div class="pf-grid">${select('recursoTipo.rnInciso','Hipótese (art. 496)',['I · contra ente público','II · procedência de embargos à execução fiscal'])}${field('recursoTipo.rnValor','Proveito econômico','R$ 0,00 · limite de dispensa')}</div></div>
  <div data-kind-panel="ed" class="pf-card" style="margin-top:7px;padding:7px"><div class="pf-head"><h2>Embargos de declaração</h2></div><div class="pf-grid">${field('recursoTipo.edId','Acórdão embargado · ID','ID do acórdão')}${field('recursoTipo.edData','Data do acórdão','','date')}${field('recursoTipo.edOrgao','Órgão julgador','Turma')}${field('recursoTipo.edVicios','Vício(s) apontado(s)','omissão, contradição, obscuridade ou erro material')}${area('recursoTipo.edPonto','Ponto dos embargos','Ponto omisso, contraditório ou obscuro','full')}</div></div>
  <div data-kind-panel="agint" class="pf-card" style="margin-top:7px;padding:7px"><div class="pf-head"><h2>Agravo interno</h2></div><div class="pf-grid">${field('recursoTipo.agintId','Decisão agravada · ID','ID da decisão')}${field('recursoTipo.agintData','Data da decisão','','date')}${area('recursoTipo.agintSintese','O que decidiu · a partir do verbo','Síntese da decisão agravada','full')}${area('recursoTipo.agintFundamentos','Fundamentos do agravo','Argumentos dirigidos contra a decisão','full')}</div></div>
  <div data-kind-panel="jr" class="pf-card" style="margin-top:7px;padding:7px"><div class="pf-head"><h2>Juízo de retratação</h2></div><div class="pf-grid">${field('recursoTipo.jrId','Acórdão submetido · ID','ID do acórdão')}${field('recursoTipo.jrData','Data do acórdão','','date')}${field('recursoTipo.jrPrecedente','Precedente · tema','Tema ou precedente qualificado')}${field('recursoTipo.jrTribunal','Tribunal · devolução','STF, STJ etc.')}${field('recursoTipo.jrDevolucaoId','ID da devolução','ID do documento')}${field('recursoTipo.jrDevolucaoMes','Mês da devolução','julho/2026')}${select('recursoTipo.jrEd','Embargos ao acórdão',['Não houve','Opostos e rejeitados','Opostos e acolhidos','Parcialmente acolhidos','Não conhecidos'])}${area('recursoTipo.jrQuestao','Questão submetida · com o artigo','Questão a reapreciar','full')}</div></div>
  <div data-kind-panel="ai" class="pf-card" style="margin-top:7px;padding:7px"><div class="pf-head"><h2>Agravo de instrumento</h2></div><div class="pf-grid">${field('recursoTipo.aiId','Decisão agravada · ID','ID da decisão')}${field('recursoTipo.aiData','Data da decisão','','date')}${select('recursoTipo.aiInciso','Hipótese (art. 1.015)',['I · tutela provisória','II · mérito do processo','VI · exibição de documento','IX · intervenção de terceiros','par. único · execução / cumprimento','Tema 988 · urgência (taxatividade mitigada)'])}${select('recursoTipo.aiEfeito','Efeito suspensivo / tutela recursal',['Não requerido','Deferido','Indeferido','Pendente de análise'])}</div></div>
   <div class="pf-head" style="margin-top:8px"><h2>Outras peças</h2><span class="pf-count">${pieces.length}</span></div><div id="pf-pieces">${pieces.map(pieceHTML).join('')}</div><button type="button" class="btn line pf-edit-only" data-action="add-piece">+ Adicionar peça</button>${guidePanel('recursos',k)}`)}
  ${group('5','Julgamento','julgamento',`<div class="pf-grid">
    ${select('julgamento.situacao','Situação',['PAUTADO','JULGADO','EM MESA','ADIADO','RETIRADO DE PAUTA'])}
    <div class="pf-field"><label>Resultado do voto · opções da espécie</label><select data-path="julgamento.resultado" id="pf-result"></select></div>
    <div class="pf-field"><label>Honorários · regra da espécie</label><select data-path="julgamento.honorarios" id="pf-fees"></select></div>
    <div class="pf-field" id="pf-penalty-wrap"><label>Multa</label><select data-path="julgamento.multa" id="pf-penalty"></select></div>
    ${select('julgamento.votacao','Votação',['Unânime','Por maioria'])}
    ${check('julgamento.remessa','Remessa necessária · quando cabível')}
    ${area('julgamento.voto','Voto / dispositivo','Texto do voto ou do dispositivo','full long')}
    ${area('julgamento.fundamentacao','Fundamentos · texto-base gerado','Gere e revise o texto antes de usar','full long')}
    ${field('julgamento.topico','Tópico-síntese','Síntese curta')}
    ${field('julgamento.comentario','Observação ao corretor','Comentário de revisão')}
  </div><div class="bar pf-edit-only" style="margin-top:6px"><button type="button" class="btn line" data-action="generate">Gerar texto-base</button><button type="button" class="btn line" data-action="copy">Copiar texto-base</button></div>
   <div class="pf-alert" id="pf-majority-note"></div>
   <p class="pf-hint" id="pf-rule-note"></p>${guidePanel('julgamento',k)}`)}
  ${group('6','Ciclo local da minuta','workflow',`<div class="pf-head"><h2>Estado atual</h2><span class="pf-count" id="pf-flow-label">Sem minuta</span></div>
  <div class="pf-grid"><div class="pf-field"><label>Minutado em</label><span class="pf-hint">${displayDate(full.workflow.minutadoEm)}</span></div><div class="pf-field"><label>Corrigido em</label><span class="pf-hint">${displayDate(full.workflow.corrigidoEm)}</span></div><div class="pf-field"><label>Devolvido em</label><span class="pf-hint">${displayDate(full.workflow.devolutivaEm)}</span></div><div class="pf-field"><label>Liberado em</label><span class="pf-hint">${displayDate(full.workflow.liberadoEm)}</span></div></div>
  <div class="bar pf-edit-only" style="margin-top:6px">
    <button type="button" class="btn line" data-action="mark-minuted">Registrar minuta</button>
    <button type="button" class="btn line" data-action="mark-doubt">Registrar dúvida</button>
    <button type="button" class="btn line" data-action="mark-return">Devolver para ajuste</button>
    <button type="button" class="btn line" data-action="mark-corrected">Marcar corrigida</button>
    <button type="button" class="btn solid" data-action="mark-released">Liberar</button>
    <button type="button" class="btn danger" data-action="reset-flow">Limpar ciclo</button>
  </div><div class="pf-grid" style="margin-top:6px">${area('workflow.duvidaTexto','Dúvida / resposta local','Registre a questão e a resposta')}${area('workflow.devolutivaTexto','Devolutiva / ajuste solicitado','Registre o ajuste solicitado')}</div>
  <p class="pf-hint" id="pf-flow-detail">As transições são registradas só neste navegador; nenhuma mensagem é enviada ao relator ou à equipe.</p>`)}
  ${group('7','Análise guiada do gabinete','guia',`<div class="pf-guide-overview">
    <label class="pf-check"><input type="checkbox" data-path="guiado"${full.guiado?' checked':''}>Análise guiada ativa</label>
    <span class="pf-count" id="pf-guide-count"></span>
  </div>
  <p class="pf-hint">As perguntas ficam nos painéis correspondentes a Regularidade, Processo e origem, Recursos e Julgamento. Respostas negativas geram pontos para revisar; não substituem a conferência dos autos. A revisão textual é separada desta análise.</p>
  <div id="pf-guide-pending" class="pf-guide-pending"></div>`)}
  ${group('8','Notas de Triagem e Produção','notas',`<div class="seg" role="tablist" aria-label="Etapa local do Muta"><button type="button" data-stage="triagem">Triagem</button><button type="button" data-stage="producao">Produção</button></div>
  <div data-stage-panel="triagem" class="pf-grid" style="margin-top:7px">${area('triagem.resumo','Resumo','Síntese local do caso','full')}${area('triagem.pendencias','Pendências','Pontos ainda pendentes')}${area('triagem.encaminhamento','Encaminhamento','Próxima providência')}</div>
  <div data-stage-panel="producao" class="pf-grid" style="margin-top:7px">${select('producao.tipo','Tipo de peça',['Despacho','Decisão monocrática','Voto','Ementa','Outro'])}${area('producao.questoes','Questões a decidir','Questões centrais','full')}${area('producao.minuta','Minuta de trabalho','Texto em elaboração','full long')}</div>`)}
  ${group('9','Revisão textual da minuta','conformidade',`<p class="pf-hint">Conferência editorial separada da análise jurídica. Marque após revisar a versão atual da minuta.</p><div class="pf-questions">${[['partes','Nomes, papéis, classe e partes conferidos'],['ids','IDs e datas das peças citadas conferidos'],['fund','Argumentos e preliminares relevantes enfrentados no texto'],['res','Fundamentação, resultado e dispositivo coerentes'],['ementa','Ementa fiel ao voto e revisão final de forma concluída']].map(function(c){return `<label class="pf-check"><input type="checkbox" data-conf="${c[0]}"${full.conformidade[c[0]]?' checked':''}>${esc(c[1])}</label>`;}).join('')}</div>`)}
  ${group('10','Alertas e observações','acompanhamento',`<div class="pf-grid">${area('alertas','Alertas locais','Um por linha','full')}${area('intercorrencias','Intercorrências','Registro e estado das intercorrências','full')}${area('observacoes','Observações gerais','Observações do prontuário','full')}</div>`)}
  ${group('11','Precedentes do Acervo','vinculos',`<div class="pf-head"><h2>Decisões vinculadas ao prontuário</h2><span class="pf-count" id="pf-link-count">0</span></div><div class="pf-links" id="pf-links"></div><p class="pf-hint">Abra a aba Ementário para pesquisar e vincular precedentes do Compêndio.</p>`)}`;
  updateComputed();
  if(active){var next=[].slice.call(host.querySelectorAll('[data-path]')).find(function(x){return x.dataset.path===active;});if(next){next.focus({preventScroll:true});if(typeof next.setSelectionRange==='function'&&next.type!=='date'){try{next.setSelectionRange(next.value.length,next.value.length);}catch(_){}}}}
  window.scrollTo(0,y);
}
function setStatus(text,kind){var el=host.querySelector('#pf-status');if(el){el.textContent=text;el.className='pf-status'+(kind?' '+kind:'');}}
function saveNow(){
  if(timer){clearTimeout(timer);timer=null;}
  if(bridge.saveFull(full)){lastSaved=JSON.stringify(full);setStatus('Salvo neste navegador · '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),'ok');}
  else setStatus('Falha no salvamento local · exporte o JSON','err');
}
function scheduleSave(){setStatus('Salvando…');clearTimeout(timer);timer=setTimeout(saveNow,450);}
function maybeApplyPreparo(path,value){
  if(path==='regularidade.dpu'||path==='regularidade.ajg'){
    var exempt=full.regularidade.dpu||full.regularidade.ajg;
    if(exempt){if(full.regularidade.preparo!=='Dispensado')full.regularidade.preparoAntesAuto=full.regularidade.preparo;full.regularidade.preparo='Dispensado';}
    else if(full.regularidade.preparo==='Dispensado'){full.regularidade.preparo=full.regularidade.preparoAntesAuto||'';full.regularidade.preparoAntesAuto='';}
  }
  if(path==='regularidade.preparo'&&value!=='Dispensado'&&!full.regularidade.dpu&&!full.regularidade.ajg)full.regularidade.preparoAntesAuto='';
}
function buildText(){
  var c=full.caso,o=full.origem,r=full.recursoTipo,j=full.julgamento,k=kind();
  var who=c.autor||'[parte autora]',against=c.reu||'[parte ré]',num=c.numero?' nos autos nº '+c.numero:'';
  var id=o.decisaoId?' (ID '+o.decisaoId+')':'',court=o.juizo||'[juízo de origem]';
  var t={
    apel:`Trata-se de apelação interposta por ${who} contra a ${String(o.decisao||'sentença').toLowerCase()}${id} proferida pelo ${court}, nos autos da ação ajuizada por ${who} em face de ${against}${num}.`,
    rn:`Trata-se de remessa necessária da decisão${id} proferida pelo ${court}, nos termos do art. 496 do CPC${num}.`,
    ed:`Trata-se de embargos de declaração opostos por ${who} contra o acórdão${r.edId?' (ID '+r.edId+')':''}, proferido pela ${r.edOrgao||'[órgão julgador]' }.\n\nAlega a parte embargante a ocorrência de ${r.edVicios||'[vício apontado]'}${r.edPonto?', ao argumento de que '+r.edPonto.replace(/\.$/,''):''}.`,
    agint:`Trata-se de agravo interno interposto por ${who} contra a decisão monocrática${r.agintId?' (ID '+r.agintId+')':''} que ${r.agintSintese||'[síntese da decisão]'}.\n\nSustenta a parte agravante ${r.agintFundamentos||'[fundamentos do agravo]'}.`,
    jr:`Os autos retornaram do ${r.jrTribunal||'Tribunal Superior'}${r.jrDevolucaoId?' (ID '+r.jrDevolucaoId+')':''}${r.jrDevolucaoMes?', em '+r.jrDevolucaoMes:''}, para eventual juízo de retratação.\n\nO acórdão${r.jrId?' (ID '+r.jrId+')':''} tratou da questão submetida: ${r.jrQuestao||'[questão submetida]'}. Tema / precedente: ${r.jrPrecedente||'[precedente]'}.`,
    ai:`Trata-se de agravo de instrumento interposto por ${who} contra a decisão${r.aiId?' (ID '+r.aiId+')':''} proferida pelo ${court}${r.aiInciso?', com fundamento no art. 1.015, '+r.aiInciso.split(' · ')[0]+' do CPC':''}.`
  }[k]||'';
  var extra=j.resultado?`\n\nDispositivo: ${j.resultado.toLowerCase()}.`:'';if(j.honorarios)extra+=' Honorários: '+j.honorarios.toLowerCase()+'.';if(j.multa&&j.multa!=='Sem multa')extra+=' Multa: '+j.multa+'.';
  return t+extra;
}
function renderWithFocus(path){render(path);}
host.addEventListener('input',function(e){
  var f=e.target;
  if(f.matches('[data-path]')){var v=f.type==='checkbox'?f.checked:f.value;set(f.dataset.path,v);maybeApplyPreparo(f.dataset.path,v);updateProgress();scheduleSave();return;}
  if(f.matches('[data-q-note]')){var key=f.dataset.qNote;full.roteiro[key]=full.roteiro[key]||{};full.roteiro[key].note=f.value; scheduleSave();}
});
host.addEventListener('change',function(e){
  var f=e.target;
  if(f.matches('[data-path]')){
    var v=f.type==='checkbox'?f.checked:f.value;set(f.dataset.path,v);maybeApplyPreparo(f.dataset.path,v);
    var rerender=/caso\.(classe|etiquetas|subassunto|tipoManual)|regularidade\.(dpu|ajg|procuracao)|recursos\.\d+\.(especie|parte|contra\.situacao)|recursoTipo\.recorrente$|julgamento\.(votacao|remessa)|guiado/.test(f.dataset.path);
    if(rerender)render(f.dataset.path);else updateComputed();
    scheduleSave();return;
  }
  if(f.matches('[data-conf]')){full.conformidade[f.dataset.conf]=f.checked;scheduleSave();}
});
host.addEventListener('click',function(e){
  var mode=e.target.closest('[data-pf-mode]');if(mode){full.modo=mode.dataset.pfMode;render();scheduleSave();return;}
  var stage=e.target.closest('[data-stage]');if(stage){full.etapa=stage.dataset.stage;render();scheduleSave();return;}
  var answer=e.target.closest('[data-q-answer]');if(answer){var key=answer.dataset.qKey,status=answer.dataset.qAnswer;full.roteiro[key]=full.roteiro[key]||{};full.roteiro[key].status=status;if(answer.dataset.qRule)applyGuideRule(answer.dataset.qRule,status);render();scheduleSave();return;}
  var b=e.target.closest('[data-action]');if(!b)return;
  var a=b.dataset.action,i=Number(b.dataset.index);
  if(a==='add-resource'){full.recursos.push({especie:({ed:'Embargos de declaração',agint:'Agravo interno',ai:'Agravo de instrumento',rn:'Remessa necessária',jr:'Recurso especial / extraordinário (retratação)'})[kind()]||'Apelação',parte:'',parteCustom:'',data:'',ids:'',semId:false,contra:{situacao:'',data:'',ids:'',semId:false}});render();scheduleSave();}
  else if(a==='remove-resource'){full.recursos.splice(i,1);render();scheduleSave();}
  else if(a==='add-piece'){full.pecas.push({tipo:'',id:'',data:'',descricao:''});render();scheduleSave();}
  else if(a==='remove-piece'){full.pecas.splice(i,1);render();scheduleSave();}
  else if(a==='generate'){full.julgamento.fundamentacao=buildText();render('julgamento.fundamentacao');scheduleSave();}
  else if(a==='mark-minuted'){full.workflow.minutadoEm=localDate();full.workflow.duvida=false;full.workflow.devolutiva=false;full.workflow.corrigidoEm='';full.workflow.liberadoEm='';render();scheduleSave();}
  else if(a==='mark-doubt'){if(!full.workflow.minutadoEm){setStatus('Registre a minuta antes de abrir uma dúvida.','err');return;}full.workflow.duvida=!full.workflow.duvida;if(full.workflow.duvida)full.workflow.liberadoEm='';render();scheduleSave();}
  else if(a==='mark-return'){if(!full.workflow.minutadoEm){setStatus('Registre a minuta antes da devolutiva.','err');return;}full.workflow.devolutiva=true;full.workflow.devolutivaEm=localDate();full.workflow.corrigidoEm='';full.workflow.liberadoEm='';render();scheduleSave();}
  else if(a==='mark-corrected'){if(!full.workflow.minutadoEm){setStatus('Registre a minuta antes de marcar a correção.','err');return;}full.workflow.corrigidoEm=localDate();full.workflow.devolutiva=false;full.workflow.devolutivaEm='';full.workflow.liberadoEm='';render();scheduleSave();}
  else if(a==='mark-released'){if(full.workflow.liberadoEm)full.workflow.liberadoEm='';else if(full.workflow.minutadoEm&&full.workflow.corrigidoEm&&!full.workflow.duvida&&!full.workflow.devolutiva)full.workflow.liberadoEm=localDate();render();scheduleSave();}
  else if(a==='reset-flow'){Muta.confirmar('Limpar o ciclo local de minuta, dúvida, devolutiva, correção e liberação?','Limpar').then(function(ok){if(!ok)return;full.workflow={minutadoEm:'',duvida:false,duvidaTexto:'',devolutiva:false,devolutivaEm:'',devolutivaTexto:'',corrigidoEm:'',liberadoEm:''};render();scheduleSave();});}
  else if(a==='copy'){var text=full.julgamento.fundamentacao||buildText();if(!full.julgamento.fundamentacao){full.julgamento.fundamentacao=text;scheduleSave();}
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){setStatus('Texto-base copiado. Revise antes de usar.','ok');}).catch(function(){setStatus('Não foi possível copiar automaticamente; selecione o texto.','err');});
    else{var ta=host.querySelector('[data-path="julgamento.fundamentacao"]');ta.focus();ta.select();try{document.execCommand('copy');setStatus('Texto-base copiado. Revise antes de usar.','ok');}catch(_){setStatus('Selecione e copie o texto manualmente.','err');}}
  }else if(a==='remove-link'){bridge.removeLink(i);}
  else if(a==='save'){saveNow();}
  else if(a==='discard'){restaurar();}
});
function restaurar(){
  Muta.confirmar('Restaurar os últimos dados salvos? As alterações ainda não salvas serão descartadas.','Restaurar').then(function(ok){
    if(!ok)return;
    if(timer){clearTimeout(timer);timer=null;}
    var saved=bridge.lerSalvo();
    if(!saved){full=bridge.getFullSanitized(null);full.caso.numero=bridge.getFull().caso.numero;render();setStatus('Nada salvo ainda para este processo.','ok');return;}
    try{full=bridge.getFullSanitized(saved.full,saved);render();setStatus('Rascunho local restaurado.','ok');}
    catch(_){setStatus('Não foi possível restaurar os dados salvos.','err');}
  });
}
host.addEventListener('click',function(e){
  if(e.target.id==='pf-save')saveNow();
  if(e.target.id==='pf-discard')restaurar();
});
window.MutaProntuarioFull={
  getState:function(){return full;},
  setState:function(v){if(timer){clearTimeout(timer);timer=null;}full=bridge.getFullSanitized(v);lastSaved=JSON.stringify(full);if(host.isConnected)render();},
  refreshLinks:function(){updateProgress();},
  reset:function(){full=bridge.getFullSanitized(null);render();},
  /* grava o pendente agora (antes de trocar de processo) */
  flush:function(){if(timer){clearTimeout(timer);timer=null;saveNow();}},
  /* descarta o pendente (ao limpar o prontuário) */
  cancelar:function(){if(timer){clearTimeout(timer);timer=null;}},
  status:function(t,k){setStatus(t,k);}
};
render();
})();
