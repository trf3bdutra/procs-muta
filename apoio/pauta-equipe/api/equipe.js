const L = require('./_lib');
module.exports = (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.status(200).json({ equipe: L.equipe() }); };
