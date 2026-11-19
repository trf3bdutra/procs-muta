'use strict';
/* Prontuário da extensão Muta (/api/pauta?prontuario): grava o arquivo do processo, a ficha e o cartão num só commit.
   O GitHub é simulado: leituras vêm do próprio repositório; gravações ficam em memória. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const API = path.join(root, 'apoio/ex-officio/api');

function simulaGitHub() {
  const mem = new Map(), commits = [];
  const sha = t => crypto.createHash('sha1').update(t).digest('hex');
  const ler = rel => {
    if (mem.has(rel)) return mem.get(rel);
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) { const e = new Error('Not Found'); e.status = 404; throw e; }
    return fs.readFileSync(p, 'utf8');
  };
  const L = require(path.join(API, '_lib.js'));
  L.lerJson = async rel => { const t = ler(rel); return { dados: JSON.parse(t), sha: sha(t) }; };
  L.lerGrande = async rel => { const t = ler(rel); return { txt: t, sha: sha(t) }; };
  L.commitArquivos = async (arqs, msg) => {
    for (const f of arqs) if (f.sha) { let atual = null; try { atual = sha(ler(f.path)); } catch (e) {} if (atual !== f.sha) { const e = new Error('mudou'); e.status = 409; throw e; } }
    arqs.forEach(f => mem.set(f.path, f.txt)); commits.push({ msg, paths: arqs.map(f => f.path) }); return { sha: 'x' };
  };
  L.gestor = u => u === 'Bruno';
  return { mem, commits, L };
}
function chamada(h, req) {
  return new Promise(ok => {
    const res = { _s: 200, status(s) { this._s = s; return this; }, json(b) { ok({ status: this._s, body: b }); return this; }, setHeader() {} };
    h(req, res, req.u || 'Bruno');
  });
}
/* processo de uma pauta futura qualquer, para o espelho no cartão */
function processoEmPauta() {
  const cal = JSON.parse(fs.readFileSync(path.join(root, 'acervo/sessoes/calendario.json'), 'utf8'));
  const hoje = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
  for (const s of (cal.sessoes || []).filter(s => s.date >= hoje)) {
    const p = path.join(root, 'acervo/sessoes/' + s.date + '.json'); if (!fs.existsSync(p)) continue;
    const d = JSON.parse(fs.readFileSync(p, 'utf8')), it = (d.itens || [])[0] || (d.previa || [])[0];
    if (it) return { cnj: it.cnj, sessao: s.date };
  }
  return null;
}

test('prontuário: GET de processo sem arquivo devolve null e os cartões das pautas', async () => {
  simulaGitHub();
  const h = require(path.join(API, '_prontuario.js'));
  const alvo = processoEmPauta();
  const r = await chamada(h, { method: 'GET', query: { prontuario: alvo ? alvo.cnj : '0000000-00.0000.0.00.0000' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.prontuario, null);
  if (alvo) assert.ok(r.body.cartoes.some(c => c.sessao === alvo.sessao), 'cartão da pauta futura');
});

test('prontuário: POST grava arquivo, ficha e cartão num só commit; conflito devolve 409', async () => {
  const G = simulaGitHub();
  const h = require(path.join(API, '_prontuario.js'));
  const alvo = processoEmPauta();
  assert.ok(alvo, 'precisa de um processo em pauta futura');
  const pr = { caso: { numero: alvo.cnj }, regularidade: { tempestividade: 'Tempestivo' }, observacoes: 'teste' };
  const r1 = await chamada(h, { method: 'POST', query: { prontuario: '1' }, body: { cnj: alvo.cnj, prontuario: pr, base: '',
    campos: { 'triagem.Tempestividade': 'Tempestivo', 'producao.SERVIDOR': 'Fulano' }, cartao: { pecas: [{ desc: 'Sentença', id: '123', data: '2026-01-01' }], hack: 1 } }, u: 'Maria Eduarda' });
  assert.equal(r1.status, 200, JSON.stringify(r1.body));
  assert.equal(G.commits.length, 1);
  const paths = G.commits[0].paths;
  assert.ok(paths.includes('acervo/prontuarios/' + alvo.cnj.replace(/\D/g, '') + '.json'));
  assert.ok(paths.includes('acervo/operacional.json'));
  assert.ok(paths.includes('acervo/sessoes/' + alvo.sessao + '.json'));
  assert.deepEqual(r1.body.recusados, ['producao.SERVIDOR'], 'designação é só do gestor');
  const salvo = JSON.parse(G.mem.get(paths[0]));
  assert.equal(salvo.prontuario.observacoes, 'teste');
  assert.equal(salvo.atualizadoPor, 'Maria Eduarda');
  const ses = JSON.parse(G.mem.get('acervo/sessoes/' + alvo.sessao + '.json'));
  const it = ses.itens.concat(ses.previa || []).find(i => i.cnj === alvo.cnj);
  assert.equal(it.ctl.cartao.pecas[0].id, '123');
  assert.equal(it.ctl.cartao.hack, undefined, 'só chaves conhecidas do cartão');
  assert.equal(it.ctl.tempest, 'Tempestivo', 'espelho da ficha no cartão');
  /* mesma gravação: nada muda */
  const r2 = await chamada(h, { method: 'POST', query: { prontuario: '1' }, body: { cnj: alvo.cnj, prontuario: pr, base: salvo.atualizadoEm } });
  assert.equal(r2.status, 200); assert.equal(r2.body.semMudanca, true);
  /* base antiga: conflito, com o atual */
  const r3 = await chamada(h, { method: 'POST', query: { prontuario: '1' }, body: { cnj: alvo.cnj, prontuario: Object.assign({}, pr, { observacoes: 'outro' }), base: '2000-01-01T00:00:00.000Z' } });
  assert.equal(r3.status, 409); assert.equal(r3.body.conflito, true); assert.equal(r3.body.prontuario.observacoes, 'teste');
  /* GET devolve o gravado */
  const r4 = await chamada(h, { method: 'GET', query: { prontuario: alvo.cnj } });
  assert.equal(r4.body.prontuario.observacoes, 'teste'); assert.equal(r4.body.atualizadoEm, salvo.atualizadoEm);
});

test('prontuário: número inválido e corpo inválido são recusados', async () => {
  simulaGitHub();
  const h = require(path.join(API, '_prontuario.js'));
  assert.equal((await chamada(h, { method: 'GET', query: { prontuario: '123' } })).status, 400);
  assert.equal((await chamada(h, { method: 'POST', query: { prontuario: '1' }, body: { cnj: '5000000-00.2026.4.03.6000', prontuario: [1, 2] } })).status, 400);
});

test('pauta.js encaminha ?prontuario ao módulo', () => {
  const s = fs.readFileSync(path.join(API, 'pauta.js'), 'utf8');
  assert.match(s, /req\.query\.prontuario\) return require\('\.\/_prontuario'\)/);
});
