/* Amicus Curiae · Collectio: duas páginas com o mesmo arquivo e a mesma base de lotes.
     /amicus/collectio/      página geral: a equipe vê os processos visíveis para ela; o Desembargador (perfil desembargador
                             ou link próprio com a chave) vê, na mesma página, só os processos liberados para ele
     /amicus/collectio/cg/   controle e gestão (só o gestor, &modo=cg): todos os processos, criar e editar lotes, sessões e visibilidade
   /amicus/collectio/cmt/ (antiga página do Desembargador) e /amicus/collectio/gc/ continuam abrindo, só como compatibilidade.
   O nome visual permanece "Index". /index/*, /lotes/, /cmt/lotes/ e /cg/lotes/ permanecem apenas como compatibilidade.
   Acesso: login do Ex Officio (cookie cmt_eq) ou o link próprio do relator (chave em x-cmt-chave ou ?k=, conferida com CMT_CHAVE).
   Servido pelo /api/painel?lote=1 (a Vercel no plano Hobby aceita no máximo 12 funções; este arquivo, com _, não conta como função).
   Leitura (equipe, gestor e relator):
   GET  ?lote=1                                lotes (acervo/lotes/*.json) e, para o gestor, o calendário das sessões
   GET  ?lote=1&id=2886                        o lote (matriz, perfis e painel), com o cartão do prontuário de cada processo
                                               tirado, na hora, da sessão em acervo/sessoes/AAAA-MM-DD.json
   GET  ?lote=1&id=2886&minuta=X               a minuta do processo X (10 primeiros caracteres do número): acervo/minutas/<id>/X.json
   Com &rel=1 (página do relator, /cmt/lotes/), a resposta é sempre a do relator, qualquer que seja o login.
   O relator (link próprio, perfil desembargador ou &rel=1) só recebe os processos prontos: situação Corrigida ou Liberada, a mais
   adiantada entre a do lote e a do Ex Officio (dataCorrecao/dataLiberacao na sessão). Os que estão por fazer ou por corrigir
   não chegam a ele, nem a minuta deles.
   Visibilidade por processo (it.visivel, definida na gestão): equipe:false tira o processo da página da equipe;
   relator:true mostra ao relator mesmo antes de pronto, relator:false nunca mostra; sem relator, vale a regra do "pronto".
   Gestão (só o gestor, com login):
   GET  ?lote=1&previa=1&sessoes=A,B&assunto=&classe=&texto=   prévia: quantos processos das sessões entram pelo filtro
   POST ?lote=1 {acao:'criar', id, titulo, descricao, sessoes, filtro}   cria acervo/lotes/<id>.json com os processos das sessões
   POST ?lote=1 {acao:'sessoes', id, sessoes}  associa e desassocia sessões: entram os processos das novas sessões que passam
                                               no filtro do lote; saem os das sessões retiradas; os demais ficam como estão.
                                               Os que saem ficam guardados em lote.retirados, com tudo o que já foi registrado,
                                               e voltam iguais se a sessão for associada de novo
   POST ?lote=1 {acao:'editar', id, titulo, descricao, filtro, visivel}  título, descrição, filtro e visibilidade do lote inteiro
                                               (visivel {equipe, relator}: false tira o lote do seletor e da página da equipe ou do relator)
   POST ?lote=1 {acao:'substituir', id, de, para, processos:[X]}   troca um trecho em várias minutas do lote (acervo/minutas/<id>/X.json),
                                               num só commit; o trecho casa ignorando espaços, aspas e travessões; cada minuta
                                               alterada guarda a edição em "edicoes". Não mexe no PJe: só na cópia do painel de lotes.
   POST ?lote=1 {acao:'visivel', id, itens:[{sessao, processo, equipe, relator}]}   visibilidade (relator: 'auto', true ou false) */
const L = require('./_lib');
const ID = /^[a-z0-9-]{1,40}$/i, PROC = /^\d{7}-\d{2}$/, DATA = /^\d{4}-\d{2}-\d{2}$/;
const nada = e => { if (e.status === 404) return { dados: null }; throw e; };
/* lotes podem passar de 1 MB (teor dos processos): leitura pelo texto cru */
const gravarLote = (rel, dados, sha, msg) => sha && L.commitArquivos ? L.commitArquivos([{ path: rel, txt: JSON.stringify(dados, null, 1) + '\n', sha }], msg) : L.gravarJson(rel, dados, sha, msg);
const lerLote = async rel => { if (!L.lerGrande) return L.lerJson(rel); const { txt, sha } = await L.lerGrande(rel); return { dados: JSON.parse(txt), sha }; };
const sem = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CORES = ['#2f6db5', '#7a5cc2', '#1f8a70', '#c07a12', '#b8562f', '#3a4a5c', '#8a5a9e', '#4f7f3a'];
const ENT = /UNI[ÃA]O|INSS|INSTITUTO NACIONAL|BANCO CENTRAL|FUNDA[CÇ][AÃ]O|CAIXA ECON|EMPRESA BRASILEIRA|CONSELHO|AG[ÊE]NCIA|UNIVERSIDADE|FAZENDA/i;
/* M: memória de uma requisição (cada sessão e o calendário são lidos uma vez só, mesmo com vários lotes) */
const memoria = () => ({ sessoes: new Map(), cal: null });
/* O PDF da pauta repete, no alto de cada página, "Sessão de Julgamento ORDINÁRIA … de AAAA às HH:MM"; quando a quebra de página
   cai no meio de um processo, esse cabeçalho grudava no assunto, nas partes ou na classe (e a matriz ganhava grupos-fantasma).
   limpaPauta tira o cabeçalho e corrige "LL 8.622" (Lei) na leitura, sem alterar os arquivos da sessão. */
