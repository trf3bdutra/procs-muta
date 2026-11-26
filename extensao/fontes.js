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
function tokens(v){return Array.from(new Set(String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/[^a-z0-9]+/).filter(function(w){return w.length>=5&&!STOP.has(w)&&!/^\d+$/.test(w);})));}
function contexto(modo){var g=window.MutaGabinete,k=g&&g.casoPrec&&g.casoPrec(),e=window.MutaEditor&&window.MutaEditor.estado(),sg=window.MutaSigilo;if(sg&&(sg.bloqueado()||sg.sigiloso()))return '';if(modo==='editor'){if(!e||!e.texto)return '';var n=function(v){return String(v||'').replace(/\D/g,'');};if(k&&k.cnj&&(!e.numero||n(e.numero)!==n(k.cnj)))return '';return e.texto;}return k?[k.assunto,k.subassuntos,k.questoes,k.sintese,k.especificidades].filter(Boolean).join(' '):'';}
function rank(L,modo,extrair){if(modo==='todos')return L.slice();var q=tokens(contexto(modo));if(!q.length)return [];var Q=new Set(q),N=L.length,freq=Object.create(null),A=[];L.forEach(function(x,i){var ts=tokens(extrair(x)),hit=ts.filter(function(w){return Q.has(w);});if(hit.length<Math.min(2,q.length))return;hit.forEach(function(w){freq[w]=(freq[w]||0)+1;});A.push({x:x,i:i,hit:hit,n:ts.length});});return A.map(function(a){a.score=a.hit.reduce(function(n,w){return n+1+Math.log((N+1)/(1+freq[w]));},0)/Math.sqrt(Math.max(1,a.n));return a;}).sort(function(a,b){return b.score-a.score||a.i-b.i;}).map(function(a){return a.x;});}
function scopeHTML(m){return '<div class="rep-scope"><label class="sr">Universo de pesquisa</label><select data-rep-scope aria-label="Universo de pesquisa">'+[['todos','Banco inteiro'],['proc','Relacionados ao processo'],['editor','Relacionados ao editor']].map(function(x){return '<option value="'+x[0]+'"'+(m===x[0]?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select>'+(m==='editor'?'<button type="button" class="tu-b" data-rep-read title="Ler editor do PJe" aria-label="Ler editor do PJe">↻</button>':'')+(m!=='todos'&&!contexto(m)?'<small class="muted rep-context">'+(m==='editor'?'Leia o editor do processo atual.':'Preencha o caso no prontuário.')+'</small>':'')+'</div>';}
function lerEditor(){return window.MutaEditor?window.MutaEditor.ler():Promise.reject(new Error('Editor indisponível'));}

/* Repertório · pesquisa compartilhada e seleção de trabalho local à sessão/processo. */
var pesquisa={q:'',modo:'proc',all:false},selecao=new Map(),chaveSel=null;
function cnjAtual(){var g=window.MutaGabinete;return g&&g.cnj?String(g.cnj()||''):'';}
function limparContexto(){var k=cnjAtual();if(k!==chaveSel){selecao.clear();chaveSel=k;}}
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
 selecao.forEach(function(x,k){var r=document.createElement('div');r.className='rep-tray-item';var t=document.createElement('span');t.textContent=x.tipo+' · '+x.titulo;r.append(t,button('Remover',function(){selecao.delete(k);pintarBandeja();}));b.append(r);});
 if(!selecao.size){var empty=document.createElement('p');empty.className='muted';empty.textContent='Marque os materiais que deseja reunir durante a pesquisa.';b.append(empty);}
 else {var bar=document.createElement('div');bar.className='rep-tray-actions';bar.append(button('Copiar seleção',function(){if(!navigator.clipboard){status.textContent='Área de transferência indisponível.';return;}navigator.clipboard.writeText(Array.from(selecao.values()).map(function(x){return x.texto;}).join('\n\n')).then(function(){status.textContent='Seleção copiada.';},function(err){status.textContent=err.message;});}),button('Limpar',function(){selecao.clear();pintarBandeja();}));b.append(bar);}
 b.append(status);d.append(b);d.open=open;
 document.querySelectorAll('[data-rep-save-key]').forEach(function(x){var on=selecao.has(x.dataset.repSaveKey);x.setAttribute('aria-pressed',String(on));x.textContent=on?'Salvo':'Salvar';});
}
function botaoMaterial(x){var b=document.createElement('button');b.type='button';b.className='btn line sm rep-save';b.dataset.repSaveKey=x.tipo+':'+x.id;b.textContent=estaSelecionado(x.tipo,x.id)?'Salvo':'Salvar';b.setAttribute('aria-pressed',String(estaSelecionado(x.tipo,x.id)));b.onclick=function(){selecionarMaterial(x);};return b;}
document.addEventListener('click',function(ev){
 var all=ev.target.closest('[data-rep-all]');if(all){ev.preventDefault();pesquisa.all=true;if(window.MutaAbas&&window.MutaAbas.ir)window.MutaAbas.ir('acervo');if(window.MutaEmentario)window.MutaEmentario.abrir();return;}
 var tab=ev.target.closest('[data-emd]');if(tab){pesquisa.all=false;}
},true);
function pintarTabs(){var repLabel=document.getElementById('rep-acv-label');if(repLabel)repLabel.textContent=pesquisa.all?'Todos':'Precedentes';document.querySelectorAll('.emd-modos [data-rep-all]').forEach(function(b){b.setAttribute('aria-selected',String(pesquisa.all));});if(pesquisa.all)document.querySelectorAll('.emd-modos [data-emd]').forEach(function(b){b.setAttribute('aria-selected','false');});pintarBandeja();}

window.MutaFontes = { estadoPesquisa:estadoPesquisa, atualizarPesquisa:atualizarPesquisa, pintarTabs:pintarTabs, botaoMaterial:botaoMaterial, rank:rank, contexto:contexto, scopeHTML:scopeHTML, lerEditor:lerEditor, base: base, blocos: blocos, porLinhas: porLinhas, secoesDeTexto: secoesDeTexto, pronto: function () { return D; } };
})();
