/* Siglas das classes processuais (Tabela Processual Unificada do CNJ) usadas no 2º grau do TRF-3, para a etiqueta da classe
   no prontuário, na aba Pauta e nos cartões. [VALIDAR] conferir cada sigla na TPU do CNJ antes de tratar como definitiva.
   Recurso julgado dentro do processo (ED, AgInt, juízo de retratação) entra como sufixo: "ApCiv · ED".
   Cópia em extensao/padrao-classes-cnj.js (manter iguais). */
(function (raiz) {
  'use strict';
  var N = function (s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  /* [sigla, nome, expressão do nome por extenso] — a ordem importa: o mais específico antes */
  var CLASSES = [
    ['ApelRemNec', 'Apelação / Remessa Necessária', /apela\w*\s*\/?\s*(e\s*)?remessa necess/],
    ['RemNecCiv', 'Remessa Necessária Cível', /remessa necess/],
    ['ApCrim', 'Apelação Criminal', /apela\w* crim/],
    ['ApCiv', 'Apelação Cível', /apela/],
    ['AI', 'Agravo de Instrumento', /agravo de instrumento/],
    ['MSCiv', 'Mandado de Segurança Cível', /mandado de seguran/],
    ['AgIntCiv', 'Agravo Interno Cível', /agravo interno/],
    ['EDCiv', 'Embargos de Declaração Cível', /embargos de declara/],
    ['CC', 'Conflito de Competência', /conflito de compet/],
    ['AR', 'Ação Rescisória', /acao rescis/],
    ['HC', 'Habeas Corpus', /habeas corpus/]
  ];
  var REC = { ed: 'ED', agint: 'AgInt', ret: 'JR', jr: 'JR' };
  /* sigla a partir do que vier: "ApCiv - APELAÇÃO CÍVEL", "ApCiv", "APELAÇÃO CÍVEL" */
  function sigla(classe) {
    var c = String(classe || '').trim(); if (!c) return null;
    var m = /^([A-Za-z]{2,14})\s*-\s*(.+)$/.exec(c);
    if (m) { var x = CLASSES.filter(function (k) { return k[0].toLowerCase() === m[1].toLowerCase(); })[0]; return { s: x ? x[0] : m[1], nome: x ? x[1] : m[2].trim() }; }
    if (/^[A-Za-z]{2,14}$/.test(c)) { var y = CLASSES.filter(function (k) { return k[0].toLowerCase() === c.toLowerCase(); })[0]; return { s: y ? y[0] : c, nome: y ? y[1] : c }; }
    var n = N(c); for (var i = 0; i < CLASSES.length; i++) if (CLASSES[i][2].test(n)) return { s: CLASSES[i][0], nome: CLASSES[i][1] };
    return null;
  }
  /* etiqueta: classe + recurso julgado dentro do processo; tipos = { ed:1 } (Roteiro) ou texto do tipo de julgamento */
  function etiqueta(classe, tipos) {
    var b = sigla(classe), r = '';
    if (tipos && typeof tipos === 'object') { for (var k in REC) if (tipos[k]) { r = REC[k]; break; } }
    else { var t = N(tipos); r = /embargos de declara/.test(t) ? 'ED' : /agravo interno/.test(t) ? 'AgInt' : /retrata/.test(t) ? 'JR' : ''; }
    if (!b && !r) return null;
    if (b && r && ((r === 'ED' && b.s === 'EDCiv') || (r === 'AgInt' && b.s === 'AgIntCiv'))) r = '';
    return { t: (b ? b.s : '') + (b && r ? ' · ' : '') + r, nome: (b ? b.nome : '') + (r ? (b ? ' · ' : '') + ({ ED: 'embargos de declaração', AgInt: 'agravo interno', JR: 'juízo de retratação' })[r] : '') };
  }
  raiz.ClassesCNJ = { sigla: sigla, etiqueta: etiqueta, CLASSES: CLASSES };
})(typeof window !== 'undefined' ? window : globalThis);
