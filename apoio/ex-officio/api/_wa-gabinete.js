/* WhatsApp do desembargador pela página Comunicação do Caput (Zernio). Rota: /api/notificacoes?wa=1, só o gestor.
   GET   estado da configuração (sem expor valores) e os últimos envios.
   POST  {texto, modo}  modo 'livre': mensagem na conversa do Dr. (CMT_WA_CONVERSATION), aceita pelo WhatsApp só dentro
         da janela de 24 h depois da última mensagem dele; modo 'modelo': modelo aprovado (CMT_WA_TEMPLATE_AVISO) ao CMT_WA_PHONE,
         com o texto como parâmetro, para quando a janela estiver fechada.
   Chave da Zernio: ZERNIO_API_KEY (ou CAPUT_KEY). Registro dos envios: apoio/equipe-whatsapp.json (texto, quem, quando, situação). */
const crypto = require('crypto');
const L = require('./_lib');
const ARQ = 'apoio/equipe-whatsapp.json';
const cfg = () => { const e = process.env; return { chave: e.ZERNIO_API_KEY || e.CAPUT_KEY || '', conta: e.CMT_WA_ACCOUNT || '', conversa: e.CMT_WA_CONVERSATION || '',
  fone: String(e.CMT_WA_PHONE || '').replace(/\D/g, ''), modelo: e.CMT_WA_TEMPLATE_AVISO || '' }; };
async function ler() {
  try { const { dados, sha } = await L.lerJson(ARQ); return { dados: dados && typeof dados === 'object' ? dados : { registros: [] }, sha }; }
  catch (e) { if (e.status === 404) return { dados: { schema: 'gabcmt.whatsapp', versao: 1, registros: [] }, sha: undefined }; throw e; }
}
async function erroDe(r) { let d = ''; try { const j = await r.json(); d = String(j.error || j.message || j.erro || (j.errors && JSON.stringify(j.errors)) || ''); } catch (e) {} return (d || 'HTTP ' + r.status).slice(0, 240); }
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const u = L.exigir(req, res); if (!u) return;
  if (!L.gestor(u)) return res.status(403).json({ erro: 'Área restrita ao gestor da equipe.' });
  const c = cfg();
  try {
    if (req.method === 'GET') {
      const { dados } = await ler();
      return res.status(200).json({ configurado: { chave: !!c.chave, conta: !!c.conta, conversa: !!c.conversa, telefone: !!c.fone, modelo: !!c.modelo }, registros: (dados.registros || []).slice(-30).reverse() });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, texto = String(b.texto || '').trim().slice(0, 3800), modo = b.modo === 'modelo' ? 'modelo' : 'livre';
    if (!texto) return res.status(400).json({ erro: 'Escreva a mensagem.' });
    if (!c.chave || !c.conta) return res.status(503).json({ erro: 'Zernio não configurada no servidor: falta a chave (ZERNIO_API_KEY ou CAPUT_KEY) ou a conta (CMT_WA_ACCOUNT).' });
    if (modo === 'livre' && !c.conversa) return res.status(503).json({ erro: 'Falta a conversa do Dr. no servidor (CMT_WA_CONVERSATION).' });
    if (modo === 'modelo' && (!c.modelo || !c.fone)) return res.status(503).json({ erro: 'Falta o modelo aprovado (CMT_WA_TEMPLATE_AVISO) ou o número do Dr. (CMT_WA_PHONE).' });
    const chave = crypto.createHash('sha256').update(u + '|' + modo + '|' + texto + '|' + Date.now()).digest('hex').slice(0, 32);
    const h = { Authorization: 'Bearer ' + c.chave, 'Content-Type': 'application/json', 'Idempotency-Key': chave };
    const r = modo === 'livre'
      ? await fetch('https://zernio.com/api/v1/inbox/conversations/' + encodeURIComponent(c.conversa) + '/messages', { method: 'POST', redirect: 'error', headers: h, body: JSON.stringify({ accountId: c.conta, message: texto }), signal: AbortSignal.timeout(8000) })
      : await fetch('https://zernio.com/api/v1/inbox/conversations', { method: 'POST', redirect: 'error', headers: h, body: JSON.stringify({ accountId: c.conta, templateName: c.modelo, templateLanguage: 'pt_BR', templateParams: [texto.slice(0, 900)], participantId: c.fone }), signal: AbortSignal.timeout(8000) });
    const ok = r.ok, detalhe = ok ? '' : await erroDe(r), status = ok ? 'enviado' : 'falhou';
    for (let t = 0; t < 4; t++) {
      const { dados, sha } = await ler(); dados.registros = dados.registros || [];
      dados.registros.push({ id: 'wa-' + chave.slice(0, 10), em: new Date().toISOString(), por: u, modo, texto, status, detalhe });
      if (dados.registros.length > 300) dados.registros = dados.registros.slice(-300); dados.atualizadoEm = new Date().toISOString();
      try { await L.gravarJson(ARQ, dados, sha, 'WhatsApp do Dr.: ' + status + ' (' + u + ')'); break; } catch (e) { if (e.status !== 409 && e.status !== 422) break; }
    }
    return res.status(ok ? 200 : 502).json({ ok, status, detalhe });
  } catch (e) { return res.status(500).json({ erro: e.message }); }
};
