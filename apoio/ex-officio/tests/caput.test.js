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
  assert.ok(page.includes('function vRelatorios()')&&page.includes("abas:['escopo','destino','acervo','calendario','etiquetas']")&&page.includes("abas:['equipe','designacao','produtividade']"),'Inteligência na Chefia; equipe e regras na Coordenação');
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
  assert.ok(page.includes("if (!emE && !F.conj) h += visaoGeral();"));
  assert.ok(page.includes('class="btn ico" id="')&&!page.includes('data-ex-xlsx title="Planilha do Excel formatada, com todas as colunas">Excel</button>'),'Excel e Exportar num botão de ícone');
});

test('Desempenho e início: motor escondido não redesenha; Chefia é a página inicial; só a Triagem espera o acervo; calendário na Chefia',()=>{
  const fs=require('fs'),p=require('path'),cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8'),mot=fs.readFileSync(p.join(__dirname,'../../../caput/motor/index.html'),'utf8');
  assert.ok(mot.includes('__oculto()')&&mot.includes('this.__sujo = true')&&mot.includes('this.__vigiaVisivel()'),'motor sem redesenho escondido');
  assert.ok(cap.includes("return 'chefia';\n}")&&cap.includes("if (!PRONTO && (ABA === 'pautas' || naT))"),'Chefia inicial e só a Triagem espera');
  assert.ok(cap.includes('function calChefia()')&&cap.includes('data-cgcal=')&&cap.includes('data-cgses='),'calendário na Chefia');
});
