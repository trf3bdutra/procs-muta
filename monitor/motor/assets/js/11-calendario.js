

/* =====================================================================
   CMTCalendario · painel de sessões para o topo do Monitor
   Uso no Monitor: CMTCalendario.montar(elemento, calendario, extras)
     calendario = acervo/sessoes/calendario.json (schema gabcmt.calendario-sessoes)
     extras.progresso[date] = {minutadas, corrigidas, liberadas}  (de acervo/sessoes/<date>.json)
     extras.feriados = [[iso, nome]], extras.recesso = [ini, fim]
     extras.abrir(date) = abre a sessão em Pautas
   ===================================================================== */
(function(){
const MK=[['pautarAte','Peço dia','ti-send'],['inicioPreparacao','Início da preparação','ti-pencil'],['entregaMinutas','Entrega das minutas','ti-file-text'],['liberacao','Liberação','ti-lock-open'],['date','Sessão','ti-gavel']];
const CORES=['#006291','#8a5cb8','#1a8a6a','#c46a1f','#b0406a','#3e72ad'];
const DIA=864e5, P=s=>new Date(s+'T12:00:00'), F=s=>s.slice(8,10)+'/'+s.slice(5,7), iso=d=>d.toISOString().slice(0,10);
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
function montar(el,cal,ex){
  ex=ex||{}; const hoje=ex.hoje||iso(new Date());
  const st={vista:ls.get('cc_vista2','ambos'),semRef:null,foco:null,passo:ls.get('cc_passo','mes'),alx:false,dia:null,tl:ls.get('cc_tl',false),off:ls.get('cc_off',[]),min:ls.get('cc_min',false),ini:null,mes:null};
  const ses=cal.sessoes.map((s,i)=>({...s,corFixa:s.cor||'',cor:s.cor||CORES[i%CORES.length]}))
    .filter(s=>s.date>=iso(new Date(P(hoje)-45*DIA)));
  ses.forEach((s,i)=>s.cor=s.corFixa||(s.date<hoje?'#8a98a3':CORES[i%CORES.length]));
  const focoPad=()=>{const n=ses.find(x=>x.date>=hoje);return n&&n.date};
  const marcos=s=>MK.filter(m=>(m[0]==='date'?s.date:s.marcos[m[0]])).map(([k,n,ic])=>({k,n,ic,d:k==='date'?s.date:s.marcos[k]}));
  const prog=s=>(ex.progresso||{})[s.date]||{minutadas:0,corrigidas:0,liberadas:0};
  function estado(s,m){
    if(m.d<hoje){ if(m.k==='pautarAte'&&!s.processos) return 'late'; if(m.k==='entregaMinutas'&&prog(s).minutadas<s.processos) return 'late'; return 'done';}
    const prox=marcos(s).find(x=>x.d>=hoje); return prox&&prox.k===m.k?'next':'fut';
  }
  function alertas(){
    const A=[];
    ses.filter(s=>s.date>=hoje).forEach(s=>{
      const ms=marcos(s), dias=d=>Math.round((P(d)-P(hoje))/DIA);
      if(s.marcos.pautarAte<hoje&&!s.processos) A.push(['r','ti-alert-triangle',`${F(s.date)} · peço dia venceu em ${F(s.marcos.pautarAte)} e a sessão não tem pauta`,s]);
      const nx=ms.find(m=>m.d>=hoje&&m.k!=='date');
      if(nx&&dias(nx.d)<=10){
        let t=`${F(s.date)} · ${nx.n.toLowerCase()} em ${dias(nx.d)} dia(s)`;
        if(nx.k==='entregaMinutas') t+=` · ${s.processos-prog(s).minutadas} de ${s.processos} sem minuta`;
        A.push([nx.k==='pautarAte'?'g':'y',nx.k==='pautarAte'?'ti-send':'ti-clock',t,s]);
      }
      if(!s.marcos.inicioPreparacao&&s.date<iso(new Date(+P(hoje)+40*DIA))) A.push(['y','ti-calendar-question',`${F(s.date)} · preparação, minutas e liberação sem data`,s]);
    });
    const dd0=x=>Math.round((P(x)-P(hoje))/DIA), PZ=[];
    itens().filter(i=>i.tipo==='prazo'&&i.data&&i.data>=hoje&&dd0(i.data)<=10).sort((a,b)=>a.data.localeCompare(b.data)).forEach(i=>{const n=dd0(i.data);
      PZ.push(['r','ti-alert-triangle',`⚑ ${i.titulo} · prazo-limite ${n===0?'hoje':n===1?'amanhã':'em '+n+' dias ('+F(i.data)+')'}${i.quem?' · '+i.quem:''}`,{date:''}]);});
    const AH=ausDia(hoje); if(AH.length) PZ.push(['y','ti-bell',`Ausentes hoje: ${AH.map(a=>a.quem+' ('+a.sub.toLowerCase()+(a.sit==='prevista'?', prevista':'')+')').join(', ')}`,{date:''}]);
    const U=PZ.concat(doDia(hoje,'alerta').map(x=>['y','ti-bell',`${x.hora?x.hora+' · ':''}${x.quem?x.quem+': ':''}${x.o}${x.s.date?' · sessão '+F(x.s.date):''}`,x.s.date?x.s:{date:''}]));
    return U.concat(A.slice(0,4));
  }
  function tip(e,s,m){
    const p=prog(s), n=s.processos||0, dias=Math.round((P(m.d)-P(hoje))/DIA);
    const quando=dias===0?'hoje':dias>0?`faltam ${dias} dia(s)`:`há ${-dias} dia(s)`;
    const pr=m.k==='entregaMinutas'?p.minutadas:m.k==='liberacao'?p.liberadas:null;
    t.innerHTML=`<div class="k">Sessão ${F(s.date)}${s.hora?' · '+s.hora:''} · ${m.n}</div><b>${F(m.d)}/${m.d.slice(0,4)} · ${quando}</b><br>
      ${n?`Pautados ${n} · minutadas ${p.minutadas} · corrigidas ${p.corrigidas} · liberadas ${p.liberadas}`:'Nenhum processo pautado ainda'}
      ${pr!=null&&n?`<div class="bar"><i style="width:${Math.round(pr/n*100)}%"></i></div>`:''}
      <div class="go">clique para abrir a sessão em Pautas →</div>`;
    t.hidden=false; const r=el.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
    t.style.left=(x+320>r.width?x-314:x+14)+'px'; t.style.top=(y+150>r.height?y-t.offsetHeight-10:y+16)+'px';
  }
  function bola(s,m,sz,extra){
    const e=estado(s,m), c=e==='late'?'#c0392b':s.cor;
    const bg=e==='done'?s.cor:e==='late'?'#fdecea':'#fff', fg=e==='done'?'#fff':c;
    return `<span class="cc-m${e==='next'?' nx':''}" data-s="${s.date}" data-k="${m.k}" style="--c:${s.cor}66;width:${sz}px;height:${sz}px;background:${bg};color:${fg};border-color:${c};font-size:${Math.round(sz*.5)}px;${extra||''}"><i class="ti ${m.ic}"></i></span>`;
  }
  function semanas(vis){
    const ini=st.ini||iso(new Date(P(hoje)-14*DIA)), fim=iso(new Date(+P(ini)+70*DIA));
    const X0=150, W=el.clientWidth-40-24-X0-20, x=d=>X0+(P(d)-P(ini))/(P(fim)-P(ini))*W;
    const vs=vis.filter(s=>s.date>=ini&&(s.marcos.pautarAte||s.date)<=fim);
    let h='', H=34+vs.length*74;
    for(let d=P(ini);d<=P(fim);d=new Date(+d+DIA)) if(d.getDay()===1){const px=x(iso(d));h+=`<div class="cc-tk" style="left:${px}px"></div><div class="cc-tkl" style="left:${px+3}px">${F(iso(d))}</div>`;}
    (ex.feriados||[]).filter(f=>f[0]>=ini&&f[0]<=fim).forEach(f=>h+=`<div class="cc-fr" style="left:${x(f[0])-1}px"></div><div class="cc-frl" style="left:${x(f[0])+4}px">${f[1]}</div>`);
    if(ex.recesso&&ex.recesso[0]<=fim) h+=`<div class="cc-rec" style="left:${Math.max(X0,x(ex.recesso[0]))}px"></div><div class="cc-frl" style="left:${x(ex.recesso[0])+4}px;top:22px">recesso</div>`;
    if(hoje>=ini&&hoje<=fim) h+=`<div class="cc-hjc" style="left:${x(hoje)-W/140}px;width:${W/70}px"></div><div class="cc-hj" style="left:${x(hoje)}px"></div><div class="cc-hjl" style="left:${x(hoje)}px">HOJE</div>`;
    vs.forEach((s,i)=>{
      const y=44+i*74, ms=marcos(s), a=Math.max(X0,x(ms[0].d)), b=Math.min(X0+W,x(s.date));
      const p=prog(s);
      const dd=Math.round((P(s.date)-P(hoje))/DIA), pc=s.processos?Math.round(p.minutadas/s.processos*100):0;
      h+=`<div class="cc-lab" style="top:${y-14}px"><b><i style="width:10px;height:10px;border-radius:50%;background:${s.cor}"></i>${F(s.date)}${s.hora?' · '+s.hora:''}<span class="cc-cd" style="color:${s.cor}">${dd<0?'encerrada':dd===0?'hoje':'em '+dd+' d'}</span></b>${s.processos?`${s.processos} pautados · ${pc}% minutado<span class="cc-pb"><i style="width:${pc}%;background:${s.cor}"></i></span>`:'<span style="color:#c0392b">sem pauta</span>'}</div>`;
      const dash=ms.length<=2?`background:repeating-linear-gradient(90deg,${s.cor} 0 7px,transparent 7px 12px)`:`background:${s.cor}`;
      h+=`<div class="cc-ln" style="left:${a}px;width:${Math.max(0,b-a)}px;top:${y-1}px;${dash};${s.date<hoje?'opacity:.45':''}"></div>`;
      if(ms.length<=2) h+=`<div style="position:absolute;left:${(a+b)/2}px;top:${y+8}px;transform:translateX(-50%);font-size:10px;font-style:italic;color:${s.cor};white-space:nowrap">datas intermediárias a definir</div>`;
      ms.forEach(m=>{ if(m.d<ini||m.d>fim) return; const sz=m.k==='date'?32:24;
        h+=`<div style="position:absolute;left:${x(m.d)}px;top:${y}px">${bola(s,m,sz,s.date<hoje?'opacity:.55':'')}</div><div class="cc-md" style="left:${x(m.d)}px;top:${y+18}px">${F(m.d)}</div>`;});
    });
    return `<div class="cc-tl" style="height:${H}px">${h}</div>`;
  }
  /* ex.meses = 2: dois meses lado a lado na vista Mês (Chefia) */
  function mes(vis,b0){
    const base=b0||st.mes||hoje.slice(0,7), [Y,M]=base.split('-').map(Number), d1=new Date(Y,M-1,1,12), n=new Date(Y,M,0).getDate();
    const fer=Object.fromEntries(ex.feriados||[]); const ult=`${base}-${String(n).padStart(2,'0')}`; vis=vis.filter(s=>marcos(s)[0].d<=ult&&s.date>=`${base}-01`); let h=['seg','ter','qua','qui','sex'].map(d=>`<div class="cc-wd">${d}</div>`).join('');
    const pad0=(d1.getDay()+6)%7, pad=pad0>=5?0:pad0; for(let i=0;i<pad;i++) h+='<div class="cc-c cc-o"></div>';
    for(let dd=1;dd<=n;dd++){
      const d=`${base}-${String(dd).padStart(2,'0')}`, wd=(pad0+dd-1)%7; if(wd>=5) continue;
      let lanes='';
      vis.forEach(s=>{const ms=marcos(s), a=ms[0].d, b=s.date; let l='',dot='';
        if(d>=a&&d<=b){const dash=ms.length<=2?`background:repeating-linear-gradient(90deg,${s.cor} 0 6px,transparent 6px 10px)`:`background:${s.cor}`;
          l=`<i class="l" style="left:${d>a?0:'50%'};right:${d<b?0:'50%'};${dash};${s.date<hoje?'opacity:.45':''}"></i>`;}
        const m=ms.find(x=>x.d===d); if(m){const e=estado(s,m); dot=bola(s,m,m.k==='date'?19:16)+`<span class="t" style="color:${e==='late'?'#c0392b':s.cor}">${({pautarAte:'Peço dia',inicioPreparacao:'Preparação',entregaMinutas:'Minutas',liberacao:'Liberação',date:'Sessão '+F(s.date)})[m.k]}</span>`;}
        lanes+=`<div class="cc-lane">${l}${dot}</div>`;});
      const sR0=P(st.semRef||hoje), semR=sR0.getDay()%6?sR0:new Date(+sR0+(sR0.getDay()===6?2:1)*DIA), sg=iso(new Date(+semR-((semR.getDay()+6)%7)*DIA)), sd=iso(new Date(+P(sg)+6*DIA));
      h+=`<div class="cc-c${fer[d]?' cc-fe':wd>=5?' cc-fds':''}${d===hoje?' cc-hoje':''}${d>=sg&&d<=sd?' cc-sw':''}${d===(st.dia||hoje)&&d!==hoje?' cc-sel':''}" data-d="${d}"><span class="cc-n">${dd}${fer[d]?` <small>${fer[d]}</small>`:''}</span>${lanes}${doDia(d,'evento').map(x=>`<div class="cc-evt" style="--c:${x.s.cor}">${x.hora?x.hora+' ':''}${x.o}</div>`).join('')}${extrasDia(d,'m')}</div>`;
    }
    return `<div class="cc-g">${h}</div>`;
  }
  function semanaFaixa(vis){
    const r0=P(st.semRef||hoje), ref=r0.getDay()%6?r0:new Date(+r0+(r0.getDay()===6?2:1)*DIA), seg=new Date(+ref-((ref.getDay()+6)%7)*DIA);
    const dias=[...Array(5)].map((_,i)=>iso(new Date(+seg+i*DIA)));
    const fer=Object.fromEntries(ex.feriados||[]);
    const cols=dias.map((d,i)=>{
      const evs=[]; vis.forEach(s=>marcos(s).forEach(m=>{if(m.d===d) evs.push([s,m]);}));
      const corre=vis.filter(s=>{const ms=marcos(s);return d>ms[0].d&&d<s.date&&!evs.some(e=>e[0]===s)});
      return `<div class="cc-wc${d===hoje?' cc-hoje':''}${d===(st.dia||hoje)&&d!==hoje?' cc-sel':''}${fer[d]?' cc-fe':i>=5?' cc-fds':''}" data-dia="${d}">
        <div class="cc-wh"><b>${FD(d,{weekday:'short'}).replace('.','')}, ${P(d).getDate()} ${FD(d,{month:'short'}).replace('.','')}</b>${d===hoje?'<span class="cc-hb">hoje</span>':''}${fer[d]?`<small>${fer[d]}</small>`:''}</div>
        ${doDia(d,'evento').map(x=>`<div class="cc-evt cc-evw" style="--c:${x.s.cor}"><b>${x.hora||'dia todo'}</b> ${x.o}${x.s.date?' · sessão '+F(x.s.date):''}</div>`).join('')}${extrasDia(d,'w')}
        ${evs.map(([s,m])=>{const e=estado(s,m),p=prog(s),c=e==='late'?'#c0392b':s.cor;
          const det=m.k==='entregaMinutas'?`${p.minutadas}/${s.processos} minutadas`:m.k==='liberacao'?`${p.liberadas}/${s.processos} liberadas`:m.k==='pautarAte'?(s.processos?`${s.processos} pautados`:'sem pauta'):m.k==='inicioPreparacao'?`${s.processos} a minutar`:`${s.processos} processos`;
          return `<div class="cc-we" data-s="${s.date}" data-k="${m.k}" style="border-color:${c};background:${e==='done'?s.cor+'14':e==='late'?'#fdecea':'#fff'}">
            ${bola(s,m,22)}<div><b style="color:${c}">${m.n}</b><span>Sessão ${F(s.date)} · ${det}</span></div></div>`;}).join('')}
        ${corre.map(s=>`<div class="cc-wr" style="border-color:${s.cor}"><i style="background:${s.cor}"></i>${F(s.date)} em curso</div>`).join('')}
        ${!evs.length&&!corre.length&&!extrasDia(d,'w')&&!doDia(d,'evento').length?'<div class="cc-wv">sem marcos</div>':''}</div>`;}).join('');
    return `<div class="cc-wk"><div class="cc-wt"><b>Semana de ${P(dias[0]).getDate()}${dias[0].slice(5,7)!==dias[4].slice(5,7)?' de '+MESL(dias[0]):''} a ${P(dias[4]).getDate()} de ${MESL(dias[4])}</b><small>clique num dia do mês para trocar a semana</small>
      <span class="cc-sp"><button class="cc-ib" data-a="wprev" title="Semana anterior"><i class="ti ti-chevron-left"></i></button><button class="cc-ib" data-a="wnext" title="Próxima semana"><i class="ti ti-chevron-right"></i></button></span></div>
      <div class="cc-wg">${cols}</div></div>`;
  }
  /* Afazeres do dia: regra = [marco, deslocamento em dias úteis, responsável, tarefa]. Ajuste aqui. */
  const AFAZ=ex.afazeres||[
    ['pautarAte',0,'Assessoria','pedir dia dos processos selecionados para a sessão'],
    ['inicioPreparacao',0,'Assessoria','distribuir os processos da pauta entre os servidores'],
    ['entregaMinutas',0,'Servidores','entregar as minutas para correção'],
    ['liberacao',0,'Assessoria','liberar os votos corrigidos no PJe'],
    ['date',1,'Assessoria','concluir os julgados e encaminhar todos para assinatura'],
    ['date',1,'Assessoria','conferir retirados e adiados e reencaminhar às tarefas do PJe conforme o caso']];
  const FER=new Set((ex.feriados||[]).map(x=>x[0]));
  function util(d,n){let x=P(d),k=0,st1=n<0?-1:1; while(k<Math.abs(n)){x=new Date(+x+st1*DIA); const i=iso(x); if(x.getDay()%6&&!FER.has(i)) k++;} return iso(x);}
  const cap0=x=>x[0].toUpperCase()+x.slice(1);
  const FD=(d,o)=>P(d).toLocaleDateString('pt-BR',o), MESL=d=>FD(d,{month:'long'});
  const diaUtil=(d,n)=>{let x=P(d);do{x=new Date(+x+n*DIA);}while(x.getDay()%6===0||FER.has(iso(x)));return iso(x);};
  const AG=()=>window.CMTAgenda; const itens=()=>AG()?AG().get('itens',[]):ls.get('cc_itens',[]), salvarItens=v=>AG()?AG().set('itens',v):ls.set('cc_itens',v);
  const GERAL={cor:'#56656e',date:null};
  /* tipos de cadastro e ausências (férias, licença, compensação…): previstas (tracejado) ou confirmadas */
  const TIPOS={afazer:['Afazer','#1a8a6a'],alerta:['Alerta','#c46a1f'],evento:['Evento','#3e72ad'],prazo:['Prazo-limite','#c0392b'],data:['Data','#7a5cc0'],ausencia:['Ausência','#5f6f7a']};
  const AUS={'Férias':'#2f8f6b','Licença':'#b0406a','Compensação':'#c4953c','Folga compensatória':'#c4953c','Abono':'#3e72ad','Curso ou evento':'#7a5cc0','Outra':'#5f6f7a','Outro':'#5f6f7a'};
  const AUSL=['Férias','Licença','Compensação','Abono','Curso ou evento','Outra'];
  const ausExt=()=>{const A=ex.ausencias||(window.CMTAgenda&&window.CMTAgenda.ausencias?window.CMTAgenda.ausencias():[]);return Array.isArray(A)?A:[];};
  function ausDia(dia){
    if(P(dia).getDay()%6===0) return [];
    const L=itens().filter(i=>i.tipo==='ausencia'&&i.data&&dia>=i.data&&dia<=(i.ate||i.data)).map(i=>({quem:i.quem||'',sub:i.sub||'Outra',sit:i.sit||'prevista',obs:i.titulo&&i.titulo!==i.sub?i.titulo:'',de:i.data,ate:i.ate||i.data,id:i.id}));
    ausExt().filter(a=>a.de&&dia>=a.de&&dia<=(a.ate||a.de)).forEach(a=>L.push({quem:a.quem||'',sub:a.tipo||'Outra',sit:a.situacao||'prevista',obs:a.obs||'',de:a.de,ate:a.ate||a.de,ext:1}));
    return L;
  }
  const corAus=a=>AUS[a.sub]||'#5f6f7a';
  const tAus=a=>`${a.sub} · ${a.quem}${a.sit==='prevista'?' (prevista)':''}`;
  function extrasDia(d,modo){
    const aus=ausDia(d), pz=doDia(d,'prazo'), dt=doDia(d,'data'), w=modo==='w';
    return pz.map(x=>`<div class="cc-pz${w?' cc-evw':''}" title="Prazo-limite${x.quem?' · '+x.quem:''}">⚑ ${x.hora?x.hora+' ':''}${x.o}${w&&x.quem?' · '+x.quem:''}</div>`).join('')
      +dt.map(x=>`<div class="cc-dx${w?' cc-evw':''}" title="Data específica">◆ ${x.o}</div>`).join('')
      +aus.map(a=>`<div class="cc-aus${a.sit==='prevista'?' prev':''}${w?' cc-evw':''}" style="--c:${corAus(a)}" title="${tAus(a)} · ${F(a.de)} a ${F(a.ate)}${a.obs?' · '+a.obs:''}">${w?'<b>'+a.sub+'</b> ':''}${w?a.quem:a.quem.split(' ')[0]+' · '+a.sub.slice(0,4)+'.'}</div>`).join('');
  }
  /* ocorrências de um item cadastrado num dia: devolve [sessão|GERAL, ...] */
  function ocorre(it,dia){
    const ok=[], dw=P(dia).getDay();
    if(it.freq==='sessao'){ ses.filter(s=>!it.ses||it.ses==='*'||it.ses===s.date).forEach(s=>{const b=it.marco==='date'?s.date:s.marcos[it.marco]; if(b&&util(b,+it.desloc||0)===dia) ok.push(s);}); return ok; }
    if(!it.data||dia<it.data) return ok;
    if(it.ate&&dia>it.ate) return ok;
    const hit= it.freq==='unica'?dia===it.data : it.freq==='diaria'?(dw%6!==0&&!FER.has(dia)) : it.freq==='semanal'?(it.dias||[]).includes(dw) : it.freq==='mensal'?dia.slice(8)===it.data.slice(8) : false;
    if(hit) ok.push(it.ses&&it.ses!=='*'?(ses.find(s=>s.date===it.ses)||GERAL):GERAL);
    return ok;
  }
  const doDia=(dia,tipo)=>itens().filter(i=>i.tipo===tipo&&i.tipo!=='ausencia').flatMap(it=>ocorre(it,dia).map(s=>({id:'u'+it.id+':'+dia+':'+(s.date||''),quem:it.quem||'',o:it.titulo,hora:it.hora||'',s,it}))).sort((a,b)=>(a.hora||'99').localeCompare(b.hora||'99'));
  const feitos=()=>AG()?AG().get('feitos',{}):ls.get('cc_feitos',{});
  function afazeres(dia){
    const L=[];
    ses.forEach(s=>AFAZ.forEach(([k,dd,quem,o],i)=>{const base=k==='date'?s.date:s.marcos[k]; if(!base) return;
      if(util(base,dd)===dia) L.push({id:s.date+':'+i,quem,o,s});}));
    return L.concat(doDia(dia,'afazer'));
  }
  function lateral(){
    const dia=st.dia||hoje, ativas=ses.filter(s=>marcos(s)[0].d<=dia&&s.date>=dia);
    const est=(m)=>m.d<dia?'done':m.d===dia?'now':'fut', MKC={pautarAte:'Peço dia',inicioPreparacao:'Preparação',entregaMinutas:'Minutas',liberacao:'Liberação',date:'Sessão'};
    const card=s=>{const ms=marcos(s), p=prog(s), n=s.processos||0, nx=ms.find(m=>m.d>=dia), dd=nx?Math.round((P(nx.d)-P(dia))/DIA):0;
      return `<div class="cc-sb-s" data-ses="${s.date}" style="--c:${s.cor}">
        <div class="cc-sb-h"><i style="background:${s.cor}"></i><b>Sessão ${F(s.date)}</b>${s.hora?`<span>${s.hora}</span>`:''}<em>${nx?(dd===0?nx.n+' hoje':nx.n+' em '+dd+' d'):''}</em></div>
        ${n?`<div class="cc-pc"><span title="minutadas">✎ ${p.minutadas}/${n}</span><span title="corrigidas">✓ ${p.corrigidas}/${n}</span><span title="liberadas">⚿ ${p.liberadas}/${n}</span><i class="cc-pc-b"><em style="width:${Math.round(p.minutadas/n*100)}%;background:${s.cor}"></em><em style="width:${Math.round(p.liberadas/n*100)}%;background:${s.cor};opacity:.45"></em></i></div>`:'<div class="cc-sb-p" style="color:#c0392b">sem pauta</div>'}
        <ol>${MK.map(([k,nm,ic])=>{const d=k==='date'?s.date:s.marcos[k];
          if(!d) return `<li class="nd"><span class="ic"><i class="ti ${ic}"></i></span><span class="nm">${MKC[k]||nm}</span><b>a definir</b></li>`;
          const e=est({d}), late=estado(s,{k,d})==='late'&&d<dia;
          return `<li class="${e}${late?' late':''}" data-s="${s.date}" data-k="${k}" title="${nm} · ${F(d)}"><span class="ic"><i class="ti ${ic}"></i></span><span class="nm">${MKC[k]||nm}</span><b>${F(d)}</b></li>`;}).join('')}</ol></div>`;};
    const esq=`<div class="cc-sb cc-esq"><div class="cc-sb-t">${dia===hoje?'Hoje':cap0(FD(dia,{weekday:'long'}))}<span class="cc-dd">${FD(dia,{day:'numeric',month:'long'})}</span><small>${dia===hoje?'alertas e afazeres':'afazeres do dia'}</small><span class="cc-esq-b"><button class="cc-ib cc-tx" data-a="novo" title="Cadastrar afazer, alerta, evento, prazo-limite, data ou ausência" aria-label="Cadastrar">+</button><button class="cc-ib cc-tx" data-a="lista" title="Gerenciar cadastrados" aria-label="Gerenciar">☰</button></span></div>
      ${dia===hoje?`<div class="cc-al">${(st.alx?alertas():alertas().slice(0,1)).map(a=>`<div class="cc-a ${a[0]}" data-go="${a[3].date}"><i class="ti ${a[1]}"></i>${a[2]}</div>`).join('')||'<small style="color:#8a98a3">Nenhum marco crítico nos próximos 10 dias.</small>'}${alertas().length>1?`<button class="cc-pill" data-a="alx">${st.alx?'menos':'+'+(alertas().length-1)+' alertas'}</button>`:''}</div>`:''}
      ${(()=>{const L=afazeres(dia),fz=feitos(); if(!L.length){let d=dia,P2=[];for(let i=0;i<30&&!P2.length;i++){d=iso(new Date(+P(d)+DIA));P2=afazeres(d).map(x=>({...x,d}));} return `<div class="cc-td"><div class="cc-td-t">Afazeres do dia <small>nenhum</small></div>${P2.length?`<div class="cc-td-nx">Próximos · ${F(P2[0].d)}</div>`+P2.map(x=>`<div class="cc-td-i" data-dia="${x.d}" style="--c:${x.s.cor}"><span><i class="cc-tag" style="background:${x.s.cor}">${x.s.date?'Sessão '+F(x.s.date):'Geral'}</i>${x.hora?`<b class="cc-hr">${x.hora}</b> `:''}${x.quem?`<b>${x.quem}:</b> `:''}${x.o}</span></div>`).join(''):''}</div>`;} return `<div class="cc-td"><div class="cc-td-t">Afazeres do dia <small>${L.filter(x=>fz[x.id]).length}/${L.length}</small></div>${L.map(x=>`<label class="cc-td-i${fz[x.id]?' ok':''}" style="--c:${x.s.cor}"><input type="checkbox" data-fz="${x.id}"${fz[x.id]?' checked':''}><span><i class="cc-tag" style="background:${x.s.cor}">${x.s.date?'Sessão '+F(x.s.date):'Geral'}</i>${x.hora?`<b class="cc-hr">${x.hora}</b> `:''}${x.quem?`<b>${x.quem}:</b> `:''}${x.o}</span></label>`).join('')}</div>`;})()}
</div>`;
    const dir=`<div class="cc-sb cc-dir">
      <div class="cc-dh"><b>${st.tl?'Linha do tempo das sessões':'Sessões em andamento'}</b><small>${st.tl?'10 semanas · marcos de todas as sessões':(ativas.length?ativas.length+(ativas.length>1?' sessões':' sessão')+' · ':'')+(dia===hoje?'hoje':'em '+F(dia))}</small>
        <span class="cc-sg" role="tablist"><button role="tab" class="${st.tl?'':'on'}" data-a="dvm" aria-selected="${!st.tl}"><i class="ti ti-layout-columns"></i>Marcos</button><button role="tab" class="${st.tl?'on':''}" data-a="dvt" aria-selected="${!!st.tl}" title="Linha do tempo (T)"><i class="ti ti-timeline"></i>Linha do tempo</button></span></div>
      ${st.tl?`<div class="cc-dtl">${semanas(ses)}</div>`:`<div class="cc-dg">${ativas.map(card).join('')||'<div class="cc-wv" style="display:block">Nenhuma sessão em andamento neste dia.</div>'}</div>`}</div>`;
    return [esq,dir];
  }
  function dialogo(){
    if(!st.dlg) return '';
    if(st.dlg.modo==='lista'){
      const L=itens(), fq={unica:'uma vez',diaria:'dias úteis',semanal:'semanal',mensal:'mensal',sessao:'por sessão'};
      return `<div class="cc-ov"><div class="cc-dl" role="dialog" aria-label="Cadastrados"><div class="cc-dl-h"><b>Agenda do gabinete: afazeres, alertas, eventos, prazos, datas e ausências</b><button class="cc-ib" data-a="fechar" aria-label="Fechar"><i class="ti ti-x"></i></button></div>
        ${L.length?`<div class="cc-ls">${L.map(i=>`<div class="cc-li"><i class="cc-tag" style="background:${i.tipo==='ausencia'?(AUS[i.sub]||'#5f6f7a'):((TIPOS[i.tipo]||[])[1]||'#1a8a6a')}">${(TIPOS[i.tipo]||[i.tipo])[0]}</i><span><b>${i.tipo==='ausencia'?(i.sub||'Ausência')+' · '+(i.quem||''):i.titulo}</b><small>${i.tipo==='ausencia'?F(i.data)+' a '+F(i.ate||i.data)+' · '+(i.sit==='confirmada'?'confirmada':'prevista')+(i.titulo&&i.titulo!==i.sub?' · '+i.titulo:''):(i.quem?i.quem+' · ':'')+fq[i.freq]}${i.freq==='sessao'?' · '+(MK.find(m=>m[0]===i.marco)||['',''])[1]+(+i.desloc?(i.desloc>0?' +':' ')+i.desloc+' d úteis':''):i.data&&i.tipo!=='ausencia'?(i.tipo==='prazo'||i.tipo==='data'?' · '+F(i.data):' · desde '+F(i.data)):''}${i.hora?' · '+i.hora:''}${i.ses&&i.ses!=='*'?' · sessão '+F(i.ses):i.ses==='*'?' · todas as sessões':''}</small></span><button class="cc-ib" data-ed="${i.id}" title="Editar"><i class="ti ti-pencil"></i></button><button class="cc-ib" data-del="${i.id}" title="Excluir"><i class="ti ti-x"></i></button></div>`).join('')}</div>`:'<p class="cc-vz">Nada cadastrado ainda.</p>'}
        <div class="cc-dl-f"><button class="cc-bt pri" data-a="novo">Cadastrar novo</button></div></div></div>`;
    }
    const i=st.dlg.it, o=(v,l,c)=>`<option value="${v}"${c===v?' selected':''}>${l}</option>`;
    return `<div class="cc-ov"><form class="cc-dl" role="dialog" aria-label="Cadastrar" novalidate>
      <div class="cc-dl-h"><b>${i.id?'Editar':'Cadastrar'}</b><button type="button" class="cc-ib" data-a="fechar" aria-label="Fechar"><i class="ti ti-x"></i></button></div>
      <div class="cc-seg">${Object.keys(TIPOS).map(t=>`<label><input type="radio" name="tipo" value="${t}"${i.tipo===t?' checked':''}><span>${TIPOS[t][0]}</span></label>`).join('')}</div>
      <div class="cc-2 cc-q-aus"><label class="cc-f">Tipo de ausência<select name="sub">${AUSL.map(x=>o(x,x,i.sub||'Férias')).join('')}</select></label>
      <label class="cc-f">Situação<select name="sit">${o('prevista','Prevista',i.sit||'prevista')}${o('confirmada','Confirmada',i.sit||'prevista')}</select></label></div>
      <label class="cc-f">Título<input name="titulo" value="${(i.titulo||'').replace(/"/g,'&quot;')}" placeholder="Concluir os julgados e encaminhar para assinatura"><em class="cc-er" data-er="titulo"></em></label>
      <div class="cc-2"><label class="cc-f">Responsável<input name="quem" value="${i.quem||''}" placeholder="Assessoria"></label>
      <label class="cc-f">Sessão vinculada<select name="ses">${o('','Nenhuma',i.ses||'')}${o('*','Todas as sessões',i.ses||'')}${ses.filter(x=>x.date>=iso(new Date(+P(hoje)-30*DIA))).map(x=>o(x.date,'Sessão '+F(x.date),i.ses||'')).join('')}</select></label></div>
      <div class="cc-2"><label class="cc-f">Frequência<select name="freq">${o('unica','Uma vez',i.freq)}${o('diaria','Todo dia útil',i.freq)}${o('semanal','Semanal',i.freq)}${o('mensal','Mensal (mesmo dia)',i.freq)}${o('sessao','Em toda sessão, relativo a um marco',i.freq)}</select></label>
      <label class="cc-f">Horário<input type="time" name="hora" value="${i.hora||''}"></label></div>
      <div class="cc-2 cc-q-data"><label class="cc-f"><span class="cc-lb-data">Data</span><input type="date" name="data" value="${i.data||st.dia||hoje}"><em class="cc-er" data-er="data"></em></label>
      <label class="cc-f cc-q-ate">Até (opcional)<input type="date" name="ate" value="${i.ate||''}"></label></div>
      <div class="cc-f cc-q-sem">Dias da semana<div class="cc-dw">${['dom','seg','ter','qua','qui','sex','sáb'].map((n,k)=>`<label><input type="checkbox" name="dias" value="${k}"${(i.dias||[]).includes(k)?' checked':''}><span>${n}</span></label>`).join('')}</div><em class="cc-er" data-er="dias"></em></div>
      <div class="cc-2 cc-q-ses"><label class="cc-f">Marco<select name="marco">${MK.map(m=>o(m[0],m[1],i.marco||'date')).join('')}</select></label>
      <label class="cc-f">Dias úteis depois (negativo = antes)<input type="number" name="desloc" step="1" value="${i.desloc??1}"></label></div>
      <div class="cc-dl-f">${i.id?`<button type="button" class="cc-bt dan" data-del="${i.id}">Excluir</button>`:''}<span style="flex:1"></span><button type="button" class="cc-bt" data-a="fechar">Cancelar</button><button type="submit" class="cc-bt pri">Salvar</button></div>
    </form></div>`;
  }
  function ajustaForm(){const fm=el.querySelector('form.cc-dl'); if(!fm) return;
    const tp=(fm.querySelector('[name=tipo]:checked')||{}).value||'afazer', so=tp==='prazo'||tp==='data'||tp==='ausencia';
    if(so) fm.freq.value='unica';
    fm.querySelector('.cc-q-aus').hidden=tp!=='ausencia'; fm.freq.closest('.cc-2').hidden=so;
    const lq=fm.quem.closest('label'); lq.firstChild.textContent=tp==='ausencia'?'Pessoa':'Responsável'; fm.quem.placeholder=tp==='ausencia'?'Nome do servidor':'Assessoria';
    fm.ses.closest('label').hidden=tp==='ausencia';
    fm.titulo.closest('label').firstChild.textContent=tp==='ausencia'?'Observação (opcional)':tp==='prazo'?'O que vence':'Título';
    fm.titulo.placeholder=tp==='ausencia'?'ex.: férias aprovadas pela Presidência':tp==='prazo'?'ex.: entregar a relação de metas à Presidência':tp==='data'?'ex.: inspeção, correição, ponto facultativo':'Concluir os julgados e encaminhar para assinatura';
    const fq=fm.freq.value;
    fm.querySelector('.cc-q-data').hidden=fq==='sessao'; fm.querySelector('.cc-q-ate').hidden=fq==='unica'; fm.querySelector('.cc-q-sem').hidden=fq!=='semanal'; fm.querySelector('.cc-q-ses').hidden=fq!=='sessao';
    fm.querySelector('.cc-lb-data').textContent=tp==='ausencia'?'De':tp==='prazo'?'Data-limite':fq==='unica'?'Data':'A partir de';
    if(tp==='ausencia'){fm.querySelector('.cc-q-ate').hidden=false; fm.querySelector('.cc-q-ate').firstChild.textContent='Até';}}
  let t;
  function render(){
    const vis=ses;
    const dSel=st.dia||hoje, cap=x=>x[0].toUpperCase()+x.slice(1);
    const r0=P(st.semRef||dSel), rf=r0.getDay()%6?r0:new Date(+r0+(r0.getDay()===6?2:1)*DIA), sg=new Date(+rf-((rf.getDay()+6)%7)*DIA), sx=new Date(+sg+4*DIA);
    const tit= st.passo==='dia'? cap(FD(dSel,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))
      : st.passo==='sem'? `${sg.getDate()}${sg.getMonth()!==sx.getMonth()?' de '+MESL(iso(sg)):''} a ${sx.getDate()} de ${MESL(iso(sx))} de ${sx.getFullYear()}`
      : ex.meses===2? (()=>{const b=st.mes||hoje.slice(0,7),[y,m]=b.split('-').map(Number),n2=iso(new Date(y,m,15)).slice(0,7),f=x=>new Date(+P(x+'-15')).toLocaleDateString('pt-BR',{month:'long'});return cap(f(b))+' e '+f(n2)+' de '+n2.slice(0,4);})()
      : cap(new Date(+P((st.mes||hoje.slice(0,7))+'-15')).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}));
    el.innerHTML=`<div class="cc${st.min?' min':''}">
      <div class="cc-h"><button class="cc-ib" data-a="min" title="${st.min?'Expandir':'Recolher'}"><i class="ti ti-chevron-${st.min?'down':'up'}"></i></button>
        <b>Calendário do gabinete</b><span class="cc-dt">${tit}</span><span class="cc-help" title="Marco cheio = cumprido · pulsando = próximo · vermelho = vencido · tracejado = datas a definir. Clique na sessão para destacar o traçado; clique num marco para abrir a sessão em Pautas. Teclas: ← → anterior/próximo · D dia · S semana · M mês · H hoje · T linha do tempo">?</span>
        <span class="cc-sp cc-ps">${[['dia','Dia'],['sem','Semana'],['mes','Mês']].map(([k,n])=>`<button class="cc-pill${st.passo===k?' on':''}" data-passo="${k}">${n}</button>`).join('')}</span>
        <span class="cc-sp"><button class="cc-ib" data-a="prev" title="${{dia:'Dia anterior',sem:'Semana anterior',mes:'Mês anterior'}[st.passo]}"><i class="ti ti-chevron-left"></i></button>
        <button class="cc-pill" data-a="hoje">Hoje</button>
        <button class="cc-ib" data-a="next" title="${{dia:'Próximo dia',sem:'Próxima semana',mes:'Próximo mês'}[st.passo]}"><i class="ti ti-chevron-right"></i></button>
        </span></div>
      
      
      <div class="cc-body">${(()=>{const [e2,d2]=lateral();const b=st.mes||hoje.slice(0,7),[y,m]=b.split('-').map(Number),n2=iso(new Date(y,m,15)).slice(0,7),ML=x=>cap(new Date(+P(x+'-15')).toLocaleDateString('pt-BR',{month:'long'}));const grade=ex.meses===2&&st.passo==='mes'?`<div class="cc-2m"><div><b class="cc-mt">${ML(b)}</b>${mes(vis,b)}</div><div><b class="cc-mt">${ML(n2)}</b>${mes(vis,n2)}</div></div>`:mes(vis);return `<div class="cc-top">${e2}<div>${grade}</div>${d2}</div>`})()}${semanaFaixa(vis)}</div>
      <div class="cc-lg" hidden>${MK.map(m=>`<span><i class="ti ${m[2]}"></i>${m[1]}</span>`).join('')}<span style="margin-left:auto">cheio = cumprido · pulsando = próximo · vermelho = vencido sem cumprir · tracejado = datas a definir · teclas ← → H A S M</span></div>
      <div class="cc-tip" hidden></div>${dialogo()}</div>`;
    t=el.querySelector('.cc-tip'); ajustaForm(); const f1=el.querySelector('form.cc-dl [name=titulo]'); if(f1&&!f1.value) f1.focus();
  }
  el.addEventListener('click',e=>{
    const a=e.target.closest('[data-a]'), sc=e.target.closest('[data-ses]'), m=e.target.closest('.cc-m'), go=e.target.closest('[data-go]');
    if(a){const k=a.dataset.a;
      if(k==='alx'){st.alx=!st.alx;}
      else if(k==='novo'){st.dlg={modo:'form',it:{tipo:'afazer',freq:'unica'}};}
      else if(k==='lista'){st.dlg={modo:'lista'};}
      else if(k==='fechar'){st.dlg=null;}
      else if(k==='tl'||k==='dvm'||k==='dvt'){st.tl=k==='tl'?!st.tl:k==='dvt';ls.set('cc_tl',st.tl);}
      else if(k==='min'){st.min=!st.min;ls.set('cc_min',st.min);}
      else if(k==='sem'||k==='mes'||k==='ambos'){st.vista=k;ls.set('cc_vista2',k);}
      else if(k==='hoje'){st.ini=null;st.mes=null;st.semRef=null;st.dia=null;}
      else if(k==='wprev'||k==='wnext'){st.semRef=iso(new Date(+P(st.semRef||hoje)+(k==='wnext'?7:-7)*DIA));st.dia=st.semRef;st.mes=st.semRef.slice(0,7);}
      else{const s=k==='next'?1:-1;
        if(false) st.ini=iso(new Date(+P(st.ini||iso(new Date(P(hoje)-14*DIA)))+s*14*DIA));
        else if(st.passo==='dia'){st.dia=diaUtil(st.dia||hoje,s);st.semRef=st.dia;st.mes=st.dia.slice(0,7);}
        else if(st.passo==='sem'){const b0=P(st.semRef||st.dia||hoje), b=b0.getDay()%6?b0:new Date(+b0+(b0.getDay()===6?2:1)*DIA), seg=new Date(+b-((b.getDay()+6)%7)*DIA); st.semRef=iso(new Date(+seg+s*7*DIA));st.dia=st.semRef;st.mes=st.semRef.slice(0,7);}
        else{const [Y,M]=(st.mes||hoje.slice(0,7)).split('-').map(Number), d=new Date(Y,M-1+s,1);st.mes=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}}
      render();return;}
    const ps=e.target.closest('[data-passo]'); if(ps){st.passo=ps.dataset.passo;ls.set('cc_passo',st.passo);render();return;}
    const ed=e.target.closest('[data-ed]'), del=e.target.closest('[data-del]');
    if(ed){st.dlg={modo:'form',it:{...itens().find(i=>i.id===ed.dataset.ed)}};render();return;}
    if(del){if(confirmDel(del)){salvarItens(itens().filter(i=>i.id!==del.dataset.del));st.dlg={modo:'lista'};render();}return;}
    if(e.target.classList.contains('cc-ov')){st.dlg=null;render();return;}
    if(st.dlg) return;
    const cel=e.target.closest('.cc-c[data-d]'); if(cel&&!m){st.semRef=cel.dataset.d;st.dia=cel.dataset.d;render();return;}
    const tn=e.target.closest('.cc-td-i[data-dia]'); if(tn){st.dia=tn.dataset.dia;st.semRef=tn.dataset.dia;render();return;}
    const wc=e.target.closest('.cc-wc[data-dia]'); if(wc&&!e.target.closest('.cc-we')){st.dia=wc.dataset.dia;render();return;}
    if(sc){const d=sc.dataset.ses;st.foco=(st.foco||focoPad())===d?null:d;render();return;}
    const alvo=(m&&m.dataset.s)||(go&&go.dataset.go); if(alvo&&ex.abrir) ex.abrir(alvo);
  });
  function confirmDel(b){ if(b.dataset.sure){return true;} b.dataset.sure=1; b.textContent='Confirmar exclusão'; return false; }
  el.addEventListener('submit',e=>{const fm=e.target.closest('form.cc-dl'); if(!fm) return; e.preventDefault();
    const v=n=>fm[n]?fm[n].value.trim():'', fq=v('freq'), dias=[...fm.querySelectorAll('[name=dias]:checked')].map(x=>+x.value);
    const tp=fm.querySelector('[name=tipo]:checked').value, er={}; if(!v('titulo')&&tp!=='ausencia') er.titulo='Informe o título.'; if(tp==='ausencia'&&!v('quem')) er.titulo='Informe a pessoa.'; if(tp==='ausencia'&&v('ate')&&v('ate')<v('data')) er.data='O fim não pode ser antes do início.'; if(fq!=='sessao'&&!v('data')) er.data='Informe a data.'; if(fq==='semanal'&&!dias.length) er.dias='Marque ao menos um dia.';
    fm.querySelectorAll('.cc-er').forEach(x=>x.textContent=er[x.dataset.er]||''); if(Object.keys(er).length) return;
    const it={id:st.dlg.it.id||Date.now().toString(36),tipo:tp,sub:tp==='ausencia'?v('sub'):'',sit:tp==='ausencia'?v('sit'):'',titulo:v('titulo')||(tp==='ausencia'?v('sub'):''),quem:v('quem'),ses:v('ses'),freq:fq,hora:v('hora'),data:fq==='sessao'?'':v('data'),ate:tp==='ausencia'?(v('ate')||v('data')):fq==='unica'||fq==='sessao'?'':v('ate'),dias:fq==='semanal'?dias:[],marco:fq==='sessao'?v('marco'):'',desloc:fq==='sessao'?(+v('desloc')||0):0};
    const L=itens(), k=L.findIndex(i=>i.id===it.id); if(k>=0) L[k]=it; else L.push(it); salvarItens(L); st.dlg=null; render();});
  el.addEventListener('input',e=>{const er=e.target.name&&el.querySelector(`.cc-er[data-er="${e.target.name}"]`); if(er) er.textContent='';});
  el.addEventListener('change',e=>{ if(e.target.name==='freq'||e.target.name==='tipo'){ajustaForm();return;} if(e.target.closest('form.cc-dl')) return;const c=e.target.closest('[data-fz]'); if(!c) return; const fz=feitos(); if(c.checked) fz[c.dataset.fz]=1; else delete fz[c.dataset.fz]; (AG()?AG().set('feitos',fz):ls.set('cc_feitos',fz)); render();});
  el.addEventListener('mousemove',e=>{const m=e.target.closest('.cc-m'); if(!t) return; if(!m){t.hidden=true;return;}
    const s=ses.find(x=>x.date===m.dataset.s), mk=marcos(s).find(x=>x.k===m.dataset.k); tip(e,s,mk);});
  el.addEventListener('mouseleave',()=>{if(t)t.hidden=true});
  window.addEventListener('cmt-agenda',()=>{ if(el.isConnected) render(); });
  el.tabIndex=0; el.addEventListener('keydown',e=>{if(st.dlg){if(e.key==='Escape'){st.dlg=null;render();}return;} if(e.target.closest('input,select,textarea'))return; const pk={d:'dia',s:'sem',m:'mes'}[e.key]; if(pk){st.passo=pk;ls.set('cc_passo',pk);render();return;} const m={ArrowLeft:'prev',ArrowRight:'next',h:'hoje',t:'tl'}[e.key]; if(m){e.preventDefault(); const bt=el.querySelector(`[data-a="${m==='tl'?(st.tl?'dvm':'dvt'):m}"]`); if(bt) bt.click();}});
  addEventListener('resize',()=>render());
  render();
  return {render};
}
window.CMTCalendario={montar};
})();


