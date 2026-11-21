'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('caput/triagem/index.html');
const legacy=read('caput/index.html');
const wf=read('.github/workflows/vercel-caput.yml');
test('Caput é a central principal e preserva módulos existentes',()=>{
  assert.ok(page.includes('<title>Caput · Central do Gabinete</title>'));
  for(const id of ['triagem','pautas','coordenacao','comunicacao','chefia']){
    assert.ok(page.includes('data-mod="'+id+'"'),'módulo '+id);
  }
  assert.ok(page.includes("D.title = 'Caput · ' + tit"));
});

test('A entrada Caput abre a Chefia (com os relatórios da antiga Inteligência) e cada aba tem caminho próprio em /caput/',()=>{
  assert.ok(page.includes("if (/^\\/caput$/.test(p)) return 'chefia';"),'/caput abre a Chefia');
  assert.ok(page.includes('function vRelatorios()')&&page.includes("abas:['escopo','destino','acervo','etiquetas']")&&page.includes('function calForense()')&&page.includes("abas:['equipe','designacao','produtividade']"),'Inteligência na Chefia; equipe e regras na Coordenação');
  assert.ok(page.includes("fila: 'triagem'")&&page.includes("pautas: 'pautas'"),'abas mapeadas a caminhos');
  assert.ok(page.includes("history.pushState(null, '', alvo + location.search)"),'troca de aba muda o caminho');
  assert.ok(page.includes("location.hash"),'endereços antigos com # continuam valendo');
});

test('Caput é servido sem duplicar APIs ou motor',()=>{
  for(const x of ['site/public/caput/index.html','site/public/monitor/triagem/index.html'])assert.ok(wf.includes(x),x);
  assert.ok(wf.includes('"rewrites":[{"source":"/caput/:aba(triagem|pautas|coordenacao|comunicacao|inteligencia|chefia|escaninhos)","destination":"/caput/index.html"}'),'abas do Caput por caminho');
  for(const x of ['/init/assets/js/regras-gerais.js','/init/assets/js/gh-ponte.js'])assert.ok(page.includes(x),x);
  assert.ok(legacy.includes("location.replace('/caput/' + location.hash)"));
});

test('Rotas históricas redirecionam à central sem alterar os dados',()=>{
  for(const x of ['"/triagem","destination":"/caput/triagem"','"/pautas","destination":"/caput/pautas"'])assert.ok(wf.includes(x),x);
  const script=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(script.length>0);
  script.forEach((m,i)=>new vm.Script(m[1],{filename:'caput-script-'+i+'.js'}));
});

test('Triagem: aba única com visão geral recolhível, escaninhos como sub-aba e exportação num ícone',()=>{
  assert.ok(page.includes("$('#abas').innerHTML = '';")&&page.includes("$('#abas').hidden = true;")&&!page.includes("t('fila', 'Triagem'"),'Triagem é a página, sem subaba no topo');
  assert.ok(page.includes('function visaoGeral()')&&page.includes('vInicio(true)'),'visão geral do antigo Início na Triagem');
  assert.ok(page.includes("+ (!emE && !F.conj ? visaoGeral() : '') + '<div class=\"fl-cab\">"),'visão geral antes da busca e dos filtros');
  assert.ok(page.includes('class="btn ico" id="')&&!page.includes('data-ex-xlsx title="Planilha do Excel formatada, com todas as colunas">Excel</button>'),'Excel e Exportar num botão de ícone');
});

test('Desempenho e início: motor escondido não redesenha; Chefia é a página inicial; só a Triagem espera o acervo; calendário na Chefia',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8'),mot=fs.readFileSync(p.join(__dirname,'../../../caput/motor/index.html'),'utf8');
  assert.ok(mot.includes('__oculto()')&&mot.includes('this.__sujo = true')&&mot.includes('this.__vigiaVisivel()'),'motor sem redesenho escondido');
  assert.ok(cap.includes("return 'chefia';\n}")&&cap.includes("if (!PRONTO && (ABA === 'pautas' || naT))"),'Chefia inicial e só a Triagem espera');
  assert.ok(cap.includes('function pintaCal(')&&cap.includes('data-cgses='),'calendário na Chefia');
});

