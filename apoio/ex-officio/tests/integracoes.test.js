'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const pedidos = require('../api/_pedidos');
const zernio = require('../api/_zernio-copia');

const cnj = '5002750-96.2026.4.03.6000';
const outro = '0000062-26.2015.4.03.6004';
test('AgentMail localiza apenas vínculo inequívoco na lista oficial', () => {
  assert.deepEqual(pedidos.acharNoDocumento({itens:[{cnj,item:12,servidor:'Teste'}],previa:[{cnj}]},cnj),
    {lista:'itens',item:12,servidor:'Teste',corretor:undefined});
  assert.equal(pedidos.acharNoDocumento({itens:[{cnj},{cnj}]},cnj),null);
  assert.equal(pedidos.acharNoDocumento({previa:[{cnj}]},cnj).lista,'previa');
  assert.equal(pedidos.acharNoDocumento({itens:[{cnj:outro}],previa:[{cnj}]},cnj),null,
    'não gravar na pré-pauta residual depois da publicação');
  assert.equal(pedidos.acharNoDocumento(null,cnj),null);
  assert.equal(pedidos.acharNoDocumento({itens:[{cnj:''}]},''),null);
});
test('Zernio replica em destinatário distinto sem duplicar o número principal', async () => {
  const keys=['ZERNIO_API_KEY','CMT_WA_PHONE','CMT_WA_COPY_PHONE'];
  const backup=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  const original=global.fetch, calls=[];
  try {
    process.env.ZERNIO_API_KEY='teste-local';
    process.env.CMT_WA_PHONE='10000000001';
    process.env.CMT_WA_COPY_PHONE='10000000002';
    global.fetch=async (url,opts)=>{calls.push({url,opts});return {ok:true,status:200};};
    const msg={accountId:'teste',templateName:'teste',templateLanguage:'pt_BR',templateParams:['resumo']};
    assert.equal((await zernio.enviarModelo(msg,'evento')).copia,'aceito');
    assert.deepEqual(calls.map(x=>JSON.parse(x.opts.body).participantId),['10000000001','10000000002']);
    assert.equal(calls[1].opts.headers['Idempotency-Key'],'evento-copia');
    calls.length=0;
    process.env.CMT_WA_COPY_PHONE=process.env.CMT_WA_PHONE;
    assert.equal((await zernio.enviarModelo(msg,'evento2')).copia,'sem_configuracao');
    assert.equal(calls.length,1);
  } finally {
    global.fetch=original;
    for(const k of keys) { if(backup[k]===undefined) delete process.env[k]; else process.env[k]=backup[k]; }
  }
});
