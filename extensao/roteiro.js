/* Muta · Prontuário › Roteiro (0.13)
   Modo alternativo da triagem: os passos de conferência do tipo de julgamento (Padrão Muta 2 — roteiro-mestre e roteiros
   por espécie), na ordem em que se triagem o processo. Cada passo mostra só os campos da ficha que lhe dizem respeito
   (os mesmos do modo Triagem: o que se grava num aparece no outro) e um estado:
     ✓ conferido · ! alerta · ○ a conferir · — não se aplica.
   O estado sai dos campos (ex.: Tempestividade = Tempestivo) e dos alertas da leitura dos autos; passo sem campo na ficha
   tem "Conferi", guardado só neste navegador.
   O tipo vem da espécie, do tipo de julgamento, da classe e da tarefa do PJe; os botões no topo trocam ou somam tipos. */
(function () {
  'use strict';
  var S = function (v) { return v == null ? '' : String(v).trim(); };
  var N = function (v) { return S(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
  var esc = function (s) { return S(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var TIPOS = [['ap', 'Apelação'], ['rn', 'Remessa necessária'], ['ai', 'Agravo de instrumento'], ['ms', 'Mandado de segurança'], ['ed', 'Embargos de declaração'], ['agint', 'Agravo interno'], ['ret', 'Juízo de retratação']];
  var FASES = [['rec', 'Recurso'], ['adm', 'Admissibilidade'], ['mp', 'Ministério Público'], ['pre', 'Preliminares e prejudiciais'], ['mer', 'Mérito'], ['enc', 'Encaminhamento']];
  var OK_PREPARO = /^(comprovado|justica gratuita|isento|assistencia da dpu|nao se aplica)/, AL_PREPARO = /^(recolhido sem comprovante|recolhido a menor|recolhido apos|nao recolhido)/;

  /* passos: tipos ('*' = todos), campos [seção, chave, rótulo?, condição?], estado(ctx) e dica curta do Padrão Muta */
  /* campos de documento (moram em Autos › Peças e documentos): no Roteiro, só indicação quando já preenchidos; vazios, preenchíveis aqui */
  var DOC_RT = { 'origem.Sentença - ID': 1, 'origem.Sentença - Data': 1, 'origem.Sentença - Resultado': 1, 'triagem.Impugnada - ID': 1, 'triagem.Impugnada - Data': 1, 'triagem.Impugnada - Síntese': 1,
    'triagem.Impugnada - Órgão': 1, 'triagem.Impugnada - Relator': 1, 'triagem.ID do Parecer MPF': 1, 'triagem.MPF - Data': 1, 'triagem.Parecer - Sentido': 1, 'triagem.Parecer - Sentido (outro)': 1,
    'triagem.MPF - Info adicional': 1, 'triagem.ID da Procuração': 1, 'triagem.Procurações': 1, 'producao.Acórdão - ID': 1 };
  var PASSOS = [
    { id: 'decisao', f: 'rec', t: 'Decisão recorrida identificada', tipos: ['ap', 'rn', 'ms'],
      campos: [['origem', 'Sentença - ID', 'ID da sentença'], ['origem', 'Sentença - Data', 'Data da sentença'], ['origem', 'Sentença - Resultado', 'Resultado']],
      estado: function (c) { return c.v('origem', 'Sentença - ID') ? 'ok' : 'pend'; },
      dica: 'O fundamento decisivo da sentença é o alvo do recurso e a régua da dialeticidade.' },
    { id: 'impugnada', f: 'rec', t: 'Decisão impugnada identificada', tipos: ['ai', 'agint', 'ed', 'ret'],
      campos: [['triagem', 'Impugnada - ID', 'ID'], ['triagem', 'Impugnada - Data', 'Data'], ['triagem', 'Impugnada - Síntese', 'Síntese / ementa']],
      mais: [['triagem', 'Padrão - Espécie', 'Espécie'], ['triagem', 'Impugnada - Órgão', 'Órgão julgador'], ['triagem', 'Impugnada - Relator', 'Relator(a)']],
      estado: function (c) { return c.v('triagem', 'Impugnada - ID') ? 'ok' : 'pend'; },
      dica: 'ED: transcrever a ementa embargada no relatório. AgInt: indicar a decisão agravada e o recurso de origem.' },
    { id: 'prolator', f: 'rec', t: 'Decisão da Turma Regional de MS?', tipos: ['ed', 'agint'],
      campos: [['triagem', 'Impugnada - Órgão', 'Órgão julgador'], ['triagem', 'Impugnada - Relator', 'Relator(a)']],
      estado: function (c) { var o = N(c.v('triagem', 'Impugnada - Órgão')); if (c.alerta(/orgao prolator|outra turma/)) return 'al'; if (!o) return 'pend'; return /regional|mato grosso do sul|trgms/.test(o) ? 'ok' : 'al'; },
      dica: 'Acórdão ou decisão de outra Turma, anterior à redistribuição, volta ao órgão prolator. Conferir a certidão de julgamento antes de minutar (orientação do Relator, 19/11/2026).' },
    { id: 'tempest', f: 'adm', t: 'Tempestividade', tipos: '*', nao: ['rn'],
      campos: [['triagem', 'Tempestividade'], ['triagem', 'Tempest - Publicação', 'Intimação / publicação', 'calc'], ['triagem', 'Tempest - Protocolo', 'Protocolo', 'calc'], ['triagem', 'Tempest - Prazo legal', 'Prazo (dias úteis)', 'calc'], ['triagem', 'Tempest - Dobro', 'Contagem', 'calc'], ['triagem', 'Tempest - Suspensões', 'Suspensões', 'calc']],
      estado: function (c) { var v = N(c.v('triagem', 'Tempestividade')); return /^tempestivo|^nao se aplica/.test(v) ? 'ok' : /^intempestivo/.test(v) ? 'al' : 'pend'; },
      dica: function (c) { return 'Dias úteis (artigo 219 do CPC), em dobro para a Fazenda (artigo 183). ' + (c.tem('ed') ? 'ED: 5 dias.' : c.tem('ai') || c.tem('agint') ? 'AI e AgInt: 15 dias.' : 'Apelação: 15 dias.'); } },
    { id: 'preparo', f: 'adm', t: 'Preparo', tipos: ['ap', 'ai', 'ms'],
      campos: [['triagem', 'Preparo'], ['triagem', 'AJG', 'Gratuidade (AJG)', function (c) { return /gratuit/.test(N(c.v('triagem', 'Preparo'))); }]],
      estado: function (c) { var v = N(c.v('triagem', 'Preparo')); return OK_PREPARO.test(v) ? 'ok' : AL_PREPARO.test(v) ? 'al' : 'pend'; },
      dica: 'Pix ou cartão só com o comprovante do Tesouro (PagTesouro, "Pagamento realizado com sucesso"); comprovante do banco não basta: intimar uma vez (artigo 1.007, § 4º, do CPC).' },
    { id: 'repres', f: 'adm', t: 'Representação processual', tipos: '*', nao: ['rn'],
      campos: [['triagem', 'Representação'], ['triagem', 'ID da Procuração', 'ID da procuração', function (c) { return !/^dispensada/.test(N(c.v('triagem', 'Representação'))); }]],
      mais: [['triagem', 'DPU (controle)', 'DPU'], ['triagem', 'Procurações'], ['triagem', 'Observação da Representação', 'Observação da representação'], ['triagem', 'Impedimento / Suspeição', 'Impedimento ou suspeição'], ['triagem', 'Observação do Impedimento', 'Observação do impedimento'], ['triagem', 'Regularidade'], ['triagem', 'Regularidade Manual', 'Regularidade · observação']],
      estado: function (c) { var v = N(c.v('triagem', 'Representação')); return /^regular|^dispensada/.test(v) ? 'ok' : /^irregular/.test(v) ? 'al' : 'pend'; } },
    { id: 'reexame', f: 'adm', t: 'Sentença sujeita ao reexame?', tipos: ['rn'],
      campos: [['origem', 'Sentença - Reexame', 'Remessa necessária']],
      estado: function (c) { var v = N(c.v('origem', 'Sentença - Reexame')); return v === 'sim' ? 'ok' : /dispensada|nao/.test(v) ? 'al' : 'pend'; },
      dica: 'Hipóteses e dispensas do artigo 496 do CPC; previdenciário abaixo do limite do § 3º, I: dispensada (Tema 1.081/STJ). Sem agravar a Fazenda (Súmula 45/STJ).' },
    { id: 'cabimento', f: 'adm', t: 'Cabimento e instrução do agravo', tipos: ['ai'], manual: true,
      dica: 'Rol do artigo 1.015 do CPC ou urgência (taxatividade mitigada, Tema 988/STJ); peças do artigo 1.017.' },
    { id: 'vicios', f: 'adm', t: 'Vícios apontados nos embargos', tipos: ['ed'],
      campos: [['triagem', 'ED - Vício', 'Vício(s) apontado(s)'], ['triagem', 'ED - Ponto', 'Ponto dos embargos']],
      mais: [['producao', 'Acórdão - ID', 'ID do acórdão embargado'], ['producao', 'Acórdão - Assinado', 'Acórdão assinado'], ['producao', 'Acórdão - Publicado', 'Acórdão publicado'], ['producao', 'Acórdão - Data da publicação', 'Data da publicação'], ['producao', 'Acórdão - ED opostos', 'Embargos opostos'], ['producao', 'Acórdão - Trânsito', 'Trânsito em julgado']],
      estado: function (c) { return c.v('triagem', 'ED - Vício') ? 'ok' : 'pend'; },
      dica: 'Omissão, contradição, obscuridade ou erro material (artigo 1.022 do CPC). Rediscussão do mérito não é omissão.' },
    { id: 'impug', f: 'adm', t: 'Impugnação específica da decisão agravada', tipos: ['agint'],
      campos: [['triagem', 'AgInt - Fundamentos', 'Fundamentos do agravo interno']],
      estado: function (c) { return c.v('triagem', 'AgInt - Fundamentos') ? 'ok' : 'pend'; },
      dica: 'Artigo 1.021, § 1º, do CPC; Súmula 182/STJ. Distinção genérica atrai a multa de 1% (Tema 1.201/STJ).' },
    { id: 'dialet', f: 'adm', t: 'Dialeticidade e inovação recursal', tipos: ['ap', 'ai', 'ms'], manual: true,
      dica: 'As razões enfrentam o fundamento da decisão (artigo 1.010, II e III, do CPC)? Matéria nova não se conhece (artigo 1.014).' },
    { id: 'mpf', f: 'mp', t: 'Ministério Público Federal', tipos: '*',
      campos: [['triagem', 'MPF', 'Parecer'], ['triagem', 'MPF - Custos Legis', 'Hipótese de intervenção', function (c) { return !/^com parecer/.test(N(c.v('triagem', 'MPF'))) || !!c.v('triagem', 'MPF - Custos Legis'); }],
        ['triagem', 'ID do Parecer MPF', 'ID do parecer', function (c) { return /^com parecer/.test(N(c.v('triagem', 'MPF'))); }], ['triagem', 'Parecer - Sentido', 'Sentido', function (c) { return /^com parecer/.test(N(c.v('triagem', 'MPF'))); }]],
      mais: [['triagem', 'MPF - Data', 'Data do parecer'], ['triagem', 'MPF - Info adicional', 'Fundamentos do parecer'], ['triagem', 'Parecer - Sentido (outro)', 'Conclusão (texto)'], ['triagem', 'Observação MPF', 'Observação']],
      estado: function (c) { var v = N(c.v('triagem', 'MPF'));
        if (c.tem('ms') && !/^com parecer|^intimado sem manifestacao/.test(v)) return v ? 'al' : 'pend';
        if (c.alerta(/mpf|idos/) && !/^com parecer|^intimado/.test(v)) return 'al';
        return /^com parecer|^intimado sem manifestacao|^nao se aplica/.test(v) ? 'ok' : /^vista a abrir/.test(v) ? 'al' : 'pend'; },
      dica: function (c) { return c.tem('ms') ? 'Mandado de segurança sem vista ao MPF no 2º grau não vai a julgamento; "intimado sem manifestação" só com a intimação comprovada no 2º grau (orientação do Relator, 20/11/2026).' : 'Intervenção obrigatória: incapaz, idoso em risco, indígenas, litígio coletivo pela posse, interesse público (artigo 178 do CPC).'; } },
    { id: 'contra', f: 'pre', t: 'Contrarrazões e preliminares', tipos: '*', nao: ['rn'],
      campos: [['origem', 'Contrarrazões - Situação', 'Contrarrazões'], ['triagem', 'Prelim.', 'Preliminares'], ['triagem', 'Descrição da Preliminar', 'Descrição da preliminar', function (c) { return !/^sem preliminares/.test(N(c.v('triagem', 'Prelim.'))) && !!c.v('triagem', 'Prelim.'); }]],
      estado: function (c) { var p = N(c.v('triagem', 'Prelim.')); if (!p) return c.alerta(/contrarraz.*preliminar/) ? 'al' : 'pend'; return /^ha preliminares|^preliminar de oficio/.test(p) && !c.v('triagem', 'Descrição da Preliminar') ? 'pend' : 'ok'; },
      dica: 'Legitimidade, interesse, competência e prescrição antes do mérito; interlocutórias não agraváveis vêm em preliminar (artigo 1.009, § 1º).' },
    { id: 'tema', f: 'pre', t: 'Tema afetado manda suspender este grau?', tipos: '*', manual: true,
      campos: [['controles', 'Sobrestamento - Tema', 'Tema ou precedente']],
      dica: 'Ler o alcance da ordem de suspensão: muitas alcançam só REsp e AREsp na Vice-Presidência ou no STJ.' },
    { id: 'efeito', f: 'pre', t: 'Efeito suspensivo ou tutela recursal; sentença superveniente', tipos: ['ai'], manual: true,
      dica: 'Probabilidade do direito e perigo de dano (artigos 300 e 1.019, I). Sentença superveniente: perda do objeto.' },
    { id: 'infring', f: 'pre', t: 'Efeitos infringentes pedidos?', tipos: ['ed'], manual: true,
      dica: 'Se o acolhimento puder modificar o julgado, intimar o embargado antes (artigo 1.023, § 2º, do CPC).' },
    { id: 'retrat', f: 'pre', t: 'Precedente que motivou a devolução', tipos: ['ret'],
      campos: [['triagem', 'Retratação - Tribunal', 'Tribunal'], ['triagem', 'Retratação - Tema', 'Tema'], ['triagem', 'Retratação - Precedente', 'Precedente'], ['triagem', 'Retratação - Devolução ID', 'ID da devolução'], ['triagem', 'Retratação - Síntese', 'Síntese']],
      mais: [['triagem', 'Retratação - Devolução órgão', 'Órgão da devolução'], ['triagem', 'Retratação - Devolução mês', 'Mês da devolução'], ['triagem', 'Retratação - ED', 'Resultado dos embargos'], ['triagem', 'Retratação - ED IDs', 'IDs dos embargos'], ['triagem', 'Retratação - ED data', 'Data dos embargos']],
      estado: function (c) { return c.v('triagem', 'Retratação - Tema') || c.v('triagem', 'Retratação - Precedente') ? 'ok' : 'pend'; } },
    { id: 'materia', f: 'mer', t: 'Matéria e questões em discussão', tipos: '*',
      campos: [['triagem', 'Tema', 'Tipo de caso'], ['triagem', 'Especificidades']],
      questoes: true,
      mais: [['triagem', 'Síntese Fática', 'Síntese fática'], ['triagem', 'COMPLEXIDADE', 'Complexidade'], ['triagem', 'Tipo de Voto', 'Tipo de voto'], ['triagem', 'Mídias'], ['triagem', 'Seleção Prévia', 'Seleção prévia']],
      estado: function (c) { return c.v('triagem', 'Tema') && c.v('triagem', 'Alegações') ? 'ok' : 'pend'; },
      dica: 'Uma frase por questão, na ordem em que o voto vai enfrentá-las.' },
    { id: 'destino', f: 'enc', t: 'Destino do julgamento', tipos: '*',
      campos: [['producao', 'Destino', 'Destino'], ['producao', 'Destino - Situação', 'Situação para julgar'],
        ['triagem', 'Hipóteses Monocrática', 'Hipótese do artigo 932', function (c) { return N(c.v('producao', 'Destino')) === 'monocratica'; }],
        ['triagem', 'O que falta sanar', 'Pendências', function (c) { return N(c.v('producao', 'Destino - Situação')) === 'pendente' || !!c.v('triagem', 'O que falta sanar'); }]],
      mais: [['producao', 'Destino - Outro', 'Outro destino'], ['triagem', 'Destino - Confirmado em', 'Confirmado em'], ['triagem', 'Destino - Confirmado por', 'Confirmado por']],
      estado: function (c) { var d = c.v('producao', 'Destino'), s = N(c.v('producao', 'Destino - Situação')); if (!d) return 'pend'; return s === 'pendente' ? 'al' : s ? 'ok' : 'pend'; },
      dica: function (c) { return c.tem('ms') ? 'Mandado de segurança: sem honorários (Súmula 512/STF; artigo 25 da Lei 12.016/2009).' : 'Monocrática: indicar o inciso do artigo 932 do CPC e o precedente que autoriza.'; } },
    { id: 'etiquetas', f: 'enc', t: 'Etiquetas', tipos: '*', extra: 'etiquetas',
      campos: [['triagem', 'Etiquetas', 'Etiquetas do gabinete']],
      estado: function (c) { return c.v('triagem', 'Etiquetas') || c.v('triagem', 'Etiquetas sugeridas') ? 'ok' : 'pend'; },
      dica: 'As sugeridas seguem as regras do Caput; "Copiar" leva ao PJe.' }
  ];
  /* alertas da leitura dos autos: cada um no passo a que se refere */
  var AL_PASSO = [[/orgao prolator|outra turma/, 'prolator'], [/contrarraz/, 'contra'], [/gratuidade|pix|tesouro|preparo/, 'preparo'], [/remessa necessaria/, 'reexame'], [/mpf|ministerio publico|idos/, 'mpf'], [/procura/, 'repres'], [/tempest|prazo/, 'tempest']];

  /* ---------- tipo de julgamento ---------- */
  var R = { cnj: '', tipos: null, aberto: {} };
  function chaveLocal(cnj) { return 'muta-pje:roteiro:' + String(cnj || '').replace(/\D/g, ''); }
  function lerLocal(cnj) { try { return JSON.parse(localStorage.getItem(chaveLocal(cnj)) || '{}'); } catch (e) { return {}; } }
  function gravarLocal(cnj, o) { try { localStorage.setItem(chaveLocal(cnj), JSON.stringify(o)); } catch (e) {} }

  function detectar(g) {
    var esp = N(g.V('triagem', 'Padrão - Espécie')), tj = N(g.V('triagem', 'Tipo de Julgamento')),
      cl = N([g.F('classe_judicial'), g.F('Classe'), window.MutaPje && window.MutaPje.classe ? window.MutaPje.classe() : ''].join(' ')),
      tf = N(window.MutaPje && window.MutaPje.tarefa ? window.MutaPje.tarefa() : g.F('tarefa_atual')),
      ass = N(g.F('Assunto')) + ' ' + N(g.V('triagem', 'MPF - Custos Legis')), t = {};
    if (/embargos de declaracao/.test(esp + ' ' + tj) || /embargos de declara/.test(tf)) t.ed = 1;
    if (/agravo interno/.test(esp + ' ' + tj) || /agint/.test(cl)) t.agint = 1;
    if (/retratacao/.test(esp + ' ' + tj) || /retratac/.test(tf)) t.ret = 1;
    if (!t.ed && !t.agint && !t.ret) {
      if (/agravo de instrumento|(^|\W)ai(\W|$)/.test(cl + ' ' + tj)) t.ai = 1;
      if (/apelacao|apciv|apremnec|(^|\W)ap(\W|$)/.test(cl + ' ' + tj)) t.ap = 1;
      if (/remessa necessaria|remnec|reexame/.test(cl + ' ' + tj) || N(g.V('origem', 'Sentença - Reexame')) === 'sim') t.rn = 1;
    }
    if (/mandado de seguranca|mscivcol|msciv/.test(cl + ' ' + ass)) t.ms = 1;
    if (!Object.keys(t).length) t.ap = 1;
    return t;
  }
  function tipos(g, cnj) {
    if (R.cnj !== cnj) { R.cnj = cnj; R.tipos = null; R.aberto = {}; }
    var loc = lerLocal(cnj);
    return loc._tipos ? loc._tipos.reduce(function (o, k) { o[k] = 1; return o; }, {}) : detectar(g);
  }

  /* ---------- desenho ---------- */
  var ICO = { ok: '✓', al: '!', pend: '', na: '–' }, ROT = { ok: 'conferido', al: 'alerta', pend: 'a conferir' };
  function html(g, campoRot, questoesHtml, X) {
    X = X || {};
    var mostrados = {};
    var cnj = g.cnj(), T = tipos(g, cnj), loc = lerLocal(cnj), AU = window.MutaAutos;
    var SG = AU && AU.sugestoes ? AU.sugestoes() : [], usados = [];
    /* sugestão da leitura dos autos para o campo, quando difere do que está na ficha */
    var comSug = function (c) {
      var alvo = c[0] + '.' + c[1], k = -1;
      /* 0.44: informação de documento já localizada fica em Autos › Peças e documentos; aqui, só a indicação */
      if (DOC_RT[alvo] && !mostrados[alvo]) { var vd = g.V(c[0], c[1]), tem = Array.isArray(vd) ? vd.length : S(vd);
        if (tem) { mostrados[alvo] = 1; var tx = Array.isArray(vd) ? vd.length + (vd.length === 1 ? ' linha' : ' linhas') : S(vd); if (/^\d{4}-\d{2}-\d{2}$/.test(tx)) tx = tx.split('-').reverse().join('/');
          return '<div class="gf rt-doc' + (tx.length > 60 ? ' w' : '') + '"><span class="gl">' + esc(c[2] || c[1]) + ' <button type="button" class="lnk" data-aba="Autos" title="Editar em Autos › Peças e documentos">em Autos</button></span><span class="ro">' + esc(tx.slice(0, 300)) + '</span></div>'; } }
      SG.forEach(function (it, i) { if (k < 0 && it.alvo === alvo && it.status !== 'igual' && it.kind !== 'tabela' && S(it.value)) k = i; });
      if (mostrados[alvo]) return ''; mostrados[alvo] = 1;
      var h = campoRot(c[0], c[1], c[2]); if (k < 0) return h;
      if (usados.indexOf(k) < 0) usados.push(k);
      var v = S(SG[k].value); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) v = v.split('-').reverse().join('/');
      return h + '<div class="rt-s"><span>Autos' + (SG[k].doc ? ' (ID ' + esc(SG[k].doc) + ')' : '') + ':</span> <b>' + esc(v.slice(0, 140)) + '</b><button type="button" class="btn line sm" data-rt="u:' + k + '">Usar</button></div>';
    };
    var als = AU && AU.estado().itens ? AU.alertas() : [];
    var ctx = { v: function (s, k) { var x = g.V(s, k); return Array.isArray(x) ? (x.length ? 'tabela' : '') : S(x); }, tem: function (k) { return !!T[k]; },
      alerta: function (re) { return als.some(function (a) { return a.nivel === 'al' && re.test(N(a.t)); }); } };
    var ativos = Object.keys(T);
    var vale = function (p) {
      if (p.tipos !== '*' && !p.tipos.some(function (k) { return T[k]; })) return false;
      return !(p.nao && ativos.every(function (k) { return p.nao.indexOf(k) >= 0; }));
    };
    var L = PASSOS.filter(vale).map(function (p) {
      var st = p.manual ? (loc[p.id] ? 'ok' : 'pend') : p.estado(ctx);
      if (p.manual && p.estado) { var e2 = p.estado(ctx); if (e2 === 'al') st = 'al'; }
      return { p: p, st: st };
    });
    var n = { ok: 0, al: 0, pend: 0 }; L.forEach(function (x) { n[x.st]++; });
    var visiveis_ = {}; L.forEach(function (x) { visiveis_[x.p.id] = 1; });
    var alPasso = {}, alTopo = [];
    als.forEach(function (a, i) { if (/^Tipo de julgamento:/.test(a.t)) return; var t = N(a.t), dest = null;
      AL_PASSO.some(function (q) { if (q[0].test(t) && visiveis_[q[1]]) { dest = q[1]; return true; } return false; });
      (dest ? (alPasso[dest] = alPasso[dest] || []) : alTopo).push([a, i]); });
    var alHtml = function (x) { var a = x[0]; return '<div class="al-i ' + a.nivel + '"><span>' + esc(a.t) + '</span>' + (a.campo ? '<button type="button" class="btn line sm" data-au="al:' + x[1] + '">Gravar “' + esc(a.valor) + '”</button>' : '') + '</div>'; };
    var pct = L.length ? Math.round(100 * n.ok / L.length) : 0;
    var h = '@@TOPO@@';
    var topo = '<section class="card rt-top"><div class="rt-tt"><b>Roteiro de triagem</b><span class="rt-n">' + n.ok + '/' + L.length + '</span>' +
      (n.al ? '<span class="rt-al">' + n.al + ' alerta' + (n.al > 1 ? 's' : '') + '</span>' : '') + '</div>' +
      '<div class="rt-bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="rt-tipos" role="group" aria-label="Tipo de julgamento">' + TIPOS.map(function (x) { return '<button type="button" class="chip' + (T[x[0]] ? ' on' : '') + '" data-rt="t:' + x[0] + '" aria-pressed="' + !!T[x[0]] + '">' + esc(x[1]) + '</button>'; }).join('') +
      (loc._tipos ? '<button type="button" class="lnk" data-rt="auto" title="Volta ao tipo identificado pela classe, espécie e tarefa">automático</button>' : '') + '</div>' + (X.barra || '') + (alTopo.length ? '<div class="al-l rt-alt">' + alTopo.map(alHtml).join('') + '</div>' : '') + '@@USAR@@</section>';
    h += '<ol class="rt">';
    FASES.forEach(function (f) {
      var F = L.filter(function (x) { return x.p.f === f[0]; }); if (!F.length) return;
      h += '<li class="rt-f"><span>' + esc(f[1]) + '</span></li>';
      F.forEach(function (x) {
        var p = x.p, ab = R.aberto[p.id] != null ? R.aberto[p.id] : x.st !== 'ok';
        var cs = (p.campos || []).filter(function (c) { return typeof c[3] !== 'function' || c[3](ctx); });
        var visiveis = cs.filter(function (c) { return c[3] !== 'calc'; }), calc = cs.filter(function (c) { return c[3] === 'calc'; });
        var resumo = visiveis.map(function (c) { var v = ctx.v(c[0], c[1]); return v ? (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('/') : v) : ''; }).filter(Boolean).join(' · ');
        var dica = typeof p.dica === 'function' ? p.dica(ctx) : p.dica;
        var AP = alPasso[p.id] || [];
        var AU0 = window.MutaAutos, doAuto = AU0 && AU0.preenchido && cs.concat(p.mais || []).some(function (c) { return AU0.preenchido(c[0] + '.' + c[1]); });
        h += '<li class="rt-p is-' + x.st + (ab ? ' ab' : '') + '"><span class="rt-i" aria-label="' + ROT[x.st] + '">' + ICO[x.st] + '</span><div class="rt-c">' +
          '<button type="button" class="rt-h" data-rt="a:' + p.id + '" aria-expanded="' + ab + '"><b>' + esc(p.t) + (AP.length ? ' <i class="rt-av">' + AP.length + ' aviso' + (AP.length > 1 ? 's' : '') + '</i>' : '') + (doAuto ? ' <i class="au-tag" title="Preenchido pela leitura dos autos: confira">autos</i>' : '') + '</b>' + (!ab && resumo ? '<small>' + esc(resumo.slice(0, 120)) + '</small>' : '') + '</button>';
        if (ab) {
          var mais = (p.mais || []).map(comSug).filter(Boolean);
          h += '<div class="rt-b">' + (AP.length ? '<div class="al-l">' + AP.map(alHtml).join('') + '</div>' : '') + (visiveis.length ? '<div class="gr">' + visiveis.map(comSug).join('') + '</div>' : '') +
            (p.questoes && questoesHtml ? questoesHtml() : '') +
            (calc.length ? '<details class="rt-calc"' + (x.st === 'ok' ? '' : ' open') + '><summary>Cálculo do prazo</summary><div class="gr">' + calc.map(comSug).join('') + '</div></details>' : '') +
            (p.extra === 'etiquetas' && X.etiquetas ? X.etiquetas : '') +
            (mais.length ? '<details class="rt-mais"><summary>Mais campos</summary><div class="gr">' + mais.join('') + '</div></details>' : '') +
            (dica ? '<p class="rt-d">' + esc(dica) + '</p>' : '') +
            (p.manual ? '<label class="rt-m"><input type="checkbox" data-rtc="' + p.id + '"' + (loc[p.id] ? ' checked' : '') + '> Conferi</label>' : '') + '</div>';
        }
        h += '</div></li>';
      });
    });
    /* o que a ficha tem na Triagem e nenhum passo mostrou: entra em "Outros campos", para nada ficar de fora */
    var usadosPassos = {}; PASSOS.forEach(function (p) { (p.campos || []).concat(p.mais || []).forEach(function (c) { usadosPassos[c[0] + '.' + c[1]] = 1; }); });
    var outros = (X.todos || []).filter(function (c) { return !usadosPassos[c[0] + '.' + c[1]] && !mostrados[c[0] + '.' + c[1]]; });
    if (outros.length) h += '<li class="rt-f"><span>Outros campos da triagem</span></li><li class="rt-p is-na ab"><span class="rt-i">–</span><div class="rt-c"><div class="rt-b" style="border:0"><div class="gr">' + outros.map(comSug).join('') + '</div></div></div></li>';
    R.usados = usados.slice();
    var usar = usados.length ? '<div class="rt-u"><span>' + usados.length + ' campo(s) com sugestão da leitura dos autos</span><button type="button" class="btn solid sm" data-rt="ut">Usar todas</button></div>' : '';
    return h.replace('@@TOPO@@', topo.replace('@@USAR@@', usar)) + '</ol>' + (X.registro || '');
  }
  /* resumo para a aba: passos conferidos e total */
  function resumo(g) {
    var cnj = g.cnj(), T = tipos(g, cnj), loc = lerLocal(cnj), AU = window.MutaAutos, als = AU && AU.estado().itens ? AU.alertas() : [], ativos = Object.keys(T);
    var ctx = { v: function (s, k) { var x = g.V(s, k); return Array.isArray(x) ? (x.length ? 'tabela' : '') : S(x); }, tem: function (k) { return !!T[k]; }, alerta: function (re) { return als.some(function (a) { return a.nivel === 'al' && re.test(N(a.t)); }); } };
    var L = PASSOS.filter(function (p) { if (p.tipos !== '*' && !p.tipos.some(function (k) { return T[k]; })) return false; return !(p.nao && ativos.every(function (k) { return p.nao.indexOf(k) >= 0; })); });
    var ok = L.filter(function (p) { var st = p.manual ? (loc[p.id] ? 'ok' : 'pend') : p.estado(ctx); if (p.manual && p.estado && p.estado(ctx) === 'al') st = 'al'; return st === 'ok'; }).length;
    return { ok: ok, total: L.length };
  }
  function clique(b, g) {
    var a = b.dataset.rt || '', cnj = g.cnj(), loc = lerLocal(cnj);
    if (/^a:/.test(a)) { var id = a.slice(2), el = b.closest('.rt-p'); R.aberto[id] = !(el && el.classList.contains('ab')); return true; }
    if (/^t:/.test(a)) { var T = tipos(g, cnj), k = a.slice(2); if (T[k]) delete T[k]; else T[k] = 1; var L = Object.keys(T); loc._tipos = L.length ? L : null; if (!loc._tipos) delete loc._tipos; gravarLocal(cnj, loc); return true; }
    if (/^u:/.test(a)) { var it = (window.MutaAutos && window.MutaAutos.sugestoes ? window.MutaAutos.sugestoes() : [])[Number(a.slice(2))]; if (it && it.alvo && g.marcar) { g.marcar(it.alvo, it.value); if (g.gravar) g.gravar().catch(function () {}); } return true; }
    if (a === 'ut') { var SG = window.MutaAutos && window.MutaAutos.sugestoes ? window.MutaAutos.sugestoes() : []; (R.usados || []).forEach(function (k) { var x = SG[k]; if (x && x.alvo && g.marcar) g.marcar(x.alvo, x.value); }); if (g.gravar) g.gravar().catch(function () {}); return true; }
    if (a === 'auto') { delete loc._tipos; gravarLocal(cnj, loc); return true; }
    return false;
  }
  function conferir(id, on, g) { var cnj = g.cnj(), loc = lerLocal(cnj); if (on) loc[id] = new Date().toISOString().slice(0, 10); else delete loc[id]; gravarLocal(cnj, loc); }
  window.MutaRoteiro = { html: html, resumo: resumo, clique: clique, conferir: conferir, detectar: detectar, PASSOS: PASSOS, TIPOS: TIPOS };
})();
