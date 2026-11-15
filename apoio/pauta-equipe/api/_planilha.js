/* Planilhas do Google Drive ⇄ Pauta da equipe (sincronização quase em tempo real, pelo Apps Script em scripts/drive/apps-script/).
   Autenticação própria: cabeçalho X-CMT-Planilha igual à variável CMT_PLANILHA_TOKEN da Vercel (24+ caracteres).
   Quem grava aparece como "Planilha Google"; a planilha é ferramenta do gestor, então pode designar servidor e revisor e registrar o desfecho.
   GET  /api/pauta?planilha=1&v=<commit>   se o repositório não mudou desde <commit>: {igual:true}; senão, tudo o que as planilhas mostram:
        pautas      [{data, arquivo, bimestre, aba, r1, e3, k3, linhas}]  linhas no molde Controle de Pauta (colunas A..Y, a partir da linha 21)
        mono        {cab, abas: {'nov-2026': [linhas]}}                    uma aba por mês de registro
        controles   {Metas: {cab, linhas}, Sobrestados: {...}, 'Casos sensíveis': {...}}
        Células como texto de exibição (datas dd/mm/aaaa). Na pauta, F (Pendências) é fórmula do molde e vai vazia.
   POST /api/pauta?planilha=1 {edicoes: [{tipo: pauta|mono|metas|sobr|sens, data?, cnj, coluna, valor}]}
        cada célula editada vira o campo correspondente do app; colunas sem campo (processo, classe, fórmulas…) são ignoradas. */
const crypto = require('crypto');
const L = require('./_lib'), FICHA = require('./_ficha'), AC = require('./_acomp');
const QUEM = 'Planilha Google';
const dg = s => String(s || '').replace(/\D/g, '');
const br = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : (d || ''); };
const iso = v => { const s = String(v || '').trim(), m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0') : /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''; };
const nq = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const hoje = () => new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);   /* America/Cuiaba */
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function autorizado(req) {
  const t = String(process.env.CMT_PLANILHA_TOKEN || ''), h = String(req.headers['x-cmt-planilha'] || '');
  if (t.length < 24 || !h) return false;
  const a = Buffer.from(t), b = Buffer.from(h); return a.length === b.length && crypto.timingSafeEqual(a, b);
}
/* chama um módulo da API como se fosse uma requisição GET e devolve o JSON */
function chama(fn, query) {
  return new Promise((ok, er) => {
    const res = { _s: 200, setHeader() { return res; }, status(c) { res._s = c; return res; }, json(o) { if (res._s >= 400) er(new Error((o && o.erro) || 'HTTP ' + res._s)); else ok(o); return res; }, end() { ok({}); return res; } };
    Promise.resolve(fn({ method: 'GET', query, headers: {}, body: null }, res, QUEM)).catch(er);
  });
}

/* ---------- mesmas regras de exibição da Pauta da equipe (index.html) ---------- */
const SIG = { 'Apelação': '1º julg', 'Agravo de Instrumento': '1º julg', 'Remessa Necessária': '1º julg', 'Embargos de Declaração': 'ED', 'Agravo Interno': 'AgInt', 'Juízo de Retratação': 'Retrat' };
function clSig(c) { c = nq(c); if (/agravo de instrumento/.test(c)) return 'AI'; if (/apelac/.test(c) && /remessa/.test(c)) return 'AC/RN'; if (/remessa/.test(c)) return 'RN'; if (/apelac/.test(c)) return 'AC'; if (/agravo interno/.test(c)) return 'AgInt'; if (/embargos/.test(c)) return 'ED'; return (c || '—').toUpperCase().slice(0, 10); }
function tipoJ(it) { const C = (it.ctl || {}).cartao || {}; if (C.tipoJ) return C.tipoJ; const k = it.julgamento || '', c = nq(it.classe);
  if (k === 'ED') return 'Embargos de Declaração'; if (k === 'AgInt') return 'Agravo Interno'; if (k === 'JR') return 'Juízo de Retratação';
  if (/agravo de instrumento/.test(c)) return 'Agravo de Instrumento'; if (/remessa/.test(c) && !/apelac/.test(c)) return 'Remessa Necessária'; return 'Apelação'; }