test('Chefia: primeira no menu, painéis no padrão do Caput, calendário forense no rodapé do calendário, relatórios com altura fixa',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  assert.ok(cap.indexOf('data-mod="chefia"')<cap.indexOf('data-mod="triagem"'),'Chefia primeiro');
  assert.ok(cap.includes('<div id="cg-forense">'),'rodapé forense');
  assert.ok(cap.includes('.cg-tool .cg-studio{height:600px')&&cap.includes('data-cg-rel-export="pdf"'),'relatórios como ferramenta');
});

test('Calendário forense editável na própria Chefia (sem abrir a tela antiga) e data local no motor',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8'),m=fs.readFileSync(p.join(__dirname,'../../../caput/motor/assets/js/21-sessoes-equipe.js'),'utf8');
  assert.ok(cap.includes('data-cgfx="poe"')&&cap.includes('data-cgfx="jf"')&&!cap.includes('Editar expediente e feriados'),'edição na Chefia');
  assert.ok(m.includes('semExpediente: { poe:')&&m.includes("d.getFullYear() + '-'"),'motor');
});

test('Chefia: calendário completo do gabinete (o do motor) e regras de etiquetas editáveis nas Regras gerais, iguais às da etapa 3 de Pautas',()=>{
  const fs=require('fs'),p=require('path'),r=(x)=>fs.readFileSync(p.join(__dirname,'../../../',x),'utf8');
  const cap=r('caput/triagem/index.html'),rg=r('caput/assets/js/regras-gerais.js'),m=r('caput/motor/assets/js/21-sessoes-equipe.js');
  assert.ok(cap.includes('<script src="/init/motor/assets/js/11-calendario.js"></script>')&&cap.includes('W.CMTCalendario.montar(CAL_EL'),'calendário do motor na Chefia');
  assert.ok(m.includes('regrasEtiquetas: {')&&m.includes('RX.clear(); HIST = null; salvar(); return true; }'),'API do motor');
  assert.ok(rg.includes("data-rg=\"etq-nova\"")&&rg.includes('SM.conversoes(ses.id)')&&!rg.includes("tela('regras', 'Editar regras de etiquetas')"),'editor nas Regras gerais, contado como na etapa 3');
});

test('Calendário da Chefia: dois meses lado a lado e visual do Caput',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8'),cal=fs.readFileSync(p.join(__dirname,'../../../caput/motor/assets/js/11-calendario.js'),'utf8');
  assert.ok(cal.includes('ex.meses===2&&st.passo===')&&cal.includes('function mes(vis,b0)'),'dois meses');
  assert.ok(cap.includes('{ meses: 2, semanaLateral: true, semanaRecolhida: true, hoje: HOJE,')&&cap.includes('.cg-cal .cc-2m{'),'Chefia usa dois meses');
});

test('Gravação só no cabeçalho: Pautas sem a faixa inicial; o indicador soma triagem e sessões, regras e equipe',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  assert.ok(!cap.includes('id="pt-gravar"')&&!cap.includes('Pautas de julgamento · sessões, marcos, seleção prévia e PDF da pauta'),'faixa de Pautas removida');
  assert.ok(cap.includes('api.estadoGrava = {')&&cap.includes('W.CMTPautas.gravarJa()')&&cap.includes('W.pintaGrava = pintaGrava;'),'indicador único');
});

test('Regras gerais embutidas no visual do painel de Relatórios (altura fixa, menu com subtítulos)',()=>{
  const fs=require('fs'),p=require('path'),rg=fs.readFileSync(p.join(__dirname,'../../../caput/assets/js/regras-gerais.js'),'utf8');
  assert.ok(rg.includes('var ABAS_SUB = {')&&rg.includes(".rg.embutida{position:relative;left:auto;top:auto;transform:none;width:100%;height:600px"),'visual de ferramenta');
});

