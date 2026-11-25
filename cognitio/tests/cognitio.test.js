const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.resolve(__dirname,'../..'), read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('cognitio/index.html');
const authSource=read('cognitio/auth.js');
function auth(){const window={};vm.runInNewContext(authSource,{window});return window.CognitioAuth;}
const response=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data});
test('sessão existente do Office: usa cookie, sem outro login',async()=>{
 const a=auth(), result=await a.lerSessao(async(u,i)=>{assert.equal(u,'/api/login');assert.equal(i.method,'GET');assert.equal(i.credentials,'same-origin');return response(200,{usuario:'Teste',gestor:false})});
 assert.equal(result.usuario,'Teste');
});
test('sessão ausente ou inválida não abre o Cognitio',async()=>{
 const a=auth();assert.equal(await a.lerSessao(async()=>response(401,{})),null);
 await assert.rejects(a.lerSessao(async()=>response(200,{soTriagem:true,nome:'Teste'})));
 await assert.rejects(a.lerSessao(async()=>response(500,{})));
});
test('novo login usa POST do Office e verifica o cookie emitido',async()=>{
 const a=auth();let n=0;
 const u=await a.entrar('Teste','senha-ficticia',async(url,opts)=>{assert.equal(url,'/api/login');assert.equal(opts.credentials,'same-origin');if(++n===1){assert.equal(opts.method,'POST');assert.equal(JSON.parse(opts.body).usuario,'Teste')}else assert.equal(opts.method,'GET');return response(200,{usuario:'Teste'})});
 assert.equal(u.usuario,'Teste');assert.equal(n,2);
 await assert.rejects(a.entrar('Teste','errada',async()=>response(401,{erro:'Senha inválida'})),/Senha inválida/);
});
test('ponte exige acesso institucional ao acervo',async()=>{
 const a=auth();await a.ponte(async(u,i)=>{assert.equal(u,'/api/acesso?gh=1&office=1&p=');assert.equal(i.credentials,'same-origin');return response(200,{})});
 await assert.rejects(a.ponte(async()=>response(403,{})));
});
test('servidor: cookie de colaborador não substitui a sessão Office no Cognitio',async()=>{
 const mod={exports:{}};
 const lib={quem:()=>null,quemTriagem:async()=>{throw Error('Não deve tentar autenticar pelo link');}};
 new Function('module','require','process',read('apoio/ex-officio/api/_gh.js'))(mod,p=>p==='./_lib'?lib:require(p),process);
 let status;const res={setHeader(){},status(s){status=s;return this},json(x){return x}};
 const r=await mod.exports({query:{office:'1',p:''},method:'GET'},res);
 assert.equal(status,401);assert.match(r.message,/Ex Officio/);
});
test('ponte rejeita token pessoal somente no Cognitio, preservando o Caput',async()=>{
 const code=read('caput/assets/js/gh-ponte.js'), url='https://api.github.com/repos/trf3bdutra/procs-muta';
 function setup(pathname,search=''){const calls=[];const window={fetch:async(u,i)=>{calls.push(u);return new Response('{}',{status:200});}};vm.runInNewContext(code,{window,location:{pathname,search},URLSearchParams,Headers,Response});return {window,calls};}
 const c=setup('/cognitio/');let r=await c.window.fetch(url,{headers:{Authorization:'Bearer pessoal-ficticio'}});assert.equal(r.status,401);assert.equal(c.calls.length,0);
 await c.window.__ghPonte.confere();assert.match(c.calls[0],/office=1/);
 const motor=setup('/init/motor/index.html','?cognitio=1');await motor.window.__ghPonte.confere();assert.match(motor.calls[0],/office=1/);
 const cap=setup('/caput/triagem');r=await cap.window.fetch(url,{headers:{Authorization:'Bearer pessoal-ficticio'}});assert.equal(r.status,200);assert.equal(cap.calls[0],url);
});
test('a duplicação conserva integralmente o painel de processo, matriz e visão geral',()=>{
 for(const [start,end] of [['function cartao(l,it){','const propSit='],['function tabela(l){','/* painel do processo:'],['function vInicio(emb) {','let REG =']]){
  const i=html.indexOf(start),j=html.indexOf(end,i);assert.ok(i>=0&&j-i>100,'Componente original ausente: '+start);
 }
 for(const p of ['acervo','triagem','selecao','mono'])assert.ok(html.includes('data-cog="'+p+'"'));
 assert.ok(!html.includes('data-cog="outras"'));assert.ok(html.includes("r:'Outros destinos'"));
 assert.ok(html.includes("frame.src = 'about:blank'"));
 assert.ok(html.indexOf('await W.CognitioAuth.ponte()')<html.indexOf("frame.src='/init/motor/index.html?cognitio=1'"));
 assert.ok(!html.includes('id="pt-alt"'));
});
test('classificação conservadora dos atos, sem conclusão fictícia',()=>{
 const start=html.indexOf('function cogTipo(o){'),end=html.indexOf('function cogMatrizDestino',start);
 const nz=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const a=new Function('nz',html.slice(start,end)+';return {cogTipo,cogRecorte}')(nz);
 const o=(tipo,assinado='')=>({row:{Destino:'Monocrática','Mono - Tipo de ato':tipo,Assinado:assinado}});
 const items=[o('Decisão monocrática (art. 932)'),o('Despacho','Sim'),o('Decisão de admissibilidade'),o('')];
 assert.equal(a.cogRecorte('mono','ativos',items).length,1);
 assert.equal(a.cogRecorte('outras','concluidos',items).length,1);
 assert.equal(a.cogRecorte('outras','confirmar',items).length,2);
});
test('todos os scripts inline têm sintaxe válida',()=>{
 for(const [,attrs,code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
 if(!/\bsrc=|application\/(?:json|ld\+json)|type="module"/.test(attrs))new vm.Script(code);
 }
});

test('outros destinos é um recorte dos Triados, preservando a pauta',()=>{
 const nz=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const start=html.indexOf('function cogTipo(o){'),end=html.indexOf('function cogOutrosLote()',start);
 const f=new Function('nz',html.slice(start,end)+';return cogGrupoOutro')(nz);
 const o=(d,a='',extra={})=>({row:{Destino:d,'Mono - Tipo de ato':a,...extra}});
 assert.equal(f(o('Despacho')),'ativos');assert.equal(f(o('Interlocutória','',{Assinado:'Sim'})),'assinados');assert.equal(f(o('Outro destino')),'encaminhamentos');assert.equal(f(o('Monocrática')),'confirmar');assert.equal(f(o('Monocrática','art. 932')),'');assert.equal(f({...o('Despacho'),dest:{k:'pauta'}}),'');
});
