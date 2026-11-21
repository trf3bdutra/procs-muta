
/* Ab Initio · motor embutido: quando roda dentro do Ab Initio no formato do CMT-Acervo,
   some a barra lateral do painel e a navegação fica com a página de fora. */
(function (W, D) {
  'use strict';
  var emb = false; try { emb = W.parent !== W && W.frameElement && W.frameElement.id === 'cmt-motor'; } catch (e) {}
  if (!emb) return;
  var st = D.createElement('style');
  st.textContent = 'aside:has(.pc-logo-lateral){display:none!important}div:has(> aside .pc-logo-lateral){grid-template-columns:minmax(0,1fr)!important}' +
    '#cs-root .cs-tabs,#cs-root [data-cs="fechar"],#cmt-relatorios{display:none!important}#cs-root .cs-top{padding:8px 16px}#cs-root .cs-top h1{font-size:15px}';
  D.head.appendChild(st);
  var TITULO = { sessoes: 'Sessões', marcos: 'Marcos e prazos', planilha: 'Planilha da sessão', regras: 'Regras de etiquetas', desig: 'Regras de designação', equipe: 'Equipe' };
  W.CMTMotor = {
    ir: function (v) {
      var c = W.__painelCentralComponent;
      if (v === 'central' || v === 'triagem' || v === 'selecao') { if (W.CMTSessao) W.CMTSessao.fechar(); if (c) c.setState({ tab: v, acervoDialog: false }); return; }
      if (v === 'importar') { if (W.CMTSessao) W.CMTSessao.fechar(); if (c) c.setState({ tab: 'central', acervoDialog: true }); return; }
      if (W.CMTSessao) { W.CMTSessao.abrir(v); var h = D.querySelector('#cs-root .cs-top h1'); if (h) h.textContent = TITULO[v] || 'Pautas de julgamento'; }
    }
  };
})(window, document);

