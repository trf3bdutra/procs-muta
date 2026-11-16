/* Painel do desembargador (Ex Officio, #cmt). Só o perfil desembargador (apoio/acessos.json) ou o gestor.
   Servido por /api/painel?cmt=1: o plano Hobby da Vercel aceita no máximo 12 funções e arquivos com _ não contam.
   Quatro quadros, montados do que já existe no procs-muta:
     assinar   monocráticas liberadas à espera de assinatura e corrigidas à espera de liberação
     urgencias pedidos urgentes ainda não apreciados e marcos de sessão vencendo
     sessoes   próximas sessões publicadas, com minutadas, corrigidas e liberadas
     equipe    produção por servidor nas pautas publicadas e ausências a decidir */
const L = require('./_lib');
const MONO = require('./_mono');
const FICHA = require('./_ficha');
const opc = rel => L.lerJson(rel).then(x => x.dados).catch(() => null);
const br = d => String(d || '').split('-').reverse().join('/');
const dias = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400e3);

module.exports = async (req, res, u) => {
  res.setHeader('Cache-Control', 'no-store');
  const a = await L.acessos(u);
  if (a.perfil !== 'desembargador' && !L.gestor(u)) return res.status(403).json({ erro: 'Painel restrito ao desembargador.' });
  const hj = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
  /* decisões do desembargador: liberar o voto, assinar a monocrática e devolver com apontamento.
     Tudo grava onde já era gravado — o item da pauta e a ficha única —, e tudo pode ser desfeito. */
  if (req.method === 'POST') {
    const b = req.body || {}, cnj = String(b.cnj || '').trim();
    if (!cnj) return res.status(400).json({ erro: 'Informe o processo.' });
    try {
      if (b.acao === 'liberar') {
        if (!L.dataOk(b.sessao)) return res.status(400).json({ erro: 'Informe a sessão.' });
        await require('./pauta').gravarItem(b.sessao, { cnj, campos: { dataLiberacao: b.desfazer ? '' : hj } }, u, true);
        return res.status(200).json({ ok: true, cnj, dataLiberacao: b.desfazer ? '' : hj });
      }
      if (b.acao === 'assinar') {
        await MONO.gravarMono(cnj, { dataAssinatura: b.desfazer ? '' : hj }, u, true);
        return res.status(200).json({ ok: true, cnj, dataAssinatura: b.desfazer ? '' : hj });
      }
      if (b.acao === 'devolver') {
        const txt = String(b.texto || '').trim().slice(0, 1000);
        if (!txt) return res.status(400).json({ erro: 'Escreva o apontamento da devolutiva.' });
        if (!L.dataOk(b.sessao)) return res.status(400).json({ erro: 'Informe a sessão.' });
        await require('./pauta').gravarItem(b.sessao, { cnj, campos: { intercor: txt, intercorOk: false } }, u, true);
        return res.status(200).json({ ok: true, cnj, intercor: txt });
      }
      return res.status(400).json({ erro: 'Ação desconhecida.' });
    } catch (e) { return res.status(e.status || 500).json({ erro: e.message }); }
  }
  const [cal, doc, aus] = await Promise.all([
    opc('acervo/sessoes/calendario.json'),
    FICHA.lerOpLeitura().then(x => x.doc).catch(() => null),
    opc('apoio/equipe-solicitacoes.json')
  ]);

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
  const NOMES = { pautarAte: 'Pautar até', inicioPreparacao: 'Início da preparação', entregaMinutas: 'Entrega das minutas', liberacao: 'Liberação' };
  todas.forEach(s => Object.keys(NOMES).forEach(k => {
    const d = (s.marcos || {})[k]; if (!L.dataOk(d)) return;
    const n = dias(d, hj); if (n > 7) return;
    prazos.push({ sessao: s.date, marco: NOMES[k], data: d, dias: n });
  }));
  prazos.sort((x, y) => x.dias - y.dias);

  const ausencias = ((aus || {}).registros || []).filter(r => r.estado === 'pendente')
    .map(r => ({ id: r.id, nome: r.nome, de: r.de, ate: r.ate, tipo: r.tipo, motivo: r.motivo || '', criadoEm: r.criadoEm || '' }))
    .sort((x, y) => String(x.de).localeCompare(String(y.de)));

  res.status(200).json({ usuario: u, hoje: hj, assinar, urgencias, sessoes, agenda, pauta, prazos,
    equipe: Object.keys(porServidor).map(n => porServidor[n]).sort((x, y) => (y.minutas + y.correcoes) - (x.minutas + x.correcoes)),
    ausencias, fontes: { ficha: !!doc, calendario: !!cal, pautas: docs.filter(Boolean).length, ausencias: !!aus } });
};
module.exports.br = br;
