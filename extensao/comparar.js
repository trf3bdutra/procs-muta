/* Muta · aba Comparar
   Compara o texto do editor da minuta no PJe (ou um texto colado) com:
   - a minuta do processo registrada nos lotes do Amicus Curiae · Collectio;
   - os modelos do banco do gabinete (sugeridos pela semelhança com o editor);
   - as minutas-matriz por recurso e resultado;
   - a matriz modular do 28,86% (minuta-base de cada grupo) e os acórdãos-modelo na íntegra;
   - os parágrafos-padrão do gabinete (quais aparecem no editor e com que diferenças);
   - os precedentes do Ementário (vinculados ao prontuário ou abertos no Ementário);
   - qualquer texto colado.
   Riscado: está na fonte e falta no editor. Verde: está só no editor. Amarelo: o editor preenche uma vaga do modelo. */
(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
var CX = window.MutaComparador, FT = window.MutaFontes, ED = window.MutaEditor, br = window.MutaProntuarioBridge, esc = CX.esc;
var caixa = $('cmp-app');
var FONTES = [['lote', 'Lote'], ['modelo', 'Modelos'], ['matriz', 'Minuta-matriz'], ['m2886', '28,86%'], ['par', 'Parágrafos-padrão'], ['ement', 'Ementário'], ['colar', 'Texto colado']];
var PARTES = [['tudo', 'Tudo'], ['relatorio', 'Relatório'], ['voto', 'Voto'], ['ementa', 'Ementa'], ['acordao', 'Acórdão']];
var C = { fonte: 'lote', sel: {}, parteEd: 'tudo', parteFonte: 'inteira', ws: true, sd: true, q: '', ref: '', lotes: null, loteErro: '', loteChave: '', ement: {}, dados: null, dadosErro: '', ranking: null, rankTxt: '' };
try { var g = JSON.parse(localStorage.getItem('muta-pje:comparar') || '{}'); ['fonte', 'parteEd', 'ws', 'sd'].forEach(function (k) { if (g[k] != null) C[k] = g[k]; }); } catch (e) {}
function guarda() { try { localStorage.setItem('muta-pje:comparar', JSON.stringify({ fonte: C.fonte, parteEd: C.parteEd, ws: C.ws, sd: C.sd })); } catch (e) {} }
function aberta() { var p = $('panel-cmp'); return p && !p.hidden; }
function chave() { var k = br.chaveAtual(); return k && k !== 'avulso' ? k : ''; }

/* ---------- editor ---------- */
function paragrafosEditor() {
  var E = ED.estado(), P = CX.partes(E.paragrafos || []);
  /* "Tudo": a minuta sem o cabeçalho do documento (tribunal, número, partes), quando o editor tem as partes da peça */
  if (C.parteEd === 'tudo' || !P.achou) return (P.achou ? ['relatorio', 'voto', 'ementa', 'acordao'] : ['cabecalho']).reduce(function (a, k) { return a.concat(P[k].map(function (p) { return p.t; })); }, []);
  return (P[C.parteEd] || []).map(function (p) { return p.t; });
}
function editorHtml() {
  var E = ED.estado(), n = E.texto ? E.texto.split(/\s+/).length : 0, P = CX.partes(E.paragrafos || []);
  var aviso = E.numero && chave() && E.numero.replace(/\D/g, '') !== chave() ? '<p class="status err">O editor lido está nos autos ' + esc(E.numero) + ', não no processo aberto no painel.</p>' : '';
  return '<div class="cx-ed card"><div class="cx-ed-h"><b>Editor do PJe</b><span class="muted">' + (E.lendo ? 'Lendo…' : E.texto ? esc(E.fonte) + ' · ' + n.toLocaleString('pt-BR') + ' palavras' + (E.em ? ' · ' + new Date(E.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '') : 'nada lido ainda') + '</span></div>' +
    '<div class="bar"><button type="button" class="btn solid" data-c="ler"' + (E.lendo ? ' disabled' : '') + '>' + (E.texto && !E.colado ? 'Ler de novo' : 'Ler o editor do PJe') + '</button>' +
    '<label class="cx-sel">Parte do editor <select data-c="parteEd">' + PARTES.map(function (p) { var q = p[0] === 'tudo' ? 1 : (P[p[0]] || []).length; return '<option value="' + p[0] + '"' + (C.parteEd === p[0] ? ' selected' : '') + (q ? '' : ' disabled') + '>' + p[1] + (p[0] !== 'tudo' && q ? ' · ' + q : '') + '</option>'; }).join('') + '</select></label></div>' +
    (E.erro ? '<p class="status err">' + esc(E.erro) + '</p>' : '') + aviso +
    '<details class="cp-colar"' + (E.colado ? ' open' : '') + '><summary>Colar o texto do editor em vez de ler</summary><textarea data-c="colarEd" placeholder="Cole aqui a minuta do editor do PJe">' + (E.colado ? esc(E.texto) : '') + '</textarea></details></div>';
}

/* ---------- fontes ---------- */
function dados() {
  if (C.dados || C.dadosErro) return Promise.resolve(C.dados);
  return FT.base().then(function (d) { C.dados = d; return d; }, function (e) { C.dadosErro = 'Não foi possível baixar os modelos do gabinete: ' + e.message; return null; });
}
function lotes() {
  var k = chave();
  if (!k) return Promise.resolve([]);
  if (C.lotes && C.loteChave === k) return Promise.resolve(C.lotes);
  if (!window.MutaLote || !window.MutaLote.minutasDoProcesso) return Promise.resolve([]);
  if (window.MutaSessao.estado().estado !== 'on') { C.loteErro = 'Entre no Ex Officio (Prontuário › Ficha do gabinete) para ler os lotes.'; return Promise.resolve([]); }
  C.loteErro = '';
  return window.MutaLote.minutasDoProcesso(k).then(function (L) { C.lotes = L; C.loteChave = k; return L; }, function (e) { C.loteErro = e.message; C.lotes = []; C.loteChave = k; return []; });
}
/* semelhança de cada candidato com o editor (para sugerir e ordenar) */
function textoItem(it) { return (it.secoes || []).map(function (s) { return (s.ps || []).join(' '); }).join(' '); }
function ranquear(lista) {
  var tx = (ED.estado().texto || '');
  if (!tx) return lista.map(function (x) { return { x: x, s: 0 }; });
  var W = CX.palavras(tx);
  return lista.map(function (x) { if (!x._w) x._w = CX.palavras(textoItem(x) || x.texto || ''); return { x: x, s: CX.semelhanca(x._w, W) }; }).sort(function (a, b) { return b.s - a.s; });
}
function filtra(lista, campos) {
  var q = String(C.q || '').trim(); if (!q) return lista;
  var t = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/);
  return lista.filter(function (x) { var h = campos.map(function (c) { return x[c] || ''; }).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return t.every(function (w) { return h.indexOf(w) >= 0; }); });
}
function itemAtual() {
  var d = C.dados, s = C.sel[C.fonte];
  if (C.fonte === 'lote') return (C.lotes || []).filter(function (x) { return x.id === s; })[0] || (C.lotes || [])[0] || null;
  if (C.fonte === 'colar') return C.ref.trim() ? { rotulo: 'Texto colado', secoes: [{ t: 'Texto colado', ps: FT.porLinhas(C.ref) }] } : null;
  if (C.fonte === 'ement') { var e = C.ement[s]; return e && !e.erro ? e : null; }
  if (!d) return null;
  if (C.fonte === 'modelo') return d.modelos.filter(function (x) { return x.id === s; })[0] || null;
  if (C.fonte === 'matriz') return d.matrizes.filter(function (x) { return x.id === s; })[0] || null;
  if (C.fonte === 'm2886') {
    if (/^g:/.test(s || '')) { var g = d.m2886.grupos.filter(function (x) { return 'g:' + x.id === s; })[0]; return g ? { rotulo: 'Matriz 28,86% · grupo ' + g.id + ' · ' + g.nome, secoes: g.secoes } : null; }
    if (/^k:/.test(s || '')) { var k = d.kit2886.filter(function (x) { return 'k:' + x.codigo === s; })[0]; return k ? { rotulo: 'Acórdão-modelo ' + k.codigo + ' · ' + k.ref, secoes: FT.secoesDeTexto(k.texto) } : null; }
  }
  return null;
}
function itens(lista, rot, sub, val, atual) {
  return '<div class="cx-lista">' + lista.map(function (z) {
    var x = z.x || z, v = val(x);
    return '<button type="button" class="cx-it' + (v === atual ? ' sel' : '') + '" data-s="' + esc(v) + '"><b>' + esc(rot(x)) + '</b><small>' + esc(sub(x)) + (z.s ? ' · ' + Math.round(100 * z.s) + '% de palavras em comum com o editor' : '') + '</small></button>';
  }).join('') + '</div>';
}
function seletor() {
  var d = C.dados, s = C.sel[C.fonte], h = '';
  var busca = '<input type="search" class="cx-q" data-c="q" placeholder="Filtrar pelo nome, assunto ou classe" value="' + esc(C.q) + '">';
  if (C.fonte === 'lote') {
    if (!chave()) return '<p class="muted">Abra os autos no PJe (ou um prontuário com número) para ver a minuta do lote.</p>';
    if (C.lotes == null) return '<p class="muted">Procurando o processo nos lotes…</p>';
    if (C.loteErro) return '<p class="status err">' + esc(C.loteErro) + '</p>';
    if (!C.lotes.length) return '<p class="muted">' + esc(Muta.formatarCnj(chave())) + ' não está em nenhum lote visível à equipe.</p>';
    return itens(C.lotes, function (x) { return x.rotulo; }, function (x) { return x.erro || (x.atualizado ? 'minuta de ' + x.atualizado.slice(0, 10).split('-').reverse().join('/') : 'minuta do lote'); }, function (x) { return x.id; }, s || C.lotes[0].id);
  }
  if (C.fonte === 'colar') return '<textarea class="cx-ref" data-c="ref" placeholder="Cole aqui o texto de referência (outra minuta, voto-paradigma, decisão de origem…)">' + esc(C.ref) + '</textarea>';
  if (C.fonte === 'ement') {
    var vs = br.getLinks ? br.getLinks() : [];
    h = '<p class="muted">Precedentes vinculados ao prontuário. No Ementário, qualquer julgado tem o botão <b>Comparar com o editor</b>.</p>';
    var ids = vs.map(function (v) { return { x: { id: v.id, n: v.n, cl: v.cl, d: v.d } }; });
    Object.keys(C.ement).forEach(function (id) { if (!vs.some(function (v) { return v.id === id; }) && C.ement[id].rotulo) ids.unshift({ x: { id: id, n: C.ement[id].rotulo, cl: 'aberto pelo Ementário', d: '' } }); });
    return h + (ids.length ? itens(ids, function (x) { return [x.cl, x.n].filter(Boolean).join(' '); }, function (x) { return x.d || ''; }, function (x) { return x.id; }, s) : '<div class="empty">Nenhum precedente vinculado. Abra o Ementário, pesquise e use Comparar com o editor.</div>') +
      (s && C.ement[s] && C.ement[s].erro ? '<p class="status err">' + esc(C.ement[s].erro) + '</p>' : '');
  }
  if (C.dadosErro) return '<p class="status err">' + esc(C.dadosErro) + '</p>';
  if (!d) return '<p class="muted">Baixando os modelos do gabinete…</p>';
  if (C.fonte === 'modelo') {
    var L = ranquear(filtra(d.modelos, ['nome', 'assunto', 'classe', 'tags', 'pron'])).slice(0, C.q ? 40 : 12);
    return busca + '<p class="muted">' + (C.q ? 'Modelos com “' + esc(C.q) + '”' : 'Modelos mais parecidos com o texto do editor') + ' · ' + d.modelos.length + ' no banco.</p>' +
      itens(L, function (x) { return x.nome; }, function (x) { return [x.pron, x.classe, x.assunto].filter(Boolean).join(' · '); }, function (x) { return x.id; }, s);
  }
  if (C.fonte === 'matriz') {
    var res = window.MutaConformidadeMotor ? window.MutaConformidadeMotor.resultadoDe(paragrafosEditor().filter(function (t) { return /^Ante o exposto,/.test(t); }).join(' ')) : '';
    var M = ranquear(filtra(d.matrizes, ['nome', 'classe', 'resultado']));
    if (res) M.sort(function (a, b) { return (casa(b.x, res) - casa(a.x, res)) || (b.s - a.s); });
    return busca + (res ? '<p class="muted">O dispositivo do editor indica ' + esc(window.MutaConformidadeMotor.RES_TXT[res]) + ': as matrizes desse resultado vêm primeiro.</p>' : '') +
      itens(M, function (x) { return x.nome; }, function (x) { return [x.pron, x.classe, x.resultado].filter(Boolean).join(' · '); }, function (x) { return x.id; }, s);
  }
  if (C.fonte === 'm2886') {
    var G = d.m2886.grupos.map(function (g) { return { id: 'g:' + g.id, nome: 'Grupo ' + g.id + ' · ' + g.nome, sub: 'minuta-base da matriz modular · ' + g.resJulg, secoes: g.secoes }; });
    var K = d.kit2886.map(function (k) { return { id: 'k:' + k.codigo, nome: 'Acórdão-modelo ' + k.codigo, sub: k.ref, texto: k.texto }; });
    return '<p class="muted">Matriz modular: o texto é do gabinete; só as vagas {{ }} se preenchem. Os acórdãos-modelo são os julgados de referência de cada código.</p>' +
      '<p class="kicker">Grupos da matriz</p>' + itens(ranquear(G), function (x) { return x.nome; }, function (x) { return x.sub; }, function (x) { return x.id; }, s) +
      '<p class="kicker">Acórdãos-modelo</p>' + itens(ranquear(K), function (x) { return x.nome; }, function (x) { return x.sub; }, function (x) { return x.id; }, s);
  }
  return '';
}
function casa(m, res) {
  var t = String(m.resultado || m.nome || '').toLowerCase();
  var map = { provido: /provimento$|\bprovimento\b(?!.*parcial)/, parcial: /parcial/, desprovido: /desprovimento/, naoconhecido: /n[ãa]o\s*conhec|naoconhec/, prejudicado: /prejudic/, rejeitados: /rejei/, acolhidos: /acolhim/ };
  return map[res] && map[res].test(t) ? 1 : 0;
}

/* ---------- comparação ---------- */
function blocosFonte(it) {
  if (!it) return [];
  var secs = it.secoes || [];
  if (C.parteFonte !== 'inteira') secs = secs.filter(function (s) { return s.t === C.parteFonte; });
  return FT.blocos(secs);
}
function partesFonte(it) { return (it && it.secoes || []).map(function (s) { return s.t; }).filter(function (t, i, a) { return a.indexOf(t) === i; }); }
function resultadoHtml() {
  var E = ED.estado();
  if (!E.texto) return '<p class="none">Leia o editor do PJe (ou cole o texto) para comparar.</p>';
  if (C.fonte === 'par') return paragrafosPadrao();
  var it = itemAtual();
  if (!it) return '<p class="none">Escolha a fonte da comparação.</p>';
  if (it.erro) return '<p class="status err">' + esc(it.erro) + '</p>';
  var r = CX.comparar(blocosFonte(it), paragrafosEditor(), { ws: C.ws, sd: C.sd });
  if (r.erro) return '<p class="status err">' + esc(r.erro) + '</p>';
  var pf = partesFonte(it);
  var cab = '<div class="cx-res-h"><b>' + esc(it.rotulo || it.nome || '') + '</b>' +
    (pf.length > 1 ? '<label class="cx-sel">Parte da fonte <select data-c="parteFonte"><option value="inteira">Inteira</option>' + pf.map(function (t) { return '<option' + (C.parteFonte === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></label>' : '') + '</div>';
  var st = (r.npar ? r.npar + ' parágrafo' + (r.npar > 1 ? 's' : '') + ' com diferença' : 'Sem diferenças') + ' · ' + r.pct + '% igual' + (r.vagas ? ' · ' + r.vagas + ' vaga(s) do modelo preenchida(s)' : '') +
    (r.faltam.length ? ' · ' + r.faltam.length + ' parágrafo(s) da fonte ausentes no editor' : '') + (r.sobram.length ? ' · ' + r.sobram.length + ' só no editor' : '');
  return cab + '<p class="status" role="status">' + st + '</p><div class="cx-out">' + r.html + '</div>';
}
/* parágrafos-padrão presentes no editor: para cada parágrafo do editor, o padrão mais parecido (a partir de 45%) */
function paragrafosPadrao() {
  var d = C.dados;
  if (C.dadosErro) return '<p class="status err">' + esc(C.dadosErro) + '</p>';
  if (!d) return '<p class="muted">Baixando os parágrafos-padrão…</p>';
  var PE = paragrafosEditor(), out = [], usados = {};
  d.paragrafos.forEach(function (p) { if (!p._w) p._w = CX.palavras(p.texto); });
  PE.forEach(function (t, i) {
    if (t.split(/\s+/).length < 6) return;
    var W = CX.palavras(t), best = null, bs = 0;
    d.paragrafos.forEach(function (p) { var s = CX.semelhanca(p._w, W); if (s > bs) { bs = s; best = p; } });
    if (best && bs >= 0.45) { out.push({ i: i, t: t, p: best, s: bs }); usados[best.id] = 1; }
  });
  if (!out.length) return '<p class="none">Nenhum parágrafo do editor corresponde a parágrafo-padrão do gabinete (a partir de 45% de palavras em comum).</p>';
  return '<p class="status">' + out.length + ' parágrafo(s) do editor seguem parágrafos-padrão do gabinete. Riscado: texto do padrão que o editor não traz; verde: o que o editor acrescenta ou troca.</p>' +
    out.map(function (o) {
      var dif = CX.difPal(o.p.texto, o.t, C.ws);
      return '<div class="cx-pp"><p class="kicker">' + esc(o.p.cat) + ' · ' + esc(o.p.titulo) + ' · ' + Math.round(100 * o.s) + '%</p><p>' + dif.h + '</p></div>';
    }).join('');
}

/* ---------- desenho ---------- */
function render() {
  if (!caixa || !aberta()) return;
  var y = $('panel-cmp').scrollTop, foco = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.c : null;
  caixa.innerHTML = editorHtml() +
    '<div class="seg cx-fontes" role="tablist" aria-label="Comparar com">' + FONTES.map(function (f) { return '<button type="button" role="tab" data-f="' + f[0] + '" aria-selected="' + (C.fonte === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</div>' +
    '<div class="cx-pick">' + seletor() + '</div>' +
    '<div class="bar cp-opc"><label><input type="checkbox" data-c="ws"' + (C.ws ? ' checked' : '') + '> ignorar espaços, aspas e travessões</label><label><input type="checkbox" data-c="sd"' + (C.sd ? ' checked' : '') + '> só as diferenças</label></div>' +
    '<div class="cx-lg"><span><del>riscado</del> na fonte, falta no editor</span><span><ins>verde</ins> só no editor</span><span><mark class="cx-vg">amarelo</mark> preenche vaga do modelo</span></div>' +
    '<div class="cx-res">' + resultadoHtml() + '</div>';
  $('panel-cmp').scrollTop = y;
  if (foco === 'q') { var q = caixa.querySelector('[data-c=q]'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
}
function preparar() {
  if (C.fonte === 'lote') lotes().then(render);
  else if (C.fonte === 'modelo' || C.fonte === 'matriz' || C.fonte === 'm2886' || C.fonte === 'par') dados().then(render);
  else if (C.fonte === 'ement' && C.sel.ement && !C.ement[C.sel.ement]) carregarJulgado(C.sel.ement);
  render();
}
function carregarJulgado(id) {
  C.ement[id] = { rotulo: '', secoes: [] }; render();
  if (!window.MutaEmentario || !window.MutaEmentario.julgado) { C.ement[id] = { erro: 'Ementário indisponível.' }; render(); return; }
  window.MutaEmentario.julgado(id).then(function (j) {
    if (!j) { C.ement[id] = { erro: 'Julgado não encontrado na base do Ementário.' }; render(); return; }
    C.ement[id] = { rotulo: j.rotulo, secoes: [{ t: 'Ementa', ps: FT.porLinhas(j.ementa) }].concat(j.inteiro ? FT.secoesDeTexto(j.inteiro).map(function (s) { s.t = s.t === 'Texto' ? 'Inteiro teor' : s.t; return s; }) : []) };
    render();
  }, function (e) { C.ement[id] = { erro: 'Não foi possível abrir o julgado: ' + e.message }; render(); });
}
var tq = 0;
caixa.addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.c === 'ler') { ED.ler().catch(function () {}); return; }
  if (b.dataset.f) { C.fonte = b.dataset.f; C.q = ''; C.parteFonte = 'inteira'; guarda(); preparar(); return; }
  if (b.dataset.s != null) {
    C.sel[C.fonte] = b.dataset.s; C.parteFonte = 'inteira';
    if (C.fonte === 'ement' && !C.ement[b.dataset.s]) { carregarJulgado(b.dataset.s); return; }
    render(); var r = caixa.querySelector('.cx-res'); if (r) r.scrollIntoView({ block: 'start' }); return;
  }
});
caixa.addEventListener('change', function (e) {
  var t = e.target, k = t.dataset && t.dataset.c; if (!k) return;
  if (k === 'parteEd') C.parteEd = t.value; else if (k === 'parteFonte') C.parteFonte = t.value; else if (k === 'ws') C.ws = t.checked; else if (k === 'sd') C.sd = t.checked; else return;
  guarda(); render();
});
caixa.addEventListener('input', function (e) {
  var t = e.target, k = t.dataset && t.dataset.c; if (!k) return;
  clearTimeout(tq);
  tq = setTimeout(function () {
    if (k === 'q') { C.q = t.value; render(); }
    else if (k === 'ref') { C.ref = t.value; var r = caixa.querySelector('.cx-res'); if (r) r.innerHTML = resultadoHtml(); }
    else if (k === 'colarEd') ED.colar(t.value);
  }, 350);
});
ED.ouvir(function () { if (aberta()) render(); });
document.addEventListener('muta:prontuario', function () { C.lotes = null; C.loteChave = ''; if (aberta()) preparar(); });
window.MutaComparar = {
  abrir: function () { preparar(); var E = ED.estado(); if (!E.texto && !E.lendo) ED.ler().catch(function () {}); },
  /* o Ementário manda um julgado para comparar */
  precedente: function (id) {
    C.fonte = 'ement'; C.sel.ement = id; guarda();
    if (C.ement[id] && C.ement[id].erro) delete C.ement[id];
    if (window.MutaAbas) window.MutaAbas.ir('cmp'); else window.MutaComparar.abrir();
  }
};
})();
