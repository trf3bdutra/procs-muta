/* Pendências da equipe (apoio/equipe-pendencias.json): quadro com A fazer, Em andamento, Em revisão e Concluída.
   GET /api/pendencias · POST {title,…} cria · PUT {id,_rev,…} altera · DELETE ?id= exclui (só quem criou) */
const L = require('./_lib');
const ARQ = 'apoio/equipe-pendencias.json', STAGES = ['todo', 'doing', 'review', 'done'], URG = ['Urgente', 'Alta', 'Média', 'Baixa'];
const CAMPOS = ['title', 'description', 'assignee', 'urgency', 'dueDate', 'numero', 'sessao', 'stage'];
async function ler() { try { return await L.lerJson(ARQ); } catch (e) { if (e.status === 404) return { dados: { schema: 'gabcmt.equipe.pendencias', versao: 1, registros: [] }, sha: undefined }; throw e; } }
function limpar(b, t) {
  CAMPOS.forEach(k => { if (k in b) t[k] = String(b[k] == null ? '' : b[k]).slice(0, k === 'description' ? 2000 : 200).trim(); });
  if (!URG.includes(t.urgency)) t.urgency = 'Média'; if (!STAGES.includes(t.stage)) t.stage = 'todo';
  if (t.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)) t.dueDate = '';
  return t;
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const u = L.exigir(req, res); if (!u) return;
  try {
    if (req.method === 'GET') { const { dados } = await ler(); return res.status(200).json({ tasks: (dados.registros || []).filter(t => !t.excluida), equipe: L.equipe() }); }
    for (let n = 0; n < 4; n++) {
      const { dados, sha } = await ler(); dados.registros = dados.registros || []; const agora = new Date().toISOString(); let msg, alvo;
      if (req.method === 'POST') {
        const b = req.body || {}; if (!String(b.title || '').trim()) return res.status(400).json({ erro: 'Informe o título da pendência.' });
        alvo = limpar(b, { id: 'pen-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), creator: u, criadoEm: agora, _rev: 1 });
        alvo.atualizadoEm = agora; alvo.atualizadoPor = u; dados.registros.push(alvo); msg = 'Pendência criada por ' + u + ': ' + alvo.title;
      } else if (req.method === 'PUT') {
        const b = req.body || {}; alvo = dados.registros.find(t => t.id === b.id && !t.excluida);
        if (!alvo) return res.status(404).json({ erro: 'pendência não encontrada' });
        if (b._rev != null && Number(b._rev) !== Number(alvo._rev || 0)) return res.status(409).json({ erro: 'Outra pessoa alterou esta pendência. Atualize o quadro.', task: alvo });
        limpar(b, alvo); alvo._rev = Number(alvo._rev || 0) + 1; alvo.atualizadoEm = agora; alvo.atualizadoPor = u;
        if (alvo.stage === 'done' && !alvo.concluidaEm) alvo.concluidaEm = agora; if (alvo.stage !== 'done') delete alvo.concluidaEm;
        msg = 'Pendência atualizada por ' + u + ': ' + alvo.title;
      } else if (req.method === 'DELETE') {
        alvo = dados.registros.find(t => t.id === req.query.id && !t.excluida);
        if (!alvo) return res.status(404).json({ erro: 'pendência não encontrada' });
        if (L.norm(alvo.creator) !== L.norm(u)) return res.status(403).json({ erro: 'Só quem criou a pendência pode excluí-la.' });
        alvo.excluida = true; alvo.atualizadoEm = agora; alvo.atualizadoPor = u; msg = 'Pendência excluída por ' + u + ': ' + alvo.title;
      } else return res.status(405).json({ erro: 'método não aceito' });
      dados.atualizadoEm = agora;
      try { await L.gravarJson(ARQ, dados, sha, msg); return res.status(200).json({ ok: true, task: alvo }); }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    res.status(409).json({ erro: 'O quadro mudou várias vezes seguidas; tente de novo.' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
