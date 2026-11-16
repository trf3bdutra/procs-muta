/* /api/acesso?gh=1&p=<caminho> (função _gh, servida pela acesso.js: o plano da Vercel aceita só 12 funções) → ponte para a API do GitHub no repositório trf3bdutra/procs-muta, com o GH_TOKEN da Vercel.
   Serve à Triagem e ao motor do acervo (Ab Initio) sem token no navegador: basta a sessão da Ex Officio (cookie cmt_eq)
   de quem é gestor ou tem perfil avançado (apoio/acessos.json).
   Corpo e resposta grandes (acervo/fonte.json, operacional.json) passam comprimidos (gzip, cabeçalho X-Ponte-Gz: 1),
   abaixo do limite de 4,5 MB das funções da Vercel. GET /api/acesso?gh=1&p= (vazio) só confere o acesso. */
const zlib = require('zlib');
const L = require('./_lib');
const REPO = 'trf3bdutra/procs-muta';
const PERMITIDO = /^(|contents\/[^?]*(\?.*)?|git\/(ref|refs|commits|trees|blobs)(\/.*)?|commits(\/[0-9a-f]+)?(\?.*)?|actions\/runs(\?.*)?)$/;

async function lerCorpo(req) { const partes = []; for await (const c of req) partes.push(Buffer.isBuffer(c) ? c : Buffer.from(c)); return Buffer.concat(partes); }

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const u = L.quem(req);
    if (!u) return res.status(401).json({ message: 'Entre com o seu nome e a sua senha da Ex Officio.' });
    let ok = L.gestor(u); if (!ok) { try { ok = (await L.acessos(u)).avancado; } catch (e) {} }
    if (!ok) return res.status(403).json({ message: 'Sem permissão para o acervo do gabinete (' + u + ').' });
    const p = String((req.query && req.query.p) || '').replace(/^\/+/, '');
    if (p.indexOf('..') >= 0 || !PERMITIDO.test(p)) return res.status(400).json({ message: 'caminho não permitido: ' + p });
    const t = process.env.GH_TOKEN; if (!t) return res.status(500).json({ message: 'GH_TOKEN ausente na Vercel' });
    const metodo = String(req.method || 'GET').toUpperCase();
    let corpo;
    if (!['GET', 'HEAD'].includes(metodo)) { corpo = await lerCorpo(req); if (req.headers['x-ponte-gz'] === '1') corpo = zlib.gunzipSync(corpo); }
    const r = await fetch('https://api.github.com/repos/' + REPO + (p ? '/' + p : ''), {
      method: metodo, body: corpo && corpo.length ? corpo : undefined,
      headers: { Accept: req.headers['x-ponte-accept'] || 'application/vnd.github+json', Authorization: 'Bearer ' + t, 'X-GitHub-Api-Version': '2022-11-28', ...(corpo && corpo.length ? { 'Content-Type': 'application/json' } : {}) }
    });
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('X-Ponte-Usuario', encodeURIComponent(u));
    if (buf.length > 200000) { res.setHeader('Content-Type', 'application/octet-stream'); res.setHeader('X-Ponte-Gz', '1'); res.setHeader('X-Ponte-Tipo', r.headers.get('content-type') || ''); return res.status(r.status).send(zlib.gzipSync(buf)); }
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    return res.status(r.status).send(buf);
  } catch (e) { res.status(500).json({ message: e.message }); }
};
