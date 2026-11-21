/* Muta · autos digitais no Prontuário (0.11)
   Nos autos digitais do PJe, o painel lê a cronologia (painel esquerdo: documentos com ID, tipo, descrição, data e hora) e:
   - lista os documentos no Prontuário › Processo, com um campo de especificação (gravado em "Outras peças" da ficha) e os
     botões Inteiro teor (texto do documento, lido no painel; página digitalizada vai ao OCR), OCR (todas as páginas pelo
     OCR local, ocr.js) e ↗ (o PDF no próprio PJe, numa aba nova);
   - monta a Situação atual (última decisão, última peça, última informação e última movimentação);
   - com o texto das peças, roda o mesmo motor de leitura do inteiro teor do Caput e da Ex Officio (padrao/inteiro-teor.js,
     com o calendário forense): sugere os campos da ficha (sentença, origem, recursos e contrarrazões, outras peças,
     tempestividade, preparo, representação e procuração, MPF, gratuidade) e alerta o que a triagem precisa conferir
     (tipo de julgamento, órgão prolator, MPF no 2º grau, parte idosa, prazo em dobro, contrarrazões, remessa necessária, Pix).
   Tudo é sugestão: só vai à ficha o que a pessoa marcar. No PJe, só leitura: o download é o mesmo do botão do documento.
   O texto das peças fica só na memória do painel. */
(function () {
'use strict';
var br = window.MutaProntuarioBridge;
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function S(v) { return String(v == null ? '' : v).trim(); }
function N(v) { return S(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' '); }
function iso(d) { var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(S(d)); if (m) return m[3] + '-' + m[2] + '-' + m[1]; m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(d)); return m ? m[0] : ''; }
function brD(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] : S(v); }
function GB() { return window.MutaGabinete || {}; }

var A = { cnj: '', itens: null, idp: '', host: '', em: 0, lendo: false, erro: '', docs: {}, msg: '', sug: null, sugMsg: '', abertos: {}, filtro: 'pecas', fila: 0, esp: {}, tEsp: null };

/* ---------- categorias pelo tipo do documento no PJe: [chave, padrão, rótulo, grupo] ---------- */
var CAT = [
  ['sentenca', /^senten[çc]a/i, 'Sentença', 'Decisões'],
  ['acordao', /^ac[óo]rd[ãa]o/i, 'Acórdão', 'Decisões'],
  ['decisao', /^decis[ãa]o/i, 'Decisão', 'Decisões'],
  ['despacho', /^despacho/i, 'Despacho', 'Decisões'],
  ['adesivo', /adesiv/i, 'Recurso adesivo', 'Recursos'],
  ['apelacao', /^(apela[çc][ãa]o|recurso de apela|raz[õo]es de apela)/i, 'Apelação', 'Recursos'],
  ['ed', /^embargos de declara/i, 'Embargos de declaração', 'Recursos'],
  ['agint', /^agravo interno/i, 'Agravo interno', 'Recursos'],
  ['agravo', /^agravo/i, 'Agravo', 'Recursos'],
  ['recurso', /^recurso (especial|extraordin|ordin|inominado)/i, 'Recurso', 'Recursos'],
  ['contrarrazoes', /^(contrarraz|contra-raz|contraminuta|resposta ao recurso)/i, 'Contrarrazões', 'Recursos'],
  ['parecer', /^parecer|^manifesta[çc][ãa]o do (mp|minist)|^cota do mp|^promo[çc][ãa]o/i, 'Parecer do MPF', 'MPF'],
  ['inicial', /^peti[çc][ãa]o inicial|^inicial/i, 'Petição inicial', 'Petições'],
  ['contestacao', /^contesta[çc]/i, 'Contestação', 'Petições'],
  ['replica', /^r[ée]plica|^impugna[çc][ãa]o [àa] contesta/i, 'Réplica', 'Petições'],
  ['peticao', /^peti[çc][ãa]o|^manifesta[çc]/i, 'Petição', 'Petições'],
  ['laudo', /^laudo/i, 'Laudo pericial', 'Provas e documentos'],
  ['procuracao', /^procura[çc]|substabelecimento/i, 'Procuração', 'Provas e documentos'],
  ['custas', /custas|recolhimento|\bguia\b|\bgru\b|comprovante de pagamento|preparo/i, 'Custas e preparo', 'Provas e documentos'],
  ['intimacao', /^intima[çc]|^certid[ãa]o de (intima|publica)|^ci[êe]ncia|^publica[çc]/i, 'Intimação', 'Andamento'],
  ['informacao', /^informa[çc]|^certid[ãa]o|^ato ordinat/i, 'Informação', 'Andamento'],
  ['transito', /tr[âa]nsito em julgado/i, 'Certidão de trânsito', 'Andamento']
];
/* peças cujo texto alimenta a leitura automática (as mesmas do extrator do Caput) */
var PRINC = { sentenca: 1, acordao: 1, decisao: 1, apelacao: 1, adesivo: 1, ed: 1, agint: 1, agravo: 1, recurso: 1, contrarrazoes: 1, parecer: 1, procuracao: 1, custas: 1, inicial: 1, intimacao: 1 };
function categoria(tipo) {
  for (var i = 0; i < CAT.length; i++) if (CAT[i][1].test(tipo)) return { k: CAT[i][0], rot: CAT[i][2], g: CAT[i][3] };
  return { k: 'outro', rot: 'Documento', g: 'Outros' };
}
/* todos os documentos, do mais recente para o mais antigo (como no PJe) */
function lista() {
  var out = [];
  (A.itens || []).forEach(function (it) {
    (it.docs || []).forEach(function (d, j) {
      var c = categoria(d.tipo);
      out.push({ id: d.id, tipo: d.tipo, desc: d.desc, origem: d.origem, data: it.data, hora: it.hora, k: c.k, rot: c.rot, g: c.g, anexo: j > 0, movs: it.movs || [] });
    });
  });
  return out;
}
function movimentos() {
  var out = [];
  (A.itens || []).forEach(function (it) { (it.movs || []).forEach(function (m) { out.push({ t: m, data: it.data, hora: it.hora }); }); });
  return out;
}

/* ---------- leitura da cronologia ---------- */
function cnjAtual() { var k = br.chaveAtual(); return k && k !== 'avulso' ? Muta.formatarCnj(k) : ''; }
function redesenhar() { if (GB().render) GB().render(); }
function ler(tudo) {
  if (!window.MutaPje || !window.MutaPje.lerAutos) return Promise.resolve();
  A.lendo = tudo ? 'tudo' : true; A.erro = ''; A.msg = ''; redesenhar();
  return window.MutaPje.lerAutos(tudo).then(function (r) {
    if (r.numero && r.numero !== A.cnj) { A.docs = {}; A.sug = null; A.abertos = {}; }
    A.lendo = false; A.itens = r.itens || []; A.idp = r.idp || ''; A.host = r.host || ''; A.cnj = r.numero || ''; A.em = Date.now(); A.sug = null;
    redesenhar();
  }, function (e) { A.lendo = false; A.erro = e.message; redesenhar(); });
}
function lidoDoProcesso() { var c = cnjAtual(); return !!(A.itens && A.cnj && c && Muta.chaveProcesso(A.cnj) === Muta.chaveProcesso(c)); }

