/**
 * Planilhas do Google Drive ⇄ Pauta da equipe (trf3-muta.vercel.app/equipe/)
 *
 * Um único projeto do Apps Script (script.google.com), fora das planilhas, cuida de todas:
 *   - Pautas: um arquivo por bimestre na pasta "CMT - Pautas de Julgamento", uma aba por sessão, no molde Controle de Pauta;
 *   - Monocráticas — Gabinete CMT: uma aba por mês de registro;
 *   - Controles especiais — Gabinete CMT: Metas, Sobrestados, Casos sensíveis.
 * Edição numa planilha → vai ao app na hora (gatilho "ao editar" de cada arquivo).
 * Mudança no app → chega à planilha em até 1 minuto (gatilho de tempo; fora do expediente, a cada 15 minutos).
 * Colunas sem campo no app (processo, classe, assunto, tarefa, pendências, apreciação…) voltam ao valor do app na sincronização seguinte.
 *
 * Instalação: ver LEIAME.md nesta pasta. Em resumo: colar este código num projeto novo, preencher CMT_TOKEN em
 * Configurações do projeto › Propriedades do script e executar instalar() uma vez (autorizar).
 */
var CFG = {
  url: 'https://trf3-muta.vercel.app/api/pauta?planilha=1',
  pastaPautas: '1cW17K0zjGEn6g_MkNCcs4gUjw4dbJV4H',                       // CMT - Pautas de Julgamento
  modeloPauta: '1VOquSz1KdF9k6FegjyQTlgTNMZVVwhIQP334nLlojgw',             // arquivo copiado quando começa um bimestre novo
  bimestres: { '2026-6': '1VOquSz1KdF9k6FegjyQTlgTNMZVVwhIQP334nLlojgw' },
  mono: '1QmFglkkj8aSPBo3zQ_ZTpxc1wfAU293EEFOr6kXrFvc',                    // Monocráticas — Gabinete CMT
  controles: '10RVnMsONDrzKNH2cLx-71XAIffvlDvsdz0wg67VckYk'                // Controles especiais — Gabinete CMT
};
var PAUTA_CAB_LINHA = 20, PAUTA_INI = 21, PAUTA_MAX = 300;
var COLS_DATA = { 'Minutado em': 1, 'Na tarefa desde': 1, 'Revisado em': 1, 'Para assinatura em': 1, 'Registrada em': 1, 'Distribuído': 1, 'Prazo': 1,
  'Desde': 1, 'Previsão de retirada': 1, 'Última verificação': 1, 'Próxima verificação': 1 };
var ABA_TIPO = { 'Metas': 'metas', 'Sobrestados': 'sobr', 'Casos sensíveis': 'sens' };
var PEND_SEG = 150;   // célula editada há menos disso não é sobrescrita pela sincronização

/* ============================ instalação ============================ */
function instalar() {
  var P = PropertiesService.getScriptProperties();
  if (String(P.getProperty('CMT_TOKEN') || '').length < 24) throw new Error('Preencha CMT_TOKEN em Configurações do projeto › Propriedades do script (o mesmo valor de CMT_PLANILHA_TOKEN na Vercel).');
  var A = {}; A[CFG.mono] = 'mono'; A[CFG.controles] = 'controles';
  Object.keys(CFG.bimestres).forEach(function (b) { A[CFG.bimestres[b]] = 'pauta'; });
  P.setProperty('ARQ', JSON.stringify(A)); P.setProperty('BIM', JSON.stringify(CFG.bimestres)); P.deleteProperty('V');
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sincronizar').timeBased().everyMinutes(1).create();
  Object.keys(A).forEach(gatilhoEdicao_);
  sincronizar(true);
  Logger.log('Pronto: ' + Object.keys(A).length + ' planilhas ligadas ao app.');
}
function gatilhoEdicao_(id) { ScriptApp.newTrigger('aoEditar').forSpreadsheet(id).onEdit().create(); }
function desinstalar() { ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); }); }
function arquivos_() { return JSON.parse(PropertiesService.getScriptProperties().getProperty('ARQ') || '{}'); }

/* ============================ comunicação com o app ============================ */
function chamar_(metodo, query, corpo) {
  var o = { method: metodo, muteHttpExceptions: true, headers: { 'X-CMT-Planilha': PropertiesService.getScriptProperties().getProperty('CMT_TOKEN') } };
  if (corpo) { o.contentType = 'application/json'; o.payload = JSON.stringify(corpo); }
  var r = UrlFetchApp.fetch(CFG.url + (query || ''), o), c = r.getResponseCode(), t = r.getContentText();
  var j; try { j = JSON.parse(t); } catch (e) { j = { erro: t.slice(0, 200) }; }
  if (c >= 300) throw new Error('App respondeu ' + c + ': ' + (j.erro || ''));
  return j;
}

