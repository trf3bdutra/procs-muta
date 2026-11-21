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
  assert.match(gab, /var MODOS = \['Processo', 'Autos', 'Roteiro'(, 'Gerador')?\]/);

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
  assert.ok(html.includes('id="acv-modo-rel"') && html.includes('class="acv-faixa"'));
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
  assert.deepEqual(man.content_scripts[0].js.slice(0, 2), ['etiquetas.js', 'conteudo-pje.js'], 'etiquetas.js antes do leitor');
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
  assert.match(read('extensao/gabinete.js'), /function rotuloDe\(c\) \{ return \(\/Honorários\//);
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
  assert.equal(D.acordao, 'Vistos e relatados estes autos em que são partes as acima indicadas, a Turma Regional de Mato Grosso do Sul, por unanimidade, negou provimento à apelação, nos termos do relatório e voto que ficam fazendo parte integrante do presente julgado.');
  assert.equal(D.procl, 'Por unanimidade, negou provimento à apelação.');
  const gab = read('extensao/gabinete.js');
  assert.match(gab, /var MODOS = \['Processo', 'Autos', 'Roteiro', 'Gerador'\]/);
  assert.match(read('extensao/painel.html'), /<script src="gerador\.js"><\/script>/);
});

test('extensão 0.21: chegadas do PJe (só gestor; base sem aviso; urgente avisa na hora) e notificações do app com origem distinta', async () => {
  const store = { 'muta-gestor': true }, notas = [], posts = [];
  const chrome = { storage: { local: { get: k => Promise.resolve(Object.fromEntries([].concat(k).map(x => [x, store[x]]))), set: o => { Object.assign(store, o); return Promise.resolve(); } }, session: { set: () => Promise.resolve(), get: () => Promise.resolve({}) }, onChanged: { addListener() {} } },
    notifications: { create: (id, o) => notas.push([id, o]), onClicked: { addListener() {} }, clear() {} }, action: { setBadgeText() {}, setBadgeBackgroundColor() {}, onClicked: { addListener() {} } },
    runtime: { onMessage: { addListener() {} }, onInstalled: { addListener() {} }, onStartup: { addListener() {} }, getURL: x => x }, alarms: { onAlarm: { addListener() {} }, create() {} }, sidePanel: { setPanelBehavior: () => Promise.resolve() }, tabs: { query: () => Promise.resolve([]), onUpdated: { addListener() {} }, onActivated: { addListener() {} }, onRemoved: { addListener() {} } }, scripting: {} };
  const ctx = { self: {}, chrome, console, importScripts() {}, fetch: (u, o) => { posts.push([u, o && o.body]); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }); }, setTimeout, Date, Promise, JSON, Object, Array, String, Number, isFinite };
  vm.createContext(ctx); try { vm.runInContext(read('extensao/fundo.js'), ctx); } catch (e) { /* listeners do navegador ausentes no teste */ }
  const K1 = '50000000020264030000', K2 = '50000000120264030000';
  await ctx.chegadas([K1], { [K1]: 'Agravo de instrumento' }, 'Triagem', {});
  assert.equal(notas.length, 0, 'a primeira lista vira a base, sem aviso');
  await ctx.chegadas([K1, K2], { [K2]: 'AGRAVO DE INSTRUMENTO · pedido de LIMINAR · medicamento' }, 'Analisar pedido', {});
  assert.equal(notas.length, 1); assert.match(notas[0][0], /^cheg:/); assert.match(notas[0][1].title, /Chegada urgente/); assert.equal(notas[0][1].iconUrl, 'icones/pje-128.png');
  assert.ok(posts.some(p => /chegadas=1/.test(p[0]) && /"urg":true/.test(p[1])));
  assert.equal(store['muta-chegadas'].length, 1);
  store['muta-gestor'] = false; await ctx.chegadas(['50000000220264030000'], {}, '', {}); assert.equal(store['muta-chegadas'].length, 1, 'só gestor');
  const man = JSON.parse(read('extensao/manifest.json')); assert.ok(man.permissions.includes('alarms'));
  assert.match(read('extensao/fundo.js'), /iconUrl: 'icones\/app-128\.png', title: '🏛 Gabinete · '/);
  assert.match(read('extensao/fundo.js'), /iconUrl: 'icones\/pje-128\.png', title: '⚖ PJe · '/);
  ['icones/app-128.png', 'icones/pje-128.png', 'relatorio.html', 'relatorio.js'].forEach(f => assert.ok(fs.existsSync(path.join(ext, f)), f));
  assert.match(read('apoio/ex-officio/api/pauta.js'), /req\.query\.chegadas\) return require\('\.\/_chegadas'\)/);
  assert.match(read('apoio/ex-officio/api/notificacoes.js'), /require\('\.\/_chegadas'\)\.eventos\(u\)/);
});
