/* Ab Initio · Gestor de acervo e Triagem no padrão da página Pautas.
   1) Referências rápidas viram gaveta: botão no cabeçalho (lembrado neste navegador).
   2) A Triagem (dentro do motor) recebe a mesma linguagem visual da Pautas por uma folha injetada. */
(function (W, D) {
  'use strict';
  if (W.CMTPadraoPautas) return;
  const K = 'ab_ref_aberto';
  let aberto = false; try { aberto = localStorage.getItem(K) === '1'; } catch (e) {}
  function aplicar() {
    D.body.classList.toggle('rf-aberto', aberto);
    const b = D.getElementById('pp-ref'); if (b) b.setAttribute('aria-pressed', String(aberto));
  }
  function botao() {
    if (D.getElementById('pp-ref')) return;
    const tools = D.querySelector('.bar .tools'); if (!tools) return;
    const b = D.createElement('button'); b.type = 'button'; b.id = 'pp-ref'; b.className = 'pp-ref';
    b.textContent = 'Referências'; b.title = 'Referências rápidas: prazos, qual agravo, remessa, competência…';
    b.addEventListener('click', () => { aberto = !aberto; try { localStorage.setItem(K, aberto ? '1' : '0'); } catch (e) {} aplicar(); });
    tools.prepend(b); aplicar();
  }
  const CSS = `
html:not([data-theme="dark"]) #dc-root main>header{background:transparent!important;border:0!important;border-top:2px solid #235a55!important;border-radius:0!important;box-shadow:none!important;padding:14px 0 6px!important}
html:not([data-theme="dark"]) #dc-root main>header>div>div:first-child,html:not([data-theme="dark"]) #dc-root main>header>div>div:first-child *{font-family:ui-monospace,'IBM Plex Mono',monospace!important;font-weight:600!important;color:#805b18!important;letter-spacing:.1em!important}
html:not([data-theme="dark"]) #dc-root main>header>div>div[style*="gap: 10px"],html:not([data-theme="dark"]) #dc-root main>header>div>div[style*="gap: 10px"] *{font-family:Figtree,system-ui,sans-serif!important;font-size:40px!important;line-height:1.05!important;font-weight:650!important;letter-spacing:-.045em!important;color:#203b39!important}
html:not([data-theme="dark"]) .central-search-panel,html:not([data-theme="dark"]) #cmt-sheet,html:not([data-theme="dark"]) .cmt-stats{border-radius:0!important;box-shadow:none!important;border:1px solid #d3dfdc!important;border-top:2px solid #235a55!important}
html:not([data-theme="dark"]) .central-search-top,html:not([data-theme="dark"]) .central-search-top>div{background:#fbfaf5!important}
html:not([data-theme="dark"]) #cmt-filtro .cf-pre button,html:not([data-theme="dark"]) #cmt-filtro .cf-sit button{border-radius:14px!important;box-shadow:none!important}
html:not([data-theme="dark"]) #cmt-filtro .cf-pre button.on,html:not([data-theme="dark"]) #cmt-filtro .cf-pre button[aria-pressed="true"]{background:#235a55!important;border-color:#235a55!important;color:#fff!important}
html:not([data-theme="dark"]) #cmt-sheet .sh-bar{background:#fbfaf5!important;border-bottom:1px solid #d3dfdc!important}
html:not([data-theme="dark"]) .central-stat-card,html:not([data-theme="dark"]) .central-sec-card,html:not([data-theme="dark"]) .central-monthly-card{border-radius:0!important;box-shadow:none!important;border:1px solid #d3dfdc!important}
`;
  function injetar() {
    const f = D.getElementById('cmt-motor'); let d = null;
    try { d = f && f.contentDocument; } catch (e) { return; }
    if (!d || !d.head || d.getElementById('pp-padrao')) return;
    const s = d.createElement('style'); s.id = 'pp-padrao'; s.textContent = CSS; d.head.appendChild(s);
  }
  function ciclo() { botao(); injetar(); }
  ciclo();
  D.getElementById('cmt-motor')?.addEventListener('load', injetar);
  setInterval(ciclo, 2000);
  W.CMTPadraoPautas = { referencias: (v) => { aberto = v == null ? !aberto : !!v; aplicar(); } };
})(window, document);
