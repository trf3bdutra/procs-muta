'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Autos reúne cobertura, localizados e conferência em três seções recolhíveis',()=>{
 const gb=read('extensao/gabinete.js'),au=read('extensao/autos.js'),s=gb.slice(gb.indexOf('function corpoAutos()'),gb.indexOf('/* 0.55:'));
 assert.match(s,/matriz\+loc\+cf/);assert.match(s,/g-au-matriz/);assert.match(s,/g-au-localizados/);assert.match(s,/g-cf/);
 assert.doesNotMatch(au.slice(au.indexOf('function htmlLeitura()'),au.indexOf('function htmlConferir()')),/htmlCobertura/);
});
test('Encaminhamento integra destino, situação, enquadramento e proposta sem diálogos separados',()=>{
 const gb=read('extensao/gabinete.js'),s=gb.slice(gb.indexOf("var encTr=el('section','hero-v53-enc"),gb.indexOf('/* Acompanhamento é'));
 assert.match(s,/encGroup\('tipo'/);assert.match(s,/encGroup\('destino'/);assert.match(s,/encGroup\('enquadramento'/);assert.match(s,/encTr.append\(prop\)/);assert.doesNotMatch(s,/showModal/);
});