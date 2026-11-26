'use strict';
/* Cortex x Compendium: correspondência descritiva, nunca aprovação automática de modelo.
   Este módulo só examina os metadados efetivamente registrados em cada processo. */
const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const classe=s=>{
 const x=normal(s);
 if(/embargos? de declaracao|\bedcl?\b|\bed\b/.test(x))return 'embargos de declaração';
 if(/agravo de instrumento|\bai\b/.test(x))return 'agravo de instrumento';
 if(/agravo interno|\bagint\b/.test(x))return 'agravo interno';
 if(/remessa necessaria|\bremnec\b/.test(x))return 'remessa necessária';
 if(/apelacao|\bapciv\b/.test(x))return 'apelação';
 return '';
};
const resultado=s=>{
 const x=normal(s);
 if(/nao conhec|nao conhecimento/.test(x))return 'não conhecimento';
 if(/prejudicad/.test(x))return 'prejudicado';
 if(/parcial.*(prov|acolh)/.test(x))return /acolh/.test(x)?'acolhimento':'parcial provimento';
 if(/desprov|nega.*provimento|negado provimento/.test(x))return 'desprovimento';
 if(/rejei/.test(x))return 'rejeição';
 if(/acolh/.test(x))return 'acolhimento';
 if(/prov|dar provimento/.test(x))return 'provimento';
 return '';
};
const pecas=it=>(it.pecas||[]).map(p=>({nome:normal(p.peca||p.tipo||''),id:String(p.id||'').trim()}));
const evidencias={
  sujeito:it=>!!it.exequente,
  sentenca_id:it=>pecas(it).some(p=>/sentenca/.test(p.nome)&&!!p.id),
  apelacao_id:it=>pecas(it).some(p=>/apelac/.test(p.nome)&&!!p.id),
  contrarrazoes_id:it=>pecas(it).some(p=>/contrarrazoes/.test(p.nome)&&!!p.id),
  mpf_id:it=>pecas(it).some(p=>/parecer.*(mpf|procuradoria)|procuradoria regional/.test(p.nome)&&!!p.id),
  memoriais_id:it=>pecas(it).some(p=>/memoriais/.test(p.nome)&&!!p.id),
};
function cobertura(items,matriz){
 if(!matriz||!Array.isArray(matriz.variaveis))return [];
 return matriz.variaveis.map(v=>{
  const fn=evidencias[v.id],qtd=fn?items.filter(fn).length:0;
  return {id:v.id,rotulo:v.rotulo||v.id,campo:v.campo||'',
   identificados:qtd,total:items.length,
   situacao:!fn?'conferir nos autos':qtd===items.length?'referência localizada':'referência parcial',
   ressalva:fn?'Presença de referência ou ID, sem validação de seu teor.':'Não há correspondência direta suficientemente segura no cadastro do lote.'};
 });
}
function grupoAnalise(id,nome,items,struct,modular,tematica){
 const campos=['assunto','recurso','resultado','modelo'];
 const padroes=campos.map(c=>{
  const valores=items.map(x=>String(x[c]||'').trim()),validos=valores.filter(Boolean);
  const unicos=[...new Set(validos)];
  return {campo:c,preenchidos:validos.length,total:items.length,
    comum:validos.length===items.length&&unicos.length===1,
    valores:unicos.slice(0,12),distintos:unicos.length};
 });
 const variacoes=new Map();items.forEach(it=>(it.variacoes||[]).forEach(v=>variacoes.set(String(v),(variacoes.get(String(v))||0)+1)));
 const combos=new Map();for(const it of items){
  const cl=classe(it.recurso),re=resultado(it.resultado);
  if(!cl||!re)continue;
  const k=cl+'|'+re;
  if(!combos.has(k))combos.set(k,{classe:cl,resultado:re,total:0});
  combos.get(k).total++;
 }
 const estruturais=[...combos.values()].map(c=>{
  const achados=(struct.registros||[]).filter(x=>String(x.id||'').startsWith('mod-matriz-trms-')&&classe(x.classe)===c.classe&&resultado(x.resultado)===c.resultado);
  return {classe:c.classe,resultado:c.resultado,processos:c.total,
   referencias:achados.map(x=>({id:x.id,nome:x.nomeModelo||x.id,pronunciamento:x.pronunciamento||''})),
   alcance:'Matriz formal por classe e resultado; não valida tese, prova nem dispositivo do caso.'};
 });
 const grupoTematico=tematica&&(modular.grupos||[]).find(g=>String(g.id)===String(id));
 const temat=grupoTematico?{id:grupoTematico.id,nome:grupoTematico.nome,
   modulos:(grupoTematico.receita||[]).filter(r=>r.mod).map(r=>({id:r.mod,opcional:!!r.opcional})),
   modelosEmenta:grupoTematico.modelosEmenta||[],
   variaveis:cobertura(items,modular),
   limite:'Grupo nominalmente correspondente; módulos e variáveis dependem de conferência individual dos autos.'}:null;
 return {id,nome,processos:items.length,padroes,
   variacoes:[...variacoes.entries()].sort((a,b)=>b[1]-a[1]).map(([id,n])=>({id,n})),
   estruturais,tematica:temat,
   criterio:'Assunto, resultado e códigos de modelo são indicadores descritivos; a identidade da questão jurídica exige revisão.'};
}
function avaliar(lote,estruturais,modular){
 const itens=lote.itens||[],index=new Map((lote.grupos||[]).map(g=>[String(g.id),g]));
 const grupos=new Map();
 for(const it of itens){
  const id=String(it.grupo||'sem-grupo');
  if(!grupos.has(id))grupos.set(id,[]);
  grupos.get(id).push(it);
 }
 const tema28=!!modular&&(/28[.,]86/.test(lote.titulo||'')||itens.some(x=>/28[.,]86/.test(x.assunto||'')));
 return {schema:'gabcmt.collectio.correspondencias.1',lote:lote.id,total:itens.length,
  materiaCompendium:tema28?'28,86%':null,
  limites:['Análise exclusivamente dos registros disponíveis no Cortex e das matrizes do Compendium.',
   'Sem leitura automática do inteiro teor no PJe; não há validação da identidade de causa, prova ou tese.',
   'Ausência de referência não equivale à ausência da peça nos autos.',
   'A matriz estrutural é um molde formal, não um precedente de mérito.'],
  grupos:[...grupos.entries()].map(([id,registros])=>
   grupoAnalise(id,index.get(id)?.rotulo||registros[0]?.assunto||'Sem grupo',
    registros,estruturais,modular,tema28))};
}
module.exports={avaliar,classe,resultado};
