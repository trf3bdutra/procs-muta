/* Controles especiais · monocráticas e urgências, no registro do processo em acervo/operacional.json (ficha única, padrao/ficha.json):
   - monocrática = producao.Destino "Monocrática" (registrada quando a minuta é feita ou possível), com controles "Monocrática - *";
   - urgência = triagem "Urgência" (medida) preenchida, com nível, pedido em, apreciação, apreciada em, observação;
   - qualquer uma pode nascer primeiro: a urgência pode virar monocrática e a monocrática pode receber a urgência.
   Os dados do processo (classe, assunto, partes, tarefa no PJe) vêm do acervo (acervo/fonte.json).
   Servido por /api/pauta?mono=1 (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam).
   GET  /api/pauta?mono=1                      registros, sugestões de urgência pelas etiquetas do PJe
   POST /api/pauta?mono=1 {cnj, campos}        cria ou altera o registro (designação só pelo gestor) */
const L = require('./_lib');
const FICHA = require('./_ficha');
const GESTOR = ['servidor', 'corretor'];
/* campos sem lugar próprio na ficha (cartão completo, consectários): guardados juntos, no mesmo registro */
const EXTRA = '_monoExtra', SEM_FICHA = ['consect', 'cartao'];
/* sugestões: etiquetas do PJe que indicam pedido urgente, em processo que ainda está no gabinete */
const URG = /urgen|tutela de urg|tutela antecip|tutela provis|efeito suspensivo|liminar(?! indeferida)|cirurgia|medicamento/i;
const FORA = /^\[Sess|Baixad|Arquivo|prazo em curso|Sobrestad/i;
const URG_CAMPOS = ['Urgência', 'Urgência - Nível', 'Urgência - Data', 'Urgência - Apreciação', 'Urgência - Apreciada em', 'Urgência - Observação', 'Urgência - Painel'];
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
const extra = r => { try { return JSON.parse((r.controles || {})[EXTRA] || '{}'); } catch (e) { return {}; } };
/* registro do operacional → item da página Monocráticas */
function item(r) {
  const p = r.producao || {}, c = r.controles || {}, x = extra(r), ctl = Object.assign({}, x, FICHA.paraCtl(r));
  if (ctl.urgTipo) { ctl.urgEm = ctl.urgPedido || ''; }
  const cart = FICHA.cartaoDaFicha(r, x.cartao); if (Object.keys(cart).length) ctl.cartao = cart;
  ctl.editadoPor = c['Monocrática - Atualizado por'] || ''; ctl.editadoEm = c['Monocrática - Atualizado em'] || '';
  return { cnj: r.processo, mono: p.Destino === 'Monocrática', monoEm: c['Monocrática - Registrada em'] || '', obs: c['Monocrática - Observação'] || '',
    servidor: p.SERVIDOR || '', corretor: p.CORRETOR || '', dataMinuta: p.MINUTADO || '', dataCorrecao: p['Data da Revisão'] || '', dataLiberacao: p['Data da Liberação'] || '',
    /* assinatura e publicação (ficha · Decisão monocrática): a etapa final da monocrática */
    assinado: p.Assinado === 'Sim' || !!p['Data da Assinatura'], dataAssinatura: p['Data da Assinatura'] || '', publicado: p.Publicado === 'Sim', decisaoId: p['Decisão - ID'] || '', ctl };
}
const vale = r => (r.producao || {}).Destino === 'Monocrática' || !!(r.triagem || {})['Urgência'];
module.exports = async (req, res, u) => {
  try {
    if (req.method === 'GET') {
      const [A, { doc }] = await Promise.all([acervo(), FICHA.lerOp()]);
      const itens = (doc.registros || []).filter(vale).map(r => { const k = dg(r.processo); return Object.assign({}, A.base[k] || { cnj: r.processo, tarefa: 'fora do acervo' }, item(r), { noAcervo: !!A.base[k] }); });
      const tem = {}; itens.forEach(i => { if (i.ctl.urgTipo) tem[dg(i.cnj)] = 1; });
      return res.status(200).json({ mono: true, itens, sugestoes: A.sug.filter(b => !tem[dg(b.cnj)]), previa: [], atualizadoEm: doc.atualizado_em || '' });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, cnj = String(b.cnj || ''), C = Object.assign({}, b.campos || {});
    if (dg(cnj).length !== 20) return res.status(400).json({ erro: 'Número do processo inválido: informe os 20 dígitos do CNJ.' });
    if (!L.gestor(u)) GESTOR.forEach(k => delete C[k]);
    /* campos do cartão → ficha (mesmo mapa da pauta); destino e observação da monocrática; urgência retirada limpa o grupo inteiro */
    const mud = FICHA.doCartao(C, C.cartao);
    if ('mono' in C) (mud.producao = mud.producao || {}).Destino = C.mono ? 'Monocrática' : '';
    if ('obs' in C) (mud.controles = mud.controles || {})['Monocrática - Observação'] = String(C.obs || '');
    if ('urgTipo' in C && !C.urgTipo) { mud.triagem = mud.triagem || {}; URG_CAMPOS.forEach(k => { mud.triagem[k] = ''; }); }
    const { r, out } = await FICHA.gravar(cnj, mud, 'Monocráticas e urgências (' + u + '): ' + cnj, (r, out) => {
      const c = r.controles = r.controles || {};
      const x = extra(r); let mx = false;
      SEM_FICHA.forEach(k => { if (!(k in C)) return;
        if (k === 'cartao' && C.cartao && typeof C.cartao === 'object') { x.cartao = Object.assign(x.cartao || {}, C.cartao); mx = true; }
        else if (k !== 'cartao' && (x[k] || '') !== String(C[k] || '')) { x[k] = String(C[k] || ''); mx = true; } });
      if (mx) { c[EXTRA] = JSON.stringify(x); out.push('controles.Monocrática - ' + EXTRA); }
    }, u);
    return res.status(200).json({ ok: true, item: item(r), semMudanca: !out.length });
  } catch (e) { res.status(e.status === 404 ? 404 : e.status === 409 ? 409 : 500).json({ erro: e.message }); }
};
