/* Ficha única do processo (padrao/ficha.json) gravada em acervo/operacional.json, o mesmo registro que o CMT-monitor usa.
   Servido por /api/pauta (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam):
   GET  /api/pauta?ficha=<CNJ>            ficha (modelo), registro do operacional e dados da fonte (só leitura)
   POST /api/pauta?ficha=1 {cnj, campos}   campos = { 'triagem.Tempestividade': 'Tempestivo', ... }; cria o registro se faltar
   Também exporta espelho(), usado pela pauta e pelas monocráticas: o que a equipe registra no cartão vai para a ficha no mesmo commit. */
const L = require('./_lib');
const OP = 'acervo/operacional.json', FONTE = 'acervo/fonte.json', FICHA = 'padrao/ficha.json';
const SECOES = ['origem', 'triagem', 'producao', 'pauta', 'controles'];
/* a designação é do gestor; o destino (sessão ou monocrática) a equipe registra, como na página Monocráticas */
const SO_GESTOR = new Set(['producao.SERVIDOR', 'producao.CORRETOR']);
const dg = s => String(s || '').replace(/\D/g, '');
const agora = () => new Date().toISOString();
let FIC = null, FIC_T = 0, FT = null, FT_T = 0;
async function ficha() {
  if (!FIC || Date.now() - FIC_T > 300e3) { FIC = (await L.lerJson(FICHA)).dados; FIC_T = Date.now(); }
  return FIC;
}
function editaveis(F) {
  const m = {};
  F.abas.forEach(a => a.grupos.forEach(g => g.campos.forEach(c => { if (c.secao && c.editavel !== false && !c.calculado) m[c.secao + '.' + c.chave] = c; })));
  F.abas.forEach(a => { if (a.seletor) m[a.seletor.secao + '.' + a.seletor.chave] = a.seletor; });
  return m;
}
async function fonteDe(cnj) {
  if (!FT || Date.now() - FT_T > 300e3) {
    const d = JSON.parse((await L.lerGrande(FONTE)).txt); FT = {};
    (d.registros || []).forEach(r => { FT[dg(r.processo || r.Processo)] = r; }); FT_T = Date.now();
  }
  return FT[dg(cnj)] || null;
}
async function lerOp() { const { txt, sha } = await L.lerGrande(OP); return { doc: JSON.parse(txt), sha }; }
/* só para consulta: o mesmo objeto é reaproveitado enquanto o arquivo não muda; NÃO alterar o doc devolvido
   (gravações usam lerOp, que interpreta uma cópia própria) */
