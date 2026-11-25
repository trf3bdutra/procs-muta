/* Muta · dicas ao passar o cursor (0.16.5)
   Todo botão, ícone e campo do painel ganha um "title" que diz o que é ou o que faz. Os campos da ficha já saem com a dica
   (gabinete.js, dicaCampo); aqui ficam os botões e ícones, por atributo, aplicados a tudo o que aparecer na tela
   (observa as mudanças do painel). Só preenche o que ainda não tem dica. */
(function () {
  'use strict';
  var S = function (v) { return v == null ? '' : String(v).trim(); };
  var AU = { ler: 'Lê a cronologia dos autos abertos no PJe (painel esquerdo dos autos digitais)', tudo: 'Rola o painel dos autos até carregar a cronologia inteira',
    princ: 'Lê o texto das decisões, recursos, contrarrazões, pareceres, procurações e custas: alimenta a conferência automática',
    aplicar: 'Grava na ficha as sugestões marcadas', tudojs: 'Lê todos os documentos e baixa o inteiro teor num arquivo JSON',
    'f:pecas': 'Mostra só as peças processuais', 'f:todos': 'Mostra todos os documentos da cronologia' };
  var AU_PRE = { 'ext:': 'Lê o texto deste documento (PDF digitalizado vai ao OCR)', 'ocr:': 'Lê o documento por OCR, página por página (no computador; nada sai dele)',
    'js:': 'Baixa esta peça em JSON', 'pdf:': 'Abre o PDF no PJe, numa aba nova', 'cp:': 'Copia o texto lido do documento', 'al:': 'Grava na ficha o valor indicado pela leitura dos autos' };
  var ABA = { Processo: 'Processo: sinalizações em aberto, notas, síntese, questões, peças e controles',
    Autos: 'Autos: conferência automática e peças (lidas/total; texto, OCR, JSON e PDF)', Roteiro: 'Roteiro de triagem: passos conferidos/total do tipo de julgamento, com todos os campos da triagem',
    'Produção': 'Produção: campos preenchidos/total — pronunciamento, decisão, revisão, ementa, liberação e pauta' };
  var NAV = { 'tab-pront': 'Prontuário do processo aberto no PJe', 'tab-min': 'Minuta: o texto do editor do PJe comparado com a matriz, o Collectio e a conformidade',
    'tab-acervo': 'Ementário: precedentes do Relator e do gabinete', 'tab-par': 'Parágrafos-padrão do gabinete, para buscar e copiar', 'tab-dir': 'Diretrizes: Manual CMT e lista de caça',
    'tab-ajuda': 'Ajuda e instalação' };
  var ID = { 'pje-seguir': 'Acompanhar o PJe: o painel segue o processo aberto na aba do PJe (desligado, congela o processo atual)',
    'pje-aba': 'Trocar de aba: autos digitais abrem o modo Autos; a tarefa com o editor abre a aba Minuta',
    'pje-tema': 'Tema claro ou escuro', 'sn-tp': 'Tipo da nova sinalização (pendência é aviso; intercorrência retém a liberação)', 'sn-tx': 'Descreva a sinalização e tecle Enter para incluir',
    'nt-tx': 'Escreva a nota e tecle Ctrl+Enter (ou "+ Incluir nota"); ela entra no log com data, hora e autor', 'pm-ad-tx': 'Assunto detalhado: Enter grava, Esc cancela',
    'pm-des': 'Nome de quem fica com a etapa: Enter grava, Esc cancela', 'pm-pron': 'Pronunciamento: com acórdão o processo vai à sessão; os demais são decisão do relator' };
  function dica(el) {
    var d = el.dataset || {}, v;
    if (el.id && ID[el.id]) return ID[el.id];
    if (el.id && NAV[el.id]) return NAV[el.id];
    if (el.closest && el.closest('.pje-seguir')) { var i = el.closest('.pje-seguir').querySelector('input'); if (i && ID[i.id]) return ID[i.id]; }
    if (d.au) { if (AU[d.au]) return AU[d.au]; for (var k in AU_PRE) if (d.au.indexOf(k) === 0) return AU_PRE[k]; }
    if (d.aba) return ABA[d.aba] || ('Abrir ' + d.aba);
    if (d.ch && d.v != null) return 'Marca “' + d.v + '”. Clique de novo para limpar.';
    if (d.ct) return /:1$/.test(d.ct) ? 'Sim: este controle vale para o processo (mostra a razão)' : 'Não: tira o processo deste controle';
    if (d.snOk) return 'Marca a sinalização como resolvida (fica riscada)';
    if (d.snX) return 'Exclui esta sinalização';
    if (d.ntX != null) return 'Exclui esta nota';
    if (d.hasOwnProperty('ntAdd') || el.hasAttribute('data-nt-add')) return 'Inclui a nota escrita abaixo (Ctrl+Enter)';
    if (d.pron != null) return 'Define o pronunciamento: com acórdão o processo vai à sessão; os demais são decisão do relator';
    if (d.rt) { if (/^t:/.test(d.rt)) return 'Soma ou tira este tipo de julgamento do roteiro'; if (/^a:/.test(d.rt)) return 'Abre ou fecha este passo';
      if (/^u:/.test(d.rt)) return 'Grava na ficha o valor lido nos autos'; if (d.rt === 'ut') return 'Grava na ficha todas as sugestões da leitura dos autos'; if (d.rt === 'auto') return 'Volta ao tipo identificado pela classe, espécie e tarefa'; }
    if (d.rtc) return 'Marque quando tiver conferido este passo (fica só neste navegador)';
    if (d.sg != null) return 'Marque para gravar esta sugestão na ficha';
    if (d.esp) return 'Detalhamento da peça: vai para "Outras peças e ocorrências" da ficha';
    if (d.q != null) return 'Questão a decidir no processo (uma por linha; vira item da ficha)';
    if (d.qdel != null) return 'Tira esta questão';
    if (el.hasAttribute && el.hasAttribute('data-qadd')) return 'Inclui uma questão a decidir';
    if (d.copia) return 'Copia ' + (/^\d+$/.test(d.copia) ? 'o ID ' : 'o número ') + d.copia;
    if (d.add) return 'Inclui a etiqueta “' + d.add + '” nas sugeridas para o PJe';
    if (d.cp) return 'Copia o texto deste parágrafo, com as vagas em [MAIÚSCULAS]';
    if (d.aut != null || (el.tagName === 'SUMMARY' && el.closest('.pm-aut'))) return 'Mostra autuação, partes, tarefa no PJe e situação atual';
    if (el.tagName === 'SUMMARY') return 'Mostrar ou esconder';
    v = el.getAttribute('aria-label') || el.getAttribute('placeholder');
    if (v) return v;
    v = S(el.textContent).replace(/\s+/g, ' ');
    return v && v.length <= 40 ? v : '';
  }
  var SEL = 'button,a,select,input,textarea,summary,[role=tab]';
  function aplicar(raiz) {
    (raiz || document).querySelectorAll(SEL).forEach(function (el) {
      if (el.title || el.type === 'hidden') return;
      var t = dica(el); if (t) el.title = t;
    });
  }
  var t = 0;
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { aplicar(document); }, 120); }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', function () { aplicar(document); });
  window.MutaDicas = { aplicar: aplicar, dica: dica };
})();
