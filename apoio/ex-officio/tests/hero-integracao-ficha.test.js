'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const g=fs.readFileSync(path.join(root,'extensao/gabinete.js'),'utf8'),j=fs.readFileSync(path.join(root,'extensao/gerador.js'),'utf8');
const F=JSON.parse(fs.readFileSync(path.join(root,'padrao/ficha.json'),'utf8'));
const map=g.slice(g.indexOf('var MAPA ='),g.indexOf('function rascunho()')),methods=g.slice(g.indexOf('function opVal(op, id)'),g.indexOf('window.MutaMapa ='));
const mock=`var ESP={ed:'Embargos de declaração',agint:'Agravo interno',jr:'Juízo de retratação'},HON={},RES={},VM=()=>({}),G={gestor:true};function S(v){return String(v==null?'':v).trim();}function N(v){return S(v).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();}function getP(o,p){return p.split('.').reduce((a,k)=>a==null?undefined:a[k],o)}function setP(o,p,v){let a=p.split('.'),x=o;for(let i=0;i<a.length-1;i++)x=x[a[i]]||(x[a[i]]={});x[a.at(-1)]=v;}function inv(m){return Object.fromEntries(Object.entries(m).map(([k,v])=>[v,k]))}`;
const api=new Function(mock+map+methods+'return {camposFicha,trazerFicha,opVal,juntarTipo};')();
test('espelha só edição efetiva e preserva seleção múltipla',()=>{
const base={origem:{},caso:{subassunto:'antigo',tipoManual:'ed'},julgamento:{fundamentacao:'antiga'}},f={origem:{},caso:{subassunto:'antigo',tipoManual:'agint'},julgamento:{fundamentacao:'nova'}},op={triagem:{'Detalhamento do caso':'editado por outro','Tipo de Julgamento':'Apelação + Embargos de declaração'},producao:{'Voto - Descrição':'antiga'}};
const out=api.camposFicha(f,op,true,base);
assert.equal(out['triagem.Detalhamento do caso'],undefined);
assert.equal(out['triagem.Tipo de Julgamento'],'Apelação + Embargos de declaração + Agravo interno');
assert.equal(out['producao.Voto - Descrição'],'nova');
});
test('detalhamento legado só preenche chave canônica ausente',()=>{
assert.equal(api.opVal({triagem:{Tema:'A',Especificidades:'B'}},'triagem.Detalhamento do caso'),'A\nB');
assert.equal(api.opVal({triagem:{Tema:'A','Detalhamento do caso':''}},'triagem.Detalhamento do caso'),'');
});
const gen=new Function("function S(v){return String(v==null?'':v).trim();}"+j.slice(j.indexOf('var CONTRATO_FICHA='),j.indexOf('function aliasesFicha('))+'return {mapaFicha,fonteCampo};')();
test('contrato do Gerador reflete ficha e seletor de destino',()=>{const real=gen.mapaFicha(F),keys=x=>x.map(c=>(c.s||'acervo')+'.'+c.k).sort();assert.deepEqual(keys(real),keys(gen.mapaFicha(null)));assert.ok(real.some(c=>c.k==='Destino'&&c.s==='producao'));});
test('fonte DataJud aninhada não vira objeto em texto',()=>{assert.equal(gen.fonteCampo({k:'DataJud · Situação',f:['DataJud','Situação']},{DataJud:{Situação:'Ativo'}}),'Ativo');});
