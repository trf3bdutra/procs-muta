/* Ab Initio = Triagem. A Pautas virou página própria (/pautas/): o botão Pautas do cabeçalho leva para lá. */
(function (W, D) {
  'use strict';
  const st = D.createElement('style');
  st.textContent = 'nav.mods .mod[data-cmt="equipe"]{display:none!important}nav.mods .mod[data-cmt="pautas"]::after{content:" ↗";font-size:.85em;opacity:.7}';
  D.head.appendChild(st);
  D.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('nav.mods .mod[data-cmt="pautas"],[data-cmt-ir="sessoes"]');
    if (!b) return;
    ev.preventDefault(); ev.stopImmediatePropagation(); W.location.href = '/pautas/';
  }, true);
  /* aba Pautas lembrada de antes: abre a Triagem */
  let n = 0; const t = setInterval(() => {
    const on = D.querySelector('nav.mods .mod.on[data-cmt]');
    if (on && on.dataset.cmt === 'pautas') { clearInterval(t); D.querySelector('nav.mods .mod[data-cmt="triagem"]')?.click(); }
    else if (on || ++n > 120) clearInterval(t);
  }, 250);
  D.querySelectorAll('nav.mods .mod[data-cmt="pautas"]').forEach((b) => { b.title = 'Pautas: abre a página própria (/pautas/)'; });
})(window, document);
