/* ================= CONSULTA · MATRIZ MODULAR 28,86% (ACP 0005019-15.1997.4.03.6000) =================
   Base: modelos/matrizes-2886.json (BASE.m2886). Recebe o caso da Consulta (pauta, cartão ou prontuário colado),
   escolhe o grupo e os módulos, preenche as variáveis e monta relatório, voto, ementa e acórdão. */
(function(){
  var S={proc:null,g:'',on:{},ver:{},um:{},val:{},porque:{},manual:{},em:'',em1:'rel'};
  function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function nq(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
  function M(){return (typeof BASE!=="undefined"&&BASE&&BASE.m2886)||null;}
  function modu(id){var D=M();for(var i=0;i<D.modulos.length;i++)if(D.modulos[i].id===id)return D.modulos[i];return null;}
  function vdef(id){var D=M();for(var i=0;i<D.variaveis.length;i++)if(D.variaveis[i].id===id)return D.variaveis[i];return {id:id,rotulo:id};}
  function grp(id){var D=M();for(var i=0;i<D.grupos.length;i++)if(D.grupos[i].id===id)return D.grupos[i];return null;}
  /* ---------- texto do caso: tudo o que veio do cartão ou do prontuário ---------- */
  function textoCaso(P,J){
    var L=[P.assunto,P.subassuntos,P.especificidades,P.questoes,P.sintese,P.decisaoOrigem,(P.recursos||[]).join(' '),P.honorarios,P.resultado,P.tipoJulgamento];
    if(J){var C=J.campos||{};Object.keys(C).forEach(function(k){if(typeof C[k]==='string')L.push(C[k]);});
      (J.pendencias||[]).forEach(function(x){L.push(x);});var A=J.analise||{};L.push(A.resumo);(A.questoes||[]).forEach(function(x){L.push(x);});(A.cuidados||[]).forEach(function(x){L.push(x);});
      if(J.modelo)L.push(J.modelo.id,J.modelo.nome,J.modelo.ajustes);(J.papeis||[]).forEach(function(x){L.push(x.parte+' '+x.papel+' '+(x.polo||''));});(J.pecas||[]).forEach(function(x){L.push(x.desc);});}
    return L.filter(Boolean).join(' \n ');
  }
  function e2886(P,J){var t=nq(textoCaso(P,J));return /28[,.]\s?86|0005019-15\.1997/.test(t)||!!(J&&J.modelo&&/^2886-/.test(J.modelo.id||''));}
  /* ---------- grupo ---------- */
  function grupoAuto(P,J,T){
    var m=J&&J.modelo&&/^2886-([0-9a-z-]+)/i.exec(J.modelo.id||''),de='código do prontuário';
    if(!m){m=/\b2886-(3d|[1-9][a-z]?(?:-esp)?)\b/i.exec(T);de='código no prontuário (especificidades/observação)';}
    if(m){var c=m[1].toLowerCase();if(c==='3d')return ['3d',de+' 2886-3d'];return [c.charAt(0),de+' 2886-'+c];}
    var t=nq(T),tj=nq(P.tipoJulgamento||'');
    if(/embargos de declaracao/.test(tj))return /550|acordo|siape|sicap/.test(t)?['3d','embargos de declaração sobre acordo']:['8','embargos de declaração'];
    if(/agravo interno/.test(tj))return ['9','agravo interno'];
    if(/dissociad|dialeticidade/.test(t))return ['7','razões dissociadas'];
    if(/sindicat|sindsprev/.test(t))return ['4','sindicato'];
    if(/bacen|banco central/.test(t)&&/ilegitimidade passiva/.test(t))return ['6','BACEN e ilegitimidade passiva'];
    if(/bacen|banco central/.test(t)&&/gratuidade/.test(t)&&!/territorial/.test(t))return ['5','apelação do BACEN sobre a gratuidade'];
    var ac=/acordo|siape|fichas financeiras|transacao/.test(t),te=/territorial|artigo 16|lei 7\.347|1\.075/.test(t);
    if(ac&&te)return ['2','limitação territorial e acordo'];
    if(ac)return ['3','acordo administrativo'];
    if(te)return ['1','limitação territorial'];
    return ['1','sem indicação: grupo 1 por padrão'];
  }
  /* ---------- versões e alternativas ---------- */
  function versaoAuto(id,g,t){
    if(id==='TERR-INTRO')return g==='2'?1:0;
    if(id==='SOB')return g==='6'?1:0;
    if(id==='GRAT-ORIG')return g==='2'?1:0;
    if(id==='ACORDO-INTRO')return g==='2'?0:(/924|quitad|quitacao/.test(t)?2:1);
    if(id==='ACORDO-FECHO')return g==='2'?0:1;
    if(id==='PRESC')return /herdeir|habilitac/.test(t)?1:0;
    if(id==='LITISP')return /coisa julgada/.test(t)?0:1;
    if(id==='NUL')return /interesse/.test(t)?1:0;
    if(id==='H-PREJ')return /honorarios recursais.{0,60}contrarraz|contrarraz.{0,80}honorarios recursais/.test(t)?1:0;
    if(id==='H-MAJ')return /acrescid/.test(t)?1:0;
    if(id==='H-331')return g==='3'?1:0;
    if(id==='SIND-INTRO')return /transac/.test(t)&&!/ilegitimidade ativa/.test(t)?1:0;
    if(id==='GRAT5-INTRO')return /embargos de declaracao|nao apreciad|omiss/.test(t)?1:(/resposta ao cumprimento|pedido de concessao/.test(t)?2:0);
    if(id==='DIAL-INTRO')return /acordo/.test(t)&&!/funasa/.test(t)?1:0;
    return 0;
  }
  function umAuto(alts,g,P,J,t){
    var hon=nq((P.honorarios||'')+' '+((J&&J.campos&&J.campos.honor)||''));
    if(alts.indexOf('ED-TERR')>=0)return /gratuidade/.test(t)&&!/territorial/.test(t)?['ED-GRAT','embargos sobre a gratuidade']:['ED-TERR','embargos sobre a limitação territorial'];
    if(/majorad/.test(hon)&&alts.indexOf('H-MAJ')>=0)return ['H-MAJ','honorários “Majorados” no caso'];
    if(/fixad/.test(hon)&&alts.indexOf('H-331')>=0)return ['H-331','honorários “Fixados” no caso'];
    if(/sem honorarios/.test(hon)&&g!=='1')return ['','“Sem honorários recursais” no caso'];
    if(g==='1'){
      var oh=nq((J&&J.campos&&J.campos['orig.honor'])||'');
      if(/honorari.{0,80}contrarraz|contrarraz.{0,120}honorari/.test(t))return ['H-PREJ','honorários pedidos em contrarrazões'];
      if(/condena|fixad|\d+ ?%/.test(oh)&&!/sem (condenacao|fixacao)/.test(oh))return ['H-REF','sentença condenou a parte exequente'];
      return ['','sem pedido de honorários'];
    }
    var gr=grp(g),hp=nq(gr.honorPadrao||'');
    if(/majorad/.test(hp)&&alts.indexOf('H-MAJ')>=0)return ['H-MAJ','padrão do grupo'];
    if(/fixad/.test(hp)&&alts.indexOf('H-331')>=0)return ['H-331','padrão do grupo'];
    return [alts[0]||'','padrão do grupo'];
  }
  /* ---------- variáveis a partir do prontuário ---------- */
  function preVal(P,J,g){
    var V={},C=(J&&J.campos)||{},rec=(J&&J.recursos)||[],es=String(C.especificidades||P.especificidades||'');
    if(C['orig.id'])V.sentenca_id=String(C['orig.id']).replace(/\D/g,'');
    var ap=rec.filter(function(r){return /apela|agravo|embargos/i.test(r.tipo||'');})[0];
    if(ap&&ap.id){V.apelacao_id=String(ap.id).replace(/\D/g,'');V.agint_id=V.apelacao_id;}
    if(ap&&ap.parte){var pa=nq(ap.parte);V.apelante=/uniao/.test(pa)?'a União':/bacen|banco central/.test(pa)?'o BACEN':'a parte exequente';}
    if(C['mpfx.id'])V.mpf_id=String(C['mpfx.id']).replace(/\D/g,'');
    if(C['adm.ajg']===false)V.clausula_gratuidade='';
    var f7=/F7[^·\n]*?\(ID\s*(\d{6,})/.exec(es);if(f7)V.fichas_id=f7[1];
    if(C['ed.id'])V.ed_id=String(C['ed.id']);
    if(C['agint.id'])V.decisao_agravada_id=String(C['agint.id']).replace(/\D/g,'');
    if(C['ed.vicio']){var vi=nq(C['ed.vicio']);V.ed_vicio=/mais de um/.test(vi)?'omissão e contradição':vi.indexOf('contradi')>=0?'contradição':vi.indexOf('obscur')>=0?'obscuridade':'omissão';}
    var acc=[C['orig.custas'],C['orig.honor']].filter(function(x){return x&&String(x).trim();});if(acc.length)V.rel_acessorios=', '+acc.join(', ').replace(/\.\s*$/,'').replace(/^./,function(c){return c.toLowerCase();});
    if(C['rel.razoes'])V.razoes=[].concat(C['rel.razoes']).join('; ');
    if(C['rel.contrarrazoes'])V.contrarrazoes=' '+[].concat(C['rel.contrarrazoes']).join('; ');
    if(C['orig.dispositivo'])V.sentenca_transcricao='“'+C['orig.dispositivo']+'”';
    var t=nq(textoCaso(P,J));
    if(/espolio/.test(t)){V.sujeito='o espólio';V.rel_exequente='promovido pelo espólio do servidor';}
    else if(/herdeir|sucessor/.test(t)){V.sujeito='os sucessores';V.rel_exequente=/pensionist/.test(t)?'promovido por herdeiros de pensionista falecida':'promovido por herdeiros do servidor falecido';}
    else if(/pensionist/.test(t)&&g==='1')V.rel_exequente='promovido por pensionista';
    return V;
  }
  /* ---------- estado ---------- */
  function preparar(P,J,forcar){
    if(S.proc===P.processo&&S.j===(J||null)&&!forcar)return;
    var T=textoCaso(P,J),t=nq(T),ga=grupoAuto(P,J,T);
    S={proc:P.processo,j:J||null,g:ga[0],gPorque:ga[1],on:{},ver:{},um:{},val:preVal(P,J,ga[0]),porque:{},manual:{},em:'',em1:'rel',mpf:0};
    aplicarGrupo(P,J,t);
    var sx=nq((J&&J.campos&&J.campos['mpfx.sentido'])||P.mpf||'');
    S.mpf=/nao provimento|desprovimento/.test(sx)?4:/provimento do recurso/.test(sx)?3:/outro/.test(sx)?1:0;
  }
  function aplicarGrupo(P,J,t){
    var G=grp(S.g);if(!G)return;S.on={};S.um={};S.porque={};
    G.receita.forEach(function(r,i){
      if(r.umDe){var a=umAuto(r.umDe,S.g,P,J,t);S.um[i]=a[0];S.porque['um'+i]=a[1];return;}
      var md=modu(r.mod);if(!md)return;
      if(!r.opcional){S.on[r.mod]=true;}
      else{var re=md.gatilho?new RegExp(md.gatilho,'i'):null,hit=re&&re.exec(t);
        S.on[r.mod]=!!(hit||r.padrao);S.porque[r.mod]=hit?'no caso: “'+hit[0]+'”':(r.padrao?'padrão do grupo':'');}
      if(S.ver[r.mod]==null)S.ver[r.mod]=Math.min(versaoAuto(r.mod,S.g,t),md.versoes.length-1);
    });
    G.receita.forEach(function(r){if(r.umDe)r.umDe.forEach(function(id){var md=id&&modu(id);if(md&&S.ver[id]==null)S.ver[id]=Math.min(versaoAuto(id,S.g,t),md.versoes.length-1);});});
    var rel=G.relatorio||{},pd=rel.padroes||{};Object.keys(pd).forEach(function(k){if(pd[k]&&S.val[k]==null)S.val[k]=pd[k];});
    S.em='';
  }
  /* ---------- montagem ---------- */
  function pecas(){
    var G=grp(S.g),out=[];if(!G)return out;
    G.receita.forEach(function(r,i){
      var id=r.umDe?S.um[i]:r.mod;if(!id)return;if(!r.umDe&&!S.on[id])return;
      if(id==='ADESIVO')return;
      if(id==='ACORDO-FECHO'&&S.g==='3'&&S.on['PRESC-PREJ'])return;
      var md=modu(id);if(!md)return;var v=md.versoes[Math.min(S.ver[id]||0,md.versoes.length-1)];
      out.push({id:id,titulo:md.titulo,ps:v.paragrafos,origem:v.origem,rotulo:v.rotulo,nota:md.nota});
    });
    out.push({id:'DISP',titulo:'Dispositivo',ps:[S.on['ADESIVO']?modu('ADESIVO').versoes[0].paragrafos[0]:G.dispositivo,'É como voto.'],origem:'fórmula do grupo'});
    return out;
  }
  function ementaEscolhida(){
    var D=M(),G=grp(S.g),on=Object.keys(S.on).filter(function(k){return S.on[k];}).concat(Object.keys(S.um).map(function(k){return S.um[k];}).filter(Boolean));
    var best=null,bs=-1;(G.modelosEmenta||[]).forEach(function(c){var E=D.ementas[c];if(!E)return;var ms=E.modulos||[],inter=ms.filter(function(x){return on.indexOf(x)>=0;}).length,uni={};
      ms.concat(on.filter(function(x){return /^(SOB|ILA|PRESC|PRESC-PREJ|LITISP|LITISP-PREJ|TUTELA|TRANS|PENS|GRAT-ORIG|MAFE|NUL|SUC|GRAT|SURPRESA|ILA-PREJ|H-PREJ|H-REF|H-MAJ|H-331|MULTA|ADESIVO|AGINT-SOB)$/.test(x);})).forEach(function(x){uni[x]=1;});
      var j=inter/Math.max(1,Object.keys(uni).length);if(j>bs||(j===bs&&best&&String(E.sessao||'').split('/').reverse().join('')>String(D.ementas[best].sessao||'').split('/').reverse().join(''))){bs=j;best=c;}});
    if(S.em&&D.ementas[S.em])best=S.em;
    return best?{cod:best,E:D.ementas[best],sim:bs}:null;
  }
  function ementaLinhas(){
    var x=ementaEscolhida();if(!x)return {cod:'',linhas:[]};
    var L=x.E.linhas.slice(),i1=-1;for(var i=0;i<L.length;i++)if(/^1\.\s/.test(L[i])){i1=i;break;}
    var ED=/^(8|3d|9)$/.test(S.g);
    if(i1>=0){if(!ED&&S.em1==='rel'){L[i1]='1. '+ITEM1;}else{if(S.val.ementa_item1==null||S.val._em!==x.cod){S.val.ementa_item1=L[i1].replace(/^1\.\s*/,'');S.val._em=x.cod;}L[i1]='1. {{ementa_item1}}';}}
    return {cod:x.cod,proc:x.E.processo,sessao:x.E.sessao,sim:x.sim,linhas:L};
  }
  var ITEM1='Em cumprimento de sentença {{rel_exequente}} na ACP 0005019-15.1997.4.03.6000 para incorporação a partir de janeiro de 1993 do reajuste de 28,86% (Leis 8.622/1993 e 8.627/1993) às remunerações de servidores públicos civis federais, ativos, inativos e pensionistas, a sentença, ora apelada, {{rel_sentenca}}{{rel_acessorios}}.';
  function relatorioLinhas(){
    var G=grp(S.g),R=(G&&G.relatorio)||{paragrafos:[]},L=R.paragrafos.slice();
    (R.opcionais||[]).forEach(function(o){if(S.on[o.id])L.push(o.texto);});
    if(R.mpf&&S.g!=='8'&&S.g!=='3d')L.push(R.mpf[Math.min(S.mpf||0,R.mpf.length-1)]);
    L.push('É o relatório.');return L;
  }
  function usadas(){
    var all=[].concat(relatorioLinhas());pecas().forEach(function(p){all=all.concat(p.ps);});all=all.concat(ementaLinhas().linhas);
    var u=[],vis={};all.join('\n').replace(/\{\{([a-z0-9_]+)\}\}/g,function(_,k){if(!vis[k]){vis[k]=1;u.push(k);}return '';});return u;
  }
  function valor(k){var v=S.val[k];if(v==null){var d=vdef(k);v=d.padrao!=null?d.padrao:'';}return String(v);}
  function preencher(t,html){
    var s=String(t).replace(/\[\[([\s\S]*?)\]\]/g,function(_,seg){var ok=true;seg.replace(/\{\{([a-z0-9_]+)\}\}/g,function(_,k){if(!valor(k).trim())ok=false;return '';});return ok?seg:'';});
    for(var n=0;n<3&&/\{\{/.test(s);n++){
      s=s.replace(/\{\{([a-z0-9_]+)\}\}/g,function(_,k){var v=valor(k);
        if(v.trim()===''&&!(k in S.val)&&vdef(k).padrao==null)return html?'\u0001F'+k+'\u0002':'[VALIDAR: '+vdef(k).rotulo+']';
        if(v.trim()===''&&vdef(k).tipo!=='opcoes')return html?'\u0001F'+k+'\u0002':'[VALIDAR: '+vdef(k).rotulo+']';
        return html&&v.trim()?'\u0001V'+k+'\u0003'+v+'\u0002':v;});
    }
    if(!html)return s;
    return e(s).replace(/\u0001F([a-z0-9_]+)\u0002/g,function(_,k){return '<span class="m28-falta" data-m28v="'+k+'">[VALIDAR: '+e(vdef(k).rotulo)+']</span>';})
      .replace(/\u0001V([a-z0-9_]+)\u0003([\s\S]*?)\u0002/g,function(_,k,v){return '<span class="fill" data-m28v="'+k+'">'+v+'</span>';});
  }
  function textoFinal(){
    var L=['RELATÓRIO',''];relatorioLinhas().forEach(function(p){L.push(preencher(p,false),'');});
    L.push('VOTO','');pecas().forEach(function(p){p.ps.forEach(function(x){L.push(preencher(x,false),'');});});
    var em=ementaLinhas();L.push('EMENTA','');em.linhas.forEach(function(x){L.push(preencher(x,false));});L.push('');
    var G=grp(S.g),res=S.on['ADESIVO']?'negou provimento à apelação e ao recurso adesivo':G.acordao;
    L.push('ACÓRDÃO','','Vistos e relatados estes autos em que são partes as acima indicadas, a Turma Regional de Mato Grosso do Sul, por unanimidade, '+res+', nos termos do relatório e voto que ficam fazendo parte integrante do presente julgado.');
    return L.join('\n').replace(/\n{3,}/g,'\n\n');
  }
  function htmlFinal(){return textoFinal().split(/\n{2,}/).map(function(b){var t=b.trim();if(/^(RELATÓRIO|VOTO|EMENTA|ACÓRDÃO)$/.test(t))return '<p style="text-align:center"><b>'+e(t)+'</b></p>';
    return b.split('\n').map(function(x){return '<p style="text-align:justify;text-indent:2.5cm;margin:0 0 8px">'+e(x)+'</p>';}).join('');}).join('');}
  /* ---------- conferência ---------- */
  function conferir(P,J){
    var L=[],add=function(s,k,t){L.push({s:s,k:k,t:t});},D=M(),G=grp(S.g);
    add(J&&J.modelo&&/^2886-/.test(J.modelo.id||'')?'ok':'pc','Grupo','Grupo '+S.g+' ('+G.nome+'): '+S.gPorque+'.'+(J&&J.modelo&&J.modelo.id?' Prontuário: '+J.modelo.id+'.':' Sem código 2886 no prontuário: conferir o enquadramento pela árvore.'));
    var res=P.resultado||(J&&J.campos&&J.campos.resJulg)||'';
    if(res)add(nq(res)===nq(G.resJulg)?'ok':'no','Resultado',nq(res)===nq(G.resJulg)?'Resultado do caso igual ao do grupo: '+G.resJulg+'.':'O caso registra “'+res+'”, e o grupo '+S.g+' fecha em “'+G.resJulg+'”. Não altere o resultado em silêncio: confira o grupo.');
    else add('pc','Resultado','Sem resultado no cartão ou no prontuário. O grupo fecha em “'+G.resJulg+'”.');
    var fal=usadas().filter(function(k){return !valor(k).trim()&&vdef(k).tipo!=='opcoes';});
    add(fal.length?'pc':'ok','Variáveis',fal.length?fal.length+' a preencher: '+fal.map(function(k){return vdef(k).rotulo;}).slice(0,6).join('; ')+(fal.length>6?'…':'')+'.':'Todas as variáveis preenchidas.');
    var on=Object.keys(S.on).filter(function(k){return S.on[k]&&/^(SOB|ILA|PRESC|PRESC-PREJ|LITISP|LITISP-PREJ|TUTELA|TRANS|PENS|GRAT-ORIG|MAFE|NUL|SUC|GRAT|SURPRESA|ILA-PREJ|MULTA|ADESIVO|AGINT-SOB)$/.test(k);})
      .concat(Object.keys(S.um).map(function(k){return S.um[k];}).filter(function(x){return /^H-/.test(x||'');})).sort();
    var chave=on.join(' + ')||'(só os núcleos)',cb=(D.combinacoes[S.g]||[]).filter(function(c){return c.modulos===chave;})[0];
    add(cb?'ok':'pc','Combinação',cb?'Combinação já julgada em '+cb.acordaos+' acórdão(s) do lote.':'Combinação ainda sem acórdão no lote ('+chave+'): conferir a ordem e as transições entre os módulos.');
    var hon=nq((P.honorarios||'')+' '+((J&&J.campos&&J.campos.honor)||'')).trim(),hm=G.receita.map(function(r,i){return r.umDe?S.um[i]:null;}).filter(function(x){return x!=null;})[0];
    if(hon)add((/majorad/.test(hon)&&hm==='H-MAJ')||(/fixad/.test(hon)&&hm==='H-331')||(/sem honorarios/.test(hon)&&!/H-MAJ|H-331/.test(hm||''))?'ok':'pc','Honorários','Caso: '+(P.honorarios||(J&&J.campos&&J.campos.honor)||'')+' · módulo: '+(hm?modu(hm).titulo:'nenhum')+'.');
    var em=ementaLinhas();if(em.cod)add('pc','Ementa','Base: modelo 2886-'+em.cod+' ('+em.proc+', '+em.sessao+'). '+(S.em1==='rel'&&!/^(8|3d|9)$/.test(S.g)?'Item 1 composto dos dados do relatório. ':'Adaptar o item 1. ')+'Conferir cabeçalho, questão, razões e dispositivo com os módulos usados.');
    pecas().forEach(function(p){var m=/^Grupo (\w+): /.exec(p.nota||'');if(p.nota&&(!m||m[1]===S.g))add('pc',p.titulo,m?p.nota.slice(m[0].length):p.nota);});
    if(S.on['PRESC-PREJ']&&S.g==='2')add('pc','Prescrição','No grupo 2 a frase da prescrição prejudicada vem depois do fecho próprio do grupo: conferir a redação.');
    return L;
  }
  /* ---------- tela ---------- */
  function canhoto(P,J){
    var D=M(),G=grp(S.g),h='<div class="dcan-h"><span>MATRIZ 28,86%</span><small>grupo, módulos e variáveis</small></div><div class="dcan">';
    h+='<div class="cf"><div class="cfl"><span>Grupo</span><span class="pill">'+e(S.g)+'</span></div><div class="m28-gs">'+D.grupos.map(function(x){return '<button data-m28g="'+e(x.id)+'" aria-pressed="'+(x.id===S.g)+'" title="'+e(x.nome)+'">'+e(x.id)+'</button>';}).join('')+'</div><p class="meta">'+e(G.nome)+'</p></div>';
    h+='<div class="cf"><div class="cfl"><span>Módulos do voto</span></div><div class="m28-ml">';
    G.receita.forEach(function(r,i){
      if(r.umDe){h+='<div class="m28-m"><div class="m28-mt"><b>Honorários / alternativa</b>'+(S.porque['um'+i]?'<small>'+e(S.porque['um'+i])+'</small>':'')+'</div><select data-m28um="'+i+'">'+
        r.umDe.map(function(id){return '<option value="'+e(id)+'"'+(S.um[i]===id?' selected':'')+'>'+e(id?modu(id).titulo:'nenhum')+'</option>';}).join('')+'</select>'+verSel(S.um[i])+'</div>';return;}
      var md=modu(r.mod);if(!md)return;
      h+='<div class="m28-m'+(S.on[r.mod]?' on':'')+'"><label class="m28-mt"><input type="checkbox" data-m28m="'+e(r.mod)+'"'+(S.on[r.mod]?' checked':'')+(r.opcional?'':' disabled')+'><b>'+e(md.titulo)+'</b>'+
        (r.opcional?(S.porque[r.mod]?'<small>'+e(S.porque[r.mod])+'</small>':'<small>opcional</small>'):'<small>núcleo</small>')+'</label>'+(S.on[r.mod]?verSel(r.mod):'')+'</div>';
    });
    h+='</div></div>';
    var R=G.relatorio||{};
    if(R.mpf&&S.g!=='8'&&S.g!=='3d')h+='<div class="cf"><div class="cfl"><span>Parecer do MPF</span></div><select class="m28-sel" data-m28mpf="1">'+R.mpf.map(function(t,i){return '<option value="'+i+'"'+(i===S.mpf?' selected':'')+'>'+e(t.replace(/\[\[.*?\]\]/g,'').slice(0,90))+'</option>';}).join('')+'</select></div>';
    (R.opcionais||[]).forEach(function(o){h+='<div class="cf"><label class="m28-mt"><input type="checkbox" data-m28m="'+e(o.id)+'"'+(S.on[o.id]?' checked':'')+'><b>Relatório: '+e(o.titulo)+'</b></label></div>';});
    var ex=ementaEscolhida();
    if(ex)h+='<div class="cf"><div class="cfl"><span>Ementa-base</span></div><select class="m28-sel" data-m28em="1">'+(G.modelosEmenta||[]).filter(function(c){return D.ementas[c];}).map(function(c){return '<option value="'+e(c)+'"'+(c===ex.cod?' selected':'')+'>2886-'+e(c)+' · '+e(D.ementas[c].processo)+'</option>';}).join('')+'</select>'+(/^(8|3d|9)$/.test(S.g)?'':'<select class="m28-sel" data-m28em1="1"><option value="rel"'+(S.em1==='rel'?' selected':'')+'>Item 1: composto dos dados do relatório</option><option value="modelo"'+(S.em1==='modelo'?' selected':'')+'>Item 1: texto do modelo, para adaptar</option></select>')+'</div>';
    var us=usadas();
    h+='<div class="cf"><div class="cfl"><span>Variáveis do caso</span><span class="pill">'+us.length+'</span></div>'+us.map(function(k){var d=vdef(k),v=valor(k),id='m28v-'+k;
      var inp=d.tipo==='longo'?'<textarea id="'+id+'" data-m28in="'+e(k)+'" rows="3">'+e(v)+'</textarea>'
        :'<input id="'+id+'" data-m28in="'+e(k)+'" value="'+e(v)+'"'+(d.opcoes?' list="'+id+'-l"':'')+' autocomplete="off">'+(d.opcoes?'<datalist id="'+id+'-l">'+d.opcoes.map(function(o){return '<option value="'+e(o)+'">';}).join('')+'</datalist>':'');
      return '<div class="m28-v'+(!v.trim()&&d.tipo!=='opcoes'?' falta':'')+'"><label for="'+id+'">'+e(d.rotulo)+(d.campo?' <small>· '+e(d.campo)+'</small>':'')+'</label>'+inp+(d.ajuda?'<p class="meta">'+e(d.ajuda)+'</p>':'')+'</div>';}).join('')+'</div>';
    h+='<div class="cf"><button class="dbt" data-m28reset="1">Refazer a escolha automática</button></div>';
    return h+'</div>';
  }
  function verSel(id){var md=id&&modu(id);if(!md||md.versoes.length<2)return '';var vi=Math.min(S.ver[id]||0,md.versoes.length-1);
    return '<div class="vs m28-vs">'+md.versoes.map(function(v,i){return '<button data-m28ver="'+e(id)+':'+i+'" aria-pressed="'+(i===vi)+'">'+e(v.rotulo)+'</button>';}).join('')+'</div>';}
  function folha(P,J){
    var G=grp(S.g),h='<div class="cqs"><div class="dpj">MINUTA · MATRIZ MODULAR 28,86% <small>· grupo '+e(S.g)+' · '+e(G.nome)+'</small></div><div class="cqf m28-f">';
    h+='<div class="m28-acts"><button class="cq-go" data-m28cp="1">Copiar a minuta</button><button class="dbt" data-m28cp="txt">Copiar como texto</button><span class="meta">Variáveis em amarelo; faltas em vermelho.</span></div>';
    h+='<div class="cqb"><div class="band"><span class="bl">RELATÓRIO</span></div><div class="dbody">'+relatorioLinhas().map(function(p){return '<p class="std">'+preencher(p,true)+'</p>';}).join('')+'</div></div>';
    pecas().forEach(function(p,i){h+='<div class="cqb"><div class="band"><span class="bl">'+(i===0?'VOTO · ':'')+e(p.titulo)+'</span>'+(p.rotulo&&p.rotulo!=='padrão'?'<span class="pill op">'+e(p.rotulo)+'</span>':'')+'<span class="dsp"></span><span class="drn">'+e(p.origem||'')+'</span></div><div class="dbody">'+
      p.ps.map(function(x){return '<p class="std">'+preencher(x,true)+'</p>';}).join('')+'</div></div>';});
    var em=ementaLinhas();
    h+='<div class="cqb"><div class="band"><span class="bl">EMENTA</span><span class="dsp"></span><span class="drn">'+(em.cod?'base 2886-'+e(em.cod)+' · '+e(em.proc):'')+'</span></div><div class="dbody">'+em.linhas.map(function(x){return '<p>'+preencher(x,true)+'</p>';}).join('')+'</div></div>';
    var res=S.on['ADESIVO']?'negou provimento à apelação e ao recurso adesivo':G.acordao;
    h+='<div class="cqb"><div class="band"><span class="bl">ACÓRDÃO</span></div><div class="dbody"><p class="std">Vistos e relatados estes autos em que são partes as acima indicadas, a Turma Regional de Mato Grosso do Sul, por unanimidade, '+e(res)+', nos termos do relatório e voto que ficam fazendo parte integrante do presente julgado.</p></div></div>';
    return h+'</div></div>';
  }
  function painel(P,J){
    var C=conferir(P,J),mau=C.filter(function(z){return z.s!=='ok';}).length,D=M();
    var h='<div class="dori"><p class="kick2"><span>Conferência da matriz</span><span>'+(C.length-mau)+'/'+C.length+'</span></p><div class="cqc">'+
      C.map(function(z){return '<div class="cqi '+z.s+'"><div class="cqih"><b>'+e(z.k)+'</b><i>'+(z.s==='ok'?'em ordem':z.s==='pc'?'conferir':'falta')+'</i></div><p>'+e(z.t)+'</p></div>';}).join('')+'</div>';
    h+='<div class="cqacs"><button class="dbt" data-m28sair="1">Voltar à Consulta comum</button></div></div>';
    h+='<div class="dori"><p class="kick2"><span>Combinações julgadas · grupo '+e(S.g)+'</span><span>'+((D.combinacoes[S.g]||[]).length)+'</span></p><ul class="m28-cb">'+
      (D.combinacoes[S.g]||[]).map(function(c){return '<li><b>'+c.acordaos+'×</b> '+e(c.modulos)+'</li>';}).join('')+'</ul><p class="meta">'+e(D.fonte.descricao)+'</p></div>';
    return h;
  }
  function copiar(txt){
    var t=textoFinal();
    if(!txt&&window.ClipboardItem&&navigator.clipboard&&navigator.clipboard.write){
      return navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([htmlFinal()],{type:'text/html'}),'text/plain':new Blob([t],{type:'text/plain'})})]);}
    return navigator.clipboard.writeText(t);
  }
  /* ---------- API usada pela Consulta ---------- */
  var CTX={};
  function desenhar(){var P=CTX.P,J=CTX.J;CTX.can.innerHTML=canhoto(P,J);CTX.mn.innerHTML=folha(P,J);CTX.or.innerHTML=painel(P,J);ligar();}
  function redesenharSemCanhoto(){CTX.mn.innerHTML=folha(CTX.P,CTX.J);CTX.or.innerHTML=painel(CTX.P,CTX.J);ligarFolha();}
  function q(sel,fn,ev){Array.prototype.forEach.call(document.querySelectorAll(sel),function(b){b[ev||'onclick']=function(x){fn(b,x);};});}
  function ligarFolha(){
    q('#cq-main [data-m28cp]',function(b){copiar(b.getAttribute('data-m28cp')==='txt').then(function(){b.textContent='Copiado';setTimeout(function(){b.textContent=b.getAttribute('data-m28cp')==='txt'?'Copiar como texto':'Copiar a minuta';},1600);},function(){b.textContent='Não foi possível copiar';});});
    q('#cq-main [data-m28v]',function(b){var el=document.getElementById('m28v-'+b.getAttribute('data-m28v'));if(el){el.focus();el.scrollIntoView({block:'center'});}});
    q('#cq-ori [data-m28sair]',function(){CTX.CQ.m28=false;CTX.voltar();});
  }
  function ligar(){
    var t=nq(textoCaso(CTX.P,CTX.J));
    q('#cq-can [data-m28g]',function(b){S.g=b.getAttribute('data-m28g');S.gPorque='escolhido à mão';S.ver={};aplicarGrupo(CTX.P,CTX.J,t);desenhar();});
    q('#cq-can [data-m28m]',function(b){S.on[b.getAttribute('data-m28m')]=b.checked;S.porque[b.getAttribute('data-m28m')]='marcado à mão';desenhar();},'onchange');
    q('#cq-can [data-m28um]',function(b){S.um[+b.getAttribute('data-m28um')]=b.value;S.porque['um'+b.getAttribute('data-m28um')]='escolhido à mão';desenhar();},'onchange');
    q('#cq-can [data-m28ver]',function(b){var x=b.getAttribute('data-m28ver').split(':');S.ver[x[0]]=+x[1];desenhar();});
    q('#cq-can [data-m28mpf]',function(b){S.mpf=+b.value;desenhar();},'onchange');
    q('#cq-can [data-m28em]',function(b){S.em=b.value;S.val.ementa_item1=null;desenhar();},'onchange');
    q('#cq-can [data-m28em1]',function(b){S.em1=b.value;desenhar();},'onchange');
    q('#cq-can [data-m28in]',function(b){S.val[b.getAttribute('data-m28in')]=b.value;b.parentNode.classList.toggle('falta',!b.value.trim()&&vdef(b.getAttribute('data-m28in')).tipo!=='opcoes');redesenharSemCanhoto();},'oninput');
    q('#cq-can [data-m28reset]',function(){preparar(CTX.P,CTX.J,true);desenhar();});
    ligarFolha();
  }
  window.M2886={
    disponivel:function(){return !!M();},
    e2886:function(P,J){return e2886(P||{},J||null);},
    render:function(P,J,els,CQ,voltar){CTX={P:P,J:J,can:els.can,mn:els.mn,or:els.or,CQ:CQ,voltar:voltar};preparar(P,J);desenhar();},
    estado:function(){return S;},texto:textoFinal
  };
})();
