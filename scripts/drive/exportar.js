/* Exporta para JSON as planilhas que espelham no Google Drive o que a equipe vê na Pauta da equipe:
     pautas.json        uma aba por sessão liberada (exportação integral da pauta, padrão Controle de Pauta)
     monocraticas.json  uma aba por mês de registro (exportação de todas as monocráticas)
     controles.json     abas Metas (com encerrados), Sobrestados e Casos sensíveis
   Como funciona: sobe a Pauta da equipe localmente, com as funções /api reais lendo esta cópia do repositório
   (GitHub simulado, SÓ LEITURA: nada é gravado), entra como gestor de teste local e aciona os mesmos botões
   de exportação do app; cada .xlsx baixado vira linhas (cabeçalho + valores).
   Uso: node scripts/drive/exportar.js <pasta de saída>     (precisa do Playwright com Chromium)
   Quem grava no Drive é a tarefa agendada, com o conector do Google Sheets (as planilhas estão em planilhas.json). */
const http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '../..'), API = path.join(RAIZ, 'apoio/pauta-equipe/api');
const SAIDA = path.resolve(process.argv[2] || path.join(require('os').tmpdir(), 'cmt-drive'));
fs.mkdirSync(SAIDA, { recursive: true });

/* GitHub simulado sobre o repositório, recusando qualquer escrita */
const GH = require('./ghsim')(RAIZ);
const trata = (m, u, b, a) => (m === 'GET' ? GH.trata(m, u, b, a) : { status: 403, body: { message: 'exportador: só leitura' } });
/* credenciais só deste processo local (não são as do site) */
process.env.GH_TOKEN = 'exportador-local';
process.env.CMT_SESSION_SECRET = 'exportador-local-' + require('crypto').randomBytes(12).toString('hex');
process.env.CMT_USERS_JSON = JSON.stringify({ Exportador: 'exportador-local' });
process.env.CMT_GESTOR = 'Exportador';
const fetch0 = global.fetch;
global.fetch = async (url, op = {}) => {
  url = String(url);
  if (!url.startsWith('https://api.github.com')) return fetch0(url, op);
  const r = trata(op.method || 'GET', url, op.body);
  return { ok: r.status < 300, status: r.status, json: async () => r.body, text: async () => JSON.stringify(r.body) };
};
const srv = http.createServer((q, s) => {
  let b = []; q.on('data', d => b.push(d)); q.on('end', async () => {
    const u = new URL(q.url, 'http://local'), p = u.pathname; b = Buffer.concat(b).toString();
    try {
      if (p.startsWith('/api/')) {
        const nome = p.slice(5).split('/')[0], f = path.join(API, nome + '.js');
        if (nome.startsWith('_') || !fs.existsSync(f)) { s.writeHead(404); return s.end('{}'); }
        if (q.method !== 'GET' && nome !== 'login') { s.writeHead(200, { 'Content-Type': 'application/json' }); return s.end('{"ok":true,"exportador":"sem gravação"}'); }
        const req = { method: q.method, url: q.url, headers: q.headers, query: Object.fromEntries(u.searchParams), body: b ? (() => { try { return JSON.parse(b); } catch (e) { return b; } })() : undefined };
        let st = 200; const H = {};
        const res = { setHeader(k, v) { H[k] = v; return res; }, status(c) { st = c; return res; },
          json(o) { H['Content-Type'] = 'application/json'; s.writeHead(st, H); s.end(JSON.stringify(o)); return res; },
          send(t) { s.writeHead(st, H); s.end(t); return res; }, end(t) { s.writeHead(st, H); s.end(t); return res; } };
        await require(f)(req, res); return;
      }
      const rel = p === '/equipe/' ? 'apoio/pauta-equipe/index.html' : p.slice(1), abs = path.join(RAIZ, rel);
      if (!rel || !abs.startsWith(RAIZ) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { s.writeHead(404); return s.end(); }
      const ct = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(abs)] || 'application/octet-stream';
      s.writeHead(200, { 'Content-Type': ct }); fs.createReadStream(abs).pipe(s);
    } catch (e) { console.error(e); s.writeHead(500, { 'Content-Type': 'application/json' }); s.end(JSON.stringify({ erro: e.message })); }
  });
});

