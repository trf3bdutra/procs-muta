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
  assert.ok(page.includes("$('#abas').innerHTML = tabEsc();")&&!page.includes("t('fila', 'Triagem'"),'Triagem é a página; só Escaninhos é sub-aba');
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
  assert.ok(cap.includes('.tri-vg-h{background:#e9f0ed')&&cap.includes('.tri-vg-c .ch{background:#eef3f1'),'fundo dos cabeçalhos');
});
