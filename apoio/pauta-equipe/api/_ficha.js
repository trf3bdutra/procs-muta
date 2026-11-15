/* Ficha única do processo (padrao/ficha.json) gravada em acervo/operacional.json, o mesmo registro que o CMT-monitor usa.
   Servido por /api/pauta (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam):
   GET  /api/pauta?ficha=<CNJ>            ficha (modelo), registro do operacional e dados da fonte (só leitura)
   POST /api/pauta?ficha=1 {cnj, campos}   campos = { 'triagem.Tempestividade': 'Tempestivo', ... }; cria o registro se faltar
   Também exporta espelho(), usado pela pauta e pelas monocráticas: o que a equipe registra no cartão vai para a ficha no mesmo commit. */
const L = require('./_lib');
const OP = 'acervo/operacional.json', FONTE = 'acervo/fonte.json', FICHA = 'padrao/ficha.json';
const SECOES = ['origem', 'triagem', 'producao', 'pauta'];
const SO_GESTOR = new Set(['producao.SERVIDOR', 'producao.CORRETOR', 'producao.Destino']);
const dg = s => String(s || '').replace(/\D/g, '');
const agora = () => new Date().toISOString();
let FIC = null, FIC_T = 0, FT = null, FT_T = 0;
async function ficha() {
  if (!FIC || Date.now() - FIC_T > 300e3) { FIC = (await L.lerJson(FICHA)).dados; FIC_T = Date.now(); }
  return FIC;
}
function editaveis(F) {
  const m = {};
  F.abas.forEach(a => a.grupos.forEach(g => g.campos.forEach(c => { if (c.secao && c.editavel !== false && !c.calculado) m[c.secao + '.' + c.chave] = c; })));
  F.abas.forEach(a => { if (a.seletor) m[a.seletor.secao + '.' + a.seletor.chave] = a.seletor; });
  return m;
}
async function fonteDe(cnj) {
  if (!FT || Date.now() - FT_T > 300e3) {
    const d = JSON.parse((await L.lerGrande(FONTE)).txt); FT = {};
    (d.registros || []).forEach(r => { FT[dg(r.processo || r.Processo)] = r; }); FT_T = Date.now();
  }
  return FT[dg(cnj)] || null;
}
async function lerOp() { const { txt, sha } = await L.lerGrande(OP); return { doc: JSON.parse(txt), sha }; }
function registro(doc, cnj, F, criar) {
  const k = dg(cnj); let r = (doc.registros || []).find(x => dg(x.processo) === k);
  if (!r && criar) {
    r = { processo: cnj };
    SECOES.forEach(s => { r[s] = {}; });
    F.abas.forEach(a => a.grupos.forEach(g => g.campos.forEach(c => { if (c.secao && !c.calculado && c.editavel !== false && !(c.chave in r[c.secao])) r[c.secao][c.chave] = ''; })));
    r.pauta.sessoes = [];
    doc.registros.push(r);
  }
  return r;
}
/* aplica {secao: {chave: valor}} ao registro; devolve a lista do que mudou */
function aplica(r, mud) {
  const out = [];
  Object.keys(mud).forEach(s => { r[s] = r[s] || {}; Object.keys(mud[s]).forEach(k => { const v = String(mud[s][k] == null ? '' : mud[s][k]); if ((r[s][k] || '') !== v) { r[s][k] = v; out.push(s + '.' + k); } }); });
  if (out.length) { r.origem = r.origem || {}; r.origem.atualizado_em = agora(); }
  return out;
}
/* cartão da pauta → campos da ficha (vocabulário do Monitor) */
const V = {
  tempest: v => ({ triagem: { 'Tempestividade': /^(Tempestivo|Intempestivo)$/.test(v) ? v : '' } }),
  preparo: v => ({ triagem: Object.assign({ 'Preparo': { 'Comprovado': 'Comprovado', 'Justiça gratuita': 'Dispensado', 'Isento (DPU/ente público)': 'Dispensado', 'Não recolhido': 'Não Recolhido', 'Não se aplica': 'Não se Aplica' }[v] || '' }, v === 'Justiça gratuita' ? { 'AJG': 'Sim' } : {}) }),
  repres: v => ({ triagem: Object.assign({ 'Representação': v === 'Regular' || /^Dispensada/.test(v) ? 'Regular' : /^Irregular/.test(v) ? 'Negativo' : '' }, /^(Dispensada|Irregular)/.test(v) ? { 'Observação da Representação': v } : {}) }),
  midias: v => ({ triagem: { 'Mídias': { 'Juntadas': 'Juntada', 'Faltantes': 'Faltante', 'Não se aplica': 'Não se Aplica' }[v] || '' } }),
  mpf: v => ({ triagem: v === 'Sem hipótese' ? { 'MPF - Custos Legis': 'Não' } : v ? { 'MPF - Custos Legis': 'Sim', 'Observação MPF': v } : { 'MPF - Custos Legis': '' } }),
  parecer: v => ({ triagem: { 'MPF': { 'Com parecer': 'Com Parecer', 'Aguardando parecer': 'Sem Parecer', 'Intimado sem manifestação': 'Sem Parecer' }[v] || '' } }),
  prelim: v => ({ triagem: { 'Prelim.': v } }),
  intercor: v => ({ triagem: { 'Intercorrências': v } }),
  resJulg: v => ({ producao: { 'Voto - Resultado': v } }),
  honor: v => ({ producao: { 'Voto - Honorários': v } }),
  topico: v => ({ producao: { 'Tópico-síntese': v } }),
  servidor: v => ({ producao: { 'SERVIDOR': v } }),
  corretor: v => ({ producao: { 'CORRETOR': v } }),
  dataMinuta: v => ({ producao: { 'MINUTADO': v } }),
  dataCorrecao: v => ({ producao: { 'Data da Revisão': v, 'CORRIGIDO': v ? 'Sim' : '' } }),
  dataLiberacao: v => ({ producao: { 'Data da Liberação': v, 'LIBERADO': v ? 'Sim' : '' } }),
  /* urgências e monocráticas (aba Urgências / Monocráticas da Pauta da equipe) */
  urgTipo: v => ({ triagem: { 'Urgência': { 'Tutela de urgência': 'Tutela de urgência', 'Tutela recursal (antecipação)': 'Tutela de urgência', 'Efeito suspensivo': 'Efeito suspensivo', 'Liminar': 'Pedido de liminar', 'Prioridade de saúde': 'Prioridade legal', 'Outro': 'Outra urgência' }[v] || '' } }),
  urgSit: v => ({ triagem: { 'Urgência - Apreciação': v } }), urgData: v => ({ triagem: { 'Urgência - Data': v } }), urgObs: v => ({ triagem: { 'Urgência - Observação': v } }),
  hip932: v => ({ triagem: { 'Hipóteses Monocrática': v } }),
  tipoAto: v => ({ producao: { 'Mono - Tipo de ato': v } }), fundamento: v => ({ producao: { 'Mono - Fundamento': v } }),
  /* registro da monocrática marca o destino na ficha; urgPedido é o nome usado pelo formulário de urgência */
  mono: v => ({ producao: { 'Destino': v && v !== 'false' ? 'Monocrática' : '' } }),
  urgPedido: v => ({ triagem: { 'Urgência - Data': v } })
};
/* ficha → cartão (volta): só o que tem correspondência sem ambiguidade; o cartão guarda o vocabulário da equipe */
const LISTAS = {
  resJulg: ['Provido', 'Parcialmente provido', 'Desprovido', 'Não conhecido', 'Prejudicado', 'Rejeitados', 'Acolhidos sem efeito infringente', 'Acolhidos com efeito infringente', 'Retratação exercida', 'Acórdão mantido'],
  honor: ['Majorados', 'Mantidos', 'Invertidos', 'Fixados', 'Redistribuídos', 'Sem honorários recursais'], prelim: ['Sem preliminares', 'Há preliminares', 'Preliminar de ofício'], simnao: ['Sim', 'Não']
};
const naLista = (L, v) => L.find(x => x.toLowerCase() === String(v || '').trim().toLowerCase()) || null;
function paraCartao(mud, it) {
  const c = (it && it.ctl) || {}, d = {}, k = {}, cart = {}, t = mud.triagem || {}, p = mud.producao || {}, tem = (o, x) => Object.prototype.hasOwnProperty.call(o, x);
  if (tem(t, 'Tempestividade')) k.tempest = /^(Tempestivo|Intempestivo)$/.test(t.Tempestividade) ? t.Tempestividade : '';
  if (tem(t, 'Preparo')) k.preparo = { 'Comprovado': 'Comprovado', 'Não Recolhido': 'Não recolhido', 'Não se Aplica': 'Não se aplica' }[t.Preparo] ||
    (t.Preparo === 'Dispensado' ? (/^(Justiça gratuita|Isento)/.test(c.preparo || '') ? c.preparo : 'Justiça gratuita') : '');
  if (tem(t, 'Representação')) k.repres = t['Representação'] === 'Regular' ? (/^Dispensada/.test(c.repres || '') ? c.repres : 'Regular') : t['Representação'] === 'Negativo' ? 'Irregular – intimar' : '';
  if (tem(t, 'Mídias')) k.midias = { 'Juntada': 'Juntadas', 'Faltante': 'Faltantes', 'Não se Aplica': 'Não se aplica' }[t['Mídias']] || '';
  if (tem(t, 'MPF')) k.parecer = t.MPF === 'Com Parecer' ? 'Com parecer' : t.MPF === 'Sem Parecer' ? (/^(Aguardando|Intimado)/.test(c.parecer || '') ? c.parecer : 'Aguardando parecer') : '';
  if (tem(t, 'Prelim.') && (naLista(LISTAS.prelim, t['Prelim.']) || !t['Prelim.'])) k.prelim = naLista(LISTAS.prelim, t['Prelim.']) || '';
  if (tem(t, 'Intercorrências')) k.intercor = t['Intercorrências'];
  if (tem(p, 'Voto - Resultado') && (naLista(LISTAS.resJulg, p['Voto - Resultado']) || !p['Voto - Resultado'])) k.resJulg = naLista(LISTAS.resJulg, p['Voto - Resultado']) || '';
  if (tem(p, 'Voto - Honorários') && (naLista(LISTAS.honor, p['Voto - Honorários']) || !p['Voto - Honorários'])) k.honor = naLista(LISTAS.honor, p['Voto - Honorários']) || '';
  if (tem(p, 'Tópico-síntese') && naLista(LISTAS.simnao, p['Tópico-síntese'])) k.topico = naLista(LISTAS.simnao, p['Tópico-síntese']);
  if (tem(p, 'MINUTADO') && /^(\d{4}-\d{2}-\d{2})?$/.test(p.MINUTADO)) d.dataMinuta = p.MINUTADO;
  if (tem(p, 'Data da Revisão') && /^(\d{4}-\d{2}-\d{2})?$/.test(p['Data da Revisão'])) d.dataCorrecao = p['Data da Revisão'];
  if (tem(p, 'Data da Liberação') && /^(\d{4}-\d{2}-\d{2})?$/.test(p['Data da Liberação'])) d.dataLiberacao = p['Data da Liberação'];
  if (tem(p, 'SERVIDOR')) d.servidor = p.SERVIDOR;
  if (tem(p, 'CORRETOR')) d.corretor = p.CORRETOR;
  const C2 = { 'Especificidades': 'especificidades', 'Alegações': 'questoes', 'Tipo de Julgamento': 'tipoJ' };
  Object.keys(C2).forEach(x => { if (tem(t, x)) cart[C2[x]] = t[x]; });
  if (tem(t, 'Parecer - Sentido') || tem(t, 'ID do Parecer MPF')) { cart.mpfx = Object.assign({}, (c.cartao || {}).mpfx); if (tem(t, 'Parecer - Sentido')) cart.mpfx.sentido = t['Parecer - Sentido']; if (tem(t, 'ID do Parecer MPF')) cart.mpfx.id = t['ID do Parecer MPF']; }
  if (tem(t, 'Tempest - Publicação') || tem(t, 'Tempest - Protocolo')) { cart.adm = Object.assign({}, (c.cartao || {}).adm); if (tem(t, 'Tempest - Publicação')) cart.adm.intim = t['Tempest - Publicação']; if (tem(t, 'Tempest - Protocolo')) cart.adm.prot = t['Tempest - Protocolo']; }
  if (tem(p, 'Voto - Descrição')) { cart.jul = Object.assign({}, (c.cartao || {}).jul, { fund: p['Voto - Descrição'] }); }
  return { d, k, cart };
}
/* aplica a volta num item da pauta ou das monocráticas; devolve true se mudou */
function aplicaCartao(it, v, u) {
  let m = false; it.ctl = it.ctl || {};
  Object.keys(v.d).forEach(x => { if ((it[x] || '') !== v.d[x]) { it[x] = v.d[x]; m = true; } });
  Object.keys(v.k).forEach(x => { const val = v.k[x]; if ((it.ctl[x] || '') !== val) { if (val) it.ctl[x] = val; else delete it.ctl[x]; m = true; } });
  if (Object.keys(v.cart).length) { const ant = it.ctl.cartao || {}; Object.keys(v.cart).forEach(x => { if (JSON.stringify(ant[x]) !== JSON.stringify(v.cart[x])) { ant[x] = v.cart[x]; m = true; } }); it.ctl.cartao = ant; }
  if (m) { it.ctl.editadoPor = u; it.ctl.editadoEm = agora(); }
  return m;
}
/* arquivos onde o processo aparece hoje: pautas de sessões de hoje em diante e monocráticas/urgências */
async function ondeEsta(cnj) {
  const k = dg(cnj), hoje = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10), out = [];
  const cal = (await L.lerJson('acervo/sessoes/calendario.json')).dados;
  for (const s of (cal.sessoes || []).filter(s => s.date >= hoje)) {
    try { const rel = 'acervo/sessoes/' + s.date + '.json', { dados, sha } = await L.lerJson(rel);
      const its = (dados.itens || []).concat(dados.previa || []).filter(i => dg(i.cnj) === k); if (its.length) out.push({ path: rel, dados, sha, its }); } catch (e) { if (e.status !== 404) throw e; }
  }
  try { const rel = 'acervo/monocraticas.json', { dados, sha } = await L.lerJson(rel), it = (dados.registros || {})[k]; if (it) out.push({ path: rel, dados, sha, its: [it] }); } catch (e) { if (e.status !== 404) throw e; }
  return out;
}
const VC = {
  tipoJ: v => ({ triagem: { 'Tipo de Julgamento': v } }), especificidades: v => ({ triagem: { 'Especificidades': v } }), questoes: v => ({ triagem: { 'Alegações': v } }),
  'mpfx.sentido': v => ({ triagem: { 'Parecer - Sentido': v } }), 'mpfx.id': v => ({ triagem: { 'ID do Parecer MPF': v } }),
  'adm.intim': v => ({ triagem: { 'Tempest - Publicação': v } }), 'adm.prot': v => ({ triagem: { 'Tempest - Protocolo': v } }), 'adm.prazo': v => ({ triagem: { 'Tempest - Prazo legal': v } }),
  'adm.dobro': v => ({ triagem: { 'Tempest - Dobro': v === true || v === 'true' ? 'Sim' : '' } }), 'adm.ajg': v => ({ triagem: { 'AJG': v === true || v === 'true' ? 'Sim' : '' } }),
  'jul.fund': v => ({ producao: { 'Voto - Descrição': v } }), 'jul.topico': v => ({ producao: { 'Tópico-síntese': v } })
};
function junta(a, b) { Object.keys(b).forEach(s => { a[s] = Object.assign(a[s] || {}, b[s]); }); return a; }
function doCartao(campos, cartao) {
  const m = {};
  Object.keys(campos || {}).forEach(k => { if (V[k]) junta(m, V[k](String(campos[k] == null ? '' : campos[k]))); });
  const c = cartao || {};
  Object.keys(VC).forEach(p => { const v = p.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), c); if (v !== undefined) junta(m, VC[p](v)); });
  return m;
}
/* commit com conferência (ver _lib.commitArquivos): arquivo mudado ou ramo andou → 409, e quem chamou tenta de novo */
async function commitConferido(arqs, msg) {
  try { return await L.commitArquivos(arqs, msg); }
  catch (e) { if (e.status === 422) e.status = 409; throw e; }
}
/* pauta e monocráticas: espelha no operacional, no mesmo commit do arquivo da pauta */
async function espelho(arqPauta, cnj, campos, cartao, msg) {
  const F = await ficha(), mud = doCartao(campos, cartao);
  if (!Object.keys(mud).length) return commitConferido([arqPauta], msg);
  const { doc, sha } = await lerOp(), r = registro(doc, cnj, F, true), out = aplica(r, mud);
  const arqs = [arqPauta];
  if (out.length) { doc.atualizado_em = agora(); arqs.push({ path: OP, txt: JSON.stringify(doc, null, 1) + '\n', sha }); }
  return commitConferido(arqs, msg + (out.length ? '\n\nFicha (operacional): ' + out.slice(0, 12).join(', ') : ''));
}
module.exports = async (req, res, u) => {
  try {
    const F = await ficha();
    if (req.method === 'GET') {
      const cnj = String(req.query.ficha || '');
      if (dg(cnj).length !== 20) return res.status(200).json({ ficha: F });
      const [{ doc }, fonte] = await Promise.all([lerOp(), fonteDe(cnj)]);
      /* controles da equipe do mesmo processo: monocrática e urgência, meta, sobrestamento */
      const opc = rel => L.lerJson(rel).then(x => (x.dados.registros || {})[dg(cnj)] || null).catch(() => null);
      /* controles: o registro de acompanhamento e, para metas, sobrestados e casos sensíveis, se o processo está na lista (acervo) */
      const naLista = mod => require(mod).base().then(B => (Array.isArray(B) ? B : B.lista).find(x => dg(x.cnj) === dg(cnj)) || null).catch(() => null);
      const [mono, metas, sobrestados, sensiveis, bMeta, bSobr, bSens] = await Promise.all([opc('acervo/monocraticas.json'), opc('acervo/metas.json'), opc('acervo/sobrestados.json'), opc('acervo/sensiveis.json'),
        naLista('./_metas'), naLista('./_sobr'), naLista('./_sens')]);
      return res.status(200).json({ ficha: F, operacional: registro(doc, cnj, F, false) || null, fonte, gestor: L.gestor(u),
        controles: { mono, metas, sobrestados, sensiveis, naLista: { metas: bMeta, sobrestados: bSobr, sensiveis: bSens } } });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, cnj = String(b.cnj || ''), C = b.campos || {}, E = editaveis(F), mud = {}, recus = [];
    if (dg(cnj).length !== 20) return res.status(400).json({ erro: 'número do processo inválido' });
    Object.keys(C).forEach(k => {
      if (!E[k]) { recus.push(k); return; }
      if (SO_GESTOR.has(k) && !L.gestor(u)) { recus.push(k); return; }
      const i = k.indexOf('.'); (mud[k.slice(0, i)] = mud[k.slice(0, i)] || {})[k.slice(i + 1)] = C[k];
    });
    if (!Object.keys(mud).length) return res.status(400).json({ erro: 'nenhum campo editável', recusados: recus });
    for (let t = 0; t < 4; t++) {
      const { doc, sha } = await lerOp(), r = registro(doc, cnj, F, true), out = aplica(r, mud);
      if (!out.length) return res.status(200).json({ ok: true, semMudanca: true, operacional: r, recusados: recus });
      doc.atualizado_em = agora();
      /* volta: o que tem correspondência no cartão é gravado também na pauta e nas monocráticas onde o processo está, no mesmo commit */
      const arqs = [{ path: OP, txt: JSON.stringify(doc, null, 1) + '\n', sha }], cart = [];
      for (const a of await ondeEsta(cnj)) {
        let mudou = false; a.its.forEach(it => { if (aplicaCartao(it, paraCartao(mud, it), u)) mudou = true; });
        if (mudou) { a.dados.atualizadoEm = agora(); arqs.push({ path: a.path, txt: JSON.stringify(a.dados, null, 1) + '\n', sha: a.sha }); cart.push(a.path); }
      }
      try {
        await commitConferido(arqs, 'Ficha (' + u + '): ' + r.processo + ' · ' + out.slice(0, 6).join(', ') + (cart.length ? '\n\nCartão atualizado em: ' + cart.join(', ') : ''));
        return res.status(200).json({ ok: true, operacional: r, recusados: recus, cartoes: cart });
      } catch (e) { if (e.status !== 409) throw e; }
    }
    res.status(409).json({ erro: 'A ficha mudou várias vezes seguidas; tente de novo.' });
  } catch (e) { res.status(e.status === 404 ? 404 : 500).json({ erro: e.message }); }
};
module.exports.espelho = espelho;
module.exports.doCartao = doCartao;
module.exports.paraCartao = paraCartao;
