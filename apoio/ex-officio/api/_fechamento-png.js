/* Envio manual da imagem do fechamento. O PNG vai direto à Meta e o Zernio
   referencia o ID de mídia no cabeçalho do modelo aprovado. */
const crypto = require('node:crypto');
const L = require('./_lib');
const LIMITE = 2 * 1024 * 1024;
const ASSINATURA_PNG = Buffer.from('89504e470d0a1a0a', 'hex');

module.exports = async (req, res, u) => {
  if (!L.gestor(u)) return res.status(403).json({ erro: 'Envio disponível para a gestão.' });
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não aceito.' });
  const env = process.env;
  const telefone = String(env.CMT_WA_PHONE || '').replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(telefone) || !/^\d+$/.test(env.CMT_WA_META_PHONE_ID || '') ||
      !/^v\d+\.\d+$/.test(env.CMT_WA_META_GRAPH_VERSION || '') || !env.CMT_WA_META_TOKEN ||
      !env.ZERNIO_API_KEY || !env.CMT_WA_ACCOUNT || !env.CMT_WA_TEMPLATE_FECHAMENTO_PNG) {
    return res.status(503).json({ erro: 'Envio com imagem ainda não configurado na Meta e no Zernio.' });
  }
  const { png, data, pagina } = req.body || {};
  if (!L.dataOk(data) || !Number.isInteger(pagina) || pagina < 1 || pagina > 30 ||
      typeof png !== 'string' || png.length > Math.ceil(LIMITE / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(png)) {
    return res.status(400).json({ erro: 'Imagem ou identificação do fechamento inválida.' });
  }
  const imagem = Buffer.from(png, 'base64');
  if (imagem.length < 33 || imagem.length > LIMITE || !imagem.subarray(0,8).equals(ASSINATURA_PNG) ||
      imagem.toString('ascii', 12, 16) !== 'IHDR' || imagem.readUInt32BE(16) !== 1080 ||
      imagem.readUInt32BE(20) < 1 || imagem.readUInt32BE(20) > 1950) {
    return res.status(400).json({ erro: 'PNG inválido ou acima do limite.' });
  }
  const chave = crypto.createHash('sha256').update(env.CMT_WA_ACCOUNT).update(':').update(telefone)
    .update(':').update(data).update(':').update(String(pagina)).update(imagem).digest('hex');
  try {
    const form = new FormData();
    form.set('messaging_product', 'whatsapp');
    form.set('type', 'image/png');
    form.set('file', new Blob([imagem], { type: 'image/png' }), 'fechamento.png');
    const meta = await fetch('https://graph.facebook.com/'+env.CMT_WA_META_GRAPH_VERSION+'/'+env.CMT_WA_META_PHONE_ID+'/media', {
      method: 'POST', redirect: 'error', headers: { Authorization: 'Bearer '+env.CMT_WA_META_TOKEN },
      body: form, signal: AbortSignal.timeout(8000),
    });
    const medio = meta.ok ? await meta.json() : null;
    if (!medio?.id) return res.status(502).json({ erro: 'A Meta não confirmou o upload do PNG.', statusCanal: meta.status });
    const { resposta: zernio, copia } = await require('./_zernio-copia').enviarModelo({
        accountId: env.CMT_WA_ACCOUNT, templateName: env.CMT_WA_TEMPLATE_FECHAMENTO_PNG,
        templateLanguage: 'pt_BR', templateParams: [data.split('-').reverse().join('/')+' · página '+pagina],
        headerMedia: { id: String(medio.id) },
      }, chave);
    if (!zernio.ok) return res.status(502).json({ erro: 'Zernio não confirmou o envio do PNG.', statusCanal: zernio.status });
    const resposta = await zernio.json();
    if (!resposta?.data?.messageId) return res.status(502).json({ erro: 'Zernio não retornou a identificação da mensagem.' });
    return res.status(200).json({ aceito: true, copia });
  } catch {
    return res.status(502).json({ erro: 'Não foi possível confirmar o envio pelo Zernio.' });
  }
};
