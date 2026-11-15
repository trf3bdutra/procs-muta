/* GitHub simulado sobre uma pasta local (cópia do procs-muta): contents, blobs, trees, commits e refs do ramo main.
   Usado pelas funções /api (fetch do Node) e pelo navegador (rota do Playwright para api.github.com). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
module.exports = function (raiz) {
  const blobs = {}, trees = {}, commits = {}, log = [];
  const shaDe = t => crypto.createHash('sha1').update(t).digest('hex');
  let HEAD = 'c0'; commits.c0 = { sha: 'c0', tree: 'T0', parents: [], message: 'inicial' };
  const arq = p => path.join(raiz, p);
  function ler(p) { try { const t = fs.readFileSync(arq(p)); return t; } catch (e) { return null; } }
  function resp(st, o) { return { status: st, body: o }; }
  function trata(metodo, url, corpo, accept) {
    const u = new URL(url), m = u.pathname.match(/^\/repos\/[^/]+\/[^/]+(\/.*)?$/);
    if (!m) { if (u.pathname === '/user') return resp(200, { login: 'teste' }); return resp(404, { message: 'Not Found' }); }
    const p = m[1] || '';
    if (!p) return resp(200, { full_name: 'trf3bdutra/procs-muta', default_branch: 'main', permissions: { push: true } });
    let r;
    if ((r = p.match(/^\/contents\/?(.*)$/))) {
      const rel = decodeURIComponent(r[1]).replace(/\/$/, ''), abs = arq(rel);
      if (metodo === 'GET') {
        if (fs.existsSync(abs) && fs.statSync(abs).isDirectory())
          return resp(200, fs.readdirSync(abs).map(n => { const q = rel ? rel + '/' + n : n, d = fs.statSync(arq(q)).isDirectory(); const t = d ? null : fs.readFileSync(arq(q)); if (t) blobs[shaDe(t)] = t; return { name: n, path: q, type: d ? 'dir' : 'file', sha: t ? shaDe(t) : 'd', size: t ? t.length : 0 }; }));
        const t = ler(rel); if (!t) return resp(404, { message: 'Not Found' });
        if (/raw/.test(accept || '')) return { status: 200, raw: t };
        const s = shaDe(t); blobs[s] = t; const grande = t.length > 1e6;
        return resp(200, { name: path.basename(rel), path: rel, sha: s, size: t.length, type: 'file', encoding: grande ? 'none' : 'base64', content: grande ? '' : t.toString('base64'), download_url: 'http://local/raw/' + rel });
      }
      if (metodo === 'PUT') {
        const b = JSON.parse(corpo), t = ler(rel), atual = t ? shaDe(t) : null;
        if (atual && b.sha !== atual) return resp(409, { message: rel + ' does not match ' + b.sha });
        if (!atual && b.sha) return resp(422, { message: 'sha não esperado' });
        const novo = Buffer.from(b.content, 'base64'); fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, novo);
        const c = 'c' + (log.length + 1); commits[c] = { sha: c, tree: 'T' + c, parents: [HEAD], message: b.message }; HEAD = c; log.push({ c, msg: b.message, arquivos: [rel] });
        return resp(200, { content: { sha: shaDe(novo), path: rel }, commit: { sha: c } });
      }
    }
    if ((r = p.match(/^\/git\/ref(?:s)?\/heads\/main$/))) {
      if (metodo === 'GET') return resp(200, { ref: 'refs/heads/main', object: { sha: HEAD } });
      if (metodo === 'PATCH') {
        const b = JSON.parse(corpo), c = commits[b.sha]; if (!c) return resp(422, { message: 'commit desconhecido' });
        if (c.parents[0] !== HEAD && !b.force) return resp(422, { message: 'Update is not a fast forward' });
        const tr = trees[c.tree] || []; tr.forEach(f => { fs.mkdirSync(path.dirname(arq(f.path)), { recursive: true }); fs.writeFileSync(arq(f.path), blobs[f.sha]); });
        HEAD = b.sha; log.push({ c: b.sha, msg: c.message, arquivos: tr.map(f => f.path) });
        return resp(200, { object: { sha: HEAD } });
      }
    }
    if ((r = p.match(/^\/git\/commits\/(\w+)$/))) { const c = commits[r[1]]; return c ? resp(200, { sha: c.sha, tree: { sha: c.tree }, parents: c.parents.map(s => ({ sha: s })), message: c.message }) : resp(404, {}); }
    if (p === '/git/blobs' && metodo === 'POST') { const b = JSON.parse(corpo), t = Buffer.from(b.content, b.encoding === 'base64' ? 'base64' : 'utf8'), s = shaDe(t); blobs[s] = t; return resp(201, { sha: s }); }
    if ((r = p.match(/^\/git\/blobs\/(\w+)$/))) { const t = blobs[r[1]]; return t ? resp(200, { sha: r[1], encoding: 'base64', content: t.toString('base64'), size: t.length }) : resp(404, {}); }
    if (p === '/git/trees' && metodo === 'POST') { const b = JSON.parse(corpo), s = 'T' + crypto.randomBytes(4).toString('hex'); trees[s] = b.tree; return resp(201, { sha: s }); }
    if (p === '/git/commits' && metodo === 'POST') { const b = JSON.parse(corpo), s = 'c' + crypto.randomBytes(4).toString('hex'); commits[s] = { sha: s, tree: b.tree, parents: b.parents, message: b.message }; return resp(201, { sha: s, html_url: 'http://local/commit/' + s }); }
    if ((r = p.match(/^\/commits/))) return resp(200, []);
    return resp(404, { message: 'não simulado: ' + metodo + ' ' + p });
  }
  return { trata, log, head: () => HEAD };
};
