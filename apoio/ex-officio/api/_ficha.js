/* Ficha única do processo (padrao/ficha.json) gravada em acervo/operacional.json, o mesmo registro que o Caput usa.
   Servido por /api/pauta (o plano Hobby da Vercel aceita no máximo 12 funções; arquivos com _ não contam):
   GET  /api/pauta?ficha=<CNJ>            ficha (modelo), registro do operacional e dados da fonte (só leitura)
   POST /api/pauta?ficha=1 {cnj, campos}   campos = { 'triagem.Tempestividade': 'Tempestivo', ... }; cria o registro se faltar
   Também exporta espelho(), usado pela pauta e pelas monocráticas: o que a equipe registra no cartão vai para a ficha no mesmo commit. */
const L = require('./_lib');
const VOC = require('./_vocabulario'); /* vocabulário único (padrao/vocabulario.json): ficha e cartão usam os mesmos valores */
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
function detalhamento(t) { t=t||{}; if(Object.prototype.hasOwnProperty.call(t,'Detalhamento do caso')) return String(t['Detalhamento do caso']||''); return [...new Set([t.Tema,t.Especificidades].map(x=>String(x||'').trim()).filter(Boolean))].join('\n'); }
function editaveis(F) {
  const m = {};
  F.abas.forEach(a => a.grupos.forEach(g => g.campos.forEach(c => { if (c.secao && c.editavel !== false && !c.calculado) m[c.secao + '.' + c.chave] = c; })));
  F.abas.forEach(a => { if (a.seletor) m[a.seletor.secao + '.' + a.seletor.chave] = a.seletor; });
  const dc=m['triagem.Detalhamento do caso']||m['triagem.Especificidades']||m['triagem.Tema'];if(dc){m['triagem.Detalhamento do caso']=dc;m['triagem.Tema']=dc;m['triagem.Especificidades']=dc;}
  /* Compatibilidade de clientes anteriores: a escrita legada é convertida no campo canônico. */
  if(m['triagem.Tipo de Julgamento'])m['triagem.Padrão - Espécie']=m['triagem.Tipo de Julgamento'];
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
/* Atualiza por ID, inclusive em retry de concorrência, sem apagar outras classificações. */
function mesclarClassificacao(old, patch) {
  const m = new Map();
  (Array.isArray(old) ? old : []).concat(Array.isArray(patch) ? patch : []).forEach(r => {
    if (r && /^\d{1,30}$/.test(String(r.id || ''))) m.set(String(r.id), Object.assign({}, r, { id: String(r.id) }));
  });
  return Array.from(m.values());
}
/* Vínculo de origem: chave composta, não sobrescreve registros de outros usuários. */
function mesclarReferencia(old,patch){
 const m=new Map();(Array.isArray(old)?old:[]).concat(Array.isArray(patch)?patch:[]).forEach(x=>{
   if(x&&dg(x.cnj_referencia).length===20&&/^\d{6,30}$/.test(String(x.id||'')))m.set(dg(x.cnj_referencia)+'|'+String(x.id),x);
 });
 if(m.size>500){const e=new Error('Limite de 500 peças vinculadas. Nenhum registro foi alterado.');e.status=400;throw e;}
 return Array.from(m.values());
}
function mesclarOcorrencias(old,patch){
  const parse=v=>{try{const x=JSON.parse(v||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch(e){return {};}};
  const base=parse(old),inc=parse(patch);
  for(const [k,v] of Object.entries(inc)){if(!/^\d{4}-\d{2}-\d{2}\|[^|]{1,30}$/.test(k)||!v||typeof v!=='object')continue;
    const ingresso=['PAUTADO','EM MESA',''].includes(v.ingresso)?v.ingresso:'',ocorrencia=['Retirada de pauta','Adiamento'].includes(v.ocorrencia)?v.ocorrencia:'';
    base[k]={ingresso,ocorrencia,justificativa:ocorrencia?String(v.justificativa||'').trim().slice(0,4000):'',solicitacao:ocorrencia?String(v.solicitacao||'').slice(0,80):'',efetivada:!!(ocorrencia&&String(v.justificativa||'').trim()&&v.efetivada===true)};
  }return JSON.stringify(base);
}
function aplica(r, mud) {
  const out = [];
  const t=mud.triagem, has=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
  if(t&&(has(t,'Tipo de Julgamento')||has(t,'Padrão - Espécie'))){
    const aliases={ed:'Embargos de declaração',interno:'Agravo interno',agint:'Agravo interno',retratacao:'Juízo de retratação'};
    const parse=v=>String(v||'').split(/\s*(?:\+|;|,|·)\s*/).filter(Boolean).map(x=>aliases[x.toLowerCase()]||x);
    const prev=parse((r.triagem||{})['Tipo de Julgamento']),legacy=parse(t['Padrão - Espécie']);
    const types=has(t,'Tipo de Julgamento')?parse(t['Tipo de Julgamento']):[...new Set(prev.concat(legacy))];
    t['Tipo de Julgamento']=[...new Set(types)].join(' + ');
    t['Padrão - Espécie']=types.find(x=>['Embargos de declaração','Agravo interno','Juízo de retratação'].includes(x))||'';
  }
  if(t&&(has(t,'Detalhamento do caso')||has(t,'Tema')||has(t,'Especificidades'))){
    const ant=r.triagem||{};
    let v=has(t,'Detalhamento do caso')?String(t['Detalhamento do caso']||''): [...new Set([has(t,'Tema')?t.Tema:ant.Tema,has(t,'Especificidades')?t.Especificidades:ant.Especificidades].map(x=>String(x||'').trim()).filter(Boolean))].join('\n');
    t['Detalhamento do caso']=v;
    /* Espelho legado temporário: leitores antigos continuam funcionando. */
    t.Tema=v;t.Especificidades=v;
  }
  /* texto, ou lista de linhas (campos "tabela" da ficha) */
  const igual = (x, y) => (typeof x === 'object' && x) || (typeof y === 'object' && y) ? JSON.stringify(x == null || x === '' ? [] : x) === JSON.stringify(y == null || y === '' ? [] : y) : String(x == null ? '' : x) === String(y == null ? '' : y);
  Object.keys(mud).forEach(s => { r[s] = r[s] || {}; Object.keys(mud[s]).forEach(k => { const raw = mud[s][k], v = s === 'pauta' && k === 'Ingresso e ocorrências da sessão' ? mesclarOcorrencias(r[s][k],raw) : s === 'origem' && k === 'Classificação documental' ? mesclarClassificacao(r[s][k], raw) : s === 'origem' && k === 'Origem - Peças vinculadas 1G' ? mesclarReferencia(r[s][k],raw) : Array.isArray(raw) ? raw : String(raw == null ? '' : raw); if (!igual(r[s][k], v)) { r[s][k] = v; out.push(s + '.' + k); } }); });
  if (out.length) { r.origem = r.origem || {}; r.origem.atualizado_em = agora(); }
  return out;
}
/* cartão da pauta → campos da ficha (vocabulário do Monitor) */
const V = {
  tempest: v => ({ triagem: { 'Tempestividade': VOC.norm('tempest', v) } }),
  preparo: v => { const n = VOC.norm('preparo', v); return { triagem: Object.assign({ 'Preparo': n }, n === 'Justiça gratuita' ? { 'AJG': 'Sim' } : {}, n === 'Assistência da DPU' ? { 'DPU (controle)': 'Sim' } : {}) }; },
  repres: v => ({ triagem: { 'Representação': VOC.norm('repres', v) } }),
  midias: v => ({ triagem: { 'Mídias': VOC.norm('midias', v) } }),
  mpf: v => ({ triagem: { 'MPF - Custos Legis': VOC.norm('mpf', v) } }),
  parecer: v => ({ triagem: { 'MPF': VOC.norm('parecer', v) } }),
  prelim: v => ({ triagem: { 'Prelim.': VOC.norm('prelim', v) } }),
  intercor: v => ({ triagem: { 'Intercorrências': v } }),
  /* sustentação oral ou preferência do cartão (Virtual, Presencial, Preferência) → ficha (Videoconferência, Presencial, Preferência) */
  sopref: v => ({ pauta: { 'Sustentação oral': ({ 'Virtual': 'Videoconferência', 'Presencial': 'Presencial', 'Preferência': 'Preferência' })[v] || '' } }),
  /* retirada e adiamento decididos pelo relator: vão ao Status de Julgamento da ficha */
  resultado: v => (/^retirad/i.test(v) ? { pauta: { 'Status de Julgamento': 'RETIRADO DE PAUTA' } }
    : /^adiad/i.test(v) ? { pauta: { 'Status de Julgamento': 'ADIADO' } }
    : String(v || '').trim() === '' ? { pauta: { 'Status de Julgamento': 'PAUTADO' } } : {}),
  resJulg: v => ({ producao: { 'Voto - Resultado': VOC.norm('resJulg', v) } }),
  honor: v => ({ producao: { 'Voto - Honorários': v } }),
  topico: v => ({ producao: { 'Tópico-síntese': v } }),
  /* título do caso (painel do Desembargador) e consectários: campos da ficha desde 0.71.2 (antes só no registro extra da monocrática) */
  titulo: v => ({ producao: { 'Mono - Título': String(v || '').slice(0, 90) } }),
  consect: v => ({ producao: { 'Consectários no julgamento': v } }),
  servidor: v => ({ producao: { 'SERVIDOR': v } }),
  corretor: v => ({ producao: { 'CORRETOR': v } }),
  dataMinuta: v => ({ producao: { 'MINUTADO': v } }),
  dataCorrecao: v => ({ producao: { 'Data da Revisão': v, 'CORRIGIDO': v ? 'Sim' : '' } }),
  dataLiberacao: v => ({ producao: { 'Data da Liberação': v, 'LIBERADO': v ? 'Sim' : '' } }),
  /* assinatura da monocrática, confirmada no prontuário da Ex Officio */
  dataAssinatura: v => ({ producao: { 'Data da Assinatura': v, 'Assinado': v ? 'Sim' : '' } }),
  /* publicação da monocrática (a extensão também a tira dos autos) */
  decisaoId: v => ({ producao: { 'Decisão - ID': String(v || '').trim() } }),
  dataPublicacao: v => ({ producao: { 'Mono - Data da publicação': v, 'Publicado': v ? 'Sim' : '' } }),
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
  resJulg: VOC.lista('resJulg'), /* vocabulário único: acórdão e monocrática */
  honor: ['Majorados', 'Mantidos', 'Invertidos', 'Fixados', 'Redistribuídos', 'Sem honorários recursais'], prelim: ['Sem preliminares', 'Há preliminares', 'Preliminar de ofício'], simnao: ['Sim', 'Não']
};
const naLista = (L, v) => L.find(x => x.toLowerCase() === String(v || '').trim().toLowerCase()) || null;
function paraCartao(mud, it) {
  const c = (it && it.ctl) || {}, d = {}, k = {}, cart = {}, t = mud.triagem || {}, p = mud.producao || {}, tem = (o, x) => Object.prototype.hasOwnProperty.call(o, x);
  /* mesmo vocabulário na ficha e no cartão: só normaliza (valores antigos resolvidos pelo AJG, DPU e observação) */
  const ctx = { ajg: t.AJG, dpu: t['DPU (controle)'], obs: t['Observação da Representação'] };
  if (tem(t, 'Tempestividade')) k.tempest = VOC.norm('tempest', t.Tempestividade);
  if (tem(t, 'Preparo')) k.preparo = VOC.norm('preparo', t.Preparo, ctx);
  if (tem(t, 'Representação')) k.repres = VOC.norm('repres', t['Representação'], ctx);
  if (tem(t, 'Mídias')) k.midias = VOC.norm('midias', t['Mídias']);
  if (tem(t, 'MPF')) k.parecer = VOC.norm('parecer', t.MPF);
  if (tem(t, 'MPF - Custos Legis')) k.mpf = VOC.norm('mpf', t['MPF - Custos Legis'] === 'Sim' ? (t['Observação MPF'] || 'Sim') : t['MPF - Custos Legis']);
  if (tem(t, 'Prelim.')) k.prelim = VOC.norm('prelim', t['Prelim.']);
  if (tem(t, 'Intercorrências')) k.intercor = t['Intercorrências'];
  const pa = mud.pauta || {};
  if (tem(pa, 'Sustentação oral')) k.sopref = ({ 'Videoconferência': 'Virtual', 'Virtual': 'Virtual', 'Presencial': 'Presencial', 'Preferência': 'Preferência' })[pa['Sustentação oral']] || '';
  if (tem(p, 'Voto - Resultado')) { const rj = VOC.norm('resJulg', p['Voto - Resultado']); if (naLista(LISTAS.resJulg, rj) || !rj) k.resJulg = naLista(LISTAS.resJulg, rj) || ''; }
  if (tem(p, 'Voto - Honorários') && (naLista(LISTAS.honor, p['Voto - Honorários']) || !p['Voto - Honorários'])) k.honor = naLista(LISTAS.honor, p['Voto - Honorários']) || '';
  if (tem(p, 'Tópico-síntese') && naLista(LISTAS.simnao, p['Tópico-síntese'])) k.topico = naLista(LISTAS.simnao, p['Tópico-síntese']);
  if (tem(p, 'Consectários no julgamento') && (naLista(LISTAS.simnao, p['Consectários no julgamento']) || !p['Consectários no julgamento'])) k.consect = naLista(LISTAS.simnao, p['Consectários no julgamento']) || '';
  if (tem(p, 'MINUTADO') && /^(\d{4}-\d{2}-\d{2})?$/.test(p.MINUTADO)) d.dataMinuta = p.MINUTADO;
  if (tem(p, 'Data da Revisão') && /^(\d{4}-\d{2}-\d{2})?$/.test(p['Data da Revisão'])) d.dataCorrecao = p['Data da Revisão'];
  if (tem(p, 'Data da Liberação') && /^(\d{4}-\d{2}-\d{2})?$/.test(p['Data da Liberação'])) d.dataLiberacao = p['Data da Liberação'];
  if (tem(p, 'SERVIDOR')) d.servidor = p.SERVIDOR;
  if (tem(p, 'CORRETOR')) d.corretor = p.CORRETOR;
  const C2 = { 'Especificidades': 'especificidades', 'Alegações': 'questoes', 'Tipo de Julgamento': 'tipoJ', 'Síntese Fática': 'sintese', 'Tema': 'subassuntos', 'Assunto detalhado': 'assuntoDet' };
  Object.keys(C2).forEach(x => { if (tem(t, x)) cart[C2[x]] = t[x]; });
  if(tem(t,'Detalhamento do caso')){cart.detalhamento=t['Detalhamento do caso'];cart.especificidades=cart.subassuntos=cart.detalhamento;}
  /* decisão de origem: o que a HERO18810 grava na ficha aparece no prontuário da pauta */
  const g = mud.origem || {}, O2 = { 'Origem - Juízo': 'juizo', 'Origem - Julgador': 'julgador', 'Origem - Valor da causa': 'valor', 'Sentença - Custas': 'custas', 'Sentença - Honorários': 'honor' };
  const og = Object.assign({}, (c.cartao || {}).orig); let om = false;
  Object.keys(O2).forEach(x => { if (tem(g, x)) { og[O2[x]] = g[x]; om = true; } });
  if ((tem(g, 'Sentença - ID') || tem(g, 'Sentença - Data')) && (!og.tipo || og.tipo === 'Sentença')) {
    if (tem(g, 'Sentença - ID')) og.id = g['Sentença - ID'];
    if (tem(g, 'Sentença - Data')) og.data = g['Sentença - Data'];
    if (!og.tipo && (og.id || og.data)) og.tipo = 'Sentença';
    om = true;
  }
  if (om) cart.orig = og;
  if (tem(mud.origem || {}, 'Observações')) cart.obsGeral = mud.origem['Observações'];
  if (tem(t, 'Parecer - Sentido') || tem(t, 'ID do Parecer MPF')) { cart.mpfx = Object.assign({}, (c.cartao || {}).mpfx); if (tem(t, 'Parecer - Sentido')) cart.mpfx.sentido = t['Parecer - Sentido']; if (tem(t, 'ID do Parecer MPF')) cart.mpfx.id = t['ID do Parecer MPF']; }
  if (tem(t, 'Tempest - Publicação') || tem(t, 'Tempest - Protocolo')) { cart.adm = Object.assign({}, (c.cartao || {}).adm); if (tem(t, 'Tempest - Publicação')) cart.adm.intim = t['Tempest - Publicação']; if (tem(t, 'Tempest - Protocolo')) cart.adm.prot = t['Tempest - Protocolo']; }
  if (tem(p, 'Voto - Descrição')) { cart.jul = Object.assign({}, (c.cartao || {}).jul, { fund: p['Voto - Descrição'] }); }
  return { d, k, cart };
}
/* aplica a volta num item da pauta ou das monocráticas; devolve true se mudou */
function aplicaCartao(it, v, u) {
  let m = false; it.ctl = it.ctl || {};
  const designacoes=[];
  Object.keys(v.d).forEach(x => { if ((it[x] || '') !== v.d[x]) { if(['servidor','corretor'].includes(x))designacoes.push({papel:x==='servidor'?'minuta':'correção',de:it[x]||'',para:v.d[x]||''}); it[x] = v.d[x]; m = true; } });
  Object.keys(v.k).forEach(x => { const val = v.k[x]; if ((it.ctl[x] || '') !== val) { if (val) it.ctl[x] = val; else delete it.ctl[x]; m = true; } });
  if (Object.keys(v.cart).length) { const ant = it.ctl.cartao || {}; Object.keys(v.cart).forEach(x => { if (JSON.stringify(ant[x]) !== JSON.stringify(v.cart[x])) { ant[x] = v.cart[x]; m = true; } }); it.ctl.cartao = ant; }
  if (m) { it.ctl.editadoPor = u; it.ctl.editadoEm = agora(); if(designacoes.length)it.ctl.historicoDesignacoes=(Array.isArray(it.ctl.historicoDesignacoes)?it.ctl.historicoDesignacoes:[]).concat({em:it.ctl.editadoEm,por:u,alteracoes:designacoes}).slice(-20); }
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
  detalhamento: v => ({ triagem: { 'Detalhamento do caso': v } }), tipoJ: v => ({ triagem: { 'Tipo de Julgamento': v } }), especificidades: v => ({ triagem: { 'Especificidades': v } }), questoes: v => ({ triagem: { 'Alegações': v } }),
  sintese: v => ({ triagem: { 'Síntese Fática': v } }), obsGeral: v => ({ origem: { 'Observações': v } }),
  'mpfx.sentido': v => ({ triagem: { 'Parecer - Sentido': v } }), 'mpfx.id': v => ({ triagem: { 'ID do Parecer MPF': v } }),
  'adm.intim': v => ({ triagem: { 'Tempest - Publicação': v } }), 'adm.prot': v => ({ triagem: { 'Tempest - Protocolo': v } }), 'adm.prazo': v => ({ triagem: { 'Tempest - Prazo legal': v } }),
  'adm.dobro': v => ({ triagem: { 'Tempest - Dobro': v === true || v === 'true' ? '2' : '1' } }), 'adm.ajg': v => ({ triagem: { 'AJG': v === true || v === 'true' ? 'Sim' : '' } }),
  'jul.fund': v => ({ producao: { 'Voto - Descrição': v } }), 'jul.topico': v => ({ producao: { 'Tópico-síntese': v } }),
  /* prontuário único (pauta = HERO18810): tipo de caso, assunto detalhado e decisão de origem também vão à ficha */
  subassuntos: v => ({ triagem: { 'Tema': v } }), assuntoDet: v => ({ triagem: { 'Assunto detalhado': v } }),
  'orig.juizo': v => ({ origem: { 'Origem - Juízo': v } }), 'orig.julgador': v => ({ origem: { 'Origem - Julgador': v } }),
  'orig.valor': v => ({ origem: { 'Origem - Valor da causa': v } }), 'orig.custas': v => ({ origem: { 'Sentença - Custas': v } }),
  'orig.honor': v => ({ origem: { 'Sentença - Honorários': v } })
};
/* ID e data da decisão de origem só valem para a sentença (a ficha não guarda decisão interlocutória nem acórdão) */
const VC_SENT = { 'orig.id': 'Sentença - ID', 'orig.data': 'Sentença - Data' };
/* ficha → campos do cartão (Monocráticas e urgências): o inverso de V, no vocabulário do app */
const INV = {
  tempest: r => VOC.norm('tempest', r.triagem.Tempestividade), prelim: r => VOC.norm('prelim', r.triagem['Prelim.']), intercor: r => r.triagem['Intercorrências'],
  preparo: r => VOC.norm('preparo', r.triagem.Preparo, { ajg: r.triagem.AJG, dpu: r.triagem['DPU (controle)'] }),
  repres: r => VOC.norm('repres', r.triagem['Representação'], { dpu: r.triagem['DPU (controle)'], obs: r.triagem['Observação da Representação'] }),
  midias: r => VOC.norm('midias', r.triagem['Mídias']),
  mpf: r => VOC.norm('mpf', r.triagem['MPF - Custos Legis'] === 'Sim' ? (r.triagem['Observação MPF'] || '') : r.triagem['MPF - Custos Legis']),
  parecer: r => VOC.norm('parecer', r.triagem.MPF),
  resJulg: r => VOC.norm('resJulg', r.producao['Voto - Resultado']), honor: r => r.producao['Voto - Honorários'], topico: r => r.producao['Tópico-síntese'],
  hip932: r => r.triagem['Hipóteses Monocrática'], tipoAto: r => r.producao['Mono - Tipo de ato'], fundamento: r => r.producao['Mono - Fundamento'],
  titulo: r => r.producao['Mono - Título'], consect: r => r.producao['Consectários no julgamento'],
  urgTipo: r => r.triagem['Urgência'], urgNivel: r => r.triagem['Urgência - Nível'], urgSit: r => r.triagem['Urgência - Apreciação'], urgPedido: r => r.triagem['Urgência - Data'],
  urgData: r => r.triagem['Urgência - Apreciada em'], urgObs: r => r.triagem['Urgência - Observação'], urgPainel: r => r.triagem['Urgência - Painel']
};
function paraCtl(r) {
  const o = {}, R = { triagem: (r && r.triagem) || {}, producao: (r && r.producao) || {} };
  Object.keys(INV).forEach(k => { const v = INV[k](R); if (v) o[k] = v; });
  return o;
}
/* regras dos Controles especiais, iguais em qualquer porta de entrada (ficha, páginas, Caput):
   monocrática registrada ganha a data; urgência registrada ganha a data do pedido e a apreciação pendente; quem alterou o grupo fica anotado */
function regras(r, out, u) {
  const t = r.triagem = r.triagem || {}, p = r.producao = r.producao || {}, c = r.controles = r.controles || {}, hj = agora().slice(0, 10), mud = new Set(out);
  if (mud.has('producao.Destino') && p.Destino === 'Monocrática' && !c['Monocrática - Registrada em']) { c['Monocrática - Registrada em'] = hj; out.push('controles.Monocrática - Registrada em'); }
  /* destino confirmado (Sessão ou Monocrática): data e autor da confirmação; vazio volta a "a definir na triagem" */
  if (mud.has('producao.Destino')) { const cf = ['Sessão','Monocrática','Outro destino'].includes(p.Destino); t['Destino - Confirmado em'] = cf ? hj : ''; t['Destino - Confirmado por'] = cf ? (u || '') : ''; out.push('triagem.Destino - Confirmado em', 'triagem.Destino - Confirmado por'); }
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
  'jul.fund': ['producao', 'Voto - Descrição'], 'jul.topico': ['producao', 'Tópico-síntese'],
  subassuntos: ['triagem', 'Tema'], assuntoDet: ['triagem', 'Assunto detalhado'], 'orig.juizo': ['origem', 'Origem - Juízo'], 'orig.julgador': ['origem', 'Origem - Julgador'],
  'orig.valor': ['origem', 'Origem - Valor da causa'], 'orig.custas': ['origem', 'Sentença - Custas'], 'orig.honor': ['origem', 'Sentença - Honorários'] };
/* ficha → decisão de origem do cartão: ID e data da sentença, quando o cartão não registra outro tipo de decisão */
function origDaFicha(r, orig) {
  const g = (r && r.origem) || {}, o = Object.assign({}, orig || {});
  if (o.tipo && o.tipo !== 'Sentença') return null;
  let m = false;
  [['id', 'Sentença - ID'], ['data', 'Sentença - Data']].forEach(([k, f]) => { const v = g[f]; if (v && o[k] !== v) { o[k] = v; m = true; } });
  if (m && !o.tipo) o.tipo = 'Sentença';
  return m ? o : null;
}
function cartaoDaFicha(r, base) {
  const c = JSON.parse(JSON.stringify(base || {}));
  Object.keys(VCI).forEach(p => { const [s, k, b] = VCI[p], v = ((r && r[s]) || {})[k]; if (!v) return;
    const ks = p.split('.'); let o = c; ks.slice(0, -1).forEach(x => { o = o[x] = (o[x] && typeof o[x] === 'object') ? o[x] : {}; }); o[ks[ks.length - 1]] = b ? (v === 'Sim' || v === '2') : v; });
  c.detalhamento=detalhamento(r&&r.triagem);
  const og = origDaFicha(r, c.orig); if (og) c.orig = og;
  return c;
}
/* Destinação comum ao Cognitio e à HERO. Não modifica inclusão efetiva em pauta. */
function destinoCoerente(r,m){
 const p=r.producao||{},t=r.triagem||{},P=m.producao||{},T=m.triagem||{},A=m.pauta||{},has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 if(!has(P,'Destino')&&!has(P,'Mono - Tipo de ato')&&!has(P,'Destino - Outro')&&!has(T,'Seleção Prévia')&&!has(A,'Nova sessão de destino'))return m;
 const set=(s,k,v)=>{(m[s]||(m[s]={}))[k]=v;};
 let d=has(P,'Destino')?P.Destino:p.Destino||'',sp=has(T,'Seleção Prévia')?T['Seleção Prévia']:t['Seleção Prévia']||'';
 if(has(T,'Seleção Prévia')&&sp==='SELECIONADO PREVIAMENTE'&&!has(P,'Destino')){d='Sessão';set('producao','Destino',d);}
 if(d!=='Sessão'&&(sp==='SELECIONADO PREVIAMENTE'||t['Seleção Prévia']==='SELECIONADO PREVIAMENTE')){set('triagem','Seleção Prévia','');set('pauta','Nova sessão de destino','');}
 else if(d==='Sessão'&&has(T,'Seleção Prévia')&&sp!=='SELECIONADO PREVIAMENTE'&&t['Seleção Prévia']==='SELECIONADO PREVIAMENTE')set('pauta','Nova sessão de destino','');
 if(d!=='Monocrática'&&(has(P,'Destino')||has(T,'Seleção Prévia')))set('producao','Mono - Tipo de ato','');
 if(d!=='Outro destino'&&has(P,'Destino'))set('producao','Destino - Outro','');
 if(d!=='Sessão'&&(has(P,'Destino')||has(A,'Nova sessão de destino')))set('pauta','Nova sessão de destino','');
 return m;
}
/* Normalização compartilhada: a data explícita prevalece sobre o indicador,
   sem inventar datas quando a equipe marca somente o indicador. */
function mudancaCoerente(r,mud){
 const m=destinoCoerente(r,JSON.parse(JSON.stringify(mud||{}))),p=m.producao||{};
 [['Data da Revisão','CORRIGIDO'],['Data da Liberação','LIBERADO'],['Data da Assinatura','Assinado'],['Mono - Data da publicação','Publicado']].forEach(([data,flag])=>{
   if(Object.prototype.hasOwnProperty.call(p,data))p[flag]=String(p[data]||'').trim()?'Sim':'';
 });
 return m;
}
/* grava {secao: {chave: valor}} no registro do processo (cria se faltar), com nova tentativa se o arquivo mudou no meio */
async function gravar(cnj, mud, msg, extra, u, outros) {
  const F = await ficha();
  for (let t = 0; t < 4; t++) {
    const { doc, sha } = await lerOp(), r = registro(doc, cnj, F, true), efetiva = mudancaCoerente(r,mud), out = aplica(r, efetiva);
    if (extra) extra(r, out);
    if (!out.length) return { r, out };
    regras(r, out, u);
    doc.atualizado_em = agora();
    const arqs = [{ path: OP, txt: JSON.stringify(doc, null, 1) + '\n', sha }], mais = outros ? await outros(r, out, efetiva) : [];
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
  const o = c.orig && typeof c.orig === 'object' ? c.orig : null;
  if (o && (!o.tipo || o.tipo === 'Sentença')) Object.keys(VC_SENT).forEach(p => { const v = o[p.slice(5)]; if (v !== undefined) junta(m, { origem: { [VC_SENT[p]]: String(v == null ? '' : v) } }); });
  return m;
}
/* commit com conferência (ver _lib.commitArquivos): arquivo mudado ou ramo andou → 409, e quem chamou tenta de novo */
async function commitConferido(arqs, msg) {
  try { return await L.commitArquivos(arqs, msg); }
  catch (e) { if (e.status === 422) e.status = 409; throw e; }
}
/* pauta e monocráticas: espelha no operacional, no mesmo commit do arquivo da pauta */
async function espelho(arqPauta, cnj, campos, cartao, msg, u) {
  const F = await ficha(), mud = doCartao(campos, cartao);
  if (!Object.keys(mud).length) return commitConferido([arqPauta], msg);
  const { doc, sha } = await lerOp(), r = registro(doc, cnj, F, true), out = aplica(r, mudancaCoerente(r,mud));
  const arqs = [arqPauta];
  if (out.length) { regras(r, out, u); doc.atualizado_em = agora(); arqs.push({ path: OP, txt: JSON.stringify(doc, null, 1) + '\n', sha }); }
  return commitConferido(arqs, msg + (out.length ? '\n\nFicha (operacional): ' + out.slice(0, 12).join(', ') : ''));
}
module.exports = async (req, res, u) => {
  try {
    const F = await ficha(), perfil = await L.acessos(u).catch(() => ({desembargador:false}));
    if (req.method === 'GET') {
      const cnj = String(req.query.ficha || '');
      if (dg(cnj).length !== 20) return res.status(200).json({ ficha: F });
      const [{ doc }, fonte] = await Promise.all([lerOpLeitura(), fonteDe(cnj)]);
      /* Controles especiais: o registro do operacional diz o que já foi registrado; as listas do acervo dizem se o processo entra na meta, no sobrestamento ou nos casos sensíveis */
      const naLista = mod => require(mod).base().then(B => (Array.isArray(B) ? B : B.lista).find(x => dg(x.cnj) === dg(cnj)) || null).catch(() => null);
      const [bMeta, bSobr, bSens] = await Promise.all([naLista('./_metas'), naLista('./_sobr'), naLista('./_sens')]);
      const op = registro(doc, cnj, F, false) || null;
      /* sinalizações e anotações dos prontuários: o cartão do processo nas pautas em curso e, nas monocráticas, o registro extra */
      const sinais = [];
      try {
        (await ondeEsta(cnj)).forEach(o => o.its.forEach(i => { const c = i.ctl || {}, ca = c.cartao || {};
          sinais.push({ origem: 'Pauta de ' + o.path.slice(-10, -5).split('-').reverse().join('/'), intercor: c.intercor || '', intercorTipo: c.intercorTipo || '', intercorOk: c.intercorOk || '', intercorChamado: c.intercorChamado || '', retidoOk: c.retidoOk || '',
            resultado: i.resultado || '', pendencias: ca.pendencias || [], avisos: ca.avisos || [], notas: ca.notas || [] }); }));
      } catch (e) { /* sem pauta em curso legível: segue só com o registro */ }
      if (op) { let x = {}; try { x = JSON.parse((op.controles || {})._monoExtra || '{}'); } catch (e) {}
        const ca = x.cartao || {}, ic = (op.triagem || {})['Intercorrências'] || '';
        if (ic || (ca.pendencias || []).length || (ca.avisos || []).length || (ca.notas || []).length)
          sinais.push({ origem: 'Monocrática', intercor: ic, intercorTipo: x.intercorTipo || '', intercorOk: x.intercorOk || '', intercorChamado: x.intercorChamado || '', retidoOk: x.retidoOk || '', resultado: '', pendencias: ca.pendencias || [], avisos: ca.avisos || [], notas: ca.notas || [] }); }
      const cadastro = await L.lerJson('apoio/equipe.json').catch(() => ({dados:{registros:[]}}));
      const equipe = (cadastro.dados.registros||[]).filter(x=>x.nome&&x.id!=='m-cm'&&x.nome!=='CM').map(x=>({nome:x.nome,aliases:x.aliases||[],apelido:x.apelido||x.nomeCurto||''}));
      const normal = v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
      const conhecidos=new Set(equipe.flatMap(x=>[x.nome,...x.aliases].map(normal)));
      L.equipe().forEach(nome=>{if(!conhecidos.has(normal(nome))&&!/^(cm|dr\.? muta|carlos muta|des\.? carlos muta)$/i.test(nome)){equipe.push({nome,aliases:[],apelido:''});conhecidos.add(normal(nome));}});
      let devolutivas=[], devolutivasErro=false;
      try { const pen=await L.lerJson('apoio/equipe-pendencias.json'); devolutivas=(pen.dados.registros||[]).filter(t=>dg(t.numero)===dg(cnj)&&/^devolutiva\b/i.test(String(t.title||''))).map(t=>({id:t.id,autor:t.creator,destinatario:t.assignee,data:t.criadoEm,atualizado:t.atualizadoEm,situacao:t.stage,texto:t.description,sessao:t.sessao,resposta:t.resposta||''})); } catch(e) { devolutivasErro=e.status!==404; }
      return res.status(200).json({ ficha: F, operacional: op, fonte, sinais, equipe, devolutivas, devolutivasErro, desembargador: !!perfil.desembargador, gestor: L.gestor(u), controles: ativos(op, { metas: bMeta, sobrestados: bSobr, sensiveis: bSens }) });
    }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    /* 0.38: inteiro teor dos documentos marcados na extensão (Autos › Peças e documentos › Gravar) */
    if ((req.body || {}).autos) {
      /* processo sigiloso: o inteiro teor só é gravado pelo desembargador, pelo gestor ou com a senha (ver _sigilo.js) */
      const cnjA = String(req.body.cnj || ''), st = await require('./_sigilo').situacao(u, cnjA, req.body.sigilo, await fonteDe(cnjA));
      if (!st.liberado) return res.status(403).json({ erro: 'Processo sigiloso (' + st.sigilo + '): o inteiro teor não é gravado sem a liberação do Desembargador, do gestor ou da senha.', sigilo: st.sigilo });
      return res.status(200).json(await gravarAutos(cnjA, req.body.autos, u));
    }
    if(Array.isArray((req.body||{}).destinos)){
      const lista=req.body.destinos,allowed=new Set(['producao.Destino','producao.Mono - Tipo de ato','producao.Destino - Outro','triagem.Seleção Prévia','pauta.Nova sessão de destino']), E=editaveis(F);
      if(!lista.length||lista.length>200||new Set(lista.map(x=>dg(x&&x.cnj))).size!==lista.length)return res.status(400).json({erro:'Selecione de 1 a 200 processos distintos.'});
      for(const x of lista){if(!x||dg(x.cnj).length!==20||!x.campos||!Object.keys(x.campos).length||Object.entries(x.campos).some(([k,v])=>!allowed.has(k)||!E[k]||typeof v!=='string'||v.length>250||(E[k].tipo==='lista'&&v&&!(E[k].opcoes||[]).includes(v))))return res.status(400).json({erro:'Destino ou campo inválido.'});}
      for(let tentativa=0;tentativa<4;tentativa++){
        const {doc,sha}=await lerOp(),registros=[],outAll=[];
        for(const x of lista){
          const r=registro(doc,x.cnj,F,true),m={};for(const [k,v] of Object.entries(x.campos)){const i=k.indexOf('.');(m[k.slice(0,i)]||(m[k.slice(0,i)]={}))[k.slice(i+1)]=v;}
          const out=aplica(r,mudancaCoerente(r,m));if(out.length){regras(r,out,u);outAll.push(r.processo);}
          const t=r.triagem||{},p=r.producao||{},a=r.pauta||{};
          registros.push({processo:r.processo,triagem:{'Seleção Prévia':t['Seleção Prévia']||'','Destino - Confirmado em':t['Destino - Confirmado em']||'','Destino - Confirmado por':t['Destino - Confirmado por']||''},producao:{Destino:p.Destino||'','Mono - Tipo de ato':p['Mono - Tipo de ato']||'','Destino - Outro':p['Destino - Outro']||''},pauta:{'Nova sessão de destino':a['Nova sessão de destino']||''}});
        }
        if(!outAll.length)return res.status(200).json({ok:true,alterados:0,registros});
        doc.atualizado_em=agora();
        try{await commitConferido([{path:OP,sha,txt:JSON.stringify(doc,null,1)+'\n'}],'Destinação Cognitio ('+u+'): '+outAll.length+' processo(s)');return res.status(200).json({ok:true,alterados:outAll.length,registros});}catch(e){if(e.status!==409)throw e;}
      }
      return res.status(409).json({erro:'A ficha mudou durante a gravação. Tente novamente.'});
    }
    const b = req.body || {}, cnj = String(b.cnj || ''), C = b.campos || {}, E = editaveis(F), mud = {}, recus = [];
    if (dg(cnj).length !== 20) return res.status(400).json({ erro: 'número do processo inválido' });
    if (Object.prototype.hasOwnProperty.call(C, 'origem.Classificação documental') && require('./_sigilo').sigiloDe(await fonteDe(cnj))) {
      return res.status(403).json({ erro: 'Classificação documental detalhada não pode ser gravada na ficha compartilhada de processo sigiloso.' });
    }
    if(Object.prototype.hasOwnProperty.call(C,'origem.Origem - Peças vinculadas 1G')){
      const f=await fonteDe(cnj),ref=dg(f&&f.Processo_Referencia),linhas=C['origem.Origem - Peças vinculadas 1G'],SG=require('./_sigilo');
      if(!f||ref.length!==20||ref===dg(cnj)||SG.sigiloDe(f)||SG.sigiloDe(await fonteDe(ref)))return res.status(403).json({erro:'Referência não confirmada na fonte ou processo sigiloso.'});
      if(!Array.isArray(linhas)||linhas.length>60||!linhas.length||linhas.some(x=>!x||dg(x.cnj_referencia)!==ref||!/^\d{6,30}$/.test(String(x.id||''))||!String(x.documento||'').trim()||/sigilos|segredo de just|acesso restrito/i.test(String(x.documento))))return res.status(400).json({erro:'Peças inválidas ou referência divergente.'});
    }
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
    /* Solicitações manuais: operação incremental, decisão exclusiva do perfil desembargador.
       Revalida a cada tentativa de commit, sem permitir que uma edição da equipe apague decisão existente. */
    let solicitPatch=null;
    if(mud.origem&&Object.prototype.hasOwnProperty.call(mud.origem,'Solicitações manuais')){
      try{solicitPatch=JSON.parse(mud.origem['Solicitações manuais']);if(!Array.isArray(solicitPatch))throw Error();}catch(e){return res.status(400).json({erro:'Solicitações manuais inválidas.'});}
      delete mud.origem['Solicitações manuais'];
    }
    const cart = [];
    const { r, out } = await gravar(cnj, mud, 'Ficha (' + u + '): ' + cnj, solicitPatch===null?null:(reg,alterados)=>{
      let antigos=[];try{antigos=JSON.parse((reg.origem||{})['Solicitações manuais']||'[]');if(!Array.isArray(antigos))antigos=[];}catch(e){}
      const por=new Map(antigos.filter(x=>x&&x.id).map(x=>[String(x.id),x]));
      const tipos=['Sustentação presencial','Sustentação por videoconferência','Preferência','Despacho','Retirada de pauta','Adiamento','Outra solicitação'];
      for(const x of solicitPatch){
        if(!x||!x.id||!tipos.includes(x.tipo))continue;
        const id=String(x.id).slice(0,80),ant=por.get(id),interno=x.tipo==='Retirada de pauta'||x.tipo==='Adiamento';
        if(!ant){const justificativa=String(x.justificativa||x.descricao||'').trim().slice(0,4000);if(interno&&!justificativa)continue;
          por.set(id,{id,tipo:x.tipo,solicitante:String(interno?u:x.solicitante||'').slice(0,160),descricao:justificativa,justificativa:interno?justificativa:'',data:L.dataOk(x.data)?x.data:agora().slice(0,10),autor:u,estado:'Pendente',criadoEm:agora(),sessaoPretendida:interno&&x.tipo==='Adiamento'?String(x.sessaoPretendida||'').slice(0,30):'',sessaoOrigem:L.dataOk(x.sessaoOrigem)?x.sessaoOrigem:'',itemOrigem:L.dataOk(x.sessaoOrigem)?String(x.itemOrigem||'').slice(0,30):''});continue;}
        if(perfil.desembargador&&['Deferida','Indeferida'].includes(x.estado)&&!['Deferida','Indeferida'].includes(ant.estado)){
          por.set(id,Object.assign({},ant,{estado:x.estado,decididoPor:u,decididoEm:agora()}));
        }
      }
      const v=JSON.stringify(Array.from(por.values()));if(v!==JSON.stringify(antigos)){reg.origem=reg.origem||{};reg.origem['Solicitações manuais']=v;alterados.push('origem.Solicitações manuais');}
    }, u, async (r, out, efetiva) => {
      const arqs = []; cart.length = 0;
      for (const a of await ondeEsta(cnj)) {
        let mudou = false; a.its.forEach(it => { if (aplicaCartao(it, paraCartao(efetiva, it), u)) mudou = true; });
        if (mudou) { a.dados.atualizadoEm = agora(); arqs.push({ path: a.path, txt: JSON.stringify(a.dados, null, 1) + '\n', sha: a.sha }); cart.push(a.path); }
      }
      return arqs;
    });
    return res.status(200).json(Object.assign({ ok: true, operacional: r, recusados: recus, cartoes: cart }, out.length ? {} : { semMudanca: true }));
  } catch (e) { res.status(e.status === 404 ? 404 : e.status === 409 ? 409 : 500).json({ erro: e.message }); }
};
/* ---------- 0.38 · inteiro teor dos documentos, gravado pela extensão ----------
   acervo/autos/<CNJ>.json.gz, no formato do scripts/autos/registrar.py e da ação "autos" do Cortex
   ({cnj, extraido_em, lista, docs, faltam, texto}). Junta com o que já existe: o documento enviado substitui o de mesmo ID;
   os demais ficam. a = {lista:[[id,tipo,desc,'',data,hora,anexo]], docs:[{id,…}], secoes:[{id, sec}], mov} */
const CNJ_FMT = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
function secoesAutos(txt) {
  const out = { mov: '', ordem: [], docs: new Map() }; let cur = null, buf = [];
  const fecha = () => { if (cur === 'mov') out.mov = buf.join('\n'); else if (cur) { if (!out.docs.has(cur)) out.ordem.push(cur); out.docs.set(cur, buf.join('\n')); } };
  String(txt || '').split('\n').forEach(l => { const m = /^===== ID (\d+) \|/.exec(l);
    if (m) { fecha(); cur = m[1]; buf = [l]; } else if (/^===== MOVIMENTA/.test(l)) { fecha(); cur = 'mov'; buf = [l]; } else if (cur) buf.push(l); });
  fecha(); return out;
}
function juntarAutos(velho, a, cnj) {
  const v = velho || {}, pj = x => { try { const y = typeof x === 'string' ? JSON.parse(x) : x; return Array.isArray(y) ? y : []; } catch (e) { return []; } };
  const S = secoesAutos(v.texto), novas = (Array.isArray(a.secoes) ? a.secoes : []).filter(x => x && /^\d+$/.test(String(x.id)) && /^===== ID \d+ \|/.test(String(x.sec || '')));
  novas.forEach(x => { const id = String(x.id); if (!S.docs.has(id)) S.ordem.push(id); S.docs.set(id, String(x.sec).replace(/\s+$/, '') + '\n'); });
  if (a.mov && /^===== MOVIMENTA/.test(String(a.mov))) S.mov = String(a.mov).replace(/\s+$/, '') + '\n';
  const listaN = pj(a.lista).filter(l => Array.isArray(l) && /^\d+$/.test(String(l[0]))), listaV = pj(v.lista);
  const lista = listaN.length ? listaN.concat(listaV.filter(l => !listaN.some(n => String(n[0]) === String(l[0])))) : listaV;
  const ordem = lista.map(l => String(l[0])).filter(id => S.docs.has(id)).concat(S.ordem.filter(id => !lista.some(l => String(l[0]) === id)));
  const docs = pj(v.docs); pj(a.docs).forEach(d => { if (!d || !/^\d+$/.test(String(d.id))) return; const k = docs.findIndex(x => String(x.id) === String(d.id)); if (k < 0) docs.push(d); else docs[k] = Object.assign({}, docs[k], d); });
  const com = new Set([...S.docs.keys()].filter(id => S.docs.get(id).split('\n').slice(1).join('').trim()));
  const faltam = [...new Set((Array.isArray(v.faltam) ? v.faltam : []).map(String))].filter(id => !com.has(id));
  return { cnj, extraido_em: new Date().toISOString(), origem: 'Extensão HERO18810 (Autos › Peças e documentos)', lista: JSON.stringify(lista), docs: JSON.stringify(docs), faltam,
    texto: [S.mov || ''].concat(ordem.map(id => S.docs.get(id))).filter(Boolean).join('\n') };
}
async function gravarAutos(cnj, a, u) {
  if (!CNJ_FMT.test(cnj)) { const e = new Error('número do processo inválido'); e.status = 400; throw e; }
  if (!a || typeof a !== 'object' || JSON.stringify(a).length > 4e6) { const e = new Error('inteiro teor inválido ou grande demais'); e.status = 400; throw e; }
  const zlib = require('zlib'), rel = 'acervo/autos/' + cnj + '.json.gz';
  for (let t = 0; t < 4; t++) {
    const ref = await L.gh('/git/ref/heads/main'), base = await L.gh('/git/commits/' + ref.object.sha);
    let velho = null;
    try { const o = await L.gh('/contents/' + rel + '?ref=' + ref.object.sha); const b64 = o.content && o.encoding === 'base64' ? o.content : (await L.gh('/git/blobs/' + o.sha)).content;
      velho = JSON.parse(zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8')); } catch (e) { if (e.status !== 404) throw e; }
    const novo = juntarAutos(velho, a, cnj), n = (Array.isArray(a.secoes) ? a.secoes : []).length;
    const blob = await L.gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: zlib.gzipSync(Buffer.from(JSON.stringify(novo))).toString('base64'), encoding: 'base64' }) });
    const tr = await L.gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree: [{ path: rel, mode: '100644', type: 'blob', sha: blob.sha }] }) });
    const c = await L.gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: 'Autos (' + u + '): inteiro teor de ' + n + ' documento(s) · ' + cnj, tree: tr.sha, parents: [ref.object.sha] }) });
    try { await L.gh('/git/refs/heads/main', { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) }); }
    catch (e) { if (e.status === 422 || e.status === 409) continue; throw e; }
    return { ok: true, autos: { gravados: n, documentos: secoesAutos(novo.texto).docs.size, caminho: rel } };
  }
  const e = new Error('O repositório mudou várias vezes seguidas; tente de novo.'); e.status = 409; throw e;
}
/* quais grupos dos Controles especiais valem para o processo */
function ativos(op, lista) {
  const t = (op && op.triagem) || {}, p = (op && op.producao) || {}, c = (op && op.controles) || {};
  return { urgencia: !!t['Urgência'], monocratica: p.Destino === 'Monocrática', meta: !!lista.metas, sobrestamento: !!lista.sobrestados,
    sensivel: c['Sensível - Excluído'] !== 'Sim' && (!!lista.sensiveis || c['Sensível - Incluído'] === 'Sim'), naLista: lista };
}
/* resumo de vários processos de uma vez (só leitura), para a lista de tarefas do PJe na extensão Muta:
   GET /api/pauta?fichas=CNJ1,CNJ2,… (até 150) → { resumos: { <20 dígitos>: { etapa, designação, urgência, sinalizações, tarefa, etiquetas… } } } */
