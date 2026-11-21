/* Muta · triagem do processo (0.11: dentro do Prontuário › Triagem; a aba própria saiu)
   O Prontuário (gabinete.js) desenha os campos da ficha; daqui vêm, a partir do mesmo registro, as etiquetas sugeridas
   (etiquetasDe) e o registro da triagem do lote (registroDe: matriz e proposta, caso, peças e teor), e os dados da triagem
   para a aba Minuta comparar (dados, garantir). Texto original da aba, mantido abaixo:
   o prontuário de triagem do processo aberto no PJe, o mesmo do Caput · Triagem.
   Lê a ficha única do processo (GET /api/pauta?ficha=<CNJ>): os campos do prontuário de triagem (admissibilidade, MPF, urgência,
   matéria e gestão) e o grupo "Registro da triagem (lote)" (proposta, grupo da matriz, situação atual, teor dos autos e peças com
   nota e trecho), gravado a partir dos lotes por scripts/triagem/ficha_lote.py.
   Grava só o que a pessoa mudou (POST /api/pauta?ficha=1 {cnj, campos}); o servidor recusa o que não é editável.
   Daqui saem também: as etiquetas sugeridas para o PJe (copiar), a comparação do editor com a proposta e o precedente da
   triagem (aba Comparar), a transferência do texto do editor para o Collectio (aba Lote) e, nos autos digitais, a leitura
   do painel esquerdo do PJe (autos.js: conferência das peças e preenchimento do prontuário). */
