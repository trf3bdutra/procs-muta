'use strict';
/* CORTEX: ponte que recebe as minutas lidas no editor do PJe e as registra como versões no lote. */
const { test } = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs');
const ROOT = path.resolve(__dirname, '../../..');
const pag = fs.readFileSync(path.join(ROOT, 'apoio/ex-officio/lotes/pje.html'), 'utf8');
const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/vercel-caput.yml'), 'utf8');

test('a ponte só aceita mensagens do PJe, com o código da importação e login de gestor', () => {
  assert.match(pag, /var ORIGEM = 'https:\/\/pje2g\.trf3\.jus\.br'/);
  assert.match(pag, /e\.origin !== ORIGEM \|\| !pronto/);
  assert.match(pag, /d\.nonce !== nonce/);
  assert.match(pag, /if \(!x\.j\.gestor\)/);
  assert.match(pag, /postMessage\(Object\.assign\(\{ nonce: nonce \}, m\), ORIGEM\)/);
});

test('a ponte registra cada minuta pela API de versões, uma de cada vez', () => {
  assert.match(pag, /acao: 'minuta-versao'/);
  assert.match(pag, /vigente: it\.vigente !== false/);
  assert.match(pag, /fila = fila\.then/);
  assert.match(pag, /CNJ\.test\(String\(it\.processo/);
});

test('o deploy publica a ponte em /amicus/cortex/pje.html', () => {
  assert.match(wf, /cp apoio\/ex-officio\/lotes\/pje\.html site\/public\/amicus\/cortex\/pje\.html/);
});
