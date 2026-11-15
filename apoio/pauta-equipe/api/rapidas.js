/* GET /api/rapidas → quadro de entradas rápidas das Diretrizes (apoio/diretrizes-rapidas.json), lido na hora do GitHub; leitura aberta a todos (perfil equipe, mesmo sem login); gravação só para o perfil editor, pelo /api/editor (coleção rap) */
const L = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ erro: 'método não aceito' });
  try { const { dados } = await L.lerJson('apoio/diretrizes-rapidas.json'); res.status(200).json({ registros: dados.registros || [] }); }
  catch (e) { res.status(e.status === 404 ? 200 : 500).json(e.status === 404 ? { registros: [] } : { erro: e.message }); }
};
