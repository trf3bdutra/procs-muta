/* Chegadas ao gabinete, registradas pela extensão HERO18810 a partir da lista de tarefas do PJe (só o gestor).
   O app não tem esse registro por outra fonte: o que entra aqui é o que a extensão viu chegar no navegador do gestor.

   GET  /api/pauta?chegadas=1[&dia=AAAA-MM-DD]   registros (do dia, ou dos últimos 90 dias)
   POST /api/pauta?chegadas=1  {itens:[{k, em, urg, motivos[], tarefa, texto}]}   acrescenta (por número; o primeiro registro vale)

   Arquivo: apoio/chegadas.json {schema, registros:[{k, cnj, em, dia, urg, motivos, tarefa, texto, por}]} — guarda 90 dias. */
const L = require('./_lib');
const ARQ = 'apoio/chegadas.json';
const dg = s => String(s || '').replace(/\D/g, '');
const fmt = k => k.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6');
/* dia no fuso de Mato Grosso do Sul (UTC-4) */
const diaMS = iso => new Date(Date.parse(iso) - 4 * 3600e3).toISOString().slice(0, 10);

async function ler() {
  try { const { dados, sha } = await L.lerJson(ARQ); return { dados: dados && Array.isArray(dados.registros) ? dados : { registros: [] }, sha }; }
  catch (e) { if (e.status === 404) return { dados: { registros: [] }, sha: undefined }; throw e; }
}
async function handler(req, res, u) {
  res.setHeader('Cache-Control', 'no-store');
  if (!L.gestor(u)) return res.status(403).json({ erro: 'O registro de chegadas é só do gestor.' });
  try {
    if (req.method === 'GET') {
      const { dados } = await ler(), dia = String((req.query || {}).dia || '');
      const R = /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dados.registros.filter(r => r.dia === dia) : dados.registros;
      return res.status(200).json({ registros: R });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const itens = Array.isArray((req.body || {}).itens) ? req.body.itens.slice(0, 300) : [];
    const novos = itens.map(x => {
      const k = dg(x.k); if (k.length !== 20) return null;
      const em = Number.isFinite(Date.parse(x.em)) ? new Date(x.em).toISOString() : new Date().toISOString();
      return { k, cnj: fmt(k), em, dia: diaMS(em), urg: !!x.urg, motivos: (Array.isArray(x.motivos) ? x.motivos : []).map(m => String(m).slice(0, 80)).slice(0, 6),
        tarefa: String(x.tarefa || '').slice(0, 120), texto: String(x.texto || '').slice(0, 500), por: u };
    }).filter(Boolean);
    if (!novos.length) return res.status(200).json({ ok: true, novos: 0 });
    for (let t = 0; t < 3; t++) {
      const { dados, sha } = await ler(), ja = new Set(dados.registros.map(r => r.k));
      const add = novos.filter(n => !ja.has(n.k)); if (!add.length) return res.status(200).json({ ok: true, novos: 0 });
      const corte = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
      const regs = dados.registros.concat(add).filter(r => r.dia >= corte).sort((a, b) => String(a.em).localeCompare(String(b.em)));
      try {
        await L.gravarJson(ARQ, { schema: 'gabcmt.chegadas', versao: 1, registros: regs }, sha, 'Chegadas (' + u + '): ' + add.length + ' processo(s)');
        return res.status(200).json({ ok: true, novos: add.length });
      } catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    return res.status(409).json({ erro: 'conflito ao gravar; tente de novo' });
  } catch (e) { return res.status(500).json({ erro: e.message }); }
}
/* eventos para a central de notificações do app (só o gestor): chegadas com urgência e o relatório do dia, depois das 18h */
async function eventos(u) {
  if (!L.gestor(u)) return [];
  const { dados } = await ler().catch(() => ({ dados: { registros: [] } }));
  const agora = Date.now(), hoje = diaMS(new Date(agora).toISOString()), ev = [];
  const recentes = dados.registros.filter(r => agora - Date.parse(r.em) < 3 * 864e5);
  recentes.filter(r => r.urg).forEach(r => ev.push({ id: 'ch-' + r.k, time: r.em, action: 'chegada', user: 'PJe', title: 'Chegada com urgência · ' + r.cnj,
    message: [r.motivos.join(', '), r.tarefa].filter(Boolean).join(' · '), numero: r.cnj, nivel: 'urgente', origem: 'pje' }));
  const dias = [...new Set(recentes.map(r => r.dia))];
  dias.forEach(d => {
    const fim = Date.parse(d + 'T22:00:00Z'); /* 18h em MS */
    if (d === hoje && agora < fim) return;
    const R = dados.registros.filter(r => r.dia === d), u2 = R.filter(r => r.urg).length;
    ev.push({ id: 'chr-' + d, time: new Date(fim).toISOString(), action: 'chegadas', user: 'PJe', title: 'Relatório de chegadas · ' + d.split('-').reverse().join('/'),
      message: R.length + (R.length === 1 ? ' processo' : ' processos') + (u2 ? ' · ' + u2 + ' com urgência' : ''), nivel: u2 ? 'importante' : 'info', origem: 'pje' });
  });
  return ev;
}
module.exports = handler;
module.exports.eventos = eventos;
module.exports.diaMS = diaMS;
