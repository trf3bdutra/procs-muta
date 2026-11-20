'use strict';
/* Compêndio: o "subassunto" dos precedentes (Ementário) e da jurisprudência (Repositório) passa a ser o
   tipo de caso "Matéria · tipo · aspecto distintivo", no mesmo padrão dos processos, com a matéria
   canônica do vocabulário comum (padrao/tipo-caso.json) ligando precedente e processo. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const raiz = path.join(__dirname, '..', '..', '..');
const ler = p => fs.readFileSync(path.join(raiz, p), 'utf8');
const VOC = JSON.parse(ler('padrao/tipo-caso.json'));

test('vocabulário comum: matérias únicas, com os grupos do Collectio', () => {
  const nomes = VOC.materias.map(m => m.nome);
  assert.strictEqual(new Set(nomes).size, nomes.length);
  const g = Object.fromEntries(VOC.materias.filter(m => m.grupo).map(m => [m.grupo, m.nome]));
  for (let i = 1; i <= 12; i++) assert.ok(g['g' + i], 'grupo g' + i + ' sem matéria');
  assert.strictEqual(g.g6, 'Previdenciário');
  assert.strictEqual(g.g8, '28,86%');
});

test('precedentes: tipo de caso sugerido com a matéria canônica, sem subassunto', () => {
  const L = ler('precedentes/precedentes.jsonl').split('\n').filter(Boolean).map(JSON.parse);
  const nomes = new Set(VOC.materias.map(m => m.nome));
  let n = 0;
  for (const r of L) {
    const cat = r.catalogacao || {}, cur = r.curadoria || {};
    assert.ok(!('subassuntoSugerido' in cat), r.id + ' ainda tem subassuntoSugerido');
    assert.ok(!('subassunto' in cur), r.id + ' ainda tem curadoria.subassunto');
    if (cat.tipoCasoSugerido) {
      n++;
      if (cat.materia && nomes.has(cat.materia)) assert.ok(cat.tipoCasoSugerido.startsWith(cat.materia), r.id);
    }
  }
  assert.ok(n > 1500, 'poucos tipos de caso sugeridos: ' + n);
  const ex = L.find(r => r.assunto === 'Rural (Art. 48/51)' && (r.catalogacao || {}).tipoCasoSugerido);
  assert.ok(/^Previdenciário · Rural \(Art\. 48\/51\)/.test(ex.catalogacao.tipoCasoSugerido));
});

test('Repositório (vade-mecum): coluna "Tipo de caso" no lugar de "Subassunto"', () => {
  const J = JSON.parse(ler('apoio/vade-mecum.json'))['Jurisprudência'];
  assert.ok(J.length > 100);
  for (const p of J) {
    assert.ok(!('Subassunto' in p));
    assert.ok(/^(Tributário|Aduaneiro) · /.test(p['Tipo de caso']), p['Código'] + ': ' + p['Tipo de caso']);
  }
});

test('Ementário: facetas Matéria e Tipo de caso; Correspondentes pelo tipo de caso', () => {
  const s = ler('apoio/modus-operandi/fonte/ementario.js');
  assert.ok(s.includes("var DIMS=['t','apr','ramo','mat','ass','tc','c','o','res','y'];"));
  assert.ok(s.includes("facet('mat','Matéria',base('mat'),8)"));
  assert.ok(s.includes("facet('tc','Tipo de caso',base('tc'),8)"));
  assert.ok(s.includes("' com o mesmo tipo de caso ou especificidades em comum</small>"));
  assert.ok(s.includes("<th>Tipo de caso</th>"));
  assert.ok(!/n:'Subassunto'|>Subassunto<|'Subassunto',base|mesmo subassunto/.test(s), 'rótulo "Subassunto" ainda aparece no Ementário');
});

test('a matéria do Ementário (JS) é a mesma do vocabulário em Python', () => {
  const s = ler('apoio/modus-operandi/fonte/ementario.js');
  const ini = s.indexOf('var TCV='), fim = s.indexOf('var DIM={');
  const f = new Function('window', 'nz', s.slice(ini, fim) + ';return {matDe:matDe,tcResto:tcResto,tcIgual:tcIgual};')(
    { TIPO_CASO: VOC }, x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
  const casos = ['Contratos bancários e CEF · revisão', 'Cumprimento de sentença contra o INSS · x', 'ACP ambiental · dano',
    'Alienação fiduciária de imóvel (Lei 9.514/1997) · leilão', 'Indígena · demarcação', 'aposentadoria rural · prova', 'OAB · anuidade'];
  const py = JSON.parse(execFileSync('python3', ['-c',
    'import sys,json;sys.path.insert(0,"scripts");import tipocaso as t;print(json.dumps([t.materia_de(x) for x in json.loads(sys.argv[1])]))',
    JSON.stringify(casos)], { cwd: raiz, encoding: 'utf8' }));
  assert.deepStrictEqual(casos.map(f.matDe), py);
  assert.deepStrictEqual(py, ['Contratos bancários', 'Cumprimento de sentença', 'Ambiental', 'Alienação fiduciária', 'Indígena', '', 'Execução da OAB']);
  const a = { mat: 'Previdenciário', _ass: 'Rural (Art. 48/51)', tc: 'Previdenciário · Rural (Art. 48/51) · Carência comprovada' };
  const b = { mat: 'Previdenciário', _ass: 'Híbrida (Art. 48/106)', tc: 'Previdenciário · Híbrida (Art. 48/106) · Carência comprovada' };
  assert.strictEqual(f.tcResto(a), 'Carência comprovada');
  assert.ok(f.tcIgual(a, b));
});

test('Consulta: precedente da mesma matéria do processo ganha pontos; rótulo "Tipo de caso"', () => {
  const s = ler('apoio/modus-operandi/fonte/consulta.js');
  assert.ok(s.includes('mP=matDe(P.subassuntos)||matDe(P.assunto)'));
  assert.ok(s.includes('[arr(p.tipoCaso||p.subassunto),3]'));
  assert.ok(s.includes("if(mP&&(p.materia||matDe(p.tipoCaso))===mP){r.s+=4;"));
  assert.ok(s.includes("subassuntos:'Tipo de caso',"));
});

test('build do Compêndio leva o vocabulário e o tipo de caso dos precedentes', () => {
  const b = ler('apoio/modus-operandi/fonte/build.py');
  assert.ok(b.includes("x['tipoCaso'], x['tcSug'] = cat['tipoCasoSugerido'], True"));
  assert.ok(b.includes("js = 'window.TIPO_CASO=' + TCJ"));
  assert.ok(ler('apoio/modus-operandi/modus-operandi.html').includes('window.TIPO_CASO={"materias":['));
});

test('extensão e curados: tc (tipo de caso) e mt (matéria) no lugar de sb', () => {
  const g = ler('scripts/jurisprudencia/gerar_curados.py');
  assert.ok(g.includes("'tc': cur.get('tipoCaso')"));
  assert.ok(!g.includes("'sb':"));
  const e = ler('extensao/ementario.js');
  assert.ok(e.includes("tc: r.tc || r.sb || ''"));
  assert.ok(e.includes("['Tipo de caso', x.tc]"));
});

test('lotes: tipo de caso com a matéria canônica do vocabulário comum', () => {
  const out = execFileSync('python3', ['-c',
    'import sys;sys.path.insert(0,"scripts/lotes");import tipo_caso as t;' +
    'print(t.tipo_caso("Contratos bancários e CEF · revisão","g11"));print(t.tipo_caso("aposentadoria rural · prova","g6"));' +
    'print(t.tipo_caso("Cumprimento de sentença contra o INSS · juros","g5"))'], { cwd: raiz, encoding: 'utf8' }).trim().split('\n');
  assert.deepStrictEqual(out, ['Contratos bancários · CEF · revisão', 'Previdenciário · aposentadoria rural · prova', 'Cumprimento de sentença · contra o INSS · juros']);
});
