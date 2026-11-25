'use strict';
/* Compendium · Minutário: canhoto único (orientações e painel do caso dentro dele), pílula de exportação acima da folha,
   roteiro fora do Minutário (catálogo em Padrões decisórios) e matrizes contidas em Modelos. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../../..'), MO = path.join(root, 'apoio/modus-operandi');
const ler = f => fs.readFileSync(path.join(MO, f), 'utf8');

test('o antigo painel direito vive no canhoto e a folha fica com duas colunas', () => {
  const js = ler('fonte/editorial_d.js'), css = ler('fonte/editorial_d.css');
  assert.match(js, /function dkJunta\(\)/);
  assert.match(js, /xPagina=function\(\)\{var r=_xp\.apply\(this,arguments\);dkJunta\(\);dkPilula\(\);/);
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

test('parágrafos do banco num painel flutuante preso ao bloco; canhoto sem "Editar esta peça"', () => {
  const js = ler('fonte/editorial_d.js');
  assert.match(js, /function dkFlutuante\(\)/);
  assert.match(js, /dkCanTrecho=function\(sel\)\{return dkProntuarioAtivo\(\)\+_dkCanTrechoBase\(sel\);\};/);
  assert.doesNotMatch(js, /Editar esta peça/);
  assert.match(ler('fonte/editorial_d.css'), /\.dflut\{position:absolute;/);
});

test('modelos do caso presos ao seletor Modelo da barra; conformidade no banner', () => {
  const js = ler('fonte/editorial_d.js'), c = ler('fonte/consulta.js');
  assert.match(js, /function dkSugAbre\(on\)/);
  assert.match(js, /data-dsug aria-expanded=/);
  assert.match(js, /function dkConf\(\)/);
  assert.match(c, /solucoes:solucoesCaso,conformidade:conformidadeCaso,/);
  assert.doesNotMatch(c, /var h=solucoes\(P,A,R\)\+/, 'modelos ainda dentro do painel do canhoto');
  assert.match(ler('fonte/editorial_d.css'), /#dk-conf\{position:static;/);
});

test('orientações fora do canhoto: no Breviário (capítulo 7) e em balão sobre a folha, da mesma fonte', () => {
  const js = ler('fonte/editorial_d.js'), O = JSON.parse(ler('fonte/orientacoes.json'));
  assert.ok(O.itens.length >= 27);
  assert.match(js, /var DORI=\/\*__DORI__\*\/\{\};/);
  assert.match(js, /function dkBalaoHtml\(pid,n\)/);
  assert.match(js, /Material do caso/);
  const t = ler('modus-operandi.html'), m = /<script type="application\/json" id="dir-manual">(.*?)<\/script>/s.exec(t);
  const H = JSON.parse(m[1]);
  assert.match(H, /<section class="mn-cap" id="mn-orientacoes" data-aba="manual">/);
  O.itens.forEach(i => assert.ok(H.includes(i.rotulo.replace(/&/g, '&amp;')), 'falta no Breviário: ' + i.rotulo));
  assert.ok(H.includes(O.itens.length + ' orientações'));
});

test('Minutário: fórmula única, ficha fornece dados, não um construtor paralelo',()=>{
  const js=ler('fonte/editorial_d.js'), c=ler('fonte/consulta.js');
  assert.doesNotMatch(js,/Automático · ficha|cxQual|cxPartes|cxBoot|cxMostra|cxSyncBar|DK\.cx|cx-host/);
  assert.match(js,/var PT=xPartes\(\),FMT=/);
  assert.match(js,/DK\.fonteManual=false;DK\.fonte='mat';DK\.mod='';/);
  assert.match(js,/MutaGerador\.comporFicha\(cp,fo\)/);
  assert.match(js,/function dkUsaModelo\(id\)/);
  assert.match(c,/dkAplicaCaso\(P,\{tipo:'mat',mat:matrizDoCaso\(P\)\}\)/);
});

test('Minutário: conformidade no banner, precedentes na barra e sem gerador LIA',()=>{const js=ler('fonte/editorial_d.js'),pa=ler('fonte/padrao_paginas.js'),cq=ler('fonte/consulta.js'),build=ler('fonte/build.py');assert.match(pa,/data-dconfmin aria-controls="dk-conf"/);assert.match(js,/banner.appendChild\(el\)/);assert.match(cq,/data-cq-prec aria-controls="cq-prec-panel"/);assert.match(cq,/function precedentesCaso\(/);assert.doesNotMatch(cq,/liaPainel|liaMontar|liaAcao|CQ\.lia|data-lia/);assert.doesNotMatch(build,/LIA3|id="lia-v3"|id="lia-gerar"/);});

test('Minutário: barra única e seletor de modelo com retorno à Minuta-Matriz',()=>{const js=ler('fonte/editorial_d.js');assert.match(js,/top.innerHTML=dkBarraUnica\(\)/);assert.match(js,/Minuta-Matriz · padrão/);assert.doesNotMatch(js,/Parte das funcionalidades ainda está em construção e teste/);assert.doesNotMatch(js,/dkBarra2\(/);assert.match(js,/if\(!t.value\)\{dkFonte\('mat'\);return;\}/);});

test('Minutário mantém os blocos originais e a conformidade não amplia o banner',()=>{const js=ler('fonte/editorial_d.js'),css=ler('fonte/padrao_paginas.css');assert.doesNotMatch(js,/dkComposicaoFicha|lab:'Ficha do processo'/);assert.match(js,/if\(m\)PT=dkPartesModelo\(m,PT\);return dkComInc\(PT\)/);assert.match(css,/dk-conf-open\{height:184px;min-height:0;max-height:184px/);assert.match(css,/\.d-unica\{display:flex!important;flex-wrap:wrap!important/);});

test('Modelos: ficha alimenta os campos do texto e as exportações sem modo separado',()=>{const c=ler('fonte/consulta.js'),em=ler('fonte/ementario.js');assert.match(c,/fichaModelo:function\(cnj\)/);assert.match(em,/CQX.fichaModelo\(n\)/);assert.match(em,/alt:MS.alt,abre:MS.abre,fora:MS.fora,auto:true/);});

test('Breviário: entradas rápidas na terceira coluna, sem duplicação no banner',()=>{const js=ler('fonte/editorial_d.js'),pa=ler('fonte/padrao_paginas.js');assert.match(js,/wrap.appendChild\(entradas\)/);assert.match(js,/grid-template-columns:minmax\(150px,210px\) minmax\(0,1fr\) minmax\(280px,340px\)/);assert.match(js,/#mn-rap\{grid-column:3;grid-row:1/);assert.match(js,/height:33px!important/);assert.doesNotMatch(pa,/id="pa-rap"/);});
