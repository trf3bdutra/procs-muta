/* Painel do Desembargador (/api/painel?cmt=1): só abre com a sessão do Ex Officio ou com a chave do link pessoal.
   Sem uma nem outra, a resposta é 401 e ninguém age em nome do relator. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const api = p => path.join(__dirname, '..', 'api', p);
const apiPath = api('painel.js'), libPath = api('_lib.js'), cmtPath = api('_cmt.js'), entPath = api('_entregas.js'), fichaPath = api('_ficha.js');

async function chamar({ sessao, chave }) {
  const paths = [apiPath, libPath, cmtPath, entPath, fichaPath], saved = paths.map(p => require.cache[p]);
  const chamadas = [];
  const cmt = async (req, res, u) => { chamadas.push(u); res.status(200).json({ usuario: u }); };
  cmt.porChave = req => !!chave && req.headers['x-cmt-chave'] === chave;
  const lib = { quem: () => sessao || null, exigir: (req, res) => { res.status(401).json({ erro: 'sem sessão' }); return null; } };
  require.cache[libPath] = { id: libPath, filename: libPath, exports: lib, loaded: true };
  require.cache[cmtPath] = { id: cmtPath, filename: cmtPath, exports: cmt, loaded: true };
  require.cache[entPath] = { id: entPath, filename: entPath, exports: {}, loaded: true };
  require.cache[fichaPath] = { id: fichaPath, filename: fichaPath, exports: {}, loaded: true };
  delete require.cache[apiPath];
  try {
    const handler = require(apiPath);
    const out = { code: 200, body: null, setHeader() {}, status(n) { this.code = n; return this; }, json(x) { this.body = x; return this; } };
    const headers = chave ? { 'x-cmt-chave': chave } : {};
    await handler({ method: 'GET', query: { cmt: '1' }, headers }, out);
    return { out, chamadas };
  } finally { paths.forEach((p, i) => { if (saved[i]) require.cache[p] = saved[i]; else delete require.cache[p]; }); }
}

test('sem sessão e sem chave, o painel do relator responde 401', async () => {
  const { out, chamadas } = await chamar({});
  assert.strictEqual(out.code, 401);
  assert.match(out.body.erro, /link pessoal/);
  assert.deepStrictEqual(chamadas, []);
});

test('com a chave do link pessoal, entra como o relator', async () => {
  const { out, chamadas } = await chamar({ chave: 'k'.repeat(32) });
  assert.strictEqual(out.code, 200);
  assert.deepStrictEqual(chamadas, [process.env.CMT_RELATOR || 'CM']);
});

test('com a sessão do Ex Officio, entra com o próprio nome', async () => {
  const { out, chamadas } = await chamar({ sessao: 'Bruno' });
  assert.strictEqual(out.code, 200);
  assert.deepStrictEqual(chamadas, ['Bruno']);
});
