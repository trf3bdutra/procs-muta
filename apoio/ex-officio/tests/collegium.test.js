'use strict';
// Collegium (/amicus/collegium/): o ementário do Compendium, só com os julgados dos demais gabinetes da Turma Regional de MS.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Amicus tem o cartão do Collegium e o site publica a página e os dados',()=>{
  const amicus=read('apoio/amicus/index.html'),wf=read('.github/workflows/vercel-caput.yml');
  assert.ok(amicus.includes('href="/amicus/collegium/"'));
  assert.ok(amicus.includes('03 · Collegium'));
  assert.ok(!amicus.includes('<small>01 · Collectio</small>'),'Collectio fora da página inicial do Amicus');
  for(const x of ['site/public/amicus/collegium/index.html','gerar_busca.py --pasta precedentes/collegium','site/public/collegium/','"precedentes/collegium/**"'])
    assert.ok(wf.includes(x),x);
});

test('build monta o Collegium a partir do mesmo ementário, só com a aba Ementário',()=>{
  const b=read('apoio/modus-operandi/fonte/build.py');
  for(const x of ["gerar_html('collegium')","'collegium.html'",'window.EMENT_FONTE="/collegium/"','gz_col','data-collegium-fora'])
    assert.ok(b.includes(x),x);
  const e=read('apoio/modus-operandi/fonte/ementario.js');
  assert.ok(e.includes("(window.EMENT_FONTE||'/jurisprudencia/')"),'a série vem da fonte configurada');
  assert.ok(e.includes("DIM.rl={n:'Relator'"),'dimensão Relator no Collegium');
  assert.ok(e.includes("Rel. '+esc(x.rl||'CARLOS MUTA')"),'relator do julgado no detalhe');
});

test('página gerada: Collegium com a fonte própria e sem os precedentes do Relator embutidos',()=>{
  const p=path.join(root,'apoio/modus-operandi/collegium.html');
  if(!fs.existsSync(p))return; // gerada pelo build (CI e rotina de coleta)
  const h=fs.readFileSync(p,'utf8');
  assert.ok(h.includes('<title>Collegium'));
  assert.ok(h.includes('window.EMENT_FONTE="/collegium/"'));
  const m=h.match(/<script type="application\/octet-stream" id="base-gz">([^<]+)<\/script>/);
  assert.ok(m,'base embutida');
  const base=JSON.parse(zlib.gunzipSync(Buffer.from(m[1],'base64')).toString('utf8'));
  assert.equal((base.prec||[]).length,0,'nenhum precedente do Relator no Collegium');
});

test('dados do Collegium: nenhum julgado do Relator (Gab. A ou CARLOS MUTA)',()=>{
  const p=path.join(root,'precedentes/collegium/indice.json.gz');
  if(!fs.existsSync(p))return;
  const I=JSON.parse(zlib.gunzipSync(fs.readFileSync(p)).toString('utf8'));
  assert.ok(I.length>0);
  for(const x of I){
    assert.ok(!/MUTA/i.test(x.rl||''),'relator '+x.rl+' em '+x.id);
    assert.ok(!/Gab\. A /.test(x.g||''),'gabinete do Relator em '+x.id);
    assert.ok(x.id&&x.t&&x.n&&x.d&&x.y,'campos mínimos em '+x.id);
  }
});

test('Amicus tem o painel de busca do Collegium, que abre o ementário com termos e filtros',()=>{
  const amicus=read('apoio/amicus/index.html'),e=read('apoio/modus-operandi/fonte/ementario.js'),wf=read('.github/workflows/vercel-caput.yml');
  for(const x of ['id="bc"','id="bc-q"','name="qm" value="ft"','name="t" value="A"','id="bc-rl"',"'/collegium/resumo.json'","location.href='/amicus/collegium/#'"])
    assert.ok(amicus.includes(x),x);
  for(const x of ["!p.q&&!p.rl&&!p.t","if(p.rl&&DIM.rl)E.F.rl=p.rl;","E.qm=p.qm==='ft'&&E.q?'ft':'idx';"]) assert.ok(e.includes(x),x);
  assert.ok(wf.includes('precedentes/collegium/resumo.json site/public/collegium/'),'resumo publicado');
});
