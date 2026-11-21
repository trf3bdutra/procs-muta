/* HERO18810 · janela aberta pela notificação de decisão para assinar ou de dúvida (0.36)
   cmt.html#as:<CNJ> ou cmt.html#du:<id>: o item da notificação vem primeiro, destacado, com as ações
   (marcar assinada, devolver, responder), como nos demais avisos do app. */
(function () {
  'use strict';
  var raiz = document.getElementById('raiz'), V = null;
  var m = /^#(as|du):(.+)$/.exec(decodeURIComponent(location.hash || '')), foco = m ? { t: m[1], id: m[2] } : null;
  var enviar = function (msg) { return chrome.runtime.sendMessage(msg); };
  function pintar() { raiz.innerHTML = window.MutaCmt.html(V, { janela: true, foco: foco }); }
  window.MutaCmt.css(document);
  window.MutaCmt.bind(raiz, enviar, function (dados) { if (dados) V = dados; pintar(); });
  pintar();
  enviar({ tipo: 'muta-cmt', forcar: true }).then(function (v) { V = v || { erro: 'Quadro indisponível agora.' }; pintar(); }, function () { V = { erro: 'Recarregue a extensão.' }; pintar(); });
})();
