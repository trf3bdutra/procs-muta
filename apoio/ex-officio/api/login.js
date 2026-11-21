const L = require('./_lib');
/* registro de entradas (apoio/registro-entradas.json): cada login vira uma linha no Registro de atividades da Chefia.
   Guarda as 500 mais recentes; o commit "Entrada (Nome): <app>" é o que o registro lê. Nunca atrapalha o login. */
const REG = 'apoio/registro-entradas.json';
function ondeDe(req) { let p = ''; try { p = new URL(String(req.headers.referer || '')).pathname; } catch (e) {}
  return /^\/caput/.test(p) ? 'Caput' : /^\/(modus|editor|compendio)/.test(p) ? 'Compendium' : /^\/amicus/.test(p) ? 'Amicus Curiae' : /^\/cmt/.test(p) ? 'Painel do Desembargador' : 'Ex Officio'; }
/* falha = senha que não confere: grava com o nome do cadastro (ou "nome não cadastrado"), no máximo uma vez a cada 10 minutos por nome */
async function registrarEntrada(nome, onde, falha) {
  for (let t = 0; t < 3; t++) {
    let dados = { schema: 'gabcmt.registro.entradas', versao: 1, registros: [] }, sha;
    try { const o = await L.gh('/contents/' + REG); sha = o.sha; dados = JSON.parse(Buffer.from(o.content, 'base64').toString('utf8')); } catch (e) { if (e.status !== 404) throw e; }
    if (falha && (dados.registros || []).some(r => r.falha && r.quem === nome && Date.now() - Date.parse(r.em) < 10 * 60e3)) return;
    dados.registros = (dados.registros || []).concat([Object.assign({ em: new Date().toISOString(), quem: nome, onde }, falha ? { falha: true } : {})]).slice(-500);
    try { await L.gh('/contents/' + REG, { method: 'PUT', body: JSON.stringify({ message: (falha ? 'Entrada recusada (' : 'Entrada (') + nome + '): ' + onde + (falha ? ' · senha não confere' : ''), content: Buffer.from(JSON.stringify(dados, null, 1) + '\n').toString('base64'), sha }) }); return; }
    catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
  }
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') { const u = L.quem(req); if (!u) return res.status(401).json({ erro: 'sem sessão' }); const a = await L.acessos(u).catch(() => ({})); return res.status(200).json({ usuario: u, gestor: L.gestor(u), perfil: a.perfil || 'equipe', desembargador: !!a.desembargador, assessoria: !!a.assessoria }); }
    if (req.method === 'DELETE') { L.sair(res); return res.status(200).json({ ok: true }); }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, nome = L.conferir(b.usuario, b.senha);
    if (!nome) {
      const k = L.norm(b.usuario), cad = L.equipe().find(x => L.norm(x) === k);
      await Promise.race([registrarEntrada(cad || 'nome não cadastrado', ondeDe(req), true).catch(() => {}), new Promise(r => setTimeout(r, 2000))]);
      return setTimeout(() => res.status(401).json({ erro: 'Nome ou senha não conferem.' }), 300);
    }
    L.emitir(res, nome);
    await Promise.race([registrarEntrada(nome, ondeDe(req)).catch(() => {}), new Promise(r => setTimeout(r, 2500))]);
    const ac = await L.acessos(nome).catch(() => ({})); res.status(200).json({ usuario: nome, gestor: L.gestor(nome), perfil: ac.perfil || 'equipe', desembargador: !!ac.desembargador, assessoria: !!ac.assessoria });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
