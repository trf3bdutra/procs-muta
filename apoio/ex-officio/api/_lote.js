/* Painel de lotes (/lotes/): página própria, desenhada como parte do Painel do relator (/cmt), com o mesmo acesso:
   login do Ex Officio (cookie cmt_eq) ou o link próprio do relator (chave em x-cmt-chave ou ?k=, conferida com CMT_CHAVE).
   Servido pelo /api/painel?lote=1 (a Vercel no plano Hobby aceita no máximo 12 funções; este arquivo, com _, não conta como função).
   Leitura (equipe, gestor e relator):
   GET  ?lote=1                                lotes (acervo/lotes/*.json) e, para o gestor, o calendário das sessões
   GET  ?lote=1&id=2886                        o lote (matriz, perfis e painel), com o cartão do prontuário de cada processo
                                               tirado, na hora, da sessão em acervo/sessoes/AAAA-MM-DD.json
   GET  ?lote=1&id=2886&minuta=X               a minuta do processo X (10 primeiros caracteres do número): acervo/minutas/<id>/X.json
   Com &rel=1 (página do relator, /cmt/lotes/), a resposta é sempre a do relator, qualquer que seja o login.
   O relator (link próprio, perfil desembargador ou &rel=1) só recebe os processos prontos: situação Corrigida ou Liberada, a mais
   adiantada entre a do lote e a do Ex Officio (dataCorrecao/dataLiberacao na sessão). Os que estão por fazer ou por corrigir
   não chegam a ele, nem a minuta deles. Equipe e gestor recebem todos, com a marca "pronto".
   Gestão (só o gestor, com login):
   GET  ?lote=1&previa=1&sessoes=A,B&assunto=&classe=&texto=   prévia: quantos processos das sessões entram pelo filtro
   POST ?lote=1 {acao:'criar', id, titulo, descricao, sessoes, filtro}   cria acervo/lotes/<id>.json com os processos das sessões
   POST ?lote=1 {acao:'sessoes', id, sessoes}  associa e desassocia sessões: entram os processos das novas sessões que passam
                                               no filtro do lote; saem os das sessões retiradas; os demais ficam como estão.
                                               Os que saem ficam guardados em lote.retirados, com tudo o que já foi registrado,
                                               e voltam iguais se a sessão for associada de novo */
const L = require('./_lib');
const ID = /^[a-z0-9-]{1,40}$/i, PROC = /^\d{7}-\d{2}$/, DATA = /^\d{4}-\d{2}-\d{2}$/;
const nada = e => { if (e.status === 404) return { dados: null }; throw e; };
const sem = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CORES = ['#2f6db5', '#7a5cc2', '#1f8a70', '#c07a12', '#b8562f', '#3a4a5c', '#8a5a9e', '#4f7f3a'];
const ENT = /UNI[ÃA]O|INSS|INSTITUTO NACIONAL|BANCO CENTRAL|FUNDA[CÇ][AÃ]O|CAIXA ECON|EMPRESA BRASILEIRA|CONSELHO|AG[ÊE]NCIA|UNIVERSIDADE|FAZENDA/i;
async function itensSessao(s) {
  if (!DATA.test(s)) return [];
  const { dados } = await L.lerJson('acervo/sessoes/' + s + '.json').catch(nada);
  return dados ? (Array.isArray(dados) ? dados : (dados.itens || dados.processos || [])) : [];
}
function passa(x, f) {
  f = f || {};
  if (f.assunto && !sem(x.assunto).includes(sem(f.assunto))) return false;
  if (f.classe && !sem(x.classe).includes(sem(f.classe))) return false;
  if (f.texto && !sem([x.assunto, x.classe, x.partes, x.obs, x.cnj].join(' ')).includes(sem(f.texto))) return false;
  return true;
}
function situacao(x) { return x.dataLiberacao ? 'Liberada' : x.dataCorrecao ? 'Corrigida' : x.dataMinuta ? 'Minutada' : 'A minutar'; }
const ORDEM = { 'A minutar': 1, 'Minutada': 2, 'Corrigida': 3, 'Liberada': 4 };
/* situação de cada processo: a mais adiantada entre a do lote e a do Ex Officio; marca "pronto" (corrigido ou liberado)
   e devolve os cartões do prontuário lidos das sessões do lote */
