/* Metas do CNJ: controle dos processos de meta até o fim definitivo (baixa ou arquivamento); os sobrestados ficam na aba Sobrestados.
   A lista vem do acervo (etiquetas do PJe e campo META da triagem); o acompanhamento fica na ficha do processo (acervo/operacional.json,
   Controles especiais · grupo Meta).
   Servido por /api/pauta?metas=1 (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam).
   GET  /api/pauta?metas=1                     processos de meta com situação no acervo, pauta e acompanhamento
   POST /api/pauta?metas=1 {cnj, campos}       grava o acompanhamento de um processo */
const L = require('./_lib');
const AC = require('./_acomp');
const MAPA = { ctrl: 'Meta - Situação', prox: 'Meta - Próxima providência', prazo: 'Meta - Prazo da providência', resp: 'Meta - Responsável', obs: 'Meta - Observação' };
const dg = s => String(s || '').replace(/\D/g, '');
const iso = v => { const s = String(v || '').trim(), m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + m[2] + '-' + m[1] : /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''; };
/* números de meta: 1 ou 2 dígitos logo após "meta(s)", de 1 a 12 (mesma regra do CMT-monitor) */
function numerosMeta(d) {
  const out = [], re = /metas?\s*(?:cnj\s*)?[-:#]?\s*0?(\d{1,2})(?!\d)((?:\s*(?:e|,|\/)\s*0?\d{1,2}(?!\d))*)/gi; let m;
  while ((m = re.exec(d))) [m[1]].concat((m[2] || '').match(/\d{1,2}/g) || []).forEach(n => { n = String(Number(n)); if (+n >= 1 && +n <= 12 && !out.includes(n)) out.push(n); });
  return out;
}
/* fase pela tarefa do PJe: no gabinete, na sessão, após o julgamento, encerrado (fim definitivo) ou sobrestado */
function fase(t) {
  t = String(t || '');
  if (/Baixad|Arquivo/i.test(t)) return 'Encerrado';
  if (/Sobrestad|\[SU\]/i.test(t)) return 'Sobrestado';
  if (/Aguardando julgamento colegiado/i.test(t)) return 'Aguardando sessão';
  if (/Intimação de acórdão|prazo em curso - Acórdão|\[Sess[^\]]*\] Processo com prazo/i.test(t)) return 'Julgado · pós-sessão';
  if (/^\[Sess/i.test(t)) return 'Preparo para sessão';
  if (/ato judicial/i.test(t)) return 'Monocrática';
  if (/prazo em curso|diligência|MPF/i.test(t)) return 'Aguardando prazo ou diligência';
  return t ? 'No gabinete' : 'Fora do acervo ativo';
}
let CACHE = null, CACHE_T = 0;
async function base() {
  if (!CACHE || Date.now() - CACHE_T > 300e3) {
    const [{ txt }, op] = await Promise.all([L.lerGrande('acervo/fonte.json'), L.lerGrande('acervo/operacional.json').catch(() => ({ txt: '{}' }))]);
    const F = JSON.parse(txt).registros || [], O = {};
    (JSON.parse(op.txt).registros || []).forEach(r => { O[dg(r.processo)] = r; });
    CACHE = [];
    F.forEach(r => {
      const cnj = r.processo || r.Processo; if (!cnj) return;
      const o = O[dg(cnj)] || {}, tri = o.triagem || {}, pr = o.producao || {}, pa = o.pauta || {};
      const fonteMeta = [r.Etiquetas, r.etiquetas, tri.META].filter(Boolean).join(' ; ');
      const metas = numerosMeta(fonteMeta); if (!metas.length) return;
      /* sobrestados e suspensos têm aba própria (Sobrestados) */
      if (/Sobrestad|\[SU\]/i.test(r.tarefa_atual || '')) return;
      const ses = (pa.sessoes || []).map(s => ({ data: s.sessao, item: s.item || '', res: s.resultado || '' })).filter(s => s.data);
      CACHE.push({ cnj, metas, rotulo: String(tri.META || '').trim(), classe: r.classe_judicial || r.Classe || '', assunto: r.Assunto || r.Assunto_Principal || '',
        partes: [r.polo_ativo || r.Polo_Ativo, r.polo_passivo || r.Polo_Passivo].filter(Boolean).join(' x '), dist: iso(r['data_distribuição'] || r['Data_Distribuição']),
        tarefa: r.tarefa_atual || '', desde: iso(r.data_entrada_tarefa), fase: fase(r.tarefa_atual), pend1: String(r.Pendente_1Julgamento || '').toLowerCase() === 'sim',
        secao: r['Seção Competente'] || '', servidor: pr.SERVIDOR || '', corretor: pr.CORRETOR || '', sessoes: ses });
    });
    CACHE_T = Date.now();
  }
  return CACHE;
}
module.exports = async (req, res, u) => {
  try {
    if (req.method === 'GET') {
      const [B, { I, doc }] = await Promise.all([base(), AC.indice()]);
      return res.status(200).json({ itens: B.map(x => Object.assign({}, x, { acomp: AC.acomp(I[dg(x.cnj)], MAPA, 'Meta') })), atualizadoEm: doc.atualizado_em || '' });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {};
    if (dg(b.cnj).length !== 20) return res.status(400).json({ erro: 'número do processo inválido' });
    const out = await AC.gravar(String(b.cnj), b.campos || {}, MAPA, 'Meta', u, 'Metas');
    res.status(200).json(Object.assign({ ok: true }, out));
  } catch (e) { res.status(e.status === 404 ? 404 : e.status === 409 ? 409 : 500).json({ erro: e.message }); }
};
module.exports.base = base;
