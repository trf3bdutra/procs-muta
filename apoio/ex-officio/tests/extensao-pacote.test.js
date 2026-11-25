'use strict';
/* Pacote da extensão (scripts/extensao/pacote.py): o painel lateral abre o prontuário universal, montado dos mesmos
   arquivos da prévia, sem o shim da prévia, sem gravação em memória e sem script embutido (o Chrome não o executa). */
const { test } = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os'), { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');
test('pacote: universal.html como painel lateral, sem peças da prévia', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hero-pac-')), z = path.join(d, 'p.zip');
  execFileSync('python3', [path.join(ROOT, 'scripts/extensao/pacote.py'), '--saida', z]);
  const ler = n => execFileSync('python3', ['-c', 'import sys,zipfile;print(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]).decode())', z, n]).toString();
  assert.equal(JSON.parse(ler('manifest.json')).side_panel.default_path, 'universal.html');
  const h = ler('universal.html');
  assert.doesNotMatch(h, /shim-previa|MUTA_PREVIA|<script>/);
  assert.match(h, /gabinete-universal\.js/); assert.match(h, /roteiro-universal\.js/); assert.match(h, /universal-layout\.css/);
  const g = ler('gabinete-universal.js');
  assert.match(g, /if\(!window\.MUTA_PREVIA\)return gravarReal\(\);/, 'na extensão a gravação é a real');
  assert.ok(ler('painel.html').length > 0, 'painel anterior continua no pacote');
});
