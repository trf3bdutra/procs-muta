/* Muta · etiquetas do gabinete, prazos e alertas (0.19)
   Regras comuns ao leitor do PJe (selos na lista de tarefas), ao painel e ao service worker (avisos do Chrome).
   - Catálogo: padrao/etiquetas-gabinete.json, servido por GET /api/pauta?etiquetas=1 (o gestor edita no painel).
     Cada etiqueta tem condições sobre o resumo do processo (GET /api/pauta?fichas=…); todas precisam valer.
   - Prazos e alertas: urgência não apreciada, intercorrência em aberto, dias na tarefa, pendências; limites ajustáveis.
   Só leitura no PJe: as etiquetas que faltam são copiadas para colar no PJe. */
(function (g) {
  'use strict';
  var S = function (v) { return v == null ? '' : String(v).trim(); };
  var N = function (v) { return S(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  function dias(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(d)) || /^(\d{2})\/(\d{2})\/(\d{4})/.exec(S(d)); if (!m) return null;
    var t = m[1].length === 4 ? new Date(+m[1], m[2] - 1, +m[3]) : new Date(+m[3], m[2] - 1, +m[1]); return Math.max(0, Math.floor((Date.now() - t) / 864e5)); }
  var CFG = { urgDias: 2, tarefaDias: 30, avisos: true, selos: true };

  /* campos derivados do resumo, usados pelas regras e pelos alertas */
  function preparar(r) {
    r = r || {};
    if (r._p) return r;
    r.pend = Array.isArray(r.pend) ? r.pend : []; r.ic = Array.isArray(r.ic) ? r.ic : [];
    r.pendN = r.pend.length; r.icN = r.ic.length;
    r.urgPend = !!S(r.urg) && !S(r.urgAprEm) && !/^(apreciad|deferid|indeferid|prejudicad|parcialmente)/.test(N(r.urgApr));
    r.urgDias = dias(r.urgData); r.dias = dias(r.desde);
    r._p = 1; return r;
  }
  function vale(r, q) {
    var v = r[q.campo], n = Array.isArray(v) ? v.length : v;
    switch (q.op) {
      case 'vazio': return !(Array.isArray(v) ? v.length : S(v) && v !== false);
      case 'igual': return N(v) === N(q.valor);
      case 'contem': return N(v).indexOf(N(q.valor)) >= 0;
      case 're': try { return new RegExp(q.valor).test(N(v)); } catch (e) { return false; }
      case 'maior': return Number(n || 0) > Number(q.valor || 0);
      default: return Array.isArray(v) ? v.length > 0 : v === true || (!!S(v) && S(v) !== '0' && v !== false);
    }
  }
  function devidas(r, cat) { r = preparar(r); return ((cat && cat.etiquetas) || []).filter(function (e) { return e.quando && e.quando.length && e.quando.every(function (q) { return vale(r, q); }); }); }
  /* as devidas que não estão no PJe (pelas etiquetas registradas do processo e pelo texto do cartão na lista) */
  function faltando(r, cat, texto) { var tem = N((r && r.etqPje || '') + ' ' + (texto || '')); return devidas(r, cat).filter(function (e) { return tem.indexOf(N(e.nome)) < 0; }); }
  function etapa(r) {
    r = preparar(r); if (!r.registrado) return '';
    if (r.assinado) return 'Assinada'; if (r.enviado) return 'Para assinatura'; if (r.liberado) return 'Liberado';
    if (r.corrigido) return 'Para liberação'; if (r.minutado) return 'Para correção'; if (r.triado) return 'Para minuta'; return 'Para triagem';
  }
  /* alertas de prazo: nível 'al' (vermelho) ou 'av' (aviso) */
  function alertas(r, cfg) {
    r = preparar(r); cfg = cfg || CFG; var A = [];
    if (r.urgPend) A.push({ k: 'urg', nivel: r.urgDias != null && r.urgDias >= cfg.urgDias ? 'al' : 'av', t: 'Urgência não apreciada' + (r.urgDias != null ? ' há ' + r.urgDias + ' dia(s)' : '') + (r.urg ? ' (' + r.urg + ')' : '') });
    if (r.icN) A.push({ k: 'ic', nivel: 'al', t: r.icN + ' intercorrência(s) em aberto: ' + r.ic[0] });
    if (r.dias != null && r.dias >= cfg.tarefaDias) A.push({ k: 'tarefa', nivel: r.dias >= cfg.tarefaDias * 2 ? 'al' : 'av', t: r.dias + ' dias na tarefa' + (r.tarefa ? ' ' + r.tarefa : '') });
    if (r.pendN) A.push({ k: 'pend', nivel: 'av', t: r.pendN + ' pendência(s): ' + r.pend[0] });
    return A;
  }
  function iniciais(v) { var p = S(v).split(/\s+/).filter(Boolean); return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : ''; }
  /* tipos de etiqueta do PJe (padrao/etiquetas-gabinete.json › categorias; esta é a cópia de reserva até o catálogo chegar) */
  var CATEGORIAS = [{"id": "urgencia", "nome": "Urgência", "re": "liminar|urgen|tutela|efeito suspensivo|medicamento", "cor": "#c62828", "estilo": "solido", "icone": "raio"}, {"id": "prioridade", "nome": "Prioridade legal", "re": "prioridade|superprioridade|maior (de )?80|idos[oa]|\\bmenor\\b|defici", "cor": "#7b3fb3", "estilo": "solido", "icone": "estrela"}, {"id": "conferencia", "nome": "Conferência", "re": "representa|tempestiv|preparo|deser|custas em dobro|intimar|regularizar|aguardando parecer|\\bmpf\\b|\\bprr\\b|intercorr|impedimento|suspei|preven[çc]|justi[çc]a gratuita", "cor": "#e8710a", "estilo": "contorno", "icone": "alerta"}, {"id": "sessao", "nome": "Sessão", "re": "sess[ãa]o|^\\d{4}-\\d{2}-\\d{2}|n[ãa]o pautar", "cor": "#00796b", "estilo": "suave", "icone": "calendario"}, {"id": "meta", "nome": "Meta", "re": "^meta\\b", "cor": "#b7791f", "estilo": "solido", "icone": "alvo"}, {"id": "fluxo", "nome": "Fluxo", "re": "^apto|monocr|minutad|revisad|n[ãa]o mexer|^analisar|sobrest|retrata|pedido de despacho|triagem de gabinete|^levantar", "cor": "#2e7d32", "estilo": "suave", "icone": "check"}, {"id": "lote", "nome": "Lote e tema", "re": "^lote|28,86|^tema \\d|\\blote\\b", "cor": "#1e6091", "estilo": "contorno", "icone": "camadas"}, {"id": "secao", "nome": "Seção", "re": "^\\dª se[çc][ãa]o|juiz(a)? auxiliar|comp\\. delegada", "cor": "#455a64", "estilo": "solido", "icone": "secao"}, {"id": "pessoa", "nome": "Designação", "re": "^triagem - |produtividade|^z |giovana|v[íi]ctor|rodrigo|jos[ée] v|dalete|estela|wellington|maria eduarda|debora|marcela|luciola|heloisa|alexander|saffioti", "cor": "#6d4c41", "estilo": "suave", "icone": "pessoa"}, {"id": "classe", "nome": "Classe e espécie", "re": "^(ai|ed|agint|ms|apciv|remnec)$|^dupla apela|apenas remessa|recurso inominado|^ee |^ai - |^erbe", "cor": "#1565c0", "estilo": "solido", "icone": "balanca"}, {"id": "materia", "nome": "Matéria", "re": ".", "cor": "#546e7a", "estilo": "suave", "icone": ""}];
  /* ícones de traço (sem emoji), usados nos selos, no quadro e nas etiquetas redesenhadas */
  var ICONES = {"raio": "<path d=\"M13 2 4 14h7l-1 8 9-12h-7z\"/>", "sino": "<path d=\"M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z\"/><path d=\"M10 20a2 2 0 0 0 4 0\"/>", "bloqueio": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M5.6 5.6l12.8 12.8\"/>", "bandeira": "<path d=\"M5 21V4\"/><path d=\"M5 4h11l-2 4 2 4H5\"/>", "nota": "<path d=\"M7 3h7l4 4v14H7z\"/><path d=\"M14 3v4h4M9.5 12h5M9.5 16h5\"/>", "estrela": "<path d=\"M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z\"/>", "alerta": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v6M12 16.5v.5\"/>", "calendario": "<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15\" rx=\"2\"/><path d=\"M3.5 10h17M8 3v4M16 3v4\"/>", "alvo": "<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"3.5\"/>", "check": "<path d=\"M4 12.5l5 5L20 6.5\"/>", "camadas": "<path d=\"M12 3l9 5-9 5-9-5z\"/><path d=\"M3 13l9 5 9-5\"/>", "secao": "<path d=\"M15 6.5a3.5 3 0 1 0-3.5 3c2.5 0 4 1.3 4 3s-1.6 3-3.5 3\"/><path d=\"M9 17.5a3.5 3 0 1 0 3.5-3\"/>", "pessoa": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4.5 20.5c1.2-4 4.2-6 7.5-6s6.3 2 7.5 6\"/>", "balanca": "<path d=\"M12 4v16M6 20h12M5 8h14\"/><path d=\"M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z\"/>", "etiqueta": "<path d=\"M3 12V4h8l9.5 9.5-8 8z\"/><circle cx=\"7.5\" cy=\"8.5\" r=\"1.3\"/>", "relogio": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>", "pausa": "<path d=\"M9 5v14M15 5v14\"/>", "coracao": "<path d=\"M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10z\"/>", "triste": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8.5 16.5c2-2 5-2 7 0M9 10h.01M15 10h.01\"/><path d=\"M9 12.5v1.5M15 12.5v1.5\"/>", "ampulheta": "<path d=\"M6 3h12M6 21h12\"/><path d=\"M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9\"/>", "triangulo": "<path d=\"M12 3.5 2.5 20h19z\"/><path d=\"M12 10v4.5M12 17.5v.3\"/>", "alfinete": "<path d=\"M9 3h6l-1 6 4 4H6l4-4z\"/><path d=\"M12 13v8\"/>", "lapis": "<path d=\"M4 20l4.5-1L19 8.5 15.5 5 5 15.5z\"/><path d=\"M13.5 7l3.5 3.5\"/>", "enviar": "<path d=\"M21 3 3 10.5l7 2.5 2.5 7z\"/><path d=\"M10 13l5-5\"/>", "interrogacao": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17v.3\"/>"};
  function svg(k, n) { var p = ICONES[k]; return p ? '<svg viewBox="0 0 24 24" width="' + (n || 12) + '" height="' + (n || 12) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>' : ''; }
  var RX = {};
  function categoriaDe(nome, cat) {
    var L = (cat && Array.isArray(cat.categorias) && cat.categorias.length) ? cat.categorias : CATEGORIAS, n = S(nome).toLowerCase(), nn = N(nome);
    var exata = ((cat && cat.etiquetas) || []).filter(function (e) { return N(e.nome) === nn; })[0];
    for (var i = 0; i < L.length; i++) {
      var c = L[i], re = RX[c.re] || (RX[c.re] = (function () { try { return new RegExp(c.re, 'i'); } catch (e) { return /$^/; } })());
      if (re.test(n) || re.test(nn)) return exata && exata.cor ? Object.assign({}, c, { cor: exata.cor }) : c;
    }
    return exata ? { id: 'catalogo', nome: 'Catálogo', cor: exata.cor || '#546e7a', estilo: 'solido', icone: '' } : null;
  }
  g.MutaEtiquetas = { CFG: CFG, CATEGORIAS: CATEGORIAS, ICONES: ICONES, svg: svg, categoriaDe: categoriaDe, preparar: preparar, vale: vale, devidas: devidas, faltando: faltando, etapa: etapa, alertas: alertas, iniciais: iniciais, dias: dias, N: N,
    CAMPOS: [['urgPend', 'Urgência não apreciada'], ['urg', 'Medida urgente'], ['preparo', 'Preparo'], ['repres', 'Representação'], ['tempest', 'Tempestividade'], ['mpfSit', 'Parecer do MPF'],
      ['custos', 'Hipótese de intervenção do MPF'], ['destino', 'Destino'], ['tipoAto', 'Tipo de ato'], ['tipoJ', 'Tipo de julgamento'], ['icN', 'Intercorrências em aberto'], ['pendN', 'Pendências em aberto'],
      ['meta', 'Meta do CNJ'], ['sobr', 'Sobrestado'], ['sens', 'Caso sensível'], ['assunto', 'Assunto'], ['classe', 'Classe'], ['prioridade', 'Prioridade'], ['dias', 'Dias na tarefa'], ['tarefa', 'Tarefa']],
    OPS: [['tem', 'está preenchido / sim'], ['vazio', 'está vazio / não'], ['igual', 'é igual a'], ['contem', 'contém'], ['re', 'combina com (expressão)'], ['maior', 'é maior que']] };
})(typeof window !== 'undefined' ? window : self);