function alertas(it) { const c = it.ctl || {}, A = []; if (c.tempest === 'Intempestivo') A.push('Intempestivo'); if (c.preparo === 'Não recolhido') A.push('Preparo não recolhido'); if (/^Irregular/.test(c.repres || '')) A.push('Representação irregular');
  if (c.midias === 'Faltantes') A.push('Mídias faltantes'); if (c.mpf && c.mpf !== 'Sem hipótese' && c.parecer && c.parecer !== 'Com parecer') A.push('Parecer do MPF pendente'); return A; }
const etapa = it => it.assinado || it.dataAssinatura ? 'Assinada' : it.dataLiberacao ? 'Liberado' : it.dataCorrecao ? 'Corrigido' : it.dataMinuta ? 'Minutado' : 'A fazer';
const etMono = v => ({ Corrigido: 'Revisado', Liberado: 'Para assinatura' }[v] || v);
const diasDesde = d => d ? Math.max(0, Math.round((new Date(hoje() + 'T12:00:00Z') - new Date(d + 'T12:00:00Z')) / 864e5)) : null;
function metasPend(x) { const A = [], d = diasDesde(x.desde), gab = /No gabinete|Preparo|Monocr/.test(x.fase); if (x.fase === 'Encerrado') return A;
  if (gab && !x.servidor) A.push('sem minutante'); if (gab && d != null && d > 60) A.push('parado há ' + d + ' dias');
  if (x.pend1 && !x.sessoes.length && /gabinete|Preparo/.test(x.fase)) A.push('sem pauta'); if (x.acomp.prazo && x.acomp.prazo < hoje()) A.push('providência vencida'); return A; }
const sbMotivo = x => x.acomp.motivo || x.motivoAuto;
const sbTema = x => x.acomp.tema || (x.temasAuto || []).join(', ');
function sbAlerta(x) { const a = x.acomp, A = []; if (/apto a retirar|retirar$/.test(a.sitPrec || '')) A.push('retirar o sobrestamento'); if (a.previsao && a.previsao < hoje()) A.push('previsão vencida'); if (x.analisarPeticao) A.push('petição a analisar'); if (!sbTema(x)) A.push('tema não identificado'); return A; }
const snCat = x => x.acomp.cat || x.catAuto || 'Outro';
function snAlerta(x) { const a = x.acomp, A = []; if (a.proxVer && a.proxVer <= hoje()) A.push('verificação ' + (a.proxVer < hoje() ? 'vencida' : 'hoje')); if (/Pendente de cumprimento|Descumprimento/.test(a.cumprimento || '')) A.push(a.cumprimento.toLowerCase());
  if (/pendente de apreciação/.test(a.decisao || '')) A.push('pedido a apreciar'); return A; }

/* ---------- cabeçalhos e colunas editáveis (cabeçalho da planilha → campo do app) ---------- */
const PAUTA_CAB = ['Item', 'Processo', 'Classe', 'Assunto', 'Detalhes', 'Pendências', 'Etapa', 'Minutado em', 'Servidor', 'Revisor', 'Intervenção MPF', 'Parecer MPF', 'Preliminares', 'Tempestividade', 'Preparo', 'Representação', 'Mídias', 'Resultado', 'Consectários', 'Honorários', 'Tópico-síntese', 'Desfecho', 'Intercorrência', 'Meta', 'Apreciação'];
const PAUTA_ED = { 'Detalhes': 'obs', 'Minutado em': 'dataMinuta', 'Servidor': 'servidor', 'Revisor': 'corretor', 'Intervenção MPF': 'mpf', 'Parecer MPF': 'parecer', 'Preliminares': 'prelim', 'Tempestividade': 'tempest',
  'Preparo': 'preparo', 'Representação': 'repres', 'Mídias': 'midias', 'Resultado': 'resJulg', 'Consectários': 'consect', 'Honorários': 'honor', 'Tópico-síntese': 'topico', 'Desfecho': 'resultado', 'Intercorrência': 'intercor' };
