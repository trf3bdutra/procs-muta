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
if (process.env.HERO_TEST_REQUIRED === '1' && pular) throw new Error(pular);

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
  let b; const fim = async () => { try { if (b) await b.close(); } finally { await new Promise(ok => srv.close(ok)); fs.rmSync(saida, { recursive: true, force: true }); } };
  try {
  b = await pw.chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 520, height: 1400 } });
  const erros = []; pg.on('pageerror', e => erros.push(e.stack || e.message));
  await pg.goto('http://127.0.0.1:' + srv.address().port + '/painel/painel.html');
  await pg.waitForFunction(() => window.MutaSessao && window.MutaSessao.estado().estado === 'on', null, { timeout: 15000 });
  /* o "PJe" informa o processo aberto, como o conteudo-pje.js faria */
  await pg.evaluate(cnj => { var reg = { numero: cnj, classe: 'ApCiv', tarefa: '[Sessão] Aguardando a sessão', ctx: '', ed: false, lib: '' }; window.chrome.storage.session.set({ 'aba:1': reg }); }, CNJ);
  await pg.waitForSelector('.pm-pills', { timeout: 15000 });
  return { pg, erros, fim };
  } catch (e) { await fim(); throw e; }
}

test('painel: abre o processo com sigla, etapas, roteiros e notas; sem erro de script', { skip: pular, timeout: 90000 }, async () => {
  const op = { processo: CNJ, origem: {}, triagem: { 'Tema': 'IMO-A' }, producao: { SERVIDOR: 'Rodrigo', MINUTADO: '2026-11-13', Destino: 'Sessão' }, pauta: { sessoes: [{ sessao: '2026-12-07', item: '3', resultado: '' }] }, controles: {} };
  const P = await abrir(op, { sigilo: '', liberado: true, porque: 'gestor' });
  try {
    const { pg } = P;
    assert.equal(await pg.textContent('.pc-cl'), 'ApCiv', 'sigla da classe');
    const pil = await pg.$$eval('.pm-pl', L => L.map(x => ({ t: x.textContent.trim(), c: x.className })));
    assert.ok(pil.some(x => /^Minuta: Rodrigo · 13\/11\/2026$/.test(x.t) && /k-min ok/.test(x.c)), 'minuta verde com nome e data: ' + JSON.stringify(pil));
    assert.ok(!pil.some(x => /Liberada/.test(x.t)), 'sem "Liberada" sem as caixas do editor nem registro');
    assert.deepEqual(await pg.$$eval('.hero-main-tabs [data-rot]', L => L.map(b=>b.dataset.rot)), ['res','tri','pro'], 'Resumo, Triagem e Produção com Autos como subaba independente');
    assert.ok(await pg.$('.hero-main-tabs [data-aba="Autos"]'), 'Autos em aba própria');
    assert.ok(await pg.$('.hero-tipo-ref'), 'tipo de julgamento no cartão');
    assert.equal(await pg.$$eval('.hero-sn-ind [data-sn-kind]', L => L.length), 3, 'sinalizações independentes');
    assert.ok(await pg.$('.hero-ann-unified button[title="Incluir anotação"]'), 'inclusão de sínteses e anotações no cartão');
    assert.ok(!(await pg.$('#hs-mod')), 'todos os módulos carregaram');
    assert.deepEqual(P.erros, [], 'sem erro de script');
    /* Roteiro de produção: perfil acórdão, sem Pauta e julgamento (está na aba Pauta) */
    await pg.click('.hero-main-tabs [data-rot="pro"]');
    await pg.waitForSelector('.hero-minuta-roteiro', { timeout: 15000 });
    assert.equal(await pg.getAttribute('.hero-main-tabs [data-rot="pro"]','aria-selected'),'true');
    const prod = await pg.$$eval('.hero-minuta-secao[data-cc]', L => L.map(x => x.getAttribute('data-cc')));
    assert.deepEqual(prod,['minuta-relatorio','minuta-questoes','minuta-solucao','minuta-fundamentacao','minuta-sucumbencia','minuta-dispositivo']);
    await pg.click('.hero-minuta-nav-steps [data-minuta-nav="solucao"]');
    await pg.waitForSelector('#pv-julgamento', { timeout: 15000 });
    assert.ok((await botoes(pg)).includes('Desprovido'), 'resultado de recurso na seção Solução');
    assert.equal(await pg.$$eval('.gbody [data-fk="producao.Destino"]', L=>L.length),0,'destino não se repete no roteiro');
    /* O pedido do processo fica na aba Solicitações da ficha; os pedidos da sessão na subaba Solicitações da Pauta. */
    await pg.evaluate(() => window.MutaAbas.ir('pauta'));
    await pg.waitForSelector('.pa-it', { timeout: 15000 });
    assert.equal(await pg.textContent('.pa-it .pa-cl'), 'ApCiv');
    assert.match(await pg.textContent('.pa-it .pa-al'), /Sustentação/);
    await pg.click('[data-pa="aba:sol"]');
    await pg.waitForSelector('#pauta-app .pa-ped', { timeout: 15000 });
    assert.match(await pg.textContent('#pauta-app .pa-sol-resumo'), /1 pedidos externos/);
    const pedido = await pg.textContent('#pauta-app .pa-ped');
    assert.match(pedido, /Sustentação presencial/);
    assert.match(pedido, /item 3/);
    assert.ok(pedido.includes(CNJ) && pedido.includes('Fulana'), 'pedido identificado e vinculado à sessão');
    assert.deepEqual(P.erros, [], 'sem erro de script');
  } finally { await P.fim(); }
});

