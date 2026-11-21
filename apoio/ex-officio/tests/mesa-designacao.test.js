'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Mesa de designação: página válida, publicada e ligada ao Caput',()=>{
  const pag=read('caput/designacao/index.html');
  assert.ok(pag.includes('<script id="dados" type="application/json">{}</script>'),'cópia do repositório sem dados embutidos');
  [...pag.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>new vm.Script(m[1],{filename:'mesa-'+i+'.js'}));
  assert.ok(pag.includes('aplicarDesignacao(D.sessao.id,lista)'),'aplica pelo motor');
  assert.ok(pag.includes('var K0={pen:0.6,lote:2,comp:1.5}')&&!pag.includes('data-mo='),'um critério só (competência); sem “Equilibrar carga”');
  assert.ok(read('.github/workflows/vercel-caput.yml').includes('cp caput/designacao/index.html site/public/caput/designacao/index.html'));
  const caput=read('caput/triagem/index.html');
  for(const x of ["'?embed=1&s='",'class="cwe-mesa-slot"','function mesaSync()',"cmt:mesa-tela","cmt:mesa-fechar","trocar: true","unassigned: it.filter"])assert.ok(caput.includes(x),x);
  assert.ok(!caput.includes('<span class="v">${e(atual)}</span>'),'minutante e corretor sempre editáveis');
});

test('Motor: troca na designação e período efetivo com marcos invertidos',()=>{
  const m=read('caput/motor/assets/js/21-sessoes-equipe.js');
  assert.ok(m.includes('o.trocar && it.servidor !== o.d')&&m.includes('o.trocar && it.corretor !== o.c'));
  assert.ok(m.includes('invertido')&&m.includes('efetivo: periodo(ss)'));
});

test('Equipe: CM não corrige; minuta por exceção só na escolha manual',()=>{
  const R=JSON.parse(read('apoio/equipe.json')).registros,by=n=>R.find(m=>m.nome===n);
  assert.equal(by('CM').correcao,false);
  for(const n of ['Alexander','Vanilda','Saffioti','Giovana']){assert.equal(by(n).minuta,false,n);assert.equal(by(n).minutaEventual,true,n);}
  const m=read('caput/motor/assets/js/21-sessoes-equipe.js');
  assert.ok(m.includes('eventuais: S.equipe.filter(function (m) { return m.minutaEventual && !faz(m, \'d\'); })'));
  assert.ok(m.includes("'minutaEventual'].indexOf(campo)"));
  const pag=read('caput/designacao/index.html');
  assert.ok(pag.includes('optsEx(k,v)')&&pag.includes('var EV=EQ.filter'));
});

test('Mesa: agrupar por motivo do minutante e do corretor',()=>{
  const pag=read('caput/designacao/index.html');
  for(const x of ['data-ag="bloco"','data-ag="md"','data-ag="mc"','function motivo(x,k)','return grupo(x)===b'])assert.ok(pag.includes(x),x);
  for(const m of ['Escolha manual','Continuidade','Regra do gabinete','Especialidade ou preferência','Experiência no assunto','Mesmo lote ou assunto','Já designado na pauta','Distribuição pela carga'])assert.ok(pag.includes(m),m);
});

test('Mesa dentro da etapa B: modo embutido e tela cheia',()=>{
  const pag=read('caput/designacao/index.html');
  assert.ok(pag.includes("get('embed')==='1'")&&pag.includes("EMBED?'cmt:mesa-tela':'cmt:mesa-fechar'"));
  const caput=read('caput/triagem/index.html');
  assert.ok(caput.includes('    mesaSync();\n  }'),'devolve a mesa ao espaço reservado a cada render');
  assert.ok(caput.includes("h.id = 'cwe-mesa-host'")&&caput.includes('slot.appendChild(MESA.host)')&&caput.includes("attachShadow({ mode: 'open' })")&&!caput.includes('<iframe title="Mesa'),'mesa integrada à página, sem iframe, fora do HTML refeito pelo render');
});

