/* Diligências da equipe (apoio/equipe-pendencias.json): quadro com A fazer, Em andamento, Em revisão e Concluída.
   GET /api/pendencias · POST {title,…} cria · PUT {id,_rev,…} altera · DELETE ?id= exclui (só quem criou)
   POST /api/pendencias?sync=1   acerta os cartões automáticos com as suas origens (ver abaixo)

   Cartão automático: nasce de uma origem e guarda o vínculo em origem e origemChave, para nunca duplicar.
     intercorrência da pauta  int:<data da sessão>:<CNJ>   enquanto ctl.intercor tem texto e ctl.intercorOk está vazio
                              (com ctl.intercorTipo "Chamado ao TI", o título diz e a descrição leva o nº do chamado)
     processo retido          ret:<data da sessão>:<CNJ>   adiado ou retirado de pauta, enquanto ctl.retidoOk está vazio
     urgência da monocrática  urg:<CNJ>                    enquanto a urgência não foi apreciada e a decisão não saiu
   Concluir o cartão resolve a origem (a intercorrência fica marcada como resolvida, com o texto preservado;
   a urgência recebe a apreciação informada). Reabrir desfaz, salvo urgência de monocrática já liberada ou assinada.
   Editar a descrição de um cartão de intercorrência reescreve o campo Intercorrência da pauta. */
