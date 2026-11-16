
/* Monitor · índice lateral e acabamento no padrão da Central de Comando */
(function () {
  var COR = { b1: '#2b698e', b2: '#a8761c', b3: '#1a7f5a', b4: '#6a4fb3', b5: '#a33b4a', b6: '#c46a1f' }, ROM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function titulo(h) { var t = ''; [].forEach.call(h.childNodes, function (n) { if (n.nodeType === 3) t += n.textContent; }); return t.trim() || (h.innerText || '').split('\n')[0].trim(); }
  function linha(x) { var t = titulo(x); return t.length > 44 ? t.slice(0, 42) + '…' : t; }
  function clique(e) {
    var a = e.target.closest('a[href^="#"]'), b = e.target.closest('[data-mx]');
    if (a) { e.preventDefault(); var el = document.getElementById(a.getAttribute('href').slice(1)); if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY - 72, behavior: 'smooth' }); return; }
    if (!b) return; var k = b.dataset.mx;
    if (k === 'top') { scrollTo({ top: 0, behavior: 'smooth' }); return; }
    document.querySelectorAll('#au-pan-ind [data-aimin]').forEach(function (x) { var aberto = x.getAttribute('aria-expanded') !== 'false'; if ((k === 'min' && aberto) || (k === 'max' && !aberto)) x.click(); });
  }
  function ativo() {
    var idx = document.getElementById('mx-idx'); if (!idx) return;
    var alvo = null; idx.querySelectorAll('a[href^="#"]').forEach(function (a) { var el = document.getElementById(a.getAttribute('href').slice(1)); if (el && el.offsetParent && el.getBoundingClientRect().top < 140) alvo = a; });
    idx.querySelectorAll('a.on').forEach(function (a) { if (a !== alvo) a.classList.remove('on'); }); if (alvo) alvo.classList.add('on');
  }
  function decorar() {
    if (!document.body.classList.contains('au-pan')) return;
    var top = document.getElementById('au-pan-top'), ind = document.getElementById('au-pan-ind'); if (!top || !ind) return;
    var ph = document.querySelector('#au-pan-top > .pt-h, #ai-b1 > .pt-h');
    if (ph && !ph.querySelector('.mx-ey')) ph.insertAdjacentHTML('afterbegin', '<span class="mx-ey">Painel geral do gabinete</span>');
    var hs = ind.querySelector('.ai-hero .ai-ht small');
    if (ph && hs) { var sub = ph.querySelector('.mx-sub'); if (!sub) { sub = document.createElement('p'); sub.className = 'mx-sub'; ph.appendChild(sub); } if (sub.textContent !== hs.textContent) sub.textContent = hs.textContent; }
    var secs = [].slice.call(ind.querySelectorAll(':scope > section.ai-b'));
    secs.forEach(function (s) {
      var k = s.id.replace('ai-', ''), n = +k.slice(1) || 0; s.style.setProperty('--mx', COR[k] || '#2b698e');
      var b = s.querySelector(':scope > h3 > b'); if (b && b.textContent !== ROM[n] && ROM[n]) b.textContent = ROM[n];
      s.querySelectorAll(':scope > h4.au-sub4, :scope > .au-gabslot > h4, :scope > .au-gabslot > section > h2').forEach(function (h, j) { if (!h.id) h.id = 'mx-' + k + '-' + j; });
    });
    var idx = document.getElementById('mx-idx');
    if (!idx) { idx = document.createElement('aside'); idx.id = 'mx-idx'; idx.setAttribute('aria-label', 'Seções do Monitor'); idx.addEventListener('click', clique); }
    if (idx.parentElement !== top || top.firstElementChild !== idx) top.insertBefore(idx, top.firstChild);
    var html = '<span class="mx-k">Monitor</span>' + secs.map(function (s) {
      var k = s.id.replace('ai-', ''), n = +k.slice(1) || 0, h = s.querySelector(':scope > h3');
      var subs = [].slice.call(s.querySelectorAll('[id^="mx-' + k + '-"]')).filter(function (x) { return x.offsetParent; }).map(function (x) { return '<a href="#' + x.id + '" class="mx-s" style="--mx:' + (COR[k] || '#5fb3e0') + '">' + esc(linha(x)) + '</a>'; }).join('');
      return '<a href="#' + s.id + '" class="mx-i" style="--mx:' + (COR[k] || '#2b698e') + '"><em>' + (ROM[n] || n) + '</em>' + esc(h ? titulo(h) : k) + '</a>' + (subs ? '<div class="mx-ss">' + subs + '</div>' : '');
    }).join('') + '<div class="mx-ac"><button type="button" data-mx="min">Recolher tudo</button><button type="button" data-mx="max">Expandir tudo</button><button type="button" data-mx="top">Topo ↑</button></div>';
    if (idx.__h !== html) { idx.innerHTML = html; idx.__h = html; }
    var W = document.documentElement.clientWidth;
    document.querySelectorAll('#au-pan-top .au-bal').forEach(function (b) { var r = b.getBoundingClientRect(); b.classList.toggle('mx-dir', r.left > W - 470); });
    ativo();
  }
  setInterval(decorar, 800);
  addEventListener('scroll', function () { if (document.body.classList.contains('au-pan')) ativo(); }, { passive: true });
})();
