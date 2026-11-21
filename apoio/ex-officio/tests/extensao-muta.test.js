'use strict';
/* Extensão Muta 0.8: leitura do PJe, comparação de textos, motor da conformidade e pacote de dados. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'),
  os = require('node:os'), zlib = require('node:zlib'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), ext = path.join(root, 'extensao');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const C = require(path.join(ext, 'comparador.js')), M = require(path.join(ext, 'conformidade-motor.js'));

test('extensão: JavaScript válido, manifesto lê o painel de tarefas do PJe e o painel carrega os módulos na ordem', () => {
  fs.readdirSync(ext).filter(f => f.endsWith('.js')).forEach(f => new vm.Script(fs.readFileSync(path.join(ext, f), 'utf8'), { filename: f }));
  const man = JSON.parse(read('extensao/manifest.json'));
  assert.ok(man.content_scripts[0].matches.includes('https://frontend-pje.app.trf3.jus.br/*'), 'quadro do painel de tarefas');
  assert.ok(man.content_scripts[0].all_frames);
  const html = read('extensao/painel.html'), ordem = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  ['comum.js', 'sessao.js', 'prontuario.js', 'gabinete.js', 'sincronia.js', 'comparador.js', 'fontes.js', 'editor.js', 'conformidade-motor.js', 'comparar.js', 'conformidade.js', 'pje.js']
    .reduce((ant, f) => { const i = ordem.indexOf(f); assert.ok(i > ant, f + ' fora de ordem'); return i; }, -1);
  ['panel-min', 'panel-conf', 'cmp-app', 'conf-app', 'sinc-txt'].forEach(id => assert.ok(html.includes('id="' + id + '"'), id));
});

test('conteúdo do PJe: o cabeçalho da tarefa identifica o processo mesmo com a lista ao lado', () => {
  const src = read('extensao/conteudo-pje.js');
  const re = new RegExp(/RE_TAREFA = new RegExp\('(.+?)', 'g'\)/.exec(src)[1].replace(/\\\\/g, '\\').replace("' + CNJ + '", '(\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4})'), 'g');
  const tela = 'ApCiv 5000084-53.2026.4.03.6702\nForn. de medicamentos\nApCiv 5001289-76.2023.4.03.6006  - [Sessão] Aguardando a sessão\nUNIÃO x FULANO';
  const achados = [...tela.matchAll(re)].map(m => m[2]);
  assert.deepEqual(achados, ['5001289-76.2023.4.03.6006']);
});

test('comparador: vaga do modelo recebe o texto do editor; resultado trocado aparece riscado e em verde', () => {
  const A = [{ h: 'Voto' }, { p: 'O Desembargador Federal Carlos Muta (Relator):' }, { p: 'Senhores Desembargadores, {{abertura}}.' }, { p: '{{moldura jurídica da matéria}}' }, { p: 'Ante o exposto, nego provimento à apelação.' }, { p: 'É como voto.' }];
  const B = ['O Desembargador Federal Carlos Muta (Relator):', 'Senhores Desembargadores, a apelação é tempestiva.', 'No caso, a Lei 8.213/1991 dispõe que.', 'Ante o exposto, dou provimento à apelação.', 'É como voto.'];
  const r = C.comparar(A, B, { sd: false });
  assert.equal(r.vagas, 1);
  assert.match(r.html, /<del>nego<\/del> <ins>dou<\/ins>/);
  assert.match(r.html, /cx-slot[\s\S]*No caso, a Lei 8\.213\/1991/);
  assert.ok(r.html.indexOf('cx-slot') < r.html.indexOf('Ante o exposto'), 'a vaga fica no lugar dela, antes do dispositivo');
  assert.deepEqual(r.faltam, []); assert.deepEqual(r.sobram, []);
  const P = C.partes(['TRF-3', 'RELATÓRIO', 'Trata-se', 'É o relatório.', 'VOTO', 'x', 'E M E N T A', 'DIREITO', 'ACÓRDÃO', 'Vistos']);
  assert.deepEqual([P.cabecalho.length, P.relatorio.length, P.voto.length, P.ementa.length, P.acordao.length], [1, 2, 1, 1, 1]);
});

test('conformidade: estrutura, resultado, ementa, IDʼs e redação', () => {
  const ps = ['RELATÓRIO', 'Trata-se de apelação à sentença (ID 1234567) que julgou improcedente o pedido.', 'Apelou a autora (ID 2345678), alegando, em suma, que: (1) x; e (2) y.', 'É o relatório.',
    'VOTO', 'O Desembargador Federal Carlos Muta (Relator):', 'Senhores Desembargadores, A União Federal sustentou o que consta do ID 9999999.', 'Nesse sentido, o art. 5º e o § 2° tratam do tema.',
    'Ante o exposto, dou provimento à apelação.', 'É como voto.',
    'EMENTA', 'DIREITO PREVIDENCIÁRIO. APELAÇÃO CÍVEL. APOSENTADORIA. APELAÇÃO DESPROVIDA.', 'I. CASO EM EXAME', '1. Apelação contra sentença (ID 1234567).', 'II. QUESTÃO EM DISCUSSÃO', '2. A questão consiste em saber se cabe o benefício.',
    'III. RAZÕES DE DECIDIR', '4. Fundamento.', 'IV. DISPOSITIVO', '5. Apelação desprovida.', 'ACÓRDÃO', 'Vistos …, por unanimidade, negou provimento à apelação …']
    .map(t => ({ t }));
  const r = M.analisar(ps, { prontuario: { julgamento: { resultado: 'Negar provimento' }, pecas: [{ id: '1234567' }, { id: '2345678' }], recursos: [], origem: {}, regularidade: {}, recursoTipo: {}, caso: {} },
    diretrizes: [{ id: 'red-alv-01', tipo: 'alerta', escopo: 'voto', padrao: '\\bUnião Federal\\b', flags: 'i', msg: 'use “União”' }, { id: 'red-alv-07', tipo: 'alerta', escopo: 'voto', padrao: '\\bNesse\\s+sentido\\b', flags: 'gi', msg: 'Neste sentido' }],
    manual: [{ id: 'MAN-CMT-113', padrao: '\\b(?:art\\.|arts\\.)\\s*\\d', flags: 'gi', orientacao: 'artigo por extenso' }] });
  const regras = r.itens.map(x => x.regra);
  assert.equal(r.peca, 'acordao');
  ['resultado', 'resultado-prontuario', 'red-dir-31', 'red-alv-01', 'red-alv-07', 'MAN-CMT-113', 'ID-prontuario', 'MAN-CMT-037', 'MAN-CMT-033', 'caça'].forEach(k => assert.ok(regras.includes(k), 'falta ' + k));
  assert.ok(r.itens.find(x => x.regra === 'ID-prontuario' && /9999999/.test(x.msg)), 'ID desconhecido');
  assert.ok(!r.itens.find(x => x.regra === 'ID-prontuario' && /1234567|2345678/.test(x.msg)), 'IDs do prontuário não são apontados');
  assert.ok(r.itens.find(x => x.regra === 'MAN-CMT-033' && /veio 4 depois de 2/.test(x.msg)), 'numeração da ementa');
  assert.ok(r.resumo.alta >= 3);
  assert.equal(M.resultadoDe('Ante o exposto, nego provimento à apelação.'), 'desprovido');
  assert.equal(M.resultadoDe('Ante o exposto, dou parcial provimento à apelação.'), 'parcial');
  assert.equal(M.resultadoDe('Ante o exposto, rejeito os embargos de declaração.'), 'rejeitados');
});

test('conformidade: transcrição e trecho entre aspas ficam fora das regras de redação', () => {
  const ps = ['VOTO', 'O Desembargador Federal Carlos Muta (Relator):', 'Senhores Desembargadores, cabe registrar o que diz a lei:', 'Art. 5º A União Federal fica autorizada.',
    'Consta da decisão que “a União Federal recorreu”, o que se confirma.', { t: '“Texto longo de ementa transcrita que fala da União Federal e do art. 3º, em itálico.” (g.n.)', ita: 1 }, 'Ante o exposto, nego provimento à apelação.', 'É como voto.']
    .map(x => typeof x === 'string' ? { t: x } : x);
  const r = M.analisar(ps, { diretrizes: [{ id: 'red-alv-01', tipo: 'alerta', escopo: 'voto', padrao: '\\bUnião Federal\\b', flags: 'i', msg: 'use “União”' }] });
  assert.ok(!r.itens.some(x => x.regra === 'red-alv-01'), JSON.stringify(r.itens.filter(x => x.regra === 'red-alv-01')));
});

test('pacote de dados da extensão: modelos, matrizes, 28,86%, parágrafos e regras, com expressões válidas no JavaScript', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'muta-dados-'));
  execFileSync('python3', [path.join(root, 'scripts/extensao/dados.py'), '--saida', out], { stdio: 'pipe' });
  const d = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(out, 'base.json.gz'))));
  assert.equal(d.schema, 'muta.extensao.dados');
  assert.ok(d.modelos.length > 100 && d.matrizes.length > 10 && d.m2886.grupos.length >= 5 && d.kit2886.length > 5 && d.paragrafos.length > 100);
  d.diretrizes.concat(d.manual.filter(x => x.padrao)).forEach(x => new RegExp(x.padrao, (x.flags || '').replace(/[^gimsuy]/g, '')));
  assert.ok(d.m2886.grupos[0].secoes.some(s => s.t === 'Voto' && s.ps.some(p => /É como voto\./.test(p))));
  const wf = read('.github/workflows/vercel-caput.yml');
  assert.ok(wf.includes('scripts/extensao/dados.py --saida site/public/extensao/dados'));
});

test('extensão 0.11: os motores copiados de padrao/ são idênticos aos do site', () => {
  [['padrao/inteiro-teor.js', 'extensao/padrao-inteiro-teor.js'], ['padrao/calendario-forense.js', 'extensao/padrao-calendario-forense.js']]
    .forEach(([a, b]) => assert.equal(read(b), read(a), b + ' difere de ' + a + ': copie de novo'));
  const html = read('extensao/painel.html');
  ['vendor/pdf.min.js', 'padrao-calendario-forense.js', 'padrao-inteiro-teor.js', 'autos.js', 'paragrafos.js', 'diretrizes.js']
    .forEach(f => assert.ok(html.includes('src="' + f + '"'), f + ' no painel'));
  ['tab-pront', 'tab-min', 'tab-acervo', 'tab-par', 'tab-dir', 'tab-ajuda', 'panel-min', 'min-conf'].forEach(id => assert.ok(html.includes('id="' + id + '"'), id));
  assert.ok(fs.existsSync(path.join(ext, 'vendor/pdf.worker.min.js')), 'worker do pdf.js');
});

test('extensão 0.12: OCR local, sem CDN, com o modelo em português e permissão de WebAssembly', () => {
  const man = JSON.parse(read('extensao/manifest.json')), html = read('extensao/painel.html'), ocr = read('extensao/ocr.js');
  assert.match(man.content_security_policy.extension_pages, /'wasm-unsafe-eval'/);
  const ordem = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.ok(ordem.indexOf('vendor/tesseract/tesseract.min.js') > ordem.indexOf('vendor/pdf.min.js'));
  assert.ok(ordem.indexOf('ocr.js') > ordem.indexOf('vendor/tesseract/tesseract.min.js') && ordem.indexOf('ocr.js') < ordem.indexOf('autos.js'));
  ['worker.min.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js', 'por.traineddata.gz'].forEach(f => assert.ok(fs.existsSync(path.join(ext, 'vendor/tesseract', f)), f));
  assert.ok(!/https?:\/\//.test(ocr.replace(/\/\*[\s\S]*?\*\//g, '')), 'ocr.js não busca nada fora da extensão');
  assert.match(ocr, /workerBlobURL: false/); assert.match(ocr, /cacheMethod: 'none'/);
  const autos = read('extensao/autos.js');
  assert.match(autos, /data-au="ocr:/); assert.match(autos, /MutaOcr\.paginas/);
});

test('extensão 0.13: Roteiro por tipo de julgamento usa campos que existem na ficha e detecta o tipo', () => {
  const sandbox = { window: {}, localStorage: { getItem: () => null, setItem: () => {} } };
  vm.createContext(sandbox); vm.runInContext(read('extensao/roteiro.js'), sandbox);
  const RT = sandbox.window.MutaRoteiro, ficha = JSON.parse(read('padrao/ficha.json')), ks = new Set();
  ficha.abas.forEach(a => a.grupos.forEach(g => g.campos.forEach(c => ks.add((c.secao || '') + '.' + c.chave))));
  RT.PASSOS.forEach(p => (p.campos || []).forEach(c => assert.ok(ks.has(c[0] + '.' + c[1]), p.id + ': ' + c[0] + '.' + c[1])));
  const g = (op, fo) => ({ V: (s, k) => ((op || {})[s] || {})[k] || '', F: k => (fo || {})[k] || '', cnj: () => '1' });
  assert.deepEqual(Object.keys(RT.detectar(g({}, { classe_judicial: 'APELAÇÃO / REMESSA NECESSÁRIA' }))).sort(), ['ap', 'rn']);
  assert.deepEqual(Object.keys(RT.detectar(g({ triagem: { 'Padrão - Espécie': 'Embargos de declaração' } }, { classe_judicial: 'APELAÇÃO CÍVEL' }))), ['ed']);
  assert.ok(RT.detectar(g({}, { classe_judicial: 'APELAÇÃO CÍVEL', Assunto: 'Mandado de Segurança' })).ms);
  const html = read('extensao/painel.html'), gab = read('extensao/gabinete.js');
  assert.ok(html.includes('src="roteiro.js"')); assert.match(gab, /'Roteiro'/);
});

test('extensão 0.14: tema escuro por padrão, carregado no <head>, com botão para o claro', () => {
  const html = read('extensao/painel.html'), css = read('extensao/painel.css'), tema = read('extensao/tema.js');
  assert.ok(html.indexOf('src="tema.js"') < html.indexOf('</head>'), 'tema.js no head');
  assert.ok(html.includes('id="pje-tema"'));
  assert.match(css, /html\[data-tema=escuro\]\{/); assert.match(tema, /'escuro'/);
});

test('extensão 0.15: cabeçalho no formato da gaveta da pauta (etapas, designação), sinalizações e notas em log nos campos da ficha', () => {
  const gab = read('extensao/gabinete.js'), ficha = JSON.parse(read('padrao/ficha.json')), ks = new Set();
  ficha.abas.forEach(a => a.grupos.forEach(g => g.campos.forEach(c => ks.add((c.secao || '') + '.' + c.chave))));
  ['producao.MINUTADO', 'producao.CORRIGIDO', 'producao.Data da Revisão', 'producao.LIBERADO', 'producao.Data da Liberação', 'producao.Assinado', 'producao.Data da Assinatura',
    'producao.SERVIDOR', 'producao.CORRETOR', 'triagem.O que falta sanar', 'triagem.Intercorrências', 'origem.Observações', 'producao.Voto - Resultado', 'producao.Voto - Honorários', 'producao.Tópico-síntese']
    .forEach(k => assert.ok(ks.has(k), k));
  assert.match(gab, /function cabeca\(s\)/); assert.match(gab, /cabeca\(s\) \+ tabs/);
  assert.match(gab, /function sinalizacoes\(\)/); assert.match(gab, /function notas\(\)/); assert.match(gab, /data-et=/);
});

test('extensão 0.16: modos Processo · Autos · Roteiro de triagem · Produção; peças e inteiro teor em JSON; controles num cartão', () => {
  const gab = read('extensao/gabinete.js'), au = read('extensao/autos.js'), rt = read('extensao/roteiro.js');
  assert.match(gab, /var MODOS = \['Processo', 'Autos', 'Roteiro'\]/);

  assert.match(au, /data-au="tudojs"/); assert.match(au, /data-au="js:/); assert.match(au, /lista: JSON\.stringify/);
  assert.match(gab, /data-ct="/); assert.match(gab, /function atoSel\(\)/);
  assert.match(rt, /Outros campos da triagem/);
  const ficha = JSON.parse(read('padrao/ficha.json'));
  assert.ok(ficha.abas.some(a => a.grupos.some(g => g.campos.some(c => c.secao === 'triagem' && c.chave === 'Assunto detalhado' && c.editavel !== false))), 'assunto detalhado editável');
});

test('extensão 0.16.4: precedentes relacionados com o critério da gaveta do Ex Officio', () => {
  const sandbox = { window: {} }; vm.createContext(sandbox); vm.runInContext(read('extensao/precedentes.js'), sandbox);
  const P = sandbox.window.MutaPrecedentes;
  const C = [{ n: '5000001-00.2020.4.03.6000', as: 'Atraso na Entrega do Imóvel', q: ' atraso entrega imovel ', t: {} }, { n: '5000791-85.2025.4.03.6207', as: 'Atraso na Entrega do Imóvel', q: ' atraso entrega imovel ', t: {} }];
  C.ix = { atraso: [0, 1], entrega: [0, 1], imovel: [0, 1] };
  const L = P.relacionados({ cnj: '5000791-85.2025.4.03.6207', assunto: 'Atraso na Entrega do Imóvel' }, C);
  assert.equal(JSON.stringify(L.map(x => x.r.n)), JSON.stringify(['5000001-00.2020.4.03.6000']), 'o próprio processo fica de fora');
  assert.ok(read('extensao/painel.html').includes('src="precedentes.js"'));
});

test('extensão 0.16.5: dicas em todos os botões e campos; precedentes no Ementário', () => {
  const html = read('extensao/painel.html'), gab = read('extensao/gabinete.js'), d = read('extensao/dicas.js');
  assert.ok(html.indexOf('src="dicas.js"') < html.indexOf('</head>'));
  assert.ok(html.includes('id="acv-prec"'));
  assert.match(gab, /function dicaCampo\(c\)/); assert.match(d, /MutationObserver/);
});
