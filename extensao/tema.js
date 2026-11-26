/* Muta · tema do painel: claro por padrão desde 0.77.55 (antes escuro); o escuro segue nas cores do Ex Officio escuro; o botão ◐ alterna e a escolha fica neste navegador.
   Carregado no <head> para o painel já abrir no tema certo. */
(function () {
  'use strict';
  var K = 'muta-pje:tema', h = document.documentElement;
  function ler() { try { return localStorage.getItem(K) || 'claro'; } catch (e) { return 'claro'; } }
  function aplicar(t) { h.dataset.tema = t; var b = document.getElementById('pje-tema'); if (b) b.title = t === 'escuro' ? 'Tema claro' : 'Tema escuro'; }
  aplicar(ler());
  document.addEventListener('DOMContentLoaded', function () {
    aplicar(ler());
    var b = document.getElementById('pje-tema');
    if (b) b.addEventListener('click', function () { var t = h.dataset.tema === 'escuro' ? 'claro' : 'escuro'; try { localStorage.setItem(K, t); } catch (e) {} aplicar(t); });
  });
  window.MutaTema = { aplicar: aplicar, atual: function () { return h.dataset.tema; } };
})();
