/* GET  /api/pauta?mono=1                      monocráticas (ver _mono.js)
   GET  /api/pauta?data=AAAA-MM-DD            pauta da sessão (itens e pré-pauta)
   POST /api/pauta?data=AAAA-MM-DD  {cnj, lista, campos}   grava campos de um processo, num commit, com nova tentativa se o arquivo mudou */
const L = require('./_lib');
const DIRETOS = ['dataMinuta', 'dataCorrecao', 'dataLiberacao', 'obs'];
const CTL = ['mpf', 'parecer', 'prelim', 'tempest', 'preparo', 'repres', 'midias', 'resJulg', 'consect', 'honor', 'topico', 'intercor', 'sopref'];
const GESTOR = ['servidor', 'corretor', 'resultado'];   /* designação e desfecho: só o gestor (CMT_GESTOR) */
const dg = s => String(s || '').replace(/\D/g, '');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const u = L.exigir(req, res); if (!u) return;
  if (req.query.mono) return require('./_mono')(req, res, u);
  if (req.query.metas) return require('./_metas')(req, res, u);
  const data = req.query.data; if (!L.dataOk(data)) return res.status(400).json({ erro: 'data inválida' });
  const rel = 'acervo/sessoes/' + data + '.json';
  try {
    /* só as pautas que o Monitor publicou para a equipe */
    const cal = (await L.lerJson('acervo/sessoes/calendario.json')).dados;
    if (!(cal.sessoes || []).some(s => s.date === data && s.publicada)) return res.status(403).json({ erro: 'Esta pauta ainda não foi publicada para a equipe.' });
    /* importado o PDF, a pauta é fixa: a pré-pauta deixa de existir para a equipe */
    if (req.method === 'GET') { const { dados } = await L.lerJson(rel); if ((dados.itens || []).length) dados.previa = []; return res.status(200).json(dados); }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, alvo = dg(b.cnj), C = b.campos || {};
    if (alvo.length !== 20) return res.status(400).json({ erro: 'número do processo inválido' });
    for (let t = 0; t < 4; t++) {
      const { dados, sha } = await L.lerJson(rel);
      const lista = b.lista === 'previa' && !(dados.itens || []).length ? 'previa' : 'itens';
      const it = (dados[lista] || []).find(i => dg(i.cnj) === alvo);
      if (!it) return res.status(404).json({ erro: 'processo fora desta pauta' });
      const mud = [];
      DIRETOS.forEach(k => { if (k in C && it[k] !== String(C[k] || '')) { it[k] = String(C[k] || ''); mud.push(k); } });
      if (L.gestor(u)) GESTOR.forEach(k => { if (k in C && it[k] !== String(C[k] || '')) { it[k] = String(C[k] || ''); mud.push(k); } });
      it.ctl = it.ctl || {};
      CTL.forEach(k => { if (k in C) { const v = String(C[k] || ''); if ((it.ctl[k] || '') !== v) { if (v) it.ctl[k] = v; else delete it.ctl[k]; mud.push(k); } } });
      if (C.cartao && typeof C.cartao === 'object') { const ant = it.ctl.cartao || {}; Object.keys(C.cartao).forEach(k => { if (JSON.stringify(ant[k]) !== JSON.stringify(C.cartao[k])) { ant[k] = C.cartao[k]; mud.push('cartao.' + k); } }); it.ctl.cartao = ant; }
      if (!mud.length) return res.status(200).json({ ok: true, item: it, semMudanca: true });
      it.ctl.editadoPor = u; it.ctl.editadoEm = new Date().toISOString();
      dados.atualizadoEm = it.ctl.editadoEm;
      try { await L.gravarJson(rel, dados, sha, 'Pauta da equipe (' + u + '): ' + it.cnj + ' · ' + mud.slice(0, 6).join(', ')); return res.status(200).json({ ok: true, item: it }); }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    res.status(409).json({ erro: 'A pauta mudou várias vezes seguidas; tente de novo.' });
  } catch (e) { res.status(e.status === 404 ? 404 : 500).json({ erro: e.message }); }
};