test('painel: processo sigiloso sem liberação bloqueia a leitura dos autos e mostra o aviso', { skip: pular, timeout: 90000 }, async () => {
  const P = await abrir({ processo: CNJ, origem: {}, triagem: {}, producao: {}, pauta: {}, controles: {} }, { sigilo: 'Segredo de Justiça', liberado: false, porque: '' });
  try {
    const { pg } = P;
    await pg.waitForSelector('.status-sigilo[data-estado="restrito"]', { timeout: 15000 });
    assert.equal(await pg.evaluate(() => window.MutaSigilo.bloqueado()), true);
    await pg.click('.status-sigilo[data-estado="restrito"]');
    await pg.waitForSelector('.hero-steps.hero-steps-mon .hero-sig-details .sg-b', { timeout: 15000 });
    assert.match(await pg.textContent('.hero-steps .hero-sig-details .sg-b'), /Segredo de Justiça · leitura e gravação do inteiro teor bloqueadas/);
    assert.ok(await pg.$('.sg-b [data-sg="abrir"]'), 'liberar com senha');
    assert.equal(await pg.evaluate(() => window.MutaSigilo.bloqueado()), true);
    assert.deepEqual(P.erros, []);
  } finally { await P.fim(); }
});

/* prontuário universal (prévia): painel Julgamento na Produção, com as opções pelo pronunciamento e pelo tipo de julgamento */
async function abrirUniversal(op) {
  const P = await abrir(op, { sigilo: '', liberado: true, porque: 'gestor' });
  try {
  const url = P.pg.url().replace('/painel/painel.html', '/painel/universal.html');
  await P.pg.goto(url);
  await P.pg.waitForFunction(() => window.MutaSessao && window.MutaSessao.estado().estado === 'on', null, { timeout: 15000 });
  await P.pg.evaluate(cnj => { window.chrome.storage.session.set({ 'aba:1': { numero: cnj, classe: 'ApCiv', tarefa: '[Sessão] Aguardando a sessão', ctx: '', ed: false, lib: '' } }); }, CNJ);
  await P.pg.waitForSelector('.hero-main-tabs [data-rot="pro"]', { timeout: 15000 });
  await P.pg.click('.hero-main-tabs [data-rot="pro"]');
  await P.pg.waitForSelector('.hero-minuta-roteiro', { timeout: 15000 });
  await P.pg.click('.hero-minuta-nav-steps [data-minuta-nav="solucao"]');
  await P.pg.waitForSelector('#pv-julgamento', { timeout: 15000 });
  return P;
  } catch(e) { const diagnostico = await P.pg.evaluate(() => ({ abas: [...document.querySelectorAll('.hero-main-tabs button')].map(x=>[x.textContent,x.getAttribute('aria-selected')]), corpo: document.querySelector('.gbody')?.innerText?.slice(0,800) || '', gabinete: document.querySelector('#gab')?.innerText?.slice(0,800) || '' })).catch(()=>({})); await P.fim(); throw new Error(e.message+'\nErros da página: '+P.erros.join('\n')+'\nEstado: '+JSON.stringify(diagnostico),{cause:e}); }
}
const RJ = '[data-fk="producao.Voto - Resultado"],[data-ch="producao.Voto - Resultado"]';
const botoes = pg => pg.$$eval('#pv-julgamento :is(' + RJ + ')', L => L.map(x => x.tagName === 'SELECT' ? [].map.call(x.options, o => o.value).filter(Boolean) : [x.getAttribute('data-v')]).flat());
test('universal: Julgamento do acórdão — resultado de recurso, tese e precedentes, um só lugar de edição', { skip: pular, timeout: 90000 }, async () => {
  const op = { processo: CNJ, origem: {}, triagem: { 'Tipo de Julgamento': 'Apelação' }, producao: { Destino: 'Sessão', 'Voto - Resultado': 'Negado provimento' }, pauta: {}, controles: {} };
  const P = await abrirUniversal(op);
  try {
    const { pg } = P;
    assert.match(await pg.textContent('#pv-julgamento'), /Solução do julgamento/);
    assert.ok(await pg.$('[data-cc="minuta-fundamentacao"] [data-fk="producao.Tese jurídica adotada"]'), 'tese na Fundamentação');
    assert.equal(await pg.$$eval('#hero-encaminhamento [data-fk="triagem.Hipóteses Monocrática"]', L=>L.length),0,'sem art. 932 em acórdão');
    const R = await botoes(pg);
    assert.ok(R.includes('Desprovido') && !R.includes('Deferido'), 'opções de recurso: ' + R.join(', '));
    const escolhido = await pg.evaluate(() => { const p=document.querySelector('#pv-julgamento'),sel=p.querySelector('select[data-fk="producao.Voto - Resultado"]'),bt=p.querySelector('[data-ch="producao.Voto - Resultado"].on');return sel?sel.value:bt?.dataset.v;});
    assert.equal(escolhido, 'Desprovido', '"Negado provimento" convertido');
    if (process.env.HERO_FOTO) await pg.screenshot({ path: process.env.HERO_FOTO + '-ac.png', fullPage: true });
    assert.equal(await pg.$$eval(RJ, L => L.filter(x => !x.closest('#pv-julgamento')).length), 0, 'resultado editável só no Julgamento');
    assert.deepEqual(P.erros, [], 'sem erro de script');
  } finally { await P.fim(); }
});
test('universal: Julgamento da monocrática e da urgência — hipótese do art. 932 e opções próprias', { skip: pular, timeout: 90000 }, async () => {
  const op = { processo: CNJ, origem: {}, triagem: { 'Tipo de Julgamento': 'Apelação' }, producao: { Destino: 'Monocrática', 'Mono - Tipo de ato': 'Decisão monocrática (art. 932)' }, pauta: {}, controles: {} };
  const P = await abrirUniversal(op);
  try {
    const { pg } = P;
    await pg.click('.hero-main-tabs [data-rot="tri"]');assert.ok(await pg.$('#hero-encaminhamento [data-fk="triagem.Hipóteses Monocrática"]'), 'art. 932 no Encaminhamento');await pg.click('.hero-main-tabs [data-rot="pro"]');await pg.click('.hero-minuta-nav-steps [data-minuta-nav="solucao"]');
    assert.ok(await pg.$('[data-cc="minuta-fundamentacao"] [data-fk="producao.Mono - Fundamento"]'), 'precedente ou fundamento na Fundamentação');
    assert.ok((await botoes(pg)).includes('Desprovido'));
    if (process.env.HERO_FOTO) await pg.screenshot({ path: process.env.HERO_FOTO + '-mono.png', fullPage: true });
    assert.deepEqual(P.erros, [], 'sem erro de script');
  } finally { await P.fim(); }
  const P2 = await abrirUniversal(Object.assign({}, op, { producao: { Destino: 'Monocrática', 'Mono - Tipo de ato': 'Decisão de urgência' } }));
  try {
    const R = await botoes(P2.pg);
    assert.ok(R.includes('Deferido') && !R.includes('Desprovido'), 'urgência: ' + R.join(', '));
    assert.equal(await P2.pg.$$eval('#hero-encaminhamento [data-fk="triagem.Hipóteses Monocrática"]', L=>L.length),0,'urgência não é enquadramento no art. 932');
    assert.equal(await P2.pg.$$eval('[data-cc="minuta-sucumbencia"]', L=>L.length),0,'sem sucumbência na urgência');
  } finally { await P2.fim(); }
});

