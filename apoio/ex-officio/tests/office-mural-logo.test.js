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
  for (const x of ['<div class="prt-tb">', '<span class="prt-nv">', 'class="prt-x"', '<span class="tl">Ficha</span>', '<span class="tl">Compendium</span>', '#prq .prt-tb .prt-hb,#prq .prt-tb .prt-nv{display:inline-flex','#prq .prt-tb{flex:0 0 auto;margin-left:auto;display:grid', 'function ppSubAltura()', ".pp-sub{height:auto;max-height:calc(100vh - 84px - var(--qf-h", '.pp-sub>.pp-num-rail{order:1;flex:1 1 auto;min-height:0;overflow-y:auto']) assert.ok(app.includes(x), x);
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

test('pedido por e-mail: grava tipo e os dados do pedido na seção do prontuário', async () => {
  const path = require('path');
  const pauta = require.resolve(path.join(__dirname, '..', 'api', 'pauta.js'));
  let rec = null;
  require.cache[pauta] = { id: pauta, filename: pauta, loaded: true, exports: { gravarItem: async (d, b) => { rec = { d, b }; return { status: 200, body: {} }; } } };
  const P = require(path.join(__dirname, '..', 'api', '_pedidos.js'));
  await P.marcar('2026-11-30', { lista: 'itens' }, { cnj: '5000791-85.2025.4.03.6207', tipo: 'Virtual', advogado: 'Fulana de Tal', oab: 'MS 12345', parte: 'Autora', recebidoEm: '2026-11-20T15:00:00Z', id: 'so-abc' });
  delete require.cache[pauta];
  assert.equal(rec.b.campos.sopref, 'Virtual');
  assert.deepEqual(rec.b.campos.cartao.so, { advogado: 'Fulana de Tal', oab: 'MS 12345', parte: 'Autora', recebido: '2026-11-20', origem: 'e-mail', pedido: 'so-abc' });
  const app = require('fs').readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  for (const x of ["fl('Advogado(a)','advogado','nome')", "fl('Pedido recebido em','recebido','','date')", "if(dialogo.id==='ac-so')"]) assert.ok(app.includes(x), x);
});

test('prontuário: pendência mostra o texto inteiro (altura acompanha o texto)', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(app.includes('#prq .ac-pl textarea{height:auto!important;min-height:0!important;max-height:none!important}'));
});

test('pauta: etiqueta Retidos (adiados ou retirados de pauta)', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(app.includes("['rt','Retidos','Adiados ou retirados de pauta (resultado da sessão ou intercorrência)',function(i){return !!retidoDe(i);}]"));
});

test('prontuário: Sinalizações (intercorrência com chamado ao TI e retido, pendência, aviso) e diligência automática do retido', () => {
  const path = require('path'), fs = require('fs');
  const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  for (const x of ['function sinalizacoes(it,c,PL,auto)', 'function icAberta(it)', "['ti','Chamado ao TI','ad','Adiado','rt','Retirado de pauta','ic','Outra']", "sec('Intercorrências',nI)", "data-ac=\"retidoOk\"", "data-acv-ok=", "cart(it).avisos=AV", "ic=n(icAberta)", "(inssParte(it)?f('Tópico-síntese'", "(RN||/remessa/.test(nq(it.classe||''))?f('Remessa necessária'"]) assert.ok(app.includes(x), x);
  const pauta = fs.readFileSync(path.join(__dirname, '..', 'api', 'pauta.js'), 'utf8');
  assert.ok(pauta.includes("'intercorTipo', 'intercorChamado', 'retidoOk'"));
  const pend = fs.readFileSync(path.join(__dirname, '..', 'api', 'pendencias.js'), 'utf8');
  for (const x of ["origem: 'retido'", "'ret:' + s.date", "if (alvo.origem === 'retido')", "String(c.intercorTipo).toLowerCase()"]) assert.ok(pend.includes(x), x);
});

test('números da sessão: alertas em botões curtos que levam ao processo', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  for (const x of ['class="kd-it', 'data-ir-k="', "closest('[data-ir-k]')", 'mostrarItemNaPauta(it);});']) assert.ok(app.includes(x), x);
});

test('buscador rápido sem Enter, processo localizado marcado; Sinalizações em cartão', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  for (const x of ['setTimeout(function(){irPara(true);},380)', 'function achadoLimpa()', "el.classList.add('flash','achado')", 'achadoMarca();prontLateral();', '#v-pauta #lst .pc.achado::before{content:"localizado"', '#prq #ac-sn{background:#fbf6ec']) assert.ok(app.includes(x), x);
});

test('faixas de produção com o que falta clicável; Sinalizações por seções; intercorrência adiado/retirado', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  for (const x of ['data-et-seg="n', "S.fEt.charAt(0)==='n'&&ETF[S.fEt.slice(1)]&&it[ETF[S.fEt.slice(1)]]", 'class="tp-fal', "sec('Pendências',nP)", "sec('Avisos',nA)", "{ti:'Chamado ao TI',ad:'Adiado',rt:'Retirado de pauta'}[tg]", '@container edtabs (max-width:759px)']) assert.ok(app.includes(x), x);
});

