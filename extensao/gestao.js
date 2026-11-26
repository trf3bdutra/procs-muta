/* HERO18810 0.48 · abas do Desembargador e do gestor.
   - Diligências: o quadro de diligências do Ex Officio (apoio/equipe-pendencias.json), pela mesma API /api/pendencias:
     lista (comigo · que criei · todas), mudança de etapa e diligência nova. Visível ao Desembargador (perfil
     desembargador) e ao gestor.
   - Deliberações: o que pede decisão — dúvidas dirigidas a quem está conectado (responder), pedidos de retirada e de
     adiamento de pauta (deferir ou indeferir, como no painel /cmt) e pedidos de sustentação oral e de preferência
     recebidos. Fonte: /api/painel?cmt=1. Visível ao Desembargador e ao gestor.
   - Visibilidade das abas Diligências, Deliberações e Controle (este só do gestor; o conteúdo é de alertas.js).
   Nada é gravado no PJe. */
(function () {
  'use strict';
  var ses = window.MutaSessao;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dg = function (s) { return String(s || '').replace(/\D/g, ''); };
  var norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase(); };
  function data(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function diaMes(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? m[3] + '/' + m[2] : ''; }
  function hoje() { return new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10); }
  function site() { return (window.Muta && window.Muta.SITE) || 'https://www.gabinete-cmt.com'; }
  function quem() { var e = ses ? ses.estado() : {}; return { on: e.estado === 'on', usuario: e.usuario || '', gestor: !!e.gestor, des: e.perfil === 'desembargador' }; }
  function pode(q) { return q.on && (q.gestor || q.des); }
  function copiaBtn(n) { return n ? '<button type="button" class="gx-k" data-gx-copia="' + esc(n) + '" title="Copiar o número">' + esc(n) + '</button>' : ''; }

  /* Reaproveita os botões reais e seus contadores, sem clonagem ou duplicação. */
  function gestaoNaFaixa(q){
    var slot=$('tu-gestao'),faixa=$('pv-nav-main'),topo=$('topo-u'),aside=document.querySelector('.layout>aside>.nav');
    if(!slot||!topo||!aside)return;
    if(!faixa){faixa=document.createElement('div');faixa.id='pv-nav-main';faixa.className='pv-nav-row';}
    faixa.setAttribute('role','tablist');faixa.setAttribute('aria-label','Ferramentas processuais');
    if(faixa.parentNode!==aside)aside.appendChild(faixa);
    ['tab-pront','tab-min','tab-acervo','tab-pauta'].forEach(function(id){var b=$(id);if(b)faixa.appendChild(b);});
    var divisor=faixa.querySelector('.pv-nav-divider');if(divisor)divisor.remove();
    if(slot.parentNode!==topo)topo.appendChild(slot);
    [['tab-del','Notificações'],['tab-dil','Diligências'],['tab-urg','Urgências']].forEach(function(x){
      var b=$(x[0]);if(!b)return;slot.appendChild(b);
      b.title=x[1];b.setAttribute('aria-label',x[1]);
    });
    slot.hidden=!(pode(q)||(q.on&&document.body.classList.contains('hero-redesign-v53')));
    document.body.classList.remove('hero-gestao-rodape');
  }

  /* ---------- visibilidade das abas ---------- */
  function mostrar() {
    var q = quem(), dil = $('tab-dil'), del = $('tab-del'), urg = $('tab-urg'), ctl = $('tab-ctl'), pa = $('tab-pauta');
    var ver = { dil: pode(q), del: pode(q)||(q.on&&document.body.classList.contains('hero-redesign-v53')), ctl: q.on && q.gestor, pauta: q.on };
    /* 0.58: Controle vira ícone na faixa do topo (gabinete.js › faixaUsuario); a aba fica escondida na barra */
    [[dil, ver.dil], [del, ver.del], [urg, pode(q)], [ctl, ver.ctl, true], [pa, ver.pauta]].forEach(function (p) {
      if (!p[0]) return;
      p[0].hidden = !p[1] || !!p[2];
      if (!p[1] && p[0].getAttribute('aria-selected') === 'true' && window.MutaAbas) window.MutaAbas.ir('pront');
    });
    gestaoNaFaixa(q);
    if (pode(q)) { if (!D.lista && !D.lendo) lerDil(); if (!X.dados && !X.lendo) lerDel(); }
  }

  /* Uma faixa única de navegação: ações fora do tablist, na mesma linha visual. */
  function atualizaBtn(acao,lendo){
    return '<button type="button" class="gx-nav-action" data-gx="'+acao+'" title="Atualizar" aria-label="Atualizar"'+(lendo?' disabled aria-busy="true"':'')+'><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 11.7-3L20 9M4 15l2.8 3A7 7 0 0 0 18.5 15"/></svg></button>';
  }
  function faixaGestao(rotulo,abas,acao,lendo,extra){
    return '<div class="gx-nav"><div class="seg pmodos gx-modos" role="tablist" aria-label="'+esc(rotulo)+'">'+abas+'</div><div class="gx-nav-actions">'+(acao?atualizaBtn(acao,lendo):'')+(extra||'')+'</div></div>';
  }

  /* ---------- Diligências ---------- */
  var ETAPAS = [['todo', 'A fazer'], ['doing', 'Em andamento'], ['review', 'Em revisão'], ['done', 'Concluída']];
  var NOME_ET = {}, STAGE_OK = {}; ETAPAS.forEach(function (e) { NOME_ET[e[0]] = e[1]; STAGE_OK[e[0]] = 1; });
  var URG = ['Urgente', 'Alta', 'Média', 'Baixa'];
  var D = { quadro:'todas', filtrosAbertos:false, busca:'', responsavel:'', prioridade:'', f: 'comigo', nova: false, lista: null, equipe: [], erro: '', msg: '', lendo: false, abertos: {}, ed: {}, exc: {}, resp: {}, fase: { todo: true, doing: true, review: true, done: false } };
  function lerDil() {
    if (!ses || !pode(quem())) return Promise.resolve();
    D.lendo = true; pintarDil();
    return ses.api('/api/pendencias').then(function (j) {
      D.lista = (j.tasks || []); D.equipe = j.equipe || []; D.erro = ''; D.lendo = false; badges(); pintarDil();
    }).catch(function (e) { D.erro = e.message || 'Não foi possível ler as diligências.'; D.lendo = false; pintarDil(); });
  }
  function filtro(t, f, u) {
    if (f === 'comigo') return norm(t.assignee) === norm(u);
    if (f === 'criei') return norm(t.creator) === norm(u);
    return true;
  }
  function ordem(a, b) {
    var ua = URG.indexOf(a.urgency), ub = URG.indexOf(b.urgency);
    return ((a.stage === 'done') - (b.stage === 'done')) || ((ua < 0 ? 2 : ua) - (ub < 0 ? 2 : ub)) ||
      String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')) || String(b.atualizadoEm || b.criadoEm || '').localeCompare(String(a.atualizadoEm || a.criadoEm || ''));
  }
  function abertasComigo() { var u = quem().usuario; return (D.lista || []).filter(function (t) { return t.stage !== 'done' && filtro(t, 'comigo', u); }); }
  function itemDil(t) {
    if (D.ed[t.id]) return '<article class="gx-it" data-id="' + esc(t.id) + '">' + formDil(t) + '</article>';
    var u = quem().usuario, minha = norm(t.assignee) === norm(u), criei = norm(t.creator) === norm(u);
    var venc = t.stage !== 'done' && t.dueDate && t.dueDate < hoje();
    var desc = String(t.description || ''), longa = desc.length > 220, ab = D.abertos[t.id];
    return '<article class="gx-it hero-gx-row' + (venc ? ' venc' : '') + (t.stage === 'done' ? ' feita' : '') + '" data-id="' + esc(t.id) + '" data-stage="'+esc(t.stage||'todo')+'">' +
      '<div class="gx-h"><b class="gx-t">' + esc(t.title || 'Diligência') + '</b>' +
      (t.urgency && t.urgency !== 'Média' ? '<span class="gx-c u-' + esc(norm(t.urgency)) + '">' + esc(t.urgency) + '</span>' : '') +
      (t.dueDate ? '<span class="gx-c' + (venc ? ' venc' : '') + '" title="Prazo">até ' + esc(data(t.dueDate)) + '</span>' : '') + '</div>' +
      '<div class="hero-board-meta"><div><small>Responsável</small><b>'+esc(t.assignee||'Sem destinatário')+'</b></div><div><small>Solicitante</small><b>'+esc(t.creator||'Não informado')+'</b></div></div>'+(t.numero||t.sessao?'<p class="gx-m hero-board-process">'+[t.numero?copiaBtn(t.numero):'',t.sessao?'Sessão '+esc(data(t.sessao)):''].filter(Boolean).join(' · ')+'</p>':'')+
      (desc ? '<p class="gx-tx">' + esc(longa && !ab ? desc.slice(0, 220) + '…' : desc) + (longa ? ' <button type="button" class="lnk" data-gx-mais="' + esc(t.id) + '">' + (ab ? 'menos' : 'ler tudo') + '</button>' : '') + '</p>' : '') +
      (t.resposta ? '<p class="gx-ob">Resposta' + (t.respondidoPor ? ' de ' + esc(t.respondidoPor) : '') + ': ' + esc(t.resposta) + '</p>' : '') +
      '<div class="gx-ac hero-gx-state"><label class="gx-et">Etapa <select data-gx-etapa="' + esc(t.id) + '">' + ETAPAS.map(function (e) { return '<option value="' + e[0] + '"' + (e[0] === (t.stage || 'todo') ? ' selected' : '') + '>' + e[1] + '</option>'; }).join('') + '</select></label>' +
      '<span class="gx-bt">' + (minha && t.stage !== 'done' ? '<button type="button" class="lnk" data-gx-dr="' + esc(t.id) + '">responder</button>' : '') + '<button type="button" class="lnk" data-gx-ed="' + esc(t.id) + '">editar</button>' + (criei ? '<button type="button" class="lnk gx-del" data-gx-exc="' + esc(t.id) + '">excluir</button>' : '') + '</span>' +
      '<small class="muted">' + esc(diaMes(t.atualizadoEm || t.criadoEm)) + (t.atualizadoPor ? ' · ' + esc(t.atualizadoPor) : '') + '</small></div>' +
      (D.exc[t.id] ? '<div class="gx-ac gx-cf"><span>Excluir a diligência "' + esc(t.title || '') + '"? Ela sai do quadro da equipe.</span><span><button type="button" class="lnk" data-gx-exc="' + esc(t.id) + '">cancelar</button><button type="button" class="btn solid sm" data-gx-excok="' + esc(t.id) + '">Excluir</button></span></div>' : '') +
      (D.resp[t.id] ? '<form class="gx-f" data-gx-form="dresp" data-id="' + esc(t.id) + '"><textarea name="texto" rows="3" maxlength="2000" placeholder="Resposta a ' + esc(t.creator || 'quem criou') + ' (conclui a diligência)" required></textarea><label class="gx-conc"><input type="checkbox" name="manter"> manter aberta</label><span class="gx-fb"><button type="button" class="lnk" data-gx-dr="' + esc(t.id) + '">cancelar</button><button type="submit" class="btn solid sm">Responder</button></span></form>' : '') +
      '</article>';
  }
  /* formulário da diligência: nova (t vazio) ou edição de uma existente */
  function formDil(t) {
    var nova = !t; t = t || { numero: window.MutaGabinete && window.MutaGabinete.cnj ? window.MutaGabinete.cnj() : '', urgency: 'Média' };
    var eq = D.equipe.slice(); if (eq.indexOf('CM') < 0) eq.push('CM'); if (t.assignee && eq.map(norm).indexOf(norm(t.assignee)) < 0) eq.push(t.assignee);
    return '<form class="gx-f" data-gx-form="' + (nova ? 'nova' : 'editar') + '"' + (nova ? '' : ' data-id="' + esc(t.id) + '"') + '><input name="title" maxlength="200" placeholder="Título da diligência" value="' + esc(t.title || '') + '" required>' +
      '<div class="gx-fr"><label>Para <select name="assignee"><option value="">(sem destinatário)</option>' + eq.map(function (n) { return '<option' + (norm(n) === norm(t.assignee) ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></label>' +
      '<label>Prioridade <select name="urgency">' + URG.map(function (u) { return '<option' + (u === (t.urgency || 'Média') ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></label>' +
      '<label>Prazo <input type="date" name="dueDate" value="' + esc(t.dueDate || '') + '"></label></div>' +
      '<label class="gx-fl">Processo <input name="numero" value="' + esc(t.numero || '') + '" placeholder="número CNJ (opcional)"></label>' +
      '<textarea name="description" rows="3" maxlength="2000" placeholder="O que fazer">' + esc(t.description || '') + '</textarea>' +
      '<span class="gx-fb"><button type="button" class="lnk" data-gx="' + (nova ? 'cancelar-nova' : 'cancelar-ed') + '"' + (nova ? '' : ' data-id="' + esc(t.id) + '"') + '>cancelar</button><button type="submit" class="btn solid sm">' + (nova ? 'Criar diligência' : 'Gravar') + '</button></span></form>';
  }
  function metricasCmt(M,extra){return '<div class="hero-cmt-gestion-metrics '+(extra||'')+'">'+M.map(function(x){return '<div data-stage="'+x[0]+'"><b>'+esc(x[2])+'</b><small>'+esc(x[1])+'</small>'+(x[3]?'<small>'+esc(x[3])+'</small>':'')+'</div>';}).join('')+'</div>';}
  function painelGestao(titulo,subtitulo,acoes,metricas,filtros){
    return '<section class="hero-cmt-gestion hero-gestao-strip" aria-label="'+esc(titulo)+' · indicadores"><div class="hero-gestao-inline">'+(metricas||'')+(acoes?'<div class="hero-gestao-tools">'+acoes+'</div>':'')+'</div>'+(filtros?'<details class="hero-gestao-filter"'+(D.filtrosAbertos?' open':'')+'><summary title="Busca e filtros">Filtros</summary>'+filtros+'</details>':'')+'</section>';
  }
  function kanban(grupos,modo,acao,render){
    var tabs=[['todas','Todas',grupos.reduce(function(n,g){return n+g[2].length;},0)]].concat(grupos.map(function(g){return [g[0],g[1],g[2].length];}));
    return '<div class="hero-kanban hero-board-refined" data-board="'+esc(acao)+'" data-mode="'+esc(modo)+'"><nav class="hero-kanban-nav" aria-label="Filtrar por etapa">'+tabs.map(function(g){return '<button type="button" data-gx-board="'+acao+':'+g[0]+'" data-tone="'+g[0]+'" aria-pressed="'+(modo===g[0])+'">'+esc(g[1])+' <b>'+g[2]+'</b></button>';}).join('')+'</nav><div class="hero-kanban-board">'+grupos.filter(function(g){return modo==='todas'||g[0]===modo;}).map(function(g){return '<section class="hero-kanban-col" data-tone="'+g[0]+'" data-empty="'+(!g[2].length)+'"><header><b>'+esc(g[1])+'</b><span>'+g[2].length+'</span></header><div class="hero-kanban-cards">'+(g[2].length?g[2].map(render).join(''):'<p class="muted gx-v hero-board-empty">Sem registros</p>')+'</div></section>';}).join('')+'</div></div>';
  }
  function pintarDil() {
    var c = $('dil-app'); if (!c) return;
    var q = quem();
    if (!pode(q)) { c.innerHTML = '<p class="muted gx-v">' + (q.on ? 'As Diligências são do Desembargador e do gestor.' : 'Entre no painel para ver as diligências.') + '</p>'; return; }
    /* 0.48.2: seções por fase do andamento, como as colunas do quadro do Ex Officio; os contadores dos filtros são das abertas */
    var L = D.lista || [];
    var n = { comigo: 0, criei: 0, todas: 0 };
    L.forEach(function (t) { if (t.stage === 'done') return; n.todas++; if (filtro(t, 'comigo', q.usuario)) n.comigo++; if (filtro(t, 'criei', q.usuario)) n.criei++; });
    var V = L.filter(function(t){return filtro(t,D.f,q.usuario)&&(!D.responsavel||norm(t.assignee)===norm(D.responsavel))&&(!D.prioridade||t.urgency===D.prioridade)&&(!D.busca||norm([t.title,t.description,t.numero,t.assignee,t.creator].join(' ')).includes(norm(D.busca)));}).sort(ordem);
    var abertas=L.filter(function(t){return t.stage!=='done';});
    var metricas=metricasCmt([['total','Em aberto',abertas.length,n.comigo+' suas'],['priority','Prioritárias',abertas.filter(function(t){return /^(Alta|Urgente)$/.test(t.urgency);}).length],['sem','Sem responsável',abertas.filter(function(t){return !t.assignee;}).length]]);
    var eq=Array.from(new Set(D.equipe.concat(L.map(function(t){return t.assignee;}).filter(Boolean)))).sort();
    var filtros='<div class="hero-cmt-gestion-filters"><input type="search" data-gx-filter="busca" placeholder="Buscar diligência ou processo" aria-label="Buscar diligência" value="'+esc(D.busca)+'"><label>Responsável<select data-gx-filter="responsavel"><option value="">Todos os responsáveis</option>'+eq.map(function(n){return '<option value="'+esc(n)+'"'+(n===D.responsavel?' selected':'')+'>'+esc(n)+'</option>';}).join('')+'</select></label><label>Prioridade<select data-gx-filter="prioridade"><option value="">Todas as prioridades</option>'+URG.map(function(n){return '<option value="'+esc(n)+'"'+(n===D.prioridade?' selected':'')+'>'+esc(n)+'</option>';}).join('')+'</select></label></div>';
    var fases=kanban(ETAPAS.map(function(e){return [e[0],e[1],V.filter(function(t){return (STAGE_OK[t.stage]?t.stage:'todo')===e[0];})];}),D.quadro,'dil',itemDil);
    var tab = function (k, r) { return '<button type="button" role="tab" data-gx-f="' + k + '" aria-selected="' + (D.f === k) + '">' + r + ' <i>' + n[k] + '</i></button>'; };
    var acesso='<a class="gx-nav-action" target="_blank" rel="noopener" title="Abrir no Ex Officio" aria-label="Abrir no Ex Officio" href="'+esc(site())+(q.des&&!q.gestor?'/cmt/':'/exofficio/#pendencias')+'"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 5h6v6M19 5l-9 9M19 13v6H5V5h6"/></svg></a>';
    c.innerHTML = painelGestao('Diligências','Quadro da equipe', '<button type="button" class="btn sm" data-gx="nova"'+(D.nova?' hidden':'')+'>+ Nova</button>'+atualizaBtn('ler-dil',D.lendo)+acesso,metricas,filtros)+faixaGestao('Filtro das diligências',tab('comigo','Comigo')+tab('criei','Que criei')+tab('todas','Todas'),'',D.lendo) +
      (D.nova ? formDil() : '') +
      (D.msg ? '<p class="gx-msg' + (/^Não|erro/i.test(D.msg) ? ' err' : '') + '">' + esc(D.msg) + '</p>' : '') +
      (D.erro ? '<p class="gx-v err">' + esc(D.erro) + '</p>' : !D.lista ? '<p class="muted gx-v">Lendo o quadro…</p>' :
        fases);
  }
  function etapa(id, st, sel) {
    var t = (D.lista || []).filter(function (x) { return x.id === id; })[0]; if (!t) return;
    sel.disabled = true; D.msg = 'Gravando…';
    ses.api('/api/pendencias', { method: 'PUT', body: JSON.stringify({ id: id, _rev: t._rev, stage: st }) }).then(function (j) {
      if (j && j.task) Object.assign(t, j.task); else t.stage = st;
      D.msg = 'Etapa: ' + NOME_ET[st] + ' · ' + (t.title || ''); badges(); pintarDil();
    }).catch(function (e) { D.msg = 'Não gravou: ' + (e.message || 'erro'); if (e.status === 409) lerDil(); else pintarDil(); });
  }
  function criar(f) {
    var b = campos(f);
    if (!b.title) return;
    var bt = f.querySelector('[type=submit]'); if (bt) bt.disabled = true;
    ses.api('/api/pendencias', { method: 'POST', body: JSON.stringify(b) }).then(function () {
      D.nova = false; D.msg = 'Diligência criada: ' + b.title; D.f = norm(b.assignee) === norm(quem().usuario) ? 'comigo' : 'criei'; return lerDil();
    }).catch(function (e) { if (bt) bt.disabled = false; D.msg = 'Não criou: ' + (e.message || 'erro'); pintarDil(); });
  }

  function campos(f) { var b = {}; ['title', 'assignee', 'urgency', 'dueDate', 'numero', 'description'].forEach(function (k) { b[k] = String((f.elements[k] || {}).value || '').trim(); }); return b; }
  function editar(f) {
    var id = f.getAttribute('data-id'), t = (D.lista || []).filter(function (x) { return x.id === id; })[0]; if (!t) return;
    var b = campos(f); if (!b.title) return; b.id = id; b._rev = t._rev;
    var bt = f.querySelector('[type=submit]'); if (bt) bt.disabled = true;
    ses.api('/api/pendencias', { method: 'PUT', body: JSON.stringify(b) }).then(function (j) {
      if (j && j.task) Object.assign(t, j.task); else Object.assign(t, b);
      delete D.ed[id]; D.msg = 'Diligência gravada: ' + (t.title || ''); badges(); pintarDil();
    }).catch(function (e) { if (bt) bt.disabled = false; D.msg = 'Não gravou: ' + (e.message || 'erro'); if (e.status === 409) { delete D.ed[id]; lerDil(); } else pintarDil(); });
  }
  function excluir(id, bt) {
    if (bt) bt.disabled = true;
    ses.api('/api/pendencias?id=' + encodeURIComponent(id), { method: 'DELETE' }).then(function () {
      delete D.exc[id]; D.lista = (D.lista || []).filter(function (x) { return x.id !== id; }); D.msg = 'Diligência excluída.'; badges(); pintarDil();
    }).catch(function (e) { if (bt) bt.disabled = false; D.msg = 'Não excluiu: ' + (e.message || 'erro'); pintarDil(); });
  }
  /* resposta a uma diligência dirigida a quem está conectado: grava a resposta e conclui (como a dúvida no painel /cmt) */
  function responderDil(f) {
    var id = f.getAttribute('data-id'), tx = String(f.elements.texto.value || '').trim(); if (!tx) return;
    var bt = f.querySelector('[type=submit]'); if (bt) bt.disabled = true;
    ses.api('/api/painel?cmt=1', { method: 'POST', body: JSON.stringify({ acao: 'responder', id: id, texto: tx, manter: !!(f.elements.manter && f.elements.manter.checked), origem: 'extensao' }) }).then(function () {
      delete D.resp[id]; D.msg = 'Resposta enviada.'; lerDel(); return lerDil();
    }).catch(function (e) { if (bt) bt.disabled = false; D.msg = 'Não enviou: ' + (e.message || 'erro'); pintarDil(); });
  }

  /* ---------- Deliberações ---------- */
  var X = { quadro:'todas', aba: 'cronologia', categoriasFechadas:{}, dev: {}, dados: null, erro: '', msg: '', lendo: false, resp: {}, conf: {}, nota: {} };
  function lerDel() {
    if (!ses || !pode(quem())) return Promise.resolve();
    var usuario=quem().usuario;
    X.lendo = true; pintarGestao();
    return ses.api('/api/painel?cmt=1').then(function (j) { if(usuario!==quem().usuario||!pode(quem()))return; X.dados = j || {}; X.erro = ''; X.lendo = false; sincronizarLeitura(); badges(); pintarGestao(); })
      .catch(function (e) { if(usuario!==quem().usuario)return; X.erro = e.message || 'Não foi possível ler as notificações.'; X.lendo = false; pintarGestao(); });
  }
  function listas() {
    var j = X.dados || {};
    var as = ((j.assinar || {}).assinatura || []).filter(function(a){return a&&a.urg&&a.urg.tipo&&!/^Apreciada/i.test(String(a.urg.situacao||''));}).sort(function (a, b) { return String(a.desde || '').localeCompare(String(b.desde || '')); });
    var assinaturaCNJ=new Set(as.map(function(a){return String(a.cnj||'').replace(/\D/g,'');}));var pend=(j.urgencias||[]).filter(function(u){return u&&u.cnj&&!assinaturaCNJ.has(String(u.cnj).replace(/\D/g,''));});return { as: as, urg: pend, du: j.duvidas || [], pe: j.pedidos || [], so: (j.notificacoes || []).filter(function (n) { return n.tipo === 'sustentacao'; }) };
  }
  /* decisão submetida à assinatura (antes no sino › Desembargador): urgência em destaque e no topo */
  function itemAs(a) {
    var u = a.urg, ab = X.dev[a.cnj], ch = [];
    if (u) ch.push('<span class="gx-c gx-urgc" title="' + esc([u.situacao, u.obs].filter(Boolean).join(' · ')) + '">Urgência' + (u.tipo ? ' · ' + esc(u.tipo) : '') + (u.nivel ? ' · ' + esc(u.nivel) : '') + (u.espera != null ? ' · ' + u.espera + ' d' : '') + '</span>');
    if (a.tipoAto) ch.push('<span class="gx-c gx-tp">' + esc(a.tipoAto) + '</span>');
    if (a.meta) ch.push('<span class="gx-c">Meta</span>');
    if (a.prazo) ch.push('<span class="gx-c' + (a.prazo < hoje() ? ' venc' : '') + '">prazo ' + esc(data(a.prazo)) + '</span>');
    if (a.aguarda != null) ch.push('<span class="gx-c" title="Liberada em ' + esc(data(a.desde)) + '">' + (a.aguarda ? 'aguarda ' + a.aguarda + ' d' : 'liberada hoje') + '</span>');
    var caso = [a.classe, a.assunto].filter(Boolean).join(' · ');
    return '<article class="gx-it' + (u ? ' gx-urg' : '') + '" data-cnj="' + esc(a.cnj) + '"><div class="gx-h">' + copiaBtn(a.cnj) + ch.join('') + '</div>' +
      (a.titulo || a.topico ? '<p class="gx-tx"><b>' + esc(a.titulo || a.topico) + '</b></p>' : '') + (a.titulo && a.topico && a.topico !== a.titulo ? '<p class="gx-tx">' + esc(a.topico) + '</p>' : '') +
      (caso ? '<p class="gx-m">' + esc(caso) + '</p>' : '') + (a.partes ? '<p class="gx-m">' + esc(a.partes) + '</p>' : '') +
      (a.notaAtencao || a.atencao ? '<p class="gx-at"><b>Atenção do revisor:</b> ' + esc(a.notaAtencao || a.atencao) + '</p>' : '') + (a.obs ? '<p class="gx-m">' + esc(a.obs) + '</p>' : '') +
      '<p class="gx-m">' + [a.servidor ? 'Minuta: <b>' + esc(a.servidor) + '</b>' : '', a.corretor ? 'Correção: <b>' + esc(a.corretor) + '</b>' : '', a.desde ? 'liberada em ' + esc(data(a.desde)) : ''].filter(Boolean).join(' · ') + '</p>' +
      (ab ? '<form class="gx-f" data-gx-form="devolver" data-cnj="' + esc(a.cnj) + '"><textarea name="texto" rows="3" maxlength="2000" placeholder="O que ajustar antes da assinatura" required></textarea>' +
        '<label class="gx-et">Para <select name="para">' + [a.servidor, a.corretor].filter(Boolean).map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select></label>' +
        '<span class="gx-fb"><button type="button" class="lnk" data-gx-dev="' + esc(a.cnj) + '">cancelar</button><button type="submit" class="btn solid sm">Enviar devolutiva</button></span></form>'
        : '<div class="gx-ac"><span class="gx-bt"><button type="button" class="btn sm ok" data-gx-ass="' + esc(a.cnj) + '" title="Registra no app do gabinete que a decisão foi assinada (a assinatura em si é no PJe)">Marcar assinada</button><button type="button" class="btn sm" data-gx-dev="' + esc(a.cnj) + '">Devolver com apontamento</button></span></div>') + '</article>';
  }
  function itemUrg(a){var etapa=a.assinado?'Assinada · urgência ainda aberta':a.dataLiberacao?'Liberada · conferir situação':'';return '<article class="gx-it gx-urg hero-board-urg"><div class="gx-h"><b class="gx-t">'+esc(a.tipo||'Urgência')+'</b>'+(a.nivel?'<span class="gx-c gx-urgc">'+esc(a.nivel)+'</span>':'')+(a.espera!=null?'<span class="gx-c">'+esc(a.espera)+' d de espera</span>':'')+'</div><div class="hero-board-process">'+copiaBtn(a.cnj)+'<button type="button" class="gx-nav-action" data-gx-open="'+esc(a.cnj)+'" title="Abrir prontuário" aria-label="Abrir prontuário">↗</button></div><div class="hero-board-meta"><div><small>Minuta</small><b>'+esc(a.servidor||'—')+'</b></div><div><small>Correção</small><b>'+esc(a.corretor||'—')+'</b></div></div><p class="gx-m">'+[a.pedidoEm?'Pedido em '+data(a.pedidoEm):'',a.situacao,etapa].filter(Boolean).map(esc).join(' · ')+'</p>'+(a.obs?'<p class="gx-tx">'+esc(a.obs)+'</p>':'')+'</article>';}
  function itemDu(d) {
    var ab = X.resp[d.id];
    return '<article class="gx-it" data-id="' + esc(d.id) + '"><div class="gx-h"><b class="gx-t">' + esc(d.titulo || 'Dúvida') + '</b>' +
      (d.prioridade && d.prioridade !== 'Média' ? '<span class="gx-c u-' + esc(norm(d.prioridade)) + '">' + esc(d.prioridade) + '</span>' : '') +
      (d.prazo ? '<span class="gx-c' + (d.prazo < hoje() ? ' venc' : '') + '">até ' + esc(data(d.prazo)) + '</span>' : '') + '</div>' +
      '<p class="gx-m">' + [d.de ? 'De <b>' + esc(d.de) + '</b>' : '', diaMes(d.em), copiaBtn(d.numero)].filter(Boolean).join(' · ') + '</p>' +
      (d.texto ? '<p class="gx-tx">' + esc(d.texto) + '</p>' : '') + (d.resposta ? '<p class="gx-ob">Resposta anterior: ' + esc(d.resposta) + '</p>' : '') +
      (ab ? '<form class="gx-f" data-gx-form="responder" data-id="' + esc(d.id) + '"><textarea name="texto" rows="3" maxlength="2000" placeholder="Resposta a ' + esc(d.de || 'quem perguntou') + '" required></textarea>' +
        '<label class="gx-conc"><input type="checkbox" name="manter"> manter a dúvida aberta</label><span class="gx-fb"><button type="button" class="lnk" data-gx-resp="' + esc(d.id) + '">cancelar</button><button type="submit" class="btn solid sm">Responder</button></span></form>'
        : '<div class="gx-ac"><button type="button" class="btn sm" data-gx-resp="' + esc(d.id) + '">Responder</button></div>') + '</article>';
  }
  function itemPe(p) {
    var cf = X.conf[p.id], ret = p.tipo === 'retirada';
    return '<article class="gx-it" data-id="' + esc(p.id) + '"><div class="gx-h"><span class="gx-c gx-tp">' + (ret ? 'Retirada de pauta' : 'Adiamento') + '</span><b class="gx-t">' + esc(p.titulo || '') + '</b></div>' +
      '<p class="gx-m">' + [p.de ? 'De <b>' + esc(p.de) + '</b>' : '', p.sessao ? 'sessão de ' + esc(data(p.sessao)) : '', copiaBtn(p.numero), diaMes(p.em)].filter(Boolean).join(' · ') + '</p>' +
      (p.razao ? '<p class="gx-tx"><b>Razão:</b> ' + esc(p.razao) + '</p>' : '') + (p.texto ? '<p class="gx-tx">' + esc(p.texto) + '</p>' : '') +
      (p.resposta ? '<p class="gx-ob">Resposta anterior: ' + esc(p.resposta) + '</p>' : '') +
      '<textarea class="gx-nota" data-gx-nota="' + esc(p.id) + '" rows="2" maxlength="600" placeholder="Observação (opcional), vai na resposta">' + esc(X.nota[p.id] || '') + '</textarea>' +
      (cf ? '<div class="gx-ac gx-cf"><span>' + (cf === 'defere' ? 'Deferir' : 'Indeferir') + ' o pedido de ' + (ret ? 'retirada' : 'adiamento') + (p.numero ? ' de ' + esc(p.numero) : '') + '?' + (cf === 'defere' ? ' A pauta registra o item como ' + (ret ? 'Retirado' : 'Adiado') + '.' : '') + '</span>' +
        '<span><button type="button" class="lnk" data-gx-pe="cancelar" data-id="' + esc(p.id) + '">cancelar</button><button type="button" class="btn solid sm" data-gx-pe="confirmar" data-id="' + esc(p.id) + '">Confirmar</button></span></div>'
        : '<div class="gx-ac"><button type="button" class="btn sm ok" data-gx-pe="defere" data-id="' + esc(p.id) + '">Deferir</button><button type="button" class="btn sm" data-gx-pe="indefere" data-id="' + esc(p.id) + '">Indeferir</button></div>') + '</article>';
  }
  function indicadorSo(t){t=String(t||'');var v=/prefer/i.test(t)?['pref','Preferência']:/presenc/i.test(t)?['pres','Presencial']:/v[ií]deo|virtual/i.test(t)?['video','Videoconferência']:['neutro','Modalidade não informada'];return '<span class="gx-c hero-so-tipo" data-modal="'+v[0]+'" title="'+esc(t||'Modalidade não informada')+'">'+v[1]+'</span>';}
  function indicadorSessaoSo(d){return '<span class="gx-c hero-so-sessao" title="Sessão de julgamento">'+esc(d||'Sessão a definir')+'</span>';}
  function itemSo(s) {
    return '<article class="gx-it" data-id="' + esc(s.id) + '"><div class="gx-h hero-so-head">' + indicadorSo([s.modalidade,s.titulo,s.tipo].filter(Boolean).join(' · ')) + indicadorSessaoSo(s.sessao?data(s.sessao):'') +
      (s.aVincular ? '<span class="gx-c venc" title="Ainda sem item correspondente na pauta">a vincular</span>' : s.item ? '<span class="gx-c">item ' + esc(s.item) + '</span>' : '') + '</div>' +
      '<p class="gx-m">' + [copiaBtn(s.numero), s.em ? 'recebido em ' + esc(diaMes(s.em)) : ''].filter(Boolean).join(' · ') + '</p>' +
      ((s.advogado || s.parte) ? '<p class="gx-tx">' + [s.advogado ? esc(s.advogado) + (s.oab ? ' (OAB ' + esc(s.oab) + ')' : '') : '', s.parte ? 'por ' + esc(s.parte) : ''].filter(Boolean).join(', ') + '</p>' : '') + '</article>';
  }
  function grupoDel(t,L,fn,empty,tone){return '<section class="hero-gx-group" data-tone="'+esc(tone||'neutro')+'"><header><b>'+esc(t)+'</b><small>'+L.length+'</small></header>'+(L.length?L.map(fn).join(''):'<p class="muted gx-v">'+esc(empty)+'</p>')+'</section>';}
  function notificacoes(L){
    var pend=L.du.map(function(d){return {id:'du-'+d.id,tipo:'duvida',em:d.em,registro:d};})
      .concat(L.pe.map(function(p){return {id:'pe-'+p.id,tipo:'pedido',em:p.em,registro:p};}));
    var info=(((X.dados||{}).notificacoes)||[]).filter(function(n){return n&&n.tipo!=='duvida'&&n.tipo!=='pedido';});
    return pend.concat(info).sort(function(a,b){return String(b.em||'').localeCompare(String(a.em||''));});
  }
  function chaveLida(n){return String(n.id||[n.tipo,n.numero,n.titulo].join('|'))+'|'+String(n.em||'');}
  function leituraLocal(u){try{var v=JSON.parse(localStorage.getItem('hero-not-lidas:'+norm(u))||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch(e){return {};}}
  function leituraNot(){var m=Object.assign(Object.create(null),leituraLocal(quem().usuario));((X.dados||{}).notificacoesLidas||[]).forEach(function(k){m[k]=true;});return m;}
  var syncLeitura=false;
  function sincronizarLeitura(){
    var u=quem().usuario,rem=(X.dados||{}).notificacoesLidas;if(!Array.isArray(rem)||syncLeitura)return;
    var conhecidos=new Set(rem),local=leituraLocal(u),chaves=Object.keys(local).filter(function(k){return local[k]===true&&!conhecidos.has(k)&&k.length<=512;}).slice(0,200);
    if(!chaves.length)return;syncLeitura=true;
    post({acao:'notificacao-lida',chaves:chaves}).then(function(j){
      if(u!==quem().usuario||!X.dados)return;
      X.dados.notificacoesLidas=Array.from(new Set((X.dados.notificacoesLidas||[]).concat(j.lidas||[])));
      var m=leituraLocal(u);chaves.forEach(function(k){delete m[k];});try{localStorage.setItem('hero-not-lidas:'+norm(u),JSON.stringify(m));}catch(e){}
      badges();pintarDel();
    }).catch(function(){if(u===quem().usuario){X.msg='Leitura salva neste dispositivo; sincronização pendente.';pintarDel();}}).finally(function(){syncLeitura=false;});
  }
  function marcarNot(k){var u=quem().usuario,m=leituraLocal(u);m[k]=true;try{localStorage.setItem('hero-not-lidas:'+norm(u),JSON.stringify(m));}catch(e){X.msg='Não foi possível registrar a leitura neste dispositivo.';}badges();pintarDel();sincronizarLeitura();}
  function itemNot(n,lidas){
    var pend=n.tipo==='duvida'||n.tipo==='pedido',k=chaveLida(n);
    var base=pend?(n.tipo==='duvida'?itemDu(n.registro):itemPe(n.registro)):'';
    var titulo={comunicado:'Comunicado',aviso:'Aviso',sustentacao:'Sustentação / preferência',assinatura:'Assinatura',urgencia:'Urgência',sessao:'Sessão',pauta:'Pauta'}[n.tipo]||'Aviso';
    var cnj=n.numero||n.cnj||(n.registro||{}).numero||'';
    var acao='<div class="hero-not-actions">'+(cnj?'<button type="button" class="lnk" data-gx-open="'+esc(cnj)+'" title="Abrir prontuário" aria-label="Abrir prontuário">↗</button>':'')+(lidas[k]?'<small>Lida</small>':'<button type="button" class="lnk" data-gx-read="'+esc(k)+'">Marcar lida</button>')+'</div>';
    return '<div class="hero-not-entry'+(lidas[k]?' is-read':'')+'">'+(pend?base:'<article class="gx-it hero-not-item"><div class="hero-not-meta"><span>'+esc(titulo)+'</span><small>'+esc(diaMes(n.em))+'</small></div><b>'+esc(n.titulo||titulo)+'</b><p class="gx-m">'+[n.de?esc(n.de):'',copiaBtn(cnj),n.sessao?'Sessão '+esc(data(n.sessao)):'',n.item?'Item '+esc(n.item):'',n.aVincular?'A vincular':''].filter(Boolean).join(' · ')+'</p>'+(n.texto?'<details class="hero-not-detail"><summary>Detalhes</summary><p class="gx-tx">'+esc(n.texto)+'</p></details>':'')+((n.advogado||n.parte)?'<p class="gx-m">'+esc([n.advogado,n.oab?'OAB '+n.oab:'',n.parte].filter(Boolean).join(' · '))+'</p>':'')+'</article>')+acao+'</div>';
  }
  function categoriaNot(n){
    if(n.tipo==='duvida')return 'duvida';
    if(n.tipo==='pedido')return 'pedido';
    if(n.tipo==='sustentacao'||n.tipo==='preferencia')return 'sustentacao';
    if(n.tipo==='assinatura'||n.tipo==='liberacao')return 'assinatura';
    if(n.tipo==='urgencia')return 'urgencia';
    if(n.tipo==='sessao'||n.tipo==='pauta')return 'pauta';
    if(n.tipo==='comunicado'||n.tipo==='equipe')return 'comunicado';
    return 'aviso';
  }
  var NOT_CATS=[['duvida','Dúvidas'],['pedido','Solicitações'],['sustentacao','Sustentações e preferências'],['assinatura','Assinaturas e liberações'],['urgencia','Urgências'],['pauta','Pauta e sessões'],['comunicado','Comunicados'],['aviso','Outros avisos']];
  function agruparNot(N,lidas){
    return NOT_CATS.map(function(g){
      var V=N.filter(function(n){return categoriaNot(n)===g[0];});
      if(!V.length)return '';
      var nl=V.filter(function(n){return !lidas[chaveLida(n)];}).length;
      return '<details class="hero-not-group hero-gx-group" data-not-group="'+g[0]+'"'+(!X.categoriasFechadas[g[0]]?' open':'')+'><summary><b>'+esc(g[1])+'</b><small>'+V.length+(nl?' · '+nl+' não lidas':'')+'</small></summary>'+V.map(function(n){return itemNot(n,lidas);}).join('')+'</details>';
    }).join('');
  }
  function pintarDel() {
    var c=$('del-app');if(!c)return;var q=quem();
    var hero=document.body.classList.contains('hero-redesign-v53');if(!pode(q)&&!(hero&&q.on)){c.innerHTML='<p class="muted gx-v">Entre na sua conta para consultar notificações.</p>';return;}
    var L=pode(q)?listas():{du:[],pe:[]},N=pode(q)?notificacoes(L):[],lidas=leituraNot();
    var pend=L.du.length+L.pe.length;
    if(!['cronologia','categorias'].includes(X.aba))X.aba='cronologia';
    var tab=function(k,r){return '<button type="button" role="tab" data-gx-a="'+k+'" aria-selected="'+(X.aba===k)+'">'+esc(r)+'</button>';};
    var m=pode(q)&&X.dados?metricasCmt([['total','Não lidas',N.filter(function(n){return !lidas[chaveLida(n)];}).length],['priority','A deliberar',pend],['lib','Hoje',N.filter(function(n){return String(n.em||'').slice(0,10)===hoje();}).length]]):'';
    var dia=null,corpo=X.aba==='categorias'?agruparNot(N,lidas):N.map(function(n){var d=String(n.em||'').slice(0,10),h='';if(d!==dia){dia=d;h='<h4 class="hero-not-dia">'+esc(d===hoje()?'Hoje':data(d)||'Sem data')+'</h4>';}return h+itemNot(n,lidas);}).join('');
    var fontes=c.querySelector('#hero-not-local');if(fontes)fontes.remove();c.innerHTML=painelGestao('Notificações','', atualizaBtn('ler-del',X.lendo),m,'')+(pode(q)?faixaGestao('Notificações',tab('cronologia','Cronologia')+tab('categorias','Categorias'),'',X.lendo)+(X.msg?'<p class="gx-msg">'+esc(X.msg)+'</p>':'')+(X.erro?'<p class="gx-v err">'+esc(X.erro)+'</p>':!X.dados?'<p class="muted gx-v">Lendo…</p>':corpo||'<p class="muted gx-v">Nenhuma notificação nesta categoria.</p>'):'');if(hero){if(!fontes){fontes=document.createElement('section');fontes.id='hero-not-local';}c.append(fontes);if(window.MutaAlertas&&window.MutaAlertas.montarFontesNot)window.MutaAlertas.montarFontesNot(fontes);}
  }
  function urgEtapa(a){
    return a.assinado?'conferir':a.dataLiberacao?'assinar':a.dataCorrecao?'liberar':a.dataMinuta?'corrigir':a.servidor?'minuta':'designar';
  }
  function pintarUrg(){
    var c=$('urg-app');if(!c)return;var q=quem();
    if(!pode(q)){c.textContent='Acesso restrito ao Desembargador e ao gestor.';return;}
    var L=listas(),grupos=[['designar','A designar'],['minuta','Em minuta'],['corrigir','Em correção'],['liberar','A liberar'],['assinar','A assinar'],['conferir','A conferir']];
    var G=grupos.map(function(g){return [g[0],g[1],L.urg.filter(function(a){return urgEtapa(a)===g[0];}).map(function(a){return {registro:a,assinatura:false};}).concat(g[0]==='assinar'?L.as.map(function(a){return {registro:a,assinatura:true};}):[])];});
    var total=L.urg.length+L.as.length;
    var metUrg=metricasCmt([['total','Em aberto',total],['late','Sem responsável',G[0][2].length],['priority','Em produção',G[1][2].length+G[2][2].length],['lib','A liberar / assinar',G[3][2].length+G[4][2].length]]);
    var corpo=kanban(G,X.quadro,'urg',function(a){return a.assinatura?itemAs(a.registro):itemUrg(a.registro);});
    c.innerHTML=painelGestao('Urgências','',atualizaBtn('ler-del',X.lendo),X.dados?metUrg:'','')+(X.msg?'<p class="gx-msg">'+esc(X.msg)+'</p>':'')+(X.erro?'<p class="gx-v err">'+esc(X.erro)+'</p>':!X.dados?'<p class="muted gx-v">Lendo…</p>':corpo);
  }
  function pintarGab(){
    var c=$('gab-app');if(!c)return;if(!pode(quem())){c.textContent='Acesso restrito ao Desembargador e ao gestor.';return;}
    var j=X.dados||{},hj=j.hoje||hoje();
    function sec(t,arr,render){return '<section class="hero-gx-group"><header><b>'+esc(t)+'</b><small>'+arr.length+'</small></header>'+(arr.length?arr.map(render).join(''):'<p class="muted gx-v">Nenhum registro.</p>')+'</section>';}
    var sessoes=(j.agenda||[]).filter(function(a){return a.date>=hj;}).slice(0,5);
    var nomes={pautarAte:'Peço dia',inicioPreparacao:'Preparação',entregaMinutas:'Minutas',liberacao:'Liberação'};
    var agenda=sec('Próximas sessões',sessoes,function(a){return '<article class="gx-it"><div class="gx-h"><b>'+esc(data(a.date))+'</b><span class="gx-c">'+esc(a.hora||'')+'</span><span class="gx-c">'+esc(a.publicada?'Publicada':'Marcos')+'</span></div><p class="gx-m">'+esc(a.processos||0)+' processos</p><div class="hero-gab-marcos">'+Object.keys(nomes).filter(function(k){return (a.marcos||{})[k];}).map(function(k){return '<span>'+esc(nomes[k])+' <b>'+esc(data(a.marcos[k]))+'</b></span>';}).join('')+'</div></article>';});
    var prazos=sec('Próximos marcos',(j.prazos||[]).slice(0,12),function(a){return '<article class="gx-it"><div class="gx-h"><b>'+esc(a.marco)+'</b><span class="gx-c">'+esc(data(a.data))+'</span></div><p class="gx-m">Sessão '+esc(data(a.sessao))+'</p></article>';});
    var eq=Array.isArray(j.equipe)?j.equipe:[];
    var equipe=sec('Produção da equipe',eq,function(a){return '<article class="gx-it"><div class="gx-h"><b>'+esc(a.nome)+'</b></div><p class="gx-m">Minutas '+esc(a.minutasFeitas||0)+' / '+esc(a.minutas||0)+' · Correções '+esc(a.correcoesFeitas||0)+' / '+esc(a.correcoes||0)+'</p></article>';});
    var aus=sec('Ausências pendentes',j.ausencias||[],function(a){return '<article class="gx-it"><div class="gx-h"><b>'+esc(a.nome)+'</b><span class="gx-c">'+esc(a.tipo)+'</span></div><p class="gx-m">'+esc(data(a.de))+' — '+esc(data(a.ate))+'</p></article>';});
    var comunicados=sec('Comunicados',j.comunicados||[],function(a){return '<article class="gx-it"><b>'+esc(a.titulo||'Comunicado')+'</b><p class="gx-tx">'+esc(a.texto||'')+'</p></article>';});
    c.innerHTML='<div class="gx-top"><div><b>Gabinete</b><small>Calendário, equipe e comunicados</small></div><button type="button" class="lnk" data-gx="ler-del">Atualizar</button></div>'+(X.erro?'<p class="gx-v err">'+esc(X.erro)+'</p>':!X.dados?'<p class="muted gx-v">Lendo…</p>':agenda+prazos+equipe+aus+comunicados);
  }
  function pintarGestao(){pintarDel();pintarUrg();pintarGab();if(window.MutaPauta&&window.MutaPauta.atualizarGestao)window.MutaPauta.atualizarGestao();}
  /* Mesmos registros e ações das Notificações, com escopo da sessão selecionada. */
  function pautaPendencias(sessao,itens,internas){
    if(!pode(quem())||!X.dados||!sessao)return {duvidas:[],pedidos:[],erro:pode(quem())?X.erro:''};
    var L=listas(),cnjs=new Set((itens||[]).map(function(i){return dg(i.cnj);}).filter(Boolean));
    var ids=new Set((internas||[]).filter(function(i){return i.origem==='Deliberações'||i.origem==='Notificações';}).map(function(i){return String(i.id);}));
    return {duvidas:L.du.filter(function(d){return cnjs.has(dg(d.numero));}),pedidos:L.pe.filter(function(p){return p.sessao?p.sessao===sessao:ids.has(String(p.id));}),erro:X.erro};
  }
  function pautaCard(tipo,r){return tipo==='duvida'?itemDu(r):itemPe(r);}
  function pautaContexto(bt,p){
    var host=bt&&bt.closest('#pauta-app');
    if(!host||!window.MutaPauta||!window.MutaPauta.contextoGestao)return null;
    return window.MutaPauta.contextoGestao(p);
  }
  function post(corpo) { return ses.api('/api/painel?cmt=1', { method: 'POST', body: JSON.stringify(Object.assign({ origem: 'extensao' }, corpo)) }); }
  /* observação gravada na pauta junto com a situação, como no painel /cmt (cmtNotaSit) */
  function notaSit(p,ctx) {
    var j = X.dados || {}, it = (((j.pauta || {}).itens) || []).filter(function (x) { return dg(x.cnj) === dg(p.numero); })[0] || {};
    var nota = (p.tipo === 'retirada' ? 'Retirado de pauta' : 'Adiado') + ' em ' + data(j.hoje || hoje()) + ' por decisão do relator' + (p.de ? ', a pedido de ' + p.de : '') + '.';
    var o = String(ctx&&ctx.item?ctx.item.obs||'':it.obs || '').trim();
    return !o ? nota : o.indexOf(nota) >= 0 ? o : o + ' · ' + nota;
  }
  function decidir(id, bt) {
    var p = listas().pe.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    var defere = X.conf[id] === 'defere', ret = p.tipo === 'retirada';
    var ctx=pautaContexto(bt,p),ses0=p.sessao||(ctx&&ctx.sessao)||((X.dados||{}).pauta||{}).date||'';
    var nota = String(X.nota[id] || '').trim();
    var texto = (ret ? 'Retirada ' + (defere ? 'deferida.' : 'indeferida.') : 'Adiamento ' + (defere ? 'deferido.' : 'indeferido.')) + (nota ? ' ' + nota : '');
    if (defere && !ses0) { X.msg = 'Não deferiu: o pedido não indica a sessão.'; pintarGestao(); return; }
    if (bt) bt.disabled = true;
    (defere ? post({ acao: 'situacao', sessao: ses0, cnj: p.numero, valor: ret ? 'Retirado' : 'Adiado', obs: notaSit(p,ctx) }) : Promise.resolve())
      .then(function () { return post({ acao: 'responder', id: id, texto: texto }); })
      .then(function () { delete X.conf[id]; delete X.nota[id]; X.msg = defere ? 'Pedido deferido e registrado na pauta. Cópia ao gestor.' : 'Pedido indeferido.'; if(window.MutaPauta&&window.MutaPauta.relerGestao)window.MutaPauta.relerGestao(); return lerDel(); })
      .catch(function (e) { if (bt) bt.disabled = false; X.msg = 'Não concluiu: ' + (e.message || 'erro'); pintarGestao(); });
  }
  function assinar(cnj, bt) {
    if (bt) bt.disabled = true;
    post({ acao: 'assinar', cnj: cnj }).then(function () { X.msg = 'Assinatura registrada no app · ' + cnj + '.'; return lerDel(); })
      .catch(function (e) { if (bt) bt.disabled = false; X.msg = 'Não registrou: ' + (e.message || 'erro'); pintarGestao(); });
  }
  function devolver(f) {
    var cnj = f.getAttribute('data-cnj'), t = String(f.elements.texto.value || '').trim(); if (!t) return;
    var bt = f.querySelector('[type=submit]'); if (bt) bt.disabled = true;
    post({ acao: 'devolver', cnj: cnj, texto: t, para: f.elements.para ? f.elements.para.value : '' }).then(function () {
      delete X.dev[cnj]; X.msg = 'Devolutiva enviada (vira diligência para ' + (f.elements.para ? f.elements.para.value : 'a equipe') + ').'; lerDil(); return lerDel();
    }).catch(function (e) { if (bt) bt.disabled = false; X.msg = 'Não enviou: ' + (e.message || 'erro'); pintarGestao(); });
  }
  function responder(f) {
    var id = f.getAttribute('data-id'), t = String(f.elements.texto.value || '').trim(); if (!t) return;
    var bt = f.querySelector('[type=submit]'); if (bt) bt.disabled = true;
    post({ acao: 'responder', id: id, texto: t, manter: !!(f.elements.manter && f.elements.manter.checked) }).then(function () {
      delete X.resp[id]; X.msg = 'Resposta enviada.'; return lerDel();
    }).catch(function (e) { if (bt) bt.disabled = false; X.msg = 'Não enviou: ' + (e.message || 'erro'); pintarGestao(); });
  }

  /* ---------- contadores nas abas ---------- */
  function badges() {
    var b1 = $('dil-badge'), b2 = $('del-badge'), b3=$('urg-badge');
    if (b1) { var n1 = D.lista ? abertasComigo().length : 0; b1.hidden = !n1; b1.textContent = n1 ? String(n1) : ''; b1.title = n1 ? n1 + ' diligência(s) com você' : ''; }
    if (b2) { var L=listas(),lidas=leituraNot(),n2=X.dados?notificacoes(L).filter(function(n){return !lidas[chaveLida(n)];}).length:0; b2.hidden=!n2;b2.textContent=n2?String(n2):'';b2.title=n2+' notificações não lidas'; }
    if(b3){var u=X.dados?listas():{as:[],urg:[]},n3=u.as.length+u.urg.length;b3.hidden=!n3;b3.textContent=n3?String(n3):'';b3.title=n3+' urgências em aberto';}
  }

  /* ---------- eventos ---------- */
  function copiar(x) { var t = x.getAttribute('data-gx-copia'); try { navigator.clipboard.writeText(t).then(function () { var o = x.textContent; x.textContent = 'Copiado'; setTimeout(function () { x.textContent = o; }, 1000); }); } catch (e) {} }
  function ligar() {
    var cd = $('dil-app'), cu=$('urg-app'), cg=$('gab-app'), cx = $('del-app');
    if (cd) {
      cd.addEventListener('click', function (e) {
        var x = e.target.closest('button'); if (!x) return;
        if (x.hasAttribute('data-gx-copia')) return copiar(x);
        if(x.dataset.gxBoard){D.quadro=x.dataset.gxBoard.split(':')[1];return pintarDil();}
        if (x.dataset.gxF) { D.f = x.dataset.gxF; D.msg = ''; return pintarDil(); }
        if (x.dataset.gxMais) { D.abertos[x.dataset.gxMais] = !D.abertos[x.dataset.gxMais]; return pintarDil(); }
        if (x.dataset.gx === 'nova') { D.nova = true; D.msg = ''; pintarDil(); var t = cd.querySelector('[name=title]'); if (t) t.focus(); return; }
        if (x.dataset.gx === 'cancelar-nova') { D.nova = false; return pintarDil(); }
        if (x.dataset.gx === 'cancelar-ed') { delete D.ed[x.dataset.id]; return pintarDil(); }
        if (x.dataset.gxEd) { D.ed[x.dataset.gxEd] = true; D.msg = ''; return pintarDil(); }
        if (x.dataset.gxExc) { D.exc[x.dataset.gxExc] = !D.exc[x.dataset.gxExc]; return pintarDil(); }
        if (x.dataset.gxExcok) return excluir(x.dataset.gxExcok, x);
        if (x.dataset.gxDr) { D.resp[x.dataset.gxDr] = !D.resp[x.dataset.gxDr]; pintarDil(); var ta = cd.querySelector('[data-gx-form="dresp"][data-id="' + x.dataset.gxDr + '"] textarea'); if (ta) ta.focus(); return; }
        if (x.dataset.gx === 'ler-dil') { D.msg = ''; return lerDil(); }
      });
      cd.addEventListener('change', function (e) {
        var i = e.target;
        if(i.dataset.gxFilter){D[i.dataset.gxFilter]=i.value;return pintarDil();}
        if (i.dataset.gxEtapa) return etapa(i.dataset.gxEtapa, i.value, i);
      });
      /* seção aberta ou fechada: a escolha sobrevive ao redesenho */
      cd.addEventListener('toggle', function (e) { var d = e.target; if(d&&d.classList&&d.classList.contains('hero-gestao-filter'))D.filtrosAbertos=d.open;else if (d && d.classList && d.classList.contains('gx-fase')) D.fase[d.getAttribute('data-fase')] = d.open; }, true);
      cd.addEventListener('submit', function (e) {
        var f = e.target.closest('[data-gx-form]'); if (!f) return; e.preventDefault();
        var k = f.getAttribute('data-gx-form'); if (k === 'nova') criar(f); else if (k === 'editar') editar(f); else if (k === 'dresp') responderDil(f);
      });
    }
    [cx,cu,cg,$('pauta-app')].filter(Boolean).forEach(function(cx){
      cx.addEventListener('click', function (e) {
        var x = e.target.closest('button'); if (!x) return;
        if (x.hasAttribute('data-gx-copia')) return copiar(x);
        if(x.dataset.gxBoard){X.quadro=x.dataset.gxBoard.split(':')[1];return pintarUrg();}
        if(x.dataset.gxRead)return marcarNot(x.dataset.gxRead);
        if(x.dataset.gxOpen){var BR=window.MutaProntuarioBridge;if(window.MutaAbas)window.MutaAbas.ir('pront');if(BR&&BR.abrirProcesso)BR.abrirProcesso(x.dataset.gxOpen);return;}
        if (x.dataset.gxA) { X.aba = x.dataset.gxA; X.msg = ''; return pintarGestao(); }
        if (x.dataset.gx === 'ler-del') { X.msg = ''; if(window.MutaAlertas&&window.MutaAlertas.lerFontesNot)window.MutaAlertas.lerFontesNot();return lerDel(); }
        if (x.dataset.gxResp) { X.resp[x.dataset.gxResp] = !X.resp[x.dataset.gxResp]; pintarGestao(); var ta = cx.querySelector('[data-gx-form="responder"][data-id="' + x.dataset.gxResp + '"] textarea'); if (ta) ta.focus(); return; }
        if (x.dataset.gxAss) return assinar(x.dataset.gxAss, x);
        if (x.dataset.gxDev) { X.dev[x.dataset.gxDev] = !X.dev[x.dataset.gxDev]; pintarGestao(); var td = cx.querySelector('[data-gx-form="devolver"] textarea'); if (td) td.focus(); return; }
        var pe = x.dataset.gxPe, id = x.dataset.id;
        if (pe === 'defere' || pe === 'indefere') { X.conf[id] = pe; return pintarGestao(); }
        if (pe === 'cancelar') { delete X.conf[id]; return pintarGestao(); }
        if (pe === 'confirmar') return decidir(id, x);
      });
      cx.addEventListener('toggle',function(e){var d=e.target;if(d&&d.dataset&&d.dataset.notGroup&&d.isConnected)X.categoriasFechadas[d.dataset.notGroup]=!d.open;},true);
      cx.addEventListener('input', function (e) { var i = e.target; if (i.dataset.gxNota) X.nota[i.dataset.gxNota] = i.value; });
      cx.addEventListener('submit', function (e) {
        var f = e.target.closest('[data-gx-form]'); if (!f||!pode(quem())) return; e.preventDefault();
        if (f.getAttribute('data-gx-form') === 'devolver') devolver(f); else responder(f);
      });
    });
    /* teclas digitadas nas abas não chegam a atalhos do painel */
    [cd, cx, cu, cg].forEach(function (el) { if (el) el.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
  }
  function abrir(n) {
    if (n === 'dil') { pintarDil(); lerDil(); }
    if (n === 'del'||n==='urg') { pintarGestao(); lerDel();if(n==='del'&&window.MutaAlertas&&window.MutaAlertas.lerFontesNot)window.MutaAlertas.lerFontesNot(); }
  }
  function iniciar() {
    ligar(); mostrar();
    if (ses && ses.ouvir) ses.ouvir(function () { D.lista = null; X.dados = null; mostrar(); badges(); pintarDil(); pintarGestao(); });
    /* a cada 3 minutos, enquanto o painel está aberto, os contadores se renovam */
    setInterval(function () { if (pode(quem()) && document.visibilityState === 'visible') { lerDil(); lerDel(); } }, 3 * 60e3);
  }
  window.MutaGestao = { naoLidas:function(){var m=leituraNot();return X.dados?notificacoes(listas()).filter(function(n){return !m[chaveLida(n)];}).length:null;}, abrir: abrir, mostrar: mostrar, pautaPendencias:pautaPendencias,pautaCard:pautaCard, _D: D, _X: X };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
