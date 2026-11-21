window.FX=window.FX||{};
FX.mk=function(it){const p=it.prontuario_triagem||{},k=p.ctl||{},c=p.cartao||{};let esp=it.especificidades||'';const r=(it.situacao_atual||{}).resumo;if(r&&esp.startsWith(r))esp=esp.slice(r.length).replace(/^[ ·]+/,'');
const F={'triagem.Tempestividade':k.tempest||'Não verificado','triagem.Preparo':k.preparo||'Não verificado','triagem.Representação':k.repres||'Não verificado','triagem.Mídias':k.midias||'Não se aplica','triagem.Prelim.':k.prelim||'Sem preliminares','triagem.MPF - Custos Legis':k.mpf||'Sem hipótese'};
F['triagem.MPF']=k.parecer||((k.mpf||'Sem hipótese')==='Sem hipótese'?'Não se aplica':'Não verificado');
F['triagem.Tema']=it.tipo_caso;F['triagem.Síntese Fática']=c.sintese||'';F['triagem.Especificidades']=esp;F['triagem.Tipo de Julgamento']=c.tipoJ||'Agravo de Instrumento';
if(c.questoes)F['triagem.Alegações']=c.questoes;if(k.urgTipo)F['triagem.Urgência']=k.urgTipo;if(k.urgSit)F['triagem.Urgência - Apreciação']=k.urgSit;if(k.fundamento)F['producao.Mono - Fundamento']=k.fundamento;
[['obsRepres','triagem.Observação da Representação'],['ajg','triagem.AJG'],['descPrelim','triagem.Descrição da Preliminar'],['idParecer','triagem.ID do Parecer MPF'],['parecerSentido','triagem.Parecer - Sentido']].forEach(([a,b])=>{if(k[a])F[b]=k[a]});
if(k.urgTipo){const ped=k.urgPedido||(c.adm||{}).prot;if(ped)F['triagem.Urgência - Data']=ped;if(k.urgData)F['triagem.Urgência - Apreciada em']=k.urgData;if(k.urgObs)F['triagem.Urgência - Observação']=k.urgObs;}
Object.keys(F).forEach(x=>{if(F[x]===''||F[x]==null)delete F[x]});return {cnj:it.processo,campos:F};};
FX.lote=async function(){const q=await fetch('/api/painel?lote=1&id=adp-ai');const j=await q.json();const L=j.lote||j;return L.itens||[];};
FX.enviar=async function(lista,semData){semData=semData||[];const its=await FX.lote();const idx={};its.forEach(i=>idx[i.processo.slice(0,10)]=i);FX.st={n:lista.length,ok:[],fim:0};
for(const c of lista){const it=idx[c.slice(0,10)];if(!it||!it.prontuario_triagem){FX.st.ok.push(c.slice(0,10)+' sem-triagem');continue;}const f=FX.mk(it);if(semData.includes(c.slice(0,10)))delete f.campos['triagem.Urgência - Data'];
let ok=0;for(let t=0;t<5&&!ok;t++){try{const q=await fetch('/api/pauta?ficha=1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)});const x=await q.text();if([401,409,429,500,502,503].includes(q.status)){await new Promise(z=>setTimeout(z,3000));continue;}let j={};try{j=JSON.parse(x)}catch(e){};FX.st.ok.push(c.slice(0,10)+' '+q.status+(j.recusados&&j.recusados.length?' rec:'+j.recusados.join('|'):'')+(j.erro?' '+j.erro:''));ok=1;}catch(e){await new Promise(z=>setTimeout(z,3000));}}
if(!ok)FX.st.ok.push(c.slice(0,10)+' falhou');}FX.st.fim=1;};
'FX pronto';
