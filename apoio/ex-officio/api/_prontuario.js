/* Prontuário completo do processo (extensão Muta), guardado no GitHub e ligado à ficha e ao cartão da pauta.
   Servido por /api/pauta (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam):
   GET  /api/pauta?prontuario=<CNJ>
        { prontuario, atualizadoEm, atualizadoPor, cartoes: [{ sessao, item, lista, cartao, ctl, servidor, corretor, editadoEm }] }
        prontuario: o arquivo acervo/prontuarios/<20 dígitos>.json (null se ainda não existe);
        cartoes: o cartão do processo nas pautas de hoje em diante (o prontuário da Ex Officio e da LIA).
   POST /api/pauta?prontuario=1 { cnj, prontuario, base, campos, cartao }
        prontuario: o objeto completo, gravado em acervo/prontuarios/<20 dígitos>.json;
        base: o atualizadoEm que o cliente leu ('' = arquivo novo); se o arquivo mudou depois disso, 409 com o atual;
        campos: { 'triagem.Tempestividade': 'Tempestivo', … } vão à ficha (acervo/operacional.json), com as regras da ficha
          (só campos editáveis; designação só do gestor) e, o que tem correspondência, ao cartão da pauta;
        cartao: { pecas, recursos, orig, … } vai direto ao cartão das pautas onde o processo está.
        Tudo num só commit, com nova tentativa se algum arquivo mudou no meio. */
const L = require('./_lib'), FICHA = require('./_ficha');
const DIR = 'acervo/prontuarios/', OP = 'acervo/operacional.json';
const SO_GESTOR = new Set(['producao.SERVIDOR', 'producao.CORRETOR']);
/* chaves do cartão que a extensão pode gravar direto (as demais vêm pela ficha) */
const CARTAO_OK = new Set(['pecas', 'recursos', 'orig', 'questoes', 'especificidades', 'sintese', 'subassuntos', 'relacionado', 'rel', 'adm', 'jul', 'ed', 'agint', 'jr', 'ai', 'rem', 'tipoJ', 'obsGeral']);
const MAX = 400 * 1024;
const dg = s => String(s || '').replace(/\D/g, '');
const agora = () => new Date().toISOString();
const caminho = cnj => DIR + dg(cnj) + '.json';