const CAB_SESSAO = /\s*Sess[aã]o de Julgamento\s+(?:ORDIN|EXTRAORDIN|VIRTUAL|PRESENCIAL|TELEPRESENCIAL)[\s\S]{0,220}?\d{4}\s+[àa]s\s+\d{1,2}[:h]\d{2}/gi;
const limpaPauta = t => String(t || '').replace(CAB_SESSAO, ' ').replace(/\bLL\s+(?=\d)/g, 'Lei ').replace(/\s+/g, ' ').trim();
const limpaItemPauta = x => x && typeof x === 'object' ? Object.assign({}, x, { assunto: limpaPauta(x.assunto), partes: limpaPauta(x.partes), classe: limpaPauta(x.classe) }) : x;
function limpaLote(lote) {
  (lote.itens || []).forEach(it => { for (const k of ['assunto', 'assunto_pauta', 'tipo_caso', 'partes', 'exequente', 'executado', 'recurso']) if (typeof it[k] === 'string') it[k] = limpaPauta(it[k]); });
  (lote.grupos || []).forEach(g => { if (typeof g.rotulo === 'string') g.rotulo = limpaPauta(g.rotulo); });
  return lote;
}
async function itensSessao(s, M) {
  if (!DATA.test(s)) return [];
  if (M && M.sessoes.has(s)) return M.sessoes.get(s);
  const p = L.lerJson('acervo/sessoes/' + s + '.json').catch(nada)
    .then(({ dados }) => dados ? (Array.isArray(dados) ? dados : (dados.itens || dados.processos || [])) : [])
    .then(lista => lista.map(limpaItemPauta));
  if (M) M.sessoes.set(s, p);
  return p;
}
function passa(x, f) {
  f = f || {};
  if (f.assunto && !sem(x.assunto).includes(sem(f.assunto))) return false;
  if (f.classe && !sem(x.classe).includes(sem(f.classe))) return false;
  if (f.texto && !sem([x.assunto, x.classe, x.partes, x.obs, x.cnj].join(' ')).includes(sem(f.texto))) return false;
  return true;
}
/* trecho → expressão regular: espaços quaisquer entre as palavras, aspas e travessões de qualquer tipo (o mesmo da página) */
function rxTrecho(de) {
  const t = String(de || '').trim().split(/\s+/).filter(Boolean).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/["“”«»]/g, '["“”«»]').replace(/['‘’`´]/g, "['‘’`´]").replace(/[–—]|-(?![^\[]*\])/g, '[-–—]'));
  return new RegExp(t.join('\\s+'), 'g');
}
function situacao(x) { return x.dataLiberacao ? 'Liberada' : x.dataCorrecao ? 'Corrigida' : x.dataMinuta ? 'Minutada' : 'A minutar'; }
const ORDEM = { 'A minutar': 1, 'Minutada': 2, 'Corrigida': 3, 'Liberada': 4 };
/* Designação (minutante e corretor): a fonte única é a pauta (acervo/sessoes/AAAA-MM-DD.json), gravada pelo Ex Officio e
   pela mesa de designação. O lote guarda só a cópia feita quando foi criado; em toda leitura ela é trocada pela da pauta.
   Ordem de busca: a sessão do próprio item; as demais sessões do lote; para lotes sem sessão (triagem, avulsos), a pauta
   ainda não realizada mais próxima em que o processo está. Pauta já realizada não designa processo de outro lote. */
const nomeEq = v => { const s = String(v || '').trim(); return s === '—' || s === '-' ? '' : s; };
const hojeLocal = () => new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
function designacaoDe(s, x) {
  const h = ((x.ctl || {}).historicoDesignacoes || []).slice(-3).map(r => ({ em: r.em || '', por: r.por || '', alteracoes: r.alteracoes || [] }));
  return { sessao: s, item: x.item, minuta: nomeEq(x.servidor), correcao: nomeEq(x.corretor), historico: h };
}
function designar(e, d) {
  const ant = { minuta: nomeEq(e.minuta), correcao: nomeEq(e.correcao) };
  e.minuta = d.minuta; e.correcao = d.correcao;
  e.fonte = { sessao: d.sessao, item: d.item };
  if (d.historico.length) e.historico = d.historico; else delete e.historico;
  if ((ant.minuta && sem(ant.minuta) !== sem(d.minuta)) || (ant.correcao && sem(ant.correcao) !== sem(d.correcao))) e.copia_lote = ant;
  else delete e.copia_lote;
}
/* situação de cada processo: a mais adiantada entre a do lote e a do Ex Officio; marca "pronto" (corrigido ou liberado);
   aplica a designação da pauta e devolve os cartões do prontuário lidos das sessões do lote */
async function anotar(lote, M) {
  M = M || memoria();
  const cartoes = {}, vivo = {}, porSessao = {}, futura = {}, assPauta = {};
  const proprias = lote.sessoes || [], hoje = hojeLocal();
  const outras = (await calendarioM(M)).filter(z => z.processos && z.date >= hoje && !proprias.includes(z.date)).map(z => z.date).sort();
  await Promise.all(proprias.map(async s => (await itensSessao(s, M)).forEach(x => {
    vivo[x.cnj] = situacao(x);
    if (x.assunto && !assPauta[x.cnj]) assPauta[x.cnj] = x.assunto;
    porSessao[s + '|' + x.cnj] = porSessao[x.cnj] = porSessao[x.cnj] || designacaoDe(s, x);
    const c = x && x.ctl; if (!c || !c.cartao) return;
    cartoes[x.cnj] = { cartao: c.cartao, editadoPor: c.editadoPor || '', editadoEm: c.editadoEm || '' };
  })));
  const fora = (lote.itens || []).filter(it => !porSessao[it.processo]);
  if (fora.length && outras.length) {
    const lidas = await Promise.all(outras.map(s => itensSessao(s, M)));
    outras.forEach((s, k) => lidas[k].forEach(x => { if (!futura[x.cnj]) futura[x.cnj] = designacaoDe(s, x); }));
  }
  (lote.itens || []).forEach(it => {
    const e = it.equipe = it.equipe || {}, sv = vivo[it.processo];
    const d = (it.sessao && porSessao[it.sessao + '|' + it.processo]) || porSessao[it.processo] || futura[it.processo];
    if (d) designar(e, d);
    if (sv && (ORDEM[sv] || 0) > (ORDEM[e.situacao] || 0)) e.situacao = sv;
    it.pronto = (ORDEM[e.situacao] || 0) >= 3;
    /* hierarquia do caso: Assunto (PJe) › Subassunto › Especificidades. O assunto do PJe vem da pauta quando o lote não o guarda. */
    if (!it.assunto && assPauta[it.processo]) it.assunto_pauta = assPauta[it.processo];
    const v = it.visivel || {};
    it.verEquipe = v.equipe !== false;
    it.verRelator = v.relator === true || (v.relator !== false && it.pronto);
  });
  return cartoes;
}
function novoItem(s, x) {
  const p = String(x.partes || '').split(/\s+x\s+/i), ex = p.find(n => !ENT.test(n)) || p[0] || '', en = p.find(n => n !== ex) || '';
  const c = (x.ctl || {});
  return {
    sessao: s, item: Number(x.item) || x.item, processo: x.cnj, recurso: String(x.classe || '').replace(/^\w+ - /, '') || 'Apelação',
    partes: x.partes || '', exequente: ex, executado: en, assunto: x.assunto || '', grupo: null, tipo_caso: x.assunto || '',
    resultado: x.resultado || c.resJulg || '', modelo: '', variacoes: [], observacao: x.obs || '', peculiaridades: '', peculiaridades_relator: '',
    orientacao: '', equipe: { minuta: x.servidor || '', correcao: x.corretor || '', situacao: situacao(x) }, pecas: [], mpf: '', triagem: {},
    ajustes: [], pendencias: [], minuta: false
  };
}
/* lote novo: os assuntos viram os grupos da matriz quando são poucos (até 8); com mais, tudo fica num grupo só */
function agrupar(lote) {
  if ((lote.grupos || []).length) return;
  const as = [...new Set(lote.itens.map(i => i.assunto).filter(Boolean))];
  if (as.length >= 1 && as.length <= CORES.length) {
    lote.grupos = as.map((a, i) => ({ id: 'g' + (i + 1), rotulo: a, cor: CORES[i], resultado: '' }));
    lote.itens.forEach(i => { const g = lote.grupos.find(x => x.rotulo === i.assunto); if (g) i.grupo = g.id; });
  }
}

