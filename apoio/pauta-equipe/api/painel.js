/* GET /api/painel  página inicial do servidor: calendário das pautas publicadas e todos os processos dele (minuta e correção) */
const L = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const u = L.exigir(req, res); if (!u) return;
  try {
    const cal = (await L.lerJson('acervo/sessoes/calendario.json')).dados;
    const pubs = (cal.sessoes || []).filter(s => s.publicada);
    const eu = L.norm(u), meus = [];
    const docs = await Promise.all(pubs.map(s => L.lerJson('acervo/sessoes/' + s.date + '.json').then(x => x.dados).catch(() => null)));
    pubs.forEach((s, i) => {
      const d = docs[i]; if (!d) return;
      const lista = (d.itens || []).length ? d.itens : (d.previa || []);
      lista.forEach(it => {
        const pm = L.norm(it.servidor) === eu, pc = L.norm(it.corretor) === eu; if (!pm && !pc) return;
        meus.push({ papel: pm && pc ? 'minuta e correção' : pm ? 'minuta' : 'correção', sessao: s.date, item: it.item || '', cnj: it.cnj, classe: it.classe || '', assunto: it.assunto || '', partes: it.partes || '',
          servidor: it.servidor || '', corretor: it.corretor || '',
          dataMinuta: it.dataMinuta || '', dataCorrecao: it.dataCorrecao || '', dataLiberacao: it.dataLiberacao || '', resultado: it.resultado || '',
          resJulg: (it.ctl || {}).resJulg || '', previa: !(d.itens || []).length });
      });
    });
    res.status(200).json({ usuario: u, sessoes: pubs.map(s => ({ date: s.date, hora: s.hora || '', cor: s.cor || '', processos: s.processos || 0, previa: s.processos ? 0 : (s.previa || 0), marcos: s.marcos || {} })), expediente: cal.expediente || null, meus });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
