'use strict';
/* Prontuário único: o que a pauta (cartão) e a HERO18810 (ficha) registram é o mesmo dado, nos dois sentidos. */
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const FICHA = require(path.resolve(__dirname, '../api/_ficha.js'));

test('cartão → ficha: tipo de caso, assunto detalhado e decisão de origem', () => {
  const m = FICHA.doCartao({}, { subassuntos: 'IMO-A', assuntoDet: 'Atraso na entrega', orig: { tipo: 'Sentença', id: '123', data: '2026-01-02', juizo: '1ª Vara', julgador: 'Fulana', custas: 'isento' } });
  assert.equal(m.triagem.Tema, 'IMO-A');
  assert.equal(m.triagem['Assunto detalhado'], 'Atraso na entrega');
  assert.equal(m.origem['Sentença - ID'], '123');
  assert.equal(m.origem['Sentença - Data'], '2026-01-02');
  assert.equal(m.origem['Origem - Juízo'], '1ª Vara');
  assert.equal(m.origem['Origem - Julgador'], 'Fulana');
  assert.equal(m.origem['Sentença - Custas'], 'isento');
});

test('cartão → ficha: decisão interlocutória não vira ID da sentença', () => {
  const m = FICHA.doCartao({}, { orig: { tipo: 'Decisão interlocutória', id: '9', juizo: 'Vara' } });
  assert.equal((m.origem || {})['Sentença - ID'], undefined);
  assert.equal(m.origem['Origem - Juízo'], 'Vara');
});

test('ficha → cartão (gravação da HERO18810): os mesmos campos chegam ao prontuário da pauta', () => {
  const it = { ctl: { cartao: { orig: { juizo: 'antigo', acc: { custas: true } } } } };
  const v = FICHA.paraCartao({ triagem: { Tema: 'IMO-A', 'Assunto detalhado': 'Atraso' }, origem: { 'Sentença - ID': '555', 'Origem - Juízo': '2ª Vara' } }, it);
  assert.equal(v.cart.subassuntos, 'IMO-A');
  assert.equal(v.cart.assuntoDet, 'Atraso');
  assert.deepEqual(v.cart.orig, { juizo: '2ª Vara', acc: { custas: true }, id: '555', tipo: 'Sentença' });
});

test('ficha → cartão integral (monocráticas): ficha prevalece e preserva o resto do cartão', () => {
  const c = FICHA.cartaoDaFicha({ triagem: { Tema: 'X' }, origem: { 'Sentença - ID': '7', 'Origem - Julgador': 'J' } }, { orig: { acc: { honor: true } }, pecas: [1] });
  assert.equal(c.subassuntos, 'X');
  assert.equal(c.orig.id, '7'); assert.equal(c.orig.tipo, 'Sentença'); assert.equal(c.orig.julgador, 'J'); assert.deepEqual(c.orig.acc, { honor: true });
  assert.deepEqual(c.pecas, [1]);
  const d = FICHA.cartaoDaFicha({ origem: { 'Sentença - ID': '7' } }, { orig: { tipo: 'Acórdão', id: '1' } });
  assert.equal(d.orig.id, '1', 'outro tipo de decisão não é sobrescrito');
});

test('HERO18810: ato monocrático não pede relatório, voto, ementa nem acórdão', () => {
  const fs = require('node:fs'), raiz = path.resolve(__dirname, '../../../extensao');
  const g = fs.readFileSync(path.join(raiz, 'gabinete.js'), 'utf8'), ge = fs.readFileSync(path.join(raiz, 'gerador.js'), 'utf8');
  ['Tipo de Voto', 'Relatório Padronizado', 'Adequação Ementa', 'Rev - Ementa'].forEach(k => assert.ok(g.includes("'" + k + "': 1"), k));
  assert.match(g, /g\.destino === destino\(\)\) && grupoVisivel\(g\)/, 'Campos do caso respeita o destino');
  assert.match(ge, /g\.destino\(\) === 'monocratica'/, 'Gerador sem peças de acórdão na monocrática');
});

