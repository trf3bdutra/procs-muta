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
    G.F = j.ficha; G.op = j.operacional; G.fo = j.fonte; G.equipe = j.equipe || []; G.desembargador=!!j.desembargador; G.gestor = !!j.gestor; G.ctl = j.controles || {};
    G.carregando = false; render();
    st(j.operacional ? '' : 'Sem ficha no Ex Officio ainda: ela é criada na primeira gravação.');
  }).catch(function (e) {
    if (tok !== G.tok) return;
    G.carregando = false; G.erro = e.status === 401 ? '' : e.message; render();
  });
}

/* ---------- valores ---------- */
function gravado(sec, k) { var r = G.op || {}, t=r[sec]||{}, v=t[k]; if(sec==='triagem'&&k==='Detalhamento do caso'&&v==null)v=[t.Tema,t.Especificidades].map(S).filter(Boolean).filter(function(x,i,a){return a.indexOf(x)===i;}).join('\n'); return v == null ? '' : v; }
function V(sec, k) { var id = sec + '.' + k; return id in G.pend ? G.pend[id] : gravado(sec, k); }
function fonteVal(c) { var f = G.fo || {}, L = c.fonte || [];
  if (L.length === 2 && f[L[0]] && typeof f[L[0]] === 'object') { var x = f[L[0]][L[1]]; return x == null ? '' : S(x); }
  for (var i = 0; i < L.length; i++) { var v = f[L[i]]; if (v != null && S(v) !== '' && typeof v !== 'object') return S(v); } return ''; }