/* ---------- texto dos documentos ---------- */
var PDF_PRONTO = false;
function pdfLib() {
  var L = window.pdfjsLib;
  if (!L) throw new Error('leitor de PDF indisponível');
  if (!PDF_PRONTO) { L.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; PDF_PRONTO = true; }
  return L;
}
function b64bytes(b64) { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
/* texto do PDF: camada de texto de cada página; a página sem texto (digitalizada) vai ao OCR local (ocr.js).
   modo 'ocr' passa todas as páginas pelo OCR (camada de texto ruim ou ausente). */
var OCR_MAX = 30;
/* só deixa passar <b>, <i>, <u> e <br> do HTML leve que o leitor do PJe monta */
function limpaH(h) { return String(h || '').replace(/<(?!\/?(b|i|u)>|br>)[^>]*>/g, ''); }
var SVGDL = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg> ';
function semTexto(t) { return S(t).replace(/\s/g, '').length < 25; }
function textoPdf(b64, max, modo, aviso) {
  var L = pdfLib();
  return L.getDocument({ data: b64bytes(b64), isEvalSupported: false, disableFontFace: true }).promise.then(function (pdf) {
    var n = pdf.numPages, ate = Math.min(n, max || 40), partes = [], p = Promise.resolve();
    for (var i = 1; i <= ate; i++) (function (k) {
      p = p.then(function () { return pdf.getPage(k); }).then(function (pg) { return pg.getTextContent(); }).then(function (c) {
        partes[k - 1] = c.items.map(function (it) { return it.str + (it.hasEOL ? '\n' : ' '); }).join('').replace(/[ \t]+\n/g, '\n');
      });
    })(i);
    return p.then(function () {
      var alvo = [];
      for (var k = 1; k <= Math.min(ate, OCR_MAX); k++) if (modo === 'ocr' || semTexto(partes[k - 1])) alvo.push(k);
      if (!alvo.length || !window.MutaOcr || !MutaOcr.disponivel()) return { ocr: 0 };
      return MutaOcr.paginas(pdf, alvo, aviso).then(function (o) {
        alvo.forEach(function (k) { if (!semTexto(o[k]) || semTexto(partes[k - 1])) partes[k - 1] = o[k]; });
        return { ocr: alvo.length };
      });
    }).then(function (x) {
      try { pdf.destroy(); } catch (e) {}
      return { texto: partes.join('\n'), pags: n, lidas: ate, ocr: x.ocr };
    }, function (e) { try { pdf.destroy(); } catch (e2) {} throw e; });
  });
}
/* modo 'ocr': lê de novo o documento passando todas as páginas pelo OCR */
function extrair(id, modo) {
  var d = A.docs[id];
  if (d && (d.estado === 'lendo' || (d.estado === 'ok' && modo !== 'ocr') || (modo === 'ocr' && d.modo === 'ocr' && d.estado === 'ok'))) return Promise.resolve(d);
  var doc = lista().filter(function (x) { return x.id === id; })[0];
  A.docs[id] = { estado: 'lendo', modo: modo || '' }; redesenhar();
  var aviso = function (f, t) { var x = A.docs[id]; if (x && x.estado === 'lendo') { x.prog = 'OCR ' + f + '/' + t; redesenhar(); } };
  return window.MutaPje.lerDocumento(A.idp, id).then(function (r) {
    if (r.fmt === 'pdf') return textoPdf(r.b64, doc && PRINC[doc.k] ? 60 : 25, modo, aviso).then(function (t) { return { fmt: 'pdf', texto: t.texto, pags: t.pags, lidas: t.lidas, ocr: t.ocr, url: r.url }; });
    return { fmt: 'html', texto: r.texto, html: r.html || null, pags: 0, url: r.url };
  }).then(function (x) {
    var sem = S(x.texto).replace(/\s/g, '').length < 40;
    A.docs[id] = { estado: sem ? 'sem' : 'ok', modo: modo || '', texto: S(x.texto), html: x.html || null, fmt: x.fmt, pags: x.pags, lidas: x.lidas, ocr: x.ocr || 0, url: x.url };
    A.sug = null; redesenhar(); return A.docs[id];
  }, function (e) { A.docs[id] = { estado: 'erro', erro: e.message }; redesenhar(); return A.docs[id]; });
}
/* ---------- baixar em JSON: cada peça e o inteiro teor (formato de acervo/autos/<CNJ>.json.gz, o mesmo do Caput e da Ex Officio) ---------- */
function baixar(nome, obj) {
  var b = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }), u = URL.createObjectURL(b), a = document.createElement('a');
  a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
}
function cnjArq() { return String(A.cnj || cnjAtual() || 'processo').replace(/[^\d.-]/g, ''); }
function pecaJson(id) {
  var d = lista().filter(function (x) { return x.id === id; })[0] || { id: id }, t = A.docs[id] || {};
  return { cnj: A.cnj || cnjAtual(), id: id, tipo: d.tipo || '', descricao: d.desc || '', origem: d.origem || '', juntado_em: d.data || '', hora: d.hora || '', anexo: !!d.anexo,
    categoria: d.rot || '', movimentos: d.movs || [], detalhamento: S(A.esp[id] != null ? A.esp[id] : ''), formato: t.fmt || '', paginas: t.pags || 0, paginas_lidas: t.lidas || 0,
    paginas_ocr: t.ocr || 0, caracteres: S(t.texto).length, texto: S(t.texto), extraido_em: new Date().toISOString() };
}
function baixarPeca(id) { return extrair(id).then(function () { baixar(cnjArq() + '_ID' + id + '.json', pecaJson(id)); }); }
/* inteiro teor: lê o que falta (três de cada vez) e baixa tudo num arquivo */
function baixarTudo() {
  var L = lista(), falta = L.filter(function (d) { return !(A.docs[d.id] && /^(ok|sem)$/.test(A.docs[d.id].estado)); });
  A.todo = { feitos: 0, total: falta.length }; A.msg = ''; redesenhar();
  var i = 0;
  function trab() { if (i >= falta.length) return Promise.resolve(); var d = falta[i++]; return extrair(d.id).then(null, function () {}).then(function () { A.todo.feitos++; redesenhar(); }).then(trab); }
  return Promise.all([trab(), trab(), trab()]).then(function () {
    var mov = movimentos(), sec = ['===== MOVIMENTAÇÕES (linha do tempo do PJe, mais recente primeiro) =====', mov.map(function (m) { return m.data + (m.hora ? ' ' + m.hora : '') + ' · ' + m.t; }).join('\n'), ''];
    var docs = [], faltam = [];
    L.forEach(function (d) { var t = A.docs[d.id] || {};
      if (!t.texto) faltam.push(d.id);
      docs.push({ id: d.id, tipo: d.tipo, descricao: d.desc, juntado_por: '', juntado_em: d.data, formato: t.fmt || '', paginas: t.pags || 0, caracteres: S(t.texto).length, anexo: !!d.anexo, detalhamento: S(A.esp[d.id] || '') , paginas_ocr: t.ocr || 0 });
      sec.push('===== ID ' + d.id + ' | ' + d.tipo + ' | ' + (d.desc || d.tipo) + ' | juntado em ' + d.data + (t.fmt === 'pdf' ? ' | pdf ' + (t.pags || 0) + ' pág.' : t.fmt ? ' | ' + t.fmt : '') + (t.ocr ? ' | OCR ' + t.ocr + ' pág.' : '') + ' =====', S(t.texto), ''); });
    baixar(cnjArq() + '.json', { cnj: A.cnj || cnjAtual(), extraido_em: new Date().toISOString(), origem: 'Extensão HERO18810 (painel ao lado do PJe)',
      lista: JSON.stringify(L.map(function (d) { return [d.id, d.tipo, d.desc || d.tipo, '', d.data, d.hora || '', d.anexo ? 'anexo' : '']; })), docs: JSON.stringify(docs), faltam: faltam, texto: sec.join('\n') });
    A.todo = null; A.msg = 'Inteiro teor baixado: ' + L.length + ' documento(s)' + (faltam.length ? ', ' + faltam.length + ' sem texto' : '') + '.'; redesenhar();
  });
}
/* as peças principais, da mais recente para a mais antiga, três de cada vez (no máximo 30) */
function extrairPrincipais() {
  var L = lista().filter(function (d) { return PRINC[d.k] && !(A.docs[d.id] && /^(ok|sem)$/.test(A.docs[d.id].estado)); }).slice(0, 30);
  if (!L.length) { A.msg = 'As peças principais já foram lidas.'; redesenhar(); return Promise.resolve(); }
  A.fila = L.length; A.msg = ''; redesenhar();
  var i = 0;
  function trab() { if (i >= L.length) return Promise.resolve(); var d = L[i++]; return extrair(d.id).then(function () { A.fila--; }, function () { A.fila--; }).then(trab); }
  return Promise.all([trab(), trab(), trab()]).then(function () { A.fila = 0; A.msg = 'Peças principais lidas: ' + L.length + '.'; A.sug = null; redesenhar(); });
}
function abrirPdf(id) {
  if (!A.idp) return;
  var url = 'https://' + (A.host || 'pje2g.trf3.jus.br') + '/pje/seam/resource/rest/pje-legacy/documento/download/TRF3/2g/' + A.idp + '/' + id;
  window.MutaPje.abrir(url);
}