const L = require('./_lib');
const FICHA = require('./_ficha');
const dg = s => String(s || '').replace(/\D/g, '');
const hojeISO = () => new Date().toISOString().slice(0, 10);
const ARQ = 'apoio/equipe-pendencias.json', STAGES = ['todo', 'doing', 'review', 'done'], URG = ['Urgente', 'Alta', 'Média', 'Baixa'];
const CAMPOS = ['title', 'description', 'assignee', 'urgency', 'dueDate', 'numero', 'sessao', 'stage', 'razao'];
const APRECIADA = /^Apreciada · /;
/* origens automáticas abertas agora, e as urgências travadas (decisão já liberada ou assinada) */
async function origens() {
  const abertas = new Map(), travas = {};
  const cal = (await L.lerJson('acervo/sessoes/calendario.json')).dados;
  const pubs = (cal.sessoes || []).filter(s => s.publicada);
  const docs = await Promise.all(pubs.map(s => L.lerJson('acervo/sessoes/' + s.date + '.json').then(x => x.dados).catch(() => null)));
  pubs.forEach((s, i) => {
    const d = docs[i]; if (!d) return;
    const lista = (d.itens || []).length ? d.itens : (d.previa || []);
    lista.forEach(it => {
      const c = it.ctl || {}, txt = String(c.intercor || '').trim();
      if (dg(it.cnj).length !== 20) return;
      /* processo retido (adiado ou retirado de pauta): diligência até ser resolvido (incluído em nova sessão ou retirado) */
      const ret = /^adiad/i.test(it.resultado || '') ? 'adiado' : /^retirad/i.test(it.resultado || '') ? 'retirado de pauta' : '';
      if (ret && !String(c.retidoOk || '').trim()) abertas.set('ret:' + s.date + ':' + dg(it.cnj), { origem: 'retido', origemChave: 'ret:' + s.date + ':' + dg(it.cnj),
        title: ('Retido · ' + ret + ' · ' + (it.cnj || '') + (it.item ? ' · item ' + it.item : '')).slice(0, 200),
        description: 'Processo ' + ret + ' na sessão de ' + s.date.split('-').reverse().join('/') + ': incluir em nova sessão ou retirar.', assignee: String(it.servidor || ''), urgency: 'Alta', dueDate: '', numero: String(it.cnj || ''), sessao: s.date });
      if (!txt || String(c.intercorOk || '').trim()) return;
      const ti = c.intercorTipo === 'Chamado ao TI';
      abertas.set('int:' + s.date + ':' + dg(it.cnj), { origem: 'intercor', origemChave: 'int:' + s.date + ':' + dg(it.cnj),
        title: ('Intercorrência' + (c.intercorTipo ? ' (' + String(c.intercorTipo).toLowerCase() + ')' : '') + ' · ' + (it.cnj || '') + (it.item ? ' · item ' + it.item : '')).slice(0, 200),
        description: (txt + (ti && c.intercorChamado ? '\nChamado nº ' + c.intercorChamado : '')).slice(0, 2000), assignee: String(it.servidor || ''), urgency: 'Alta', dueDate: '', numero: String(it.cnj || ''), sessao: s.date });
    });
  });
  try {
    const { doc } = await FICHA.lerOpLeitura();
    (doc.registros || []).forEach(r => {
      const t = r.triagem || {}, p = r.producao || {}, pedido = String(t['Urgência'] || '').trim();
      if (!pedido || dg(r.processo).length !== 20) return;
      const chave = 'urg:' + dg(r.processo);
      const saiu = p.Assinado === 'Sim' || !!p['Data da Assinatura'] || !!p['Data da Liberação'];
      if (saiu) { travas[chave] = true; return; }
      if (APRECIADA.test(String(t['Urgência - Apreciação'] || ''))) return;
      abertas.set(chave, { origem: 'urgencia', origemChave: chave,
        title: ('Urgência · ' + pedido + ' · ' + (r.processo || '')).slice(0, 200),
        description: [String(t['Urgência - Nível'] || ''), String(t['Urgência - Observação'] || '')].filter(Boolean).join(' · ').slice(0, 2000),
        assignee: String(p.SERVIDOR || ''), urgency: 'Urgente', dueDate: '', numero: String(r.processo || ''), sessao: '' });
    });
  } catch (e) { /* sem ficha legível, só as intercorrências */ }
  return { abertas, travas };
}
/* escreve na origem o que o cartão passou a dizer */
async function naOrigem(alvo, b, u, done, descNova) {
  if (alvo.origem === 'intercor') {
    const parte = String(alvo.origemChave || '').split(':'), data = parte[1], cnj = parte[2];
    const campos = {};
    if (done !== null) campos.intercorOk = done ? hojeISO() : '';
    if (descNova != null) campos.intercor = descNova;
    if (!Object.keys(campos).length) return;
    const r = await require('./pauta').gravarItem(data, { cnj, campos }, u, L.gestor(u));
    if (r.status >= 400) { const e = new Error((r.body || {}).erro || 'não foi possível gravar na pauta'); e.status = r.status; throw e; }
    return;
  }
  if (alvo.origem === 'retido') {
    if (done === null) return;
    const parte = String(alvo.origemChave || '').split(':'), data = parte[1], cnj = parte[2];
    const r = await require('./pauta').gravarItem(data, { cnj, campos: { retidoOk: done ? hojeISO() : '' } }, u, L.gestor(u));
    if (r.status >= 400) { const e = new Error((r.body || {}).erro || 'não foi possível gravar na pauta'); e.status = r.status; throw e; }
    return;
  }
  if (alvo.origem === 'urgencia') {
    if (done === null) return;
    const cnj = String(alvo.origemChave || '').slice(4);
    if (done) {
      const sit = String((b || {}).situacao || '').trim();
      if (!APRECIADA.test(sit)) { const e = new Error('Informe como a urgência foi apreciada.'); e.status = 400; e.situacao = true; throw e; }
      await require('./_mono').gravarMono(cnj, { urgSit: sit }, u, L.gestor(u));
      return;
    }
    const { doc } = await FICHA.lerOpLeitura();
    const r = (doc.registros || []).find(x => dg(x.processo) === dg(cnj)) || {}, p = r.producao || {};
    if (p.Assinado === 'Sim' || p['Data da Assinatura'] || p['Data da Liberação']) {
      const e = new Error('Para reabrir esta urgência, reabra antes a monocrática: ela já foi liberada ou assinada.'); e.status = 409; throw e;
    }
    await require('./_mono').gravarMono(cnj, { urgSit: 'Pendente · não apreciada' }, u, L.gestor(u));
  }
}
async function ler() { try { return await L.lerJson(ARQ); } catch (e) { if (e.status === 404) return { dados: { schema: 'gabcmt.equipe.pendencias', versao: 1, registros: [] }, sha: undefined }; throw e; } }
function limpar(b, t) {
  CAMPOS.forEach(k => { if (k in b) t[k] = String(b[k] == null ? '' : b[k]).slice(0, k === 'description' ? 2000 : k === 'razao' ? 90 : 200).trim(); });
  if (!URG.includes(t.urgency)) t.urgency = 'Média'; if (!STAGES.includes(t.stage)) t.stage = 'todo';
  if (t.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)) t.dueDate = '';
  return t;
}
/* Encaminhamento de revisão: uma diligência ativa por processo; nunca transforma
   apontamentos em decisão judicial, urgência ou bloqueio. Sem texto da minuta. */
