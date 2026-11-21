'use strict';
/* Collectio: matriz construível em qualquer coleção (lote gravado e pauta da sessão). */
const { test } = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../../..');
const apiDir = path.join(ROOT, 'apoio/ex-officio/api');
const libPath = require.resolve(path.join(apiDir, '_lib.js'));
const cmtPath = require.resolve(path.join(apiDir, '_cmt.js'));
const pautaPath = require.resolve(path.join(apiDir, 'pauta.js'));
const apiPath = require.resolve(path.join(apiDir, '_lote.js'));

const P = '5003166-35.2024.4.03.6000', X = P.slice(0, 10), Q = '5000001-01.2026.4.03.6000';
const MIN = 'acervo/minutas/acorrigir/' + X + '.json', LOTE = 'acervo/lotes/acorrigir.json';
const SEC = { relatorio: ['Trata-se de apelação.', 'É o relatório.'], voto: ['Senhores Desembargadores, nego provimento.', 'É como voto.'], ementa: ['DIREITO TRIBUTÁRIO.'], acordao: [] };

function ambiente(sessao) {
  const data = {
    'acervo/sessoes/calendario.json': { sessoes: [{ date: '2026-11-30', nome: 'Sessão 30/11', processos: 2, publicada: true }] },
    'acervo/sessoes/2026-11-30.json': { itens: [Object.assign({ cnj: P, item: 72, classe: 'ApelRemNec', assunto: 'IRPJ', partes: 'SITREL x União', dataMinuta: '2026-11-10', ctl: {} }, sessao || {}),
      { cnj: Q, item: 80, classe: 'ApCiv', assunto: 'Outro', partes: 'Maria x União', ctl: {} }] },
    [LOTE]: { schema: 'gabcmt.lote', id: 'acorrigir', titulo: 'A corrigir', tipo: 'avulso', sessoes: ['2026-11-30'], grupos: [], colunas: [],
      itens: [{ sessao: '2026-11-30', item: 72, processo: P, minuta: true }, { sessao: '2026-11-30', item: 80, processo: Q, minuta: false }] },
    [MIN]: { schema: 'gabcmt.minuta', versao: '1', lote: 'acorrigir', processo: P, sessao: '2026-11-30', item: '72', vigente: 'v2', secoes: SEC,
      versoes: [{ id: 'v1', rotulo: 'Minuta inicial do lote', em: '2026-11-19' }, { id: 'v2', rotulo: 'Corrigida (Claude) em 21/11/2026', em: '2026-11-21', pje: { em: '2026-11-20', por: 'Bruno' } }, { id: 'v3', rotulo: 'Corrigida por Bruno', em: '2026-11-21' }] },
    ['acervo/minutas/acorrigir/versoes/' + X + '/v3.json']: { secoes: SEC }
  };
  let shaN = 0; const shas = {}, commits = [], pauta = [];
  const mock = {
    quem: req => req.headers && req.headers.usuario || null,
    gestor: u => u === 'Bruno',
    acessos: async u => ({ perfil: u === 'CM' ? 'desembargador' : 'equipe' }),
    gh: async () => [],
    lerJson: async p => {
      if (!Object.prototype.hasOwnProperty.call(data, p)) throw Object.assign(new Error('Não encontrado'), { status: 404 });
      return { dados: JSON.parse(JSON.stringify(data[p])), sha: shas[p] || 's0' };
    },
    gravarJson: async (p, body) => { data[p] = JSON.parse(JSON.stringify(body)); shas[p] = 's' + (++shaN); return {}; },
    commitArquivos: async (arqs, msg) => {
      for (const f of arqs) if (f.sha && f.sha !== (shas[f.path] || 's0')) throw Object.assign(new Error('mudou'), { status: 409 });
      for (const f of arqs) { data[f.path] = JSON.parse(f.txt); shas[f.path] = 's' + (++shaN); }
      commits.push({ msg, paths: arqs.map(f => f.path) });
    }
  };
  /* a pauta é a do Ex Officio: aqui só se registra a chamada e se grava a data no arquivo da sessão */
  const pautaMod = { gravarItem: async (s, b, u, g) => {
    pauta.push({ s, b, u, g });
    const d = data['acervo/sessoes/' + s + '.json'], it = d.itens.find(i => i.cnj === b.cnj);
    Object.assign(it, b.campos); return { status: 200, body: { ok: true, item: it } };
  } };
  return { data, mock, commits, pauta, pautaMod };
}
async function comHandler(amb, fn) {
  const paths = [libPath, cmtPath, pautaPath, apiPath], saved = paths.map(p => require.cache[p]);
  require.cache[libPath] = { id: libPath, filename: libPath, exports: amb.mock, loaded: true };
  require.cache[cmtPath] = { id: cmtPath, filename: cmtPath, exports: { porChave: () => false }, loaded: true };
  require.cache[pautaPath] = { id: pautaPath, filename: pautaPath, exports: amb.pautaMod, loaded: true };
  delete require.cache[apiPath];
  const handler = require(apiPath);
  const run = async (method, query = {}, body = {}, usuario = 'Bruno') => {
    const out = { code: 200, body: null, setHeader() {}, status(n) { this.code = n; return this; }, json(x) { this.body = x; return this; } };
    await handler({ method, query: Object.assign({ lote: '1' }, query), body, headers: usuario ? { usuario } : {} }, out);
    return out;
  };
  try { await fn(run); }
  finally { paths.forEach((p, i) => { if (saved[i]) require.cache[p] = saved[i]; else delete require.cache[p]; }); }
}


