'use strict';
/* Prévia do painel da extensão Muta (/extensao/previa/): o painel de verdade, montado por scripts/extensao/previa.py. */
const { test } = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os'), { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');

test('prévia do painel: mesmos arquivos da extensão, shim antes dos scripts e o site da própria página', () => {
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'muta-previa-'));
  execFileSync('python3', [path.join(ROOT, 'scripts/extensao/previa.py'), '--saida', saida]);
  const pn = path.join(saida, 'painel'), html = fs.readFileSync(path.join(pn, 'painel.html'), 'utf8');
  const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.equal(srcs[0], 'shim-previa.js', 'o shim vem antes de todos os scripts do painel');
  srcs.forEach(s => assert.ok(fs.existsSync(path.join(pn, s)), 'falta ' + s));
  assert.ok(html.indexOf('Muta.SITE = location.origin') > html.indexOf('<script src="comum.js">'), 'troca o site depois do comum.js');
  assert.ok(html.indexOf('Muta.SITE = location.origin') < html.indexOf('<script src="sessao.js">'), 'e antes de quem lê o site');
  for (const f of fs.readdirSync(path.join(ROOT, 'extensao'))) if (/\.(js|css|json)$/.test(f)) assert.ok(fs.existsSync(path.join(pn, f)), 'copia ' + f);
  assert.ok(fs.existsSync(path.join(saida, 'index.html')));
  const idx = fs.readFileSync(path.join(saida, 'index.html'), 'utf8');
  [...idx.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(m => new Function(m[1]));
  new Function(fs.readFileSync(path.join(pn, 'shim-previa.js'), 'utf8'));
});

test('prévia do painel: por padrão nada é gravado (o shim bloqueia POST, PUT e DELETE, fora o login, Diligências e Deliberações)', () => {
  const shim = fs.readFileSync(path.join(ROOT, 'scripts/extensao/previa/shim.js'), 'utf8');
  /* 0.48.1: Diligências e Deliberações (/api/pendencias e /api/painel?cmt=1) gravam sempre; o resto continua bloqueado */
  assert.match(shim, /m !== 'GET' && m !== 'HEAD' && !grava && !vivo && !\/\\\/api\\\/login/);
  assert.match(shim, /status: 423/);
});


