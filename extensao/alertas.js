/* Muta 0.19 · prazos, alertas e etiquetas do gabinete no painel.
   - Sino na faixa do topo: alertas da última leitura da lista de tarefas do PJe (o serviço de fundo grava em storage.session).
   - Prazos: limites de dias para os avisos e liga/desliga de selos e notificações (storage.local 'muta-prazos').
   - Etiquetas do gabinete: catálogo compartilhado (padrao/etiquetas-gabinete.json, via /api/pauta?etiquetas=1); o gestor edita.
   Nada é gravado no PJe: as etiquetas são só copiadas. */
(function () {
  'use strict';
  var E = window.MutaEtiquetas, ses = window.MutaSessao;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var SVG = function (p, n) { return '<svg viewBox="0 0 24 24" width="' + (n || 14) + '" height="' + (n || 14) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var SINO = '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>';
  var A = { ctl: 'pz', app: [], appEm: '', cheg: [], gestor0: false, itens: [], em: '', cfg: null, cat: null, gestor: false, catErro: '', ed: null, aba: 'al', res: {}, pedindo: {} };
  var temChrome = typeof chrome !== 'undefined' && chrome.storage;

  /* ---------- dados ---------- */
  function lerAlertas() {
    if (!temChrome || !chrome.storage.session) return Promise.resolve();
    return Promise.all([chrome.storage.session.get(['muta-alertas', 'muta-app']), chrome.storage.local.get(['muta-chegadas', 'muta-gestor'])]).then(function (v) {
      var o = v[0], a = o['muta-alertas'] || {}, ap = o['muta-app'] || {}; A.itens = a.itens || []; A.em = a.em || ''; A.app = ap.eventos || []; A.appEm = ap.em || '';
      var hoje = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
      A.gestor0 = !!v[1]['muta-gestor']; A.cheg = (v[1]['muta-chegadas'] || []).filter(function (x) { return new Date(Date.parse(x.em) - 4 * 3600e3).toISOString().slice(0, 10) === hoje; });
      sino(); if (aberto()) pintar();
    }).catch(function () {});
  }
  function lerCfg() {
    var base = Object.assign({}, E ? E.CFG : {});
    if (!temChrome) { A.cfg = base; return Promise.resolve(A.cfg); }
    return chrome.storage.local.get('muta-prazos').then(function (o) { A.cfg = Object.assign(base, o['muta-prazos'] || {}); return A.cfg; }).catch(function () { A.cfg = base; return base; });
  }
  function gravarCfg(c) {
    A.cfg = c;
    var p = temChrome ? chrome.storage.local.set({ 'muta-prazos': c }) : Promise.resolve();
    return p.then(avisarAbas, function () {});
  }
  function avisarAbas() {
    if (!temChrome) return;
    try { chrome.runtime.sendMessage({ tipo: 'muta-resumos-limpar' }).catch(function () {}); } catch (e) {}
    try { chrome.tabs.query({ url: 'https://frontend-pje.app.trf3.jus.br/*' }).then(function (ts) { ts.forEach(function (t) { chrome.tabs.sendMessage(t.id, { tipo: 'muta-selos-atualizar' }).catch(function () {}); }); }).catch(function () {}); } catch (e) {}
  }
  function lerCatalogo(forcar) {
    if (A.cat && !forcar) return Promise.resolve(A.cat);
    if (!ses || ses.estado().estado !== 'on') return Promise.resolve(null);
    return ses.api('/api/pauta?etiquetas=1').then(function (j) { A.cat = j.catalogo || { etiquetas: [] }; A.gestor = !!j.gestor; A.catErro = ''; return A.cat; })
      .catch(function (e) { A.catErro = e.message || 'Não foi possível ler o catálogo.'; return null; });
  }
  /* resumo de um processo (os mesmos campos dos selos da lista), para o passo Etiquetas do Roteiro */
  function chave(cnj) { return String(cnj || '').replace(/\D/g, ''); }
  function resumoJa(cnj, depois) {
    var k = chave(cnj); if (!k) return null;
    if (A.res[k]) return A.res[k];
    if (A.pedindo[k] || !ses || ses.estado().estado !== 'on') return null;
    A.pedindo[k] = 1;
    Promise.all([ses.api('/api/pauta?fichas=' + encodeURIComponent(cnj)), lerCatalogo()]).then(function (r) {
      var x = (r[0].resumos || {})[k] || {}; A.res[k] = { r: x }; delete A.pedindo[k]; if (depois) depois();
    }).catch(function (e) { A.res[k] = { erro: e.message || 'falhou' }; delete A.pedindo[k]; if (depois) depois(); });
    return null;
  }
  function esquecer(cnj) { delete A.res[chave(cnj)]; }
  /* HTML do bloco "Etiquetas do gabinete" no passo Etiquetas do Roteiro */
  function htmlRoteiro(cnj, sugeridas, depois) {
    if (!E) return '';
    var x = resumoJa(cnj, depois);
    if (!x) return '<div class="etq-cat"><div class="etq-cat-h"><b>Regras do catálogo</b><small class="muted">conferindo as regras…</small></div></div>';
    if (x.erro) return '<div class="etq-cat"><div class="etq-cat-h"><b>Regras do catálogo</b><small class="muted">' + esc(x.erro) + '</small></div></div>';
    var cat = A.cat || { etiquetas: [] }, r = Object.assign({}, x.r);
    var dev = E.devidas(r, cat), jaPje = E.N(r.etqPje || ''), sug = E.N(sugeridas || '');
    if (!dev.length) return '<div class="etq-cat"><div class="etq-cat-h"><b>Regras do catálogo</b><small class="muted">nenhuma se aplica a este processo</small></div></div>';
    var falta = [];
    var chips = dev.map(function (e) {
      var n = E.N(e.nome), noPje = jaPje.indexOf(n) >= 0, naSug = sug.indexOf(n) >= 0;
      if (!noPje) falta.push(e.nome);
      var cor = /^#[0-9a-f]{3,8}$/i.test(e.cor || '') ? e.cor : '#6b7280';
      return '<span class="etq-c' + (noPje ? ' ok' : '') + '" style="--c:' + cor + '" title="' + esc((e.descricao || '') + (noPje ? ' · já está no PJe' : ' · falta no PJe')) + '"><i></i>' + esc(e.nome) +
        (noPje ? '<em>no PJe</em>' : naSug ? '<em>sugerida</em>' : '<button type="button" class="lnk" data-add="' + esc(e.nome) + '" title="Incluir nas sugeridas">+ sugerir</button>') + '</span>';
    }).join('');
    return '<div class="etq-cat"><div class="etq-cat-h"><b>Regras do catálogo</b>' + (falta.length ? '<button type="button" class="btn sm" data-copia="' + esc(falta.join('; ')) + '" title="Copiar as que faltam no PJe">Copiar ' + falta.length + '</button>' : '<small class="muted">todas já estão no PJe</small>') + '</div><div class="etq-cs">' + chips + '</div></div>';
  }

  /* ---------- sino ---------- */
  function vermelhos() { return A.itens.filter(function (i) { return (i.alertas || []).some(function (a) { return a.nivel === 'al'; }); }).length; }
  function sino() {
    var b = $('tu-sino'); if (!b) return;
    var nApp = appPend().length, n = vermelhos() + nApp, t = A.itens.length;
    var count=b.querySelector('b');if(count)count.textContent=n?String(n):'';
    b.setAttribute('aria-expanded',String(!!aberto()));posicionarPerfil();
    b.classList.toggle('al', !!vermelhos()); b.classList.toggle('ap', !vermelhos() && !!nApp);
    b.title = n ? n + ' processo' + (n > 1 ? 's' : '') + ' com alerta' + (n > 1 ? 's' : '') + ' na lista do PJe' : t ? t + ' processo' + (t > 1 ? 's' : '') + ' com aviso' : 'Alertas, prazos e etiquetas do gabinete';
  }
  function appPend() { return A.app.filter(function (e) { return !e.resolved && (e.nivel === 'urgente' || e.nivel === 'importante'); }); }
  function aberto() { var p = $('tu-pop'); return p && !p.hidden; }
  /* Ancoragem ao botão real, independente das linhas e da largura do header. */
  function posicionarPerfil(){
    var p=$('tu-pop'),b=$('tu-sino');if(!p||p.hidden||!b)return;
    var r=b.getBoundingClientRect(),vw=document.documentElement.clientWidth,vh=document.documentElement.clientHeight,gap=6;
    var width=Math.min(380,Math.max(0,vw-gap*2)),left=Math.max(gap,Math.min(r.right-width,vw-width-gap)),top=Math.max(gap,r.bottom+gap);
    p.style.width=width+'px';p.style.left=left+'px';p.style.top=top+'px';p.style.right='auto';p.style.maxHeight=Math.max(0,vh-top-gap)+'px';
  }
  function abrir(s) {
    var p = $('tu-pop'); if (!p) return;
    p.hidden = !s; var b=$('tu-sino');if(b)b.setAttribute('aria-expanded', s ? 'true' : 'false');
    if (s) { posicionarPerfil(); try { chrome.runtime.sendMessage({ tipo: 'muta-app-ler' }).catch(function () {}); } catch (e) {} Promise.all([lerAlertas(), lerCfg(), lerCatalogo(), lerCmt()]).then(pintar); pintar(); }
  }
  function quando(iso) { if (!iso) return ''; var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function fmtCnj(k) { var d = String(k).replace(/\D/g, ''); return d.length === 20 ? d.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6') : k; }

  function pintar() {
    var p = $('tu-pop'); if (!p) return;
    var q=ses&&ses.estado?ses.estado():{},on=q.estado==='on',gst=on&&q.gestor;
    var cm = A.cmt && !A.cmt.fora && !A.cmt.erro, nCm = cm ? (A.cmt.assinatura || []).length + (A.cmt.duvidas || []).length : 0;
    /* 0.49: o quadro do Desembargador (para assinar e dúvidas) saiu do sino para a aba Deliberações */
    var abas = [['al', 'PJe'], ['app', 'Gabinete'], ['ver', 'Versão']];   /* 0.73.5: as Chegadas (gestor) ficam dentro de PJe */
    A.gst = gst;   /* 0.48: Prazos e Etiquetas saíram do sino para a aba Controle (só o gestor) */
    if (A.aba === 'cm') A.aba = 'al';
    if (A.aba === 'ch') A.aba = 'al';
    if (A.aba === 'pz' || A.aba === 'et') A.aba = 'al';
    var site=(window.Muta&&window.Muta.SITE)||'https://www.gabinete-cmt.com';
    var h='<header class="tu-profile-panel-head"><div class="tu-profile-panel-id"><b>'+esc(on?q.usuario:'HERO18810')+'</b><small>Notificações'+(gst?' · Gestão':'')+'</small></div><div class="tu-profile-panel-actions">'+(on&&window.MutaGabinete&&window.MutaGabinete.cnj()?'<button type="button" data-ap-refresh title="Atualizar prontuário" aria-label="Atualizar prontuário">'+SVG('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',14)+'</button>':'')+($('pv-ajustes')||gst?'<button type="button" data-ap-ajustes title="Configurações" aria-label="Configurações">'+SVG('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',14)+'</button>':'')+(on?'<a href="'+esc(site)+'/exofficio/" target="_blank" rel="noopener noreferrer" title="Abrir Office">'+SVG('<path d="M14 4h6v6M20 4 10 14M19 14v5H5V5h5"/>',13)+'<span>Office</span></a><button type="button" data-ap-sair title="Sair da conta">'+SVG('<path d="M15 4h4v16h-4M10 17l-5-5 5-5M5 12h11"/>',13)+'<span>Sair</span></button>':'')+'<button type="button" class="ap-x" data-ap-x title="Fechar" aria-label="Fechar">×</button></div></header>';
    h += '<div class="ap-t" role="tablist">' + abas.map(function (a) { return '<button type="button" role="tab" class="ap-tab-' + a[0] + '" data-ap="' + a[0] + '" aria-selected="' + (A.aba === a[0]) + '">' + a[1] + (a[0] === 'al' && (A.itens.length + (gst ? A.cheg.length : 0)) ? ' <i>' + (A.itens.length + (gst ? A.cheg.length : 0)) + '</i>' : a[0] === 'app' && appPend().length ? ' <i>' + appPend().length + '</i>' : a[0] === 'ch' && A.cheg.length ? ' <i>' + A.cheg.length + '</i>' : a[0] === 'cm' && nCm ? ' <i>' + nCm + '</i>' : '') + '</button>'; }).join('') +
      '</div>';
    h += '<div class="ap-c">' + (A.aba === 'cm' ? '<div id="ap-cmt">' + (window.MutaCmt ? window.MutaCmt.html(A.cmt) : '') + '</div>' : A.aba === 'al' ? pAlertas() : A.aba === 'app' ? pApp() : A.aba === 'ch' ? pChegadas() : pVersao()) + '</div>';
    p.innerHTML = h;posicionarPerfil();
    var bx = $('ap-cmt');
    if (bx && window.MutaCmt) { window.MutaCmt.css(document); window.MutaCmt.bind(bx, function (m) { return chrome.runtime.sendMessage(m); }, function (v) { if (v) A.cmt = v; pintar(); }); }
  }
  /* 0.48: aba Controle (só o gestor) — Prazos e Etiquetas, antes no sino */
  function ehGestor() { return !!(A.gestor0 || (ses && ses.estado().gestor)); }
  function pintarCtl() {
    var c = $('ctl-app'); if (!c) return;
    if (!ehGestor()) { c.innerHTML = '<p class="muted ap-v">O Controle é só do gestor.</p>'; return; }
    var t = function (k, r, d) { return '<button type="button" role="tab" data-ctl="' + k + '" aria-selected="' + (A.ctl === k) + '">' + r + '<small>' + d + '</small></button>'; };
    c.innerHTML = '<div class="ctl-h"><b>Controle</b><small class="muted">prazos dos avisos e catálogo de etiquetas do gabinete</small></div>' +
      '<div class="seg pmodos ctl-modos" role="tablist" aria-label="Parte do Controle">' + t('pz', 'Prazos', 'avisos e notificações') + t('et', 'Etiquetas', 'catálogo e tipos do PJe') + '</div>' +
      '<div class="ap-c ctl-c">' + (A.ctl === 'et' ? pEtiquetas() : pPrazos()) + '</div>';
  }
  function tudo() { pintar(); pintarCtl(); }
  function controle() { pintarCtl(); Promise.all([lerAlertas(), lerCfg(), lerCatalogo(), lerCmt()]).then(pintarCtl); }
  function lerCmt(forcar) {
    if (!temChrome) return Promise.resolve();
    return chrome.runtime.sendMessage({ tipo: 'muta-cmt', forcar: !!forcar }).then(function (v) { A.cmt = v || null; /* 0.49: sem aba do Desembargador no sino */ }, function () {});
  }
  /* PJe = chegadas de hoje (só o gestor) + alertas da lista */
  function pAlertas() { return (A.gst ? (A.cheg.length ? '<section class="ap-sec ap-sec-ch"><h4 class="ap-sh">Chegadas de hoje <i>' + A.cheg.length + '</i></h4>' + pChegadas() + '</section>' : '<h4 class="ap-sh ap-sh0">Chegadas de hoje <small>nenhuma ainda</small></h4>') + '<h4 class="ap-sh">Alertas da lista</h4>' : '') + pAlertas0(); }
  /* 0.73.6: alertas da lista agrupados pelo que pedem — urgência, intercorrência e pendência por processo, no alto;
     tempo na tarefa resumido por tarefa (quantos, o mais antigo), com a lista recolhida. Filtro por tipo; número abre o prontuário. */
  var TIPOS_AL = [['urg', 'Urgência não apreciada'], ['ic', 'Intercorrências'], ['pend', 'Pendências'], ['tarefa', 'Tempo na tarefa']];
  function pAlertas0() {
    if (!A.itens.length) return '<p class="muted ap-v">Nenhum alerta. Os alertas surgem quando a lista de tarefas do PJe é aberta com o HERO18810 ligado.</p>';
    var G = {}; TIPOS_AL.forEach(function (t) { G[t[0]] = []; });
    A.itens.forEach(function (i) { (i.alertas || []).forEach(function (a) { var k = G[a.k] ? a.k : 'pend'; G[k].push({ i: i, a: a }); }); });
    var f = A.filtroAl && G[A.filtroAl] && G[A.filtroAl].length ? A.filtroAl : '';
    var chips = TIPOS_AL.filter(function (t) { return G[t[0]].length; }).map(function (t) {
      var al = G[t[0]].filter(function (x) { return x.a.nivel === 'al'; }).length;
      return '<button type="button" class="ap-fl' + (al ? ' al' : '') + '" data-ap-fl="' + t[0] + '" aria-pressed="' + (f === t[0]) + '">' + t[1] + ' <b>' + G[t[0]].length + '</b></button>';
    }).join('');
    var lin = function (x, txt) { var i = x.i; return '<li class="ap-r ' + (x.a.nivel === 'al' ? 'al' : 'av') + '"><span class="ap-rh"><button type="button" class="ap-k" data-ap-cnj="' + esc(fmtCnj(i.k)) + '" title="Copiar o número">' + esc(fmtCnj(i.k)) + '</button>' +
      '<button type="button" class="ap-abrir" data-ap-abrir="' + esc(i.k) + '" title="Abrir o prontuário">abrir</button><small>' + esc([i.etapa, i.servidor].filter(Boolean).join(' · ')) + '</small></span>' + (txt ? '<span class="ap-rt">' + esc(txt) + '</span>' : '') + '</li>'; };
    var porProc = function (k) { return G[k].slice().sort(function (a, b) { return (b.a.nivel === 'al') - (a.a.nivel === 'al'); }).map(function (x) { return lin(x, x.a.t); }).join(''); };
    var h = '<small class="muted ap-em">Leitura da lista em ' + esc(quando(A.em)) + ' · ' + A.itens.length + ' processo' + (A.itens.length === 1 ? '' : 's') + ' com alerta</small><div class="ap-fls">' + chips + '</div>';
    ['urg', 'ic', 'pend'].forEach(function (k) { if (G[k].length && (!f || f === k)) h += '<h5 class="ap-gh">' + TIPOS_AL.filter(function (t) { return t[0] === k; })[0][1] + '</h5><ul class="ap-rl">' + porProc(k) + '</ul>'; });
    if (G.tarefa.length && (!f || f === 'tarefa')) {
      var T = {}; G.tarefa.forEach(function (x) { var m = /^(\d+) dias na tarefa ?(.*)$/.exec(x.a.t) || [0, 0, '']; var t = m[2] || 'Tarefa sem nome'; (T[t] = T[t] || []).push({ x: x, d: +m[1] }); });
      h += '<h5 class="ap-gh">Tempo na tarefa</h5>' + Object.keys(T).sort(function (a, b) { return T[b].length - T[a].length; }).map(function (t) {
        var L = T[t].sort(function (a, b) { return b.d - a.d; }), al = L.filter(function (y) { return y.x.a.nivel === 'al'; }).length;
        return '<details class="ap-tg"' + (f === 'tarefa' ? ' open' : '') + '><summary><b>' + esc(t) + '</b><span>' + L.length + ' processo' + (L.length === 1 ? '' : 's') + ' · mais antigo ' + L[0].d + ' d' + (al ? ' · <i>' + al + ' acima do dobro do prazo</i>' : '') + '</span></summary><ul class="ap-rl">' +
          L.map(function (y) { return lin(y.x, y.d + ' dias'); }).join('') + '</ul></details>';
      }).join('');
    }
    return h;
  }
  function pApp() {
    if (!A.app.length) return '<p class="muted ap-v">Sem avisos do app do gabinete' + (A.appEm ? '' : ' (entre no painel para recebê-los)') + '.</p>';
    return '<small class="muted ap-em">App do gabinete · ' + esc(quando(A.appEm)) + '</small><ul class="ap-l">' + A.app.slice(0, 40).map(function (e) {
      var pje = e.origem === 'pje';
      return '<li class="org-' + (pje ? 'pje' : 'app') + (e.resolved ? ' lido' : '') + '"><div class="ap-h"><i class="ap-org ' + (pje ? 'pje' : 'app') + '">' + (pje ? 'PJe' : 'App') + '</i><b class="ap-ti">' + esc(e.title || '') + '</b></div>' +
        '<div class="ap-ms">' + esc(e.message || '') + '</div><small class="muted">' + esc(quando(e.time)) + (e.user ? ' · ' + esc(e.user) : '') + (e.nivel && e.nivel !== 'info' ? ' · <span class="ap-nv ' + esc(e.nivel) + '">' + esc(e.nivel) + '</span>' : '') +
        (e.numero ? ' · <button type="button" class="ap-k" data-ap-cnj="' + esc(e.numero) + '">' + esc(e.numero) + '</button>' : '') + '</small></li>';
    }).join('') + '</ul><a class="lnk" target="_blank" rel="noopener" href="https://www.gabinete-cmt.com/exofficio/">Abrir o app</a>';
  }
  function pChegadas() {
    var U = A.cheg.filter(function (x) { return x.urg; });
    var lk = temChrome && chrome.runtime.getURL ? chrome.runtime.getURL('relatorio.html') : '#';
    return '<small class="muted ap-em">Hoje: ' + A.cheg.length + ' chegada' + (A.cheg.length === 1 ? '' : 's') + (U.length ? ' · ' + U.length + ' com urgência' : '') + ' · vistas na lista do PJe</small>' +
      (A.cheg.length ? '<ul class="ap-l">' + A.cheg.slice().sort(function (a, b) { return b.urg - a.urg; }).map(function (x) {
        return '<li class="org-pje"><div class="ap-h"><i class="ap-org pje">PJe</i><button type="button" class="ap-k" data-ap-cnj="' + esc(fmtCnj(x.k)) + '">' + esc(fmtCnj(x.k)) + '</button><small>' + esc(quando(x.em)) + '</small></div>' +
          '<div class="ap-as">' + (x.urg ? '<span class="ap-a al">Urgente: ' + esc(x.motivos.join(', ')) + '</span>' : (x.motivos || []).length ? '<span class="ap-a av">' + esc(x.motivos.join(', ')) + '</span>' : '') + (x.tarefa ? '<span class="ap-a">' + esc(x.tarefa) + '</span>' : '') + '</div></li>';
      }).join('') + '</ul>' : '<p class="muted ap-v">Nenhuma chegada vista hoje.</p>') +
      '<a class="lnk" target="_blank" href="' + lk + '">Relatório completo do dia</a>';
  }
  function pPrazos() {
    var c = A.cfg || (E ? E.CFG : {});
    var num = function (k, r, d) { return '<label class="ap-f"><span>' + r + '</span><input type="number" min="1" max="999" data-pz="' + k + '" value="' + esc(c[k]) + '"><small>' + d + '</small></label>'; };
    var lig = function (k, r, d) { return '<label class="ap-f ap-s"><input type="checkbox" data-pz="' + k + '"' + (c[k] !== false ? ' checked' : '') + '><span>' + r + '</span><small>' + d + '</small></label>'; };
    return num('urgDias', 'Urgência não apreciada', 'dias até o alerta vermelho') +
      num('tarefaDias', 'Tempo na tarefa', 'dias até o aviso (vermelho no dobro)') +
      lig('selos', 'Sinalizações nos cartões da lista do PJe', 'ícones de urgência, avisos, intercorrências, pendências e notas, que abrem o quadro de detalhes') +
      '<label class="ap-f ap-s"><input type="checkbox" data-pz="dev"' + (c.dev === true ? ' checked' : '') + '><span>Modo em desenvolvimento: cartões e etiquetas</span><small>nos cartões: estado, designação, trilha, classificação, sugeridas e redesenho das etiquetas; no painel do usuário: tarefas por etapa e quadro de assinatura (em teste)</small></label>' +
      '<label class="ap-f ap-s"><input type="checkbox" data-pz="etqPers"' + (c.etqPers === true || (c.etqPers !== false && c.dev === true && c.etqEstilo !== false) ? ' checked' : '') + '><span>Etiquetas personalizadas no PJe</span><small>cada tipo com cor, estilo e ícone (Controle › Etiquetas); cada usuário também liga ou desliga no botão "Etiquetas" da lista do PJe</small></label>' +
      (A.cmt && !A.cmt.fora && c.dev === true ? lig('cmtPje', 'Quadro do Desembargador no PJe', 'decisões para assinatura e dúvidas, no topo da coluna "Para assinatura" da lista') : '') +
      lig('avisosApp', 'Avisos do app do gabinete', 'urgentes e importantes viram notificação (ícone azul, título "Gabinete")') +
      (A.gestor0 || (ses && ses.estado().gestor) ? lig('chegadas', 'Chegadas com urgência ou liminar (só gestor)', 'processo novo na lista do PJe com pedido urgente avisa na hora; os demais só entram no relatório') +
        lig('relatorio', 'Relatório de chegadas no fim do dia', 'notificação com o total do dia, que abre o relatório') +
        '<label class="ap-f"><span>Hora do relatório</span><input type="time" data-pz="relHora" value="' + esc(c.relHora || '18:00') + '"><small>todo dia, neste navegador</small></label>' : '') +
      '<small class="muted ap-v">Vale só neste navegador.</small>';
  }
  function pEtiquetas() {
    if (!ses || ses.estado().estado !== 'on') return '<p class="muted ap-v">Entre no painel para ver o catálogo.</p>';
    if (A.catErro) return '<p class="ap-v err">' + esc(A.catErro) + '</p>';
    if (!A.cat) return '<p class="muted ap-v">Carregando…</p>';
    var cats = (A.cat.categorias && A.cat.categorias.length) ? A.cat.categorias : (E ? E.CATEGORIAS : []);
    if (A.edCat) return pTiposEd();
    var tipos = '<div class="ap-ti2"><b>Tipos de etiqueta do PJe</b><small class="muted">redesenho dos cartões da lista, para toda a equipe</small></div><div class="ap-tps">' + cats.map(function (c) {
      return '<span class="hx hx-' + esc(c.estilo || 'suave') + '" style="--hc:' + esc(c.cor) + '" title="' + esc(c.re) + '">' + (E && E.svg ? E.svg(c.icone, 10) : '') + esc(c.nome) + '</span>';
    }).join('') + '</div>' + (A.gestor ? '<button type="button" class="btn sm" data-ap-edcat>Editar tipos e cores</button>' : '') + '<hr class="ap-hr">';
    var L = A.ed || A.cat.etiquetas || [];
    if (!A.ed) {
      return tipos + '<small class="muted ap-em">' + L.length + ' etiqueta' + (L.length === 1 ? '' : 's') + (A.cat.atualizadoPor ? ' · por ' + esc(A.cat.atualizadoPor) : '') + (A.cat.atualizadoEm ? ' em ' + esc(quando(A.cat.atualizadoEm)) : '') + '</small>' +
        '<ul class="ap-e">' + L.map(function (e) {
          return '<li><span class="etq-c" style="--c:' + esc(e.cor || '#6b7280') + '"><i></i>' + esc(e.nome) + '</span><small>' + esc(e.descricao || '') + '</small><code>' + esc(regra(e)) + '</code></li>';
        }).join('') + '</ul>' + (A.gestor ? '<button type="button" class="btn sm" data-ap-ed>Editar o catálogo</button>' : '<small class="muted ap-v">Só o gestor altera o catálogo.</small>');
    }
    var sel = function (L2, v, at) { return '<select ' + at + '>' + L2.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; };
    return '<div class="ap-ed">' + L.map(function (e, i) {
      return '<fieldset data-e="' + i + '"><div class="ap-er"><input type="color" data-ef="cor" value="' + esc(/^#[0-9a-f]{6}$/i.test(e.cor || '') ? e.cor : '#6b7280') + '" title="Cor"><input type="text" data-ef="nome" value="' + esc(e.nome) + '" placeholder="Nome como no PJe"><button type="button" class="sn-x" data-e-x="' + i + '" title="Excluir a etiqueta" aria-label="Excluir">×</button></div>' +
        '<input type="text" data-ef="descricao" value="' + esc(e.descricao || '') + '" placeholder="Para que serve">' +
        (e.quando || []).map(function (q, j) {
          return '<div class="ap-q" data-q="' + j + '">' + sel(E.CAMPOS, q.campo, 'data-qf="campo"') + sel(E.OPS, q.op, 'data-qf="op"') + (q.op === 'tem' || q.op === 'vazio' ? '' : '<input type="text" data-qf="valor" value="' + esc(q.valor == null ? '' : q.valor) + '">') + '<button type="button" class="sn-x" data-q-x="' + i + ':' + j + '" title="Excluir a condição" aria-label="Excluir">×</button></div>';
        }).join('') + ((e.quando || []).length < 6 ? '<button type="button" class="lnk" data-q-add="' + i + '">+ condição (todas devem valer)</button>' : '') + '</fieldset>';
    }).join('') + '<div class="ap-eb"><button type="button" class="lnk" data-e-add>+ etiqueta</button><span><button type="button" class="lnk" data-ap-cancelar>cancelar</button><button type="button" class="btn solid sm" data-ap-gravar>Gravar catálogo</button></span></div><small class="ap-msg" id="ap-msg"></small></div>';
  }
  function pTiposEd() {
    var opt = function (v) { return [['solido', 'sólido'], ['suave', 'suave'], ['contorno', 'contorno']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); };
    return '<div class="ap-ed"><small class="muted">Vale a primeira expressão que combinar com o nome da etiqueta (sem distinção de maiúsculas). O último tipo (".") pega o resto.</small>' + A.edCat.map(function (c, i) {
      return '<fieldset data-c="' + i + '"><div class="ap-er"><input type="color" data-cf="cor" value="' + esc(c.cor) + '" title="Cor"><input type="text" data-cf="icone" value="' + esc(c.icone || '') + '" maxlength="2" class="ap-ic" title="Ícone (até 2 caracteres)"><input type="text" data-cf="nome" value="' + esc(c.nome) + '" placeholder="Nome do tipo"><select data-cf="estilo">' + opt(c.estilo) + '</select><button type="button" class="sn-x" data-c-x="' + i + '" title="Excluir o tipo" aria-label="Excluir">×</button></div>' +
        '<input type="text" data-cf="re" value="' + esc(c.re) + '" placeholder="expressão: liminar|tutela|urgen"><span class="hx hx-' + esc(c.estilo) + '" style="--hc:' + esc(c.cor) + '">' + (E && E.svg ? E.svg(c.icone, 10) : '') + esc(c.nome || 'prévia') + '</span></fieldset>';
    }).join('') + '<div class="ap-eb"><button type="button" class="lnk" data-c-add>+ tipo</button><span><button type="button" class="lnk" data-ap-cancelar>cancelar</button><button type="button" class="btn solid sm" data-ap-gravarcat>Gravar tipos</button></span></div><small class="ap-msg" id="ap-msg"></small></div>';
  }
  function colherCat() {
    var p = $('ctl-app'); if (!p || !A.edCat) return;
    Array.prototype.forEach.call(p.querySelectorAll('fieldset[data-c]'), function (f) { var c = A.edCat[Number(f.dataset.c)]; if (!c) return; Array.prototype.forEach.call(f.querySelectorAll('[data-cf]'), function (i) { c[i.dataset.cf] = i.value; }); });
  }
  function regra(e) {
    var C = {}, O = {}; (E ? E.CAMPOS : []).forEach(function (c) { C[c[0]] = c[1]; }); (E ? E.OPS : []).forEach(function (o) { O[o[0]] = o[1]; });
    return (e.quando || []).map(function (q) { return (C[q.campo] || q.campo) + ' ' + (O[q.op] || q.op) + (q.op === 'tem' || q.op === 'vazio' ? '' : ' "' + q.valor + '"'); }).join(' e ') || 'sem condição (não é sugerida)';
  }
  /* lê o formulário do editor para A.ed */
  function colher() {
    var p = $('ctl-app'); if (!p || !A.ed) return;
    Array.prototype.forEach.call(p.querySelectorAll('fieldset[data-e]'), function (f) {
      var e = A.ed[Number(f.dataset.e)]; if (!e) return;
      Array.prototype.forEach.call(f.querySelectorAll('[data-ef]'), function (i) { e[i.dataset.ef] = i.value; });
      Array.prototype.forEach.call(f.querySelectorAll('.ap-q'), function (d) { var q = e.quando[Number(d.dataset.q)]; if (!q) return; Array.prototype.forEach.call(d.querySelectorAll('[data-qf]'), function (i) { q[i.dataset.qf] = i.dataset.qf === 'valor' && q.op === 'maior' ? Number(i.value) || 0 : i.value; }); });
    });
  }

  /* ---------- eventos ---------- */
  function montar() {
    var t0=$('topo-u');if(!t0||$('tu-pop'))return;
    var p=document.createElement('div');p.id='tu-pop';p.className='tu-pop tu-profile-pop';p.hidden=true;p.setAttribute('role','dialog');p.setAttribute('aria-label','Perfil e notificações');document.body.appendChild(p);
    window.addEventListener('resize',posicionarPerfil);
    window.addEventListener('scroll',function(e){if(aberto()&&(!(e.target instanceof Node)||!p.contains(e.target)))posicionarPerfil();},true);
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(posicionarPerfil).observe(t0);
    t0.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#tu-sino');if(!b)return;e.stopPropagation();abrir(!aberto());});
    document.addEventListener('click',function(e){var b=$('tu-sino');if(aberto()&&!p.contains(e.target)&&!(b&&b.contains(e.target)))abrir(false);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&aberto()){abrir(false);var b=$('tu-sino');if(b)b.focus();}});
    var ctl = $('ctl-app');
    p.addEventListener('click', clique); p.addEventListener('change', mudou);
    if (ctl) { ctl.addEventListener('click', clique); ctl.addEventListener('change', mudou); }
    if (temChrome && chrome.storage.onChanged) chrome.storage.onChanged.addListener(function (ch, area) { if ((area === 'session' && (ch['muta-alertas'] || ch['muta-app'])) || (area === 'local' && ch['muta-chegadas'])) lerAlertas(); });
    lerAlertas(); lerCfg(); iniciarVersao();
    if (ses && ses.ouvir) ses.ouvir(function () { abrir(false); A.cat = null; A.res = {}; sino(); var c0 = $('ctl-app'); if (c0 && c0.offsetParent) controle(); });
  }
  /* cliques do sino e da aba Controle (o mesmo conjunto de botões) */
  function clique(e) {
      e.stopPropagation(); /* o conteúdo é redesenhado no clique: o documento não deve tomá-lo por clique de fora */
      var x = e.target.closest('button'); if (!x) return;
      if (x.dataset.ap) { colher(); A.aba = x.dataset.ap; pintar(); return; }
      if (x.dataset.ctl) { colher(); colherCat(); A.ctl = x.dataset.ctl; pintarCtl(); return; }
      if (x.hasAttribute('data-ap-x')) { abrir(false); return; }
      if(x.hasAttribute('data-ap-refresh')){var gb=window.MutaGabinete;if(gb&&gb.cnj&&gb.cnj()){abrir(false);Promise.resolve().then(function(){return gb.gravarPendente();}).catch(function(){}).then(function(){return gb.recarregar();});}return;}
      if(x.hasAttribute('data-ap-ajustes')){abrir(false);var b=$('pv-ajustes'),u=ses&&ses.estado?ses.estado():{};if(b)b.click();else if(u.estado==='on'&&u.gestor&&window.MutaAbas)window.MutaAbas.ir('ctl');return;}
      if(x.hasAttribute('data-ap-sair')){abrir(false);var u=ses&&ses.estado?ses.estado():null;if(u&&u.estado==='on'){var gb=window.MutaGabinete;Promise.resolve().then(function(){return gb&&gb.gravarPendente?gb.gravarPendente():null;}).catch(function(){}).then(function(){return ses.sair();});}return;}
      if (x.dataset.apFl) { A.filtroAl = A.filtroAl === x.dataset.apFl ? '' : x.dataset.apFl; pintar(); return; }
      if (x.dataset.apAbrir) { var BR = window.MutaProntuarioBridge; abrir(false); if (window.MutaAbas) window.MutaAbas.ir('pront'); if (BR && BR.abrirProcesso) BR.abrirProcesso(x.dataset.apAbrir); return; }
      if (x.dataset.apCnj) { try { navigator.clipboard.writeText(x.dataset.apCnj).then(function () { var o = x.textContent; x.textContent = 'Copiado'; setTimeout(function () { x.textContent = o; }, 1000); }); } catch (er) {} return; }
      if (x.hasAttribute('data-ap-ed')) { A.ed = JSON.parse(JSON.stringify(A.cat.etiquetas || [])); tudo(); return; }
      if (x.hasAttribute('data-ap-cancelar')) { A.ed = null; A.edCat = null; tudo(); return; }
      if (x.hasAttribute('data-ap-edcat')) { var base = (A.cat.categorias && A.cat.categorias.length) ? A.cat.categorias : (E ? E.CATEGORIAS : []); A.edCat = JSON.parse(JSON.stringify(base)); tudo(); return; }
      if (x.hasAttribute('data-c-add')) { colherCat(); A.edCat.splice(Math.max(0, A.edCat.length - 1), 0, { id: '', nome: '', re: '', cor: '#546e7a', estilo: 'suave', icone: '' }); tudo(); return; }
      if (x.dataset.cX != null) { colherCat(); A.edCat.splice(Number(x.dataset.cX), 1); tudo(); return; }
      if (x.hasAttribute('data-ap-gravarcat')) {
        colherCat(); var m2 = $('ap-msg');
        var bad = A.edCat.filter(function (c) { try { new RegExp(c.re, 'i'); return !c.nome || !c.re; } catch (e) { return true; } });
        if (bad.length) { if (m2) { m2.textContent = 'Confira nome e expressão de: ' + bad.map(function (c) { return c.nome || '(sem nome)'; }).join(', '); m2.className = 'ap-msg err'; } return; }
        x.disabled = true; if (m2) { m2.textContent = 'Gravando…'; m2.className = 'ap-msg'; }
        ses.api('/api/pauta?etiquetas=1', { method: 'POST', body: JSON.stringify({ etiquetas: A.cat.etiquetas || [], categorias: A.edCat }) }).then(function (j) {
          A.cat = j.catalogo || A.cat; A.edCat = null; tudo(); avisarAbas();
        }).catch(function (er) { x.disabled = false; if (m2) { m2.textContent = 'Não gravou: ' + (er.message || 'erro'); m2.className = 'ap-msg err'; } });
        return;
      }
      if (x.hasAttribute('data-e-add')) { colher(); A.ed.push({ nome: '', cor: '#6b7280', descricao: '', quando: [{ campo: 'urgPend', op: 'tem', valor: '' }] }); tudo(); return; }
      if (x.dataset.eX != null) { colher(); A.ed.splice(Number(x.dataset.eX), 1); tudo(); return; }
      if (x.dataset.qAdd != null) { colher(); var e1 = A.ed[Number(x.dataset.qAdd)]; (e1.quando = e1.quando || []).push({ campo: 'urgPend', op: 'tem', valor: '' }); tudo(); return; }
      if (x.dataset.qX) { colher(); var ij = x.dataset.qX.split(':'); A.ed[Number(ij[0])].quando.splice(Number(ij[1]), 1); tudo(); return; }
      if (x.hasAttribute('data-ap-gravar')) {
        colher();
        var L = A.ed.map(function (e) { return { nome: String(e.nome || '').trim(), cor: e.cor, descricao: String(e.descricao || '').trim(), quando: (e.quando || []).map(function (q) { var o = { campo: q.campo, op: q.op }; if (q.op !== 'tem' && q.op !== 'vazio') o.valor = q.valor; return o; }) }; });
        var m = $('ap-msg');
        if (L.some(function (e) { return !e.nome; })) { if (m) { m.textContent = 'Toda etiqueta precisa de nome.'; m.className = 'ap-msg err'; } return; }
        x.disabled = true; if (m) { m.textContent = 'Gravando…'; m.className = 'ap-msg'; }
        ses.api('/api/pauta?etiquetas=1', { method: 'POST', body: JSON.stringify({ etiquetas: L }) }).then(function (j) {
          A.cat = j.catalogo || Object.assign({}, A.cat, { etiquetas: L }); A.ed = null; A.res = {}; tudo(); avisarAbas();
          if (typeof window.MutaRender === 'function') window.MutaRender();
        }).catch(function (er) { x.disabled = false; if (m) { m.textContent = 'Não gravou: ' + (er.message || 'erro'); m.className = 'ap-msg err'; } });
        return;
      }
    }
  function mudou(e) {
      var i = e.target;
      if (i.dataset.pz) { var c = Object.assign({}, A.cfg || {}); c[i.dataset.pz] = i.type === 'checkbox' ? i.checked : i.type === 'time' ? (i.value || '18:00') : Math.max(1, Number(i.value) || 1); gravarCfg(c); if (i.dataset.pz === 'dev') tudo(); return; }
      if (i.dataset.qf === 'op') { colher(); tudo(); }
      if (i.dataset.cf === 'cor' || i.dataset.cf === 'estilo' || i.dataset.cf === 'icone') { colherCat(); tudo(); }
    }

  /* ---------- atualização sem chrome://extensions ----------
     - os arquivos da pasta mudaram (atualizar-muta.cmd, ou ZIP extraído por cima): o manifest em disco traz versão
       diferente da carregada → a extensão se recarrega sozinha;
     - o site publica versão mais nova (/extensao/versao.json) → aviso na faixa do topo com o caminho. */
  var VER = { local: '', site: '' };
  function cmpV(a, b) { a = String(a).split('.').map(Number); b = String(b).split('.').map(Number); for (var i = 0; i < 3; i++) { var d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; }
  function olharDisco() {
    if (!temChrome || !chrome.runtime || !chrome.runtime.getURL) return;
    fetch(chrome.runtime.getURL('manifest.json') + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (m) {
      if (m && m.version && m.version !== VER.local) { try { chrome.runtime.reload(); } catch (e) {} }
    }).catch(function () {});
  }
  function olharSite() {
    var site = window.Muta && window.Muta.SITE; if (!site) return;
    fetch(site + '/extensao/versao.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      VER.site = j && j.versao || ''; aviso();
    }).catch(function () {});
  }
  function aviso() {
    var t0 = $('topo-u'), b = $('tu-nova'); if (!t0) return;
    var nova = VER.site && VER.local && cmpV(VER.site, VER.local) > 0;
    if (!nova) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'tu-nova'; b.className = 'tu-nova'; t0.insertBefore(b, $('tu-st') || null);
      b.addEventListener('click', function (e) { e.stopPropagation(); A.aba = 'ver'; abrir(true); }); }
    b.textContent = '↑ ' + VER.site; b.title = 'Versão nova do HERO18810 (' + VER.site + '; esta é ' + VER.local + '). Dê dois cliques em atualizar-muta.cmd, na pasta da extensão: o painel se recarrega sozinho.';
  }
  function pVersao() {
    return '<p class="ap-v">Instalada: <b>' + esc(VER.local) + '</b>' + (VER.site ? ' · no site: <b>' + esc(VER.site) + '</b>' : '') + '</p>' +
      (VER.site && cmpV(VER.site, VER.local) > 0 ? '<ol class="ap-ol"><li>Na pasta onde a extensão foi extraída, dê dois cliques em <b>atualizar-muta.cmd</b>.</li><li>Deixe este painel aberto: ele se recarrega sozinho em alguns segundos.</li><li>Recarregue a aba do PJe.</li></ol><small class="muted">Sem o arquivo (versões até 0.19.0): baixe o ZIP uma última vez e extraia sobre a mesma pasta.</small>' : '<small class="muted">Está em dia.</small>');
  }
  function iniciarVersao() {
    try { VER.local = chrome.runtime.getManifest().version; } catch (e) { return; }
    setInterval(olharDisco, 8000);
    olharSite(); setInterval(olharSite, 30 * 60e3);
  }

  window.MutaAlertas = { controle: controle, resumoJa: resumoJa, esquecer: esquecer, htmlRoteiro: htmlRoteiro, catalogo: lerCatalogo, montar: montar, sincronizarPerfil: sino, _A: A };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
