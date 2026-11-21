/* Avisos e notificações do gestor (acesso restrito: CMT_GESTOR). Arquivo apoio/equipe-avisos.json, o mesmo que o Caput usa.
   Servido por /api/notificacoes?gestao=1 (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam).
   GET    /api/notificacoes?gestao=1             todos os avisos (gestão)
   POST   /api/notificacoes?gestao=1 {title, message, link, linkTxt, nivel, painel, notificacao, para[], ate, fixo}
   DELETE /api/notificacoes?gestao=1&id=…        retira um aviso */
const L = require('./_lib');
const ARQ = 'apoio/equipe-avisos.json', NIVEIS = ['info', 'importante', 'urgente'];
async function ler() { try { return await L.lerJson(ARQ); } catch (e) { if (e.status === 404) return { dados: { schema: 'gabcmt.equipe.avisos', versao: 1, registros: [] }, sha: undefined }; throw e; } }
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const u = L.exigir(req, res); if (!u) return;
  if (!L.gestor(u)) return res.status(403).json({ erro: 'Área restrita ao gestor da equipe.' });
  try {
    if (req.method === 'GET') { const { dados } = await ler(); return res.status(200).json({ registros: (dados.registros || []).slice().sort((a, b) => String(b.time).localeCompare(String(a.time))), equipe: L.equipe() }); }
    for (let t = 0; t < 4; t++) {
      const { dados, sha } = await ler(); dados.registros = dados.registros || [];
      let msg;
      if (req.method === 'POST') {
        const b = req.body || {}, title = String(b.title || '').trim().slice(0, 160), message = String(b.message || '').trim().slice(0, 2000);
        if (!title) return res.status(400).json({ erro: 'Informe o título.' });
        const link = String(b.link || '').trim().slice(0, 600);
        if (link && !/^(https?:\/\/|\/)/.test(link)) return res.status(400).json({ erro: 'O link deve começar com https:// ou /.' });
        const painel = b.painel !== false, notificacao = b.notificacao !== false;
        if (!painel && !notificacao) return res.status(400).json({ erro: 'Escolha onde o aviso aparece: painel inicial, notificação ou os dois.' });
        const nomes = L.equipe(), para = (Array.isArray(b.para) ? b.para : []).map(n => nomes.find(x => L.norm(x) === L.norm(n))).filter(Boolean);
        const r = { id: 'av-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), time: new Date().toISOString(), user: u, title, message,
          link, linkTxt: String(b.linkTxt || '').trim().slice(0, 80), nivel: NIVEIS.includes(b.nivel) ? b.nivel : 'info', painel, notificacao, para,
          ate: L.dataOk(b.ate) ? b.ate : '', fixo: !!b.fixo };
        dados.registros.unshift(r);
        msg = 'Ex Officio (' + u + '): aviso · ' + title.slice(0, 60);
      } else if (req.method === 'DELETE') {
        const n = dados.registros.length; dados.registros = dados.registros.filter(x => x.id !== req.query.id);
        if (dados.registros.length === n) return res.status(404).json({ erro: 'aviso não encontrado' });
        msg = 'Ex Officio (' + u + '): retira aviso';
      } else return res.status(405).json({ erro: 'método não aceito' });
      dados.atualizadoEm = new Date().toISOString();
      try { await L.gravarJson(ARQ, dados, sha, msg); return res.status(200).json({ ok: true }); }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    res.status(409).json({ erro: 'O arquivo mudou várias vezes seguidas; tente de novo.' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
