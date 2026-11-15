/* Monocráticas da equipe: processos do acervo nas tarefas de ato judicial do PJe (minutar, revisar, assinar),
   com a designação e a produção guardadas em acervo/monocraticas.json. Servido por /api/pauta?mono=1
   (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam).
   GET  /api/pauta?mono=1                      fila com designação e produção
   POST /api/pauta?mono=1 {cnj, campos}        grava campos de um processo (designação só pelo gestor) */
const L = require('./_lib');
const ARQ = 'acervo/monocraticas.json', TAREFA = /ato judicial/i;
const DIRETOS = ['dataMinuta', 'dataCorrecao', 'dataLiberacao', 'obs'], GESTOR = ['servidor', 'corretor'];
const CTL = ['resJulg', 'honor', 'consect', 'topico', 'intercor', 'sopref', 'tempest', 'preparo', 'repres', 'midias', 'mpf', 'parecer', 'prelim'];
const dg = s => String(s || '').replace(/\D/g, '');
let FONTE = null, FONTE_T = 0;
async function fila() {
  if (!FONTE || Date.now() - FONTE_T > 300e3) {
    const { txt } = await L.lerGrande('acervo/fonte.json'), d = JSON.parse(txt);
    FONTE = (d.registros || []).filter(r => TAREFA.test(r.tarefa_atual || '') && !/^\[Sess/.test(r.tarefa_atual || '')).map(r => ({
      cnj: r.processo || r.Processo, assunto: r.Assunto || r.Assunto_Principal || r.assunto_judicial || '', classe: r.classe_judicial || r.Classe || '',
      partes: [r.polo_ativo || r.Polo_Ativo, r.polo_passivo || r.Polo_Passivo].filter(Boolean).join(' x '), tarefa: r.tarefa_atual || '',
      desde: String(r.data_entrada_tarefa || '').slice(0, 10), prioridade: r.prioridade || '', etiquetas: r.Etiquetas || r.etiquetas || '' }));
    FONTE_T = Date.now();
  }
  return FONTE;
}
async function ler() { try { return await L.lerJson(ARQ); } catch (e) { if (e.status === 404) return { dados: { schema: 'gabcmt.monocraticas', versao: 1, registros: {} }, sha: undefined }; throw e; } }
module.exports = async (req, res, u) => {
  try {
    if (req.method === 'GET') {
      const [F, { dados }] = await Promise.all([fila(), ler()]), R = dados.registros || {};
      const itens = F.slice().sort((a, b) => String(a.desde).localeCompare(String(b.desde))).map((x, i) => Object.assign({ item: String(i + 1) }, x, R[dg(x.cnj)] || {}));
      return res.status(200).json({ mono: true, itens, previa: [], atualizadoEm: dados.atualizadoEm || '' });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, alvo = dg(b.cnj), C = b.campos || {};
    if (alvo.length !== 20) return res.status(400).json({ erro: 'número do processo inválido' });
    for (let t = 0; t < 4; t++) {
      const { dados, sha } = await ler(); dados.registros = dados.registros || {};
      const it = dados.registros[alvo] || (dados.registros[alvo] = { cnj: b.cnj }), mud = [];
      DIRETOS.forEach(k => { if (k in C && (it[k] || '') !== String(C[k] || '')) { it[k] = String(C[k] || ''); mud.push(k); } });
      if (L.gestor(u)) GESTOR.forEach(k => { if (k in C && (it[k] || '') !== String(C[k] || '')) { it[k] = String(C[k] || ''); mud.push(k); } });
      it.ctl = it.ctl || {};
      CTL.forEach(k => { if (k in C) { const v = String(C[k] || ''); if ((it.ctl[k] || '') !== v) { if (v) it.ctl[k] = v; else delete it.ctl[k]; mud.push(k); } } });
      if (C.cartao && typeof C.cartao === 'object') { const ant = it.ctl.cartao || {}; Object.keys(C.cartao).forEach(k => { if (JSON.stringify(ant[k]) !== JSON.stringify(C.cartao[k])) { ant[k] = C.cartao[k]; mud.push('cartao.' + k); } }); it.ctl.cartao = ant; }
      if (!mud.length) return res.status(200).json({ ok: true, item: it, semMudanca: true });
      it.ctl.editadoPor = u; it.ctl.editadoEm = new Date().toISOString(); dados.atualizadoEm = it.ctl.editadoEm;
      try { await L.gravarJson(ARQ, dados, sha, 'Monocráticas (' + u + '): ' + it.cnj + ' · ' + mud.slice(0, 6).join(', ')); return res.status(200).json({ ok: true, item: it }); }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    res.status(409).json({ erro: 'O arquivo mudou várias vezes seguidas; tente de novo.' });
  } catch (e) { res.status(e.status === 404 ? 404 : 500).json({ erro: e.message }); }
};