test('Mural só com as entregas de quem está logado; painel do gabinete nativo na Chefia do Caput (sem iframe)', () => {
  const path = require('path'), fs = require('fs');
  const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  for (const x of ["var HC={escopo:PAINEL_GAB?'todos':'minhas',", 'id="hc-esc" aria-label="Escopo" hidden', "if(PAINEL_GAB){document.body.classList.add('painel-gab');", 'html body.painel-gab #app header.nx']) assert.ok(app.includes(x), x);
  const caput = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'caput', 'triagem', 'index.html'), 'utf8');
  for (const x of ["fetch('/api/painel?entregas=1'", 'function voPinta(', 'function voMontar(', "voMontar();"]) assert.ok(caput.includes(x), x);
  assert.ok(!caput.includes('src="/office/?painel=gabinete"') && !caput.includes('cgGabAltura'), 'sem o Ex Officio embutido');
});

test('Mural: calendário do gabinete aberto no lugar da agenda de entregas', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(!app.includes('▦ Agenda de entregas'));
  assert.ok(app.includes('id="hc-cal-full" aria-label="Calendário do gabinete"><div id="cc-cal"'));
  assert.ok(app.includes("if($('#hc-mini-cal'))hcMiniCalendario();calendario();"));
});

test('Mural do servidor: desenho do protótipo num shadow root, com o quadro antigo só no painel do gabinete', () => {
  const fs = require('fs'), path = require('path');
  const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const p = fs.readFileSync(path.join(__dirname, '..', 'api', 'painel.js'), 'utf8');
  assert.match(h, /<div id="mu-host"/);
  assert.match(h, /<script id="mu-lib">[\s\S]*attachShadow\(\{mode:'open'\}\)/);
  assert.match(h, /body:not\(\.painel-gab\) #v-inicio>\.hc-board\{display:none!important\}/);
  assert.match(h, /if\(!PAINEL_GAB\)try\{MU\.montar\(P\.dados,\{eu:U\.eu/);
  assert.match(h, /<slot name=\\"cal\\"><\\\/slot>/);
  const cal = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'caput', 'motor', 'assets', 'js', '11-calendario.js'), 'utf8');
  assert.match(cal, /return \(ex\.alertasExtra\|\|\[\]\)\.concat\(U,A\.slice\(0,4\)\)/);
  assert.match(h, /<script id="cc-cal-lib" src="\/init\/motor\/assets\/js\/11-calendario\.js"><\/script>/);
  assert.match(h, /semanaLateral:true,semanaRecolhida:true/);
  assert.match(h, /function calMeus\(D\)/);
  assert.match(p, /meta: \(it\.ctl \|\| \{\}\)\.meta/);
  assert.match(p, /pend: \(\(\(it\.ctl/);
});

test('Pautas: sessão e buscador em linha única; ações de Sinalizações e Notas no cabeçalho; Solicitações no fim; seções como cartões', () => {
  const fs = require('fs'), path = require('path');
  const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(h, /#v-pauta\.pt2 \.pp-sub \.pp-ses \.pp-ses-k\{display:none!important\}/);
  assert.match(h, /\.pt-ir\.quick-find>span:not\(\.qf-row\),#v-pauta\.pt2 \.pp-sub \.pt-ir\.quick-find \.qf-help/);
  assert.match(h, /<span class="ac-hb"><select id="sg-tp"/);
  assert.match(h, /class="b pri nt-add" data-nota-add/);
  assert.ok(h.indexOf('notasBloco(it)+\n') < h.indexOf("'<details class=\"ac-s ac-det\" id=\"ac-so\"'"), 'Solicitações depois das Notas');
  assert.match(h, /#prq \.prt-p>section\{background:#fff/);
});

test('Mural: avisos e minhas ausências à direita do calendário, sem a faixa de sessões em andamento', () => {
  const fs = require('fs'), path = require('path');
  const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(h, /#mu-host \.cc-dir\{display:none!important\}/);
  assert.match(h, /wr\.id='mu-cal-wrap'/);
  assert.match(h, /#mu-cal-wrap\{display:grid;grid-template-columns:minmax\(0,1fr\) 340px/);
});

test('Monocráticas: fila de urgências aberta na coluna da esquerda, em cartões compactos', () => {
  const fs = require('fs'), path = require('path');
  const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(h, /function urgColuna\(\)/);
  assert.match(h, /if\(\$\('#v-pauta'\)\._ed\)\{painelUrgEd\(el\);urgColuna\(\);return;\}/);
  assert.match(h, /#urg\.urg-col \.pc\.ux\.aberto \.ux-b\{display:grid!important/);
  assert.match(h, /#urg\.urg-col:not\(\.nova\) \.urg-n\{display:none!important\}/);
});
