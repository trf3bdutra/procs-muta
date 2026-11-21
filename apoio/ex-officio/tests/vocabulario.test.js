const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '../../..');
const read = p => fs.readFileSync(path.join(R, p), 'utf8');
const VOC = require(path.join(R, 'padrao/vocabulario.js'));
const D = JSON.parse(read('padrao/vocabulario.json'));

test('vocabulário: valores antigos viram os do vocabulário único', () => {
  assert.equal(VOC.norm('preparo', 'Dispensado', { ajg: 'Sim' }), 'Justiça gratuita');
  assert.equal(VOC.norm('preparo', 'Dispensado', { dpu: 'Sim' }), 'Assistência da DPU');
  assert.equal(VOC.norm('preparo', 'Dispensado', {}), 'Isento (ente público/MP)');
  assert.equal(VOC.norm('preparo', 'AJG'), 'Justiça gratuita');
  assert.equal(VOC.norm('preparo', 'Não Recolhido'), 'Não recolhido');
  assert.equal(VOC.norm('repres', 'Negativo'), 'Irregular – intimar');
  assert.equal(VOC.norm('repres', 'Regular', { obs: 'Dispensada (proc. público/DPU)' }), 'Dispensada (procurador público)');
  assert.equal(VOC.norm('parecer', 'Sem Parecer'), 'Aguardando parecer');
  assert.equal(VOC.norm('mpf', 'Interdito (curatela)'), 'Incapaz (178, II)');
  assert.equal(VOC.norm('midias', 'Faltante'), 'Faltantes');
  assert.equal(VOC.norm('prelim', 'Não há'), 'Sem preliminares');
  assert.equal(VOC.classe('preparo', 'Recolhido sem comprovante STN'), 'pendente');
  assert.equal(VOC.classe('repres', 'Negativo'), 'irregular');
});

test('vocabulário: ficha, prontuário, Ex Officio e motor do Caput listam as mesmas opções', () => {
  const F = JSON.parse(read('padrao/ficha.json'));
  const campos = {}; F.abas.forEach(a => a.grupos.forEach(g => g.campos.forEach(c => { if (c.vocabulario) campos[c.vocabulario] = c.opcoes; })));
  ['tempest', 'preparo', 'repres', 'prelim', 'midias', 'mpf', 'parecer'].forEach(k => assert.deepEqual(campos[k], VOC.lista(k), 'ficha · ' + k));
  const L = JSON.parse(read('padrao/lia/campos-prontuario.json'));
  L.pauta.filter(e => Array.isArray(e[3]) && D.campos[e[0].split(':')[1]]).forEach(e => assert.deepEqual(e[3], VOC.lista(e[0].split(':')[1]), 'prontuário · ' + e[0]));
  const m = read('caput/motor/index.html');
  assert.ok(m.includes('"Preparo": ' + JSON.stringify(VOC.lista('preparo'))), 'DROPDOWNS do motor');
  for (const p of ['apoio/ex-officio/index.html', 'apoio/ex-officio/lotes/index.html', 'caput/triagem/index.html', 'caput/motor/index.html'])
    assert.ok(read(p).includes('<!-- voc:inicio -->'), 'VOC embutido em ' + p);
  assert.equal(read('extensao/vocabulario.js'), read('padrao/vocabulario.js'));
  assert.equal(read('apoio/ex-officio/api/_vocabulario.js'), read('padrao/vocabulario.js'));
  assert.ok(read('extensao/painel.html').includes('<script src="vocabulario.js"></script>'));
});

test('vocabulário: tradutores da ficha deixaram de reduzir o valor', () => {
  const f = read('apoio/ex-officio/api/_ficha.js');
  assert.ok(!/'Justiça gratuita': 'Dispensado'/.test(f));
  assert.ok(f.includes("require('./_vocabulario')"));
});
