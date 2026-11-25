/* Painel "Julgamento" do prontuário universal (prévia). Entra depois de universal-layout.js, no mesmo ponto do gabinete.js.
   Um só painel para acórdão e monocrática: o pronunciamento (antes "tipo de ato") e o tipo de julgamento definem as opções.
   Usa os campos da ficha e o renderizador original (campo), de modo que edição, gravação e marcas "autos"/"auto" são as de sempre.
   O resultado tem um lugar só de edição (este painel); na identificação, em Autos, ele aparece só para leitura. */
(function(){
  function tpl(h){var t=document.createElement('template');t.innerHTML=h;return t.content;}
  function out(f){var d=document.createElement('div');d.append(f);return d.innerHTML;}
  function ro(l,v){return '<div class="gf"><span class="gl">'+esc(l)+'</span><span class="ro">'+(S(v)?esc(v):'—')+'</span></div>';}
  function nota(t){return '<p class="muted pv-jg-nota">'+esc(t)+'</p>';}
  var RES={
    rec:['Provido','Parcialmente provido','Desprovido','Não conhecido','Prejudicado'],
    ed:['Rejeitados','Acolhidos sem efeito infringente','Acolhidos com efeito infringente','Não conhecido'],
    ret:['Retratação exercida','Acórdão mantido'],
    urg:['Deferido','Parcialmente deferido','Indeferido','Prejudicado'],
    hom:['Homologado','Extinto']
  };
  /* pronunciamento → espécie do painel */
  function especie(){
    var k=pronAtual(),d=destGrav();
    if(k===0||(k<0&&d==='Sessão'))return 'ac';
    return ['ac','mono','urg','desp','adm','ret','hom','outro','inter'][k]||'indef';
  }
  function inss(){var f=G.fo||{};return /\bINSS\b|INSTITUTO NACIONAL DO SEGURO/i.test([f['Polo ativo'],f['Polo passivo'],f['Partes (texto da pauta)']].join(' '));}
  function variosRecursos(){var r=V('origem','Recursos');try{if(typeof r==='string')r=JSON.parse(r);}catch(e){r=null;}return Array.isArray(r)&&r.length>1;}
  function opcoesResultado(e,T){
    if(e==='urg'||e==='inter')return RES.urg;if(e==='hom')return RES.hom;
    if(e==='ret'||T.ret)return RES.ret;if(T.ed)return RES.ed;return RES.rec;
  }
  function campoDe(sec,k,rot,extra){var c=campoLista(sec,k);if(!c)return '';return campo(Object.assign({},c,{rotulo:rot||c.rotulo},extra||{}));}
  var ROT={ac:'Acórdão',mono:'Decisão monocrática (art. 932)',urg:'Decisão de urgência',inter:'Decisão interlocutória',desp:'Despacho',adm:'Decisão de admissibilidade',ret:'Juízo de retratação',hom:'Homologação / extinção',outro:'Outro destino',indef:'A definir na Triagem'};
  /* campos que só este painel mostra (o restante da produção não os repete) */
  var MEUS=['triagem.Hipóteses Monocrática','producao.Voto - Resultado','producao.Resultado por recurso','producao.Voto - Honorários','producao.Fundamento da sucumbência',
    'producao.Juros e correção monetária','producao.Natureza da condenação','producao.Mono - Título','producao.Tópico-síntese','producao.Mono - Fundamento','producao.Tese jurídica adotada','producao.Precedentes aplicáveis','producao.Voto - Descrição',
    'producao.ED - Vício reconhecido','producao.ED - Integração','producao.ED - Efeitos modificativos','producao.ED - Prequestionamento','producao.Remessa - Extensão do reexame',
    'triagem.Retratação - Tema','triagem.Retratação - Precedente'];
  function painel(){
    var e=especie(),T=ccTipos(),h='',mono=e!=='ac'&&e!=='indef';
    h+='<div class="gf w pv-jg-pron"><span class="gl">Pronunciamento</span><span class="ro"><b>'+esc(ROT[e])+'</b>'+(e==='ac'?'':' · decisão do relator')+'</span>'+
      '<button type="button" class="lnk" data-pv-enc="">'+(e==='indef'?'Definir na Triagem':'Alterar na Triagem')+'</button></div>';
    if(e==='desp'||e==='outro'){
      h+=nota(e==='desp'?'Despacho: sem resultado, honorários ou fundamento de mérito.':'Outro destino: registre o encaminhamento na Triagem.');
      h+=campoDe('producao','Voto - Descrição','Detalhes da minuta');return h;
    }
    if(e==='indef')h+=nota('Sem pronunciamento definido: as opções seguem o acórdão até a Triagem definir.');
    /* fundamento do pronunciamento */
    if(e==='mono'||e==='adm')h+=campoDe('triagem','Hipóteses Monocrática','Hipótese do art. 932');
    /* resultado: opções pelo pronunciamento e pelo tipo de julgamento; valor antigo em texto livre fica visível */
    var L=opcoesResultado(e,T),atual=S(V('producao','Voto - Resultado')),n=(window.VOC?VOC.norm('resJulg',atual):atual);
    /* valor do vocabulário antigo (ex.: "Negado provimento"): convertido ao único, gravado junto com a próxima alteração */
    if(!window.MUTA_WEB&&atual&&n!==atual&&L.indexOf(n)>=0){marcar('producao.Voto - Resultado',n);atual=n;}
    h+=campoDe('producao','Voto - Resultado','Resultado',{tipo:'lista',opcoes:L});
    if(atual&&L.indexOf(n)<0)h+=nota('O resultado gravado ('+atual+') não está entre as opções deste pronunciamento: escolha uma para substituí-lo.');
    if(e==='ac'&&(T.rn||T.ap&&variosRecursos()||variosRecursos()))h+=campoDe('producao','Resultado por recurso','Resultado por recurso');
    /* espécies de julgamento */
    if(T.ed){h+=campoDe('producao','ED - Vício reconhecido','Vício reconhecido')+campoDe('producao','ED - Efeitos modificativos','Efeitos modificativos')+
      campoDe('producao','ED - Integração','Integração')+campoDe('producao','ED - Prequestionamento','Prequestionamento');}
    if(e==='ret'||T.ret)h+=campoDe('triagem','Retratação - Tema','Tema da devolução')+campoDe('triagem','Retratação - Precedente','Precedente da devolução');
    if(T.rn)h+=campoDe('producao','Remessa - Extensão do reexame','Extensão do reexame');
    /* sucumbência e consectários */
    if(e==='urg'||e==='inter'||e==='hom'){}
    else if(T.ms)h+=nota('Mandado de segurança: sem honorários (artigo 25 da Lei 12.016/2009; Súmula 512/STF).');
    else{
      if(T.ai)h+=nota('Agravo de instrumento: honorários tratados na ação originária, salvo decisão que ponha termo ao processo.');
      h+=campoDe('producao','Voto - Honorários','Honorários')+campoDe('producao','Fundamento da sucumbência','Fundamento da sucumbência');
      h+=campoDe('producao','Natureza da condenação','Natureza da condenação');
      if(S(V('producao','Natureza da condenação'))!=='Sem condenação')h+=campoDe('producao','Juros e correção monetária','Consectários (juros e correção)');
    }
    if(inss()||S(V('producao','Tópico-síntese')))h+=campoDe('producao','Tópico-síntese','Tópico-síntese (INSS)');
    /* fundamento: monocrática no campo da monocrática; acórdão na tese e nos precedentes */
    if(mono)h+=campoDe('producao','Mono - Título','Título do caso (painel do Desembargador)')+campoDe('producao','Mono - Fundamento','Precedente ou fundamento');
    else h+=campoDe('producao','Tese jurídica adotada','Tese jurídica adotada')+campoDe('producao','Precedentes aplicáveis','Precedentes aplicáveis');
    h+=campoDe('producao','Voto - Descrição','Detalhes da minuta');
    return h;
  }
  function bloco(){
    var e=especie();
    return '<details class="gg pv-julgamento" id="pv-julgamento" open><summary><h4>Julgamento</h4><span class="gn">'+esc(e==='ac'||e==='indef'?'acórdão':'monocrática')+'</span></summary><div class="gr">'+painel()+'</div></details>';
  }
  var prod=camposCaso;
  camposCaso=function(ja){
    var all=Object.assign({},ja);MEUS.forEach(function(k){all[k]=1;});
    var f=tpl(prod(all)),root=f.querySelector('.cc-caso');
    if(!root)return bloco()+out(f);
    root.insertBefore(tpl(bloco()),root.firstChild);return out(f);
  };
  /* identificação (Autos): o resultado só se lê ali; edita-se no painel Julgamento */
  var autos=corpoAutos;
  corpoAutos=function(){
    var f=tpl(autos()),id=f.querySelector('#pv-identity');
    if(id){var c=id.querySelector('[data-fk="producao.Voto - Resultado"]'),row=c&&(c.closest('.pv-idrow')||c.closest('.gf'));
      if(row){var r=tpl('<div class="pv-idrow">'+ro('Conclusão / resultado',V('producao','Voto - Resultado'))+'<button type="button" class="lnk" data-pv-jg="">Editar em Produção › Julgamento</button></div>');row.replaceWith(r);}}
    return out(f);
  };
  caixa.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-pv-jg]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();
    G.aba='Processo';G.rot='pro';render();var p=$('pv-julgamento');if(p){p.open=true;p.scrollIntoView({block:'start'});}},true);
  window.MutaGabinete.julgamento={especie:especie,opcoes:function(){return opcoesResultado(especie(),ccTipos());}};
})();
