/* Muta · materiais do gabinete para comparar e conferir (publicados pelo workflow em /extensao/dados/base.json.gz):
   modelos do banco, minutas-matriz, matriz modular e acórdãos-modelo do 28,86%, parágrafos-padrão e regras de redação
   (Compendium e Manual CMT). Gerado por scripts/extensao/dados.py; baixado uma vez por abertura do painel. */
(function () {
'use strict';
var P = null, D = null;
function base(forcar) {
  if (D && !forcar) return Promise.resolve(D);
  if (P && !forcar) return P;
  P = Muta.baixarTexto(Muta.SITE + '/extensao/dados/base.json.gz').then(JSON.parse).then(function (d) {
    if (!d || d.schema !== 'muta.extensao.dados') throw new Error('pacote de dados em formato desconhecido');
    D = d; return d;
  }).catch(function (e) { P = null; throw e; });
  return P;
}
/* texto de uma fonte em parágrafos, com os títulos das seções: [{h}|{p}] */
function blocos(secoes, filtro) {
  var A = [];
  (secoes || []).forEach(function (s) {
    if (filtro && !filtro(s)) return;
    var ps = (s.ps || []).filter(function (p) { return String(p || '').trim(); });
    if (!ps.length) return;
    A.push({ h: s.t }); ps.forEach(function (p) { A.push({ p: p }); });
  });
  return A;
}
function porLinhas(t) { return String(t || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
/* acórdão-modelo em texto corrido: separa RELATÓRIO / VOTO / EMENTA / ACÓRDÃO */
function secoesDeTexto(t) {
  var out = [], cur = { t: 'Texto', ps: [] };
  porLinhas(t).forEach(function (l) {
    var m = /^(RELAT[ÓO]RIO|VOTO|E\s*M\s*E\s*N\s*T\s*A|AC[ÓO]RD[ÃA]O)\.?$/i.exec(l);
    if (m) { if (cur.ps.length) out.push(cur); cur = { t: l.charAt(0) + l.slice(1).toLowerCase().replace(/\s+/g, ''), ps: [] }; return; }
    cur.ps.push(l);
  });
  if (cur.ps.length) out.push(cur);
  return out;
}
window.MutaFontes = { base: base, blocos: blocos, porLinhas: porLinhas, secoesDeTexto: secoesDeTexto, pronto: function () { return D; } };
})();