test('universal v53: Encaminhamento na Triagem, Monitoramento e sinalizações no Resumo', { skip: pular, timeout: 90000 }, async () => {
  const op = { processo: CNJ, origem: {}, triagem: { 'Tipo de Julgamento': 'Apelação', 'Seleção Prévia': 'SELECIONADO PREVIAMENTE', META: 'Sim', Avisos: 'x', 'Registro - Situação atual': 'Acervo importado' }, producao: { Destino: 'Sessão' }, pauta: {}, controles: {} };
  const P = await abrir(op, { sigilo: '', liberado: true, porque: 'gestor' });
  try {
    const { pg } = P;
    await pg.goto(pg.url().replace('/painel/painel.html', '/painel/universal.html'));
    await pg.waitForFunction(() => window.MutaSessao && window.MutaSessao.estado().estado === 'on', null, { timeout: 15000 });
    await pg.evaluate(cnj => { window.chrome.storage.session.set({ 'aba:1': { numero: cnj, classe: 'ApCiv', tarefa: 'x', ctx: '', ed: false, lib: '' } }); }, CNJ);
    await pg.waitForSelector('.hero-main-tabs [data-rot="tri"]', { timeout: 15000 });
    await pg.click('.hero-main-tabs [data-rot="tri"]');
    /* Encaminhamento é a segunda face do prontuário (seta ›), não aba do rodapé */
    assert.ok(!(await pg.$('#hero-dock-tab-acompanhamento')), 'sem a aba Encaminhamento no rodapé');
    await pg.waitForSelector('.gbody #hero-encaminhamento', { state: 'visible', timeout: 15000 });
    assert.equal(await pg.getAttribute('.hero-main-tabs [data-rot="tri"]', 'aria-selected'), 'true', 'Encaminhamento na Triagem');
    assert.ok(await pg.$('#hero-encaminhamento [data-fk="producao.Destino"]'), 'destino no Encaminhamento');
    assert.equal(await pg.inputValue('#hero-encaminhamento [data-fk="triagem.Seleção Prévia"]'),'SELECIONADO PREVIAMENTE');
    assert.ok(await pg.$('#hero-encaminhamento .pm-sitj'), 'situação para julgar no Encaminhamento');
    await pg.click('.hero-main-tabs [data-rot="res"]');assert.ok(await pg.$('.hero-designacoes [data-fk="origem.Responsável"]'), 'responsável na faixa de designações');
    assert.ok(!(await pg.$('.pv-flowbox .pm-sitj')), 'sem duplicação na faixa de etapas');
    assert.ok(await pg.$('.hero-top-page .hero-reg-acervo'), 'registro no acervo em Autuação');
    assert.equal(await pg.getAttribute('.hero-main-tabs [data-rot="res"]','aria-selected'),'true');
    await pg.click('.hero-sn-ind [data-sn-kind="av"]');
    await pg.waitForSelector('#hero-dock-pane-sinalizacoes #g-sn', { timeout: 15000 });
    assert.equal(await pg.getAttribute('.hero-sn-ind [data-sn-kind="av"]','aria-pressed'),'true');
    assert.ok(await pg.$('#hero-dock-pane-sinalizacoes .sn-i.av'), 'avisos na categoria selecionada');
    /* as sinalizações ocupam o lugar das etapas no mesmo cartão */
    const sn = await pg.evaluate(() => ({ noCartao: !!document.querySelector('.hero-steps.hero-steps-sn>#hero-dock-pane-sinalizacoes'), etapasOcultas: !document.querySelector('.hero-steps .pv-flowbox').offsetParent, titulo: document.querySelector('.hero-sn-ind [data-sn-kind="av"]').getAttribute('aria-label') }));
    assert.ok(sn.noCartao && sn.etapasOcultas, 'sinalizações no lugar das etapas: ' + JSON.stringify(sn));
    assert.match(sn.titulo,/Avisos/i);
    await pg.click('.hero-v53-dock-tabs [data-hero-dock=""]');
    assert.ok(await pg.$eval('.hero-steps .pv-flowbox', e => !!e.offsetParent), 'volta às etapas');
    /* Monitoramento é uma terceira visão do cartão Etapas, sem janela sobreposta. */
    await pg.click('.hero-case-status .status-meta');
    await pg.waitForSelector('.hero-steps.hero-steps-mon>#hero-dock-pane-monitoramento .ct-i.meta', { state: 'visible', timeout: 15000 });
    assert.equal(await pg.getAttribute('.hero-v53-dock-tabs [data-hero-dock="monitoramento"]','aria-pressed'),'true');
    assert.equal(await pg.getAttribute('.hero-case-status .status-meta','aria-pressed'),'true');
    assert.ok(!(await pg.$('#hero-mon-dlg')), 'sem diálogo');
    assert.ok(await pg.$eval('.hero-steps .pv-flowbox', e => !e.offsetParent), 'etapas substituídas');
    await pg.click('.hero-sn-ind [data-sn-kind="av"]');
    await pg.waitForSelector('.hero-steps.hero-steps-sn>#hero-dock-pane-sinalizacoes', { state: 'visible', timeout: 15000 });
    assert.ok(await pg.$eval('#hero-dock-pane-monitoramento', e => e.hidden), 'visões mutuamente exclusivas');
    await pg.click('.hero-case-status .status-meta');
    await pg.waitForSelector('.hero-steps.hero-steps-mon>#hero-dock-pane-monitoramento', { state: 'visible', timeout: 15000 });
    await pg.click('.hero-case-status .status-meta');
    assert.ok(await pg.$eval('.hero-steps .pv-flowbox', e => !!e.offsetParent), 'mesmo indicador volta às etapas');
    assert.deepEqual(P.erros, [], 'sem erro de script');
  } finally { await P.fim(); }
});