let OPL = null;
async function lerOpLeitura() {
  const { txt, sha } = await L.lerGrande(OP);
  if (!OPL || OPL.sha !== sha) OPL = { sha, doc: JSON.parse(txt) };
  return { doc: OPL.doc, sha };
}
function registro(doc, cnj, F, criar) {
  const k = dg(cnj); let r = (doc.registros || []).find(x => dg(x.processo) === k);
  if (!r && criar) {
    r = { processo: cnj };
    SECOES.forEach(s => { r[s] = {}; });
    F.abas.forEach(a => a.grupos.forEach(g => g.campos.forEach(c => { if (c.secao && !c.calculado && c.editavel !== false && !(c.chave in r[c.secao])) r[c.secao][c.chave] = ''; })));
    r.pauta.sessoes = [];
    doc.registros.push(r);
  }
  return r;
}
/* aplica {secao: {chave: valor}} ao registro; devolve a lista do que mudou */
function aplica(r, mud) {
  const out = [];
  /* texto, ou lista de linhas (campos "tabela" da ficha) */
  const igual = (x, y) => (typeof x === 'object' && x) || (typeof y === 'object' && y) ? JSON.stringify(x == null || x === '' ? [] : x) === JSON.stringify(y == null || y === '' ? [] : y) : String(x == null ? '' : x) === String(y == null ? '' : y);
  Object.keys(mud).forEach(s => { r[s] = r[s] || {}; Object.keys(mud[s]).forEach(k => { const raw = mud[s][k], v = Array.isArray(raw) ? raw : String(raw == null ? '' : raw); if (!igual(r[s][k], v)) { r[s][k] = v; out.push(s + '.' + k); } }); });
  if (out.length) { r.origem = r.origem || {}; r.origem.atualizado_em = agora(); }
  return out;
}
/* cartão da pauta → campos da ficha (vocabulário do Monitor) */
const V = {
  tempest: v => ({ triagem: { 'Tempestividade': /^(Tempestivo|Intempestivo)$/.test(v) ? v : '' } }),
  preparo: v => ({ triagem: Object.assign({ 'Preparo': { 'Comprovado': 'Comprovado', 'Justiça gratuita': 'Dispensado', 'Isento (DPU/ente público)': 'Dispensado', 'Não recolhido': 'Não Recolhido', 'Não se aplica': 'Não se Aplica' }[v] || '' }, v === 'Justiça gratuita' ? { 'AJG': 'Sim' } : {}) }),
  repres: v => ({ triagem: Object.assign({ 'Representação': v === 'Regular' || /^Dispensada/.test(v) ? 'Regular' : /^Irregular/.test(v) ? 'Negativo' : '' }, /^(Dispensada|Irregular)/.test(v) ? { 'Observação da Representação': v } : {}) }),
  midias: v => ({ triagem: { 'Mídias': { 'Juntadas': 'Juntada', 'Faltantes': 'Faltante', 'Não se aplica': 'Não se Aplica' }[v] || '' } }),
  mpf: v => ({ triagem: v === 'Sem hipótese' ? { 'MPF - Custos Legis': 'Não' } : v ? { 'MPF - Custos Legis': 'Sim', 'Observação MPF': v } : { 'MPF - Custos Legis': '' } }),
  parecer: v => ({ triagem: { 'MPF': { 'Com parecer': 'Com Parecer', 'Aguardando parecer': 'Sem Parecer', 'Intimado sem manifestação': 'Sem Parecer' }[v] || '' } }),
  prelim: v => ({ triagem: { 'Prelim.': v } }),
  intercor: v => ({ triagem: { 'Intercorrências': v } }),
  resJulg: v => ({ producao: { 'Voto - Resultado': v } }),
  honor: v => ({ producao: { 'Voto - Honorários': v } }),
  topico: v => ({ producao: { 'Tópico-síntese': v } }),
  servidor: v => ({ producao: { 'SERVIDOR': v } }),
  corretor: v => ({ producao: { 'CORRETOR': v } }),
  dataMinuta: v => ({ producao: { 'MINUTADO': v } }),
  dataCorrecao: v => ({ producao: { 'Data da Revisão': v, 'CORRIGIDO': v ? 'Sim' : '' } }),
  dataLiberacao: v => ({ producao: { 'Data da Liberação': v, 'LIBERADO': v ? 'Sim' : '' } }),
  /* assinatura da monocrática, confirmada no prontuário da Ex Officio */
  dataAssinatura: v => ({ producao: { 'Data da Assinatura': v, 'Assinado': v ? 'Sim' : '' } }),
  /* urgências e monocráticas (aba Urgências / Monocráticas da Ex Officio) */
  /* Controles especiais · urgência: vocabulário único da ficha (padrao/ficha.json) */
  urgTipo: v => ({ triagem: { 'Urgência': v } }), urgNivel: v => ({ triagem: { 'Urgência - Nível': v } }), urgSit: v => ({ triagem: { 'Urgência - Apreciação': v } }),
  urgPedido: v => ({ triagem: { 'Urgência - Data': v } }), urgData: v => ({ triagem: { 'Urgência - Apreciada em': v } }), urgObs: v => ({ triagem: { 'Urgência - Observação': v } }),
  urgPainel: v => ({ triagem: { 'Urgência - Painel': v } }),
  /* Controles especiais · monocrática: destino e observação ficam a cargo de _mono.js (a pauta também tem 'obs') */
  hip932: v => ({ triagem: { 'Hipóteses Monocrática': v } }),
  tipoAto: v => ({ producao: { 'Mono - Tipo de ato': v } }), fundamento: v => ({ producao: { 'Mono - Fundamento': v } }),
  /* registro da monocrática marca o destino na ficha; urgPedido é o nome usado pelo formulário de urgência */
  mono: v => ({ producao: { 'Destino': v && v !== 'false' ? 'Monocrática' : '' } })
};
/* ficha → cartão (volta): só o que tem correspondência sem ambiguidade; o cartão guarda o vocabulário da equipe */
const LISTAS = {
  resJulg: ['Provido', 'Parcialmente provido', 'Desprovido', 'Não conhecido', 'Prejudicado', 'Rejeitados', 'Acolhidos sem efeito infringente', 'Acolhidos com efeito infringente', 'Retratação exercida', 'Acórdão mantido'],
  honor: ['Majorados', 'Mantidos', 'Invertidos', 'Fixados', 'Redistribuídos', 'Sem honorários recursais'], prelim: ['Sem preliminares', 'Há preliminares', 'Preliminar de ofício'], simnao: ['Sim', 'Não']
};
const naLista = (L, v) => L.find(x => x.toLowerCase() === String(v || '').trim().toLowerCase()) || null;
function paraCartao(mud, it) {
  const c = (it && it.ctl) || {}, d = {}, k = {}, cart = {}, t = mud.triagem || {}, p = mud.producao || {}, tem = (o, x) => Object.prototype.hasOwnProperty.call(o, x);
  if (tem(t, 'Tempestividade')) k.tempest = /^(Tempestivo|Intempestivo)$/.test(t.Tempestividade) ? t.Tempestividade : '';
  if (tem(t, 'Preparo')) k.preparo = { 'Comprovado': 'Comprovado', 'Não Recolhido': 'Não recolhido', 'Não se Aplica': 'Não se aplica' }[t.Preparo] ||
    (t.Preparo === 'Dispensado' ? (/^(Justiça gratuita|Isento)/.test(c.preparo || '') ? c.preparo : 'Justiça gratuita') : '');
  if (tem(t, 'Representação')) k.repres = t['Representação'] === 'Regular' ? (/^Dispensada/.test(c.repres || '') ? c.repres : 'Regular') : t['Representação'] === 'Negativo' ? 'Irregular – intimar' : '';
  if (tem(t, 'Mídias')) k.midias = { 'Juntada': 'Juntadas', 'Faltante': 'Faltantes', 'Não se Aplica': 'Não se aplica' }[t['Mídias']] || '';
  if (tem(t, 'MPF')) k.parecer = t.MPF === 'Com Parecer' ? 'Com parecer' : t.MPF === 'Sem Parecer' ? (/^(Aguardando|Intimado)/.test(c.parecer || '') ? c.parecer : 'Aguardando parecer') : '';
  if (tem(t, 'Prelim.') && (naLista(LISTAS.prelim, t['Prelim.']) || !t['Prelim.'])) k.prelim = naLista(LISTAS.prelim, t['Prelim.']) || '';
  if (tem(t, 'Intercorrências')) k.intercor = t['Intercorrências'];
  if (tem(p, 'Voto - Resultado') && (naLista(LISTAS.resJulg, p['Voto - Resultado']) || !p['Voto - Resultado'])) k.resJulg = naLista(LISTAS.resJulg, p['Voto - Resultado']) || '';
  if (tem(p, 'Voto - Honorários') && (naLista(LISTAS.honor, p['Voto - Honorários']) || !p['Voto - Honorários'])) k.honor = naLista(LISTAS.honor, p['Voto - Honorários']) || '';
  if (tem(p, 'Tópico-síntese') && naLista(LISTAS.simnao, p['Tópico-síntese'])) k.topico = naLista(LISTAS.simnao, p['Tópico-síntese']);
  if (tem(p, 'MINUTADO') && /^(\d{4}-\d{2}-\d{2})?$/.test(p.MINUTADO)) d.dataMinuta = p.MINUTADO;
  if (tem(p, 'Data da Revisão') && /^(\d{4}-\d{2}-\d{2})?$/.test(p['Data da Revisão'])) d.dataCorrecao = p['Data da Revisão'];
  if (tem(p, 'Data da Liberação') && /^(\d{4}-\d{2}-\d{2})?$/.test(p['Data da Liberação'])) d.dataLiberacao = p['Data da Liberação'];
  if (tem(p, 'SERVIDOR')) d.servidor = p.SERVIDOR;
  if (tem(p, 'CORRETOR')) d.corretor = p.CORRETOR;
  const C2 = { 'Especificidades': 'especificidades', 'Alegações': 'questoes', 'Tipo de Julgamento': 'tipoJ', 'Síntese Fática': 'sintese' };
  Object.keys(C2).forEach(x => { if (tem(t, x)) cart[C2[x]] = t[x]; });
  if (tem(mud.origem || {}, 'Observações')) cart.obsGeral = mud.origem['Observações'];
  if (tem(t, 'Parecer - Sentido') || tem(t, 'ID do Parecer MPF')) { cart.mpfx = Object.assign({}, (c.cartao || {}).mpfx); if (tem(t, 'Parecer - Sentido')) cart.mpfx.sentido = t['Parecer - Sentido']; if (tem(t, 'ID do Parecer MPF')) cart.mpfx.id = t['ID do Parecer MPF']; }
  if (tem(t, 'Tempest - Publicação') || tem(t, 'Tempest - Protocolo')) { cart.adm = Object.assign({}, (c.cartao || {}).adm); if (tem(t, 'Tempest - Publicação')) cart.adm.intim = t['Tempest - Publicação']; if (tem(t, 'Tempest - Protocolo')) cart.adm.prot = t['Tempest - Protocolo']; }
  if (tem(p, 'Voto - Descrição')) { cart.jul = Object.assign({}, (c.cartao || {}).jul, { fund: p['Voto - Descrição'] }); }
  return { d, k, cart };
}
/* aplica a volta num item da pauta ou das monocráticas; devolve true se mudou */
function aplicaCartao(it, v, u) {
  let m = false; it.ctl = it.ctl || {};
  Object.keys(v.d).forEach(x => { if ((it[x] || '') !== v.d[x]) { it[x] = v.d[x]; m = true; } });
  Object.keys(v.k).forEach(x => { const val = v.k[x]; if ((it.ctl[x] || '') !== val) { if (val) it.ctl[x] = val; else delete it.ctl[x]; m = true; } });
  if (Object.keys(v.cart).length) { const ant = it.ctl.cartao || {}; Object.keys(v.cart).forEach(x => { if (JSON.stringify(ant[x]) !== JSON.stringify(v.cart[x])) { ant[x] = v.cart[x]; m = true; } }); it.ctl.cartao = ant; }
  if (m) { it.ctl.editadoPor = u; it.ctl.editadoEm = agora(); }
  return m;
}
/* arquivos onde o processo aparece hoje: pautas de sessões de hoje em diante e monocráticas/urgências */
async function ondeEsta(cnj) {
  const k = dg(cnj), hoje = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10), out = [];
  const cal = (await L.lerJson('acervo/sessoes/calendario.json')).dados;
  for (const s of (cal.sessoes || []).filter(s => s.date >= hoje)) {
    try { const rel = 'acervo/sessoes/' + s.date + '.json', { dados, sha } = await L.lerJson(rel);
      const its = (dados.itens || []).concat(dados.previa || []).filter(i => dg(i.cnj) === k); if (its.length) out.push({ path: rel, dados, sha, its }); } catch (e) { if (e.status !== 404) throw e; }
  }
  /* monocráticas e urgências não têm arquivo próprio: leem o operacional, gravado neste mesmo commit */
  return out;
}
const VC = {
  tipoJ: v => ({ triagem: { 'Tipo de Julgamento': v } }), especificidades: v => ({ triagem: { 'Especificidades': v } }), questoes: v => ({ triagem: { 'Alegações': v } }),
  sintese: v => ({ triagem: { 'Síntese Fática': v } }), obsGeral: v => ({ origem: { 'Observações': v } }),
  'mpfx.sentido': v => ({ triagem: { 'Parecer - Sentido': v } }), 'mpfx.id': v => ({ triagem: { 'ID do Parecer MPF': v } }),
  'adm.intim': v => ({ triagem: { 'Tempest - Publicação': v } }), 'adm.prot': v => ({ triagem: { 'Tempest - Protocolo': v } }), 'adm.prazo': v => ({ triagem: { 'Tempest - Prazo legal': v } }),
  'adm.dobro': v => ({ triagem: { 'Tempest - Dobro': v === true || v === 'true' ? '2' : '1' } }), 'adm.ajg': v => ({ triagem: { 'AJG': v === true || v === 'true' ? 'Sim' : '' } }),
  'jul.fund': v => ({ producao: { 'Voto - Descrição': v } }), 'jul.topico': v => ({ producao: { 'Tópico-síntese': v } })
};
/* ficha → campos do cartão (Monocráticas e urgências): o inverso de V, no vocabulário do app */
const INV = {
  tempest: r => r.triagem.Tempestividade, prelim: r => r.triagem['Prelim.'], intercor: r => r.triagem['Intercorrências'],
  preparo: r => ({ 'Comprovado': 'Comprovado', 'Não Recolhido': 'Não recolhido', 'Não se Aplica': 'Não se aplica' }[r.triagem.Preparo] || (r.triagem.Preparo === 'Dispensado' ? (r.triagem.AJG === 'Sim' ? 'Justiça gratuita' : 'Isento (DPU/ente público)') : '')),
  repres: r => { const v = r.triagem['Representação'], o = r.triagem['Observação da Representação'] || ''; return v === 'Regular' ? (/^Dispensada/.test(o) ? o : 'Regular') : v === 'Negativo' ? (/^Irregular/.test(o) ? o : 'Irregular') : ''; },
  midias: r => ({ 'Juntada': 'Juntadas', 'Faltante': 'Faltantes', 'Não se Aplica': 'Não se aplica' }[r.triagem['Mídias']] || ''),
  mpf: r => r.triagem['MPF - Custos Legis'] === 'Não' ? 'Sem hipótese' : r.triagem['MPF - Custos Legis'] === 'Sim' ? (r.triagem['Observação MPF'] || '') : '',
  parecer: r => ({ 'Com Parecer': 'Com parecer', 'Sem Parecer': 'Aguardando parecer' }[r.triagem.MPF] || ''),
  resJulg: r => r.producao['Voto - Resultado'], honor: r => r.producao['Voto - Honorários'], topico: r => r.producao['Tópico-síntese'],
  hip932: r => r.triagem['Hipóteses Monocrática'], tipoAto: r => r.producao['Mono - Tipo de ato'], fundamento: r => r.producao['Mono - Fundamento'],
  urgTipo: r => r.triagem['Urgência'], urgNivel: r => r.triagem['Urgência - Nível'], urgSit: r => r.triagem['Urgência - Apreciação'], urgPedido: r => r.triagem['Urgência - Data'],
  urgData: r => r.triagem['Urgência - Apreciada em'], urgObs: r => r.triagem['Urgência - Observação'], urgPainel: r => r.triagem['Urgência - Painel']
};
function paraCtl(r) {
  const o = {}, R = { triagem: (r && r.triagem) || {}, producao: (r && r.producao) || {} };
  Object.keys(INV).forEach(k => { const v = INV[k](R); if (v) o[k] = v; });
  return o;
}
/* regras dos Controles especiais, iguais em qualquer porta de entrada (ficha, páginas, CMT-monitor):
   monocrática registrada ganha a data; urgência registrada ganha a data do pedido e a apreciação pendente; quem alterou o grupo fica anotado */
