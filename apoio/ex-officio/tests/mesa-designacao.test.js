'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Mesa de designação: página válida, publicada e ligada ao Caput',()=>{
  const pag=read('monitor/designacao/index.html');
  assert.ok(pag.includes('<script id="dados" type="application/json">{}</script>'),'cópia do repositório sem dados embutidos');
  [...pag.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>new vm.Script(m[1],{filename:'mesa-'+i+'.js'}));
  assert.ok(pag.includes('aplicarDesignacao(D.sessao.id,lista)'),'aplica pelo motor');
  assert.ok(pag.includes("MOD='competencia'"),'modo padrão por regras e competência');
  assert.match(pag,/competencia:\{pen:0\.6/,'carga só desempata no modo padrão');
  assert.ok(read('.github/workflows/vercel-monitor.yml').includes('cp monitor/designacao/index.html site/public/caput/designacao/index.html'));
  const caput=read('monitor/triagem/index.html');
  for(const x of ['data-cwe="des-mesa"',"'/caput/designacao/?embed=1&s='",'class="cwe-mesa-slot"','function mesaSync()',"cmt:mesa-tela","cmt:mesa-fechar","trocar: true","unassigned: it.filter"])assert.ok(caput.includes(x),x);
  assert.ok(!caput.includes('<span class="v">${e(atual)}</span>'),'minutante e corretor sempre editáveis');
});
test('Motor: troca na designação e período efetivo com marcos invertidos',()=>{
  const m=read('monitor/motor/assets/js/21-sessoes-equipe.js');
  assert.ok(m.includes('o.trocar && it.servidor !== o.d')&&m.includes('o.trocar && it.corretor !== o.c'));
  assert.ok(m.includes('invertido')&&m.includes('efetivo: periodo(ss)'));
});
test('Equipe: CM não corrige; minuta por exceção só na escolha manual',()=>{
  const R=JSON.parse(read('apoio/equipe.json')).registros,by=n=>R.find(m=>m.nome===n);
  assert.equal(by('CM').correcao,false);
  for(const n of ['Alexander','Vanilda','Saffioti','Giovana']){assert.equal(by(n).minuta,false,n);assert.equal(by(n).minutaEventual,true,n);}
  const m=read('monitor/motor/assets/js/21-sessoes-equipe.js');
  assert.ok(m.includes('eventuais: S.equipe.filter(function (m) { return m.minutaEventual && !faz(m, \'d\'); })'));
  assert.ok(m.includes("'minutaEventual'].indexOf(campo)"));
  assert.ok(read('monitor/triagem/index.html').includes('Minutam só por exceção'));
  const pag=read('monitor/designacao/index.html');
  assert.ok(pag.includes('optsEx(k,v)')&&pag.includes('var EV=EQ.filter'));
});
test('Mesa: agrupar por motivo do minutante e do corretor',()=>{
  const pag=read('monitor/designacao/index.html');
  for(const x of ['data-ag="bloco"','data-ag="md"','data-ag="mc"','function motivo(x,k)','return grupo(x)===b'])assert.ok(pag.includes(x),x);
  for(const m of ['Escolha manual','Continuidade','Regra do gabinete','Especialidade ou preferência','Experiência no assunto','Mesmo lote ou assunto','Já designado na pauta','Distribuição pela carga'])assert.ok(pag.includes(m),m);
});
test('Mesa dentro da etapa B: modo embutido e tela cheia',()=>{
  const pag=read('monitor/designacao/index.html');
  assert.ok(pag.includes("get('embed')==='1'")&&pag.includes("EMBED?'cmt:mesa-tela':'cmt:mesa-fechar'"));
  const caput=read('monitor/triagem/index.html');
  assert.ok(caput.includes('requestAnimationFrame(mesaSync)'),'reposiciona a mesa a cada render');
  assert.ok(caput.includes("h.id = 'cwe-mesa-host'")&&caput.includes('document.body.appendChild(h)'),'moldura fora do HTML refeito pelo render');
});
test('Mesa: designação inicial e seleção em lote',()=>{
  const pag=read('monitor/designacao/index.html');
  assert.ok(!pag.includes('Mexer pouco')&&!pag.includes('trocas de minutante'),'sem vocabulário de troca');
  assert.ok(pag.includes("var g=k==='d'?x.d:x.c;if(g)return g;"),'o gravado fica; a proposta preenche o resto');
  assert.ok(!pag.includes("why.push(['','designação atual'])"),'gravado não pesa na proposta');
  for(const x of ['data-a="proposta"','Refazer tudo pela proposta','data-ck="','data-ckg="','data-lote="d"','data-lote="c"','sel-proposta','sel-limpar'])assert.ok(pag.includes(x),x);
});
test('Pautas: cabeçalho compacto ao lado do painel e etapa 2 pela numeração do PDF',()=>{
  const c=read('monitor/triagem/index.html');
  assert.ok(c.includes('<div class="cwe-main"><div class="cwe-cab">${cabecalho(ss, d)}${marcos(ss)}${cabAbas(ss, d)}</div>'),'cabeçalho na coluna principal');
  assert.ok(c.includes('class="cwe-sesnova" data-cwt="create-session"'),'+ Nova sessão no painel lateral');
  assert.ok(c.includes("'Numeração conferida'")&&!c.includes("'Conferência com a seleção prévia'"),'etapa 2 confere a numeração, não a seleção prévia');
  for(const x of ["'número repetido'","'processo repetido'","'sem número do item'","'era o item '",'Confirmar a numeração'])assert.ok(c.includes(x),x);
  assert.ok(read('monitor/motor/assets/js/21-sessoes-equipe.js').includes('r.itemAnterior = String(o.item)'),'reimportação guarda o número anterior');
});
test('Pautas: painel da sessão integrado ao cabeçalho e julgadores com substituições',()=>{
  const c=read('monitor/triagem/index.html');
  assert.ok(c.includes("const corpo = [null, etapa1, etapa2, etapa3, etapa4][d.cur](ss, d);"),'esteira com 4 etapas');
  assert.ok(!c.includes("['Painel da sessão', 'todas as estatísticas']"),'painel não é etapa');
  for(const x of ['function cabAbas(ss, d)','data-cwe="painel"','data-cwe="j-ed"','function julgEditor(ss, d)','function sugestoesJ(ss, d)','data-cwe="j-sub-add"','data-cwe="j-novo-ok"',"'apoio/magistrados.json'"])assert.ok(c.includes(x),x);
  const m=read('monitor/motor/assets/js/21-sessoes-equipe.js');
  for(const x of ['definirJulgadores: function','julgadoresDoItem: function','if (ss.julgadores) o.julgadores = ss.julgadores;','docs[i] && docs[i].julgadores'])assert.ok(m.includes(x),x);
});