const MX = 'acervo/matrizes/pauta-2026-11-30.json';
const GR = [{ id: 'G1', rotulo: 'Crédito presumido provado', cor: '#2f6db5', resultado: 'Concessão mantida' }];
const CO = [{ id: 'PRE', rotulo: 'Prescrição' }, { id: 'HON', rotulo: 'Honorários de 18/11', trecho: 'Pela sucumbência recursal' }];

test('o gestor grava a matriz de um lote: grupos e colunas do lote e marcas só dos processos enviados', async () => {
  const amb = ambiente();
  await comHandler(amb, async run => {
    const r = await run('POST', {}, { acao: 'matriz', id: 'acorrigir', grupos: GR, colunas: CO, itens: [{ processo: P, grupo: 'G1', variacoes: ['PRE'], observacao: 'Prova do crédito nos autos.' }] });
    assert.equal(r.code, 200, JSON.stringify(r.body));
    const l = amb.data[LOTE];
    assert.deepEqual(l.grupos.map(g => g.id), ['G1']);
    assert.deepEqual(l.colunas, CO, 'a coluna com trecho guarda o trecho');
    const a = l.itens.find(i => i.processo === P), b = l.itens.find(i => i.processo === Q);
    assert.equal(a.grupo, 'G1'); assert.deepEqual(a.variacoes, ['PRE']); assert.equal(a.observacao, 'Prova do crédito nos autos.');
    assert.ok(!b.grupo && !(b.variacoes || []).length, 'o outro processo não muda');
    assert.equal(a.minuta, true, 'o resto do processo continua como estava');
  });
});

test('só o gestor grava a matriz', async () => {
  const amb = ambiente();
  await comHandler(amb, async run => {
    const r = await run('POST', {}, { acao: 'matriz', id: 'acorrigir', grupos: GR, colunas: CO, itens: [] }, 'Alex');
    assert.equal(r.code, 403);
    assert.deepEqual(amb.data[LOTE].grupos, []);
  });
});

test('na pauta da sessão a matriz fica em acervo/matrizes e entra na matriz geral da sessão', async () => {
  const amb = ambiente();
  await comHandler(amb, async run => {
    const r = await run('POST', {}, { acao: 'matriz', id: 'pauta-2026-11-30', grupos: GR, colunas: CO, itens: [{ processo: Q, grupo: 'G1', variacoes: ['PRE'], observacao: 'Ver a prescrição.' }] });
    assert.equal(r.code, 200, JSON.stringify(r.body));
    assert.ok(amb.data[MX], 'grava o arquivo da matriz da sessão');
    assert.equal(amb.data[MX].itens[Q].grupo, 'G1');
    assert.ok(!amb.data['acervo/lotes/pauta-2026-11-30.json'], 'não cria lote para a pauta');
    const g = await run('GET', { id: 'pauta-2026-11-30' });
    assert.equal(g.code, 200, JSON.stringify(g.body));
    const lote = g.body.lote, it = lote.itens.find(i => i.processo === Q), outro = lote.itens.find(i => i.processo === P);
    assert.deepEqual(lote.grupos.map(x => x.id), ['G1']);
    assert.deepEqual(lote.colunas.map(x => x.id), ['PRE', 'HON']);
    assert.equal(it.grupo, 'G1'); assert.deepEqual(it.variacoes, ['PRE']); assert.equal(it.observacao, 'Ver a prescrição.');
    assert.ok(!outro.grupo, 'processo sem marca fica sem grupo');
    assert.ok(lote.matriz && lote.matriz.por === 'Bruno');
  });
});

test('sessão inexistente não recebe matriz', async () => {
  const amb = ambiente();
  await comHandler(amb, async run => {
    const r = await run('POST', {}, { acao: 'matriz', id: 'pauta-2026-01-05', grupos: GR, colunas: CO, itens: [] });
    assert.equal(r.code, 404);
    assert.ok(!amb.data['acervo/matrizes/pauta-2026-01-05.json']);
  });
});

test('coleções de decisões (Monocrática, Interlocutória, Despacho): a matriz fica em acervo/matrizes e volta pela leitura', async () => {
  const amb = ambiente();
  await comHandler(amb, async run => {
    const r = await run('POST', {}, { acao: 'matriz', id: 'monocratica', grupos: GR, colunas: CO, itens: [{ processo: P, grupo: 'G1', variacoes: ['HON'], observacao: '' }] });
    assert.equal(r.code, 200, JSON.stringify(r.body));
    const f = amb.data['acervo/matrizes/monocratica.json'];
    assert.ok(f && f.colecao === 'monocratica' && !f.sessao);
    assert.equal(f.itens[P].grupo, 'G1');
    assert.ok(!amb.data['acervo/lotes/monocratica.json'], 'não cria lote');
    const g = await run('GET', { matriz: 'monocratica' }, {}, 'Alex');
    assert.equal(g.code, 200);
    assert.deepEqual(g.body.matriz.colunas.map(x => x.id), ['PRE', 'HON']);
    const v = await run('GET', { matriz: 'despacho' }, {}, 'Alex');
    assert.equal(v.code, 200); assert.equal(v.body.matriz, null, 'sem matriz gravada, volta vazia');
    const n = await run('POST', {}, { acao: 'matriz', id: 'despacho', grupos: GR, colunas: CO, itens: [] }, 'Alex');
    assert.equal(n.code, 403, 'só o gestor grava');
  });
});
