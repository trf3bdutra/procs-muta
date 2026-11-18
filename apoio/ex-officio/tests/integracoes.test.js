'use strict';
/* Testes isolados: node --test apoio/ex-officio/tests/integracoes.test.js
   Nenhuma chamada externa ou alteração de dados do gabinete. */
const test = require('node:test');
const assert = require('node:assert/strict');
const pedidos = require('../api/_pedidos');
const zernio = require('../api/_zernio-copia');

test('AgentMail encontra CNJ na pauta publicada', () => {
  const doc = { itens: [{ cnj: '0000062-26.2015.4.03.6004', item: 10, servidor: 'Teste' }] };
  assert.deepEqual(pedidos.acharNoDocumento(doc, '00000622620154036004'), {
    lista: 'itens', item: 10, servidor: 'Teste', corretor: undefined,
  });
});

test('AgentMail encontra CNJ na previa mesmo quando itens existem', () => {
  const cnj = '5002750-96.2026.4.03.6000';
  const doc = { itens: [{ cnj: '5000000-00.2026.4.03.6000', item: 1 }],
    previa: [{ cnj, servidor: 'Teste' }] };
  assert.equal(pedidos.acharNoDocumento(doc, cnj).lista, 'previa');
});

test('AgentMail prioriza pauta numerada, rejeita ausente e ambiguidade', () => {
  const cnj = '5002750-96.2026.4.03.6000';
  const doc = { itens: [{ cnj, item: 12 }], previa: [{ cnj }] };
  assert.equal(pedidos.acharNoDocumento(doc, cnj).item, 12);
  assert.equal(pedidos.acharNoDocumento(doc, '0000062-26.2015.4.03.6004'), null);
  assert.equal(pedidos.acharNoDocumento({ itens: [{ cnj }, { cnj }] }, cnj), null);
});

test('Zernio envia template principal e replica para numero distinto', async () => {
  const keys = ['ZERNIO_API_KEY','CMT_WA_PHONE','CMT_WA_COPY_PHONE'];
  const backup = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  const originalFetch = global.fetch;
  const calls = [];
  try {
    process.env.ZERNIO_API_KEY = 'teste-nao-real';
    process.env.CMT_WA_PHONE = '5511999001336';
    process.env.CMT_WA_COPY_PHONE = '5566999313888';
    global.fetch = async (url, opts) => { calls.push({url, opts}); return {ok:true,status:200}; };
    const result = await zernio.enviarModelo({accountId:'conta-teste',
      templateName:'modelo-teste',templateLanguage:'pt_BR',templateParams:['resumo']},'evento-teste');
    assert.equal(result.copia, 'aceito');
    assert.equal(calls.length, 2);
    assert.deepEqual(calls.map(x=>JSON.parse(x.opts.body).participantId),
      ['5511999001336','5566999313888']);
    assert.equal(calls[1].opts.headers['Idempotency-Key'], 'evento-teste-copia');
  } finally {
    global.fetch = originalFetch;
    for (const k of keys) backup[k] === undefined ? delete process.env[k] : process.env[k] = backup[k];
  }
});

test('Zernio nao duplica copia no mesmo numero', async () => {
  const keys = ['ZERNIO_API_KEY','CMT_WA_PHONE','CMT_WA_COPY_PHONE'];
  const backup = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  const originalFetch = global.fetch;
  let calls = 0;
  try {
    process.env.ZERNIO_API_KEY = 'teste-nao-real';
    process.env.CMT_WA_PHONE = '5511999001336';
    process.env.CMT_WA_COPY_PHONE = '5511999001336';
    global.fetch = async () => { calls++; return {ok:true,status:200}; };
    const result = await zernio.enviarModelo({accountId:'conta-teste',
      templateName:'modelo-teste',templateLanguage:'pt_BR',templateParams:['resumo']},'evento-teste-2');
    assert.equal(result.copia,'sem_configuracao');
    assert.equal(calls,1);
  } finally {
    global.fetch = originalFetch;
    for (const k of keys) backup[k] === undefined ? delete process.env[k] : process.env[k] = backup[k];
  }
});
