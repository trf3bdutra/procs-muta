/* GET /api/notificacoes  avisos do servidor, montados do que já está no procs-muta (sem arquivo próprio de eventos):
   avisos gerais do responsável (apoio/equipe-avisos.json), processos seus alterados por outra pessoa nas pautas publicadas,
   pendências atribuídas a você ou criadas por você e alteradas por outra pessoa, e decisões sobre as suas ausências. */
const L = require('./_lib');
const PEDIDOS = require('./_pedidos');
const opc = rel => L.lerJson(rel).then(x => x.dados).catch(() => null);
module.exports = async (req, res) => {
  if (req.query && req.query.gestao) return require('./_avisos')(req, res);
  res.setHeader('Cache-Control', 'no-store');
  const u = L.exigir(req, res); if (!u) return;
  try {
    const eu = L.norm(u), ev = [];
    const [cal, avisos, pend, aus, com, pedidos] = await Promise.all([opc('acervo/sessoes/calendario.json'), opc('apoio/equipe-avisos.json'), opc('apoio/equipe-pendencias.json'), opc('apoio/equipe-solicitacoes.json'), opc('apoio/equipe-comunicados.json'), PEDIDOS.lerRegistros()]);
    /* comunicados ao desembargador: ele vê os recebidos; quem enviou, o seu próprio */
    let ehCmt = L.gestor(u);
    if (!ehCmt) { try { const ac = await L.acessos(u); ehCmt = !!(ac && ac.perfil === 'desembargador'); } catch (e) { /* perfil ilegível */ } }
    ((com || {}).registros || []).forEach(c => {
      if (c.excluido) return;
      const meu = L.norm(c.de) === eu; if (!ehCmt && !meu) return;
      const qt = (c.cnjs || []).length;
      ev.push({ id: 'co-' + c.id + (c.lidoEm ? '-lido' : ''), time: c.criadoEm, action: 'comunicado', user: c.de,
        title: (meu && !ehCmt ? 'Comunicado enviado · ' : '') + c.titulo,
        message: [meu && !ehCmt ? 'ao desembargador' : 'de ' + c.de, qt ? qt + (qt > 1 ? ' processos' : ' processo') : '', c.lidoEm ? 'lido' : 'não lido'].filter(Boolean).join(' · '),
        texto: c.texto, numero: (c.cnjs || [])[0] || '', nivel: c.lidoEm ? 'info' : 'urgente', resolved: !!c.lidoEm, comId: c.id });
    });
    const hj = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
    ((avisos || {}).registros || []).forEach(a => {
      if (a.user === 'AgentMail' && String(a.id).startsWith('av-so-')) return;
      /* destinatários: lista vazia = toda a equipe; o gestor vê todos; vencido some */
      if ((a.para || []).length && !a.para.some(n => L.norm(n) === eu) && !L.gestor(u)) return;
      if (a.ate && a.ate < hj) return;
      ev.push({ id: 'av-' + a.id, time: a.time, action: 'aviso-geral', user: a.user || 'Responsável', title: a.title, message: a.message,
        link: a.link || '', linkTxt: a.linkTxt || '', nivel: a.nivel || 'info', painel: a.painel !== false, notificacao: a.notificacao !== false, para: a.para || [], fixo: !!a.fixo, ate: a.ate || '', avId: a.id });
    });
    const pubs = ((cal || {}).sessoes || []).filter(s => s.publicada);
    const porData = new Map(pubs.map(s => [s.date, opc('acervo/sessoes/' + s.date + '.json')]));
    const recentes = Date.now() - 7 * 86400e3;
    const pedidosAtivos = pedidos.filter(p => !p.data || p.data >= hj ||
      Date.parse(p.vinculadoEm || p.recebidoEm) >= recentes);
    const [docs, meusPedidos] = await Promise.all([
      Promise.all(porData.values()),
      PEDIDOS.paraUsuario(u, pedidosAtivos, data => porData.get(data) || PEDIDOS.obterSessao(data), ehCmt),
    ]);
    meusPedidos.forEach(p => {
      const vinculo = p.vinculo;
      const mensagem = [p.cnj, vinculo?.item && 'item ' + vinculo.item,
        p.advogado, p.oab && 'OAB ' + p.oab, p.parte && 'por ' + p.parte].filter(Boolean);
      ev.push({
        id: 'pedido-' + p.id, time: vinculo ? p.vinculadoEm || p.recebidoEm : p.recebidoEm,
        action: 'pedido-sessao', user: 'AgentMail',
        title: [p.titulo, p.data && 'sessão de ' + p.data.split('-').reverse().join('/'),
          !vinculo && 'a vincular'].filter(Boolean).join(' · '),
        message: [...mensagem, !vinculo && p.motivo].filter(Boolean).join(' · '),
        nivel: 'importante', pedidoId: p.id, estado: p.estado,
        // O cliente navega usando sessao+numero; pedidos não vinculados
        // continuam consultáveis pelo pedidoId, sem apontar a item inexistente.
        ...(vinculo && porData.has(vinculo.sessao) && { sessao: vinculo.sessao, numero: p.cnj }),
      });
    });
    pubs.forEach((s, i) => { const d = docs[i]; if (!d) return; ((d.itens || []).length ? d.itens : (d.previa || [])).forEach(it => {
      const c = it.ctl || {};
      const historico = c.historicoDesignacoes || [];
      historico.forEach(reg => reg.alteracoes.forEach(m => {
        const antes = L.norm(m.de) === eu, depois = L.norm(m.para) === eu;
        if (!(antes || depois)) return;
        const transferida = !!String(m.de || '').trim().replace(/^—$/, '') && !!String(m.para || '').trim().replace(/^—$/, '');
        const titulo = transferida ? 'Redistribuição' : depois ? 'Nova designação' : 'Designação retirada';
        const item = it.item ? 'item '+it.item : 'pré-pauta';
        const marco = (s.marcos || {}).entregaMinutas;
        const prazo = depois && m.papel === 'minuta' && L.dataOk(marco) ? 'entrega '+marco.split('-').reverse().join('/') : '';
        ev.push({ id: ['des', s.date, it.cnj, m.papel, reg.em].join('-'), time: reg.em, action: 'pauta', user: reg.por,
          title: titulo+' · '+m.papel,
          message: [it.cnj, item, 'sessão de '+s.date.split('-').reverse().join('/'),
            transferida && antes && 'novo responsável: '+m.para, prazo].filter(Boolean).join(' · '),
          sessao: s.date, numero: it.cnj });
      }));
      if (historico.some(reg => reg.em === c.editadoEm && reg.alteracoes.some(m => L.norm(m.para) === eu))) return;
      if (!c.editadoEm || ['AGENTMAIL', eu].includes(L.norm(c.editadoPor))) return;
      if (L.norm(it.servidor) !== eu && L.norm(it.corretor) !== eu) return;
      ev.push({ id: 'pr-' + s.date + '-' + String(it.cnj).replace(/\D/g, ''), time: c.editadoEm, action: 'processos', user: c.editadoPor, title: 'Atualizou um processo seu', message: it.cnj + ' · sessão de ' + s.date.split('-').reverse().join('/') + (it.item ? ' · item ' + it.item : ''), sessao: s.date, numero: it.cnj });
    }); });
    /* publicação da pauta: quantos processos ficaram com você; e o prazo até a entrega das minutas, enquanto houver pendência sua */
    pubs.forEach((s, i) => {
      const d = docs[i]; if (!d) return;
      const lista = (d.itens || []).length ? d.itens : (d.previa || []);
      const br = x => String(x).split('-').reverse().join('/');
      const meusM = lista.filter(it => L.norm(it.servidor) === eu), meusC = lista.filter(it => L.norm(it.corretor) === eu);
      if (!meusM.length && !meusC.length) return;
      const tPub = s.publicadaEm || d.publicadaEm || d.atualizadoEm || (cal || {}).atualizadoEm || '';
      const qtd = (n, o) => n + (n > 1 ? ' processos designados a você para ' : ' processo designado a você para ') + o;
      if (tPub) ev.push({ id: 'pp-' + s.date, time: tPub, action: 'pauta', user: '', title: 'Pauta publicada · sessão de ' + br(s.date),
        message: meusM.length && meusC.length ? qtd(meusM.length, 'minuta') + ' · ' + meusC.length + ' para correção'
          : meusM.length ? qtd(meusM.length, 'minuta') : qtd(meusC.length, 'correção'), sessao: s.date });
      const ent = (s.marcos || {}).entregaMinutas;
      if (!ent || !/^\d{4}-\d{2}-\d{2}$/.test(ent)) return;
      const faltaM = meusM.filter(it => !it.dataMinuta).length, faltaC = meusC.filter(it => !it.dataCorrecao).length;
      if (!faltaM && !faltaC) return;
      const dias = Math.round((Date.parse(ent + 'T12:00:00Z') - Date.parse(hj + 'T12:00:00Z')) / 86400e3);
      if (dias > 7) return;
      const marco = dias < 0 ? -1 : dias === 0 ? 0 : dias === 1 ? 1 : dias <= 3 ? 3 : 7;
      const inicio = new Date(Date.parse(ent + 'T12:00:00Z') - (marco < 0 ? -1 : marco) * 86400e3).toISOString().slice(0, 10);
      ev.push({ id: 'pz-' + s.date + '-' + marco, time: inicio + 'T12:00:00.000Z', action: 'prazo', user: '',
        title: dias < 0 ? 'Entrega das minutas vencida em ' + br(ent) : dias === 0 ? 'Entrega das minutas é hoje' : dias === 1 ? 'Entrega das minutas é amanhã' : 'Faltam ' + dias + ' dias para a entrega das minutas',
        message: ['sessão de ' + br(s.date), faltaM && faltaM + (faltaM > 1 ? ' minutas suas pendentes' : ' minuta sua pendente'), faltaC && faltaC + (faltaC > 1 ? ' correções pendentes' : ' correção pendente')].filter(Boolean).join(' · '),
        nivel: dias <= 1 ? 'urgente' : 'importante', sessao: s.date });
    });
    ((pend || {}).registros || []).forEach(t => {
      const indice = pubs.findIndex(s => s.date === t.sessao);
      const pauta = indice >= 0 ? docs[indice] : null;
      const cnj = String(t.numero || '').replace(/\D/g, '');
      const destino = cnj.length === 20 && pauta && ((pauta.itens || []).concat(pauta.previa || []))
        .some(it => String(it.cnj || '').replace(/\D/g, '') === cnj)
        ? { sessao: t.sessao, numero: t.numero } : {};
      if (!t.excluida && t.stage !== 'done' && L.norm(t.assignee) === eu && L.dataOk(t.dueDate)) {
        const dias = Math.round((Date.parse(t.dueDate) - Date.parse(hj)) / 86400e3);
        if (dias <= 1) {
          ev.push({ id: 'pe-prazo-'+t.id+'-'+hj, time: hj+'T04:00:00.000Z', action: 'pendencia',
            title: (dias < 0 ? 'Pendência vencida' : dias === 0 ? 'Pendência vence hoje' : 'Pendência vence amanhã')+' · '+t.title,
            message: [t.numero, 'prazo '+t.dueDate.split('-').reverse().join('/')].filter(Boolean).join(' · '),
            nivel: dias <= 0 ? 'urgente' : 'importante', ...destino });
        }
      }
      if (L.norm(t.atualizadoPor) === eu) return; if (L.norm(t.assignee) !== eu && L.norm(t.creator) !== eu) return;
      ev.push({ id: 'pe-' + t.id + '-' + (t._rev || 1), time: t.atualizadoEm, action: 'pendencia', user: t.atualizadoPor, title: (t.excluida ? 'Diligência excluída' : t.stage === 'done' ? 'Diligência concluída' : (t._rev || 1) === 1 ? 'Nova diligência para você' : 'Diligência atualizada') + ' · ' + t.title, message: [t.numero, t.dueDate && 'prazo ' + t.dueDate.split('-').reverse().join('/')].filter(Boolean).join(' · '), resolved: t.stage === 'done', ...destino });
    });
    ((aus || {}).registros || []).forEach(a => { if (L.norm(a.nome) !== eu || !a.decididoEm || L.norm(a.decididoPor) === eu) return;
      ev.push({ id: 'au-' + a.id + '-' + a.estado, time: a.decididoEm, action: 'ausencia', user: a.decididoPor || 'Responsável', title: 'Ausência ' + a.estado + ' · ' + a.tipo, message: a.de.split('-').reverse().join('/') + (a.ate !== a.de ? ' a ' + a.ate.split('-').reverse().join('/') : '') + (a.obs ? ' · ' + a.obs : '') }); });
    ev.sort((a, b) => String(b.time).localeCompare(String(a.time)));
    res.status(200).json({ events: ev.slice(0, 60) });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
