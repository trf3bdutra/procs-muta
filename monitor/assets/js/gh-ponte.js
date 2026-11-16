/* Ponte do GitHub (Ab Initio · Triagem e motor do acervo).
   Chamada à API do trf3bdutra/procs-muta com o token-sentinela "ponte" vai para /api/acesso?gh=1, que usa o token guardado na Vercel.
   Assim ninguém precisa colar token no navegador: vale a sessão da Ex Officio (nome e senha).
   Corpo grande segue comprimido (gzip); resposta comprimida pela ponte é descomprimida aqui. Token pessoal continua funcionando. */
(function () {
  if (window.__ghPonte) return;
  var BASE = 'https://api.github.com/repos/trf3bdutra/procs-muta', F = window.fetch.bind(window), SENT = 'ponte';
  window.__ghPonte = { SENT: SENT };
  function gz(txt) { return new Response(new Blob([txt]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(); }
  window.fetch = async function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(BASE) !== 0) return F(input, init);
    init = init || {};
    var h = new Headers(init.headers || (typeof input !== 'string' && input.headers) || {});
    if ((h.get('Authorization') || '') !== 'Bearer ' + SENT) return F(input, init);
    var resto = url.slice(BASE.length).replace(/^\//, ''), metodo = String(init.method || 'GET').toUpperCase(), corpo = init.body, H = { 'X-Ponte-Accept': h.get('Accept') || 'application/vnd.github+json' };
    if (corpo != null) {
      if (typeof corpo === 'string' && corpo.length > 1e6 && window.CompressionStream) { corpo = await gz(corpo); H['X-Ponte-Gz'] = '1'; H['Content-Type'] = 'application/octet-stream'; }
      else H['Content-Type'] = 'application/json';
    }
    var r = await F('/api/acesso?gh=1&p=' + encodeURIComponent(resto), { method: metodo, body: corpo, headers: H, cache: 'no-store', credentials: 'same-origin' });
    if (r.headers.get('X-Ponte-Gz') !== '1') return r;
    var txt = await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text();
    return new Response(txt, { status: r.status, headers: { 'Content-Type': r.headers.get('X-Ponte-Tipo') || 'application/json' } });
  };
  /* sessão da Ex Officio com acesso ao acervo? (GET /api/acesso?gh=1&p= só confere) */
  window.__ghPonte.confere = function () { return F('/api/acesso?gh=1&p=', { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.ok; }).catch(function () { return false; }); };
})();