test('Calendário da Chefia: semana em lista dentro do painel Hoje, sem a faixa sob o calendário',()=>{
  const fs=require('fs'),p=require('path'),r=(x)=>fs.readFileSync(p.join(__dirname,'../../../',x),'utf8');
  assert.ok(r('caput/motor/assets/js/11-calendario.js').includes('function semanaLista(vis)')&&r('caput/motor/assets/js/11-calendario.js').includes('data-a=\"lado-sem\"')&&r('caput/triagem/index.html').includes('semanaLateral: true'),'semana no Hoje');
});

test('Calendário recolhido deixa a faixa da semana atual; Regras gerais com o fundo da coluna esquerda',()=>{
  const fs=require('fs'),p=require('path'),r=(x)=>fs.readFileSync(p.join(__dirname,'../../../',x),'utf8');
  assert.ok(r('caput/motor/assets/js/11-calendario.js').includes('function faixaSemana(vis)')&&r('caput/triagem/index.html').includes('semanaRecolhida: true'),'faixa recolhida');
  assert.ok(r('caput/assets/js/regras-gerais.js').includes('.rg.embutida .rg-c{background:#fbfaf5'),'fundo igual');
});

test('Calendário da Chefia: sem fundo branco sob os calendários, um painel por mês',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  assert.ok(cap.includes('.cg-cal .cc-body{background:var(--p)}.cg-cal .cc-2m>div')&&cap.includes('.cg-cal .cc-esq .cc-esq-b{top:56px!important}'),'painéis por mês');
});

test('Calendário da Chefia: hoje só com o número em pílula; nomes de feriado curtos, numa linha',()=>{
  const fs=require('fs'),p=require('path'),r=(x)=>fs.readFileSync(p.join(__dirname,'../../../',x),'utf8');
  assert.ok(r('caput/motor/assets/js/11-calendario.js').includes('<span class="cc-n"><b>${dd}</b>'),'número separado');
  const cap=r('caput/triagem/index.html'); assert.ok(cap.includes('.cg-cal .cc-hoje .cc-n b{')&&cap.includes("replace(/^Dia Nacional de Zumbi e da /, '')"),'pílula e nomes curtos');
});

test('Designação: categorias de julgamento sem responsável aparecem nas regras; faixa da etapa 4 numa linha',()=>{
  const fs=require('fs'),p=require('path'),r=(x)=>fs.readFileSync(p.join(__dirname,'../../../',x),'utf8');
  assert.ok(r('caput/triagem/index.html').includes('seguem para a próxima regra')&&r('caput/triagem/index.html').includes('const semResp = (kind, r)'),'sem responsável');
  assert.ok(r('caput/designacao/index.html').includes("kk.textContent='04 / redator e corretor'"),'cabeçalho no padrão das etapas');
});

test('Etapas da esteira: cabeçalho com rótulo dourado e título grande, sem fundo; barra de rolagem mínima em todo o Caput',()=>{
  const fs=require('fs'),p=require('path'),r=(x)=>fs.readFileSync(p.join(__dirname,'../../../',x),'utf8');
  const cap=r('caput/triagem/index.html');
  assert.ok(!/<h2>\d · /.test(cap)&&(cap.match(/class="cwe-et"/g)||[]).length>=9&&cap.includes('.cwe-et{border-top:2px solid var(--v)'),'cabeçalho das etapas');
  for(const f of ['caput/triagem/index.html','caput/designacao/index.html','caput/motor/index.html'])
    assert.ok(r(f).includes('@supports not selector(::-webkit-scrollbar)')&&r(f).includes('::-webkit-scrollbar-button{display:none'),f);
  assert.ok(r('caput/motor/assets/css/07-identidade.css').includes('@supports not selector(::-webkit-scrollbar)'),'motor css');
});

test('Etiquetagem: "Criar regra…" em Sem regra abre o formulário junto da etiqueta',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  assert.ok(cap.includes("boxRegrasPauta(ss, d, 'form')")&&cap.includes("if (onde === 'form') return form;")&&cap.includes("de: et }")&&cap.includes("(onde === 'form') === !!rb.de"),'form junto da etiqueta');
});