/* .xlsx gerado pelo app (zip sem compressão, texto em células inlineStr) → linhas */
function linhas(arq) {
  const u = fs.readFileSync(arq), dv = new DataView(u.buffer, u.byteOffset, u.byteLength); let e = -1;
  for (let i = u.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  let n = dv.getUint16(e + 10, true), o = dv.getUint32(e + 16, true), xml = '';
  for (let k = 0; k < n; k++) {
    const cs = dv.getUint32(o + 20, true), nl = dv.getUint16(o + 28, true), el = dv.getUint16(o + 30, true), cl = dv.getUint16(o + 32, true), lo = dv.getUint32(o + 42, true);
    const nome = u.subarray(o + 46, o + 46 + nl).toString();
    if (/worksheets\/sheet1\.xml$/.test(nome)) { const ini = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true); xml = u.subarray(ini, ini + cs).toString('utf8'); }
    o += 46 + nl + el + cl;
  }
  const des = t => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  return [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map(r => [...r[1].matchAll(/<c [^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g)].map(c => des(((c[1] || '').match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || '')));
}

(async () => {
  await new Promise(r => srv.listen(0, r));
  const B = 'http://localhost:' + srv.address().port;
  const { chromium } = require('playwright');
  const br = await chromium.launch(), ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }), pg = await ctx.newPage();
  const erros = []; pg.on('pageerror', e => erros.push(e.message)); pg.on('dialog', d => d.dismiss());
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const baixa = async (sel, nome) => {
    const [d] = await Promise.all([pg.waitForEvent('download', { timeout: 20000 }), pg.click(sel)]);
    const f = path.join(SAIDA, nome); await d.saveAs(f); return linhas(f);
  };
  await pg.goto(B + '/equipe/'); await pg.waitForSelector('#roster *', { timeout: 20000 });
  await pg.locator('#roster').getByText('Exportador', { exact: true }).first().click();
  await pg.fill('#en-senha', 'exportador-local'); await pg.click('#en-go');
  await pg.waitForSelector('#app:not([hidden])', { timeout: 20000 }); await espera(2500);

  /* Pautas: uma aba por sessão liberada para a equipe */
  await pg.click('[data-vw="pauta"]'); await espera(2500);
  await pg.click('#esc [data-v="todos"]').catch(() => {});
  const sessoes = await pg.$$eval('#ses option', o => o.map(x => x.value).filter(Boolean));
  const pautas = {};
  for (const d of sessoes) {
    await pg.selectOption('#ses', d); await espera(2500);
    const L = await baixa('#exp-xlsx', 'pauta_' + d + '.xlsx');
    pautas['Sessão ' + d.split('-').reverse().join('-')] = L;
  }
  /* Monocráticas: todas, separadas pelo mês de registro (sem data: pelo mês da minuta; sem nenhuma: "Sem data") */
  await pg.click('[data-vw="mono"]'); await espera(3000);
  const M = await baixa('#exp-xlsx', 'monocraticas.xlsx'), mono = {};
  if (M.length) {
    const H = M[0], iR = H.indexOf('Registrada em'), iM = H.indexOf('Minutado em');
    const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const mes = r => { const v = (iR >= 0 && r[iR]) || (iM >= 0 && r[iM]) || '', m = /(\d{2})\/(\d{4})$/.exec(v); return m ? m[2] + '-' + m[1] : ''; };
    M.slice(1).forEach(r => { const k = mes(r), aba = k ? MES[+k.slice(5) - 1] + '-' + k.slice(0, 4) : 'Sem data'; (mono[aba] = mono[aba] || { k: k || '9999', L: [H] }).L.push(r); });
  }
  const monoOrd = {}; Object.keys(mono).sort((a, b) => mono[a].k.localeCompare(mono[b].k)).forEach(a => { monoOrd[a] = mono[a].L; });
  if (!Object.keys(monoOrd).length) monoOrd['Sem registros'] = M.length ? [M[0]] : [['Nenhuma monocrática registrada']];
  /* Controles especiais */
  const controles = {};
  const ctrl = async (sub, prep, botao, aba) => {
    await pg.click('[data-vw="ctrl"]'); await espera(1500); await pg.click('#ctl-sub [data-sub="' + sub + '"]'); await espera(3500);
    if (prep) await prep();
    controles[aba] = await baixa(botao, sub + '.xlsx').catch(() => [['Nada a exportar']]);
  };
  await ctrl('metas', async () => { const c = pg.locator('#mt-enc'); if (await c.count() && !(await c.isChecked())) { await c.check(); await espera(800); } }, '#mt-xlsx', 'Metas');
  await ctrl('sobr', null, '#sb-xlsx', 'Sobrestados');
  await ctrl('sens', null, '#sn-xlsx', 'Casos sensíveis');

  const out = { gerado_em: new Date().toISOString(), pautas, monocraticas: monoOrd, controles, erros };
  fs.writeFileSync(path.join(SAIDA, 'planilhas.json'), JSON.stringify(out));
  const resumo = g => Object.entries(g).map(([k, v]) => k + ' (' + Math.max(0, v.length - 1) + ')').join(', ');
  console.log('Pautas: ' + resumo(pautas)); console.log('Monocráticas: ' + resumo(monoOrd)); console.log('Controles: ' + resumo(controles));
  if (erros.length) console.log('Erros de script na página: ' + erros.join(' | '));
  console.log('Saída: ' + path.join(SAIDA, 'planilhas.json'));
  await br.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
