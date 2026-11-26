'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const script=html.match(/<script id="mu-cracha">([\s\S]*?)<\/script>/)[1];
test('Mural Command: script válido e calendário antes dos módulos, sem substituir o painel da chefia',()=>{
  assert.doesNotThrow(()=>new vm.Script(script));
  // O redesign pode acrescentar classes aos elementos sem alterar a estrutura do Mural.
  const classAttrs=[...script.matchAll(/\bclass="([^"]*)"/g)];
  const classIndex=name=>classAttrs.findIndex(m=>m[1].split(/\s+/).includes(name));
  const calendar=classIndex('fx-command-calendar'),work=classIndex('fx-command-work'),row=classIndex('fx-row');
  assert.ok(calendar>=0,'Elemento fx-command-calendar ausente');
  assert.ok(work>=0,'Elemento fx-command-work ausente');
  assert.ok(row>=0,'Elemento fx-row ausente');
  assert.ok(calendar<work,'Calendário deve preceder o bloco de trabalho no markup');
  assert.ok(work<row,'Bloco de trabalho deve preceder os demais módulos no markup');
  assert.match(html,/MUFX\.apos\(root,host,CX\)/);
  assert.match(html,/if\(!PAINEL_GAB\)try\{MU\.montar/);
  for(const key of ['POS.kp','POS.bd','POS.br','POS.cs','POS.sg','POS.ds','POS.hs','POS.as','POS.ss'])assert.ok(script.includes(key),key);
});
test('Mural Command: convocações futuras públicas da agenda',()=>{
  const nodes={'.fx-command-conv':{}};
  let agenda=[
    {tipo:'evento',freq:'unica',data:'2026-12-01',titulo:'Convocação · PRIVADO',privado:true},
    {tipo:'evento',freq:'unica',data:'2026-11-27',titulo:'Convocação · 2ª Seção'},
    {tipo:'evento',freq:'unica',data:'2026-12-07',titulo:'Convocação · 1ª Seção'},
    {tipo:'evento',freq:'unica',data:'2026-99-01',titulo:'Convocação · INVÁLIDA'},
    {tipo:'evento',freq:'unica',data:'2026-11-26',titulo:'Outro evento'}
  ];
  const ctx={fx:{querySelector:q=>nodes[q]},ON:true,HJ:()=> '2026-11-25',window:{CMTAgenda:{get:()=>agenda}},esc:String,dm:s=>s.slice(8,10)+'/'+s.slice(5,7),dCurto:s=>s,MES:['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']};
  vm.createContext(ctx);
  vm.runInContext(script.slice(script.indexOf('function convocacoesNaAgenda(){'),script.indexOf('function rotulos(){'))+';convocacoesNaAgenda();',ctx);
  assert.match(nodes['.fx-command-conv'].innerHTML,/2ª Seção/);
  assert.match(nodes['.fx-command-conv'].innerHTML,/1ª Seção/);
  assert.doesNotMatch(nodes['.fx-command-conv'].innerHTML,/PRIVADO|INVÁLIDA|Outro evento/);
  agenda=null;vm.runInContext('convocacoesNaAgenda()',ctx);
  assert.match(nodes['.fx-command-conv'].innerHTML,/Agenda ainda não carregada/);
  agenda=[];vm.runInContext('convocacoesNaAgenda()',ctx);
  assert.match(nodes['.fx-command-conv'].innerHTML,/Nenhuma convocação futura/);
});

test('Agenda Mural: sessões e marcos integrados, sem meta duplicada e com afazeres no mesmo bloco',()=>{
 assert.match(script,/function sessoesNaAgenda\(cal\)/);assert.match(script,/querySelectorAll\('\.cc-sb-s\[data-ses\]'\)/);assert.match(script,/fx-sess-source" hidden/);assert.match(script,/td=es&&es\.querySelector\('\.cc-td'\)/);assert.match(script,/Meus prazos e afazeres/);assert.match(html,/ME\.hoje='';/);const cal=fs.readFileSync(path.resolve(__dirname,'../../../caput/motor/assets/js/11-calendario.js'),'utf8');assert.match(cal,/data-a="lado-ses"/);assert.match(cal,/ex\.sessoesLateral/);assert.match(cal,/new Map\(ses\.filter\(s=>s\.date>=hoje\)/);assert.match(cal,/cc-session-host[^>]*>\$\{d2\}/);assert.match(cal,/mk-check/);assert.doesNotThrow(()=>new vm.Script(cal));
});

test('Mural: indicadores e controles no cabeçalho de designações à esquerda da agenda',()=>{
 assert.match(script,/class="fx-mk fx-strip-panel"/);assert.match(script,/fx-assignment-head/);assert.match(script,/fx-assignment-filters/);assert.doesNotMatch(script,/Alertas do dia|POS\.alm/);assert.match(script,/class="fx-av fx-strip-panel"/);assert.match(script,/fx\.querySelector\('\.fx-work-left'\)\.appendChild\(fx\.querySelector\('\.fx-mid'\)\)/);assert.match(script,/b\.style\.removeProperty\('grid-column'\)/);assert.match(script,/\.fx-assignment-head #kpis\{display:grid!important/);
});

test('Mural: colunas com altura comum, atalhos retirados e painéis pessoais refinados',()=>{
 assert.doesNotMatch(script,/class="fx-command-links"/);assert.match(script,/--fx-oper-height:clamp/);assert.match(script,/grid-template-rows:minmax\(0,2fr\) minmax\(0,1fr\)/);assert.match(html,/class="mu-date-editor"/);assert.match(html,/data-hview="registros"/);assert.match(html,/data-hpanel="registros" hidden/);assert.match(html,/id="aus-perfil"/);assert.match(html,/<h2>Minhas atividades<\/h2>/);assert.match(html,/id="xlsx"/);
});

test('Agenda Mural: um cartão por sessão futura, com totais e marco inconsistente',()=>{
  const cal=fs.readFileSync(path.resolve(__dirname,'../../../caput/motor/assets/js/11-calendario.js'),'utf8');
  const hoje='2026-11-25',d1='2026-11-30',d2='2026-12-07';
  const sessao=(date,marcos={})=>({date,marcos,cor:'#245b8c',processos:151});
  const MK=[['pautarAte','Peço dia','ti-send'],['inicioPreparacao','Início da preparação','ti-pencil'],['entregaMinutas','Minutas','ti-file'],['liberacao','Liberação','ti-lock'],['date','Sessão','ti-gavel']];
  const ctx={hoje,st:{lado:'ses',dia:'2026-11-24'},ses:[sessao(d2),sessao(d1),sessao('2026-11-01'),sessao(d2,{entregaMinutas:'2026-12-02',liberacao:'2026-11-05'})],MK,ex:{sessoesLateral:true,alertasNoTopo:true},
    marcos:s=>MK.map(([k,n])=>({k,n,d:k==='date'?s.date:s.marcos[k]})).filter(m=>m.d),
    prog:()=>({minutadas:132,corrigidas:104,liberadas:73}),P:s=>new Date(s+'T12:00:00'),DIA:864e5, F:s=>s.slice(8,10)+'/'+s.slice(5,7),
    cap0:String,FD:String,afazeres:()=>[],feitos:()=>({}),iso:d=>d.toISOString().slice(0,10),estado:()=>''};
  const [,cards]=vm.runInNewContext(cal.slice(cal.indexOf('  function lateral(){'),cal.indexOf('  function dialogo(){'))+';lateral()',ctx);
  assert.deepEqual([...cards.matchAll(/class="cc-sb-s" data-ses="([^"]+)"/g)].map(m=>m[1]),[d1,d2]);
  assert.match(cards,/132\/151/);assert.match(cards,/05\/11 · conferir/);assert.doesNotMatch(cards,/cc-dir|01\/11/);
});
