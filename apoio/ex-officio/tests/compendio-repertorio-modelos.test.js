'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const s=fs.readFileSync(path.resolve(__dirname,'../../..','apoio/modus-operandi/fonte/ementario.js'),'utf8');
test('nexus de modelos identifica referências explícitas e rejeita tema ambíguo',()=>{
 const db={"Temas":[{"Código":"T1","Tema":"123","Tribunal":"STF"},{"Código":"T2","Tema":"123","Tribunal":"STJ"}],"Súmulas":[],"Jurisprudência":[{"Código":"J1","Classe":"REsp","Número":"123456","Tribunal":"STJ"}],"Normas":[{"Código":"N1","Diploma":"CPC","Dispositivo":"85"}],"Regimento":[]},B={"mod":[{"id":"m1","nomeModelo":"Modelo","fundamentacao":"Tema 123/STF, art. 85 do CPC e REsp 123456."},{"id":"m2","fundamentacao":"Tema 123","processosAssociados":"0000001-01.2026.4.03.6000"}]};
 const code=s.slice(s.indexOf('var REP_MODELOS='),s.indexOf('function repNexusHtml('));
 const re=s.match(/var RE_REF=(\/.*?\/gi);/)[1];
 const run=new Function('nz','mSecoes','mTipo','dn','achaNorma','RE_REF',code+';return repModeloIndex')(x=>String(x||'').toLowerCase(),()=>[],()=> 'Acórdão',String,(a,d)=>a==='85'&&d==='CPC'?db.Normas[0]:null,new Function('return '+re)());
 const i=run(B,db);assert.equal(i.porModelo.get('m1').length,3);assert.equal(i.porModelo.get('m2').length,0);assert.equal(i.porRef.get('juris|J1')[0].id,'m1');
});
