/* Muta · leitura do processo e do editor no PJe 2º grau (TRF-3)
   Roda nos quadros de pje2g.trf3.jus.br e de frontend-pje.app.trf3.jus.br (o painel de tarefas do PJe é
   carregado num quadro desse segundo endereço, e a tarefa aberta, com o editor, num quadro de pje2g dentro dele).
   Só lê o que está na tela: o número CNJ do processo aberto e, a pedido do painel, o texto do editor da minuta.
   Não clica, não grava e não envia nada ao tribunal; o número e o texto vão só ao painel da extensão.

   Critério do número, do mais forte para o mais fraco:
     3 · título da página com um único número (autos digitais);
     2 · cabeçalho da tarefa aberta ("ApCiv 5001289-76.2023.4.03.6006 - [Sessão] Aguardando a sessão")
         ou cabeçalho conhecido dos autos com um único número;
     1 · único número CNJ visível no quadro.
   Em listas de tarefas (vários números e nenhum cabeçalho), vale o processo escolhido na lista (clique no cartão ou
   na caixa de seleção); sem escolha, não informa nada.
   Informa também o contexto da tela (autos digitais, tarefa com editor) e o nome da tarefa (“[Sessão] Aguardando a sessão”,
   que indica o tipo de pronunciamento e os embargos de declaração) para o painel trocar de aba sozinho, e, a pedido:
   - a cronologia dos autos digitais (painel esquerdo: documentos com ID, tipo, descrição, data e hora), com o número
     interno do processo para baixar os documentos; com {tudo: true}, rola o painel esquerdo até carregar a cronologia inteira;
   - o conteúdo de um documento dos autos ({tipo: 'muta-doc', idp, id}): o mesmo download que o PJe oferece no botão do
     documento (GET, com a sessão de quem está logado); HTML vira texto, PDF segue para o painel extrair o texto. Só leitura. */