async function lerProntuario(cnj) {
  try { const { dados, sha } = await L.lerJson(caminho(cnj)); return { doc: dados, sha }; }
  catch (e) { if (e.status === 404) return { doc: null, sha: null }; throw e; }
}
function limpo(v, prof) {
  if (prof > 8) return undefined;
  if (v == null) return v;
  if (Array.isArray(v)) return v.slice(0, 200).map(x => limpo(x, prof + 1));
  if (typeof v === 'object') { const o = {}; Object.keys(v).slice(0, 300).forEach(k => { const x = limpo(v[k], prof + 1); if (x !== undefined) o[String(k).slice(0, 80)] = x; }); return o; }
  if (typeof v === 'string') return v.slice(0, 60000);
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  return undefined;
}
function cartoesDe(locais) {
  const out = [];
  locais.forEach(a => a.its.forEach(it => {
    const c = it.ctl || {}, ctl = {};
    ['mpf', 'parecer', 'prelim', 'tempest', 'preparo', 'repres', 'midias', 'resJulg', 'consect', 'honor', 'topico', 'intercor'].forEach(k => { if (c[k]) ctl[k] = c[k]; });
    out.push({ sessao: a.path.replace(/^.*\/(\d{4}-\d{2}-\d{2})\.json$/, '$1'), item: it.item || '', lista: (a.dados.itens || []).indexOf(it) >= 0 ? 'itens' : 'previa',
      cartao: c.cartao || {}, ctl, servidor: it.servidor || '', corretor: it.corretor || '', resultado: it.resultado || '',
      dataMinuta: it.dataMinuta || '', dataCorrecao: it.dataCorrecao || '', dataLiberacao: it.dataLiberacao || '', editadoEm: c.editadoEm || '', editadoPor: c.editadoPor || '' });
  }));
  return out;
}
function camposFicha(F, C, u) {
  const E = FICHA.editaveis(F), mud = {}, recus = [];
  Object.keys(C || {}).forEach(k => {
    if (!E[k] || (SO_GESTOR.has(k) && !L.gestor(u))) { recus.push(k); return; }
    let v = C[k];
    if (E[k].tipo === 'tabela') { const cols = (E[k].colunas || []).map(c => c.chave); v = (Array.isArray(v) ? v : []).slice(0, 60).map(l => { const o = {}; cols.forEach(c => { const x = l && l[c]; if (x != null && String(x).trim()) o[c] = String(x).slice(0, 4000); }); return o; }).filter(o => Object.keys(o).length); }
    else if (typeof v === 'object' && v !== null) { recus.push(k); return; }
    else v = String(v == null ? '' : v).slice(0, 20000);
    const i = k.indexOf('.'); (mud[k.slice(0, i)] = mud[k.slice(0, i)] || {})[k.slice(i + 1)] = v;
  });
  return { mud, recus };
}
function cartaoOk(c) {
  const o = {};
  Object.keys(c || {}).forEach(k => { if (CARTAO_OK.has(k)) o[k] = limpo(c[k], 0); });
  return o;
}
const obj = x => x && typeof x === 'object' && !Array.isArray(x);
function junta(a, b) {
  if (!obj(a) || !obj(b)) return b;
  const o = Object.assign({}, a); Object.keys(b).forEach(k => { o[k] = junta(a[k], b[k]); }); return o;
}
/* aplica o patch do cartão num item da pauta; devolve as chaves que mudaram */
function aplicaPatch(it, patch, u) {
  it.ctl = it.ctl || {}; const ant = it.ctl.cartao || {}, mud = [];
  Object.keys(patch).forEach(k => {
    /* objetos (orig, adm, jul…) se juntam ao que já existe, em qualquer nível; listas e textos substituem */
    const v = junta(ant[k], patch[k]);
    if (JSON.stringify(ant[k]) !== JSON.stringify(v)) { ant[k] = v; mud.push('cartao.' + k); }
  });
  if (mud.length) { it.ctl.cartao = ant; it.ctl.editadoPor = u; it.ctl.editadoEm = agora(); }
  return mud;
}
async function commit(arqs, msg) {
  try { return await L.commitArquivos(arqs, msg); }
  catch (e) { if (e.status === 422) e.status = 409; throw e; }
}

