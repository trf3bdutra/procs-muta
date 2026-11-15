const L = require('./_lib');
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') { const u = L.quem(req); return u ? res.status(200).json({ usuario: u, gestor: L.gestor(u) }) : res.status(401).json({ erro: 'sem sessão' }); }
    if (req.method === 'DELETE') { L.sair(res); return res.status(200).json({ ok: true }); }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, nome = L.conferir(b.usuario, b.senha);
    if (!nome) return setTimeout(() => res.status(401).json({ erro: 'Nome ou senha não conferem.' }), 600);
    L.emitir(res, nome); res.status(200).json({ usuario: nome, gestor: L.gestor(nome) });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
