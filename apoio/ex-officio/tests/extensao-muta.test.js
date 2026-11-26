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
  ['vendor/pdf.min.js', 'padrao-calendario-forense.js', 'padrao-inteiro-teor.js', 'autos.js', 'paragrafos.js']
    .forEach(f => assert.ok(html.includes('src="' + f + '"'), f + ' no painel'));
  ['tab-pront', 'tab-min', 'tab-acervo', 'tab-par', 'tab-ajuda', 'panel-min', 'min-conf'].forEach(id => assert.ok(html.includes('id="' + id + '"'), id));
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
  RT.PASSOS.forEach(p => (p.campos || []).concat(p.mais || []).forEach(c => assert.ok(ks.has(c[0] + '.' + c[1]), p.id + ': ' + c[0] + '.' + c[1])));
  assert.deepEqual(Array.from(RT.PASSOS.find(p=>p.id==='materia').campos, c=>c[1]), ['Detalhamento do caso']);
  const g = (op, fo) => ({ V: (s, k) => ((op || {})[s] || {})[k] || '', F: k => (fo || {})[k] || '', cnj: () => '1' });
  assert.deepEqual(Object.keys(RT.detectar(g({}, { classe_judicial: 'APELAÇÃO / REMESSA NECESSÁRIA' }))).sort(), ['ap', 'rn']);
  assert.deepEqual(Object.keys(RT.detectar(g({ triagem: { 'Padrão - Espécie': 'Embargos de declaração' } }, { classe_judicial: 'APELAÇÃO CÍVEL' }))), ['ed']);
  assert.ok(RT.detectar(g({}, { classe_judicial: 'APELAÇÃO CÍVEL', Assunto: 'Mandado de Segurança' })).ms);
  const html = read('extensao/painel.html'), gab = read('extensao/gabinete.js');
  assert.ok(html.includes('src="roteiro.js"')); assert.match(gab, /'Roteiro'/);
});