/* 0.73 · organização do prontuário universal: abas das faces sem as setas, Diligências e Deliberações na faixa de abas,
   etapa atual distinta, sinalizações com rótulo e um só "Ler os autos" (nas outras abas, aviso que leva à aba Autos) */
test('universal v53: quatro subabas, sinalizações na barra, cinco páginas no rodapé e leitura em Autos', { skip: pular, timeout: 90000 }, async () => {
  const op = { processo: CNJ, origem: {}, triagem: { 'Tipo de Julgamento': 'Apelação' }, producao: { SERVIDOR: 'Rodrigo', MINUTADO: '2026-11-13', Destino: 'Sessão' }, pauta: {}, controles: {} };
  const P = await abrir(op, { sigilo: '', liberado: true, porque: 'gestor' });
  try {
    const { pg } = P;
    await pg.goto(pg.url().replace('/painel/painel.html', '/painel/universal.html'));
    await pg.waitForFunction(() => window.MutaSessao && window.MutaSessao.estado().estado === 'on', null, { timeout: 15000 });
    await pg.evaluate(cnj => { window.chrome.storage.session.set({ 'aba:1': { numero: cnj, classe: 'ApCiv', tarefa: '[Sessão] Aguardando a sessão', ctx: '', ed: false, lib: '' } }); }, CNJ);
    await pg.waitForSelector('.hero-steps-head .hero-sn-ind', { timeout: 15000 });
    const v = await pg.evaluate(() => {
      const vis = e => !!(e && e.offsetParent);
      return {
        setas: [...document.querySelectorAll('.hero-header-nav>button[aria-label^="Próxima"],.hero-header-nav>button[aria-label^="Anterior"]')].filter(vis).length,
        faces: [...document.querySelectorAll('.hero-v53-tabs button')].filter(vis).map(b => b.textContent.trim()),
        abas: [...document.querySelectorAll('#pv-nav-main button')].filter(vis).map(b => b.querySelector('b').textContent.trim()),
        etapas: [...document.querySelectorAll('.pv-stage')].map(e => e.className),
        rotulos: [...document.querySelectorAll('.pv-snr')].map(e => e.textContent),
        lerAutos: [...document.querySelectorAll('[data-au="ler"]')].filter(vis).length,
        frase: (document.body.innerText.match(/Abra os autos digitais/g) || []).length
      };
    });
    assert.equal(v.setas, 0, 'sem setas de navegação');
    assert.deepEqual(v.faces,['Resumo','Autos','Triagem','Produção']);
    assert.ok(await pg.$('.hero-steps-head .hero-sn-ind'), 'sinalizações na barra do cartão Etapas');
    assert.equal(await pg.locator('.hero-header-nav .hero-face-label').count(),0,'sem face antiga');
    assert.equal(await pg.$$eval('.hero-case-status .hero-status-icon[data-ativo="false"]', L => L.filter(x => x.offsetParent).length),0,'ícones inativos ocultos');
    await pg.click('.hero-v53-dock-tabs [data-hero-dock="monitoramento"]');
    await pg.waitForSelector('.hero-steps.hero-steps-mon>#hero-dock-pane-monitoramento');
    await pg.click('.hero-v53-dock-tabs [data-hero-dock=""]');
    assert.deepEqual(v.abas, ['Prontuário', 'Corretor', 'Repertório', 'Pauta', 'Diretrizes'], 'faixa principal sem gestão duplicada');
    for (const [id, nome] of [['tab-dil', 'Diligências'], ['tab-del', 'Deliberações']]) {
      const seletor = '#tu-gestao #' + id;
      await pg.waitForSelector(seletor, { state: 'visible', timeout: 15000 });
      assert.equal(await pg.locator(seletor).getAttribute('aria-label'), nome);
      assert.equal(await pg.locator('#' + id).count(), 1, nome + ' sem duplicação');
      await pg.click(seletor);
      await pg.waitForSelector('#panel-' + id.slice(4), { state: 'visible', timeout: 15000 });
    }
    await pg.click('#tab-pront');
    assert.ok(v.etapas.some(c => /\bok\b/.test(c)) && v.etapas.some(c => /\bat\b/.test(c)) && v.etapas.some(c => /\bpend\b/.test(c)), 'feita, atual e pendente: ' + v.etapas.join(' | '));
    for (const k of ['pd','ic','av']) assert.ok(await pg.locator('.hero-steps-head [data-sn-kind="'+k+'"]').getAttribute('aria-label'), 'sinalização com rótulo acessível: '+k);
    assert.equal(v.lerAutos, 0, 'leitura exclusiva da aba Autos');
    await pg.click('.hero-sn-ind [data-sn-kind="av"]');
    await pg.waitForSelector('#hero-dock-pane-sinalizacoes .hero-ann-unified button[title="Incluir anotação"]',{state:'visible'});
    await pg.click('#hero-dock-pane-sinalizacoes .hero-ann-unified button[title="Incluir anotação"]');
    await pg.waitForSelector('#hero-dock-pane-sinalizacoes textarea[placeholder="Registrar anotação"]',{state:'visible'});
    await pg.click('.hero-v53-dock-tabs [data-hero-dock=""]');
    assert.ok(v.frase <= 1, 'sem a frase repetida');
    await pg.evaluate(() => [...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.trim() === 'Triagem').click());
    await pg.waitForSelector('.hero-v53-autos-link', { timeout: 15000 });
    assert.equal(await pg.$$eval('[data-au="ler"]', L => L.filter(x => x.offsetParent).length), 0, 'na Triagem, só o aviso');
    await pg.click('.hero-v53-autos-link');
    await pg.waitForSelector('#g-lei [data-au="ler"]', { timeout: 15000 });
    assert.deepEqual(P.erros, [], 'sem erro de script');
  } finally { await P.fim(); }
});

