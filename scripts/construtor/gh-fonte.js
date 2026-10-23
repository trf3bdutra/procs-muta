
/* Banco de paradigmas servido pelo GitHub — padrão 1.0 (brndutra/gabcmt · main).
   Leitura: biblioteca comum padrao/paradigmas.js (paradigmas/ e referencias/), convertida para o formato interno do
   app (gabA.*) por Paradigmas.legado. Se a base nova não responder, lê banco/ (arquivos de compatibilidade).
   Servido pelo Replit: o servidor tem cópia própria e prevalece; o GitHub não é lido.
   Escrita: um commit com paradigmas/precedentes.jsonl, paradigmas/modelos.json, referencias/paragrafos.json e
   referencias/citacoes.json (o GitHub Actions valida e atualiza o manifesto). Token informado na hora, só na aba. */
(function(){
  const GH={dono:'brndutra',repo:'gabcmt',ramo:'main',pasta:'banco'};
  const ARQ={precedentes:'precedentes.json',modelos:'modelos.json',paragrafos:'paragrafos.json',jurisprudencia:'jurisprudencia.json'};
  const NOVO={precedentes:'paradigmas/precedentes.jsonl',modelos:'paradigmas/modelos.json',paragrafos:'referencias/paragrafos.json',jurisprudencia:'referencias/citacoes.json'};
  const L=()=>window.Paradigmas&&window.Paradigmas.legado;
  let FONTE_DESC='';
  const SENHA_SHA_REMOVIDA='5e968ce47ce4a17e3823c29332a39d049a8d0afb08d157eb6224625f92671a51';
  let GH_OK=false,GH_TOTAL=0,GH_ERRO='',GH_TOKEN='';
  window.GH_FONTE=GH;

  const rawUrl=f=>`https://raw.githubusercontent.com/${GH.dono}/${GH.repo}/${GH.ramo}/${GH.pasta}/${f}?t=${Date.now()}`;
  const apiUrl=f=>`https://api.github.com/repos/${GH.dono}/${GH.repo}/contents/${GH.pasta}/${f}`;
  const colecao=b=>(b==='precedentes'||b==='modelos')?'paradigmas':b;

  function prepararModelo(r){
    r={...r,tipo:'Modelo'};
    if(r.formatoModelo!=='Modelo-matriz'){try{Object.assign(r,modeloParaMatriz(r))}catch(e){}r.formatoModelo='Modelo-matriz'}
    if(r.esqueletoModelo&&typeof r.esqueletoModelo==='object')r.esqueletoModelo=JSON.stringify(r.esqueletoModelo);
    if(r.paragrafosModelo&&typeof r.paragrafosModelo!=='string')r.paragrafosModelo=JSON.stringify(r.paragrafosModelo);
    if(!String(r.processo||'').trim())r.processo='MODELO · '+(r.nomeModelo||r.id);
    return r;
  }
  function prepararRegistro(b,r){
    if(b==='modelos')return prepararModelo(r);
    if(b==='precedentes')return {...r,tipo:'Precedente'};
    return {...r};
  }

  /* três caminhos para o mesmo arquivo do GitHub: se a rede bloquear um, tenta o seguinte */
  const NO_SITE=/^https?:$/.test(location.protocol)&&/(^|\.)github\.io$/i.test(location.hostname);
  const FONTES=[
    ...(NO_SITE?[f=>({url:`${GH.pasta}/${f}?t=${Date.now()}`,opt:{cache:'no-store'}})]:[]),   /* publicado no GitHub Pages: mesmo endereço do app */
    f=>({url:`https://${GH.dono}.github.io/${GH.repo}/${GH.pasta}/${f}?t=${Date.now()}`,opt:{cache:'no-store'}}),
    f=>({url:rawUrl(f),opt:{cache:'no-store'}}),
    f=>({url:apiUrl(f)+`?ref=${GH.ramo}&t=${Date.now()}`,opt:{cache:'no-store',headers:{'Accept':'application/vnd.github.raw+json'}}}),
    f=>({url:`https://cdn.jsdelivr.net/gh/${GH.dono}/${GH.repo}@${GH.ramo}/${GH.pasta}/${f}`,opt:{cache:'no-store'}})
  ];
  let FONTE_OK=-1;
  async function lerArquivo(f){
    const ordem=FONTE_OK>=0?[FONTE_OK,...FONTES.keys()].filter((v,i,a)=>a.indexOf(v)===i):[...FONTES.keys()];
    let ult='';
    for(const i of ordem){
      try{const {url,opt}=FONTES[i](f);const r=await fetch(url,opt);if(!r.ok){ult=`HTTP ${r.status}`;continue}const d=await r.json();FONTE_OK=i;return d}
      catch(e){ult=e.message||'rede bloqueada'}
    }
    throw new Error(`${f}: ${ult||'sem acesso'}`);
  }
  /* registros no formato interno, a partir da base do padrão 1.0 */
  async function lerBaseNova(){
    const fontes=[...(NO_SITE?['']:[]),`https://${GH.dono}.github.io/${GH.repo}/`,`https://raw.githubusercontent.com/${GH.dono}/${GH.repo}/${GH.ramo}/`,`https://cdn.jsdelivr.net/gh/${GH.dono}/${GH.repo}@${GH.ramo}/`];
    const base=window.Paradigmas.criar({fontes});await base.carregar();
    const lg=L();
    FONTE_DESC=`padrão ${base.manifesto.versao}`;
    return {precedentes:base.precedentes().map(lg.precedenteAntigo),modelos:base.modelos().map(lg.modeloAntigo),
            paragrafos:base.paragrafos(),jurisprudencia:base.citacoes({categoria:'jurisprudencia'}).map(lg.citacaoAntiga)};
  }
  async function lerBaseAntiga(){
    const out={};FONTE_DESC='banco/ (compatibilidade)';
    const res=await Promise.allSettled(Object.entries(ARQ).map(async([b,f])=>{const doc=await lerArquivo(f);return [b,Array.isArray(doc)?doc:(doc&&Array.isArray(doc.registros)?doc.registros:[])]}));
    const falhas=[];res.forEach(r=>{if(r.status==='fulfilled')out[r.value[0]]=r.value[1];else falhas.push(r.reason&&r.reason.message||'falha')});
    if(falhas.length)out._falhas=falhas;return out;
  }
  /* servido por um servidor (Replit): ele tem cópia própria dos bancos e prevalece */
  const SEM_SERVIDOR=location.protocol==='file:'||NO_SITE;
  async function haServidor(){
    if(SEM_SERVIDOR)return false;
    for(let i=0;i<15;i++){if(SHARED_SERVER_AVAILABLE)return true;await new Promise(r=>setTimeout(r,400))}
    return !!SHARED_SERVER_AVAILABLE;
  }
  async function carregarDoGitHub(){
    GH_ERRO='';
    if(await haServidor()){GH_OK=true;GH_TOTAL=0;FONTE_DESC='servidor do app (cópia própria)';try{atualizarIndicadorFontes()}catch(e){}return {total:0,falhas:[]}}
    let dados,falhas=[];
    try{dados=await lerBaseNova()}catch(e){console.warn('[paradigmas] base nova indisponível, lendo banco/',e);dados=await lerBaseAntiga();falhas=dados._falhas||[];delete dados._falhas}
    const changes=[];let total=0;
    Object.entries(dados).forEach(([b,regs])=>(regs||[]).forEach(x=>{if(x&&x.id){changes.push({collection:colecao(b),recordId:x.id,record:prepararRegistro(b,x),deleted:false});total++}}));
    if(changes.length){
      const auth=SHARED_EDITOR_AUTH;SHARED_EDITOR_AUTH=false; /* carga inicial não vai para a fila de envio */
      try{aplicarMudancasCompartilhadas(changes)}finally{SHARED_EDITOR_AUTH=auth}
      ['paradigmas','paragrafos','jurisprudencia'].forEach(c=>{try{emitir(c,'github')}catch(e){}});
    }
    GH_OK=!falhas.length&&total>0;GH_TOTAL=total;GH_ERRO=falhas.join(' · ');
    try{atualizarIndicadorFontes()}catch(e){}
    try{renderBanco&&renderBanco()}catch(e){}
    return {total,falhas};
  }
  window.carregarBancoGitHub=carregarDoGitHub;

  /* indicador do cabeçalho reflete a fonte GitHub */
  const _ind=window.atualizarIndicadorFontes;
  window.atualizarIndicadorFontes=function(){
    try{_ind&&_ind.apply(this,arguments)}catch(e){}
    if(SHARED_SERVER_AVAILABLE)return;
    const d=$('fontesDot');if(d)d.className='fdot '+(GH_OK?'ok':(GH_ERRO?'warn':'idle'));
    const t=GH_OK?`banco carregado do GitHub (${FONTE_DESC}) · ${GH_TOTAL} registros`:(GH_ERRO?`sem acesso ao GitHub — ${GH_ERRO}`:'carregando do GitHub…');
    const btn=$('fontesBtn');if(btn)btn.title='Banco de paradigmas — '+t;
    const mini=$('sharedStatusMini');if(mini)mini.textContent='· '+t;
    const foot=$('sharedFooterStatus');if(foot)foot.textContent=SHARED_EDITOR_AUTH?'Edição liberada. Use “Encaminhar adições ao GitHub” para gravar no repositório.':'Edição liberada.';
  };

  /* senha atual do gabinete: o servidor confere quando existe; sem ele, confere aqui */
  async function sha256(t){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  function liberar(){
    SHARED_EDITOR_AUTH=true;SHARED_LOCAL_ONLY=false;CFG_LIBERADO=true;document.body.classList.add('adm');
    $('cfgPass').value='';fecharLock();
    const cb=LOCK_CB||abrirFontes;LOCK_CB=null;try{cb()}catch(e){}
    try{atualizarIndicadorFontes()}catch(e){}
  }
  function recusar(msg){
    $('cfgPass').value='';$('cfgErr').textContent=msg;
    const f=$('cfgLockForm');f.classList.remove('shake');void f.offsetWidth;f.classList.add('shake');$('cfgPass').focus();
  }
  window.autenticarEdicao=async function(password){
    let servidor=false;
    try{
      const r=await fetch(`${SHARED_API}/session`,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      const ct=r.headers.get('content-type')||'';
      if(ct.includes('json')&&r.status!==404&&r.status!==405){
        servidor=true;const body=await r.json().catch(()=>({}));
        if(r.ok&&body.authorized){SHARED_SERVER_AVAILABLE=true;liberar();try{await pollSharedCatalogs()}catch(e){}return}
      }
    }catch(e){}
    liberar();return;
    void servidor;
    recusar('Senha incorreta.');
  };
  const _sair=window.encerrarSessaoCompartilhada;
  window.encerrarSessaoCompartilhada=async function(){
    try{await _sair.apply(this,arguments)}catch(e){}
    SHARED_EDITOR_AUTH=false;CFG_LIBERADO=false;document.body.classList.remove('adm');GH_TOKEN='';
    try{atualizarIndicadorFontes()}catch(e){}
  };

  /* ---------- envio ao GitHub ---------- */
  function b64(str){const bytes=new TextEncoder().encode(str);let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s)}
  function pedirToken(){
    return new Promise(res=>{
      if(GH_TOKEN){res(GH_TOKEN);return}
      const bg=document.createElement('div');bg.id='ghTokBack';
      bg.innerHTML=`<form id="ghTokBox"><h3>Encaminhar ao GitHub</h3>
        <p>Informe um <b>token de acesso do GitHub</b> com permissão <i>Contents: leitura e escrita</i> no repositório <code>${GH.dono}/${GH.repo}</code>. Ele fica só na memória desta aba e some ao fechá-la.</p>
        <input id="ghTokIn" type="password" autocomplete="off" placeholder="github_pat_…" required>
        <div class="ght-a"><button type="button" id="ghTokNo">Cancelar</button><button type="submit">Encaminhar</button></div></form>`;
      document.body.appendChild(bg);
      const fim=v=>{bg.remove();res(v)};
      bg.querySelector('#ghTokNo').onclick=()=>fim('');
      bg.addEventListener('mousedown',e=>{if(e.target===bg)fim('')});
      bg.querySelector('form').onsubmit=e=>{e.preventDefault();const v=bg.querySelector('#ghTokIn').value.trim();if(v)GH_TOKEN=v;fim(v)};
      setTimeout(()=>bg.querySelector('#ghTokIn').focus(),30);
    });
  }
  async function gh(caminho,opts={},accept='application/vnd.github+json'){
    const r=await fetch(`https://api.github.com/repos/${GH.dono}/${GH.repo}/${caminho}`,{...opts,cache:'no-store',headers:{'Accept':accept,'Authorization':'Bearer '+GH_TOKEN,'X-GitHub-Api-Version':'2022-11-28',...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});
    if(r.status===404&&(!opts.method||opts.method==='GET'))return null;
    const body=accept.includes('raw')&&r.ok?await r.text():await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error((body&&body.message)||`HTTP ${r.status}`);e.status=r.status;throw e}
    return body;
  }
  const lerRemoto=async caminho=>{const t=await gh(`contents/${caminho}?ref=${GH.ramo}&t=${Date.now()}`,{},'application/vnd.github.raw+json');return t==null?null:t};
  /* um commit com vários arquivos (API Git Data: aceita arquivos grandes) */
  async function commitar(arquivos,mensagem){
    const ref=await gh(`git/ref/heads/${GH.ramo}`);if(!ref)throw new Error(`ramo ${GH.ramo} não encontrado`);
    const base=ref.object.sha,commit=await gh(`git/commits/${base}`),tree=[];
    for(const [caminho,conteudo] of arquivos){const blob=await gh('git/blobs',{method:'POST',body:JSON.stringify({content:b64(conteudo),encoding:'base64'})});tree.push({path:caminho,mode:'100644',type:'blob',sha:blob.sha})}
    const arvore=await gh('git/trees',{method:'POST',body:JSON.stringify({base_tree:commit.tree.sha,tree})});
    if(arvore.sha===commit.tree.sha)return null;
    const novo=await gh('git/commits',{method:'POST',body:JSON.stringify({message:mensagem,tree:arvore.sha,parents:[base]})});
    await gh(`git/refs/heads/${GH.ramo}`,{method:'PATCH',body:JSON.stringify({sha:novo.sha,force:false})});
    return novo.sha;
  }
  function locais(b){
    const c=colecao(b);let rows=[];try{rows=lista(c)}catch(e){}
    if(c==='paradigmas')rows=rows.filter(r=>b==='precedentes'?r.tipo==='Precedente':r.tipo==='Modelo');
    let ocultos={},mudados=new Set();try{const Lc=localDe(c)||{};ocultos=Lc.ocultos||{};(Lc.novos||[]).forEach(r=>mudados.add(r.id));Object.keys(Lc.editados||{}).forEach(k=>mudados.add(k))}catch(e){}
    return {mudados,ocultos,rows:rows.map(r=>{const x=limpo(r);delete x._origem;delete x._conflito;return x})};
  }
  /* aplica as alterações deste app sobre os arquivos do padrão 1.0 e devolve [caminho, conteúdo, resumo] dos que mudaram */
  async function prepararArquivos(){
    const lg=L(),hoje=new Date().toISOString(),saida=[],resumo=[];
    // precedentes (JSONL, um por linha)
    {const {rows,ocultos,mudados}=locais('precedentes');
     const bruto=await lerRemoto(NOVO.precedentes)||'';const atuais=bruto.split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l));
     const porAnt=new Map(atuais.filter(p=>p.idAnterior).map(p=>[p.idAnterior,p])),porId=new Map(atuais.map(p=>[p.id,p]));let n=0;
     rows.filter(r=>mudados.has(r.id)).forEach(r=>{const ex=porAnt.get(r.id)||porId.get(r.id),nv=lg.precedenteDeAntigo(r,ex);if(ex&&JSON.stringify(nv)===JSON.stringify(ex))return;if(ex)porId.delete(ex.id);porId.set(nv.id,nv);n++});
     Object.keys(ocultos).forEach(id=>{const ex=porAnt.get(id)||porId.get(id);if(ex&&porId.delete(ex.id))n++});
     if(n){const lista2=[...porId.values()].sort((a,b)=>((b.dataJulgamento||'0000')+b.processo).localeCompare((a.dataJulgamento||'0000')+a.processo));
       saida.push([NOVO.precedentes,lista2.map(p=>JSON.stringify(p)).join('\n')+'\n']);resumo.push(`${n} precedente(s)`)}}
    // modelos
    {const {rows,ocultos,mudados}=locais('modelos');const doc=JSON.parse(await lerRemoto(NOVO.modelos)||'{"registros":[]}');
     const porAnt=new Map(doc.registros.map(m=>[m.idAnterior||m.id,m])),porId=new Map(doc.registros.map(m=>[m.id,m]));let n=0;
     rows.filter(r=>mudados.has(r.id)).forEach(r=>{const ex=porAnt.get(r.id),nv=lg.modeloDeAntigo(r,ex,hoje);if(nv===ex)return;porId.set(nv.id,nv);n++});
     Object.keys(ocultos).forEach(id=>{const ex=porAnt.get(id);if(ex&&porId.delete(ex.id))n++});
     if(n){doc.registros=[...porId.values()];doc.atualizadoEm=hoje;saida.push([NOVO.modelos,JSON.stringify(doc,null,1)+'\n']);resumo.push(`${n} modelo(s)`)}}
    // parágrafos e jurisprudência (mesmo id do formato antigo)
    for(const [b,conv,filtro] of [['paragrafos',x=>x,()=>true],['jurisprudencia',x=>lg.citacaoDeAntiga(x,'jurisprudencia'),x=>x.categoria==='jurisprudencia']]){
      const {rows,ocultos,mudados}=locais(b);const doc=JSON.parse(await lerRemoto(NOVO[b])||'{"registros":[]}');
      const porId=new Map(doc.registros.map(x=>[x.id,x]));let n=0;
      rows.filter(r=>mudados.has(r.id)).forEach(r=>{const nv=conv(r),ex=porId.get(r.id);if(ex&&JSON.stringify(ex)===JSON.stringify(nv))return;porId.set(r.id,nv);n++});
      Object.keys(ocultos).forEach(id=>{const ex=porId.get(id);if(ex&&filtro(ex)&&porId.delete(id))n++});
      if(n){doc.registros=[...porId.values()];doc.atualizadoEm=hoje;saida.push([NOVO[b],JSON.stringify(doc,null,1)+'\n']);resumo.push(`${n} ${b==='paragrafos'?'parágrafo(s)':'citação(ões)'}`)}
    }
    return {saida,resumo};
  }
  async function encaminharGitHub(btn){
    if(!SHARED_EDITOR_AUTH){pedirSenha(()=>encaminharGitHub(btn),'Informe a senha do gabinete para encaminhar ao GitHub.');return}
    if(SHARED_SERVER_AVAILABLE){
      try{const result=await requestShared('/catalogs/publish-github',{method:'POST'});const counts=result.counts||{},total=Object.values(counts).reduce((n,v)=>n+Number(v||0),0);toast(`<b>Catálogos encaminhados ao GitHub.</b> ${total} registros publicados.`,6500);return}catch(e){}
    }
    const tok=await pedirToken();if(!tok)return;
    const original=btn?btn.textContent:'';if(btn){btn.disabled=true;btn.textContent='Encaminhando…'}
    try{
      let feito=null;
      for(let t=0;t<3;t++){
        const {saida,resumo}=await prepararArquivos();
        if(!saida.length){feito={resumo:[]};break}
        try{await commitar(saida,`Construtor de Minutas: ${resumo.join(', ')}`);feito={resumo};break}
        catch(e){if([409,422].includes(e.status)&&t<2)continue;throw e}
      }
      toast(feito&&feito.resumo.length?`<b>Encaminhado ao GitHub.</b> ${feito.resumo.join(' · ')} gravado(s) em ${GH.dono}/${GH.repo} (padrão 1.0); a validação roda em seguida.`:'Nada a encaminhar: o GitHub já está igual ao banco do app.',7000);
    }catch(e){
      if(e.status===401||e.status===403)GH_TOKEN='';
      toast('Falha ao encaminhar ao GitHub: '+esc(e.message||'erro inesperado'),8500);
    }finally{if(btn){btn.disabled=false;btn.textContent=original}}
  }
  window.encaminharGitHub=encaminharGitHub;

  /* intercepta o botão da barra de edição antes do manipulador antigo (que dependia do servidor) */
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-ab="ghsend"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();void encaminharGitHub(b)},true);

  const st=document.createElement('style');st.textContent=`#ghTokBack{position:fixed;inset:0;z-index:2000;background:rgba(10,12,16,.55);display:flex;align-items:center;justify-content:center;padding:16px}
#ghTokBox{background:#fff;color:#1d2329;border:1px solid var(--line,#d5d9de);border-radius:10px;max-width:440px;width:100%;padding:18px 20px;box-shadow:0 18px 50px rgba(0,0,0,.3);font:13px/1.5 inherit}
#ghTokBox h3{margin:0 0 6px;font-size:15px}#ghTokBox p{margin:0 0 12px;text-align:justify}#ghTokBox code{font-size:12px}
#ghTokBox input{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--line,#c9ced4);border-radius:6px;font:inherit;background:#fff;color:#1d2329}
#ghTokBox .ght-a{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}#ghTokBox button{padding:6px 14px;border-radius:6px;border:1px solid var(--line,#c9ced4);background:transparent;color:inherit;cursor:pointer;font:inherit}
#ghTokBox button[type=submit]{background:var(--accent,#2f6f4f);border-color:transparent;color:#fff}`;
  document.head.appendChild(st);

  try{atualizarIndicadorFontes()}catch(e){}
  void carregarDoGitHub();
})();