function regras(r, out, u) {
  const t = r.triagem = r.triagem || {}, p = r.producao = r.producao || {}, c = r.controles = r.controles || {}, hj = agora().slice(0, 10), mud = new Set(out);
  if (mud.has('producao.Destino') && p.Destino === 'Monocrática' && !c['Monocrática - Registrada em']) { c['Monocrática - Registrada em'] = hj; out.push('controles.Monocrática - Registrada em'); }
  if (mud.has('triagem.Urgência') && t['Urgência']) {
    if (!t['Urgência - Data']) { t['Urgência - Data'] = hj; out.push('triagem.Urgência - Data'); }
    if (!t['Urgência - Apreciação']) { t['Urgência - Apreciação'] = 'Pendente · não apreciada'; out.push('triagem.Urgência - Apreciação'); }
  }
  const grupos = new Set();
  out.forEach(k => { const m = /^controles\.(Monocrática|Meta|Sobrestamento|Sensível) - /.exec(k); if (m) grupos.add(m[1]); });
  if (mud.has('producao.Destino')) grupos.add('Monocrática');
  if (u) grupos.forEach(g => { c[g + ' - Atualizado por'] = u; c[g + ' - Atualizado em'] = hj; });
}
/* ficha → cartão integral (inverso de VC): o valor gravado na ficha prevalece sobre o guardado no cartão */
const VCI = { tipoJ: ['triagem', 'Tipo de Julgamento'], especificidades: ['triagem', 'Especificidades'], questoes: ['triagem', 'Alegações'],
  sintese: ['triagem', 'Síntese Fática'], obsGeral: ['origem', 'Observações'],
  'mpfx.sentido': ['triagem', 'Parecer - Sentido'], 'mpfx.id': ['triagem', 'ID do Parecer MPF'], 'adm.intim': ['triagem', 'Tempest - Publicação'],
  'adm.prot': ['triagem', 'Tempest - Protocolo'], 'adm.prazo': ['triagem', 'Tempest - Prazo legal'], 'adm.dobro': ['triagem', 'Tempest - Dobro', 1], 'adm.ajg': ['triagem', 'AJG', 1],
  'jul.fund': ['producao', 'Voto - Descrição'], 'jul.topico': ['producao', 'Tópico-síntese'] };
