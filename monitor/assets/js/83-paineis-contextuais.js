
/** CMT-Acervo · V27 — painéis contextuais à esquerda e Referências rápidas à direita. */
(function (W, D) {
'use strict';
const $ = (s, r=D) => r.querySelector(s);
const $$ = (s, r=D) => [...r.querySelectorAll(s)];

function contextualLabel() {
  const tab = D.body.dataset.mod || 'triagem';
  const names = { triagem:'Triagem', sessoes:'Sessões', equipe:'Equipe', tarefas:'Fluxos e Rotina', acervo:'Acervo', referencias:'Referências' };
  const lab = names[tab] || 'Apoio';
  const index = $('#index');
  if (index) index.setAttribute('aria-label', 'Painel de apoio · ' + lab);
  const tog = $('#ixTog');
  if (tog) {
    tog.title = 'Recolher painel de apoio';
    tog.setAttribute('aria-label', 'Recolher painel de apoio · ' + lab);
    const sl = $('.side-lab', tog); if (sl) sl.textContent = 'Apoio';
  }
  $$('#index .ix-g').forEach(g => {
    const on = g.dataset.tab === tab || (tab === 'rotina' && g.dataset.tab === 'tarefas');
    g.classList.toggle('cur', on);
    const b = $(':scope > button', g); if (b) b.classList.toggle('on', on);
  });
}

function makeGroup(tab, title) {
  let g = $(`#index .ix-g[data-tab="${tab}"]`);
  if (g) return g;
  g = D.createElement('div');
  g.className = 'ix-g'; g.dataset.tab = tab;
  g.innerHTML = `<button type="button">${title}</button><ul></ul>`;
  const ix = $('#index');
  const ref = $('#index .ix-g[data-tab="sessoes"]') || $('#index .ix-g');
  ref ? ix.insertBefore(g, ref) : ix.appendChild(g);
  return g;
}

function setupTriagem() {
  const g = makeGroup('triagem', 'Triagem');
  const ul = $(':scope > ul', g);
  if (!ul) return;
  const head = $(':scope > button', g); if (head) head.textContent = 'Triagem';

  // Escaninhos: o componente funcional é único e passa a morar no painel lateral.
  const escs = $('#gx-ix-escs');
  if (escs && !$('#cmt-triagem-escaninhos', g)) {
    const li = D.createElement('li');
    li.className = 'cmt-support-li';
    li.innerHTML = '<section class="gx-ixw cmt-support-card" id="cmt-triagem-escaninhos">'
      + '<div class="gx-ixhead"><span class="ttl">Painel de escaninhos</span></div>'
      + '<p class="cmt-support-note">Bandeja, Pauta Prévia e escaninhos da Triagem.</p>'
      + '<div class="cmt-escaninhos-slot"></div></section>';
    ul.prepend(li);
    $('.cmt-escaninhos-slot', li).appendChild(escs);
  }
  const drawers = $('.gx-triage-drawers');
  if (drawers) drawers.hidden = true;
  const tools = $('.gx-triage-tools'); if (tools) tools.classList.add('cmt-single-col');

  // Regras de etiquetas: o editor completo continua sendo o mesmo módulo; apenas muda de lugar.
  const regras = $('#ref-etq');
  let box = $('#cmt-triagem-etiquetas', g);
  if (!box) {
    const li = D.createElement('li');
    li.className = 'cmt-support-li cmt-label-rules-li';
    li.innerHTML = '<details class="cmt-label-rules" id="cmt-triagem-etiquetas">'
      + '<summary><span>Regras de etiquetas</span><small>como as etiquetas do PJe classificam cada processo</small></summary>'
      + '<div class="cmt-label-rules-slot"></div></details>';
    ul.appendChild(li);
    box = $('#cmt-triagem-etiquetas', li);
  }
  if (regras && box && !box.contains(regras)) $('.cmt-label-rules-slot', box).appendChild(regras);

  // Elimina a antiga entrada em Referências; a busca global passa a levar à Triagem.
  $$('#index .ix-g[data-tab="referencias"] a[data-target="ref-etq"]').forEach(a => a.closest('li')?.remove());
}
function setupTriagemFooterToggle() {
  const pane = $('#triagem');
  const legacy = $('#ixTog');
  if (!pane || !legacy) return;
  let foot = $('#cmt-triagem-support-footer', pane);
  if (!foot) {
    foot = D.createElement('div');
    foot.id = 'cmt-triagem-support-footer';
    foot.className = 'cmt-triagem-support-footer';
    foot.innerHTML = '<button type="button" id="cmt-triagem-support-toggle" class="cmt-triagem-support-toggle" aria-expanded="true">'
      + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>'
      + '<span>Painel de apoio</span></button>';
    pane.appendChild(foot);
  }
  const btn = $('#cmt-triagem-support-toggle', foot);
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  const sync = () => {
    const min = D.body.classList.contains('ix-min');
    btn.setAttribute('aria-expanded', String(!min));
    btn.title = min ? 'Mostrar painel de apoio' : 'Recolher painel de apoio';
    btn.setAttribute('aria-label', btn.title);
    btn.classList.toggle('is-min', min);
  };
  btn.addEventListener('click', () => { legacy.click(); setTimeout(sync, 0); });
  try { new MutationObserver(sync).observe(D.body, {attributes:true, attributeFilter:['class']}); } catch (_) {}
  sync();
}

function setupSessoes() {
  const g = $('#index .ix-g[data-tab="sessoes"]'); if (!g) return;
  const head = $(':scope > button', g); if (head) head.textContent = 'Sessões';
  const box = $('#gx-ix-ses', g); if (!box) return;
  const ttl = $('.gx-ixhead .ttl', box); if (ttl) ttl.textContent = 'Sessões cadastradas';
  const plus = $('#gx-s-plus', box); if (plus) { plus.title = 'Criar sessão'; plus.setAttribute('aria-label','Criar sessão'); }
}

function setupEquipe() {
  const g = $('#index .ix-g[data-tab="equipe"]'); if (!g) return;
  const head = $(':scope > button', g); if (head) head.textContent = 'Equipe';
  const box = $('#gx-ix-eq', g); if (box) {
    const ttl = $('.gx-ixhead .ttl', box); if (ttl) ttl.textContent = 'Servidores';
    const add = $('#gx-e-add', box); if (add) { add.title = 'Adicionar servidor'; add.setAttribute('aria-label','Adicionar servidor'); }
  }
  const ul = $(':scope > ul', g); if (!ul || ul.querySelector('.cmt-rules-label')) return;
  const rosterLi = box && box.closest('li');
  const ruleLis = [...ul.children].filter(li => li !== rosterLi && li.querySelector('a[data-target]'));
  if (!ruleLis.length) return;
  const label = D.createElement('li'); label.className = 'cmt-rules-label'; label.textContent = 'Regras do app';
  ul.insertBefore(label, ruleLis[0]);
  ruleLis.forEach(li => li.classList.add('cmt-rule-link'));
}

const QUICK = [
  ['spz','Prazos'], ['sag','Agravos'], ['s932','Art. 932'], ['s942','Art. 942'],
  ['srn','Remessa'], ['spje','PJe'], ['sexc','Retratação'], ['recursos','Recursos']
];
function openRef(id) {
  if (id === 'recursos') { W.CMTRecursosAtalhos?.open?.(); return; }
  const d = $(`.atl-i[data-sc="${id}"]`); if (!d) return;
  if (D.body.classList.contains('rail-min')) $('#rlTog')?.click();
  if (W.matchMedia('(max-width:1060px)').matches) D.body.classList.add('sheet');
  d.open = true;
  setTimeout(() => d.scrollIntoView({ behavior:'smooth', block:'start' }), 30);
}
function setupRefs() {
  const rail = $('#rail'), atl = $('.atl', rail), list = $('#atlist'); if (!rail || !atl || !list) return;
  const h = $(':scope > h4', atl);
  if (h) h.innerHTML = 'Referências rápidas <small>consulta imediata</small><button class="railx" id="railClose" aria-label="Fechar referências rápidas">✕</button>';
  $('#rlTog')?.setAttribute('title','Recolher referências rápidas');
  $('#rlTog')?.setAttribute('aria-label','Recolher referências rápidas');
  const sl = $('#rlTog .side-lab'); if (sl) sl.textContent = 'Referências';
  if (!$('#cmt-ref-tools')) {
    const tools = D.createElement('div'); tools.id = 'cmt-ref-tools'; tools.className = 'cmt-ref-tools';
    tools.innerHTML = '<label class="cmt-ref-search"><span>⌕</span><input type="search" id="cmt-ref-q" placeholder="Buscar referência rápida…" aria-label="Buscar nas referências rápidas"></label>'
      + '<div class="cmt-ref-quick" role="group" aria-label="Referências mais usadas">'
      + QUICK.map(([id,t]) => `<button type="button" data-ref="${id}">${t}</button>`).join('') + '</div>';
    const res = $('#cmt-at-recursos');
    atl.insertBefore(tools, res || list);
    tools.addEventListener('click', e => { const b = e.target.closest('[data-ref]'); if (b) openRef(b.dataset.ref); });
    $('#cmt-ref-q').addEventListener('input', e => {
      const q = e.target.value.trim().toLocaleLowerCase('pt-BR');
      $$('.atl-i', list).forEach(d => { d.hidden = !!q && !d.textContent.toLocaleLowerCase('pt-BR').includes(q); });
      const r = $('#cmt-at-recursos'); if (r) r.hidden = !!q && !r.textContent.toLocaleLowerCase('pt-BR').includes(q) && !'recursos recurso apelação agravo embargos'.includes(q);
    });
  }
  $$('.atl-i', list).forEach(d => { d.open = false; d.classList.add('cmt-ref-item'); });
}

function setupResponsiveSupportPanel() {
  const tog = $('#ixTog');
  const index = $('#index');
  if (!tog || !index) return;
  const mq = W.matchMedia('(max-width:1060px)');
  const sync = () => {
    if (!mq.matches) {
      D.body.classList.remove('ix-sheet');
      return;
    }
    // No Preview do Replit o painel deve continuar disponível mesmo se a preferência desktop estiver recolhida.
    D.body.classList.remove('ix-min');
    const open = D.body.classList.contains('ix-sheet');
    tog.setAttribute('aria-expanded', String(open));
    tog.title = open ? 'Fechar painel de apoio' : 'Abrir painel de apoio';
    tog.setAttribute('aria-label', tog.title);
  };
  // Captura o clique antes do handler legado: em tela estreita o botão abre um drawer, em vez de ocultar o índice.
  tog.addEventListener('click', ev => {
    if (!mq.matches) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    D.body.classList.toggle('ix-sheet');
    sync();
  }, true);
  D.addEventListener('click', ev => {
    if (!mq.matches || !D.body.classList.contains('ix-sheet')) return;
    if (index.contains(ev.target)) return;
    D.body.classList.remove('ix-sheet');
    sync();
  });
  D.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && mq.matches && D.body.classList.contains('ix-sheet')) {
      D.body.classList.remove('ix-sheet');
      sync();
    }
  });
  try { mq.addEventListener('change', sync); } catch (_) { try { mq.addListener(sync); } catch (_) {} }
  sync();
}

function ready() {
  setupTriagem(); setupTriagemFooterToggle(); setupSessoes(); setupEquipe(); setupRefs(); contextualLabel(); setupResponsiveSupportPanel();
  try { new MutationObserver(contextualLabel).observe(D.body, {attributes:true, attributeFilter:['data-mod']}); } catch (_) {}
}
if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', () => setTimeout(ready, 0), {once:true});
else setTimeout(ready, 0);
})(window, document);