/* ============================ planilha → app ============================ */
function aoEditar(e) {
  if (!e || !e.range) return;
  var ss = e.source, tipoArq = arquivos_()[ss.getId()]; if (!tipoArq) return;
  var sh = e.range.getSheet(), nome = sh.getName(), cabLinha, ini, tipo, data = '';
  if (tipoArq === 'pauta') { cabLinha = PAUTA_CAB_LINHA; ini = PAUTA_INI; tipo = 'pauta'; data = isoDe_(sh.getRange('R1').getDisplayValue()); if (!data) return; }
  else if (tipoArq === 'mono') { cabLinha = 1; ini = 2; tipo = 'mono'; }
  else { tipo = ABA_TIPO[nome]; if (!tipo) return; cabLinha = 1; ini = 2; }
  var r0 = Math.max(e.range.getRow(), ini), r1 = e.range.getLastRow(); if (r1 < r0) return;
  var c0 = e.range.getColumn(), nc = e.range.getNumColumns(), ult = sh.getLastColumn();
  var cab = sh.getRange(cabLinha, 1, 1, ult).getDisplayValues()[0], ip = cab.indexOf('Processo'); if (ip < 0) return;
  var linhas = sh.getRange(r0, 1, r1 - r0 + 1, ult).getDisplayValues(), ed = [], marca = [];
  linhas.forEach(function (L, i) {
    var cnj = L[ip]; if (String(cnj).replace(/\D/g, '').length !== 20) return;
    for (var c = c0; c < c0 + nc && c <= ult; c++) {
      var col = cab[c - 1]; if (!col) continue;
      ed.push({ tipo: tipo, data: data, cnj: cnj, coluna: col, valor: L[c - 1] });
      marca.push((r0 + i) + ':' + c);
    }
  });
  if (!ed.length) return;
  pendMarcar_(ss.getId(), nome, marca);
  try {
    var r = chamar_('post', '', { edicoes: ed }), err = (r.resultados || []).filter(function (x) { return x.erro; });
    if (err.length) ss.toast(err.map(function (x) { return x.cnj + ': ' + x.erro; }).join('\n').slice(0, 300), 'Pauta da equipe: não gravado', 8);
  } catch (x) {
    filaGuardar_(ed); ss.toast('Sem conexão com o app agora; a edição vai na próxima sincronização.', 'Pauta da equipe', 6);
  }
}
/* células editadas há pouco (por aba): a sincronização não as sobrescreve enquanto o app não confirma */
function chavePend_(id, aba) { return 'pend:' + id.slice(-16) + ':' + aba; }
function pendMarcar_(id, aba, cels) {
  var C = CacheService.getScriptCache(), k = chavePend_(id, aba), o = JSON.parse(C.get(k) || '{}'), t = Date.now();
  Object.keys(o).forEach(function (x) { if (t - o[x] > PEND_SEG * 1000) delete o[x]; });
  cels.forEach(function (x) { o[x] = t; }); C.put(k, JSON.stringify(o), PEND_SEG);
}
function pendLer_(id, aba) {
  var o = JSON.parse(CacheService.getScriptCache().get(chavePend_(id, aba)) || '{}'), t = Date.now(), out = {};
  Object.keys(o).forEach(function (x) { if (t - o[x] < PEND_SEG * 1000) out[x] = 1; }); return out;
}
function filaGuardar_(ed) {
  var P = PropertiesService.getScriptProperties(), f = JSON.parse(P.getProperty('FILA') || '[]').concat(ed).slice(-400);
  P.setProperty('FILA', JSON.stringify(f));
}
function filaEnviar_() {
  var P = PropertiesService.getScriptProperties(), f = JSON.parse(P.getProperty('FILA') || '[]'); if (!f.length) return;
  chamar_('post', '', { edicoes: f }); P.deleteProperty('FILA');
}

