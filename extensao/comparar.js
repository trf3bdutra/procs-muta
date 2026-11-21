/* Muta · aba Minuta (0.11: Lote, Comparar e Conformidade numa aba só)
   No topo, o tipo de pronunciamento (sugerido pela tarefa do PJe e pelo destino do prontuário) e o texto do editor do PJe,
   minimizável, com os botões do Collectio (localizar o processo nos lotes e mandar o texto do editor para lá).
   Embaixo, "Comparar com": a minuta-matriz do tipo de julgamento (padrão: confere a estrutura, bloco a bloco), a minuta do
   Collectio (por seção), os modelos, os precedentes, o texto colado, a triagem, o 28,86% e os parágrafos-padrão.
   A conformidade fica no rodapé fixo da aba (conformidade.js). Texto original:
   compara o texto do editor da minuta no PJe (ou um texto colado) com:
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
var FONTES = [['matriz', 'Minuta-matriz'], ['lote', 'Collectio'], ['modelo', 'Modelos'], ['ement', 'Precedentes'], ['colar', 'Texto colado'], ['tri', 'Triagem'], ['m2886', '28,86%'], ['par', 'Parágrafos-padrão']];
/* tipo de pronunciamento: os mesmos rótulos do banco de modelos e das minutas-matriz */
var PRONS = [['Voto', 'Acórdão (voto)'], ['Decisão monocrática terminativa', 'Decisão monocrática'], ['Decisão interlocutória', 'Decisão interlocutória'], ['Despacho', 'Despacho']];
var PARTES = [['tudo', 'Tudo'], ['relatorio', 'Relatório'], ['voto', 'Voto'], ['ementa', 'Ementa'], ['acordao', 'Acórdão']];
var C = { pron: '', pronAuto: '', pronChave: '', edAberto: false, estrutura: true, fonte: 'matriz', sel: {}, parteEd: 'tudo', parteFonte: 'inteira', ws: true, sd: true, q: '', ref: '', lotes: null, loteErro: '', loteChave: '', ement: {}, tri: null, triErro: '', triChave: '', dados: null, dadosErro: '', ranking: null, rankTxt: '' };
try { var g = JSON.parse(localStorage.getItem('muta-pje:comparar') || '{}'); ['parteEd', 'ws', 'sd', 'edAberto'].forEach(function (k) { if (g[k] != null) C[k] = g[k]; }); } catch (e) {}
function guarda() { try { localStorage.setItem('muta-pje:comparar', JSON.stringify({ parteEd: C.parteEd, ws: C.ws, sd: C.sd, edAberto: C.edAberto })); } catch (e) {} }
function aberta() { var p = $('panel-min'); return p && !p.hidden; }
function chave() { var k = br.chaveAtual(); return k && k !== 'avulso' ? k : ''; }

