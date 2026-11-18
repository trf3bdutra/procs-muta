/* O comunicado detalhado permanece no aplicativo. O template traz a urgência
   e o total de processos, com o atalho fixo para o painel do gabinete. */
module.exports = async function alerta(id, titulo, quantidade) {
  if (!/^URGÊNCIAS? · (PARA CIÊNCIA|PARA ASSINATURA|PENDENTES DE APRECIAÇÃO)$/i.test(titulo)) return 'nao_aplicavel';
  return enviar(id, process.env.CMT_WA_TEMPLATE_URGENCIA, titulo + ' · ' + quantidade + ' processo(s)');
};
module.exports.duvida = function duvida(id) {
  return enviar('duvida-'+id, process.env.CMT_WA_TEMPLATE_DUVIDA, id);
};
module.exports.assinatura = function assinatura(id) {
  return enviar(id, process.env.CMT_WA_TEMPLATE_ASSINATURA, 'Uma decisão ordinária encaminhada para assinatura no Ex Officio.');
};
async function enviar(id, template, resumo) {
  const env = process.env;
  const telefone = String(env.CMT_WA_PHONE || '').replace(/\D/g, '');
  if (!telefone || !env.CMT_WA_ACCOUNT || !env.ZERNIO_API_KEY || !template) return 'sem_configuracao';
  try {
    const r = await fetch('https://zernio.com/api/v1/inbox/conversations', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.ZERNIO_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': id },
      body: JSON.stringify({ accountId: env.CMT_WA_ACCOUNT, participantId: telefone, templateName: template,
        templateLanguage: 'pt_BR', templateParams: [resumo] }),
      signal: AbortSignal.timeout(6500),
    });
    return r.ok ? 'aceito' : 'falhou';
  } catch {
    return 'falhou';
  }
}
