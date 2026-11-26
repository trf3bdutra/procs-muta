/* Muta · service worker
   - o ícone da extensão abre o painel lateral;
   - recebe do conteudo-pje.js o número do processo que cada quadro da aba vê e guarda em
     chrome.storage.session ("aba:<id>"), que o painel lê para acompanhar a aba ativa.
   O PJe 2º grau monta a tela em quadros: a página de pje2g, o painel de tarefas (frontend-pje) e a tarefa aberta
   (pje2g de novo). Cada quadro informa o que vê, com a força da leitura; vale o mais forte e, no empate, o mais recente.
   Nada sai do navegador: só o número do processo, e só dentro da extensão. */
'use strict';
try { importScripts('etiquetas.js'); } catch (e) {}

/* Depois de instalar ou atualizar a extensão, as abas do PJe já abertas ficam sem o leitor (o Chrome só o põe em páginas
   carregadas depois): injeta o conteudo-pje.js nelas, em todos os quadros, para o painel funcionar sem recarregar a página. */
function injetarNasAbasAbertas() {
  if (!chrome.scripting || !chrome.tabs) return;
  chrome.tabs.query({ url: ['https://pje2g.trf3.jus.br/*', 'https://frontend-pje.app.trf3.jus.br/*'] }).then(function (abas) {
    (abas || []).forEach(function (t) {
      chrome.scripting.executeScript({ target: { tabId: t.id, allFrames: true }, files: ['etiquetas.js', 'cmt.js', 'conteudo-pje.js', 'tarefas-pje.js'] }).catch(function () {});
    });
  }).catch(function () {});
  chrome.tabs.query({url:["https://pje1g.trf3.jus.br/*","https://pje1g-jus.trf3.jus.br/*"]}).then(function(abas){(abas||[]).forEach(function(t){chrome.scripting.executeScript({target:{tabId:t.id,allFrames:true},files:['conteudo-1g.js']}).catch(function(){});});}).catch(function(){});
}
chrome.runtime.onInstalled.addListener(function () {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(function () {});
  injetarNasAbasAbertas();
});
chrome.runtime.onStartup.addListener(function () {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(function () {});
});

var CNJ = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

function consolidar(reg) {
  var fr = reg.quadros || {}, melhor = null;
  Object.keys(fr).forEach(function (k) {
    var q = fr[k];
    if (!q || !q.numero) return;
    if (!melhor || (q.forca || 1) > (melhor.forca || 1) || ((q.forca || 1) === (melhor.forca || 1) && q.t > melhor.t)) melhor = q;
  });
  reg.numero = melhor ? melhor.numero : '';
  reg.host = melhor ? melhor.host || '' : '';
  reg.classe = melhor ? (melhor.classe || '') : '';
  reg.via = melhor ? (melhor.via || '') : '';
  var aut = Object.keys(fr).map(function(k){return fr[k];}).filter(function(q){return q&&melhor&&q.numero===melhor.numero&&q.host===melhor.host&&q.classeJudicial;}).sort(function(a,b){return b.t-a.t;})[0];
  reg.classeJudicial=aut?aut.classeJudicial:'';reg.assuntoCNJ=aut?aut.assuntoCNJ||'':'';
  /* nome da tarefa aberta ("[Sessão] Aguardando a sessão"): de qualquer quadro com o mesmo número */
  reg.tarefa = '';
  Object.keys(fr).forEach(function (k) { var q = fr[k]; if (q && q.tarefa && melhor && q.numero === melhor.numero && !reg.tarefa) reg.tarefa = q.tarefa; });
  /* 0.67: caixas de liberação do editor (de qualquer quadro do mesmo processo) */
  reg.lib = ''; Object.keys(fr).forEach(function (k) { var q = fr[k]; if (q && q.lib && melhor && q.numero === melhor.numero && !reg.lib) reg.lib = q.lib; });
  /* contexto da tela: autos digitais em qualquer quadro; editor da minuta em qualquer quadro (o quadro do editor pode não ver o número) */
  var ks = Object.keys(fr);
  reg.ctx = ks.some(function (k) { return fr[k] && fr[k].ctx === 'autos'; }) ? 'autos' : (melhor && melhor.ctx) || '';
  reg.ed = ks.some(function (k) { return fr[k] && fr[k].ed; });
  return reg;
}

/* gravações em fila, por aba, para dois quadros não se sobreporem */
var fila = {};
function emFila(chave, f) {
  var p = (fila[chave] || Promise.resolve()).then(f, f);
  fila[chave] = p.catch(function () {});
  return p;
}

chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (!msg || msg.tipo !== 'muta-processo' || !sender.tab) return;
  var numero = typeof msg.numero === 'string' && CNJ.test(msg.numero) ? msg.numero : '';
  var classe = typeof msg.classe === 'string' ? msg.classe.slice(0, 20) : '';
  var forca = numero ? Math.max(1, Math.min(3, Number(msg.forca) || 1)) : 0;
  var chave = 'aba:' + sender.tab.id, quadro = String(sender.frameId || 0);
  emFila(chave, function () {
    return chrome.storage.session.get(chave).then(function (o) {
      var reg = o[chave] || { quadros: {} };
      var host = ''; try { host = new URL(sender.url || sender.tab.url).hostname; } catch (e) {}
      reg.quadros[quadro] = { host: host, numero: numero, classe: classe, classeJudicial: numero&&typeof msg.classeJudicial==='string'?msg.classeJudicial.slice(0,200):'', assuntoCNJ: numero&&typeof msg.assuntoCNJ==='string'?msg.assuntoCNJ.slice(0,500):'', forca: forca, via: String(msg.via || '').slice(0, 20), ctx: String(msg.ctx || '').slice(0, 10), ed: !!msg.ed, tarefa: typeof msg.tarefa === 'string' ? msg.tarefa.slice(0, 120) : '', lib: /^\d{1,2}\/\d{1,2}$/.test(String(msg.lib || '')) ? msg.lib : '', t: Date.now() };
      consolidar(reg);
      var s = {}; s[chave] = reg;
      return chrome.storage.session.set(s);
    });
  });
});

/* A página principal da aba foi trocada (endereço novo): os quadros antigos deixam de valer.
   Recargas de quadros internos (a tarefa aberta, o painel) não apagam o registro: cada quadro informa de novo. */
chrome.tabs.onUpdated.addListener(function (tabId, info) {
  if (info.status !== 'loading' || !info.url) return;
  var chave = 'aba:' + tabId;
  emFila(chave, function () { return chrome.storage.session.remove(chave); });
});
chrome.tabs.onRemoved.addListener(function (tabId) {
  chrome.storage.session.remove('aba:' + tabId).catch(function () {});
});

/* ---------- 0.19 · lista de tarefas do PJe: resumos em lote, catálogo de etiquetas, prazos e avisos ----------
   O leitor do PJe manda os números dos cartões da lista; aqui se busca o resumo de cada um (GET /api/pauta?fichas=…,
   com o login da equipe), o catálogo de etiquetas do gabinete e os limites dos alertas. Os alertas vermelhos novos viram
   aviso do Chrome (uma vez por dia por processo e tipo) e o número de processos com alerta aparece no ícone da extensão. */
