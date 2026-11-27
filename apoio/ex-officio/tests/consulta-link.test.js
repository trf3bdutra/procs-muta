/* Link de consulta do Cognitio: só leitura de Triagem, Seleção Prévia e Monocráticas, sem autos, prontuários nem gravação. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const api = p => path.join(__dirname, '..', 'api', p);
const MODS = ['_lib.js', '_gh.js', 'acesso.js', 'pauta.js', 'login.js'].map(api);

function carregar(cfg) {
  const saved = MODS.map(p => require.cache[p]);
  process.env.CMT_SESSION_SECRET = process.env.CMT_SESSION_SECRET || 'x'.repeat(40);
  MODS.forEach(p => { delete require.cache[p]; });
  const L = require(api('_lib.js'));
  L.lerJson = async () => ({ dados: { linkConsulta: cfg || { versao: 1, ativo: true, dias: 30 } } });
  L.gh = async () => { throw Object.assign(new Error('sem GitHub no teste'), { status: 404 }); };
  return { L, restaura: () => MODS.forEach((p, i) => { if (saved[i]) require.cache[p] = saved[i]; else delete require.cache[p]; }) };
}
function resposta() {
  const r = { code: 0, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; r.send = b => { r.body = b; return r; };
  return r;
}
function cookieDe(r) { return String(r.headers['Set-Cookie'] || '').split(';')[0]; }

test('ponte: a consulta só lê, e não lê autos, prontuários, minutas nem arquivos da Chefia', async () => {
  const { restaura } = carregar();
  try {
    const G = require(api('_gh.js'));
    assert.strictEqual(G.consultaPode('GET', 'contents/acervo/operacional.json?ref=main'), '');
    assert.strictEqual(G.consultaPode('GET', 'contents/acervo/lotes/nao-terminativas.json?ref=main'), '');
    assert.strictEqual(G.consultaPode('GET', ''), '');
    for (const p of ['contents/acervo/autos/0000023-26.2024.4.03.6000.json.gz', 'contents/acervo/prontuarios/5000187-84.2026.4.03.0001.json', 'contents/acervo/minutas/x.json',
      'contents/acervo/autos?ref=main', 'contents/apoio/acessos.json', 'contents/apoio/registro-entradas.json', 'contents/scripts/x.py'])
      assert.notStrictEqual(G.consultaPode('GET', p), '', p);
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE'])
      assert.notStrictEqual(G.consultaPode(m, 'contents/acervo/operacional.json'), '', m);
  } finally { restaura(); }
});

test('cookie: vale com a versão em vigor; trocar a versão ou desativar encerra o acesso', async () => {
  let { L, restaura } = carregar();
  let cookie;
  try {
    assert.notStrictEqual(L.chaveConsulta(1), L.chaveConsulta(2));
    assert.notStrictEqual(L.chaveConsulta(1), L.chaveTriagem(1), 'a chave da consulta não abre a Triagem');
    const r = resposta(); L.emitirConsulta(r, 'Maria', 1, 30); cookie = cookieDe(r);
    assert.match(r.headers['Set-Cookie'], /cmt_cons=.*HttpOnly; Secure; SameSite=Lax; Max-Age=2592000/);
    const q = await L.quemConsulta({ headers: { cookie } });
    assert.strictEqual(q.nome, 'Maria'); assert.strictEqual(q.usuario, 'Consulta · Maria');
    assert.strictEqual(L.quem({ headers: { cookie } }), null, 'o cookie de consulta não vira sessão do Office');
    assert.strictEqual(await L.quemTriagem({ headers: { cookie: cookie.replace('cmt_cons', 'cmt_tri') } }), null, 'nem acesso da Triagem');
  } finally { restaura(); }
  ({ L, restaura } = carregar({ versao: 2, ativo: true }));
  try { assert.strictEqual(await L.quemConsulta({ headers: { cookie } }), null); } finally { restaura(); }
  ({ L, restaura } = carregar({ versao: 1, ativo: false }));
  try { assert.strictEqual(await L.quemConsulta({ headers: { cookie } }), null); } finally { restaura(); }
});

test('acesso: só o gestor vê o link; a chave certa e o nome abrem a consulta', async () => {
  const { L, restaura } = carregar();
  try {
    const A = require(api('acesso.js'));
    let r = resposta(); await A({ query: { consultaLink: '1' }, headers: {} }, r); assert.strictEqual(r.code, 403);
    r = resposta(); await A({ query: { consulta: '1' }, method: 'POST', body: { chave: 'errada', nome: 'Maria' }, headers: {} }, r);
    await new Promise(ok => setTimeout(ok, 500)); assert.strictEqual(r.code, 401);
    r = resposta(); await A({ query: { consulta: '1' }, method: 'POST', body: { chave: L.chaveConsulta(1), nome: '' }, headers: {} }, r); assert.strictEqual(r.code, 400);
    r = resposta(); await A({ query: { consulta: '1' }, method: 'POST', body: { chave: L.chaveConsulta(1), nome: 'Maria' }, headers: {} }, r);
    assert.strictEqual(r.code, 200); const cookie = cookieDe(r); assert.match(cookie, /^cmt_cons=/);
    r = resposta(); await A({ query: { consulta: '1' }, method: 'GET', headers: { cookie } }, r);
    assert.strictEqual(r.code, 200); assert.strictEqual(r.body.leitura, true); assert.strictEqual(r.body.gestor, false); assert.strictEqual(r.body.perfil, 'consulta');
    r = resposta(); await A({ query: { consulta: '1' }, method: 'GET', headers: {} }, r); assert.strictEqual(r.code, 401);
  } finally { restaura(); }
});

test('ponte no Cognitio: a consulta lê pelo GitHub e não grava', async () => {
  const { L, restaura } = carregar();
  try {
    const r0 = resposta(); L.emitirConsulta(r0, 'Maria', 1, 30); const cookie = cookieDe(r0);
    process.env.GH_TOKEN = process.env.GH_TOKEN || 'teste';
    const chamadas = []; L.ghFetch = async (url, init) => { chamadas.push([init.method, url]); return { status: 200, ok: true, tipo: 'application/json', buf: Buffer.from('{}') }; };
    const G = require(api('_gh.js'));
    let r = resposta(); await G({ query: { office: '1', p: 'contents/acervo/operacional.json?ref=main' }, method: 'GET', headers: { cookie } }, r);
    assert.strictEqual(r.code, 200); assert.strictEqual(chamadas.length, 1);
    r = resposta(); await G({ query: { office: '1', p: 'contents/acervo/autos/x.json.gz' }, method: 'GET', headers: { cookie } }, r);
    assert.strictEqual(r.code, 403);
    const corpo = (async function* () { yield Buffer.from('{}'); })();
    r = resposta(); await G(Object.assign(corpo, { query: { office: '1', p: 'contents/acervo/operacional.json' }, method: 'PUT', headers: { cookie } }), r);
    assert.strictEqual(r.code, 403); assert.strictEqual(chamadas.length, 1, 'nada de gravação chega ao GitHub');
    r = resposta(); await G({ query: { office: '1', p: '' }, method: 'GET', headers: {} }, r); assert.strictEqual(r.code, 401);
  } finally { restaura(); }
});

test('pauta: a consulta abre a ficha só para ler; gravar continua exigindo o login do Office', async () => {
  const { L, restaura } = carregar();
  try {
    const r0 = resposta(); L.emitirConsulta(r0, 'Maria', 1, 30); const cookie = cookieDe(r0);
    const fp = api('_ficha.js'), salvo = require.cache[fp];
    let chamou = null; require.cache[fp] = { id: fp, filename: fp, loaded: true, exports: Object.assign(async (req, res, u) => { chamou = u; return res.status(200).json({ ok: true }); }, { resumos: async () => {}, etiquetasGab: async () => {} }) };
    try {
      const P = require(api('pauta.js'));
      let r = resposta(); await P({ query: { ficha: '5000187-84.2026.4.03.0001' }, method: 'GET', headers: { cookie } }, r);
      assert.strictEqual(r.code, 200); assert.strictEqual(chamou, 'Consulta · Maria');
      chamou = null; r = resposta(); await P({ query: { ficha: '1' }, method: 'POST', body: {}, headers: { cookie } }, r);
      assert.strictEqual(r.code, 401); assert.strictEqual(chamou, null);
      r = resposta(); await P({ query: { ficha: '1', chegadas: '1' }, method: 'GET', headers: { cookie } }, r);
      assert.strictEqual(chamou, 'Consulta · Maria', 'a consulta vai direto à leitura da ficha, sem outras rotas');
    } finally { if (salvo) require.cache[fp] = salvo; else delete require.cache[fp]; }
  } finally { restaura(); }
});