/* ---------- motor do inteiro teor (padrao/inteiro-teor.js) ---------- */
/* o texto no formato .md que o motor lê: cabeçalho do processo e uma seção por documento, em ordem cronológica */
function md() {
  var g = GB(), fo = g.fo ? g.fo() || {} : {}, cnj = A.cnj || cnjAtual();
  var L = lista().slice().sort(function (a, b) { return Number(a.id) - Number(b.id); });
  var out = ['# Processo ' + cnj];
  [['Classe', fo.classe_judicial || fo.Classe], ['Assunto', fo.Assunto], ['Polo ativo', fo.polo_ativo], ['Polo passivo', fo.polo_passivo]].forEach(function (x) { if (S(x[1])) out.push('- ' + x[0] + ': ' + String(x[1]).replace(/\n+/g, '; ')); });
  out.push('');
  L.forEach(function (d) {
    out.push('# ' + d.id + ' - ' + d.tipo + (d.desc && N(d.desc) !== N(d.tipo) ? ' (' + d.desc + ')' : ''));
    out.push('- Juntado em: ' + d.data + (d.hora ? ' ' + d.hora : ''));
    out.push('');
    var t = A.docs[d.id] && A.docs[d.id].texto;
    if (t) out.push(t);
    out.push('');
  });
  return out.join('\n');
}
function alvoDe(chave) {
  var F = GB().modelo ? GB().modelo() : null, achou = null;
  ((F && F.abas) || []).forEach(function (a) { (a.grupos || []).forEach(function (g) { (g.campos || []).forEach(function (c) { if (!achou && c.chave === chave && c.secao && c.editavel !== false && !c.calculado) achou = c; }); }); });
  return achou;
}
function valorPara(c, v) {
  v = S(v); if (c.mapa && c.mapa[v]) return c.mapa[v];
  if (c.tipo === 'lista') { var o = (c.opcoes || []).map(function (x) { return typeof x === 'string' ? x : x.valor; }).filter(function (x) { return N(x) === N(v); })[0]; if (o) return o; }
  if (c.tipo === 'simnao') return /^(2|sim|s|true)$/i.test(v) ? 'Sim' : /^(1|n[aã]o)$/i.test(v) ? '' : v;
  if (c.tipo === 'data') return iso(v) || v;
  return v;
}
function linhaAntiga() {
  var g = GB(), op = (g.op && g.op()) || {}, r = Object.assign({ Processo: A.cnj || cnjAtual() }, (g.fo && g.fo()) || {});
  ['origem', 'triagem', 'producao', 'pauta', 'controles'].forEach(function (s) { Object.assign(r, op[s] || {}); });
  delete r.sessoes; return r;
}
function gravado(sec, k) { var g = GB(); return g.gravado ? g.gravado(sec, k) : ''; }
function linhasGravadas(sec, k) { var v = gravado(sec, k); return Array.isArray(v) ? v : []; }
/* as sugestões do motor, no formato da ficha (o mesmo da Ex Officio: padrao/ficha-dialogo.js · itensTeor) */
function mapear(L) {
  var out = [], contra = [], proc = [], TB = { rec: [], contra: [], proc: [], ocorr: [], docs: { rec: [], contra: [], proc: [], ocorr: [] } };
  L.forEach(function (it) {
    if (it.kind === 'contra') { if (it.key === 'ids') contra.push(it.value); (TB.contra[it.idx || 0] = TB.contra[it.idx || 0] || {})[it.key] = it.key === 'data' ? (iso(it.value) || it.value) : it.value; TB.docs.contra.push(it.doc); return; }
    if (it.kind === 'rec') { (TB.rec[it.idx || 0] = TB.rec[it.idx || 0] || {})[it.key] = it.key === 'data' ? (iso(it.value) || it.value) : it.value; TB.docs.rec.push(it.doc); return; }
    if (it.kind === 'proc') { proc.push(it); var q = it.proc || {}; TB.proc.push({ id: S(q.id) || S(it.doc), data: iso(q.data) || S(q.data), validade: S(q.validade), advogados: S(q.advogados) }); TB.docs.proc.push(it.doc); return; }
    if (it.kind === 'ocorr') { TB.ocorr.push({ tipo: S(it.value), ids: S(it.ids || it.doc), data: '' }); TB.docs.ocorr.push(it.doc); return; }
    var c = alvoDe(it.key);
    if (!c) return; /* dado do acervo (só leitura) ou sem campo na ficha: fica de fora */
    it.alvo = c.secao + '.' + c.chave; it.campo = c; it.value = valorPara(c, it.value);
    var atual = gravado(c.secao, c.chave); if (typeof atual === 'object') atual = '';
    it.current = atual; it.status = !S(atual) ? 'novo' : N(atual) === N(it.value) ? 'igual' : 'conflito'; it.apply = it.status === 'novo'; out.push(it);
  });
  var c1 = alvoDe('Contrarrazões - Situação');
  if (contra.length && c1) { var a1 = gravado(c1.secao, c1.chave); out.push({ sec: 'Recursos e contrarrazões', key: c1.chave, label: 'Contrarrazões', value: 'apresentadas', doc: contra.join(', '), kind: 'field', alvo: c1.secao + '.' + c1.chave, campo: c1, current: a1, status: !a1 ? 'novo' : N(a1) === 'apresentadas' ? 'igual' : 'conflito', apply: !a1 }); }
  var c2 = alvoDe('ID da Procuração');
  if (proc.length && c2) { var pr = proc[proc.length - 1], a2 = gravado(c2.secao, c2.chave), v2 = S(pr.proc && pr.proc.id) || S(pr.doc);
    out.push({ sec: 'Representação', key: c2.chave, label: 'ID da procuração (a última juntada)', value: v2, doc: pr.doc, kind: 'field', alvo: c2.secao + '.' + c2.chave, campo: c2, current: a2, status: !a2 ? 'novo' : N(a2) === N(v2) ? 'igual' : 'conflito', apply: !a2,
      note: pr.proc ? [pr.proc.data ? 'de ' + brD(iso(pr.proc.data) || pr.proc.data) : '', pr.proc.advogados].filter(Boolean).join(' · ') : '' }); }
  function tab(chave, sec, rotulo, novas, porChave, docs) {
    var c = alvoDe(chave); novas = novas.filter(function (x) { return x && Object.keys(x).some(function (k) { return S(x[k]); }); }); if (!c || !novas.length) return;
    var atual = linhasGravadas(c.secao, c.chave), res = atual.map(function (x) { return Object.assign({}, x); });
    novas.forEach(function (n, i) { var k = porChave ? res.map(function (x) { return S(x[porChave]); }).indexOf(S(n[porChave])) : i; if (k < 0 || k >= res.length) res.push(n); else Object.keys(n).forEach(function (f) { if (S(n[f])) res[k][f] = n[f]; }); });
    var igual = JSON.stringify(atual) === JSON.stringify(res);
    out.push({ sec: sec, key: chave, label: rotulo, value: res, doc: docs.filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', '), kind: 'tabela', alvo: c.secao + '.' + c.chave, campo: c, current: atual,
      status: !atual.length ? 'novo' : igual ? 'igual' : 'conflito', apply: !atual.length, note: res.length + (res.length === 1 ? ' linha' : ' linhas') + (atual.length ? ' (hoje: ' + atual.length + ')' : '') });
  }
  tab('Recursos', 'Recursos e contrarrazões', 'Recursos', TB.rec, null, TB.docs.rec);
  tab('Contrarrazões', 'Recursos e contrarrazões', 'Contrarrazões (peças)', TB.contra, null, TB.docs.contra);
  tab('Procurações', 'Representação', 'Procurações', TB.proc, 'id', TB.docs.proc);
  tab('Outras peças', 'Outras peças e ocorrências', 'Outras peças', TB.ocorr, 'ids', TB.docs.ocorr);
  return out;
}
function calcular() {
  var T = window.CMTInteiroTeor;
  if (!T || !T.parseTxt) { A.sugMsg = 'Motor de leitura indisponível.'; return; }
  if (!A.itens || !lidoDoProcesso()) { A.sug = null; return; }
  try {
    var P = T.parseTxt(md());
    T.preselect(P); try { P.kind = T.especie(P); T.preselectKind(P); } catch (e) {}
    A.P = P; A.sug = mapear(T.buildSuggestions(P, linhaAntiga(), null) || []); A.sugMsg = '';
  } catch (e) { A.sug = []; A.sugMsg = 'Não foi possível ler as peças: ' + ((e && e.message) || e); }
}

