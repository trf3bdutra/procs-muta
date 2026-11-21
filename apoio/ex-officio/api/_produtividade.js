/* Produtividade da equipe pelas regras do Gabinete CMT (apoio/regras/produtividade.json), para o painel do Gabinete.
   Pontos por nível: despacho 0,25 · serial 0,5 (ED, Agravo Interno, lote) · padrão 1 (voto e monocrática) · intermediária 2
   (juízo de retratação e META 2, em regra) · complexa 3 (META 7). O nível fixado no processo prevalece. Correções contam à parte (quantidade).
   Meta do período = meta diária em pontos × dias úteis de expediente do servidor no período (sem ausências).
   Dia útil: dia da semana de expediente fora dos dias sem expediente do calendário (acervo/sessoes/calendario.json). */
const PADRAO = { painel: { liberacao: 5, minutasDia: 3, pertoMeta: 75, redistribuir: true },
  pesos: { voto: 1, ed: 0.5, mono: 1, despacho: 0.25, diligencia: 0.25, pendencia: 0.25, revisao: 0.25, complementar: 0.5, cx1: 1, cx2: 2, cx3: 3 },
  metaPadrao: { voto: 3, mono: 0 }, metas: { VICTOR: { voto: 4 }, ESTELA: { voto: 4 } } };
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
const iso = d => String(d || '').slice(0, 10);
const ok = d => /^\d{4}-\d{2}-\d{2}$/.test(iso(d));
const mais = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

function regras(j) {
  j = j && typeof j === 'object' ? j : {};
  const num = (v, d) => { if (v == null || String(v).trim() === '') return d; const x = Number(String(v).replace(',', '.')); return isFinite(x) && x >= 0 ? x : d; };
  const pesos = {}; Object.keys(PADRAO.pesos).forEach(k => { pesos[k] = num((j.pesos || {})[k], PADRAO.pesos[k]); }); pesos.agint = pesos.ed;
  const painel = Object.assign({}, PADRAO.painel, j.painel || {});
  const metaPadrao = { voto: num((j.metaPadrao || {}).voto, 3), mono: num((j.metaPadrao || {}).mono, 0) };
  const metas = {}; Object.entries(j.metas || (j.pesos ? {} : PADRAO.metas)).forEach(([k, v]) => { metas[norm(k)] = v || {}; });
  return { pesos, painel, metaPadrao, metas };
}
/* nível do processo na pauta: fixado (ctl.complexidade) > ED/AgInt e lote (serial) > META 7 (complexa) > JR e META 2 (intermediária) > padrão */
function nivelDe(it) { const c = it.ctl || {}, fx = c.complexidade || it.complexidade || c.cx;
  if (fx && /serial|model/i.test(String(fx))) return 'serial'; if (fx != null && String(fx).trim()) return 'cx' + cxDe(fx);
  const t = tipoDe(it); if (t === 'ed' || t === 'agint') return 'serial';
  const ms = String(c.meta || it.meta || '').toUpperCase(); if (/(^|\W)M?\s*7/.test(ms)) return 'cx3';
  if (/^JR$|retrata/i.test(String(it.julgamento || '')) || /(^|\W)M?\s*2/.test(ms)) return 'cx2';
  if (c.lote) return 'serial'; return 'cx1'; }
function cxDe(v) { const t = String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); if (!t.trim()) return 1;
  if (/omega|padrao|baixa|ω/.test(t)) return 1; if (/alfa|alpha|intermedi|media|α/.test(t)) return 2; if (/sigma|complex|alta|σ/.test(t)) return 3;
  const n = Math.round(Number(t.replace(',', '.'))); return n >= 1 && n <= 3 ? n : 1; }
function tipoDe(it) { const t = [it.julgamento, it.classe, (it.ctl || {}).apreciacao].map(x => String(x || '')).join(' | ');
  if (/(^|\W)ED(\W|$)|embargos?\s+de\s+declara/i.test(t)) return 'ed'; if (/AgInt|agravo\s+interno|agravo\s+regimental|AgRg/i.test(t)) return 'agint'; return 'voto'; }

