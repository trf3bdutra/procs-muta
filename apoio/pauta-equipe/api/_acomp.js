/* Controles especiais · acompanhamento de meta, sobrestamento e caso sensível no registro do processo (acervo/operacional.json, seção controles).
   Cada módulo informa o mapa campo do app → chave da ficha (padrao/ficha.json) e o prefixo do grupo ("Meta", "Sobrestamento", "Sensível"). */
const FICHA = require('./_ficha');
const dg = s => String(s || '').replace(/\D/g, '');
/* registro do operacional → acompanhamento no formato do app */
function acomp(r, MAPA, pref) {
  const c = (r && r.controles) || {}, o = {};
  Object.keys(MAPA).forEach(k => { const v = c[MAPA[k]]; if (v) o[k] = v; });
  if (c[pref + ' - Atualizado por']) { o.editadoPor = c[pref + ' - Atualizado por']; o.editadoEm = c[pref + ' - Atualizado em'] || ''; }
  return o;
}
/* índice CNJ → registro, a partir do operacional lido agora (o acompanhamento é sempre o mais recente) */
async function indice() { const { doc } = await FICHA.lerOpLeitura(), I = {}; (doc.registros || []).forEach(r => { I[dg(r.processo)] = r; }); return { I, doc }; }
/* grava o acompanhamento: campos do app → controles; devolve o acompanhamento atualizado */
async function gravar(cnj, campos, MAPA, pref, u, rotulo, extra) {
  const mud = { controles: {} };
  Object.keys(MAPA).forEach(k => { if (k in campos) mud.controles[MAPA[k]] = String(campos[k] == null ? '' : campos[k]).slice(0, 1000); });
  if (extra) extra(mud.controles);
  const { r, out } = await FICHA.gravar(cnj, mud, rotulo + ' (' + u + '): ' + cnj, null, u);
  return { item: acomp(r, MAPA, pref), semMudanca: !out.length };
}
module.exports = { acomp, indice, gravar, dg };
