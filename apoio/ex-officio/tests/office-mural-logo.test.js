'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
test('Ex Officio: o Mural volta como página inicial, aberto pela marca e não pela barra de abas',()=>{
 assert.ok(app.includes('<main id="v-inicio" class="home-v2">'));
 assert.ok(app.includes("if(v==='mural')v='inicio'") && !app.includes("if(v==='inicio'||v==='mural')v='pauta'"));
 assert.ok(app.includes('class="br nx-home" href="#inicio" data-home'));
 assert.ok(!/<nav class="tabs"[^]*?data-vw="inicio"[^]*?<\/nav>/.test(app.slice(app.indexOf('<nav class="tabs" id="nx-tabs"'),app.indexOf('</nav>',app.indexOf('<nav class="tabs" id="nx-tabs"'))+6)),'sem aba do Mural');
 for(const f of ['function painel(','function ausencias(','function historico(']) assert.ok(app.includes(f),f);
});
test('Pautas: cartão do processo numa faixa só quando o cartão é largo, linhas da esquerda alinhadas às da direita',()=>{
 assert.ok(app.includes('#v-pauta.ed .edr.mrw>.rw{flex-wrap:nowrap!important;align-items:flex-start!important}'));
 assert.ok(app.includes('#v-pauta.ed .edr.mrw .ga .id{display:grid!important;grid-template-rows:28px 28px;row-gap:6px'));
 assert.ok(app.includes('#v-pauta.ed .edr.mrw .gb>.sn{height:28px;align-items:center;margin-bottom:6px}'));
});
test('Prontuário: pendências legíveis por inteiro e sustentação/preferência recolhida quando não há pedido',()=>{
 assert.ok(app.includes('<textarea data-acp-d="'));
 assert.ok(app.includes('#prq .ac-pl textarea{grid-column:2;width:100%'));
 assert.ok(app.includes(`'<details class="ac-s ac-det" id="ac-so"'+(so?' open':'')`));
 assert.ok(app.includes("if(dt&&pedidos.length)dt.open=true;"));
 assert.ok(app.includes("if(x.tagName==='DETAILS')x.open=true;"));
});
test('Prontuário: títulos de seção leves e campos compactos',()=>{
 assert.ok(app.includes('#prq .prt-p>section:nth-of-type(n)>h3{display:flex;align-items:baseline'));
 assert.ok(app.includes('#prq .sgx button{flex:1 1 auto!important;padding:3px 8px!important'));
 assert.ok(app.includes('#prq .ac-s,#prq .ac .prt-nt{border:0!important;border-bottom:1px solid var(--el)!important'));
});
test('Prontuário: copiar processo e IDs, peças numa linha; cartões com contagem mesmo quando é 1',()=>{
 for(const x of ["class=\"cpy '+cls+'\"",'#prq .prt:not(.pmn) .prt-body .rec.rec-pc{grid-template-columns:minmax(0,1fr) 88px 82px 20px 20px','text-align:justify',"A.length||'')+","N||'');})()+",'.sn-b.on.nt i{background:']) assert.ok(app.includes(x),x);
});
test('Prontuário: precedentes relacionados vêm do Ementário, com link para o Compendium',()=>{
 for(const x of ["jurGz('/jurisprudencia/curados.json.gz')","jurGz('/jurisprudencia/indice.json.gz')",'function precRelacionados(it,C)',"'/amicus/compendium/#v=ement&proc='",'Buscar “']) assert.ok(app.includes(x),x);
 assert.ok(!app.includes("'<div class=\"lv-c\">'+T.map(function(x){return '<span>'+esc(x)+'</span>';}).join('')"),'sem as etiquetas soltas de antes');
 const em=fs.readFileSync(path.resolve(__dirname,'../../modus-operandi/fonte/ementario.js'),'utf8');
 assert.ok(em.includes("irEmentarioProc(p.proc.split(',').filter(Boolean)"));
});

test('prontuário: botões do topo numa linha de pills; painel esquerdo com buscador rápido no rodapé; sem contador solto', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  for (const x of ['<div class="prt-tb">', '<span class="prt-nv">', 'class="prt-x"', '<span class="tl">Ficha</span>', '<span class="tl">Compendium</span>', '#prq .prt-tb .prt-hb,#prq .prt-tb .prt-nv{display:inline-flex','#prq .prt-tb{flex:0 0 auto;margin-left:auto;display:grid', 'function ppSubAltura()', ".pp-sub{height:var(--pp-h", '.pp-sub>.pp-num-rail{order:1;flex:1 1 auto;min-height:0;overflow-y:auto']) assert.ok(app.includes(x), x);
  assert.ok(!app.includes("' intercorrência'+(ic===1?'':'s')+' · '+mt+' meta'"));
});

test('prontuário: modo essencial aplicado sem redesenhar, com aviso; decisão na origem numa linha', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  for (const x of ['function prtModoAplica(el)', "if($('#prq .prt'))prtModoAplica();else prontLateral();", 'prt-essn', '<div class="row orig-ln">', "inp('orig.id','ID')+inp('orig.data','','date')+'</div>'", '#prq .row.orig-ln{display:grid!important']) assert.ok(app.includes(x), x);
});

test('prontuário: sem a prévia da minuta', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(!app.includes('abas[2].html+=previaMinuta('));
});

test('prontuário: tópico-síntese só é essencial nos casos previdenciários', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  const nq = x => String(x == null ? '' : x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const a = app.indexOf('function ehPrev(it)'), b = app.indexOf('function prtEssencial');
  const ehPrev = new Function('nq', app.slice(a, b) + ';return ehPrev;')(nq);
  assert.ok(ehPrev({ assunto: 'Aposentadoria Especial (Art. 57/8)', partes: 'FULANO x INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS' }));
  assert.ok(!ehPrev({ assunto: 'Índice de 28,86% Lei 8.622/1993 e 8.627/1993', partes: 'FULANO x INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS' }));
  assert.ok(ehPrev({ assunto: 'Aposentadoria por Tempo de Contribuição (Art. 55/6)', partes: 'X x INSS' }));
  assert.ok(!ehPrev({ assunto: 'Contribuição sobre a folha de salários', partes: 'EMPRESA x UNIAO FEDERAL - FAZENDA NACIONAL' }));
  assert.ok(!ehPrev({ assunto: 'Fornecimento de medicamentos', partes: 'FULANO x UNIAO FEDERAL' }));
  assert.ok(app.includes("if(!mono)prtEssencial(el,it);"));
});

test('prontuário: sem redesenho quando nada mudou; atualização silenciosa sem mudança não redesenha; posição por quadro', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  for (const x of ["if(el._sig===sig&&el.getAttribute('data-k')===S.prt&&el.querySelector('.prt')){prtPos();return;}", 'el._sig=sig;if(sc0)', '(silencioso&&!mud&&S.doc)', "f=requestAnimationFrame(function(){f=0;prtPos();})"]) assert.ok(app.includes(x), x);
});

test('prontuário: pendência mostra o texto inteiro (altura acompanha o texto)', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(app.includes('#prq .ac-pl textarea{height:auto!important;min-height:0!important;max-height:none!important}'));
});
