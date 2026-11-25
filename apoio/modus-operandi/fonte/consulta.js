/* ================= CASO NA MINUTA-MATRIZ (antes, página Consulta): ficha do processo e cartão da pauta → perfil do caso →
   texto da folha (Minuta-Matriz, modelo ou matriz modular), prontuário no canhoto, conformidade e material no painel ================= */
(function(){
  var CQ={ses:'',item:'',perfil:null,pront:null,fonte:'',cal:null,erro:'',busy:false,modelq:'',R:null,Rp:null,precOpen:false};
  var STOP={'de':1,'da':1,'do':1,'das':1,'dos':1,'e':1,'a':1,'o':1,'as':1,'os':1,'em':1,'no':1,'na':1,'nos':1,'nas':1,'por':1,'para':1,'com':1,'sem':1,'um':1,'uma':1,'ao':1,'aos':1,'que':1,'se':1,'ou':1,'nao':1,'sobre':1,'entre':1,'pelo':1,'pela':1,'art':1,'lei':1,'recurso':1,'processo':1,'caso':1};
  function nq(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
  function toks(s){return nq(s).split(/[^a-z0-9]+/).filter(function(w){return w.length>2&&!STOP[w];});}
  function dg(s){return String(s||'').replace(/\D/g,'');}
  function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function brd(d){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(d||'');return m?m[3]+'/'+m[2]+'/'+m[1]:(d||'');}
  function jget(u){return fetch(u,{cache:'no-store',credentials:'same-origin'}).then(function(r){if(r.status===401){var e=new Error('Para abrir a ficha ou a pauta, entre primeiro pelo Ex Officio (/equipe/) com o seu nome e a sua senha.');e.login=true;throw e;}if(!r.ok)throw new Error('HTTP '+r.status+' em '+u);return r.json();});}
  function tipoJ(classe,julg){var k=String(julg||''),c=nq(classe);
    if(k==='ED')return 'Embargos de Declaração';if(k==='AgInt')return 'Agravo Interno';if(k==='JR')return 'Juízo de Retratação';
    if(/agravo de instrumento/.test(c))return 'Agravo de Instrumento';if(/remessa/.test(c)&&!/apelac/.test(c))return 'Remessa Necessária';if(/apela|apciv/.test(c))return 'Apelação';return '';}
  /* item gravado no procs-muta (acervo/sessoes/AAAA-MM-DD.json) → perfil do caso */
  function perfilDoItem(i){
    var ct=i.ctl||{},C=ct.cartao||{},a=C.adm||{},o=C.orig||{},j=C.jul||{},ac=acDe(i.cnj)||[];
    var x={processo:i.cnj,item:i.item||'',classe:i.classe||ac[0]||'',assunto:i.assunto||ac[1]||'',
      subassuntos:C.subassuntos||'',especificidades:C.especificidades||'',questoes:C.questoes||'',
      tipoJulgamento:C.tipoJ||tipoJ(i.classe||ac[0],i.julgamento),decisaoOrigem:o.tipo||'',
      recursos:(C.recursos||[]).map(function(r){return [r.tipo,r.parte].filter(Boolean).join(' · ');}).filter(Boolean),
      tempestividade:ct.tempest||'',preparo:ct.preparo||'',requisito:a.req||'',mpf:[ct.parecer,(C.mpfx||{}).sentido].filter(Boolean).join(' · '),
      ed:C.ed&&C.ed.vicio?{vicio:C.ed.vicio}:null,retratacao:C.jr&&(C.jr.tema||C.jr.trib)?{tema:C.jr.tema||'',tribunal:C.jr.trib||''}:null,
      resultado:ct.resJulg||'',destino:'Pauta',honorarios:ct.honor||'',multa:j.multa||'',servidor:i.servidor||''};
    Object.keys(x).forEach(function(k){if(x[k]==null||x[k]===''||(Array.isArray(x[k])&&!x[k].length))delete x[k];});
    return x;
  }
  /* prontuário do Ex Officio (cartão gravado no procs-muta) no formato de campos pontuados: campos com chave pontuada */
  function prontDoItem(i){
    var ct=i.ctl||{},C=ct.cartao||{},campos={},LST={recursos:1,pecas:1,pendencias:1,papeis:1};
    (function plano(o,pre){Object.keys(o||{}).forEach(function(k){var v=o[k],ch=pre?pre+'.'+k:k;if(!pre&&LST[k])return;
      if(v&&typeof v==='object'&&!Array.isArray(v))plano(v,ch);else if(v!=null&&v!=='')campos[ch]=v;});})(C,'');
    ['tempest','preparo','prelim','repres','midias','mpf','parecer','resJulg','consect','honor','topico'].forEach(function(k){if(ct[k]!=null&&ct[k]!=='')campos[k]=ct[k];});
    if(i.obs)campos.obs=i.obs;
    /* Correspondências expressas no contrato VC/VCI de api/_ficha.js; não inferir campos jurídicos por semelhança de rótulo. */
    var mapa={'tipoJ':'triagem.Tipo de Julgamento','especificidades':'triagem.Especificidades','questoes':'triagem.Alegações','sintese':'triagem.Síntese Fática','obsGeral':'origem.Observações','mpfx.sentido':'triagem.Parecer - Sentido','mpfx.id':'triagem.ID do Parecer MPF','adm.intim':'triagem.Tempest - Publicação','adm.prot':'triagem.Tempest - Protocolo','adm.prazo':'triagem.Tempest - Prazo legal','jul.fund':'producao.Voto - Descrição','jul.topico':'producao.Tópico-síntese','resJulg':'producao.Voto - Resultado','honor':'producao.Voto - Honorários','topico':'producao.Tópico-síntese','parecer':'triagem.MPF'};
    Object.keys(mapa).forEach(function(k){if(campos[k]!=null&&campos[k]!=='')campos[mapa[k]]=campos[k];});
    if(i.item!=null)campos['pauta.Item (Pauta de Julgamento)']=i.item;
    return {processo:i.cnj,campos:campos,recursos:C.recursos||[],pecas:C.pecas||[],papeis:C.papeis||[],
      pendencias:(C.pendencias||[]).filter(function(x){return !(x&&x.ok);}).map(function(x){return x&&x.desc!=null?x.desc:String(x);}),fonte:'Ex Officio'};
  }
  /* ficha do processo (GET /api/pauta?ficha=CNJ: operacional e fonte do acervo) → perfil do caso; sem a ficha, o acervo embutido (classe e assunto) */
  /* acervo embutido na página: a chave pode vir com máscara do CNJ ou só com os 20 dígitos */
  function acDe(cnj){var A=(BASE&&BASE.ac)||{};return A[cnj]||A[dg(cnj)]||null;}
  function linhasTab(v){if(!Array.isArray(v))return v?[String(v)]:[];return v.map(function(r){return r&&typeof r==='object'?[r.merito||r.tipo,r.parte].filter(Boolean).join(' · '):String(r||'');}).filter(Boolean);}
  function perfilDaFicha(cnj,F){
    var o=(F&&F.operacional)||{},t=o.triagem||{},g=o.origem||{},p=o.producao||{},f=(F&&F.fonte)||{},ac=acDe(cnj)||[];
    var classe=f.classe_judicial||f.Classe||ac[0]||'',assunto=f.Assunto||f.Assunto_Principal||f.assunto_judicial||ac[1]||'';
    var x={processo:cnj,classe:classe,assunto:assunto,subassuntos:t.Tema||p['Lote - Tipo de caso']||'',especificidades:t.Especificidades||'',questoes:t['Alegações']||'',sintese:t['Síntese Fática']||t['Síntese Processual']||'',
      tipoJulgamento:t['Tipo de Julgamento']||tipoJ(classe,''),decisaoOrigem:[g['Sentença - Decisão'],g['Sentença - ID']?'ID '+g['Sentença - ID']:''].filter(Boolean).join(' · '),
      recursos:linhasTab(g.Recursos),tempestividade:t.Tempestividade||'',preparo:t.Preparo||'',mpf:[t.MPF,t['Parecer - Sentido']].filter(Boolean).join(' · '),
      ed:t['ED - Vício']?{vicio:t['ED - Vício']}:null,retratacao:(t['Retratação - Tema']||t['Retratação - Tribunal'])?{tema:t['Retratação - Tema']||'',tribunal:t['Retratação - Tribunal']||''}:null,
      resultado:p['Voto - Resultado']||'',honorarios:p['Voto - Honorários']||'',servidor:p.SERVIDOR||'',destino:p.Destino||''};
    if(/28[,.]86|0005019-15\.1997/.test([x.subassuntos,x.especificidades,x.sintese,p['Lote - Caso'],p.Lote].join(' ')))x.materiaEspecial='Reajuste de 28,86% (ACP 0005019-15.1997.4.03.6000)';
    Object.keys(x).forEach(function(k){if(x[k]==null||x[k]===''||(Array.isArray(x[k])&&!x[k].length))delete x[k];});
    return x;
  }
  /* a ficha inteira (campos com chave “seção.Campo”) acompanha o caso: canhoto, matriz modular e os campos da folha */
  function prontDaFicha(cnj,F){var o=(F&&F.operacional)||{},f=(F&&F.fonte)||{},campos={};
    ['origem','triagem','producao','pauta','controles'].forEach(function(sec){var v=o[sec]||{};Object.keys(v).forEach(function(k){if(k.charAt(0)==='_')return;var y=v[k];if(y==null||y===''||(Array.isArray(y)&&!y.length))return;campos[sec+'.'+k]=y;});});
    (function planoFonte(o,pre){Object.keys(o||{}).forEach(function(k){if(/telefone|e-?mail|cpf|cnpj/i.test(k))return;var y=o[k],ch=pre+'.'+k;if(y==null||y==='')return;if(typeof y==='object'&&!Array.isArray(y))planoFonte(y,ch);else if(typeof y!=='object')campos[ch]=y;});})(f,'acervo');
    return {processo:cnj,campos:campos,recursos:(o.origem||{}).Recursos||[],pecas:(o.origem||{})['Outras peças']||[],papeis:[],pendencias:[],fonte:'ficha'};}
  function fichaDe(cnj){return jget('/api/pauta?ficha='+encodeURIComponent(cnj));}
  /* ficha única prevalece nos campos canônicos; cartão complementa os dados específicos da sessão. */
  function mesclaFicha(F){var P=CQ.perfil,pf=perfilDaFicha(P.processo,F),J=prontDaFicha(P.processo,F);if(VIVA){VIVA.cnj=dg(P.processo);VIVA.ass=assinatura(F);}
    Object.keys(perfilDaFicha(P.processo,{operacional:{},fonte:{}})).forEach(function(k){if(k!=='processo'&&k!=='item'&&k!=='destino')delete P[k];});(CQ._fichaPerfil||[]).forEach(function(k){if(k!=='processo'&&k!=='item'&&k!=='destino')delete P[k];});CQ._fichaPerfil=Object.keys(pf);Object.keys(pf).forEach(function(k){if(k!=='processo'&&k!=='item')P[k]=pf[k];});
    if(CQ.pront&&dg(CQ.pront.processo)===dg(P.processo)){Object.keys(CQ.pront.campos).forEach(function(k){if(/^(origem|triagem|producao|pauta|controles|acervo)\./.test(k))delete CQ.pront.campos[k];});Object.keys(J.campos).forEach(function(k){CQ.pront.campos[k]=J.campos[k];});CQ.pront.recursos=J.recursos;CQ.pront.pecas=J.pecas;}else CQ.pront=J;CQ.R=null;CQ.Rp=null;}
  function lerHash(){
    var h=location.hash.replace(/^#/,''),p={};h.split('&').forEach(function(kv){var i=kv.indexOf('=');if(i>0)p[kv.slice(0,i)]=kv.slice(i+1);});
    if(p.caso){try{CQ.perfil=JSON.parse(decodeURIComponent(p.caso));CQ.pront=null;CQ.fonte='enviado pelo cartão do Caput';}catch(er){}}
    if(p.consulta){var m=/^(\d{4}-\d{2}-\d{2})\/(.+)$/.exec(decodeURIComponent(p.consulta));if(m){CQ.ses=m[1];CQ.item=m[2];}}
    if(p.processo){CQ.item=decodeURIComponent(p.processo);CQ.ses='';CQ.abrirFicha=true;}
    return !!(p.caso||p.consulta||p.processo);
  }
  function carregarCal(){
    if(CQ.cal)return Promise.resolve();
    return jget('/api/sessoes').then(function(c){CQ.cal=(c.sessoes||[]).slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date));});})
      .catch(function(er){CQ.cal=[];CQ.calErro=er.login?er.message:'As pautas não estão disponíveis aqui: a consulta por sessão funciona no site publicado. O botão Compendium dos cartões continua enviando o caso.';});
  }
  function zerar(){CQ.modelq='';CQ.R=null;CQ.Rp=null;CQ.precOpen=false;}
  function consultar(){
    var ses=CQ.ses,it=String(CQ.item||'').trim();if(!ses||!it){toastC('Escolha a sessão e informe o item.');return;}
    CQ.busy=true;pinta();
    jget('/api/pauta?data='+ses).then(function(doc){
      var L=(doc.itens||[]).length?doc.itens:(doc.previa||[]),d=dg(it);
      var x=L.filter(function(i){return String(i.item)===it;})[0]||L.filter(function(i){return d.length>=7&&dg(i.cnj).indexOf(d)>=0;})[0];
      if(!x)throw new Error('Item '+it+' não encontrado na pauta de '+brd(ses)+'.');
      CQ.perfil=perfilDoItem(x);CQ.pront=prontDoItem(x);CQ.fonte='prontuário do Ex Officio · pauta de '+brd(ses)+(x.item?' · item '+x.item:'');CQ.erro='';zerar();
      try{history.replaceState(null,'','#consulta='+ses+'/'+encodeURIComponent(it));}catch(er){}
      return fichaDe(x.cnj).then(function(F){if(F&&(F.operacional||F.fonte)){mesclaFicha(F);CQ.fonte+=' + ficha';}}).catch(function(){});
    }).then(function(){CQ.busy=false;if(CQ.perfil)aplicarCaso();else pinta();},function(er){CQ.erro=CQ.perfil?'Prontuário completo indisponível ('+er.message+'). A Minuta-Matriz usa os dados enviados pelo cartão.':er.message;CQ.busy=false;pinta();});
  }
  /* abrir pelo número do processo: a ficha do processo (qualquer processo do acervo, pautado ou não) */
  function abrirFicha(cnj){CQ.busy=true;CQ.erro='';pinta();
    base().then(function(){return fichaDe(cnj);}).then(function(F){
      if(!F||(!F.operacional&&!F.fonte))throw new Error('O processo '+cnj+' não tem ficha no acervo.');
      CQ.perfil=perfilDaFicha(cnj,F);CQ.pront=prontDaFicha(cnj,F);CQ._fichaPerfil=Object.keys(CQ.perfil);CQ.fonte='ficha do processo';zerar();VIVA.cnj=dg(cnj);VIVA.ass=assinatura(F);
    }).catch(function(er){var ac=acDe(cnj);
      if(ac){CQ.perfil=perfilDaFicha(cnj,null);CQ.pront=null;CQ.fonte='acervo · ficha indisponível ('+er.message.replace(/\.$/,'')+')';zerar();}else CQ.erro=er.message;
    }).then(function(){CQ.busy=false;if(CQ.perfil&&dg(CQ.perfil.processo)===dg(cnj)){try{history.replaceState(null,'','#processo='+encodeURIComponent(cnj));}catch(er){}aplicarCaso();}else pinta();});}
  function abrirCaso(){var it=String(CQ.item||'').trim(),d=dg(it);
    if(!it){toastC('Informe o número do processo ou o item da pauta.');return;}
    if(d.length>=15){CQ.item=xNumProc(it);abrirFicha(CQ.item);return;}
    if(!CQ.ses){toastC(CQ.calErro?CQ.calErro:'Para abrir pelo item, escolha a sessão; ou informe o número do processo.');return;}
    consultar();}
  function toastC(t){var el=document.getElementById('toast');if(el){el.textContent=t;el.classList.add('on');setTimeout(function(){el.classList.remove('on');},2400);}}
  /* pesquisa: pontua cada registro pelos termos do caso, com peso por campo */
  function termos(P){
    var fortes=toks([P.assunto,P.subassuntos,P.especificidades].join(' ')),fracos=toks([P.questoes,(P.recursos||[]).join(' '),P.decisaoOrigem,(P.ed||{}).vicio,(P.retratacao||{}).tema].join(' '));
    var u={};fortes.forEach(function(w){u[w]=2;});fracos.forEach(function(w){if(!u[w])u[w]=1;});return u;
  }
  /* tipo de caso "Matéria · tipo · aspecto distintivo" (padrao/tipo-caso.json): a matéria canônica liga o processo aos precedentes */
  var TCV=(function(){var A={},V=window.TIPO_CASO||{};(V.materias||[]).forEach(function(m){[m.nome].concat(m.aliases||[]).forEach(function(a){A[nq(a).trim()]=m.nome;});});return A;})();
  function matDe(s){var p=nq(String(s||'').split(/\s+·\s+|;\s+/)[0]).trim();if(!p)return '';if(TCV[p])return TCV[p];var b='';Object.keys(TCV).forEach(function(a){if(a.length>b.length&&(p.indexOf(a+' ')===0||p.indexOf(a+'(')===0))b=a;});return b?TCV[b]:'';}
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
    var B=BASE||{},T=termos(P),tj=nq(P.tipoJulgamento||''),aN=nq(P.assunto||''),mP=matDe(P.subassuntos)||matDe(P.assunto);
    var arr=function(v){return Array.isArray(v)?v.join(' '):(v||'');};
    var prec=(B.prec||[]).map(function(p){var r=pont(T,[[p.assunto,3],[arr(p.tipoCaso||p.subassunto),3],[p.tese,2],[arr(p.espTags),2],[arr(p.temas),1],[p.ementa,1]]);if(aN&&nq(p.assunto)===aN)r.s+=6;if(mP&&(p.materia||matDe(p.tipoCaso))===mP){r.s+=4;r.ach.unshift(mP);}return {x:p,s:r.s,ach:r.ach};});
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
    var tj=nq(P.tipoJulgamento||''),dest=nq(P.destino||''),rec=sl(RECS,tj)||sl(RECS,P.classe),res=sl(RESS,P.resultado||''),M=(typeof ED!=='undefined'&&ED&&ED.matrizes)||[];
    if(/agravo interno|retratac|dupla apela/.test(tj)||/despacho/.test(dest+' '+tj)||!rec||!res)return null;
    var tp=/monocr/.test(dest+' '+tj)?'m':'a';
    return M.filter(function(m){var x=/trms-(a|m)-([a-z]+)-([a-z]+)/.exec(m.id);return x&&x[1]===tp&&x[2]===rec&&x[3]===res;})[0]||null;
  }
  /* sugestão para o caso: modelo do banco aderente ou só a estrutura da Minuta-Matriz (a matriz modular, quando elegível, vem antes: e28) */
  function aplicar(P,R){
    var pr=/monocr/i.test(P.destino||'')?'mono':'ac',mt=matrizDoCaso(P),aN=nq(P.assunto||''),b=R.mod.filter(function(z){return dkPronMod(z.x)===pr;})[0],forte=b&&(b.s>=12||(aN&&nq(b.x.assunto||'')===aN&&b.s>=6));
    if(forte)return {tipo:'mod',x:b.x,s:b.s,ach:b.ach,mat:mt};
    return {tipo:'mat',x:mt,cand:b||null};
  }
  function nomeDe(A){if(A.tipo==='m28')return 'modelo 28,86% (matriz)';return A.tipo==='mod'?(A.x.nomeModelo||A.x.id):(A.x?(A.x.nome||A.x.id):'');}
  /* pesquisa do caso, refeita só quando o caso muda */
  function Rcaso(){if(!CQ.perfil||!BASE)return null;if(CQ.Rp!==CQ.perfil){CQ.R=buscar(CQ.perfil);CQ.Rp=CQ.perfil;}return CQ.R;}
  function e28(){return !!(CQ.perfil&&BASE&&window.M2886&&M2886.disponivel()&&M2886.e2886(CQ.perfil,CQ.pront));}
  function sugestao(){var P=CQ.perfil,R=Rcaso();if(!P||!R)return null;if(e28())return {tipo:'m28',mat:matrizDoCaso(P)};return aplicar(P,R);}
  /* estrutura que a folha mostra agora, no formato que a conformidade espera */
  function atual(){if(DK.fonte==='m28'&&e28())return {tipo:'m28',x:null};var m=dkModeloAtivo(),mx=xMatAtual();if(m)return {tipo:'mod',x:m,mat:mx};
    return {tipo:'mat',x:mx||{id:'',nome:'estrutura geral da Minuta-Matriz'},mat:mx};}
  function aplicarCaso(){var P=CQ.perfil;if(!P)return;CQ.trocar=false;
    var vai=function(){if(CQ.perfil!==P)return;dkAplicaCaso(P,{tipo:'mat',mat:matrizDoCaso(P)});};
    if(!CQ.pront&&P.processo&&CQ.fonte==='enviado pelo cartão do Caput'){fichaDe(P.processo).then(function(F){if(CQ.perfil!==P)return;if(F&&(F.operacional||F.fonte)){mesclaFicha(F);CQ.fonte+=' + ficha';}}).catch(function(er){if(CQ.perfil===P)CQ.erro='Ficha indisponível: '+er.message;}).then(function(){if(BASE)vai();else base().then(vai);});return;}
    if(BASE)vai();else{irEditorial('pecas');base().then(vai);}}
  function pinta(){var v=document.getElementById('v-edit');if(v&&!v.hidden&&(XS.ed||'pecas')==='pecas')xPagina();}
  function prontBase(P,J){
    var src=/^ficha/.test(CQ.fonte)?'Ficha':/^acervo/.test(CQ.fonte)?'Acervo':/cartão/.test(CQ.fonte)?'Cartão':'Pauta',srcJ=J&&J.fonte==='ficha'?'Ficha':'Ex Officio';
    var h='<div class="cq-pront-base"><div class="cf"><div class="cfl"><span>Prontuário do processo</span><span class="cq-src">'+e(src.toUpperCase())+'</span></div>';
    GRP.forEach(function(g){var ks=g[1].filter(function(k){return P[k]!=null&&P[k]!=='';});if(!ks.length)return;h+='<details class="cq-psec" open><summary>'+e(g[0])+'</summary><div class="cqkv">'+ks.map(function(k){return '<div class="cqk">'+e(ROT[k]||k)+'</div><div class="cqv">'+e(val(k,P[k]))+' <span class="cq-origin">'+e(src)+'</span></div>';}).join('')+'</div></details>';});
    if(J&&J.campos){var ks=Object.keys(J.campos).filter(function(k){return J.campos[k]!=null&&J.campos[k]!=='';}).sort();if(ks.length)h+='<details class="cq-psec"><summary>Todos os campos importados <span class="pill">'+ks.length+'</span></summary><div class="cqkv">'+ks.map(function(k){return '<div class="cqk">'+e(k)+'</div><div class="cqv">'+e(val(k,J.campos[k]))+' <span class="cq-origin">'+e(srcJ)+'</span></div>';}).join('')+'</div></details>';}
    return h+'</div></div>';
  }
  window.CQ_prontuarioBase=prontBase;
  /* ---------- banco de parágrafos-padrão ---------- */
  function parPorId(id){var L=(BASE&&BASE.par)||[];for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i];return null;}
  /* ---------- banco de parágrafos-padrão: sugestões para incluir num bloco da folha (pelo bloco e pelo caso) ---------- */
  function pickLista(nome,k,q){var L=(BASE&&BASE.par)||[],P=CQ.perfil,T={};q=String(q||'').trim();
    (q?toks(q):toks([nome,P&&P.assunto,P&&P.subassuntos,P&&P.questoes].join(' '))).forEach(function(w){T[w]=(T[w]||0)+1;});
    var R=L.map(function(p,i){var r=pont(T,[[p.titulo,3],[p.nivelTema,2],[p.nivelEspecificidade,2],[p.categoria,1],[p.texto,1]]);return {p:p,s:r.s,i:i};});
    if(q)R=R.filter(function(x){return x.s>0;});R.sort(function(a,b){return b.s-a.s||a.i-b.i;});R=R.slice(0,14);
    var ja=(DK.inc&&DK.inc[k])||[];
    if(!R.length)return '<li class="meta">Nada no banco com esses termos.</li>';
    return R.map(function(x){var p=x.p,tx=String(p.texto||'').replace(/\{\{?([^{}|]{1,120})(\|([^{}]{1,120}))?\}\}?/g,function(_,a,_2,r){return '['+(r||a)+']';});
      return '<li><button type="button" data-dpar="'+e(k)+'|'+e(p.id)+'"'+(ja.indexOf(p.id)>=0?' aria-pressed="true"':'')+'><b>'+e(p.titulo||p.id)+'</b><small>'+e([p.categoria,p.nivelTema].filter(Boolean).join(' · '))+'</small><span>'+e(tx.slice(0,220))+(tx.length>220?'…':'')+'</span></button></li>';}).join('');}
  /* ---------- rótulos do prontuário ---------- */
  var ROT={processo:'Processo',item:'Item',destino:'Destino',classe:'Classe',assunto:'Assunto',subassuntos:'Tipo de caso',especificidades:'Especificidades',questoes:'Questões controvertidas',tipoJulgamento:'Tipo de julgamento',decisaoOrigem:'Decisão na origem',recursos:'Recursos',tempestividade:'Tempestividade',preparo:'Preparo',requisito:'Outro requisito',mpf:'MPF',ed:'ED · vício',retratacao:'Retratação',resultado:'Resultado',consectarios:'Consectários',honorarios:'Honorários',multa:'Multa',servidor:'Servidor'};
  var GRP=[['Identificação',['processo','item','destino','classe','tipoJulgamento','servidor']],['Matéria',['assunto','subassuntos','especificidades','questoes']],
    ['Admissibilidade',['tempestividade','preparo','requisito','mpf','decisaoOrigem','recursos','ed','retratacao']],['Julgamento',['resultado','honorarios','multa']]];
  function val(k,v){if(Array.isArray(v))return v.map(function(x){return x&&typeof x==='object'?Object.keys(x).map(function(z){return x[z];}).filter(Boolean).join(' / '):x;}).join(' · ');if(v&&typeof v==='object')return Object.keys(v).map(function(z){return v[z];}).filter(Boolean).join(' · ');return v;}
  /* ---------- painel de conformidade e material aplicável ---------- */
  /* tipo de julgamento da folha (barra da Minuta-Matriz), para conferir com o do caso */
  function canonTJ(s){s=nq(s);return /embargos de declar/.test(s)?'ed':/agravo interno/.test(s)?'agint':/agravo de instrumento/.test(s)?'ai':/retratac/.test(s)?'jr':(/remessa/.test(s)&&!/apela/.test(s))?'rn':/apela/.test(s)?'ap':'';}
  function tipoFolha(){if(XP.pc!=='acordao'){if(XP.v.decisao==='desp')return {lab:'Despacho',c:''};var r={ap:['Apelação','ap'],ai:['Agravo de Instrumento','ai'],rn:['Remessa Necessária','rn']}[XP.mrec]||['','']; return {lab:'Decisão monocrática'+(r[0]?' · '+r[0]:''),c:r[1]};}
    var v=XP.v.acordao,L={ap:'Apelação',dap:'Dupla apelação',aprn:'Apelação e remessa necessária',ai:'Agravo de Instrumento',ed:'Embargos de Declaração',agint:'Agravo Interno'}[v]||'';
    return {lab:L,c:{ap:'ap',dap:'ap',aprn:'ap',ai:'ai',ed:'ed',agint:'agint'}[v]||'',rn:v==='aprn'};}
  function conformidade(P,A,R){
    var L=[],add=function(s,k,t){L.push({s:s,k:k,t:t});};
    var faltam=['subassuntos','especificidades','questoes'].filter(function(k){return !P[k];});
    if(!faltam.length)add('ok','Cartão do processo','Assunto, tipo de caso, especificidades e questões preenchidos.');
    else add(faltam.length===3?'no':'pc','Cartão do processo','Sem '+faltam.map(function(k){return (ROT[k]||k).toLowerCase();}).join(', ')+'. A pesquisa usa só o que está no cartão: complete no Ex Officio.');
    var tj=P.tipoJulgamento||'',tf=tipoFolha(),ct=canonTJ(tj),ok=ct&&(ct===tf.c||(ct==='rn'&&(tf.rn||tf.c==='rn')));
    if(ct==='jr')add('pc','Folha × caso','Juízo de retratação: a Minuta-Matriz ainda não tem estrutura própria; a folha segue '+(tf.lab||'a estrutura escolhida').toLowerCase()+'. Confira o tema vinculante.');
    else if(ct&&!ok)add('pc','Folha × caso','O caso é de '+tj+'; a folha está em '+(tf.lab||'outro pronunciamento')+'. Ajuste o pronunciamento, a classe e o julgamento na barra.');
    else if(ct)add('ok','Folha × caso','Folha no mesmo tipo de julgamento do caso ('+tj+').');
    if(A.tipo==='m28')add('ok','Texto da folha','Modelo 28,86% · cumprimento individual da ACP (matriz do gabinete, com enquadramento, módulos e variáveis).');
    else if(A.tipo==='mod')add('ok','Texto da folha','Modelo do banco: '+nomeDe(A)+'.');
    else add('ok','Texto da folha','Minuta-Matriz ('+nomeDe(A)+'): estrutura do tipo de julgamento. A escolha de modelo é facultativa e não constitui requisito de conformidade.');
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
    else add('pc','Admissibilidade','Sem informação suficiente no cartão: conferir os requisitos nos autos.');
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
  /* texto da folha em três camadas: matriz modular, modelos elegíveis, Minuta-Matriz */
  function solucoes(P,A,R){
    var q=nq(CQ.modelq||''),filt=function(z){return !q||nq([z.x.nomeModelo,z.x.assunto,z.x.tese,z.x.classe,z.x.resultado,[].concat(z.x.especificidadesTags||[]).join(' '),mTextoBase(z.x)].join(' ')).indexOf(q)>=0;};
    var compat=function(z){var j=dkJulgAtual(),m=dkJulgDe(z.x);return dkPronMod(z.x)===dkPron()&&(!j||!m||j===m||(XP.v.acordao==='aprn'&&m==='rn'));};
    var todos=(q?(R.modTodos||[]):(R.modElegiveis||R.mod||[])).filter(compat).filter(filt).slice(0,30),fora=(R.modFora||[]).filter(filt).slice(0,5),tem28=e28();
    var m28=tem28&&dkPron()==='ac'&&(!q||'28,86% cumprimento individual acp matriz'.indexOf(q)>=0)?'<button type="button" class="cq-sol rec'+(A.tipo==='m28'?' sel':'')+'" data-dfonte="m28"><strong>28,86% · cumprimento individual da ACP</strong><small>Matriz · elegível para este processo · recomendada</small></button>':'';
    return '<div class="dori cq-solucoes"><p class="kick2"><span>Modelos para o caso</span><span>Aplicação facultativa</span></p>'+
      '<div class="cq-tipo"><b>Modelos</b><p>Sugestões para este processo, matrizes incluídas. Aplicado, o modelo fica no seletor “Modelo” e a folha passa a usar o conteúdo dele com os dados do processo. Confira a aderência jurídica.</p><input class="cq-modelq" id="cq-modelq" type="search" value="'+e(CQ.modelq||'')+'" placeholder="Buscar por assunto, tese ou texto" aria-label="Buscar modelos do gabinete">'+
      (todos.length||m28?'<div class="cq-modsel">'+m28+todos.map(function(z){var sel=A.tipo==='mod'&&A.x&&A.x.id===z.x.id;return '<button type="button" class="cq-sol'+(sel?' sel':'')+'" data-dusar="'+e(z.x.id)+'"><strong>'+e(z.x.nomeModelo||z.x.id)+'</strong><small>'+e((z.el.razoes||[]).join(' · ')||('aderência '+z.s))+'</small></button>';}).join('')+'</div>':'<span class="meta">Nenhum modelo encontrado. Digite outros termos para pesquisar o banco.</span>')+
      (fora.length?'<details class="cq-fora"><summary>Fora dos critérios do caso · '+fora.length+'</summary>'+fora.map(function(z){return '<div><b>'+e(z.x.nomeModelo||z.x.id)+'</b><small>'+e((z.el.impedimentos||[]).join(' · ')||'aderência insuficiente')+'</small></div>';}).join('')+'</details>':'')+'</div>'+
      '<div class="cq-tipo"><b>Minuta-Matriz</b><p>Estrutura por tipo de julgamento, preenchida com os dados disponíveis do processo. Na ausência de modelo específico, é o suporte à redação da minuta.</p><button type="button" class="cq-sol'+(A.tipo==='mat'?' sel':'')+'" data-dfonte="mat"><strong>Usar a Minuta-Matriz</strong><small>'+e(A.tipo==='mat'?nomeDe(A):(A.mat?(A.mat.nome||A.mat.id):'estrutura pelo tipo de recurso'))+'</small></button></div></div>';
  }
  /* painel do caso (aba Caso do painel direito da Minuta-Matriz) */
  function painel(){
    var P=CQ.perfil;if(!P)return '';var R=Rcaso();
    if(!R){base().then(function(){if(typeof xRef==='function')xRef();});return '<div class="dori"><p class="meta">Carregando a base do gabinete…</p></div>';}
    var A=atual(),h='';
    var alt=(R.mod||[]).filter(function(z){return !(A.tipo==='mod'&&z.x.id===A.x.id);}).slice(0,5);
    h+=lista('Modelos relacionados','mod',alt,function(m){return e(m.nomeModelo||m.id);});
    h+=lista('Parágrafos-padrão','par',R.par,function(p){return e([p.titulo||p.id,p.categoria].filter(Boolean).join(' · '));});
    return h;
  }
  /* modelos para o caso, no seletor "Modelo" da barra (editorial_d.js › dkSugAbre) */
  function solucoesCaso(){var P=CQ.perfil;if(!P)return '';var R=Rcaso();
    if(!R){base().then(function(){if(typeof dkSugRender==='function')dkSugRender();});return '<div class="dori"><p class="meta">Carregando os modelos do gabinete…</p></div>';}
    return solucoes(P,atual(),R);}
  /* conformidade do caso, no banner do Minutário (editorial_d.js › dkConf) */
  function conformidadeCaso(){var P=CQ.perfil;if(!P)return null;var R=Rcaso();
    if(!R){base().then(function(){if(typeof dkConf==='function')dkConf();});return {h:'<p class="meta">Carregando a base do gabinete…</p>',ok:0,n:0,mau:0};}
    var A=atual(),C=conformidade(P,A,R),mau=C.filter(function(z){return z.s!=='ok';}).length;
    var h='<div class="cqc">'+C.map(function(z){return '<div class="cqi '+z.s+'"><div class="cqih"><b>'+e(z.k)+'</b><i>'+(z.s==='ok'?'em ordem':z.s==='pc'?'conferir':'falta')+'</i></div><p>'+e(z.t)+'</p></div>';}).join('')+'</div>'+
      '<div class="cqacs">'+(A.tipo==='mod'?'<button type="button" class="dbt" data-cq="mod" data-id="'+e(A.x.id)+'">Abrir o modelo na página Modelos</button>':'')+
      (DK.fonteManual?'<button type="button" class="dbt" data-dauto="1">Restaurar Minuta-Matriz</button>':'')+'</div>';
    return {h:h,ok:C.length-mau,n:C.length,mau:mau};}
  function abrir(tipo,id){
    var B=BASE||{};
    if(tipo==='prec'){var p=(B.prec||[]).filter(function(z){return z.id===id;})[0];if(!p)return;irEmentarioProc([p.processo||p.id],'precedente do caso','Relacionado a');return;}
    if(tipo==='mod'){var m=(B.mod||[]).filter(function(z){return z.id===id;})[0];if(!m)return;irModelos(mTipo(m));MS.sel=m.id;setTimeout(function(){MS.sel=m.id;mRender();},60);return;}
    if(tipo==='par'){var q=(B.par||[]).filter(function(z){return z.id===id;})[0];if(!q)return;EM.q.par=q.titulo||'';irEditorial('par');
      setTimeout(function(){setTimeout(function(){var r=document.querySelector('#e-out .p-row[data-pid="'+id+'"]');if(r)r.click();},120);},60);}
  }
  /* ---------- barra do caso, na Minuta-Matriz: número do processo (ficha) ou item da pauta da sessão ---------- */
  function barraCaso(){
    var opts=(CQ.cal||[]).map(function(s){return '<option value="'+e(s.date)+'"'+(s.date===CQ.ses?' selected':'')+'>'+e(brd(s.date))+(s.processos?' · '+s.processos+' itens':'')+'</option>';}).join('');
    var P=CQ.perfil,ph=CQ.calErro?'pautas indisponíveis':CQ.cal?'opcional':'carregando…',chip=P?'<span class="dcx-info"><b>'+e(P.processo||'caso sem número')+'</b><small>'+e(CQ.fonte||'')+'</small>'+'<button type="button" class="dcx-t" data-dcxf title="Buscar novamente os dados gravados pela HERO18810 na ficha"'+(CQ.busy?' disabled':'')+'>Atualizar ficha</button>'+(CQ.trocar?'':'<button type="button" class="dcx-t" data-dcxt title="Carregar outro processo">Outro caso</button>')+'<button type="button" data-dcxx title="Fechar o caso: a folha volta ao molde geral" aria-label="Fechar o caso">×</button></span>':'';
    var prec='<button type="button" class="dcx-t cq-prec-toggle" data-cq-prec aria-controls="cq-prec-panel" aria-expanded="'+CQ.precOpen+'" title="Precedentes associados e correspondentes" aria-label="Precedentes associados e correspondentes"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-4H4zM20 4h-3a4 4 0 0 0-4 4v13a4 4 0 0 1 4-4h3z"/><path d="M7 8h3m6 0h2M7 11h3m6 0h2"/></svg></button>';
    if(P&&!CQ.trocar&&!CQ.busy)return chip+prec;
    var h='<div class="dgrp dcaso">'+
      '<label><span>Processo / item</span><input aria-label="Processo ou item da pauta" id="cq-item" value="'+e(CQ.item)+'" placeholder="Número ou item" autocomplete="off" title="Número do processo (abre a ficha) ou item da pauta da sessão escolhida"></label>'+
      '<label'+(CQ.calErro?' title="'+e(CQ.calErro)+'"':'')+'><span>Sessão</span><select id="cq-ses" title="Só para abrir pelo item da pauta"><option value="">'+ph+'</option>'+opts+'</select></label>'+
      '<button type="button" class="dcx-go" id="cq-go"'+(CQ.busy?' disabled':'')+'>'+(CQ.busy?'Abrindo…':'Abrir')+'</button></div>';
    return h+chip+prec;}
  function atualizarFichaCaso(){var P=CQ.perfil;if(!P||CQ.busy)return;CQ.busy=true;CQ.erro='';pinta();
    fichaDe(P.processo).then(function(F){if(CQ.perfil!==P)return;if(!F||(!F.operacional&&!F.fonte))throw new Error('Ficha indisponível.');
      mesclaFicha(F);CQ.fonte='ficha atualizada'+(P.item?' · item '+P.item:'');CQ.R=null;CQ.Rp=null;
    }).catch(function(er){if(CQ.perfil===P)CQ.erro='Não foi possível atualizar a ficha: '+er.message;}).then(function(){if(CQ.perfil===P){CQ.busy=false;pinta();}});}
  /* ficha viva: com um caso aberto e a Minuta-Matriz à vista, relê a ficha a cada 20 s; se a HERO18810 (ou a pauta) gravou,
     prontuário, canhoto e folha se atualizam sem recarregar. Tipo de julgamento, destino, classe ou resultado novos refazem a estrutura. */
  var VIVA={t:null,ass:'',cnj:''};
  function assinatura(F){var o=(F&&F.operacional)||{};try{return JSON.stringify([o.origem,o.triagem,o.producao,o.pauta,o.controles,F&&F.fonte]);}catch(er){return '';}}
  function estrutura(P){return [P.tipoJulgamento,P.destino,P.classe,P.resultado].join('|');}
  function fichaViva(){var P=CQ.perfil,v=document.getElementById('v-edit');
    if(!P||!P.processo||CQ.busy||document.hidden||!v||v.hidden||(XS.ed||'pecas')!=='pecas'||dg(P.processo).length!==20)return;
    fichaDe(P.processo).then(function(F){if(CQ.perfil!==P||CQ.busy||!F||(!F.operacional&&!F.fonte))return;
      var a=assinatura(F);if(VIVA.cnj!==dg(P.processo)){VIVA.cnj=dg(P.processo);VIVA.ass=a;return;}
      if(!a||a===VIVA.ass)return;VIVA.ass=a;
      var antes=estrutura(P);mesclaFicha(F);if(!/ficha/.test(CQ.fonte))CQ.fonte+=' + ficha';
      toastC('Ficha atualizada (HERO18810 / pauta): folha e canhoto recompostos.');
      if(estrutura(P)!==antes&&!DK.fonteManual)aplicarCaso();else pinta();}).catch(function(){});}
  function vivaLiga(){clearInterval(VIVA.t);VIVA.t=setInterval(fichaViva,20000);}
  document.addEventListener('visibilitychange',function(){if(!document.hidden)fichaViva();});
  vivaLiga();
  function precedentesCaso(){if(!CQ.precOpen)return '';var P=CQ.perfil,R=Rcaso();if(P&&!R)base().then(function(){if(CQ.precOpen)pinta();});return '<section id="cq-prec-panel" aria-label="Precedentes do caso"><div class="cq-prec-head"><b>Precedentes associados e correspondentes</b><button type="button" class="dbt" data-cq-prec aria-label="Recolher precedentes">×</button></div>'+(!P?'<p class="meta">Abra um processo ou item para consultar os precedentes.</p>':!R?'<p class="meta">Carregando a base do gabinete…</p>':'<p class="meta">Correspondências por matéria, assunto, tese e termos do caso. Confira a aderência antes de citar.</p>'+lista('Precedentes do relator','prec',R.prec,function(p){return e([p.processo||p.id,p.resultado].filter(Boolean).join(' · '));}))+'</section>';}
  function barraExtra(){return precedentesCaso()+(CQ.erro?'<div class="cq-er">'+e(CQ.erro)+(/equipe/.test(CQ.erro)?' <a href="/equipe/" target="_blank" rel="noopener">Abrir o Ex Officio</a>':'')+'</div>':'');}
  function fecharCaso(){CQ.trocar=false;CQ.perfil=null;CQ.pront=null;CQ.fonte='';CQ.erro='';zerar();
    DK.fonte='mat';DK.mod='';DK.rtab='';DK.fonteManual=false;DK.inc={};XP.alt={};XP.abre={};XP.fora={};XP.vb={};XP.res={};Object.keys(FILL).forEach(function(k){if(!/^mod-|^par:/.test(k))delete FILL[k];});XD.proc='';XD.rec='';XD.ac=null;XD.naoAchou=false;
    try{history.replaceState(null,'',location.pathname+location.search);}catch(er){}
    xRascunho();xPagina();}
  /* eventos da barra do caso e do painel (a barra e o painel são redesenhados a cada mudança da folha) */
  function emEdit(t){return t&&t.closest&&t.closest('#v-edit');}
  document.addEventListener('click',function(ev){var t=ev.target,b;if(!emEdit(t))return;
    var fim=function(){ev.preventDefault();ev.stopImmediatePropagation();};
    if(t.closest('#cq-go')){fim();var s0=document.getElementById('cq-ses'),i0=document.getElementById('cq-item');CQ.ses=s0?s0.value:CQ.ses;CQ.item=i0?i0.value:CQ.item;abrirCaso();return;}
    if(t.closest('[data-cq-prec]')){fim();CQ.precOpen=!CQ.precOpen;pinta();return;}
    if(t.closest('[data-dcxf]')){fim();atualizarFichaCaso();return;}
    if(t.closest('[data-dcxx]')){fim();fecharCaso();return;}
    if(t.closest('[data-dcxt]')){fim();CQ.trocar=true;pinta();var it=document.getElementById('cq-item');if(it)it.focus();return;}
    if((b=t.closest('[data-dusar]'))){fim();dkUsaModelo(b.getAttribute('data-dusar'));return;}
    if(t.closest('[data-dauto]')){fim();dkFonte('mat');return;}
    if((b=t.closest('#x-ref [data-cq][data-id],#dk-conf [data-cq][data-id],#cq-prec-panel [data-cq][data-id]'))){fim();abrir(b.getAttribute('data-cq'),b.getAttribute('data-id'));return;}
  },true);
  document.addEventListener('change',function(ev){var t=ev.target;if(!emEdit(t))return;
    if(t.id==='cq-ses'){CQ.ses=t.value;return;}
  });
  document.addEventListener('input',function(ev){var t=ev.target;if(!emEdit(t))return;
    if(t.id==='cq-item'){CQ.item=t.value;return;}
    if(t.id==='cq-modelq'){CQ.modelq=t.value;var pos=t.selectionStart;if(typeof dkSugRender==='function')dkSugRender();else xRef();var n=document.getElementById('cq-modelq');if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(er){}}}
  });
  document.addEventListener('keydown',function(ev){var t=ev.target;if(!t||t.id!=='cq-item'||ev.key!=='Enter')return;ev.preventDefault();
    var s=document.getElementById('cq-ses');CQ.ses=s?s.value:CQ.ses;CQ.item=t.value;abrirCaso();});
  /* ---------- API para a Minuta-Matriz (editorial_d.js) ---------- */
  window.CQX={
    tem:function(){return !!CQ.perfil;},
    P:function(){return CQ.perfil;},
    J:function(){return CQ.pront;},
    fichaModelo:function(cnj){return fichaDe(cnj).then(function(F){if(!F||(!F.operacional&&!F.fonte))return null;return {P:perfilDaFicha(cnj,F),J:prontDaFicha(cnj,F)};});},
    R:Rcaso,e28:e28,sugestao:sugestao,matrizDoCaso:matrizDoCaso,
    barra:function(){if(!CQ.cal&&!CQ._cal){CQ._cal=1;carregarCal().then(pinta);}return barraCaso();},
    extra:barraExtra,painel:painel,pickLista:pickLista,solucoes:solucoesCaso,conformidade:conformidadeCaso,
    resumo:function(){var R=Rcaso();if(!CQ.perfil||!R)return '';var C=conformidade(CQ.perfil,atual(),R),m=C.filter(function(z){return z.s!=='ok';}).length;return m?m+' a conferir':'em ordem';},
    prontuario:function(){return CQ.perfil?'<div class="dcx-pront">'+prontBase(CQ.perfil,CQ.pront)+'</div>':'';},
    render28:function(){window.M2886.render(CQ.perfil,CQ.pront,{can:document.getElementById('cq-can'),mn:document.getElementById('cq-main'),or:document.getElementById('cq-ori')},CQ,
      function(){var sg=sugestao();if(sg&&sg.tipo==='mod'){DK.fonte='mod';DK.mod=sg.x.id;}else DK.fonte='mat';DK.fonteManual=true;xPagina();});}
  };
  /* links antigos da Consulta (#consulta=AAAA-MM-DD/ITEM e #caso=…, enviados pelos cartões do Ex Officio e pelo Collectio) abrem a Minuta-Matriz com o caso */
  var temHash=lerHash();
  window.addEventListener('hashchange',function(){if(!lerHash())return;irEditorial('pecas');if(CQ.perfil){zerar();aplicarCaso();}if(CQ.abrirFicha){CQ.abrirFicha=false;abrirCaso();}else if(CQ.ses&&CQ.item)carregarCal().then(consultar);});
  setTimeout(function(){
    if(temHash){irEditorial('pecas');if(CQ.perfil)aplicarCaso();if(CQ.abrirFicha){CQ.abrirFicha=false;abrirCaso();}else if(CQ.ses&&CQ.item)carregarCal().then(consultar);}
    else if(window.VDM_PUBLICO){var t=document.querySelector('.tab[data-v="ement"]');if(t)t.click();}
  },0);
})();