async function anotar(lote) {
  const cartoes = {}, vivo = {};
  await Promise.all((lote.sessoes || []).map(async s => (await itensSessao(s)).forEach(x => {
    vivo[x.cnj] = situacao(x);
    const c = x && x.ctl; if (!c || !c.cartao) return;
    cartoes[x.cnj] = { cartao: c.cartao, editadoPor: c.editadoPor || '', editadoEm: c.editadoEm || '' };
  })));
  (lote.itens || []).forEach(it => {
    const e = it.equipe = it.equipe || {}, sv = vivo[it.processo];
    if (sv && (ORDEM[sv] || 0) > (ORDEM[e.situacao] || 0)) e.situacao = sv;
    it.pronto = (ORDEM[e.situacao] || 0) >= 3;
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
async function calendario() {
  const { dados } = await L.lerJson('acervo/sessoes/calendario.json').catch(nada);
  return ((dados && dados.sessoes) || []).map(s => ({ date: s.date, nome: s.nome, processos: s.processos || 0, publicada: !!s.publicada }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const CMT = require('./_cmt');
  const login = L.quem(req);
  const u = login || (CMT.porChave(req) ? (process.env.CMT_RELATOR || 'CM') : null);
  if (!u) return res.status(401).json({ erro: 'Entre com o seu nome e a sua senha.' });
  const gestor = !!(login && L.gestor(login));
  try {
    if (req.method === 'POST') return await gravar(req, res, login, gestor);
    if (req.method !== 'GET') return res.status(405).json({ erro: 'método não aceito' });
    const q = req.query || {}, id = String(q.id || '');
    const relator = !!q.rel || (!gestor && (!login || (await L.acessos(login)).perfil === 'desembargador'));
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
        const { dados } = await L.lerJson('acervo/lotes/' + f.name).catch(nada);
        if (!dados) continue;
        if (relator) await anotar(dados);
        lotes.push({ id: dados.id, titulo: dados.titulo, descricao: dados.descricao, sessoes: dados.sessoes, filtro: dados.filtro || null, total: (dados.itens || []).filter(i => !relator || i.pronto).length });
      }
      return res.status(200).json({ usuario: u, gestor, relator, lotes, calendario: gestor ? await calendario() : [] });
    }
    if (!ID.test(id)) return res.status(400).json({ erro: 'lote inválido' });
    const mx = String(q.minuta || '');
    if (mx) {
      if (!PROC.test(mx)) return res.status(400).json({ erro: 'processo inválido' });
      if (relator) {
        const { dados: lt } = await L.lerJson('acervo/lotes/' + id + '.json').catch(nada);
        if (lt) await anotar(lt);
        const it = lt && (lt.itens || []).find(i => String(i.processo).slice(0, 10) === mx);
        if (!it || !it.pronto) return res.status(404).json({ erro: 'Minuta ainda em preparo.' });
      }
      const { dados } = await L.lerJson('acervo/minutas/' + id + '/' + mx + '.json').catch(nada);
      if (!dados) return res.status(404).json({ erro: 'Minuta não disponível para este processo.' });
      return res.status(200).json(dados);
    }
    const { dados: lote } = await L.lerJson('acervo/lotes/' + id + '.json').catch(nada);
    if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });
    /* cartão do prontuário (Ex Officio) e situação, lidos das sessões do lote no momento da consulta */
    const cartoes = await anotar(lote);
    (lote.itens || []).forEach(it => { if (cartoes[it.processo]) it.prontuario = cartoes[it.processo]; });
    if (relator) lote.itens = (lote.itens || []).filter(i => i.pronto);
    res.status(200).json({ usuario: u, gestor, relator, lote });
  } catch (e) { res.status(e.status === 404 ? 404 : 500).json({ erro: e.message }); }
};
async function gravar(req, res, u, gestor) {
  if (!gestor) return res.status(403).json({ erro: 'Só o gestor cria lotes e associa sessões.' });
  const b = req.body || {}, id = String(b.id || '').toLowerCase();
  if (!ID.test(id)) return res.status(400).json({ erro: 'Identificador inválido: use letras, números e hífen (até 40).' });
  const ss = [...new Set((Array.isArray(b.sessoes) ? b.sessoes : []).filter(s => DATA.test(s)))].sort();
  const rel = 'acervo/lotes/' + id + '.json';
  if (b.acao === 'criar') {
    if (!ss.length) return res.status(400).json({ erro: 'Escolha ao menos uma sessão.' });
    const atual = await L.lerJson(rel).catch(nada);
    if (atual.dados) return res.status(409).json({ erro: 'Já existe um lote com esse identificador.' });
    const filtro = {}; ['assunto', 'classe', 'texto'].forEach(k => { const v = String((b.filtro || {})[k] || '').trim(); if (v) filtro[k] = v.slice(0, 120); });
    const itens = [];
    for (const s of ss) (await itensSessao(s)).filter(x => passa(x, filtro)).forEach(x => itens.push(novoItem(s, x)));
    if (!itens.length) return res.status(400).json({ erro: 'Nenhum processo das sessões escolhidas passa no filtro.' });
    const lote = {
      schema: 'gabcmt.lote', versao: 1, id, titulo: String(b.titulo || id).slice(0, 80), descricao: String(b.descricao || '').slice(0, 300),
      sessoes: ss, filtro, atualizado_em: new Date().toISOString().slice(0, 10), criado_por: u,
      colunas: [], grupos: [], grupo_outros: { rotulo: 'Processos do lote', cor: '#5d6b72' }, minutas: 'acervo/minutas/' + id + '/<processo>.json', itens
    };
    agrupar(lote);
    await L.gravarJson(rel, lote, undefined, 'Lotes (' + u + '): cria o lote ' + id + ' (' + itens.length + ' processos; sessões ' + ss.join(', ') + ')');
    return res.status(200).json({ ok: true, id, total: itens.length });
  }
  if (b.acao === 'sessoes') {
    for (let t = 0; t < 4; t++) {
      const { dados: lote, sha } = await L.lerJson(rel).catch(nada);
      if (!lote) return res.status(404).json({ erro: 'Lote não encontrado.' });
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
        await L.gravarJson(rel, lote, sha, 'Lotes (' + u + '): sessões do lote ' + id + ' → ' + (ss.join(', ') || 'nenhuma') + ' (+' + entram + ' −' + saem + ')');
        return res.status(200).json({ ok: true, entram, voltam, saem, novas, total: lote.itens.length });
      } catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    return res.status(409).json({ erro: 'O lote mudou várias vezes seguidas; tente de novo.' });
  }
  return res.status(400).json({ erro: 'ação inválida' });
}
