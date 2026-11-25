'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('primeiro grau tem leitor isolado, não troca o prontuário e não recebe comandos de edição',()=>{
 const m=JSON.parse(read('extensao/manifest.json')),s=m.content_scripts.find(c=>c.js.includes('conteudo-1g.js'));
 assert.ok(s.matches.includes('https://pje1g-jus.trf3.jus.br/*'));assert.deepEqual(s.js,['conteudo-1g.js']);
 const p=read('extensao/pje.js');assert.match(p,/prontuário de 2º grau preservado/);assert.match(p,/muta-autos-referencia/);
 const c=read('extensao/conteudo-1g.js');assert.doesNotMatch(c,/muta-inserir|muta-doc'|muta-sinal/);assert.match(c,/numero\.replace/);
});
test('peças de origem têm CNJ e ID próprios, com validação no servidor',()=>{
 const w={},d={addEventListener(){}};
 new Function('window','document',read('extensao/referencia-1g.js'))(w,d);
 const r=w.MutaReferencia.linhasDaLeitura({itens:[{data:'01/02/2026',docs:[{id:'123456789',tipo:'Sentença'},{id:'123456790',tipo:'Documento sigiloso'},{id:'123456789',tipo:'Sentença'}]}]},'5000000-00.2026.4.03.6001');
 assert.equal(r.length,1);assert.equal(r[0].data,'2026-02-01');assert.equal(r[0].cnj_referencia,'5000000-00.2026.4.03.6001');
 assert.ok(w.MutaReferencia.tem(r[0],r));assert.ok(!w.MutaReferencia.tem({...r[0],cnj_referencia:'5000000-00.2026.4.03.6002'},r));
 const a=read('apoio/ex-officio/api/_ficha.js');assert.match(a,/dg\(x.cnj_referencia\)!==ref/);assert.match(a,/mesclarReferencia\(r\[s\]\[k\],raw\)/);
});