test('extensão 0.77.55: tema claro por padrão (escuro pelo botão), carregado no <head>', () => {
  const html = read('extensao/painel.html'), css = read('extensao/painel.css'), tema = read('extensao/tema.js');
  assert.ok(html.indexOf('src="tema.js"') < html.indexOf('</head>'), 'tema.js no head');
  assert.ok(html.includes('id="pje-tema"'));
  assert.match(css, /html\[data-tema=escuro\]\{/); assert.match(tema, /'escuro'/);
  assert.match(tema, /getItem\(K\) \|\| 'claro'/, 'sem escolha salva, abre no claro');
});

test('extensão 0.77.55: no escuro, as faixas do Resumo e as fases dos roteiros não ficam com fundo claro fixo', () => {
  const css = read('extensao/hero-design.css');
  assert.match(css, /html\[data-tema=escuro\][^{]*#gab[^{]*\{--sum-head:#1e3342;--sum-sub:#16303e/, 'faixas do Resumo com versão escura');
  assert.match(css, /html\[data-tema=escuro\][^{]*ol\.rt>li\.rt-f\{background:#2a2716!important/, 'faixa de fase com versão escura');
});

test('extensão 0.15: cabeçalho no formato da gaveta da pauta (etapas, designação), sinalizações e notas em log nos campos da ficha', () => {
  const gab = read('extensao/gabinete.js'), ficha = JSON.parse(read('padrao/ficha.json')), ks = new Set();
  ficha.abas.forEach(a => a.grupos.forEach(g => g.campos.forEach(c => ks.add((c.secao || '') + '.' + c.chave))));
  ['producao.MINUTADO', 'producao.CORRIGIDO', 'producao.Data da Revisão', 'producao.LIBERADO', 'producao.Data da Liberação', 'producao.Assinado', 'producao.Data da Assinatura',
    'producao.SERVIDOR', 'producao.CORRETOR', 'triagem.O que falta sanar', 'triagem.Intercorrências', 'origem.Observações', 'producao.Voto - Resultado', 'producao.Voto - Honorários', 'producao.Tópico-síntese']
    .forEach(k => assert.ok(ks.has(k), k));
  assert.match(gab, /function cabeca\(s\)/); assert.match(gab, /cab\.replace\(\/<\\\/section>\$\/, snc \+ '<\/section>'\) \+ tabs/);
  assert.match(gab, /function sinalizacoes\(\)/); assert.match(gab, /function notas\(\)/); assert.match(gab, /data-et=/);
});

test('extensão 0.16: modos Processo · Autos · Roteiro de triagem · Produção; peças e inteiro teor em JSON; controles num cartão', () => {
  const gab = read('extensao/gabinete.js'), au = read('extensao/autos.js'), rt = read('extensao/roteiro.js');
  assert.match(gab, /var MODOS = \['Processo', 'Autos'(, 'Roteiro')?(, 'Gerador')?\]/);

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
  assert.ok(html.includes('id="acv-modo-rel"') && /class="[^"]*\bacv-faixa\b[^"]*"/.test(html));
  assert.match(gab, /function dicaCampo\(c\)/); assert.match(d, /MutationObserver/);
});

test('extensão 0.18: leitor do PJe guarda negrito, itálico e sublinhado; textos justificados', () => {
  const c = read('extensao/conteudo-pje.js'), css = read('extensao/painel.css');
  assert.match(c, /function leve\(el, depth\)/); assert.match(c, /html: marcado \? hs : null/);
  assert.match(css, /\.tx-j p[^{]*\{text-align:justify;hyphens:auto/);
});

test('extensão 0.18.1: gabinete.js define N() (o cartão compara o tipo de julgamento sem acento)', () => {
  const gab = read('extensao/gabinete.js');
  assert.match(gab, /\nfunction N\(v\) \{/);
});

test('extensão 0.19: catálogo de etiquetas do gabinete, regras avaliadas e rotas do site', () => {
  const man = JSON.parse(read('extensao/manifest.json'));
  assert.ok(man.permissions.includes('notifications'), 'permissão de notificações');
  { const J = man.content_scripts[0].js; assert.equal(J[0], 'etiquetas.js', 'etiquetas.js antes do leitor'); assert.ok(J.indexOf('conteudo-pje.js') > 0); }
  assert.match(read('extensao/fundo.js'), /importScripts\('etiquetas\.js'\)/);
  const ordem = [...read('extensao/painel.html').matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.ok(ordem.indexOf('sessao.js') < ordem.indexOf('etiquetas.js') && ordem.indexOf('etiquetas.js') < ordem.indexOf('alertas.js') && ordem.indexOf('alertas.js') < ordem.indexOf('gabinete.js'), 'ordem do painel');
  const cat = JSON.parse(read('padrao/etiquetas-gabinete.json'));
  assert.ok(Array.isArray(cat.etiquetas) && cat.etiquetas.length > 0);
  const ctx = { self: {} }; vm.createContext(ctx); vm.runInContext(read('extensao/etiquetas.js'), ctx);
  const E = ctx.self.MutaEtiquetas, campos = E.CAMPOS.map(c => c[0]), ops = E.OPS.map(o => o[0]);
  cat.etiquetas.forEach(e => { assert.ok(e.nome, 'nome'); (e.quando || []).forEach(q => { assert.ok(campos.includes(q.campo), e.nome + ': campo ' + q.campo); assert.ok(ops.includes(q.op), e.nome + ': op ' + q.op); if (q.op === 're') new RegExp(q.valor, 'i'); }); });
  const nomes = r => E.devidas(r, cat).map(e => e.nome);
  assert.ok(nomes({ urg: 'Tutela', urgApr: '' }).includes('LIMINAR PENDENTE'));
  assert.ok(!nomes({ urg: 'Tutela', urgApr: 'Apreciada · deferida' }).includes('LIMINAR PENDENTE'));
  assert.ok(nomes({ ic: ['falta procuração'] }).includes('INTERCORRÊNCIA'));
  assert.ok(nomes({ destino: 'Monocrática' }).includes('MONOCRÁTICA TERMINATIVA'));
  assert.ok(!E.faltando({ meta: true, etqPje: 'Meta' }, cat, '').some(e => e.nome === 'META'), 'etiqueta já presente não falta');
  assert.equal(E.etapa({ registrado: true, servidor: 'X', minutado: '2026-11-01' }), 'Para correção');
  assert.ok(E.alertas({ ic: ['x'] }).some(a => a.k === 'ic' && a.nivel === 'al'));
  const pauta = read('apoio/ex-officio/api/pauta.js'), ficha = read('apoio/ex-officio/api/_ficha.js');
  assert.match(pauta, /req\.query\.fichas\) return FICHA\.resumos/); assert.match(pauta, /req\.query\.etiquetas\) return FICHA\.etiquetasGab/);
  assert.match(ficha, /module\.exports\.resumos/); assert.match(ficha, /module\.exports\.etiquetasGab/);
});

test('extensão 0.19: selos da lista não pedem em laço o que o servidor não devolve', () => {
  const c = read('extensao/conteudo-pje.js');
  assert.match(c, /ENR\.pedidos\[k\] = agora/); assert.match(c, /agora - ENR\.pedidos\[k\] > 120e3/);
});

test('extensão 0.19.1: atualização sem chrome://extensions (atalho no pacote, recarga pelo manifest em disco, versão no site)', () => {
  const cmd = read('extensao/atualizar-muta.cmd');
  assert.match(cmd, /\r\n/, 'CRLF');
  assert.match(cmd, /gabinete-cmt\.com\/extensao\/muta-pje\.zip/);
  assert.ok(cmd.indexOf('/XF manifest.json') < cmd.indexOf('copy /y "%TMPD%\\manifest.json"'), 'manifest por último');
  const al = read('extensao/alertas.js');
  assert.match(al, /chrome\.runtime\.getURL\('manifest\.json'\)/); assert.match(al, /chrome\.runtime\.reload\(\)/); assert.match(al, /\/extensao\/versao\.json/);
  assert.match(read('.github/workflows/vercel-caput.yml'), /site\/public\/extensao\/versao\.json/);
  assert.match(read('.gitattributes'), /extensao\/\*\.cmd text eol=crlf/);
});

test('extensão 0.19.2: Peças › extrair da peça lê o texto e preenche só os campos vazios', () => {
  const gab = read('extensao/gabinete.js');
  assert.match(gab, /function pecaExtracao\(C, val\)/); assert.match(gab, /data-pec-ler=/); assert.match(gab, /data-pec-ocr=/);
  assert.match(gab, /x\.status === 'novo' && vazio\(x\.alvo\)/, 'nunca troca o que já está preenchido');
  assert.match(gab, /AUx\.extrair\(pid/);
});

test('inteiro teor: honorários da sentença no padrão "quem paga · quanto e sobre o quê · observações"', () => {
  const ctx = { window: {} }; ctx.window.window = ctx.window; vm.createContext(ctx); vm.runInContext(read('padrao/inteiro-teor.js'), ctx);
  const H = ctx.window.CMTInteiroTeor.honorariosDe;
  assert.equal(H(['Condeno a parte autora ao pagamento de honorários advocatícios, que fixo em 10% do valor atualizado da causa, cuja exigibilidade está suspensa ante a gratuidade de justiça.'], ''),
    'Parte autora · 10% sobre o valor atualizado da causa · exigibilidade suspensa (gratuidade, artigo 98, § 3º, do CPC)');
  assert.equal(H(['Condeno o INSS ao pagamento de honorários advocatícios de 10% sobre o valor da condenação, observada a Súmula 111 do STJ.'], ''), 'Parte ré (INSS) · 10% sobre o valor da condenação (Súmula 111/STJ)');
  assert.equal(H(['Condeno os réus ao pagamento de honorários advocatícios, que, com fundamento no artigo 85, § 8º, do Código de Processo Civil, arbitro em R$ 15.000,00.'], ''), 'Parte ré · R$ 15.000,00 · por equidade (artigo 85, § 8º, do CPC)');
  assert.equal(H(['Sem condenação em honorários advocatícios, conforme o artigo 25 da Lei nº 12.016/2009.'], ''), 'Sem honorários (mandado de segurança: artigo 25 da Lei 12.016/2009)');
  assert.match(H(['Julgo procedente o pedido de reajuste de 28,86%. Condeno a União ao pagamento de honorários de 10% sobre o valor da condenação.'], ''), /^Parte ré \(União\) · 10%/);
  assert.equal(read('padrao/inteiro-teor.js'), read('extensao/padrao-inteiro-teor.js'), 'cópia da extensão igual');
  assert.match(read('extensao/gabinete.js'), /function rotuloDe\(c\) \{[^}]*\/Honorários\/[^}]*E\.svg\('triste'/);
});

test('extensão 0.20: Gerador monta relatório, dispositivo, ementa, acórdão e proclamação pelas fórmulas do gabinete', () => {
  const op = { origem: { 'Sentença - ID': '111111111', 'Sentença - Resultado': 'julgou IMPROCEDENTE o pedido, resolvendo o mérito nos termos do artigo 487, I, do CPC', 'Sentença - Reexame': 'Não',
    'Sentença - Honorários': 'Parte autora · 10% sobre o valor atualizado da causa · exigibilidade suspensa (gratuidade, artigo 98, § 3º, do CPC)',
    Recursos: [{ parte: 'autora', ids: '222222222', teses: 'ter direito ao benefício por incapacidade\nser nulo o laudo pericial' }], Contrarrazões: [{ parte: 'INSS', ids: '333333333' }] },
    triagem: { MPF: 'Não se aplica', 'Tipo de Julgamento': 'Apelação' }, producao: { 'Voto - Resultado': 'Negado provimento' } };
  const ctx = { window: {}, navigator: {} }; ctx.window.window = ctx.window;
  ctx.window.MutaGabinete = { cnj: () => '5000000-00.2026.4.03.6000', V: (s, k) => (op[s] || {})[k] || '', fo: () => ({ polo_ativo: 'MARIA DA SILVA', polo_passivo: 'INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS', classe_judicial: 'APELAÇÃO CÍVEL', Assunto: 'Auxílio por incapacidade temporária' }) };
  vm.createContext(ctx); vm.runInContext(read('extensao/gerador.js'), ctx);
  const D = ctx.window.MutaGerador.docs();
  assert.equal(D.rel[0], 'Trata-se de apelação à sentença (ID 111111111) que julgou improcedente o pedido. Condenou a autora ao pagamento de honorários advocatícios de 10% sobre o valor atualizado da causa, com exigibilidade suspensa pela gratuidade de justiça (artigo 98, § 3º, do CPC).');
  assert.equal(D.rel[1], 'Apelou a autora (ID 222222222), alegando, em suma, que: (1) ter direito ao benefício por incapacidade; e (2) ser nulo o laudo pericial.');
  assert.equal(D.rel[2], 'Houve contrarrazões (ID 333333333).');
  assert.equal(D.rel[D.rel.length - 1], 'É o relatório.');
  assert.deepEqual([...D.disp], ['Ante o exposto, nego provimento à apelação.', 'É como voto.']);
  assert.match(D.em.cab, /^DIREITO PREVIDENCIÁRIO\. APELAÇÃO CÍVEL\. .*APELAÇÃO DESPROVIDA\.$/);
  assert.equal(D.em.sec[3][1][0].t, 'Apelação desprovida.');
  assert.equal(D.acordao, 'Vistos e relatados estes autos em que são partes as acima indicadas, a Turma Regional de Mato Grosso do Sul, [VALIDAR: quórum e proclamação da sessão], negou provimento à apelação, nos termos do relatório e voto que ficam fazendo parte integrante do presente julgado.');
  assert.equal(D.procl, '[VALIDAR: quórum da sessão], negou provimento à apelação.');
  const gab = read('extensao/gabinete.js');
  assert.match(gab, /var MODOS = \['Processo', 'Autos'(, 'Roteiro')?(, 'Gerador')?\]/);
  assert.match(read('extensao/painel.html'), /<script src="gerador\.js"><\/script>/);
});

test('extensão 0.22: chegadas do PJe (só gestor; pelas datas do cartão; só urgência ou liminar avisa) e notificações do app com origem distinta', async () => {
  const store = { 'muta-gestor': true }, notas = [], posts = [];
  const chrome = { storage: { local: { get: k => Promise.resolve(Object.fromEntries([].concat(k).map(x => [x, store[x]]))), set: o => { Object.assign(store, o); return Promise.resolve(); } }, session: { set: () => Promise.resolve(), get: () => Promise.resolve({}) }, onChanged: { addListener() {} } },
    notifications: { create: (id, o) => notas.push([id, o]), onClicked: { addListener() {} }, clear() {} }, action: { setBadgeText() {}, setBadgeBackgroundColor() {}, onClicked: { addListener() {} } },
    runtime: { onMessage: { addListener() {} }, onInstalled: { addListener() {} }, onStartup: { addListener() {} }, getURL: x => x }, alarms: { onAlarm: { addListener() {} }, create() {} }, sidePanel: { setPanelBehavior: () => Promise.resolve() }, tabs: { query: () => Promise.resolve([]), onUpdated: { addListener() {} }, onActivated: { addListener() {} }, onRemoved: { addListener() {} } }, scripting: {} };
  const ctx = { self: {}, chrome, console, importScripts() {}, fetch: (u, o) => { posts.push([u, o && o.body]); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }); }, setTimeout, Date, Promise, JSON, Object, Array, String, Number, isFinite };
  vm.createContext(ctx); try { vm.runInContext(read('extensao/fundo.js'), ctx); } catch (e) { /* listeners do navegador ausentes no teste */ }
  const K1 = '50000000020264030000', K2 = '50000000120264030000';
  await ctx.chegadas([K1], { [K1]: '06-11-26 (15) 16-11-26 (05) 06-11-26 (15) AI LIMINAR PENDENTE' }, 'Triagem', {});
  assert.equal(notas.length, 0, 'processo antigo na lista não é chegada, mesmo com liminar');
  await ctx.chegadas([K1, K2], { [K2]: '21-11-26 (0) 21-11-26 (0) 21-11-26 (0) AGRAVO DE INSTRUMENTO · pedido de LIMINAR · medicamento' }, 'Analisar pedido', {});
  assert.equal(notas.length, 1); assert.match(notas[0][0], /^cheg:/); assert.match(notas[0][1].title, /^Chegada urgente · /); assert.equal(notas[0][1].iconUrl, 'icones/pje-128.png');
  assert.ok(posts.some(p => /chegadas=1/.test(p[0]) && /"urg":true/.test(p[1])));
  assert.equal(store['muta-chegadas'].length, 1);
  store['muta-gestor'] = false; await ctx.chegadas(['50000000220264030000'], {}, '', {}); assert.equal(store['muta-chegadas'].length, 1, 'só gestor');
  const man = JSON.parse(read('extensao/manifest.json')); assert.ok(man.permissions.includes('alarms'));
  assert.match(read('extensao/fundo.js'), /iconUrl: 'icones\/app-128\.png', title: 'Gabinete · '/);
  assert.doesNotMatch(read('extensao/fundo.js').split('function avisar')[1].split('chrome.runtime.onMessage')[0], /notifications\.create/, 'alertas da lista não notificam');
  await ctx.chegadas(['50000000320264030000'], { '50000000320264030000': '21-11-26 (0) 21-11-26 (0) 21-11-26 (0) ApCiv Aposentadoria' }, '', {});
  ['icones/app-128.png', 'icones/pje-128.png', 'relatorio.html', 'relatorio.js'].forEach(f => assert.ok(fs.existsSync(path.join(ext, f)), f));
  assert.match(read('apoio/ex-officio/api/pauta.js'), /req\.query\.chegadas\) return require\('\.\/_chegadas'\)/);
  assert.match(read('apoio/ex-officio/api/notificacoes.js'), /require\('\.\/_chegadas'\)\.eventos\(u\)/);
});

test('extensão 0.22: redesenho das etiquetas do PJe por tipo (categorias do catálogo) e selos logo abaixo do número', () => {
  const cat = JSON.parse(read('padrao/etiquetas-gabinete.json'));
  assert.ok(cat.categorias.length >= 8); cat.categorias.forEach(c => { new RegExp(c.re, 'i'); assert.match(c.cor, /^#[0-9a-f]{6}$/i); assert.ok(['solido', 'suave', 'contorno'].includes(c.estilo)); });
  const ctx = { self: {} }; vm.createContext(ctx); vm.runInContext(read('extensao/etiquetas.js'), ctx);
  const E = ctx.self.MutaEtiquetas, id = n => E.categoriaDe(n, cat).id;
  assert.equal(id('LIMINAR PENDENTE'), 'urgencia'); assert.equal(id('[P] PRIORIDADE - MAIOR DE 80'), 'prioridade'); assert.equal(id('representação'), 'conferencia');
  assert.equal(id('2ª Seção'), 'secao'); assert.equal(id('META 2 CNJ (até 2022)'), 'meta'); assert.equal(id('LOTE 28,86% - APCIV'), 'lote'); assert.equal(id('AI'), 'classe'); assert.equal(id('Aposentadoria por Invalidez'), 'materia');
  assert.deepEqual(JSON.parse(JSON.stringify(E.CATEGORIAS)), cat.categorias, 'cópia de reserva igual ao catálogo');
  const c = read('extensao/conteudo-pje.js');
  assert.match(c, /function estilizarEtiquetas\(card\)/); assert.match(c, /ancora\(c\), c\.el\)\.insertAdjacentElement\('afterend', box\)/);
  assert.match(read('apoio/ex-officio/api/_ficha.js'), /categorias: cats/);
});

test('extensão 0.23: ícones de sinalização (lista e cabeçalho dos autos) com quadro de detalhes; recolher a coluna da lista', () => {
  const c = read('extensao/conteudo-pje.js');
  assert.match(c, /function sinaisHtml\(k, r(, op)?\)/); assert.match(c, /function dialogoSinais\(k, foco\)/); assert.match(c, /function sinaisAutos\(numero\)/);
  assert.match(c, /\['ic', 'triangulo', 'Intercorrências', 'al'\], \['pd', 'alfinete', 'Pendências', 'av'\], \['nt', 'nota', 'Notas', 'mu'\]/);
  assert.match(c, /function botaoColuna\(C\)/); assert.match(c, /hero18810:lista-oculta/);
  assert.match(read('apoio/ex-officio/api/_ficha.js'), /notas: linhas\(\(r\.origem \|\| \{\}\)\['Observações'\]\)/);
});

test('extensão 0.24: quadro de sinalizações em 4 painéis (notas com síntese e questões), marcar e incluir gravam na ficha', () => {
  const c = read('extensao/conteudo-pje.js'), f = read('extensao/fundo.js');
  assert.match(c, /col\('av', ico\('sino', 14\), 'Avisos'[\s\S]*col\('ic', ico\('triangulo', 14\), 'Intercorrências'[\s\S]*col\('pd', ico\('alfinete', 14\), 'Pendências'[\s\S]*col\('nt', ico\('nota', 14\), 'Notas'/);
  assert.match(c, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/); assert.match(c, /<b>Síntese<\/b>/); assert.match(c, /<b>Questões<\/b>/);
  assert.match(f, /msg\.tipo !== 'muta-sinal'/); assert.match(f, /'✓ ' \+ semMarca\(L\[i\]\)/); assert.match(f, /\/api\/pauta\?ficha=1', \{ method: 'POST'/);
  assert.match(read('apoio/ex-officio/api/_ficha.js'), /sintese: String\(t\['Síntese Processual'\]/);
});

test('extensão 0.25: inserir parágrafo-padrão e citação de precedente no editor do PJe (cursor ou fim)', () => {
  const c = read('extensao/conteudo-pje.js');
  assert.match(c, /msg\.tipo !== 'muta-inserir'/); assert.match(c, /new w\.ClipboardEvent\('paste'/); assert.match(c, /execCommand\('insertHTML'/);
  assert.match(read('extensao/pje.js'), /inserir: function \(html, texto\)/);
  assert.match(read('extensao/paragrafos.js'), /data-ins=/); assert.match(read('extensao/ementario.js'), /data-ej="cit"/);
  assert.match(read('extensao/ementario.js'), /'Rel\. Des\. Fed\. ' \+ rel/);
});

test('extensão 0.26: sem emojis na interface (ícones SVG de traço)', () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B50}\u{23F0}-\u{23FF}]/u;
  ['conteudo-pje.js', 'fundo.js', 'alertas.js', 'gabinete.js', 'gerador.js', 'relatorio.js', 'relatorio.html', 'etiquetas.js'].forEach(f => assert.doesNotMatch(read('extensao/' + f).replace(/✓/g, ''), emoji, f));
  assert.doesNotMatch(read('padrao/etiquetas-gabinete.json'), emoji);
});

test('inteiro teor 0.27: sentença de mérito antes dos embargos; dispositivo colado ao título; aviso do que a leitura não extraiu', () => {
  const ctx = { window: {} }; ctx.window.window = ctx.window; vm.createContext(ctx); vm.runInContext(read('padrao/inteiro-teor.js'), ctx);
  const T = ctx.window.CMTInteiroTeor;
  const x = T.extractDecision({ text: 'Relatório. Fundamentação longa sobre horas extras. 3. DISPOSITIVOIsto posto, julgo PROCEDENTE o pedido formulado na inicial, resolvendo o mérito. Condeno a ré ao pagamento de honorários de 10% sobre o valor da condenação. P.R.I.' });
  assert.match(x.resultado || '', /julgou procedente|julgo procedente|PROCEDENTE/i); assert.equal(x.decisao, 'Procedente');
  const y = T.extractDecision({ text: 'Vistos. A execução não tem título. Desta forma, julgo extinta a presente ação de cumprimento de sentença, nos termos do art. 485, IV, do CPC. Sem custas. Sem honorários.' });
  assert.ok(y.resultado, 'fecho sem "Ante o exposto"');
  assert.equal(read('padrao/inteiro-teor.js'), read('extensao/padrao-inteiro-teor.js'));
  const a = read('extensao/autos.js');
  assert.match(a, /a leitura não identificou ' \+ falta\.join/); assert.match(a, /documento sem texto \(digitalizado\)/);
  assert.match(a, /iso\(atual\) && iso\(atual\) === iso\(it\.value\)/);
  assert.match(read('extensao/painel.css'), /\.pp-top \.dr-idx\{flex-wrap:wrap!important/);
});

test('extensão 0.28: designação como etiqueta (minuta e correção) e trilha de produção minutado · corrigido · liberado', () => {
  const c = read('extensao/conteudo-pje.js');
  assert.match(c, /pes\(r\.servidor, 'Minuta', 'm-pes-m'\)/); assert.match(c, /pes\(r\.corretor, 'Correção', 'm-pes-c'\)/);
  assert.match(c, /passo\(!!r\.minutado, 'Min\.', r\.minutado\)[\s\S]*passo\(!!r\.corrigido, 'Corr\.', r\.corrigidoEm\)[\s\S]*'Lib\.', r\.liberadoEm/);
  assert.match(read('apoio/ex-officio/api/_ficha.js'), /corrigidoEm: p\['Data da Revisão'\]/);
});

test('extensão 0.29: Minuta-matriz sem seleção confere só a estrutura; folha; janela lado a lado; conformidade em tela cheia; cartões no desenho do app', () => {
  const c = read('extensao/comparar.js');
  assert.doesNotMatch(c, /if \(!s && M\.length\) \{ s = C\.sel\.matriz = M\[0\]\.x\.id; \}/, 'sem matriz pré-selecionada');
  assert.match(c, /if \(C\.fonte === 'matriz' && !matrizDoProcesso\(\)\) return estruturaPadrao\(\);/, '0.42: sem matriz do processo, só a estrutura');
  assert.match(c, /function folhaHtml\(rows\)/); assert.match(c, /function ladoALadoHtml\(rows, titulo(?:, compacto)?\)/); assert.match(c, /MutaJanela\.abrir\('comparar'/);
  assert.match(read('extensao/conformidade.js'), /MutaJanela\.abrir\('conformidade'/);
  assert.match(read('extensao/comum.js'), /window\.MutaJanela = \{/);
  ['janela.html', 'janela.js', 'janela.css'].forEach(f => assert.ok(fs.existsSync(path.join(ext, f)), f));
  const p = read('extensao/conteudo-pje.js');
  assert.match(p, /\['urg', 'ampulheta', 'Urgência', 'al'\]/); assert.match(p, /'Min\.': 'lapis', 'Corr\.': 'check', 'Lib\.': 'enviar'/); assert.match(p, /rot === 'Min\.'/);
});

test('extensão 0.30: tipo de caso e etiquetas sugeridas da triagem no cartão; quadro do Desembargador na coluna Para assinatura, com cópia ao gestor', () => {
  const F = require(path.join(root, 'apoio/ex-officio/api/_ficha.js'));
  assert.equal(F.tipoCasoDe('3 · Apelação da União · Previdenciário — aposentadoria por incapacidade permanente; laudo'), 'Previdenciário - aposentadoria por incapacidade permanente');
  const S = F.etqTriagem({ 'Etiquetas sugeridas': 'APTO', Preparo: 'Não Recolhido', Tema: 'Saúde · Fornecimento de medicamento', 'Urgência': 'Tutela de urgência', 'Urgência - Apreciação': 'Pendente' }, { 'Seção Competente': '2ª Seção', 'Etiquetas Originais': 'AI' });
  assert.deepEqual(S.map(x => x.e), ['APTO', '2ª Seção', 'ver. preparo', 'LIMINAR PENDENTE', 'Saúde - Fornecimento de medicamento']);
  assert.ok(S[S.length - 1].caso);
  const atual = F.etqTriagem({ 'Detalhamento do caso': 'Saúde · Fornecimento de medicamento', Tema: 'Cadastro legado' }, {});
  assert.equal(atual.find(x=>x.caso).e, 'Saúde - Fornecimento de medicamento', 'campo canônico prevalece sobre o legado');
  assert.ok(!F.etqTriagem({ 'Detalhamento do caso': '', Tema: 'Cadastro legado' }, {}).some(x=>x.caso), 'limpeza explícita não revive o legado');
  assert.match(read('apoio/ex-officio/api/_ficha.js'), /tipoCaso: tipoCasoDe\(detalhamento\(t\)\)[\s\S]*etqTri: etqTriagem\(t, f\)/);
  const c = read('extensao/conteudo-pje.js');
  assert.match(c, /hf-c hf-c-t/); assert.match(c, /class="m-sgs"><small>Sugeridas/); assert.match(c, /function quadroCmt\(\)/); assert.match(c, /id = 'hero-cmt'/);
  const cm = read('apoio/ex-officio/api/_cmt.js');
  assert.match(cm, /async function copiaGestor\(u, titulo, texto\)/);
  assert.equal((cm.match(/if \(b\.origem === 'extensao'\) await copiaGestor/g) || []).length, 3, 'assinar, devolver e responder');
  const fu = read('extensao/fundo.js');
  assert.match(fu, /\/api\/painel\?cmt=1/); assert.match(fu, /origem: 'extensao'/); assert.match(fu, /'muta-cmt', \{ periodInMinutes: 1/);
  const vm = require('vm'), ctx = { window: {}, self: {} }; ctx.window.MutaEtiquetas = null; vm.createContext(ctx); vm.runInContext(read('extensao/cmt.js'), ctx);
  const h = ctx.window.MutaCmt.html({ em: '2026-11-21T20:00:00Z', des: true, assinatura: [{ cnj: '5001234-56.2026.4.03.6000', tipoAto: 'Decisão terminativa', servidor: 'José Victor', corretor: 'Bruno', dataMinuta: '2026-11-19', dataCorrecao: '2026-11-20', desde: '2026-11-20', aguarda: 1, urg: { tipo: 'Liminar', espera: 3 } }], duvidas: [{ id: 'pen-1', titulo: 'Honorários', de: 'Dalete' }], liberacao: [] });
  assert.match(h, /Quadro do Desembargador/); assert.match(h, /Decisão terminativa/); assert.doesNotMatch(h, /A liberar/);
  assert.match(h, /Assinatura urgente/); assert.match(h, /Retirada \/ adiamento/);
  const h2 = ctx.window.MutaCmt.html({ assinatura: [{ cnj: '5000001-00.2026.4.03.6000', tipoAto: 'Voto comum' }, { cnj: '5000002-00.2026.4.03.6000', tipoAto: 'Liminar urgente', urg: { tipo: 'Liminar', situacao: 'Apreciada' } }], duvidas: [], pedidos: [] });
  assert.doesNotMatch(h2, /Voto comum|Liminar urgente/, 'só a assinatura com urgência ativa');
  ctx.window.MutaCmt.UI.aba = 'pe';
  const h3 = ctx.window.MutaCmt.html({ assinatura: [], duvidas: [], pedidos: [{ id: 'p1', tipo: 'retirada', numero: '5000003-00.2026.4.03.6000', de: 'Dra. Ana', sessao: '2026-12-07', razao: 'acordo' }] });
  assert.match(h3, /Retirada de pauta/); assert.match(h3, /data-hcm="pe" data-decisao="defere"/); assert.match(h3, /Indeferir/);
  ctx.window.MutaCmt.UI.aba = 'as';
  assert.match(read('extensao/fundo.js'), /pedidos: d\.pedidos \|\| \[\]/); assert.match(read('extensao/fundo.js'), /function pedidoCmt\(msg\)/); assert.match(h, /data-hcm="assinar"/); assert.match(h, /cópia ao gestor/);
  assert.match(read('extensao/manifest.json'), /"cmt\.js"/); assert.match(read('extensao/painel.html'), /cmt\.js/);
});

test('extensão 0.31: cada família de informação do cartão com um padrão visual', () => {
  const c = read('extensao/conteudo-pje.js');
  ['hf hf-cls', 'hf hf-st', 'hf hf-ic', 'hf hf-px', 'm-sgs'].forEach(k => assert.ok(c.includes(k), k));
  assert.match(c, /chip\('secao', r\.secao/); assert.match(c, /chip\('camadas', x, 'Subassunto/); assert.match(c, /chip\('alvo', /);
  const f = read('apoio/ex-officio/api/_ficha.js');
  assert.match(f, /secao: String\(f\['Seção Competente'\]/); assert.match(f, /movimento: String\(f\.ultimo_movimento/); assert.match(f, /proxima: String\(\(r\.origem \|\| \{\}\)\['Próxima ação'\]/);
});

test('extensão 0.32: estado atual em gerúndio (aguardando, minutando, corrigindo)', () => {
  const vm = require('vm'), ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(read('extensao/etiquetas.js'), ctx);
  const E = ctx.window.MutaEtiquetas, t = r => (E.estado(r) || {}).t;
  assert.equal(t({ registrado: true, servidor: 'José Victor' }), 'Minutando · José');
  assert.equal(t({ registrado: true, servidor: 'Maria', minutado: '2026-11-19', corretor: 'Bruno' }), 'Corrigindo · Bruno');
  assert.equal(t({ registrado: true, pend: ['Aguardar contrarrazões da União'] }), 'Aguardando contrarrazões');
  assert.equal(t({ registrado: true, urg: 'Liminar', urgData: '2026-11-10' }), 'Aguardando apreciação da liminar');
  assert.equal(t({ registrado: true, liberado: true, sessao: '07/12/2026' }), 'Aguardando a sessão de 07/12');
  assert.equal(E.estado({ registrado: true, servidor: 'X' }, { assinar: { aguarda: 2 } }).t, 'Aguardando assinatura do Relator');
  assert.equal(t({ tarefa: '[Sessão] Aguardando a sessão' }), 'Aguardando a sessão');
  assert.equal(t({ tarefa: 'Analisar tipo de decisão a proferir' }), 'Aguardando triagem');
  assert.match(read('extensao/conteudo-pje.js'), /E\.estado\(r, \{ assinar: cmt \}\)/);
});

test('extensão 0.33: sinalizações na faixa do topo, pendências recolhíveis, sem repetir etiqueta, APTO como símbolo', () => {
  const c = read('extensao/conteudo-pje.js');
  assert.doesNotMatch(c, /hf hf-mov/, 'sem a linha de movimentação');
  assert.match(c, /sinaisHtml\(r\._k, r, \{ semPd: true \}\)/); assert.match(c, /hero-sin-topo/);
  assert.match(c, /<details class="hf-pd"/); assert.match(c, /data-hero-pck/); assert.match(c, /acao: c\.checked \? 'resolver' : 'reabrir'/);
  assert.match(c, /txt\.indexOf\(t\) < 0/, 'classificação não repete o que já está no cartão');
  assert.match(c, /\^apto\\b\/i\.test\(nome\)/); assert.match(c, /hero-sym/);
  assert.match(c, /\.hf-ic\{flex-wrap:nowrap/);
  assert.match(c, /box\.innerHTML = ' ' \+ html \+ ' '/, 'o bloco não cola no número do processo');
});

test('extensão 0.33.1: quadro do Desembargador fora do menu lateral; selos fora de linha flexível', () => {
  const c = read('extensao/conteudo-pje.js');
  assert.match(c, /q\.width < 160/); assert.match(c, /el\.closest\('nav, aside/); assert.match(c, /cw < 280/);
  assert.match(c, /function pontoBloco\(a, card\)/); assert.match(c, /pontoBloco\(ancora\(c\), c\.el\)/);
});

test('extensão 0.34: botão na lista do PJe liga e desliga o modo HERO (selos e redesenho das etiquetas)', () => {
  const c = read('extensao/conteudo-pje.js');
  assert.match(c, /function botaoModo\(\)/); assert.match(c, /id = 'hero-modo-btn'/); assert.match(c, /function limparModo\(\)/);
  assert.match(c, /\{ selos: liga, etqEstilo: liga \}/); assert.match(c, /if \(modoDesligado\(\)\) \{ limparModo\(\)/);
});

test('extensão 0.35: painel do usuário do PJe por etapa do fluxo (7 grupos) nas colunas Tarefas e Minhas tarefas', () => {
  const m = JSON.parse(read('extensao/manifest.json')); assert.ok(m.content_scripts[0].js.includes('tarefas-pje.js'));
  const t = read('extensao/tarefas-pje.js');
  ['Assinar e liberar', 'Sessão com prazo', 'Recursos internos', 'Chegadas a examinar', 'Produção e triagem', 'Aguardando sessão', 'Sobrestados', 'Outras tarefas'].forEach(g => assert.ok(t.includes("'" + g + "'"), g));
  assert.match(t, /it\.alvo\.click\(\)/, 'a linha do HERO clica na linha original do PJe');
  assert.match(t, /htg-oculto/); assert.match(t, /ver a lista do PJe/); assert.match(t, /window\.MutaModo/);
  assert.match(read('extensao/conteudo-pje.js'), /window\.MutaModo = \{ desligado: modoDesligado/);
  assert.match(read('extensao/fundo.js'), /'tarefas-pje\.js'\]/);
  const vm = require('vm'); const ctx = { location: { host: 'x' }, window: {} }; vm.createContext(ctx); vm.runInContext(t, ctx);
});

test('extensão 0.36: fora do prontuário só as sinalizações; cartões, etiquetas, tarefas por etapa e quadro de assinatura no modo em desenvolvimento; notificação abre a janela do item', () => {
  const c = read('extensao/conteudo-pje.js');
  assert.match(c, /function emDesenvolvimento\(\) \{ return !!\(ENR\.cfg && ENR\.cfg\.dev === true\); \}/);
  assert.match(c, /if \(dev\) html = selosHtml/); assert.match(c, /if \(etq\) C\.forEach\(function \(c\) \{ try \{ estilizarEtiquetas/); /* 0.48: etiquetas personalizadas ligadas por usuário (etqLigadas) */
  assert.match(c, /!emDesenvolvimento\(\) \|\| \(ENR\.cfg && ENR\.cfg\.cmtPje === false\)/);
  assert.match(read('extensao/tarefas-pje.js'), /!window\.MutaModo\.dev\(\)/);
  assert.match(read('extensao/alertas.js'), /data-pz="dev"' \+ \(c\.dev === true \? ' checked' : ''\)/);
  assert.match(read('extensao/fundo.js'), /chrome\.runtime\.getURL\('cmt\.html'\)/);
  ['cmt.html', 'cmt-janela.js'].forEach(f => assert.ok(fs.existsSync(path.join(ext, f)), f));
  assert.match(read('extensao/cmt.js'), /op\.foco/);
});

test('extensão 0.37: prontuário revisto — teses limpas, 3ª pessoa, decisão agravada, resultado sem presunção, etapa atual, falha de gravação visível', () => {
  const ctx = { window: {}, console }; ctx.window.window = ctx.window; vm.createContext(ctx); vm.runInContext(read('padrao/inteiro-teor.js'), ctx);
  const T = ctx.window.CMTInteiroTeor;
  assert.equal(T.extractDecision({ text: 'Relatório. Ante o exposto, confirmo a medida liminar concedida e CONCEDO A SEGURANÇA para anular o ato. P.R.I.' }).resultado, 'confirmou a medida liminar concedida e concedeu A SEGURANÇA para anular o ato');
  const P = T.extractPetition({ text: 'RAZÕES DE APELAÇÃO. I – DA TEMPESTIVIDADE. O recurso é tempestivo. II – DA INEXISTÊNCIA DE LIMITAÇÃO TERRITORIAL DOS EFEITOS DA COISA JULGADA. Texto. III – DA APLICAÇÃO DO ART. 93, II DO CDC. Texto. MÉLAINE CHANTAL MEDEIROS ROUGE OAB/RJ 104.771' });
  assert.ok(P.teses.some(x => /inexistência de limitação territorial/.test(x)), JSON.stringify(P.teses));
  assert.ok(!P.teses.some(x => /tempestividade|oab/i.test(x)), JSON.stringify(P.teses));
  const op = { origem: {}, triagem: { 'Tipo de Julgamento': 'Apelação' }, producao: {} };
  const c2 = { window: {}, navigator: {} }; c2.window.window = c2.window;
  c2.window.MutaGabinete = { cnj: () => '5000000-00.2026.4.03.6000', V: (s, k) => (op[s] || {})[k] || '', fo: () => ({ classe_judicial: 'APELAÇÃO CÍVEL' }) };
  vm.createContext(c2); vm.runInContext(read('extensao/gerador.js'), c2);
  const D = c2.window.MutaGerador.docs();
  assert.equal(D.k, '', 'sem resultado na ficha, nenhum é presumido');
  assert.match(D.disp[0], /^Ante o exposto, \[VALIDAR: resultado do voto/);
  const g = read('extensao/gabinete.js');
  assert.match(g, /L\.forEach\(function \(x, i\) \{ if \(x\.ok\) n = i \+ 1; \}\)/, 'etapa atual depois da última feita');
  assert.match(g, /fx\.id = 'g-falha'/); assert.match(g, /data-g="regravar"/);
  assert.match(read('extensao/roteiro.js'), /g\.gravar\(\)\.catch\(function \(\) \{\}\)/);
  assert.match(read('padrao/inteiro-teor.js'), /function teseValida\(t\)/);
  assert.equal(read('padrao/inteiro-teor.js'), read('extensao/padrao-inteiro-teor.js'));
});

test('extensão 0.38: Autos preenche metadados inequívocos (e desfaz), exige conferência do resultado e mantém o Gerador compartilhado', async () => {
  const pend = {}, grav = { 'triagem.MPF': 'Não' }, tick = () => new Promise(r => setTimeout(r, 5));
  const F = { abas: [{ aba: 'Processo', grupos: [{ grupo: 'Sentença', campos: [{ secao: 'origem', chave: 'Sentença - ID', tipo: 'texto' }, { secao: 'origem', chave: 'Sentença - Decisão', tipo: 'texto' }, { secao: 'triagem', chave: 'Síntese Processual', tipo: 'texto' }, { secao: 'triagem', chave: 'MPF', tipo: 'texto' }] }] }] };
  const ctx = { console, setTimeout, clearTimeout, localStorage: { getItem: () => null, setItem() {} }, document: { addEventListener() {}, body:{classList:{contains:()=>false}} } };
  ctx.window = ctx; vm.createContext(ctx);
  ctx.Muta = { formatarCnj: k => k, chaveProcesso: c => String(c).replace(/\D/g, '') };
  ctx.MutaProntuarioBridge = { chaveAtual: () => '50000000020264036000' };
  const V = (s, k) => { const id = s + '.' + k; return id in pend ? pend[id] : (grav[id] || ''); };
  ctx.MutaGabinete = { modelo: () => F, V, gravado: (s, k) => grav[s + '.' + k] || '', marcar: (id, v) => { pend[id] = v; }, gravar: () => Promise.resolve(), fo: () => ({}), op: () => ({}), render() {} };
  ctx.CMTInteiroTeor = { parseTxt: () => ({ docs: [] }), preselect() {}, especie: () => '', preselectKind() {},
    buildSuggestions: () => [{ key: 'Sentença - ID', label: 'ID da sentença', value: '111111111', doc: '111111111', kind: 'field', sec: 'Sentença' }, { key: 'Sentença - Decisão', label: 'Resultado na origem', value: 'Improcedente', doc: '111111111', kind: 'field', sec: 'Sentença' }, { key: 'MPF', label: 'MPF', value: 'Sim', doc: '222', kind: 'field', sec: 'MPF' }] };
  vm.runInContext(read('extensao/autos.js'), ctx);
  const AU = ctx.MutaAutos;
  AU._carregar({ numero: '5000000-00.2026.4.03.6000', itens: [{ data: '01/02/2026', docs: [{ id: '111111111', tipo: 'Sentença' }] }] }, { 111111111: 'texto' });
  AU.sugestoes(); await tick();
  assert.equal(pend['origem.Sentença - ID'], '111111111', 'ID inequívoco preenchido sozinho');
  assert.ok(!('origem.Sentença - Decisão' in pend), 'resultado jurídico não é gravado sem conferência');
  assert.ok(AU.sugestoes().some(x => x.key === 'Sentença - Decisão' && x.manual && !x.apply && x.value === 'Improcedente'));
  assert.ok(!('triagem.MPF' in pend), 'o que já está gravado não é trocado');
  assert.ok(AU.preenchido('origem.Sentença - ID'));
  const cf = AU.htmlConferir();
  /* 0.50: a síntese do processo também sai da leitura (sentença e recursos) */
  assert.match(AU.htmlLocalizados(), /<details class="au-auto-av au-auto-d"[^>]*><summary><b>1 campo preenchido pela leitura dos autos/);
  assert.ok(!('triagem.Síntese Processual' in pend), 'síntese exige conferência');
  assert.ok(AU.sugestoes().some(x => x.key === 'Síntese Processual' && x.manual && !x.apply));
  assert.match(cf, /diverge/i, 'a divergência fica em A conferir');
  assert.match(AU.htmlLeitura(), /data-au-auto/); assert.doesNotMatch(AU.htmlLeitura(), /Peças principais|Cronologia toda/, 'Ler/Reler (íntegra)'); assert.match(AU.htmlLeitura(), /class="au-metr"[\s\S]*Peças identificadas[\s\S]*Textos lidos[\s\S]*A conferir/);
  assert.match(AU.htmlLeitura(), /1 de 1 documentos com texto extraído/);
  assert.match(AU.htmlLocalizados(), /Localizados[\s\S]*Sentença[\s\S]*ID 111111111[\s\S]*Texto lido/);
  assert.match(cf, /Não identificados nesta leitura \(quando aplicáveis\)/);
  assert.match(AU.htmlDocs(() => ''), /Peças principais \(1\)[\s\S]*Cronologia \(1\)/);
  AU.clique({ dataset: { au: 'desfazer' } }); await tick();
  assert.equal(pend['origem.Sentença - ID'], '', 'desfeito');
  AU.estado().autoSig = {}; AU.sugestoes(); await tick();
  assert.equal(pend['origem.Sentença - ID'], '', 'o desfeito não volta neste processo');
  const gab = read('extensao/gabinete.js'), html = read('extensao/painel.html');
  assert.match(gab, /var MODOS = \['Processo', 'Autos'(, 'Roteiro')?\];/);
  /* A conferir e Localizados compõem o card de cobertura na leitura dos autos. */
  assert.match(gab, /var cf = AU\.htmlConferir\(\), dc = AU\.htmlDocs\(function \(\) \{ return pecasCartao\(true\); \}\)/);
  assert.match(gab, /<details class="gg au-cf au-coverage-section" id="g-cf"/);
  assert.match(gab, /au-coverage-card/);
  assert.doesNotMatch(html, /id="ger-app"/); assert.match(gab, /gerHost\.id='ger-app'/);
  assert.match(read('extensao/prontuario.js'), /ger:'min'/);
  assert.match(read('extensao/gerador.js'), /pintar: pintar, abrir: abrir, modo: modo/);
  assert.match(read('extensao/roteiro.js'), /AU0\.preenchido/);
});

test('extensão 0.39: gravar na ficha com o inteiro teor (caixa por documento, um só botão) e acervo/autos juntado por ID; Minuta sem o seletor de pronunciamento', () => {
  const F = require('../api/_ficha');
  const velho = { cnj: '5000000-00.2026.4.03.6000', lista: JSON.stringify([['111', 'Sentença', 'Sentença', '', '01/02/2026', '', '']]), docs: JSON.stringify([{ id: '111', tipo: 'Sentença' }]), faltam: ['222'],
    texto: '===== MOVIMENTAÇÕES (x) =====\nm1\n\n===== ID 111 | Sentença | Sentença | juntado em 01/02/2026 =====\nTexto velho\n' };
  const n = F.juntarAutos(velho, { lista: [['222', 'Apelação', 'Apelação', '', '03/03/2026', '', ''], ['111', 'Sentença', 'Sentença', '', '01/02/2026', '', '']], docs: [{ id: '222', tipo: 'Apelação' }],
    secoes: [{ id: '222', sec: '===== ID 222 | Apelação | Apelação | juntado em 03/03/2026 =====\nRazões\n' }] }, velho.cnj);
  assert.match(n.texto, /^===== MOVIMENTAÇÕES[\s\S]*===== ID 222 \|[\s\S]*Razões[\s\S]*===== ID 111 \|[\s\S]*Texto velho/, 'o novo entra, o antigo fica, na ordem da cronologia');
  assert.deepEqual(n.faltam, [], 'o que ganhou texto sai de "faltam"');
  assert.equal(JSON.parse(n.docs).length, 2); assert.equal(JSON.parse(n.lista).length, 2);
  const n2 = F.juntarAutos(n, { secoes: [{ id: '111', sec: '===== ID 111 | Sentença | Sentença | juntado em 01/02/2026 =====\nTexto novo\n' }] }, velho.cnj);
  assert.ok(/Texto novo/.test(n2.texto) && !/Texto velho/.test(n2.texto), 'o mesmo ID é substituído');
  const au = read('extensao/autos.js');
  assert.match(au, /data-au-g="/); assert.match(au, /data-au="gravar"/); assert.match(au, /function marcado\(d\) \{ return !\(A\.gravados\[d\.id\]&&fichaGravada\(d\.id\)\) && !docBloq\(d\) && \(d\.id in A\.sel \? !!A\.sel\[d\.id\] : !!\(PRINC\[d\.k\]/);
  assert.match(au, /autos: \{ lista: k \? \[\] : lis/);
  assert.match(read('extensao/gabinete.js'), /t\.dataset\.auG/);
  assert.doesNotMatch(read('extensao/comparar.js'), /return pronHtml\(\) \+ editorCaixa/);
});

test('extensão 0.40: conformidade confere cada ID contra os autos lidos, o objeto do dispositivo no acórdão e as questões no voto', () => {
  const autos = [{ id: '111111111', tipo: 'Sentença', k: 'sentenca', data: '01/02/2026' }, { id: '222222222', tipo: 'Apelação', k: 'apelacao', data: '01/03/2026' }, { id: '444444444', tipo: 'Contrarrazões', k: 'contrarrazoes', data: '05/03/2026' }];
  const pec = (c, todos) => M.analisar(['RELATÓRIO', c, 'É o relatório.'], { autos, autosTodos: todos !== false }).itens.filter(x => /^ID-/.test(x.regra));
  assert.match(pec('Trata-se de apelação à sentença (ID 222222222) que julgou improcedente.')[0].msg, /cita o ID 222222222 como sentença, mas nos autos ele é “Apelação”/);
  assert.equal(pec('Houve contrarrazões (ID 444444444).').length, 0);
  assert.equal(pec('Os embargos de declaração foram rejeitados (ID 111111111).').length, 0, 'o ID do ato não é a peça citada');
  assert.equal(pec('Apelou o Ministério Público Federal (ID 222222222), alegando.').length, 0);
  assert.equal(pec('Houve contrarrazões pela União à apelação do autor (ID 444444444).').length, 0);
  assert.equal(pec('A sentença, integrada em embargos de declaração (ID 111111111), julgou.').length, 0);
  const fora = pec('Juntou laudo (ID 999999999).', false)[0];
  assert.equal(fora.regra, 'ID-autos'); assert.equal(fora.sev, 'baixa'); assert.match(fora.msg, /leia a cronologia toda/);
  const ps = ['RELATÓRIO', 'Trata-se de apelações à sentença (ID 111111111).', 'Apelou a autora (ID 222222222), alegando, em suma, que houve prescrição.', 'Apelou a União (ID 222222222), alegando, em suma, que os juros são indevidos.', 'É o relatório.',
    'VOTO', 'O Desembargador Federal Carlos Muta (Relator):', 'Senhores Desembargadores,', 'no mérito, a prescrição não ocorreu.', 'Ante o exposto, nego provimento à apelação.', 'É como voto.',
    'ACÓRDÃO', 'Vistos e relatados estes autos, a Turma Regional de Mato Grosso do Sul, por unanimidade, negou provimento às apelações e à remessa necessária, nos termos do voto.'];
  const r = M.analisar(ps, { questoes: ['(1) prescrição da pretensão', '(2) honorários advocatícios sucumbenciais majorados indevidamente'] });
  assert.ok(r.itens.some(x => x.regra === 'objeto-acordao' && /“à apelação”.*“às apelações e à remessa necessária”/.test(x.msg)));
  assert.ok(r.itens.some(x => x.regra === 'objeto-plural'));
  const q = r.itens.filter(x => x.regra === 'questao-voto'); assert.equal(q.length, 1); assert.match(q[0].msg, /honorários advocatícios/);
  const ok = M.analisar(ps.map(x => x.replace('negou provimento às apelações e à remessa necessária', 'negou provimento à apelação')), {});
  assert.ok(!ok.itens.some(x => x.regra === 'objeto-acordao'));
  const cf = read('extensao/conformidade.js');
  assert.match(cf, /autos: au \? au\.lista\.map/); assert.match(cf, /'muta:autos'/);
  assert.match(read('extensao/autos.js'), /doProcesso: function \(\)/);
});

test('extensão 0.41: botões de sinalização em todo cartão (vazio = sino discreto), no cabeçalho do processo aberto e dos autos; minuta e correção nos aguardando sessão', () => {
  const c = read('extensao/conteudo-pje.js');
  assert.match(c, /function botaoVazio\(k\)/); assert.match(c, /function sinaisCabecalho\(\)/); assert.match(c, /function equipeHtml\(r, texto\)/);
  assert.match(c, /aguardando\\s\+\(a\\s\+\)\?sess\[ãa\]o/);
  assert.match(c, /var umSo = numeros/, 'lista com um só processo');
  assert.match(c, /if \(ehCabecalho\(el\)\) continue;/, 'o cabeçalho do processo aberto não é cartão');
  assert.match(c, /\(\(r \? sinaisHtml\(k, r\) : ''\) \|\| botaoVazio\(k\)\)/, 'autos digitais: sino mesmo sem sinalização');
  assert.match(c, /var r = ENR\.dados\[k\] \|\| \{\};/, 'o quadro abre sem ficha');
});

test('extensão 0.42: Conformidade em aba própria da Minuta; minuta-matriz do processo sem lista para escolher; cabeçalho automático do PJe fora das conferências', () => {
  const h = read('extensao/painel.html');
  assert.match(h, /id="hero-v53-conf-expand"/); assert.match(h, /<details class="min-conf aba hero-conf-dock" id="min-conf" data-aberto="0">/); assert.doesNotMatch(h, /id="mc-t"/);
  assert.match(read('extensao/conformidade.js'), /function expandirHero\(\)\{var w=\$\('min-conf'\);if\(!w\)return false;rodape\(!w\.open\);return true;/);
  const c = read('extensao/comparar.js');
  assert.match(c, /function matrizDoProcesso\(\) \{ var M = matrizesOrdenadas\(\), z = M\[0\]; return z && z\.k >= 6 \? z\.x : null; \}/);
  assert.doesNotMatch(c, /Escolha uma matriz para comparar bloco a bloco/);
  const cab = ['PODER JUDICIÁRIO', 'Tribunal Regional Federal da 3ª Região', 'Rua Ceará, 2175, Campo Grande - MS', 'https://www.trf3.jus.br', 'APELAÇÃO CÍVEL (198) Nº 5001082-55.2024.4.03.6002', 'RELATOR(A): LUIS CARLOS HIROKI MUTA', 'APELANTE: CONSELHO REGIONAL', 'ADVOGADO do(a) APELANTE: FULANO - MS10544-A', 'NÃO ASSINÁVEL'];
  const r = M.analisar(cab.concat(['RELATÓRIO', 'Trata-se de apelação à sentença (ID 111111111) que julgou improcedente o pedido.', 'É o relatório.']), {});
  assert.ok(!r.itens.some(x => x.trecho && /PODER|Tribunal|APELANTE|ADVOGADO|Rua|https/.test((x.trecho.antes || '') + (x.trecho.alvo || '') + (x.trecho.depois || ''))), JSON.stringify(r.itens.map(x => x.regra)));
  const d = M.analisar(['PODER JUDICIÁRIO', 'AGRAVO DE INSTRUMENTO (202) Nº 5000000-00.2026.4.03.0000', 'Cabeçalho qualquer do PJe sem padrão 12.3.2026', 'Vistos.', 'Trata-se de agravo.', 'DECIDO.', 'Ante o exposto, nego provimento ao agravo.', 'Publique-se. Intime-se.'], {});
  assert.equal(d.peca, 'decisao'); assert.ok(!d.itens.some(x => x.trecho && /Cabeçalho qualquer/.test(x.trecho.depois + x.trecho.alvo + x.trecho.antes)));
});

test('extensão 0.43: Gerador só com relatório e ementa (dispositivo, acórdão e proclamação desligados, no código)', () => {
  const g = read('extensao/gerador.js');
  assert.match(g, /var PECAS = \{ rel: true, em: true, disp: false, ac: false, pr: false \};/);
  assert.match(g, /\(PECAS\.disp \? bloco\('disp'/); assert.match(g, /\(PECAS\.ac \? bloco\('ac'/); assert.match(g, /\(PECAS\.pr \? bloco\('pr'/);
  assert.match(read('extensao/painel.html'), /<b>Corretor /); const gab = read('extensao/gabinete.js'); assert.match(gab, /gerDock\.id='hero-ger-dock'/); assert.match(gab, /gerHost\.id='ger-app'/); assert.match(gab, /\['tri','pro'\]\.indexOf\(G\.rot\)>=0/);
  assert.doesNotMatch(read('extensao/comparar.js'), />Localizar no Collectio<|>Mandar ao Collectio</, 'sem os botões do Collectio no texto do editor');
});

test('extensão 0.44: Ler/Reler sempre a íntegra; documentos do Roteiro em Autos (indicação no Roteiro quando localizados); sugestão de tipo de ato', () => {
  const a = read('extensao/autos.js'), g = read('extensao/gabinete.js'), r = read('extensao/roteiro.js');
  assert.match(a, /function extrairIntegra\(\)/); assert.match(a, /if \(lidoDoProcesso\(\) && !A\.fila\) extrairIntegra\(\);/);
  assert.match(a, /var tudo = true;/); assert.match(a, /'Parecer do MPF': \{ parecer: 1 \}, 'Procuração': \{ procuracao: 1 \}/);
  assert.match(g, /var PECAS_DOC = \[/); assert.match(g, /grupo: 'Parecer do MPF'/); assert.match(g, /function sugerirAto\(\)/); assert.match(g, /atoOpcoes\(k\)/);
  assert.match(r, /var DOC_RT = \{/); assert.match(r, /data-aba="Autos" title="Editar em Autos › Peças e documentos"/);
});

test('extensão 0.45: Comparar só com modelos, precedentes, texto colado e 28,86%; minuta-matriz na Conformidade; Corretor com subabas e Cortex fora da navegação', () => {
  const c = read('extensao/comparar.js'), h = read('extensao/painel.html'), g = read('extensao/gerador.js');
  assert.match(c, /var FORA_CMP = \{ matriz: 1, lote: 1, tri: 1, par: 1 \};/); assert.match(c,/f\[0\] !== 'm2886'/); assert.match(c, /function estruturaConformidade\(aoBaixar\)/);
  assert.match(read('extensao/conformidade.js'), /window\.MutaComparar\.estruturaConformidade\(render\)/);
  assert.doesNotMatch(h, /data-mm="lote"|id="panel-lote"|id="lote-app"/);
  assert.match(h, /hero-v53-page-title">Corretor</);
  assert.match(h, /id="cmp-app"/); assert.match(c,/hero-v53-review-actions/);
  assert.match(h, /id="min-conf"/); assert.doesNotMatch(h,/data-mm="(?:cmp|conf)"/);
  assert.match(g, /m === 'ger' \|\| m === 'conf' \|\| m === 'dir' \? m : 'cmp'/);
  const lote = read('extensao/lote.js');
  assert.equal((lote.match(/if \(caixa\) caixa\.addEventListener\(/g) || []).length, 3);
  assert.match(lote, /minutasDoProcesso: minutasDoProcesso/);
});

test('extensão 0.46: 2ª seta do cartão com síntese, questões, mérito e encaminhamento (fora do Roteiro e da aba Processo)', () => {
  const g = read('extensao/gabinete.js'), r = read('extensao/roteiro.js');
  assert.match(g, /function merEnc\(\)/); assert.match(g, /merEnc\(\) \+\n    '<\/section>';/); assert.match(g, /if \(c\.contains\('pm-mer'\)\) \{ if \(G\.merAb !== e\.target\.open\)/);
  assert.doesNotMatch(g, /<h3>Síntese e questões<\/h3>/);
  assert.match(r, /var NO_CARTAO = \{ mer: 1, enc: 1 \};/);
  assert.doesNotMatch(g, /TR\.registroDe\(/, '0.46.1: sem o quadro Registro da triagem no prontuário');
});

test('extensão 0.47: Roteiro dentro da aba Processo; controles na 1ª seta; Parágrafos-padrão sub-aba do Ementário; Diretrizes na Minuta; Comparar compacto; sem a Ajuda', () => {
  const g = read('extensao/gabinete.js'), h = read('extensao/painel.html'), c = read('extensao/comparar.js');
  assert.match(g, /var MODOS = \['Processo', 'Autos'\];/); assert.match(g, /var h = '<div class="rt-em-proc">' \+ corpoRoteiro\(\) \+ '<\/div>', rot = /);
  assert.match(g, /controlesProcesso\(true\) \+ '<\/details>' \+/, '0.66: controles na 1ª seta');
  assert.match(h, /id="tab-par"[^>]*hidden/); assert.match(h, /data-emd="par"/); assert.doesNotMatch(h, /id="tab-dir"/); assert.doesNotMatch(h, /data-mm="dir"/); assert.doesNotMatch(h, /id="dir-app"/);
  assert.match(h, /id="tab-ajuda"[^>]*hidden>\?<\/button>/);
  assert.match(read('extensao/diretrizes.js'), /d = \$\('dir-app'\); return !!\(p && !p\.hidden && d && !d\.hidden\)/);
  assert.match(c, /class="cx-op1"/); assert.doesNotMatch(c, /Leia o editor do PJe \(ou cole o texto\) para comparar/);
});

test('extensão 0.48: abas Diligências e Deliberações (Desembargador e gestor), Controle só do gestor; etiquetas personalizadas para todos', () => {
  const h = read('extensao/painel.html'), p = read('extensao/prontuario.js'), x = read('extensao/gestao.js'), a = read('extensao/alertas.js'), c = read('extensao/conteudo-pje.js');
  ['tab-dil', 'tab-del', 'tab-ctl'].forEach(id => assert.match(h, new RegExp('id="' + id + '"[^>]*hidden')));
  assert.match(h, /<div id="dil-app"/); assert.match(h, /<div id="del-app"/); assert.match(h, /<div id="ctl-app"/); assert.match(h, /<script src="gestao\.js"><\/script>/);
  /* 0.58: aba Pauta no fim; Controle segue como aba escondida, aberta pelo ícone da faixa do topo */
  assert.match(p, /var NOMES=\['pront','min','ementario','par','ajuda','dil','del','ctl','pauta','modelos','processo','urg'\];/);
  assert.match(x, /ses\.api\('\/api\/pendencias'\)/); assert.match(x, /method: 'PUT', body: JSON\.stringify\(\{ id: id, _rev: t\._rev, stage: st \}\)/);
  assert.match(x, /ses\.api\('\/api\/painel\?cmt=1'\)/); assert.match(x, /acao: 'situacao'/); assert.match(x, /acao: 'responder'/); assert.match(x, /n\.tipo === 'sustentacao'/);
  assert.match(x, /ctl: q\.on && q\.gestor, pauta: q\.on/); assert.match(x, /function pode\(q\) \{ return q\.on && \(q\.gestor \|\| q\.des\); \}/);
  assert.match(a, /var abas = \[\['al', 'PJe'\], \['app', 'Gabinete'\], \['ver', 'Versão'\]\];/); assert.doesNotMatch(a, /\['pz', 'Prazos'\], \['et', 'Etiquetas'\]/); assert.match(a, /function pintarCtl\(\)/);
  assert.match(c, /function etqLigadas\(\)/); assert.match(c, /function botaoEtq\(\)/); assert.match(c, /if \(!E \|\| !E\.categoriaDe \|\| !etqLigadas\(\)\) return;/);
  assert.match(read('apoio/ex-officio/api/pendencias.js'), /PUT \{id,_rev,…\} altera/);
});

test('extensão 0.48.1: sem o seletor de prontuários salvos; Diligências com editar, excluir e responder; a prévia grava Diligências e Deliberações', () => {
  const h = read('extensao/painel.html'), x = read('extensao/gestao.js'), sh = read('scripts/extensao/previa/shim.js');
  assert.doesNotMatch(h, /<select id="pront-lista"/);
  assert.match(x, /function formDil\(t\)/); assert.match(x, /method: 'DELETE'/); assert.match(x, /function responderDil\(f\)/); assert.match(x, /data-gx-form="dresp"/);
  assert.match(sh, /var vivo = \/\\\/api\\\/pendencias/);
});

test('HERO: Kanban sem arraste, etapas oficiais e distribuição de urgências', () => {
  const x=read('extensao/gestao.js'), css=read('extensao/hero-design.css');
  const f=x.slice(x.indexOf('  function kanban('),x.indexOf('  function pintarDil()'));
  const render=new Function('esc',f+';return kanban;')(String);
  const grupos=[['todo','A fazer',[{id:'a'}]],['done','Concluída',[{id:'b'}]]];
  const all=render(grupos,'todas','dil',t=>'<article>'+t.id+'</article>');
  assert.match(all, /data-gx-board="dil:todo"/);assert.match(all, /<article>a<\/article>/);assert.match(all, /<article>b<\/article>/);
  const one=render(grupos,'done','dil',t=>'<article>'+t.id+'</article>');
  assert.doesNotMatch(one, /<article>a<\/article>/);assert.match(one, /<article>b<\/article>/);
  assert.doesNotMatch(all, /draggable=|ondrag|ondrop/);
  const etapa=new Function(x.slice(x.indexOf('  function urgEtapa('),x.indexOf('  function pintarUrg()'))+';return urgEtapa;')();
  assert.equal(etapa({}),'designar');assert.equal(etapa({servidor:'A'}),'minuta');assert.equal(etapa({dataMinuta:'x'}),'corrigir');
  assert.equal(etapa({dataCorrecao:'x'}),'liberar');assert.equal(etapa({dataLiberacao:'x'}),'assinar');assert.equal(etapa({assinado:true}),'conferir');
  assert.match(css,/\.hero-kanban-board/);assert.match(x,/method: 'PUT', body: JSON\.stringify\(\{ id: id, _rev: t\._rev, stage: st \}\)/);
});

test('HERO: Assinatura nas Urgências e fora do sino; sinalizações com aviso e inclusão no alto, com seletor do tipo', () => {
  const x = read('extensao/gestao.js'), a = read('extensao/alertas.js'), g = read('extensao/gabinete.js'), c = read('extensao/conteudo-pje.js'), f = read('extensao/fundo.js');
  assert.match(x, /function itemAs\(a\)/); assert.match(x, /acao: 'assinar', cnj: cnj/); assert.match(x, /acao: 'devolver'/); assert.match(x, /g\[0\]==='assinar'\?L\.as\.map/);
  assert.match(a, /var abas = \[\['al', 'PJe'\], \['app', 'Gabinete'\], \['ver', 'Versão'\]\];/); assert.doesNotMatch(a, /\['ch', 'Chegadas'\]/, '0.73.5: chegadas dentro de PJe'); assert.match(a, /Chegadas de hoje/);
  assert.match(g, /\['av', 'Aviso', 'triagem', 'Avisos'\]/); assert.match(g, /data-sn-add/); assert.doesNotMatch(g, /placeholder="Nova sinalização: descreva e tecle Enter"/);
  assert.match(c, /data-hd-novo-f/); assert.match(c, /\[\['av', 'Aviso'\], \['ic', 'Intercorrência'\], \['pd', 'Pendência'\], \['nt', 'Nota'\]\]/);
  assert.match(f, /av: \['triagem', 'Avisos'\]/);
  assert.match(read('padrao/ficha.json'), /"chave": "Avisos",\s*"tipo": "texto-longo",\s*"secao": "triagem"/);
  assert.match(read('apoio/ex-officio/api/_ficha.js'), /avM: linhas\(t\['Avisos'\]\), avT: todas\(t\['Avisos'\]\)/);
});

test('extensão 0.49.1: controles na 2ª seta; 1ª seta "autuação e partes" em blocos; prévia com a lista do PJe de verdade; número citado no cartão não vira cartão', () => {
  const g = read('extensao/gabinete.js'), c = read('extensao/conteudo-pje.js'), ix = read('scripts/extensao/previa/index.html');
  assert.match(g, /<span class="pm-aut-t">autuação, partes e controles<\/span>/); assert.match(g, /<span class="pm-aut-t">mérito<\/span>/); assert.match(g, /function controlesProcesso\(naSeta\)/);
  assert.match(c, /window\.HERO_PREVIA_PJE === true/); assert.match(c, /\.hcm, #hero-dlg'/); assert.match(c, /if \(bl && numeros\(\(bl\.textContent \|\| ''\)\.slice\(0, 8000\)\)\[0\] !== nn\[0\]\) continue;/);
  assert.match(ix, /<script src="pje-shim\.js"><\/script>/); assert.match(ix, /<script src="painel\/conteudo-pje\.js"><\/script>/);
  assert.match(read('scripts/extensao/previa.py'), /pje-shim\.js/);
});

test('extensão 0.50: 2ª seta sem duplicados; situação calculada pelas sinalizações; campos obtidos sozinhos (auto/autos) com Desfazer', () => {
  const g = read('extensao/gabinete.js'), a = read('extensao/autos.js'), c = read('extensao/comparar.js');
  const me = g.slice(g.indexOf('function merEnc()'), g.indexOf('var AUTO_G'));
  assert.doesNotMatch(me, /campoRot\('triagem', 'O que falta sanar', 'Pendências'\)/); assert.doesNotMatch(me, /campoRot\('triagem', 'Etiquetas', 'Etiquetas do gabinete'\)/);
  assert.match(g, /'<div class="gr pm-enc">' \+ situacaoHtml\(\)/); assert.match(me, /S\(V\('triagem', 'COMPLEXIDADE'\)\) \?/);
  assert.match(g, /function derivados\(\)/); assert.match(g, /function hipotese932\(\)/); assert.match(g, /data-autog="desfazer"/); assert.match(g, /function situacaoSync\(\)/);
  assert.match(a, /function derivAutos\(\)/); assert.match(a, /alvo: 'triagem\.Alegações'/); assert.match(a, /alvo: 'triagem\.Síntese Processual'/);
  assert.match(c, /matriz: function \(\) \{ try \{ return C\.dados \? matrizDoProcesso\(\) : null;/);
});

test('extensão 0.51: Cortex com o PJe aberto — referência na versão final, versões, confronto por seção, veredito, PJe conferido e tag nos cartões', () => {
  const l = read('extensao/lote.js'), c = read('extensao/conteudo-pje.js');
  assert.match(l, /function refPadrao\(\)/); assert.match(l, /a\.it\.final && a\.it\.final\.versao/); assert.match(l, /&versoes=1/); assert.match(l, /&versao=/);
  assert.match(l, /function confrontar\(\)/); assert.match(l, /function qualVersao\(ed, ref\)/); assert.match(l, /acao: 'minuta-pje'/);
  assert.match(l, /'muta-collectio-conf'/); assert.match(l, /function autoAba\(\)/); assert.match(l, /window\.MutaGerador\.modo\('lote'\)/);
  assert.match(l, /\[\['cmp', 'Editor × Cortex'/); assert.match(l, /function confVersao\(m\)/);
  assert.match(c, /function colTag\(k, r, texto\)/); assert.match(c, /'= Cortex' : '≠ Cortex'/);
  assert.match(read('extensao/conformidade-motor.js'), /cabecalhoPje: cabecalhoPje/); assert.match(read('extensao/conformidade.js'), /contexto: function \(\)/);
});

test('tipo de ato sugerido dentro da opção, sem seleção automática',()=>{
 const src=fs.readFileSync(path.join(root,'extensao/gabinete.js'),'utf8');
 const code=src.slice(src.indexOf('function atoOpcoes(k)'),src.indexOf('function corpoProducao()'));
 const render=new Function('PRON','sugerirAto','esc','pronAtual',code+';return {atoOpcoes,atoSel,pronunciamento};')([['Acórdão','Sessão',''],['Decisão monocrática','Monocrática','']],()=>({i:1,por:'triagem'}),String,()=>-1);
 const html=render.atoSel();
 assert.match(html,/<option value="" selected>A definir<\/option>/);
 assert.match(html,/<option value="1" title="Sugestão: triagem">Decisão monocrática · sugerido<\/option>/);
 assert.doesNotMatch(html,/data-pron=|pm-sug/);
 assert.doesNotMatch(render.atoOpcoes(0),/sugerido/);
 assert.match(render.atoOpcoes(0),/<option value="0" selected>Acórdão<\/option>/);
 assert.match(src,/var xp = t\.value === '' \? null : PRON/);
});


test('HERO: faixas compactas, notificações em aba única e Pauta integrada', () => {
  const x=read('extensao/gestao.js'), a=read('extensao/alertas.js'), p=read('extensao/pauta.js'), h=read('extensao/painel.html'), css=read('extensao/hero-design.css'), api=read('apoio/ex-officio/api/_cmt.js');
  assert.match(x,/hero-gestao-strip/);assert.match(x,/painelGestao\('Diligências'[^\n]*atualizaBtn\('ler-dil'/);
  assert.match(x,/painelGestao\('Notificações'[^\n]*atualizaBtn\('ler-del'/);
  assert.match(x,/tab\('cronologia','Cronologia'\)\+tab\('categorias','Categorias'\)/);
  assert.match(a,/data-ap-not/);assert.match(a,/window\.MutaAbas\.ir\('del'\)/);assert.match(h,/<b>Notificações <i class="conf-badge" id="del-badge"/);
  assert.match(x,/acao:'notificacao-lida'/);assert.match(api,/b\.acao==='notificacao-lida'/);
  assert.match(p,/MG\.pautaPendencias/);assert.match(p,/MG\.pautaCard/);assert.match(p,/hero-pa-balanced/);assert.match(css,/\.pa-card-people/);
});


test('HERO: Gerador preserva seleção da prévia, reseta por processo/ficha e não presume tipo incompatível',()=>{
 const ctx={window:{},navigator:{},document:{body:{classList:{contains:()=>true}},addEventListener(){},getElementById(){return null;}}};let cnj='5000000-00.2026.4.03.6000',fields={'triagem.Tipo de Julgamento':'Apelação','producao.Voto - Resultado':'Negado provimento'};
 ctx.window.MutaGabinete={V:(s,k)=>fields[s+'.'+k]||'',fo:()=>({classe_judicial:'APELAÇÃO CÍVEL'}),cnj:()=>cnj,pronunciamento:()=> 'Acórdão (sessão)'};ctx.window.Muta={SITE:'https://www.gabinete-cmt.com'};
 vm.createContext(ctx);vm.runInContext(read('extensao/gerador.js'),ctx);const G=ctx.window.MutaGerador;
 assert.equal(G.docs().tipo,'Apelação');assert.equal(G.docs().k,'desp');
 for(const tipo of ['Agravo de Instrumento','Embargos de Declaração','Agravo Interno','Juízo de Retratação','Remessa Necessária']){assert.equal(G.selecionarTipo(tipo).tipo,tipo);assert.equal(G.docs().k,'','não reutiliza resultado de outro tipo');assert.match(G.html(),/data-ger-tipo/);assert.equal(G.docs().tipo,tipo);}
 fields['triagem.Tipo de Julgamento']='Apelação / Remessa necessária';assert.equal(G.docs().tipo,'Apelação');assert.match(G.docs().rel[0],/remessa necessária/i);
 fields['triagem.Tipo de Julgamento']='Mandado de segurança';assert.equal(G.docs().tipo,'');assert.match(G.html(),/Nenhuma fórmula será presumida/);
 fields['triagem.Tipo de Julgamento']='Agravo interno / Embargos de declaração';assert.equal(G.docs().tipo,'');G.selecionarTipo('Agravo Interno');cnj='5000001-00.2026.4.03.6000';fields['triagem.Tipo de Julgamento']='ED';assert.equal(G.docs().tipo,'Embargos de Declaração');
 fields['producao.Voto - Resultado']='';assert.equal(G.docs().k,'');G._ST.abertos['part-relatorio']=false;assert.doesNotMatch(G.html(),/data-ger-key="part-relatorio"[^>]* open/);
});

test('extensão 0.77.58: Notificações vistas limpam o número; Marcar todas como lidas',()=>{
  const fs=require('node:fs'),path=require('node:path'),r=p=>fs.readFileSync(path.resolve(__dirname,'../../..',p),'utf8');
  const g=r('extensao/gestao.js'),f=r('extensao/fundo.js');
  assert.ok(g.includes('function marcarTodas()')&&g.includes("if(x.dataset.gx==='ler-todas')return marcarTodas();"),'botão marca todas');
  assert.ok(g.includes('data-gx="ler-todas"'),'botão na faixa das Notificações');
  assert.ok(g.includes('n2=naoVistas();'),'número da aba conta só as não vistas');
  assert.ok(g.includes('marcarVistas();badges();'),'abrir a aba marca como visto');
  assert.ok(f.includes("msg.tipo === 'muta-app-visto') appVisto();")&&f.includes('!bv[e.id]'),'ícone da extensão limpa ao ver');
});

test('leitura dos autos 0.77.60: temas e súmulas citados, benefício (NB, DER, DIB, DCB) e laudo pericial como sugestão', () => {
  assert.equal(read('padrao/inteiro-teor.js'), read('extensao/padrao-inteiro-teor.js'), 'cópia da extensão igual ao padrão');
  const w = {}; new Function('window', read('padrao/inteiro-teor.js'))(w); const T = w.CMTInteiroTeor;
  const doc = (id, kind, tipo, text, x) => Object.assign({ id, kind, tipo, descricao: '', date: '2026-03-10', text, empty: false }, x || {});
  const sent = doc('111111111', 'sentenca', 'Sentença', 'Restabelecimento do auxílio NB 31/612.345.678-9 (DCB em 15/02/2022), DER em 03/01/2022. Aplica-se o Tema 1.013/STJ e a Súmula 111 do STJ, e os Temas 810 e 1.419 do STF. JULGO PROCEDENTE, com DIB em 16/02/2022.', { target: 'sentenca' });
  const ap = doc('222222222', 'recurso', 'Apelação', 'Alega nulidade do laudo pericial por contradição e pede nova perícia. Invoca o Tema 1.105/STJ.', { target: 'recurso', recursoTipo: 'Apelação' });
  const laudo = doc('333333333', 'documento', 'Laudo Pericial', 'CID-10: M54.5. Não há incapacidade total e permanente. Há incapacidade total e temporária. DII: 10/12/2021.', { date: '2021-12-20' });
  const ques = doc('444444444', 'peticao', 'Petição', 'Quesitos', { descricao: 'Quesitos ao laudo pericial' });
  const v = k => (T.buildSuggestions({ docs: [sent, ap, laudo, ques], polos: {} }, {}, null).find(i => i.key === k) || {}).value;
  const temas = v('Temas e súmulas citados');
  for (const t of ['Tema 1.105/STJ — apelação (ID 222222222)', 'Tema 1.013/STJ — sentença (ID 111111111)', 'Tema 810/STF', 'Tema 1.419/STF', 'Súmula 111/STJ', 'Tema 1.105/STJ']) assert.ok(temas.includes(t), t);
  assert.equal(v('Benefício - NB'), '612.345.678-9 (espécie 31)');
  assert.equal(v('Benefício - DER'), '03/01/2022'); assert.equal(v('Benefício - DIB'), '16/02/2022'); assert.equal(v('Benefício - DCB'), '15/02/2022');
  assert.equal(v('Perícia - Laudo ID'), '333333333', 'quesitos não contam como laudo');
  assert.equal(v('Perícia - Conclusão'), 'Incapacidade total e temporária', 'frase negada não vira conclusão');
  assert.equal(v('Perícia - DII'), '10/12/2021'); assert.equal(v('Perícia - CID'), 'M54.5'); assert.equal(v('Perícia - Impugnada no recurso'), 'Sim');
  assert.equal(T.buildSuggestions({ docs: [doc('1', 'sentenca', 'Sentença', 'Processo nº 5001234-55.2025.4.03.6000', { target: 'sentenca' })], polos: {} }, {}, null).find(i => i.key === 'Benefício - NB'), undefined, 'número do processo não é NB');
  const F = JSON.parse(read('padrao/ficha.json')), chaves = new Set(F.abas.flatMap(a => a.grupos.flatMap(g => g.campos.map(c => c.chave))));
  for (const k of ['Benefício - NB', 'Benefício - DER', 'Benefício - DIB', 'Benefício - DCB', 'Perícia - Laudo ID', 'Perícia - Laudo data', 'Perícia - Conclusão', 'Perícia - DII', 'Perícia - CID', 'Perícia - Impugnada no recurso', 'Temas e súmulas citados']) assert.ok(chaves.has(k), 'campo na ficha: ' + k);
});
