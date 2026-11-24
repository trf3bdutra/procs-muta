'use strict';
/* Collectio novo (/amicus/collectio/ e /amicus/collectio/previa/); o anterior segue em /amicus/collectio/classico/ e na gestão (cg). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../../..');
const html = fs.readFileSync(path.join(ROOT, 'apoio/ex-officio/lotes/previa.html'), 'utf8');
const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/vercel-caput.yml'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

test('o Collectio novo é publicado em /amicus/collectio/ e o anterior em /classico/ e na gestão', () => {
  assert.match(wf, /cp apoio\/ex-officio\/lotes\/previa\.html site\/public\/amicus\/collectio\/index\.html/);
  assert.match(wf, /cp apoio\/ex-officio\/lotes\/previa\.html site\/public\/amicus\/collectio\/previa\/index\.html/);
  assert.match(wf, /cp apoio\/ex-officio\/lotes\/index\.html site\/public\/amicus\/collectio\/classico\/index\.html/);
  assert.match(wf, /cp apoio\/ex-officio\/lotes\/index\.html site\/public\/amicus\/collectio\/cg\/index\.html/);
  assert.match(html, /location\.replace\('\/amicus\/collectio\/classico\/'/, 'o link do Relator segue para o clássico');
});
test('só grava a matriz (gestor), a marca do PJe e o registro de assinatura; as leituras são da API do Collectio e da pauta', () => {
  const posts = [...html.matchAll(/method\s*:\s*['"]POST['"]/gi)];
  assert.equal(posts.length, 3, 'três pontos de gravação autorizados');
  const acoes = [...html.matchAll(/\bacao\s*:\s*'([^']+)'/g)].map(m => m[1]).sort();
  assert.deepEqual(acoes, ['assinatura-collectio', 'matriz', 'minuta-pje']);
  const urls = [...html.matchAll(/[^.]get\('(\/[^']+)/g)].map(m => m[1]);
  assert.ok(urls.length >= 3);
  urls.forEach(u => assert.match(u, /^\/api\/(painel\?lote=1|pauta\?(data=|mono=1))/));
});
test('coleções de decisões: Monocrática, Interlocutória e Despacho, pelo tipo de ato do Ex Officio', () => {
  for (const k of ['monocratica', 'interlocutoria', 'despacho']) assert.match(html, new RegExp("bt\\('" + k + "'"));
  assert.match(html, /get\('\/api\/pauta\?mono=1'\)/);
  assert.match(html, /function tipoMono\(/);
  assert.match(html, /ETAPAS_MONO/);
  assert.match(html, /'4 · Aguardando assinatura'/);
});
test('sem versão final importada, vale o acórdão (ou a decisão) publicado no Ementário', () => {
  assert.match(html, /baixaTexto\('\/jurisprudencia\/indice\.json\.gz'\)/);
  assert.match(html, /'\/jurisprudencia\/busca\/'\+nome\+'\.txt\.gz'/);
  assert.match(html, /async function fotoPub\(/);
  assert.match(html, /if\(lote==='#pub'\)/, 'a publicação entra no seletor de versões e na comparação');
  assert.match(html, /fiI=!!\(it&&it\.final\), pub=\(!fiI&&/, 'a versão final importada prevalece sobre a publicada');
});
test('mesa de trabalho é o layout padrão; ?layout=antigo e a triagem do Caput (?caput=1) seguem no anterior', () => {
  assert.match(html, /const MESA=!CAPUT&&!\/\[\?&\]layout=antigo/);
  assert.match(html, /if\(MESA\)return renderMesa\(\);/);
  /* a mesa usa as mesmas ações: etapas, recorte, busca, lista, matriz e o painel do processo */
  for (const k of ['data-et=', 'data-fo="retido"', 'data-vista="meus"', 'id="q"', 'id="abre-t"', 'id="mn-t"', 'data-aba="matriz"', 'procHtml()', 'matrizHtml(']) assert.ok(html.includes(k), k);
  /* coluna esquerda minimizável, lembrada no navegador */
  assert.match(html, /id="lat-t"/); assert.match(html, /cmt-collectio-lat/); assert.match(html, /class="ms-lt-mini"/);
});
test('matriz da pauta inteira sem as colunas de variação dos lotes (ficam na matriz de cada lote)', () => {
  assert.match(html, /if\(S\.loteSel\)\(l\.colunas\|\|\[\]\)\.forEach/);
});
test('scripts válidos e HTML completo', () => {
  assert.ok(html.includes('</head>') && html.includes('</body>'));
  assert.ok(scripts.length >= 2);
  scripts.forEach(s => assert.doesNotThrow(() => new Function(s)));
});
test('mesmo tema do Collectio (cmt-eq-tema) e visual editorial', () => {
  assert.match(html, /cmt-eq-tema/);
  assert.match(html, /--eo:#a57829/);
  assert.match(html, /font-family:var\(--eser\);font-style:italic/);
});

test('decisões e despachos: movimentação processual sugerida (código da TPU) abaixo da minuta', () => {
  assert.match(html, /function movSugerida\(d\)/);
  assert.match(html, /\+\(ehMono\(d\)\?movHtml\(d\):''\)/, 'só nas decisões monocráticas, interlocutórias e despachos');
  for (const c of ['237', '238', '239', '235', '230', '944', '11010']) assert.match(html, new RegExp('\\b' + c + ":'"));
  assert.match(html, /d\.movimento = \{codigo, nome, parte, obs\}/, 'a minuta pode trazer a sua movimentação');
});

test('registro de envio junto à versão importada no PJe', () => {
  assert.match(html, /id="va-pje"[^]*id="va-ass"/);
  assert.match(html, /ak\.disabled=assinada\|\|!podeAssinatura\(atual\)\|\|assOcupado\|\|\(!ak\.checked&&!v\.pje\)/);
  assert.match(html, /registraAssinatura\(marcar\?'enviar':'desfazer-envio',\[cnj\]\)/);
  assert.match(html, /acao:'assinatura-collectio'/);
});
