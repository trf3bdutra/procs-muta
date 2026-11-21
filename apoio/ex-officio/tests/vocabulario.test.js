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

test('vocabulário: recorrente decide o preparo dispensado (ente público, DPU, CEF e conselhos, advogado particular)', () => {
  const ctx = (recorrente, advogado) => ({ ajg: 'Sim', dpu: 'Sim', recorrente, advogado });
  assert.equal(VOC.norm('preparo', 'Dispensado', ctx('UNIÃO FEDERAL')), 'Isento (ente público/MP)');
  assert.equal(VOC.norm('preparo', 'Dispensado', ctx('INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS')), 'Isento (ente público/MP)');
  assert.equal(VOC.norm('preparo', 'Dispensado', ctx('CHEFE/GERENTE EXECUTIVO INSS CAMPO GRANDE MS')), 'Isento (ente público/MP)');
  assert.equal(VOC.norm('preparo', 'Dispensado', ctx('ESTADO DE MATO GROSSO DO SUL')), 'Isento (ente público/MP)');
  assert.equal(VOC.norm('preparo', 'Dispensado', ctx('DEFENSORIA PUBLICA DA UNIAO')), 'Assistência da DPU');
  assert.equal(VOC.norm('preparo', 'Dispensado', ctx('CAIXA ECONOMICA FEDERAL')), 'Não verificado');
  assert.equal(VOC.norm('preparo', 'Dispensado', ctx('CONSELHO REGIONAL DE ENFERMAGEM DE MATO GROSSO DO SUL')), 'Não verificado');
  assert.equal(VOC.norm('preparo', 'Dispensado', ctx('MARIA DA SILVA', 'FULANO OAB: MS 1')), 'Justiça gratuita');
  assert.equal(VOC.norm('preparo', 'Dispensado', ctx('MARIA DA SILVA', '')), 'Assistência da DPU');
  assert.equal(VOC.coerente('preparo', 'Assistência da DPU', ctx('UNIÃO FEDERAL')), 'Isento (ente público/MP)');
  assert.equal(VOC.coerente('repres', 'Dispensada (DPU)', ctx('INSTITUTO NACIONAL DE ESTUDOS E PESQUISAS EDUCACIONAIS ANISIO TEIXEIRA')), 'Dispensada (procurador público)');
  /* o gêmeo em Python responde igual */
  const { execFileSync } = require('child_process');
  const py = execFileSync('python3', ['-c', "import sys,json;sys.path.insert(0,'scripts');import vocabulario as V;print(json.dumps([V.norm('preparo','Dispensado',{'ajg':'Sim','dpu':'Sim','recorrente':n,'advogado':a}) for n,a in [('UNIÃO FEDERAL',''),('CAIXA ECONOMICA FEDERAL',''),('DEFENSORIA PUBLICA DA UNIAO',''),('MARIA DA SILVA','X OAB'),('MARIA DA SILVA','')]]))"], { cwd: R, encoding: 'utf8' });
  assert.deepEqual(JSON.parse(py), ['Isento (ente público/MP)', 'Não verificado', 'Assistência da DPU', 'Justiça gratuita', 'Assistência da DPU']);
});
