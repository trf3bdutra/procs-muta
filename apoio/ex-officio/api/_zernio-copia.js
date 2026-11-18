const API = 'https://zernio.com/api/v1/inbox/conversations';
const telefone = value => String(value || '').replace(/\D/g, '');
const valido = value => /^\d{8,15}$/.test(value);

function enviarModeloAoNumero(numero, mensagem, chave) {
  return fetch(API, {
    method: 'POST', redirect: 'error',
    headers: { Authorization: 'Bearer ' + process.env.ZERNIO_API_KEY,
      'Content-Type': 'application/json', 'Idempotency-Key': chave },
    body: JSON.stringify({ ...mensagem, participantId: numero }),
    signal: AbortSignal.timeout(6500),
  });
}

function destinoCopia() {
  const numero = telefone(process.env.CMT_WA_COPY_PHONE);
  return valido(numero) && numero !== telefone(process.env.CMT_WA_PHONE) ? numero : '';
}

function registrarFalhaCopia(tipo, http) {
  console.warn('Zernio: cópia não aceita', { tipo, http });
  return 'falhou';
}

async function copiarModelo(mensagem, chave) {
  const copia = destinoCopia();
  if (!copia) return 'sem_configuracao';
  try {
    const r = await enviarModeloAoNumero(copia, mensagem, chave + '-copia');
    return r.ok ? 'aceito' : registrarFalhaCopia(mensagem.templateName, r.status);
  } catch {
    return registrarFalhaCopia(mensagem.templateName, 0);
  }
}

async function enviarModelo(mensagem, chave) {
  const resposta = await enviarModeloAoNumero(telefone(process.env.CMT_WA_PHONE), mensagem, chave);
  const copia = resposta.ok ? await copiarModelo(mensagem, chave) : 'nao_tentada';
  return { resposta, copia };
}

/* A cópia pode ocorrer fora da janela de atendimento de Bruno. Usa um
   modelo próprio aprovado, com duas variáveis: posição e trecho da resposta. */
async function copiarResposta(conta, mensagem, chave) {
  const templateName = process.env.CMT_WA_TEMPLATE_COPIA_RESPOSTA;
  if (!templateName || !destinoCopia()) return 'sem_configuracao';
  const texto = mensagem.trim().replace(/[\r\n]+/g, ' · ').replace(/\s+/g, ' ');
  const partes = texto.match(/.{1,800}/gu) || [];
  for (const [i, parte] of partes.entries()) {
    const r = await copiarModelo({ accountId: conta, templateName, templateLanguage: 'pt_BR',
      templateParams: [(i + 1) + '/' + partes.length, parte] }, chave + '-resposta-' + (i + 1));
    if (r !== 'aceito') return r;
  }
  return 'aceito';
}

module.exports = { enviarModelo, copiarResposta };
