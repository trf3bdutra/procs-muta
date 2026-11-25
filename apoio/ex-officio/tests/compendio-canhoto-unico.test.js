'use strict';
/* Compendium · Minutário: canhoto único (orientações e painel do caso dentro dele), pílula de exportação acima da folha,
   roteiro fora do Minutário (catálogo em Padrões decisórios) e matrizes contidas em Modelos. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../../..'), MO = path.join(root, 'apoio/modus-operandi');
const ler = f => fs.readFileSync(path.join(MO, f), 'utf8');

test('o antigo painel direito vive no canhoto e a folha fica com duas colunas', () => {
  const js = ler('fonte/editorial_d.js'), css = ler('fonte/editorial_d.css');
  assert.match(js, /function dkJunta\(\)/);
  assert.match(js, /xPagina=function\(\)\{var r=_xp\.apply\(this,arguments\);dkJunta\(\);dkPilula\(\);return r;\};/);
  assert.match(css, /grid-template-areas:"top top" "can main"\}/);
  assert.match(css, /#x-aside #x-ref\.dorip\{/);
});

test('Copiar peça, .docx, PDF, limpar e Conferir ficam na pílula do Copiar, acima da folha', () => {
  const js = ler('fonte/editorial_d.js');
  assert.match(js, /function dkPilula\(\)/);
  assert.match(js, /className='dpill'/);
  assert.match(ler('fonte/editorial_d.css'), /\.dtabs \.dpill\{/);
});

test('roteiro fora do Minutário; catálogo em Diretrizes › Padrões decisórios › Roteiros por assunto', () => {
  const js = ler('fonte/editorial_d.js');
  assert.match(js, /var DK_ROT_MIN=false;/);
  assert.match(js, /function dkRoteiro\(pid\)\{\n  if\(!DK_ROT_MIN\)return '';/);
  const rot = JSON.parse(ler('fonte/roteiros.json')), n = rot.blocos.reduce((s, b) => s + b.itens.length, 0);
  const t = ler('modus-operandi.html'), m = /<script type="application\/json" id="dir-manual">(.*?)<\/script>/s.exec(t);
  assert.ok(m, 'sem o manual das Diretrizes');
  const H = JSON.parse(m[1]);
  assert.match(H, /<section class="mn-cap" id="mn-roteiros" data-aba="padroes">/);
  assert.ok(H.includes(n + ' perguntas'), 'capítulo sem todas as perguntas do catálogo');
  assert.match(H, /data-mngo="roteiros">Roteiros por assunto</);
});

test('matrizes estão dentro de Modelos: sem "Matriz modular" no painel do caso nem botão próprio na barra', () => {
  const c = ler('fonte/consulta.js'), js = ler('fonte/editorial_d.js');
  assert.doesNotMatch(c, /<b>Matriz modular<\/b>/);
  assert.match(c, /Modelos para o caso/);
  assert.doesNotMatch(js, /\['m28','Matriz 28,86%'\]/);
  assert.match(js, /<optgroup label="Matrizes"><option value="m28"/);
  assert.match(js, /if\(t\.value==='m28'\)\{dkFonte\('m28'\);return;\}/);
});

test('Modelos e Parágrafos são modos do Minutário, trocados pelo seletor da abertura', () => {
  const js = ler('fonte/editorial_d.js'), pp = ler('fonte/padrao_paginas.js');
  assert.doesNotMatch(js, /\['mod','Modelos'\],\['dir'/, 'Modelos ainda na navegação do topo');
  assert.match(js, /var IT=\[\['ement','Ementário'\],/);
  assert.match(js, /if\(ed==='par'\)\{\$\('#x-wrap'\)\.hidden=true;bk\.hidden=false;/);
  assert.match(js, /window\.VDM_minModo=function\(v\)/);
  assert.match(pp, /function modoSel\(\)/);
  assert.match(pp, /\['pecas','Minutário'[^\]]*\],\['mod','Modelos'[^\]]*\],\['par','Parágrafos'/);
});
