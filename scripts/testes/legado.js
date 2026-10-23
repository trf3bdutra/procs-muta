/* Confere a ida e volta formato antigo ⇄ padrão 1.0 (biblioteca comum) contra a base e o arquivo de compatibilidade.
   Uso: node scripts/testes/legado.js  (na raiz do repositório) */
const fs = require("fs"), P = require("../../padrao/paradigmas.js"), L = P.legado;
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, c) => (o[c] = x[c], o), {}) : x);
const prec = fs.readFileSync("paradigmas/precedentes.jsonl", "utf8").split("\n").filter(Boolean).map(JSON.parse);
const antigo = JSON.parse(fs.readFileSync("data/paradigmas.json", "utf8"));
const porAnt = new Map(prec.map(p => [p.idAnterior, p]));
let f = 0, g = 0, h = 0, falhas = [];
// 1) novo → antigo reproduz data/paradigmas.json (mesmo critério do gerar.py)
antigo.bancos.Precedente.registros.forEach(o => { const n = porAnt.get(o.id); const v = L.precedenteAntigo(n);
  Object.keys(o).forEach(k => { if (o[k] !== "" && canon(o[k]) !== canon(v[k])) { f++; if (falhas.length < 3) falhas.push(["antigo", o.id, k]); } }); });
// 2) antigo → novo, sem edição, devolve exatamente o precedente atual (idempotência)
prec.filter(p => p._legado).forEach(p => { const v = L.precedenteDeAntigo(L.precedenteAntigo(p), p); if (canon(v) !== canon(p)) { g++; if (falhas.length < 6) falhas.push(["ida-volta", p.id, Object.keys(p).filter(k => canon(p[k]) !== canon(v[k]))]); } });
// 3) edição num campo: só ele muda
const p0 = prec.find(p => p._legado && p.curadoria.status === "curado"); const o0 = L.precedenteAntigo(p0); o0.tese = "Tese editada no app";
const e0 = L.precedenteDeAntigo(o0, p0); if (e0.curadoria.tese !== "Tese editada no app" || e0.ementa !== p0.ementa || e0.id !== p0.id) h++;
// 4) correção feita na migração não é desfeita por um app que devolve o valor antigo
const pc = prec.find(p => p.correcoes && p._legado.valores.especie); const oc = L.precedenteAntigo(pc); const ec = L.precedenteDeAntigo(oc, pc);
if (ec.especie !== pc.especie) h++;
// 5) modelos
const mods = JSON.parse(fs.readFileSync("paradigmas/modelos.json", "utf8")).registros;
const mdif = mods.filter(m => canon(L.modeloDeAntigo(L.modeloAntigo(m), m)) !== canon(m)).length;
console.log(`antigo reproduzido: ${f} diferença(s) · ida e volta: ${g} · edição/correção: ${h} · modelos: ${mdif}`, falhas);
process.exit(f || g || h || mdif ? 1 : 0);