function editavel(c) { return !(window.MUTA_WEB&&window.MUTA_WEB.leitura) && !!c.secao && c.editavel !== false && !c.calculado; }
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
/* rótulo do campo no painel: honorários com ícone (quem paga, quanto e sobre o quê vêm no valor) */
function rotuloDe(c) { var E = window.MutaEtiquetas; return (/Honorários/.test(c.chave || '') && !/Recursais|Majora/i.test(c.chave || '') && E && E.svg ? '<i class="gl-ic" title="Quem paga, quanto e sobre o quê">' + E.svg('triste', 12) + '</i>' : '') + esc(c.rotulo); }
/* 0.38: o campo que a leitura dos autos preencheu sozinha leva a marca "autos" até ser conferido ou mudado */
function campo(c) {
  if(c.chave==='Origem - Peças vinculadas 1G'&&window.MutaReferencia)return window.MutaReferencia.html();
  var h = campo0(c), AU = window.MutaAutos;
  if (c.secao && AU && AU.preenchido && AU.preenchido(c.secao + '.' + c.chave)) h = h.replace(/^<div class="gf/, '<div class="gf au-auto').replace('</span>', ' <i class="au-tag" title="Preenchido pela leitura dos autos: confira">autos</i></span>');
  else if (c.secao && G.cnj && autoGabPos(c.secao + '.' + c.chave)) h = h.replace(/^<div class="gf/, '<div class="gf au-auto').replace('</span>', ' <i class="au-tag" title="Preenchido pela extensão: confira">auto</i></span>');
  return h;
}
function campo0(c) {
  var longo = c.tipo === 'texto-longo' || c.tipo === 'tabela' || /Honorários/.test(c.chave || ''), cls = 'gf' + (longo ? ' w' : '');
  if (c.tipo === 'tabela') {
    var tv = c.secao ? gravado(c.secao, c.chave) : '';
    return '<div class="' + cls + '" title="' + esc(dicaCampo(c)) + '"><span class="gl">' + rotuloDe(c) + (editavel(c) ? ' <small class="muted">· editar na ficha do Ex Officio</small>' : '') + '</span>' + tabela(c, tv) + '</div>';
  }
  if (!editavel(c)) {
    var v0 = c.secao ? gravado(c.secao, c.chave) : fonteVal(c);
    if (typeof v0 === 'object') v0 = '';
    return '<div class="' + cls + '" title="' + esc(dicaCampo(c)) + '"><span class="gl">' + rotuloDe(c) + '</span><span class="ro">' + (S(v0) ? esc(/^\d{4}-\d{2}-\d{2}$/.test(S(v0)) ? brD(v0) : v0) : '—') + '</span></div>';
  }
  var id = c.secao + '.' + c.chave, v = V(c.secao, c.chave), bloq = (id === 'producao.SERVIDOR' || id === 'producao.CORRETOR') && !G.gestor, h;
  if (typeof v === 'object') v = '';
  v = String(v);
  var at = ' data-fk="' + esc(id) + '"' + (bloq ? ' disabled title="Designação: só o gestor"' : '');
  /* lista curta e Sim/Não viram botões, como na gaveta da pauta */
  var OC = c.tipo === 'simnao' ? ['Sim', 'Não'] : c.tipo === 'lista' ? (c.opcoes || []).map(function (o) { return typeof o === 'string' ? o : o.valor; }) : null;
  if (OC && !bloq && OC.length && OC.length <= 6 && OC.every(function (o) { return o.length <= 26; })) {
    return '<div class="' + cls + (OC.length > 3 ? ' w' : '') + (id in G.pend ? ' mud' : '') + '" title="' + esc(dicaCampo(c)) + '"><span class="gl">' + rotuloDe(c) + '</span><div class="pm-seg gf-seg" role="group" aria-label="' + esc(c.rotulo) + '">' +
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
  return '<label class="' + cls + (id in G.pend ? ' mud' : '') + '" title="' + esc(dicaCampo(c)) + '"><span class="gl">' + rotuloDe(c) + '</span>' + h + '</label>';
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
var MODOS = ['Processo', 'Autos'];  /* 0.38: o Gerador foi para a aba Minuta; 0.47: o Roteiro entrou na aba Processo */
var ROT_MODO = {};
var FORA_PROC = { 'Autuação': 1, 'Partes': 1, 'Tramitação': 1, 'Autos extraídos do PJe': 1, 'Registro no acervo': 1, 'Acompanhamento': 1 };
var NO_TOPO = { 'Tipo de Julgamento': 1, 'Histórico de julgamento': 1, 'Mapa de próximos passos': 1, 'Avisos': 1, 'Síntese Processual': 1, 'Alegações': 1, 'Etiquetas sugeridas': 1, 'O que falta sanar': 1, 'Intercorrências': 1, 'Assunto detalhado': 1 };
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
  /* a etapa atual vem depois da última feita: processo designado direto para a pauta não passa pela confirmação da triagem */
  var n = 0; L.forEach(function (x, i) { if (x.ok) n = i + 1; });
  return { L: L, n: n, mono: mono };
}
function pautado() {
  var P = (G.op || {}).pauta || {}, SI = window.MutaSincronia && window.MutaSincronia.situacao ? window.MutaSincronia.situacao() : null;
  var C = SI && SI.cnj && SI.cnj.replace(/\D/g, '') === S(G.cnj).replace(/\D/g, '') ? SI.cartoes || [] : [];
  return C.length > 0 || (Array.isArray(P.sessoes) && P.sessoes.length > 0) || !!S(P['Sessão original']) || !!S(P['Item (Pauta de Julgamento)']);
}
function pilulas(E) {
  var d = function (k) { return S(V('producao', k)); }, nome = function (k) { return d(k).split(/\s*[\/,;]\s*/).map(function (x) { return x.split(/\s+/)[0]; }).filter(Boolean).join('/'); };
  var idx = function (ic) { for (var i = 0; i < E.L.length; i++) if (E.L[i].ic === ic) return i; return -1; };
  var P = [['min', 'Minuta', 'SERVIDOR', 'k-min'], ['rev', E.mono ? 'Revisão' : 'Correção', 'CORRETOR', 'k-rev']];
  /* 0.67: "Liberada" só em processo pautado e quando as caixas de liberação do editor (Aguardando a sessão) estão marcadas ou a liberação foi informada à mão */
  var lib = pjeDoProcesso() && window.MutaPje.liberacao ? window.MutaPje.liberacao() : null, libOk = lib && lib.tot && lib.ok === lib.tot, libMan = sim(d('LIBERADO')) || !!d('Data da Liberação');
  if (E.mono) P.push(['env', 'Enviada', '', 'k-lib'], ['ass', 'Assinada', '', 'k-lib']);
  else if (pautado() && (libOk || libMan)) P.push(['env', libMan ? 'Liberada' : 'Liberada no editor', '', 'k-lib' + (libMan ? '' : ' pl-pje')]);
  return P.map(function (p) {
    var i = idx(p[0]), x = E.L[i] || {}, ok = !!x.ok, at = i === E.n, dt = x.dt ? brD(x.dt) : '';
    var pode = at || i === E.n - 1, tt = at ? 'Marcar hoje' : i === E.n - 1 ? 'Desfazer' : ok ? 'Feita' : 'Depois da etapa anterior';
    var quem = p[2] ? (G.desEd === p[2] ? '<input type="text" id="pm-des" data-des="' + p[2] + '" value="' + esc(d(p[2])) + '" placeholder="nome" aria-label="' + p[1] + '">' :
      '<button type="button" class="pl-q" data-des-ed="' + p[2] + '"' + (G.gestor ? ' title="Designar (Enter grava)"' : ' disabled title="Designação: só o gestor"') + '>' + esc(nome(p[2]) || 'a designar') + '</button>') : '';
    return '<span class="pm-pl ' + p[3] + (ok ? ' ok' : at ? ' at' : '') + '"><button type="button" class="pl-e" data-et="' + i + '"' + (pode ? '' : ' disabled') + ' title="' + tt + '">' + esc(p[1]) + (p[2] ? ':' : '') + '</button>' + (quem ? ' ' + quem : '') +
      (dt ? '<span class="pl-d"> · ' + esc(dt) + '</span>' : '') + '</span>';
  }).join('');
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
  /* 0.64: etiqueta com a sigla da classe (TPU/CNJ) e o recurso julgado dentro do processo — "ApCiv · ED" */
  var etqCl = null; try { var TT = window.MutaRoteiro && window.MutaRoteiro.tipos ? window.MutaRoteiro.tipos(gRot(), G.cnj) : null; etqCl = window.ClassesCNJ ? window.ClassesCNJ.etiqueta((pjeDoProcesso() ? window.MutaPje.classe() : '') || classe, TT || V('triagem', 'Tipo de Julgamento')) : null; } catch (e) {}
  if (etqCl && etqCl.t) abrev = etqCl.t;
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
    var cls = x.ok ? 'ok' : i === E.n ? 'at' : i < E.n ? 'pul' : '', t = i === E.n ? 'Marcar hoje' : i === E.n - 1 ? 'Desfazer' : x.ok ? 'Feita' : i < E.n ? 'Sem registro: o processo seguiu sem esta etapa' : 'Depois da etapa anterior';
    return '<button type="button" class="pm-e ' + cls + '" data-et="' + i + '" title="' + t + '">' + (i === E.n ? '<em>agora</em>' : '') + '<span class="pm-o">' + SV(IC[x.ic], 14) + '</span><b>' + esc(x.r) + '</b><small>' + (x.dt ? esc(brD(x.dt).slice(0, 5)) : '—') + '</small></button>';
  }).join('');
  var pess = function (k, rot) { var v = S(V('producao', k));
    if (G.desEd === k) return '<span class="pm-pp ed"><span class="pm-pn"><small>' + rot + '</small><input type="text" id="pm-des" data-des="' + k + '" value="' + esc(v) + '" placeholder="nome" aria-label="' + rot + '"></span></span>';
    return '<button type="button" class="pm-pp' + (v ? '' : ' vz') + '" data-des-ed="' + k + '"' + (G.gestor ? ' title="Designar (Enter grava)"' : ' disabled title="Designação: só o gestor"') + '><span class="pm-av">' + esc(v ? iniciais(v) : '—') + '</span><span class="pm-pn"><small>' + rot + '</small>' + esc(v || 'não designado') + '</span></button>'; };
  return '<section class="pc pm">' +
    '<div class="pm-top"><span class="pm-fase">' + FASE[Math.min(E.n, FASE.length - 1)] + '</span>' + (dias != null ? '<span class="pm-dd' + (dias > 30 ? ' al' : '') + '">' + dias + ' dias na tarefa<i><i style="width:' + Math.min(100, dias / 60 * 100) + '%"></i></i></span>' : '') + '<span class="sp"></span>' + pills + '</div>' +
    '<div class="pm-l1"><button type="button" class="mono pc-cnj" data-copia="' + esc(G.cnj) + '" title="Copiar o número">' + esc(G.cnj) + '</button>' + (abrev ? '<button type="button" class="pc-cl" data-cl-tipo title="' + esc((etqCl && etqCl.nome) || classe) + ' · clique para o tipo de julgamento">' + esc(abrev) + '</button>' : '') +
      tjHtml + (AL.length ? '<button type="button" class="pm-al" data-aba="Autos" title="' + esc(AL.map(function (a) { return a.t; }).join(' · ')) + '">' + AL.length + ' alerta' + (AL.length > 1 ? 's' : '') + '</button>' : '') + '</div>' +
    '<p class="pm-as">' + (assunto ? '<b>' + esc(assunto) + '</b>' : '') + (!G.adEd && !S(gravado('triagem', 'Registro - Assunto detalhado')) && !S(V('triagem', 'Assunto detalhado')) ? '<button type="button" class="pm-ad-ic" data-ad="ed" title="Incluir o assunto detalhado (vai para a ficha; o Caput mostra o mesmo)" aria-label="Incluir o assunto detalhado">' + SV('<path d="M12 5v14M5 12h14"/>', 12) + '</button>' : '') + '</p>' +
    assuntoDetalhado() +
    /* 0.66: tipo de caso e especificidades junto do assunto e do assunto detalhado */
    '<div class="gr pm-esp">' + campoRot('triagem', 'Detalhamento do caso', 'Detalhamento do caso') + '</div>' +

    /* 0.65: etapas compactas — Minuta (verde), Correção/Revisão (azul), Liberada/Assinada (roxo); o nome designa, a data marca ou desfaz */
    '<div class="pm-pills">' + pilulas(E) + '</div>' +
    /* 0.66: encaminhamento junto do tipo de ato */
    '<div class="pm-resp">' + atoSel() + '<div class="gr pm-enc">' + situacaoHtml() + (N(V('producao', 'Destino')) === 'monocratica' ? campoRot('triagem', 'Hipóteses Monocrática', 'Hipótese do artigo 932') : '') + '</div></div>' +
    /* 0.49.1: 1ª seta = autuação e partes, em blocos com título (como a 2ª); os controles foram para a 2ª seta */
    '<details class="pm-aut pm-aut1"' + (G.autAb ? ' open' : '') + '><summary data-aut aria-label="Autuação e partes" title="Autuação e partes"><span class="pm-aut-t">autuação, partes e controles</span><i class="pm-aut-h"></i></summary>' +
      ((partes && !polos) || polos ? '<h4 class="pm-mer-h">Partes</h4>' : '') +
      (partes && !polos ? '<p class="pm-pt" title="' + esc(partes) + '">' + SV(IC.pt, 14) + '<span>' + esc(partes) + '</span></p>' : '') +
      (polos ? '<div class="pc-ps">' + polos + '</div>' : '') +
      (tarefa || dl ? '<h4 class="pm-mer-h">Autuação</h4>' : '') +
      (tarefa ? '<div class="pm-tf"><span>Tarefa no PJe</span><b>' + esc(tarefa) + '</b>' + (dias != null ? '<small>' + dias + ' dias</small>' : '') + '</div>' : '') +
      (dl ? '<dl class="pc-dl">' + dl + '</dl>' : '') +
      (window.MutaAutos ? '<div class="pm-sit">' + window.MutaAutos.htmlSituacao(gravado('triagem', 'Registro - Situação atual')) + '</div>' : '') +
      (etq.length ? '<h4 class="pm-mer-h">Etiquetas do PJe</h4><div class="pc-etq">' + etq.map(function (e) { return '<span class="chip">' + esc(e) + '</span>'; }).join('') + '</div>' : '') + /* 0.66: controles (urgência, meta, sobrestamento, caso sensível) na 1ª seta */ controlesProcesso(true) + '</details>' +
    merEnc() +
    '</section>';
}
/* 0.46 · 2ª seta do cartão: síntese e questões, mérito e encaminhamento (antes no Roteiro e na aba Processo); os campos só são
   desenhados com a seta aberta, para não repetir campos na tela */
function merEnc() {
  var ab = !!G.merAb, h = '<details class="pm-aut pm-mer"' + (ab ? ' open' : '') + '><summary aria-label="Mérito" title="Mérito: complexidade e tipo de voto"><span class="pm-aut-t">mérito</span><i class="pm-aut-h"></i></summary>';
  if (!ab) return h + '</details>';
  /* 0.50: com a seta aberta, o que dá para obter sozinho vai para os campos vazios (marca "auto", Desfazer) */
  if (!G._seco) try { autoGab(); situacaoSync(); } catch (e) {}
  var TR = window.MutaTriagem, mono = N(V('producao', 'Destino')) === 'monocratica';
  var etqX = (TR && TR.etiquetasDe ? TR.etiquetasDe(G.op, G.fo) : '') + (window.MutaAlertas ? window.MutaAlertas.htmlRoteiro(G.cnj, V('triagem', 'Etiquetas sugeridas'), function () { render(); }) : '');
  var ag = autoGabItens();
  return h + (ag.length ? '<div class="au-auto-av pm-auto"><span><b>' + ag.length + (ag.length === 1 ? ' campo preenchido' : ' campos preenchidos') + ' pela extensão</b> · marcados “auto”: confira</span><button type="button" class="lnk" data-autog="desfazer" title="Limpa o que a extensão pôs e não o repõe neste processo">Desfazer</button></div>' : '') +
    /* 0.64: síntese, questões, tipo de caso e especificidades foram para o painel acima dos roteiros (sinteseQuestoes) */
    '<h4 class="pm-mer-h">Mérito</h4><div class="gr">' +
      (S(V('triagem', 'COMPLEXIDADE')) ? campoRot('triagem', 'COMPLEXIDADE', 'Complexidade') : '') + campoRot('triagem', 'Tipo de Voto', 'Tipo de voto') + '</div>' +
    /* 0.50: pendências e etiquetas do gabinete saíram daqui (estão em Sinalizações e na 1ª seta); a situação é calculada pelas sinalizações */
    /* 0.66: encaminhamento foi para junto do tipo de ato e os controles para a 1ª seta */
    '</details>';
}
/* ---------- 0.50 · campos obtidos sozinhos na 2ª seta ----------
   Tipo de caso (assunto detalhado do Caput ou o assunto), tipo de voto (minuta-matriz da Conformidade ou tipo de julgamento
   e resultado) e hipótese do artigo 932 (fundamento e resultado da monocrática). Só campos vazios; Desfazer limpa o que
   ainda está como a extensão pôs e não repõe naquele processo (localStorage hero18810:autoGab). */
var AUTO_G = 'hero18810:autoGab';
function autoGabMem() { try { return JSON.parse(localStorage.getItem(AUTO_G) || '{}'); } catch (e) { return {}; } }
function autoGabGuardar(m) { try { localStorage.setItem(AUTO_G, JSON.stringify(m)); } catch (e) {} }
function hipotese932() {
  var res = N(V('producao', 'Voto - Resultado')) + ' ' + N(V('producao', 'Mono - Tipo de ato')), fund = N(V('producao', 'Mono - Fundamento')) + ' ' + N(V('triagem', 'Tipo de Julgamento'));
  if (/nao conhec|prejudicad|inadmiss|desist|intempest|deserc/.test(res + ' ' + fund)) return 'III · recurso inadmissível, prejudicado ou sem impugnação específica';
  var V5 = /^\s*(dou|deu|dado|provid|provimento)|parcial provimento|\bprovido|dou provimento/.test(res) && !/nego|negad|desprov/.test(res);
  if (/sumula/.test(fund)) return V5 ? 'V a · decisão recorrida contrária a súmula' : 'IV a · contrário a súmula do STF, STJ ou do TRF';
  if (/\btema\b|repetitiv|repercussao geral/.test(fund)) return V5 ? 'V b · decisão recorrida contrária a repetitivo' : 'IV b · contrário a repetitivo do STF ou STJ';
  if (/\birdr\b|\biac\b/.test(fund)) return V5 ? 'V c · decisão recorrida contrária a IRDR ou IAC' : 'IV c · contrário a IRDR ou IAC';
  return '';
}
function derivados() {
  var L = [], mono = N(V('producao', 'Destino')) === 'monocratica';
  L.push(['triagem.Tema', 'Tipo de caso', S(gravado('triagem', 'Registro - Assunto detalhado')) || S(V('triagem', 'Assunto detalhado')) || S(fonteVal({ fonte: ['Assunto'] }))]);
  var mx = null; try { mx = window.MutaComparar && window.MutaComparar.matriz ? window.MutaComparar.matriz() : null; } catch (e) {}
  var tj = S(V('triagem', 'Tipo de Julgamento')), res = S(V('producao', 'Voto - Resultado'));
  if (!mono) L.push(['triagem.Tipo de Voto', 'Tipo de voto', mx && (mx.nome || mx.titulo) ? S(mx.nome || mx.titulo) : tj && res ? tj + ' · ' + res : '']);
  if (mono) L.push(['triagem.Hipóteses Monocrática', 'Hipótese do artigo 932', hipotese932()]);
  return L.filter(function (x) { return S(x[2]); });
}
function autoGab() {
  if (window.MUTA_WEB || !G.cnj || !G.op) return;
  var k = Muta.chaveProcesso(G.cnj), M = autoGabMem(), m = M[k] = M[k] || { pos: {}, rec: {} }, mud = 0;
  derivados().forEach(function (x) {
    var i = x[0].indexOf('.'), atual = S(V(x[0].slice(0, i), x[0].slice(i + 1)));
    if (atual || m.rec[x[0]]) return;
    marcar(x[0], x[2]); m.pos[x[0]] = x[2]; mud++;
  });
  if (mud) { autoGabGuardar(M); agendar(800); }
}
function autoGabItens() {
  if (!G.cnj) return []; var m = autoGabMem()[Muta.chaveProcesso(G.cnj)]; if (!m) return [];
  return Object.keys(m.pos).filter(function (a) { var i = a.indexOf('.'); return S(V(a.slice(0, i), a.slice(i + 1))) === S(m.pos[a]); });
}
function autoGabDesfazer() {
  var k = Muta.chaveProcesso(G.cnj), M = autoGabMem(), m = M[k]; if (!m) return;
  autoGabItens().forEach(function (a) { marcar(a, ''); m.rec[a] = 1; delete m.pos[a]; });
  autoGabGuardar(M); agendar(400); render();
}
function autoGabPos(alvo) { return autoGabItens().indexOf(alvo) >= 0; }
/* situação para julgar: Pendente com pendência ou intercorrência em aberto; senão, Pronto. À mão só com motivo fora delas
   (escolha guardada neste navegador, hero18810:sitManual) */
var SIT_M = 'hero18810:sitManual';
function sitManual() { try { return !!JSON.parse(localStorage.getItem(SIT_M) || '{}')[Muta.chaveProcesso(G.cnj)]; } catch (e) { return false; } }
function sitManualSet(on) { try { var o = JSON.parse(localStorage.getItem(SIT_M) || '{}'), k = Muta.chaveProcesso(G.cnj); if (on) o[k] = 1; else delete o[k]; localStorage.setItem(SIT_M, JSON.stringify(o)); } catch (e) {} }
function abertas(t) { return snLinhas(t).filter(function (l) { return !/^✓/.test(l); }).length; }
function situacaoCalc() { var pd = abertas('pd'), ic = abertas('ic'); return { v: pd || ic ? 'Pendente' : 'Pronto para julgar', pd: pd, ic: ic }; }
function situacaoSync() { if (window.MUTA_WEB || !G.cnj || !G.op || sitManual()) return; var c = situacaoCalc(); if (S(V('producao', 'Destino - Situação')) !== c.v) { marcar('producao.Destino - Situação', c.v); agendar(800); } }
function situacaoHtml() {
  var c = situacaoCalc(), man = sitManual() || !!S(V('producao','Destino - Situação')), motivo = [c.pd ? c.pd + (c.pd > 1 ? ' pendências' : ' pendência') : '', c.ic ? c.ic + (c.ic > 1 ? ' intercorrências' : ' intercorrência') : ''].filter(Boolean).join(' e ');
  if (man) return '<div class="gf w pm-sitj"><span class="gl">Situação para julgar <i class="au-tag">à mão</i></span>' + chips('producao', 'Destino - Situação') + '<small class="muted">pelas sinalizações seria “' + esc(c.v) + '” · <button type="button" class="lnk" data-sitman="0">voltar ao cálculo</button></small></div>';
  return '<div class="gf w pm-sitj"><span class="gl">Situação para julgar</span><span class="pm-sitv ' + (c.v === 'Pendente' ? 'pend' : 'ok') + '">' + esc(c.v) + '</span><small class="muted">' + (motivo ? motivo + ' em aberto' : 'nenhuma pendência ou intercorrência em aberto') + ' · <button type="button" class="lnk" data-sitman="1" title="Para motivo que não está nas sinalizações">marcar à mão</button></small></div>';
}

window.MutaRender = function () { render(); };
/* faixa do usuário no topo do painel, acima das abas */
function faixaUsuario(s) {
  var t0 = $('topo-u'), t = $('tu-main'); if (!t0 || !t) return;
  var pb = $('pje-bar'); if (pb && t.contains(pb) && PJE_CASA && PJE_CASA.parentNode) PJE_CASA.parentNode.insertBefore(pb, PJE_CASA);
  t0.hidden = false;
  var on = s && s.estado === 'on';
  var q = function (attr, tit, svg) { return '<button type="button" class="tu-b" ' + attr + ' title="' + tit + '" aria-label="' + tit + '">' + SV(svg, 14) + '</button>'; };
  t.innerHTML = (on ? '<span class="tu-n"><i class="tu-av">' + esc(iniciais(s.usuario)) + '</i>' + esc(s.usuario) + '</span>' : '<span class="tu-n muted">HERO18810</span>') + '<span class="tu-pje" id="tu-pje-slot"></span>' +
    (on && G.cnj ? q('data-g="atualizar"', 'Atualizar o prontuário', '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>') : '') +
    '<a class="tu-b" target="_blank" rel="noopener noreferrer" href="' + SITE + '/exofficio/" title="Abrir o Ex Officio" aria-label="Abrir o Ex Officio">' + SV('<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>', 14) + '</a>' +
    (on && s.gestor ? '<button type="button" class="tu-b" data-tu-ctl title="Controle: prazos e etiquetas" aria-label="Controle: prazos e etiquetas">' + SV('<path d="M5 7h14M5 12h14M5 17h14"/><circle cx="9" cy="7" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="8" cy="17" r="1.8"/>', 14) + '</button>' : '') +
    q('data-tema-tu', 'Tema claro ou escuro', '<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/>') +
    (on ? q('data-sair', 'Sair', '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>') : '');
  var sl = $('tu-pje-slot'); if (sl && pb) { if (!PJE_CASA) { PJE_CASA = document.createComment('pje-bar'); pb.parentNode.insertBefore(PJE_CASA, pb); } sl.appendChild(pb); }
}
(function () { var t = $('topo-u'); if (!t) return; t.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return;
  if (b.hasAttribute('data-sair')) { gravarJa().catch(function () {}).then(function () { ses.sair(); }); }
  else if (b.dataset.g === 'atualizar') { gravarJa().catch(function () {}).then(function () { carregar(true); }); }
  else if (b.hasAttribute('data-tu-ctl')) { if (window.MutaAbas) window.MutaAbas.ir('ctl'); }
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
var SN = [['av', 'Aviso', 'triagem', 'Avisos'], ['pd', 'Pendência', 'triagem', 'O que falta sanar'], ['ic', 'Intercorrência', 'triagem', 'Intercorrências']];
function snLinhas(t) { var x = SN.filter(function (q) { return q[0] === t; })[0]; return S(V(x[2], x[3])).split(/\n+/).map(S).filter(Boolean); }
function tramiteMapa(){try{var m=JSON.parse(S(V('origem','Mapa de próximos passos'))||'{}');return {versao:1,passos:Array.isArray(m.passos)?m.passos:[],historico:Array.isArray(m.historico)?m.historico:[]};}catch(e){return {versao:1,passos:[],historico:[]};}}
function tramiteLog(m,p,acao,origem,extra){m.historico.push(Object.assign({id:p.id,texto:p.texto,acao:acao,origem:origem,autor:ses.estado().usuario||'',data:new Date().toISOString()},extra||{}));}
function tramiteDescricao(v){return S(v).replace(/\s*·\s*[^·]+\s*·\s*\d{2}\/\d{2}(?:\/\d{4})?(?: \d{2}:\d{2})?(?:\s*·\s*tr-[a-z0-9-]+)?$/,'');}
function tramiteIndice(L,p){return L.findIndex(function(l){return l.replace(/^✓\s*/,'')===p.vinculo;});}
function tramiteEstado(L,p){var i=tramiteIndice(L,p);return i<0?'ausente':/^✓/.test(L[i])?'resolvida':'aberta';}
function tramiteSinal(L){marcar('triagem.O que falta sanar',L.join('\n'));try{situacaoSync();}catch(e){}}
function snGravar(t, L) {
 var x=SN.filter(function(q){return q[0]===t;})[0];if(!x)return;
 if(t==='pd'){
  var m=tramiteMapa(),antes=snLinhas('pd'),mudou=false;
  m.passos.filter(function(p){return p.tipo==='pendencia'||p.condicao;}).forEach(function(p){
   var ref=p.tipo==='pendencia'?p:p.condicao,a=tramiteEstado(antes,ref),b=tramiteEstado(L,ref);if(a===b)return;
   if(b==='ausente'){var i=tramiteIndice(antes,ref);if(i>=0){if(tramiteIndice(L,ref)<0)L.push(antes[i]);st('Pendência vinculada: converta ou remova pelo Trâmite.','err');}return;}
   tramiteLog(m,p,b==='resolvida'?'pendência resolvida':'pendência reaberta','Sinalizações');mudou=true;
  });
  if(mudou)marcar('origem.Mapa de próximos passos',JSON.stringify(m));
 }
 marcar(x[2]+'.'+x[3],L.join('\n'));try{situacaoSync();}catch(e){}agendar(500);render();
}
function sinalizacoes() {
  var cont = {}, itens = [];
  SN.forEach(function (q) { snLinhas(q[0]).forEach(function (l, i) { var ok = /^✓\s*/.test(l); if (!ok) cont[q[0]] = (cont[q[0]] || 0) + 1; itens.push({ t: q[0], r: q[1], i: i, ok: ok, tx: l.replace(/^✓\s*/, '') }); }); });
  itens.sort(function (a, b) { return a.ok - b.ok; });
  var NOMES_SN = { av: ['aviso', 'avisos'], ic: ['intercorrência', 'intercorrências'], pd: ['pendência', 'pendências'] };
  var tag = function (t) { return cont[t] ? '<em class="sn-st ' + t + '">' + cont[t] + ' ' + NOMES_SN[t][cont[t] > 1 ? 1 : 0] + '</em>' : ''; };
  /* 0.49: incluir como em "Notas": botão no alto, que abre o campo com o seletor do tipo */
  return '<section class="card pc-sec sn" id="g-sn"><div class="pc-sh"><h3>' + SV(IC.sn, 13) + ' Sinalizações</h3>' + tag('ic') + tag('pd') + tag('av') + (!cont.ic && !cont.pd && !cont.av ? '<small class="muted">nada em aberto</small>' : '') +
    '<span class="sp"></span><button type="button" class="btn solid sm" data-sn-add aria-expanded="' + (G.snAb ? 'true' : 'false') + '">' + (G.snAb ? 'cancelar' : '+ Incluir sinalização') + '</button></div>' +
    (G.snAb ? '<div class="sn-n sn-novo"><select id="sn-tp" aria-label="Tipo">' + SN.map(function (q) { return '<option value="' + q[0] + '"' + ((G.snTp || 'pd') === q[0] ? ' selected' : '') + '>' + q[1] + '</option>'; }).join('') + '</select>' +
      '<textarea id="sn-tx" rows="2" placeholder="Descreva a sinalização (Enter inclui)"></textarea><button type="button" class="btn solid sm" data-sn-inc>Incluir</button></div>' : '') +
    (itens.length ? '<ul class="sn-l">' + itens.map(function (x) {
      var m = /^(.*?)\s*·\s*([^·]{2,40})\s*·\s*(\d{2}\/\d{2}(?:\/\d{4})?)$/.exec(x.tx);
      return '<li class="sn-i ' + x.t + (x.ok ? ' ok' : '') + '"><input type="checkbox" data-sn-ok="' + x.t + ':' + x.i + '"' + (x.ok ? ' checked' : '') + ' aria-label="Resolvida"><div><span class="sn-tp ' + x.t + '">' + x.r + '</span><p>' + esc(m ? m[1] : x.tx) + '</p>' + (m ? '<small>' + esc(m[2] + ' · ' + m[3]) + '</small>' : '') + '</div><button type="button" class="sn-x" data-sn-x="' + x.t + ':' + x.i + '" title="Excluir" aria-label="Excluir">×</button></li>';
    }).join('') + '</ul>' : '') +
    '<small class="muted sn-h">Intercorrência retém a liberação; pendência é o que falta sanar; aviso é só para ciência.</small></section>';
}
function snIncluir() {
  var i = $('sn-tx'), t = ($('sn-tp') || {}).value || 'pd', v = i ? S(i.value) : ''; if (!v) return;
  var u = ses.estado().usuario || '', d = new Date(), L = snLinhas(t);
  L.push(v.replace(/\s*\n+\s*/g, ' ') + ' · ' + (u || 'equipe') + ' · ' + pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1)); G.snTp = t; G.snAb = false; snGravar(t, L);
}
/* notas sobre o caso: log em origem.Observações ("DD/MM/AAAA HH:MM · autor · texto"), a nova no fim */
function notasL() { return S(V('origem', 'Observações')).split(/\n+/).map(S).filter(Boolean); }
function notas() {
  var L = notasL();
  return '<section class="card pc-sec nt" id="g-nt"><div class="pc-sh"><h3>' + SV(IC.nt, 13) + ' Anotações</h3><small class="muted">' + (L.length || 'nenhuma') + '</small><span class="sp"></span><button type="button" class="btn solid sm" data-nt-add title="Ctrl+Enter">+ Incluir nota</button></div>' +
    casoNotas() +
    (L.length ? '<ol class="nt-l">' + L.map(function (l, i) { var m = /^(\d{2}\/\d{2}\/\d{4}(?: \d{2}:\d{2})?)\s*·\s*(?:([^·]{2,40}?)\s*·\s*)?(.+)$/.exec(l);
      return '<li><p>' + esc(m ? m[3] : l) + '</p>' + (m ? '<small>' + esc([m[2], m[1]].filter(Boolean).join(' · ')) + '</small>' : '') + '<button type="button" class="sn-x" data-nt-x="' + i + '" title="Excluir esta nota" aria-label="Excluir">×</button></li>'; }).join('') + '</ol>' : '') +
    '<textarea id="nt-tx" rows="2" placeholder="Nova nota: síntese, observação, lembrete para quem vai revisar… (Ctrl+Enter inclui)"></textarea></section>';
}
/* 0.68 · síntese do processo, síntese fática e questões no card das notas, antes do log; vazio não ocupa espaço: vira um botão "+" */
var CS_AB = {};
function casoNotas() {
  var F = [['sp', 'triagem', 'Síntese Processual', 'Síntese do processo'], ['sf', 'triagem', 'Síntese Fática', 'Síntese fática']], h = '', vaz = [];
  F.forEach(function (f) { var v = S(V(f[1], f[2])); if (v || CS_AB[f[0]]) h += campoRot(f[1], f[2], f[3]); else vaz.push('<button type="button" class="nt-add" data-cs="' + f[0] + '">+ ' + f[3] + '</button>'); });

  return (h ? '<div class="gr nt-cs">' + h + '</div>' : '') + (vaz.length ? '<div class="nt-vz">' + vaz.join('') + '</div>' : '');
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

/* 0.52.1 · ato monocrático: sem campos que pedem relatório, voto, ementa ou acórdão (só servem à sessão) */
var SO_SESSAO = { 'Tipo de Voto': 1, 'Relatório Padronizado': 1, 'Adequação Ementa': 1, 'Formatação Subementa': 1, 'Rev - Ementa': 1, 'Rev - Subementa': 1, 'Mídias Necessárias': 1 };
function soSessao(chave) { return !!SO_SESSAO[chave] && destino() === 'monocratica'; }
function campoRot(sec, chave, rot) { if (soSessao(chave)) return ''; var c = campoModelo(sec, chave); if (!c) return ''; return campo(Object.assign({}, c, { rotulo: rot || c.rotulo })); }
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
function controlesProcesso(naSeta) {
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
  if (naSeta) return '<h4 class="pm-mer-h">Controles <small>' + (n ? n + ' em vigor' : 'nenhum em vigor') + '</small></h4><div class="ct-l pm-ctl2" id="g-ctl">' + linhas + '</div>';
  return '<section class="card pc-sec" id="g-ctl"><div class="pc-sh"><h3>Controles</h3><small class="muted">' + (n ? n + ' em vigor' : 'nenhum em vigor') + '</small></div><div class="ct-l">' + linhas + '</div></section>';
}
/* precedentes relacionados do processo aberto: no topo da aba Ementário */
function casoPrec() { return { cnj: G.cnj, assunto: fonteVal({ fonte: ['Assunto'] }),
    subassuntos: S(gravado('triagem', 'Registro - Assunto detalhado')) || S(V('triagem', 'Assunto detalhado')), questoes: S(V('triagem', 'Alegações')),
    sintese: [S(V('triagem', 'Síntese Processual')), S(V('triagem', 'Síntese Fática'))].join(' '), especificidades: [S(V('triagem', 'Especificidades')), S(V('triagem', 'Tema'))].join(' ') }; }
function precEmentario(k) { if (window.MutaEmentario && window.MutaEmentario.caso) window.MutaEmentario.caso(k); }
/* peças do processo (sentença, origem, recursos e contrarrazões, outras peças): um cartão só, uma seção por grupo */
/* 0.44 · grupos de documento vindos do Roteiro (em Autos › Peças e documentos): os campos são os mesmos da ficha */
var PECAS_DOC = [
  { grupo: 'Decisão impugnada', quando: function (tj) { return /agravo de instrumento|agravo interno|embargos|retrata/.test(tj) || !!S(V('triagem', 'Impugnada - ID')); },
    campos: [['triagem', 'Impugnada - ID'], ['triagem', 'Impugnada - Data'], ['triagem', 'Impugnada - Publicação'], ['triagem', 'Impugnada - Síntese'], ['triagem', 'Impugnada - Ementa literal'], ['triagem', 'Impugnada - Órgão'], ['triagem', 'Impugnada - Relator']] },
  { grupo: 'Parecer do MPF', campos: [['triagem', 'MPF'], ['triagem', 'ID do Parecer MPF'], ['triagem', 'MPF - Data'], ['triagem', 'Parecer - Sentido'], ['triagem', 'Parecer - Sentido (outro)'], ['triagem', 'MPF - Info adicional']] },
  { grupo: 'Procuração', campos: [['triagem', 'ID da Procuração'], ['triagem', 'Procurações']] }
];
var PECAS_ORDEM = { 'Sentença': ['Sentença - ID', 'Sentença - Data', 'Sentença - Publicação', 'Sentença - Decisão', 'Sentença - Resultado', 'Sentença - Honorários', 'Sentença - Custas', 'Sentença - Reexame', 'Sentença - Tutela', 'Sentença - Fundamento', 'Sentença - Providências'],
  'Origem': ['Origem - Juízo', 'Origem - Julgador', 'Origem - Valor da causa', 'Origem - Processo de referência', 'Origem - Documentos 1G'],
  'Recursos e contrarrazões': ['Contrarrazões - Situação', 'Recursos', 'Contrarrazões'] };
var PECAS_RESUMO = { 'Decisão impugnada': ['Impugnada - ID', 'Impugnada - Data'], 'Parecer do MPF': ['MPF', 'ID do Parecer MPF', 'Parecer - Sentido'], 'Procuração': ['ID da Procuração'], 'Sentença': ['Sentença - ID', 'Sentença - Data', 'Sentença - Decisão'], 'Origem': ['Origem - Juízo', 'Origem - Julgador'], 'Recursos e contrarrazões': ['Recursos', 'Contrarrazões - Situação'], 'Outras peças e ocorrências': ['Outras peças'] };
function pecasCartao(soGrupos) {
  var A = abaModelo('Processo'); if (!A) return '';
  var AU = window.MutaAutos;
  var gs = A.grupos.filter(function (g) { return !FORA_PROC[g.grupo] && grupoVisivel(g); });
  /* 0.44: as informações de documento do Roteiro (decisão impugnada, parecer do MPF, procuração) também moram aqui, em Peças e documentos */
  if (soGrupos) {
    var tj = N(V('triagem', 'Tipo de Julgamento')), outras = -1;
    gs.forEach(function (g, i) { if (outras < 0 && /^Outras pe/.test(g.grupo)) outras = i; });
    var extra = PECAS_DOC.filter(function (d) { return !d.quando || d.quando(tj); }).map(function (d) {
      return { grupo: d.grupo, campos: d.campos.map(function (k) { return campoModelo(k[0], k[1]); }).filter(Boolean) }; }).filter(function (g) { return g.campos.length; });
    if (extra.length) gs = outras < 0 ? gs.concat(extra) : gs.slice(0, outras).concat(extra, gs.slice(outras));
  }
  if (!gs.length) return '';
  var val = function (c) { var v = c.secao ? V(c.secao, c.chave) : fonteVal(c); return Array.isArray(v) ? (v.length ? v.length + ' item(ns)' : '') : S(v); };
  return (soGrupos ? '' : '<section class="card pc-sec pecas" id="g-pecas"><div class="pc-sh"><h3>Peças</h3><small class="muted">da ficha do processo</small></div>') + gs.map(function (g) {
    var ord = PECAS_ORDEM[g.grupo] || [], C = g.campos.slice().sort(function (a, b) { var ia = ord.indexOf(a.chave), ib = ord.indexOf(b.chave); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
    var n = C.filter(function (c) { return !!val(c); }).length, ab = G.pecAb && G.pecAb[g.grupo] != null ? G.pecAb[g.grupo] : false;
    var res = (PECAS_RESUMO[g.grupo] || []).map(function (k) { var c = C.filter(function (x) { return x.chave === k; })[0]; var v = c ? val(c) : ''; return /^\d{4}-\d{2}-\d{2}$/.test(v) ? brD(v) : k.indexOf('ID') >= 0 && v ? 'ID ' + v : v; }).filter(Boolean).join(' · ');
    /* no agravo de instrumento a "Sentença" da ficha guarda a decisão agravada */
    var titulo = g.grupo === 'Sentença' && /agravo de instrumento/i.test(((G.fo || {})['classe_judicial'] || (G.fo || {})['Classe'] || '') + ' ' + V('triagem', 'Tipo de Julgamento')) ? 'Decisão agravada' : g.grupo;
    return '<details class="pc-s"' + (ab ? ' open' : '') + ' data-grupo="' + esc(g.grupo) + '"><summary><span class="pc-s-t"><b>' + esc(titulo) + '</b>' + (res ? '<small>' + esc(res.slice(0, 120)) + '</small>' : '<small class="vz">sem registro</small>') + '</span><span class="gn">' + n + '/' + C.length + '</span></summary>' +
      (AU && AU.docsDoGrupo ? AU.docsDoGrupo(g.grupo) : '') + pecaExtracao(C, val) + '<div class="gr">' + C.map(campo).join('') + '</div></details>';
  }).join('') + (soGrupos ? '' : '</section>');
}
/* extrair da peça: o ID e a data vêm da cronologia; o resto (decisão, resultado, honorários…) só do texto da peça.
   O botão lê o texto (se ainda não lido) e preenche os campos vazios do grupo; nunca troca o que já está gravado. */
function pecaIdDe(C, val) {
  for (var i = 0; i < C.length; i++) { if (/(^|\s|-\s)ID(\s|$)|^ID\b/.test(C[i].chave)) { var v = S(val(C[i])).split(/[,;\s]+/).filter(function (x) { return /^\d{6,}$/.test(x); }); if (v.length) return v[v.length - 1]; } }
  return '';
}
function pecaSug(C) {
  var AU = window.MutaAutos; if (!AU || !AU.sugestoes) return [];
  var ids = {}; C.forEach(function (c) { if (c.secao) ids[c.secao + '.' + c.chave] = 1; });
  var vazio = function (alvo) { var i = alvo.indexOf('.'), v = V(alvo.slice(0, i), alvo.slice(i + 1)); return Array.isArray(v) ? !v.length : !S(v); };
  return AU.sugestoes().filter(function (x) { return !x.manual && x.alvo && ids[x.alvo] && x.status === 'novo' && vazio(x.alvo) && (Array.isArray(x.value) ? x.value.length : S(x.value)); });
}
function pecaExtracao(C, val) {
  var AU = window.MutaAutos; if (!AU || !AU.estado || !C.some(function (c) { return c.secao; })) return '';
  var EA = AU.estado();
  if (!EA.itens) return '<div class="pc-x"><small class="muted">Leia os autos (aba Autos) para extrair desta peça.</small></div>';
  var id = pecaIdDe(C, val), d = id ? EA.docs[id] : null, sug = pecaSug(C), h = '';
  if (sug.length) h += '<button type="button" class="btn solid sm" data-pec-apl="' + esc(id) + '" title="' + esc(sug.map(function (x) { return x.label || x.key; }).join(' · ')) + '">Preencher ' + sug.length + ' campo' + (sug.length > 1 ? 's' : '') + ' pela leitura</button>';
  if (id && (!d || d.estado === 'erro')) h += '<button type="button" class="btn ' + (sug.length ? 'line' : 'solid') + ' sm" data-pec-ler="' + esc(id) + '" title="Lê o texto da peça no PJe e preenche os campos vazios">Extrair da peça (ID ' + esc(id) + ')</button>' + (d && d.estado === 'erro' ? '<small class="err">' + esc(d.erro || 'erro na leitura') + '</small>' : '');
  else if (d && d.estado === 'lendo') h += '<small class="muted">lendo a peça ' + esc(id) + (d.prog ? ' · ' + esc(d.prog) : '') + '…</small>';
  else if (d && d.estado === 'sem') h += '<button type="button" class="btn solid sm" data-pec-ocr="' + esc(id) + '" title="A peça não tem camada de texto (digitalizada)">Ler com OCR e preencher</button>';
  else if (d && d.estado === 'ok' && !sug.length) {
    var vz = C.filter(function (c) { return c.secao && !val(c); }).map(function (c) { return c.rotulo || c.chave; });
    if (vz.length) h += '<small class="muted">Peça lida' + (d.ocr ? ' por OCR' : '') + '; a leitura não identificou: ' + esc(vz.join(', ')) + '. Preencha à mão.</small>';
  }
  if (!id && !sug.length) h += '<small class="muted">Sem ID da peça na ficha nem na cronologia lida.</small>';
  return h ? '<div class="pc-x">' + h + '</div>' : '';
}
function pecaPreencher(id) {
  var A = abaModelo('Processo'); if (!A) return 0;
  var C = []; A.grupos.forEach(function (g) { if (!FORA_PROC[g.grupo]) C = C.concat(g.campos); });
  var val = function (c) { var v = c.secao ? V(c.secao, c.chave) : fonteVal(c); return Array.isArray(v) ? (v.length ? '1' : '') : S(v); };
  /* só os campos dos grupos que citam esta peça (ou, sem ID, todos os da leitura) */
  var gs = A.grupos.filter(function (g) { return !FORA_PROC[g.grupo] && (!id || pecaIdDe(g.campos, val) === id); });
  var L = []; gs.forEach(function (g) { L = L.concat(pecaSug(g.campos)); });
  L.forEach(function (x) { marcar(x.alvo, x.value); });
  if (L.length) agendar(300);
  render(); return L.length;
}
/* 0.60 · Sinalizações e notas do caso: card recolhível no painel superior do prontuário (vale em Processo e em Autos) */
var SN_AB = null, SN_HTML = '';
var CAB_HTML = '';
function snCard() {
  var si = sinalizacoes(), nt = notas(), rg = grupos('Processo', function (g) { return g.grupo === 'Registro no acervo'; }, function () { return false; });
  /* 0.66: síntese do processo, síntese fática e questões antes das notas; notas acima das sinalizações */
  var cs = ''; /* 0.68: síntese e questões estão dentro do card das notas (casoNotas) */
  SN_HTML = cs + si + nt;
  var n = (si.match(/class="sn-i [a-z]+"/g) || []).length;
  var ab = SN_AB != null ? SN_AB : n > 0;
  /* 0.62: 3ª seta do cartão do processo (fundo cinza), no formato de "autuação e partes" */
  return '<details class="pm-aut pm-sn"' + (ab ? ' open' : '') + '><summary aria-label="Síntese, notas e sinalizações" title="Síntese, notas e sinalizações"><span class="pm-aut-t">síntese · notas · sinalizações' + (n ? ' · <b class="pm-sn-n">' + n + ' em aberto</b>' : '') + '</span><i class="pm-aut-h"></i></summary><div class="sn-b">' + cs + nt + si + rg + '</div></details>';
}
/* 0.64 · Síntese e questões: painel acima do seletor dos roteiros (vale para a triagem e para a produção) */
var SQ_AB = null, SQ_HTML = '';
function sinteseQuestoes() {
  var tc = S(V('triagem', 'Tema')), sp = S(V('triagem', 'Síntese Processual')), nq = S(V('triagem', 'Alegações')).split(/\n+/).filter(function (x) { return S(x); }).length;
  var vazio = !tc && !sp && !nq, ab = SQ_AB != null ? SQ_AB : vazio;
  SQ_HTML = campoRot('triagem', 'Detalhamento do caso', 'Detalhamento do caso') + campoRot('triagem', 'Síntese Processual', 'Síntese do processo') + questoes();
  var res = [tc || 'sem tipo de caso', nq ? nq + (nq > 1 ? ' questões' : ' questão') : 'sem questões', sp ? 'síntese preenchida' : 'sem síntese'].join(' · ');
  return '<details class="card sq-card"' + (ab ? ' open' : '') + '><summary><b>Síntese e questões</b><small>' + esc(res) + '</small></summary><div class="gr">' + SQ_HTML + '</div></details>';
}
function corpoProcesso() {
  /* 0.60: a aba Processo = Roteiro de triagem + Roteiro de produção; sinalizações, notas e registro no acervo foram para o card do topo (snCard) */
  /* 0.66: o painel Síntese e questões foi desfeito; os campos estão no cartão do processo (CAB_HTML) */
  var h = '<div class="rt-em-proc">' + corpoRoteiro() + '</div>', rot = G.rot === 'sol' ? 'sol' : G.rot === 'pro' ? 'pro' : 'tri';
  /* 0.55: sem repetição — o Roteiro de produção não repete o que já aparece no Roteiro de triagem, nesta aba ou nas setas do cartão */
  var ja = {}, sc = '';
  try { var ab0 = G.merAb; G.merAb = true; G._seco = 1; sc = merEnc() + controlesProcesso(true); G.merAb = ab0; G._seco = 0; } catch (e) { G._seco = 0; }
  sc += SN_HTML + CAB_HTML;
  (h + sc).replace(/data-(?:fk|ch)="([^"]+)"/g, function (m, k) { ja[k.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'")] = 1; return m; });
  /* 0.63: a aba Processo se divide em Roteiro de triagem | Roteiro de produção (a deduplicação usa sempre os dois) */
  var pro = camposCaso(ja);
  return '<div class="seg pmodos rt-modos" role="tablist" aria-label="Roteiro"><button type="button" role="tab" data-rot="tri" aria-selected="' + (rot === 'tri') + '">Roteiro de triagem</button><button type="button" role="tab" data-rot="pro" aria-selected="' + (rot === 'pro') + '">Roteiro de produção</button><button type="button" role="tab" data-rot="sol" aria-selected="' + (rot === 'sol') + '">Solicitações</button></div>' +
    (rot === 'sol' ? '<div id="hero-sol-main"></div>' : rot === 'tri' ? h : pro || '<div class="empty">Sem campos de produção para este processo.</div>');
}
/* 0.54 · Roteiro de produção: todos os campos da ficha que a Minuta-Matriz do Compendium usa (@apelido), do destino do caso
   (sessão ou monocrática). Preenchimento automatizado: a leitura dos autos põe sozinha o que acha nos campos vazios
   (autos.js › autoPreencher, marca "autos"), a extensão deriva o que se calcula (marca "auto") e, onde os autos divergem
   da ficha, o campo mostra a sugestão com "Usar". Grava na ficha; o Compendium relê a ficha sozinho. */
var CC_ABERTO = {};
/* 0.56 · Roteiro de produção por perfil da minuta (o tipo de ato vem do cartão do processo):
   Caso (o que o Compendium usa e não está acima) → Decisão monocrática (o mesmo do prontuário da página Monocráticas do Ex Officio)
   ou Acórdão (designação e minuta, revisão, relatório/voto/ementa, liberação) + Pauta e julgamento (histórico de pautas,
   sustentação/preferência, retirado/adiado e para quando). */
