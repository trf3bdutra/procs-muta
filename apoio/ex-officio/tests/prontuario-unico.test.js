'use strict';
/* Prontuário único: o que a pauta (cartão) e a HERO18810 (ficha) registram é o mesmo dado, nos dois sentidos. */
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const FICHA = require(path.resolve(__dirname, '../api/_ficha.js'));

test('cartão → ficha: tipo de caso, assunto detalhado e decisão de origem', () => {
  const m = FICHA.doCartao({}, { subassuntos: 'IMO-A', assuntoDet: 'Atraso na entrega', orig: { tipo: 'Sentença', id: '123', data: '2026-01-02', juizo: '1ª Vara', julgador: 'Fulana', custas: 'isento' } });
  assert.equal(m.triagem.Tema, 'IMO-A');
  assert.equal(m.triagem['Assunto detalhado'], 'Atraso na entrega');
  assert.equal(m.origem['Sentença - ID'], '123');
  assert.equal(m.origem['Sentença - Data'], '2026-01-02');
  assert.equal(m.origem['Origem - Juízo'], '1ª Vara');
  assert.equal(m.origem['Origem - Julgador'], 'Fulana');
  assert.equal(m.origem['Sentença - Custas'], 'isento');
});

test('cartão → ficha: decisão interlocutória não vira ID da sentença', () => {
  const m = FICHA.doCartao({}, { orig: { tipo: 'Decisão interlocutória', id: '9', juizo: 'Vara' } });
  assert.equal((m.origem || {})['Sentença - ID'], undefined);
  assert.equal(m.origem['Origem - Juízo'], 'Vara');
});

test('ficha → cartão (gravação da HERO18810): os mesmos campos chegam ao prontuário da pauta', () => {
  const it = { ctl: { cartao: { orig: { juizo: 'antigo', acc: { custas: true } } } } };
  const v = FICHA.paraCartao({ triagem: { Tema: 'IMO-A', 'Assunto detalhado': 'Atraso' }, origem: { 'Sentença - ID': '555', 'Origem - Juízo': '2ª Vara' } }, it);
  assert.equal(v.cart.subassuntos, 'IMO-A');
  assert.equal(v.cart.assuntoDet, 'Atraso');
  assert.deepEqual(v.cart.orig, { juizo: '2ª Vara', acc: { custas: true }, id: '555', tipo: 'Sentença' });
});

test('ficha → cartão integral (monocráticas): ficha prevalece e preserva o resto do cartão', () => {
  const c = FICHA.cartaoDaFicha({ triagem: { Tema: 'X' }, origem: { 'Sentença - ID': '7', 'Origem - Julgador': 'J' } }, { orig: { acc: { honor: true } }, pecas: [1] });
  assert.equal(c.subassuntos, 'X');
  assert.equal(c.orig.id, '7'); assert.equal(c.orig.tipo, 'Sentença'); assert.equal(c.orig.julgador, 'J'); assert.deepEqual(c.orig.acc, { honor: true });
  assert.deepEqual(c.pecas, [1]);
  const d = FICHA.cartaoDaFicha({ origem: { 'Sentença - ID': '7' } }, { orig: { tipo: 'Acórdão', id: '1' } });
  assert.equal(d.orig.id, '1', 'outro tipo de decisão não é sobrescrito');
});

test('HERO18810: ato monocrático não pede relatório, voto, ementa nem acórdão', () => {
  const fs = require('node:fs'), raiz = path.resolve(__dirname, '../../../extensao');
  const g = fs.readFileSync(path.join(raiz, 'gabinete.js'), 'utf8'), ge = fs.readFileSync(path.join(raiz, 'gerador.js'), 'utf8');
  ['Tipo de Voto', 'Relatório Padronizado', 'Adequação Ementa', 'Rev - Ementa'].forEach(k => assert.ok(g.includes("'" + k + "': 1"), k));
  assert.match(g, /g\.destino === destino\(\)\) && grupoVisivel\(g\)/, 'Campos do caso respeita o destino');
  assert.match(ge, /g\.destino\(\) === 'monocratica'/, 'Gerador sem peças de acórdão na monocrática');
});

test('HERO18810: Roteiro de triagem sem a identificação da decisão; Roteiro de produção com os campos do Compendium', () => {
  const fs = require('node:fs'), raiz = path.resolve(__dirname, '../../../extensao');
  const r = fs.readFileSync(path.join(raiz, 'roteiro.js'), 'utf8'), g = fs.readFileSync(path.join(raiz, 'gabinete.js'), 'utf8');
  assert.match(r, /var FORA_TRIAGEM = \{ decisao: 1, impugnada: 1 \}/);
  assert.match(g, /<b>Roteiro de produção<\/b>/);
  assert.match(g, /data-rt="u:' \+ k \+ '">Usar/, 'sugestão dos autos com Usar');
});

test('HERO18810: Roteiro de produção pelo perfil da minuta, com histórico de pautas e sem o tipo de ato', () => {
  const fs = require('node:fs'), g = fs.readFileSync(path.resolve(__dirname, '../../../extensao/gabinete.js'), 'utf8');
  assert.match(g, /var CC_MONO = \[\['Decisão', \[\['producao', 'Mono - Fundamento', 'Precedente ou fundamento'\]/);
  assert.match(g, /\['Pauta e julgamento', 'Pauta e julgamento'\]\];/);
  assert.match(g, /c\.chave === 'Mono - Tipo de ato'/);
  assert.match(g, /function historicoPautas\(\)/);
});
