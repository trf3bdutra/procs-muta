/* Muta · o texto do editor da minuta no PJe, compartilhado pelas abas Comparar e Conformidade.
   Lê pelo conteudo-pje.js (só leitura), guarda a última leitura e avisa quem depende dela. A leitura automática
   (Conformidade ativa) relê a cada poucos segundos, só com o painel visível, e só avisa quando o texto muda. */
(function () {
'use strict';
var E = { texto: '', paragrafos: [], fonte: '', numero: '', colado: false, em: 0, erro: '', lendo: false };
var ouvintes = [], auto = { ligado: false, t: null, ms: 4000 };
function avisar() { ouvintes.forEach(function (f) { try { f(E); } catch (e) {} }); }
function hash(t) { var h = 0, s = String(t || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
function ler(silencioso) {
  if (!window.MutaPje || !window.MutaPje.lerEditor) return Promise.reject(new Error('Fora da extensão: sem acesso ao PJe.'));
  if (!silencioso) { E.lendo = true; avisar(); }
  return window.MutaPje.lerEditor().then(function (r) {
    var mudou = hash(r.texto) !== hash(E.texto) || JSON.stringify(r.paragrafos||[]) !== JSON.stringify(E.paragrafos||[]) || E.colado;
    E.texto = r.texto; E.paragrafos = r.paragrafos || String(r.texto || '').split(/\n+/).map(function (t) { return { t: t.trim() }; }).filter(function (p) { return p.t; });
    E.fonte = r.fonte + (r.outros ? ' · ' + (r.outros + 1) + ' editores na página; usado o maior visível' : ''); E.numero = r.numero || ''; E.colado = false; E.erro = ''; E.em = Date.now();
    E.lendo = false;
    if (mudou || !silencioso) avisar();
    return E;
  }, function (e) {
    E.lendo = false;
    if (!silencioso) { E.erro = e.message; avisar(); }
    throw e;
  });
}
function colar(texto) {
  E.texto = String(texto || ''); E.paragrafos = E.texto.split(/\n+/).map(function (t) { return { t: t.trim() }; }).filter(function (p) { return p.t; });
  E.fonte = 'texto colado'; E.numero = ''; E.colado = !!E.texto.trim(); E.erro = ''; E.em = Date.now(); avisar();
}
function ciclo() {
  clearTimeout(auto.t);
  if (!auto.ligado) return;
  auto.t = setTimeout(function () {
    if (document.hidden || E.colado) { ciclo(); return; }
    ler(true).catch(function () {}).then(ciclo);
  }, auto.ms);
}
document.addEventListener('visibilitychange', function () { if (!document.hidden && auto.ligado) ciclo(); });
window.MutaEditor = {
  estado: function () { return E; }, ler: ler, colar: colar,
  ouvir: function (f) { ouvintes.push(f); },
  automatico: function (on) { auto.ligado = !!on; if (on) { ler(true).catch(function () {}); ciclo(); } else clearTimeout(auto.t); },
  automaticoLigado: function () { return auto.ligado; }
};
})();
