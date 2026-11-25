'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.resolve(__dirname,'../../modus-operandi/fonte/ementario.js'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../../modus-operandi/fonte/ementario.css'),'utf8');
const code=src.slice(src.indexOf('function ppMetadados('),src.indexOf('function fecharIT()'));
function montar(col){
  const buttons=new Map(),copias=[];
  const box={scrollTop:0,querySelector(q){if(q==='.pp-em:not(.cut)'||q.includes('details.pp-d[open]')||q==='[data-ppm]')return null;if(!buttons.has(q))buttons.set(q,{getAttribute(n){return this[n]||'false';},setAttribute(n,v){this[n]=v;}});return buttons.get(q);}};
  let html='';
  const x={id:'a',t:col?'M':'A',n:'5000000-00.2026.4.03.9999',_rd:'Área jurídica',mat:'Matéria X',_ass:'Assunto X',tc:'Tipo X',tcS:true,_res:'Desprovido',_apr:'Julgamento do recurso',c:'AI',cl:'Agravo de Instrumento',o:'TRMS',d:'2026-11-14',p:'2026-11-18',rl:'Relator X',tese:'Tese X',r:'Resultado X',e:'Ementa X',_it:'Texto X',tags:['Tag X'],esp:'Especificidade X',obs:'Nota X',proc:{},disp:'Artigo X',jur:'Jurisprudência X',rast:{arq:'origem.jsonl',ln:12,cur:'conferido'},_origem:{data_disponibilizacao_djen:'18/11/2026'}};
  const y={...x,id:'b',n:'5000001-00.2026.4.03.9999'};
  const ctx={window:{EMENT_FONTE:col?'/collegium/':null},E:{idx:[x,y]},BASE:{},ICO:{cit:''},$:(q)=>null,$$:()=>[],esc:s=>String(s??''),refs:s=>String(s??''),nz:s=>String(s??'').toLowerCase(),tcResto:()=> 'Tipo X',tcIgual:()=>true,corRes:()=> '#000',siglaO:s=>s,fmtD:s=>s,n0:String,citados:()=>({enun:['Tema X'],norm:['Norma X']}),ppPartes:()=>'<div>Partes X</div>',repLinksDoProcesso:()=>'<div>Repertório X</div>',painelOrigemCol:()=>'<div>Proveniência DJEN X</div>',painel:h=>{html=h;return box;},copiar:(s)=>copias.push(s),citacao:()=> 'Citação X',fecharIT(){},baixarDocx(){},baixarPdf(){},rcPrecedente(){},setF(){},porId:()=>y};
  vm.createContext(ctx);vm.runInContext(code,ctx);ctx.abrirIT(x);
  const sec=k=>k==='processo'?(html.match(/id="pp-processo-card"[^>]*>([\s\S]*?)<\/section>/)||[])[1]||'':k==='rastreabilidade'?(html.match(/<footer class="pp-footer">([\s\S]*?)<\/footer>/)||[])[1]||'':(html.match(/class="pp-section pp-julgado"[^>]*>([\s\S]*?)<\/section>/)||[])[1]||'';
  return {ctx,box,buttons,copias,sec,x,y,html:()=>html};
}
test('Ementário: julgado sem abas, expansão vertical e rodapé',()=>{
  assert.doesNotThrow(()=>new vm.Script(src));
  assert.match(css,/\.pp-section\[hidden\]\{display:none!important\}/);
  const m=montar(false);
  assert.doesNotMatch(m.html(),/role="tablist"|data-ppaba=|Correspondentes/);
  assert.match(m.html(),/data-dpdf[\s\S]*?<\/div><\/div><section id="pp-processo-card"[\s\S]*?<\/section><div class="e-dbody pp-b">/);
  assert.match(css,/@keyframes pp-processo-descer/);
  assert.match(m.html(),/<small>Resultado<\/small><b>Desprovido<\/b>/);
  for(const k of ['Apreciação','Classe','Órgão','Documento'])assert.ok(m.html().includes('<small>'+k+'</small>'));
  assert.match(m.html(),/<small>Documento<\/small><b>Inteiro teor<\/b>/);
  assert.match(m.html(),/pp-res pp-r-favoravel|pp-res pp-r-desfavoravel/);
  assert.match(m.html(),/pp-ap-recurso/);
  assert.match(m.html(),/pp-inteiro/);
  for (const [res,cl] of [['Provido','favoravel'],['Embargos rejeitados','desfavoravel'],['Parcialmente provido','parcial'],['Não conhecido','processual'],['Outro','neutro']]) {
    assert.ok(m.ctx.ppMetadados({...m.x,_res:res},'Texto').includes('pp-r-'+cl));
  }
  for (const [apr,cl] of [['Embargos de declaração','ed'],['Agravo interno','agint'],['Juízo de retratação','retrata']]) {
    assert.ok(m.ctx.ppMetadados({...m.x,_apr:apr},'Texto').includes('pp-ap-'+cl));
  }
  assert.match(m.html(),/id="pp-processo-card"[^>]+ hidden/);
  assert.match(m.html(),/data-dprocesso[^>]+aria-expanded="false"/);
  assert.doesNotMatch(m.html(),/data-ppaba="(?:processo|rastreabilidade)"/);
  for(const [k,v] of [['julgado','Tese X'],['julgado','Resultado X'],['julgado','Ementa X'],['julgado','Texto X'],['processo','Partes X'],['processo','Tipo X'],['processo','Especificidade X'],['processo','Nota X'],['julgado','Artigo X'],['julgado','Jurisprudência X'],['julgado','Repertório X'],['rastreabilidade','origem.jsonl']])assert.ok(m.sec(k).includes(v),k+': '+v);
  assert.ok(!m.sec('julgado').includes('Partes X'));
  assert.match(m.sec('processo'),/Detalhamento do caso/);
  assert.match(m.sec('processo'),/Tag X/);
  assert.doesNotMatch(m.html(),/data-ppaba="(?:catalogacao|referencias)"/);
  assert.equal((m.sec('processo').match(/class="pp-proc\b/g)||[]).length,1,'cartão único de processo');
  assert.match(m.sec('julgado'),/Ementa X[\s\S]*Referências[\s\S]*Dispositivos legais[\s\S]*Jurisprudência[\s\S]*Temas e súmulas[\s\S]*Inteiro teor/);
  assert.doesNotMatch(m.sec('processo'),/<span>Tipo de caso<\/span>|>Especificidades<\/div>/);
  m.buttons.get('[data-dprocesso]').onclick();assert.equal(m.ctx.E.detProcessoAberto,true);assert.equal(m.buttons.get('#pp-processo-card').hidden,false);
  assert.match(m.sec('julgado'),/Inteiro teor[\s\S]*<footer class="pp-footer">[\s\S]*Rastreabilidade/);
  m.ctx.abrirIT(m.x);assert.match(m.html(),/data-dprocesso[^>]+aria-expanded="true"/);
  m.ctx.abrirIT(m.y);assert.equal(m.ctx.E.detProcessoAberto,false);
  assert.match(m.html(),/<div class="e-dacts pp-process-actions"[\s\S]*?data-dprocesso[\s\S]*?data-dcnj[\s\S]*?data-dcit[\s\S]*?data-dem[\s\S]*?data-dit[\s\S]*?data-ddocx[\s\S]*?data-dpdf[\s\S]*?<\/div>/);
  m.buttons.get('[data-dem]').onclick();assert.equal(m.copias[0],'Ementa X');
  m.buttons.get('[data-dcnj]').onclick();assert.equal(m.copias[1],m.y.n);
});
test('Collegium: proveniência separada, assinatura e excerto sem afirmar inteiro teor',()=>{
  const m=montar(true);
  assert.match(m.html(),/Assinatura: /);assert.match(m.html(),/DJEN: /);
  assert.match(m.sec('julgado'),/Abertura da decisão/);assert.match(m.sec('julgado'),/Abertura e dispositivo/);
  assert.match(m.sec('rastreabilidade'),/Proveniência DJEN X/);
  assert.doesNotMatch(m.sec('julgado'),/Inteiro teor/);
  assert.match(m.sec('julgado'),/Abertura e dispositivo[\s\S]*<footer class="pp-footer">[\s\S]*Proveniência DJEN X/);
  assert.match(m.html(),/Copiar abertura/);assert.match(m.html(),/Copiar excerto/);
  assert.match(m.html(),/<small>Documento<\/small><b>Excerto DJEN<\/b>/);
  assert.match(m.html(),/pp-excerto/);
});
