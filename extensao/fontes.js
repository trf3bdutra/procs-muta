/* Muta · materiais do gabinete para comparar e conferir (publicados pelo workflow em /extensao/dados/base.json.gz):
   modelos do banco, minutas-matriz, matriz modular e acórdãos-modelo do 28,86%, parágrafos-padrão e regras de redação
   (Compendium e Manual CMT). Gerado por scripts/extensao/dados.py; baixado uma vez por abertura do painel. */
(function () {
'use strict';
var P = null, D = null;
function base(forcar) {
  if (D && !forcar) return Promise.resolve(D);
  if (P && !forcar) return P;
  P = Muta.baixarTexto(Muta.SITE + '/extensao/dados/base.json.gz').then(JSON.parse).then(function (d) {
    if (!d || d.schema !== 'muta.extensao.dados') throw new Error('pacote de dados em formato desconhecido');
    D = d; return d;
  }).catch(function (e) { P = null; throw e; });
  return P;
}
/* texto de uma fonte em parágrafos, com os títulos das seções: [{h}|{p}] */
function blocos(secoes, filtro) {
  var A = [];
  (secoes || []).forEach(function (s) {
    if (filtro && !filtro(s)) return;
    var ps = (s.ps || []).filter(function (p) { return String(p || '').trim(); });
    if (!ps.length) return;
    A.push({ h: s.t }); ps.forEach(function (p) { A.push({ p: p }); });
  });
  return A;
}
function porLinhas(t) { return String(t || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
/* acórdão-modelo em texto corrido: separa RELATÓRIO / VOTO / EMENTA / ACÓRDÃO */
function secoesDeTexto(t) {
  var out = [], cur = { t: 'Texto', ps: [] };
  porLinhas(t).forEach(function (l) {
    var m = /^(RELAT[ÓO]RIO|VOTO|E\s*M\s*E\s*N\s*T\s*A|AC[ÓO]RD[ÃA]O)\.?$/i.exec(l);
    if (m) { if (cur.ps.length) out.push(cur); cur = { t: l.charAt(0) + l.slice(1).toLowerCase().replace(/\s+/g, ''), ps: [] }; return; }
    cur.ps.push(l);
  });
  if (cur.ps.length) out.push(cur);
  return out;
}
/* Pesquisa por escopo: sem misturar ficha e editor. */
var STOP=new Set('para pelo pela pelos pelas sobre entre contra quando sendo apenas caso parte partes artigo artigos processo recurso pedido decisao autos tema temas uniao federal inss direito direitos conforme forma razao termos prazo ainda tambem assim desde mesmo outros outras deste desta nesse nessa neste nesta quanto quais juizo autora autor apelante apelado recorrente recorrido julgado julgada provimento tribunal relator relatorio voto ementa acordao'.split(' '));
var SIGLAS=new Set('icms ipi irpj csll pis loas bpc rgps rpps dpu mpf ctn cpc clt fgts irrf'.split(' '));
function tokens(v){return Array.from(new Set(String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/[^a-z0-9]+/).filter(function(w){return (w.length>=5||SIGLAS.has(w))&&!STOP.has(w)&&!/^\d+$/.test(w);})));}
function contextoCaso(){var g=window.MutaGabinete,k=g&&g.casoPrec&&g.casoPrec();return k&&k.pronto?k:null;}
function fontesContexto(modo,questao){
 var k=contextoCaso(),e=window.MutaEditor&&window.MutaEditor.estado();if(!k)return [];
 if(modo==='editor'){var n=function(v){return String(v||'').replace(/\D/g,'');};return e&&e.texto&&e.numero&&n(e.numero)===n(k.cnj)?[{nome:'Editor atual',texto:e.texto,peso:3}]:[];}
 var qs=k.questoesEstruturadas||[],q=questao!=null&&questao!==''?qs[Number(questao)]:null;
 if(q)return [{nome:'Questão '+q.ordem,texto:[q.questao,q.alegacao,q.tese].join(' '),peso:5},{nome:'Referências da questão',texto:[q.dispositivos,q.precedentes].join(' '),peso:6}];
 return [{nome:'Assunto',texto:[k.assunto,k.subassuntos].join(' '),peso:3},{nome:'Questões jurídicas',texto:[k.questoes,k.objeto].concat(qs.map(function(x){return [x.questao,x.alegacao,x.tese].join(' ');})).join(' '),peso:5},{nome:'Referências jurídicas',texto:[k.dispositivos,k.precedentes].concat(qs.map(function(x){return [x.dispositivos,x.precedentes].join(' ');})).join(' '),peso:6},{nome:'Detalhamento e sínteses',texto:[k.especificidades,k.sintese].join(' '),peso:1},{nome:'Tese e modelo registrados',texto:[k.tese,k.modelo].join(' '),peso:4}];
}
function contexto(modo){return fontesContexto(modo).map(function(x){return x.texto;}).filter(Boolean).join(' ');}
function referencias(v){var t=String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),m,L=new Set(),re=/\b(tema|sumula)\s*(?:n[.º°o]*\s*)?(\d{1,5})\b/g;while((m=re.exec(t)))L.add(m[1]+' '+m[2]);return Array.from(L);}
function rankDetalhado(L,modo,extrair,questao){
 if(modo==='todos')return L.map(function(x){return {x:x,score:0,termos:[],fontes:[],referencias:[]};});
 var F=fontesContexto(modo,questao).map(function(x){return {nome:x.nome,peso:x.peso,ts:new Set(tokens(x.texto)),rs:new Set(referencias(x.texto))};}),weights=new Map(),refs=new Set();F.forEach(function(x){x.ts.forEach(function(t){weights.set(t,Math.max(weights.get(t)||0,x.peso));});x.rs.forEach(function(t){refs.add(t);});});
 if(!weights.size&&!refs.size)return [];
 var N=L.length,freq=new Map(),A=[];
 L.forEach(function(x,i){var tx=extrair(x),ts=tokens(tx),hit=ts.filter(function(w){return weights.has(w);}),rr=referencias(tx).filter(function(w){return refs.has(w);});if(!rr.length&&hit.length<Math.min(2,Math.max(1,weights.size)))return;
 hit.forEach(function(w){freq.set(w,(freq.get(w)||0)+1);});A.push({x:x,i:i,hit:hit,rr:rr,n:ts.length});});
 return A.map(function(a){var score=a.hit.reduce(function(n,w){return n+weights.get(w)*(1+Math.log((N+1)/(1+freq.get(w))));},0)/Math.sqrt(Math.max(1,a.n))+a.rr.length*12;
 var nomes=F.filter(function(f){return a.hit.some(function(w){return f.ts.has(w);})||a.rr.some(function(w){return f.rs.has(w);});}).map(function(f){return f.nome;});
 return {x:a.x,i:a.i,score:score,termos:a.hit.slice(0,8),fontes:nomes,referencias:a.rr};}).sort(function(a,b){return b.score-a.score||a.i-b.i;});
}
function rank(L,modo,extrair){return rankDetalhado(L,modo,extrair).map(function(a){return a.x;});}
function scopeHTML(m){return '<div class="rep-scope"><label class="sr">Universo de pesquisa</label><select data-rep-scope aria-label="Universo de pesquisa">'+[['todos','Banco inteiro'],['proc','Relacionados ao processo'],['editor','Relacionados ao editor']].map(function(x){return '<option value="'+x[0]+'"'+(m===x[0]?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select>'+(m==='editor'?'<button type="button" class="tu-b" data-rep-read title="Ler editor do PJe" aria-label="Ler editor do PJe">↻</button>':'')+(m!=='todos'&&!contexto(m)?'<small class="muted rep-context">'+(m==='editor'?'Leia o editor do processo atual.':'Preencha o caso no prontuário.')+'</small>':'')+'</div>';}
function lerEditor(){return window.MutaEditor?window.MutaEditor.ler():Promise.reject(new Error('Editor indisponível'));}

/* Repertório · pesquisa compartilhada e seleção de trabalho local à sessão/processo. */
var pesquisa={q:'',modo:'proc',all:false},selecao=new Map(),chaveSel=null;
function cnjAtual(){var g=window.MutaGabinete;return g&&g.cnj?String(g.cnj()||''):'';}
function limparContexto(){var s=window.MutaSessao&&window.MutaSessao.estado(),k=(s&&s.estado==='on'?String(s.usuario||''):'')+'|'+cnjAtual();if(k!==chaveSel){selecao.clear();chaveSel=k;}}
function estadoPesquisa(){return pesquisa;}
function atualizarPesquisa(v){Object.assign(pesquisa,v||{});return pesquisa;}
function selecionarMaterial(x){limparContexto();var k=x.tipo+':'+x.id;if(selecao.has(k))selecao.delete(k);else selecao.set(k,x);pintarBandeja();return selecao.has(k);}
function estaSelecionado(tipo,id){limparContexto();return selecao.has(tipo+':'+id);}
function pintarBandeja(){
 limparContexto();var d=document.getElementById('rep-tray');if(!d){d=document.createElement('details');d.id='rep-tray';d.className='hero-rep-tray';document.body.append(d);}
 var open=d.open;d.replaceChildren();var s=document.createElement('summary');s.textContent='Bandeja de pesquisa';var count=document.createElement('small');count.textContent=selecao.size+' registro(s)';s.append(count);d.append(s);
 var b=document.createElement('div');b.className='rep-tray-body';
 function button(t,fn){var x=document.createElement('button');x.type='button';x.className='btn line sm';x.textContent=t;x.onclick=fn;return x;}
 var status=document.createElement('small');status.setAttribute('role','status');
 selecao.forEach(function(x,k){var r=document.createElement('div');r.className='rep-tray-item';var t=document.createElement('span');t.textContent=x.tipo+' · '+x.titulo;r.append(t,button('Remover',function(){selecao.delete(k);pintarBandeja();}),botaoVinculo(x));b.append(r);});
 if(!selecao.size){var empty=document.createElement('p');empty.className='muted';empty.textContent='Marque os materiais que deseja reunir durante a pesquisa.';b.append(empty);}
 else {var bar=document.createElement('div');bar.className='rep-tray-actions';bar.append(button('Copiar seleção',function(){if(!navigator.clipboard){status.textContent='Área de transferência indisponível.';return;}navigator.clipboard.writeText(Array.from(selecao.values()).map(function(x){return x.texto;}).join('\n\n')).then(function(){status.textContent='Seleção copiada.';},function(err){status.textContent=err.message;});}),button('Limpar',function(){selecao.clear();pintarBandeja();}));b.append(bar);}
 b.append(status);d.append(b);d.open=open;
 document.querySelectorAll('[data-rep-save-key]').forEach(function(x){var on=selecao.has(x.dataset.repSaveKey);x.setAttribute('aria-pressed',String(on));x.textContent=on?'Salvo':'Salvar';});
}
/* Vínculo explícito, independente da bandeja temporária; API incremental com autoria no servidor. */
var fundSnapshot=null;
function contaPesquisa(){var s=window.MutaSessao&&window.MutaSessao.estado();return s&&s.estado==='on'?String(s.usuario||''):'';}
function vinculoApi(k,cmd){var g=window.MutaGabinete,at=contextoCaso(),u=contaPesquisa();if(!g||!at||!u||at.cnj!==k.cnj||JSON.stringify(at.questoesEstruturadas)!==JSON.stringify(k.questoesEstruturadas)||window.MUTA_WEB&&window.MUTA_WEB.leitura)return Promise.reject(Error('Contexto alterado ou acesso somente para leitura.'));
 return Promise.resolve(cmd.acao==='listar'?null:g.gravarPendente()).then(function(){var atual=contextoCaso();if(!atual||atual.cnj!==k.cnj||contaPesquisa()!==u||JSON.stringify(atual.questoesEstruturadas)!==JSON.stringify(k.questoesEstruturadas))throw Error('A questão ou a sessão mudou. Atualize o painel.');return g.api('/api/pauta?ficha=1',{method:'POST',body:JSON.stringify({cnj:k.cnj,vinculoFundamentacao:cmd})});}).then(function(r){if(!r||!r.ok||!Array.isArray(r.vinculos))throw Error('Servidor não confirmou o vínculo.');if(contaPesquisa()!==u||!contextoCaso()||contextoCaso().cnj!==k.cnj)throw Error('Processo ou sessão alterado.');fundSnapshot={cnj:k.cnj,u:u,op:g.op&&g.op(),vinculos:r.vinculos};document.dispatchEvent(new CustomEvent('muta:fund-vinculos',{detail:{cnj:k.cnj,vinculos:r.vinculos}}));return r.vinculos;});}
function conformidadeFicha(){
 var k=contextoCaso(),g=window.MutaGabinete,u=contaPesquisa();if(!k||!g||!u||!g.V)return null;
 var op=g.op&&g.op(),L=fundSnapshot&&fundSnapshot.cnj===k.cnj&&fundSnapshot.u===u&&fundSnapshot.op===op?fundSnapshot.vinculos:(op&&op.producao||{})._fundamentacaoVinculos;
 function arr(s,n){var v=g.V(s,n);return Array.isArray(v)?v:[];}
 return {cnj:k.cnj,questoes:arr('triagem','Questões jurídicas individualizadas'),recursos:arr('origem','Recursos'),resultados:arr('producao','Resultado por recurso'),dispositivo:g.V('producao','Dispositivo do pronunciamento'),vinculos:Array.isArray(L)?L:[]};
}
function botaoVinculo(x,preferido){
 var k=contextoCaso(),u=contaPesquisa();if(!k||!u||window.MUTA_WEB&&window.MUTA_WEB.leitura)return document.createDocumentFragment();
 var qs=(k.questoesEstruturadas||[]).filter(function(q){return q.identidade&&q.identidade.questao;});if(!qs.length)return document.createDocumentFragment();
 var d=document.createElement('span');d.className='rep-link-tools';var s=document.createElement('select'),o=document.createElement('option');o.value='';o.textContent='Vincular à questão…';s.append(o);s.setAttribute('aria-label','Questão jurídica do vínculo');
 qs.forEach(function(q,i){var a=document.createElement('option');a.value=String(i);a.textContent='Questão '+q.ordem+' · '+q.questao.slice(0,90);s.append(a);if(preferido&&JSON.stringify(q.identidade)===JSON.stringify(preferido))s.value=a.value;});
 var b=document.createElement('button'),msg=document.createElement('small');b.type='button';b.className='btn line sm';b.textContent='Vincular';b.disabled=!s.value;s.onchange=function(){b.disabled=!s.value;};msg.setAttribute('role','status');b.onclick=function(){if(!s.value||contaPesquisa()!==u)return;var q=qs[Number(s.value)];b.disabled=true;msg.textContent='Gravando…';vinculoApi(k,{acao:'vincular',questao:q.identidade,material:{tipo:x.tipo,id:String(x.id||''),titulo:String(x.titulo||'').slice(0,600)}}).then(function(){msg.textContent='Vínculo registrado na ficha.';},function(e){msg.textContent=e.message;}).finally(function(){b.disabled=!s.value;});};d.append(s,b,msg);return d;
}
function botaoMaterial(x){var b=document.createElement('button');b.type='button';b.className='btn line sm rep-save';b.dataset.repSaveKey=x.tipo+':'+x.id;b.textContent=estaSelecionado(x.tipo,x.id)?'Salvo':'Salvar';b.setAttribute('aria-pressed',String(estaSelecionado(x.tipo,x.id)));b.onclick=function(){selecionarMaterial(x);};return b;}
document.addEventListener('click',function(ev){
 var all=ev.target.closest('[data-rep-all]');if(all){ev.preventDefault();pesquisa.all=true;if(window.MutaAbas&&window.MutaAbas.ir)window.MutaAbas.ir('acervo');if(window.MutaEmentario)window.MutaEmentario.abrir();return;}
 var tab=ev.target.closest('[data-emd]');if(tab){pesquisa.all=false;}
},true);
function pintarTabs(){var repLabel=document.getElementById('rep-acv-label');if(repLabel)repLabel.textContent=pesquisa.all?'Todos':'Precedentes';document.querySelectorAll('.emd-modos [data-rep-all]').forEach(function(b){b.setAttribute('aria-selected',String(pesquisa.all));});var active=[['ementario','panel-acervo'],['par','panel-par'],['modelos','panel-modelos']].find(function(x){var panel=document.getElementById(x[1]);return panel&&!panel.hidden;});var all=!!(pesquisa.all&&active&&active[0]==='ementario');document.querySelectorAll('.emd-modos [data-rep-all]').forEach(function(b){b.setAttribute('aria-selected',String(all));});document.querySelectorAll('.emd-modos [data-emd]').forEach(function(b){b.setAttribute('aria-selected',String(!!active&&!all&&b.dataset.emd===active[0]));});pintarBandeja();}

window.MutaFontes = { conformidadeFicha:conformidadeFicha,vinculoApi:vinculoApi,botaoVinculo:botaoVinculo,contextoCaso:contextoCaso,rankDetalhado:rankDetalhado, estadoPesquisa:estadoPesquisa, atualizarPesquisa:atualizarPesquisa, pintarTabs:pintarTabs, botaoMaterial:botaoMaterial, rank:rank, contexto:contexto, scopeHTML:scopeHTML, lerEditor:lerEditor, base: base, blocos: blocos, porLinhas: porLinhas, secoesDeTexto: secoesDeTexto, pronto: function () { return D; } };
})();
