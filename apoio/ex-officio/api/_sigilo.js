/* Sigilo de processos e documentos (extensão HERO18810 e gravação do inteiro teor).
   Servido por /api/pauta?sigilo=… (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam):
   GET  /api/pauta?sigilo=<CNJ>[&t=<token>]   { sigilo: 'Segredo de Justiça' | 'Sigiloso' | '', liberado, porque }
   POST /api/pauta?sigilo=1 { cnj, senha }    confere a senha (variável HERO_SIGILO_SENHA) e devolve { token, ate } para este processo,
                                              válido por 8 horas; nada é gravado.
   Regras: o processo é sigiloso pelo acervo (Nível_Sigilo, Sigiloso ou Consta_Acervo_Sigiloso). Sem restrição para o perfil
   desembargador e para o gestor; os demais precisam da senha. A restrição vale para a leitura e a gravação do inteiro teor
   (Autos), não para a ficha. */
const crypto = require('crypto');
const L = require('./_lib');
const dg = s => String(s || '').replace(/\D/g, '');
const VALIDADE = 8 * 3600e3;
const sigiloDe = r => !r ? '' : String(r['Nível_Sigilo'] || '').trim() || (/^(sim|true|s)$/i.test(String(r.Sigiloso || '').trim()) || String(r.Consta_Acervo_Sigiloso || '').trim() === 'Sim' ? 'Sigiloso' : '');
function chave() { return process.env.HERO_SIGILO_SENHA || ''; }
function assinar(cnj, ate) { return crypto.createHmac('sha256', 'hero-sigilo|' + chave()).update(dg(cnj) + '|' + ate).digest('base64url'); }
function emitir(cnj) { const ate = Date.now() + VALIDADE; return { token: ate + '.' + assinar(cnj, ate), ate: new Date(ate).toISOString() }; }
function tokenOk(cnj, t) {
  if (!chave() || !t) return false;
  const [a, s] = String(t).split('.'), ate = Number(a);
  if (!ate || ate < Date.now() || !s) return false;
  const x = Buffer.from(assinar(cnj, ate)), y = Buffer.from(s);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
async function semRestricao(u) {
  if (L.gestor(u)) return 'gestor';
  try { const p = await L.acessos(u); if (p && p.desembargador) return 'desembargador'; } catch (e) {}
  return '';
}
async function situacao(u, cnj, token, fonte) {
  const sig = sigiloDe(fonte);
  const quem = await semRestricao(u);
  if (!sig) return { sigilo: '', liberado: true, porque: quem };
  if (quem) return { sigilo: sig, liberado: true, porque: quem };
  if (tokenOk(cnj, token)) return { sigilo: sig, liberado: true, porque: 'senha' };
  return { sigilo: sig, liberado: false, porque: '' };
}
module.exports = async (req, res, u, fonteDe) => {
  try {
    if (req.method === 'GET') {
      const cnj = String(req.query.sigilo || '');
      if (dg(cnj).length !== 20) return res.status(400).json({ erro: 'número do processo inválido' });
      return res.status(200).json(await situacao(u, cnj, req.query.t, await fonteDe(cnj)));
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, cnj = String(b.cnj || '');
    if (dg(cnj).length !== 20) return res.status(400).json({ erro: 'número do processo inválido' });
    if (!chave()) return res.status(503).json({ erro: 'A senha de sigilo ainda não foi configurada (HERO_SIGILO_SENHA).' });
    const x = Buffer.from(String(b.senha || '')), y = Buffer.from(chave());
    if (x.length !== y.length || !crypto.timingSafeEqual(x, y)) return res.status(403).json({ erro: 'Senha incorreta.' });
    return res.status(200).json(Object.assign({ ok: true }, emitir(cnj)));
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
module.exports.situacao = situacao;
module.exports.sigiloDe = sigiloDe;
module.exports.tokenOk = tokenOk;
