'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');

test('rodapé fixo contém seis abas (com Gabinete); busca e notificações ficam no cabeçalho',()=>{
  const dock=html.match(/<nav class="cmt-mobile-dock"[\s\S]*?<\/nav>/);
  assert.ok(dock,'rodapé próprio do desembargador');
  for(const key of ['pauta','a','u','d','dil','m']){
    assert.ok(dock[0].includes('data-cmt-dock="'+key+'"'),key);
    assert.equal((dock[0].match(new RegExp('data-cmt-dock="'+key+'"','g'))||[]).length,1);
  }
  assert.equal((dock[0].match(/data-cmt-dock=/g)||[]).length,6);
  assert.ok(html.includes('id="cmt-b-bus"'),'busca no cabeçalho');
  assert.ok(html.includes('id="cmt-b-not"'),'notificações no cabeçalho');
  assert.ok(html.includes('enterkeyhint="go"'));
  assert.equal((html.match(/id="cmt-fastnav"/g)||[]).length,1);
  assert.ok(html.includes('id="cmt-ir-v"'));
});

test('redesign do celular: ⋯ nas linhas, retidos e barra de progresso',()=>{
  assert.ok(html.includes('id="cmt-mobile-redesign"'));
  assert.ok(html.includes('class="cmt-mais-m"'));
  assert.ok(html.includes('function cmtRetido(x)'));
  assert.ok(html.includes("f==='retido'?it.filter(cmtRetido)"));
  assert.ok(!html.includes('Math.max(0,ncor-(cta.liberado||0))'),'corrigidos não podem descontar todos os liberados');
  assert.ok(html.includes('class="cmt-pl"'));
});

test('três painéis existentes preservam ids e recebem cabeçalho móvel',()=>{
  for(const id of ['cmt-ass','cmt-urg-p','cmt-dv-p','cmt-p-not','cmt-p-dil'])
    assert.ok(html.includes('id="'+id+'"'),id);
  for(const id of ['cmt-mobile-pn-title','cmt-mobile-pn-count','cmt-mobile-more','cmt-dr-x'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.ok(html.includes('function cmtMobileSync()'));
  assert.ok(html.includes("if(ab&&cmtMobileMode()){cmtGaveta(false)"));
  assert.ok(html.includes("document.body.classList.remove('cmt-pn-on','cmt-search-on')"));
});

test('layout apenas no celular: dock, rolagem interna e safe area',()=>{
  for(const token of [
    '--cmt-mob-dock-h','grid-template-columns:repeat(6,minmax(0,1fr))',
    '#v-cmt .cmt-mobile-dock','body.cmt-search-on #v-cmt .cmt-fastnav',
    '#v-cmt .cmt-dr .cmt-grid','overscroll-behavior:contain',
    '#v-cmt .cmt-pn-not,#v-cmt .cmt-pn-dil',
    '@media(max-width:780px) and (prefers-reduced-motion:reduce)'
  ])assert.ok(html.includes(token),token);
  assert.ok(html.includes('#v-cmt #cmt-b-not,#v-cmt #cmt-b-dil{display:none!important}'));
});

test('scripts mantêm sintaxe JavaScript válida',()=>{
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length>0);
  scripts.forEach((match,i)=>{
    if(match[1].trim())new vm.Script(match[1],{filename:'exofficio-script-'+i+'.js'});
  });
});

test('diligências: seções minimizáveis; Urgências e Concluída começam fechadas',()=>{
  assert.ok(html.includes("var COL=['A fazer','Em andamento','Em revisão','Urgências','Concluída'];"));
  assert.ok(html.includes("CMT.dilAb=CMT.dilAb||{'Urgências':false,'Concluída':false};"));
  assert.ok(html.includes('<details class="cmt-col'));
  assert.ok(html.includes('#v-cmt .cmt-mobile-pn-h #cmt-mobile-more{display:none!important}'));
});

test('Para assinar: lista é o padrão; fila só no celular',()=>{
  assert.ok(html.includes('data-cvis="lista" aria-pressed="true"'));
  assert.ok(html.includes("modo=cmtMobileMode()&&CMT.vis==='fila'?'fila':'lista'"));
  assert.ok(html.includes('#v-cmt #cmt-vis{display:none!important}'));
});
