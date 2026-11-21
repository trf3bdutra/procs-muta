/* CMT · Calendário forense do gabinete: feriados, recesso e datas sem expediente, e a contagem de prazos processuais.
   Regras do calendário do Controle de Pauta (app Gabinete CMT): feriados nacionais e da Justiça Federal (Lei 5.010/66, art. 62),
   de MS, Carnaval, Semana Santa e Corpus Christi; recesso de 20/12 a 20/01 na contagem de prazos (CPC, art. 220);
   datas do calendário do gabinete marcadas “não conta para prazo”; suspensões informadas no processo.
   O expediente do gabinete fica em acervo/sessoes/calendario.json (expediente: diasSemana, semExpediente, nomes, tipos, semPrazo, recesso).
   Um só módulo para o Caput e a Ex Officio (scripts/ficha/embutir.py). */
(function () {
'use strict';
if (window.CMTForense && window.CMTForense.versao >= 1) return;
var p2 = function (n) { return ('0' + n).slice(-2); };
var iso = function (y, m, d) { return y + '-' + p2(m) + '-' + p2(d); };
var addD = function (s, n) { var d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
var dow = function (s) { return new Date(s + 'T12:00:00Z').getUTCDay(); };
var isoDe = function (v) { var s = String(v == null ? '' : v).trim(), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return s.slice(0, 10); m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + p2(m[2]) + '-' + p2(m[1]) : ''; };
function pascoa(y) {
  var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(y, mo, da);
}
var TIPOS = ['Feriado nacional', 'Feriado da Justiça Federal', 'Recesso forense', 'Feriado estadual', 'Feriado municipal', 'Ponto facultativo', 'Suspensão de expediente', 'Outro'];
/* tipos que, por padrão, não contam para prazo processual */
var SEM_PRAZO = { 'Feriado nacional': 1, 'Feriado da Justiça Federal': 1, 'Recesso forense': 1, 'Feriado estadual': 1, 'Feriado municipal': 1, 'Suspensão de expediente': 1 };
/* sugestão de datas sem expediente do ano (Justiça Federal em MS): a mesma do Controle de Pauta; “on” = marcada por padrão */
function sugestoes(y) {
  var e = pascoa(y), L = [], add = function (d, label, type, on) { L.push({ date: d, label: label, type: type, on: on !== false, semPrazo: !!SEM_PRAZO[type] }); };
  add(iso(y, 1, 1), 'Confraternização Universal', 'Feriado nacional');
  for (var d = iso(y, 1, 2); d <= iso(y, 1, 6); d = addD(d, 1)) add(d, 'Recesso forense (20/12 a 06/01)', 'Recesso forense');
  add(addD(e, -48), 'Carnaval (segunda-feira)', 'Feriado da Justiça Federal'); add(addD(e, -47), 'Carnaval (terça-feira)', 'Feriado da Justiça Federal'); add(addD(e, -46), 'Quarta-feira de Cinzas (até 14h)', 'Ponto facultativo', false);
  add(addD(e, -4), 'Semana Santa (quarta-feira)', 'Feriado da Justiça Federal'); add(addD(e, -3), 'Semana Santa (quinta-feira)', 'Feriado da Justiça Federal'); add(addD(e, -2), 'Sexta-feira da Paixão', 'Feriado nacional');
  add(iso(y, 4, 21), 'Tiradentes', 'Feriado nacional'); add(iso(y, 5, 1), 'Dia do Trabalho', 'Feriado nacional'); add(addD(e, 60), 'Corpus Christi', 'Ponto facultativo', false);
  add(iso(y, 8, 11), 'Dia da Justiça / criação dos cursos jurídicos', 'Feriado da Justiça Federal'); add(iso(y, 9, 7), 'Independência do Brasil', 'Feriado nacional');
  add(iso(y, 10, 11), 'Criação do Estado de Mato Grosso do Sul', 'Feriado estadual'); add(iso(y, 10, 12), 'Nossa Senhora Aparecida', 'Feriado nacional'); add(iso(y, 10, 28), 'Dia do Servidor Público', 'Ponto facultativo', false);
  add(iso(y, 11, 1), 'Dia de Todos os Santos', 'Feriado da Justiça Federal'); add(iso(y, 11, 2), 'Finados', 'Feriado nacional'); add(iso(y, 11, 15), 'Proclamação da República', 'Feriado nacional');
  add(iso(y, 11, 20), 'Dia Nacional de Zumbi e da Consciência Negra', 'Feriado nacional'); add(iso(y, 12, 8), 'Dia da Justiça', 'Feriado da Justiça Federal');
  for (var d2 = iso(y, 12, 20); d2 <= iso(y, 12, 31); d2 = addD(d2, 1)) add(d2, d2 === iso(y, 12, 25) ? 'Natal (recesso forense)' : 'Recesso forense (20/12 a 06/01)', d2 === iso(y, 12, 25) ? 'Feriado nacional' : 'Recesso forense');
  return L.sort(function (a, b) { return a.date.localeCompare(b.date); });
}
/* feriados que não contam para prazo, mesmo fora do calendário do gabinete (tempHolidays do Controle de Pauta) */
var CACHE = {};
function feriadosPrazo(y) {
  if (CACHE[y]) return CACHE[y];
  var H = {};
  [[1, 1, 'Confraternização Universal'], [4, 21, 'Tiradentes'], [5, 1, 'Dia do Trabalho'], [8, 11, 'Fundação dos cursos jurídicos (Lei 5.010/66)'], [9, 7, 'Independência'],
   [10, 11, 'Criação do Estado de Mato Grosso do Sul (sem expediente na JFMS)'], [10, 12, 'Nossa Senhora Aparecida'], [11, 1, 'Todos os Santos (Lei 5.010/66)'], [11, 2, 'Finados'],
   [11, 15, 'Proclamação da República'], [11, 20, 'Consciência Negra'], [12, 8, 'Dia da Justiça (Lei 5.010/66)'], [12, 25, 'Natal']].forEach(function (x) { H[iso(y, x[0], x[1])] = x[2]; });
  var e = pascoa(y); [[-48, 'Carnaval'], [-47, 'Carnaval'], [-4, 'Semana Santa (Lei 5.010/66)'], [-3, 'Semana Santa (Lei 5.010/66)'], [-2, 'Sexta-feira Santa'], [60, 'Corpus Christi']].forEach(function (x) { H[addD(e, x[0])] = x[1]; });
  return (CACHE[y] = H);
}
/* expediente do gabinete normalizado */
function exp(E) {
  E = E || {}; var sp = {}; (E.semPrazo || []).forEach(function (d) { sp[d] = 1; });
  return { semExpediente: E.semExpediente || [], nomes: E.nomes || {}, tipos: E.tipos || {}, semPrazo: sp, recesso: E.recesso || [] };
}
/* por que o dia não conta para prazo: null = fim de semana; '' = dia útil; texto = motivo */
function motivo(t, E, extra) {
  var x = exp(E), md = t.slice(5), w = dow(t);
  if (w === 0 || w === 6) return null;
  if (md >= '12-20' || md <= '01-20') return 'Recesso forense (20/12 a 20/01)';
  var f = feriadosPrazo(+t.slice(0, 4))[t]; if (f) return f;
  if (x.semPrazo[t]) return (x.nomes[t] || x.tipos[t] || 'Data sem expediente') + ' (calendário do gabinete)';
  if (extra && extra[t]) return extra[t];
  return '';
}
/* prazo processual em dias úteis, contado do dia seguinte à publicação: { publicacao, protocolo, prazo, dobro, suspensoes } */
function prazo(o, E) {
  var pub = isoDe(o.publicacao), prot = isoDe(o.protocolo), legal = parseInt(o.prazo, 10) || 15, dobro = /^(2|sim|true)$/i.test(String(o.dobro || '')) ? 2 : 1, total = legal * dobro;
  if (!pub) return { legal: legal, dobro: dobro, total: total, falta: true };
  var extra = {}; String(o.suspensoes || '').split(/[\n,;]+/).map(isoDe).filter(Boolean).forEach(function (d) { extra[d] = 'Suspensão informada no processo'; });
  var d = addD(pub, 1), n = 0, guarda = 0, pulados = [];
  while (guarda++ < 900) { var r = motivo(d, E, extra); if (r === '') { n++; if (n >= total) break; } else if (r) pulados.push([d, r]); d = addD(d, 1); }
  return { publicacao: pub, protocolo: prot, legal: legal, dobro: dobro, total: total, limite: d, pulados: pulados, ok: prot ? prot <= d : null };
}
var NOTA = 'Conta dias úteis a partir do dia seguinte à publicação, sem fins de semana, recesso de 20/12 a 20/01 (CPC, art. 220), feriados nacionais e da Justiça Federal (Lei 5.010/66), feriados de MS, Carnaval, Semana Santa e Corpus Christi, as datas do calendário do gabinete marcadas como “não conta para prazo” e as suspensões informadas no processo.';
window.CMTForense = { versao: 1, TIPOS: TIPOS, SEM_PRAZO: SEM_PRAZO, sugestoes: sugestoes, feriadosPrazo: feriadosPrazo, motivo: motivo, prazo: prazo, pascoa: pascoa, NOTA: NOTA, iso: isoDe, atual: null };
})();

/* vocabulário único (padrao/vocabulario.js, módulo VOC da página): opções e valores normalizados */
var VL=function(k,old){return typeof VOC!=='undefined'?VOC.lista(k):old;};
var VZ=function(k,v){var n=typeof VOC!=='undefined'?VOC.norm(k,v):(v||'');return /^n[aã]o verificado$/i.test(n||'')?'':n;};
/* CMT · Leitura do inteiro teor (.txt exportado do PJe) para a ficha única do processo.
   Extraído do módulo v40 do app Gabinete CMT (gabcmt.html, <script id="cmt-v40-feature">, seções 1 a 4: leitura do TXT,
   extração por regras, partes e pré-seleção, sugestões com conflitos), sem mudança de regra. Ficaram de fora o diálogo antigo,
   a gravação no card do Controle de Pauta (applySuggestions), a IA opcional, o panorama e as estatísticas: a ficha
   (padrao/ficha-dialogo.js) conduz a conferência e grava no operacional, pelo modelo padrao/ficha.json.
   O .txt é lido só na memória do navegador; nada do texto integral é gravado: só os campos confirmados.
   Embutido no Caput e na Ex Officio por scripts/ficha/embutir.py. */
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
   por peça e "## Página N" por página. Vira o mesmo texto do .txt do PJe antes da leitura; páginas digitalizadas sem texto são contadas.
   Metadados opcionais, em linhas "- Campo: valor" logo abaixo do título (sem eles a leitura segue só pelo texto):
     do processo: Classe ("Apelação Cível (ApCiv)"), Assunto, Polo ativo, Polo passivo, ou o papel do PJe (Apelante, Apelado, Agravante…),
                  com os nomes separados por ";";
     de cada peça: Tipo, Descrição, Juntado em (dd/mm/aaaa hh:mm), Juntado por, Assinado por (nomes por ";"), Situação ("ainda não juntado"). */
const MD_RE=/^\s*#\s+Processo\s+\d{7}-?\d{2}\./;
function semParenteses(t){t=S(t);if(!/\)$/.test(t))return [t,''];let d=0;
  for(let i=t.length-1;i>=0;i--){if(t[i]===')')d++;else if(t[i]==='('&&!--d){const a=S(t.slice(0,i));return a?[a,S(t.slice(i+1,-1))]:[t,''];}}
  return [t,''];}
const MD_META=/^\s*[-*]\s+([A-Za-zÀ-ú][A-Za-zÀ-ú ()\/]{1,40}?)\s*:\s*(.*?)\s*$/;
function deMd(text){
  const out=[],proc={},docs={};let sem=0,alvo=null,meta=false;
  text.split('\n').forEach(l=>{
    let m=/^#\s+Processo\s+([\d.\-]+)\s*$/.exec(l);if(m){out.push('Processo: '+m[1]);alvo=proc;meta=true;return;}
    m=/^#\s+(\d{5,})\s+-\s+(.+?)\s*$/.exec(l);
    if(m){const o=/^(.*?)\s+-\s+ID de origem\s+(\d{5,})$/.exec(m[2]),[tipo,desc]=semParenteses(o?o[1]:m[2]),hid=o?o[2]:m[1];
      out.push('Documento: '+hid+' - '+tipo+(desc?' - '+desc:''));if(o)out.push(m[1]+' - '+tipo+' - ID de origem '+o[2]);alvo=docs[hid]={};meta=true;return;}
    if(meta&&alvo){const mm=MD_META.exec(l);if(mm){alvo[N(mm[1])]=S(mm[2]).replace(/^\(?vazio[^)]*\)?$/i,'');return;}if(S(l)&&!/^>/.test(l))meta=false;}
    if(/^##\s+Página\s+\d+\s*$/.test(l)||/^>\s?/.test(l)||/^-{3,}\s*$/.test(l))return;
    if(/^_\[página[^\]]*\]_\s*$/i.test(l)){sem++;return;}
    out.push(l);
  });
  return {txt:out.join('\n'),sem,proc,docs};
}
/* "12/08/2026 14:32", "12/08/2026" ou "2026-08-12T14:32" viram "dd/mm/aaaa hh:mm", o formato da juntada no .txt */
function mdData(v){v=S(v);let m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,T]+(\d{1,2}):(\d{2}))?/.exec(v);
  if(m)return m[1].padStart(2,'0')+'/'+m[2].padStart(2,'0')+'/'+m[3]+(m[4]?' '+m[4].padStart(2,'0')+':'+m[5]:'');
  m=/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(v);return m?m[3]+'/'+m[2]+'/'+m[1]+(m[4]?' '+m[4]+':'+m[5]:''):'';}
