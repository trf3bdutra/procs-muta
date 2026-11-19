'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('apoio/ex-officio/api/_lote.js'),ui=read('apoio/ex-officio/lotes/index.html');
const {avaliar,classe,resultado}=require('../api/_collectio_correspondencias');
const estrut=JSON.parse(read('modelos/matrizes-estruturais.json'));
const modular=JSON.parse(read('modelos/matrizes-2886.json'));
const lote=JSON.parse(read('acervo/lotes/2886.json'));
test('a sessão não é cadastrada como coleção; o gestor consulta matriz virtual por sessão',()=>{
 assert.ok(js.includes('const sessoes = agenda.filter'));
 assert.ok(js.includes("colecoes:{avulsas:"));
 assert.ok(!js.includes('lotes.push({id,titulo:\'Matriz geral'));
 assert.ok(js.includes("const sessaoVirtual=/^pauta-(\\d{4}-\\d{2}-\\d{2})$/.exec(id)"));
 assert.ok(ui.includes('Coleção de Pauta'));
 assert.ok(ui.includes('Coleções Avulsas'));
 assert.ok(ui.includes('id="sel-sessao"'));
});
test('o lote de pauta resulta da seleção explícita com validação de pertencimento',()=>{
 for(const t of ["b.acao === 'criar-selecao'","new Set(pedidos).size!==pedidos.length","pedidos.some(c=>!porCnj.has(c))","tipo:'pauta',origem:'selecao'","agruparPorAssunto(lote)"])assert.ok(js.includes(t),t);
 assert.ok(js.includes("if(tipoLote(lote)==='pauta') return res.status(400)"));
 for(const t of ['data-csel=','Selecionar filtrados','criarDaMatriz','csel-criar','processos:escolhidos.map'])assert.ok(ui.includes(t),t);
});
test('matching formal observa classe e resultado, sem confundir com identidade do mérito',()=>{
 assert.equal(classe('ApCiv'),'apelação');
 assert.equal(classe('EDcl'),'embargos de declaração');
 assert.equal(classe('AI'),'agravo de instrumento');
 assert.equal(resultado('Desprovido'),'desprovimento');
 assert.equal(resultado('Parcialmente provido'),'parcial provimento');
 const r=avaliar({id:'teste',titulo:'Teste',grupos:[{id:'a',rotulo:'Prova'}],
   itens:[{grupo:'a',assunto:'Prova',recurso:'Apelação',resultado:'Desprovido',modelo:''}]},estrut,null);
 assert.equal(r.grupos.length,1);
 assert.ok(r.grupos[0].estruturais.some(x=>x.referencias.length>0));
 assert.equal(r.grupos[0].tematica,null);
});
test('matriz modular de 28,86% usa os grupos, módulos e variáveis efetivos do Compendium',()=>{
 const r=avaliar(lote,estrut,modular);
 assert.equal(r.total,lote.itens.length);
 assert.equal(r.materiaCompendium,'28,86%');
 assert.ok(r.grupos.some(g=>g.id==='1'&&g.tematica&&g.tematica.id==='1'));
 const g=r.grupos.find(x=>x.id==='1');
 assert.ok(g.tematica.modulos.some(x=>x.id==='ABR'));
 assert.ok(g.tematica.variaveis.some(x=>x.id==='sentenca_id'));
 assert.equal(g.tematica.variaveis.length,modular.variaveis.length);
 assert.ok(g.tematica.variaveis.some(x=>x.situacao==='conferir nos autos'));
 assert.ok(r.limites.some(x=>x.includes('Sem leitura automática')));
});