function prepararRevisao(b,reg,u,podeDesignar){
 const cnj=String(b.cnj||''),n=dg(cnj),p=reg.producao||{},t=reg.triagem||{};
 if(n.length!==20)throw Object.assign(Error('Processo inválido.'),{status:400});
 const assignee=String(b.assignee||u).trim();
 if(!assignee||(!podeDesignar&&L.norm(assignee)!==L.norm(u))||(podeDesignar&&![u,p.CORRETOR,p.SERVIDOR].filter(Boolean).some(v=>L.norm(v)===L.norm(assignee))))throw Object.assign(Error('Responsável não autorizado para esta revisão.'),{status:403});
 const raw=Array.isArray(b.apontamentos)?b.apontamentos:[],codes=Array.from(new Set(raw.filter(x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x)))).slice(0,40);
 const pd=String(t['O que falta sanar']||'').split(/\n+/).filter(x=>x.trim()&&!/^\s*✓/.test(x)).length;
 const ic=String(t.Intercorrências||'').split(/\n+/).filter(x=>x.trim()&&!/^\s*✓/.test(x)).length;
 if(!codes.length&&!pd&&!ic)throw Object.assign(Error('Nenhum apontamento ou pendência em aberto.'),{status:400});
 return {origem:'conformidade',origemChave:'rev:'+n,title:'Revisão de conformidade · '+cnj,description:['Conferir os apontamentos encaminhados no Corretor/Gerador e a ficha do processo.','Referências de conferência: '+(codes.join(', ')||'sem apontamentos selecionados')+'.','Pendências da ficha no encaminhamento: '+pd+'; intercorrências: '+ic+'.','A conclusão da diligência não resolve automaticamente sinalizações nem autoriza liberação.'].join('\n').slice(0,2000),assignee,urgency:'Média',dueDate:'',numero:cnj,sessao:'',stage:'todo',revisao:{codigos:codes,pendencias:pd,intercorrencias:ic}};
}
function revisaoAtiva(registros,chave){return (registros||[]).find(t=>!t.excluida&&t.origem==='conformidade'&&t.origemChave===chave&&t.stage!=='done');}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  /* login do Ex Officio ou o link próprio do relator (chave em x-cmt-chave ou ?k=, conferida com CMT_CHAVE) */
  const u = L.quem(req) || (require('./_cmt').porChave(req) ? (process.env.CMT_RELATOR || 'CM') : null);
  if (!u) return res.status(401).json({ erro: 'Entre com o seu nome e a sua senha.' });
  if (req.query && req.query.com) return require('./_comunicar')(req, res, u);
  try {
    if(req.query&&req.query.revisao){
      if(req.method==='GET'){const {dados}=await ler();return res.status(200).json({ok:true,tasks:(dados.registros||[]).filter(t=>!t.excluida&&t.origem==='conformidade'&&t.stage!=='done'&&L.norm(t.assignee)===L.norm(u)).map(t=>({id:t.id,title:t.title,numero:t.numero,stage:t.stage,atualizadoEm:t.atualizadoEm,creator:t.creator}))});}
      if(req.method!=='POST')return res.status(405).json({erro:'método não aceito'});
      const b=req.body||{},cnj=String(b.cnj||''),fonte=dg(cnj).length===20?await FICHA.fonteDe(cnj):null;
      if(!fonte||require('./_sigilo').sigiloDe(fonte))return res.status(403).json({erro:'Encaminhamento disponível apenas para processos identificados sem sigilo.'});
      const {doc}=await FICHA.lerOpLeitura(),reg=(doc.registros||[]).find(x=>dg(x.processo)===dg(cnj))||{},perfil=await L.acessos(u).catch(()=>({}));
      const novo=prepararRevisao(b,reg,u,L.gestor(u)||!!perfil.desembargador);
      for(let n=0;n<4;n++){const {dados,sha}=await ler();dados.registros=dados.registros||[];const ant=revisaoAtiva(dados.registros,novo.origemChave);
        if(ant)return res.status(200).json({ok:true,existente:true,task:ant});
        const agora=new Date().toISOString(),task=Object.assign({id:'pen-'+require('node:crypto').randomUUID(),creator:u,criadoEm:agora,_rev:1,atualizadoEm:agora,atualizadoPor:u},novo);dados.registros.push(task);dados.atualizadoEm=agora;
        try{await L.gravarJson(ARQ,dados,sha,'Revisão de conformidade ('+u+'): '+cnj);return res.status(200).json({ok:true,existente:false,task});}catch(e){if(e.status!==409&&e.status!==422)throw e;}
      }return res.status(409).json({erro:'O quadro mudou. Tente novamente.'});
    }
    if (req.method === 'GET') { const { dados } = await ler(); return res.status(200).json({ tasks: (dados.registros || []).filter(t => !t.excluida), equipe: L.equipe() }); }
    /* acerto dos cartões automáticos com as origens: cria o que falta, atualiza o texto, conclui o que a origem já resolveu */
    if (req.method === 'POST' && req.query.sync) {
      const { abertas, travas } = await origens();
      for (let n = 0; n < 4; n++) {
        const { dados, sha } = await ler(); dados.registros = dados.registros || [];
        const agora = new Date().toISOString(), mud = [];
        const por = new Map(); dados.registros.filter(t => !t.excluida && t.origemChave).forEach(t => por.set(t.origemChave, t));
        abertas.forEach((novo, chave) => {
          const t = por.get(chave);
          if (!t) {
            dados.registros.push(Object.assign({ id: 'pen-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              creator: '', criadoEm: agora, _rev: 1, atualizadoEm: agora, atualizadoPor: '' }, novo, { stage: 'todo' }));
            mud.push('nova diligência de ' + chave); return;
          }
          let m = false;
          if (t.title !== novo.title || t.description !== novo.description) { t.title = novo.title; t.description = novo.description; m = true; }
          if (t.stage === 'done') { t.stage = 'todo'; delete t.concluidaEm; m = true; mud.push('reaberta ' + chave); }
          if (m) { t._rev = Number(t._rev || 0) + 1; t.atualizadoEm = agora; }
        });
        por.forEach((t, chave) => {
          if (!['intercor','retido','urgencia'].includes(t.origem) || abertas.has(chave) || t.stage === 'done') return;
          t.stage = 'done'; t.concluidaEm = agora; t._rev = Number(t._rev || 0) + 1; t.atualizadoEm = agora; mud.push('concluída ' + chave);
        });
        const corpo = () => ({ tasks: dados.registros.filter(t => !t.excluida), equipe: L.equipe(), travas, acertos: mud.length });
        if (!mud.length) return res.status(200).json(corpo());
        dados.atualizadoEm = agora;
        try { await L.gravarJson(ARQ, dados, sha, 'Diligências automáticas: ' + mud.slice(0, 4).join('; ')); return res.status(200).json(corpo()); }
        catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
      }
      return res.status(409).json({ erro: 'O quadro mudou várias vezes seguidas; tente de novo.' });
    }
    for (let n = 0; n < 4; n++) {
      const { dados, sha } = await ler(); dados.registros = dados.registros || []; const agora = new Date().toISOString(); let msg, alvo;
      if (req.method === 'POST') {
        const b = req.body || {}; if (!String(b.title || '').trim()) return res.status(400).json({ erro: 'Informe o título da diligência.' });
        alvo = limpar(b, { id: 'pen-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), creator: u, criadoEm: agora, _rev: 1 });
        alvo.atualizadoEm = agora; alvo.atualizadoPor = u; dados.registros.push(alvo); msg = 'Diligência criada por ' + u + ': ' + alvo.title;
      } else if (req.method === 'PUT') {
        const b = req.body || {}; alvo = dados.registros.find(t => t.id === b.id && !t.excluida);
        if (!alvo) return res.status(404).json({ erro: 'diligência não encontrada' });
        if (b._rev != null && Number(b._rev) !== Number(alvo._rev || 0)) return res.status(409).json({ erro: 'Outra pessoa alterou esta diligência. Atualize o quadro.', task: alvo });
        const etapaAntes = alvo.stage, descAntes = alvo.description;
        limpar(b, alvo);
        if (alvo.origem) {
          const mudouEtapa = alvo.stage !== etapaAntes && (alvo.stage === 'done' || etapaAntes === 'done');
          const descNova = alvo.description !== descAntes ? alvo.description : null;
          if (mudouEtapa || descNova != null) {
            try { await naOrigem(alvo, b, u, mudouEtapa ? alvo.stage === 'done' : null, descNova); }
            catch (x) { return res.status(x.status || 500).json({ erro: x.message, situacao: !!x.situacao, task: alvo }); }
          }
        }
        alvo._rev = Number(alvo._rev || 0) + 1; alvo.atualizadoEm = agora; alvo.atualizadoPor = u;
        if (alvo.stage === 'done' && !alvo.concluidaEm) alvo.concluidaEm = agora; if (alvo.stage !== 'done') delete alvo.concluidaEm;
        msg = 'Diligência atualizada por ' + u + ': ' + alvo.title;
      } else if (req.method === 'DELETE') {
        alvo = dados.registros.find(t => t.id === req.query.id && !t.excluida);
        if (!alvo) return res.status(404).json({ erro: 'diligência não encontrada' });
        if (L.norm(alvo.creator) !== L.norm(u)) return res.status(403).json({ erro: 'Só quem criou a diligência pode excluí-la.' });
        alvo.excluida = true; alvo.atualizadoEm = agora; alvo.atualizadoPor = u; msg = 'Diligência excluída por ' + u + ': ' + alvo.title;
      } else return res.status(405).json({ erro: 'método não aceito' });
      dados.atualizadoEm = agora;
      try { await L.gravarJson(ARQ, dados, sha, msg); }
      catch (e) { if (e.status === 409 || e.status === 422) continue; throw e; }
      const relator = process.env.CMT_WA_RELATOR;
      const whatsapp = req.method === 'POST' && relator && L.norm(alvo.assignee) === L.norm(relator) &&
        /^Dúvida · /i.test(alvo.title) ? await require('./_alerta-wa').duvida(alvo.id) : 'nao_aplicavel';
      return res.status(200).json({ ok: true, task: alvo, whatsapp });
    }
    res.status(409).json({ erro: 'O quadro mudou várias vezes seguidas; tente de novo.' });
  } catch (e) { res.status([400,403,404,409].includes(e.status)?e.status:500).json({ erro: e.message }); }
};
