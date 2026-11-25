'use strict';
/* Prévia do painel da extensão Muta (/extensao/previa/): o painel de verdade, montado por scripts/extensao/previa.py. */
const { test } = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os'), { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');

test('prévia do painel: mesmos arquivos da extensão, shim antes dos scripts e o site da própria página', () => {
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'muta-previa-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/extensao/previa.py'), '--saida', saida]);
  const pn = path.join(saida, 'painel'), html = fs.readFileSync(path.join(pn, 'painel.html'), 'utf8');
  const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.equal(srcs[0], 'shim-previa.js', 'o shim vem antes de todos os scripts do painel');
  srcs.forEach(s => assert.ok(fs.existsSync(path.join(pn, s)), 'falta ' + s));
  assert.ok(html.indexOf('Muta.SITE = location.origin') > html.indexOf('<script src="comum.js">'), 'troca o site depois do comum.js');
  assert.ok(html.indexOf('Muta.SITE = location.origin') < html.indexOf('<script src="sessao.js">'), 'e antes de quem lê o site');
  for (const f of fs.readdirSync(path.join(ROOT, 'extensao'))) if (/\.(js|css|json)$/.test(f)) assert.ok(fs.existsSync(path.join(pn, f)), 'copia ' + f);
  assert.ok(fs.existsSync(path.join(saida, 'index.html')));
  const idx = fs.readFileSync(path.join(saida, 'index.html'), 'utf8');
  [...idx.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(m => new Function(m[1]));
  new Function(fs.readFileSync(path.join(pn, 'shim-previa.js'), 'utf8'));
});

test('prévia do painel: por padrão nada é gravado (o shim bloqueia POST, PUT e DELETE, fora o login, Diligências e Deliberações)', () => {
  const shim = fs.readFileSync(path.join(ROOT, 'scripts/extensao/previa/shim.js'), 'utf8');
  /* 0.48.1: Diligências e Deliberações (/api/pendencias e /api/painel?cmt=1) gravam sempre; o resto continua bloqueado */
  assert.match(shim, /m !== 'GET' && m !== 'HEAD' && !grava && !vivo && !\/\\\/api\\\/login/);
  assert.match(shim, /status: 423/);
});


test('prévia universal mantém todas as abas e ambos os roteiros originais', () => {
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'muta-universal-'));
  try {
    execFileSync('python3', [path.join(ROOT, 'scripts/extensao/previa.py'), '--saida', saida]);
    const pn = path.join(saida, 'painel');
    const html = fs.readFileSync(path.join(pn, 'universal.html'), 'utf8');
    const old = fs.readFileSync(path.join(pn, 'painel.html'), 'utf8');
    const scripts = s => [...s.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(scripts(html),scripts(old).map(s=>s==='gabinete.js'?'gabinete-universal.js':s));
    assert.match(html, /src="roteiro.js"/);
    assert.match(html, /src="gerador.js"/);
    assert.match(html, /src="ementario.js"/);
    const js=fs.readFileSync(path.join(pn, 'gabinete-universal.js'), 'utf8');
    assert.match(js,/function camposCaso\(/);
    assert.match(js,/Roteiro de produção/);
    assert.match(js,/fragment\(rt\(\)\)/);
    new Function(js);
    const idx=fs.readFileSync(path.join(saida,'index.html'),'utf8');
    assert.match(idx,/id="pn"[^>]+src="painel\/universal.html"/);
    assert.match(fs.readFileSync(path.join(pn,'shim-previa.js'),'utf8'),/if \(universal && m !== 'GET'/);
  } finally { fs.rmSync(saida,{recursive:true,force:true}); }
});

test('navegador universal: utilidades, ferramentas do gabinete, processo em tela', () => {
  const saida=fs.mkdtempSync(path.join(os.tmpdir(),'muta-nav-'));
  try {
    execFileSync('python3',[path.join(ROOT,'scripts/extensao/previa.py'),'--saida',saida]);
    const html=fs.readFileSync(path.join(saida,'painel','universal.html'),'utf8');
    const old=fs.readFileSync(path.join(saida,'painel','painel.html'),'utf8');
    const ids=s=>[...s.matchAll(/id="tab-([^"]+)"/g)].map(m=>m[1]).sort();
    assert.deepEqual(ids(html),ids(old));
    assert.ok(html.indexOf('id="topo-u"')<html.indexOf('id="pv-nav-tools"'));
    assert.ok(html.indexOf('id="pv-nav-tools"')<html.indexOf('id="pv-nav-case"'));
    assert.ok(html.indexOf('id="tab-acervo"')<html.indexOf('id="tab-pront"'));
    assert.ok(html.indexOf('id="tab-del"')<html.indexOf('id="tab-pront"'));
    assert.match(html,/<b>Minutário /);
    assert.match(old,/<b>Minuta /);
  } finally {fs.rmSync(saida,{recursive:true,force:true});}
});
