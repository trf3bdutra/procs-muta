'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const app=fs.readFileSync(path.join(root,'apoio/ex-officio/lotes/index.html'),'utf8');
const api=fs.readFileSync(path.join(root,'apoio/ex-officio/api/_lote.js'),'utf8');
test('Painel esquerdo: sem título repetido, assuntos filtram como os cartões, só os 8 maiores à vista',()=>{
 assert.ok(!app.includes('<p class="lx-ey">Amicus Curiae · Collectio /'));
 for(const x of ['data-sel-g=','id="lx-vermais"','g-mais','id="g-todos2"']) assert.ok(app.includes(x),x);
 assert.ok(!app.includes('data-ir-g='),'a lista lateral não só rola: filtra');
});
test('Painel direito: análise por processo, seleção ou lote, com rótulos diretos',()=>{
 for(const x of ['data-cesc="proc"','data-cesc="sel"','data-cesc="lote"','function corAlcance()','Igual em todos','falta em ','Abrir na Consulta do Compendium','#v=edit&s=pecas']) assert.ok(app.includes(x),x);
 assert.ok(api.includes("lote.itens = lote.itens.filter(it => gsel.includes(String(it.grupo || '')))"));
 assert.ok(api.includes('String(it.processo || \'\').slice(0, 10) === psel'));
 assert.ok(app.includes('.lx-cx{width:440px}'));
});
