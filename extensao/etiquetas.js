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
  g.MutaEtiquetas = { CFG: CFG, preparar: preparar, vale: vale, devidas: devidas, faltando: faltando, etapa: etapa, alertas: alertas, iniciais: iniciais, dias: dias, N: N,
    CAMPOS: [['urgPend', 'Urgência não apreciada'], ['urg', 'Medida urgente'], ['preparo', 'Preparo'], ['repres', 'Representação'], ['tempest', 'Tempestividade'], ['mpfSit', 'Parecer do MPF'],
      ['custos', 'Hipótese de intervenção do MPF'], ['destino', 'Destino'], ['tipoAto', 'Tipo de ato'], ['tipoJ', 'Tipo de julgamento'], ['icN', 'Intercorrências em aberto'], ['pendN', 'Pendências em aberto'],
      ['meta', 'Meta do CNJ'], ['sobr', 'Sobrestado'], ['sens', 'Caso sensível'], ['assunto', 'Assunto'], ['classe', 'Classe'], ['prioridade', 'Prioridade'], ['dias', 'Dias na tarefa'], ['tarefa', 'Tarefa']],
    OPS: [['tem', 'está preenchido / sim'], ['vazio', 'está vazio / não'], ['igual', 'é igual a'], ['contem', 'contém'], ['re', 'combina com (expressão)'], ['maior', 'é maior que']] };
})(typeof window !== 'undefined' ? window : self);
