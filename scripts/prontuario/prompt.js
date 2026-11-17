#!/usr/bin/env node
/* Gera o prompt do prontuário da LIA com a MESMA função do Ex Officio (apoio/ex-officio/index.html → liaPrompt),
   para não haver duas versões do prompt. Uso: node prompt.js <cnj> [assunto] [mono]  → imprime o prompt. */
const fs = require('fs'), path = require('path');
const h = fs.readFileSync(path.join(__dirname, '../../apoio/ex-officio/index.html'), 'utf8');
const pick = re => { const m = h.match(re); if (!m) throw new Error('trecho não encontrado: ' + re); return m[0]; };
eval([/var LIA_CAMPOS=[^\n]*\n/, /var LIA_2886=[^\n]*\n/, /function liaChave[^\n]*\n/, /function liaE2886[^\n]*\n/,
      /function liaPrompt[\s\S]*?\nfunction liaLer/].map(pick).join('\n').replace(/function liaLer$/, ''));
const [cnj, assunto, mono] = process.argv.slice(2);
process.stdout.write(liaPrompt(mono === 'mono', { cnj: cnj || '', assunto: assunto || '' }));
