/* GET /api/notificacoes  avisos do servidor, montados do que já está no procs-muta (sem arquivo próprio de eventos):
   avisos gerais do responsável (apoio/equipe-avisos.json), processos seus alterados por outra pessoa nas pautas publicadas,
   pendências atribuídas a você ou criadas por você e alteradas por outra pessoa, e decisões sobre as suas ausências. */
const L = require('./_lib');
const opc = rel => L.lerJson(rel).then(x => x.dados).catch(() => null);
module.exports = async (req, res) => {
  if (req.query && req.query.gestao) return require('./_avisos')(req, res);
  res.setHeader('Cache-Control', 'no-store');
  const u = L.exigir(req, res); if (!u) return;
  try {
    const eu = L.norm(u), ev = [];
    const [cal, avisos, pend, aus, com] = await Promise.all([opc('acervo/sessoes/calendario.json'), opc('apoio/equipe-avisos.json'), opc('apoio/equipe-pendencias.json'), opc('apoio/equipe-solicitacoes.json'), opc('apoio/equipe-comunicados.json')]);
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
      /* destinatários: lista vazia = toda a equipe; o gestor vê todos; vencido some */
      if ((a.para || []).length && !a.para.some(n => L.norm(n) === eu) && !L.gestor(u)) return;
      if (a.ate && a.ate < hj) return;
      ev.push({ id: 'av-' + a.id, time: a.time, action: 'aviso-geral', user: a.user || 'Responsável', title: a.title, message: a.message,
        link: a.link || '', linkTxt: a.linkTxt || '', nivel: a.nivel || 'info', painel: a.painel !== false, notificacao: a.notificacao !== false, para: a.para || [], fixo: !!a.fixo, ate: a.ate || '', avId: a.id });
    });
    const pubs = ((cal || {}).sessoes || []).filter(s => s.publicada);
    const docs = await Promise.all(pubs.map(s => opc('acervo/sessoes/' + s.date + '.json')));
    pubs.forEach((s, i) => { const d = docs[i]; if (!d) return; ((d.itens || []).length ? d.itens : (d.previa || [])).forEach(it => {
      const c = it.ctl || {}; if (!c.editadoEm || L.norm(c.editadoPor) === eu) return;
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
      if (L.norm(t.atualizadoPor) === eu) return; if (L.norm(t.assignee) !== eu && L.norm(t.creator) !== eu) return;
      ev.push({ id: 'pe-' + t.id + '-' + (t._rev || 1), time: t.atualizadoEm, action: 'pendencia', user: t.atualizadoPor, title: (t.excluida ? 'Diligência excluída' : t.stage === 'done' ? 'Diligência concluída' : (t._rev || 1) === 1 ? 'Nova diligência para você' : 'Diligência atualizada') + ' · ' + t.title, message: [t.numero, t.dueDate && 'prazo ' + t.dueDate.split('-').reverse().join('/')].filter(Boolean).join(' · '), resolved: t.stage === 'done' });
    });
    ((aus || {}).registros || []).forEach(a => { if (L.norm(a.nome) !== eu || !a.decididoEm || L.norm(a.decididoPor) === eu) return;
      ev.push({ id: 'au-' + a.id + '-' + a.estado, time: a.decididoEm, action: 'ausencia', user: a.decididoPor || 'Responsável', title: 'Ausência ' + a.estado + ' · ' + a.tipo, message: a.de.split('-').reverse().join('/') + (a.ate !== a.de ? ' a ' + a.ate.split('-').reverse().join('/') : '') + (a.obs ? ' · ' + a.obs : '') }); });
    ev.sort((a, b) => String(b.time).localeCompare(String(a.time)));
    res.status(200).json({ events: ev.slice(0, 60) });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
