'use strict';
/* Collectio: marcar a versão importada no PJe (etapa de produção: corrigido), liberação na tela de versões e versão final do PJe. */
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

test('a equipe marca a versão importada no PJe: só uma por minuta, resumo no lote e correção na produção', async () => {
  const amb = ambiente();
  await comHandler(amb, async run => {
    const r = await run('POST', {}, { acao: 'minuta-pje', id: 'acorrigir', processo: P, versao: 'v3', marcado: true }, 'Alex');
    assert.equal(r.code, 200, JSON.stringify(r.body));
    const idx = amb.data[MIN].versoes;
    assert.equal(idx.find(v => v.id === 'v3').pje.por, 'Alex');
    assert.ok(!idx.find(v => v.id === 'v2').pje, 'a marca sai da versão anterior');
    assert.equal(amb.data[LOTE].itens[0].pje.versao, 'v3');
    assert.deepEqual(amb.commits[0].paths.sort(), [LOTE, MIN].sort(), 'minuta e lote num só commit');
    assert.equal(amb.pauta.length, 1, 'a pauta recebe a correção');
    assert.equal(amb.pauta[0].s, '2026-11-30');
    assert.deepEqual(Object.keys(amb.pauta[0].b.campos), ['dataCorrecao']);
    assert.equal(r.body.producao.dataCorrecao, amb.pauta[0].b.campos.dataCorrecao);
  });
});

test('correção já registrada não é regravada; desmarcar não apaga a data', async () => {
  const amb = ambiente({ dataCorrecao: '2026-11-18' });
  await comHandler(amb, async run => {
    const r = await run('POST', {}, { acao: 'minuta-pje', id: 'acorrigir', processo: P, versao: 'v3', marcado: true });
    assert.equal(r.code, 200);
    assert.equal(amb.pauta.length, 0);
    assert.equal(r.body.producao.jaRegistrada, true);
    assert.equal(r.body.producao.dataCorrecao, '2026-11-18');
    const d = await run('POST', {}, { acao: 'minuta-pje', id: 'acorrigir', processo: P, versao: 'v3', marcado: false });
    assert.equal(d.code, 200);
    assert.ok(!amb.data[MIN].versoes.some(v => v.pje), 'nenhuma versão marcada');
    assert.ok(!amb.data[LOTE].itens[0].pje);
    assert.equal(amb.data['acervo/sessoes/2026-11-30.json'].itens[0].dataCorrecao, '2026-11-18');
  });
});

test('o relator não marca; versão inexistente é recusada', async () => {
  const amb = ambiente();
  await comHandler(amb, async run => {
    assert.equal((await run('POST', {}, { acao: 'minuta-pje', id: 'acorrigir', processo: P, versao: 'v3' }, 'CM')).code, 403);
    assert.equal((await run('POST', {}, { acao: 'minuta-pje', id: 'acorrigir', processo: P, versao: 'v9' })).code, 404);
    assert.equal(amb.commits.length, 0);
  });
});

test('versão final do PJe guarda a base (a importada) e o resumo no lote; o lote traz as datas da produção', async () => {
  const amb = ambiente({ dataCorrecao: '2026-11-18', dataLiberacao: '2026-11-20' });
  await comHandler(amb, async run => {
    const r = await run('POST', {}, { acao: 'minuta-versao', id: 'acorrigir', processo: P, rotulo: 'Final no PJe (liberada em 20/11/2026)', origem: 'Conferida no PJe', secoes: SEC, final: true });
    assert.equal(r.code, 200, JSON.stringify(r.body));
    const nova = amb.data[MIN].versoes.slice(-1)[0];
    assert.equal(nova.final, true);
    assert.equal(nova.base, 'v2', 'base é a versão marcada como importada no PJe');
    assert.equal(amb.data[MIN].vigente, nova.id, 'a final vira a vigente');
    assert.deepEqual(amb.data[LOTE].itens[0].final, { versao: nova.id, em: nova.em });
    const g = await run('GET', { id: 'acorrigir' });
    const it = g.body.lote.itens.find(i => i.processo === P);
    assert.deepEqual(it.equipe.datas, { minuta: '2026-11-10', correcao: '2026-11-18', liberacao: '2026-11-20' });
    assert.equal(it.final.versao, nova.id);
  });
});

test('minuta sem histórico: marcar v1 guarda a atual como v1 e marca', async () => {
  const amb = ambiente();
  delete amb.data[MIN].versoes; delete amb.data[MIN].vigente;
  await comHandler(amb, async run => {
    const r = await run('POST', {}, { acao: 'minuta-pje', id: 'acorrigir', processo: P, versao: 'v1' });
    assert.equal(r.code, 200, JSON.stringify(r.body));
    assert.deepEqual(amb.data[MIN].versoes.map(v => v.id), ['v1']);
    assert.ok(amb.data[MIN].versoes[0].pje);
    assert.ok(amb.data['acervo/minutas/acorrigir/versoes/' + X + '/v1.json'], 'a atual foi guardada como v1');
  });
});