/* Índices de pauta: projeção da sessão, sem copiar ou modificar os processos.
   Grupos por assunto são o agrupamento inicial para casos/modelos correlatos. */
function tipoLote(l) { if (l.tipo === 'triagem') return 'triagem'; return l.tipo === 'pauta' && (l.sessoes || []).length === 1 ? 'pauta' : 'avulso'; }
function idPauta(s) { return 'pauta-' + s; }
function rotuloAssunto(x) {
  return String(x.assunto || x.classe || 'Sem assunto informado').trim().replace(/\s+/g,' ').slice(0,130);
}
async function indicePauta(s) {
  const base=await itensSessao(s), itens=base.map(x=>novoItem(s,x));
  const lot={schema:'gabcmt.lote',versao:1,tipo:'pauta',virtual:true,id:idPauta(s),
    titulo:'Matriz geral da sessão · '+s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4),
    descricao:'Indexação inicial da pauta por assunto e casos/modelos correlatos.',
    sessoes:[s],filtro:{},colunas:[],grupos:[],
    grupo_outros:{rotulo:'Outros',cor:'#5d6b72'},itens};
  const assuntoMap=new Map(), grouped=new Map();
  for (const it of itens) {
    const assunto=rotuloAssunto(it);const chave=sem(assunto);
    if(!grouped.has(chave))grouped.set(chave,{nome:assunto,itens:[]});
    grouped.get(chave).itens.push(it);
  }
  const grupos=[...grouped.values()].sort((a,b)=>b.itens.length-a.itens.length||a.nome.localeCompare(b.nome,'pt-BR'));
  grupos.forEach((g,k)=>{const id='assunto-'+(k+1);lot.grupos.push({id,rotulo:g.nome,cor:CORES[k%CORES.length],resultado:'',modelo:''});g.itens.forEach(it=>{it.grupo=id;it.tipo_caso=g.nome;});});
  return lot;
}

