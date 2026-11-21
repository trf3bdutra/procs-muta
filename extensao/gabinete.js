/* Muta · Ficha do gabinete (Ex Officio) no painel
   A mesma ficha única do processo que a Ex Officio e o Ab Initio usam (padrao/ficha.json → acervo/operacional.json):
     GET  /api/pauta?ficha=<CNJ>              ficha (modelo), registro do operacional, dados da fonte, controles, gestor
     POST /api/pauta?ficha=1 {cnj, campos}    grava; o servidor recusa o que não é editável ou é só do gestor
   Renderização no padrão do prontuário lateral da Ex Officio (abas, grupos, gravação automática).
   A correspondência prontuário ↔ ficha (MAPA) é usada pela sincronia automática (sincronia.js): o prontuário completo
   vai ao GitHub com os campos correspondentes da ficha, e a ficha preenche o prontuário ao abrir o processo. */
(function () {
'use strict';
var SITE = Muta.SITE, ses = window.MutaSessao, br = window.MutaProntuarioBridge;
var $ = function (id) { return document.getElementById(id); };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function S(v) { return String(v == null ? '' : v).trim(); }
function dg(v) { return String(v || '').replace(/\D/g, ''); }
function brD(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] : S(v); }

var ABAS = ['Processo', 'Triagem', 'Produção', 'Controles especiais', 'Pauta'], CE = 'Controles especiais';
var G = { cnj: '', F: null, op: null, fo: null, gestor: false, ctl: {}, aba: 'Processo', qVazia: false, dest: null, pend: {}, pendCnj: '', t: null, carregando: false, erro: '', mostra: {}, tok: 0 };
var MODO_K = 'muta-pje:modo';
var caixa = $('gab'), stEl = null;

/* ---------- prontuário único (0.11): a ficha do processo; o prontuário completo antigo segue só na sincronia ---------- */
var modo = 'ficha';
function aplicarModo() {
  document.body.dataset.pmodo = modo;
  document.querySelectorAll('#pmodo button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.m === modo)); });
  if (modo === 'ficha') carregar(false);
}
document.querySelectorAll('#pmodo button').forEach(function (b) {
  b.addEventListener('click', function () { modo = b.dataset.m; try { localStorage.setItem(MODO_K, modo); } catch (e) {} aplicarModo(); });
});

/* ---------- leitura ---------- */
function cnjAtual() { var k = br.chaveAtual(); return k && k !== 'avulso' ? Muta.formatarCnj(k) : ''; }
function carregar(forcar) {
  if (modo !== 'ficha') return;
  var s = ses.estado();
  if (s.estado !== 'on') { render(); return; }
  var cnj = cnjAtual();
  if (!cnj) { G.cnj = ''; G.F = null; G.op = null; render(); return; }
  if (!forcar && cnj === G.cnj && (G.F || G.carregando)) { render(); return; }
  if (G.cnj && G.cnj !== cnj) gravarJa().catch(function () {});
  G.cnj = cnj; G.F = null; G.op = null; G.fo = null; G.erro = ''; G.dest = null; G.mostra = {}; G.qVazia = false; G.carregando = true;
  var tok = ++G.tok;
  render();
  ses.api('/api/pauta?ficha=' + encodeURIComponent(cnj)).then(function (j) {
    if (tok !== G.tok) return;
    G.F = j.ficha; G.op = j.operacional; G.fo = j.fonte; G.gestor = !!j.gestor; G.ctl = j.controles || {};
    G.carregando = false; render();
    st(j.operacional ? '' : 'Sem ficha no Ex Officio ainda: ela é criada na primeira gravação.');
  }).catch(function (e) {
    if (tok !== G.tok) return;
    G.carregando = false; G.erro = e.status === 401 ? '' : e.message; render();
  });
}

/* ---------- valores ---------- */
function gravado(sec, k) { var r = G.op || {}, v = (r[sec] || {})[k]; return v == null ? '' : v; }
function V(sec, k) { var id = sec + '.' + k; return id in G.pend ? G.pend[id] : gravado(sec, k); }
function fonteVal(c) { var f = G.fo || {}, L = c.fonte || [];
  if (L.length === 2 && f[L[0]] && typeof f[L[0]] === 'object') { var x = f[L[0]][L[1]]; return x == null ? '' : S(x); }
  for (var i = 0; i < L.length; i++) { var v = f[L[i]]; if (v != null && S(v) !== '' && typeof v !== 'object') return S(v); } return ''; }
function editavel(c) { return !!c.secao && c.editavel !== false && !c.calculado; }
function destGrav() { return S(V('producao', 'Destino')); }
function destino() { if (G.dest) return G.dest; return destGrav() === 'Monocrática' ? 'monocratica' : 'sessao'; }
function naLista() { return (G.ctl || {}).naLista || {}; }
function vale(g) {
  var N = naLista();
  if (g === 'urgencia') return !!V('triagem', 'Urgência');
  if (g === 'monocratica') return V('producao', 'Destino') === 'Monocrática';
  if (g === 'meta') return !!(N.metas || G.ctl.meta);
  if (g === 'sobrestamento') return !!(N.sobrestados || G.ctl.sobrestamento);
  if (g === 'sensivel') return V('controles', 'Sensível - Excluído') !== 'Sim' && (!!N.sensiveis || V('controles', 'Sensível - Incluído') === 'Sim');
  return false;
}
var ORD_CE = ['urgencia', 'monocratica', 'meta', 'sobrestamento', 'sensivel'];
var ROT_CE = { urgencia: 'Urgência', monocratica: 'Monocrática', meta: 'Meta', sobrestamento: 'Sobrestado', sensivel: 'Caso sensível' };
var INC = { urgencia: ['Registrar urgência', null], monocratica: ['Registrar monocrática', ['producao.Destino', 'Monocrática']], sensivel: ['Incluir em casos sensíveis', ['controles.Sensível - Incluído', 'Sim']], meta: ['Incluir em meta', null], sobrestamento: ['Registrar sobrestamento', null] };
function grupoVisivel(g) {
  if (!g.quando) return true;
  var q = g.quando.campo, i = q.indexOf('.');
  if (V(q.slice(0, i), q.slice(i + 1)) === g.quando.valor) return true;
  return g.campos.some(function (c) { var v = c.secao ? gravado(c.secao, c.chave) : ''; return Array.isArray(v) ? v.length : !!S(v); });
}

/* ---------- campos ---------- */
function tabela(c, v) {
  var L = Array.isArray(v) ? v : [], cols = c.colunas || [];
  if (!L.length) return '<span class="ro">—</span>';
  return '<div class="gt-tab"><table><thead><tr>' + cols.map(function (x) { return '<th>' + esc(x.rotulo || x.chave) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    L.map(function (l) { return '<tr>' + cols.map(function (x) { return '<td>' + esc((l || {})[x.chave] || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
}
function campo(c) {
  var longo = c.tipo === 'texto-longo' || c.tipo === 'tabela', cls = 'gf' + (longo ? ' w' : '');
  if (c.tipo === 'tabela') {
    var tv = c.secao ? gravado(c.secao, c.chave) : '';
    return '<div class="' + cls + '"><span class="gl">' + esc(c.rotulo) + (editavel(c) ? ' <small class="muted">· editar na ficha do Ex Officio</small>' : '') + '</span>' + tabela(c, tv) + '</div>';
  }
  if (!editavel(c)) {
    var v0 = c.secao ? gravado(c.secao, c.chave) : fonteVal(c);
    if (typeof v0 === 'object') v0 = '';
    return '<div class="' + cls + '"><span class="gl">' + esc(c.rotulo) + '</span><span class="ro">' + (S(v0) ? esc(/^\d{4}-\d{2}-\d{2}$/.test(S(v0)) ? brD(v0) : v0) : '—') + '</span></div>';
  }
  var id = c.secao + '.' + c.chave, v = V(c.secao, c.chave), bloq = (id === 'producao.SERVIDOR' || id === 'producao.CORRETOR') && !G.gestor, h;
  if (typeof v === 'object') v = '';
  v = String(v);
  var at = ' data-fk="' + esc(id) + '"' + (bloq ? ' disabled title="Designação: só o gestor"' : '');
  if (c.tipo === 'lista') { var O = (c.opcoes || []).map(function (o) { return typeof o === 'string' ? o : o.valor; });
    h = '<select' + at + '><option value="">—</option>' + O.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + (v && O.indexOf(v) < 0 ? '<option selected>' + esc(v) + '</option>' : '') + '</select>'; }
  else if (c.tipo === 'simnao') h = '<select' + at + '><option value="">—</option><option' + (v === 'Sim' ? ' selected' : '') + '>Sim</option><option' + (v === 'Não' ? ' selected' : '') + '>Não</option>' + (v && v !== 'Sim' && v !== 'Não' ? '<option selected>' + esc(v) + '</option>' : '') + '</select>';
  else if (c.tipo === 'data' && (!v || /^\d{4}-\d{2}-\d{2}$/.test(v))) h = '<input type="date"' + at + ' value="' + esc(v) + '">';
  else if (c.tipo === 'numero') h = '<input type="number"' + at + ' value="' + esc(v) + '">';
  else if (c.tipo === 'texto-longo') h = '<textarea rows="3"' + at + '>' + esc(v) + '</textarea>';
  else h = '<input type="text"' + at + ' value="' + esc(v) + '">';
  return '<label class="' + cls + (id in G.pend ? ' mud' : '') + '"><span class="gl">' + esc(c.rotulo) + '</span>' + h + '</label>';
}
function grupoHtml(g, aberto) {
  var n = g.campos.filter(function (c) { var v = c.secao ? V(c.secao, c.chave) : fonteVal(c); return Array.isArray(v) ? v.length : !!S(v); }).length;
  return '<details class="gg"' + (aberto ? ' open' : '') + '><summary><h4>' + esc(g.grupo) + '</h4><span class="gn">' + n + '/' + g.campos.length + '</span></summary><div class="gr">' + g.campos.map(campo).join('') + '</div></details>';
}
function controles(A) {
  return A.grupos.map(function (g) {
    var id = g.controle, v = vale(id), ab = v || G.mostra[id], inc = INC[id];
    return '<section class="gce ' + id + (v ? ' on' : '') + '"><div class="gce-h"><h4>' + esc(g.grupo) + '</h4><span class="gce-s">' + (v ? 'vale para este processo' : 'não se aplica') + '</span>' +
      (!ab && inc ? '<button type="button" class="btn line" data-inc="' + id + '">+ ' + esc(inc[0]) + '</button>' : '') + '</div>' +
      (ab ? '<div class="gr">' + g.campos.map(campo).join('') + '</div>' : '<p class="muted gce-r">Regra: ' + esc(g.inclusao || '') + '.</p>') + '</section>';
  }).join('');
}
function pills() {
  return ORD_CE.filter(vale).map(function (g) { return '<button type="button" class="gp ' + g + '" data-aba="' + CE + '">' + ROT_CE[g] + '</button>'; }).join('');
}

/* ---------- desenho: prontuário único (Processo · Triagem · Produção) ----------
   No topo, o cartão do processo (autuação e partes, do acervo). Embaixo, três modos:
   - Processo: assunto, síntese e questões; situação atual; documentos dos autos (com especificação e inteiro teor);
     preenchimento pelos autos; sentença, origem, recursos e contrarrazões, outras peças; os controles (urgência, meta,
     sobrestamento e caso sensível); registro no acervo e acompanhamento;
   - Triagem: conferência automática dos autos; etiquetas sugeridas; o prontuário de triagem da ficha; o registro da triagem do lote;
   - Produção: destino do julgamento, designação, revisão e o que vale para o destino; no fim, a pauta (sessão) ou o controle da monocrática.
   Autuação, partes, tramitação e "autos extraídos" não aparecem como grupos: o cartão, a situação atual e a lista de documentos os substituem. */
var MODOS = ['Processo', 'Triagem', 'Roteiro', 'Produção'];
var FORA_PROC = { 'Autuação': 1, 'Partes': 1, 'Tramitação': 1, 'Autos extraídos do PJe': 1, 'Registro no acervo': 1, 'Acompanhamento': 1 };
var NO_TOPO = { 'Síntese Processual': 1, 'Alegações': 1, 'Etiquetas sugeridas': 1, 'O que falta sanar': 1, 'Intercorrências': 1 };
var CTL_PROC = ['urgencia', 'meta', 'sobrestamento', 'sensivel'];
function abaModelo(nome) { return ((G.F && G.F.abas) || []).filter(function (a) { return a.aba === nome; })[0] || null; }
function grupoModelo(nome) { var g = null; ((G.F && G.F.abas) || []).forEach(function (a) { (a.grupos || []).forEach(function (x) { if (!g && x.grupo === nome) g = x; }); }); return g; }
function campoModelo(sec, chave) { var c = null; ((G.F && G.F.abas) || []).forEach(function (a) { (a.grupos || []).forEach(function (g) { (g.campos || []).forEach(function (x) { if (!c && x.chave === chave && (x.secao || '') === sec) c = x; }); }); }); return c; }
function fmtV(v) { v = S(v); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? brD(v) : v; }
function valorDe(c) { var v = c.secao ? gravado(c.secao, c.chave) : fonteVal(c); return typeof v === 'object' ? '' : S(v); }
function pjeDoProcesso() { return window.MutaPje && window.MutaPje.processo && Muta.chaveProcesso(window.MutaPje.processo()) === Muta.chaveProcesso(G.cnj); }

/* valor da causa: número cru vira R$ 1.518,00; texto já formatado fica como está */
function moeda(v) { v = S(v); if (!/^\d+([.,]\d{1,2})?$/.test(v)) return v; var n = Number(v.replace(',', '.')); if (!isFinite(n)) return v;
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
/* cartão do processo: autuação e partes */
function cartao(s) {
  var R = {};
  ['Autuação', 'Partes'].forEach(function (n) { var g = grupoModelo(n); (g ? g.campos : []).forEach(function (c) { R[c.rotulo] = valorDe(c); }); });
  var classe = R['Classe'] || fonteVal({ fonte: ['classe_judicial', 'Classe'] }), assunto = R['Assunto CNJ'] || fonteVal({ fonte: ['Assunto'] });
  var abrev = pjeDoProcesso() ? window.MutaPje.classe() : '';
  var tarefa = (pjeDoProcesso() && window.MutaPje.tarefa && window.MutaPje.tarefa()) || fonteVal({ fonte: ['tarefa_atual'] });
  var etq = S(R['Etiquetas do PJe']).split(/\s*[;,|]\s*/).filter(Boolean);
  var dl = [['Órgão julgador', 'Órgão julgador'], ['Relator', 'Relator'], ['Seção', 'Seção competente'], ['Distribuição', 'Distribuição'], ['1º grau', 'Distribuição no 1º grau'], ['Valor da causa', 'Valor da causa'], ['Prioridade', 'Prioridade'], ['Sigilo', 'Sigiloso']]
    .filter(function (x) { return S(R[x[1]]) && !/^(não|nao|n|false|0)$/i.test(S(R[x[1]])); })
    .map(function (x) { var v = S(R[x[1]]); if (/^(true|sim|s)$/i.test(v)) v = 'Sim'; else if (x[0] === 'Valor da causa') v = moeda(v); else v = fmtV(R[x[1]]);
      return '<div' + (x[0] === 'Prioridade' || x[0] === 'Sigilo' ? ' class="pri"' : '') + '><dt>' + esc(x[0]) + '</dt><dd>' + esc(v) + '</dd></div>'; }).join('');
  var polo = function (rot, p, a) { return S(R[p]) ? '<div class="pc-p"><span>' + esc(rot) + '</span><b>' + esc(R[p]) + '</b>' + (S(R[a]) ? '<small>Adv.: ' + esc(R[a]) + '</small>' : '') + '</div>' : ''; };
  var partes = polo('Polo ativo', 'Polo ativo', 'Advogado do polo ativo') + polo('Polo passivo', 'Polo passivo', 'Advogado do polo passivo') +
    (S(R['DPU']) && !/^(não|nao)$/i.test(S(R['DPU'])) ? '<div class="pc-p"><span>DPU</span><b>' + esc(R['DPU']) + '</b></div>' : '') +
    (S(R['MPF']) && !/^(não|nao)$/i.test(S(R['MPF'])) ? '<div class="pc-p"><span>MPF</span><b>' + esc(R['MPF']) + '</b></div>' : '') +
    (!S(R['Polo ativo']) && S(R['Partes (texto da pauta)']) ? '<div class="pc-p"><span>Partes</span><b>' + esc(R['Partes (texto da pauta)']) + '</b></div>' : '');
  var pills = ORD_CE.filter(function (g) { return g !== 'monocratica' && vale(g); }).map(function (g) { return '<button type="button" class="gp ' + g + '" data-ir="g-ctl" title="Abrir o controle">' + ROT_CE[g] + '</button>'; }).join('');
  return '<section class="pc">' +
    '<div class="pc-n"><button type="button" class="mono pc-cnj" data-copia="' + esc(G.cnj) + '" title="Copiar o número">' + esc(G.cnj) + '</button>' + (abrev ? '<span class="pc-cl">' + esc(abrev) + '</span>' : '') + '<span class="sp"></span>' + pills + '</div>' +
    (classe || assunto ? '<h2 class="pc-t">' + esc(classe) + (assunto ? '<em> · ' + esc(assunto) + '</em>' : '') + '</h2>' : '') +
    (tarefa ? '<p class="pc-tf">' + esc(tarefa) + '</p>' : '') +
    (dl ? '<dl class="pc-dl">' + dl + '</dl>' : '') +
    (partes ? '<div class="pc-ps">' + partes + '</div>' : '') +
    (etq.length ? '<div class="pc-etq">' + etq.map(function (e) { return '<span class="chip">' + esc(e) + '</span>'; }).join('') + '</div>' : '') +
    '<div class="pc-u"><span>' + esc(s.usuario) + (s.gestor ? ' · gestor' : '') + '</span><button type="button" class="lnk" data-g="atualizar">Atualizar</button><a class="lnk" target="_blank" rel="noopener noreferrer" href="' + SITE + '/exofficio/">Ex Officio</a><button type="button" class="lnk" data-sair>Sair</button></div>' +
    '</section>';
}

/* ---------- 0.15 · cabeçalho no formato da gaveta "Para minuta" da pauta ----------
   fase e dias na tarefa; número, classe, alertas; assunto e tipo; partes; etapas (tocar na próxima marca hoje, na última
   feita desfaz); designação de minuta e correção. Os mesmos campos da ficha (producao.*) que a pauta usa. */
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function hojeIso() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function agoraBr() { var d = new Date(); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function sim(v) { return /^(sim|s|true)$/i.test(S(v)); }
var SV = function (d, n) { return '<svg viewBox="0 0 24 24" width="' + (n || 16) + '" height="' + (n || 16) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
var IC = { min: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', rev: '<path d="M20 6 9 17l-5-5"/>', env: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  ass: '<path d="M3 21c3-1 5-4 6-7l3 3c-3 1-6 3-7 6z"/><path d="M14 4l6 6-5 5-6-6z"/>', et: '<path d="M4 12h4l3-8 4 16 3-8h2"/>', pt: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 15c3 0 6 1.5 6 4"/>',
  sn: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>', nt: '<path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>', dc: '<path d="M12 3v18M5 7h14M7 7l-3 7h6zM17 7l-3 7h6z"/>' };
function etapas() {
  var mono = destino() === 'monocratica', d = function (k) { return S(V('producao', k)); };
  var L = [{ r: 'Minuta', ic: 'min', ok: !!d('MINUTADO'), dt: d('MINUTADO'), on: { MINUTADO: 1 }, off: ['MINUTADO'] },
    { r: mono ? 'Revisão' : 'Correção', ic: 'rev', ok: sim(d('CORRIGIDO')) || !!d('Data da Revisão'), dt: d('Data da Revisão'), on: { CORRIGIDO: 'Sim', 'Data da Revisão': 1 }, off: ['CORRIGIDO', 'Data da Revisão'] }];
  if (mono) L.push({ r: 'Enviada', ic: 'env', ok: !!d('Data da Liberação'), dt: d('Data da Liberação'), on: { 'Data da Liberação': 1 }, off: ['Data da Liberação'] },
    { r: 'Assinada', ic: 'ass', ok: sim(d('Assinado')) || !!d('Data da Assinatura'), dt: d('Data da Assinatura'), on: { Assinado: 'Sim', 'Data da Assinatura': 1 }, off: ['Assinado', 'Data da Assinatura'] });
  else L.push({ r: 'Liberação', ic: 'env', ok: sim(d('LIBERADO')) || !!d('Data da Liberação'), dt: d('Data da Liberação'), on: { LIBERADO: 'Sim', 'Data da Liberação': 1 }, off: ['LIBERADO', 'Data da Liberação'] });
  var n = 0; while (n < L.length && L[n].ok) n++;
  return { L: L, n: n, mono: mono };
}
function marcarEtapa(i) {
  var E = etapas(), x = E.L[i]; if (!x) return;
  if (i === E.n) Object.keys(x.on).forEach(function (k) { marcar('producao.' + k, x.on[k] === 1 ? hojeIso() : x.on[k]); });
  else if (i === E.n - 1) x.off.forEach(function (k) { marcar('producao.' + k, ''); });
  else return;
  agendar(500); render();
}
function iniciais(v) { var p = S(v).split(/\s+/).filter(Boolean); return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '—'; }
function diasDesde(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(v)) || /^(\d{2})\/(\d{2})\/(\d{4})/.exec(S(v)); if (!m) return null; var d = m[1].length === 4 ? new Date(+m[1], m[2] - 1, +m[3]) : new Date(+m[3], m[2] - 1, +m[1]); return Math.max(0, Math.floor((Date.now() - d) / 864e5)); }
function cabeca(s) {
  var R = {};
  ['Autuação', 'Partes'].forEach(function (n) { var g = grupoModelo(n); (g ? g.campos : []).forEach(function (c) { R[c.rotulo] = valorDe(c); }); });
  var classe = R['Classe'] || fonteVal({ fonte: ['classe_judicial', 'Classe'] }), assunto = R['Assunto CNJ'] || fonteVal({ fonte: ['Assunto'] });
  var abrev = (pjeDoProcesso() ? window.MutaPje.classe() : '') || classe.split(/\s*[\/(]/)[0];
  var tarefa = (pjeDoProcesso() && window.MutaPje.tarefa && window.MutaPje.tarefa()) || fonteVal({ fonte: ['tarefa_atual'] });
  var dias = diasDesde(fonteVal({ fonte: ['data_entrada_tarefa'] }));
  var AL = window.MutaAutos && window.MutaAutos.estado().itens ? window.MutaAutos.alertas().filter(function (a) { return a.nivel === 'al'; }) : [];
  var E = etapas(), FASE = E.mono ? ['Para minuta', 'Para revisão', 'Para envio', 'Para assinatura', 'Assinada'] : ['Para minuta', 'Para correção', 'Para liberação', 'Liberado'];
  var partes = S(R['Polo ativo']) ? S(R['Polo ativo']) + (S(R['Polo passivo']) ? ' x ' + S(R['Polo passivo']) : '') : S(R['Partes (texto da pauta)']);
  var tipoJ = S(V('triagem', 'Tipo de Julgamento')) || S(V('triagem', 'Padrão - Espécie'));
  var dl = [['Órgão julgador', 'Órgão julgador'], ['Seção', 'Seção competente'], ['Distribuição', 'Distribuição'], ['1º grau', 'Distribuição no 1º grau'], ['Valor da causa', 'Valor da causa'], ['Prioridade', 'Prioridade'], ['Sigilo', 'Sigiloso']]
    .filter(function (x) { return S(R[x[1]]) && !/^(não|nao|n|false|0)$/i.test(S(R[x[1]])); })
    .map(function (x) { var v = S(R[x[1]]); if (/^(true|sim|s)$/i.test(v)) v = 'Sim'; else if (x[0] === 'Valor da causa') v = moeda(v); else v = fmtV(R[x[1]]);
      return '<div' + (x[0] === 'Prioridade' || x[0] === 'Sigilo' ? ' class="pri"' : '') + '><dt>' + esc(x[0]) + '</dt><dd>' + esc(v) + '</dd></div>'; }).join('');
  var polo = function (rot, p, a) { return S(R[p]) ? '<div class="pc-p"><span>' + esc(rot) + '</span><b>' + esc(R[p]) + '</b>' + (S(R[a]) ? '<small>Adv.: ' + esc(R[a]) + '</small>' : '') + '</div>' : ''; };
  var polos = polo('Polo ativo', 'Polo ativo', 'Advogado do polo ativo') + polo('Polo passivo', 'Polo passivo', 'Advogado do polo passivo') +
    (S(R['DPU']) && !/^(não|nao)$/i.test(S(R['DPU'])) ? '<div class="pc-p"><span>DPU</span><b>' + esc(R['DPU']) + '</b></div>' : '') +
    (S(R['MPF']) && !/^(não|nao)$/i.test(S(R['MPF'])) ? '<div class="pc-p"><span>MPF</span><b>' + esc(R['MPF']) + '</b></div>' : '');
  var etq = S(R['Etiquetas do PJe']).split(/\s*[;,|]\s*/).filter(Boolean);
  var pills = ORD_CE.filter(function (g) { return g !== 'monocratica' && vale(g); }).map(function (g) { return '<button type="button" class="gp ' + g + '" data-ir="g-ctl" title="Abrir o controle">' + ROT_CE[g] + '</button>'; }).join('');
  var et = E.L.map(function (x, i) {
    var cls = x.ok ? 'ok' : i === E.n ? 'at' : '', t = i === E.n ? 'Marcar hoje' : i === E.n - 1 ? 'Desfazer' : x.ok ? 'Feita' : 'Depois da etapa anterior';
    return '<button type="button" class="pm-e ' + cls + '" data-et="' + i + '" title="' + t + '">' + (i === E.n ? '<em>agora</em>' : '') + '<span class="pm-o">' + SV(IC[x.ic], 14) + '</span><b>' + esc(x.r) + '</b><small>' + (x.dt ? esc(brD(x.dt).slice(0, 5)) : '—') + '</small></button>';
  }).join('');
  var pess = function (k, rot) { var v = S(V('producao', k)); return '<button type="button" class="pm-pp' + (v ? '' : ' vz') + '" data-ir-p="' + k + '" title="Designação em Produção"><span class="pm-av">' + esc(v ? iniciais(v) : '—') + '</span><span class="pm-pn"><small>' + rot + '</small>' + esc(v || 'não designado') + '</span></button>'; };
  return '<section class="pc pm">' +
    '<div class="pm-top"><span class="pm-fase">' + FASE[Math.min(E.n, FASE.length - 1)] + '</span>' + (dias != null ? '<span class="pm-dd' + (dias > 30 ? ' al' : '') + '">' + dias + ' dias na tarefa<i><i style="width:' + Math.min(100, dias / 60 * 100) + '%"></i></i></span>' : '') + '<span class="sp"></span>' + pills + '</div>' +
    '<div class="pm-l1"><button type="button" class="mono pc-cnj" data-copia="' + esc(G.cnj) + '" title="Copiar o número">' + esc(G.cnj) + '</button>' + (abrev ? '<span class="pc-cl" title="' + esc(classe) + '">' + esc(abrev) + '</span>' : '') +
      (AL.length ? '<button type="button" class="pm-al" data-aba="Triagem" title="' + esc(AL.map(function (a) { return a.t; }).join(' · ')) + '">' + AL.length + ' alerta' + (AL.length > 1 ? 's' : '') + '</button>' : '') + '</div>' +
    '<p class="pm-as">' + (assunto ? '<b>' + esc(assunto) + '</b>' : '') + (tipoJ ? '<span>' + esc(tipoJ) + '</span>' : classe ? '<span>' + esc(classe) + '</span>' : '') + '</p>' +
    (tarefa ? '<p class="pc-tf">' + esc(tarefa) + '</p>' : '') +
    (partes ? '<p class="pm-pt" title="' + esc(partes) + '">' + SV(IC.pt, 14) + '<span>' + esc(partes) + '</span></p>' : '') +
    ((dl || polos || etq.length) ? '<details class="pm-aut"><summary>Autuação e partes</summary>' + (dl ? '<dl class="pc-dl">' + dl + '</dl>' : '') + (polos ? '<div class="pc-ps">' + polos + '</div>' : '') +
      (etq.length ? '<div class="pc-etq">' + etq.map(function (e) { return '<span class="chip">' + esc(e) + '</span>'; }).join('') + '</div>' : '') + '</details>' : '') +
    '<p class="pm-sh">' + SV(IC.et, 14) + 'Etapas<i>toque para marcar hoje</i></p>' +
    '<div class="pm-et" style="--n:' + E.L.length + '"><i class="pm-ln"><i style="width:' + (E.L.length > 1 ? Math.min(E.n, E.L.length - 1) / (E.L.length - 1) * 100 : 0) + '%"></i></i>' + et + '</div>' +
    '<div class="pm-resp">' + pess('SERVIDOR', 'Minuta') + pess('CORRETOR', E.mono ? 'Revisão' : 'Correção') + '</div>' +
    '<div class="pc-u"><span>' + esc(s.usuario) + (s.gestor ? ' · gestor' : '') + '</span><button type="button" class="lnk" data-g="atualizar">Atualizar</button><a class="lnk" target="_blank" rel="noopener noreferrer" href="' + SITE + '/exofficio/">Ex Officio</a><button type="button" class="lnk" data-sair>Sair</button></div>' +
    '</section>';
}
/* sinalizações: pendências e intercorrências da ficha, uma por linha ("✓ " no início = resolvida) */
var SN = [['pd', 'Pendência', 'triagem', 'O que falta sanar'], ['ic', 'Intercorrência', 'triagem', 'Intercorrências']];
function snLinhas(t) { var x = SN.filter(function (q) { return q[0] === t; })[0]; return S(V(x[2], x[3])).split(/\n+/).map(S).filter(Boolean); }
function snGravar(t, L) { var x = SN.filter(function (q) { return q[0] === t; })[0]; marcar(x[2] + '.' + x[3], L.join('\n')); agendar(500); render(); }
function sinalizacoes() {
  var cont = {}, itens = [];
  SN.forEach(function (q) { snLinhas(q[0]).forEach(function (l, i) { var ok = /^✓\s*/.test(l); if (!ok) cont[q[0]] = (cont[q[0]] || 0) + 1; itens.push({ t: q[0], r: q[1], i: i, ok: ok, tx: l.replace(/^✓\s*/, '') }); }); });
  itens.sort(function (a, b) { return a.ok - b.ok; });
  var tag = function (t) { return t === 'ic' ? '<em class="sn-st ic">' + cont.ic + ' intercorrência' + (cont.ic > 1 ? 's' : '') + '</em>' : '<em class="sn-st pd">' + cont.pd + ' pendência' + (cont.pd > 1 ? 's' : '') + '</em>'; };
  return '<section class="card pc-sec sn" id="g-sn"><div class="pc-sh"><h3>' + SV(IC.sn, 13) + ' Sinalizações</h3>' + (cont.ic ? tag('ic') : '') + (cont.pd ? tag('pd') : '') + (!cont.ic && !cont.pd ? '<small class="muted">nada em aberto</small>' : '') + '</div>' +
    (itens.length ? '<ul class="sn-l">' + itens.map(function (x) {
      var m = /^(.*?)\s*·\s*([^·]{2,40})\s*·\s*(\d{2}\/\d{2}(?:\/\d{4})?)$/.exec(x.tx);
      return '<li class="sn-i ' + x.t + (x.ok ? ' ok' : '') + '"><input type="checkbox" data-sn-ok="' + x.t + ':' + x.i + '"' + (x.ok ? ' checked' : '') + ' aria-label="Resolvida"><div><span class="sn-tp ' + x.t + '">' + x.r + '</span><p>' + esc(m ? m[1] : x.tx) + '</p>' + (m ? '<small>' + esc(m[2] + ' · ' + m[3]) + '</small>' : '') + '</div><button type="button" class="sn-x" data-sn-x="' + x.t + ':' + x.i + '" title="Excluir" aria-label="Excluir">×</button></li>';
    }).join('') + '</ul>' : '') +
    '<div class="sn-n"><select id="sn-tp" aria-label="Tipo">' + SN.map(function (q) { return '<option value="' + q[0] + '"' + (G.snTp === q[0] ? ' selected' : '') + '>' + q[1] + '</option>'; }).join('') + '</select><input type="text" id="sn-tx" placeholder="Nova sinalização: descreva e tecle Enter"></div>' +
    '<small class="muted sn-h">Intercorrência retém a liberação; pendência é aviso.</small></section>';
}
function snIncluir() {
  var i = $('sn-tx'), t = ($('sn-tp') || {}).value || 'pd', v = i ? S(i.value) : ''; if (!v) return;
  var u = ses.estado().usuario || '', d = new Date(), L = snLinhas(t);
  L.push(v + ' · ' + (u || 'equipe') + ' · ' + pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1)); G.snTp = t; snGravar(t, L);
}
/* notas sobre o caso: log em origem.Observações ("DD/MM/AAAA HH:MM · autor · texto"), a nova no fim */
function notasL() { return S(V('origem', 'Observações')).split(/\n+/).map(S).filter(Boolean); }
function notas() {
  var L = notasL();
  return '<section class="card pc-sec nt" id="g-nt"><div class="pc-sh"><h3>' + SV(IC.nt, 13) + ' Notas sobre o caso</h3><small class="muted">' + (L.length || 'nenhuma') + '</small><span class="sp"></span><button type="button" class="btn solid sm" data-nt-add title="Ctrl+Enter">+ Incluir nota</button></div>' +
    (L.length ? '<ol class="nt-l">' + L.map(function (l, i) { var m = /^(\d{2}\/\d{2}\/\d{4}(?: \d{2}:\d{2})?)\s*·\s*(?:([^·]{2,40}?)\s*·\s*)?(.+)$/.exec(l);
      return '<li><p>' + esc(m ? m[3] : l) + '</p>' + (m ? '<small>' + esc([m[2], m[1]].filter(Boolean).join(' · ')) + '</small>' : '') + '<button type="button" class="sn-x" data-nt-x="' + i + '" title="Excluir esta nota" aria-label="Excluir">×</button></li>'; }).join('') + '</ol>' : '') +
    '<textarea id="nt-tx" rows="2" placeholder="Nova nota: síntese, observação, lembrete para quem vai revisar… (Ctrl+Enter inclui)"></textarea></section>';
}
function notaIncluir() { var t = $('nt-tx'), v = t ? S(t.value).replace(/\s*\n+\s*/g, ' ') : ''; if (!v) { if (t) t.focus(); return; } var L = notasL(); L.push(agoraBr() + ' · ' + (ses.estado().usuario || 'equipe') + ' · ' + v); marcar('origem.Observações', L.join('\n')); agendar(500); render(); }
/* decisão da monocrática em botões, como na gaveta da pauta */
/* a mesma chave pode estar na ficha como texto e como lista: aqui vale a lista */
function campoLista(sec, chave) { var c = null; ((G.F && G.F.abas) || []).forEach(function (a) { (a.grupos || []).forEach(function (g) { (g.campos || []).forEach(function (x) { if (!c && x.chave === chave && (x.secao || '') === sec && x.tipo === 'lista') c = x; }); }); }); return c || campoModelo(sec, chave); }
function chips(sec, chave, curto) {
  var c = campoLista(sec, chave) || {}, v = S(V(sec, chave));
  var O = (c.opcoes || []).map(function (o) { return typeof o === 'string' ? o : o.valor; });
  return '<div class="pm-seg">' + O.map(function (o) { var r = curto ? o.split(' · ')[0] : o; return '<button type="button" class="pm-ch' + (o === v ? ' on' : '') + ' ' + (/provimento|provido|deferido/i.test(o) ? (/negado|indeferido/i.test(o) ? 'neg' : /parcial/i.test(o) ? 'par' : 'pos') : /não conhec|prejudic|extint/i.test(o) ? 'neu' : '') + '" data-ch="' + esc(sec + '.' + chave) + '" data-v="' + esc(o) + '" title="' + esc(o) + '">' + esc(r) + '</button>'; }).join('') + '</div>';
}
function decisaoMono() {
  var ts = S(V('producao', 'Tópico-síntese'));
  return '<section class="card pc-sec pm-dec"><div class="pc-sh"><h3>' + SV(IC.dc, 13) + ' Decisão</h3><small class="muted">art. 932 do CPC</small></div>' +
    '<p class="pm-lb">Hipótese do art. 932</p>' + chips('triagem', 'Hipóteses Monocrática', true) +
    '<p class="pm-lb">Resultado</p>' + chips('producao', 'Voto - Resultado') +
    '<div class="pm-r2">' + (function () { var c = campoLista('producao', 'Voto - Honorários'); return c ? campo(Object.assign({}, c, { rotulo: 'Honorários' })) : ''; })() +
    '<div class="gf"><span class="gl">Tópico-síntese</span><span class="seg">' + ['Sim', 'Não'].map(function (x) { return '<button type="button" data-ch="producao.Tópico-síntese" data-v="' + x + '" aria-selected="' + (ts === x) + '">' + x + '</button>'; }).join('') + '</span></div></div>' +
    campoRot('producao', 'Mono - Fundamento', 'Precedente ou fundamento') + '</section>';
}

function campoRot(sec, chave, rot) { var c = campoModelo(sec, chave); if (!c) return ''; return campo(Object.assign({}, c, { rotulo: rot || c.rotulo })); }
/* questões do processo: uma por linha do campo "Alegações" da ficha */
function questoes() {
  var v = S(V('triagem', 'Alegações')), L = v ? v.split(/\n+/).map(S).filter(Boolean) : [];
  if (G.qVazia) L.push('');
  return '<div class="gf w q-w"><span class="gl">Questões do processo</span><ol class="q-l">' + L.map(function (q, i) {
    return '<li><input type="text" data-q="' + i + '" value="' + esc(q) + '" placeholder="Questão a decidir"><button type="button" class="lnk" data-qdel="' + i + '" title="Tirar a questão">×</button></li>';
  }).join('') + '</ol><button type="button" class="btn line sm" data-qadd>+ Questão</button></div>';
}
function grupos(nomeAba, filtro, abrir) {
  var A = abaModelo(nomeAba); if (!A) return '';
  return A.grupos.filter(function (g) { return (!g.destino || g.destino === destino()) && grupoVisivel(g) && (!filtro || filtro(g)); })
    .map(function (g, i) { return grupoHtml(g, abrir ? abrir(g, i) : i < 2); }).join('');
}
function controlesProcesso() {
  var A = abaModelo(CE); if (!A) return '';
  var gs = A.grupos.filter(function (g) { return CTL_PROC.indexOf(g.controle) >= 0; });
  return '<section class="card pc-sec" id="g-ctl"><div class="pc-sh"><h3>Controles</h3><small class="muted">urgência, meta, sobrestamento e caso sensível</small></div>' + controles({ grupos: gs }) + '</section>';
}
function corpoProcesso() {
  var AU = window.MutaAutos, h = sinalizacoes() + notas();
  var ad = gravado('triagem', 'Registro - Assunto detalhado');
  h += '<section class="card pc-sec"><div class="pc-sh"><h3>Assunto e questões</h3></div><div class="gr">' +
    '<div class="gf w"><span class="gl">Assunto detalhado</span>' + (S(ad) ? '<span class="ro">' + esc(ad) + '</span>' : '<span class="ro muted">Vem do registro da triagem (Caput) quando houver.</span>') + '</div>' +
    campoRot('triagem', 'Síntese Processual', 'Síntese do processo') + questoes() + '</div></section>';
  if (AU) h += AU.htmlSituacao(gravado('triagem', 'Registro - Situação atual')) + AU.htmlDocs() + AU.htmlPreencher();
  h += grupos('Processo', function (g) { return !FORA_PROC[g.grupo]; }, function () { return true; });
  h += controlesProcesso();
  h += grupos('Processo', function (g) { return g.grupo === 'Registro no acervo' || g.grupo === 'Acompanhamento'; }, function () { return false; });
  return h;
}
function corpoTriagem() {
  var AU = window.MutaAutos, TR = window.MutaTriagem, h = '';
  if (AU) h += AU.htmlConferencia();
  if (TR && TR.etiquetasDe) h += TR.etiquetasDe(G.op, G.fo);
  var A = abaModelo('Triagem');
  if (A) h += A.grupos.filter(function (g) { return g.grupo !== 'Registro da triagem (lote)' && (!g.destino || g.destino === destino()) && grupoVisivel(g); }).map(function (g, i) {
    var g2 = Object.assign({}, g, { campos: g.campos.filter(function (c) { return !NO_TOPO[c.chave]; }) });
    return grupoHtml(g2, i < 2);
  }).join('');
  if (TR && TR.registroDe) h += TR.registroDe(G.op, G.fo);
  return h;
}
function corpoProducao() {
  var A = abaModelo('Produção'), h = '';
  if (!A) return '';
  if (A.seletor) {
    var dn = destino(), sv = destGrav();
    h += '<div class="gsel"><b>' + esc(A.seletor.rotulo) + '</b><span class="seg">' + A.seletor.opcoes.map(function (x) { var k = x.valor === 'Monocrática' ? 'monocratica' : 'sessao'; return '<button type="button" data-dest="' + esc(x.valor) + '" aria-selected="' + (dn === k && (x.valor || !sv)) + '">' + esc(x.rotulo) + '</button>'; }).join('') + '</span>' +
      '<small class="muted">' + (sv ? 'Destino gravado: ' + esc(sv) : 'Destino ainda não definido') + '</small></div>';
  }
  var mono = destino() === 'monocratica';
  if (mono) h += decisaoMono();
  /* o que já está no cabeçalho (etapas) e na Decisão em botões não se repete nos grupos */
  var JA = { MINUTADO: 1, CORRIGIDO: 1, 'Data da Revisão': 1, LIBERADO: 1, 'Data da Liberação': 1, Assinado: 1, 'Data da Assinatura': 1 };
  if (mono) ['Hipóteses Monocrática', 'Voto - Resultado', 'Voto - Honorários', 'Tópico-síntese', 'Mono - Fundamento'].forEach(function (k) { JA[k] = 1; });
  h += A.grupos.filter(function (g) { return (!g.destino || g.destino === destino()) && grupoVisivel(g); })
    .map(function (g) { return Object.assign({}, g, { campos: g.campos.filter(function (c) { return !JA[c.chave]; }) }); })
    .filter(function (g) { return g.campos.length; })
    .map(function (g, i) { return grupoHtml(g, i < 2); }).join('');
  if (destino() === 'monocratica') {
    var C = abaModelo(CE), gm = C ? C.grupos.filter(function (g) { return g.controle === 'monocratica'; }) : [];
    if (gm.length) h += '<section class="card pc-sec"><div class="pc-sh"><h3>Monocrática</h3><small class="muted">controle da monocrática</small></div>' + controles({ grupos: gm }) + '</section>';
  } else h += grupos(PAUTA_ABA, null, function () { return true; });
  return h;
}
var PAUTA_ABA = 'Pauta';
/* Roteiro: a triagem em passos, pelo tipo de julgamento (roteiro.js) */
function gRot() { return { V: V, F: function (k) { return fonteVal({ fonte: [k] }); }, cnj: function () { return G.cnj; }, marcar: marcar, gravar: function () { return gravarJa(); } }; }
function corpoRoteiro() { return window.MutaRoteiro ? window.MutaRoteiro.html(gRot(), campoRot, questoes) : '<div class="empty">Roteiro indisponível.</div>'; }
function render() {
  if (!caixa) return;
  var s = ses.estado();
  if (s.estado === 'verificando') { caixa.innerHTML = '<div class="empty">Verificando a sessão do Ex Officio…</div>'; return; }
  if (s.estado !== 'on') { ses.formulario(caixa, 'Entrar para ver o prontuário do processo'); return; }
  if (!G.cnj) { caixa.innerHTML = '<div class="empty"><h3>Nenhum processo aberto</h3>Abra os autos ou a tarefa no PJe, ou escolha um processo na lista acima.<div class="pc-u"><span>' + esc(s.usuario) + (s.gestor ? ' · gestor' : '') + '</span><button type="button" class="lnk" data-sair>Sair</button></div></div>'; return; }
  var st0 = '<p class="status" id="g-st" role="status" aria-live="polite"></p>';
  if (G.carregando) { caixa.innerHTML = '<div class="pc"><div class="pc-n"><span class="mono pc-cnj">' + esc(G.cnj) + '</span></div></div><div class="empty">Lendo o prontuário do processo…</div>' + st0; stEl = $('g-st'); return; }
  if (G.erro) { caixa.innerHTML = '<div class="pc"><div class="pc-n"><span class="mono pc-cnj">' + esc(G.cnj) + '</span><span class="sp"></span><button type="button" class="lnk" data-g="atualizar">Atualizar</button></div></div><div class="err-box">Não foi possível ler o prontuário: ' + esc(G.erro) + '</div>' + st0; stEl = $('g-st'); return; }
  if (!G.F) { caixa.innerHTML = st0; stEl = $('g-st'); return; }
  if (MODOS.indexOf(G.aba) < 0) G.aba = 'Processo';
  var nAl = window.MutaAutos && window.MutaAutos.estado().itens ? window.MutaAutos.alertas().filter(function (a) { return a.nivel === 'al'; }).length : 0;
  var tabs = '<div class="seg gtabs pmodos" role="tablist" aria-label="Parte do prontuário">' + MODOS.map(function (a) {
    return '<button type="button" role="tab" data-aba="' + a + '" aria-selected="' + (a === G.aba) + '">' + a + (a === 'Triagem' && nAl ? ' <i class="gnum">' + nAl + '</i>' : '') + '</button>'; }).join('') + '</div>';
  var corpo = G.aba === 'Triagem' ? corpoTriagem() : G.aba === 'Roteiro' ? corpoRoteiro() : G.aba === 'Produção' ? corpoProducao() : corpoProcesso();
  var ab = document.activeElement && document.activeElement.dataset ? (document.activeElement.dataset.fk || (document.activeElement.dataset.esp ? 'esp:' + document.activeElement.dataset.esp : '') || (document.activeElement.dataset.q != null ? 'q:' + document.activeElement.dataset.q : '')) : '';
  var y = window.scrollY, pp = $('panel-pront'), yp = pp ? pp.scrollTop : 0;
  caixa.innerHTML = cabeca(s) + tabs + st0 + '<div class="gbody">' + corpo + '</div>';
  stEl = $('g-st');
  if (ab) {
    var sel = /^esp:/.test(ab) ? '[data-esp="' + ab.slice(4) + '"]' : /^q:/.test(ab) ? '[data-q="' + ab.slice(2) + '"]' : '[data-fk="' + ab.replace(/"/g, '\\"') + '"]';
    var f = caixa.querySelector(sel); if (f) { f.focus({ preventScroll: true }); try { var n = f.value.length; f.setSelectionRange(n, n); } catch (e) {} }
  }
  window.scrollTo(0, y); if (pp) pp.scrollTop = yp;
}
function st(t, c) { if (!stEl) stEl = $('g-st'); if (stEl) { stEl.textContent = t || ''; stEl.className = 'status' + (c ? ' ' + c : ''); } }

/* ---------- gravação ---------- */
function agendar(ms) { clearTimeout(G.t); G.t = setTimeout(function () { gravarJa().catch(function () {}); }, ms); st('Alterações a gravar…'); }
function gravarJa(keepalive) {
  clearTimeout(G.t); G.t = null;
  var P = G.pend, ks = Object.keys(P), cnj = G.pendCnj || G.cnj;
  if (!ks.length || !cnj) return Promise.resolve();
  G.pend = {}; G.pendCnj = '';
  st('Gravando no prontuário…');
  var corpo = JSON.stringify({ cnj: cnj, campos: P });
  if (keepalive) {
    try { fetch(SITE + '/api/pauta?ficha=1', { method: 'POST', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: corpo }); } catch (e) {}
    return Promise.resolve();
  }
  return ses.api('/api/pauta?ficha=1', { method: 'POST', body: corpo }).then(function (j) {
    if (cnj === G.cnj) { G.op = j.operacional || G.op; render(); }
    var rec = j.recusados || [];
    st(rec.length ? 'Gravado, exceto (sem permissão): ' + rec.join(', ') : j.semMudanca ? 'Nada mudou no prontuário.' : 'Gravado na ficha do processo' + ((j.cartoes || []).length ? ' e no cartão da pauta' : '') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '.', rec.length ? 'err' : 'ok');
    return j;
  }).catch(function (e) {
    if (cnj === G.cnj) { Object.keys(P).forEach(function (k) { if (!(k in G.pend)) G.pend[k] = P[k]; }); G.pendCnj = cnj; }
    st('Não gravou: ' + e.message + (e.status === 401 ? ' Entre de novo.' : ''), 'err');
    throw e;
  });
}
function marcar(id, v) { G.pend[id] = v; G.pendCnj = G.cnj; }
function copiar(t, el) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { if (el) { var o = el.textContent; el.textContent = 'Copiado'; setTimeout(function () { el.textContent = o; }, 1100); } }, function () {}); }
function questoesDe(sem) {
  var L = Array.prototype.map.call(caixa.querySelectorAll('[data-q]'), function (i) { return S(i.value); });
  if (sem != null) L.splice(sem, 1);
  return L.filter(Boolean).join('\n');
}

caixa.addEventListener('change', function (e) {
  var t = e.target;
  if (t.dataset && t.dataset.sg != null) { if (window.MutaAutos) window.MutaAutos.marcarSugestao(Number(t.dataset.sg), t.checked); return; }
  if (t.dataset && t.dataset.esp) { if (window.MutaAutos) window.MutaAutos.especificarJa(t.dataset.esp); return; }
  if (t.dataset && t.dataset.snOk) { var po = t.dataset.snOk.split(':'), Lo = snLinhas(po[0]), io = Number(po[1]); if (Lo[io] != null) Lo[io] = t.checked ? '✓ ' + Lo[io].replace(/^✓\s*/, '') : Lo[io].replace(/^✓\s*/, ''); snGravar(po[0], Lo); return; }
  if (t.id === 'sn-tp') { G.snTp = t.value; return; }
  if (t.dataset && t.dataset.rtc) { if (window.MutaRoteiro) window.MutaRoteiro.conferir(t.dataset.rtc, t.checked, gRot()); render(); return; }
  if (!t.dataset || !t.dataset.fk) return;
  marcar(t.dataset.fk, t.value); var l = t.closest('label'); if (l) l.classList.add('mud');
  agendar(900);
  if (/^(triagem\.(Urgência|Padrão - Espécie)|producao\.Destino|controles\.Sensível - (In|Ex)cluído)$/.test(t.dataset.fk) || G.aba === 'Roteiro') render();
});
caixa.addEventListener('keydown', function (e) {
  if (e.target.id === 'sn-tx' && e.key === 'Enter') { e.preventDefault(); snIncluir(); }
  else if (e.target.id === 'nt-tx' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); notaIncluir(); }
});
caixa.addEventListener('input', function (e) {
  var t = e.target;
  if (t.dataset && t.dataset.esp) { if (window.MutaAutos) window.MutaAutos.especificar(t.dataset.esp, t.value); return; }
  if (t.dataset && t.dataset.q != null) { G.qVazia = false; marcar('triagem.Alegações', questoesDe()); agendar(1800); return; }
  if (!t.dataset || !t.dataset.fk || t.tagName === 'SELECT') return;
  marcar(t.dataset.fk, t.value); var l = t.closest('label'); if (l) l.classList.add('mud');
  agendar(1800);
});
caixa.addEventListener('click', function (e) {
  var b = e.target.closest('button,a'); if (!b) return;
  if (b.dataset.au != null) { if (window.MutaAutos) window.MutaAutos.clique(b); return; }
  if (b.dataset.et != null) { marcarEtapa(Number(b.dataset.et)); return; }
  if (b.dataset.irP) { G.aba = 'Produção'; render(); return; }
  if (b.dataset.snX) { var px = b.dataset.snX.split(':'), Lx = snLinhas(px[0]); Lx.splice(Number(px[1]), 1); snGravar(px[0], Lx); return; }
  if (b.hasAttribute('data-nt-add')) { notaIncluir(); return; }
  if (b.dataset.ntX != null) { var Ln = notasL(); Ln.splice(Number(b.dataset.ntX), 1); marcar('origem.Observações', Ln.join('\n')); agendar(500); render(); return; }
  if (b.dataset.ch) { var cv = S(V.apply(null, [b.dataset.ch.slice(0, b.dataset.ch.indexOf('.')), b.dataset.ch.slice(b.dataset.ch.indexOf('.') + 1)])); marcar(b.dataset.ch, cv === b.dataset.v ? '' : b.dataset.v); agendar(500); render(); return; }
  if (b.dataset.rt != null) { if (window.MutaRoteiro && window.MutaRoteiro.clique(b, gRot())) render(); return; }
  if (b.dataset.copia) { copiar(b.dataset.copia, b); return; }
  if (b.dataset.aba) { G.aba = b.dataset.aba; render(); var pp = $('panel-pront'); if (pp) pp.scrollTop = 0; return; }
  if (b.dataset.ir) { G.aba = 'Processo'; render(); var alvo = $(b.dataset.ir); if (alvo) alvo.scrollIntoView({ block: 'start' }); return; }
  if (b.hasAttribute('data-qadd')) { G.qVazia = true; render(); var qs = caixa.querySelectorAll('[data-q]'); if (qs.length) qs[qs.length - 1].focus(); return; }
  if (b.dataset.qdel != null) { G.qVazia = false; marcar('triagem.Alegações', questoesDe(Number(b.dataset.qdel))); agendar(600); render(); return; }
  if (b.dataset.add) {
    var L = S(V('triagem', 'Etiquetas sugeridas')).split(/\s*[;,|]\s*/).filter(Boolean);
    if (!L.some(function (x) { return N(x) === N(b.dataset.add); })) L.push(b.dataset.add);
    marcar('triagem.Etiquetas sugeridas', L.join('; ')); agendar(400); render(); return;
  }
  if (b.dataset.etqCopia != null) { copiar(S(V('triagem', 'Etiquetas sugeridas')), b); return; }
  if (b.dataset.t === 'cmp') { if (window.MutaComparar && window.MutaComparar.triagem) window.MutaComparar.triagem(); return; }
  if (b.hasAttribute('data-sair')) { gravarJa().catch(function () {}).then(function () { ses.sair(); }); return; }
  if (b.dataset.dest != null) { var v = b.dataset.dest; G.dest = v === 'Monocrática' ? 'monocratica' : 'sessao'; if (v !== destGrav()) { marcar('producao.Destino', v); agendar(300); } render(); return; }
  if (b.dataset.inc) { var g = b.dataset.inc, x = INC[g][1]; G.mostra[g] = true; if (x) { marcar(x[0], x[1]); agendar(300); } render(); return; }
  if (b.dataset.g === 'atualizar') { gravarJa().catch(function () {}).then(function () { carregar(true); }); return; }
  if (b.dataset.g === 'enviar') { enviar(); return; }
  if (b.dataset.g === 'trazer') { trazer(); return; }
});

/* ---------- prontuário completo ↔ ficha do gabinete ---------- */
function getP(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
function setP(o, p, v) { var a = p.split('.'), x = o; for (var i = 0; i < a.length - 1; i++) { if (x[a[i]] == null) x[a[i]] = {}; x = x[a[i]]; } x[a[a.length - 1]] = v; }
function inv(m) { var o = {}; Object.keys(m).forEach(function (k) { if (!(m[k] in o)) o[m[k]] = k; }); return o; }
var SIMNAO = { 'Sim': 'Sim', 'Não': 'Não' };
/* vocabulário único (vocabulario.js): rascunho e ficha usam os mesmos valores; extra converte os valores antigos do rascunho */
function VM(k, extra) { var o = {}; (typeof VOC !== 'undefined' ? VOC.lista(k) : []).forEach(function (v) { o[v] = v; }); Object.keys(extra || {}).forEach(function (x) { if (!(x in o)) o[x] = extra[x]; }); return o; }
var RES = { 'Dar provimento': 'Provido', 'Dar parcial provimento': 'Parcialmente provido', 'Negar provimento': 'Desprovido', 'Não conhecer': 'Não conhecido', 'Prejudicado': 'Prejudicado',
  'Rejeitar': 'Rejeitados', 'Acolher sem efeitos infringentes': 'Acolhidos sem efeito infringente', 'Acolher com efeitos infringentes': 'Acolhidos com efeito infringente',
  'Exercer a retratação': 'Retratação exercida', 'Manter o acórdão': 'Acórdão mantido' };
var HON = { 'Majorar (art. 85, § 11, CPC)': 'Majorados', 'Manter': 'Mantidos', 'Inverter': 'Invertidos', 'Fixar': 'Fixados', 'Redistribuir': 'Redistribuídos', 'Sem honorários recursais': 'Sem honorários recursais' };
var ESP = { ed: 'Embargos de declaração', agint: 'Agravo interno', jr: 'Juízo de retratação' };
/* [campo da ficha, caminho no rascunho, mapa rascunho→ficha (opcional), condição (opcional)] */
var MAPA = [
  ['triagem.Tempestividade', 'regularidade.tempestividade', VM('tempest', { 'Não Verificado': 'Não verificado', 'A conferir': 'Não verificado' })],
  ['triagem.Tempest - Publicação', 'regularidade.intimacao'],
  ['triagem.Preparo', 'regularidade.preparo', VM('preparo', { 'A conferir': 'Não verificado', 'Não Recolhido': 'Não recolhido' })],
  ['triagem.AJG', 'regularidade.ajg', 'bool'],
  ['triagem.DPU (controle)', 'regularidade.dpu', 'bool'],
  ['triagem.Representação', 'regularidade.representacao', VM('repres', { 'Irregular': 'Irregular – intimar', 'A conferir': 'Não verificado' })],
  ['triagem.ID da Procuração', 'regularidade.procuracaoId'],
  ['triagem.Mídias', 'regularidade.midias', VM('midias', { 'Juntada': 'Juntadas', 'Faltante': 'Faltantes' })],
  ['triagem.Impedimento / Suspeição', 'regularidade.impedimento', { 'Impedimento': 'Impedimento', 'Suspeição': 'Suspeição' }],
  ['triagem.MPF - Custos Legis', 'regularidade.mpfAtuacao', VM('mpf', { 'Não': 'Sem hipótese' })],
  ['triagem.MPF', 'regularidade.mpfParecer', VM('parecer', { 'Com Parecer': 'Com parecer', 'Sem Parecer': 'Aguardando parecer' })],
  ['triagem.Parecer - Sentido', 'regularidade.mpfSentido', { 'Prosseguimento do feito': 'Prosseguimento do feito', 'Provimento do recurso': 'Provimento do recurso', 'Não provimento do recurso': 'Não provimento do recurso', 'Outro': 'Outro' }],
  ['triagem.ID do Parecer MPF', 'regularidade.mpfId'],
  ['triagem.MPF - Info adicional', 'regularidade.mpfInfo'],
  ['origem.Origem - Juízo', 'origem.juizo'],
  ['origem.Origem - Julgador', 'origem.julgador'],
  ['origem.Sentença - ID', 'origem.decisaoId', null, function (f) { return f.origem.decisao === 'Sentença'; }],
  ['origem.Sentença - Data', 'origem.decisaoData', null, function (f) { return f.origem.decisao === 'Sentença'; }],
  ['triagem.Tema', 'caso.subassunto'],
  ['triagem.Etiquetas', 'caso.etiquetas'],
  ['triagem.META', 'caso.meta'],
  ['triagem.Síntese Processual', 'triagem.resumo'],
  ['triagem.O que falta sanar', 'triagem.pendencias'],
  ['triagem.Padrão - Espécie', 'caso.tipoManual', ESP],
  ['triagem.Impugnada - ID', 'recursoTipo.edId', null, function (f) { return f.caso.tipoManual === 'ed'; }],
  ['triagem.Impugnada - Data', 'recursoTipo.edData', null, function (f) { return f.caso.tipoManual === 'ed'; }],
  ['triagem.Impugnada - Órgão', 'recursoTipo.edOrgao', null, function (f) { return f.caso.tipoManual === 'ed'; }],
  ['triagem.ED - Vício', 'recursoTipo.edVicios'],
  ['triagem.ED - Ponto', 'recursoTipo.edPonto'],
  ['triagem.Impugnada - ID', 'recursoTipo.agintId', null, function (f) { return f.caso.tipoManual === 'agint'; }],
  ['triagem.Impugnada - Data', 'recursoTipo.agintData', null, function (f) { return f.caso.tipoManual === 'agint'; }],
  ['triagem.Impugnada - Síntese', 'recursoTipo.agintSintese', null, function (f) { return f.caso.tipoManual === 'agint'; }],
  ['triagem.AgInt - Fundamentos', 'recursoTipo.agintFundamentos'],
  ['triagem.Retratação - Tribunal', 'recursoTipo.jrTribunal', { 'STF': 'STF', 'STJ': 'STJ' }],
  ['triagem.Retratação - Precedente', 'recursoTipo.jrPrecedente'],
  ['triagem.Retratação - Síntese', 'recursoTipo.jrQuestao'],
  ['triagem.Retratação - Devolução ID', 'recursoTipo.jrDevolucaoId'],
  ['triagem.Retratação - Devolução mês', 'recursoTipo.jrDevolucaoMes'],
  ['triagem.Retratação - ED', 'recursoTipo.jrEd', { 'Opostos e rejeitados': 'Rejeitados', 'Opostos e acolhidos': 'Acolhidos', 'Parcialmente acolhidos': 'Parcialmente acolhidos', 'Não conhecidos': 'Não conhecidos' }],
  ['producao.Voto - Resultado', 'julgamento.resultado', 'res'],
  ['producao.Voto - Honorários', 'julgamento.honorarios', HON],
  ['producao.Voto - Descrição', 'julgamento.fundamentacao'],
  ['pauta.Status de Julgamento', 'julgamento.situacao', { 'EM MESA': 'EM MESA', 'ADIADO': 'ADIADO', 'RETIRADO DE PAUTA': 'RETIRADO DE PAUTA' }],
  ['producao.MINUTADO', 'workflow.minutadoEm'],
  ['producao.Data da Revisão', 'workflow.corrigidoEm'],
  ['producao.Data da Liberação', 'workflow.liberadoEm'],
  ['producao.SERVIDOR', 'caso.servidor', null, function () { return G.gestor; }],
  ['producao.CORRETOR', 'caso.corretor', null, function () { return G.gestor; }],
  ['origem.Observações', 'observacoes']
];
function paraFicha(m, v) {
  if (m === 'bool') return v === true ? 'Sim' : '';
  if (typeof v !== 'string' || !S(v)) return '';
  if (m === 'res') return RES[v] || v;
  if (m) return m[v] || '';
  return v;
}
function paraRascunho(m, v) {
  v = S(v); if (!v) return undefined;
  if (m === 'bool') return /^(sim|s|true|1|x)$/i.test(v) ? true : undefined;
  if (m === 'res') return inv(RES)[v] || v;
  if (m) { var i = inv(m); return i[v]; }
  return v;
}
function rascunho() {
  var full = window.MutaProntuarioFull && window.MutaProntuarioFull.getState ? window.MutaProntuarioFull.getState() : br.getFull();
  return br.getFullSanitized(JSON.parse(JSON.stringify(full)));
}
function enviar() {
  if (!G.F || !G.cnj) return;
  var f = rascunho(), C = {}, troca = [];
  MAPA.forEach(function (e) {
    if (e[3] && !e[3](f)) return;
    var fv = paraFicha(e[2], getP(f, e[1]));
    if (!fv) return;
    var i = e[0].indexOf('.'), atual = S(V(e[0].slice(0, i), e[0].slice(i + 1)));
    if (atual === fv) return;
    C[e[0]] = fv; if (atual) troca.push(e[0].slice(i + 1));
  });
  /* data de correção ou de liberação enviada agora marca também o Sim correspondente (como faz o cartão da pauta) */
  if (C['producao.Data da Revisão'] && V('producao', 'CORRIGIDO') !== 'Sim') C['producao.CORRIGIDO'] = 'Sim';
  if (C['producao.Data da Liberação'] && V('producao', 'LIBERADO') !== 'Sim') C['producao.LIBERADO'] = 'Sim';
  var ks = Object.keys(C);
  if (!ks.length) { st('Nada a enviar: a ficha já tem o que está no rascunho (ou o rascunho está vazio).', 'ok'); return; }
  var nomes = ks.map(function (k) { return k.slice(k.indexOf('.') + 1); });
  var msg = ks.length + ' campo(s) do rascunho serão gravados na ficha do gabinete de ' + G.cnj + ': ' + nomes.slice(0, 14).join(', ') + (nomes.length > 14 ? ' e mais ' + (nomes.length - 14) : '') + '.' +
    (troca.length ? '\n\nSubstituem o que já está na ficha: ' + troca.join(', ') + '.' : '') + '\n\nA ficha é a mesma do Ex Officio: a equipe passa a ver estes valores.';
  Muta.confirmar(msg, 'Gravar na ficha').then(function (ok) {
    if (!ok) return;
    ks.forEach(function (k) { marcar(k, C[k]); });
    gravarJa().catch(function () {});
  });
}
function trazer() {
  if (!G.F || !G.cnj) return;
  var f = rascunho(), n = 0, vazio = function (v) { return v == null || v === '' || v === false; };
  var padrao = { 'regularidade.impedimento': 'Sem impedimento', 'julgamento.situacao': 'PAUTADO' };
  var esp = S(V('triagem', 'Padrão - Espécie'));
  function vale(e) {
    if (/^recursoTipo\.ed(Id|Data|Orgao)$/.test(e[1])) return esp === ESP.ed || f.caso.tipoManual === 'ed';
    if (/^recursoTipo\.agint(Id|Data|Sintese)$/.test(e[1])) return esp === ESP.agint || f.caso.tipoManual === 'agint';
    return true;
  }
  MAPA.forEach(function (e) {
    if (!vale(e)) return;
    var i = e[0].indexOf('.'), fv = V(e[0].slice(0, i), e[0].slice(i + 1));
    if (typeof fv !== 'string') return;
    var lv = paraRascunho(e[2], fv); if (lv === undefined) return;
    var atual = getP(f, e[1]);
    if (!vazio(atual) && atual !== padrao[e[1]]) return;
    if (atual === lv) return;
    setP(f, e[1], lv); n++;
    if ((e[1] === 'origem.decisaoId' || e[1] === 'origem.decisaoData') && !f.origem.decisao) f.origem.decisao = 'Sentença';
  });
  /* identificação, a partir dos dados do acervo (fonte) */
  [['caso.classe', ['classe_judicial', 'Classe']], ['caso.autor', ['polo_ativo']], ['caso.reu', ['polo_passivo']], ['caso.assunto', ['Assunto']], ['caso.secao', ['Seção Competente']]].forEach(function (p) {
    var v = fonteVal({ fonte: p[1] }); if (v && vazio(getP(f, p[0]))) { setP(f, p[0], v); n++; }
  });
  if (!n) { st('Nada a trazer: os campos correspondentes do rascunho já estão preenchidos ou a ficha está vazia.', 'ok'); return; }
  if (window.MutaProntuarioFull && window.MutaProntuarioFull.setState) window.MutaProntuarioFull.setState(f);
  br.saveFull(f);
  st(n + ' campo(s) vazio(s) do prontuário preenchidos com a ficha. Os já preenchidos não mudaram. Veja em Prontuário completo.', 'ok');
}

/* ---------- ligações ---------- */
ses.ouvir(function () { if (modo === 'ficha') carregar(false); if (window.MutaLote) window.MutaLote.sessao(); });
document.addEventListener('muta:prontuario', function () { if (modo === 'ficha') carregar(false); else if (G.pend && Object.keys(G.pend).length) gravarJa().catch(function () {}); });
window.addEventListener('pagehide', function () { if (Object.keys(G.pend).length) gravarJa(true); });
document.addEventListener('visibilitychange', function () { if (document.hidden && Object.keys(G.pend).length) gravarJa().catch(function () {}); });
/* ---------- correspondência rascunho ↔ ficha, para a sincronia automática (sincronia.js) ---------- */
function opVal(op, id) { var i = id.indexOf('.'), s = (op || {})[id.slice(0, i)] || {}, v = s[id.slice(i + 1)]; return v == null ? '' : v; }
/* campos da ficha que o prontuário muda: só valores preenchidos e diferentes do que a ficha já tem */
function camposFicha(f, op, gestor) {
  var C = {};
  MAPA.forEach(function (e) {
    if (/^producao\.(SERVIDOR|CORRETOR)$/.test(e[0]) && !gestor) return;
    if (e[3] && !/^producao\.(SERVIDOR|CORRETOR)$/.test(e[0]) && !e[3](f)) return;
    var fv = paraFicha(e[2], getP(f, e[1]));
    if (!fv || S(opVal(op, e[0])) === fv) return;
    C[e[0]] = fv;
  });
  if (C['producao.Data da Revisão'] && opVal(op, 'producao.CORRIGIDO') !== 'Sim') C['producao.CORRIGIDO'] = 'Sim';
  if (C['producao.Data da Liberação'] && opVal(op, 'producao.LIBERADO') !== 'Sim') C['producao.LIBERADO'] = 'Sim';
  return C;
}
/* traz da ficha para o prontuário: preenche o vazio e, se a ficha é mais nova (substituir), troca o divergente */
function trazerFicha(f, op, fonte, substituir) {
  var n = [], vazio = function (v) { return v == null || v === '' || v === false; };
  var padrao = { 'regularidade.impedimento': 'Sem impedimento', 'julgamento.situacao': 'PAUTADO' };
  var esp = S(opVal(op, 'triagem.Padrão - Espécie'));
  MAPA.forEach(function (e) {
    if (/^recursoTipo\.ed(Id|Data|Orgao)$/.test(e[1]) && !(esp === ESP.ed || f.caso.tipoManual === 'ed')) return;
    if (/^recursoTipo\.agint(Id|Data|Sintese)$/.test(e[1]) && !(esp === ESP.agint || f.caso.tipoManual === 'agint')) return;
    var fv = opVal(op, e[0]);
    if (typeof fv !== 'string' || !S(fv)) return;
    var lv = paraRascunho(e[2], fv); if (lv === undefined) return;
    var atual = getP(f, e[1]);
    if (atual === lv) return;
    if (!vazio(atual) && atual !== padrao[e[1]] && !substituir) return;
    setP(f, e[1], lv); n.push(e[1]);
    if ((e[1] === 'origem.decisaoId' || e[1] === 'origem.decisaoData') && !f.origem.decisao) f.origem.decisao = 'Sentença';
  });
  var fv2 = function (L) { var o = fonte || {}; for (var i = 0; i < L.length; i++) { var v = S(o[L[i]]); if (v && v !== '####') return v; } return ''; };
  [['caso.classe', ['classe_judicial', 'Classe']], ['caso.autor', ['polo_ativo']], ['caso.reu', ['polo_passivo']], ['caso.assunto', ['Assunto']], ['caso.secao', ['Seção Competente']]].forEach(function (p) {
    var v = fv2(p[1]); if (v && vazio(getP(f, p[0]))) { setP(f, p[0], v); n.push(p[0]); }
  });
  return n;
}
window.MutaMapa = { camposFicha: camposFicha, trazerFicha: trazerFicha, getP: getP, setP: setP };
window.MutaGabinete = { recarregar: function () { carregar(true); }, gravarPendente: function () { return gravarJa(); }, modo: function () { return modo; },
  /* para os autos (autos.js) e a aba Minuta: o prontuário aberto e a gravação */
  render: function () { render(); }, cnj: function () { return G.cnj; }, modelo: function () { return G.F; }, op: function () { return G.op; }, fo: function () { return G.fo; },
  gravado: gravado, V: V, F: function (k) { return fonteVal({ fonte: [k] }); }, marcar: marcar, gravar: function () { return gravarJa(); }, ir: function (aba) { if (MODOS.indexOf(aba) >= 0) { G.aba = aba; render(); } },
  destino: function () { return G.F ? destino() : ''; },
  /* a sincronia gravou a ficha: o painel da ficha mostra o novo registro sem nova leitura */
  registro: function (cnj, op) { if (op && dg(cnj) === dg(G.cnj)) { G.op = op; if (modo === 'ficha') render(); } } };
aplicarModo();
})();
