
/* Acesso ao repositório privado trf3bdutra/procs-muta pela API do GitHub (versão de teste).
   O token fica nesta aba; com "Lembrar", fica também neste navegador. */
(function(){
  if(window.ProcsMuta)return;
  var REPO={dono:'trf3bdutra',repo:'procs-muta',ramo:'main'},K='procsmuta_token',pedido=null,GRAVA=true;var fechaPedido=null;
  var OFFICE=!!(window.__ghPonte&&window.__ghPonte.office);
  var tok=OFFICE?'':(function(){try{return sessionStorage.getItem(K)||localStorage.getItem(K)||''}catch(e){return ''}})();
  function esquecer(){tok='';if(OFFICE)return;try{sessionStorage.removeItem(K);localStorage.removeItem(K)}catch(e){}}
  var recusado=true,aviso='';
  /* sem token guardado: a sessão da Ex Officio, se houver, abre o acesso pela ponte da Vercel (gh-ponte.js · /api/gh) */
  var pronto=(!tok&&window.__ghPonte&&window.__ghPonte.confere?window.__ghPonte.confere():Promise.resolve(false)).then(function(ok){if(ok&&!tok){tok=window.__ghPonte.SENT;recusado=false}}).catch(function(){});   /* o pedido de token não abre sozinho: só pelo botão de conexão (ou ao gravar) */
  /* pede o token uma vez; confere no GitHub antes de aceitar; "Agora não" vale para esta aba até novo pedido explícito */
  function pedir(motivo,forcar){return pronto.then(function(){return pedir0(motivo,forcar)})}
  function pedir0(motivo,forcar){
    if(OFFICE){if(tok===window.__ghPonte.SENT)return Promise.resolve(tok);return window.__ghPonte.confere().then(function(ok){tok=ok?window.__ghPonte.SENT:'';return tok})}
    if(tok)return Promise.resolve(tok);
    if(recusado&&!forcar)return Promise.resolve('');
    if(pedido)return pedido;
    pedido=new Promise(function(res){
      var bg=document.createElement('div');bg.id='procsmuta-token';
      bg.setAttribute('style','position:fixed;inset:0;z-index:2147483646;background:#0f1f2e;display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;font:14px/1.5 system-ui,Arial,sans-serif');
      bg.innerHTML='<div style="color:#fff;font:700 15px Figtree,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase">Ab Initio <span style="color:#e6c27a">· Gabinete A</span></div><form style="background:#fff;color:#22313c;border-radius:12px;padding:20px 22px;max-width:460px;width:calc(100% - 32px);box-shadow:0 10px 40px rgba(0,0,0,.3)">'+
        '<h3 style="margin:0 0 8px;font-size:17px">Base do gabinete (procs-muta)</h3>'+
        '<p style="margin:0 0 10px">O Ab Initio lê o acervo e grava as sessões e as regras no repositório privado <code>trf3bdutra/procs-muta</code>. Informe um token do GitHub com acesso a esse repositório (permissão <i>Contents</i>: leitura e gravação).</p>'+
        '<p data-erro style="margin:0 0 10px;color:#a03a12;font-weight:600;'+(aviso?'':'display:none')+'">'+aviso+'</p>'+
        '<input type="password" autocomplete="off" placeholder="github_pat_… ou ghp_…" required style="width:100%;padding:9px 10px;border:1px solid #cfd8de;border-radius:7px;font:inherit">'+
        '<label style="display:flex;gap:7px;align-items:center;margin-top:9px;font-size:12.5px"><input type="checkbox" data-lembrar checked> Lembrar neste navegador (só em computador do gabinete)</label>'+
        '<div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:14px"><span data-st style="margin-right:auto;font-size:12.5px;color:#5d6475"></span><button type="button" data-n style="padding:7px 12px;border:1px solid #cfd8de;background:#fff;border-radius:7px;cursor:pointer">Agora não</button>'+
        '<button type="submit" style="padding:7px 14px;border:0;background:#265f85;color:#fff;border-radius:7px;cursor:pointer;font-weight:700">Conectar</button></div></form>';
      document.body.appendChild(bg);
      var erro=bg.querySelector('[data-erro]'),st=bg.querySelector('[data-st]'),inp=bg.querySelector('input[type=password]');
      function mostra(m){erro.textContent=m;erro.style.display=m?'':'none'}
      function fim(v){fechaPedido=null;bg.remove();res(v)}
      fechaPedido=fim;
      bg.querySelector('[data-n]').onclick=function(){recusado=true;fim('')};
      bg.querySelector('form').onsubmit=async function(e){
        e.preventDefault();var v=inp.value.trim();if(!v)return;
        st.textContent='Conferindo no GitHub…';mostra('');
        var r=null;try{r=await fetch('https://api.github.com/repos/'+REPO.dono+'/'+REPO.repo,{cache:'no-store',headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+v,'X-GitHub-Api-Version':'2022-11-28'}})}catch(er){}
        st.textContent='';
        if(!r){mostra('Não consegui falar com o GitHub. Confira a internet e tente de novo.');return}
        if(r.status===401){mostra('O GitHub recusou este token: ele está errado ou expirou. Gere outro em github.com › Settings › Developer settings › Personal access tokens.');return}
        if(r.status===403||r.status===404){mostra('Este token não dá acesso ao trf3bdutra/procs-muta. No token fine-grained, escolha "Resource owner: trf3bdutra", o repositório procs-muta e a permissão Contents (Read and write); no token clássico, marque o escopo "repo".');return}
        if(!r.ok){mostra('O GitHub respondeu HTTP '+r.status+'. Tente de novo em instantes.');return}
        var info={};try{info=await r.json()}catch(er){}
        tok=v;recusado=false;aviso='';
        try{sessionStorage.setItem(K,v);if(bg.querySelector('[data-lembrar]').checked)localStorage.setItem(K,v)}catch(er){}
        if(info.permissions&&info.permissions.push===false)console.warn('[procs-muta] token só de leitura: a gravação vai falhar.');
        fim(v);
      };
      setTimeout(function(){inp.focus()},30);
    }).then(function(v){pedido=null;return v});
    return pedido;
  }
  async function ler(rel){
    for(var t=0;t<2;t++){
      var k=await pedir('Para ler a base do gabinete.');
      if(!k)throw new Error('sem token de acesso ao repositório privado trf3bdutra/procs-muta');
      var r=await fetch('https://api.github.com/repos/'+REPO.dono+'/'+REPO.repo+'/contents/'+rel+'?ref='+REPO.ramo+'&t='+Date.now(),
        {cache:'no-store',headers:{'Accept':'application/vnd.github.raw+json','Authorization':'Bearer '+k,'X-GitHub-Api-Version':'2022-11-28'}});
      if(r.status===401){var eraPonte=window.__ghPonte&&k===window.__ghPonte.SENT;esquecer();if(!eraPonte&&window.__ghPonte&&await window.__ghPonte.confere()){tok=window.__ghPonte.SENT;recusado=false;continue}aviso=eraPonte?'A sessão da Ex Officio expirou. Entre de novo.':'O GitHub recusou o token salvo neste navegador (errado ou expirado). Informe um novo.';continue}
      if(!r.ok)throw new Error('HTTP '+r.status+' em '+rel);
      return await r.text();
    }
    throw new Error('o GitHub recusou o token informado');
  }
  async function api(metodo,caminho,corpo){
    var k=await pedir('Para gravar no procs-muta.',true);
    if(!k)throw new Error('sem token de acesso ao repositório privado trf3bdutra/procs-muta');
    var r=await fetch('https://api.github.com/repos/'+REPO.dono+'/'+REPO.repo+caminho,{method:metodo,cache:'no-store',
      headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+k,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:corpo?JSON.stringify(corpo):undefined});
    if(r.status===401){esquecer();aviso='O GitHub recusou o token salvo neste navegador (errado ou expirado). Informe um novo.';throw new Error('o GitHub recusou o token; grave de novo para informar outro')}
    if(!r.ok){var m='';try{m=(await r.json()).message||''}catch(e){}throw new Error('HTTP '+r.status+(m?' · '+m:'')+' em '+caminho)}
    return r.json();
  }
  /* grava vários arquivos num único commit no ramo principal (API Git Data); conteúdo null apaga o arquivo; repete se o ramo andar no meio */
  async function gravar(arquivos,mensagem){
    if(!GRAVA)throw new Error('a gravação está desligada nesta versão');
    for(var t=0;t<3;t++){
      var ref=await api('GET','/git/ref/heads/'+REPO.ramo),base=ref.object.sha,cm=await api('GET','/git/commits/'+base),arvore=[];
      for(var c in arquivos){if(arquivos[c]===null){arvore.push({path:c,mode:'100644',type:'blob',sha:null});continue}var b=await api('POST','/git/blobs',{content:arquivos[c],encoding:'utf-8'});arvore.push({path:c,mode:'100644',type:'blob',sha:b.sha})}
      var nt=await api('POST','/git/trees',{base_tree:cm.tree.sha,tree:arvore});
      var nc=await api('POST','/git/commits',{message:mensagem,tree:nt.sha,parents:[base]});
      try{await api('PATCH','/git/refs/heads/'+REPO.ramo,{sha:nc.sha});return nc.sha}catch(e){if(!/HTTP 422/.test(e.message))throw e}
    }
    throw new Error('o procs-muta mudou durante a gravação; tente de novo');
  }
  async function definir(v,lembrar){
    v=String(v||'').trim();if(OFFICE&&v!==window.__ghPonte.SENT)return{erro:'Use a sessão do Office.'};if(!v)return{erro:'Informe o token.'};
    var r=null;try{r=await fetch('https://api.github.com/repos/'+REPO.dono+'/'+REPO.repo,{cache:'no-store',headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+v,'X-GitHub-Api-Version':'2022-11-28'}})}catch(e){}
    if(!r)return{erro:'Não consegui falar com o GitHub. Confira a internet e tente de novo.'};
    if(r.status===401)return{erro:'O GitHub recusou este token: ele está errado ou expirou. Gere outro em github.com › Settings › Developer settings › Personal access tokens.'};
    if(r.status===403||r.status===404)return{erro:'Este token não dá acesso ao trf3bdutra/procs-muta. Use a permissão Contents (leitura e gravação) nesse repositório.'};
    if(!r.ok)return{erro:'O GitHub respondeu HTTP '+r.status+'. Tente de novo em instantes.'};
    tok=v;recusado=false;aviso='';
    /* token informado fora deste pedido (tela de entrada da Triagem, cartão do Atualizar): fecha o pedido aberto */
    if(fechaPedido)try{fechaPedido(v)}catch(e){}
    if(!(window.__ghPonte&&v===window.__ghPonte.SENT))try{sessionStorage.setItem(K,v);if(lembrar)localStorage.setItem(K,v);else localStorage.removeItem(K)}catch(e){}
    return{ok:true};
  }
  window.ProcsMuta={dono:REPO.dono,repo:REPO.repo,ramo:REPO.ramo,ler:ler,gravar:gravar,token:pedir,conectar:function(){return pedir('',true)},definir:definir,esquecer:esquecer,get atual(){return tok},pronto:pronto,get ponte(){return !!(window.__ghPonte&&tok===window.__ghPonte.SENT)},get lembrado(){try{return !!localStorage.getItem(K)}catch(e){return false}}};
  function selo(){var d=document.createElement('div');d.id='procsMutaSelo';d.title='Lê a base trf3bdutra/procs-muta. A gravação está desligada nesta versão de teste.';
    d.setAttribute('style','position:fixed;left:10px;bottom:10px;z-index:2147483645;background:#8c6d38;color:#fff;font:700 11px/1 system-ui,Arial,sans-serif;letter-spacing:.04em;padding:6px 9px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none');
    d.textContent='VERSÃO DE TESTE · procs-muta · só leitura';document.body.appendChild(d)}
  if(false){if(document.body)selo();else document.addEventListener('DOMContentLoaded',selo)}
})();
