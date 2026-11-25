/* Caput · motor de etiquetagem. Sem DOM ou persistência própria; estado fornecido pelo consumidor. */
(function(W){
'use strict';
W.CMTMotorEtiquetas={criar:function(ctx){
  var N=ctx.normalizar, uid=ctx.uid, estado=ctx.estado;
  /* ================= vocabulário das regras de etiquetas ================= */
  var EF = {
    ED: { g: 'Tipo de julgamento', t: 'ED · Embargos de declaração', s: 'ED' },
    AgInt: { g: 'Tipo de julgamento', t: 'AgInt · Agravo interno ou regimental', s: 'AgInt' },
    JR: { g: 'Tipo de julgamento', t: 'JR · Juízo de retratação', s: 'JR' },
    '1julg': { g: 'Tipo de julgamento', t: '1º julgamento (tira ED, AgInt e JR)', s: '1º julg' },
    META: { g: 'Metas', t: 'META pelo número da etiqueta', s: 'META' },
    meta: { g: 'Metas', t: 'Meta do CNJ (número fixo)', s: 'Meta', v: 'número da meta' },
    tema: { g: 'Tema e especificidade', t: 'Tema', s: 'Tema', v: 'tema' },
    esp: { g: 'Tema e especificidade', t: 'Especificidade', s: 'Esp.', v: 'especificidade' },
    mpf: { g: 'MPF', t: 'Atuação do MPF', s: 'MPF', v: 'hipótese' },
    ignorar: { g: 'Ignorar', t: 'Ignorar (não classifica nada)', s: 'Ignorar' }
  };
  var TIPOS = ['ED', 'AgInt', 'JR'];
  var MODOS = { inicio: 'começa por', igual: 'é igual a', contem: 'contém', fim: 'termina com', regex: 'expressão regular' };
  /* sintaxe dos termos no editor: =igual  *contém  $termina  /regex/  (sem prefixo: começa por) */
  function termoDeTexto(l) {
    l = String(l || '').trim(); if (!l) return null;
    if (/^\/.+\/$/.test(l)) return { t: l.slice(1, -1), m: 'regex' };
    if (l[0] === '=') return { t: l.slice(1).trim(), m: 'igual' };
    if (l[0] === '*') return { t: l.slice(1).trim(), m: 'contem' };
    if (l[0] === '$') return { t: l.slice(1).trim(), m: 'fim' };
    return { t: l, m: 'inicio' };
  }
  function termoParaTexto(x) { return x.m === 'regex' ? '/' + x.t + '/' : x.m === 'igual' ? '=' + x.t : x.m === 'contem' ? '*' + x.t : x.m === 'fim' ? '$' + x.t : x.t; }
  function regra(ef, termos, extra) { return Object.assign({ id: uid(), on: true, ef: ef, v: '', termos: termos, exceto: [], classes: [], nome: '', nota: '' }, extra || {}); }
  var PADRAO = { ED: ['ED', 'EDcl', 'EmbDecl', 'Embargos de declaração', 'Embargo de declaração', '*intimar ED', '*Acolher ED'], AgInt: ['AgInt', 'AgRg', 'Agravo interno', 'Agravo regimental'],
    JR: ['JR', 'Juízo de retratação', 'Retratação'], META: ['META', 'Metas', '*META 2', '*[META', '! META'], ignorar: ['*origem', '*1º grau', '*1o grau', '*primeiro grau', '*instância de origem'] };
  function regrasPadrao() {
    return Object.keys(PADRAO).map(function (k) {
      var r = regra(k, PADRAO[k].map(termoDeTexto), { id: 'pad-' + k, origem: 'padrão' });
      if (k === 'ED') r.exceto = [{ t: 'embargos a execucao', m: 'contem' }, { t: 'embargos de terceiro', m: 'contem' }, { t: 'embargos à execução', m: 'contem' }];
      if (k === 'AgInt') r.nota = 'Agravo interno contra decisão monocrática.';
      return r;
    });
  }
  /* ================= motor de etiquetas ================= */
  var RX = new Map();
  function rx(raw) { if (RX.has(raw)) return RX.get(raw); var re = null; try { re = new RegExp(N(raw), 'i'); } catch (e) {} RX.set(raw, re); return re; }
  function casa(d, x) {
    var q = N(x.t); if (!q) return false;
    switch (x.m) {
      case 'igual': return d === q;
      case 'contem': return d.indexOf(q) >= 0;
      case 'fim': return d.slice(-q.length) === q;
      case 'regex': var re = rx(x.t); return !!re && re.test(d);
      default: return d === q || (d.indexOf(q) === 0 && !/[a-z]/.test(d.charAt(q.length)));
    }
  }
  function offDe(ss) { return new Set((ss && ss.regrasOff) || []); }
  function ativas(ss) { var off = offDe(ss); return estado().regras.filter(function (r) { return r.on && r.termos.length && !off.has(r.id) && (!EF[r.ef] || !EF[r.ef].v || r.v); }); }
  /* regras por condições (tarefa, etiqueta, assunto, classe, meta, item): as padrão com "conds" e as criadas na própria pauta */
  var CAMPOS_R = [['tarefa', 'Tarefa atual no PJe'], ['etiqueta', 'Etiqueta do PJe'], ['assunto', 'Assunto'], ['classe', 'Classe'], ['meta', 'Meta CNJ'], ['item', 'Item da pauta']];
  var OPS_R = [['contem', 'contém'], ['igual', 'é igual a'], ['inicio', 'começa com'], ['nao', 'não contém'], ['vazio', 'está vazio']];
  function regrasCond(ss) { var off = offDe(ss); return estado().regras.filter(function (r) { return r.on && r.conds && r.conds.length && !off.has(r.id); }).concat(((ss && ss.regrasSessao) || []).filter(function (r) { return r.on !== false; })); }
  function bateCond(c, x) { var q = N(c.val);
    if (c.campo === 'etiqueta') { var L = x.tags.map(N); if (c.op === 'vazio') return !L.length; if (!q) return false; return c.op === 'igual' ? L.indexOf(q) >= 0 : c.op === 'inicio' ? L.some(function (t) { return t.indexOf(q) === 0; }) : c.op === 'nao' ? !L.some(function (t) { return t.indexOf(q) >= 0; }) : L.some(function (t) { return t.indexOf(q) >= 0; }); }
    var v = N(c.campo === 'tarefa' ? x.tarefa : c.campo === 'assunto' ? x.assunto : c.campo === 'classe' ? x.classe : c.campo === 'meta' ? x.metas.map(function (m) { return 'meta ' + m; }).join(' ') : c.campo === 'item' ? x.item : '');
    if (c.op === 'vazio') return !v; if (!q) return false;
    if (c.campo === 'item' && /^\d+\s*-\s*\d+$/.test(q)) { var ab = q.split('-').map(Number); return +v >= ab[0] && +v <= ab[1]; }
    return c.op === 'igual' ? v === q : c.op === 'inicio' ? v.indexOf(q) === 0 : c.op === 'nao' ? v.indexOf(q) < 0 : v.indexOf(q) >= 0; }
  function bateRegra(r, x) { var C = (r.conds || []).filter(function (c) { return c.op === 'vazio' || String(c.val || '').trim(); }); if (!C.length) return false;
    return r.liga === 'OU' ? C.some(function (c) { return bateCond(c, x); }) : C.every(function (c) { return bateCond(c, x); }); }
  function aplicaRegrasCond(c, x, ss) { c.porRegra = [];
    regrasCond(ss).forEach(function (r) { if (!bateRegra(r, x)) return;
      var tagsHit = x.tags.filter(function (t) { return (r.conds || []).some(function (k) { return k.campo === 'etiqueta' && bateCond(k, { tags: [t] }); }); });
      var push = function (a, v) { if (v && a.indexOf(v) < 0) a.push(v); };
      if (r.ef === 'ED' || r.ef === 'AgInt' || r.ef === 'JR') c.tipo = r.ef;
      else if (r.ef === '1julg') { c.tipo = ''; c.primeiro = true; }
      else if (r.ef === 'meta') push(c.metas, String(r.v || '').replace(/\D/g, '') || String(r.v || ''));
      else if (r.ef === 'tema' || r.ef === 'esp' || r.ef === 'mpf') push(c[r.ef], r.v);
      else if (r.ef === 'ignorar') tagsHit.forEach(function (t) { push(c.ign, t); c.usadas = c.usadas.filter(function (u) { return u !== t; }); c.livres = c.livres.filter(function (u) { return u !== t; }); });
      c.porRegra.push({ id: r.id, nome: r.nome || '', ef: r.ef, v: r.v || '', rot: (EF[r.ef] || {}).s || r.ef, tags: tagsHit, sessao: !!(ss && (ss.regrasSessao || []).indexOf(r) >= 0) }); });
    return c; }
  function tipoDaTarefa(t) { t = String(t || ''); return /\[(sess[ãa]o\s*-\s*)?ED\]/i.test(t) ? 'ED' : /\[ag\.?\s*int\]/i.test(t) ? 'AgInt' : /retrata/i.test(t) ? 'JR' : ''; }
  function sessaoDoItem(it) { return estado().sessoes.find(function (x) { return x.itens.indexOf(it) >= 0 || (x.previa || []).indexOf(it) >= 0; }) || null; }
  function casaRegra(r, d) { return r.termos.some(function (x) { return casa(d, x); }) && !r.exceto.some(function (x) { return casa(d, x); }); }
  function classeOK(r, classe) { return !r.classes.length || !classe || r.classes.some(function (c) { return N(c) === N(classe); }); }
  /* números de meta: 1 ou 2 dígitos logo após "meta(s)", de 1 a 12 (anos e datas não contam) */
  function numerosMeta(d) {
    var out = [], re = /metas?\s*(?:cnj\s*)?[-:#]?\s*0?(\d{1,2})(?!\d)((?:\s*(?:e|,|\/)\s*0?\d{1,2}(?!\d))*)/g, m;
    while ((m = re.exec(d))) { [m[1]].concat((m[2] || '').match(/\d{1,2}/g) || []).forEach(function (n) { n = String(Number(n)); if (+n >= 1 && +n <= 12 && out.indexOf(n) < 0) out.push(n); }); }
    return out;
  }
  function classificar(tags, classe, ss) {
    var R = ativas(ss), out = { tipo: '', metas: [], tema: [], esp: [], mpf: [], ign: [], usadas: [], livres: [] };
    var vivas = [];
    tags.forEach(function (t) {
      var d = N(t), H = R.filter(function (r) { return casaRegra(r, d) && classeOK(r, classe); });
      if (H.some(function (r) { return r.ef === 'ignorar'; })) { out.ign.push(t); return; }
      vivas.push([t, d, H]); if (H.length) out.usadas.push(t); else out.livres.push(t);
    });
    for (var i = 0; i < TIPOS.length && !out.tipo; i++) { var k = TIPOS[i]; if (vivas.some(function (v) { return v[2].some(function (r) { return r.ef === k; }); })) out.tipo = k; }
    if (vivas.some(function (v) { return v[2].some(function (r) { return r.ef === '1julg'; }); })) { out.tipo = ''; out.primeiro = true; }
    var push = function (a, v) { if (v && a.indexOf(v) < 0) a.push(v); };
    vivas.forEach(function (v) {
      v[2].forEach(function (r) {
        if (r.ef === 'meta') push(out.metas, String(r.v));
        else if (r.ef === 'META') { var ns = numerosMeta(v[1]); if (ns.length) ns.forEach(function (n) { push(out.metas, n); }); else if (!v[2].some(function (x) { return x.ef === 'meta'; })) push(out.metas, '?'); }
        else if (r.ef === 'tema' || r.ef === 'esp' || r.ef === 'mpf') push(out[r.ef], r.v);
      });
    });
    out.metas = out.metas.filter(function (m) { return m !== '?' || out.metas.length === 1; });
    return out;
  }
  function recursoDaClasse(classe) {
    var c = N(classe);
    if (/agravo de instrumento|(^|\W)ai(\W|$)/.test(c)) return 'AI';
    if (/remessa necessaria/.test(c) && /apela/.test(c)) return 'ApelRemNec';
    if (/remessa necessaria/.test(c)) return 'RemNec';
    if (/efeito suspensivo/.test(c)) return 'SuspApel';
    if (/apelacao/.test(c)) return 'ApCiv';
    return c ? String(classe).split(' - ')[0].slice(0, 12) : '';
  }


return {EF:EF,TIPOS:TIPOS,MODOS:MODOS,termoDeTexto:termoDeTexto,termoParaTexto:termoParaTexto,regra:regra,regrasPadrao:regrasPadrao,RX:RX,casa:casa,offDe:offDe,ativas:ativas,CAMPOS_R:CAMPOS_R,OPS_R:OPS_R,regrasCond:regrasCond,bateCond:bateCond,bateRegra:bateRegra,aplicaRegrasCond:aplicaRegrasCond,tipoDaTarefa:tipoDaTarefa,sessaoDoItem:sessaoDoItem,casaRegra:casaRegra,classeOK:classeOK,numerosMeta:numerosMeta,classificar:classificar,recursoDaClasse:recursoDaClasse};
}};
})(typeof window!=='undefined'?window:globalThis);
