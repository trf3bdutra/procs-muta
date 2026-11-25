/* Muta · conformidade (0.42: aba própria da Minuta — Comparar | Gerador | Conformidade; até a 0.41, rodapé fixo)
   Painel ativável: com "Conformidade ativa", o painel relê o editor da minuta no PJe a cada poucos segundos e refaz a
   análise quando o texto muda (só lê; não altera o editor). O motor está em conformidade-motor.js; as regras de redação
   vêm do pacote do gabinete (fontes.js) e o contexto do caso, do prontuário e do cartão da pauta. */
(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
var MO = window.MutaConformidadeMotor, ED = window.MutaEditor, FT = window.MutaFontes, br = window.MutaProntuarioBridge, esc = window.MutaComparador.esc;
var caixa = $('conf-app'), PREF = 'muta-pje:conformidade';
var K = { ativa: false, fmt: true, grupo: '', r: null, dados: null, erroDados: '', em: 0, hash: 0 };
try { var g = JSON.parse(localStorage.getItem(PREF) || '{}'); K.ativa = !!g.ativa; K.fmt = g.fmt !== false; } catch (e) {}
function guarda() { try { localStorage.setItem(PREF, JSON.stringify({ ativa: K.ativa, fmt: K.fmt })); } catch (e) {} }
function aberta() { var p = $('panel-min'), w = $('min-conf'); return p && !p.hidden && !(w && w.hidden); }
/* rodapé: aberto ou recolhido (lembrado neste navegador) */
var ROD = 'muta-pje:conf-rodape';
function rodape(abrir) {
  var w = $('min-conf'), t = $('mc-t'); if (!w || !t) return;
  if (abrir != null) { try { localStorage.setItem(ROD, abrir ? '1' : '0'); } catch (e) {} }
  var on = false; try { on = localStorage.getItem(ROD) === '1'; } catch (e) {}
  w.dataset.aberto = on ? '1' : '0'; t.setAttribute('aria-expanded', String(on));
}
var SEVR = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
var PECA = { acordao: 'acórdão (relatório, voto, ementa e acórdão)', decisao: 'decisão monocrática', despacho: 'despacho', texto: 'texto sem estrutura de peça reconhecida' };

function contexto() {
  var s = window.MutaSincronia ? window.MutaSincronia.situacao() : {}, c = (s.cartoes || [])[0];
  var f = null; try { f = br.getFull(); } catch (e) {}
  /* 0.40: a cronologia lida na aba Autos (IDʼs × peças) e as questões do prontuário (enfrentamento no voto) */
  var au = null, q = '';
  try { au = window.MutaAutos && window.MutaAutos.doProcesso ? window.MutaAutos.doProcesso() : null; } catch (e) {}
  try { q = window.MutaGabinete && window.MutaGabinete.V ? String(window.MutaGabinete.V('triagem', 'Alegações') || '') : ''; } catch (e) {}
  return { diretrizes: (K.dados || {}).diretrizes || [], manual: (K.dados || {}).manual || [], prontuario: f, cartao: c ? c.cartao : null,
    classe: (f && f.caso ? f.caso.classe : '') || (window.MutaPje ? window.MutaPje.classe() : ''), formatacao: K.fmt,
    autos: au ? au.lista.map(function (d) { return { id: d.id, tipo: d.tipo, desc: d.desc, data: d.data, k: d.k }; }) : null, autosTodos: !!(au && au.todos),
    questoes: q.split(/\n+/).map(function (x) { return x.replace(/^✓\s*/, '').trim(); }).filter(Boolean) };
}
function analisar() {
  var E = ED.estado();
  if (!E.texto) { K.r = null; badge(); render(); return; }
  K.r = MO.analisar(E.paragrafos || [], contexto()); K.em = Date.now();
  badge(); render();
}
function badge() {
  var m = $('mc-resumo'), w = $('min-conf');
  /* no título da aba: só a nota (as contagens ficam na própria aba e no número ao lado) */
  if (m) m.innerHTML = K.r ? '<b>' + K.r.nota + '</b>/100' : (ED.estado().texto ? 'analisando…' : 'leia o editor');
  if (w) w.dataset.sev = K.r ? (K.r.resumo.alta ? 'alta' : K.r.resumo.media ? 'media' : 'ok') : '';
  var b2 = $('mm-conf-n'); if (b2) { var n2 = K.r ? K.r.resumo.alta + K.r.resumo.media : 0; b2.textContent = K.r ? String(n2) : ''; b2.hidden = !K.r; b2.dataset.sev = K.r && K.r.resumo.alta ? 'alta' : n2 ? 'media' : 'ok'; }
  var b = $('conf-badge'); if (!b) return;
  var n = K.r ? K.r.resumo.alta + K.r.resumo.media : 0;
  b.textContent = K.r ? String(n) : ''; b.hidden = !K.r; b.dataset.sev = K.r && K.r.resumo.alta ? 'alta' : n ? 'media' : 'ok';
  b.title = K.r ? K.r.resumo.alta + ' alta(s), ' + K.r.resumo.media + ' média(s), ' + K.r.resumo.baixa + ' baixa(s)' : '';
}
function trecho(t) {
  if (!t) return '';
  return '<blockquote class="cf-tr">' + esc(t.antes) + (t.alvo ? '<mark>' + esc(t.alvo) + '</mark>' : '') + esc(t.depois) + '</blockquote>';
}
var SECN = { cabecalho: 'cabeçalho', relatorio: 'relatório', voto: 'voto', ementa: 'ementa', acordao: 'acórdão' };
function itemHtml(x) {
  return '<li class="cf-it" data-sev="' + x.sev + '"><div class="cf-it-h"><span class="cf-sev">' + SEVR[x.sev] + '</span><span class="cf-g">' + esc(x.grupo) + '</span><span class="cf-r">' + esc(x.regra) + '</span>' +
    (x.sec ? '<span class="cf-pos">' + esc(SECN[x.sec] || x.sec) + (x.par != null ? ' · § ' + (x.par + 1) : '') + '</span>' : '') + '</div>' +
    '<p>' + esc(x.msg) + '</p>' + trecho(x.trecho) + (x.sug ? '<p class="cf-sug">Sugestão: <b>' + esc(x.sug) + '</b></p>' : '') + '</li>';
}
function render() {
  if (!caixa || !aberta()) return;
  var E = ED.estado(), r = K.r, y = $('panel-conf').scrollTop;
  var topo = '<div class="cf-top card"><label class="cf-sw"><input type="checkbox" data-k="ativa"' + (K.ativa ? ' checked' : '') + '><span></span><b>Conformidade ativa</b></label>' +
    ''+
    '<div class="bar"><button type="button" class="btn solid sm" data-k="agora"' + (E.lendo ? ' disabled' : '') + '>' + (E.lendo ? 'Lendo…' : 'Analisar agora') + '</button>' +
    (r ? '<button type="button" class="btn line sm" data-k="copiar">Copiar relatório</button><button type="button" class="btn line sm" data-k="cheia" title="Abre a conformidade numa janela do tamanho da tela; acompanha as novas análises">Tela cheia</button>' : '') +
    '<label class="cf-fmt" title="Confere negrito, itálico e recuo"><input type="checkbox" data-k="fmt"' + (K.fmt ? ' checked' : '') + '> formatação</label></div>' +
    (K.erroDados ? '<p class="status err">' + esc(K.erroDados) + ' A análise segue sem as regras de redação do Compendium.</p>' : '') +
    (E.erro ? '<p class="status err">' + esc(E.erro) + '</p>' : '') +
    (E.texto ? '<p class="muted cf-fonte">Texto: ' + esc(E.fonte) + (K.em ? ' · analisado às ' + new Date(K.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '') + '</p>' : '') + '</div>';
  if (!r) { caixa.innerHTML = topo + '<div class="empty"><h3>Nada analisado</h3>Abra a minuta no editor do PJe e clique em Analisar agora, ou ligue a conformidade ativa.</div>'; return; }
  var grupos = {}; r.itens.forEach(function (x) { grupos[x.grupo] = (grupos[x.grupo] || 0) + 1; });
  var lista = r.itens.filter(function (x) { return !K.grupo || x.grupo === K.grupo; });
  var resumo = '<div class="cf-res card"><div class="cf-nota" data-n="' + (r.nota >= 85 ? 'ok' : r.nota >= 60 ? 'med' : 'mau') + '"><b>' + r.nota + '</b><small>de 100</small></div>' +
    '<div><p><b>' + esc(PECA[r.peca] || r.peca) + '</b>' + (r.resultado ? ' · resultado: ' + esc(MO.RES_TXT[r.resultado]) : '') + '</p>' +
    '<p class="cf-cont"><span data-sev="alta">' + r.resumo.alta + ' alta</span><span data-sev="media">' + r.resumo.media + ' média</span><span data-sev="baixa">' + r.resumo.baixa + ' baixa</span></p>' +
    '</div></div>';
  var filtros = '<div class="seg cf-grupos"><button type="button" data-g="" aria-selected="' + !K.grupo + '">Todos · ' + r.itens.length + '</button>' +
    Object.keys(grupos).map(function (gq) { return '<button type="button" data-g="' + esc(gq) + '" aria-selected="' + (K.grupo === gq) + '">' + esc(gq) + ' · ' + grupos[gq] + '</button>'; }).join('') + '</div>';
  var corpoCf = resumo + (r.itens.length ? '<ul class="cf-lista">' + r.itens.map(itemHtml).join('') + '</ul>' : '<div class="empty"><h3>Nada a apontar</h3></div>');
  if (window.MutaJanela) window.MutaJanela.atualizar('conformidade', 'Conformidade da minuta', corpoCf);
  K.cheia = corpoCf;
  /* 0.45: a comparação com a minuta-matriz do processo mora aqui (saiu da aba Comparar) */
  var mxh = ''; try { mxh = window.MutaComparar && window.MutaComparar.estruturaConformidade ? window.MutaComparar.estruturaConformidade(render) : ''; } catch (e) {}
  caixa.innerHTML = topo + resumo + mxh + (r.itens.length ? filtros + '<ul class="cf-lista">' + lista.map(itemHtml).join('') + '</ul>' : '<div class="empty"><h3>Nada a apontar</h3>A minuta segue a estrutura e as regras conferidas. Confira os autos antes de liberar.</div>') ;
  $('panel-conf').scrollTop = y;
}
function relatorioTexto() {
  var r = K.r; if (!r) return '';
  var E = ED.estado(), f = contexto().prontuario;
  return ['Conformidade · ' + ((f && f.caso && f.caso.numero) || E.numero || 'minuta') + ' · ' + new Date().toLocaleString('pt-BR'), 'Peça: ' + (PECA[r.peca] || r.peca) + ' · nota ' + r.nota + ' · ' + r.resumo.alta + ' alta, ' + r.resumo.media + ' média, ' + r.resumo.baixa + ' baixa', '']
    .concat(r.itens.map(function (x, i) { return (i + 1) + '. [' + SEVR[x.sev] + '] ' + x.grupo + ' · ' + x.regra + (x.sec ? ' · ' + (SECN[x.sec] || x.sec) + (x.par != null ? ' § ' + (x.par + 1) : '') : '') + '\n   ' + x.msg + (x.trecho && x.trecho.alvo ? '\n   Trecho: …' + x.trecho.alvo + '…' : '') + (x.sug ? '\n   Sugestão: ' + x.sug : ''); })).join('\n');
}
function carregarDados() {
  FT.base().then(function (d) { K.dados = d; K.erroDados = ''; if (ED.estado().texto) analisar(); }, function (e) { K.erroDados = 'Regras de redação indisponíveis (' + e.message + ').'; render(); });
}
caixa.addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.k === 'agora') { ED.ler().then(analisar, function () { render(); }); return; }
  if (b.dataset.k === 'copiar') { (navigator.clipboard ? navigator.clipboard.writeText(relatorioTexto()) : Promise.reject()).then(function () { b.textContent = 'Copiado'; setTimeout(function () { b.textContent = 'Copiar o relatório'; }, 1400); }, function () {}); return; }
  if (b.dataset.g != null) { K.grupo = b.dataset.g; render(); return; }
  if (b.dataset.k === 'cheia') { if (window.MutaJanela && K.cheia) window.MutaJanela.abrir('conformidade', 'Conformidade da minuta', K.cheia); return; }
});
caixa.addEventListener('change', function (e) {
  var t = e.target, k = t.dataset && t.dataset.k;
  if (k === 'ativa') { K.ativa = t.checked; guarda(); ED.automatico(K.ativa); render(); }
  else if (k === 'fmt') { K.fmt = t.checked; guarda(); analisar(); }
});
ED.ouvir(function () { analisar(); });
document.addEventListener('muta:prontuario', function () { if (ED.estado().texto) analisar(); });
document.addEventListener('muta:autos', function () { if (ED.estado().texto) analisar(); }); /* 0.40: autos lidos → IDʼs conferidos */
(function () { var t = $('mc-t'); if (t) t.addEventListener('click', function () { var w = $('min-conf'); rodape(!(w && w.dataset.aberto === '1')); render(); }); rodape(); })();
window.MutaConformidade = {
  /* 0.51: o mesmo contexto (prontuário, autos, questões) para a Conformidade da versão no CORTEX */
  contexto: function () { try { return contexto(); } catch (e) { return {}; } },
  abrir: function () { if (!K.dados && !K.erroDados) carregarDados(); render(); var E = ED.estado(); if (!E.texto && !E.lendo) ED.ler().then(analisar, function () { render(); }); },
  ativa: function () { return K.ativa; }
};
carregarDados();
if (K.ativa) ED.automatico(true);
})();
