/* HERO18810 · Gerador (Minuta › Gerador; até a 0.37, Prontuário › Gerador): relatório, dispositivo do voto, ementa, acórdão e proclamação no padrão do
   gabinete (Padrão Muta 1 e 2; Padrão de ementa do gabinete), pelo tipo de julgamento e pelo resultado escolhido.
   Fonte: a ficha do processo (o que está gravado ou a gravar) e, onde a ficha está vazia, o que a leitura dos autos achou.
   Fórmulas transcritas sem reescrever; o que não se confirma na ficha ou nos autos sai como [VALIDAR: …]. Nada é gravado. */
(function () {
  'use strict';
  var S = function (v) { return v == null ? '' : String(v).trim(); };
  var N = function (v) { return S(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var VAL = function (t) { return '[VALIDAR: ' + t + ']'; };
  var ST = { tipo: '', res: '', cnj: '' };
  /* 0.43: por ora, só relatório e ementa (pedido do gestor, 23/11/2026); dispositivo, acórdão e proclamação continuam no código, desligados */
  var PECAS = { rel: true, em: true, disp: false, ac: false, pr: false };

  /* ---------- dados ---------- */
  var CONTEXTO = null;
  function GB() { return CONTEXTO || window.MutaGabinete || {}; }
  function sugDe(alvo) {
    var AU = CONTEXTO ? null : window.MutaAutos; if (!AU || !AU.sugestoes) return '';
    var x = (AU.sugestoes() || []).filter(function (s) { return s.alvo === alvo; })[0];
    return x ? x.value : '';
  }
  function v(sec, k) { var g = GB(), x = g.V ? g.V(sec, k) : ''; if (Array.isArray(x) ? x.length : S(x)) return x; return sugDe(sec + '.' + k) || ''; }
  function tab(sec, k) { var x = v(sec, k); if (typeof x === 'string') { try { x = JSON.parse(x); } catch (e) { x = []; } } return Array.isArray(x) ? x.filter(function (r) { return r && typeof r === 'object'; }) : []; }
  function fo(k) { var f = (GB().fo && GB().fo()) || {}; return S(f[k]); }
  /* itens de alegação: descarta o que não é texto de razão (cabeçalho de documento, carimbo de hora, rótulo solto) */
  function linhas(t) { return S(t).split(/\n+|;\s*(?=\(?\d+\)|\w)/).map(function (l) { return S(l).replace(/^[-•·\d.)(\s]+/, '').replace(/[.;]+$/, ''); }).filter(function (l) { return l && l.split(/\s+/).length >= 3 && !/^P_|\d{2}:\d{2}:\d{2}|^(apela[çc][ãa]o|recurso|contrarraz[õo]es)$/i.test(l); }); }
  function enumerar(L) { if (!L.length) return ''; if (L.length === 1) return L[0]; return L.map(function (x, i) { return '(' + (i + 1) + ') ' + x; }).slice(0, -1).join('; ') + '; e (' + L.length + ') ' + L[L.length - 1]; }
  function ids(t) { var L = S(t).split(/[,;\s]+/).filter(function (x) { return /^\d{6,}$/.test(x); }); return !L.length ? '' : L.length === 1 ? '(ID ' + L[0] + ')' : '(ID’s ' + L.slice(0, -1).join(', ') + ' e ' + L[L.length - 1] + ')'; }
  function idOu(t, o) { return ids(t) || '(ID ' + VAL(o) + ')'; }

  /* ---------- tipo de julgamento e resultado ---------- */
  var TIPOS = ['Apelação', 'Remessa Necessária', 'Agravo de Instrumento', 'Embargos de Declaração', 'Agravo Interno', 'Juízo de Retratação'];
  function tipoDetectado() {
    var t = N(v('triagem', 'Tipo de Julgamento')), cl = N(fo('classe_judicial') || fo('Classe') || fo('Descrição da Classe'));
    if (/embargos de declara/.test(t)) return 'Embargos de Declaração';
    if (/agravo interno/.test(t)) return 'Agravo Interno';
    if (/retrata/.test(t)) return 'Juízo de Retratação';
    if (/agravo de instrumento/.test(t) || (!t && /agravo de instrumento/.test(cl))) return 'Agravo de Instrumento';
    if (/remessa/.test(t) && !/apela/.test(t)) return 'Remessa Necessária';
    if (/apela/.test(t) || /apela/.test(cl)) return 'Apelação';
    if (/remessa/.test(cl)) return 'Remessa Necessária';
    return 'Apelação';
  }
  /* resultado: chave → [voto (1ª pessoa), acórdão (3ª pessoa), conclusão da ementa (particípio)] por tipo */
  function objeto(tipo) {
    var rec = tab('origem', 'Recursos').length, rn = N(v('origem', 'Sentença - Reexame')) === 'sim';
    if (tipo === 'Apelação') { var ap = rec > 1 ? 'às apelações' : 'à apelação'; return { art: rec > 1 ? 'das apelações' : 'da apelação', a: rn ? ap + ' e à remessa necessária' : ap, nome: rec > 1 ? 'Apelações' : 'Apelação', fem: true, pl: rec > 1, rn: rn }; }
    if (tipo === 'Remessa Necessária') return { art: 'da remessa necessária', a: 'à remessa necessária', nome: 'Remessa necessária', fem: true };
    if (tipo === 'Agravo de Instrumento') return { art: 'do agravo de instrumento', a: 'ao agravo de instrumento', nome: 'Agravo de instrumento', fem: false };
    if (tipo === 'Agravo Interno') return { art: 'do agravo interno', a: 'ao agravo interno', nome: 'Agravo interno', fem: false };
    return { art: '', a: '', nome: '', fem: false };
  }
  function opcoesRes(tipo) {
    if (tipo === 'Embargos de Declaração') return [['rej', 'Rejeição'], ['acol', 'Acolhimento'], ['acolp', 'Acolhimento parcial'], ['nc', 'Não conhecimento']];
    if (tipo === 'Juízo de Retratação') return [['mant', 'Mantém o acórdão'], ['retr', 'Exerce a retratação']];
    var L = [['desp', 'Desprovimento'], ['prov', 'Provimento'], ['parc', 'Parcial provimento'], ['ncdesp', 'Conhece em parte e nega'], ['nc', 'Não conhecimento'], ['prej', 'Prejudicado']];
    /* remessa necessária não se conhece "em parte" */
    return tipo === 'Remessa Necessária' ? L.filter(function (o) { return o[0] !== 'ncdesp'; }) : L;
  }
  /* sem resultado na ficha, nenhum é presumido: o gerador marca [VALIDAR] (regra: nunca escolher o resultado em silêncio) */
  function resDaFicha(tipo) {
    var r=N(v('producao','Voto - Resultado'));
    if(!r||/\b(e|mas|porem|enquanto)\b|[;\/]/.test(r))return '';
    if(tipo==='Embargos de Declaração'){
      if(/^(acolhimento parcial|parcialmente acolhidos?|parcialmente provido)$/.test(r))return 'acolp';
      if(/^(acolhimento|acolhidos?|dado provimento)$/.test(r))return 'acol';
      if(/^(rejeicao|rejeitados?|negado provimento|desprovimento)$/.test(r))return 'rej';
      return /^(nao conhecido|nao conhecimento)$/.test(r)?'nc':'';
    }
    if(tipo==='Juízo de Retratação')return /^(mantem o acordao|acordao mantido|mantido|nao exercido)$/.test(r)?'mant':/^(exerce a retratacao|retratacao exercida|retratado)$/.test(r)?'retr':'';
    if(/^(nao conhecido|nao conhecimento)$/.test(r))return 'nc';
    if(/^(parcialmente provido|parcial provimento|provimento parcial)$/.test(r))return 'parc';
    if(/^(dado provimento|provimento|provido)$/.test(r))return 'prov';
    if(/^(negado provimento|desprovimento|desprovido)$/.test(r))return 'desp';
    if(/^(prejudicado|recurso prejudicado)$/.test(r))return 'prej';
    return '';
  }
  function resultado(tipo, k) {
    if (!k) return [VAL('resultado do voto: escolha acima'), VAL('resultado do julgamento'), VAL('CONCLUSÃO'), VAL('conclusão')];
    var o = objeto(tipo), cmd = VAL('comando: para reformar a ' + (/Agravo/.test(tipo) ? 'decisão agravada' : 'sentença') + ' e …');
    if (tipo === 'Embargos de Declaração') return ({
      rej: ['rejeito os embargos de declaração', 'rejeitou os embargos de declaração', 'EMBARGOS DE DECLARAÇÃO REJEITADOS', 'Embargos de declaração rejeitados.'],
      acol: ['acolho os embargos de declaração, ' + VAL('sem efeitos modificativos | com efeitos modificativos') + ', para ' + VAL('sanar o vício'), 'acolheu os embargos de declaração, ' + VAL('sem efeitos modificativos | com efeitos modificativos') + ', para ' + VAL('sanar o vício'), 'EMBARGOS DE DECLARAÇÃO ACOLHIDOS', 'Embargos de declaração acolhidos.'],
      acolp: ['acolho parcialmente os embargos de declaração para, sem efeitos modificativos, ' + VAL('acrescer fundamentação …'), 'acolheu parcialmente os embargos de declaração para, sem efeitos modificativos, ' + VAL('acrescer fundamentação …'), 'EMBARGOS DE DECLARAÇÃO PARCIALMENTE ACOLHIDOS', 'Embargos de declaração parcialmente acolhidos.'],
      nc: ['não conheço dos embargos de declaração', 'não conheceu dos embargos de declaração', 'EMBARGOS DE DECLARAÇÃO NÃO CONHECIDOS', 'Embargos de declaração não conhecidos.'] })[k];
    if (tipo === 'Juízo de Retratação') return ({
      mant: ['em juízo de retratação, mantenho o acórdão ' + VAL('confirmar a fórmula do gabinete'), 'em juízo de retratação, manteve o acórdão ' + VAL('confirmar a fórmula do gabinete'), 'JUÍZO DE RETRATAÇÃO NÃO EXERCIDO', 'Acórdão mantido.'],
      retr: ['em juízo de retratação, ' + VAL('novo resultado'), 'em juízo de retratação, ' + VAL('novo resultado'), 'JUÍZO DE RETRATAÇÃO EXERCIDO', VAL('dispositivo')] })[k];
    var pp = function (m, f) { return (o.fem ? f : m) + (o.pl ? 's' : ''); }, nome = o.nome + (o.rn && o.nome === 'Apelação' ? ' e remessa necessária' : '');
    var nomeCx = nome.toUpperCase(), pl = o.pl || o.rn;
    var part = function (m, f) { var x = o.fem ? f : m; return pl ? x + (x === x.toUpperCase() ? 'S' : 's') : x; };
    return ({
      desp: ['nego provimento ' + o.a, 'negou provimento ' + o.a, nomeCx + ' ' + part('DESPROVIDO', 'DESPROVIDA'), nome + ' ' + part('desprovido', 'desprovida') + '.'],
      prov: ['dou provimento ' + o.a + ' ' + cmd, 'deu provimento ' + o.a + ' ' + cmd, nomeCx + ' ' + part('PROVIDO', 'PROVIDA'), nome + ' ' + part('provido', 'provida') + '.'],
      parc: ['dou parcial provimento ' + o.a + ' ' + cmd, 'deu parcial provimento ' + o.a + ' ' + cmd, nomeCx + ' ' + part('PARCIALMENTE PROVIDO', 'PARCIALMENTE PROVIDA'), nome + ' ' + part('parcialmente provido', 'parcialmente provida') + '.'],
      ncdesp: ['conheço em parte ' + o.art + ' e ' + (pl ? 'nego-lhes' : 'nego-lhe') + ' provimento', 'conheceu em parte ' + o.art + ' e ' + (pl ? 'negou-lhes' : 'negou-lhe') + ' provimento', nomeCx + ' ' + part('PARCIALMENTE CONHECIDO', 'PARCIALMENTE CONHECIDA') + ' E ' + part('DESPROVIDO', 'DESPROVIDA'), nome + ' ' + part('conhecido', 'conhecida') + ' em parte e, nessa extensão, ' + part('desprovido', 'desprovida') + '.'],
      nc: ['não conheço ' + o.art, 'não conheceu ' + o.art, nomeCx + ' NÃO ' + part('CONHECIDO', 'CONHECIDA'), nome + ' não ' + part('conhecido', 'conhecida') + '.'],
      prej: ['julgo ' + part('prejudicado', 'prejudicada') + ' ' + o.art.replace(/^d[ao]s? /, function (m) { return m.replace(/^d/, ''); }), 'julgou ' + part('prejudicado', 'prejudicada') + ' ' + o.art.replace(/^d[ao]s? /, function (m) { return m.replace(/^d/, ''); }), nomeCx + ' ' + part('PREJUDICADO', 'PREJUDICADA'), nome + ' ' + part('prejudicado', 'prejudicada') + '.'] })[k] || ['', '', '', ''];
  }

  /* ---------- partes ---------- */
  var PELO_NOME = [[/fazenda nacional/i, 'a Fazenda Nacional'], [/\buni[ãa]o\b/i, 'a União'], [/caixa econ[ôo]mica federal|\bcef\b/i, 'a Caixa Econômica Federal'], [/banco central|\bbacen\b/i, 'o Banco Central do Brasil']];
  function porNome(nome) { for (var i = 0; i < PELO_NOME.length; i++) if (PELO_NOME[i][0].test(nome || '')) return PELO_NOME[i][1]; return ''; }
  function feminino(nome) {
    var n = N(nome).replace(/^(o|a)\s+/, '');
    if (/^(instituto|conselho|departamento|banco|municipio|estado|fundo|servico)\b/.test(n)) return false;
    if (/^(universidade|fundacao|agencia|caixa|empresa|companhia|cooperativa|associacao|sociedade|uniao|fazenda|autarquia)\b/.test(n)) return true;
    var p = n.split(/\s+/)[0] || ''; return /a$/.test(p) && !/^(luca|joshua|nicola|elia|jonatha)$/.test(p);
  }
  function polos() {
    var a = fo('polo_ativo') || fo('Polo Ativo'), p = fo('polo_passivo') || fo('Polo Passivo');
    return { a: a.split(/;|\s+e\s+(?=[A-ZÁ-Ú])/)[0] || '', p: p.split(/;|\s+e\s+(?=[A-ZÁ-Ú])/)[0] || '', aN: a.split(';').filter(Boolean).length, pN: p.split(';').filter(Boolean).length };
  }
  /* designação pela posição na origem; pelo nome se União, CEF, BACEN ou Fazenda Nacional */
  function designa(polo) {
    var P = polos(), nome = polo === 'autor' ? P.a : P.p, nm = porNome(nome);
    if (nm) return nm;
    if(CONTEXTO)return polo==='autor'?'a parte autora':'a parte ré';
    var ms = /mandado de seguran/i.test(fo('classe_judicial') || fo('Classe'));
    if (polo === 'autor') { var f = feminino(nome); return ms ? (f ? 'a impetrante' : 'o impetrante') : (P.aN > 1 ? 'os autores' : f ? 'a autora' : 'o autor'); }
    var fr = feminino(nome); return P.pN > 1 ? 'os réus' : fr ? 'a ré' : 'o réu';
  }
  function poloDe(txt) {
    var n = N(txt); if (!n) return '';
    if (/\b(autor|autora|autores|autoras|requerente|exequente|impetrante|demandante)\b/.test(n)) return 'autor';
    if (/\b(re|reu|res|reus|requerid[oa]s?|executad[oa]s?|impetrad[oa]s?|demandad[oa]s?)\b/.test(n)) return 're';
    var P = polos();
    if (P.a && N(P.a).indexOf(n.slice(0, 12)) >= 0) return 'autor';
    if (P.p && N(P.p).indexOf(n.slice(0, 12)) >= 0) return 're';
    if (porNome(txt)) { if (P.p && porNome(P.p) === porNome(txt)) return 're'; if (P.a && porNome(P.a) === porNome(txt)) return 'autor'; }
    return '';
  }
  var TIPO = '';
  /* o nome lido na peça pode ser o do advogado: vale o polo que ele representa */
  function poloDoAdvogado(txt) {
    var n = N(txt); if (n.length < 6) return '';
    if (N(fo('advogado_pa')).indexOf(n) >= 0) return 'autor';
    if (N(fo('advogado_pp')).indexOf(n) >= 0) return 're';
    return '';
  }
  function quem(txt) {
    var nm = porNome(txt); if (nm) return nm;
    var n = N(txt), p = /\bagravante\b/.test(n) ? 'autor' : /\bagravad[oa]\b/.test(n) ? 're' : poloDe(txt) || poloDoAdvogado(txt);
    /* agravo de instrumento: a capa traz agravante e agravado; o Padrão designa pela posição na origem (autor, réu), que a capa não diz */
    if (p && TIPO === 'Agravo de Instrumento') { var P = polos(), nome = p === 'autor' ? P.a : P.p, pn = porNome(nome); if (pn) return pn; return VAL('posição na origem (o autor | o réu) — ' + (p === 'autor' ? 'agravante' : 'agravado') + (nome ? ': ' + nome : '')); }
    return p ? designa(p) : VAL(S(txt) ? 'recorrente (lido: ' + S(txt) + ')' : 'recorrente');
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* ---------- sentença ---------- */
  function confirmadosOrigem(){
    var x=GB().V?GB().V('origem','Sentença - Comandos'):[];
    if(!Array.isArray(x)||!x.length||x.some(function(r){return N(r.confirmado)!=='sim'||!S(r.redacao)||!S(r.id_decisao)||r.categoria==='A conferir';}))return [];
    var id=S(x[0].id_decisao),sid=S(v('origem','Sentença - ID')).split(/[,;\s]+/).filter(Boolean);
    if(x.some(function(r){return S(r.id_decisao)!==id;})||sid.length!==1||sid[0]!==id||!x.some(function(r){return r.categoria==='Resultado';}))return [];
    return x.slice().sort(function(a,b){return Number(a.ordem)-Number(b.ordem);});
  }
  function limpaComando(s){return S(s).replace(/[.;\s]+$/,'');}
  function comandosOrigem(){
    var x=confirmadosOrigem();
    if(x.length)return x.filter(function(r){return r.categoria==='Resultado'||r.categoria==='Providência'||r.categoria==='Custas / gratuidade';}).map(function(r){return limpaComando(r.redacao);}).join('; ');
    var r=resultadoSentenca(),p=S(v('origem','Sentença - Providências')).split(/\n+/).map(limpaComando).filter(function(t){return t&&r.indexOf(t)<0;});
    var aviso=GB().V&&GB().V('origem','Sentença - Comandos');return [r].concat(p).map(limpaComando).join('; ')+(Array.isArray(aviso)&&aviso.length?' '+VAL('conferir capítulos dispositivos e ID da decisão'):'');
  }
  function honorariosAbertura(){
    var h=confirmadosOrigem().filter(function(r){return r.categoria==='Honorários';});
    if(h.length)return h.map(function(r){
      var s=limpaComando(r.redacao).replace(/^fixou (?:os )?honorários advocatícios\s*/i,'Honorários advocatícios fixados ').replace(/^fixou (?:os )?honorários\s*/i,'Honorários advocatícios fixados ');
      var m=/^condenou (o|a|os|as) (.+?) ao pagamento de honorários(?: advocatícios)? (?:de|em) (.+)$/i.exec(s);
      if(m){var art={o:'do',a:'da',os:'dos',as:'das'};s='Honorários advocatícios fixados em '+m[3]+', a cargo '+art[m[1].toLowerCase()]+' '+m[2];}
      return cap(s)+'.';
    }).join(' ');
    return fraseHonorarios();
  }
  function aberturaOrigem(tipo){
    var sid=S(v('origem','Sentença - ID')),rn=N(v('origem','Sentença - Reexame'))==='sim',nRec=tab('origem','Recursos').length;
    var ab=tipo==='Remessa Necessária'?'Trata-se de remessa necessária de sentença ':rn?'Trata-se de remessa necessária e de apelação interposta contra sentença ':nRec>2?'Trata-se de apelações à sentença ':nRec===2?'Trata-se de dupla apelação à sentença ':'Trata-se de apelação à sentença ';
    return ab+idOu(sid,'ID da sentença')+' que '+comandosOrigem()+'. '+honorariosAbertura();
  }
  function resultadoSentenca(oque) {
    var r = S(v('origem', 'Sentença - Resultado')), d = N(v('origem', 'Sentença - Decisão'));
    if (r) {
      r = r.replace(/\b(IMPROCEDENTES?|PROCEDENTES?|PARCIALMENTE|EXTINTO|EXTINTA)\b/g, function(m){return m.toLowerCase();}).replace(/^(?:o juiz|a ju[íi]za|a sentença)\s+/i, '')
        .replace(/,?\s*(?:e\s+)?(?:resolvendo|com resolu[çc][ãa]o|extinguindo o (?:processo|feito) com|nos termos d[oe] (?:art|artigo))[\s\S]*$/i, '').replace(/[.;,\s]+$/, '');
      if (!/^(julgou|extinguiu|denegou|concedeu|homologou|indeferiu|deferiu|rejeitou|acolheu|reconheceu|declarou|condenou|determinou)/i.test(r)) r = VAL('verbo nuclear') + ' ' + r;
      return r;
    }
    return d === 'procedente' ? 'julgou procedente o pedido' : d === 'improcedente' ? 'julgou improcedente o pedido' : d === 'parcialmente procedente' ? 'julgou parcialmente procedente o pedido' : /extin/.test(d) ? 'extinguiu o processo sem resolução do mérito' : /homolog/.test(d) ? 'homologou ' + VAL('o acordo | a desistência') : VAL('o que a ' + (oque || 'sentença') + ' decidiu');
  }
  /* "Parte ré (INSS) · 10% sobre o valor da condenação (Súmula 111/STJ) · exigibilidade suspensa (…)" → frase do relatório */
  function fraseHonorarios() {
    var h = S(v('origem', 'Sentença - Honorários')); if (!h) return VAL('honorários fixados na sentença');
    return h.split(/\s*\|\s*/).map(function (um) {
      var p = um.split(/\s*·\s*/), q = p[0] || '';
      if (/^sem honor/i.test(q)) { var m = /\(([^)]+)\)/.exec(q); return 'Sem condenação em honorários advocatícios' + (m ? ' (' + m[1].replace(/^(mandado de segurança|Juizado):\s*/, '') + ')' : '') + '.'; }
      if (!/^(parte|ambas|\[VALIDAR)/i.test(q)) return cap(um.replace(/[.;]\s*$/, '')) + '.';
      var valor = p[1] || VAL('valor'), obs = p.slice(2), sum = /\(Súmula 111\/STJ\)/.test(valor); valor = valor.replace(/\s*\(Súmula 111\/STJ\)/, '');
      var dev = /^ambas/i.test(q) ? '' : /\(([^)]+)\)/.exec(q) ? quem(/\(([^)]+)\)/.exec(q)[1]) : /autora/i.test(q) ? designa('autor') : /r[ée]/i.test(q) ? designa('re') : VAL('quem paga');
      var fr = /^ambas/i.test(q) ? 'Fixou honorários advocatícios em sucumbência recíproca, em ' + valor : 'Condenou ' + dev + ' ao pagamento de honorários advocatícios de ' + valor;
      if (sum) fr += ', observada a Súmula 111/STJ';
      obs.forEach(function (o) { if (/equidade/.test(o)) fr += ', fixados por equidade (artigo 85, § 8º, do CPC)'; else if (/exigibilidade/.test(o)) fr += ', com exigibilidade suspensa pela gratuidade de justiça (artigo 98, § 3º, do CPC)'; else if (/DPU/.test(o)) fr += ', em favor da Defensoria Pública da União'; else fr += ', ' + o; });
      return fr + '.';
    }).join(' ');
  }

  /* ---------- relatório ---------- */
  function pRecursos(tipo) {
    var R = tab('origem', 'Recursos'), verbo = tipo === 'Agravo de Instrumento' ? 'Agravou' : 'Apelou', out = [];
    if (!R.length) {
      var al = linhas(v('triagem', 'Alegações'));
      out.push(verbo + ' ' + VAL('a parte recorrente') + ' (ID ' + VAL('ID do recurso') + '), alegando, em suma, que: ' + (al.length ? enumerar(al) : VAL('razões, em itens')) + '.');
      return out;
    }
    /* recurso único sem parte lida e contrarrazões de um polo identificado: recorreu o outro polo */
    var C0 = tab('origem', 'Contrarrazões'), pc = R.length === 1 && C0.length === 1 && !S(R[0].parte) ? poloDe(C0[0].parte) : '';
    if (pc) R = [Object.assign({}, R[0], { parte: pc === 're' ? 'autor' : 're' })];
    R.forEach(function (r) {
      /* o título da peça ("Agravo de Instrumento - Fulana x Beltrano", "petição inicial Laerte") não é alegação */
      var rotulo = function (x) { return /\s[xX]\s/.test(x) || /^(agravo|apela[çc][ãa]o|peti[çc][ãa]o|recurso|contrarraz|embargos)\b/i.test(x) && x.split(/\s+/).length <= 8; };
      var L = linhas(r.preliminares).map(function (x) { return 'preliminarmente, ' + x; }).concat(linhas(r.teses).concat(linhas(r.merito)).filter(function (x) { return !rotulo(x); }));
      if (!L.length && R.length === 1) L = linhas(v('triagem', 'Alegações'));
      var ped = S(r.pedidos);
      out.push(verbo + ' ' + quem(r.parte) + ' ' + idOu(r.ids, 'ID do recurso') + ', alegando, em suma, que: ' + (L.length ? enumerar(L) : VAL('razões, em itens')) + (ped ? ', pelo que requereu ' + ped.replace(/^(requer(eu)?|pede)\s+/i, '').replace(/[.;]+$/, '') : '') + '.');
    });
    return out;
  }
  function pContrarrazoes(tipo) {
    var C = tab('origem', 'Contrarrazões'), sit = N(v('origem', 'Contrarrazões - Situação')), nome = /agravo/.test(N(tipo)) ? 'contraminuta' : 'contrarrazões';
    if (C.length) {
      if(/^(nao apresentadas?|nao houve|sem contrarrazoes|sem contraminuta|prazo decorrido sem manifestacao)$/.test(sit))return VAL('divergência entre a situação e as peças de resposta registradas');
      var com = C.filter(function (c) { return S(c.preliminares); });
      if (C.length === 1) return 'Houve ' + nome + ' ' + idOu(C[0].ids, 'ID') + (com.length ? ', com arguição preliminar de ' + linhas(com[0].preliminares).join('; ') : '') + '.';
      return 'Houve ' + nome + ' ' + C.map(function (c, i) { var q = quem(c.parte), d = q.replace(/^(o|a) /, function (m) { return m === 'o ' ? 'do ' : 'da '; }).replace(/^os /, 'dos '); return d + ' ' + idOu(c.ids, 'ID') + (S(c.preliminares) ? ', com arguição preliminar de ' + linhas(c.preliminares).join('; ') : ''); }).reduce(function (a, x, i, L) { return a + (i === 0 ? '' : i === L.length - 1 ? ' e ' : ', ') + x; }, '') + '.';
    }
    if (/^(nao apresentadas?|nao houve|sem contrarrazoes|sem contraminuta|prazo decorrido sem manifestacao|decorrido o prazo sem manifestacao)$/.test(sit)) return 'Não houve ' + nome + '.';
    if (/apresent/.test(sit)) return 'Houve ' + nome + ' (ID ' + VAL('ID') + ').';
    return VAL('Houve ' + nome + ' (ID …). | Não houve ' + nome + '.');
  }
  function pMpf(){
    var m=N(v('triagem','MPF')),s=N(v('triagem','Parecer - Sentido')),id=S(v('triagem','ID do Parecer MPF')),outro=S(v('triagem','Parecer - Sentido (outro)')),o=N(outro),t='';
    if(!id&&m==='nao se aplica')return '';
    if(!id&&m==='intimado sem manifestacao')return 'Intimada, a Procuradoria Regional da República não se manifestou.';
    if(!id&&m!=='com parecer')return '';
    if(m&&m!=='com parecer')return VAL('conferir situação da manifestação do MPF e ID');
    if(/^(sem hipotese de intervencao|ausencia de hipotese de intervencao)$/.test(s)||/^(sem hipotese de intervencao|ausencia de hipotese de intervencao)$/.test(o))return 'A Procuradoria Regional da República '+idOu(id,'ID do parecer')+' deixou de opinar quanto ao mérito, por ausência de hipótese de intervenção.';
    if(/^(sem interesse publico|inexistencia de interesse publico)$/.test(s)||/^(sem interesse publico|inexistencia de interesse publico)$/.test(o))t='opinou pela inexistência de interesse público para intervenção no feito';
    else if(/^(sem exame do merito|nao se manifestou sobre o merito)$/.test(s)||/^(sem exame do merito|nao se manifestou sobre o merito)$/.test(o))t='não se manifestou sobre o mérito da demanda';
    else if(/prosseguimento/.test(s))t='opinou pelo regular prosseguimento do feito';
    else if(/desprovimento|nao provimento/.test(s))t='opinou pelo desprovimento do recurso';
    else if(/parcial.*provimento|provimento.*parcial/.test(s))t='opinou pelo parcial provimento do recurso';
    else if(/^provimento( do recurso)?$/.test(s))t='opinou pelo provimento do recurso';
    else t='opinou '+VAL(outro||'sentido do parecer');
    return 'A Procuradoria Regional da República '+t+' '+idOu(id,'ID do parecer')+'.';
  }
  function relatorio(tipo) {
    var P = [], sid = S(v('origem', 'Sentença - ID')), rn = N(v('origem', 'Sentença - Reexame')) === 'sim', nRec = tab('origem', 'Recursos').length;
    var imp = S(v('triagem', 'Impugnada - ID')), impS = S(v('triagem', 'Impugnada - Síntese'));
    if (tipo === 'Embargos de Declaração') {
      P.push('Trata-se de embargos de declaração contra acórdão '+idOu(v('producao','Acórdão - ID')||imp,'ID do acórdão embargado')+' assim ementado:');
      var literal=S(v('triagem','Impugnada - Ementa literal'));P.push(literal?'“'+literal+'”':VAL('transcrever a ementa literal do acórdão embargado'));
      var pts = linhas(v('triagem', 'ED - Ponto')).concat(linhas(v('triagem', 'Alegações')));
      var vicio = S(v('triagem', 'ED - Vício')).toLowerCase() || VAL('vício alegado');
      P.push('Alegou-se ' + vicio + ', inclusive em prequestionamento, pois: ' + (pts.length ? enumerar(pts) : VAL('pontos, em itens')) + '.');
    } else if (tipo === 'Agravo Interno') {
      P.push('Trata-se de agravo interno à decisão ' + idOu(imp, 'ID da decisão agravada') + ' que ' + (impS || VAL('o que a decisão decidiu')) + '.');
      var fa = linhas(v('triagem', 'AgInt - Fundamentos')).concat(linhas(v('triagem', 'Alegações')));
      var R0 = tab('origem', 'Recursos')[0] || {};
      P.push('Alegou ' + (R0.parte ? quem(R0.parte).replace(/^(a|o) (autora?|réu|ré)$/, function (m, a, b) { return a + ' agravante'; }) : 'o agravante') + ', em suma ' + idOu(R0.ids, 'ID do agravo') + ': ' + (fa.length ? enumerar(fa) : VAL('razões, em itens')) + '.');
      P.push(pContrarrazoes(tipo).replace(/contrarrazões/g, 'contraminuta'));
    } else if (tipo === 'Juízo de Retratação') {
      P.push('Trata-se de juízo de retratação a acórdão da Turma, proferido em ' + (S(v('triagem', 'Impugnada - Data')) ? brD(v('triagem', 'Impugnada - Data')) : VAL('data')) + ', assim ementado ' + idOu(imp, 'ID do acórdão') + ':');
      P.push('“' + (impS || VAL('ementa do acórdão')) + '”');
      var trib = S(v('triagem', 'Retratação - Tribunal')), tema = S(v('triagem', 'Retratação - Tema')), prec = S(v('triagem', 'Retratação - Precedente'));
      P.push('Na tramitação dos recursos excepcionais perante a Vice-Presidência, houve, em ' + (S(v('triagem', 'Retratação - Devolução mês')) || VAL('mês/ano')) + ', decisão para devolução dos autos à Turma para eventual juízo de retratação face ao julgamento do ' + (prec || VAL('precedente')) + ' ' + (trib === 'STJ' ? 'pelo Superior Tribunal de Justiça' : 'pela Suprema Corte') + ' (Tema ' + (tema || VAL('número')) + ') ' + idOu(v('triagem', 'Retratação - Devolução ID'), 'ID') + '.');
    } else if (tipo === 'Agravo de Instrumento') {
      /* no agravo de instrumento a decisão agravada é a de origem (Sentença - ID); "Impugnada" serve ao agravo interno e aos embargos */
      P.push('Trata-se de agravo de instrumento à decisão ' + idOu(imp || sid, 'ID da decisão agravada') + ' que ' + (imp?impS||VAL('o que a decisão agravada decidiu'):resultadoSentenca('decisão')) + '.');
      pRecursos(tipo).forEach(function (x) { P.push(x); });
      P.push(pContrarrazoes(tipo));
    } else if (tipo === 'Remessa Necessária') {
      P.push(aberturaOrigem(tipo));
      P.push(nRec ? VAL('há recurso voluntário: conferir o tipo de julgamento') : 'Sem recurso voluntário, subiram os autos por força da remessa necessária.');
    } else {
      var ab = rn ? 'Trata-se de remessa necessária e de apelação interposta contra sentença ' : nRec > 2 ? 'Trata-se de apelações à sentença ' : nRec === 2 ? 'Trata-se de dupla apelação à sentença ' : 'Trata-se de apelação à sentença ';
      P.push(aberturaOrigem(tipo));
      pRecursos(tipo).forEach(function (x) { P.push(x); });
      P.push(pContrarrazoes(tipo));
    }
    var mp = pMpf(); if (mp) P.push(mp);
    P.push('É o relatório.');
    return P;
  }
  function brD(x) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(x)); return m ? m[3] + '/' + m[2] + '/' + m[1] : S(x); }

  /* ---------- ementa ---------- */
  var RAMOS = [[/previdenc|inss|aposentad|auxilio|beneficio|pensao por morte|salario-maternidade|bpc|loas|assistencial/, 'PREVIDENCIÁRIO'], [/tribut|contribui|pis|cofins|imposto|irpf|irpj|ipi|icms|taxa|execucao fiscal|cda/, 'TRIBUTÁRIO'],
    [/servidor|28,86|militar|licenciamento|concurso|improbidade|licitacao|administrativ|perdimento|aduan/, 'ADMINISTRATIVO'], [/sfh|mcmv|minha casa|contrato|dano moral|responsabilidade civil|consumidor|fies|caixa/, 'CIVIL'],
    [/saude|medicamento|sus\b|tratamento/, 'CONSTITUCIONAL E ADMINISTRATIVO'], [/ambient|ibama/, 'AMBIENTAL'], [/indigena|funai|terra/, 'CONSTITUCIONAL']];
  function ramo() {
    var informado=S(v('triagem','Ramo do direito'));if(informado)return informado.replace(/^direito\s+/i,'').toUpperCase();
    var t = N([fo('Assunto'), v('triagem', 'Assunto detalhado'), v('triagem', 'Registro - Assunto detalhado'), v('triagem', 'Tema')].join(' '));
    for (var i = 0; i < RAMOS.length; i++) if (RAMOS[i][0].test(t)) return RAMOS[i][1];
    return VAL('RAMO');
  }
  function classeEmenta(tipo) {
    var cl = N(fo('classe_judicial') || fo('Classe')), base = /agravo de instrumento/.test(cl) ? 'AGRAVO DE INSTRUMENTO' : /remessa/.test(cl) && !/apela/.test(cl) ? 'REMESSA NECESSÁRIA' : /mandado/.test(cl) ? 'APELAÇÃO EM MANDADO DE SEGURANÇA' : 'APELAÇÃO CÍVEL';
    if (tipo === 'Embargos de Declaração') return 'EMBARGOS DE DECLARAÇÃO EM ' + base;
    if (tipo === 'Agravo Interno') return 'AGRAVO INTERNO EM ' + base;
    if (tipo === 'Juízo de Retratação') return 'JUÍZO DE RETRATAÇÃO EM ' + base;
    if (tipo === 'Remessa Necessária') return 'REMESSA NECESSÁRIA';
    if (tipo === 'Agravo de Instrumento') return 'AGRAVO DE INSTRUMENTO';
    return N(v('origem', 'Sentença - Reexame')) === 'sim' ? 'REMESSA NECESSÁRIA E ' + base : base;
  }
  function assuntoCx() {
    var a = S(v('triagem', 'Registro - Assunto detalhado')) || S(v('triagem', 'Assunto detalhado')) || fo('Assunto');
    a = a.replace(/\s*\(\d+\)\s*/g, ' ').split(/\s*[|›>]\s*|\s*-\s+(?=[A-ZÁ-Ú])/).filter(Boolean).slice(-2).join('. ');
    return a ? a.toUpperCase().replace(/\.+$/, '') : VAL('ASSUNTO');
  }
  function ementa(tipo, k) {
    var R = resultado(tipo, k), n = 0, it = function (t) { n++; return { n: n, t: t }; }, I = [], II = [], III = [], IV = [];
    var cab = 'DIREITO ' + ramo() + '. ' + classeEmenta(tipo) + '. ' + assuntoCx() + '. ' + R[2] + '.';
    if (tipo === 'Embargos de Declaração') I.push(it('Embargos de declaração opostos contra acórdão que ' + VAL('resultado do acórdão embargado') + ', alegando ' + (S(v('triagem', 'ED - Vício')).toLowerCase() || VAL('vício alegado')) + '.'));
    else if (tipo === 'Agravo Interno') I.push(it('Agravo interno contra decisão que ' + (S(v('triagem', 'Impugnada - Síntese')) || VAL('o que a decisão decidiu')) + '.'));
    else if (tipo === 'Juízo de Retratação') I.push(it('Juízo de retratação de acórdão da Turma, após devolução dos autos pela Vice-Presidência, em razão do Tema ' + (S(v('triagem', 'Retratação - Tema')) || VAL('número')) + '.'));
    else if (tipo === 'Remessa Necessária') I.push(it('Remessa necessária de sentença que ' + resultadoSentenca() + '.'));
    else if (tipo === 'Agravo de Instrumento') I.push(it('Agravo de instrumento contra decisão que ' + (S(v('origem', 'Sentença - ID')) || !S(v('triagem', 'Impugnada - Síntese')) ? resultadoSentenca('decisão') : S(v('triagem', 'Impugnada - Síntese'))) + '.'));
    else I.push(it((N(v('origem', 'Sentença - Reexame')) === 'sim' ? 'Remessa necessária e ' + (tab('origem', 'Recursos').length > 1 ? 'apelações' : 'apelação') : tab('origem', 'Recursos').length > 1 ? 'Apelações' : 'Apelação') + ' contra sentença que ' + resultadoSentenca() + '.'));
    var Q = linhas(v('triagem', 'Alegações')); if (!Q.length) Q = linhas(v('triagem', 'ED - Ponto'));
    if (Q.length <= 1) II.push(it('A questão em discussão consiste em saber se ' + VAL(Q[0] ? 'reescrever como pergunta: ' + Q[0] : 'questão') + '.'));
    else { var nn = ['duas', 'três', 'quatro', 'cinco', 'seis'][Math.min(Q.length, 6) - 2]; II.push(it('Há ' + nn + ' questões em discussão: ' + Q.slice(0, 6).map(function (q, i) { return '(' + ['i', 'ii', 'iii', 'iv', 'v', 'vi'][i] + ') saber se ' + VAL(q); }).reduce(function (a, x, i, L) { return a + (i === 0 ? '' : i === L.length - 1 ? '; e ' : '; ') + x; }, '') + '.')); }
    (Q.length ? Q.slice(0, 6) : ['']).forEach(function (q, i) { III.push(it(VAL('fundamento' + (Q.length > 1 ? ' da questão (' + ['i', 'ii', 'iii', 'iv', 'v', 'vi'][i] + ')' : '')))); });
    IV.push(it(R[3]));
    return { cab: cab, sec: [['I. Caso em exame', I], ['II. Questão em discussão', II], ['III. Razões de decidir', III], ['IV. Dispositivo', IV]],
      rod: ['Dispositivos relevantes citados: ' + VAL('CF/1988, artigo …; Lei …/…, artigo …; e CPC, artigo …') + '.', 'Jurisprudência relevante citada: ' + VAL('STF, …; STJ, …; e TRF-3, …') + '.'] };
  }

  /* ---------- montagem ---------- */
  function docs() {
    var tipo = ST.tipo || tipoDetectado(), k = ST.res || resDaFicha(tipo);
    if (k && !opcoesRes(tipo).some(function (o) { return o[0] === k; })) k = '';
    TIPO = tipo;
    var R = resultado(tipo, k), E = ementa(tipo, k);
    return { tipo: tipo, k: k, rel: relatorio(tipo), disp: ['Ante o exposto, ' + R[0] + '.', 'É como voto.'], em: E,
      acordao: 'Vistos e relatados estes autos em que são partes as acima indicadas, a Turma Regional de Mato Grosso do Sul, por unanimidade, ' + R[1] + ', nos termos do relatório e voto que ficam fazendo parte integrante do presente julgado.',
      procl: 'Por unanimidade, ' + R[1] + '.' };
  }
  function marca(t) { return esc(t).replace(/\[VALIDAR:[^\]]*\]/g, function (m) { return '<mark class="gv">' + m + '</mark>'; }); }
  function emTexto(E) { return E.cab + '\n' + E.sec.map(function (s) { return s[0] + '\n' + s[1].map(function (x) { return x.n + '. ' + x.t; }).join('\n'); }).join('\n') + '\n__________\n' + E.rod.join('\n'); }
  function emHtml(E) { return '<p><b>' + esc(E.cab) + '</b></p>' + E.sec.map(function (s) { return '<p><b>' + esc(s[0]) + '</b></p>' + s[1].map(function (x) { return '<p><b>' + x.n + '.</b> ' + esc(x.t) + '</p>'; }).join(''); }).join('') + '<p>__________</p>' + E.rod.map(function (r) { var i = r.indexOf(':'); return '<p><i>' + esc(r.slice(0, i + 1)) + '</i>' + esc(r.slice(i + 1)) + '</p>'; }).join(''); }
  function bloco(id, titulo, html, nVal) {
    return '<section class="card pc-sec gr-doc" id="gr-' + id + '"><div class="pc-sh"><h3>' + titulo + '</h3>' + (nVal ? '<small class="gr-nv" title="Trechos a conferir ou completar">' + nVal + ' a validar</small>' : '<small class="muted">pronto</small>') +
      '<button type="button" class="btn sm" data-gr-copia="' + id + '" title="Copiar para colar no PJe (com negrito e itálico)">Copiar</button></div><div class="gr-tx tx-j">' + html + '</div></section>';
  }
  function conta(t) { return (String(t).match(/\[VALIDAR:/g) || []).length; }
  var ULT = null;
  function html() {
    var g = GB(); if (!g.cnj || !g.cnj()) return '<div class="empty">Abra um processo no PJe para gerar as peças.</div>';
    if (g.modelo && !g.modelo()) return '<div class="empty">Lendo o prontuário do processo ' + esc(g.cnj()) + '…</div>';
    /* 0.52.1 · ato monocrático: relatório e ementa do Gerador são de acórdão; a decisão monocrática se monta na Minuta-Matriz do Compendium */
    if (g.destino && g.destino() === 'monocratica') return '<section class="card pc-sec gr-cfg"><div class="pc-sh"><h3>Gerador</h3><small class="muted">ato monocrático</small></div>' +
      '<p class="muted">O Gerador monta relatório e ementa de acórdão. Este processo está com destino monocrático: a decisão se monta na Minuta-Matriz do Compendium (pronunciamento Monocrática). Se o destino estiver errado, corrija-o no cartão do processo.</p></section>';
    if (ST.cnj !== g.cnj()) { ST.cnj = g.cnj(); ST.tipo = ''; ST.res = ''; }
    var D = docs(); ULT = D;
    var chips = function (L, at, sel) { return L.map(function (o) { var k = Array.isArray(o) ? o[0] : o, r = Array.isArray(o) ? o[1] : o; return '<button type="button" class="chip' + (k === sel ? ' on' : '') + '" ' + at + '="' + esc(k) + '">' + esc(r) + '</button>'; }).join(''); };
    var relT = D.rel.join('\n'), emT = emTexto(D.em);
    var ai = D.tipo === 'Agravo de Instrumento';
    var aviso = !S(v('origem', 'Sentença - Resultado')) && !/Embargos|Interno|Retrata/.test(D.tipo) ? '<p class="gr-av">' + (ai ? 'A decisão agravada ainda não foi lida: em Prontuário › Autos › Peças e documentos › Decisão agravada, use "Extrair da peça" para trazer o que ela decidiu.' : 'A sentença ainda não foi lida: em Prontuário › Autos › Peças e documentos › Sentença, use "Extrair da peça" para trazer resultado e honorários.') + ' <button type="button" class="lnk" data-gr-ir="Autos">Abrir Autos</button></p>' : '';
    return '<section class="card pc-sec gr-cfg"><div class="pc-sh"><h3>Gerador</h3><small class="muted">padrão do gabinete · nada é gravado</small></div>' +
      '<div class="gr-l"><span>Tipo de julgamento</span><div class="chips">' + chips(TIPOS, 'data-gr-tipo', D.tipo) + '</div></div>' +
      '<div class="gr-l"><span>Resultado</span><div class="chips">' + chips(opcoesRes(D.tipo), 'data-gr-res', D.k) + '</div></div>' + (D.k ? '' : '<p class="gr-av">Sem resultado do voto na ficha: escolha o resultado acima para completar a ementa (cabeçalho e item IV).</p>') + aviso + '</section>' +
      bloco('rel', 'Relatório', D.rel.map(function (p) { return '<p>' + marca(p) + '</p>'; }).join(''), conta(relT)) +
      (PECAS.disp ? bloco('disp', 'Dispositivo do voto', D.disp.map(function (p) { return '<p>' + marca(p) + '</p>'; }).join(''), conta(D.disp.join(' '))) : '') +
      bloco('em', 'Ementa', '<p class="gr-cab"><b>' + marca(D.em.cab) + '</b></p>' + D.em.sec.map(function (s) { return '<p><b>' + esc(s[0]) + '</b></p>' + s[1].map(function (x) { return '<p><b>' + x.n + '.</b> ' + marca(x.t) + '</p>'; }).join(''); }).join('') + '<p>__________</p>' + D.em.rod.map(function (r) { var i = r.indexOf(':'); return '<p><i>' + esc(r.slice(0, i + 1)) + '</i>' + marca(r.slice(i + 1)) + '</p>'; }).join(''), conta(emT)) +
      (PECAS.ac ? bloco('ac', 'Acórdão', '<p>' + marca(D.acordao) + '</p>', conta(D.acordao)) : '') +
      (PECAS.pr ? bloco('pr', 'Proclamação do julgamento', '<p>' + marca(D.procl) + '</p>', conta(D.procl)) : '');
  }
  function textos(id) {
    var D = ULT || docs();
    if (id === 'rel') return { t: 'RELATÓRIO\n\n' + D.rel.join('\n\n'), h: D.rel.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') };
    if (id === 'disp') return { t: D.disp.join('\n\n'), h: D.disp.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') };
    if (id === 'em') return { t: emTexto(D.em), h: emHtml(D.em) };
    if (id === 'ac') return { t: D.acordao, h: '<p>' + esc(D.acordao) + '</p>' };
    return { t: D.procl, h: '<p>' + esc(D.procl) + '</p>' };
  }
  function copiar(id, b) {
    var x = textos(id), ok = function () { if (b) { var o = b.textContent; b.textContent = 'Copiado'; setTimeout(function () { b.textContent = o; }, 1100); } };
    try {
      if (window.ClipboardItem && navigator.clipboard.write) { navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([x.t], { type: 'text/plain' }), 'text/html': new Blob([x.h], { type: 'text/html' }) })]).then(ok, function () { navigator.clipboard.writeText(x.t).then(ok); }); return; }
    } catch (e) {}
    navigator.clipboard.writeText(x.t).then(ok, function () {});
  }
  /* cliques: tratados pelo gabinete.js (delegação), que chama acao() */
  function acao(b) {
    if (b.dataset.grTipo) { ST.tipo = b.dataset.grTipo; ST.res = ''; return true; }
    if (b.dataset.grRes) { ST.res = b.dataset.grRes; return true; }
    if (b.dataset.grCopia) { copiar(b.dataset.grCopia, b); return false; }
    if (b.dataset.grIr) { if (window.MutaAbas) window.MutaAbas.ir('pront'); if (GB().ir) GB().ir(b.dataset.grIr); return false; }
    return false;
  }
  /* ---------- 0.38: a casa do Gerador é a aba Minuta (Comparar | Gerador) ---------- */
  var MM_K = 'hero18810:minModo';
  function $(id) { return typeof document !== 'undefined' ? document.getElementById(id) : null; }
  /* 0.45: a aba Collectio da Minuta é só do gestor */
  function gestor() { var x = window.MutaSessao && window.MutaSessao.estado ? window.MutaSessao.estado() : {}; return x.estado === 'on' && !!x.gestor; }
  function modoMin() { try { var m = localStorage.getItem(MM_K); return m === 'ger' || m === 'conf' || m === 'dir' || (m === 'lote' && gestor()) ? m : 'cmp'; } catch (e) { return 'cmp'; } }
  function visivel() { var p = $('panel-min'), g = $('ger-app'); return !!(p && !p.hidden && g && !g.hidden); }
  function pintar(forca) {
    var g = $('ger-app'); if (!g || (!forca && !visivel())) return;
    var p = $('panel-min'), y = p ? p.scrollTop : 0;
    try { g.innerHTML = html(); } catch (e) { g.innerHTML = '<div class="empty">Gerador indisponível: ' + esc(e && e.message || e) + '</div>'; }
    if (p) p.scrollTop = y;
  }
  function modo(m) {
    m = m === 'ger' || m === 'conf' || m === 'dir' || (m === 'lote' && gestor()) ? m : 'cmp'; try { localStorage.setItem(MM_K, m); } catch (e) {}
    var bl = typeof document !== 'undefined' ? document.querySelector('[data-mm="lote"]') : null; if (bl) bl.hidden = !gestor();
    var ger = m === 'ger';
    /* Comparar (com o Collectio embaixo) | Gerador | Conformidade */
    var ca = $('cmp-app'); if (ca) ca.hidden = m !== 'cmp';
    /* 0.45: o Collectio saiu de baixo do Comparar e virou aba própria, só do gestor */
    var pl = $('panel-lote'); if (pl) { pl.hidden = m !== 'lote'; if (m === 'lote') { pl.open = true; if (window.MutaLote && window.MutaLote.abrir) window.MutaLote.abrir(); } }
    var g = $('ger-app'); if (g) g.hidden = !ger;
    var cf = $('min-conf'); if (cf) cf.hidden = m !== 'conf';
    var dr = $('dir-app'); if (dr) dr.hidden = m !== 'dir';
    if (m === 'dir' && window.MutaDiretrizes && window.MutaDiretrizes.abrir) window.MutaDiretrizes.abrir();
    if (m === 'conf' && window.MutaConformidade && window.MutaConformidade.abrir) window.MutaConformidade.abrir();
    if (typeof document !== 'undefined') Array.prototype.forEach.call(document.querySelectorAll('[data-mm]'), function (b) { b.setAttribute('aria-selected', String(b.dataset.mm === m)); });
    if (ger) pintar(true);
  }
  function abrir() { modo(modoMin()); }
  try { if (window.MutaSessao && window.MutaSessao.ouvir) window.MutaSessao.ouvir(function () { var p = $('panel-min'); if (p && !p.hidden) modo(modoMin()); else { var b = typeof document !== 'undefined' ? document.querySelector('[data-mm="lote"]') : null; if (b) b.hidden = !gestor(); } }); } catch (e) {}
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-mm]') : null;
    if (t) { modo(t.dataset.mm); return; }
    var b = e.target && e.target.closest ? e.target.closest('#ger-app button') : null;
    if (b && acao(b)) pintar(true);
  });
  /* Composição compartilhada: recebe apenas os dados registrados do CNJ, sem recorrer ao estado da extensão. */
  /* Fórmulas de sucumbência consultivas: nenhum dado vazio é tratado como negativa. */
  function honorariosEditorial(tipo){
    var r=resDaFicha(tipo),sol=N(v('producao','Voto - Honorários')),sol2=N(v('producao','Honorários recursais')),cls=N(fo('classe_judicial')||fo('Classe')),tj=N(v('triagem','Tipo de Julgamento')),R=tab('origem','Recursos'),C=tab('origem','Sucumbência da decisão recorrida');
    var livre=S(v('producao','Fundamento da sucumbência')),texto='',item='',validar=function(x){return {texto:VAL(x),ementa:''};};
    if(/mandado de seguranca|msciv/.test(cls+' '+tj)){
      if(sol==='majorados'||sol2==='majorados')return validar('mandado de segurança: conferir solução de honorários incompatível com artigo 25 da Lei 12.016/2009');
      return {texto:'Sem condenação em honorários advocatícios (artigo 25 da Lei 12.016/2009 e Súmula 512/STF).',ementa:''};
    }
    if(R.length>1||tab('producao','Resultado por recurso').length>1)return validar('individualizar a sucumbência por recurso e recorrente; não aplicar uma fórmula global');
    if(r==='prov'||r==='parc'){
      if(sol==='majorados'||sol2==='majorados')return validar('resultado provido: incompatível com majoração pelo Tema 1.059/STJ');
      if(/invertidos|redistribuidos|fixados/.test(sol))return livre?{texto:livre,ementa:''}:validar('redimensionamento da sucumbência, critérios e base de cálculo');
      return {texto:'Por fim, deixa-se de determinar a majoração dos honorários advocatícios, nos termos do Tema 1.059/STJ.',ementa:''};
    }
    if(tipo==='Remessa Necessária'||tipo==='Embargos de Declaração'||tipo==='Agravo Interno'||tipo==='Juízo de Retratação')return livre?{texto:livre,ementa:''}:validar('conferir o cabimento de honorários nesta espécie de julgamento');
    if(tipo==='Agravo de Instrumento')return livre?{texto:livre,ementa:''}:validar('conferir natureza da decisão agravada e cabimento de honorários');
    if(r!=='desp'&&r!=='nc')return livre?{texto:livre,ementa:''}:validar('resultado e solução da sucumbência, inclusive eventual anulação ou perda do objeto');
    var pub=S(v('origem','Sentença - Publicação')),date=S(v('origem','Sentença - Data'));
    if(/^\d{4}-\d{2}-\d{2}$/.test(pub)&&pub<'2016-03-18'){
      if(sol==='majorados'||sol2==='majorados')return validar('publicação anterior a 18/03/2016: conferir incompatibilidade com Enunciado Administrativo 7/STJ');
      return validar('não majorar pelo artigo 85, § 11: publicação anterior a 18/03/2016; validar redação');
    }
    if(!(/^\d{4}-\d{2}-\d{2}$/.test(pub)&&pub>='2016-03-18')&&!(/^\d{4}-\d{2}-\d{2}$/.test(date)&&date>='2016-03-18'))return validar('data de publicação da decisão recorrida e regime temporal');
    if(C.length&&C.every(function(x){return /^(nao|nao se aplica)$/.test(N(x.honorarios));})||/^sem (?:condenacao em )?honorarios/.test(N(v('origem','Sentença - Honorários')))){
      return validar('sem honorários previamente fixados: não majorar verba inexistente; validar redação');
    }
    if(sol!=='majorados'&&sol2!=='majorados')return livre?{texto:livre,ementa:''}:validar('confirmar solução dos honorários recursais');
    if(sol&&sol!=='majorados'||sol2&&sol2!=='majorados'&&sol2!=='a definir')return validar('divergência entre os campos de honorários do julgamento');
    if(!R.length||!S(R[0].parte))return validar('identificar recorrente e devedor da verba fixada na origem');
    var parte=R[0].parte,polo=poloDe(parte),P=polos(),unico=polo==='autor'?P.aN<=1:polo==='re'?P.pN<=1:false,match=C.filter(function(x){return N(x.honorarios)==='sim'&&S(x.devedor)&&(N(x.devedor)===N(parte)||(unico&&polo&&poloDe(x.devedor)===polo));});
    if(!match.length)return validar('confirmar honorários previamente fixados contra o recorrente');
    var pct=S(v('producao','Honorários - Percentual ou valor'));if(!/^\d+(?:[.,]\d+)?\s*%$/.test(pct))return validar('percentual de majoração confirmado pelo servidor');
    if(!match.every(function(x){return S(x.base)&&S(x.criterio)&&(/^(sim|nao|nao se aplica)$/.test(N(x.suspensao))||/^(indeferida|nao se aplica|revogada)$/.test(N(x.gratuidade)));}))return validar('base, critério e exigibilidade dos honorários na origem');
    if(!polo&&!porNome(parte))return validar('designação da parte recorrente');
    var nome=porNome(parte)||(polo==='autor'?'a parte autora':'a parte ré'),grat=match.every(function(x){return N(x.gratuidade)==='deferida'&&N(x.suspensao)==='sim';});
    if(match.some(function(x){return N(x.gratuidade)==='deferida'||N(x.suspensao)==='sim';})&&!grat)return validar('gratuidade e suspensão da exigibilidade do recorrente');
    texto='Pela sucumbência recursal, '+nome+' deve suportar condenação adicional (artigo 85, § 11, do CPC), no equivalente a '+pct.replace(/\s+/g,'')+', a ser acrescido ao fixado na origem'+(grat?', observada a gratuidade de justiça concedida (artigo 98, § 3º, do CPC)':'')+'.';
    if(livre)texto=livre;item=(r==='desp'?'Apelação desprovida':'Apelação não conhecida')+', honorários recursais em acréscimo ao fixado na origem.';
    return {texto:texto,ementa:item};
  }
  function variaveisEditorial(tipo,rel,em){
    var rec=tab('origem','Recursos'),rs=/^(Apelação|Agravo de Instrumento)$/.test(tipo)?pRecursos(tipo):[],hon=honorariosEditorial(tipo),d=resultado(tipo,resDaFicha(tipo)),sid=S(v('origem','Sentença - ID')),imp=S(v('triagem','Impugnada - ID'));
    var literal=S(v('triagem','Impugnada - Ementa literal')),per=S(v('triagem','Parecer - Sentido'));
    return {razoes_primeiro_recurso:rs[0]||VAL('razões do primeiro recurso'),razoes_segundo_recurso:rec.length>1&&rs[1]||VAL('razões do segundo recurso'),razoes_agravo_interno:tipo==='Agravo Interno'?rel[1]:VAL('razões do agravo interno'),vicios_relatorio:tipo==='Embargos de Declaração'?rel[2]:VAL('vícios alegados'),ementa_embargada_literal:literal||VAL('transcrever ementa literal'),sentenca_paragrafo:'A sentença '+idOu(sid,'ID da sentença')+' '+comandosOrigem()+'. '+honorariosAbertura(),parecer_sentido_redacional:/^nao provimento|^desprovimento/.test(N(per))?'desprovimento':/^parcial.*provimento/.test(N(per))?'parcial provimento':/^provimento/.test(N(per))?'provimento':VAL('sentido do parecer'),dispositivo_voto:S(v('producao','Dispositivo do pronunciamento'))||'Ante o exposto, '+d[0]+'.',honorarios_recursais_texto:hon.texto,honorarios_ementa:hon.ementa,dispositivo_ementa_ficha:hon.ementa||d[3],acordao_recorrido_id:S(v('producao','Acórdão - ID'))||imp||VAL('ID do acórdão'),decisao_agravada_id:imp||VAL('ID da decisão agravada')};
  }
  function comporFicha(campos, fonte, tipo){var ant=CONTEXTO,t0=TIPO;try{CONTEXTO={V:function(sec,k){return campos[sec+'.'+k];},fo:function(){return fonte||{};}};TIPO=tipo||tipoDetectado();var rel=relatorio(TIPO),em=ementa(TIPO,resDaFicha(TIPO)),R={abertura_relatorio:rel[0],razoes_recursais:/^(Apelação|Agravo de Instrumento)$/.test(TIPO)?pRecursos(TIPO).join('\n\n'):'',contrarrazoes_relatorio:pContrarrazoes(TIPO),parecer_relatorio:pMpf()||'',caso_em_exame:em.sec[0][1].map(function(x){return x.t;}).join('\n'),questao_em_discussao:em.sec[1][1].map(function(x){return x.t;}).join('\n')};if(/^(Apelação|Remessa Necessária|Agravo de Instrumento)$/.test(TIPO)){R.resultado_decisao_recorrida=resultadoSentenca();R.comandos_dispositivos=comandosOrigem();R.frase_honorarios_origem=honorariosAbertura();}Object.assign(R,variaveisEditorial(TIPO,rel,em));if(R.honorarios_ementa)em.sec[3][1][0].t=R.honorarios_ementa;return {tipo:TIPO,rel:rel,em:em,variaveis:R};}finally{CONTEXTO=ant;TIPO=t0;}}
  window.MutaGerador = { comporFicha: comporFicha, pintar: pintar, abrir: abrir, modo: modo, html: html, acao: acao, docs: docs, _ST: ST, _t: { resultado: resultado, fraseHonorarios: fraseHonorarios, designa: designa, feminino: feminino } };
})();