var CC_MONO = [['Decisão', [['producao', 'Mono - Título', 'Título do caso (painel do Desembargador)'], ['producao', 'Mono - Fundamento', 'Precedente ou fundamento'], ['triagem', 'Hipóteses Monocrática', 'Hipótese do art. 932'], ['producao', 'Voto - Resultado', 'Resultado'],
    ['producao', 'Voto - Honorários', 'Honorários'], ['producao', 'Tópico-síntese', 'Tópico-síntese (INSS)'], ['producao', 'Voto - Descrição', 'Detalhes da minuta']]],
  ['Designação e minuta', 'Designação e minuta'], ['Revisão', 'Revisão'],
  ['Assinatura e publicação', [['producao', 'Data da Liberação'], ['producao', 'Assinado'], ['producao', 'Data da Assinatura'], ['producao', 'Decisão - ID'], ['producao', 'Publicado'], ['producao', 'Mono - Data da publicação']]],
  ['Controle da monocrática', 'Monocrática'], ['Urgência', 'Urgência']];
var CC_AC = [['Designação e minuta', 'Designação e minuta'], ['Revisão', 'Revisão'], ['Relatório, voto e ementa', 'Relatório, voto e ementa'],
  ['Revisão do acórdão (ementa)', 'Revisão do acórdão (ementa)'], ['Liberação para a sessão', 'Liberação para a sessão']];
/* 0.58: Pauta e julgamento (histórico, sustentação, retirado/adiado) mora na aba Pauta — pautaHtml */
var CC_PROD = { 'Produção': 1, 'Pauta': 1, 'Controles especiais': 1 };
/* 0.57 · grupos do Caso pelo tipo de julgamento (o mesmo do Roteiro de triagem, automático ou escolhido nos botões):
   grupo fora do tipo some, salvo se já tem algo gravado; sem tipo identificado, aparece tudo. Título conforme o recurso. */
var CC_TIPO = { 'Sentença': ['ap', 'rn', 'ms'], 'Espécie e decisão impugnada': ['ai', 'agint', 'ed', 'ret'], 'Acórdão recorrido (embargos de declaração)': ['ed'],
  'Embargos de declaração': ['ed'], 'Agravo interno': ['agint'], 'Juízo de retratação': ['ret'] };
function ccTipos() { try { return window.MutaRoteiro && window.MutaRoteiro.tipos ? window.MutaRoteiro.tipos(gRot(), G.cnj) || {} : {}; } catch (e) { return {}; } }
function ccGrupoVale(g, T) {
  var L = CC_TIPO[g.grupo], tem = Object.keys(T).length;
  var cheio = (g.campos || []).some(function (c) { var v = c.secao ? gravado(c.secao, c.chave) : ''; return Array.isArray(v) ? v.length : !!S(v); });
  if (!L || !tem) return grupoVisivel(g) || cheio;
  return L.some(function (k) { return T[k]; }) || cheio;
}
function ccTitulo(g, T) {
  if (g.grupo === 'Espécie e decisão impugnada') return T.ai ? 'Decisão agravada' : T.ed ? 'Acórdão embargado' : T.agint ? 'Decisão agravada (agravo interno)' : T.ret ? 'Acórdão devolvido' : g.grupo;
  if (g.grupo === 'Sentença' && T.ms && !T.ap && !T.rn) return 'Sentença (mandado de segurança)';
  return g.grupo;
}
function camposCaso(ja) {
  ja = ja || {};
  var AU = window.MutaAutos, SG = AU && AU.sugestoes ? AU.sugestoes() : [], tot = 0, ok = 0, au = 0, vist = {}, mono = destino() === 'monocratica';
  function comSug(c) {
    var alvo = c.secao + '.' + c.chave, h = campo(c), k = -1;
    if (/au-tag/.test(h)) au++;
    SG.forEach(function (it, i) { if (k < 0 && it.alvo === alvo && it.status !== 'igual' && it.kind !== 'tabela' && S(it.value)) k = i; });
    if (k < 0) return h;
    var v = S(SG[k].value); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) v = v.split('-').reverse().join('/');
    return h + '<div class="rt-s"><span>Autos' + (SG[k].doc ? ' (ID ' + esc(SG[k].doc) + ')' : '') + ':</span> <b>' + esc(v.slice(0, 140)) + '</b><button type="button" class="btn line sm" data-rt="u:' + k + '">Usar</button></div>';
  }
  /* campo entra uma vez só e nunca o que já aparece acima; o tipo de ato fica no cartão */
  function usa(c, ro) { var id = c.secao + '.' + c.chave; if(/^(triagem\.(Hipóteses Monocrática|Art\. 932 - Nota de enquadramento)|producao\.Art\. 932 - Confirmação)$/.test(id))return false; if (!c.secao || vist[id] || ja[id] || TRI_EXTRA[c.chave] || /^(Síntese Processual|Síntese Fática|Alegações)$/.test(c.chave) || c.chave === 'Mono - Tipo de ato' || c.chave === 'Destino' || soSessao(c.chave) || c.tipo === 'tabela') return false;
    if (!ro && !editavel(c)) return false; vist[id] = 1; return true; }
  function bloco(id, cs, extra) {
    if (!cs.length && !extra) return '';
    var ed = cs.filter(editavel), n = ed.filter(function (c) { return !!S(V(c.secao, c.chave)); }).length; tot += ed.length; ok += n;
    var ab = CC_ABERTO[id] != null ? CC_ABERTO[id] : n < ed.length && tot <= 30;
    return '<details class="gg" data-cc="' + esc(id) + '"' + (ab ? ' open' : '') + '><summary><h4>' + esc(id) + '</h4><span class="gn">' + n + '/' + ed.length + '</span></summary><div class="gr">' + (extra || '') + cs.map(comSug).join('') + '</div></details>';
  }
  function doGrupo(nome, ro) { var g = grupoModelo(nome); return g ? (g.campos || []).filter(function (c) { return usa(c, ro); }) : []; }
  function daLista(L) { return L.map(function (x) { var c = campoModelo(x[0], x[1]); if (!c || !usa(c)) return null; return x[2] ? Object.assign({}, c, { rotulo: x[2] }) : c; }).filter(Boolean); }
  /* 1. Caso: abas Processo e Triagem */
  var T = ccTipos();
  var caso = ((G.F && G.F.abas) || []).filter(function (a) { return !CC_PROD[a.aba]; }).map(function (a) {
    return (a.grupos || []).filter(function (g) { return !g.controle && !GRUPOS_TRIAGEM[g.grupo] && ccGrupoVale(g, T); }).map(function (g) {
      return bloco('Caso · ' + ccTitulo(g, T), (g.campos || []).filter(function (c) { return c.apelido && usa(c); }));
    }).join('');
  }).join('');
  /* 2. perfil da minuta */
  var perfil = (mono ? CC_MONO : CC_AC).map(function (s) {
    var cs = Array.isArray(s[1]) ? daLista(s[1]) : doGrupo(s[1], s[1] === 'Pauta e julgamento' || s[1] === 'Monocrática'), extra = '';
    if (s[1] === 'Pauta e julgamento') extra = historicoPautas();
    return bloco((mono ? 'Decisão monocrática · ' : 'Acórdão · ') + s[0], cs, extra);
  }).join('');
  if (!tot) return '';
  var pct = Math.round(100 * ok / tot);
  return '<section class="card rt-top cc-caso"><div class="rt-tt"><b>Roteiro de produção</b><span class="rt-n">' + ok + '/' + tot + '</span>' + (au ? '<span class="rt-al cc-au">' + au + ' automático' + (au > 1 ? 's' : '') + '</span>' : '') + '</div>' +
    '<div class="rt-bar"><i style="width:' + pct + '%"></i></div>' + (AU && AU.barra ? AU.barra() : '') +
    '<p class="muted">Perfil da minuta: <b>' + (mono ? 'decisão monocrática' : 'acórdão') + '</b>, pelo pronunciamento do cartão do processo' + (Object.keys(T).length && window.MutaRoteiro ? '; campos do caso de <b>' + window.MutaRoteiro.TIPOS.filter(function (x) { return T[x[0]]; }).map(function (x) { return x[1].toLowerCase(); }).join(', ') + '</b>, pelo tipo de julgamento do Roteiro de triagem' : '') + '. Os autos lidos preenchem sozinhos os vazios; confira o que vier marcado. Grava na ficha.</p>' +
    caso + perfil + '</section>';
}
/* 0.58 · aba Pauta › Processo em tela: situação, remarcação e sustentação/preferência (gravam na ficha) e o histórico de pautas */
function pautaHtml() {
  if (!G.F || !G.cnj) return '<p class="muted">Lendo o prontuário…</p>';
  var P = (G.op || {}).pauta || {}, br2 = function (d) { return /^\d{4}-\d{2}-\d{2}/.test(S(d)) ? S(d).slice(0, 10).split('-').reverse().join('/') : S(d); };
  var g = grupoModelo('Pauta e julgamento'), cs = g ? g.campos || [] : [], dt = function (k) { var v = S(P[k]); return v ? esc(br2(v)) : '—'; };
  var mono = destino() === 'monocratica', st = S(V('pauta', 'Status de Julgamento')) || 'PAUTADO', so = S(V('pauta', 'Sustentação oral'));
  /* resumo, no formato da 1ª seta do cartão */
  var dl = [['Situação', esc(st)], ['Sessão original', dt('Sessão original')], ['Item', esc(S(P['Item (Pauta de Julgamento)']) || '—')],
    ['Sessão de destino', dt('Nova sessão de destino')], ['Sustentação / preferência', esc(so || '—')], ['Julgamento', esc(S(P.JULGAMENTO) || '—')]]
    .map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('');
  var pje = [['Publicação da pauta', 'Pauta - Publicação'], ['Inclusão na pauta', 'Pauta - Inclusão'], ['Proclamação', 'Pauta - Proclamação'], ['Último movimento', 'Pauta - Último movimento']]
    .filter(function (x) { return S(P[x[1]]); }).map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + esc(br2(P[x[1]])) + '</dd></div>'; }).join('');
  var ed = cs.filter(function (c) { return editavel(c); });
  return '<div class="pc pa-pc"><div class="pa-st0"><span class="pa-sit s-' + esc(N(st).replace(/\s+/g, '-')) + '">' + esc(st) + '</span>' + (mono ? '<small class="muted">destino monocrático: sem pauta de sessão</small>' : '') + '</div>' +
    '<h4 class="pm-mer-h">Sessões de julgamento</h4>' + historicoPautas() +
    '<h4 class="pm-mer-h">Resumo da pauta</h4><dl class="pc-dl">' + dl + '</dl>' +
    (pje ? '<h4 class="pm-mer-h">No PJe</h4><dl class="pc-dl">' + pje + '</dl>' : '') +
    '<details class="pm-aut pa-reg"><summary><span class="pm-aut-t">registrar situação, remarcação e sustentação</span><i class="pm-aut-h"></i></summary><div class="gr">' + ed.map(campo).join('') + '</div></details></div>';
}
/* histórico de pautas do processo: sessões registradas na ficha e cartões das pautas em curso (retirado, adiado, sustentação, preferência) */
function historicoJulgamento(){
 var P=(G.op||{}).pauta||{},E=[],seen=new Set();
 function dia(v){v=S(v);var m=/^(\d{2})\/(\d{2})\/(\d{4})/.exec(v);return m?m[3]+'-'+m[2]+'-'+m[1]:/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):'';}
 function add(dt,t,info,id){var d=dia(dt),k=[d,t,S(id),S(info)].join('|');if(seen.has(k))return;seen.add(k);E.push({d:d,t:t,info:S(info),id:S(id)});}
 var sessoes=Array.isArray(P.sessoes)?P.sessoes:[],por={};
 function sess(d,it,r){d=dia(d);if(!d)return;var x=por[d]||(por[d]={});if(it)x.i=S(it);if(r)x.r=S(r);}
 sessoes.forEach(function(x){if(x)sess(x.sessao,x.item,x.resultado);});
 sess(P['Sessão original'],P['Item (Pauta de Julgamento)'],P['Status de Julgamento']);
 var SI=window.MutaSincronia&&window.MutaSincronia.situacao?window.MutaSincronia.situacao():null;
 if(SI&&dg(SI.cnj)===dg(G.cnj))(SI.cartoes||[]).forEach(function(c){sess(c.sessao,c.item,c.resultado);});
 Object.keys(por).forEach(function(d){var x=por[d];add(d,'Sessão de julgamento',[x.i?'Item '+x.i:'',x.r].filter(Boolean).join(' · '));});
 if(P['Nova sessão de destino']&&dia(P['Nova sessão de destino'])&&!por[dia(P['Nova sessão de destino'])])add(P['Nova sessão de destino'],'Sessão prevista / remarcação',P['Motivo da remarcação']);
 ['Publicação','Proclamação'].forEach(function(k){var v=P['Pauta - '+k];if(dia(v))add(v,k==='Publicação'?'Publicação da pauta':'Proclamação do julgamento','');});
 var R=V('origem','Recursos'),ids=new Set();if(Array.isArray(R))R.forEach(function(r){if(!r)return;var L=S(r.ids).match(/\b\d{6,}\b/g)||[];L.forEach(function(id){ids.add(id);});add(r.data,'Recurso interposto',r.parte,L.join(', ')||S(r.ids));});
 var AU=window.MutaAutos,au=AU&&AU.doProcesso&&AU.doProcesso(),sig=window.MutaSigilo;
 if(!(sig&&(sig.bloqueado()||sig.sigiloso()))){
   var H=V('triagem','Registro - Peças'),D=(au&&au.lista||[]).concat(Array.isArray(H)?H.map(function(r){return {id:r.id,tipo:r.peca,data:r.data};}):[]);
   D.forEach(function(r){if(!r||r.anexo||sig&&sig.docSigiloso&&sig.docSigiloso(r))return;var tipo=S(r.tipo),id=S(r.id);if(id&&ids.has(id))return;if(!/^(apela|agravo|embargos de declara|recurso|ac[óo]rd[ãa]o|decis[ãa]o|senten[çc]a|ju[íi]zo de retrata)/i.test(tipo))return;if(id)ids.add(id);add(r.data,tipo,'',id);});
 }
 var ass=V('producao','Data da Assinatura'),pub=V('producao','Mono - Data da publicação'),idDec=V('producao','Decisão - ID');if(ass)add(ass,'Assinatura da decisão','',idDec);if(pub)add(pub,'Publicação da decisão','',idDec);
 E.sort(function(a,b){return (a.d||'9999').localeCompare(b.d||'9999');});
 return E.length?'<ol class="cc-pautas pa-tl hero-julg-tl">'+E.map(function(e){return '<li><b>'+esc(e.d?brD(e.d):'Sem data')+'</b><span>'+esc(e.t)+'</span>'+(e.id?'<small>ID '+esc(e.id)+'</small>':'')+(e.info?'<small>'+esc(e.info)+'</small>':'')+'</li>';}).join('')+'</ol>':'<p class="muted">Nenhum evento de julgamento registrado.</p>';
}
function historicoPautas() {
  var P = (G.op || {}).pauta || {}, L = [], br2 = function (d) { return /^\d{4}-\d{2}-\d{2}/.test(S(d)) ? S(d).slice(0, 10).split('-').reverse().join('/') : S(d); };
  var poe = function (d, o) { d = S(d).slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return; var e = L.filter(function (x) { return x.s === d; })[0]; if (!e) { e = { s: d }; L.push(e); } Object.keys(o).forEach(function (k) { if (o[k] && !e[k]) e[k] = o[k]; }); };
  (Array.isArray(P.sessoes) ? P.sessoes : []).forEach(function (x) { if (x) poe(x.sessao, { i: S(x.item), r: S(x.resultado) }); });
  if (P['Sessão original']) poe(P['Sessão original'], { i: S(P['Item (Pauta de Julgamento)']), o: 'sessão original' });
  if (P['Nova sessão de destino']) poe(P['Nova sessão de destino'], { o: 'remarcado para esta sessão', m: S(P['Motivo da remarcação']) });
  var SI = window.MutaSincronia && window.MutaSincronia.situacao ? window.MutaSincronia.situacao() : null, C = SI && SI.cnj && SI.cnj.replace(/\D/g, '') === S(G.cnj).replace(/\D/g, '') ? SI.cartoes : [];
  (C || []).forEach(function (c) { poe(c.sessao, { i: S(c.item), r: S(c.resultado), so: (c.ctl || {}).sopref || '', atual: 1, srv: S(c.servidor), lib: S(c.dataLiberacao) }); });
  if (!L.length) return '<p class="muted">Sem pauta registrada para este processo.</p>';
  L.sort(function (a, b) { return a.s.localeCompare(b.s); });
  var hj = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
  return '<ol class="cc-pautas pa-tl">' + L.map(function (x) {
    var r = x.r || (x.s >= hj ? (x.atual ? 'em pauta' : 'prevista') : ''), k = /retirad/i.test(r) ? 'ret' : /adiad/i.test(r) ? 'adi' : x.s >= hj ? 'fut' : r ? 'jul' : 'pas';
    return '<li class="pa-tl-' + k + '"><b>' + esc(br2(x.s)) + '</b>' + (x.i ? '<span>item ' + esc(x.i) + '</span>' : '') + (r ? '<span class="cc-pr">' + esc(r) + '</span>' : '') +
      (x.so ? '<span class="pa-tl-so">' + esc(x.so) + '</span>' : '') + (x.o ? '<small>' + esc(x.o) + (x.m ? ' · ' + esc(x.m) : '') + '</small>' : '') + (x.lib ? '<small>liberado em ' + esc(br2(x.lib)) + '</small>' : '') + '</li>';
  }).join('') + '</ol>';
}
document.addEventListener('toggle', function (e) { var d = e.target; if (d && d.getAttribute && d.getAttribute('data-cc') != null) CC_ABERTO[d.getAttribute('data-cc')] = d.open; }, true);
function corpoTriagem() {
  var AU = window.MutaAutos, TR = window.MutaTriagem, h = '';
  if (AU) h += AU.htmlConferencia();
  if (TR && TR.etiquetasDe) h += TR.etiquetasDe(G.op, G.fo);
  var A = abaModelo('Triagem');
  if (A) h += A.grupos.filter(function (g) { return g.grupo !== 'Registro da triagem (lote)' && (!g.destino || g.destino === destino()) && grupoVisivel(g); }).map(function (g, i) {
    var g2 = Object.assign({}, g, { campos: g.campos.filter(function (c) { return !NO_TOPO[c.chave]; }) });
    return grupoHtml(g2, i < 2);
  }).join('');
  /* 0.46.1: sem o quadro "Registro da triagem" */
  return h;
}
/* tipo de ato / pronunciamento, no topo de Produção: define o destino (sessão, monocrática, outro) e o tipo de ato */
var PRON = [['Acórdão (sessão)', 'Sessão', ''], ['Decisão monocrática', 'Monocrática', 'Decisão monocrática (art. 932)'], ['Decisão de urgência', 'Monocrática', 'Decisão de urgência'],
  ['Despacho', 'Monocrática', 'Despacho'], ['Admissibilidade', 'Monocrática', 'Decisão de admissibilidade'], ['Juízo de retratação', 'Monocrática', 'Juízo de retratação'],
  ['Homologação / extinção', 'Monocrática', 'Homologação / extinção'], ['Outro destino', 'Outro destino', ''], ['Decisão interlocutória', 'Monocrática', 'Decisão interlocutória']];
function pronAtual() { var d = destGrav(), t = S(V('producao', 'Mono - Tipo de ato'));
  for (var i = 0; i < PRON.length; i++) { if (PRON[i][1] === d && (d !== 'Monocrática' || PRON[i][2] === t || (!t && i === 1))) return i; } return -1; }
/* 0.44 · sem tipo de ato gravado: sugestão pela tarefa do PJe, pela triagem e pelas últimas peças e movimentações dos autos lidos.
   É só sugestão: vale o que a pessoa escolher. Índices de PRON: 0 acórdão, 1 monocrática, 2 urgência, 3 despacho, 5 retratação, 6 homologação/extinção. */
function sugerirAto() {
  var tf = N(window.MutaPje && window.MutaPje.tarefa ? window.MutaPje.tarefa() : ''), tj = N(V('triagem', 'Tipo de Julgamento'));
  var urg = S(V('triagem', 'Urgência')), urgAp = N(V('triagem', 'Urgência - Apreciação')), hip = N(V('triagem', 'Hipóteses Monocrática'));
  var AU = window.MutaAutos, L = AU && AU.doProcesso ? ((AU.doProcesso() || {}).lista || []) : [];
  var ult = L.filter(function (d) { return !d.anexo; }).sort(function (a, b) { return Number(b.id) - Number(a.id); }).slice(0, 4), txt = N(ult.map(function (d) { return d.tipo + ' ' + (d.desc || '') + ' ' + (d.movs || []).join(' '); }).join(' | '));
  var u0 = ult[0] ? N(ult[0].tipo + ' ' + (ult[0].desc || '') + ' ' + (ult[0].movs || []).join(' ')) : '';
  if (/urgencia|liminar|tutela|efeito suspensivo/.test(tf)) return { i: 2, por: 'tarefa do PJe' };
  if (urg && !/apreciad|decidid|prejudicad/.test(urgAp)) return { i: 2, por: 'urgência não apreciada na triagem' };
  if (/retratacao/.test(tf + ' ' + tj) || /devolu[a-z]* .*(vice|retratacao)|juizo de retratacao/.test(txt)) return { i: 5, por: /retratacao/.test(tf) ? 'tarefa do PJe' : /retratacao/.test(tj) ? 'tipo de julgamento' : 'devolução da Vice-Presidência nos autos' };
  if (/desistencia|renuncia|acordo|transacao|homologa/.test(u0)) return { i: 6, por: 'última peça: ' + (ult[0].desc || ult[0].tipo) };
  if (/pedido de (tutela|liminar|efeito)|tutela (de urgencia|antecipada)|efeito suspensivo/.test(u0)) return { i: 2, por: 'última peça: ' + (ult[0].desc || ult[0].tipo) };
  if (/^(possivel|provavel|cabivel)/.test(hip)) return { i: 1, por: 'hipótese de monocrática na triagem' };
  if (/sessao|pauta|relatorio e voto|voto/.test(tf)) return { i: 0, por: 'tarefa do PJe' };
  if (ult[0] && ult[0].k === 'peticao' && !/contrarraz|parecer|apelacao|agravo|embargos|inicial/.test(u0)) return { i: 3, por: 'última peça é petição intercorrente: ' + (ult[0].desc || ult[0].tipo) };
  if (/embargos de declaracao|agravo interno|apelacao|remessa/.test(tj)) return { i: 0, por: 'tipo de julgamento: ' + V('triagem', 'Tipo de Julgamento') };
  if (/contrarraz|parecer/.test(u0)) return { i: 0, por: 'recurso respondido (' + (ult[0].desc || ult[0].tipo) + ')' };
  var cl = N(((G.fo || {}).classe_judicial) || ((G.fo || {}).Classe) || '');
  if (/apela|remessa|agravo de instrumento|embargos de declara|agravo interno/.test(cl)) return { i: 0, por: 'classe do processo, sem urgência nem hipótese de monocrática na triagem' };
  return null;
}
/* Sugestão é uma indicação dentro da própria opção, sem definir o ato. */
function atoOpcoes(k) {
  var sug = k < 0 ? sugerirAto() : null;
  return '<option value=""' + (k < 0 ? ' selected' : '') + '>A definir</option>' +
    PRON.map(function (x, i) {
      var indicado = sug && sug.i === i;
      return '<option value="' + i + '"' + (i === k ? ' selected' : '') +
        (indicado ? ' title="' + esc('Sugestão: ' + sug.por) + '"' : '') +
        '>' + esc(x[0] + (indicado ? ' · sugerido' : '')) + '</option>';
    }).join('');
}
function atoSel() {
  var k = pronAtual();
  return '<label class="pm-pp pm-ato"><span class="pm-pn"><small>Pronunciamento</small><select id="pm-pron" aria-label="Pronunciamento">' + atoOpcoes(k) + '</select></span></label>';
}
function pronunciamento() {
  var k = pronAtual();
  return '<section class="card pc-sec pm-pron"><div class="pc-sh"><h3>Pronunciamento</h3><small class="muted">' + (k < 0 ? 'a definir na triagem' : esc(PRON[k][1] === 'Sessão' ? 'vai à sessão' : PRON[k][1] === 'Monocrática' ? 'decisão do relator' : 'outro destino')) + '</small></div>' +
    '<select id="pm-pron" class="pm-pron-s" aria-label="Pronunciamento">' + atoOpcoes(k) + '</select></section>';
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
  if (a === 'Processo') { var R0 = window.MutaRoteiro && window.MutaRoteiro.resumo ? window.MutaRoteiro.resumo(gRot()) : null; if (R0) return R0.ok + '/' + R0.total; var k = 0; SN.forEach(function (q) { snLinhas(q[0]).forEach(function (l) { if (!/^✓/.test(l)) k++; }); }); return k ? String(k) : ''; }
  if (a === 'Autos') { var AE = window.MutaAutos && window.MutaAutos.estado(); if (!AE || !AE.itens) return ''; var nd = window.MutaAutos.lista().length, nl = Object.keys(AE.docs || {}).filter(function (k) { return /^(ok|sem)$/.test(AE.docs[k].estado); }).length; return nl + '/' + nd; }
  if (a === 'Roteiro') { var R = window.MutaRoteiro && window.MutaRoteiro.resumo ? window.MutaRoteiro.resumo(gRot()) : null; return R ? R.ok + '/' + R.total : ''; }
  if (a === 'Produção') return preench('Produção');
  return '';
}   /* marcador do lugar original da faixa do PJe (fora do cartão quando não há processo) */
/* Roteiro: a triagem em passos, pelo tipo de julgamento (roteiro.js) */
function gRot() { return { V: V, F: function (k) { return fonteVal({ fonte: [k] }); }, cnj: function () { return G.cnj; }, marcar: marcar, gravar: function () { return gravarJa(); } }; }
/* o Roteiro de triagem reúne toda a triagem: os passos, a leitura dos autos, as etiquetas, o registro do lote e os demais campos */
var FORA_ROT = { 'Avisos': 1, 'Síntese Processual': 1, 'Alegações': 1, 'O que falta sanar': 1, 'Intercorrências': 1, 'Assunto detalhado': 1, 'Tipo de Julgamento': 1, 'Etiquetas sugeridas': 1 };
/* Autos: a conferência automática, a lista de peças (com detalhamento, JSON, OCR e PDF) e o preenchimento pelos autos */
/* 0.38: Leitura dos autos (o que achou e o que pôs na ficha) → A conferir (alertas e divergências) → Peças e documentos */
/* 0.52.2 · A conferir dentro de Peças e documentos: um só painel para conferir, editar e gravar na ficha */
var CF_ABERTO = true;
function corpoAutos() {
  var AU = window.MutaAutos; if (!AU || !AU.htmlLeitura) return pecasCartao();
  var cf = AU.htmlConferir(), dc = AU.htmlDocs(function () { return pecasCartao(true); });
  if (cf) cf = cf.replace(/^<section class="card pc-sec" id="g-cf"><div class="pc-sh"><h3>A conferir<\/h3>(<small[^>]*>[\s\S]*?<\/small>)<\/div>/, '<details class="gg au-cf" id="g-cf"' + (CF_ABERTO ? ' open' : '') + '><summary><h4>A conferir</h4>$1</summary><div class="gr au-cf-b">').replace(/<\/section>$/, '</div></details>');
  var i = dc.indexOf('</div>', dc.indexOf('<h3>Peças e documentos</h3>'));
  if (cf && i > 0 && /^<details/.test(cf)) return AU.htmlLeitura() + dc.slice(0, i + 6) + cf + dc.slice(i + 6);
  return AU.htmlLeitura() + cf + dc;
}
document.addEventListener('toggle', function (e) { if (e.target && e.target.id === 'g-cf' && e.target.tagName === 'DETAILS') CF_ABERTO = e.target.open; }, true);
/* 0.55: Roteiro de triagem = admissibilidade e MPF (e os passos); matéria, espécie e decisão impugnada ficam no Roteiro de produção */
var GRUPOS_TRIAGEM = { 'Admissibilidade e regularidade': 1, 'Ministério Público': 1 };
/* 0.59: mídias e etiquetas do gabinete (e as sugeridas, no quadro de etiquetas) também são triagem */
var TRI_EXTRA = { 'Mídias': 1, 'Etiquetas': 1, 'Etiquetas sugeridas': 1, 'Seleção Prévia': 1 };
function corpoRoteiro() {
  if (!window.MutaRoteiro) return '<div class="empty">Roteiro indisponível.</div>';
  var A = abaModelo('Triagem'), todos = [], TR = window.MutaTriagem, AU = window.MutaAutos;
  if (A) A.grupos.filter(function (g) { return (GRUPOS_TRIAGEM[g.grupo] || g.grupo === 'Matéria e gestão') && grupoVisivel(g); }).forEach(function (g) { g.campos.forEach(function (c) { if (c.secao && !FORA_ROT[c.chave] && (GRUPOS_TRIAGEM[g.grupo] || TRI_EXTRA[c.chave])) todos.push([c.secao, c.chave, c.rotulo]); }); });
  return window.MutaRoteiro.html(gRot(), campoRot, questoes, { todos: todos, barra: AU && AU.barra ? AU.barra() : '',
    etiquetas: (TR && TR.etiquetasDe ? TR.etiquetasDe(G.op, G.fo) : '') + (window.MutaAlertas ? window.MutaAlertas.htmlRoteiro(G.cnj, V('triagem', 'Etiquetas sugeridas'), function () { render(); }) : ''), registro: '' /* 0.46.1: o quadro "Registro da triagem" saiu do prontuário (pedido do gestor); triagem.js › registroDe fica */ });
}
/* a aba Minuta › Gerador acompanha o prontuário: cada redesenho repinta o Gerador, se estiver à vista */