test('Mesa: designação inicial e seleção em lote',()=>{
  const pag=read('caput/designacao/index.html');
  assert.ok(!pag.includes('Mexer pouco')&&!pag.includes('trocas de minutante'),'sem vocabulário de troca');
  assert.ok(pag.includes("var g=k==='d'?x.d:x.c;if(g)return g;"),'o gravado fica; a proposta preenche o resto');
  assert.ok(!pag.includes("why.push(['','designação atual'])"),'gravado não pesa na proposta');
  for(const x of ['data-a="proposta"','Substituir também o já gravado','data-ck="','data-ckg="','data-lote="d"','data-lote="c"','sel-proposta','sel-limpar'])assert.ok(pag.includes(x),x);
});

test('Pautas: cabeçalho compacto ao lado do painel e etapa 2 pela numeração do PDF',()=>{
  const c=read('caput/triagem/index.html');
  assert.ok(c.includes('<div class="cwe-main"><div class="cwe-cab">${cabecalho(ss, d)}${marcos(ss)}${cabAbas(ss, d)}</div>'),'cabeçalho na coluna principal');
  assert.ok(c.includes('class="cwe-sesnova" data-cwe="ses-nova"')&&c.includes('function novaSessaoDlg()'),'+ Nova sessão no painel lateral, com diálogo');
  assert.ok(c.includes("'Numeração conferida'")&&!c.includes("'Conferência com a seleção prévia'"),'etapa 2 confere a numeração, não a seleção prévia');
  for(const x of ["'número repetido'","'processo repetido'","'sem número do item'","'era o item '",'Confirmar a numeração'])assert.ok(c.includes(x),x);
  assert.ok(read('caput/motor/assets/js/21-sessoes-equipe.js').includes('r.itemAnterior = String(o.item)'),'reimportação guarda o número anterior');
});

test('Pautas: painel da sessão integrado ao cabeçalho e julgadores com substituições',()=>{
  const c=read('caput/triagem/index.html');
  assert.ok(c.includes("const corpo = [null, etapa1, etapa2, etapaEtq, etapaDes, etapa4][d.cur](ss, d);"),'esteira: seleção, pauta, etiquetagem, designação, publicar');
  assert.ok(!c.includes("['Painel da sessão', 'todas as estatísticas']"),'painel não é etapa');
  for(const x of ['function cabAbas(ss, d)','data-cwe="painel"','data-cwe="j-ed"','function julgEditor(ss, d)','function sugestoesJ(ss, d)','data-cwe="j-sub-add"','data-cwe="j-novo-ok"',"'apoio/magistrados.json'"])assert.ok(c.includes(x),x);
  const m=read('caput/motor/assets/js/21-sessoes-equipe.js');
  for(const x of ['definirJulgadores: function','julgadoresDoItem: function','if (ss.julgadores) o.julgadores = ss.julgadores;','docs[i] && docs[i].julgadores'])assert.ok(m.includes(x),x);
});

test('Mesa: filtro por assunto e agrupamento por assunto, minutante e corretor; rodapé da Triagem só na Triagem',()=>{
  const pag=read('caput/designacao/index.html');
  for(const x of ['data-ag="as"','data-ag="pd"','data-ag="pc"','id="f-as"',"if(FASS&&N(x.as)!==FASS)return false;"])assert.ok(pag.includes(x),x);
  assert.ok(read('caput/triagem/index.html').includes('#rodape[hidden]{display:none!important}'),'rodapé oculto fora da Triagem');
});

test('Designação: painel de regras para minuta e correção, com categorias e processos',()=>{
  const c=read('caput/triagem/index.html');
  for(const x of ['function painelRegras(ss, Z)',"col('d', 'MINUTA')","col('c', 'CORREÇÃO')",'data-cwe="rg"','data-cwe="rgc"','class="rg-its"'])assert.ok(c.includes(x),x);
  const m=read('caput/motor/assets/js/21-sessoes-equipe.js');
  assert.ok(m.includes('designacaoPorRegra: function')&&m.includes("cid: cid, chave: hit || inf.assunto || '—'"),'motor diz a regra e a categoria de cada processo');
});

