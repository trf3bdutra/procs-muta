/* Casos sensíveis: saúde (medicamento, oncológico, cirurgia, tratamento) e outros que pedem acompanhamento mais próximo.
   Lista do acervo pelo assunto e pelas etiquetas, mais os incluídos à mão pela equipe; o acompanhamento fica na ficha do processo
   (acervo/operacional.json, Controles especiais · grupo Caso sensível).
   Servido por /api/pauta?sens=1 (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam).
   GET  /api/pauta?sens=1                      casos com dados do acervo e acompanhamento
   POST /api/pauta?sens=1 {cnj, campos}        grava o acompanhamento; campos.incluir = true inclui um processo à mão */
const L = require('./_lib');
const AC = require('./_acomp');
const MAPA = { cat: 'Sensível - Categoria', quadro: 'Sensível - Quadro', decisao: 'Sensível - Decisão', cumprimento: 'Sensível - Cumprimento', ultimo: 'Sensível - Última verificação',
  proxVer: 'Sensível - Próxima verificação', prox: 'Sensível - Próxima providência', resp: 'Sensível - Responsável', obs: 'Sensível - Observação', excluido: 'Sensível - Excluído' };
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
module.exports = async (req, res, u) => {
  try {
    if (req.method === 'GET') {
      const [B, { I, doc }] = await Promise.all([base(), AC.indice()]), na = {}, ac = r => Object.assign(AC.acomp(r, MAPA, 'Sensível'), ((r && r.controles) || {})['Sensível - Incluído'] === 'Sim' ? { incluido: true } : {});
      const itens = B.lista.map(x => { na[dg(x.cnj)] = 1; return Object.assign({}, x, { acomp: ac(I[dg(x.cnj)]) }); });
      /* incluídos à mão (fora da regra do acervo) */
      (doc.registros || []).forEach(r => { const k = dg(r.processo); if (!na[k] && ((r.controles || {})['Sensível - Incluído'] === 'Sim')) itens.push(Object.assign({ catAuto: '', manual: true }, B.idx[k] || { cnj: r.processo, tarefa: 'fora do acervo' }, { acomp: ac(r) })); });
      return res.status(200).json({ itens: itens.filter(x => x.acomp.excluido !== 'Sim'), atualizadoEm: doc.atualizado_em || '' });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, C = b.campos || {};
    if (dg(b.cnj).length !== 20) return res.status(400).json({ erro: 'Número do processo inválido: informe os 20 dígitos do CNJ.' });
    const out = await AC.gravar(String(b.cnj), C, MAPA, 'Sensível', u, 'Casos sensíveis', c => { if (C.incluir) { c['Sensível - Incluído'] = 'Sim'; c['Sensível - Excluído'] = ''; } });
    res.status(200).json(Object.assign({ ok: true }, out));
  } catch (e) { res.status(e.status === 404 ? 404 : e.status === 409 ? 409 : 500).json({ erro: e.message }); }
};
module.exports.base = base;
module.exports.MAPA = MAPA;
