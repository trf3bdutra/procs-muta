'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../../../extensao/gabinete.js'),'utf8');
const fn=new Function(src.slice(src.indexOf('function planoAcompanhamento('),src.indexOf('function tramiteMapa()'))+'return planoAcompanhamento;')();
const hoje='2026-11-26',m={passos:[{id:'a',tipo:'providencia',texto:'A',responsavel:'X',prazo:'2026-11-25',condicao:{vinculo:'P'}},{id:'b',tipo:'ato',texto:'B'},{id:'c',tipo:'providencia',feito:true,prazo:'2026-11-20'}]};
test('dependências, ordem e prazo são projeções, não alterações da ficha',()=>{const antes=JSON.stringify(m),r=fn(m,['P','Q','✓ R'],[{id:'meta',ativo:true,prazo:'2026-11-24'},{id:'sensivel',ativo:false,prazo:'2026-11-24'}],hoje);assert.equal(r.proximo.estado,'condicionado');assert.equal(r.passos[1].estado,'aguardando');assert.equal(r.vencidos,2);assert.deepEqual(r.pendencias,[{texto:'Q'}]);assert.equal(JSON.stringify(m),antes);});
test('resolver a condicionante libera, mas não conclui, o passo',()=>{const r=fn(m,['✓ P'],[],hoje);assert.equal(r.proximo.estado,'disponivel');assert.equal(r.proximo.feito,false);});
test('vínculos ausentes e ambíguos exigem conferência',()=>{assert.equal(fn(m,[],[],hoje).proximo.estado,'vinculo-a-conferir');assert.equal(fn(m,['P','✓ P'],[],hoje).proximo.estado,'vinculo-a-conferir');});
test('passo de pendência usa estado da sinalização, não o campo feito',()=>{const r=fn({passos:[{id:'p',tipo:'pendencia',vinculo:'P',feito:false,prazo:'2026-11-24'}]},['✓ P'],[],hoje);assert.equal(r.abertos,0);assert.equal(r.vencidos,0);assert.equal(r.proximo,null);});