/* HERO: apresentação compartilhada pela extensão, prévia e prontuário web.
   Move os controles existentes; conserva chaves da ficha e eventos delegados. */
var heroTopo = {cnj:'', pagina:0, acompanhamento:false};
function heroOrganizarProntuario(){
  var top=caixa.querySelector('.pc.pm'); if(!top||top.querySelector('.hero-header-nav'))return;
  if(heroTopo.cnj!==G.cnj)heroTopo={cnj:G.cnj,pagina:0,acompanhamento:false,sinalizacoes:false};
  function el(tag,cls,txt){var n=document.createElement(tag);if(cls)n.className=cls;if(txt)n.textContent=txt;return n;}
  function html(n,h){var t=document.createElement('template');t.innerHTML=h;n.append(t.content);}
  function move(n,q){var x=caixa.querySelector(q);if(x)n.append(x);return x;}
  if(!document.getElementById('hero-top-style')){
    var st=el('style');st.id='hero-top-style';st.textContent='.hero-dest-top{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:7px;align-items:start;min-width:0}.hero-dest-top>.gf{grid-column:auto!important;min-width:0;margin:0}.hero-dest-top select{width:100%;min-width:0}.hero-dest-top .pm-sitj{overflow-wrap:anywhere}.hero-dest-top .pm-sitj .gl{white-space:normal}.hero-enq-label{grid-column:1/-1}.hero-ann-v2 .hero-ann-unified:not(.hero-ann-open) .hero-ann-card .hero-ann-tools{display:none!important}.hero-ann-v2 .hero-ann-unified:not(.hero-ann-open) .hero-ann-detail-featured>.hero-ann-head{display:none!important}.hero-ann-v2 .hero-ann-unified .hero-note-tag.hero-ann-synthesis-tag{border:1px solid var(--line,#8793a344);background:var(--soft,#8793a315);border-radius:2px;padding:2px 5px;font-size:10px;line-height:1.3;font-weight:600}.hero-ann-v2 .hero-ann-unified:not(.hero-ann-open) .hero-detail-footer>.hero-ann-action{display:none!important}.hero-ann-v2 .hero-ann-unified .hero-detail-footer>.hero-ann-icon-toggle{display:inline-flex!important}.hero-ann-v2 .hero-ann-unified:not(.hero-ann-open) .hero-ann-card.hero-ann-expanded .hero-ann-text{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.hero-ann-v2 .hero-note-tag.hero-ann-synthesis-tag{display:inline-flex;align-items:center;border:1px solid var(--line,#8793a344);background:var(--soft,#8793a310);border-radius:2px;padding:2px 5px;font-size:10px;line-height:1.3;font-weight:600;letter-spacing:0}.hero-ann-v2 .hero-ann-detail-featured>.hero-ann-head{justify-content:flex-end;margin:3px 0 0;gap:3px}.hero-ann-v2 .hero-ann-detail-featured>.hero-ann-text{margin:0}.hero-proposta-julg{grid-column:1/-1;margin:0;min-width:0}.hero-proposta-julg>.gr{padding:6px 8px;gap:5px}.hero-proposta-julg textarea{width:100%;box-sizing:border-box;resize:vertical;min-height:72px}.hero-proposta-hist{grid-column:1/-1;font-size:11px}.hero-proposta-hist>summary{cursor:pointer}.hero-proposta-hist-text{white-space:pre-wrap;overflow-wrap:anywhere;padding-top:5px}.hero-enc-integrado>.hero-enc-tipo{display:grid;gap:4px;padding:2px 0 7px;margin:0;min-width:0}.hero-enc-tipo .rt-tsel{margin:0;min-width:0}.hero-enc-group{margin:5px 0;min-width:0}.hero-enc-group>.hero-enc-fields,.hero-enc-group>.hero-tramite{padding:7px 9px}.hero-enc-group>summary h4{font-size:11px}.hero-enc-group>.hero-tramite{min-width:0}.hero-tr-condition{display:flex;align-items:flex-start;gap:5px;border-left:2px solid var(--line,#8793a344);padding:5px 6px;margin-top:5px;font-size:11px}.hero-tr-condition input{width:auto;flex:none}.hero-tr-condition span{flex:1;overflow-wrap:anywhere}.hero-tr-legacy{margin:5px 0;font-size:11px}.hero-tr-legacy summary{cursor:pointer}.hero-tramite [hidden]{display:none!important}.hero-q-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}.hero-q-tag{white-space:normal;overflow-wrap:anywhere;max-width:100%;font-size:10px;line-height:1.3}.hero-ann-v2 .hero-ann-unified .hero-ann-icon-toggle{font-size:15px;line-height:1;padding:2px 6px}.hero-materia .hero-ann-questions-group{margin-top:8px}.hero-materia .hero-ann-questions .hero-ann-card{border:0;border-bottom:1px solid var(--line,#8793a344);border-radius:0;background:transparent;padding:6px 0}.hero-materia .hero-ann-questions .hero-ann-card:last-child{border-bottom:0}.hero-materia .hero-ann-questions [hidden]{display:none!important}.hero-ann-v2 .hero-ann-unified{padding:7px 10px;border:1px solid var(--line,#8793a344);border-radius:6px;background:var(--field,#fff)}.hero-ann-v2 .hero-ann-unified>.hero-primary-note{margin:0;padding:0!important}.hero-ann-v2 .hero-ann-unified>.hero-tags-content{padding:6px 0 0!important;gap:0}.hero-ann-v2 .hero-ann-unified .hero-detail-footer{justify-content:flex-end;gap:5px;margin-top:3px}.hero-ann-v2 .hero-ann-unified .hero-detail-footer>button{opacity:1}.hero-ann-v2 .hero-ann-unified .hero-ann-tab{margin-right:auto}.hero-ann-v2 .hero-ann-unified .hero-detail-footer .hero-ann-action{font-size:15px;line-height:1}.hero-ann-v2 .hero-ann-unified .hero-ann-stack:empty{display:none}.hero-ann-v2 .hero-ann-unified .hero-ann-panel[hidden]{display:none!important}.hero-acomp-tabs>.hero-sn-ind{display:inline-flex;align-items:center;gap:3px;margin-left:0}.hero-sn-mini{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:30px;padding:4px 5px;border:1px solid var(--line,#8793a344);border-radius:5px;background:transparent;color:var(--muted-fg,inherit);font:inherit;font-size:11px;cursor:pointer;font-variant-numeric:tabular-nums}.hero-sn-mini.has-count.pd{color:#b7791f}.hero-sn-mini.has-count.ic{color:#c4572b}.hero-sn-mini.has-count.av{color:#547b9e}.hero-sn-mini[aria-pressed=true]{background:var(--soft,#8793a322);border-color:currentColor}.hero-sinalizacoes .sn-i[hidden]{display:none!important}.hero-acomp-tabs>button .hero-sn-ind{display:inline-flex;gap:3px;margin-left:4px;vertical-align:middle}.hero-acomp-tabs>button .hero-sn-ind .sn-st{font-size:9px}.hero-sol-main-body{padding:8px 0}.rt-modos{flex-wrap:wrap}.hero-ann-v2 .hero-primary-note{background:transparent!important;border:0!important;padding:0!important}.hero-ann-v2 .hero-ann-card{border:0;border-bottom:1px solid var(--line,#8793a344);border-radius:0;background:transparent;padding:7px 0}.hero-ann-v2 .hero-ann-stack>.hero-ann-card:last-child,.hero-ann-v2 .hero-ann-panel>.hero-ann-card:last-child{border-bottom:0}.hero-ann-v2 .hero-ann-stack{gap:0}.hero-ann-v2 .hero-ann-panels{display:grid;grid-template-columns:minmax(0,1fr);gap:5px}.hero-ann-v2 .hero-ann-group{min-width:0;margin:0}.hero-ann-v2 .hero-ann-group>.hero-tags-content{display:grid;gap:0;padding:6px 10px}.hero-ann-v2 .hero-ann-group>summary .hero-ann-action{margin-left:5px}.hero-ann-v2 .hero-ann-group>summary h4{flex:1}.hero-ann-v2 .hero-note-tag{border:0;background:transparent;padding:0;font-size:10px;letter-spacing:.025em}.hero-ann-v2 .hero-ann-head{margin-bottom:3px}.hero-ann-v2 .hero-ann-notes>summary h4:before,.hero-ann-v2 .hero-ann-questions-group>summary h4:before{mask:none;background:transparent;width:auto;height:auto;content:"≡";font-size:15px;line-height:1}.hero-ann-v2 .hero-ann-questions-group>summary h4:before{content:"☷"}.hero-ann-v2 .hero-ann-action:disabled{display:none}.hero-ann-v2 .hero-primary-note{padding:6px!important}.hero-ann-stack{display:grid;gap:5px}.hero-ann-card{min-width:0;border:1px solid var(--line,#8793a344);border-radius:6px;padding:6px 8px;background:var(--field,#fff)}.hero-ann-head{display:flex;align-items:center;justify-content:space-between;gap:5px;margin-bottom:4px}.hero-ann-tools{display:flex;align-items:center;gap:3px;flex-wrap:wrap;justify-content:flex-end}.hero-ann-action,.hero-ann-tab{border:0;background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:11px;padding:3px 5px;border-radius:4px}.hero-ann-action:hover,.hero-ann-tab:hover,.hero-ann-tab[aria-expanded=true]{background:var(--soft,#8793a322)}.hero-ann-text{font-size:12px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.hero-ann-expanded .hero-ann-text,.hero-ann-questions .hero-ann-text{display:block;overflow:visible}.hero-ann-meta{display:block;margin-top:4px;font-size:10px;color:var(--muted-fg,inherit)}.hero-ann-nav{display:flex;gap:4px;flex-wrap:wrap;flex:1}.hero-ann-panels{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start;margin-top:5px}.hero-ann-panel{flex:1 1 280px;min-width:0;display:grid;gap:5px}.hero-ann-edit{display:grid;gap:5px;margin:4px 0}.hero-ann-edit textarea{width:100%;box-sizing:border-box;resize:vertical}.hero-ann-v2 [hidden]{display:none!important}.hero-ann-v2 .hero-detail-footer{margin-top:4px;min-height:23px}.hero-ann-v2 .hero-ann-tab[aria-expanded=true]{font-weight:650}.hero-tr-actions{display:flex;gap:3px;flex-wrap:wrap;margin-top:5px}.hero-tr-actions[hidden]{display:none!important}.hero-tr-history{margin-top:8px}.hero-tr-history>summary{font-size:11px;cursor:pointer}.hero-enc-fields[hidden],.hero-tramite[hidden]{display:none!important}.hero-tr-list{list-style:none;padding:0;margin:5px 0}.hero-tr-item{border-left:2px solid var(--line,#8793a344);padding:6px 8px;margin:4px 0;font-size:11px}.hero-tr-item>small{display:block;margin-top:4px}.hero-tr-item .hero-sol-head input{width:auto}.hero-sol-form .gf[hidden]{display:none!important}.hero-sol-head h3{margin:0;font-size:12px}.hero-sol-head{margin-bottom:4px}.hero-pauta-hist{margin-top:10px;padding-top:8px;border-top:1px solid var(--line,#8793a344)}.hero-pauta-hist>summary{cursor:pointer;font-size:10px;letter-spacing:.07em;font-weight:650;text-transform:uppercase}.hero-hist-body{margin-top:6px}.hero-julg-tl li small{display:block}.hero-art932-prod{margin-bottom:8px}.hero-art932-prod>small{display:block;margin:5px 0}.hero-sol-nav{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0}.hero-sol-type{font:inherit;font-size:10px;border:1px solid var(--line,#8793a344);background:transparent;border-radius:5px;padding:4px 6px;cursor:pointer}.hero-sol-type[aria-pressed=true]{background:var(--soft,#8793a322);font-weight:700}.hero-sol-panel[hidden],.hero-sol-form [hidden]{display:none!important}.hero-acomp-tabs{flex-wrap:nowrap!important;white-space:nowrap;min-width:0;overflow-x:auto;scrollbar-width:thin}.hero-sol-head{display:flex;align-items:center;justify-content:space-between;gap:6px}.hero-sol-head h4{margin:0}.hero-sol-form{display:grid;gap:6px;margin:8px 0}.hero-sol-form[hidden]{display:none!important}.hero-sol-item{border-top:1px solid var(--line,#8793a344);padding:7px 0;font-size:11px}.hero-sol-item small{display:block;margin-top:4px}.hero-sol-desc{white-space:pre-wrap;overflow-wrap:anywhere;margin-top:4px}.hero-sol-item select{font-size:10px;max-width:45%}.hero-note-tag{display:inline-flex;align-items:center;justify-content:center;align-self:flex-start;flex:none;max-width:100%;border:1px solid var(--line,#8793a344);border-radius:4px;padding:2px 5px;background:var(--soft,#8793a310);color:inherit;font-size:10px;font-weight:600;line-height:1.3;white-space:nowrap}.hero-note-number{min-width:23px;font-variant-numeric:tabular-nums}.hero-note-title{white-space:normal}.hero-notes-inline .nt-l{list-style:none;padding-left:0}.hero-notes-inline .nt-l>li{list-style:none;padding-left:35px!important}.hero-notes-inline .nt-l>li::marker{content:none}.hero-notes-inline .nt-l>li>.hero-note-number{position:absolute;top:6px;left:4px}.hero-fixed-note>.hero-note-number{margin-top:1px}.hero-structured-note{padding:6px 0;min-width:0}.hero-structured-note .gf{margin:0}.hero-structured-note .gl[hidden]{display:none!important}.hero-annotation-panels{display:grid;grid-template-columns:minmax(0,1fr);gap:4px}.hero-questions{border-top:1px solid var(--line,#8793a344);padding:5px 0}.hero-questions>summary{font-size:11px;cursor:pointer;color:var(--muted-fg,inherit)}.hero-questions-body{padding-top:5px}@media(min-width:760px){.hero-annotation-panels:has(.hero-notes-inline[open]):has(.hero-questions[open]){grid-template-columns:1fr 1fr}}.hero-detail-footer{flex-wrap:wrap}.hero-detail-footer .hero-note-options{display:flex;gap:3px;flex-wrap:wrap;opacity:0;margin:0;padding:0}.hero-primary-note:hover .hero-note-options,.hero-detail-footer:focus-within .hero-note-options{opacity:1}.hero-note-options .nt-add{font-size:10px;padding:2px 4px}.hero-fixed-notes{display:grid;gap:4px;margin-top:7px;border-top:1px solid var(--line,#8793a344);padding-top:6px}.hero-fixed-note{display:flex;align-items:flex-start;gap:6px;font-size:11px}.hero-fixed-text{flex:1;min-width:0;overflow-wrap:anywhere}.hero-fixed-text small{display:block;font-size:9px}.hero-note-pin{border:0;background:transparent;color:var(--muted-fg,inherit);cursor:pointer;padding:2px;flex:none}.hero-note-pin[aria-pressed=true]{color:#a57935}.hero-notes-inline .nt-l>li{position:relative;padding-right:38px}.hero-notes-inline .nt-l>li>.hero-note-pin{position:absolute;right:19px;top:5px}@media(hover:none){.hero-detail-footer .hero-note-options{opacity:1}}.hero-detail-footer{display:flex;align-items:center;gap:6px;min-height:8px;margin-top:3px}.hero-detail-footer>button{border:0;background:transparent;color:var(--muted-fg,inherit);font:inherit;font-size:10px;padding:2px 4px;cursor:pointer}.hero-detail-footer .hero-detail-expand{margin:0 0 0 auto}.hero-detail-footer .hero-note-toggle,.hero-detail-footer .hero-note-add{opacity:0;transition:opacity .12s}.hero-primary-note:hover .hero-detail-footer>button,.hero-detail-footer:focus-within>button,.hero-note-toggle[aria-expanded=true]{opacity:1}.hero-notes-inline>summary[hidden]{display:none!important}.hero-detail-footer button[hidden]{display:none!important}@media(hover:none){.hero-detail-footer .hero-note-toggle,.hero-detail-footer .hero-note-add{opacity:1}}.hero-acomp-tabs{display:flex;align-items:center;gap:3px;border-bottom:1px solid var(--line,#8793a344)}.hero-acomp-tabs>button{font:inherit;font-size:10px;padding:6px 3px;border:0;background:transparent;color:inherit;cursor:pointer}.hero-acomp-tabs>button[aria-selected=true]{font-weight:650;border-bottom:2px solid currentColor}.hero-acomp-tabs>.hero-monitor-tab{display:inline-flex;align-items:center;flex:0 1 auto;min-width:0;gap:0;border-radius:4px;white-space:nowrap}.hero-monitor-tab>.hero-monitor-label{font:inherit;font-size:10px;padding:6px 2px 6px 3px;border:0;background:transparent;color:inherit;cursor:pointer;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis}.hero-monitor-tab>.hero-monitor-label[aria-selected=true]{font-weight:650;border-bottom:2px solid currentColor}.hero-monitor-tab>.hero-urg-short{display:inline-flex;align-items:center;justify-content:center;flex:none;width:19px;height:22px;padding:2px;border:0;background:transparent;color:var(--muted-fg,inherit);cursor:pointer}.hero-monitor-tab:has(>.hero-monitor-label[aria-selected=true]){background:var(--soft,#8793a315)}.hero-acomp-tabs>.hero-acomp-label{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hero-acomp-tabs>.hero-sn-ind{flex:none;margin-left:auto;gap:2px}.hero-acomp-tabs .hero-sn-mini{min-width:24px;gap:2px;padding:3px;font-size:10px;flex:none;white-space:nowrap}.hero-acomp-tabs .hero-sn-mini svg{width:12px;height:12px;flex:none}.hero-acomp-dock details[hidden],.hero-acomp-dock summary[hidden]{display:none!important}.hero-acomp-dock .hero-acomp{margin-top:0;border-top:0}.hero-acomp-tabs .hero-urg-short[aria-pressed=true]{color:#c4572b}.hero-top-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}.hero-top-nav button{border:0;background:transparent;color:inherit;cursor:pointer;padding:4px 12px;font-size:18px}.hero-top-nav button:disabled{opacity:.3}.hero-header-nav{display:flex;align-items:center;gap:5px;min-width:0}.hero-header-nav .pm-top{flex:1;min-width:0;margin:0;display:flex;flex-wrap:nowrap!important;align-items:center;gap:5px;overflow-x:auto;scrollbar-width:none}.hero-header-nav .pm-top::-webkit-scrollbar{display:none}.hero-header-nav .pm-top>*{flex:none;white-space:nowrap}.hero-header-nav .pm-top .pm-dd>i{display:none}.hero-header-nav .hero-face-label{font-size:11px;font-weight:650}.hero-header-nav .hero-face-label[hidden]{display:none!important}.hero-proc-tags{display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0}.hero-proc-tags .pm-tj{max-width:160px;overflow:hidden;text-overflow:ellipsis}.hero-header-nav{padding:0 0 5px;border-bottom:1px solid var(--line,#8793a344);margin-bottom:7px}.hero-header-nav>button{flex:none;border:0;background:transparent;color:inherit;cursor:pointer;padding:4px 6px;font:inherit;font-size:12px}.hero-header-nav>button[aria-pressed=true]{font-weight:700;text-decoration:underline}.hero-acomp-group{border-top:1px solid var(--line,#8793a344);padding-top:7px}.hero-acomp-group>summary{cursor:pointer;font-weight:600;font-size:12px}.hero-acomp-group[open]>summary{margin-bottom:7px}.hero-reg-acervo{margin:10px 0 0;padding:0;border:0;background:transparent;box-shadow:none}.hero-reg-acervo>.gr{margin-top:5px}.hero-etiquetas{margin:0;min-width:0}.hero-tags-content{padding:8px 12px;display:grid;gap:10px}.hero-tag-section .pm-mer-h{margin:0 0 6px}.hero-tag-list{display:flex;flex-wrap:wrap;gap:5px;align-items:center}.hero-tag-chip{display:inline-flex;align-items:center;gap:5px;max-width:100%;overflow-wrap:anywhere}.hero-tag-chip button{border:0;background:transparent;color:inherit;cursor:pointer;font-size:14px;line-height:1;padding:0 2px}.hero-tag-add{display:flex;gap:5px;margin-top:7px}.hero-tag-add input{flex:1;min-width:0;font:inherit}.hero-ctl-integrado{padding:6px 0;border:0;background:transparent;box-shadow:none}.hero-ctl-integrado>.pm-mer-h{margin:0 0 6px}.hero-ctl-integrado .ct-l{display:grid;grid-template-columns:1fr;gap:0;background:transparent;border:0;padding:0}.hero-ctl-integrado .ct-i{background:transparent;border:0;border-bottom:1px solid var(--line,#8793a344);border-radius:0;padding:7px 0;box-shadow:none}.hero-ctl-integrado .ct-i:last-child{border-bottom:0}.hero-ctl-integrado .ct-h{display:flex;align-items:center;gap:6px}.hero-ctl-integrado .ct-h .ct-sn{margin-left:auto}.hero-ctl-integrado .ct-r{margin:6px 0}.hero-ctl-integrado .ct-mais{margin:4px 0 0;border:0;background:transparent;box-shadow:none;padding:0}.hero-ctl-integrado .ct-mais>summary{display:inline-flex;align-items:center;gap:5px;list-style:none;width:auto;padding:3px 7px;border-radius:5px;border:1px solid var(--line,#8793a344);font-size:10px;font-weight:600;line-height:1.4;color:var(--muted-fg,inherit);cursor:pointer}.hero-ctl-integrado .ct-mais>summary::-webkit-details-marker{display:none}.hero-ctl-integrado .ct-mais>summary:after{content:"+";font-size:13px;line-height:1}.hero-ctl-integrado .ct-mais[open]>summary:after{content:"−"}.hero-ctl-integrado .ct-mais>summary:hover{background:var(--line,#8793a344)}.hero-ctl-integrado .ct-mais>.gr{padding:7px 0 0!important}.hero-julgamento-top{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;padding:0 0 9px;border-bottom:1px solid var(--line,#8793a344)}.hero-julgamento-top .hero-tipo-roteiro,.hero-julgamento-top .hero-resultado{grid-column:1/-1;margin:0;min-width:0}.hero-resultado select{width:100%;min-width:0}.hero-enc-integrado{background:transparent;border:0;border-bottom:1px solid var(--line,#8793a344);padding:0 0 9px;margin:0;box-shadow:none}.hero-enc-integrado>.pm-mer-h{margin:0 0 6px}.hero-enc-fields{padding:0;gap:8px}.hero-enc-fields .pm-sitj{margin:0;background:transparent;border:0;box-shadow:none;padding:0}.hero-etiquetas>summary h4{display:flex;align-items:center;gap:8px}.hero-etiquetas>summary h4:before{content:"";display:inline-block;width:16px;height:16px;background:currentColor;mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath fill=%27black%27 d=%27M3 3h10l8 8-10 10-8-8V3zm4 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z%27/%3E%3C/svg%3E") center/contain no-repeat}.hero-top-page[hidden]{display:none!important}.hero-top-page{min-width:0;overflow-wrap:anywhere}.hero-top-pages{min-height:150px}.hero-top-classif{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;margin:5px 0}.hero-top-classif span{font-weight:600}.hero-top-classif{align-items:flex-start;flex-wrap:nowrap}.hero-assunto-stack{flex:1;min-width:0;display:grid;gap:2px}.hero-assunto-stack .pm-ad{margin:0;font-size:11.5px;line-height:1.35;color:var(--muted-fg,inherit)}.hero-assunto-stack .pm-ad span{text-decoration:none!important;border:0;font-weight:400}.hero-case-notes{margin:8px 0;border-top:1px solid var(--line,#8793a344);padding:6px 0 0}.hero-case-notes>summary{display:flex;align-items:center;gap:6px;cursor:pointer;list-style:none;font-size:10px;font-weight:650;letter-spacing:.08em;text-transform:uppercase}.hero-case-notes>summary small{margin-left:auto}.hero-case-notes>summary:after{content:"⌄"}.hero-case-notes[open]>summary:after{content:"⌃"}.hero-case-notes .hero-notes-inner{margin:6px 0 0!important;padding:0!important;border:0!important;background:transparent;box-shadow:none}.hero-cl-jg{cursor:pointer}.hero-top-classif .hero-secao{display:inline-flex;align-items:center;justify-content:center;min-width:22px;padding:2px 6px;border-radius:5px;font-size:11px;line-height:1.35;background:var(--line,#e2e8f0);color:inherit}.hero-top-classif .hero-secao-1{background:#dbeafe;color:#1e40af}.hero-top-classif .hero-secao-2{background:#fef3c7;color:#92400e}.hero-top-classif .hero-secao-3{background:#dcfce7;color:#166534}.hero-top-page .pc-dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.hero-top-page .pc-dl>div{min-width:0}.hero-top-page .pm-aut,.hero-top-page .pv-identity{margin:0;border:0;box-shadow:none}.hero-top-page details>summary.hero-hidden-summary{display:none}.hero-acomp{margin-top:10px;border:0;border-top:1px solid var(--line,#8793a344);border-radius:0;padding:8px 0 0;min-width:0}.hero-acomp>summary{cursor:pointer;font-weight:600;display:flex;justify-content:space-between;gap:8px}.hero-acomp>summary small{font-weight:400}.hero-acomp>summary .hero-urg-short{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:3px;border:0;border-radius:5px;background:transparent;color:var(--muted-fg,inherit);cursor:pointer;flex:none}.hero-acomp>summary .hero-urg-short[aria-pressed=true]{color:#c4572b;background:#c4572b19}.hero-acomp>summary .hero-urg-short:hover{background:var(--line,#8793a344)}.hero-sn-ind{display:flex;gap:5px;align-items:center;margin-left:auto}.hero-sn-ind .sn-st{font-size:11px;font-style:normal;white-space:nowrap}.hero-header-nav>button{font-size:20px;line-height:1}.hero-sinalizacoes #g-sn{margin:0;box-shadow:none;border:0}.hero-acomp-b{display:grid;gap:10px;padding-top:10px}.hero-steps{border:1px solid var(--line,#8793a344);border-radius:8px;padding:8px;margin:8px 0}.hero-steps-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}.hero-steps-head h4{margin:0;flex:none}.hero-steps-head select{max-width:70%;min-width:0;width:auto;font:inherit;font-size:12px}.hero-steps .pv-flowbox{border:0;box-shadow:none;padding:0;margin:0}.hero-materia{padding:0;background:transparent;border:0;box-shadow:none}.hero-materia .pv-field,.hero-materia .pv-idrow,.hero-materia .pv-sintese{background:transparent;border:0;box-shadow:none;padding:0;margin:0;min-width:0}.hero-materia .pv-value{overflow-wrap:anywhere}.hero-materia .gr{gap:8px}.hero-designacoes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:center;gap:5px;margin:6px 0}.hero-design-cell{display:grid;gap:3px;min-width:0}.hero-design-cell .gl{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hero-design-cell select{width:100%;min-width:0;max-width:100%;font-size:11px;padding:3px 12px 3px 4px;text-overflow:ellipsis;white-space:nowrap}.hero-responsavel{flex:1 1 100px;min-width:0}.hero-responsavel .gf{margin:0;padding:0}.hero-responsavel .gl{font-size:10px}.hero-responsavel input,.hero-responsavel select{width:100%;min-width:0;font-size:12px}.hero-destino{margin:6px 0}.hero-destino small{display:block;opacity:.75}.hero-detalhes{display:grid;gap:4px}.hero-notes-wrap{margin:7px 0}.hero-notes-wrap .hero-primary-note{margin:0;padding:8px 9px;border:1px solid var(--line,#8793a344);border-radius:6px;background:var(--field,#fff)}.hero-notes-wrap .hero-extra-notes{margin:0;padding:0;border:0}.hero-notes-wrap{position:relative}.hero-notes-wrap .hero-extra-notes>summary{box-sizing:border-box;min-height:7px;height:7px;padding:0 8px;display:flex;align-items:center;justify-content:center;gap:5px;font-size:10px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--muted-fg);cursor:pointer;list-style:none;border-radius:0 0 5px 5px;overflow:hidden;transition:height .12s ease,background .12s ease}.hero-notes-wrap .hero-extra-notes>summary::-webkit-details-marker{display:none}.hero-notes-wrap .hero-extra-notes>summary>*{opacity:0}.hero-notes-wrap .hero-extra-notes>summary:after{margin-left:0;opacity:0}.hero-notes-wrap .hero-extra-notes>summary:hover,.hero-notes-wrap .hero-extra-notes>summary:focus-visible,.hero-notes-wrap .hero-primary-note:hover+.hero-extra-notes>summary,.hero-notes-wrap .hero-extra-notes[open]>summary{height:21px;background:var(--soft,#f1f3f5)}.hero-notes-wrap .hero-extra-notes>summary:hover>*,.hero-notes-wrap .hero-extra-notes>summary:focus-visible>*,.hero-notes-wrap .hero-primary-note:hover+.hero-extra-notes>summary>*,.hero-notes-wrap .hero-extra-notes[open]>summary>*{opacity:1}.hero-notes-wrap .hero-extra-notes>summary:hover:after,.hero-notes-wrap .hero-extra-notes>summary:focus-visible:after,.hero-notes-wrap .hero-primary-note:hover+.hero-extra-notes>summary:after,.hero-notes-wrap .hero-extra-notes[open]>summary:after{opacity:1}@media(hover:none){.hero-notes-wrap .hero-extra-notes>summary{height:21px}.hero-notes-wrap .hero-extra-notes>summary>*,.hero-notes-wrap .hero-extra-notes>summary:after{opacity:1}}.hero-notes-wrap .hero-extra-notes .hero-notes-inner{margin-top:3px!important}.hero-primary-note-head{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:5px;font-size:10px;font-weight:650}.hero-primary-note-head small{font-size:9px;font-weight:400;opacity:.7}.hero-primary-note .hero-detalhamento{margin:0}.hero-detail-text{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-align:left;width:100%;border:0;background:transparent;padding:0;color:inherit;font:inherit;font-size:12px;line-height:1.4;overflow-wrap:anywhere;white-space:pre-wrap;cursor:text}.hero-detail-text.hero-detail-open{display:block;-webkit-line-clamp:unset;overflow:visible}.hero-detail-text:disabled{opacity:1;cursor:default}.hero-detail-expand{display:block;margin:3px 0 0 auto;padding:1px 0;border:0;background:transparent;color:var(--muted-fg,inherit);font-size:10px;cursor:pointer}.hero-detail-expand[hidden]{display:none!important}.hero-detalhes .pm-ad,.hero-detalhes .pm-ad span,.hero-detalhes .pm-ad a{text-decoration:none!important;border-bottom:0}.hero-detalhes .pm-ad span{font-weight:400}.hero-detalhes .gl{display:none}.hero-detalhes input,.hero-detalhes textarea{width:100%}';document.head.append(st);
  }
  var nav=el('div','hero-header-nav'),prev=el('button','','‹'),next=el('button','','›'),label=el('span','muted');
  prev.type=next.type='button';prev.setAttribute('aria-label','Face anterior');next.setAttribute('aria-label','Próxima face');var faixa=top.querySelector('.pm-top');nav.append(prev);if(faixa){nav.append(faixa);faixa.querySelectorAll('.sp').forEach(function(x){x.remove();});var phase=faixa.querySelector('.pm-fase');if(phase)phase.before(label);else faixa.prepend(label);}else nav.append(label);label.classList.add('hero-face-label');nav.append(next);
  var pages=el('div','hero-top-pages'),id=el('div','hero-top-page'),aut=el('div','hero-top-page'),mat=el('div','hero-top-page');
  pages.append(id,aut,mat);var pn=[id,aut,mat],names=['Resumo','Autuação','Matéria'];
  function show(i){heroTopo.pagina=(i+3)%3;pn.forEach(function(p,j){p.hidden=j!==heroTopo.pagina;});label.textContent=heroTopo.pagina===0?'':names[heroTopo.pagina];label.hidden=heroTopo.pagina===0;prev.title='Anterior: '+names[(heroTopo.pagina+2)%3];next.title='Próxima: '+names[(heroTopo.pagina+1)%3];prev.setAttribute('aria-label',prev.title);next.setAttribute('aria-label',next.title);nav.setAttribute('aria-label',names[heroTopo.pagina]);}
  prev.addEventListener('click',function(){show(heroTopo.pagina-1);});next.addEventListener('click',function(){show(heroTopo.pagina+1);});
  var sx=0;pages.addEventListener('touchstart',function(e){sx=e.changedTouches[0].clientX;},{passive:true});pages.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>65)show(heroTopo.pagina+(dx<0?1:-1));},{passive:true});
  var l1=top.querySelector('.pm-l1'),cls=l1&&l1.querySelector('.pc-cl'),classText=cls&&cls.title?cls.title.split(' · ')[0]:'';
  var m=grupoModelo('Autuação'),R={};(m&&m.campos||[]).forEach(function(c){R[c.rotulo]=valorDe(c);});
  var tj=el('div','gr');
  /* Classe abreviada e julgamento são etiquetas distintas; a classe completa continua em Autuação. */
  var classFull=S(R['Classe']||fonteVal({fonte:['classe_judicial','Classe']})||classText),classShort=classFull;
  try{var clInfo=window.ClassesCNJ&&window.ClassesCNJ.etiqueta(classFull,null);if(clInfo&&clInfo.t)classShort=clInfo.t.split(' · ')[0];else if(cls)classShort=cls.textContent.split(' · ')[0];}catch(e){}
  if(cls)cls.remove();
  var procTags=el('div','hero-proc-tags'),julgamento=S(V('triagem','Tipo de Julgamento')||V('triagem','Padrão - Espécie')),tagText=classShort;
  try{var combinado=window.ClassesCNJ&&window.ClassesCNJ.etiqueta(classFull,ccTipos());if(combinado&&combinado.t)tagText=combinado.t;}catch(e){}
  if(classShort||julgamento){var jt=el('button','pc-cl hero-cl-jg',tagText||julgamento);jt.type='button';jt.title=[classFull,julgamento,'Alterar tipo de julgamento'].filter(Boolean).join(' · ');jt.onclick=function(){abrirA('acompanhamento');var d=ac.querySelector('.rt-tsel');if(d){d.open=true;d.scrollIntoView({block:'nearest'});}else{var f=ac.querySelector('.hero-enc-tipo');if(f)f.scrollIntoView({block:'nearest'});}};procTags.append(jt);}
  if(l1)l1.querySelectorAll('.pm-tj').forEach(function(x){if(x.classList.contains('sug'))tj.append(x);else x.remove();});
  if(l1&&procTags.childNodes.length)l1.append(procTags);
  if(l1)l1.querySelectorAll('.pm-al').forEach(function(x){x.remove();});
  top.insertBefore(nav,l1||top.firstChild);nav.after(pages);if(l1)id.append(l1);
  var as=el('div','hero-top-classif');var secao=S(R['Seção competente']||fonteVal({fonte:['Seção Competente','Seção competente']}));if(secao){var smatch=secao.match(/([123])\s*[ªº°a]?/),stag=el('span','hero-secao'+(smatch?' hero-secao-'+smatch[1]:''),smatch?smatch[1]+'ª':secao);stag.title=smatch?smatch[1]+'ª Seção':secao;stag.setAttribute('aria-label',stag.title);as.append(stag);}if(S(R['Assunto CNJ']||fonteVal({fonte:['Assunto']})))as.append(el('span','',S(R['Assunto CNJ']||fonteVal({fonte:['Assunto']}))));id.append(as);
  var old=top.querySelector('.pm-as');if(old)old.remove();var ad=top.querySelector('.pm-ad');if(ad)ad.remove();var esp=top.querySelector('.pm-esp');if(esp)esp.remove();
  var detail=el('div','hero-detalhes');
  var assuntoPrincipal=S(R['Assunto CNJ']||fonteVal({fonte:['Assunto']})),assuntoComp=S(gravado('triagem','Registro - Assunto detalhado'))||S(V('triagem','Assunto detalhado'));
  function normalAssunto(v){return N(S(v)).replace(/\s+/g,' ').trim();}
  var assuntoStack=el('div','hero-assunto-stack'),principal=Array.from(as.children).find(function(x){return !x.classList.contains('hero-secao');});if(principal)assuntoStack.append(principal);as.append(assuntoStack);
  if(G.adEd||(assuntoComp&&normalAssunto(assuntoComp)!==normalAssunto(assuntoPrincipal)))html(assuntoStack,assuntoDetalhado());
  /* Um editor de detalhamento; os dois campos antigos são conservados e concatenados na leitura. */
  var dkey='triagem.Detalhamento do caso',dv=S(V('triagem','Detalhamento do caso'));
  var dt=el('div','hero-detalhamento'),db=el('button','hero-detail-text',dv),expand=el('button','hero-detail-expand','Expandir');
  db.type=expand.type='button';db.title='Editar detalhamento do caso';expand.hidden=true;expand.setAttribute('aria-expanded',String(!!heroTopo.detalhamento));dt.append(db,expand);
  function ajustarDetalhe(){db.classList.toggle('hero-detail-open',!!heroTopo.detalhamento);expand.textContent=heroTopo.detalhamento?'Recolher':'Expandir';expand.setAttribute('aria-expanded',String(!!heroTopo.detalhamento));expand.hidden=!heroTopo.detalhamento&&db.scrollHeight<=db.clientHeight+1;}
  expand.onclick=function(){heroTopo.detalhamento=!heroTopo.detalhamento;ajustarDetalhe();};
  db.addEventListener('click',function(){var t=el('textarea');t.rows=3;t.value=dv;t.setAttribute('aria-label','Detalhamento do caso');var ok=el('button','btn solid sm','Gravar'),cancel=el('button','lnk','Cancelar');ok.type=cancel.type='button';dt.replaceChildren(t,ok,cancel);t.focus();ok.onclick=function(){if(window.MUTA_WEB&&window.MUTA_WEB.leitura)return;marcar(dkey,t.value.trim());agendar(400);render();};cancel.onclick=function(){dt.replaceChildren(db);if(!expand.closest('.hero-detail-footer'))dt.append(expand);ajustarDetalhe();};});
  if(window.MUTA_WEB&&window.MUTA_WEB.leitura)db.disabled=true;if(!dv)db.textContent='Registrar detalhamento do caso';if(detail.childNodes.length)id.append(detail);
  var ac=el('details','hero-acomp'),sum=el('summary','','Análise e Acompanhamento'),fase=top.querySelector('.pm-fase');if(fase)sum.append(el('small','muted',fase.textContent));var urg=el('button','hero-urg-short');urg.type='button';urg.innerHTML=SV('<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8z"/>',15);urg.setAttribute('aria-pressed',String(ctlSim('urgencia')));urg.title='Controle de urgência';urg.setAttribute('aria-label',urg.title);urg.disabled=!!(window.MUTA_WEB&&window.MUTA_WEB.leitura);sum.append(urg);urg.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();heroTopo.abaAcomp='monitoramento';heroTopo.monitoramento=true;mon.open=true;if(!ctlSim('urgencia')){ctlMarcar('urgencia',true);}var u=caixa.querySelector('.hero-monitoramento .ct-i.urgencia');if(u){u.scrollIntoView({block:'nearest'});var f=u.querySelector('select,input,textarea');if(f)f.focus();}});ac.append(sum);var body=el('div','hero-acomp-b');ac.append(body);ac.open=heroTopo.acompanhamento;ac.addEventListener('toggle',function(){if(ac.isConnected)heroTopo.acompanhamento=ac.open;});
  var flow=top.querySelector('.pv-flowbox,.pm-pills'),steps=el('section','hero-steps'),stepsHead=el('div','hero-steps-head');
  var oldHead=flow&&flow.querySelector('.pv-stage-head');if(oldHead)oldHead.remove();
  stepsHead.append(el('h4','pm-mer-h','Etapas'));
  var resp=top.querySelector('.pm-resp'),ato=resp&&resp.querySelector('.pm-ato'),dest=el('div','hero-destino');
  if(ato)dest.append(ato);else html(dest,atoSel());
  
  steps.append(stepsHead);
  if(flow){
    var people=flow.querySelector('.pv-people'),tags=el('div','hero-designacoes');
    if(people){people.querySelectorAll('.pv-person').forEach(function(x){tags.append(x);});people.remove();}
    else{flow.querySelectorAll('[data-des-ed],[data-des]').forEach(function(x){var tag=el('span','chip');tag.append(el('small','muted',x.getAttribute('data-des-ed')==='CORRETOR'||x.getAttribute('data-des')==='CORRETOR'?'Corretor · ':'Minutador · '),x);tags.append(tag);});}
    flow.querySelectorAll('.pv-stage-situacao,.pm-enc').forEach(function(x){body.append(x);});
    flow.querySelectorAll('.pv-enc-summary').forEach(function(x){x.remove();});
    steps.append(flow,tags);
  }
  id.append(steps);
  var au=top.querySelector('.pm-aut1');if(au){au.open=true;var sm=au.querySelector('summary');if(sm)sm.classList.add('hero-hidden-summary');var dl=au.querySelector('.pc-dl');if(!dl){dl=el('dl','pc-dl');au.append(dl);}var c=el('div');c.append(el('dt','','Classe'),el('dd','',S(R['Classe']||classText)));dl.prepend(c);var dist,val;Array.from(dl.children).forEach(function(x){var k=x.querySelector('dt');if(!k)return;if(k.textContent==='Seção')x.remove();if(k.textContent==='Distribuição')dist=x;if(k.textContent==='Valor da causa')val=x;});if(dist&&val){dl.prepend(dist,val);}aut.append(au);}
  /* Matéria usa a mesma estrutura de títulos e campos da Autuação. */
  var identity=caixa.querySelector('#pv-identity'),materia=el('section','hero-materia'),mg=el('div','gr');
  materia.append(el('h4','pm-mer-h','Matéria'));
  if(identity){
    var ic=identity.querySelector('.pv-id-content');
    if(ic){Array.from(ic.children).forEach(function(x){
      var k=x.querySelector('.gl'),labelText=k?S(k.textContent):'';
      if(x.matches('h4')||labelText==='Classe'||labelText==='Conclusão / resultado'||labelText==='Tipo de julgamento'||x.querySelector('.rt-tsel,[data-fk="producao.Voto - Resultado"],[data-pv-jg]'))return;
      if(x.classList.contains('pv-idrow')&&labelText==='Assunto CNJ'){var dlm=el('dl','pc-dl'),line=el('div');line.append(el('dt','','Assunto CNJ'),el('dd','',S(x.querySelector('.pv-value')&&x.querySelector('.pv-value').textContent)));dlm.append(line);materia.append(dlm);return;}
      if(x.querySelector('[data-pv-field="triagem.Tema"],[data-pv-field="triagem.Especificidades"],[data-fk="triagem.Tema"],[data-fk="triagem.Especificidades"]'))return;
      mg.append(x);
    });}
  }else{
    var dlm=el('dl','pc-dl'),line=el('div');line.append(el('dt','','Assunto CNJ'),el('dd','',S(R['Assunto CNJ']||fonteVal({fonte:['Assunto']}))));dlm.append(line);materia.append(dlm);
    html(mg,campoRot('triagem','Ramo do direito','Ramo do direito')+campoRot('triagem','Outros assuntos','Outros assuntos')+campoRot('triagem','Síntese Processual','Síntese processual')+campoRot('triagem','Síntese Fática','Síntese fática'));
  }
  /* A inclusão fica em Matéria, não na face de resumo. */
  if(!mg.querySelector('[data-ad]')&&!mg.querySelector('.pm-ad'))html(mg,campoRot('triagem','Assunto detalhado','Assunto detalhado'));
  if(!mg.querySelector('[data-fk="triagem.Detalhamento do caso"]')&&!mg.querySelector('[data-pv-field="triagem.Detalhamento do caso"]'))html(mg,campoRot('triagem','Detalhamento do caso','Detalhamento do caso'));
  materia.append(mg);mat.append(materia);
  var sd=el('details','hero-acomp hero-sinalizacoes'),ss=el('summary','','Sinalizações'),ind=el('span','hero-sn-ind'),sig=el('div','hero-acomp-b');
  sd.append(ss,sig);ss.append(ind);sd.open=!!heroTopo.sinalizacoes;sd.addEventListener('toggle',function(){if(sd.isConnected)heroTopo.sinalizacoes=sd.open;});
  var sn=top.querySelector('.pm-sn'),dialog=caixa.querySelector('#pv-sn-dlg');if(sn){var sb=sn.querySelector('.sn-b');if(sb)while(sb.firstChild)sig.append(sb.firstChild);sn.remove();}else if(dialog){var sc=dialog.querySelector('.pv-sn-c');if(sc)while(sc.firstChild)sig.append(sc.firstChild);dialog.remove();var bar=top.querySelector('.pv-sn-bar');if(bar)bar.remove();}
  [['pd','Pendências','<path d="M12 9v4m0 4h.01M10.3 4.5 2.6 18a1 1 0 0 0 .9 1.5h17a1 1 0 0 0 .9-1.5L13.7 4.5a2 2 0 0 0-3.4 0Z"/>'],['ic','Intercorrências','<path d="M4 22V3m0 1c4-4 8 4 12 0v11c-4 4-8-4-12 0"/>'],['av','Avisos','<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>']].forEach(function(z){var n=snLinhas(z[0]).filter(function(l){return !/^✓/.test(l);}).length,b=el('button','hero-sn-mini '+z[0]+(n?' has-count':''));b.type='button';b.innerHTML=SV(z[2],14);b.append(el('span','hero-sn-count',String(n)));b.title=z[1]+': '+n+' em aberto';b.setAttribute('aria-label',b.title);b.dataset.snKind=z[0];ind.append(b);});
    var sh=sig.querySelector('#g-sn .pc-sh');if(sh){sh.querySelectorAll('h3,.sn-st').forEach(function(x){x.remove();});}
  /* Etiquetas e controles especiais passam a pertencer ao Acompanhamento. */
  var tagsGroup=el('details','gg hero-etiquetas'),tagsTitle=el('summary'),tagsHeading=el('h4','','Etiquetas'),tagsCount=el('span','gn');
  tagsTitle.append(tagsHeading,tagsCount);tagsGroup.append(tagsTitle);tagsGroup.open=!!heroTopo.etiquetas;tagsGroup.addEventListener('toggle',function(){if(tagsGroup.isConnected)heroTopo.etiquetas=tagsGroup.open;});
  var existingTags=aut.querySelector('.pv-etiquetas');if(existingTags)existingTags.remove();
  var pjeTags=aut.querySelector('.pc-etq');if(pjeTags){var ph=pjeTags.previousElementSibling;if(ph&&ph.tagName==='H4')ph.remove();pjeTags.remove();}
  function tagList(v){return [...new Set(String(v||'').split(/[,;|\n]+/).map(S).filter(Boolean))];}
  var pjeList=tagList(R['Etiquetas do PJe']),gabList=tagList(V('triagem','Etiquetas'));
  tagsCount.textContent=String(pjeList.length+gabList.length);tagsCount.title='Total de etiquetas do PJe e do gabinete';
  tagsTitle.title='Expandir ou recolher as etiquetas do processo';
  var tagsContent=el('div','hero-tags-content');tagsGroup.append(tagsContent);
  var readonly=!!(window.MUTA_WEB&&window.MUTA_WEB.leitura);
  function tagSection(title,L,editable){
    var sec=el('section','hero-tag-section'),row=el('div','hero-tag-list');sec.append(el('h4','pm-mer-h',title),row);
    if(!L.length)row.append(el('small','muted','Nenhuma etiqueta'));
    L.forEach(function(v,index){var chip=el('span','chip hero-tag-chip');chip.append(el('span','',v));
      if(editable&&!readonly){var rm=el('button','','×');rm.type='button';rm.title='Remover '+v;rm.setAttribute('aria-label',rm.title);rm.onclick=function(){marcar('triagem.Etiquetas',L.filter(function(x,i){return i!==index;}).join(', '));agendar(400);render();};chip.append(rm);}row.append(chip);});
    if(editable&&!readonly){var addrow=el('div','hero-tag-add'),input=el('input'),add=el('button','btn line sm','+');input.type='text';input.placeholder='Adicionar etiquetas, separadas por vírgula';input.setAttribute('aria-label','Adicionar etiquetas do gabinete');add.type='button';add.setAttribute('aria-label','Adicionar etiquetas');function save(){var values=tagList(input.value);if(!values.length)return;marcar('triagem.Etiquetas',[...new Set(L.concat(values))].join(', '));agendar(400);render();}add.onclick=save;input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();e.stopPropagation();save();}});addrow.append(input,add);sec.append(addrow);}
    tagsContent.append(sec);
  }
  tagSection('Etiquetas do PJe',pjeList,false);tagSection('Etiquetas do gabinete',gabList,true);
  /* Registro no acervo: integra os campos na Autuação, sem cartão ou resumo próprio. */
  var registros=Array.from(top.querySelectorAll('details.gg')).concat(Array.from(sig.querySelectorAll('details.gg'))).filter(function(x){var h=x.querySelector('summary h4');return h&&S(h.textContent)==='Registro no acervo';});
  var destinoReg=au||aut;
  var regExistente=aut.querySelector('.pv-reg'),reg=regExistente||el('section','hero-reg-acervo');
  if(!regExistente){reg.append(el('h4','pm-mer-h','Registro no acervo'));}
  registros.forEach(function(x){var gr=Array.from(x.children).find(function(y){return y.classList.contains('gr');});if(gr)reg.append(gr);x.remove();});
  if(registros.length&&!regExistente)destinoReg.append(reg);
  if(regExistente)regExistente.classList.add('hero-reg-acervo');
  var ctlGroup=el('section','hero-ctl-integrado');
  var ctl=aut.querySelector('.pm-ctl2');if(ctl){var ch=ctl.previousElementSibling;if(ch&&ch.tagName==='H4'&&/^Controles/.test(ch.textContent))ch.remove();ctlGroup.append(ctl);}
  var mon=el('details','hero-acomp hero-monitoramento'),ms=el('summary','','Monitoramento especial'),mb=el('div','hero-acomp-b');
  mb.append(ctlGroup);mon.append(ms,mb);mon.open=!!heroTopo.monitoramento;
  mon.addEventListener('toggle',function(){if(mon.isConnected)heroTopo.monitoramento=mon.open;});
  /* Anotações e questões: uma representação por registro, sem mover controles legados. */
  caixa.querySelectorAll('#g-nt,.nt-cs,.nt-vz,.q-w').forEach(function(n){n.remove();});
  var noteWrap=el('section','hero-notes-wrap hero-ann-v2'),primary=el('div','hero-primary-note'),pair=el('div','hero-ann-panels'),ann=el('section','hero-ann-panel'),questions=el('section','hero-ann-panel hero-ann-questions'),foot=el('div','hero-detail-footer');
  var linhas=notasL(),fixCampo=campoModelo('origem','Notas fixadas'),fixados=[],readonly=!!(window.MUTA_WEB&&window.MUTA_WEB.leitura);
  try{var fx=JSON.parse(S(V('origem','Notas fixadas'))||'[]');if(Array.isArray(fx))fixados=fx.filter(function(x){return typeof x==='string';});}catch(e){}
  var regs=[['@detalhamento','Detalhamento do caso'],['@processual','Síntese Processual'],['@fatica','Síntese Fática']];
  function destacado(k){return k==='@detalhamento'?fixados.indexOf('@ocultar-detalhamento')<0:fixados.indexOf(k)>=0;}
  function gravaFix(){marcar('origem.Notas fixadas',JSON.stringify(fixados));}
  function pin(k){var b=el('button','hero-note-pin');b.type='button';b.title=destacado(k)?'Retirar destaque':'Destacar no prontuário';b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',String(destacado(k)));b.innerHTML=SV('<path d="m16 3 5 5-4 1-3 5v3l-2 2-3-5-5-3 2-2h3l5-3zM9 14l-6 7"/>',13);b.disabled=!fixCampo||!editavel(fixCampo);b.onclick=function(){var key=k==='@detalhamento'?'@ocultar-detalhamento':k,idx=fixados.indexOf(key);if(idx<0)fixados.push(key);else fixados.splice(idx,1);gravaFix();heroTopo.notas=true;agendar(500);render();};return b;}
  function action(label,title,fn){var b=el('button','hero-ann-action',label);b.type='button';b.title=title;b.setAttribute('aria-label',title);b.disabled=readonly;b.onclick=fn;return b;}
  function card(key,label,value,meta,onSave,onRemove){
    var r=el('article','hero-ann-card'),h=el('div','hero-ann-head'),tx=el('div','hero-ann-text',value||'Não registrado'),tools=el('div','hero-ann-tools');var isDetail=key==='@detalhamento'&&destacado(key),isSintese=key==='@processual'||key==='@fatica';
    if(isDetail){r.classList.add('hero-ann-detail-featured');r.setAttribute('aria-label',label);h.append(tools);}else{h.append(el('span','hero-note-tag'+(isSintese?' hero-ann-synthesis-tag':''),label),tools);}tools.append(pin(key));
    var exp=action('⌄','Expandir ou recolher conteúdo',function(){var open=r.classList.toggle('hero-ann-expanded');exp.textContent=open?'⌃':'⌄';exp.setAttribute('aria-expanded',String(open));});exp.disabled=false;exp.setAttribute('aria-expanded','false');tools.prepend(exp);
    if(!readonly&&onSave)tools.append(action('✎','Editar '+label,function(){var t=el('textarea');t.rows=3;t.value=value;var f=el('div','hero-ann-edit'),buttons=el('div','hero-ann-tools');buttons.append(action('Gravar','Gravar alteração',function(){onSave(t.value);}),action('Cancelar','Cancelar edição',function(){f.remove();tx.hidden=false;}));f.append(t,buttons);tx.hidden=true;r.insertBefore(f,tx.nextSibling);t.focus();}));
    if(!readonly&&onRemove)tools.append(action('×','Excluir anotação',onRemove));
    if(isDetail){r.append(tx,h);}else r.append(h,tx);if(meta)r.append(el('small','hero-ann-meta',meta));
    if(!value)tx.classList.add('muted');
    return r;
  }
  var fixed=el('div','hero-ann-stack'),others=el('div','hero-ann-stack');primary.append(fixed,foot);
  regs.forEach(function(r){var k=r[0],field=r[1],v=S(V('triagem',field)),label=k==='@processual'?'Síntese processual':k==='@fatica'?'Síntese fática':field;
    if(!v&&k!=='@detalhamento'&&!destacado(k))return;
    var item=card(k,label,v,'',function(t){marcar('triagem.'+field,S(t));agendar(500);render();});(destacado(k)?fixed:others).append(item);
  });
  linhas.forEach(function(l,n){var m=/^(\d{2}\/\d{2}\/\d{4}(?: \d{2}:\d{2})?)\s*·\s*(?:([^·]{2,40}?)\s*·\s*)?(.+)$/.exec(l);
    var item=card(l,String(n+1).padStart(2,'0'),m?m[3]:l,m?[m[2],m[1]].filter(Boolean).join(' · '):'',function(t){t=S(t).replace(/\s*\n+\s*/g,' ');if(!t)return;var novo=m?m[1]+' · '+(m[2]||'equipe')+' · '+t:t,at=fixados.indexOf(l);if(at>=0){fixados[at]=novo;gravaFix();}var L=notasL();L[n]=novo;marcar('origem.Observações',L.join('\n'));agendar(500);render();},function(){if(!confirm('Excluir esta anotação?'))return;var L=notasL();L.splice(n,1);fixados=fixados.filter(function(x){return x!==l;});gravaFix();marcar('origem.Observações',L.join('\n'));agendar(500);render();});(destacado(l)?fixed:others).append(item);
  });
  var qv=S(V('triagem','Alegações')),qs=qv?qv.split(/\n+/).map(S).filter(Boolean):[];
  var qfix=[],qCampo=campoModelo('triagem','Questões destacadas');try{var qraw=JSON.parse(S(V('triagem','Questões destacadas'))||'[]');if(Array.isArray(qraw))qfix=qraw.filter(function(q){return typeof q==='string'&&qs.includes(q);});}catch(e){}
  function gravarQfix(){if(qCampo&&editavel(qCampo))marcar('triagem.Questões destacadas',JSON.stringify([...new Set(qfix)]));}
  function pinQ(q){var b=action('','Destacar questão',function(){if(!qCampo||!editavel(qCampo))return;var i=qfix.indexOf(q);if(i>=0)qfix.splice(i,1);else qfix.push(q);gravarQfix();heroTopo.questoes=true;agendar(500);render();});b.classList.add('hero-note-pin');b.innerHTML=SV('<path d="m16 3 5 5-4 1-3 5v3l-2 2-3-5-5-3 2-2h3l5-3zM9 14l-6 7"/>',13);b.disabled=!qCampo||!editavel(qCampo);b.setAttribute('aria-pressed',String(qfix.includes(q)));b.title=qfix.includes(q)?'Retirar destaque':'Destacar questão';b.setAttribute('aria-label',b.title);return b;}

  var nb=el('summary'),qb=el('summary'),ncount=linhas.length+regs.filter(function(r){return !!S(V('triagem',r[1]));}).length;
  nb.append(el('h4','','Anotações'),el('span','gn',String(ncount)));qb.append(el('h4','','Questões'),el('span','gn',String(qs.length)));
  var add=action('+','Incluir anotação',function(){heroTopo.notas=true;atualizaAnn();form.hidden=false;nt.focus();});nb.append(add);add.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();});
  var form=el('div','hero-ann-edit'),kind=el('select'),nt=el('textarea');form.hidden=true;nt.rows=3;nt.placeholder='Registrar anotação';[['livre','Anotação livre']].concat(regs.map(function(r){return [r[0],r[1]];})).forEach(function(r){var o=el('option','',r[1]);o.value=r[0];kind.append(o);});
  kind.onchange=function(){var r=regs.find(function(x){return x[0]===kind.value;});nt.value=r?S(V('triagem',r[1])):'';};
  var fb=el('div','hero-ann-tools');fb.append(action('Gravar','Gravar anotação',function(){var t=S(nt.value),r=regs.find(function(x){return x[0]===kind.value;});if(r)marcar('triagem.'+r[1],t);else{if(!t)return;var L=notasL();L.push(agoraBr()+' · '+(ses.estado().usuario||'equipe')+' · '+t.replace(/\s*\n+\s*/g,' '));marcar('origem.Observações',L.join('\n'));}agendar(500);render();}),action('Cancelar','Cancelar inclusão',function(){form.hidden=true;}));form.append(kind,nt,fb);ann.append(form,others);
  if(!others.childNodes.length)others.append(el('small','muted','Nenhuma anotação adicional.'));
  var qh=el('div','hero-ann-head'),qa=action('+','Incluir questão',function(){qform.hidden=false;qt.focus();});qb.append(qa);qa.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();heroTopo.questoes=true;atualizaAnn();});
  function salvarQ(L){marcar('triagem.Alegações',L.map(function(x){return S(x).replace(/\s*\n+\s*/g,' ');}).filter(Boolean).join('\n'));heroTopo.questoes=true;agendar(500);render();}
  var qform=el('div','hero-ann-edit'),qt=el('textarea'),qbuttons=el('div','hero-ann-tools');qt.rows=2;qt.placeholder='Questão a apreciar';qform.hidden=true;qbuttons.append(action('Incluir','Gravar questão',function(){if(S(qt.value))salvarQ(qs.concat([qt.value]));}),action('Cancelar','Cancelar questão',function(){qform.hidden=true;}));qform.append(qt,qbuttons);questions.append(qform);
  qs.forEach(function(q,n){var r=el('article','hero-ann-card'),h=el('div','hero-ann-head'),t=el('div','hero-ann-text',q),b=el('div','hero-ann-tools');h.append(el('span','hero-note-tag',String(n+1).padStart(2,'0')),b);b.append(pinQ(q),action('✎','Editar questão',function(){var x=el('textarea'),f=el('div','hero-ann-edit'),a=el('div','hero-ann-tools');x.rows=3;x.value=q;a.append(action('Gravar','Gravar questão',function(){if(!S(x.value))return;var L=qs.slice();var novo=S(x.value).replace(/\s*\n+\s*/g,' ');L[n]=novo;if(qfix.includes(q)){qfix=qfix.map(function(v){return v===q?novo:v;});gravarQfix();}salvarQ(L);}),action('Cancelar','Cancelar edição',function(){f.remove();t.hidden=false;}));f.append(x,a);t.hidden=true;r.append(f);x.focus();}),action('×','Excluir questão',function(){if(confirm('Excluir esta questão?')){var L=qs.filter(function(x,i){return i!==n;});if(!L.includes(q)){qfix=qfix.filter(function(x){return x!==q;});gravarQfix();}salvarQ(L);}}));r.append(h,t);questions.append(r);});
  if(!qs.length)questions.append(el('small','muted','Nenhuma questão registrada.'));
  var nd=el('details','gg hero-etiquetas hero-ann-group hero-ann-notes'),qd=el('details','gg hero-etiquetas hero-ann-group hero-ann-questions-group');
  ann.classList.add('hero-tags-content');questions.classList.add('hero-tags-content');
    /* Card único de anotações: sem header; destaques sempre visíveis e comandos no rodapé dos destaques. */
  var noteCard=el('section','gg hero-ann-group hero-ann-notes hero-ann-unified'),toggleNotes=el('button','hero-ann-tab hero-ann-icon-toggle'),arrowNotes=el('span','hero-ann-chevron');
  toggleNotes.type='button';toggleNotes.title='Expandir ou recolher anotações adicionais';toggleNotes.setAttribute('aria-label',toggleNotes.title);toggleNotes.append(arrowNotes);toggleNotes.onclick=function(){heroTopo.notas=!heroTopo.notas;atualizaAnn();};
  add.remove();foot.replaceChildren(toggleNotes,add);primary.replaceChildren(fixed,foot);noteCard.append(primary,ann);qd.append(qb,questions);
  function atualizaAnn(){ann.hidden=!heroTopo.notas;noteCard.classList.toggle('hero-ann-open',!!heroTopo.notas);toggleNotes.setAttribute('aria-expanded',String(!!heroTopo.notas));arrowNotes.textContent=heroTopo.notas?' ▴':' ▾';qd.open=!!heroTopo.questoes;}
  qd.addEventListener('toggle',function(){if(qd.isConnected)heroTopo.questoes=qd.open;});
  pair.append(noteCard);noteWrap.append(pair);
  var qtags=el('div','hero-q-tags');qtags.setAttribute('aria-label','Questões destacadas');
  qs.filter(function(q,i){return qfix.includes(q)&&qs.indexOf(q)===i;}).forEach(function(q){var t=el('span','chip hero-q-tag',q);t.title=q;qtags.append(t);});
  if(qtags.childNodes.length)noteWrap.append(qtags);
  materia.append(qd);id.insertBefore(noteWrap,steps);atualizaAnn();
  /* O Acompanhamento é proprietário dos campos, não depende do DOM da aba Triagem. */
  var prior=caixa.querySelector('#pv-acomp');if(prior)prior.remove();
  caixa.querySelectorAll('#pv-tri-enc,.pv-followup').forEach(function(x){x.remove();});
  if(resp)resp.remove();
  var sel=caixa.querySelector('.rt-tsel');
  if(!sel&&window.MutaRoteiro){var tmp=el('div');html(tmp,corpoRoteiro());sel=tmp.querySelector('.rt-tsel');}
  if(sel){sel.classList.add('hero-tipo-roteiro');tj.prepend(sel);caixa.querySelectorAll('.rt-tsel').forEach(function(x){if(x!==sel)x.remove();});}
  else html(tj,campoRot('triagem','Tipo de Julgamento','Tipo de julgamento'));
  /* Especificações jurídicas ficam na Produção; planejamento não altera resultado. */
  /* O seletor de julgamento permanece exclusivamente no Acompanhamento, inclusive em Produção. */
  if(identity)identity.remove();
  /* Encaminhamento é uma seção interna, comum a todos os modos. */
  var encSection=el('section','hero-enc-integrado');encSection.append(el('h4','pm-mer-h','Encaminhamento'));
  tj.classList.add('hero-enc-tipo');encSection.append(tj);
  var encFields=el('div','gr hero-enc-fields');encSection.append(encFields);
  body.querySelectorAll('.pm-enc,.pv-acomp-sit,.pv-followup,.pm-sitj').forEach(function(x){x.remove();});
  var destinoAtual=destGrav(),destRow=el('label','gf'),destSel=el('select'),destTop=el('div','hero-dest-top');
  destRow.append(el('span','gl','Destino final'));destSel.dataset.fk='producao.Destino';[['','A definir'],['Sessão','Colegiado'],['Monocrática','Relator'],['Outro destino','Outro destino final']].forEach(function(x){var o=el('option','',x[1]);o.value=x[0];destSel.append(o);});destSel.value=destinoAtual;destSel.disabled=!!(window.MUTA_WEB&&window.MUTA_WEB.leitura);destRow.append(destSel);destTop.append(destRow);html(destTop,situacaoHtml());encFields.append(destTop);
  var enquad=el('div','gf w hero-enq-label');enquad.append(el('span','gl','Enquadramento'),el('span','ro',destinoAtual==='Sessão'?'Seleção prévia':destinoAtual==='Monocrática'?'Hipóteses de monocrática':destinoAtual==='Outro destino'?'Outro destino final':'A definir'));encFields.append(enquad);
  var prop=el('details','gg hero-proposta-julg gf w'),propSum=el('summary'),propTitle=el('h4','','Proposta de julgamento'),propBody=el('div','gr'),propVal=S(V('triagem','Proposta de julgamento')),propHist=S(V('triagem','Registro - Proposta'));
  propSum.append(propTitle);if(propVal)propSum.append(el('span','gn','Registrada'));prop.append(propSum,propBody);
  prop.open=heroTopo.proposta!==undefined?!!heroTopo.proposta:false;
  prop.addEventListener('toggle',function(){if(prop.isConnected)heroTopo.proposta=prop.open;});
  html(propBody,campoRot('triagem','Proposta de julgamento','Proposta de julgamento'));
  if(propHist){var ph=el('details','hero-proposta-hist'),ps=el('summary','','Proposta histórica do lote'),pt=el('div','hero-proposta-hist-text',propHist);ph.append(ps,pt);propBody.append(ph);}
  encFields.append(prop);

  if(destinoAtual==='Outro destino'){html(encFields,campoRot('producao','Destino - Outro','Especificar destino'));html(encFields,campoRot('triagem','Destino - Outro Nota','Nota de enquadramento'));}
  if(destinoAtual==='Sessão'){
    var sp=el('label','gf'),spSel=el('select');sp.append(el('span','gl','Seleção prévia'));spSel.dataset.fk='triagem.Seleção Prévia';spSel.setAttribute('aria-label','Seleção prévia');
    [['','Não selecionado'],['SELECIONADO PREVIAMENTE','Selecionado previamente']].forEach(function(x){var op=el('option','',x[1]);op.value=x[0];spSel.append(op);});
    spSel.value=S(V('triagem','Seleção Prévia'));spSel.disabled=!!(window.MUTA_WEB&&window.MUTA_WEB.leitura);sp.append(spSel);encFields.append(sp);
    html(encFields,campoRot('pauta','Nova sessão de destino',spSel.value==='SELECIONADO PREVIAMENTE'?'Sessão da seleção prévia (vazio = banco de reserva)':'Sessão provável'));html(encFields,campoRot('triagem','Seleção Prévia - Nota','Nota de enquadramento'));
  }
  /* Pauta do processo: os mesmos campos da ficha, sem depender da aba Pauta. */
  var pautaOficial=pautado(),Pp=(G.op||{}).pauta||{},grupoPauta=grupoModelo('Pauta e julgamento');
  if(pautaOficial&&destinoAtual==='Sessão'){
    encFields.querySelectorAll('[data-fk="triagem.Seleção Prévia"],[data-fk="pauta.Nova sessão de destino"]').forEach(function(x){var r=x.closest('.gf');if(r)r.remove();});
    var resumoP=el('div','hero-pauta-resumo gf w');
    resumoP.append(el('h4','pm-mer-h','Pauta de julgamento'));
    var resumoL=el('div','gr');
    [['Sessão original','Sessão'],['Item (Pauta de Julgamento)','Item']].forEach(function(x){var v=S(V('pauta',x[0]));if(v){var r=el('div','gf');r.append(el('span','gl',x[1]),el('span','ro',fmtV(v)));resumoL.append(r);}});
    resumoP.append(resumoL);
    ['Status de Julgamento','Nova sessão de destino','Motivo da remarcação','JULGAMENTO'].forEach(function(k){html(resumoP,campoRot('pauta',k));});
    encFields.append(resumoP);
  }
  /* Solicitações: bloco único anterior ao encaminhamento, inclusive sem pauta oficial. */
  if(N(destinoAtual)==='monocratica'){
    var hip=campoLista('triagem','Hipóteses Monocrática');if(hip)html(encFields,campo(Object.assign({},hip,{rotulo:'Hipótese do artigo 932'})));
    html(encFields,campoRot('triagem','Art. 932 - Nota de enquadramento','Nota de enquadramento'));
  }

  var tramite=el('section','hero-tramite'),map=tramiteMapa(),mc=campoModelo('origem','Mapa de próximos passos'),canMap=!!mc&&editavel(mc);
  function salvarMapa(){if(!canMap)return;marcar('origem.Mapa de próximos passos',JSON.stringify(map));if(!heroTopo.encOpen)heroTopo.encOpen={destino:true};heroTopo.encOpen.tramite=true;agendar(500);render();}
  var mhTr=el('div','hero-sol-head'),addTr=el('button','btn line sm','+');addTr.type='button';addTr.title='Adicionar pronunciamento ou providência';addTr.setAttribute('aria-label',addTr.title);addTr.disabled=!canMap;mhTr.append(el('h4','pm-mer-h','Pronunciamentos e providências'),addTr);tramite.append(mhTr);
  /* Os registros antigos permanecem acessíveis, sem duplicar o adicionador. */
  if(['Próximo pronunciamento','Ato a proferir','Próxima ação'].some(function(k){return !!S(V('origem',k));})){var legado=el('details','hero-tr-legacy'),ls=el('summary','','Planejamento anterior'),lf=el('div','gr');legado.append(ls,lf);['Próximo pronunciamento','Ato a proferir','Próxima ação'].forEach(function(k){if(S(V('origem',k)))html(lf,campoRot('origem',k,k==='Próxima ação'?'Próxima providência':k));});tramite.append(legado);}
  var formTr=el('div','hero-sol-form');formTr.hidden=true;var kindTr=el('select'),pronTr=el('select'),txTr=el('textarea'),modeTr=el('select'),existingTr=el('select'),newTr=el('textarea'),errTr=el('small','status err'),svTr=el('button','btn solid sm','Incluir'),cxTr=el('button','lnk','Cancelar');
  function trOption(node,val,label){var o=el('option','',label);o.value=val;node.append(o);}
  function trField(label,input){var w=el('label','gf');w.append(el('span','gl',label),input);return w;}
  [['ato','Pronunciamento'],['providencia','Providência']].forEach(function(x){trOption(kindTr,x[0],x[1]);});
  trOption(pronTr,'','Selecionar pronunciamento');var pmc=campoLista('origem','Próximo pronunciamento');((pmc&&pmc.opcoes)||['Despacho','Decisão interlocutória','Acórdão','Monocrática terminativa']).forEach(function(o){var v=typeof o==='string'?o:o.valor;trOption(pronTr,v,v);});
  [['','Sem condição'],['existente','Vincular pendência existente'],['nova','Criar pendência condicionante']].forEach(function(x){trOption(modeTr,x[0],x[1]);});
  txTr.rows=2;txTr.placeholder='Descrever o ato ou a providência';newTr.rows=2;newTr.placeholder='Descrever o que deve ser sanado';
  var pronRow=trField('Pronunciamento',pronTr),existingRow=trField('Pendência existente',existingTr),newRow=trField('Nova pendência',newTr);
  function preencherExistentes(sel){sel.replaceChildren();trOption(sel,'','Selecionar pendência');[...new Set(snLinhas('pd').map(function(l){return l.replace(/^✓\s*/,'');}))].forEach(function(v){trOption(sel,v,tramiteDescricao(v)+(tramiteEstado(snLinhas('pd'),{vinculo:v})==='resolvida'?' · resolvida':''));});}
  function ajustarTr(){pronRow.hidden=kindTr.value!=='ato';existingRow.hidden=modeTr.value!=='existente';newRow.hidden=modeTr.value!=='nova';if(modeTr.value==='existente')preencherExistentes(existingTr);errTr.textContent='';}
  kindTr.onchange=modeTr.onchange=ajustarTr;svTr.type=cxTr.type='button';formTr.append(trField('Tipo',kindTr),pronRow,trField('Descrição',txTr),trField('Condicionamento',modeTr),existingRow,newRow,errTr,svTr,cxTr);tramite.append(formTr);
  addTr.onclick=function(){formTr.hidden=!formTr.hidden;if(!formTr.hidden){ajustarTr();kindTr.focus();}};cxTr.onclick=function(){formTr.hidden=true;};ajustarTr();
  function associarCond(p,mode,existing,novo){var L=snLinhas('pd');if(mode==='existente'){if(!existing||tramiteIndice(L,{vinculo:existing})<0)return false;p.condicao={vinculo:existing,criada:false};}
    else if(mode==='nova'){var t=S(novo).replace(/\s*\n+\s*/g,' ');if(!t)return false;var ref=t+' · '+(ses.estado().usuario||'equipe')+' · '+agoraBr()+' · '+p.id+'-c';L.push(ref);p.condicao={vinculo:ref,criada:true};tramiteSinal(L);}
    else delete p.condicao;return true;}
  svTr.onclick=function(){if(!canMap)return;var t=S(txTr.value).replace(/\s*\n+\s*/g,' ');if(!t||kindTr.value==='ato'&&!pronTr.value){errTr.textContent='Informe o tipo de pronunciamento e/ou a descrição do passo.';return;}
    var p={id:'tr-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),tipo:kindTr.value,texto:t,pronunciamento:kindTr.value==='ato'?pronTr.value:'',feito:false,autor:ses.estado().usuario||'',data:new Date().toISOString()};
    if(!associarCond(p,modeTr.value,existingTr.value,newTr.value)){errTr.textContent='Informe a pendência condicionante.';return;}map.passos.push(p);tramiteLog(map,p,'incluído','Trâmite',{condicao:p.condicao||null});salvarMapa();};
  var trList=el('ol','hero-tr-list'),bloqueado=false;
  map.passos.forEach(function(p,i){var cond=p.tipo==='pendencia',lin=cond?snLinhas('pd'):[],idx=cond?lin.findIndex(function(l){return l.replace(/^✓\s*/,'')===p.vinculo;}):-1,feito=cond?idx>=0&&/^✓/.test(lin[idx]):!!p.feito;
    var row=el('li','hero-tr-item'),hd=el('div','hero-sol-head'),cb=el('input');cb.type='checkbox';cb.checked=feito;var cst=p.condicao?tramiteEstado(snLinhas('pd'),p.condicao):'',cblock=!!p.condicao&&cst!=='resolvida';cb.disabled=!canMap||(!feito&&(bloqueado||cblock))||cond&&idx<0;
    cb.setAttribute('aria-label',cond?'Resolver pendência':'Concluir passo');hd.append(el('small','chip',String(i+1).padStart(2,'0')+' · '+(cond?'Pendência':p.tipo==='ato'?(p.pronunciamento||'Pronunciamento'):'Providência')),cb);row.append(hd,el('div','',p.texto),el('small','muted',feito?'Concluído':cond&&idx<0?'Vínculo ausente · conferir sinalização':cblock?'Condicionado à resolução da pendência':bloqueado?'Aguardando passo anterior':cond?'Aguardando resolução':'Disponível'));
    cb.onchange=function(){if(!canMap)return;if(cond){var L=snLinhas('pd'),k=L.findIndex(function(l){return l.replace(/^✓\s*/,'')===p.vinculo;});if(k<0)return;L[k]=(cb.checked?'✓ ':'')+p.vinculo;marcar('triagem.O que falta sanar',L.join('\n'));try{situacaoSync();}catch(e){}}else p.feito=cb.checked;tramiteLog(map,p,cb.checked?'concluído':'reaberto','Trâmite');salvarMapa();};
    if(p.condicao){var cr=el('div','hero-tr-condition'),ck=el('input');ck.type='checkbox';ck.checked=cst==='resolvida';ck.disabled=!canMap||cst==='ausente';ck.setAttribute('aria-label','Resolver pendência condicionante');cr.append(ck,el('span','',tramiteDescricao(p.condicao.vinculo)),el('small','muted',cst==='ausente'?'Vínculo ausente':ck.checked?'Resolvida':'Pendente'));row.append(cr);ck.onchange=function(){var L=snLinhas('pd'),k=tramiteIndice(L,p.condicao);if(k<0)return;L[k]=(ck.checked?'✓ ':'')+p.condicao.vinculo;tramiteSinal(L);map.passos.filter(function(x){return x.condicao&&x.condicao.vinculo===p.condicao.vinculo||x.tipo==='pendencia'&&x.vinculo===p.condicao.vinculo;}).forEach(function(x){tramiteLog(map,x,ck.checked?'pendência resolvida':'pendência reaberta','Trâmite');});salvarMapa();};}
    var toolsTr=el('div','hero-tr-actions');
    function actionTr(label,title,fn,disabled){var b=el('button','btn line sm',label);b.type='button';b.title=title;b.setAttribute('aria-label',title);b.disabled=!canMap||!!disabled;b.onclick=fn;toolsTr.append(b);}
    function mover(delta){var j=i+delta;if(j<0||j>=map.passos.length)return;map.passos.splice(i,1);map.passos.splice(j,0,p);tramiteLog(map,p,'reordenado','Trâmite',{de:i+1,para:j+1});salvarMapa();}
    actionTr('↑','Mover para cima',function(){mover(-1);},i===0);
    actionTr('↓','Mover para baixo',function(){mover(1);},i===map.passos.length-1);
    actionTr('Editar','Editar descrição',function(){var editor=el('textarea');editor.rows=2;editor.value=p.texto;var save=el('button','btn solid sm','Salvar'),cancel=el('button','lnk','Cancelar');save.type=cancel.type='button';var ed=el('div','hero-sol-form');ed.append(editor,save,cancel);toolsTr.hidden=true;row.append(ed);editor.focus();cancel.onclick=function(){ed.remove();toolsTr.hidden=false;};save.onclick=function(){var v=S(editor.value).replace(/\s*\n+\s*/g,' ');if(!v)return;var ant=p.texto;if(cond){var L=snLinhas('pd'),k=tramiteIndice(L,p);if(k<0)return;var novo=v+' · '+(p.autor||'equipe')+' · '+agoraBr()+' · '+p.id;L[k]=(/^✓/.test(L[k])?'✓ ':'')+novo;p.vinculo=novo;tramiteSinal(L);}p.texto=v;tramiteLog(map,p,'editado','Trâmite',{anterior:ant});salvarMapa();};});
    if(cond)actionTr(cond?'→ Providência':'→ Pendência',cond?'Converter em providência':'Converter em pendência',function(){
      if(!canMap)return;var L=snLinhas('pd'),ant=p.tipo;
      if(cond){var k=tramiteIndice(L,p);p.feito=k>=0&&/^✓/.test(L[k]);if(k>=0)L.splice(k,1);delete p.vinculo;p.tipo='providencia';}
      else{p.tipo='pendencia';p.vinculo=p.texto+' · '+(p.autor||'equipe')+' · '+agoraBr()+' · '+p.id;L.push((p.feito?'✓ ':'')+p.vinculo);delete p.feito;}
      tramiteSinal(L);tramiteLog(map,p,'convertido','Trâmite',{de:ant,para:p.tipo});salvarMapa();
    });
    if(cond&&idx<0)actionTr('Restaurar vínculo','Restaurar sinalização ausente',function(){var L=snLinhas('pd');if(tramiteIndice(L,p)<0){p.vinculo=p.vinculo||p.texto+' · '+(p.autor||'equipe')+' · '+agoraBr()+' · '+p.id;L.push(p.vinculo);tramiteSinal(L);tramiteLog(map,p,'vínculo restaurado','Trâmite');salvarMapa();}});
    if(!cond)actionTr(p.condicao?'Condição':'Vincular pendência','Configurar pendência condicionante',function(){
      var ed=el('div','hero-sol-form'),m=el('select'),e=el('select'),t=el('textarea'),ok=el('button','btn solid sm','Gravar'),cancel=el('button','lnk','Cancelar'),er=el('small','status err');
      [['manter','Manter condição atual'],['','Sem condição'],['existente','Vincular existente'],['nova','Criar pendência']].forEach(function(x){if(x[0]!=='manter'||p.condicao)trOption(m,x[0],x[1]);});preencherExistentes(e);t.placeholder='Nova pendência';t.rows=2;ok.type=cancel.type='button';m.onchange=function(){e.hidden=m.value!=='existente';t.hidden=m.value!=='nova';};m.onchange();ed.append(m,e,t,er,ok,cancel);row.append(ed);toolsTr.hidden=true;cancel.onclick=function(){ed.remove();toolsTr.hidden=false;};ok.onclick=function(){if(m.value!=='manter'){if(!associarCond(p,m.value,e.value,t.value)){er.textContent='Informe a pendência.';return;}tramiteLog(map,p,'condição alterada','Trâmite',{condicao:p.condicao||null});}salvarMapa();};
    });
    actionTr('×','Remover passo',function(){if(!confirm('Remover este passo do Trâmite?'))return;if(cond){var L=snLinhas('pd'),k=tramiteIndice(L,p);if(k>=0)L.splice(k,1);tramiteSinal(L);}tramiteLog(map,p,'removido','Trâmite');map.passos.splice(i,1);salvarMapa();});
    row.append(toolsTr);
    if(!feito)bloqueado=true;trList.append(row);
  });tramite.append(trList);if(!map.passos.length)tramite.append(el('small','muted','Nenhum passo mapeado.'));if(map.historico.length){var hTr=el('details','hero-tr-history'),hs=el('summary','','Histórico do trâmite · '+map.historico.length);hTr.append(hs);map.historico.slice().reverse().forEach(function(e){var r=el('div','hero-tr-item');r.append(el('b','',S(e.acao)),el('div','',S(e.texto)||S(e.id)),el('small','muted',[fmtV(e.data),e.autor,e.origem].filter(Boolean).join(' · ')));if(e.de!=null)r.append(el('small','muted',String(e.de)+' → '+String(e.para)));hTr.append(r);});tramite.append(hTr);}
  /* Destino e Trâmite são seções consecutivas, recolhíveis de forma independente. */
  var encGroups=[['destino','Destino',encFields],['tramite','Trâmite',tramite]];
  if(!heroTopo.encOpen)heroTopo.encOpen={destino:true,tramite:heroTopo.encTab==='tramite'};
  encGroups.forEach(function(x){var d=el('details','gg hero-enc-group'),h=el('summary'),t=el('h4','',x[1]);h.append(t);d.append(h,x[2]);x[2].hidden=false;d.open=!!heroTopo.encOpen[x[0]];d.addEventListener('toggle',function(){if(d.isConnected)heroTopo.encOpen[x[0]]=d.open;});encSection.append(d);});
  var solTab=el('details','hero-acomp hero-solicitacoes-tab'),solSum=el('summary','','Solicitações'),solBody=el('div','hero-acomp-b');
  solTab.append(solSum,solBody);
  var manCampo=campoModelo('origem','Solicitações manuais'),man=[];
  try{var raw=JSON.parse(S(V('origem','Solicitações manuais'))||'[]');if(Array.isArray(raw))man=raw.filter(function(x){return x&&typeof x==='object';});}catch(e){}
  var canSol=!!manCampo&&editavel(manCampo),canDec=canSol&&!!G.desembargador;
  function salvarSol(r){if(!canSol)return;marcar('origem.Solicitações manuais',JSON.stringify(man));G.aba='Processo';G.rot='sol';agendar(500);render();}
  var solGroups=[['Sustentação oral',['Sustentação presencial','Sustentação por videoconferência']],['Preferência',['Preferência']],['Despacho',['Despacho']],['Retirada de pauta',['Retirada de pauta']],['Adiamento',['Adiamento']],['Outras',['Outra solicitação']]];
  var solHead=el('div','pc-sh hero-sol-head'),add=el('button','btn line sm','+ Solicitação');add.type='button';add.disabled=!canSol;solHead.append(el('h3','','Solicitações'),add);solBody.append(solHead);
  var form=el('div','hero-sol-form');form.hidden=true;var tipo=el('select'),pessoa=el('input'),oab=el('input'),parte=el('input'),desc=el('textarea'),data=el('input'),sessao=el('input'),save=el('button','btn solid sm','Registrar'),cancel=el('button','lnk','Cancelar'),err=el('small','status err');
  solGroups.forEach(function(g){g[1].forEach(function(t){var o=el('option','',t);o.value=t;tipo.append(o);});});
  tipo.setAttribute('aria-label','Tipo de solicitação');oab.placeholder='OAB';parte.placeholder='Parte representada';data.type='date';data.value=hojeIso();sessao.type='date';sessao.value=/^\d{4}-\d{2}-\d{2}$/.test(S(V('pauta','Sessão original')))?S(V('pauta','Sessão original')):'';save.type=cancel.type='button';desc.rows=3;
  function campoSol(label,ctrl){var w=el('label','gf');w.append(el('span','gl',label),ctrl);return w;}
  var lp=campoSol('Solicitante / advogado',pessoa),lo=campoSol('OAB',oab),la=campoSol('Parte representada',parte),ld=campoSol('Data do pedido',data),ls=campoSol('Sessão',sessao),lt=campoSol('Descrição ou observação',desc);
  form.append(campoSol('Tipo',tipo),lp,lo,la,ld,ls,lt,err,save,cancel);solBody.append(form);
  function extTipo(t){return t==='Preferência'||/^Sustentação/.test(t);}
  function intTipo(t){return t==='Retirada de pauta'||t==='Adiamento';}
  function ajustarForm(){var t=tipo.value,ex=extTipo(t),interno=intTipo(t);lp.firstChild.textContent=interno?'Servidor solicitante':'Solicitante / advogado';pessoa.readOnly=interno;if(interno)pessoa.value=ses.estado().usuario||'';else if(pessoa.value===ses.estado().usuario)pessoa.value='';lo.hidden=la.hidden=!ex;ls.hidden=!ex&&t!=='Adiamento';ls.firstChild.textContent=t==='Adiamento'?'Sessão pretendida':'Sessão';ld.hidden=ex;lt.hidden=ex;lt.firstChild.textContent=interno?'Justificativa obrigatória':'Descrição ou observação';err.textContent='';}
  tipo.onchange=ajustarForm;add.onclick=function(){form.hidden=!form.hidden;if(!form.hidden){var g=solGroups.find(function(g){return g[0]===heroTopo.tipoSol;});if(g)tipo.value=g[1][0];ajustarForm();tipo.focus();}};cancel.onclick=function(){form.hidden=true;};
  save.onclick=function(){if(!canSol)return;var t=tipo.value,interno=intTipo(t),txt=S(desc.value),g=solGroups.find(function(g){return g[1].indexOf(t)>=0;});heroTopo.tipoSol=g?g[0]:t;
    if(extTipo(t)){if(!S(pessoa.value)||!S(parte.value)||!sessao.value){err.textContent='Informe advogado, parte e sessão.';return;}if(!window.MutaPauta||!window.MutaPauta.registrarPedido){err.textContent='Integração de pedidos indisponível.';return;}save.disabled=true;var cnj=G.cnj;window.MutaPauta.registrarPedido({cnj:cnj,tipo:t==='Preferência'?t:t==='Sustentação presencial'?'Presencial':'Virtual',data:sessao.value,advogado:S(pessoa.value),oab:S(oab.value),parte:S(parte.value)}).then(function(){if(G.cnj===cnj){G.aba='Processo';G.rot='sol';render();}},function(e){err.textContent=e.message||'Não foi possível registrar.';save.disabled=false;});return;}
    if(interno&&!txt){err.textContent='Informe a justificativa.';return;}man.push({id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),tipo:t,solicitante:S(pessoa.value),descricao:txt,justificativa:interno?txt:'',data:data.value||hojeIso(),sessaoPretendida:sessao.value,autor:ses.estado().usuario||'',estado:'Pendente',criadoEm:new Date().toISOString()});salvarSol();};
  var solNav=el('div','hero-sol-nav'),solPanels=el('div','hero-sol-panels');solBody.append(solNav,solPanels);
  var activeSol=heroTopo.tipoSol||'Sustentação oral';
  solGroups.forEach(function(group){var nome=group[0],tipos=group[1],externo=nome==='Sustentação oral'||nome==='Preferência',tab=el('button','hero-sol-type',nome),panel=el('section','hero-sol-panel');
    tab.type='button';tab.setAttribute('aria-pressed',String(activeSol===nome));panel.hidden=activeSol!==nome;solNav.append(tab);solPanels.append(panel);
    tab.onclick=function(){heroTopo.tipoSol=nome;solNav.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b===tab));});Array.from(solPanels.children).forEach(function(p){p.hidden=p!==panel;});};
    if(externo){var ped=el('div','hero-pauta-pedidos');ped.dataset.cnj=G.cnj;panel.append(ped);if(window.MutaPauta&&window.MutaPauta.pedidosProcesso)window.MutaPauta.pedidosProcesso(ped,G.cnj,nome);}
    if(nome==='Despacho')html(panel,campoRot('origem','Solicitações de despacho','Registros anteriores'));
    var registros=man.filter(function(r){return tipos.indexOf(r.tipo)>=0;});
    registros.forEach(function(r){var card=el('div','hero-sol-item'),h=el('div','hero-sol-head');h.append(el('b','',r.tipo),el('span','chip',r.estado||'Pendente'));card.append(h,el('small','muted',[fmtV(r.data),r.solicitante].filter(Boolean).join(' · ')));if(r.sessaoPretendida)card.append(el('small','muted','Sessão pretendida: '+fmtV(r.sessaoPretendida)));if(r.descricao||r.justificativa)card.append(el('div','hero-sol-desc',r.justificativa||r.descricao));
    if(r.decididoPor)card.append(el('small','muted','Decidido por '+r.decididoPor+' · '+fmtV(r.decididoEm)));
    if(canDec&&!['Deferida','Indeferida'].includes(r.estado)&&!externo){var actions=el('div','hero-sol-head');[['Deferir','Deferida'],['Indeferir','Indeferida']].forEach(function(v){var b=el('button','btn line sm',v[0]);b.type='button';b.onclick=function(){if(!canDec||!confirm(v[0]+' esta solicitação?'))return;r.estado=v[1];heroTopo.tipoSol=nome;salvarSol();};actions.append(b);});card.append(actions);}panel.append(card);});
    if(!registros.length&&!externo)panel.append(el('small','muted','Nenhuma solicitação registrada.'));
  });
  var hist=el('details','hero-pauta-hist'),histTitle=el('summary','','Histórico de julgamento'),histBody=el('div','hero-hist-body');hist.append(histTitle,histBody);hist.open=!!heroTopo.histJulg;hist.addEventListener('toggle',function(){if(hist.isConnected)heroTopo.histJulg=hist.open;});
  html(histBody,historicoJulgamento());
  var histModelo=campoModelo('triagem','Histórico de julgamento'),histRaw=V('triagem','Histórico de julgamento');
  if(histModelo){
    var histRows=Array.isArray(histRaw)?JSON.parse(JSON.stringify(histRaw)):[],histEdit=editavel(histModelo)&&!(window.MUTA_WEB&&window.MUTA_WEB.leitura),histValid=Array.isArray(histRaw)||!histRaw;
    function histGravar(){marcar('triagem.Histórico de julgamento',histRows);heroTopo.histJulg=true;agendar(500);render();}
    var custom=el('div','hero-hist-custom');histBody.append(custom);
    custom.append(el('h4','pm-mer-h','Registros e justificativas'));
    if(!histValid)custom.append(el('p','muted','Registro em formato não reconhecido; preservado.'));
    else {
      function historicoEditor(row,i){
        var form=el('div','hero-sol-form'),grid=el('div','gr'),refs={};form.append(grid);
        (histModelo.colunas||[]).forEach(function(c){var label=el('label','gf'+(c.tipo==='texto-longo'?' w':'')),input=el(c.opcoes?'select':c.tipo==='texto-longo'?'textarea':'input');label.append(el('span','gl',c.rotulo));if(c.opcoes){var empty=el('option','','—');empty.value='';input.append(empty);var vals=c.opcoes.slice();if(row[c.chave]&&vals.indexOf(row[c.chave])<0)vals.push(row[c.chave]);vals.forEach(function(v){var op=el('option','',v);op.value=v;input.append(op);});}else if(c.tipo==='data')input.type='date';else if(c.tipo==='texto-longo')input.rows=2;input.value=S(row[c.chave]);refs[c.chave]=input;label.append(input);grid.append(label);});
        var save=el('button','btn solid sm','Salvar evento'),cancel=el('button','lnk','Cancelar');save.type=cancel.type='button';form.append(save,cancel);custom.append(form);cancel.onclick=function(){form.remove();};save.onclick=function(){var next=Object.assign({},row);Object.keys(refs).forEach(function(k){next[k]=S(refs[k].value);});if(!next.data||!next.evento||(['Retirada','Adiamento','Vista','Suspensão','Conversão em diligência'].includes(next.evento)&&!next.justificativa)){st('Informe data, evento e justificativa da intercorrência.','err');return;}if(i<0){if(histRows.length>=60){st('Limite atual: 60 eventos.','err');return;}histRows.push(next);}else histRows[i]=next;histGravar();};
      }
      histRows.forEach(function(row,i){var d=el('details','hero-tr-item'),h=el('summary','', [fmtV(row.data),row.evento,row.tipo_julgamento,row.sessao].filter(Boolean).join(' · ')||'Evento');d.append(h);(histModelo.colunas||[]).filter(function(c){return !!row[c.chave];}).forEach(function(c){d.append(el('div','',c.rotulo+': '+row[c.chave]));});if(histEdit){var b=el('button','btn line sm','Editar'),del=el('button','btn line sm','Remover');b.type=del.type='button';b.onclick=function(){historicoEditor(row,i);};del.onclick=function(){if(confirm('Excluir este evento registrado?')){histRows.splice(i,1);histGravar();}};d.append(b,del);}custom.append(d);});
      if(histEdit){var add=el('button','btn line sm','+ Evento de julgamento');add.type='button';add.onclick=function(){historicoEditor({data:new Date().toISOString().slice(0,10)},-1);};custom.append(add);}
    }
  }
  encSection.append(hist);
  body.prepend(encSection);body.append(tagsGroup);
  /* A confirmação da hipótese é própria da produção, vinculada ao conteúdo conferido. */
  if(destinoAtual==='Monocrática'&&(G.aba==='Produção'||(G.aba==='Processo'&&G.rot==='pro'))){
    var prod932=el('section','card pc-sec hero-art932-prod'),ph=el('div','pc-sh');ph.append(el('h3','','Enquadramento · artigo 932'));prod932.append(ph);
    var pg=el('div','gr'),hc=campoLista('triagem','Hipóteses Monocrática');if(hc)html(pg,campo(Object.assign({},hc,{rotulo:'Hipótese do artigo 932'})));html(pg,campoRot('triagem','Art. 932 - Nota de enquadramento','Nota de enquadramento'));prod932.append(pg);
    var hv=S(V('triagem','Hipóteses Monocrática')),hn=S(V('triagem','Art. 932 - Nota de enquadramento')),conf=null;try{conf=JSON.parse(S(V('producao','Art. 932 - Confirmação'))||'null');}catch(e){}
    var valida=conf&&conf.hipotese===hv&&conf.nota===hn&&hv,cb=el('button','btn line sm',valida?'Desfazer confirmação':'Confirmar enquadramento');cb.type='button';cb.disabled=!hv||!!(window.MUTA_WEB&&window.MUTA_WEB.leitura);
    prod932.append(el('small','muted',valida?'Confirmado por '+S(conf.autor)+' · '+brD(conf.data):conf?'Enquadramento alterado · reconfirmar':'Aguardando confirmação na produção'),cb);
    cb.onclick=function(){marcar('producao.Art. 932 - Confirmação',valida?'':JSON.stringify({hipotese:hv,nota:hn,autor:ses.estado().usuario||'',data:new Date().toISOString()}));agendar(500);render();};
    var gb=caixa.querySelector('.gbody');if(gb)gb.prepend(prod932);
  }
  /* Responsável pelo acompanhamento: mesma chave da ficha, agora ao lado das designações. */
  var responsaveis=Array.from(caixa.querySelectorAll('[data-fk="origem.Responsável"],[data-pv-field="origem.Responsável"]'));
  responsaveis.forEach(function(x){var f=x.closest('.gf,.pv-field,.pv-idrow');if(f)f.remove();else x.remove();});
  var design=steps.querySelector('.hero-designacoes');if(!design){design=el('div','hero-designacoes');steps.append(design);}
  /* Três designações independentes em uma única faixa. O valor persistido é o nome do cadastro. */
  var equipe=Array.isArray(G.equipe)?G.equipe:[],roles=[['origem','Responsável','Responsável'],['producao','SERVIDOR','Minutador'],['producao','CORRETOR','Corretor']];
  var normNome=function(v){return N(S(v));};
  function curto(r){if(r.apelido)return r.apelido;if(normNome(r.nome)==='maria eduarda')return 'Duda';return r.nome;}
  design.replaceChildren();
  roles.forEach(function(role){
    var sec=role[0],key=role[1],label=role[2],cur=S(V(sec,key)),item=el('label','hero-design-cell'),select=el('select');
    item.append(el('span','gl',label));select.setAttribute('aria-label',label);select.dataset.fk=sec+'.'+key;
    var blank=el('option','','—');blank.value='';select.append(blank);
    var found=equipe.find(function(r){return [r.nome].concat(r.aliases||[]).some(function(x){return normNome(x)===normNome(cur);});});
    equipe.slice().sort(function(a,b){return a.nome.localeCompare(b.nome,'pt-BR');}).forEach(function(r){
      var o=el('option','',curto(r));o.value=r.nome;o.title=r.nome;select.append(o);
    });
    if(cur&&!found){var o=el('option','',cur);o.value=cur;select.append(o);}
    select.value=found?found.nome:cur;select.title=found?found.nome:(cur||label);
    select.disabled=!!(window.MUTA_WEB&&window.MUTA_WEB.leitura)||(sec==='producao'&&!G.gestor)||!equipe.length;
    if(!equipe.length)select.title='Cadastro de servidores indisponível; atualize o prontuário';
    item.append(select);design.append(item);
  });
  /* Rodapé do próprio cartão superior, fora das três páginas horizontais. */
  var dock=el('section','hero-acomp-dock'),navA=el('div','hero-acomp-tabs');navA.setAttribute('role','tablist');
  var tabsA=[['acompanhamento','Acompanhamento',ac],['monitoramento','Monitoramento',mon],['sinalizacoes','Sinalizações',sd]];
  function abrirA(k){heroTopo.abaAcomp=k;tabsA.forEach(function(x){var on=x[0]===k;x[2].hidden=!on;x[2].open=on;if(x[0]==='sinalizacoes'){ind.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(on&&b.dataset.snKind===heroTopo.snKind));});sig.querySelectorAll('.sn-i').forEach(function(r){r.hidden=on&&!!heroTopo.snKind&&!r.classList.contains(heroTopo.snKind);});}else x[3].setAttribute('aria-selected',String(on));});}
  ind.querySelectorAll('button').forEach(function(b){b.onclick=function(){var kind=b.dataset.snKind,close=heroTopo.abaAcomp==='sinalizacoes'&&heroTopo.snKind===kind;heroTopo.snKind=kind;G.snTp=kind;abrirA(close?'':'sinalizacoes');};});
  tabsA.forEach(function(x){var b=el('button','',x[1]);b.type='button';b.setAttribute('role','tab');x[3]=b;b.addEventListener('click',function(){abrirA(heroTopo.abaAcomp===x[0]?'':x[0]);});if(x[0]==='sinalizacoes'){x[3]=ind;ind.setAttribute('role','group');ind.setAttribute('aria-label','Sinalizações');navA.append(ind);}else if(x[0]==='monitoramento'){var mgp=el('div','hero-monitor-tab');b.classList.add('hero-monitor-label');b.title='Monitoramento';mgp.append(b,urg);navA.append(mgp);}else{b.classList.add('hero-acomp-label');b.title=x[1];navA.append(b);}x[2].querySelector('summary').hidden=true;});
  urg.addEventListener('click',function(){abrirA('monitoramento');});
  dock.append(navA,ac,mon,sd);top.append(dock);
  var solMain=caixa.querySelector('#hero-sol-main');if(solMain){solBody.classList.add('hero-sol-main-body');solMain.append(solBody);}
  if(heroTopo.abaAcomp==='solicitacoes')heroTopo.abaAcomp='';
  abrirA(heroTopo.abaAcomp||(heroTopo.sinalizacoes?'sinalizacoes':heroTopo.monitoramento?'monitoramento':heroTopo.acompanhamento?'acompanhamento':''));show(heroTopo.pagina);
}

