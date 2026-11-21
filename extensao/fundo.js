/* Muta · service worker
   - o ícone da extensão abre o painel lateral;
   - recebe do conteudo-pje.js o número do processo que cada quadro da aba vê e guarda em
     chrome.storage.session ("aba:<id>"), que o painel lê para acompanhar a aba ativa.
   O PJe 2º grau monta a tela em quadros: a página de pje2g, o painel de tarefas (frontend-pje) e a tarefa aberta
   (pje2g de novo). Cada quadro informa o que vê, com a força da leitura; vale o mais forte e, no empate, o mais recente.
   Nada sai do navegador: só o número do processo, e só dentro da extensão. */
'use strict';

/* Depois de instalar ou atualizar a extensão, as abas do PJe já abertas ficam sem o leitor (o Chrome só o põe em páginas
   carregadas depois): injeta o conteudo-pje.js nelas, em todos os quadros, para o painel funcionar sem recarregar a página. */
function injetarNasAbasAbertas() {
  if (!chrome.scripting || !chrome.tabs) return;
  chrome.tabs.query({ url: ['https://pje2g.trf3.jus.br/*', 'https://frontend-pje.app.trf3.jus.br/*'] }).then(function (abas) {
    (abas || []).forEach(function (t) {
      chrome.scripting.executeScript({ target: { tabId: t.id, allFrames: true }, files: ['conteudo-pje.js'] }).catch(function () {});
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
      reg.quadros[quadro] = { numero: numero, classe: classe, forca: forca, via: String(msg.via || '').slice(0, 20), ctx: String(msg.ctx || '').slice(0, 10), ed: !!msg.ed, t: Date.now() };
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
