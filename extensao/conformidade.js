/* Muta · conformidade (0.42: aba própria da Minuta — Comparar | Gerador | Conformidade; até a 0.41, rodapé fixo)
   Painel ativável: com "Conformidade ativa", o painel relê o editor da minuta no PJe a cada poucos segundos e refaz a
   análise quando o texto muda (só lê; não altera o editor). O motor está em conformidade-motor.js; as regras de redação
   vêm do pacote do gabinete (fontes.js) e o contexto do caso, do prontuário e do cartão da pauta. */
(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
var MO = window.MutaConformidadeMotor, ED = window.MutaEditor, FT = window.MutaFontes, br = window.MutaProntuarioBridge, esc = window.MutaComparador.esc;
var caixa = $('conf-app'), PREF = 'muta-pje:conformidade';
var K = { ativa: false, fmt: true, grupo: '', r: null, dados: null, erroDados: '', em: 0, hash: 0 };
try { var g = JSON.parse(localStorage.getItem(PREF) || '{}'); K.ativa = !!g.ativa; K.fmt = g.fmt !== false; } catch (e) {}
function guarda() { try { localStorage.setItem(PREF, JSON.stringify({ ativa: K.ativa, fmt: K.fmt })); } catch (e) {} }
function aberta() { var p = $('panel-min'), w = $('min-conf'); return p && !p.hidden && !(w && w.hidden); }
/* rodapé: aberto ou recolhido (lembrado neste navegador) */
var ROD = 'muta-pje:conf-rodape';
function rodape(abrir) {
  var w = $('min-conf'), t = $('mc-t'); if (!w) return;
  if (abrir != null) { try { localStorage.setItem(ROD, abrir ? '1' : '0'); } catch (e) {} }
  var on = false; try { on = localStorage.getItem(ROD) === '1'; } catch (e) {}
  w.dataset.aberto = on ? '1' : '0'; if(t)t.setAttribute('aria-expanded', String(on)); if(w.tagName==='DETAILS')w.open=on;
}
var SEVR = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
var PECA = { acordao: 'acórdão (relatório, voto, ementa e acórdão)', decisao: 'decisão monocrática', despacho: 'despacho', texto: 'texto sem estrutura de peça reconhecida' };

function contexto() {
  var s = window.MutaSincronia ? window.MutaSincronia.situacao() : {}, c = (s.cartoes || [])[0];
  var f = null; try { f = br.getFull(); } catch (e) {}
  /* 0.40: a cronologia lida na aba Autos (IDʼs × peças) e as questões do prontuário (enfrentamento no voto) */
  var au = null, q = '';
  try { au = window.MutaAutos && window.MutaAutos.doProcesso ? window.MutaAutos.doProcesso() : null; } catch (e) {}
  try { q = window.MutaGabinete && window.MutaGabinete.V ? String(window.MutaGabinete.V('triagem', 'Alegações') || '') : ''; } catch (e) {}
  return { diretrizes: (K.dados || {}).diretrizes || [], manual: (K.dados || {}).manual || [], prontuario: f, cartao: c ? c.cartao : null,
    classe: (f && f.caso ? f.caso.classe : '') || (window.MutaPje ? window.MutaPje.classe() : ''), formatacao: K.fmt,
    autos: au ? au.lista.map(function (d) { return { id: d.id, tipo: d.tipo, desc: d.desc, data: d.data, k: d.k }; }) : null, autosTodos: !!(au && au.todos),
    questoes: q.split(/\n+/).map(function (x) { return x.replace(/^✓\s*/, '').trim(); }).filter(Boolean) };
}
function analisar() {
  var E = ED.estado();
  if (!E.texto) { K.r = null; badge(); render(); return; }
  var ctx=contexto(),ficha=FT&&FT.conformidadeFicha&&FT.conformidadeFicha(),g=window.MutaGabinete,cnj=g&&g.cnj&&g.cnj(),dg=function(x){return String(x||'').replace(/\D/g,'');};
  var ligado=!!(cnj&&E.numero&&!E.colado&&!E.erro&&dg(cnj).length===20&&dg(cnj)===dg(E.numero));
  if(!ligado||!ficha){ctx.prontuario=null;ctx.cartao=null;ctx.autos=null;ctx.autosTodos=false;ctx.questoes=[];if(!ligado)ctx.classe='';}
  if(ligado&&ficha)ctx.fluxo=ficha;
  K.r = MO.analisar(E.paragrafos || [], ctx); K.em = Date.now();
  badge(); render();
}
function badge() {
  var m = $('mc-resumo'), w = $('min-conf');
  /* no título da aba: só a nota (as contagens ficam na própria aba e no número ao lado) */
  if (m) m.innerHTML = K.r ? '<b>' + K.r.nota + '</b>/100' : (ED.estado().texto ? 'analisando…' : 'leia o editor');
  if (w) w.dataset.sev = K.r ? (K.r.resumo.alta ? 'alta' : K.r.resumo.media ? 'media' : 'ok') : '';
  var b2 = $('mm-conf-n'); if (b2) { var n2 = K.r ? K.r.resumo.alta + K.r.resumo.media : 0; b2.textContent = K.r ? String(n2) : ''; b2.hidden = !K.r; b2.dataset.sev = K.r && K.r.resumo.alta ? 'alta' : n2 ? 'media' : 'ok'; }
  var b = $('conf-badge'); if (!b) return;
  var n = K.r ? K.r.resumo.alta + K.r.resumo.media : 0;
  b.textContent = K.r ? String(n) : ''; b.hidden = !K.r; b.dataset.sev = K.r && K.r.resumo.alta ? 'alta' : n ? 'media' : 'ok';
  b.title = K.r ? K.r.resumo.alta + ' alta(s), ' + K.r.resumo.media + ' média(s), ' + K.r.resumo.baixa + ' baixa(s)' : '';
}
function trecho(t) {
  if (!t) return '';
  return '<blockquote class="cf-tr">' + esc(t.antes) + (t.alvo ? '<mark>' + esc(t.alvo) + '</mark>' : '') + esc(t.depois) + '</blockquote>';
}
var SECN = { cabecalho: 'cabeçalho', relatorio: 'relatório', voto: 'voto', ementa: 'ementa', acordao: 'acórdão' };
function itemHtml(x) {
  return '<li class="cf-it" data-sev="' + x.sev + '"><div class="cf-it-h"><span class="cf-sev">' + SEVR[x.sev] + '</span><span class="cf-g">' + esc(x.grupo) + '</span><span class="cf-r">' + esc(x.regra) + '</span>' +
    (x.sec ? '<span class="cf-pos">' + esc(SECN[x.sec] || x.sec) + (x.par != null ? ' · § ' + (x.par + 1) : '') + '</span>' : '') + '</div>' +
    '<p>' + esc(x.msg) + '</p>' + trecho(x.trecho) + (x.sug ? '<p class="cf-sug">Sugestão: <b>' + esc(x.sug) + '</b></p>' : '') + '</li>';
}
function matrizHtml(lista,total){
  var rows=lista.map(function(x){
    var pos=x.sec?(SECN[x.sec]||x.sec):'Geral';
    var grau=SEVR[x.sev]||'Não informado';
    var sev=/^(alta|media|baixa)$/.test(x.sev)?x.sev:'';
    var regra=x.regra?'<small class="cf-matrix-rule">'+esc(x.regra)+'</small>':'';
    return '<tr data-sev="'+sev+'"><td><b>'+esc(pos)+'</b>'+(x.par!=null?'<small class="cf-matrix-pos">§ '+(Number(x.par)+1)+'</small>':'')+'</td>'+
      '<td><span class="cf-matrix-problem">'+esc(x.msg||'')+'</span>'+regra+(x.trecho?'<details class="cf-matrix-evidence"><summary>Trecho</summary>'+trecho(x.trecho)+'</details>':'')+'</td>'+
      '<td>'+(x.sug?'<span class="cf-matrix-sug">'+esc(x.sug)+'</span>':'<small class="cf-matrix-none">Sem sugestão específica</small>')+'</td>'+
      '<td><span class="cf-matrix-kind">'+esc(x.grupo||'Geral')+'</span><span class="cf-matrix-sev" data-sev="'+sev+'">'+esc(grau)+'</span></td></tr>';
  }).join('');
  return '<section class="cf-matrix"><div class="cf-matrix-head"><h3>Matriz de ajustes</h3><small>'+lista.length+(lista.length===1?' apontamento':' apontamentos')+(lista.length!==total?' de '+total:'')+'</small></div><div class="cf-matrix-scroll"><table class="cf-matrix-table" aria-label="Matriz de ajustes da conformidade"><colgroup><col style="width:17%"><col style="width:39%"><col style="width:26%"><col style="width:18%"></colgroup><thead><tr><th scope="col">Local</th><th scope="col">Problema</th><th scope="col">Correção</th><th scope="col">Natureza</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>';
}
/* Encaminhamento explícito: o texto da minuta permanece no editor. */
function comandoRevisao(host,opcoes){
 var FT=window.MutaFontes,G=window.MutaGabinete,ss=window.MutaSessao,ctx=FT&&FT.conformidadeFicha&&FT.conformidadeFicha(),u=ss&&ss.estado();if(!ctx||!G||!u||u.estado!=='on'||window.MUTA_WEB&&window.MUTA_WEB.leitura)return;
 var root=document.createElement('details');root.className='hero-revisao-command';var title=document.createElement('summary');title.textContent='Encaminhar revisão';root.append(title);var body=document.createElement('div');body.className='hero-revisao-body';root.append(body);host.append(root);
 function el(t,v){var n=document.createElement(t);if(v!=null)n.textContent=v;return n;}
 var op=G.op&&G.op()||{},prod=op.producao||{},select=el('select');select.setAttribute('aria-label','Responsável pela revisão');
 Array.from(new Set([u.usuario].concat(u.gestor||u.perfil==='desembargador'?[prod.CORRETOR,prod.SERVIDOR]:[]).filter(Boolean))).forEach(function(v){var o=el('option',v);o.value=v;select.append(o);});
 var lbl=el('label','Responsável');lbl.append(select);body.append(lbl);
 var L=(opcoes||[]).filter(function(x){return x.sev==='alta'||x.sev==='media';}).slice(0,40),checks=[];
 L.forEach(function(x){var lab=el('label'),cb=el('input');cb.type='checkbox';cb.checked=true;checks.push({cb:cb,regra:x.regra});lab.append(cb,el('span',x.msg));body.append(lab);});
 body.append(el('small','A diligência também registra a quantidade de pendências e intercorrências abertas da ficha. Não envia o texto do editor, não marca urgência e não altera liberação.'));
 var b=el('button','Criar diligência'),msg=el('small');b.type='button';b.className='btn line sm';msg.setAttribute('role','status');body.append(b,msg);
 b.onclick=function(){var now=FT.conformidadeFicha(),usr=ss.estado();if(!now||now.cnj!==ctx.cnj||usr.usuario!==u.usuario||!root.isConnected||JSON.stringify(now)!==JSON.stringify(ctx)){msg.textContent='Ficha ou sessão alterada. Atualize a conferência.';return;}var codigos=checks.filter(function(x){return x.cb.checked;}).map(function(x){return x.regra;});
  if(!window.confirm('Encaminhar revisão do processo '+ctx.cnj+' para '+select.value+'?'))return;
  b.disabled=true;msg.textContent='Gravando…';Promise.resolve(G.gravarPendente()).then(function(){var a=FT.conformidadeFicha();if(!a||a.cnj!==ctx.cnj||ss.estado().usuario!==u.usuario||JSON.stringify(a)!==JSON.stringify(ctx))throw Error('Contexto alterado após gravação. Confira novamente.');return G.api('/api/pendencias?revisao=1',{method:'POST',body:JSON.stringify({cnj:ctx.cnj,assignee:select.value,apontamentos:codigos})});}).then(function(r){if(!r||!r.ok||!r.task)throw Error('Servidor não confirmou a diligência.');if(ss.estado().usuario!==u.usuario)return;msg.textContent=r.existente?'Já existe revisão em aberto com '+(r.task.assignee||'responsável a conferir')+'.':'Diligência criada e atribuída a '+r.task.assignee+'.';document.dispatchEvent(new CustomEvent('muta:revisao-operacional'));},function(e){msg.textContent=e.message;}).finally(function(){b.disabled=false;});
 };
}
function render() {
  if (!caixa || !aberta()) return;
  var E = ED.estado(), r = K.r, y = $('panel-conf').scrollTop;
  var topo = '<div class="cf-top card"><label class="cf-sw"><input type="checkbox" data-k="ativa"' + (K.ativa ? ' checked' : '') + '><span></span><b>Conformidade ativa</b></label>' +
    ''+
    '<div class="bar"><button type="button" class="btn solid sm" data-k="agora"' + (E.lendo ? ' disabled' : '') + '>' + (E.lendo ? 'Lendo…' : 'Analisar agora') + '</button>' +
    (r ? '<button type="button" class="btn line sm" data-k="copiar">Copiar relatório</button><button type="button" class="btn line sm" data-k="cheia" title="Abre a conformidade numa janela do tamanho da tela; acompanha as novas análises">Tela cheia</button>' : '') +
    '<label class="cf-fmt" title="Confere negrito, itálico e recuo"><input type="checkbox" data-k="fmt"' + (K.fmt ? ' checked' : '') + '> formatação</label></div>' +
    (K.erroDados ? '<p class="status err">' + esc(K.erroDados) + ' A análise segue sem as regras de redação do Compendium.</p>' : '') +
    (E.erro ? '<p class="status err">' + esc(E.erro) + '</p>' : '') +
    (E.texto ? '<p class="muted cf-fonte">Texto: ' + esc(E.fonte) + (K.em ? ' · analisado às ' + new Date(K.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '') + '</p>' : '') + '</div>';
  if (!r) { caixa.innerHTML = topo + '<div class="empty"><h3>Nada analisado</h3>Abra a minuta no editor do PJe e clique em Analisar agora, ou ligue a conformidade ativa.</div>'; return; }
  var grupos = {}; r.itens.forEach(function (x) { grupos[x.grupo] = (grupos[x.grupo] || 0) + 1; });
  var lista = r.itens.filter(function (x) { return !K.grupo || x.grupo === K.grupo; });
  var resumo = '<div class="cf-res card"><div class="cf-nota" data-n="' + (r.nota >= 85 ? 'ok' : r.nota >= 60 ? 'med' : 'mau') + '"><b>' + r.nota + '</b><small>de 100</small></div>' +
    '<div><p><b>' + esc(PECA[r.peca] || r.peca) + '</b>' + (r.resultado ? ' · resultado: ' + esc(MO.RES_TXT[r.resultado]) : '') + '</p>' +
    '<p class="cf-cont"><span data-sev="alta">' + r.resumo.alta + ' alta</span><span data-sev="media">' + r.resumo.media + ' média</span><span data-sev="baixa">' + r.resumo.baixa + ' baixa</span></p>' +
    '</div></div>';
  resumo+=r.fluxo&&r.fluxo.disponivel?'<p class="cf-flow-status">Ficha vinculada ao editor · '+r.fluxo.stats.questoes+' questões · '+r.fluxo.stats.recursos+' recursos · '+r.fluxo.stats.adotados+' materiais declarados adotados. Conferência indicativa, não validação jurídica.</p>':'<p class="cf-flow-status">Conferência cruzada indisponível: confirme o número do editor, a ficha e o sigilo. A análise textual permanece disponível.</p>';
  var filtros = '<div class="seg cf-grupos"><button type="button" data-g="" aria-selected="' + !K.grupo + '">Todos · ' + r.itens.length + '</button>' +
    Object.keys(grupos).map(function (gq) { return '<button type="button" data-g="' + esc(gq) + '" aria-selected="' + (K.grupo === gq) + '">' + esc(gq) + ' · ' + grupos[gq] + '</button>'; }).join('') + '</div>';
  var hero=document.body.classList.contains('hero-redesign-v53');
  var corpoCf = resumo + (r.itens.length ? (hero?matrizHtml(r.itens,r.itens.length):'<ul class="cf-lista">' + r.itens.map(itemHtml).join('') + '</ul>') : '<div class="empty"><h3>Nada a apontar</h3></div>');
  if (window.MutaJanela) window.MutaJanela.atualizar('conformidade', 'Conformidade da minuta', corpoCf);
  K.cheia = corpoCf;
  /* 0.45: a comparação com a minuta-matriz do processo mora aqui (saiu da aba Comparar) */
  var mxh = ''; try { mxh = window.MutaComparar && window.MutaComparar.estruturaConformidade ? window.MutaComparar.estruturaConformidade(render) : ''; } catch (e) {}
  caixa.innerHTML = topo + resumo + mxh + (r.itens.length ? filtros + (hero?matrizHtml(lista,r.itens.length):'<ul class="cf-lista">' + lista.map(itemHtml).join('') + '</ul>') : '<div class="empty"><h3>Nada a apontar</h3>A minuta segue a estrutura e as regras conferidas. Confira os autos antes de liberar.</div>') ;
  if(hero&&r.fluxo&&r.fluxo.disponivel)comandoRevisao(caixa,r.fluxo.itens);
  $('panel-conf').scrollTop = y;
}
function relatorioTexto() {
  var r = K.r; if (!r) return '';
  var E = ED.estado(), f = contexto().prontuario;
  return ['Conformidade · ' + ((f && f.caso && f.caso.numero) || E.numero || 'minuta') + ' · ' + new Date().toLocaleString('pt-BR'), 'Peça: ' + (PECA[r.peca] || r.peca) + ' · nota ' + r.nota + ' · ' + r.resumo.alta + ' alta, ' + r.resumo.media + ' média, ' + r.resumo.baixa + ' baixa', '']
    .concat(r.itens.map(function (x, i) { return (i + 1) + '. [' + SEVR[x.sev] + '] ' + x.grupo + ' · ' + x.regra + (x.sec ? ' · ' + (SECN[x.sec] || x.sec) + (x.par != null ? ' § ' + (x.par + 1) : '') : '') + '\n   ' + x.msg + (x.trecho && x.trecho.alvo ? '\n   Trecho: …' + x.trecho.alvo + '…' : '') + (x.sug ? '\n   Sugestão: ' + x.sug : ''); })).join('\n');
}
function carregarDados() {
  FT.base().then(function (d) { K.dados = d; K.erroDados = ''; if (ED.estado().texto) analisar(); }, function (e) { K.erroDados = 'Regras de redação indisponíveis (' + e.message + ').'; render(); });
}
function expandirHero(){var w=$('min-conf');if(!w)return false;rodape(!w.open);return true;}
(function(){var w=$('min-conf'),nav=document.querySelector('.layout>aside');if(!w)return;
function sync(){w.dataset.aberto=w.open?'1':'0';try{localStorage.setItem(ROD,w.open?'1':'0');}catch(e){}}
w.addEventListener('toggle',sync);
function measure(){if(nav){var r=nav.getBoundingClientRect();document.documentElement.style.setProperty('--hero-review-nav-height',Math.max(0,r.height)+'px');}}
if(nav&&typeof ResizeObserver!=='undefined')new ResizeObserver(measure).observe(nav);measure();window.addEventListener('resize',measure);
})();
caixa.addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.k === 'agora') { ED.ler().then(analisar, function () { render(); }); return; }
  if (b.dataset.k === 'copiar') { (navigator.clipboard ? navigator.clipboard.writeText(relatorioTexto()) : Promise.reject()).then(function () { b.textContent = 'Copiado'; setTimeout(function () { b.textContent = 'Copiar o relatório'; }, 1400); }, function () {}); return; }
  if (b.dataset.g != null) { K.grupo = b.dataset.g; render(); return; }
  if (b.dataset.k === 'cheia') { if(expandirHero())return; if (window.MutaJanela && K.cheia) window.MutaJanela.abrir('conformidade', 'Conformidade da minuta', K.cheia); return; }
});
caixa.addEventListener('change', function (e) {
  var t = e.target, k = t.dataset && t.dataset.k;
  if (k === 'ativa') { K.ativa = t.checked; guarda(); ED.automatico(K.ativa); render(); }
  else if (k === 'fmt') { K.fmt = t.checked; guarda(); analisar(); }
});
ED.ouvir(function () { analisar(); });
document.addEventListener('muta:prontuario', function () { if (ED.estado().texto) analisar(); });
document.addEventListener('muta:fund-vinculos',function(){if(ED.estado().texto)analisar();});
document.addEventListener('muta:ficha-conformidade',function(){if(ED.estado().texto)analisar();});
document.addEventListener('muta:autos', function () { if (ED.estado().texto) analisar(); }); /* 0.40: autos lidos → IDʼs conferidos */
(function () { var t = $('mc-t'); if (t) t.addEventListener('click', function () { var w = $('min-conf'); rodape(!(w && w.dataset.aberto === '1')); render(); }); rodape(); })();
window.MutaConformidade = { comandoRevisao:comandoRevisao,
  /* 0.51: o mesmo contexto (prontuário, autos, questões) para a Conformidade da versão no Cortex */
  contexto: function () { try { return contexto(); } catch (e) { return {}; } },
  abrir: function () { if (!K.dados && !K.erroDados) carregarDados(); render(); var E = ED.estado(); if (!E.texto && !E.lendo) ED.ler().then(analisar, function () { render(); }); },
  ativa: function () { return K.ativa; }
};
carregarDados();
if (K.ativa) ED.automatico(true);
})();
