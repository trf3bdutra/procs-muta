/* WhatsApp Business Cloud API · webhook do gabinete (Vercel, rota /api/whatsapp).
   Variáveis de ambiente, só na Vercel (nunca no repositório):
   WA_VERIFY_TOKEN     segredo longo combinado com a Meta na aba Webhooks do aplicativo
   WA_APP_SECRET       Chave Secreta do Aplicativo (Configurações › Básico), confere a assinatura de cada envio
   WA_TOKEN            token de acesso do WhatsApp (temporário na fase de teste; permanente depois)
   WA_PHONE_ID         identificação do número remetente (o número de teste da Meta na fase de teste)
   WA_DESTINATARIOS    números autorizados a receber, separados por vírgula, com código do país (ex.: 5567...)

   GET  /api/whatsapp   verificação do webhook pela Meta (hub.challenge)
   POST /api/whatsapp   recebimento de mensagens e de status de entrega

   Nenhum dado processual sai por aqui: o recebimento só registra o remetente e o tipo da mensagem,
   e o envio recusa destinatário fora de WA_DESTINATARIOS. O conteúdo recebido não é gravado nem ecoado. */
const crypto = require('crypto');

const dg = s => String(s || '').replace(/\D/g, '');
const autorizados = () => String(process.env.WA_DESTINATARIOS || '').split(',').map(dg).filter(Boolean);

/* corpo cru: a assinatura da Meta é calculada sobre os bytes recebidos, não sobre o objeto já lido */
function cru(req) {
  return new Promise((ok, falha) => {
    const p = []; req.on('data', c => p.push(c)); req.on('end', () => ok(Buffer.concat(p))); req.on('error', falha);
  });
}
function assinado(buf, cab) {
  const s = process.env.WA_APP_SECRET; if (!s) return false;
  const m = /^sha256=([a-f0-9]{64})$/i.exec(String(cab || '')); if (!m) return false;
  const meu = crypto.createHmac('sha256', s).update(buf).digest('hex');
  const a = Buffer.from(meu, 'hex'), b = Buffer.from(m[1].toLowerCase(), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* envio avulso, para uso de outras funções do Ex Officio; recusa número não autorizado */
async function enviar(para, texto) {
  const t = process.env.WA_TOKEN, id = process.env.WA_PHONE_ID;
  if (!t || !id) throw new Error('WA_TOKEN ou WA_PHONE_ID ausente na Vercel');
  const n = dg(para);
  if (!autorizados().includes(n)) { const e = new Error('destinatário fora da lista autorizada'); e.status = 403; throw e; }
  const r = await fetch('https://graph.facebook.com/v23.0/' + id + '/messages', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: n, type: 'text', text: { body: String(texto || '').slice(0, 4096) } })
  });
  if (!r.ok) { let m = ''; try { m = JSON.stringify((await r.json()).error || {}); } catch (e) {} const er = new Error('Cloud API HTTP ' + r.status + (m ? ' · ' + m : '')); er.status = r.status; throw er; }
  return r.json();
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const q = req.query || {}, esperado = process.env.WA_VERIFY_TOKEN;
    if (!esperado) return res.status(500).send('WA_VERIFY_TOKEN ausente na Vercel');
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === esperado) return res.status(200).send(String(q['hub.challenge'] || ''));
    return res.status(403).send('verificação recusada');
  }

  if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });

  let buf;
  try { buf = await cru(req); } catch (e) { return res.status(400).json({ erro: 'corpo ilegível' }); }
  if (!assinado(buf, req.headers['x-hub-signature-256'])) return res.status(401).json({ erro: 'assinatura inválida' });

  /* responde antes de qualquer trabalho: a Meta reenvia o evento se demorar */
  res.status(200).json({ ok: true });

  let corpo = {};
  try { corpo = JSON.parse(buf.toString('utf8')); } catch (e) { return; }
  (corpo.entry || []).forEach(en => (en.changes || []).forEach(mu => {
    const v = mu.value || {};
    (v.messages || []).forEach(m => console.log('[whatsapp] mensagem de', dg(m.from).slice(-4), '· tipo', m.type));
    (v.statuses || []).forEach(s => console.log('[whatsapp] status', s.status, '· mensagem', s.id));
  }));
};

/* a assinatura exige os bytes originais */
module.exports.config = { api: { bodyParser: false } };
module.exports.enviar = enviar;
