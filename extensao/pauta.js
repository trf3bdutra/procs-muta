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
  var P = { cal: null, data: '', doc: null, ped: null, pedPauta: null, pedErro: false, erro: '', lendo: false, f: 'todos', tipoProcSol: '', aba: 'itens', solFiltro: 'todas', solTipo: 'todas', qItens:'', qSol:'', qSo:'', soModal:'todas', soEstado:'todas', soSessao:'todas', modalidade:'todas', filtros:{}, aberto: false, seq: 0 };

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
    return '<article class="gx-it pa-ped hero-pa-request' + (av ? ' venc' : '') + '" data-request-state="'+(av?'pend':'ok')+'"><div class="gx-h hero-so-head">' + indicadorSo(tipoPed(r)) + indicadorSessaoSo(sesDe(r)?br(sesDe(r)):'') +
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
  function buscaPainel(k){return '<div class="acv-faixa pa-busca hero-rep-search"><div class="hero-rep-search-head"><span class="hero-rep-search-kicker">Pesquisa e visualização</span><small>'+esc(k==='sol'?'Solicitações':k==='so'?'Sustentações':'Processos')+(k==='so'?' · Todas as sessões':P.data?' · '+esc(br(P.data)):'')+'</small></div><div class="acv-form">';}
  function buscaFaixa(k,q,placeholder){return '<div class="af-l hero-rep-query"><input type="search" data-pa-q="'+k+'" aria-label="'+esc(placeholder)+'" placeholder="'+esc(placeholder)+'" value="'+esc(q)+'" autocomplete="off"><button type="button" class="tu-b" data-pa="buscar:'+k+'" title="Buscar" aria-label="Buscar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg></button><button type="button" class="tu-b" data-pa="limpar:'+k+'" title="Limpar busca" aria-label="Limpar busca">×</button><button type="button" class="tu-b" data-pa="reler" title="Atualizar sessão" aria-label="Atualizar sessão">↻</button></div>';}
  function solicitacoesHtml(itens,indicadores){
    var externas=(P.pedPauta||[]).filter(function(r){return sesDe(r)===P.data;}),internas=(P.doc&&P.doc.solicitacoes)||[];
    var MG=window.MutaGestao||{},shared=MG.pautaPendencias?MG.pautaPendencias(P.data,itens,internas):{duvidas:[],pedidos:[]};
    var pend=new Map(shared.pedidos.map(function(p){return [String(p.id),p];}));
    var L=internas.map(function(r){var p=(r.origem==='Deliberações'||r.origem==='Notificações')?pend.get(String(r.id)):null;if(p)pend.delete(String(r.id));return {r:r,ex:false,g:solGrupo(r.tipo),estado:S(r.estado)||'Pendente',gestao:p};})
      .concat(Array.from(pend.values()).map(function(p){return {r:{cnj:p.numero,tipo:p.tipo,descricao:p.texto,solicitante:p.de},g:'alt',estado:'Pendente',gestao:p};}))
      .concat(shared.duvidas.map(function(d){return {r:{cnj:d.numero,tipo:'Dúvida',descricao:d.texto,solicitante:d.de},g:'du',estado:'Pendente',gestao:d};}));
    var G=[['du','Dúvidas'],['alt','Retirada / adiamento'],['desp','Despachos'],['out','Outras solicitações'],['so','Sustentações registradas na ficha'],['pref','Preferências registradas na ficha']];
    var h=buscaPainel('sol')+buscaFaixa('sol',P.qSol,'Buscar solicitação, processo, advogado…')+'<div class="pa-sol-resumo"><b>'+L.length+' registros</b><span>'+L.filter(function(x){return x.estado==='Pendente';}).length+' pendentes</span><span>'+shared.duvidas.length+' dúvidas</span></div>';
    h+='<div class="pa-f hero-rep-filters" role="group" aria-label="Tipo de solicitação">'+[['todas','Todas']].concat(G).map(function(x){var n=x[0]==='todas'?L.length:L.filter(function(v){return v.g===x[0];}).length;return '<button type="button" class="chip'+(P.solTipo===x[0]?' on':'')+'" data-pa="tipo:'+x[0]+'" aria-pressed="'+(P.solTipo===x[0])+'">'+esc(x[1])+' · '+n+'</button>';}).join('')+'</div>';
    h+='<div class="pa-session-head hero-rep-filters"><label class="pa-sel"><span class="sr">Situação</span><select data-pa="sol-estado">'+[['todas','Todas as situações'],['pendentes','Pendentes'],['deferidas','Deferidas'],['indeferidas','Indeferidas'],['vincular','A vincular'],['vinculadas','Vinculadas']].map(function(x){return '<option value="'+x[0]+'"'+(P.solFiltro===x[0]?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></label><button type="button" class="btn line sm" data-pa="editor">'+(solEditOpen?'Fechar gestão do processo':'+ Solicitação / gestão')+'</button></div>';
        if(P.solTipo==='so')h+='<div class="af-l hero-rep-filters"><select data-pa="modalidade" aria-label="Modalidade da sustentação">'+[['todas','Todas as modalidades'],['presencial','Presencial'],['video','Videoconferência']].map(function(x){return '<option value="'+x[0]+'"'+(P.modalidade===x[0]?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></div>';
    h+='</div></div><section class="pa-ses hero-pa-results">';if(shared.erro)h+='<p class="status err">'+esc(shared.erro)+'</p>';
    if(solEditOpen)h+='<div id="pa-sol-editor"><p class="muted">Selecione um processo para registrar ou apreciar solicitações.</p></div>';
    if(P.pedErro)h+='<p class="status err">Não foi possível atualizar os pedidos externos.</p>';
    if(!P.doc||P.doc.solicitacoesErro||!Array.isArray(P.doc.solicitacoes))h+='<p class="status err">'+esc(P.doc&&P.doc.solicitacoesErro||'Solicitações internas indisponíveis nesta versão da API.')+'</p>';
    var estados={pendentes:'Pendente',deferidas:'Deferida',indeferidas:'Indeferida',vincular:'a vincular',vinculadas:'Vinculada'};
    var vis=L.filter(function(x){return (P.solTipo==='todas'||x.g===P.solTipo)&&(P.solFiltro==='todas'||x.estado===estados[P.solFiltro])&& (P.solTipo!=='so'||P.modalidade==='todas'||normalBusca(tipoPed(x.r)).includes(P.modalidade))&&buscaCasa(P.qSol,[x.r.cnj,x.r.numero,x.r.item,x.r.tipo,x.r.advogado,x.r.solicitante,x.r.parte,x.r.justificativa,x.r.descricao,x.estado]);});
    G.forEach(function(gr){var A=vis.filter(function(x){return x.g===gr[0];});if(!A.length)return;h+='<h4 class="pm-mer-h hero-pa-request-group">'+esc(gr[1])+' <small>'+A.length+'</small></h4>';A.forEach(function(x){var r=x.r;if(x.gestao&&MG.pautaCard){h+='<div class="pa-shared-card hero-pa-request" data-request-state="pend">'+MG.pautaCard(x.g==='du'?'duvida':'pedido',x.gestao)+'</div>';return;}if(x.ex){h+=pedCard(r,{itens:itens,ses:1});return;}
      h+='<article class="gx-it pa-ped hero-pa-request" data-request-state="'+(/indefer/i.test(x.estado)?'no':/defer|vinculad/i.test(x.estado)?'ok':'pend')+'"><div class="gx-h'+(x.g==='so'||x.g==='pref'?' hero-so-head':'')+'">'+(x.g==='so'||x.g==='pref'?indicadorSo(r.tipo)+indicadorSessaoSo(r.sessaoOrigem||P.data?br(r.sessaoOrigem||P.data):''):'<b class="gx-t">'+esc(r.tipo)+'</b>')+'<span class="gx-c">'+esc(x.estado)+'</span>'+(r.item?'<span class="gx-c">item '+esc(r.item)+'</span>':'')+'</div><p class="gx-m"><button type="button" class="lnk mono" data-pa="gerir:'+esc(r.cnj)+'">'+esc(r.cnj)+'</button></p><p class="gx-m">'+esc([r.origem,r.solicitante,br(S(r.data).slice(0,10)),r.inferido?'vínculo pela pauta atual':''].filter(Boolean).join(' · '))+'</p>'+(r.sessaoPretendida?'<p class="gx-m">Sessão pretendida: '+esc(br(r.sessaoPretendida))+'</p>':'')+(r.justificativa||r.descricao?'<p class="gx-tx">'+esc(r.justificativa||r.descricao)+'</p>':'')+(r.resposta?'<p class="gx-ob">'+esc(r.resposta)+'</p>':'')+(r.decididoPor?'<p class="gx-m">Apreciada por '+esc(r.decididoPor)+' · '+esc(br(S(r.decididoEm).slice(0,10)))+'</p>':'')+'</article>';});});
    return h+(vis.length?'':'<p class="muted">Nenhuma solicitação nesta visualização.</p>')+'</section>';
  }

  function listaHtml() {
    var opts = (P.cal || []).map(function (s) { return '<option value="' + esc(s.date) + '"' + (s.date === P.data ? ' selected' : '') + '>' + esc(br(s.date)) + (s.date < hoje() ? ' (passada)' : '') + '</option>'; }).join('');
    var seletor='<label class="pa-marco-select"><span class="sr">Sessão de julgamento</span><select data-pa="ses" aria-label="Sessão de julgamento">'+opts+'</select></label>';
    var h='';
    var d = P.doc || {}, L = (d.itens || []).length ? d.itens : (d.previa || []), previa = !(d.itens || []).length && (d.previa || []).length;
    var nsol=(d.solicitacoes||[]).length+(P.pedPauta||[]).filter(function(r){return sesDe(r)===P.data;}).length;
    var fallback='<div class="pa-session-head">'+seletor+'<span class="muted">Processos · '+L.length+'</span></div>';
    var topo=h;h='';var sess=(P.cal||[]).find(function(s){return s.date===P.data;});if(sess){var mk=sess.marcos||{};var marcos=[['pautarAte','Pautar até'],['inicioPreparacao','Preparação'],['entregaMinutas','Minutas'],['liberacao','Liberação']].filter(function(x){return mk[x[0]];});if(P.data){/* 0.76: marcos como a linha do tempo da Pauta do Ex Officio: concluídos, hoje e a sessão */var hj=hoje(),dd=function(a,b){return Math.round((Date.parse(b)-Date.parse(a))/864e5);};var pts=marcos.map(function(x){return {r:x[1],d:S(mk[x[0]]).slice(0,10)};}).concat([{r:'Hoje',d:hj,hj:1},{r:'Sessão',d:P.data,ses:1}]).filter(function(x){return /^\d{4}-\d{2}-\d{2}$/.test(x.d);}).sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:(a.hj?-1:1);});
      h+='<div class="pa-marcos" role="list" aria-label="Marcos da sessão">'+pts.map(function(x){var est=x.hj||x.d===hj?'now':x.d<hj?'past':'fut',n=dd(hj,x.d),sub=x.hj?'data atual':n<0?'há '+Math.abs(n)+(n===-1?' dia':' dias'):n===0?'hoje':'em '+n+(n===1?' dia':' dias');return '<div class="pa-mk '+est+(x.ses?' ses':'')+'" role="listitem"><i></i><small>'+esc(x.r)+'</small>'+(x.ses?seletor:'<b>'+esc(br(x.d).slice(0,5))+'</b>')+'<em>'+sub+'</em></div>';}).join('')+'</div>';}if(!sess.pauta)h+='<p class="muted">Marcos publicados · listagem ainda não publicada.</p>';}
    if(!h)h=fallback;
    if (P.lendo && !P.doc) return topo+h+'<section class="pa-ses hero-pa-results"><p class="muted">Lendo a pauta…</p></section>';
    var pedidos=(d.solicitacoes||[]).map(function(r){return {tipo:S(r.tipo)||'Outras',cnj:r.cnj};}).concat((P.pedPauta||[]).filter(function(r){return sesDe(r)===P.data;}).map(function(r){return {tipo:tipoPed(r),cnj:r.cnj||r.numero};}));
    var tipos={};pedidos.forEach(function(r){tipos[r.tipo]=(tipos[r.tipo]||0)+1;});
    var incompleto=P.pedErro||!Array.isArray(d.solicitacoes)||d.solicitacoesErro;
    var marcosHtml=h;h=topo;

    var cur = dg(GB().cnj ? GB().cnj() : '');
    var R = L.map(function (it) { var a = alertas(it);
      if (!(it.ctl || {}).sopref) (P.pedPauta || []).filter(function (r) { return sesDe(r) === P.data && dg(r.cnj || r.numero) === dg(it.cnj); }).slice(0, 1).forEach(function (r) { a.push(['so', /prefer/i.test(tipoPed(r)) ? 'Preferência' : 'Sustentação', 'pedido recebido · ' + S(r.advogado)]); });
      var ps=pedidos.filter(function(r){return dg(r.cnj)&&dg(r.cnj)===dg(it.cnj);});ps.forEach(function(r){if(!a.some(function(v){return v[1]===r.tipo;}))a.push(['so',r.tipo,'Solicitação registrada']);});return { it: it, e: etapa(it), a: a, ps:ps }; });
    function retido(x){var c=x.it.ctl||{};return /^(ret|adi)$/.test(x.e.k)||(!c.intercorOk&&/retirad|adiad/i.test(S(c.intercorTipo)+' '+S(c.intercor)));}
    function filtroCmt(k,x){var i=x.it;return k==='pautados'?true:k==='a-liberar'?!i.dataLiberacao:k==='minutados'?!!i.dataMinuta:k==='corrigidos'?!!i.dataCorrecao:k==='liberados'?!!i.dataLiberacao:k==='retidos'?retido(x):false;}
    var CMT=[['pautados','Pautados'],['a-liberar','A liberar'],['minutados','Minutados'],['corrigidos','Corrigidos'],['liberados','Liberados'],['retidos','Retidos']];
    var distribuicao=[['lib','Liberados',function(i){return !!i.dataLiberacao;}],['cor','Corrigidos',function(i){return !i.dataLiberacao&&!!i.dataCorrecao;}],['min','Minutados',function(i){return !i.dataLiberacao&&!i.dataCorrecao&&!!i.dataMinuta;}],['sem','Sem minuta',function(i){return !i.dataLiberacao&&!i.dataCorrecao&&!i.dataMinuta;}]].map(function(x){return [x[0],x[1],L.filter(x[2]).length];});
    var total=L.length, pct=total?Math.round(distribuicao[0][2]*100/total):0;
    var FALTA={dataMinuta:'a minutar',dataCorrecao:'a corrigir',dataLiberacao:'a liberar'},NOME={dataMinuta:'Minutas do gabinete',dataCorrecao:'Correções',dataLiberacao:'Liberações'};
    var m=PASSOS.slice(1).map(function(p){var n=L.filter(function(it){return !!it[p[0]];}).length,pc=L.length?Math.round(n*100/L.length):0;
      return '<div class="hero-v53-pa-metric pa-m-'+esc(p[0])+'"><small>'+esc(NOME[p[0]])+'</small><div class="pa-m-value"><b>'+n+'<span> de '+L.length+'</span></b><span class="pa-pct">'+pc+'%</span></div><progress aria-label="'+esc(NOME[p[0]])+'" value="'+n+'" max="'+Math.max(1,L.length)+'"></progress><em class="pa-falta">'+(L.length-n?'faltam '+(L.length-n)+' '+FALTA[p[0]]:'completo')+'</em></div>';
    }).join('');
    var campos=[['servidor','Servidor'],['corretor','Corretor'],['assunto','Assunto'],['classe','Classe']];
    function facetas(){return '<details class="hero-cmt-pauta-filters"'+(P.filtrosOpen?' open':'')+'><summary>Filtros</summary><div>'+campos.map(function(x){var k=x[0],cont={};L.forEach(function(i){var v=S(i[k]);if(v)cont[v]=(cont[v]||0)+1;});return '<label>'+esc(x[1])+'<select data-pa-facet="'+k+'"><option value="">Todos</option>'+Object.keys(cont).sort(function(a,b){return a.localeCompare(b,'pt-BR');}).map(function(v){return '<option value="'+esc(v)+'"'+(P.filtros[k]===v?' selected':'')+'>'+esc(v)+' ('+cont[v]+')</option>';}).join('')+'</select></label>';}).join('')+'<button type="button" class="lnk" data-pa="limpar-filtros">Limpar filtros</button></div></details>';}
    var cont = {}; R.forEach(function (x) { cont[x.e.k] = (cont[x.e.k] || 0) + 1; });
    var nAl = R.filter(function (x) { return x.a.some(function (a) { return a[0] === 'al'; }); }).length;
    var F = [['todos', 'Todos', L.length], ['al', 'Com alerta', nAl], ['sol', 'Com solicitações', R.filter(function(x){return x.ps.length;}).length], ['nd', 'A designar', cont.nd || 0], ['des', 'Minutando', cont.des || 0], ['min', 'Em correção', cont.min || 0], ['cor', 'A liberar', cont.cor || 0], ['lib', 'Liberados', cont.lib || 0], ['jul', 'Julgados', cont.jul || 0], ['fora', 'Retirados/adiados', (cont.ret || 0) + (cont.adi || 0)]];
    var vis = R.filter(function (x) { var it=x.it;return (P.f === 'todos' ? true : CMT.some(function(c){return c[0]===P.f;})?filtroCmt(P.f,x): P.f === 'al' ? x.a.some(function (a) { return a[0] === 'al'; }) : P.f === 'sol' ? x.ps.some(function(r){return !P.tipoProcSol||r.tipo===P.tipoProcSol;}) : P.f === 'fora' ? /ret|adi/.test(x.e.k) : x.e.k === P.f)&&campos.every(function(c){return !P.filtros[c[0]]||S(it[c[0]])===P.filtros[c[0]];})&&buscaCasa(P.qItens,[it.cnj,it.item,it.classe,it.assunto,it.servidor,it.corretor,x.e.t,x.ps.map(function(r){return r.tipo;}).join(' ')]); });
    /* Faixa cumulativa de produção sempre visível; situações são filtros compactos. */
    var filtros=F.filter(function(f){return f[0]!=='todos'&&f[0]!=='sol'&&(f[2]||P.f===f[0]);}).map(function(f){var on=P.f===f[0]&&!P.tipoProcSol;return '<button type="button" class="chip pa-status-filter stat-'+f[0]+(on?' on':'')+'" data-pa="f:'+f[0]+'" aria-pressed="'+on+'">'+esc(f[1])+' <i>'+f[2]+'</i></button>';}).join('');
    var nSol=R.filter(function(x){return x.ps.length;}).length,pcSol=L.length?Math.round(nSol*100/L.length):0;
    var solMetric='<button type="button" class="hero-v53-pa-metric pa-m-solicitacoes" data-pa="solcard" aria-pressed="'+(P.f==='sol')+'" title="Filtrar processos com solicitações; clique novamente para limpar"><small>Solicitações</small><div class="pa-m-value"><b>'+pedidos.length+'<span> registros</span></b><span class="pa-pct">'+pcSol+'%</span></div><progress aria-label="Percentual de processos com solicitação" value="'+nSol+'" max="'+Math.max(1,L.length)+'"></progress><em class="pa-falta">'+nSol+' processo'+(nSol===1?'':'s')+' · '+Object.keys(tipos).length+' tipo'+(Object.keys(tipos).length===1?'':'s')+(incompleto?' · parcial':'')+'</em></button>';
    var indicadores='<section class="hero-pa-overview" aria-label="Marcos e indicadores da sessão">'+marcosHtml+'<div class="hero-v53-pa-metrics hero-pa-production-strip hero-pa-four">'+m+solMetric+'</div></section>';
    if(P.aba==='sol')return '<div class="pa-sol-session"><span>Sessão</span>'+seletor+'</div>'+solicitacoesHtml(L,'');
    h += indicadores+buscaPainel('itens')+buscaFaixa('itens',P.qItens,'Buscar na pauta por item, processo, assunto…')+facetas()+'<div class="pa-f hero-rep-filters" role="group" aria-label="Filtrar por situação">'+filtros+'</div><p class="status hero-rep-count" role="status">'+vis.length+' de '+L.length+' processos</p></div></div><section class="pa-ses hero-pa-results" aria-label="Resultados da pauta">'+(previa?'<p class="muted">Prévia da pauta (ainda sem a relação oficial do PJe).</p>':'')+(!vis.length?'<p class="muted">'+(L.length?'Nenhum processo corresponde aos filtros.':'Sem processos nesta pauta.')+'</p>':'');
    /* Solicitações resumidas nos indicadores e na lista de processos. */
    function renderProcessos(grupo){return '<ol class="pa-l">' + grupo.map(function (x) {
      var it = x.it, at = dg(it.cnj) === cur, passo = PASSOS.map(function (p) { return '<i class="' + (it[p[0]] ? 'ok' : '') + '" title="' + p[1] + '"></i>'; }).join('');
      return '<li class="pa-it e-' + x.e.k + (at ? ' at' : '') + '"><div class="pa-b hero-pa-balanced">' +
        '<div class="pa-card-head"><span class="pa-n">' + esc(it.item || '—') + '</span><b class="mono">' + esc(it.cnj) + '</b>'+etqCl(it)+
        '<button type="button" class="pa-open-proc" data-pa="abrir:' + esc(it.cnj) + '" title="Abrir o prontuário deste processo" aria-label="Abrir prontuário de ' + esc(it.cnj) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 5h6v6M19 5l-9 9"/><path d="M19 13v6H5V5h6"/></svg></button></div>'+
        '<div class="pa-card-assunto">'+esc(S(it.assunto)||S(it.classe)||'Assunto não informado')+'</div>'+
        '<div class="pa-card-people"><div><small>Minuta</small><b>'+esc(S(it.servidor)||'—')+'</b></div><div><small>Correção</small><b>'+esc(S(it.corretor)||'—')+'</b></div></div>'+
        '<div class="pa-card-status"><span class="pa-et">'+esc(x.e.t)+'</span><span class="pa-st" aria-label="Etapas da produção">'+passo+'</span></div>'+
        (x.a.length?'<div class="pa-al">'+x.a.map(function(a){return '<em class="k-'+a[0]+'" title="'+esc(a[2])+'">'+esc(a[1])+'</em>';}).join('')+'</div>':'')+'</div></li>';
    }).join('') + '</ol>';}
    if(P.f==='sol'){Object.keys(tipos).sort().filter(function(t){return !P.tipoProcSol||P.tipoProcSol===t;}).forEach(function(t){var grupo=vis.filter(function(x){return x.ps.some(function(r){return r.tipo===t;});});if(grupo.length)h+='<h4 class="pm-mer-h" style="margin:10px 0 5px;padding:6px 0;border-top:1px solid var(--line)">'+esc(t)+' · '+grupo.length+' processos</h4>'+renderProcessos(grupo);});}else h+=renderProcessos(vis);
    return h + '</section>';
  }
  function pedidosHtml() {
    var L = P.pedPauta || [], por = {}, h0 = hoje();
    var h=buscaPainel('so')+buscaFaixa('so',P.qSo,'Buscar processo, advogado, parte…')+'<div class="pa-sol-resumo"><b>'+L.length+' registros</b><span>'+L.filter(aVincular).length+' a vincular</span><span>'+L.filter(function(r){return !aVincular(r);}).length+' vinculados / registrados</span></div>';var mods=[['todas','Todas'],['presenc','Presencial'],['video','Videoconferência'],['prefer','Preferência']];h+='<div class="pa-f hero-rep-filters" role="group" aria-label="Modalidade">'+mods.map(function(m){return '<button type="button" class="chip'+(P.soModal===m[0]?' on':'')+'" data-pa="so-modal:'+m[0]+'" aria-pressed="'+(P.soModal===m[0])+'">'+m[1]+' · '+L.filter(function(r){return m[0]==='todas'||normalBusca(tipoPed(r)).includes(m[0]);}).length+'</button>';}).join('')+'</div><div class="pa-session-head hero-rep-filters"><select data-pa="so-sessao" aria-label="Sessão"><option value="todas">Todas as sessões</option>'+Array.from(new Set(L.map(sesDe).filter(Boolean))).sort().map(function(d){return '<option value="'+esc(d)+'"'+(P.soSessao===d?' selected':'')+'>'+esc(br(d))+'</option>';}).join('')+'<option value="sem"'+(P.soSessao==='sem'?' selected':'')+'>Sem sessão identificada</option></select><select data-pa="so-estado" aria-label="Vínculo">'+[['todas','Todas as situações'],['pend','A vincular'],['ok','Vinculadas / registradas']].map(function(x){return '<option value="'+x[0]+'"'+(P.soEstado===x[0]?' selected':'')+'>'+x[1]+'</option>';}).join('')+'</select></div></div></div><section class="pa-ses hero-pa-results pa-so">';L=L.filter(function(r){return (P.soModal==='todas'||normalBusca(tipoPed(r)).includes(P.soModal))&&(P.soEstado==='todas'||(P.soEstado==='pend')===aVincular(r))&&(P.soSessao==='todas'||(P.soSessao==='sem'?!sesDe(r):sesDe(r)===P.soSessao))&&buscaCasa(P.qSo,[r.cnj,r.numero,r.advogado,r.parte,r.oab,tipoPed(r),r.item]);});
    if(P.pedErro)h+='<p class="status err">Não foi possível atualizar os pedidos externos.</p>';
    if(P.pedPauta===null&&!P.pedErro)return h+'<p class="muted">Lendo os pedidos…</p></section>';
    h+='<p class="pa-results-count muted">'+L.length+' registros na visualização</p>';
    L.forEach(function(r){var d=sesDe(r)||'sem sessão';(por[d]=por[d]||[]).push(r);});
    var datas=Object.keys(por).sort(function(a,b){return a==='sem sessão'?1:b==='sem sessão'?-1:(a>=h0)===(b>=h0)?a.localeCompare(b):a>=h0?-1:1;});
    var d=P.doc||{},itens=(d.itens||[]).length?d.itens:(d.previa||[]);
    h+=datas.map(function(data){
      var X=por[data].slice().sort(function(a,b){return Number(aVincular(b))-Number(aVincular(a));});
      return '<details class="gg pa-sd"'+(data>=h0||data===P.data||data==='sem sessão'?' open':'')+'><summary><h4>'+(data==='sem sessão'?'Sem sessão identificada':'Sessão de '+esc(br(data)))+'</h4><span class="gn">'+X.length+'</span></summary><div class="gr">'+
        (data!=='sem sessão'&&data!==P.data&&X.some(aVincular)?'<button type="button" class="btn line sm" data-pa="ses:'+esc(data)+'">Selecionar sessão para vincular</button>':'')+
        X.map(function(r){return pedCard(r,{itens:data===P.data&&!P.lendo&&P.doc?itens:null});}).join('')+'</div></details>';
    }).join('');
    return h+(!L.length&&!P.pedErro?'<p class="muted">Nenhum pedido recebido.</p>':'')+'</section>';
  }
  function abasPauta(){
    return '<div class="seg pmodos gx-modos" role="tablist" aria-label="Áreas da pauta">'+[['itens','Sessão'],['sol','Solicitações'],['so','Sustentações']].map(function(x){return '<button type="button" role="tab" data-pa="aba:'+x[0]+'" aria-selected="'+(P.aba===x[0])+'">'+x[1]+'</button>';}).join('')+'</div>';
  }
  function pintar() {
    var c = app(); if (!c || !visivel()) return;
    var s = ses ? ses.estado() : {};
    if (s.estado !== 'on') { c.innerHTML = '<div class="empty">Entre no Ex Officio (aba Prontuário) para ver as pautas.</div>'; return; }
    var y = c.scrollTop, ativo=document.activeElement, chave=ativo&&ativo.dataset&&ativo.dataset.paQ;
    c.innerHTML = (P.erro ? '<p class="status err">' + esc(P.erro) + '</p>' : '') + abasPauta() + (P.aba==='so'?pedidosHtml():listaHtml());
    var host=$('pa-sol-editor');if(host&&solEditor&&dg(solCnj)===dg(GB().cnj&&GB().cnj())){host.replaceChildren();var head=document.createElement('p');head.className='muted';head.textContent='Processo em gestão · '+solCnj;host.append(head,solEditor);}
    c.scrollTop = y;if(chave){var inp=c.querySelector('[data-pa-q="'+chave+'"]');if(inp){inp.focus({preventScroll:true});if(ativo&&typeof ativo.selectionStart==='number')inp.setSelectionRange(ativo.selectionStart,ativo.selectionEnd);}}
  }

  /* ---------- ações ---------- */
  document.addEventListener('toggle',function(e){var t=e.target;if(t&&t.isConnected&&t.matches&&t.matches('#pauta-app .hero-cmt-pauta-filters'))P.filtrosOpen=t.open;},true);
  document.addEventListener('input',function(e){var t=e.target;if(!t.dataset||!t.dataset.paQ||!t.closest('#pauta-app'))return;P[t.dataset.paQ==='sol'?'qSol':t.dataset.paQ==='so'?'qSo':'qItens']=t.value;pintar();});
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#pauta-app [data-pa]'); if (!b) return;
    var a = b.getAttribute('data-pa');
    if (/^aba:/.test(a)) { var modo=a.slice(4); if(['itens','sol','so'].indexOf(modo)<0)return; P.aba=modo;pintar();return; }
    if (/^ses:/.test(a)) { var dt=a.slice(4);if((P.cal||[]).some(function(x){return x.date===dt;}))trocar(dt);return; }
    if(/^buscar:/.test(a)){var k=a.slice(7),inp=app().querySelector('[data-pa-q="'+k+'"]');if(inp)P[k==='sol'?'qSol':k==='so'?'qSo':'qItens']=inp.value;pintar();return;}
    if(a==='limpar-filtros'){P.filtros={};P.f='todos';P.tipoProcSol='';P.qItens='';pintar();return;}
    if(a==='reler'){if(P.data)trocar(P.data);else ler();return;}
    if(/^limpar:/.test(a)){P[a.slice(7)==='sol'?'qSol':a.slice(7)==='so'?'qSo':'qItens']='';pintar();return;}
    if(a==='editor'){solEditOpen=!solEditOpen;pintar();return;}
    if(/^so-modal:/.test(a)){P.soModal=a.slice(9);pintar();return;}if(/^tipo:/.test(a)){P.solTipo=a.slice(5);pintar();return;}
    if(/^gerir:/.test(a)){solEditOpen=true;var n=a.slice(6),brg=window.MutaProntuarioBridge;if(brg&&brg.abrirProcesso)brg.abrirProcesso(n);pintar();return;}
    if (/^sol:/.test(a)) { P.solFiltro=a.slice(4);pintar();return; }
    if (/^sol-abrir:/.test(a)) { var n=a.slice(10),brg=window.MutaProntuarioBridge;if(brg&&brg.abrirProcesso)brg.abrirProcesso(n);if(window.MutaAbas)window.MutaAbas.ir('pront');return; }
    if(a==='solcard'){P.f=P.f==='sol'?'todos':'sol';P.tipoProcSol='';pintar();return;}
    if(a.indexOf('soltipo:')===0){var tipo=a.slice(8);var desativar=P.f==='sol'&&P.tipoProcSol===tipo;P.f=desativar?'todos':'sol';P.tipoProcSol=desativar?'':tipo;pintar();return;}
    if (/^f:/.test(a)) { var filtro=a.slice(2);P.f=P.f===filtro&&!P.tipoProcSol?'todos':filtro; P.tipoProcSol=''; pintar(); return; }
    if (/^abrir:/.test(a)) { var n = a.slice(6), brg = window.MutaProntuarioBridge; if (brg && brg.abrirProcesso) brg.abrirProcesso(n); if (window.MutaAbas) window.MutaAbas.ir('pront'); return; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.closest || !t.closest('#pauta-app')) return;
    if(t.dataset.paFacet){P.filtros[t.dataset.paFacet]=t.value;pintar();return;}
    if(t.getAttribute('data-pa')==='so-sessao'){P.soSessao=t.value;pintar();return;}if(t.getAttribute('data-pa')==='so-estado'){P.soEstado=t.value;pintar();return;}if(t.getAttribute('data-pa')==='modalidade'){P.modalidade=t.value;pintar();return;}
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
  window.MutaPauta = { receberEditor:function(cnj,node){solCnj=cnj;solEditor=node;if(visivel()&&P.aba==='sol'&&solEditOpen)pintar();}, pedidosProcesso: pedidosProcesso, registrarPedido: registrarPedido, abrir: function () { if (!P.cal || !P.doc) ler(); else { pintar(); if(P.data&&!P.lendo)trocar(P.data); } }, pintar: pintar, atualizarGestao:function(){if(!visivel()||P.aba!=='sol')return;var a=document.activeElement;if(a&&a.closest&&a.closest('#pauta-app input,#pauta-app textarea,#pauta-app select'))return;pintar();}, relerGestao:function(){if(visivel()&&P.data)trocar(P.data);else if(P.data)P.doc=null;}, contextoGestao:function(p){var d=P.doc||{},L=(d.itens||[]).length?d.itens:(d.previa||[]);return {sessao:P.data,item:L.find(function(i){return dg(i.cnj)===dg(p.numero);})};}, etapa: etapa, alertas: alertas };
})();
