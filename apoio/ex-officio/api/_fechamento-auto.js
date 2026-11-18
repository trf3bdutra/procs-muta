/* Fechamento automático. GET e POST do painel continuam no fluxo existente. */
const crypto = require('node:crypto');
const L = require('./_lib');
const segredoValido = (req, valor) => {
  const recebido = Buffer.from(String(req.headers.authorization || ''));
  const esperado = Buffer.from('Bearer ' + valor);
  return recebido.length === esperado.length && crypto.timingSafeEqual(recebido, esperado);
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não aceito.' });
  const env = process.env;
  if (!env.CMT_FECHAMENTO_SECRET) return res.status(503).json({ erro: 'Gatilho não configurado.' });
  if (!segredoValido(req, env.CMT_FECHAMENTO_SECRET)) return res.status(401).json({ erro: 'Credencial inválida.' });
  const chaves = ['CMT_WA_RELATOR','CMT_WA_ACCOUNT','CMT_WA_PHONE','ZERNIO_API_KEY','CMT_WA_TEMPLATE_FECHAMENTO','CMT_TEAMS_WEBHOOK_URL'];
  if (!chaves.every(k => env[k])) return res.status(503).json({ erro: 'Destinos do fechamento não configurados.' });
  try {
    const d = new Date(Date.now() - 4 * 3600e3), hoje = d.toISOString().slice(0, 10);
    const hora = d.toISOString().slice(11, 16);
    if (hora < '17:00') return res.status(409).json({ erro: 'O fechamento começa às 17h locais.' });
    const { dados: cal } = await L.lerJson('acervo/sessoes/calendario.json');
    const exp = cal.expediente || {};
    if (!(exp.diasSemana || [1,2,3,4,5]).includes(d.getUTCDay()) ||
        (exp.semExpediente || []).includes(hoje) ||
        (exp.recesso?.length === 2 && exp.recesso[0] <= hoje && hoje <= exp.recesso[1])) {
      return res.status(200).json({ ignorado: 'sem expediente' });
    }
    let status, painel;
    await require('./_cmt')({ method: 'GET', query: { pde: hoje, pate: hoje } }, {
      setHeader() {}, status(code) { status = code; return this; }, json(doc) { painel = doc; },
    }, env.CMT_WA_RELATOR);
    if (status !== 200 || !painel.fontes?.ficha || !painel.fontes?.calendario || !painel.fontes?.duvidas) {
      return res.status(503).json({ erro: 'Fontes do gabinete indisponíveis.' });
    }
    const pedidos = await require('./_pedidos').lerRegistros();
    const dataLocal = data => {
      const timestamp = Date.parse(data);
      return Number.isFinite(timestamp) ? new Date(timestamp - 4 * 3600e3).toISOString().slice(0, 10) : '';
    };
    const totalPedidos = pedidos.filter(p => [p.recebidoEm,p.vinculadoEm].some(t => dataLocal(t) === hoje)).length;
    const pauta = (painel.sessoes || []).find(s => s.date >= hoje);
    const producao = painel.producao?.[hoje] || {};
    const br = iso => iso.split('-').reverse().join('/');
    const totais = (producao.voto || 0)+' votos minutados · '+(producao.mono || 0)+' monocráticas minutadas · '+totalPedidos+' pedidos de sessão';
    const sessao = pauta ? 'Sessão de '+br(pauta.date)+': '+pauta.liberadas+'/'+pauta.processos+' liberados' : 'Sem sessão futura publicada';
    const privado = [br(hoje)+' às '+hora,
      painel.assinar.assinatura.length+' a assinar · '+painel.assinar.liberacao.length+' monocráticas para liberar',
      painel.urgencias.length+' urgências · '+painel.duvidas.length+' dúvidas', sessao, totais].join(' | ');
    const wa = await fetch('https://zernio.com/api/v1/inbox/conversations', {
      method: 'POST',
      headers: { Authorization: 'Bearer '+env.ZERNIO_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'cmt-fechamento-'+hoje },
      body: JSON.stringify({ accountId: env.CMT_WA_ACCOUNT, participantId: env.CMT_WA_PHONE.replace(/\D/g, ''),
        templateName: env.CMT_WA_TEMPLATE_FECHAMENTO, templateLanguage: 'pt_BR', templateParams: [privado] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!wa.ok) return res.status(502).json({ erro: 'WhatsApp rejeitou o fechamento.', statusCanal: wa.status });
    const marcos = (painel.prazos || []).filter(p => p.data >= hoje && p.sessao >= hoje)
      .map(p => br(p.data)+' · '+p.marco+' · sessão de '+br(p.sessao)).slice(0,8);
    const texto = ['Fechamento da equipe · '+br(hoje), 'Posição às '+hora, sessao, totais, ...marcos];
    const teams = await fetch(env.CMT_TEAMS_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive',
        content: { type: 'AdaptiveCard', version: '1.2', body: texto.map((text, i) =>
          ({ type: 'TextBlock', text, wrap: true, weight: i ? 'Default' : 'Bolder' })) } }] }),
    });
    if (!teams.ok) return res.status(502).json({ erro: 'Teams rejeitou o fechamento.', statusCanal: teams.status });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ erro: 'Não foi possível concluir o fechamento automático.' });
  }
};
