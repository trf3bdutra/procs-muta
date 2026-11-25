/* /api/acesso?gh=1&p=<caminho> (função _gh, servida pela acesso.js: o plano da Vercel aceita só 12 funções) → ponte para a API do GitHub no repositório trf3bdutra/procs-muta, com o GH_TOKEN da Vercel.
   Serve à Triagem e ao motor do acervo (Ab Initio) sem token no navegador: basta a sessão da Ex Officio (cookie cmt_eq)
   do gestor (acesso completo) ou de qualquer outro usuário, com as regras da Triagem (ver triagemPode).
   Corpo e resposta grandes (acervo/fonte.json, operacional.json) passam comprimidos (gzip, cabeçalho X-Ponte-Gz: 1),
   abaixo do limite de 4,5 MB das funções da Vercel. GET /api/acesso?gh=1&p= (vazio) só confere o acesso. */
const zlib = require('zlib');
const L = require('./_lib');
const REPO = 'trf3bdutra/procs-muta';
const PERMITIDO = /^(|contents\/[^?]*(\?.*)?|git\/(ref|refs|commits|trees|blobs)(\/.*)?|commits(\/[0-9a-f]+)?(\?.*)?|actions\/runs(\?.*)?)$/;

async function lerCorpo(req) { const partes = []; for await (const c of req) partes.push(Buffer.isBuffer(c) ? c : Buffer.from(c)); return Buffer.concat(partes); }

/* Link da Triagem para colaboradores (cookie cmt_tri, ver _lib.js › quemTriagem): lê o acervo, sem os arquivos de
   Chefia, Coordenação e Comunicação, e grava só a ficha única (acervo/operacional.json) e as coleções (acervo/lotes/).
   Cada commit é conferido antes de mover o ramo: um commit só, sobre o ramo atual, mexendo só nesses arquivos. */
const TRI_LE = /^(|contents\/(acervo|padrao|apoio|modelos|precedentes)\/[^?]*(\?.*)?|contents\/(acervo|padrao|apoio)(\?.*)?|git\/ref\/heads\/main|git\/commits\/[0-9a-f]{40}|commits(\?.*)?)$/;
const TRI_LE_NAO = /^contents\/apoio\/(registro-entradas|acessos|equipe-avisos|equipe-solicitacoes|equipe-pendencias|equipe-ausencias[^/]*|ausencias[^/]*|produtividade[^/]*|regras\/produtividade)\.json/;
const TRI_GRAVA = /^acervo\/(operacional\.json|lotes\/[A-Za-z0-9_-]+\.json)$/;
async function triagemPode(metodo, p, corpo) {
  if (metodo === 'GET' || metodo === 'HEAD') return TRI_LE.test(p) && !TRI_LE_NAO.test(p) ? '' : 'leitura fora da Triagem';
  if (metodo === 'POST' && p === 'git/blobs') return '';
  if (metodo === 'POST' && p === 'git/commits') return '';
  let b = {}; try { b = JSON.parse(corpo && corpo.length ? corpo.toString('utf8') : '{}'); } catch (e) { return 'corpo ilegível'; }
  if (metodo === 'POST' && p === 'git/trees') {
    const T = Array.isArray(b.tree) ? b.tree : [];
    return T.length && T.every(x => x && TRI_GRAVA.test(String(x.path || '')) && x.type === 'blob' && x.mode === '100644' && x.sha) ? '' : 'gravação fora da ficha e das coleções';
  }
  if (metodo === 'PUT' && /^contents\//.test(p)) return TRI_GRAVA.test(p.slice(9).split('?')[0]) ? '' : 'gravação fora da ficha e das coleções';
  if (metodo === 'PATCH' && p === 'git/refs/heads/main') {
    if (b.force || !/^[0-9a-f]{40}$/.test(String(b.sha || ''))) return 'atualização do ramo não permitida';
    const ref = await L.gh('/git/ref/heads/main'), cmp = await L.gh('/compare/' + ref.object.sha + '...' + b.sha);
    if (cmp.behind_by !== 0 || cmp.ahead_by !== 1) return 'o commit precisa ser um só, sobre o ramo atual';
    return (cmp.files || []).length && cmp.files.every(f => TRI_GRAVA.test(f.filename) && (!f.previous_filename || TRI_GRAVA.test(f.previous_filename)) && f.status !== 'removed') ? '' : 'o commit mexe em arquivo fora da ficha e das coleções';
  }
  return 'operação não permitida pelo link da Triagem';
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    /* acesso completo: só o gestor. Quem entra com o login do Office (equipe) ou pelo link da Triagem fica com as regras da Triagem */
    let u = L.quem(req), tri = null;
    const ok = !!u && L.gestor(u);
    if (u && !ok) tri = { nome: u, login: true };
    if (!u && req.query && req.query.office === '1') return res.status(401).json({message:'Entre no Ex Officio para acessar o Cognitio.'});
    if (!u) { tri = await L.quemTriagem(req).catch(() => null); if (tri) u = 'Triagem (link) · ' + tri.nome; }
    if (!u) return res.status(401).json({ message: 'Entre com o seu nome e a sua senha da Ex Officio.' });
    if (!ok && !tri) return res.status(403).json({ message: 'Sem permissão para o acervo do gabinete (' + u + ').' });
    const p = String((req.query && req.query.p) || '').replace(/^\/+/, '');
    if (p.indexOf('..') >= 0 || !PERMITIDO.test(p)) return res.status(400).json({ message: 'caminho não permitido: ' + p });
    const t = process.env.GH_TOKEN; if (!t) return res.status(500).json({ message: 'GH_TOKEN ausente na Vercel' });
    const metodo = String(req.method || 'GET').toUpperCase();
    let corpo;
    if (!['GET', 'HEAD'].includes(metodo)) { corpo = await lerCorpo(req); if (req.headers['x-ponte-gz'] === '1') corpo = zlib.gunzipSync(corpo); }
    if (tri) { const nao = await triagemPode(metodo, p, corpo); if (nao) return res.status(403).json({ message: 'Link da Triagem: ' + nao + ' (' + p.split('?')[0] + ').' }); }
    /* GET com ETag (L.ghFetch): o que não mudou volta do cache desta instância sem gastar a cota do GitHub */
    const r = await L.ghFetch('https://api.github.com/repos/' + REPO + (p ? '/' + p : ''), {
      method: metodo, body: corpo && corpo.length ? corpo : undefined,
      headers: { Accept: req.headers['x-ponte-accept'] || 'application/vnd.github+json', Authorization: 'Bearer ' + t, 'X-GitHub-Api-Version': '2022-11-28', ...(corpo && corpo.length ? { 'Content-Type': 'application/json' } : {}) }
    });
    const buf = r.buf;
    res.setHeader('X-Ponte-Usuario', encodeURIComponent(u));
    if (buf.length > 200000) { res.setHeader('Content-Type', 'application/octet-stream'); res.setHeader('X-Ponte-Gz', '1'); res.setHeader('X-Ponte-Tipo', r.tipo || ''); return res.status(r.status).send(zlib.gzipSync(buf)); }
    res.setHeader('Content-Type', r.tipo || 'application/json');
    return res.status(r.status).send(buf);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

module.exports.triagemPode = triagemPode;
