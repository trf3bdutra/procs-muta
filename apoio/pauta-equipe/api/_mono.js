/* Monocráticas e urgências da equipe, num só registro por processo (acervo/monocraticas.json):
   - a monocrática existe quando é registrada (minuta feita ou possível): campo mono = true;
   - a urgência (liminar, tutela de urgência, efeito suspensivo) existe quando tem pedido (ctl.urgTipo);
   - qualquer uma pode nascer primeiro: a urgência pode virar monocrática e a monocrática pode receber a urgência.
   Os dados do processo (classe, assunto, partes, tarefa no PJe) vêm do acervo (acervo/fonte.json).
   Servido por /api/pauta?mono=1 (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam).
   GET  /api/pauta?mono=1                      registros, sugestões de urgência pelas etiquetas do PJe
   POST /api/pauta?mono=1 {cnj, campos}        cria ou altera o registro (designação só pelo gestor) */
const L = require('./_lib');
const ARQ = 'acervo/monocraticas.json';
const DIRETOS = ['dataMinuta', 'dataCorrecao', 'dataLiberacao', 'obs'], GESTOR = ['servidor', 'corretor'];
const CTL = ['resJulg', 'honor', 'consect', 'topico', 'intercor', 'tempest', 'preparo', 'repres', 'midias', 'mpf', 'parecer', 'prelim',
  'tipoAto', 'hip932', 'fundamento', 'urgTipo', 'urgSit', 'urgData', 'urgObs', 'urgPedido'];
/* sugestões: etiquetas do PJe que indicam pedido urgente, em processo que ainda está no gabinete */
const URG = /urgen|tutela de urg|tutela antecip|tutela provis|efeito suspensivo|liminar(?! indeferida)|cirurgia|medicamento/i;
const FORA = /^\[Sess|Baixad|Arquivo|prazo em curso|Sobrestad/i;
const dg = s => String(s || '').replace(/\D/g, '');
/* a data de entrada na tarefa vem ora em AAAA-MM-DD, ora em DD/MM/AAAA */
const iso = v => { const s = String(v || '').trim(), m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + m[2] + '-' + m[1] : /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''; };
let BASE = null, SUG = null, BASE_T = 0;
async function acervo() {
  if (!BASE || Date.now() - BASE_T > 300e3) {
    const { txt } = await L.lerGrande('acervo/fonte.json'), d = JSON.parse(txt);
    BASE = {}; SUG = [];
    (d.registros || []).forEach(r => {
      const cnj = r.processo || r.Processo; if (!cnj) return;
      const et = String(r.Etiquetas || r.etiquetas || ''), u = et.split(/[;,|]/).map(s => s.trim()).filter(s => URG.test(s))[0] || '';
      const b = { cnj, assunto: r.Assunto || r.Assunto_Principal || r.assunto_judicial || '', classe: r.classe_judicial || r.Classe || '',
        partes: [r.polo_ativo || r.Polo_Ativo, r.polo_passivo || r.Polo_Passivo].filter(Boolean).join(' x '), tarefa: r.tarefa_atual || '',
        desde: iso(r.data_entrada_tarefa), prioridade: r.prioridade || '', urgAuto: u };
      BASE[dg(cnj)] = b;
      if (u && b.tarefa && !FORA.test(b.tarefa)) SUG.push(b);
    });
    BASE_T = Date.now();
  }
  return { base: BASE, sug: SUG };
}
async function ler() { try { return await L.lerJson(ARQ); } catch (e) { if (e.status === 404) return { dados: { schema: 'gabcmt.monocraticas', versao: 2, registros: {} }, sha: undefined }; throw e; } }
module.exports = async (req, res, u) => {
  try {
    if (req.method === 'GET') {
      const [A, { dados }] = await Promise.all([acervo(), ler()]), R = dados.registros || {};
      const itens = Object.keys(R).map(k => Object.assign({}, A.base[k] || { cnj: R[k].cnj, tarefa: 'fora do acervo' }, R[k], { noAcervo: !!A.base[k] }));
      const sugestoes = A.sug.filter(b => !(R[dg(b.cnj)] && (R[dg(b.cnj)].ctl || {}).urgTipo));
      return res.status(200).json({ mono: true, itens, sugestoes, previa: [], atualizadoEm: dados.atualizadoEm || '' });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, alvo = dg(b.cnj), C = b.campos || {};
    if (alvo.length !== 20) return res.status(400).json({ erro: 'Número do processo inválido: informe os 20 dígitos do CNJ.' });
    for (let t = 0; t < 4; t++) {
      const { dados, sha } = await ler(); dados.registros = dados.registros || {};
      const novo = !dados.registros[alvo], agora = new Date().toISOString();
      const it = dados.registros[alvo] || (dados.registros[alvo] = { cnj: b.cnj, criadoEm: agora, criadoPor: u }), mud = novo ? ['registro'] : [];
      if ('mono' in C && !!C.mono !== !!it.mono) { it.mono = !!C.mono; if (it.mono) { it.monoEm = agora; it.monoPor = u; } mud.push('mono'); }
      DIRETOS.forEach(k => { if (k in C && (it[k] || '') !== String(C[k] || '')) { it[k] = String(C[k] || ''); mud.push(k); } });
      if (L.gestor(u)) GESTOR.forEach(k => { if (k in C && (it[k] || '') !== String(C[k] || '')) { it[k] = String(C[k] || ''); mud.push(k); } });
      it.ctl = it.ctl || {};
      CTL.forEach(k => { if (k in C) { const v = String(C[k] || ''); if ((it.ctl[k] || '') !== v) { if (v) it.ctl[k] = v; else delete it.ctl[k]; mud.push(k); } } });
      if (C.urgTipo && !it.ctl.urgEm) { it.ctl.urgEm = agora; it.ctl.urgPor = u; }
      if (C.cartao && typeof C.cartao === 'object') { const ant = it.ctl.cartao || {}; Object.keys(C.cartao).forEach(k => { if (JSON.stringify(ant[k]) !== JSON.stringify(C.cartao[k])) { ant[k] = C.cartao[k]; mud.push('cartao.' + k); } }); it.ctl.cartao = ant; }
      /* registro sem monocrática e sem urgência deixa de existir */
      if (!it.mono && !it.ctl.urgTipo && !novo && 'mono' in C) delete dados.registros[alvo];
      if (!mud.length) return res.status(200).json({ ok: true, item: it, semMudanca: true });
      it.ctl.editadoPor = u; it.ctl.editadoEm = agora; dados.atualizadoEm = agora;
      /* o que a equipe registra vai também para a ficha do processo (acervo/operacional.json), no mesmo commit */
      const Cf = Object.assign({}, C); if (!L.gestor(u)) GESTOR.forEach(k => delete Cf[k]);
      try { await require('./_ficha').espelho({ path: ARQ, txt: JSON.stringify(dados, null, 1) + '\n', sha }, it.cnj, Cf, C.cartao, 'Monocráticas e urgências (' + u + '): ' + it.cnj + ' · ' + mud.slice(0, 6).join(', ')); return res.status(200).json({ ok: true, item: it }); }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    res.status(409).json({ erro: 'O arquivo mudou várias vezes seguidas; tente de novo.' });
  } catch (e) { res.status(e.status === 404 ? 404 : 500).json({ erro: e.message }); }
};
