/* HERO18810 · janela grande: mostra o conteúdo que o painel guardou em storage.session ('muta-janela:<chave>')
   e acompanha as atualizações (a Conformidade e a comparação se refazem quando o editor muda). */
(function () {
  'use strict';
  var chave = (location.hash || '#comparar').slice(1), K = 'muta-janela:' + chave;
  function pintar(v) {
    if (!v) return;
    document.title = 'HERO18810 · ' + (v.titulo || '');
    document.getElementById('jn-t').textContent = v.titulo || 'HERO18810';
    document.getElementById('jn-em').textContent = v.em ? 'atualizado às ' + new Date(v.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    var c = document.getElementById('jn-c'), y = window.scrollY; c.innerHTML = v.html || ''; window.scrollTo(0, y);
  }
  try {
    chrome.storage.session.get(K).then(function (o) { pintar(o[K]); });
    chrome.storage.onChanged.addListener(function (ch, area) { if (area === 'session' && ch[K]) pintar(ch[K].newValue); });
  } catch (e) {}
  document.getElementById('jn-imp').addEventListener('click', function () { window.print(); });
})();