/* ---------- alertas da triagem (conferências que a ficha não guarda num campo só) ---------- */
function alertas() {
  var out = [], L = lista(), fo = (GB().fo && GB().fo()) || {}, tarefa = window.MutaPje && window.MutaPje.tarefa ? window.MutaPje.tarefa() : '';
  var cl = N(fo.classe_judicial || fo.Classe || ''), etq = N(fo['Etiquetas Originais'] || fo._etq || fo.Etiquetas || '');
  var texto = function (d) { return d && A.docs[d.id] && A.docs[d.id].texto || ''; };
  var ult = function (k) { return L.filter(function (d) { return (Array.isArray(k) ? k.indexOf(d.k) >= 0 : d.k === k) && !d.anexo; })[0]; };
  function add(nivel, t, doc, campo, valor) { out.push({ nivel: nivel, t: t, doc: doc || '', campo: campo || '', valor: valor || '' }); }
  /* tipo de julgamento: embargos pela tarefa; os demais pelas etiquetas e confirmados pelo último recurso da cronologia */
  var tj = '', porQue = '';
  if (/embargos de declara/i.test(tarefa)) { tj = 'Embargos de Declaração'; porQue = 'tarefa “' + tarefa + '”'; }
  else if (/\b(agint|agravo interno)\b/.test(etq)) { tj = 'Agravo Interno'; porQue = 'etiqueta do PJe'; }
  else if (/\b(ed|embargos de declaracao)\b/.test(etq)) { tj = 'Embargos de Declaração'; porQue = 'etiqueta do PJe'; }
  else if (/retrata/.test(etq)) { tj = 'Juízo de Retratação'; porQue = 'etiqueta do PJe'; }
  else if (/agravo de instrumento/.test(cl)) { tj = 'Agravo de Instrumento'; porQue = 'classe'; }
  else if (/remessa necessaria/.test(cl) && !/apela/.test(cl)) { tj = 'Remessa Necessária'; porQue = 'classe'; }
  else if (/apela/.test(cl)) { tj = 'Apelação'; porQue = 'classe'; }
  var rec = ult(['ed', 'agint', 'apelacao', 'adesivo', 'agravo', 'recurso']);
  var recTj = rec ? ({ ed: 'Embargos de Declaração', agint: 'Agravo Interno', apelacao: 'Apelação', adesivo: 'Apelação', agravo: /interno/i.test(rec.tipo) ? 'Agravo Interno' : '' })[rec.k] || '' : '';
  var acordao = ult('acordao');
  if (rec && recTj === 'Embargos de Declaração' && !(acordao && Number(acordao.id) < Number(rec.id))) recTj = ''; /* embargos da origem não mudam o julgamento */
  var tjGrav = S(gravado('triagem', 'Tipo de Julgamento'));
  if (tj || recTj) {
    var v = recTj || tj, div = tj && recTj && tj !== recTj;
    add(div ? 'al' : 'in', 'Tipo de julgamento: ' + v + (porQue ? ' (' + porQue + (recTj ? '; último recurso: ' + rec.tipo + ' ID ' + rec.id : '') + ')' : '') + (div ? '. Divergência: a ' + porQue + ' indica ' + tj + '.' : '.'), rec ? rec.id : '', tjGrav !== v ? 'triagem.Tipo de Julgamento' : '', v);
  }
  /* órgão prolator (embargos e agravo interno): a decisão embargada ou agravada deve ser desta Turma */
  if (/embargos|agravo interno/i.test(tj + recTj)) {
    var imp = recTj === 'Agravo Interno' ? ult('decisao') : acordao;
    var t = texto(imp);
    if (imp && t) {
      var turma = /turma regional de mato grosso do sul|turma regional do mato grosso do sul|trgms/i.test(t) ? 'Turma Regional de MS' : (/(\d+)ª\s*turma/i.exec(t) || [])[0] || '';
      add(turma && !/regional/i.test(turma) ? 'al' : 'in', 'Órgão prolator da decisão impugnada: ' + (turma || 'não identificado no texto') + (turma && !/regional/i.test(turma) ? ' — conferir se o julgamento cabe a outro órgão (devolver ao órgão prolator).' : '.'), imp.id);
    } else if (imp) add('in', 'Órgão prolator: leia o texto da decisão impugnada (ID ' + imp.id + ') para conferir.', imp.id);
  }
  /* MPF no 2º grau: mandado de segurança, parte idosa, incapaz ou interesse público exigem vista nesta instância */
  var idoso = /idos/i.test(fo.prioridade || '') || /idos/.test(etq);
  var ms = /mandado de seguran/.test(cl);
  var parecer = ult('parecer'), mpfGrav = S(gravado('triagem', 'MPF'));
  if (idoso) add('al', 'Parte idosa (prioridade legal' + (fo.prioridade ? ': ' + S(fo.prioridade) : '') + '): conferir a prioridade na pauta e se cabe a intervenção do MPF.', '');
  if (ms || idoso) {
    var ultRec = rec && Number(rec.id), vista = parecer && (!ultRec || Number(parecer.id) > ultRec);
    add(vista ? 'ok' : 'al', (ms ? 'Mandado de segurança' : 'Parte idosa') + ': ' + (vista ? 'há manifestação do MPF depois do recurso (ID ' + parecer.id + ', ' + parecer.data + ').' : 'sem manifestação do MPF no 2º grau depois do recurso — conferir vista ou intimação antes de pautar.'), vista ? parecer.id : '', !vista && !mpfGrav ? 'triagem.MPF' : '', !vista && !mpfGrav ? 'Aguardando parecer' : '');
  }
  /* contrarrazões: juntadas? com preliminar? */
  var cr = L.filter(function (d) { return d.k === 'contrarrazoes' && !d.anexo; });
  if (rec && /apela|agravo de instrumento/i.test(recTj + tj)) {
    if (!cr.length) add('in', 'Sem contrarrazões na cronologia depois do recurso (confira a intimação para resposta).', rec.id);
    else cr.forEach(function (d) { var t2 = texto(d); add('in', 'Contrarrazões ID ' + d.id + ' (' + d.data + ')' + (t2 ? (/prelimin/i.test(t2) ? ': trazem preliminar — conferir.' : ': sem preliminar aparente.') : ': leia o texto para ver se há preliminar.'), d.id); });
  }
  /* remessa necessária: o que a sentença diz */
  var sen = ult('sentenca'), ts = texto(sen);
  if (sen && ts) {
    var rn = /n[ãa]o\s+(est[áa]\s+)?sujeit[ao]\s+(ao|à)\s+(reexame|remessa)|dispensad[ao]\s+(o|a)\s+(reexame|remessa)|art(igo|\.)\s*496,?\s*§\s*3/i.test(ts) ? 'Dispensada' : /sujeit[ao]\s+(ao|à)\s+(reexame|remessa)|reexame necess[áa]rio|remessa necess[áa]ria/i.test(ts) ? 'Sim' : '';
    if (rn) add('in', 'Remessa necessária: a sentença indica “' + rn + '”.', sen.id, S(gravado('origem', 'Sentença - Reexame')) ? '' : 'origem.Sentença - Reexame', rn);
  }
  /* Pix: o comprovante do banco não é a GRU paga ao Tesouro */
  L.filter(function (d) { return d.k === 'custas'; }).forEach(function (d) {
    var t3 = texto(d); if (!t3) return;
    if (/\bpix\b/i.test(t3) && !/tesouro nacional|stn|guia de recolhimento da uni[ãa]o|\bgru\b/i.test(t3)) add('al', 'Preparo ID ' + d.id + ': comprovante de Pix sem referência à GRU ou ao Tesouro — conferir se o recolhimento foi para a conta certa.', d.id);
  });
  /* intimação da decisão recorrida (para a tempestividade): primeira ciência, intimação ou publicação depois dela na cronologia */
  var impT = /embargos/i.test(recTj || tj) ? acordao : /agravo interno/i.test(recTj || tj) ? ult('decisao') : sen;
  if (impT && rec) {
    var dn = function (d) { var m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(d || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; };
    var d0 = dn(impT.data), dr = dn(rec.data), RX = /intima[çc][ãa]o|ci[êe]ncia|publica[çc][ãa]o|publicad|disponibiliza|expedi[çc][ãa]o de (intima|comunica)/i;
    var cand = [];
    movimentos().forEach(function (m) { var d = dn(m.data); if (d && d >= d0 && (!dr || d <= dr) && RX.test(m.t)) cand.push({ d: d, t: m.t, data: m.data, id: '' }); });
    L.forEach(function (d) { var x = dn(d.data); if (x && x >= d0 && (!dr || x <= dr) && Number(d.id) > Number(impT.id) && RX.test(d.tipo + ' ' + (d.desc || ''))) cand.push({ d: x, t: d.tipo, data: d.data, id: d.id }); });
    cand.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
    var c0 = cand[0], pubGrav = S(gravado('triagem', 'Tempest - Publicação'));
    if (c0) add('in', 'Intimação da decisão recorrida (ID ' + impT.id + '): primeira ciência ou publicação na cronologia em ' + c0.data + ' (“' + c0.t + '”' + (c0.id ? ', ID ' + c0.id : '') + '). Conferir a data efetiva e o início do prazo.', c0.id || impT.id, pubGrav ? '' : 'triagem.Tempest - Publicação', pubGrav ? '' : c0.d);
    else add('in', 'Intimação da decisão recorrida (ID ' + impT.id + '): nenhuma ciência ou publicação na cronologia lida até o recurso — leia a cronologia toda ou confira no PJe.', impT.id);
  }
  /* gratuidade: decisão que a deferiu e alcance ao recurso */
  var aj = L.filter(function (d) { var t4 = texto(d); return t4 && /(defiro|deferid[ao]s?|concedo|concedid[ao]s?)\s+(os benef[íi]cios d[ao]\s+)?(a\s+)?(gratuidade|justi[çc]a gratuita|assist[êe]ncia judici[áa]ria)/i.test(t4); })[0];
  if (aj) add('in', 'Gratuidade deferida no ID ' + aj.id + ' (' + aj.data + '): alcança o recurso, salvo revogação — o preparo fica dispensado para quem a obteve.', aj.id);
  return out;
}

/* ---------- desenho ---------- */
function hora() { return A.em ? new Date(A.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''; }
function botaoLer() {
  var tela = window.MutaPje && window.MutaPje.tela ? window.MutaPje.tela() : '';
  return '<button type="button" class="btn sm ' + (A.itens ? 'line' : 'solid') + '" data-au="ler"' + (A.lendo ? ' disabled' : '') + '>' + (A.lendo === true ? 'Lendo…' : A.itens ? 'Reler' : 'Ler os autos') + '</button>' +
    (A.itens ? '<button type="button" class="btn line sm" data-au="tudo"' + (A.lendo ? ' disabled' : '') + ' title="Rola o painel esquerdo do PJe até carregar a cronologia inteira">' + (A.lendo === 'tudo' ? 'Carregando…' : 'Cronologia toda') + '</button>' : '') +
    (tela !== 'autos' && !A.itens ? '<span class="muted">Abra os autos digitais do processo no PJe.</span>' : '');
}
/* Situação atual: última decisão, última peça, última informação e última movimentação (com ID e data) */
function htmlSituacao(registro) {
  var L = lista().filter(function (d) { return !d.anexo; }), M = movimentos();
  var linha = function (rot, d) { return d ? '<div class="sa-l"><span>' + esc(rot) + '</span><b>' + esc(d.tipo) + (d.desc && N(d.desc) !== N(d.tipo) ? ' <small>(' + esc(d.desc) + ')</small>' : '') + '</b><button type="button" class="mono lnk" data-copia="' + esc(d.id) + '" title="Copiar o ID">ID ' + esc(d.id) + '</button><em>' + esc(d.data) + (d.hora ? ' ' + esc(d.hora) : '') + '</em></div>' : ''; };
  var h = '';
  if (A.itens && lidoDoProcesso()) {
    var dec = L.filter(function (d) { return d.g === 'Decisões'; })[0], pec = L.filter(function (d) { return /Recursos|Petições|MPF/.test(d.g); })[0], inf = L.filter(function (d) { return d.g === 'Andamento'; })[0], mv = M[0];
    h = linha('Última decisão', dec) + linha('Última peça', pec) + linha('Última informação', inf) +
      (mv ? '<div class="sa-l"><span>Última movimentação</span><b>' + esc(mv.t) + '</b><em>' + esc(mv.data) + (mv.hora ? ' ' + esc(mv.hora) : '') + '</em></div>' : '');
  }
  var reg = S(registro);
  if (!h && reg) h = '<dl class="tr-dl">' + reg.split(/\n+/).map(function (l) { var i = l.indexOf(': '); return i > 0 && i < 40 ? '<dt>' + esc(l.slice(0, i)) + '</dt><dd>' + esc(l.slice(i + 2)) + '</dd>' : '<dd class="w">' + esc(l) + '</dd>'; }).join('') + '</dl>';
  return '<section class="card pc-sec" id="g-sa"><div class="pc-sh"><h3>Situação atual</h3><small class="muted">' + (A.itens && lidoDoProcesso() ? 'autos lidos às ' + hora() : reg ? 'conferida na triagem' : '') + '</small></div>' +
    (h || '<p class="muted">Abra os autos digitais no PJe.</p>') + '</section>';
}
function estadoDoc(id) {
  var d = A.docs[id]; if (!d) return '';
  if (d.estado === 'lendo') return '<span class="au-st">' + esc(d.prog || 'lendo…') + '</span>';
  if (d.estado === 'erro') return '<span class="au-st err" title="' + esc(d.erro) + '">erro</span>';
  if (d.estado === 'sem') return '<span class="au-st al" title="Nem a camada de texto nem o OCR trouxeram texto">sem texto</span>';
  return '<span class="au-st ok"' + (d.ocr ? ' title="' + d.ocr + ' página(s) lida(s) por OCR: confira nomes, números e datas"' : '') + '>' + (d.fmt === 'pdf' ? d.pags + ' pág.' + (d.ocr ? ' · OCR' : '') : 'texto') + '</span>';
}
/* lista de documentos, com especificação (gravada em "Outras peças") e os botões de cada um */
function htmlDocs() {
  var tela = window.MutaPje && window.MutaPje.tela ? window.MutaPje.tela() : '';
  var cab = '<div class="pc-sh"><h3>Documentos dos autos</h3><small class="muted">' + (A.itens ? A.itens.reduce(function (n, i) { return n + (i.docs || []).length; }, 0) + ' na cronologia · lidos às ' + hora() : 'painel esquerdo dos autos digitais') + '</small></div>';
  if (A.erro) return '<section class="card pc-sec" id="g-docs">' + cab + '<div class="bar au-bl">' + botaoLer() + '</div><p class="status err">' + esc(A.erro) + '</p></section>';
  if (!A.itens) return '<section class="card pc-sec" id="g-docs">' + cab + '<div class="bar au-bl">' + botaoLer() + '</div>' + (tela === 'autos' ? '' : '<p class="muted">Abra os autos digitais no PJe.</p>') + '</section>';
  var outro = !lidoDoProcesso() ? '<p class="status err">Os autos lidos são do processo ' + esc(A.cnj || 'sem número') + ', não do aberto no painel. Leia de novo na aba dos autos certos.</p>' : '';
  var L = lista(), F = A.filtro, V = F === 'pecas' ? L.filter(function (d) { return d.k !== 'outro' && !d.anexo; }) : L;
  var outras = linhasGravadas('origem', 'Outras peças'), espDe = function (id) { if (id in A.esp) return A.esp[id]; var r = outras.filter(function (x) { return S(x.ids) === id; })[0]; return r ? S(r.texto) : ''; };
  var lidos = Object.keys(A.docs).filter(function (k) { return /^(ok|sem)$/.test(A.docs[k].estado); }).length;
  var h = '<section class="card pc-sec" id="g-docs">' + cab + outro +
    '<div class="bar au-bl">' + botaoLer() + '<button type="button" class="btn solid sm" data-au="princ"' + (A.fila ? ' disabled' : '') + ' title="Lê o texto das decisões, recursos, contrarrazões, pareceres, procurações e custas: alimenta a conferência automática">' + (A.fila ? 'Lendo ' + A.fila + '…' : 'Peças principais') + '</button></div>' +
    '<div class="bar au-tj"><button type="button" class="btn line sm" data-au="tudojs"' + (A.todo ? ' disabled' : '') + ' title="Lê o texto de todos os documentos (PDF digitalizado vai ao OCR) e baixa num arquivo, no formato do acervo">' + SVGDL + (A.todo ? 'Lendo ' + A.todo.feitos + '/' + A.todo.total + '…' : 'Baixar inteiro teor (JSON)') + '</button></div>' +
    (A.msg ? '<p class="status ok">' + esc(A.msg) + '</p>' : '') +
    '<div class="au-fx"><span class="seg"><button type="button" data-au="f:pecas" aria-selected="' + (F === 'pecas') + '">Peças</button><button type="button" data-au="f:todos" aria-selected="' + (F === 'todos') + '">Todos (' + L.length + ')</button></span><small class="muted">' + lidos + ' com texto lido</small></div>' +
    '<div class="au-docs">' + V.map(function (d) {
      var ab = A.abertos[d.id], dd = A.docs[d.id];
      return '<div class="au-doc' + (d.anexo ? ' anx' : '') + (PRINC[d.k] ? ' pr' : '') + '"><div class="au-h"><span class="au-d">' + esc(d.data) + (d.hora ? '<small>' + esc(d.hora) + '</small>' : '') + '</span>' +
        '<div class="au-n"><b>' + esc(d.tipo) + '</b>' + (d.desc && N(d.desc) !== N(d.tipo) ? '<small>' + esc(d.desc) + '</small>' : '') + '</div>' +
        '<button type="button" class="mono lnk" data-copia="' + esc(d.id) + '" title="Copiar o ID">' + esc(d.id) + '</button></div>' +
        '<div class="au-inf">' + [d.rot, d.anexo ? 'anexo' : '', d.origem].filter(Boolean).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + (d.movs && d.movs.length && !d.anexo ? '<small>' + esc(d.movs.join(' · ')) + '</small>' : '') + '</div>' +
        '<div class="au-a"><input type="text" class="au-esp" data-esp="' + esc(d.id) + '" placeholder="Detalhamento" title="Vai para Outras peças e ocorrências da ficha" value="' + esc(espDe(d.id)) + '">' +
        '<button type="button" class="btn line sm" data-au="ext:' + esc(d.id) + '"' + (dd && dd.estado === 'lendo' ? ' disabled' : '') + ' title="Lê o texto do documento no painel">' + (dd && /^(ok|sem)$/.test(dd.estado) ? (ab ? 'Fechar' : 'Ver texto') : 'Inteiro teor') + '</button>' +
        '<button type="button" class="btn line sm" data-au="ocr:' + esc(d.id) + '"' + (dd && dd.estado === 'lendo' ? ' disabled' : '') + ' title="Lê o documento por OCR, página por página (PDF digitalizado ou com texto ruim). Roda no computador; nada sai dele">OCR</button>' +
        '<button type="button" class="btn line sm" data-au="js:' + esc(d.id) + '" title="Baixa esta peça em JSON (lê o texto antes, se preciso)">JSON</button>' +
        '<button type="button" class="btn line sm au-pdf" data-au="pdf:' + esc(d.id) + '" title="Abre o PDF no PJe, numa aba nova" aria-label="Abrir o PDF no PJe">↗</button>' + estadoDoc(d.id) + '</div>' +
        (ab && dd && dd.texto ? '<div class="au-tx"><div class="bar"><button type="button" class="lnk" data-au="cp:' + esc(d.id) + '">Copiar o texto</button><small class="muted">' + (dd.fmt === 'pdf' ? dd.pags + ' página(s)' + (dd.lidas < dd.pags ? ', lidas ' + dd.lidas : '') : 'HTML') + '</small></div>' + (dd.html ? '<div class="tx-j">' + dd.html.slice(0, 1500).map(function (h) { return '<p>' + limpaH(h) + '</p>'; }).join('') + '</div>' : '<div class="tx-j">' + esc(dd.texto.slice(0, 60000)).split(/\n+/).map(function (l) { return '<p>' + l + '</p>'; }).join('') + '</div>') + '</div>' : '') +
        (ab && dd && dd.estado === 'sem' ? '<p class="status err au-tx">Sem texto legível, nem pelo OCR' + (dd.pags > OCR_MAX ? ' (o OCR lê até ' + OCR_MAX + ' páginas)' : '') + ': abra o PDF (↗).</p>' : '') + '</div>';
    }).join('') + '</div></section>';
  return h;
}
function htmlSugestoes(secoes) {
  if (!A.itens || !lidoDoProcesso()) return '';
  if (!A.sug) calcular();
  var I = (A.sug || []).filter(function (it) { return !secoes || naSecao(it.sec, secoes); });
  var marc = I.filter(function (i) { return i.apply && i.status !== 'igual'; }).length;
  if (A.sugMsg) return '<p class="status err">' + esc(A.sugMsg) + '</p>';
  if (!I.length) return '<p class="muted">Nada a sugerir nestas partes com o que foi lido' + (Object.keys(A.docs).length ? '' : ' (leia as peças principais)') + '.</p>';
  var valor = function (it) { return dataBr(it.kind === 'tabela' ? it.value.map(function (l) { return Object.keys(l).filter(function (c) { return S(l[c]); }).map(function (c) { return c + ': ' + S(l[c]).slice(0, 90); }).join(' · '); }).join(' | ') : S(it.value)); };
  /* o que já confere com a ficha não tem o que gravar: fica recolhido numa linha */
  var pend = I.filter(function (it) { return it.status !== 'igual'; }), iguais = I.filter(function (it) { return it.status === 'igual'; });
  var G = {}, ordem = [];
  pend.forEach(function (it) { var k = (A.sug || []).indexOf(it); if (!G[it.sec]) { G[it.sec] = []; ordem.push(it.sec); } G[it.sec].push([it, k]); });
  var h = ordem.map(function (sec) {
    return '<h4 class="tr-g">' + esc(sec) + '</h4>' + G[sec].map(function (x) {
      var it = x[0], k = x[1], v = valor(it);
      return '<label class="sg-i is-' + it.status + '"><input type="checkbox" data-sg="' + k + '"' + (it.apply ? ' checked' : '') + '>' +
        '<span class="sg-b"><span class="sg-h"><b>' + esc(it.label) + '</b><i class="sg-s">' + (it.status === 'conflito' ? 'diverge' : 'novo') + '</i>' + (it.doc ? '<small class="mono">ID ' + esc(it.doc) + '</small>' : '') + '</span>' +
        '<span class="sg-v">' + esc(v.slice(0, 600)) + '</span>' + (it.status === 'conflito' && it.kind !== 'tabela' ? '<small class="muted">Na ficha: ' + esc(dataBr(S(it.current))) + '</small>' : '') + (it.note ? '<small class="muted">' + esc(it.note) + '</small>' : '') + '</span></label>';
    }).join('');
  }).join('');
  var conf = iguais.length ? '<details class="sg-ig"><summary>' + (pend.length ? '' : 'Tudo confere com a ficha · ') + iguais.length + ' campo(s) já iguais na ficha</summary><ul>' +
    iguais.map(function (it) { return '<li><b>' + esc(it.label) + '</b> ' + esc(valor(it).slice(0, 160)) + (it.doc ? ' <small class="mono">ID ' + esc(it.doc) + '</small>' : '') + '</li>'; }).join('') + '</ul></details>' : '';
  return '<div class="sg">' + h + conf + (pend.length ? '<div class="bar"><button type="button" class="btn solid sm" data-au="aplicar" title="Só vai o que está marcado"' + (marc ? '' : ' disabled') + '>Gravar ' + marc + ' na ficha</button></div>' : '') + '</div>';
}
/* datas ISO (2025-07-01) aparecem como 01/07/2025 */
function dataBr(t) { return String(t || '').replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1'); }
/* Prontuário › Triagem: a conferência automática dos autos */
function htmlConferencia() {
  var tela = window.MutaPje && window.MutaPje.tela ? window.MutaPje.tela() : '';
  var h = '<section class="card pc-sec cf" id="g-cf"><div class="pc-sh"><h3>Conferência automática dos autos</h3><small class="muted">sugestões para conferir</small></div>';
  if (!A.itens || !lidoDoProcesso()) return h + '<div class="bar au-bl">' + botaoLer() + '</div><p class="muted">' + (tela === 'autos' ? 'Leia os autos.' : 'Abra os autos digitais no PJe.') + '</p></section>';
  var al = alertas();
  h += '<div class="bar au-bl">' + botaoLer() + '<button type="button" class="btn solid sm" data-au="princ"' + (A.fila ? ' disabled' : '') + '>' + (A.fila ? 'Lendo ' + A.fila + '…' : 'Peças principais') + '</button></div>';
  /* o tipo de julgamento fica no cartão do processo (gabinete.js), não aqui */
  if (al.some(function (a) { return !/^Tipo de julgamento:/.test(a.t); })) h += '<div class="al-l">' + al.map(function (a, i) {
    if (/^Tipo de julgamento:/.test(a.t)) return '';
    return '<div class="al-i ' + a.nivel + '"><span>' + esc(a.t) + '</span>' + (a.campo ? '<button type="button" class="btn line sm" data-au="al:' + i + '">Gravar “' + esc(a.valor) + '”</button>' : '') + '</div>';
  }).join('') + '</div>';
  h += htmlSugestoes(['Admissibilidade e regularidade', 'Tempestividade', 'Preparo', 'Representação', 'Ministério Público', 'MPF', 'Matéria e gestão', 'Espécie e decisão impugnada', 'Embargos de declaração', 'Agravo interno', 'Juízo de retratação', 'Partes', 'Identificação'].concat(secoesTodas().filter(function (s) { return !naSecao(s, PROC_SECS); })));
  return h + '</section>';
}
/* o motor emite seções como "Origem · decisão ID …": vale o prefixo */
function naSecao(sec, lista) { sec = String(sec || ''); return lista.some(function (s) { return sec === s || sec.indexOf(s + ' ·') === 0; }); }
var PROC_SECS = ['Decisão recorrida / sentença', 'Sentença', 'Origem', 'Recursos e contrarrazões', 'Outras peças e ocorrências'];
function secoesTodas() { var o = []; (A.sug || []).forEach(function (i) { if (o.indexOf(i.sec) < 0) o.push(i.sec); }); return o; }
/* Prontuário › Processo: o preenchimento de sentença, origem, recursos e outras peças */
function htmlPreencher() {
  if (!A.itens || !lidoDoProcesso()) return '';
  return '<section class="card pc-sec" id="g-pre"><div class="pc-sh"><h3>Preencher pelos autos</h3><small class="muted">sentença, origem, recursos e contrarrazões, outras peças</small></div>' + htmlSugestoes(PROC_SECS) + '</section>';
}

/* ---------- ações ---------- */
function aplicar() {
  var C = {};
  (A.sug || []).forEach(function (i) { if (i.apply && i.alvo && i.status !== 'igual') C[i.alvo] = i.value; });
  var ks = Object.keys(C); if (!ks.length) return;
  var g = GB(); if (!g.marcar) return;
  ks.forEach(function (k) { g.marcar(k, C[k]); });
  g.gravar().then(function () { A.sug = null; redesenhar(); }, function () {});
}
function gravarEspecificacao(id) {
  var g = GB(); if (!g.marcar) return;
  var d = lista().filter(function (x) { return x.id === id; })[0]; if (!d) return;
  var L = linhasGravadas('origem', 'Outras peças').map(function (x) { return Object.assign({}, x); }), v = S(A.esp[id]);
  var k = L.map(function (x) { return S(x.ids); }).indexOf(id);
  if (k < 0 && !v) return;
  if (k < 0) L.push({ tipo: d.tipo + (d.desc && N(d.desc) !== N(d.tipo) ? ' (' + d.desc + ')' : ''), ids: id, data: iso(d.data), texto: v });
  else if (!v && !S(L[k].tipo)) L.splice(k, 1);
  else L[k].texto = v;
  g.marcar('origem.Outras peças', L);
  g.gravar().then(function () { delete A.esp[id]; }, function () {});
}
function copiar(t, el) {
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { if (el) { var o = el.textContent; el.textContent = 'Copiado'; setTimeout(function () { el.textContent = o; }, 1200); } }, function () {});
}
function clique(b) {
  var a = b.dataset.au || '';
  if (a === 'ler') ler(false);
  else if (a === 'tudo') ler(true);
  else if (a === 'princ') extrairPrincipais();
  else if (a === 'aplicar') aplicar();
  else if (/^f:/.test(a)) { A.filtro = a.slice(2); redesenhar(); }
  else if (/^ext:/.test(a)) { var id = a.slice(4), d = A.docs[id]; if (d && /^(ok|sem)$/.test(d.estado)) { A.abertos[id] = !A.abertos[id]; redesenhar(); } else { A.abertos[id] = true; extrair(id); } }
  else if (a === 'tudojs') baixarTudo();
  else if (/^js:/.test(a)) baixarPeca(a.slice(3));
  else if (/^ocr:/.test(a)) { A.abertos[a.slice(4)] = true; extrair(a.slice(4), 'ocr'); }
  else if (/^pdf:/.test(a)) abrirPdf(a.slice(4));
  else if (/^cp:/.test(a)) { var x = A.docs[a.slice(3)]; if (x && x.texto) copiar(x.texto, b); }
  else if (/^al:/.test(a)) { var al = alertas()[Number(a.slice(3))], g = GB(); if (al && al.campo && g.marcar) { g.marcar(al.campo, al.valor); g.gravar().catch(function () {}); } }
}
function marcarSugestao(k, on) { var it = (A.sug || [])[k]; if (it) it.apply = !!on; redesenhar(); }
function especificar(id, v) { A.esp[id] = v; clearTimeout(A.tEsp); A.tEsp = setTimeout(function () { gravarEspecificacao(id); }, 1500); }
function especificarJa(id) { if (id in A.esp) { clearTimeout(A.tEsp); gravarEspecificacao(id); } }

document.addEventListener('muta:prontuario', function () { var c = cnjAtual(); if (A.cnj && c && Muta.chaveProcesso(A.cnj) !== Muta.chaveProcesso(c)) { A.sug = null; } });
window.MutaAutos = { barra: function () { var tela = window.MutaPje && window.MutaPje.tela ? window.MutaPje.tela() : ''; if (!A.itens || !lidoDoProcesso()) return '<div class="bar au-bl rt-ler">' + botaoLer() + '<small class="muted">' + (tela === 'autos' ? 'Leia os autos para conferir.' : 'Abra os autos digitais no PJe.') + '</small></div>'; return '<div class="bar au-bl rt-ler">' + botaoLer() + '<button type="button" class="btn solid sm" data-au="princ"' + (A.fila ? ' disabled' : '') + '>' + (A.fila ? 'Lendo ' + A.fila + '…' : 'Peças principais') + '</button></div>'; }, sugestoes: function () { if (!A.itens || !lidoDoProcesso()) return []; if (!A.sug) calcular(); return A.sug || []; }, ler: ler, extrair: extrair, extrairPrincipais: extrairPrincipais, htmlDocs: htmlDocs, htmlSituacao: htmlSituacao, htmlConferencia: htmlConferencia, htmlPreencher: htmlPreencher,
  clique: clique, marcarSugestao: marcarSugestao, especificar: especificar, especificarJa: especificarJa, lista: lista, alertas: alertas, md: md, estado: function () { return A; },
  /* para testes: carrega uma cronologia e textos sem o PJe */
  _carregar: function (r, textos) { A.itens = r.itens; A.idp = r.idp || ''; A.host = r.host || ''; A.cnj = r.numero || ''; A.em = Date.now(); A.docs = {}; Object.keys(textos || {}).forEach(function (id) { A.docs[id] = { estado: 'ok', texto: textos[id], fmt: 'html', pags: 0 }; }); A.sug = null; } };
})();
