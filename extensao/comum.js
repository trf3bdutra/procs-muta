/* Muta · utilidades comuns do painel */
(function () {
  'use strict';
  /* Site do gabinete (Vercel): Compêndio, série histórica e pacote da extensão */
  var SITE = 'https://www.gabinete-cmt.com';

  /* Confirmação no próprio painel (o painel lateral não deve depender de window.confirm). */
  function confirmar(msg, rotuloOk) {
    var d = document.getElementById('muta-dialogo');
    if (!d || typeof d.showModal !== 'function') return Promise.resolve(window.confirm(msg));
    document.getElementById('muta-dialogo-msg').textContent = msg;
    document.getElementById('muta-dialogo-ok').textContent = rotuloOk || 'Confirmar';
    d.returnValue = '';
    return new Promise(function (ok) {
      d.addEventListener('close', function f() { d.removeEventListener('close', f); ok(d.returnValue === 'sim'); });
      d.showModal();
    });
  }

  /* Baixa um arquivo, descompactando gzip quando preciso (o servidor pode ou não descompactar). */
  function baixarTexto(url) {
    return fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'default' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' em ' + url.replace(SITE, ''));
      return r.arrayBuffer();
    }).then(function (b) {
      var u = new Uint8Array(b);
      if (u[0] === 0x1f && u[1] === 0x8b) {
        if (typeof DecompressionStream === 'undefined') throw new Error('navegador sem descompressão (DecompressionStream)');
        return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      }
      return new TextDecoder('utf-8').decode(u);
    });
  }

  /* Chave estável do processo: os 20 dígitos do número CNJ. */
  function chaveProcesso(numero) {
    var d = String(numero || '').replace(/\D/g, '');
    return d.length === 20 ? d : '';
  }
  function formatarCnj(d) {
    d = String(d || '').replace(/\D/g, '');
    if (d.length !== 20) return d;
    return d.slice(0, 7) + '-' + d.slice(7, 9) + '.' + d.slice(9, 13) + '.' + d.slice(13, 14) + '.' + d.slice(14, 16) + '.' + d.slice(16);
  }

  window.Muta = {
    SITE: SITE,
    confirmar: confirmar,
    baixarTexto: baixarTexto,
    chaveProcesso: chaveProcesso,
    formatarCnj: formatarCnj,
    versao: (window.chrome && chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest().version : ''
  };
})();
