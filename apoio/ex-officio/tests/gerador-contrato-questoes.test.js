'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function ger(){const w={};new Function('window',read('extensao/gerador.js'))(w);return w.MutaGerador;}
test('resposta histórica e MPF desconhecido são tratados distintamente',()=>{
 const d=ger().comporFicha({'origem.Contrarrazões - Situação':'nao'},{},'Apelação');assert.equal(d.variaveis.contrarrazoes_relatorio,'Não houve contrarrazões.');assert.match(d.variaveis.parecer_relatorio,/VALIDAR/);
});
test('questões só alimentam fundamentação depois de confirmadas',()=>{
 const q={ordem:'1',questao:'Qualidade de segurado',alegacao:'Perda da qualidade',tese_adotada:'Tese de teste',fundamentacao:'Fundamento de teste',confirmado:'Não'};
 const g=ger(),key='triagem.Questões jurídicas individualizadas';let d=g.comporFicha({[key]:[q]}, {},'Apelação');assert.match(d.variaveis.aplicacao_ao_caso_concreto,/VALIDAR/);assert.doesNotMatch(d.variaveis.aplicacao_ao_caso_concreto,/Fundamento de teste/);
 d=g.comporFicha({[key]:[{...q,confirmado:'Sim'}]}, {},'Apelação');assert.match(d.variaveis.aplicacao_ao_caso_concreto,/Fundamento de teste/);
});
test('dupla apelação não recebe resultado global quando falta vínculo',()=>{
 const g=ger(),cp={'origem.Recursos':[{ids:'123456789',parte:'INSS'},{ids:'123456780',parte:'Parte autora'}],'producao.Voto - Resultado':'Desprovido'};
 assert.match(g.comporFicha(cp,{},'Apelação').variaveis.dispositivo_voto,/conferir resultado individual/);
 cp['producao.Resultado por recurso']=[{id_recurso:'123456789',recorrente:'INSS',resultado:'Desprovido'},{id_recurso:'123456780',recorrente:'Parte autora',resultado:'Provido'}];
 assert.match(g.comporFicha(cp,{},'Apelação').variaveis.dispositivo_voto,/nego provimento.*dou provimento/);
});
test('contrato compartilhado na ficha e leitura por ID',()=>{
 const f=JSON.parse(read('padrao/ficha.json')),q=f.abas.flatMap(a=>a.grupos.flatMap(g=>g.campos)).filter(c=>c.chave==='Questões jurídicas individualizadas');assert.equal(q.length,2);assert.deepEqual(q[0].colunas,q[1].colunas);assert.match(read('extensao/autos.js'),/sugerirQuestoes/);assert.match(read('extensao/autos.js'),/Object\.values\(TB\.rec\), 'ids'/);
});