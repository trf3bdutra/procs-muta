/* HERO18810 0.69 · saúde do painel
   1) Versão: compara a versão instalada com a publicada (/extensao/versao.json) ao abrir e a cada 30 minutos; se houver
      versão nova, mostra o aviso no alto do painel com o caminho para atualizar (atualizar-muta.cmd).
   2) Carregamento: confere se os módulos essenciais carregaram (a ordem dos <script> do painel.html importa); se faltar algum,
      mostra qual, em vez de o painel ficar em branco ou falhar calado. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ESSENCIAIS = ['Muta', 'MutaSessao', 'MutaSigilo', 'MutaAbas', 'MutaGabinete', 'MutaRoteiro', 'MutaAutos', 'MutaSincronia', 'MutaPje', 'MutaPauta', 'MutaGestao'];
  function instalada() { try { return chrome.runtime.getManifest().version; } catch (e) { return ''; } }
  function maior(a, b) { var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; }
  function faixa(id, html, cls) {
    var el = $(id); if (!html) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = id; var t = $('topo-u'); (t && t.parentNode ? t.parentNode : document.body).insertBefore(el, t ? t.nextSibling : document.body.firstChild); }
    el.className = 'hs-av ' + (cls || ''); el.innerHTML = html;
  }
  function versao() {
    var site = (window.Muta && window.Muta.SITE) || 'https://www.gabinete-cmt.com', v = instalada();
    if (!v) return;
    fetch(site + '/extensao/versao.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.versao) return;
      faixa('hs-versao', maior(j.versao, v) ? '<b>Versão ' + j.versao + ' disponível</b> (instalada: ' + v + '). Feche o painel, rode <code>atualizar-muta.cmd</code> na pasta da extensão e abra de novo.' : '', 'hs-v');
    }).catch(function () {});
  }
  function modulos() {
    var falta = ESSENCIAIS.filter(function (n) { return !window[n]; });
    faixa('hs-mod', falta.length ? 'Parte do painel não carregou (' + falta.join(', ') + '). Atualize a extensão; se continuar, avise o gestor.' : '', 'hs-e');
  }
  window.addEventListener('load', function () { setTimeout(modulos, 1500); setTimeout(versao, 2000); setInterval(versao, 30 * 60e3); });
  window.MutaSaude = { versao: versao, modulos: modulos, maior: maior };
})();
