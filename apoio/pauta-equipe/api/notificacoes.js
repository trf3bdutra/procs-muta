/* GET /api/notificacoes  avisos do servidor, montados do que já está no procs-muta (sem arquivo próprio de eventos):
   avisos gerais do responsável (apoio/equipe-avisos.json), processos seus alterados por outra pessoa nas pautas publicadas,
   pendências atribuídas a você ou criadas por você e alteradas por outra pessoa, e decisões sobre as suas ausências. */
const L = require('./_lib');
const opc = rel => L.lerJson(rel).then(x => x.dados).catch(() => null);
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const u = L.exigir(req, res); if (!u) return;
  try {
    const eu = L.norm(u), ev = [];
    const [cal, avisos, pend, aus] = await Promise.all([opc('acervo/sessoes/calendario.json'), opc('apoio/equipe-avisos.json'), opc('apoio/equipe-pendencias.json'), opc('apoio/equipe-solicitacoes.json')]);
    ((avisos || {}).registros || []).forEach(a => ev.push({ id: 'av-' + a.id, time: a.time, action: 'aviso-geral', user: a.user || 'Responsável', title: a.title, message: a.message }));
    const pubs = ((cal || {}).sessoes || []).filter(s => s.publicada);
    const docs = await Promise.all(pubs.map(s => opc('acervo/sessoes/' + s.date + '.json')));
    pubs.forEach((s, i) => { const d = docs[i]; if (!d) return; ((d.itens || []).length ? d.itens : (d.previa || [])).forEach(it => {
      const c = it.ctl || {}; if (!c.editadoEm || L.norm(c.editadoPor) === eu) return;
      if (L.norm(it.servidor) !== eu && L.norm(it.corretor) !== eu) return;
      ev.push({ id: 'pr-' + s.date + '-' + String(it.cnj).replace(/\D/g, ''), time: c.editadoEm, action: 'processos', user: c.editadoPor, title: 'Atualizou um processo seu', message: it.cnj + ' · sessão de ' + s.date.split('-').reverse().join('/') + (it.item ? ' · item ' + it.item : ''), sessao: s.date, numero: it.cnj });
    }); });
    ((pend || {}).registros || []).forEach(t => {
      if (L.norm(t.atualizadoPor) === eu) return; if (L.norm(t.assignee) !== eu && L.norm(t.creator) !== eu) return;
      ev.push({ id: 'pe-' + t.id + '-' + (t._rev || 1), time: t.atualizadoEm, action: 'pendencia', user: t.atualizadoPor, title: (t.excluida ? 'Pendência excluída' : t.stage === 'done' ? 'Pendência concluída' : (t._rev || 1) === 1 ? 'Nova pendência para você' : 'Pendência atualizada') + ' · ' + t.title, message: [t.numero, t.dueDate && 'prazo ' + t.dueDate.split('-').reverse().join('/')].filter(Boolean).join(' · '), resolved: t.stage === 'done' });
    });
    ((aus || {}).registros || []).forEach(a => { if (L.norm(a.nome) !== eu || !a.decididoEm || L.norm(a.decididoPor) === eu) return;
      ev.push({ id: 'au-' + a.id + '-' + a.estado, time: a.decididoEm, action: 'ausencia', user: a.decididoPor || 'Responsável', title: 'Ausência ' + a.estado + ' · ' + a.tipo, message: a.de.split('-').reverse().join('/') + (a.ate !== a.de ? ' a ' + a.ate.split('-').reverse().join('/') : '') + (a.obs ? ' · ' + a.obs : '') }); });
    ev.sort((a, b) => String(b.time).localeCompare(String(a.time)));
    res.status(200).json({ events: ev.slice(0, 60) });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
