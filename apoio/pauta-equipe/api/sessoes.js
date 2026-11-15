const L = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!L.exigir(req, res)) return;
  try {
    const { dados } = await L.lerJson('acervo/sessoes/calendario.json');
    res.status(200).json({ sessoes: (dados.sessoes || []).filter(s => s.publicada).map(s => ({ date: s.date, nome: s.nome, hora: s.hora || '', processos: s.processos || 0, previa: s.previa || 0, cor: s.cor || '', marcos: s.marcos || {} })), expediente: dados.expediente || null });
  } catch (e) { res.status(e.status === 404 ? 404 : 500).json({ erro: e.message }); }
};
