'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function motor(julgamento=''){
 const s=read('apoio/modus-operandi/fonte/ementario.js'),a=s.indexOf('var MODSEL={}'),z=s.indexOf("document.addEventListener('change',function(ev)",a),m=JSON.parse(read('modelos/matrizes-2886.json'));m.grupos.forEach(g=>g.julgamento=['8','3d'].includes(g.id)?'ed':g.id==='9'?'agint':'ap');
 const api=new Function('XD','XS','window','CQX','dkJulgAtual',s.slice(a,z)+';return {MODSEL,modeloChave,modeloBlocos,modeloGrupos};')({proc:'0000000-00.2026.4.03.6000'},{ed:'pecas'},{CQX:{tem:()=>!!julgamento}},{tem:()=>!!julgamento},()=>julgamento);
 return {api,modelo:{id:'mod-cumprimento-acp-2886',modular:m}};
}
test('todos os grupos mantêm o dispositivo e versões na folha comum',()=>{const {api,modelo}=motor();assert.equal(modelo.modular.grupos.length,10);assert.equal(modelo.modular.modulos.length,44);assert.equal(modelo.modular.variaveis.length,40);for(const g of modelo.modular.grupos){api.MODSEL[api.modeloChave(modelo)]=g.id;const v=api.modeloBlocos(modelo,'voto'),r=api.modeloBlocos(modelo,'relatorio');assert.ok(r.length>0);assert.ok(v.every(x=>x.alts.length));assert.ok(v.some(x=>x.n==='Dispositivo'&&x.alts[0].f===g.dispositivo));}});
test('sem grupo confirmado não usa dispositivo do grupo anterior',()=>{const {api,modelo}=motor();assert.equal(api.modeloBlocos(modelo,'voto')[0].n,'Enquadramento pendente');});
test('embargos não permitem escolher hipótese de apelação',()=>{const {api,modelo}=motor('ed');assert.deepEqual(api.modeloGrupos(modelo).map(g=>g.id),['8','3d']);api.MODSEL[api.modeloChave(modelo)]='1';assert.equal(api.modeloBlocos(modelo,'voto')[0].n,'Enquadramento pendente');});
