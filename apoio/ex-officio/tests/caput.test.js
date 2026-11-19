'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('monitor/triagem/index.html');
const legacy=read('monitor/index.html');
const wf=read('.github/workflows/vercel-monitor.yml');
test('Caput é a central principal e preserva módulos existentes',()=>{
  assert.ok(page.includes('<title>Caput · Central do Gabinete</title>'));
  for(const id of ['triagem','pautas','coordenacao','comunicacao','inteligencia','chefia']){
    assert.ok(page.includes('data-mod="'+id+'"'),'módulo '+id);
  }
  assert.ok(page.includes("D.title = 'Caput · ' + tit"));
});
test('A entrada Caput abre Inteligência e Pautas permanecem acessíveis',()=>{
  assert.match(page,/const eCaput=\/\^/);
  assert.ok(page.includes("eCaput?'inteligencia':'fila'"));
  assert.ok(page.includes("ehPautas?'pautas'"));
  assert.ok(page.includes("location.hash"));
});
test('Caput é servido sem duplicar APIs ou motor',()=>{
  for(const x of ['site/public/caput/index.html','site/public/caput/pautas/index.html','site/public/monitor/triagem/index.html'])assert.ok(wf.includes(x),x);
  for(const x of ['/init/assets/js/regras-gerais.js','/init/assets/js/gh-ponte.js'])assert.ok(page.includes(x),x);
  assert.ok(legacy.includes("location.replace('/caput/' + location.hash)"));
});
test('Rotas históricas redirecionam à central sem alterar os dados',()=>{
  for(const x of ['/triagem','/pautas','/caput/#fila','/caput/#pautas'])assert.ok(wf.includes(x),x);
  const script=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(script.length>0);
  script.forEach((m,i)=>new vm.Script(m[1],{filename:'caput-script-'+i+'.js'}));
});
