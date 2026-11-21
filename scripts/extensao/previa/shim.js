/* Prévia do painel da extensão Muta (/extensao/previa/): faz o papel do Chrome quando o painel roda fora da extensão.
   Carregado no painel.html da prévia antes dos outros scripts (scripts/extensao/previa.py monta a pasta).
   - chrome.storage.session guarda o registro da "aba do PJe" ("aba:1") que a página de fora manda ('previa-aba');
   - chrome.tabs.sendMessage leva à página de fora os pedidos de leitura do editor e dos autos ('previa-pedido') e
     devolve a resposta ('previa-resposta'), como o conteudo-pje.js faria no PJe;
   - por padrão, nada é gravado: POST, PUT e DELETE à API (fora o login) voltam com erro 423 e são listados na página
     de fora ('previa-bloqueio'); "Gravar de verdade" ('previa-grava') libera.
   Os arquivos do painel são os mesmos da extensão publicada; só este arquivo e a troca do endereço do site são da prévia. */
(function () {
  'use strict';
  var P = window.parent !== window ? window.parent : null;
  var ABA = 1, sess = {}, loc = {}, ouv = [], pend = {}, seq = 0, grava = false;

  function mudou(area, k, o, n) {
    var ch = {}; ch[k] = { oldValue: o, newValue: n };
    ouv.forEach(function (f) { try { f(ch, area); } catch (e) {} });
  }
  function chaves(k, banco) {
    if (k == null) return Object.keys(banco);
    if (Array.isArray(k)) return k;
    if (typeof k === 'string') return [k];
    return Object.keys(k);
  }
  function resp(v, cb) { if (typeof cb === 'function') { setTimeout(function () { cb(v); }, 0); return undefined; } return Promise.resolve(v); }
  function area(banco, nome) {
    return {
      get: function (k, cb) {
        var o = {};
        chaves(k, banco).forEach(function (c) {
          if (Object.prototype.hasOwnProperty.call(banco, c)) o[c] = banco[c];
          else if (k && typeof k === 'object' && !Array.isArray(k)) o[c] = k[c];
        });
        return resp(JSON.parse(JSON.stringify(o)), cb);
      },
      set: function (o, cb) { Object.keys(o || {}).forEach(function (c) { var a = banco[c]; banco[c] = o[c]; mudou(nome, c, a, o[c]); }); return resp(undefined, cb); },
      remove: function (k, cb) { chaves(k, banco).forEach(function (c) { var a = banco[c]; delete banco[c]; mudou(nome, c, a, undefined); }); return resp(undefined, cb); },
      clear: function (cb) { Object.keys(banco).forEach(function (c) { delete banco[c]; }); return resp(undefined, cb); }
    };
  }

  /* manifesto (versão exibida no painel): lido de forma síncrona, como o chrome.runtime.getManifest() */
  var manifesto = {};
  try { var x = new XMLHttpRequest(); x.open('GET', 'manifest.json', false); x.send(); manifesto = JSON.parse(x.responseText); } catch (e) {}

  /* pedido de leitura à "aba do PJe" (a página de fora) */
  function pedir(msg) {
    if (!P) return Promise.reject(new Error('Could not establish connection. Receiving end does not exist.'));
    var id = ++seq;
    return new Promise(function (ok, er) {
      pend[id] = { ok: ok, er: er };
      P.postMessage({ tipo: 'previa-pedido', id: id, msg: msg }, '*');
      setTimeout(function () { if (pend[id]) { delete pend[id]; er(new Error('Could not establish connection. Receiving end does not exist.')); } }, 5000);
    });
  }

  var nada = { addListener: function () {}, removeListener: function () {}, hasListener: function () { return false; } };
  window.chrome = window.chrome || {};
  window.chrome.storage = {
    session: area(sess, 'session'),
    local: area(loc, 'local'),
    onChanged: { addListener: function (f) { ouv.push(f); }, removeListener: function (f) { ouv = ouv.filter(function (g) { return g !== f; }); } }
  };
  window.chrome.tabs = {
    query: function (q, cb) { return resp([{ id: ABA, windowId: 1, active: true, url: 'https://pje2g.trf3.jus.br/pje/' }], cb); },
    sendMessage: function (id, msg) { return pedir(msg); },
    onActivated: nada, onUpdated: nada, onRemoved: nada
  };
  window.chrome.windows = { WINDOW_ID_NONE: -1, onFocusChanged: nada };
  window.chrome.runtime = {
    id: 'muta-previa', lastError: undefined,
    getManifest: function () { return manifesto; },
    getURL: function (p) { return new URL(p, location.href).href; },
    sendMessage: function () { return Promise.resolve(); },
    onMessage: nada, onInstalled: nada, onStartup: nada
  };
  window.chrome.sidePanel = { setPanelBehavior: function () { return Promise.resolve(); } };
  window.chrome.scripting = { executeScript: function () { return Promise.resolve([]); } };

  window.addEventListener('message', function (e) {
    if (!P || e.source !== P || !e.data) return;
    var d = e.data;
    if (d.tipo === 'previa-aba') { var a = sess['aba:' + ABA]; sess['aba:' + ABA] = d.reg; mudou('session', 'aba:' + ABA, a, d.reg); }
    else if (d.tipo === 'previa-resposta' && pend[d.id]) {
      var p = pend[d.id]; delete pend[d.id];
      if (d.erro) p.er(new Error(d.erro)); else p.ok(d.r);
    }
    else if (d.tipo === 'previa-grava') grava = !!d.on;
  });

  /* nada é gravado na prévia, a não ser com "Gravar de verdade" */
  var f0 = window.fetch.bind(window);
  window.fetch = function (u, op) {
    var m = String((op && op.method) || (u && u.method) || 'GET').toUpperCase(), url = String((u && u.url) || u);
    if (m !== 'GET' && m !== 'HEAD' && !grava && !/\/api\/login(\?|$)/.test(url)) {
      if (P) P.postMessage({ tipo: 'previa-bloqueio', metodo: m, url: url.replace(location.origin, '') }, '*');
      return Promise.resolve(new Response(JSON.stringify({ erro: 'Prévia do painel: nada é gravado (ligue "Gravar de verdade" na página da prévia).' }),
        { status: 423, headers: { 'Content-Type': 'application/json' } }));
    }
    return f0(u, op);
  };
  if (navigator.sendBeacon) {
    var b0 = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, dados) {
      if (!grava) { if (P) P.postMessage({ tipo: 'previa-bloqueio', metodo: 'BEACON', url: String(url).replace(location.origin, '') }, '*'); return true; }
      return b0(url, dados);
    };
  }
  if (P) P.postMessage({ tipo: 'previa-pronto' }, '*');
})();