/* ---------- tipo de pronunciamento: tarefa do PJe, destino do prontuário ou escolha ---------- */
function pronSugerido() {
  var t = window.MutaPje && window.MutaPje.tarefa ? N(window.MutaPje.tarefa()) : '', GB = window.MutaGabinete, dest = GB && GB.destino ? GB.destino() : '';
  var tipoAto = GB && GB.V ? N(GB.V('producao', 'Mono - Tipo de ato')) : '';
  if (/despacho/.test(t) || /^despacho/.test(tipoAto)) return 'Despacho';
  if (/interlocut|liminar|tutela|urgencia/.test(t) || /urgencia/.test(tipoAto)) return 'Decisão interlocutória';
  if (/monocrat|decisao terminativa|minutar decisao/.test(t) || dest === 'monocratica') return 'Decisão monocrática terminativa';
  if (/sessao|relatorio|voto|acordao|ementa/.test(t) || dest === 'sessao') return 'Voto';
  return 'Voto';
}
function N(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
/* troca de processo: volta ao pronunciamento sugerido e à minuta-matriz */
function processo() {
  var k = chave();
  if (k !== C.pronChave) { C.pronChave = k; C.pron = ''; C.fonte = 'matriz'; C.sel = {}; C.q = ''; }
  C.pronAuto = pronSugerido();
  return C.pron || C.pronAuto;
}
function pronHtml() {
  var p = processo();
  return '<div class="mn-pron"><span class="mn-l">Pronunciamento</span><span class="seg">' + PRONS.map(function (x) { return '<button type="button" data-pron="' + esc(x[0]) + '" aria-selected="' + (p === x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') + '</span>' +
    (C.pron && C.pron !== C.pronAuto ? '<button type="button" class="lnk" data-pron="">voltar ao sugerido</button>' : '<small class="muted">sugerido ' + (window.MutaPje && window.MutaPje.tarefa && window.MutaPje.tarefa() ? 'pela tarefa' : 'pelo destino do prontuário') + '</small>') + '</div>';
}
/* tipo de julgamento do processo (ficha), para escolher a minuta-matriz */
function tipoJulgamento() {
  var GB = window.MutaGabinete, v = GB && GB.V ? N(GB.V('triagem', 'Tipo de Julgamento')) : '', cl = N((window.MutaPje && window.MutaPje.classe && window.MutaPje.classe()) || '');
  if (/embargos/.test(v)) return 'ed';
  if (/agravo interno/.test(v)) return 'agint';
  if (/agravo de instrumento/.test(v) || /^ai$/.test(cl)) return 'ai';
  if (/remessa/.test(v) || /remnec/.test(cl)) return 'rem';
  return 'ap';
}
function classeMatriz(m) { var c = N(m.classe); return /^ed/.test(c) ? 'ed' : /^ai/.test(c) ? 'ai' : /remnec/.test(c) ? 'rem' : /agint/.test(c) ? 'agint' : 'ap'; }

/* ---------- editor ---------- */
function paragrafosEditor() {
  var E = ED.estado(), P = CX.partes(E.paragrafos || []);
  /* "Tudo": a minuta sem o cabeçalho do documento (tribunal, número, partes), quando o editor tem as partes da peça */
  if (C.parteEd === 'tudo' || !P.achou) return (P.achou ? ['relatorio', 'voto', 'ementa', 'acordao'] : ['cabecalho']).reduce(function (a, k) { return a.concat(P[k].map(function (p) { return p.t; })); }, []);
  return (P[C.parteEd] || []).map(function (p) { return p.t; });
}
function editorHtml() {
  var E = ED.estado(), n = E.texto ? E.texto.split(/\s+/).length : 0, P = CX.partes(E.paragrafos || []);
  return pronHtml() + editorCaixa(E, n, P);
}
function editorCaixa(E, n, P) {
  var aviso = E.numero && chave() && E.numero.replace(/\D/g, '') !== chave() ? '<p class="status err">O editor lido está nos autos ' + esc(E.numero) + ', não no processo aberto no painel.</p>' : '';
  var hora = E.em ? new Date(E.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  var ps = (E.paragrafos || []).map(function (p) { return p.t; }).filter(Boolean);
  return '<section class="mn-ed card" data-aberto="' + (C.edAberto ? '1' : '0') + '">' +
    '<div class="mn-ed-h"><button type="button" class="mn-tg" data-c="edtg" aria-expanded="' + C.edAberto + '"><b>Texto do editor</b><span class="muted">' + (E.lendo ? 'lendo…' : E.texto ? esc(E.fonte || 'editor') + ' · ' + n.toLocaleString('pt-BR') + ' palavras' + (hora ? ' · ' + hora : '') : 'ainda não lido') + '</span></button>' +
    '<span class="sp"></span><button type="button" class="btn ' + (E.texto ? 'line' : 'solid') + ' sm" data-c="ler"' + (E.lendo ? ' disabled' : '') + '>' + (E.texto && !E.colado ? 'Ler de novo' : 'Ler o editor') + '</button></div>' +
    '<div class="bar mn-col"><button type="button" class="btn line sm" data-c="col-loc" title="Mostra o processo nos lotes do Collectio, com as versões da minuta">Localizar no Collectio</button>' +
    '<button type="button" class="btn line sm" data-c="col-env"' + (E.texto ? '' : ' disabled') + ' title="Grava o texto do editor como nova versão da minuta do processo no lote">Mandar ao Collectio</button>' +
    '<label class="cx-sel">Parte <select data-c="parteEd">' + PARTES.map(function (p) { var q = p[0] === 'tudo' ? 1 : (P[p[0]] || []).length; return '<option value="' + p[0] + '"' + (C.parteEd === p[0] ? ' selected' : '') + (q ? '' : ' disabled') + '>' + p[1] + '</option>'; }).join('') + '</select></label></div>' +
    (E.erro ? '<p class="status err">' + esc(E.erro) + '</p>' : '') + aviso +
    (C.edAberto ? '<div class="mn-tx">' + (ps.length ? ps.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') : '<p class="muted">Abra a tarefa da minuta no PJe e clique em Ler o editor.</p>') + '</div>' +
      '<details class="cp-colar"' + (E.colado ? ' open' : '') + '><summary>Colar o texto em vez de ler</summary><textarea data-c="colarEd" placeholder="Cole aqui a minuta do editor do PJe">' + (E.colado ? esc(E.texto) : '') + '</textarea></details>' : '') +
    '</section>';
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
/* fonte Triagem: proposta, modelo e precedentes citados no registro da triagem (ficha do processo) */
function triagem() {
  var k = chave();
  if (!k) return Promise.resolve([]);
  if (C.tri && C.triChave === k) return Promise.resolve(C.tri);
  if (!window.MutaTriagem) { C.triErro = 'Aba Triagem indisponível.'; C.tri = []; return Promise.resolve([]); }
  if (window.MutaSessao.estado().estado !== 'on') { C.triErro = 'Entre no Ex Officio para ler a triagem.'; C.tri = []; C.triChave = k; return Promise.resolve([]); }
  C.triErro = ''; C.tri = null;
  return window.MutaTriagem.garantir().then(function () {
    var D = window.MutaTriagem.dados(), L = [];
    if (D.proposta) L.push({ id: 'p', rotulo: 'Proposta da triagem', sub: 'ato a proferir e proposta pelos precedentes', secoes: [{ t: 'Proposta', ps: FT.porLinhas(D.proposta.replace(/\s*‖\s*/g, '\n').replace(/\s*\[VALIDAR: [^\]]+\]/g, '')) }] });
    if (D.modelo || D.grupo) L.push({ id: 'g', rotulo: 'Grupo e modelo da matriz', sub: 'resultado e modelo do grupo da triagem', secoes: [{ t: 'Grupo', ps: FT.porLinhas([D.grupo, D.modelo].filter(Boolean).join('\n')) }] });
    var E = window.MutaEmentario;
    if (!D.precedentes.length || !E || !E.porNumero) { C.tri = L; C.triChave = k; return L; }
    return Promise.all(D.precedentes.map(function (n) { return E.porNumero(n).catch(function () { return []; }); })).then(function (R) {
      R.forEach(function (lst, i) {
        if (!lst.length) L.push({ id: 'x:' + D.precedentes[i], rotulo: 'Precedente ' + D.precedentes[i], sub: 'citado na triagem; não está no Ementário', secoes: [] });
        lst.slice(0, 3).forEach(function (j) { L.push({ id: 'e:' + j.id, ement: j.id, rotulo: j.rotulo, sub: 'precedente citado na triagem · Ementário' }); });
      });
      C.tri = L; C.triChave = k; return L;
    });
  }).catch(function (e) { C.triErro = 'Não li a triagem: ' + e.message; C.tri = []; C.triChave = k; return []; });
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
  if (C.fonte === 'tri') { var L = (C.tri || []), x = L.filter(function (y) { return y.id === s; })[0] || L[0]; if (x && x.ement) { var j = C.ement[x.ement]; return j && !j.erro && j.secoes && j.secoes.length ? j : null; } return x || null; }
  if (!d) return null;
  if (C.fonte === 'modelo') return d.modelos.filter(function (x) { return x.id === s; })[0] || null;
  if (C.fonte === 'matriz') { if (!s) { var M0 = matrizesOrdenadas(); s = C.sel.matriz = M0.length ? M0[0].x.id : ''; } return d.matrizes.filter(function (x) { return x.id === s; })[0] || null; }
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
  if (C.fonte === 'tri') {
    if (!chave()) return '<p class="muted">Abra os autos no PJe para comparar com a triagem do processo.</p>';
    if (C.tri == null) return '<p class="muted">Lendo a triagem do processo…</p>';
    if (C.triErro) return '<p class="status err">' + esc(C.triErro) + '</p>';
    if (!C.tri.length) return '<div class="empty">Sem proposta, modelo ou precedente registrados na triagem deste processo.</div>';
    var s0 = s || C.tri[0].id;
    return '<p class="muted">Da triagem do processo (Caput): a proposta, o modelo do grupo e os precedentes citados, abertos pelo Ementário.</p>' +
      itens(C.tri, function (x) { return x.rotulo; }, function (x) { return x.sub || ''; }, function (x) { return x.id; }, s0) +
      (s0 && /^e:/.test(s0) && C.ement[s0.slice(2)] && C.ement[s0.slice(2)].erro ? '<p class="status err">' + esc(C.ement[s0.slice(2)].erro) + '</p>' : '');
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
    var M = matrizesOrdenadas(), res = resEditor();
    if (!s && M.length) { s = C.sel.matriz = M[0].x.id; }
    return busca + '<p class="muted">Matrizes de ' + esc((PRONS.filter(function (x) { return x[0] === processo(); })[0] || [])[1] || processo()) + ' primeiro' + (res ? '; o dispositivo do editor indica ' + esc(window.MutaConformidadeMotor.RES_TXT[res]) : '') + '. A comparação confere a estrutura: os blocos da matriz e as vagas preenchidas.</p>' +
      itens(M.slice(0, C.q ? 40 : 8), function (x) { return x.nome; }, function (x) { return [x.pron, x.classe, x.resultado].filter(Boolean).join(' · '); }, function (x) { return x.id; }, s);
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
function resEditor() { return window.MutaConformidadeMotor ? window.MutaConformidadeMotor.resultadoDe(paragrafosEditor().filter(function (t) { return /^Ante o exposto,/.test(t); }).join(' ')) : ''; }
/* minutas-matriz: do pronunciamento escolhido e do tipo de julgamento do processo primeiro; depois o resultado do editor e a semelhança */
function matrizesOrdenadas() {
  var d = C.dados; if (!d) return [];
  var p = processo(), tj = tipoJulgamento(), res = resEditor();
  return ranquear(filtra(d.matrizes, ['nome', 'classe', 'resultado'])).map(function (z) {
    z.k = (z.x.pron === p ? 4 : 0) + (classeMatriz(z.x) === tj ? 2 : 0) + (res && casa(z.x, res) ? 1 : 0); return z;
  }).sort(function (a, b) { return (b.k - a.k) || (b.s - a.s); });
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
  var est = C.fonte === 'matriz' ? estruturaHtml(it) : '';
  var r = CX.comparar(blocosFonte(it), paragrafosEditor(), { ws: C.ws, sd: C.sd });
  if (r.erro) return '<p class="status err">' + esc(r.erro) + '</p>';
  var pf = partesFonte(it);
  var cab = '<div class="cx-res-h"><b>' + esc(it.rotulo || it.nome || '') + '</b>' +
    (pf.length > 1 ? '<label class="cx-sel">Parte da fonte <select data-c="parteFonte"><option value="inteira">Inteira</option>' + pf.map(function (t) { return '<option' + (C.parteFonte === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></label>' : '') + '</div>';
  var st = (r.npar ? r.npar + ' parágrafo' + (r.npar > 1 ? 's' : '') + ' com diferença' : 'Sem diferenças') + ' · ' + r.pct + '% igual' + (r.vagas ? ' · ' + r.vagas + ' vaga(s) do modelo preenchida(s)' : '') +
    (r.faltam.length ? ' · ' + r.faltam.length + ' parágrafo(s) da fonte ausentes no editor' : '') + (r.sobram.length ? ' · ' + r.sobram.length + ' só no editor' : '');
  if (est) return cab + est + '<details class="mn-dif"><summary>Texto lado a lado com a matriz · ' + esc(st) + '</summary><div class="cx-out">' + r.html + '</div></details>';
  return cab + '<p class="status" role="status">' + st + '</p><div class="cx-out">' + r.html + '</div>';
}
/* estrutura: cada bloco da matriz (por seção) e se o editor tem um parágrafo correspondente */
function estruturaHtml(it) {
  var PE = paragrafosEditor(); if (!PE.length) return '';
  var W = PE.map(function (t) { return CX.palavras(t); }), tot = 0, ok = 0;
  var secs = (it.secoes || []).map(function (s) {
    var linhas = (s.ps || []).filter(function (p) { return String(p || '').trim(); }).map(function (p) {
      var vaga = /^\s*(\{\{[^}]*\}\}\s*)+$/.test(p) || /^\s*\[[^\]]*\]\s*$/.test(p);
      if (vaga) return '<li class="vg"><i>vaga</i><span>' + esc(p.replace(/[{}]/g, '').slice(0, 140)) + '</span></li>';
      var w = CX.palavras(p), b = 0; W.forEach(function (x) { var v = CX.semelhanca(w, x); if (v > b) b = v; });
      tot++; var cls = b >= 0.45 ? 'ok' : b >= 0.25 ? 'pa' : 'no'; if (cls === 'ok') ok++;
      return '<li class="' + cls + '"><i>' + (cls === 'ok' ? '✓' : cls === 'pa' ? '≈' : '✗') + '</i><span>' + esc(p.replace(/\{\{([^}]*)\}\}/g, '[$1]').slice(0, 160)) + '</span></li>';
    }).join('');
    return linhas ? '<div class="mn-es"><p class="kicker">' + esc(s.t) + '</p><ul>' + linhas + '</ul></div>' : '';
  }).join('');
  return '<p class="status">Estrutura: ' + ok + ' de ' + tot + ' bloco(s) da matriz no editor (✓ presente · ≈ parecido · ✗ ausente). As vagas são o texto do caso.</p><div class="mn-est">' + secs + '</div>';
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
  var y = $('panel-min').scrollTop, foco = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.c : null;
  caixa.innerHTML = editorHtml() +
    '<div class="seg cx-fontes" role="tablist" aria-label="Comparar com">' + FONTES.map(function (f) { return '<button type="button" role="tab" data-f="' + f[0] + '" aria-selected="' + (C.fonte === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</div>' +
    '<div class="cx-pick">' + seletor() + '</div>' +
    '<div class="bar cp-opc"><label><input type="checkbox" data-c="ws"' + (C.ws ? ' checked' : '') + '> ignorar espaços, aspas e travessões</label><label><input type="checkbox" data-c="sd"' + (C.sd ? ' checked' : '') + '> só as diferenças</label></div>' +
    '<div class="cx-lg"><span><del>riscado</del> na fonte, falta no editor</span><span><ins>verde</ins> só no editor</span><span><mark class="cx-vg">amarelo</mark> preenche vaga do modelo</span></div>' +
    '<div class="cx-res">' + resultadoHtml() + '</div>';
  $('panel-min').scrollTop = y;
  if (foco === 'q') { var q = caixa.querySelector('[data-c=q]'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
}
function preparar() {
  if (C.fonte === 'tri') triagem().then(render);
  else if (C.fonte === 'lote') lotes().then(render);
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
  if (b.dataset.pron != null) { C.pron = b.dataset.pron; C.sel.matriz = ''; render(); return; }
  if (b.dataset.c === 'edtg') { C.edAberto = !C.edAberto; guarda(); render(); return; }
  if (b.dataset.c === 'col-loc') { var d = $('panel-lote'); if (d) { d.open = true; if (window.MutaLote) window.MutaLote.abrir(); d.scrollIntoView({ block: 'start' }); } return; }
  if (b.dataset.c === 'col-env') { if (window.MutaLote && window.MutaLote.transferir) window.MutaLote.transferir(); return; }
  if (b.dataset.f) { C.fonte = b.dataset.f; C.q = ''; C.parteFonte = 'inteira'; guarda(); preparar(); return; }
  if (b.dataset.s != null) {
    C.sel[C.fonte] = b.dataset.s; C.parteFonte = 'inteira';
    if (C.fonte === 'ement' && !C.ement[b.dataset.s]) { carregarJulgado(b.dataset.s); return; }
    if (C.fonte === 'tri' && /^e:/.test(b.dataset.s) && !C.ement[b.dataset.s.slice(2)]) { carregarJulgado(b.dataset.s.slice(2)); return; }
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
document.addEventListener('muta:prontuario', function () { C.lotes = null; C.loteChave = ''; C.tri = null; C.triChave = ''; if (aberta()) preparar(); });
window.MutaComparar = {
  triagem: function () { processo(); C.fonte = 'tri'; C.tri = null; C.triChave = ''; guarda(); if (window.MutaAbas) window.MutaAbas.ir('min'); else window.MutaComparar.abrir(); },
  abrir: function () { processo(); if (C.fonte === 'matriz' || C.fonte === 'modelo' || C.fonte === 'm2886' || C.fonte === 'par') dados().then(render); preparar(); var E = ED.estado(); if (!E.texto && !E.lendo) ED.ler().catch(function () {}); },
  /* o Ementário manda um julgado para comparar */
  precedente: function (id) {
    processo(); C.fonte = 'ement'; C.sel.ement = id; guarda();
    if (C.ement[id] && C.ement[id].erro) delete C.ement[id];
    if (window.MutaAbas) window.MutaAbas.ir('min'); else window.MutaComparar.abrir();
  },
  pronunciamento: function () { return processo(); }
};
})();
