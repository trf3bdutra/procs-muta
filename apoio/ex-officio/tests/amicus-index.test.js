'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('apoio/ex-officio/lotes/index.html');
const api=read('apoio/ex-officio/api/_lote.js');
const workflow=read('.github/workflows/vercel-caput.yml');
test('CORTEX e backend possuem JavaScript sintaticamente válido',()=>{
 new vm.Script(api,{filename:'_lote.js'});
 const scripts=[...app.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>0);
 scripts.forEach((m,i)=>new vm.Script(m[1],{filename:'collectio-script-'+i+'.js'}));
});
test('Amicus tem URLs canônicas e redirecionamentos de compatibilidade',()=>{
 for(const x of ['site/public/amicus/cortex/cg','site/public/amicus/cortex/cmt','site/public/amicus/cortex/gc','site/public/amicus/compendium','site/public/amicus/index.html']) assert.ok(workflow.includes(x),x);
 for(const x of ['/index/cmt','/index/gc','/lote/cg','/amicus/compendium/']) assert.ok(workflow.includes(x),x);
 assert.ok(app.includes('/amicus/cortex/cg/'));
 assert.ok(!workflow.includes('"destination":"/amicus/cortex/cmt/"'),'rotas antigas do CMT levam à página geral');
 assert.ok(read('apoio/amicus/index.html').includes('/amicus/compendium/'));
});
test('Seletor separa sessões e lotes avulsos',()=>{
 for(const x of ['seletorColecoes(lotes,id)','Coleção de Pauta','Coleções Avulsas','Matriz geral','sel-sessao','sel-pauta']) assert.ok(app.includes(x),x);
 assert.ok(app.includes("tipo:'avulso'"));
 assert.ok(api.includes("tipo=b.tipo==='pauta'?'pauta':'avulso'"));
 assert.ok(api.includes("ss.length!==1"));
});
test('Matriz automática agrupa assuntos da sessão e não modifica o acervo',()=>{
 for(const x of ['async function indicePauta(s)','rotuloAssunto(it)','virtual:true','it.grupo=id']) assert.ok(api.includes(x),x);
 assert.ok(app.includes("if(LOTE.virtual)"));
 assert.ok(app.includes("if(MODO==='cg' && !LOTE.virtual)ligaVis()"));
 assert.match(api,/const sessaoVirtual=\/\^pauta-\(\\d\{4\}/);
});
test('Permissões originais preservadas',()=>{
 assert.ok(api.includes("CMT.porChave(req)"));
 assert.ok(api.includes("if (!gestor) return res.status(403)"));
 assert.ok(api.includes('loteVe(lote)'));
 assert.ok(api.includes('it.verRelator'));
});
test('CORTEX tem só as páginas Geral e CG; cabeçalho enxuto',()=>{
 assert.ok(!/MODO=.*'rel'/.test(app.split('\n').find(l=>l.startsWith('const MODO='))||''),'sem modo CMT');
 for(const x of ['id="b-topo"','class="hb ic" id="tema"','class="lx-ir"']) assert.ok(app.includes(x),x);
 for(const x of ['Painel do relator</span>','CORTEX · CMT</span>','Matriz ↑']) assert.ok(!app.includes(x),x);
});
test('Leitura da pauta tira o cabeçalho da sessão grudado no processo',()=>{
 const m=api.match(/const CAB_SESSAO = .*;\nconst limpaPauta = .*;/); assert.ok(m);
 const f=new Function(m[0]+';return limpaPauta')();
 assert.equal(f('Atraso na Entrega do Imóvel Sessão de Julgamento ORDINÁRIA PRESENCIAL / VIDEOCONFERÊNCIA, segunda- feira, 7 de dezembro de 2026 às 14:00'),'Atraso na Entrega do Imóvel');
 assert.equal(f('Índice de 28,86% LL 8.622/1993 e 8.627/1993'),'Índice de 28,86% Lei 8.622/1993 e 8.627/1993');
});
test('Matriz: clique isola o assunto e o cabeçalho tem expandir/minimizar todos',()=>{
 for(const x of ['function aplicaSelG()','ev.ctrlKey||ev.metaKey','id="g-todos"','id="b-min-tudo" data-min-tudo']) assert.ok(app.includes(x),x);
 assert.ok(!app.includes('title="Mostrar ou ocultar"'));
});
test('Compendium (correspondências) é aba do painel lateral, não seção da página',()=>{
 assert.ok(!app.includes('id="col-correspondencias"'));
 for(const x of ['data-cx="cor"','id="cx-cor"','id="cl-cor-carregar"','id="cl-cor-body"','CX_TIT']) assert.ok(app.includes(x),x);
});
test('Pendência do prontuário confrontada com a tabela de peças',()=>{
 const m=app.match(/const semAc=[\s\S]*?\nfunction dl\(/); assert.ok(m);
 const confPend=new Function(m[0].replace(/\nfunction dl\($/,'')+';return confPend')();
 const P={pecas:[{desc:'Sentença extintiva',id:'396555413'},{desc:'Apelação do exequente',id:'396555414'},{desc:'Contrarrazões da União',id:'396555416'}]};
 assert.match(confPend('Confirmar o número de identificação da peça de apelação no segundo grau; não consta nos dados fornecidos.',P,{}),/já traz Apelação do exequente \(ID 396555414\)/);
 assert.match(confPend('Confirmar no sistema o ID 598870878 atribuído à sentença.',P,{}),/ID 598870878 não está na tabela de peças, que registra sentença com ID 396555413/);
 assert.equal(confPend('Conferir a tempestividade.',P,{}),'');
});
test('Barra do Amicus Curiae: CORTEX e Compendium com a mesma barra, sem citar um ao outro, ambos com o Ex Officio',()=>{
 const build=read('apoio/modus-operandi/fonte/build.py'), nav=read('apoio/modus-operandi/fonte/nav_editorial.css');
 assert.ok(!app.includes('title="Compendium: Ementário'),'CORTEX sem o Compendium na barra');
 assert.ok(app.includes('href="/exofficio/" title="Ex Officio'));
 assert.ok(build.includes('CMT · Amicus Curiae') && build.includes('<span>Ex Officio</span>'));
 assert.ok(!/collectio/i.test(build.slice(build.indexOf('EXO = '),build.indexOf("a = '  </div>\\n</header>\\n'"))),'Compendium sem o CORTEX na barra');
 assert.ok(nav.includes('header.top.nx #cmp-nav{flex:0 1 auto;min-width:0;overflow-x:auto'));
});

test('Portal Amicus: visão geral dentro do cabeçalho e duas colunas laterais',()=>{
 const home=read('apoio/amicus/index.html'), shared=read('apoio/amicus/header.py');
 const hd=home.match(/<header class="am-home-header">([\s\S]*?)<\/header>/);assert.ok(hd);
 assert.match(hd[1],/am-over-head am-home-overview/);assert.match(hd[1],/am-over-nav am-home-overview/);
 assert.match(home,/<aside class="am-rail am-apps"/);assert.match(home,/<aside class="am-rail am-refs"/);
 for(const id of ['jurisprudencia','enunciados','regimento','fluxos','competencia','impedimentos']){
  assert.equal((home.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  assert.ok(home.includes('href="#'+id+'"'),id);
 }
 assert.ok(shared.includes("!e.classList.contains('am-home-overview')"));
 for(const m of home.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});
