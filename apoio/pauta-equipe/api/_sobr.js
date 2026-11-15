/* Sobrestados e suspensos: controle dos processos parados por determinação de tribunal superior, IRDR/IAC ou outro motivo,
   com o tema ou precedente, a situação do precedente e a previsão de retirada.
   A lista vem do acervo (tarefas de sobrestamento do PJe; etiquetas para o tema); o acompanhamento fica na ficha do processo
   (acervo/operacional.json, Controles especiais · grupo Sobrestamento).
   Servido por /api/pauta?sobr=1 (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam).
   GET  /api/pauta?sobr=1                      sobrestados com motivo, tema, tempo e acompanhamento
   POST /api/pauta?sobr=1 {cnj, campos}        grava o acompanhamento de um processo */
const L = require('./_lib');
const AC = require('./_acomp');
const MAPA = { motivo: 'Sobrestamento - Motivo', tema: 'Sobrestamento - Tema', sitPrec: 'Sobrestamento - Situação do precedente', previsao: 'Sobrestamento - Previsão de retirada',
  semPrev: 'Sobrestamento - Sem previsão', prox: 'Sobrestamento - Próxima providência', resp: 'Sobrestamento - Responsável', obs: 'Sobrestamento - Observação' };
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
module.exports = async (req, res, u) => {
  try {
    if (req.method === 'GET') {
      const [B, { I, doc }] = await Promise.all([base(), AC.indice()]);
      return res.status(200).json({ itens: B.map(x => Object.assign({}, x, { acomp: AC.acomp(I[dg(x.cnj)], MAPA, 'Sobrestamento') })), atualizadoEm: doc.atualizado_em || '' });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {};
    if (dg(b.cnj).length !== 20) return res.status(400).json({ erro: 'número do processo inválido' });
    const out = await AC.gravar(String(b.cnj), b.campos || {}, MAPA, 'Sobrestamento', u, 'Sobrestados');
    res.status(200).json(Object.assign({ ok: true }, out));
  } catch (e) { res.status(e.status === 404 ? 404 : e.status === 409 ? 409 : 500).json({ erro: e.message }); }
};
module.exports.base = base;
