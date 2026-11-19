/* Muta · painel acompanha o processo aberto no PJe
   Lê de chrome.storage.session ("aba:<id>", gravado pelo fundo.js) o processo da aba ativa e, com
   "Acompanhar o PJe" ligado, abre o prontuário desse processo. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var br = window.MutaProntuarioBridge;
  var temChrome = !!(window.chrome && chrome.storage && chrome.storage.session && chrome.tabs);
  var PREF = 'muta-pje:seguir';
  var abaAtiva = null, ultimoPje = '', ultimaClasse = '';

  var seguir = $('pje-seguir');
  try { seguir.checked = localStorage.getItem(PREF) !== '0'; } catch (e) {}

  function mostrar(numero, texto, estado) {
    $('pje-status').textContent = texto;
    $('pje-bar').dataset.estado = estado || '';
  }
  function aplicar(reg) {
    var numero = reg && reg.numero || '', classe = reg && reg.classe || '';
    ultimoPje = numero; ultimaClasse = classe;
    if (!numero) { mostrar('', temChrome ? 'Nenhum processo aberto na aba ativa do PJe.' : 'Fora da extensão: sem leitura do PJe.', 'off'); return; }
    var atual = br.chaveAtual(), k = Muta.chaveProcesso(numero);
    if (seguir.checked) {
      br.abrirProcesso(numero, classe);
      mostrar(numero, 'PJe: ' + (classe ? classe + ' ' : '') + numero, 'on');
    } else {
      mostrar(numero, 'PJe: ' + numero + (k === atual ? '' : ' · acompanhamento desligado'), k === atual ? 'on' : 'pausa');
    }
  }
  /* sem registro da aba (página recarregada, extensão atualizada): pede aos quadros que informem de novo */
  var pedidoEm = {};
  function reinformar(id) {
    if (id == null || Date.now() - (pedidoEm[id] || 0) < 5000) return;
    pedidoEm[id] = Date.now();
    try { chrome.tabs.sendMessage(id, { tipo: 'muta-reinformar' }).catch(function () {}); } catch (e) {}
  }
  function lerAba(id) {
    abaAtiva = id;
    if (id == null) { aplicar(null); return; }
    chrome.storage.session.get('aba:' + id).then(function (o) {
      if (abaAtiva !== id) return;
      var reg = o['aba:' + id];
      if (!reg || !reg.numero) reinformar(id);
      aplicar(reg);
    }).catch(function () { aplicar(null); });
  }
  function abaDaJanela() {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(function (t) { lerAba(t && t[0] ? t[0].id : null); }).catch(function () { lerAba(null); });
  }

  seguir.addEventListener('change', function () {
    try { localStorage.setItem(PREF, seguir.checked ? '1' : '0'); } catch (e) {}
    if (temChrome) abaDaJanela(); else aplicar(null);
  });

  window.MutaPje = {
    /* número do processo aberto na aba ativa do PJe (vazio se nenhum) */
    processo: function () { return ultimoPje; },
    classe: function () { return ultimaClasse; },
    /* texto do editor da minuta na aba do PJe (todas as molduras respondem; vale a primeira que achar um editor) */
    lerEditor: function () {
      if (!temChrome) return Promise.reject(new Error('Fora da extensão: sem acesso ao PJe.'));
      return chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(function (t) {
        var id = t && t[0] ? t[0].id : abaAtiva;
        if (id == null) throw new Error('Nenhuma aba ativa.');
        return chrome.tabs.sendMessage(id, { tipo: 'muta-editor' });
      }).then(function (r) {
        if (!r || !r.texto) throw new Error('Nenhum editor de texto aberto na aba do PJe.');
        return r;
      }, function (e) {
        throw new Error(/Receiving end|port closed|No tab/i.test(String(e && e.message)) ? 'Nenhum editor de texto aberto na aba do PJe (abra a minuta na tarefa e, se a extensão foi atualizada, recarregue a página do PJe).' : (e && e.message) || String(e));
      });
    },
    /* escolha manual na lista de prontuários: desliga o acompanhamento para não ser desfeita */
    manual: function (chave) {
      if (seguir.checked && ultimoPje && Muta.chaveProcesso(ultimoPje) !== chave) {
        seguir.checked = false;
        try { localStorage.setItem(PREF, '0'); } catch (e) {}
        mostrar(ultimoPje, 'PJe: ' + ultimoPje + ' · acompanhamento desligado (prontuário escolhido na lista)', 'pausa');
      }
    }
  };

  var v = $('versao'); if (v && Muta.versao) v.textContent = 'versão ' + Muta.versao;
  var z = $('lnk-zip'); if (z) z.href = Muta.SITE + '/extensao/muta-pje.zip';
  var ix = $('lnk-index'); if (ix) ix.href = Muta.SITE + '/amicus/collectio/';

  if (!temChrome) { aplicar(null); return; }
  chrome.tabs.onActivated.addListener(function (info) { lerAba(info.tabId); });
  chrome.windows && chrome.windows.onFocusChanged && chrome.windows.onFocusChanged.addListener(function (w) { if (w !== chrome.windows.WINDOW_ID_NONE) abaDaJanela(); });
  chrome.storage.onChanged.addListener(function (mud, area) {
    if (area !== 'session' || abaAtiva == null) return;
    var k = 'aba:' + abaAtiva;
    if (k in mud) aplicar(mud[k].newValue);
  });
  abaDaJanela();
})();
