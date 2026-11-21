/* Ponte do GitHub (Ab Initio · Triagem e motor do acervo).
   1) Chamada à API do trf3bdutra/procs-muta com o token-sentinela "ponte" vai para /api/acesso?gh=1, que usa o token guardado na Vercel.
      Assim ninguém precisa colar token no navegador: vale a sessão da Ex Officio (nome e senha).
      Corpo grande segue comprimido (gzip); resposta comprimida pela ponte é descomprimida aqui. Token pessoal continua funcionando.
   2) Arquivos grandes do acervo (fonte, operacional) ficam guardados neste navegador (IndexedDB) com o sha do GitHub:
      a cada abertura confere só o sha (consulta leve) e baixa de novo apenas se o arquivo mudou.
      Pedidos iguais ao mesmo tempo (motor e Triagem usam o mesmo ProcsMuta) compartilham um único download. */
(function () {
  if (window.__ghPonte) return;
  var BASE = 'https://api.github.com/repos/trf3bdutra/procs-muta', F = window.fetch.bind(window), SENT = 'ponte';
  var GUARDA = /^contents\/acervo\/(fonte|operacional|operacional-arquivo|importado)\.json$/;
  window.__ghPonte = { SENT: SENT };
  function gz(txt) { return new Response(new Blob([txt]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(); }

  /* ---------- cópia guardada (IndexedDB) ---------- */
  var DBP = null;
  function db() { if (DBP) return DBP; DBP = new Promise(function (ok, er) { try { var r = indexedDB.open('abinitio-gh', 1); r.onupgradeneeded = function () { r.result.createObjectStore('arq'); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { er(r.error); }; } catch (e) { er(e); } }).catch(function () { return null; }); return DBP; }
  function idb(modo, fn) { return db().then(function (d) { if (!d) return null; return new Promise(function (ok) { try { var t = d.transaction('arq', modo), q = fn(t.objectStore('arq')); t.oncomplete = function () { ok(q && q.result); }; t.onerror = t.onabort = function () { ok(null); }; } catch (e) { ok(null); } }); }); }
  var lerC = function (k) { return idb('readonly', function (s) { return s.get(k); }); };
  var gravarC = function (k, v) { return idb('readwrite', function (s) { return s.put(v, k); }); };

  /* ---------- envio: direto ao GitHub (token pessoal) ou pela ponte (sessão) ---------- */
  async function enviar(url, init, h) {
    if ((h.get('Authorization') || '') !== 'Bearer ' + SENT) return F(url, Object.assign({}, init, { headers: h }));
    var resto = url.slice(BASE.length).replace(/^\//, ''), metodo = String(init.method || 'GET').toUpperCase(), corpo = init.body, H = { 'X-Ponte-Accept': h.get('Accept') || 'application/vnd.github+json' };
    if (corpo != null) {
      if (typeof corpo === 'string' && corpo.length > 1e6 && window.CompressionStream) { corpo = await gz(corpo); H['X-Ponte-Gz'] = '1'; H['Content-Type'] = 'application/octet-stream'; }
      else H['Content-Type'] = 'application/json';
    }
    var r = await F('/api/acesso?gh=1&p=' + encodeURIComponent(resto), { method: metodo, body: corpo, headers: H, cache: 'no-store', credentials: 'same-origin' });
    if (r.headers.get('X-Ponte-Gz') !== '1') return r;
    var txt = await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text();
    return new Response(txt, { status: r.status, headers: { 'Content-Type': r.headers.get('X-Ponte-Tipo') || 'application/json' } });
  }

  /* ---------- arquivo grande: confere o sha; se igual, usa a cópia guardada ---------- */
  async function grande(caminho, url, init, h) {
    var meta = new Headers(h); meta.set('Accept', 'application/vnd.github+json');
    var mr = null; try { mr = await enviar(BASE + '/' + caminho + '?ref=main&t=' + Date.now(), { method: 'GET', cache: 'no-store' }, meta); } catch (e) {}
    var sha = ''; if (mr && mr.ok) { try { sha = (await mr.json()).sha || ''; } catch (e) {} }
    if (sha) { var c = await lerC(caminho); if (c && c.sha === sha && typeof c.txt === 'string') return { s: 200, t: c.txt, ct: 'text/plain', cache: true }; }
    var r = await enviar(url, init, h), t = await r.text();
    if (r.ok && sha) gravarC(caminho, { sha: sha, txt: t, em: Date.now() });
    return { s: r.status, t: t, ct: r.headers.get('Content-Type') || 'text/plain' };
  }
  var VOO = {};
  window.fetch = async function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(BASE) !== 0) return F(input, init);
    init = init || {};
    var h = new Headers(init.headers || (typeof input !== 'string' && input.headers) || {}), metodo = String(init.method || 'GET').toUpperCase();
    var caminho = url.slice(BASE.length).replace(/^\//, '').split('?')[0];
    if (metodo === 'GET' && GUARDA.test(caminho) && /raw/.test(h.get('Accept') || '') && window.indexedDB) {
      var k = caminho + '|' + (h.get('Authorization') || '').slice(-6);
      if (!VOO[k]) { VOO[k] = grande(caminho, url, init, h); VOO[k].finally(function () { setTimeout(function () { delete VOO[k]; }, 2000); }); }
      var o = await VOO[k];
      if (o.cache) console.info('[ponte] ' + caminho + ': cópia deste navegador (sem mudança no procs-muta)');
      return new Response(o.t, { status: o.s, headers: { 'Content-Type': o.ct } });
    }
    return enviar(url, init, h);
  };
  window.__ghPonte.limparCache = function () { return idb('readwrite', function (s) { return s.clear(); }); };
  /* sessão da Ex Officio com acesso ao acervo? (GET /api/acesso?gh=1&p= só confere) */
  window.__ghPonte.confere = function () { return F('/api/acesso?gh=1&p=', { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.ok; }).catch(function () { return false; }); };
})();
