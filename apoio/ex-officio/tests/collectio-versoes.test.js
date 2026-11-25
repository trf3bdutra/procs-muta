'use strict';
/* CORTEX: mais de uma minuta do mesmo processo no lote (versões), com a vigente no arquivo de sempre e as demais guardadas. */
const { test } = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs');
const ROOT = path.resolve(__dirname, '../../..');
const apiDir = path.join(ROOT, 'apoio/ex-officio/api');
const libPath = require.resolve(path.join(apiDir, '_lib.js'));
const cmtPath = require.resolve(path.join(apiDir, '_cmt.js'));
const apiPath = require.resolve(path.join(apiDir, '_lote.js'));

const P = '5003166-35.2024.4.03.6000', X = P.slice(0, 10), Q = '5000001-01.2026.4.03.6000', Y = Q.slice(0, 10);
const MIN = 'acervo/minutas/acorrigir/' + X + '.json', VER = v => 'acervo/minutas/acorrigir/versoes/' + X + '/' + v + '.json';

function ambiente() {
  const data = {
    'acervo/sessoes/calendario.json': { sessoes: [{ date: '2026-11-30', nome: 'Sessão 30/11', processos: 2, publicada: true }] },
    'acervo/sessoes/2026-11-30.json': { itens: [
      { cnj: P, item: 72, classe: 'ApelRemNec', assunto: 'IRPJ', partes: 'SITREL x União', dataMinuta: '2026-11-10', dataCorrecao: '2026-11-20', ctl: {} },
      { cnj: Q, item: 80, classe: 'ApCiv', assunto: 'Outro', partes: 'Maria x União', ctl: {} }] },
    'acervo/lotes/acorrigir.json': { schema: 'gabcmt.lote', id: 'acorrigir', titulo: 'A corrigir', tipo: 'avulso', sessoes: ['2026-11-30'], grupos: [], colunas: [],
      itens: [{ sessao: '2026-11-30', item: 72, processo: P, minuta: true }, { sessao: '2026-11-30', item: 80, processo: Q, minuta: false }] },
    [MIN]: { schema: 'gabcmt.minuta', versao: '1', lote: 'acorrigir', processo: P, sessao: '2026-11-30', item: '72', origem: 'Copiada do editor do PJe em 21/11/2026',
      atualizado_em: '2026-11-21', secoes: { relatorio: ['Trata-se de apelação.', 'É o relatório.'], voto: ['Senhores Desembargadores, nego provimento.', 'É como voto.'], ementa: ['DIREITO TRIBUTÁRIO.'], acordao: [] } }
  };
  let shaN = 0; const shas = {};
  const commits = [];
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
  return { data, mock, commits };
}
async function comHandler(amb, fn) {
  const saved = [libPath, cmtPath, apiPath].map(p => require.cache[p]);
  require.cache[libPath] = { id: libPath, filename: libPath, exports: amb.mock, loaded: true };
  require.cache[cmtPath] = { id: cmtPath, filename: cmtPath, exports: { porChave: () => false }, loaded: true };
  delete require.cache[apiPath];
  const handler = require(apiPath);
  const run = async (method, query = {}, body = {}, usuario = 'Bruno') => {
    const out = { code: 200, body: null, setHeader() {}, status(n) { this.code = n; return this; }, json(x) { this.body = x; return this; } };
    await handler({ method, query: Object.assign({ lote: '1' }, query), body, headers: usuario ? { usuario } : {} }, out);
    return out;
  };
  try { await fn(run); }
  finally { [libPath, cmtPath, apiPath].forEach((p, i) => { if (saved[i]) require.cache[p] = saved[i]; else delete require.cache[p]; }); }
}
const NOVA = { relatorio: ['Trata-se de remessa necessária e de apelações à sentença (ID 343454417).', 'É o relatório.'],
  voto: ['Senhores Desembargadores, nego provimento às apelações e à remessa necessária.', 'É como voto.'], ementa: ['DIREITO TRIBUTÁRIO.', '1. Apelações e remessa necessária desprovidas.'],
  acordao: ['Vistos e relatados estes autos...'] };

