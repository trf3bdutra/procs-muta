/* ================= ENCICLOPÉDIA (versão avançada): recursos, qual via, guias, rotina, PJe, competência, matérias, léxico ================= */
(function(){
  var raiz=document.getElementById('v-enc');if(!raiz)return;
  var ED=null,ES={s:'vias',via:'apc',ato:'',guia:'sag',fase:'',est:'',mg:'',lg:'',cmp:[],modo:'ficha',q:{}};
  var CK={};try{CK=JSON.parse(localStorage.getItem('vdm-enc-ck')||'{}');}catch(e){}
  function salvaCk(){try{localStorage.setItem('vdm-enc-ck',JSON.stringify(CK));}catch(e){}}
  function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function nq(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
  function semTag(s){return String(s||'').replace(/<[^>]+>/g,' ');}
  function $e(s){return raiz.querySelector(s);}
  function dados(){if(!ED){try{ED=JSON.parse(document.getElementById('enc-dados').textContent);}catch(x){ED={};}
    ED.viaId={};(ED.vias||[]).forEach(function(v){ED.viaId[v.id]=v;});ED.guiaId={};(ED.guias||[]).forEach(function(g){ED.guiaId[g.id]=g;});
    ED.faseId={};(ED.fases||[]).forEach(function(f){ED.faseId[f.id]=f;});ED.cxId={};(ED.caixas||[]).forEach(function(c){ED.cxId[c.id]=c;});}return ED;}
  var SUBS=[['vias','Recursos'],['qual','Qual via?'],['guias','Guias práticos'],['rotina','Rotina do gabinete'],['pje','Caixas e fluxos do PJe'],['comp','Competência'],['mat','Matérias'],['lex','Léxico'],['reg','Regimento']];
  function q(){return nq(ES.q[ES.s]||'');}
  function casa(txt){var t=q();if(!t)return true;var n=nq(semTag(txt));return t.split(/\s+/).every(function(w){return n.indexOf(w)>=0;});}
  function fluxo(id){var s=(dados().fluxogramas||{})[id];return s?'<div class="enc-flow" role="img" aria-label="Fluxograma">'+s+'</div>':'';}
  function comFluxos(h){return String(h||'').replace(/<div class="enc-flow" data-flow="(\w+)"><\/div>/g,function(m,id){return fluxo(id);});}
  function ckHtml(h,pref){var i=0;return String(h||'').replace(/<input type="checkbox">/g,function(){var k=pref+':'+(i++);return '<input type="checkbox" data-eck="'+e(k)+'"'+(CK[k]?' checked':'')+'>';});}
  function html(h,pref){return '<div class="enc-html">'+ckHtml(comFluxos(h),pref)+'</div>';}
  function lnk(tipo,id,txt){return '<button class="enc-lk" data-ego="'+tipo+':'+e(id)+'">'+e(txt)+'</button>';}
  function alvo(l){var D=dados();
    if(l.tk&&D.cxId[l.tk])return lnk('pje',l.tk,'Caixa · '+D.cxId[l.tk].nome);
    if(l.rot&&D.faseId[l.rot])return lnk('rotina',l.rot,'Rotina · '+D.faseId[l.rot].t);
    if(l.sc&&D.guiaId[l.sc])return lnk('guias',l.sc,'Guia · '+D.guiaId[l.sc].t);
    if(l.ficha&&D.viaId[l.ficha])return lnk('vias',l.ficha,'Recurso · '+D.viaId[l.ficha].nome);return '';}
  function vazio(t){return '<p class="empty">'+e(t||'Nada encontrado para a busca.')+'</p>';}
  function cab(t,s){return '<div class="enc-cab"><h2>'+t+'</h2>'+(s?'<p class="meta">'+s+'</p>':'')+'</div>';}

  /* ---------- Recursos ---------- */
  function viaTxt(v){return [v.nome,v.kw,v.base,v.prazo,v.contra,v.orgao,v.sust,(v.ess||[]).join(' '),v.atn,(v.rot||[]).map(function(g){return g.t+' '+g.i.join(' ');}).join(' ')].join(' ');}
  function asideVias(){var D=dados(),h='<div class="lab" style="margin-top:0">Vista</div><div class="seg"><button data-emodo="ficha" aria-pressed="'+(ES.modo==='ficha')+'">Ficha</button><button data-emodo="quadro" aria-pressed="'+(ES.modo==='quadro')+'">Quadro</button><button data-emodo="cmp" aria-pressed="'+(ES.modo==='cmp')+'">Comparar'+(ES.cmp.length?' ('+ES.cmp.length+')':'')+'</button></div>';
    Object.keys(D.familias||{}).forEach(function(f){var L=D.vias.filter(function(v){return v.fam===f&&casa(viaTxt(v));});if(!L.length)return;
      h+='<div class="lab">'+e(D.familias[f].n)+' <small>'+e(D.familias[f].s)+'</small></div>'+L.map(function(v){return '<button class="enc-it'+(ES.via===v.id&&ES.modo==='ficha'?' on':'')+'" data-evia="'+v.id+'"><b>'+e(v.nome)+'</b><span>'+e(v.badge)+'</span></button>';}).join('');});
    return h;}
  function ficha(v){var D=dados();
    var h='<article class="enc-ficha"><div class="enc-fh"><div><span class="enc-k">'+e((D.familias[v.fam]||{}).n||'')+'</span><h2>'+e(v.nome)+'</h2></div><div class="enc-fa"><span class="enc-badge">'+e(v.badge)+'</span><button class="e-mini" data-ecmp="'+v.id+'">'+(ES.cmp.indexOf(v.id)>=0?'Tirar da comparação':'Comparar')+'</button></div></div>';
    h+='<div class="enc-facts">'+[['Cabe contra',v.contra],['Prazo',v.prazo],['Órgão julgador',v.orgao],['Sustentação oral',v.sust],['Base normativa',v.base]].map(function(x){return '<div><span>'+x[0]+'</span><b>'+e(x[1])+'</b></div>';}).join('')+'</div>';
    h+='<h3 class="enc-h">Essencial</h3><ul class="enc-ul">'+(v.ess||[]).map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul>';
    if(v.atn)h+='<div class="enc-atn">'+v.atn+'</div>';
    if((v.rot||[]).length){h+='<h3 class="enc-h">Rotina do gabinete <small>marque enquanto trabalha</small></h3><div class="enc-rot">'+v.rot.map(function(g,gi){var feitos=g.i.filter(function(x,ii){return CK['via:'+v.id+':'+gi+':'+ii];}).length;
      return '<div class="enc-grp"><h4>'+e(g.t)+'<small>'+feitos+'/'+g.i.length+'</small></h4>'+g.i.map(function(x,ii){var k='via:'+v.id+':'+gi+':'+ii;return '<label class="enc-chk'+(CK[k]?' on':'')+'"><input type="checkbox" data-eck="'+k+'"'+(CK[k]?' checked':'')+'><span>'+x+'</span></label>';}).join('')+'</div>';}).join('')+'</div><button class="e-mini" data-eckclr="via:'+v.id+':">Desmarcar a rotina</button>';}
    h+='<h3 class="enc-h">Fluxo</h3>'+fluxo(v.fluxo);
    if((v.sc||[]).length)h+='<h3 class="enc-h">Guias relacionados</h3><div class="enc-lks">'+v.sc.map(function(s){return alvo({sc:s});}).join('')+'</div>';
    return h+'</article>';}
  function quadro(){var D=dados(),L=D.vias.filter(function(v){return casa(viaTxt(v));});if(!L.length)return vazio();
    return cab('Quadro-síntese das vias recursais','Clique no nome para abrir a ficha; marque para comparar.')+'<div class="enc-tbl"><table><thead><tr><th></th><th>Recurso</th><th>Cabe contra</th><th>Prazo</th><th>Órgão julgador</th><th>Sustentação oral</th></tr></thead><tbody>'+
      L.map(function(v){return '<tr><td><input type="checkbox" data-ecmpk="'+v.id+'"'+(ES.cmp.indexOf(v.id)>=0?' checked':'')+' aria-label="Comparar '+e(v.nome)+'"></td><td>'+lnk('vias',v.id,v.nome)+'</td><td>'+e(v.contra)+'</td><td>'+e(v.prazo)+'</td><td>'+e(v.orgao)+'</td><td>'+e(v.sust)+'</td></tr>';}).join('')+'</tbody></table></div>';}
  function comparar(){var D=dados(),L=ES.cmp.map(function(i){return D.viaId[i];}).filter(Boolean);
    if(!L.length)return cab('Comparação','Escolha vias no Quadro ou use “Comparar” na ficha (até 4).')+vazio('Nenhuma via escolhida.');
    var R=[['Família',function(v){return e((D.familias[v.fam]||{}).n);}],['Prazo',function(v){return e(v.prazo);}],['Cabe contra',function(v){return e(v.contra);}],['Órgão julgador',function(v){return e(v.orgao);}],['Sustentação oral',function(v){return e(v.sust);}],['Base normativa',function(v){return e(v.base);}],['Essencial',function(v){return '<ul class="enc-ul">'+v.ess.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul>';}],['Atenção',function(v){return v.atn||'';}]];
    return cab('Comparação','<button class="e-mini" data-ecmpclr>Limpar a comparação</button>')+'<div class="enc-tbl enc-cmp"><table><thead><tr><th></th>'+L.map(function(v){return '<th>'+lnk('vias',v.id,v.nome)+'</th>';}).join('')+'</tr></thead><tbody>'+R.map(function(r){return '<tr><th>'+r[0]+'</th>'+L.map(function(v){return '<td>'+r[1](v)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';}
  function mainVias(){var D=dados();if(ES.modo==='quadro')return quadro();if(ES.modo==='cmp')return comparar();
    var L=D.vias.filter(function(v){return casa(viaTxt(v));});if(!L.length)return vazio();
    var v=D.viaId[ES.via];if(!v||L.indexOf(v)<0)v=L[0];ES.via=v.id;return ficha(v);}

  /* ---------- Qual via? ---------- */
  function asideQual(){var D=dados();return '<div class="lab" style="margin-top:0">Ato ou situação</div>'+(D.atos||[]).map(function(a){return '<button class="enc-it'+(ES.ato===a.k?' on':'')+'" data-eato="'+a.k+'"><b>'+e(a.t)+'</b><span>'+e(a.d)+'</span></button>';}).join('');}
  function mainQual(){var D=dados(),a=(D.atos||[]).filter(function(x){return x.k===ES.ato;})[0],h='';
    if(!a){h+=cab('Qual via cabe contra o ato?','Escolha à esquerda o ato impugnado: aparecem as vias cabíveis, o prazo e o que conferir.');
      h+='<div class="enc-atos">'+(D.atos||[]).map(function(x){return '<button class="enc-ato" data-eato="'+x.k+'"><b>'+e(x.t)+'</b><span>'+e(x.d)+'</span></button>';}).join('')+'</div>';}
    else{h+=cab(e(a.t),e(a.d))+'<div class="enc-atn">'+a.hint+'</div><div class="enc-vias">'+a.ids.map(function(i){var v=D.viaId[i];if(!v)return '';
      return '<button class="enc-via" data-ego="vias:'+v.id+'"><b>'+e(v.nome)+'</b><span class="enc-badge">'+e(v.badge)+'</span><small>'+e(v.contra)+' · '+e(v.orgao)+'</small></button>';}).join('')+'</div>';}
    h+='<h3 class="enc-h">A porta do recurso</h3>'+fluxo('porta');
    var g=D.guiaId.sag;if(g)h+='<h3 class="enc-h">'+e(g.t)+'</h3>'+html(g.html,'g:sag');
    return h;}

  /* ---------- Guias ---------- */
  function asideGuias(){var D=dados(),L=(D.guias||[]).filter(function(g){return casa(g.t+' '+g.s+' '+g.html);});
    return '<div class="lab" style="margin-top:0">Guias práticos</div>'+(L.length?L.map(function(g){return '<button class="enc-it'+(ES.guia===g.id?' on':'')+'" data-eguia="'+g.id+'"><b>'+e((g.ic?g.ic+' ':'')+g.t)+'</b><span>'+e(g.s)+'</span></button>';}).join(''):'<p class="meta">Nenhum guia.</p>');}
  function mainGuias(){var D=dados(),L=(D.guias||[]).filter(function(g){return casa(g.t+' '+g.s+' '+g.html);});if(!L.length)return vazio();
    var g=D.guiaId[ES.guia];if(!g||L.indexOf(g)<0)g=L[0];ES.guia=g.id;return cab(e(g.t),e(g.s))+html(g.html,'g:'+g.id);}

  /* ---------- Rotina ---------- */
  function faseTxt(f){var D=dados();return f.t+' '+f.s+' '+f.blocos.map(function(b){return b.h+' '+(b.html||'')+' '+(b.sc&&D.guiaId[b.sc]?D.guiaId[b.sc].html:'');}).join(' ');}
  function asideRotina(){var D=dados(),h='<div class="lab" style="margin-top:0">Da chegada à baixa</div><button class="enc-it'+(!ES.fase?' on':'')+'" data-efase=""><b>Visão geral</b><span>As quatro etapas</span></button>';
    (D.etapas||[]).forEach(function(et){h+='<div class="lab">'+e(et.t)+'</div>'+et.ph.map(function(id){var f=D.faseId[id];if(!f||!casa(faseTxt(f)))return '';return '<button class="enc-it'+(ES.fase===id?' on':'')+'" data-efase="'+id+'"><b>'+e(f.n+'. '+f.t)+'</b><span>'+e(f.s)+'</span></button>';}).join('');});
    return h;}
  function mainRotina(){var D=dados();
    if(!ES.fase){return cab('Rotina do gabinete','Da chegada do processo à baixa, etapa por etapa. Os checklists ficam marcados neste navegador.')+'<div class="enc-seq">'+(D.etapas||[]).map(function(et,i){return '<div class="enc-step"><span>'+(i+1)+'</span><b>'+e(et.t)+'</b><small>'+e(et.s)+'</small><div>'+et.ph.map(function(id){var f=D.faseId[id];return f?lnk('rotina',id,f.n+'. '+f.t):'';}).join('')+'</div></div>';}).join('')+'</div>';}
    var f=D.faseId[ES.fase];if(!f)return vazio();
    var h=cab(e(f.n+'. '+f.t),e(f.s));
    f.blocos.forEach(function(b,bi){var g=b.sc&&D.guiaId[b.sc];h+='<section class="enc-bl">'+((b.h||g)?'<h3 class="enc-h">'+e(b.h||g.t)+'</h3>':'')+(b.html?html(b.html,'f:'+f.id+':'+bi):'')+(g?html(g.html,'g:'+g.id):'')+'</section>';});
    return h;}

  /* ---------- PJe ---------- */
  function cxTxt(c){var D=dados();return c.nome+' '+c.serve+' '+c.gab+' '+((D.atosCaixa||{})[c.id]||[]).map(function(a){return a[1]+' '+a[2];}).join(' ');}
  function asidePje(){var D=dados(),h='<div class="lab" style="margin-top:0">Estações do gabinete</div><button class="enc-it'+(!ES.est?' on':'')+'" data-eest=""><b>Todas as caixas</b><span>'+(D.caixas||[]).length+' caixas</span></button>';
    (D.estacoes||[]).forEach(function(s){var n=(D.caixas||[]).filter(function(c){return c.st===s.id&&casa(cxTxt(c));}).length;h+='<button class="enc-it'+(ES.est===s.id?' on':'')+'" data-eest="'+s.id+'"><b>'+e(s.t)+'</b><span>'+n+' caixa'+(n===1?'':'s')+'</span></button>';});
    return h+'<button class="enc-it'+(ES.est==='_fluxos'?' on':'')+'" data-eest="_fluxos"><b>Fluxos do PJe</b><span>Tarefas de cada fluxo</span></button>';}
  function mainPje(){var D=dados();
    if(ES.est==='_fluxos'){var tq=q();return cab('Fluxos do PJe','Os fluxos que passam pelo gabinete e as tarefas de cada um.')+(D.fluxosPje||[]).map(function(g){var F=g.f.filter(function(f){return !tq||casa(f+' '+((D.tarefasPje||{})[f]||[]).join(' '));});if(!F.length)return '';
      return '<section class="enc-bl"><h3 class="enc-h">'+e(g.t)+'</h3><div class="enc-pf">'+F.map(function(f){var T=(D.tarefasPje||{})[f]||[];return '<details><summary><code class="pje">'+e(f)+'</code> <small>'+T.length+' tarefa'+(T.length===1?'':'s')+'</small></summary><ul class="enc-ul">'+T.map(function(t){return '<li>'+e(t)+'</li>';}).join('')+'</ul></details>';}).join('')+'</div></section>';}).join('');}
    var S=(D.estacoes||[]).filter(function(s){return !ES.est||s.id===ES.est;}),h='';
    S.forEach(function(s){var C=(D.caixas||[]).filter(function(c){return c.st===s.id&&casa(cxTxt(c));});if(!C.length)return;
      h+='<section class="enc-bl"><h3 class="enc-h">'+e(s.t)+' <small>'+C.length+'</small></h3><p class="meta">'+e(s.d)+'</p>'+C.map(function(c){var A=(D.atosCaixa||{})[c.id]||[];
        return '<div class="enc-cx" id="enc-cx-'+c.id+'"><h4><code class="pje">'+e(c.nome)+'</code></h4><p><b>Para que serve.</b> '+e(c.serve)+'</p><p><b>No gabinete.</b> '+c.gab+'</p>'+
          (A.length?'<div class="enc-atosc">'+A.map(function(a){return '<div class="enc-ac t-'+a[0]+'"><em>'+e((D.tiposAto||{})[a[0]]||a[0])+'</em><span>'+e(a[1])+(a[2]?'<small>'+e(a[2])+'</small>':'')+'</span></div>';}).join('')+'</div>':'')+
          ((c.l||[]).length?'<div class="enc-lks">'+c.l.map(alvo).join('')+'</div>':'')+'</div>';}).join('')+'</section>';});
    return h||vazio();}

  /* ---------- Competência ---------- */
  var CP=[['turma','A Turma Regional de MS'],['secoes','As Seções do TRF3'],['qual','Em qual Seção cai?'],['delegada','Competência delegada'],['distincao','Turma Regional × Turma Recursal'],['impedimentos','Impedimentos e suspeições'],['subsecoes','Subseções e varas de MS']];
  function asideComp(){return '<div class="lab" style="margin-top:0">Competência</div>'+CP.map(function(c){return '<button class="enc-it" data-eanc="enc-c-'+c[0]+'"><b>'+c[1]+'</b></button>';}).join('');}
  function qualSecao(){var D=dados(),t=q(),L=(D.assuntosSecao||[]).filter(function(a){return t&&casa(a.nome+' '+(a.alias||[]).join(' ')+' '+a.ramo);}).slice(0,60);
    return '<p class="meta">'+(t?L.length+(L.length===60?'+':'')+' assunto(s) para “'+e(ES.q.comp)+'”':'Digite a matéria na busca acima (servidor, FGTS, tributo, benefício…) para ver a Seção.')+' Base: '+(D.assuntosSecao||[]).length+' assuntos da tabela do gabinete.</p>'+
      (L.length?'<div class="enc-tbl"><table><thead><tr><th>Assunto</th><th>Seção</th><th>Ramo</th></tr></thead><tbody>'+L.map(function(a){return '<tr><td>'+e(a.nome)+'</td><td><b>'+e(a.secao||'—')+'</b></td><td>'+e(a.ramo)+'</td></tr>';}).join('')+'</tbody></table></div>':'');}
  function mainComp(){var D=dados(),C=D.competencia||{};
    return CP.map(function(c){var b;if(c[0]==='qual')b=qualSecao();else if(c[0]==='subsecoes')b='<div class="enc-subs">'+(D.subsecoes||[]).map(function(s){return '<div class="enc-sub"><b>'+e(s[0])+'</b><ul class="enc-ul">'+s[1].map(function(o){return '<li><code>'+e(o[0])+'</code> '+e(o[1].join(' · '))+'</li>';}).join('')+'</ul></div>';}).join('')+'</div>';
      else b=html(C[c[0]]||'','c:'+c[0]);
      return '<section class="enc-bl" id="enc-c-'+c[0]+'"><h3 class="enc-h">'+c[1]+'</h3>'+b+'</section>';}).join('');}

  /* ---------- Matérias e Léxico ---------- */
  function asideGrp(G,cur,attr,L,campo){return '<div class="lab" style="margin-top:0">Grupos</div><button class="enc-it'+(!cur?' on':'')+'" '+attr+'=""><b>Todos</b><span>'+L.length+'</span></button>'+G.map(function(g){var n=L.filter(function(x){return x[campo]===g.id;}).length;return '<button class="enc-it'+(cur===g.id?' on':'')+'" '+attr+'="'+g.id+'"><b>'+e(g.t)+'</b><span>'+n+'</span></button>';}).join('');}
  function matTxt(m){return m.t+' '+m.sec+' '+m.d+' '+(m.pts||[]).join(' ')+' '+(m.tags||[]).join(' ');}
  function mainMat(){var D=dados(),G=D.materiasGrupos||[],L=(D.materias||[]).filter(function(m){return (!ES.mg||m.g===ES.mg)&&casa(matTxt(m));});if(!L.length)return vazio();
    return G.filter(function(g){return L.some(function(m){return m.g===g.id;});}).map(function(g){return '<section class="enc-bl"><h3 class="enc-h">'+e(g.t)+'</h3>'+(g.p?'<p class="meta">'+e(g.p)+'</p>':'')+'<div class="enc-cards">'+L.filter(function(m){return m.g===g.id;}).map(function(m){
      return '<div class="enc-card"><div class="enc-k">'+e(m.sec)+'</div><h4>'+e(m.t)+'</h4><p>'+e(m.d)+'</p><ul class="enc-ul">'+(m.pts||[]).map(function(p){return '<li>'+p+'</li>';}).join('')+'</ul>'+((m.tags||[]).length?'<div class="enc-tags">'+m.tags.map(function(t){return '<span>'+e(t)+'</span>';}).join('')+'</div>':'')+'</div>';}).join('')+'</div></section>';}).join('');}
  function lexTxt(x){return [x.t,x.lat,x.d,(x.det||[]).join(' '),x.gab,x.base,x.rel].join(' ');}
  function mainLex(){var D=dados(),G=D.lexicoGrupos||[],L=(D.lexico||[]).filter(function(x){return (!ES.lg||x.g===ES.lg)&&casa(lexTxt(x));});if(!L.length)return vazio();
    return G.filter(function(g){return L.some(function(x){return x.g===g.id;});}).map(function(g){return '<section class="enc-bl"><h3 class="enc-h">'+e(g.t)+' <small>'+e(g.s)+'</small></h3>'+(g.p?'<p class="meta">'+e(g.p)+'</p>':'')+L.filter(function(x){return x.g===g.id;}).map(function(x){
      return '<details class="enc-lex"><summary><b>'+e(x.t)+'</b><i>'+e(x.lat)+'</i><span>'+e(x.d)+'</span></summary><ul class="enc-ul">'+(x.det||[]).map(function(d){return '<li>'+d+'</li>';}).join('')+'</ul>'+(x.gab?'<p><b>No gabinete.</b> '+x.gab+'</p>':'')+(x.base?'<p class="meta"><b>Base:</b> '+x.base+'</p>':'')+((x.rel||[]).length?'<div class="enc-lks">'+[].concat(x.rel).map(function(r){return alvo({sc:r});}).join('')+'</div>':'')+'</details>';}).join('')+'</section>';}).join('');}

  /* ---------- Regimento ---------- */
  function mainReg(){return cab('Regimento Interno do TRF3','O texto integral, com busca, estrutura e notas de redação, fica no Repertório.')+'<button class="btn" data-ereg>Abrir o Regimento Interno no Repertório</button>'+
    '<h3 class="enc-h">Ritos regimentais e Presidência</h3>'+(dados().guiaId.sreg?html(dados().guiaId.sreg.html,'g:sreg'):'');}

  /* ---------- montagem ---------- */
  var R={vias:[asideVias,mainVias,'Buscar nos recursos: prazo, cabimento, palavra-chave…'],qual:[asideQual,mainQual,''],guias:[asideGuias,mainGuias,'Buscar nos guias…'],rotina:[asideRotina,mainRotina,'Buscar na rotina…'],
    pje:[asidePje,mainPje,'Buscar caixa, tarefa ou ato do PJe…'],comp:[asideComp,mainComp,'Em qual Seção cai? Digite a matéria…'],
    mat:[function(){var D=dados();return asideGrp(D.materiasGrupos||[],ES.mg,'data-emg',D.materias||[],'g');},mainMat,'Buscar matéria, súmula ou tema…'],
    lex:[function(){var D=dados();return asideGrp(D.lexicoGrupos||[],ES.lg,'data-elg',D.lexico||[],'g');},mainLex,'Buscar verbete…'],reg:[function(){return '';},mainReg,'']};
  function render(){dados();var r=R[ES.s]||R.vias;
    $e('#enc-aside').innerHTML=r[0]();$e('#enc-out').innerHTML=r[1]();
    var qi=$e('#enc-q');qi.placeholder=r[2]||'Buscar na enciclopédia…';qi.disabled=!r[2];if(qi.value!==(ES.q[ES.s]||''))qi.value=ES.q[ES.s]||'';
    $e('#enc-bar').hidden=!r[2];
    Array.prototype.forEach.call(raiz.querySelectorAll('#enc-sub button'),function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-s')===ES.s));});
    try{localStorage.setItem('vdm-enc-s',ES.s);}catch(x){}}
  function vai(s,id){ES.s=s;if(id!=null){if(s==='vias'){ES.via=id;ES.modo='ficha';}else if(s==='guias')ES.guia=id;else if(s==='rotina')ES.fase=id;else if(s==='pje'){var c=dados().cxId[id];ES.est=c?c.st:'';}}
    render();if(window.VDM_marcaNav)window.VDM_marcaNav();window.scrollTo(0,0);
    if(s==='pje'&&id){var el=document.getElementById('enc-cx-'+id);if(el){el.scrollIntoView({block:'center'});el.classList.add('flash');setTimeout(function(){el.classList.remove('flash');},1400);}}}
  try{var s0=localStorage.getItem('vdm-enc-s');if(s0&&R[s0])ES.s=s0;}catch(x){}
  (function(){var r=raiz.querySelector('#enc-sub');if(!r.children.length)r.innerHTML=SUBS.map(function(s){return '<button data-s="'+s[0]+'">'+s[1]+'</button>';}).join('');
    Array.prototype.forEach.call(r.children,function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-s')===ES.s));});})();
  raiz.addEventListener('click',function(ev){var b=ev.target.closest('button,input[data-eck],input[data-ecmpk]');if(!b||!raiz.contains(b))return;var a;
    if((a=b.getAttribute('data-s'))!=null&&b.closest('#enc-sub')){vai(a);return;}
    if((a=b.getAttribute('data-ego'))){var p=a.split(':');vai(p[0],p.slice(1).join(':'));return;}
    if((a=b.getAttribute('data-evia'))){ES.via=a;ES.modo='ficha';render();window.scrollTo(0,0);return;}
    if((a=b.getAttribute('data-emodo'))){ES.modo=a;render();return;}
    if((a=b.getAttribute('data-ecmp'))){var i=ES.cmp.indexOf(a);if(i>=0)ES.cmp.splice(i,1);else{ES.cmp.push(a);if(ES.cmp.length>4)ES.cmp.shift();}render();return;}
    if((a=b.getAttribute('data-ecmpk'))){var j=ES.cmp.indexOf(a);if(j>=0)ES.cmp.splice(j,1);else{ES.cmp.push(a);if(ES.cmp.length>4)ES.cmp.shift();}$e('#enc-aside').innerHTML=asideVias();return;}
    if(b.hasAttribute('data-ecmpclr')){ES.cmp=[];render();return;}
    if((a=b.getAttribute('data-eato'))!=null){ES.ato=ES.ato===a?'':a;render();return;}
    if((a=b.getAttribute('data-eguia'))){ES.guia=a;render();window.scrollTo(0,0);return;}
    if((a=b.getAttribute('data-efase'))!=null){ES.fase=a;render();window.scrollTo(0,0);return;}
    if((a=b.getAttribute('data-eest'))!=null){ES.est=a;render();window.scrollTo(0,0);return;}
    if((a=b.getAttribute('data-emg'))!=null){ES.mg=a;render();return;}
    if((a=b.getAttribute('data-elg'))!=null){ES.lg=a;render();return;}
    if((a=b.getAttribute('data-eanc'))){var el=document.getElementById(a);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if((a=b.getAttribute('data-eckclr'))){Object.keys(CK).forEach(function(k){if(k.indexOf(a)===0)delete CK[k];});salvaCk();render();return;}
    if(b.hasAttribute('data-ereg')){var t=document.querySelector('.tab[data-v="rep"]');if(t)t.click();var s=document.querySelector('#v-rep .sub button[data-s="reg"]');if(s)s.click();if(window.VDM_marcaNav)window.VDM_marcaNav();window.scrollTo(0,0);return;}
  });
  raiz.addEventListener('change',function(ev){var c=ev.target.closest('input[data-eck]');if(!c)return;var k=c.getAttribute('data-eck');if(c.checked)CK[k]=1;else delete CK[k];salvaCk();
    var l=c.closest('.enc-chk');if(l)l.classList.toggle('on',c.checked);var g=c.closest('.enc-grp');if(g){var sm=g.querySelector('h4 small');if(sm)sm.textContent=g.querySelectorAll('input:checked').length+'/'+g.querySelectorAll('input').length;}});
  var tq;$e('#enc-q').addEventListener('input',function(ev){clearTimeout(tq);var v=ev.target.value;tq=setTimeout(function(){ES.q[ES.s]=v;var p=ev.target.selectionStart;render();var qi=$e('#enc-q');qi.focus();try{qi.setSelectionRange(p,p);}catch(x){}},180);});
  var aba=document.querySelector('.tab[data-v="enc"]');if(aba)aba.addEventListener('click',function(){setTimeout(render,0);});
  window.VDM_enc=vai;
})();
