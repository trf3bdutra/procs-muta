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

/* janela grande da extensão (janela.html): comparação lado a lado, folha do editor, conformidade em tela cheia */
(function () {
  var JAN = {};
  function guardar(chave, titulo, html) { var o = {}; o['muta-janela:' + chave] = { titulo: titulo, html: html, em: Date.now() }; return chrome.storage.session.set(o); }
  window.MutaJanela = {
    abrir: function (chave, titulo, html) {
      if (!(window.chrome && chrome.storage && chrome.windows)) { var w = window.open('', '_blank'); if (w) { w.document.write('<!doctype html><meta charset=utf-8><title>' + titulo + '</title><link rel=stylesheet href="painel.css"><link rel=stylesheet href="janela.css"><body class=janela><header class=jn-h><b>' + titulo + '</b></header><main class=jn-c>' + html + '</main>'); w.document.close(); } return Promise.resolve(); }
      return guardar(chave, titulo, html).then(function () {
        var url = chrome.runtime.getURL('janela.html#' + chave), id = JAN[chave];
        var criar = function () { return chrome.windows.create({ url: url, type: 'popup', width: Math.round(screen.availWidth * 0.94), height: Math.round(screen.availHeight * 0.92), left: Math.round(screen.availWidth * 0.03), top: Math.round(screen.availHeight * 0.03) }).then(function (w) { JAN[chave] = w.id; }); };
        if (id == null) return criar();
        return chrome.windows.update(id, { focused: true }).catch(criar);
      });
    },
    /* atualiza o conteúdo de uma janela já aberta (não abre outra) */
    atualizar: function (chave, titulo, html) { if (JAN[chave] == null || !(window.chrome && chrome.storage)) return; guardar(chave, titulo, html).catch(function () {}); },
    aberta: function (chave) { return JAN[chave] != null; }
  };
  try { chrome.windows.onRemoved.addListener(function (id) { Object.keys(JAN).forEach(function (k) { if (JAN[k] === id) delete JAN[k]; }); }); } catch (e) {}
})();