/* ============================ app → planilha ============================ */
function sincronizar(forcar) {
  var trava = LockService.getScriptLock(); if (!trava.tryLock(2000)) return;
  try {
    var agora = new Date(), h = agora.getHours(), dia = agora.getDay();
    var expediente = dia >= 1 && dia <= 5 && h >= 7 && h < 20;
    if (forcar !== true && !expediente && agora.getMinutes() % 15) return;
    try { filaEnviar_(); } catch (e) {}
    var P = PropertiesService.getScriptProperties(), v = forcar === true ? '' : (P.getProperty('V') || '');
    var d = chamar_('get', v ? '&v=' + encodeURIComponent(v) : '');
    if (d.igual) return;
    (d.pautas || []).forEach(function (p) { aplicarPauta_(p, d.pautaCab); });
    aplicarMono_(d.mono);
    aplicarControles_(d.controles);
    P.setProperty('V', d.v);
  } finally { trava.releaseLock(); }
}

function aplicarPauta_(p, cabEsperado) {
  var P = PropertiesService.getScriptProperties(), B = JSON.parse(P.getProperty('BIM') || '{}'), id = B[p.bimestre], ss;
  if (!id) {
    var copia = DriveApp.getFileById(CFG.modeloPauta).makeCopy(p.arquivo, DriveApp.getFolderById(CFG.pastaPautas));
    id = copia.getId(); ss = SpreadsheetApp.openById(id);
    ss.getSheets().slice(1).forEach(function (s) { ss.deleteSheet(s); });
    ss.getSheets()[0].setName(p.aba);
    B[p.bimestre] = id; P.setProperty('BIM', JSON.stringify(B));
    var A = arquivos_(); A[id] = 'pauta'; P.setProperty('ARQ', JSON.stringify(A)); gatilhoEdicao_(id);
  } else ss = SpreadsheetApp.openById(id);
  var sh = ss.getSheetByName(p.aba);
  if (!sh) {
    sh = ss.getSheets()[0].copyTo(ss).setName(p.aba);
    /* posição: da sessão mais recente para a mais antiga */
    var abas = ss.getSheets().map(function (s) { return s.getName(); }).filter(function (n) { return n !== p.aba; });
    var dm = p.data.slice(5, 7) + p.data.slice(8, 10), pos = 0;
    abas.forEach(function (n, i) { var m = /(\d{2})-(\d{2})$/.exec(n); if (m && m[2] + m[1] > dm) pos = i + 1; });
    ss.setActiveSheet(sh); ss.moveActiveSheet(pos + 1);
  }
  var cab = sh.getRange(PAUTA_CAB_LINHA, 1, 1, cabEsperado.length).getDisplayValues()[0];
  if (cab.join('|') !== cabEsperado.join('|')) throw new Error('Aba ' + p.aba + ': cabeçalho da linha 20 diferente do molde.');
  setData_(sh.getRange('R1'), p.r1);
  if (p.e3) setData_(sh.getRange('E3'), p.e3);
  if (p.k3) setData_(sh.getRange('K3'), p.k3);
  escrever_(sh, PAUTA_INI, cabEsperado, p.linhas, PAUTA_MAX, { pular: { 'Pendências': 1 }, etapa: 'Etapa', id: ss.getId() });
}
function aplicarMono_(m) {
  if (!m) return;
  var ss = SpreadsheetApp.openById(CFG.mono), nomes = Object.keys(m.abas);
  nomes.forEach(function (nome, i) {
    var sh = ss.getSheetByName(nome);
    if (!sh) {
      var ult = ss.getSheets()[ss.getSheets().length - 1];
      sh = ult.copyTo(ss).setName(nome);
      if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getMaxColumns()).clearContent();
      var depois = 0; ss.getSheets().forEach(function (s, k) { if (nomes.indexOf(s.getName()) > -1 && nomes.indexOf(s.getName()) < i) depois = k + 1; });
      ss.setActiveSheet(sh); ss.moveActiveSheet(depois + 1);
    }
    cabecalho_(sh, m.cab);
    escrever_(sh, 2, m.cab, m.abas[nome], 0, { id: ss.getId() });
  });
}
function aplicarControles_(c) {
  if (!c) return;
  var ss = SpreadsheetApp.openById(CFG.controles);
  Object.keys(c).forEach(function (nome) {
    var sh = ss.getSheetByName(nome) || ss.insertSheet(nome);
    cabecalho_(sh, c[nome].cab);
    escrever_(sh, 2, c[nome].cab, c[nome].linhas, 0, { id: ss.getId() });
  });
}
function cabecalho_(sh, cab) {
  if (sh.getMaxColumns() < cab.length) sh.insertColumnsAfter(sh.getMaxColumns(), cab.length - sh.getMaxColumns());
  var r = sh.getRange(1, 1, 1, cab.length); if (r.getDisplayValues()[0].join('|') !== cab.join('|')) r.setValues([cab]);
}