var SITE = 'https://www.gabinete-cmt.com', RES = {}, CAT = { t: 0, v: null };
function cfgPrazos() { return chrome.storage.local.get('muta-prazos').then(function (o) { return Object.assign({}, (self.MutaEtiquetas || {}).CFG || {}, o['muta-prazos'] || {}); }); }
function catalogo() {
  if (CAT.v && Date.now() - CAT.t < 600e3) return Promise.resolve(CAT.v);
  return fetch(SITE + '/api/pauta?etiquetas=1', { credentials: 'include', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { CAT = { t: Date.now(), v: (j && j.catalogo) || { etiquetas: [] } }; if (j) chrome.storage.local.set({ 'muta-gestor': !!j.gestor }); return CAT.v; }, function () { return CAT.v || { etiquetas: [] }; });
}
function resumos(cnjs) {
  var agora = Date.now(), falta = cnjs.filter(function (k) { return !RES[k] || agora - RES[k].t > 120e3; });
  var lotes = []; for (var i = 0; i < falta.length; i += 100) lotes.push(falta.slice(i, i + 100));
  return Promise.all(lotes.map(function (L) {
    return fetch(SITE + '/api/pauta?fichas=' + L.join(','), { credentials: 'include', cache: 'no-store' }).then(function (r) {
      if (r.status === 401) throw new Error('login'); return r.ok ? r.json() : { resumos: {} };
    }).then(function (j) { Object.keys(j.resumos || {}).forEach(function (k) { RES[k] = { t: Date.now(), r: j.resumos[k] }; }); });
  })).then(function () { var o = {}; cnjs.forEach(function (k) { if (RES[k]) o[k] = RES[k].r; }); return o; });
}
/* alertas da lista (urgência não apreciada, intercorrência, tempo na tarefa…): ficam só no sino do painel.
   Notificação do Chrome e número no ícone são só para chegadas com urgência e avisos do app (decisão do gestor, 21/11/2026). */
function avisar(cnjs, R, cfg) {
  var E = self.MutaEtiquetas; if (!E) return Promise.resolve();
  var itens = cnjs.filter(function (k) { return R[k]; }).map(function (k) { var r = E.preparar(R[k]); return { k: k, etapa: E.etapa(r), alertas: E.alertas(r, cfg), servidor: r.servidor || '' }; })
    .filter(function (x) { return x.alertas.length; });
  return chrome.storage.session.set({ 'muta-alertas': { em: new Date().toISOString(), itens: itens } }).catch(function () {});
}
chrome.runtime.onMessage.addListener(function (msg, sender, responder) {
  if (!msg || msg.tipo !== 'muta-resumos') return;
  var cnjs = (Array.isArray(msg.cnjs) ? msg.cnjs : []).map(function (x) { return String(x).replace(/\D/g, ''); }).filter(function (x) { return x.length === 20; }).slice(0, 300);
  Promise.all([resumos(cnjs), catalogo(), cfgPrazos()]).then(function (v) {
    responder({ resumos: v[0], catalogo: v[1], cfg: v[2] });
    if (msg.lista) { avisar(cnjs, v[0], v[2]); chegadas(cnjs, msg.textos || {}, msg.tarefa || '', v[0]); }
  }, function (e) { responder({ erro: e && e.message === 'login' ? 'Entre no painel do HERO18810 para ver os selos.' : String(e && e.message || e) }); });
  return true;
});
/* o painel pede para esquecer o cache (catálogo editado, ficha gravada) */
chrome.runtime.onMessage.addListener(function (msg) { if (msg && msg.tipo === 'muta-resumos-limpar') { RES = {}; CAT = { t: 0, v: null }; } });


/* ---------- 0.21 · notificações do app, chegadas do PJe (só o gestor) e relatório do fim do dia ----------
   Distinção visual: chegadas do PJe com ícone laranja; avisos do app do gabinete com ícone azul e título "Gabinete ·".
   O número no ícone da extensão soma chegadas urgentes do dia (vermelho) e avisos do app (azul). */
var BADGE = { pje: 0, app: 0 };
function badge() {
  var n = BADGE.pje + BADGE.app;
  try { chrome.action.setBadgeBackgroundColor({ color: BADGE.pje ? '#c4402f' : '#2f6fb0' }); chrome.action.setBadgeText({ text: n ? String(n) : '' }); } catch (e) {}
}
function fmtCnj(k) { return String(k).replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6'); }
function diaMS(t) { return new Date((t || Date.now()) - 4 * 3600e3).toISOString().slice(0, 10); }

/* chegadas: número que aparece na lista do gestor sem nunca ter sido visto e que é novo no gabinete
   (sem ficha no acervo, ou entrou na tarefa há no máximo 2 dias). Na primeira vez, a lista vira a base, sem avisos. */
var URG_RX = [[/liminar/i, 'liminar'], [/tutela (de urg|antecip|provis)|antecipa[çc][ãa]o (de|da) tutela/i, 'tutela de urgência'], [/efeito suspensivo/i, 'efeito suspensivo'],
  [/urg[êe]n/i, 'urgência'], [/medicamento|f[áa]rmaco/i, 'medicamento'], [/cirurgi|interna[çc]|leito|uti\b/i, 'saúde (procedimento)'], [/oncol|c[âa]ncer|neoplas/i, 'oncológico'],
  [/idos[oa]|estatuto da pessoa idosa|maior de 80/i, 'pessoa idosa'], [/doen[çc]a grave|portador de doen/i, 'doença grave'], [/r[ée]u preso|habeas corpus/i, 'réu preso / HC'],
  [/bloqueio|sequestro de valores|penhora online/i, 'bloqueio de valores'], [/plant[ãa]o/i, 'plantão'], [/reconsidera/i, 'reconsideração']];
function motivosDe(texto, r) {
  var M = []; URG_RX.forEach(function (x) { if (x[0].test(texto || '') && M.indexOf(x[1]) < 0) M.push(x[1]); });
  if (r && r.urg && M.indexOf(String(r.urg).toLowerCase()) < 0) M.unshift(String(r.urg).toLowerCase());
  if (r && /idos|doen|defici/i.test(r.prioridade || '') && M.indexOf('prioridade legal') < 0) M.push('prioridade legal');
  return M;
}
function diasDoCartao(t) { var D = [], m, re = /\b\d{2}-\d{2}-\d{2}\s*\((\d{1,4})\)/g; while ((m = re.exec(t))) D.push(Number(m[1])); return D; }
function urgente(M) { return M.some(function (m) { return !/^(pessoa idosa|prioridade legal|reconsideração)$/.test(m); }); }
function chegadas(cnjs, textos, tarefa, R) {
  return chrome.storage.local.get(['muta-gestor', 'muta-vistos', 'muta-chegadas', 'muta-prazos']).then(function (o) {
    if (!o['muta-gestor']) return;
    var cfg = Object.assign({ chegadas: true }, o['muta-prazos'] || {}); if (cfg.chegadas === false) return;
    var V = o['muta-vistos'] || {}, agora = new Date().toISOString(), L = o['muta-chegadas'] || [], novos = [];
    cnjs.forEach(function (k) {
      if (V[k]) return; V[k] = agora.slice(0, 10);
      var r = R[k] || null, entrou = r && r.desde ? Date.parse(r.desde) : NaN, dias = diasDoCartao(textos[k] || '');
      /* chegou: o cartão mostra só datas recentes (entrada na tarefa, último movimento e conclusão em até 2 dias) */
      var novo = dias.length ? Math.max.apply(null, dias) <= 2 : (isFinite(entrou) && Date.now() - entrou <= 2 * 864e5);
      if (!novo) return;
      var M = motivosDe(textos[k] || '', r);
      novos.push({ k: k, em: agora, urg: urgente(M), motivos: M, tarefa: tarefa || (r && r.tarefa) || '', texto: (textos[k] || '').slice(0, 500) });
    });
    var corte = Date.now() - 45 * 864e5; L = L.filter(function (x) { return Date.parse(x.em) > corte; }).concat(novos);
    var corteV = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10); Object.keys(V).forEach(function (k) { if (V[k] < corteV) delete V[k]; });
    var hoje = diaMS(); BADGE.pje = L.filter(function (x) { return x.urg && diaMS(Date.parse(x.em)) === hoje; }).length; badge();
    return chrome.storage.local.set({ 'muta-vistos': V, 'muta-chegadas': L }).then(function () {
      if (!novos.length) return;
      novos.filter(function (x) { return x.urg; }).slice(0, 4).forEach(function (x) {
        chrome.notifications.create('cheg:' + x.k, { type: 'basic', iconUrl: 'icones/pje-128.png', title: 'Chegada urgente · ' + fmtCnj(x.k), message: x.motivos.join(', ') + (x.tarefa ? ' · ' + x.tarefa : ''), contextMessage: 'Chegou ao gabinete pelo PJe', priority: 2, requireInteraction: true });
      });
      fetch(SITE + '/api/pauta?chegadas=1', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itens: novos }) }).catch(function () {});
    });
  }).catch(function () {});
}

