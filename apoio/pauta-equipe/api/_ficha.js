/* Ficha única do processo (padrao/ficha.json) gravada em acervo/operacional.json, o mesmo registro que o CMT-monitor usa.
   Servido por /api/pauta (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam):
   GET  /api/pauta?ficha=<CNJ>            ficha (modelo), registro do operacional e dados da fonte (só leitura)
   POST /api/pauta?ficha=1 {cnj, campos}   campos = { 'triagem.Tempestividade': 'Tempestivo', ... }; cria o registro se faltar
   Também exporta espelho(), usado pela pauta e pelas monocráticas: o que a equipe registra no cartão vai para a ficha no mesmo commit. */
const L = require('./_lib');
const OP = 'acervo/operacional.json', FONTE = 'acervo/fonte.json', FICHA = 'padrao/ficha.json';
const SECOES = ['origem', 'triagem', 'producao', 'pauta', 'controles'];
/* a designação é do gestor; o destino (sessão ou monocrática) a equipe registra, como na página Monocráticas */
const SO_GESTOR = new Set(['producao.SERVIDOR', 'producao.CORRETOR']);
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
  /* Controles especiais · urgência: vocabulário único da ficha (padrao/ficha.json) */
  urgTipo: v => ({ triagem: { 'Urgência': v } }), urgNivel: v => ({ triagem: { 'Urgência - Nível': v } }), urgSit: v => ({ triagem: { 'Urgência - Apreciação': v } }),
  urgPedido: v => ({ triagem: { 'Urgência - Data': v } }), urgData: v => ({ triagem: { 'Urgência - Apreciada em': v } }), urgObs: v => ({ triagem: { 'Urgência - Observação': v } }),
  urgPainel: v => ({ triagem: { 'Urgência - Painel': v } }),
  /* Controles especiais · monocrática: destino e observação ficam a cargo de _mono.js (a pauta também tem 'obs') */
  hip932: v => ({ triagem: { 'Hipóteses Monocrática': v } }),
  tipoAto: v => ({ producao: { 'Mono - Tipo de ato': v } }), fundamento: v => ({ producao: { 'Mono - Fundamento': v } })
};
const VC = {
  tipoJ: v => ({ triagem: { 'Tipo de Julgamento': v } }), especificidades: v => ({ triagem: { 'Especificidades': v } }), questoes: v => ({ triagem: { 'Alegações': v } }),
  'mpfx.sentido': v => ({ triagem: { 'Parecer - Sentido': v } }), 'mpfx.id': v => ({ triagem: { 'ID do Parecer MPF': v } }),
  'adm.intim': v => ({ triagem: { 'Tempest - Publicação': v } }), 'adm.prot': v => ({ triagem: { 'Tempest - Protocolo': v } }), 'adm.prazo': v => ({ triagem: { 'Tempest - Prazo legal': v } }),
  'adm.dobro': v => ({ triagem: { 'Tempest - Dobro': v === true || v === 'true' ? 'Sim' : '' } }), 'adm.ajg': v => ({ triagem: { 'AJG': v === true || v === 'true' ? 'Sim' : '' } }),
  'jul.fund': v => ({ producao: { 'Voto - Descrição': v } }), 'jul.topico': v => ({ producao: { 'Tópico-síntese': v } })
};
/* ficha → campos do cartão (Monocráticas e urgências): o inverso de V, no vocabulário do app */
const INV = {
  tempest: r => r.triagem.Tempestividade, prelim: r => r.triagem['Prelim.'], intercor: r => r.triagem['Intercorrências'],
  preparo: r => ({ 'Comprovado': 'Comprovado', 'Não Recolhido': 'Não recolhido', 'Não se Aplica': 'Não se aplica' }[r.triagem.Preparo] || (r.triagem.Preparo === 'Dispensado' ? (r.triagem.AJG === 'Sim' ? 'Justiça gratuita' : 'Isento (DPU/ente público)') : '')),
  repres: r => { const v = r.triagem['Representação'], o = r.triagem['Observação da Representação'] || ''; return v === 'Regular' ? (/^Dispensada/.test(o) ? o : 'Regular') : v === 'Negativo' ? (/^Irregular/.test(o) ? o : 'Irregular') : ''; },
  midias: r => ({ 'Juntada': 'Juntadas', 'Faltante': 'Faltantes', 'Não se Aplica': 'Não se aplica' }[r.triagem['Mídias']] || ''),
  mpf: r => r.triagem['MPF - Custos Legis'] === 'Não' ? 'Sem hipótese' : r.triagem['MPF - Custos Legis'] === 'Sim' ? (r.triagem['Observação MPF'] || '') : '',
  parecer: r => ({ 'Com Parecer': 'Com parecer', 'Sem Parecer': 'Aguardando parecer' }[r.triagem.MPF] || ''),
  resJulg: r => r.producao['Voto - Resultado'], honor: r => r.producao['Voto - Honorários'], topico: r => r.producao['Tópico-síntese'],
  hip932: r => r.triagem['Hipóteses Monocrática'], tipoAto: r => r.producao['Mono - Tipo de ato'], fundamento: r => r.producao['Mono - Fundamento'],
  urgTipo: r => r.triagem['Urgência'], urgNivel: r => r.triagem['Urgência - Nível'], urgSit: r => r.triagem['Urgência - Apreciação'], urgPedido: r => r.triagem['Urgência - Data'],
  urgData: r => r.triagem['Urgência - Apreciada em'], urgObs: r => r.triagem['Urgência - Observação'], urgPainel: r => r.triagem['Urgência - Painel']
};
function paraCtl(r) {
  const o = {}, R = { triagem: (r && r.triagem) || {}, producao: (r && r.producao) || {} };
  Object.keys(INV).forEach(k => { const v = INV[k](R); if (v) o[k] = v; });
  return o;
}
/* regras dos Controles especiais, iguais em qualquer porta de entrada (ficha, páginas, CMT-monitor):
   monocrática registrada ganha a data; urgência registrada ganha a data do pedido e a apreciação pendente; quem alterou o grupo fica anotado */
