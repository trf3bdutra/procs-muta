/* Muta · motor da conformidade (padrão do gabinete do Des. Fed. Carlos Muta)
   Analisa o texto do editor do PJe, parágrafo a parágrafo, com:
   - a estrutura das peças do Manual CMT (relatório, voto, ementa CNJ 154/2024 adaptada, acórdão, decisão e despacho);
   - a coerência do resultado entre dispositivo, ementa, cabeçalho e acórdão, e com o prontuário do processo;
   - os IDʼs citados contra as peças registradas no prontuário e no cartão da pauta;
   - as regras de redação do Compendium (apoio/diretrizes.json) e os alertas do Manual (apoio/vade-mecum.json);
   - a lista de caça do gabinete (erros recorrentes das minutas).
   Transcrições (parágrafo citado, entre aspas ou em itálico) ficam fora das regras de redação: o texto-fonte se preserva.
   Função pura: analisar(paragrafos, ctx) → { peca, itens, resumo, nota }. Roda no painel e nos testes (Node). */
(function (raiz) {
'use strict';
function S(v) { return String(v == null ? '' : v).trim(); }
function nz(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
var SEV = { alta: 3, media: 2, baixa: 1 };

/* ---------- partes da peça ---------- */
var CAB = [['relatorio', /^relat[óo]rio\.?$/i], ['voto', /^voto(?:[- ]vista)?\.?$/i], ['ementa', /^e\s*m\s*e\s*n\s*t\s*a\.?$/i], ['acordao', /^ac[óo]rd[ãa]o\.?$/i]];
function partes(ps) {
  var out = { cabecalho: [], relatorio: [], voto: [], ementa: [], acordao: [] }, cur = 'cabecalho', titulos = {};
  ps.forEach(function (p, i) {
    var t = S(p.t); if (!t) return;
    for (var k = 0; k < CAB.length; k++) if (CAB[k][1].test(t)) { cur = CAB[k][0]; titulos[cur] = i; return; }
    out[cur].push(Object.assign({}, p, { t: t, i: i, sec: cur }));
  });
  out.titulos = titulos;
  return out;
}
function tipoPeca(P, todos) {
  if (P.titulos.voto != null || P.titulos.ementa != null || P.titulos.relatorio != null) return 'acordao';
  var tx = todos.map(function (p) { return S(p.t); });
  if (tx.some(function (t) { return /^vistos\.?$/i.test(t); }) && tx.some(function (t) { return /^DECIDO\.?$/.test(t) || /^ante o exposto,/i.test(t); })) return 'decisao';
  if (tx.some(function (t) { return /^vistos\.?$/i.test(t); }) || tx.some(function (t) { return /^intime-se\.?$/i.test(t); })) return 'despacho';
  return 'texto';
}
/* transcrição: citação marcada, parágrafo em itálico ou entre aspas */
function citacao(p) {
  var t = S(p.t);
  if (p.cita) return true;
  if ((p.ita || 0) >= 0.6 && t.length > 40) return true;
  if (/^[“"«]/.test(t) && /[”"»](\s*\(g\.\s?n\.\))?[.;:]?$/.test(t)) return true;
  /* transcrição de lei ou de ementa: "Art. 1º …", "§ 2º …", "Parágrafo único.", "I - …", ou termina em (g.n.) */
  if (/^(Art\.\s*\d|§\s*\d|Par[áa]grafo [úu]nico|[IVXL]+\s*[-–—]\s)/.test(t) || /\(g\.\s?n\.\)[.;:]?$/.test(t)) return true;
  return false;
}

/* ---------- resultado ---------- */
var RES_TXT = { provido: 'provimento', parcial: 'parcial provimento', desprovido: 'desprovimento', naoconhecido: 'não conhecimento', prejudicado: 'prejudicado',
  rejeitados: 'rejeição dos embargos', acolhidos: 'acolhimento dos embargos', concedida: 'segurança concedida', denegada: 'segurança denegada' };
function resultadoDe(t) {
  t = S(t); if (!t) return '';
  if (/parcial(?:mente)?\s+(?:o\s+)?provimento|dou\s+parcial|deu\s+parcial|dar\s+parcial|parcialmente\s+provid[ao]s?/i.test(t)) return 'parcial';
  if (/(?:nego|negou|negar|negaram)\s+provimento|\bdesprovid[ao]s?\b|\bn[ãa]o\s+provid[ao]s?\b/i.test(t)) return 'desprovido';
  if (/n[ãa]o\s+conhe[cç]o|n[ãa]o\s+conhec(?:id[ao]s?|eu|er|eram)|\bn[ãa]o\s+conhecimento/i.test(t)) return 'naoconhecido';
  if (/rejeito\s+os\s+embargos|embargos\s+de\s+declara[çc][ãa]o\s+rejeitados|\bembargos\s+rejeitados|rejeitou\s+os\s+embargos|\brejeitad[ao]s\b/i.test(t)) return 'rejeitados';
  if (/acolho\s+(?:parcialmente\s+)?os\s+embargos|acolheu\s+(?:parcialmente\s+)?os\s+embargos|\bembargos[^.]{0,40}acolhidos|\bacolhid[ao]s\b/i.test(t)) return 'acolhidos';
  if (/concedo\s+(?:parcialmente\s+)?a\s+seguran[çc]a|seguran[çc]a\s+concedida|concedeu\s+a\s+seguran[çc]a/i.test(t)) return 'concedida';
  if (/denego\s+a\s+seguran[çc]a|seguran[çc]a\s+denegada|denegou\s+a\s+seguran[çc]a/i.test(t)) return 'denegada';
  if (/prejudicad[ao]s?/i.test(t)) return 'prejudicado';
  if (/(?:dou|deu|dar|deram)\s+provimento|\bprovid[ao]s?\b/i.test(t)) return 'provido';
  return '';
}
/* resultado do prontuário (vocabulário do rascunho ou da ficha) */
function resultadoProntuario(v) {
  v = nz(v); if (!v) return '';
  if (/parcial/.test(v)) return 'parcial';
  if (/negar|desprovid/.test(v)) return 'desprovido';
  if (/nao conhec/.test(v)) return 'naoconhecido';
  if (/prejudic/.test(v)) return 'prejudicado';
  if (/rejeit/.test(v)) return 'rejeitados';
  if (/acolh/.test(v)) return 'acolhidos';
  if (/conced/.test(v)) return 'concedida';
  if (/deneg/.test(v)) return 'denegada';
  if (/provimento|provid/.test(v)) return 'provido';
  return '';
}

/* ---------- lista de caça (erros recorrentes das minutas do gabinete) ---------- */
var CACA = [
  ['\\bpedidos formulado\\b', 'pedidos formulados', 'concordância'],
  ['\\bsomente aplica-se\\b', 'somente se aplica', 'colocação pronominal (próclise)'],
  ['\\bque restrinja-se\\b', 'que se restrinja', 'colocação pronominal (próclise)'],
  ['\\bn[ãa]o (aplica|trata|cuida|exige|admite|configura|verifica|justifica)-se\\b', 'não se …', 'colocação pronominal (próclise após “não”)'],
  ['\\bpois igualmente senten[çc]a\\b', 'pois igualmente a sentença', 'artigo omitido'],
  ['^Por[ée]m,', 'Contudo, / Todavia,', '“Porém,” no início do período'],
  ['\\b(Tema|S[úu]mula)\\s+[\\d.]+\\/(STJ|STF)\\s+(Com efeito|Assim|Contudo|Todavia|Ademais|No caso|Na esp[ée]cie)\\b', 'ponto antes do conectivo', 'pontuação'],
  ['\\bcom os apontados destacados\\b', 'com os apontamentos destacados', 'fórmula do artigo 1.025 do CPC'],
  ['\\bembargosde\\b', 'embargos de', 'palavras aglutinadas'],
  ['\\bNaesp[ée]cie\\b', 'Na espécie', 'palavras aglutinadas'],
  ['\\b[A-ZÀ-Ý]{4,}\\.[A-ZÀ-Ý]{4,}\\b', 'espaço depois do ponto', 'palavras aglutinadas'],
  ['\\bintepreta', 'interpreta…', 'grafia'],
  ['\\bTrata-se de interno\\b', 'Trata-se de agravo interno', 'palavra omitida'],
  ['\\bdada [àa] reg[êe]ncia\\b', 'dada a regência', 'crase indevida'],
  ['\\bviola aos artigos\\b', 'viola os artigos', 'regência'],
  ['\\bsob este [óo]tica\\b', 'sob esta ótica', 'concordância'],
  ['\\bsem julgamento de m[ée]rito\\b', 'sem resolução do mérito', 'terminologia do CPC'],
  ['\\baux[íi]lio-doen[çc]a\\b', 'auxílio por incapacidade temporária', 'terminologia (EC 103/2019)'],
  ['\\bparar arcar\\b', 'para arcar', 'grafia'],
  ['\\bSenhores Julgadores\\b', 'Senhores Desembargadores', 'vocativo do voto'],
  ['\\bOutrossim\\b', 'Ademais, / Além disso,', 'conectivo fora do padrão'],
  ['\\bcar[êe]ncia de a[çc][ãa]o\\b', 'ausência de interesse processual ou ilegitimidade, conforme o caso', 'terminologia do CPC'],
  ['\\bdespacho saneador\\b', 'decisão de saneamento', 'terminologia do CPC'],
  ['\\bapela[çc][ãa]o julgada procedente\\b', 'apelação provida', 'verbo do resultado'],
  ['\\bmandado de seguran[çc]a provido\\b', 'segurança concedida', 'verbo do resultado'],
  ['\\b(categoricamente|absolutamente|flagrantemente|indubitavelmente|inegavelmente)\\b', 'formulação neutra', 'advérbio enfático'],
  ['Publique-se\\.\\s*Publique-se\\.', 'Publique-se.', 'fecho repetido'],
  ['§\\s*\\d+\\s*°', '§ 2º (ordinal “º”, não grau “°”)', 'símbolo de ordinal'],
  ['(?<![\\d./-])\\d{1,2}\\.\\d{1,2}\\.\\d{4}(?![\\d.])', 'DD/MM/AAAA', 'formato de data'],
  ['(?:^|[\\s;])(?:\\d{1,2}\\s?-\\s|\\d{1,2}\\)\\s)(?=[a-zà-ÿ])', '(1) …; (2) …; e (3) …', 'enumeração fora do padrão']
].map(function (r) { return { re: r[0], sug: r[1], nome: r[2] }; });
var NOME_PROPRIO = /^(Uni[ãa]o|Estado|INSS|Caixa|CEF|Minist[ée]rio|Supremo|Superior|Tribunal|Turma|Lei|C[óo]digo|Constitui[çc][ãa]o|Fazenda|Munic[íi]pio|Banco|Instituto|Ag[êe]ncia|Conselho|Procuradoria|Defensoria|Juiz|Ju[íi]zo|ACP|Tema|S[úu]mula)\b/;

/* posição dentro de trecho citado entre aspas curvas (“…”) no meio do parágrafo */
function entreAspas(t, i) { var a = t.slice(0, i), ab = (a.match(/“/g) || []).length, fe = (a.match(/”/g) || []).length; return ab > fe; }
function trecho(t, ini, fim) {
  var a = Math.max(0, ini - 60), b = Math.min(t.length, fim + 60);
  return { antes: (a > 0 ? '…' : '') + t.slice(a, ini), alvo: t.slice(ini, fim), depois: t.slice(fim, b) + (b < t.length ? '…' : '') };
}
function frases(t) { return String(t || '').split(/(?<=[.;!?])\s+(?=[A-ZÀ-Ý(“"])/).filter(function (x) { return x.trim(); }); }
function ids(t) {
  var out = [], re = /\bIDs?['’ʼ]?s?\s*(?:n[º°.]\s*)?((?:\d{6,}(?:\s*(?:,|e|;)\s*)?)+)/g, m;
  while ((m = re.exec(t))) m[1].replace(/\d{6,}/g, function (x) { out.push(x); });
  return out;
}

/* ---------- 0.40 · IDʼs × autos lidos: a peça que o texto diz é a peça do PJe? ----------
   A palavra mais próxima antes do ID (no mesmo período) diz que peça o texto cita; a categoria do documento na cronologia
   (autos.js › CAT) diz o que ele é. Só aponta quando as duas são claramente diferentes. */
var CITA = [
  ['acórdão', /ac[óo]rd[ãa]o/gi, { acordao: 1, decisao: 1 }],
  ['sentença', /senten[çc]a/gi, { sentenca: 1, decisao: 1 }],
  ['decisão', /decis[ãa]o|decidiu|decisum/gi, { decisao: 1, sentenca: 1, acordao: 1, despacho: 1 }],
  ['apelação', /apela[çc][ãa]o|apelou|apelaram|apelante/gi, { apelacao: 1, adesivo: 1, recurso: 1 }],
  ['contrarrazões', /contrarraz|contrarrazo|contraminuta|resposta ao recurso/gi, { contrarrazoes: 1 }],
  ['parecer do MPF', /parecer|procuradoria regional|minist[ée]rio p[úu]blico|opinou/gi, { parecer: 1 }],
  ['procuração', /procura[çc][ãa]o|substabelec/gi, { procuracao: 1 }],
  ['embargos de declaração', /embargos de declara[çc][ãa]o|embargou|op[ôo]s embargos/gi, { ed: 1 }],
  ['agravo interno', /agravo interno/gi, { agint: 1, agravo: 1 }],
  ['laudo pericial', /laudo|per[íi]cia/gi, { laudo: 1 }],
  ['petição inicial', /peti[çc][ãa]o inicial|\binicial\b|exordial/gi, { inicial: 1 }],
  ['contestação', /contesta[çc][ãa]o|contestou/gi, { contestacao: 1 }],
  ['comprovante do preparo', /\bcustas\b|preparo|\bGRU\b|recolhimento/gi, { custas: 1 }]
];
/* categorias neutras (petição, documento, informação, intimação): o tipo do PJe não prova que a peça é outra */
var NEUTRA = { peticao: 1, outro: 1, informacao: 1, intimacao: 1 };
/* a peça que o texto atribui ao ID: só quando o ID vem colado ao nome da peça ("à sentença (ID …)", "Apelou a União (ID …)",
   "contrarrazões apresentadas pela autora (ID …)"). Quando há um ato no meio ("foram rejeitados (ID …)", "Mantida a sentença
   em juízo de retratação (ID …)", "opinou pelo provimento da apelação (ID …)"), o ID é do ato, e nada se aponta. */
var VERBO = /\b(foi|foram|é|são|ser|sido|restou|restaram|mantid|rejeit|indefer|defer|provid|julg|recebid|processad|acolh|homolog|determin|registr|assent|consign|reconhec|extint|conden|fix|declar|afast|anul|reform|confirm|opin|ofici|manifest|decid|deduzid|apreci|analis|concedid|denegad|negad|negou|deu|dou|nego|sentenci|proferid|certific|intimad|publicad|disponibiliz|juntad|aponta|remet|cita|mencion|integr)\w*/i;
function pecaCitada(t, pos) {
  var pre = t.slice(0, pos).replace(/\(\s*$/, ''), frase = pre.slice(Math.max(pre.lastIndexOf('. '), 0));
  if (/(Procuradoria|Minist[ée]rio P[úu]blico)[^.]{0,160}\b(opinou|oficiou|manifestou)/i.test(frase)) return { rot: 'parecer do MPF', ok: { parecer: 1 } };
  var ini = Math.max(pre.lastIndexOf('. '), pre.lastIndexOf('; '), pre.lastIndexOf(', '), pre.lastIndexOf(': '), pre.lastIndexOf(')'), pre.lastIndexOf(' que '), 0), cl = pre.slice(ini), melhor = null;
  CITA.forEach(function (c) { c[1].lastIndex = 0; var m; while ((m = c[1].exec(cl))) { var fim = m.index + m[0].length; if (!melhor || fim > melhor.fim) melhor = { rot: c[0], ok: c[2], ini: m.index, fim: fim }; } });
  /* "Apelou o Ministério Público Federal (ID …)": quem abre com o verbo do recurso cita o recurso, seja quem for a parte */
  if (/^\s*(Apelou|Apelaram|Recorreu|Recorreram)\b/.test(cl)) return { rot: 'apelação', ok: CITA[3][2] };
  if (/^\s*(Agravou|Agravaram)\b/.test(cl)) return { rot: 'agravo', ok: { agravo: 1, agint: 1, inicial: 1 } };
  if (!melhor) return null;
  var antes = cl.slice(0, melhor.ini), depois = cl.slice(melhor.fim);
  /* "decisão dos embargos de declaração (ID …)", "acórdão da apelação (ID …)": a peça é a decisão */
  if (/(decis[ãa]o|ac[óo]rd[ãa]o|senten[çc]a|julgamento)\s+(?:d[oae]s?|que\s+(?:julgou|rejeitou|acolheu|apreciou))\s*$/i.test(antes)) return { rot: 'decisão', ok: CITA[2][2] };
  /* "contrarrazões … à apelação do BACEN (ID …)": a peça é a contrarrazão */
  if (/contrarraz|contraminuta/i.test(frase) && /apela|recurso|agravo/i.test(melhor.rot)) return { rot: 'contrarrazões', ok: CITA[4][2] };
  if (VERBO.test(antes) || VERBO.test(depois) || /\b(sem|em|nem)\s*$/i.test(antes) || depois.trim().split(/\s+/).filter(Boolean).length > 4) return null;
  return melhor;
}
/* objeto do dispositivo ("à apelação da União", "às apelações e à remessa necessária"): o que o acórdão e a ementa espelham */
function objetoDe(t) {
  var m = /(?:provimento|conhe[cç]o|conheceu|prejudicad[ao]s?|acolho|rejeito|acolheu|rejeitou|concedo|denego)\s+(?:parcial\s+)?((?:ao?s?|à|às)\s+[^.,;]{3,120})/i.exec(String(t || ''));
  return m ? S(m[1]).replace(/\s+/g, ' ') : '';
}
function plural(o) { return /\b(apelacoes|recursos|agravos|embargos de declaracao opostos por|remessas)\b|\be (a|o|as|os|à|às) (apelacao|remessa|recurso|agravo)/.test(o); }
/* palavras com peso de uma questão (para ver se o voto a enfrenta) */
var VAZIAS = /^(sobre|entre|contra|desde|quando|porque|portanto|apesar|ainda|mesmo|tambem|apenas|outros|outras|referente|relativ[ao]s?|quanto|acerca|sentenca|recurso|apelacao|apelante|apelado|alegacao|alega|requer|pedido|pedidos|processo|autos|parte|partes|direito|valor|valores|uniao|federal|inss)$/;
function chaves(q) { return nz(q).replace(/^\(?\d+\)?[.)\s-]*/, '').split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 6 && !VAZIAS.test(w); }); }

/* 0.42 · o cabeçalho que o PJe põe sozinho (brasão, tribunal, endereço, classe e número, relator, partes e advogados,
   "NÃO ASSINÁVEL") não é texto da minuta: fica fora de todas as conferências */
var CAB_PJE = /^(PODER JUDICI[ÁA]RIO|Tribunal Regional Federal|Turma Regional|Gab(inete)?\.?\s|Rua\s|Avenida\s|Av\.\s|CEP\b|https?:\/\/|www\.|N[ÃA]O ASSIN[ÁA]VEL|OUTROS PARTICIPANTES|[A-ZÀ-Ý ]{4,60}\(\d{2,4}\)\s*N[ºo°]|(RELATOR|RELATORA|APELANTE|APELAD[OA]|AGRAVANTE|AGRAVAD[OA]|EMBARGANTE|EMBARGAD[OA]|IMPETRANTE|IMPETRAD[OA]|PARTE AUTORA|PARTE R[ÉE]|AUTOR|R[ÉE]U|INTERESSAD[OA]|TERCEIRO INTERESSADO|FISCAL DA LEI|PROCURADOR|REPRESENTANTE|ADVOGAD[OA])\b[^:]{0,60}:)/;
function cabecalhoPje(t) { t = S(t); return !!t && t.length < 400 && CAB_PJE.test(t); }
function analisar(paragrafos, ctx) {
  ctx = ctx || {};
  var ps = (paragrafos || []).map(function (p) { return typeof p === 'string' ? { t: p } : p; }).filter(function (p) { return S(p.t) && !cabecalhoPje(p.t); });
  /* decisão e despacho: o que vem antes de "Vistos." também é cabeçalho */
  var iv = -1; ps.forEach(function (p, i) { if (iv < 0 && /^vistos\.?$/i.test(S(p.t))) iv = i; });
  if (iv > 0 && !ps.slice(0, iv).some(function (p) { return /^(relat[óo]rio|voto|ementa|ac[óo]rd[ãa]o)\.?$/i.test(S(p.t)); })) ps = ps.slice(iv);
  var P = partes(ps), peca = tipoPeca(P, ps), itens = [], vistos = {};
  var off = ctx.desligadas || {};
  function add(sev, grupo, regra, msg, p, ini, fim, sug) {
    if (off[regra]) return;
    var k = regra + '|' + (p ? p.i : '') + '|' + (ini == null ? '' : ini);
    if (vistos[k]) return; vistos[k] = 1;
    var t = p ? S(p.t) : '';
    itens.push({ sev: sev, grupo: grupo, regra: regra, msg: msg, sug: sug || '', par: p ? p.i : null, sec: p ? p.sec : '',
      trecho: p ? (ini != null ? trecho(t, ini, fim) : { antes: '', alvo: '', depois: t.length > 160 ? t.slice(0, 160) + '…' : t }) : null });
  }
  /* no acórdão, o que vem antes do RELATÓRIO é o cabeçalho automático: fora das conferências */
  var corpo = P.relatorio.concat(P.voto), ementa = P.ementa, todos = (peca === 'acordao' ? [] : P.cabecalho).concat(P.relatorio, P.voto, P.ementa, P.acordao);
  if (peca !== 'acordao') { corpo = todos; ementa = []; }

  /* ---------- 1. estrutura ---------- */
  if (peca === 'acordao') {
    var R = P.relatorio, Vt = P.voto;
    if (!R.length && P.titulos.relatorio == null) add('alta', 'Estrutura', 'MAN-CMT-014', 'Sem RELATÓRIO identificado. A ordem é RELATÓRIO → “É o relatório.” → VOTO → “É como voto.” → EMENTA → ACÓRDÃO.', null);
    if (R.length) {
      if (!/^Trata-se de\b/.test(R[0].t)) add('media', 'Estrutura', 'MAN-CMT-015', 'O relatório abre com “Trata-se de [recurso] à sentença (ID …) que …”.', R[0]);
      var fechoR = R.filter(function (p) { return /^É o relatório\.$/.test(p.t); });
      if (!fechoR.length) add('alta', 'Estrutura', 'MAN-CMT-018', 'Falta o fecho “É o relatório.” em linha própria.', R[R.length - 1]);
      else if (fechoR[0] !== R[R.length - 1]) add('media', 'Estrutura', 'MAN-CMT-018', '“É o relatório.” não é o último parágrafo do relatório.', fechoR[0]);
      var raz = R.filter(function (p) { return /^(Apelou|Agravou|Embargou|Opôs|Interpôs|Apelaram|Agravaram)\b/.test(p.t); });
      R.forEach(function (p) { if (/^Aduz\b/.test(p.t) && raz.indexOf(p) < 0 && R.indexOf(p) <= 2) add('baixa', 'Redação', 'MAN-CMT-048', '“Aduz” é para acréscimo. Para abrir as razões: “Apelou … (ID …), alegando, em suma, que: (1) …; e (2) …”.', p, 0, 4); });
      R.forEach(function (p) { var m = /Minist[ée]rio P[úu]blico Federal[^.]{0,60}\b(opinou|manifestou|oficiou)/i.exec(p.t); if (m) add('baixa', 'Redação', 'MAN-CMT-049', 'No 2º grau, prefira “Procuradoria Regional da República”, por extenso.', p, m.index, m.index + 28); });
    }
    if (!Vt.length) add('alta', 'Estrutura', 'MAN-CMT-022', 'Sem VOTO identificado.', null);
    else {
      if (!/^O(?:\s+|a\s+)?(?:Desembargador|Desembargadora|Juiz|Ju[íi]za)(?:\s+Federal)?(?:\s+Convocad[oa])?\s+.+\(Relator[a]?\):$/.test(Vt[0].t))
        add('media', 'Estrutura', 'MAN-CMT-022', 'O voto abre com “O Desembargador Federal Carlos Muta (Relator):”.', Vt[0]);
      var voc = Vt.slice(0, 3).filter(function (p) { return /Senhores Desembargadores,/.test(p.t); })[0];
      if (!voc) add('media', 'Estrutura', 'MAN-CMT-022', 'Falta o vocativo “Senhores Desembargadores,” no início do voto.', Vt[1] || Vt[0]);
      else {
        var j = voc.t.indexOf('Senhores Desembargadores,') + 25, resto = voc.t.slice(j).trim(), alvoP = voc;
        if (!resto) { alvoP = Vt[Vt.indexOf(voc) + 1]; resto = alvoP ? alvoP.t : ''; }
        if (resto && /^[A-ZÀ-Ý]/.test(resto) && !NOME_PROPRIO.test(resto))
          add('media', 'Redação', 'red-dir-31', 'Depois de “Senhores Desembargadores,”, o primeiro parágrafo começa com letra minúscula.', alvoP, alvoP === voc ? j + (voc.t.slice(j).length - voc.t.slice(j).trimStart().length) : 0, (alvoP === voc ? j + (voc.t.slice(j).length - voc.t.slice(j).trimStart().length) : 0) + 1);
      }
      var disp = Vt.filter(function (p) { return /^Ante o exposto,/.test(p.t); });
      if (!disp.length) add('alta', 'Estrutura', 'MAN-CMT-028', 'Falta o dispositivo “Ante o exposto, [resultado].”.', Vt[Vt.length - 1]);
      if (!Vt.some(function (p) { return /^É como voto\.$/.test(p.t); })) add('alta', 'Estrutura', 'MAN-CMT-028', 'Falta o fecho “É como voto.” em linha própria.', Vt[Vt.length - 1]);
      var txV = Vt.map(function (p) { return p.t; }).join('\n');
      if (/\bpreliminar/i.test(txV) && !/\bNo m[ée]rito\b|\bSuperad[ao]s?\s+(?:a|as|o|os)?\s*(?:preliminar|quest)/i.test(txV))
        add('baixa', 'Estrutura', 'MAN-CMT-024', 'Há preliminar no voto, mas não a passagem ao mérito (“No mérito,” ou “Superada a preliminar, passa-se à análise do mérito.”).', null);
      if (!/\b(Na esp[ée]cie|No caso)\b/.test(txV)) add('baixa', 'Estrutura', 'MAN-CMT-025', 'Sem “Na espécie,” ou “No caso,”: a passagem da moldura jurídica aos fatos do processo, com os IDʼs.', null);
    }
  } else if (peca === 'decisao') {
    if (!ps.some(function (p) { return /^(Publique-se\.\s*)?Intime-se\.|^Publique-se\. Intime-se\./.test(S(p.t)); })) add('media', 'Estrutura', 'MAN-CMT-039', 'Decisão monocrática fecha com “Publique-se. Intime-se.”.', ps[ps.length - 1]);
    if (!ps.some(function (p) { return /^Ante o exposto,/.test(S(p.t)); })) add('media', 'Estrutura', 'MAN-CMT-039', 'Decisão monocrática: “Ante o exposto,” + primeira pessoa + base legal (ex.: “com esteio no artigo 932, III, do CPC”).', ps[ps.length - 1]);
  } else if (peca === 'despacho') {
    ps.forEach(function (p) { if (/^Ante o exposto,/.test(S(p.t))) add('media', 'Estrutura', 'MAN-CMT-040', 'Despacho não usa “Ante o exposto,”: Vistos. → determinação → Intime-se.', p, 0, 16); });
  }

  /* ---------- 2. ementa ---------- */
  var resEm = '', resCab = '';
  if (ementa.length) {
    var cab = ementa[0], letras = cab.t.replace(/[^A-Za-zÀ-ÿ]/g, ''), maius = cab.t.replace(/[^A-ZÀ-Ý]/g, '');
    if (letras.length && maius.length / letras.length < 0.85) add('media', 'Ementa', 'MAN-CMT-032', 'Cabeçalho da ementa em caixa alta: ramo → classe → assunto → conclusão.', cab);
    if (cab.t.split(/\s+/).length > 70) add('baixa', 'Ementa', 'MAN-CMT-032', 'Cabeçalho longo: até três linhas, excepcionalmente quatro.', cab);
    resCab = resultadoDe(cab.t.split(/\.\s+/).slice(-3).join('. '));
    var SECS = [[/^I\.\s*caso em exame\.?$/i, 'I. CASO EM EXAME'], [/^II\.\s*quest[ãa]o em discuss[ãa]o\.?$/i, 'II. QUESTÃO EM DISCUSSÃO'], [/^III\.\s*raz[õo]es de decidir\.?$/i, 'III. RAZÕES DE DECIDIR'], [/^IV\.\s*dispositivo(?:\s+e\s+tese)?\.?$/i, 'IV. DISPOSITIVO']];
    var pos = SECS.map(function (s) { var k = -1; ementa.forEach(function (p, i) { if (k < 0 && s[0].test(p.t)) k = i; }); return k; });
    SECS.forEach(function (s, i) { if (pos[i] < 0) add('alta', 'Ementa', 'MAN-CMT-031', 'Falta a seção “' + s[1] + '” da ementa.', cab); });
    if (pos.every(function (x) { return x >= 0; }) && !(pos[0] < pos[1] && pos[1] < pos[2] && pos[2] < pos[3])) add('media', 'Ementa', 'MAN-CMT-031', 'Seções da ementa fora da ordem I → II → III → IV.', ementa[pos[0]]);
    pos.forEach(function (k) { if (k >= 0 && (ementa[k].neg || 0) < 0.5 && ementa[k].neg != null && ctx.formatacao !== false) add('baixa', 'Formatação', 'MAN-CMT-033', 'Título de seção da ementa em negrito.', ementa[k]); });
    /* numeração contínua */
    var n = 0, rod = -1;
    ementa.forEach(function (p, i) { if (rod < 0 && /^(Dispositivos relevantes citados|Jurisprud[êe]ncia relevante citada)/i.test(p.t)) rod = i; });
    var corpoEm = ementa.slice(1, rod < 0 ? ementa.length : rod);
    corpoEm.forEach(function (p) {
      var m = /^(\d+)\.\s/.exec(p.t); if (!m) return;
      var k = +m[1];
      if (k !== n + 1) add('media', 'Ementa', 'MAN-CMT-033', 'Numeração da ementa salta ou reinicia: veio ' + k + ' depois de ' + n + '. A numeração é contínua entre as seções.', p, 0, m[0].length);
      n = k;
      if (p.neg != null && p.neg === 0 && ctx.formatacao !== false) add('baixa', 'Formatação', 'MAN-CMT-033', 'Número do item da ementa em negrito.', p, 0, m[0].length);
    });
    if (pos[1] >= 0) {
      var q = ementa.slice(pos[1] + 1, pos[2] >= 0 ? pos[2] : undefined).map(function (p) { return p.t; }).join(' ');
      if (q && !/saber se/i.test(q)) add('baixa', 'Ementa', 'MAN-CMT-034', 'A questão em discussão é formulada com “saber se” (“A questão em discussão consiste em saber se …”).', ementa[pos[1] + 1] || ementa[pos[1]]);
    }
    if (pos[0] >= 0 && ementa[pos[0] + 1] && /^\d+\.\s+Trata-se de\b/.test(ementa[pos[0] + 1].t)) add('baixa', 'Ementa', 'MAN-CMT-031', '“I. Caso em exame” não começa com “Trata-se de”.', ementa[pos[0] + 1]);
    if (pos[3] >= 0) {
      var disE = ementa.slice(pos[3] + 1, rod < 0 ? undefined : rod);
      resEm = resultadoDe(disE.map(function (p) { return p.t; }).join(' '));
      if (/e\s+tese/i.test(ementa[pos[3]].t) && !disE.some(function (p) { return /tese de julgamento/i.test(p.t); })) add('media', 'Ementa', 'MAN-CMT-038', '“IV. DISPOSITIVO E TESE” sem tese de julgamento: o título é só “IV. DISPOSITIVO”.', ementa[pos[3]]);
    }
    ementa.forEach(function (p) {
      var m = /\bIDs?['’ʼ]?s?\s*\d{5,}/.exec(p.t); if (m) add('alta', 'Ementa', 'MAN-CMT-037', 'A ementa não cita ID de peça do PJe.', p, m.index, m.index + m[0].length);
      if ((p.recuo || 0) > 1 && ctx.formatacao !== false) add('media', 'Formatação', 'ementa-recuo', 'Ementa sem recuo de primeira linha (estilo “Parágrafo sem recuo”).', p);
    });
    var longasEm = 0;
    corpoEm.forEach(function (p) {
      if (/^(I|II|III|IV)\./.test(p.t)) return;
      frases(p.t.replace(/^\d+\.\s/, '')).forEach(function (f) {
        var w = f.split(/\s+/).length, v = (f.match(/,/g) || []).length;
        if ((w > 40 || v >= 5) && longasEm++ < 5) { var ini = p.t.indexOf(f.slice(0, 30)); add('baixa', 'Ementa', 'MAN-CMT-001', 'Frase da ementa com ' + w + ' palavras e ' + v + ' vírgulas: o padrão é até 40 palavras e menos de cinco vírgulas.', p, ini < 0 ? 0 : ini, ini < 0 ? 0 : ini + Math.min(f.length, 80)); }
      });
    });
    var temDisp = ementa.some(function (p) { return /^Dispositivos relevantes citados/i.test(p.t); }), temJur = ementa.some(function (p) { return /^Jurisprud[êe]ncia relevante citada/i.test(p.t); });
    if (!temDisp && !temJur) add('baixa', 'Ementa', 'MAN-CMT-036', 'Sem o rodapé “Dispositivos relevantes citados:” / “Jurisprudência relevante citada:”, em itálico.', ementa[ementa.length - 1]);
    ementa.forEach(function (p) {
      if (!/^Jurisprud[êe]ncia relevante citada/i.test(p.t)) return;
      var m = /\b(TNU|Turma Nacional de Uniformiza[çc][ãa]o)\b/.exec(p.t); if (m) add('media', 'Referências', 'MAN-CMT-011', 'Precedente da TNU não entra no rodapé de jurisprudência.', p, m.index, m.index + m[0].length);
      var o = ['STF', 'STJ', 'TRF-?3'].map(function (x) { var mm = new RegExp('\\b' + x + '\\b').exec(p.t); return mm ? mm.index : -1; }).filter(function (x) { return x >= 0; });
      for (var i = 1; i < o.length; i++) if (o[i] < o[i - 1]) { add('baixa', 'Referências', 'MAN-CMT-012', 'Ordem dos tribunais no rodapé: STF → STJ → TRF-3 → outros.', p); break; }
      if ((p.ita || 0) < 0.2 && p.ita != null && ctx.formatacao !== false) add('baixa', 'Formatação', 'MAN-CMT-036', 'Títulos do rodapé em itálico.', p, 0, 30);
    });
  }

  /* ---------- 3. resultado: dispositivo × ementa × cabeçalho × acórdão × prontuário ---------- */
  var dispV = P.voto.filter(function (p) { return /^Ante o exposto,/.test(p.t); }).concat(peca !== 'acordao' ? ps.filter(function (p) { return /^Ante o exposto,/.test(S(p.t)); }).map(function (p, k) { return Object.assign({ i: k }, p); }) : []);
  var resV = dispV.length ? resultadoDe(dispV[dispV.length - 1].t) : '';
  var resA = resultadoDe(P.acordao.map(function (p) { return p.t; }).join(' '));
  var rs = [['dispositivo do voto', resV], ['item IV da ementa', resEm], ['cabeçalho da ementa', resCab], ['acórdão', resA]].filter(function (x) { return x[1]; });
  for (var a = 1; a < rs.length; a++) if (rs[a][1] !== rs[0][1]) {
    add('alta', 'Resultado', 'resultado', 'Resultado divergente: ' + rs.map(function (x) { return x[0] + ' = ' + RES_TXT[x[1]]; }).join('; ') + '. O acórdão espelha o dispositivo.', dispV[dispV.length - 1] || null);
    break;
  }
  var pr = ctx.prontuario || null;
  var resP = pr ? resultadoProntuario(((pr.julgamento || {}).resultado) || '') : '';
  if (resP && rs.length && rs[0][1] !== resP) add('alta', 'Prontuário', 'resultado-prontuario', 'O ' + rs[0][0] + ' diz ' + RES_TXT[rs[0][1]] + ', mas o prontuário registra “' + pr.julgamento.resultado + '”. Não alterar o resultado em silêncio: confira com o Relator.', dispV[dispV.length - 1] || null);
  /* verbo do resultado pela classe */
  var classe = nz((ctx.classe || '') + ' ' + ((pr && pr.caso) ? (pr.caso.classe || '') + ' ' + (pr.caso.tipoManual || '') : ''));
  var ehED = /embargos de declara|\bed\b/.test(classe) || /^Trata-se de embargos de declara/i.test((P.relatorio[0] || {}).t || '');
  var ehMS = /mandado de seguran/.test(classe) && !/apela/.test(classe);
  dispV.forEach(function (p) {
    if (ehED && /provimento/i.test(p.t)) add('alta', 'Resultado', 'verbo-classe', 'Embargos de declaração são acolhidos ou rejeitados, não providos.', p);
    if (ehMS && /provimento|provid/i.test(p.t) && !/apela|remessa|agravo/i.test(p.t)) add('alta', 'Resultado', 'verbo-classe', 'Em mandado de segurança originário, a segurança é concedida ou denegada.', p);
  });
  /* honorários recursais */
  var txC = corpo.map(function (p) { return p.t; }).join('\n');
  var maj = /85,?\s*§\s*11/.exec(txC);
  if (maj && resV === 'provido') add('media', 'Resultado', 'Tema 1.059/STJ', 'Majoração do artigo 85, § 11, do CPC em recurso provido: só cabe em recurso desprovido ou não conhecido (Tema 1.059/STJ).', null);
  if (pr) {
    var hon = nz((pr.julgamento || {}).honorarios || '');
    if (/majorar/.test(hon) && !maj) add('media', 'Prontuário', 'honorarios-prontuario', 'O prontuário registra majoração dos honorários (artigo 85, § 11, do CPC), mas o voto não a traz.', dispV[0] || null);
    if (/sem honorarios/.test(hon) && maj) add('media', 'Prontuário', 'honorarios-prontuario', 'O voto majora honorários, mas o prontuário registra “Sem honorários recursais”.', null);
    var reg = pr.regularidade || {};
    if (maj && reg.ajg && !/98,?\s*§\s*3/.test(txC)) add('baixa', 'Prontuário', 'gratuidade', 'Prontuário registra justiça gratuita: “observada a gratuidade de justiça concedida (artigo 98, § 3º, do CPC)”.', null);
    var rtx = P.relatorio.map(function (p) { return p.t; }).join(' ');
    if (/^Com Parecer$/i.test(reg.mpfParecer || '') && P.relatorio.length && !/Procuradoria|Minist[ée]rio P[úu]blico/i.test(rtx)) add('media', 'Prontuário', 'MAN-CMT-018', 'O prontuário registra parecer do MPF, mas o relatório não o menciona (órgão e ID).', P.relatorio[P.relatorio.length - 1]);
    if (/^(Sem Parecer|N[ãa]o se Aplica)$/i.test(reg.mpfParecer || '') && /(Procuradoria|Minist[ée]rio P[úu]blico)[^.]{0,80}\bopinou\b/i.test(rtx)) add('media', 'Prontuário', 'MAN-CMT-020', 'O relatório diz que o MPF opinou, mas o prontuário registra “' + reg.mpfParecer + '”.', null);
  }

  /* ---------- 3b. o acórdão e a ementa espelham o objeto do dispositivo; o voto enfrenta as questões ---------- */
  if (peca === 'acordao' && dispV.length) {
    var objVr = objetoDe(dispV[dispV.length - 1].t), objAr = objetoDe(P.acordao.map(function (p) { return p.t; }).join(' ')), semV = function (x) { return nz(x).replace(/\b(dou|deu|dar|nego|negou|negar|conheco|conheceu|rejeito|rejeitou|acolho|acolheu|concedo|concedeu|denego|denegou|julgo|julgou|declaro|declarou)\b/g, '').replace(/\s+/g, ' ').trim(); }, objV = semV(objVr), objA = semV(objAr);
    if (objV && objA && objV.slice(0, 40) !== objA.slice(0, 40) && objV.indexOf(objA.slice(0, 25)) < 0 && objA.indexOf(objV.slice(0, 25)) < 0)
      add('alta', 'Resultado', 'objeto-acordao', 'O acórdão não espelha o dispositivo: o voto decide “' + objVr + '”, o acórdão “' + objAr + '”.', P.acordao[0] || null);
    var nApel = P.relatorio.filter(function (p) { return /^(Apelou|Apelaram|Recorreu|Agravou)\b/.test(p.t); }).length;
    if (objV && nApel >= 2 && !plural(objV) && /^(a|ao|à) (apelacao|recurso|agravo)\b/.test(objV.replace(/^à/, 'à')) && !/\bda?o?s?\s+(uniao|inss|autor|autora|re|reu|ré|impetrante|impetrad|caixa|cef|estado|municipio|fazenda|parte)/.test(objV))
      add('media', 'Resultado', 'objeto-plural', 'O relatório descreve ' + nApel + ' recursos, mas o dispositivo decide só “' + objVr + '”: diga qual recurso, ou decida cada um.', dispV[dispV.length - 1]);
    var Q = resV === 'naoconhecido' || resV === 'prejudicado' ? [] : (ctx.questoes || []).map(S).filter(Boolean), txVt = nz(P.voto.map(function (p) { return p.t; }).join(' '));
    Q.forEach(function (q) {
      var K = chaves(q); if (K.length < 2) return;
      var acha = K.filter(function (w) { return txVt.indexOf(w.slice(0, Math.max(6, w.length - 2))) >= 0; }).length;
      if (acha < 2 && acha / K.length < 0.34) add('baixa', 'Prontuário', 'questao-voto', 'Questão do prontuário sem enfrentamento aparente no voto: “' + q.slice(0, 140) + '”. Confira se foi apreciada (artigo 489, § 1º, IV, do CPC).', null);
    });
  }

  /* ---------- 4. IDʼs × peças do prontuário e do cartão ---------- */
  var conhecidos = {}, nConh = 0;
  function guarda(v) { String(v || '').replace(/\d{6,}/g, function (x) { if (!conhecidos[x]) { conhecidos[x] = 1; nConh++; } }); }
  if (pr) {
    (pr.pecas || []).forEach(function (x) { guarda(x.id); });
    (pr.recursos || []).forEach(function (x) { guarda(x.ids); guarda(x.contra && x.contra.ids); });
    guarda((pr.origem || {}).decisaoId); guarda((pr.regularidade || {}).procuracaoId); guarda((pr.regularidade || {}).mpfId);
    var rt = pr.recursoTipo || {}; ['edId', 'agintId', 'jrId', 'jrDevolucaoId', 'aiId'].forEach(function (k) { guarda(rt[k]); });
  }
  var c = ctx.cartao || null;
  if (c) {
    (c.pecas || []).forEach(function (x) { guarda(x.id); }); (c.recursos || []).forEach(function (x) { guarda(x.id); });
    guarda((c.orig || {}).id); guarda((c.mpfx || {}).id); ['ed', 'agint', 'jr', 'ai'].forEach(function (k) { guarda((c[k] || {}).id); });
    guarda(c.especificidades); guarda((c.rel || {}).razoes); guarda((c.rel || {}).contrarrazoes);
  }
  var citados = 0, AU = {}, nAu = 0;
  (ctx.autos || []).forEach(function (d) { if (d && d.id && !AU[d.id]) { AU[d.id] = d; nAu++; } });
  corpo.forEach(function (p) {
    if (citacao(p)) return;
    var re = /\bIDs?['’ʼ]?s?\s*(?:n[º°.]\s*)?((?:\d{6,}(?:\s*(?:,|e|;)\s*)?)+)/g, m;
    while ((m = re.exec(p.t))) {
      var base = m.index;
      m[1].replace(/\d{6,}/g, function (x, o) {
        citados++;
        var ini = base + m[0].indexOf(m[1]) + o;
        /* com os autos lidos: o ID existe? é a peça que o texto diz? */
        if (nAu) {
          var d = AU[x];
          if (!d) { add(ctx.autosTodos ? 'media' : 'baixa', 'Autos', 'ID-autos', 'ID ' + x + ' não está na cronologia ' + (ctx.autosTodos ? 'dos autos' : 'lida (leia a cronologia toda, em Autos, para conferir os documentos antigos)') + ': confira [VALIDAR].', p, ini, ini + x.length); return; }
          var cit = pecaCitada(p.t, base);
          if (cit && d.k && !cit.ok[d.k] && !NEUTRA[d.k] && !(cit.ok.sentenca && d.k === 'acordao' && /embargos|agravo interno/.test(classe)))
            add('alta', 'Autos', 'ID-peca', 'O texto cita o ID ' + x + ' como ' + cit.rot + ', mas nos autos ele é “' + d.tipo + (d.desc && nz(d.desc) !== nz(d.tipo) ? ' — ' + d.desc : '') + '” (' + (d.data || 'sem data') + '). Confira [VALIDAR].', p, ini, ini + x.length);
          return;
        }
        if (nConh && !conhecidos[x]) add('media', 'Prontuário', 'ID-prontuario', 'ID ' + x + ' não consta das peças do prontuário nem do cartão: confira nos autos [VALIDAR].', p, ini, ini + x.length);
      });
    }
  });
  if (citados && !nConh && !nAu && (pr || c)) add('baixa', 'Prontuário', 'ID-prontuario', 'O prontuário não tem peças com ID registradas: os ' + citados + ' IDʼs da minuta não foram conferidos.', null);

  /* ---------- 5. pendências deixadas no texto ---------- */
  todos.forEach(function (p) {
    var re = /\{\{[^}]*\}\}|\[(?:PREENCHER|VALIDAR)[^\]]*\]|\[(?:DATA|ID|VALOR|NOME|N|F)\]|\bXXX+\b/g, m;
    while ((m = re.exec(p.t))) add('alta', 'Pendências', 'pendencia', /VALIDAR/.test(m[0]) ? 'Marca [VALIDAR] ainda no texto: depende do Relator ou dos autos.' : 'Trecho a preencher ainda no texto.', p, m.index, m.index + m[0].length);
  });

  /* ---------- 6. redação: Compendium, Manual e lista de caça (fora das transcrições) ---------- */
  function regra(rx, flags) { try { return new RegExp(rx, (flags || '').replace(/[^gimsuy]/g, '').replace(/g/g, '') + 'g'); } catch (e) { return null; } }
  var marcados = {};   /* o mesmo trecho apontado por duas regras de redação aparece uma vez (vale a primeira) */
  function aplica(lista, alvo, grupo, sev, cod, msg, sug, filtro) {
    var re = regra(lista, alvo.flags); if (!re) return;
    alvo.ps.forEach(function (p) {
      if (citacao(p)) return;
      re.lastIndex = 0; var m, k = 0;
      while ((m = re.exec(p.t)) && k++ < 20) {
        if (!m[0]) { re.lastIndex++; continue; }
        if (entreAspas(p.t, m.index)) continue;
        if (filtro && !filtro(p.t, m)) continue;
        var mk = p.i + ':' + m.index; if (marcados[mk]) continue; marcados[mk] = 1;
        add(sev, grupo, cod, msg, p, m.index, m.index + m[0].length, sug);
      }
    });
  }
  var escopo = { ementa: ementa, voto: corpo, '': todos };
  /* siglas STF/STJ no corpo: valem em "Tema 1.075/STF", "Súmula 7/STJ" e nas referências entre parênteses */
  function filtroSigla(t, m) { var a = t.charAt(m.index - 1); if (a === '/' || a === '-') return false; var antes = t.slice(Math.max(0, m.index - 80), m.index); return !/\(([^)]*)$/.test(antes) && !/\bRel\.\s/.test(t.slice(m.index, m.index + 40)); }
  (ctx.diretrizes || []).forEach(function (d) {
    if (d.id === 'red-alv-14' || d.id === 'red-alv-15') return; /* cobertos pelas pendências e pelo vocativo */
    var ps2 = escopo[d.escopo || ''] || todos;
    if (!ps2.length) return;
    aplica(d.padrao, { ps: ps2, flags: d.flags }, d.tipo === 'correcao' ? 'Redação' : (d.escopo === 'ementa' ? 'Ementa' : 'Redação'), d.tipo === 'correcao' ? 'media' : 'media', d.id,
      d.msg || ('Use “' + d.subst + '”.'), d.subst != null ? (d.subst || 'suprimir') : '', d.id === 'red-alv-02' ? filtroSigla : null);
  });
  (ctx.manual || []).forEach(function (d) {
    if (!d.padrao) return;
    aplica(d.padrao, { ps: todos, flags: d.flags }, d.id === 'MAN-CMT-116' ? 'Referências' : 'Redação', 'baixa', d.id, d.orientacao || d.titulo, '', null);
  });
  CACA.forEach(function (r) {
    var flags = /^\^/.test(r.re) ? '' : 'i';
    if (/\[A-ZÀ-Ý\]\{4,\}/.test(r.re)) flags = '';
    aplica(r.re, { ps: r.nome === 'enumeração fora do padrão' ? corpo : todos, flags: flags }, 'Redação', r.nome === 'colocação pronominal (próclise)' || r.nome === 'pontuação' ? 'media' : 'baixa', 'caça', 'Lista de caça · ' + r.nome + '.', r.sug, null);
  });
  /* palavra repetida em seguida ("limitação limitação") */
  todos.forEach(function (p) {
    if (citacao(p)) return;
    var re = /\b([A-Za-zÀ-ÿ]{3,})\s+\1\b/gi, m;
    while ((m = re.exec(p.t))) add('media', 'Redação', 'caça', 'Lista de caça · palavra repetida.', p, m.index, m.index + m[0].length, m[1]);
  });
  /* frases longas no corpo (Manual, regra 1) */
  var longas = 0;
  corpo.forEach(function (p) {
    if (citacao(p) || longas >= 6) return;
    frases(p.t).forEach(function (f) {
      if (longas >= 6) return;
      var w = f.split(/\s+/).length;
      if (w > 60) { longas++; var ini = p.t.indexOf(f.slice(0, 30)); add('baixa', 'Redação', 'MAN-CMT-001', 'Frase com ' + w + ' palavras: uma ideia por frase; avalie dividir.', p, ini < 0 ? 0 : ini, ini < 0 ? 0 : ini + Math.min(f.length, 90)); }
    });
  });
  /* transcrição entre aspas sem itálico (Manual, regra 9) */
  if (ctx.formatacao !== false) todos.forEach(function (p) {
    var t = S(p.t);
    if (p.ita != null && /^[“"]/.test(t) && /[”"](\s*\(g\.n\.\))?[.;:]?$/.test(t) && t.length > 60 && (p.ita || 0) < 0.5) add('baixa', 'Formatação', 'MAN-CMT-009', 'Transcrição em parágrafo próprio, entre aspas e em itálico.', p, 0, 1);
  });

  itens.sort(function (x, y) { return (SEV[y.sev] - SEV[x.sev]) || ((x.par == null ? -1 : x.par) - (y.par == null ? -1 : y.par)); });
  var resumo = { alta: 0, media: 0, baixa: 0 };
  itens.forEach(function (x) { resumo[x.sev]++; });
  var nota = Math.max(0, 100 - 12 * resumo.alta - 4 * resumo.media - Math.min(20, resumo.baixa));
  return { peca: peca, itens: itens, resumo: resumo, nota: nota, resultado: resV || resEm || resA || '', partes: { relatorio: P.relatorio.length, voto: P.voto.length, ementa: P.ementa.length, acordao: P.acordao.length } };
}
var API = { analisar: analisar, cabecalhoPje: cabecalhoPje, resultadoDe: resultadoDe, resultadoProntuario: resultadoProntuario, partes: partes, RES_TXT: RES_TXT, CACA: CACA };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else raiz.MutaConformidadeMotor = API;
})(typeof window !== 'undefined' ? window : this);
