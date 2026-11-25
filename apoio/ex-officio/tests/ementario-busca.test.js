'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../modus-operandi/fonte'),js=fs.readFileSync(path.join(root,'ementario.js'),'utf8'),html=fs.readFileSync(path.join(root,'template.html'),'utf8'),css=fs.readFileSync(path.join(root,'ementario.css'),'utf8');
const slice=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a)));
function engine(){const c=vm.createContext({nz:s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),STOP:{de:1,a:1,o:1,do:1,e:1}});vm.runInContext(slice('function reEsc(','function conta1(')+slice('function qBuilderItems(','function qBuilderRead('),c);return c;}
test('Ementário: um painel reúne consulta, critérios, fontes, modos e exportação',()=>{
  assert.doesNotThrow(()=>new vm.Script(js));
  const panel=html.slice(html.indexOf('<section class="e-control-panel"'),html.indexOf('<div id="e-chips">'));
  for(const id of ['e-q','e-qgo','e-qaj','e-qactions','e-qbuilder-toggle','e-qbuilder','e-qall','e-qany','e-qnot','e-qpreview','e-qreset','e-qappend','e-qapply','e-qmodo','e-modes','e-cnt'])assert.equal((panel.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  assert.match(css,/\.e-builder-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(js,/qBuilderBind\(\);/);
  assert.match(js,/clearTimeout\(qT\);\$\('#e-q'\)\.value=E\.q=novo;buscar\(\);/);
});
test('Critérios: todos E, alternativas OU, exclusão de palavras e frases',()=>{
  const c=engine(),q=c.qBuilderQuery('aposentadoria\n tempo especial; aposentadoria','vigilante\nvigia','rural; atividade urbana');
  assert.equal(q,'aposentadoria "tempo especial" vigilante OU vigia -rural -"atividade urbana"');
  const p=c.parseQ(q);
  for(const t of ['aposentadoria tempo especial vigilante','vigia tempo especial aposentadoria'])assert.equal(c.casa(p,t),true,t);
  for(const t of ['aposentadoria tempo especial','aposentadoria especial tempo vigilante','aposentadoria tempo especial vigia rural','aposentadoria tempo especial vigia atividade urbana'])assert.equal(c.casa(p,t),false,t);
});
test('Critérios: radical, deduplicação, palavra reservada e frases com acentos',()=>{
  const c=engine(),q=c.qBuilderQuery('aposentad*; benefício; BENEFÍCIO; "ou"','','de');
  assert.equal(q,'aposentad* benefício "ou" -"de"');
  assert.equal(c.casa(c.parseQ(q),'aposentadoria beneficio ou'),true);
  assert.equal(c.casa(c.parseQ(q),'aposentadoria beneficio ou de'),false);
  assert.equal(c.qBuilderQuery(' ; \n','',''), '');
});