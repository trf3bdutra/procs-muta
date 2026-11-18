/* Painel de lotes (/lotes/): página própria, desenhada como parte do Painel do relator (/cmt), com o mesmo acesso:
   login do Ex Officio (cookie cmt_eq) ou o link próprio do relator (chave em x-cmt-chave ou ?k=, conferida com CMT_CHAVE).
   GET /api/painel?lote=1                       lotes disponíveis (acervo/lotes/*.json: id, título, descrição, sessões)
   GET /api/painel?lote=1&id=2886               o lote (matriz, perfis e painel), com o cartão do prontuário de cada processo
                                       tirado, na hora, da sessão em acervo/sessoes/AAAA-MM-DD.json
   GET /api/painel?lote=1&id=2886&minuta=X      a minuta do processo X (10 primeiros caracteres do número): acervo/minutas/<id>/X.json */
const L = require('./_lib');
const ID = /^[a-z0-9-]{1,40}$/i, PROC = /^\d{7}-\d{2}$/;
const nada = e => { if (e.status === 404) return { dados: null }; throw e; };
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const CMT = require('./_cmt');
  const u = L.quem(req) || (CMT.porChave(req) ? (process.env.CMT_RELATOR || 'CM') : null);
  if (!u) return res.status(401).json({ erro: 'Entre com o seu nome e a sua senha.' });
  if (req.method !== 'GET') return res.status(405).json({ erro: 'método não aceito' });
  try {
    const id = String(req.query.id || '');
    if (!id) {
      const lista = await L.gh('/contents/acervo/lotes?ref=main').catch(e => (e.status === 404 ? [] : Promise.reject(e)));
      const lotes = [];
      for (const f of (Array.isArray(lista) ? lista : []).filter(f => /^[a-z0-9-]+\.json$/i.test(f.name))) {
        const { dados } = await L.lerJson('acervo/lotes/' + f.name).catch(nada);
        if (dados) lotes.push({ id: dados.id, titulo: dados.titulo, descricao: dados.descricao, sessoes: dados.sessoes, total: (dados.itens || []).length });
      }
      return res.status(200).json({ usuario: u, lotes });
    }
    if (!ID.test(id)) return res.status(400).json({ erro: 'lote inválido' });
    const mx = String(req.query.minuta || '');
    if (mx) {
      if (!PROC.test(mx)) return res.status(400).json({ erro: 'processo inválido' });
      const { dados } = await L.lerJson('acervo/minutas/' + id + '/' + mx + '.json').catch(nada);
      if (!dados) return res.status(404).json({ erro: 'Minuta não disponível para este processo.' });
      return res.status(200).json(dados);
    }
    const { dados: lote } = await L.lerJson('acervo/lotes/' + id + '.json').catch(nada);
    if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });
    /* cartão do prontuário (Ex Officio), lido das sessões do lote no momento da consulta */
    const cartoes = {};
    await Promise.all((lote.sessoes || []).filter(s => L.dataOk ? L.dataOk(s) : /^\d{4}-\d{2}-\d{2}$/.test(s)).map(async s => {
      const { dados } = await L.lerJson('acervo/sessoes/' + s + '.json').catch(nada);
      const itens = dados ? (Array.isArray(dados) ? dados : (dados.itens || dados.processos || [])) : [];
      itens.forEach(x => {
        const c = x && x.ctl; if (!c || !c.cartao) return;
        cartoes[x.cnj] = { cartao: c.cartao, editadoPor: c.editadoPor || '', editadoEm: c.editadoEm || '' };
      });
    }));
    (lote.itens || []).forEach(it => { if (cartoes[it.processo]) it.prontuario = cartoes[it.processo]; });
    res.status(200).json({ usuario: u, gestor: !!(L.gestor && L.gestor(u)), lote });
  } catch (e) { res.status(e.status === 404 ? 404 : 500).json({ erro: e.message }); }
};
