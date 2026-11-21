/* HERO18810 · quadro do Desembargador (0.30)
   Os cartões "Assinar decisão" e "Dúvidas" da página /cmt, para o perfil desembargador (e o gestor, que acompanha):
   - na lista do PJe, no topo da coluna "Para assinatura" (conteudo-pje.js);
   - no sino do painel lateral, aba "Desembargador" (alertas.js).
   Os dados vêm do service worker (fundo.js › lerCmt, GET /api/painel?cmt=1, a cada minuto); as ações vão por ele
   (POST /api/painel?cmt=1 com origem "extensao"), e o servidor manda cópia de cada resposta, devolutiva e assinatura ao gestor.
   Marcar "assinada" grava só no app do gabinete: a assinatura em si continua no PJe. */
(function (G) {
  'use strict';
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ic(k, n) { var E = G.MutaEtiquetas; return E && E.svg ? E.svg(k, n || 13) : ''; }
  function br(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? m[3] + '/' + m[2] : String(d || ''); }
  function ini(v) { var p = String(v || '').trim().split(/\s+/).filter(Boolean); return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : ''; }
  function pes(nome, rot, cls) { if (!nome) return ''; return '<span class="hcm-p ' + cls + '" title="' + rot + ': ' + esc(nome) + '"><i>' + esc(ini(nome)) + '</i><span><small>' + rot + '</small><b>' + esc(String(nome).split(/\s+/)[0]) + '</b></span></span>'; }
  function trilha(a) {
    var s = function (ok, k, nome, d) { return '<i class="' + (ok ? 'ok' : '') + '" title="' + nome + (ok && d ? ' em ' + esc(br(d)) : ok ? '' : ': pendente') + '">' + ic(k, 11) + '</i>' + (ok && d && k === 'lapis' ? '<small>' + esc(br(d)) + '</small>' : ''); };
    return '<span class="hcm-tr">' + s(!!a.dataMinuta, 'lapis', 'Minutado', a.dataMinuta) + '<b></b>' + s(!!a.dataCorrecao, 'check', 'Corrigido', a.dataCorrecao) + '<b></b>' + s(!!a.desde, 'enviar', 'Liberado', a.desde) + '</span>';
  }
  function cnjBtn(n) { return '<button type="button" class="hcm-k" data-hcm-copia="' + esc(n) + '" title="Copiar o número">' + esc(n) + '</button>'; }

  /* um item para assinar: o necessário para decidir sem abrir a ficha */
  function item(a, aberto) {
    var u = a.urg, chips = [];
    if (a.tipoAto) chips.push('<span class="hcm-c hcm-ato">' + esc(a.tipoAto) + '</span>');
    if (a.julgamento && a.julgamento !== a.tipoAto) chips.push('<span class="hcm-c">' + esc(a.julgamento) + '</span>');
    if (u) chips.push('<span class="hcm-c hcm-u" title="' + esc([u.situacao, u.obs].filter(Boolean).join(' · ')) + '">' + ic('ampulheta', 11) + esc(u.tipo || 'Urgência') + (u.nivel ? ' · ' + esc(u.nivel) : '') + (u.espera != null ? ' · ' + u.espera + ' d' : '') + '</span>');
    if (a.meta) chips.push('<span class="hcm-c hcm-m">' + ic('alvo', 11) + 'Meta</span>');
    if (a.prazo) chips.push('<span class="hcm-c hcm-pz">' + ic('calendario', 11) + 'prazo ' + esc(br(a.prazo)) + '</span>');
    if (a.aguarda != null) chips.push('<span class="hcm-c hcm-ag" title="Liberada para assinatura em ' + esc(br(a.desde)) + '">' + ic('relogio', 11) + (a.aguarda ? 'aguarda ' + a.aguarda + ' d' : 'liberada hoje') + '</span>');
    var caso = [a.classe, a.assunto].filter(Boolean).join(' · ');
    return '<article class="hcm-it' + (u ? ' urg' : '') + '" data-hcm-cnj="' + esc(a.cnj) + '">' +
      '<div class="hcm-h">' + cnjBtn(a.cnj) + chips.join('') + '</div>' +
      (a.titulo || a.topico ? '<p class="hcm-ti">' + esc(a.titulo || a.topico) + '</p>' : '') +
      (a.titulo && a.topico && a.topico !== a.titulo ? '<p class="hcm-tp">' + esc(a.topico) + '</p>' : '') +
      (caso ? '<p class="hcm-ca">' + esc(caso) + '</p>' : '') + (a.partes ? '<p class="hcm-pt">' + esc(a.partes) + '</p>' : '') +
      (a.notaAtencao || a.atencao ? '<p class="hcm-at">' + ic('triangulo', 12) + '<span><b>Atenção do revisor</b> ' + esc(a.notaAtencao || a.atencao) + '</span></p>' : '') +
      (a.obs ? '<p class="hcm-ob">' + ic('nota', 12) + esc(a.obs) + '</p>' : '') +
      '<div class="hcm-r">' + pes(a.servidor, 'Minuta', 'm') + pes(a.corretor, 'Correção', 'c') + trilha(a) + '</div>' +
      '<div class="hcm-ac"><button type="button" class="hcm-b ok" data-hcm="assinar" data-cnj="' + esc(a.cnj) + '" title="Registra no app do gabinete que a decisão foi assinada (a assinatura em si é no PJe)">' + ic('check', 12) + 'Marcar assinada</button>' +
      '<button type="button" class="hcm-b" data-hcm="abrir-dev" data-cnj="' + esc(a.cnj) + '" aria-expanded="' + (aberto ? 'true' : 'false') + '">' + ic('enviar', 12) + 'Devolver com apontamento</button></div>' +
      (aberto ? '<form class="hcm-f" data-hcm-form="devolver" data-cnj="' + esc(a.cnj) + '"><textarea rows="3" name="texto" placeholder="O que ajustar antes da assinatura" required></textarea>' +
        '<label class="hcm-l">Para <select name="para">' + [a.servidor, a.corretor].filter(Boolean).map(function (n, i) { return '<option' + (i ? '' : ' selected') + '>' + esc(n) + '</option>'; }).join('') + '</select></label>' +
        '<span class="hcm-fb"><button type="button" class="hcm-b" data-hcm="fechar-dev" data-cnj="' + esc(a.cnj) + '">cancelar</button><button type="submit" class="hcm-b ok">Enviar devolutiva</button></span></form>' : '') +
      '</article>';
  }
  function duvida(d, aberto) {
    return '<article class="hcm-it hcm-du" data-hcm-id="' + esc(d.id) + '"><div class="hcm-h">' + ic('interrogacao', 13) + '<b class="hcm-dt">' + esc(d.titulo || 'Dúvida') + '</b>' + (d.prioridade ? '<span class="hcm-c' + (/alta|urg/i.test(d.prioridade) ? ' hcm-u' : '') + '">' + esc(d.prioridade) + '</span>' : '') + (d.prazo ? '<span class="hcm-c hcm-pz">' + ic('calendario', 11) + 'até ' + esc(br(d.prazo)) + '</span>' : '') + '</div>' +
      '<p class="hcm-ca">' + (d.de ? 'De ' + esc(d.de) : '') + (d.em ? ' · ' + esc(br(d.em)) : '') + (d.numero ? ' · ' + cnjBtn(d.numero) : '') + '</p>' +
      (d.texto ? '<p class="hcm-tx">' + esc(d.texto) + '</p>' : '') + (d.resposta ? '<p class="hcm-ob">' + ic('check', 12) + 'Resposta anterior: ' + esc(d.resposta) + '</p>' : '') +
      (aberto ? '<form class="hcm-f" data-hcm-form="responder" data-id="' + esc(d.id) + '"><textarea rows="3" name="texto" placeholder="Resposta ao servidor" required></textarea>' +
        '<label class="hcm-l"><input type="checkbox" name="manter"> manter a dúvida aberta</label><span class="hcm-fb"><button type="button" class="hcm-b" data-hcm="fechar-du" data-id="' + esc(d.id) + '">cancelar</button><button type="submit" class="hcm-b ok">Responder</button></span></form>'
        : '<div class="hcm-ac"><button type="button" class="hcm-b ok" data-hcm="abrir-du" data-id="' + esc(d.id) + '">' + ic('enviar', 12) + 'Responder</button></div>') + '</article>';
  }
  var UI = { dev: {}, du: {}, aba: 'as', msg: '' };
  function html(v, op) {
    op = op || {};
    if (!v) return '<section class="hcm"><p class="hcm-v">Carregando o quadro do Desembargador…</p></section>';
    if (v.erro) return '<section class="hcm"><p class="hcm-v">' + esc(v.erro) + '</p></section>';
    var A = v.assinatura || [], D = v.duvidas || [], L = v.liberacao || [];
    var tab = function (k, t, n) { return '<button type="button" class="hcm-tab" data-hcm="aba" data-aba="' + k + '" aria-selected="' + (UI.aba === k) + '">' + t + (n ? ' <i>' + n + '</i>' : '') + '</button>'; };
    var corpo = UI.aba === 'du' ? (D.length ? D.map(function (d) { return duvida(d, UI.du[d.id]); }).join('') : '<p class="hcm-v">Nenhuma dúvida em aberto' + (v.gestor && !v.des ? ' dirigida a você' : '') + '.</p>')
      : UI.aba === 'li' ? (L.length ? L.map(function (a) { return '<article class="hcm-it"><div class="hcm-h">' + cnjBtn(a.cnj) + '<span class="hcm-c">corrigida em ' + esc(br(a.desde)) + '</span></div><div class="hcm-r">' + pes(a.servidor, 'Minuta', 'm') + pes(a.corretor, 'Correção', 'c') + '</div></article>'; }).join('') : '<p class="hcm-v">Nenhuma monocrática corrigida à espera de liberação.</p>')
      : (A.length ? A.map(function (a) { return item(a, UI.dev[a.cnj]); }).join('') : '<p class="hcm-v">Nenhuma decisão submetida à assinatura.</p>');
    var urg = A.filter(function (a) { return a.urg; }).length;
    return '<section class="hcm' + (op.pje ? ' hcm-pje' : '') + '">' +
      '<header class="hcm-hd"><span class="hcm-lg">' + ic('lapis', 14) + '</span><span class="hcm-tt"><b>Para assinatura</b><small>HERO18810 · Gabinete do Des. Fed. Carlos Muta' + (v.em ? ' · ' + esc(new Date(v.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) : '') + '</small></span>' +
      (urg ? '<span class="hcm-c hcm-u">' + ic('ampulheta', 11) + urg + ' urgente' + (urg > 1 ? 's' : '') + '</span>' : '') +
      '<button type="button" class="hcm-b" data-hcm="ler" title="Atualizar agora">Atualizar</button>' + (op.pje ? '<button type="button" class="hcm-b" data-hcm="recolher" title="Recolher o quadro">' + (op.recolhido ? 'abrir' : 'recolher') + '</button>' : '') + '</header>' +
      (op.recolhido ? '' : '<nav class="hcm-tabs">' + tab('as', 'Assinar', A.length) + tab('du', 'Dúvidas', D.length) + tab('li', 'A liberar', L.length) + '</nav>' +
        (UI.msg ? '<p class="hcm-msg">' + esc(UI.msg) + '</p>' : '') + '<div class="hcm-l2">' + corpo + '</div>' +
        '<footer class="hcm-ft">Resposta, devolutiva e assinatura marcadas aqui vão com cópia ao gestor.</footer>') + '</section>';
  }
  /* liga os botões; enviar(msg) devolve Promise com a resposta do service worker; depois(v) repinta */
  function bind(root, enviar, repintar) {
    if (!root || root.__hcm) return; root.__hcm = true;
    var acao = function (corpo, ok) {
      UI.msg = 'Gravando…'; repintar();
      return enviar(Object.assign({ tipo: 'muta-cmt-acao' }, corpo)).then(function (r) { UI.msg = r && r.erro ? r.erro : ok; if (!(r && r.erro)) { UI.dev = {}; UI.du = {}; } repintar(r && r.dados); }, function (e) { UI.msg = String(e && e.message || e); repintar(); });
    };
    root.addEventListener('click', function (e) {
      var c = e.target.closest && e.target.closest('[data-hcm-copia]');
      if (c) { e.preventDefault(); e.stopPropagation(); var t = c.getAttribute('data-hcm-copia'); try { navigator.clipboard.writeText(t); c.classList.add('cp'); setTimeout(function () { c.classList.remove('cp'); }, 1200); } catch (x) {} return; }
      var b = e.target.closest && e.target.closest('[data-hcm]'); if (!b || !root.contains(b)) return;
      e.preventDefault(); e.stopPropagation();
      var k = b.getAttribute('data-hcm'), cnj = b.getAttribute('data-cnj'), id = b.getAttribute('data-id');
      if (k === 'aba') { UI.aba = b.getAttribute('data-aba'); UI.msg = ''; return repintar(); }
      if (k === 'ler') { UI.msg = ''; return enviar({ tipo: 'muta-cmt', forcar: true }).then(function (r) { repintar(r); }); }
      if (k === 'recolher') return repintar(null, true);
      if (k === 'abrir-dev') { UI.dev[cnj] = !UI.dev[cnj]; return repintar(); }
      if (k === 'fechar-dev') { delete UI.dev[cnj]; return repintar(); }
      if (k === 'abrir-du') { UI.du[id] = true; return repintar(); }
      if (k === 'fechar-du') { delete UI.du[id]; return repintar(); }
      if (k === 'assinar') return acao({ acao: 'assinar', cnj: cnj }, 'Assinatura registrada no app · ' + cnj + '. Cópia ao gestor.');
    }, true);
    root.addEventListener('submit', function (e) {
      var f = e.target.closest && e.target.closest('[data-hcm-form]'); if (!f) return;
      e.preventDefault(); e.stopPropagation();
      var t = (f.elements.texto.value || '').trim(); if (!t) return;
      if (f.getAttribute('data-hcm-form') === 'devolver') return acao({ acao: 'devolver', cnj: f.getAttribute('data-cnj'), texto: t, para: f.elements.para ? f.elements.para.value : '' }, 'Devolutiva enviada. Cópia ao gestor.');
      return acao({ acao: 'responder', id: f.getAttribute('data-id'), texto: t, manter: !!(f.elements.manter && f.elements.manter.checked) }, 'Resposta enviada. Cópia ao gestor.');
    }, true);
    /* teclas dentro do quadro não chegam aos atalhos do PJe */
    root.addEventListener('keydown', function (e) { e.stopPropagation(); }, true);
  }
  var CSS = '.hcm{all:initial;display:block;box-sizing:border-box;font:13px/1.4 system-ui,"Segoe UI",sans-serif;color:#1d2730;background:#fff;border:1px solid #cdbcf0;border-left:4px solid #5a3fa0;border-radius:10px;margin:6px 0 10px;box-shadow:0 2px 8px rgba(40,20,90,.08);overflow:hidden}' +
    '.hcm *{box-sizing:border-box;font-family:inherit}.hcm p{margin:0}' +
    '.hcm-hd{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f6f2fd;border-bottom:1px solid #e5dcf7}' +
    '.hcm-lg{width:26px;height:26px;border-radius:50%;background:#5a3fa0;color:#fff;display:grid;place-items:center;flex:none}' +
    '.hcm-tt{display:grid;line-height:1.15;flex:1;min-width:0}.hcm-tt b{font-size:13.5px;color:#3b2779}.hcm-tt small{font-size:10.5px;color:#7a6f92;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.hcm-tabs{display:flex;gap:2px;padding:6px 8px 0;border-bottom:1px solid #eee}' +
    '.hcm-tab{all:unset;cursor:pointer;padding:5px 10px;border-radius:7px 7px 0 0;font:600 12px system-ui,sans-serif;color:#5d6b78}.hcm-tab[aria-selected=true]{background:#efe9fb;color:#3b2779}' +
    '.hcm-tab i{font-style:normal;background:#5a3fa0;color:#fff;border-radius:8px;padding:0 5px;font-size:10px;margin-left:3px}' +
    '.hcm-l2{max-height:min(62vh,640px);overflow:auto;padding:6px 8px;display:grid;gap:6px}' +
    '.hcm-it{border:1px solid #e3e7ec;border-radius:8px;padding:7px 9px;display:grid;gap:4px;background:#fff}.hcm-it.urg{border-color:#efb3a9;box-shadow:inset 3px 0 0 #c62828}' +
    '.hcm-h{display:flex;flex-wrap:wrap;align-items:center;gap:4px}' +
    '.hcm-k{all:unset;cursor:copy;color:#1a7fc0;font:700 12.5px Arial,sans-serif;margin-right:2px}.hcm-k.cp{color:#2f8a5a}' +
    '.hcm-c{display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:9px;border:1px solid #d5dbe1;background:#fff;color:#33424c;font:600 10.5px system-ui,sans-serif;white-space:nowrap}' +
    '.hcm-ato{background:#efe9fb;border-color:#cdbcf0;color:#4b2f8f}.hcm-u{background:#fdecea;border-color:#efb3a9;color:#a8321f}.hcm-m{background:#fbf3e1;border-color:#e8cf95;color:#8a5a10}.hcm-pz{color:#00796b;border-color:#a8d8d0}.hcm-ag{color:#5d6b78}' +
    '.hcm-ti{font-weight:600;font-size:12.5px;color:#1d2730}.hcm-tp,.hcm-tx{font-size:12px;color:#33424c;white-space:pre-wrap}.hcm-ca,.hcm-pt{font-size:11px;color:#66737f}' +
    '.hcm-at,.hcm-ob{display:flex;gap:5px;align-items:flex-start;font-size:11.5px;padding:4px 6px;border-radius:6px;background:#fff4e5;color:#7a4f0c}.hcm-ob{background:#f3f6f8;color:#3e4c57}.hcm-at svg,.hcm-ob svg{flex:none;margin-top:2px}' +
    '.hcm-r{display:flex;flex-wrap:wrap;align-items:center;gap:5px}' +
    '.hcm-p{display:inline-flex;align-items:center;gap:5px;padding:2px 9px 2px 3px;border-radius:14px;border:1px solid #e0dccc;background:#fff}.hcm-p>i{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:700 9px system-ui,sans-serif;font-style:normal}' +
    '.hcm-p.m>i{background:#e3f2ec;color:#2f6e4b}.hcm-p.c>i{background:#ece7f8;color:#5a3fa0}.hcm-p>span{display:grid;line-height:1.05}.hcm-p small{font:600 7.5px system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8a97a3}.hcm-p b{font:600 11px system-ui,sans-serif}' +
    '.hcm-tr{display:inline-flex;align-items:center;gap:4px}.hcm-tr i{width:20px;height:20px;border-radius:50%;border:1.5px dashed #b7c2cb;background:#fff;color:#9aa8b3;display:grid;place-items:center}.hcm-tr i.ok{border:1.5px solid #2f8a5a;color:#2f8a5a;background:#f1faf4}.hcm-tr b{width:10px;border-top:1.5px dashed #c3ccd3}.hcm-tr small{font:600 10px system-ui,sans-serif;color:#1d6b45}' +
    '.hcm-ac,.hcm-fb{display:flex;flex-wrap:wrap;gap:5px;justify-content:flex-end}' +
    '.hcm-b{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:7px;border:1px solid #cfd6dd;background:#fff;color:#33424c;font:600 11.5px system-ui,sans-serif}.hcm-b:hover{background:#f1f4f7}.hcm-b:focus-visible{outline:2px solid #5a3fa0;outline-offset:1px}' +
    '.hcm-b.ok{background:#5a3fa0;border-color:#5a3fa0;color:#fff}.hcm-b.ok:hover{background:#4a3288}' +
    '.hcm-f{display:grid;gap:5px;padding:6px;border-radius:7px;background:#f6f2fd}.hcm-f textarea{width:100%;font:12.5px/1.35 system-ui,sans-serif;border:1px solid #cdbcf0;border-radius:6px;padding:6px;resize:vertical;background:#fff;color:#1d2730}' +
    '.hcm-l{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:#4b5a66}.hcm-l select{font:12px system-ui,sans-serif}' +
    '.hcm-dt{font-size:12.5px}.hcm-v{padding:10px;color:#66737f;font-size:12px}.hcm-msg{margin:6px 8px 0;padding:5px 8px;border-radius:6px;background:#eef3f7;color:#1f4f6b;font-size:11.5px}' +
    '.hcm-ft{padding:5px 10px;border-top:1px solid #eee;font-size:10.5px;color:#7a6f92;background:#fcfbfe}' +
    '.hcm-pje{max-width:640px;min-width:0;width:auto}#hero-cmt{display:block;width:100%;min-width:0;box-sizing:border-box;padding:0 6px}';
  function css(doc) { doc = doc || G.document; if (!doc || doc.getElementById('hcm-css')) return; var st = doc.createElement('style'); st.id = 'hcm-css'; st.textContent = CSS; (doc.head || doc.documentElement).appendChild(st); }
  G.MutaCmt = { html: html, bind: bind, css: css, UI: UI };
})(typeof window !== 'undefined' ? window : self);