(function () {
  'use strict';
  var VERSAO = '0.19';
  if (window.__mutaPje === VERSAO) return;
  window.__mutaPje = VERSAO;

  var CNJ = '(\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4})';
  /* sem \b no fim: no PJe o número pode vir colado ao texto seguinte (ícones sem texto entre eles) */
  var RE = new RegExp('(?<!\\d)' + CNJ + '(?!\\d)', 'g');
  var RE_CLASSE = new RegExp('\\b([A-Z][A-Za-z]{1,13})\\s+' + CNJ + '(?!\\d)');
  /* cabeçalho da tarefa no painel do PJe: classe, número, ícone de cópia e " - [Tarefa]" */
  var RE_TAREFA = new RegExp('\\b([A-Z][A-Za-z]{1,13})\\s+' + CNJ + '[^\\[]{0,24}?-\\s*\\[', 'g');
  var CABECALHOS = ['#navbar .titulo-topo', '.titulo-topo', '#pageHeader', '.header-processo',
    '#processoIdentificacao', '.dados-processo', '.cabecalho-tarefa', '.titulo-tarefa', 'h1', 'h2', 'h3'];

  function numeros(texto) {
    var m, vistos = {}, lista = [];
    RE.lastIndex = 0;
    while ((m = RE.exec(texto || ''))) if (!vistos[m[1]]) { vistos[m[1]] = 1; lista.push(m[1]); }
    return lista;
  }
  function classeDe(texto, numero) {
    var m = RE_CLASSE.exec(texto || '');
    return m && m[2] === numero ? m[1] : '';
  }
  /* nome da tarefa aberta, depois do número: "- [Sessão] Aguardando a sessão" */
  function nomeTarefa(texto, numero) {
    var re = new RegExp('\\b[A-Z][A-Za-z]{1,13}\\s+' + numero.replace(/[.\-]/g, '\\$&') + '[^\\[\\n]{0,24}?-\\s*(\\[[^\\]\\n]{1,60}\\][^\\n]{0,90})');
    var m = re.exec(texto || '');
    return m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 120) : '';
  }
  function tarefa(texto) {
    var m, achados = {};
    RE_TAREFA.lastIndex = 0;
    while ((m = RE_TAREFA.exec(texto || ''))) achados[m[2]] = m[1];
    var k = Object.keys(achados);
    return k.length === 1 ? { numero: k[0], classe: achados[k[0]] } : null;
  }
  /* processo escolhido na lista de tarefas: clique no cartão ou na caixa de seleção (o cartão é o menor bloco com um só número) */
  var SEL = null, tfAnterior = '';
  function cartaoDe(el) {
    for (var e = el, i = 0; e && e !== document.body && i < 14; e = e.parentElement, i++) {
      var nn = numeros((e.innerText || e.textContent || '').slice(0, 4000));
      if (nn.length === 1) return { numero: nn[0], classe: classeDe(e.innerText || '', nn[0]) };
      if (nn.length > 1) return null;
    }
    return null;
  }
  /* cliques no editor, em campos de texto ou em documentos não escolhem processo (o texto da minuta cita outros números) */
  var FORA = '[contenteditable], .ProseMirror, textarea, select, input:not([type="checkbox"]), .ck-editor, .cke, .cke_editable, iframe, embed, object, .hcm';
  function escolher(el) {
    if (!el || !el.closest || el.closest(FORA)) return;
    var c = cartaoDe(el);
    if (!c) return;
    SEL = { numero: c.numero, classe: c.classe, t: Date.now() };
    ultimo = null; agendar();
  }
  document.addEventListener('click', function (e) { try { if (e.isTrusted) escolher(e.target); } catch (x) {} }, true);
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.type !== 'checkbox') return;
    if (t.checked) { escolher(t); return; }
    var c = cartaoDe(t);
    if (c && SEL && SEL.numero === c.numero) {
      var outro = Array.prototype.filter.call(document.querySelectorAll('input[type="checkbox"]'), function (x) { return x.checked; }).map(cartaoDe).filter(Boolean).pop();
      SEL = outro ? { numero: outro.numero, classe: outro.classe, t: Date.now() } : null;
      ultimo = null; agendar();
    }
  }, true);

  /* contexto da tela: autos digitais (cronologia à esquerda), tarefa com editor, tarefa, lista */
  function autosDigitais() { return !!document.getElementById('divTimeLine') || /listAutosDigitais|ConsultaProcesso\/Detalhe/i.test(location.pathname); }
  function temEditor() {
    var r = raizes();
    for (var i = 0; i < r.length; i++) {
      var el = r[i].querySelector('.ProseMirror, [contenteditable="true"], .ck-editor__editable, .cke_editable');
      if (el && (el.textContent || '').length >= 80 && visivel(el)) return true;
    }
    return Array.prototype.some.call(document.querySelectorAll('iframe'), function (f) {
      var d; try { d = f.contentDocument; } catch (e) { d = null; }
      return !!(d && d.body && (d.body.isContentEditable || d.designMode === 'on' || d.querySelector('.ProseMirror')) && (d.body.textContent || '').length >= 80 && visivel(f));
    });
  }
  function detectar() {
    var d = detectarNumero();
    if (d.numero && (d.via === 'tarefa' || d.via === 'seleção na lista')) {
      try { d.tarefa = nomeTarefa(document.body ? (document.body.innerText || '').slice(0, 300000) : '', d.numero); } catch (e) { d.tarefa = ''; }
    }
    d.ctx = autosDigitais() ? 'autos' : '';
    try { d.ed = !d.ctx && temEditor(); } catch (e) { d.ed = false; }
    if (!d.ctx) d.ctx = d.ed ? 'editor' : d.via === 'tarefa' ? 'tarefa' : d.via === 'seleção na lista' ? 'lista' : '';
    return d;
  }
  function detectarNumero() {
    var t = document.title || '', n = numeros(t);
    if (n.length === 1) return { numero: n[0], classe: classeDe(t, n[0]), forca: 3, via: 'título' };
    var corpo = document.body ? (document.body.innerText || '').slice(0, 300000) : '';
    var tf = tarefa(corpo), tfn = tf ? tf.numero : '';
    /* a tarefa aberta trocou depois da escolha na lista: vale a tarefa */
    if (tfn !== tfAnterior) { if (tfn && SEL && SEL.numero !== tfn && Date.now() - SEL.t > 1500) SEL = null; tfAnterior = tfn; }
    if (SEL && corpo.indexOf(SEL.numero) >= 0) return { numero: SEL.numero, classe: SEL.classe || (tf && tf.numero === SEL.numero ? tf.classe : ''), forca: 2, via: tf && tf.numero === SEL.numero ? 'tarefa' : 'seleção na lista' };
    if (tf) return { numero: tf.numero, classe: tf.classe, forca: 2, via: 'tarefa' };
    for (var i = 0; i < CABECALHOS.length; i++) {
      var el = document.querySelector(CABECALHOS[i]);
      if (!el) continue;
      var tx = (el.innerText || el.textContent || '').slice(0, 400), nn = numeros(tx);
      if (nn.length === 1) return { numero: nn[0], classe: classeDe(tx, nn[0]), forca: 2, via: 'cabeçalho' };
    }
    var todos = numeros(corpo);
    if (todos.length === 1) return { numero: todos[0], classe: classeDe(corpo, todos[0]), forca: 1, via: 'único na tela' };
    return { numero: '', classe: '', forca: 0, via: '' };
  }

  var ultimo = null, espera = null;
  function informar() {
    espera = null;
    var d;
    try { d = detectar(); } catch (e) { return; }
    var chave = d.numero + '|' + d.classe + '|' + d.forca + '|' + d.ctx + '|' + d.ed + '|' + (d.tarefa || '');
    if (chave === ultimo) return;
    ultimo = chave;
    try { if (d.ctx === 'autos') sinaisAutos(d.numero); } catch (e) {}
    try { chrome.runtime.sendMessage({ tipo: 'muta-processo', numero: d.numero, classe: d.classe, forca: d.forca, via: d.via, ctx: d.ctx, ed: !!d.ed, tarefa: d.tarefa || '', host: location.host }); }
    catch (e) { /* extensão recarregada: esta página fica sem vínculo até ser recarregada */ }
  }
  function agendar() { if (!espera) espera = setTimeout(informar, 700); }

  /* ---------- editor da minuta (abas Lote, Comparar e Conformidade) ----------
     Procura editores de texto rico neste quadro: o editor do PJe (ProseMirror), iframes do CKEditor/TinyMCE de mesma
     origem, áreas editáveis e caixas de texto grandes; fica com o maior texto visível. Devolve o texto e os
     parágrafos com o estilo de cada um (classe, recuo, alinhamento, negrito e itálico), para a conformidade. Só lê. */
  var BLOCOS = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,td,th';
  function limpa(t) { return String(t || '').replace(/ /g, ' ').replace(/​/g, '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim(); }
  function textoDe(el) { return limpa(el.innerText || el.textContent || ''); }
  function visivel(el) { try { var r = el.getBoundingClientRect(); return r.width > 40 && r.height > 20; } catch (e) { return false; } }
  function proporcao(bloco, teste) {
    var total = 0, marcado = 0, w = bloco.ownerDocument.createTreeWalker(bloco, NodeFilter.SHOW_TEXT, null);
    while (w.nextNode()) {
      var n = w.currentNode, len = (n.nodeValue || '').replace(/\s+/g, '').length;
      if (!len) continue;
      total += len;
      if (teste(n.parentElement)) marcado += len;
    }
    return total ? Math.round(100 * marcado / total) / 100 : 0;
  }
  function negrito(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (/^(B|STRONG)$/.test(e.tagName)) return true;
      if (/^(P|LI|TD|TH|DIV|BLOCKQUOTE|BODY)$/.test(e.tagName)) break;
    }
    try { var fw = el.ownerDocument.defaultView.getComputedStyle(el).fontWeight; return parseInt(fw, 10) >= 600 || fw === 'bold'; } catch (x) { return false; }
  }
  function italico(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (/^(I|EM)$/.test(e.tagName)) return true;
      if (/^(P|LI|TD|TH|DIV|BLOCKQUOTE|BODY)$/.test(e.tagName)) break;
    }
    try { return el.ownerDocument.defaultView.getComputedStyle(el).fontStyle === 'italic'; } catch (x) { return false; }
  }
  /* HTML leve do bloco: o texto com <b>, <i> e <u> onde houver (pela marca ou pelo estilo calculado); nada mais */
  function escH(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function leve(el, depth) {
    var out = '', view = el.ownerDocument && el.ownerDocument.defaultView;
    Array.prototype.forEach.call(el.childNodes, function (n) {
      if (n.nodeType === 3) { out += escH(n.nodeValue.replace(/[ \t\u00a0]+/g, ' ')); return; }
      if (n.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(n.tagName)) return;
      if (n.tagName === 'BR') { out += '<br>'; return; }
      var inner = depth > 12 ? escH(n.textContent || '') : leve(n, (depth || 0) + 1); if (!inner) return;
      var cs = null, cp = null; try { cs = view.getComputedStyle(n); cp = view.getComputedStyle(n.parentNode); } catch (e) {}
      var b = /^(B|STRONG)$/.test(n.tagName) || (cs && cp && parseInt(cs.fontWeight, 10) >= 600 && parseInt(cp.fontWeight, 10) < 600);
      var i = /^(I|EM)$/.test(n.tagName) || (cs && cp && cs.fontStyle === 'italic' && cp.fontStyle !== 'italic');
      var u = n.tagName === 'U' || (cs && cp && /underline/.test(cs.textDecorationLine || '') && !/underline/.test(cp.textDecorationLine || ''));
      if (u) inner = '<u>' + inner + '</u>'; if (i) inner = '<i>' + inner + '</i>'; if (b) inner = '<b>' + inner + '</b>';
      out += inner;
    });
    return out;
  }
  function paragrafos(raiz) {
    var lista = [], vistos = 0;
    var blocos = raiz.querySelectorAll(BLOCOS);
    Array.prototype.forEach.call(blocos, function (b) {
      if (vistos > 4000) return;
      if (b.querySelector(BLOCOS)) return; /* só os blocos folha */
      var t = textoDe(b);
      if (!t) return;
      vistos++;
      var cs = null; try { cs = b.ownerDocument.defaultView.getComputedStyle(b); } catch (e) {}
      lista.push({
        t: t, tag: b.tagName.toLowerCase(), cls: String(b.className || '').slice(0, 120),
        recuo: cs ? parseFloat(cs.textIndent) || 0 : 0, alinha: cs ? cs.textAlign : '',
        neg: proporcao(b, negrito), ita: proporcao(b, italico), h: (function () { try { var x = leve(b, 0).trim(); return /<(b|i|u)>/.test(x) ? x.slice(0, 20000) : ''; } catch (e) { return ''; } })(),
        cita: !!(b.closest && b.closest('blockquote')) || /cita/i.test(String(b.className || ''))
      });
    });
    if (!lista.length) { var tx = textoDe(raiz); if (tx) tx.split(/\n+/).forEach(function (l) { l = l.trim(); if (l) lista.push({ t: l, tag: 'p', cls: '', recuo: 0, alinha: '', neg: 0, ita: 0, cita: false }); }); }
    return lista;
  }
  /* o documento e as shadow roots abertas (editores montados como componentes) */
  var RZ = { t: 0, l: null };
  function raizes() {
    if (RZ.l && Date.now() - RZ.t < 3000) return RZ.l;
    var lista = [document], i = 0;
    while (i < lista.length && lista.length < 60) {
      var r = lista[i++], els = r.querySelectorAll('*');
      for (var j = 0; j < els.length && lista.length < 60; j++) if (els[j].shadowRoot) lista.push(els[j].shadowRoot);
    }
    RZ.t = Date.now(); RZ.l = lista;
    return lista;
  }
  function todos(sel) {
    var out = [];
    raizes().forEach(function (r) { Array.prototype.push.apply(out, r.querySelectorAll(sel)); });
    return out;
  }
  function editores() {
    var c = [];
    function add(raiz, vis, fonte) {
      var ps = paragrafos(raiz), t = ps.map(function (p) { return p.t; }).join('\n');
      if (t.length >= 80) c.push({ t: t, ps: ps, vis: vis, fonte: fonte });
    }
    todos('.ProseMirror[contenteditable="true"], .ProseMirror').forEach(function (el) {
      if (el.parentElement && el.parentElement.closest('.ProseMirror')) return;
      add(el, visivel(el), 'editor do PJe');
    });
    Array.prototype.forEach.call(document.querySelectorAll('iframe'), function (f) {
      var d; try { d = f.contentDocument; } catch (e) { d = null; }
      if (!d || !d.body) return;
      var pm = d.querySelectorAll('.ProseMirror');
      if (pm.length) { Array.prototype.forEach.call(pm, function (el) { if (!(el.parentElement && el.parentElement.closest('.ProseMirror'))) add(el, visivel(f), 'editor do PJe'); }); return; }
      var b = d.body, ed = b.isContentEditable || d.designMode === 'on' || /cke_editable|mce-content-body|ck-content/.test(b.className || '');
      if (ed) add(b, visivel(f), /cke/.test(b.className || '') || /cke/.test(f.className || '') ? 'CKEditor' : /mce/.test(b.className || '') ? 'TinyMCE' : 'editor (iframe)');
    });
    if (!c.length) {
      todos('[contenteditable="true"], .ck-editor__editable, .cke_editable').forEach(function (el) {
        if (el.parentElement && el.parentElement.closest('[contenteditable="true"]')) return;
        add(el, visivel(el), el.classList.contains('ck-editor__editable') ? 'CKEditor 5' : 'área editável');
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('textarea'), function (el) {
      var v = el.value || '';
      if (v.length > 300) c.push({ t: v.trim(), ps: v.split(/\n+/).map(function (l) { return { t: l.trim(), tag: 'p', cls: '', recuo: 0, alinha: '', neg: 0, ita: 0, cita: false }; }).filter(function (p) { return p.t; }), vis: visivel(el), fonte: 'caixa de texto' });
    });
    return c.sort(function (a, b) { return (b.vis - a.vis) || (b.t.length - a.t.length); });
  }
  /* ---------- autos digitais: a cronologia do painel esquerdo (documentos, movimentos e datas) ----------
     Lê #divTimeLine da página dos autos digitais: cada bloco tem os movimentos (em maiúsculas), os documentos
     ("ID - Tipo (descrição) - ID de origem N") e a hora; a data vem do separador anterior. Só lê. */
  var MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
  function dataBr(t) {
    var m = /(\d{1,2})\s+([a-zç]{3})\.?\s+(\d{4})/i.exec(t || ''), mm = m && MESES[m[2].toLowerCase()];
    return mm ? ('0' + m[1]).slice(-2) + '/' + ('0' + mm).slice(-2) + '/' + m[3] : '';
  }
  var RE_DOC = /^(\d{6,12})\s*-\s*(.+?)(?:\s*-\s*ID de origem\s*(\d+))?\s*$/;
  function lerCronologia() {
    var tl = document.getElementById('divTimeLine');
    if (!tl) return null;
    var data = '', itens = [], jaVisto = {};
    Array.prototype.forEach.call(tl.querySelectorAll('.media'), function (m) {
      if (m.classList.contains('div-data-rolagem')) return; /* data flutuante da rolagem */
      if (m.classList.contains('data')) { var d = dataBr(m.textContent); if (d) data = d; return; }
      if (!m.classList.contains('interno')) return;
      var it = { data: data, hora: '', docs: [], movs: [], ativo: m.classList.contains('active') }, vistos = {};
      Array.prototype.forEach.call(m.querySelectorAll('a'), function (a) {
        var x = RE_DOC.exec(limpa(a.innerText || a.textContent).replace(/\s+/g, ' '));
        if (!x || vistos[x[1]] || jaVisto[x[1]]) return; /* a página repete a lista inteira em ordem crescente: vale a primeira */
        vistos[x[1]] = jaVisto[x[1]] = 1;
        var tipo = x[2], desc = '', p = /^(.*?)\s*\((.*)\)\s*$/.exec(tipo);
        if (p && p[1]) { tipo = p[1]; desc = p[2]; }
        it.docs.push({ id: x[1], tipo: tipo.trim(), desc: desc.trim(), origem: x[3] || '' });
      });
      limpa(m.innerText || m.textContent).split('\n').forEach(function (l) {
        l = l.replace(/\s+/g, ' ').trim();
        if (!l) return;
        if (/^\d{2}:\d{2}$/.test(l)) { it.hora = l; return; }
        if (RE_DOC.test(l)) return;
        if (l.length >= 6 && l === l.toUpperCase() && /[A-ZÀ-Ü]{3}/.test(l)) it.movs.push(l);
      });
      if (it.docs.length || (it.movs.length && it.hora)) itens.push(it);
    });
    return itens;
  }
  /* número interno do processo, que vai no endereço de download dos documentos ("download/TRF3/2g/<número>/<ID>") */
  function idInterno() {
    var tl = document.getElementById('divTimeLine'), m = tl ? /download\/TRF3\/2g\/(\d+)\//.exec(tl.innerHTML) : null;
    if (m) return m[1];
    m = /[?&]idProcesso=(\d+)/.exec(location.search) || /download\/TRF3\/2g\/(\d+)\//.exec(document.body ? document.body.innerHTML.slice(0, 400000) : '');
    return m ? m[1] : '';
  }
  /* o painel esquerdo carrega a cronologia aos poucos, ao rolar: rola até parar de crescer (no máximo 60 vezes) */
  function carregarTudo() {
    var sc = document.getElementById('divTimeLine:divEventosTimeLine') || document.querySelector('#divTimeLine [id$="divEventosTimeLine"]') || document.getElementById('divTimeLine');
    var conta = function () { var t = document.getElementById('divTimeLine'); return t ? t.querySelectorAll('a').length : 0; };
    var parado = 0, voltas = 0, topo = sc ? sc.scrollTop : 0;
    return new Promise(function (ok) {
      (function passo() {
        if (!sc || parado >= 3 || voltas++ >= 60) { if (sc) sc.scrollTop = topo; ok(); return; }
        var antes = conta(); sc.scrollTop = sc.scrollHeight; try { sc.dispatchEvent(new Event('scroll')); } catch (e) {}
        setTimeout(function () { parado = conta() > antes ? 0 : parado + 1; passo(); }, 700);
      })();
    });
  }
  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, responder) {
      if (!msg || msg.tipo !== 'muta-autos') return;
      if (!document.getElementById('divTimeLine')) return;
      var feito = function () {
        var itens = lerCronologia() || [], d = detectar() || {};
        responder({ numero: d.numero || '', itens: itens, docs: itens.reduce(function (n, i) { return n + i.docs.length; }, 0), idp: idInterno(), host: location.host, url: location.host + location.pathname });
      };
      if (msg.tudo) { carregarTudo().then(feito); return true; }
      feito();
    });
  } catch (e) {}

  /* conteúdo de um documento dos autos: o download do próprio PJe (só leitura). PDF vai em base64 para o painel ler o texto. */
  function base64(buf) {
    var u = new Uint8Array(buf), s = '', k = 0x8000;
    for (var i = 0; i < u.length; i += k) s += String.fromCharCode.apply(null, u.subarray(i, i + k));
    return btoa(s);
  }
  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, responder) {
      if (!msg || msg.tipo !== 'muta-doc') return;
      if (!document.getElementById('divTimeLine')) return;
      var idp = String(msg.idp || idInterno()), id = String(msg.id || '');
      if (!/^\d{3,}$/.test(idp) || !/^\d{5,}$/.test(id)) { responder({ erro: 'documento ou processo sem número' }); return; }
      var url = location.origin + '/pje/seam/resource/rest/pje-legacy/documento/download/TRF3/2g/' + idp + '/' + id;
      fetch(url, { credentials: 'include' }).then(function (r) {
        if (r.status !== 200) throw new Error('o PJe respondeu ' + r.status);
        var ct = String(r.headers.get('content-type') || '');
        return r.arrayBuffer().then(function (b) {
          var pdf = /pdf/i.test(ct) || new TextDecoder('latin1').decode(b.slice(0, 5)) === '%PDF-';
          if (pdf) {
            if (b.byteLength > 30 * 1024 * 1024) { responder({ erro: 'PDF grande demais para ler no painel (' + Math.round(b.byteLength / 1048576) + ' MB)', url: url }); return; }
            responder({ fmt: 'pdf', b64: base64(b), bytes: b.byteLength, url: url }); return;
          }
          var h = new TextDecoder('utf-8').decode(b), x = new DOMParser().parseFromString(h, 'text/html');
          x.querySelectorAll('script,style').forEach(function (e) { e.remove(); });
          var ps = [], hs = [], marcado = false;
          Array.prototype.forEach.call(x.body ? x.body.querySelectorAll('p,li,h1,h2,h3,h4,td,div') : [], function (e) {
            if (e.querySelector('p,li,h1,h2,h3,h4,td,div')) return;
            var t = (e.textContent || '').replace(/[ \t\u00a0]+/g, ' ').trim(); if (!t) return; ps.push(t);
            /* documento fora da página: o estilo calculado não existe; valem as marcas b/strong/i/em/u */
            var hh = ''; try { hh = leve(e, 0).trim(); } catch (er) {} if (/<(b|i|u)>/.test(hh)) marcado = true; hs.push(hh || escH(t));
          });
          var texto = ps.length ? ps.join('\n') : (x.body ? x.body.textContent : h).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
          responder({ fmt: 'html', texto: texto, html: marcado ? hs : null, bytes: b.byteLength, url: url });
        });
      }).catch(function (e) { responder({ erro: String(e && e.message || e), url: url }); });
      return true;
    });
  } catch (e) {}

  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, responder) {
      if (!msg || msg.tipo !== 'muta-editor') return;
      var e = editores();
      if (!e.length) return;
      var d = detectar() || {};
      responder({ texto: e[0].t, paragrafos: e[0].ps, fonte: e[0].fonte, visivel: e[0].vis, outros: e.length - 1, numero: d.numero || '', url: location.host + location.pathname });
    });
  } catch (e) {}

  /* ---------- 0.25 · inserir no editor do PJe (parágrafo-padrão, citação de precedente) na posição do cursor ----------
     Cola como colagem comum (o editor converte o HTML no formato dele); sem cursor no editor, vai para o fim. */
  function editorAlvo() {
    var R = [];
    var ok = function (el, d) { if (el && visivel(el.ownerDocument === document ? el : (d.defaultView && d.defaultView.frameElement) || el)) R.push({ el: el, doc: d }); };
    todos('.ProseMirror[contenteditable="true"]').forEach(function (el) { if (!(el.parentElement && el.parentElement.closest('.ProseMirror'))) ok(el, document); });
    Array.prototype.forEach.call(document.querySelectorAll('iframe'), function (f) {
      var d; try { d = f.contentDocument; } catch (e) { d = null; } if (!d || !d.body) return;
      var pm = d.querySelector('.ProseMirror[contenteditable="true"]');
      if (pm) { if (visivel(f)) R.push({ el: pm, doc: d }); return; }
      if ((d.body.isContentEditable || d.designMode === 'on') && visivel(f)) R.push({ el: d.body, doc: d });
    });
    if (!R.length) todos('[contenteditable="true"], .ck-editor__editable').forEach(function (el) { if (!(el.parentElement && el.parentElement.closest('[contenteditable="true"]'))) ok(el, document); });
    return R[0] || null;
  }
  function inserirNoEditor(html, texto) {
    var A = editorAlvo(); if (!A) return { erro: 'Nenhum editor de texto aberto nesta tela do PJe.' };
    var d = A.doc, w = d.defaultView, sel = w.getSelection(), rg = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    var dentro = rg && A.el.contains(rg.commonAncestorContainer);
    try { A.el.focus(); } catch (e) {}
    sel = w.getSelection();
    if (dentro) { sel.removeAllRanges(); sel.addRange(rg); }
    else { var fim = d.createRange(); fim.selectNodeContents(A.el); fim.collapse(false); sel.removeAllRanges(); sel.addRange(fim); }
    var colou = false;
    try {
      var dt = new w.DataTransfer(); dt.setData('text/html', html); dt.setData('text/plain', texto || '');
      var ev = new w.ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      A.el.dispatchEvent(ev); colou = ev.defaultPrevented;
    } catch (e) {}
    if (!colou) { try { colou = d.execCommand('insertHTML', false, html); } catch (e) {} }
    return colou ? { ok: true, onde: dentro ? 'no cursor' : 'no fim do texto' } : { erro: 'O editor não aceitou a colagem automática; o texto foi copiado: cole com Ctrl+V.' };
  }
  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, responder) {
      if (!msg || msg.tipo !== 'muta-inserir') return;
      if (!editorAlvo()) return;
      responder(inserirNoEditor(String(msg.html || ''), String(msg.texto || '')));
    });
  } catch (e) {}

  /* ---------- 0.19 · selos na lista de tarefas (só no quadro do painel de tarefas; só leitura) ----------
     Em cada cartão da lista: etapa, quem minuta e quem corrige, urgência não apreciada, intercorrências, pendências,
     dias na tarefa, meta, sobrestamento, caso sensível e as etiquetas do gabinete que faltam no PJe (clique copia). */
  var ENR = { dados: {}, cat: null, cfg: null, t: 0, pedindo: false, tm: 0, pedidos: {} };
  var LISTA = location.host === 'frontend-pje.app.trf3.jus.br';
  function nrm(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  var CMTL = { d: null };
  function escS(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function icCss() {
    var E = window.MutaEtiquetas; if (!E || !E.ICONES) return '';
    return Object.keys(E.ICONES).map(function (k) {
      var u = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + E.ICONES[k] + '</svg>');
      return '.hero-etq[data-hero-ic="' + k + '"]{--hi:url("' + u + '")}';
    }).join('');
  }
  function cssSelos() {
    if (document.getElementById('muta-selos-css')) return;
    var st = document.createElement('style'); st.id = 'muta-selos-css';
    st.textContent = '.muta-selos{display:flex;flex-wrap:wrap;gap:3px;margin:4px 0 2px;font:600 10.5px/1.2 system-ui,Segoe UI,sans-serif}' +
      '.muta-selos span{display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:9px;border:1px solid #d5dbe1;background:#fff;color:#33424c;white-space:nowrap}' +
      '.muta-selos .m-et{background:#eef3f7;border-color:#c9d6e0;color:#1f4f6b}.muta-selos .m-al{background:#fdecea;border-color:#efb3a9;color:#a8321f}' +
      '.muta-selos .m-av{background:#fff4e5;border-color:#f0c88a;color:#8a5a10}.muta-selos .m-ok{background:#eaf6ef;border-color:#b5dcc4;color:#2f6e4b}' +
      '.muta-selos .m-et-l{background:#1f4f6b;color:#fff;border-color:#1f4f6b}.muta-selos [data-muta-copia]{cursor:copy}.muta-selos .m-mu{color:#6b7a84}' +
      '.hero-etq{border-radius:6px!important;font-weight:700!important;box-shadow:none!important;text-shadow:none!important;padding-left:6px!important;padding-right:6px!important}' +
      '.hero-etq *{color:inherit!important;background:transparent!important}' +
      '.hero-solido{background:var(--hc)!important;color:#fff!important;border:1px solid var(--hc)!important}' +
      '.hero-suave{background:color-mix(in srgb,var(--hc) 13%,#fff)!important;color:var(--hc)!important;border:1px solid color-mix(in srgb,var(--hc) 40%,#fff)!important}' +
      '.hero-contorno{background:#fff!important;color:var(--hc)!important;border:1.5px solid var(--hc)!important}' +
      '.hero-etq[data-hero-ic]:not([data-hero-ic=""])::before{content:"";display:inline-block;width:10px;height:10px;margin-right:4px;vertical-align:-1px;background:currentColor;-webkit-mask:var(--hi) center/contain no-repeat;mask:var(--hi) center/contain no-repeat}' +
      icCss() +
      '.muta-selos .hs{all:unset;cursor:pointer;position:relative;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:6px;color:#5d6b78}' +
      '.muta-selos .hs:hover{background:#eef3f7;color:#1f4f6b}' +
      '.muta-selos .hs b{position:absolute;top:-5px;right:-5px;min-width:13px;height:13px;padding:0 3px;box-sizing:border-box;border-radius:7px;background:#e8710a;color:#fff;font:800 9px/13px system-ui,sans-serif;text-align:center}' +
      '.muta-selos .hs-al{color:#b0402f}.muta-selos .hs-al b{background:#c62828}.muta-selos .hs-mu b{background:#4a7ea6}' +
      '.muta-selos .hf{flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:1px 0}' +
      '.muta-selos .hf-c{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;border:1px solid transparent;background:#eef0fb;color:#3f4aa0;font:600 10.5px/1.25 system-ui,sans-serif;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}' +
      '.muta-selos .hf-c-s{background:#5b63c7;color:#fff}.muta-selos .hf-c-o{background:#fff;border-color:#c9cdf0}.muta-selos .hf-c-t{background:#e4e7fa;white-space:normal}.muta-selos .hf-c-t small{font:700 7.5px system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#7d84c4;margin-right:2px}' +
      '.muta-selos .hf-e{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:12px;border:1px solid #dfe4e8;background:#fff;color:#33424c;font:600 10.5px system-ui,sans-serif}.muta-selos .hf-e>i{width:7px;height:7px;border-radius:50%;background:var(--d,#9aa8b3)}' +
      '.muta-selos .hf-e-tr{--d:#9aa8b3}.muta-selos .hf-e-mi{--d:#1a7fc0}.muta-selos .hf-e-co{--d:#e8a10a}.muta-selos .hf-e-li{--d:#00796b}.muta-selos .hf-e-as{--d:#5a3fa0;background:#f6f2fd;border-color:#e0d6f6;color:#4b2f8f}.muta-selos .hf-e-ok{--d:#2f8a5a;background:#f1faf4;border-color:#cfe9d9;color:#2f6e4b}.muta-selos .hf-e-u{--d:#c62828;background:#fdecea;border-color:#efb3a9;color:#a8321f}' +
      '.muta-selos .hf-tf{border:0;background:none;padding:0 2px;color:#66737f;font:500 10.5px system-ui,sans-serif}' +
      '.muta-selos .hf-st{flex-wrap:nowrap;gap:6px;padding:3px 8px 3px 3px;border-radius:14px;background:var(--sb);border:1px solid var(--sl);color:var(--sc);font:500 11px/1.3 system-ui,sans-serif}' +
      '.muta-selos .hf-st-ag{--sb:#fff7e8;--sl:#f3d9a4;--sc:#7a4f0c}.muta-selos .hf-st-an{--sb:#eaf3fb;--sl:#c3dcf1;--sc:#145a8a}.muta-selos .hf-st-ur{--sb:#fdecea;--sl:#efb3a9;--sc:#a8321f}.muta-selos .hf-st-as{--sb:#f6f2fd;--sl:#dccff5;--sc:#4b2f8f}.muta-selos .hf-st-so{--sb:#f1f3f5;--sl:#d7dde3;--sc:#4b5a66}.muta-selos .hf-st-ok{--sb:#eef8f2;--sl:#c5e4d1;--sc:#2f6e4b}' +
      '.muta-selos .hf-si{flex:none;width:20px;height:20px;padding:0;border:0;border-radius:50%;display:grid;place-items:center;background:var(--sc);color:#fff}' +
      '.muta-selos .hf-st>b{font:800 9.5px system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;flex:none}.muta-selos .hf-sc{border:0;background:none;padding:0;border-radius:0;color:inherit;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}.muta-selos .hf-st time{flex:none;font:600 10px system-ui,sans-serif;font-variant-numeric:tabular-nums;opacity:.75}' +
      '.muta-selos .hf-mov{flex-wrap:nowrap;gap:6px;color:#66737f;font:400 10.5px/1.3 system-ui,sans-serif;border-top:1px solid #eef0f3;padding-top:3px}.muta-selos .hf-mov>i{width:6px;height:6px;border-radius:50%;border:1.5px solid #9aa8b3;flex:none}' +
      '.muta-selos .hf-mt{border:0;background:none;padding:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#4b5a66;font-weight:400;border-radius:0}.muta-selos .hf-mov time{font:600 10px ui-monospace,Menlo,monospace;color:#7d8b96;flex:none}' +
      '.muta-selos .hf-px{flex-wrap:nowrap;align-items:flex-start;gap:7px;padding:5px 7px;border-radius:9px;border:1px solid #d6e6f5;background:linear-gradient(90deg,#f1f7fd,#fff)}' +
      '.muta-selos .hf-pi{flex:none;width:22px;height:22px;padding:0;border-radius:7px;border:1px solid #cfe2f4;background:#e6f1fb;color:#1a7fc0;display:grid;place-items:center}' +
      '.muta-selos .hf-pt{display:block;border:0;background:none;padding:0;white-space:normal;color:#1d2730;font:500 11px/1.35 system-ui,sans-serif;border-radius:0}.muta-selos .hf-pt small{display:block;font:700 8px system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#4a7ea6;margin-bottom:1px}' +
      '.muta-selos .m-tc{flex-basis:100%;border:0;background:none;padding:0;gap:5px;color:#1f4f6b;white-space:normal}.muta-selos .m-tc small{font:700 8px system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8a97a3;flex:none}.muta-selos .m-tc b{font:600 11px/1.25 system-ui,sans-serif}' +
      '.muta-selos .m-as{background:#efe9fb;border-color:#cdbcf0;color:#4b2f8f}.muta-selos .m-as-u{background:#fdecea;border-color:#efb3a9;color:#a8321f}' +
      '.muta-selos .m-sgs{flex-basis:100%;display:flex;flex-wrap:wrap;gap:3px;align-items:center;margin-top:1px}.muta-selos .m-sgs>small{font:700 8px system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8a97a3;margin-right:2px}' +
      '.muta-selos .m-sg{border:1.2px dashed color-mix(in srgb,var(--hc) 60%,#fff);color:var(--hc);background:#fff;border-radius:6px;font-weight:700}.muta-selos .m-sg:hover{background:color-mix(in srgb,var(--hc) 10%,#fff)}.muta-selos .m-sg-t{--hc:#1f4f6b;border-style:solid}' +
      '.muta-selos.hero-autos{display:inline-flex;margin:0 0 0 8px;vertical-align:middle}' +
      '.muta-selos .m-pes{display:inline-flex;align-items:center;gap:5px;padding:2px 9px 2px 3px;border-radius:14px;border:1px solid #e0dccc;background:#fff;color:#1d2730}' +
      '.muta-selos .m-pes>i{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:700 9px system-ui,sans-serif;font-style:normal}' +
      '.muta-selos .m-pes-m>i{background:#e3f2ec;color:#2f6e4b}.muta-selos .m-pes-c>i{background:#ece7f8;color:#5a3fa0}' +
      '.muta-selos{align-items:center}.muta-selos .m-pes>span{display:grid;line-height:1.05;border:0;padding:0;background:none;border-radius:0}.muta-selos .m-pes small{font:600 7.5px system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8a97a3}.muta-selos .m-pes b{font:600 11px system-ui,sans-serif}' +
      '.muta-selos .m-trilha{display:inline-flex;align-items:center;gap:4px;border:0;background:transparent;padding:0 2px}' +
      '.muta-selos .m-trilha i{width:20px;height:20px;border-radius:50%;border:1.5px dashed #b7c2cb;background:#fff;color:#9aa8b3;display:grid;place-items:center;flex:none}' +
      '.muta-selos .m-trilha i.ok{border:1.5px solid #2f8a5a;color:#2f8a5a;background:#f1faf4}' +
      '.muta-selos .m-trilha b{width:10px;border-top:1.5px dashed #c3ccd3}.muta-selos .m-trilha small{font:600 10px system-ui,sans-serif;color:#7d8b96;margin-left:-1px}.muta-selos .m-trilha small.ok{color:#1d6b45}' +
      '#hero-dlg{position:fixed;inset:0;z-index:2147483600;background:rgba(15,25,35,.42);display:grid;place-items:center;font:13px/1.45 system-ui,Segoe UI,sans-serif;color:#1d2730}' +
      '#hero-dlg .hd-bx{width:min(1180px,96vw);max-height:88vh;display:flex;flex-direction:column;background:#fff;border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.3);overflow:hidden}' +
      '#hero-dlg header{display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-bottom:1px solid #e3e8ec}#hero-dlg header>div{flex:1}' +
      '#hero-dlg header b{display:block;font:700 15px ui-monospace,Menlo,monospace}#hero-dlg header small{color:#5d6b78}' +
      '#hero-dlg header button{all:unset;cursor:pointer;font-size:22px;line-height:1;padding:0 4px;color:#5d6b78}' +
      '#hero-dlg .hd-st{font-size:12px;color:#5d6b78;align-self:center}#hero-dlg .hd-st.ok{color:#2f6e4b}#hero-dlg .hd-st.err{color:#a8321f}' +
      '#hero-dlg .hd-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;flex:1;min-height:0;overflow:auto}' +
      '@media (max-width:900px){#hero-dlg .hd-g{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
      '#hero-dlg .hd-c{display:flex;flex-direction:column;min-height:240px;border-right:1px solid #eef1f3;padding:10px 12px}#hero-dlg .hd-c:last-child{border-right:0}#hero-dlg .hd-c.fo{background:#fffaf0}' +
      '#hero-dlg .hd-cc{flex:1;overflow:auto}' +
      '#hero-dlg h4{margin:0 0 8px;font-size:13px;display:flex;align-items:center;gap:4px}#hero-dlg h4 i{font-style:normal;font-size:11px;color:#fff;background:#8a97a3;border-radius:8px;padding:0 6px;margin-left:auto}' +
      '#hero-dlg .hd-c[data-s=ic] h4 i{background:#c0412c}#hero-dlg .hd-c[data-s=pd] h4 i{background:#c98a1c}#hero-dlg .hd-c[data-s=av] h4 i{background:#d27b1c}#hero-dlg .hd-c[data-s=nt] h4 i{background:#4a7ea6}' +
      '#hero-dlg ul,#hero-dlg ol{margin:0;padding:0;list-style:none;display:grid;gap:6px}#hero-dlg ol{counter-reset:q}#hero-dlg ol li{counter-increment:q}#hero-dlg ol li p::before{content:"(" counter(q) ") ";font-weight:700;color:#5d6b78}' +
      '#hero-dlg li{display:flex;gap:7px;align-items:flex-start;border-left:3px solid #d5dbe1;padding:3px 0 3px 8px}#hero-dlg li input{margin-top:3px;flex:none;cursor:pointer}' +
      '#hero-dlg li.ok p{text-decoration:line-through;color:#8a97a3}#hero-dlg li.u{border-color:#c0412c}' +
      '#hero-dlg .hd-c[data-s=ic] li{border-color:#e07a66}#hero-dlg .hd-c[data-s=pd] li,#hero-dlg .hd-c[data-s=av] li{border-color:#e9b25c}#hero-dlg .hd-c[data-s=nt] li{border-color:#8fb3cf}' +
      '#hero-dlg li p{margin:0}#hero-dlg li small{color:#5d6b78;font-size:11px}#hero-dlg .hd-v{margin:0;color:#8a97a3;font-size:12px}' +
      '#hero-dlg .hd-sub{margin-bottom:10px}#hero-dlg .hd-sub>b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#5d6b78;margin-bottom:4px}#hero-dlg .hd-sub>p{margin:0;font-size:12.5px;text-align:justify}' +
      '#hero-dlg .hd-inc{display:flex;gap:4px;margin-top:8px}#hero-dlg .hd-inc input{flex:1;min-width:0;padding:5px 7px;border:1px solid #d5dbe1;border-radius:7px;font:inherit}' +
      '#hero-dlg .hd-inc button{all:unset;cursor:pointer;width:28px;text-align:center;border-radius:7px;background:#1f4f6b;color:#fff;font-weight:700}' +
      '#hero-dlg footer{padding:8px 14px;color:#8a97a3;font-size:11px}' +
      '.hero-col-oculta{display:none!important}.hero-col-oculta~*{max-width:100%!important;flex:1 1 100%!important;width:100%!important}' +
      '#hero-col-btn{position:fixed;left:50px;bottom:10px;z-index:2147483000;all:unset;position:fixed;left:50px;bottom:10px;cursor:pointer;padding:5px 10px;border-radius:16px;background:#1f4f6b;color:#fff;font:600 11.5px system-ui,Segoe UI,sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.25)}' +
      '#hero-col-btn:hover{background:#163a50}';
    (document.head || document.documentElement).appendChild(st);
  }
  function cartoesLista() {
    if (!LISTA || !document.body || document.getElementById('divTimeLine')) return [];
    if (numeros((document.body.textContent || '').slice(0, 500000)).length < 2) return [];
    var out = [], vistos = [], c = 0, n;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (x) { RE.lastIndex = 0; return RE.test(x.nodeValue) ? 1 : 3; } });
    while ((n = w.nextNode()) && c < 500) {
      c++;
      var el = n.parentElement; if (!el || (el.closest && (el.closest(FORA) || el.closest('.muta-selos')))) continue;
      var nn = numeros(n.nodeValue); if (nn.length !== 1) continue;
      var card = null;
      for (var e = el, i = 0; e && e !== document.body && i < 12; e = e.parentElement, i++) {
        if (numeros((e.textContent || '').slice(0, 8000)).length === 1) card = e; else break;
      }
      if (!card || vistos.indexOf(card) >= 0) continue;
      vistos.push(card); out.push({ el: card, numero: nn[0], k: nn[0].replace(/\D/g, ''), tn: n });
    }
    return out;
  }
  /* 0.31 · uma linguagem por família de informação (pedido do gestor, 21/11/2026):
     classificação (seção, assunto, subassunto, especificidade, tipo de caso) = chips suaves índigo com ícone;
     estado atual (etapa, tarefa, designação, trilha, sinalizações) = pílula de etapa com ponto de cor + avatares;
     movimentação = linha de lista, texto cinza e data à direita; próxima providência = aviso com ícone em ladrilho;
     etiquetas sugeridas = contorno tracejado. */
  function etapaCls(et) { return /^Assinada|^Liberado/.test(et) ? 'ok' : /assinatura/i.test(et) ? 'as' : /libera/i.test(et) ? 'li' : /corre/i.test(et) ? 'co' : /minuta/i.test(et) ? 'mi' : 'tr'; }
  function selosHtml(r, cat, texto) {
    var E = window.MutaEtiquetas; if (!E || !r) return '';
    r = E.preparar(r); var h = [], et = E.etapa(r), txt = nrm(texto || '');
    /* classificação */
    var cl = [], chip = function (ic, t, tit, cls) { return '<span class="hf-c' + (cls ? ' ' + cls : '') + '" title="' + escS(tit) + '">' + ico(ic, 11) + escS(t) + '</span>'; };
    if (r.secao) cl.push(chip('secao', r.secao, 'Seção competente', 'hf-c-s'));
    if (r.assunto) cl.push(chip('etiqueta', r.assunto, 'Assunto'));
    (r.subassuntos || []).slice(0, 3).forEach(function (x) { cl.push(chip('camadas', x, 'Subassunto (DataJud)', 'hf-c-o')); });
    if (r.especificidade) cl.push(chip('alvo', r.especificidade.length > 70 ? r.especificidade.slice(0, 68).replace(/\s+\S*$/, '') + '…' : r.especificidade, 'Especificidade: ' + r.especificidade, 'hf-c-o'));
    if (r.tipoCaso) cl.push('<span class="hf-c hf-c-t" title="Tipo de caso na triagem' + (r.tema && r.tema !== r.tipoCaso ? ': ' + escS(r.tema) : '') + '">' + ico('balanca', 11) + '<small>Tipo de caso</small>' + escS(r.tipoCaso) + '</span>');
    if (cl.length) h.push('<div class="hf hf-cls">' + cl.join('') + '</div>');
    /* estado atual: frase em gerúndio ("Aguardando contrarrazões", "Minutando · José"), com os dias */
    var cmt = (CMTL.d && CMTL.d[r._k]) || null, st = E.estado ? E.estado(r, { assinar: cmt }) : null;
    if (st) {
      var icS = { ag: 'ampulheta', an: 'lapis', ur: 'raio', as: 'lapis', so: 'pausa', ok: 'check' }[st.k] || 'relogio';
      h.push('<div class="hf hf-st hf-st-' + st.k + '" title="Estado atual' + (et ? ' · etapa no gabinete: ' + escS(et) : '') + (r.tarefa ? ' · tarefa no PJe: ' + escS(r.tarefa) : '') + '"><span class="hf-si">' + ico(icS, 11) + '</span><b>' + escS(st.v) + '</b><span class="hf-sc">' + escS(st.c) + '</span>' + (st.d != null ? '<time>há ' + st.d + ' d</time>' : '') + '</div>');
    }
    /* designação, trilha e sinalizações: só os ícones */
    var es = [];
    var pes = function (nome, rot, cls) { return '<span class="m-pes ' + cls + '" title="' + rot + ': ' + escS(nome) + '"><i>' + escS(E.iniciais(nome)) + '</i><span><small>' + rot + '</small><b>' + escS(String(nome).split(/\s+/)[0]) + '</b></span></span>'; };
    if (r.servidor) es.push(pes(r.servidor, 'Minuta', 'm-pes-m'));
    if (r.corretor) es.push(pes(r.corretor, 'Correção', 'm-pes-c'));
    if (r.servidor || r.corretor || r.minutado) {
      var br = function (x) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(x || ''); return m ? m[3] + '/' + m[2] : (x || ''); };
      var passo = function (ok, rot, data) { var nm = { 'Min.': 'Minutado', 'Corr.': 'Corrigido', 'Lib.': 'Liberado' }[rot] || rot, ic = { 'Min.': 'lapis', 'Corr.': 'check', 'Lib.': 'enviar' }[rot];
        return '<i class="tp' + (ok ? ' ok' : '') + '" title="' + nm + (ok ? (data ? ' em ' + escS(br(data)) : '') : ': pendente') + '">' + ico(ic, 11) + '</i>' + (ok && data && rot === 'Min.' ? '<small class="ok">' + escS(br(data)) + '</small>' : ''); };
      es.push('<span class="m-trilha" title="Trilha de produção">' + passo(!!r.minutado, 'Min.', r.minutado) + '<b></b>' + passo(!!r.corrigido, 'Corr.', r.corrigidoEm) + '<b></b>' + passo(!!(r.liberado || r.enviado), 'Lib.', r.liberadoEm) + '</span>');
    }
    r._falta = cat ? E.faltando(r, cat, texto) : [];
    es.push(sinaisHtml(r._k, r));
    h.push('<div class="hf hf-ic">' + es.join('') + '</div>');
    /* movimentação */
    if (r.movimento) h.push('<div class="hf hf-mov" title="Último movimento no PJe"><i></i><span class="hf-mt">' + escS(r.movimento) + '</span>' + (r.movimentoEm ? '<time>' + escS(String(r.movimentoEm).slice(0, 5)) + '</time>' : '') + '</div>');
    /* próxima providência */
    if (r.proxima) h.push('<div class="hf hf-px"><span class="hf-pi">' + ico('enviar', 12) + '</span><span class="hf-pt"><small>Próxima providência</small>' + escS(r.proxima) + '</span></div>');
    /* etiquetas sugeridas pela triagem do app e pelo catálogo, que ainda não estão no cartão: o clique copia (o PJe não é alterado) */
    var tem = nrm((r.etqPje || '') + ' ' + (texto || '')), sg = [];
    (r.etqTri || []).concat((r._falta || []).map(function (x) { return { e: x.nome, por: 'catálogo do gabinete' + (x.descricao ? ': ' + x.descricao : '') }; })).forEach(function (x) {
      if (!x || !x.e || tem.indexOf(nrm(x.e)) >= 0 || sg.some(function (y) { return nrm(y.e) === nrm(x.e); })) return; sg.push(x);
    });
    if (sg.length) {
      var chips = sg.slice(0, 8).map(function (x) { var c = E.categoriaDe ? E.categoriaDe(x.e, ENR.cat) : null;
        return '<span class="m-sg" style="--hc:' + escS((c && c.cor) || '#546e7a') + '" data-muta-copia="' + escS(x.e) + '" title="Sugerida: ' + escS(x.por || 'triagem') + ' · clique para copiar">+ ' + escS(x.e) + '</span>'; });
      h.push('<div class="m-sgs"><small>Sugeridas</small>' + chips.join('') + (sg.length > 1 ? '<span class="m-sg m-sg-t" data-muta-copia="' + escS(sg.map(function (x) { return x.e; }).join(', ')) + '" title="Copia todas as sugeridas, separadas por vírgula">copiar ' + sg.length + '</span>' : '') + '</div>');
    }
    return h.join('');
  }
  function pedirSelos(ks, textos) {
    if (ENR.pedindo || !ks.length) return; ENR.pedindo = true;
    try {
      /* textos: o que o cartão mostra (classe, partes, tarefa, prioridade, etiquetas), para o registro de chegadas do gestor */
      chrome.runtime.sendMessage({ tipo: 'muta-resumos', cnjs: ks, lista: true, textos: textos || {}, tarefa: tarefaAberta() }).then(function (r) {
        ENR.pedindo = false; ENR.t = Date.now();
        if (!r || r.erro) { ENR.erro = r && r.erro || 'sem resposta'; return; }
        ENR.erro = ''; Object.keys(r.resumos || {}).forEach(function (k) { ENR.dados[k] = r.resumos[k]; }); ENR.cat = r.catalogo; ENR.cfg = r.cfg; agendarSelos();
      }, function () { ENR.pedindo = false; });
    } catch (e) { ENR.pedindo = false; }
  }
  /* nome da tarefa aberta na lista (o item selecionado na árvore de tarefas ou o título da página) */
  function tarefaAberta() {
    var el = document.querySelector('[aria-selected="true"] .nome-tarefa, .tarefa-selecionada, li.active .nome, [class*="tarefa"][class*="selec"], [aria-current="page"]');
    var t = el ? el.textContent : '';
    return (t || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  }
  function aplicarSelos() {
    if (!LISTA) return;
    if (ENR.cfg && ENR.cfg.selos === false) { Array.prototype.forEach.call(document.querySelectorAll('.muta-selos'), function (x) { x.remove(); }); return; }
    var C = cartoesLista(); if (!C.length) return;
    var ks = C.map(function (c) { return c.k; });
    /* cada número é pedido no máximo uma vez a cada 2 minutos (o que o servidor não devolver não é pedido em laço) */
    var agora = Date.now(), novos = ks.filter(function (k) { return !ENR.pedidos[k] || agora - ENR.pedidos[k] > 120e3; });
    if (novos.length) {
      var tx = {}; C.forEach(function (c) { if (novos.indexOf(c.k) >= 0) tx[c.k] = (c.el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 700); });
      novos.forEach(function (k) { ENR.pedidos[k] = agora; }); pedirSelos(ks, tx);
    }
    cssSelos();
    try { botaoColuna(C); } catch (e) {}
    C.forEach(function (c) { try { estilizarEtiquetas(c.el); } catch (e) {} });
    C.forEach(function (c) {
      var r = ENR.dados[c.k]; if (!r) return;
      var box = c.el.querySelector('.muta-selos');
      var texto = ((c.el.textContent || '').replace(box ? box.textContent : '', '')).slice(0, 4000); (ENR.textos = ENR.textos || {})[c.k] = texto; var html = selosHtml(Object.assign({ _k: c.k }, r), ENR.cat, texto);
      if (box && box.getAttribute('data-sig') === html) return;
      if (!html) { if (box) box.remove(); return; }
      if (!box) { box = document.createElement('div'); box.className = 'muta-selos'; ancora(c).insertAdjacentElement('afterend', box); }
      box.setAttribute('data-sig', html); box.innerHTML = html;
    });
    diag(C);
    try { quadroCmt(); } catch (e) {}
  }
  /* os selos vão logo abaixo da linha do número do processo: o cartão do PJe tem altura limitada e recolhe o fim */
  function ancora(c) {
    /* sobe enquanto o pai ainda é só a linha do número (com classe, ícones de copiar etc.) */
    var e = c.tn.parentElement, lim = (c.tn.nodeValue || '').trim().length + 40;
    for (var i = 0; e && e.parentElement && e.parentElement !== c.el && i < 6; i++) {
      if ((e.parentElement.textContent || '').replace(/\s+/g, ' ').trim().length > lim) break;
      e = e.parentElement;
    }
    return e && e !== c.el ? e : (c.el.firstElementChild || c.el);
  }
  /* diagnóstico: o que o leitor achou na lista (console e quadro de cima), para conferir quando os selos não aparecem */
  var DIAG = '';
  function diag(C) {
    var com = C.filter(function (c) { return ENR.dados[c.k]; }).length, x = C.length + '/' + com + '/' + (ENR.erro || '') + '/' + document.querySelectorAll('.muta-selos').length;
    if (x === DIAG) return; DIAG = x;
    var o = { cartoes: C.length, comFicha: com, selos: document.querySelectorAll('.muta-selos').length, erro: ENR.erro || '', exemplo: C[0] ? (C[0].el.textContent || '').replace(/\s+/g, ' ').slice(0, 160) : '' };
    try { console.info('[HERO18810] lista do PJe', o); } catch (e) {}
    try { window.parent.postMessage({ hero18810: 'diag', o: o }, '*'); } catch (e) {}
  }
  /* ---------- sinalizações: ícones com contagem; o clique abre o quadro com avisos, intercorrências, pendências e notas ---------- */
  function sinaisDe(r) {
    var E = window.MutaEtiquetas, cfg = ENR.cfg || (E && E.CFG) || {}; r = E.preparar(Object.assign({}, r));
    var av = [];
    if (r.dias != null && r.dias >= (cfg.tarefaDias || 30)) av.push(r.dias + ' dias na tarefa' + (r.tarefa ? ' (' + r.tarefa + ')' : ''));
    if (/intempest/i.test(r.tempest || '')) av.push('Tempestividade: ' + r.tempest);
    if (/nao recolhido|sem comprovante|a menor|tesouro/i.test((r.preparo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) av.push('Preparo: ' + r.preparo);
    if (/irregular/i.test(r.repres || '')) av.push('Representação: ' + r.repres);
    if (/aguardando|vista a abrir/i.test(r.mpfSit || '')) av.push('MPF: ' + r.mpfSit);
    if (r.meta) av.push('Meta do CNJ'); if (r.sobr) av.push('Sobrestado'); if (r.sens) av.push('Caso sensível');
    (r._falta || []).forEach(function (x) { av.push('Etiqueta a incluir no PJe: ' + x.nome + (x.descricao ? ' (' + x.descricao + ')' : '')); });
    return { r: r, urg: r.urgPend ? ['Urgência não apreciada' + (r.urg ? ': ' + r.urg : '') + (r.urgDias != null ? ' · há ' + r.urgDias + ' dia(s)' : '') + (r.urgNivel ? ' · ' + r.urgNivel : '')] : [],
      av: av, ic: r.ic || [], pd: r.pend || [], nt: r.notas || [] };
  }
  var SIN = [['urg', 'ampulheta', 'Urgência', 'al'], ['av', 'sino', 'Avisos', 'av'], ['ic', 'triangulo', 'Intercorrências', 'al'], ['pd', 'alfinete', 'Pendências', 'av'], ['nt', 'nota', 'Notas', 'mu']];
  function ico(k, n) { var E = window.MutaEtiquetas; return E && E.svg ? E.svg(k, n) : ''; }
  function sinaisHtml(k, r) {
    if (!k) return ''; var S0 = sinaisDe(r), h = '';
    SIN.forEach(function (x) { var n = S0[x[0]].length; if (!n) return;
      h += '<button type="button" class="hs hs-' + x[3] + '" data-hero-sin="' + x[0] + '" data-hero-k="' + k + '" title="' + x[2] + ': ' + escS(S0[x[0]].slice(0, 3).join(' | ')) + (n > 3 ? ' …' : '') + ' — clique para ver">' + ico(x[1], 15) + '<b>' + n + '</b></button>'; });
    return h;
  }
  function linhaSin(l) {
    var p = String(l).split(/\s*·\s*/), m = /^\d{2}\/\d{2}\/\d{4}/.test(p[0]);
    var tx = m ? p.slice(2).join(' · ') || p[1] : p[0], meta = m ? [p.length > 2 ? p[1] : '', p[0]] : p.slice(1);
    return '<li><p>' + escS(tx) + '</p>' + (meta.filter(Boolean).length ? '<small>' + escS(meta.filter(Boolean).join(' · ')) + '</small>' : '') + '</li>';
  }
  /* quadro: Avisos | Intercorrências | Pendências | Notas (síntese e questões) lado a lado; marcar resolve e o campo inclui, na ficha */
  function itemSin(l, campo, i) {
    var ok = /^✓/.test(l), txt = String(l).replace(/^✓\s*/, ''), p = txt.split(/\s*·\s*/), dt = /^\d{2}\/\d{2}\/\d{4}/.test(p[0]);
    var corpo = dt ? p.slice(2).join(' · ') || p[1] : p[0], meta = (dt ? [p.length > 2 ? p[1] : '', p[0]] : p.slice(1)).filter(Boolean).join(' · ');
    return '<li class="' + (ok ? 'ok' : '') + '">' + (campo !== 'nt' && campo !== 'av' ? '<input type="checkbox" data-hd-ck="' + campo + '" data-hd-i="' + i + '"' + (ok ? ' checked' : '') + ' title="' + (ok ? 'Reabrir' : 'Marcar como resolvida') + '">' : '') +
      '<div><p>' + escS(corpo) + '</p>' + (meta ? '<small>' + escS(meta) + '</small>' : '') + '</div></li>';
  }
  function dialogoSinais(k, foco) {
    var r = ENR.dados[k]; if (!r) return;
    cssSelos();
    var E = window.MutaEtiquetas, S0 = sinaisDe(Object.assign({ _falta: E && ENR.cat ? E.faltando(E.preparar(Object.assign({}, r)), ENR.cat, (ENR.textos || {})[k] || (autosDigitais() ? (document.body.innerText || '').slice(0, 20000) : '')) : [] }, r)), x = S0.r;
    var fmt = k.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6');
    var d = document.getElementById('hero-dlg'), novo = !d;
    if (!d) { d = document.createElement('div'); d.id = 'hero-dlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); document.body.appendChild(d); }
    d.setAttribute('aria-label', 'Sinalizações do processo ' + fmt); d.setAttribute('data-k', k);
    var pend = (r.pendT && r.pendT.length ? r.pendT : r.pend || []), ic = (r.icT && r.icT.length ? r.icT : r.ic || []), nt = r.notas || [], qs = r.questoes || [];
    var abertas = function (L) { return L.filter(function (l) { return !/^✓/.test(l); }).length; };
    var col = function (id, ic0, tit, n, corpo, inc) { return '<section class="hd-c' + (foco === id ? ' fo' : '') + '" data-s="' + id + '"><h4>' + ic0 + ' ' + tit + ' <i>' + n + '</i></h4><div class="hd-cc">' + corpo + '</div>' +
      (inc ? '<form class="hd-inc" data-hd-inc="' + id + '"><input type="text" placeholder="' + inc + '" aria-label="' + inc + '"><button type="submit">+</button></form>' : '') + '</section>'; };
    var lista = function (L, campo, vz) { return L.length ? '<ul>' + L.map(function (l, i) { return itemSin(l, campo, i); }).join('') + '</ul>' : '<p class="hd-v">' + vz + '</p>'; };
    var avisos = S0.urg.map(function (u) { return '<li class="u"><div><p>' + escS(u) + '</p></div></li>'; }).join('') + S0.av.map(function (a) { return '<li><div><p>' + escS(a) + '</p></div></li>'; }).join('');
    var notasCorpo = (x.sintese ? '<div class="hd-sub"><b>Síntese</b><p>' + escS(x.sintese) + '</p></div>' : '') +
      (qs.length ? '<div class="hd-sub"><b>Questões</b><ol>' + qs.map(function (q) { return '<li><p>' + escS(q.replace(/^\(?\d+[).]\s*/, '')) + '</p></li>'; }).join('') + '</ol></div>' : '') +
      '<div class="hd-sub"><b>Notas</b>' + lista(nt, 'nt', 'Nenhuma nota.') + '</div>';
    d.innerHTML = '<div class="hd-bx"><header><div><b>' + fmt + '</b><small>' + escS([E ? E.etapa(x) : '', x.servidor ? 'Minuta: ' + x.servidor : '', x.corretor ? 'Correção: ' + x.corretor : '', x.tarefa ? 'Tarefa: ' + x.tarefa : ''].filter(Boolean).join(' · ')) + '</small></div><span class="hd-st" id="hd-st"></span><button type="button" data-hd-x aria-label="Fechar">×</button></header>' +
      '<div class="hd-g">' +
      col('av', ico('sino', 14), 'Avisos', S0.urg.length + S0.av.length, avisos ? '<ul>' + avisos + '</ul>' : '<p class="hd-v">Nenhum aviso.</p>') +
      col('ic', ico('triangulo', 14), 'Intercorrências', abertas(ic), lista(ic, 'ic', 'Nenhuma intercorrência.'), 'Nova intercorrência') +
      col('pd', ico('alfinete', 14), 'Pendências', abertas(pend), lista(pend, 'pd', 'Nenhuma pendência.'), 'Nova pendência') +
      col('nt', ico('nota', 14), 'Notas', nt.length, notasCorpo, 'Nova nota') +
      '</div><footer>Marcar resolve (✓) e o campo inclui: grava na ficha do processo, com o seu login do painel. Esc fecha.</footer></div>';
    d._L = { ic: ic, pd: pend, nt: nt };
    if (novo) {
      var fechar = function () { d.remove(); document.removeEventListener('keydown', esc, true); };
      var esc = function (e) { if (e.key === 'Escape' && !(e.target && e.target.closest && e.target.closest('.hd-inc'))) fechar(); };
      document.addEventListener('keydown', esc, true);
      d.addEventListener('click', function (e) { if (e.target === d || (e.target.closest && e.target.closest('[data-hd-x]'))) fechar(); });
      d.addEventListener('change', function (e) {
        var c = e.target; if (!c.dataset || !c.dataset.hdCk) return;
        var L = d._L[c.dataset.hdCk] || [], linha = L[Number(c.dataset.hdI)];
        gravarSinal(d.getAttribute('data-k'), { campo: c.dataset.hdCk, acao: c.checked ? 'resolver' : 'reabrir', linha: linha }, c.dataset.hdCk);
      });
      d.addEventListener('submit', function (e) {
        var f = e.target; if (!f.dataset || !f.dataset.hdInc) return; e.preventDefault();
        var t = f.querySelector('input'), v = (t.value || '').trim(); if (!v) return;
        gravarSinal(d.getAttribute('data-k'), { campo: f.dataset.hdInc, acao: 'incluir', texto: v }, f.dataset.hdInc);
      });
    }
    var f0 = d.querySelector('.hd-c.fo'); if (f0) f0.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function gravarSinal(k, pedido, foco) {
    var st = document.getElementById('hd-st'); if (st) { st.textContent = 'Gravando…'; st.className = 'hd-st'; }
    Array.prototype.forEach.call(document.querySelectorAll('#hero-dlg input,#hero-dlg button[type=submit]'), function (x) { x.disabled = true; });
    try {
      chrome.runtime.sendMessage(Object.assign({ tipo: 'muta-sinal', cnj: k }, pedido)).then(function (j) {
        if (!j || j.erro) { var s2 = document.getElementById('hd-st'); if (s2) { s2.textContent = 'Não gravou: ' + ((j && j.erro) || 'sem resposta'); s2.className = 'hd-st err'; } Array.prototype.forEach.call(document.querySelectorAll('#hero-dlg input,#hero-dlg button'), function (x) { x.disabled = false; }); return; }
        if (j.resumo) ENR.dados[k] = j.resumo;
        DIAG = ''; dialogoSinais(k, foco);
        var s3 = document.getElementById('hd-st'); if (s3) { s3.textContent = 'Gravado na ficha'; s3.className = 'hd-st ok'; }
        try { agendarSelos(); if (autosDigitais()) { AUT.t = 0; } } catch (e) {}
      }, function () { var s4 = document.getElementById('hd-st'); if (s4) { s4.textContent = 'Recarregue a página (a extensão foi atualizada).'; s4.className = 'hd-st err'; } });
    } catch (e) { if (st) { st.textContent = 'Recarregue a página.'; st.className = 'hd-st err'; } }
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('[data-hero-sin]'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); dialogoSinais(b.getAttribute('data-hero-k'), b.getAttribute('data-hero-sin'));
  }, true);
  /* cabeçalho dos autos digitais: os mesmos ícones ao lado do número do processo */
  var AUT = { k: '', t: 0 };
  function sinaisAutos(numero) {
    if (!autosDigitais() || !numero) return;
    var k = numero.replace(/\D/g, ''); if (k.length !== 20) return;
    var pintar = function () {
      var r = ENR.dados[k]; if (!r) return;
      cssSelos();
      var alvo = null; for (var i = 0; i < CABECALHOS.length && !alvo; i++) { var el = document.querySelector(CABECALHOS[i]); if (el && (el.textContent || '').indexOf(numero) >= 0) alvo = el; }
      if (!alvo) return;
      var box = document.getElementById('hero-sinais-autos');
      var E = window.MutaEtiquetas, et = E ? E.etapa(E.preparar(Object.assign({}, r))) : '';
      var html = (et ? '<span class="m-et">' + escS(et) + '</span>' : '') + sinaisHtml(k, r);
      if (!box) { box = document.createElement('span'); box.id = 'hero-sinais-autos'; box.className = 'muta-selos hero-autos'; alvo.insertAdjacentElement('afterend', box); }
      if (box.getAttribute('data-sig') !== html) { box.setAttribute('data-sig', html); box.innerHTML = html || '<span class="m-mu">sem sinalizações</span>'; }
    };
    if (ENR.dados[k] && AUT.k === k && Date.now() - AUT.t < 120e3) return pintar();
    AUT = { k: k, t: Date.now() };
    try { chrome.runtime.sendMessage({ tipo: 'muta-resumos', cnjs: [k], lista: false }).then(function (x) { if (x && x.resumos) { Object.keys(x.resumos).forEach(function (q) { ENR.dados[q] = x.resumos[q]; }); ENR.cat = x.catalogo || ENR.cat; ENR.cfg = x.cfg || ENR.cfg; } pintar(); }, function () {}); } catch (e) {}
  }
  /* redesenho das etiquetas do PJe nos cartões: cada tipo (padrao/etiquetas-gabinete.json › categorias) com cor, estilo e ícone
     próprios, e os tipos mais importantes primeiro. Só muda a aparência; nada é gravado no PJe. */
  var RE_DATA = /\d{2}-\d{2}-\d{2}/;
  function chipsDo(card) {
    var out = [], L = card.querySelectorAll('span,a,div,button,label,li,mat-chip,small,b');
    for (var i = 0; i < L.length && out.length < 40; i++) {
      var el = L[i];
      if (el.closest('.muta-selos') || out.some(function (o) { return o.contains(el); })) continue;
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t || t.length > 80) continue;
      RE.lastIndex = 0; if (RE.test(t) || /^\d+\s*\/\s*\d+$/.test(t) || RE_DATA.test(t)) continue;
      var q = el.getBoundingClientRect(); if (q.height < 12 || q.height > 34 || q.width < 14 || q.width > 460) continue;
      var bg = ''; try { bg = getComputedStyle(el).backgroundColor; } catch (e) {}
      var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(bg || '');
      if (!m || (m[4] != null && Number(m[4]) < 0.2) || (+m[1] > 244 && +m[2] > 244 && +m[3] > 244)) continue;
      out.push(el);
    }
    return out;
  }
  function estilizarEtiquetas(card) {
    var E = window.MutaEtiquetas; if (!E || !E.categoriaDe || (ENR.cfg && ENR.cfg.etqEstilo === false)) return;
    var cats = (ENR.cat && ENR.cat.categorias && ENR.cat.categorias.length) ? ENR.cat.categorias : E.CATEGORIAS;
    chipsDo(card).forEach(function (el) {
      var nome = (el.textContent || '').replace(/\s+/g, ' ').replace(/\s*(×|✕|✖|close|clear|cancel)\s*$/i, '').trim(); if (!nome) return;
      var c = E.categoriaDe(nome, ENR.cat); if (!c) return;
      var sig = c.id + '|' + c.cor + '|' + nome; if (el.getAttribute('data-hero-etq') === sig) return;
      el.setAttribute('data-hero-etq', sig); el.setAttribute('data-hero-ic', c.icone || ''); el.title = c.nome + ' · ' + nome;
      el.classList.remove('hero-solido', 'hero-suave', 'hero-contorno'); el.classList.add('hero-etq', 'hero-' + (c.estilo || 'suave'));
      el.style.setProperty('--hc', c.cor || '#546e7a');
      var rk = cats.map(function (x) { return x.id; }).indexOf(c.id); el.style.setProperty('order', String(rk < 0 ? 50 : rk));
    });
  }
  /* recolher a coluna da lista (à esquerda) para dar espaço ao editor e à tarefa aberta; a escolha fica neste navegador */
  var COL = { el: null, btn: null };
  function colunaLista(C) {
    if (COL.el && document.contains(COL.el)) return COL.el;
    if (!C.length) return null;
    var vw = window.innerWidth || 1200;
    for (var e = C[0].el, i = 0; e && e !== document.body && i < 25; e = e.parentElement, i++) {
      var q = e.getBoundingClientRect(), p = e.parentElement ? e.parentElement.getBoundingClientRect() : null;
      if (q.width > 150 && q.width < vw * 0.55 && p && p.width > vw * 0.75 && e.parentElement.children.length >= 2) { COL.el = e; return e; }
    }
    return null;
  }
  function botaoColuna(C) {
    var col = colunaLista(C); if (!col) return;
    var oculta = false; try { oculta = localStorage.getItem('hero18810:lista-oculta') === '1'; } catch (e) {}
    col.classList.toggle('hero-col-oculta', oculta);
    if (!COL.btn || !document.contains(COL.btn)) {
      var b = document.createElement('button'); b.type = 'button'; b.id = 'hero-col-btn';
      b.addEventListener('click', function () { var c0 = COL.el; if (!c0) return; var o = !c0.classList.contains('hero-col-oculta'); try { localStorage.setItem('hero18810:lista-oculta', o ? '1' : '0'); } catch (e) {} botaoColuna(cartoesLista()); });
      document.body.appendChild(b); COL.btn = b;
    }
    COL.btn.textContent = oculta ? '⇥ Mostrar a lista' : '⇤ Ocultar a lista';
    COL.btn.title = oculta ? 'Mostrar de novo a coluna da lista de processos' : 'Recolher a coluna da lista de processos para dar espaço ao editor (HERO18810)';
  }
  /* ---------- 0.30 · quadro do Desembargador na coluna "Para assinatura" do painel do usuário ----------
     Só para o perfil desembargador e para o gestor (o service worker decide). Vai no topo da coluna cujo título fala em
     assinatura; nos cartões da lista, o selo "Para assinar" marca os processos submetidos à assinatura no app. */
  var RX_AS = /^(para assinatura|para assinar|assinaturas?|assinar( decis[ãa]o| minuta| documentos?)?|aguardando assinatura|documentos para assinatura|minutas para assinatura)\b/i;
  function tituloAssinatura() {
    if (CMTL.h && document.contains(CMTL.h) && RX_AS.test((CMTL.h.textContent || '').trim())) return CMTL.h;
    CMTL.h = null;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (x) { var t = x.nodeValue.trim(); return t.length > 5 && t.length < 60 && /assin/i.test(t) ? 1 : 3; } }), n, c = 0;
    while ((n = w.nextNode()) && c < 80) {
      c++;
      var el = n.parentElement; if (!el || el.closest('.hcm, .muta-selos, ' + FORA)) continue;
      if (!RX_AS.test(n.nodeValue.replace(/\(\d+\)|\d+\s*$/g, '').trim())) continue;
      /* sobe enquanto o pai ainda é só o título (com contador, ícone) */
      for (var i = 0; i < 3 && el.parentElement && (el.parentElement.textContent || '').replace(/\s+/g, ' ').trim().length < 70; i++) el = el.parentElement;
      var q = el.getBoundingClientRect(); if (q.width < 20 || q.height < 8) continue;
      CMTL.h = el; return el;
    }
    return null;
  }
  /* a coluna: o ancestral estreito (até 60% da tela) que fica abaixo do título */
  function colunaDe(h) {
    var vw = window.innerWidth || 1200;
    for (var e = h.parentElement, i = 0; e && e !== document.body && i < 10; e = e.parentElement, i++) {
      var q = e.getBoundingClientRect(); if (q.width > vw * 0.62) break;
      if (q.height > 140 && e.children.length >= 2) return { col: e, depois: filhoQueContem(e, h) };
    }
    return { col: null, depois: h };
  }
  function filhoQueContem(col, h) { for (var e = h; e && e.parentElement !== col; e = e.parentElement) {} return e || h; }
  function cmtPedir(forcar) {
    if (CMTL.pedindo) return; CMTL.pedindo = true;
    try { chrome.runtime.sendMessage({ tipo: 'muta-cmt', forcar: !!forcar }).then(function (v) { CMTL.pedindo = false; cmtDados(v); }, function () { CMTL.pedindo = false; }); } catch (e) { CMTL.pedindo = false; }
  }
  function cmtDados(v) {
    CMTL.v = v; CMTL.t = Date.now(); CMTL.d = {};
    ((v && v.assinatura) || []).forEach(function (a) { CMTL.d[String(a.cnj || '').replace(/\D/g, '')] = a; });
    quadroCmt(); agendarSelos();
  }
  function quadroCmt() {
    if (!LISTA || !window.MutaCmt) return;
    var v = CMTL.v, box = document.getElementById('hero-cmt');
    if (!v || v.fora || (ENR.cfg && ENR.cfg.cmtPje === false)) { if (box) box.remove(); return; }
    var h = tituloAssinatura();
    if (!h) { if (box) box.remove(); if (CMTL.diag !== 'sem') { CMTL.diag = 'sem'; try { console.info('[HERO18810] coluna "Para assinatura" não encontrada nesta tela'); } catch (e) {} } return; }
    window.MutaCmt.css(document);
    if (!box || !document.contains(box)) {
      box = document.createElement('div'); box.id = 'hero-cmt';
      var o = colunaDe(h); (o.depois || h).insertAdjacentElement('afterend', box);
      window.MutaCmt.bind(box, function (m) { return chrome.runtime.sendMessage(m); }, function (dados, alternar) {
        if (alternar) { try { localStorage.setItem('hero18810:cmt-recolhido', CMTL.rec ? '0' : '1'); } catch (e) {} }
        if (dados) cmtDados(dados); else pintarCmt(true);
      });
      if (CMTL.diag !== 'sim') { CMTL.diag = 'sim'; try { console.info('[HERO18810] quadro do Desembargador em', (h.textContent || '').trim().slice(0, 60)); } catch (e) {} }
    }
    pintarCmt();
  }
  function pintarCmt(forca) {
    var box = document.getElementById('hero-cmt'); if (!box) return;
    try { CMTL.rec = localStorage.getItem('hero18810:cmt-recolhido') === '1'; } catch (e) {}
    var html = window.MutaCmt.html(CMTL.v, { pje: true, recolhido: CMTL.rec });
    if (!forca && box.getAttribute('data-sig') === html) return;
    /* não repinta enquanto alguém escreve no quadro */
    var foco = document.activeElement; if (!forca && foco && box.contains(foco) && /TEXTAREA|SELECT|INPUT/.test(foco.tagName)) return;
    box.setAttribute('data-sig', html); box.innerHTML = html;
  }
  if (LISTA) { setTimeout(function () { cmtPedir(); }, 1500); setInterval(function () { if (!document.hidden) cmtPedir(); }, 60e3); }
  function agendarSelos() { if (!LISTA) return; clearTimeout(ENR.tm); ENR.tm = setTimeout(function () { try { aplicarSelos(); } catch (e) {} }, 700); }
  if (LISTA) {
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('.muta-selos [data-muta-copia]'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      var t = b.getAttribute('data-muta-copia'), o = b.innerHTML;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'copiado'; setTimeout(function () { b.innerHTML = o; }, 1300); }, function () {});
    }, true);
    try { chrome.runtime.onMessage.addListener(function (msg) { if (msg && msg.tipo === 'muta-selos-atualizar') { ENR.pedidos = {}; ENR.cfg = null; agendarSelos(); } }); } catch (e) {}
  }

  informar();
  if (document.body) new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true, characterData: true });
  if (LISTA && document.body) { new MutationObserver(agendarSelos).observe(document.body, { childList: true, subtree: true }); agendarSelos(); }
  window.addEventListener('focus', function () { ultimo = null; agendar(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { ultimo = null; agendar(); } });
  /* o painel pede de novo quando o registro da aba se perdeu (aba recarregada, extensão atualizada) */
  try { chrome.runtime.onMessage.addListener(function (msg) { if (msg && msg.tipo === 'muta-reinformar') { ultimo = null; agendar(); } }); } catch (e) {}
})();
