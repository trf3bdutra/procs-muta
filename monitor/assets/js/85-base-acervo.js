/* Gestor CMT · Base do Acervo 2.0
   Um diálogo verdadeiro e independente: preserva os importadores existentes,
   mas não move nós de outros painéis nem grava em serviços externos implícitos.
   Todo salvamento remoto deve ser solicitado explicitamente no fluxo competente.
*/
(function (W, D) {
  'use strict';
  if (W.CMTBaseAcervoV2) return;
  // Os importadores originais são funções globais da Central. A integração
  // com o backend legada é condicional; recuperar as funções mesmo sem ela.
  var importadoresLegados = W.CMTImportadoresLocal || (W.CMTImportadoresLocal = {});
  if (!importadoresLegados.principal && typeof importAcervo === 'function') importadoresLegados.principal = importAcervo;
  if (!importadoresLegados.complemento && typeof cpImport === 'function') importadoresLegados.complemento = cpImport;
  var raiz = null;
  var estado = { secao: 'visao', ocupado: false, status: '', tipo: '', erro: false, abertura: 0 };
  var nf = function (n) { return typeof n === 'number' && isFinite(n) ? n.toLocaleString('pt-BR') : '—'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  function motor() { try { return D.getElementById('cmt-motor')?.contentWindow || null; } catch (e) { return null; } }
  function atual() { var w = motor(); return w && w.__painelCentralComponent; }
  function reg() { var w=motor(); return w && w.ProcsMuta; }
  function conectado() { var r=reg(); return !!(r && r.atual); }
  function mens(m, erro) {
    estado.status = String(m || ''); estado.erro = !!erro;
    if (!raiz) return;
    var el=raiz.querySelector('#cb2-message');
    el.textContent=estado.status;
    el.className='cb2-message'+(erro?' is-error':estado.status?' is-ok':'');
    el.hidden=!estado.status;
    el.setAttribute('role', erro?'alert':'status');
  }
  function setOcupado(oc) {
    estado.ocupado=oc;
    if (!raiz) return;
    raiz.querySelectorAll('[data-cb2-action],input[type=file],button[type=submit]').forEach(function(el) {
      if (el.dataset.cb2Action==='fechar' || el.dataset.cb2Action==='secao' || el.dataset.cb2Action==='help') return;
      el.disabled=oc;
    });
    raiz.classList.toggle('is-busy',oc);
  }
  function stats() {
    var w=motor(),c=atual(), s=w && w.CMTSessao, a=w && w.CMTAcervoDados && w.CMTAcervoDados.estado ? w.CMTAcervoDados.estado() : {};
    var n=0, ng=0, ns=0, npend=0;
    try { n=c && Array.isArray(c.rows) ? c.rows.length : 0; } catch(e) {}
    try { var S=s && s.estado && s.estado(); ns=Array.isArray(S.sessoes)?S.sessoes.length:0; npend=typeof s.pendentes==='function'?s.pendentes().length:0; } catch(e) {}
    try { ng=+a.total || 0; }catch(e){}
    return {motor:!!c,base:conectado(),local:n,remoto:ng,sessoes:ns,pendentes:npend,lido:a.lidoEm||'',versao:a.versao||'',erro:a.erro||''};
  }
  function bloco() {
    if (raiz) return raiz;
    raiz=D.createElement('div'); raiz.id='cmt-base-v2'; raiz.hidden=true;
    raiz.setAttribute('role','dialog'); raiz.setAttribute('aria-modal','true'); raiz.setAttribute('aria-labelledby','cb2-title');
    raiz.innerHTML = '<div class="cb2-surface" tabindex="-1">'
      +'<header class="cb2-head"><div><small>GABINETE CMT / ADMINISTRAÇÃO DOS DADOS</small><h2 id="cb2-title">Base do Acervo</h2><p>Fontes do PJe e Power BI, sincronização e integridade da base</p></div><button type="button" class="cb2-close" data-cb2-action="fechar" aria-label="Fechar o diálogo">×</button></header>'
      +'<div class="cb2-status"><div class="cb2-dot" id="cb2-dot"></div><div><b id="cb2-state">Verificando conexão</b><span id="cb2-origin">trf3bdutra/procs-muta · main</span></div><button type="button" data-cb2-action="atualizar" class="cb2-primary">Atualizar do repositório</button></div>'
      +'<nav class="cb2-tabs" aria-label="Seções da Base do Acervo"><button type="button" data-cb2-action="secao" data-cb2-value="visao">Visão da base</button><button type="button" data-cb2-action="secao" data-cb2-value="importar">Importar / atualizar</button><button type="button" data-cb2-action="secao" data-cb2-value="conexao">Conexão e acesso</button></nav>'
      +'<div class="cb2-main"><div class="cb2-message" id="cb2-message" hidden></div>'
      +'<section data-cb2-pane="visao"><div class="cb2-metrics"><div><span>Processos carregados</span><b id="cb2-local">—</b><small>no gestor, nesta aba</small></div><div><span>Registros da fonte</span><b id="cb2-remoto">—</b><small>última consulta disponível</small></div><div><span>Sessões cadastradas</span><b id="cb2-sessoes">—</b><small>calendário e pautas</small></div><div><span>Arquivos pendentes</span><b id="cb2-pendentes">—</b><small>sessões/regras a gravar</small></div></div>'
      +'<div class="cb2-grid"><div class="cb2-box"><h3>Origem e atualização</h3><p>Fonte oficial deste gestor: <code>acervo/fonte.json</code>, integrada à ficha operacional <code>acervo/operacional.json</code>. As importações locais não substituem automaticamente esses documentos.</p><div class="cb2-detail"><b>Última leitura</b><span id="cb2-lido">—</span></div><div class="cb2-detail"><b>Versão</b><span id="cb2-versao">—</span></div><div id="cb2-erro" class="cb2-warning" hidden></div><button type="button" class="cb2-outline" data-cb2-action="secao" data-cb2-value="importar">Abrir importadores</button></div>'
      +'<div class="cb2-box"><h3>Acesso às áreas operacionais</h3><p>As funções de triagem, pautas e equipe continuam no motor original, com os dados e eventos preservados.</p><div class="cb2-shortcuts"><button type="button" data-cb2-action="navegar" data-cb2-value="central">Acervo Central</button><button type="button" data-cb2-action="navegar" data-cb2-value="triagem">Triagem</button><button type="button" data-cb2-action="navegar" data-cb2-value="pautas">Sessões</button><button type="button" data-cb2-action="navegar" data-cb2-value="equipe">Equipe</button></div></div></div></section>'
      +'<section data-cb2-pane="importar" hidden><div class="cb2-info">Os importadores usam os mesmos validadores e estruturas do CMT original. Arquivos locais são examinados antes de atualizar a cópia de trabalho; a publicação no GitHub não é presumida.</div>'
      +'<div class="cb2-imports"><div class="cb2-import"><div><b>Acervo geral · PJe / Power BI</b><small>Planilha principal de acervo (.xlsx, .xls ou .csv).</small></div><label>Escolher arquivo<input type="file" accept=".xlsx,.xls,.csv" data-cb2-import="acervo"></label></div>'
      +'<div class="cb2-import"><div><b>Acervo de processos sigilosos</b><small>Planilha de sigilosos, processada pelo importador próprio.</small></div><label>Escolher arquivo<input type="file" accept=".xlsx,.xls,.csv" data-cb2-import="sigilosos"></label></div>'
      +'<div class="cb2-import"><div><b>Etiquetas e tarefas do PJe</b><small>Acervo detalhado, etiquetas e tarefa atual por processo.</small></div><label>Escolher arquivo<input type="file" accept=".xlsx,.xls,.csv" data-cb2-import="pje_etiquetas_tarefa"></label></div>'
      +'<div class="cb2-import"><div><b>Relatório local de caixas do PJe</b><small>Leitura operacional e situação dos processos (importador antigo preservado, sem envio automático à API legada).</small></div><label>Escolher arquivo<input type="file" accept=".xlsx,.csv" data-cb2-import="pje_local"></label></div>'
      +'<div class="cb2-import"><div><b>Planilhas complementares</b><small>Tramitação, conclusos, sobrestados e outros complementos sem criar processos inexistentes.</small></div><label>Escolher arquivo<input type="file" accept=".xlsx,.csv" multiple data-cb2-import="complemento"></label></div>'
      +'<div class="cb2-import"><div><b>Importação em lote</b><small>Identifica automaticamente as planilhas reconhecidas por seu nome; tipos desconhecidos são rejeitados.</small></div><label>Escolher arquivos<input type="file" accept=".xlsx,.xls,.csv" multiple data-cb2-import="lote"></label></div></div>'
      +'<div class="cb2-box cb2-bottom"><h3>Persistência e conferência</h3><p>As sessões e regras são gravadas pelos controles de suas áreas. Para o acervo, o envio antigo foi desativado no código de origem: não será informado como concluído um commit que não ocorreu.</p><button type="button" data-cb2-action="atualizar" class="cb2-outline">Reconsultar fonte no procs-muta</button></div></section>'
      +'<section data-cb2-pane="conexao" hidden><div class="cb2-grid"><div class="cb2-box"><h3>Autenticação do repositório</h3><p>Conecte uma credencial com permissão Contents para o repositório <code>trf3bdutra/procs-muta</code>. A credencial não é incluída nos arquivos exportados.</p><form id="cb2-connect"><label for="cb2-token">Token de acesso do GitHub</label><input id="cb2-token" type="password" autocomplete="new-password" placeholder="github_pat_…" required><label class="cb2-remember"><input id="cb2-remember" type="checkbox"> Lembrar neste navegador (somente em dispositivo confiável)</label><div class="cb2-actions"><button class="cb2-primary" type="submit">Conectar e carregar</button><button class="cb2-outline" type="button" data-cb2-action="desconectar">Desconectar</button></div></form></div><div class="cb2-box"><h3>Arquivos compartilhados</h3><div class="cb2-files"><span>Acervo fonte</span><code>acervo/fonte.json</code><span>Ficha operacional</span><code>acervo/operacional.json</code><span>Calendário</span><code>acervo/sessoes/calendario.json</code><span>Regras gerais</span><code>apoio/regras/designacao.json</code><span>Regras por sessão</span><code>acervo/sessoes/AAAA-MM-DD.json</code></div><p class="cb2-muted">Para visualizar alterações recentes em todas as áreas, reabra a aplicação após conferir tarefas locais pendentes.</p><button type="button" class="cb2-outline" data-cb2-action="reabrir">Recarregar a aplicação</button></div></div></section>'
      +'</div><footer class="cb2-footer"><span id="cb2-foot">Aguardando leitura da base</span><button type="button" data-cb2-action="fechar">Fechar</button></footer></div>';
    D.body.appendChild(raiz);
    raiz.addEventListener('click', function(e) {
      if (e.target===raiz) { fechar(); return; }
      var b=e.target.closest('[data-cb2-action]'); if (!b) return;
      e.preventDefault(); acao(b.dataset.cb2Action,b.dataset.cb2Value || '');
    });
    raiz.addEventListener('change', function(e) {
      if (e.target.matches('input[data-cb2-import]')) { var el=e.target,fs=Array.from(el.files || []), tipo=el.dataset.cb2Import; el.value=''; if(fs.length) importar(fs,tipo); }
    });
    raiz.querySelector('#cb2-connect').addEventListener('submit', conectar);
    return raiz;
  }
  function pagina(k) {
    estado.secao=k;
    if(!raiz)return;
    raiz.querySelectorAll('[data-cb2-pane]').forEach(function(el){el.hidden=el.dataset.cb2Pane!==k;});
    raiz.querySelectorAll('.cb2-tabs [data-cb2-value]').forEach(function(el){var on=el.dataset.cb2Value===k;el.classList.toggle('active',on);el.setAttribute('aria-selected',on?'true':'false');});
    atualizarEstado();
  }
  function atualizarEstado() {
    if (!raiz || raiz.hidden) return;
    var s=stats();
    raiz.querySelector('#cb2-local').textContent=nf(s.local);
    raiz.querySelector('#cb2-remoto').textContent=s.remoto ? nf(s.remoto) : s.base?'—':'sem conexão';
    raiz.querySelector('#cb2-sessoes').textContent=nf(s.sessoes);
    raiz.querySelector('#cb2-pendentes').textContent=nf(s.pendentes);
    raiz.querySelector('#cb2-state').textContent=s.base ? 'Conectado ao procs-muta' : 'Sem conexão com o procs-muta';
    raiz.querySelector('#cb2-origin').textContent=s.base?'trf3bdutra/procs-muta · main · token ativo':'Conecte uma credencial para sincronizar a fonte';
    raiz.querySelector('#cb2-dot').classList.toggle('connected',s.base);
    raiz.querySelector('#cb2-lido').textContent=s.lido?new Date(s.lido).toLocaleString('pt-BR'):'Ainda não consultado';
    raiz.querySelector('#cb2-versao').textContent=s.versao||'Sem versão carregada';
    var erro=raiz.querySelector('#cb2-erro');erro.hidden=!s.erro;erro.textContent=s.erro;
    raiz.querySelector('#cb2-foot').textContent=(s.motor?'Motor operacional':'Motor inicializando')+' · '+(s.base?'GitHub conectado':'dados locais')+' · '+nf(s.local)+' processos';
    raiz.querySelectorAll('[data-cb2-action="atualizar"]').forEach(function(bt){bt.disabled=estado.ocupado || !s.base || !s.motor;bt.title=s.base?'Recarrega acervo/fonte.json e acervo/operacional.json':'Conecte a base primeiro';});
  }
  function abrir(secao) {
    bloco(); raiz.hidden=false; D.body.classList.add('cmt-base-open');
    estado.abertura++; pagina(secao || estado.secao || 'visao');mens('');atualizarEstado();
    var foco=raiz.querySelector('.cb2-close'); if(foco)foco.focus();
  }
  function fechar() { if(!raiz)return; raiz.hidden=true;D.body.classList.remove('cmt-base-open');var b=D.getElementById('cmtConBtn');if(b)b.focus(); }
  async function ocupado(fn, inicio) {
    if (estado.ocupado) return;
    setOcupado(true);mens(inicio||'Executando operação…');
    try{ await fn(); }catch(e){console.error('[Base Acervo]',e);mens(e && e.message?e.message:String(e),true);}
    finally{setOcupado(false);atualizarEstado();}
  }
  async function atualizar() {
    if(!conectado()) {pagina('conexao');mens('Para atualizar o acervo, conecte o repositório.',true);return;}
    await ocupado(async function(){
      var w=motor();if(!w || !w.CMTAcervoDados || !w.CMTAcervoDados.puxar) throw new Error('Mecanismo de leitura do acervo indisponível.');
      var r=await w.CMTAcervoDados.puxar(false);
      var st=w.CMTAcervoDados.estado(); if(!r)throw new Error(st.erro||'A leitura do acervo falhou.');
      if (W.CMTShell && W.CMTShell.recarregar) W.CMTShell.recarregar();
      mens('Acervo atualizado a partir do procs-muta. Confira as alterações no Acervo Central.');
    }, 'Lendo a fonte e os registros operacionais do procs-muta…');
  }
  async function conectar(e) {
    e.preventDefault();
    if (estado.ocupado) return;
    var f=e.currentTarget,token=f.querySelector('#cb2-token').value.trim(),lembrar=f.querySelector('#cb2-remember').checked;
    if(!token) {mens('Informe um token de acesso.',true);return;}
    await ocupado(async function(){
      var w=motor();if(!w || !w.ProcsMuta || !w.ProcsMuta.definir)throw new Error('O motor ainda não está pronto para autenticar.');
      var r=await w.ProcsMuta.definir(token,lembrar);
      if(!r || !r.ok)throw new Error(r && r.erro||'Falha ao validar o token.');
      if(w.__acervoGitHub && w.__acervoGitHub.token)w.__acervoGitHub.token(token);
      f.querySelector('#cb2-token').value='';
      pagina('visao');
      if (!w.CMTAcervoDados || typeof w.CMTAcervoDados.puxar !== 'function') {
        mens('Credencial validada. O motor ainda não disponibilizou a leitura do acervo.',true);
        return;
      }
      mens('Credencial validada. Carregando informações do acervo…');
      var consulta=await w.CMTAcervoDados.puxar(false);
      if (!consulta) {
        var st=w.CMTAcervoDados.estado && w.CMTAcervoDados.estado();
        mens('Conectado, mas não foi possível atualizar os dados: '+((st&&st.erro)||'erro de leitura'),true);
        return;
      }
      if(W.CMTShell && typeof W.CMTShell.recarregar==='function') W.CMTShell.recarregar();
      mens('Conectado ao procs-muta e acervo atualizado.');
    },'Conferindo permissão de leitura e gravação…');
  }
  async function importar(files,tipo) {
    if(!files.length)return;
    await ocupado(async function(){
      var w=motor(),c=atual(); if(!c)throw new Error('Motor do gestor ainda não está pronto.');
      var ok=[],falhas=[];
      for (var f of files) {
        var tp=tipo;
        if(tp==='lote')tp=typeof c.detectImportType==='function'?c.detectImportType(f.name):'';
        if(!tp) {falhas.push(f.name+': fonte não reconhecida; selecione o importador específico.');continue;}
        try{
          mens('Lendo e validando '+f.name+'…');
          if(tp==='pje_local'||tp==='complemento') {
            var importadores=W.CMTImportadoresLocal;
            var fn=tp==='pje_local'?importadores && importadores.principal:importadores && importadores.complemento;
            if(typeof fn!=='function')throw new Error('Importador do relatório local indisponível.');
            await fn(f);
            var msgId=tp==='pje_local'?'tkimpst':'cpst',msg=D.getElementById(msgId);
            if(msg && /^(✕|×)/.test(msg.textContent.trim()))throw new Error(msg.textContent);
          } else {
            if(typeof c.runImport!=='function')throw new Error('Importador da fonte indisponível.');
            var epoch=await c.runImport(f,tp);
            if(typeof c.logImport==='function')await c.logImport(tp,f,epoch);
          }
          ok.push(f.name);
          if(W.CMTShell && W.CMTShell.recarregar)W.CMTShell.recarregar();
        }catch(e){ falhas.push(f.name+': '+(e&&e.message||String(e))); try{if(tp!=='pje_local'&&tp!=='complemento' && c.importFailure)c.importFailure(f,e);}catch(_){} }
      }
      atualizarEstado();
      if(falhas.length)mens((ok.length?ok.length+' arquivo(s) importado(s) localmente. ':'')+'Falhas: '+falhas.join(' | '),true);
      else mens(ok.length+' arquivo(s) processado(s) com o importador original. Alterações na cópia de trabalho não equivalem a publicação no GitHub.');
    },'Preparando importação…');
  }
  async function desconectar() {
    var w=motor();if(!w||!w.ProcsMuta)return;
    if(!W.confirm('Desconectar este navegador do procs-muta? Os dados locais não serão apagados.'))return;
    w.ProcsMuta.esquecer();if(w.__acervoGitHub && w.__acervoGitHub.token)w.__acervoGitHub.token('');
    atualizarEstado();mens('Credencial desconectada. Nenhuma alteração local foi apagada.');
  }
  function acao(a,v) {
    if(a==='fechar')return fechar();
    if(a==='secao')return pagina(v);
    if(a==='atualizar')return atualizar();
    if(a==='desconectar')return desconectar();
    if(a==='reabrir') {if(W.confirm('Recarregar esta página? Verifique antes se há alterações locais não gravadas.'))W.location.reload();return;}
    if(a==='navegar'){fechar();if(W.CMTShell&&W.CMTShell.entrar)W.CMTShell.entrar(v);return;}
  }
  D.addEventListener('keydown',function(e){if(e.key==='Escape'&&raiz&&!raiz.hidden){e.preventDefault();fechar();}});
  // O botão da barra usa o callback global; sobrescrever evita abrir a caixa antiga defeituosa.
  W.CMTConexao=abrir;
  W.CMTBaseAcervoV2={abrir:abrir,fechar:fechar,atualizar:atualizar,estado:stats,importar:importar};
})(window,document);