test('prévia universal mantém todas as abas e ambos os roteiros originais', () => {
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'muta-universal-'));
  try {
    execFileSync('python3', [path.join(ROOT, 'scripts/extensao/previa.py'), '--saida', saida]);
    const pn = path.join(saida, 'painel');
    const html = fs.readFileSync(path.join(pn, 'universal.html'), 'utf8');
    const old = fs.readFileSync(path.join(pn, 'painel.html'), 'utf8');
    const scripts = s => [...s.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(scripts(html),scripts(old).map(s=>s==='gabinete.js'?'gabinete-universal.js':s==='roteiro.js'?'roteiro-universal.js':s).concat('universal-ajustes.js'));
    assert.match(html, /src="roteiro-universal.js"/);
    assert.match(html, /src="gerador.js"/);
    assert.match(html, /src="ementario.js"/);
    const js=fs.readFileSync(path.join(pn, 'gabinete-universal.js'), 'utf8');
    assert.match(js,/function camposCaso\(/);
    assert.match(js,/Roteiro de produção/);
    assert.match(js,/fragment\(rt\(\)\)/);
    new Function(js);
    const idx=fs.readFileSync(path.join(saida,'index.html'),'utf8');
    assert.match(idx,/id="pn"[^>]+src="painel\/universal.html"/);
    assert.match(fs.readFileSync(path.join(pn,'shim-previa.js'),'utf8'),/if \(universal && m !== 'GET'/);
  } finally { fs.rmSync(saida,{recursive:true,force:true}); }
});

test('navegador universal: utilidades, ferramentas do gabinete, processo em tela', () => {
  const saida=fs.mkdtempSync(path.join(os.tmpdir(),'muta-nav-'));
  try {
    execFileSync('python3',[path.join(ROOT,'scripts/extensao/previa.py'),'--saida',saida]);
    const html=fs.readFileSync(path.join(saida,'painel','universal.html'),'utf8');
    const old=fs.readFileSync(path.join(saida,'painel','painel.html'),'utf8');
    const ids=s=>[...s.matchAll(/id="tab-([^"]+)"/g)].map(m=>m[1]).sort();
    assert.deepEqual(ids(html),ids(old));
    assert.ok(html.indexOf('id="topo-u"')<html.indexOf('id="pv-nav-main"'));
    assert.ok(html.indexOf('id="pv-ajustes"')<html.indexOf('id="pv-nav-main"'));
    assert.doesNotMatch(html,/id="pv-nav-(tools|case)"/);
    assert.doesNotMatch(old,/id="pv-ajustes"/);
    assert.ok(fs.existsSync(path.join(saida,'painel','universal-ajustes.js')));
    new Function(fs.readFileSync(path.join(saida,'painel','universal-ajustes.js'),'utf8'));
    assert.ok(html.indexOf('id="tab-acervo"')<html.indexOf('id="tab-pront"'));
    assert.ok(html.indexOf('id="tab-del"')<html.indexOf('id="tab-pront"'));
    assert.match(html,/<b>Minutário /);
    assert.match(old,/<b>Minuta /);
  } finally {fs.rmSync(saida,{recursive:true,force:true});}
});

test('sínteses: chaves distintas, padrão de assunto detalhado e gravação explícita', () => {
  const src=fs.readFileSync(path.join(ROOT,'scripts/extensao/previa/universal-layout.js'),'utf8');
  assert.match(src,/sintKeys=\{sp:'Síntese Processual',sf:'Síntese Fática'\}/);
  assert.match(src,/sintese\('sp','Síntese processual'/);
  assert.match(src,/sintese\('sf','Síntese fática'/);
  assert.match(src,/plus\.className='pm-ad-add'/);
  assert.match(src,/b\.className='pm-ad-i'/);
  assert.match(src,/marcar\('triagem\.'\+sintKeys\[id\]/);
  assert.doesNotMatch(src,/field\('triagem','Síntese Fática'/);
  assert.match(src,/sintEdit='';sintDraft='';render\(\)/);
  new Function(src);
});

test('referências documentais preservam decisões de triagem e centralizam edição em Autos', () => {
  const saida=fs.mkdtempSync(path.join(os.tmpdir(),'muta-docref-'));
  try {
    execFileSync('python3',[path.join(ROOT,'scripts/extensao/previa.py'),'--saida',saida]);
    const pn=path.join(saida,'painel'),rt=fs.readFileSync(path.join(pn,'roteiro-universal.js'),'utf8'),gb=fs.readFileSync(path.join(pn,'gabinete-universal.js'),'utf8');
    new Function(rt);new Function(gb);
    assert.match(rt,/X\.docOwned\(alvo\)/);
    assert.match(rt,/X\.docRef\(p\.id\)/);
    assert.match(gb,/triagemOwn=\{'triagem.MPF':1,'triagem.MPF - Custos Legis':1\}/);
    assert.match(gb,/ID do Parecer MPF/);
    assert.match(gb,/Parecer - Sentido/);
    assert.match(gb,/data-pv-doc-id/);
    assert.match(gb,/sig\.docBloqueado/);
    assert.match(gb,/Base documental do caso/);
    assert.equal(fs.readFileSync(path.join(pn,'roteiro.js'),'utf8'),fs.readFileSync(path.join(ROOT,'extensao','roteiro.js'),'utf8'));
  } finally {fs.rmSync(saida,{recursive:true,force:true});}
});

test('prévia: Autos primeiro e identificação editável única, separada do resumo operacional',()=>{
 const s=fs.readFileSync(path.join(ROOT,'scripts/extensao/previa/universal-layout.js'),'utf8');
 assert.match(s,/MODOS=\['Autos','Processo'\]/);
 assert.match(s,/G\.aba='Autos';G\.rot='tri'/);
 assert.match(s,/d\.open=identOpen/);
 assert.match(s,/corpoAutos=function\(\)\{return html\(identity\(\)\)\+autosBase\(\)/);
 assert.match(s,/extraField\('ramo','Ramo do direito'\)/);
 assert.match(s,/extraField\('outros','Outros assuntos'\)/);
 assert.match(s,/Conclusão \/ resultado/);
 assert.match(s,/data-pv-ident/);
 assert.doesNotMatch(s,/var syn=elem\('div','pv-top-summary'\)/);
 new Function(s);
});

test('tipo de ato e destino na faixa superior; etiquetas apenas na autuação',()=>{
 const s=fs.readFileSync(path.join(ROOT,'scripts/extensao/previa/universal-layout.js'),'utf8');
 assert.match(s,/pv-ato-destino/);
 assert.match(s,/faixa=p\.querySelector\('\.pv-people'\)/);
 assert.match(s,/faixa\.prepend\(next,dest\)/);
 assert.doesNotMatch(s,/cnj\.after\(faixa\)/);
 assert.match(s,/function etiquetasAutuacao\(ctx\)/);
 assert.match(s,/etiquetas:''/);
 assert.match(s,/m\.t='Mídias'/);
 assert.doesNotMatch(s,/sec\.append\(ato\)/);
 new Function(s);
});

test('universal: tipo de julgamento na tag, matéria em Autos, situação e notas na sequência das etapas',()=>{
 const s=fs.readFileSync(path.join(ROOT,'scripts/extensao/previa/universal-layout.js'),'utf8');
 const g=fs.readFileSync(path.join(ROOT,'extensao/gabinete.js'),'utf8');
 assert.match(s,/cl\.textContent=label/);
 assert.match(s,/p\.querySelectorAll\('\.pm-as,\.pm-ad,\.pm-esp'\)/);
 assert.match(s,/flowBox\.append\(enc\)/);
 assert.match(g,/esp=caixa\.querySelector\('\.pv-flowbox'\)\|\|caixa\.querySelector\('\.pm-esp'\)/);
 assert.match(g,/esp\.after\(nt\)/);
 assert.match(s,/sec\.append\(elem\('h4','pm-mer-h','Matéria'\)/);
 new Function(s);new Function(g);
});

test('universal: questões apenas em produção e campos operacionais com proprietário fixo',()=>{
 const s=fs.readFileSync(path.join(ROOT,'scripts/extensao/previa/universal-layout.js'),'utf8');
 const start=s.indexOf('var operationalFields='),end=s.indexOf('var prodBase=camposCaso;',start);
 const get=new Function('grupoModelo',s.slice(start,end)+';return productionExclusions;')(()=>null);
 const x=get({});
 for(const k of ['triagem.Avisos','triagem.O que falta sanar','triagem.Intercorrências','producao.Destino - Situação','producao.Destino','origem.Observações','origem.Próxima ação','origem.Responsável','producao.MINUTADO','producao.Data da Revisão','producao.Data da Liberação','producao.Data da Assinatura','triagem.Destino - Confirmado em'])assert.equal(x[k],1,k);
 assert.equal(x['producao.Rev - Mérito'],undefined);
 assert.equal(x['producao.Tese jurídica adotada'],undefined);
 assert.equal(x['producao.Voto - Honorários'],undefined);
 assert.match(s,/add\(gr,questoes\(\)\)/);
 assert.match(s,/d\.after\(q\)/);
 assert.match(s,/return original\(g,c,null,Object\.assign/);
 assert.doesNotMatch(s,/ctx\.insertBefore\(q,/);
 assert.match(s,/field\('origem','Próxima ação','Próxima ação'\)/);
 new Function(s);
});

test('universal: mérito integra o plano da produção, sem seta no cartão',()=>{
 const s=fs.readFileSync(path.join(ROOT,'scripts/extensao/previa/universal-layout.js'),'utf8');
 assert.match(s,/merEnc=function\(\)\{return '';\}/);
 assert.match(s,/Plano do pronunciamento\$/);
 assert.match(s,/campoRot\('triagem','COMPLEXIDADE','Complexidade'\)/);
 assert.match(s,/campoRot\('triagem','Tipo de Voto','Tipo de voto'\)/);
 assert.match(s,/meritProduction\(root,q\)/);
 assert.match(s,/target\.prepend\(box\)/);
 assert.match(s,/autoGab\(\);situacaoSync\(\)/);
 assert.match(s,/data-autog','desfazer'/);
 new Function(s);
});


function testarSimulador(src){
  const script=[...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1], nodes={}, posts=[], calls=[];
  const node=(id,dataset={})=>({id,dataset,value:'',hidden:false,disabled:false,style:{},attrs:{},innerHTML:'',textContent:'',getAttribute(k){return this.attrs[k]||''},setAttribute(k,v){this.attrs[k]=String(v)},addEventListener(){},setCustomValidity(v){this.invalid=v},reportValidity(){},getBoundingClientRect(){return {left:0}}});
  const groups={'#pv-layout button':[node('universal',{layout:'universal'}),node('atual',{layout:'atual'})],'#telas button':[node('lista',{tela:'lista'}),node('autos',{tela:'autos'}),node('editor',{tela:'editor'})],'#larg button':[node('360',{w:'360'}),node('420',{w:'420'}),node('520',{w:'520'})],'.tf':[]};
  const get=s=>nodes[s]||(nodes[s]=node(s));
  const pn=get('#pn');pn.attrs.src='painel/universal.html';pn.contentWindow={postMessage(m){posts.push(m)}};Object.defineProperty(pn,'src',{get(){return this.attrs.src},set(v){this.attrs.src=v}});
  const document={querySelector(s){return groups[s]?groups[s][0]||null:get(s)},querySelectorAll(s){return groups[s]||[]},documentElement:{style:{setProperty(){}},getAttribute(){return 'light'},setAttribute(){}}};
  const window={addEventListener(){}},fetch=async u=>{calls.push(u);return {ok:true,json:async()=>u.includes('manifest')?{version:'0.70.0'}:u.includes('lote=1')?{sessoes:[{date:'2026-12-07',processos:1}]}:u.includes('fichas=')?{resumos:{}}:{itens:[{cnj:'5000000-00.2026.4.03.6000',item:1,classe:'APELAÇÃO CÍVEL'}]}}};
  const api=new Function('document','window','fetch','localStorage',script.replace(/\niniciar\(\);\s*$/,'')+';return {S,iniciar,confirmarCnj};')(document,window,fetch,{setItem(){}});
  return {api,groups,get,pn,posts,calls};
}

test('simulador inicializa e controles do painel esquerdo enviam estado ao HERO',async()=>{
 const src=fs.readFileSync(path.join(ROOT,'scripts/extensao/previa/index.html'),'utf8'),h=testarSimulador(src);
 await h.api.iniciar();
 assert.equal(h.api.S.cnj,'5000000-00.2026.4.03.6000');
 h.groups['#pv-layout button'][1].onclick();assert.equal(h.pn.src,'painel/painel.html');
 h.groups['#telas button'][1].onclick();assert.ok(h.posts.some(m=>m.tipo==='previa-aba'&&m.reg.ctx==='autos'));
 h.groups['#larg button'][2].onclick();assert.equal(h.get('#side').style.width,'520px');
 h.get('#fonte').onchange({target:{value:'colar'}});assert.equal(h.get('#colar-w').hidden,false);
 h.get('#cnj').value='50000000020264036001';h.api.confirmarCnj();assert.equal(h.api.S.cnj,'5000000-00.2026.4.03.6001');
 assert.equal(typeof h.get('#recarregar-sessoes').onclick,'function');
});

test('universal: encaminhamento editável na triagem e espelhado no cartão',()=>{
 const s=fs.readFileSync(path.join(ROOT,'scripts/extensao/previa/universal-layout.js'),'utf8');
 assert.match(s,/function encaminhamentoTriagem\(\)/);
 assert.match(s,/fragment\(atoSel\(\)\)/);
 assert.match(s,/campoRot\('triagem','Seleção Prévia','Seleção prévia'\)/);
 assert.match(s,/f\.append\(encaminhamentoTriagem\(\)\)/);
 assert.match(s,/faixa\.prepend\(next,dest\);ato\.remove\(\)/);
 assert.match(s,/readRow\('Seleção prévia',V\('triagem','Seleção Prévia'\)\)/);
 assert.match(s,/data-pv-enc/);
 const a=s.indexOf('var operationalFields='),z=s.indexOf('var prodBase=camposCaso;',a);
 assert.match(s.slice(a,z),/'triagem.Seleção Prévia'/);
 new Function(s);
});


function testarAjustes(src){
 const nodes={},prefs={tema:'escuro',auto:true};
 function el(id){return nodes[id]||(nodes[id]={id,checked:false,value:'',disabled:false,open:false,events:{},setAttribute(){},addEventListener(k,f){this.events[k]=f},click(){this.checked=!this.checked;if(this.events.click)this.events.click();if(this.events.change)this.events.change()},focus(){this.focused=true},showModal(){this.open=true},close(){this.open=false;if(this.events.close)this.events.close()}});}
 const doc={getElementById:el,createElement(){return el('pv-ajustes-dialog')},body:{appendChild(){},classList:{add(){}}},documentElement:{dataset:{}},querySelectorAll(){return []},addEventListener(){}};
 el('pje-seguir').checked=true;el('pje-aba').checked=true;el('pje-tema').click=()=>{prefs.tema=prefs.tema==='escuro'?'claro':'escuro'};
 new Function('document','window',src)(doc,{MutaTema:{atual:()=>prefs.tema},MutaAutos:{autoLigado:()=>prefs.auto,autoLigar:v=>{prefs.auto=v}}});
 return {el,prefs};
}

test('diálogo Ajustes controla preferências reais e conserva os controles originais',()=>{
 const src=fs.readFileSync(path.join(ROOT,'scripts/extensao/previa/universal-ajustes.js'),'utf8'),h=testarAjustes(src),e=h.el;
 e('pv-ajustes').events.click();assert.equal(e('pv-ajustes-dialog').open,true);assert.equal(e('pv-ajustes-seguir').checked,true);
 e('pv-ajustes-seguir').checked=false;e('pv-ajustes-seguir').events.change();assert.equal(e('pje-seguir').checked,false);assert.equal(e('pv-ajustes-aba').disabled,true);
 e('pv-ajustes-tema').value='claro';e('pv-ajustes-tema').events.change();assert.equal(h.prefs.tema,'claro');
 e('pv-ajustes-auto').checked=false;e('pv-ajustes-auto').events.change();assert.equal(h.prefs.auto,false);
 e('pv-ajustes-ok').events.click();assert.equal(e('pv-ajustes-dialog').open,false);assert.equal(e('pv-ajustes').focused,true);
});
