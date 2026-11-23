/* Muta · estado e armazenamento do prontuário (um por processo)
   Base: muta-independente-prontuario-completo (HTML local). Mudanças para a extensão:
   - cada processo tem o seu prontuário, guardado pela chave dos 20 dígitos do número CNJ;
     sem número, o prontuário fica como "avulso" até receber um número;
   - o Acervo passou para ementario.js, ligado ao Ementário do Compêndio;
   - confirmações no próprio painel (Muta.confirmar). */
(function () {
'use strict';
var PREFIXO = 'muta-pje:prontuario:', INDICE = 'muta-pje:indice', ATUAL = 'muta-pje:atual';
var FORMAT = 'muta-independente-prontuario', VERSION = 2;
var $ = function (id) { return document.getElementById(id); };
function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
function str(v) { return typeof v === 'string' ? v : ''; }

/* ---------- Estado do prontuário ---------- */
function blankFull(){return{
  caso:{numero:'',item:'',classe:'',autor:'',reu:'',assunto:'',assuntoDetalhado:'',subassunto:'',secao:'',etiquetas:'',meta:'',tipoManual:'',servidor:'',corretor:'',urgente:false},
  regularidade:{tempestividade:'',intimacao:'',preparo:'',preparoAntesAuto:'',dpu:false,ajg:false,representacao:'',procuracao:'',procuracaoId:'',midias:'',outroRequisito:'',impedimento:'Sem impedimento',mpfAtuacao:'',mpfParecer:'',mpfSentido:'',mpfId:'',mpfInfo:''},
  origem:{subassunto:'',decisao:'',decisaoId:'',decisaoData:'',juizo:'',julgador:'',custas:false,honorarios:false,tutela:false,valor:false,observacao:''},
  recursoTipo:{recorrente:'',recorrenteCustom:'',rnInciso:'',rnValor:'',edId:'',edData:'',edOrgao:'',edVicios:'',edPonto:'',agintId:'',agintData:'',agintSintese:'',agintFundamentos:'',jrId:'',jrData:'',jrPrecedente:'',jrTribunal:'',jrDevolucaoId:'',jrDevolucaoMes:'',jrEd:'',jrQuestao:'',aiId:'',aiData:'',aiInciso:'',aiEfeito:''},
  analise:{comum:{admissibilidade:'',questao:'',questaoAuto:'',fundamentos:'',fundamentosAuto:'',aplicacao:'',aplicacaoAuto:'',origem:'',recursos:'',mpf:'',resultado:'',honorarios:'',dispositivo:''},
    apel:{dialeticidade:'',inovacao:'',extensao:'',fundamentoSentenca:'',questoesDevolvidas:'',subsunção:''},
    ai:{cabimento:'',cabimentoNota:'',objetoDecisao:'',tutela:'',limites:'',superveniente:'',conclusaoDecisao:''},
    agint:{impugnacao:'',pontoNaoImpugnado:'',fundamentoDecisao:'',razoes:'',retratacao:'',confronto:''},
    ed:{vicio:'',delimitacao:'',pontoEmbargado:'',natureza:'',razao:'',conclusaoVicio:'',integracao:''},
    jr:{tema:'',tese:'',confronto:'',compatibilidade:'',providencia:''},
    rn:{sujeicao:'',fundamentoReexame:'',capitulos:'',apelacaoConcomitante:'',limitesReexame:''}},
  recursos:[],pecas:[],julgamento:{situacao:'PAUTADO',resultado:'',honorarios:'',multa:'',votacao:'Unânime',remessa:false,voto:'',fundamentacao:'',topico:'',comentario:''},
  workflow:{minutadoEm:'',duvida:false,duvidaTexto:'',devolutiva:false,devolutivaEm:'',devolutivaTexto:'',corrigidoEm:'',liberadoEm:''},
  triagem:{resumo:'',pendencias:'',encaminhamento:''},producao:{tipo:'',questoes:'',minuta:''},
  guiado:true,roteiro:{},conformidade:{},alertas:'',intercorrencias:'',observacoes:'',modo:'preencher',etapa:'triagem'
};}
function mergeShape(base,src){
  if(!src||typeof src!=='object')return base;
  Object.keys(base).forEach(function(k){
    if(src[k]==null)return;
    if(Array.isArray(base[k])){if(Array.isArray(src[k]))base[k]=src[k].slice(0,100);return;}
    if(base[k]&&typeof base[k]==='object'){base[k]=mergeShape(base[k],src[k]);return;}
    if(typeof base[k]==='boolean'){base[k]=!!src[k];return;}
    base[k]=str(src[k]);
  });
  return base;
}
function sanitizeFull(src,legacy){
  var b=blankFull();
  if(src&&typeof src==='object'){
    ['caso','regularidade','origem','recursoTipo','analise','julgamento','workflow','triagem','producao'].forEach(function(k){b[k]=mergeShape(b[k],src[k]);});
    ['roteiro','conformidade'].forEach(function(k){b[k]=src[k]&&typeof src[k]==='object'?JSON.parse(JSON.stringify(src[k])):{};});
    ['alertas','intercorrencias','observacoes','modo','etapa'].forEach(function(k){b[k]=str(src[k]);});
    b.guiado=src.guiado!==false;b.modo=b.modo==='ficha'?'ficha':'preencher';b.etapa=b.etapa==='producao'?'producao':'triagem';
    b.recursos=Array.isArray(src.recursos)?src.recursos.slice(0,50).map(function(r){var x={especie:'',parte:'',parteCustom:'',data:'',ids:'',semId:false,contra:{situacao:'',data:'',ids:'',semId:false}};mergeShape(x,r);x.contra=mergeShape({situacao:'',data:'',ids:'',semId:false},r&&r.contra);return x;}):[];
    b.pecas=Array.isArray(src.pecas)?src.pecas.slice(0,100).map(function(x){return{tipo:str(x&&x.tipo),id:str(x&&x.id),data:str(x&&x.data),descricao:str(x&&x.descricao)};}):[];
  }else if(legacy){
    b.caso.numero=str(legacy.comum&&legacy.comum.numero);b.caso.classe=str(legacy.comum&&legacy.comum.classe);
    b.caso.assunto=str(legacy.comum&&legacy.comum.assunto);
    var partes=str(legacy.comum&&legacy.comum.partes).split(/\s+(?:x|vs\.?|versus)\s+/i);b.caso.autor=partes[0]||'';b.caso.reu=partes.slice(1).join(' x ')||'';
    b.triagem.resumo=str(legacy.triagem&&legacy.triagem.resumo);b.triagem.pendencias=str(legacy.triagem&&legacy.triagem.pendencias);b.triagem.encaminhamento=str(legacy.triagem&&legacy.triagem.encaminhamento);
    b.producao.tipo=str(legacy.producao&&legacy.producao.tipo);b.producao.questoes=str(legacy.producao&&legacy.producao.questoes);b.producao.minuta=str(legacy.producao&&legacy.producao.minuta);
    b.etapa=legacy.etapa==='producao'?'producao':'triagem';
  }
  return b;
}
function blank(){return{comum:{numero:'',classe:'',partes:'',assunto:''},triagem:{resumo:'',pendencias:'',encaminhamento:''},producao:{tipo:'',questoes:'',minuta:''},vinculos:[],etapa:'triagem',atualizadoEm:'',full:blankFull()};}
function sanitize(p){
  if(!p||typeof p!=='object')throw new Error('Conteúdo do prontuário ausente.');
  var b=blank();
  ['comum','triagem','producao'].forEach(function(g){var src=p[g];if(src!=null&&typeof src!=='object')throw new Error('Seção "'+g+'" inválida.');Object.keys(b[g]).forEach(function(k){b[g][k]=str(src&&src[k]);});});
  b.full=sanitizeFull(p.full,p);
  if(p.vinculos!=null&&!Array.isArray(p.vinculos))throw new Error('Lista de precedentes inválida.');
  b.vinculos=(p.vinculos||[]).filter(function(v){return v&&typeof v.id==='string'&&v.id;}).slice(0,500).map(function(v){return{id:v.id,n:str(v.n),cl:str(v.cl),d:str(v.d)};});
  b.etapa=p.etapa==='producao'?'producao':'triagem';b.atualizadoEm=str(p.atualizadoEm);
  return b;
}

/* ---------- Armazenamento por processo ---------- */
var state=blank(), chaveAtual='avulso', remoto=false;
function avisarTroca(){try{document.dispatchEvent(new CustomEvent('muta:prontuario',{detail:{chave:chaveAtual}}));}catch(e){}}
function ler(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lerIndice(){try{var o=JSON.parse(ler(INDICE)||'{}');return o&&typeof o==='object'?o:{};}catch(e){return {};}}
function gravarIndice(ix){localStorage.setItem(INDICE,JSON.stringify(ix));}
function rotulo(chave,info){
  if(chave==='avulso')return 'Prontuário avulso (sem número)';
  return (info&&info.numero)||Muta.formatarCnj(chave);
}
function sincronizarComum(){
  if(window.MutaProntuarioFull&&window.MutaProntuarioFull.getState)state.full=sanitizeFull(window.MutaProntuarioFull.getState());
  state.comum.numero=state.full.caso.numero;state.comum.classe=state.full.caso.classe;state.comum.partes=[state.full.caso.autor,state.full.caso.reu].filter(Boolean).join(' x ');state.comum.assunto=state.full.caso.assunto;
  state.triagem=state.full.triagem;state.producao=state.full.producao;state.etapa=state.full.etapa;
}
/* Prontuário sem nada além do número e da classe: não ocupa espaço até ser preenchido. */
function vazio(){
  var b=blankFull();b.caso.numero=state.full.caso.numero;b.caso.classe=state.full.caso.classe;
  return !state.vinculos.length&&JSON.stringify(sanitizeFull(state.full))===JSON.stringify(b);
}
var statusEl=$('save-status');
function setStatus(msg,kind){statusEl.textContent=msg;statusEl.className='status'+(kind?' '+kind:'');if(window.MutaProntuarioFull&&window.MutaProntuarioFull.status)window.MutaProntuarioFull.status(msg,kind);}
function persist(){
  try{
    sincronizarComum();
    var k=Muta.chaveProcesso(state.full.caso.numero),ix=lerIndice();
    if(chaveAtual==='avulso'&&k){
      if(ix[k]){setStatus('Já existe prontuário salvo para '+state.full.caso.numero+'. Este continua como avulso; abra o outro pela lista.','err');}
      else{localStorage.removeItem(PREFIXO+'avulso');delete ix.avulso;chaveAtual=k;setTimeout(avisarTroca,0);}
    }
    if(vazio()&&!ix[chaveAtual]){localStorage.setItem(ATUAL,chaveAtual);listar();return true;}
    state.atualizadoEm=new Date().toISOString();
    localStorage.setItem(PREFIXO+chaveAtual,JSON.stringify(state));
    ix[chaveAtual]={numero:state.full.caso.numero,classe:state.full.caso.classe,atualizadoEm:state.atualizadoEm};
    gravarIndice(ix);localStorage.setItem(ATUAL,chaveAtual);listar();
    if(remoto){setStatus('Prontuário atualizado com o GitHub às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'.','ok');return true;}
    setStatus('Salvo neste navegador às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})+(window.MutaSincronia?'; enviando ao GitHub…':'.'),'ok');
    if(window.MutaSincronia&&chaveAtual!=='avulso')window.MutaSincronia.alterado(chaveAtual);
    return true;}
  catch(e){setStatus('Não foi possível salvar ('+(e&&e.name||'erro')+'). Exporte o JSON para não perder o rascunho.','err');return false;}
}
function carregar(chave){
  chaveAtual=chave||'avulso';
  var raw=ler(PREFIXO+chaveAtual);
  if(!raw){state=blank();if(chaveAtual!=='avulso'){state.full.caso.numero=Muta.formatarCnj(chaveAtual);state.comum.numero=state.full.caso.numero;}return 'novo';}
  try{state=sanitize(JSON.parse(raw));return 'ok';}
  catch(e){state=blank();setStatus('O prontuário salvo deste processo está corrompido e não foi carregado. Ele permanece intacto até ser substituído.','err');return 'erro';}
}
function lerSalvo(){var raw=ler(PREFIXO+chaveAtual);if(!raw)return null;try{return JSON.parse(raw);}catch(e){return null;}}

/* lista de prontuários salvos (seletor no topo) */
function listar(){
  var sel=$('pront-lista');if(!sel)return;
  var ix=lerIndice(),ch=Object.keys(ix).sort(function(a,b){return String(ix[b].atualizadoEm||'').localeCompare(String(ix[a].atualizadoEm||''));});
  if(ch.indexOf(chaveAtual)<0)ch.unshift(chaveAtual);
  sel.replaceChildren();
  ch.forEach(function(c){var o=el('option',null,rotulo(c,ix[c])+(ix[c]?'':' · novo'));o.value=c;o.selected=c===chaveAtual;sel.append(o);});
  if(chaveAtual!=='avulso'){var n=el('option',null,'+ Prontuário avulso');n.value='avulso';sel.append(n);}
}

/* ---------- Campos legados (mantidos para o JSON) ---------- */
var fields=document.querySelectorAll('[data-k]');
function getPath(k){var p=k.split('.');return[p[0],p[1]];}
function updateProgress(){
  var groups={comum:['f-numero','f-classe','f-partes','f-assunto'],triagem:['f-resumo','f-pend','f-enc'],producao:['f-tipo','f-quest','f-minuta']};
  Object.keys(groups).forEach(function(name){
    var ids=groups[name],filled=ids.filter(function(id){var f=$(id);return f&&String(f.value||'').trim();}).length;
    var badge=document.querySelector('[data-progress="'+name+'"]');
    if(badge){badge.textContent=filled+'/'+ids.length;badge.classList.toggle('complete',filled===ids.length);}
  });
  var linksBadge=document.querySelector('[data-progress="vinculos"]');
  if(linksBadge)linksBadge.textContent=String(state.vinculos.length);
}
function render(){
  fields.forEach(function(f){var p=getPath(f.dataset.k);f.value=state[p[0]][p[1]];});
  setMode(state.etapa,false);renderLinks();updateProgress();listar();
  if(window.MutaProntuarioFull&&window.MutaProntuarioFull.setState)window.MutaProntuarioFull.setState(state.full);
}
var timer=null;
fields.forEach(function(f){
  var h=function(){var p=getPath(f.dataset.k);state[p[0]][p[1]]=f.value;updateProgress();setStatus('Salvando…');clearTimeout(timer);timer=setTimeout(persist,400);};
  f.addEventListener('input',h);f.addEventListener('change',h);
});
window.addEventListener('pagehide',function(){descarregar();});

/* ---------- Abas ---------- */
function wireTabs(tabs,onSelect){
  tabs.forEach(function(t,i){
    t.addEventListener('click',function(){onSelect(i,true);});
    t.addEventListener('keydown',function(e){var d=e.key==='ArrowRight'||e.key==='ArrowDown'?1:e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:0;
      if(e.key==='Home')d=-i;if(e.key==='End')d=tabs.length-1-i;if(!d&&e.key!=='Home')return;e.preventDefault();var n=(i+d+tabs.length)%tabs.length;onSelect(n,true);tabs[n].focus();});
  });
}
function selectTab(tabs,idx){tabs.forEach(function(t,i){var on=i===idx;t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1;$(t.getAttribute('aria-controls')).hidden=!on;});}
/* 0.11: Prontuário (com a triagem), Minuta (lote, comparar e conformidade), Ementário, Parágrafos-padrão e Diretrizes; a Ajuda abre pelo "?" */
var mainTabs=[$('tab-pront'),$('tab-min'),$('tab-acervo'),$('tab-par'),$('tab-dir'),$('tab-ajuda')];
var NOMES=['pront','min','ementario','par','dir','ajuda'];
var ALIAS={tri:'pront',lote:'min',cmp:'min',conf:'min',ger:'min',acervo:'ementario'};
function abrirAba(i){
  selectTab(mainTabs,i);var n=NOMES[i];
  if(n==='pront'&&window.MutaGabinete&&window.MutaGabinete.render)window.MutaGabinete.render();
  if(n==='ementario'&&window.MutaEmentario)window.MutaEmentario.abrir();
  if(n==='min'){if(window.MutaGerador&&window.MutaGerador.abrir)window.MutaGerador.abrir();if(window.MutaComparar)window.MutaComparar.abrir();if(window.MutaConformidade)window.MutaConformidade.abrir();if(window.MutaLote)window.MutaLote.sessao();}
  if(n==='par'&&window.MutaParagrafos)window.MutaParagrafos.abrir();
  if(n==='dir'&&window.MutaDiretrizes)window.MutaDiretrizes.abrir();
}
wireTabs(mainTabs,function(i){abrirAba(i);});
window.MutaAbas={ir:function(nome){var alvo=ALIAS[nome]||nome,i=NOMES.indexOf(alvo);if(i<0)return;abrirAba(i);if(nome==='tri'&&window.MutaGabinete&&window.MutaGabinete.ir)window.MutaGabinete.ir('Triagem');if((nome==='ger'||nome==='cmp')&&window.MutaGerador&&window.MutaGerador.modo)window.MutaGerador.modo(nome);}};
(function(){var d=$('panel-lote');if(d)d.addEventListener('toggle',function(){if(d.open&&window.MutaLote)window.MutaLote.abrir();});var v=$('aj-volta');if(v)v.addEventListener('click',function(){abrirAba(0);});})();
document.addEventListener('DOMContentLoaded',function(){var h=location.hash.replace('#','');var i=NOMES.indexOf(ALIAS[h]||h);if(i>0)abrirAba(i);});
var modeTabs=[$('mode-tri'),$('mode-pro')];
function setMode(m,save){selectTab(modeTabs,m==='producao'?1:0);if(save){state.etapa=m;persist();}}
wireTabs(modeTabs,function(i){setMode(i?'producao':'triagem',true);});

/* ---------- Vínculos ---------- */
function renderLinks(){
  var ul=$('links');ul.replaceChildren();$('links-empty').hidden=state.vinculos.length>0;
  state.vinculos.forEach(function(v,idx){
    var li=el('li');var info=el('div');
    info.append(el('div','mono',v.n||v.id),el('div','muted',[v.cl,v.d].filter(Boolean).join(' · ')));
    var rm=el('button','btn danger','Desvincular');rm.type='button';
    rm.addEventListener('click',function(){state.vinculos.splice(idx,1);persist();renderLinks();});
    li.append(info,rm);ul.append(li);
  });
  updateProgress();
  if(window.MutaProntuarioFull&&window.MutaProntuarioFull.refreshLinks)window.MutaProntuarioFull.refreshLinks();
  if(window.MutaEmentario&&window.MutaEmentario.atualizar)window.MutaEmentario.atualizar();
}

/* ---------- Exportar / importar / limpar ---------- */
$('btn-export').addEventListener('click',function(){
  try{sincronizarComum();
    var data={formato:FORMAT,versao:VERSION,exportadoEm:new Date().toISOString(),prontuario:state};
    var url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));
    var a=document.createElement('a');a.href=url;a.download='muta-prontuario-'+(state.comum.numero.replace(/[^\w.-]+/g,'_')||'sem-numero')+'.json';
    document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
    setStatus('Arquivo JSON gerado. Guarde-o em local seguro: contém os dados do prontuário.','ok');}
  catch(e){setStatus('Falha ao exportar: '+e.message,'err');}
});
$('btn-import').addEventListener('click',function(){$('file-import').click();});
$('file-import').addEventListener('change',function(){
  var file=this.files&&this.files[0];this.value='';if(!file)return;
  if(file.size>5*1024*1024){setStatus('Arquivo acima de 5 MB; não parece um prontuário exportado pelo HERO18810.','err');return;}
  var next,desc;
  file.text().then(function(txt){
    var data;try{data=JSON.parse(txt);}catch(e){throw new Error('o arquivo não é um JSON válido.');}
    if(!data||data.formato!==FORMAT)throw new Error('formato não reconhecido (esperado "'+FORMAT+'").');
    if(data.versao!==1&&data.versao!==VERSION)throw new Error('versão '+String(data.versao)+' não suportada.');
    next=sanitize(data.prontuario);
    desc=(next.full.caso.numero||next.comum.numero||'sem número')+(data.exportadoEm?', exportado em '+new Date(data.exportadoEm).toLocaleString('pt-BR'):'');
    var k=Muta.chaveProcesso(next.full.caso.numero||next.comum.numero)||'avulso';
    var existe=!!lerIndice()[k];
    return Muta.confirmar('Importar o prontuário ('+desc+')?'+(existe?'\n\nJá existe prontuário salvo para este processo neste navegador: ele será substituído.':''),'Importar');
  }).then(function(ok){
    if(!next)return;
    if(!ok){setStatus('Importação cancelada. Nada foi alterado.');return;}
    descarregar();
    chaveAtual=Muta.chaveProcesso(next.full.caso.numero||next.comum.numero)||'avulso';
    state=next;render();if(persist())setStatus('Prontuário importado e salvo neste navegador.','ok');
    avisarTroca();
  }).catch(function(e){setStatus('Importação recusada: '+e.message,'err');});
});
$('btn-clear').addEventListener('click',function(){
  Muta.confirmar('Apagar a cópia deste navegador do prontuário '+rotulo(chaveAtual,lerIndice()[chaveAtual])+'?'+(chaveAtual!=='avulso'?'\n\nO prontuário gravado no GitHub não é apagado: ele volta quando o processo for reaberto, e alterações locais ainda não enviadas se perdem.':' Esta ação não pode ser desfeita.'),'Apagar').then(function(ok){
    if(!ok)return;
    if(window.MutaProntuarioFull&&window.MutaProntuarioFull.cancelar)window.MutaProntuarioFull.cancelar();
    try{localStorage.removeItem(PREFIXO+chaveAtual);var ix=lerIndice();delete ix[chaveAtual];gravarIndice(ix);}catch(e){}
    carregar(chaveAtual);render();setStatus('Cópia local apagada.','ok');
    /* sem a cópia local, o prontuário volta do GitHub (nada é enviado a partir do prontuário em branco) */
    if(chaveAtual!=='avulso'&&window.MutaSincronia){try{localStorage.removeItem('muta-pje:sinc:'+chaveAtual);}catch(e){}window.MutaSincronia.recarregar();}
  });
});

/* ---------- Troca de prontuário ---------- */
/* grava o que estiver pendente antes de trocar de processo */
function descarregar(){
  if(window.MutaProntuarioFull&&window.MutaProntuarioFull.flush)window.MutaProntuarioFull.flush();
  if(timer){clearTimeout(timer);timer=null;persist();}
}
function abrir(chave,origem){
  chave=chave||'avulso';
  if(chave===chaveAtual)return false;
  descarregar();
  var r=carregar(chave);
  if(origem&&origem.classe&&r==='novo'&&!state.full.caso.classe)state.full.caso.classe=origem.classe;
  localStorage.setItem(ATUAL,chaveAtual);
  render();
  avisarTroca();
  if(r==='ok')setStatus('Prontuário de '+rotulo(chaveAtual,lerIndice()[chaveAtual])+' aberto'+(state.atualizadoEm?' (última gravação: '+new Date(state.atualizadoEm).toLocaleString('pt-BR')+')':'')+'.','ok');
  else if(r==='novo')setStatus(chaveAtual==='avulso'?'Prontuário avulso em branco.':'Novo prontuário para '+state.full.caso.numero+'. Ele é salvo quando você preencher algum campo.');
  return true;
}
$('pront-lista').addEventListener('change',function(){
  var v=this.value;
  if(window.MutaPje&&window.MutaPje.manual)window.MutaPje.manual(v);
  abrir(v);
});

/* ---------- Início ---------- */
var inicial=ler(ATUAL)||'avulso';
if(inicial!=='avulso'&&!Muta.chaveProcesso(inicial))inicial='avulso';
var r0=carregar(inicial);render();
if(r0==='ok')setStatus('Prontuário restaurado'+(state.atualizadoEm?' (última gravação: '+new Date(state.atualizadoEm).toLocaleString('pt-BR')+')':'')+'.','ok');
else if(r0==='novo')setStatus('Prontuário em branco. As alterações são salvas automaticamente neste navegador.');

window.MutaProntuarioBridge={
  getFull:function(){return state.full;},
  getLinks:function(){return state.vinculos;},
  saveFull:function(v){state.full=sanitizeFull(v);return persist();},
  removeLink:function(i){if(Number.isInteger(i)&&i>=0&&i<state.vinculos.length){state.vinculos.splice(i,1);persist();renderLinks();}},
  addLink:function(v){if(!v||!v.id||state.vinculos.some(function(x){return x.id===v.id;}))return false;state.vinculos.push({id:String(v.id),n:str(v.n),cl:str(v.cl),d:str(v.d)});var ok=persist();renderLinks();return ok;},
  hasLink:function(id){return state.vinculos.some(function(x){return x.id===id;});},
  getFullSanitized:sanitizeFull,
  lerSalvo:lerSalvo,
  abrirProcesso:function(numero,classe){var k=Muta.chaveProcesso(numero);if(!k)return false;return abrir(k,{classe:classe});},
  chaveAtual:function(){return chaveAtual;},
  setStatus:setStatus,
  /* sincronia com o GitHub (sincronia.js): o prontuário inteiro, como é guardado, e a troca pelo que veio do servidor */
  estado:function(){sincronizarComum();return JSON.parse(JSON.stringify(state));},
  sanitizar:function(o){return sanitize(o);},
  aplicarRemoto:function(chave,obj){
    if(chave!==chaveAtual)return false;
    var novo;try{novo=sanitize(obj);}catch(e){return false;}
    if(window.MutaProntuarioFull&&window.MutaProntuarioFull.cancelar)window.MutaProntuarioFull.cancelar();
    if(timer){clearTimeout(timer);timer=null;}
    state=novo;render();
    remoto=true;try{persist();}finally{remoto=false;}
    return true;
  }
};
})();
