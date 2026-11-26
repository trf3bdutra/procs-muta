/* HERO18810 0.58 · aba Pauta
   - Processo em tela: situação de julgamento, remarcação, sustentação/preferência (editáveis, gravam na ficha) e o histórico de pautas;
   - Pautas do Ex Officio: seletor das sessões (/api/sessoes) e a lista de processos da sessão (/api/pauta?data=), com a etapa
     (designado → minutado → corrigido → liberado; retirado, adiado ou julgado) e os alertas do cartão (intercorrência, pendências,
     avisos, sustentação/preferência). Clicar no processo abre o prontuário dele;
   - Sustentação oral e preferência: os pedidos recebidos (/api/sessoes?pedidos=1), divididos por sessão (antes em Deliberações).
   Nada é gravado no PJe. */
(function () {
  'use strict';
  var ses = window.MutaSessao;
  var $ = function (id) { return document.getElementById(id); };
  var S = function (v) { return v == null ? '' : String(v).trim(); };
  var esc = function (s) { return S(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dg = function (s) { return S(s).replace(/\D/g, ''); };
  var br = function (d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(d)); return m ? m[3] + '/' + m[2] + '/' + m[1] : S(d); };
  var hoje = function () { return new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10); };
  var P = { cal: null, data: '', doc: null, ped: null, pedPauta: null, pedErro: false, erro: '', lendo: false, f: 'todos', aba: 'itens', solFiltro: 'todas', solTipo: 'todas', qItens:'', qSol:'', modalidade:'todas', aberto: false, seq: 0 };

  var solEditor=null,solCnj='',solEditOpen=false;
  function GB() { return window.MutaGabinete || {}; }
  function app() { return $('pauta-app'); }
  function visivel() { var p = $('panel-pauta'); return !!(p && !p.hidden); }

  /* ---------- leitura ---------- */
  function ler() {
    if (!ses || ses.estado().estado !== 'on') { P.erro = ''; pintar(); return; }
    var seq=++P.seq; P.lendo = true; pintar();
    var cal = P.cal ? Promise.resolve() : ses.api('/api/sessoes').then(function (j) {
      P.cal = (j.sessoes || []).filter(function (s) { return s.date; }).sort(function (a, b) { return S(a.date).localeCompare(S(b.date)); });
      if (!P.data) { var h = hoje(), prox = P.cal.filter(function (s) { return s.date >= h; })[0]; P.data = prox ? prox.date : (P.cal[P.cal.length - 1] || {}).date || ''; }
    });
    var ped = lerPedidosPauta(seq);
    return Promise.all([cal, ped]).then(function () { if(seq!==P.seq)return;return P.data ? ses.api('/api/pauta?data=' + P.data + '&solicitacoes=1').then(function (d) { if(seq===P.seq)P.doc = d; }) : null; })
      .then(function () { if(seq===P.seq)P.erro = ''; }, function (e) { if(seq===P.seq)P.erro = 'Não foi possível ler as pautas: ' + (e && e.message || e); })
      .then(function () { if(seq===P.seq){P.lendo = false; pintar();} });
  }
  function lerPedidosPauta(seq){return ses.api('/api/sessoes?pedidos=1').then(function(j){if(seq!==P.seq)return;P.pedPauta=j.registros||[];P.ped=P.pedPauta.slice();P.pedErro=false;},function(){if(seq===P.seq)P.pedErro=true;});}
  function trocar(data) { var seq=++P.seq;P.data = data; P.doc = null; P.lendo = true; pintar();
    return Promise.all([lerPedidosPauta(seq),ses.api('/api/pauta?data=' + data+'&solicitacoes=1').then(function (d) { if(seq===P.seq){P.doc = d; P.erro = '';} }, function (e) { if(seq===P.seq)P.erro = 'Não foi possível ler a pauta: ' + e.message; })]).then(function () { if(seq===P.seq){P.lendo = false; pintar();} }); }

  /* ---------- etapa e alertas de um item da pauta ---------- */
  var PASSOS = [['servidor', 'Designado'], ['dataMinuta', 'Minutado'], ['dataCorrecao', 'Corrigido'], ['dataLiberacao', 'Liberado']];
  function etapa(it) {
    var r = S(it.resultado);
    if (/retirad/i.test(r)) return { k: 'ret', t: 'Retirado de pauta' };
    if (/adiad/i.test(r)) return { k: 'adi', t: 'Adiado' };
    if (r) return { k: 'jul', t: r };
    if (it.dataLiberacao) return { k: 'lib', t: 'Liberado' };
    if (it.dataCorrecao) return { k: 'cor', t: 'Corrigido · a liberar' };
    if (it.dataMinuta) return { k: 'min', t: 'Minutado · em correção' };
    if (it.servidor) return { k: 'des', t: 'Minutando · ' + S(it.servidor).split(' ')[0] };
    return { k: 'nd', t: 'A designar' };
  }
  function alertas(it) {
    var c = it.ctl || {}, ca = c.cartao || {}, L = [];
    if (c.intercor && !c.intercorOk) L.push(['al', c.intercorTipo || 'Intercorrência', S(c.intercor)]);
    var pd = (ca.pendencias || []).filter(function (p) { return p && p.desc && !p.ok; }); if (pd.length) L.push(['at', pd.length + (pd.length > 1 ? ' pendências' : ' pendência'), pd.map(function (p) { return p.desc; }).join(' · ')]);
    var av = (ca.avisos || []).filter(function (p) { return p && p.desc && !p.ok; }); if (av.length) L.push(['in', av.length + (av.length > 1 ? ' avisos' : ' aviso'), av.map(function (p) { return p.desc; }).join(' · ')]);
    if (c.sopref) L.push(['so', c.sopref === 'Preferência' ? 'Preferência' : 'Sustentação ' + c.sopref.toLowerCase(), 'pedido registrado no cartão']);
    if (c.tempest && /intempest/i.test(c.tempest)) L.push(['al', 'Intempestivo', c.tempest]);
    if (c.preparo && /nao recolh|não recolh|a menor/i.test(c.preparo)) L.push(['al', 'Preparo', c.preparo]);
    if (!it.servidor && !S(it.resultado)) L.push(['at', 'Sem minutante', '']);
    return L;
  }

  /* ---------- pedidos de sustentação oral e preferência (0.64) ---------- */
  function sesDe(r) { return (r.vinculo && r.vinculo.sessao) || r.data || r.sessao || ''; }
  function tipoPed(r) { var t = S(r.tipo || r.titulo); return /prefer/i.test(t) ? 'Preferência' : /presenc/i.test(t) ? 'Sustentação presencial' : /video|virtual/i.test(t) ? 'Sustentação por videoconferência' : t || 'Pedido'; }
  function aVincular(r) { return r.estado === 'a vincular' || !!r.aVincular; }
  function indicadorSo(t){t=String(t||'');var v=/prefer/i.test(t)?['pref','Preferência']:/presenc/i.test(t)?['pres','Presencial']:/v[ií]deo|virtual/i.test(t)?['video','Videoconferência']:['neutro','Modalidade não informada'];return '<span class="gx-c hero-so-tipo" data-modal="'+v[0]+'" title="'+esc(t||'Modalidade não informada')+'">'+v[1]+'</span>';}
  function indicadorSessaoSo(d){return '<span class="gx-c hero-so-sessao" title="Sessão de julgamento">'+esc(d||'Sessão a definir')+'</span>';}
  function pedCard(r, opt) {
    opt = opt || {}; var item = (r.vinculo && r.vinculo.item) || r.item || '', av = aVincular(r), n = r.cnj || r.numero || '';
    return '<article class="gx-it pa-ped' + (av ? ' venc' : '') + '"><div class="gx-h hero-so-head">' + indicadorSo(tipoPed(r)) + indicadorSessaoSo(sesDe(r)?br(sesDe(r)):'') +
      (av ? '<span class="gx-c venc" title="Ainda sem item correspondente na pauta">a vincular</span>' : item ? '<span class="gx-c">item ' + esc(item) + '</span>' : '') +
      (r.origem==='manual'?'<span class="gx-c">manual</span>':'') + '</div>' +
      '<p class="gx-m">' + [n && !opt.semNum ? '<button type="button" class="lnk mono" data-pa="abrir:' + esc(n) + '">' + esc(n) + '</button>' : '', r.recebidoEm || r.em ? 'recebido em ' + esc(br(S(r.recebidoEm || r.em).slice(0, 10))) : ''].filter(Boolean).join(' · ') + '</p>' +
      ((r.advogado || r.parte) ? '<p class="gx-tx">' + [r.advogado ? esc(r.advogado) + (r.oab ? ' (OAB ' + esc(r.oab) + ')' : '') : '', r.parte ? 'por ' + esc(r.parte) : ''].filter(Boolean).join(', ') + '</p>' : '') +
      (av && opt.itens && ses && ses.estado().gestor ? '<div class="pa-vinc"><select data-pa-vi="' + esc(r.id) + '"><option value="">vincular ao item…</option>' + opt.itens.map(function (it) { return '<option value="' + esc(it.cnj) + '">' + esc((it.item || '—') + ' · ' + it.cnj) + '</option>'; }).join('') + '</select></div>' : '') + '</article>';
  }
  function soProcesso(cnj) {
    var d = dg(cnj), L = (P.ped || []).filter(function (r) { return dg(r.cnj || r.numero) === d; }), fi = S(GB().V ? GB().V('pauta', 'Sustentação oral') : '');
    var h = '<div class="pa-soc"><h4 class="pm-mer-h">Sustentação oral e preferência</h4>';
    if (P.ped == null) return h + '<p class="muted">Lendo os pedidos…</p></div>';
    h += L.length ? L.map(function (r) { return pedCard(r, { ses: 1, semNum: 1 }); }).join('') : '<p class="muted">Nenhum pedido recebido para este processo.' + (fi ? '' : ' Para registrar um pedido, use "registrar situação, remarcação e sustentação".') + '</p>';
    if (fi && !L.length) h += '<p class="status err">A ficha registra "' + esc(fi) + '", mas não há pedido recebido para este processo: confira.</p>';
    else if (!fi && L.some(function (r) { return !aVincular(r); })) h += '<p class="status err">Há pedido recebido, mas a ficha não registra sustentação ou preferência: registre abaixo.</p>';
    return h + '</div>';
  }
  function pedSessao(itens) {
    var L = (P.pedPauta || []).filter(function (r) { return sesDe(r) === P.data; });
    if (!L.length) return '<details class="gg pa-pses"><summary><h4>Pedidos desta sessão</h4><span class="gn">nenhum</span></summary><div class="gr"><p class="muted">Nenhum pedido de sustentação ou preferência para esta sessão.</p></div></details>';
    var so = L.filter(function (r) { return !/prefer/i.test(tipoPed(r)); }).length, pr = L.length - so, av = L.filter(aVincular).length;
    L.sort(function (a, b) { return (aVincular(b) ? 1 : 0) - (aVincular(a) ? 1 : 0) || (parseInt((a.vinculo || {}).item || a.item, 10) || 999) - (parseInt((b.vinculo || {}).item || b.item, 10) || 999); });
    return '<details class="gg pa-pses" open><summary><h4>Pedidos desta sessão</h4><span class="gn">' + [so ? so + (so > 1 ? ' sustentações' : ' sustentação') : '', pr ? pr + (pr > 1 ? ' preferências' : ' preferência') : '', av ? av + ' a vincular' : ''].filter(Boolean).join(' · ') + '</span></summary><div class="gr">' +
      L.map(function (r) { return pedCard(r, { itens: itens }); }).join('') + '</div></details>';
  }
  function vincular(id, cnj) {
    if (!cnj) return;
    ses.api('/api/sessoes?pedidos=1', { method: 'POST', body: JSON.stringify({ id: id, data: P.data, cnj: cnj }) })
      .then(function () { return ses.api('/api/sessoes?pedidos=1').then(function (j) { P.ped = j.registros || []; P.pedPauta=P.ped.slice();P.pedErro=false; }); }, function (e) { P.erro = 'Não foi possível vincular: ' + e.message; })
      .then(pintar);
  }

  /* ---------- desenho ---------- */
  function procHtml() {
    var g = GB(), cnj = g.cnj ? g.cnj() : '';
    if (!cnj) return '<section class="card pc-sec"><div class="pc-sh"><h3>Processo em tela</h3></div><p class="muted">Abra um processo no PJe ou na lista abaixo.</p></section>';
    /* 0.62: no formato do cartão do processo (fundo cinza, como "autuação e partes") */
    return '<section class="pc pm pa-proc"><div class="pa-ph"><b>Processo em tela</b><span class="mono">' + esc(cnj) + '</span></div>' + (g.pautaHtml ? g.pautaHtml() : '').replace('<details class="pm-aut pa-reg"', soProcesso(cnj) + '<details class="pm-aut pa-reg"') + '</section>';
  }
  /* 0.64: sigla da classe (TPU/CNJ) e recurso julgado dentro do processo */
  function etqCl(it) { var e2 = window.ClassesCNJ ? window.ClassesCNJ.etiqueta(it.classe, ((it.ctl || {}).cartao || {}).tipoJ || '') : null; return e2 && e2.t ? ' <span class="pc-cl pa-cl" title="' + esc(e2.nome) + '">' + esc(e2.t) + '</span>' : ''; }

  function solGrupo(t){t=S(t);return /sustenta|presenc|video|virtual/i.test(t)?'so':/prefer/i.test(t)?'pref':/retirada|adiamento/i.test(t)?'alt':/despacho/i.test(t)?'desp':'out';}
  function normalBusca(v){return S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function buscaCasa(q,campos){var t=normalBusca(campos.filter(Boolean).join(' '));return normalBusca(q).split(/\s+/).filter(Boolean).every(function(w){return t.includes(w)||(/^\d[\d.\-]+$/.test(w)&&dg(t).includes(dg(w)));});}
  function buscaPainel(k){return '<div class="acv-faixa pa-busca hero-rep-search"><div class="hero-rep-search-head"><span class="hero-rep-search-kicker">Pesquisa e visualização</span><small>'+esc(k==='sol'?'Solicitações':'Processos')+(P.data?' · '+esc(br(P.data)):'')+'</small></div><div class="acv-form">';}
  function buscaFaixa(k,q,placeholder){return '<div class="af-l hero-rep-query"><input type="search" data-pa-q="'+k+'" aria-label="'+esc(placeholder)+'" placeholder="'+esc(placeholder)+'" value="'+esc(q)+'" autocomplete="off"><button type="button" class="tu-b" data-pa="buscar:'+k+'" title="Buscar" aria-label="Buscar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg></button><button type="button" class="tu-b" data-pa="limpar:'+k+'" title="Limpar busca" aria-label="Limpar busca">×</button><button type="button" class="tu-b" data-pa="reler" title="Atualizar sessão" aria-label="Atualizar sessão">↻</button></div>';}
  function solicitacoesHtml(itens){
    var externas=(P.pedPauta||[]).filter(function(r){return sesDe(r)===P.data;}),internas=(P.doc&&P.doc.solicitacoes)||[];
    var L=internas.map(function(r){return {r:r,ex:false,g:solGrupo(r.tipo),estado:S(r.estado)||'Pendente'};}).concat(externas.map(function(r){return {r:r,ex:true,g:solGrupo(tipoPed(r)),estado:aVincular(r)?'a vincular':'Vinculada'};}));
    var G=[['so','Sustentações orais'],['pref','Preferências'],['alt','Retirada / adiamento'],['desp','Despachos'],['out','Outras solicitações']];
    var h=buscaPainel('sol')+buscaFaixa('sol',P.qSol,'Buscar solicitação, processo, advogado…')+'<div class="pa-sol-resumo"><b>'+L.length+' solicitações</b><span>'+L.filter(function(x){return x.estado==='Pendente';}).length+' pendentes</span><b>'+externas.length+' pedidos externos</b><span>'+externas.filter(aVincular).length+' a vincular</span></div>';
    h+='<div class="pa-f hero-rep-filters" role="group" aria-label="Tipo de solicitação">'+[['todas','Todas']].concat(G).map(function(x){var n=x[0]==='todas'?L.length:L.filter(function(v){return v.g===x[0];}).length;return '<button type="button" class="chip'+(P.solTipo===x[0]?' on':'')+'" data-pa="tipo:'+x[0]+'" aria-pressed="'+(P.solTipo===x[0])+'">'+esc(x[1])+' · '+n+'</button>';}).join('')+'</div>';
    h+='<div class="pa-session-head hero-rep-filters"><label class="pa-sel"><span class="sr">Situação</span><select data-pa="sol-estado">'+[['todas','Todas as situações'],['pendentes','Pendentes'],['deferidas','Deferidas'],['indeferidas','Indeferidas'],['vincular','A vincular'],['vinculadas','Vinculadas']].map(function(x){return '<option value="'+x[0]+'"'+(P.solFiltro===x[0]?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></label><button type="button" class="btn line sm" data-pa="editor">'+(solEditOpen?'Fechar gestão do processo':'+ Solicitação / gestão')+'</button></div>';
        if(P.solTipo==='so')h+='<div class="af-l hero-rep-filters"><select data-pa="modalidade" aria-label="Modalidade da sustentação">'+[['todas','Todas as modalidades'],['presencial','Presencial'],['video','Videoconferência']].map(function(x){return '<option value="'+x[0]+'"'+(P.modalidade===x[0]?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></div>';
    h+='</div></div>';
    if(solEditOpen)h+='<div id="pa-sol-editor"><p class="muted">Selecione um processo para registrar ou apreciar solicitações.</p></div>';
    if(P.pedErro)h+='<p class="status err">Não foi possível atualizar os pedidos externos.</p>';
    if(!P.doc||P.doc.solicitacoesErro||!Array.isArray(P.doc.solicitacoes))h+='<p class="status err">'+esc(P.doc&&P.doc.solicitacoesErro||'Solicitações internas indisponíveis nesta versão da API.')+'</p>';
    var estados={pendentes:'Pendente',deferidas:'Deferida',indeferidas:'Indeferida',vincular:'a vincular',vinculadas:'Vinculada'};
    var vis=L.filter(function(x){return (P.solTipo==='todas'||x.g===P.solTipo)&&(P.solFiltro==='todas'||x.estado===estados[P.solFiltro])&& (P.solTipo!=='so'||P.modalidade==='todas'||normalBusca(tipoPed(x.r)).includes(P.modalidade))&&buscaCasa(P.qSol,[x.r.cnj,x.r.numero,x.r.item,x.r.tipo,x.r.advogado,x.r.solicitante,x.r.parte,x.r.justificativa,x.r.descricao,x.estado]);});
    G.forEach(function(gr){var A=vis.filter(function(x){return x.g===gr[0];});if(!A.length)return;h+='<h4 class="pm-mer-h">'+esc(gr[1])+' · '+A.length+'</h4>';A.forEach(function(x){var r=x.r;if(x.ex){h+=pedCard(r,{itens:itens,ses:1});return;}
      h+='<article class="gx-it pa-ped"><div class="gx-h'+(x.g==='so'||x.g==='pref'?' hero-so-head':'')+'">'+(x.g==='so'||x.g==='pref'?indicadorSo(r.tipo)+indicadorSessaoSo(r.sessaoOrigem||P.data?br(r.sessaoOrigem||P.data):''):'<b class="gx-t">'+esc(r.tipo)+'</b>')+'<span class="gx-c">'+esc(x.estado)+'</span>'+(r.item?'<span class="gx-c">item '+esc(r.item)+'</span>':'')+'</div><p class="gx-m"><button type="button" class="lnk mono" data-pa="gerir:'+esc(r.cnj)+'">'+esc(r.cnj)+'</button></p><p class="gx-m">'+esc([r.origem,r.solicitante,br(S(r.data).slice(0,10)),r.inferido?'vínculo pela pauta atual':''].filter(Boolean).join(' · '))+'</p>'+(r.sessaoPretendida?'<p class="gx-m">Sessão pretendida: '+esc(br(r.sessaoPretendida))+'</p>':'')+(r.justificativa||r.descricao?'<p class="gx-tx">'+esc(r.justificativa||r.descricao)+'</p>':'')+(r.resposta?'<p class="gx-ob">'+esc(r.resposta)+'</p>':'')+(r.decididoPor?'<p class="gx-m">Apreciada por '+esc(r.decididoPor)+' · '+esc(br(S(r.decididoEm).slice(0,10)))+'</p>':'')+'</article>';});});
    return h+(vis.length?'':'<p class="muted">Nenhuma solicitação nesta visualização.</p>');
  }

  function listaHtml() {
    var opts = (P.cal || []).map(function (s) { return '<option value="' + esc(s.date) + '"' + (s.date === P.data ? ' selected' : '') + '>' + esc(br(s.date)) + (s.date < hoje() ? ' (passada)' : '') + '</option>'; }).join('');
    var h = '<div class="pa-session-head"><label class="pa-sel"><span class="sr">Sessão de julgamento</span><select data-pa="ses">' + opts + '</select></label>';
    var d = P.doc || {}, L = (d.itens || []).length ? d.itens : (d.previa || []), previa = !(d.itens || []).length && (d.previa || []).length;
    var nsol=(d.solicitacoes||[]).length+(P.pedPauta||[]).filter(function(r){return sesDe(r)===P.data;}).length;
    h+='<div class="seg pmodos pa-session-tabs" role="tablist" aria-label="Conteúdo da sessão"><button type="button" role="tab" data-pa="aba:itens" aria-selected="'+(P.aba==='itens')+'">Processos · '+L.length+'</button><button type="button" role="tab" data-pa="aba:sol" aria-selected="'+(P.aba==='sol')+'">Solicitações · '+nsol+'</button></div></div>';
    var sess=(P.cal||[]).find(function(s){return s.date===P.data;});if(sess){var mk=sess.marcos||{};var marcos=[['pautarAte','Pautar até'],['inicioPreparacao','Preparação'],['entregaMinutas','Minutas'],['liberacao','Liberação']].filter(function(x){return mk[x[0]];});if(marcos.length){/* 0.76: marcos como a linha do tempo da Pauta do Ex Officio: concluídos, hoje e a sessão */var hj=hoje(),dd=function(a,b){return Math.round((Date.parse(b)-Date.parse(a))/864e5);};var pts=marcos.map(function(x){return {r:x[1],d:S(mk[x[0]]).slice(0,10)};}).concat([{r:'Hoje',d:hj,hj:1},{r:'Sessão',d:P.data,ses:1}]).filter(function(x){return /^\d{4}-\d{2}-\d{2}$/.test(x.d);}).sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:(a.hj?-1:1);});
      h+='<div class="pa-marcos" role="list" aria-label="Marcos da sessão">'+pts.map(function(x){var est=x.hj||x.d===hj?'now':x.d<hj?'past':'fut',n=dd(hj,x.d),sub=x.hj?'data atual':n<0?'há '+Math.abs(n)+(n===-1?' dia':' dias'):n===0?'hoje':'em '+n+(n===1?' dia':' dias');return '<div class="pa-mk '+est+(x.ses?' ses':'')+'" role="listitem"><i></i><small>'+esc(x.r)+'</small><b>'+esc(br(x.d).slice(0,5))+'</b><em>'+sub+'</em></div>';}).join('')+'</div>';}if(!sess.pauta)h+='<p class="muted">Marcos publicados · listagem ainda não publicada.</p>';}
    if (P.lendo && !P.doc) return h + '<section class="card pc-sec pa-ses"><p class="muted">Lendo a pauta…</p></section>';
    var FALTA={servidor:'a designar',dataMinuta:'a minutar',dataCorrecao:'a corrigir',dataLiberacao:'a liberar'};var m=PASSOS.map(function(p){var n=L.filter(function(it){return !!it[p[0]];}).length,pc=L.length?Math.round(n*100/L.length):0;return '<div class="hero-v53-pa-metric pa-m-'+esc(p[0])+'"><small>'+esc(p[1])+'</small><span class="pa-pct">'+pc+'%</span><b>'+n+'<span> de '+L.length+'</span></b><progress value="'+n+'" max="'+Math.max(1,L.length)+'"></progress><em class="pa-falta" title="'+(L.length-n?'faltam '+(L.length-n)+' '+(FALTA[p[0]]||''):'')+'">'+(L.length-n?'faltam '+(L.length-n):'completo')+'</em></div>';}).join('');
    h+='<div class="hero-v53-pa-metrics">'+m+'</div>';
    h+='<section class="card pc-sec pa-ses">';
    if(P.aba==='sol')return h+solicitacoesHtml(L)+'</section>';
    if (!L.length) return h + '<p class="muted">Sem processos nesta pauta.</p></section>';
    var cur = dg(GB().cnj ? GB().cnj() : '');
    var R = L.map(function (it) { var a = alertas(it);
      if (!(it.ctl || {}).sopref) (P.pedPauta || []).filter(function (r) { return sesDe(r) === P.data && dg(r.cnj || r.numero) === dg(it.cnj); }).slice(0, 1).forEach(function (r) { a.push(['so', /prefer/i.test(tipoPed(r)) ? 'Preferência' : 'Sustentação', 'pedido recebido · ' + S(r.advogado)]); });
      return { it: it, e: etapa(it), a: a }; });
    var cont = {}; R.forEach(function (x) { cont[x.e.k] = (cont[x.e.k] || 0) + 1; });
    var nAl = R.filter(function (x) { return x.a.some(function (a) { return a[0] === 'al'; }); }).length;
    var F = [['todos', 'Todos', L.length], ['al', 'Com alerta', nAl], ['nd', 'A designar', cont.nd || 0], ['des', 'Minutando', cont.des || 0], ['min', 'Em correção', cont.min || 0], ['cor', 'A liberar', cont.cor || 0], ['lib', 'Liberados', cont.lib || 0], ['fora', 'Retirados/adiados', (cont.ret || 0) + (cont.adi || 0)]];
    var vis = R.filter(function (x) { var it=x.it;return (P.f === 'todos' ? true : P.f === 'al' ? x.a.some(function (a) { return a[0] === 'al'; }) : P.f === 'fora' ? /ret|adi/.test(x.e.k) : x.e.k === P.f)&&buscaCasa(P.qItens,[it.cnj,it.item,it.classe,it.assunto,it.servidor,it.corretor,x.e.t]); });
    h += (previa ? '<p class="muted">Prévia da pauta (ainda sem a relação oficial do PJe).</p>' : '') +
      buscaPainel('itens')+buscaFaixa('itens',P.qItens,'Buscar processo, item, assunto, servidor…')+'<div class="pa-f hero-rep-filters" role="group" aria-label="Pauta">' + F.filter(function (f) { return f[2] || f[0] === 'todos'; }).map(function (f) { return '<button type="button" class="chip' + (P.f === f[0] ? ' on' : '') + '" data-pa="f:' + f[0] + '" aria-pressed="'+(P.f===f[0])+'">' + f[1] + ' <i>' + f[2] + '</i></button>'; }).join('') + '</div><p class="status hero-rep-count" role="status">'+vis.length+' de '+L.length+' processos</p></div></div>';
    /* Os pedidos da sessão estão na subaba Solicitações. */
    h += '<ol class="pa-l">' + vis.map(function (x) {
      var it = x.it, at = dg(it.cnj) === cur, passo = PASSOS.map(function (p) { return '<i class="' + (it[p[0]] ? 'ok' : '') + '" title="' + p[1] + '"></i>'; }).join('');
      return '<li class="pa-it e-' + x.e.k + (at ? ' at' : '') + '"><button type="button" class="pa-b" data-pa="abrir:' + esc(it.cnj) + '" title="Abrir o prontuário deste processo">' +
        '<span class="pa-n">' + esc(it.item || '—') + '</span><span class="pa-c"><b class="mono">' + esc(it.cnj) + etqCl(it) + '</b><small>' + esc(S(it.assunto)) + '</small>' +
        '<span class="hero-v53-pa-people">'+(it.servidor?'<em>Minuta · '+esc(S(it.servidor))+'</em>':'')+(it.corretor?'<em>Correção · '+esc(S(it.corretor))+'</em>':'')+'</span><span class="pa-et"><span class="pa-st">' + passo + '</span>' + esc(x.e.t) + '</span>' +
        (x.a.length ? '<span class="pa-al">' + x.a.map(function (a) { return '<em class="k-' + a[0] + '" title="' + esc(a[2]) + '">' + esc(a[1]) + '</em>'; }).join('') + '</span>' : '') + '</span></button></li>';
    }).join('') + '</ol>';
    return h + '</section>';
  }
  function pedidosHtml() {
    var L = P.ped || [];
    var h = '<section class="card pc-sec pa-so"><div class="pc-sh"><h3>Sustentação oral e preferência</h3><small class="muted">pedidos recebidos, por sessão</small></div>';
    if (P.ped == null) return h + '<p class="muted">Lendo os pedidos…</p></section>';
    if (!L.length) return h + '<p class="muted">Nenhum pedido recebido.</p></section>';
    var por = {}; L.forEach(function (r) { var d = (r.vinculo && r.vinculo.sessao) || r.data || r.sessao || 'sem sessão'; (por[d] = por[d] || []).push(r); });
    var cur = dg(GB().cnj ? GB().cnj() : ''), h0 = hoje();
    return h + Object.keys(por).sort(function (a, b) { return a === 'sem sessão' ? 1 : b === 'sem sessão' ? -1 : (a >= h0) === (b >= h0) ? a.localeCompare(b) : a >= h0 ? -1 : 1; }).map(function (d) {
      var X = por[d];
      return '<details class="gg pa-sd"' + (d >= h0 || d === P.data ? ' open' : '') + '><summary><h4>' + (d === 'sem sessão' ? 'Sem sessão identificada' : 'Sessão de ' + esc(br(d))) + '</h4><span class="gn">' + X.length + '</span></summary><div class="gr">' +
        X.map(function (r) {
          var item = (r.vinculo && r.vinculo.item) || r.item || '', est = r.estado === 'a vincular' || r.aVincular;
          return '<article class="gx-it' + (dg(r.cnj || r.numero) === cur ? ' pa-at' : '') + '"><div class="gx-h"><b class="gx-t">' + esc(r.tipo || r.titulo || 'Pedido') + '</b>' +
            (est ? '<span class="gx-c venc" title="Ainda sem item correspondente na pauta">a vincular</span>' : item ? '<span class="gx-c">item ' + esc(item) + '</span>' : '') + '</div>' +
            '<p class="gx-m">' + [r.cnj || r.numero ? '<button type="button" class="lnk mono" data-pa="abrir:' + esc(r.cnj || r.numero) + '">' + esc(r.cnj || r.numero) + '</button>' : '', r.recebidoEm || r.em ? 'recebido em ' + esc(br(S(r.recebidoEm || r.em).slice(0, 10))) : ''].filter(Boolean).join(' · ') + '</p>' +
            ((r.advogado || r.parte) ? '<p class="gx-tx">' + [r.advogado ? esc(r.advogado) + (r.oab ? ' (OAB ' + esc(r.oab) + ')' : '') : '', r.parte ? 'por ' + esc(r.parte) : ''].filter(Boolean).join(', ') + '</p>' : '') + '</article>';
        }).join('') + '</div></details>';
    }).join('') + '</section>';
  }
  function pintar() {
    var c = app(); if (!c || !visivel()) return;
    var s = ses ? ses.estado() : {};
    if (s.estado !== 'on') { c.innerHTML = '<div class="empty">Entre no Ex Officio (aba Prontuário) para ver as pautas.</div>'; return; }
    var y = c.scrollTop, ativo=document.activeElement, chave=ativo&&ativo.dataset&&ativo.dataset.paQ;
    c.innerHTML = (P.erro ? '<p class="status err">' + esc(P.erro) + '</p>' : '') + listaHtml();
    var host=$('pa-sol-editor');if(host&&solEditor&&dg(solCnj)===dg(GB().cnj&&GB().cnj())){host.replaceChildren();var head=document.createElement('p');head.className='muted';head.textContent='Processo em gestão · '+solCnj;host.append(head,solEditor);}
    c.scrollTop = y;if(chave){var inp=c.querySelector('[data-pa-q="'+chave+'"]');if(inp){inp.focus({preventScroll:true});if(ativo&&typeof ativo.selectionStart==='number')inp.setSelectionRange(ativo.selectionStart,ativo.selectionEnd);}}
  }

  /* ---------- ações ---------- */
  document.addEventListener('input',function(e){var t=e.target;if(!t.dataset||!t.dataset.paQ||!t.closest('#pauta-app'))return;P[t.dataset.paQ==='sol'?'qSol':'qItens']=t.value;pintar();});
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#pauta-app [data-pa]'); if (!b) return;
    var a = b.getAttribute('data-pa');
    if (/^aba:/.test(a)) { P.aba=a.slice(4);pintar();return; }
    if(/^buscar:/.test(a)){var k=a.slice(7),inp=app().querySelector('[data-pa-q="'+k+'"]');if(inp)P[k==='sol'?'qSol':'qItens']=inp.value;pintar();return;}
    if(a==='reler'){if(P.data)trocar(P.data);else ler();return;}
    if(/^limpar:/.test(a)){P[a.slice(7)==='sol'?'qSol':'qItens']='';pintar();return;}
    if(a==='editor'){solEditOpen=!solEditOpen;pintar();return;}
    if(/^tipo:/.test(a)){P.solTipo=a.slice(5);pintar();return;}
    if(/^gerir:/.test(a)){solEditOpen=true;var n=a.slice(6),brg=window.MutaProntuarioBridge;if(brg&&brg.abrirProcesso)brg.abrirProcesso(n);pintar();return;}
    if (/^sol:/.test(a)) { P.solFiltro=a.slice(4);pintar();return; }
    if (/^sol-abrir:/.test(a)) { var n=a.slice(10),brg=window.MutaProntuarioBridge;if(brg&&brg.abrirProcesso)brg.abrirProcesso(n);if(window.MutaAbas)window.MutaAbas.ir('pront');return; }
    if (/^f:/.test(a)) { P.f = a.slice(2); pintar(); return; }
    if (/^abrir:/.test(a)) { var n = a.slice(6), brg = window.MutaProntuarioBridge; if (brg && brg.abrirProcesso) brg.abrirProcesso(n); if (window.MutaAbas) window.MutaAbas.ir('pront'); return; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.closest || !t.closest('#pauta-app')) return;
    if(t.getAttribute('data-pa')==='modalidade'){P.modalidade=t.value;pintar();return;}
    if(t.getAttribute('data-pa')==='sol-estado'){P.solFiltro=t.value;pintar();return;}
    if (t.getAttribute('data-pa') === 'ses') { trocar(t.value); return; }
    if (t.getAttribute('data-pa-vi')) { vincular(t.getAttribute('data-pa-vi'), t.value); return; }
    if (t.dataset && t.dataset.fk && GB().marcar) { GB().marcar(t.dataset.fk, t.value); if (GB().gravar) GB().gravar().catch(function () {}); }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#pauta-app [data-ch]'); if (!b || !GB().marcar) return;
    var id = b.dataset.ch, i = id.indexOf('.'), cv = S(GB().V ? GB().V(id.slice(0, i), id.slice(i + 1)) : '');
    GB().marcar(id, cv === b.dataset.v ? '' : b.dataset.v); if (GB().gravar) GB().gravar().catch(function () {}); setTimeout(pintar, 50);
  });
  document.addEventListener('muta:prontuario', function () { setTimeout(pintar, 300); });
  if (ses && ses.ouvir) ses.ouvir(function () { if (visivel()) ler(); });

  /* Consulta independente da aba Pauta; não redesenha o prontuário durante a edição. */
  var pedConsulta=null,pedConsultadoEm=0;
  function pedidosProcesso(node,cnj,tipo){
    function desenhar(){if(!node.isConnected||dg(node.dataset.cnj)!==dg(cnj))return;var L=(P.ped||[]).filter(function(r){return dg(r.cnj||r.numero)===dg(cnj)&&(!tipo||(tipo==='Preferência')===(r.tipo==='Preferência'));});node.innerHTML=L.length?L.map(function(r){return pedCard(r,{ses:1,semNum:1});}).join(''):'<p class="muted">Nenhuma solicitação registrada.</p>';}
    if(P.ped!==null&&Date.now()-pedConsultadoEm<60000){setTimeout(desenhar,0);return;}
    node.innerHTML='<p class="muted">Lendo solicitações…</p>';
    if(!ses||ses.estado().estado!=='on')return;
    if(!pedConsulta)pedConsulta=ses.api('/api/sessoes?pedidos=1&cnj='+encodeURIComponent(cnj)).then(function(j){var d=dg(cnj);P.ped=(P.ped||[]).filter(function(r){return dg(r.cnj||r.numero)!==d;}).concat(j.registros||[]);pedConsultadoEm=Date.now();}).finally(function(){pedConsulta=null;});
    pedConsulta.then(desenhar,function(){if(node.isConnected)node.innerHTML='<p class="muted">Não foi possível consultar as solicitações.</p>';});
  }
  function registrarPedido(p){return ses.api('/api/sessoes?pedidos=1',{method:'POST',body:JSON.stringify(Object.assign({manual:true},p))}).then(function(j){pedConsultadoEm=0;return j;});}
  window.MutaPauta = { receberEditor:function(cnj,node){solCnj=cnj;solEditor=node;if(visivel()&&P.aba==='sol'&&solEditOpen)pintar();}, pedidosProcesso: pedidosProcesso, registrarPedido: registrarPedido, abrir: function () { if (!P.cal || !P.doc) ler(); else { pintar(); if(P.data&&!P.lendo)trocar(P.data); } }, pintar: pintar, etapa: etapa, alertas: alertas };
})();
