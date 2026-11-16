/* ================= CONSULTA: processo pautado → perfil do caso → folha, canhoto, conformidade e material ================= */
(function(){
  var CQ={ses:'',item:'',perfil:null,fonte:'',cal:null,erro:'',busy:false,sel:'',grupo:'',ver:{},usar:'',matriz:false};
  var STOP={'de':1,'da':1,'do':1,'das':1,'dos':1,'e':1,'a':1,'o':1,'as':1,'os':1,'em':1,'no':1,'na':1,'nos':1,'nas':1,'por':1,'para':1,'com':1,'sem':1,'um':1,'uma':1,'ao':1,'aos':1,'que':1,'se':1,'ou':1,'nao':1,'sobre':1,'entre':1,'pelo':1,'pela':1,'art':1,'lei':1,'recurso':1,'processo':1,'caso':1};
  function nq(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
  function toks(s){return nq(s).split(/[^a-z0-9]+/).filter(function(w){return w.length>2&&!STOP[w];});}
  function dg(s){return String(s||'').replace(/\D/g,'');}
  function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function brd(d){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(d||'');return m?m[3]+'/'+m[2]+'/'+m[1]:(d||'');}
  function jget(u){return fetch(u,{cache:'no-store',credentials:'same-origin'}).then(function(r){if(r.status===401){var e=new Error('Para consultar a pauta, entre primeiro pelo Ex Officio (/equipe/) com o seu nome e a sua senha.');e.login=true;throw e;}if(!r.ok)throw new Error('HTTP '+r.status+' em '+u);return r.json();});}
  function tipoJ(classe,julg){var k=String(julg||''),c=nq(classe);
    if(k==='ED')return 'Embargos de Declaração';if(k==='AgInt')return 'Agravo Interno';if(k==='JR')return 'Juízo de Retratação';
    if(/agravo de instrumento/.test(c))return 'Agravo de Instrumento';if(/remessa/.test(c)&&!/apelac/.test(c))return 'Remessa Necessária';return 'Apelação';}
  /* item gravado no procs-muta (acervo/sessoes/AAAA-MM-DD.json) → perfil do caso */
  function perfilDoItem(i){
    var ct=i.ctl||{},C=ct.cartao||{},a=C.adm||{},o=C.orig||{},j=C.jul||{},ac=(BASE&&BASE.ac&&BASE.ac[i.cnj])||[];
    var x={processo:i.cnj,item:i.item||'',classe:i.classe||ac[0]||'',assunto:i.assunto||ac[1]||'',
      subassuntos:C.subassuntos||'',especificidades:C.especificidades||'',questoes:C.questoes||'',
      tipoJulgamento:C.tipoJ||tipoJ(i.classe||ac[0],i.julgamento),decisaoOrigem:o.tipo||'',
      recursos:(C.recursos||[]).map(function(r){return [r.tipo,r.parte].filter(Boolean).join(' · ');}).filter(Boolean),
      tempestividade:ct.tempest||'',preparo:ct.preparo||'',requisito:a.req||'',mpf:[ct.parecer,(C.mpfx||{}).sentido].filter(Boolean).join(' · '),
      ed:C.ed&&C.ed.vicio?{vicio:C.ed.vicio}:null,retratacao:C.jr&&(C.jr.tema||C.jr.trib)?{tema:C.jr.tema||'',tribunal:C.jr.trib||''}:null,
      resultado:ct.resJulg||'',honorarios:ct.honor||'',multa:j.multa||'',servidor:i.servidor||''};
    Object.keys(x).forEach(function(k){if(x[k]==null||x[k]===''||(Array.isArray(x[k])&&!x[k].length))delete x[k];});
    return x;
  }
  function lerHash(){
    var h=location.hash.replace(/^#/,''),p={};h.split('&').forEach(function(kv){var i=kv.indexOf('=');if(i>0)p[kv.slice(0,i)]=kv.slice(i+1);});
    if(p.caso){try{CQ.perfil=JSON.parse(decodeURIComponent(p.caso));CQ.fonte='enviado pelo cartão do CMT-monitor';}catch(er){}}
    if(p.consulta){var m=/^(\d{4}-\d{2}-\d{2})\/(.+)$/.exec(decodeURIComponent(p.consulta));if(m){CQ.ses=m[1];CQ.item=m[2];}}
    return !!(p.caso||p.consulta);
  }
  function carregarCal(){
    if(CQ.cal)return Promise.resolve();
    return jget('/api/sessoes').then(function(c){CQ.cal=(c.sessoes||[]).slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date));});})
      .catch(function(er){CQ.cal=[];CQ.erro=er.login?er.message:'As pautas não estão disponíveis aqui: a consulta por sessão funciona no site publicado. O botão Modus Operandi dos cartões continua enviando o caso.';});
  }
  function zerar(){CQ.sel='';CQ.grupo='';CQ.ver={};CQ.usar='';CQ.matriz=false;}
  function consultar(){
    var ses=CQ.ses,it=String(CQ.item||'').trim();if(!ses||!it){toastC('Escolha a sessão e informe o item.');return;}
    CQ.busy=true;render();
    jget('/api/pauta?data='+ses).then(function(doc){
      var L=(doc.itens||[]).length?doc.itens:(doc.previa||[]),d=dg(it);
      var x=L.filter(function(i){return String(i.item)===it;})[0]||L.filter(function(i){return d.length>=7&&dg(i.cnj).indexOf(d)>=0;})[0];
      if(!x)throw new Error('Item '+it+' não encontrado na pauta de '+brd(ses)+'.');
      CQ.perfil=perfilDoItem(x);CQ.fonte='pauta de '+brd(ses)+(x.item?' · item '+x.item:'');CQ.erro='';zerar();
      try{history.replaceState(null,'','#consulta='+ses+'/'+encodeURIComponent(it));}catch(er){}
    }).catch(function(er){CQ.erro=er.message;}).then(function(){CQ.busy=false;render();});
  }
  function toastC(t){var el=document.getElementById('toast');if(el){el.textContent=t;el.classList.add('on');setTimeout(function(){el.classList.remove('on');},2400);}}
  /* pesquisa: pontua cada registro pelos termos do caso, com peso por campo */
  function termos(P){
    var fortes=toks([P.assunto,P.subassuntos,P.especificidades].join(' ')),fracos=toks([P.questoes,(P.recursos||[]).join(' '),P.decisaoOrigem,(P.ed||{}).vicio,(P.retratacao||{}).tema].join(' '));
    var u={};fortes.forEach(function(w){u[w]=2;});fracos.forEach(function(w){if(!u[w])u[w]=1;});return u;
  }
  function pont(T,campos){var s=0,ach={};campos.forEach(function(c){var t=toks(c[0]);var vis={};t.forEach(function(w){if(T[w]&&!vis[w]){vis[w]=1;s+=T[w]*c[1];ach[w]=1;}});});return {s:s,ach:Object.keys(ach)};}
  function buscar(P){
    var B=BASE||{},T=termos(P),tj=nq(P.tipoJulgamento||''),aN=nq(P.assunto||'');
    var arr=function(v){return Array.isArray(v)?v.join(' '):(v||'');};
    var prec=(B.prec||[]).map(function(p){var r=pont(T,[[p.assunto,3],[arr(p.subassunto),3],[p.tese,2],[arr(p.espTags),2],[arr(p.temas),1],[p.ementa,1]]);if(aN&&nq(p.assunto)===aN)r.s+=6;return {x:p,s:r.s,ach:r.ach};});
    var mod=(B.mod||[]).map(function(m){var r=pont(T,[[m.assunto,3],[m.nomeModelo,2],[m.tese,2],[arr(m.especificidadesTags),2],[m.causaPedir,1]]);if(aN&&nq(m.assunto)===aN)r.s+=6;if(tj&&nq((m.classe||'')+' '+(m.nomeModelo||'')).indexOf(tj.split(' ')[0])>=0)r.s+=2;return {x:m,s:r.s,ach:r.ach};});
    var par=(B.par||[]).map(function(p){var r=pont(T,[[p.titulo,3],[p.nivelTema,2],[p.nivelEspecificidade,2],[p.categoria,1],[p.texto,1]]);return {x:p,s:r.s,ach:r.ach};});
    var top=function(L){return L.filter(function(z){return z.s>0;}).sort(function(a,b){return b.s-a.s;}).slice(0,10);};
    return {prec:top(prec),mod:top(mod),par:top(par),T:Object.keys(T)};
  }
  /* ---------- estrutura aplicada: modelo do banco ou minuta-matriz ---------- */
  function pj(v){if(v==null)return null;if(typeof v==='string'){try{return JSON.parse(v);}catch(er){return null;}}return v;}
  function esqDe(x){return pj(x&&x.esqueletoModelo)||pj(x&&x.esq)||{};}
  function parDe(x){return pj(x&&x.paragrafosModelo)||pj(x&&x.par)||[];}
  var RECS=[[/embargos de declara/,'embargos'],[/agravo de instrumento/,'agravode'],[/remessa/,'remessan'],[/apela/,'apelacao']];
  var RESS=[[/nao conhec|inadmis|intempest/,'naoconheciment'],[/prejudic/,'prejudicado'],[/homolog/,'homologacao'],[/parcial/,'parcialprovime'],[/rejei/,'rejeicao'],[/acolh/,'acolhimento'],[/desprovi|nego provimento|improvi/,'desprovimento'],[/provi/,'provimento']];
  function sl(L,t){var s=nq(t||'');for(var i=0;i<L.length;i++)if(L[i][0].test(s))return L[i][1];return '';}
  function matrizDoCaso(P){
    var rec=sl(RECS,(P.tipoJulgamento||'')+' '+(P.classe||'')),res=sl(RESS,P.resultado||''),M=(typeof ED!=='undefined'&&ED&&ED.matrizes)||[];
    if(!rec)return null;
    var f=function(r){return M.filter(function(m){var x=/trms-(a|m)-([a-z]+)-([a-z]+)/.exec(m.id);return x&&x[1]==='a'&&x[2]===rec&&(!r||x[3]===r);});};
    return (res?f(res)[0]:null)||f('')[0]||null;
  }
  /* decide o que a folha mostra: modelo do banco aderente ao caso ou só a estrutura da minuta-matriz */
  function aplicar(P,R){
    var B=BASE||{},mt=matrizDoCaso(P),aN=nq(P.assunto||'');
    if(CQ.usar){var m=(B.mod||[]).filter(function(z){return z.id===CQ.usar;})[0];if(m)return {tipo:'mod',x:m,forcado:true,mat:mt};}
    if(CQ.matriz)return {tipo:'mat',x:mt,forcado:true,cand:R.mod[0]||null};
    var b=R.mod[0],forte=b&&(b.s>=12||(aN&&nq(b.x.assunto||'')===aN&&b.s>=6));
    if(forte)return {tipo:'mod',x:b.x,s:b.s,ach:b.ach,mat:mt};
    return {tipo:'mat',x:mt,cand:b||null};
  }
  function nomeDe(A){return A.tipo==='mod'?(A.x.nomeModelo||A.x.id):(A.x?(A.x.nome||A.x.id):'');}
  /* blocos da folha: tópicos do esqueleto com os parágrafos da posição */
  function blocos(A){
    var E=esqDe(A.x),PS=parDe(A.x),T=(E._topicos||[]).slice(),ps={};
    PS.forEach(function(p){(ps[p.posicao]=ps[p.posicao]||[]).push(p);});
    if(!T.length)T=Object.keys(E).filter(function(k){return k.charAt(0)!=='_';}).map(function(k){return {id:k,titulo:k,livres:true};});
    return T.map(function(t){return {t:t,ps:(ps[t.id]||[]).slice().sort(function(a,b){return (a.ordem||0)-(b.ordem||0)||String(a.versao).localeCompare(String(b.versao));})};});
  }
  function corpo(s){
    return String(s||'').split(/\n+/).filter(function(l){return l.trim();}).map(function(l){
      return '<p class="std">'+e(l.trim()).replace(/\{([^}]{0,120})\}/g,function(_,f){return '<span class="fill">'+f+'</span>';})+'</p>';}).join('')||'<p class="xph">Parágrafo sem texto gravado.</p>';
  }
  function folha(P,A){
    if(!A.x)return '<div class="cqs"><div class="dpj">FOLHA <small>· sem estrutura aplicável</small></div><div class="cqvz">O gabinete não tem modelo aderente nem minuta-matriz para '+e(P.tipoJulgamento||'este recurso')+'. Escolha um modelo no painel de conformidade.</div></div>';
    var E=esqDe(A.x),B=blocos(A),gs=(E._grupos||[]).filter(Boolean);
    if(gs.length){var g=CQ.grupo&&gs.indexOf(CQ.grupo)>=0?CQ.grupo:gs[0];var vis=B.filter(function(z){return (z.t.grupo||gs[0])===g;});}else{vis=B;}
    var kick=A.tipo==='mod'?'MODELO APLICADO AO CASO':'MINUTA-MATRIZ · ESTRUTURA';
    var h='<div class="cqs"><div class="dpj">'+kick+' <small>· '+e(nomeDe(A))+(A.tipo==='mod'&&A.x.resultado?'':'')+'</small></div>';
    if(gs.length>1)h+='<div class="dtabs">'+gs.map(function(x){var n=B.filter(function(z){return (z.t.grupo||gs[0])===x;}).length;
      return '<button class="ftab'+(x===g?' on':'')+'" data-g="'+e(x)+'"><span>'+e(x)+'</span><small>'+n+'</small></button>';}).join('')+'<span class="dtsp"></span></div>';
    h+='<div class="cqf">';
    if(!vis.length)h+='<div class="cqvz">Esta parte não tem tópicos gravados.</div>';
    vis.forEach(function(z){
      var t=z.t,on=CQ.sel===t.id,vs=z.ps,vi=Math.min(CQ.ver[t.id]||0,Math.max(vs.length-1,0)),p=vs[vi];
      h+='<div class="cqb'+(on?' on':'')+'" data-blk="'+e(t.id)+'"><div class="band"><span class="bl">'+e(t.titulo||t.id)+'</span>'+
        (t.obrigatorio||t.opcional===false?'<span class="pill">obrigatório</span>':'<span class="pill op">opcional</span>')+
        (vs.length>1?'<span class="vs">'+vs.map(function(q,i){return '<button data-ver="'+e(t.id)+':'+i+'" aria-pressed="'+(i===vi)+'">'+e(q.titulo||('versão '+(q.versao||i+1)))+'</button>';}).join('')+'</span>':'')+
        '<span class="dsp"></span><span class="drn">'+(vs.length?(vs.length>1?vs.length+' versões':'1 versão'):'redação livre')+'</span></div>'+
        '<div class="dbody">'+(p?corpo(p.texto):'<p class="xph">Redação livre nesta parte: o roteiro do trecho fica no canhoto.</p>')+'</div></div>';
    });
    return h+'</div></div>';
  }
  /* ---------- canhoto: campos do caso e, quando há trecho aberto, o trecho ---------- */
  var ROT={processo:'Processo',item:'Item',classe:'Classe',assunto:'Assunto',subassuntos:'Subassuntos',especificidades:'Especificidades',questoes:'Questões controvertidas',tipoJulgamento:'Tipo de julgamento',decisaoOrigem:'Decisão na origem',recursos:'Recursos',tempestividade:'Tempestividade',preparo:'Preparo',requisito:'Outro requisito',mpf:'MPF',ed:'ED · vício',retratacao:'Retratação',resultado:'Resultado',consectarios:'Consectários',honorarios:'Honorários',multa:'Multa',servidor:'Servidor'};
  var GRP=[['Identificação',['processo','item','classe','tipoJulgamento','servidor']],['Matéria',['assunto','subassuntos','especificidades','questoes']],
    ['Admissibilidade',['tempestividade','preparo','requisito','mpf','decisaoOrigem','recursos','ed','retratacao']],['Julgamento',['resultado','honorarios','multa']]];
  function val(k,v){if(Array.isArray(v))return v.join(' · ');if(v&&typeof v==='object')return Object.keys(v).map(function(z){return v[z];}).filter(Boolean).join(' · ');return v;}
  function canhoto(P,A){
    var h='<div class="dcan-h"><span>CANHOTO</span><small>'+(CQ.sel?'trecho selecionado':'caso em consulta')+'</small></div><div class="dcan">';
    if(CQ.sel&&A.x){
      var z=blocos(A).filter(function(b){return b.t.id===CQ.sel;})[0];
      if(z){var vi=Math.min(CQ.ver[CQ.sel]||0,Math.max(z.ps.length-1,0));
        h+='<div class="cvh"><div><p class="cvk">Trecho</p><p class="cvt">'+e(z.t.titulo||z.t.id)+'</p></div><button class="cvx" data-fecha="1" aria-label="Fechar o trecho">×</button></div>';
        h+='<div class="cf"><div class="cfl"><span>Versões do gabinete</span><span class="pill">'+z.ps.length+'</span></div>'+
          (z.ps.length?'<div class="dvl">'+z.ps.map(function(q,i){return '<button data-ver="'+e(CQ.sel)+':'+i+'" aria-pressed="'+(i===vi)+'">'+e(q.titulo||('versão '+(q.versao||i+1)))+'</button>';}).join('')+'</div>'
            :'<p class="meta">Parte de redação livre: a matriz não fixa texto. Escreva pelo roteiro da peça no Editorial.</p>')+'</div>';
        h+='<div class="cf"><div class="cfl"><span>Na estrutura</span></div><ul><li>'+(z.t.obrigatorio||z.t.opcional===false?'Tópico obrigatório':'Tópico opcional')+'</li>'+
          (z.t.grupo?'<li>Parte: '+e(z.t.grupo)+'</li>':'')+(z.t.cv&&z.t.cv.length?'<li>Controvérsias: '+e(z.t.cv.join(' · '))+'</li>':'')+'</ul></div>';
      }
    }
    GRP.forEach(function(g){
      var ks=g[1].filter(function(k){return P[k]!=null&&P[k]!=='';});if(!ks.length)return;
      h+='<div class="cf"><div class="cfl"><span>'+g[0]+'</span></div><div class="cqkv">'+
        ks.map(function(k){return '<div class="cqk">'+e(ROT[k]||k)+'</div><div class="cqv">'+e(val(k,P[k]))+'</div>';}).join('')+'</div></div>';
    });
    h+='<div class="cf"><div class="cfl"><span>Fonte</span></div><p class="meta">'+e(CQ.fonte||'—')+'</p></div>';
    return h+'</div>';
  }
  /* ---------- painel de conformidade e material aplicável ---------- */
  function conformidade(P,A,R){
    var L=[],add=function(s,k,t){L.push({s:s,k:k,t:t});};
    var faltam=['subassuntos','especificidades','questoes'].filter(function(k){return !P[k];});
    if(!faltam.length)add('ok','Cartão do processo','Assunto, subassuntos, especificidades e questões preenchidos.');
    else add(faltam.length===3?'no':'pc','Cartão do processo','Sem '+faltam.map(function(k){return (ROT[k]||k).toLowerCase();}).join(', ')+'. A pesquisa usa só o que está no cartão: complete no Ex Officio.');
    if(A.tipo==='mod')add('ok','Estrutura aplicada','Modelo do banco'+(A.forcado?' escolhido à mão':'')+': '+nomeDe(A)+'.');
    else if(A.x)add('pc','Estrutura aplicada','Sem modelo de matéria aderente: aplicada a minuta-matriz '+nomeDe(A)+', só como estrutura. A redação é do caso.');
    else add('no','Estrutura aplicada','Sem modelo e sem matriz para '+(P.tipoJulgamento||'este recurso')+'.');
    if(A.tipo==='mod'){
      var aM=nq(A.x.assunto||''),aP=nq(P.assunto||'');
      if(aM&&aP&&aM===aP)add('ok','Assunto','Modelo e cartão no mesmo assunto.');
      else if(A.x.assunto)add('pc','Assunto','Assunto do modelo: '+A.x.assunto+'. Confira a aderência ao caso antes de aproveitar o texto.');
      var cM=nq((A.x.classe||'')+' '+(A.x.nomeModelo||'')),rec=nq((P.tipoJulgamento||'').split(' ')[0]);
      if(rec&&cM.indexOf(rec)>=0)add('ok','Recurso','Modelo é de '+(P.tipoJulgamento||'')+'.');
      else if(rec)add('pc','Recurso','Modelo de '+(A.x.classe||'outra classe')+' para caso de '+P.tipoJulgamento+': a estrutura muda.');
      if(A.x.resultado)add('pc','Resultado do modelo','O modelo fecha em: '+String(A.x.resultado).slice(0,160)+(String(A.x.resultado).length>160?'…':'')+'. Ajuste ao resultado do caso.');
    }
    if(P.resultado)add('ok','Resultado do caso','Cartão registra: '+P.resultado+'.');
    else add('pc','Resultado do caso','Resultado ainda não registrado: a matriz vem pelo tipo de recurso, sem a parte dispositiva definida.');
    var adm=['tempestividade','preparo','requisito'].filter(function(k){return P[k];});
    if(adm.length)add('pc','Admissibilidade','Cartão anota '+adm.map(function(k){return (ROT[k]||k).toLowerCase()+': '+val(k,P[k]);}).join(' · ')+'. Abra a preliminar antes do mérito.');
    else add('ok','Admissibilidade','Nada anotado no cartão contra o conhecimento.');
    if(P.ed)add('pc','Embargos de declaração','Vício indicado: '+val('ed',P.ed)+'. A estrutura de ED pede exame do vício antes do mérito.');
    if(P.retratacao)add('pc','Juízo de retratação','Retratação por '+val('retratacao',P.retratacao)+'. Confira o tema vinculante na folha.');
    if(P.honorarios||P.multa)add('pc','Consectários','Cartão anota '+[P.honorarios?'honorários: '+P.honorarios:'',P.multa?'multa: '+P.multa:''].filter(Boolean).join(' · ')+'. Feche o dispositivo com eles.');
    add(R.prec.length?'ok':'pc','Precedentes do relator',R.prec.length?R.prec.length+' precedentes com os termos do caso.':'Nenhum precedente do relator com os termos do caso.');
    add(R.par.length?'ok':'pc','Parágrafos-padrão',R.par.length?R.par.length+' parágrafos aplicáveis.':'Nenhum parágrafo-padrão com os termos do caso.');
    return L;
  }
  function lista(tit,tipo,Lx,lin,extra){
    return '<div class="dori"><p class="kick2"><span>'+tit+'</span><span>'+Lx.length+'</span></p>'+
      (Lx.length?'<div class="dtl">'+Lx.map(function(z){return '<button data-cq="'+tipo+'" data-id="'+e(z.x.id)+'"><span>'+lin(z.x)+'</span><small>'+e(z.ach.slice(0,3).join(' · '))+'</small></button>';}).join('')+'</div>'
        :'<p class="meta">Nada encontrado com os termos do caso.</p>')+(extra||'')+'</div>';
  }
  function orientacoes(P,A,R){
    var C=conformidade(P,A,R),mau=C.filter(function(z){return z.s!=='ok';}).length;
    var h='<div class="dori"><p class="kick2"><span>Conformidade</span><span>'+(C.length-mau)+'/'+C.length+'</span></p><div class="cqc">'+
      C.map(function(z){return '<div class="cqi '+z.s+'"><div class="cqih"><b>'+e(z.k)+'</b><i>'+(z.s==='ok'?'em ordem':z.s==='pc'?'conferir':'falta')+'</i></div><p>'+e(z.t)+'</p></div>';}).join('')+'</div>';
    var alt=(R.mod||[]).filter(function(z){return !(A.tipo==='mod'&&z.x.id===A.x.id);}).slice(0,5);
    h+='<div class="cqacs">'+(A.tipo==='mod'?'<button class="dbt" data-matriz="1">Usar só a estrutura da minuta-matriz</button>':'')+
      (A.tipo==='mod'?'<button class="dbt" data-cq="mod" data-id="'+e(A.x.id)+'">Abrir o modelo no Editorial</button>':'<button class="dbt" data-edit="pecas">Abrir a Minuta-Matriz</button>')+
      (CQ.usar||CQ.matriz?'<button class="dbt" data-auto="1">Voltar à escolha automática</button>':'')+'</div></div>';
    h+=lista('Modelos aplicáveis','mod',alt,function(m){return e(m.nomeModelo||m.id);},
      alt.length?'<div class="cqacs">'+alt.map(function(z){return '<button class="dfm" data-usar="'+e(z.x.id)+'">Aplicar: '+e(z.x.nomeModelo||z.x.id)+'</button>';}).join('')+'</div>':'');
    h+=lista('Precedentes do relator','prec',R.prec,function(p){return e([p.processo||p.id,p.resultado].filter(Boolean).join(' · '));});
    h+=lista('Parágrafos-padrão','par',R.par,function(p){return e([p.titulo||p.id,p.categoria].filter(Boolean).join(' · '));});
    return h;
  }
  /* abrir o resultado na aba própria */
  function abrir(tipo,id){
    var B=BASE||{};
    if(tipo==='prec'){var p=(B.prec||[]).filter(function(z){return z.id===id;})[0];if(!p)return;irEmentario({});setTimeout(function(){var q=document.getElementById('e-q');q.value=p.processo||p.id;q.dispatchEvent(new Event('input',{bubbles:true}));},60);return;}
    if(tipo==='mod'){var m=(B.mod||[]).filter(function(z){return z.id===id;})[0];if(!m)return;irModelos(mTipo(m));MS.sel=m.id;setTimeout(function(){MS.sel=m.id;mRender();},60);return;}
    if(tipo==='par'){var q=(B.par||[]).filter(function(z){return z.id===id;})[0];if(!q)return;EM.q.par=q.titulo||'';irEditorial('par');
      setTimeout(function(){setTimeout(function(){var r=document.querySelector('#e-out .p-row[data-pid="'+id+'"]');if(r)r.click();},120);},60);}
  }
  function render(){
    var tp=document.getElementById('cq-top');if(!tp)return;
    var can=document.getElementById('cq-can'),mn=document.getElementById('cq-main'),or=document.getElementById('cq-ori');
    var opts=(CQ.cal||[]).map(function(s){return '<option value="'+e(s.date)+'"'+(s.date===CQ.ses?' selected':'')+'>'+e(brd(s.date))+(s.processos?' · '+s.processos+' itens':'')+'</option>';}).join('');
    var h='<div class="dbar"><label>Sessão<select id="cq-ses"><option value="">escolha a sessão</option>'+opts+'</select></label>'+
      '<label>Item ou nº do processo<input id="cq-item" value="'+e(CQ.item)+'" placeholder="ex.: 12" autocomplete="off"></label>'+
      '<button class="cq-go" id="cq-go"'+(CQ.busy?' disabled':'')+'>'+(CQ.busy?'Consultando…':'Consultar')+'</button><span class="dbsp"></span>'+
      (CQ.perfil?'<span class="dbinfo">'+e(CQ.perfil.processo||'')+' · '+e(CQ.fonte)+'</span>':'')+'</div>';
    if(CQ.erro)h+='<div class="cq-er">'+e(CQ.erro)+(/equipe/.test(CQ.erro)?' <a href="/equipe/" target="_blank" rel="noopener">Abrir o Ex Officio</a>':'')+'</div>';
    tp.innerHTML=h;
    var P=CQ.perfil;
    if(!P){can.innerHTML='';or.innerHTML='';mn.innerHTML='<div class="cqs"><div class="dpj">FOLHA <small>· sem caso em consulta</small></div><div class="cqvz">Escolha a sessão, informe o item da pauta e aperte Enter. O Modus Operandi lê o cartão gravado no procs-muta, aplica ao caso o modelo do banco ou, na falta dele, a minuta-matriz como estrutura, e confere a conformidade.</div></div>';ligar();return;}
    if(!BASE){mn.innerHTML='<div class="cqs"><div class="dpj">FOLHA</div><div class="cqvz">Carregando a base do gabinete…</div></div>';ligar();base().then(render);return;}
    var R=buscar(P),A=aplicar(P,R);
    can.innerHTML=canhoto(P,A);mn.innerHTML=folha(P,A);or.innerHTML=orientacoes(P,A,R);
    ligar();
  }
  function ligar(){
    var s=document.getElementById('cq-ses'),i=document.getElementById('cq-item'),g=document.getElementById('cq-go');
    if(s)s.onchange=function(){CQ.ses=s.value;};
    if(i){i.oninput=function(){CQ.item=i.value;};i.onkeydown=function(ev){if(ev.key==='Enter'){CQ.item=i.value;consultar();}};}
    if(g)g.onclick=function(){CQ.ses=s?s.value:CQ.ses;CQ.item=i?i.value:CQ.item;consultar();};
    var q=function(sel,fn){Array.prototype.forEach.call(document.querySelectorAll(sel),function(b){b.onclick=function(ev){ev.stopPropagation();fn(b);};});};
    q('#v-consulta [data-cq]',function(b){abrir(b.getAttribute('data-cq'),b.getAttribute('data-id'));});
    q('#v-consulta [data-ver]',function(b){var x=b.getAttribute('data-ver').split(':');CQ.ver[x[0]]=+x[1];CQ.sel=x[0];render();});
    q('#v-consulta [data-blk]',function(b){var k=b.getAttribute('data-blk');CQ.sel=CQ.sel===k?'':k;render();});
    q('#v-consulta [data-g]',function(b){CQ.grupo=b.getAttribute('data-g');CQ.sel='';render();});
    q('#v-consulta [data-fecha]',function(){CQ.sel='';render();});
    q('#v-consulta [data-usar]',function(b){CQ.usar=b.getAttribute('data-usar');CQ.matriz=false;CQ.sel='';CQ.grupo='';CQ.ver={};render();});
    q('#v-consulta [data-matriz]',function(){CQ.matriz=true;CQ.usar='';CQ.sel='';CQ.grupo='';CQ.ver={};render();});
    q('#v-consulta [data-auto]',function(){zerar();render();});
    q('#v-consulta [data-edit]',function(b){irEditorial(b.getAttribute('data-edit'));});
  }
  window.CQ_render=function(){carregarCal().then(render);};
  var ov=window.VDM_view;
  window.VDM_view=function(v){if(v==='consulta'){window.CQ_render();return;}if(ov)ov(v);};
  var temHash=lerHash();
  window.addEventListener('hashchange',function(){if(lerHash()){var t=document.querySelector('.tab[data-v="consulta"]');if(t)t.click();if(CQ.ses&&CQ.item&&!/caso=/.test(location.hash))consultar();else window.CQ_render();}});
  setTimeout(function(){
    var alvo=temHash?'consulta':(window.VDM_PUBLICO?'ement':'');
    if(alvo){var t=document.querySelector('.tab[data-v="'+alvo+'"]');if(t)t.click();}
    if(temHash&&CQ.ses&&CQ.item&&!CQ.perfil)carregarCal().then(consultar);
  },0);
})();
