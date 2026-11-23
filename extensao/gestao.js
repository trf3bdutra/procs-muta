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

  /* ---------- visibilidade das abas ---------- */
  function mostrar() {
    var q = quem(), dil = $('tab-dil'), del = $('tab-del'), ctl = $('tab-ctl');
    var ver = { dil: pode(q), del: pode(q), ctl: q.on && q.gestor };
    [[dil, ver.dil], [del, ver.del], [ctl, ver.ctl]].forEach(function (p) {
      if (!p[0]) return;
      p[0].hidden = !p[1];
      if (!p[1] && p[0].getAttribute('aria-selected') === 'true' && window.MutaAbas) window.MutaAbas.ir('pront');
    });
    if (pode(q)) { if (!D.lista && !D.lendo) lerDil(); if (!X.dados && !X.lendo) lerDel(); }
  }

  /* ---------- Diligências ---------- */
  var ETAPAS = [['todo', 'A fazer'], ['doing', 'Em andamento'], ['review', 'Em revisão'], ['done', 'Concluída']];
  var NOME_ET = {}; ETAPAS.forEach(function (e) { NOME_ET[e[0]] = e[1]; });
  var URG = ['Urgente', 'Alta', 'Média', 'Baixa'];
  var D = { f: 'comigo', conc: false, nova: false, lista: null, equipe: [], erro: '', msg: '', lendo: false, abertos: {}, ed: {}, exc: {}, resp: {} };
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
    return '<article class="gx-it' + (venc ? ' venc' : '') + (t.stage === 'done' ? ' feita' : '') + '" data-id="' + esc(t.id) + '">' +
      '<div class="gx-h"><b class="gx-t">' + esc(t.title || 'Diligência') + '</b>' +
      (t.urgency && t.urgency !== 'Média' ? '<span class="gx-c u-' + esc(norm(t.urgency)) + '">' + esc(t.urgency) + '</span>' : '') +
      (t.dueDate ? '<span class="gx-c' + (venc ? ' venc' : '') + '" title="Prazo">até ' + esc(data(t.dueDate)) + '</span>' : '') + '</div>' +
      '<p class="gx-m">' + [t.assignee ? 'Para <b>' + esc(t.assignee) + '</b>' : 'Sem destinatário', t.creator ? 'de ' + esc(t.creator) : '', t.numero ? copiaBtn(t.numero) : '', t.sessao ? 'sessão de ' + esc(data(t.sessao)) : ''].filter(Boolean).join(' · ') + '</p>' +
      (desc ? '<p class="gx-tx">' + esc(longa && !ab ? desc.slice(0, 220) + '…' : desc) + (longa ? ' <button type="button" class="lnk" data-gx-mais="' + esc(t.id) + '">' + (ab ? 'menos' : 'ler tudo') + '</button>' : '') + '</p>' : '') +
      (t.resposta ? '<p class="gx-ob">Resposta' + (t.respondidoPor ? ' de ' + esc(t.respondidoPor) : '') + ': ' + esc(t.resposta) + '</p>' : '') +
      '<div class="gx-ac"><label class="gx-et">Etapa <select data-gx-etapa="' + esc(t.id) + '">' + ETAPAS.map(function (e) { return '<option value="' + e[0] + '"' + (e[0] === (t.stage || 'todo') ? ' selected' : '') + '>' + e[1] + '</option>'; }).join('') + '</select></label>' +
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
  function pintarDil() {
    var c = $('dil-app'); if (!c) return;
    var q = quem();
    if (!pode(q)) { c.innerHTML = '<p class="muted gx-v">' + (q.on ? 'As Diligências são do Desembargador e do gestor.' : 'Entre no painel para ver as diligências.') + '</p>'; return; }
    var L = (D.lista || []).filter(function (t) { return D.conc || t.stage !== 'done'; });
    var n = { comigo: 0, criei: 0, todas: 0 };
    L.forEach(function (t) { n.todas++; if (filtro(t, 'comigo', q.usuario)) n.comigo++; if (filtro(t, 'criei', q.usuario)) n.criei++; });
    var V = L.filter(function (t) { return filtro(t, D.f, q.usuario); }).sort(ordem);
    var tab = function (k, r) { return '<button type="button" role="tab" data-gx-f="' + k + '" aria-selected="' + (D.f === k) + '">' + r + ' <i>' + n[k] + '</i></button>'; };
    c.innerHTML = '<div class="gx-top"><div><b>Diligências</b><small class="muted">quadro da equipe no Ex Officio</small></div>' +
      '<span><button type="button" class="btn sm" data-gx="nova"' + (D.nova ? ' hidden' : '') + '>+ Nova</button><button type="button" class="lnk" data-gx="ler-dil" title="Ler de novo">' + (D.lendo ? 'lendo…' : 'atualizar') + '</button>' +
      '<a class="lnk" target="_blank" rel="noopener" href="' + esc(site()) + (q.des && !q.gestor ? '/cmt/' : '/exofficio/#pendencias') + '">abrir no Ex Officio</a></span></div>' +
      (D.nova ? formDil() : '') +
      '<div class="seg pmodos gx-modos" role="tablist" aria-label="Filtro das diligências">' + tab('comigo', 'Comigo') + tab('criei', 'Que criei') + tab('todas', 'Todas') + '</div>' +
      '<label class="gx-conc"><input type="checkbox" data-gx-conc' + (D.conc ? ' checked' : '') + '> mostrar as concluídas</label>' +
      (D.msg ? '<p class="gx-msg' + (/^Não|erro/i.test(D.msg) ? ' err' : '') + '">' + esc(D.msg) + '</p>' : '') +
      (D.erro ? '<p class="gx-v err">' + esc(D.erro) + '</p>' : !D.lista ? '<p class="muted gx-v">Lendo o quadro…</p>' :
        V.length ? V.map(itemDil).join('') : '<p class="muted gx-v">Nenhuma diligência ' + (D.f === 'comigo' ? 'com você' : D.f === 'criei' ? 'criada por você' : 'em aberto') + '.</p>');
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
  var X = { aba: 'du', dados: null, erro: '', msg: '', lendo: false, resp: {}, conf: {}, nota: {} };
  function lerDel() {
    if (!ses || !pode(quem())) return Promise.resolve();
    X.lendo = true; pintarDel();
    return ses.api('/api/painel?cmt=1').then(function (j) { X.dados = j || {}; X.erro = ''; X.lendo = false; badges(); pintarDel(); })
      .catch(function (e) { X.erro = e.message || 'Não foi possível ler as deliberações.'; X.lendo = false; pintarDel(); });
  }
  function listas() {
    var j = X.dados || {};
    return { du: j.duvidas || [], pe: j.pedidos || [], so: (j.notificacoes || []).filter(function (n) { return n.tipo === 'sustentacao'; }) };
  }
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
  function itemSo(s) {
    return '<article class="gx-it" data-id="' + esc(s.id) + '"><div class="gx-h"><b class="gx-t">' + esc(String(s.titulo || '').replace(/ · a vincular$/, '')) + '</b>' +
      (s.aVincular ? '<span class="gx-c venc" title="Ainda sem item correspondente na pauta">a vincular</span>' : s.item ? '<span class="gx-c">item ' + esc(s.item) + '</span>' : '') + '</div>' +
      '<p class="gx-m">' + [copiaBtn(s.numero), s.sessao ? 'sessão de ' + esc(data(s.sessao)) : '', s.em ? 'recebido em ' + esc(diaMes(s.em)) : ''].filter(Boolean).join(' · ') + '</p>' +
      ((s.advogado || s.parte) ? '<p class="gx-tx">' + [s.advogado ? esc(s.advogado) + (s.oab ? ' (OAB ' + esc(s.oab) + ')' : '') : '', s.parte ? 'por ' + esc(s.parte) : ''].filter(Boolean).join(', ') + '</p>' : '') + '</article>';
  }
  function pintarDel() {
    var c = $('del-app'); if (!c) return;
    var q = quem();
    if (!pode(q)) { c.innerHTML = '<p class="muted gx-v">' + (q.on ? 'As Deliberações são do Desembargador e do gestor.' : 'Entre no painel para ver as deliberações.') + '</p>'; return; }
    var L = listas();
    var tab = function (k, r, d) { return '<button type="button" role="tab" data-gx-a="' + k + '" aria-selected="' + (X.aba === k) + '">' + r + ' <i>' + L[k].length + '</i><small>' + d + '</small></button>'; };
    var corpo = X.aba === 'pe' ? (L.pe.length ? L.pe.map(itemPe).join('') : '<p class="muted gx-v">Nenhum pedido de retirada ou de adiamento em aberto.</p>')
      : X.aba === 'so' ? (L.so.length ? L.so.map(itemSo).join('') : '<p class="muted gx-v">Nenhum pedido de sustentação oral ou de preferência recebido para as próximas sessões.</p>')
      : (L.du.length ? L.du.map(itemDu).join('') : '<p class="muted gx-v">Nenhuma dúvida em aberto dirigida a você.</p>');
    c.innerHTML = '<div class="gx-top"><div><b>Deliberações</b><small class="muted">o que aguarda decisão' + (X.dados && X.dados.hoje ? ' · ' + esc(data(X.dados.hoje)) : '') + '</small></div>' +
      '<span><button type="button" class="lnk" data-gx="ler-del">' + (X.lendo ? 'lendo…' : 'atualizar') + '</button><a class="lnk" target="_blank" rel="noopener" href="' + esc(site()) + '/cmt/">painel do Desembargador</a></span></div>' +
      '<div class="seg pmodos gx-modos" role="tablist" aria-label="Tipo de deliberação">' + tab('du', 'Dúvidas', 'da equipe') + tab('pe', 'Pauta', 'retirada e adiamento') + tab('so', 'Sustentação', 'oral e preferência') + '</div>' +
      (X.msg ? '<p class="gx-msg' + (/^Não/.test(X.msg) ? ' err' : '') + '">' + esc(X.msg) + '</p>' : '') +
      (X.erro ? '<p class="gx-v err">' + esc(X.erro) + '</p>' : !X.dados ? '<p class="muted gx-v">Lendo…</p>' : corpo);
  }
  function post(corpo) { return ses.api('/api/painel?cmt=1', { method: 'POST', body: JSON.stringify(Object.assign({ origem: 'extensao' }, corpo)) }); }
  /* observação gravada na pauta junto com a situação, como no painel /cmt (cmtNotaSit) */
  function notaSit(p) {
    var j = X.dados || {}, it = (((j.pauta || {}).itens) || []).filter(function (x) { return dg(x.cnj) === dg(p.numero); })[0] || {};
    var nota = (p.tipo === 'retirada' ? 'Retirado de pauta' : 'Adiado') + ' em ' + data(j.hoje || hoje()) + ' por decisão do relator' + (p.de ? ', a pedido de ' + p.de : '') + '.';
    var o = String(it.obs || '').trim();
    return !o ? nota : o.indexOf(nota) >= 0 ? o : o + ' · ' + nota;
  }
  function decidir(id, bt) {
    var p = listas().pe.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    var defere = X.conf[id] === 'defere', ret = p.tipo === 'retirada';
    var ses0 = p.sessao || ((X.dados || {}).pauta || {}).date || '';
    var nota = String(X.nota[id] || '').trim();
    var texto = (ret ? 'Retirada ' + (defere ? 'deferida.' : 'indeferida.') : 'Adiamento ' + (defere ? 'deferido.' : 'indeferido.')) + (nota ? ' ' + nota : '');
    if (defere && !ses0) { X.msg = 'Não deferiu: o pedido não indica a sessão.'; pintarDel(); return; }
    if (bt) bt.disabled = true;
    (defere ? post({ acao: 'situacao', sessao: ses0, cnj: p.numero, valor: ret ? 'Retirado' : 'Adiado', obs: notaSit(p) }) : Promise.resolve())
      .then(function () { return post({ acao: 'responder', id: id, texto: texto }); })
      .then(function () { delete X.conf[id]; delete X.nota[id]; X.msg = defere ? 'Pedido deferido e registrado na pauta. Cópia ao gestor.' : 'Pedido indeferido.'; return lerDel(); })
      .catch(function (e) { if (bt) bt.disabled = false; X.msg = 'Não concluiu: ' + (e.message || 'erro'); pintarDel(); });
  }
  function responder(f) {
    var id = f.getAttribute('data-id'), t = String(f.elements.texto.value || '').trim(); if (!t) return;
    var bt = f.querySelector('[type=submit]'); if (bt) bt.disabled = true;
    post({ acao: 'responder', id: id, texto: t, manter: !!(f.elements.manter && f.elements.manter.checked) }).then(function () {
      delete X.resp[id]; X.msg = 'Resposta enviada.'; return lerDel();
    }).catch(function (e) { if (bt) bt.disabled = false; X.msg = 'Não enviou: ' + (e.message || 'erro'); pintarDel(); });
  }

  /* ---------- contadores nas abas ---------- */
  function badges() {
    var b1 = $('dil-badge'), b2 = $('del-badge');
    if (b1) { var n1 = D.lista ? abertasComigo().length : 0; b1.hidden = !n1; b1.textContent = n1 ? String(n1) : ''; b1.title = n1 ? n1 + ' diligência(s) com você' : ''; }
    if (b2) { var L = X.dados ? listas() : { du: [], pe: [], so: [] }, n2 = L.du.length + L.pe.length + L.so.filter(function (s) { return s.aVincular; }).length; b2.hidden = !n2; b2.textContent = n2 ? String(n2) : ''; b2.title = n2 ? n2 + ' aguardando decisão' : ''; }
  }

  /* ---------- eventos ---------- */
  function copiar(x) { var t = x.getAttribute('data-gx-copia'); try { navigator.clipboard.writeText(t).then(function () { var o = x.textContent; x.textContent = 'Copiado'; setTimeout(function () { x.textContent = o; }, 1000); }); } catch (e) {} }
  function ligar() {
    var cd = $('dil-app'), cx = $('del-app');
    if (cd) {
      cd.addEventListener('click', function (e) {
        var x = e.target.closest('button'); if (!x) return;
        if (x.hasAttribute('data-gx-copia')) return copiar(x);
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
        if (i.hasAttribute('data-gx-conc')) { D.conc = i.checked; return pintarDil(); }
        if (i.dataset.gxEtapa) return etapa(i.dataset.gxEtapa, i.value, i);
      });
      cd.addEventListener('submit', function (e) {
        var f = e.target.closest('[data-gx-form]'); if (!f) return; e.preventDefault();
        var k = f.getAttribute('data-gx-form'); if (k === 'nova') criar(f); else if (k === 'editar') editar(f); else if (k === 'dresp') responderDil(f);
      });
    }
    if (cx) {
      cx.addEventListener('click', function (e) {
        var x = e.target.closest('button'); if (!x) return;
        if (x.hasAttribute('data-gx-copia')) return copiar(x);
        if (x.dataset.gxA) { X.aba = x.dataset.gxA; X.msg = ''; return pintarDel(); }
        if (x.dataset.gx === 'ler-del') { X.msg = ''; return lerDel(); }
        if (x.dataset.gxResp) { X.resp[x.dataset.gxResp] = !X.resp[x.dataset.gxResp]; pintarDel(); var ta = cx.querySelector('[data-gx-form="responder"][data-id="' + x.dataset.gxResp + '"] textarea'); if (ta) ta.focus(); return; }
        var pe = x.dataset.gxPe, id = x.dataset.id;
        if (pe === 'defere' || pe === 'indefere') { X.conf[id] = pe; return pintarDel(); }
        if (pe === 'cancelar') { delete X.conf[id]; return pintarDel(); }
        if (pe === 'confirmar') return decidir(id, x);
      });
      cx.addEventListener('input', function (e) { var i = e.target; if (i.dataset.gxNota) X.nota[i.dataset.gxNota] = i.value; });
      cx.addEventListener('submit', function (e) { var f = e.target.closest('[data-gx-form="responder"]'); if (!f) return; e.preventDefault(); responder(f); });
    }
    /* teclas digitadas nas abas não chegam a atalhos do painel */
    [cd, cx].forEach(function (el) { if (el) el.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
  }
  function abrir(n) {
    if (n === 'dil') { pintarDil(); lerDil(); }
    if (n === 'del') { pintarDel(); lerDel(); }
  }
  function iniciar() {
    ligar(); mostrar();
    if (ses && ses.ouvir) ses.ouvir(function () { D.lista = null; X.dados = null; mostrar(); badges(); pintarDil(); pintarDel(); });
    /* a cada 3 minutos, enquanto o painel está aberto, os contadores se renovam */
    setInterval(function () { if (pode(quem()) && document.visibilityState === 'visible') { lerDil(); lerDel(); } }, 3 * 60e3);
  }
  window.MutaGestao = { abrir: abrir, mostrar: mostrar, _D: D, _X: X };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
