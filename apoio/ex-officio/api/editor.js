/* POST /api/editor → grava no procs-muta as alterações feitas no editor do Modus Operandi (só para quem tem acesso de editor).
   Corpo: { msg, colecoes: { mod|par|pec|dir|nor|rap: [ { op: 'set'|'del', id, rec, orig, idx } ] } }
   orig é o registro como o editor o recebeu (JSON) ou '__novo__'; se o registro mudou no GitHub depois disso, a gravação é recusada. */
const L = require('./_lib');
const ARQ = {
  mod: { path: 'modelos/modelos.json', lista: d => d.registros, ind: 1 },
  par: { path: 'modelos/paragrafos.json', lista: d => d.registros, ind: 1 },
  dir: { path: 'apoio/diretrizes.json', lista: d => d.registros, ind: 1 },
  nor: { path: 'apoio/repertorio-normativo-complemento.json', lista: d => d.registros, ind: 1 },
  rap: { path: 'apoio/diretrizes-rapidas.json', lista: d => d.registros, ind: 1 },
  pec: { path: 'apoio/modus-operandi/fonte/editorial_pecas.json', lista: d => d.pecas, ind: 2, sem: true }
};
/* mesma serialização do editor (edJ): ignora chaves de cache iniciadas por _, salvo _topicos e _estrutura */
const J = x => JSON.stringify(x, (k, v) => k.charAt(0) === '_' && k !== '_topicos' && k !== '_estrutura' ? undefined : v);
const agora = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erro: 'método não aceito' });
  const u = L.exigir(req, res); if (!u) return;
  try {
    const a = await L.acessos(u);
    if (!a.editor) return res.status(403).json({ erro: 'Sem acesso de editor.' });
    const b = req.body || {}, C = b.colecoes || {}, arqs = [], conflitos = [];
    let n = 0;
    for (const c of Object.keys(C)) {
      const A = ARQ[c]; if (!A || !Array.isArray(C[c]) || !C[c].length) continue;
      const { txt, sha } = await L.lerGrande(A.path), doc = JSON.parse(txt), L0 = A.lista(doc);
      for (const op of C[c]) {
        const i = L0.findIndex(r => r.id === op.id), cur = i >= 0 ? L0[i] : null;
        if (op.orig === '__novo__') { if (cur) { conflitos.push(c + ':' + op.id + ' já existe'); continue; } }
        else if (!cur) { if (op.op === 'del') continue; conflitos.push(c + ':' + op.id + ' não existe mais'); continue; }
        else if (J(cur) !== op.orig) { conflitos.push(c + ':' + op.id + ' mudou no GitHub'); continue; }
        if (op.op === 'del') { L0.splice(i, 1); n++; continue; }
        if (!op.rec || op.rec.id !== op.id) { conflitos.push(c + ':' + op.id + ' registro inválido'); continue; }
        if (cur) L0[i] = op.rec; else L0.splice(Math.max(0, Math.min(op.idx | 0, L0.length)), 0, op.rec);
        n++;
      }
      if (!A.sem && 'atualizadoEm' in doc) doc.atualizadoEm = String(doc.atualizadoEm).length === 10 ? agora().slice(0, 10) : agora();
      /* sha do que foi lido: se o arquivo mudar no GitHub antes do commit, a gravação é recusada (409) em vez de sobrescrever */
      arqs.push({ path: A.path, txt: JSON.stringify(doc, null, A.ind) + '\n', sha });
    }
    if (conflitos.length) return res.status(409).json({ erro: 'Conflito com o que está no GitHub: ' + conflitos.slice(0, 8).join('; ') + '. Recarregue o editor e refaça essas alterações.', conflitos });
    if (!arqs.length || !n) return res.status(400).json({ erro: 'Nada a gravar.' });
    const msg = String(b.msg || 'Editor do Modus Operandi').slice(0, 200) + '\n\nAlterações feitas no editor do Modus Operandi por ' + u + '.';
    const cm = await L.commitArquivos(arqs, msg);
    res.status(200).json({ ok: true, commit: cm.sha, url: 'https://github.com/trf3bdutra/procs-muta/commit/' + cm.sha, alteracoes: n });
  } catch (e) { res.status(e.status === 409 ? 409 : 500).json({ erro: e.message }); }
};