const MONO_CAB = ['Nº', 'Processo', 'Classe', 'Assunto', 'Tarefa no PJe', 'Na tarefa desde', 'Pedido urgente', 'Tipo de ato', 'Hipótese art. 932', 'Detalhes', 'Pendências', 'Etapa', 'Minutado em', 'Servidor', 'Revisor', 'Resultado', 'Honorários', 'Tópico-síntese', 'Intercorrência', 'Revisado em', 'Para assinatura em', 'Registrada em'];
const MONO_ED = { 'Tipo de ato': 'tipoAto', 'Hipótese art. 932': 'hip932', 'Detalhes': 'obs', 'Minutado em': 'dataMinuta', 'Servidor': 'servidor', 'Revisor': 'corretor', 'Resultado': 'resJulg', 'Honorários': 'honor',
  'Tópico-síntese': 'topico', 'Intercorrência': 'intercor', 'Revisado em': 'dataCorrecao', 'Para assinatura em': 'dataLiberacao' };
const CTRL = {
  metas: { aba: 'Metas', cab: ['Meta', 'Processo', 'Partes', 'Classe', 'Assunto', 'Distribuído', 'Fase', 'Tarefa no PJe', 'Na tarefa desde', 'Última pauta', 'Minutante', 'Pendências', 'Controle', 'Próxima providência', 'Prazo', 'Responsável', 'Observação'],
    ed: { 'Controle': 'ctrl', 'Próxima providência': 'prox', 'Prazo': 'prazo', 'Responsável': 'resp', 'Observação': 'obs' }, pref: 'Meta', rotulo: 'Metas' },
  sobr: { aba: 'Sobrestados', cab: ['Processo', 'Partes', 'Classe', 'Assunto', 'Tarefa no PJe', 'Desde', 'Motivo', 'Tema ou precedente', 'Situação do precedente', 'Previsão de retirada', 'Sem previsão', 'Atenção', 'Próxima providência', 'Responsável', 'Observação'],
    ed: { 'Motivo': 'motivo', 'Tema ou precedente': 'tema', 'Situação do precedente': 'sitPrec', 'Previsão de retirada': 'previsao', 'Sem previsão': 'semPrev', 'Próxima providência': 'prox', 'Responsável': 'resp', 'Observação': 'obs' }, pref: 'Sobrestamento', rotulo: 'Sobrestados' },
  sens: { aba: 'Casos sensíveis', cab: ['Processo', 'Partes', 'Categoria', 'Assunto', 'Tarefa no PJe', 'Quadro / motivo', 'Decisão', 'Cumprimento', 'Última verificação', 'Próxima verificação', 'Atenção', 'Próxima providência', 'Responsável', 'Observação'],
    ed: { 'Categoria': 'cat', 'Quadro / motivo': 'quadro', 'Decisão': 'decisao', 'Cumprimento': 'cumprimento', 'Última verificação': 'ultimo', 'Próxima verificação': 'proxVer', 'Próxima providência': 'prox', 'Responsável': 'resp', 'Observação': 'obs' }, pref: 'Sensível', rotulo: 'Casos sensíveis' }
};
const DATAS = new Set(['dataMinuta', 'dataCorrecao', 'dataLiberacao', 'prazo', 'previsao', 'ultimo', 'proxVer']);
const s = v => (v == null ? '' : String(v));

