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
test('composição confirmada mantém comandos e base de cálculo',()=>{
 const w={},s=read('extensao/gerador.js');new Function('window',s)(w);
 const cp={'origem.Sentença - ID':'123456789','origem.Sentença - Comandos':[
 {id_decisao:'123456789',ordem:'1',categoria:'Resultado',redacao:'julgou parcialmente procedente o pedido',confirmado:'Sim'},
 {id_decisao:'123456789',ordem:'2',categoria:'Providência',redacao:'determinou a averbação',confirmado:'Sim'},
 {id_decisao:'123456789',ordem:'3',categoria:'Honorários',redacao:'fixou honorários advocatícios em 10% sobre o valor atualizado da causa',confirmado:'Sim'}]};
 let d=w.MutaGerador.comporFicha(cp,{},'Apelação');assert.equal(d.rel[0],'Trata-se de apelação à sentença (ID 123456789) que julgou parcialmente procedente o pedido; determinou a averbação. Honorários advocatícios fixados em 10% sobre o valor atualizado da causa.');
 cp['producao.Voto - Resultado']='Extinto';assert.match(w.MutaGerador.comporFicha(cp,{},'Apelação').em.cab,/VALIDAR/);
 cp['origem.Sentença - Comandos'][0].confirmado='Não';assert.match(w.MutaGerador.comporFicha(cp,{},'Apelação').rel[0],/conferir capítulos/);
 assert.match(read('extensao/gabinete.js'),/esp\.after\(nt\)/);
});

test('Editorial: honorários dependem de resultado, verba prévia, recorrente e solução registrada',()=>{
 const w={};new Function('window',read('extensao/gerador.js'))(w);
 const cp={'origem.Sentença - Data':'2026-05-02','producao.Voto - Resultado':'Negado provimento','producao.Voto - Honorários':'Majorados','producao.Honorários - Percentual ou valor':'1%','origem.Recursos':[{ids:'123456789',parte:'parte autora'}],'origem.Sucumbência da decisão recorrida':[{devedor:'parte autora',honorarios:'Sim',base:'valor da causa',criterio:'Percentual',percentual:'10',suspensao:'Não',gratuidade:'Indeferida'}]};
 const f=(c,fo={})=>w.MutaGerador.comporFicha(c,fo,'Apelação').variaveis;
 assert.match(f(cp).honorarios_recursais_texto,/deve suportar/);assert.doesNotMatch(f(cp).honorarios_recursais_texto,/gratuidade/);assert.match(f(cp).dispositivo_ementa_ficha,/acréscimo/);
 assert.match(f({...cp,'producao.Voto - Resultado':'Parcialmente provido'}).honorarios_recursais_texto,/incompatível/);
 assert.match(f({...cp,'origem.Sucumbência da decisão recorrida':[]}).honorarios_recursais_texto,/VALIDAR/);
 assert.match(f({...cp,'producao.Voto - Honorários':''},{classe_judicial:'Mandado de segurança'}).honorarios_recursais_texto,/artigo 25/);
 assert.match(f({...cp,'origem.Sentença - Publicação':'2016-03-17'}).honorarios_recursais_texto,/anterior/);
});

test('contrarrazões não verificadas ou contraditórias não viram ausência confirmada',()=>{
 const w={};new Function('window',read('extensao/gerador.js'))(w);
 const x=w.MutaGerador.comporFicha({'origem.Contrarrazões - Situação':'Não verificado'},{},'Apelação');
 assert.match(x.variaveis.contrarrazoes_relatorio,/VALIDAR/);
 const y=w.MutaGerador.comporFicha({'origem.Contrarrazões - Situação':'Não houve','origem.Contrarrazões':[{ids:'123456789'}]},{},'Apelação');
 assert.match(y.variaveis.contrarrazoes_relatorio,/divergência/);
});