const mdNomes=v=>S(v).split(/\s*;\s*/).map(x=>S(x).replace(/\s+/g,' ')).filter(x=>x.length>2);
function parseTxt(raw){
  let text=String(raw||'').replace(/\r\n?/g,'\n'),formato='txt',semTexto=0,MD=null;
  if(MD_RE.test(text)&&/^#\s+\d{5,}\s+-\s/m.test(text)){MD=deMd(text);text=MD.txt;formato='md';semTexto=MD.sem;}
  const proc=(/^\s*Processo:\s*([\d.\-]+)/m.exec(text)||[])[1]||'';
  const main=cnjDigits(proc);
  const lines=text.split('\n');
  const heads=[];lines.forEach((l,n)=>{const m=/^Documento:\s*(\d{5,})\s*-\s*(.*)$/.exec(l);if(m)heads.push({n,id:m[1],title:m[2].trim()});});
  const polos={};let classeAbbr='',assunto='';
  if(MD){const p=MD.proc,cl=semParenteses(p.classe||'');classeAbbr=cl[1]&&cl[1].length<=10?cl[1]:'';assunto=S(p.assunto);
    const ativo=/^ai\b|agravo/.test(N(p.classe))?'agravante':/apela|^apciv|remessa/.test(N(p.classe))?'apelante':/mandado|^ms\b/.test(N(p.classe))?'impetrante':'parte autora';
    const passivo={agravante:'agravado',apelante:'apelado',impetrante:'impetrado'}[ativo]||'parte re';
    Object.entries(p).forEach(([k,v])=>{const role=k==='polo ativo'?ativo:k==='polo passivo'?passivo:/^(apelante|apelad[oa]|agravante|agravad[oa]|embargante|embargad[oa]|impetrante|impetrad[oa]|recorrente|recorrid[oa]|exequente|executad[oa]|autora?|reu|re|parte autora|parte re)$/.test(k)?k:'';
      if(role)mdNomes(v).forEach(n=>(polos[role]||(polos[role]=new Set())).add(n));});}
  const docs=heads.map((h,k)=>{
    const mm=MD&&MD.docs[h.id]||null;
    const end=k+1<heads.length?heads[k+1].n:lines.length;
    const block=lines.slice(h.n+1,end).filter(l=>!/^-{20,}\s*$/.test(l));
    const parts=h.title.split(/\s+-\s+/);let tipo=S(parts[0]),desc=S(parts.slice(1).join(' - ').replace(/\s*-\s*$/,''));
    if(mm){if(S(mm.tipo))tipo=S(mm.tipo);if('descricao' in mm)desc=S(mm.descricao);}
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
    if(mm){const jd=mdData(mm['juntado em']||mm['data de juntada']||mm.juntada);if(jd)juntada=jd;if(S(mm['juntado por']))por=S(mm['juntado por']);
      const as=mdNomes(mm['assinado por']||mm.assinatura||mm.signatarios);if(as.length)assin=as.join(', ');if(/nao juntad/.test(N(mm.situacao)))naoJuntado=true;}
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
  return {processo:proc,main,docs,polos:P,classeAbbr,assunto,formato,semTexto,semData:docs.filter(d=>!d.date).length};
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
  if(c&&c.ok===true)add({sec,key:'Tempestividade',label:'Tempestividade',value:'Tempestivo',current:VZ('tempest',r.Tempestividade),doc:`${dec.id}, ${rec.id}`,kind:'select',options:VL('tempest',['Não Verificado','Tempestivo','Intempestivo']),
    note:`Recurso juntado em ${f(rec)}. Ainda que contado da própria data da decisão (${f(dec)}, ID ${dec.id}), o prazo de ${c.total} dias úteis${dobro===2?' (em dobro)':''} só terminaria em ${br(c.limit)}: tempestivo qualquer que seja a data da intimação.`});
  /* preparo: isenção, gratuidade ou GRU com comprovante */
  const gs=used.filter(d=>d.target==='preparo'),ajg=ajgOf(parsed,rec);
  const P=(value,doc,note)=>add({sec,key:'Preparo',label:'Preparo',value,current:VZ('preparo',r.Preparo),doc,kind:'select',options:VL('preparo',['Não Verificado','Comprovado','Não Recolhido','Dispensado','Não se Aplica']),note});
  if(who.publico||who.mp)P('Isento (ente público/MP)',rec.id,`${who.name||'Recorrente'}: isento de preparo (art. 1.007, § 1º, do CPC; art. 4º, I, da Lei 9.289/1996).`);
  else if(who.dpu&&ajg)P('Assistência da DPU',ajg.d.id,`Assistido pela Defensoria Pública, com gratuidade deferida (ID ${ajg.d.id}).`);
  else if(gs.length){const L=gs.map(d=>({d,g:gruInfo(d)})),ok=L.some(x=>x.g.comprovante);
    P(ok?'Comprovado':'Não verificado',gs.map(d=>d.id).join(', '),L.map(x=>`ID ${x.d.id} (${f(x.d)}): ${gruTxt(x.g)}`).join(' · ')+(ok?'':' — confira o pagamento.'));}
  else if(ajg)P('Justiça gratuita',ajg.d.id,`Gratuidade da justiça deferida (ID ${ajg.d.id}, ${f(ajg.d)}: “${ajg.frase}”). Confira se o beneficiário é o recorrente.`);
  if(ajg&&!who.publico)add({sec,key:'AJG',label:'AJG (gratuidade)',value:'Sim',current:yes(r.AJG)?'Sim':'',doc:ajg.d.id,kind:'select',options:['','Sim']});
  if(who.dpu)add({sec,key:'DPU (controle)',label:'Defensoria Pública da União',value:'Sim',current:yes(r['DPU (controle)'])?'Sim':'',doc:rec.id,kind:'select',options:['','Sim']});
  /* representação ex lege: dispensa procuração */
  if((who.publico||who.dpu||who.mp)&&!used.some(d=>d.target==='procuracao'))add({sec:'Representação',key:'Representação',label:'Representação',value:who.dpu?'Dispensada (DPU)':'Dispensada (procurador público)',current:VZ('repres',r.Representação),doc:rec.id,kind:'select',options:VL('repres',['Não Verificado','Regular','Negativo']),
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
    add({sec:'Parecer do MPF',key:'MPF',label:'Houve parecer?',value:'Com parecer',current:VZ('parecer',r.MPF),doc:d.id,kind:'select',options:VL('parecer',['Não se Aplica','Com Parecer','Sem Parecer'])});
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
    add({sec:'Representação',key:'Representação',label:'Representação',value:'Regular',current:VZ('repres',r.Representação),doc:procs.map(d=>d.id).join(', '),kind:'select',options:VL('repres',['Não Verificado','Regular','Negativo'])});
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

/* CMT · Ficha única do processo — diálogo no visual v198 (padrão cmtx), com os campos de padrao/ficha.json.
   Um só módulo para o Ab Initio e a Ex Officio: scripts/ficha/embutir.py copia este arquivo e padrao/ficha-dialogo.css
   para os dois HTML. Cada página entrega um adaptador:
     CMTFicha.abrir(cnj, {
       carregar: cnj => Promise<{ ficha, operacional, fonte, controles?, gestor? }>,
       gravar:   (cnj, campos) => Promise<{ operacional, recusados? }>   campos = { 'triagem.Tempestividade': 'Tempestivo', ... }
       irPara?:  controle => void        (botão "Abrir a página" dos Controles especiais)
       lista?:   [cnj, ...]              (anterior / próximo)
       avisar?:  (texto, tipo) => void
       leitura?: true                    (só leitura: sem o botão Editar e sem gravar; a Ex Officio edita pelo prontuário lateral)
       teor?: true                       (com leitura: ainda assim importa o inteiro teor e grava os campos confirmados)
     })
   Regras dos Controles especiais (quando cada grupo vale): CMTFicha.controlesDe(fonte, operacional), as mesmas do servidor (api/_metas, _sobr, _sens). */
(function () {
'use strict';
if (window.CMTFicha && window.CMTFicha.versao >= 1) return;
var doc = document;
var E = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var S = function (v) { return String(v == null ? '' : v).trim(); };
var N = function (v) { return S(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
var dg = function (v) { return S(v).replace(/\D/g, ''); };
var sim = function (v) { return /^(sim|s|true|1|x|ok)$/i.test(S(v)); };
var iso = function (v) { var s = S(v), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return s.slice(0, 10); m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : ''; };
var brD = function (v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] : S(v); };
var cnjFmt = function (v) { var d = dg(v); return d.length === 20 ? d.slice(0, 7) + '-' + d.slice(7, 9) + '.' + d.slice(9, 13) + '.' + d[13] + '.' + d.slice(14, 16) + '.' + d.slice(16) : S(v); };
/* data ISO (com ou sem hora) vira dd/mm/aaaa na leitura */
var mostra = function (v) { var s = S(v), m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s); return m && s.length <= 30 ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] && (m[4] !== '00' || m[5] !== '00') ? ' ' + m[4] + ':' + m[5] : '') : s; };
var hoje = function () { return new Date().toISOString().slice(0, 10); };
var agora = function () { var d = new Date(), p = function (n) { return ('0' + n).slice(-2); }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
var IC = {
  ficha: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>', print: '<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4h12"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', rule: '<path d="M18 5H6l6 7-6 7h12"/>', ok: '<path d="M5 12l5 5 9-10"/>',
  warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>', back: '<path d="M15 18l-6-6 6-6"/>', fwd: '<path d="M9 18l6-6-6-6"/>',
  json: '<path d="M8 4H7a2 2 0 0 0-2 2v4l-2 2 2 2v4a2 2 0 0 0 2 2h1"/><path d="M16 4h1a2 2 0 0 1 2 2v4l2 2-2 2v4a2 2 0 0 1-2 2h-1"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  txt: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5"/>'
};
var svg = function (k, c) { return '<svg class="' + (c || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + IC[k] + '</svg>'; };

/* ───── regras dos Controles especiais (iguais às do servidor) ───── */
var R_SOBR = /Sobrestad|\[SU\]\s*Sobrest|Motivos Diversos|IRDR ou IAC/i;
var R_SAUDE = /medicament|oncol[oó]g|cirurg|home care|tratamento (m[eé]dico|domiciliar)|assist[eê]ncia (à|a) sa[uú]de|assist[eê]ncia m[eé]dico|servi[cç]os de sa[uú]de|n[aã]o padronizado|registrado na anvisa|interna[cç][aã]o|leito|pr[oó]tese|[oó]rtese|insumo|sistema [uú]nico de sa[uú]de/i;
var R_NAO = /ressarcimento|servi[cç]o militar|aptid[aã]o f[ií]sica|multas/i;
function numerosMeta(d) {
  var out = [], re = /metas?\s*(?:cnj\s*)?[-:#]?\s*0?(\d{1,2})(?!\d)((?:\s*(?:e|,|\/)\s*0?\d{1,2}(?!\d))*)/gi, m;
  while ((m = re.exec(d))) [m[1]].concat((m[2] || '').match(/\d{1,2}/g) || []).forEach(function (n) { n = String(Number(n)); if (+n >= 1 && +n <= 12 && out.indexOf(n) < 0) out.push(n); });
  return out;
}
function temas(et) { var out = [], re = /tema\s*(?:n[ºo.]*\s*)?(\d{1,2}\.\d{3}|\d{1,4})\s*(?:\/|-|\s)?\s*(STF|STJ|TNU|TRF3?)?/gi, m; while ((m = re.exec(et))) { var t = 'Tema ' + m[1].replace('.', '') + (m[2] ? ' ' + m[2].toUpperCase() : ''); if (out.indexOf(t) < 0) out.push(t); } return out; }
function categoria(s) { return /oncol/i.test(s) ? 'Saúde · oncológico' : /medicament|n[aã]o padronizado|anvisa|insumo/i.test(s) ? 'Saúde · medicamento' : /cirurg|interna|leito|pr[oó]tese|[oó]rtese/i.test(s) ? 'Saúde · cirurgia ou internação' : /home care|tratamento/i.test(s) ? 'Saúde · tratamento' : 'Saúde · outro'; }
function controlesDe(fo, op) {
  fo = fo || {}; op = op || {};
  var tri = op.triagem || {}, tarefa = S(fo.tarefa_atual), et = S(fo.Etiquetas || fo.etiquetas), assunto = S(fo.Assunto || fo.Assunto_Principal), L = {};
  var mts = numerosMeta([et, tri.META].filter(Boolean).join(' ; '));
  if (mts.length && !/Sobrestad|\[SU\]/i.test(tarefa)) L.metas = { metas: mts, fase: tarefa };
  if (R_SOBR.test(tarefa) && !/Arquivo|Contadoria/i.test(tarefa)) {
    var tm = temas(et), mot = /IRDR ou IAC/i.test(tarefa) ? 'IRDR ou IAC' : /Tribunais Superiores/i.test(tarefa) || tm.length ? 'Tribunal superior (repetitivo ou repercussão geral)' : /Motivos Diversos/i.test(tarefa) ? 'Outro motivo' : '';
    L.sobrestados = { motivoAuto: mot, temasAuto: tm, tarefa: tarefa };
  }
  if (R_SAUDE.test(assunto + ' ' + et) && !R_NAO.test(assunto) && !/Baixad|Arquivo/i.test(tarefa)) L.sensiveis = { catAuto: categoria(assunto + ' ' + et) };
  return { naLista: L };
}

/* ───── estado ───── */
var ST = { cnj: '', ad: null, d: null, err: '', tab: 'resumo', edit: false, draft: {}, busy: false, view: 'ficha', mostra: {}, histAll: false, teor: null, vz: {}, vzTodos: false };
/* organização: a aba Pauta fica no fim da Produção (a aba Controles especiais se chama Monitoramento); quem abre a ficha na aba Pauta cai na Produção */
var PAUTA = 'Pauta', ROT_CE = 'Monitoramento', PRI_PROC = ['Autuação', 'Partes', 'Tramitação'];
ST.v2 = true;
function tabNorm(t) { return t === PAUTA ? (ST.v2 ? 'Produção' : CE) : t; }
function temValor(c) { return c.tipo === 'tabela' ? linhas(c.secao, c.chave).length > 0 : !!S(valorCampo(c)).trim(); }
var host = null;
function F() { return ST.d && ST.d.ficha; }
function op() { return (ST.d && ST.d.operacional) || {}; }
function fo() { return (ST.d && ST.d.fonte) || {}; }
function gravado(sec, k) { var v = (op()[sec] || {})[k]; return v == null ? '' : typeof v === 'object' ? '' : String(v); }
function linhasGravadas(sec, k) { var v = (op()[sec] || {})[k]; return Array.isArray(v) ? v : []; }
function linhas(sec, k) { var id = sec + '.' + k; return Object.prototype.hasOwnProperty.call(ST.draft, id) && Array.isArray(ST.draft[id]) ? ST.draft[id] : linhasGravadas(sec, k); }
/* grupo condicionado (ex.: embargos de declaração só para a espécie ED): aparece se a condição vale ou se já tem algum valor */
function grupoVisivel(g) { if (!g.quando) return true; var q = g.quando.campo.split('.'); if (val(q[0], q.slice(1).join('.')) === g.quando.valor) return true;
  return g.campos.some(function (c) { return c.tipo === 'tabela' ? linhas(c.secao, c.chave).length : !!valorCampo(c); }); }
function val(sec, k) { var id = sec + '.' + k; return Object.prototype.hasOwnProperty.call(ST.draft, id) ? ST.draft[id] : gravado(sec, k); }
function fonteVal(c) { var f = fo(), L = c.fonte || []; for (var i = 0; i < L.length; i++) { var v = f[L[i]]; if (v != null && S(v) !== '' && typeof v !== 'object') return S(v); } return ''; }
function valorCampo(c) { return c.secao ? val(c.secao, c.chave) : fonteVal(c); }
function editavel(c) { return !!c.secao && c.editavel !== false && !c.calculado; }
function bloqueado(c) { return (c.chave === 'SERVIDOR' || c.chave === 'CORRETOR') && c.secao === 'producao' && ST.d && ST.d.gestor === false; }
function destino() { var v = val('producao', 'Destino'); return v === 'Monocrática' ? 'monocratica' : v === 'Outro destino' ? 'outro' : 'sessao'; }
/* destino confirmado: "Sessão" ou "Monocrática" (gravado pela triagem ou pelo seletor); vazio = a definir na triagem */
function destinoDef() { var v = val('producao', 'Destino'); return v === 'Monocrática' ? 'monocratica' : v === 'Sessão' ? 'sessao' : v === 'Outro destino' ? 'outro' : ''; } /* destino + situação (colegiado ou monocrática: pronto ou pendente; outro destino) no seletor da ficha */ function destSel() { var v = val('producao', 'Destino'); if (!v) return ''; if (v === 'Outro destino') return 'Outro destino|'; return v + '|' + (val('producao', 'Destino - Situação') || 'Pendente'); }
function abaDe(nome) { return (F().abas || []).filter(function (a) { return a.aba === nome; })[0]; }
function slug(s) { return N(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
var CE = 'Controles especiais';
function naLista() { return ((ST.d && ST.d.controles) || {}).naLista || {}; }
function vale(g) {
  var L = naLista();
  if (g === 'urgencia') return !!val('triagem', 'Urgência');
  if (g === 'monocratica') return val('producao', 'Destino') === 'Monocrática';
  if (g === 'meta') return !!L.metas || numerosMeta(val('triagem', 'META')).length > 0;
  if (g === 'sobrestamento') return !!L.sobrestados;
  if (g === 'sensivel') return val('controles', 'Sensível - Excluído') !== 'Sim' && (!!L.sensiveis || val('controles', 'Sensível - Incluído') === 'Sim');
  return false;
}
var ORDEM_CE = ['urgencia', 'monocratica', 'meta', 'sobrestamento', 'sensivel'];
function ativos() { return ORDEM_CE.filter(vale); }

/* ───── leitura do processo: regras, fluxo, pendências ───── */
function regras() {
  var L = [], u = val('triagem', 'Urgência'), sec = S(fo()['Seção Competente'] || fo()['Seção']), na = naLista();
  if (u) { var a = val('triagem', 'Urgência - Apreciação'); L.push(['Urgência', u + (a && !/^Pendente/.test(a) ? ' · ' + a.replace('Apreciada · ', '') : ' · pendente'), /^Apreciada/.test(a) ? 'ouro' : 'ruim']); }
  if (sec) L.push(['Seção', (sec.match(/\d+/) || [sec])[0] + (/\d/.test(sec) ? 'ª' : ''), 'neutro']);
  var mt = (na.metas && na.metas.metas) || numerosMeta(val('triagem', 'META'));
  if (mt.length) L.push(['Meta', mt.map(function (m) { return 'M' + m; }).join(' · '), 'ouro']);
  if (vale('sobrestamento')) L.push(['Sobrestado', val('controles', 'Sobrestamento - Tema') || (na.sobrestados.temasAuto || []).join(', ') || 'sim', 'warn']);
  if (vale('sensivel')) L.push(['Caso sensível', val('controles', 'Sensível - Categoria') || (na.sensiveis || {}).catAuto || 'sim', 'warn']);
  var g = [sim(val('triagem', 'AJG')) ? 'AJG' : '', sim(val('triagem', 'DPU (controle)')) ? 'DPU' : ''].filter(Boolean); if (g.length) L.push(['Gratuidade', g.join(' · '), 'neutro']);
  var imp = val('triagem', 'Impedimento / Suspeição'); if (imp && !/^(n[aã]o|nenhum)/i.test(imp)) L.push(['Impedimento', imp, 'ruim']);
  var st = val('pauta', 'Status de Julgamento'); if (st) L.push(['Status', st.charAt(0) + st.slice(1).toLowerCase(), /ADIADO|RETIRADO/.test(st) ? 'ouro' : 'ok']);
  return L;
}
function sessoes() { var s = (op().pauta || {}).sessoes; return Array.isArray(s) ? s.slice().sort(function (a, b) { return S(b.sessao || b.data).localeCompare(S(a.sessao || a.data)); }) : []; }
function fluxo() {
  var p = function (k) { return val('producao', k); }, ss = sessoes(), ult = ss[0] || {}, sessao = iso(ult.sessao || ult.data || val('pauta', 'Nova sessão de destino') || val('pauta', 'Sessão original'));
  var min = { etapa: 'Minutado', feito: !!iso(p('MINUTADO')), quem: p('SERVIDOR'), quando: brD(iso(p('MINUTADO'))) || 'sem data' };
  var cor = { etapa: 'Corrigido', feito: sim(p('CORRIGIDO')) || !!iso(p('Data da Revisão')), quem: p('CORRETOR'), quando: brD(iso(p('Data da Revisão'))) || (sim(p('CORRIGIDO')) ? 'feito' : 'aguardando') };
  var L = destino() === 'monocratica' ? [min, cor,
    { etapa: 'Assinado', feito: sim(p('Assinado')) || !!iso(p('Data da Assinatura')), quem: '', quando: brD(iso(p('Data da Assinatura'))) || (iso(p('Data da Liberação')) ? 'enviada em ' + brD(iso(p('Data da Liberação'))) : 'pendente') },
    { etapa: 'Publicada', feito: sim(p('Publicado')) || !!iso(p('Mono - Data da publicação')), quem: p('Decisão - ID') ? 'ID ' + p('Decisão - ID') : '', quando: brD(iso(p('Mono - Data da publicação'))) || 'a publicar', destino: true }]
    : [{ etapa: 'Pautado', feito: !!sessao, quem: ult.item ? 'item ' + ult.item : '', quando: sessao ? brD(sessao) : 'sem sessão' }, min, cor,
    { etapa: 'Liberado', feito: sim(p('LIBERADO')) || !!iso(p('Data da Liberação')), quem: '', quando: brD(iso(p('Data da Liberação'))) || 'pendente' },
    { etapa: 'Sessão', feito: !!(sessao && sessao <= hoje() && !/ADIADO|RETIRADO/.test(val('pauta', 'Status de Julgamento'))), quem: ult.item ? 'item ' + ult.item : '', quando: brD(sessao) || '—', destino: true }];
  var k = -1; L.forEach(function (s, j) { if (k < 0 && !s.feito) k = j; s.atual = j === k; });
  return L;
}
var ACAO = { Pautado: 'Incluir em pauta', Minutado: 'Minutar', Corrigido: 'Corrigir', Liberado: 'Liberar para a sessão', 'Sessão': 'Julgar em sessão', Assinado: 'Assinar', Publicada: 'Publicar a decisão' };
function pendencias() {
  var t = function (k) { return val('triagem', k); }, c = function (k) { return val('controles', k); }, L = [], na = naLista();
  if (t('O que falta sanar')) L.push([t('O que falta sanar'), 'Triagem']);
  if (N(t('Tempestividade')) === 'intempestivo') L.push(['Recurso intempestivo', 'Triagem']);
  if (N(t('Representação')) === 'negativo') L.push(['Representação irregular', 'Triagem']);
  if (N(t('Preparo')) === 'nao recolhido') L.push(['Preparo não recolhido', 'Triagem']);
  if (N(t('Mídias')) === 'faltante') L.push(['Mídias faltantes', 'Triagem']);
  var nv = ['Tempestividade', 'Preparo', 'Representação'].filter(function (k) { return !t(k) || N(t(k)) === 'nao verificado'; });
  if (nv.length) L.push(['A verificar: ' + nv.join(', ').toLowerCase(), 'Triagem']);
  if (sim(val('producao', 'Rev - Atenção')) || val('producao', 'Rev - Nota de atenção')) L.push([val('producao', 'Rev - Nota de atenção') || 'Revisão com ponto de atenção', 'Produção']);
  if (vale('urgencia') && !/^Apreciada/.test(t('Urgência - Apreciação'))) L.push(['Urgência aguardando apreciação' + (t('Urgência - Data') ? ' desde ' + brD(iso(t('Urgência - Data'))) : ''), CE]);
  if (vale('sobrestamento') && /retirar/i.test(c('Sobrestamento - Situação do precedente'))) L.push(['Retirar o sobrestamento', CE]);
  if (vale('sobrestamento') && iso(c('Sobrestamento - Previsão de retirada')) && iso(c('Sobrestamento - Previsão de retirada')) < hoje()) L.push(['Previsão de retirada vencida', CE]);
  if (vale('sensivel') && iso(c('Sensível - Próxima verificação')) && iso(c('Sensível - Próxima verificação')) <= hoje()) L.push(['Verificação do caso sensível ' + (iso(c('Sensível - Próxima verificação')) < hoje() ? 'vencida' : 'hoje'), CE]);
  if (vale('sensivel') && /Pendente de cumprimento|Descumprimento/.test(c('Sensível - Cumprimento'))) L.push([c('Sensível - Cumprimento'), CE]);
  if (vale('meta') && iso(c('Meta - Prazo da providência')) && iso(c('Meta - Prazo da providência')) < hoje()) L.push(['Providência da meta vencida', CE]);
  return L;
}

/* ───── casca ───── */
function ensureHost() {
  if (host && doc.body.contains(host)) return host;
  host = doc.createElement('div'); host.id = 'cmt-fx'; host.setAttribute('aria-hidden', 'true');
  host.addEventListener('click', onClick); host.addEventListener('change', onChange); host.addEventListener('input', onInput); host.addEventListener('paste', onPastePostit);
  host.addEventListener('dragover', function (ev) { if (!ST.teor || ST.view !== 'ficha') return; if ([].slice.call((ev.dataTransfer && ev.dataTransfer.types) || []).indexOf('Files') >= 0) { ev.preventDefault(); host.classList.add('is-drop'); } });
  host.addEventListener('dragleave', function (ev) { if (ev.target === host || !host.contains(ev.relatedTarget)) host.classList.remove('is-drop'); });
  host.addEventListener('drop', function (ev) { host.classList.remove('is-drop'); var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]; if (!f || !ST.teor) return; ev.preventDefault(); lerTxt(f); });
  doc.body.appendChild(host); return host;
}
function abrir(cnj, ad) {
  ensureHost();
  ST.ad = ad || ST.ad || {}; ST.cnj = cnjFmt(cnj); ST.d = null; ST.err = ''; ST.edit = false; ST.draft = {}; ST.busy = false; ST.view = 'ficha'; ST.mostra = {}; ST.histAll = false; ST.obsEd = false; ST.obsTx = ''; descartarTeor();
  ST.tab = tabNorm((ad && ad.aba) || 'resumo'); ST.vz = {};
  host.classList.add('on'); host.setAttribute('aria-hidden', 'false'); doc.documentElement.classList.add('cmt-fx-open');
  doc.addEventListener('keydown', onKey, true);
  render();
  var alvo = ST.cnj;
  Promise.resolve().then(function () { return ST.ad.carregar(alvo); }).then(function (d) {
    if (ST.cnj !== alvo) return;
    ST.d = d || {}; if (window.CMTForense) window.CMTForense.atual = ST.d.expediente || null; if (!ST.d.controles || !ST.d.controles.naLista) ST.d.controles = Object.assign({}, ST.d.controles, controlesDe(ST.d.fonte, ST.d.operacional));
    render(); requestAnimationFrame(function () { var dl = host.querySelector('.fx-dlg'); if (dl) dl.focus({ preventScroll: true }); });
  }).catch(function (e) { if (ST.cnj !== alvo) return; ST.err = (e && e.message) || String(e); render(); });
}
function fechar(force) {
  if (!host) return;
  if (!force && Object.keys(ST.draft).length && !window.confirm('Descartar as alterações não salvas da ficha?')) return;
  descartarTeor(); host.classList.remove('on', 'is-drop'); host.setAttribute('aria-hidden', 'true'); host.innerHTML = '';
  doc.documentElement.classList.remove('cmt-fx-open'); doc.removeEventListener('keydown', onKey, true); ST.edit = false; ST.draft = {};
}
function passo(n) {
  var L = ST.ad.lista || [], i = L.map(dg).indexOf(dg(ST.cnj)); if (L.length < 2 || i < 0) return;
  if ((Object.keys(ST.draft).length || (ST.obsEd && S(ST.obsTx) !== S(val('origem', 'Observações')))) && !window.confirm('Descartar as alterações não salvas da ficha?')) return;
  var ad = Object.assign({}, ST.ad, { aba: ST.tab }); abrir(L[(i + n + L.length) % L.length], ad);
}
function onKey(ev) {
  if (!host || !host.classList.contains('on')) return;
  if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); if (ST.view === 'doc') { ST.view = 'ficha'; render(); return; } if (ST.teor) { fecharTeor(); return; } fechar(); return; }
  if (ev.target.closest && ev.target.closest('input,select,textarea')) return;
  if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && ev.altKey) { ev.preventDefault(); passo(ev.key === 'ArrowDown' ? 1 : -1); }
}
function avisar(t, tipo) { try { if (ST.ad.avisar) ST.ad.avisar(t, tipo); } catch (e) {} }

/* ───── desenho ───── */
function render() {
  if (!host) return;
  var m = host.querySelector('.fx-main'), y = m ? m.scrollTop : 0, b = host.querySelector('.fx2-body'), yb = b ? b.scrollTop : 0, tb = render._tab;
  host.innerHTML = ST.view === 'doc' && ST.d ? docView() : fichaView();
  var m2 = host.querySelector('.fx-main'); if (m2) m2.scrollTop = y;
  /* no celular a ficha rola inteira (.fx2-body): mantém a posição; ao trocar de aba, volta ao início da aba e mostra a aba ativa na faixa */
  var b2 = host.querySelector('.fx2-body'), nv = host.querySelector('.fx2-nav'), sel = host.querySelector('.fx2-nav [aria-selected="true"]');
  if (b2) { b2.scrollTop = tb !== undefined && tb !== ST.tab && nv ? Math.min(yb, nv.offsetTop - b2.offsetTop) : yb; }
  if (sel && sel.parentNode.scrollWidth > sel.parentNode.clientWidth) sel.parentNode.scrollLeft = sel.offsetLeft - (sel.parentNode.clientWidth - sel.offsetWidth) / 2;
  render._tab = ST.tab;
}
function cabecalho() {
  var f = fo(), cl = S(f.classe_judicial || f.Classe || f['Descrição da Classe']), as = S(f.Assunto || f.Assunto_Principal || f.assunto_judicial);
  var partes = [S(f.polo_ativo || f.Polo_Ativo || f['Polo Ativo']), S(f.polo_passivo || f.Polo_Passivo || f['Polo Passivo'])].filter(Boolean).join(' × ');
  var L = ST.ad.lista || [], i = L.map(dg).indexOf(dg(ST.cnj));
  var nav = L.length > 1 && i >= 0 ? '<button type="button" class="fx-sq" data-fx="ant" title="Processo anterior (Alt+↑)">' + svg('back') + '</button><span class="fx-note">' + (i + 1) + ' de ' + L.length + '</span><button type="button" class="fx-sq" data-fx="prox" title="Próximo processo (Alt+↓)">' + svg('fwd') + '</button>' : '';
  return '<header class="fx-head"><span class="fx-ic">' + svg('ficha') + '</span>' +
    '<div class="fx-tt"><span>' + E(['Ficha do processo', cl, as].filter(Boolean).join(' · ')) + '</span><div class="fx-num"><h2 id="fx-titulo">' + E(ST.cnj) + '</h2><button type="button" class="fx-sq" data-fx="copiar-num" aria-label="Copiar número do processo" title="Copiar número">' + svg('copy') + '</button></div>' + (partes ? '<small>' + E(partes) + '</small>' : '') + '</div>' +
    '<div class="fx-acts" role="group" aria-label="Ações da ficha">' + (window.CMTInteiroTeor && ST.d && !ST.err && (!ST.ad.leitura || ST.ad.teor) ? '<button type="button" class="fx-pill' + (ST.teor ? ' is-on' : '') + '" data-fx="teor" title="Importar o inteiro teor (.txt do PJe ou .md da extensão TecJustiça): lista os documentos e sugere os campos; grava só o que for confirmado">' + svg('txt') + 'Inteiro teor</button>' : '') + (ST.d && !ST.err ? '<button type="button" class="fx-pill" data-fx="teor-json" title="Baixar o inteiro teor extraído do PJe (.json): lista de peças com ID, tipo e data de juntada, e o texto de cada uma">' + svg('txt') + 'Baixar .json</button>' : '') + nav + '</div>' +
    '<button type="button" class="fx-sq fx-x" data-fx="fechar" aria-label="Fechar" title="Fechar (Esc)">' + svg('x') + '</button></header>';
}
function faixa() {
  var R = regras(), FL = fluxo();
  return '<div class="fx-strip"><div class="fx-rules"><span class="fx-k">' + svg('rule') + 'Regras</span>' +
    (R.length ? R.map(function (r) { return '<span class="fx-chip t-' + r[2] + '"><i>' + E(r[0]) + '</i>' + E(r[1]) + '</span>'; }).join('') : '<span class="fx-dim">sem regras calculadas</span>') + '</div>' +
    '<ol class="fx-flow" aria-label="Fluxo do processo">' + FL.map(function (s, j) {
      return '<li class="' + (s.feito ? 'is-done' : s.atual ? 'is-cur' : 'is-todo') + '"' + (s.atual ? ' aria-current="step"' : '') + '><span class="fx-dot">' + (s.feito ? svg('ok') : s.atual ? '<i></i>' : '') + '</span>' + (j < FL.length - 1 ? '<span class="fx-line"></span>' : '') +
        (s.destino ? '<select class="fx-dest-sel" data-fx-destino' + (ST.ad.leitura ? ' disabled' : '') + ' aria-label="Destino do julgamento" title="Destino do julgamento: sessão (acórdão) ou decisão monocrática">' + [['', 'A definir'], ['Sessão|Pronto para julgar', 'Colegiado · pronto'], ['Sessão|Pendente', 'Colegiado · pendente'], ['Monocrática|Pronto para julgar', 'Monocrática · pronta'], ['Monocrática|Pendente', 'Monocrática · pendente'], ['Outro destino|', 'Outro destino']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === destSel() ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' : '<b>' + E(s.etapa) + '</b>') +
        '<small>' + E([s.quem, s.quando].filter(Boolean).join(' · ')) + '</small></li>';
    }).join('') + '</ol></div>';
}
function abas() {
  var P = pendencias(), L = [['resumo', 'Resumo', 0]];
  (F().abas || []).forEach(function (a) { if (a.aba === PAUTA) return; var n = a.aba === CE ? (ST.v2 ? ativos().filter(function (g) { return g !== 'monocratica'; }).length : ativos().length + P.filter(function (p) { return p[1] === PAUTA; }).length) : P.filter(function (p) { return p[1] === a.aba || (ST.v2 && a.aba === 'Produção' && p[1] === PAUTA); }).length; L.push([a.aba, a.aba === CE ? ROT_CE : a.aba, n, a.aba === CE]); });
  return L;
}
/* ───── casca v2: topo fino; à esquerda o caso, as etapas, as regras e as pendências; à direita as abas (mesmos campos) ───── */
/* grupos que a coluna do processo já mostra (etapas): saem da aba na leitura e voltam no modo de edição */
var FX2_SO_LADO = ['Liberação para a sessão'];
var FX2_COR = { Pautado: 'p', Minutado: 'm', Corrigido: 'c', Liberado: 'l', 'Sessão': 's', Assinado: 'a', Publicada: 's' };
var FX2_IC = { Pautado: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', Minutado: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>', Corrigido: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', Liberado: '<path d="M4 12l15-7-5 15-3-6z"/>', 'Sessão': '<path d="M12 3v18M5 7h14M7 7l-3 7h6zM17 7l-3 7h6z"/>', Assinado: '<path d="M4 17c3-6 5-9 7-9s0 8 2 8 2-4 4-4 2 3 4 3M4 21h16"/>', Publicada: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>' };
function fx2Sv(d, n) { return '<svg viewBox="0 0 24 24" width="' + (n || 13) + '" height="' + (n || 13) + '" aria-hidden="true">' + d + '</svg>'; }
function fx2Cl(c) { var k = N(c), M = { 'apelacao civel': 'ApCiv', 'apelacao criminal': 'ApCrim', 'agravo de instrumento': 'AI', 'remessa necessaria civel': 'RemNecCiv', 'remessa necessaria': 'RemNec', 'agravo interno': 'AgInt', 'embargos de declaracao': 'ED', 'mandado de seguranca': 'MS', 'conflito de competencia': 'CC' }; return M[k] || c; }
/* bloco Monocrática (fim da Produção, quando o destino é monocrática): o título do caso, como no prontuário das monocráticas */
function fx2MonoX() { try { return JSON.parse(((op().controles || {})._monoExtra) || '{}'); } catch (e) { return {}; } }
function fx2Mono() {
  var x = fx2MonoX();
  return card('Caso da monocrática', (x.titulo ? '<p class="fx2-tit">' + E(x.titulo) + '</p><p class="fx-note">título do caso · aparece no painel do Desembargador (edite no prontuário das monocráticas)</p>' : '<p class="fx-dim">Sem título do caso. Ele é escrito no prontuário das monocráticas e aparece no painel do Desembargador.</p>') +
    '', { cls: 'fx2-monoc' });
}
document.addEventListener('click', function (ev) { var t = ev.target && ev.target.closest && ev.target.closest('#cmt-fx [data-fx-pmv]'); if (!t) return; ST.pmv = t.getAttribute('data-fx-pmv'); ST.pmvCnj = ST.cnj; render(); });
/* sinalizações dos prontuários (Pauta e Monocráticas): intercorrência, pendências e avisos, mais as pendências calculadas pela ficha */
function fx2Sinais() {
  var SG = (ST.d && ST.d.sinais) || [], I = [], dt = function (p) { return [p.por, p.ok ? 'resolvida' + (p.okEm || p.resolvidaEm ? ' em ' + brD(iso(p.okEm || p.resolvidaEm)) : '') : p.em ? brD(iso(p.em)) : ''].filter(Boolean).join(' · '); };
  SG.forEach(function (o) {
    if (o.intercor) I.push({ k: 'ic', ok: !!o.intercorOk, t: o.intercorTipo || 'Intercorrência', d: o.intercor, m: [o.origem, o.intercorChamado ? 'chamado ' + o.intercorChamado : '', o.intercorOk ? 'resolvida' : 'retém a liberação'].filter(Boolean).join(' · ') });
    if (!o.intercor && /^(adiad|retirad)/i.test(o.resultado || '')) I.push({ k: 'ic', ok: !!o.retidoOk, t: /^adiad/i.test(o.resultado) ? 'Adiado' : 'Retirado de pauta', d: o.resultado, m: o.origem });
    (o.pendencias || []).forEach(function (p) { if (p && p.desc) I.push({ k: 'pd', ok: !!p.ok, t: 'Pendência', d: p.desc, m: [o.origem, dt(p)].filter(Boolean).join(' · ') }); });
    (o.avisos || []).forEach(function (p) { if (p && p.desc) I.push({ k: 'av', ok: !!p.ok, t: 'Aviso', d: p.desc, m: [o.origem, dt(p)].filter(Boolean).join(' · ') }); });
  });
  var P = pendencias(), man = I.map(function (x) { return N(x.d); });
  P.forEach(function (x) { if (man.indexOf(N(x[0])) < 0) I.push({ k: 'pd', ok: false, t: 'Pendência · calculada', d: x[0], m: 'ficha · aba ' + (x[1] === CE ? ROT_CE : x[1] === PAUTA ? 'Produção' : x[1]), tab: x[1] }); });
  var n = function (k) { return I.filter(function (x) { return x.k === k && !x.ok; }).length; }, ab = I.filter(function (x) { return !x.ok; }), rs = I.filter(function (x) { return x.ok; });
  var li = function (x) { return '<' + (x.tab ? 'button type="button" data-fx-tab="' + E(x.tab) + '"' : 'div') + ' class="fx2-sg k-' + x.k + (x.ok ? ' is-ok' : '') + '"><em>' + E(x.t) + '</em><span>' + E(x.d) + '</span><small>' + E(x.m) + '</small></' + (x.tab ? 'button' : 'div') + '>'; };
  return '<section class="fx2-m"><p class="fx2-sh"><span class="fx2-ic">' + fx2Sv('<path d="M5 21V4h11l-2 4 2 4H5"/>') + '</span>Sinalizações<i>registre e resolva no prontuário</i></p>' +
    '<div class="fx2-cnt">' + [['ic', 'intercorrência', 'intercorrências'], ['pd', 'pendência', 'pendências'], ['av', 'aviso', 'avisos']].map(function (c) { var v = n(c[0]); return '<span class="k-' + c[0] + (v ? ' on' : '') + '"><b>' + v + '</b>' + (v === 1 ? c[1] : c[2]) + '</span>'; }).join('') + '</div>' +
    (ab.length ? ab.map(li).join('') : '<p class="fx2-ok">' + svg('ok') + 'Nenhuma sinalização em aberto</p>') + (rs.length ? '<details class="fx2-rs"><summary>' + rs.length + (rs.length > 1 ? ' resolvidas' : ' resolvida') + '</summary>' + rs.map(li).join('') + '</details>' : '') + '</section>';
}
/* anotações dos prontuários (Notas sobre o caso), como mensagens */
function fx2Anot() {
  var L = []; ((ST.d && ST.d.sinais) || []).forEach(function (o) { (o.notas || []).forEach(function (n) { if (n && n.tx) L.push({ tx: n.tx, por: n.por || '', em: n.em || '', o: o.origem }); }); });
  L.sort(function (a, b) { return S(a.em).localeCompare(S(b.em)); });
  var ini = function (n) { n = S(n); var p = n.split(/[\s\/]+/).filter(Boolean); return n ? (p.length > 1 ? p[0][0] + p[1][0] : n.slice(0, 2)).toUpperCase() : '—'; };
  var hr = function (v) { var d = new Date(v); return isNaN(d) ? '' : brD(iso(v)).slice(0, 5) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  return card('Anotações', L.length ? '<div class="fx2-nts">' + L.map(function (n) { return '<div class="fx2-nt"><span class="fx2-av">' + E(ini(n.por)) + '</span><div><p>' + E(n.tx) + '</p><small>' + E([n.por, hr(n.em), n.o].filter(Boolean).join(' · ')) + '</small></div></div>'; }).join('') + '</div>' : '<p class="fx-dim">Sem anotações. As notas escritas nos prontuários da Pauta e das Monocráticas aparecem aqui.</p>', { cls: 'fx2-anot', nota: L.length ? L.length + (L.length > 1 ? ' notas' : ' nota') : '' });
}
/* Resumo · rodapé do cartão Processo: a Pauta (no colegiado) ou a Urgência (na monocrática) */
function fx2RodProc(mono, pau, t) {
  var h = mono ? (t('Urgência') ? '<div class="rs-tiles">' + [['Medida', t('Urgência')], ['Apreciação', t('Urgência - Apreciação') || 'Pendente · não apreciada', !/^Apreciada/.test(t('Urgência - Apreciação')) ? 'is-warn' : ''], ['Pedido em', brD(iso(t('Urgência - Data')))], ['Nível', t('Urgência - Nível')]].filter(function (x) { return S(x[1]); }).map(function (x) { return '<div class="rs-t ' + (x[2] || '') + '"><span>' + E(x[0]) + '</span><b>' + E(x[1]) + '</b></div>'; }).join('') + '</div>' : '<p class="rs-empty">Sem pedido urgente registrado.</p>') : pau;
  return '<div class="fx2-rod"><p class="fx2-rodh"><span>' + (mono ? 'Urgência' : 'Pauta') + '</span><button type="button" data-fx-tab="' + (mono ? CE : 'Produção') + '" title="Abrir a aba">Abrir ›</button></p>' + h + '</div>';
}
/* produção na coluna (integrada às etapas): quem fez e quando, no colegiado ou na monocrática */
function fx2Prod() {
  var p = function (k) { return val('producao', k); }, mono = destino() === 'monocratica', d = function (k) { return brD(iso(p(k))); };
  var L = mono ? [['Minuta', [p('SERVIDOR'), d('MINUTADO')]], ['Revisão', [p('CORRETOR'), d('Data da Revisão')]], ['Resultado', [p('Voto - Resultado')]], ['Enviada p/ assinatura', [d('Data da Liberação')]], ['Assinada', [sim(p('Assinado')) || iso(p('Data da Assinatura')) ? 'Sim' : '', d('Data da Assinatura')]], ['Publicada', [sim(p('Publicado')) ? 'Sim' : '', d('Mono - Data da publicação')]]]
    : [['Minuta', [p('SERVIDOR'), d('MINUTADO')]], ['Revisão', [p('CORRETOR'), sim(p('CORRIGIDO')) && !iso(p('Data da Revisão')) ? 'corrigido' : d('Data da Revisão')]], ['Liberado', [sim(p('LIBERADO')) && !iso(p('Data da Liberação')) ? 'Sim' : d('Data da Liberação')]], ['Resultado do voto', [p('Voto - Resultado')]], ['Tópico-síntese', [p('Tópico-síntese')]]];
  return '<div class="fx2-pro"><p class="fx2-proh"><span>Produção · ' + (mono ? 'monocrática' : 'acórdão') + '</span><button type="button" data-fx-tab="Produção" title="Abrir a aba Produção">Abrir ›</button></p><dl>' +
    L.map(function (x) { var v = x[1].filter(Boolean).join(' · '); return '<dt>' + E(x[0]) + '</dt><dd' + (v ? '' : ' class="vz"') + '>' + E(v || '—') + '</dd>'; }).join('') + '</dl></div>';
}
function fx2Topo() {
  var f = fo(), de = iso(f.data_entrada_tarefa), dd = de ? Math.max(0, Math.round((Date.parse(hoje()) - Date.parse(de)) / 864e5)) : null;
  var L = ST.ad.lista || [], i = L.map(dg).indexOf(dg(ST.cnj));
  var nav = L.length > 1 && i >= 0 ? '<button type="button" class="fx-sq" data-fx="ant" title="Processo anterior (Alt+↑)">' + svg('back') + '</button><span class="fx2-nv">' + (i + 1) + ' de ' + L.length + '</span><button type="button" class="fx-sq" data-fx="prox" title="Próximo processo (Alt+↓)">' + svg('fwd') + '</button>' : '';
  return '<header class="fx2-top"><span class="fx2-k">Ficha do processo</span>' + (dd != null ? '<span class="fx2-dt' + (dd > 15 ? ' is-al' : '') + '">' + dd + (dd === 1 ? ' dia' : ' dias') + ' na tarefa<span class="fx2-mt"><i style="width:' + Math.min(100, Math.round(dd * 100 / 30)) + '%"></i></span></span>' : '') +
    '<span class="fx-grow"></span><div class="fx-acts" role="group" aria-label="Ações da ficha">' + (window.CMTInteiroTeor && ST.d && !ST.err && (!ST.ad.leitura || ST.ad.teor) ? '<button type="button" class="fx-pill' + (ST.teor ? ' is-on' : '') + '" data-fx="teor" title="Importar o inteiro teor (.txt do PJe ou .md da extensão TecJustiça): lista os documentos e sugere os campos; grava só o que for confirmado">' + svg('txt') + 'Inteiro teor</button>' : '') + (ST.d && !ST.err ? '<button type="button" class="fx-pill" data-fx="teor-json" title="Baixar o inteiro teor extraído do PJe (.json): lista de peças com ID, tipo e data de juntada, e o texto de cada uma">' + svg('txt') + 'Baixar .json</button>' : '') +
    (ST.d && !ST.err ? '<button type="button" class="fx-pill" data-fx="doc" title="Ficha completa · ler, imprimir ou salvar em PDF">' + svg('print') + 'Ficha completa</button>' : '') + nav + '</div>' +
    '<button type="button" class="fx-sq fx-x" data-fx="fechar" aria-label="Fechar" title="Fechar (Esc)">' + svg('x') + '</button></header>';
}
function fx2Lado() {
  var f = fo(), cl = S(f.classe_judicial || f.Classe || f['Descrição da Classe']), as = S(f.Assunto || f.Assunto_Principal || f.assunto_judicial), ta = S(f.tarefa_atual);
  var partes = [S(f.polo_ativo || f.Polo_Ativo || f['Polo Ativo']), S(f.polo_passivo || f.Polo_Passivo || f['Polo Passivo'])].filter(Boolean).join(' × ');
  var caso = '<section class="fx2-cd"><div class="fx2-l1"><h2 id="fx-titulo">' + E(ST.cnj) + '</h2>' + (cl ? '<span class="fx2-cl" title="' + E(cl) + '">' + E(fx2Cl(cl)) + '</span>' : '') + '<button type="button" class="fx-sq fx2-cp" data-fx="copiar-num" aria-label="Copiar número do processo" title="Copiar número">' + svg('copy') + '</button></div>' +
    (as || ta ? '<p class="fx2-as">' + (as ? '<b>' + E(as) + '</b>' : '') + (ta ? '<span>' + E(ta) + '</span>' : '') + '</p>' : '') +
    (partes ? '<p class="fx2-pt" title="' + E(partes) + '">' + fx2Sv('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 15c3 0 6 1.5 6 4"/>', 14) + E(partes) + '</p>' : '') + '</section>';
  var FL = fluxo(), nOk = FL.filter(function (x) { return x.feito; }).length, dest = FL.filter(function (x) { return x.destino; })[0];
  var et = '<section class="fx2-m"><p class="fx2-sh"><span class="fx2-ic">' + fx2Sv('<path d="M4 12h4l3-8 4 16 3-8h2"/>') + '</span>Etapas<i>' + nOk + ' de ' + FL.length + '</i></p><ol class="fx2-et" style="--n:' + FL.length + ';--p:' + (FL.length > 1 ? Math.round(Math.max(0, FL.findIndex(function (x) { return !x.feito; }) < 0 ? FL.length - 1 : FL.findIndex(function (x) { return !x.feito; })) / (FL.length - 1) * 100) : 0) + '%" aria-label="Fluxo do processo"><i class="fx2-ln"><i></i></i>' +
    FL.map(function (x) { return '<li class="c-' + (FX2_COR[x.etapa] || 'p') + (x.feito ? ' is-done' : x.atual ? ' is-cur' : '') + '"' + (x.atual ? ' aria-current="step"' : '') + ' title="' + E([x.etapa, x.quem, x.quando].filter(Boolean).join(' · ')) + '">' + (x.atual ? '<em class="fx2-ag">agora</em>' : '') + '<span class="fx2-c">' + fx2Sv(x.feito ? '<path d="M5 12.5l4.5 4.5L19 7.5"/>' : FX2_IC[x.etapa] || '', 14) + '</span><b>' + E(x.etapa) + '</b><small>' + E(x.quando && x.quando !== 'sem data' && x.quando !== 'pendente' && x.quando !== 'aguardando' && x.quando !== 'sem sessão' ? String(x.quando).replace(/^(\d{2}\/\d{2})\/\d{4}$/, '$1') : '—') + '</small></li>'; }).join('') + '</ol>' +
    fx2Prod() + '</section>';
  var R = regras(), rg = '<section class="fx2-m"><p class="fx2-sh"><span class="fx2-ic">' + svg('rule') + '</span>Regras<i>calculadas</i></p><div class="fx2-rg">' + (R.length ? R.map(function (r) { return '<span class="fx2-ch t-' + r[2] + '"><i>' + E(r[0]) + '</i>' + E(r[1]) + '</span>'; }).join('') : '<span class="fx-dim">sem regras calculadas</span>') + '</div></section>';
  var pd = fx2Sinais();
  return '<aside class="fx2-side" aria-label="O processo">' + caso + et + rg + pd + '</aside>';
}
function fichaView() {
  ST.v2 = true;
  if (ST.v2 && ST.d && !ST.err) return fichaView2();

  var corpo, nav = '', pode = !!ST.d && !ST.err;
  if (ST.err) corpo = '<section class="fx-card fx-alert"><h4>' + svg('warn') + 'Não foi possível ler a ficha</h4><p>' + E(ST.err) + '</p></section>';
  else if (!ST.d) corpo = '<section class="fx-card"><p class="fx-lead">Lendo a ficha do processo…</p><p>Modelo (padrao/ficha.json), registro do gabinete (operacional) e dados do acervo (fonte).</p></section>';
  else corpo = ST.tab === 'resumo' ? abaResumo() : abaGrupos(abaDe(ST.tab) || F().abas[0]);
  if (pode) nav = '<nav class="fx-nav" aria-label="Seções da ficha"><div class="fx-seg" role="tablist">' + abas().map(function (a) {
    return '<button type="button" role="tab" data-fx-tab="' + E(a[0]) + '" aria-selected="' + (ST.tab === a[0]) + '">' + E(a[1]) + (a[2] ? '<span class="fx-badge' + (a[3] ? ' is-ce' : '') + '">' + a[2] + '</span>' : '') + '</button>';
  }).join('') + '</div><span class="fx-grow"></span><div class="fx-seg fx-acts2" role="group" aria-label="Ficha completa e edição"><button type="button" data-fx="doc" aria-label="Ficha completa" title="Ficha completa · ler, imprimir ou salvar em PDF">' + svg('print') + '</button>' +
    (ST.ad.leitura ? '' : '<button type="button" data-fx="editar" aria-pressed="' + ST.edit + '" title="Liberar a edição dos campos do gabinete">' + svg('edit') + (ST.edit ? 'Editando' : 'Editar') + '</button>') + '</div></nav>';
  var n = Object.keys(ST.draft).length;
  return '<section class="fx-dlg' + (ST.teor ? ' has-teor' : '') + '" role="dialog" aria-modal="true" aria-labelledby="fx-titulo" tabindex="-1">' + cabecalho() + (pode ? faixa() : '') + nav +
    (ST.edit ? '<div class="fx-editbar" role="status">' + svg('edit') + 'Modo de edição: os campos do gabinete estão liberados. Os dados do acervo (PJe) e os campos calculados continuam bloqueados.</div>' : '') +
    '<div class="fx-work"><main class="fx-main">' + corpo + '</main>' + (ST.teor ? teorPanel() : '') + '</div>' +
    '<footer class="fx-foot"><span class="fx-legend"><span><kbd>Esc</kbd> fecha</span><span>' + svg('lock', 'is-imp') + 'acervo (PJe) · só leitura</span><span>' + svg('rule', 'is-calc') + 'calculado</span><span><i class="fx-sw"></i>campo do gabinete · grava no operacional</span></span>' +
    (ST.edit ? '<button type="button" class="fx-b" data-fx="descartar">Descartar</button><button type="button" class="fx-b pri" data-fx="salvar"' + (ST.busy ? ' disabled' : '') + '>' + (ST.busy ? 'Salvando…' : 'Salvar alterações' + (n ? ' (' + n + ')' : '')) + '</button>' : '<button type="button" class="fx-b" data-fx="fechar">Fechar</button>') +
    '</footer></section>';
}
function fichaView2() {
  var corpo = ST.tab === 'resumo' ? abaResumo() : abaGrupos(abaDe(ST.tab) || F().abas[0]);
  var nav = '<nav class="fx-nav fx2-nav" aria-label="Seções da ficha"><div class="fx-seg" role="tablist">' + abas().map(function (a) {
    return '<button type="button" role="tab" data-fx-tab="' + E(a[0]) + '" aria-selected="' + (ST.tab === a[0]) + '">' + E(a[1]) + (a[2] ? '<span class="fx-badge' + (a[3] ? ' is-ce' : '') + '">' + a[2] + '</span>' : '') + '</button>';
  }).join('') + '</div><span class="fx-grow"></span>' + (ST.ad.leitura ? '' : '<div class="fx-seg fx-acts2" role="group" aria-label="Edição"><button type="button" data-fx="editar" aria-pressed="' + ST.edit + '" title="Liberar a edição dos campos do gabinete">' + svg('edit') + (ST.edit ? 'Editando' : 'Editar') + '</button></div>') + '</nav>';
  var n = Object.keys(ST.draft).length;
  return '<section class="fx-dlg fx-v2' + (ST.teor ? ' has-teor' : '') + '" role="dialog" aria-modal="true" aria-labelledby="fx-titulo" tabindex="-1">' + fx2Topo() +
    '<div class="fx2-body">' + fx2Lado() + '<div class="fx2-main">' + nav +
    (ST.edit ? '<div class="fx-editbar" role="status">' + svg('edit') + 'Modo de edição: os campos do gabinete estão liberados. Os dados do acervo (PJe) e os campos calculados continuam bloqueados.</div>' : '') +
    '<div class="fx-work"><main class="fx-main">' + corpo + '</main>' + (ST.teor ? teorPanel() : '') + '</div></div></div>' +
    '<footer class="fx-foot"><span class="fx-legend"><span><kbd>Esc</kbd> fecha</span><span>' + svg('lock', 'is-imp') + 'acervo (PJe) · só leitura</span><span>' + svg('rule', 'is-calc') + 'calculado</span><span><i class="fx-sw"></i>campo do gabinete · grava no operacional</span></span>' +
    (ST.edit ? '<button type="button" class="fx-b" data-fx="descartar">Descartar</button><button type="button" class="fx-b pri" data-fx="salvar"' + (ST.busy ? ' disabled' : '') + '>' + (ST.busy ? 'Salvando…' : 'Salvar alterações' + (n ? ' (' + n + ')' : '')) + '</button>' : '<button type="button" class="fx-b pri" data-fx="fechar">Fechar</button>') +
    '</footer></section>';
}
function card(titulo, corpo, o) { o = o || {}; return '<section class="fx-card ' + (o.cls || '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + '><h4>' + (o.n ? '<b class="fx-n">' + E(o.n) + '</b>' : '') + E(titulo) + (o.chip || '') + '<span class="fx-grow"></span>' + (o.nota ? '<em>' + E(o.nota) + '</em>' : '') + (o.acoes || '') + '</h4>' + corpo + '</section>'; }
function span(c, v) {
  if (c.tipo === 'texto-longo') return 4;
  if (c.tipo === 'lista') return (c.opcoes || []).some(function (o) { return o.length > 26; }) ? 2 : 1;
  if (c.tipo === 'texto') { var n = S(v).length; return n > 90 ? 4 : n > 30 || c.rotulo.length > 26 ? 2 : 1; }
  return 1;
}
function campoTabela(c) {
  var id = c.secao + '.' + c.chave, L = linhas(c.secao, c.chave), cols = c.colunas || [], ed = ST.edit, sujo = Object.prototype.hasOwnProperty.call(ST.draft, id);
  var lab = '<span class="fx-lab">' + E(c.rotulo) + ' <em class="fx-dim">· ' + L.length + (L.length === 1 ? ' linha' : ' linhas') + '</em></span>';
  if (!ed) return '<div class="fx-f s4">' + lab + (L.length ? '<div class="fx-tbl fx-tb" style="grid-template-columns:repeat(' + cols.length + ',minmax(0,1fr))!important">' + cols.map(function (k) { return '<span class="th">' + E(k.rotulo) + '</span>'; }).join('') +
    L.map(function (l) { return cols.map(function (k) { var x = S(l[k.chave]); return '<span class="' + (k.chave === 'ids' || k.chave === 'id' ? 'fx-mono' : '') + '">' + E(k.tipo === 'data' ? brD(iso(x) || x) : x) + '</span>'; }).join(''); }).join('') + '</div>' : '<span class="fx-v fx-dim">—</span>') + '</div>';
  return '<div class="fx-f s4 is-edit' + (sujo ? ' is-dirty' : '') + '">' + lab + '<div class="fx-tbe">' + L.map(function (l, i) {
    return '<div class="fx-tbr">' + cols.map(function (k) { var x = S(l[k.chave]), a = 'data-fx-tb="' + E(id) + '" data-fx-i="' + i + '" data-fx-c="' + E(k.chave) + '" placeholder="' + E(k.rotulo) + '" aria-label="' + E(k.rotulo) + '"';
      return k.tipo === 'texto-longo' ? '<textarea rows="2" ' + a + '>' + E(x) + '</textarea>' : '<input ' + (k.tipo === 'data' ? 'type="date" value="' + E(iso(x) || x) + '"' : 'value="' + E(x) + '"') + ' ' + a + '>'; }).join('') +
      '<button type="button" class="fx-sq" data-fx-tbx="' + E(id) + '" data-fx-i="' + i + '" title="Excluir a linha">' + svg('x') + '</button></div>'; }).join('') +
    '<button type="button" class="fx-pill fx-mini" data-fx-tba="' + E(id) + '">' + svg('plus') + 'Linha</button></div></div>';
}
/* Observações formatadas: colar o resumo do processo (Próximo ato, Prazos e alertas, O caso, Partes e andamento, Post-its…) vira texto
   padronizado ("## Seção", "- item", "Rótulo: valor", "• Nota: texto — Peça · id N"); na leitura, seções, listas e post-its coloridos */
var PI_TIPOS = [['nota', 'Nota'], ['aten[cç][aã]o', 'Atenção'], ['pend[eê]ncia', 'Pendência'], ['alerta', 'Alerta'], ['lembrete', 'Lembrete'], ['d[uú]vida', 'Dúvida'], ['importante', 'Importante']];
var PI_RE = new RegExp('^(' + PI_TIPOS.map(function (t) { return t[0]; }).join('|') + ')(?=\\s*[:\\-–—]|\\s+|[A-ZÀ-Ú(“"0-9])\\s*[:\\-–—]?\\s*', 'i');
var PI_LINHA = new RegExp('^•\\s*(' + PI_TIPOS.map(function (t) { return t[1]; }).join('|') + '):\\s*(.*)$');
var OBS_SEC = ['Próximo ato', 'Prazos e alertas', 'O caso', 'Partes e andamento', 'Post-its colados nas peças', 'Pendências', 'Providências', 'Resumo'];
var OBS_ROT = ['Por quê', 'Polo ativo', 'Polo passivo', 'Fase', 'Último ato', 'Prazo', 'Classe', 'Assunto', 'Relator', 'Origem'];
var OBS_ROT_RE = new RegExp('^(' + OBS_ROT.join('|') + '):\\s*(.*)$', 'i');
function semAc(x) { return S(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function piTipo(x) { for (var i = 0; i < PI_TIPOS.length; i++) if (new RegExp('^' + PI_TIPOS[i][0] + '$', 'i').test(x)) return PI_TIPOS[i][1]; return 'Nota'; }
function obsSec(l) { var x = semAc(l.replace(/\s*·\s*\d+\s*$/, '').replace(/:\s*$/, '')); if (/^post-?its?\b/.test(x)) return 'Post-its colados nas peças'; for (var i = 0; i < OBS_SEC.length; i++) if (x === semAc(OBS_SEC[i])) return OBS_SEC[i]; return ''; }
function obsRot(l) { var x = semAc(l.replace(/:\s*$/, '')); for (var i = 0; i < OBS_ROT.length; i++) if (x === semAc(OBS_ROT[i])) return OBS_ROT[i]; return ''; }
function obsPostit(l, naSecao) {
  var bala = /^[*•\-–]\s*/.test(l), x = l.replace(/^[*•\-–]\s*/, '').replace(/\s*Descolar\s*$/i, ''), m = PI_RE.exec(x);
  if (!m || (!naSecao && !bala) || (!naSecao && !/^[^:]{0,12}:/.test(x) && !/^[A-ZÀ-Ú]/.test(x.slice(m[1].length).trim()))) return '';
  var resto = x.slice(m[0].length).trim(), f = /^(.*?)\s+—\s+([^—]*·\s*id\s*\d+)\s*$/i.exec(resto) || /^(.*[.;!?)”"])\s*([^.;!?]{2,90}?·\s*id\s*\d+)\s*$/i.exec(resto);
  return '• ' + piTipo(m[1]) + ': ' + (f ? f[1].trim() + ' — ' + f[2].trim() : resto);
}
function obsNormaliza(txt) {
  var out = [], sec = '', pend = '', ach = 0;
  S(txt).replace(/\r/g, '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (l) {
    var sc = obsSec(l.replace(/^##\s*/, '')); if (sc) { if (pend) { out.push(pend + ':'); pend = ''; } out.push('## ' + sc); sec = sc; ach++; return; }
    var rt = obsRot(l); if (rt && !/:\s*\S/.test(l)) { pend = rt; return; }
    if (pend) { out.push(pend + ': ' + l); pend = ''; return; }
    var pi = obsPostit(l, sec === 'Post-its colados nas peças'); if (pi) { out.push(pi); ach++; return; }
    if (/^[*•\-–]\s+/.test(l)) { out.push('- ' + l.replace(/^[*•\-–]\s+/, '')); return; }
    out.push(l);
  });
  if (pend) out.push(pend + ':');
  return ach ? out.join('\n') : null;
}
function temFormato(v) { return S(v).split('\n').some(function (l) { l = l.trim(); return /^##\s/.test(l) || PI_LINHA.test(l); }); }
function obsIds(h) { return h.replace(/\b(id\s*)(\d{6,})/gi, '$1<b class="fx-mono">$2</b>'); }
function obsHtml(v) {
  var secs = [], cur = null, novo = function (t) { cur = { t: t, L: [] }; secs.push(cur); };
  S(v).split('\n').map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (l) { var m = /^##\s*(.+)$/.exec(l); if (m) novo(m[1].trim()); else { if (!cur) novo(''); cur.L.push(l); } });
  return '<div class="fx-obs">' + secs.map(function (sc) {
    var h = '', ul = [], pis = [], fecha = function () { if (ul.length) { h += '<ul class="fx-obs-ul">' + ul.join('') + '</ul>'; ul = []; } if (pis.length) { h += '<div class="fx-pis">' + pis.join('') + '</div>'; pis = []; } };
    sc.L.forEach(function (l) {
      var m = PI_LINHA.exec(l);
      if (m) { if (ul.length) fecha(); var tx = m[2], fo = '', k = tx.lastIndexOf(' — '); if (k > 0 && /·\s*id\s*\d+/i.test(tx.slice(k))) { fo = tx.slice(k + 3); tx = tx.slice(0, k); }
        var cls = { 'Nota': 'nota', 'Atenção': 'atencao', 'Alerta': 'atencao', 'Importante': 'atencao', 'Pendência': 'pend', 'Lembrete': 'pend', 'Dúvida': 'duvida' }[m[1]] || 'nota';
        pis.push('<div class="fx-pi t-' + cls + '"><span class="fx-pi-t">' + E(m[1]) + '</span><p>' + obsIds(E(tx)) + '</p>' + (fo ? '<small>' + obsIds(E(fo)) + '</small>' : '') + '</div>'); return; }
      if (/^-\s+/.test(l)) { if (pis.length) fecha(); ul.push('<li>' + obsIds(E(l.replace(/^-\s+/, ''))) + '</li>'); return; }
      fecha(); var r = OBS_ROT_RE.exec(l);
      if (r) { h += '<div class="fx-obs-kv"><span>' + E(obsRot(r[1]) || r[1]) + '</span><p>' + (r[2] ? obsIds(E(r[2])) : '<em class="fx-dim">—</em>') + '</p></div>'; return; }
      h += '<p class="fx-obs-p">' + obsIds(E(l)) + '</p>';
    }); fecha();
    var np = sc.L.filter(function (l) { return PI_LINHA.test(l); }).length, cl = semAc(sc.t).replace(/[^a-z]+/g, '-');
    return '<section class="fx-obs-s s-' + cl + '">' + (sc.t ? '<h6>' + E(sc.t) + (np ? ' <em>· ' + np + '</em>' : '') + '</h6>' : '') + h + '</section>';
  }).join('') + '</div>';
}
function campo(c) {
  if (c.tipo === 'tabela') return campoTabela(c);
  var v = valorCampo(c), ed = ST.edit && editavel(c) && !bloqueado(c), id = c.secao ? c.secao + '.' + c.chave : '', sujo = id && Object.prototype.hasOwnProperty.call(ST.draft, id);
  var ic = !c.secao ? svg('lock', 'is-imp') : c.calculado || c.editavel === false ? svg('rule', 'is-calc') : '';
  var lab = '<span class="fx-lab" title="' + E((c.regra || '') + (c.secao ? (c.regra ? ' · ' : '') + c.secao + ' · ' + c.chave : ' · acervo')) + '">' + ic + E(c.rotulo) + (bloqueado(c) ? ' <em class="fx-dim">· só o gestor</em>' : '') + '</span>', body;
  if (ed) {
    var a = 'data-fx-k="' + E(id) + '" aria-label="' + E(c.rotulo) + '"';
    if (c.tipo === 'lista') { var O = c.opcoes || []; body = '<select ' + a + '><option value="">—</option>' + O.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + E(o) + '</option>'; }).join('') + (v && O.indexOf(v) < 0 ? '<option selected>' + E(v) + '</option>' : '') + '</select>'; }
    else if (c.tipo === 'simnao') body = '<label class="fx-tg"><input type="checkbox" ' + a + (sim(v) ? ' checked' : '') + '><span>' + (sim(v) ? 'Sim' : 'Não') + '</span></label>';
    else if (c.tipo === 'data' && (!v || iso(v))) body = '<input type="date" ' + a + ' value="' + E(iso(v)) + '">';
    else if (c.tipo === 'numero') body = '<input type="number" ' + a + ' value="' + E(v) + '">';
    else if (c.tipo === 'texto-longo') body = '<textarea rows="' + Math.min(c.chave === 'Observações' ? 12 : 6, Math.max(2, S(v).split('\n').length)) + '" ' + a + (c.chave === 'Observações' ? ' data-fx-postit' : '') + '>' + E(v) + '</textarea>' + (c.chave === 'Observações' ? '<small class="fx-pi-h">Cole o resumo do processo (Próximo ato, Prazos e alertas, O caso, Partes e andamento, Post-its…): o texto é padronizado ao colar e aparece formatado na leitura.</small>' : '');
    else body = '<input ' + a + ' value="' + E(v) + '">';
  } else if (c.calculado) body = v ? '<span class="fx-calc">' + E(v) + '</span>' : '<span class="fx-dim">—</span>';
  else if (c.tipo === 'simnao') body = '<span class="fx-v ' + (sim(v) ? '' : 'fx-dim') + '">' + (sim(v) ? 'Sim' : v ? E(v) : '—') + '</span>';
  else if (c.tipo === 'data') body = '<span class="fx-v fx-mono ' + (v ? '' : 'fx-dim') + '">' + E(brD(iso(v) || v) || '—') + '</span>';
  else if (c.tipo === 'texto-longo' && temFormato(v)) body = obsHtml(v);
  else body = '<span class="fx-v ' + (v ? '' : 'fx-dim') + (/ID\b/.test(c.rotulo) ? ' fx-mono' : '') + '">' + E(mostra(v) || '—') + '</span>';
  return '<div class="fx-f s' + span(c, v) + (ed ? ' is-edit' : '') + (sujo ? ' is-dirty' : '') + '">' + lab + body + '</div>';
}
var grade = function (campos) { return '<div class="fx-grid">' + campos.map(campo).join('') + '</div>'; };
function abaGrupos(A) {
  if (ST.v2 && (A.aba === CE || A.aba === 'Produção')) {
    /* Monitoramento: só os controles de acompanhamento. Pauta (ou, na monocrática, o caso e o controle da monocrática) vai para o fim da Produção */
    var mn = ((abaDe(CE) || {}).grupos || []).filter(function (g) { return g.controle === 'monocratica'; });
    if (A.aba === CE) return abaControles({ grupos: (A.grupos || []).filter(function (g) { return g.controle !== 'monocratica'; }) });
    var AP2 = abaDe(PAUTA), mono = destino() === 'monocratica';
    return abaGruposCorpo(A) + (mono ? '<h3 class="fx-sub">Monocrática</h3>' + fx2Mono() + abaControles({ grupos: mn }, true) : AP2 ? '<h3 class="fx-sub">Pauta</h3>' + abaGruposCorpo(AP2) : '');
  }
  if (A.aba === CE) { var AP = abaDe(PAUTA); return abaControles(A) + (AP ? '<h3 class="fx-sub">' + E(PAUTA) + '</h3>' + abaGruposCorpo(AP) : ''); }
  return abaGruposCorpo(A);
}
/* grupos de uma aba: na leitura, só os campos preenchidos; grupo sem nada vai para "Sem registro" (abre com um clique); na edição, tudo */
function abaGruposCorpo(A) {
  var dn = destino(), h = '', n = 0;
  if (A.destino && A.destino !== dn) return card('Não se aplica a este processo', '<p>' + (A.destino === 'sessao' ? 'O destino do julgamento é decisão monocrática: o processo não vai à pauta. A decisão fica em Produção › Decisão monocrática.' : 'Esta parte só vale para a decisão monocrática.') + '</p><p>Para mudar, use o destino no fim do fluxo, acima.</p>');
  if (A.seletor) h += '<p class="fx-info-p">' + svg('rule') + '<span><b>' + E(A.seletor.rotulo) + ':</b> ' + (dn === 'monocratica' ? 'decisão monocrática' : destinoDef() ? 'sessão (acórdão)' : 'a definir na triagem (o fluxo mostra o da sessão)') + '. ' + E(A.seletor.regra || '') + '</span></p>';
  if (A.aba === 'Triagem') h += cardDestino() + cardTempest();
  var gs = (A.grupos || []).filter(function (g) { return (!g.destino || g.destino === dn) && grupoVisivel(g) && !(ST.v2 && !ST.edit && FX2_SO_LADO.indexOf(g.grupo) >= 0); }), vazios = [];
  if (A.aba === 'Processo') gs = gs.map(function (g, i) { var k = PRI_PROC.indexOf(g.grupo); return [k < 0 ? 99 + i : k, g]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
  h += gs.map(function (g) {
    var cheios = (g.campos || []).filter(temValor), tudo = ST.edit || ST.vzTodos || ST.vz[g.grupo], nv = (g.campos || []).length - cheios.length;
    if (!tudo && !cheios.length) { vazios.push(g.grupo); return ''; }
    var ac = !ST.edit && !ST.vzTodos && nv ? '<button type="button" class="fx-pill fx-mini" data-fx-vz="' + E(g.grupo) + '">' + (ST.vz[g.grupo] ? 'esconder vazios' : '+ ' + nv + (nv > 1 ? ' campos vazios' : ' campo vazio')) + '</button>' : '';
    return card(g.grupo, grade(tudo ? g.campos : cheios), { n: ('0' + (++n)).slice(-2), nota: g.destino ? (g.destino === 'sessao' ? 'acórdão' : 'monocrática') : '', acoes: ac });
  }).join('');
  if (!ST.edit && vazios.length) h += card('Sem registro', '<div class="fx-acts">' + vazios.map(function (g) { return '<button type="button" class="fx-pill fx-mini" data-fx-vz="' + E(g) + '">' + E(g) + '</button>'; }).join('') + '</div><p class="fx-note">Grupos sem nenhum campo preenchido. Clique num deles para abrir; em Editar, todos os campos aparecem.</p>', { cls: 'fx-vazios', acoes: '<button type="button" class="fx-pill fx-mini" data-fx-vz="*">Mostrar todos os campos</button>' });
  else if (!ST.edit && ST.vzTodos) h += '<p class="fx-note fx-vz-off"><button type="button" class="fx-pill fx-mini" data-fx-vz="*">Esconder campos vazios</button></p>';
  if (A.aba === 'Pauta') { var SS = sessoes(); h += card('Histórico de sessões', SS.length ? '<div class="fx-tbl"><span>Sessão</span><span>Item · situação</span><span>Resultado</span>' + SS.map(function (s) { return '<span class="fx-mono">' + E(brD(iso(s.sessao || s.data)) || s.sessao) + '</span><span>' + E([s.item ? 'item ' + s.item : '', S(s.status).toLowerCase()].filter(Boolean).join(' · ') || '—') + '</span><span>' + E(s.resultado || s.motivo || '—') + '</span>'; }).join('') + '</div>' : '<p class="fx-dim">Sem passagens por pauta.</p>', { n: ('0' + (++n)).slice(-2), nota: 'inclusões, adiamentos e retiradas' }); }
  return h;
}
/* destino do julgamento confirmado na triagem: Sessão ou Monocrática (producao.Destino); a data e o autor ficam na triagem */
function cardDestino() {
  var d = destinoDef(), em = val('triagem', 'Destino - Confirmado em'), por = val('triagem', 'Destino - Confirmado por'), hip = val('triagem', 'Hipóteses Monocrática'), ro = ST.ad.leitura;
  var est = d ? '<b>' + (d === 'monocratica' ? 'Decisão monocrática' : 'Sessão (colegiado)') + '</b> <span class="fx-dim">· confirmado' + (iso(em) ? ' em ' + E(brD(iso(em))) : '') + (por ? ' por ' + E(por) : '') + '</span>' : '<b>A definir</b> <span class="fx-dim">· o processo segue na fila de triagem até a confirmação</span>';
  var bt = function (v, t, on) { return '<button type="button" class="fx-pill' + (on ? ' is-on' : '') + '" data-fx-confdest="' + v + '"' + (ro || on ? ' disabled' : '') + '>' + t + '</button>'; };
  var acoes = bt('Sessão', 'Confirmar sessão', d === 'sessao') + bt('Monocrática', 'Confirmar monocrática', d === 'monocratica') + (d ? '<button type="button" class="fx-pill fx-mini" data-fx-confdest=""' + (ro ? ' disabled' : '') + '>Desfazer</button>' : '');
  return card('Destino do julgamento', '<p>' + est + '</p>' + (hip && hip !== 'Não se aplica' ? '<p class="fx-note">Hipótese de monocrática anotada: ' + E(hip) + '</p>' : '') + (ST.v2 ? '<label class="fx2-dsel"><span>Destino</span>' + '<select class="fx-dest-sel" data-fx-destino' + (ST.ad.leitura ? ' disabled' : '') + ' aria-label="Destino do julgamento" title="Destino do julgamento: sessão (acórdão) ou decisão monocrática">' + [['', 'A definir'], ['Sessão|Pronto para julgar', 'Colegiado · pronto'], ['Sessão|Pendente', 'Colegiado · pendente'], ['Monocrática|Pronto para julgar', 'Monocrática · pronta'], ['Monocrática|Pendente', 'Monocrática · pendente'], ['Outro destino|', 'Outro destino']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === destSel() ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' + '</label>' : '<div class="fx-acts">' + acoes + '</div>'), { cls: 'fx-destino' + (d ? ' is-ok' : ' is-warn') });
}
/* tempestividade calculada pelo calendário forense do gabinete (padrao/calendario-forense.js) */
function cardTempest() {
  var Fr = window.CMTForense, t = function (k) { return val('triagem', k); }; if (!Fr) return '';
  var c = Fr.prazo({ publicacao: t('Tempest - Publicação'), protocolo: t('Tempest - Protocolo'), prazo: t('Tempest - Prazo legal'), dobro: t('Tempest - Dobro') === '2' || sim(t('Tempest - Dobro')) ? 2 : 1, suspensoes: t('Tempest - Suspensões') }, ST.d.expediente);
  var corpo = c.falta ? '<p>Informe a intimação ou publicação, o protocolo do recurso e o prazo (Triagem › Admissibilidade) para calcular.</p>' :
    '<div class="fx-g3"><div class="fx-f"><span class="fx-lab">Data-limite</span><span class="fx-calc">' + E(brD(c.limite)) + '</span></div><div class="fx-f"><span class="fx-lab">Prazo</span><span class="fx-v">' + c.total + ' dias úteis' + (c.dobro === 2 ? ' (em dobro)' : '') + '</span></div>' +
    '<div class="fx-f"><span class="fx-lab">Resultado</span><span class="fx-calc ' + (c.ok === false ? 'is-warn' : '') + '">' + (c.ok == null ? 'informe o protocolo' : c.ok ? '✓ Tempestivo' : '✕ Intempestivo') + (c.ok != null && t('Tempestividade') && (c.ok ? 'Tempestivo' : 'Intempestivo') !== t('Tempestividade') ? ' · difere do registrado (' + E(t('Tempestividade')) + ')' : '') + '</span></div></div>' +
    (c.pulados.length ? '<p class="fx-note">Dias não contados: ' + E(c.pulados.map(function (x) { return brD(x[0]) + ' (' + x[1] + ')'; }).join(' · ')) + '</p>' : '');
  return card('Tempestividade calculada', corpo + '<p class="fx-note">' + E(Fr.NOTA) + '</p>', { nota: 'calendário forense do gabinete' });
}
var CE_INC = { urgencia: ['Registrar urgência', null], monocratica: ['Registrar monocrática', ['producao.Destino', 'Monocrática']], sensivel: ['Incluir em casos sensíveis', ['controles.Sensível - Incluído', 'Sim']], meta: ['Incluir em meta', null], sobrestamento: ['Registrar sobrestamento', null] };
function infoCE(g) {
  var L = naLista(), x;
  if (g === 'meta' && (x = L.metas)) return ['Pelo acervo: ' + (x.metas || []).map(function (m) { return 'Meta ' + m; }).join(', '), x.fase].filter(Boolean).join(' · ');
  if (g === 'sobrestamento' && (x = L.sobrestados)) return ['Pelo acervo: ' + (x.motivoAuto || 'motivo não identificado'), (x.temasAuto || []).join(', ')].filter(Boolean).join(' · ');
  if (g === 'sensivel' && (x = L.sensiveis)) return 'Pelo acervo: ' + x.catAuto;
  if (g === 'urgencia' && (x = L.urgAuto)) return 'Etiqueta do PJe: ' + x;
  return '';
}
function abaControles(A, si) {
  var n = 0;
  return (si ? '' : '<p class="fx-info-p">' + svg('shield') + '<span>Grupos oficiais de acompanhamento. Cada um vale para o processo pela sua regra; os campos ficam no registro do processo (operacional) e são os mesmos das páginas de controle.</span></p>') +
    (A.grupos || []).map(function (g) {
      var id = g.controle, v = vale(id), ab = v || ST.mostra[id], inf = infoCE(id), inc = CE_INC[id];
      var chip = '<span class="fx-chip ' + (v ? 't-ok' : 't-neutro') + '" style="margin-left:6px">' + (v ? 'vale para este processo' : 'não se aplica') + '</span>';
      var acoes = (!ab && inc ? '<button type="button" class="fx-pill fx-mini" data-fx-inc="' + id + '">' + svg('plus') + E(inc[0]) + '</button>' : '') + (ST.ad.irPara ? '<button type="button" class="fx-pill fx-mini" data-fx-ir="' + id + '">Abrir a página ›</button>' : '');
      return card(g.grupo, (inf ? '<p class="fx-note">' + E(inf) + '</p>' : '') + (ab ? grade(g.campos) : '<p class="fx-dim">Regra: ' + E(g.inclusao || '') + '.</p>'), { n: ('0' + (++n)).slice(-2), cls: 'fx-ce ce-' + id + (v ? ' is-on' : ''), chip: chip, acoes: acoes });
    }).join('');
}
function abaResumo() {
  var FL = fluxo(), cur = FL.filter(function (s) { return s.atual; })[0], feitas = FL.filter(function (s) { return s.feito; }).length, f = fo(), P = pendencias(), mono = destino() === 'monocratica';
  var ss = sessoes()[0] || {}, sd = iso(ss.sessao || ss.data || val('pauta', 'Nova sessão de destino'));
  var defd = destinoDef(), destTxt = !defd ? 'A definir na triagem' : defd === 'outro' ? 'Outro destino' + (val('producao', 'Destino - Outro') ? ': ' + val('producao', 'Destino - Outro') : '') : (mono ? 'Decisão monocrática' : 'Sessão ' + (brD(sd) || 'a definir')) + (val('producao', 'Destino - Situação') ? ' · ' + val('producao', 'Destino - Situação').toLowerCase() : ''), destSub = mono ? (val('producao', 'Decisão - ID') ? 'ID ' + val('producao', 'Decisão - ID') : val('producao', 'Mono - Tipo de ato') || 'sem pauta') : [ss.item ? 'item ' + ss.item : 'sem item', val('pauta', 'Status de Julgamento').toLowerCase()].filter(Boolean).join(' · ');
  var top = '<div class="rs-top"><div class="rs-hero"><div class="rs-step"><span>Próximo passo</span><b>' + E(cur ? ACAO[cur.etapa] || cur.etapa : 'Concluído') + '</b><small>' + E(cur ? [cur.quem, cur.quando].filter(Boolean).join(' · ') : 'todas as etapas feitas') + '</small></div>' +
    '<div class="rs-arrow" aria-hidden="true">»</div><div class="rs-step rs-fim"><span>Destino final</span><b>' + E(destTxt) + '</b><small>' + E(destSub) + '</small></div><div class="rs-prog" title="' + feitas + ' de ' + FL.length + ' etapas"><i style="width:' + Math.round(feitas / FL.length * 100) + '%"></i></div></div>' +
    '<div class="rs-box rs-a3"><span><i class="rs-ic">' + svg('ficha') + '</i>Tarefa do PJe</span><b>' + E(S(f.tarefa_atual) || '—') + '</b><small>' + (iso(f.data_entrada_tarefa) ? 'desde ' + E(brD(iso(f.data_entrada_tarefa))) : 'data de entrada não informada') + '</small></div>' +
    '<div class="rs-box rs-a4"><span><i class="rs-ic">' + svg('rule') + '</i>Matéria</span><b>' + E(S(f.Assunto || f.Assunto_Principal) || '—') + '</b><small>' + E([val('triagem', 'Tipo de Julgamento'), val('triagem', 'META')].filter(Boolean).join(' · ') || 'sem tipo de julgamento') + '</small></div></div>';
  var pend = P.length ? '<div class="rs-pend">' + svg('warn') + '<b>' + P.length + (P.length > 1 ? ' pendências' : ' pendência') + '</b>' + P.map(function (p) { return '<button type="button" class="fx-pend" data-fx-tab="' + E(p[1]) + '"><span>' + E(p[0]) + '</span></button>'; }).join('<i>·</i>') + '</div>' : '<div class="rs-pend is-ok">' + svg('ok') + '<b>Sem pendências registradas</b></div>';
  var kv = function (L) { var ch = L.filter(function (x) { return S(x[1]); }), vz = L.filter(function (x) { return !S(x[1]); }); return '<div class="rs-tiles">' + ch.map(function (x) { return '<div class="rs-t ' + (x[2] || '') + '"><span>' + E(x[0]) + '</span><b>' + E(x[1]) + '</b></div>'; }).join('') + '</div>' + (vz.length ? '<p class="rs-empty">Sem registro: ' + E(vz.map(function (x) { return x[0]; }).join(' · ')) + '</p>' : ''); };
  var nv = function (v) { return !S(v) || N(v) === 'nao verificado'; }, t = function (k) { return val('triagem', k); }, p = function (k) { return val('producao', k); };
  var col = function (tit, aba, cls, corpo) { return '<section class="rs-col rs-c-' + cls + '"><h4><span class="rs-ic">' + svg(cls === 'tri' ? 'rule' : cls === 'pro' ? 'edit' : cls === 'ce' ? 'shield' : 'ficha') + '</span><span>' + E(tit) + '</span><button type="button" data-fx-tab="' + E(aba) + '" title="Abrir a aba">Abrir ›</button></h4>' + corpo + '</section>'; };
  var tri = kv([['Tempestividade', nv(t('Tempestividade')) ? 'Não verificado' : t('Tempestividade'), nv(t('Tempestividade')) ? 'is-warn' : ''], ['Preparo', nv(t('Preparo')) ? 'Não verificado' : t('Preparo'), nv(t('Preparo')) ? 'is-warn' : ''], ['Representação', nv(t('Representação')) ? 'Não verificado' : t('Representação'), nv(t('Representação')) ? 'is-warn' : ''],
    ['MPF', [t('MPF'), t('Parecer - Sentido')].filter(Boolean).join(' · ')], ['Mídias', t('Mídias')], ['AJG · DPU', [sim(t('AJG')) ? 'AJG' : '', sim(t('DPU (controle)')) ? 'DPU' : ''].filter(Boolean).join(' · ')], ['Tipo de julgamento', t('Tipo de Julgamento')], ['Complexidade', t('COMPLEXIDADE')]]);
  if (ST.v2) tri = '<div class="fx2-dsr' + (defd ? '' : ' is-warn') + '"><span>Destino do julgamento</span><b>' + E(destTxt) + '</b><button type="button" data-fx-tab="Triagem" title="Alterar na aba Triagem">Alterar ›</button></div>' + tri;
  var pro = kv(mono ? [['Servidor', p('SERVIDOR')], ['Minutado em', brD(iso(p('MINUTADO')))], ['Corretor', p('CORRETOR')], ['Revisado em', brD(iso(p('Data da Revisão')))], ['Tipo de ato', p('Mono - Tipo de ato')], ['Resultado', p('Voto - Resultado')], ['Enviada para assinatura', brD(iso(p('Data da Liberação')))], ['Assinada', sim(p('Assinado')) ? 'Sim' : '']]
    : [['Servidor', p('SERVIDOR')], ['Minutado em', brD(iso(p('MINUTADO')))], ['Corretor', p('CORRETOR')], ['Corrigido', sim(p('CORRIGIDO')) ? 'Sim' : brD(iso(p('Data da Revisão')))], ['Liberado', sim(p('LIBERADO')) ? 'Sim' : brD(iso(p('Data da Liberação')))], ['Resultado do voto', p('Voto - Resultado')], ['Tópico-síntese', p('Tópico-síntese')]]);
  var SS = sessoes(), pau = mono ? '<p class="rs-empty">Decisão monocrática: não vai à pauta.</p>' : kv([['Status', val('pauta', 'Status de Julgamento')], ['Sessão original', brD(iso(val('pauta', 'Sessão original')))], ['Sessão de destino', brD(iso(val('pauta', 'Nova sessão de destino')))], ['Seleção', val('pauta', 'JULGAMENTO')]]) +
    (SS.length ? '<ol class="rs-tl">' + SS.slice(0, 6).map(function (s) { return '<li><b class="fx-mono">' + E(brD(iso(s.sessao || s.data)) || s.sessao) + '</b> ' + E([s.item ? 'item ' + s.item : '', s.resultado || ''].filter(Boolean).join(' · ')) + '</li>'; }).join('') + '</ol>' : '');
  var A = ativos().filter(function (g) { return !ST.v2 || g !== 'monocratica'; }), ce = A.length ? '<div class="rs-tiles">' + A.map(function (g) {
    var v = g === 'urgencia' ? [t('Urgência'), t('Urgência - Apreciação')].filter(Boolean).join(' · ') : g === 'monocratica' ? p('Mono - Tipo de ato') || 'registrada' : g === 'meta' ? val('controles', 'Meta - Situação') || ((naLista().metas || {}).metas || []).map(function (m) { return 'Meta ' + m; }).join(', ') || t('META')
      : g === 'sobrestamento' ? [val('controles', 'Sobrestamento - Motivo') || (naLista().sobrestados || {}).motivoAuto, val('controles', 'Sobrestamento - Tema')].filter(Boolean).join(' · ') : val('controles', 'Sensível - Categoria') || (naLista().sensiveis || {}).catAuto;
    return '<div class="rs-t ' + (g === 'urgencia' && !/^Apreciada/.test(t('Urgência - Apreciação')) ? 'is-warn' : '') + '"><span>' + E({ urgencia: 'Urgência', monocratica: 'Monocrática', meta: 'Meta', sobrestamento: 'Sobrestamento', sensivel: 'Caso sensível' }[g]) + '</span><b>' + E(v || 'sim') + '</b></div>';
  }).join('') + '</div>' : '<p class="rs-empty">Nenhum controle especial vale para este processo.</p>';
  var pr = kv([['Partes', [S(f.polo_ativo || f.Polo_Ativo), S(f.polo_passivo || f.Polo_Passivo)].filter(Boolean).join(' × ')], ['Seção', S(f['Seção Competente'])], ['Distribuição', brD(iso(f['data_distribuição'] || f['Data_Distribuição']))], ['Última movimentação', [S(f.ultimo_movimento || f['Última_Movimentação']), brD(iso(f['Data Último Movimento'] || f['Data_Última_Movimentação']) || S(f['Data Último Movimento']))].filter(Boolean).join(' · ')], ['Sentença', [val('origem', 'Sentença - Decisão'), val('origem', 'Sentença - ID') ? 'ID ' + val('origem', 'Sentença - ID') : ''].filter(Boolean).join(' · ')], ['Responsável', val('origem', 'Responsável')], ['Próxima ação', val('origem', 'Próxima ação')]]);
  return top + (ST.v2 ? '' : pend) + (ST.v2 ? fx2Anot() : resumoObs()) + '<div class="rs-grid"><div class="rs-stack">' + col('Triagem', 'Triagem', 'tri', tri) + col(ST.v2 ? ROT_CE : CE, CE, 'ce', ce) + '</div><div class="rs-stack">' + (ST.v2 ? col('Processo', 'Processo', 'processo', pr + fx2RodProc(mono, pau, t)) : col(mono ? 'Pauta' : 'Pauta', 'Pauta', 'jul', pau) + col('Processo', 'Processo', 'processo', pr)) + (ST.v2 ? '' : '</div><div class="rs-stack">' + col('Produção · ' + (mono ? 'monocrática' : 'acórdão'), 'Produção', 'pro', pro)) + '</div></div>';
}

/* Observações no Resumo: o texto formatado à vista; "Colar resumo" abre o campo ali mesmo (colar já padroniza) e grava só ele */
function resumoObs() {
  var v = val('origem', 'Observações'), ro = ST.ad.leitura, ed = !ro && ST.obsEd;
  var acoes = ro ? '' : ed ? '' : '<button type="button" data-fx="obs-ed" title="Escrever ou colar o resumo do processo; ao colar, o texto já sai padronizado">' + (S(v) ? 'Editar' : 'Colar resumo') + ' ›</button>';
  var corpo = ed ? '<textarea class="rs-obs-ta" data-fx-obs data-fx-postit rows="' + Math.min(14, Math.max(6, S(ST.obsTx).split('\n').length + 1)) + '" aria-label="Observações" placeholder="Cole aqui o resumo do processo (Próximo ato, Prazos e alertas, Partes e andamento, Post-its…)">' + E(ST.obsTx) + '</textarea>' +
      '<small class="fx-pi-h">Ao colar, “## Seção”, “- item”, “Rótulo: valor” e “• Nota/Atenção/Pendência: texto — Peça · id N” já ficam no padrão.</small>' +
      '<div class="rs-obs-ac"><button type="button" class="fx-pill is-on" data-fx="obs-salvar"' + (ST.busy ? ' disabled' : '') + '>' + (ST.busy ? 'Gravando…' : 'Gravar observações') + '</button><button type="button" class="fx-pill" data-fx="obs-x">Cancelar</button></div>'
    : S(v) ? (temFormato(v) ? obsHtml(v) : '<p class="fx-obs-p" style="white-space:pre-wrap">' + E(v) + '</p>')
    : '<p class="rs-empty">Sem observações.' + (ro ? '' : ' Use “Colar resumo” para registrar o resumo do processo já formatado.') + '</p>';
  return '<section class="rs-col rs-c-obs rs-obs"><h4><span class="rs-ic">' + svg('edit') + '</span><span>Observações</span>' + acoes + '</h4>' + corpo + '</section>';
}

/* ───── ficha completa (leitura, impressão) ───── */
function docHTML() {
  var f = fo(), R = regras(), FL = fluxo(), dn = destino(), n = 0;
  var linha = function (c) { if (c.tipo === 'tabela') { var L = linhas(c.secao, c.chave); return L.length ? '<dt>' + E(c.rotulo) + '</dt><dd>' + L.map(function (l) { return E((c.colunas || []).map(function (k) { return S(l[k.chave]) ? k.rotulo + ': ' + S(l[k.chave]) : ''; }).filter(Boolean).join(' · ')); }).join('<br>') + '</dd>' : ''; } var v = valorCampo(c); if (c.tipo === 'simnao') v = sim(v) ? 'Sim' : v; if (c.tipo === 'data') v = brD(iso(v) || v); else v = mostra(v); return S(v) ? '<dt>' + E(c.rotulo) + '</dt><dd>' + E(v).replace(/\n/g, '<br>') + '</dd>' : ''; };
  var bloco = function (t, campos) { var h = campos.map(linha).join(''); return h ? '<div class="blk"><h3>' + E(t) + '</h3><dl>' + h + '</dl></div>' : ''; };
  var sec = function (t, corpo) { return corpo ? '<section><h2><span>' + ('0' + (++n)).slice(-2) + '</span>' + E(t) + '</h2>' + corpo + '</section>' : ''; };
  var partes = [S(f.polo_ativo || f.Polo_Ativo), S(f.polo_passivo || f.Polo_Passivo)].filter(Boolean).join(' × ');
  return '<article class="fx-paper"><header><span class="org">Gabinete CMT · Turma Regional de MS</span><h1>Ficha do processo</h1><div class="num">' + E(ST.cnj) + '</div>' +
    '<div class="ttl">' + E([S(f.classe_judicial || f.Classe), S(f.Assunto)].filter(Boolean).join(' · ')) + (partes ? '<br>' + E(partes) : '') + '</div><div class="selos">' + R.map(function (r) { return '<span class="t-' + r[2] + '">' + E(r[0]) + ' · ' + E(r[1]) + '</span>'; }).join('') + '</div></header>' +
    sec('Situação no gabinete', '<div class="blk"><h3>Fluxo · ' + (dn === 'monocratica' ? 'decisão monocrática' : 'sessão (acórdão)') + '</h3><dl>' + FL.map(function (s) { return '<dt>' + E(s.etapa) + '</dt><dd>' + (s.feito ? 'Feito' : s.atual ? 'Em curso' : 'Pendente') + (S([s.quem, s.quando].filter(Boolean).join(' · ')) ? ' · ' + E([s.quem, s.quando].filter(Boolean).join(' · ')) : '') + '</dd>'; }).join('') + '</dl></div>' +
      (pendencias().length ? '<div class="blk"><h3>Pendências</h3><dl>' + pendencias().map(function (p) { return '<dt>' + E(p[1]) + '</dt><dd class="is-warn">' + E(p[0]) + '</dd>'; }).join('') + '</dl></div>' : '')) +
    (F().abas || []).map(function (a) {
      if (a.destino && a.destino !== dn) return '';
      return sec(a.aba, a.grupos.filter(function (g) { return (!g.destino || g.destino === dn) && (!g.controle || vale(g.controle)) && grupoVisivel(g); }).map(function (g) { return bloco(g.grupo, g.campos); }).join(''));
    }).join('') +
    '<footer>Ficha gerada em ' + agora() + ' pelo Gabinete CMT, com os dados do acervo (procs-muta · fonte) e do registro do gabinete (operacional). Documento para uso interno do gabinete.</footer></article>';
}
function docView() {
  return '<section class="fx-dlg fx-docdlg" role="dialog" aria-modal="true" aria-label="Ficha completa de ' + E(ST.cnj) + '" tabindex="-1"><header class="fx-dochead"><button type="button" class="fx-pill" data-fx="doc-voltar">' + svg('back') + 'Voltar à ficha</button>' +
    '<span class="fx-tt"><span>Ficha completa</span><b>Gerada em ' + agora() + ' com todos os dados do processo</b></span><span class="fx-grow"></span>' +
    '<button type="button" class="fx-pill" data-fx="doc-copiar">' + svg('copy') + 'Copiar texto</button><button type="button" class="fx-pill" data-fx="doc-json">' + svg('json') + 'Exportar JSON</button>' +
    '<button type="button" class="fx-pill is-on" data-fx="doc-imprimir">' + svg('print') + 'Imprimir ou salvar PDF</button><button type="button" class="fx-sq fx-x" data-fx="fechar" aria-label="Fechar">' + svg('x') + '</button></header>' +
    '<div class="fx-docwrap">' + docHTML() + '</div></section>';
}
var PRINT_CSS = '@page{size:A4;margin:16mm 15mm}*{box-sizing:border-box}body{margin:0;font:10pt/1.45 Figtree,"Segoe UI",system-ui,sans-serif;color:#123440;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
  '.fx-paper header{display:flex;flex-direction:column;gap:5pt;padding-bottom:10pt;border-bottom:1.5pt solid #0f4a5c;margin-bottom:12pt}.org{font-size:7.5pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#4b6670}' +
  'h1{margin:0;font-size:17pt;font-weight:800}.num{font:600 13pt "JetBrains Mono",Consolas,monospace}.ttl{font-size:10pt}.selos{display:flex;flex-wrap:wrap;gap:4pt}.selos span{padding:1.5pt 7pt;border-radius:99pt;font-size:8pt;font-weight:700;background:#eef3f5;color:#1b4050}' +
  '.selos .t-ok{background:#e4f2ea;color:#23704f}.selos .t-ouro{background:#f8eed5;color:#7a5a14}.selos .t-ruim{background:#fbe9e6;color:#a8322a}.selos .t-warn{background:#fbefe2;color:#8f4d0e}' +
  'section{margin:0 0 12pt}h2{margin:0 0 5pt;font-size:11.5pt;font-weight:800;display:flex;gap:7pt;align-items:baseline;break-after:avoid}h2 span{font:600 9pt "JetBrains Mono",Consolas,monospace;color:#7a5a14}' +
  'h3{margin:6pt 0 2pt;font-size:7.5pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#4b6670;break-after:avoid}.blk{break-inside:avoid}' +
  'dl{margin:0;display:grid;grid-template-columns:44mm minmax(0,1fr);column-gap:10pt}dt,dd{padding:3pt 0;border-bottom:.5pt solid #e3eaed}dt{color:#4b6670;font-weight:600}dd{margin:0;overflow-wrap:anywhere}dd.is-warn{color:#a8322a}' +
  'footer{margin-top:10pt;padding-top:7pt;border-top:.5pt solid #d5e0e5;font-size:8pt;color:#4b6670}';
function imprimir() {
  var fr = doc.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'; doc.body.appendChild(fr);
  var d = fr.contentDocument; d.open(); d.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ficha ' + E(ST.cnj) + '</title><style>' + PRINT_CSS + '</style></head><body>' + docHTML() + '</body></html>'); d.close();
  setTimeout(function () { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { avisar('Não foi possível abrir a impressão.', 'err'); } setTimeout(function () { fr.remove(); }, 1500); }, 250);
}

/* ───── inteiro teor (.txt do PJe ou .md da TecJustiça): painel lateral, leitura por padrao/inteiro-teor.js ───── */
var TX = function () { return window.CMTInteiroTeor || {}; };
/* chave sugerida → campo da ficha (seção.chave), pelo modelo; campos do acervo (PJe) e sem lugar no modelo não são gravados */
function alvoDe(chave) {
  var achou = null; (F().abas || []).forEach(function (a) { a.grupos.forEach(function (g) { g.campos.forEach(function (c) { if (!achou && c.chave === chave && editavel(c)) achou = c; }); }); });
  return achou;
}
function valorPara(c, v) { v = S(v); if (c.mapa && c.mapa[v]) return c.mapa[v]; if (c.tipo === 'lista') { var o = (c.opcoes || []).filter(function (x) { return N(x) === N(v); })[0]; if (o) return o; } if (c.tipo === 'simnao') return /^(2|sim|s|true)$/i.test(v) ? 'Sim' : /^(1|n[aã]o)$/i.test(v) ? '' : v; if (c.tipo === 'data') return iso(v) || v; return v; }
function linhaAntiga() { var o = op(), r = Object.assign({ Processo: ST.cnj }, fo()); ['origem', 'triagem', 'producao', 'pauta', 'controles'].forEach(function (s) { Object.assign(r, o[s] || {}); }); delete r.sessoes; return r; }
function itensTeor(P) {
  var L = TX().buildSuggestions(P, linhaAntiga(), null) || [], out = [], contra = [], proc = [], TB = { rec: [], contra: [], proc: [], ocorr: [], docs: { rec: [], contra: [], proc: [], ocorr: [] } };
  L.forEach(function (it) {
    if (it.kind === 'contra') { if (it.key === 'ids') contra.push(it.value); (TB.contra[it.idx || 0] = TB.contra[it.idx || 0] || {})[it.key] = it.key === 'data' ? (iso(it.value) || it.value) : it.value; TB.docs.contra.push(it.doc); return; }
    if (it.kind === 'rec') { (TB.rec[it.idx || 0] = TB.rec[it.idx || 0] || {})[it.key] = it.key === 'data' ? (iso(it.value) || it.value) : it.value; TB.docs.rec.push(it.doc); return; }
    if (it.kind === 'proc') { proc.push(it); var q = it.proc || {}; TB.proc.push({ id: S(q.id) || S(it.doc), data: iso(q.data) || S(q.data), validade: S(q.validade), advogados: S(q.advogados) }); TB.docs.proc.push(it.doc); return; }
    if (it.kind === 'ocorr') { TB.ocorr.push({ tipo: S(it.value), ids: S(it.ids || it.doc), data: '' }); TB.docs.ocorr.push(it.doc); return; }
    var c = alvoDe(it.key);
    if (!c) { it.alvo = null; it.motivo = (fonteVal({ fonte: [it.key] }) || /^(Assunto|classe_judicial|Partes|Polo )/.test(it.key)) ? 'dado do acervo (PJe), só leitura' : 'sem campo na ficha'; it.apply = false; out.push(it); return; }
    it.alvo = c.secao + '.' + c.chave; it.campo = c; it.value = valorPara(c, it.value); var atual = gravado(c.secao, c.chave);
    it.current = atual; it.status = !S(atual) ? 'novo' : N(atual) === N(it.value) ? 'igual' : 'conflito'; it.apply = it.status === 'novo'; out.push(it);
  });
  /* contrarrazões e procuração: o que cabe nos campos da ficha */
  var c1 = alvoDe('Contrarrazões - Situação');
  if (contra.length && c1) { var a1 = gravado(c1.secao, c1.chave); out.push({ sec: 'Recursos e contrarrazões', key: c1.chave, label: 'Contrarrazões', value: 'apresentadas', doc: contra.join(', '), kind: 'field', alvo: c1.secao + '.' + c1.chave, campo: c1, current: a1, status: !a1 ? 'novo' : N(a1) === 'apresentadas' ? 'igual' : 'conflito', apply: !a1 }); }
  var c2 = alvoDe('ID da Procuração');
  if (proc.length && c2) { var pr = proc[proc.length - 1], a2 = gravado(c2.secao, c2.chave), v2 = S(pr.proc && pr.proc.id) || S(pr.doc); out.push({ sec: 'Representação', key: c2.chave, label: 'ID da procuração', value: v2, doc: pr.doc, kind: 'field', alvo: c2.secao + '.' + c2.chave, campo: c2, current: a2, status: !a2 ? 'novo' : N(a2) === N(v2) ? 'igual' : 'conflito', apply: !a2, note: pr.proc ? [pr.proc.data ? 'de ' + brD(iso(pr.proc.data) || pr.proc.data) : '', pr.proc.advogados].filter(Boolean).join(' · ') : '' }); }
  /* tabelas: recursos e contrarrazões por posição; procurações por ID; outras peças por IDs (o que já está na ficha é mantido) */
  var tab = function (chave, sec, rotulo, novas, porChave, docs) {
    var c = alvoDe(chave); novas = novas.filter(function (x) { return x && Object.keys(x).some(function (k) { return S(x[k]); }); }); if (!c || !novas.length) return;
    var atual = linhasGravadas(c.secao, c.chave), res = atual.map(function (x) { return Object.assign({}, x); });
    novas.forEach(function (n, i) { var k = porChave ? res.map(function (x) { return S(x[porChave]); }).indexOf(S(n[porChave])) : i; if (k < 0 || k >= res.length) res.push(n); else Object.keys(n).forEach(function (f) { if (S(n[f])) res[k][f] = n[f]; }); });
    var igual = JSON.stringify(atual) === JSON.stringify(res);
    out.push({ sec: sec, key: chave, label: rotulo, value: res, doc: docs.filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', '), kind: 'tabela', alvo: c.secao + '.' + c.chave, campo: c, current: atual,
      status: !atual.length ? 'novo' : igual ? 'igual' : 'conflito', apply: !atual.length, note: res.length + (res.length === 1 ? ' linha' : ' linhas') + (atual.length ? ' (hoje: ' + atual.length + ')' : '') });
  };
  tab('Recursos', 'Recursos e contrarrazões', 'Recursos', TB.rec, null, TB.docs.rec);
  tab('Contrarrazões', 'Recursos e contrarrazões', 'Contrarrazões (peças)', TB.contra, null, TB.docs.contra);
  tab('Procurações', 'Representação', 'Procurações', TB.proc, 'id', TB.docs.proc);
  tab('Outras peças', 'Outras peças e ocorrências', 'Outras peças', TB.ocorr, 'ids', TB.docs.ocorr);
  return out;
}
function descartarTeor() { if (ST.teor && ST.teor.parsed && ST.teor.parsed.docs) ST.teor.parsed.docs.forEach(function (d) { d.text = ''; }); ST.teor = null; }
function fecharTeor() { descartarTeor(); render(); }
/* inteiro teor extraído do PJe (acervo/autos/<CNJ>.json.gz, gravado pela extração dos autos): baixa como .json pela ponte da Ex Officio (sessão de nome e senha) */
function cnjFmt(v) { var d = dg(v); return d.length === 20 ? d.slice(0, 7) + '-' + d.slice(7, 9) + '.' + d.slice(9, 13) + '.' + d.slice(13, 14) + '.' + d.slice(14, 16) + '.' + d.slice(16) : S(v); }
function baixarTeorJson() {
  var c = cnjFmt(ST.cnj); if (dg(c).length !== 20) return avisar('Número do processo inválido para baixar o inteiro teor.', 'err');
  if (!window.DecompressionStream) return avisar('Este navegador não abre o arquivo compactado; use o Chrome atualizado.', 'err');
  avisar('Baixando o inteiro teor de ' + c + '…');
  var abre = function (buf) { var b = new Uint8Array(buf); return b.length > 2 && b[0] === 0x1f && b[1] === 0x8b ? new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer().then(abre) : buf; };
  fetch('/api/acesso?gh=1&p=' + encodeURIComponent('contents/acervo/autos/' + c + '.json.gz?ref=main'), { headers: { 'X-Ponte-Accept': 'application/vnd.github.raw+json' }, cache: 'no-store', credentials: 'same-origin' })
    .then(function (r) {
      if (r.status === 404) throw new Error('o inteiro teor deste processo ainda não foi extraído do PJe');
      if (r.status === 401) throw new Error('entre na Ex Officio (nome e senha) e tente de novo');
      if (r.status === 403) throw new Error('sem permissão para o acervo do gabinete');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    }).then(abre).then(function (buf) {
      var o = JSON.parse(new TextDecoder('utf-8').decode(buf)), a = document.createElement('a'), n = (String(o.texto || '').match(/===== ID /g) || []).length;
      a.href = URL.createObjectURL(new Blob([JSON.stringify(o, null, 1)], { type: 'application/json' })); a.download = c + '.json'; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      avisar('Inteiro teor baixado: ' + c + '.json' + (n ? ' · ' + n + ' peças com texto' : '') + (o.extraido_em ? ' · extraído em ' + brD(String(o.extraido_em).slice(0, 10)) : ''), 'ok');
    }).catch(function (e) { avisar('Não foi possível baixar o inteiro teor: ' + ((e && e.message) || e), 'err'); });
}
function lerTxt(file) {
  var T = TX(); if (!T.parseTxt) return;
  if (!/\.(txt|md|markdown)$/i.test(file.name) && file.type && !/^text\/(plain|markdown|x-markdown)$/.test(file.type)) { ST.teor = { step: 0, err: 'Envie o .txt do inteiro teor exportado pelo PJe ou o .md da extensão TecJustiça.' }; render(); return; }
  if (file.size > 25 * 1024 * 1024) { ST.teor = { step: 0, err: 'Arquivo muito grande para leitura no navegador (limite de 25 MB).' }; render(); return; }
  var rd = new FileReader();
  rd.onload = function () { var txt = String(rd.result || ''); try {
    var P = T.parseTxt(txt); txt = '';
    if (!P.docs.length) { ST.teor = { step: 0, err: 'Nenhum documento identificado no arquivo (esperado “Documento: ID - Tipo” no .txt ou “# ID - Tipo” no .md).' }; render(); return; }
    T.preselect(P); try { P.kind = T.especie(P); T.preselectKind(P); } catch (e) { console.warn('[ficha] inteiro teor · espécie', e); }
    ST.teor = { step: 1, parsed: P, file: file.name, items: null }; render();
  } catch (e) { ST.teor = { step: 0, err: 'Não foi possível ler o arquivo: ' + ((e && e.message) || e) }; render(); } };
  rd.onerror = function () { ST.teor = { step: 0, err: 'Falha na leitura do arquivo.' }; render(); };
  rd.readAsText(file, 'utf-8');
}
function teorPanel() {
  var D = ST.teor, P = D.parsed, T = TX(), steps = ['Arquivo', 'Documentos', 'Conferência'], body = '', foot = '';
  var head = '<header class="fx-teor-h"><div><span>Importar inteiro teor · ' + (P && P.formato === 'md' ? '.md da TecJustiça' : '.txt do PJe ou .md da TecJustiça') + '</span><h3>' + (P ? E(D.file) + ' · ' + P.docs.length + ' documentos' : 'Escolha o arquivo') + '</h3></div><button type="button" class="fx-sq" data-fx="teor-fechar" aria-label="Fechar importação" title="Fechar importação">' + svg('x') + '</button></header>' +
    '<ol class="fx-steps">' + steps.map(function (st, k) { return '<li class="' + (k < D.step ? 'is-done' : k === D.step ? 'is-cur' : '') + '">' + (k < D.step ? svg('ok') : '') + (k + 1) + ' · ' + st + '</li>'; }).join('') + '</ol>';
  if (D.step === 0) {
    body = '<label class="fx-drop"><input type="file" accept=".txt,.md,text/plain,text/markdown" data-fx-file>' + svg('txt') + '<b>Arraste o .txt do PJe ou o .md da TecJustiça para a ficha</b><span>ou clique para escolher o arquivo</span></label>' + (D.err ? '<p class="fx-alert-p">' + E(D.err) + '</p>' : '') +
      '<p class="fx-help">Cada peça (“Documento: ID - tipo” no .txt, “# ID - tipo” no .md) vira uma linha, com o destino sugerido pelo tipo. No .md, as linhas “- Juntado em/Juntado por/Assinado por/Situação” de cada peça e “- Classe/Assunto/Polo ativo/Polo passivo” do processo são aproveitadas quando vierem. Depois, os campos sugeridos são conferidos com os valores da ficha; só o que for marcado é gravado.</p>' +
      '<p class="fx-help">O arquivo é lido só no navegador e não é guardado; ficam os campos confirmados, e o commit registra os IDs dos documentos.</p>';
    foot = '<button type="button" class="fx-b" data-fx="teor-fechar">Cancelar</button>';
  } else if (D.step === 1) {
    var outro = P.main && dg(ST.cnj) !== P.main, TG = T.TARGETS || [['', 'Não usar']];
    body = (outro ? '<p class="fx-alert-p">' + svg('warn') + '<span>O arquivo é do processo <b>' + E(P.processo) + '</b>, diferente desta ficha (' + E(ST.cnj) + '). Confira antes de continuar.</span></p>' : '') +
      (P.kind && T.KIND_TXT ? '<p class="fx-info-p">' + E(T.KIND_TXT[P.kind] || '') + ': pré-seleção própria da espécie.</p>' : '') +
      (P.formato === 'md' && (P.semData || P.semTexto) ? '<p class="fx-info-p">.md da TecJustiça: ' + [P.semData ? (P.semData === P.docs.length ? 'sem data de juntada nas peças (a ordem segue o ID)' : P.semData + ' peça(s) sem data de juntada') : '', P.semTexto ? P.semTexto + ' página(s) digitalizada(s) sem texto — confira no PJe' : ''].filter(Boolean).join('; ') + '.</p>' : '') +
      '<p class="fx-help">O destino já vem sugerido pelo tipo e pode ser trocado. “Não usar” deixa o documento de fora.</p>' +
      P.docs.map(function (d, k) { return '<div class="fx-doc ' + (d.target ? 'is-on' : '') + ' ' + (d.outro ? 'is-ext' : '') + '"><div class="fx-doc-h"><span class="fx-mono">' + E(d.id) + '</span><b>' + E(d.tipo) + '</b><span class="fx-grow"></span><small>' + E(brD(d.date) || '—') + '</small></div>' +
        (d.descricao || d.por || d.outro ? '<small class="fx-doc-s">' + E([d.descricao, d.por, d.outro ? 'outro processo · ' + d.outro : '', d.empty ? 'sem texto' : ''].filter(Boolean).join(' · ')) + '</small>' : '') +
        '<label class="fx-dest"><span>Destino</span><select data-fx-dest="' + k + '">' + TG.map(function (t) { return '<option value="' + E(t[0]) + '"' + (S(d.target) === t[0] ? ' selected' : '') + '>' + E(t[1]) + '</option>'; }).join('') + '</select></label></div>'; }).join('');
    var n = P.docs.filter(function (d) { return d.target; }).length;
    foot = '<span class="fx-note">' + n + ' documento(s) selecionado(s)</span><button type="button" class="fx-b" data-fx="teor-fechar">Cancelar</button><button type="button" class="fx-b pri" data-fx="teor-extrair"' + (n ? '' : ' disabled') + '>Extrair e conferir →</button>';
  } else {
    var I = D.items || [], cnt = function (k) { return I.filter(function (i) { return i.alvo && i.status === k; }).length; }, marc = I.filter(function (i) { return i.apply && i.alvo && i.status !== 'igual'; }).length, G = {}, ordem = [];
    I.forEach(function (it, k) { if (!G[it.sec]) { G[it.sec] = []; ordem.push(it.sec); } G[it.sec].push([it, k]); });
    var sem = I.filter(function (i) { return !i.alvo; }).length;
    body = '<div class="fx-sum"><span class="fx-chip t-ok">' + cnt('novo') + ' novos</span><span class="fx-chip t-neutro">' + cnt('igual') + ' iguais</span><span class="fx-chip t-warn">' + cnt('conflito') + ' conflito' + (cnt('conflito') === 1 ? '' : 's') + '</span>' + (sem ? '<span class="fx-chip o-registro">' + sem + ' sem campo na ficha</span>' : '') + '</div>' +
      (I.length ? ordem.map(function (sec) { return '<section class="fx-csec"><h5>' + E(sec) + '</h5>' + G[sec].map(function (x) {
        var it = x[0], k = x[1], c = it.campo, opts = c && c.tipo === 'lista' ? (c.opcoes || []) : it.kind === 'select' && !c ? (it.options || []) : null, val;
        if (it.kind === 'tabela') val = '<span class="fx-v">' + it.value.map(function (l) { return E((c.colunas || []).map(function (k) { return S(l[k.chave]) ? k.rotulo + ': ' + S(l[k.chave]).slice(0, 120) : ''; }).filter(Boolean).join(' · ')); }).join('<br>') + '</span>';
        else if (!it.alvo) val = '<span class="fx-v">' + E(it.value) + '</span>';
        else if (opts) val = '<select data-fx-val="' + k + '">' + (opts.indexOf(it.value) < 0 ? ['', it.value].concat(opts) : [''].concat(opts)).filter(function (o, i, a) { return a.indexOf(o) === i; }).map(function (o) { return '<option' + (o === it.value ? ' selected' : '') + '>' + E(o) + '</option>'; }).join('') + '</select>';
        else if (c && c.tipo === 'simnao') val = '<select data-fx-val="' + k + '"><option value=""' + (it.value ? '' : ' selected') + '>—</option><option' + (it.value === 'Sim' ? ' selected' : '') + '>Sim</option></select>';
        else if (c && c.tipo === 'data') val = '<input type="date" data-fx-val="' + k + '" value="' + E(iso(it.value)) + '">';
        else if (it.kind === 'area' || (c && c.tipo === 'texto-longo') || S(it.value).length > 70) val = '<textarea rows="' + Math.min(5, Math.max(2, S(it.value).split('\n').length)) + '" data-fx-val="' + k + '">' + E(it.value) + '</textarea>';
        else val = '<input data-fx-val="' + k + '" value="' + E(it.value) + '">';
        var st = !it.alvo ? '<span class="fx-chip o-registro">' + E(it.motivo) + '</span>' : '<span class="fx-chip t-' + (it.status === 'novo' ? 'ok' : it.status === 'conflito' ? 'warn' : 'neutro') + '">' + E(it.status) + '</span>';
        return '<div class="fx-cf is-' + (it.alvo ? it.status : 'igual') + '"><label class="fx-cb"><input type="checkbox" data-fx-apply="' + k + '"' + (it.apply && it.alvo ? ' checked' : '') + (!it.alvo || it.status === 'igual' ? ' disabled' : '') + ' aria-label="Aplicar ' + E(it.label) + '"></label>' +
          '<div class="fx-cf-b"><div class="fx-cf-h"><b>' + E(it.label) + '</b>' + st + '<small class="fx-mono">ID ' + E(it.doc) + '</small></div>' + val +
          (it.alvo && it.status === 'conflito' && it.kind !== 'tabela' ? '<small class="fx-cur">Atual na ficha: ' + E(it.current) + '</small>' : '') + (it.note ? '<small class="fx-cur">' + E(it.note) + '</small>' : '') + '</div></div>';
      }).join('') + '</section>'; }).join('') : '<p class="fx-info-p">Nenhuma informação aproveitável foi identificada nos documentos selecionados.</p>') +
      (cnt('conflito') ? '<p class="fx-warn-p">Valores em conflito só substituem o que está na ficha se a caixa for marcada.</p>' : '');
    foot = '<button type="button" class="fx-b" data-fx="teor-voltar"' + (ST.busy ? ' disabled' : '') + '>← Documentos</button><button type="button" class="fx-b pri" data-fx="teor-gravar"' + (marc && !ST.busy ? '' : ' disabled') + '>' + (ST.busy ? 'Gravando…' : 'Gravar ' + marc + ' campo' + (marc === 1 ? '' : 's') + ' na ficha') + '</button>';
  }
  return '<aside class="fx-teor" aria-label="Importar inteiro teor">' + head + '<div class="fx-teor-b">' + body + '</div><footer class="fx-teor-f">' + foot + '</footer></aside>';
}
function gravarTeor() {
  var D = ST.teor; if (!D || !D.items) return;
  var C = {}, ids = [];
  D.items.forEach(function (i) { if (i.apply && i.alvo && i.status !== 'igual' && (i.kind === 'tabela' || S(i.value) !== S(i.current))) { C[i.alvo] = i.value; S(i.doc).split(/[,;\s]+/).forEach(function (x) { if (/^\d{5,}$/.test(x) && ids.indexOf(x) < 0) ids.push(x); }); } });
  if (!Object.keys(C).length) return;
  gravar(C, Object.keys(C).length + ' campo(s) gravado(s) a partir do inteiro teor' + (ids.length ? ' (IDs ' + ids.join(', ') + ')' : '') + '. O arquivo não foi guardado.').then(function (ok) { if (!ok) return; descartarTeor(); ST.tab = 'Triagem'; render(); });
}

/* ───── gravação ───── */
function gravar(campos, msgOk) {
  if (ST.busy || (ST.ad.leitura && !(ST.ad.teor && ST.teor))) return Promise.resolve(false);
  ST.busy = true; render();
  return Promise.resolve().then(function () { return ST.ad.gravar(ST.cnj, campos); }).then(function (j) {
    j = j || {}; if (j.operacional) ST.d.operacional = j.operacional;
    Object.keys(campos).forEach(function (k) { delete ST.draft[k]; });
    var rec = (j.recusados || []); avisar(rec.length ? 'Gravado, exceto (sem permissão): ' + rec.join(', ') : msgOk || 'Ficha gravada.', rec.length ? 'warn' : 'ok');
    try { doc.dispatchEvent(new CustomEvent('cmt:ficha-gravada', { detail: { cnj: ST.cnj, campos: campos } })); } catch (e) {}
  }).catch(function (e) { avisar('Não gravou: ' + ((e && e.message) || e), 'err'); throw e; })
    .then(function () { ST.busy = false; if (!Object.keys(ST.draft).length) ST.edit = false; render(); return true; }, function () { ST.busy = false; render(); return false; });
}
function onClick(ev) {
  if (ev.target === host) return; /* clique fora não fecha (evita perder a edição) */
  var t = ev.target.closest('[data-fx],[data-fx-tab],[data-fx-vz],[data-fx-inc],[data-fx-ir],[data-fx-tba],[data-fx-tbx],[data-fx-confdest]'); if (!t) return;
  if (t.hasAttribute('data-fx-confdest')) { var dv = t.getAttribute('data-fx-confdest'); if (ST.edit) { ST.draft['producao.Destino'] = dv; render(); } else gravar({ 'producao.Destino': dv }, dv === 'Monocrática' ? 'Destino confirmado: decisão monocrática.' : dv === 'Sessão' ? 'Destino confirmado: sessão.' : 'Destino desfeito: volta a definir na triagem.').catch(function () {}); return; }
  if (t.hasAttribute('data-fx-vz')) { var gz = t.getAttribute('data-fx-vz'); if (gz === '*') ST.vzTodos = !ST.vzTodos; else ST.vz[gz] = !ST.vz[gz]; render(); return; }
  if (t.hasAttribute('data-fx-tab')) { ST.tab = tabNorm(t.getAttribute('data-fx-tab')); render(); var m = host.querySelector('.fx-main'); if (m) m.scrollTop = 0; return; }
  if (t.hasAttribute('data-fx-inc')) { var g = t.getAttribute('data-fx-inc'), x = CE_INC[g][1]; ST.mostra[g] = true; ST.edit = true; if (x) ST.draft[x[0]] = x[1]; render(); return; }
  if (t.hasAttribute('data-fx-ir')) { var c = t.getAttribute('data-fx-ir'); fechar(); if (!host.classList.contains('on') && ST.ad.irPara) ST.ad.irPara(c); return; }
  var a = t.getAttribute('data-fx');
  if (a === 'fechar') return fechar();
  if (a === 'ant') return passo(-1);
  if (a === 'prox') return passo(1);
  if (a === 'copiar-num') { if (navigator.clipboard) navigator.clipboard.writeText(ST.cnj).then(function () { avisar('Número copiado.', 'ok'); }, function () {}); return; }
  if (a === 'editar' && ST.ad.leitura) return;
  if (a === 'editar') { if (ST.edit && Object.keys(ST.draft).length && !window.confirm('Descartar as alterações não salvas?')) return; ST.edit = !ST.edit; ST.draft = {}; if (ST.edit && ST.tab === 'resumo') ST.tab = 'Triagem'; render(); return; }
  if (a === 'descartar') { ST.draft = {}; ST.edit = false; ST.mostra = {}; render(); return; }
  if (a === 'salvar') { var K = Object.keys(ST.draft); if (!K.length) { ST.edit = false; render(); return; } var C = {}; K.forEach(function (k) { C[k] = ST.draft[k]; }); gravar(C, K.length + ' campo(s) da ficha gravado(s).').catch(function () {}); return; }
  if (t.hasAttribute('data-fx-tba') || t.hasAttribute('data-fx-tbx')) {
    var id = t.getAttribute('data-fx-tba') || t.getAttribute('data-fx-tbx'), i = id.indexOf('.'), L = linhas(id.slice(0, i), id.slice(i + 1)).map(function (x) { return Object.assign({}, x); });
    if (t.hasAttribute('data-fx-tba')) L.push({}); else L.splice(+t.getAttribute('data-fx-i'), 1);
    ST.draft[id] = L; render(); return;
  }
  if (a === 'obs-ed') { if (ST.ad.leitura) return; ST.obsEd = true; ST.obsTx = val('origem', 'Observações'); render(); var ta = host.querySelector('[data-fx-obs]'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } return; }
  if (a === 'obs-x') { ST.obsEd = false; ST.obsTx = ''; render(); return; }
  if (a === 'obs-salvar') { var ot = host.querySelector('[data-fx-obs]'), ov = ot ? ot.value.replace(/\s+$/, '') : ST.obsTx; ST.obsTx = ov;
    if (S(ov) === S(val('origem', 'Observações'))) { ST.obsEd = false; render(); return; }
    gravar({ 'origem.Observações': ov }, 'Observações gravadas.').then(function (ok) { if (ok) { ST.obsEd = false; ST.obsTx = ''; render(); } }).catch(function () {}); return; }
  if (a === 'teor') { if (ST.teor) fecharTeor(); else { ST.teor = { step: 0 }; render(); } return; }
  if (a === 'teor-fechar') return fecharTeor();
  if (a === 'teor-json') return baixarTeorJson();
  if (a === 'teor-voltar') { ST.teor.step = 1; render(); return; }
  if (a === 'teor-extrair') { try { ST.teor.items = itensTeor(ST.teor.parsed); ST.teor.step = 2; } catch (e) { console.error('[ficha] inteiro teor · sugestões', e); avisar('Não foi possível extrair os campos: ' + ((e && e.message) || e), 'err'); } render(); return; }
  if (a === 'teor-gravar') return gravarTeor();
  if (a === 'doc') { ST.view = 'doc'; render(); return; }
  if (a === 'doc-voltar') { ST.view = 'ficha'; render(); return; }
  if (a === 'doc-imprimir') return imprimir();
  if (a === 'doc-copiar') { var tx = (host.querySelector('.fx-paper') || {}).innerText || ''; if (navigator.clipboard) navigator.clipboard.writeText(tx).then(function () { avisar('Texto da ficha copiado.', 'ok'); }, function () {}); return; }
  if (a === 'doc-json') { var b = new Blob([JSON.stringify({ processo: ST.cnj, operacional: op(), fonte: fo() }, null, 2)], { type: 'application/json;charset=utf-8' }), u = URL.createObjectURL(b), l = doc.createElement('a'); l.href = u; l.download = 'Ficha_' + dg(ST.cnj) + '.json'; doc.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 3000); return; }
}
function onChange(ev) {
  var t = ev.target;
  if (t.hasAttribute('data-fx-destino')) { if (t.value === destSel()) return; var dp = t.value.split('|'), dm = { 'producao.Destino': dp[0] || '', 'producao.Destino - Situação': dp[1] || '' }; if (ST.edit) { Object.assign(ST.draft, dm); render(); } else gravar(dm, dp[0] === 'Monocrática' ? 'Destino: decisão monocrática' + (dp[1] ? ' · ' + dp[1].toLowerCase() : '') + '.' : dp[0] === 'Sessão' ? 'Destino: colegiado' + (dp[1] ? ' · ' + dp[1].toLowerCase() : '') + '.' : dp[0] ? 'Destino: outro destino.' : 'Destino a definir na triagem.').catch(function () {}); return; }
  if (t.hasAttribute('data-fx-file')) { var f = t.files && t.files[0]; if (f) lerTxt(f); t.value = ''; return; }
  if (t.hasAttribute('data-fx-dest')) { ST.teor.parsed.docs[+t.getAttribute('data-fx-dest')].target = t.value; render(); return; }
  if (t.hasAttribute('data-fx-apply')) { ST.teor.items[+t.getAttribute('data-fx-apply')].apply = t.checked; render(); return; }
  if (t.hasAttribute('data-fx-val')) { onInput(ev); return; }
  if (t.hasAttribute('data-fx-k')) { onInput(ev); if (t.type === 'checkbox' || t.tagName === 'SELECT') render(); }
}
function onPastePostit(ev) {
  var t = ev.target; if (!t || !t.hasAttribute || !t.hasAttribute('data-fx-postit')) return;
  var txt = ev.clipboardData && ev.clipboardData.getData('text/plain'), n = txt && obsNormaliza(txt); if (!n) return;
  ev.preventDefault(); var a = t.selectionStart, b = t.selectionEnd, antes = t.value.slice(0, a), ins = (antes && !/\n$/.test(antes) ? '\n' : '') + n;
  t.setRangeText(ins, a, b, 'end'); t.rows = Math.min(12, Math.max(2, t.value.split('\n').length)); t.dispatchEvent(new Event('input', { bubbles: true }));
}
function onInput(ev) {
  var t = ev.target; if (!t.hasAttribute) return;
  if (t.hasAttribute('data-fx-obs')) { ST.obsTx = t.value; return; }
  if (t.hasAttribute('data-fx-val')) { var it = ST.teor && ST.teor.items && ST.teor.items[+t.getAttribute('data-fx-val')]; if (it) { it.value = t.value; it.status = !S(it.current) ? 'novo' : N(it.current) === N(it.value) ? 'igual' : 'conflito'; } return; }
  if (t.hasAttribute('data-fx-tb')) { var tid = t.getAttribute('data-fx-tb'), ti = tid.indexOf('.'), TL = linhas(tid.slice(0, ti), tid.slice(ti + 1)).map(function (x) { return Object.assign({}, x); }), li = +t.getAttribute('data-fx-i');
    TL[li] = TL[li] || {}; TL[li][t.getAttribute('data-fx-c')] = t.value; ST.draft[tid] = TL; var fb = t.closest('.fx-f'); if (fb) fb.classList.add('is-dirty');
    var sb = host.querySelector('[data-fx="salvar"]'); if (sb && !ST.busy) sb.textContent = 'Salvar alterações (' + Object.keys(ST.draft).length + ')'; return; }
  if (!t.hasAttribute('data-fx-k')) return;
  var k = t.getAttribute('data-fx-k'), i = k.indexOf('.'), v = t.type === 'checkbox' ? (t.checked ? 'Sim' : '') : t.value, orig = gravado(k.slice(0, i), k.slice(i + 1));
  if (S(v) === S(orig) || (t.type === 'date' && iso(orig) === v)) delete ST.draft[k]; else ST.draft[k] = v;
  var fx = t.closest('.fx-f'); if (fx) fx.classList.toggle('is-dirty', Object.prototype.hasOwnProperty.call(ST.draft, k));
  var b = host.querySelector('[data-fx="salvar"]'); if (b && !ST.busy) { var n = Object.keys(ST.draft).length; b.textContent = 'Salvar alterações' + (n ? ' (' + n + ')' : ''); }
}

/* regras de gravação dos Controles especiais, iguais às do servidor (api/_ficha.js · aplica e regras): para quem grava direto na base (Ab Initio) */
function aplicar(r, campos, usuario) {
  var out = [], hj = hoje();
  ['origem', 'triagem', 'producao', 'pauta', 'controles'].forEach(function (s) { if (!r[s] || typeof r[s] !== 'object') r[s] = s === 'pauta' ? { sessoes: [] } : {}; });
  Object.keys(campos).forEach(function (k) { var i = k.indexOf('.'), s = k.slice(0, i), c = k.slice(i + 1), raw = campos[k], v = Array.isArray(raw) ? raw : S(raw); if (!r[s]) return;
    var antes = r[s][c], mudou = Array.isArray(v) || (antes && typeof antes === 'object') ? JSON.stringify(antes || []) !== JSON.stringify(v || []) : S(antes) !== v; if (mudou) { r[s][c] = v; out.push(k); } });
  if (!out.length) return out;
  var t = r.triagem, p = r.producao, c = r.controles, has = function (k) { return out.indexOf(k) >= 0; };
  if (has('producao.Destino') && p.Destino === 'Monocrática' && !c['Monocrática - Registrada em']) { c['Monocrática - Registrada em'] = hj; out.push('controles.Monocrática - Registrada em'); }
  /* destino confirmado (Sessão ou Monocrática): data e autor da confirmação; vazio volta a "a definir na triagem" */
  if (has('producao.Destino')) { var cf = p.Destino === 'Sessão' || p.Destino === 'Monocrática'; t['Destino - Confirmado em'] = cf ? hj : ''; t['Destino - Confirmado por'] = cf ? (usuario || '') : ''; out.push('triagem.Destino - Confirmado em', 'triagem.Destino - Confirmado por'); }
  if (has('triagem.Urgência') && t['Urgência']) { if (!t['Urgência - Data']) { t['Urgência - Data'] = hj; out.push('triagem.Urgência - Data'); } if (!t['Urgência - Apreciação']) { t['Urgência - Apreciação'] = 'Pendente · não apreciada'; out.push('triagem.Urgência - Apreciação'); } }
  var G = {}; out.forEach(function (k) { var m = /^controles\.(Monocrática|Meta|Sobrestamento|Sensível) - /.exec(k); if (m) G[m[1]] = 1; }); if (has('producao.Destino')) G['Monocrática'] = 1;
  if (usuario) Object.keys(G).forEach(function (g) { c[g + ' - Atualizado por'] = usuario; c[g + ' - Atualizado em'] = hj; });
  r.origem.atualizado_em = new Date().toISOString();
  return out;
}

window.CMTFicha = { versao: 1, abrir: abrir, fechar: function () { fechar(true); }, aberta: function () { return !!(host && host.classList.contains('on')); }, controlesDe: controlesDe, aplicar: aplicar, numerosMeta: numerosMeta };
})();

