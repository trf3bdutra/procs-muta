'use strict';
/* "Subassunto" deixou de existir: o mesmo conteúdo é o tipo de caso; o assunto do PJe fica como veio
   e ganha um "assunto detalhado" (corrigido e preciso). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const raiz = path.join(__dirname, '..', '..', '..');
const ler = p => fs.readFileSync(path.join(raiz, p), 'utf8');

test('Collectio mostra assunto do PJe, assunto detalhado e tipo de caso, sem subassunto', () => {
  const h = ler('apoio/ex-officio/lotes/index.html');
  assert.ok(h.includes("'Assunto (PJe)':esc(it.assunto)"));
  assert.ok(h.includes("'Assunto detalhado':esc(it.assunto_detalhado)"));
  assert.ok(h.includes("'Tipo de caso':SEG(it.tipo_caso)"));
  assert.ok(!/Subassunto/.test(h), 'rótulo "Subassunto" ainda aparece no Collectio');
  assert.ok(!/it\.subassunto/.test(h), 'o Collectio ainda lê it.subassunto');
});

test('API do lote grava assunto_detalhado e converte subassunto em tipo_caso', () => {
  const s = ler('apoio/ex-officio/api/_lote.js');
  const txt = s.match(/const TXT = \[([^\]]+)\]/)[1];
  assert.ok(txt.includes("'assunto_detalhado'"));
  assert.ok(!txt.includes("'subassunto'"));
  assert.ok(s.includes('x.subassunto !== undefined && x.tipo_caso === undefined'));
  assert.ok(s.includes('delete it.subassunto'));
});

test('Ex Officio: campo "Assunto detalhado" e rótulo "Tipo de caso" no prontuário e no prompt da LIA', () => {
  const h = ler('apoio/ex-officio/index.html');
  assert.ok(h.includes('["p:assuntoDet", "Assunto detalhado", "texto"], ["p:subassuntos", "Tipo de caso", "texto"]'));
  assert.ok(h.includes("f('Assunto detalhado',inp('assuntoDet'"));
  assert.ok(h.includes("f('Tipo de caso',tl('subassuntos'"));
  assert.ok(!/['"]Subassuntos?['"]/.test(h), 'rótulo "Subassunto(s)" ainda aparece no Ex Officio');
  assert.ok(ler('apoio/ex-officio/api/_prontuario.js').includes("'assuntoDet'"));
});

test('tipo_caso.py migra subassunto para tipo_caso sem perder o texto anterior', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-'));
  const arq = path.join(dir, 'lote.json');
  fs.writeFileSync(arq, JSON.stringify({ itens: [
    { processo: '1', grupo: 'g4', tipo_caso: 'AI · Execução fiscal · prescrição', subassunto: 'Execução fiscal · prescrição',
      prontuario_triagem: { cartao: { subassuntos: 'Execução fiscal · prescrição' } } },
    { processo: '2', grupo: 'g6', tipo_caso: 'Benefício por incapacidade', subassunto: 'tutela antes da perícia' },
    { processo: '3', grupo: 'g7', tipo_caso: 'AI · Tributário · PIS e COFINS' }
  ] }));
  execFileSync('python3', [path.join(raiz, 'scripts/lotes/tipo_caso.py'), arq]);
  const [a, b, c] = JSON.parse(fs.readFileSync(arq, 'utf8')).itens;
  assert.strictEqual(a.tipo_caso, 'Execução fiscal · prescrição');
  assert.ok(!('subassunto' in a));
  assert.strictEqual(a.prontuario_triagem.cartao.subassuntos, 'Execução fiscal · prescrição');
  assert.strictEqual(b.tipo_caso, 'Previdenciário · tutela antes da perícia');
  assert.strictEqual(b.triagem.tipo_caso_anterior, 'Benefício por incapacidade');
  assert.strictEqual(c.tipo_caso, 'Tributário · PIS e COFINS');
  assert.strictEqual(c.assunto_detalhado, '');
});
