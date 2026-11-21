'use strict';
/* Prévia do Collectio (/amicus/collectio/previa/): página só de leitura, publicada pelo vercel-caput.yml. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../../..');
const html = fs.readFileSync(path.join(ROOT, 'apoio/ex-officio/lotes/previa.html'), 'utf8');
const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/vercel-caput.yml'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

test('a prévia é publicada em /amicus/collectio/previa/', () => {
  assert.match(wf, /cp apoio\/ex-officio\/lotes\/previa\.html site\/public\/amicus\/collectio\/previa\/index\.html/);
});
test('a prévia só grava a matriz: um único POST, com a ação matriz; as leituras são da API do Collectio e da pauta', () => {
  const posts = [...html.matchAll(/method\s*:\s*['"]POST['"]/gi)];
  assert.equal(posts.length, 1, 'um só ponto de gravação');
  assert.match(html, /acao:'matriz'/);
  assert.equal([...html.matchAll(/\bacao\s*:\s*['"]/g)].length, 1, 'nenhuma outra ação');
  const urls = [...html.matchAll(/[^.]get\('(\/[^']+)/g)].map(m => m[1]);
  assert.ok(urls.length >= 3);
  urls.forEach(u => assert.match(u, /^\/api\/(painel\?lote=1|pauta\?data=)/));
});
test('scripts válidos e HTML completo', () => {
  assert.ok(html.includes('</head>') && html.includes('</body>'));
  assert.equal(scripts.length, 2);
  scripts.forEach(s => assert.doesNotThrow(() => new Function(s)));
});
test('mesmo tema do Collectio (cmt-eq-tema) e visual editorial', () => {
  assert.match(html, /cmt-eq-tema/);
  assert.match(html, /--eo:#a57829/);
  assert.match(html, /font-family:var\(--eser\);font-style:italic/);
});
