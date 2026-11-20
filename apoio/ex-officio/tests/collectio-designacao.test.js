'use strict';
/* Designação (minutante e corretor) no Collectio vem da pauta; rascunho de minuta montado do prontuário. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const L = require('../api/_lib');
const API = require('../api/_lote');
const page = fs.readFileSync(path.join(__dirname, '../lotes/index.html'), 'utf8');

const futura = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
const passada = '2026-01-10';
function sessoesFalsas(mapa) {
  const orig = L.lerJson;
  L.lerJson = async rel => {
    if (rel === 'acervo/sessoes/calendario.json') return { dados: { sessoes: Object.keys(mapa).map(d => ({ date: d, processos: mapa[d].length, publicada: true })) } };
    const m = /sessoes\/(\d{4}-\d{2}-\d{2})\.json$/.exec(rel);
    if (m && mapa[m[1]]) return { dados: { itens: mapa[m[1]] } };
    const e = new Error('404'); e.status = 404; throw e;
  };
  return () => { L.lerJson = orig; };
}

test('lote de pauta: a designação da pauta substitui a cópia do lote e guarda a anterior', async () => {
  const volta = sessoesFalsas({ [futura]: [{ cnj: '5001206-92.2025.4.03.6005', item: '40', servidor: 'José', corretor: 'Vanilda',
    ctl: { historicoDesignacoes: [{ em: '2026-11-20T21:00:00Z', por: 'Bruno', alteracoes: [{ papel: 'minuta', de: 'Victor', para: 'José' }] }] } }] });
  try {
    const lote = { id: 't', sessoes: [futura], itens: [{ sessao: futura, item: 40, processo: '5001206-92.2025.4.03.6005', equipe: { minuta: 'Victor', correcao: 'Vanilda', situacao: 'A minutar' } }] };
    await API.anotar(lote);
    const e = lote.itens[0].equipe;
    assert.equal(e.minuta, 'José');
    assert.equal(e.correcao, 'Vanilda');
    assert.deepEqual(e.fonte, { sessao: futura, item: '40' });
    assert.deepEqual(e.copia_lote, { minuta: 'Victor', correcao: 'Vanilda' });
    assert.equal(e.historico.length, 1);
  } finally { volta(); }
});

test('lote de triagem: usa a pauta futura em que o processo está, nunca a já realizada', async () => {
  const volta = sessoesFalsas({
    [futura]: [{ cnj: '5000082-10.2026.4.03.0001', item: '3', servidor: 'Dalete', corretor: '—' }],
    [passada]: [{ cnj: '5000147-05.2026.4.03.0001', item: '9', servidor: 'Rodrigo', corretor: 'Bruno' }]
  });
  try {
    const lote = { id: 'adp-ai', sessoes: [], itens: [
      { sessao: '', item: 1, processo: '5000082-10.2026.4.03.0001', equipe: { minuta: '', correcao: '', situacao: 'A minutar' } },
      { sessao: '', item: 2, processo: '5000147-05.2026.4.03.0001', equipe: { minuta: '', correcao: '', situacao: 'A minutar' } }] };
    await API.anotar(lote);
    assert.equal(lote.itens[0].equipe.minuta, 'Dalete');
    assert.equal(lote.itens[0].equipe.correcao, '', 'travessão vira vazio');
    assert.equal(lote.itens[0].equipe.situacao, 'A minutar', 'situação não vem de pauta alheia ao lote');
    assert.equal(lote.itens[1].equipe.minuta, '', 'pauta passada não designa');
    assert.equal(lote.itens[1].equipe.fonte, undefined);
  } finally { volta(); }
});

test('rascunho de minuta: relatório só com o que está no prontuário, o resto marcado', () => {
  const it = { processo: '5000286-54.2026.4.03.0001', sessao: '', item: 77, recurso: 'Agravo de instrumento', tipo_caso: 'AI · Alienação fiduciária',
    triagem: { ato: 'Julgamento do agravo (voto)', origem: '5005047-76.2026.4.03.6000 (1ª Vara Federal de Campo Grande/MS)' },
    prontuario_triagem: { cartao: { tipoJ: 'Agravo de Instrumento', orig: { id: '592797382', dispositivo: 'Indeferiu os pedidos de tutela de urgência.' },
      rel: { razoes: 'Agravo (ID 386420152): (1) ausência do procedimento; e (2) risco de desocupação.' },
      recursos: [{ parte: 'o autor', id: '386420152' }], pecas: [{ desc: 'Contraminuta da CEF', id: '391281055' }, { desc: 'Contraminuta dos adquirentes', id: '391467442' }] } } };
  const m = API.rascunhoMinuta({ id: 'adp-ai' }, it, 'Bruno');
  assert.equal(m.item, '', 'fora de pauta não há item');
  assert.match(m.secoes.relatorio[0], /^Trata-se de agravo de instrumento à decisão \(ID 592797382, origem\) que, nos autos 5005047-76/);
  assert.match(m.secoes.relatorio[0], /indeferiu os pedidos de tutela de urgência\.$/);
  assert.equal(m.secoes.relatorio[1], 'Agravou o autor (ID 386420152), alegando, em suma: (1) ausência do procedimento; e (2) risco de desocupação.');
  assert.equal(m.secoes.relatorio[2], 'Houve contraminuta (ID’s 391281055 e 391467442).');
  assert.equal(m.secoes.relatorio.at(-1), 'É o relatório.');
  assert.match(m.secoes.voto[0], /Julgamento do agravo \(voto\)/);
  const sem = API.rascunhoMinuta({ id: 'x' }, { processo: '5000001-00.2026.4.03.0001', item: 1, triagem: {} }, 'Bruno');
  assert.ok(sem.secoes.relatorio.some(p => p.includes('[VALIDAR')), 'falta vira [VALIDAR]');
});

test('página: item só em processo de pauta, indicador de designação, minimizar e criar minuta', () => {
  for (const x of ['function rotItem(it)', 'function dsg(it)', 'data-dsg-f', 'data-min-tudo', 'function minimiza(', "acao:'minuta-criar'", 'data-criar-min', 'TEM_ITEM'])
    assert.ok(page.includes(x), x);
  assert.ok(page.includes('${temItem(it)?`<i class="nn">ITEM ${pad(it.item)}</i>`'), 'cabeçalho mostra ITEM só em processo de pauta');
  assert.ok(!page.includes('<h2><i class="nn">ITEM ${pad(it.item)}</i>'), 'sem ITEM fixo no cabeçalho');
});
