'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('apoio/ex-officio/lotes/index.html');
const api=read('apoio/ex-officio/api/_lote.js');
const workflow=read('.github/workflows/vercel-monitor.yml');
test('Collectio e backend possuem JavaScript sintaticamente válido',()=>{
 new vm.Script(api,{filename:'_lote.js'});
 const scripts=[...app.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>0);
 scripts.forEach((m,i)=>new vm.Script(m[1],{filename:'collectio-script-'+i+'.js'}));
});
test('Amicus tem URLs canônicas e redirecionamentos de compatibilidade',()=>{
 for(const x of ['site/public/amicus/collectio/cg','site/public/amicus/collectio/cmt','site/public/amicus/collectio/gc','site/public/amicus/compendium','site/public/amicus/index.html']) assert.ok(workflow.includes(x),x);
 for(const x of ['/index/cmt','/index/gc','/lote/cg','/amicus/compendium/']) assert.ok(workflow.includes(x),x);
 assert.ok(app.includes('/amicus/collectio/cg/'));
 assert.ok(!workflow.includes('"destination":"/amicus/collectio/cmt/"'),'rotas antigas do CMT levam à página geral');
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
test('Collectio tem só as páginas Geral e CG; cabeçalho enxuto',()=>{
 assert.ok(!/MODO=.*'rel'/.test(app.split('\n').find(l=>l.startsWith('const MODO='))||''),'sem modo CMT');
 for(const x of ['id="b-topo"','class="hb ic" id="tema"','class="lx-ir"']) assert.ok(app.includes(x),x);
 for(const x of ['Painel do relator</span>','Collectio · CMT</span>','Matriz ↑']) assert.ok(!app.includes(x),x);
});
test('Leitura da pauta tira o cabeçalho da sessão grudado no processo',()=>{
 const m=api.match(/const CAB_SESSAO = .*;\nconst limpaPauta = .*;/); assert.ok(m);
 const f=new Function(m[0]+';return limpaPauta')();
 assert.equal(f('Atraso na Entrega do Imóvel Sessão de Julgamento ORDINÁRIA PRESENCIAL / VIDEOCONFERÊNCIA, segunda- feira, 7 de dezembro de 2026 às 14:00'),'Atraso na Entrega do Imóvel');
 assert.equal(f('Índice de 28,86% LL 8.622/1993 e 8.627/1993'),'Índice de 28,86% Lei 8.622/1993 e 8.627/1993');
});
