/* WhatsApp do relator via Zernio. Route: POST /api/painel?whatsapp=1.
   Configure ZERNIO_API_KEY, ZERNIO_WEBHOOK_SECRET, CMT_WA_ACCOUNT,
   CMT_WA_CONVERSATION, CMT_WA_PHONE (E.164) and CMT_WA_RELATOR (login Ex Officio). */
const crypto = require('node:crypto');
const L = require('./_lib');

const digits = value => String(value || '').replace(/\D/g, '');
const describeDate = value => String(value || '').split('-').reverse().join('/');
const MENU = [
  '*GABINETE · CONSULTAS E RESPOSTAS*',
  'Como está a sessão? · Como está a sessão de 07/12/2026?',
  'Como está o processo [CNJ]? · Produtividade de [nome] · Urgências · Dúvidas',
  'Liberei os itens 34 e 36 da sessão de 07/12/2026',
  'Devolver o item 35 da sessão de 07/12/2026: [orientação]',
  'Responder [código da dúvida]: [resposta]',
].join('\n');

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function rawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > 96 * 1024) throw Object.assign(new Error('Payload excede o limite.'), { status: 413 });
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

function signed(raw, supplied, secret) {
  if (!/^[0-9a-f]{64}$/i.test(String(supplied || ''))) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(supplied, 'hex'));
}

function readDate(day, month, year) {
  const date = year + '-' + month + '-' + day;
  const parsed = new Date(date + 'T00:00:00Z');
  return !isNaN(parsed) && parsed.toISOString().slice(0, 10) === date ? date : '';
}

async function cmt(user, method, query, body, event) {
  let status;
  let payload;
  const res = { setHeader() {}, status(code) { status = code; return this; }, json(data) { payload = data; } };
  await require('./_cmt')({ method, query, body, whatsappEvent: event }, res, user);
  if (status >= 400) throw Object.assign(new Error(payload.erro), { status });
  return payload;
}