test('Chefia › Visão operacional: lista com altura fixa, rolando por dentro',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  assert.ok(cap.includes('.vo-bd{height:560px}')&&cap.includes('#vo-lst{flex:1 1 auto;min-height:0;overflow:auto')&&cap.includes('.vo-g h4{position:sticky;top:0'),'altura fixa');
});

test('Calendário: os cartões de "Sessões em andamento" ocupam a largura disponível',()=>{
  const fs=require('fs'),p=require('path'),css=fs.readFileSync(p.join(__dirname,'../../../caput/motor/assets/css/02-calendario.css'),'utf8');
  assert.ok(css.includes('.cc-dg{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr))'),'auto-fit');
});

test('Triagem › Visão geral: cabeçalhos com fundo próprio',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  assert.ok(cap.includes('.tri-vg-h{background:var(--bg)')&&cap.includes('.tri-vg-c .ch{background:var(--bg)'),'fundo dos cabeçalhos');
});

test('Comunicação: padrão da Chefia, publicar com prévia ao lado do histórico, canais embaixo',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  for(const x of ['id="cg-com-form"','id="cg-com-hist"','id="cg-com-status"','name="nivel" value="','name="onde" value="','name="todos" checked','function cmParaSync(','para:cmPara(f)}',"pill('fixo'",'name="ate"','function cmPrevia(','function cmCartao(','cm-k-tot','data-cg-url="/office/#cmt"'])assert.ok(cap.includes(x),x);
});

test('Coordenação: seções no padrão da Chefia',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  const i=cap.indexOf('function vCoordenacao(){'),v=cap.slice(i,cap.indexOf('\nconst CG_REL_CAT=[',i));
  assert.ok(v.includes('<div class="wrap cg-chefia co-cab"><div class="cg-top">')&&!v.includes("Operação diária"),'cabeçalho da Coordenação');
  assert.ok(cap.includes('<div class="co-lay"><section class="cg-px co-pf">')&&cap.includes('<section class="cg-px cg-comp-p"><header>')&&cap.includes('<aside class="co-lado"><section class="cg-px">')&&cap.includes('<div id="cg-coord" aria-label="Equipe e regras">'),'Perfis e Equipe e regras lado a lado; Competências embaixo');
});

test('Chefia › Calendário: pedidos de ausência e quem está fora, pelo motor',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8'),m=fs.readFileSync(p.join(__dirname,'../../../caput/motor/assets/js/21-sessoes-equipe.js'),'utf8');
  for(const x of ['solicitacoesAusencia: function','decidirAusencia: function','ausencias: function','ausenciaPoe: function','ausenciaTira: function','async function eqDecidir('])assert.ok(m.includes(x),x);
  for(const x of ['<div id="cg-aus">','function ausPinta(','data-cgau="sim"','data-cgau="poe"','Quem está fora · 6 semanas'])assert.ok(cap.includes(x),x);
});

test('Coordenação › Perfis: abas com filtros por pessoa (minutas, correções, diligências, presença)',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  for(const x of ['function pfPinta(','function pfDados(','apoio/equipe-pendencias.json','data-pf-p=','data-pf-a=','data-pf-f="tipo"','Presença e ausências','PF.f[fk]','pfPinta();\n  const alvo=$(\'#cg-coord\')'])assert.ok(cap.includes(x),x);
});

test('Triagem: busca e filtros no cabeçalho do painel Acervo filtrado',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  assert.ok(cap.includes('.fl-cab>.fl-l1{padding:9px 12px;background:var(--bg)')&&cap.includes('.fl-cab>.acf{border:0'),'painel único');
});

test('Motor: gravar a pauta devolve ctl.lote e as chaves de ctl que vieram do arquivo',()=>{
  const fs=require('fs'),p=require('path'),m=fs.readFileSync(p.join(__dirname,'../../../caput/motor/assets/js/21-sessoes-equipe.js'),'utf8');
  assert.ok(m.includes("CTL_K.concat(['lote'], it._ck || [])")&&m.includes("_ck: Object.keys(it.ctl || {})"),'lote preservado');
});

