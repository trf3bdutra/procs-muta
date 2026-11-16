

/* Aparador final: só ficam Triagem, Sessões, Fluxos e Rotina, Competência e Referências. */
(function (W, D) {
'use strict';
const WL = ['triagem', 'sessoes', 'equipe', 'recursos', 'tarefas', 'acervo', 'referencias'];
const AL = { rotina: 'tarefas', competencia: 'tarefas' };
try {
  Object.assign(COMMAND_TAB_SLUG, {triagem: 'triagem', sessoes: 'sessoes', equipe: 'equipe'});
  ['triagem', 'sessoes', 'equipe'].forEach(tab => { if (!TABS.includes(tab)) TABS.push(tab); });
} catch (_) {}
/* restos dinâmicos (Acervo e Relatórios nascem por código): painel, botão e índice fora */
/* Central, Recursos, Acervo e Relatórios ficam no documento, ocultos e sem acesso: o motor os preenche
   e os relê em eventos; removê-los derrubaria o restante. */
D.querySelectorAll('.mods .mod').forEach(b => { if (!WL.includes(b.dataset.tab)) b.remove(); });
D.querySelectorAll('#index .ix-g').forEach(g => { if (!WL.includes(g.dataset.tab)) g.remove(); });
/* índice lateral das páginas novas, antes do grupo de Fluxos e Rotina */
function grupo(tab, titulo, itens) {
  const g = D.createElement('div'); g.className = 'ix-g'; g.dataset.tab = tab;
  g.innerHTML = '<button>' + titulo + '</button><ul>' + itens.map(([id, t]) => '<li><a href="#" data-target="' + id + '"><i></i>' + t + '</a></li>').join('') + '</ul>';
  g.querySelector(':scope > button').onclick = () => { showTab(tab); scrollTo({ top: 0, behavior: 'smooth' }); };
  g.querySelectorAll('a').forEach(a => a.onclick = e => { e.preventDefault(); goTo(tab, a.dataset.target); });
  return g;
}
const gt = D.querySelector('#index .ix-g[data-tab="tarefas"]');
const gs = grupo('sessoes', 'Sessões', []);
(() => { const ul = gs.querySelector('ul'); const li = D.createElement('li');
  li.innerHTML = '<div class="gx-ixw" id="gx-ix-ses">'
    + '<div class="gx-ixhead"><span class="ttl">Sessões cadastradas</span><button type="button" class="bt" id="gx-s-plus" title="Nova sessão" aria-expanded="false">+</button></div>'
    + '<div class="gx-ixchips" id="gx-s-chips"></div>'
    + '<div id="gx-s-novaform" hidden>'
    + '<label>Julgamento *</label><input type="date" id="gx-s-n-date">'
    + '<label>Peço-dia</label><input type="date" id="gx-s-n-peco">'
    + '<label>Início da preparação</label><input type="date" id="gx-s-n-prep">'
    + '<label>Entrega das minutas</label><input type="date" id="gx-s-n-min">'
    + '<label>Liberação dos votos</label><input type="date" id="gx-s-n-lib">'
    + '<button type="button" class="bt" id="gx-s-criar" style="margin-top:7px">Criar sessão</button></div>'
    + '<div class="gx-raillist" id="gx-s-lista"></div></div>';
  ul.appendChild(li);
  const lr = D.createElement('li');
  lr.className = 'cmt-rule-link';
  lr.innerHTML = '<a href="#" data-target="cmt-s-rules"><i></i>Regras de designação e correção</a>';
  lr.querySelector('a').onclick = ev => { ev.preventDefault(); showTab('sessoes'); setTimeout(() => D.getElementById('cmt-s-rules')?.scrollIntoView({behavior:'smooth', block:'start'}), 30); };
  ul.appendChild(lr);
  try { W.GX.renderS(); } catch (_) {} })();
const ge = grupo('equipe', 'Equipe', [['gx-e-quem', 'Quem faz o quê'], ['gx-e-prod', 'Regras de produtividade']]);
(() => { const ul = ge.querySelector('ul'); const li = D.createElement('li');
  li.innerHTML = '<div class="gx-ixw" id="gx-ix-eq">'
    + '<div class="gx-ixhead"><span class="ttl">Servidores</span><button type="button" class="bt" id="gx-e-add" title="Novo servidor">+</button></div>'
    + '<div class="gx-ixchips" id="gx-e-chips"></div>'
    + '<div class="gx-raillist" id="gx-e-lista"></div></div>';
  const first = ul.firstElementChild; first ? first.before(li) : ul.appendChild(li);
  try { W.GX.renderE(); } catch (_) {} })();
/* Sessões e Equipe mantêm painéis operacionais próprios na lateral; a Triagem fica no conteúdo central. */
if (gt) { gt.before(gs, ge); } else { const ix = D.getElementById('index'); ix.prepend(ge); ix.prepend(gs); }
/* navegação só entre as cinco abas; abas removidas avisam e nada muda */
const _s = showTab;
const requestedSlug = location.pathname.replace(/\/+$/, '').replace(/^\/comando-/, '').toLowerCase();
let lastTab = WL.includes(requestedSlug) ? requestedSlug : 'triagem';
/* cor de destaque da aba ativa: vem do ponto colorido do próprio botão do topo */
function accent() {
  try {
    const b = D.querySelector('.mods .mod.on'); if (!b) return;
    const c = getComputedStyle(b).getPropertyValue('--m').trim();
    if (c) D.body.style.setProperty('--ac', c);
  } catch (_) {}
}
try { new MutationObserver(() => accent()).observe(D.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (_) {}
try { W.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => setTimeout(accent, 50)); } catch (_) {}
showTab = function (t) {
  t = AL[t] || t;
  if (!WL.includes(t)) { try { W.GX.toast('Este conteúdo não faz parte desta edição da Central.'); } catch (_) {} return; }
  const r = _s(t); lastTab = t;
  accent();
  try { W.GX.onShow(t); } catch (_) {}
  return r;
};
/* vigia: nenhum caminho interno reexibe os painéis da Central que saíram desta edição */
const LEG = ['painel', 'lexico', 'regimento', 'diretrizes', 'competencia'];
function enforce() {
  let mexeu = false;
  LEG.forEach(id => { const p = D.getElementById(id); if (p && p.classList.contains('tabpane') && !p.hidden) { p.hidden = true; mexeu = true; } });
  if (mexeu || !WL.includes(D.body.dataset.mod || '')) showTab(lastTab);
}
LEG.forEach(id => { const p = D.getElementById(id); if (p) new MutationObserver(enforce).observe(p, { attributes: true, attributeFilter: ['hidden'] }); });
new MutationObserver(() => { if (!WL.includes(D.body.dataset.mod || '')) enforce(); }).observe(D.body, { attributes: true, attributeFilter: ['data-mod'] });
setInterval(enforce, 900);
/* painel “Acervo do gabinete” sai do Fluxos e Rotina e abre a aba Acervo */
(function () {
  const tp = D.getElementById('tk-panorama'), ac = D.getElementById('acervo');
  if (tp && ac) { const head = ac.querySelector('.pane-head'); head ? head.after(tp) : ac.prepend(tp); }
  const gt2 = D.querySelector('#index .ix-g[data-tab="tarefas"]');
  const ga = D.querySelector('#index .ix-g[data-tab="acervo"] ul');
  ['tk-leitura', 'tk-panorama'].forEach(id => {
    const a = gt2 && gt2.querySelector('a[data-target="' + id + '"]'); if (!a) return;
    const li = a.parentElement;
    if (ga) { ga.prepend(li); a.onclick = ev => { ev.preventDefault(); goTo('acervo', id); }; }
    else li.remove();
  });
  /* o bloco de Competência sai do toco e entra antes da seção Rotina do gabinete */
  const ca = D.getElementById('gx-ca');
  if (ca) { const tkr = D.getElementById('tk-rotina'); const cx = D.getElementById('tk-caixas'); const tp2 = D.getElementById('tarefas');
    if (tkr) tkr.before(ca); else if (cx) cx.before(ca); else if (tp2) tp2.appendChild(ca); }
  /* Competência agora mora na Rotina: entrada no índice, antes das fases */
  if (gt2) {
    const li = D.createElement('li');
    li.innerHTML = '<a href="#" data-target="gx-ca"><i></i>Competência e impedimentos</a>';
    li.querySelector('a').onclick = ev => { ev.preventDefault(); goTo('tarefas', 'gx-ca'); };
    const ref = gt2.querySelector('a[data-target="ph-chegada"]');
    ref ? ref.parentElement.before(li) : gt2.querySelector('ul').appendChild(li);
  }
})();
/* atalhos que apontavam para abas removidas: Léxico sai; Competência vive no Fluxos e Rotina */
try { SC_HOME.scomp = ['tarefas', 'gx-ca']; SC_HOME.sdist = ['tarefas', 'gx-ca']; delete SC_HOME.slex; } catch (_) {}
D.querySelectorAll('.atl-i .go[data-go="slex"]').forEach(b => b.remove());
D.querySelectorAll('#index .ix-g[data-tab="recursos"] a').forEach(a2 => { if (/L[ée]xico recursal/i.test(a2.textContent)) a2.parentElement.remove(); });
const atual = (() => {
  if (WL.includes(requestedSlug)) return requestedSlug;
  try { const t = AL[commandTabFromLocation()] || commandTabFromLocation(); return WL.includes(t) ? t : 'triagem'; }
  catch (_) { return 'triagem'; }
})();
showTab(atual);
})(window, document);

