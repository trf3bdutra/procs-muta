'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../../..');
const apiDir=path.join(ROOT,'apoio/ex-officio/api');
const libPath=require.resolve(path.join(apiDir,'_lib.js'));
const cmtPath=require.resolve(path.join(apiDir,'_cmt.js'));
const apiPath=require.resolve(path.join(apiDir,'_lote.js'));
test('fluxo funcional: matriz da sessão → seleção explícita → lote persistente, sem ampliação',async()=>{
 const A={cnj:'5000001-01.2026.4.03.6000',item:1,classe:'ApCiv - Apelação Cível',assunto:'Assunto A',partes:'Maria x União',resultado:'Desprovido',ctl:{}};
 const B={cnj:'5000002-02.2026.4.03.6000',item:2,classe:'ApCiv - Apelação Cível',assunto:'Assunto B',partes:'José x INSS',resultado:'Provido',ctl:{}};
 const data={
  'acervo/sessoes/calendario.json':{sessoes:[{date:'2026-11-30',nome:'Sessão 30/11',processos:2,publicada:true}]},
  'acervo/sessoes/2026-11-30.json':{itens:[A,B]},
  'acervo/lotes/avulso.json':{schema:'gabcmt.lote',id:'avulso',titulo:'Avulso',
   sessoes:['2026-11-30'],itens:[],grupos:[],colunas:[],tipo:'avulso'}
 };
 const mock={
  quem:req=>req.headers?.usuario||null,
  gestor:u=>u==='gestor',
  acessos:async()=>({perfil:'equipe'}),
  gh:async()=>[{name:'avulso.json'}],
  lerJson:async p=>{
   if(!Object.prototype.hasOwnProperty.call(data,p))throw Object.assign(new Error('Não encontrado'),{status:404});
   return {dados:JSON.parse(JSON.stringify(data[p])),sha:'fake-sha'};
  },
  gravarJson:async(p,body)=>{data[p]=JSON.parse(JSON.stringify(body));return {sha:'saved'}}
 };
 const savedLib=require.cache[libPath],savedCmt=require.cache[cmtPath],savedApi=require.cache[apiPath];
 require.cache[libPath]={id:libPath,filename:libPath,exports:mock,loaded:true};
 require.cache[cmtPath]={id:cmtPath,filename:cmtPath,exports:{porChave:()=>false},loaded:true};
 delete require.cache[apiPath];
 const handler=require(apiPath);
 const run=async(method,query={},body={},usuario='gestor')=>{
  const out={code:200,body:null,setHeader(){},status(n){this.code=n;return this},json(x){this.body=x;return this}};
  await handler({method,query,body,headers:usuario?{usuario}:{}},out);
  return out;
 };
 try{
  const first=await run('GET');
  assert.equal(first.code,200);
  assert.equal(first.body.lotes.length,1,'somente lotes salvos na lista de coleções');
  assert.equal(first.body.colecoes.avulsas.length,1);
  assert.equal(first.body.colecoes.pauta.sessoes.length,1);
  assert.equal(first.body.colecoes.pauta.lotes.length,0);
  const matrix=await run('GET',{id:'pauta-2026-11-30'});
  assert.equal(matrix.code,200,JSON.stringify(matrix.body));
  assert.equal(matrix.body.lote.virtual,true);
  assert.equal(matrix.body.lote.itens.length,2);
  const create=await run('POST',{},{
   acao:'criar-selecao',id:'lote-tematico',titulo:'Lote temático A',sessao:'2026-11-30',
   processos:[A.cnj],criterios:{assunto:'Assunto A'}
  });
  assert.equal(create.code,200,JSON.stringify(create.body));
  assert.equal(data['acervo/lotes/lote-tematico.json'].itens.length,1);
  assert.equal(data['acervo/lotes/lote-tematico.json'].itens[0].processo,A.cnj);
  const attempt=await run('POST',{}, {acao:'sessoes',id:'lote-tematico',sessoes:['2026-11-30']});
  assert.equal(attempt.code,400);
  assert.equal(data['acervo/lotes/lote-tematico.json'].itens.length,1);
  const bogus=await run('POST',{},{
   acao:'criar-selecao',id:'falha',titulo:'Falha',sessao:'2026-11-30',processos:['0000000-00.0000.0.00.0000']
  });
  assert.equal(bogus.code,400);
  const anonymous=await run('GET',{id:'pauta-2026-11-30'}, {},null);
  assert.equal(anonymous.code,401);
  const denied=await run('POST',{},{
   acao:'criar-selecao',id:'nao',titulo:'Não',sessao:'2026-11-30',processos:[A.cnj]
  },'servidor');
  assert.equal(denied.code,403);
 }finally{
  if(savedLib)require.cache[libPath]=savedLib;else delete require.cache[libPath];
  if(savedCmt)require.cache[cmtPath]=savedCmt;else delete require.cache[cmtPath];
  if(savedApi)require.cache[apiPath]=savedApi;else delete require.cache[apiPath];
 }
});