/* ---------- leitura: o que cada planilha mostra ---------- */
function bimestral(d) { const a = +d.slice(0, 4), m = +d.slice(5, 7), b = Math.floor((m + 1) / 2); return { arquivo: 'Pauta_' + a + '_' + b + 'o_bimestre_' + MESES[2 * b - 2] + '-' + MESES[2 * b - 1] + ' (Pauta da equipe)', bimestre: a + '-' + b }; }
function linhaPauta(it) {
  const c = it.ctl || {}, so = c.sopref || '', tag = so ? (/^Pref/.test(so) ? '#Pref' : '#SO') : '';
  let det = s(it.obs); if (tag && nq(det).indexOf(nq(tag)) < 0) det = (det + ' ' + tag).trim();
  const et = etapa(it);
  return [s(it.item), s(it.cnj), clSig(it.classe), s(it.assunto), det, '', et === 'Assinada' ? 'Liberado' : et, br(it.dataMinuta), s(it.servidor), s(it.corretor), s(c.mpf), s(c.parecer), s(c.prelim), s(c.tempest), s(c.preparo), s(c.repres), s(c.midias),
    s(c.resJulg), s(c.consect), s(c.honor), s(c.topico), s(it.resultado), s(c.intercor), s(c.meta), SIG[tipoJ(it)] || '1º julg'];
}
async function lerPautas() {
  const cal = (await L.lerJson('acervo/sessoes/calendario.json')).dados, out = [];
  for (const x of (cal.sessoes || []).filter(x => x.publicada && L.dataOk(x.date)).sort((a, b) => b.date.localeCompare(a.date))) {
    let d; try { d = (await L.lerJson('acervo/sessoes/' + x.date + '.json')).dados; } catch (e) { continue; }
    const itens = d.itens || []; if (!itens.length) continue;
    const mk = x.marcos || {};
    out.push(Object.assign({ data: x.date, aba: 'Sessão ' + x.date.slice(8, 10) + '-' + x.date.slice(5, 7), r1: br(x.date), e3: br(mk.entregaMinutas || ''), k3: br(mk.liberacao || ''), linhas: itens.slice(0, 300).map(linhaPauta) }, bimestral(x.date)));
  }
  return out;
}
function linhaMono(it) {
  const c = it.ctl || {};
  return [s(it.item), s(it.cnj), clSig(it.classe), s(it.assunto), s(it.tarefa), br(it.desde), s(c.urgTipo), s(c.tipoAto), s(c.hip932), s(it.obs), alertas(it).join(' · '), etMono(etapa(it)), br(it.dataMinuta), s(it.servidor), s(it.corretor),
    s(c.resJulg), s(c.honor), s(c.topico), s(c.intercor), br(it.dataCorrecao), br(it.dataLiberacao), br(String(it.monoEm || '').slice(0, 10))];
}
async function lerMono() {
  const d = await chama(require('./_mono'), { mono: '1' }), abas = {}, ordem = {};
  (d.itens || []).forEach(it => {
    const v = String(it.monoEm || '').slice(0, 10) || it.dataMinuta || '', k = /^\d{4}-\d{2}/.test(v) ? v.slice(0, 7) : '';
    const aba = k ? MESES[+k.slice(5, 7) - 1] + '-' + k.slice(0, 4) : 'Sem data';
    (abas[aba] = abas[aba] || []).push(linhaMono(it)); ordem[aba] = k || '9999';
  });
  const out = {}; Object.keys(abas).sort((a, b) => ordem[a].localeCompare(ordem[b])).forEach(a => { out[a] = abas[a]; });
  return { cab: MONO_CAB, abas: out };
}
async function lerControles() {
  const [m, sb, sn] = await Promise.all([chama(require('./_metas'), { metas: '1' }), chama(require('./_sobr'), { sobr: '1' }), chama(require('./_sens'), { sens: '1' })]);
  const M = (m.itens || []).slice().sort((a, b) => (+a.metas[0] - +b.metas[0]) || String(a.dist).localeCompare(String(b.dist)));
  const SB = (sb.itens || []).slice().sort((a, b) => String(a.desde).localeCompare(String(b.desde)));
  const SN = (sn.itens || []).slice().sort((a, b) => { const u = snAlerta(b).length - snAlerta(a).length; return u || String(a.acomp.proxVer || '9').localeCompare(String(b.acomp.proxVer || '9')); });
  return {
    'Metas': { cab: CTRL.metas.cab, linhas: M.map(x => { const z = x.sessoes[x.sessoes.length - 1], a = x.acomp; return [x.metas.map(n => 'Meta ' + n).join(', '), x.cnj, x.partes, x.classe, x.assunto, br(x.dist), x.fase, x.tarefa, br(x.desde), z ? br(z.data) + (z.item ? ' · item ' + z.item : '') : '', s(x.servidor), metasPend(x).join(' · '), s(a.ctrl), s(a.prox), br(a.prazo), s(a.resp), s(a.obs)]; }) },
    'Sobrestados': { cab: CTRL.sobr.cab, linhas: SB.map(x => { const a = x.acomp; return [x.cnj, x.partes, x.classe, x.assunto, x.tarefa, br(x.desde), sbMotivo(x), sbTema(x), s(a.sitPrec), br(a.previsao), s(a.semPrev), sbAlerta(x).join(' · '), s(a.prox), s(a.resp), s(a.obs)]; }) },
    'Casos sensíveis': { cab: CTRL.sens.cab, linhas: SN.map(x => { const a = x.acomp; return [x.cnj, x.partes, snCat(x), x.assunto, x.tarefa, s(a.quadro), s(a.decisao), s(a.cumprimento), br(a.ultimo), br(a.proxVer), snAlerta(x).join(' · '), s(a.prox), s(a.resp), s(a.obs)]; }) }
  };
}