test('Cartão da sessão: Ex Officio em ícones, aviso de marcos invertidos no cartão, painel com números, julgadores e marcos',()=>{
  const c=read('caput/triagem/index.html');
  for(const x of ['class="cwe-pico','function marcosEditor(ss)','class="cwe-inv" data-cwe="p-tab" data-v="marcos"',"['julg', 'Julgadores e substituições'","['marcos', 'Marcos'",'class="cwe-jico" data-cwe="j-ed"'])assert.ok(c.includes(x),x);
  assert.ok(!c.includes('Regras de designação do gabinete${Z.escopo'),'sem o texto de abertura na Designação');
});

test('Marcos editáveis no cartão com salvar, julgadores por alcance, calendário com sessões e julgadores, grupos recolhíveis',()=>{
  const c=read('caput/triagem/index.html');
  for(const x of ['data-cwe="mk-cal"','data-cwe="mk-salvar"','data-cwe-mkp','class="cwe-jico"',"['casos', 'nos casos de…']","['impedimento', 'onde houver impedimento ou suspeição de quem sai']",'abrirJulgadores'])assert.ok(c.includes(x),x);
  assert.ok(!c.includes('title="Configurações das pautas" aria-label="Configurações das pautas">⚙'),'sem o botão de configurações');
  const m=read('caput/motor/assets/js/21-sessoes-equipe.js');
  assert.ok(m.includes("if (al === 'casos')")&&m.includes("if (al === 'impedimento')"),'motor resolve o alcance');
  assert.ok(read('caput/assets/js/regras-gerais.js').includes('function vSesJulg()'),'calendário com sessões e julgadores');
  const pag=read('caput/designacao/index.html');
  for(const x of ['data-grtodos="1"','function aberto(k,n)',"if(EMBED){document.body.classList.add('emb');",'Lendo o histórico da equipe'])assert.ok(pag.includes(x),x);
});

test('Cartão da sessão: um Salvar alterações para marcos e julgadores e Publicar alterações; etapa 5 Publicação',()=>{
  const c=read('caput/triagem/index.html');
  for(const x of ['function salvarSessao(ss)','data-cwe="pub-alt"','class="cwe-svg"',"['Publicação', 'conferência final e Ex Officio']",'est.jPend[ss.id] = j;'])assert.ok(c.includes(x),x);
  assert.ok(c.includes('.cwe-ses button{border:1px solid transparent!important;'),'sessões não selecionadas sem borda');
});

