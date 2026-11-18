/* Pedidos de sustentação oral e de preferência que chegam por e-mail (AgentMail, inbox de recebimento).
   Servido por /api/sessoes?pedidos=1 (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam).
   POST /api/sessoes?pedidos=1&k=<CMT_AGENTMAIL_TOKEN>   webhook do AgentMail (evento message.received), sem sessão de usuário:
        lê o e-mail do TRF3 ("Pedido de Sustentação Oral por Videoconferência", "Presencial", "Preferência"), fica só com os do
        Gabinete A (relator Des. Fed. Carlos Muta, ou processo que já está numa pauta nossa), registra em apoio/sustentacoes.json,
        marca o processo na pauta da sessão (ctl.sopref: Virtual, Presencial ou Preferência, o mesmo campo do cartão) e avisa a
        equipe (apoio/equipe-avisos.json, que alimenta as notificações). O que não achar a sessão ou o processo fica "a vincular".
   GET  /api/sessoes?pedidos=1                        lista os pedidos (equipe logada)
   POST /api/sessoes?pedidos=1 {id, data, cnj}        vincula à mão um pedido "a vincular" (só o gestor)
   Não guarda e-mail, telefone nem CPF: só tipo, advogado e OAB, parte, processo, sessão e quando chegou. */
const crypto = require('crypto');
const L = require('./_lib');
const ARQ = 'apoio/sustentacoes.json', AV = 'apoio/equipe-avisos.json';
const dg = s => String(s || '').replace(/\D/g, '');
const cnjFmt = d => (d = dg(d)).length === 20 ? d.slice(0, 7) + '-' + d.slice(7, 9) + '.' + d.slice(9, 13) + '.' + d.slice(13, 14) + '.' + d.slice(14, 16) + '.' + d.slice(16) : '';
const br = iso => String(iso || '').split('-').reverse().join('/');
const vazio = () => ({ schema: 'gabcmt.sustentacoes', versao: 1, atualizadoEm: '', registros: [] });

/* ---------- leitura do e-mail ---------- */
const ROT = [['solicitante', 'solicitante'], ['advogado', 'advogad[oa](?:\\s*\\/\\s*oab)?'], ['processo', 'n[uú]mero do processo'], ['parte', 'parte representada'],
  ['orgao', '[oó]rg[aã]o julgador'], ['relator', 'relator(?:\\(a\\))?'], ['data', 'data da sess[aã]o'], ['tipo', 'tipo(?: de solicita[cç][aã]o)?']];
function campos(txt) {
  const o = {}, T = String(txt || '');
  ROT.forEach(([k, rot]) => { const m = new RegExp('^[ \\t]*' + rot + '[ \\t]*:?[ \\t]+(\\S.*?)[ \\t]*$', 'im').exec(T); if (m) o[k] = m[1].trim(); });
  return o;
}
function tipoDe(assunto, t) {
  const s = (assunto || '') + ' ' + (t || '');
  if (/prefer[eê]ncia/i.test(s)) return 'Preferência';
  /* o TRF3 manda "Pedido de Sustentação Oral por Videoconferência" ou só "Pedido de Sustentação Oral" (presencial) */
  if (/sustenta[cç][aã]o oral/i.test(s)) return /videoconfer|virtual/i.test(s) ? 'Virtual' : 'Presencial';
  return '';
}
function oabDe(adv) { const m = /\(([A-Z]{2})?\s*(\d[\d.]*)\)/.exec(adv || ''); return m ? ((m[1] ? m[1] + ' ' : '') + m[2].replace(/\./g, '')) : ''; }
function ler(msg) {
  const txt = msg.text || msg.extracted_text || msg.extractedText || '';
  const c = campos(txt), assunto = msg.subject || '';
  const cnj = cnjFmt(c.processo || (/\b(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/.exec(txt) || [])[1]);
  const dm = /(\d{2})\/(\d{2})\/(\d{4})/.exec(c.data || ''), data = dm ? dm[3] + '-' + dm[2] + '-' + dm[1] : '';
  const adv = String(c.advogado || '').replace(/^dr[a]?\.?\s+/i, '').trim();
  return { tipo: tipoDe(assunto, c.tipo), cnj, data, advogado: adv.replace(/\s*\([^)]*\)\s*$/, ''), oab: oabDe(adv), parte: c.parte || '', relator: c.relator || '', orgao: c.orgao || '' };
}

