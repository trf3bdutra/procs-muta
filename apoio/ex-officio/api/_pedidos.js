/* Pedidos de sustentação oral e de preferência que chegam por e-mail (AgentMail, inbox de recebimento).
   Servido por /api/sessoes?pedidos=1 (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam).
   POST /api/sessoes?pedidos=1&k=<CMT_AGENTMAIL_TOKEN>   webhook do AgentMail (evento message.received), sem sessão de usuário:
        lê o e-mail do TRF3 ("Pedido de Sustentação Oral por Videoconferência", "Presencial", "Preferência"), fica só com os do
        Gabinete A (relator Des. Fed. Carlos Muta, ou processo que já está numa pauta nossa), registra em apoio/sustentacoes.json,
        marca o processo na pauta da sessão (ctl.sopref: Virtual, Presencial ou Preferência, o mesmo campo do cartão) e avisa a
        assessoria, minutante e corretor via notificações. O que não achar a sessão ou o processo fica "a vincular".
   GET  /api/sessoes?pedidos=1                        lista os pedidos (equipe logada)
   POST /api/sessoes?pedidos=1 {id, data, cnj}        vincula à mão um pedido "a vincular" (só o gestor)
   Não guarda e-mail, telefone nem CPF: só tipo, advogado e OAB, parte, processo, sessão e quando chegou. */
const crypto = require('crypto');
const L = require('./_lib');
const ARQ = 'apoio/sustentacoes.json';
const EQUIPE = 'apoio/equipe.json';
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
    return acharNoDocumento(dados, cnj);
  } catch (e) { if (e.status !== 404) throw e; }
  return null;
}
async function marcar(data, achado, p) {
  const { gravarItem } = require('./pauta');
  return gravarItem(data, { cnj: p.cnj, lista: achado.lista, campos: { sopref: p.tipo } }, 'AgentMail', false);
}
function acharNoDocumento(dados, cnj) {
  if (!dados || !cnjFmt(cnj)) return null;
  // Uma sessão pode conservar pré-pauta durante a publicação. A busca deve
  // consultar ambas, dando prioridade ao item numerado da pauta publicada.
  for (const lista of ['itens', 'previa']) {
    const encontrados = (Array.isArray(dados[lista]) ? dados[lista] : [])
      .filter(it => dg(it.cnj) === dg(cnj));
    if (encontrados.length > 1) return null; // vínculo ambíguo: exige conferência
    if (encontrados.length === 1) {
      const item = encontrados[0];
      return { lista, item: item.item || '', servidor: item.servidor, corretor: item.corretor };
    }
  }
  return null;
}

async function lerRegistros() {
  try { return (await L.lerJson(ARQ)).dados.registros || []; }
  catch (e) { if (e.status === 404) return []; throw e; }
}

function tipoExibido(tipo) {
  if (tipo === 'Preferência') return tipo;
  return tipo === 'Presencial' ? 'Sustentação oral presencial' : 'Sustentação oral por videoconferência';
}

async function paraUsuario(usuario, registros, obterSessao, gestor = L.gestor(usuario)) {
  if (!registros.length) return [];
  const [equipeDoc, acesso] = await Promise.all([L.lerJson(EQUIPE), L.acessos(usuario)]);
  const equipe = equipeDoc.dados.registros || [];
  const eu = L.norm(usuario);
  const cadastro = equipe.find(pessoa => [pessoa.nome, ...(pessoa.aliases || [])].some(n => L.norm(n) === eu));
  const nomes = new Set([eu, cadastro?.nome, ...(cadastro?.aliases || [])].map(L.norm).filter(Boolean));
  const assessoria = gestor || acesso?.desembargador || cadastro?.papel === 'assessoria';
  const sessoes = new Map();
  const pedidos = await Promise.all(registros.map(async pedido => {
    const data = pedido.vinculo?.sessao;
    if (pedido.estado !== 'vinculado' || !L.dataOk(data)) {
      return assessoria ? { ...pedido, vinculo: null,
        motivo: !L.dataOk(pedido.data) ? 'Data da sessão ausente ou inválida.'
          : !cnjFmt(pedido.cnj) ? 'Número CNJ ausente ou inválido.'
          : 'Pedido pendente: processo não vinculado à pauta da sessão indicada.' } : null;
    }
    if (!sessoes.has(data)) sessoes.set(data, obterSessao(data));
    const dados = await sessoes.get(data);
    const item = dados && acharNoDocumento(dados, pedido.cnj);
    if (!item) return assessoria ? { ...pedido, estado: 'a vincular', vinculo: null,
      motivo: 'Processo não encontrado na pauta da sessão registrada; conferir o CNJ e a sessão.' } : null;
    if (!assessoria && ![item.servidor, item.corretor].some(n => nomes.has(L.norm(n)))) return null;
    return { ...pedido, vinculo: { sessao: data, item: item.item, lista: item.lista } };
  }));
  return pedidos.filter(Boolean).map(({ id, tipo, cnj, data, advogado, oab, parte, recebidoEm, vinculadoEm, estado, vinculo, motivo }) =>
    ({ id, tipo, titulo: tipoExibido(tipo), cnj, data, advogado, oab, parte, recebidoEm, vinculadoEm, estado, vinculo, motivo: motivo || '' }));
}

