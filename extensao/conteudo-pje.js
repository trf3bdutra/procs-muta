/* Muta · leitura do número do processo no PJe 2º grau (TRF-3)
   Lê apenas o que já está na tela: o número CNJ do processo aberto (e a sigla da classe, se vier
   junto). Não clica, não grava e não envia nada ao tribunal nem a servidores; o número vai só ao
   painel da extensão.
   Critério conservador: informa o número quando ele está no título da página ou no cabeçalho dos
   autos, ou quando é o único número CNJ visível. Em listas de tarefas (vários números), não
   informa nada, para o painel não trocar de prontuário à toa. [VALIDAR nos autos reais do PJe2g] */
(function () {
  'use strict';
  if (window.__mutaPje) return;
  window.__mutaPje = true;

  var RE = /\b(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/g;
  var RE_CLASSE = /\b([A-Z][A-Za-z]{1,11})\s+(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/;
  /* cabeçalhos em que o PJe costuma mostrar o processo aberto (o primeiro que existir vale) */
  var CABECALHOS = ['#navbar .titulo-topo', '.titulo-topo', '#pageHeader', '.header-processo',
    '#processoIdentificacao', '.dados-processo', 'h1', 'h2', 'h3'];

  function numeros(texto) {
    var m, vistos = {}, lista = [];
    RE.lastIndex = 0;
    while ((m = RE.exec(texto || ''))) if (!vistos[m[1]]) { vistos[m[1]] = 1; lista.push(m[1]); }
    return lista;
  }
  function classeDe(texto, numero) {
    var m = RE_CLASSE.exec(texto || '');
    return m && m[2] === numero ? m[1] : '';
  }
  function detectar() {
    var t = document.title || '', n = numeros(t);
    if (n.length === 1) return { numero: n[0], classe: classeDe(t, n[0]) };
    for (var i = 0; i < CABECALHOS.length; i++) {
      var el = document.querySelector(CABECALHOS[i]);
      if (!el) continue;
      var tx = (el.innerText || el.textContent || '').slice(0, 400), nn = numeros(tx);
      if (nn.length === 1) return { numero: nn[0], classe: classeDe(tx, nn[0]) };
    }
    var corpo = document.body ? (document.body.innerText || '').slice(0, 200000) : '';
    var todos = numeros(corpo);
    if (todos.length === 1) return { numero: todos[0], classe: classeDe(corpo, todos[0]) };
    return { numero: '', classe: '' };
  }

  var ultimo = null, espera = null;
  function informar() {
    espera = null;
    var d;
    try { d = detectar(); } catch (e) { return; }
    var chave = d.numero + '|' + d.classe;
    if (chave === ultimo) return;
    ultimo = chave;
    try { chrome.runtime.sendMessage({ tipo: 'muta-processo', numero: d.numero, classe: d.classe }); }
    catch (e) { /* extensão recarregada: esta página fica sem vínculo até ser recarregada */ }
  }
  function agendar() { if (!espera) espera = setTimeout(informar, 700); }

  informar();
  if (document.body) new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('focus', function () { ultimo = null; agendar(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { ultimo = null; agendar(); } });
})();