test('universal 0.73.5: Controle dentro dos Ajustes, Gerador na Produção e cabeçalho do resumo no padrão do painel', { skip: pular, timeout: 90000 }, async () => {
  const op = { processo: CNJ, origem: {}, triagem: { 'Tipo de Julgamento': 'Apelação', 'Assunto detalhado': 'Saúde — vosoritida para acondroplasia', 'Detalhamento do caso': 'Apelação da União e remessa necessária em ação de obrigação de fazer.' }, producao: { SERVIDOR: 'Rodrigo', MINUTADO: '2026-11-13', Destino: 'Sessão' }, pauta: {}, controles: {} };
  const P = await abrirUniversal(op);
  try {
    const { pg } = P;
    const cab = await pg.evaluate(() => { const b = document.querySelector('button.hero-case-detail'), s = b && getComputedStyle(b); return s ? [s.textAlign, s.borderTopStyle, s.backgroundColor] : null; });
    assert.ok(cab, 'detalhamento no cabeçalho'); assert.equal(cab[0], 'left'); assert.notEqual(cab[1], 'outset', 'sem o botão padrão do navegador');
    await pg.evaluate(() => window.MutaAbas.ir('ctl'));
    await pg.waitForSelector('#pv-ajustes-ctl:not([hidden]) #ctl-app', { timeout: 10000 });
    assert.equal(await pg.evaluate(() => document.getElementById('pv-ajustes-dialog').open), true, 'Controle abre nos Ajustes, sem tela à parte');
    assert.match(await pg.evaluate(() => document.getElementById('pv-ajustes-ctl').innerText), /Prazos/);
    await pg.evaluate(() => document.getElementById('pv-ajustes-ok').click());
    await pg.evaluate(() => window.MutaGabinete.irGerador());
    await pg.waitForSelector('.hero-v53-gerador #ger-app .gr-doc', { timeout: 10000 });
    assert.equal(await pg.evaluate(() => document.querySelectorAll('#ger-app').length), 1);
    assert.match(await pg.evaluate(() => document.getElementById('ger-app').innerText), /RELATÓRIO|Relatório/);
    assert.equal(await pg.locator('#panel-min #ger-app').count(),0,'Corretor não tem o Gerador');
  } finally { await P.fim(); }
});
