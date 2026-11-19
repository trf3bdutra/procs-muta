/* ================= CONSULTA: processo pautado → perfil do caso → folha, canhoto, conformidade e material ================= */
(function(){
  var CQ={ses:'',item:'',perfil:null,fonte:'',cal:null,erro:'',busy:false,sel:'',grupo:'',ver:{},usar:'',matriz:false,pront:null,colar:false,m28:null,extra:{},modelq:'',lia:{peca:'acordao',modo:'GERAÇÃO',res:'',prec:null,mod:true,par:true}};
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
  /* prontuário do Ex Officio (cartão gravado no procs-muta) no mesmo formato do bloco da LIA: campos com chave pontuada */
  function prontDoItem(i){
    var ct=i.ctl||{},C=ct.cartao||{},campos={},LST={recursos:1,pecas:1,pendencias:1,papeis:1};
    (function plano(o,pre){Object.keys(o||{}).forEach(function(k){var v=o[k],ch=pre?pre+'.'+k:k;if(!pre&&LST[k])return;
      if(v&&typeof v==='object'&&!Array.isArray(v))plano(v,ch);else if(v!=null&&v!=='')campos[ch]=v;});})(C,'');
    ['tempest','preparo','prelim','repres','midias','mpf','parecer','resJulg','consect','honor','topico'].forEach(function(k){if(ct[k]!=null&&ct[k]!=='')campos[k]=ct[k];});
    if(i.obs)campos.obs=i.obs;
    return {processo:i.cnj,campos:campos,recursos:C.recursos||[],pecas:C.pecas||[],papeis:C.papeis||[],
      pendencias:(C.pendencias||[]).filter(function(x){return !(x&&x.ok);}).map(function(x){return x&&x.desc!=null?x.desc:String(x);}),fonte:'Ex Officio'};
  }
  /* prontuário colado (bloco <<<PRONTUARIO_CMT … PRONTUARIO_CMT>>>, o JSON ou o arquivo .json baixado) → perfil do caso */
  function lerProntuario(txt){
    var t=String(txt||'').replace(/^[\s\S]*?<<<PRONTUARIO_CMT/,'').replace(/PRONTUARIO_CMT>>>[\s\S]*$/,'').trim();
    var i=t.indexOf('{'),j=t.lastIndexOf('}');if(i<0||j<i)throw new Error('Não encontrei o JSON do prontuário no texto colado.');
    var J=JSON.parse(t.slice(i,j+1));if(!J||!J.campos)throw new Error('O JSON colado não tem “campos”: não parece um prontuário.');return J;
  }
  function perfilDoProntuario(J){
    var C=J.campos||{},x={processo:J.processo||'',subassuntos:C.subassuntos||'',especificidades:C.especificidades||'',questoes:C.questoes||'',sintese:C.sintese||'',
      tipoJulgamento:C.tipoJ||'',decisaoOrigem:[C['orig.tipo'],C['orig.id']?'ID '+C['orig.id']:''].filter(Boolean).join(' · '),
      recursos:(J.recursos||[]).map(function(r){return [r.tipo,r.parte].filter(Boolean).join(' · ');}).filter(Boolean),
      tempestividade:C.tempest||'',preparo:C.preparo||'',requisito:C['adm.req']||'',mpf:[C.parecer,C['mpfx.sentido']].filter(Boolean).join(' · '),
      ed:C['ed.vicio']?{vicio:C['ed.vicio']}:null,retratacao:C['jr.tema']||C['jr.trib']?{tema:C['jr.tema']||'',tribunal:C['jr.trib']||''}:null,
      resultado:C.resJulg||'',honorarios:C.honor||'',multa:C['jul.multa']||''};
    if(/28[,.]86|0005019-15\.1997/.test([x.subassuntos,x.especificidades,C.obsGeral,J.modelo&&J.modelo.id].join(' '))||(J.modelo&&/^2886-/.test(J.modelo.id||'')))x.assunto='Reajuste de 28,86% (ACP 0005019-15.1997.4.03.6000)';
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
      .catch(function(er){CQ.cal=[];CQ.erro=er.login?er.message:'As pautas não estão disponíveis aqui: a consulta por sessão funciona no site publicado. O botão Compendium dos cartões continua enviando o caso.';});
  }
  function zerar(){CQ.sel='';CQ.grupo='';CQ.ver={};CQ.usar='';CQ.matriz=false;CQ.extra={};CQ.modelq='';}
  function consultar(){
    var ses=CQ.ses,it=String(CQ.item||'').trim();if(!ses||!it){toastC('Escolha a sessão e informe o item.');return;}
    CQ.busy=true;render();
    jget('/api/pauta?data='+ses).then(function(doc){
      var L=(doc.itens||[]).length?doc.itens:(doc.previa||[]),d=dg(it);
      var x=L.filter(function(i){return String(i.item)===it;})[0]||L.filter(function(i){return d.length>=7&&dg(i.cnj).indexOf(d)>=0;})[0];
      if(!x)throw new Error('Item '+it+' não encontrado na pauta de '+brd(ses)+'.');
      CQ.perfil=perfilDoItem(x);CQ.pront=prontDoItem(x);CQ.m28=null;CQ.fonte='prontuário do Ex Officio · pauta de '+brd(ses)+(x.item?' · item '+x.item:'');CQ.erro='';zerar();
      try{history.replaceState(null,'','#consulta='+ses+'/'+encodeURIComponent(it));}catch(er){}
    }).catch(function(er){CQ.erro=CQ.perfil?'Prontuário completo indisponível ('+er.message+'). A Consulta usa os dados enviados pelo cartão.':er.message;}).then(function(){CQ.busy=false;render();});
  }
  function toastC(t){var el=document.getElementById('toast');if(el){el.textContent=t;el.classList.add('on');setTimeout(function(){el.classList.remove('on');},2400);}}
  /* pesquisa: pontua cada registro pelos termos do caso, com peso por campo */
  function termos(P){
    var fortes=toks([P.assunto,P.subassuntos,P.especificidades].join(' ')),fracos=toks([P.questoes,(P.recursos||[]).join(' '),P.decisaoOrigem,(P.ed||{}).vicio,(P.retratacao||{}).tema].join(' '));
    var u={};fortes.forEach(function(w){u[w]=2;});fracos.forEach(function(w){if(!u[w])u[w]=1;});return u;
  }
  function pont(T,campos){var s=0,ach={};campos.forEach(function(c){var t=toks(c[0]);var vis={};t.forEach(function(w){if(T[w]&&!vis[w]){vis[w]=1;s+=T[w]*c[1];ach[w]=1;}});});return {s:s,ach:Object.keys(ach)};}
  function modeloElegibilidade(P,z){
    var m=z.x||z,raz=[],imp=[],tj=nq(P.tipoJulgamento||''),aP=nq(P.assunto||''),aM=nq(m.assunto||''),mt=nq((m.classe||'')+' '+(m.nomeModelo||''));
    var tipos=[['embargos de declaracao',/embargos de declar/],['agravo de instrumento',/agravo de instrumento/],['agravo interno',/agravo interno/],['remessa necessaria',/remessa/],['apelacao',/apelac/]];
    var caso='';tipos.forEach(function(x){if(!caso&&x[1].test(tj))caso=x[0];});
    var modt='';tipos.forEach(function(x){if(!modt&&x[1].test(mt))modt=x[0];});
    if(caso&&modt&&caso!==modt)imp.push('recurso incompatível ('+modt+')');else if(caso&&modt)raz.push('mesmo tipo de recurso');
    if(aP&&aM){
      if(aP===aM)raz.push('mesmo assunto');
      else{var ap=toks(aP),am=toks(aM),inter=ap.filter(function(x){return am.indexOf(x)>=0;});if(inter.length>=2)raz.push('assunto relacionado');else if(z.s<8)imp.push('assunto distinto');}
    }
    if(z.s>=12)raz.push('alta aderência ao prontuário');else if(z.s>=6)raz.push('aderência ao prontuário');
    return {ok:!imp.length&&(z.s>=6||raz.indexOf('mesmo assunto')>=0),razoes:raz,impedimentos:imp};
  }
  function buscar(P){
    var B=BASE||{},T=termos(P),tj=nq(P.tipoJulgamento||''),aN=nq(P.assunto||'');
    var arr=function(v){return Array.isArray(v)?v.join(' '):(v||'');};
    var prec=(B.prec||[]).map(function(p){var r=pont(T,[[p.assunto,3],[arr(p.subassunto),3],[p.tese,2],[arr(p.espTags),2],[arr(p.temas),1],[p.ementa,1]]);if(aN&&nq(p.assunto)===aN)r.s+=6;return {x:p,s:r.s,ach:r.ach};});
    var modTodos=(B.mod||[]).map(function(m){var r=pont(T,[[m.assunto,3],[m.nomeModelo,2],[m.tese,2],[arr(m.especificidadesTags),2],[m.causaPedir,1]]);if(aN&&nq(m.assunto)===aN)r.s+=6;if(tj&&nq((m.classe||'')+' '+(m.nomeModelo||'')).indexOf(tj.split(' ')[0])>=0)r.s+=2;var z={x:m,s:r.s,ach:r.ach};z.el=modeloElegibilidade(P,z);return z;});
    var par=(B.par||[]).map(function(p){var r=pont(T,[[p.titulo,3],[p.nivelTema,2],[p.nivelEspecificidade,2],[p.categoria,1],[p.texto,1]]);return {x:p,s:r.s,ach:r.ach};});
    var top=function(L,n){return L.filter(function(z){return z.s>0;}).sort(function(a,b){return b.s-a.s;}).slice(0,n||10);};
    var ok=modTodos.filter(function(z){return z.el.ok;}).sort(function(a,b){return b.s-a.s;});
    var fora=modTodos.filter(function(z){return !z.el.ok&&z.s>0;}).sort(function(a,b){return b.s-a.s;});
    return {prec:top(prec),mod:ok.slice(0,10),modElegiveis:ok,modTodos:modTodos,modFora:fora.slice(0,20),par:top(par),T:Object.keys(T)};
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
      return '<p class="std">'+e(l.trim()).replace(/\{([^}]{0,120})\}/g,function(_,f){var k=String(f).trim(),v=CQ.extra[k];return v!=null&&String(v).trim()?'<span class="fill preenchido">'+e(v)+'</span>':'<span class="fill">'+e(k)+'</span>';})+'</p>';}).join('')||'<p class="xph">Parágrafo sem texto gravado.</p>';
  }
  function camposComplementares(A){
    if(!A||!A.x)return [];var seen={},out=[],add=function(t){String(t||'').replace(/\{([^}]{1,120})\}/g,function(_,k){k=String(k).trim();if(!seen[k]){seen[k]=1;out.push(k);}return _;});};
    parDe(A.x).forEach(function(p){add(p.texto);});add(A.x.textoModelo);add(A.x.fundamentacao);add(A.x.honorarios);add(A.x.resultado);return out.slice(0,30);
  }
  function prontBase(P,J){
    var h='<div class="cq-pront-base"><div class="cf"><div class="cfl"><span>Prontuário do processo</span><span class="cq-src">PAUTA</span></div>';
    GRP.forEach(function(g){var ks=g[1].filter(function(k){return P[k]!=null&&P[k]!=='';});if(!ks.length)return;h+='<details class="cq-psec" open><summary>'+e(g[0])+'</summary><div class="cqkv">'+ks.map(function(k){return '<div class="cqk">'+e(ROT[k]||k)+'</div><div class="cqv">'+e(val(k,P[k]))+' <span class="cq-origin">Pauta</span></div>';}).join('')+'</div></details>';});
    if(J&&J.campos){var ks=Object.keys(J.campos).filter(function(k){return J.campos[k]!=null&&J.campos[k]!=='';}).sort();if(ks.length)h+='<details class="cq-psec"><summary>Todos os campos importados <span class="pill">'+ks.length+'</span></summary><div class="cqkv">'+ks.map(function(k){return '<div class="cqk">'+e(k)+'</div><div class="cqv">'+e(val(k,J.campos[k]))+' <span class="cq-origin">Ex Officio</span></div>';}).join('')+'</div></details>';}
    return h+'</div></div>';
  }
  window.CQ_prontuarioBase=prontBase;
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
    var h='<div class="dcan-h"><span>PRONTUÁRIO DA CONSULTA</span><small>'+(CQ.sel?'trecho selecionado':'base do processo + personalização')+'</small></div><div class="dcan">'+prontBase(P,CQ.pront);
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
    var cc=camposComplementares(A);
    if(cc.length)h+='<div class="cf cq-person"><div class="cfl"><span>Personalização do modelo</span><span class="pill">'+cc.length+'</span></div><p class="meta">Somente campos que o texto selecionado ainda precisa para este caso.</p>'+cc.map(function(k){return '<label class="cq-extra"><span>'+e(k)+'</span><input data-cqextra="'+e(k)+'" value="'+e(CQ.extra[k]||'')+'" placeholder="preencher para esta minuta"><small>'+(CQ.extra[k]?'<b>Manual</b> · Consulta':'Pendente · exigido pelo modelo')+'</small></label>';}).join('')+'</div>';
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
  function seletorModelos(P,A,R){
    var q=nq(CQ.modelq||''),todos=(R.modElegiveis||R.mod||[]).filter(function(z){return !q||nq([z.x.nomeModelo,z.x.assunto,z.x.tese,(z.x.especificidadesTags||[]).join(' ')].join(' ')).indexOf(q)>=0;}).slice(0,12);
    var fora=(R.modFora||[]).filter(function(z){return !q||nq([z.x.nomeModelo,z.x.assunto,z.x.tese].join(' ')).indexOf(q)>=0;}).slice(0,5);
    var h='<div class="dori cq-solucoes"><p class="kick2"><span>Solução de redação</span><span>3 camadas</span></p>'+
      '<div class="cq-tipo"><b>Matrizes modulares</b><p>Motor especializado: enquadra o caso e monta módulos, versões e variáveis.</p>'+
      (window.M2886&&M2886.disponivel()&&M2886.e2886(P,CQ.pront)?'<button class="cq-sol rec" data-sol="m28"><strong>28,86% · cumprimento individual da ACP</strong><small>Elegível para este processo · recomendada</small></button>':'<span class="meta">Nenhuma matriz modular elegível identificada.</span>')+'</div>'+
      '<div class="cq-tipo"><b>Modelos</b><p>Texto-base relativamente pronto. Só entram como aplicáveis os que passam pela elegibilidade do caso.</p><input class="cq-modelq" id="cq-modelq" type="search" value="'+e(CQ.modelq||'')+'" placeholder="Buscar entre os modelos aplicáveis">'+
      (todos.length?'<div class="cq-modsel">'+todos.map(function(z){var sel=A.tipo==='mod'&&A.x&&A.x.id===z.x.id;return '<button class="cq-sol'+(sel?' sel':'')+'" data-usar="'+e(z.x.id)+'"><strong>'+e(z.x.nomeModelo||z.x.id)+'</strong><small>'+e((z.el.razoes||[]).join(' · ')||('aderência '+z.s))+'</small></button>';}).join('')+'</div>':'<span class="meta">Nenhum modelo elegível com os critérios atuais.</span>')+
      (fora.length?'<details class="cq-fora"><summary>Fora dos critérios do caso · '+fora.length+'</summary>'+fora.map(function(z){return '<div><b>'+e(z.x.nomeModelo||z.x.id)+'</b><small>'+e((z.el.impedimentos||[]).join(' · ')||'aderência insuficiente')+'</small></div>';}).join('')+'</details>':'')+'</div>'+
      '<div class="cq-tipo"><b>Minuta-matriz</b><p>Estrutura genérica da peça, usada quando não há matriz modular ou modelo suficientemente aderente.</p><button class="cq-sol'+(A.tipo==='mat'?' sel':'')+'" data-matriz="1"><strong>Usar estrutura da minuta-matriz</strong><small>'+e(A.mat?nomeDe({tipo:'mat',x:A.mat}):(A.x?nomeDe(A):'estrutura pelo tipo de recurso'))+'</small></button></div></div>';
    return h;
  }
  function orientacoes(P,A,R){
    var C=conformidade(P,A,R),mau=C.filter(function(z){return z.s!=='ok';}).length;
    var h=seletorModelos(P,A,R)+liaPainel(P,A,R)+'<div class="dori"><p class="kick2"><span>Conformidade</span><span>'+(C.length-mau)+'/'+C.length+'</span></p><div class="cqc">'+
      C.map(function(z){return '<div class="cqi '+z.s+'"><div class="cqih"><b>'+e(z.k)+'</b><i>'+(z.s==='ok'?'em ordem':z.s==='pc'?'conferir':'falta')+'</i></div><p>'+e(z.t)+'</p></div>';}).join('')+'</div>';
    var alt=(R.mod||[]).filter(function(z){return !(A.tipo==='mod'&&z.x.id===A.x.id);}).slice(0,5);
    h+='<div class="cqacs">'+(A.tipo==='mod'?'<button class="dbt" data-matriz="1">Usar só a estrutura da minuta-matriz</button>':'')+
      (A.tipo==='mod'?'<button class="dbt" data-cq="mod" data-id="'+e(A.x.id)+'">Abrir o modelo no Editorial</button>':'<button class="dbt" data-edit="pecas">Abrir a Minuta-Matriz</button>')+
      (CQ.usar||CQ.matriz?'<button class="dbt" data-auto="1">Voltar à escolha automática</button>':'')+'</div></div>';
    h+=lista('Modelos relacionados','mod',alt,function(m){return e(m.nomeModelo||m.id);});
    h+=lista('Precedentes do relator','prec',R.prec,function(p){return e([p.processo||p.id,p.resultado].filter(Boolean).join(' · '));});
    h+=lista('Parágrafos-padrão','par',R.par,function(p){return e([p.titulo||p.id,p.categoria].filter(Boolean).join(' · '));});
    return h;
  }

  /* ---------- Minuta com a LIA: prompt do gabinete (Prompt_Minuta_CMT v3, recortado pela peça) + dados do caso + material da base ---------- */
  var LIAT={};
  function liaTxt(id){if(LIAT[id])return LIAT[id];var el=document.getElementById(id),t=(el&&el.textContent||'').trim();
    if(!t)return Promise.reject(new Error('prompt do gabinete ausente nesta versão do Compendium'));var bin=atob(t),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    LIAT[id]=new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();return LIAT[id];}
  function liaV3(){return liaTxt('lia-v3');}
  var LIA_PECAS={acordao:['Acórdão completo (ementa, relatório, voto e proclamação)',null],relatorio:['Relatório',['R1','R2','R3','RT']],voto:['Voto',['V','W','PR','X','RT']],ementa:['Ementa',['M','N','M2','RT']],proclamacao:['Proclamação',['P','M','RT']],mono:['Decisão monocrática ou despacho',['W','PR','X','RT']]};
  function liaRecorte(txt,peca){var ks=LIA_PECAS[peca][1];if(!ks)return txt;var L=txt.split('\n'),ix=[];L.forEach(function(x,i){if(/^══ [A-Z0-9]+\./.test(x))ix.push(i);});
    var head=L.slice(0,ix[0]),sec={},ord=[];ix.forEach(function(i,n){var k=/^══ ([A-Z0-9]+)\./.exec(L[i])[1];sec[k]=L.slice(i,ix[n+1]==null?L.length:ix[n+1]);ord.push(k);});
    var quer=['A','B','C','D','E','F','G','H'].concat(ks,['T','Q','S']);
    return head.concat(['PEÇA DESTE PROMPT: '+LIA_PECAS[peca][0]+'. As seções de outras peças foram retiradas; a íntegra está no Prompt_Minuta_CMT_v3.'],[].concat.apply([],ord.filter(function(k){return quer.indexOf(k)>=0;}).map(function(k){return sec[k];}))).join('\n');}
  function liaCaso(P){var L=[];Object.keys(ROT).forEach(function(k){if(P[k]!=null&&P[k]!=='')L.push('- '+ROT[k]+': '+val(k,P[k]));});return L.join('\n');}
  function liaPrec(p){var cab=[p.classeSigla||p.especie||p.classe,p.processo].filter(Boolean).join(' ')+(p.relator?', Rel. Des. Fed. '+p.relator:'')+(p.orgao?', '+p.orgao:'')+(p.dataPublicacao?', publicação '+brd(p.dataPublicacao):p.dataJulgamento?', julgamento '+brd(p.dataJulgamento):'');
    return '◆ '+cab+(p.resultado?'\n  Resultado: '+p.resultado:'')+(p.tese?'\n  Tese: '+p.tese:'')+(p.temas?'\n  Temas citados: '+p.temas:'')+(p.ementa?'\n  Ementa: '+String(p.ementa).replace(/\s+/g,' ').slice(0,2200):'');}
  function liaFolha(A){if(!A||!A.x)return '';var B=blocos(A),x=A.x,out=B.map(function(z){var vi=Math.min(CQ.ver[z.t.id]||0,Math.max(z.ps.length-1,0)),q=z.ps[vi];return '['+(z.t.titulo||z.t.id)+(z.t.obrigatorio||z.t.opcional===false?' · obrigatório':' · opcional')+']\n'+(q&&q.texto?String(q.texto).trim():'(redação livre pelo roteiro da peça)');}).join('\n\n');
    /* modelo do banco sem parágrafos por tópico: o texto do modelo (ou fundamentação, honorários e dispositivo) vai inteiro, como texto-fonte a adaptar */
    if(A.tipo==='mod'){var tx=String(x.textoModelo||'').trim()||[x.fundamentacao?'— FUNDAMENTAÇÃO DO MODELO —\n'+String(x.fundamentacao).trim():'',x.honorarios?'— SENTENÇA E HONORÁRIOS (exemplo do modelo) —\n'+String(x.honorarios).trim():'',x.resultado?'— DISPOSITIVO DO MODELO —\n'+String(x.resultado).trim():''].filter(Boolean).join('\n\n');
      if(tx)out+='\n\nTEXTO DO MODELO (texto-fonte do gabinete: aproveite as fórmulas e a ordem; substitua todo [PREENCHER …] e todo dado do caso-exemplo pelos dados destes autos; o resultado do modelo não vincula o resultado deste caso):\n'+tx;
      if(x.ementaIntegral)out+='\n\n— EMENTA DO MODELO (referência de forma) —\n'+String(x.ementaIntegral).trim();}
    return out;}
  function liaMontar(P,A,R){var o=CQ.lia,sel=o.prec||R.prec.slice(0,4).map(function(z){return z.x.id;}),B=BASE||{};
    var gerar=o.modo==='GERAÇÃO';
    return (gerar?liaTxt('lia-gerar'):liaV3()).then(function(v3){var res=o.res||P.resultado||'';
      var tarefa='TAREFA: '+o.modo+' · '+LIA_PECAS[o.peca][0]+(o.modo==='GERAÇÃO'?' · resultado: '+(res||'[não informado: propor e marcar VALIDAR]'):'');
      var prec=(B.prec||[]).filter(function(p){return sel.indexOf(p.id)>=0;});
      var par=o.par?R.par.slice(0,6).map(function(z){return '◆ '+(z.x.titulo||z.x.id)+(z.x.categoria?' ('+z.x.categoria+')':'')+'\n'+String(z.x.texto||'').trim();}):[];
      return [].concat(gerar?[tarefa+'\n\n'+v3.trim()]:[liaRecorte(v3,o.peca),'','══════════════════════════════','DADOS DESTE PROCESSO E MATERIAL DO GABINETE (gerados pelo Compendium a partir do prontuário do Ex Officio)','══════════════════════════════',tarefa],['',
        'DADOS DO PRONTUÁRIO (conferir nos autos; o prontuário pode ter erro):',liaCaso(P)||'- (prontuário vazio)','',
        (o.mod&&A&&A.x?'ESTRUTURA DO GABINETE PARA ESTE CASO — '+(A.tipo==='mod'?'modelo do banco: ':'minuta-matriz: ')+nomeDe(A)+'\nUse a ordem dos tópicos e os parágrafos-padrão abaixo; os trechos entre { } são campos a preencher com os dados destes autos. Nada do modelo vale como fato deste processo.\n\n'+liaFolha(A)+'\n':''),
        (prec.length?'PRECEDENTES DO RELATOR NA BASE DO GABINETE (podem ser citados com estes dados, na forma da seção C; confira a aderência ao caso; outros precedentes só com [VALIDAR: precedente]):\n'+prec.map(liaPrec).join('\n\n')+'\n':''),
        (par.length?'PARÁGRAFOS-PADRÃO APLICÁVEIS (preencha os campos { } com os dados destes autos; use só se couberem):\n'+par.join('\n\n')+'\n':''),
        gerar?'Fim do material. Comece pela Etapa 1.':'TEXTO PARA REVISÃO (cole abaixo a minuta; anexe o inteiro teor):']).join('\n');});}
  function liaPainel(P,A,R){var o=CQ.lia,sel=o.prec||R.prec.slice(0,4).map(function(z){return z.x.id;});
    return '<div class="dori cq-lia"><p class="kick2"><span>Minuta com a LIA</span><span>prompt</span></p>'+
      '<p class="meta">GERAÇÃO: prompt enxuto em quatro etapas (preencher o prontuário, pesquisar no material do gabinete, redigir pelas regras de redação, conferir), com os dados deste processo, o modelo aplicado, os parágrafos-padrão e os precedentes marcados. Os outros modos usam o Prompt_Minuta_CMT v3 completo, recortado pela peça. Cole na LIA com o processo aberto no PJe.</p>'+
      '<label class="cql">Peça<select id="cq-lp">'+Object.keys(LIA_PECAS).map(function(k){return '<option value="'+k+'"'+(k===o.peca?' selected':'')+'>'+e(LIA_PECAS[k][0])+'</option>';}).join('')+'</select></label>'+
      '<label class="cql">Modo<select id="cq-lm">'+['GERAÇÃO','CONFERÊNCIA','LIMPO','FORMATAÇÃO'].map(function(m){return '<option'+(m===o.modo?' selected':'')+'>'+m+'</option>';}).join('')+'</select></label>'+
      '<label class="cql">Resultado pretendido<input id="cq-lr" value="'+e(o.res||P.resultado||'')+'" placeholder="ex.: negar provimento à apelação do INSS"></label>'+
      '<label class="cqk2"><input type="checkbox" id="cq-lmod"'+(o.mod?' checked':'')+'> estrutura aplicada ('+e(nomeDe(A)||'nenhuma')+')</label>'+
      '<label class="cqk2"><input type="checkbox" id="cq-lpar"'+(o.par?' checked':'')+'> parágrafos-padrão ('+R.par.slice(0,6).length+')</label>'+
      (R.prec.length?'<p class="meta" style="margin-top:6px">Precedentes a levar:</p>'+R.prec.map(function(z){return '<label class="cqk2"><input type="checkbox" data-lprec="'+e(z.x.id)+'"'+(sel.indexOf(z.x.id)>=0?' checked':'')+'> '+e([z.x.processo||z.x.id,z.x.resultado].filter(Boolean).join(' · '))+'</label>';}).join(''):'<p class="meta">Sem precedente do relator com os termos do caso.</p>')+
      '<div class="cqacs"><button class="dbt" data-lia="copiar">Copiar prompt para a LIA</button><button class="dbt" data-lia="baixar">Baixar .txt</button></div></div>';}
  function liaLigar(P,A,R){var o=CQ.lia,g=function(id){return document.getElementById(id);};
    if(g('cq-lp'))g('cq-lp').onchange=function(){o.peca=this.value;if(o.peca==='mono'&&o.modo==='GERAÇÃO'){}};
    if(g('cq-lm'))g('cq-lm').onchange=function(){o.modo=this.value;};
    if(g('cq-lr'))g('cq-lr').oninput=function(){o.res=this.value;};
    if(g('cq-lmod'))g('cq-lmod').onchange=function(){o.mod=this.checked;};
    if(g('cq-lpar'))g('cq-lpar').onchange=function(){o.par=this.checked;};
    Array.prototype.forEach.call(document.querySelectorAll('#cq [data-lprec]'),function(c){c.onchange=function(){var cur=o.prec||R.prec.slice(0,4).map(function(z){return z.x.id;}),id=c.getAttribute('data-lprec');cur=cur.filter(function(x){return x!==id;});if(c.checked)cur.push(id);o.prec=cur;};});
    Array.prototype.forEach.call(document.querySelectorAll('#cq [data-lia]'),function(b){b.onclick=function(ev){ev.stopPropagation();var a=b.getAttribute('data-lia');
      liaMontar(P,A,R).then(function(tx){if(a==='baixar'){var u=URL.createObjectURL(new Blob([tx],{type:'text/plain;charset=utf-8'})),l=document.createElement('a');l.href=u;l.download='Prompt_LIA_'+String(P.processo||'caso').replace(/\D/g,'').slice(0,20)+'_'+o.peca+'.txt';document.body.appendChild(l);l.click();setTimeout(function(){URL.revokeObjectURL(u);l.remove();},500);return;}
        (navigator.clipboard?navigator.clipboard.writeText(tx):Promise.reject()).then(function(){toastC('Prompt copiado ('+Math.round(tx.length/1024)+' KB). Cole na LIA com o processo aberto.');}).catch(function(){toastC('Não consegui copiar: use Baixar .txt.');});})
      .catch(function(er){toastC(er.message);});};});}
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
      '<button class="dbt" id="cq-pront">Colar prontuário</button>'+
      (CQ.perfil&&window.M2886&&M2886.disponivel()?'<button class="dbt" id="cq-m28" aria-pressed="'+(usa28()?'true':'false')+'">Matriz 28,86%</button>':'')+
      (CQ.perfil?'<span class="dbinfo">'+e(CQ.perfil.processo||'')+' · '+e(CQ.fonte)+'</span>':'')+'</div>';
    if(CQ.colar)h+='<div class="cq-cola"><textarea id="cq-cola-t" rows="6" placeholder="Cole aqui o bloco do prontuário (<<<PRONTUARIO_CMT … PRONTUARIO_CMT>>>) ou o JSON baixado da página do prontuário."></textarea>'+
      '<div class="cq-cola-a"><button class="cq-go" id="cq-cola-ok">Carregar o caso</button><button class="dbt" id="cq-cola-x">Cancelar</button>'+
      '<span class="meta">O prontuário vira o caso em consulta. Nos casos de 28,86%, a Consulta abre a matriz modular já preenchida.</span></div></div>';
    if(CQ.erro)h+='<div class="cq-er">'+e(CQ.erro)+(/equipe/.test(CQ.erro)?' <a href="/equipe/" target="_blank" rel="noopener">Abrir o Ex Officio</a>':'')+'</div>';
    tp.innerHTML=h;
    var P=CQ.perfil;
    if(!P){can.innerHTML='';or.innerHTML='';mn.innerHTML='<div class="cqs"><div class="dpj">FOLHA <small>· sem caso em consulta</small></div><div class="cqvz">Escolha a sessão, informe o item da pauta e aperte Enter. O Compendium lê o prontuário gravado no Ex Officio, verifica primeiro se existe matriz modular elegível, depois busca modelos juridicamente compatíveis e usa a minuta-matriz apenas como fallback estrutural.</div></div>';ligar();return;}
    if(!BASE){mn.innerHTML='<div class="cqs"><div class="dpj">FOLHA</div><div class="cqvz">Carregando a base do gabinete…</div></div>';ligar();base().then(render);return;}
    var R=buscar(P),A=aplicar(P,R);
    var em28=window.M2886&&M2886.disponivel()&&M2886.e2886(P,CQ.pront);
    tp.innerHTML+='<div class="cq-selbar"><span class="cq-sel-k">Solução</span>'+(em28?'<button data-sol="m28" aria-pressed="'+(usa28()?'true':'false')+'"><b>Matriz modular</b><small>28,86% · elegível</small></button>':'')+'<button data-sol="modelos" aria-pressed="'+(!usa28()&&A.tipo==='mod'?'true':'false')+'"><b>Modelos</b><small>'+(R.mod.length?R.mod.length+' elegíveis':'nenhum elegível')+'</small></button><button data-sol="matriz" aria-pressed="'+(!usa28()&&A.tipo==='mat'?'true':'false')+'"><b>Minuta-matriz</b><small>estrutura genérica</small></button></div>';
    if(usa28()){window.M2886.render(P,CQ.pront,{can:can,mn:mn,or:or},CQ,render);ligarTopo();ligarSolucao();return;}
    can.innerHTML=canhoto(P,A);mn.innerHTML=folha(P,A);or.innerHTML=orientacoes(P,A,R);
    ligar();liaLigar(P,A,R);
  }
  function usa28(){return !!(CQ.perfil&&window.M2886&&M2886.disponivel()&&(CQ.m28===true||(CQ.m28!==false&&M2886.e2886(CQ.perfil,CQ.pront))));}
  function ligarSolucao(){
    var q=function(sel,fn,ev){Array.prototype.forEach.call(document.querySelectorAll(sel),function(b){b[ev||'onclick']=function(x){if(x&&x.stopPropagation)x.stopPropagation();fn(b,x);};});};
    q('#cq [data-sol="m28"]',function(){CQ.m28=true;CQ.usar='';CQ.matriz=false;CQ.sel='';render();});
    q('#cq [data-sol="modelos"]',function(){CQ.m28=false;CQ.matriz=false;CQ.usar='';CQ.sel='';render();var x=document.getElementById('cq-modelq');if(x)x.focus();});
    q('#cq [data-sol="matriz"]',function(){CQ.m28=false;CQ.matriz=true;CQ.usar='';CQ.sel='';render();});
  }
  function ligarTopo(){
    var s=document.getElementById('cq-ses'),i=document.getElementById('cq-item'),g=document.getElementById('cq-go');
    if(s)s.onchange=function(){CQ.ses=s.value;};
    if(i){i.oninput=function(){CQ.item=i.value;};i.onkeydown=function(ev){if(ev.key==='Enter'){CQ.item=i.value;consultar();}};}
    if(g)g.onclick=function(){CQ.ses=s?s.value:CQ.ses;CQ.item=i?i.value:CQ.item;consultar();};
    var b=document.getElementById('cq-pront');if(b)b.onclick=function(){CQ.colar=!CQ.colar;render();var t=document.getElementById('cq-cola-t');if(t)t.focus();};
    var x=document.getElementById('cq-cola-x');if(x)x.onclick=function(){CQ.colar=false;render();};
    var ok=document.getElementById('cq-cola-ok');if(ok)ok.onclick=function(){
      try{var J=lerProntuario(document.getElementById('cq-cola-t').value);CQ.pront=J;CQ.perfil=perfilDoProntuario(J);CQ.fonte='prontuário colado';CQ.erro='';CQ.colar=false;CQ.m28=null;zerar();
        try{history.replaceState(null,'','#consulta');}catch(er){}}
      catch(er){CQ.erro='Prontuário: '+er.message;}
      render();};
    var m=document.getElementById('cq-m28');if(m)m.onclick=function(){CQ.m28=!usa28();render();};
    ligarSolucao();
  }
  function ligar(){
    ligarTopo();
    var s=document.getElementById('cq-ses'),i=document.getElementById('cq-item'),g=document.getElementById('cq-go');
    if(s)s.onchange=function(){CQ.ses=s.value;};
    if(i){i.oninput=function(){CQ.item=i.value;};i.onkeydown=function(ev){if(ev.key==='Enter'){CQ.item=i.value;consultar();}};}
    if(g)g.onclick=function(){CQ.ses=s?s.value:CQ.ses;CQ.item=i?i.value:CQ.item;consultar();};
    var q=function(sel,fn){Array.prototype.forEach.call(document.querySelectorAll(sel),function(b){b.onclick=function(ev){ev.stopPropagation();fn(b);};});};
    q('#cq [data-cq]',function(b){abrir(b.getAttribute('data-cq'),b.getAttribute('data-id'));});
    q('#cq [data-ver]',function(b){var x=b.getAttribute('data-ver').split(':');CQ.ver[x[0]]=+x[1];CQ.sel=x[0];render();});
    q('#cq [data-blk]',function(b){var k=b.getAttribute('data-blk');CQ.sel=CQ.sel===k?'':k;render();});
    q('#cq [data-g]',function(b){CQ.grupo=b.getAttribute('data-g');CQ.sel='';render();});
    q('#cq [data-fecha]',function(){CQ.sel='';render();});
    q('#cq [data-usar]',function(b){CQ.usar=b.getAttribute('data-usar');CQ.matriz=false;CQ.sel='';CQ.grupo='';CQ.ver={};render();});
    q('#cq [data-matriz]',function(){CQ.matriz=true;CQ.usar='';CQ.sel='';CQ.grupo='';CQ.ver={};render();});
    q('#cq [data-auto]',function(){zerar();render();});
    q('#cq [data-edit]',function(b){irEditorial(b.getAttribute('data-edit'));});
    q('#cq [data-sol="m28"]',function(){CQ.m28=true;CQ.usar='';CQ.matriz=false;CQ.sel='';render();});
    q('#cq [data-cqextra]',function(b){CQ.extra[b.getAttribute('data-cqextra')]=b.value;render();},'onchange');
    var mq=document.getElementById('cq-modelq');if(mq)mq.oninput=function(){CQ.modelq=mq.value;var pos=mq.selectionStart;render();var n=document.getElementById('cq-modelq');if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(er){}}};
  }
  window.CQ_render=function(){carregarCal().then(render);};
  var ov=window.VDM_view;
  window.VDM_view=function(v){if(v==='consulta'){window.CQ_render();return;}if(ov)ov(v);};
  var temHash=lerHash();
  window.addEventListener('hashchange',function(){if(lerHash()){var t=document.querySelector('.tab[data-v="consulta"]');if(t)t.click();if(CQ.ses&&CQ.item)carregarCal().then(consultar);else window.CQ_render();}});
  setTimeout(function(){
    var alvo=temHash?'consulta':(window.VDM_PUBLICO?'ement':'');
    if(alvo){var t=document.querySelector('.tab[data-v="'+alvo+'"]');if(t)t.click();}
    if(temHash&&CQ.ses&&CQ.item)carregarCal().then(consultar);
  },0);
})();
