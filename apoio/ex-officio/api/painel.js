/* GET /api/painel?cmt=1  painel do desembargador (api/_cmt.js)
   GET /api/painel?lote=1  Amicus Curiae · Collectio (api/_lote.js; /amicus/collectio/ e /amicus/collectio/cg/)
   GET /api/painel  página inicial do servidor: calendário das pautas publicadas e todos os processos dele (minuta e correção) */
const L = require('./_lib');
const E = require('./_entregas');
const FICHA = require('./_ficha');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.query && req.query.whatsapp === '1') return require('./_whatsapp')(req, res);
  if (req.query && req.query.fechamento === '1') return require('./_fechamento-auto')(req, res);
  /* Amicus Curiae · Collectio: login do Ex Officio ou chave do relator, conferidos em _lote.js */
  if (req.query && req.query.lote) return require('./_lote')(req, res);
  /* painel do desembargador: o endereço próprio (/cmt) abre sem login */
  if (req.query && req.query.cmt) {
    const CMT = require('./_cmt');
    return CMT(req, res, L.quem(req) || process.env.CMT_RELATOR || 'CM');
  }
  const u = L.exigir(req, res); if (!u) return;
  if (req.query && req.query.fechamentoPng === '1') return require('./_fechamento-png')(req, res, u);
  try {
    const cal = (await L.lerJson('acervo/sessoes/calendario.json')).dados;
    /* calendário: sessões com marcos publicados; processos, progresso e "meus" só das pautas com listagem publicada */
    const vis = (cal.sessoes || []).filter(s => s.publicada || s.marcosPublicados), pubs = vis.filter(s => s.publicada);
    const eu = L.norm(u), meus = [], prog = {};
    const detalhar = !!req.query.entregas;
    const avisosFontes = [];
    const requests = pubs.map(s => L.lerJson('acervo/sessoes/' + s.date + '.json').then(x => x.dados).catch(() => { avisosFontes.push('Pauta ' + s.date + ' indisponível'); return null; }));
    // Monocráticas e diligências são lidas em paralelo apenas para o Início.
    const adicionais = detalhar ? Promise.all([
      FICHA.lerOpLeitura().then(x => x.doc).catch(() => { avisosFontes.push('Monocráticas e urgências indisponíveis'); return null; }),
      L.lerJson('apoio/equipe-pendencias.json').then(x => x.dados).catch(e => { if (e.status !== 404) avisosFontes.push('Diligências indisponíveis'); return { registros: [] }; })
    ]) : Promise.resolve([null, null]);
    const [docs, extra] = await Promise.all([Promise.all(requests), adicionais]);
    pubs.forEach((s, i) => {
      const d = docs[i]; if (!d) return;
      const lista = (d.itens || []).length ? d.itens : (d.previa || []);
      prog[s.date] = { minutadas: lista.filter(x => x.dataMinuta).length, corrigidas: lista.filter(x => x.dataCorrecao).length, liberadas: lista.filter(x => x.dataLiberacao).length };
      lista.forEach(it => {
        const pm = L.norm(it.servidor) === eu, pc = L.norm(it.corretor) === eu; if (!pm && !pc) return;
        meus.push({ papel: pm && pc ? 'minuta e correção' : pm ? 'minuta' : 'correção', sessao: s.date, item: it.item || '', cnj: it.cnj, classe: it.classe || '', assunto: it.assunto || '', partes: it.partes || '',
          servidor: it.servidor || '', corretor: it.corretor || '',
          dataMinuta: it.dataMinuta || '', dataCorrecao: it.dataCorrecao || '', dataLiberacao: it.dataLiberacao || '', resultado: it.resultado || '',
          resJulg: (it.ctl || {}).resJulg || '', previa: !(d.itens || []).length });
      });
    });
    const resposta = { usuario: u, sessoes: vis.map(s => ({ date: s.date, hora: s.hora || '', cor: s.cor || '', pauta: !!s.publicada, processos: s.publicada ? (s.processos || 0) : 0, previa: s.publicada && !s.processos ? (s.previa || 0) : 0, marcos: s.marcos || {} })), expediente: cal.expediente || null, progresso: prog, meus };
    if (detalhar) {
      resposta.entregas = E.pautas(pubs, docs).concat(extra[0] ? E.monocraticas(extra[0]) : [], E.pendencias(extra[1] || { registros: [] }));
      resposta.equipe = L.equipe();
      resposta.fontes = { pautas: docs.filter(Boolean).length, pautasPublicadas: pubs.length, monocraticas: !!extra[0], pendencias: !!extra[1] };
      resposta.avisosFontes = avisosFontes;
    }
    res.status(200).json(resposta);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
