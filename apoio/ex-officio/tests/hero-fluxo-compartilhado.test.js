'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const a=read('apoio/ex-officio/api/_ficha.js'),g=read('extensao/gabinete.js'),F=JSON.parse(read('padrao/ficha.json'));
const norm=new Function(a.slice(a.indexOf('function destinoCoerente('),a.indexOf('/* grava {secao:'))+';return mudancaCoerente;')();
const flow=new Function("function S(v){return String(v==null?'':v).trim();}function N(v){return S(v).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();}"+g.slice(g.indexOf('function pautaFluxo('),g.indexOf('function pautaAtualFluxo('))+'return pautaFluxo;')();
test('sessão pretendida editável e seleção prévia não constitui pauta oficial',()=>{
 const c=F.abas.flatMap(a=>a.grupos.flatMap(g=>g.campos)).find(c=>c.secao==='pauta'&&c.chave==='Nova sessão de destino');
 assert.ok(c&&!c.calculado&&c.editavel!==false);
 const m={triagem:{'Seleção Prévia':'SELECIONADO PREVIAMENTE'},pauta:{'Nova sessão de destino':'2026-12-14'}},antes=JSON.stringify(m);
 const v=norm({producao:{Destino:'Monocrática'}},m);assert.equal(v.producao.Destino,'Sessão');assert.equal(v.pauta['Nova sessão de destino'],'2026-12-14');assert.equal(JSON.stringify(m),antes);
 assert.equal(flow(v.pauta,[{sessao:'2026-12-14',item:'12',lista:'previa'}]).estado,'previa');
 assert.equal(flow(v.pauta,[{sessao:'2026-12-14',item:'12',lista:'itens'}]).estado,'oficial');
});
test('destinação não colegiada limpa planejamento sem tocar histórico',()=>{
 const v=norm({producao:{Destino:'Sessão'},pauta:{'Nova sessão de destino':'2026-12-14'}},{producao:{Destino:'Monocrática','Mono - Tipo de ato':'Despacho'}});
 assert.equal(v.pauta['Nova sessão de destino'],'');assert.equal(v.producao['Mono - Tipo de ato'],'Despacho');assert.equal(v.pauta.sessoes,undefined);
 assert.equal(flow({sessoes:[{sessao:'2026-11-23',item:'3',resultado:'ADIADO'}],'Nova sessão de destino':'2026-12-14'},[]).estado,'adiado');
});
test('datas de produção sincronizam os indicadores nas duas APIs',()=>{
 const v=norm({}, {producao:{'Data da Revisão':'2026-11-26','Data da Liberação':'','Data da Assinatura':'2026-11-26','Mono - Data da publicação':''}});
 assert.equal(v.producao.CORRIGIDO,'Sim');assert.equal(v.producao.LIBERADO,'');assert.equal(v.producao.Assinado,'Sim');assert.equal(v.producao.Publicado,'');
 assert.match(read('apoio/ex-officio/api/_prontuario.js'),/FICHA\.mudancaCoerente\(r,mud\)/);
});

test('designação a partir da ficha conserva histórico no cartão sem duplicar eventos',()=>{
 const fn=new Function("const agora=()=> '2026-11-26T00:00:00Z';"+a.slice(a.indexOf('function aplicaCartao('),a.indexOf('/* arquivos onde'))+'return aplicaCartao;')();
 const item={servidor:'A',corretor:'B',ctl:{}},v={d:{servidor:'C',corretor:'B'},k:{},cart:{}};
 assert.equal(fn(item,v,'Gestor'),true);assert.deepEqual(item.ctl.historicoDesignacoes[0].alteracoes,[{papel:'minuta',de:'A',para:'C'}]);assert.equal(item.ctl.historicoDesignacoes[0].por,'Gestor');assert.equal(fn(item,v,'Gestor'),false);assert.equal(item.ctl.historicoDesignacoes.length,1);
});
test('pré-pauta não espelha resultado oficial; Ex Officio transmite autor da alteração',()=>{const p=read('apoio/ex-officio/api/pauta.js');assert.match(p,/if\(lista==='previa'\)delete Cf\.resultado/);assert.match(p,/FICHA\.espelho\([^\n]+,u\)/);});