async function obterSessao(data) {
  try { return (await L.lerJson('acervo/sessoes/' + data + '.json')).dados; }
  catch (e) { if (e.status === 404) return null; throw e; }
}

const dataLocal = time => {
  const data = new Date(time);
  if (isNaN(data)) return '';
  const partes = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Cuiaba', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(data).map(p => [p.type, p.value]));
  return partes.year + '-' + partes.month + '-' + partes.day;
};

async function registrar(p) {
  for (let t = 0; t < 4; t++) {
    let dados, sha; try { ({ dados, sha } = await L.lerJson(ARQ)); } catch (e) { if (e.status !== 404) throw e; dados = vazio(); }
    dados.registros = dados.registros || [];
    const i = dados.registros.findIndex(r => r.id === p.id);
    if (i >= 0) {
      const anterior = dados.registros[i];
      if (!p.vinculadoPor && anterior.estado === 'vinculado') return anterior;
      dados.registros[i] = { ...anterior, ...p, recebidoEm: anterior.recebidoEm || p.recebidoEm };
    } else dados.registros.unshift(p);
    dados.atualizadoEm = new Date().toISOString();
    try { await L.gravarJson(ARQ, dados, sha, 'AgentMail: pedido de ' + (p.tipo === 'Preferência' ? 'preferência' : 'sustentação oral ' + (p.tipo || '').toLowerCase()) + ' · ' + (p.cnj || 'sem número') + ' · ' + p.estado); return i >= 0 ? dados.registros[i] : p; }
    catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
  }
  throw new Error('apoio/sustentacoes.json mudou várias vezes seguidas');
}
async function tratar(p) {
  const achado = p.cnj && p.data ? await acharNaPauta(p.data, p.cnj) : null;
  if (achado) { const r = await marcar(p.data, achado, p); if (r.status !== 200) throw new Error('pauta: ' + JSON.stringify(r.body)); p.vinculo = { sessao: p.data, lista: achado.lista, item: achado.item }; p.estado = 'vinculado'; p.vinculadoEm = new Date().toISOString(); }
  else p.estado = 'a vincular';
  return registrar(p);
}


/* A pauta pode ser publicada depois do e-mail. A gestão pode reaplicar os
   pedidos sem vínculo usando a sessão e o CNJ gravados no recebimento. */
