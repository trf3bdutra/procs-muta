/* ================= CONSULTA: processo pautado → perfil do caso → modelos, precedentes e parágrafos ================= */
(function(){
  var CQ={ses:'',item:'',perfil:null,fonte:'',cal:null,erro:'',busy:false};
  var STOP={'de':1,'da':1,'do':1,'das':1,'dos':1,'e':1,'a':1,'o':1,'as':1,'os':1,'em':1,'no':1,'na':1,'nos':1,'nas':1,'por':1,'para':1,'com':1,'sem':1,'um':1,'uma':1,'ao':1,'aos':1,'que':1,'se':1,'ou':1,'nao':1,'sobre':1,'entre':1,'pelo':1,'pela':1,'art':1,'lei':1,'recurso':1,'processo':1,'caso':1};
  function nq(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
  function toks(s){return nq(s).split(/[^a-z0-9]+/).filter(function(w){return w.length>2&&!STOP[w];});}
  function dg(s){return String(s||'').replace(/\D/g,'');}
  function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function brd(d){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(d||'');return m?m[3]+'/'+m[2]+'/'+m[1]:(d||'');}
  function jget(u){return fetch(u,{cache:'no-store',credentials:'same-origin'}).then(function(r){if(r.status===401){var e=new Error('Para consultar a pauta, entre primeiro pela Pauta da equipe (/equipe/) com o seu nome e a sua senha.');e.login=true;throw e;}if(!r.ok)throw new Error('HTTP '+r.status+' em '+u);return r.json();});}
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
      .catch(function(er){CQ.cal=[];CQ.erro=er.login?er.message:'As pautas não estão disponíveis aqui: a consulta por sessão funciona no site publicado. O botão Compêndio dos cartões continua enviando o caso.';});
  }
  function consultar(){
    var ses=CQ.ses,it=String(CQ.item||'').trim();if(!ses||!it){toastC('Escolha a sessão e informe o item.');return;}
    CQ.busy=true;render();
    jget('/api/pauta?data='+ses).then(function(doc){
      var L=(doc.itens||[]).concat(doc.previa||[]),d=dg(it);
      var x=L.filter(function(i){return String(i.item)===it;})[0]||L.filter(function(i){return d.length>=7&&dg(i.cnj).indexOf(d)>=0;})[0];
      if(!x)throw new Error('Item '+it+' não encontrado na pauta de '+brd(ses)+'.');
      CQ.perfil=perfilDoItem(x);CQ.fonte='pauta de '+brd(ses)+(x.item?' · item '+x.item:'');CQ.erro='';
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
  /* abrir o resultado na aba própria */
  function abrir(tipo,id){
    var B=BASE||{};
    if(tipo==='prec'){var p=(B.prec||[]).filter(function(z){return z.id===id;})[0];if(!p)return;irEmentario({});setTimeout(function(){var q=document.getElementById('e-q');q.value=p.processo||p.id;q.dispatchEvent(new Event('input',{bubbles:true}));},60);return;}
    if(tipo==='mod'){var m=(B.mod||[]).filter(function(z){return z.id===id;})[0];if(!m)return;irModelos(mTipo(m));MS.sel=m.id;setTimeout(function(){var s=document.querySelector('#e-sub button[data-s="mod"]');if(s&&s.getAttribute('aria-selected')!=='true')s.click();MS.sel=m.id;mRender();},60);return;}
    if(tipo==='par'){var q=(B.par||[]).filter(function(z){return z.id===id;})[0];if(!q)return;EM.q.par=q.titulo||'';var t=document.querySelector('.tab[data-v="ement"]');if(t)t.click();
      setTimeout(function(){var s=document.querySelector('#e-sub button[data-s="par"]');if(s)s.click();setTimeout(function(){var r=document.querySelector('#e-out .p-row[data-pid="'+id+'"]');if(r)r.click();},120);},60);}
  }
  var ROT={processo:'Processo',item:'Item',classe:'Classe',assunto:'Assunto',subassuntos:'Subassuntos',especificidades:'Especificidades',questoes:'Questões controvertidas',tipoJulgamento:'Tipo de julgamento',decisaoOrigem:'Decisão na origem',recursos:'Recursos',tempestividade:'Tempestividade',preparo:'Preparo',requisito:'Outro requisito',mpf:'MPF',ed:'ED · vício',retratacao:'Retratação',resultado:'Resultado',consectarios:'Consectários',honorarios:'Honorários',multa:'Multa',servidor:'Servidor'};
  function val(k,v){if(Array.isArray(v))return v.join(' · ');if(v&&typeof v==='object')return Object.keys(v).map(function(z){return v[z];}).filter(Boolean).join(' · ');return v;}
  function render(){
    var el=document.getElementById('cq');if(!el)return;
    var opts=(CQ.cal||[]).map(function(s){return '<option value="'+e(s.date)+'"'+(s.date===CQ.ses?' selected':'')+'>'+e(brd(s.date))+(s.processos?' · '+s.processos+' itens':'')+'</option>';}).join('');
    var h='<div class="cq-bar"><div><div class="lab">Sessão</div><select id="cq-ses"><option value="">escolha a sessão</option>'+opts+'</select></div>'+
      '<div><div class="lab">Item ou nº do processo</div><input id="cq-item" value="'+e(CQ.item)+'" placeholder="ex.: 12" autocomplete="off"></div>'+
      '<button class="cq-go" id="cq-go"'+(CQ.busy?' disabled':'')+'>'+(CQ.busy?'Consultando…':'Consultar')+'</button></div>';
    if(CQ.erro)h+='<div class="cq-er">'+e(CQ.erro)+(/equipe/.test(CQ.erro)?' <a href="/equipe/" target="_blank" rel="noopener">Abrir a Pauta da equipe</a>':'')+'</div>';
    var P=CQ.perfil;
    if(!P){el.innerHTML=h+'<div class="empty">Escolha a sessão, informe o item da pauta e aperte Enter. O Compêndio lê o cartão do processo gravado no procs-muta e mostra os modelos-matriz, os precedentes e os parágrafos-padrão que se aplicam ao caso.</div>';ligar();return;}
    h+='<div class="cq-caso"><div class="cq-ch"><b>'+e(P.processo||'Caso')+'</b><small>'+e(CQ.fonte)+'</small></div><dl>'+Object.keys(ROT).filter(function(k){return P[k]!=null&&k!=='processo';}).map(function(k){return '<dt>'+ROT[k]+'</dt><dd>'+e(val(k,P[k]))+'</dd>';}).join('')+'</dl>'+
      (P.subassuntos||P.especificidades||P.questoes?'':'<p class="cq-av">O cartão ainda não tem subassuntos, especificidades nem questões controvertidas; a pesquisa usa só o assunto e o tipo de julgamento.</p>')+'</div>';
    if(!BASE){el.innerHTML=h+'<div class="empty">Carregando a base do gabinete…</div>';ligar();base().then(render);return;}
    var R=buscar(P);
    var col=function(tit,tipo,L,lin){return '<div class="cq-col"><h3>'+tit+' <small>'+L.length+'</small></h3>'+(L.length?L.map(function(z){return '<button class="cq-r" data-cq="'+tipo+'" data-id="'+e(z.x.id)+'">'+lin(z.x)+'<span class="cq-t">'+z.ach.slice(0,6).map(e).join(' · ')+'</span></button>';}).join(''):'<p class="meta">Nada encontrado com os termos do caso.</p>')+'</div>';};
    h+='<div class="cq-res">'+
      col('Modelos-matriz','mod',R.mod,function(m){return '<b>'+e(m.nomeModelo||m.id)+'</b><span>'+e([mTipo(m),m.assunto].filter(Boolean).join(' · '))+'</span>';})+
      col('Precedentes','prec',R.prec,function(p){return '<b>'+e(p.processo||p.id)+'</b><span>'+e([p.classeSigla||p.classe,p.assunto,p.resultado].filter(Boolean).join(' · '))+'</span>';})+
      col('Parágrafos-padrão','par',R.par,function(p){return '<b>'+e(p.titulo||p.id)+'</b><span>'+e([p.categoria,p.nivelTema].filter(Boolean).join(' · '))+'</span>';})+'</div>';
    el.innerHTML=h;ligar();
  }
  function ligar(){
    var s=document.getElementById('cq-ses'),i=document.getElementById('cq-item'),g=document.getElementById('cq-go');
    if(s)s.onchange=function(){CQ.ses=s.value;};
    if(i){i.oninput=function(){CQ.item=i.value;};i.onkeydown=function(ev){if(ev.key==='Enter'){CQ.item=i.value;consultar();}};}
    if(g)g.onclick=function(){CQ.ses=s.value;CQ.item=i.value;consultar();};
    Array.prototype.forEach.call(document.querySelectorAll('#cq [data-cq]'),function(b){b.onclick=function(){abrir(b.getAttribute('data-cq'),b.getAttribute('data-id'));};});
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