/* tipo de caso e etiquetas sugeridas pela triagem do app (as mesmas da página /caput/triagem: etqTipoCaso e etqSugRow),
   para o cartão da lista do PJe na extensão; o PJe não é alterado: a extensão só mostra e copia */
const SN = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
function tipoCasoDe(t) {
  t = String(t || '').replace(/^\d+\s*·\s*/, '').replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(); if (t.length < 4) return '';
  let P = t.split(/\s+·\s+/); if (P.length > 1 && /^(apela|remessa|agravo|embargos de declara|recurso)/i.test(P[0])) P = P.slice(1);
  let r = P.slice(0, 2).join(' - ').split(/\s*;\s*/)[0].replace(/\s+—\s+/g, ' - ');
  if (r.length > 58) { r = r.slice(0, 59).replace(/\s+\S*$/, ''); for (let k = 0; k < 8; k++) r = r.replace(/[\s,;:·—-]+$/, '').replace(/\s+(da|do|das|dos|de|por|para|pela|pelo|com|sem|e|ou|a|o|as|os|na|no|nas|nos|em|ao|à|aos|às|contra|sobre|entre|que|[IVXL]+|\d+º?|artigo)$/i, ''); }
  return r.charAt(0).toUpperCase() + r.slice(1);
}
function etqTriagem(t, f) {
  const out = [], etq = String(f['Etiquetas Originais'] || '').split(/[;|,]/).map(x => x.trim()).filter(Boolean);
  const add = (e, por, caso) => { e = String(e || '').trim(); if (!e || out.some(x => SN(x.e) === SN(e))) return; out.push(caso ? { e, por, caso: 1 } : { e, por }); };
  /* as registradas no prontuário vêm primeiro: é a decisão de quem triou */
  String(t['Etiquetas sugeridas'] || '').split(/[;,\n]/).forEach(x => add(x, 'registrada no prontuário'));
  const sc = String(f['Seção Competente'] || '').trim();
  if (/^[123]ª Seção$/.test(sc) && !etq.some(e => /^[123]ª Seção$/.test(e))) add(sc, 'seção competente sem etiqueta');
  if (/nao recolhido|sem comprovante|a menor|apos a interposicao|tesouro/.test(SN(t.Preparo))) add('ver. preparo', 'preparo: ' + t.Preparo);
  if (/irregular|negativ/.test(SN(t['Representação']))) add('representação', 'representação: ' + t['Representação']);
  if (/^intempest/.test(SN(t.Tempestividade))) add('tempestividade', 'intempestivo na triagem');
  if (/aguardando/.test(SN(t.MPF)) || (t['MPF - Custos Legis'] && !/^(sem hip|nao se aplica)/.test(SN(t['MPF - Custos Legis'])) && !/com parecer|nao se aplica/.test(SN(t.MPF)))) add('aguardando parecer', 'intervenção do MPF sem parecer');
  if ((t['Urgência'] && /pendente|nao apreciada/.test(SN(t['Urgência - Apreciação']))) || /^(sim|s|true|1)$/i.test(String(f['Liminar Pendente'] || '').trim())) add('LIMINAR PENDENTE', 'urgência não apreciada');
  if (/^(possivel|provavel|cabivel)/.test(SN(t['Hipóteses Monocrática']))) add('MONOCRÁTICA TERMINATIVA', 'hipótese de monocrática na triagem');
  const tc = tipoCasoDe(detalhamento(t)); if (tc) add(tc, 'tipo de caso na ficha', true);
  return out;
}
module.exports.tipoCasoDe = tipoCasoDe;
module.exports.juntarAutos = juntarAutos;
module.exports.etqTriagem = etqTriagem;
async function resumos(req, res) {
  try {
    const K = [...new Set(String(req.query.fichas || '').split(',').map(dg).filter(x => x.length === 20))].slice(0, 150);
    if (!K.length) return res.status(200).json({ resumos: {} });
    const [{ doc }] = await Promise.all([lerOpLeitura(), fonteDe(K[0])]);
    const por = {}; (doc.registros || []).forEach(r => { por[dg(r.processo)] = r; });
    const lista = mod => require(mod).base().then(B => new Set((Array.isArray(B) ? B : (B && B.lista) || []).map(x => dg(x.cnj)))).catch(() => new Set());
    const [sM, sS, sX] = await Promise.all([lista('./_metas'), lista('./_sobr'), lista('./_sens')]);
    const linhas = v => String(v || '').split(/\n+/).map(x => x.trim()).filter(x => x && !/^✓/.test(x));
    const todas = v => String(v || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
    const out = {};
    K.forEach(k => {
      const r = por[k] || {}, f = (FT && FT[k]) || {}, t = r.triagem || {}, p = r.producao || {}, c = r.controles || {};
      out[k] = {
        servidor: p.SERVIDOR || '', corretor: p.CORRETOR || '', destino: p.Destino || '', tipoAto: p['Mono - Tipo de ato'] || '',
        triado: t['Destino - Confirmado em'] || '', minutado: p.MINUTADO || '', corrigidoEm: p['Data da Revisão'] || '', liberadoEm: p['Data da Liberação'] || '', assinadoEm: p['Data da Assinatura'] || '', corrigido: p.CORRIGIDO === 'Sim' || !!p['Data da Revisão'],
        liberado: p.LIBERADO === 'Sim' || (p.Destino !== 'Monocrática' && !!p['Data da Liberação']), enviado: p.Destino === 'Monocrática' && !!p['Data da Liberação'], assinado: p.Assinado === 'Sim' || !!p['Data da Assinatura'],
        urg: t['Urgência'] || '', urgNivel: t['Urgência - Nível'] || '', urgData: t['Urgência - Data'] || '', urgApr: t['Urgência - Apreciação'] || '', urgAprEm: t['Urgência - Apreciada em'] || '',
        pend: linhas(t['O que falta sanar']), ic: linhas(t['Intercorrências']), avM: linhas(t['Avisos']), avT: todas(t['Avisos']), notas: linhas((r.origem || {})['Observações']), pendT: todas(t['O que falta sanar']), icT: todas(t['Intercorrências']), sintese: String(t['Síntese Processual'] || '').slice(0, 2000), questoes: todas(t['Alegações']),
        pendTxt: t['O que falta sanar'] || '', icTxt: t['Intercorrências'] || '', notasTxt: (r.origem || {})['Observações'] || '', sintese: t['Síntese Processual'] || '', questoes: linhas(t['Alegações']),
        etqSug: t['Etiquetas sugeridas'] || '', etqGab: t['Etiquetas'] || '', tipoJ: t['Tipo de Julgamento'] || '', tempest: t.Tempestividade || '',
        meta: sM.has(k) || !!t.META, sobr: sS.has(k), sens: (sX.has(k) || c['Sensível - Incluído'] === 'Sim') && c['Sensível - Excluído'] !== 'Sim',
        tarefa: f.tarefa_atual || '', desde: f.data_entrada_tarefa || '', etqPje: f['Etiquetas Originais'] || '', assunto: f.Assunto || '',
        classe: f.classe_judicial || f.Classe || '', prioridade: f.prioridade || '', mpf: f.mpf || '', registrado: !!por[k],
        preparo: t.Preparo || '', repres: t['Representação'] || '', mpfSit: t.MPF || '', custos: t['MPF - Custos Legis'] || '',
        detalhamento: detalhamento(t), tipoCaso: tipoCasoDe(detalhamento(t)), tema: detalhamento(t).slice(0, 300), etqTri: etqTriagem(t, f),
        /* famílias do cartão (0.31): classificação, movimentação, estado atual e próxima providência */
        secao: String(f['Seção Competente'] || '').trim(),
        subassuntos: [...new Set(String(f['DataJud · Assuntos'] || '').split(/\s*;\s*/).map(x => x.trim()).filter(x => x && SN(x) !== SN(f.Assunto)))].slice(0, 4),
        especificidade: detalhamento(t).split(/\n+/).map(x => x.trim()).filter(Boolean)[0] || '',
        movimento: String(f.ultimo_movimento || '').trim().slice(0, 240), movimentoEm: String(f['Data Último Movimento'] || '').trim(),
        proxima: String((r.origem || {})['Próxima ação'] || '').trim().slice(0, 400),
        sessao: String((r.pauta || {})['Sessão original'] || (r.pauta || {})['Sessão Destino'] || t['Sessão Destino'] || '').trim()
      };
    });
    return res.status(200).json({ resumos: out, em: agora() });
  } catch (e) { return res.status(500).json({ erro: e.message }); }
}
module.exports.resumos = resumos;
/* catálogo de etiquetas do gabinete (padrao/etiquetas-gabinete.json): GET para a equipe; POST só o gestor
   GET  /api/pauta?etiquetas=1            → { catalogo, gestor }
   POST /api/pauta?etiquetas=1 {etiquetas} → grava o catálogo */
const CAT = 'padrao/etiquetas-gabinete.json';
async function etiquetasGab(req, res, u) {
  try {
    if (req.method === 'GET') { const { dados } = await L.lerJson(CAT).catch(() => ({ dados: { etiquetas: [] } })); return res.status(200).json({ catalogo: dados, gestor: L.gestor(u) }); }
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
    if (!L.gestor(u)) return res.status(403).json({ erro: 'Só o gestor edita o catálogo de etiquetas.' });
    const E = (req.body || {}).etiquetas;
    if (!Array.isArray(E) || E.length > 200) return res.status(400).json({ erro: 'catálogo inválido' });
    const OPS = new Set(['tem', 'vazio', 'igual', 'contem', 're', 'maior']);
    const limpo = E.map(e => ({ nome: String(e.nome || '').trim().slice(0, 60), cor: /^#[0-9a-f]{3,8}$/i.test(e.cor || '') ? e.cor : '', descricao: String(e.descricao || '').slice(0, 300),
      quando: (Array.isArray(e.quando) ? e.quando : []).slice(0, 6).map(q => ({ campo: String(q.campo || '').slice(0, 40), op: OPS.has(q.op) ? q.op : 'tem', valor: String(q.valor == null ? '' : q.valor).slice(0, 200) })).filter(q => q.campo) }))
      .filter(e => e.nome);
    /* tipos de etiqueta do PJe (redesenho na lista): opcional; se vier, substitui */
    const CT = (req.body || {}).categorias, EST = new Set(['solido', 'suave', 'contorno']), ICS = new Set(['', 'raio', 'estrela', 'alerta', 'calendario', 'alvo', 'check', 'camadas', 'secao', 'pessoa', 'balanca', 'etiqueta']);
    let cats = null;
    if (Array.isArray(CT)) {
      if (CT.length > 30) return res.status(400).json({ erro: 'tipos demais' });
      cats = CT.map(c => ({ id: String(c.id || '').replace(/[^a-z0-9-]/gi, '').slice(0, 30) || ('t' + Math.random().toString(36).slice(2, 7)), nome: String(c.nome || '').trim().slice(0, 40),
        re: String(c.re || '').slice(0, 400), cor: /^#[0-9a-f]{6}$/i.test(c.cor || '') ? c.cor : '#546e7a', estilo: EST.has(c.estilo) ? c.estilo : 'suave', icone: ICS.has(c.icone) ? c.icone : '' }))
        .filter(c => { if (!c.nome || !c.re) return false; try { new RegExp(c.re, 'i'); return true; } catch (e) { return false; } });
    }
    const atual = await L.lerJson(CAT).catch(() => null);
    const dados = Object.assign({}, atual ? atual.dados : { schema: 'gabcmt.etiquetas-gabinete', versao: 1 }, { etiquetas: limpo, atualizadoEm: agora().slice(0, 10), atualizadoPor: u }, cats ? { categorias: cats } : {});
    await L.gravarJson(CAT, dados, atual ? atual.sha : undefined, 'Etiquetas do gabinete (' + u + '): ' + limpo.length + ' etiqueta(s)');
    return res.status(200).json({ ok: true, catalogo: dados });
  } catch (e) { return res.status(500).json({ erro: e.message }); }
}
module.exports.etiquetasGab = etiquetasGab;
module.exports.espelho = espelho;
module.exports.gravar = gravar;
module.exports.paraCtl = paraCtl;
module.exports.cartaoDaFicha = cartaoDaFicha;
module.exports.lerOp = lerOp;
module.exports.lerOpLeitura = lerOpLeitura;
module.exports.ativos = ativos;
module.exports.doCartao = doCartao;
module.exports.catalogo = ficha;
module.exports.paraCartao = paraCartao;
/* usados pelo prontuário da extensão Muta (_prontuario.js), que grava ficha e cartão no mesmo commit do prontuário */
module.exports.editaveis = editaveis;
module.exports.fonteDe = fonteDe;
module.exports.registro = registro;
module.exports.aplica = aplica;
module.exports.mudancaCoerente = mudancaCoerente;
module.exports.regras = regras;
module.exports.ondeEsta = ondeEsta;
module.exports.aplicaCartao = aplicaCartao;
