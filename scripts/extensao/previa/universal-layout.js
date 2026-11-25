/* Adaptador de apresentação exclusivo da prévia. Não substitui os roteiros. */
(function(){
  var cab=cabeca, nt=notas, nota=notaIncluir, sn=snCard, caso=casoNotas,
      rt=corpoRoteiro, etapa=marcarEtapa, ed=editavel, valor=gravado, ct=controlesProcesso;
  var open={}, noteOpen=false, current='', saved=Object.create(null);
  function fragment(h){var t=document.createElement('template');t.innerHTML=h;return t.content;}
  function html(f){var d=document.createElement('div');d.append(f);return d.innerHTML;}
  function elem(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
  function add(p,h){p.append(fragment(h));}
  function btn(t,k,v){var b=elem('button','btn line sm pv-plus',t);b.type='button';b.setAttribute(k,v||'');return b;}
  function locked(c){return c.secao==='producao'&&(/^(LIBERADO|Assinado|Data da Assinatura)$/.test(c.chave)||(c.chave==='Data da Liberação'&&destino()!=='monocratica'));}
  editavel=function(c){return ed(c)&&!locked(c);};
  marcarEtapa=function(i){if(i===etapas().L.length-1)return;return etapa(i);};
  gravado=function(sec,k){var d=saved[G.cnj], id=sec+'.'+k;return d&&Object.prototype.hasOwnProperty.call(d,id)?d[id]:valor(sec,k);};
  window.MutaGabinete.gravado=gravado;
  gravarJa=function(){
    clearTimeout(G.t);G.t=null;var cnj=G.pendCnj||G.cnj,P=G.pend;
    if(!cnj||!Object.keys(P).length)return Promise.resolve({});
    Object.assign(saved[cnj]||(saved[cnj]={}),P);G.pend={};G.pendCnj='';
    if(cnj===G.cnj){G.op=G.op||{};Object.keys(P).forEach(function(k){var i=k.indexOf('.'),s=k.slice(0,i);(G.op[s]||(G.op[s]={}))[k.slice(i+1)]=P[k];});st('Prévia: alterações apenas em memória.','ok');}
    return Promise.resolve({operacional:G.op});
  };
  function field(sec,k,label,tags){
    var id=sec+'.'+k,v=S(V(sec,k)),d=elem('div','pv-field'),head=elem('div','pv-head');
    head.append(elem('span','gl',label),btn(open[id]?'−':v?'✎':'+','data-pv-field',id));d.append(head);
    if(open[id])add(d,campoRot(sec,k,label));
    else{if(v){if(tags){var w=elem('div','pv-tags');v.split(/[;|\n]+/).map(S).filter(Boolean).forEach(function(s){w.append(elem('span','chip',s));});d.append(w);}else d.append(elem('div','pv-value',v));}
      var hidden=elem('span');hidden.hidden=true;hidden.setAttribute('data-fk',id);d.append(hidden);}
    return d;
  }
  function flow(){
    var E=etapas(),box=elem('div','pv-flowbox'),r=elem('div','pv-flow');box.append(elem('h4','pm-mer-h','Etapas'));
    E.L.forEach(function(x,i){if(x.ic==='tri')return;
      var cell=elem('div','pv-stage'+(x.ok?' ok':i===E.n?' at':'')),b=btn('','data-et',String(i));b.className='pv-stage-btn';b.innerHTML=SV(IC[x.ic],14);b.disabled=i===E.L.length-1||!(i===E.n||i===E.n-1);b.title=i===E.L.length-1?'Ato do relator · somente leitura':'Marcar ou desfazer';
      cell.append(b,elem('b','',x.ic==='ass'?'Assinatura':x.r),elem('small','muted',x.dt?brD(x.dt).slice(0,5):'—'));r.append(cell);});
    box.append(r);var people=elem('div','pv-people');
    [['SERVIDOR','Minuta'],['CORRETOR',E.mono?'Revisão':'Correção']].forEach(function(z){var p=elem('div','pv-person'),v=S(V('producao',z[0]));p.append(elem('small','muted',z[1]));if(G.desEd===z[0]){var i=elem('input');i.id='pm-des';i.setAttribute('data-des',z[0]);i.value=v;p.append(i);}else{var b=btn(v||'Não designado','data-des-ed',z[0]);b.disabled=!G.gestor;p.append(b);}people.append(p);});box.append(people);return box;
  }
  /* Roteiro real de triagem, incluindo estados, prazos, conferência e seleção de espécies.
     Retira só a explicação redundante do catálogo, não as etiquetas nem as ações. */
  corpoRoteiro=function(){
    var f=fragment(rt());f.querySelectorAll('.etq-cat').forEach(function(c){if(!c.querySelector('.etq-cs'))c.remove();else{var b=c.querySelector('.etq-cat-h b');if(b)b.remove();}});
    f.querySelectorAll('p,small').forEach(function(p){if(p.textContent.trim().startsWith('As sugeridas seguem as regras do Caput'))p.remove();});return html(f);
  };
  /* Reaproveita controles originais e disponibiliza os demais campos de Meta. */
  controlesProcesso=function(naSeta){
    var f=fragment(ct(naSeta)),m=f.querySelector('.ct-i.meta.on'),g=grupoModelo('Meta');
    if(m&&g){var d=elem('details','ct-mais'),gr=elem('div','gr');d.append(elem('summary','','Mais campos'));g.campos.forEach(function(c){add(gr,campo(c));});d.append(gr);m.append(d);}return html(f);
  };
  casoNotas=function(){return '';};
  notas=function(){
    var f=fragment(nt()),b=f.querySelector('[data-nt-add]'),t=f.querySelector('#nt-tx');
    if(b){b.textContent=noteOpen?'−':'+';b.removeAttribute('data-nt-add');b.setAttribute('data-pv-note','');b.setAttribute('aria-expanded',String(noteOpen));}
    if(t){if(noteOpen)t.after(btn('Incluir','data-nt-add',''));else t.remove();}return html(f);
  };
  notaIncluir=function(){var t=$('nt-tx');if(t&&S(t.value))noteOpen=false;return nota();};
  snCard=function(){return sn().replace(/síntese · notas · sinalizações/g,'acompanhamento · notas · sinalizações').replace(/Síntese, notas e sinalizações/g,'Acompanhamento, notas e sinalizações');};
  cabeca=function(s){
    if(current!==G.cnj){current=G.cnj;open={};noteOpen=false;}
    var f=fragment(cab(s)),p=f.querySelector('.pc.pm');if(!p)return html(f);p.classList.add('pv-universal');
    p.querySelectorAll('.pm-tj:not(.sug)').forEach(function(x){x.remove();});
    var e=p.querySelector('.pm-esp'),ctx=p.querySelector('.pm-aut1');
    if(e){var tags=elem('div','pv-tags');S(V('triagem','Especificidades')).split(/[;|\n]+/).map(S).filter(Boolean).forEach(function(v){tags.append(elem('span','chip',v));});e.replaceWith(tags);}
    if(ctx){var l=ctx.querySelector('.pm-aut-t');if(l)l.textContent='Autuação e contexto';
      var sub=elem('div','pv-context');sub.append(field('triagem','Tema','Tipo de caso'),field('triagem','Especificidades','Especificidades',true),field('triagem','Síntese Fática','Síntese fática'));
      var q=elem('details','pv-sub');q.append(elem('summary','','Questões jurídicas'));add(q,questoes());sub.append(q);
      var ctl=ctx.querySelector('.pm-ctl2');if(ctl&&ctl.previousElementSibling)ctx.insertBefore(sub,ctl.previousElementSibling);else ctx.append(sub);}
    var pills=p.querySelector('.pm-pills');if(pills){var syn=field('triagem','Síntese Processual','Síntese');syn.classList.add('pv-synthesis');pills.before(syn);pills.replaceWith(flow());}
    var resp=p.querySelector('.pm-resp');if(resp)resp.classList.add('pv-enc');
    return html(f);
  };
  /* Move o seletor original para o contexto quando o roteiro está ativo.
     Não recria o motor nem as ações data-rt. */
  var renderBase=render0;
  render0=function(){
    renderBase();
    var ctx=caixa.querySelector('.pm-aut1'),sel=caixa.querySelector('.gbody .rt-tsel');
    if(ctx&&sel)ctx.insertBefore(sel,ctx.querySelector('.pv-context')||ctx.lastElementChild);
  };
  caixa.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-pv-field],[data-pv-note]');if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(b.hasAttribute('data-pv-note')){noteOpen=!noteOpen;render();var t=$('nt-tx');if(t)t.focus();return;}
    var id=b.getAttribute('data-pv-field');open[id]=!open[id];render();
    if(open[id]){var c=Array.from(caixa.querySelectorAll('textarea[data-fk],input[data-fk],select[data-fk]')).find(function(x){return x.dataset.fk===id;});if(c)c.focus();}
  },true);
  /* Navegação por teclado na ordem visual, sem alcançar atalhos ocultos. */
  var nav=document.querySelector('.nav[role="tablist"]');
  if(nav)nav.addEventListener('keydown',function(e){
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
    var tabs=Array.from(nav.querySelectorAll('.pv-nav-row button[role="tab"]:not([hidden])')).filter(function(x){return !x.disabled;});
    var i=tabs.indexOf(e.target);if(i<0||!tabs.length)return;
    var n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+tabs.length)%tabs.length;
    e.preventDefault();e.stopImmediatePropagation();tabs[n].click();tabs[n].focus();
  },true);
  document.body.classList.add('pv-universal-body');
})();