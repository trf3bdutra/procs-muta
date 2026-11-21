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