/* ---------- gravação: células editadas → campos do app ---------- */
function valorCampo(campo, v) { v = s(v).trim(); return DATAS.has(campo) ? iso(v) : v; }
/* Etapa digitada na planilha → datas (as que já existem ficam; as posteriores à etapa escolhida são apagadas) */
function datasDaEtapa(et, it) {
  const h = hoje(), m = it.dataMinuta || h, c = it.dataCorrecao || h, l = it.dataLiberacao || h;
  et = nq(et);
  if (/^(liberado|para assinatura)/.test(et)) return { dataMinuta: m, dataCorrecao: c, dataLiberacao: l };
  if (/^(corrigido|revisado)/.test(et)) return { dataMinuta: m, dataCorrecao: c, dataLiberacao: '' };
  if (/^minutado/.test(et)) return { dataMinuta: m, dataCorrecao: '', dataLiberacao: '' };
  if (/^a fazer/.test(et) || !et) return { dataMinuta: '', dataCorrecao: '', dataLiberacao: '' };
  return null;
}
async function gravarPauta(data, cnj, cels) {
  const PAUTA = require('./pauta'), C = {};
  if ('Etapa' in cels) {
    const it = ((await L.lerJson('acervo/sessoes/' + data + '.json')).dados.itens || []).find(i => dg(i.cnj) === dg(cnj));
    if (!it) return { erro: 'processo fora desta pauta' };
    const d = datasDaEtapa(cels.Etapa, it); if (d) Object.assign(C, d);
  }
  Object.keys(cels).forEach(col => { const k = PAUTA_ED[col]; if (k) C[k] = valorCampo(k, cels[col]); });
  if ('Detalhes' in cels) {   /* #SO / #Pref no texto = sustentação oral / preferência */
    const t = s(cels.Detalhes); C.obs = t.replace(/\s*#(SO|Pref)\b/gi, '').trim();
    C.sopref = /#Pref\b/i.test(t) ? 'Preferência' : /#SO\b/i.test(t) ? '__manter_ou_presencial' : '';
    if (C.sopref === '__manter_ou_presencial') { const it = ((await L.lerJson('acervo/sessoes/' + data + '.json')).dados.itens || []).find(i => dg(i.cnj) === dg(cnj)); const at = ((it || {}).ctl || {}).sopref || ''; C.sopref = /^(Virtual|Presencial)$/.test(at) ? at : 'Presencial'; }
  }
  if (!Object.keys(C).length) return { ignorado: true };
  const r = await PAUTA.gravarItem(data, { cnj, campos: C }, QUEM, true);
  return r.status === 200 ? { ok: true, semMudanca: !!r.body.semMudanca } : { erro: r.body.erro || 'HTTP ' + r.status };
}
async function gravarMono(cnj, cels) {
  const MONO = require('./_mono'), C = {};
  if ('Etapa' in cels) {
    const { doc } = await FICHA.lerOp(), r = (doc.registros || []).find(x => dg(x.processo) === dg(cnj));
    const d = datasDaEtapa(cels.Etapa, r ? MONO.item(r) : {}); if (d) Object.assign(C, d);
  }
  Object.keys(cels).forEach(col => { const k = MONO_ED[col]; if (k) C[k] = valorCampo(k, cels[col]); });
  if (!Object.keys(C).length) return { ignorado: true };
  const o = await MONO.gravarMono(cnj, C, QUEM, true);
  return { ok: true, semMudanca: !!o.semMudanca };
}
async function gravarCtrl(tipo, cnj, cels) {
  const K = CTRL[tipo], M = require({ metas: './_metas', sobr: './_sobr', sens: './_sens' }[tipo]).MAPA, C = {};
  Object.keys(cels).forEach(col => { const k = K.ed[col]; if (k) C[k] = valorCampo(k, cels[col]); });
  if (!Object.keys(C).length) return { ignorado: true };
  const o = await AC.gravar(cnj, C, M, K.pref, QUEM, K.rotulo);
  return { ok: true, semMudanca: !!o.semMudanca };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!autorizado(req)) return res.status(401).json({ erro: 'token da planilha ausente ou errado' });
  try {
    if (req.method === 'GET') {
      const ref = await L.gh('/git/ref/heads/main'), v = ref.object.sha;
      if (req.query.v && req.query.v === v) return res.status(200).json({ igual: true, v });
      /* o operacional (13 MB) é lido uma vez só nesta resposta, para todos os módulos */
      const orig = FICHA.lerOp; let p = null; FICHA.lerOp = () => p || (p = orig());
      try {
        const [pautas, mono, controles] = await Promise.all([lerPautas(), lerMono(), lerControles()]);
        return res.status(200).json({ v, geradoEm: new Date().toISOString(), pautaCab: PAUTA_CAB, pautas, mono, controles });
      } finally { FICHA.lerOp = orig; }
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const E = ((req.body || {}).edicoes || []).filter(e => e && e.tipo && dg(e.cnj).length === 20 && e.coluna).slice(0, 500);
    /* agrupa por processo: um commit por processo */
    const G = {}; E.forEach(e => { const k = e.tipo + '|' + (e.data || '') + '|' + dg(e.cnj); (G[k] = G[k] || { tipo: e.tipo, data: e.data || '', cnj: String(e.cnj).trim(), cels: {} }).cels[String(e.coluna).trim()] = e.valor; });
    const resultados = [];
    for (const g of Object.values(G)) {
      let r;
      try {
        if (g.tipo === 'pauta') r = L.dataOk(g.data) ? await gravarPauta(g.data, g.cnj, g.cels) : { erro: 'data da sessão inválida' };
        else if (g.tipo === 'mono') r = await gravarMono(g.cnj, g.cels);
        else if (CTRL[g.tipo]) r = await gravarCtrl(g.tipo, g.cnj, g.cels);
        else r = { erro: 'tipo desconhecido' };
      } catch (e) { r = { erro: e.message }; }
      resultados.push(Object.assign({ tipo: g.tipo, data: g.data, cnj: g.cnj, colunas: Object.keys(g.cels) }, r));
    }
    res.status(200).json({ ok: resultados.every(r => !r.erro), resultados });
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
module.exports.datasDaEtapa = datasDaEtapa;
