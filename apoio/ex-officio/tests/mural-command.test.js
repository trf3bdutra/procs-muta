'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const script=html.match(/<script id="mu-cracha">([\s\S]*?)<\/script>/)[1];
test('Mural Command: script válido e calendário antes dos módulos, sem substituir o painel da chefia',()=>{
  assert.doesNotThrow(()=>new vm.Script(script));
  assert.ok(script.indexOf('class="fx-command-calendar"')<script.indexOf('class="fx-command-work"'));
  assert.ok(script.indexOf('class="fx-command-work"')<script.indexOf('class="fx-row"'));
  assert.match(html,/CX\.sessoesCommand=\(\(P0&&P0\.sessoes\)\|\|\[\]\)\.slice\(\)/);
  assert.match(html,/if\(!PAINEL_GAB\)try\{MU\.montar/);
  for(const key of ['POS.kp','POS.bd','POS.cs','POS.sg','POS.ds','POS.alm','POS.hs','POS.as','POS.ss'])assert.ok(script.includes(key),key);
});
test('Mural Command: sessões independem de seleção e mês; convocações públicas da agenda e marcos inconsistentes',()=>{
  const nodes={'.fx-command-sessions':{},'.fx-command-conv':{}};
  const cx={sessoesCommand:[
    {date:'2026-11-01',marcos:{}},
    {date:'2026-12-07',processos:192,marcos:{pautarAte:'2026-11-09',inicioPreparacao:'2026-11-23',entregaMinutas:'2026-12-02',liberacao:'2026-11-05'}},
    {date:'2027-01-18',marcos:{pautarAte:'2026-12-07',entregaMinutas:'2027-01-10'}}
  ]};
  let agenda=[
    {tipo:'evento',freq:'unica',data:'2026-12-01',titulo:'Convocação · PRIVADO',privado:true},
    {tipo:'evento',freq:'unica',data:'2026-11-27',titulo:'Convocação · 2ª Seção'},
    {tipo:'evento',freq:'unica',data:'2026-12-07',titulo:'Convocação · 1ª Seção'},
    {tipo:'evento',freq:'unica',data:'2026-99-01',titulo:'Convocação · INVÁLIDA'},
    {tipo:'evento',freq:'unica',data:'2026-11-26',titulo:'Outro evento'}
  ];
  const ctx={fx:{querySelector:q=>nodes[q]},ON:true,HJ:()=> '2026-11-25',CX:cx,window:{CMTAgenda:{get:()=>agenda}},esc:String,dm:s=>s.slice(8,10)+'/'+s.slice(5,7),dCurto:s=>s,MES:['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']};
  vm.createContext(ctx);
  vm.runInContext(script.slice(script.indexOf('function commandMarcos(){'),script.indexOf('function rotulos(){'))+';commandMarcos();',ctx);
  assert.match(nodes['.fx-command-sessions'].innerHTML,/07\/12/);
  assert.match(nodes['.fx-command-sessions'].innerHTML,/18\/01/);
  assert.doesNotMatch(nodes['.fx-command-sessions'].innerHTML,/01\/11/);
  assert.match(nodes['.fx-command-sessions'].innerHTML,/05\/11 · conferir/);
  assert.match(nodes['.fx-command-conv'].innerHTML,/2ª Seção/);
  assert.match(nodes['.fx-command-conv'].innerHTML,/1ª Seção/);
  assert.doesNotMatch(nodes['.fx-command-conv'].innerHTML,/PRIVADO|INVÁLIDA|Outro evento/);
  agenda=null;vm.runInContext('commandMarcos()',ctx);
  assert.match(nodes['.fx-command-conv'].innerHTML,/Agenda ainda não carregada/);
  agenda=[];vm.runInContext('commandMarcos()',ctx);
  assert.match(nodes['.fx-command-conv'].innerHTML,/Nenhuma convocação futura/);
});
