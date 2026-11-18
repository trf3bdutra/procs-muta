/* Painel do desembargador (Ex Officio, #cmt). Só o perfil desembargador (apoio/acessos.json) ou o gestor.
   Servido por /api/painel?cmt=1: o plano Hobby da Vercel aceita no máximo 12 funções e arquivos com _ não contam.
   Quatro quadros, montados do que já existe no procs-muta:
     assinar   monocráticas liberadas à espera de assinatura e corrigidas à espera de liberação
     urgencias pedidos urgentes ainda não apreciados e marcos de sessão vencendo
     sessoes   próximas sessões publicadas, com minutadas, corrigidas e liberadas
     equipe    produção por servidor nas pautas publicadas e ausências a decidir */
const crypto = require('crypto');
const L = require('./_lib');
const MONO = require('./_mono');
const FICHA = require('./_ficha');
const PROD = require('./_produtividade');
const opc = rel => L.lerJson(rel).then(x => x.dados).catch(() => null);
const br = d => String(d || '').split('-').reverse().join('/');
const dias = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400e3);

const PEN = 'apoio/equipe-pendencias.json';
async function lerPen() { try { return await L.lerJson(PEN); } catch (e) { if (e.status === 404) return { dados: { schema: 'gabcmt.equipe.pendencias', versao: 1, registros: [] }, sha: undefined }; throw e; } }
async function criarDiligencia(campos, u) {
  for (let n = 0; n < 4; n++) {
    const { dados, sha } = await lerPen(); dados.registros = dados.registros || [];
    const anterior = campos.whatsappEvento && dados.registros.find(t => t.whatsappEvento === campos.whatsappEvento);
    if (anterior) return anterior;
    const agora = new Date().toISOString();
    const t = Object.assign({ id: 'pen-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      creator: u, criadoEm: agora, _rev: 1, stage: 'todo', atualizadoEm: agora, atualizadoPor: u, origem: '' }, campos);
    dados.registros.push(t);
    try { await L.gravarJson(PEN, dados, sha, 'Devolutiva do desembargador (' + u + '): ' + t.title); return t; }
    catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
  }
  throw Object.assign(new Error('O quadro mudou várias vezes seguidas; tente de novo.'), { status: 409 });
}
/* pedidos de retirada e de adiamento: nascem no quadro da equipe e são apreciados pelo relator */
const PEDIDO = /^Pedido de (retirada|adiamento)\b/i;
async function responder(id, texto, u, manter, evento) {
  for (let n = 0; n < 4; n++) {
    const { dados, sha } = await lerPen(); dados.registros = dados.registros || [];
    const t = (dados.registros || []).find(x => x.id === id && !x.excluida);
    if (!t) throw Object.assign(new Error('Dúvida não encontrada.'), { status: 404 });
    if (L.norm(t.assignee) !== L.norm(u) && !PEDIDO.test(String(t.title || ''))) throw Object.assign(new Error('Esta dúvida não foi dirigida a você.'), { status: 403 });
    const agora = new Date().toISOString();
    if (evento && t.whatsappRespostaEvento === evento) return t;
    if (evento && t.stage === 'done') throw Object.assign(new Error('Dúvida já concluída.'), { status: 409 });
    if (evento) t.whatsappRespostaEvento = evento;
    t.resposta = texto; t.respondidoPor = u; t.respondidoEm = agora;
    if (!manter) t.stage = 'done';
    t._rev = Number(t._rev || 1) + 1; t.atualizadoEm = agora; t.atualizadoPor = u;
    try { await L.gravarJson(PEN, dados, sha, 'Resposta do desembargador (' + u + '): ' + (t.title || id)); return t; }
    catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
  }
  throw Object.assign(new Error('O quadro mudou várias vezes seguidas; tente de novo.'), { status: 409 });
}
/* o link próprio do painel (/cmt?k=…) vale como credencial: a chave fica em CMT_CHAVE, só no servidor */
function porChave(req) {
  const esperada = String(process.env.CMT_CHAVE || '');
  if (esperada.length < 16) return false;
  const vinda = String((req.headers && req.headers['x-cmt-chave']) || (req.query && req.query.k) || '');
  if (vinda.length !== esperada.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(vinda), Buffer.from(esperada)); } catch (e) { return false; }
}
/* toda a resposta passa por aqui: erro de leitura vira 500 com mensagem, nunca queda da função */
module.exports = async (req, res, u) => {
  try { await painel(req, res, u); }
  catch (e) { if (!res.headersSent) res.status(e.status || 500).json({ erro: e.message }); }
};
async function painel(req, res, u) {
  res.setHeader('Cache-Control', 'no-store');
  const a = await L.acessos(u);
  if (a.perfil !== 'desembargador' && !L.gestor(u) && !porChave(req)) return res.status(403).json({ erro: 'Painel restrito ao desembargador.' });
  const hj = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
  /* decisões do desembargador: liberar o voto e assinar a monocrática.
     As duas gravam onde já era gravado — o item da pauta e a ficha única — e podem ser desfeitas. */
  if (req.method === 'POST') {
    const b = req.body || {}, cnj = String(b.cnj || '').trim();
    if (!cnj && b.acao !== 'responder') return res.status(400).json({ erro: 'Informe o processo.' });
    try {
      if (b.acao === 'liberar') {
        if (!L.dataOk(b.sessao)) return res.status(400).json({ erro: 'Informe a sessão.' });
        const g = await require('./pauta').gravarItem(b.sessao, { cnj, campos: { dataLiberacao: b.desfazer ? '' : hj } }, u, true, req.whatsappEvent);
        if (g.status >= 400) return res.status(g.status).json(g.body);
        return res.status(200).json({ ok: true, cnj, dataLiberacao: b.desfazer ? '' : hj });
      }
      /* retirada ou adiamento do item, deferidos pelo relator: grava o desfecho na pauta */
      if (b.acao === 'situacao') {
        if (!L.dataOk(b.sessao)) return res.status(400).json({ erro: 'Informe a sessão.' });
        const v = String(b.valor || '').trim();
        if (v && !/^(Retirado|Adiado)$/i.test(v)) return res.status(400).json({ erro: 'Situação inválida.' });
        const g = await require('./pauta').gravarItem(b.sessao, { cnj, campos: { resultado: v } }, u, true);
        if (g.status >= 400) return res.status(g.status).json(g.body);
        return res.status(200).json({ ok: true, cnj, resultado: v });
      }
      if (b.acao === 'assinar') {
        await MONO.gravarMono(cnj, { dataAssinatura: b.desfazer ? '' : hj }, u, true);
        return res.status(200).json({ ok: true, cnj, dataAssinatura: b.desfazer ? '' : hj });
      }
      /* devolutiva: vira diligência para o servidor do processo, no mesmo quadro da equipe */
      if (b.acao === 'devolver') {
        const txt = String(b.texto || '').trim().slice(0, 2000);
        if (!txt) return res.status(400).json({ erro: 'Escreva o apontamento da devolutiva.' });
        const r = await criarDiligencia({ title: 'Devolutiva · ' + cnj, description: txt, assignee: String(b.para || ''),
          numero: cnj, sessao: L.dataOk(b.sessao) ? b.sessao : '', urgency: 'Alta',
          ...(req.whatsappEvent && { whatsappEvento: req.whatsappEvent }) }, u);
        return res.status(200).json({ ok: true, task: r });
      }
      /* resposta do desembargador a uma dúvida que lhe foi dirigida: fica no registro e conclui a diligência */
      if (b.acao === 'responder') {
        const txt = String(b.texto || '').trim().slice(0, 2000);
        if (!txt) return res.status(400).json({ erro: 'Escreva a resposta.' });
        const r = await responder(String(b.id || ''), txt, u, !!b.manter, req.whatsappEvent);
        return res.status(200).json({ ok: true, task: r });
      }
      return res.status(400).json({ erro: 'Ação desconhecida.' });
    } catch (e) { return res.status(e.status || 500).json({ erro: e.message }); }
  }
  const [cal, doc, aus, pen, com] = await Promise.all([
    opc('acervo/sessoes/calendario.json'),
    FICHA.lerOpLeitura().then(x => x.doc).catch(() => null),
    opc('apoio/equipe-solicitacoes.json'),
    opc('apoio/equipe-pendencias.json'),
    opc('apoio/equipe-comunicados.json')
  ]);
  const [regProd, equipeDoc] = await Promise.all([opc('apoio/regras/produtividade.json'), opc('apoio/equipe.json')]);
  /* comunicados da equipe ao desembargador: os não lidos primeiro, do mais recente para o mais antigo */
  const comunicados = ((com || {}).registros || [])
    .filter(r => !r.excluido)
    .map(r => ({ id: r.id, titulo: r.titulo || '', texto: r.texto || '', de: r.de || '', cnjs: r.cnjs || [], em: r.criadoEm || '', lidoEm: r.lidoEm || '' }))
    .sort((x, y) => (!!x.lidoEm - !!y.lidoEm) || String(y.em).localeCompare(String(x.em)))
    .slice(0, 40);
  /* dúvidas dirigidas ao desembargador: diligências em aberto atribuídas a ele, no quadro da equipe */
  const duvidas = ((pen || {}).registros || [])
    .filter(r => !r.excluida && r.stage !== 'done' && L.norm(r.assignee) === L.norm(u) && !PEDIDO.test(String(r.title || '')))
    .map(r => ({ id: r.id, titulo: r.title || '', texto: r.description || '', numero: r.numero || '',
      de: r.creator || '', prazo: r.dueDate || '', prioridade: r.urgency || '', etapa: r.stage || '',
      em: r.atualizadoEm || r.criadoEm || '', origem: r.origem || '', resposta: r.resposta || '' }))
    .sort((x, y) => String(y.em).localeCompare(String(x.em)));

  /* pedidos de retirada e de adiamento de item da pauta, qualquer que seja o destinatário anotado */
  const pedidos = ((pen || {}).registros || [])
    .filter(r => !r.excluida && r.stage !== 'done' && PEDIDO.test(String(r.title || '')))
    .map(r => ({ id: r.id, tipo: /retirada/i.test(r.title) ? 'retirada' : 'adiamento', titulo: r.title || '',
      texto: r.description || '', numero: r.numero || '', de: r.creator || '', sessao: r.sessao || '',
      prioridade: r.urgency || '', em: r.atualizadoEm || r.criadoEm || '', resposta: r.resposta || '' }))
    .sort((x, y) => String(y.em).localeCompare(String(x.em)));

  /* monocráticas e urgências */
  const assinar = { assinatura: [], liberacao: [] }, urgencias = [];
  const regs = ((doc || {}).registros || []).filter(r => (r.producao || {}).Destino === 'Monocrática' || !!(r.triagem || {})['Urgência']);
  regs.forEach(r => {
    const i = MONO.item(r), c = i.ctl || {};
    const base = { cnj: i.cnj, servidor: i.servidor || '', corretor: i.corretor || '', obs: i.obs || '' };
    if (i.mono && i.dataLiberacao && !i.assinado) assinar.assinatura.push(Object.assign({ desde: i.dataLiberacao }, base));
    else if (i.mono && i.dataCorrecao && !i.dataLiberacao) assinar.liberacao.push(Object.assign({ desde: i.dataCorrecao }, base));
    if (c.urgTipo && !/^Apreciada/.test(String(c.urgSit || ''))) urgencias.push(Object.assign({
      tipo: c.urgTipo || '', nivel: c.urgNivel || '', pedidoEm: c.urgEm || '', situacao: c.urgSit || '',
      espera: c.urgEm ? dias(hj, String(c.urgEm).slice(0, 10)) : null
    }, base));
  });
  /* produção lançada por dia: minutas de voto (itens das pautas publicadas) e monocráticas (ficha única) */
  const producao = {};
  const lanca = (d, k) => { const x = String(d || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return; (producao[x] = producao[x] || { voto: 0, mono: 0 })[k]++; };
  regs.forEach(r => { const i = MONO.item(r); if (i.mono) lanca(i.dataMinuta, 'mono'); });
  const ordem = (x, y) => String(x.desde || x.pedidoEm || '').localeCompare(String(y.desde || y.pedidoEm || ''));
  assinar.assinatura.sort(ordem); assinar.liberacao.sort(ordem);
  urgencias.sort((x, y) => (y.espera || 0) - (x.espera || 0));

  /* sessões e produção da equipe */
  const todas = ((cal || {}).sessoes || []).filter(s => s.publicada || s.marcosPublicados);
  const pubs = todas.filter(s => s.publicada);
  const docs = await Promise.all(pubs.map(s => opc('acervo/sessoes/' + s.date + '.json')));
  const sessoes = [], prazos = [], porServidor = {};
  const conta = (nome, campo) => { const n = String(nome || '').trim(); if (!n) return; (porServidor[n] = porServidor[n] || { nome: n, minutas: 0, minutasFeitas: 0, correcoes: 0, correcoesFeitas: 0 })[campo]++; };
  pubs.forEach((s, k) => {
    const d = docs[k]; if (!d) return;
    ((d.itens || []).length ? d.itens : (d.previa || [])).forEach(it => lanca(it.dataMinuta, 'voto'));
    const lista = (d.itens || []).length ? d.itens : (d.previa || []);
    sessoes.push({ date: s.date, hora: s.hora || '', processos: lista.length,
      minutadas: lista.filter(x => x.dataMinuta).length, corrigidas: lista.filter(x => x.dataCorrecao).length,
      liberadas: lista.filter(x => x.dataLiberacao).length, marcos: s.marcos || {} });
    lista.forEach(it => {
      if (it.servidor) { conta(it.servidor, 'minutas'); if (it.dataMinuta) conta(it.servidor, 'minutasFeitas'); }
      if (it.corretor) { conta(it.corretor, 'correcoes'); if (it.dataCorrecao) conta(it.corretor, 'correcoesFeitas'); }
    });
  });
  sessoes.sort((x, y) => String(x.date).localeCompare(String(y.date)));
  /* produtividade pelas regras do gabinete: todas as sessões com listagem (publicadas ou não) e as monocráticas da ficha única */
  const q = req.query || {}, de = L.dataOk(q.pde) ? q.pde : hj.slice(0, 8) + '01', ate = L.dataOk(q.pate) ? q.pate : hj;
  const naoPub = ((cal || {}).sessoes || []).filter(s => !s.publicada && (s.processos || s.previa));
  const docsNP = await Promise.all(naoPub.map(s => opc('acervo/sessoes/' + s.date + '.json')));
  const sessoesDocs = pubs.map((s, k) => docs[k]).concat(docsNP).filter(Boolean).map(d => ({ itens: (d.itens || []).length ? d.itens : (d.previa || []) }));
  let produtividade = null;
  try { produtividade = PROD.calcular({ prod: regProd, cal, sessoesDocs, monos: regs.map(r => MONO.item(r)).filter(i => i.mono), equipe: equipeDoc, solicitacoes: aus, de, ate }); }
  catch (e) { produtividade = { erro: e.message }; }
  /* calendário: todas as sessões visíveis, com os marcos, mesmo sem listagem publicada */
  const agenda = todas.map(s => ({ date: s.date, hora: s.hora || '', cor: s.cor || '', publicada: !!s.publicada,
    processos: (sessoes.find(x => x.date === s.date) || {}).processos || 0, marcos: s.marcos || {}, sessao: s.date }))
    .sort((x, y) => String(x.date).localeCompare(String(y.date)));
  /* pauta da sessão pedida (?s=AAAA-MM-DD); sem pedido, a próxima publicada ainda por julgar */
  const alvo = L.dataOk(req.query && req.query.s) ? req.query.s
    : (sessoes.filter(s => s.date >= hj)[0] || sessoes[sessoes.length - 1] || {}).date || '';
  const ki = pubs.findIndex(s => s.date === alvo), dAlvo = ki >= 0 ? docs[ki] : null;
  const lst = dAlvo ? ((dAlvo.itens || []).length ? dAlvo.itens : (dAlvo.previa || [])) : [];
  const etapa = it => it.dataLiberacao ? 'liberado' : it.dataCorrecao ? 'corrigido' : it.dataMinuta ? 'minutado' : 'pendente';
  const pauta = { date: alvo, previa: !!(dAlvo && !(dAlvo.itens || []).length), itens: lst.map(it => {
    const c = it.ctl || {};
    return { cnj: it.cnj, item: it.item || '', classe: it.classe || '', assunto: it.assunto || '', partes: it.partes || '',
      servidor: it.servidor || '', corretor: it.corretor || '', etapa: etapa(it),
      dataMinuta: it.dataMinuta || '', dataCorrecao: it.dataCorrecao || '', dataLiberacao: it.dataLiberacao || '',
      resultado: it.resultado || '', intercor: c.intercor || '', intercorOk: !!c.intercorOk, meta: c.meta || '', obs: it.obs || '' };
  }) };
  /* marcos vencendo: até 7 dias à frente, ou já vencidos, nas sessões visíveis à equipe */
  const NOMES = { pautarAte: 'Peço dia', inicioPreparacao: 'Início da preparação', entregaMinutas: 'Entrega das minutas', liberacao: 'Liberação' };
  todas.forEach(s => Object.keys(NOMES).forEach(k => {
    const d = (s.marcos || {})[k]; if (!L.dataOk(d)) return;
    const n = dias(d, hj); if (n > 7) return;
    prazos.push({ sessao: s.date, marco: NOMES[k], data: d, dias: n });
  }));
  prazos.sort((x, y) => x.dias - y.dias);

  const ausencias = ((aus || {}).registros || []).filter(r => r.estado === 'pendente')
    .map(r => ({ id: r.id, nome: r.nome, de: r.de, ate: r.ate, tipo: r.tipo, motivo: r.motivo || '', criadoEm: r.criadoEm || '' }))
    .sort((x, y) => String(x.de).localeCompare(String(y.de)));

  res.status(200).json({ usuario: u, hoje: hj, assinar, duvidas, pedidos, comunicados, urgencias, sessoes, agenda, pauta, prazos, producao, produtividade,
    equipe: Object.keys(porServidor).map(n => porServidor[n]).sort((x, y) => (y.minutas + y.correcoes) - (x.minutas + x.correcoes)),
    ausencias, fontes: { ficha: !!doc, calendario: !!cal, pautas: docs.filter(Boolean).length, ausencias: !!aus, duvidas: !!pen } });
}
module.exports.br = br;
