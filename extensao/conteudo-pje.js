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
   Em listas de tarefas (vários números e nenhum cabeçalho), não informa nada. */
(function () {
  'use strict';
  if (window.__mutaPje) return;
  window.__mutaPje = true;

  var CNJ = '(\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4})';
  var RE = new RegExp('\\b' + CNJ + '\\b', 'g');
  var RE_CLASSE = new RegExp('\\b([A-Z][A-Za-z]{1,13})\\s+' + CNJ + '\\b');
  /* cabeçalho da tarefa no painel do PJe: classe, número, ícone de cópia e " - [Tarefa]" */
  var RE_TAREFA = new RegExp('\\b([A-Z][A-Za-z]{1,13})\\s+' + CNJ + '[^\\n\\[]{0,16}?-\\s*\\[', 'g');
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
  function tarefa(texto) {
    var m, achados = {};
    RE_TAREFA.lastIndex = 0;
    while ((m = RE_TAREFA.exec(texto || ''))) achados[m[2]] = m[1];
    var k = Object.keys(achados);
    return k.length === 1 ? { numero: k[0], classe: achados[k[0]] } : null;
  }
  function detectar() {
    var t = document.title || '', n = numeros(t);
    if (n.length === 1) return { numero: n[0], classe: classeDe(t, n[0]), forca: 3, via: 'título' };
    var corpo = document.body ? (document.body.innerText || '').slice(0, 300000) : '';
    var tf = tarefa(corpo);
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
    var chave = d.numero + '|' + d.classe + '|' + d.forca;
    if (chave === ultimo) return;
    ultimo = chave;
    try { chrome.runtime.sendMessage({ tipo: 'muta-processo', numero: d.numero, classe: d.classe, forca: d.forca, via: d.via, host: location.host }); }
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
        neg: proporcao(b, negrito), ita: proporcao(b, italico),
        cita: !!(b.closest && b.closest('blockquote')) || /cita/i.test(String(b.className || ''))
      });
    });
    if (!lista.length) { var tx = textoDe(raiz); if (tx) tx.split(/\n+/).forEach(function (l) { l = l.trim(); if (l) lista.push({ t: l, tag: 'p', cls: '', recuo: 0, alinha: '', neg: 0, ita: 0, cita: false }); }); }
    return lista;
  }
  function editores() {
    var c = [];
    function add(raiz, vis, fonte) {
      var ps = paragrafos(raiz), t = ps.map(function (p) { return p.t; }).join('\n');
      if (t.length >= 80) c.push({ t: t, ps: ps, vis: vis, fonte: fonte });
    }
    Array.prototype.forEach.call(document.querySelectorAll('.ProseMirror[contenteditable="true"], .ProseMirror'), function (el) {
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
      Array.prototype.forEach.call(document.querySelectorAll('[contenteditable="true"], .ck-editor__editable, .cke_editable'), function (el) {
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
  try {
    chrome.runtime.onMessage.addListener(function (msg, sender, responder) {
      if (!msg || msg.tipo !== 'muta-editor') return;
      var e = editores();
      if (!e.length) return;
      var d = detectar() || {};
      responder({ texto: e[0].t, paragrafos: e[0].ps, fonte: e[0].fonte, visivel: e[0].vis, outros: e.length - 1, numero: d.numero || '', url: location.host + location.pathname });
    });
  } catch (e) {}

  informar();
  if (document.body) new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('focus', function () { ultimo = null; agendar(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { ultimo = null; agendar(); } });
  /* o painel pede de novo quando o registro da aba se perdeu (aba recarregada, extensão atualizada) */
  try { chrome.runtime.onMessage.addListener(function (msg) { if (msg && msg.tipo === 'muta-reinformar') { ultimo = null; agendar(); } }); } catch (e) {}
})();