test('Office: prévia da minuta gera a proclamação com o resultado do prontuário e os julgadores da sessão',()=>{
  const s=read('apoio/ex-officio/index.html');
  const pick=(a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
  const ctx={esc:x=>String(x),S:{doc:{julgadores:{composicao:[{id:'r',nome:'Luis Carlos Hiroki Muta',cargo:'Desembargador Federal',papel:'relator'},{id:'j',nome:'Jean Marcos',cargo:'Desembargador Federal',papel:'vogal'},{id:'n',nome:'Ney Gustavo Paes de Andrade',cargo:'Juiz Federal',papel:'vogal (juiz federal convocado)'}],substituicoes:[{sai:'n',entra:{id:'x',nome:'Beltrano Teste',cargo:'Juiz Federal Convocado'},motivo:'impedimento',alcance:'itens',itens:['12']}]}}}};
  vm.createContext(ctx);vm.runInContext(pick('var DISP_V=','function previaMinuta('),ctx);
  const t=vm.runInContext('proclamacao({item:"12",ctl:{resJulg:"Desprovido"}},"Apelação").txt',ctx);
  assert.match(t,/por unanimidade, negou provimento à apelação, nos termos do voto do Desembargador Federal CARLOS MUTA \(Relator\)\. Votaram o Desembargador Federal JEAN MARCOS e o Juiz Federal Convocado BELTRANO TESTE,/);
  assert.ok(s.includes("['Relatório','Ementa','Dispositivo','Proclamação','Tudo']")&&s.includes('data-pm-pr'));
});

test('Nova sessão: convocados e substituições já na criação; começa na etapa 1 (sem pauta) ou 2 (com PDF)',()=>{
  const fs=require('fs'),p=require('path');const cap=fs.readFileSync(p.join(__dirname,'../../../caput/triagem/index.html'),'utf8');
  assert.ok(cap.includes('data-cwe="nv-sub-add"')&&cap.includes('data-cwe-nvs="alcance"'),'substituições no diálogo');
  assert.ok(cap.includes('substituicoes: nv.subs.filter((sb) => sb.sai && sb.entra)'),'grava as substituições ao criar');
  assert.ok(cap.includes('est.etapa = pdf ? 2 : 1'),'etapa inicial');
  assert.ok(cap.includes("desigMemo(ss, 'R')")&&cap.includes("desigMemo(ss, 'Z')"),'designação memorizada entre renders');
});

test('Etapa 4: a mesa é o cabeçalho da etapa (título, Aplicar, Próximo); Caput sem lista simples duplicada',()=>{
  const pag=read('caput/designacao/index.html'),cap=read('caput/triagem/index.html');
  assert.ok(pag.includes("textContent='Designação'")&&pag.includes('id="b-aplicar-h"')&&pag.includes("tipo:'cmt:mesa-etapa',n:5"),'cabeçalho da etapa na mesa');
  assert.ok(pag.includes('>Atualizar proposta</button>')&&!pag.includes('>Recalcular<'),'Atualizar proposta');
  assert.ok(cap.includes("t === 'cmt:mesa-etapa'")&&!cap.includes('Lista simples por regra, sem a mesa')&&cap.includes('cwe-st4'),'Caput sem duplicação');
});

test('Fora desta sessão: minutas e correções por pauta, gravado na sessão e respeitado pelo motor e pela mesa',()=>{
  const m=read('caput/motor/assets/js/21-sessoes-equipe.js'),pag=read('caput/designacao/index.html'),cap=read('caput/triagem/index.html');
  assert.ok(m.includes('definirForaDaSessao: function')&&m.includes('o.foraDaSessao = ss.foraSessao')&&m.includes('!foraSes(m, ss, kind)'),'motor');
  assert.ok(pag.includes('fora:ss.foraSessao')&&pag.includes('!FD[m.nome]')&&pag.includes('fora das minutas desta sessão'),'mesa');
  assert.ok(cap.includes("['equipe', 'Equipe da sessão'")&&cap.includes('data-cwe-fs=')&&cap.includes('function equipeSessao(ss)'),'painel da sessão');
});

test('Datas: marcos validados (ano 2000–2100), aviso de marco fora do expediente pelo calendário da Chefia, feriados sem rótulo inventado',()=>{
  const m=read('caput/motor/assets/js/21-sessoes-equipe.js'),cap=read('caput/triagem/index.html');
  assert.ok(m.includes('function dataOk(d)')&&m.includes("if (v && !dataOk(v))")&&!m.includes('Imac. Conceição'),'motor');
  assert.ok(cap.includes('fora do expediente</button>')&&cap.includes('min="2000-01-01" max="2100-12-31"'),'Caput');
});

test('Mesa: Atualizar proposta ao lado de Aplicar; agrupar pelas regras do painel; coluna de capacidade compacta',()=>{
  const pag=read('caput/designacao/index.html');
  assert.ok(/<div class="hac" id="hac" hidden><button type="button" class="btn" data-a="recalc"[^>]*>Atualizar proposta<\/button><button type="button" class="btn pri" data-a="copiar"/.test(pag),'recalc antes de Aplicar');
  assert.ok(pag.includes("document.getElementById('b-recalc-tb').hidden=VIVO"),'um só botão no Caput');
  assert.ok(pag.includes('>Regra da minuta</button>')&&pag.includes('>Regra da correção</button>')&&pag.includes('VIVO.designacaoPorRegra(D.sessao.id)')&&pag.includes('nenhum processo nesta pauta'),'grupos pelas regras');
  assert.ok(pag.includes('class="sw"')&&pag.includes('.pp .mt{')&&pag.includes("'<span class=\"mt\">'"),'linha da pessoa');
});

test('Mesa: "Bloco todo" mostra a pessoa escolhida quando o grupo inteiro está com ela',()=>{
  const pag=read('caput/designacao/index.html');
  assert.ok(pag.includes("uD=uni('d'),uC=uni('c')")&&pag.includes("(m.nome===uD?' selected':'')")&&pag.includes("(m.nome===uC?' selected':'')")&&pag.includes('.bh .bulk select.on{'),'select preenchido');
});
