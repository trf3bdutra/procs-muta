/* Solicitações de ausência da equipe (apoio/equipe-solicitacoes.json). O responsável decide no Caput, aba Equipe.
   GET    /api/ausencias            minhas solicitações
   POST   /api/ausencias {de, ate, tipo, motivo}
   DELETE /api/ausencias?id=…       cancela uma solicitação minha ainda pendente */
const L = require('./_lib');
const ARQ = 'apoio/equipe-solicitacoes.json', TIPOS = ['Férias', 'Folga compensatória', 'Licença', 'Abono', 'Curso ou evento', 'Outro'];
const dataOk = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
async function ler() { try { return await L.lerJson(ARQ); } catch (e) { if (e.status === 404) return { dados: { schema: 'gabcmt.equipe.solicitacoes', versao: 1, registros: [] }, sha: undefined }; throw e; } }
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const u = L.exigir(req, res); if (!u) return;
  try {
    if (req.method === 'GET') { const { dados } = await ler(); return res.status(200).json({ registros: (dados.registros || []).filter(r => L.norm(r.nome) === L.norm(u)).sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm))), tipos: TIPOS }); }
    for (let t = 0; t < 4; t++) {
      const { dados, sha } = await ler(); dados.registros = dados.registros || [];
      let msg;
      if (req.method === 'POST') {
        const b = req.body || {};
        if (!dataOk(b.de) || !dataOk(b.ate) || b.ate < b.de) return res.status(400).json({ erro: 'Informe o período (a data final não pode ser anterior à inicial).' });
        const tipo = TIPOS.includes(b.tipo) ? b.tipo : 'Outro';
        dados.registros.push({ id: 'aus-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nome: u, de: b.de, ate: b.ate, tipo, motivo: String(b.motivo || '').slice(0, 400), estado: 'pendente', criadoEm: new Date().toISOString() });
        msg = 'Ex Officio (' + u + '): solicita ausência ' + b.de + ' a ' + b.ate;
      } else if (req.method === 'DELETE') {
        const r = dados.registros.find(x => x.id === req.query.id && L.norm(x.nome) === L.norm(u));
        if (!r) return res.status(404).json({ erro: 'solicitação não encontrada' });
        if (r.estado !== 'pendente') return res.status(409).json({ erro: 'Só dá para cancelar solicitação ainda pendente.' });
        r.estado = 'cancelada'; r.decididoEm = new Date().toISOString(); r.decididoPor = u;
        msg = 'Ex Officio (' + u + '): cancela solicitação de ausência';
      } else return res.status(405).json({ erro: 'método não aceito' });
      dados.atualizadoEm = new Date().toISOString();
      try { await L.gravarJson(ARQ, dados, sha, msg); return res.status(200).json({ ok: true }); }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    res.status(409).json({ erro: 'O arquivo mudou várias vezes seguidas; tente de novo.' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
