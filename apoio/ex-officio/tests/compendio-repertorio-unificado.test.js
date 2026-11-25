'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),src=fs.readFileSync(path.join(root,'apoio/modus-operandi/fonte/ementario.js'),'utf8'),nav=fs.readFileSync(path.join(root,'apoio/modus-operandi/fonte/editorial_d.js'),'utf8');
test('repertório único preserva os motores, com índice inverso dos usos cadastrados',()=>{
 const db={'Temas':[{'Código':'T1','Tema':'1','Tribunal':'STF'}],'Súmulas':[{'Código':'S1','Número':'1','Tribunal':'STJ'}],'Jurisprudência':[{'Código':'J1','Classe':'RE','Número':'2','Tribunal':'STF'}],'Normas':[{'Código':'N1','Diploma':'CPC','Dispositivo':'85'}],'Regimento':[]};
 const cnj='0000001-01.2026.4.03.6000',digits=cnj.replace(/\D/g,'');
 const usos={T1:[{'Processo':cnj},{'Processo':digits}],J1:[{'Processo':digits}],N1:[{'Processo':'0000002-01.2026.4.03.6000'}]};
 const body=src.slice(src.indexOf('var REP_LINK_CACHE='),src.indexOf('function repAbrirUnificado('));
 const run=new Function('window','rpDB','fmtNum','precLab','nz','esc',body+';return {repCatalogo,repLinksDoProcesso,repBuscaTransversal};')({VDM_usos:()=>usos,CMT_ACESSO:()=>({avancado:true})},()=>db,String,r=>r.Classe+' '+r.Número,s=>String(s).toLowerCase(),String);
 assert.equal(run.repCatalogo().porProc.get(digits).size,2);
 const h=run.repLinksDoProcesso(cnj);assert.match(h,/data-rep-link="T1"/);assert.match(h,/data-rep-link="J1"/);assert.doesNotMatch(h,/data-rep-link="N1"/);
 assert.match(run.repBuscaTransversal('CPC 85'),/data-rep-result="N1"/);
 assert.match(src,/h\+=repLinksDoProcesso\(x.n\|\|x.proc\)/);assert.match(nav,/return r==='temas'\?'rep'/);
});
