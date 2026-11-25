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
/* cada entrada do relator no painel vira um aviso para o gestor da equipe (apoio/equipe-avisos.json) */
const AVISOS = 'apoio/equipe-avisos.json';
async function avisarEquipe(titulo, texto, op) {
  op = op || {};
  for (let t = 0; t < 4; t++) {
    let dados, sha;
    try { const r = await L.lerJson(AVISOS); dados = r.dados; sha = r.sha; }
    catch (e) { if (e.status !== 404) throw e; dados = { schema: 'gabcmt.equipe.avisos', versao: 1, registros: [] }; }
    dados.registros = dados.registros || [];
    const agora = new Date(), ate = new Date(agora.getTime() - 4 * 3600e3 + 7 * 86400e3).toISOString().slice(0, 10);
    dados.registros.unshift({ id: 'av-cmt-' + (op.tipo ? op.tipo + '-' : '') + agora.getTime().toString(36), time: agora.toISOString(), user: 'CMT', title: titulo, message: texto,
      link: op.link != null ? op.link : '/modus/', linkTxt: op.linkTxt != null ? op.linkTxt : 'Abrir o Compendium', nivel: 'importante',
      painel: op.painel !== false, notificacao: true, para: op.para || [], ate, fixo: false });
    dados.atualizadoEm = agora.toISOString();
    try { await L.gravarJson(AVISOS, dados, sha, 'Painel do desembargador: aviso à equipe · ' + titulo.slice(0, 60)); return; }
    catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
  }
  throw Object.assign(new Error('O mural mudou várias vezes seguidas; tente de novo.'), { status: 409 });
}
/* cópia ao gestor do que o desembargador fez pela extensão HERO18810 (pedido do gestor, 21/11/2026) */
async function copiaGestor(u, titulo, texto) {
  if (L.gestor(u)) return;
  const G = String(process.env.CMT_GESTOR || 'Bruno').split(',').map(x => x.trim()).filter(Boolean);
  try { await avisarEquipe(titulo, texto, { tipo: 'cop', para: G, painel: false, link: '/cmt/', linkTxt: 'Abrir o painel do Desembargador' }); } catch (e) {}
}
async function avisarAcesso(u) {
  for (let t = 0; t < 3; t++) {
    let dados, sha;
    try { const r = await L.lerJson(AVISOS); dados = r.dados; sha = r.sha; }
    catch (e) { if (e.status !== 404) throw e; dados = { schema: 'gabcmt.equipe.avisos', versao: 1, registros: [] }; }
    dados.registros = dados.registros || [];
    const agora = new Date(), q = new Date(agora.getTime() - 4 * 3600e3);
    const dia = q.toISOString().slice(0, 10), hora = q.toISOString().slice(11, 16);
    const ate = new Date(q.getTime() + 7 * 86400e3).toISOString().slice(0, 10);
    const gestor = process.env.CMT_GESTOR || 'Bruno';
    /* guarda as quatro entradas anteriores, para o gestor ver a sequência sem o arquivo crescer */
    const acessos = dados.registros.filter(r => /^av-cmt-acesso-/.test(String(r.id || '')))
      .sort((x, y) => String(x.time).localeCompare(String(y.time))).slice(-4);
    dados.registros = dados.registros.filter(r => !/^av-cmt-acesso-/.test(String(r.id || ''))).concat(acessos);
    const antigos = acessos.length;
    dados.registros.push({
      id: 'av-cmt-acesso-' + agora.getTime().toString(36),
      time: agora.toISOString(), user: 'Painel do relator',
      title: 'O relator entrou no painel',
      message: 'Entrada em ' + dia.slice(8, 10) + '/' + dia.slice(5, 7) + '/' + dia.slice(0, 4) + ', às ' + hora + '.',
      link: '/cmt/', linkTxt: 'Abrir o painel do relator',
      nivel: 'info', painel: false, notificacao: true, para: [gestor], ate, fixo: false,
    });
    dados.atualizadoEm = agora.toISOString();
    try { await L.gravarJson(AVISOS, dados, sha, 'Painel do relator: entrada ' + (L.norm(u) === L.norm(process.env.CMT_RELATOR || 'CM') ? 'do Desembargador' : 'de ' + u) + ' registrada para ' + gestor); return antigos; }
    catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
  }
  return null;
}
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
/* depois da atribuição de module.exports: antes ficava acima e se perdia (CMT.porChave chegava undefined no painel.js) */
module.exports.porChave = porChave;
async function painel(req, res, u) {
  res.setHeader('Cache-Control', 'no-store');
  const a = await L.acessos(u);
  /* quem chega aqui já passou por painel.js: sessão do Ex Officio ou chave do link pessoal (CMT_CHAVE) */
  void a;
  const hj = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
  /* decisões do desembargador: liberar o voto e assinar a monocrática.
     As duas gravam onde já era gravado — o item da pauta e a ficha única — e podem ser desfeitas. */
  if (req.method === 'POST') {
    const b = req.body || {}, cnj = String(b.cnj || '').trim();
    /* gravações feitas daqui levam a marca do painel, para o registro de atividades da Chefia */
    const uw = (L.norm(u) === L.norm(process.env.CMT_RELATOR || 'CM') ? 'Desembargador' : u) + ' · painel CMT';
    if (!cnj && b.acao !== 'responder' && b.acao !== 'acesso' && b.acao !== 'aviso') return res.status(400).json({ erro: 'Informe o processo.' });
    try {
      /* Etapas encadeadas: calcula no mesmo ciclo de leitura/gravação da pauta.
         O argumento etapa é interno, e não altera o contrato do POST comum. */
      if (b.acao === 'liberar' || b.acao === 'etapa') {
        if (!L.dataOk(b.sessao)) return res.status(400).json({ erro: 'Informe a sessão.' });
        const campo = b.acao === 'liberar' ? 'dataLiberacao' : String(b.campo || '');
        if (!/^(dataMinuta|dataCorrecao|dataLiberacao)$/.test(campo) || (b.acao === 'etapa' && campo === 'dataLiberacao'))
          return res.status(400).json({ erro: 'Etapa inválida.' });
        const g = await require('./pauta').gravarItem(b.sessao, { cnj }, uw, true,
          b.acao === 'liberar' ? req.whatsappEvent : undefined, { campo, desfazer: !!b.desfazer, hoje: hj });
        if (g.status >= 400) return res.status(g.status).json(g.body);
        const it = (g.body && g.body.item) || {};
        return res.status(200).json({ ok: true, cnj, campo, valor: it[campo] || '',
          dataMinuta: it.dataMinuta || '', dataCorrecao: it.dataCorrecao || '', dataLiberacao: it.dataLiberacao || '' });
      }
      /* retirada ou adiamento do item, deferidos pelo relator: grava o desfecho na pauta */
      if (b.acao === 'situacao') {
        if (!L.dataOk(b.sessao)) return res.status(400).json({ erro: 'Informe a sessão.' });
        const v = String(b.valor || '').trim();
        if (v && !/^(Retirado|Adiado)$/i.test(v)) return res.status(400).json({ erro: 'Situação inválida.' });
        const campos = { resultado: v };
        if (typeof b.obs === 'string' && b.obs.trim()) campos.obs = b.obs.trim().slice(0, 2000);
        const g = await require('./pauta').gravarItem(b.sessao, { cnj, campos }, uw, true);
        if (g.status >= 400) return res.status(g.status).json(g.body);
        return res.status(200).json({ ok: true, cnj, resultado: v });
      }
      /* sinalizações do item (as mesmas do prontuário e dos cartões da pauta): intercorrência com tipo,
         pendências e avisos do cartão; grava pelo mesmo caminho da página da pauta (diligência automática incluída) */
      if (b.acao === 'sinal') {
        if (!L.dataOk(b.sessao)) return res.status(400).json({ erro: 'Informe a sessão.' });
        const C = b.campos || {}, campos = {};
        ['intercor', 'intercorOk', 'intercorTipo', 'intercorChamado', 'retidoOk'].forEach(k => { if (k in C) campos[k] = String(C[k] == null ? '' : C[k]).slice(0, 1200); });
        if (campos.intercorTipo && !/^(Chamado ao TI|Adiado|Retirado de pauta)$/.test(campos.intercorTipo)) return res.status(400).json({ erro: 'Tipo de intercorrência inválido.' });
        const lista = v => (Array.isArray(v) ? v : []).filter(x => x && String(x.desc || '').trim()).slice(0, 60)
          .map(x => ({ desc: String(x.desc).trim().slice(0, 300), ok: !!x.ok, em: String(x.em || hj).slice(0, 10), por: String(x.por || 'CMT').slice(0, 60) }));
        if (C.cartao && typeof C.cartao === 'object') {
          campos.cartao = {};
          if ('pendencias' in C.cartao) campos.cartao.pendencias = lista(C.cartao.pendencias);
          if ('avisos' in C.cartao) campos.cartao.avisos = lista(C.cartao.avisos);
        }
        if (!Object.keys(campos).length) return res.status(400).json({ erro: 'Nada a gravar.' });
        const g = await require('./pauta').gravarItem(b.sessao, { cnj, campos }, uw, true);
        if (g.status >= 400) return res.status(g.status).json(g.body);
        return res.status(200).json({ ok: true, cnj });
      }
      /* entrada no painel: avisa o gestor, e nunca atrapalha quem está entrando */
      /* aviso do desembargador à equipe (ex.: depois de gravar no Compendium): mural e notificação de todos, por 7 dias */
      if (b.acao === 'aviso') {
        const titulo = String(b.titulo || '').trim().slice(0, 160), texto = String(b.texto || '').trim().slice(0, 2000);
        if (!titulo) return res.status(400).json({ erro: 'Informe o título do aviso.' });
        await avisarEquipe(titulo, texto);
        return res.status(200).json({ ok: true });
      }
      /* designação na urgência: o relator escolhe quem minuta e quem corrige; grava na ficha (a mesma da página Monocráticas) e avisa quem mudou */
      if (b.acao === 'designar') {
        const nomes = L.equipe(), acha = n => nomes.find(x => L.norm(x) === L.norm(n)) || String(n || '').trim();
        const sv = b.servidor ? acha(b.servidor) : '', co = b.corretor ? acha(b.corretor) : '';
        const { doc: d0 } = await FICHA.lerOpLeitura();
        const r0 = (d0.registros || []).find(r => String(r.processo || '').replace(/\D/g, '') === cnj.replace(/\D/g, ''));
        const ant = r0 ? MONO.item(r0) : {};
        const salvo = await MONO.gravarMono(cnj, { servidor: sv, corretor: co }, 'CMT', true);
        const novos = [sv !== (ant.servidor || '') && sv ? sv : '', co !== (ant.corretor || '') && co ? co : ''].filter(Boolean);
        if (novos.length) {
          const c = (salvo.item || {}).ctl || {};
          await avisarEquipe('Designação do Desembargador · ' + cnj,
            'Urgência ' + [c.urgTipo, c.urgNivel].filter(Boolean).join(' · ') + '.\n' + [sv ? 'Minuta: ' + sv : '', co ? 'Correção: ' + co : ''].filter(Boolean).join('\n'),
            { tipo: 'des', para: [...new Set(novos)], painel: false, link: '/equipe/#mono', linkTxt: 'Abrir as monocráticas' });
        }
        return res.status(200).json({ ok: true, cnj, servidor: sv, corretor: co, avisados: novos });
      }
      if (b.acao === 'acesso') {
        try { await avisarAcesso(u); } catch (e) { return res.status(200).json({ ok: false, erro: e.message }); }
        return res.status(200).json({ ok: true });
      }
      if (b.acao === 'assinar') {
        await MONO.gravarMono(cnj, { dataAssinatura: b.desfazer ? '' : hj }, uw, true);
        if (b.origem === 'extensao') await copiaGestor(u, (b.desfazer ? 'Assinatura desfeita · ' : 'Decisão assinada · ') + cnj, 'Marcada pelo Desembargador na extensão HERO18810, em ' + br(hj) + '.');
        return res.status(200).json({ ok: true, cnj, dataAssinatura: b.desfazer ? '' : hj });
      }
      /* devolutiva: vira diligência para o servidor do processo, no mesmo quadro da equipe */
      if (b.acao === 'devolver') {
        const txt = String(b.texto || '').trim().slice(0, 2000);
        if (!txt) return res.status(400).json({ erro: 'Escreva o apontamento da devolutiva.' });
        const r = await criarDiligencia({ title: 'Devolutiva · ' + cnj, description: txt, assignee: String(b.para || ''),
          numero: cnj, sessao: L.dataOk(b.sessao) ? b.sessao : '', urgency: 'Alta',
          ...(req.whatsappEvent && { whatsappEvento: req.whatsappEvent }) }, u);
        if (b.origem === 'extensao') await copiaGestor(u, 'Devolutiva do Desembargador · ' + cnj, (b.para ? 'Para: ' + b.para + '\n' : '') + txt);
        return res.status(200).json({ ok: true, task: r });
      }
      /* resposta do desembargador a uma dúvida que lhe foi dirigida: fica no registro e conclui a diligência */
      if (b.acao === 'responder') {
        const txt = String(b.texto || '').trim().slice(0, 2000);
        if (!txt) return res.status(400).json({ erro: 'Escreva a resposta.' });
        const r = await responder(String(b.id || ''), txt, u, !!b.manter, req.whatsappEvent);
        if (b.origem === 'extensao') await copiaGestor(u, 'Resposta do Desembargador · ' + (r.title || 'dúvida'), (r.numero ? r.numero + '\n' : '') + (r.creator ? 'Dúvida de ' + r.creator + ': ' + String(r.description || '').slice(0, 400) + '\n' : '') + 'Resposta: ' + txt);
        return res.status(200).json({ ok: true, task: r });
      }
      return res.status(400).json({ erro: 'Ação desconhecida.' });
    } catch (e) { return res.status(e.status || 500).json({ erro: e.message }); }
  }
  const [cal, doc, aus, pen, com, avi, sus] = await Promise.all([
    opc('acervo/sessoes/calendario.json'),
    FICHA.lerOpLeitura().then(x => x.doc).catch(() => null),
    opc('apoio/equipe-solicitacoes.json'),
    opc('apoio/equipe-pendencias.json'),
    opc('apoio/equipe-comunicados.json'),
    opc('apoio/equipe-avisos.json'),
    opc('apoio/sustentacoes.json')
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
    .map(r => ({ id: r.id, tipo: /retirada/i.test(r.title) ? 'retirada' : 'adiamento', titulo: r.title || '', razao: r.razao || '',
      texto: r.description || '', numero: r.numero || '', de: r.creator || '', sessao: r.sessao || '',
      prioridade: r.urgency || '', em: r.atualizadoEm || r.criadoEm || '', resposta: r.resposta || '' }))
    .sort((x, y) => String(y.em).localeCompare(String(x.em)));

  /* diligências do quadro da equipe, do ponto de vista do relator: as que estão com ele primeiro */
  const ETAPA = { todo: 'A fazer', doing: 'Em andamento', review: 'Em revisão', done: 'Concluída' };
  const diligencias = ((pen || {}).registros || [])
    .filter(r => !r.excluida && r.stage !== 'done')
    .map(r => ({ id: r.id, titulo: r.title || '', texto: r.description || '', para: r.assignee || '', de: r.creator || '',
      numero: r.numero || '', sessao: r.sessao || '', prioridade: r.urgency || '', etapa: ETAPA[r.stage] || r.stage || '',
      prazo: r.dueDate || '', em: r.atualizadoEm || r.criadoEm || '',
      minha: L.norm(r.assignee) === L.norm(u), dele: L.norm(r.creator) === L.norm(u), pedido: PEDIDO.test(String(r.title || '')) }))
    .sort((x, y) => (y.minha - x.minha) || (y.dele - x.dele) || String(y.em).localeCompare(String(x.em)))
    .slice(0, 120);

  /* pedidos de sustentação oral e preferência: um aviso por pedido, na hora em que chegou (ou foi vinculado à pauta),
     no lugar do resumo em bloco que o AgentMail grava nos avisos gerais */
  const recentes = Date.now() - 7 * 86400e3, dgs = x => String(x || '').replace(/\D/g, '');
  const soAtivos = ((sus || {}).registros || []).filter(p => p.cnj && (!p.data || p.data >= hj || Date.parse(p.vinculadoEm || p.recebidoEm) >= recentes));
  const soDocs = {};
  await Promise.all([...new Set(soAtivos.map(p => (p.vinculo || {}).sessao).filter(d => L.dataOk(d)))]
    .map(d => opc('acervo/sessoes/' + d + '.json').then(x => { soDocs[d] = x; })));
  const soItem = p => { const d = soDocs[(p.vinculo || {}).sessao]; if (!d || p.estado !== 'vinculado') return null;
    return [].concat(d.itens || [], d.previa || []).find(it => dgs(it.cnj) === dgs(p.cnj)) || null; };
  const notSo = soAtivos.map(p => { const it = soItem(p), ses = it ? p.vinculo.sessao : (p.data || '');
    const tit = p.tipo === 'Preferência' ? 'Preferência' : p.tipo === 'Presencial' ? 'Sustentação oral presencial' : 'Sustentação oral por videoconferência';
    return { id: 'so-' + String(p.id).replace(/^so-/, ''), tipo: 'sustentacao', titulo: tit + (ses ? ' · sessão de ' + br(ses) : '') + (it ? '' : ' · a vincular'), texto: '',
      de: 'AgentMail', numero: p.cnj, em: (it && p.vinculadoEm) || p.recebidoEm || '', modalidade: p.tipo || '', item: it ? String(it.item || '') : '',
      advogado: p.advogado || '', oab: p.oab || '', parte: p.parte || '', sessao: ses, aVincular: !it }; });
  /* notificações dirigidas ao relator: comunicados da equipe e avisos gerais ainda válidos */
  let notificacoes = comunicados.filter(c => !c.lidoEm)
    .map(c => ({ id: 'co-' + c.id, tipo: 'comunicado', titulo: c.titulo || 'Comunicado', texto: c.texto || '',
      de: c.de || '', numero: (c.cnjs || [])[0] || '', em: c.em || '', comId: c.id }))
    .concat(((avi || {}).registros || [])
      .filter(a => !/^av-cmt-/.test(String(a.id || '')))   /* a entrada do relator e os avisos dele à equipe não voltam para ele */
      .filter(a => !(a.user === 'AgentMail' && /^av-so-/.test(String(a.id || ''))))   /* resumo das sustentações: vai pedido a pedido */
      .filter(a => !a.ate || a.ate >= hj)
      .filter(a => !(a.para || []).length || (a.para || []).some(n => L.norm(n) === L.norm(u)))
      .map(a => ({ id: 'av-' + a.id, tipo: 'aviso', titulo: a.title || 'Aviso', texto: a.message || '',
        de: a.user || 'Responsável', numero: '', em: a.time || '', nivel: a.nivel || 'info' })))
    .concat(notSo)
    .sort((x, y) => String(y.em).localeCompare(String(x.em)))
    .slice(0, 60);

  /* monocráticas e urgências */
  const assinar = { assinatura: [], liberacao: [] }, urgencias = [];
  const regs = ((doc || {}).registros || []).filter(r => (r.producao || {}).Destino === 'Monocrática' || !!(r.triagem || {})['Urgência']);
  /* caso de cada monocrática a assinar (assunto, classe e partes do acervo, como na página Monocráticas) */
  let ACV = {};
  if (regs.some(r => { const i = MONO.item(r); return i.mono && i.dataLiberacao && !i.assinado; })) { try { ACV = (await MONO.acervo()).base || {}; } catch (e) {} }
  const dgs0 = x => String(x || '').replace(/\D/g, '');
  regs.forEach(r => {
    const i = MONO.item(r), c = i.ctl || {};
    const base = { cnj: i.cnj, servidor: i.servidor || '', corretor: i.corretor || '', obs: i.obs || '' };
    if (i.mono && i.dataLiberacao && !i.assinado) {
      /* o cartão de assinatura traz o necessário para decidir sem abrir a ficha: ato, etapas, prazo e a urgência, se houver */
      const pr = r.producao || {}, tr = r.triagem || {}, ct = r.controles || {}, pa = r.pauta || {}, d10 = v => String(v || '').slice(0, 10);
      const ok = v => /^\d{4}-\d{2}-\d{2}$/.test(d10(v));
      const urg = c.urgTipo && !/^Apreciada/.test(String(c.urgSit || '')) ? { tipo: c.urgTipo, nivel: c.urgNivel || '', pedidoEm: c.urgEm || '',
        espera: ok(c.urgEm) ? dias(hj, d10(c.urgEm)) : null, situacao: c.urgSit || '', obs: c.urgObs || '' } : null;
      assinar.assinatura.push(Object.assign({ desde: i.dataLiberacao, aguarda: ok(i.dataLiberacao) ? dias(hj, d10(i.dataLiberacao)) : null,
        dataMinuta: i.dataMinuta || '', dataCorrecao: i.dataCorrecao || '', tipoAto: pr['Mono - Tipo de ato'] || '', julgamento: tr['Tipo de Julgamento'] || '',
        meta: tr.META || '', prazo: ok(ct['Monocrática - Prazo']) ? d10(ct['Monocrática - Prazo']) : '', topico: pr['Tópico-síntese'] || '',
        atencao: pr['Rev - Atenção'] || '', notaAtencao: pr['Rev - Nota de atenção'] || '', sessao: pa['Sessão original'] || '',
        item: pa['Item (Pauta de Julgamento)'] || '', urg,
        titulo: (i.ctl || {}).titulo || '', assunto: (ACV[dgs0(i.cnj)] || {}).assunto || '', classe: (ACV[dgs0(i.cnj)] || {}).classe || '', partes: (ACV[dgs0(i.cnj)] || {}).partes || '' }, base));
    }
    else if (i.mono && i.dataCorrecao && !i.dataLiberacao) assinar.liberacao.push(Object.assign({ desde: i.dataCorrecao }, base));
    if (c.urgTipo && !/^Apreciada/.test(String(c.urgSit || ''))) urgencias.push(Object.assign({
      tipo: c.urgTipo || '', nivel: c.urgNivel || '', pedidoEm: c.urgEm || '', situacao: c.urgSit || '',
      espera: c.urgEm ? dias(hj, String(c.urgEm).slice(0, 10)) : null,
      dataMinuta: i.dataMinuta || '', dataCorrecao: i.dataCorrecao || '', dataLiberacao: i.dataLiberacao || '', assinado: !!i.assinado
    }, base));
  });
  /* produção lançada por dia: minutas de voto (itens das pautas publicadas) e monocráticas (ficha única) */
  const producao = {};
  const lanca = (d, k) => { const x = String(d || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return; (producao[x] = producao[x] || { voto: 0, mono: 0 })[k]++; };
  regs.forEach(r => { const i = MONO.item(r); if (i.mono) lanca(i.dataMinuta, 'mono'); });
  const ordem = (x, y) => String(x.desde || x.pedidoEm || '').localeCompare(String(y.desde || y.pedidoEm || ''));
  assinar.assinatura.sort((x, y) => (!!y.urg - !!x.urg) || ordem(x, y)); assinar.liberacao.sort(ordem);
  urgencias.sort((x, y) => (y.espera || 0) - (x.espera || 0));
  /* também nas notificações do relator: dúvidas dirigidas a ele, pedidos (possível causa de retirada ou adiamento),
     decisões submetidas à assinatura e urgências em aberto; cada uma pela data em que chegou */
  notificacoes = notificacoes
    .concat(duvidas.map(d => ({ id: 'du-' + d.id, tipo: 'duvida', titulo: d.titulo || 'Dúvida', texto: d.texto || '',
      de: d.de || '', numero: d.numero || '', em: d.em || '', prazo: d.prazo || '' })))
    .concat(pedidos.map(d => ({ id: 'pe-' + d.id, tipo: 'pedido', caso: d.tipo, titulo: d.titulo || (d.tipo === 'retirada' ? 'Pedido de retirada de pauta' : 'Pedido de adiamento'),
      texto: (d.razao ? 'Razão: ' + d.razao + (d.texto ? '\n' : '') : '') + (d.texto || ''), de: d.de || '', numero: d.numero || '', em: d.em || '', sessao: d.sessao || '' })))
    .concat(assinar.assinatura.map(a => ({ id: 'as-' + a.cnj, tipo: 'assinatura', titulo: 'Decisão submetida à assinatura' + (a.tipoAto ? ' · ' + a.tipoAto : ''),
      texto: a.topico || '', de: a.servidor || '', numero: a.cnj, em: a.desde || '', urg: !!a.urg })))
    .concat(urgencias.map(x => ({ id: 'ur-' + x.cnj, tipo: 'urgencia', titulo: 'Urgência · ' + (x.tipo || 'pedido urgente') + (x.nivel ? ' (' + x.nivel + ')' : ''),
      texto: [x.situacao || 'pendente', x.obs || ''].filter(Boolean).join(' · '), de: x.servidor || '', numero: x.cnj, em: x.pedidoEm || '' })))
    .sort((x, y) => String(y.em).localeCompare(String(x.em)))
    .slice(0, 100);

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
      resultado: it.resultado || '', intercor: c.intercor || '', intercorOk: !!c.intercorOk, intercorTipo: c.intercorTipo || '', intercorChamado: c.intercorChamado || '', retidoOk: c.retidoOk || '',
      pendencias: ((c.cartao || {}).pendencias) || [], avisos: ((c.cartao || {}).avisos) || [], meta: c.meta || '',
      sopref: c.sopref || '', destaque: c.destaque || '', julgamento: it.julgamento || '', obs: it.obs || '' };
  }) };
  /* marcos da semana: de 7 dias atrás a 7 dias à frente, nas sessões visíveis à equipe (data fora de um ano é erro de cadastro e fica de fora) */
  const NOMES = { pautarAte: 'Peço dia', inicioPreparacao: 'Início da preparação', entregaMinutas: 'Entrega das minutas', liberacao: 'Liberação' };
  todas.forEach(s => Object.keys(NOMES).forEach(k => {
    const d = (s.marcos || {})[k]; if (!L.dataOk(d)) return;
    const n = dias(d, hj); if (n > 7 || n < -7) return;
    prazos.push({ sessao: s.date, marco: NOMES[k], data: d, dias: n });
  }));
  prazos.sort((x, y) => x.dias - y.dias);

  const ausencias = ((aus || {}).registros || []).filter(r => r.estado === 'pendente')
    .map(r => ({ id: r.id, nome: r.nome, de: r.de, ate: r.ate, tipo: r.tipo, motivo: r.motivo || '', criadoEm: r.criadoEm || '' }))
    .sort((x, y) => String(x.de).localeCompare(String(y.de)));

  /* quem pode ser designado: minutantes (equipe.json, minuta) e corretores (assessoria; Renato e CM não corrigem) */
  const eqR = ((equipeDoc || {}).registros || []).filter(r => r.nome && r.ativo !== false);
  const equipe = { minutantes: eqR.filter(r => r.minuta === true).map(r => r.nome),
    corretores: eqR.filter(r => r.papel === 'assessoria' && !['renato', 'cm'].includes(L.norm(r.nome))).map(r => r.nome) };
  res.status(200).json({ usuario: u, hoje: hj, assinar, equipe, duvidas, pedidos, comunicados, notificacoes, diligencias, urgencias, sessoes, agenda, pauta, prazos, producao, produtividade,
    equipe: Object.keys(porServidor).map(n => porServidor[n]).sort((x, y) => (y.minutas + y.correcoes) - (x.minutas + x.correcoes)),
    ausencias, fontes: { ficha: !!doc, calendario: !!cal, pautas: docs.filter(Boolean).length, ausencias: !!aus, duvidas: !!pen } });
}
module.exports.br = br;
