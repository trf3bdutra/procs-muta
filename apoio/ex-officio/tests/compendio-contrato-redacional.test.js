'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function gerador(){const w={};new Function('window',read('extensao/gerador.js'))(w);return w.MutaGerador;}
test('ID recorrido nunca é substituído pelo acórdão atual ou por sentença não marcada',()=>{
 const g=gerador(),ed=g.comporFicha({'triagem.Tipo de Julgamento':'Embargos de Declaração','triagem.Impugnada - ID':'123456789','producao.Acórdão - ID':'999999999'},{});assert.equal(ed.variaveis.acordao_recorrido_id,'123456789');assert.match(ed.rel[0],/123456789/);assert.doesNotMatch(ed.rel[0],/999999999/);
 const ai=g.comporFicha({'triagem.Tipo de Julgamento':'Agravo de Instrumento','origem.Sentença - ID':'987654321'},{});assert.match(ai.variaveis.decisao_agravada_id,/VALIDAR/);assert.doesNotMatch(ai.rel[0],/987654321/);
 const a=g.comporFicha({'triagem.Tipo de Julgamento':'Agravo de Instrumento','origem.1G - Decisão recorrida':'Sim','origem.1G - Decisão ID':'123456789'},{});assert.equal(a.variaveis.decisao_agravada_id,'123456789');
});
test('fragmentos independentes por recurso e ED com efeitos explícitos',()=>{
 const g=gerador(),x=g.comporFicha({'triagem.Tipo de Julgamento':'Apelação','origem.Recursos':[{parte:'autor',ids:'123456789',teses:'reconhecimento do tempo especial'},{parte:'réu',ids:'987654321',teses:'incidência de prescrição'}]},{}).variaveis;
 assert.match(x.recurso_1_razoes,/tempo especial/);assert.doesNotMatch(x.recurso_1_razoes,/prescrição/);assert.match(x.recurso_2_referencia,/987654321/);
 const d=g.comporFicha({'triagem.Tipo de Julgamento':'Embargos de Declaração','producao.Voto - Resultado':'Acolhidos sem efeito infringente'},{}).variaveis;assert.match(d.dispositivo_voto,/sem efeitos modificativos/);
});
test('marcadores de validação permanecem pendentes',()=>{const s=read('apoio/modus-operandi/fonte/ementario.js'),f=new Function(s.slice(s.indexOf('function campoConfirmado('),s.indexOf('function campoValor('))+';return campoConfirmado;')();assert.equal(f('[VALIDAR: ID]'),false);assert.equal(f('texto [VALIDAR: motivo]'),false);assert.equal(f('123456789'),true);});
