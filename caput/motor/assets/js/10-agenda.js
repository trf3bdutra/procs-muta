
/* Agenda do calendário (afazeres, alertas e eventos cadastrados e o que já foi feito): procs-muta acervo/sessoes/agenda.json */
(function(){ if(window.CMTAgenda) return;
  var LSK={itens:'cc_itens',feitos:'cc_feitos'}, D={itens:null,feitos:null}, carregado=false, t=null, ARQ='acervo/sessoes/agenda.json';
  function ls(k,d){try{var v=localStorage.getItem(LSK[k]);return v==null?d:JSON.parse(v)}catch(e){return d}}
  function get(k,d){ if(D[k]==null) D[k]=ls(k,d); return D[k]; }
  function set(k,v){ D[k]=v; try{localStorage.setItem(LSK[k],JSON.stringify(v))}catch(e){} agendar(); }
  function agendar(){ clearTimeout(t); t=setTimeout(gravar,4000); }
  async function gravar(){ var P=window.ProcsMuta; if(!P||!P.atual||!P.gravar) return;
    var doc={schema:'gabcmt.agenda-calendario',versao:1,atualizado_em:new Date().toISOString(),itens:get('itens',[]),feitos:get('feitos',{})}, o={}; o[ARQ]=JSON.stringify(doc,null,1)+'\n';
    try{ await P.gravar(o,'Ab Initio: agenda do calendário (afazeres, alertas e eventos)'); }catch(e){ console.warn('[agenda]',e); } }
  async function carregar(){ var P=window.ProcsMuta; if(carregado||!P||!P.atual||!P.ler) return; carregado=true;
    try{ var j=JSON.parse(await P.ler(ARQ));
      var loc=ls('itens',[]), ids=new Set((j.itens||[]).map(function(i){return i.id})), extra=loc.filter(function(i){return !ids.has(i.id)});
      D.itens=(j.itens||[]).concat(extra); D.feitos=Object.assign({},ls('feitos',{}),j.feitos||{});
      try{localStorage.setItem(LSK.itens,JSON.stringify(D.itens));localStorage.setItem(LSK.feitos,JSON.stringify(D.feitos))}catch(e){}
      if(extra.length) agendar(); window.dispatchEvent(new Event('cmt-agenda'));
    }catch(e){ if(ls('itens',[]).length||Object.keys(ls('feitos',{})).length) agendar(); } }
  setInterval(carregar,1500);
  var AUSX=[], ausOk=false;
  async function carregarAus(){ var P=window.ProcsMuta; if(ausOk||!P||!P.atual||!P.ler) return; ausOk=true;
    try{ var q=JSON.parse(await P.ler('apoio/equipe-solicitacoes.json')); AUSX=(q.registros||[]).filter(function(r){return r.estado==='pendente'||r.estado==='aprovada';})
      .map(function(r){return {quem:r.nome,tipo:r.tipo,de:r.de,ate:r.ate,situacao:r.estado==='aprovada'?'confirmada':'prevista',obs:r.motivo||''};}); window.dispatchEvent(new Event('cmt-agenda')); }catch(e){} }
  setInterval(carregarAus,3000);
  window.CMTAgenda={get:get,set:set,gravar:gravar,carregar:carregar,ausencias:function(){return AUSX;}};
})();
