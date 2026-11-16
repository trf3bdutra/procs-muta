const L = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') { const u = L.quem(req); if (!u) return res.status(401).json({ erro: 'sem sessão' }); const a = await L.acessos(u).catch(() => ({})); return res.status(200).json({ usuario: u, gestor: L.gestor(u), perfil: a.perfil || 'equipe', desembargador: !!a.desembargador }); }
    if (req.method === 'DELETE') { L.sair(res); return res.status(200).json({ ok: true }); }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, nome = L.conferir(b.usuario, b.senha);
    if (!nome) return setTimeout(() => res.status(401).json({ erro: 'Nome ou senha não conferem.' }), 600);
    L.emitir(res, nome); const ac = await L.acessos(nome).catch(() => ({})); res.status(200).json({ usuario: nome, gestor: L.gestor(nome), perfil: ac.perfil || 'equipe', desembargador: !!ac.desembargador });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