test('registrar outra versão sem trocar a vigente guarda a minuta anterior como v1', async () => {
  const amb = ambiente();
  await comHandler(amb, async run => {
    const r = await run('POST', {}, { acao: 'minuta-versao', id: 'acorrigir', processo: P, rotulo: 'Corrigida por Claude', origem: 'Conferida nos autos', secoes: NOVA, vigente: false });
    assert.equal(r.code, 200, JSON.stringify(r.body));
    assert.equal(amb.commits.length, 1, 'um commit só');
    assert.deepEqual(amb.commits[0].paths.sort(), [MIN, VER('v1'), VER('v2')].sort());
    const vig = amb.data[MIN];
    assert.equal(vig.vigente, 'v1');
    assert.deepEqual(vig.secoes.voto, ['Senhores Desembargadores, nego provimento.', 'É como voto.'], 'a vigente não mudou');
    assert.deepEqual(vig.versoes.map(v => v.id), ['v1', 'v2']);
    assert.equal(vig.versoes[0].rotulo, 'Minuta inicial do lote');
    assert.equal(vig.versoes[0].origem, 'Copiada do editor do PJe em 21/11/2026');
    assert.equal(vig.versoes[1].por, 'Bruno');
    assert.deepEqual(vig.versoes[1].paragrafos, { relatorio: 2, voto: 2, ementa: 2, acordao: 1 });
    assert.deepEqual(amb.data[VER('v1')].secoes.relatorio, ['Trata-se de apelação.', 'É o relatório.']);
    assert.deepEqual(amb.data[VER('v2')].secoes, NOVA);
    const l = await run('GET', { id: 'acorrigir', minuta: X, versoes: '1' });
    assert.equal(l.code, 200);
    assert.equal(l.body.vigente, 'v1'); assert.equal(l.body.versoes.length, 2); assert.equal(l.body.editada, false);
    const v2 = await run('GET', { id: 'acorrigir', minuta: X, versao: 'v2' });
    assert.equal(v2.code, 200); assert.deepEqual(v2.body.secoes, NOVA);
  });
});

test('tornar vigente troca o texto do arquivo de sempre; alteração em lote vira versão antes da troca', async () => {
  const amb = ambiente();
  await comHandler(amb, async run => {
    await run('POST', {}, { acao: 'minuta-versao', id: 'acorrigir', processo: P, rotulo: 'Corrigida', secoes: NOVA, vigente: false });
    const r = await run('POST', {}, { acao: 'minuta-vigente', id: 'acorrigir', processo: P, versao: 'v2' });
    assert.equal(r.code, 200, JSON.stringify(r.body));
    assert.equal(amb.data[MIN].vigente, 'v2');
    assert.deepEqual(amb.data[MIN].secoes, NOVA);
    assert.equal(amb.data[MIN].rotulo, 'Corrigida');
    /* Trechos em lote altera a vigente */
    const s = await run('POST', {}, { acao: 'substituir', id: 'acorrigir', de: 'nego provimento às apelações', para: 'dou parcial provimento às apelações', processos: [X] });
    assert.equal(s.body.alterados, 1);
    const l = await run('GET', { id: 'acorrigir', minuta: X, versoes: '1' });
    assert.equal(l.body.editada, true);
    /* voltar à v1 guarda antes a vigente alterada como v3 */
    const b = await run('POST', {}, { acao: 'minuta-vigente', id: 'acorrigir', processo: P, versao: 'v1' });
    assert.equal(b.code, 200, JSON.stringify(b.body));
    const vig = amb.data[MIN];
    assert.deepEqual(vig.versoes.map(v => v.id), ['v1', 'v2', 'v3']);
    assert.equal(vig.versoes[2].rotulo, 'Vigente com trechos alterados em lote');
    assert.match(amb.data[VER('v3')].secoes.voto[0], /dou parcial provimento/);
    assert.equal(vig.vigente, 'v1');
    assert.deepEqual(vig.secoes.relatorio, ['Trata-se de apelação.', 'É o relatório.']);
    const l2 = await run('GET', { id: 'acorrigir', minuta: X, versoes: '1' });
    assert.equal(l2.body.editada, false);
  });
});

test('registrar a primeira minuta de processo sem minuta marca o processo no lote', async () => {
  const amb = ambiente();
  await comHandler(amb, async run => {
    const r = await run('POST', {}, { acao: 'minuta-versao', id: 'acorrigir', processo: Q, rotulo: 'Minuta do PJe', secoes: NOVA, vigente: false });
    assert.equal(r.code, 200, JSON.stringify(r.body));
    const m = amb.data['acervo/minutas/acorrigir/' + Y + '.json'];
    assert.equal(m.vigente, 'v1', 'sem minuta anterior, a primeira é sempre a vigente');
    assert.deepEqual(m.secoes, NOVA);
    assert.ok(amb.data['acervo/minutas/acorrigir/versoes/' + Y + '/v1.json']);
    assert.equal(amb.data['acervo/lotes/acorrigir.json'].itens.find(i => i.processo === Q).minuta, true);
  });
});