test('Coordenação › Perfis › Competências: especialidade, prefere, evita e experiência (o que era a aba Perfis); matriz dentro de Produção; equipe atual ou com quem saiu',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8'),cp=cap;
  for(const x of ['function pfComp(','function pfCompGrava(','data-pfc-poe','data-pfc-mv','data-pfc-dis',"tipo === 'cmt:comp-perfil'","['comp', 'Competências e histórico'"])assert.ok(cap.includes(x),x);
  for(const x of ['data-eqh="atual"',"OC={nomes:[],saiu:true}",'Produção e matriz',"if(v==='matriz')v='prod'","tipo:'cmt:comp-perfil'",'window.CMTCompRecarregar()','class="so-fora">Perfis'])assert.ok(cp.includes(x),x);
});

test('Equipe: indisponível à mão ou pela ausência aprovada cobrindo hoje',()=>{
  const fs=require('fs'),p=require('path'),m=fs.readFileSync(p.join(__dirname,'../../../caput/motor/assets/js/21-sessoes-equipe.js'),'utf8'),rg=fs.readFileSync(p.join(__dirname,'../../../caput/assets/js/regras-gerais.js'),'utf8');
  assert.ok(m.includes('function ausente(m, ss) { if (m.indisp) return true;')&&m.includes("'minutaEventual', 'indisp'].indexOf(campo)")&&m.includes('situacao: function (nome)'),'motor');
  assert.ok(rg.includes('data-k="indisp"')&&rg.includes('indisponível · ausente até'),'painel Equipe');
});

test('Comunicação: desembargador (página CMT) como destinatário e painel do WhatsApp do Dr. pela Zernio',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8'),n=fs.readFileSync(p.join(__dirname,'../notificacoes.js'.replace('../','../api/')),'utf8'),w=fs.readFileSync(p.join(__dirname,'../api/_wa-gabinete.js'),'utf8');
  for(const x of ['name="dr"',"cgApi('/api/pendencias?com=1'",'id="wa-form"','async function waCarregar(',"cgApi('/api/notificacoes?wa=1'"])assert.ok(cap.includes(x),x);
  assert.ok(n.includes("if (req.query && req.query.wa) return require('./_wa-gabinete')(req, res);"),'rota');
  assert.ok(w.includes('L.gestor(u)')&&w.includes('ZERNIO_API_KEY || e.CAPUT_KEY')&&w.includes("modo === 'livre'")&&w.includes('apoio/equipe-whatsapp.json'),'endpoint');
});

test('Coordenação › Competências no código do Caput (sem moldura), com tela cheia; Chefia: Hoje na altura dos meses e linha do tempo compacta',()=>{
  const fs=require('fs'),p=require('path'),vm=require('vm'),r=(x)=>fs.readFileSync(p.join(__dirname,'../../../',x),'utf8'),cap=r('caput/triagem/index.html');
  assert.ok(!cap.includes('<iframe title="Competências'),'sem iframe');
  for(const x of ['<template id="comp-tpl">','window.CMTCompApp=function(document,window,location){','function compMonta(','function compTela(','id="comp-tela"','.cg-comp-p.full{position:fixed','attachShadow','d3-sankey'])assert.ok(cap.includes(x),x);
  const tpl=cap.slice(cap.indexOf('<template id="comp-tpl">'),cap.indexOf('</template>'));
  assert.ok(tpl.includes(':host{')&&!/:root|html[,.]/.test(tpl.split('</style>')[0]),'estilo no bloco isolado');
  const fn=cap.match(/<script>\n\/\* Competências da equipe[\s\S]*?<\/script>/); assert.ok(fn,'script'); new vm.Script(fn[0].replace(/^<script>|<\/script>$/g,''));
  assert.ok(r('caput/competencias/index.html').includes("location.replace('/caput/coordenacao')"),'página antiga leva à Coordenação');
  assert.ok(cap.includes('tlLinha: 54')&&r('caput/motor/assets/js/11-calendario.js').includes('const LH=ex.tlLinha||74;'),'linha do tempo');
  assert.ok(cap.includes('.cg-cal .cc-top>.cc-esq{position:relative!important;top:auto!important;align-self:stretch;contain:size'),'Hoje na altura dos meses');
});

