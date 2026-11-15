/* Casos sensíveis: saúde (medicamento, oncológico, cirurgia, tratamento) e outros que pedem acompanhamento mais próximo.
   Lista do acervo pelo assunto e pelas etiquetas, mais os incluídos à mão pela equipe; acompanhamento em acervo/sensiveis.json.
   Servido por /api/pauta?sens=1 (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam).
   GET  /api/pauta?sens=1                      casos com dados do acervo e acompanhamento
   POST /api/pauta?sens=1 {cnj, campos}        grava o acompanhamento; campos.incluir = true inclui um processo à mão */
const L = require('./_lib');
const ARQ = 'acervo/sensiveis.json', CAMPOS = ['cat', 'quadro', 'decisao', 'cumprimento', 'ultimo', 'proxVer', 'prox', 'resp', 'obs', 'excluido'];
const dg = s => String(s || '').replace(/\D/g, '');
const iso = v => { const s = String(v || '').trim(), m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + m[2] + '-' + m[1] : /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''; };
const SAUDE = /medicament|oncol[oó]g|cirurg|home care|tratamento (m[eé]dico|domiciliar)|assist[eê]ncia (à|a) sa[uú]de|assist[eê]ncia m[eé]dico|servi[cç]os de sa[uú]de|n[aã]o padronizado|registrado na anvisa|interna[cç][aã]o|leito|pr[oó]tese|[oó]rtese|insumo|sistema [uú]nico de sa[uú]de/i;
const NAO = /ressarcimento|servi[cç]o militar|aptid[aã]o f[ií]sica|multas/i;
function cat(s) { return /oncol/i.test(s) ? 'Saúde · oncológico' : /medicament|n[aã]o padronizado|anvisa|insumo/i.test(s) ? 'Saúde · medicamento' : /cirurg|interna|leito|pr[oó]tese|[oó]rtese/i.test(s) ? 'Saúde · cirurgia ou internação' : /home care|tratamento/i.test(s) ? 'Saúde · tratamento' : 'Saúde · outro'; }
let CACHE = null, IDX = null, CACHE_T = 0;
const mapa = r => ({ cnj: r.processo || r.Processo, classe: r.classe_judicial || r.Classe || '', assunto: r.Assunto || r.Assunto_Principal || '',
  partes: [r.polo_ativo || r.Polo_Ativo, r.polo_passivo || r.Polo_Passivo].filter(Boolean).join(' x '), tarefa: r.tarefa_atual || '', desde: iso(r.data_entrada_tarefa),
  prioridade: r.prioridade || '', etiquetas: String(r.Etiquetas || r.etiquetas || '') });
async function base() {
  if (!CACHE || Date.now() - CACHE_T > 300e3) {
    const F = JSON.parse((await L.lerGrande('acervo/fonte.json')).txt).registros || [];
    IDX = {}; CACHE = [];
    F.forEach(r => { const b = mapa(r); IDX[dg(b.cnj)] = b; const txt = b.assunto + ' ' + b.etiquetas;
      if (SAUDE.test(txt) && !NAO.test(b.assunto) && !/Baixad|Arquivo/i.test(b.tarefa)) CACHE.push(Object.assign({ catAuto: cat(txt), auto: true }, b)); });
    CACHE_T = Date.now();
  }
  return { lista: CACHE, idx: IDX };
}
async function ler() { try { return await L.lerJson(ARQ); } catch (e) { if (e.status === 404) return { dados: { schema: 'gabcmt.sensiveis', versao: 1, registros: {} }, sha: undefined }; throw e; } }
module.exports = async (req, res, u) => {
  try {
    if (req.method === 'GET') {
      const [B, { dados }] = await Promise.all([base(), ler()]), R = dados.registros || {}, na = {};
      const itens = B.lista.map(x => { na[dg(x.cnj)] = 1; return Object.assign({}, x, { acomp: R[dg(x.cnj)] || {} }); });
      Object.keys(R).forEach(k => { if (!na[k] && R[k].incluido) itens.push(Object.assign({ catAuto: '', manual: true }, B.idx[k] || { cnj: R[k].cnj, tarefa: 'fora do acervo' }, { acomp: R[k] })); });
      return res.status(200).json({ itens: itens.filter(x => x.acomp.excluido !== 'Sim'), atualizadoEm: dados.atualizadoEm || '' });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, alvo = dg(b.cnj), C = b.campos || {};
    if (alvo.length !== 20) return res.status(400).json({ erro: 'Número do processo inválido: informe os 20 dígitos do CNJ.' });
    for (let t = 0; t < 4; t++) {
      const { dados, sha } = await ler(); dados.registros = dados.registros || {};
      const it = dados.registros[alvo] || (dados.registros[alvo] = { cnj: b.cnj }), mud = [];
      if (C.incluir && !it.incluido) { it.incluido = true; it.incluidoPor = u; it.incluidoEm = new Date().toISOString(); delete it.excluido; mud.push('inclusão'); }
      CAMPOS.forEach(k => { if (k in C && (it[k] || '') !== String(C[k] || '')) { it[k] = String(C[k] || '').slice(0, 1000); mud.push(k); } });
      if (!mud.length) return res.status(200).json({ ok: true, item: it, semMudanca: true });
      it.editadoPor = u; it.editadoEm = new Date().toISOString(); dados.atualizadoEm = it.editadoEm;
      try { await L.gravarJson(ARQ, dados, sha, 'Casos sensíveis (' + u + '): ' + it.cnj + ' · ' + mud.join(', ')); return res.status(200).json({ ok: true, item: it }); }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    res.status(409).json({ erro: 'O arquivo mudou várias vezes seguidas; tente de novo.' });
  } catch (e) { res.status(e.status === 404 ? 404 : 500).json({ erro: e.message }); }
};
