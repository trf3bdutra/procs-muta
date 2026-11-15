/* GET /api/acesso → quem está conectado e o que pode no CMT Compêndio (modo avançado, editor) */
const L = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const u = L.quem(req);
  if (!u) return res.status(200).json({ usuario: '', avancado: false, editor: false });
  try { const a = await L.acessos(u); res.status(200).json({ usuario: u, ...a }); }
  catch (e) { res.status(500).json({ usuario: u, avancado: false, editor: false, erro: e.message }); }
};