/* relatório do fim do dia: todas as chegadas do dia, na hora escolhida (padrão 18:00) */
function agendarRelatorio() {
  return chrome.storage.local.get('muta-prazos').then(function (o) {
    var h = String((o['muta-prazos'] || {}).relHora || '18:00').split(':'), d = new Date();
    d.setHours(Number(h[0]) || 18, Number(h[1]) || 0, 0, 0); if (d.getTime() <= Date.now() + 30e3) d.setDate(d.getDate() + 1);
    chrome.alarms.create('muta-relatorio', { when: d.getTime(), periodInMinutes: 1440 });
  });
}
function relatorio() {
  return chrome.storage.local.get(['muta-gestor', 'muta-chegadas', 'muta-prazos']).then(function (o) {
    if (!o['muta-gestor'] || (o['muta-prazos'] || {}).relatorio === false) return;
    var hoje = diaMS(), L = (o['muta-chegadas'] || []).filter(function (x) { return diaMS(Date.parse(x.em)) === hoje; }), u = L.filter(function (x) { return x.urg; }).length;
    chrome.notifications.create('rel:' + hoje, { type: 'basic', iconUrl: 'icones/pje-128.png', title: 'Relatório de chegadas · ' + hoje.split('-').reverse().join('/'),
      message: L.length ? L.length + (L.length === 1 ? ' processo chegou' : ' processos chegaram') + (u ? ' · ' + u + ' com urgência' : '') : 'Nenhuma chegada vista hoje na lista do PJe.', contextMessage: 'Toque para abrir o relatório', priority: 1, requireInteraction: true });
  });
}

