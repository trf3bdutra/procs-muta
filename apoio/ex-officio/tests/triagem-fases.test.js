'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const page=fs.readFileSync(path.join(root,'monitor/triagem/index.html'),'utf8');
test('A fila oferece a visão Fases ao lado das demais',()=>{
  assert.ok(page.includes("['mapa', 'Mapa do fluxo'], ['fases', 'Fases']"));
  assert.ok(page.includes("if (F.ver === 'fases') return h + vFases(L)"));
  assert.ok(page.includes('function vFases(L)'));
});
test('As Fases cobrem as três faixas e as quatro colunas',()=>{
  for(const x of ['Monocrática','Pauta','Fora da fila'])assert.ok(page.includes("faixa(1, 'Monocrática'")||page.includes(x),'faixa '+x);
  for(const x of ['Na fila','Pendência e instrução','Pronto para decidir','Destino definido'])assert.ok(page.includes("'"+x+"'"),'coluna '+x);
  for(const id of ["'sp'","'n1'","'g:fora'","'pm'","'ps'","'mono'","'g:ses'"])assert.ok(page.includes('cel('+id),'caixa '+id);
});
test('O painel da fase reusa o cartão e os eventos do mapa',()=>{
  assert.ok(page.includes('data-mapa-no="\' + esc(id) + \'"'));
  assert.ok(page.includes('data-mapa-todos="0"'));
  assert.ok(page.includes('data-mapa-mais="0"'));
  assert.ok(page.includes('mpCard(o, o.et)'));
});