function render() { render0(); heroOrganizarProntuario(); if (window.MutaGerador && window.MutaGerador.pintar) window.MutaGerador.pintar(); }
function render0() {
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
  if (G.aba === 'Triagem' || G.aba === 'Roteiro') G.aba = 'Processo';
  if (G.aba === 'Produção') G.aba = 'Processo';
  if (G.aba === 'Gerador') { G.aba = 'Processo'; if (window.MutaAbas) setTimeout(function () { window.MutaAbas.ir('ger'); }, 0); }
  if (MODOS.indexOf(G.aba) < 0) G.aba = 'Processo';
  var nAl = window.MutaAutos && window.MutaAutos.estado().itens ? window.MutaAutos.alertas().filter(function (a) { return a.nivel === 'al'; }).length : 0;
  var tabs = '<div class="seg gtabs pmodos" role="tablist" aria-label="Parte do prontuário">' + MODOS.map(function (a) {
    return '<button type="button" role="tab" data-aba="' + a + '" aria-selected="' + (a === G.aba) + '"><span>' + (ROT_MODO[a] || a) + (a === 'Autos' && nAl ? ' <i class="gnum">' + nAl + '</i>' : '') + '</span><small>' + esc(contaModo(a)) + '</small></button>'; }).join('') + '</div>';
  var snc = snCard(), cab = cabeca(s); CAB_HTML = cab;
  /* 0.69: aviso de sigilo no alto do cartão (processo sigiloso ou documento sigiloso nos autos) */
  if (window.MutaSigilo) { window.MutaSigilo.consultar(G.cnj); var sgh = window.MutaSigilo.html(); if (sgh) cab = cab.replace('<section class="pc pm">', '<section class="pc pm">' + sgh); }
  var corpo = G.aba === 'Autos' ? corpoAutos() : G.aba === 'Produção' ? corpoProducao() : corpoProcesso();
  var ab = document.activeElement && document.activeElement.dataset ? (document.activeElement.dataset.fk || (document.activeElement.dataset.esp ? 'esp:' + document.activeElement.dataset.esp : '') || (document.activeElement.dataset.q != null ? 'q:' + document.activeElement.dataset.q : '')) : '';
  var y = window.scrollY, pp = $('panel-pront'), yp = pp ? pp.scrollTop : 0;
  precEmentario(casoPrec());
  caixa.innerHTML = cab.replace(/<\/section>$/, snc + '</section>') + tabs + st0 + '<div class="gbody">' + corpo + '</div>';
  // Universal: notas depois das etapas; no layout original, depois das especificidades.
  var nt=caixa.querySelector('#g-nt'),esp=caixa.querySelector('.pv-flowbox')||caixa.querySelector('.pm-esp');
  if(nt&&esp){
    var sx=Array.from(nt.querySelectorAll('.nt-cs,.nt-vz'));esp.after(nt);
    if(sx.length)nt.after(...sx);
    nt.classList.add('proc-notas-inline');
    if(!document.body.classList.contains('pv-universal-body')){
      var tx=nt.querySelector('#nt-tx'),bot=nt.querySelector('[data-nt-add]');
      if(tx&&bot){tx.hidden=true;bot.textContent='+ Nota';bot.removeAttribute('data-nt-add');bot.setAttribute('aria-expanded','false');
        var save=document.createElement('button');save.type='button';save.className='btn solid sm';save.setAttribute('data-nt-add','');save.textContent='Incluir';save.hidden=true;tx.after(save);
        bot.addEventListener('click',function(e){e.stopPropagation();tx.hidden=!tx.hidden;bot.textContent=tx.hidden?'+ Nota':'Cancelar';bot.setAttribute('aria-expanded',String(!tx.hidden));save.hidden=tx.hidden;if(!tx.hidden)tx.focus();else tx.value='';});
      }
    }
  }
  var snTitulo=caixa.querySelector('.pm-sn .pm-aut-t');
  if(snTitulo&&nt&&esp){var textNode=snTitulo.firstChild;if(textNode&&textNode.nodeType===3)textNode.nodeValue=textNode.nodeValue.replace(/síntese · notas · |acompanhamento · notas · /i,'');}
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
  /* gravação que falhou não fica só no ícone: aviso visível no prontuário, com "Tentar de novo", até gravar */
  var fx = $('g-falha');
  if (c === 'err') {
    if (!fx && caixa) { fx = document.createElement('div'); fx.id = 'g-falha'; fx.className = 'err-box g-falha'; fx.setAttribute('role', 'alert'); }
    if (fx) { fx.innerHTML = '<span>' + esc(t) + '</span><button type="button" class="btn sm" data-g="regravar">Tentar de novo</button>'; if (caixa && fx.parentNode !== caixa) caixa.insertBefore(fx, caixa.firstChild); }
  } else if (fx && (c === 'ok' || /^gravad|^nada mudou/i.test(t || ''))) fx.remove();
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
    if(window.MUTA_WEB&&window.parent!==window)window.parent.postMessage({tipo:'cmt:hero-gravado',cnj:cnj},location.origin);
    var rec = j.recusados || [];
    st(rec.length ? 'Gravado, exceto (sem permissão): ' + rec.join(', ') : j.semMudanca ? 'Nada mudou no prontuário.' : 'Gravado na ficha do processo' + ((j.cartoes || []).length ? ' e no cartão da pauta' : '') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '.', rec.length ? 'err' : 'ok');
    return j;
  }).catch(function (e) {
    if (cnj === G.cnj) { Object.keys(P).forEach(function (k) { if (!(k in G.pend)) G.pend[k] = P[k]; }); G.pendCnj = cnj; }
    st('Não gravou: ' + e.message + (e.status === 401 ? ' Entre de novo.' : ''), 'err');
    throw e;
  });
}
function marcar(id, v) { if(window.MUTA_WEB&&window.MUTA_WEB.leitura)return; G.pend[id] = v; G.pendCnj = G.cnj; }
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
  if (t.dataset && t.dataset.auG) { if (window.MutaAutos) window.MutaAutos.selecionar(t.dataset.auG, t.checked); return; }
  if (t.dataset && t.dataset.auAuto != null) { if (window.MutaAutos) window.MutaAutos.autoLigar(t.checked); return; }
  if (t.dataset && t.dataset.snOk) { var po = t.dataset.snOk.split(':'), Lo = snLinhas(po[0]), io = Number(po[1]); if (Lo[io] != null) Lo[io] = t.checked ? '✓ ' + Lo[io].replace(/^✓\s*/, '') : Lo[io].replace(/^✓\s*/, ''); snGravar(po[0], Lo); return; }
  if (t.id === 'sn-tp') { G.snTp = t.value; return; }
  if (t.id === 'pm-pron') { var xp = t.value === '' ? null : PRON[Number(t.value)]; marcar('producao.Mono - Tipo de ato', xp ? xp[2] : ''); G.dest = null; agendar(400); render(); return; }
  if (t.dataset && t.dataset.rtc) { if (window.MutaRoteiro) window.MutaRoteiro.conferir(t.dataset.rtc, t.checked, gRot()); render(); return; }
  if (!t.dataset || !t.dataset.fk) return;
  marcar(t.dataset.fk, t.value); if(t.dataset.fk==='producao.Destino')G.dest=null; var l = t.closest('label'); if (l) l.classList.add('mud');
  agendar(900);
  if (t.closest('.hero-acomp') || /^(triagem\.(Urgência|Padrão - Espécie)|producao\.Destino|controles\.Sensível - (In|Ex)cluído)$/.test(t.dataset.fk) || G.aba === 'Processo') render();
});
caixa.addEventListener('toggle', function (e) { var c = e.target.classList; if (!c) return; if (c.contains('pm-sn')) { SN_AB = e.target.open; return; } if (c.contains('sq-card')) { SQ_AB = e.target.open; return; } if (c.contains('pm-mer')) { if (G.merAb !== e.target.open) { G.merAb = e.target.open; render(); } return; } if (c.contains('pm-aut')) { if (G.autAb !== e.target.open) { G.autAb = e.target.open; render(); } return; } if (c.contains('au-it') && window.MutaAutos) { window.MutaAutos.abrirTexto(e.target.dataset.auIt, e.target.open); return; } if (c.contains('au-auto-d') && window.MutaAutos) window.MutaAutos.estado().autoAb = e.target.open; if (c.contains('pc-s')) { G.pecAb = G.pecAb || {}; G.pecAb[e.target.dataset.grupo] = e.target.open; } }, true);
caixa.addEventListener('keydown', function (e) {
  if (e.target.id === 'sn-tx' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); snIncluir(); }
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
  var rb = e.target.closest && e.target.closest('[data-rot]'); if (rb) { G.rot = rb.getAttribute('data-rot'); render(); return; }
  var cb = e.target.closest && e.target.closest('[data-cs]'); if (cb) { var k = cb.getAttribute('data-cs'); CS_AB[k] = true; if (k === 'q') G.qVazia = true; render(); setTimeout(function () { var el = caixa.querySelector(k === 'q' ? '[data-q]' : '[data-fk="triagem.' + (k === 'sp' ? 'Síntese Processual' : 'Síntese Fática') + '"]'); if (el) el.focus(); }, 0); return; }
  if (e.target.closest && e.target.closest('[data-cl-tipo]')) { G.aba = 'Processo'; G.rot = 'tri'; render(); setTimeout(function () { var d = caixa.querySelector('.rt-tsel'); if (d) { d.open = true; d.scrollIntoView({ block: 'center' }); } }, 0); return; }
  var b = e.target.closest('button,a'); if (!b) return;
  if (b.tagName === 'BUTTON' && b.closest('summary')) e.preventDefault(); /* botão no título de um campo expansível não abre nem fecha o campo */
  if (b.dataset.au != null) { if (window.MutaAutos) window.MutaAutos.clique(b); return; }
  if (b.dataset.et != null) { marcarEtapa(Number(b.dataset.et)); return; }
  if (b.dataset.ct) { var pc = b.dataset.ct.split(':'); ctlMarcar(pc[0], pc[1] === '1'); return; }
  if (b.dataset.ad) { adAcao(b.dataset.ad); return; }
  if (b.dataset.tj) { marcar('triagem.Tipo de Julgamento', b.dataset.tj); agendar(400); render(); return; }
  if (b.dataset.desEd) { G.desEd = b.dataset.desEd; render(); var di = $('pm-des'); if (di) { di.focus(); di.select(); } return; }
  if (b.dataset.pron != null) { var x = PRON[Number(b.dataset.pron)]; if (x) { marcar('producao.Destino', x[1]); marcar('producao.Mono - Tipo de ato', x[2]); G.dest = null; agendar(400); render(); } return; }
  if (b.dataset.snX) { var px = b.dataset.snX.split(':'), Lx = snLinhas(px[0]); Lx.splice(Number(px[1]), 1); snGravar(px[0], Lx); return; }
  if (b.hasAttribute('data-nt-add')) { notaIncluir(); return; }
  if (b.dataset.autog === 'desfazer') { autoGabDesfazer(); return; }
  if (b.dataset.sitman) { sitManualSet(b.dataset.sitman === '1'); if (b.dataset.sitman === '0') { if(window.MUTA_WEB){marcar('producao.Destino - Situação',situacaoCalc().v);agendar(400);}else situacaoSync(); } render(); return; }
  if (b.hasAttribute('data-sn-add')) { G.snAb = !G.snAb; render(); var sx = $('sn-tx'); if (sx) sx.focus(); return; }
  if (b.hasAttribute('data-sn-inc')) { snIncluir(); return; }
  if (b.dataset.ntX != null) { var Ln = notasL(); Ln.splice(Number(b.dataset.ntX), 1); marcar('origem.Observações', Ln.join('\n')); agendar(500); render(); return; }
  if (b.dataset.ch) { var cv = S(V.apply(null, [b.dataset.ch.slice(0, b.dataset.ch.indexOf('.')), b.dataset.ch.slice(b.dataset.ch.indexOf('.') + 1)])); marcar(b.dataset.ch, cv === b.dataset.v ? '' : b.dataset.v); agendar(500); render(); return; }
  if (b.dataset.rt != null) { if (window.MutaRoteiro && window.MutaRoteiro.clique(b, gRot())) render(); return; }
  if (b.dataset.copia) { copiar(b.dataset.copia, b); return; }
  if (b.dataset.pecApl != null) { pecaPreencher(b.dataset.pecApl); return; }
  if (b.dataset.pecLer || b.dataset.pecOcr) { var pid = b.dataset.pecLer || b.dataset.pecOcr, AUx = window.MutaAutos; if (!AUx) return;
    AUx.extrair(pid, b.dataset.pecOcr ? 'ocr' : '').then(function (dd) { if (dd && dd.estado === 'ok') pecaPreencher(pid); else render(); }); render(); return; }
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
  if (b.dataset.g === 'regravar') { gravarJa().catch(function () {}); return; }
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
  api: function (p, o) { return ses.api(p, o); },
  gravado: gravado, V: V, F: function (k) { return fonteVal({ fonte: [k] }); }, marcar: marcar, gravar: function () { return gravarJa(); }, ir: function (aba) { if (aba === 'Triagem' || aba === 'Roteiro') aba = 'Processo'; if (MODOS.indexOf(aba) >= 0) { G.aba = aba; render(); } },
  destino: function () { return G.F ? destino() : ''; },
  casoPrec: function () { return G.cnj ? casoPrec() : null; },
  pautaHtml: pautaHtml,
  abrirReferencia: function(){G.pecAb=G.pecAb||{};G.pecAb.Origem=true;G.aba='Autos';if(window.MutaAbas)window.MutaAbas.ir('pront');render();},
  /* a sincronia gravou a ficha: o painel da ficha mostra o novo registro sem nova leitura */
  registro: function (cnj, op) { if (op && dg(cnj) === dg(G.cnj)) { G.op = op; if (modo === 'ficha') render(); } } };
