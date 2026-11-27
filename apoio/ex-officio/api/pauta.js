/* GET  /api/pauta?mono=1                      monocráticas (ver _mono.js)
   GET|POST /api/pauta?chegadas=1               chegadas ao gabinete vistas pela extensão na lista do PJe (só o gestor; ver _chegadas.js)
   GET  /api/pauta?data=AAAA-MM-DD            pauta da sessão (itens e pré-pauta)
   POST /api/pauta?data=AAAA-MM-DD  {cnj, lista, campos}   grava campos de um processo, num commit, com nova tentativa se o arquivo mudou;
                                                          o mesmo commit leva os campos à ficha do processo em acervo/operacional.json
   GET/POST /api/pauta?ficha=…                             ficha única do processo (ver _ficha.js)
   GET      /api/pauta?fichas=CNJ1,CNJ2,…                 resumo de vários processos (lista de tarefas do PJe na extensão)
   GET/POST /api/pauta?etiquetas=1                        catálogo de etiquetas do gabinete (POST: só o gestor)
   GET/POST /api/pauta?prontuario=…                        prontuário completo do processo, da extensão Muta (ver _prontuario.js)
   GET/POST /api/pauta?planilha=1                          planilhas do Google Drive, por token (ver _planilha.js) */
const L = require('./_lib'), FICHA = require('./_ficha');
const DIRETOS = ['dataMinuta', 'dataCorrecao', 'dataLiberacao', 'obs'];
const CTL = ['mpf', 'parecer', 'prelim', 'tempest', 'preparo', 'repres', 'midias', 'resJulg', 'consect', 'honor', 'topico', 'intercor', 'intercorOk', 'intercorTipo', 'intercorChamado', 'retidoOk', 'sopref'];
const GESTOR = ['servidor', 'corretor', 'resultado'];   /* designação e desfecho: só o gestor (CMT_GESTOR) */
const dg = s => String(s || '').replace(/\D/g, '');

/* Solicitações da sessão: leitura das fontes existentes, sem criar ou efetivar ocorrências. */
function diaSol(v) { const s=String(v||'').trim(),m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);return m?m[3]+'-'+m[2]+'-'+m[1]:/^\d{4}-\d{2}-\d{2}$/.test(s)?s:''; }
function solicitacoesSessao(data,dados,doc,pen,acervo){
  const itens=(dados.itens||[]).length?dados.itens:dados.previa||[], mapa=new Map(itens.map(i=>[dg(i.cnj),i]));
  const registros=(doc||{}).registros||[], ops=new Map(registros.map(r=>[dg(r.processo),r])), out=[];
  function vinculo(cnj,sessao,item){
    const i=mapa.get(dg(cnj)),r=ops.get(dg(cnj)),pa=r&&r.pauta||{},exp=diaSol(sessao);
    if(exp){if(exp!==data)return null;return {item:item||i&&i.item||'',inferido:false};}
    if(!i||diaSol(pa['Sessão original'])!==data)return null;
    return {item:i.item||'',inferido:true};
  }
  function add(r,v){if(!v)return;const a=acervo&&acervo[dg(r.cnj)],i=mapa.get(dg(r.cnj));if((a&&a.sigilo)||(i&&i.sigilo)){r.justificativa='';r.descricao='';r.resposta='';r.solicitante='';}out.push(Object.assign(r,v));}
  for(const r of registros){const cnj=r.processo;if(dg(cnj).length!==20)continue;let L=[];try{L=JSON.parse((r.origem||{})['Solicitações manuais']||'[]');}catch(e){}if(!Array.isArray(L))continue;
    for(const x of L){if(!x||!x.id||!x.tipo)continue;add({id:String(x.id),origem:'Ficha',cnj,tipo:x.tipo,estado:x.estado||'Pendente',solicitante:x.solicitante||x.autor||'',data:x.data||'',descricao:x.descricao||'',justificativa:x.justificativa||'',sessaoPretendida:x.sessaoPretendida||'',decididoPor:x.decididoPor||'',decididoEm:x.decididoEm||''},vinculo(cnj,x.sessaoOrigem,x.itemOrigem));}
  }
  for(const x of (pen||{}).registros||[]){if(!x||x.excluida||!/^Pedido de (retirada|adiamento)\b/i.test(String(x.title||''))||dg(x.numero).length!==20)continue;
    add({id:String(x.id),origem:'Deliberações',cnj:x.numero,tipo:/retirada/i.test(x.title)?'Retirada de pauta':'Adiamento',estado:x.stage==='done'?'Concluída':'Pendente',solicitante:x.creator||'',data:x.criadoEm||'',justificativa:x.razao||'',descricao:x.description||'',resposta:x.resposta||''},vinculo(x.numero,x.sessao,x.item));
  }
  return out.sort((a,b)=>Number(b.estado==='Pendente')-Number(a.estado==='Pendente')||String(b.data).localeCompare(String(a.data)));
}

