/* Comunicados ao desembargador (apoio/equipe-comunicados.json), pela rota /api/pendencias?com=1.
   A mensagem é montada no navegador com os dados das urgências e dos processos; aqui ela é guardada
   e passa a aparecer nas notificações e no painel do gabinete (/equipe/#cmt).

   GET  /api/pendencias?com=1            lista: o desembargador e o gestor veem todos; cada servidor, os seus
   POST /api/pendencias?com=1            {titulo, texto, cnjs[]}  registra o comunicado
   POST /api/pendencias?com=1&ler=1      {id}                     marca como lido (desembargador ou gestor)
*/
const L = require('./_lib');
const ARQ = 'apoio/equipe-comunicados.json';
const dg = s => String(s || '').replace(/\D/g, '');

async function ler() {
  try { const { dados, sha } = await L.lerJson(ARQ); return { dados: dados && typeof dados === 'object' ? dados : { registros: [] }, sha }; }
  catch (e) { if (e.status === 404) return { dados: { registros: [] }, sha: null }; throw e; }
}
async function desembargador(u) {
  if (L.gestor(u)) return true;
  try { const a = await L.acessos(u); return !!(a && a.perfil === 'desembargador'); } catch (e) { return false; }
}
module.exports = async (req, res, u) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const cmt = await desembargador(u);
    if (req.method === 'GET') {
      const { dados } = await ler();
      const todos = (dados.registros || []).filter(r => !r.excluido);
      const meus = cmt ? todos : todos.filter(r => L.norm(r.de) === L.norm(u));
      return res.status(200).json({ comunicados: meus.slice(-60).reverse(), desembargador: cmt });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });

    if (req.query.ler) {
      if (!cmt) return res.status(403).json({ erro: 'Só o desembargador marca o comunicado como lido.' });
      const id = String((req.body || {}).id || '');
      for (let n = 0; n < 4; n++) {
        const { dados, sha } = await ler(); dados.registros = dados.registros || [];
        const alvo = dados.registros.find(r => r.id === id && !r.excluido);
        if (!alvo) return res.status(404).json({ erro: 'comunicado não encontrado' });
        alvo.lidoEm = new Date().toISOString(); alvo.lidoPor = u; dados.atualizadoEm = alvo.lidoEm;
        try { await L.gravarJson(ARQ, dados, sha, 'Comunicado lido por ' + u); return res.status(200).json({ ok: true, comunicado: alvo }); }
        catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
      }
      return res.status(409).json({ erro: 'O arquivo mudou várias vezes seguidas; tente de novo.' });
    }

    const b = req.body || {};
    const texto = String(b.texto || '').trim();
    if (!texto) return res.status(400).json({ erro: 'Escreva a mensagem antes de enviar.' });
    if (texto.length > 8000) return res.status(400).json({ erro: 'A mensagem passou de 8.000 caracteres.' });
    const cnjs = Array.from(new Set((Array.isArray(b.cnjs) ? b.cnjs : []).map(dg).filter(x => x.length === 20))).slice(0, 20);
    const titulo = String(b.titulo || '').trim().slice(0, 160) || 'Comunicado do gabinete';
    for (let n = 0; n < 4; n++) {
      const { dados, sha } = await ler(); dados.registros = dados.registros || [];
      const agora = new Date().toISOString();
      const alvo = { id: 'com-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), de: u, criadoEm: agora, titulo, texto, cnjs, lidoEm: '', lidoPor: '' };
      dados.registros.push(alvo); dados.atualizadoEm = agora;
      try { await L.gravarJson(ARQ, dados, sha, 'Comunicado de ' + u + ': ' + titulo); return res.status(200).json({ ok: true, comunicado: alvo }); }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    res.status(409).json({ erro: 'O arquivo mudou várias vezes seguidas; tente de novo.' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
module.exports.ler = ler;