/* notificações do app do gabinete (/api/notificacoes): as novas viram aviso do Chrome; a lista fica para o sino do painel */
function lerApp() {
  return fetch(SITE + '/api/notificacoes', { credentials: 'include', cache: 'no-store' }).then(function (r) { if (r.status === 401) return null; return r.ok ? r.json() : null; }).then(function (j) {
    if (!j) return;
    var ev = (j.events || []).slice(0, 60);
    return chrome.storage.local.get(['muta-app-vistos', 'muta-prazos', 'muta-app-badge-vistos']).then(function (o) {
      var vistos = o['muta-app-vistos'], cfg = Object.assign({ avisosApp: true }, o['muta-prazos'] || {}), primeira = !vistos; vistos = vistos || {};
      var novos = ev.filter(function (e) { return !vistos[e.id]; });
      novos.forEach(function (e) { vistos[e.id] = Date.now(); });
      Object.keys(vistos).forEach(function (k) { if (Date.now() - vistos[k] > 30 * 864e5) delete vistos[k]; });
      var bv = o['muta-app-badge-vistos'] || {};
      var naoLidos = ev.filter(function (e) { return !e.resolved && !bv[e.id] && (e.nivel === 'urgente' || e.nivel === 'importante'); });
      BADGE.app = naoLidos.length > 9 ? 9 : naoLidos.length; badge();
      var p = chrome.storage.session.set({ 'muta-app': { em: new Date().toISOString(), eventos: ev } });
      if (!primeira && cfg.avisosApp !== false) novos.filter(function (e) { return e.origem !== 'pje' && e.nivel !== 'info'; }).slice(0, 3).forEach(function (e) {
        chrome.notifications.create('app:' + e.id, { type: 'basic', iconUrl: 'icones/app-128.png', title: 'Gabinete · ' + (e.title || 'aviso'), message: e.message || '', contextMessage: 'App do gabinete' + (e.user ? ' · ' + e.user : ''), priority: e.nivel === 'urgente' ? 2 : 1 });
      });
      return Promise.all([p, chrome.storage.local.set({ 'muta-app-vistos': vistos })]);
    });
  }).catch(function () {});
}
chrome.alarms.onAlarm.addListener(function (a) { if (a.name === 'muta-app') lerApp(); else if (a.name === 'muta-relatorio') relatorio(); });
function iniciarAlarmes() { chrome.alarms.create('muta-app', { periodInMinutes: 5, delayInMinutes: 0.2 }); agendarRelatorio(); }
chrome.runtime.onInstalled.addListener(iniciarAlarmes);
chrome.runtime.onStartup.addListener(iniciarAlarmes);
chrome.storage.onChanged.addListener(function (ch, area) { if (area === 'local' && ch['muta-prazos']) agendarRelatorio(); });
/* 0.77.57: o painel avisa que as notificações foram vistas (aba Notificações aberta ou "Marcar todas como lidas"); o número do ícone se limpa até chegar aviso novo */
function appVisto() {
  return chrome.storage.session.get('muta-app').then(function (o) {
    var ev = ((o['muta-app'] || {}).eventos) || [];
    return chrome.storage.local.get('muta-app-badge-vistos').then(function (s) {
      var bv = s['muta-app-badge-vistos'] || {}, agora = Date.now();
      ev.forEach(function (e) { if (e && e.id && !bv[e.id]) bv[e.id] = agora; });
      Object.keys(bv).forEach(function (k) { if (agora - bv[k] > 30 * 864e5) delete bv[k]; });
      BADGE.app = 0; badge();
      return chrome.storage.local.set({ 'muta-app-badge-vistos': bv });
    });
  }).catch(function () {});
}
chrome.runtime.onMessage.addListener(function (msg) { if (msg && msg.tipo === 'muta-app-visto') appVisto(); if (msg && msg.tipo === 'muta-app-ler') lerApp(); if (msg && msg.tipo === 'muta-relatorio-teste') relatorio(); });
chrome.notifications.onClicked.addListener(function (id) {
  var abrir = function (url) { chrome.tabs.create({ url: url }); chrome.notifications.clear(id); };
  if (/^(rel|cheg):/.test(id)) return abrir(chrome.runtime.getURL('relatorio.html') + (/^rel:/.test(id) ? '#' + id.slice(4) : ''));
  if (/^app:/.test(id)) return chrome.storage.session.get('muta-app').then(function (o) {
    var e = ((o['muta-app'] || {}).eventos || []).filter(function (x) { return 'app:' + x.id === id; })[0] || {};
    abrir(e.link && /^https:\/\//.test(e.link) ? e.link : SITE + '/exofficio/');
  });
  chrome.notifications.clear(id);
});


/* ---------- 0.24 · sinalizações gravadas pelo quadro do PJe: marcar como resolvida, reabrir e incluir ----------
   O quadro (conteudo-pje.js) manda {tipo:'muta-sinal', cnj, campo:'av'|'pd'|'ic'|'nt', acao:'resolver'|'reabrir'|'incluir', linha|texto};
   aqui se lê a ficha atual, muda só a linha e grava (POST /api/pauta?ficha=1), com o login da equipe. */
var CAMPO_SIN = { av: ['triagem', 'Avisos'], pd: ['triagem', 'O que falta sanar'], ic: ['triagem', 'Intercorrências'], nt: ['origem', 'Observações'] }, QUEM = { v: '', t: 0 };
function quem() {
  if (QUEM.v && Date.now() - QUEM.t < 600e3) return Promise.resolve(QUEM.v);
  return fetch(SITE + '/api/login', { credentials: 'include', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { QUEM = { v: j.usuario || '', t: Date.now() }; return QUEM.v; }, function () { return ''; });
}
function p2(n) { return (n < 10 ? '0' : '') + n; }
chrome.runtime.onMessage.addListener(function (msg, sender, responder) {
  if (!msg || msg.tipo !== 'muta-sinal') return;
  var k = String(msg.cnj || '').replace(/\D/g, ''), cp = CAMPO_SIN[msg.campo];
  if (k.length !== 20 || !cp) { responder({ erro: 'pedido inválido' }); return; }
  var cnj = fmtCnj(k);
  Promise.all([fetch(SITE + '/api/pauta?ficha=' + encodeURIComponent(cnj), { credentials: 'include', cache: 'no-store' }).then(function (r) { if (r.status === 401) throw new Error('Entre no painel do HERO18810 para registrar.'); if (!r.ok) throw new Error('ficha ilegível (' + r.status + ')'); return r.json(); }), quem()]).then(function (v) {
    var op = v[0].operacional || {}, atual = String(((op[cp[0]] || {})[cp[1]]) || ''), L = atual.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var semMarca = function (x) { return x.replace(/^✓\s*/, ''); }, alvo = semMarca(String(msg.linha || '').trim());
    var i = L.map(semMarca).indexOf(alvo), d = new Date(), u = v[1] || 'equipe';
    if (msg.acao === 'resolver' || msg.acao === 'reabrir') { if (i < 0) throw new Error('A linha mudou na ficha; reabra o quadro.'); L[i] = msg.acao === 'resolver' ? '✓ ' + semMarca(L[i]) : semMarca(L[i]); }
    else if (msg.acao === 'incluir') {
      var t = String(msg.texto || '').replace(/\s*\n+\s*/g, ' ').trim().slice(0, 600); if (!t) throw new Error('texto vazio');
      L.push(msg.campo === 'nt' ? p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ' · ' + u + ' · ' + t : t + ' · ' + u + ' · ' + p2(d.getDate()) + '/' + p2(d.getMonth() + 1));
    } else throw new Error('ação inválida');
    var campos = {}; campos[cp[0] + '.' + cp[1]] = L.join('\n');
    return fetch(SITE + '/api/pauta?ficha=1', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cnj: cnj, campos: campos }) }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.erro || ('não gravou (' + r.status + ')')); if ((j.recusados || []).length) throw new Error('sem permissão para gravar este campo'); });
    });
  }).then(function () { delete RES[k]; return resumos([k]); }).then(function (R) { responder({ ok: true, resumo: R[k] || null }); }, function (e) { responder({ erro: e && e.message || String(e) }); });
  return true;
});


