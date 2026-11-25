'use strict';
/* Comportamento do painel da extensão HERO18810 (não só o texto do código): o painel de verdade, montado pela prévia
   (scripts/extensao/previa.py), roda num Chrome sem janela com a API simulada; o teste abre um processo e confere o que a
   pessoa vê. Sem Playwright ou Chrome na máquina, o teste é pulado (a publicação na Vercel não depende dele). */
const { test } = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os'), http = require('node:http'), { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');
let pw = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright']) { try { pw = require(p); break; } catch (e) {} }
const CHROME = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(f => fs.existsSync(f));
const pular = !pw || !CHROME ? 'sem Playwright/Chrome nesta máquina' : false;

const CNJ = '5033560-12.2026.4.03.0000';
const FICHA = JSON.parse(fs.readFileSync(path.join(ROOT, 'padrao/ficha.json'), 'utf8'));
function apiFalsa(op, sig) {
  return (url) => {
    const u = new URL(url, 'http://x'), q = u.searchParams;
    if (u.pathname === '/api/login') return { usuario: 'Bruno', gestor: true, perfil: 'desembargador' };
    if (u.pathname === '/api/sessoes') return q.get('pedidos') ? { registros: [{ id: 'so-1', tipo: 'Presencial', cnj: CNJ, data: '2026-12-07', advogado: 'Fulana', oab: 'MS 1', estado: 'vinculado', vinculo: { sessao: '2026-12-07', item: '3' } }] } : { sessoes: [{ date: '2026-12-07' }] };
    if (u.pathname === '/api/pauta') {
      if (q.get('ficha')) return { ficha: FICHA, operacional: op, fonte: { classe_judicial: 'ApCiv - APELAÇÃO CÍVEL', Assunto: 'Atraso na Entrega do Imóvel', polo_ativo: 'A', polo_passivo: 'CEF' }, sinais: [], gestor: true, controles: {} };
      if (q.get('prontuario')) return { processo: CNJ, prontuario: null, atualizadoEm: '', cartoes: [] };
      if (q.get('sigilo')) return sig;
      if (q.get('data')) return { itens: [{ cnj: CNJ, item: '3', classe: 'ApCiv - APELAÇÃO CÍVEL', assunto: 'Atraso', servidor: 'Rodrigo', dataMinuta: '2026-11-13' }] };
    }
    return {};
  };
}
async function abrir(op, sig) {
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'hero-comp-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/extensao/previa.py'), '--saida', saida]);
  const responder = apiFalsa(op, sig);
  const srv = http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(responder(req.url))); return; }
    const f = path.join(saida, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(saida) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; res.end(); return; }
    res.setHeader('Content-Type', /\.html$/.test(f) ? 'text/html' : /\.js$/.test(f) ? 'text/javascript' : /\.css$/.test(f) ? 'text/css' : /\.json$/.test(f) ? 'application/json' : 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(ok => srv.listen(0, ok));
  const b = await pw.chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 520, height: 1400 } });
  const erros = []; pg.on('pageerror', e => erros.push(e.message));
  await pg.goto('http://127.0.0.1:' + srv.address().port + '/painel/painel.html');
  await pg.waitForFunction(() => window.MutaSessao && window.MutaSessao.estado().estado === 'on', null, { timeout: 15000 });
  /* o "PJe" informa o processo aberto, como o conteudo-pje.js faria */
  await pg.evaluate(cnj => { var reg = { numero: cnj, classe: 'ApCiv', tarefa: '[Sessão] Aguardando a sessão', ctx: '', ed: false, lib: '' }; window.chrome.storage.session.set({ 'aba:1': reg }); }, CNJ);
  await pg.waitForSelector('.pm-pills', { timeout: 15000 });
  return { pg, erros, fim: async () => { await b.close(); srv.close(); } };
}

test('painel: abre o processo com sigla, etapas, roteiros e notas; sem erro de script', { skip: pular, timeout: 90000 }, async () => {
  const op = { processo: CNJ, origem: {}, triagem: { 'Tema': 'IMO-A' }, producao: { SERVIDOR: 'Rodrigo', MINUTADO: '2026-11-13' }, pauta: { sessoes: [{ sessao: '2026-12-07', item: '3', resultado: '' }] }, controles: {} };
  const P = await abrir(op, { sigilo: '', liberado: true, porque: 'gestor' });
  try {
    const { pg } = P;
    assert.equal(await pg.textContent('.pc-cl'), 'ApCiv', 'sigla da classe');
    const pil = await pg.$$eval('.pm-pl', L => L.map(x => ({ t: x.textContent.trim(), c: x.className })));
    assert.ok(pil.some(x => /^Minuta: Rodrigo · 13\/11\/2026$/.test(x.t) && /k-min ok/.test(x.c)), 'minuta verde com nome e data: ' + JSON.stringify(pil));
    assert.ok(!pil.some(x => /Liberada/.test(x.t)), 'sem "Liberada" sem as caixas do editor nem registro');
    assert.equal(await pg.$$eval('.rt-modos [data-rot]', L => L.length), 2, 'Roteiro de triagem | Roteiro de produção');
    assert.ok(await pg.$('.rt-tsel'), 'tipo de julgamento recolhido');
    assert.ok(await pg.$('.pm-sn'), 'seta síntese · notas · sinalizações');
    assert.ok(await pg.$('.nt-add[data-cs="sp"]'), 'síntese vazia vira botão "+"');
    assert.ok(!(await pg.$('#hs-mod')), 'todos os módulos carregaram');
    assert.deepEqual(P.erros, [], 'sem erro de script');
    /* Roteiro de produção: perfil acórdão, sem Pauta e julgamento (está na aba Pauta) */
    await pg.click('[data-rot="pro"]');
    const prod = await pg.$$eval('[data-cc]', L => L.map(x => x.getAttribute('data-cc')));
    assert.ok(prod.some(x => /^Acórdão · /.test(x)), 'produção de acórdão: ' + prod.join(' | '));
    assert.ok(!prod.some(x => /Pauta e julgamento|Admissibilidade|Ministério Público/.test(x)), 'sem repetir triagem nem pauta');
    /* Pauta: processo em tela com o pedido de sustentação e a lista da sessão com a sigla */
    await pg.evaluate(() => window.MutaAbas.ir('pauta'));
    await pg.waitForSelector('.pa-it', { timeout: 15000 });
    assert.ok(await pg.$('.pa-soc .pa-ped'), 'card do pedido de sustentação no processo em tela');
    assert.match(await pg.textContent('.pa-pses summary'), /1 sustentação/);
    assert.equal(await pg.textContent('.pa-it .pa-cl'), 'ApCiv');
  } finally { await P.fim(); }
});

test('painel: processo sigiloso sem liberação bloqueia a leitura dos autos e mostra o aviso', { skip: pular, timeout: 90000 }, async () => {
  const P = await abrir({ processo: CNJ, origem: {}, triagem: {}, producao: {}, pauta: {}, controles: {} }, { sigilo: 'Segredo de Justiça', liberado: false, porque: '' });
  try {
    const { pg } = P;
    await pg.waitForSelector('.sg-b', { timeout: 15000 });
    assert.match(await pg.textContent('.sg-b'), /Segredo de Justiça · leitura e gravação do inteiro teor bloqueadas/);
    assert.ok(await pg.$('.sg-b [data-sg="abrir"]'), 'liberar com senha');
    assert.equal(await pg.evaluate(() => window.MutaSigilo.bloqueado()), true);
    assert.deepEqual(P.erros, []);
  } finally { await P.fim(); }
});
