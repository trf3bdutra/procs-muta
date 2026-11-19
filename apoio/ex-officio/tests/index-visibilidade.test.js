'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const page = read('apoio/ex-officio/lotes/index.html');
const api = read('apoio/ex-officio/api/_lote.js');
const workflow = read('.github/workflows/vercel-monitor.yml');
test('Index CG fornece painel de todos os lotes com controles independentes', () => {
  for (const needle of ['function painelVisLotes(lotes)', 'function ligaVisLotes()', 'data-lve=', 'data-lvr=', "acao:'lote-visivel'"]) assert.ok(page.includes(needle), needle);
  assert.ok(page.includes('ligaVisLotes();'), 'controles devem receber eventos');
});
test('API de gestão mantém gravação exclusiva de gestor', () => {
  assert.ok(api.includes("if (!gestor) return res.status(403)"));
  assert.ok(api.includes("if (b.acao === 'lote-visivel')"));
  assert.ok(api.includes("if (b.equipe === false) v.equipe = false"));
  assert.ok(api.includes("if (b.relator === false) v.relator = false"));
});
test('rota CMT não concede privilégio sem chave ou sessão', () => {
  assert.ok(api.includes('CMT.porChave(req)'));
  assert.ok(api.includes("if (!u) return res.status(401)"));
  assert.ok(!api.includes('relPublico'));
  assert.ok(page.includes("MODO_REL?'&rel=1'"));
});
test('URL legada e GC mapeados na publicação', () => {
  for (const name of ['/index/cmt', '/index/gc', '/index/cg', '/gc', '/lote/cg']) assert.ok(workflow.includes(name), name);
});
