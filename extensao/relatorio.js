/* HERO18810 · relatório de chegadas: lê o registro local (storage.local 'muta-chegadas') e o do site (/api/pauta?chegadas=1), só do gestor */
(function () {
  'use strict';
  var SITE = 'https://www.gabinete-cmt.com', $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (k) { return String(k).replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6'); };
  var diaMS = function (t) { return new Date(t - 4 * 3600e3).toISOString().slice(0, 10); };
  var hora = function (iso) { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  var L = [];
  function carregar(dia) {
    return Promise.all([
      chrome.storage.local.get('muta-chegadas').then(function (o) { return o['muta-chegadas'] || []; }),
      fetch(SITE + '/api/pauta?chegadas=1&dia=' + dia, { credentials: 'include', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : { registros: [] }; }).then(function (j) { return j.registros || []; }, function () { return []; })
    ]).then(function (v) {
      var m = {}; v[1].concat(v[0]).forEach(function (x) { if (diaMS(Date.parse(x.em)) !== dia) return; if (!m[x.k]) m[x.k] = x; });
      L = Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return (b.urg - a.urg) || String(a.em).localeCompare(String(b.em)); });
      pintar(dia);
    });
  }
  function linha(x) {
    return '<tr class="' + (x.urg ? 'u' : '') + '"><td>' + hora(x.em) + '</td><td class="k"><button type="button" data-c="' + fmt(x.k) + '" title="Copiar o número">' + fmt(x.k) + '</button></td><td>' +
      (x.motivos || []).map(function (m) { return '<span class="m">' + esc(m) + '</span>'; }).join('') + '</td><td>' + esc(x.tarefa || '') + '</td><td class="t">' + esc((x.texto || '').slice(0, 220)) + '</td></tr>';
  }
  function tabela(T) { return '<table><thead><tr><th>Hora</th><th>Processo</th><th>Urgência / prioridade</th><th>Tarefa</th><th>Cartão no PJe</th></tr></thead><tbody>' + T.map(linha).join('') + '</tbody></table>'; }
  function pintar(dia) {
    var U = L.filter(function (x) { return x.urg; }), O = L.filter(function (x) { return !x.urg; });
    $('resumo').textContent = dia.split('-').reverse().join('/') + ': ' + (L.length ? L.length + (L.length === 1 ? ' processo chegou' : ' processos chegaram') + (U.length ? ', ' + U.length + ' com urgência.' : '.') : 'nenhuma chegada registrada.');
    $('lista').innerHTML = (U.length ? '<h2>Com urgência (' + U.length + ')</h2>' + tabela(U) : '') + (O.length ? '<h2>Demais (' + O.length + ')</h2>' + tabela(O) : '') + (!L.length ? '<p class="vz">Abra as listas de tarefas do PJe com a extensão ligada para registrar as chegadas.</p>' : '');
  }
  function texto() {
    var d = $('dia').value.split('-').reverse().join('/');
    return 'Chegadas de ' + d + ' (' + L.length + ')\n' + L.map(function (x) { return '- ' + fmt(x.k) + (x.urg ? ' [URGENTE] ' : ' ') + (x.motivos || []).join(', ') + (x.tarefa ? ' · ' + x.tarefa : ''); }).join('\n');
  }
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) navigator.clipboard.writeText(b.dataset.c); });
  $('copiar').addEventListener('click', function () { navigator.clipboard.writeText(texto()).then(function () { $('copiar').textContent = 'Copiado'; setTimeout(function () { $('copiar').textContent = 'Copiar'; }, 1200); }); });
  $('imprimir').addEventListener('click', function () { window.print(); });
  var dia = /^#\d{4}-\d{2}-\d{2}$/.test(location.hash) ? location.hash.slice(1) : diaMS(Date.now());
  $('dia').value = dia; $('dia').addEventListener('change', function () { carregar($('dia').value); });
  carregar(dia);
})();