test('Competências com a pele do Caput: sem título repetido, abas sublinhadas, paleta verde e cantos retos',()=>{
  const cap=require('fs').readFileSync(require('path').join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  const tpl=cap.slice(cap.indexOf('<template id="comp-tpl">'),cap.indexOf('</template>'));
  for(const x of ['.cpx .top>div:first-child{display:none}','.cpx .tabs button[aria-selected="true"]{background:none;color:#173f3d','--ac:#173f3d','.cpx .card{border-radius:0','.cpx .tw,.cpx .srvp{border-radius:0}'])assert.ok(tpl.includes(x),x);
});

test('Coordenação: Perfis inteiro (sem rolagem) com painéis Histórico (minutas, correções, diligências) e Experiência por assunto; Perfis e Equipe na mesma altura; Competências embaixo na largura toda',()=>{
  const cap=require('fs').readFileSync(require('path').join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  for(const x of ['.pf-c{padding:10px 14px 14px}','class=\"pf-pn pf-hist\"','data-pf-h=','class=\"pf-pn pfc-xl\"','function pfComp(m, hist)',".co-lay>.cg-comp-p{grid-column:1/-1}",'.co-lado{position:relative;contain:size;','</aside><section class="cg-px cg-comp-p">'])assert.ok(cap.includes(x),x);
  assert.ok(!cap.includes("['min', 'Minutas', D0.MIN.length], ['cor', 'Correções', D0.COR.length], ['dil', 'Diligências', D0.DIL.length], ['pres'"),'abas de cima sem minutas/correções/diligências');
});

test('Perfis › Histórico: só o feito, Excel, listar todos e rolagem; Registro de atividades recolhido de início',()=>{
  const cap=require('fs').readFileSync(require('path').join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  for(const x of ["const FEITO = { min: D0.MIN.filter((x) => x.feito), cor: D0.COR.filter((x) => x.feito), dil: D0.DIL.filter((t) => t.stage === 'done') };",'function pfXls()','data-pf-xls','data-pf-todos','Listar todos (','.pf-hist .pf-tb,.pf-hist .pf-dl{max-height:440px;overflow-y:auto','.pfc-xl .pf-pn-c{flex:1 1 auto;min-height:0;overflow-y:auto',"LS.get('cg_atv_ab',false)?'':' cg-min'",'<b>Registro de atividades</b></button>','.cg-atvp.cg-min #cg-atv{display:none}'])assert.ok(cap.includes(x),x);
  assert.ok(!cap.includes('Todos os usuários e o painel do Desembargador'),'título só "Registro de atividades"');
});

test('Triagem: Acervo filtrado com faixa de cabeçalho e seletor segmentado; Visão geral sobre o bege',()=>{
  const cap=require('fs').readFileSync(require('path').join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  for(const x of ['<header class="acf-h"><span class="k">Acervo filtrado</span>','.acf .pre{margin-left:auto;display:flex','<div class="acf-b"><div class="acf-n">','.tri-vg{background:transparent!important}','.tri-vg .ch{background:#f2ede1 url(','.tri-vg .tri-vg-h,.acf-h,.fl-cab>.chips{background:var(--bg) url(','body{background-image:url("data:image/svg+xml'])assert.ok(cap.includes(x),x);
});

test('Cartões de indicadores no padrão da Visão geral (Chefia, Coordenação, Comunicação, Pautas e mesa); fundo geral mais claro',()=>{
  const cap=require('fs').readFileSync(require('path').join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  for(const x of [':root{--bg:#fcfbf8;','.cg-top .cg-faixa>div,.cwe-kpis>span,.cwe-kpis>button{display:flex;flex-direction:column','box-shadow:inset 0 3px 0 var(--kc)','.kp>div:nth-child(4n+1){--kc:#a57829}'])assert.ok(cap.includes(x),x);
});

test('Mesa: coluna de capacidade inteira (sem rolagem) e regras de minuta e correção num painel só, acima da lista',()=>{
  const cap=require('fs').readFileSync(require('path').join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  for(const x of ['class="cwe-box cwe-rg cwe-rg1${rmin ? \' min\' : \'\'}" slot="regras"','<div class="cwe-rg2">${col(\'d\', \'MINUTA\')}${col(\'c\', \'CORREÇÃO\')}</div>',"sl.name = 'regras'",'.mb.emb .side{position:static!important;align-self:start;max-height:none!important;overflow:visible!important}','cwe-sr1" slot="regras"'])assert.ok(cap.includes(x),x);
});

test('Mesa: sem "Editar regras" no painel de regras; faixa de seleção dentro do cabeçalho fixo',()=>{
  const cap=require('fs').readFileSync(require('path').join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  assert.ok(!cap.includes('data-cwe="cfg-3"'),'sem Editar regras');
  assert.ok(cap.includes("tp.appendChild(sb);")&&cap.includes('.mb.emb .top>.selbar{order:9;flex:1 0 100%'),'seleção no cabeçalho');
  assert.ok(cap.includes('<h1>Pautas.</h1><button type="button" class="cwe-pt-n" data-cwe="ses-nova"'),'título da página');
});

test('Mesa: painel REGRAS NESTA ORDEM recolhível (lembra a escolha)',()=>{
  const cap=require('fs').readFileSync(require('path').join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  for(const x of ['data-cwe="rgmin"',"else if (k === 'rgmin')",'.cwe-rg1.min .cwe-rg2,.cwe-rg1.min .h small{display:none}'])assert.ok(cap.includes(x),x);
});

test('Pautas: seletor de sessões com rolagem, três por vez; assuntos sem regra junto das regras na mesa',()=>{
  const cap=require('fs').readFileSync(require('path').join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  for(const x of ['.cwe-nav .cwe-ses{max-height:178px;overflow-y:auto','cwe-sr1" slot="regras"',"::slotted([slot=regras]){margin:0 0 12px}"])assert.ok(cap.includes(x),x);
});

test('Mesa: capacidade e carga à direita, no padrão da esteira',()=>{
  const cap=require('fs').readFileSync(require('path').join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  assert.ok(cap.includes('.mb.emb .lay{grid-template-columns:minmax(0,1fr) 262px!important}.mb.emb .side{order:2}.mb.emb .side{gap:18px!important}.mb.emb .side .card{background:transparent!important;border:0!important;border-top:1px solid #235a55!important'));
});

test('Pautas: gravação ocupada (mesa gravando) não vira laço que trava a página',()=>{
  const cap=require('fs').readFileSync(require('path').join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  assert.ok(cap.includes('else if (r && r.ocupado) {')&&cap.includes('G.prox = Date.now() + 2000; }'),'espera antes de tentar de novo');
  assert.ok(cap.includes("if (n && !G.gravando && pronto && !s.gravando?.()) {"),'não dispara com outra gravação em curso');
});

test('Motor: fila única de gravação (sem "ocupado" em laço)',()=>{
  const m=require('fs').readFileSync(require('path').join(__dirname,'../../../caput/motor/assets/js/21-sessoes-equipe.js'),'utf8');
  assert.ok(m.includes('var FILA_G = null, ATUAL_G = null;')&&m.includes('async function gravarUmaVez()')&&m.includes('FILA_G = ATUAL_G.catch(function () {}).then(function () { FILA_G = null; return gravar(); })'));
});

test('Marcos: digitação do ano não grava 0001 nem perde o campo',()=>{
  const cap=require('fs').readFileSync(require('path').join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  assert.ok(cap.includes("if (t.value && +t.value.slice(0, 4) < 2000) return;"),'ano incompleto não entra');
  assert.ok(cap.includes("if (document.activeElement === t && !t.classList.contains('mkhid'))"),'sem redesenhar com o campo em uso');
});
