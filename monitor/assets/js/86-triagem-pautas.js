/* Gestor CMT · Etapas 4/5 — espaço de trabalho para Triagem e Pautas.
   Camada de apresentação: não duplica o banco nem troca as funções do motor.
   Todas as operações utilizam as APIs existentes do motor e do CMTSessao. */
(function (W, D) {
  'use strict';
  if (W.CMTTrabalho || !W.CMTShell) return;
  const $ = (s, root = D) => root.querySelector(s);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const digits = value => String(value || '').replace(/\D/g, '');
  const cnj = value => {const x=digits(value);return x.length===20?x.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/,'$1-$2.$3.$4.$5.$6'):String(value||'');};
  const br = iso => /^\d{4}-\d{2}-\d{2}/.test(iso||'') ? iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4) : String(iso||'');
  const norm = value => String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const getMotor = () => $('#cmt-motor')?.contentWindow || null;
  const getCore = () => getMotor()?.__painelCentralComponent || null;
  const getSes = () => getMotor()?.CMTSessao || null;
  const fullSession = v => v?.date || v?.data || '';
  const settings = { mode:'', legacy:false, triFilter:'all', triQuery:'', triTake:70, triChecked:new Set(), triBox:'', triSess:'', triAdd:'', triWait:false,
    sessId:'', sessQuery:'', sessFilter:'all', sessTab:'lista', sessTake:90, sessBusy:false, lastSig:'' };
  let view=null, aside=null, toggle=null, lastNotify='';

  function msg(text, bad=false) {
    if (!text) return;
    const box=$('#cwt-toast'); if (!box) return;
    box.textContent=text; box.classList.toggle('bad',!!bad);box.hidden=false;
    clearTimeout(msg.timer);msg.timer=setTimeout(()=>{box.hidden=true;},5500);
    lastNotify=text;
  }
  function mount() {
    if (view) return;
    view=D.createElement('section');view.id='cwt-workspace';view.className='cwt';view.hidden=true;
    $('#main')?.prepend(view);
    aside=D.createElement('div');aside.id='cwt-aside';aside.className='cwt-aside';aside.hidden=true;
    $('#index')?.appendChild(aside);
    toggle=D.createElement('button');toggle.id='cwt-mode-toggle';toggle.type='button';toggle.className='chipbtn cwt-mode-toggle';toggle.hidden=true;
    toggle.addEventListener('click',()=> {if (settings.legacy) showDashboard(settings.mode);else showLegacy();});
    $('.bar .tools')?.prepend(toggle);
    const toast=D.createElement('div');toast.id='cwt-toast';toast.className='cwt-toast';toast.hidden=true;toast.setAttribute('role','status');D.body.appendChild(toast);
    view.addEventListener('click',click);
    view.addEventListener('change',change);
    view.addEventListener('input',input);
    aside.addEventListener('click',click);
    aside.addEventListener('change',change);
  }
  function syncTab() {
    const navActive=D.querySelector('nav.mods .mod.on[data-cmt]');
    const navMode=D.body.classList.contains('cmt-modo') ? navActive?.dataset.cmt : '';
    const next=navMode==='triagem'||navMode==='pautas'?navMode:'';
    if (next && (settings.mode!==next || !settings.mode)) {
      settings.mode=next;settings.legacy=false;settings.lastSig='';
      showDashboard(next);
    } else if (!next && settings.mode) {
      settings.mode='';settings.legacy=false;settings.lastSig='';
      D.body.classList.remove('cmt-workdesk','cmt-pautas');$('#index')?.style.removeProperty('display');view.hidden=true;aside.hidden=true;toggle.hidden=true;
    }
  }
  function showDashboard(mode) {
    settings.mode=mode;settings.legacy=false;settings.lastSig='';
    D.body.classList.add('cmt-workdesk');
    const index=$('#index');if(index)index.style.setProperty('display','block','important');
    view.hidden=false;aside.hidden=false;toggle.hidden=false;
    toggle.textContent='Abrir editor completo';toggle.setAttribute('aria-label','Abrir as ferramentas completas do motor');
    render();
  }
  function showLegacy(action) {
    settings.legacy=true;
    D.body.classList.remove('cmt-workdesk','cmt-pautas');$('#index')?.style.removeProperty('display');view.hidden=true;aside.hidden=true;
    toggle.hidden=false;toggle.textContent='Voltar ao painel de trabalho';
    const w=getMotor(),s=getSes();
    try {
      if (action==='acervo') {W.CMTShell.entrar('central'); return;}
      if (action==='triagem') w?.CMTMotor?.ir('triagem');
      else if (action==='sessoes') s?.abrir('sessoes');
      else if (action==='marcos') s?.abrir('marcos');
      else if (action==='regras') s?.abrir('desig');
      else if (action==='equipe') W.CMTShell.entrar('equipe');
      else if (action==='designar') {
        const ss=selectedSession();if (!ss) return;
        s?.abrirSessao(ss.id,(ss.itens||[]).length?'pos':'pre');
        const b=w?.document?.querySelector('[data-cs="designar"]');
        if (b) b.click(); else msg('Abra “Prévia da designação” na planilha da sessão.');
      }
      else if (action==='pre' || action==='pos') {const ss=selectedSession();if (ss) s?.abrirSessao(ss.id,action==='pos'&&!(ss.itens||[]).length?'pre':action);}
      else if (settings.mode==='triagem') w?.CMTMotor?.ir('triagem');
      else s?.abrir('sessoes');
    } catch(e) {msg('Não foi possível abrir a ferramenta: '+e.message,true);}
  }
  function rows() {const c=getCore();return Array.isArray(c?.rows)?c.rows:[];}
  function uniqueRows() {const seen=new Set();return rows().filter(r=>{const id=digits(r.Processo||r.processo);if(!id || seen.has(id))return false;seen.add(id);return true;});}
  function isTriageRow(r,w) {
    const id=digits(r.Processo||r.processo);
    let virtual=false;
    try {virtual=!!w?.__cmtEscFixo?.(r) || !!w?.__cmtVirtual?.has?.(id);}catch(_){/* optional */}
    return !!String(r._triagem||'').trim()||!!r._escaninho||virtual;
  }
  function triData() {
    const w=getMotor(),c=getCore(),all=uniqueRows(),tri=all.filter(r=>isTriageRow(r,w));
    const boxes=Array.isArray(c?.escaninhos)?c.escaninhos:[];
    const boxCounts=new Map(boxes.map(e=>[e.id,0]));
    tri.forEach(r=>{const id=String(r._escaninho||'');if(boxCounts.has(id))boxCounts.set(id,boxCounts.get(id)+1);});
    const pre=all.filter(r=>r['Seleção Prévia']==='SELECIONADO PREVIAMENTE');
    const preIds=new Set(pre.map(r=>digits(r.Processo||r.processo)));
    const tray=tri.filter(r=>!r._escaninho);
    const f=settings.triFilter;
    let filtered=f==='pre'?pre:f==='tray'?tray:f.startsWith('box:')?tri.filter(r=>r._escaninho===f.slice(4)):tri;
    const q=norm(settings.triQuery.trim());
    if(q)filtered=filtered.filter(r=>norm([r.Processo,r.processo,r.Assunto,r.assunto_judicial,r.Classe,r.classe_judicial,r.tarefa_atual,r.Polo_Ativo,r.Polo_Passivo,r.polo_ativo,r.polo_passivo,r.Etiquetas,r.Tema].join(' ')).includes(q));
    return {w,c,all,tri,tray,boxes,boxCounts,pre,preIds,filtered};
  }
  function sessionData(){return (getSes()?.estado()?.sessoes||[]).slice().sort((a,b)=>(a.data||'').localeCompare(b.data||''));}
  function selectedSession(){const list=sessionData();if(!list.length)return null;const chosen=list.find(x=>x.id===settings.sessId);if(chosen)return chosen;const today=new Date().toISOString().slice(0,10);return list.find(x=>x.data>=today)||list[list.length-1];}
  function sesInfo(ss) {
    const s=getSes();const isOfficial=(ss.itens||[]).length>0;
    let lines=[];try {lines=s?.linhas?.(ss.id,isOfficial?'pos':'pre')||[];} catch(e) {console.warn('[CMT trabalho] Leitura da sessão:',e);}
    const total=lines.length, unassigned=lines.filter(x=>!x.servidor).length, unrevised=lines.filter(x=>!x.corretor).length,
      pendingDraft=lines.filter(x=>!x.dataMinuta).length, pendingReview=lines.filter(x=>x.dataMinuta&&!x.dataCorrecao).length,
      pendingRelease=lines.filter(x=>x.dataCorrecao&&!x.dataLiberacao).length, released=lines.filter(x=>!!x.dataLiberacao).length;
    return {lines,total,unassigned,unrevised,pendingDraft,pendingReview,pendingRelease,released,isOfficial};
  }
  function navButton(key,label,n,active,kind='') {return `<button type="button" class="cwt-navitem ${active?'on':''}" data-cwt-filter="${esc(key)}"><span class="cwt-nav-icon ${kind}"></span><span>${esc(label)}</span><b>${n}</b></button>`;}
  function renderAside(data){
    const isTri=settings.mode==='triagem';
    let html=`<div class="cwt-side-title">${isTri?'TRIAGEM':'PAUTAS DE JULGAMENTO'}</div>`;
    if(isTri){
      html+=`<div class="cwt-sidenav"><div class="cwt-side-k">FLUXO</div>
      ${navButton('all','Em triagem',data.tri.length,settings.triFilter==='all','blue')}
      ${navButton('tray','Bandeja',data.tray.length,settings.triFilter==='tray','orange')}
      ${navButton('pre','PAUTA PRÉVIA',data.pre.length,settings.triFilter==='pre','green')}
      <div class="cwt-side-k">ESCANINHOS <button type="button" data-cwt="legacy-triagem" title="Gerenciar escaninhos no editor completo">Editar</button></div>
      ${data.boxes.map(e=>navButton('box:'+e.id,e.titulo||'Sem título',data.boxCounts.get(e.id)||0,settings.triFilter==='box:'+e.id)).join('')}
      ${!data.boxes.length?'<p class="cwt-side-empty">Nenhum escaninho cadastrado.</p>':''}
      </div><div class="cwt-side-foot"><button data-cwt="base">Base do Acervo</button><button data-cwt="legacy-triagem">Triagem completa</button></div>`;
    }else{
      const list=sessionData(),today=new Date().toISOString().slice(0,10);
      html+=`<div class="cwt-sidenav"><div class="cwt-side-k">PRÓXIMAS SESSÕES</div>${list.filter(x=>x.data>=today).map(x=>sessionNav(x)).join('')||'<p class="cwt-side-empty">Nenhuma sessão futura.</p>'}
      <div class="cwt-side-k">ANTERIORES</div>${list.filter(x=>x.data<today).slice(-10).reverse().map(x=>sessionNav(x)).join('')||'<p class="cwt-side-empty">Nenhuma sessão anterior.</p>'}</div>
      <div class="cwt-side-foot"><button data-cwt="sessions">Gerenciar sessões</button><button data-cwt="rules">Regras de designação</button></div>`;
    }
    aside.innerHTML=html;
  }
  function sessionNav(ss){const on=selectedSession()?.id===ss.id;const total=(ss.itens||[]).length;const pre=(ss.previa||[]).length;return `<button class="cwt-sessionnav ${on?'on':''}" data-cwt-ses="${esc(ss.id)}"><strong>${esc(br(ss.data))}</strong><span>${total?total+' itens de pauta':pre?pre+' em pré-pauta':'Sem pauta'}</span></button>`;}
  function tag(text,variant=''){return `<span class="cwt-tag ${variant}">${esc(text)}</span>`;}
  function rowInfo(r){return {id:digits(r.Processo||r.processo),p:cnj(r.Processo||r.processo),classe:String(r.classe_judicial||r.Classe||'').trim(),assunto:String(r.Assunto||r.assunto_judicial||r.Assunto_Principal||'').trim(),partes:String(r.Polo_Ativo||r.polo_ativo||'').trim(),tarefa:String(r.tarefa_atual||'').trim()};}
  function triCards(d){
    const entries=[['all','Em triagem',d.tri.length,'processos sob análise'],['tray','Na bandeja',d.tray.length,'aguardando destino'],['pre','Pauta prévia',d.pre.length,'selecionados para sessão'],['box-count','Escaninhos',d.boxes.length,'pastas disponíveis']];
    return `<div class="cwt-statgrid">${entries.map(([key,t,n,sub])=>`<button class="cwt-stat" data-cwt="${key==='box-count'?'legacy-triagem':'filter'}" data-cwt-val="${key}"><span>${t}</span><strong>${n}</strong><small>${sub}</small></button>`).join('')}</div>`;
  }
  function selectionBar(d){
    const options=d.boxes.map(b=>`<option value="${esc(b.id)}" ${settings.triBox===b.id?'selected':''}>${esc(b.titulo)}</option>`).join('');
    const c=d.c,ses=(c?.upcomingSessions?.()||[]);
    if(!settings.triSess||!ses.includes(settings.triSess))settings.triSess=ses[0]||'';
    return `<div class="cwt-action-panel"><div class="cwt-action-h"><span>Selecionados: <b id="cwt-selected">${settings.triChecked.size}</b></span><button data-cwt="clear-selection">Limpar seleção</button></div>
      <div class="cwt-action-line"><label for="cwt-box">Mover para escaninho</label><select id="cwt-box" data-cwt-change="box"><option value="">Selecione…</option>${options}</select><button class="cwt-primary" data-cwt="move-box" ${!d.boxes.length?'disabled':''}>Mover</button></div>
      <div class="cwt-action-line"><label for="cwt-session">Enviar à pré-pauta</label><select id="cwt-session" data-cwt-change="tri-session"><option value="">Selecione…</option>${ses.map(v=>`<option value="${esc(v)}" ${v===settings.triSess?'selected':''}>${esc(v)}</option>`).join('')}</select><button class="cwt-primary" data-cwt="send-pre" ${!ses.length?'disabled':''}>Enviar</button></div>
      <button class="cwt-lightdanger" data-cwt="remove-tri">Retirar da triagem</button>
      <p>As ações usam o mesmo cadastro de processos, escaninhos e seleção prévia do motor.</p></div>`;
  }
  function renderTriagem(){
    const d=triData(),healthy=!!d.c;
    if(settings.triChecked.size) {const ids=new Set(d.all.map(r=>digits(r.Processo||r.processo)));[...settings.triChecked].forEach(id=>{if(!ids.has(id))settings.triChecked.delete(id);});}
    renderAside(d);
    view.innerHTML=`<div class="cwt-head"><div><div class="cwt-eyebrow">GESTOR DE ACERVO / TRIAGEM</div><h1>Triagem de processos</h1><p>Classificação, escaninhos e pré-pauta sobre o cadastro único do gabinete.</p></div><div class="cwt-head-actions"><button data-cwt="refresh">Atualizar vista</button><button data-cwt="sync">Consultar repositório</button><button data-cwt="legacy-triagem" class="cwt-primary">Abrir triagem completa</button></div></div>
      ${triCards(d)}<div class="cwt-columns"><div class="cwt-maincard"><div class="cwt-section-title"><div><h2>Fila de processos</h2><span id="cwt-tri-count">${d.filtered.length} registros no filtro</span></div><button data-cwt="tri-export">Exportar CSV</button></div>
      <div class="cwt-filters"><input type="search" id="cwt-tri-search" data-cwt-input="tri" placeholder="Buscar CNJ, assunto, partes, tarefa, etiquetas…" value="${esc(settings.triQuery)}" aria-label="Buscar processos na triagem"><button data-cwt="reset-tri">Limpar filtros</button></div>
      <div class="cwt-rowheads"><label><input type="checkbox" data-cwt-change="select-all" ${d.filtered.length&&d.filtered.slice(0,settings.triTake).every(r=>settings.triChecked.has(digits(r.Processo||r.processo)))?'checked':''} aria-label="Selecionar processos visíveis"> Selecionar visíveis</label><span>Processo / situação</span><span>Etapa</span></div><div id="cwt-tri-results">${triRows(d)}</div></div>
      <div class="cwt-context"><section class="cwt-sidecard"><h2>Ações em lote</h2>${selectionBar(d)}</section>
        <section class="cwt-sidecard"><h2>Incluir do Acervo Central</h2><p>Digite um CNJ já existente no acervo para encaminhá-lo à triagem.</p><input id="cwt-add-cnj" data-cwt-input="add" inputmode="numeric" placeholder="0000000-00.0000.4.03.0000" value="${esc(settings.triAdd)}"><button data-cwt="add-tri" class="cwt-primary">Encaminhar processo</button></section>
        <section class="cwt-sidecard cwt-assist"><h2>Fluxo preservado</h2><p>A classificação detalhada, a edição de etiquetas, a ordenação e o prontuário continuam acessíveis no editor completo.</p><button data-cwt="legacy-triagem">Gerenciar escaninhos e etiquetas</button><button data-cwt="base">Importar / Atualizar base</button></section></div></div>
      ${!healthy?'<p class="cwt-hint">O motor de acervo ainda não está disponível. Verifique a carga do documento e tente novamente.</p>':''}`;
  }
  function triRows(d){
    const sample=d.filtered.slice(0,settings.triTake);
    if(!sample.length)return `<div class="cwt-empty"><div class="cwt-empty-symbol">⌁</div><strong>${d.all.length?'Nenhum processo neste filtro':'O acervo ainda não foi carregado'}</strong><p>${d.all.length?'Ajuste a busca ou selecione outra pasta.':'Conecte o procs-muta na Base do Acervo para consultar os processos reais.'}</p><button data-cwt="${d.all.length?'reset-tri':'base'}">${d.all.length?'Ver todos':'Abrir Base do Acervo'}</button></div>`;
    return sample.map(r=>{
      const t=rowInfo(r),p=d.preIds.has(t.id),b=d.boxes.find(x=>x.id===r._escaninho);
      return `<article class="cwt-process"><label class="cwt-check"><input type="checkbox" data-cwt-change="check" value="${esc(t.id)}" ${settings.triChecked.has(t.id)?'checked':''} aria-label="Selecionar ${esc(t.p)}"></label>
      <div class="cwt-process-body"><div class="cwt-process-top"><button data-cwt="ficha" data-p="${esc(t.id)}" class="cwt-cnj">${esc(t.p)}</button>${tag(t.classe||'Classe não informada','muted')}${p?tag('PRÉ-PAUTA','green'):''}</div><p>${esc(t.assunto||'Assunto não informado')}</p><small>${esc(t.partes||'Partes não informadas')}</small><div class="cwt-process-tags">${t.tarefa?tag(t.tarefa,'muted'):''}${r.prioridade?tag('Prioridade','orange'):''}</div></div>
      <div class="cwt-stage">${tag(b?.titulo||(p?'Pré-pauta':'Bandeja'),b?'blue':p?'green':'orange')}<button data-cwt="ficha" data-p="${esc(t.id)}">Abrir ficha</button></div></article>`;
    }).join('')+(d.filtered.length>settings.triTake?`<div class="cwt-loadmore"><button data-cwt="tri-more">Mostrar mais ${Math.min(70,d.filtered.length-settings.triTake)} de ${d.filtered.length-settings.triTake} restantes</button></div>`:'');
  }
  function renderTriList(){const d=triData();const el=$('#cwt-tri-results');if(el)el.innerHTML=triRows(d);const count=$('#cwt-tri-count');if(count)count.textContent=d.filtered.length+' registros no filtro';const sel=$('#cwt-selected');if(sel)sel.textContent=settings.triChecked.size;const all=$('[data-cwt-change="select-all"]');if(all)all.checked=d.filtered.length>0&&d.filtered.slice(0,settings.triTake).every(r=>settings.triChecked.has(digits(r.Processo||r.processo)));}
  function renderPautas(){
    if(W.CMTEsteira){const ss=selectedSession();settings.sessId=ss?.id||'';renderAside();W.CMTEsteira.render({view,settings,getMotor,getCore,getSes,sessionData,selectedSession,sesInfo,openFicha,showLegacy,msg,render,esc,br,cnj,digits,norm});return;}
    const list=sessionData(),ss=selectedSession(),info=ss?sesInfo(ss):null;
    settings.sessId=ss?.id||'';
    renderAside();
    const selector=`<label class="cwt-select-label" for="cwt-select-session">Sessão de julgamento<select id="cwt-select-session" data-cwt-change="session">${list.map(x=>`<option value="${esc(x.id)}" ${x.id===ss?.id?'selected':''}>${esc(br(x.data))} · ${(x.itens||[]).length?'Pauta definitiva':'Pré-pauta'}</option>`).join('')}</select></label>`;
    view.innerHTML=`<div class="cwt-head"><div><div class="cwt-eyebrow">GESTOR DO GABINETE / PAUTAS</div><h1>Pautas de julgamento</h1><p>Sessões, entregas, designações e marcos — com a lista operacional em primeiro plano.</p></div><div class="cwt-head-actions"><button data-cwt="refresh">Atualizar vista</button><button data-cwt="sessions">Gerenciar sessões</button><button data-cwt="marcos" class="cwt-primary">Calendário e marcos</button></div></div>
      <div class="cwt-sessionbar">${list.length?selector:'<div><b>Nenhuma sessão cadastrada</b><p>Cadastre a data do julgamento para iniciar a pré-pauta.</p></div>'}<button data-cwt="create-session">+ Criar sessão</button><button data-cwt="import-pdf" ${ss?'':'disabled'}>Importar PDF da pauta</button><input type="file" id="cwt-pdf-file" accept=".pdf,application/pdf" hidden></div>
      ${ss?renderSessionBody(ss,info):`<div class="cwt-empty cwt-sessionempty"><div class="cwt-empty-symbol">▦</div><strong>Comece pelo calendário de sessões</strong><p>Ao cadastrar uma sessão, você poderá formar a pré-pauta, importar o resumo em PDF e designar minutas e correções. A importação do PDF não cria uma sessão duplicada.</p><button data-cwt="create-session" class="cwt-primary">Cadastrar sessão</button></div>`}`;
  }
  function renderSessionBody(ss,info){
    const all=info.lines;
    const filters=[['all','Todos'],['minutar','A minutar'],['corrigir','A corrigir'],['liberar','A liberar'],['sem-servidor','Sem servidor'],['sem-corretor','Sem corretor']];
    const stage=info.isOfficial?'Pauta definitiva':'Pré-pauta · aguardando PDF';
    return `<div class="cwt-session-summary"><div class="cwt-session-name"><span class="cwt-kicker">SESSÃO DE ${esc(br(ss.data))}</span><h2>${esc(stage)}</h2><p>${info.isOfficial?'Itens provenientes da pauta oficial importada.':'A pré-pauta é uma lista de trabalho. Os itens definitivos somente entram após a importação do PDF de resumo da pauta.'}</p></div>
      <div class="cwt-session-actions"><button data-cwt="open-pre" ${info.isOfficial?'disabled title="A pauta definitiva já foi importada"':''}>Pré-pauta</button><button data-cwt="open-pos" class="cwt-primary">${info.isOfficial?'Abrir pauta oficial':'Abrir planilha preliminar'}</button><button data-cwt="designar">Designar / corrigir</button><button data-cwt="rules">Regras desta sessão</button></div></div>
      <div class="cwt-statgrid cwt-sessionstats">${[['Total de processos',info.total,'Itens na sessão'],['A minutar',info.pendingDraft,'Minutas pendentes'],['A corrigir',info.pendingReview,'Minutados, não corrigidos'],['A liberar',info.pendingRelease,'Corrigidos, não liberados'],['Liberados',info.released,'Entrega concluída']].map(([n,v,t])=>`<div class="cwt-stat" role="status"><span>${n}</span><strong>${v}</strong><small>${t}</small></div>`).join('')}</div>
      <div class="cwt-columns cwt-pautacols"><div class="cwt-maincard"><div class="cwt-section-title"><div><h2>Relação de processos</h2><span id="cwt-ses-count">${info.total} processos</span></div><button data-cwt="open-pos">Editar planilha completa</button></div>
      <div class="cwt-filters"><input id="cwt-ses-search" type="search" data-cwt-input="session-search" placeholder="Buscar CNJ, assunto, servidor, corretor…" value="${esc(settings.sessQuery)}" aria-label="Buscar processos da sessão"><div class="cwt-chips">${filters.map(([k,n])=>`<button data-cwt="session-filter" data-cwt-val="${k}" class="${settings.sessFilter===k?'on':''}">${n}</button>`).join('')}</div></div>
      <div class="cwt-ses-table-wrap"><table class="cwt-ses-table"><thead><tr><th>Item / Processo</th><th>Assunto</th><th>Servidor</th><th>Corretor</th><th>Situação</th><th>Ficha</th></tr></thead><tbody id="cwt-ses-results">${sessionRows(info)}</tbody></table></div>
      </div><div class="cwt-context"><section class="cwt-sidecard"><h2>Marcos da sessão</h2>${stageDates(ss)}<button data-cwt="marcos">Editar marcos</button></section>
      <section class="cwt-sidecard"><h2>Distribuição</h2><div class="cwt-distrib"><div><span>Sem servidor</span><b>${info.unassigned}</b></div><div><span>Sem corretor</span><b>${info.unrevised}</b></div></div><p>As regras gerais podem ser adaptadas apenas para esta sessão, sem interferir nas demais.</p><button data-cwt="designar" class="cwt-primary">Prévia da designação</button><button data-cwt="rules">Regras da sessão</button></section>
      <section class="cwt-sidecard"><h2>Publicação e dados</h2><p>O resumo em PDF fixa a pauta; as informações de minuta, correção, liberação e histórico permanecem vinculadas à sessão.</p><button data-cwt="import-pdf">Importar resumo da pauta</button><button data-cwt="sessions">Gerenciar publicações</button><button data-cwt="base">Atualizar dados do acervo</button></section></div></div>`;
  }
  function stageDates(ss){const phases=[['pauta','Peço-dia / inclusão'],['inicio','Preparação'],['minutas','Entrega das minutas'],['liberacao','Liberação dos votos']];return `<ol class="cwt-dates">${phases.map(([k,l])=>`<li><span>${l}</span><b>${esc(br((ss.fases||{})[k])||'A definir')}</b></li>`).join('')}<li><span>Julgamento</span><b>${esc(br(ss.data))}</b></li></ol>`;}
  function sessionFilter(lines){const q=norm(settings.sessQuery.trim());return lines.filter(x=>{
    if(settings.sessFilter==='minutar'&&x.dataMinuta)return false;
    if(settings.sessFilter==='corrigir'&&(!x.dataMinuta||x.dataCorrecao))return false;
    if(settings.sessFilter==='liberar'&&(!x.dataCorrecao||x.dataLiberacao))return false;
    if(settings.sessFilter==='sem-servidor'&&x.servidor)return false;
    if(settings.sessFilter==='sem-corretor'&&x.corretor)return false;
    return !q||norm([x.cnj,x.assunto,x.servidor,x.corretor,x.item,x.classe,x.secao].join(' ')).includes(q);
  });}
  function sessionRows(info){const l=sessionFilter(info.lines),sample=l.slice(0,settings.sessTake);
    if(!l.length)return '<tr><td colspan="6"><div class="cwt-empty mini"><strong>Nenhum processo neste filtro</strong><p>O vínculo da sessão com o acervo é mantido. Ajuste os filtros ou confira a pré-pauta.</p></div></td></tr>';
    return sample.map(x=>{
      let sit=x.dataLiberacao?'Liberado':x.dataCorrecao?'A liberar':x.dataMinuta?'A corrigir':'A minutar';
      return `<tr><td class="cwt-ses-proc"><span class="cwt-num">${esc(x.item||'—')}</span><button class="cwt-cnj" data-cwt="ficha" data-p="${esc(digits(x.cnj))}">${esc(cnj(x.cnj))}</button><small>${esc(x.classe||'')}</small></td><td class="cwt-assunto">${esc(x.assunto||'—')}<small>${esc(x.secao||'')}</small></td><td>${esc(x.servidor||'—')}</td><td>${esc(x.corretor||'—')}</td><td>${tag(sit,sit==='Liberado'?'green':sit==='A minutar'?'orange':'blue')}</td><td><button class="cwt-row-action" data-cwt="ficha" data-p="${esc(digits(x.cnj))}">Abrir</button></td></tr>`;
    }).join('')+(l.length>settings.sessTake?`<tr><td colspan="6"><div class="cwt-loadmore"><button data-cwt="ses-more">Mostrar mais ${Math.min(80,l.length-settings.sessTake)} processos</button></div></td></tr>`:'');
  }
  function renderSessionList(){const ss=selectedSession();if(!ss)return;const info=sesInfo(ss);const el=$('#cwt-ses-results');if(el)el.innerHTML=sessionRows(info);const count=$('#cwt-ses-count');if(count)count.textContent=sessionFilter(info.lines).length+' de '+info.lines.length+' processos';$('.cwt-chips')?.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.cwtVal===settings.sessFilter));}
  function render(){if(!settings.mode||settings.legacy){D.body.classList.remove('cmt-pautas');return;}mount();D.body.classList.toggle('cmt-pautas',settings.mode==='pautas');$('#index')?.style.setProperty('display',settings.mode==='pautas'?'none':'block','important');if(settings.mode==='triagem')renderTriagem();else renderPautas();}
  function openFicha(p){if(digits(p).length!==20){msg('Número CNJ inválido para abrir a ficha.',true);return;}try {if(W.CMTProntuario?.abrir){W.CMTProntuario.abrir(p,settings.mode==='triagem'?triData().filtered.map(r=>digits(r.Processo||r.processo)):sesInfo(selectedSession()).lines.map(x=>digits(x.cnj)));} else msg('O módulo de ficha ainda não foi carregado.',true);}catch(e){msg('Falha ao abrir a ficha: '+e.message,true);}}
  function downloadCsv(list){const fields=['Processo','Classe','Assunto','Tarefa','Escaninho','Selecionado para sessão'];const value=(r,k)=>k==='Processo'?cnj(r.Processo||r.processo):k==='Classe'?r.classe_judicial||r.Classe||'':k==='Assunto'?r.Assunto||r.assunto_judicial||'':k==='Tarefa'?r.tarefa_atual||'':k==='Escaninho'?r._escaninho||'':r['Sessão Destino']||'';
    const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const text='\ufeff'+[fields,...list.map(r=>fields.map(k=>value(r,k)))].map(row=>row.map(cell).join(';')).join('\r\n');const a=D.createElement('a'),u=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.href=u;a.download='triagem-cmt-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);msg(`${list.length} registro(s) exportado(s).`);}
  async function sync(){const w=getMotor();const s=w?.CMTAcervoDados;if(!s?.puxar){msg('O serviço de sincronização ainda não está disponível.',true);return;}try{msg('Consultando o repositório…');await s.puxar(false);render();msg('Consulta concluída. Confira os dados na base.');}catch(e){msg('Falha ao consultar: '+e.message,true);}}
  function onSelected(){const d=triData();return d.all.filter(r=>settings.triChecked.has(digits(r.Processo||r.processo)));}
  function click(ev){const b=ev.target.closest?.('[data-cwt],[data-cwt-filter],[data-cwt-ses]');if(!b)return;ev.preventDefault();
    if(b.dataset.cwtFilter){settings.triFilter=b.dataset.cwtFilter;settings.triTake=70;render();return;}
    if(b.dataset.cwtSes){settings.sessId=b.dataset.cwtSes;settings.sessQuery='';settings.sessFilter='all';settings.sessTake=90;render();if(scrollY>240)scrollTo({top:0,behavior:'smooth'});return;}
    const cmd=b.dataset.cwt;
    if(cmd==='filter'){settings.triFilter=b.dataset.cwtVal;render();}
    else if(cmd==='refresh'){render();msg('Vista atualizada com os dados já carregados.');}
    else if(cmd==='reset-tri'){settings.triFilter='all';settings.triQuery='';settings.triTake=70;render();}
    else if(cmd==='clear-selection'){settings.triChecked.clear();renderTriList();}
    else if(cmd==='tri-more'){settings.triTake+=70;renderTriList();}
    else if(cmd==='ses-more'){settings.sessTake+=80;renderSessionList();}
    else if(cmd==='ficha')openFicha(b.dataset.p);
    else if(cmd==='legacy-triagem')showLegacy('triagem');
    else if(cmd==='sessions')showLegacy('sessoes');
    else if(cmd==='marcos')showLegacy('marcos');
    else if(cmd==='rules')showLegacy('regras');
    else if(cmd==='open-pre')showLegacy('pre');
    else if(cmd==='open-pos')showLegacy('pos');
    else if(cmd==='designar')showLegacy('designar');
    else if(cmd==='base'){try{W.CMTBaseAcervoV2?.abrir('situacao');}catch(e){msg(e.message,true);}}
    else if(cmd==='sync')sync();
    else if(cmd==='tri-export')downloadCsv(triData().filtered);
    else if(cmd==='session-filter'){settings.sessFilter=b.dataset.cwtVal;settings.sessTake=90;renderSessionList();}
    else if(cmd==='move-box'){const c=getCore(),sel=onSelected();if(!sel.length){msg('Selecione os processos que deseja mover.',true);return;}if(!settings.triBox){msg('Escolha um escaninho de destino.',true);return;}if(!c?.triGuardar){msg('Triagem ainda não está pronta.',true);return;}const eligible=sel.filter(r=>!!r._triagem);if(!eligible.length){msg('Somente processos já encaminhados à triagem podem mudar de escaninho.',true);return;}c.triGuardar(eligible.map(r=>digits(r.Processo||r.processo)),settings.triBox);settings.triChecked.clear();render();msg(`${eligible.length} processo(s) encaminhado(s) ao escaninho.`);}
    else if(cmd==='send-pre'){const c=getCore(),sel=onSelected();if(!sel.length){msg('Selecione os processos para a pré-pauta.',true);return;}if(!settings.triSess){msg('Selecione uma sessão de destino.',true);return;}if(!c?.triParaSelecao){msg('Serviço de pré-pauta indisponível.',true);return;}c.triParaSelecao(sel.map(r=>digits(r.Processo||r.processo)),settings.triSess);settings.triChecked.clear();render();msg('Seleção prévia atualizada no cadastro do gabinete.');}
    else if(cmd==='remove-tri'){const c=getCore(),selected=onSelected();if(!selected.some(r=>r._triagem)){msg('Selecione ao menos um processo ativo na triagem.',true);return;}if(!W.confirm(`Retirar ${selected.length} processo(s) da Triagem? Eles permanecerão no Acervo Central.`))return;selected.filter(r=>r._triagem).forEach(r=>{r._triagem='';r._escaninho='';});c?.saveDB?.();c?.refresh?.();settings.triChecked.clear();render();msg(`${selected.length} processo(s) retirado(s) da triagem.`);}
    else if(cmd==='add-tri'){const c=getCore(),id=digits(settings.triAdd),r=rows().find(x=>digits(x.Processo||x.processo)===id);if(id.length!==20||!r){msg('O processo não consta no acervo. Primeiro atualize/importe a base.',true);return;}if(isTriageRow(r,getMotor())){msg('O processo já está na triagem.');return;}const orig=c?.selected;c.selected=new Set([id]);try{c.sendToTriagem();}finally{c.selected=orig;}settings.triAdd='';settings.triFilter='all';render();msg('Processo encaminhado à Triagem.');}
    else if(cmd==='import-pdf'){$('#cwt-pdf-file')?.click();}
    else if(cmd==='create-session'){const date=W.prompt('Data do julgamento (AAAA-MM-DD):',new Date().toISOString().slice(0,10));if(date===null)return;const ses=getSes();if(!ses?.novaSessao){msg('Serviço de sessões indisponível.',true);return;}const result=ses.novaSessao(date.trim());if(result.erro){msg(result.erro,true);return;}settings.sessId=result.id;render();msg('Sessão cadastrada. Configure seus marcos antes de importar a pauta.');}
  }
  function input(ev){const attr=ev.target.dataset.cwtInput;if(attr==='tri'){settings.triQuery=ev.target.value;settings.triTake=70;renderTriList();}else if(attr==='add')settings.triAdd=ev.target.value;else if(attr==='session-search'){settings.sessQuery=ev.target.value;settings.sessTake=90;renderSessionList();}}
  function change(ev){const kind=ev.target.dataset.cwtChange;
    if(kind==='box')settings.triBox=ev.target.value;
    else if(kind==='tri-session')settings.triSess=ev.target.value;
    else if(kind==='session'){settings.sessId=ev.target.value;settings.sessQuery='';settings.sessFilter='all';render();}
    else if(kind==='check'){ev.target.checked?settings.triChecked.add(ev.target.value):settings.triChecked.delete(ev.target.value);const label=$('#cwt-selected');if(label)label.textContent=settings.triChecked.size;}
    else if(kind==='select-all'){const d=triData();d.filtered.slice(0,settings.triTake).forEach(r=>{const id=digits(r.Processo||r.processo);ev.target.checked?settings.triChecked.add(id):settings.triChecked.delete(id);});renderTriList();}
    if(ev.target.id==='cwt-pdf-file'&&ev.target.files?.length){const file=ev.target.files[0],ss=selectedSession(),svc=getSes();ev.target.value='';if(!ss||!svc?.importar){msg('Selecione uma sessão existente antes de importar.',true);return;}settings.sessBusy=true;msg('Importando resumo da pauta…');Promise.resolve(svc.importar(file,ss.id)).then((r)=>{settings.sessBusy=false;if(r&&r.ok){if(r.id)settings.sessId=r.id;render();msg(r.n+' processos importados na sessão de '+br(r.data)+(r.fora?' · '+r.fora+' fora do acervo':'')+'.');}else{render();msg((r&&r.erro)||'O PDF não trouxe itens da pauta.',!(r&&r.cancelado));}}).catch(e=>{settings.sessBusy=false;msg('Importação não concluída: '+e.message,true);});}
  }
  mount();
  let timer=null;
  const ob=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(syncTab,0);});
  ob.observe(D.body,{attributes:true,attributeFilter:['data-mod','class']});
  const nav=D.querySelector('nav.mods');if(nav)ob.observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
  syncTab();
  W.addEventListener('focus',()=>{if(settings.mode&&!settings.legacy)render();});
  W.CMTTrabalho={abrir:showDashboard,editor:showLegacy,atualizar:render,estado:()=>({modo:settings.mode,editor:settings.legacy,filtroTriagem:settings.triFilter,sessao:settings.sessId})};
})(window,document);
