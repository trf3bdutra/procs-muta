/* Muta · aba Lote (Amicus Curiae · Index)
   Procura o processo aberto nos lotes do gabinete e mostra o perfil dele no lote: tipo de caso, resultado,
   variações, peculiaridades (equipe e Relator), peças, MPF, ajustes da correção, pendências e a minuta.
     GET /api/painel?lote=1                      lotes visíveis
     GET /api/painel?lote=1&id=<lote>            o lote (itens com o cartão do prontuário)
     GET /api/painel?lote=1&id=<lote>&minuta=X   minuta do processo (X = 10 primeiros caracteres do número)
   Só leitura: a gestão do lote continua no Index (/lote/). */
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

function aberta() { return !$('panel-lote').hidden; }
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
    var l = C.lotes[id];
    (l.itens || []).forEach(function (it) { if (dg(it.processo) === chave) out.push({ lote: l, it: it }); });
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
    var k = br.chaveAtual(); V.chave = k && k !== 'avulso' ? k : '';
    V.achados = V.chave ? procurar(V.chave) : []; V.sel = 0;
    render();
  });
}

function lista(rotulo, v) { return v ? '<div class="lt-f"><span class="gl">' + esc(rotulo) + '</span><div>' + esc(v) + '</div></div>' : ''; }
function render() {
  if (C.erro) { caixa.innerHTML = '<div class="err-box">Não foi possível ler os lotes: ' + esc(C.erro) + '</div>'; return; }
  var lotes = C.lista || [], h = '';
  var links = '<div class="lt-lotes">' + lotes.map(function (l) { return '<a class="chip" target="_blank" rel="noopener noreferrer" href="' + SITE + '/lote/?id=' + encodeURIComponent(l.id) + '">' + esc(l.titulo) + ' · ' + l.total + '</a>'; }).join(' ') + '</div>';
  if (!V.chave) { caixa.innerHTML = '<div class="empty"><h3>Nenhum processo aberto</h3>Abra os autos no PJe para ver o processo no lote.</div>' + (lotes.length ? '<p class="muted">Lotes do gabinete:</p>' + links : ''); return; }
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
    '<div class="bar" style="margin-top:8px"><span class="chip">' + esc(eq.situacao || '—') + '</span>' + (eq.minuta ? '<span class="chip">Minuta: ' + esc(eq.minuta) + '</span>' : '') + (eq.correcao ? '<span class="chip">Correção: ' + esc(eq.correcao) + '</span>' : '') + '</div>' +
    '<div class="bar" style="margin-top:8px"><a class="btn line" target="_blank" rel="noopener noreferrer" href="' + SITE + '/lote/?id=' + encodeURIComponent(l.id) + '#p=' + encodeURIComponent(it.sessao + '-' + it.item) + '">Abrir no Index</a><button type="button" class="btn line" data-atu>Atualizar</button></div>' +
    lista('Resultado', it.resultado) + lista('Modelo', it.modelo) +
    ((it.variacoes || []).length ? '<div class="lt-f"><span class="gl">Variações</span><div class="bar">' + it.variacoes.map(function (v) { return '<span class="chip" title="' + esc(cols[v] || v) + '">' + esc(cols[v] || v) + '</span>'; }).join('') + '</div></div>' : '') +
    lista('Observação', it.observacao) + lista('Peculiaridades (equipe)', it.peculiaridades) +
    (it.peculiaridades_relator && it.peculiaridades_relator !== it.peculiaridades ? lista('Peculiaridades (Relator)', it.peculiaridades_relator) : '') +
    lista('Orientação', it.orientacao) + lista('MPF', it.mpf) +
    ((it.pecas || []).length ? '<div class="lt-f"><span class="gl">Peças</span><ul class="lt-pecas">' + it.pecas.map(function (p) { return '<li><span>' + esc(p.peca || p.tipo || '') + '</span><button type="button" class="mono lnk" data-copia="' + esc(p.id || '') + '" title="Copiar o ID">' + esc(p.id || '') + '</button></li>'; }).join('') + '</ul></div>' : '') +
    tabelaAjustes(it.ajustes) +
    (Array.isArray(it.pendencias) && it.pendencias.length ? '<div class="lt-f"><span class="gl">Pendências</span><ul>' + it.pendencias.map(function (p) { return '<li>' + esc(typeof p === 'string' ? p : (p.texto || JSON.stringify(p))) + '</li>'; }).join('') + '</ul></div>' : (typeof it.pendencias === 'string' ? lista('Pendências', it.pendencias) : '')) +
    '</article><div id="lt-min" class="card lt-min"><div class="empty">Abrindo a minuta…</div></div>';
  caixa.innerHTML = h;
  minuta(l.id, it);
}
function tabelaAjustes(aj) {
  if (!Array.isArray(aj) || !aj.length) return '';
  var cab = Array.isArray(aj[0]) && /se[cç][aã]o/i.test(String(aj[0][0] || '')) ? aj[0] : null, linhas = cab ? aj.slice(1) : aj;
  if (!linhas.length) return '';
  return '<div class="lt-f"><span class="gl">Ajustes da correção (' + linhas.length + ')</span><div class="gt-tab"><table>' + (cab ? '<thead><tr>' + cab.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead>' : '') +
    '<tbody>' + linhas.map(function (r) { r = Array.isArray(r) ? r : [r.secao, r.ajuste, r.tipo]; return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
}
var SECS = [['relatorio', 'Relatório'], ['voto', 'Voto'], ['ementa', 'Ementa'], ['acordao', 'Acórdão']];
function textoSec(v) { return Array.isArray(v) ? v.join('\n\n') : String(v || ''); }
function minuta(id, it) {
  var mx = String(it.processo).slice(0, 10), chave = id + '/' + mx, box = $('lt-min');
  function desenha(m) {
    if (!box) return;
    if (m && m.erro) { box.innerHTML = '<div class="empty">' + esc(m.erro) + '</div>'; return; }
    var sec = (m && m.secoes) || {}, tem = SECS.filter(function (s) { return textoSec(sec[s[0]]).trim(); });
    if (!tem.length) { box.innerHTML = '<div class="empty">Minuta sem texto no lote.</div>'; return; }
    box.innerHTML = '<p class="kicker">Minuta no lote' + (m.atualizado_em ? ' · atualizada em ' + brD(m.atualizado_em) : '') + '</p>' + (m.origem ? '<p class="muted" style="font-size:11px">' + esc(m.origem) + '</p>' : '') +
      tem.map(function (s) { return '<details class="gg"' + (s[0] === 'ementa' ? ' open' : '') + '><summary><h4>' + s[1] + '</h4><button type="button" class="btn line" data-copsec="' + s[0] + '">Copiar</button></summary><pre class="lt-txt">' + esc(textoSec(sec[s[0]])) + '</pre></details>'; }).join('');
    box._m = m;
  }
  if (V.minuta[chave]) { desenha(V.minuta[chave]); return; }
  api('id=' + encodeURIComponent(id) + '&minuta=' + encodeURIComponent(mx)).then(function (m) { V.minuta[chave] = m; if ($('lt-min') === box) desenha(m); })
    .catch(function (e) { var m = { erro: e.status === 404 ? 'Minuta não disponível para este processo no lote.' : 'Não foi possível abrir a minuta: ' + e.message }; if (e.status === 404) V.minuta[chave] = m; desenha(m); });
}
function copiar(t, el) {
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { if (el) { var o = el.textContent; el.textContent = 'Copiado'; setTimeout(function () { el.textContent = o; }, 1200); } }).catch(function () {});
}
caixa.addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.i != null) { V.sel = +b.dataset.i; render(); return; }
  if (b.hasAttribute('data-atu')) { V.minuta = {}; atualizar(true); return; }
  if (b.dataset.copia) { copiar(b.dataset.copia, b); return; }
  if (b.dataset.copsec) { e.preventDefault(); var m = $('lt-min')._m; if (m) copiar(textoSec((m.secoes || {})[b.dataset.copsec]), b); return; }
});
document.addEventListener('muta:prontuario', function () { if (aberta()) atualizar(false); });
window.MutaLote = { abrir: function () { atualizar(false); }, sessao: function () { if (aberta()) atualizar(false); } };
})();
