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
/* texto sem acento e em minúsculas, para comparar */
function N(v) { return S(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
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
  /* lista compacta: as duas primeiras colunas preenchidas em destaque, o resto embaixo */
  return '<ul class="tb-l">' + L.map(function (l) { l = l || {}; var vs = cols.map(function (x) { return [x.rotulo || x.chave, S(l[x.chave])]; }).filter(function (p) { return p[1]; });
    var cab = vs.slice(0, 2).map(function (p) { return /^\d{4}-\d{2}-\d{2}$/.test(p[1]) ? brD(p[1]) : p[1]; }), resto = vs.slice(2);
    return '<li><b>' + esc(cab.join(' · ')) + '</b>' + (resto.length ? '<small>' + resto.map(function (p) { return '<span title="' + esc(p[0]) + '">' + esc(/^\d{4}-\d{2}-\d{2}$/.test(p[1]) ? brD(p[1]) : p[1].slice(0, 220)) + '</span>'; }).join(' · ') + '</small>' : '') + '</li>'; }).join('') + '</ul>';
  return '<div class="gt-tab"><table><thead><tr>' + cols.map(function (x) { return '<th>' + esc(x.rotulo || x.chave) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    L.map(function (l) { return '<tr>' + cols.map(function (x) { return '<td>' + esc((l || {})[x.chave] || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
}
var DICA = { 'Tempestividade': 'Prazo em dias úteis (artigo 219 do CPC), em dobro para a Fazenda (artigo 183)', 'Preparo': 'Pix ou cartão só com o comprovante do Tesouro; sem preparo, intimar para recolher em dobro antes da deserção',
  'Representação': 'Procuração nos autos; procurador público e DPU dispensam', 'MPF': 'Situação do parecer do Ministério Público Federal no 2º grau', 'MPF - Custos Legis': 'Hipótese de intervenção obrigatória (artigo 178 do CPC)',
  'Prelim.': 'Preliminares nas razões ou contrarrazões a decidir antes do mérito', 'Tema': 'Tipo de caso: a matéria em poucas palavras, como no lote', 'Especificidades': 'O que distingue este caso dos parecidos',
  'Síntese Processual': 'Síntese do processo para quem vai minutar', 'Síntese Fática': 'Fatos relevantes, com o ID das provas', 'Hipóteses Monocrática': 'Inciso do artigo 932 do CPC que autoriza a decisão do relator',
  'Destino - Situação': 'Pronto para julgar ou pendente (com o que falta)', 'Voto - Resultado': 'Resultado do julgamento', 'Voto - Honorários': 'O que acontece com os honorários (Tema 1.059/STJ para os recursais)',
  'Tópico-síntese': 'Tópico-síntese do INSS (benefício implantado ou revisto)', 'Mono - Fundamento': 'Precedente ou fundamento que autoriza a decisão do relator', 'Urgência': 'Medida urgente pedida (liminar, tutela, efeito suspensivo)',
  'Sobrestamento - Motivo': 'Por que o processo está sobrestado', 'Sobrestamento - Tema': 'Tema ou precedente que manda sobrestar', 'Sensível - Categoria': 'Por que o caso é sensível', 'Sensível - Quadro': 'Quadro ou motivo do caso sensível',
  'Impugnada - ID': 'ID da decisão impugnada (acórdão embargado, decisão agravada)', 'ED - Vício': 'Omissão, contradição, obscuridade ou erro material apontado', 'AgInt - Fundamentos': 'Fundamentos do agravo interno contra a decisão do relator' };
var TIPO_DICA = { lista: 'escolha uma opção', simnao: 'Sim ou Não', data: 'data', numero: 'número', 'texto-longo': 'texto livre', texto: 'texto curto', tabela: 'lista de linhas (editar na ficha do Ex Officio)' };
function dicaCampo(c) {
  var d = DICA[c.chave] || S(c.regra) || '';
  return c.rotulo + (d ? ': ' + d : '') + ' (' + (TIPO_DICA[c.tipo] || 'campo') + (editavel(c) ? '; grava sozinho na ficha do processo' : '; só leitura') + ')';
}
function campo(c) {
  var longo = c.tipo === 'texto-longo' || c.tipo === 'tabela', cls = 'gf' + (longo ? ' w' : '');
  if (c.tipo === 'tabela') {
    var tv = c.secao ? gravado(c.secao, c.chave) : '';
    return '<div class="' + cls + '" title="' + esc(dicaCampo(c)) + '"><span class="gl">' + esc(c.rotulo) + (editavel(c) ? ' <small class="muted">· editar na ficha do Ex Officio</small>' : '') + '</span>' + tabela(c, tv) + '</div>';
  }
  if (!editavel(c)) {
    var v0 = c.secao ? gravado(c.secao, c.chave) : fonteVal(c);
    if (typeof v0 === 'object') v0 = '';
    return '<div class="' + cls + '" title="' + esc(dicaCampo(c)) + '"><span class="gl">' + esc(c.rotulo) + '</span><span class="ro">' + (S(v0) ? esc(/^\d{4}-\d{2}-\d{2}$/.test(S(v0)) ? brD(v0) : v0) : '—') + '</span></div>';
  }
  var id = c.secao + '.' + c.chave, v = V(c.secao, c.chave), bloq = (id === 'producao.SERVIDOR' || id === 'producao.CORRETOR') && !G.gestor, h;
  if (typeof v === 'object') v = '';
  v = String(v);
  var at = ' data-fk="' + esc(id) + '"' + (bloq ? ' disabled title="Designação: só o gestor"' : '');
  /* lista curta e Sim/Não viram botões, como na gaveta da pauta */
  var OC = c.tipo === 'simnao' ? ['Sim', 'Não'] : c.tipo === 'lista' ? (c.opcoes || []).map(function (o) { return typeof o === 'string' ? o : o.valor; }) : null;
  if (OC && !bloq && OC.length && OC.length <= 6 && OC.every(function (o) { return o.length <= 26; })) {
    return '<div class="' + cls + (OC.length > 3 ? ' w' : '') + (id in G.pend ? ' mud' : '') + '" title="' + esc(dicaCampo(c)) + '"><span class="gl">' + esc(c.rotulo) + '</span><div class="pm-seg gf-seg" role="group" aria-label="' + esc(c.rotulo) + '">' +
      OC.map(function (o) { return '<button type="button" class="pm-ch' + (o === v ? ' on' : '') + '" data-ch="' + esc(id) + '" data-v="' + esc(o) + '" aria-pressed="' + (o === v) + '">' + esc(o) + '</button>'; }).join('') +
      (v && OC.indexOf(v) < 0 ? '<span class="pm-ch on">' + esc(v) + '</span>' : '') + '</div></div>';
  }
  if (c.tipo === 'lista') { var O = (c.opcoes || []).map(function (o) { return typeof o === 'string' ? o : o.valor; });
    h = '<select' + at + '><option value="">—</option>' + O.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + (v && O.indexOf(v) < 0 ? '<option selected>' + esc(v) + '</option>' : '') + '</select>'; }
  else if (c.tipo === 'simnao') h = '<select' + at + '><option value="">—</option><option' + (v === 'Sim' ? ' selected' : '') + '>Sim</option><option' + (v === 'Não' ? ' selected' : '') + '>Não</option>' + (v && v !== 'Sim' && v !== 'Não' ? '<option selected>' + esc(v) + '</option>' : '') + '</select>';
  else if (c.tipo === 'data' && (!v || /^\d{4}-\d{2}-\d{2}$/.test(v))) h = '<input type="date"' + at + ' value="' + esc(v) + '">';
  else if (c.tipo === 'numero') h = '<input type="number"' + at + ' value="' + esc(v) + '">';
  else if (c.tipo === 'texto-longo') h = '<textarea rows="3"' + at + '>' + esc(v) + '</textarea>';
  else h = '<input type="text"' + at + ' value="' + esc(v) + '">';
  return '<label class="' + cls + (id in G.pend ? ' mud' : '') + '" title="' + esc(dicaCampo(c)) + '"><span class="gl">' + esc(c.rotulo) + '</span>' + h + '</label>';
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
var MODOS = ['Processo', 'Autos', 'Roteiro'];
var ROT_MODO = {};
var FORA_PROC = { 'Autuação': 1, 'Partes': 1, 'Tramitação': 1, 'Autos extraídos do PJe': 1, 'Registro no acervo': 1, 'Acompanhamento': 1 };
var NO_TOPO = { 'Síntese Processual': 1, 'Alegações': 1, 'Etiquetas sugeridas': 1, 'O que falta sanar': 1, 'Intercorrências': 1, 'Assunto detalhado': 1 };
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
var IC = { tri: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>', min: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', rev: '<path d="M20 6 9 17l-5-5"/>', env: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  ass: '<path d="M3 21c3-1 5-4 6-7l3 3c-3 1-6 3-7 6z"/><path d="M14 4l6 6-5 5-6-6z"/>', et: '<path d="M4 12h4l3-8 4 16 3-8h2"/>', pt: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 15c3 0 6 1.5 6 4"/>',
  sn: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>', nt: '<path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>', dc: '<path d="M12 3v18M5 7h14M7 7l-3 7h6zM17 7l-3 7h6z"/>' };
function etapas() {
  var mono = destino() === 'monocratica', d = function (k) { return S(V('producao', k)); };
  var L = [{ r: 'Triagem', ic: 'tri', ok: !!S(V('triagem', 'Destino - Confirmado em')), dt: S(V('triagem', 'Destino - Confirmado em')), on: { 'triagem.Destino - Confirmado em': 1, 'triagem.Destino - Confirmado por': 'U' }, off: ['triagem.Destino - Confirmado em', 'triagem.Destino - Confirmado por'] },
    { r: 'Minuta', ic: 'min', ok: !!d('MINUTADO'), dt: d('MINUTADO'), on: { MINUTADO: 1 }, off: ['MINUTADO'] },
    { r: mono ? 'Revisão' : 'Correção', ic: 'rev', ok: sim(d('CORRIGIDO')) || !!d('Data da Revisão'), dt: d('Data da Revisão'), on: { CORRIGIDO: 'Sim', 'Data da Revisão': 1 }, off: ['CORRIGIDO', 'Data da Revisão'] }];
  if (mono) L.push({ r: 'Enviada', ic: 'env', ok: !!d('Data da Liberação'), dt: d('Data da Liberação'), on: { 'Data da Liberação': 1 }, off: ['Data da Liberação'] },
    { r: 'Assinada', ic: 'ass', ok: sim(d('Assinado')) || !!d('Data da Assinatura'), dt: d('Data da Assinatura'), on: { Assinado: 'Sim', 'Data da Assinatura': 1 }, off: ['Assinado', 'Data da Assinatura'] });
  else L.push({ r: 'Liberação', ic: 'env', ok: sim(d('LIBERADO')) || !!d('Data da Liberação'), dt: d('Data da Liberação'), on: { LIBERADO: 'Sim', 'Data da Liberação': 1 }, off: ['LIBERADO', 'Data da Liberação'] });
  var n = 0; while (n < L.length && L[n].ok) n++;
  return { L: L, n: n, mono: mono };
}
function marcarEtapa(i) {
  var E = etapas(), x = E.L[i]; if (!x) return;
  var cam = function (k) { return k.indexOf('.') > 0 && /^(triagem|producao|origem)\./.test(k) ? k : 'producao.' + k; };
  if (i === E.n) Object.keys(x.on).forEach(function (k) { marcar(cam(k), x.on[k] === 1 ? hojeIso() : x.on[k] === 'U' ? (ses.estado().usuario || '') : x.on[k]); });
  else if (i === E.n - 1) x.off.forEach(function (k) { marcar(cam(k), ''); });
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
  var E = etapas(), FASE = E.mono ? ['Para triagem', 'Para minuta', 'Para revisão', 'Para envio', 'Para assinatura', 'Assinada'] : ['Para triagem', 'Para minuta', 'Para correção', 'Para liberação', 'Liberado'];
  var partes = S(R['Polo ativo']) ? S(R['Polo ativo']) + (S(R['Polo passivo']) ? ' x ' + S(R['Polo passivo']) : '') : S(R['Partes (texto da pauta)']);
  var tipoJ = S(V('triagem', 'Tipo de Julgamento')) || S(V('triagem', 'Padrão - Espécie'));
  /* tipo de julgamento: o da ficha; a leitura dos autos (classe, tarefa, último recurso) sugere e confere */
  var TA = window.MutaAutos && window.MutaAutos.estado().itens ? window.MutaAutos.alertas().filter(function (a) { return /^Tipo de julgamento:/.test(a.t); })[0] : null;
  var tjHtml = tipoJ ? '<span class="pm-tj' + (TA && TA.nivel === 'al' ? ' al' : '') + '" title="' + esc(TA ? TA.t : 'Tipo de julgamento na ficha') + '">' + esc(tipoJ) + '</span>' +
      (TA && TA.campo && N(TA.valor) !== N(tipoJ) ? '<button type="button" class="pm-tj sug" data-tj="' + esc(TA.valor) + '" title="' + esc(TA.t) + '">autos: ' + esc(TA.valor) + ' ✓</button>' : '')
    : TA ? '<button type="button" class="pm-tj sug' + (TA.nivel === 'al' ? ' al' : '') + '" data-tj="' + esc(TA.valor) + '" title="' + esc(TA.t) + ' Clique para gravar.">' + esc(TA.valor) + ' ✓</button>' : '';
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
  var pess = function (k, rot) { var v = S(V('producao', k));
    if (G.desEd === k) return '<span class="pm-pp ed"><span class="pm-pn"><small>' + rot + '</small><input type="text" id="pm-des" data-des="' + k + '" value="' + esc(v) + '" placeholder="nome" aria-label="' + rot + '"></span></span>';
    return '<button type="button" class="pm-pp' + (v ? '' : ' vz') + '" data-des-ed="' + k + '"' + (G.gestor ? ' title="Designar (Enter grava)"' : ' disabled title="Designação: só o gestor"') + '><span class="pm-av">' + esc(v ? iniciais(v) : '—') + '</span><span class="pm-pn"><small>' + rot + '</small>' + esc(v || 'não designado') + '</span></button>'; };
  return '<section class="pc pm">' +
    '<div class="pm-top"><span class="pm-fase">' + FASE[Math.min(E.n, FASE.length - 1)] + '</span>' + (dias != null ? '<span class="pm-dd' + (dias > 30 ? ' al' : '') + '">' + dias + ' dias na tarefa<i><i style="width:' + Math.min(100, dias / 60 * 100) + '%"></i></i></span>' : '') + '<span class="sp"></span>' + pills + '</div>' +
    '<div class="pm-l1"><button type="button" class="mono pc-cnj" data-copia="' + esc(G.cnj) + '" title="Copiar o número">' + esc(G.cnj) + '</button>' + (abrev ? '<span class="pc-cl" title="' + esc(classe) + '">' + esc(abrev) + '</span>' : '') +
      tjHtml + (AL.length ? '<button type="button" class="pm-al" data-aba="Autos" title="' + esc(AL.map(function (a) { return a.t; }).join(' · ')) + '">' + AL.length + ' alerta' + (AL.length > 1 ? 's' : '') + '</button>' : '') + '</div>' +
    '<p class="pm-as">' + (assunto ? '<b>' + esc(assunto) + '</b>' : '') + (!G.adEd && !S(gravado('triagem', 'Registro - Assunto detalhado')) && !S(V('triagem', 'Assunto detalhado')) ? '<button type="button" class="pm-ad-ic" data-ad="ed" title="Incluir o assunto detalhado (vai para a ficha; o Caput mostra o mesmo)" aria-label="Incluir o assunto detalhado">' + SV('<path d="M12 5v14M5 12h14"/>', 12) + '</button>' : '') + '</p>' +
    assuntoDetalhado() +

    '<div class="pm-et" style="--n:' + E.L.length + '"><i class="pm-ln"><i style="width:' + (E.L.length > 1 ? Math.min(E.n, E.L.length - 1) / (E.L.length - 1) * 100 : 0) + '%"></i></i>' + et + '</div>' +
    '<div class="pm-resp">' + atoSel() + pess('SERVIDOR', 'Minuta') + pess('CORRETOR', E.mono ? 'Revisão' : 'Correção') + '</div>' +
    '<details class="pm-aut"' + (G.autAb ? ' open' : '') + '><summary data-aut aria-label="Autuação, partes e situação"><i class="pm-aut-h"></i></summary>' +
      (partes && !polos ? '<p class="pm-pt" title="' + esc(partes) + '">' + SV(IC.pt, 14) + '<span>' + esc(partes) + '</span></p>' : '') +
      (polos ? '<div class="pc-ps">' + polos + '</div>' : '') +
      (tarefa ? '<div class="pm-tf"><span>Tarefa no PJe</span><b>' + esc(tarefa) + '</b>' + (dias != null ? '<small>' + dias + ' dias</small>' : '') + '</div>' : '') +
      (window.MutaAutos ? '<div class="pm-sit">' + window.MutaAutos.htmlSituacao(gravado('triagem', 'Registro - Situação atual')) + '</div>' : '') +
      (dl ? '<dl class="pc-dl">' + dl + '</dl>' : '') +
      (etq.length ? '<div class="pc-etq">' + etq.map(function (e) { return '<span class="chip">' + esc(e) + '</span>'; }).join('') + '</div>' : '') + '</details>' +
    '</section>';
}
window.MutaRender = function () { render(); };
/* faixa do usuário no topo do painel, acima das abas */
function faixaUsuario(s) {
  var t0 = $('topo-u'), t = $('tu-main'); if (!t0 || !t) return;
  var pb = $('pje-bar'); if (pb && t.contains(pb) && PJE_CASA && PJE_CASA.parentNode) PJE_CASA.parentNode.insertBefore(pb, PJE_CASA);
  t0.hidden = false;
  var on = s && s.estado === 'on';
  var q = function (attr, tit, svg) { return '<button type="button" class="tu-b" ' + attr + ' title="' + tit + '" aria-label="' + tit + '">' + SV(svg, 14) + '</button>'; };
  t.innerHTML = (on ? '<span class="tu-n"><i class="tu-av">' + esc(iniciais(s.usuario)) + '</i>' + esc(s.usuario) + '</span>' : '<span class="tu-n muted">Muta</span>') + '<span class="tu-pje" id="tu-pje-slot"></span>' +
    (on && G.cnj ? q('data-g="atualizar"', 'Atualizar o prontuário', '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>') : '') +
    '<a class="tu-b" target="_blank" rel="noopener noreferrer" href="' + SITE + '/exofficio/" title="Abrir o Ex Officio" aria-label="Abrir o Ex Officio">' + SV('<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>', 14) + '</a>' +
    q('data-tema-tu', 'Tema claro ou escuro', '<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/>') +
    (on ? q('data-sair', 'Sair', '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>') : '');
  var sl = $('tu-pje-slot'); if (sl && pb) { if (!PJE_CASA) { PJE_CASA = document.createComment('pje-bar'); pb.parentNode.insertBefore(PJE_CASA, pb); } sl.appendChild(pb); }
}
(function () { var t = $('topo-u'); if (!t) return; t.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return;
  if (b.hasAttribute('data-sair')) { gravarJa().catch(function () {}).then(function () { ses.sair(); }); }
  else if (b.dataset.g === 'atualizar') { gravarJa().catch(function () {}).then(function () { carregar(true); }); }
  else if (b.hasAttribute('data-tema-tu')) { var tb = $('pje-tema'); if (tb) tb.click(); } }); })();
/* assunto detalhado logo abaixo do assunto: o do Caput (lote) e, na falta, o da ficha, incluído aqui pelo ícone */
function adAcao(a) {
  if (a === 'ed') { G.adEd = true; render(); var t = $('pm-ad-tx'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } return; }
  if (a === 'ok') { var t2 = $('pm-ad-tx'); if (t2) { marcar('triagem.Assunto detalhado', S(t2.value).replace(/\s*\n+\s*/g, ' ')); agendar(400); } }
  G.adEd = false; render();
}
function assuntoDetalhado() {
  var lote = S(gravado('triagem', 'Registro - Assunto detalhado')), proprio = S(V('triagem', 'Assunto detalhado'));
  if (G.adEd) return '<div class="pm-ad ed"><textarea id="pm-ad-tx" rows="2" placeholder="Assunto detalhado (vai para a ficha; o Caput mostra o mesmo)">' + esc(proprio) + '</textarea><span class="pm-ad-b"><button type="button" class="btn solid sm" data-ad="ok">Gravar</button><button type="button" class="lnk" data-ad="x">cancelar</button></span></div>';
  if (lote) return '<p class="pm-ad"><span>' + esc(lote) + '</span><i class="pm-ad-o" title="Do registro da triagem no Caput">Caput</i></p>';
  if (proprio) return '<p class="pm-ad"><span>' + esc(proprio) + '</span><button type="button" class="pm-ad-i" data-ad="ed" title="Editar o assunto detalhado" aria-label="Editar">' + SV(IC.min, 12) + '</button></p>';
  return '';
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
function monoMais() {
  var ja = { 'Hipóteses Monocrática': 1, 'Voto - Resultado': 1, 'Voto - Honorários': 1, 'Tópico-síntese': 1, 'Mono - Fundamento': 1, 'Mono - Tipo de ato': 1, 'Data da Liberação': 1, Assinado: 1, 'Data da Assinatura': 1, Destino: 1 }, L = [];
  var g1 = grupoModelo('Decisão monocrática'); (g1 ? g1.campos : []).forEach(function (c) { if (!ja[c.chave]) L.push(c); });
  var C = abaModelo(CE); (C ? C.grupos.filter(function (g) { return g.controle === 'monocratica'; }) : []).forEach(function (g) { g.campos.forEach(function (c) { if (!ja[c.chave]) L.push(c); }); });
  return L.length ? '<details class="rt-mais"><summary>Mais campos · publicação e controle</summary><div class="gr">' + L.map(campo).join('') + '</div></details>' : '';
}
function decisaoMono() {
  var ts = S(V('producao', 'Tópico-síntese'));
  return '<section class="card pc-sec pm-dec"><div class="pc-sh"><h3>' + SV(IC.dc, 13) + ' Decisão</h3><small class="muted">art. 932 do CPC</small></div>' +
    '<p class="pm-lb">Hipótese do art. 932</p>' + chips('triagem', 'Hipóteses Monocrática', true) +
    '<p class="pm-lb">Resultado</p>' + chips('producao', 'Voto - Resultado') +
    '<div class="pm-r2">' + (function () { var c = campoLista('producao', 'Voto - Honorários'); return c ? campo(Object.assign({}, c, { rotulo: 'Honorários' })) : ''; })() +
    '<div class="gf"><span class="gl">Tópico-síntese</span><span class="seg">' + ['Sim', 'Não'].map(function (x) { return '<button type="button" data-ch="producao.Tópico-síntese" data-v="' + x + '" aria-selected="' + (ts === x) + '">' + x + '</button>'; }).join('') + '</span></div></div>' +
    campoRot('producao', 'Mono - Fundamento', 'Precedente ou fundamento') + monoMais() + '</section>';
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
/* Controles num cartão só: cada tipo com Sim/Não; com Sim, a razão (e o resto dos campos, recolhido) */
var CTL_RAZAO = { urgencia: [['triagem', 'Urgência', 'Medida'], ['triagem', 'Urgência - Observação', 'Razão']],
  meta: [],
  sobrestamento: [['controles', 'Sobrestamento - Motivo', 'Motivo'], ['controles', 'Sobrestamento - Tema', 'Tema ou precedente']],
  sensivel: [['controles', 'Sensível - Categoria', 'Categoria'], ['controles', 'Sensível - Quadro', 'Razão']] };
function ctlLista(id) { var N = naLista(); return id === 'meta' ? !!(N.metas || G.ctl.meta) : id === 'sobrestamento' ? !!(N.sobrestados || G.ctl.sobrestamento) : id === 'sensivel' ? !!N.sensiveis : false; }
function ctlSim(id) { if (id === 'meta') return vale('meta') || !!S(V('triagem', 'META')) || !!G.mostra.meta;
  return vale(id) || !!G.mostra[id] || CTL_RAZAO[id].some(function (r) { return !!S(V(r[0], r[1])); }) && !(id === 'sensivel' && V('controles', 'Sensível - Excluído') === 'Sim'); }
function ctlMarcar(id, on) {
  G.mostra[id] = on;
  if (id === 'sensivel') { marcar('controles.Sensível - Incluído', on ? 'Sim' : ''); marcar('controles.Sensível - Excluído', on ? '' : (ctlLista('sensivel') ? 'Sim' : '')); }
  else if (id === 'meta') { if (!ctlLista('meta')) marcar('triagem.META', on ? (S(V('triagem', 'META')) || 'Sim') : ''); }
  else if (!on) { var k = CTL_RAZAO[id][0]; if (!ctlLista(id)) marcar(k[0] + '.' + k[1], ''); }
  agendar(500); render();
}
function controlesProcesso() {
  var A = abaModelo(CE); if (!A) return '';
  var gs = A.grupos.filter(function (g) { return CTL_PROC.indexOf(g.controle) >= 0; });
  var n = 0;
  var linhas = gs.map(function (g) {
    var id = g.controle, on = ctlSim(id), fixo = ctlLista(id) && id !== 'sensivel'; if (on) n++;
    var raz = CTL_RAZAO[id], usados = {}; raz.forEach(function (r) { usados[r[1]] = 1; });
    var resto = id === 'meta' ? [] : g.campos.filter(function (c) { return !usados[c.chave]; });
    return '<div class="ct-i ' + id + (on ? ' on' : '') + (on && raz.length ? ' wide' : '') + '"><div class="ct-h"><b>' + esc(ROT_CE[id] === 'Sobrestado' ? 'Sobrestamento' : ROT_CE[id]) + '</b>' +
      (fixo ? '<small class="muted" title="' + esc(g.inclusao || '') + '">pelo PJe</small>' : '') +
      '<span class="seg ct-sn"><button type="button" data-ct="' + id + ':1" aria-selected="' + on + '">Sim</button><button type="button" data-ct="' + id + ':0" aria-selected="' + !on + '"' + (fixo ? ' disabled title="Vem da lista do PJe"' : '') + '>Não</button></span></div>' +
      (on && raz.length ? '<div class="gr ct-r">' + raz.map(function (r) { return campoRot(r[0], r[1], r[2]); }).join('') + '</div>' +
        (resto.length ? '<details class="ct-mais"><summary>Mais campos</summary><div class="gr">' + resto.map(campo).join('') + '</div></details>' : '') : '') + '</div>';
  }).join('');
  return '<section class="card pc-sec" id="g-ctl"><div class="pc-sh"><h3>Controles</h3><small class="muted">' + (n ? n + ' em vigor' : 'nenhum em vigor') + '</small></div><div class="ct-l">' + linhas + '</div></section>';
}
/* precedentes relacionados do processo aberto: no topo da aba Ementário */
function casoPrec() { return { cnj: G.cnj, assunto: fonteVal({ fonte: ['Assunto'] }),
    subassuntos: S(gravado('triagem', 'Registro - Assunto detalhado')) || S(V('triagem', 'Assunto detalhado')), questoes: S(V('triagem', 'Alegações')),
    sintese: [S(V('triagem', 'Síntese Processual')), S(V('triagem', 'Síntese Fática'))].join(' '), especificidades: [S(V('triagem', 'Especificidades')), S(V('triagem', 'Tema'))].join(' ') }; }
function precEmentario(k) { if (window.MutaEmentario && window.MutaEmentario.caso) window.MutaEmentario.caso(k); }
/* peças do processo (sentença, origem, recursos e contrarrazões, outras peças): um cartão só, uma seção por grupo */
var PECAS_ORDEM = { 'Sentença': ['Sentença - ID', 'Sentença - Data', 'Sentença - Decisão', 'Sentença - Resultado', 'Sentença - Honorários', 'Sentença - Custas', 'Sentença - Reexame', 'Sentença - Tutela', 'Sentença - Fundamento', 'Sentença - Providências'],
  'Origem': ['Origem - Juízo', 'Origem - Julgador', 'Origem - Valor da causa', 'Origem - Processo de referência', 'Origem - Documentos 1G'],
  'Recursos e contrarrazões': ['Contrarrazões - Situação', 'Recursos', 'Contrarrazões'] };
var PECAS_RESUMO = { 'Sentença': ['Sentença - ID', 'Sentença - Data', 'Sentença - Decisão'], 'Origem': ['Origem - Juízo', 'Origem - Julgador'], 'Recursos e contrarrazões': ['Recursos', 'Contrarrazões - Situação'], 'Outras peças e ocorrências': ['Outras peças'] };
function pecasCartao() {
  var A = abaModelo('Processo'); if (!A) return '';
  var gs = A.grupos.filter(function (g) { return !FORA_PROC[g.grupo] && grupoVisivel(g); });
  if (!gs.length) return '';
  var val = function (c) { var v = c.secao ? V(c.secao, c.chave) : fonteVal(c); return Array.isArray(v) ? (v.length ? v.length + ' item(ns)' : '') : S(v); };
  return '<section class="card pc-sec pecas" id="g-pecas"><div class="pc-sh"><h3>Peças</h3><small class="muted">da ficha do processo</small></div>' + gs.map(function (g) {
    var ord = PECAS_ORDEM[g.grupo] || [], C = g.campos.slice().sort(function (a, b) { var ia = ord.indexOf(a.chave), ib = ord.indexOf(b.chave); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
    var n = C.filter(function (c) { return !!val(c); }).length, ab = G.pecAb && G.pecAb[g.grupo] != null ? G.pecAb[g.grupo] : false;
    var res = (PECAS_RESUMO[g.grupo] || []).map(function (k) { var c = C.filter(function (x) { return x.chave === k; })[0]; var v = c ? val(c) : ''; return /^\d{4}-\d{2}-\d{2}$/.test(v) ? brD(v) : k.indexOf('ID') >= 0 && v ? 'ID ' + v : v; }).filter(Boolean).join(' · ');
    return '<details class="pc-s"' + (ab ? ' open' : '') + ' data-grupo="' + esc(g.grupo) + '"><summary><span class="pc-s-t"><b>' + esc(g.grupo) + '</b>' + (res ? '<small>' + esc(res.slice(0, 120)) + '</small>' : '<small class="vz">sem registro</small>') + '</span><span class="gn">' + n + '/' + C.length + '</span></summary>' +
      '<div class="gr">' + C.map(campo).join('') + '</div></details>';
  }).join('') + '</section>';
}
function corpoProcesso() {
  var AU = window.MutaAutos, h = sinalizacoes() + notas();
  var ad = gravado('triagem', 'Registro - Assunto detalhado');
  h += '<section class="card pc-sec"><div class="pc-sh"><h3>Síntese e questões</h3></div><div class="gr">' +
    campoRot('triagem', 'Síntese Processual', 'Síntese do processo') + questoes() + '</div></section>';

  h += controlesProcesso();
  h += grupos('Processo', function (g) { return g.grupo === 'Registro no acervo'; }, function () { return false; });
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
/* tipo de ato / pronunciamento, no topo de Produção: define o destino (sessão, monocrática, outro) e o tipo de ato */
var PRON = [['Acórdão (sessão)', 'Sessão', ''], ['Decisão monocrática', 'Monocrática', 'Decisão monocrática (art. 932)'], ['Decisão de urgência', 'Monocrática', 'Decisão de urgência'],
  ['Despacho', 'Monocrática', 'Despacho'], ['Admissibilidade', 'Monocrática', 'Decisão de admissibilidade'], ['Juízo de retratação', 'Monocrática', 'Juízo de retratação'],
  ['Homologação / extinção', 'Monocrática', 'Homologação / extinção'], ['Outro destino', 'Outro destino', '']];
function pronAtual() { var d = destGrav(), t = S(V('producao', 'Mono - Tipo de ato'));
  for (var i = 0; i < PRON.length; i++) { if (PRON[i][1] === d && (d !== 'Monocrática' || PRON[i][2] === t || (!t && i === 1))) return i; } return -1; }
/* tipo de ato no cartão, à esquerda de quem minuta e de quem corrige */
function atoSel() {
  var k = pronAtual();
  return '<label class="pm-pp pm-ato"><span class="pm-pn"><small>Tipo de ato</small><select id="pm-pron" aria-label="Tipo de ato ou pronunciamento"><option value="">a definir</option>' +
    PRON.map(function (x, i) { return '<option value="' + i + '"' + (i === k ? ' selected' : '') + '>' + esc(x[0]) + '</option>'; }).join('') + '</select></span></label>';
}
function pronunciamento() {
  var k = pronAtual();
  return '<section class="card pc-sec pm-pron"><div class="pc-sh"><h3>Tipo de ato · pronunciamento</h3><small class="muted">' + (k < 0 ? 'a definir na triagem' : esc(PRON[k][1] === 'Sessão' ? 'vai à sessão' : PRON[k][1] === 'Monocrática' ? 'decisão do relator' : 'outro destino')) + '</small></div>' +
    '<select id="pm-pron" class="pm-pron-s" aria-label="Tipo de ato ou pronunciamento"><option value="">— a definir —</option>' + PRON.map(function (x, i) { return '<option value="' + i + '"' + (i === k ? ' selected' : '') + '>' + esc(x[0]) + '</option>'; }).join('') + '</select></section>';
}
function corpoProducao() {
  var A = abaModelo('Produção'), h = '';
  if (!A) return '';
  h += pronunciamento();
  var mono = destino() === 'monocratica';
  if (mono) h += decisaoMono();
  /* o que já está no cartão (etapas, designação), no tipo de ato e na Decisão não se repete */
  var JA = { MINUTADO: 1, CORRIGIDO: 1, 'Data da Revisão': 1, LIBERADO: 1, 'Data da Liberação': 1, Assinado: 1, 'Data da Assinatura': 1, SERVIDOR: 1, CORRETOR: 1, 'Mono - Tipo de ato': 1 };
  var FORA = { 'Designação e minuta': 1, 'Lote e correção (Index)': 1, 'Ato e fundamento': 1, 'Decisão monocrática': 1 };
  h += A.grupos.filter(function (g) { return !FORA[g.grupo] && (!g.destino || g.destino === destino()) && grupoVisivel(g); })
    .map(function (g) { return Object.assign({}, g, { campos: g.campos.filter(function (c) { return !JA[c.chave]; }) }); })
    .filter(function (g) { return g.campos.length; })
    .map(function (g, i) { return grupoHtml(g, i < 2); }).join('');
  if (!mono) h += grupos(PAUTA_ABA, null, function () { return true; });
  return h;
}
var PAUTA_ABA = 'Pauta';
var PJE_CASA = null;
/* contagem sob cada modo, como nas abas da gaveta: em aberto, preenchidos/total, passos conferidos */
function preench(nomeAba, filtroG) { var A = abaModelo(nomeAba), t = 0, n = 0; if (!A) return '';
  A.grupos.filter(function (g) { return (!g.destino || g.destino === destino()) && grupoVisivel(g) && (!filtroG || filtroG(g)); }).forEach(function (g) { g.campos.forEach(function (c) { if (!c.secao) return; t++; var v = V(c.secao, c.chave); if (Array.isArray(v) ? v.length : S(v)) n++; }); });
  return n + '/' + t; }
function contaModo(a) {
  if (a === 'Processo') { var k = 0; SN.forEach(function (q) { snLinhas(q[0]).forEach(function (l) { if (!/^✓/.test(l)) k++; }); }); return k ? String(k) : ''; }
  if (a === 'Autos') { var AE = window.MutaAutos && window.MutaAutos.estado(); if (!AE || !AE.itens) return ''; var nd = window.MutaAutos.lista().length, nl = Object.keys(AE.docs || {}).filter(function (k) { return /^(ok|sem)$/.test(AE.docs[k].estado); }).length; return nl + '/' + nd; }
  if (a === 'Roteiro') { var R = window.MutaRoteiro && window.MutaRoteiro.resumo ? window.MutaRoteiro.resumo(gRot()) : null; return R ? R.ok + '/' + R.total : ''; }
  if (a === 'Produção') return preench('Produção');
  return '';
}   /* marcador do lugar original da faixa do PJe (fora do cartão quando não há processo) */
/* Roteiro: a triagem em passos, pelo tipo de julgamento (roteiro.js) */
function gRot() { return { V: V, F: function (k) { return fonteVal({ fonte: [k] }); }, cnj: function () { return G.cnj; }, marcar: marcar, gravar: function () { return gravarJa(); } }; }
/* o Roteiro de triagem reúne toda a triagem: os passos, a leitura dos autos, as etiquetas, o registro do lote e os demais campos */
var FORA_ROT = { 'Síntese Processual': 1, 'Alegações': 1, 'O que falta sanar': 1, 'Intercorrências': 1, 'Assunto detalhado': 1, 'Tipo de Julgamento': 1, 'Etiquetas sugeridas': 1 };
/* Autos: a conferência automática, a lista de peças (com detalhamento, JSON, OCR e PDF) e o preenchimento pelos autos */
function corpoAutos() { var AU = window.MutaAutos; return AU ? AU.htmlConferencia() + pecasCartao() + AU.htmlPreencher() + AU.htmlDocs() : pecasCartao(); }
function corpoRoteiro() {
  if (!window.MutaRoteiro) return '<div class="empty">Roteiro indisponível.</div>';
  var A = abaModelo('Triagem'), todos = [], TR = window.MutaTriagem, AU = window.MutaAutos;
  if (A) A.grupos.filter(function (g) { return g.grupo !== 'Registro da triagem (lote)' && grupoVisivel(g); }).forEach(function (g) { g.campos.forEach(function (c) { if (c.secao && !FORA_ROT[c.chave]) todos.push([c.secao, c.chave, c.rotulo]); }); });
  return window.MutaRoteiro.html(gRot(), campoRot, questoes, { todos: todos, barra: AU && AU.barra ? AU.barra() : '',
    etiquetas: (TR && TR.etiquetasDe ? TR.etiquetasDe(G.op, G.fo) : '') + (window.MutaAlertas ? window.MutaAlertas.htmlRoteiro(G.cnj, V('triagem', 'Etiquetas sugeridas'), function () { render(); }) : ''), registro: TR && TR.registroDe ? TR.registroDe(G.op, G.fo) : '' });
}
function render() {
  if (!caixa) return;
  faixaUsuario(ses.estado());
  /* a faixa do PJe mora no cartão do processo; antes de redesenhar, volta ao lugar de origem para não se perder */
  var pb = $('pje-bar'); if (pb && caixa.contains(pb) && PJE_CASA && PJE_CASA.parentNode) PJE_CASA.parentNode.insertBefore(pb, PJE_CASA);
  var s = ses.estado();
  if (s.estado === 'verificando') { caixa.innerHTML = '<div class="empty">Verificando a sessão do Ex Officio…</div>'; return; }
  if (s.estado !== 'on') { ses.formulario(caixa, 'Entrar para ver o prontuário do processo'); return; }
  if (!G.cnj) { caixa.innerHTML = '<div class="empty"><h3>Nenhum processo aberto</h3>Abra os autos ou a tarefa no PJe, ou escolha um processo na lista acima.<div class="pc-u"><span>' + esc(s.usuario) + (s.gestor ? ' · gestor' : '') + '</span><button type="button" class="lnk" data-sair>Sair</button></div></div>'; return; }
  var st0 = '<p class="status" id="g-st" role="status" aria-live="polite"></p>';
  if (G.carregando) { caixa.innerHTML = '<div class="pc"><div class="pc-n"><span class="mono pc-cnj">' + esc(G.cnj) + '</span></div></div><div class="empty">Lendo o prontuário do processo…</div>' + st0; stEl = $('g-st'); return; }
  if (G.erro) { caixa.innerHTML = '<div class="pc"><div class="pc-n"><span class="mono pc-cnj">' + esc(G.cnj) + '</span><span class="sp"></span><button type="button" class="lnk" data-g="atualizar">Atualizar</button></div></div><div class="err-box">Não foi possível ler o prontuário: ' + esc(G.erro) + '</div>' + st0; stEl = $('g-st'); return; }
  if (!G.F) { caixa.innerHTML = st0; stEl = $('g-st'); return; }
  if (G.aba === 'Triagem') G.aba = 'Roteiro';
  if (G.aba === 'Produção') G.aba = 'Processo';
  if (MODOS.indexOf(G.aba) < 0) G.aba = 'Processo';
  var nAl = window.MutaAutos && window.MutaAutos.estado().itens ? window.MutaAutos.alertas().filter(function (a) { return a.nivel === 'al'; }).length : 0;
  var tabs = '<div class="seg gtabs pmodos" role="tablist" aria-label="Parte do prontuário">' + MODOS.map(function (a) {
    return '<button type="button" role="tab" data-aba="' + a + '" aria-selected="' + (a === G.aba) + '"><span>' + (ROT_MODO[a] || a) + (a === 'Autos' && nAl ? ' <i class="gnum">' + nAl + '</i>' : '') + '</span><small>' + esc(contaModo(a)) + '</small></button>'; }).join('') + '</div>';
  var corpo = G.aba === 'Autos' ? corpoAutos() : G.aba === 'Roteiro' ? corpoRoteiro() : G.aba === 'Produção' ? corpoProducao() : corpoProcesso();
  var ab = document.activeElement && document.activeElement.dataset ? (document.activeElement.dataset.fk || (document.activeElement.dataset.esp ? 'esp:' + document.activeElement.dataset.esp : '') || (document.activeElement.dataset.q != null ? 'q:' + document.activeElement.dataset.q : '')) : '';
  var y = window.scrollY, pp = $('panel-pront'), yp = pp ? pp.scrollTop : 0;
  precEmentario(casoPrec());
  caixa.innerHTML = cabeca(s) + tabs + st0 + '<div class="gbody">' + corpo + '</div>';
  stEl = $('g-st');
  if (ab) {
    var sel = /^esp:/.test(ab) ? '[data-esp="' + ab.slice(4) + '"]' : /^q:/.test(ab) ? '[data-q="' + ab.slice(2) + '"]' : '[data-fk="' + ab.replace(/"/g, '\\"') + '"]';
    var f = caixa.querySelector(sel); if (f) { f.focus({ preventScroll: true }); try { var n = f.value.length; f.setSelectionRange(n, n); } catch (e) {} }
  }
  window.scrollTo(0, y); if (pp) pp.scrollTop = yp;
}
/* avisos de gravação: na faixa acima das abas */
function st(t, c) {
  var el = $('tu-st');
  if (!el) { el = stEl || $('g-st'); if (el) { el.textContent = t || ''; el.className = 'status' + (c ? ' ' + c : ''); } return; }
  /* ícone na faixa do topo: ✓ gravado, ⋯ a gravar, ! não gravou; a mensagem fica na dica */
  el.hidden = !t; el.title = t || ''; el.setAttribute('aria-label', t || '');
  el.className = 'tu-st ' + (c === 'err' ? 'err' : c === 'ok' || /^gravad|^salv/i.test(t || '') ? 'ok' : 'pend');
}

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
    if (window.MutaAlertas) window.MutaAlertas.esquecer(cnj);
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
  if (t.id === 'pm-pron') { var xp = PRON[Number(t.value)]; marcar('producao.Destino', xp ? xp[1] : ''); marcar('producao.Mono - Tipo de ato', xp ? xp[2] : ''); G.dest = null; agendar(400); render(); return; }
  if (t.dataset && t.dataset.rtc) { if (window.MutaRoteiro) window.MutaRoteiro.conferir(t.dataset.rtc, t.checked, gRot()); render(); return; }
  if (!t.dataset || !t.dataset.fk) return;
  marcar(t.dataset.fk, t.value); var l = t.closest('label'); if (l) l.classList.add('mud');
  agendar(900);
  if (/^(triagem\.(Urgência|Padrão - Espécie)|producao\.Destino|controles\.Sensível - (In|Ex)cluído)$/.test(t.dataset.fk) || G.aba === 'Roteiro') render();
});
caixa.addEventListener('toggle', function (e) { var c = e.target.classList; if (!c) return; if (c.contains('pm-aut')) G.autAb = e.target.open; if (c.contains('pc-s')) { G.pecAb = G.pecAb || {}; G.pecAb[e.target.dataset.grupo] = e.target.open; } }, true);
caixa.addEventListener('keydown', function (e) {
  if (e.target.id === 'sn-tx' && e.key === 'Enter') { e.preventDefault(); snIncluir(); }
  else if (e.target.id === 'pm-ad-tx' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); adAcao('ok'); }
  else if (e.target.id === 'pm-des' && (e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); if (e.key === 'Enter') { marcar('producao.' + e.target.dataset.des, S(e.target.value)); agendar(400); } G.desEd = null; render(); }
  else if (e.target.id === 'pm-ad-tx' && e.key === 'Escape') { adAcao('x'); }
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
  if (b.dataset.ct) { var pc = b.dataset.ct.split(':'); ctlMarcar(pc[0], pc[1] === '1'); return; }
  if (b.dataset.ad) { adAcao(b.dataset.ad); return; }
  if (b.dataset.tj) { marcar('triagem.Tipo de Julgamento', b.dataset.tj); agendar(400); render(); return; }
  if (b.dataset.desEd) { G.desEd = b.dataset.desEd; render(); var di = $('pm-des'); if (di) { di.focus(); di.select(); } return; }
  if (b.dataset.pron != null) { var x = PRON[Number(b.dataset.pron)]; if (x) { marcar('producao.Destino', x[1]); marcar('producao.Mono - Tipo de ato', x[2]); G.dest = null; agendar(400); render(); } return; }
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
  gravado: gravado, V: V, F: function (k) { return fonteVal({ fonte: [k] }); }, marcar: marcar, gravar: function () { return gravarJa(); }, ir: function (aba) { if (aba === 'Triagem') aba = 'Roteiro'; if (MODOS.indexOf(aba) >= 0) { G.aba = aba; render(); } },
  destino: function () { return G.F ? destino() : ''; },
  /* a sincronia gravou a ficha: o painel da ficha mostra o novo registro sem nova leitura */
  registro: function (cnj, op) { if (op && dg(cnj) === dg(G.cnj)) { G.op = op; if (modo === 'ficha') render(); } } };
aplicarModo();
})();
