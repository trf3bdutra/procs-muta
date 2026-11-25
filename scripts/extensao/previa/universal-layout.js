/* Adaptador de apresentação exclusivo da prévia. Não substitui os roteiros. */
(function(){
  var cab=cabeca, nt=notas, nota=notaIncluir, sn=snCard, caso=casoNotas,
      rt=corpoRoteiro, etapa=marcarEtapa, ed=editavel, valor=gravado, ct=controlesProcesso;
  var open={}, noteOpen=false, current='', saved=Object.create(null);
  var sintEdit='', sintDraft='';
  var identOpen=false, tabCnj='', extras=Object.create(null), tipoOriginal=Object.create(null);
  var sintKeys={sp:'Síntese Processual',sf:'Síntese Fática'};
  function fragment(h){var t=document.createElement('template');t.innerHTML=h;return t.content;}
  function html(f){var d=document.createElement('div');d.append(f);return d.innerHTML;}
  function elem(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
  function add(p,h){p.append(fragment(h));}
  function btn(t,k,v){var b=elem('button','btn line sm pv-plus',t);b.type='button';b.setAttribute(k,v||'');return b;}
  function locked(c){return c.secao==='producao'&&(/^(LIBERADO|Assinado|Data da Assinatura)$/.test(c.chave)||(c.chave==='Data da Liberação'&&destino()!=='monocratica'));}
  editavel=function(c){return ed(c)&&!locked(c);};
  marcarEtapa=function(i){if(i===etapas().L.length-1)return;return etapa(i);};
  gravado=function(sec,k){var d=saved[G.cnj], id=sec+'.'+k;return d&&Object.prototype.hasOwnProperty.call(d,id)?d[id]:valor(sec,k);};
  window.MutaGabinete.gravado=gravado;
  gravarJa=function(){
    clearTimeout(G.t);G.t=null;var cnj=G.pendCnj||G.cnj,P=G.pend;
    if(!cnj||!Object.keys(P).length)return Promise.resolve({});
    var idDoc='origem.Classificação documental';if(P[idDoc]&&window.MutaAnaliseProntuario)P[idDoc]=window.MutaAnaliseProntuario.mesclar(gravado('origem','Classificação documental'),P[idDoc]);
    Object.assign(saved[cnj]||(saved[cnj]={}),P);G.pend={};G.pendCnj='';
    if(cnj===G.cnj){G.op=G.op||{};Object.keys(P).forEach(function(k){var i=k.indexOf('.'),s=k.slice(0,i);(G.op[s]||(G.op[s]={}))[k.slice(i+1)]=P[k];});st('Prévia: alterações apenas em memória.','ok');}
    return Promise.resolve({operacional:G.op});
  };
  function field(sec,k,label,tags){
    var id=sec+'.'+k,v=S(V(sec,k)),d=elem('div','pv-field'),head=elem('div','pv-head');
    head.append(elem('span','gl',label),btn(open[id]?'−':v?'✎':'+','data-pv-field',id));d.append(head);
    if(open[id])add(d,campoRot(sec,k,label));
    else{if(v){if(tags){var w=elem('div','pv-tags');v.split(/[;|\n]+/).map(S).filter(Boolean).forEach(function(s){w.append(elem('span','chip',s));});d.append(w);}else d.append(elem('div','pv-value',v));}
      var hidden=elem('span');hidden.hidden=true;hidden.setAttribute('data-fk',id);d.append(hidden);}
    return d;
  }
  /* Mesma apresentação e ciclo de edição de assuntoDetalhado(): +, texto,
     lápis, Gravar ou cancelar. Os dois campos preservam suas chaves na ficha. */
  function sintese(id,label,placeholder){
    var k=sintKeys[id],v=S(V('triagem',k)),d=elem('div','pv-sintese');
    var marker=elem('span');marker.hidden=true;marker.setAttribute('data-fk','triagem.'+k);d.append(marker);
    if(sintEdit===id){
      d.append(elem('div','pv-sint-label',label));
      var ed=elem('div','pm-ad ed'),ta=elem('textarea');ta.id='pv-sint-'+id;ta.rows=3;ta.placeholder=placeholder;ta.value=sintDraft;ta.setAttribute('aria-label',label);ta.setAttribute('data-pv-sint-draft',id);
      var actions=elem('span','pm-ad-b'),ok=btn('Gravar','data-pv-sint',id+':ok'),cancel=btn('cancelar','data-pv-sint',id+':x');
      ok.className='btn solid sm';cancel.className='lnk';actions.append(ok,cancel);ed.append(ta,actions);d.append(ed);
    }else if(v){
      d.append(elem('div','pv-sint-label',label));
      var p=elem('p','pm-ad'),text=elem('span','pv-sint-value',v),b=btn('','data-pv-sint',id+':ed');b.className='pm-ad-i';b.innerHTML=SV(IC.min,12);b.title='Editar '+label.toLowerCase();b.setAttribute('aria-label',b.title);p.append(text,b);d.append(p);
    }else{
      var plus=btn('','data-pv-sint',id+':ed');plus.className='pm-ad-add';plus.innerHTML=SV('<path d="M12 5v14M5 12h14"/>',12);plus.append(document.createTextNode(label));plus.title='Incluir '+label.toLowerCase();plus.setAttribute('aria-label',plus.title);d.append(plus);
    }
    return d;
  }
  function sintAcao(id,a){
    if(!Object.prototype.hasOwnProperty.call(sintKeys,id))return;
    if(a==='ed'){sintEdit=id;sintDraft=S(V('triagem',sintKeys[id]));render();var t=$('pv-sint-'+id);if(t)t.focus();return;}
    if(sintEdit!==id)return;
    if(a==='ok'){var t=$('pv-sint-'+id);marcar('triagem.'+sintKeys[id],String(t?t.value:sintDraft).trim());agendar(400);}
    sintEdit='';sintDraft='';render();
  }
  function flow(){
    var E=etapas(),box=elem('div','pv-flowbox'),r=elem('div','pv-flow');box.append(elem('h4','pm-mer-h','Etapas'));
    E.L.forEach(function(x,i){if(x.ic==='tri')return;
      var cell=elem('div','pv-stage'+(x.ok?' ok':i===E.n?' at':'')),b=btn('','data-et',String(i));b.className='pv-stage-btn';b.innerHTML=SV(IC[x.ic],14);b.disabled=i===E.L.length-1||!(i===E.n||i===E.n-1);b.title=i===E.L.length-1?'Ato do relator · somente leitura':'Marcar ou desfazer';
      cell.append(b,elem('b','',x.ic==='ass'?'Assinatura':x.r),elem('small','muted',x.dt?brD(x.dt).slice(0,5):'—'));r.append(cell);});
    box.append(r);var people=elem('div','pv-people');
    [['SERVIDOR','Minuta'],['CORRETOR',E.mono?'Revisão':'Correção']].forEach(function(z){var p=elem('div','pv-person'),v=S(V('producao',z[0]));p.append(elem('small','muted',z[1]));if(G.desEd===z[0]){var i=elem('input');i.id='pm-des';i.setAttribute('data-des',z[0]);i.value=v;p.append(i);}else{var b=btn(v||'Não designado','data-des-ed',z[0]);b.disabled=!G.gestor;p.append(b);}people.append(p);});box.append(people);return box;
  }
  /* Autos são o local de edição documental; roteiros conservam as conclusões
     jurídicas e referências à ficha, sem segundo formulário. */
  var docs = {
    sent:{group:'Sentença', title:'Sentença', keys:[['origem','Sentença - ID','ID'],['origem','Sentença - Data','Data'],['origem','Sentença - Decisão','Decisão'],['origem','Sentença - Resultado','Resultado'],['origem','Sentença - Fundamento','Fundamento'],['origem','Sentença - Honorários','Honorários'],['origem','Sentença - Reexame','Remessa necessária']]},
    imp:{group:'Decisão impugnada',title:'Decisão impugnada',keys:[['triagem','Impugnada - ID','ID'],['triagem','Impugnada - Data','Data'],['triagem','Impugnada - Órgão','Órgão julgador'],['triagem','Impugnada - Relator','Relator(a)'],['triagem','Impugnada - Síntese','Síntese']]},
    ac:{group:'Acórdão recorrido (embargos de declaração)',title:'Acórdão embargado',keys:[['producao','Acórdão - ID','ID'],['producao','Acórdão - Assinado','Assinado'],['producao','Acórdão - Publicado','Publicado'],['producao','Acórdão - Data da publicação','Publicação'],['producao','Acórdão - ED opostos','ED opostos'],['producao','Acórdão - Trânsito','Trânsito']]},
    mpf:{group:'Parecer do MPF',title:'Ministério Público Federal',keys:[['triagem','MPF','Parecer'],['triagem','MPF - Custos Legis','Hipótese de intervenção'],['triagem','ID do Parecer MPF','ID'],['triagem','MPF - Data','Data'],['triagem','Parecer - Sentido','Sentido'],['triagem','Parecer - Sentido (outro)','Conclusão'],['triagem','MPF - Info adicional','Fundamentos']]},
    proc:{group:'Procuração',title:'Procuração',keys:[['triagem','ID da Procuração','ID']],table:['triagem','Procurações'],cols:[['id','ID'],['data','Data'],['validade','Validade'],['advogados','Advogados']]},
    rec:{group:'Recursos e contrarrazões',title:'Recurso(s)',keys:[],table:['origem','Recursos'],cols:[['ids','ID'],['parte','Recorrente'],['data','Protocolo'],['teses','Teses'],['pedidos','Pedidos']]},
    contra:{group:'Recursos e contrarrazões',title:'Contrarrazões',keys:[['origem','Contrarrazões - Situação','Situação']],table:['origem','Contrarrazões'],cols:[['ids','ID'],['parte','Parte'],['data','Data'],['preliminares','Preliminares'],['teses','Teses']]},
    origem:{group:'Origem',title:'Origem',keys:[['origem','Origem - Juízo','Juízo'],['origem','Origem - Julgador','Julgador(a)'],['origem','Origem - Processo de referência','Processo de referência']]},
    custas:{group:'Outras peças e ocorrências',title:'Comprovantes de preparo',keys:[],cats:['custas']},
    intim:{group:'Recursos e contrarrazões',title:'Intimações / publicações',keys:[],cats:['intimacao']}
  };
  var stepDocs={decisao:['sent'],impugnada:['imp'],prolator:['imp'],tempest:['rec','intim'],preparo:['custas'],repres:['proc'],reexame:['sent'],cabimento:['imp','rec'],vicios:['ac','rec'],impug:['imp','rec'],dialet:['rec'],mpf:['mpf'],contra:['contra'],efeito:['imp'],infring:['ac','contra'],retrat:['imp']};
  // As conclusões da triagem continuam editáveis no respectivo passo.
  var triagemOwn={'triagem.MPF':1,'triagem.MPF - Custos Legis':1};
  var ownedGroups=['Sentença','Origem','Recursos e contrarrazões','Outras peças e ocorrências','Acórdão recorrido (embargos de declaração)','Sucumbência da decisão recorrida','Classificação documental'];
  function owned(id){
    if(triagemOwn[id])return false;
    if(ownedGroups.some(function(n){var g=grupoModelo(n);return g&&(g.campos||[]).some(function(c){return c.secao+'.'+c.chave===id;});}))return true;
    return PECAS_DOC.some(function(d){return d.campos.some(function(k){return k[0]+'.'+k[1]===id;});});
  }
  var impGroup=PECAS_DOC.filter(function(g){return g.grupo==='Decisão impugnada';})[0];
  if(impGroup){var qImp=impGroup.quando;impGroup.quando=function(t){var T=ccTipos();return T.ai||T.ed||T.agint||T.ret||qImp(t);};}
  PECAS_DOC.forEach(function(g){if(g.grupo==='Parecer do MPF')g.campos=g.campos.filter(function(k){return k[1]!=='MPF';});});
  PECAS_DOC.push({grupo:docs.ac.group,quando:function(){return ccTipos().ed||!!S(V('producao','Acórdão - ID'));},campos:docs.ac.keys.map(function(k){return k.slice(0,2);})});
  function limit(v){v=String(v||'').trim();return v.length>280?v.slice(0,277)+'…':v;}
  function docRef(id){
    var d=docs[id], box=elem('div','pv-docref'), head=elem('div','pv-dochead'), sig=window.MutaSigilo;
    var T=ccTipos(), title=id==='imp'&&T.ai?'Decisão agravada':id==='sent'&&T.ai?'Decisão de origem':d.title;
    head.append(elem('b','',title));var go=btn('Ver em Autos','data-pv-doc',d.group);go.className='lnk pv-doclink';head.append(go);box.append(head);
    if(sig&&sig.bloqueado()){box.append(elem('small','muted','Acesso documental restrito.'));return box;}
    var AU=window.MutaAutos, leitura=AU&&AU.doProcesso&&AU.doProcesso(), list=leitura?leitura.lista||[]:[];
    function ids(v){return String(v||'').match(/\d{6,}/g)||[];}
    function blocked(v){var L=ids(v);return !!(sig&&list.some(function(x){return L.indexOf(String(x.id))>=0&&sig.docBloqueado(x);}));}
    var any=false, idValue=d.keys.filter(function(k){return k[2]==='ID';}).map(function(k){return S(V(k[0],k[1]));}).join(' ');
    function line(p,label,v,isID){if(!v)return;any=true;var r=elem('div','pv-docline');r.append(elem('span','muted',label));
      if(isID){var L=ids(v);if(L.length){var w=elem('div','pv-docids');L.forEach(function(n){var b=btn('ID '+n,'data-pv-doc',d.group);b.setAttribute('data-pv-doc-id',n);b.className='lnk mono';w.append(b);});r.append(w);}else r.append(elem('span','',limit(v)));}
      else r.append(elem('span','',limit(brD(v))));p.append(r);}
    if(blocked(idValue)){box.append(elem('small','muted','Documento sigiloso · conteúdo restrito.'));return box;}
    d.keys.forEach(function(k){line(box,k[2],S(V(k[0],k[1])),k[2]==='ID');});
    if(d.table){var rows=V(d.table[0],d.table[1]);if(Array.isArray(rows))rows.forEach(function(row){
      if(!row)return;var p=elem('div','pv-docitem'),rid=row.ids||row.id;if(blocked(rid)){p.append(elem('small','muted','Documento sigiloso · conteúdo restrito.'));any=true;}else d.cols.forEach(function(c){line(p,c[1],S(row[c[0]]),c[1]==='ID');});if(p.childNodes.length)box.append(p);
    });}
    if(d.cats&&leitura)list.filter(function(x){return !x.anexo&&d.cats.indexOf(x.k)>=0&&!(sig&&sig.docBloqueado(x));}).forEach(function(x){var p=elem('div','pv-docitem');line(p,'Documento',x.tipo||d.title,false);line(p,'ID',String(x.id||''),true);line(p,'Data',S(x.data),false);box.append(p);});
    if(!any)box.append(elem('small','muted',id==='mpf'?'Sem manifestação / hipótese registrada na ficha.':'Sem dados documentais registrados.'));
    else if(!idValue&&!d.table&&!d.cats)box.append(elem('small','muted','ID não registrado na ficha.'));
    return box;
  }
  function docsHtml(ids){var f=elem('div','pv-docrefs');ids.forEach(function(id){f.append(docRef(id));});return html(f);}
  function setupRoteiro(){
    var R=window.MutaRoteiro;if(!R||R._pvDoc)return;
    // Etiquetas são editadas em Autuação. O passo restante verifica mídias, não etiquetas.
    var m=R.PASSOS.find(function(p){return p.id==='etiquetas';});
    if(m){m.t='Mídias e seleção prévia';m.campos=m.campos.filter(function(c){return c[1]!=='Etiquetas';});delete m.extra;delete m.dica;m.estado=function(c){var v=N(c.v('triagem','Mídias'));return v==='faltantes'?'al':v==='juntadas'||v==='nao se aplica'?'ok':'pend';};}
    var original=R.html;R.html=function(g,c,q,x){return original(g,c,q,Object.assign({},x,{etiquetas:'',docOwned:function(id){return owned(id)||id==='triagem.Etiquetas'||id==='triagem.Etiquetas sugeridas';},docRef:function(id){return docsHtml(stepDocs[id]||[]);}}));};R._pvDoc=true;
  }
  var prodBase=camposCaso;
  camposCaso=function(ja){
    var all=Object.assign({},ja,{'producao.Voto - Resultado':1,'triagem.Tema':1,'triagem.Especificidades':1,'triagem.Assunto detalhado':1,'triagem.Tipo de Julgamento':1,'triagem.Ramo do direito':1,'triagem.Outros assuntos':1,'producao.Destino - Outro':1});ownedGroups.forEach(function(n){var g=grupoModelo(n);if(g)(g.campos||[]).forEach(function(c){var k=c.secao+'.'+c.chave;if(owned(k))all[k]=1;});});
    PECAS_DOC.forEach(function(d){d.campos.forEach(function(k){var id=k.join('.');if(owned(id))all[id]=1;});});
    var f=fragment(prodBase(all)),root=f.querySelector('.cc-caso');if(!root)return html(f);
    var T=ccTipos(), ids=['origem'];if(T.ap||T.rn||T.ms||S(V('origem','Sentença - ID')))ids.push('sent');
    if(T.ai||T.agint||T.ed||T.ret||S(V('triagem','Impugnada - ID')))ids.push('imp');if(T.ed)ids.push('ac');
    if(!T.rn||T.ap||T.ai||T.ed||T.agint||T.ms||T.ret)ids.push('rec','contra');ids.push('mpf');
    var d=elem('details','pv-docbase');d.open=true;d.append(elem('summary','','Base documental do caso'));add(d,docsHtml(ids));var first=root.querySelector('details.gg');if(first)root.insertBefore(d,first);else root.append(d);return html(f);
  };
  function abrirDoc(grupo,id){
    var AU=window.MutaAutos;
    if(id&&AU&&AU.estado)AU.estado().filtro='todos';else if(AU&&AU.estado)AU.estado().filtro='pecas';
    G.pecAb=G.pecAb||{};G.pecAb[grupo]=true;G.aba='Autos';render();
    var p=id?Array.from(caixa.querySelectorAll('[data-au-it]')).find(function(x){return x.getAttribute('data-au-it')===id;}):null;
    if(p)p=p.closest('.au-doc')||p;
    if(!p&&id){if(AU&&AU.estado)AU.estado().filtro='pecas';render();}
    if(!p)p=Array.from(caixa.querySelectorAll('details[data-grupo]')).find(function(x){return x.dataset.grupo===grupo;});
    if(!p)p=$('g-docs');if(p){if(p.tagName==='DETAILS')p.open=true;p.scrollIntoView({block:'start'});}
  }
  /* Roteiro real de triagem, incluindo estados, prazos, conferência e seleção de espécies.
     Retira só a explicação redundante do catálogo, não as etiquetas nem as ações. */
  corpoRoteiro=function(){
    setupRoteiro();var f=fragment(rt());f.querySelectorAll('.rt-f').forEach(function(x){var t=x.querySelector('span');if(t&&t.textContent==='Mídias e etiquetas')t.textContent='Mídias e seleção prévia';});f.querySelectorAll('.etq-cat').forEach(function(c){if(!c.querySelector('.etq-cs'))c.remove();else{var b=c.querySelector('.etq-cat-h b');if(b)b.remove();}});
    f.querySelectorAll('p,small').forEach(function(p){if(p.textContent.trim().startsWith('As sugeridas seguem as regras do Caput'))p.remove();});return html(f);
  };
  /* Reaproveita controles originais e disponibiliza os demais campos de Meta. */
  controlesProcesso=function(naSeta){
    var f=fragment(ct(naSeta)),m=f.querySelector('.ct-i.meta.on'),g=grupoModelo('Meta');
    if(m&&g){var d=elem('details','ct-mais'),gr=elem('div','gr');d.append(elem('summary','','Mais campos'));g.campos.forEach(function(c){add(gr,campo(c));});d.append(gr);m.append(d);}return html(f);
  };
  casoNotas=function(){return '';};
  notas=function(){
    var f=fragment(nt()),b=f.querySelector('[data-nt-add]'),t=f.querySelector('#nt-tx');
    if(b){b.textContent=noteOpen?'−':'+';b.removeAttribute('data-nt-add');b.setAttribute('data-pv-note','');b.setAttribute('aria-expanded',String(noteOpen));}
    if(t){if(noteOpen)t.after(btn('Incluir','data-nt-add',''));else t.remove();}return html(f);
  };
  notaIncluir=function(){var t=$('nt-tx');if(t&&S(t.value))noteOpen=false;return nota();};
  snCard=function(){return sn().replace(/síntese · notas · sinalizações/g,'acompanhamento · notas · sinalizações').replace(/Síntese, notas e sinalizações/g,'Acompanhamento, notas e sinalizações');};
  /* Classificação: formulário único em Autos; o cartão superior só espelha os dados.
     Ramo e outros assuntos não têm chaves no modelo atual: rascunho da prévia, por CNJ. */
  function source(keys){
    for(var i=0;i<keys.length;i++){var v=(G.fo||{})[keys[i]];if(Array.isArray(v))v=v.map(function(x){return typeof x==='object'?(x.nome||x.descricao||''):String(x);}).filter(Boolean).join('; ');if(v!=null&&typeof v!=='object'&&S(v))return S(v);}return '';
  }
  function extraValue(k){var e=extras[G.cnj]||{};return Object.prototype.hasOwnProperty.call(e,k)?e[k]:source(k==='ramo'?['Ramo do direito','Ramo do Direito','ramo_direito','ramo']:['Outros assuntos','outros_assuntos','Assuntos secundários','subassunto']);}
  function extraField(k,label){
    var p=elem('div','pv-field'),head=elem('div','pv-head'),v=extraValue(k);
    head.append(elem('span','gl',label),btn(open['extra:'+k]?'−':v?'✎':'+','data-pv-extra',k+':ed'));p.append(head);
    if(open['extra:'+k]){var t=elem('textarea');t.id='pv-extra-'+k;t.rows=2;t.value=v;t.placeholder=label;t.setAttribute('aria-label',label);p.append(t);var a=elem('div','pm-ad-b');a.append(btn('Gravar','data-pv-extra',k+':ok'),btn('cancelar','data-pv-extra',k+':x'));p.append(a);}
    else if(v)p.append(elem('div','pv-value',v));else p.append(elem('small','muted','Não informado'));
    p.append(elem('small','muted','Classificação demonstrativa · sem campo próprio na ficha'));return p;
  }
  function readRow(label,v){var p=elem('div','pv-idrow');p.append(elem('span','gl',label),elem('div','pv-value',S(v)||'—'));return p;}
  function tipoText(){var T=ccTipos(),R=window.MutaRoteiro;return R?R.TIPOS.filter(function(t){return T[t[0]];}).map(function(t){return t[1];}).join(' + '):S(V('triagem','Tipo de Julgamento'));}
  function tipoField(){
    var f=fragment(rt()),t=f.querySelector('.rt-tsel');
    if(t){t.open=true;return t;}return readRow('Tipo de julgamento',tipoText());
  }
  function identity(){
    var d=elem('details','card pv-identity');d.id='pv-identity';d.open=identOpen;var su=elem('summary','pv-id-title'),title=elem('div');title.append(elem('b','','Identificação e matéria'),elem('small','muted','Classe, julgamento e caracterização do caso'));su.append(title,elem('span','pv-id-chevron','⌄'));d.append(su);
    var sec=elem('div','pv-id-content');
    sec.append(elem('h4','pm-mer-h','ID'));
    var classe=source(['classe_judicial','Classe','DataJud · Classe'])||(pjeDoProcesso()?window.MutaPje.classe():'');
    sec.append(readRow('Classe',classe),tipoField());
    // Tipo de ato e destino são definidos exclusivamente na faixa superior.
    var res=elem('div','pv-idrow'),c=destino()==='monocratica'?campoLista('producao','Voto - Resultado'):campoModelo('producao','Voto - Resultado');
    if(c)add(res,campo(Object.assign({},c,{rotulo:'Conclusão / resultado'})));sec.append(res);
    sec.append(elem('h4','pm-mer-h','Matéria'),(campoModelo('triagem','Ramo do direito')?field('triagem','Ramo do direito','Ramo do direito'):extraField('ramo','Ramo do direito')),readRow('Assunto CNJ',source(['Assunto'])),(campoModelo('triagem','Outros assuntos')?field('triagem','Outros assuntos','Outros assuntos'):extraField('outros','Outros assuntos')));
    var ad=elem('div','pv-idrow');ad.append(elem('span','gl','Assunto detalhado'));
    var detail=assuntoDetalhado();if(detail)add(ad,detail);else{var plus=btn('+ Detalhamento do assunto','data-ad','ed');plus.className='pm-ad-add';ad.append(plus);}sec.append(ad);
    sec.append(field('triagem','Tema','Tipo de caso'),field('triagem','Especificidades','Especificidades',true),sintese('sp','Síntese processual','Resumo da tramitação, decisões, recursos e pedidos.'),sintese('sf','Síntese fática','Fatos materiais relevantes para a controvérsia.'));
    d.append(sec);return d;
  }
  var autosBase=corpoAutos;
  corpoAutos=function(){return html(identity())+autosBase();};
  function irIdent(){identOpen=true;G.aba='Autos';render();var d=$('pv-identity');if(d){d.open=true;d.scrollIntoView({block:'start'});}}
  function etiquetasAutuacao(ctx){
    var box=elem('details','pv-sub pv-etiquetas'),sum=elem('summary','','Etiquetas');
    box.open=!!open.etiquetasAutuacao;box.id='pv-etiquetas';box.append(sum);
    var pje=ctx.querySelector('.pc-etq');
    var rot=pje&&pje.previousElementSibling;
    if(rot&&rot.tagName==='H4'&&/Etiquetas do PJe/i.test(rot.textContent))box.append(rot);else box.append(elem('h4','pm-mer-h','Etiquetas do PJe'));
    if(pje)box.append(pje);else box.append(elem('small','muted','Nenhuma etiqueta do PJe registrada.'));
    box.append(field('triagem','Etiquetas','Etiquetas do gabinete',true),field('triagem','Etiquetas sugeridas','Etiquetas sugeridas para o PJe',true));
    var TR=window.MutaTriagem,AL=window.MutaAlertas;
    var f=fragment((TR&&TR.etiquetasDe?TR.etiquetasDe(G.op,G.fo):'')+(AL&&AL.htmlRoteiro?AL.htmlRoteiro(G.cnj,V('triagem','Etiquetas sugeridas'),function(){render();}):''));
    f.querySelectorAll('.etq-cat').forEach(function(c){if(!c.querySelector('.etq-cs'))c.remove();else{var b=c.querySelector('.etq-cat-h b');if(b)b.remove();}});
    f.querySelectorAll('p,small').forEach(function(x){if(x.textContent.trim().startsWith('As sugeridas seguem as regras do Caput'))x.remove();});
    box.append(f);return box;
  }
  cabeca=function(s){
    if(current!==G.cnj){current=G.cnj;open={};noteOpen=false;sintEdit='';sintDraft='';}
    var f=fragment(cab(s)),p=f.querySelector('.pc.pm');if(!p)return html(f);
    p.querySelectorAll('.pm-tj:not(.sug)').forEach(function(x){x.remove();});
    p.querySelectorAll('.pm-as [data-ad],.pm-ad').forEach(function(x){x.remove();});
    var assunto=S(gravado('triagem','Registro - Assunto detalhado'))||S(V('triagem','Assunto detalhado'));
    var e=p.querySelector('.pm-esp'),ctx=p.querySelector('.pm-aut1');
    if(e){var block=elem('div','pv-topmatter');if(assunto)block.append(elem('div','muted pv-value',assunto));var tags=elem('div','pv-tags');S(V('triagem','Especificidades')).split(/[;|\n]+/).map(S).filter(Boolean).forEach(function(v){tags.append(elem('span','chip',v));});block.append(tags);e.replaceWith(block);}
    if(ctx){var l=ctx.querySelector('.pm-aut-t');if(l)l.textContent='Autuação e contexto';
      var q=elem('details','pv-sub');q.append(elem('summary','','Questões jurídicas'));add(q,questoes());var tagsBox=etiquetasAutuacao(ctx),ctl=ctx.querySelector('.pm-ctl2');if(ctl&&ctl.previousElementSibling){ctx.insertBefore(q,ctl.previousElementSibling);ctx.insertBefore(tagsBox,ctl.previousElementSibling);}else ctx.append(q,tagsBox);}
    var pills=p.querySelector('.pm-pills');if(pills){var syn=elem('div','pv-top-summary'),head=elem('div','pv-head'),go=btn('Editar identificação','data-pv-ident','');go.className='lnk';head.append(elem('span','gl','Identificação e matéria'),go);syn.append(head);
      [['Tipo de julgamento',tipoText()],['Tipo de caso',V('triagem','Tema')],['Síntese processual',V('triagem','Síntese Processual')],['Síntese fática',V('triagem','Síntese Fática')]].forEach(function(z){if(S(z[1]))syn.append(readRow(z[0],z[1]));});pills.before(syn);pills.replaceWith(flow());}
    var resp=p.querySelector('.pm-resp');if(resp){resp.classList.add('pv-enc');var ato=resp.querySelector('.pm-ato');if(ato){
      var faixa=p.querySelector('.pv-people'),dest=readRow('Destino',destGrav()||'A definir');
      if(faixa){
        faixa.classList.add('pv-ato-destino');ato.classList.add('pv-oper-cell');dest.classList.add('pv-oper-cell');
        faixa.prepend(ato,dest);
        if(destGrav()==='Outro destino'){var extra=elem('div','pv-ato-outro');add(extra,campoRot('producao','Destino - Outro','Especificar destino'));faixa.after(extra);}
      }
      var result=V('producao','Voto - Resultado');if(S(result))resp.prepend(readRow('Conclusão / resultado',result));
    }}
    return html(f);
  };
  /* Autos primeiro; triagem e produção ficam como abas irmãs, usando o motor original. */
  MODOS=['Autos','Processo'];
  var renderBase=render0;
  render0=function(){
    if(tabCnj!==G.cnj){tabCnj=G.cnj;identOpen=false;G.aba='Autos';G.rot='tri';G.adEd=false;}
    setupRoteiro();renderBase();
    var top=caixa.querySelector('.pc.pm');if(top)top.classList.add('pv-universal');
    var tabs=caixa.querySelector('.gtabs'),proc=tabs&&tabs.querySelector('[data-aba="Processo"]');
    if(proc){var tri=btn('Triagem','data-pv-tab','tri'),pro=btn('Produção','data-pv-tab','pro');
      [tri,pro].forEach(function(b){b.setAttribute('role','tab');b.className='';b.setAttribute('aria-selected',String(G.aba==='Processo'&&G.rot===(b===pro?'pro':'tri')));});
      proc.replaceWith(tri,pro);}
    var nested=caixa.querySelector('.gbody .rt-modos');if(nested)nested.hidden=true;
    var sel=caixa.querySelector('.gbody .rt-tsel');if(sel&&G.aba==='Processo')sel.remove();
  };
  caixa.addEventListener('toggle',function(e){if(!e.target.isConnected)return;if(e.target.id==='pv-identity')identOpen=e.target.open;if(e.target.id==='pv-etiquetas')open.etiquetasAutuacao=e.target.open;},true);
  caixa.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-pv-tab],[data-pv-ident],[data-cl-tipo],[data-pv-extra],#pv-identity [data-rt]');if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(b.hasAttribute('data-pv-tab')){G.aba='Processo';G.rot=b.dataset.pvTab;render();return;}
    if(b.hasAttribute('data-pv-ident')||b.hasAttribute('data-cl-tipo')){irIdent();return;}
    if(b.hasAttribute('data-pv-extra')){var a=b.dataset.pvExtra.split(':'),k=a[0];if(a[1]==='ok'){var t=$('pv-extra-'+k);if(t)(extras[G.cnj]||(extras[G.cnj]={}))[k]=S(t.value);}open['extra:'+k]=a[1]==='ed'?!open['extra:'+k]:false;render();return;}
    if(b.dataset.rt&&window.MutaRoteiro){
      if(!Object.prototype.hasOwnProperty.call(tipoOriginal,G.cnj))tipoOriginal[G.cnj]=S(V('triagem','Tipo de Julgamento'));
      if(b.dataset.rt==='auto')marcar('triagem.Tipo de Julgamento',tipoOriginal[G.cnj]);
      window.MutaRoteiro.clique(b,gRot());
      if(b.dataset.rt.indexOf('t:')===0)marcar('triagem.Tipo de Julgamento',tipoText());
      agendar(400);render();
    }
  },true);
  caixa.addEventListener('change',function(e){if(e.target.id==='pm-pron'&&e.target.value===''){e.stopImmediatePropagation();marcar('producao.Destino','');marcar('producao.Mono - Tipo de ato','');G.dest=null;agendar(400);render();}},true);
  caixa.addEventListener('input',function(e){if(e.target.dataset&&e.target.dataset.pvSintDraft===sintEdit)sintDraft=e.target.value;},true);
  caixa.addEventListener('keydown',function(e){
    var id=e.target.dataset&&e.target.dataset.pvSintDraft;if(!id)return;
    if(e.key==='Escape'||(e.key==='Enter'&&(e.ctrlKey||e.metaKey))){e.preventDefault();e.stopImmediatePropagation();sintAcao(id,e.key==='Escape'?'x':'ok');}
  },true);
  caixa.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-pv-field],[data-pv-note],[data-pv-sint],[data-pv-doc]');if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(b.hasAttribute('data-pv-doc')){abrirDoc(b.getAttribute('data-pv-doc'),b.getAttribute('data-pv-doc-id'));return;}
    if(b.hasAttribute('data-pv-sint')){var a=b.getAttribute('data-pv-sint').split(':');sintAcao(a[0],a[1]);return;}
    if(b.hasAttribute('data-pv-note')){noteOpen=!noteOpen;render();var t=$('nt-tx');if(t)t.focus();return;}
    var id=b.getAttribute('data-pv-field');open[id]=!open[id];render();
    if(open[id]){var c=Array.from(caixa.querySelectorAll('textarea[data-fk],input[data-fk],select[data-fk]')).find(function(x){return x.dataset.fk===id;});if(c)c.focus();}
  },true);
  /* Navegação por teclado na ordem visual, sem alcançar atalhos ocultos. */
  var nav=document.querySelector('.nav[role="tablist"]');
  if(nav)nav.addEventListener('keydown',function(e){
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
    var tabs=Array.from(nav.querySelectorAll('.pv-nav-row button[role="tab"]:not([hidden])')).filter(function(x){return !x.disabled;});
    var i=tabs.indexOf(e.target);if(i<0||!tabs.length)return;
    var n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+tabs.length)%tabs.length;
    e.preventDefault();e.stopImmediatePropagation();tabs[n].click();tabs[n].focus();
  },true);
  document.body.classList.add('pv-universal-body');
})();