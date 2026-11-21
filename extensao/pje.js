/* Muta · painel acompanha o processo aberto no PJe
   Lê de chrome.storage.session ("aba:<id>", gravado pelo fundo.js) o processo da aba ativa e, com
   "Acompanhar o PJe" ligado, abre o prontuário desse processo; com "Trocar de aba" ligado, a aba segue a tela do PJe
   (autos digitais → Prontuário, com a lista de documentos; tarefa com o editor → Minuta). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var br = window.MutaProntuarioBridge;
  var temChrome = !!(window.chrome && chrome.storage && chrome.storage.session && chrome.tabs);
  var PREF = 'muta-pje:seguir';
  var abaAtiva = null, ultimoPje = '', ultimaClasse = '', ultimaTarefa = '', ultimoCtxTela = '';

  var seguir = $('pje-seguir'), trocar = $('pje-aba'), PREF_ABA = 'muta-pje:aba-auto', ultimoCtx = '';
  try { seguir.checked = localStorage.getItem(PREF) !== '0'; } catch (e) {}
  try { if (trocar) trocar.checked = localStorage.getItem(PREF_ABA) !== '0'; } catch (e) {}

  /* a aba do painel acompanha a tela do PJe: autos digitais → Prontuário (e lê o painel esquerdo dos autos);
     tarefa com o editor da minuta → Minuta (e lê o editor; a Conformidade analisa a mesma leitura).
     Só troca quando o processo ou a tela mudam: depois disso a pessoa navega à vontade. */
  function porContexto(reg) {
    if (!reg || !reg.numero || !seguir.checked || !(trocar && trocar.checked) || !window.MutaAbas) return;
    var ctx = reg.ctx === 'autos' ? 'autos' : reg.ed ? 'editor' : '', k = reg.numero + '|' + ctx;
    if (!ctx || k === ultimoCtx) return;
    ultimoCtx = k;
    if (ctx === 'autos') { window.MutaAbas.ir('pront'); if (window.MutaGabinete && window.MutaGabinete.ir) window.MutaGabinete.ir('Autos'); if (window.MutaAutos) setTimeout(function () { window.MutaAutos.ler(); }, 300); }
    else { window.MutaAbas.ir('min'); if (window.MutaEditor) setTimeout(function () { window.MutaEditor.ler().catch(function () {}); }, 300); }
  }

  function mostrar(numero, texto, estado) {
    $('pje-status').textContent = texto;
    $('pje-bar').dataset.estado = estado || '';
  }
  function aplicar(reg) {
    var numero = reg && reg.numero || '', classe = reg && reg.classe || '';
    ultimoPje = numero; ultimaClasse = classe; ultimaTarefa = reg && reg.tarefa || ''; ultimoCtxTela = reg ? (reg.ctx === 'autos' ? 'autos' : reg.ed ? 'editor' : reg.ctx || '') : '';
    try { document.dispatchEvent(new CustomEvent('muta:pje', { detail: { numero: numero, classe: classe, tarefa: ultimaTarefa, ctx: ultimoCtxTela } })); } catch (e) {}
    if (!numero) { mostrar('', temChrome ? 'Nenhum processo aberto na aba ativa do PJe.' : 'Fora da extensão: sem leitura do PJe.', 'off'); return; }
    var atual = br.chaveAtual(), k = Muta.chaveProcesso(numero);
    var tela = reg.ctx === 'autos' ? ' · autos digitais' : reg.ed ? ' · editor da minuta' : reg.via === 'seleção na lista' ? ' · escolhido na lista' : '';
    if (seguir.checked) {
      br.abrirProcesso(numero, classe);
      mostrar(numero, 'PJe: ' + (classe ? classe + ' ' : '') + numero + tela, 'on');
      porContexto(reg);
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

  if (trocar) trocar.addEventListener('change', function () { try { localStorage.setItem(PREF_ABA, trocar.checked ? '1' : '0'); } catch (e) {} ultimoCtx = ''; });
  seguir.addEventListener('change', function () {
    try { localStorage.setItem(PREF, seguir.checked ? '1' : '0'); } catch (e) {}
    if (temChrome) abaDaJanela(); else aplicar(null);
  });

  window.MutaPje = {
    /* número do processo aberto na aba ativa do PJe (vazio se nenhum) */
    processo: function () { return ultimoPje; },
    classe: function () { return ultimaClasse; },
    /* nome da tarefa aberta ("[Sessão] Aguardando a sessão") e a tela (autos, editor, tarefa, lista) */
    tarefa: function () { return ultimaTarefa; },
    tela: function () { return ultimoCtxTela; },
    /* conteúdo de um documento dos autos (o download do próprio PJe): {fmt:'html', texto} ou {fmt:'pdf', b64} */
    lerDocumento: function (idp, id) {
      if (!temChrome) return Promise.reject(new Error('Fora da extensão: sem acesso ao PJe.'));
      return chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(function (t) {
        var x = t && t[0] ? t[0].id : abaAtiva;
        if (x == null) throw new Error('Nenhuma aba ativa.');
        return chrome.tabs.sendMessage(x, { tipo: 'muta-doc', idp: idp, id: id });
      }).then(function (r) {
        if (!r) throw new Error('A aba ativa não é a dos autos digitais do PJe.');
        if (r.erro) throw new Error(r.erro);
        return r;
      }, function (e) { throw new Error(/Receiving end|port closed|No tab/i.test(String(e && e.message)) ? 'A aba ativa não é a dos autos digitais (recarregue a página do PJe com F5 se a extensão foi atualizada).' : (e && e.message) || String(e)); });
    },
    /* abre um endereço numa aba nova (o PDF do documento, no próprio PJe) */
    abrir: function (url) { try { if (temChrome && chrome.tabs.create) return chrome.tabs.create({ url: url }); } catch (e) {} window.open(url, '_blank', 'noopener'); },
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
    /* insere HTML no editor do PJe, na posição do cursor (ou no fim); copia também, para colar à mão se o editor recusar */
    inserir: function (html, texto) {
      try { if (navigator.clipboard && window.ClipboardItem) navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([texto || ''], { type: 'text/plain' }) })]).catch(function () {}); } catch (e) {}
      if (!temChrome) return Promise.reject(new Error('Fora da extensão: copiado para colar no editor.'));
      return chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(function (t) {
        var id = t && t[0] ? t[0].id : abaAtiva; if (id == null) throw new Error('Nenhuma aba ativa.');
        return chrome.tabs.sendMessage(id, { tipo: 'muta-inserir', html: html, texto: texto || '' });
      }).then(function (r) { if (!r) throw new Error('Nenhum editor aberto na aba do PJe (o texto foi copiado).'); if (r.erro) throw new Error(r.erro); return r; },
        function (e) { throw new Error(/Receiving end|port closed|No tab/i.test(String(e && e.message)) ? 'Nenhum editor aberto na aba do PJe (o texto foi copiado; recarregue o PJe com F5 se a extensão foi atualizada).' : (e && e.message) || String(e)); });
    },
    /* cronologia dos autos digitais (painel esquerdo da página dos autos): documentos com ID, tipo, descrição e data */
    lerAutos: function (tudo) {
      if (!temChrome) return Promise.reject(new Error('Fora da extensão: sem acesso ao PJe.'));
      return chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(function (t) {
        var id = t && t[0] ? t[0].id : abaAtiva;
        if (id == null) throw new Error('Nenhuma aba ativa.');
        return chrome.tabs.sendMessage(id, { tipo: 'muta-autos', tudo: !!tudo });
      }).then(function (r) {
        if (!r || !r.itens) throw new Error('A aba ativa não é a dos autos digitais do PJe.');
        return r;
      }, function (e) {
        throw new Error(/Receiving end|port closed|No tab/i.test(String(e && e.message)) ? 'A aba ativa não é a dos autos digitais (ou a página foi aberta antes de instalar a extensão: recarregue com F5).' : (e && e.message) || String(e));
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
