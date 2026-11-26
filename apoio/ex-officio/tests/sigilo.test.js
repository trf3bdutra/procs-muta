'use strict';
/* Sigilo (HERO18810): processo sigiloso só libera o inteiro teor ao desembargador, ao gestor ou com a senha. */
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const API = path.resolve(__dirname, '../api');
const L = require(path.join(API, '_lib.js'));
L.gestor = u => u === 'Bruno';
L.acessos = async u => ({ desembargador: u === 'CM' });
process.env.HERO_SIGILO_SENHA = 'segredo-teste';
const SG = require(path.join(API, '_sigilo.js'));
const CNJ = '5000000-00.2026.4.03.6000', SIG = { 'Nível_Sigilo': 'Segredo de Justiça' };
function chamada(req) { return new Promise(ok => { const res = { _s: 200, status(s) { this._s = s; return this; }, json(b) { ok({ s: this._s, b }); return this; } }; SG(req, res, req.u || 'Maria', async () => SIG); }); }

test('sigilo: processo comum é livre; sigiloso bloqueia a equipe e libera desembargador e gestor', async () => {
  assert.deepEqual(await SG.situacao('Maria', CNJ, '', {}), { sigilo: '', liberado: true, porque: '' });
  assert.equal((await SG.situacao('Bruno', CNJ, '', {})).porque, 'gestor', 'documento sigiloso: gestor livre também em processo comum');
  assert.equal((await SG.situacao('Maria', CNJ, '', SIG)).liberado, false);
  assert.equal((await SG.situacao('Bruno', CNJ, '', SIG)).porque, 'gestor');
  assert.equal((await SG.situacao('CM', CNJ, '', SIG)).porque, 'desembargador');
});
test('sigilo: a senha certa devolve token do processo; senha errada e token de outro processo não valem', async () => {
  assert.equal((await chamada({ method: 'POST', body: { cnj: CNJ, senha: 'errada' } })).s, 403);
  const r = await chamada({ method: 'POST', body: { cnj: CNJ, senha: 'segredo-teste' } });
  assert.equal(r.s, 200); assert.ok(r.b.token);
  assert.equal((await SG.situacao('Maria', CNJ, r.b.token, SIG)).porque, 'senha');
  assert.equal((await SG.situacao('Maria', '5000001-00.2026.4.03.6000', r.b.token, SIG)).liberado, false);
  const g = await chamada({ method: 'GET', query: { sigilo: CNJ, t: r.b.token } });
  assert.equal(g.b.liberado, true);
});

test('extensão: sigilo no cliente, aviso de versão e prioridade da publicação', () => {
  const fs = require('node:fs'), R = f => fs.readFileSync(path.resolve(__dirname, '../../..', f), 'utf8');
  const h = R('extensao/painel.html'), a = R('extensao/autos.js');
  assert.match(h, /<script src="sigilo\.js"><\/script>/); assert.match(h, /<script src="saude\.js"><\/script>/);
  assert.ok(h.indexOf('sessao.js') < h.indexOf('sigilo.js'), 'sigilo depois da sessão');
  assert.match(a, /if \(sigBloq\(\)\) \{ A\.erro = 'Processo sigiloso/); assert.match(a, /if \(sigBloq\(\) \|\| docBloq\(dl\)\)/); assert.match(a, /sigilo: SG\(\) \? SG\(\)\.token\(\) : ''/);
  assert.match(R('apoio/ex-officio/api/_ficha.js'), /require\('\.\/_sigilo'\)\.situacao\(u, cnjA, req\.body\.sigilo/);
  assert.match(R('.github/workflows/vercel-caput.yml'), /group: vercel-caput\s*(?:#.*\r?\n\s*)*cancel-in-progress: true/, 'push e acionamento manual substituem a publicação anterior (o Base roda dentro da publicação)');
  assert.doesNotMatch(R('.github/workflows/vercel-caput.yml'), /workflow_run:/, 'o Base não dispara uma segunda publicação');
  assert.match(R('extensao/saude.js'), /\/extensao\/versao\.json/);
});
