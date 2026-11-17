/* CMT · Leitura do inteiro teor (.txt exportado do PJe) para a ficha única do processo.
   Extraído do módulo v40 do app Gabinete CMT (gabcmt.html, <script id="cmt-v40-feature">, seções 1 a 4: leitura do TXT,
   extração por regras, partes e pré-seleção, sugestões com conflitos), sem mudança de regra. Ficaram de fora o diálogo antigo,
   a gravação no card do Controle de Pauta (applySuggestions), a IA opcional, o panorama e as estatísticas: a ficha
   (padrao/ficha-dialogo.js) conduz a conferência e grava no operacional, pelo modelo padrao/ficha.json.
   O .txt é lido só na memória do navegador; nada do texto integral é gravado: só os campos confirmados.
   Embutido no CMT-monitor e na Ex Officio por scripts/ficha/embutir.py. */
(function(){'use strict';
if(window.CMTInteiroTeor&&window.CMTInteiroTeor.parseTxt)return;

const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const yes=v=>['sim','s','true','1','x','ok'].includes(N(v))||/^sim\s+/.test(N(v));
const S=v=>String(v??'').trim();
/* no lugar do PautaControl do app antigo: só a conversão de datas é usada pelas sugestões */
const dataIso=v=>{const s=S(v);let m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);if(m)return s.slice(0,10);m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';};
const PC=()=>({date:dataIso});
/* tempestividade pelo calendário forense do gabinete (padrao/calendario-forense.js), o mesmo do Controle de Pauta */
function tempCalc(r){const F=window.CMTForense;if(!F)return null;
  const c=F.prazo({publicacao:r['Tempest - Publicação'],protocolo:r['Tempest - Protocolo'],prazo:r['Tempest - Prazo legal'],dobro:r['Tempest - Dobro'],suspensoes:r['Tempest - Suspensões']},F.atual);
  return c.falta?null:{limit:c.limite,total:c.total,ok:c.ok,skipped:c.pulados};}
const page=()=>({tempCalc});
const cnjDigits=v=>String(v||'').replace(/\D/g,'');
const fmtCnj=d=>d.length===20?`${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9,13)}.${d.slice(13,14)}.${d.slice(14,16)}.${d.slice(16)}`:d;
const pct=(a,b)=>b?Math.round(a/b*100):0;
const br=d=>/^\d{4}-\d{2}-\d{2}/.test(d||'')?d.slice(0,10).split('-').reverse().join('/'):'';

/* ───────────────────────── 1 · LEITURA DO TXT ───────────────────────── */

/* Fontes embutidas do PJe às vezes saem "deslocadas" (glifos na ordem do
   padrão Macintosh). O mapa abaixo recupera letras, dígitos e pontuação;
   o resultado é sinalizado como texto recuperado. */
const HI={'b':'Ä','c':'Å','d':'Ç','e':'É','f':'Ñ','g':'Ö','h':'Ü','i':'á','j':'à','k':'â','l':'ä','m':'ã','n':'å','o':'ç','p':'é','q':'è','r':'ê','s':'ë','t':'í','u':'ì','v':'î','w':'ï','x':'ñ','y':'ó','z':'ò','{':'ô','|':'ö','}':'õ','~':'ú','\u007f':'ù',
 'È':'Á','Ë':'Í','Ð':'Ô','Ò':'Ú',' ':'Ã','®':'Ã','¯':'Õ','š':'ª','ž':'º','ƒ':'§','³':'“','´':'”','²':'–','±':'–','Ç':'Â','É':'Á','Ê':'Ë','Ì':'Í','Ó':'Ò','Ñ':'Ô','Ô':'Ú','­':'À',
 '˘':'5','ˇ':'6','ˆ':'7','˙':'8','˝':'9','˛':':','˚':';','˜':'<'};
const CTRL=/[\u0003-\u001f˘ˇˆ˙˝˛˚]/;
function decodeChar(ch){
  if(HI[ch])return HI[ch];
  const c=ch.charCodeAt(0);
  if(c>=3&&c<=97)return String.fromCharCode(c+29);
  return ch;
}
function decodeLine(line){
  const ctrl=(line.match(/[\u0003\u000f\u0010\u0011\u0012\u0013-\u0017]/g)||[]).length;
  if(!ctrl||!CTRL.test(line))return {text:line,enc:false};
  const first=line.search(CTRL);
  let start=line.lastIndexOf(' ',first)+1;
  const prefix=line.slice(0,start);
  // prefixo legível (cabeçalho de página) é mantido; se não parecer português, decodifica tudo
  if(!/\b(de|do|da|em|por|que|eletronicamente|documento)\b/i.test(prefix))start=0;
  // no trecho codificado, o separador real de palavras é \u0003; espaços comuns são artefatos de posicionamento
  let seg=line.slice(start).replace(/ +(?=\u0003)|(?<=\u0003) +/g,'');
  for(let k=0;k<3;k++)seg=seg.replace(/(^|[ \u0003])(\S) (?=\S)/g,'$1$2').replace(/(\S) (\S)(?=[ \u0003]|$)/g,'$1$2');
  const out=line.slice(0,start)+[...seg].map(ch=>ch===' '?' ':ch==='\u0017'?'#':decodeChar(ch)).join('');
  return {text:out,enc:true};
}
function tidy(t){
  return String(t||'')
    .replace(/ | /g,' ')
    .replace(/ (?:²|±) /g,' – ')
    .replace(/([a-zà-ú\)])\.(?=[A-ZÀ-Ú])/g,'$1. ')
    .replace(/([A-ZÀ-Ú]{3,})(DECIS[ÃA]O|DESPACHO|SENTEN[ÇC]A|ATO ORDINAT[ÓO]RIO|AC[ÓO]RD[ÃA]O|ADVOGAD[OA]|PROCURADOR|AGRAVANTE|AGRAVAD[OA]:|APELANTE|APELAD[OA]:|EMBARGANTE|EMBARGAD[OA]:|IMPETRANTE|IMPETRAD[OA]:|RECORRENTE|RECORRID[OA]:|INTERESSAD)/g,'$1 \n$2')
    .replace(/(DECIS[ÃA]O|DESPACHO|SENTEN[ÇC]A|ORDINAT[ÓO]RIO)(Vistos|Trata|Cuida|Nos termos|Considerando|Intime)/g,'$1\n$2')
    .replace(/(\p{L}) - (se|lhe|lhes|la|lo|las|los)\b/gu,'$1-$2')
    .replace(/[ \t]{2,}/g,' ');
}
const CNJ_RE=/\b\d{7}\s?-\s?\d{2}\s?\.\s?\d{4}\s?\.\s?\d\s?\.\s?\d{2}\s?\.\s?\d{4}\b/g;
function kindOf(tipo,desc,text,classeAbbr,naoJuntado){
  const t=N(tipo),d=N(desc),head=N(text.slice(0,2500));
  /* atos de comunicação e expedientes antes das peças (“Intimação para Contraminuta” não é a contraminuta) */
  if(/^intimacao de pauta/.test(t))return 'pauta';
  if(/^(intimacao|ato ordinat|certid|informacao$|diligencia|consulta)/.test(t))return 'ato';
  if(/^ciencia$/.test(t)||/^(manifestacao|peticao)/.test(t)&&/^ciencia/.test(d)||/^ciencia (da|de) (intimacao|pauta)|exara ciencia/.test(head.slice(0,400))&&text.length<3000)return 'ciencia';
  /* anexos de petição eletrônica (“A_…”) não são a peça */
  if(/^a_/.test(d))return 'documento';
  /* relatório, voto e ementa ainda não juntados: minuta do gabinete no PJe */
  if(naoJuntado&&/^(relatorio|voto|ementa|acordao)/.test(t))return 'minuta';
  if(/^informacoes prestadas/.test(t))return 'informacoes';
  if(/contrarraz|contraminut|resposta ao recurso|impugnacao aos embargos/.test(t+' '+d))return 'contrarrazoes';
  if(/parecer|ministerio publico|^mpf|cota ministerial|promocao ministerial/.test(t)||/procuradoria regional da republica|ministerio publico federal/.test(head)&&/peticao|manifest|parecer|cota/.test(t))return 'mpf';
  if(/^sentenca/.test(t))return 'sentenca';
  if(/acordao/.test(t))return 'acordao';
  if(/decisao/.test(t))return 'decisao';
  if(/despacho/.test(t))return 'despacho';
  if(/ato ordinat|certid|intimac|expedient|aviso|mandado|oficio|termo/.test(t))return 'ato';
  if(/apelac|agravo|embargos de declarac|recurso|razoes recursais/.test(t))return 'recurso';
  if(/peticao inicial/.test(t)){
    if(/agravo de instrumento/.test(head)||/^ai\b/.test(N(classeAbbr)))return 'recurso';
    return 'inicial';
  }
  if(/memoria/.test(t))return 'memoriais';
  if(/procurac|substabelec/.test(t+' '+d))return 'procuracao';
  if(/custas|guia|gru|preparo/.test(t)||/^(comprovante|guia|gru)/.test(d)&&/custas|preparo|recolhiment/.test(d))return 'custas';
  if(/peticao|manifest|requeriment|ciencia/.test(t))return 'peticao';
  if(/comprobat|anexo|document/.test(t))return 'documento';
  return 'outro';
}
const KIND_LABEL={pauta:'Intimação de pauta',ciencia:'Ciência',minuta:'Minuta (não juntada)',informacoes:'Informações da autoridade',decisao:'Decisão',sentenca:'Sentença',acordao:'Acórdão',recurso:'Recurso',contrarrazoes:'Contrarrazões',mpf:'Manifestação do MPF',despacho:'Despacho',ato:'Ato / certidão',peticao:'Petição / manifestação',inicial:'Petição inicial',documento:'Documento / anexo',procuracao:'Procuração',custas:'Custas',memoriais:'Memoriais',outro:'Outro'};
function recursoTipo(tipo,text){
  const s=N(tipo)+' '+N(text.slice(0,1800));
  if(/agravo interno|agravo regimental/.test(s))return 'Agravo interno';
  if(/embargos de declarac/.test(s))return 'Embargos de declaração';
  if(/agravo de instrumento/.test(s))return 'Agravo de instrumento';
  if(/recurso especial|recurso extraordinario/.test(s))return 'Recurso especial/extraordinário';
  if(/recurso adesivo/.test(s))return 'Recurso adesivo';
  if(/apelac/.test(s))return 'Apelação';
  return 'Recurso';
}
const ROLE_RE=/(?<!do\(a\) |DO\(A\) )\b(APELANTE|APELAD[OA]|AGRAVANTE|AGRAVAD[OA]|EMBARGANTE|EMBARGAD[OA]|IMPETRANTE|IMPETRAD[OA]|RECORRENTE|RECORRID[OA]|EXEQUENTE|EXECUTAD[OA]|AUTOR[A]?|R[ÉE]U?|PARTE AUTORA|PARTE R[ÉE])(?:\(A\)|\(S\)|\(ES\)|S)?\s*:\s*([A-ZÀ-Ú0-9][A-ZÀ-Ú0-9 .&'\/-]{2,120}?)(?=\s*(?:ADVOGAD|PROCURADOR|DESPACHO|DECIS|SENTEN|AC[ÓO]RD|ATO ORDINAT|CERTID|INTERESSAD|OUTROS PARTICIPANTES|RELATOR|APELA|AGRAVA|EMBARGA|IMPETRA|RECORR|\n|$|\s{2}|\())/g;
/* Inteiro teor em Markdown (.md da extensão TecJustiça PJe): "# Processo N", um "# ID - Tipo (descrição) - ID de origem N"
   por peça e "## Página N" por página. Vira o mesmo texto do .txt do PJe antes da leitura; páginas digitalizadas sem texto são contadas. */
const MD_RE=/^\s*#\s+Processo\s+\d{7}-?\d{2}\./;
function semParenteses(t){t=S(t);if(!/\)$/.test(t))return [t,''];let d=0;
  for(let i=t.length-1;i>=0;i--){if(t[i]===')')d++;else if(t[i]==='('&&!--d){const a=S(t.slice(0,i));return a?[a,S(t.slice(i+1,-1))]:[t,''];}}
  return [t,''];}
function deMd(text){
  const out=[];let sem=0;
  text.split('\n').forEach(l=>{
    let m=/^#\s+Processo\s+([\d.\-]+)\s*$/.exec(l);if(m){out.push('Processo: '+m[1]);return;}
    m=/^#\s+(\d{5,})\s+-\s+(.+?)\s*$/.exec(l);
    if(m){const o=/^(.*?)\s+-\s+ID de origem\s+(\d{5,})$/.exec(m[2]),[tipo,desc]=semParenteses(o?o[1]:m[2]);
      out.push('Documento: '+(o?o[2]:m[1])+' - '+tipo+(desc?' - '+desc:''));if(o)out.push(m[1]+' - '+tipo+' - ID de origem '+o[2]);return;}
    if(/^##\s+Página\s+\d+\s*$/.test(l)||/^>\s?/.test(l)||/^-{3,}\s*$/.test(l))return;
    if(/^_\[página[^\]]*\]_\s*$/i.test(l)){sem++;return;}
    out.push(l);
  });
  return {txt:out.join('\n'),sem};
}
function parseTxt(raw){
  let text=String(raw||'').replace(/\r\n?/g,'\n'),formato='txt',semTexto=0;
  if(MD_RE.test(text)&&/^#\s+\d{5,}\s+-\s/m.test(text)){const r=deMd(text);text=r.txt;formato='md';semTexto=r.sem;}
  const proc=(/^\s*Processo:\s*([\d.\-]+)/m.exec(text)||[])[1]||'';
  const main=cnjDigits(proc);
  const lines=text.split('\n');
  const heads=[];lines.forEach((l,n)=>{const m=/^Documento:\s*(\d{5,})\s*-\s*(.*)$/.exec(l);if(m)heads.push({n,id:m[1],title:m[2].trim()});});
  const polos={};let classeAbbr='',assunto='';
  const docs=heads.map((h,k)=>{
    const end=k+1<heads.length?heads[k+1].n:lines.length;
    const block=lines.slice(h.n+1,end).filter(l=>!/^-{20,}\s*$/.test(l));
    const parts=h.title.split(/\s+-\s+/);let tipo=S(parts[0]),desc=S(parts.slice(1).join(' - ').replace(/\s*-\s*$/,''));
    if(N(desc)===N(tipo))desc='';
    let juntada='',por='',assin='',encoded=false,id2='',naoJuntado=false;const body=[];
    let skipUi=false;
    block.forEach((l,j)=>{
      let m=/juntado aos autos do processo de número\s+([\d.\-]+)\s+em\s+(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?[^]*?\bpor\s+(.+?)\s+Documento assinado por:\s*-?\s*(.+?)\s+Consulte/i.exec(l);
      if(m){juntada=m[2]+(m[3]?' '+m[3]:'');por=m[4];assin=m[5].replace(/\s*-\s*/g,', ');const g=/ID do documento:\s*(\d{5,})/.exec(l);if(g)id2=g[1];return;}
      /* documento migrado do 1º grau: “391290124 - Sentença - ID de origem 597684596” — o ID citado nos autos do 2º grau é o primeiro */
      m=j<8?/^\s*(\d{6,})\s+-\s+.+?\s+-\s+ID de origem\s+(\d{5,})/.exec(l):null;if(m){id2=m[1];return;}
      if(/<Documento ainda não juntado ao processo>/i.test(l)){naoJuntado=true;return;}
      if(/^\s*Tribunal Regional Federal da 3ª Região Tribunal Regional/.test(l))return;
      m=/^\s*(?:N[úu]mero(?:\s+do\s+documento)?\s*:\s*)?Juntado por\s+(.+?)\s+em\s+(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?/.exec(l);if(m){por=m[1];juntada=m[2]+(m[3]?' '+m[3]:'');return;}
      m=/^([A-Za-z]{2,10})\s+(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\s+-\s+(.+)$/.exec(l.trim());if(m&&j<4){if(cnjDigits(m[2])===main){classeAbbr=classeAbbr||m[1];assunto=assunto||m[3];}return;}
      if(/^\s*(Ícone de|Signatário|Data|CN Certificado|Emissor|CN=|Assinado eletronicamente por|https?:\/\/\S+$|\d{20,}\s*$|\d{6,}\s+-\s+\S)/.test(l)){
        if(/^\s*Signatário/.test(l)){const nx=S(block[j+1]);if(nx)assin=nx.replace(/\s+-\s+Assinado.*$/,'');}
        return;
      }
      if(j>0&&/^\s*Signatário/.test(block[j-1]||''))return;
      if(j>0&&/^\s*Data\s*$/.test(block[j-1]||''))return;
      if(/^\s*[A-ZÀ-Ú .]+\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}\s*$/.test(l))return;
      let x=l.replace(/Num\.\s*\d+\s*-\s*Pág\.\s*\d+\s+Assinado eletronicamente por:.*?Este documento foi gerado pelo usuário\s+\S+\s+em\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\s*/g,'');
      const d=decodeLine(x);if(d.enc)encoded=true;x=d.text;
      if(S(x))body.push(x);
    });
    const content=tidy(body.join('\n')).trim();
    // partes (somente documentos do próprio processo)
    const kind=kindOf(tipo,desc,content,classeAbbr,naoJuntado);
    // origem: documento de outro processo (anexo/paradigma)
    let outro='';
    const capa=/(?:N[úu]mero|Num\.?|Processo n[ºo°]?|Autos n[ºo°]?)\s*:?\s*(\d{7}\s?-\s?\d{2}\s?\.\s?\d{4}\s?\.\s?\d\s?\.\s?\d{2}\s?\.\s?\d{4})/i.exec(content.slice(0,1500));
    const isParty=['recurso','contrarrazoes','peticao','inicial','memoriais','mpf'].includes(kind);
    if(capa&&cnjDigits(capa[1])!==main&&(!isParty||/1º grau|pje1g/i.test(content.slice(0,3000)))){outro=fmtCnj(cnjDigits(capa[1]));}
    else if(!isParty&&/(comprobat|anexo|documento)/i.test(tipo)){
      const all=[...content.slice(0,3000).matchAll(CNJ_RE)].map(m=>cnjDigits(m[0]));
      if(all.length&&!all.includes(main)&&/decis|senten|despacho|acórd/i.test(content.slice(0,4000)))outro=fmtCnj(all[0]);
    }
    if(!outro){let m;ROLE_RE.lastIndex=0;const src=content.slice(0,4000);while((m=ROLE_RE.exec(src))){const role=N(m[1]).replace(/\s+/g,' '),name=S(m[2]).replace(/\s+/g,' ');if(name.length<3)continue;(polos[role]||(polos[role]=new Set())).add(name);}}
    const dt=/^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}:\d{2}))?/.exec(juntada||'');
    return {pos:k,id:id2||h.id,idOrigem:id2&&id2!==h.id?h.id:'',naoJuntado,tipo,descricao:desc,juntada,date:dt?`${dt[3]}-${dt[2]}-${dt[1]}${dt[4]?' '+dt[4]:''}`:'',por:S(por),assinado:S(assin),
      text:content,chars:content.length,encoded,empty:content.replace(/\s/g,'').length<40,outro,kind,recursoTipo:kind==='recurso'?recursoTipo(tipo,content):''};
  });
  const P={};Object.entries(polos).forEach(([k,v])=>P[k]=[...v]);
  return {processo:proc,main,docs,polos:P,classeAbbr,assunto,formato,semTexto};
}

/* ───────────────────────── 2 · EXTRAÇÃO POR REGRAS ───────────────────────── */
const sentences=t=>String(t||'').replace(/\n+/g,' ').split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú"“(])/).map(s=>s.trim()).filter(Boolean);
const VERB3=[[/^n[ãa]o conhe[çc]o/i,'não conheceu'],[/^conhe[çc]o/i,'conheceu'],[/^julgo/i,'julgou'],[/^nego/i,'negou'],[/^dou/i,'deu'],[/^rejeito/i,'rejeitou'],[/^acolho/i,'acolheu'],[/^extingo/i,'extinguiu'],[/^homologo/i,'homologou'],[/^defiro/i,'deferiu'],[/^indefiro/i,'indeferiu'],[/^concedo/i,'concedeu'],[/^denego/i,'denegou'],[/^declaro/i,'declarou'],[/^determino/i,'determinou'],[/^condeno/i,'condenou'],[/^fixo/i,'fixou'],[/^reconhe[çc]o/i,'reconheceu'],[/^anulo/i,'anulou'],[/^mantenho/i,'manteve'],[/^revogo/i,'revogou'],[/^recebo/i,'recebeu'],[/^n[ãa]o admito/i,'não admitiu'],[/^admito/i,'admitiu'],[/^suspendo/i,'suspendeu'],[/^julgo prejudicad/i,'julgou prejudicad']];
function third(s){s=S(s).replace(/^[,:;\s]+/,'');for(const [re,to] of VERB3){if(re.test(s))return s.replace(re,to);}return s;}
const clip=(s,n=320)=>{s=S(s).replace(/\s+/g,' ');return s.length>n?s.slice(0,n).replace(/\s+\S*$/,'')+'…':s;};
const ROUTINE=/^(publique-se|registre-se|intime(m)?-se|cumpra-se|p\.?\s?r\.?\s?i|int\.?$|arquivem-se|d[êe]-se baixa|oportunamente|campo grande|s[ãa]o paulo|data da assinatura|cumpra-se)/i;
const DISP_RE=/\b(Ante o exposto|Diante do exposto|Pelo exposto|Em face do exposto|Isto posto|Posto isso|Do exposto|Diante disso|Por todo o exposto|Ante o acima exposto|Diante do quadro)[,:]?\s*/gi;
function extractDecision(doc){
  const t=doc.text,out={};
  let m,last=null;DISP_RE.lastIndex=0;while((m=DISP_RE.exec(t)))last=m;
  let dispStart=-1,disp='';
  if(last){dispStart=last.index;const ss=sentences(t.slice(last.index+last[0].length,last.index+last[0].length+900));disp=ss[0]||'';if(disp.length<25&&ss[1])disp+=' '+ss[1];}
  else{
    const ss=sentences(t),from=Math.floor(ss.length*0.55);
    for(let i=ss.length-1;i>=from;i--){if(/^(n[ãa]o conhe[çc]o|conhe[çc]o|julgo|nego|dou|rejeito|acolho|extingo|homologo|defiro|indefiro|concedo|denego)\b/i.test(ss[i])){disp=ss[i];dispStart=t.indexOf(ss[i]);break;}}
  }
  if(disp){
    const r=third(disp).replace(/[.;]\s*$/,'');out.resultado=clip(r,300);
    const n=N(disp);
    out.decisao=/(concedo|concedeu) (parcialmente|em parte) a seguranca|parcialmente procedente/.test(n)?'Parcialmente procedente':/(denego|denegou) a seguranca/.test(n)?'Improcedente':/(concedo|concedeu) a seguranca/.test(n)?'Procedente':/\bimprocedente/.test(n)?'Improcedente':/\bprocedente/.test(n)?'Procedente':/sem (resolucao|julgamento) do merito|extingo o processo/.test(n)?'Extinção sem resolução do mérito':/homologo/.test(n)?'Homologatória':'Outra';
  }
  const before=dispStart>0?sentences(t.slice(Math.max(0,dispStart-1600),dispStart)):[];
  const fund=[...before].reverse().find(s=>/(configurad|imp[õo]e-se|raz[ãa]o pela qual|portanto|dessa forma|desse modo|^assim,|^logo,|conclui-se|ausente|n[ãa]o merece|merece (ser )?(acolhid|provid|reform))/i.test(s));
  if(fund)out.fundamento=clip(fund.replace(/[.;]\s*$/,''),320);
  const tail=dispStart>=0?sentences(t.slice(dispStart)):sentences(t.slice(-1500));
  const hon=tail.find(s=>/honor[áa]rios/i.test(s));
  if(hon){
    if(/\bsem (condena[çc][ãa]o (em|ao pagamento de) )?honor[áa]rios|n[ãa]o h[áa] (condena[çc][ãa]o em )?honor[áa]rios|incab[íi]ve(l|is) honor/i.test(hon))out.honorarios='sem condenação em honorários advocatícios';
    else{const p=/(\d{1,2}(?:[.,]\d+)?\s?%|\d{1,2}\s?\([a-zçãé ]+\)\s?por cento)[^.;]{0,140}/i.exec(hon);out.honorarios=clip(third(p?p[0]:hon).replace(/[.;]\s*$/,''),220);}
  }
  const cus=tail.find(s=>/\bcustas\b/i.test(s)&&!/recolhiment|guia/i.test(s));
  if(cus)out.custas=clip(third(cus).replace(/[.;]\s*$/,''),220);
  if(/gratuidade|justi[çc]a gratuita|art(igo)?\.?\s*98/i.test(tail.join(' '))){const g=tail.find(s=>/gratuidade|justi[çc]a gratuita|art(igo)?\.?\s*98/i.test(s));if(g&&!out.custas)out.custas=clip(third(g).replace(/[.;]\s*$/,''),220);}
  const prov=tail.slice(1).filter(s=>/-se\b|determino|oficie|expe[çc]a/i.test(s)&&!ROUTINE.test(s.trim())&&!/honor|custas/i.test(s)).slice(0,4).map(s=>third(s).replace(/[.;]\s*$/,''));
  if(prov.length)out.providencias=prov.join('\n');
  return out;
}
const PROC_HEAD=/^(D[AOE]S? )?(CASO EM EXAME|QUEST[AÃ]O EM DISCUSS|RAZ[OÕ]ES DE DECIDIR|DISPOSITIVO E TESE|TESE DE JULGAMENTO|JURISPRUD[EÊ]NCIA RELEVANTE|DISPOSITIVOS RELEVANTES|TEMPESTIVIDADE|CABIMENTO|ADMISSIBILIDADE|PREPARO|S[IÍ]NTESE|RELAT[OÓ]RIO|FATOS|BREVE|RESUMO|PEDIDOS?|REQUERIMENTOS?|CONCLUS|DECIS[AÃ]O AGRAVADA|DECIS[AÃ]O RECORRIDA|DECIS[AÃ]O EMBARGADA|SENTEN[CÇ]A RECORRIDA|R\.? ?DECIS|IMPUGNA[CÇ][AÃ]O ESPEC[IÍ]FICA|RAZ[OÕ]ES|EFEITO SUSPENSIVO|PEDIDO DE EFEITO|PERICULUM|FUMUS|TUTELA|LIMINAR|DIREITO$|M[EÉ]RITO$|PRELIMINARMENTE$|DISPOSITIVO|INTIMA[CÇ]|PRIORIDADE|GRATUIDADE|JUSTI[CÇ]A GRATUITA)/i;
const KEEPCAP=/^(CDAs?|STN|STJ|STF|TRF\d?|CPC|LEF|CF|INSS|PJe|EPE|RFB|PGFN|MPF|AJG|DPU|SISPAR|SISBAJUD|RENAJUD|PIX|GRU|CNPJ|CPF|IRPJ|CSLL|PIS|COFINS|ICMS|IPI|ISS|SIMPLES|ME|EPP|LTDA|EIRELI|TNU|TR|IPCA|SELIC|RPV|BPC|LOAS|CTN|CLT|EC|ADI|ADC|RE|RESP|ARE|AI)$/i;
function headingCase(h){
  const caps=h.split(/\s+/).filter(w=>!/^[A-ZÀ-Ú]{2,}s$/.test(w)).join('').replace(/[^A-Za-zÀ-ú]/g,'');const isCaps=caps&&caps===caps.toUpperCase();
  let s=h.replace(/^\s*(D[aeo]s?)\s+/i,'');
  if(isCaps)s=s.split(/\s+/).map(w=>KEEPCAP.test(w.replace(/[^\wÀ-ú]/g,''))?w:w.toLowerCase()).join(' ');
  return s.replace(/\s+([,.;:])/g,'$1').replace(/[\s:–-]+$/,'').trim();
}
function headings(t){
  const res=[];const re=/(?:^|[\s.])((?:[IVX]{1,5}|\d{1,2})(?:\.\d{1,2}){0,2})\s*(?:[-–—²±.)]|\s)\s*(?=[A-ZÀ-Ú"“])/g;let m;
  while((m=re.exec(t))){
    const num=m[1],arabic=/^\d/.test(num),at=m.index+m[0].length,rest=t.slice(at,at+300);
    if(/\b(do|da|ao|pelo|pela|o|a|e|ilustre|eminente)\s*$/i.test(t.slice(Math.max(0,m.index-12),m.index+1))&&/^I$/.test(num)){re.lastIndex=m.index+1;continue;}
    if(arabic&&/(art(igo)?s?\.?|§|n[º°o]\.?|lei|inciso|item|tema|s[úu]mula|R\$|Id\.?)\s*$/i.test(t.slice(Math.max(0,m.index-14),m.index+1))){re.lastIndex=m.index+1;continue;}
    const toks=rest.split(/\s+/);let take=[];
    const allCap=w=>!!w&&(/^[A-ZÀ-Ú0-9"“”'.,\/º°ª%()§–-]+$/.test(w)||/^[A-ZÀ-Ú]{2,}s$/.test(w));
    if(arabic&&!(allCap(toks[0])&&/[A-ZÀ-Ú]{4,}/.test(toks[0]+toks[1]))){re.lastIndex=m.index+1;continue;}
    if(allCap(toks[0])&&(allCap(toks[1]||'')||arabic)){
      for(const w of toks){if(allCap(w)||/^(e|de|do|da|dos|das|à|a|o|em|n[ºo°])$/.test(w)&&take.length&&take.length<26)take.push(w);else break;if(take.length>28)break;}
      while(take.length>1&&/^[AOEÀ]$/.test(take[take.length-1]))take.pop();
      while(take.length&&/^(e|de|do|da|dos|das|à|a|o|em)$/.test(take[take.length-1]))take.pop();
    }else if(/^D[aeo]s?$/.test(toks[0])||/^[A-ZÀ-Ú][a-zà-ú]/.test(toks[0])){
      for(let i=0;i<toks.length&&i<34;i++){const w=toks[i];if(i>1&&/^[A-ZÀ-Ú][a-zà-ú]*$/.test(w)&&!/^(Tesouro|Nacional|Federal|Fazenda|União|Constituição|Código|Lei|Tema|Súmula|Turma|Seção|Tribunal|Superior|Pag)$/.test(w))break;take.push(w);}
    }
    const text=take.join(' ').replace(/[.:;,]+$/,'');
    if(text.length<6||(text.split(' ').length<2&&!arabic)){re.lastIndex=m.index+1;continue;}
    res.push({num,raw:text,text:headingCase(text),at});
  }
  // descarta duplicatas (cabeçalhos repetidos) e títulos que só agrupam subtítulos
  const seen=new Set();return res.filter(h=>{const k=N(h.raw);if(seen.has(k))return false;seen.add(k);return true;})
    .filter(h=>!res.some(o=>o!==h&&o.num.startsWith(h.num+'.')));
}
function extractPetition(doc){
  const t=doc.text,out={preliminares:[],teses:[],pedidos:[]};
  const hs=headings(t);let inPrelim=false;
  hs.forEach(h=>{
    const raw=N(h.raw);
    if(/^(d[aeo]s? )?(preliminar|preliminares)$/.test(raw)){inPrelim=true;return;}
    if(/^(d[aeo]s? )?merito$/.test(raw)){inPrelim=false;return;}
    if(PROC_HEAD.test(h.raw.replace(/^\s*(D[AOE]S?)\s+/i,'').toUpperCase())||PROC_HEAD.test(h.raw))return;
    if(/preliminar/.test(raw)||inPrelim)out.preliminares.push(h.text.replace(/^preliminar(es)?( de)?\s*/i,''));
    else out.teses.push(h.text);
  });
  // pedidos
  const re=/(DOS? PEDIDOS?|DOS? REQUERIMENTOS?|Ante o exposto,?\s*(?:requer|pugna|pede)[^:]{0,40}:|requer(?:-se)?(?: a [A-ZÀ-Ú]\w+)?\s*:)/g;let m,last=null;while((m=re.exec(t)))last=m;
  if(last){
    let seg=t.slice(last.index+last[0].length);
    const stop=seg.search(/(Termos em que|Nestes termos|N\.\s?termos|D[áa]\s?-?\s?se ao presente|Dá-se à causa|Pede(-se)? deferimento|Requer, por fim)/i);if(stop>0)seg=seg.slice(0,stop);
    seg=seg.replace(/^[\s:.,;–-]*(?:(?:Ante o|Diante do|Pelo) exposto,?\s*)?(?:requer[^:]{0,40}:)?\s*/i,'').replace(/^(pugna|requer|pede)(-se)?\s+(a|o)\s+[A-ZÀ-Ú][^\s,]*(\s*\([^)]*\))?\s+(pel[oa]s?|por|seja|que)\s+/i,'');
    const items=seg.split(/(?:^|\s)[a-h]\)\s+/).map(s=>S(s)).filter(s=>s.length>8);
    (items.length?items:[seg]).slice(0,8).forEach(s=>{const one=s.split(/;\s/)[0];out.pedidos.push(clip(one.replace(/[;.]\s*$/,''),300));});
  }
  // sem títulos aproveitáveis: primeira frase da seção de mérito (resposta)
  if(!out.teses.length){const mi=t.search(/\b(\d{1,2}\.|[IVX]{1,4}\s*[-–.])?\s*(DO )?M[ÉE]RITO\b/);if(mi>=0){const ss=sentences(t.slice(mi).replace(/^\S*\s*(DO )?M[ÉE]RITO\s*/,''));const f=ss.find(x=>x.length>30&&!/^(data maxima venia|com a devida v[êe]nia)[,\s]*$/i.test(x));if(f)out.resumo=clip(f.replace(/^(Data maxima venia|Com a devida vênia)\s*,\s*/i,'').replace(/[.;]\s*$/,''),300);}}
  // quem apresenta a peça (frase de abertura)
  const open=sentences(t.slice(0,2200)).find(x=>/(apresenta|vem,? respeitosamente|interp[õo]e|interpor|op[õo]e|oferece)/i.test(x));if(open)out.opening=open;
  return out;
}
function extractMpf(doc){
  const t=doc.text,tail=N(t.slice(-2200)),out={};
  const m=/(opina|manifesta-se|pugna|requer|oficia)[^.]{0,80}?\b(pel[oa]s?|no sentido d[oa])\s+(nao provimento|desprovimento|improvimento|provimento parcial|parcial provimento|provimento|regular prosseguimento|prosseguimento|nao conhecimento|nao intervencao|ausencia de interesse|desnecessidade de intervencao|anulacao|extincao)/.exec(tail);
  if(m){const k=m[3];out.sentido=/nao provimento|desprovimento|improvimento/.test(k)?'Não provimento do recurso':/^provimento$/.test(k)?'Provimento do recurso':/prosseguimento|nao intervencao|ausencia de interesse|desnecessidade/.test(k)?'Prosseguimento do feito':'Outro';if(out.sentido==='Outro')out.sentidoOutro=k.replace('provimento parcial','parcial provimento');}
  if(!out.sentido&&/falta de interesse|nao intervencao|ausencia de interesse/.test(N(doc.tipo)+' '+N(doc.descricao)))out.sentido='Prosseguimento do feito';
  const hs=headings(t).filter(h=>!PROC_HEAD.test(h.raw.replace(/^\s*(D[AOE]S?)\s+/i,'').toUpperCase())&&!/^(ministerio publico|procuradoria|excelentissim|autos n)/.test(N(h.raw)));
  if(hs.length)out.fundamentos=hs.slice(0,6).map(h=>h.text).join('; ');
  return out;
}

/* ───────────────────────── 3 · PARTES E PRÉ-SELEÇÃO ───────────────────────── */
const PARTES=['parte autora','autor','autora','parte ré','réu','ré','parte exequente','exequente','parte executada','executado','executada','impetrante','impetrado','impetrada','agravante','agravado','agravada','embargante','embargado','embargada','União','INSS','Caixa Econômica Federal','BACEN','Fazenda Nacional'];
function entityOf(name){const n=N(name);if(/\buniao\b|fazenda nacional/.test(n))return 'União';if(/\binss\b|instituto nacional do seguro social/.test(n))return 'INSS';if(/caixa economica/.test(n))return 'Caixa Econômica Federal';if(/banco central|\bbacen\b/.test(n))return 'BACEN';return '';}
const OPP={agravante:'agravado',agravado:'agravante',agravada:'agravante',apelante:'apelado',apelado:'apelante',apelada:'apelante',embargante:'embargado',embargado:'embargante',embargada:'embargante',impetrante:'impetrado',impetrado:'impetrante',recorrente:'recorrido',recorrido:'recorrente',exequente:'executado',executado:'exequente'};
function filerOf(doc,parsed,r){
  const head=N(doc.text.slice(0,1800));let best=null;
  Object.entries(parsed.polos).forEach(([role,names])=>names.forEach(name=>{const key=N(name).split(' ').filter(w=>w.length>2).slice(0,3).join(' ');if(!key)return;const i=head.indexOf(key);if(i>=0&&(!best||i<best.i))best={i,role,name};}));
  if(!best){const pa=S(r['Polo Ativo']),pp=S(r['Polo Passivo']);[[pa,'parte autora'],[pp,'parte ré']].forEach(([nm,role])=>{const key=N(nm).split(' ').filter(w=>w.length>2).slice(0,3).join(' ');if(key&&head.indexOf(key)>=0&&(!best||head.indexOf(key)<best.i))best={i:head.indexOf(key),role,name:nm};});}
  return best;
}
function parteValue(f,r){
  if(!f)return {parte:'',custom:'',label:''};
  const ent=entityOf(f.name);if(ent)return {parte:ent,custom:'',label:`${ent} (${f.role})`};
  const role=N(f.role).replace(/^parte /,'parte ');
  const pa=N(r['Polo Ativo']),pp=N(r['Polo Passivo']),k=N(f.name).split(' ').slice(0,3).join(' ');
  if(['apelante','recorrente','apelado','apelada','recorrido'].includes(role)){if(k&&pa.includes(k))return {parte:'parte autora',custom:'',label:`parte autora (${f.name})`};if(k&&pp.includes(k))return {parte:'parte ré',custom:'',label:`parte ré (${f.name})`};return {parte:'custom',custom:f.name,label:f.name};}
  const map={'agravante':'agravante','agravado':'agravado','agravada':'agravada','embargante':'embargante','embargado':'embargado','embargada':'embargada','impetrante':'impetrante','impetrado':'impetrado','impetrada':'impetrada','exequente':'parte exequente','executado':'parte executada','executada':'parte executada','autor':'parte autora','autora':'parte autora','parte autora':'parte autora','reu':'parte ré','re':'parte ré','parte re':'parte ré'};
  const p=map[role];return p?{parte:p,custom:'',label:`${p} (${f.name})`}:{parte:'custom',custom:f.name,label:f.name};
}
const TARGETS=[['','Não usar'],['sentenca','Decisão recorrida / sentença'],['preparo','Preparo (GRU / comprovante)'],['impugnada','Decisão impugnada (embargada · agravada · em retratação)'],['devolucao','Devolução para retratação'],['edret','Embargos anteriores (retratação)'],['recurso','Recurso'],['contrarrazoes','Contrarrazões'],['mpf','Parecer do MPF'],['procuracao','Procuração (Representação)'],['outras','Outras peças']];
/* ── procurações ── */
const MESES={janeiro:1,fevereiro:2,marco:3,abril:4,maio:5,junho:6,julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12};
const isoYMD=(y,m,d)=>{y=+y;m=+m;d=+d;if(!y||!m||!d||m>12||d>31||y<1950||y>2100)return '';const t=new Date(Date.UTC(y,m-1,d));return t.getUTCMonth()===m-1?`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:'';};
/* data da ASSINATURA que consta no documento (não a da juntada no PJe): a data por extenso do fecho
   (“Campo Grande, 10 de março de 2025”) ou a da assinatura digital (gov.br / ICP) */
function procDate(text){
  const t=String(text||'');
  const L=[...t.matchAll(/(\d{1,2})\s*(?:º|°|o)?\s+de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/gi)];
  for(let k=L.length-1;k>=0;k--){const m=L[k];const v=isoYMD(m[3],MESES[N(m[2])],m[1]);if(v)return v;}
  const g=/(?:assinad[oa]\s+digitalmente|data\s+da\s+assinatura|assinatura\s+digital)[^\n]{0,160}?(\d{2})\/(\d{2})\/(\d{4})/i.exec(t)||/\bData:\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
  return g?isoYMD(g[3],g[2],g[1]):'';
}
const NOT_NAME=/\b(agravo|instrumento|recurso|tribunal|vossa|excel|processo|codigo|civil|federal|regiao|justica|ordem|advogad|brasileir|inscrit|secao|estado|rua|avenida|outorgad|outorgant|poderes|clausula|procurac|substabelec)\b/;
/* advogados indicados (nome e OAB), de modo enxuto: “NOME (OAB/UF nº)” */
function procLawyers(text){
  const t=String(text||'').replace(/\s+/g,' '),out=[],seen=new Set();
  const re=/OAB\s*[\/\-]?\s*([A-Z]{2})\s*(?:,?\s*(?:sob\s+(?:o\s+)?)?n[º°o.]*\s*)?(\d{1,3}(?:\.\d{3})+|\d{3,7})(?:\s*-?\s*([A-Z])\b)?/g;
  let m;
  while((m=re.exec(t))){
    const oab=`OAB/${m[1]} ${m[2]}${m[3]?'-'+m[3]:''}`,key=oab.replace(/\D/g,'')+m[1];if(seen.has(key))continue;seen.add(key);
    const before=t.slice(Math.max(0,m.index-140),m.index);let name='';
    for(const c of [...before.matchAll(/((?:[A-ZÀ-Ú][A-Za-zÀ-ú'’]+)(?:\s+(?:d[aeo]s?|e|[A-ZÀ-Ú][A-Za-zÀ-ú'’]+)){1,7})/g)]){
      const rest=before.slice(c.index+c[0].length);
      if(/^[\s,;:–-]*(?:(?:advogad[oa]s?|inscrit[oa]s?|regularmente|devidamente|na|no|sob|o|a|n[º°o.]*|\()[\s,;:–-]*)*$/i.test(rest)&&!NOT_NAME.test(N(c[1])))name=c[1].replace(/\s+(?:d[aeo]s?|e)$/i,'');
    }
    out.push(name?`${name.toUpperCase()} (${oab})`:oab);
  }
  return out;
}
const nameKeys=n=>N(n).replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(w=>w.length>2&&!['ltda','eireli','epp','me','sa','dos','das','des'].includes(w));
function nameHit(name,text){const ks=nameKeys(name);if(ks.length<2)return false;const t=N(text);return ks.filter(k=>t.includes(k)).length>=Math.min(3,ks.length);}
/* nome do recorrente: quem interpôs o recurso selecionado */
function partyOfRecurso(rec,parsed){
  if(!rec)return '';
  const f=filerOf(rec,parsed,{});if(f?.name)return S(f.name);
  const m=/(?:^|\s)([A-ZÀ-Ú][A-ZÀ-Ú0-9 .&'\/-]{6,120}?)\s*,\s*(?:pessoa|brasileir|inscrit|portador|j[áa] qualificad|qualificad|devidamente|neste ato)/.exec(rec.text.slice(0,3000));
  const all=Object.values(parsed.polos||{}).flat();
  /* “AO JUÍZO DA 1ª VARA … NIVALDO DE SOUZA …”: prefere o nome de parte contido no trecho */
  if(m){const hit=all.filter(n=>N(m[1]).includes(N(n))).sort((a,b)=>b.length-a.length)[0];if(hit)return S(hit);}
  const lead=Object.entries(parsed.polos||{}).filter(([role])=>/^(apelante|agravante|embargante|recorrente)$/.test(role)).flatMap(([,ns])=>ns);
  if(m&&!/\b(VARA|JU[ÍI]ZO|TRIBUNAL|EXCELENT|REGI[ÃA]O|SENHOR|DOUTOR)\b/.test(m[1]))return S(m[1]);
  return lead.length===1?S(lead[0]):m?S(m[1]).replace(/^.*\b(?:MS|SP|MT|RJ|PR|ES|MG|DF|REGI[ÃA]O)\s+/,''):'';
}
/* garante que a procuração é do recorrente e de seu advogado (outorgante = recorrente, ou juntada pelo mesmo advogado do recurso) */
function procMatch(d,parsed,rec){
  if(d.outro)return {ok:false,reason:'Procuração de outro processo: não utilizada.'};
  if(!rec)return {ok:false,reason:'Sem recurso identificado: confirme a quem pertence a procuração antes de usá-la.'};
  const who=parsed.recorrente||partyOfRecurso(rec,parsed),hay=[d.descricao,d.text.slice(0,5000)].join(' ');
  const byName=!!who&&nameHit(who,hay),sameLawyer=!!d.por&&!!rec.por&&N(d.por)===N(rec.por);
  const opp=Object.entries(parsed.polos||{}).filter(([role])=>/agravad|apelad|recorrid|embargad|impetrad|^reu$|^re$|parte re/.test(role)).flatMap(([,ns])=>ns).find(n=>nameHit(n,hay)&&!(who&&nameHit(who,n)));
  if(opp&&!byName)return {ok:false,reason:`A procuração parece ser de ${opp} (parte contrária), não do recorrente.`};
  if(byName||sameLawyer)return {ok:true,recorrente:who,how:byName&&sameLawyer?'outorgante = recorrente; juntada pelo advogado do recurso':byName?'outorgante = recorrente':'juntada pelo mesmo advogado que interpôs o recurso'};
  return {ok:false,reason:`Não foi possível confirmar que a procuração é do recorrente${who?` (${who})`:''}: não pré-selecionada.`};
}
/* ───────── regularidade e origem a partir do inteiro teor: quem recorre, preparo (GRU), tempestividade, juízo ───────── */
const addDays=(dt,n)=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(dt||'');if(!m)return '';const t=new Date(Date.UTC(+m[1],+m[2]-1,+m[3])+n*864e5);return t.toISOString().slice(0,10)+(dt.slice(10)||'');};
const iso10=dt=>/^\d{4}-\d{2}-\d{2}/.test(dt||'')?dt.slice(0,10):'';
/* entes com isenção de custas (art. 4º, I, da Lei 9.289/1996) e prazo em dobro (art. 183 do CPC); conselhos têm o prazo, não a isenção */
const PUB_RE=/\b(uni[aã]o|fazenda nacional|fazenda p[uú]blica|instituto nacional|inss|ibama|incra|dnit|funai|anvisa|fundac[aã]o|universidade federal|instituto federal|ag[eê]ncia nacional|banco central|bacen|minist[eé]rio p[uú]blico|estado d[eoa]|munic[ií]pio|autarquia|delegad[oa] da receita|receita federal)\b/i;
const NOT_PUB=/caixa econ[oô]mica|banco do brasil|petrobr[aá]s|empresa brasileira|correios|ltda|s\.?\/?a\.?$|eireli/i;
function recorrenteInfo(parsed,rec){
  const name=S(parsed.recorrente||partyOfRecurso(rec,parsed));
  const head=rec?String(rec.text||'').slice(0,4000):'',sig=[rec?.por,rec?.assinado].join(' ');
  const advPub=/ADVOCACIA[- ]GERAL DA UNI|PROCURADORIA[- ]GERAL (FEDERAL|DA FAZENDA)|PROCURADORIA (REGIONAL )?(FEDERAL|DA FAZENDA NACIONAL|DA UNI)|PROCURADOR(A)? (FEDERAL|DA FAZENDA)|AGU\.GOV\.BR|PGFN/i.test(head+' '+sig);
  const dpu=/DEFENSORIA P[ÚU]BLICA DA UNI|\bDPU\b/i.test(head.slice(0,2500)+' '+sig);
  const mp=/minist[eé]rio p[uú]blico/i.test(name)||/PROCURADORIA REGIONAL DA REP[ÚU]BLICA|MPF\.MP\.BR/i.test(sig);
  const conselho=/conselho (regional|federal)/i.test(name);
  const publico=!NOT_PUB.test(name)&&(PUB_RE.test(name)||!!entityOf(name)&&entityOf(name)!=='Caixa Econômica Federal')||advPub&&!name;
  return {name,publico:publico||advPub&&!NOT_PUB.test(name),dpu,mp,conselho,dobro:publico||advPub||dpu||mp||conselho};
}
/* GRU e comprovante: indicadores do recolhimento */
const GRU_COD={'18710-0':'custas (1º grau)','18720-8':'custas (TRF)','18730-5':'porte de remessa e retorno','18740-2':'custas (TRF)','18760-7':'custas (TRF)'};
function gruInfo(d){
  const t=String(d.text||'').replace(/\s+/g,' '),o={};
  o.gru=/GUIA DE RECOLHIMENTO DA UNI[ÃA]O|\bGRU\b/i.test(t);
  const c=/\b(18\d{3}-\d)\b/.exec(t);o.codigo=c?c[1]:'';o.codNome=GRU_COD[o.codigo]||'';
  o.comprovante=/comprovante de (pagamento|transa)|autentica[çc][ãa]o (eletr[ôo]nica|mec[âa]nica|banc[áa]ria)|pagamento (efetuado|realizado)|\bpix\b|id da transa[çc][ãa]o|c[óo]digo de autentica|transa[çc][ãa]o (efetuada|realizada)/i.test(t);
  const v=/Valor(?: Total| pago| do pagamento| cobrado)?\s*:?\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i.exec(t)||/R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/.exec(t);o.valor=v?v[1]:'';
  const p=/(?:Realizado em|Data (?:do |de )?pagamento|Pago em|Data da transa[çc][ãa]o|Data do d[ée]bito)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i.exec(t);o.pago=p?p[1]:'';
  o.recurso=/apela|recurs|preparo|porte de remessa/i.test(S(d.descricao)+' '+t.slice(0,300));
  o.processo=[...t.matchAll(CNJ_RE)].map(m=>cnjDigits(m[0]))[0]||'';
  return o;
}
function gruTxt(g){return [g.gru?'GRU':'sem GRU no documento',g.codigo?`código ${g.codigo}${g.codNome?' ('+g.codNome+')':''}`:'',g.valor?`R$ ${g.valor}`:'',g.comprovante?`comprovante de pagamento${g.pago?' de '+g.pago:''}`:'sem comprovante de pagamento no texto'].filter(Boolean).join(' · ');}
/* gratuidade deferida antes do recurso (despacho, decisão ou sentença) */
const AJG_OK=/(defiro|concedo|deferid[oa]s?|concedid[oa]s?)[^.]{0,90}(gratuidade|justi[çc]a gratuita|assist[êe]ncia judici[áa]ria)|(gratuidade|justi[çc]a gratuita|assist[êe]ncia judici[áa]ria)[^.]{0,40}(que ora defiro|ora deferid|que defiro)|benefici[áa]ri[oa] da (justi[çc]a gratuita|gratuidade)/i;
const AJG_NO=/(indefiro|revogo|indeferid[oa]|revogad[oa])[^.]{0,80}(gratuidade|justi[çc]a gratuita|assist[êe]ncia judici[áa]ria)/i;
function ajgOf(parsed,rec){
  const key=d=>(d.date||'')+'|'+String(d.id).padStart(12,'0');let hit=null,no=null;
  parsed.docs.filter(d=>!d.outro&&['sentenca','decisao','despacho','acordao'].includes(d.kind)&&(!rec||!d.date||key(d)<=key(rec))).forEach(d=>{const t=d.text.replace(/\s+/g,' ');const m=AJG_OK.exec(t);if(m&&!AJG_NO.test(m[0])){hit={d,frase:clip(m[0],160)};}if(AJG_NO.test(t))no=d;});
  return hit&&(!no||key(no)<key(hit.d))?hit:null;
}
/* advogados do lado do recorrente no cabeçalho dos atos do 2º grau (“ADVOGADO do(a) …: NOME - UF000000-A”) */
function sideLawyers(parsed,name){
  const docs=parsed.docs.filter(d=>!d.outro&&/(APELANTE|AGRAVANTE|EMBARGANTE|RECORRENTE|IMPETRANTE|EXEQUENTE|AUTOR)\s*:/.test(d.text.slice(0,3000))).reverse();
  for(const d of docs){
    const h=d.text.slice(0,3000).replace(/\s+/g,' ');
    const a=/(APELANTE|AGRAVANTE|EMBARGANTE|RECORRENTE|IMPETRANTE|EXEQUENTE|AUTOR[A]?)\s*:/.exec(h);if(!a)continue;
    const rest=h.slice(a.index),b=/\b(APELAD[OA]|AGRAVAD[OA]|EMBARGAD[OA]|RECORRID[OA]|IMPETRAD[OA]|EXECUTAD[OA]|R[ÉE]U|OUTROS PARTICIPANTES)\s*:/.exec(rest.slice(10));
    const ativo=b?rest.slice(0,b.index+10):rest.slice(0,900),passivo=b?rest.slice(b.index+10,b.index+10+900):'';
    const seg=name&&!nameHit(name,ativo)&&nameHit(name,passivo)?passivo:ativo;
    const L=[...seg.matchAll(/([A-ZÀ-Ú][A-ZÀ-Ú .'’]{4,80}?)\s+-\s+([A-Z]{2})(\d{3,7})(?:-([A-Z]))?\b/g)].map(m=>`${S(m[1]).replace(/^(?:ADVOGAD[OA]S?\s+do\(a\)\s+[A-ZÀ-Ú ]+:\s*)/i,'')} (OAB/${m[2]} ${m[3]}${m[4]?'-'+m[4]:''})`);
    if(L.length)return [...new Set(L)];
  }
  return [];
}
const titleName=n=>S(n).toLowerCase().replace(/(^|\s)(\p{L})/gu,(x,s,c)=>s+c.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g,w=>w.toLowerCase());
/* origem: juízo, julgador(a), valor da causa, tutela e reexame, a partir da decisão recorrida e da certidão de autuação */
function origemOf(parsed,sen){
  const o={};if(!sen)return o;const t=sen.text.replace(/\s+/g,' ');
  const j=/(\d{1,2}[ªaº]\s+Vara(?:\s+(?:Federal|Gabinete|C[íi]vel|Criminal|Previdenci[áa]ria|de Execu[çc][õo]es Fiscais))*\s+(?:de|da|do)\s+[A-ZÀ-Ú][a-zà-ú]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÀ-Ú][a-zà-ú]+){0,3}|Juizado Especial Federal(?:\s+C[íi]vel)?\s+(?:de|da|do)\s+[A-ZÀ-Ú][a-zà-ú]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÀ-Ú][a-zà-ú]+){0,3})/.exec(t.slice(0,4000));
  if(j)o.juizo=S(j[1]).replace(/\s+(Rua|Avenida|Av|Pra[çc]a)$/,'');
  if(sen.assinado&&!/usu[aá]rio do sistema|tribunal|token|https?:/i.test(sen.assinado))o.julgador=titleName(sen.assinado.split(',')[0]);
  let disp=t;DISP_RE.lastIndex=0;let m,last=null;while((m=DISP_RE.exec(t)))last=m;if(last)disp=t.slice(last.index);
  if(/(revogo|casso|torno sem efeito)[^.]{0,80}(tutela|liminar)/i.test(disp))o.tutela='revogada';
  else if(/(antecipo|concedo|defiro|confirmo)[^.]{0,80}(tutela|liminar)|(tutela|liminar)[^.]{0,40}(ora )?(concedida|deferida|confirmada)/i.test(disp))o.tutela='concedida';
  else if(/(indefiro|nego|denego)[^.]{0,60}(tutela|liminar)/i.test(disp))o.tutela='negada';
  if(/n[ãa]o (est[áa] )?sujeit[ao] (ao|a|à) (reexame|remessa)|dispensad[oa] (o |a )?(reexame|remessa)|sem (reexame|remessa) necess|art(igo)?\.?\s*496,?\s*§\s*[34]/i.test(disp))o.reexame='dispensada';
  else if(/sujeit[ao] (ao|a|à) (reexame|remessa|duplo grau)|submet[a-z]* (ao|a|à) (reexame|remessa)|(reexame|remessa) necess[áa]ri[oa] (na forma|nos termos)|art\.?\s*14,?\s*§\s*1/i.test(disp))o.reexame='sim';
  for(const d of parsed.docs.filter(z=>!z.outro)){const x=d.text.replace(/\s+/g,' ');const v=/VALOR ATRIBU[ÍI]DO [ÀA] CAUSA:\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i.exec(x)||(d.kind==='inicial'?/(?:d[áa]-se|atribui-se|atribuindo-se)\s+(?:à|a)\s+(?:presente\s+)?(?:causa|a[çc][ãa]o|demanda)\s+o\s+valor\s+de\s+R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i.exec(x):null);if(v){o.valor='R$ '+v[1];o.valorDoc=d.id;break;}}
  return o;
}
function preselect(parsed){
  const main=parsed.docs.filter(d=>!d.outro),key=d=>(d.date||'')+'|'+String(d.id).padStart(12,'0');
  const ord=[...main].sort((a,b)=>key(a).localeCompare(key(b)));
  parsed.docs.forEach(d=>{d.target='';d.hint='';d.info='';d.anexos=null;d.anexoDe='';d.dupOf='';});
  const recs=ord.filter(d=>d.kind==='recurso'&&!/especial\/extra/.test(N(d.recursoTipo)));
  if(recs.length){
    const last=recs[recs.length-1];
    const decs=ord.filter(d=>['sentenca','decisao','acordao'].includes(d.kind)&&key(d)<key(last));
    const dec=decs[decs.length-1];
    if(dec){dec.target='sentenca';recs.filter(d=>key(d)>key(dec)).forEach(d=>d.target='recurso');}
    else last.target='recurso';
    const first=recs.find(d=>d.target==='recurso');
    ord.filter(d=>d.kind==='contrarrazoes'&&first&&key(d)>key(first)).forEach(d=>d.target='contrarrazoes');
  }
  const mpf=ord.filter(d=>d.kind==='mpf');if(mpf.length)mpf[mpf.length-1].target='mpf';
  /* procurações: todas as localizadas; só as confirmadas como do recorrente (e de seu advogado) são pré-selecionadas */
  const recDoc=ord.filter(d=>d.target==='recurso').pop()||recs[recs.length-1]||null;
  parsed.recorrente=partyOfRecurso(recDoc,parsed);
  ord.filter(d=>d.kind==='procuracao').forEach(d=>{const m=procMatch(d,parsed,recDoc);d.procMatch=m;if(m.ok)d.target='procuracao';else d.hint=(d.hint?d.hint+' ':'')+m.reason;});
  /* contrarrazões protocoladas em duplicidade (mesma peça, mesmo subscritor): uma só, com os dois IDs */
  const cr=ord.filter(d=>d.target==='contrarrazoes');
  cr.forEach((d,i)=>{const o=cr.slice(0,i).find(z=>!z.dupOf&&z.chars&&z.chars===d.chars&&N(z.por)===N(d.por));if(o){d.dupOf=o.id;d.hint=(d.hint?d.hint+' ':'')+`Mesma peça do ID ${o.id} (protocolo em duplicidade): os IDs são gravados juntos.`;}});
  /* anexos da petição eletrônica: mesmo subscritor e mesma juntada (até 3 min) */
  const mins=d=>{const m=/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(d.date||'');return m?Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5])/6e4:NaN;};
  const PRINC=['peticao','memoriais','recurso','contrarrazoes','mpf','inicial','custas'];
  ord.filter(d=>(d.kind==='documento'||d.kind==='peticao')&&(d.por||d.assinado)).forEach(a=>{const p=ord.filter(z=>z!==a&&(a.kind==='documento'?PRINC.includes(z.kind):['recurso','contrarrazoes','memoriais','mpf'].includes(z.kind))&&(N(z.por)===N(a.por)||!!a.assinado&&N(z.assinado)===N(a.assinado))&&Math.abs(mins(z)-mins(a))<=3).sort((x,y)=>Math.abs(mins(x)-mins(a))-Math.abs(mins(y)-mins(a)))[0];if(p){(p.anexos||(p.anexos=[])).push(a.id);a.anexoDe=p.id;}});
  /* Outras peças: o que as partes juntaram depois do recurso em exame (memoriais, petições), sem ciências nem anexos */
  const firstRec=ord.find(d=>d.target==='recurso');
  if(firstRec)ord.filter(d=>!d.target&&!d.empty&&!d.anexoDe&&key(d)>key(firstRec)&&(d.kind==='memoriais'||d.kind==='peticao')).forEach(d=>{d.target='outras';d.hint=(d.hint?d.hint+' ':'')+'Peça juntada após o recurso: sugerida para Outras peças.';});
  /* Preparo: guias e comprovantes juntados entre a decisão recorrida e o recurso (ou que o mencionem) */
  const dec=ord.filter(d=>d.target==='sentenca'||d.target==='impugnada').pop();
  if(firstRec)ord.filter(d=>d.kind==='custas').forEach(d=>{const near=(!dec||key(d)>=key(dec))&&(d.date||'')<=(firstRec.date?addDays(firstRec.date,10):'~');const g=gruInfo(d);
    if(near||g.recurso){d.target='preparo';d.hint=(d.hint?d.hint+' ':'')+gruTxt(g);}else d.hint=(d.hint?d.hint+' ':'')+'Custas anteriores à decisão recorrida (iniciais): não são o preparo do recurso.';});
  /* informações exibidas na lista */
  ord.filter(d=>d.kind==='pauta').forEach(d=>{const t=d.text.replace(/\s+/g,' ');const m=/Data:\s*(\d{2})-(\d{2})-(\d{4})/.exec(t),tp=/Tipo da sess[ãa]o de julgamento:\s*(.+?)\s+Data:/i.exec(t);d.info=[/INTIMA[ÇC][ÃA]O\s*[–-]\s*ALTERA/i.test(t)?'Alteração da pauta':'',m?`Sessão de ${m[1]}/${m[2]}/${m[3]}`:'',tp?S(tp[1]).toLowerCase():''].filter(Boolean).join(' · ');});
  ord.filter(d=>d.kind==='minuta').forEach(d=>{d.info='Minuta do gabinete no PJe, ainda não juntada.';});
  ord.filter(d=>d.anexoDe).forEach(d=>{d.info=`Anexo da peça ID ${d.anexoDe}.`;});
  ord.filter(d=>d.idOrigem).forEach(d=>{d.info=(d.info?d.info+' ':'')+`ID no 1º grau: ${d.idOrigem}.`;});
  parsed.docs.filter(d=>d.outro).forEach(d=>d.hint=`Documento do processo ${d.outro}: não é pré-selecionado para não contaminar o processo principal.`);
  parsed.docs.filter(d=>d.empty).forEach(d=>d.hint=(d.hint?d.hint+' ':'')+'Sem conteúdo textual no TXT: aproveitam-se apenas ID, tipo e descrição.');
  parsed.docs.filter(d=>d.encoded&&!d.empty).forEach(d=>d.hint=(d.hint?d.hint+' ':'')+'Texto recuperado de fonte codificada do PDF.');
}


/* ───────── v81 · espécies com configuração própria: embargos de declaração, agravo interno e juízo de retratação ─────────
   A espécie vem do card (Padrão - Espécie, etiquetas, classe) ou, na falta, do próprio TXT. Para cada uma, a pré-seleção
   indica a peça impugnada (acórdão embargado, decisão agravada, acórdão a retratar), o recurso em exame e, na retratação,
   a decisão de devolução e os embargos anteriores; a conferência sugere os campos próprios do card. */
const RETRAT_RE=/ju[íi]zo\s+de\s+retrata|art(?:igo)?\.?\s*1\.?040,?\s*(?:inciso\s*)?II|art(?:igo)?\.?\s*1\.?030,?\s*(?:inciso\s*)?II|retorno dos autos [àa] (?:e\.?\s*)?turma|devolu[çc][ãa]o dos autos [àa] (?:e\.?\s*)?turma|encaminhem-se os autos [àa] turma/i;
function kindFor(rowIndex,parsed){
  const pg=page(),r=pg?.host?.rows?.[rowIndex];let k='';try{k=pg?.padraoKind?.(r)||'';}catch(_){}
  if(k)return k;
  const main=parsed.docs.filter(d=>!d.outro);
  if(main.some(d=>['decisao','despacho'].includes(d.kind)&&RETRAT_RE.test(d.text.slice(0,6000))))return 'retratacao';
  const recs=main.filter(d=>d.kind==='recurso'),last=recs[recs.length-1];
  if(last?.recursoTipo==='Embargos de declaração')return 'ed';
  if(last?.recursoTipo==='Agravo interno')return 'interno';
  return '';
}
const KIND_TXT={ed:'Embargos de declaração',interno:'Agravo interno',retratacao:'Juízo de retratação'};
function preselectKind(parsed){
  const kind=parsed.kind;if(!kind)return;
  const main=parsed.docs.filter(d=>!d.outro),key=d=>(d.date||'')+'|'+String(d.id).padStart(12,'0'),ord=[...main].sort((a,b)=>key(a).localeCompare(key(b)));
  const isExc=d=>/especial\/extra/.test(N(d.recursoTipo));
  const reset=t=>parsed.docs.forEach(d=>{if(d.target===t)d.target='';});
  if(kind==='ed'||kind==='interno'){
    const want=kind==='ed'?'Embargos de declaração':'Agravo interno';
    const recs=ord.filter(d=>d.kind==='recurso'&&!isExc(d)),rec=[...recs].reverse().find(d=>d.recursoTipo===want)||recs[recs.length-1];if(!rec)return;
    reset('recurso');reset('contrarrazoes');rec.target='recurso';
    const prior=ord.filter(d=>key(d)<key(rec)&&(kind==='ed'?d.kind==='acordao':['decisao','acordao'].includes(d.kind)));
    const imp=prior[prior.length-1];
    if(imp){if(imp.target==='sentenca')imp.target='';imp.target='impugnada';imp.hint=(imp.hint?imp.hint+' ':'')+(kind==='ed'?'Acórdão embargado (último acórdão antes dos embargos).':'Decisão agravada (última decisão antes do agravo interno).');}
    const sent=ord.filter(d=>d.kind==='sentenca'&&(!imp||key(d)<key(imp))).pop();if(sent&&!parsed.docs.some(d=>d.target==='sentenca'&&d!==imp))sent.target='sentenca';
    ord.filter(d=>d.kind==='contrarrazoes'&&key(d)>key(rec)).forEach(d=>d.target='contrarrazoes');
    rec.hint=(rec.hint?rec.hint+' ':'')+`${want} em exame.`;
    return;
  }
  /* juízo de retratação */
  const dev=[...ord].reverse().find(d=>['decisao','despacho'].includes(d.kind)&&RETRAT_RE.test(d.text.slice(0,6000)));
  if(dev){dev.target='devolucao';dev.hint=(dev.hint?dev.hint+' ':'')+'Decisão que devolveu os autos para eventual juízo de retratação.';}
  const limit=dev?key(dev):'~';
  const eds=ord.filter(d=>d.kind==='recurso'&&d.recursoTipo==='Embargos de declaração'&&key(d)<limit);
  const firstExc=ord.find(d=>d.kind==='recurso'&&isExc(d)&&key(d)<limit);
  const bound=eds.length?key(eds[0]):firstExc?key(firstExc):limit;
  const acs=ord.filter(d=>d.kind==='acordao'&&key(d)<bound),imp=acs[acs.length-1];
  reset('sentenca');reset('recurso');reset('contrarrazoes');
  if(imp){imp.target='impugnada';imp.hint=(imp.hint?imp.hint+' ':'')+'Acórdão submetido à retratação.';}
  eds.forEach(d=>{d.target='edret';});
  if(eds.length){const acEd=ord.find(d=>d.kind==='acordao'&&key(d)>key(eds[0])&&key(d)<limit);if(acEd){acEd.target='edret';acEd.hint=(acEd.hint?acEd.hint+' ':'')+'Acórdão que julgou os embargos.';}}
  ord.filter(d=>d.kind==='recurso'&&isExc(d)).forEach(d=>{d.hint=(d.hint?d.hint+' ':'')+'Recurso excepcional: não é o recurso em exame no juízo de retratação.';});
  const orig=imp?ord.filter(d=>d.kind==='recurso'&&!isExc(d)&&d.recursoTipo!=='Embargos de declaração'&&key(d)<key(imp)).pop():null;
  if(orig){orig.target='recurso';ord.filter(d=>d.kind==='contrarrazoes'&&key(d)>key(orig)&&key(d)<key(imp)).forEach(d=>d.target='contrarrazoes');
    const sent=ord.filter(d=>['sentenca','decisao'].includes(d.kind)&&key(d)<key(orig)).pop();if(sent)sent.target='sentenca';}
}
const MESX=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function ementaOf(d){
  const t=d.text,a=t.search(/\bE\s?M\s?E\s?N\s?T\s?A\b/);if(a<0)return '';
  let seg=t.slice(a).replace(/^E\s?M\s?E\s?N\s?T\s?A\s*[:.\-–]?\s*/,'');
  const z=seg.search(/\b(A\s?C\s?[ÓO]\s?R\s?D\s?[ÃA]\s?O\b|ACORDAM\b|Vistos e relatados|Vistos, relatados)/);if(z>0)seg=seg.slice(0,z);
  return clip(seg.replace(/\n+/g,' '),4000);
}
function relatorOf(d){
  const m=/RELATOR(?:A)?\s*(?:\(A\))?\s*:?\s*(?:o|a)?\s*(?:Desembargador(?:a)?\s+Federal|Des\.?\s*Fed\.?|Juiz(?:a)?\s+Federal(?:\s+Convocad[oa])?)\s+([A-ZÀ-Ú][A-Za-zÀ-ú .'’]{3,80}?)(?=\s*(?:\n|$|-|–|APELA|AGRAVA|EMBARGA|RECORR|IMPETRA|INTERESS|ADVOGAD|PROCURADOR|E\s?M\s?E\s?N\s?T\s?A|\s{2}))/i.exec(d.text.slice(0,6000));
  if(!m)return '';return S(m[1]).toLowerCase().replace(/(^|\s)(\p{L})/gu,(x,s,c)=>s+c.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g,w=>w.toLowerCase());
}
function julgData(d){
  const m=/(?:julgad[oa]s?\s+em|sess[ãa]o\s+(?:virtual\s+)?(?:de\s+julgamento\s+)?(?:realizada\s+)?(?:em|de)|data\s+do\s+julgamento\s*:?)\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i.exec(d.text);
  if(m)return `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}`;
  return br(d.date);
}
function orgaoOf(d,kind){
  if(d.kind==='decisao')return 'decisão monocrática do relator';
  const m=/(\d{1,2}[ªa]\s+Turma|Turma Regional[^,.\n]{0,60}|\d{1,2}[ªa]\s+Se[çc][ãa]o|[ÓO]rg[ãa]o Especial)/i.exec(d.text.slice(0,8000));
  return m?S(m[1]).replace(/\s+/g,' '):'Turma';
}
function vicios(text){
  const n=N(text),L=[];if(/omiss/.test(n))L.push('omissão');if(/contradi/.test(n))L.push('contradição');if(/obscur/.test(n))L.push('obscuridade');if(/erro material/.test(n))L.push('erro material');
  return L.length<2?L.join(''):L.slice(0,-1).join(', ')+' e '+L[L.length-1];
}
/* sem tópicos na peça: as frases em que a parte aponta o vício ou expõe o fundamento */
function pontoOf(text){const fr=String(text||'').split(/\n+/).flatMap(l=>l.split(/(?<=[.;])\s+(?=[A-ZÀ-Ú])/)).filter(x=>!/^[A-ZÀ-Ú ()]+:/.test(x.trim())).filter(x=>/\b(aponta|alega|sustenta|aduz|argumenta|afirma|defende|insurge)/i.test(x)).slice(0,2);return clip(fr.join(' '),900);}
function edResultado(d){const n=N(extractDecision(d).resultado||d.text.slice(-2500));return /parcialmente acolh/.test(n)?'parcial':/rejeit/.test(n)?'rejeitados':/nao conhec/.test(n)?'naoconhecidos':/acolh/.test(n)?'acolhidos':'';}
function kindSuggestions(parsed,r,used,add){
  const kind=parsed.kind;if(!kind)return;
  const imp=used.filter(d=>d.target==='impugnada');
  if(imp.length){
    const d=imp[imp.length-1],x=extractDecision(d),sec={ed:'Acórdão embargado',interno:'Decisão agravada',retratacao:'Acórdão submetido à retratação'}[kind]+` · ID ${d.id}`;
    add({sec,key:'Impugnada - ID',label:'ID',value:imp.map(z=>z.id).join(', '),current:r['Impugnada - ID'],doc:d.id,kind:'field'});
    add({sec,key:'Impugnada - Data',label:'Data do julgamento / decisão',value:julgData(d),current:r['Impugnada - Data'],doc:d.id,kind:'field'});
    add({sec,key:'Impugnada - Órgão',label:'Órgão julgador',value:orgaoOf(d,kind),current:r['Impugnada - Órgão'],doc:d.id,kind:'field'});
    if(kind!=='retratacao')add({sec,key:'Impugnada - Relator',label:'Relator(a)',value:relatorOf(d),current:r['Impugnada - Relator'],doc:d.id,kind:'field'});
    add({sec,key:'Impugnada - Síntese',label:kind==='interno'?'O que decidiu (a partir do verbo)':'Ementa do acórdão',value:kind==='interno'?(x.resultado||ementaOf(d)):(ementaOf(d)||x.resultado),current:r['Impugnada - Síntese'],doc:d.id,kind:'area'});
    if(kind==='retratacao')add({sec,key:'Retratação - Síntese',label:'O que decidiu o acórdão (a partir do verbo)',value:x.resultado,current:r['Retratação - Síntese'],doc:d.id,kind:'area'});
  }
  if(kind==='ed'||kind==='interno'){
    used.filter(d=>d.target==='recurso').forEach(d=>{
      const p=extractPetition(d),sec=`${KIND_TXT[kind]} · ID ${d.id} · campos próprios`;
      if(kind==='ed'){add({sec,key:'ED - Vício',label:'Vício(s) apontado(s)',value:vicios(d.text),current:r['ED - Vício'],doc:d.id,kind:'field'});
        add({sec,key:'ED - Ponto',label:'Ponto dos embargos',value:[...p.teses].join('; ')||pontoOf(d.text),current:r['ED - Ponto'],doc:d.id,kind:'area'});}
      else add({sec,key:'AgInt - Fundamentos',label:'Fundamentos do agravo interno',value:[...p.teses].join('; ')||pontoOf(d.text),current:r['AgInt - Fundamentos'],doc:d.id,kind:'area'});
    });
  }
  if(kind==='retratacao'){
    const dev=used.filter(d=>d.target==='devolucao').pop();
    if(dev){const t=dev.text,sec=`Devolução para juízo de retratação · ID ${dev.id}`;
      const pr=/\b(ARE|RE|REsp|RESP|AREsp|AgRg no REsp)\s*(?:n[º°.]?\s*)?(\d{1,3}(?:\.\d{3})+|\d{4,7})(?:\s*\/\s*[A-Z]{2})?(\s*\/?\s*RG)?(-ED)?/.exec(t);
      const tm=/Tema\s*(?:n[º°.]?\s*)?(\d{1,4}(?:\.\d{3})?)/i.exec(t);
      const trib=pr?(/^(RE|ARE)$/i.test(pr[1])?'STF':'STJ'):/repercuss[ãa]o geral|supremo/i.test(t)?'STF':/repetitivo|superior tribunal de justi/i.test(t)?'STJ':'';
      const dm=/^(\d{4})-(\d{2})/.exec(dev.date||'');
      add({sec,key:'Retratação - Devolução ID',label:'ID da decisão de devolução',value:dev.id,current:r['Retratação - Devolução ID'],doc:dev.id,kind:'field'});
      if(dm)add({sec,key:'Retratação - Devolução mês',label:'Mês da devolução',value:`${MESX[+dm[2]-1]}/${dm[1]}`,current:r['Retratação - Devolução mês'],doc:dev.id,kind:'field'});
      add({sec,key:'Retratação - Devolução órgão',label:'Órgão que devolveu',value:/vice-?presid/i.test(t)?'Vice-Presidência':/presid[êe]ncia/i.test(t)?'Presidência':'',current:r['Retratação - Devolução órgão'],doc:dev.id,kind:'field'});
      if(pr)add({sec,key:'Retratação - Precedente',label:'Precedente',value:S(pr[0]).replace(/\s+/g,' '),current:r['Retratação - Precedente'],doc:dev.id,kind:'field'});
      if(tm)add({sec,key:'Retratação - Tema',label:'Tema',value:tm[1],current:r['Retratação - Tema'],doc:dev.id,kind:'field'});
      if(trib)add({sec,key:'Retratação - Tribunal',label:'Tribunal do precedente',value:trib,current:r['Retratação - Tribunal'],doc:dev.id,kind:'select',options:['STF','STJ']});
    }
    const er=used.filter(d=>d.target==='edret');
    if(er.length){const sec='Embargos anteriores ao acórdão · '+er.map(d=>'ID '+d.id).join(', '),ac=er.filter(d=>d.kind==='acordao').pop();
      add({sec,key:'Retratação - ED IDs',label:'IDs dos embargos e do acórdão',value:er.map(d=>d.id).join(', '),current:r['Retratação - ED IDs'],doc:er.map(d=>d.id).join(', '),kind:'field'});
      if(ac){add({sec,key:'Retratação - ED',label:'Resultado dos embargos',value:edResultado(ac),current:r['Retratação - ED'],doc:ac.id,kind:'select',options:['rejeitados','acolhidos','parcial','naoconhecidos']});
        add({sec,key:'Retratação - ED data',label:'Data do julgamento dos embargos',value:julgData(ac),current:r['Retratação - ED data'],doc:ac.id,kind:'field'});}
    }
  }
  /* registra a espécie no card quando veio só do TXT */
  if(!S(r['Padrão - Espécie'])&&!(page()?.padraoKind?.({...r,'Padrão - Espécie':''})))add({sec:'Espécie no Padrão',key:'Padrão - Espécie',label:'Espécie identificada no inteiro teor',value:kind,current:'',doc:parsed.docs.find(d=>d.target==='impugnada'||d.target==='devolucao'||d.target==='recurso')?.id||'',kind:'select',options:['ed','interno','retratacao']});
}

/* ───────────────────────── 4 · SUGESTÕES (com conflitos) ───────────────────────── */
function regSuggestions(parsed,r,used,add){
  const key=d=>(d.date||'')+'|'+String(d.id).padStart(12,'0'),f=d=>br(d?.date)||'—';
  const recs=used.filter(d=>d.target==='recurso').sort((a,b)=>key(a).localeCompare(key(b)));const rec=recs[0];if(!rec)return;
  const who=recorrenteInfo(parsed,rec),sec=`Regularidade · ${rec.recursoTipo||'recurso'} ID ${rec.id}${who.name?' · '+who.name:''}`;
  /* tempestividade: contado da própria data da decisão (antes de qualquer intimação), o prazo ainda não teria terminado? */
  const dec=used.filter(d=>(d.target==='impugnada'||d.target==='sentenca')&&key(d)<key(rec)).sort((a,b)=>key(a).localeCompare(key(b))).pop();
  const prazo=rec.recursoTipo==='Embargos de declaração'?5:15,dobro=who.dobro?2:1;
  let c=null;
  if(dec&&rec.date&&dec.date){try{c=page()?.tempCalc?.({...r,'Tempest - Publicação':iso10(dec.date),'Tempest - Protocolo':iso10(rec.date),'Tempest - Prazo legal':String(prazo),'Tempest - Dobro':String(dobro),'Tempest - Suspensões':r['Tempest - Suspensões']||''});}catch(_){}}
  if(rec.date){add({sec,key:'Tempest - Protocolo',label:'Protocolo do recurso (calculador)',value:iso10(rec.date),current:r['Tempest - Protocolo'],doc:rec.id,kind:'field',
      note:`Juntada do recurso no PJe em ${f(rec)}.`+(c&&c.ok===false?` Contado da própria data da decisão (${f(dec)}, ID ${dec.id}), o prazo terminaria em ${br(c.limit)}: a conclusão depende da data da intimação, que o inteiro teor não traz — informe-a no calculador.`:!dec?' Decisão recorrida não selecionada: informe a data da intimação no calculador.':'')});
    add({sec,key:'Tempest - Prazo legal',label:'Prazo legal (dias úteis)',value:String(prazo),current:r['Tempest - Prazo legal'],doc:rec.id,kind:'select',options:['5','15','8','10','30']});
    if(dobro===2)add({sec,key:'Tempest - Dobro',label:'Contagem',value:'2',current:String(r['Tempest - Dobro']||'')==='1'?'':r['Tempest - Dobro'],doc:rec.id,kind:'select',options:['1','2'],note:`Em dobro: ${who.dpu?'Defensoria Pública':who.mp?'Ministério Público':who.conselho?'conselho profissional (autarquia)':'Fazenda Pública'} (arts. 180, 183 e 186 do CPC).`});}
  if(c&&c.ok===true)add({sec,key:'Tempestividade',label:'Tempestividade',value:'Tempestivo',current:r.Tempestividade==='Não Verificado'?'':r.Tempestividade,doc:`${dec.id}, ${rec.id}`,kind:'select',options:['Não Verificado','Tempestivo','Intempestivo'],
    note:`Recurso juntado em ${f(rec)}. Ainda que contado da própria data da decisão (${f(dec)}, ID ${dec.id}), o prazo de ${c.total} dias úteis${dobro===2?' (em dobro)':''} só terminaria em ${br(c.limit)}: tempestivo qualquer que seja a data da intimação.`});
  /* preparo: isenção, gratuidade ou GRU com comprovante */
  const gs=used.filter(d=>d.target==='preparo'),ajg=ajgOf(parsed,rec);
  const P=(value,doc,note)=>add({sec,key:'Preparo',label:'Preparo',value,current:r.Preparo==='Não Verificado'?'':r.Preparo,doc,kind:'select',options:['Não Verificado','Comprovado','Não Recolhido','Dispensado','Não se Aplica'],note});
  if(who.publico||who.mp)P('Dispensado',rec.id,`${who.name||'Recorrente'}: isento de preparo (art. 1.007, § 1º, do CPC; art. 4º, I, da Lei 9.289/1996).`);
  else if(who.dpu&&ajg)P('Dispensado',ajg.d.id,`Assistido pela Defensoria Pública, com gratuidade deferida (ID ${ajg.d.id}).`);
  else if(gs.length){const L=gs.map(d=>({d,g:gruInfo(d)})),ok=L.some(x=>x.g.comprovante);
    P(ok?'Comprovado':'Não Verificado',gs.map(d=>d.id).join(', '),L.map(x=>`ID ${x.d.id} (${f(x.d)}): ${gruTxt(x.g)}`).join(' · ')+(ok?'':' — confira o pagamento.'));}
  else if(ajg)P('Dispensado',ajg.d.id,`Gratuidade da justiça deferida (ID ${ajg.d.id}, ${f(ajg.d)}: “${ajg.frase}”). Confira se o beneficiário é o recorrente.`);
  if(ajg&&!who.publico)add({sec,key:'AJG',label:'AJG (gratuidade)',value:'Sim',current:yes(r.AJG)?'Sim':'',doc:ajg.d.id,kind:'select',options:['','Sim']});
  if(who.dpu)add({sec,key:'DPU (controle)',label:'Defensoria Pública da União',value:'Sim',current:yes(r['DPU (controle)'])?'Sim':'',doc:rec.id,kind:'select',options:['','Sim']});
  /* representação ex lege: dispensa procuração */
  if((who.publico||who.dpu||who.mp)&&!used.some(d=>d.target==='procuracao'))add({sec:'Representação',key:'Representação',label:'Representação',value:'Regular',current:r.Representação==='Não Verificado'?'':r.Representação,doc:rec.id,kind:'select',options:['Não Verificado','Regular','Negativo'],
    note:`${who.dpu?'Defensoria Pública':who.mp?'Ministério Público':'Advocacia pública'}: representação decorrente da lei, sem procuração nos autos.`});
}
/* data do documento (juntada/assinatura no cabeçalho do PJe) em DD/MM/AAAA, para os botões de data do card */
function docBr(d){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(S(d&&d.date));return m?`${m[3]}/${m[2]}/${m[1]}`:'';}
function identitySuggestions(parsed,r,add){
  const names=[...new Set(Object.values(parsed.polos||{}).flat().map(S).filter(Boolean))];
  const roles=Object.entries(parsed.polos||{});
  const active=[...new Set(roles.filter(([role])=>/^(autor[a]?|parte autora|exequente|impetrante)$/.test(N(role))).flatMap(([,v])=>v).map(S).filter(Boolean))];
  const passive=[...new Set(roles.filter(([role])=>/^(re|reu|parte re|executad[oa]|impetrad[oa])$/.test(N(role))).flatMap(([,v])=>v).map(S).filter(Boolean))];
  const sec='Identificação do processo';
  add({sec,key:'Assunto',label:'Assunto identificado no cabeçalho do PJe',value:parsed.assunto,current:r.Assunto,doc:'capa do processo',kind:'field'});
  add({sec,key:'classe_judicial',label:'Classe · sigla do cabeçalho do PJe',value:parsed.classeAbbr,current:r.classe_judicial||r['Descrição da Classe']||r.Classe,doc:'capa do processo',kind:'field'});
  add({sec,key:'Partes',label:'Partes identificadas nos documentos',value:names.join(' × '),current:r.Partes,doc:'documentos do processo',kind:'field'});
  add({sec,key:'Polo Ativo',label:'Polo ativo identificado expressamente',value:active.join('; '),current:r['Polo Ativo'],doc:'documentos do processo',kind:'field'});
  add({sec,key:'Polo Passivo',label:'Polo passivo identificado expressamente',value:passive.join('; '),current:r['Polo Passivo'],doc:'documentos do processo',kind:'field'});
}
function buildSuggestions(parsed,r,ai){
  const pg=page(),items=[];
  const used=parsed.docs.filter(d=>d.target);
  const add=(o)=>{o.current=S(o.current);o.value=S(o.value);if(!o.value)return;const same=N(o.current)===N(o.value);o.status=!o.current?'novo':same?'igual':'conflito';o.apply=o.status==='novo';items.push(o);};
  identitySuggestions(parsed,r,add);
  // Decisão recorrida / sentença
  const dec=used.filter(d=>d.target==='sentenca');
  if(dec.length){
    const d=dec[dec.length-1],x=extractDecision(d),a=ai?.sentenca||{};
    const ids=dec.map(z=>z.id).join(', ');
    add({sec:'Decisão recorrida / sentença',key:'Sentença - ID',label:'ID da decisão',value:ids,current:r['Sentença - ID'],doc:ids,kind:'field'});
    add({sec:'Decisão recorrida / sentença',key:'Sentença - Data',label:'Data da decisão',value:docBr(d),current:r['Sentença - Data'],doc:d.id,kind:'field'});
    add({sec:'Decisão recorrida / sentença',key:'Sentença - Decisão',label:'Resultado na origem',value:a.decisao||x.decisao,current:r['Sentença - Decisão'],doc:d.id,kind:'select',options:['Procedente','Parcialmente procedente','Improcedente','Extinção sem resolução do mérito','Homologatória','Outra'],src:a.decisao?'IA':'regra'});
    add({sec:'Decisão recorrida / sentença',key:'Sentença - Resultado',label:'Resultado principal',value:a.resultado||x.resultado,current:r['Sentença - Resultado'],doc:d.id,kind:'field',src:a.resultado?'IA':'regra'});
    add({sec:'Decisão recorrida / sentença',key:'Sentença - Fundamento',label:'Fundamento determinante',value:a.fundamento||x.fundamento,current:r['Sentença - Fundamento'],doc:d.id,kind:'area',src:a.fundamento?'IA':'regra'});
    add({sec:'Decisão recorrida / sentença',key:'Sentença - Honorários',label:'Honorários',value:a.honorarios||x.honorarios,current:r['Sentença - Honorários'],doc:d.id,kind:'field',src:a.honorarios?'IA':'regra'});
    add({sec:'Decisão recorrida / sentença',key:'Sentença - Custas',label:'Custas / gratuidade',value:a.custas||x.custas,current:r['Sentença - Custas'],doc:d.id,kind:'field',src:a.custas?'IA':'regra'});
    add({sec:'Decisão recorrida / sentença',key:'Sentença - Providências',label:'Providências determinadas',value:a.providencias||x.providencias,current:r['Sentença - Providências'],doc:d.id,kind:'area',src:a.providencias?'IA':'regra'});
  }
  // Espécies com configuração própria (ED, agravo interno, juízo de retratação)
  try{kindSuggestions(parsed,r,used,add);}catch(err){console.warn('[CMT] importação TXT · espécie',err);}
  // Recursos
  const recs=Array.isArray(r._recursos)?r._recursos:[];
  const isBlank=c=>!S(c.ids)&&!S(c.preliminares)&&!S(c.teses)&&!S(c.pedidos)&&!(c.lista||[]).length;
  const taken=new Set();let nextNew=recs.length;
  used.filter(d=>d.target==='recurso').forEach((d,n)=>{
    let k=recs.findIndex((c,j)=>!taken.has(j)&&S(c.ids).split(/[,;\s]+/).includes(d.id));
    if(k<0)k=recs.findIndex((c,j)=>!taken.has(j)&&isBlank(c));
    if(k<0)k=recs.findIndex((c,j)=>!taken.has(j)&&!S(c.ids)&&!c.semId);
    const isNew=k<0;if(isNew)k=nextNew++;
    taken.add(k);
    const c=recs[k]||{},x=extractPetition(d),a=(ai?.recursos||[]).find(z=>S(z.id)===d.id)||{};
    const f=filerOf(d,parsed,r),pv=parteValue(f,r);
    const sec=`${d.recursoTipo||'Recurso'} · ID ${d.id}${isNew?' · novo recurso no card':' · recurso '+(k+1)+' do card'}`;
    const curParte=c.parte==='custom'?c.parteCustom:c.parte;
    const base={sec,kind:'rec',idx:k,isNew,doc:d.id};
    add({...base,key:'ids',label:'IDs do recurso',value:d.id,current:c.ids});
    add({...base,key:'data',label:'Data do recurso',value:docBr(d),current:c.data});
    if(pv.parte)add({...base,key:'parte',label:'Parte recorrente',value:pv.parte==='custom'?pv.custom:pv.parte,current:isNew?'':curParte==='parte autora'&&isBlank(c)?'':curParte,kind2:'parte',note:pv.label?`Identificada no documento: ${pv.label}`:''});
    add({...base,key:'preliminares',label:'Preliminares (uma por linha)',value:(a.preliminares||x.preliminares).join?.('\n')??S(a.preliminares),current:c.preliminares,area:true,src:a.preliminares?'IA':'regra'});
    add({...base,key:'teses',label:'Alegações, fundamentos e questões (uma por linha)',value:(a.teses||x.teses).join?.('\n')??S(a.teses),current:c.teses,area:true,src:a.teses?'IA':'regra'});
    add({...base,key:'pedidos',label:'Pedidos recursais (um por linha)',value:(a.pedidos||x.pedidos).join?.('\n')??S(a.pedidos),current:c.pedidos,area:true,src:a.pedidos?'IA':'regra'});
  });
  // Contrarrazões
  const recItems=items.filter(i=>i.kind==='rec');
  const recDocs=used.filter(d=>d.target==='recurso');
  used.filter(d=>d.target==='contrarrazoes'&&!d.dupOf).forEach(d=>{
    const dupIds=used.filter(z=>z.dupOf===d.id).map(z=>z.id);
    // associa ao último recurso selecionado juntado antes dela
    const before=recDocs.filter(z=>(z.date||'')<=(d.date||'~'));const rd=before[before.length-1]||recDocs[0];
    const ri=rd?(recItems.find(i=>i.doc===rd.id)||{}).idx:0;const k=ri??0;
    const c=(recs[k]||{}).contra||{},old=(r._contras||[]).find(o=>o&&o._rec===k)||{};
    const x=d.empty?{preliminares:[],teses:[],pedidos:[]}:extractPetition(d),a=(ai?.contrarrazoes||[]).find(z=>S(z.id)===d.id)||{};
    let f=d.empty?null:filerOf(d,parsed,r);let note='';
    if(!f&&x.opening){const en=entityOf(x.opening.slice(0,160));if(en)f={role:'',name:en};}
    if(!f&&rd){const rf=filerOf(rd,parsed,r);if(rf&&OPP[N(rf.role)]){const opp=OPP[N(rf.role)],names=parsed.polos[opp]||parsed.polos[opp.replace(/o$/,'a')]||[];if(names[0]){f={role:opp,name:names[0]};note='Parte inferida pela posição processual (polo contrário ao recorrente) — confira.';}}}
    {const hd=d.text.slice(0,2500),recName=S(parsed.recorrente),sig=S(d.assinado)+' '+S(d.por);
      /* o ente vem nomeado na abertura (“FUNDAÇÃO …, pessoa jurídica de direito público, representada …”) */
      const named=(/([A-ZÀ-Ú][A-ZÀ-Ú .\-]{6,120}?)\s*,\s*(?:pessoa jur[íi]dica de direito p[úu]blico|autarquia federal|funda[çc][ãa]o p[úu]blica)/.exec(hd)||[])[1];
      const pubPolo=Object.values(parsed.polos||{}).flat().filter(n=>PUB_RE.test(n)&&!NOT_PUB.test(n));
      const pub=named&&/ADVOCACIA|PROCURADORIA|AGU/i.test(hd+' '+sig)?S(named):/PROCURADORIA[- ]GERAL DA FAZENDA|\bPGFN\b|FAZENDA NACIONAL/i.test(hd)?'União'
        :/ADVOCACIA[- ]GERAL DA UNI|PROCURADORIA[- ]REGIONAL DA UNI|PROCURADORIA DA UNI|AGU\.GOV\.BR/i.test(hd+' '+sig)?(pubPolo.length===1?S(pubPolo[0]):'União'):'';
      if(pub&&(!f||recName&&nameHit(recName,f.name))){f={role:'',name:pub};note='Peça da advocacia pública: parte representada identificada pelo órgão subscritor.';}}
    const ent=f?(entityOf(f.name)||S(f.name)):'';
    const sec=`Contrarrazões · ID ${d.id} · vinculadas ao recurso ${k+1}`;const base={sec,kind:'contra',idx:k,doc:d.id};
    add({...base,key:'ids',label:'IDs das contrarrazões',value:[d.id,...dupIds].join(', '),current:c.ids,note:dupIds.length?'Mesma peça protocolada mais de uma vez: IDs gravados juntos.':''});
    add({...base,key:'data',label:'Data das contrarrazões',value:docBr(d),current:c.data});
    if(ent)add({...base,key:'parte',label:'Apresentadas por',value:ent,current:old.parte,note});
    add({...base,key:'preliminares',label:'Preliminares (uma por linha)',value:(a.preliminares||x.preliminares).join?.('\n')??'',current:old.preliminares,area:true,src:a.preliminares?'IA':'regra'});
    add({...base,key:'merito',label:'Resumo do mérito / resposta',value:S(a.merito)||x.teses.join('; ')||x.resumo||'',current:old.merito,area:true,src:a.merito?'IA':'regra'});
    add({...base,key:'pedidos',label:'Pedidos',value:(a.pedidos||x.pedidos).join?.('\n')??'',current:old.pedidos,area:true,src:a.pedidos?'IA':'regra'});
  });
  // MPF
  const mp=used.filter(d=>d.target==='mpf');
  if(mp.length){
    const d=mp[mp.length-1],x=extractMpf(d),a=ai?.mpf||{};
    add({sec:'Parecer do MPF',key:'MPF',label:'Houve parecer?',value:'Com Parecer',current:r.MPF,doc:d.id,kind:'select',options:['Não se Aplica','Com Parecer','Sem Parecer']});
    add({sec:'Parecer do MPF',key:'ID do Parecer MPF',label:'ID do parecer',value:d.id,current:r['ID do Parecer MPF'],doc:d.id,kind:'field'});
    add({sec:'Parecer do MPF',key:'MPF - Data',label:'Data do parecer',value:docBr(d),current:r['MPF - Data'],doc:d.id,kind:'field'});
    add({sec:'Parecer do MPF',key:'Parecer - Sentido',label:'Conclusão do parecer',value:a.sentido||x.sentido,current:r['Parecer - Sentido'],doc:d.id,kind:'select',options:['Prosseguimento do feito','Provimento do recurso','Não provimento do recurso','Outro'],src:a.sentido?'IA':'regra'});
    if((a.sentido||x.sentido)==='Outro')add({sec:'Parecer do MPF',key:'Parecer - Sentido (outro)',label:'Conclusão (texto)',value:a.sentidoOutro||x.sentidoOutro,current:r['Parecer - Sentido (outro)'],doc:d.id,kind:'field'});
    add({sec:'Parecer do MPF',key:'MPF - Info adicional',label:'Fundamentos do parecer',value:a.fundamentos||x.fundamentos,current:r['MPF - Info adicional'],doc:d.id,kind:'area',src:a.fundamentos?'IA':'regra'});
  }
  // Regularidade: tempestividade, preparo, gratuidade e representação por quem recorre
  try{regSuggestions(parsed,r,used,add);}catch(err){console.warn('[CMT] importação TXT · regularidade',err);}
  // Origem: juízo, julgador(a), valor da causa, tutela e reexame
  try{const sen=used.filter(d=>d.target==='sentenca').pop(),o=origemOf(parsed,sen),sec=`Origem${sen?' · decisão ID '+sen.id:''}`;
    if(sen){add({sec,key:'Origem - Juízo',label:'Juízo de origem',value:o.juizo,current:r['Origem - Juízo'],doc:sen.id,kind:'field'});
      add({sec,key:'Origem - Julgador',label:'Julgador(a) de origem (quem assinou a decisão)',value:o.julgador,current:r['Origem - Julgador'],doc:sen.id,kind:'field'});
      add({sec,key:'Sentença - Tutela',label:'Tutela na sentença',value:o.tutela,current:r['Sentença - Tutela'],doc:sen.id,kind:'select',options:['concedida','negada','revogada','nao']});
      add({sec,key:'Sentença - Reexame',label:'Remessa necessária',value:o.reexame,current:r['Sentença - Reexame'],doc:sen.id,kind:'select',options:['sim','nao','dispensada'],note:o.reexame==='dispensada'?'A decisão afasta expressamente o reexame.':o.reexame==='sim'?'A decisão submete a sentença ao reexame necessário.':''});}
    if(o.valor)add({sec:'Origem',key:'Origem - Valor da causa',label:'Valor da causa',value:o.valor,current:r['Origem - Valor da causa'],doc:o.valorDoc,kind:'field',note:'Certidão de autuação ou petição inicial.'});
  }catch(err){console.warn('[CMT] importação TXT · origem',err);}
  // Representação: procurações do recorrente (ID, data da assinatura, validade e advogados)
  const procs=used.filter(d=>d.target==='procuracao');
  if(procs.length){
    add({sec:'Representação',key:'Representação',label:'Representação',value:'Regular',current:r.Representação==='Não Verificado'?'':r.Representação,doc:procs.map(d=>d.id).join(', '),kind:'select',options:['Não Verificado','Regular','Negativo']});
    const ex=Array.isArray(r._procuracoes)?r._procuracoes:[],rec=used.find(d=>d.target==='recurso')||parsed.docs.filter(d=>d.kind==='recurso'&&!d.outro).pop();
    procs.forEach(d=>{
      const data=procDate(d.text);let adv=procLawyers(d.text),note='';
      if(d.empty)note='Procuração sem texto no TXT (imagem digitalizada): confira a data da assinatura no próprio documento.';
      else if(!data)note='Data da assinatura não localizada no texto da procuração: informe-a para definir a validade.';
      if(!adv.length){const hl=sideLawyers(parsed,parsed.recorrente);if(hl.length){adv=hl;note=(note?note+' ':'')+'Advogado(s) conforme o cabeçalho dos atos do 2º grau (o texto da procuração não os identifica).';}}
      if(!adv.length&&rec){const o=procLawyers(rec.text.slice(0,5000));const oabs=o.map(v=>(/\((OAB[^)]*)\)$/.exec(v)||[,v])[1]);const named=o.filter(v=>/\(OAB/.test(v));adv=named.length?named:oabs.length&&rec.por?[`${S(rec.por).toUpperCase()} (${oabs.join(' · ')})`]:rec.por?[S(rec.por).toUpperCase()]:[];if(adv.length)note=(note?note+' ':'')+'Advogado(s) conforme o recurso (o texto da procuração não os identifica).';}
      const proc={id:d.id,data,validade:PC().procValidity?PC().procValidity(data):(data?'Válida':'A verificar'),advogados:adv.join(' · ')};
      const cur=ex.find(p=>S(p?.id)===d.id),fmt=p=>[br(PC().date(p.data))||'sem data',S(p.validade)||'—',S(p.advogados)].filter(Boolean).join(' · ');
      const status=!cur?'novo':fmt(cur)===fmt(proc)?'igual':'conflito';
      items.push({sec:'Representação',kind:'proc',key:'proc:'+d.id,label:`Procuração · ID ${d.id}`,value:d.id,proc,current:cur?fmt(cur):'',status,apply:status==='novo',doc:d.id,note:[d.procMatch?.how?`Do recorrente: ${d.procMatch.how}.`:'',note].filter(Boolean).join(' ')});
    });
  }
  // Outras peças
  const occ=Array.isArray(r._ocorrencias)?r._ocorrencias:[];
  /* v43: a peça é gravada com o NOME do documento (tipo “Outro” + Especifique), não como “Juntada de documento”;
     o nome editado no diálogo (etapa 1 ou 2) persiste até a gravação, inclusive ao voltar aos documentos. */
  used.filter(d=>d.target==='outras').forEach(d=>{
    const ex=occ.find(o=>S(o.ids).split(/[,;\s]+/).includes(d.id));
    const name=otherPieceName(d,parsed);
    const ids=[d.id,...(d.anexos||[])].join(', ');
    const o={sec:'Outras peças',kind:'ocorr',key:d.id,label:`Nome da peça · ID ${d.id}`,value:name,current:ex?occName(ex):'',doc:d.id,ids,note:`Documento: ${otherPieceName(d)} · gravado em Outras peças com ${d.anexos?.length?'os IDs '+ids+' (peça e anexos)':'o ID '+d.id}.`};
    add(o);
  });
  return items;
}

/* nome da peça: “Tipo — Descrição” do cabeçalho do PJe (sem repetição); ou o nome editado no diálogo */
function otherPieceName(d,parsed){
  const edited=parsed?.names?.[d.id];if(edited!==undefined)return S(edited);
  const t=S(d.tipo);let ds=S(d.descricao).replace(/^[PA]_/,'').replace(/_\d{6,}.*$/,'').replace(/\s+EM\s+\d{2}\/\d{2}\/\d{4}.*$/,'').replace(/_/g,' ').trim();
  if(ds&&ds===ds.toUpperCase())ds=ds.charAt(0)+ds.slice(1).toLowerCase();
  const probe=N(t+' '+ds+' '+String(d.text||'').slice(0,1500));
  if(parsed&&d.kind==='peticao'){if(/sustentacao oral/.test(probe))return 'Pedido de sustentação oral';if(/\bdesist/.test(probe))return 'Desistência';if(/habilitacao/.test(probe))return 'Habilitação';if(/efeito suspensivo/.test(probe))return 'Efeito suspensivo';if(/fato (novo|superveniente)/.test(probe))return 'Fato superveniente';}
  return !ds||N(ds)===N(t)?t:(t?`${t} — ${ds}`:ds);
}
const OCC_TIPOS=['Memoriais','Decisão superveniente','Efeito suspensivo','Desistência','Habilitação','Fato superveniente'];
function occName(o){return S(o?.tipo==='Outro'?o.tipoOutro:(S(o?.tipoOutro)||(o?.tipo==='Juntada de documento'&&S(o?.texto))||o?.tipo));}
function occTipo(name){const t=OCC_TIPOS.find(x=>N(x)===N(name));return t?{tipo:t,tipoOutro:''}:{tipo:'Outro',tipoOutro:S(name)};}



/* espécie pelo inteiro teor (a ficha não tem o “Padrão - Espécie” do app antigo): juízo de retratação, embargos de declaração, agravo interno */
function especie(parsed){
  const main=parsed.docs.filter(d=>!d.outro);
  if(main.some(d=>['decisao','despacho'].includes(d.kind)&&RETRAT_RE.test(d.text.slice(0,6000))))return 'retratacao';
  const recs=main.filter(d=>d.kind==='recurso'),last=recs[recs.length-1];
  if(last?.recursoTipo==='Embargos de declaração')return 'ed';
  if(last?.recursoTipo==='Agravo interno')return 'interno';
  return '';
}
window.CMTInteiroTeor=Object.assign(window.CMTInteiroTeor||{},{TARGETS,KIND_LABEL,KIND_TXT,parseTxt,preselect,preselectKind,especie,buildSuggestions,
  otherPieceName,extractDecision,extractPetition,headings,decodeLine,procDate});
})();