function cartaoDaFicha(r, base) {
  const c = JSON.parse(JSON.stringify(base || {}));
  Object.keys(VCI).forEach(p => { const [s, k, b] = VCI[p], v = ((r && r[s]) || {})[k]; if (!v) return;
    const ks = p.split('.'); let o = c; ks.slice(0, -1).forEach(x => { o = o[x] = (o[x] && typeof o[x] === 'object') ? o[x] : {}; }); o[ks[ks.length - 1]] = b ? (v === 'Sim' || v === '2') : v; });
  return c;
}
/* grava {secao: {chave: valor}} no registro do processo (cria se faltar), com nova tentativa se o arquivo mudou no meio */
async function gravar(cnj, mud, msg, extra, u, outros) {
  const F = await ficha();
  for (let t = 0; t < 4; t++) {
    const { doc, sha } = await lerOp(), r = registro(doc, cnj, F, true), out = aplica(r, mud);
    if (extra) extra(r, out);
    if (!out.length) return { r, out };
    regras(r, out, u);
    doc.atualizado_em = agora();
    const arqs = [{ path: OP, txt: JSON.stringify(doc, null, 1) + '\n', sha }], mais = outros ? await outros(r, out) : [];
    try { await commitConferido(arqs.concat(mais), msg + ' · ' + out.slice(0, 6).join(', ') + (mais.length ? '\n\nCartão atualizado em: ' + mais.map(x => x.path).join(', ') : '')); return { r, out }; }
    catch (e) { if (e.status !== 409) throw e; }
  }
  const e = new Error('A ficha mudou várias vezes seguidas; tente de novo.'); e.status = 409; throw e;
}
function junta(a, b) { Object.keys(b).forEach(s => { a[s] = Object.assign(a[s] || {}, b[s]); }); return a; }
function doCartao(campos, cartao) {
  const m = {};
  Object.keys(campos || {}).forEach(k => { if (V[k]) junta(m, V[k](String(campos[k] == null ? '' : campos[k]))); });
  const c = cartao || {};
  Object.keys(VC).forEach(p => { const v = p.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), c); if (v !== undefined) junta(m, VC[p](v)); });
  return m;
}
/* commit com conferência (ver _lib.commitArquivos): arquivo mudado ou ramo andou → 409, e quem chamou tenta de novo */
async function commitConferido(arqs, msg) {
  try { return await L.commitArquivos(arqs, msg); }
  catch (e) { if (e.status === 422) e.status = 409; throw e; }
}
/* pauta e monocráticas: espelha no operacional, no mesmo commit do arquivo da pauta */
async function espelho(arqPauta, cnj, campos, cartao, msg) {
  const F = await ficha(), mud = doCartao(campos, cartao);
  if (!Object.keys(mud).length) return commitConferido([arqPauta], msg);
  const { doc, sha } = await lerOp(), r = registro(doc, cnj, F, true), out = aplica(r, mud);
  const arqs = [arqPauta];
  if (out.length) { regras(r, out); doc.atualizado_em = agora(); arqs.push({ path: OP, txt: JSON.stringify(doc, null, 1) + '\n', sha }); }
  return commitConferido(arqs, msg + (out.length ? '\n\nFicha (operacional): ' + out.slice(0, 12).join(', ') : ''));
}
module.exports = async (req, res, u) => {
  try {
    const F = await ficha();
    if (req.method === 'GET') {
      const cnj = String(req.query.ficha || '');
      if (dg(cnj).length !== 20) return res.status(200).json({ ficha: F });
      const [{ doc }, fonte] = await Promise.all([lerOpLeitura(), fonteDe(cnj)]);
      /* Controles especiais: o registro do operacional diz o que já foi registrado; as listas do acervo dizem se o processo entra na meta, no sobrestamento ou nos casos sensíveis */
      const naLista = mod => require(mod).base().then(B => (Array.isArray(B) ? B : B.lista).find(x => dg(x.cnj) === dg(cnj)) || null).catch(() => null);
      const [bMeta, bSobr, bSens] = await Promise.all([naLista('./_metas'), naLista('./_sobr'), naLista('./_sens')]);
      const op = registro(doc, cnj, F, false) || null;
      return res.status(200).json({ ficha: F, operacional: op, fonte, gestor: L.gestor(u), controles: ativos(op, { metas: bMeta, sobrestados: bSobr, sensiveis: bSens }) });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    const b = req.body || {}, cnj = String(b.cnj || ''), C = b.campos || {}, E = editaveis(F), mud = {}, recus = [];
    if (dg(cnj).length !== 20) return res.status(400).json({ erro: 'número do processo inválido' });
    Object.keys(C).forEach(k => {
      if (!E[k]) { recus.push(k); return; }
      if (SO_GESTOR.has(k) && !L.gestor(u)) { recus.push(k); return; }
      let v = C[k];
      if (E[k].tipo === 'tabela') { const cols = (E[k].colunas || []).map(c => c.chave); v = (Array.isArray(v) ? v : []).slice(0, 60).map(l => { const o = {}; cols.forEach(c => { const x = l && l[c]; if (x != null && String(x).trim()) o[c] = String(x).slice(0, 4000); }); return o; }).filter(o => Object.keys(o).length); }
      else if (typeof v === 'object' && v !== null) { recus.push(k); return; }
      const i = k.indexOf('.'); (mud[k.slice(0, i)] = mud[k.slice(0, i)] || {})[k.slice(i + 1)] = v;
    });
    if (!Object.keys(mud).length) return res.status(400).json({ erro: 'nenhum campo editável', recusados: recus });
    /* volta: o que tem correspondência no cartão é gravado também na pauta das sessões onde o processo está, no mesmo commit */
    const cart = [];
    const { r, out } = await gravar(cnj, mud, 'Ficha (' + u + '): ' + cnj, null, u, async () => {
      const arqs = []; cart.length = 0;
      for (const a of await ondeEsta(cnj)) {
        let mudou = false; a.its.forEach(it => { if (aplicaCartao(it, paraCartao(mud, it), u)) mudou = true; });
        if (mudou) { a.dados.atualizadoEm = agora(); arqs.push({ path: a.path, txt: JSON.stringify(a.dados, null, 1) + '\n', sha: a.sha }); cart.push(a.path); }
      }
      return arqs;
    });
    return res.status(200).json(Object.assign({ ok: true, operacional: r, recusados: recus, cartoes: cart }, out.length ? {} : { semMudanca: true }));
  } catch (e) { res.status(e.status === 404 ? 404 : e.status === 409 ? 409 : 500).json({ erro: e.message }); }
};
/* quais grupos dos Controles especiais valem para o processo */
function ativos(op, lista) {
  const t = (op && op.triagem) || {}, p = (op && op.producao) || {}, c = (op && op.controles) || {};
  return { urgencia: !!t['Urgência'], monocratica: p.Destino === 'Monocrática', meta: !!lista.metas, sobrestamento: !!lista.sobrestados,
    sensivel: c['Sensível - Excluído'] !== 'Sim' && (!!lista.sensiveis || c['Sensível - Incluído'] === 'Sim'), naLista: lista };
}
module.exports.espelho = espelho;
module.exports.gravar = gravar;
module.exports.paraCtl = paraCtl;
module.exports.cartaoDaFicha = cartaoDaFicha;
module.exports.lerOp = lerOp;
module.exports.lerOpLeitura = lerOpLeitura;
module.exports.ativos = ativos;
module.exports.doCartao = doCartao;
module.exports.paraCartao = paraCartao;