test('HERO18810: Roteiro de triagem sem a identificação da decisão; Roteiro de produção com os campos do Compendium', () => {
  const fs = require('node:fs'), raiz = path.resolve(__dirname, '../../../extensao');
  const r = fs.readFileSync(path.join(raiz, 'roteiro.js'), 'utf8'), g = fs.readFileSync(path.join(raiz, 'gabinete.js'), 'utf8');
  assert.match(r, /var FORA_TRIAGEM = \{ decisao: 1, impugnada: 1 \}/);
  assert.match(g, /<b>Roteiro de produção<\/b>/);
  assert.match(g, /data-rt="u:' \+ k \+ '">Usar/, 'sugestão dos autos com Usar');
});

test('HERO18810: Roteiro de produção pelo perfil da minuta, com histórico de pautas e sem o tipo de ato', () => {
  const fs = require('node:fs'), g = fs.readFileSync(path.resolve(__dirname, '../../../extensao/gabinete.js'), 'utf8');
  assert.match(g, /var CC_MONO = \[\['Decisão', \[\['producao', 'Mono - Título', 'Título do caso \(painel do Desembargador\)'\], \['producao', 'Mono - Fundamento', 'Precedente ou fundamento'\]/);
  assert.match(g, /function pautaHtml\(\)/);
  assert.match(g, /c\.chave === 'Mono - Tipo de ato'/);
  assert.match(g, /function historicoPautas\(\)/);
});

test('HERO18810: Caso do Roteiro de produção segue o tipo de julgamento', () => {
  const fs = require('node:fs'), raiz = path.resolve(__dirname, '../../../extensao');
  const g = fs.readFileSync(path.join(raiz, 'gabinete.js'), 'utf8'), r = fs.readFileSync(path.join(raiz, 'roteiro.js'), 'utf8');
  assert.match(g, /'Sentença': \['ap', 'rn', 'ms'\], 'Espécie e decisão impugnada': \['ai', 'agint', 'ed', 'ret'\]/);
  assert.match(g, /T\.ai \? 'Decisão agravada'/);
  assert.match(r, /window\.MutaRoteiro = \{[^}]*\btipos:\s*tipos,/);
});

test('HERO18810 0.58: aba Pauta e Controle como ícone na faixa do topo', () => {
  const fs = require('node:fs'), R = f => fs.readFileSync(path.resolve(__dirname, '../../../extensao', f), 'utf8');
  const h = R('painel.html'), pa = R('pauta.js'), g = R('gabinete.js'), x = R('gestao.js');
  assert.match(h, /id="tab-pauta"/); assert.match(h, /<div id="pauta-app"/); assert.match(h, /<script src="pauta\.js"><\/script>/);
  assert.match(pa, /ses\.api\('\/api\/sessoes'\)/); assert.match(pa, /'\/api\/pauta\?data=' \+ P\.data/); assert.match(pa, /'\/api\/sessoes\?pedidos=1'/);
  assert.match(g, /data-tu-ctl/); assert.doesNotMatch(x, /tab\('so', 'Sustentação'/);
});

test('HERO18810 0.59: admissibilidade, MPF, mídias e etiquetas só no Roteiro de triagem', () => {
  const fs = require('node:fs'), R = f => fs.readFileSync(path.resolve(__dirname, '../../../extensao', f), 'utf8');
  const r = R('roteiro.js'), g = R('gabinete.js');
  assert.match(r, /\['gab', 'Mídias e etiquetas'\]/); assert.match(r, /id: 'etiquetas', f: 'gab'/);
  assert.match(g, /!GRUPOS_TRIAGEM\[g\.grupo\] && ccGrupoVale\(g, T\)/); assert.match(g, /ja\[id\] \|\| TRI_EXTRA\[c\.chave\]/);
});

test('HERO18810 0.61: dados da decisão monocrática pela cronologia dos autos', () => {
  const fs = require('node:fs'), a = fs.readFileSync(path.resolve(__dirname, '../../../extensao/autos.js'), 'utf8');
  assert.match(a, /function monoAutos\(\)/);
  ['producao.Decisão - ID', 'producao.Data da Assinatura', 'producao.Mono - Data da publicação', 'producao.Publicado'].forEach(k => assert.ok(a.includes("alvo: '" + k + "'"), k));
});

test('HERO18810 0.64: sigla da classe, Síntese e questões acima dos roteiros, pedidos por processo e por sessão', () => {
  const fs = require('node:fs'), R = f => fs.readFileSync(path.resolve(__dirname, '../../..', f), 'utf8');
  assert.equal(R('padrao/classes-cnj.js'), R('extensao/padrao-classes-cnj.js'), 'cópia da extensão igual');
  require(path.resolve(__dirname, '../../../padrao/classes-cnj.js'));
  const C = globalThis.ClassesCNJ;
  assert.equal(C.etiqueta('ApCiv - APELAÇÃO CÍVEL', { ed: 1 }).t, 'ApCiv · ED');
  assert.equal(C.etiqueta('AGRAVO DE INSTRUMENTO', '').t, 'AI');
  assert.equal(C.etiqueta('APELAÇÃO / REMESSA NECESSÁRIA', '').t, 'ApelRemNec');
  const g = R('extensao/gabinete.js'), p = R('extensao/pauta.js');
  assert.match(g,/hero-main-tabs hero-v53-tabs/); assert.match(g,/hero-v53-dock-tabs/); assert.match(g,/hero-v53-profile/);
  assert.match(p, /function soProcesso\(cnj\)/); assert.match(p, /function pedSessao\(itens\)/); assert.match(p, /function listaHtml\(\)/); assert.match(p,/function solicitacoesHtml\(itens,\s*indicadores\)/);
  assert.match(R('extensao/painel.html'), /<script src="padrao-classes-cnj\.js"><\/script>/);
});

test('HERO18810 0.67: "Liberada" só em processo pautado e com as caixas do editor marcadas ou informada à mão', () => {
  const fs = require('node:fs'), R = f => fs.readFileSync(path.resolve(__dirname, '../../../extensao', f), 'utf8');
  assert.match(R('conteudo-pje.js'), /function liberacaoEditor\(tarefa\)/); assert.match(R('conteudo-pje.js'), /lib: d\.lib \|\| ''/);
  assert.match(R('fundo.js'), /reg\.lib = ''/); assert.match(R('pje.js'), /liberacao: function \(\)/);
  assert.match(R('gabinete.js'), /else if \(pautado\(\) && \(libOk \|\| libMan\)\)/);
});

test('painel do Office → ficha: decisão de origem, remessa necessária e multa (ida e volta)',()=>{
  const F=require('../api/_ficha.js');
  const r={processo:'x',triagem:{'Tipo de Julgamento':'Embargos de Declaração','Reexame - Cabimento':'Dispensada'},producao:{},origem:{},controles:{}};
  const passo=c=>F.aplica(r,F.mudancaCoerente(r,F.doCartao({},c)));
  passo({orig:{tipo:'Decisão interlocutória',id:'123',data:'2026-10-01'}});
  assert.equal(r.origem['Decisão recorrida - Tipo'],'Decisão interlocutória');
  assert.equal(r.origem['1G - Decisão ID'],'123');assert.equal(r.origem['1G - Decisão recorrida'],'Sim');
  passo({jul:{multa:'Protelatórios · art. 1.026, § 2º',remessa:false}});
  assert.equal(r.producao['ED - Multa'],'Protelatórios · art. 1.026, § 2º');
  assert.equal(r.triagem['Reexame - Cabimento'],'Dispensada','desmarcada não apaga o que não é "Cabível"');
  passo({jul:{remessa:true}});assert.equal(r.triagem['Reexame - Cabimento'],'Cabível');
  passo({jul:{remessa:false}});assert.equal(r.triagem['Reexame - Cabimento'],'');
  r.triagem['Tipo de Julgamento']='Agravo Interno';passo({jul:{multa:'Sem multa'}});assert.equal(r.producao['AgInt - Multa'],'Sem multa');
  r.origem['Decisão recorrida - Tipo']='Acórdão';r.origem['1G - Decisão ID']='777';
  const c=F.cartaoDaFicha(r,{orig:{tipo:'Sentença'},tipoJ:'Agravo Interno'});
  assert.equal(c.orig.tipo,'Acórdão');assert.equal(c.orig.id,'777');assert.equal(c.jul.multa,'Sem multa');
});