function regras(r, out, u) {
  const t = r.triagem = r.triagem || {}, p = r.producao = r.producao || {}, c = r.controles = r.controles || {}, hj = agora().slice(0, 10), mud = new Set(out);
  if (mud.has('producao.Destino') && p.Destino === 'Monocrática' && !c['Monocrática - Registrada em']) { c['Monocrática - Registrada em'] = hj; out.push('controles.Monocrática - Registrada em'); }
  if (mud.has('triagem.Urgência') && t['Urgência']) {
    if (!t['Urgência - Data']) { t['Urgência - Data'] = hj; out.push('triagem.Urgência - Data'); }
    if (!t['Urgência - Apreciação']) { t['Urgência - Apreciação'] = 'Pendente · não apreciada'; out.push('triagem.Urgência - Apreciação'); }
  }
  const grupos = new Set();
  out.forEach(k => { const m = /^controles\.(Monocrática|Meta|Sobrestamento|Sensível) - /.exec(k); if (m) grupos.add(m[1]); });
  if (mud.has('producao.Destino')) grupos.add('Monocrática');
  if (u) grupos.forEach(g => { c[g + ' - Atualizado por'] = u; c[g + ' - Atualizado em'] = hj; });
}
/* ficha → cartão integral (inverso de VC): o valor gravado na ficha prevalece sobre o guardado no cartão */
const VCI = { tipoJ: ['triagem', 'Tipo de Julgamento'], especificidades: ['triagem', 'Especificidades'], questoes: ['triagem', 'Alegações'],
  'mpfx.sentido': ['triagem', 'Parecer - Sentido'], 'mpfx.id': ['triagem', 'ID do Parecer MPF'], 'adm.intim': ['triagem', 'Tempest - Publicação'],
  'adm.prot': ['triagem', 'Tempest - Protocolo'], 'adm.prazo': ['triagem', 'Tempest - Prazo legal'], 'adm.dobro': ['triagem', 'Tempest - Dobro', 1], 'adm.ajg': ['triagem', 'AJG', 1],
  'jul.fund': ['producao', 'Voto - Descrição'], 'jul.topico': ['producao', 'Tópico-síntese'] };