/* Na Coleção de Pauta, uma sessão é fonte de processos, nunca uma coleção individual. */
function agruparPorAssunto(lote) {
  const grupos = new Map();
  for (const item of lote.itens || []) {
    const nome = rotuloAssunto(item), chave = sem(nome);
    if (!grupos.has(chave)) grupos.set(chave, { nome, itens: [] });
    grupos.get(chave).itens.push(item);
  }
  lote.grupos = [];
  [...grupos.values()].sort((a,b)=>b.itens.length-a.itens.length||a.nome.localeCompare(b.nome,'pt-BR'))
    .forEach((g,k)=>{
      const id = 'assunto-' + (k+1);
      lote.grupos.push({ id, rotulo:g.nome, cor:CORES[k%CORES.length], resultado:'', modelo:'' });
      g.itens.forEach(item=>{ item.grupo=id; item.tipo_caso=g.nome; });
    });
}
async function calendario() {
  const { dados } = await L.lerJson('acervo/sessoes/calendario.json').catch(nada);
  return ((dados && dados.sessoes) || []).map(s => ({ date: s.date, nome: s.nome, processos: s.processos || 0, publicada: !!s.publicada }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
function calendarioM(M) { if (!M.cal) M.cal = calendario(); return M.cal; }
/* Rascunho de minuta montado do prontuário (cartão do Ex Officio ou da triagem) e do teor registrados no lote.
   Só o relatório sai composto, e só com o que está registrado; voto e ementa ficam marcados para minutar.
   Nada é presumido: o que falta vai como [VALIDAR]. A minuta completa segue o modelo-matriz do tipo de julgamento. */
function rascunhoMinuta(lote, it, u) {
  const P = (it.prontuario && it.prontuario.cartao) || (it.prontuario_triagem && it.prontuario_triagem.cartao) || {};
  const T = it.teor || {}, tri = it.triagem || {}, rel = P.rel || {}, orig = P.orig || {};
  const pecas = Array.isArray(P.pecas) ? P.pecas : [];
  const ids = rx => pecas.filter(p => rx.test(String(p.desc || ''))).map(p => p.id).filter(Boolean);
  const lista = v => { const a = [...new Set(v)]; return a.length > 1 ? 'ID’s ' + a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1] : 'ID ' + a[0]; };
  const tipo = P.tipoJ || it.recurso || 'Agravo de Instrumento', ai = /agravo de instrumento/i.test(tipo) || /^AI\b/.test(it.tipo_caso || '');
  const semPonto = s => String(s || '').trim().replace(/[.;]\s*$/, '');
  const minus = s => { s = semPonto(s); return s ? s.charAt(0).toLowerCase() + s.slice(1) : ''; };
  const razoes = semPonto(String(rel.razoes || T.recurso || '').replace(/^[^:]{0,80}\):\s*|^[^:(]{0,60}:\s*/, ''));
  /* enumeração no padrão: o último item vem com "e" — (1) …; (2) …; e (3) … */
  const fechaEnum = t => /\(2\)/.test(t) && !/;\s*e\s*\(\d+\)(?!.*\(\d+\))/.test(t) ? t.replace(/;\s*\((\d+)\)(?!.*\(\d+\))/, '; e ($1)') : t;
  const recorr = ((P.recursos || [])[0] || {}).parte || '[VALIDAR: parte recorrente]';
  const recId = ((P.recursos || [])[0] || {}).id || (ids(/^agravo de instrumento|^apela|^recurso/i)[0]) || '';
  const relatorio = [];
  if (ai) relatorio.push('Trata-se de agravo de instrumento à decisão' + (orig.id ? ' (ID ' + orig.id + ', origem)' : '') + ' que, ' + (tri.origem ? 'nos autos ' + semPonto(tri.origem) + ', ' : '') + (minus(orig.dispositivo) || '[VALIDAR: dispositivo da decisão agravada]') + '.');
  else relatorio.push('Trata-se de ' + String(tipo).toLowerCase() + (orig.id ? ' à decisão (ID ' + orig.id + ')' : '') + ' que ' + (minus(orig.dispositivo) || '[VALIDAR: dispositivo]') + '.');
  relatorio.push((ai ? 'Agravou ' : 'Recorreu ') + recorr + (recId ? ' (ID ' + recId + ')' : '') + ', alegando, em suma: ' + (fechaEnum(razoes) || '[VALIDAR: razões]') + '.');
  const resp = ids(/contraminuta|contrarraz/i);
  relatorio.push(resp.length ? 'Houve ' + (ai ? 'contraminuta' : 'contrarrazões') + ' (' + lista(resp) + ').' : '[VALIDAR: ' + (ai ? 'contraminuta' : 'contrarrazões') + ' — não registrada no prontuário]');
  const mpf = P.mpfx || {};
  if (mpf.id) relatorio.push('O Ministério Público Federal manifestou-se (ID ' + mpf.id + ')' + (mpf.sentido ? ', [VALIDAR: sentido — ' + mpf.sentido + ']' : '') + '.');
  relatorio.push('É o relatório.');
  const ato = tri.ato || String(it.resultado || '').replace(/^Ato a proferir:\s*/i, '') || '[VALIDAR: ato a proferir]';
  return {
    schema: 'gabcmt.minuta', versao: '1', lote: lote.id, processo: it.processo, sessao: it.sessao || '', item: it.sessao ? String(it.item) : '',
    padrao: 'rascunho', origem: 'Rascunho gerado no Collectio por ' + u + ' em ' + new Date().toISOString().slice(0, 10).split('-').reverse().join('/') + ', a partir do prontuário registrado no lote. Voto e ementa a minutar pelo modelo-matriz.',
    pendencias: ['Conferir cada ID e cada fato do relatório nos autos', 'Minutar o voto: ' + ato, 'Redigir a ementa (Recomendação CNJ 154/2024 adaptada)'].concat(String(P.questoes || '') ? ['Questões: ' + P.questoes] : []),
    secoes: { relatorio, voto: ['[Minutar o voto pelo modelo-matriz do tipo de julgamento: ' + semPonto(ato) + '.]'], ementa: ['[Redigir a ementa após o voto.]'], acordao: [] }
  };
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const CMT = require('./_cmt');
  const q = req.query || {};
  const login = L.quem(req);
  /* A rota escolhe a visão, mas não concede acesso. Link do relator usa CMT_CHAVE como credencial. */
  const u = login || (CMT.porChave(req) ? (process.env.CMT_RELATOR || 'CM') : null);
  if (!u) return res.status(401).json({ erro: 'Entre com o seu nome e a sua senha.' });
  const gestor = !!(login && L.gestor(login)), M = memoria();
  try {
    if (req.method === 'POST') return await gravar(req, res, login, gestor);
    if (req.method !== 'GET') return res.status(405).json({ erro: 'método não aceito' });
    const id = String(q.id || '');
    const perfilRel = !gestor && (!login || (await L.acessos(login)).perfil === 'desembargador');
    const modo = q.rel || perfilRel ? 'rel' : q.modo === 'cg' ? 'cg' : 'eq', relator = modo === 'rel';
    if (modo === 'cg' && !gestor) return res.status(403).json({ erro: 'Esta página é só do gestor.' });
    const loteVe = l => { const v = (l && l.visivel) || {}; return modo === 'cg' || (modo === 'rel' ? v.relator !== false : v.equipe !== false); };
    const ve = it => modo === 'rel' ? it.verRelator : modo === 'eq' ? it.verEquipe : true;
    if (q.previa) {
      if (!gestor) return res.status(403).json({ erro: 'Só o gestor cria lotes.' });
      const ss = String(q.sessoes || '').split(',').filter(s => DATA.test(s)), f = { assunto: q.assunto, classe: q.classe, texto: q.texto };
      const porSessao = {}, amostra = [];
      for (const s of ss) { const it = (await itensSessao(s)).filter(x => passa(x, f)); porSessao[s] = it.length; it.slice(0, 40).forEach(x => amostra.push({ sessao: s, item: x.item, processo: x.cnj, assunto: x.assunto })); }
      return res.status(200).json({ total: Object.values(porSessao).reduce((a, b) => a + b, 0), porSessao, amostra: amostra.slice(0, 60) });
    }
    if (!id) {
      const lista = await L.gh('/contents/acervo/lotes?ref=main').catch(e => (e.status === 404 ? [] : Promise.reject(e)));
      const lotes = [];
      for (const f of (Array.isArray(lista) ? lista : []).filter(f => /^[a-z0-9-]+\.json$/i.test(f.name))) {
        const { dados } = await lerLote('acervo/lotes/' + f.name).catch(nada);
        if (!dados || !loteVe(dados)) continue;
        if (modo !== 'cg') await anotar(dados, M);
        lotes.push({ id: dados.id, titulo: dados.titulo, descricao: dados.descricao, tipo:tipoLote(dados), sessao:tipoLote(dados)==='pauta'?dados.sessoes[0]:null,
          sessoes: dados.sessoes, tarefa: dados.tarefa || null, filtro: dados.filtro || null, visivel: modo === 'cg' ? (dados.visivel || {}) : undefined, total: (dados.itens || []).filter(ve).length });
      }
      const agenda = await calendario();
      const sessoes = agenda.filter(s => gestor || s.publicada);
      /* Lotes são os registros salvos; sessões não são inseridas na lista de coleções. */
      lotes.sort((a,b)=>(a.tipo==='pauta'?0:1)-(b.tipo==='pauta'?0:1)||
        String(b.sessao||'').localeCompare(String(a.sessao||''))||
        String(a.titulo).localeCompare(String(b.titulo),'pt-BR'));
      return res.status(200).json({ usuario:u, gestor, relator, modo,
        lotes, sessoes, calendario:modo==='cg'?agenda:[],
        colecoes:{avulsas:lotes.filter(l=>l.tipo==='avulso'),pauta:{sessoes,lotes:lotes.filter(l=>l.tipo==='pauta')},triagem:lotes.filter(l=>l.tipo==='triagem')} });
    }
    if (!ID.test(id)) return res.status(400).json({ erro: 'lote inválido' });
    const mx = String(q.minuta || '');
    if (mx) {
      if (!PROC.test(mx)) return res.status(400).json({ erro: 'processo inválido' });
      if (modo !== 'cg') {
        const { dados: lt } = await lerLote('acervo/lotes/' + id + '.json').catch(nada);
        if (!lt || !loteVe(lt)) return res.status(404).json({ erro: 'Lote não encontrado.' });
        await anotar(lt, M);
        const it = lt && (lt.itens || []).find(i => String(i.processo).slice(0, 10) === mx);
        if (!it || !ve(it)) return res.status(404).json({ erro: relator ? 'Minuta ainda em preparo.' : 'Minuta não disponível para este processo.' });
      }
      const { dados } = await L.lerJson('acervo/minutas/' + id + '/' + mx + '.json').catch(nada);
      if (!dados) return res.status(404).json({ erro: 'Minuta não disponível para este processo.' });
      return res.status(200).json(dados);
    }
    const sessaoVirtual=/^pauta-(\d{4}-\d{2}-\d{2})$/.exec(id);
    const { dados: persistido } = await lerLote('acervo/lotes/' + id + '.json').catch(nada);
    const lote = persistido || (sessaoVirtual && (await calendario()).some(z=>z.date===sessaoVirtual[1]&&(gestor||z.publicada)) ? await indicePauta(sessaoVirtual[1]) : null);
    if (!lote || !loteVe(lote)) return res.status(404).json({ erro: 'Lote não encontrado.' });
    /* cartão do prontuário (Ex Officio) e situação, lidos das sessões do lote no momento da consulta */
    const cartoes = await anotar(lote, M);
    (lote.itens || []).forEach(it => { if (cartoes[it.processo]) it.prontuario = cartoes[it.processo]; });
    lote.itens = (lote.itens || []).filter(ve);
    if (modo !== 'cg') delete lote.retirados;
    limpaLote(lote);
    if (String(q.correspondencias||'') === '1') {
      const avaliar=require('./_collectio_correspondencias').avaliar;
      const {dados:estrut}=await L.lerJson('modelos/matrizes-estruturais.json');
      const materia28=/28[.,]86/.test(lote.titulo||'')||lote.itens.some(x=>/28[.,]86/.test(x.assunto||''));
      const modular=materia28?(await L.lerJson('modelos/matrizes-2886.json')).dados:null;
      return res.status(200).json(avaliar(lote,estrut||{registros:[]},modular));
    }
    res.status(200).json({ usuario: u, gestor, relator, modo, lote: limpaLote(lote) });
  } catch (e) { res.status(e.status === 404 ? 404 : 500).json({ erro: e.message }); }
};
async function gravar(req, res, u, gestor) {
  if (!gestor) return res.status(403).json({ erro: 'Só o gestor cria lotes e associa sessões.' });
  const b = req.body || {}, id = String(b.id || '').toLowerCase();
  if (!ID.test(id)) return res.status(400).json({ erro: 'Identificador inválido: use letras, números e hífen (até 40).' });
  const ss = [...new Set((Array.isArray(b.sessoes) ? b.sessoes : []).filter(s => DATA.test(s)))].sort();
  const rel = 'acervo/lotes/' + id + '.json';
  if (b.acao === 'criar-selecao') {
    const data=String(b.sessao||'');
    if(!DATA.test(data)) return res.status(400).json({erro:'Selecione uma sessão válida.'});
    if(!(await calendario()).some(x=>x.date===data))return res.status(400).json({erro:'Sessão não cadastrada.'});
    if(/^pauta-\d{4}-\d{2}-\d{2}$/.test(id))return res.status(400).json({erro:'Identificador reservado à matriz geral.'});
    const pedidos=Array.isArray(b.processos)?b.processos.map(String):[];
    if(!pedidos.length||pedidos.length>500||new Set(pedidos).size!==pedidos.length)
      return res.status(400).json({erro:'Selecione de 1 a 500 processos distintos.'});
    const origem=await itensSessao(data),porCnj=new Map(origem.map(x=>[String(x.cnj),x]));
    if(pedidos.some(c=>!porCnj.has(c)))return res.status(400).json({erro:'A seleção contém processo que não pertence à sessão.'});
    const titulo=String(b.titulo||'').trim().slice(0,80);
    if(!titulo)return res.status(400).json({erro:'Informe o título do lote.'});
    const existente=await lerLote(rel).catch(nada);
    if(existente.dados)return res.status(409).json({erro:'Já existe um lote com esse identificador.'});
    const itens=pedidos.map(c=>novoItem(data,porCnj.get(c)));
    const criterios={};for(const k of ['assunto','classe','resultado','busca','gruposOcultos'])
      if(b.criterios&&b.criterios[k])criterios[k]=String(b.criterios[k]).slice(0,160);
    const lote={schema:'gabcmt.lote',versao:1,tipo:'pauta',origem:'selecao',
      id,titulo,descricao:String(b.descricao||'').trim().slice(0,300),
      sessoes:[data],criterios,filtro:{},criado_por:u,
      atualizado_em:new Date().toISOString().slice(0,10),
      colunas:[],grupos:[],grupo_outros:{rotulo:'Processos não classificados',cor:'#5d6b72'},
      minutas:'acervo/minutas/'+id+'/<processo>.json',itens};
    agruparPorAssunto(lote);
    await L.gravarJson(rel,lote,undefined,'Collectio ('+u+'): lote '+id+' com '+itens.length+' processos selecionados da pauta '+data);
    return res.status(200).json({ok:true,id,total:itens.length,sessao:data});
  }
  /* lote a partir de uma lista de processos (sem sessão): tarefas do PJe, triagem do acervo.
     criar-lista {id, titulo, descricao, origem, itens:[{processo, ...}]}   cria o lote (até 600 processos)
     itens {id, itens:[{processo, ...}]}   atualiza os campos informados de cada processo; o que não está no lote entra no fim */
  /* autos {id, autos:[{cnj, extraido_em, lista, docs, faltam, texto}]}: inteiro teor extraído no navegador,
     gravado em acervo/autos/<CNJ>.json.gz (mesmo formato do scripts/autos/registrar.py), num só commit */
  if (b.acao === 'autos') {
    const zlib = require('zlib'), CNJA = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
    const lista = (Array.isArray(b.autos) ? b.autos : []).filter(a => a && CNJA.test(String(a.cnj || ''))).slice(0, 40);
    if (!lista.length) return res.status(400).json({ erro: 'Nenhum autos válido.' });
    const arqs = lista.map(a => {
      const dados = { cnj: a.cnj, extraido_em: String(a.extraido_em || ''), lista: typeof a.lista === 'string' ? a.lista : JSON.stringify(a.lista || []),
        docs: typeof a.docs === 'string' ? a.docs : JSON.stringify(a.docs || []), faltam: Array.isArray(a.faltam) ? a.faltam : [], texto: String(a.texto || '') };
      return { caminho: 'acervo/autos/' + a.cnj + '.json.gz', conteudo: zlib.gzipSync(Buffer.from(JSON.stringify(dados))) };
    });
    const ref = await L.gh('/git/ref/heads/main'), base = await L.gh('/git/commits/' + ref.object.sha);
    const tree = [];
    for (const f of arqs) { const blob = await L.gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: f.conteudo.toString('base64'), encoding: 'base64' }) }); tree.push({ path: f.caminho, mode: '100644', type: 'blob', sha: blob.sha }); }
    const t = await L.gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree }) });
    const c = await L.gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: 'Autos (' + u + '): inteiro teor de ' + arqs.length + ' processo(s) do lote ' + id, tree: t.sha, parents: [ref.object.sha] }) });
    try { await L.gh('/git/refs/heads/main', { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) }); }
    catch (e) { if (e.status === 422 || e.status === 409) return res.status(409).json({ erro: 'O repositório mudou; tente de novo.' }); throw e; }
    return res.status(200).json({ ok: true, gravados: arqs.length, commit: c.sha });
  }
  if (b.acao === 'criar-lista' || b.acao === 'itens') {
    const CNJ = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
    const TXT = ['recurso', 'partes', 'exequente', 'executado', 'assunto', 'tipo_caso', 'subassunto', 'especificidades', 'resultado', 'modelo', 'observacao', 'peculiaridades', 'mpf', 'grupo', 'classe', 'tarefa', 'etiquetas', 'chegada', 'bloco'];
    const OBJ = ['triagem', 'situacao_atual', 'extracao', 'teor', 'prontuario_triagem'];
    const LST = ['variacoes', 'pendencias', 'pecas'];
    const limpo = (x, it) => {
      for (const k of TXT) if (x[k] !== undefined) it[k] = x[k] === null ? null : String(x[k]).slice(0, 2000);
      for (const k of OBJ) if (x[k] && typeof x[k] === 'object' && !Array.isArray(x[k])) it[k] = Object.assign({}, it[k] || {}, JSON.parse(JSON.stringify(x[k]).length > 30000 ? '{}' : JSON.stringify(x[k])));
      for (const k of LST) if (Array.isArray(x[k])) it[k] = JSON.parse(JSON.stringify(x[k].slice(0, 80)));
      return it;
    };
    const base = (n, cnj) => ({ sessao: '', item: n, processo: cnj, recurso: '', partes: '', exequente: '', executado: '', assunto: '', grupo: null,
      tipo_caso: '', resultado: '', modelo: '', variacoes: [], observacao: '', peculiaridades: '', peculiaridades_relator: '', orientacao: '',
      equipe: { minuta: '', correcao: '', situacao: 'A minutar' }, pecas: [], mpf: '', triagem: {}, ajustes: [], pendencias: [], minuta: false });
    const lista = (Array.isArray(b.itens) ? b.itens : []).filter(x => x && CNJ.test(String(x.processo || '')));
    if ((!lista.length && !b.colecao) || lista.length > 600) return res.status(400).json({ erro: 'Informe de 1 a 600 processos com número CNJ completo.' });
    if (b.acao === 'criar-lista') {
      if (/^pauta-/.test(id)) return res.status(400).json({ erro: 'Identificador reservado à matriz geral.' });
      const titulo = String(b.titulo || '').trim().slice(0, 80);
      if (!titulo) return res.status(400).json({ erro: 'Informe o título do lote.' });
      if ((await lerLote(rel).catch(nada)).dados) return res.status(409).json({ erro: 'Já existe um lote com esse identificador.' });
      const vistos = new Set(), itens = [];
      for (const x of lista) { if (vistos.has(x.processo)) continue; vistos.add(x.processo); itens.push(limpo(x, base(itens.length + 1, x.processo))); }
      const lote = { schema: 'gabcmt.lote', versao: 1, tipo: b.tipo === 'triagem' ? 'triagem' : 'avulso', tarefa: String(b.tarefa || '').slice(0, 120) || undefined, origem: String(b.origem || 'lista').slice(0, 80), id, titulo,
        descricao: String(b.descricao || '').trim().slice(0, 300), sessoes: [], filtro: {}, criado_por: u, atualizado_em: new Date().toISOString().slice(0, 10),
        colunas: Array.isArray(b.colunas) ? b.colunas.slice(0, 20) : [], grupos: Array.isArray(b.grupos) ? b.grupos.slice(0, 12) : [],
        grupo_outros: { rotulo: 'A triar', cor: '#9aa0a8' }, minutas: 'acervo/minutas/' + id + '/<processo>.json', itens };
      await L.gravarJson(rel, lote, undefined, 'Index (' + u + '): lote ' + id + ' com ' + itens.length + ' processos (' + lote.origem + ')');
      return res.status(200).json({ ok: true, id, total: itens.length });
    }
    for (let t = 0; t < 4; t++) {
      const { dados: lote, sha } = await lerLote(rel).catch(nada);
      if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });
      const mapa = new Map((lote.itens || []).map(i => [i.processo, i]));
      let alt = 0, novos = 0;
      for (const x of lista) {
        let it = mapa.get(x.processo);
        if (!it) { it = base((lote.itens || []).length + 1, x.processo); lote.itens.push(it); mapa.set(x.processo, it); novos++; }
        limpo(x, it); alt++;
      }
      if (Array.isArray(b.grupos)) lote.grupos = b.grupos.slice(0, 12);
      if (Array.isArray(b.colunas)) lote.colunas = b.colunas.slice(0, 20);
      if (b.colecao === 'triagem' || b.colecao === 'avulso') lote.tipo = b.colecao;
      if (b.tarefa) lote.tarefa = String(b.tarefa).slice(0, 120);
      lote.atualizado_em = new Date().toISOString().slice(0, 10);
      try { await gravarLote(rel, lote, sha, 'Index (' + u + '): ' + alt + ' processo(s) atualizados no lote ' + id + (novos ? ' (' + novos + ' novos)' : '')); return res.status(200).json({ ok: true, id, alterados: alt, novos }); }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    return res.status(409).json({ erro: 'O lote mudou várias vezes seguidas; tente de novo.' });
  }
  if (b.acao === 'criar') {
    const tipo=b.tipo==='pauta'?'pauta':'avulso';
    if (!ss.length) return res.status(400).json({ erro: 'Escolha ao menos uma sessão.' });
    if (/^pauta-\d{4}-\d{2}-\d{2}$/.test(id))return res.status(400).json({erro:'Identificador reservado à matriz geral.'});
    if(tipo==='pauta' && ss.length!==1)return res.status(400).json({ erro: 'Índice de pauta exige uma sessão específica.' });
    const atual = await lerLote(rel).catch(nada);
    if (atual.dados) return res.status(409).json({ erro: 'Já existe um lote com esse identificador.' });
    const filtro = {}; ['assunto', 'classe', 'texto'].forEach(k => { const v = String((b.filtro || {})[k] || '').trim(); if (v) filtro[k] = v.slice(0, 120); });
    const itens = [];
    for (const s of ss) (await itensSessao(s)).filter(x => passa(x, filtro)).forEach(x => itens.push(novoItem(s, x)));
    if (!itens.length) return res.status(400).json({ erro: 'Nenhum processo das sessões escolhidas passa no filtro.' });
    const lote = {
      schema: 'gabcmt.lote', versao: 1, tipo, id, titulo: String(b.titulo || id).slice(0, 80), descricao: String(b.descricao || '').slice(0, 300),
      sessoes: ss, filtro, atualizado_em: new Date().toISOString().slice(0, 10), criado_por: u,
      colunas: [], grupos: [], grupo_outros: { rotulo: 'Processos do lote', cor: '#5d6b72' }, minutas: 'acervo/minutas/' + id + '/<processo>.json', itens
    };
    if(tipo==='pauta')agruparPorAssunto(lote);else agrupar(lote);
    await L.gravarJson(rel, lote, undefined, 'Lotes (' + u + '): cria o lote ' + id + ' (' + itens.length + ' processos; sessões ' + ss.join(', ') + ')');
    return res.status(200).json({ ok: true, id, total: itens.length });
  }
  if (b.acao === 'sessoes') {
    for (let t = 0; t < 4; t++) {
      const { dados: lote, sha } = await lerLote(rel).catch(nada);
      if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });
      if(tipoLote(lote)==='pauta') return res.status(400).json({ erro:'Os lotes de pauta preservam a seleção original. Crie um novo lote a partir da matriz para outra seleção.' });
      const antes = new Set(lote.sessoes || []), novas = ss.filter(s => !antes.has(s));
      const tem = new Set((lote.itens || []).map(i => i.sessao + '|' + i.processo));
      const manter = (lote.itens || []).filter(i => ss.includes(i.sessao)), fora = (lote.itens || []).filter(i => !ss.includes(i.sessao));
      const saem = fora.length, ret = lote.retirados || {};
      fora.forEach(i => { ret[i.sessao + '|' + i.processo] = i; });
      let entram = 0, voltam = 0;
      for (const s of ss) (await itensSessao(s)).filter(x => passa(x, lote.filtro)).forEach(x => {
        const k = s + '|' + x.cnj;
        if (tem.has(k)) return;
        if (ret[k]) { manter.push(ret[k]); delete ret[k]; voltam++; } else manter.push(novoItem(s, x));
        entram++;
      });
      if (Object.keys(ret).length) lote.retirados = ret; else delete lote.retirados;
      lote.itens = manter; lote.sessoes = ss; lote.atualizado_em = new Date().toISOString().slice(0, 10);
      (lote.itens || []).forEach(i => { if (i.grupo == null && (lote.grupos || []).some(g => /^g\d+$/.test(g.id))) { const g = lote.grupos.find(x => x.rotulo === i.assunto); if (g) i.grupo = g.id; } });
      try {
        await gravarLote(rel, lote, sha, 'Lotes (' + u + '): sessões do lote ' + id + ' → ' + (ss.join(', ') || 'nenhuma') + ' (+' + entram + ' −' + saem + ')');
        return res.status(200).json({ ok: true, entram, voltam, saem, novas, total: lote.itens.length });
      } catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    return res.status(409).json({ erro: 'O lote mudou várias vezes seguidas; tente de novo.' });
  }
  if (b.acao === 'substituir') {
    const de = String(b.de || ''), para = String(b.para || '');
    if (de.trim().length < 10) return res.status(400).json({ erro: 'O trecho precisa de ao menos 10 caracteres.' });
    if (de.length > 6000 || para.length > 6000) return res.status(400).json({ erro: 'Trecho longo demais.' });
    if (de.trim() === para.trim()) return res.status(400).json({ erro: 'O texto novo é igual ao trecho.' });
    const procs = [...new Set((Array.isArray(b.processos) ? b.processos : []).map(String).filter(x => PROC.test(x)))].slice(0, 400);
    if (!procs.length) return res.status(400).json({ erro: 'Escolha ao menos um processo.' });
    const re = rxTrecho(de), arqs = [], feitos = [], agora = new Date();
    for (const x of procs) {
      const path = 'acervo/minutas/' + id + '/' + x + '.json';
      const { dados, sha } = await L.lerJson(path).catch(nada);
      if (!dados || !dados.secoes) continue;
      let n = 0;
      for (const k of Object.keys(dados.secoes)) dados.secoes[k] = (dados.secoes[k] || []).map(t => String(t).replace(re, () => { n++; return para; }));
      if (!n) continue;
      dados.atualizado_em = agora.toISOString().slice(0, 10);
      (dados.edicoes = dados.edicoes || []).push({ em: agora.toISOString(), por: u, ocorrencias: n, de: de.slice(0, 300), para: para.slice(0, 300) });
      arqs.push({ path, sha, txt: JSON.stringify(dados, null, 1) + '\n' }); feitos.push({ processo: x, n });
    }
    if (!arqs.length) return res.status(200).json({ ok: true, alterados: 0, ocorrencias: 0, feitos });
    try { await L.commitArquivos(arqs, 'Lotes (' + u + '): trecho substituído em ' + arqs.length + ' minuta(s) do lote ' + id); }
    catch (e) { if (e.status === 409) return res.status(409).json({ erro: 'Uma das minutas mudou enquanto isso; tente de novo.' }); throw e; }
    return res.status(200).json({ ok: true, alterados: arqs.length, ocorrencias: feitos.reduce((a, f) => a + f.n, 0), feitos });
  }
  /* minuta-criar {id, processo}: rascunho da minuta (relatório montado do prontuário; voto e ementa a minutar),
     gravado em acervo/minutas/<id>/<X>.json, e o processo marcado com minuta no lote, num só commit. Não substitui minuta existente. */
  if (b.acao === 'minuta-criar') {
    const CNJ = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/, proc = String(b.processo || '');
    if (!CNJ.test(proc)) return res.status(400).json({ erro: 'Informe o número CNJ completo do processo.' });
    const mx = proc.slice(0, 10), path = 'acervo/minutas/' + id + '/' + mx + '.json';
    for (let t = 0; t < 4; t++) {
      const { dados: lote, sha } = await lerLote(rel).catch(nada);
      if (!lote) return res.status(404).json({ erro: 'Lote não encontrado. Na matriz geral da sessão, crie antes um lote com o processo.' });
      const it = (lote.itens || []).find(i => i.processo === proc);
      if (!it) return res.status(404).json({ erro: 'Processo fora deste lote.' });
      if ((await L.lerJson(path).catch(nada)).dados) return res.status(409).json({ erro: 'Já existe minuta deste processo no lote.' });
      const copia = JSON.parse(JSON.stringify(lote)), cartoes = await anotar(copia);
      const vivo = Object.assign({}, copia.itens.find(i => i.processo === proc), cartoes[proc] ? { prontuario: cartoes[proc] } : {});
      const minuta = rascunhoMinuta(lote, vivo, u);
      it.minuta = true; lote.atualizado_em = new Date().toISOString().slice(0, 10);
      try {
        await L.commitArquivos([{ path, txt: JSON.stringify(minuta, null, 1) + '\n' }, { path: rel, txt: JSON.stringify(lote, null, 1) + '\n', sha }],
          'Collectio (' + u + '): rascunho de minuta de ' + proc + ' no lote ' + id);
        return res.status(200).json({ ok: true, processo: proc, minuta });
      } catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    return res.status(409).json({ erro: 'O lote mudou várias vezes seguidas; tente de novo.' });
  }
  if (b.acao === 'lote-visivel') {
    for (let t = 0; t < 4; t++) {
      const { dados: lote, sha } = await lerLote(rel).catch(nada);
      if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });
      const v = {};
      if (b.equipe === false) v.equipe = false;
      if (b.relator === false) v.relator = false;
      if (Object.keys(v).length) lote.visivel = v; else delete lote.visivel;
      lote.atualizado_em = new Date().toISOString().slice(0, 10);
      try {
        await gravarLote(rel, lote, sha, 'Lotes (' + u + '): publicação do lote ' + id + ' (Geral=' + (b.equipe === false ? 'off' : 'on') + ', CMT=' + (b.relator === false ? 'off' : 'on') + ')');
        return res.status(200).json({ ok: true, visivel: lote.visivel || {} });
      } catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    return res.status(409).json({ erro: 'O lote mudou várias vezes seguidas; tente de novo.' });
  }
  /* Controle global: alternar a visibilidade de um lote sem editar seus demais atributos. */
  if (b.acao === 'visibilidade-lote') {
    const flags = b.visivel || {};
    if (!['equipe','relator'].some(k => typeof flags[k] === 'boolean')) return res.status(400).json({ erro: 'Informe equipe ou relator.' });
    for (let t = 0; t < 4; t++) {
      const { dados: lote, sha } = await lerLote(rel).catch(nada);
      if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });
      const visivel = Object.assign({}, lote.visivel || {});
      for (const k of ['equipe', 'relator']) {
        if (flags[k] === false) visivel[k] = false;
        else if (flags[k] === true) delete visivel[k];
      }
      if (Object.keys(visivel).length) lote.visivel = visivel; else delete lote.visivel;
      lote.atualizado_em = new Date().toISOString().slice(0, 10);
      try { await gravarLote(rel, lote, sha, 'Index CG (' + u + '): visibilidade do lote ' + id); return res.status(200).json({ ok: true, id, visivel }); }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    return res.status(409).json({ erro: 'O lote mudou; tente novamente.' });
  }
  if (b.acao === 'editar' || b.acao === 'visivel') {
    for (let t = 0; t < 4; t++) {
      const { dados: lote, sha } = await lerLote(rel).catch(nada);
      if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });
      let msg;
      if (b.acao === 'editar') {
        const tt = String(b.titulo || '').trim();
        if (!tt) return res.status(400).json({ erro: 'Dê um título ao lote.' });
        lote.titulo = tt.slice(0, 80); lote.descricao = String(b.descricao || '').trim().slice(0, 300);
        if (b.visivel && typeof b.visivel === 'object') { const v = {}; if (b.visivel.equipe === false) v.equipe = false; if (b.visivel.relator === false) v.relator = false; if (Object.keys(v).length) lote.visivel = v; else delete lote.visivel; }
        if (b.filtro) { const f = {}; ['assunto', 'classe', 'texto'].forEach(k => { const v = String(b.filtro[k] || '').trim(); if (v) f[k] = v.slice(0, 120); }); lote.filtro = f; }
        msg = 'Lotes (' + u + '): edita título e descrição do lote ' + id;
      } else {
        const mapa = new Map((lote.itens || []).map(i => [i.sessao + '|' + i.processo, i]));
        let n = 0;
        for (const x of (Array.isArray(b.itens) ? b.itens : [])) {
          const it = mapa.get(String(x.sessao) + '|' + String(x.processo)); if (!it) continue;
          const v = Object.assign({}, it.visivel || {});
          if (x.equipe === false) v.equipe = false; else if (x.equipe === true) delete v.equipe;
          if (x.relator === true || x.relator === false) v.relator = x.relator; else if (x.relator === 'auto') delete v.relator;
          if (Object.keys(v).length) it.visivel = v; else delete it.visivel;
          n++;
        }
        if (!n) return res.status(400).json({ erro: 'Nenhum processo do lote foi informado.' });
        msg = 'Lotes (' + u + '): visibilidade de ' + n + ' processo(s) no lote ' + id;
      }
      lote.atualizado_em = new Date().toISOString().slice(0, 10);
      try { await gravarLote(rel, lote, sha, msg); return res.status(200).json({ ok: true }); }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    return res.status(409).json({ erro: 'O lote mudou várias vezes seguidas; tente de novo.' });
  }
  return res.status(400).json({ erro: 'ação inválida' });
}
/* para os testes: projeção da designação e rascunho de minuta */
module.exports.anotar = anotar;
module.exports.rascunhoMinuta = rascunhoMinuta;