(function () {
'use strict';
var ses = window.MutaSessao, br = window.MutaProntuarioBridge;
var $ = function (id) { return document.getElementById(id); };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function S(v) { return String(v == null ? '' : v).trim(); }
function N(v) { return S(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
var caixa = $('tri-app');
var T = { cnj: '', op: null, fo: null, F: null, carregando: false, erro: '', pend: {}, msg: '', tok: 0, gravando: false };

/* campos do prontuário de triagem, como no Caput (seção, chave, rótulo, tipo) */
var CAMPOS = [
  ['Admissibilidade', [['triagem', 'Tempestividade', 'Tempestividade', 's'], ['triagem', 'Preparo', 'Preparo', 's'], ['triagem', 'Representação', 'Representação', 's']]],
  ['MPF e urgência', [['triagem', 'MPF', 'Parecer do MPF', 's'], ['triagem', 'MPF - Custos Legis', 'Hipótese de intervenção', 's'], ['triagem', 'Urgência', 'Urgência', 's'], ['triagem', 'Urgência - Apreciação', 'Apreciação da urgência', 's']]],
  ['Matéria e gestão', [['triagem', 'Tema', 'Tipo de caso', 't'], ['triagem', 'META', 'Meta', 't'], ['triagem', 'Etiquetas sugeridas', 'Etiquetas sugeridas para o PJe', 'e']]],
  ['Providências', [['triagem', 'O que falta sanar', 'Pendências', 'a'], ['triagem', 'Intercorrências', 'Intercorrências', 'a'], ['origem', 'Próxima ação', 'Próxima ação', 't'], ['origem', 'Observações', 'Notas', 'a']]]
];
function aberta() { var p = $('panel-tri'); return p && !p.hidden; }
function cnjAtual() { var k = br.chaveAtual(); return k && k !== 'avulso' ? Muta.formatarCnj(k) : ''; }
function gravado(sec, k) { var r = T.op || {}, v = (r[sec] || {})[k]; return v == null ? '' : v; }
function V(sec, k) { var id = sec + '.' + k; return id in T.pend ? T.pend[id] : gravado(sec, k); }
function R(k) { return gravado('triagem', 'Registro - ' + k); }
function modelo(sec, k) {
  var F = T.F || {}, out = null;
  (F.abas || []).forEach(function (a) { (a.grupos || []).forEach(function (g) { (g.campos || []).forEach(function (c) { if (!out && c.chave === k && (c.secao || '') === sec) out = c; }); }); });
  return out;
}
function etqPje() { var f = T.fo || {}; return S(f.Etiquetas || f.etiquetas || f['Etiquetas Originais'] || f._etq).split(/\s*[;,|]\s*/).filter(Boolean); }

/* ---------- leitura ---------- */
function carregar(forcar, semTela) {
  if (!caixa || (!aberta() && !semTela)) return;
  var s = ses.estado();
  if (s.estado === 'verificando') { if (aberta()) caixa.innerHTML = '<div class="empty">Verificando a sessão do Ex Officio…</div>'; return; }
  if (s.estado !== 'on') { if (aberta()) ses.formulario(caixa, 'Entrar para ver o prontuário de triagem'); else T.erro = 'Entre no Ex Officio para ler a triagem.'; return; }
  var cnj = cnjAtual();
  if (!cnj) { T.cnj = ''; T.op = null; render(); return; }
  if (!forcar && cnj === T.cnj && (T.op || T.carregando)) { render(); return; }
  T.cnj = cnj; T.op = null; T.fo = null; T.erro = ''; T.pend = {}; T.msg = ''; T.carregando = true;
  var tok = ++T.tok; render();
  ses.api('/api/pauta?ficha=' + encodeURIComponent(cnj)).then(function (j) {
    if (tok !== T.tok) return;
    T.F = j.ficha; T.op = j.operacional || {}; T.fo = j.fonte || {}; T.carregando = false; render();
  }).catch(function (e) { if (tok !== T.tok) return; T.carregando = false; T.erro = e.status === 401 ? '' : e.message; render(); });
}

/* ---------- etiquetas sugeridas (as mesmas regras do Caput, a partir da ficha) ---------- */
function sugestoes() {
  var t = (T.op || {}).triagem || {}, ja = etqPje().map(N), out = [];
  function add(e, por) { if (!e || out.some(function (x) { return N(x.e) === N(e); })) return; out.push({ e: e, por: por, tem: ja.indexOf(N(e)) >= 0 }); }
  var prop = N(R('Proposta')), tc = S(R('Assunto detalhado')).replace(/\s*\([^)]*\)/g, '').split(/\s*;\s*/)[0].replace(/\s+—\s+/g, ' - ');
  var pend = false;
  if (/nao recolhido|sem comprovante|a menor|apos a interposicao|tesouro/.test(N(t['Preparo']))) { add('ver. preparo', 'preparo: ' + t['Preparo']); pend = true; }
  if (/irregular|negativ/.test(N(t['Representação']))) { add('representação', 'representação: ' + t['Representação']); pend = true; }
  if (/^intempest/.test(N(t['Tempestividade']))) { add('tempestividade', 'intempestivo'); pend = true; }
  if (/aguardando/.test(N(t['MPF'])) || (t['MPF - Custos Legis'] && !/^(sem hip|nao se aplica)/.test(N(t['MPF - Custos Legis'])) && !/com parecer|nao se aplica/.test(N(t['MPF'])))) { add('aguardando parecer', 'intervenção do MPF sem parecer'); pend = true; }
  if (t['Urgência'] && /pendente|nao apreciada/.test(N(t['Urgência - Apreciação']))) { add('LIMINAR PENDENTE', 'urgência não apreciada'); pend = true; }
  if (/monocratica|artigo 932|nao conhec|prejudicad/.test(prop) || /^(possivel|provavel)/.test(N(t['Hipóteses Monocrática']))) add('MONOCRÁTICA TERMINATIVA', 'proposta da triagem');
  else if (/voto|colegiad/.test(prop) && !pend && !/despacho|intimar|diligenc/.test(prop + ' ' + N(gravado('origem', 'Próxima ação')))) add(/\[validar/.test(prop) ? 'APTO - CONFERIR' : 'APTO', 'proposta: voto');
  var tm = /Tema (\d[\d.]*)\/(STF|STJ)/.exec(R('Proposta')); if (tm) add('Tema ' + tm[1].replace('.', '') + ' ' + tm[2], 'paradigma da proposta');
  if (tc) add(tc.length > 58 ? tc.slice(0, 59).replace(/\s+\S*$/, '') : tc, 'tipo de caso (assunto detalhado)');
  return out;
}

/* ---------- desenho ---------- */
function campo(c) {
  var sec = c[0], k = c[1], rot = c[2], tp = c[3], v = S(V(sec, k)), m = modelo(sec, k) || {}, id = sec + '.' + k, mud = id in T.pend;
  if (tp === 's') {
    var op = (m.opcoes || []).slice(); if (v && op.indexOf(v) < 0) op.unshift(v);
    return '<label class="tr-f' + (mud ? ' mud' : '') + '"><span>' + esc(rot) + '</span><select data-k="' + esc(id) + '"><option value="">—</option>' + op.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label>';
  }
  if (tp === 'a') return '<label class="tr-f w' + (mud ? ' mud' : '') + '"><span>' + esc(rot) + '</span><textarea data-k="' + esc(id) + '" rows="3">' + esc(v) + '</textarea></label>';
  if (tp === 'e') {
    var sg = sugestoes();
    return '<div class="tr-f w' + (mud ? ' mud' : '') + '"><span>' + esc(rot) + '</span><div class="tr-eq"><input type="text" data-k="' + esc(id) + '" value="' + esc(v) + '" placeholder="separe por vírgula"><button type="button" class="btn line" data-t="copia-etq">Copiar</button></div>' +
      (sg.length ? '<div class="tr-sg">' + sg.map(function (x) { return '<button type="button" class="chip' + (x.tem ? ' tem' : '') + '" data-add="' + esc(x.e) + '" title="' + esc(x.por + (x.tem ? ' · já está no PJe' : '')) + '">' + (x.tem ? '✓ ' : '+ ') + esc(x.e) + '</button>'; }).join('') + '</div>' : '') +
      (etqPje().length ? '<p class="muted tr-pj">No PJe: ' + esc(etqPje().join(', ')) + '</p>' : '') + '</div>';
  }
  return '<label class="tr-f' + (mud ? ' mud' : '') + '"><span>' + esc(rot) + '</span><input type="text" data-k="' + esc(id) + '" value="' + esc(v) + '"></label>';
}
function bloco(t, h) { return h ? '<section class="card tr-b"><p class="kicker">' + esc(t) + '</p>' + h + '</section>' : ''; }
function linhas(txt) { return S(txt) ? '<dl class="tr-dl">' + S(txt).split(/\n+/).map(function (l) { var i = l.indexOf(': '); return i > 0 && i < 40 ? '<dt>' + esc(l.slice(0, i)) + '</dt><dd>' + esc(l.slice(i + 2)) + '</dd>' : '<dd class="so">' + esc(l) + '</dd>'; }).join('') + '</dl>' : ''; }
function txt(rot, v) { return S(v) ? '<div class="tr-t"><span>' + esc(rot) + '</span><p>' + esc(v) + '</p></div>' : ''; }
function render() {
  if (!caixa || !aberta()) return;
  if (T.erro) { caixa.innerHTML = '<div class="err-box">Não foi possível ler a ficha: ' + esc(T.erro) + '</div>'; return; }
  if (!T.cnj) { caixa.innerHTML = '<div class="empty"><h3>Nenhum processo aberto</h3>Abra os autos digitais ou a tarefa no PJe: o prontuário de triagem do processo aparece aqui.</div>'; return; }
  if (T.carregando) { caixa.innerHTML = '<div class="empty">Lendo a ficha de ' + esc(T.cnj) + '…</div>'; return; }
  var t = (T.op || {}).triagem || {}, f = T.fo || {}, nPend = Object.keys(T.pend).length;
  var pecas = Array.isArray(R('Peças')) ? R('Peças') : [];
  var h = '<article class="card tr-cab"><p class="kicker">' + esc(R('Lote') || 'Sem registro de triagem em lote') + '</p><div class="mono">' + esc(T.cnj) + '</div>' +
    '<div class="muted">' + esc([f.classe_judicial || f.Classe, f.Assunto, f.tarefa_atual].filter(Boolean).join(' · ')) + '</div>' +
    (R('Assunto detalhado') ? '<h2 class="display tr-ad">' + esc(R('Assunto detalhado')) + '</h2>' : '') +
    '<div class="bar"><button type="button" class="btn line" data-t="cmp">Comparar o editor com a triagem</button><button type="button" class="btn line" data-t="tx">Transferir texto do PJe ao Collectio</button><button type="button" class="btn line" data-t="atu">Atualizar</button></div></article>';
  if (window.MutaAutos) h += window.MutaAutos.html(T.cnj, pecas);
  h += '<section class="card tr-b tr-ed"><p class="kicker">Prontuário de triagem <small class="muted">grava na ficha do processo</small></p>' +
    CAMPOS.map(function (g) { return '<h4 class="tr-g">' + esc(g[0]) + '</h4><div class="tr-grid">' + g[1].map(campo).join('') + '</div>'; }).join('') +
    '<div class="bar tr-sv"><button type="button" class="btn solid" data-t="salvar"' + (nPend && !T.gravando ? '' : ' disabled') + '>' + (T.gravando ? 'Gravando…' : nPend ? 'Salvar ' + nPend + ' campo(s)' : 'Nada a salvar') + '</button>' +
    (nPend ? '<button type="button" class="btn line" data-t="desfaz">Desfazer</button>' : '') + '<span class="status ' + (/^Não/.test(T.msg) ? 'err' : 'ok') + '">' + esc(T.msg) + '</span></div></section>';
  h += bloco('Matriz e proposta', linhas(R('Grupo')) + txt('Proposta', R('Proposta')) + txt('Variações', R('Variações')) + txt('Hipótese de monocrática', t['Hipóteses Monocrática']) + txt('Fundamento', gravado('producao', 'Mono - Fundamento')));
  h += bloco('Situação atual', linhas(R('Situação atual')) || txt('Síntese processual', t['Síntese Processual']));
  h += bloco('Caso', txt('Síntese fática', t['Síntese Fática']) + txt('Questões', t['Alegações']) + txt('Especificidades', t['Especificidades']) + linhas(R('Triagem')));
  if (S(R('Teor dos autos')) || pecas.length)
    h += '<section class="card tr-b"><p class="kicker">Peças e teor dos autos <small class="muted">' + pecas.length + ' peça(s)</small></p><div class="tr-pz">' +
      (S(R('Teor dos autos')) ? '<div class="tr-teor">' + linhas(R('Teor dos autos')) + '</div>' : '') +
      pecas.map(function (p) { return '<div class="tr-pc"><div class="tr-pch"><b>' + esc(p.peca) + '</b> <button type="button" class="mono lnk" data-copia="' + esc(p.id) + '" title="Copiar o ID">ID ' + esc(p.id) + '</button> <span class="muted">' + esc(p.data) + '</span></div>' +
        (p.pje ? '<div class="muted tr-pjx">' + esc(p.pje) + '</div>' : '') + (p.nota ? '<p class="tr-n">' + esc(p.nota) + '</p>' : '') + (p.trecho ? '<blockquote class="tr-q">' + esc(p.trecho) + '</blockquote>' : '') + '</div>'; }).join('') + '</div></section>';
  var y = caixa.scrollTop; caixa.innerHTML = h; caixa.scrollTop = y;
}

/* ---------- gravação ---------- */
function salvar() {
  var campos = {}; Object.keys(T.pend).forEach(function (k) { if (S(T.pend[k]) !== S(gravado(k.split('.')[0], k.slice(k.indexOf('.') + 1)))) campos[k] = T.pend[k]; });
  if (!Object.keys(campos).length) { T.pend = {}; T.msg = 'Nada mudou.'; render(); return; }
  T.gravando = true; T.msg = ''; render();
  ses.api('/api/pauta?ficha=1', { method: 'POST', body: JSON.stringify({ cnj: T.cnj, campos: campos }) }).then(function (j) {
    T.gravando = false;
    Object.keys(campos).forEach(function (k) { var i = k.indexOf('.'), s = k.slice(0, i), c = k.slice(i + 1); T.op[s] = T.op[s] || {}; T.op[s][c] = campos[k]; });
    var rec = (j && j.recusados) || []; T.pend = {};
    T.msg = rec.length ? 'Não gravados (não editáveis): ' + rec.join(', ') : 'Gravado na ficha do processo.';
    render();
  }, function (e) { T.gravando = false; T.msg = 'Não foi possível gravar: ' + e.message; render(); });
}
function copiar(t, el) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { if (el) { var o = el.textContent; el.textContent = 'Copiado'; setTimeout(function () { el.textContent = o; }, 1200); } }).catch(function () {}); }
if (caixa) {
  caixa.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var a = b.dataset.t;
    if (b.dataset.au && window.MutaAutos) { window.MutaAutos.clique(b); return; }
    if (a === 'salvar') { salvar(); return; }
    if (a === 'desfaz') { T.pend = {}; T.msg = ''; render(); return; }
    if (a === 'atu') { carregar(true); return; }
    if (a === 'cmp') { if (window.MutaComparar && window.MutaComparar.triagem) window.MutaComparar.triagem(); return; }
    if (a === 'tx') { if (window.MutaLote && window.MutaLote.transferir) window.MutaLote.transferir(); return; }
    if (a === 'copia-etq') { copiar(S(V('triagem', 'Etiquetas sugeridas')), b); return; }
    if (b.dataset.copia) { copiar(b.dataset.copia, b); return; }
    if (b.dataset.add) {
      var id = 'triagem.Etiquetas sugeridas', L = S(V('triagem', 'Etiquetas sugeridas')).split(/\s*,\s*/).filter(Boolean);
      if (!L.some(function (x) { return N(x) === N(b.dataset.add); })) L.push(b.dataset.add);
      T.pend[id] = L.join(', '); render(); return;
    }
  });
  var tIn = 0;
  function muda(e) { var k = e.target.dataset && e.target.dataset.k; if (!k) return; T.pend[k] = e.target.value; T.msg = ''; clearTimeout(tIn); tIn = setTimeout(function () { var sv = caixa.querySelector('[data-t="salvar"]'), n = Object.keys(T.pend).length; if (sv) { sv.disabled = !n; sv.textContent = n ? 'Salvar ' + n + ' campo(s)' : 'Nada a salvar'; } }, 120); }
  caixa.addEventListener('input', muda); caixa.addEventListener('change', muda);
}
document.addEventListener('muta:prontuario', function () { if (aberta()) carregar(false); });
if (ses && ses.ouvir) ses.ouvir(function () { if (aberta()) carregar(false); });
/* blocos para o Prontuário › Triagem, com o registro que o Prontuário já leu (sem nova leitura) */
function com(op, fo, f) { var o = T.op, f0 = T.fo; T.op = op || {}; T.fo = fo || {}; try { return f(); } finally { T.op = o; T.fo = f0; } }
function etiquetasDe(op, fo) {
  return com(op, fo, function () {
    var sg = sugestoes(), atual = S(gravado('triagem', 'Etiquetas sugeridas')), L = atual ? atual.split(/\s*[;,|]\s*/).filter(Boolean) : [];
    if (!sg.length && !L.length) return '';
    return '<section class="card pc-sec"><div class="pc-sh"><h3>Etiquetas sugeridas para o PJe</h3><small class="muted">nas regras do Caput</small></div>' +
      (sg.length ? '<div class="tr-sg">' + sg.map(function (x) { return '<button type="button" class="chip' + (x.tem ? ' tem' : '') + (L.some(function (e) { return N(e) === N(x.e); }) ? ' on' : '') + '" data-add="' + esc(x.e) + '" title="' + esc(x.por + (x.tem ? ' · o processo já tem' : '')) + '">+ ' + esc(x.e) + '</button>'; }).join('') + '</div>' : '') +
      (L.length ? '<p class="tr-etq"><b>Escolhidas:</b> ' + esc(L.join('; ')) + ' <button type="button" class="lnk" data-etq-copia>Copiar</button></p>' : '<p class="muted">Clique numa etiqueta para incluir; "Copiar" leva ao PJe.</p>') + '</section>';
  });
}
function registroDe(op, fo) {
  return com(op, fo, function () {
    var t = (T.op || {}).triagem || {}, pecas = Array.isArray(R('Peças')) ? R('Peças') : [], h = '';
    var bl = function (tit, x) { return x ? '<section class="card pc-sec"><div class="pc-sh"><h3>' + esc(tit) + '</h3></div>' + x + '</section>' : ''; };
    h += bl('Matriz e proposta', linhas(R('Grupo')) + txt('Proposta', R('Proposta')) + txt('Variações', R('Variações')) + txt('Hipótese de monocrática', t['Hipóteses Monocrática']) + txt('Fundamento', gravado('producao', 'Mono - Fundamento')));
    h += bl('Caso', txt('Síntese fática', t['Síntese Fática']) + txt('Especificidades', t['Especificidades']) + linhas(R('Triagem')));
    if (S(R('Teor dos autos')) || pecas.length)
      h += '<section class="card pc-sec"><div class="pc-sh"><h3>Peças e teor dos autos</h3><small class="muted">' + pecas.length + ' peça(s) do registro</small></div><div class="tr-pz">' +
        (S(R('Teor dos autos')) ? '<div class="tr-teor">' + linhas(R('Teor dos autos')) + '</div>' : '') +
        pecas.map(function (p) { return '<div class="tr-pc"><div class="tr-pch"><b>' + esc(p.peca) + '</b> <button type="button" class="mono lnk" data-copia="' + esc(p.id) + '" title="Copiar o ID">ID ' + esc(p.id) + '</button> <span class="muted">' + esc(p.data) + '</span></div>' +
          (p.pje ? '<div class="muted tr-pjx">' + esc(p.pje) + '</div>' : '') + (p.nota ? '<p class="tr-n">' + esc(p.nota) + '</p>' : '') + (p.trecho ? '<blockquote class="tr-q">' + esc(p.trecho) + '</blockquote>' : '') + '</div>'; }).join('') + '</div></section>';
    var cab = '<section class="card pc-sec tr-reg"><div class="pc-sh"><h3>Registro da triagem</h3><small class="muted">' + esc(R('Lote') || 'sem registro em lote') + '</small></div>' +
      (R('Assunto detalhado') ? '<p class="tr-ad">' + esc(R('Assunto detalhado')) + '</p>' : '') +
      '<div class="bar"><button type="button" class="btn line" data-t="cmp">Comparar o editor com a triagem</button>' + (R('Lote') ? '<a class="btn line" target="_blank" rel="noopener noreferrer" href="' + Muta.SITE + '/caput/triagem">Abrir o Caput</a>' : '') + '</div></section>';
    return cab + h;
  });
}
window.MutaTriagem = {
  etiquetasDe: etiquetasDe, registroDe: registroDe,
  abrir: function () { carregar(false); },
  render: function () { render(); },
  /* para a aba Comparar: proposta, modelo do grupo e números dos precedentes citados na triagem */
  dados: function () {
    var t = (T.op || {}).triagem || {};
    var txtTudo = [R('Proposta'), R('Grupo'), t['Hipóteses Monocrática'], gravado('producao', 'Mono - Fundamento')].join(' ');
    var nums = []; (txtTudo.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g) || []).forEach(function (n) { if (nums.indexOf(n) < 0 && n !== T.cnj) nums.push(n); });
    return { cnj: T.cnj, proposta: S(R('Proposta')), grupo: S(R('Grupo')), modelo: S(R('Modelo')), precedentes: nums };
  },
  garantir: function () { var c = cnjAtual(); if (c && c === T.cnj && T.op) return Promise.resolve(); T.cnj = ''; T.erro = ''; carregar(true, true); return new Promise(function (ok) { var n = 0; (function esp() { if ((T.op && T.cnj) || T.erro || ++n > 60) ok(); else setTimeout(esp, 250); })(); }); }
};
})();
