/* Muta · OCR local de PDF digitalizado (0.12)
   Usa o Tesseract (vendor/tesseract, modelo em português) dentro da própria extensão: nada sai do computador.
   MutaOcr.paginas(pdf, lista, aviso) recebe o documento já aberto pelo pdf.js e devolve o texto das páginas pedidas,
   na ordem. Cada página é desenhada num canvas (cerca de 200 dpi) e lida pelo Tesseract.
   Um só leitor fica aberto; ele se fecha sozinho depois de 3 minutos parado. */
(function () {
  'use strict';
  var ESCALA = 2.8, OCIOSO = 180000;
  var leitor = null, tFecha = 0, fila = Promise.resolve();

  function url(p) { return (window.chrome && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL(p) : new URL(p, location.href).href; }
  function simd() {
    try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (e) { return false; }
  }
  function abrir() {
    clearTimeout(tFecha);
    if (leitor) return leitor;
    var T = window.Tesseract;
    if (!T || !T.createWorker) return Promise.reject(new Error('OCR indisponível nesta versão do painel'));
    leitor = T.createWorker('por', 1, {
      workerPath: url('vendor/tesseract/worker.min.js'),
      corePath: url('vendor/tesseract/' + (simd() ? 'tesseract-core-simd-lstm.wasm.js' : 'tesseract-core-lstm.wasm.js')),
      langPath: url('vendor/tesseract'),
      gzip: true, cacheMethod: 'none', workerBlobURL: false
    }).then(function (w) { return w.setParameters({ preserve_interword_spaces: '1' }).then(function () { return w; }); },
      function (e) { leitor = null; throw new Error('OCR não iniciou: ' + (e && e.message || e)); });
    return leitor;
  }
  function soltar() {
    clearTimeout(tFecha);
    tFecha = setTimeout(function () { var l = leitor; leitor = null; if (l) l.then(function (w) { return w.terminate(); }).catch(function () {}); }, OCIOSO);
  }
  function desenhar(pg) {
    var vp = pg.getViewport({ scale: ESCALA }), c = document.createElement('canvas');
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    var cx = c.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);
    return pg.render({ canvasContext: cx, viewport: vp }).promise.then(function () { return c; });
  }
  /* texto do OCR: junta hífen de fim de linha e tira espaços sobrando */
  function limpar(t) { return String(t || '').replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(); }

  /* as páginas passam uma de cada vez pelo mesmo leitor, mesmo com vários documentos pedidos ao mesmo tempo */
  function paginas(pdf, lista, aviso) {
    var job = fila.then(function () {
      return abrir().then(function (w) {
        var out = {}, p = Promise.resolve(), feitas = 0;
        lista.forEach(function (k) {
          p = p.then(function () { return pdf.getPage(k); }).then(desenhar).then(function (c) { return w.recognize(c); }).then(function (r) {
            out[k] = limpar(r && r.data && r.data.text); feitas++;
            if (aviso) aviso(feitas, lista.length);
          });
        });
        return p.then(function () { return out; });
      });
    });
    fila = job.then(soltar, soltar);
    return job;
  }
  window.MutaOcr = { paginas: paginas, limpar: limpar, disponivel: function () { return !!(window.Tesseract && window.Tesseract.createWorker); } };
})();
