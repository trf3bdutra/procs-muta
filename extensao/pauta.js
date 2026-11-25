/* HERO18810 0.58 · aba Pauta
   - Processo em tela: situação de julgamento, remarcação, sustentação/preferência (editáveis, gravam na ficha) e o histórico de pautas;
   - Pautas do Ex Officio: seletor das sessões (/api/sessoes) e a lista de processos da sessão (/api/pauta?data=), com a etapa
     (designado → minutado → corrigido → liberado; retirado, adiado ou julgado) e os alertas do cartão (intercorrência, pendências,
     avisos, sustentação/preferência). Clicar no processo abre o prontuário dele;
   - Sustentação oral e preferência: os pedidos recebidos (/api/sessoes?pedidos=1), divididos por sessão (antes em Deliberações).
   Nada é gravado no PJe. */
(function () {
  'use strict';
  var ses = window.MutaSessao;
  var $ = function (id) { return document.getElementById(id); };
  var S = function (v) { return v == null ? '' : String(v).trim(); };
  var esc = function (s) { return S(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dg = function (s) { return S(s).replace(/\D/g, ''); };
  var br = function (d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(d)); return m ? m[3] + '/' + m[2] + '/' + m[1] : S(d); };
  var hoje = function () { return new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10); };
  var P = { cal: null, data: '', doc: null, ped: null, erro: '', lendo: false, f: 'todos', aberto: false };

  function GB() { return window.MutaGabinete || {}; }
  function app() { return $('pauta-app'); }
  function visivel() { var p = $('panel-pauta'); return !!(p && !p.hidden); }

  /* ---------- leitura ---------- */
  function ler() {
    if (!ses || ses.estado().estado !== 'on') { P.erro = ''; pintar(); return; }
    P.lendo = true; pintar();
    var cal = P.cal ? Promise.resolve() : ses.api('/api/sessoes').then(function (j) {
      P.cal = (j.sessoes || []).filter(function (s) { return s.date; }).sort(function (a, b) { return S(a.date).localeCompare(S(b.date)); });
      if (!P.data) { var h = hoje(), prox = P.cal.filter(function (s) { return s.date >= h; })[0]; P.data = prox ? prox.date : (P.cal[P.cal.length - 1] || {}).date || ''; }
    });
    var ped = ses.api('/api/sessoes?pedidos=1').then(function (j) { P.ped = j.registros || []; }).catch(function () { P.ped = P.ped || []; });
    return Promise.all([cal, ped]).then(function () { return P.data ? ses.api('/api/pauta?data=' + P.data).then(function (d) { P.doc = d; }) : null; })
      .then(function () { P.erro = ''; }, function (e) { P.erro = 'Não foi possível ler as pautas: ' + (e && e.message || e); })
      .then(function () { P.lendo = false; pintar(); });
  }
  function trocar(data) { P.data = data; P.doc = null; P.lendo = true; pintar();
    ses.api('/api/pauta?data=' + data).then(function (d) { P.doc = d; P.erro = ''; }, function (e) { P.erro = 'Não foi possível ler a pauta: ' + e.message; }).then(function () { P.lendo = false; pintar(); }); }

  /* ---------- etapa e alertas de um item da pauta ---------- */
  var PASSOS = [['servidor', 'Designado'], ['dataMinuta', 'Minutado'], ['dataCorrecao', 'Corrigido'], ['dataLiberacao', 'Liberado']];
  function etapa(it) {
    var r = S(it.resultado);
    if (/retirad/i.test(r)) return { k: 'ret', t: 'Retirado de pauta' };
    if (/adiad/i.test(r)) return { k: 'adi', t: 'Adiado' };
    if (r) return { k: 'jul', t: r };
    if (it.dataLiberacao) return { k: 'lib', t: 'Liberado' };
    if (it.dataCorrecao) return { k: 'cor', t: 'Corrigido · a liberar' };
    if (it.dataMinuta) return { k: 'min', t: 'Minutado · em correção' };
    if (it.servidor) return { k: 'des', t: 'Minutando · ' + S(it.servidor).split(' ')[0] };
    return { k: 'nd', t: 'A designar' };
  }
  function alertas(it) {
    var c = it.ctl || {}, ca = c.cartao || {}, L = [];
    if (c.intercor && !c.intercorOk) L.push(['al', c.intercorTipo || 'Intercorrência', S(c.intercor)]);
    var pd = (ca.pendencias || []).filter(function (p) { return p && p.desc && !p.ok; }); if (pd.length) L.push(['at', pd.length + (pd.length > 1 ? ' pendências' : ' pendência'), pd.map(function (p) { return p.desc; }).join(' · ')]);
    var av = (ca.avisos || []).filter(function (p) { return p && p.desc && !p.ok; }); if (av.length) L.push(['in', av.length + (av.length > 1 ? ' avisos' : ' aviso'), av.map(function (p) { return p.desc; }).join(' · ')]);
    if (c.sopref) L.push(['so', c.sopref === 'Preferência' ? 'Preferência' : 'Sustentação ' + c.sopref.toLowerCase(), 'pedido registrado no cartão']);
    if (c.tempest && /intempest/i.test(c.tempest)) L.push(['al', 'Intempestivo', c.tempest]);
    if (c.preparo && /nao recolh|não recolh|a menor/i.test(c.preparo)) L.push(['al', 'Preparo', c.preparo]);
    if (!it.servidor && !S(it.resultado)) L.push(['at', 'Sem minutante', '']);
    return L;
  }

  /* ---------- pedidos de sustentação oral e preferência (0.64) ---------- */
  function sesDe(r) { return (r.vinculo && r.vinculo.sessao) || r.data || r.sessao || ''; }
  function tipoPed(r) { var t = S(r.tipo || r.titulo); return /prefer/i.test(t) ? 'Preferência' : /presenc/i.test(t) ? 'Sustentação presencial' : /video|virtual/i.test(t) ? 'Sustentação por videoconferência' : t || 'Pedido'; }
  function aVincular(r) { return r.estado === 'a vincular' || !!r.aVincular; }
  function pedCard(r, opt) {
    opt = opt || {}; var item = (r.vinculo && r.vinculo.item) || r.item || '', av = aVincular(r), n = r.cnj || r.numero || '';
    return '<article class="gx-it pa-ped' + (av ? ' venc' : '') + '"><div class="gx-h"><b class="gx-t">' + esc(tipoPed(r)) + '</b>' +
      (av ? '<span class="gx-c venc" title="Ainda sem item correspondente na pauta">a vincular</span>' : item ? '<span class="gx-c">item ' + esc(item) + '</span>' : '') +
      (opt.ses ? '<span class="gx-c">sessão de ' + esc(br(sesDe(r))) + '</span>' : '') + '</div>' +
      '<p class="gx-m">' + [n && !opt.semNum ? '<button type="button" class="lnk mono" data-pa="abrir:' + esc(n) + '">' + esc(n) + '</button>' : '', r.recebidoEm || r.em ? 'recebido em ' + esc(br(S(r.recebidoEm || r.em).slice(0, 10))) : ''].filter(Boolean).join(' · ') + '</p>' +
      ((r.advogado || r.parte) ? '<p class="gx-tx">' + [r.advogado ? esc(r.advogado) + (r.oab ? ' (OAB ' + esc(r.oab) + ')' : '') : '', r.parte ? 'por ' + esc(r.parte) : ''].filter(Boolean).join(', ') + '</p>' : '') +
      (av && opt.itens && ses && ses.estado().gestor ? '<div class="pa-vinc"><select data-pa-vi="' + esc(r.id) + '"><option value="">vincular ao item…</option>' + opt.itens.map(function (it) { return '<option value="' + esc(it.cnj) + '">' + esc((it.item || '—') + ' · ' + it.cnj) + '</option>'; }).join('') + '</select></div>' : '') + '</article>';
  }
  function soProcesso(cnj) {
    var d = dg(cnj), L = (P.ped || []).filter(function (r) { return dg(r.cnj || r.numero) === d; }), fi = S(GB().V ? GB().V('pauta', 'Sustentação oral') : '');
    var h = '<div class="pa-soc"><h4 class="pm-mer-h">Sustentação oral e preferência</h4>';
    if (P.ped == null) return h + '<p class="muted">Lendo os pedidos…</p></div>';
    h += L.length ? L.map(function (r) { return pedCard(r, { ses: 1, semNum: 1 }); }).join('') : '<p class="muted">Nenhum pedido recebido para este processo.' + (fi ? '' : ' Para registrar um pedido, use "registrar situação, remarcação e sustentação".') + '</p>';
    if (fi && !L.length) h += '<p class="status err">A ficha registra "' + esc(fi) + '", mas não há pedido recebido para este processo: confira.</p>';
    else if (!fi && L.some(function (r) { return !aVincular(r); })) h += '<p class="status err">Há pedido recebido, mas a ficha não registra sustentação ou preferência: registre abaixo.</p>';
    return h + '</div>';
  }
  function pedSessao(itens) {
    var L = (P.ped || []).filter(function (r) { return sesDe(r) === P.data; });
    if (!L.length) return '<details class="gg pa-pses"><summary><h4>Pedidos desta sessão</h4><span class="gn">nenhum</span></summary><div class="gr"><p class="muted">Nenhum pedido de sustentação ou preferência para esta sessão.</p></div></details>';
    var so = L.filter(function (r) { return !/prefer/i.test(tipoPed(r)); }).length, pr = L.length - so, av = L.filter(aVincular).length;
    L.sort(function (a, b) { return (aVincular(b) ? 1 : 0) - (aVincular(a) ? 1 : 0) || (parseInt((a.vinculo || {}).item || a.item, 10) || 999) - (parseInt((b.vinculo || {}).item || b.item, 10) || 999); });
    return '<details class="gg pa-pses" open><summary><h4>Pedidos desta sessão</h4><span class="gn">' + [so ? so + (so > 1 ? ' sustentações' : ' sustentação') : '', pr ? pr + (pr > 1 ? ' preferências' : ' preferência') : '', av ? av + ' a vincular' : ''].filter(Boolean).join(' · ') + '</span></summary><div class="gr">' +
      L.map(function (r) { return pedCard(r, { itens: itens }); }).join('') + '</div></details>';
  }
  function vincular(id, cnj) {
    if (!cnj) return;
    ses.api('/api/sessoes?pedidos=1', { method: 'POST', body: JSON.stringify({ id: id, data: P.data, cnj: cnj }) })
      .then(function () { return ses.api('/api/sessoes?pedidos=1').then(function (j) { P.ped = j.registros || []; }); }, function (e) { P.erro = 'Não foi possível vincular: ' + e.message; })
      .then(pintar);
  }

  /* ---------- desenho ---------- */
  function procHtml() {
    var g = GB(), cnj = g.cnj ? g.cnj() : '';
    if (!cnj) return '<section class="card pc-sec"><div class="pc-sh"><h3>Processo em tela</h3></div><p class="muted">Abra um processo no PJe ou na lista abaixo.</p></section>';
    /* 0.62: no formato do cartão do processo (fundo cinza, como "autuação e partes") */
    return '<section class="pc pm pa-proc"><div class="pa-ph"><b>Processo em tela</b><span class="mono">' + esc(cnj) + '</span></div>' + (g.pautaHtml ? g.pautaHtml() : '').replace('<details class="pm-aut pa-reg"', soProcesso(cnj) + '<details class="pm-aut pa-reg"') + '</section>';
  }
  /* 0.64: sigla da classe (TPU/CNJ) e recurso julgado dentro do processo */
  function etqCl(it) { var e2 = window.ClassesCNJ ? window.ClassesCNJ.etiqueta(it.classe, ((it.ctl || {}).cartao || {}).tipoJ || '') : null; return e2 && e2.t ? ' <span class="pc-cl pa-cl" title="' + esc(e2.nome) + '">' + esc(e2.t) + '</span>' : ''; }
  function listaHtml() {
    var opts = (P.cal || []).map(function (s) { return '<option value="' + esc(s.date) + '"' + (s.date === P.data ? ' selected' : '') + '>' + esc(br(s.date)) + (s.date < hoje() ? ' (passada)' : '') + '</option>'; }).join('');
    var h = '<section class="card pc-sec pa-ses"><div class="pc-sh"><h3>Pautas do Ex Officio</h3><label class="pa-sel"><span class="sr">Sessão</span><select data-pa="ses">' + opts + '</select></label></div>';
    if (P.lendo && !P.doc) return h + '<p class="muted">Lendo a pauta…</p></section>';
    var d = P.doc || {}, L = (d.itens || []).length ? d.itens : (d.previa || []), previa = !(d.itens || []).length && (d.previa || []).length;
    if (!L.length) return h + '<p class="muted">Sem processos nesta pauta.</p></section>';
    var cur = dg(GB().cnj ? GB().cnj() : '');
    var R = L.map(function (it) { var a = alertas(it);
      if (!(it.ctl || {}).sopref) (P.ped || []).filter(function (r) { return sesDe(r) === P.data && dg(r.cnj || r.numero) === dg(it.cnj); }).slice(0, 1).forEach(function (r) { a.push(['so', /prefer/i.test(tipoPed(r)) ? 'Preferência' : 'Sustentação', 'pedido recebido · ' + S(r.advogado)]); });
      return { it: it, e: etapa(it), a: a }; });
    var cont = {}; R.forEach(function (x) { cont[x.e.k] = (cont[x.e.k] || 0) + 1; });
    var nAl = R.filter(function (x) { return x.a.some(function (a) { return a[0] === 'al'; }); }).length;
    var F = [['todos', 'Todos', L.length], ['al', 'Com alerta', nAl], ['nd', 'A designar', cont.nd || 0], ['des', 'Minutando', cont.des || 0], ['min', 'Em correção', cont.min || 0], ['cor', 'A liberar', cont.cor || 0], ['lib', 'Liberados', cont.lib || 0], ['fora', 'Retirados/adiados', (cont.ret || 0) + (cont.adi || 0)]];
    var vis = R.filter(function (x) { return P.f === 'todos' ? true : P.f === 'al' ? x.a.some(function (a) { return a[0] === 'al'; }) : P.f === 'fora' ? /ret|adi/.test(x.e.k) : x.e.k === P.f; });
    h += (previa ? '<p class="muted">Prévia da pauta (ainda sem a relação oficial do PJe).</p>' : '') +
      '<div class="pa-f">' + F.filter(function (f) { return f[2] || f[0] === 'todos'; }).map(function (f) { return '<button type="button" class="chip' + (P.f === f[0] ? ' on' : '') + '" data-pa="f:' + f[0] + '">' + f[1] + ' <i>' + f[2] + '</i></button>'; }).join('') + '</div>';
    h += pedSessao(L);
    h += '<ol class="pa-l">' + vis.map(function (x) {
      var it = x.it, at = dg(it.cnj) === cur, passo = PASSOS.map(function (p) { return '<i class="' + (it[p[0]] ? 'ok' : '') + '" title="' + p[1] + '"></i>'; }).join('');
      return '<li class="pa-it e-' + x.e.k + (at ? ' at' : '') + '"><button type="button" class="pa-b" data-pa="abrir:' + esc(it.cnj) + '" title="Abrir o prontuário deste processo">' +
        '<span class="pa-n">' + esc(it.item || '—') + '</span><span class="pa-c"><b class="mono">' + esc(it.cnj) + etqCl(it) + '</b><small>' + esc([S(it.assunto)].filter(Boolean).join(' · ').slice(0, 90)) + '</small>' +
        '<span class="pa-et"><span class="pa-st">' + passo + '</span>' + esc(x.e.t) + (it.corretor ? ' · corr. ' + esc(S(it.corretor).split(' ')[0]) : '') + '</span>' +
        (x.a.length ? '<span class="pa-al">' + x.a.map(function (a) { return '<em class="k-' + a[0] + '" title="' + esc(a[2]) + '">' + esc(a[1]) + '</em>'; }).join('') + '</span>' : '') + '</span></button></li>';
    }).join('') + '</ol>';
    return h + '</section>';
  }
  function pedidosHtml() {
    var L = P.ped || [];
    var h = '<section class="card pc-sec pa-so"><div class="pc-sh"><h3>Sustentação oral e preferência</h3><small class="muted">pedidos recebidos, por sessão</small></div>';
    if (P.ped == null) return h + '<p class="muted">Lendo os pedidos…</p></section>';
    if (!L.length) return h + '<p class="muted">Nenhum pedido recebido.</p></section>';
    var por = {}; L.forEach(function (r) { var d = (r.vinculo && r.vinculo.sessao) || r.data || r.sessao || 'sem sessão'; (por[d] = por[d] || []).push(r); });
    var cur = dg(GB().cnj ? GB().cnj() : ''), h0 = hoje();
    return h + Object.keys(por).sort(function (a, b) { return a === 'sem sessão' ? 1 : b === 'sem sessão' ? -1 : (a >= h0) === (b >= h0) ? a.localeCompare(b) : a >= h0 ? -1 : 1; }).map(function (d) {
      var X = por[d];
      return '<details class="gg pa-sd"' + (d >= h0 || d === P.data ? ' open' : '') + '><summary><h4>' + (d === 'sem sessão' ? 'Sem sessão identificada' : 'Sessão de ' + esc(br(d))) + '</h4><span class="gn">' + X.length + '</span></summary><div class="gr">' +
        X.map(function (r) {
          var item = (r.vinculo && r.vinculo.item) || r.item || '', est = r.estado === 'a vincular' || r.aVincular;
          return '<article class="gx-it' + (dg(r.cnj || r.numero) === cur ? ' pa-at' : '') + '"><div class="gx-h"><b class="gx-t">' + esc(r.tipo || r.titulo || 'Pedido') + '</b>' +
            (est ? '<span class="gx-c venc" title="Ainda sem item correspondente na pauta">a vincular</span>' : item ? '<span class="gx-c">item ' + esc(item) + '</span>' : '') + '</div>' +
            '<p class="gx-m">' + [r.cnj || r.numero ? '<button type="button" class="lnk mono" data-pa="abrir:' + esc(r.cnj || r.numero) + '">' + esc(r.cnj || r.numero) + '</button>' : '', r.recebidoEm || r.em ? 'recebido em ' + esc(br(S(r.recebidoEm || r.em).slice(0, 10))) : ''].filter(Boolean).join(' · ') + '</p>' +
            ((r.advogado || r.parte) ? '<p class="gx-tx">' + [r.advogado ? esc(r.advogado) + (r.oab ? ' (OAB ' + esc(r.oab) + ')' : '') : '', r.parte ? 'por ' + esc(r.parte) : ''].filter(Boolean).join(', ') + '</p>' : '') + '</article>';
        }).join('') + '</div></details>';
    }).join('') + '</section>';
  }
  function pintar() {
    var c = app(); if (!c || !visivel()) return;
    var s = ses ? ses.estado() : {};
    if (s.estado !== 'on') { c.innerHTML = '<div class="empty">Entre no Ex Officio (aba Prontuário) para ver as pautas.</div>'; return; }
    var y = c.scrollTop;
    c.innerHTML = (P.erro ? '<p class="status err">' + esc(P.erro) + '</p>' : '') + listaHtml();
    c.scrollTop = y;
  }

  /* ---------- ações ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#pauta-app [data-pa]'); if (!b) return;
    var a = b.getAttribute('data-pa');
    if (/^f:/.test(a)) { P.f = a.slice(2); pintar(); return; }
    if (/^abrir:/.test(a)) { var n = a.slice(6), brg = window.MutaProntuarioBridge; if (brg && brg.abrirProcesso) brg.abrirProcesso(n); if (window.MutaAbas) window.MutaAbas.ir('pront'); return; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.closest || !t.closest('#pauta-app')) return;
    if (t.getAttribute('data-pa') === 'ses') { trocar(t.value); return; }
    if (t.getAttribute('data-pa-vi')) { vincular(t.getAttribute('data-pa-vi'), t.value); return; }
    if (t.dataset && t.dataset.fk && GB().marcar) { GB().marcar(t.dataset.fk, t.value); if (GB().gravar) GB().gravar().catch(function () {}); }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#pauta-app [data-ch]'); if (!b || !GB().marcar) return;
    var id = b.dataset.ch, i = id.indexOf('.'), cv = S(GB().V ? GB().V(id.slice(0, i), id.slice(i + 1)) : '');
    GB().marcar(id, cv === b.dataset.v ? '' : b.dataset.v); if (GB().gravar) GB().gravar().catch(function () {}); setTimeout(pintar, 50);
  });
  document.addEventListener('muta:prontuario', function () { setTimeout(pintar, 300); });
  if (ses && ses.ouvir) ses.ouvir(function () { if (visivel()) ler(); });

  /* Consulta independente da aba Pauta; não redesenha o prontuário durante a edição. */
  var pedConsulta=null,pedConsultadoEm=0;
  function pedidosProcesso(node,cnj){
    function desenhar(){if(node.isConnected&&dg(node.dataset.cnj)===dg(cnj))node.innerHTML=soProcesso(cnj);}
    if(P.ped!==null){node.innerHTML=soProcesso(cnj);if(Date.now()-pedConsultadoEm<60000)return;}
    else node.innerHTML='<p class="muted">Lendo pedidos recebidos…</p>';
    if(!ses||ses.estado().estado!=='on')return;
    if(!pedConsulta)pedConsulta=ses.api('/api/sessoes?pedidos=1').then(function(j){P.ped=j.registros||[];pedConsultadoEm=Date.now();}).finally(function(){pedConsulta=null;});
    pedConsulta.then(desenhar,function(){if(node.isConnected&&P.ped===null)node.innerHTML='<p class="muted">Não foi possível consultar os pedidos recebidos.</p>';});
  }
  window.MutaPauta = { pedidosProcesso: pedidosProcesso, abrir: function () { if (!P.cal || !P.doc) ler(); else pintar(); }, pintar: pintar, etapa: etapa, alertas: alertas };
})();
