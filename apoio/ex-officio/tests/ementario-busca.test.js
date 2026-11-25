'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../modus-operandi/fonte'),js=fs.readFileSync(path.join(root,'ementario.js'),'utf8'),html=fs.readFileSync(path.join(root,'template.html'),'utf8'),css=fs.readFileSync(path.join(root,'ementario.css'),'utf8');
const slice=(a,b)=>js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a)));
function engine(){const c=vm.createContext({nz:s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),STOP:{de:1,a:1,o:1,do:1,e:1},E:{q:'',qparts:[]},$:_=>({value:c.draft||''})});vm.runInContext(slice('function reEsc(','function conta1(')+slice('function qTermEncode(','window.VDM_ementQueryParts='),c);return c;}
test('Ementário: etiquetas no campo, sem formulário separado',()=>{
  assert.doesNotThrow(()=>new vm.Script(js));
  for(const id of ['e-q','e-qterms','e-qgo','e-qaj','e-qactions','e-qmodo','e-modes','e-cnt'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  assert.doesNotMatch(html,/id="e-qbuilder/);
  assert.match(css,/\.e-query-field\{display:flex/);
  assert.match(js,/e\.key==='Enter'\)\{e\.preventDefault\(\);qTermCommit\(\)/);
});
test('Enter acumula frases exatas e termos com E, sem duplicatas',()=>{
 const c=engine();c.draft='tempo especial';let p=c.qTermDraft();assert.equal(p.join(' '),'"tempo especial"');c.E.qparts=p;c.E.q=p.join(' ');c.draft='aposentadoria';p=c.qTermDraft();assert.equal(p.join(' '),'"tempo especial" aposentadoria');c.E.qparts=p;c.E.q=p.join(' ');c.draft='APOSENTADORIA';assert.equal(c.qTermDraft().length,2);let q=c.parseQ(c.E.q);assert.equal(c.casa(q,'aposentadoria tempo especial'),true);assert.equal(c.casa(q,'aposentadoria especial tempo'),false);assert.equal(c.casa(q,'tempo especial'),false);
});
test('Mantém operadores explícitos e consulta recebida de outro painel',()=>{
 const c=engine();assert.equal(c.qTermEncode('vigilante OU vigia'),'vigilante OU vigia');assert.equal(c.qTermEncode('-rural'),'-rural');assert.equal(c.qTermEncode('aposentad*'),'aposentad*');c.E.q='vigilante OU vigia';c.draft='tempo especial';assert.equal(c.qTermDraft().join(' '),'vigilante OU vigia "tempo especial"');assert.equal(c.casa(c.parseQ(c.qTermDraft().join(' ')),'vigia tempo especial'),true);
});

test('Operadores TRF3: booleanos, grupos, exclusão e radicais',()=>{
 const c=engine(),m=(q,t)=>c.casa(c.parseQ(q),t);
 assert.equal(m('(vigilante OU vigia) E aposentadoria NÃO rural','aposentadoria vigia'),true);
 assert.equal(m('(vigilante OU vigia) E aposentadoria NÃO rural','aposentadoria vigilante rural'),false);
 assert.equal(m('previdenci$','previdenciario'),true);
 assert.equal(m('previdenci$','aprevidenciario'),false);
 assert.equal(m('aposentadoria E (rural OU urbana)','aposentadoria'),false);
 assert.ok(c.parseQ('rural OU').error);assert.ok(c.parseQ('(rural').error);assert.ok(c.parseQ('a ADJ100 b').error);
});
test('Proximidade por distância, ordem e fronteira de campo/parágrafo',()=>{
 const c=engine(),m=(q,t)=>c.casa(c.parseQ(q),t);
 assert.equal(m('ruido ADJ3 exposicao','ruido com intensa exposicao'),true);
 assert.equal(m('ruido ADJ2 exposicao','ruido com intensa exposicao'),false);
 assert.equal(m('ruido ADJ3 exposicao','exposicao ao ruido'),false);
 assert.equal(m('ruido PROX3 exposicao','exposicao ao ruido'),true);
 assert.equal(m('ruido PROX3 exposicao','exposicao\truido'),false);
 assert.equal(m('ruido MESMO exposicao','ruido\u2029exposicao'),true);
 assert.equal(m('ruido MESMO exposicao','ruido\texposicao'),false);
 assert.equal(m('ruido COM exposicao','ruido\u2029exposicao'),false);
 assert.equal(m('ruido COM exposicao','ruido e exposicao'),true);
 assert.equal(m('causa ADJ(2) aumento ADJ2 pena','causa de aumento da pena'),true);
});
