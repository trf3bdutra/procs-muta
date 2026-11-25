/* Regras consultivas, sem alterar conclusões ou a extração. */
(function(root){
'use strict';
var CATS=['Principal','Relatável','Comprobatório','Fundamentável','Admissibilidade','Precedente','Consectários','Incidental','Complementar','Dispensável'];
function n(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function suggest(d){var t=n(d.tipo+' '+(d.desc||'')),a=[];
if(!d.anexo&&/sentenca|acordao|decisao|apelacao|agravo|embargos|contrarrazo|peticao inicial|parecer/.test(t))a.push('Principal','Relatável');
if(/procuracao|substabelec|custas|preparo|intimacao|publicacao|certidao/.test(t))a.push('Admissibilidade');
if(/comprovante|laudo|pericia|perfil profissiografico|contrato|extrato|atestado|documento medico/.test(t))a.push('Comprobatório','Fundamentável');
if(/honorario|custas|gratuidade|calculo|sucumbencia|sentenca|acordao/.test(t))a.push('Consectários');
if(/jurisprudencia|precedente|tema repetitivo/.test(t))a.push('Precedente','Fundamentável');
if(/tutela|liminar|incidente/.test(t))a.push('Incidental');return Array.from(new Set(a));}
function mergeRows(old,patch){var m=new Map();(Array.isArray(old)?old:[]).concat(Array.isArray(patch)?patch:[]).forEach(function(r){if(r&&/^\d{1,30}$/.test(String(r.id||'')))m.set(String(r.id),Object.assign({},r,{id:String(r.id)}));});return Array.from(m.values());}
function outcome(v){var s=n(v);if(!s||s==='a definir')return 'indefinido';
if(/anul|cassad/.test(s))return 'anulacao';if(/prejudic|perda do objeto/.test(s))return 'prejudicado';
if(/parcial/.test(s)&&/prov|conhec/.test(s))return 'parcial';
if(/nao conhec|nao se conhece|inadmiss/.test(s)&&!/parcial/.test(s))return 'nao_conhecido';
if(/desprov|negad[oa] provimento|nego provimento|negar provimento|improvido/.test(s)&&!/parcial/.test(s))return 'desprovimento';
if(/^(dado provimento|dou provimento|provimento( integral)?|provido|integralmente provido|dar provimento|deu provimento)$/.test(s))return 'provimento';return 'outro';}
function indicador(o){o=o||{};var r=outcome(o.resultado),rows=Array.isArray(o.sucumbencia)?o.sucumbencia:[],t=n(o.tipo),s=[];
if(/mandado de seguranca/.test(t))return {itens:['Mandado de segurança: não cabe condenação em honorários advocatícios (artigo 25 da Lei 12.016/2009); conferir custas e gratuidade.']};
if(/remessa necessaria/.test(t)&&!/apelacao|agravo|embargos/.test(t))return {itens:['Remessa necessária isolada: não tratar como recurso para majoração. Conferir limites do reexame e sucumbência.']};
if(o.multiplos&&!o.individual)return {itens:['Há múltiplos recursos. Registre o resultado de cada recurso antes de avaliar honorários recursais.']};
if(r==='indefinido')return {itens:['Defina o resultado do julgamento.']};
if(r==='provimento'||r==='parcial')s.push('Tema 1.059/STJ: não majorar pelo artigo 85, § 11, em recurso provido, ainda que parcialmente. Examinar redimensionamento da sucumbência.');
else if(r==='desprovimento'||r==='nao_conhecido'){
if(rows.length&&rows.every(function(x){return n(x.honorarios)==='nao'||n(x.honorarios)==='nao se aplica';}))s.push('Não há honorários previamente fixados nos capítulos registrados: não majorar verba inexistente. Conferir a decisão.');
else if(rows.some(function(x){return n(x.honorarios)==='sim';}))s.push('Examinar majoração recursal: conferir verba prévia contra o recorrente, regime temporal, espécie recursal e limites legais.');
else s.push('Honorários prévios não confirmados. Conferir a decisão recorrida antes de avaliar majoração.');}
else if(r==='anulacao')s.push('Examinar se os capítulos de sucumbência subsistem à anulação.');
else if(r==='prejudicado')s.push('Examinar causalidade, momento da perda do objeto e sucumbência; não presumir majoração.');
else s.push('Resultado não enquadrado automaticamente. Conferir a natureza do pronunciamento.');
if(!rows.length)s.push('Detalhe custas, gratuidade e honorários da decisão recorrida em Autos.');
else {if(rows.some(function(x){return !x.custas||!x.gratuidade||!x.honorarios;}))s.push('Há capítulos com custas, gratuidade ou honorários não informados.');
if(rows.some(function(x){return n(x.gratuidade)==='deferida'||n(x.suspensao)==='sim';}))s.push('Conferir suspensão da exigibilidade e eventual alteração da gratuidade.');
if(rows.some(function(x){return n(x.honorarios)==='sim'&&(!x.devedor||!x.base||(!x.percentual&&!x.valor));}))s.push('Completar parte devedora, base de cálculo e percentual/valor dos honorários prévios.');}
return {itens:s};}
var api={categorias:CATS,sugerir:suggest,mesclar:mergeRows,resultado:outcome,indicador:indicador};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MutaAnaliseProntuario=api;
})(typeof window!=='undefined'?window:this);