'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Competências da equipe: página válida e publicada na Coordenação do Caput',()=>{
  const pag=read('caput/competencias/index.html');
  assert.ok(pag.includes('<script id="dados" type="application/json">{}</script>'),'cópia do repositório sem dados embutidos');
  [...pag.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>new vm.Script(m[1],{filename:'competencias-'+i+'.js'}));
  const wf=read('.github/workflows/vercel-caput.yml');
  assert.ok(wf.includes('cp caput/competencias/index.html site/public/caput/competencias/index.html'));
  const caput=read('caput/triagem/index.html');
  assert.ok(caput.includes('W.CMTCaput = Object.assign'),'Caput expõe o motor à página');
  assert.ok(caput.includes("compEquipe(ABA === 'coordenacao')"),'moldura só na Coordenação');
});
test('Motor: competências, regras de designação e histórico completo',()=>{
  const m=read('caput/motor/assets/js/21-sessoes-equipe.js');
  for(const x of ['equipeCompetencias:','desigRegra:','equipeMatriz:','matrizCarregar','apoio/equipe-matriz.json'])assert.ok(m.includes(x),x);
  const mat=JSON.parse(read('apoio/equipe-matriz.json'));
  assert.ok(Array.isArray(mat.minutas)&&mat.minutas.every(r=>r.length===11),'linha da matriz com 11 colunas');
});
