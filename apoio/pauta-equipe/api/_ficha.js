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
  dataLiberacao: v => ({ producao: { 'Data da Liberação': v, 'LIBERADO': v ? 'Sim' : '' } })
};
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
      return res.status(200).json({ ficha: F, operacional: registro(doc, cnj, F, false) || null, fonte, gestor: L.gestor(u) });
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
      try {
        await commitConferido([{ path: OP, txt: JSON.stringify(doc, null, 1) + '\n', sha }], 'Ficha (' + u + '): ' + r.processo + ' · ' + out.slice(0, 6).join(', '));
        return res.status(200).json({ ok: true, operacional: r, recusados: recus });
      } catch (e) { if (e.status !== 409) throw e; }
    }
    res.status(409).json({ erro: 'A ficha mudou várias vezes seguidas; tente de novo.' });
  } catch (e) { res.status(e.status === 404 ? 404 : 500).json({ erro: e.message }); }
};
module.exports.espelho = espelho;
module.exports.doCartao = doCartao;
