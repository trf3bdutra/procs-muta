'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Mesa de designação: página válida, publicada e ligada ao Caput',()=>{
  const pag=read('monitor/designacao/index.html');
  assert.ok(pag.includes('<script id="dados" type="application/json">{}</script>'),'cópia do repositório sem dados embutidos');
  [...pag.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>new vm.Script(m[1],{filename:'mesa-'+i+'.js'}));
  assert.ok(pag.includes('aplicarDesignacao(D.sessao.id,lista)'),'aplica pelo motor');
  assert.ok(pag.includes("MOD='competencia'"),'modo padrão por regras e competência');
  assert.match(pag,/competencia:\{st:[\d.]+,pen:0\.6/,'carga só desempata no modo padrão');
  assert.ok(read('.github/workflows/vercel-monitor.yml').includes('cp monitor/designacao/index.html site/public/caput/designacao/index.html'));
  const caput=read('monitor/triagem/index.html');
  for(const x of ['data-cwe="des-mesa"',"src=\"/caput/designacao/?s=","cmt:mesa-fechar","trocar: true","unassigned: it.filter"])assert.ok(caput.includes(x),x);
  assert.ok(!caput.includes('<span class="v">${e(atual)}</span>'),'minutante e corretor sempre editáveis');
});
test('Motor: troca na designação e período efetivo com marcos invertidos',()=>{
  const m=read('monitor/motor/assets/js/21-sessoes-equipe.js');
  assert.ok(m.includes('o.trocar && it.servidor !== o.d')&&m.includes('o.trocar && it.corretor !== o.c'));
  assert.ok(m.includes('invertido')&&m.includes('efetivo: periodo(ss)'));
});
test('Equipe: CM não corrige; minuta por exceção só na escolha manual',()=>{
  const R=JSON.parse(read('apoio/equipe.json')).registros,by=n=>R.find(m=>m.nome===n);
  assert.equal(by('CM').correcao,false);
  for(const n of ['Alexander','Vanilda','Saffioti','Giovana']){assert.equal(by(n).minuta,false,n);assert.equal(by(n).minutaEventual,true,n);}
  const m=read('monitor/motor/assets/js/21-sessoes-equipe.js');
  assert.ok(m.includes('eventuais: S.equipe.filter(function (m) { return m.minutaEventual && !faz(m, \'d\'); })'));
  assert.ok(m.includes("'minutaEventual'].indexOf(campo)"));
  assert.ok(read('monitor/triagem/index.html').includes('Minutam só por exceção'));
  const pag=read('monitor/designacao/index.html');
  assert.ok(pag.includes('optsEx(k,v)')&&pag.includes('var EV=EQ.filter'));
});
