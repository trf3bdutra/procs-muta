/* HERO18810 · painel do usuário do PJe por etapa do fluxo (0.35)
   Desenho: "Painel do PJe — reorganização e redesign" (gestor, 21/11/2026).
   Nas colunas "Tarefas" e "Minhas tarefas" do painel do usuário (quadro frontend-pje), a lista em ordem alfabética
   dá lugar a 7 grupos: 1 Assinar e liberar · 2 Sessão com prazo · 3 Recursos internos · 4 Chegadas · 5 Produção e triagem ·
   6 Aguardando sessão · 7 Sobrestados (6 e 7 começam recolhidos) e, no fim, Outras tarefas.
   O prefixo entre colchetes vira etiqueta ("[Sessão] Preparar relatório e voto" → Sessão · Preparar relatório e voto).
   A lista do PJe não é alterada: fica escondida, continua sendo atualizada pelo PJe, e cada linha do HERO clica na linha
   original. O botão "HERO ligado/desligado" (conteudo-pje.js) devolve a lista do PJe. */
(function () {
  'use strict';
  if (location.host !== 'frontend-pje.app.trf3.jus.br' || window.__heroTarefas) return;
  window.__heroTarefas = true;

  var GRUPOS = [
    { id: 1, titulo: 'Assinar e liberar', porque: 'Fecha o ciclo: cada processo daqui sai do gabinete.', tag: 'fecha o ciclo', cor: 'verde', re: [/^assinar ato/, /^assinar inteiro teor/, /^assinar decis/, /^assinar/, /^confirmar inteiro teor/, /^revisar ato/] },
    { id: 2, titulo: 'Sessão com prazo', porque: 'O prazo é a data da pauta ou o fim da sessão.', tag: 'com prazo', cor: 'laranja', re: [/pedido de destaque/, /decisao intercorrente/, /preparar relatorio/, /lancar movimenta/] },
    { id: 3, titulo: 'Recursos internos', porque: 'Curtos e já em andamento.', tag: 'curtos', cor: 'azul', ctx: /^(ed|ag\. ?int|agint)/ , re: [/^minutar ato/] },
    { id: 4, titulo: 'Chegadas a examinar', porque: 'Entrada nova: ver e dar destino.', tag: 'entrada', cor: 'azul', re: [/comunicacao recebida/, /^recebidos com embargos/, /^recebidos/, /analisar peticao/] },
    { id: 5, titulo: 'Produção e triagem', porque: 'O estoque de trabalho: minutar e destinar.', tag: 'estoque', cor: 'neutro', re: [/^minutar ato judicial$/, /^minutar/, /triagem/, /analisar tipo de decis/] },
    { id: 6, titulo: 'Aguardando sessão', porque: 'Já pautados: só conferir.', tag: 'consulta', cor: 'neutro', fechado: true, re: [/aguardando a sessao/, /^aguardando/] },
    { id: 7, titulo: 'Sobrestados', porque: 'Parados até o julgamento do tema.', tag: 'consulta', cor: 'neutro', fechado: true, re: [/^sobrestado/] }
  ];
  var OUTRAS = { id: 8, titulo: 'Outras tarefas', porque: 'Fora do catálogo do gabinete (secretaria, prazos, certidões).', tag: 'outras', cor: 'neutro', fechado: true, re: [] };
  var CTX = function (p) { var n = N(p); return /sessao.*ed|ed.*sessao/.test(n) ? 'Sessão-ED' : /^sessao/.test(n) ? 'Sessão' : /instancia/.test(n) ? 'Instâncias' : /^ag\.? ?int/.test(n) ? 'Ag. Int' : p.trim(); };

  function N(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function desligado() { try { return !!(window.MutaModo && window.MutaModo.desligado()); } catch (e) { return false; } }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- leitura da coluna do PJe ---------- */
  function cabecalho(rotulo) {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (x) { return N(x.nodeValue) === rotulo ? 1 : 3; } }), n;
    while ((n = w.nextNode())) {
      var el = n.parentElement; if (!el || el.closest('.htg')) continue;
      for (var i = 0; i < 4 && el.parentElement && el.parentElement.getBoundingClientRect().height <= Math.max(el.getBoundingClientRect().height + 12, 64); i++) el = el.parentElement;
      if (el.getBoundingClientRect().width >= 200) return el;
    }
    return null;
  }
  function coluna(h) {
    var hw = h.getBoundingClientRect().width;
    for (var e = h.parentElement, i = 0; e && e !== document.body && i < 8; e = e.parentElement, i++) {
      var q = e.getBoundingClientRect(); if (q.width > hw + 40) break;
      if (e.children.length >= 2 && q.height > h.getBoundingClientRect().height + 80) return e;
    }
    return null;
  }
  /* a lista: o elemento da coluna com mais filhos que terminam num número (nome da tarefa + quantidade) */
  function lista(col) {
    var melhor = null, nota = 0;
    Array.prototype.forEach.call(col.querySelectorAll('*'), function (e) {
      if (e.closest('.htg') || e.children.length < 3) return;
      var ok = 0; for (var i = 0; i < e.children.length; i++) { var t = (e.children[i].textContent || '').replace(/\s+/g, ' ').trim(); if (/[A-Za-zÀ-ú]{4}/.test(t) && /\d+\s*$/.test(t) && t.length < 220) ok++; }
      if (ok >= 3 && ok >= e.children.length * 0.7 && ok > nota) { melhor = e; nota = ok; }
    });
    return melhor;
  }
  /* uma linha: nome (com o prefixo entre colchetes), quantidade, etiquetas (APTO, BRUNO, URGENTE…) e o alvo do clique */
  function linha(el) {
    var txt = [], chips = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) { var t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (!t) continue; var p = n.parentElement, st = p ? getComputedStyle(p) : null;
      var chip = st && st.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(st.backgroundColor) && /^[A-ZÀ-Ú0-9 .\-]{2,30}$/.test(t) && p.getBoundingClientRect().height < 22;
      (chip ? chips : txt).push(t); }
    var s = txt.join(' ').replace(/\s+/g, ' ').trim(), m = /^(.*?)\s*(\d[\d.]*)\s*$/.exec(s); if (!m) return null;
    var nome = m[1].trim(), qt = parseInt(m[2].replace(/\./g, ''), 10), ctx = '', mm = /^\[([^\]]+)\]\s*(.*)$/.exec(nome);
    if (mm) { ctx = CTX(mm[1]); nome = mm[2]; }
    var alvo = null, w2 = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: function (x) { return x.nodeValue.trim().length > 3 && /[a-z]/i.test(x.nodeValue) ? 1 : 3; } }), t2 = w2.nextNode();
    if (t2) alvo = t2.parentElement.closest('a,button,[role="button"],[role="link"],[tabindex]') || t2.parentElement;
    return { el: el, alvo: alvo || el, nome: nome, ctx: ctx, qt: isNaN(qt) ? 0 : qt, chips: chips.filter(function (c, i) { return chips.indexOf(c) === i; }) };
  }
  function grupoDe(r) {
    var n = N(r.nome), c = N(r.ctx);
    for (var i = 0; i < GRUPOS.length; i++) {
      var g = GRUPOS[i];
      if (g.id === 3 && !g.ctx.test(c)) continue;
      if (g.id === 2 && !/sessao/.test(c) && !/lancar movimenta/.test(n)) continue;
      if (g.id === 5 && /^(ed|ag\. ?int)/.test(c)) continue;
      for (var j = 0; j < g.re.length; j++) if (g.re[j].test(n)) return { g: g, ordem: j };
    }
    return { g: OUTRAS, ordem: 0 };
  }

  /* ---------- desenho ---------- */
  var TAG = { verde: ['#d6ecdd', '#a2d9b2', '#1a653e'], laranja: ['#fbefe2', '#efd0ac', '#8f4d0e'], azul: ['#d5e6f3', '#a3c6e7', '#124f71'], neutro: ['#ffffff', '#d6dadd', '#3e4043'] };
  var CHIP = { APTO: ['#d5e6f3', '#a3c6e7', '#124f71'], URGENTE: ['#fbefe2', '#efd0ac', '#8f4d0e'] };
  function tg(c, t) { return '<span class="htg-tag" style="background:' + c[0] + ';border-color:' + c[1] + ';color:' + c[2] + '">' + esc(t) + '</span>'; }
  function montar(L, chave) {
    var por = {}, max = 1;
    L.forEach(function (r) { var x = grupoDe(r); r.g = x.g; r.ordem = x.ordem; (por[x.g.id] = por[x.g.id] || []).push(r); if (r.qt > max) max = r.qt; });
    var lista = GRUPOS.concat([OUTRAS]).filter(function (g) { return por[g.id]; });
    return lista.map(function (g) {
      var rs = por[g.id].sort(function (a, b) { return a.ordem - b.ordem || b.qt - a.qt; }), tot = rs.reduce(function (s, r) { return s + r.qt; }, 0);
      var k = 'hero18810:tg:' + chave + ':' + g.id, fx = lsGet(k), fechado = fx == null ? !!g.fechado : fx === '1';
      return '<section class="htg-g' + (fechado ? ' fechado' : '') + '"><button type="button" class="htg-gh" data-htg-g="' + g.id + '" aria-expanded="' + !fechado + '">' +
        '<span class="htg-n">' + (g.id === 8 ? '+' : g.id) + '</span><span class="htg-t"><b>' + esc(g.titulo) + '</b><small>' + esc(g.porque) + '</small></span>' +
        tg(TAG[g.cor], g.tag) + '<span class="htg-tot">' + tot.toLocaleString('pt-BR') + '</span><i class="htg-ch"></i></button>' +
        (fechado ? '' : '<div class="htg-ls">' + rs.map(function (r) {
          var w = r.qt > 0 ? Math.max(3, Math.round(Math.sqrt(r.qt) / Math.sqrt(max) * 100)) : 0;
          return '<button type="button" class="htg-r' + (r.qt ? '' : ' zero') + '" data-htg-i="' + L.indexOf(r) + '" title="Abrir a tarefa no PJe">' +
            '<span class="htg-nm">' + (r.ctx ? '<span class="htg-ctx">' + esc(r.ctx) + '</span>' : '') + '<span class="htg-nome">' + esc(r.nome) + '</span>' +
            (r.chips.length ? '<span class="htg-chips">' + r.chips.map(function (c) { return tg(CHIP[c] || TAG.azul, c); }).join('') + '</span>' : '') + '</span>' +
            '<span class="htg-bar"><span style="width:' + w + '%;background:' + (g.id <= 2 ? '#e08a3a' : '#006ea1') + '"></span></span><span class="htg-q">' + r.qt.toLocaleString('pt-BR') + '</span></button>';
        }).join('') + '</div>') + '</section>';
    }).join('');
  }
  var CSS = '.htg{font:500 13px/1.4 Figtree,"Segoe UI",system-ui,sans-serif;color:#202325;background:#f3f6fa;overflow:auto;font-variant-numeric:tabular-nums}' +
    '.htg *{box-sizing:border-box;font-family:inherit}.htg button{all:unset;box-sizing:border-box;cursor:pointer}.htg button:focus-visible{outline:2px solid #006291;outline-offset:-2px}' +
    '.htg-g{border-bottom:1px solid #d6dadd}' +
    '.htg .htg-gh{width:100%;display:flex;align-items:center;gap:8px;padding:9px 12px;background:#eff3f6}.htg .htg-gh:hover{background:#e6ebf0}' +
    '.htg-n{width:22px;height:22px;flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;background:#e6f0f7;border:1px solid #adcce2;color:#005982;font-size:11px;font-weight:800}' +
    '.htg-t{display:flex;flex-direction:column;min-width:0;flex:1}.htg-t b{font-size:13.5px;font-weight:750;color:#15181a}.htg-t small{font-size:11px;color:#5e6164;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.htg-tag{height:19px;padding:0 6px;display:inline-flex;align-items:center;border-radius:4px;border:1px solid;font-size:10.5px;font-weight:700;white-space:nowrap;flex:none}' +
    '.htg-tot{font-size:13px;font-weight:750;color:#15181a;min-width:40px;text-align:right;flex:none}' +
    '.htg-ch{width:7px;height:7px;border-right:1.5px solid #5e6164;border-bottom:1.5px solid #5e6164;transform:rotate(45deg);margin:0 2px 3px 4px;flex:none}.htg-g.fechado .htg-ch{transform:rotate(-45deg);margin-bottom:0}' +
    '.htg .htg-r{width:100%;display:grid;grid-template-columns:minmax(0,1fr) 70px 52px;gap:10px;align-items:center;padding:8px 12px 8px 42px;background:#fff;border-top:1px solid #e2e6e9}.htg .htg-r:hover{background:#eceff3}' +
    '.htg-r.zero .htg-nome{color:#5e6164}.htg-nm{display:flex;flex-wrap:wrap;align-items:center;gap:5px;min-width:0}' +
    '.htg-ctx{height:19px;padding:0 6px;display:inline-flex;align-items:center;border-radius:4px;background:#eff3f6;border:1px solid #d6dadd;color:#3e4043;font-size:10.5px;font-weight:700}' +
    '.htg-nome{font-size:12.5px;font-weight:700;color:#202325}.htg-chips{display:flex;gap:4px;flex-basis:100%}' +
    '.htg-bar{height:6px;border-radius:3px;background:#e2e6e9;overflow:hidden;display:block}.htg-bar span{display:block;height:100%;border-radius:3px}' +
    '.htg-q{text-align:right;font-size:13px;font-weight:750;color:#15181a}' +
    '.htg-pe,.htg .htg-pe{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 12px;background:#f3f6fa;font-size:11px;color:#5e6164}.htg-pe button{color:#006291;font-weight:700}' +
    '.htg-oculto{display:none!important}';
  function css() { if (document.getElementById('htg-css')) return; var st = document.createElement('style'); st.id = 'htg-css'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st); }

  /* ---------- aplicar nas duas colunas ---------- */
  var COLS = [['tarefas', 'todas'], ['minhas tarefas', 'minhas']], EST = {};
  function aplicar() {
    COLS.forEach(function (c) {
      var h = cabecalho(c[0]), col = h && coluna(h), ls = col && lista(col), box = document.getElementById('htg-' + c[1]);
      var pje = lsGet('hero18810:tg:pje:' + c[1]) === '1';
      if (!ls || desligado() || pje) {
        if (box) box.remove();
        Array.prototype.forEach.call(document.querySelectorAll('[data-htg-oculto="' + c[1] + '"]'), function (x) { x.classList.remove('htg-oculto'); x.removeAttribute('data-htg-oculto'); });
        if (pje && ls && !desligado()) botaoVoltar(ls, c[1]);
        return;
      }
      var vb = document.getElementById('htg-volta-' + c[1]); if (vb) vb.remove();
      css();
      var L = Array.prototype.map.call(ls.children, linha).filter(Boolean);
      if (L.length < 3) return;
      EST[c[1]] = L;
      if (!box || !document.contains(box)) {
        var alt = ls.getBoundingClientRect().height;
        box = document.createElement('div'); box.id = 'htg-' + c[1]; box.className = 'htg';
        box.style.maxHeight = Math.max(alt, 320) + 'px';
        ls.parentElement.insertBefore(box, ls);
        box.addEventListener('click', clique(c[1]), true);
        try { console.info('[HERO18810] painel por etapa em', c[0], L.length + ' tarefas'); } catch (e) {}
      }
      if (!ls.classList.contains('htg-oculto')) { ls.classList.add('htg-oculto'); ls.setAttribute('data-htg-oculto', c[1]); }
      var html = montar(L, c[1]) + '<div class="htg-pe"><span>Por etapa do fluxo (HERO18810)</span><button type="button" data-htg-pje="1">ver a lista do PJe</button></div>';
      if (box.getAttribute('data-sig') !== html) { box.setAttribute('data-sig', html); box.innerHTML = html; }
    });
  }
  function botaoVoltar(ls, chave) {
    if (document.getElementById('htg-volta-' + chave)) return; css();
    var b = document.createElement('div'); b.id = 'htg-volta-' + chave; b.className = 'htg htg-pe';
    b.innerHTML = '<span>Lista do PJe</span><button type="button">agrupar por etapa (HERO18810)</button>';
    b.querySelector('button').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); lsSet('hero18810:tg:pje:' + chave, '0'); b.remove(); agendar(); }, true);
    ls.parentElement.insertBefore(b, ls);
  }
  function clique(chave) {
    return function (e) {
      var g = e.target.closest('[data-htg-g]'), r = e.target.closest('[data-htg-i]'), p = e.target.closest('[data-htg-pje]');
      if (!g && !r && !p) return;
      e.preventDefault(); e.stopPropagation();
      if (p) { lsSet('hero18810:tg:pje:' + chave, '1'); agendar(); return; }
      if (g) { var k = 'hero18810:tg:' + chave + ':' + g.getAttribute('data-htg-g'), ab = g.getAttribute('aria-expanded') === 'true'; lsSet(k, ab ? '1' : '0'); aplicar(); return; }
      var L = EST[chave] || [], it = L[+r.getAttribute('data-htg-i')]; if (!it) return;
      /* clica na linha original do PJe (escondida): o PJe abre a tarefa como sempre */
      try { it.alvo.click(); } catch (x) { try { it.el.click(); } catch (y) {} }
    };
  }
  var tm = null;
  function agendar() { clearTimeout(tm); tm = setTimeout(function () { try { aplicar(); } catch (e) {} }, 500); }
  new MutationObserver(function (ms) {
    /* o que o próprio HERO desenha não dispara nova leitura */
    for (var i = 0; i < ms.length; i++) { var t = ms[i].target; if (!(t.closest && t.closest('.htg'))) { agendar(); return; } }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  try { chrome.storage.onChanged.addListener(function (ch, area) { if (area === 'local' && ch['muta-prazos']) agendar(); }); } catch (e) {}
  agendar();
  window.MutaTarefas = { aplicar: aplicar, grupoDe: grupoDe, linha: linha };
})();
