/* Sobrestados e suspensos: controle dos processos parados por determinação de tribunal superior, IRDR/IAC ou outro motivo,
   com o tema ou precedente, a situação do precedente e a previsão de retirada.
   A lista vem do acervo (tarefas de sobrestamento do PJe; etiquetas para o tema); o acompanhamento fica em acervo/sobrestados.json.
   Servido por /api/pauta?sobr=1 (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam).
   GET  /api/pauta?sobr=1                      sobrestados com motivo, tema, tempo e acompanhamento
   POST /api/pauta?sobr=1 {cnj, campos}        grava o acompanhamento de um processo */
const L = require('./_lib');
const ARQ = 'acervo/sobrestados.json', CAMPOS = ['motivo', 'tema', 'sitPrec', 'previsao', 'semPrev', 'prox', 'resp', 'obs'];
const dg = s => String(s || '').replace(/\D/g, '');
const iso = v => { const s = String(v || '').trim(), m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + m[2] + '-' + m[1] : /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''; };
const SOBR = /Sobrestad|\[SU\]\s*Sobrest|Motivos Diversos|IRDR ou IAC/i;
function motivoDaTarefa(t) { return /IRDR ou IAC/i.test(t) ? 'IRDR ou IAC' : /Tribunais Superiores/i.test(t) ? 'Tribunal superior (repetitivo ou repercussão geral)' : /Motivos Diversos/i.test(t) ? 'Outro motivo' : 'Não identificado'; }
/* temas citados nas etiquetas: "Tema 1039 STJ", "DT TEMA 285 STF", "tema 264/STF" */
function temas(et) { const out = [], re = /tema\s*(?:n[ºo.]*\s*)?(\d{1,2}\.\d{3}|\d{1,4})\s*(?:\/|-|\s)?\s*(STF|STJ|TNU|TRF3?)?/gi; let m; while ((m = re.exec(et))) { const t = 'Tema ' + m[1].replace('.', '') + (m[2] ? ' ' + m[2].toUpperCase() : ''); if (!out.includes(t)) out.push(t); } return out; }
let CACHE = null, CACHE_T = 0;
async function base() {
  if (!CACHE || Date.now() - CACHE_T > 300e3) {
    const F = JSON.parse((await L.lerGrande('acervo/fonte.json')).txt).registros || [];
    CACHE = F.filter(r => SOBR.test(r.tarefa_atual || '') && !/Arquivo|Contadoria/i.test(r.tarefa_atual || '')).map(r => {
      const et = String(r.Etiquetas || r.etiquetas || '');
      return { cnj: r.processo || r.Processo, classe: r.classe_judicial || r.Classe || '', assunto: r.Assunto || r.Assunto_Principal || '',
        partes: [r.polo_ativo || r.Polo_Ativo, r.polo_passivo || r.Polo_Passivo].filter(Boolean).join(' x '), tarefa: r.tarefa_atual || '',
        desde: iso(r.data_entrada_tarefa), temasAuto: temas(et), motivoAuto: motivoDaTarefa(r.tarefa_atual), analisarPeticao: /Analisar petição/i.test(r.tarefa_atual || ''),
        meta: /meta/i.test(et), secao: r['Seção Competente'] || '' };
    }).map(x => { if (x.motivoAuto === 'Não identificado' && x.temasAuto.length) x.motivoAuto = 'Tribunal superior (repetitivo ou repercussão geral)'; return x; });
    CACHE_T = Date.now();
  }
  return CACHE;
}
async function ler() { try { return await L.lerJson(ARQ); } catch (e) { if (e.status === 404) return { dados: { schema: 'gabcmt.sobrestados', versao: 1, registros: {} }, sha: undefined }; throw e; } }
module.exports = async (req, res, u) => {
  try {
    if (req.method === 'GET') {
      const [B, { dados }] = await Promise.all([base(), ler()]), R = dados.registros || {};
      return res.status(200).json({ itens: B.map(x => Object.assign({}, x, { acomp: R[dg(x.cnj)] || {} })), atualizadoEm: dados.atualizadoEm || '' });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, alvo = dg(b.cnj), C = b.campos || {};
    if (alvo.length !== 20) return res.status(400).json({ erro: 'número do processo inválido' });
    for (let t = 0; t < 4; t++) {
      const { dados, sha } = await ler(); dados.registros = dados.registros || {};
      const it = dados.registros[alvo] || (dados.registros[alvo] = { cnj: b.cnj }), mud = [];
      CAMPOS.forEach(k => { if (k in C && (it[k] || '') !== String(C[k] || '')) { it[k] = String(C[k] || '').slice(0, 1000); mud.push(k); } });
      if (!mud.length) return res.status(200).json({ ok: true, item: it, semMudanca: true });
      it.editadoPor = u; it.editadoEm = new Date().toISOString(); dados.atualizadoEm = it.editadoEm;
      try { await L.gravarJson(ARQ, dados, sha, 'Sobrestados (' + u + '): ' + it.cnj + ' · ' + mud.join(', ')); return res.status(200).json({ ok: true, item: it }); }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    res.status(409).json({ erro: 'O arquivo mudou várias vezes seguidas; tente de novo.' });
  } catch (e) { res.status(e.status === 404 ? 404 : 500).json({ erro: e.message }); }
};
module.exports.base = base;