/* calcula: sessões (docs das pautas), monocráticas (itens da ficha única), equipe (apoio/equipe.json), ausências aprovadas */
function calcular({ prod, cal, sessoesDocs, monos, equipe, solicitacoes, de, ate }) {
  const R = regras(prod), ex = (cal || {}).expediente || {}, wd = Array.isArray(ex.diasSemana) && ex.diasSemana.length ? ex.diasSemana : [1, 2, 3, 4, 5], sem = new Set(ex.semExpediente || []);
  const util = d => wd.includes(new Date(d + 'T12:00:00Z').getUTCDay()) && !sem.has(d);
  const membros = ((equipe || {}).registros || []).filter(m => m && m.nome);
  const quem = nome => { const k = norm(nome); if (!k) return null; return membros.find(m => norm(m.nome) === k || (m.aliases || []).some(a => norm(a) === k)) || null; };
  /* CM (o desembargador) e a assessoria ficam fora da meta, como no Gabinete CMT */
  const minuta = m => norm(m.nome) !== 'CM' && !/desembarg/i.test(String(m.cargo || '')) && m.papel !== 'assessoria' && (m.minuta != null ? !!m.minuta : m.papel === 'equipe');
  const aus = {}; membros.forEach(m => { aus[m.nome] = (m.aus || []).filter(a => ok(a.de) && ok(a.ate)).map(a => [iso(a.de), iso(a.ate)]); });
  ((solicitacoes || {}).registros || []).filter(s => /aprov|deferid/i.test(String(s.estado || ''))).forEach(s => { const m = quem(s.nome); if (m && ok(s.de) && ok(s.ate)) aus[m.nome].push([iso(s.de), iso(s.ate)]); });
  const diasDe = m => { let n = 0; for (let d = de, k = 0; d <= ate && k < 800; d = mais(d, 1), k++) if (util(d) && !(aus[m.nome] || []).some(([a, b]) => a <= d && d <= b)) n++; return n; };
  let diasUteis = 0; for (let d = de, k = 0; d <= ate && k < 800; d = mais(d, 1), k++) if (util(d)) diasUteis++;
  const no = d => ok(d) && iso(d) >= de && iso(d) <= ate;
  const L = {}, linha = nome => { const m = quem(nome), n = m ? m.nome : String(nome || '').trim(); if (!n) return null;
    return (L[n] = L[n] || { nome: n, cadastro: !!m, pontos: 0, votos: 0, eds: 0, monos: 0, correcoes: 0, designadas: 0, pendentes: 0 }); };
  (sessoesDocs || []).forEach(({ itens }) => (itens || []).forEach(it => {
    const x = it.servidor ? linha(it.servidor) : null;
    if (x) { x.designadas++; if (!it.dataMinuta) x.pendentes++; }
    if (x && no(it.dataMinuta)) { const t = tipoDe(it), nv = nivelDe(it); x.pontos += nv === 'serial' ? R.pesos.ed : R.pesos.voto * R.pesos[nv]; if (t === 'voto') x.votos++; else x.eds++; }
    const c = it.corretor ? linha(it.corretor) : null; if (c && no(it.dataCorrecao)) c.correcoes++;
  }));
  (monos || []).forEach(i => { const x = i.servidor ? linha(i.servidor) : null; if (x && no(i.dataMinuta)) { const c = i.complexidade; x.pontos += R.pesos.mono * (c != null && String(c).trim() !== '' ? R.pesos['cx' + cxDe(c)] : 1); x.monos++; }
    const c2 = i.corretor ? linha(i.corretor) : null; if (c2 && no(i.dataCorrecao)) c2.correcoes++; });
  membros.filter(minuta).forEach(m => linha(m.nome));
  const linhas = Object.values(L).map(x => {
    const m = quem(x.nome), entra = !!m && minuta(m), mt = R.metas[norm(x.nome)] || {};
    const voto = mt.voto != null ? Number(mt.voto) : R.metaPadrao.voto, mono = mt.mono != null ? Number(mt.mono) : R.metaPadrao.mono;
    const metaDia = entra ? (mt.pontos != null && String(mt.pontos) !== '' ? Number(mt.pontos) : r2(voto * R.pesos.voto + mono * R.pesos.mono)) : 0;
    const dias = m ? diasDe(m) : 0, meta = r2(metaDia * dias), pct = meta ? Math.round(x.pontos / meta * 100) : null;
    return Object.assign(x, { pontos: r2(x.pontos), metaDia, dias, meta, pct, entra,
      situacao: !entra ? 'fora da meta (assessoria ou sem minuta)' : !meta ? 'sem dia útil no período' : pct >= 100 ? 'meta cumprida' : pct >= R.painel.pertoMeta ? 'perto da meta' : 'abaixo da meta' });
  }).filter(x => x.entra || x.pontos || x.correcoes)
    .sort((a, b) => (b.entra - a.entra) || b.pontos - a.pontos || b.correcoes - a.correcoes || a.nome.localeCompare(b.nome, 'pt'));
  return { de, ate, diasUteis, pertoMeta: R.painel.pertoMeta, pesos: R.pesos, linhas };
}
module.exports = { calcular, regras, PADRAO };