module.exports = async (req, res, u) => {
  try {
    if (req.method === 'GET') {
      const cnj = String(req.query.prontuario || '');
      if (dg(cnj).length !== 20) return res.status(400).json({ erro: 'número do processo inválido' });
      const [{ doc }, locais] = await Promise.all([lerProntuario(cnj), FICHA.ondeEsta(cnj).catch(() => [])]);
      return res.status(200).json({ processo: cnj, prontuario: doc ? doc.prontuario || null : null, atualizadoEm: doc ? doc.atualizadoEm || '' : '',
        atualizadoPor: doc ? doc.atualizadoPor || '' : '', cartoes: cartoesDe(locais) });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, cnj = String(b.cnj || '');
    if (dg(cnj).length !== 20) return res.status(400).json({ erro: 'número do processo inválido' });
    const pr = b.prontuario && typeof b.prontuario === 'object' && !Array.isArray(b.prontuario) ? limpo(b.prontuario, 0) : null;
    if (b.prontuario != null && !pr) return res.status(400).json({ erro: 'prontuário inválido' });
    const txtP = pr ? JSON.stringify(pr) : '';
    if (txtP.length > MAX) return res.status(413).json({ erro: 'prontuário grande demais (' + Math.round(txtP.length / 1024) + ' KB)' });
    const F = await FICHA.catalogo(), { mud, recus } = camposFicha(F, b.campos, u), patch = cartaoOk(b.cartao);
    for (let t = 0; t < 4; t++) {
      const arqs = [], feito = [], { doc: atual, sha: shaP } = await lerProntuario(cnj);
      const quando = agora();
      /* prontuário: conflito se outra pessoa gravou depois da leitura do cliente */
      if (pr) {
        if (typeof b.base === 'string' && atual && (atual.atualizadoEm || '') !== b.base)
          return res.status(409).json({ erro: 'O prontuário foi alterado por ' + (atual.atualizadoPor || 'outra pessoa') + ' depois da sua leitura.', conflito: true,
            prontuario: atual.prontuario || null, atualizadoEm: atual.atualizadoEm || '', atualizadoPor: atual.atualizadoPor || '' });
        if (!atual || JSON.stringify(atual.prontuario) !== txtP) {
          const novo = { schema: 'gabcmt.prontuario', versao: 1, processo: cnj, atualizadoEm: quando, atualizadoPor: u, prontuario: pr };
          arqs.push({ path: caminho(cnj), txt: JSON.stringify(novo, null, 1) + '\n', sha: shaP || undefined }); feito.push('prontuário');
        }
      }
      /* ficha e, pelo espelho da ficha, o cartão */
      let fichaOut = [], op = null;
      const locais = (Object.keys(mud).length || Object.keys(patch).length) ? await FICHA.ondeEsta(cnj) : [];
      if (Object.keys(mud).length) {
        const { doc, sha } = await FICHA.lerOp(), r = FICHA.registro(doc, cnj, F, true);
        fichaOut = FICHA.aplica(r, mud);
        if (fichaOut.length) {
          FICHA.regras(r, fichaOut, u); doc.atualizado_em = quando; op = r;
          arqs.push({ path: OP, txt: JSON.stringify(doc, null, 1) + '\n', sha });
          locais.forEach(a => a.its.forEach(it => { if (FICHA.aplicaCartao(it, FICHA.paraCartao(mud, it), u)) a.mudou = true; }));
          feito.push('ficha: ' + fichaOut.slice(0, 6).join(', '));
        }
      }
      /* cartão direto (peças, recursos, decisão de origem…) */
      const cart = [];
      if (Object.keys(patch).length) locais.forEach(a => a.its.forEach(it => { const m = aplicaPatch(it, patch, u); if (m.length) { a.mudou = true; m.forEach(x => { if (cart.indexOf(x) < 0) cart.push(x); }); } }));
      if (cart.length) feito.push(cart.slice(0, 6).join(', '));
      locais.filter(a => a.mudou).forEach(a => { a.dados.atualizadoEm = quando; arqs.push({ path: a.path, txt: JSON.stringify(a.dados, null, 1) + '\n', sha: a.sha }); });
      if (!arqs.length) return res.status(200).json({ ok: true, semMudanca: true, atualizadoEm: atual ? atual.atualizadoEm || '' : '', recusados: recus });
      try {
        await commit(arqs, 'Prontuário (' + u + '): ' + cnj + ' · ' + feito.join(' · ') + (locais.some(a => a.mudou) ? '\n\nCartão atualizado em: ' + locais.filter(a => a.mudou).map(a => a.path).join(', ') : ''));
        const novoEm = arqs.some(a => a.path === caminho(cnj)) ? quando : (atual ? atual.atualizadoEm || '' : '');
        return res.status(200).json({ ok: true, atualizadoEm: novoEm, atualizadoPor: u, operacional: op, ficha: fichaOut, cartao: cart,
          cartoes: cartoesDe(locais), recusados: recus });
      } catch (e) { if (e.status !== 409) throw e; }
    }
    return res.status(409).json({ erro: 'Os arquivos mudaram várias vezes seguidas; tente de novo.' });
  } catch (e) { res.status(e.status === 404 ? 404 : e.status === 409 ? 409 : 500).json({ erro: e.message }); }
};
module.exports.caminho = caminho;
