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
  var FORA = '[contenteditable], .ProseMirror, textarea, select, input:not([type="checkbox"]), .ck-editor, .cke, .cke_editable, iframe, embed, object';
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

  /* ---------- 0.19 · selos na lista de tarefas (só no quadro do painel de tarefas; só leitura) ----------
     Em cada cartão da lista: etapa, quem minuta e quem corrige, urgência não apreciada, intercorrências, pendências,
     dias na tarefa, meta, sobrestamento, caso sensível e as etiquetas do gabinete que faltam no PJe (clique copia). */
  var ENR = { dados: {}, cat: null, cfg: null, t: 0, pedindo: false, tm: 0, pedidos: {} };
  var LISTA = location.host === 'frontend-pje.app.trf3.jus.br';
  function escS(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
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
      '.hero-etq[data-hero-ic]:not([data-hero-ic=""])::before{content:attr(data-hero-ic);margin-right:4px;font-weight:800}';
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
  function selosHtml(r, cat, texto) {
    var E = window.MutaEtiquetas; if (!E || !r) return '';
    r = E.preparar(r); var cfg = ENR.cfg || E.CFG, h = [], et = E.etapa(r);
    if (et) h.push('<span class="m-et' + (/^Liberado|Assinada/.test(et) ? ' m-ok' : '') + '" title="Etapa no gabinete (ficha do processo)">' + escS(et) + '</span>');
    if (r.servidor || r.corretor) h.push('<span title="Minuta: ' + escS(r.servidor || 'não designado') + ' · Correção: ' + escS(r.corretor || 'não designado') + '">M ' + escS(E.iniciais(r.servidor) || '—') + ' · C ' + escS(E.iniciais(r.corretor) || '—') + '</span>');
    if (r.urgPend) h.push('<span class="' + (r.urgDias != null && r.urgDias >= cfg.urgDias ? 'm-al' : 'm-av') + '" title="Urgência não apreciada' + (r.urg ? ': ' + escS(r.urg) : '') + '">⚡ urgência' + (r.urgDias != null ? ' ' + r.urgDias + 'd' : '') + '</span>');
    if (r.icN) h.push('<span class="m-al" title="' + escS(r.ic.join(' | ')) + '">⛔ ' + r.icN + ' intercorrência' + (r.icN > 1 ? 's' : '') + '</span>');
    if (r.pendN) h.push('<span class="m-av" title="' + escS(r.pend.join(' | ')) + '">⚑ ' + r.pendN + ' pendência' + (r.pendN > 1 ? 's' : '') + '</span>');
    if (r.dias != null && r.dias >= cfg.tarefaDias) h.push('<span class="' + (r.dias >= cfg.tarefaDias * 2 ? 'm-al' : 'm-av') + '" title="Dias na tarefa atual">⏱ ' + r.dias + 'd</span>');
    if (r.meta) h.push('<span title="Meta do CNJ">★ meta</span>');
    if (r.sobr) h.push('<span class="m-mu" title="Sobrestado">⏸ sobrestado</span>');
    if (r.sens) h.push('<span title="Caso sensível">♥ sensível</span>');
    var F = cat ? E.faltando(r, cat, texto) : [];
    if (F.length) h.push('<span class="m-av" data-muta-copia="' + escS(F.map(function (x) { return x.nome; }).join(', ')) + '" title="Etiquetas do gabinete que faltam no PJe: ' + escS(F.map(function (x) { return x.nome + (x.descricao ? ' (' + x.descricao + ')' : ''); }).join('; ')) + '. Clique para copiar.">🏷 ' + F.length + ' a incluir</span>');
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
    C.forEach(function (c) { try { estilizarEtiquetas(c.el); } catch (e) {} });
    C.forEach(function (c) {
      var r = ENR.dados[c.k]; if (!r) return;
      var box = c.el.querySelector('.muta-selos');
      var texto = ((c.el.textContent || '').replace(box ? box.textContent : '', '')).slice(0, 4000), html = selosHtml(Object.assign({}, r), ENR.cat, texto);
      if (box && box.getAttribute('data-sig') === html) return;
      if (!html) { if (box) box.remove(); return; }
      if (!box) { box = document.createElement('div'); box.className = 'muta-selos'; ancora(c).insertAdjacentElement('afterend', box); }
      box.setAttribute('data-sig', html); box.innerHTML = html;
    });
    diag(C);
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
  function agendarSelos() { if (!LISTA) return; clearTimeout(ENR.tm); ENR.tm = setTimeout(function () { try { aplicarSelos(); } catch (e) {} }, 700); }
  if (LISTA) {
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('.muta-selos [data-muta-copia]'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      var t = b.getAttribute('data-muta-copia'), o = b.textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'copiado ✓'; setTimeout(function () { b.textContent = o; }, 1300); }, function () {});
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