/* grava campos de um processo da pauta; devolve {status, body}. gestorOk: pode designar e registrar o desfecho */
async function gravarItem(data, b, u, gestorOk, whatsappEvent) {
  const rel = 'acervo/sessoes/' + data + '.json', alvo = dg(b.cnj), C = b.campos || {};
  if (alvo.length !== 20) return { status: 400, body: { erro: 'número do processo inválido' } };
  for (let t = 0; t < 4; t++) {
    const { dados, sha } = await L.lerJson(rel);
    const lista = b.lista === 'previa' && !(dados.itens || []).length ? 'previa' : 'itens';
    const it = (dados[lista] || []).find(i => dg(i.cnj) === alvo);
    if (!it) return { status: 404, body: { erro: 'processo fora desta pauta' } };
    const mud = [];
    const designacoes = gestorOk ? ['servidor', 'corretor'].filter(k => k in C && L.norm(it[k]) !== L.norm(C[k]))
      .map(k => ({ papel: k === 'servidor' ? 'minuta' : 'correção', de: it[k] || '', para: String(C[k] || '') })) : [];
    if (whatsappEvent) {
      it.ctl = it.ctl || {};
      const eventos = it.ctl.whatsappLiberacoes || [];
      if (eventos.includes(whatsappEvent)) return { status: 200, body: { ok: true, item: it, semMudanca: true } };
      if (!it.dataCorrecao || it.dataLiberacao || (it.ctl.intercor && !it.ctl.intercorOk)) {
        return { status: 409, body: { erro: 'O item não está disponível para liberação.' } };
      }
      it.ctl.whatsappLiberacoes = [...eventos.slice(-19), whatsappEvent];
    }
    DIRETOS.forEach(k => { if (k in C && it[k] !== String(C[k] || '')) { it[k] = String(C[k] || ''); mud.push(k); } });
    if (gestorOk) GESTOR.forEach(k => { if (k in C && it[k] !== String(C[k] || '')) { it[k] = String(C[k] || ''); mud.push(k); } });
    it.ctl = it.ctl || {};
    CTL.forEach(k => { if (k in C) { const v = String(C[k] || ''); if ((it.ctl[k] || '') !== v) { if (v) it.ctl[k] = v; else delete it.ctl[k]; mud.push(k); } } });
    if (C.cartao && typeof C.cartao === 'object') { const ant = it.ctl.cartao || {}; Object.keys(C.cartao).forEach(k => { if (JSON.stringify(ant[k]) !== JSON.stringify(C.cartao[k])) { ant[k] = C.cartao[k]; mud.push('cartao.' + k); } }); it.ctl.cartao = ant; }
    if (!mud.length) return { status: 200, body: { ok: true, item: it, semMudanca: true } };
    it.ctl.editadoPor = u; it.ctl.editadoEm = new Date().toISOString();
    if (designacoes.length) {
      it.ctl.historicoDesignacoes = (it.ctl.historicoDesignacoes || []).concat({
        em: it.ctl.editadoEm, por: u, alteracoes: designacoes,
      }).slice(-20);
    }
    dados.atualizadoEm = it.ctl.editadoEm;
    /* o que a equipe registra vai também para a ficha do processo (acervo/operacional.json), no mesmo commit */
    const Cf = Object.assign({}, C); if (!gestorOk) GESTOR.forEach(k => delete Cf[k]);
    /* Uma pré-pauta não pode afirmar ingresso ou desfecho oficial na ficha. */
    if(lista==='previa')delete Cf.resultado;
    try { await FICHA.espelho({ path: rel, txt: JSON.stringify(dados, null, 1) + '\n', sha }, it.cnj, Cf, C.cartao, 'Ex Officio (' + u + '): ' + it.cnj + ' · ' + mud.slice(0, 6).join(', '),u); return { status: 200, body: { ok: true, item: it } }; }
    catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
  }
  return { status: 409, body: { erro: 'A pauta mudou várias vezes seguidas; tente de novo.' } };
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  /* planilhas do Google (Apps Script): autenticação própria, por token (ver _planilha.js) */
  if (req.query.planilha) return require('./_planilha')(req, res);
  /* a ficha do processo também abre, só para leitura, pelo link próprio do painel do Desembargador (chave CMT_CHAVE) */
  const pelaChave = req.query.ficha && req.method === 'GET' && !L.quem(req) && require('./_cmt').porChave(req);
  /* e pelo link de consulta do Cognitio (cookie cmt_cons): só a leitura da ficha de um processo */
  const consulta = !pelaChave && req.query.ficha && req.method === 'GET' && !L.quem(req) ? await L.quemConsulta(req).catch(() => null) : null;
  const u = pelaChave ? (process.env.CMT_RELATOR || 'CM') : consulta ? consulta.usuario : L.exigir(req, res); if (!u) return;
  if (consulta) return FICHA(req, res, u);
  if (req.query.mono) return require('./_mono')(req, res, u);
  if (req.query.fichas) return FICHA.resumos(req, res, u);
  if (req.query.etiquetas) return FICHA.etiquetasGab(req, res, u);
  if (req.query.chegadas) return require('./_chegadas')(req, res, u);
  if (req.query.ficha) return FICHA(req, res, u);
  if (req.query.prontuario) return require('./_prontuario')(req, res, u);
  if (req.query.sigilo) return require('./_sigilo')(req, res, u, FICHA.fonteDe);
  if (req.query.metas) return require('./_metas')(req, res, u);
  if (req.query.sobr) return require('./_sobr')(req, res, u);
  if (req.query.sens) return require('./_sens')(req, res, u);
  const data = req.query.data; if (!L.dataOk(data)) return res.status(400).json({ erro: 'data inválida' });
  const rel = 'acervo/sessoes/' + data + '.json';
  try {
    /* só as pautas que o Monitor publicou para a equipe */
    /* leitura: calendário, pauta e acervo (marca de sigilo) em paralelo */
    if (req.method === 'GET') {
      const [calR, docR, A] = await Promise.all([L.lerJson('acervo/sessoes/calendario.json'), L.lerJson(rel).catch(e => ({ erro: e })), require('./_mono').acervo().catch(() => null)]);
      const cal = calR.dados;
      if (!(cal.sessoes || []).some(s => s.date === data && s.publicada)) return res.status(403).json({ erro: 'Esta pauta ainda não foi publicada para a equipe.' });
      if (docR.erro) throw docR.erro;
      const dados = docR.dados;
      /* importado o PDF, a pauta é fixa: a pré-pauta deixa de existir para a equipe */
      if ((dados.itens || []).length) dados.previa = [];
      /* sigilo vem do acervo (fonte.json): só na resposta, o arquivo da sessão não muda */
      /* do acervo, só na resposta: prioridade legal, urgência pelas etiquetas, tarefa atual e entrada nela (indicadores da matriz da pauta) */
      if (A) ['itens', 'previa'].forEach(k => (dados[k] || []).forEach(i => { const b = A.base[dg(i.cnj)]; if (!b) return; if (b.sigilo) i.sigilo = b.sigilo;
        const ac = {}; if (b.prioridade) ac.prioridade = b.prioridade; if (b.urgAuto) ac.urgencia = b.urgAuto; if (b.tarefa) ac.tarefa = b.tarefa; if (b.desde) ac.desde = b.desde; if (Object.keys(ac).length) i.acervo = ac; }));
      if(req.query.solicitacoes){
        try{const [op,pen]=await Promise.all([FICHA.lerOpLeitura(),L.lerJson('apoio/equipe-pendencias.json').catch(e=>{if(e.status===404)return {dados:{registros:[]}};throw e;})]);
          dados.solicitacoes=solicitacoesSessao(data,dados,op.doc,pen.dados,A&&A.base);
        }catch(e){dados.solicitacoesErro='Não foi possível consultar as solicitações internas da sessão.';}
      }
      return res.status(200).json(dados); }
    const cal = (await L.lerJson('acervo/sessoes/calendario.json')).dados;
    if (!(cal.sessoes || []).some(s => s.date === data && s.publicada)) return res.status(403).json({ erro: 'Esta pauta ainda não foi publicada para a equipe.' });
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const r = await gravarItem(data, req.body || {}, u, L.gestor(u));
    res.status(r.status).json(r.body);
  } catch (e) { res.status(e.status === 404 ? 404 : 500).json({ erro: e.message }); }
};
module.exports.gravarItem = gravarItem;

module.exports.solicitacoesSessao = solicitacoesSessao;
