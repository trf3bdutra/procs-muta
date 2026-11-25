'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const ROOT=path.resolve(__dirname,'../../..'),A=require(path.join(ROOT,'extensao/prontuario-analise.js'));
test('Tema 1059: parcial exclui majoração; desprovimento exige verba prévia',()=>{
 assert.match(A.indicador({resultado:'Parcialmente provido'}).itens[0],/não majorar/);
 assert.match(A.indicador({resultado:'Negado provimento',sucumbencia:[{honorarios:'Sim'}]}).itens[0],/Examinar majoração/);
 assert.match(A.indicador({resultado:'Não conhecido',sucumbencia:[{honorarios:'Não'}]}).itens[0],/Não há honorários/);
 assert.match(A.indicador({resultado:'Prejudicado'}).itens[0],/causalidade/);
 assert.match(A.indicador({resultado:'Dado provimento',tipo:'Mandado de segurança'}).itens[0],/não cabe/);
 assert.match(A.indicador({resultado:'Negado provimento',multiplos:true}).itens[0],/múltiplos/);
});
test('classificação por ID não apaga os demais; sugestões independentes',()=>{
 assert.deepEqual(A.mesclar([{id:'1',classes:'Principal'},{id:'2',classes:'Relatável'}],[{id:'1',classes:'Comprobatório'}]),[{id:'1',classes:'Comprobatório'},{id:'2',classes:'Relatável'}]);
 assert.ok(A.sugerir({tipo:'Sentença'}).includes('Principal'));
 assert.ok(A.sugerir({tipo:'Sentença'}).includes('Consectários'));
 assert.ok(A.sugerir({tipo:'Procuração'}).includes('Admissibilidade'));
 assert.ok(A.sugerir({tipo:'Laudo pericial'}).includes('Comprobatório'));
});
test('ficha mantém campos antigos; extração e roteiros preservados',()=>{
 const F=JSON.parse(fs.readFileSync(path.join(ROOT,'padrao/ficha.json'),'utf8')),C=F.abas.flatMap(a=>a.grupos.flatMap(g=>g.campos));
 for(const k of ['Síntese Processual','Síntese Fática','Sentença - Honorários','Sentença - Custas','Voto - Resultado','Classificação documental','Sucumbência da decisão recorrida','Resultado por recurso','Ramo do direito','Outros assuntos','Dispositivo do pronunciamento'])assert.ok(C.some(c=>c.chave===k),k);
 const au=fs.readFileSync(path.join(ROOT,'extensao/autos.js'),'utf8'),g=fs.readFileSync(path.join(ROOT,'extensao/gabinete.js'),'utf8');
 assert.match(au,/function extrair\(/);assert.match(au,/function gravarMarcados\(/);assert.match(au,/classificacaoDoc/);
 assert.match(g,/function corpoRoteiro\(/);assert.match(g,/function camposCaso\(/);assert.match(g,/plus-table/);
 new Function(au);new Function(g);
});
test('não interpretar texto misto como desprovimento integral',()=>{
 assert.equal(A.resultado('Não conhecido e dado provimento'),'outro');
 assert.equal(A.resultado('Parcialmente conhecido'),'outro');
 assert.equal(A.resultado('Desprovimento integral'),'desprovimento');
});

test('admissibilidade editável, com base documental e conclusão persistida na ficha',()=>{
 const src=fs.readFileSync(path.join(ROOT,'extensao/roteiro.js'),'utf8'),w={MutaAutos:{sugestoes:()=>[],estado:()=>({itens:false}),doProcesso:()=>({lista:[]})}};
 new Function('window','localStorage',src)(w,{getItem:()=>null,setItem:()=>{}});
 const R=w.MutaRoteiro,v={'triagem.Tipo de Julgamento':'Agravo de instrumento','triagem.ID da Procuração':'123456789','triagem.Representação':'Irregular – intimar','triagem.Cabimento recursal':'Incabível','triagem.Instrução recursal':'Regular','origem.Recursos':[{ids:'987654321',parte:'parte autora',teses:'impugnação dos fundamentos'}]};
 const g={V:(s,k)=>v[s+'.'+k]||'',F:()=>'',cnj:()=> '123'},h=R.html(g,(s,k)=>'<input data-fk="'+s+'.'+k+'">',null,{});
 assert.match(h,/data-fk="triagem.ID da Procuração"/);assert.match(h,/data-fk="triagem.Cabimento recursal"/);assert.match(h,/rt-adm-doc/);assert.match(h,/987654321/);
 const p=R.PASSOS.find(p=>p.id==='cabimento'),ctx={v:g.V};assert.equal(p.estado(ctx),'al');v['triagem.Cabimento recursal']='Cabível';assert.equal(p.estado(ctx),'ok');
});