/* Grava as linhas a partir de "ini", só nas células que mudaram (para não atrapalhar quem está editando).
   o.pular: colunas que nunca são gravadas (fórmulas do molde); o.etapa: coluna com fórmula do molde, salvo Corrigido/Liberado. */
function escrever_(sh, ini, cab, linhas, maxLinhas, o) {
  var nc = cab.length, n = linhas.length, ultima = Math.max(sh.getLastRow(), ini - 1);
  var alt = Math.max(n, ultima - ini + 1, 1); if (maxLinhas) alt = Math.min(Math.max(alt, n), maxLinhas);
  if (sh.getMaxRows() < ini + alt - 1) sh.insertRowsAfter(sh.getMaxRows(), ini + alt - 1 - sh.getMaxRows());
  var R = sh.getRange(ini, 1, alt, nc), atual = R.getDisplayValues(), form = o.etapa ? R.getFormulas() : null;
  var jEt = o.etapa ? cab.indexOf(o.etapa) : -1, mud = [], pend = pendLer_(o.id, sh.getName());
  for (var i = 0; i < alt; i++) for (var j = 0; j < nc; j++) {
    if (o.pular && o.pular[cab[j]]) continue;
    if (pend[(ini + i) + ':' + (j + 1)]) continue;
    var quer = i < n && linhas[i][j] != null ? String(linhas[i][j]) : '';
    if (j === jEt) {
      var fixo = quer === 'Corrigido' || quer === 'Liberado', temF = !!form[i][j];
      if (fixo) { if (temF || atual[i][j] !== quer) mud.push([i, j, quer]); }
      else if (!temF) mud.push([i, j, '=ETAPA']);
      continue;
    }
    if (atual[i][j] !== quer) mud.push([i, j, quer]);
  }
  if (!mud.length) return;
  if (mud.length <= 400) {
    mud.forEach(function (m) { var l = ini + m[0], c = sh.getRange(l, m[1] + 1);
      if (m[2] === '=ETAPA') { c.setFormula(formulaEtapa_(l)); return; }
      var v = valor_(cab[m[1]], m[2]); if (v instanceof Date) c.setValue(v).setNumberFormat('dd/mm/yyyy'); else c.setValue(v); });
  } else {
    /* muitas mudanças (aba nova, reordenação): grava em bloco, coluna a coluna contígua; mantém o que está pendente e as fórmulas puladas */
    var bruto = R.getValues();
    mud.forEach(function (m) { if (m[2] !== '=ETAPA' && m[1] !== jEt) bruto[m[0]][m[1]] = valor_(cab[m[1]], m[2]); });
    var j0 = null;
    for (var j = 0; j <= nc; j++) {
      var livre = j < nc && !(o.pular && o.pular[cab[j]]) && j !== jEt;
      if (livre && j0 === null) j0 = j;
      if (!livre && j0 !== null) { sh.getRange(ini, j0 + 1, alt, j - j0).setValues(bruto.map(function (L) { return L.slice(j0, j); })); j0 = null; }
    }
    cab.forEach(function (c, j) { if (COLS_DATA[c]) sh.getRange(ini, j + 1, alt, 1).setNumberFormat('dd/mm/yyyy'); });
    mud.forEach(function (m) { if (m[1] !== jEt) return; var l = ini + m[0], c = sh.getRange(l, m[1] + 1);
      if (m[2] === '=ETAPA') c.setFormula(formulaEtapa_(l)); else c.setValue(m[2]); });
  }
  SpreadsheetApp.flush();
}
function formulaEtapa_(l) { return '=IF($B' + l + '="","",IF($H' + l + '<>"","Minutado","A fazer"))'; }
/* texto de exibição → valor da célula: datas como data; número de item como número; texto que pareceria número, data ou fórmula, com apóstrofo */
function valor_(col, v) {
  v = v == null ? '' : String(v); if (!v) return '';
  if (COLS_DATA[col]) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v); return m ? new Date(+m[3], +m[2] - 1, +m[1], 12) : v; }
  if (col === 'Item' || col === 'Nº') return /^\d+$/.test(v) ? Number(v) : v;
  return /^([=+@-]|[\d.,\/:%\s-]+$)/.test(v) ? "'" + v : v;
}
function setData_(r, br) {
  var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br || ''));
  if (!m) { r.setValue(br || ''); return; }
  r.setValue(new Date(+m[3], +m[2] - 1, +m[1], 12)).setNumberFormat('dd/mm/yyyy');
}
function isoDe_(br) { var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(br || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
