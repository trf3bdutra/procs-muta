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
      chrome.scripting.executeScript({ target: { tabId: t.id, allFrames: true }, files: ['etiquetas.js', 'conteudo-pje.js'] }).catch(function () {});
    });
  }).catch(function () {});
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
  reg.classe = melhor ? (melhor.classe || '') : '';
  reg.via = melhor ? (melhor.via || '') : '';
  /* nome da tarefa aberta ("[Sessão] Aguardando a sessão"): de qualquer quadro com o mesmo número */
  reg.tarefa = '';
  Object.keys(fr).forEach(function (k) { var q = fr[k]; if (q && q.tarefa && melhor && q.numero === melhor.numero && !reg.tarefa) reg.tarefa = q.tarefa; });
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
      reg.quadros[quadro] = { numero: numero, classe: classe, forca: forca, via: String(msg.via || '').slice(0, 20), ctx: String(msg.ctx || '').slice(0, 10), ed: !!msg.ed, tarefa: typeof msg.tarefa === 'string' ? msg.tarefa.slice(0, 120) : '', t: Date.now() };
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
    .then(function (j) { CAT = { t: Date.now(), v: (j && j.catalogo) || { etiquetas: [] } }; return CAT.v; }, function () { return CAT.v || { etiquetas: [] }; });
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
function avisar(cnjs, R, cfg) {
  var E = self.MutaEtiquetas; if (!E) return Promise.resolve();
  var itens = cnjs.filter(function (k) { return R[k]; }).map(function (k) { var r = E.preparar(R[k]); return { k: k, etapa: E.etapa(r), alertas: E.alertas(r, cfg), servidor: r.servidor || '' }; })
    .filter(function (x) { return x.alertas.length; });
  var nAl = itens.filter(function (x) { return x.alertas.some(function (a) { return a.nivel === 'al'; }); }).length;
  try { chrome.action.setBadgeBackgroundColor({ color: '#c4402f' }); chrome.action.setBadgeText({ text: nAl ? String(nAl) : '' }); } catch (e) {}
  return chrome.storage.session.set({ 'muta-alertas': { em: new Date().toISOString(), itens: itens } }).then(function () {
    if (!cfg.avisos || !chrome.notifications) return;
    return chrome.storage.local.get('muta-avisados').then(function (o) {
      var vistos = o['muta-avisados'] || {}, hoje = Date.now(), novos = 0;
      Object.keys(vistos).forEach(function (x) { if (hoje - vistos[x] > 864e5) delete vistos[x]; });
      itens.forEach(function (x) { x.alertas.filter(function (a) { return a.nivel === 'al'; }).forEach(function (a) {
        var id = x.k + ':' + a.k; if (vistos[id] || novos >= 3) return; vistos[id] = hoje; novos++;
        var cnj = x.k.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6');
        chrome.notifications.create('muta:' + id, { type: 'basic', iconUrl: 'icones/128.png', title: 'HERO18810 · ' + cnj, message: a.t, priority: 1 });
      }); });
      return chrome.storage.local.set({ 'muta-avisados': vistos });
    });
  }).catch(function () {});
}
chrome.runtime.onMessage.addListener(function (msg, sender, responder) {
  if (!msg || msg.tipo !== 'muta-resumos') return;
  var cnjs = (Array.isArray(msg.cnjs) ? msg.cnjs : []).map(function (x) { return String(x).replace(/\D/g, ''); }).filter(function (x) { return x.length === 20; }).slice(0, 300);
  Promise.all([resumos(cnjs), catalogo(), cfgPrazos()]).then(function (v) {
    responder({ resumos: v[0], catalogo: v[1], cfg: v[2] });
    if (msg.lista) avisar(cnjs, v[0], v[2]);
  }, function (e) { responder({ erro: e && e.message === 'login' ? 'Entre no painel do HERO18810 para ver os selos.' : String(e && e.message || e) }); });
  return true;
});
/* o painel pede para esquecer o cache (catálogo editado, ficha gravada) */
chrome.runtime.onMessage.addListener(function (msg) { if (msg && msg.tipo === 'muta-resumos-limpar') { RES = {}; CAT = { t: 0, v: null }; } });