test('só o gestor grava; o relator vê só a vigente, sem o histórico', async () => {
  const amb = ambiente();
  await comHandler(amb, async run => {
    const n = await run('POST', {}, { acao: 'minuta-versao', id: 'acorrigir', processo: P, rotulo: 'X', secoes: NOVA }, 'Alex');
    assert.equal(n.code, 403);
    const vazio = await run('POST', {}, { acao: 'minuta-versao', id: 'acorrigir', processo: P, rotulo: 'X', secoes: {} });
    assert.equal(vazio.code, 400);
    const semNome = await run('POST', {}, { acao: 'minuta-versao', id: 'acorrigir', processo: P, rotulo: ' ', secoes: NOVA });
    assert.equal(semNome.code, 400);
    await run('POST', {}, { acao: 'minuta-versao', id: 'acorrigir', processo: P, rotulo: 'Corrigida', secoes: NOVA });
    const eq = await run('GET', { id: 'acorrigir', minuta: X, versoes: '1' }, {}, 'Alex');
    assert.equal(eq.code, 200); assert.equal(eq.body.versoes.length, 2);
    const rel = await run('GET', { id: 'acorrigir', minuta: X, rel: '1' }, {}, 'CM');
    assert.equal(rel.code, 200, JSON.stringify(rel.body));
    assert.deepEqual(rel.body.secoes, NOVA);
    assert.equal(rel.body.versoes, undefined);
    const relV = await run('GET', { id: 'acorrigir', minuta: X, rel: '1', versoes: '1' }, {}, 'CM');
    assert.equal(relV.code, 403);
  });
});

test('página do CORTEX tem o registro e a comparação de versões', () => {
  const html = fs.readFileSync(path.join(ROOT, 'apoio/ex-officio/lotes/index.html'), 'utf8');
  for (const k of ['data-vers=', 'data-vreg=', "acao:'minuta-versao'", "acao:'minuta-vigente'", 'function difSecoes', 'function parteMinuta', 'data-vcmp><b>Comparar</b>'])
    assert.ok(html.includes(k), 'falta ' + k);
  /* o parser da página reconhece o formato do "Copiar tudo" */
  const src = html.match(/const TIT_SEC=[\s\S]*?\n(?=const textoSecoes)/)[0];
  const parteMinuta = new Function(src + ';return parteMinuta')();
  const p = parteMinuta('PODER JUDICIÁRIO\nRELATÓRIO\n\nTrata-se de apelação.\n\nÉ o relatório.\n\nVOTO\n\nSenhores Desembargadores,\n\nEMENTA\n\nDIREITO.\n\nACÓRDÃO\n\nVistos.');
  assert.deepEqual(p.secoes, { relatorio: ['Trata-se de apelação.', 'É o relatório.'], voto: ['Senhores Desembargadores,'], ementa: ['DIREITO.'], acordao: ['Vistos.'] });
  assert.equal(p.antes, 1);
});

test('comparação só na caixa de versões, com outras fontes e conformidade; painel lateral sem "Comparar"', () => {
  const html = fs.readFileSync(path.join(ROOT, 'apoio/ex-officio/lotes/index.html'), 'utf8');
  assert.ok(!html.includes('id="cx-cmp"') && !html.includes('data-cx="cmp"') && !html.includes('async function compara('), 'o painel lateral não compara mais');
  for (const k of ['data-vfb', "['modelo','Modelo do banco']", "['matriz','Minuta-Matriz']", "['prec','Precedente do Ementário']", "['texto','Texto colado']",
    '/extensao/dados/base.json.gz', '/jurisprudencia/indice.json.gz', '/amicus/cortex/conformidade-motor.js', 'function confVersao', 'data-vconf'])
    assert.ok(html.includes(k), 'falta ' + k);
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/vercel-caput.yml'), 'utf8');
  assert.ok(wf.includes('cp extensao/conformidade-motor.js site/public/amicus/cortex/conformidade-motor.js'), 'o motor é publicado com o CORTEX');
  /* títulos espaçados dos inteiros teores (“R E L A T Ó R I O”) */
  const src = html.match(/const TIT_SEC=[\s\S]*?\n(?=const textoSecoes)/)[0];
  const parteMinuta = new Function(src + ';return parteMinuta')();
  const p = parteMinuta('PODER JUDICIÁRIO\nR E L A T Ó R I O\nTrata-se.\nÉ o relatório.\nV O T O\nVoto.\nE M E N T A\nDIREITO.');
  assert.deepEqual(p.secoes, { relatorio: ['Trata-se.', 'É o relatório.'], voto: ['Voto.'], ementa: ['DIREITO.'], acordao: [] });
});

test('o motor da conformidade analisa a minuta do lote no formato da caixa de versões', () => {
  const M = require(path.join(ROOT, 'extensao/conformidade-motor.js'));
  const ps = ['RELATÓRIO', ...NOVA.relatorio, 'VOTO', 'O Desembargador Federal Carlos Muta (Relator):', ...NOVA.voto, 'EMENTA', ...NOVA.ementa, 'ACÓRDÃO', ...NOVA.acordao];
  const r = M.analisar(ps, { formatacao: false, cartao: { pecas: [{ id: '343454417' }] } });
  assert.equal(r.peca, 'acordao');
  assert.ok(Array.isArray(r.itens) && typeof r.nota === 'number');
  assert.ok(!r.itens.some(x => x.regra === 'ID-prontuario'), 'o ID citado consta das peças informadas');
});
