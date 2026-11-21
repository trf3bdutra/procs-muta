/* Muta · aba Lote (Amicus Curiae · Collectio)
   Função principal: conferir a minuta registrada no lote com a minuta que está no editor do PJe
   (tarefa [Sessão] Aguardando a sessão), com a mesma comparação do botão "Comparar" do Collectio
   (parágrafos por LCS; dentro do parágrafo, palavra a palavra; opção de ignorar espaços, aspas e travessões).
     GET /api/painel?lote=1                      lotes visíveis
     GET /api/painel?lote=1&id=<lote>            o lote (itens com o cartão do prontuário)
     GET /api/painel?lote=1&id=<lote>&minuta=X   minuta do processo (X = 10 primeiros caracteres do número)
   O texto do editor vem do conteudo-pje.js (só leitura). Sem editor detectado, dá para colar o texto.
   Também mostra o perfil do processo no lote. A gestão do lote continua no Collectio (/amicus/collectio/). */
(function () {
'use strict';
var SITE = Muta.SITE, ses = window.MutaSessao, br = window.MutaProntuarioBridge;
var $ = function (id) { return document.getElementById(id); };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function dg(v) { return String(v || '').replace(/\D/g, ''); }
function brD(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(v || ''); }
var caixa = $('lote-app');
var C = { lista: null, lotes: {}, t: 0, carregando: null, erro: '' };   /* cache por 3 minutos */
var V = { chave: '', achados: [], sel: 0, minuta: {}, tok: 0 };
var CP = { texto: '', fonte: '', colado: false, sec: 'auto', ws: true, sd: true, lendo: false, erro: '' };
var SECS = [['relatorio', 'Relatório'], ['voto', 'Voto'], ['ementa', 'Ementa'], ['acordao', 'Acórdão']];

function aberta() { var m = $('panel-min'), d = $('panel-lote'); return !!(m && !m.hidden && d && d.open); }
function api(q) { return ses.api('/api/painel?lote=1' + (q ? '&' + q : '')); }
function base(forcar) {
  if (C.carregando) return C.carregando;
  if (!forcar && C.lista && Date.now() - C.t < 180e3) return Promise.resolve();
  C.erro = '';
  C.carregando = api('').then(function (L) {
    var lotes = L.lotes || [];
    return Promise.all(lotes.map(function (l) { return api('id=' + encodeURIComponent(l.id)).then(function (R) { return R.lote; }).catch(function () { return null; }); }))
      .then(function (R) { C.lista = lotes; C.lotes = {}; R.forEach(function (x) { if (x) C.lotes[x.id] = x; }); C.t = Date.now(); });
  }).catch(function (e) { C.erro = e.status === 401 ? '' : e.message; if (e.status === 401) C.lista = null; })
    .then(function () { C.carregando = null; });
  return C.carregando;
}
function procurar(chave) {
  var out = [];
  Object.keys(C.lotes).forEach(function (id) {
    (C.lotes[id].itens || []).forEach(function (it) { if (dg(it.processo) === chave) out.push({ lote: C.lotes[id], it: it }); });
  });
  return out.sort(function (a, b) { return String(b.it.sessao).localeCompare(String(a.it.sessao)); });
}
function atualizar(forcar) {
  if (!caixa || !aberta()) return;
  var s = ses.estado();
  if (s.estado === 'verificando') { caixa.innerHTML = '<div class="empty">Verificando a sessão do Ex Officio…</div>'; return; }
  if (s.estado !== 'on') { ses.formulario(caixa, 'Entrar para ver os lotes'); return; }
  var tok = ++V.tok;
  if (!C.lista || forcar) caixa.innerHTML = '<div class="empty">Lendo os lotes do gabinete…</div>';
  base(forcar).then(function () {
    if (tok !== V.tok) return;
    var k = br.chaveAtual(), nova = (k && k !== 'avulso' ? k : '');
    if (nova !== V.chave) { CP.texto = ''; CP.fonte = ''; CP.colado = false; CP.erro = ''; CP.sec = 'auto'; }
    V.chave = nova; V.achados = V.chave ? procurar(V.chave) : []; V.sel = 0;
    render();
  });
}

/* ---------- comparação (a mesma do Collectio: lotes/index.html, compara()) ---------- */
function nrm(t, ws) { t = String(t || ''); if (ws) t = t.replace(/[“”«»„]/g, '"').replace(/[‘’`´]/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' '); return t.trim(); }
function lcs(a, b, eq) {
  var n = a.length, m = b.length, D = [], i, j;
  for (i = 0; i <= n; i++) D.push(new Uint32Array(m + 1));
  for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) D[i][j] = eq(a[i], b[j]) ? D[i + 1][j + 1] + 1 : Math.max(D[i + 1][j], D[i][j + 1]);
  var r = []; i = 0; j = 0;
  while (i < n && j < m) { if (eq(a[i], b[j])) { r.push(['=', a[i], b[j]]); i++; j++; } else if (D[i + 1][j] >= D[i][j + 1]) r.push(['-', a[i++]]); else r.push(['+', b[j++]]); }
  while (i < n) r.push(['-', a[i++]]); while (j < m) r.push(['+', b[j++]]);
  return r;
}
function difPal(a, b, ws) {
  var A = a.split(/\s+/).filter(Boolean), B = b.split(/\s+/).filter(Boolean);
  if (A.length * B.length > 360000) return { h: '<del>' + esc(a) + '</del> <ins>' + esc(b) + '</ins>', igual: 0, tot: Math.max(A.length, B.length) };
  var ops = lcs(A, B, function (x, y) { return nrm(x, ws) === nrm(y, ws); }), h = '', ig = 0, cur = '', buf = [];
  function sai() { if (!buf.length) return; var t = esc(buf.join(' ')); h += (h ? ' ' : '') + (cur === '-' ? '<del>' + t + '</del>' : cur === '+' ? '<ins>' + t + '</ins>' : t); buf = []; }
  ops.forEach(function (o) { if (o[0] !== cur) { sai(); cur = o[0]; } buf.push(o[1]); if (o[0] === '=') ig++; }); sai();
  return { h: h, igual: ig, tot: Math.max(A.length, B.length) };
}
var TITULO = /^(relat[oó]rio|voto|ementa|ac[oó]rd[aã]o|vistos[,.]?|[eé] o (relat[oó]rio|voto)\.?)$/i;
function paragrafosEditor(t) { return String(t || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(function (x) { return x && !TITULO.test(x); }); }
function paragrafosLote(m, sec) {
  var A = [];
  SECS.forEach(function (s) { var v = (m.secoes || {})[s[0]]; if ((sec === '*' || sec === s[0]) && Array.isArray(v) && v.length) { A.push({ h: s[1] }); v.forEach(function (x) { if (String(x).trim()) A.push({ p: String(x).trim() }); }); } });
  return A;
}
/* "Automático": a parte da minuta do lote mais parecida com o texto do editor (palavras em comum) */
function palavras(t) { var o = {}; nrm(t, true).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).forEach(function (w) { if (w.length > 3) o[w] = 1; }); return o; }
function semelhanca(a, b) { var A = palavras(a), B = palavras(b), ka = Object.keys(A), kb = Object.keys(B), c = 0; if (!ka.length || !kb.length) return 0; ka.forEach(function (w) { if (B[w]) c++; }); return c / (ka.length + kb.length - c); }
function parteAuto(m, texto) {
  var melhor = '*', nota = -1, cands = SECS.map(function (s) { return s[0]; }).filter(function (k) { return Array.isArray((m.secoes || {})[k]) && m.secoes[k].length; }).concat(['*']);
  cands.forEach(function (k) { var tx = paragrafosLote(m, k).filter(function (x) { return x.p; }).map(function (x) { return x.p; }).join('\n'); var n = semelhanca(tx, texto) - (k === '*' ? 0.02 : 0); if (n > nota) { nota = n; melhor = k; } });
  return melhor;
}
function comparar(m) {
  var out = $('cp-out'), st = $('cp-st'); if (!out) return;
  var A0 = m && m.secoes ? m : null;
  if (!A0) { out.innerHTML = ''; return; }
  if (!CP.texto.trim()) { st.textContent = ''; out.innerHTML = '<p class="none">Leia o editor do PJe ou cole o texto da minuta para comparar.</p>'; return; }
  var sec = CP.sec === 'auto' ? parteAuto(m, CP.texto) : CP.sec;
  var A = paragrafosLote(m, sec), PA = A.filter(function (x) { return x.p; }).map(function (x) { return x.p; }), PB = paragrafosEditor(CP.texto), ws = CP.ws, sd = CP.sd;
  if (PA.length * PB.length > 250000) { st.textContent = 'Textos grandes demais para comparar de uma vez: escolha a parte (Relatório, Voto ou Ementa).'; out.innerHTML = ''; return; }
  var ops = lcs(PA, PB, function (x, y) { return nrm(x, ws) === nrm(y, ws); });
  var h = '', ig = 0, tot = 0, eqn = 0, dl = [], ad = [], npar = 0;
  function flushEq() { if (eqn) { h += '<p class="eq">' + eqn + ' parágrafo' + (eqn > 1 ? 's iguais' : ' igual') + '</p>'; eqn = 0; } }
  function flush() {
    var n = Math.max(dl.length, ad.length);
    for (var i = 0; i < n; i++) {
      if (dl[i] != null && ad[i] != null) { var d = difPal(dl[i], ad[i], ws); h += '<p>' + d.h + '</p>'; ig += d.igual; tot += d.tot; npar++; }
      else if (dl[i] != null) { h += '<p><del>' + esc(dl[i]) + '</del></p>'; tot += dl[i].split(/\s+/).length; npar++; }
      else { h += '<p><ins>' + esc(ad[i]) + '</ins></p>'; tot += ad[i].split(/\s+/).length; npar++; }
    }
    dl = []; ad = [];
  }
  ops.forEach(function (o) { if (o[0] === '=') { flush(); var w = o[1].split(/\s+/).length; ig += w; tot += w; if (sd) eqn++; else h += '<p class="so">' + esc(o[1]) + '</p>'; } else { flushEq(); (o[0] === '-' ? dl : ad).push(o[1]); } });
  flush(); flushEq();
  out.innerHTML = h || '<p class="none">Sem diferenças.</p>';
  var parte = sec === '*' ? 'minuta inteira' : SECS.filter(function (s) { return s[0] === sec; })[0][1].toLowerCase();
  st.textContent = (npar ? npar + ' parágrafo' + (npar > 1 ? 's' : '') + ' com diferença · ' + (tot ? Math.round(100 * ig / tot) : 100) + '% igual' : 'Textos iguais') + ' · comparado com: ' + parte + (CP.sec === 'auto' ? ' (automático)' : '');
}
function lerEditor() {
  if (!window.MutaPje || !window.MutaPje.lerEditor) return;
  CP.lendo = true; CP.erro = ''; desenhaCmp();
  window.MutaPje.lerEditor().then(function (r) {
    CP.texto = r.texto; CP.fonte = r.fonte + (r.outros ? ' · ' + (r.outros + 1) + ' editores na página; usado o maior visível' : ''); CP.colado = false;
    if (r.numero && dg(r.numero) !== V.chave) CP.erro = 'Atenção: o editor lido está nos autos ' + r.numero + ', não no processo do lote.';
  }).catch(function (e) { CP.erro = e.message; }).then(function () { CP.lendo = false; desenhaCmp(); });
}
function minutaAtual() { var a = V.achados[V.sel]; if (!a) return null; return V.minuta[a.lote.id + '/' + String(a.it.processo).slice(0, 10)] || null; }
function desenhaCmp() {
  var box = $('lt-cmp'); if (!box) return;
  var m = minutaAtual(), tem = m && m.secoes;
  box.innerHTML = '<div class="cp-h"><h3 class="display">Minuta do lote × editor do PJe</h3></div>' +
    (tem ? '' : '<p class="muted">' + (m && m.erro ? esc(m.erro) : 'Abrindo a minuta do lote…') + '</p>') +
    '<div class="bar cp-bar"><button type="button" class="btn solid" data-cp="ler"' + (CP.lendo ? ' disabled' : '') + '>' + (CP.lendo ? 'Lendo o editor…' : CP.texto && !CP.colado ? 'Ler de novo' : 'Ler o editor do PJe') + '</button>' +
    '<select data-cp="sec" title="Parte da minuta do lote"><option value="auto">Parte: automático</option><option value="*">Minuta inteira</option>' + SECS.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('') + '</select></div>' +
    '<div class="bar cp-opc"><label><input type="checkbox" data-cp="ws"' + (CP.ws ? ' checked' : '') + '> ignorar espaços, aspas e travessões</label><label><input type="checkbox" data-cp="sd"' + (CP.sd ? ' checked' : '') + '> só as diferenças</label></div>' +
    (CP.erro ? '<p class="status err">' + esc(CP.erro) + '</p>' : '') +
    (CP.texto && !CP.colado ? '<p class="muted cp-fonte">Texto lido do PJe (' + esc(CP.fonte) + ') · ' + CP.texto.split(/\s+/).length + ' palavras</p>' : '') +
    '<details class="cp-colar"' + (CP.colado ? ' open' : '') + '><summary>Colar o texto em vez de ler o editor</summary><textarea data-cp="txt" placeholder="Cole aqui a minuta do editor do PJe">' + (CP.colado ? esc(CP.texto) : '') + '</textarea></details>' +
    '<div class="cx-lg"><span><del>riscado</del> está na minuta do lote e falta no editor</span><span><ins>verde</ins> está só no editor do PJe</span></div>' +
    '<p class="status" id="cp-st" role="status" aria-live="polite"></p><div class="cx-out" id="cp-out"></div>';
  var s = box.querySelector('[data-cp=sec]'); if (s) s.value = CP.sec;
  if (tem) comparar(m);
}

/* ---------- desenho ---------- */
function campo(rotulo, v) { return v ? '<div class="lt-f"><span class="gl">' + esc(rotulo) + '</span><div>' + esc(v) + '</div></div>' : ''; }
function tabelaAjustes(aj) {
  if (!Array.isArray(aj) || !aj.length) return '';
  var cab = Array.isArray(aj[0]) && /se[cç][aã]o/i.test(String(aj[0][0] || '')) ? aj[0] : null, linhas = cab ? aj.slice(1) : aj;
  if (!linhas.length) return '';
  return '<div class="lt-f"><span class="gl">Ajustes da correção (' + linhas.length + ')</span><div class="gt-tab"><table>' + (cab ? '<thead><tr>' + cab.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead>' : '') +
    '<tbody>' + linhas.map(function (r) { r = Array.isArray(r) ? r : [r.secao, r.ajuste, r.tipo]; return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
}
function textoSec(v) { return Array.isArray(v) ? v.join('\n\n') : String(v || ''); }
function render() {
  if (C.erro) { caixa.innerHTML = '<div class="err-box">Não foi possível ler os lotes: ' + esc(C.erro) + '</div>'; return; }
  var lotes = C.lista || [], h = '';
  var links = '<div class="lt-lotes">' + lotes.map(function (l) { return '<a class="chip" target="_blank" rel="noopener noreferrer" href="' + SITE + '/amicus/collectio/?id=' + encodeURIComponent(l.id) + '">' + esc(l.titulo) + ' · ' + l.total + '</a>'; }).join(' ') + '</div>';
  if (!V.chave) { caixa.innerHTML = '<div class="empty"><h3>Nenhum processo aberto</h3>Abra os autos no PJe para conferir a minuta do lote.</div>' + (lotes.length ? '<p class="muted">Lotes do gabinete:</p>' + links : ''); return; }
  var num = Muta.formatarCnj(V.chave);
  if (!V.achados.length) { caixa.innerHTML = '<div class="empty"><h3>' + esc(num) + ' não está em nenhum lote</h3>Ou ainda não está visível para a equipe.</div>' + (lotes.length ? '<p class="muted">Lotes do gabinete:</p>' + links : ''); return; }
  if (V.achados.length > 1) h += '<div class="seg lt-sel">' + V.achados.map(function (a, i) { return '<button type="button" data-i="' + i + '" aria-selected="' + (i === V.sel) + '">' + esc(a.lote.titulo) + ' · ' + brD(a.it.sessao) + '</button>'; }).join('') + '</div>';
  var a = V.achados[V.sel], l = a.lote, it = a.it, eq = it.equipe || {};
  var cols = {}; (l.colunas || []).forEach(function (c) { cols[c.id] = c.rotulo; });
  var grupo = (l.grupos || []).filter(function (g) { return g.id === it.grupo; })[0];
  var cor = grupo ? grupo.cor : ((l.grupo_outros || {}).cor || '#9aa0a8');
  h += '<article class="card lt" style="border-left:4px solid ' + esc(cor) + '">' +
    '<p class="kicker">' + esc(l.titulo) + ' · sessão de ' + brD(it.sessao) + ' · item ' + esc(it.item) + '</p>' +
    '<h2 class="display">' + esc(it.tipo_caso || (grupo && grupo.rotulo) || 'Processo do lote') + '</h2>' +
    '<div class="mono">' + esc(it.processo) + '</div><div class="muted">' + esc(it.recurso || '') + (it.partes ? ' · ' + esc(it.partes) : '') + '</div>' +
    '<div class="bar"><span class="chip">' + esc(eq.situacao || '—') + '</span>' + (eq.minuta ? '<span class="chip">Minuta: ' + esc(eq.minuta) + '</span>' : '') + (eq.correcao ? '<span class="chip">Correção: ' + esc(eq.correcao) + '</span>' : '') + '</div>' +
    '<div class="bar"><a class="btn line" target="_blank" rel="noopener noreferrer" href="' + SITE + '/amicus/collectio/?id=' + encodeURIComponent(l.id) + '#p=' + encodeURIComponent(it.sessao + '-' + it.item) + '">Abrir no Collectio</a><button type="button" class="btn line" data-atu>Atualizar</button></div>' +
    '</article>' +
    '<section class="card lt-cmp" id="lt-cmp"></section>' +
    txHtml(l, it) +
    '<section class="card lt-min" id="lt-min"><div class="empty">Abrindo a minuta do lote…</div></section>' +
    '<details class="card lt-perfil"><summary><h3 class="display">Perfil do processo no lote</h3></summary>' +
    campo('Resultado', it.resultado) + campo('Modelo', it.modelo) +
    ((it.variacoes || []).length ? '<div class="lt-f"><span class="gl">Variações</span><div class="bar">' + it.variacoes.map(function (v) { return '<span class="chip">' + esc(cols[v] || v) + '</span>'; }).join('') + '</div></div>' : '') +
    campo('Observação', it.observacao) + campo('Peculiaridades (equipe)', it.peculiaridades) +
    (it.peculiaridades_relator && it.peculiaridades_relator !== it.peculiaridades ? campo('Peculiaridades (Relator)', it.peculiaridades_relator) : '') +
    campo('Orientação', it.orientacao) + campo('MPF', it.mpf) +
    ((it.pecas || []).length ? '<div class="lt-f"><span class="gl">Peças</span><ul class="lt-pecas">' + it.pecas.map(function (p) { return '<li><span>' + esc(p.peca || p.tipo || '') + '</span><button type="button" class="mono lnk" data-copia="' + esc(p.id || '') + '" title="Copiar o ID">' + esc(p.id || '') + '</button></li>'; }).join('') + '</ul></div>' : '') +
    tabelaAjustes(it.ajustes) +
    (Array.isArray(it.pendencias) && it.pendencias.length ? '<div class="lt-f"><span class="gl">Pendências</span><ul>' + it.pendencias.map(function (p) { return '<li>' + esc(typeof p === 'string' ? p : (p.texto || JSON.stringify(p))) + '</li>'; }).join('') + '</ul></div>' : (typeof it.pendencias === 'string' ? campo('Pendências', it.pendencias) : '')) +
    '</details>';
  caixa.innerHTML = h;
  desenhaCmp();
  minuta(l.id, it);
}
/* ---------- transferir o texto do editor do PJe para o Collectio (nova versão da minuta do processo no lote) ---------- */
var TX = { rotulo: '', vigente: true, prev: null, enviando: false, msg: '', erro: '' };
function hojeBr() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
function secoesEditor() {
  var E = window.MutaEditor ? window.MutaEditor.estado() : null, CX = window.MutaComparador;
  if (!E || !E.texto || !CX) return null;
  var P = CX.partes(E.paragrafos || []), o = {};
  if (!P.achou) return { erro: 'Não achei no editor os títulos RELATÓRIO, VOTO, EMENTA e ACÓRDÃO (um por linha). Sem eles, o Collectio não separa as partes.' };
  SECS.forEach(function (s) { o[s[0]] = (P[s[0]] || []).map(function (p) { return String(p.t || '').trim(); }).filter(Boolean); });
  return { secoes: o, fonte: E.fonte || 'editor do PJe', numero: E.numero || '' };
}
function txHtml(l, it) {
  var u = (ses.estado() || {}).usuario || '';
  if (!TX.rotulo) TX.rotulo = 'Texto do PJe · ' + (u ? u + ' · ' : '') + hojeBr();
  var p = TX.prev;
  return '<section class="card lt-tx" id="lt-tx"><p class="kicker">Transferir o texto do PJe para o Collectio</p>' +
    '<p class="muted">Lê a minuta do editor do PJe (tarefa de minuta), separa relatório, voto, ementa e acórdão pelos títulos e grava como nova versão da minuta deste processo no lote <b>' + esc(l.titulo) + '</b>. As versões anteriores ficam guardadas no Collectio.</p>' +
    '<label class="lt-tx-f">Nome da versão <input type="text" data-tx="rotulo" maxlength="80" value="' + esc(TX.rotulo) + '"></label>' +
    '<label class="lt-tx-c"><input type="checkbox" data-tx="vigente"' + (TX.vigente ? ' checked' : '') + '> Tornar vigente (é a versão que o Collectio e o Relator veem); desmarcado, só guarda</label>' +
    (p && p.secoes ? '<p class="muted lt-tx-p">Lido agora' + (p.numero ? ' nos autos ' + esc(p.numero) : '') + ': ' + SECS.map(function (s) { return s[1] + ' ' + p.secoes[s[0]].length + ' §'; }).join(' · ') + '</p>' : '') +
    (p && p.erro ? '<p class="status err">' + esc(p.erro) + '</p>' : '') +
    (TX.erro ? '<p class="status err">' + esc(TX.erro) + '</p>' : '') + (TX.msg ? '<p class="status ok">' + esc(TX.msg) + '</p>' : '') +
    '<div class="bar"><button type="button" class="btn line" data-tx="ler">Ler o editor</button><button type="button" class="btn solid" data-tx="enviar"' + (TX.enviando ? ' disabled' : '') + '>' + (TX.enviando ? 'Transferindo…' : 'Transferir para o Collectio') + '</button></div></section>';
}
function txRedesenha() { var a = V.achados[V.sel], box = $('lt-tx'); if (!a || !box) return; var d = document.createElement('div'); d.innerHTML = txHtml(a.lote, a.it); box.replaceWith(d.firstChild); }
function txLer() {
  TX.erro = ''; TX.msg = '';
  return (window.MutaEditor ? window.MutaEditor.ler() : Promise.reject(new Error('Editor indisponível.'))).then(function () { TX.prev = secoesEditor(); txRedesenha(); return TX.prev; },
    function (e) { TX.prev = null; TX.erro = 'Não li o editor do PJe: ' + e.message + '. Abra a tarefa de minuta com o texto no editor.'; txRedesenha(); return null; });
}
function txEnviar() {
  var a = V.achados[V.sel]; if (!a) return;
  txLer().then(function (p) {
    if (!p || p.erro || !p.secoes) return;
    if (p.numero && String(p.numero).replace(/\D/g, '') !== V.chave) { TX.erro = 'O editor lido está nos autos ' + p.numero + ', não neste processo.'; txRedesenha(); return; }
    var n = SECS.reduce(function (t, s) { return t + p.secoes[s[0]].length; }, 0);
    if (!n) { TX.erro = 'O editor está vazio.'; txRedesenha(); return; }
    var msg = 'Gravar o texto do editor (' + SECS.map(function (s) { return s[1].toLowerCase() + ' ' + p.secoes[s[0]].length + ' §'; }).join(', ') + ') como nova versão "' + TX.rotulo + '" da minuta de ' + a.it.processo + ' no lote ' + a.lote.titulo + (TX.vigente ? ', vigente' : ', só guardada') + '?';
    var conf = Muta.confirmar ? Muta.confirmar(msg, 'Transferir') : Promise.resolve(window.confirm(msg));
    return Promise.resolve(conf).then(function (ok) {
      if (!ok) return;
      TX.enviando = true; TX.erro = ''; txRedesenha();
      return ses.api('/api/painel?lote=1', { method: 'POST', body: JSON.stringify({ acao: 'minuta-versao', id: a.lote.id, processo: a.it.processo, rotulo: TX.rotulo.trim() || 'Texto do PJe',
        origem: 'Editor do PJe (' + p.fonte + ') · transferido pela extensão Muta em ' + hojeBr(), secoes: p.secoes, vigente: !!TX.vigente }) })
        .then(function (j) {
          TX.enviando = false; TX.msg = 'Gravado no Collectio: versão ' + ((j.versoes || []).slice(-1)[0] || {}).id + (j.trocouVigente ? ', vigente.' : ', guardada.'); TX.rotulo = '';
          var k = a.lote.id + '/' + String(a.it.processo).slice(0, 10); if (j.minuta) V.minuta[k] = j.minuta; else delete V.minuta[k];
          a.it.minuta = true; render();
        }, function (e) { TX.enviando = false; TX.erro = e.status === 401 ? 'Entre no Ex Officio para transferir.' : 'Não foi possível transferir: ' + e.message; txRedesenha(); });
    });
  });
}
function minuta(id, it) {
  var mx = String(it.processo).slice(0, 10), chave = id + '/' + mx;
  function desenha(m) {
    var box = $('lt-min'); if (!box) return;
    desenhaCmp();
    if (m && m.erro) { box.innerHTML = '<div class="empty">' + esc(m.erro) + '</div>'; return; }
    var sec = (m && m.secoes) || {}, tem = SECS.filter(function (s) { return textoSec(sec[s[0]]).trim(); });
    if (!tem.length) { box.innerHTML = '<div class="empty">Minuta sem texto no lote.</div>'; return; }
    box.innerHTML = '<p class="kicker">Versão da minuta registrada no lote' + (m.atualizado_em ? ' · ' + brD(m.atualizado_em) : '') + '</p>' + (m.origem ? '<p class="muted" style="font-size:11px">' + esc(m.origem) + '</p>' : '') +
      tem.map(function (s) { return '<details class="gg"><summary><h4>' + s[1] + '</h4><button type="button" class="btn line" data-copsec="' + s[0] + '">Copiar</button></summary><pre class="lt-txt">' + esc(textoSec(sec[s[0]])) + '</pre></details>'; }).join('');
  }
  if (V.minuta[chave]) { desenha(V.minuta[chave]); return; }
  api('id=' + encodeURIComponent(id) + '&minuta=' + encodeURIComponent(mx)).then(function (m) { V.minuta[chave] = m; desenha(m); })
    .catch(function (e) { var m = { erro: e.status === 404 ? 'Minuta não disponível para este processo no lote.' : 'Não foi possível abrir a minuta: ' + e.message }; if (e.status === 404) V.minuta[chave] = m; desenha(m); });
}
function copiar(t, el) {
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { if (el) { var o = el.textContent; el.textContent = 'Copiado'; setTimeout(function () { el.textContent = o; }, 1200); } }).catch(function () {});
}
var tCol = 0;
caixa.addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.i != null) { V.sel = +b.dataset.i; render(); return; }
  if (b.hasAttribute('data-atu')) { V.minuta = {}; atualizar(true); return; }
  if (b.dataset.cp === 'ler') { lerEditor(); return; }
  if (b.dataset.tx === 'ler') { txLer(); return; }
  if (b.dataset.tx === 'enviar') { txEnviar(); return; }
  if (b.dataset.copia) { copiar(b.dataset.copia, b); return; }
  if (b.dataset.copsec) { e.preventDefault(); var m = minutaAtual(); if (m && m.secoes) copiar(textoSec(m.secoes[b.dataset.copsec]), b); return; }
});
caixa.addEventListener('change', function (e) {
  if (e.target.dataset && e.target.dataset.tx === 'vigente') { TX.vigente = e.target.checked; return; }
  var t = e.target, k = t.dataset && t.dataset.cp; if (!k) return;
  if (k === 'sec') CP.sec = t.value; else if (k === 'ws') CP.ws = t.checked; else if (k === 'sd') CP.sd = t.checked; else return;
  var m = minutaAtual(); if (m && m.secoes) comparar(m);
});
caixa.addEventListener('input', function (e) {
  if (e.target.dataset && e.target.dataset.tx === 'rotulo') { TX.rotulo = e.target.value; return; }
  var t = e.target; if (!t.dataset || t.dataset.cp !== 'txt') return;
  clearTimeout(tCol); tCol = setTimeout(function () { CP.texto = t.value; CP.colado = !!t.value.trim(); CP.erro = ''; CP.fonte = ''; var m = minutaAtual(); if (m && m.secoes) comparar(m); var f = caixa.querySelector('.cp-fonte'); if (f) f.remove(); }, 350);
});
document.addEventListener('muta:prontuario', function () { if (aberta()) atualizar(false); });
/* para a aba Comparar: as minutas registradas nos lotes para o processo (uma por lote em que ele está) */
function minutasDoProcesso(chave) {
  return base(false).then(function () {
    if (C.erro) throw new Error(C.erro);
    return Promise.all(procurar(chave).map(function (a) {
      var mx = String(a.it.processo).slice(0, 10), k = a.lote.id + '/' + mx;
      var p = V.minuta[k] ? Promise.resolve(V.minuta[k]) : api('id=' + encodeURIComponent(a.lote.id) + '&minuta=' + encodeURIComponent(mx)).then(function (m) { V.minuta[k] = m; return m; });
      return p.then(function (m) {
        var secoes = SECS.map(function (s) { var v = (m.secoes || {})[s[0]]; return { t: s[1], ps: Array.isArray(v) ? v : String(v || '').split(/\n+/) }; });
        return { id: k, rotulo: a.lote.titulo + (a.it.sessao ? ' · sessão de ' + brD(a.it.sessao) : '') + (a.it.item ? ', item ' + a.it.item : ''), secoes: secoes, atualizado: m.atualizado_em || '' };
      }, function (e) { return { id: k, rotulo: a.lote.titulo, erro: e.status === 404 ? 'Minuta não disponível no lote.' : e.message, secoes: [] }; });
    }));
  });
}
window.MutaLote = { transferir: function () { if (window.MutaAbas) window.MutaAbas.ir('min'); var d = $('panel-lote'); if (d && !d.open) { d.open = true; atualizar(false); } setTimeout(function () { var x = $('lt-tx'); if (x) x.scrollIntoView({ block: 'start' }); }, 500); }, abrir: function () { atualizar(false); }, sessao: function () { if (aberta()) atualizar(false); }, lerEditor: lerEditor, minutasDoProcesso: minutasDoProcesso };
})();
