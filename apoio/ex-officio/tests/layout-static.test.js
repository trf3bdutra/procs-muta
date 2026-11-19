'use strict';
/* Verificações estáticas dos refinamentos visuais, sem tokens nem acesso externo. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../..');
const pages = [
  'apoio/ex-officio/index.html',
  'apoio/ex-officio/lotes/index.html'
];
function styleOf(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const matching = [...html.matchAll(/<style id="office-layout-refine">([\s\S]*?)<\/style>/g)];
  assert.equal(matching.length, 1, file + ': exatamente um bloco de refinamentos');
  assert.ok(html.includes('</head>') && html.includes('</body>'), file + ': HTML completo');
  return { html, css: matching[0][1] };
}
function braceBalance(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0;
  for (const ch of clean) {
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      assert.ok(depth >= 0, 'bloco CSS fechado sem abertura');
    }
  }
  assert.equal(depth, 0, 'blocos CSS devem estar equilibrados');
}
test('CSS de refinamento presente e estruturalmente válido', () => {
  pages.forEach(page => {
    const { css } = styleOf(page);
    braceBalance(css);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /focus-visible/);
    assert.match(css, /max-width:620px/);
  });
});
test('regras comuns idênticas nas páginas', () => {
  const main = styleOf(pages[0]).css;
  const lotes = styleOf(pages[1]).css;
  const common = main.split('/* Painel do desembargador:')[0].trim();
  assert.ok(lotes.includes(common), 'padrão comum deve ser idêntico nas duas páginas');
});
test('áreas centrais usam colunas flexíveis e mantêm navegação responsiva', () => {
  const main = styleOf(pages[0]).css;
  const lotes = styleOf(pages[1]).css;
  assert.match(main, /grid-template-columns:clamp\(190px,17vw,232px\) minmax\(0,1fr\)/);
  assert.match(lotes, /@media\(max-width:900px\)/);
  assert.match(lotes, /body\.cx-on\{padding-right:520px\}/);
  assert.match(lotes, /@media\(max-width:1300px\)/);
  assert.match(lotes, /overscroll-behavior-x:contain/);
});
test('relator com painéis de notificações e diligências adaptativos', () => {
  const main = styleOf(pages[0]).css;
  assert.match(main, /#v-cmt \.cmt-pn-not/);
  assert.match(main, /#v-cmt \.cmt-pn-dil/);
  assert.match(main, /#p-not,#p-pen/);
  assert.match(main, /@media\(max-width:780px\)/);
});
test('fluxos operacionais mantidos nos HTML', () => {
  const app = styleOf(pages[0]).html;
  const lotes = styleOf(pages[1]).html;
  ['id="v-pauta"', 'id="v-cmt"', 'id="p-not"'].forEach(x => assert.ok(app.includes(x), x));
  assert.ok(lotes.includes('id="app"'));
  assert.ok(lotes.includes('/api/painel?lote=1'));
});
