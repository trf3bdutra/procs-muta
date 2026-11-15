/* Central de Entregas — leitura derivada, sem criar outra base de processos.
   Pauta: acervo/sessoes/<data>.json; Mono/urgências: acervo/operacional.json;
   Diligências: apoio/equipe-pendencias.json. Um processo pode ter entregas distintas. */
const N = v => String(v == null ? '' : v).trim();
const iso = v => { const s = N(v), m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s); return m ? `${m[3]}-${m[2]}-${m[1]}` : /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''; };
const cnj = s => N(s).replace(/\D/g, '');
const f = (id, origem, etapa, responsavel, props) => Object.assign({ id, origem, etapa, responsavel: N(responsavel), prazo: '', marco: '', sessao: '', cnj: '', item: '', concluida: false }, props);
function pautas(sessoes, docs) {
  const entregas = [];
  sessoes.forEach((sessao, indice) => {
    const doc = docs[indice]; if (!doc) return;
    const previa = !(doc.itens || []).length;
    const lista = previa ? (doc.previa || []) : (doc.itens || []);
    lista.forEach((it, n) => {
      const numero = N(it.cnj || it.processo), chave = cnj(numero) || `${indice}-${n}`;
      const base = { sessao: sessao.date, cnj: numero, item: N(it.item || (previa ? '' : n + 1)), classe: N(it.classe), assunto: N(it.assunto), partes: N(it.partes),
        servidor: N(it.servidor), corretor: N(it.corretor), previa, dataMinuta: iso(it.dataMinuta), dataCorrecao: iso(it.dataCorrecao), dataLiberacao: iso(it.dataLiberacao) };
      // Somente a etapa que exige ação aparece como entrega em aberto.
      if (!it.dataMinuta) entregas.push(f('pauta:' + sessao.date + ':' + chave + ':minuta', 'pauta', 'Minutar', base.servidor,
        Object.assign({}, base, { prazo: iso((sessao.marcos || {}).entregaMinutas), marco: 'Entrega das minutas' })));
      else if (!it.dataCorrecao) entregas.push(f('pauta:' + sessao.date + ':' + chave + ':correcao', 'pauta', 'Revisar / corrigir', base.corretor,
        Object.assign({}, base, { prazo: iso((sessao.marcos || {}).liberacao), marco: 'Marco de liberação' })));
      else if (!it.dataLiberacao) entregas.push(f('pauta:' + sessao.date + ':' + chave + ':liberacao', 'pauta', 'Liberar voto', '',
        Object.assign({}, base, { prazo: iso((sessao.marcos || {}).liberacao), marco: 'Marco de liberação', observacao: 'Responsável pela liberação não informado na pauta' })));
    });
  });
  return entregas;
}
function monocraticas(doc) {
  const entregas = [];
  (doc.registros || []).forEach(r => {
    const p = r.producao || {}, t = r.triagem || {}, numero = N(r.processo), chave = cnj(numero);
    if (!chave) return;
    const responsavel = N(p.SERVIDOR), corretor = N(p.CORRETOR);
    const base = { cnj: numero, servidor: responsavel, corretor, assunto: N(t['Assunto'] || (r.origem || {})['Assunto']),
      dataMinuta: iso(p.MINUTADO), dataCorrecao: iso(p['Data da Revisão']), dataLiberacao: iso(p['Data da Liberação']),
      dataAssinatura: iso(p['Data da Assinatura']) };
    const pedido = N(t['Urgência']), situacao = N(t['Urgência - Apreciação']);
    if (pedido && !/^Apreciada\b/i.test(situacao)) {
      entregas.push(f('urg:' + chave, 'urgencia', 'Apreciar pedido urgente', responsavel,
        Object.assign({}, base, { urgente: true, tipoUrgencia: pedido, situacaoUrgencia: situacao || 'Pendente · não apreciada',
          pedidoEm: iso(t['Urgência - Data']), nivel: N(t['Urgência - Nível']), observacao: N(t['Urgência - Observação']),
          // A data de protocolo NÃO é tratada como prazo judicial.
          prazo: '' })));
    }
    if (N(p.Destino) !== 'Monocrática' || p.Assinado === 'Sim' || p['Data da Assinatura']) return;
    const etapa = !p.MINUTADO ? 'Minutar decisão' : !p['Data da Revisão'] ? 'Revisar decisão' : !p['Data da Liberação'] ? 'Preparar assinatura' : 'Aguardar assinatura';
    const dono = etapa === 'Revisar decisão' ? corretor : etapa === 'Aguardar assinatura' ? '' : responsavel;
    entregas.push(f('mono:' + chave + ':' + etapa, 'mono', etapa, dono,
      Object.assign({}, base, { mono: true, situacaoUrgencia: situacao, tipoUrgencia: pedido, pedidoEm: iso(t['Urgência - Data']),
        observacao: etapa === 'Aguardar assinatura' ? 'A assinatura depende de confirmação no PJe' : '' })));
  });
  return entregas;
}
function pendencias(doc) {
  return (doc.registros || []).filter(t => !t.excluida && t.stage !== 'done').map(t => {
    const num = N(t.numero), id = N(t.id);
    return f('pen:' + id, 'pendencia', N(t.title) || 'Diligência', t.assignee,
      { cnj: num, sessao: N(t.sessao), prazo: iso(t.dueDate), prioridade: N(t.urgency), descricao: N(t.description), etapaPendencia: N(t.stage), pendenciaId: id });
  });
}
module.exports = { pautas, monocraticas, pendencias };
