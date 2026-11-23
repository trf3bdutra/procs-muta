/* GET /api/acesso → quem está conectado e o perfil no Modus Operandi (equipe, avancado, editor; ver apoio/acessos.json)
   Link da Triagem para colaboradores (só a aba Triagem do Caput):
     GET    /api/acesso?triagemLink=1        o link atual (só o gestor)
     POST   /api/acesso?triagem=1 {chave, nome}  confere a chave do link e abre o acesso (cookie cmt_tri, 30 dias)
     DELETE /api/acesso?triagem=1            encerra o acesso neste navegador
   Sem sessão da Ex Officio e com o cookie cmt_tri válido, GET /api/acesso responde {soTriagem: true, nome}. */
const L = require('./_lib');
const SITE = 'https://www.gabinete-cmt.com';
module.exports = async (req, res) => {
  if (req.query && req.query.gh !== undefined) return require('./_gh')(req, res);
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.query && req.query.triagemLink !== undefined) {
      const u = L.quem(req); if (!u || !L.gestor(u)) return res.status(403).json({ erro: 'Só o gestor vê o link da Triagem.' });
      const c = await L.cfgTriagem();
      return res.status(200).json({ link: SITE + '/caput/triagem?acesso=' + L.chaveTriagem(c.versao), versao: c.versao, ativo: c.ativo !== false });
    }
    if (req.query && req.query.triagem !== undefined) {
      if (req.method === 'DELETE') { L.sairTriagem(res); return res.status(200).json({ ok: true }); }
      if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
      const b = req.body || {}, c = await L.cfgTriagem();
      if (c.ativo === false || !L.confereChaveTriagem(b.chave, c.versao)) return setTimeout(() => res.status(401).json({ erro: 'Este link da Triagem não vale mais. Peça um novo ao gestor.' }), 400);
      const nome = String(b.nome || '').trim().slice(0, 40); if (!nome) return res.status(400).json({ erro: 'Informe o seu nome.' });
      L.emitirTriagem(res, nome, c.versao);
      return res.status(200).json({ ok: true, nome });
    }
    const u = L.quem(req);
    if (!u) {
      const t = await L.quemTriagem(req).catch(() => null);
      if (t) return res.status(200).json({ usuario: '', perfil: 'triagem', soTriagem: true, nome: t.nome, avancado: false, editor: false });
      return res.status(200).json({ usuario: '', perfil: 'equipe', avancado: false, editor: false });
    }
    const a = await L.acessos(u); res.status(200).json({ usuario: u, ...a });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