async function reconciliarPedidos() {
  const [registros, calendario] = await Promise.all([
    lerRegistros(), L.lerJson('acervo/sessoes/calendario.json'),
  ]);
  const publicadas = new Set((calendario.dados.sessoes || []).filter(s => s.publicada).map(s => s.date));
  const documentos = new Map();
  const pendentes = registros.filter(p => p.estado !== 'vinculado');
  const resultados = [];
  for (const p of pendentes) {
    let motivo = '';
    if (!L.dataOk(p.data) || !cnjFmt(p.cnj)) motivo = 'Data ou CNJ ausente no pedido.';
    else if (!publicadas.has(p.data)) motivo = 'A pauta da sessão ainda não foi publicada.';
    else {
      if (!documentos.has(p.data)) documentos.set(p.data, obterSessao(p.data));
      const doc = await documentos.get(p.data);
      const achado = doc && acharNoDocumento(doc, p.cnj);
      if (!doc) motivo = 'Arquivo da pauta indisponível.';
      else if (!achado) motivo = 'O CNJ não consta na pauta publicada de ' + br(p.data) + '.';
      else {
        const r = await marcar(p.data, achado, p);
        if (r.status === 200) {
          const item = r.body?.item?.item || achado.item;
          const salvo = await registrar({ ...p, vinculo: { sessao: p.data, lista: achado.lista, item },
            estado: 'vinculado', vinculadoEm: new Date().toISOString() });
          resultados.push({ id: p.id, estado: salvo.estado, item: salvo.vinculo?.item || '' });
          continue;
        }
        motivo = 'A pauta mudou durante a tentativa. Confira o item e tente novamente.';
      }
    }
    resultados.push({ id: p.id, estado: 'a vincular', motivo });
  }
  return resultados;
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
      const anterior = (await lerRegistros()).find(r => r.id === p.id);
      const r = anterior?.estado === 'vinculado' ? anterior : await tratar(p);
      return res.status(200).json({ ok: true, estado: r.estado, cnj: r.cnj, sessao: r.data });
    }
    /* equipe */
    const u = L.exigir(req, res); if (!u) return;
    if (req.method === 'GET') {
      const { data, cnj, fechamento } = req.query;
      if (data && !L.dataOk(data)) return res.status(400).json({ erro: 'Data inválida.' });
      if (cnj && !cnjFmt(cnj)) return res.status(400).json({ erro: 'Número do processo inválido.' });
      if (fechamento && !L.gestor(u)) return res.status(403).json({ erro: 'Fechamento disponível para a gestão.' });
      let registros = await lerRegistros();
      const hoje = data || dataLocal(Date.now());
      if (fechamento) {
        registros = registros.filter(r => dataLocal(r.recebidoEm) === hoje || dataLocal(r.vinculadoEm) === hoje);
      } else {
        if (data) registros = registros.filter(r => (r.vinculo?.sessao || r.data) === data);
        if (cnj) registros = registros.filter(r => dg(r.cnj) === dg(cnj) && r.estado === 'vinculado');
      }
      const pedidos = await paraUsuario(u, registros, obterSessao);
      return res.status(200).json({ registros: pedidos, ...(fechamento && { data: hoje }) });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    if (!L.gestor(u)) return res.status(403).json({ erro: 'Só o gestor vincula pedidos à mão.' });
    const b = req.body || {};
    if (b.reconciliar === true) {
      const resultados = await reconciliarPedidos();
      return res.status(200).json({ resultados });
    }
    const p = (await lerRegistros()).find(r => r.id === b.id);
    if (!p) return res.status(404).json({ erro: 'pedido não encontrado' });
    if (p.estado === 'vinculado' && await acharNaPauta(p.vinculo?.sessao, p.cnj)) {
      return res.status(409).json({ erro: 'O pedido já está vinculado.' });
    }
    if (b.data) p.data = b.data;
    if (b.cnj) p.cnj = cnjFmt(b.cnj);
    if (!L.dataOk(p.data) || !cnjFmt(p.cnj)) return res.status(400).json({ erro: 'Informe a data da sessão e o número do processo.' });
    const achado = await acharNaPauta(p.data, p.cnj);
    if (!achado) return res.status(404).json({ erro: 'processo não está na pauta de ' + br(p.data) });
    const r = await marcar(p.data, achado, p); if (r.status !== 200) return res.status(r.status).json(r.body);
    p.vinculo = { sessao: p.data, lista: achado.lista, item: achado.item }; p.estado = 'vinculado'; p.vinculadoPor = u;
    p.vinculadoEm = new Date().toISOString();
    res.status(200).json({ ok: true, pedido: await registrar(p) });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
module.exports.ler = ler;
module.exports.lerRegistros = lerRegistros;
module.exports.paraUsuario = paraUsuario;
module.exports.obterSessao = obterSessao;

// Exposto para testes unitários de vinculação, sem acesso a dados externos.
module.exports.acharNoDocumento = acharNoDocumento;
