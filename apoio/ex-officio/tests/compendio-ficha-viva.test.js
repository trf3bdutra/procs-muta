'use strict';
/* Compendium · Minuta-Matriz ligada à ficha: campos automáticos publicados, ficha relida sozinha e roteiro pelo caso. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../../..'), MO = path.join(root, 'apoio/modus-operandi');
const ler = f => fs.readFileSync(path.join(MO, f), 'utf8');

test('a página publicada traz o catálogo de campos automáticos (@apelido) da ficha', () => {
  ['modus-operandi.html', 'modus-operandi-editor.html'].forEach(f => {
    const t = ler(f), m = /window\.CAMPOS_AUTO=(\{.*?\});\n/.exec(t);
    assert.ok(m, f + ': sem window.CAMPOS_AUTO');
    const C = JSON.parse(m[1]);
    assert.ok(C.campos.some(c => c.a === 'sentenca_id' && c.s === 'origem'), f + ': sem @sentenca_id');
    assert.ok(C.campos.length > 100, f + ': catálogo incompleto');
  });
});

test('a Minuta-Matriz relê a ficha sozinha e deriva o assunto do roteiro pelo caso', () => {
  const t = ler('modus-operandi.html');
  assert.match(t, /function fichaViva\(\)/);
  assert.match(t, /setInterval\(fichaViva,20000\)/);
  assert.match(t, /function dkRotAuto\(\)/);
  assert.match(t, /DK\.rotAsMan=true/);
});