/* ---------- 0.30 · quadro do Desembargador: decisões para assinatura e dúvidas (página /cmt) ----------
   Para o perfil desembargador e para o gestor. Lido a cada minuto (GET /api/painel?cmt=1); o que chega de novo
   vira notificação só para o Desembargador. As ações (assinar, devolver, responder) vão com origem "extensao",
   e o servidor manda cópia ao gestor. Os dados ficam em storage.session › muta-cmt, para o PJe e o sino. */
var CMTD = { t: 0, v: null, q: null };
function perfilCmt() {
  if (CMTD.q && Date.now() - CMTD.q.t < 600e3) return Promise.resolve(CMTD.q.j);
  return fetch(SITE + '/api/login', { credentials: 'include', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }, function () { return {}; }).then(function (j) { CMTD.q = { t: Date.now(), j: j || {} }; return CMTD.q.j; });
}
function lerCmt(forcar) {
  if (!forcar && CMTD.v && Date.now() - CMTD.t < 50e3) return Promise.resolve(CMTD.v);
  return perfilCmt().then(function (j) {
    if (!j.usuario) return { fora: true, erro: 'Entre no painel do HERO18810 para ver o quadro do Desembargador.' };
    if (!(j.desembargador || j.gestor)) return { fora: true };
    return fetch(SITE + '/api/painel?cmt=1', { credentials: 'include', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return CMTD.v || { erro: 'Quadro do Desembargador indisponível agora.' };
      var v = { em: new Date().toISOString(), usuario: j.usuario, gestor: !!j.gestor, des: !!j.desembargador,
        assinatura: (d.assinar || {}).assinatura || [], liberacao: (d.assinar || {}).liberacao || [], duvidas: d.duvidas || [],
        pedidos: d.pedidos || [], hoje: d.hoje || '', pauta: { date: (d.pauta || {}).date || '', itens: ((d.pauta || {}).itens || []).map(function (x) { return { cnj: x.cnj, obs: x.obs || '' }; }) } };
      CMTD.t = Date.now(); CMTD.v = v;
      return chrome.storage.session.set({ 'muta-cmt': v }).catch(function () {}).then(function () { return avisarCmt(v); }).then(function () { return v; });
    });
  }).catch(function (e) { return CMTD.v || { erro: String(e && e.message || e) }; });
}
function avisarCmt(v) {
  return chrome.storage.local.get('muta-cmt-vistos').then(function (o) {
    var vis = o['muta-cmt-vistos'], primeira = !vis; vis = vis || {};
    var urgAtiva = function (a) { return !!(a && a.urg && a.urg.tipo && !/^Apreciada/i.test(String(a.urg.situacao || ''))); };
    var ev = v.assinatura.filter(urgAtiva).map(function (a) { return { id: 'as-' + a.cnj + '-' + (a.desde || ''), t: 'Para assinatura · ' + a.cnj, m: [a.tipoAto, a.titulo || a.topico].filter(Boolean).join(' · '), c: (a.servidor ? 'Minuta: ' + a.servidor : '') + (a.urg ? ' · urgente' : ''), u: !!a.urg }; })
      .concat((v.pedidos || []).map(function (p) { return { id: 'pe-' + p.id, t: (p.tipo === 'retirada' ? 'Pedido de retirada de pauta' : 'Pedido de adiamento') + (p.numero ? ' · ' + p.numero : ''), m: String(p.razao || p.texto || p.titulo || '').slice(0, 180), c: p.de ? 'De ' + p.de : '', u: false }; }))
      .concat(v.duvidas.map(function (d) { return { id: 'du-' + d.id, t: 'Dúvida · ' + (d.titulo || ''), m: String(d.texto || '').slice(0, 180), c: d.de ? 'De ' + d.de : '', u: /alta|urg/i.test(d.prioridade || '') }; }));
    var novos = ev.filter(function (e) { return !vis[e.id]; });
    ev.forEach(function (e) { vis[e.id] = vis[e.id] || Date.now(); });
    Object.keys(vis).forEach(function (k) { if (Date.now() - vis[k] > 60 * 864e5) delete vis[k]; });
    if (!primeira && v.des) novos.slice(0, 4).forEach(function (e) {
      chrome.notifications.create('cmt:' + e.id, { type: 'basic', iconUrl: 'icones/app-128.png', title: 'Gabinete · ' + e.t, message: e.m || '', contextMessage: e.c || 'Quadro do Desembargador', priority: e.u ? 2 : 1, requireInteraction: !!e.u });
    });
    return chrome.storage.local.set({ 'muta-cmt-vistos': vis });
  }).catch(function () {});
}
chrome.alarms.onAlarm.addListener(function (a) { if (a.name === 'muta-cmt') lerCmt(true); });
function alarmeCmt() { chrome.alarms.create('muta-cmt', { periodInMinutes: 1, delayInMinutes: 0.3 }); }
chrome.runtime.onInstalled.addListener(alarmeCmt);
chrome.runtime.onStartup.addListener(alarmeCmt);
chrome.notifications.onClicked.addListener(function (id) {
  if (!/^cmt:/.test(id)) return;
  chrome.notifications.clear(id);
  /* abre a janela do HERO com o item da notificação na frente (cmt.html), como os demais avisos */
  var m = /^cmt:(as|du)-(.+)$/.exec(id), alvo = '';
  if (m && m[1] === 'as') alvo = 'as:' + m[2].replace(/-\d{4}-\d{2}-\d{2}.*$|-$/, '');
  else if (m) alvo = 'du:' + m[2];
  chrome.windows.create({ url: chrome.runtime.getURL('cmt.html') + (alvo ? '#' + encodeURIComponent(alvo) : ''), type: 'popup', width: 600, height: 820, focused: true }).catch(function () { chrome.tabs.create({ url: SITE + '/cmt/' }); });
});
/* pedido de retirada ou de adiamento (quadro do Desembargador no PJe): deferido, a pauta registra Retirado/Adiado
   com a observação de praxe (como Deliberações › gestao.js); depois a resposta ao pedido. Cópia ao gestor pelo servidor. */