/* ---------- vínculo com a pauta ---------- */
async function acharNaPauta(data, cnj) {
  if (!L.dataOk(data)) return null;
  try { const { dados } = await L.lerJson('acervo/sessoes/' + data + '.json');
    for (const lista of ['itens', 'previa']) { const it = (dados[lista] || []).find(i => dg(i.cnj) === dg(cnj)); if (it) return { lista, item: it.item || '' }; }
  } catch (e) { if (e.status !== 404) throw e; }
  return null;
}
async function marcar(data, achado, p) {
  const { gravarItem } = require('./pauta');
  return gravarItem(data, { cnj: p.cnj, lista: achado.lista, campos: { sopref: p.tipo } }, 'AgentMail', false);
}
async function avisar(p) {
  for (let t = 0; t < 4; t++) {
    let dados, sha; try { ({ dados, sha } = await L.lerJson(AV)); } catch (e) { if (e.status !== 404) throw e; dados = { schema: 'gabcmt.equipe.avisos', versao: 1, registros: [] }; }
    dados.registros = dados.registros || [];
    const rot = p.tipo === 'Preferência' ? 'Preferência' : 'Sustentação oral' + (p.tipo === 'Presencial' ? ' presencial' : ' por videoconferência');
    dados.registros.unshift({ id: 'av-so-' + p.id, time: new Date().toISOString(), user: 'AgentMail', title: rot + ' · sessão de ' + br(p.data) + (p.estado === 'a vincular' ? ' · a vincular' : ''),
      message: [p.cnj, p.vinculo && p.vinculo.item ? 'item ' + p.vinculo.item : '', p.advogado + (p.oab ? ' (OAB ' + p.oab + ')' : ''), p.parte ? 'por ' + p.parte : ''].filter(Boolean).join(' · '),
      link: '', linkTxt: '', nivel: 'importante', painel: false, notificacao: true, para: [], ate: p.data || '', fixo: false });
    dados.atualizadoEm = new Date().toISOString();
    try { await L.gravarJson(AV, dados, sha, 'AgentMail: aviso de ' + rot.toLowerCase() + ' · ' + p.cnj); return; } catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
  }
}
async function registrar(p) {
  for (let t = 0; t < 4; t++) {
    let dados, sha; try { ({ dados, sha } = await L.lerJson(ARQ)); } catch (e) { if (e.status !== 404) throw e; dados = vazio(); }
    dados.registros = dados.registros || [];
    const i = dados.registros.findIndex(r => r.id === p.id);
    if (i >= 0) dados.registros[i] = Object.assign(dados.registros[i], p); else dados.registros.unshift(p);
    dados.atualizadoEm = new Date().toISOString();
    try { await L.gravarJson(ARQ, dados, sha, 'AgentMail: pedido de ' + (p.tipo === 'Preferência' ? 'preferência' : 'sustentação oral ' + (p.tipo || '').toLowerCase()) + ' · ' + (p.cnj || 'sem número') + ' · ' + p.estado); return; }
    catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
  }
  throw new Error('apoio/sustentacoes.json mudou várias vezes seguidas');
}
async function tratar(p) {
  const achado = p.cnj && p.data ? await acharNaPauta(p.data, p.cnj) : null;
  if (achado) { const r = await marcar(p.data, achado, p); if (r.status !== 200) throw new Error('pauta: ' + JSON.stringify(r.body)); p.vinculo = { sessao: p.data, lista: achado.lista, item: achado.item }; p.estado = 'vinculado'; }
  else p.estado = 'a vincular';
  await registrar(p);
  await avisar(p);
  return p;
}

/* ---------- rota ---------- */
const igual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    /* webhook do AgentMail */
    if (req.method === 'POST' && req.query.k != null) {
      const tok = process.env.CMT_AGENTMAIL_TOKEN; if (!tok || !igual(tok, req.query.k)) return res.status(401).json({ erro: 'token inválido' });
      const b = req.body || {}, ev = b.event_type || b.eventType || b.type, msg = b.message || b.data || {};
      if (ev && !/message\.received/.test(ev)) return res.status(200).json({ ignorado: 'evento ' + ev });
      const inbox = msg.inbox_id || msg.inboxId || '', esperado = process.env.CMT_AGENTMAIL_INBOX || '';
      if (esperado && inbox && inbox !== esperado) return res.status(200).json({ ignorado: 'outra inbox' });
      const de = String(msg.from || ''); if (/agentmail\.to/i.test(de)) return res.status(200).json({ ignorado: 'mensagem da própria inbox' });
      const p = ler(msg);
      if (!p.tipo || !p.cnj) return res.status(200).json({ ignorado: 'não parece pedido de sustentação ou preferência' });
      const nosso = /carlos\s+muta/i.test(p.relator) || !!(p.data && await acharNaPauta(p.data, p.cnj));
      if (!nosso) return res.status(200).json({ ignorado: 'de outro gabinete (' + (p.relator || 'relator não informado') + ')' });
      p.id = 'so-' + crypto.createHash('sha1').update(String(msg.message_id || msg.messageId || '') || (p.cnj + p.tipo + p.data)).digest('hex').slice(0, 12);
      p.recebidoEm = msg.timestamp || new Date().toISOString();
      const r = await tratar(p);
      return res.status(200).json({ ok: true, estado: r.estado, cnj: r.cnj, sessao: r.data });
    }
    /* equipe */
    const u = L.exigir(req, res); if (!u) return;
    if (req.method === 'GET') { let d; try { d = (await L.lerJson(ARQ)).dados; } catch (e) { if (e.status !== 404) throw e; d = vazio(); } return res.status(200).json(d); }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    if (!L.gestor(u)) return res.status(403).json({ erro: 'Só o gestor vincula pedidos à mão.' });
    const b = req.body || {}, { dados } = await L.lerJson(ARQ), p = (dados.registros || []).find(r => r.id === b.id);
    if (!p) return res.status(404).json({ erro: 'pedido não encontrado' });
    if (b.data) p.data = b.data; if (b.cnj) p.cnj = cnjFmt(b.cnj);
    const achado = await acharNaPauta(p.data, p.cnj);
    if (!achado) return res.status(404).json({ erro: 'processo não está na pauta de ' + br(p.data) });
    const r = await marcar(p.data, achado, p); if (r.status !== 200) return res.status(r.status).json(r.body);
    p.vinculo = { sessao: p.data, lista: achado.lista, item: achado.item }; p.estado = 'vinculado'; p.vinculadoPor = u;
    await registrar(p);
    res.status(200).json({ ok: true, pedido: p });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
module.exports.ler = ler;
