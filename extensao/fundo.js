/* Muta · service worker
   - o ícone da extensão abre o painel lateral;
   - recebe do conteudo-pje.js o número do processo aberto em cada aba do PJe e guarda em
     chrome.storage.session ("aba:<id>"), que o painel lê para acompanhar a aba ativa.
   Nada sai do navegador: só o número do processo, e só dentro da extensão. */
'use strict';

chrome.runtime.onInstalled.addListener(function () {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(function () {});
});
chrome.runtime.onStartup.addListener(function () {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(function () {});
});

var CNJ = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

/* Cada quadro (frame) da aba informa o que vê; vale o quadro principal, depois o informe mais recente. */
function consolidar(reg) {
  var fr = reg.quadros || {}, topo = fr['0'], melhor = null;
  if (topo && topo.numero) melhor = topo;
  else Object.keys(fr).forEach(function (k) {
    var q = fr[k];
    if (q && q.numero && (!melhor || q.t > melhor.t)) melhor = q;
  });
  reg.numero = melhor ? melhor.numero : '';
  reg.classe = melhor ? (melhor.classe || '') : '';
  return reg;
}

chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (!msg || msg.tipo !== 'muta-processo' || !sender.tab) return;
  var numero = typeof msg.numero === 'string' && CNJ.test(msg.numero) ? msg.numero : '';
  var classe = typeof msg.classe === 'string' ? msg.classe.slice(0, 20) : '';
  var chave = 'aba:' + sender.tab.id, quadro = String(sender.frameId || 0);
  chrome.storage.session.get(chave).then(function (o) {
    var reg = o[chave] || { quadros: {} };
    reg.quadros[quadro] = { numero: numero, classe: classe, t: Date.now() };
    consolidar(reg);
    var s = {}; s[chave] = reg;
    return chrome.storage.session.set(s);
  }).catch(function () {});
});

/* Aba recarregada para outra página: os quadros antigos deixam de valer. */
chrome.tabs.onUpdated.addListener(function (tabId, info) {
  if (info.status !== 'loading') return;
  chrome.storage.session.remove('aba:' + tabId).catch(function () {});
});
chrome.tabs.onRemoved.addListener(function (tabId) {
  chrome.storage.session.remove('aba:' + tabId).catch(function () {});
});
