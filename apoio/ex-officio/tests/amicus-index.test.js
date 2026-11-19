'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('apoio/ex-officio/lotes/index.html');
const api=read('apoio/ex-officio/api/_lote.js');
const workflow=read('.github/workflows/vercel-monitor.yml');
test('Index e backend possuem JavaScript sintaticamente válido',()=>{
 new vm.Script(api,{filename:'_lote.js'});
 const scripts=[...app.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>0);
 scripts.forEach((m,i)=>new vm.Script(m[1],{filename:'index-script-'+i+'.js'}));
});
test('Amicus tem URLs canônicas e redirecionamentos de compatibilidade',()=>{
 for(const x of ['site/public/amicus/index/cmt','site/public/amicus/index/gc','site/public/amicus/compendium','site/public/amicus/index.html']) assert.ok(workflow.includes(x),x);
 for(const x of ['/index/cmt','/index/gc','/lote/cg','/modus/']) assert.ok(workflow.includes(x),x);
 assert.ok(app.includes('/amicus/index/cmt/'));
 assert.ok(read('apoio/amicus/index.html').includes('/amicus/compendium/'));
});
test('Seletor separa sessões e lotes avulsos',()=>{
 for(const x of ['opcoesIndices(lotes,id)','Lotes avulsos','Sessão ','Matriz geral']) assert.ok(app.includes(x),x);
 assert.ok(app.includes('gn-tipo'));
 assert.ok(api.includes("tipo=b.tipo==='pauta'?'pauta':'avulso'"));
 assert.ok(api.includes("ss.length!==1"));
});
test('Matriz automática agrupa assuntos da sessão e não modifica o acervo',()=>{
 for(const x of ['async function indicePauta(s)','rotuloAssunto(it)','virtual:true','it.grupo=id']) assert.ok(api.includes(x),x);
 assert.ok(app.includes("if(LOTE.virtual)"));
 assert.ok(app.includes("if(MODO==='cg' && !LOTE.virtual)ligaVis()"));
});
test('Permissões originais preservadas',()=>{
 assert.ok(api.includes("CMT.porChave(req)"));
 assert.ok(api.includes("if (!gestor) return res.status(403)"));
 assert.ok(api.includes('loteVe(lote)'));
 assert.ok(api.includes('it.verRelator'));
});