function postCmt(corpo) {
  return fetch(SITE + '/api/painel?cmt=1', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ origem: 'extensao' }, corpo)) }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.erro || ('não gravou (' + r.status + ')')); return j; });
  });
}
function pedidoCmt(msg) {
  var v = CMTD.v || {}, p = (v.pedidos || []).filter(function (x) { return x.id === msg.id; })[0];
  if (!p) return Promise.resolve({ erro: 'Pedido não encontrado; atualize o quadro.' });
  var defere = msg.decisao === 'defere', ret = p.tipo === 'retirada', dg = function (s) { return String(s || '').replace(/\D/g, ''); };
  var dt = function (d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  var sessao = p.sessao || (v.pauta || {}).date || '';
  if (defere && !sessao) return Promise.resolve({ erro: 'Não deferiu: o pedido não indica a sessão.' });
  var nota = String(msg.texto || '').trim().slice(0, 600);
  var it = ((v.pauta || {}).itens || []).filter(function (x) { return dg(x.cnj) === dg(p.numero); })[0] || {};
  var hj = v.hoje || new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
  var praxe = (ret ? 'Retirado de pauta' : 'Adiado') + ' em ' + dt(hj) + ' por decisão do relator' + (p.de ? ', a pedido de ' + p.de : '') + '.';
  var o = String(it.obs || '').trim(), obs = !o ? praxe : o.indexOf(praxe) >= 0 ? o : o + ' · ' + praxe;
  var texto = (ret ? 'Retirada ' + (defere ? 'deferida.' : 'indeferida.') : 'Adiamento ' + (defere ? 'deferido.' : 'indeferido.')) + (nota ? ' ' + nota : '');
  return (defere ? postCmt({ acao: 'situacao', sessao: sessao, cnj: p.numero, valor: ret ? 'Retirado' : 'Adiado', obs: obs }) : Promise.resolve())
    .then(function () { return postCmt({ acao: 'responder', id: p.id, texto: texto }); })
    .then(function (j) { return lerCmt(true).then(function (d) { return { ok: true, r: j, dados: d }; }); });
}
chrome.runtime.onMessage.addListener(function (msg, sender, responder) {
  if (!msg || (msg.tipo !== 'muta-cmt' && msg.tipo !== 'muta-cmt-acao')) return;
  if (msg.tipo === 'muta-cmt') { lerCmt(!!msg.forcar).then(responder); return true; }
  var ACOES = { assinar: 1, devolver: 1, responder: 1, pedido: 1 };
  if (!ACOES[msg.acao]) { responder({ erro: 'ação inválida' }); return; }
  if (msg.acao === 'pedido') { pedidoCmt(msg).then(responder, function (e) { responder({ erro: e && e.message || String(e) }); }); return true; }
  var corpo = { acao: msg.acao, origem: 'extensao' };
  ['cnj', 'id', 'texto', 'para', 'sessao'].forEach(function (k) { if (msg[k]) corpo[k] = String(msg[k]).slice(0, 2000); });
  if (msg.manter) corpo.manter = true; if (msg.desfazer) corpo.desfazer = true;
  fetch(SITE + '/api/painel?cmt=1', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.erro || ('não gravou (' + r.status + ')')); return j; });
  }).then(function (j) { return lerCmt(true).then(function (v) { responder({ ok: true, r: j, dados: v }); }); }, function (e) { responder({ erro: e && e.message || String(e) }); });
  return true;
});
