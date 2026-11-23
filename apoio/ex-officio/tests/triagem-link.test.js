/* Link da Triagem para colaboradores: a ponte do acervo só lê a Triagem e só grava a ficha e as coleções. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const api = p => path.join(__dirname, '..', 'api', p);
const libPath = api('_lib.js'), ghPath = api('_gh.js');

function carregar(compare) {
  const saved = [libPath, ghPath].map(p => require.cache[p]);
  process.env.CMT_SESSION_SECRET = process.env.CMT_SESSION_SECRET || 'x'.repeat(40);
  delete require.cache[libPath]; delete require.cache[ghPath];
  const L = require(libPath);
  L.gh = async rel => (/^\/git\/ref\//.test(rel) ? { object: { sha: 'a'.repeat(40) } } : compare);
  const G = require(ghPath);
  return { L, G, restaura: () => [libPath, ghPath].forEach((p, i) => { if (saved[i]) require.cache[p] = saved[i]; else delete require.cache[p]; }) };
}
const corpo = o => Buffer.from(JSON.stringify(o));

test('leitura: Triagem sim, arquivos de Chefia e Comunicação não', async () => {
  const { G, restaura } = carregar({});
  try {
    assert.strictEqual(await G.triagemPode('GET', 'contents/acervo/operacional.json?ref=main'), '');
    assert.strictEqual(await G.triagemPode('GET', 'contents/apoio/regras/escopo-triagem.json?ref=main'), '');
    assert.strictEqual(await G.triagemPode('GET', ''), '');
    for (const p of ['contents/apoio/registro-entradas.json', 'contents/apoio/acessos.json', 'contents/apoio/equipe-avisos.json', 'contents/apoio/regras/produtividade.json', 'git/blobs/' + 'b'.repeat(40), 'contents/scripts/x.py'])
      assert.notStrictEqual(await G.triagemPode('GET', p), '', p);
  } finally { restaura(); }
});

test('gravação: só a ficha e as coleções, num commit só sobre o ramo atual', async () => {
  let { G, restaura } = carregar({ behind_by: 0, ahead_by: 1, files: [{ filename: 'acervo/operacional.json', status: 'modified' }] });
  try {
    assert.strictEqual(await G.triagemPode('POST', 'git/trees', corpo({ base_tree: 'x', tree: [{ path: 'acervo/operacional.json', mode: '100644', type: 'blob', sha: 'c'.repeat(40) }] })), '');
    assert.notStrictEqual(await G.triagemPode('POST', 'git/trees', corpo({ tree: [{ path: 'acervo/sessoes/2026-12-07.json', mode: '100644', type: 'blob', sha: 'c'.repeat(40) }] })), '');
    assert.notStrictEqual(await G.triagemPode('POST', 'git/trees', corpo({ tree: [{ path: 'acervo/operacional.json', mode: '100644', type: 'blob', sha: null }] })), '');
    assert.strictEqual(await G.triagemPode('PATCH', 'git/refs/heads/main', corpo({ sha: 'd'.repeat(40) })), '');
    assert.notStrictEqual(await G.triagemPode('PATCH', 'git/refs/heads/main', corpo({ sha: 'd'.repeat(40), force: true })), '');
    assert.notStrictEqual(await G.triagemPode('PUT', 'contents/apoio/acessos.json', corpo({})), '');
    assert.notStrictEqual(await G.triagemPode('DELETE', 'contents/acervo/operacional.json', corpo({})), '');
  } finally { restaura(); }
  ({ G, restaura } = carregar({ behind_by: 0, ahead_by: 1, files: [{ filename: 'acervo/operacional.json', status: 'modified' }, { filename: 'apoio/acessos.json', status: 'modified' }] }));
  try { assert.notStrictEqual(await G.triagemPode('PATCH', 'git/refs/heads/main', corpo({ sha: 'd'.repeat(40) })), ''); } finally { restaura(); }
  ({ G, restaura } = carregar({ behind_by: 3, ahead_by: 1, files: [{ filename: 'acervo/operacional.json', status: 'modified' }] }));
  try { assert.notStrictEqual(await G.triagemPode('PATCH', 'git/refs/heads/main', corpo({ sha: 'd'.repeat(40) })), '', 'commit antigo não move o ramo'); } finally { restaura(); }
});

test('chave do link depende da versão; o cookie vale só com a versão em vigor', async () => {
  const { L, restaura } = carregar({});
  try {
    assert.notStrictEqual(L.chaveTriagem(1), L.chaveTriagem(2));
    assert.ok(L.confereChaveTriagem(L.chaveTriagem(1), 1));
    assert.ok(!L.confereChaveTriagem(L.chaveTriagem(1), 2));
    let cookie = ''; L.emitirTriagem({ setHeader: (k, v) => { cookie = v.split(';')[0]; } }, 'Ana', 1);
    L.lerJson = async () => ({ dados: { linkTriagem: { versao: 1, ativo: true } } });
    assert.deepStrictEqual(await L.quemTriagem({ headers: { cookie } }), { nome: 'Ana', versao: 1 });
  } finally { restaura(); }
});