function paraCartao(r, base) {
  const c = JSON.parse(JSON.stringify(base || {}));
  Object.keys(VCI).forEach(p => { const [s, k, b] = VCI[p], v = ((r && r[s]) || {})[k]; if (!v) return;
    const ks = p.split('.'); let o = c; ks.slice(0, -1).forEach(x => { o = o[x] = (o[x] && typeof o[x] === 'object') ? o[x] : {}; }); o[ks[ks.length - 1]] = b ? v === 'Sim' : v; });
  return c;
}
/* grava {secao: {chave: valor}} no registro do processo (cria se faltar), com nova tentativa se o arquivo mudou no meio */
async function gravar(cnj, mud, msg, extra, u) {
  const F = await ficha();
  for (let t = 0; t < 4; t++) {
    const { doc, sha } = await lerOp(), r = registro(doc, cnj, F, true), out = aplica(r, mud);
    if (extra) extra(r, out);
    if (!out.length) return { r, out };
    regras(r, out, u);
    doc.atualizado_em = agora();
    try { await commitConferido([{ path: OP, txt: JSON.stringify(doc, null, 1) + '\n', sha }], msg + ' · ' + out.slice(0, 6).join(', ')); return { r, out }; }
    catch (e) { if (e.status !== 409) throw e; }
  }
  const e = new Error('A ficha mudou várias vezes seguidas; tente de novo.'); e.status = 409; throw e;
}
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
  if (out.length) { regras(r, out); doc.atualizado_em = agora(); arqs.push({ path: OP, txt: JSON.stringify(doc, null, 1) + '\n', sha }); }
  return commitConferido(arqs, msg + (out.length ? '\n\nFicha (operacional): ' + out.slice(0, 12).join(', ') : ''));
}
module.exports = async (req, res, u) => {
  try {
    const F = await ficha();
    if (req.method === 'GET') {
      const cnj = String(req.query.ficha || '');
      if (dg(cnj).length !== 20) return res.status(200).json({ ficha: F });
      const [{ doc }, fonte] = await Promise.all([lerOp(), fonteDe(cnj)]);
      /* Controles especiais: o registro do operacional diz o que já foi registrado; as listas do acervo dizem se o processo entra na meta, no sobrestamento ou nos casos sensíveis */
      const naLista = mod => require(mod).base().then(B => (Array.isArray(B) ? B : B.lista).find(x => dg(x.cnj) === dg(cnj)) || null).catch(() => null);
      const [bMeta, bSobr, bSens] = await Promise.all([naLista('./_metas'), naLista('./_sobr'), naLista('./_sens')]);
      const op = registro(doc, cnj, F, false) || null;
      return res.status(200).json({ ficha: F, operacional: op, fonte, gestor: L.gestor(u), controles: ativos(op, { metas: bMeta, sobrestados: bSobr, sensiveis: bSens }) });
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
    const { r, out } = await gravar(cnj, mud, 'Ficha (' + u + '): ' + cnj, null, u);
    return res.status(200).json(Object.assign({ ok: true, operacional: r, recusados: recus }, out.length ? {} : { semMudanca: true }));
  } catch (e) { res.status(e.status === 404 ? 404 : e.status === 409 ? 409 : 500).json({ erro: e.message }); }
};
/* quais grupos dos Controles especiais valem para o processo */
function ativos(op, lista) {
  const t = (op && op.triagem) || {}, p = (op && op.producao) || {}, c = (op && op.controles) || {};
  return { urgencia: !!t['Urgência'], monocratica: p.Destino === 'Monocrática', meta: !!lista.metas, sobrestamento: !!lista.sobrestados,
    sensivel: c['Sensível - Excluído'] !== 'Sim' && (!!lista.sensiveis || c['Sensível - Incluído'] === 'Sim'), naLista: lista };
}
module.exports.espelho = espelho;
module.exports.gravar = gravar;
module.exports.paraCtl = paraCtl;
module.exports.paraCartao = paraCartao;
module.exports.lerOp = lerOp;
module.exports.ativos = ativos;
module.exports.doCartao = doCartao;
