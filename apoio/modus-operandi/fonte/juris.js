/* ================= EMENTÁRIO · série completa (precedentes/jurisprudencia) =================
   Uma base só: os 33.207 julgados do Relator. Os que já passaram pela curadoria do gabinete
   (assunto, tese, temas, catalogação) trazem esses campos; os demais ficam como pendentes.
   O índice compacto abre de imediato; o arquivo do ano entra sob demanda. */
(function(){
  var JR={idx:null,carregando:false,erro:'',q:'',modo:'indice',pag:120,sel:'',hits:null,busca:false,cur:null,
    f:{de:'',ate:'',esp:'',org:'',cl:'',k:'',cu:'',as:''}};
  var SH={}; /* 'acordaos/2020' → {id: registro} */
  function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function nq(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
  function brd(d){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(d||'');return m?m[3]+'/'+m[2]+'/'+m[1]:(d||'');}
  /* onde ficam os dados: no site, na raiz do repositório publicado; em arquivo, ao lado da pasta apoio */
  function bases(){return location.protocol==='file:'?['../../precedentes/jurisprudencia/']:['/precedentes/jurisprudencia/','../../precedentes/jurisprudencia/'];}
  function lerGz(caminho){
    var L=bases(),i=0;
    var tenta=function(){
      return fetch(L[i]+caminho,{cache:'force-cache'}).then(function(r){
        if(!r.ok)throw new Error('HTTP '+r.status);
        return r.arrayBuffer();
      }).then(function(buf){
        if(typeof DecompressionStream==='undefined')throw new Error('o navegador não descomprime gzip (DecompressionStream)');
        return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      }).then(function(t){return JSON.parse(t);})
      .catch(function(er){if(++i<L.length)return tenta();throw new Error('não foi possível ler '+caminho+': '+er.message);});
    };
    return tenta();
  }
  function arq(x){return (x.t==='A'?'acordaos/':'monocraticas/')+x.y;}
  function shard(nome){
    if(SH[nome])return Promise.resolve(SH[nome]);
    return lerGz(nome+'.json.gz').then(function(d){
      var L=(d&&d.registros)||d||[],m={};L.forEach(function(r){m[r.id]=r;});SH[nome]=m;return m;});
  }
  /* curadoria do gabinete: casa pelo processo e pela data do julgamento */
  function curar(){
    if(JR.cur)return;
    var P=((typeof BASE!=='undefined'&&BASE)||{}).prec||[],m={};
    P.forEach(function(p){
      var d=String(p.dataJulgamento||'').slice(0,10);
      m[p.processo+'|'+d]=p;});
    JR.cur=m;
  }
  function cur(x){curar();return JR.cur[x.n+'|'+String(x.d).slice(0,10)]||null;}
  /* ---------- filtros ---------- */
  function passa(x,semQ){
    var f=JR.f,c=cur(x);
    if(f.de&&String(x.y)<f.de)return false;
    if(f.ate&&String(x.y)>f.ate)return false;
    if(f.esp&&x.t!==f.esp)return false;
    if(f.org&&(x.o||'—')!==f.org)return false;
    if(f.cl&&(x.c||'')!==f.cl)return false;
    if(f.k&&(x.k||'')!==f.k)return false;
    if(f.cu==='sim'&&!c)return false;
    if(f.cu==='nao'&&c)return false;
    if(f.as&&(!c||(c.assunto||'')!==f.as))return false;
    if(semQ)return true;
    if(JR.modo==='integral'&&JR.hits)return JR.hits[x.id]===1;
    var q=nq(JR.q).split(/\s+/).filter(Boolean);
    if(!q.length)return true;
    var alvo=nq([x.n,x.c,x.cl,x.o,x.e,x.r,c&&c.assunto,c&&c.temas,c&&(c.curadoria||{}).tese].join(' '));
    for(var i=0;i<q.length;i++)if(alvo.indexOf(q[i])<0)return false;
    return true;
  }
  function filtrados(){return (JR.idx||[]).filter(function(x){return passa(x);});}
  /* busca no texto integral: carrega os anos do recorte e procura em ementa e inteiro teor */
  function buscarIntegral(){
    var q=nq(JR.q).split(/\s+/).filter(Boolean);
    if(!q.length){JR.hits=null;render();return;}
    var base=(JR.idx||[]).filter(function(x){return passa(x,true);});
    var anos={};base.forEach(function(x){if(x.k!=='apenas_ementa'||x.t==='M')anos[arq(x)]=1;});
    var L=Object.keys(anos);
    if(L.length>14){JR.erro='Recorte grande demais para a busca no texto integral: '+L.length+' anos. Estreite o período ou a espécie.';render();return;}
    JR.busca=true;JR.erro='';render();
    Promise.all(L.map(shard)).then(function(){
      var h={};base.forEach(function(x){
        var r=(SH[arq(x)]||{})[x.id];if(!r)return;
        var alvo=nq([r.ementa,r.inteiro_teor,r.resultado_colegiado].join(' '));
        for(var i=0;i<q.length;i++)if(alvo.indexOf(q[i])<0)return;
        h[x.id]=1;});
      JR.hits=h;JR.busca=false;render();
    }).catch(function(er){JR.busca=false;JR.erro=er.message;render();});
  }
  /* ---------- opções dos filtros ---------- */
  function opcoes(){
    var I=JR.idx||[],anos={},org={},cl={},as={},nc=0;
    curar();
    I.forEach(function(x){anos[x.y]=1;if(x.o)org[x.o]=(org[x.o]||0)+1;if(x.c)cl[x.c]=(cl[x.c]||0)+1;
      var c=cur(x);if(c){nc++;if(c.assunto)as[c.assunto]=(as[c.assunto]||0)+1;}});
    var ord=function(o){return Object.keys(o).sort(function(a,b){return o[b]-o[a];});};
    return {anos:Object.keys(anos).sort(),org:ord(org).slice(0,14),cl:ord(cl).slice(0,16),as:ord(as).slice(0,30),nc:nc};
  }
  function sel(id,rot,v,L,rotulos){
    return '<label>'+rot+'<select id="'+id+'"><option value="">todos</option>'+
      L.map(function(o){return '<option value="'+e(o)+'"'+(String(v)===String(o)?' selected':'')+'>'+e((rotulos&&rotulos[o])||o)+'</option>';}).join('')+'</select></label>';
  }
  /* ---------- telas ---------- */
  function linha(x){
    var on=JR.sel===x.id,c=cur(x);
    return '<article class="jr-r'+(on?' on':'')+'" data-jr="'+e(x.id)+'">'+
      '<div class="jr-h"><b class="mono">'+e(x.n)+'</b><span class="jr-tag '+(x.t==='A'?'ac':'mo')+'">'+(x.t==='A'?'acórdão':'monocrática')+'</span>'+
      (c?'<span class="jr-tag cu">curado</span>':'<span class="jr-tag pe">sem curadoria</span>')+
      '<span class="jr-m">'+e([x.c,x.o||'—'].filter(Boolean).join(' · '))+'</span><span class="jr-sp"></span><span class="jr-d mono">'+e(brd(x.d))+'</span></div>'+
      (c&&c.assunto?'<p class="jr-as">'+e(c.assunto)+'</p>':'')+
      '<p class="jr-e">'+e(String(x.e||'').slice(0,320))+(String(x.e||'').length>320?'…':'')+'</p>'+
      (x.r?'<p class="jr-res">'+e(String(x.r).slice(0,220))+'</p>':'')+'</article>';
  }
  function detalhe(){
    if(!JR.sel)return '';
    var x=(JR.idx||[]).filter(function(z){return z.id===JR.sel;})[0];if(!x)return '';
    var r=(SH[arq(x)]||{})[x.id],c=cur(x);
    var h='<div class="jr-dt"><div class="jr-dth"><div><p class="cvk">Julgado</p><p class="cvt mono">'+e(x.n)+'</p></div><button class="cvx" data-jrx="1" aria-label="Fechar">×</button></div>';
    h+='<div class="cf"><div class="cfl"><span>Identificação</span>'+(c?'<span class="pill">curado</span>':'')+'</div><div class="jr-kv">'+
      [['Espécie',x.t==='A'?'Acórdão':'Decisão monocrática'],['Classe',x.cl||x.c],['Órgão',x.o||'—'],['Julgamento',brd(x.d)],['Publicação',x.p||'—'],['Veículo',x.v||'—'],['Atuação',x.a||'—'],['Conteúdo',({integral:'relatório, voto e acórdão',apenas_acordao:'ementa e acórdão',apenas_ementa:'só ementa'})[x.k]||x.k||'—']]
      .map(function(p){return '<div class="jr-k">'+e(p[0])+'</div><div class="jr-v">'+e(p[1])+'</div>';}).join('')+'</div></div>';
    if(c){
      var cd=c.curadoria||{},ct=c.catalogacao||{};
      h+='<div class="cf"><div class="cfl"><span>Curadoria do gabinete</span></div><div class="jr-kv">'+
        [['Assunto',c.assunto||'—'],['Ramo',c.ramoDireito||'—'],['Temas',c.temas||'—'],['Catalogação',[ct.temaId,ct.temaRotulo].filter(Boolean).join(' · ')||'—'],['Resultado',c.resultado||'—']]
        .map(function(p){return '<div class="jr-k">'+e(p[0])+'</div><div class="jr-v">'+e(p[1])+'</div>';}).join('')+'</div>'+
        (cd.tese?'<p class="jr-tese">'+e(cd.tese)+'</p>':'')+'</div>';
    }else{
      h+='<div class="cf"><div class="cfl"><span>Curadoria</span><span class="pill pe">pendente</span></div><p class="meta">Este julgado ainda não tem assunto, tese nem catalogação do gabinete. A ementa e o inteiro teor abaixo são os da base do TRF-3.</p></div>';
    }
    if(!r)h+='<div class="cf"><p class="meta">Carregando o ano de '+e(x.y)+'…</p></div>';
    else{
      if(r.resultado_colegiado)h+='<div class="cf"><div class="cfl"><span>Resultado</span></div><p class="jr-tx">'+e(r.resultado_colegiado)+'</p></div>';
      if(r.ementa)h+='<div class="cf"><div class="cfl"><span>Ementa</span></div><p class="jr-tx">'+e(r.ementa).replace(/\n+/g,'</p><p class="jr-tx">')+'</p></div>';
      if(r.inteiro_teor)h+='<div class="cf"><div class="cfl"><span>Inteiro teor</span><span class="pill">'+(r.caracteres_inteiro_teor||String(r.inteiro_teor).length)+' caracteres</span></div><div class="jr-it"><p>'+e(r.inteiro_teor).replace(/\n+/g,'</p><p>')+'</p></div></div>';
      h+='<div class="cf jr-acs"><button class="dbt" data-jrcit="'+e(x.id)+'">Copiar a citação</button>'+
        (r.link_integra_externa?'<a class="dbt" href="'+e(r.link_integra_externa)+'" target="_blank" rel="noopener">Abrir no TRF-3</a>':'')+'</div>';
    }
    return h+'</div>';
  }
  function citar(id){
    var x=(JR.idx||[]).filter(function(z){return z.id===id;})[0];if(!x)return;
    var r=(SH[arq(x)]||{})[id]||{};
    var t=[x.cl||x.c,x.n,'Rel. Des. Fed. CARLOS MUTA',x.o||'',(x.t==='A'?'j. ':'decisão de ')+brd(x.d),x.p?'DJEN '+x.p:''].filter(Boolean).join(', ');
    var txt=t+(r.ementa?'\n\n'+r.ementa:'');
    if(navigator.clipboard)navigator.clipboard.writeText(txt).then(function(){tj('Citação copiada.');},function(){tj('Não foi possível copiar.');});
    else tj('Copie manualmente: o navegador não liberou a área de transferência.');
  }
  function tj(t){var el=document.getElementById('toast');if(el){el.textContent=t;el.classList.add('on');setTimeout(function(){el.classList.remove('on');},2400);}}
  /* monta o lugar da lista dentro da própria aba Ementário, no lugar da lista antiga */
  function host(){
    var v=document.getElementById('v-ement');if(!v)return null;
    var h=document.getElementById('jr-host');
    if(!h){
      Array.prototype.forEach.call(v.children,function(ch){if(ch.id!=='jr-host'&&!ch.classList.contains('pg-h'))ch.classList.add('jr-off');});
      h=document.createElement('div');h.id='jr-host';h.className='jr-wrap';h.innerHTML='<div id="jr"></div>';v.appendChild(h);
      var d=v.querySelector('.pg-t p');if(d)d.textContent='Todos os julgados do Relator: 26.050 acórdãos (1999–2026) e 7.157 monocráticas (2016–2026). Os que já passaram pela curadoria do gabinete trazem assunto, tese, temas e catalogação; os demais ficam marcados como pendentes.';
    }
    return document.getElementById('jr');
  }
  function render(){
    var el=host();if(!el)return;
    if(JR.carregando){el.innerHTML='<div class="jr-vz">Carregando o índice do ementário…</div>';return;}
    if(!JR.idx){el.innerHTML='<div class="jr-vz">'+e(JR.erro||'Índice não carregado.')+'<br><button class="dbt" data-jrrec="1">Tentar de novo</button></div>';ligar();return;}
    var O=opcoes(),L=filtrados(),mostra=L.slice(0,JR.pag);
    var h='<div class="dbar jr-bar"><label>Busca<input id="jr-q" type="search" value="'+e(JR.q)+'" placeholder="número, classe, ementa, assunto, tese"></label>'+
      '<div class="dseg" role="group" aria-label="Onde buscar"><button data-jrm="indice" aria-pressed="'+(JR.modo==='indice')+'">Índice</button><button data-jrm="integral" aria-pressed="'+(JR.modo==='integral')+'">Texto integral</button></div>'+
      sel('jr-de','De',JR.f.de,O.anos)+sel('jr-ate','Até',JR.f.ate,O.anos)+
      sel('jr-esp','Espécie',JR.f.esp,['A','M'],{A:'acórdãos',M:'monocráticas'})+
      sel('jr-cu','Curadoria',JR.f.cu,['sim','nao'],{sim:'feita',nao:'pendente'})+
      sel('jr-as','Assunto',JR.f.as,O.as)+
      sel('jr-org','Órgão',JR.f.org,O.org)+sel('jr-cl','Classe',JR.f.cl,O.cl)+
      sel('jr-k','Conteúdo',JR.f.k,['integral','apenas_acordao','apenas_ementa'],{integral:'inteiro teor',apenas_acordao:'ementa e acórdão',apenas_ementa:'só ementa'})+
      '<span class="dbsp"></span><span class="dbinfo">'+L.length.toLocaleString('pt-BR')+' de '+JR.idx.length.toLocaleString('pt-BR')+' · '+O.nc.toLocaleString('pt-BR')+' com curadoria</span></div>';
    if(JR.erro)h+='<div class="jr-er">'+e(JR.erro)+'</div>';
    if(JR.busca)h+='<div class="jr-vz">Lendo o texto integral dos anos do recorte…</div>';
    h+='<div class="jr-corpo"><div class="jr-lista">'+
      (mostra.length?mostra.map(linha).join(''):'<div class="jr-vz">Nenhum julgado no recorte.'+(JR.modo==='indice'&&JR.q?' O índice cobre número, classe, prévia da ementa, resultado e a curadoria: tente a busca no texto integral.':'')+'</div>')+
      (L.length>mostra.length?'<button class="dbt jr-mais" data-jrmais="1">Mostrar mais '+Math.min(120,L.length-mostra.length)+' de '+(L.length-mostra.length).toLocaleString('pt-BR')+'</button>':'')+
      '</div><aside class="jr-lado">'+(JR.sel?detalhe():'<div class="jr-vz">Abra um julgado para ver a curadoria, a ementa, o inteiro teor e a citação. O ano é baixado só nesse momento.</div>')+'</aside></div>';
    el.innerHTML=h;ligar();
  }
  function ligar(){
    var q=function(s,fn){Array.prototype.forEach.call(document.querySelectorAll(s),function(b){b.onclick=function(ev){ev.preventDefault();fn(b);};});};
    var i=document.getElementById('jr-q');
    if(i){i.oninput=function(){JR.q=i.value;JR.pag=120;if(JR.modo==='indice'){clearTimeout(JR.tm);JR.tm=setTimeout(function(){render();var z=document.getElementById('jr-q');if(z){z.focus();z.setSelectionRange(z.value.length,z.value.length);}},200);}};
      i.onkeydown=function(ev){if(ev.key==='Enter'&&JR.modo==='integral')buscarIntegral();};}
    [['jr-de','de'],['jr-ate','ate'],['jr-esp','esp'],['jr-org','org'],['jr-cl','cl'],['jr-k','k'],['jr-cu','cu'],['jr-as','as']].forEach(function(p){
      var s=document.getElementById(p[0]);if(s)s.onchange=function(){JR.f[p[1]]=s.value;JR.pag=120;JR.hits=null;render();};});
    q('#jr [data-jrm]',function(b){JR.modo=b.getAttribute('data-jrm');JR.hits=null;JR.erro='';if(JR.modo==='integral'&&JR.q)buscarIntegral();else render();});
    q('#jr [data-jrmais]',function(){JR.pag+=120;render();});
    q('#jr [data-jrrec]',function(){JR.idx=null;carregar();});
    q('#jr [data-jrx]',function(){JR.sel='';render();});
    q('#jr [data-jrcit]',function(b){citar(b.getAttribute('data-jrcit'));});
    q('#jr [data-jr]',function(b){
      var id=b.getAttribute('data-jr');JR.sel=JR.sel===id?'':id;render();
      if(!JR.sel)return;
      var x=(JR.idx||[]).filter(function(z){return z.id===JR.sel;})[0];
      if(x&&!SH[arq(x)])shard(arq(x)).then(render).catch(function(er){JR.erro=er.message;render();});
    });
  }
  /* o campo de busca antigo do ementário continua valendo: o que se digitar nele entra aqui */
  function espelho(){
    var q=document.getElementById('e-q');if(!q||q.dataset.jr)return;q.dataset.jr='1';
    q.addEventListener('input',function(){if(q.value!==JR.q){JR.q=q.value;JR.pag=120;render();}});
  }
  function carregar(){
    if(!document.getElementById('v-ement'))return;
    espelho();
    if(JR.idx||JR.carregando)return render();
    JR.carregando=true;JR.erro='';render();
    lerGz('indice.json.gz').then(function(d){JR.idx=((d&&d.registros)||d||[]).slice().sort(function(a,b){return String(b.d).localeCompare(String(a.d));});JR.carregando=false;JR.cur=null;render();})
      .catch(function(er){JR.carregando=false;JR.erro=er.message+'. A série fica na pasta precedentes/jurisprudencia do procs-muta.';render();});
  }
  window.JR_render=carregar;
  var ov=window.VDM_view;
  window.VDM_view=function(v){if(ov)ov(v);if(v==='ement')setTimeout(carregar,0);};
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){var s=document.getElementById('v-ement');if(s&&!s.hidden)carregar();},300);});
})();
