/* GET  /api/sessoes                 sessões publicadas para a equipe (marcos e, se liberada, a listagem) (acervo/sessoes/calendario.json) e o expediente
   GET  /api/sessoes?agenda=1        agenda do calendário (acervo/sessoes/agenda.json: afazeres, alertas, eventos, prazos-limite, datas e ausências)
                                     e as ausências pedidas pela equipe (apoio/equipe-solicitacoes.json: aprovadas = confirmadas, pendentes = previstas)
   POST /api/sessoes?agenda=1 {itens, feitos}   grava a agenda (a mesma do Caput). O gestor grava tudo; os demais gravam só os itens
     que criaram, marcados como privados: aparecem só no calendário de quem criou e no da chefia (gestor)
   /api/sessoes?pedidos=1            pedidos de sustentação oral e preferência recebidos por e-mail (ver _pedidos.js) */
const L = require('./_lib');
const AG = 'acervo/sessoes/agenda.json', SOL = 'apoio/equipe-solicitacoes.json';
const nada = e => { if (e.status === 404) return { dados: null, sha: undefined }; throw e; };
module.exports = async (req, res) => {
  /* pedidos de sustentação oral e preferência (webhook do AgentMail e lista da equipe): ver _pedidos.js */
  if (req.query && req.query.pedidos) return require('./_pedidos')(req, res);
  res.setHeader('Cache-Control', 'no-store');
  const u = L.exigir(req, res); if (!u) return;
  try {
    if (req.query.agenda) {
      if (req.method === 'GET') {
        const [a, s] = await Promise.all([L.lerJson(AG).catch(nada), L.lerJson(SOL).catch(nada)]);
        const ausencias = ((s.dados && s.dados.registros) || []).filter(r => r.estado === 'pendente' || r.estado === 'aprovada')
          .map(r => ({ quem: r.nome, tipo: r.tipo, de: r.de, ate: r.ate, situacao: r.estado === 'aprovada' ? 'confirmada' : 'prevista', obs: r.motivo || '' }));
        const eu = L.norm(u), ges = L.gestor(u), todos = (a.dados && a.dados.itens) || [];
        const itens = ges ? todos : todos.filter(i => !i.privado || L.norm(i.criador || '') === eu);
        return res.status(200).json({ itens, feitos: (a.dados && a.dados.feitos) || {}, ausencias, gestor: ges, usuario: u });
      }
      if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
      const b = req.body || {};
      if (!Array.isArray(b.itens)) return res.status(400).json({ erro: 'itens inválidos' });
      for (let t = 0; t < 4; t++) {
        const { dados: atual, sha } = await L.lerJson(AG).catch(nada);
        const eu = L.norm(u), ges = L.gestor(u), guardados = (atual && atual.itens) || [], deMim = i => L.norm(i.criador || '') === eu;
        let itens, feitos;
        if (ges) { itens = b.itens.map(i => i && typeof i === 'object' ? Object.assign({}, i, { criador: i.criador || u }) : i); feitos = b.feitos && typeof b.feitos === 'object' ? b.feitos : {}; }
        else {
          const ids = new Set(guardados.map(i => i.id));
          const meus = b.itens.filter(i => i && typeof i === 'object' && (deMim(i) || (!i.criador && !ids.has(i.id)))).slice(0, 300)
            .map(i => Object.assign({}, i, { criador: u, privado: true, quem: i.quem || u }));
          itens = guardados.filter(i => !deMim(i)).concat(meus); feitos = (atual && atual.feitos) || {};
        }
        const doc = { schema: 'gabcmt.agenda-calendario', versao: 1, atualizado_em: new Date().toISOString(), itens: itens.slice(0, 2000), feitos };
        try { await L.gravarJson(AG, doc, sha, 'Ex Officio (' + u + '): agenda do calendário'); return res.status(200).json({ ok: true }); }
        catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
      }
      return res.status(409).json({ erro: 'A agenda mudou várias vezes seguidas; tente de novo.' });
    }
    const { dados } = await L.lerJson('acervo/sessoes/calendario.json');
    /* publicação em duas partes, feita no Caput: marcosPublicados mostra a sessão e os marcos à equipe; publicada libera a listagem da pauta */
    res.status(200).json({ sessoes: (dados.sessoes || []).filter(s => s.publicada || s.marcosPublicados).map(s => ({ date: s.date, nome: s.nome, hora: s.hora || '', pauta: !!s.publicada, processos: s.publicada ? (s.processos || 0) : 0, previa: s.publicada && !s.processos ? (s.previa || 0) : 0, cor: s.cor || '', marcos: s.marcos || {} })), expediente: dados.expediente || null })
  } catch (e) { res.status(e.status === 404 ? 404 : 500).json({ erro: e.message }); }
};
