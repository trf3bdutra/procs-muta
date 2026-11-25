'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('extrator estruturado conserva comandos, evidências e base literal',()=>{
 const w={};new Function('window',read('padrao/inteiro-teor.js'))(w);const T=w.CMTInteiroTeor;
 const rows=T.comandosRelatorio({id:'123456789',text:'Relatório. Fundamentação. DISPOSITIVO. Ante o exposto, JULGO PARCIALMENTE PROCEDENTE o pedido. Reconheço o tempo especial. Determino a averbação. Condeno o INSS ao pagamento de honorários de 10% sobre o valor atualizado da causa. Publique-se.'});
 assert.equal(rows.length,4);assert.equal(rows[0].confirmado,'Não');assert.equal(T.sucumbenciaRelatorio(rows)[0].base,'valor atualizado da causa');assert.equal(read('padrao/inteiro-teor.js'),read('extensao/padrao-inteiro-teor.js'));
});
test('Editorial usa as variáveis calculadas e a ficha tem os comandos',()=>{
 const f=JSON.parse(read('padrao/ficha.json'));assert.ok(f.abas.flatMap(a=>a.grupos.flatMap(g=>g.campos)).some(c=>c.chave==='Sentença - Comandos'));
 const e=JSON.parse(read('apoio/modus-operandi/fonte/editorial_pecas.json'));assert.equal(e.pecas.find(p=>p.id==='rel-ap').elementos[0].f,'@abertura_relatorio');
 assert.match(read('extensao/gerador.js'),/confirmadosOrigem/);assert.match(read('extensao/autos.js'),/!it.manual/);
});