async function answer(text, user, event, sentAt) {
  if (/^(menu|ol[aá]|bom dia|boa tarde|boa noite)[!?. ]*$/i.test(text)) return MENU;
  const liberar = /^(?:liberei|liberar) (?:os? )?itens?\s+(\d+(?:(?:\s*,\s*|\s+e\s+)\d+)*)\s+(?:da )?sess[aã]o de (\d{2})\/(\d{2})\/(\d{4})[.!]?$/i.exec(text);
  const devolver = /^devolver (?:o )?item (\d+) da sess[aã]o de (\d{2})\/(\d{2})\/(\d{4}):\s*([\s\S]+)$/i.exec(text);
  const responder = /^responder ([a-z0-9-]+):\s*([\s\S]+)$/i.exec(text);
  const sessao = /^(?:como est[aá] a )?(?:sess[aã]o|pauta)(?: de (\d{2})\/(\d{2})\/(\d{4}))?[?!.]?$/i.exec(text);
  const producao = /^produtividade de (.+?)[?!.]?$/i.exec(text);
  const producaoHoje = /^quantos processos (.+?) produziu hoje[?!.]?$/i.exec(text);
  const processo = /^(?:como est[aá] o )?processo (\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})(?: na sess[aã]o de (\d{2})\/(\d{2})\/(\d{4}))?[?!.]?$/i.exec(text);
  const duvidas = /^d[uú]vidas[?!.]?$/i.test(text);
  const urgencias = /^urg[eê]ncias[?!.]?$/i.test(text);

  if (!(liberar || devolver || responder || sessao || processo || producao || producaoHoje || duvidas || urgencias)) return MENU;
  if (liberar || devolver || responder) {
    if (Date.now() - sentAt > 24 * 3600e3) return 'A mensagem tem mais de 24 horas. Envie o comando novamente.';
    const anotacao = devolver?.[5] || responder?.[2];
    if (anotacao && anotacao.trim().length > 2000) return 'Envie uma orientação de até 2.000 caracteres.';
  }
  if (responder) {
    await cmt(user, 'POST', {}, { acao: 'responder', id: responder[1], texto: responder[2] }, event);
    return 'Resposta registrada na dúvida '+responder[1]+'.';
  }
  const match = liberar || devolver || sessao || processo;
  const dateParts = match?.slice(match === sessao ? 1 : 2, match === sessao ? 4 : 5);
  const date = dateParts?.[0] ? readDate(...dateParts) : '';
  if (dateParts?.[0] && !date) return 'Informe uma data válida no formato DD/MM/AAAA.';
  const hoje = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
  const data = await cmt(user, 'GET', { s: date, pde: hoje, pate: hoje });
  const pauta = data.pauta || {};
  if (liberar || devolver) {
    if (!date || date !== pauta.date || pauta.previa) return 'Informe uma sessão com pauta publicada e itens numerados.';
    const numeros = [...new Set(match[1].match(/\d+/g).map(Number))];
    if (numeros.length > 10) return 'Informe até 10 itens por mensagem.';
    const itens = numeros.map(numero => (pauta.itens || []).filter(x => /^\d+$/.test(String(x.item)) && Number(x.item) === numero));
    if (itens.some(x => x.length !== 1)) return 'Pelo menos um dos itens não foi identificado de forma única. Confira os números da sessão.';
    const feitos = [];
    for (const [item] of itens) {
      if (devolver && !item.servidor) return 'O item não tem minutante vinculado.';
      const corpo = { acao: devolver ? 'devolver' : 'liberar', cnj: item.cnj, sessao: date };
      if (devolver) Object.assign(corpo, { texto: devolver[5], para: item.servidor });
      try { await cmt(user, 'POST', {}, corpo, event); }
      catch (erro) {
        if (erro.status !== 409) throw erro;
        const anterior = feitos.length ? 'Registrados: '+feitos.join(', ')+'. ' : '';
        return anterior+'Item '+item.item+' não registrado. Confira a situação dele no painel.';
      }
      feitos.push(item.item);
    }
    return (devolver ? 'Devolutiva registrada para o item ' : 'Liberação registrada para os itens ')+feitos.join(', ')+' · sessão de '+describeDate(date)+'.';
  }
  if (sessao) {
    const s = (data.sessoes || []).find(x => x.date === pauta.date);
    return s ? '*SESSÃO DE '+describeDate(s.date)+'*\n'+s.liberadas+'/'+s.processos+' liberados · '+s.minutadas+' minutados · '+s.corrigidas+' corrigidos.'
      : 'Não encontrei uma pauta publicada para a consulta.';
  }
  if (processo) {
    const item = (pauta.itens || []).find(x => digits(x.cnj) === digits(processo[1]));
    if (!item) return 'Não encontrei o processo na pauta consultada. Informe a data da sessão para consultar outra pauta.';
    const etapa = { liberado: 'Liberado', corrigido: 'Corrigido · aguarda liberação', minutado: 'Minutado · aguarda correção', pendente: 'Aguarda minuta' };
    return '*'+item.cnj+'*\nSessão de '+describeDate(pauta.date)+(item.item?' · item '+item.item:'')+'\n'+etapa[item.etapa]+'.';
  }
  if (producao || producaoHoje) {
    const nome = L.norm((producao || producaoHoje)[1]);
    const pessoas = (data.produtividade?.linhas || []).filter(p => L.norm(p.nome) === nome || L.norm(p.nome).startsWith(nome+' '));
    if (pessoas.length !== 1) return 'Informe o nome cadastrado de um servidor para consultar a produção de hoje.';
    const p = pessoas[0];
    return '*'+p.nome+' · '+describeDate(hoje)+'*\n'+p.votos+' votos · '+p.eds+' ED/agravos internos · '+p.monos+' monocráticas · '+p.correcoes+' correções.';
  }
  if (duvidas) {
    const perguntas = data.duvidas || [];
    return perguntas.length ? '*DÚVIDAS EM ABERTO*\n'+perguntas.slice(0, 15).map(p => '• '+p.id+' · '+p.titulo).join('\n') : 'Nenhuma dúvida em aberto.';
  }
  return (data.urgencias || []).length+' urgência(s) em aberto. Consulte os detalhes no painel do gabinete.';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não aceito.' });
  const { ZERNIO_API_KEY: token, ZERNIO_WEBHOOK_SECRET: secret, CMT_WA_ACCOUNT: conta,
    CMT_WA_CONVERSATION: conversa, CMT_WA_PHONE: telefone, CMT_WA_RELATOR: user } = process.env;
  if (![token, secret, conta, conversa, telefone, user].every(Boolean)) return res.status(503).json({ erro: 'Canal não configurado.' });
  try {
    const raw = await rawBody(req);
    if (!signed(raw, req.headers['x-zernio-signature'], secret)) return res.status(401).json({ erro: 'Assinatura inválida.' });
    const e = JSON.parse(raw.toString('utf8'));
    const message = e.message || {};
    if (e.event !== 'message.received' || e.account?.platform !== 'whatsapp' ||
        e.account?.accountId !== conta || (e.conversation?.id || e.conversationId) !== conversa ||
        digits(message.sender?.phoneNumber) !== digits(telefone) || e.metadata?.standby === true) {
      return res.status(200).json({ ignorado: true });
    }
    const id = message.platformMessageId || message.id;
    const sentAt = Date.parse(message.createdAt || e.timestamp);
    const text = String(message.text || '').trim();
    if (!id || !text || text.length > 2400 || !Number.isFinite(sentAt)) return res.status(200).json({ ignorado: true });
    if ((await L.acessos(user)).perfil !== 'desembargador') return res.status(403).json({ erro: 'Relator não autorizado.' });
    const event = digest(conta+':'+id);
    let response;
    try { response = await answer(text, user, event, sentAt); }
    catch (erro) {
      if (![400, 403, 404, 409].includes(erro.status)) throw erro;
      response = 'O registro não foi concluído. Confira o item ou a dúvida no Ex Officio.';
    }
    const url = 'https://zernio.com/api/v1/inbox/conversations/'+encodeURIComponent(conversa)+'/messages';
    const sent = await fetch(url, {
      method: 'POST', headers: { Authorization: 'Bearer '+token, 'Content-Type': 'application/json', 'Idempotency-Key': event },
      body: JSON.stringify({ accountId: conta, message: response.slice(0, 3800) }), signal: AbortSignal.timeout(7000),
    });
    if (!sent.ok) return res.status(502).json({ erro: 'Falha no retorno ao WhatsApp.' });
    return res.status(200).json({ ok: true });
  } catch (erro) {
    return res.status(erro.status === 413 ? 413 : erro instanceof SyntaxError ? 400 : 500).json({ erro: 'Falha ao processar a mensagem.' });
  }
};
module.exports.answer = answer;
