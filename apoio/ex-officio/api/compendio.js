/* GET /api/compendio → conteúdo do modo avançado do Modus Operandi (Enciclopédia), só para quem tem acesso */
const L = require('./_lib');
let ENC = null;
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const u = L.exigir(req, res); if (!u) return;
  try {
    const a = await L.acessos(u);
    if (!a.avancado) return res.status(403).json({ erro: 'Sem acesso ao modo avançado.' });
    if (!ENC) { try { ENC = require('./_enciclopedia.json'); } catch (e) { ENC = (await L.lerJson('apoio/enciclopedia.json')).dados; } }
    res.status(200).json({ enciclopedia: ENC });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