/* Ampliação incremental: preserva os controles, OCR, cronologia e motores dos roteiros. */
(function(){
 var A=window.MutaAnaliseProntuario;if(!A)return;
 var DOC='origem.Classificação documental',SUC='origem.Sucumbência da decisão recorrida',RES='producao.Resultado por recurso';
 var tableDraft=Object.create(null),docDraft=Object.create(null),docFilter='Todos',docCnj='',pane=caixa;
 function val(id){var i=id.indexOf('.');return V(id.slice(0,i),id.slice(i+1));}
 function model(id){var i=id.indexOf('.');return campoModelo(id.slice(0,i),id.slice(i+1));}
 function list(v){return Array.isArray(v)?v:[];}
 function key(id){return G.cnj+'|'+id;}
 function blocked(d){var s=window.MutaSigilo;return !!(s&&(s.bloqueado()||(d&&s.docBloqueado(d))));}
 // Não transportar trechos sigilosos para a ficha compartilhada com a equipe.
 function restricted(d){var s=window.MutaSigilo;return blocked(d)||!!(s&&(s.sigiloso()||(d&&s.docSigiloso(d))));}
 function currentDocs(){var au=window.MutaAutos,r=au&&au.doProcesso&&au.doProcesso();return r?list(r.lista):[];}
 function rows(){return A.mesclar(gravado('origem','Classificação documental'),G.pend[DOC]);}
 function classified(d){var r=rows().find(function(x){return x.id===String(d.id);});return {row:r,classes:r?A.classesValidas(r.classes):A.sugerir(d)};}
 function b(action,id,label){return '<button type="button" class="btn line sm" data-plus="'+esc(action)+'" data-plus-id="'+esc(id)+'">'+esc(label)+'</button>';}
 function inp(c,v,attrs){v=String(v==null?'':v);if(c.tipo==='lista'){var o=[''].concat(c.opcoes||[]);if(v&&o.indexOf(v)<0)o.push(v);return '<select '+attrs+'>'+o.map(function(x){return '<option value="'+esc(x)+'"'+(x===v?' selected':'')+'>'+esc(x||'—')+'</option>';}).join('')+'</select>';}
 return c.tipo==='texto-longo'?'<textarea rows="2" '+attrs+'>'+esc(v)+'</textarea>':'<input type="'+(c.tipo==='data'?'date':'text')+'" '+attrs+' value="'+esc(v)+'">';}
 var baseCampo=campo0;
 campo0=function(c){var id=c.secao+'.'+c.chave;
 if(c.tipo!=='tabela'||!editavel(c)||id===DOC)return baseCampo(c);
 if(blocked())return '<div class="gf w"><span class="gl">'+esc(c.rotulo)+'</span><span class="ro">Acesso restrito.</span></div>';
 var d=tableDraft[key(id)],v=list(val(id)),h='<div class="gf w plus-table" data-plus-table="'+esc(id)+'"><div class="plus-head"><span class="gl">'+esc(c.rotulo)+'</span>'+(!d?b('table-edit',id,v.length?'Editar / +':'+ Incluir'):'')+'</div>';
 if(!d)return h+tabela(c,v)+'</div>';
 h+=d.map(function(row,i){return '<div class="plus-row"><div class="plus-head"><b>Registro '+(i+1)+'</b>'+b('table-remove',id+'|'+i,'Remover')+'</div><div class="gr">'+(c.colunas||[]).map(function(col){return '<label class="gf'+(col.tipo==='texto-longo'?' w':'')+'"><span class="gl">'+esc(col.rotulo)+'</span>'+inp(col,row[col.chave],'data-plus-col="'+esc(col.chave)+'" data-plus-index="'+i+'"')+'</label>';}).join('')+'</div></div>';}).join('');
 return h+'<div class="plus-head">'+b('table-add',id,'+ Linha')+'<span>'+b('table-cancel',id,'Cancelar')+' '+b('table-save',id,'Gravar')+'</span></div></div>';};
 function docHtml(d){if(!model(DOC))return '';if(restricted(d))return '<p class="muted">Classificação detalhada indisponível para documento sigiloso na ficha compartilhada.</p>';
 var id=String(d.id),c=classified(d),draft=docDraft[key(id)],cs=draft?A.classesValidas(draft.classes):c.classes;
 var h='<div class="plus-doc" data-plus-doc="'+esc(id)+'"><div class="plus-head"><span class="muted">'+(c.row?'Classificação registrada':'Classificação sugerida')+'</span>'+b('doc-edit',id,draft?'Fechar':'+ Classificar')+'</div><div class="plus-tags">'+cs.map(function(x){return '<span class="chip">'+esc(x)+'</span>';}).join('')+'</div>';
 if(!draft)return h+'</div>';
 h+='<div class="plus-tags">'+A.categorias.map(function(x){return '<button type="button" class="chip'+(cs.indexOf(x)>=0?' on':'')+'" data-plus="doc-tag" data-plus-id="'+esc(id)+'" data-plus-cat="'+esc(x)+'" aria-pressed="'+(cs.indexOf(x)>=0)+'">'+esc(x)+'</button>';}).join('')+'</div><small class="muted">Até duas funções por documento. Relatável: peça não principal a mencionar no relatório.</small><div class="gr">';
 var cols=model(DOC).colunas.filter(function(c){return ['id','tipo','data','classes','origem','confirmada'].indexOf(c.chave)<0;});
 h+=cols.map(function(c){return '<label class="gf'+(c.tipo==='texto-longo'?' w':'')+'"><span class="gl">'+esc(c.rotulo)+'</span>'+inp(c,draft[c.chave],'data-plus-doc-col="'+esc(c.chave)+'"')+'</label>';}).join('');
 return h+'</div><div class="plus-head">'+b('doc-cancel',id,'Cancelar')+b('doc-save',id,'Confirmar e gravar')+'</div></div>';
 }
 window.MutaGabinete.classificacaoDoc=docHtml;
 window.MutaGabinete.classificacaoFiltro=function(ds){if(restricted()||!model(DOC))return '';ds=ds.filter(function(d){return !restricted(d);});
 return '<div class="plus-docfilter"><span class="gl">Classificação funcional</span><div class="plus-tags">'+['Todos'].concat(A.categorias,['Não classificados']).map(function(c){var n=c==='Todos'?ds.length:ds.filter(function(d){var v=classified(d).classes;return c==='Não classificados'?!v.length:v.indexOf(c)>=0;}).length;return '<button type="button" class="chip'+(docFilter===c?' on':'')+'" data-plus="filter" data-plus-id="'+esc(c)+'">'+esc(c)+' · '+n+'</button>';}).join('')+'</div></div>';};
 window.MutaGabinete.limparFiltroDocumental=function(){docFilter='Todos';};
 window.MutaGabinete.classificacaoVisivel=function(d){if(docFilter==='Todos'||blocked(d))return true;var c=classified(d).classes;return docFilter==='Não classificados'?!c.length:c.indexOf(docFilter)>=0;};
 FORA_PROC['Classificação documental']=1;
 GRUPOS_TRIAGEM['Classificação documental']=1;GRUPOS_TRIAGEM['Sucumbência da decisão recorrida']=1;
 var newGroups=['Plano do pronunciamento','Solução processual','Fundamentação e dispositivo','Sucumbência e consectários do julgamento','Questões específicas da espécie'];
 var species={'Apelação':'ap','Remessa':'rn','AI':'ai','ED':'ed','AgInt':'agint','JR':'ret','MS':'ms'};
 function applicable(c){if(!c||c.secao!=='producao')return true;var p=String(c.chave).split(' - ')[0],k=species[p];return !k||!!ccTipos()[k]||!!S(V(c.secao,c.chave));}
 var originalGrupo=grupoModelo;
 grupoModelo=function(n){var g=originalGrupo(n);return n==='Questões específicas da espécie'&&g?Object.assign({},g,{campos:g.campos.filter(applicable)}):g;};
 newGroups.slice().reverse().forEach(function(n){CC_AC.unshift([n,n]);CC_MONO.unshift([n,n]);});
 function indicatorHtml(){if(!model(SUC)||blocked())return '';
 var chapters=list(val(SUC)),rr=list(val(RES)),rec=list(V('origem','Recursos')),tipo=window.MutaRoteiro?window.MutaRoteiro.TIPOS.filter(function(t){return ccTipos()[t[0]];}).map(function(t){return t[1];}).join(' + '):V('triagem','Tipo de Julgamento');
 var h='<details class="gg plus-ind" open><summary><h4>Indicadores de custas e honorários</h4></summary><div class="gr"><div class="gf w"><small class="muted">Subsídio à revisão · não altera a solução registrada. Tema 1.059/STJ.</small><div>'+b('suc-open','','Ver decisão recorrida')+'</div></div>';
 var cases=rr.length?rr:[{resultado:V('producao','Voto - Resultado')}];
 var idsRec=rec.map(function(x){return String(x.ids||'').match(/\d+/g)||[];}),idsResult=rr.map(function(x){return S(x.id_recurso);});
 var individual=rec.length<=1||(rr.length===rec.length&&new Set(idsResult).size===rr.length&&idsRec.every(function(ids){return ids.some(function(i){return idsResult.indexOf(i)>=0;});})&&rr.every(function(x){return S(x.resultado)&&S(x.recorrente);}));
 if(!individual)cases=[{resultado:V('producao','Voto - Resultado'),incompleto:true}];
 cases.forEach(function(r){var match=chapters.filter(function(x){return r.recorrente&&S(x.devedor)===S(r.recorrente);}),I=A.indicador({resultado:r.resultado,tipo:tipo,sucumbencia:match.length?match:rr.length>1?[]:chapters,multiplos:rec.length>1,individual:individual&&!r.incompleto});
 h+='<div class="gf w plus-ind-item">'+(r.recorrente?'<b>'+esc(r.recorrente)+'</b> · ':'')+esc(r.resultado||'Resultado a definir')+I.itens.map(function(x){return '<p>'+esc(x)+'</p>';}).join('')+'</div>';});
 h+='<div class="gf w"><span class="gl">Registro anterior (texto livre)</span><span class="ro">'+esc(S(V('origem','Sentença - Honorários'))||'—')+' · '+esc(S(V('origem','Sentença - Custas'))||'—')+'</span></div></div></details>';
 return h;}
 function docRefs(){if(restricted()||!model(DOC))return '';
 var L=rows().filter(function(x){return x.confirmada==='Sim'&&S(x.classes);}),docs=currentDocs();
 L=L.filter(function(x){var d=docs.find(function(d){return String(d.id)===x.id;});return !d||!restricted(d);});
 if(!L.length)return '<details class="gg"><summary><h4>Documentos classificados</h4></summary><p class="muted">Classifique as peças em Autos para orientar o relatório e a fundamentação.</p></details>';
 var groups=[['Relatório',['Principal','Relatável']],['Fundamentação',['Comprobatório','Fundamentável','Precedente']],['Admissibilidade',['Admissibilidade']],['Sucumbência',['Consectários']]];
 return '<details class="gg"><summary><h4>Documentos classificados</h4><span class="gn">'+L.length+'</span></summary>'+groups.map(function(g){var R=L.filter(function(x){return String(x.classes).split(';').some(function(c){return g[1].indexOf(S(c))>=0;});});if(!R.length)return '';return '<h4 class="pm-mer-h">'+esc(g[0])+'</h4>'+R.map(function(x){return '<div class="plus-row"><b>'+esc(x.tipo||'Documento')+'</b> '+b('doc-open',x.id,'ID '+x.id)+(x.sintese?'<p>'+esc(String(x.sintese).slice(0,300))+'</p>':'')+'</div>';}).join('');}).join('')+'</details>';}
 var baseProd=camposCaso;
 camposCaso=function(ja){var h=baseProd(ja),c=model(RES);if(!h||!c)return h;return h.replace(/<\/section>$/, '<details class="gg"><summary><h4>Resultado individualizado por recurso</h4></summary><div class="gr">'+campo(c)+'</div></details>'+indicatorHtml()+docRefs()+'</section>');};
 var baseMer=merEnc;merEnc=function(){var h=baseMer();if(!G.merAb||location.pathname.endsWith('/universal.html'))return h;
 return h.replace(/<\/details>$/, '<div class="gr">'+campoRot('triagem','Ramo do direito')+campoRot('triagem','Outros assuntos')+'</div></details>');};
 var baseRender=render0;render0=function(){if(docCnj!==G.cnj){docCnj=G.cnj;docFilter='Todos';}baseRender();};
 pane.addEventListener('input',function(e){var t=e.target,w=t.closest&&t.closest('[data-plus-table],[data-plus-doc]');if(!w)return;
 if(t.dataset.plusCol){var d=tableDraft[key(w.dataset.plusTable)];if(d&&d[Number(t.dataset.plusIndex)])d[Number(t.dataset.plusIndex)][t.dataset.plusCol]=t.value;}
 if(t.dataset.plusDocCol){var d2=docDraft[key(w.dataset.plusDoc)];if(d2)d2[t.dataset.plusDocCol]=t.value;}},true);
 pane.addEventListener('change',function(e){var t=e.target;if(t.dataset.plusCol||t.dataset.plusDocCol)t.dispatchEvent(new Event('input',{bubbles:true}));},true);
 pane.addEventListener('click',function(e){var x=e.target.closest&&e.target.closest('[data-plus]');if(!x)return;e.preventDefault();e.stopImmediatePropagation();
 var act=x.dataset.plus,id=x.dataset.plusId,k=key(id),d,idx;
 if(act==='suc-open'){G.aba='Autos';G.pecAb=G.pecAb||{};G.pecAb['Sucumbência da decisão recorrida']=true;if(window.MutaAutos)window.MutaAutos.estado().filtro='pecas';docFilter='Todos';render();var el=Array.from(pane.querySelectorAll('details[data-grupo]')).find(function(e){return e.dataset.grupo==='Sucumbência da decisão recorrida';});if(el){el.open=true;el.scrollIntoView({block:'start'});}return;}
 if(act==='doc-open'){G.aba='Autos';docFilter='Todos';if(window.MutaAutos)window.MutaAutos.estado().filtro='todos';render();var d=Array.from(pane.querySelectorAll('[data-au-it]')).find(function(x){return x.dataset.auIt===id;});if(d){var w=d.closest('.au-doc')||d;w.scrollIntoView({block:'start'});}else{var a=$('g-docs');if(a)a.scrollIntoView({block:'start'});}return;}
 if(act==='filter'){docFilter=id;if(window.MutaAutos&&id!=='Todos')window.MutaAutos.estado().filtro='todos';render();return;}
 if(blocked())return;
 if(act==='table-edit'){if(!model(id)||!editavel(model(id)))return;tableDraft[k]=list(val(id)).map(function(r){return Object.assign({},r);});if(!tableDraft[k].length)tableDraft[k].push({});}
 else if(act==='table-remove'){idx=Number(id.split('|').pop());id=id.slice(0,id.lastIndexOf('|'));d=tableDraft[key(id)];if(d)d.splice(idx,1);}
 else if(act==='table-add'){d=tableDraft[k];if(d&&d.length<60)d.push({});}
 else if(act==='table-cancel')delete tableDraft[k];
 else if(act==='table-save'){d=tableDraft[k];if(!d||!model(id)||!editavel(model(id)))return;if(d.length>60){st('Limite de 60 linhas por tabela. Nenhum registro foi alterado.','err');return;}marcar(id,d.filter(function(r){return Object.values(r).some(function(v){return S(v);});}));delete tableDraft[k];agendar(400);}
 else if(act.indexOf('doc-')===0){var doc=currentDocs().find(function(z){return String(z.id)===id;});if(!doc||restricted(doc))return;
 if(act==='doc-edit'){if(docDraft[k])delete docDraft[k];else{var z=classified(doc);docDraft[k]=Object.assign({id:id,tipo:doc.tipo,data:doc.data,classes:z.classes.join('; ')},z.row||{});}}
 else if(act==='doc-cancel')delete docDraft[k];
 else if(act==='doc-tag'){d=docDraft[k];if(!d)return;var L=String(d.classes||'').split(';').map(S).filter(Boolean),cat=x.dataset.plusCat;if(L.indexOf(cat)>=0)L=L.filter(function(t){return t!==cat;});else {if(cat==='Principal')L=L.filter(function(t){return t!=='Relatável';});if(cat==='Relatável')L=L.filter(function(t){return t!=='Principal';});if(cat==='Dispensável')L=[];else L=L.filter(function(t){return t!=='Dispensável';});if(L.length>=2){st('Selecione no máximo duas classificações por documento. Retire uma antes de incluir outra.','err');return;}L.push(cat);}d.classes=A.classesValidas(L).join('; ');}
 else if(act==='doc-save'){d=docDraft[k];if(!d)return;d.classes=A.classesValidas(d.classes).join('; ');d.origem='Manual / confirmada';d.confirmada='Sim';marcar(DOC,A.mesclar(G.pend[DOC],[d]));delete docDraft[k];agendar(400);}
 }render();
 },true);
})();

aplicarModo();
})();
