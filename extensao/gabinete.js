/* Muta · Ficha do gabinete (Ex Officio) no painel
   A mesma ficha única do processo que a Ex Officio e o Ab Initio usam (padrao/ficha.json → acervo/operacional.json):
     GET  /api/pauta?ficha=<CNJ>              ficha (modelo), registro do operacional, dados da fonte, controles, gestor
     POST /api/pauta?ficha=1 {cnj, campos}    grava; o servidor recusa o que não é editável ou é só do gestor
   Renderização no padrão do prontuário lateral da Ex Officio (abas, grupos, gravação automática).
   A correspondência prontuário ↔ ficha (MAPA) é usada pela sincronia automática (sincronia.js): o prontuário completo
   vai ao GitHub com os campos correspondentes da ficha, e a ficha preenche o prontuário ao abrir o processo. */
(function () {
'use strict';
var SITE = Muta.SITE, ses = window.MutaSessao, br = window.MutaProntuarioBridge;
var $ = function (id) { return document.getElementById(id); };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function S(v) { return String(v == null ? '' : v).trim(); }
/* texto sem acento e em minúsculas, para comparar */
function N(v) { return S(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function dg(v) { return String(v || '').replace(/\D/g, ''); }
function brD(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] : S(v); }

var ABAS = ['Processo', 'Triagem', 'Produção', 'Controles especiais', 'Pauta'], CE = 'Controles especiais';
var G = { cnj: '', F: null, op: null, fo: null, gestor: false, ctl: {}, aba: 'Processo', qVazia: false, dest: null, pend: {}, pendCnj: '', t: null, carregando: false, erro: '', mostra: {}, tok: 0 };
var MODO_K = 'muta-pje:modo';
var FILA_FICHA=Object.create(null), RASCUNHO_FICHA='hero-ficha-pendente:v1:';
var caixa = $('gab'), stEl = null;

/* ---------- prontuário único (0.11): a ficha do processo; o prontuário completo antigo segue só na sincronia ---------- */
var modo = 'ficha';
function aplicarModo() {
  document.body.dataset.pmodo = modo;
  document.querySelectorAll('#pmodo button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.m === modo)); });
  if (modo === 'ficha') carregar(false);
}
document.querySelectorAll('#pmodo button').forEach(function (b) {
  b.addEventListener('click', function () { modo = b.dataset.m; try { localStorage.setItem(MODO_K, modo); } catch (e) {} aplicarModo(); });
});

/* ---------- leitura ---------- */
function cnjAtual() { var k = br.chaveAtual(); return k && k !== 'avulso' ? Muta.formatarCnj(k) : ''; }
function carregar(forcar) {
  if (modo !== 'ficha') return;
  var s = ses.estado();
  if (s.estado !== 'on') { G.tok++;G.cnj='';G.F=null;G.op=null;G.fo=null;G.pend={};G.saveKey='';G.carregando=false;render();return; }
  var cnj = cnjAtual(),key=chaveFila(s.usuario,cnj);
  if(!cnj){if(G.saveKey)gravarJa().catch(function(){});G.tok++;G.cnj='';G.F=null;G.op=null;G.fo=null;G.pend={};G.saveKey='';G.carregando=false;render();return;}
  if (!forcar && cnj === G.cnj && G.saveKey===key && (G.F || G.carregando)) { render(); return; }
  if (G.saveKey && G.saveKey!==key) gravarJa().catch(function () {});
  var fila=obterFila(s.usuario,cnj),rev=fila.rev;G.saveKey=key;G.pend=fila.campos;
  if(heroV53()&&G.cnj!==cnj){G.aba='Processo';G.rot='res';} G.cnj = cnj; G.F = null; G.op = null; G.fo = null; G.erro = ''; G.dest = null; G.mostra = {}; G.qVazia = false; G.carregando = true;
  var tok = ++G.tok;
  render();
  ses.api('/api/pauta?ficha=' + encodeURIComponent(cnj)).then(function (j) {
    if (tok !== G.tok) return;
    G.F = j.ficha; G.op = fila.rev!==rev&&fila.op ? fila.op : j.operacional; G.fo = j.fonte; G.equipe = j.equipe || []; G.desembargador=!!j.desembargador; G.gestor = !!j.gestor; G.ctl = j.controles || {};
    G.carregando = false; render(); recuperarFila(fila);if(Object.keys(fila.campos).length){estadoFila(fila);programarFila(fila,900);}else st(j.operacional ? '' : 'Sem ficha no Ex Officio ainda: ela é criada na primeira gravação.');
  }).catch(function (e) {
    if (tok !== G.tok) return;
    G.carregando = false; G.erro = e.status === 401 ? '' : e.message; render();
  });
}

/* ---------- valores ---------- */
function gravado(sec, k) { var r = G.op || {}, t=r[sec]||{}, v=t[k]; if(sec==='triagem'&&k==='Detalhamento do caso'&&v==null)v=[t.Tema,t.Especificidades].map(S).filter(Boolean).filter(function(x,i,a){return a.indexOf(x)===i;}).join('\n'); return v == null ? '' : v; }
function V(sec, k) { var id = sec + '.' + k; return id in G.pend ? G.pend[id] : gravado(sec, k); }
function fonteVal(c) { var f = G.fo || {}, L = c.fonte || [];
  if (L.length === 2 && f[L[0]] && typeof f[L[0]] === 'object') { var x = f[L[0]][L[1]]; return x == null ? '' : S(x); }
  for (var i = 0; i < L.length; i++) { var v = f[L[i]]; if (v != null && S(v) !== '' && typeof v !== 'object') return S(v); } return ''; }
/* O cadastro do PJe (mesmo CNJ) tem precedência sobre a fonte importada; nunca confundir assunto CNJ com detalhamento editorial. */
function autuacaoAtual(){var p=window.MutaPje,a=p&&p.autuacao?p.autuacao():{};return a&&a.numero&&Muta.chaveProcesso(a.numero)===Muta.chaveProcesso(G.cnj)?a:{};}
function textoTaxonomia(x){
 if(x==null)return '';if(Array.isArray(x)){var principal=x.find(function(v){return v&&typeof v==='object'&&(v.principal===true||v.principal==='Sim');});return textoTaxonomia(principal||x[0]);}
 if(typeof x==='object'){var nome=x.nome||x.descricao||x.description||x.label||x.titulo||x.assunto||x.name||'';return nome?S(nome)+(x.codigo&&!/\(\d+\)$/.test(S(nome))?' ('+x.codigo+')':''):'';}
 var v=S(x);return /^(?:[-—?]+|não informado|nao informado|a definir|null|undefined)$/i.test(v)?'':v;
}
function assuntoCNJ(){
 var a=autuacaoAtual(),f=G.fo||{},L=['Assunto CNJ','Assunto','assunto','assunto_judicial','assuntoJudicial','Assunto_Principal','assunto_principal','assuntoPrincipal','assuntos','Assuntos','DataJud · Assunto'];
 if(textoTaxonomia(a.assunto))return textoTaxonomia(a.assunto);
 var m=grupoModelo('Autuação'),cs=(m&&m.campos||[]).filter(function(c){return c.rotulo==='Assunto CNJ';});
 for(var i=0;i<cs.length;i++){var x=textoTaxonomia(cs[i].secao?V(cs[i].secao,cs[i].chave):fonteVal(cs[i]));if(x)return x;}
 for(var j=0;j<L.length;j++){var v=textoTaxonomia(f[L[j]]);if(v)return v;}
 var d=f.datajud||f.DataJud||{};return textoTaxonomia(d.assuntos||d.assunto);
}
function classeAutuacao(){var a=autuacaoAtual();if(a.classe)return S(a.classe);var f=G.fo||{},L=['classe_judicial','Classe','classe','DataJud · Classe'];for(var i=0;i<L.length;i++){var v=textoTaxonomia(f[L[i]]);if(v)return v;}return pjeDoProcesso()?S(window.MutaPje.classe()):'';}
function editavel(c) { return !(window.MUTA_WEB&&window.MUTA_WEB.leitura) && !!c.secao && c.editavel !== false && !c.calculado; }
function destGrav() { return S(V('producao', 'Destino')); }
function destino() { if (G.dest) return G.dest; return destGrav() === 'Monocrática' ? 'monocratica' : 'sessao'; }
function naLista() { return (G.ctl || {}).naLista || {}; }
function vale(g) {
  var N = naLista();
  if (g === 'urgencia') return !!V('triagem', 'Urgência');
  if (g === 'monocratica') return V('producao', 'Destino') === 'Monocrática';
  if (g === 'meta') return !!(N.metas || G.ctl.meta);
  if (g === 'sobrestamento') return !!(N.sobrestados || G.ctl.sobrestamento);
  if (g === 'sensivel') return V('controles', 'Sensível - Excluído') !== 'Sim' && (!!N.sensiveis || V('controles', 'Sensível - Incluído') === 'Sim');
  return false;
}
var ORD_CE = ['urgencia', 'monocratica', 'meta', 'sobrestamento', 'sensivel'];
var ROT_CE = { urgencia: 'Urgência', monocratica: 'Monocrática', meta: 'Meta', sobrestamento: 'Sobrestado', sensivel: 'Caso sensível' };
var INC = { urgencia: ['Registrar urgência', null], monocratica: ['Registrar monocrática', ['producao.Destino', 'Monocrática']], sensivel: ['Incluir em casos sensíveis', ['controles.Sensível - Incluído', 'Sim']], meta: ['Incluir em meta', null], sobrestamento: ['Registrar sobrestamento', null] };
function grupoVisivel(g) {
  if (!g.quando) return true;
  var q = g.quando.campo, i = q.indexOf('.');
  if(g.quando.campo==='triagem.Tipo de Julgamento'||g.quando.campo==='triagem.Padrão - Espécie'){var raw=V('triagem','Tipo de Julgamento');if(!raw)raw=V('triagem','Padrão - Espécie');var aliases={ed:'Embargos de declaração',interno:'Agravo interno',agint:'Agravo interno',retratacao:'Juízo de retratação'};if(String(raw||'').split(/\s*(?:\+|;|,|·)\s*/).map(function(x){return aliases[x.toLowerCase()]||x;}).indexOf(g.quando.valor)>=0)return true;}else if (V(q.slice(0, i), q.slice(i + 1)) === g.quando.valor) return true;
  return g.campos.some(function (c) { var v = c.secao ? gravado(c.secao, c.chave) : ''; return Array.isArray(v) ? v.length : !!S(v); });
}

/* ---------- campos ---------- */
function tabela(c, v) {
  var L = Array.isArray(v) ? v : [], cols = c.colunas || [];
  if (!L.length) return '<span class="ro">—</span>';
  /* lista compacta: as duas primeiras colunas preenchidas em destaque, o resto embaixo */
  return '<ul class="tb-l">' + L.map(function (l) { l = l || {}; var vs = cols.map(function (x) { return [x.rotulo || x.chave, S(l[x.chave])]; }).filter(function (p) { return p[1]; });
    var cab = vs.slice(0, 2).map(function (p) { return /^\d{4}-\d{2}-\d{2}$/.test(p[1]) ? brD(p[1]) : p[1]; }), resto = vs.slice(2);
    return '<li><b>' + esc(cab.join(' · ')) + '</b>' + (resto.length ? '<small>' + resto.map(function (p) { return '<span title="' + esc(p[0]) + '">' + esc(/^\d{4}-\d{2}-\d{2}$/.test(p[1]) ? brD(p[1]) : p[1].slice(0, 220)) + '</span>'; }).join(' · ') + '</small>' : '') + '</li>'; }).join('') + '</ul>';
  return '<div class="gt-tab"><table><thead><tr>' + cols.map(function (x) { return '<th>' + esc(x.rotulo || x.chave) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    L.map(function (l) { return '<tr>' + cols.map(function (x) { return '<td>' + esc((l || {})[x.chave] || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
}
var DICA = { 'Tempestividade': 'Prazo em dias úteis (artigo 219 do CPC), em dobro para a Fazenda (artigo 183)', 'Preparo': 'Pix ou cartão só com o comprovante do Tesouro; sem preparo, intimar para recolher em dobro antes da deserção',
  'Representação': 'Procuração nos autos; procurador público e DPU dispensam', 'MPF': 'Situação do parecer do Ministério Público Federal no 2º grau', 'MPF - Custos Legis': 'Hipótese de intervenção obrigatória (artigo 178 do CPC)',
  'Prelim.': 'Preliminares nas razões ou contrarrazões a decidir antes do mérito', 'Tema': 'Tipo de caso: a matéria em poucas palavras, como no lote', 'Especificidades': 'O que distingue este caso dos parecidos',
  'Síntese Processual': 'Síntese do processo para quem vai minutar', 'Síntese Fática': 'Fatos relevantes, com o ID das provas', 'Hipóteses Monocrática': 'Inciso do artigo 932 do CPC que autoriza a decisão do relator',
  'Destino - Situação': 'Pronto para julgar ou pendente (com o que falta)', 'Voto - Resultado': 'Resultado do julgamento', 'Voto - Honorários': 'O que acontece com os honorários (Tema 1.059/STJ para os recursais)',
  'Tópico-síntese': 'Tópico-síntese do INSS (benefício implantado ou revisto)', 'Mono - Fundamento': 'Precedente ou fundamento que autoriza a decisão do relator', 'Urgência': 'Medida urgente pedida (liminar, tutela, efeito suspensivo)',
  'Sobrestamento - Motivo': 'Por que o processo está sobrestado', 'Sobrestamento - Tema': 'Tema ou precedente que manda sobrestar', 'Sensível - Categoria': 'Por que o caso é sensível', 'Sensível - Quadro': 'Quadro ou motivo do caso sensível',
  'Impugnada - ID': 'ID da decisão impugnada (acórdão embargado, decisão agravada)', 'ED - Vício': 'Omissão, contradição, obscuridade ou erro material apontado', 'AgInt - Fundamentos': 'Fundamentos do agravo interno contra a decisão do relator' };
var TIPO_DICA = { lista: 'escolha uma opção', simnao: 'Sim ou Não', data: 'data', numero: 'número', 'texto-longo': 'texto livre', texto: 'texto curto', tabela: 'lista de linhas (editar na ficha do Ex Officio)' };
function dicaCampo(c) {
  var d = DICA[c.chave] || S(c.regra) || '';
  return c.rotulo + (d ? ': ' + d : '') + ' (' + (TIPO_DICA[c.tipo] || 'campo') + (editavel(c) ? '; grava sozinho na ficha do processo' : '; só leitura') + ')';
}
/* rótulo do campo no painel: honorários com ícone (quem paga, quanto e sobre o quê vêm no valor) */
function rotuloDe(c) { var E = window.MutaEtiquetas; return (/Honorários/.test(c.chave || '') && !/Recursais|Majora/i.test(c.chave || '') && E && E.svg ? '<i class="gl-ic" title="Quem paga, quanto e sobre o quê">' + E.svg('triste', 12) + '</i>' : '') + esc(c.rotulo); }
/* 0.38: o campo que a leitura dos autos preencheu sozinha leva a marca "autos" até ser conferido ou mudado */
function campo(c) {
  if(c.legado||c.chave==='Padrão - Espécie')return '';
  if(c.chave==='Origem - Peças vinculadas 1G'&&window.MutaReferencia)return window.MutaReferencia.html();
  var h = campo0(c), AU = window.MutaAutos;
  if (c.secao && AU && AU.preenchido && AU.preenchido(c.secao + '.' + c.chave)) h = h.replace(/^<div class="gf/, '<div class="gf au-auto').replace('</span>', ' <i class="au-tag" title="Preenchido pela leitura dos autos: confira">autos</i></span>');
  else if (c.secao && G.cnj && autoGabPos(c.secao + '.' + c.chave)) h = h.replace(/^<div class="gf/, '<div class="gf au-auto').replace('</span>', ' <i class="au-tag" title="Preenchido pela extensão: confira">auto</i></span>');
  return h;
}
function heroEquipeCampo(c){return c&&((c.vocabulario==='equipe')||/^(Responsável|SERVIDOR|CORRETOR|Destino - Confirmado por)$| - Responsável$/.test(c.chave));}
function heroEquipeNomes(v){return Array.from(new Set((G.equipe||[]).filter(function(x){return x&&x.situacao!=='inativo';}).map(function(x){return typeof x==='string'?x:x.nome;}).concat(v?[v]:[]).filter(Boolean))).sort(function(a,b){return a.localeCompare(b,'pt-BR');});}
function heroEquipeInput(v,at,id){var dl='hero-equipe-'+id.replace(/[^a-zA-Z0-9_-]/g,'-');return '<input type="text" '+at+' list="'+esc(dl)+'" value="'+esc(v||'')+'" placeholder="Selecione ou digite"><datalist id="'+esc(dl)+'">'+heroEquipeNomes(v).map(function(x){return '<option value="'+esc(x)+'"></option>';}).join('')+'</datalist>';}
function campo0(c) {
  if(c.legado||c.chave==='Padrão - Espécie')return '';
  if(c.chave==='Status da triagem')c=Object.assign({},c,{rotulo:'Situação da triagem'});
  var longo = c.tipo === 'texto-longo' || c.tipo === 'tabela' || /Honorários/.test(c.chave || ''), cls = 'gf' + (longo ? ' w' : '');
  if (c.tipo === 'tabela') {
    var tv = c.secao ? gravado(c.secao, c.chave) : '';
    return '<div class="' + cls + '" title="' + esc(dicaCampo(c)) + '"><span class="gl">' + rotuloDe(c) + (editavel(c) ? ' <small class="muted">· editar na ficha do Ex Officio</small>' : '') + '</span>' + tabela(c, tv) + '</div>';
  }
  if (!editavel(c)) {
    var v0 = c.secao ? gravado(c.secao, c.chave) : fonteVal(c);
    if (typeof v0 === 'object') v0 = '';
    return '<div class="' + cls + '" title="' + esc(dicaCampo(c)) + '"><span class="gl">' + rotuloDe(c) + '</span><span class="ro">' + (S(v0) ? esc(/^\d{4}-\d{2}-\d{2}$/.test(S(v0)) ? brD(v0) : v0) : '—') + '</span></div>';
  }
  var id = c.secao + '.' + c.chave, v = c.valorExibicao == null ? V(c.secao, c.chave) : c.valorExibicao, bloq = (id === 'producao.SERVIDOR' || id === 'producao.CORRETOR') && !G.gestor, h;
  if (typeof v === 'object') v = '';
  v = String(v);
  var at = ' data-fk="' + esc(id) + '"' + (bloq ? ' disabled title="Designação: só o gestor"' : '');
  if(heroEquipeCampo(c))return '<div class="'+cls+(id in G.pend?' mud':'')+'"><span class="gl">'+rotuloDe(c)+'</span>'+heroEquipeInput(v,at,id)+'</div>';
  /* lista curta e Sim/Não viram botões, como na gaveta da pauta */
  var OC = c.tipo === 'simnao' ? ['Sim', 'Não'] : c.tipo === 'lista' ? (c.opcoes || []).map(function (o) { return typeof o === 'string' ? o : o.valor; }) : null;
  if (OC && !bloq && OC.length && OC.length <= 6 && OC.every(function (o) { return o.length <= 26; })) {
    return '<div class="' + cls + (OC.length > 3 ? ' w' : '') + (id in G.pend ? ' mud' : '') + '" title="' + esc(dicaCampo(c)) + '"><span class="gl">' + rotuloDe(c) + '</span><div class="pm-seg gf-seg" role="group" aria-label="' + esc(c.rotulo) + '">' +
      OC.map(function (o) { return '<button type="button" class="pm-ch' + (o === v ? ' on' : '') + '" data-ch="' + esc(id) + '" data-v="' + esc(o) + '" aria-pressed="' + (o === v) + '">' + esc(o) + '</button>'; }).join('') +
      (v && OC.indexOf(v) < 0 ? '<span class="pm-ch on">' + esc(v) + '</span>' : '') + '</div></div>';
  }
  if (c.tipo === 'lista') { var O = (c.opcoes || []).map(function (o) { return typeof o === 'string' ? o : o.valor; });
    h = '<select' + at + '><option value="">—</option>' + O.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + (v && O.indexOf(v) < 0 ? '<option selected>' + esc(v) + '</option>' : '') + '</select>'; }
  else if (c.tipo === 'simnao') h = '<select' + at + '><option value="">—</option><option' + (v === 'Sim' ? ' selected' : '') + '>Sim</option><option' + (v === 'Não' ? ' selected' : '') + '>Não</option>' + (v && v !== 'Sim' && v !== 'Não' ? '<option selected>' + esc(v) + '</option>' : '') + '</select>';
  else if (c.tipo === 'data' && (!v || /^\d{4}-\d{2}-\d{2}$/.test(v))) h = '<input type="date"' + at + ' value="' + esc(v) + '">';
  else if (c.tipo === 'numero') h = '<input type="number"' + at + ' value="' + esc(v) + '">';
  else if (c.tipo === 'texto-longo') h = '<textarea rows="3"' + at + '>' + esc(v) + '</textarea>';
  else h = '<input type="text"' + at + ' value="' + esc(v) + '">';
  return '<label class="' + cls + (id in G.pend ? ' mud' : '') + '" title="' + esc(dicaCampo(c)) + '"><span class="gl">' + rotuloDe(c) + '</span>' + h + '</label>';
}
function grupoHtml(g, aberto) {
  var n = g.campos.filter(function (c) { var v = c.secao ? V(c.secao, c.chave) : fonteVal(c); return Array.isArray(v) ? v.length : !!S(v); }).length;
  return '<details class="gg"' + (aberto ? ' open' : '') + '><summary><h4>' + esc(g.grupo) + '</h4><span class="gn">' + n + '/' + g.campos.length + '</span></summary><div class="gr">' + g.campos.map(campo).join('') + '</div></details>';
}
function controles(A) {
  return A.grupos.map(function (g) {
    var id = g.controle, v = vale(id), ab = v || G.mostra[id], inc = INC[id];
    return '<section class="gce ' + id + (v ? ' on' : '') + '"><div class="gce-h"><h4>' + esc(g.grupo) + '</h4><span class="gce-s">' + (v ? 'vale para este processo' : 'não se aplica') + '</span>' +
      (!ab && inc ? '<button type="button" class="btn line" data-inc="' + id + '">+ ' + esc(inc[0]) + '</button>' : '') + '</div>' +
      (ab ? '<div class="gr">' + g.campos.map(campo).join('') + '</div>' : '<p class="muted gce-r">Regra: ' + esc(g.inclusao || '') + '.</p>') + '</section>';
  }).join('');
}
function pills() {
  return ORD_CE.filter(vale).map(function (g) { return '<button type="button" class="gp ' + g + '" data-aba="' + CE + '">' + ROT_CE[g] + '</button>'; }).join('');
}

/* ---------- desenho: prontuário único (Processo · Triagem · Produção) ----------
   No topo, o cartão do processo (autuação e partes, do acervo). Embaixo, três modos:
   - Processo: assunto, síntese e questões; situação atual; documentos dos autos (com especificação e inteiro teor);
     preenchimento pelos autos; sentença, origem, recursos e contrarrazões, outras peças; os controles (urgência, meta,
     sobrestamento e caso sensível); registro no acervo e acompanhamento;
   - Triagem: conferência automática dos autos; etiquetas sugeridas; o prontuário de triagem da ficha; o registro da triagem do lote;
   - Produção: destino do julgamento, designação, revisão e o que vale para o destino; no fim, a pauta (sessão) ou o controle da monocrática.
   Autuação, partes, tramitação e "autos extraídos" não aparecem como grupos: o cartão, a situação atual e a lista de documentos os substituem. */
var MODOS = ['Processo', 'Autos'];  /* 0.38: o Gerador foi para a aba Minuta; 0.47: o Roteiro entrou na aba Processo */
var ROT_MODO = {};
var FORA_PROC = { 'Identificação e Autuação': 1, 'Autuação': 1, 'Partes': 1, 'Tramitação': 1, 'Autos extraídos do PJe': 1, 'Registro no acervo': 1, 'Acompanhamento': 1 };
var NO_TOPO = { 'Tipo de Julgamento': 1, 'Histórico de julgamento': 1, 'Mapa de próximos passos': 1, 'Avisos': 1, 'Síntese Processual': 1, 'Alegações': 1, 'Etiquetas sugeridas': 1, 'O que falta sanar': 1, 'Intercorrências': 1, 'Assunto detalhado': 1 };
var CTL_PROC = ['urgencia', 'meta', 'sobrestamento', 'sensivel'];
function abaModelo(nome) { return ((G.F && G.F.abas) || []).filter(function (a) { return a.aba === nome; })[0] || null; }
function grupoModelo(nome) { var g = null; var aliases={'Autuação':'Identificação e Autuação','Matéria':'Caso, Conteúdo e Questões','Origem':'1º grau'}; ((G.F && G.F.abas) || []).forEach(function (a) { (a.grupos || []).forEach(function (x) { if (!g && (x.grupo === nome || x.grupo === aliases[nome])) g = x; }); }); return g; }
function campoModelo(sec, chave) { var c = null; ((G.F && G.F.abas) || []).forEach(function (a) { (a.grupos || []).forEach(function (g) { (g.campos || []).forEach(function (x) { if (!c && x.chave === chave && (x.secao || '') === sec) c = x; }); }); }); return c; }
function fmtV(v) { v = S(v); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? brD(v) : v; }
function valorDe(c) { if(c.rotulo==='Assunto CNJ')return assuntoCNJ();if(c.rotulo==='Classe')return classeAutuacao()||(c.secao?S(gravado(c.secao,c.chave)):fonteVal(c));var v = c.secao ? gravado(c.secao, c.chave) : fonteVal(c); return typeof v === 'object' ? '' : S(v); }
function pjeDoProcesso() { return window.MutaPje && window.MutaPje.processo && Muta.chaveProcesso(window.MutaPje.processo()) === Muta.chaveProcesso(G.cnj); }

/* valor da causa: número cru vira R$ 1.518,00; texto já formatado fica como está */
function moeda(v) { v = S(v); if (!/^\d+([.,]\d{1,2})?$/.test(v)) return v; var n = Number(v.replace(',', '.')); if (!isFinite(n)) return v;
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
/* cartão do processo: autuação e partes */
function cartao(s) {
  var R = {};
  ['Autuação', 'Partes'].forEach(function (n) { var g = grupoModelo(n); (g ? g.campos : []).forEach(function (c) { R[c.rotulo] = valorDe(c); }); });
  var classe = R['Classe'] || fonteVal({ fonte: ['classe_judicial', 'Classe'] }), assunto = assuntoCNJ();
  var abrev = pjeDoProcesso() ? window.MutaPje.classe() : '';
  var tarefa = (pjeDoProcesso() && window.MutaPje.tarefa && window.MutaPje.tarefa()) || fonteVal({ fonte: ['tarefa_atual'] });
  var etq = S(R['Etiquetas do PJe']).split(/\s*[;,|]\s*/).filter(Boolean);
  var dl = [['Órgão julgador', 'Órgão julgador'], ['Relator', 'Relator'], ['Seção', 'Seção competente'], ['Distribuição', 'Distribuição'], ['1º grau', 'Distribuição no 1º grau'], ['Valor da causa', 'Valor da causa'], ['Prioridade', 'Prioridade'], ['Sigilo', 'Sigiloso']]
    .filter(function (x) { return S(R[x[1]]) && !/^(não|nao|n|false|0)$/i.test(S(R[x[1]])); })
    .map(function (x) { var v = S(R[x[1]]); if (/^(true|sim|s)$/i.test(v)) v = 'Sim'; else if (x[0] === 'Valor da causa') v = moeda(v); else v = fmtV(R[x[1]]);
      return '<div' + (x[0] === 'Prioridade' || x[0] === 'Sigilo' ? ' class="pri"' : '') + '><dt>' + esc(x[0]) + '</dt><dd>' + esc(v) + '</dd></div>'; }).join('');
  var polo = function (rot, p, a) { return S(R[p]) ? '<div class="pc-p"><span>' + esc(rot) + '</span><b>' + esc(R[p]) + '</b>' + (S(R[a]) ? '<small>Adv.: ' + esc(R[a]) + '</small>' : '') + '</div>' : ''; };
  var partes = polo('Polo ativo', 'Polo ativo', 'Advogado do polo ativo') + polo('Polo passivo', 'Polo passivo', 'Advogado do polo passivo') +
    (S(R['DPU']) && !/^(não|nao)$/i.test(S(R['DPU'])) ? '<div class="pc-p"><span>DPU</span><b>' + esc(R['DPU']) + '</b></div>' : '') +
    (S(R['MPF']) && !/^(não|nao)$/i.test(S(R['MPF'])) ? '<div class="pc-p"><span>MPF</span><b>' + esc(R['MPF']) + '</b></div>' : '') +
    (!S(R['Polo ativo']) && S(R['Partes (texto da pauta)']) ? '<div class="pc-p"><span>Partes</span><b>' + esc(R['Partes (texto da pauta)']) + '</b></div>' : '');
  var pills = ORD_CE.filter(function (g) { return g !== 'monocratica' && (!heroV53() || ['meta','urgencia','sensivel'].indexOf(g)<0) && vale(g); }).map(function (g) { return '<button type="button" class="gp ' + g + '" data-ir="g-ctl" title="Abrir o controle">' + ROT_CE[g] + '</button>'; }).join('');
  return '<section class="pc">' +
    '<div class="pc-n"><button type="button" class="mono pc-cnj" data-copia="' + esc(G.cnj) + '" title="Copiar o número">' + esc(G.cnj) + '</button>' + (abrev ? '<span class="pc-cl">' + esc(abrev) + '</span>' : '') + '<span class="sp"></span>' + pills + '</div>' +
    (classe || assunto ? '<h2 class="pc-t">' + esc(classe) + (assunto ? '<em> · ' + esc(assunto) + '</em>' : '') + '</h2>' : '') +
    (tarefa ? '<p class="pc-tf">' + esc(tarefa) + '</p>' : '') +
    (dl ? '<dl class="pc-dl">' + dl + '</dl>' : '') +
    (partes ? '<div class="pc-ps">' + partes + '</div>' : '') +
    (etq.length ? '<div class="pc-etq">' + etq.map(function (e) { return '<span class="chip">' + esc(e) + '</span>'; }).join('') + '</div>' : '') +
    '<div class="pc-u"><span>' + esc(s.usuario) + (s.gestor ? ' · gestor' : '') + '</span><button type="button" class="lnk" data-g="atualizar">Atualizar</button><a class="lnk" target="_blank" rel="noopener noreferrer" href="' + SITE + '/exofficio/">Ex Officio</a><button type="button" class="lnk" data-sair>Sair</button></div>' +
    '</section>';
}

/* ---------- 0.15 · cabeçalho no formato da gaveta "Para minuta" da pauta ----------
   fase e dias na tarefa; número, classe, alertas; assunto e tipo; partes; etapas (tocar na próxima marca hoje, na última
   feita desfaz); designação de minuta e correção. Os mesmos campos da ficha (producao.*) que a pauta usa. */
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function hojeIso() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function agoraBr() { var d = new Date(); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function sim(v) { return /^(sim|s|true)$/i.test(S(v)); }
var SV = function (d, n) { return '<svg viewBox="0 0 24 24" width="' + (n || 16) + '" height="' + (n || 16) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
var IC = { tri: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>', min: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', rev: '<path d="M20 6 9 17l-5-5"/>', env: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  ass: '<path d="M3 21c3-1 5-4 6-7l3 3c-3 1-6 3-7 6z"/><path d="M14 4l6 6-5 5-6-6z"/>', et: '<path d="M4 12h4l3-8 4 16 3-8h2"/>', pt: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 15c3 0 6 1.5 6 4"/>',
  sn: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>', nt: '<path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>', dc: '<path d="M12 3v18M5 7h14M7 7l-3 7h6zM17 7l-3 7h6z"/>' };
function etapas() {
  var mono = destino() === 'monocratica', d = function (k) { return S(V('producao', k)); };
  var L = [{ r: 'Triagem', ic: 'tri', ok: !!S(V('triagem', 'Destino - Confirmado em')), dt: S(V('triagem', 'Destino - Confirmado em')), on: { 'triagem.Destino - Confirmado em': 1, 'triagem.Destino - Confirmado por': 'U' }, off: ['triagem.Destino - Confirmado em', 'triagem.Destino - Confirmado por'] },
    { r: 'Minuta', ic: 'min', ok: !!d('MINUTADO'), dt: d('MINUTADO'), on: { MINUTADO: 1 }, off: ['MINUTADO'] },
    { r: mono ? 'Revisão' : 'Correção', ic: 'rev', ok: sim(d('CORRIGIDO')) || !!d('Data da Revisão'), dt: d('Data da Revisão'), on: { CORRIGIDO: 'Sim', 'Data da Revisão': 1 }, off: ['CORRIGIDO', 'Data da Revisão'] }];
  if (mono) L.push({ r: 'Enviada', ic: 'env', ok: !!d('Data da Liberação'), dt: d('Data da Liberação'), on: { 'Data da Liberação': 1 }, off: ['Data da Liberação'] },
    { r: 'Assinada', ic: 'ass', ok: sim(d('Assinado')) || !!d('Data da Assinatura'), dt: d('Data da Assinatura'), on: { Assinado: 'Sim', 'Data da Assinatura': 1 }, off: ['Assinado', 'Data da Assinatura'] });
  else L.push({ r: 'Liberação', ic: 'env', ok: sim(d('LIBERADO')) || !!d('Data da Liberação'), dt: d('Data da Liberação'), on: { LIBERADO: 'Sim', 'Data da Liberação': 1 }, off: ['LIBERADO', 'Data da Liberação'] });
  /* a etapa atual vem depois da última feita: processo designado direto para a pauta não passa pela confirmação da triagem */
  var n = 0; L.forEach(function (x, i) { if (x.ok) n = i + 1; });
  return { L: L, n: n, mono: mono };
}
function pautaFluxo(P,C,hoje){
  P=P||{};C=C||[];var rows={},dia=function(v){v=S(v);var m=/^(\d{2})\/(\d{2})\/(\d{4})/.exec(v);return m?m[3]+'-'+m[2]+'-'+m[1]:/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):'';};
  function put(d,it,r){d=dia(d);if(!d||!S(it))return;var x=rows[d]||(rows[d]={sessao:d,item:S(it),status:''});if(it)x.item=S(it);if(r)x.status=S(r);}
  (Array.isArray(P.sessoes)?P.sessoes:[]).forEach(function(x){if(x)put(x.sessao,x.item,x.resultado);});
  put(P['Sessão original'],P['Item (Pauta de Julgamento)'],P['Status de Julgamento']);
  C.forEach(function(x){if(x)put(x.sessao,x.item,x.resultado||x.status);});
  var ocorrencias={};try{ocorrencias=JSON.parse(S(P['Ingresso e ocorrências da sessão'])||'{}')||{};}catch(e){}
  Object.values(rows).forEach(function(x){var o=ocorrencias[x.sessao+'|'+x.item];if(o&&o.efetivada===true&&S(o.justificativa)&&! /retirad|adiad|julgad|provimento|prejudic|nao conhec|acolhid|rejeitad|homolog/i.test(N(x.status))){if(o.ocorrencia==='Adiamento')x.status='ADIADO';else if(o.ocorrencia==='Retirada de pauta')x.status='RETIRADO DE PAUTA';}});
  var L=Object.values(rows).sort(function(a,b){return b.sessao.localeCompare(a.sessao);}),cur=L.find(function(x){return !/retirad|adiad|julgad|provimento|prejudic|nao conhec|acolhid|rejeitad|homolog/i.test(N(x.status));}),last=L[0],alvo=dia(P['Nova sessão de destino']);
  if(last&&cur&&last.sessao>cur.sessao)cur=null;
  var estado=cur?'oficial':last&&/adiad/.test(N(last.status))?'adiado':last&&/retirad/.test(N(last.status))?'retirado':last?'historico':'previa';
  return {estado:estado,atual:cur||null,ultima:last||null,alvo:alvo,lista:L};
}
function pautaAtualFluxo(){
 var P=Object.assign({},(G.op||{}).pauta||{});['Sessão original','Item (Pauta de Julgamento)','Status de Julgamento','Nova sessão de destino','Ingresso e ocorrências da sessão'].forEach(function(k){var v=V('pauta',k);if(v!=null&&S(v))P[k]=v;});
 var SI=window.MutaSincronia&&window.MutaSincronia.situacao?window.MutaSincronia.situacao():null,C=SI&&dg(SI.cnj)===dg(G.cnj)?SI.cartoes||[]:[];
 return pautaFluxo(P,C);
}
function pautado(){return pautaAtualFluxo().estado==='oficial';}
function pilulas(E) {
  var d = function (k) { return S(V('producao', k)); }, nome = function (k) { return d(k).split(/\s*[\/,;]\s*/).map(function (x) { return x.split(/\s+/)[0]; }).filter(Boolean).join('/'); };
  var idx = function (ic) { for (var i = 0; i < E.L.length; i++) if (E.L[i].ic === ic) return i; return -1; };
  var P = [['min', 'Minuta', 'SERVIDOR', 'k-min'], ['rev', E.mono ? 'Revisão' : 'Correção', 'CORRETOR', 'k-rev']];
  /* 0.67: "Liberada" só em processo pautado e quando as caixas de liberação do editor (Aguardando a sessão) estão marcadas ou a liberação foi informada à mão */
  var lib = pjeDoProcesso() && window.MutaPje.liberacao ? window.MutaPje.liberacao() : null, libOk = lib && lib.tot && lib.ok === lib.tot, libMan = sim(d('LIBERADO')) || !!d('Data da Liberação');
  if (E.mono) P.push(['env', 'Enviada', '', 'k-lib'], ['ass', 'Assinada', '', 'k-lib']);
  else if (pautado() && (libOk || libMan)) P.push(['env', libMan ? 'Liberada' : 'Liberada no editor', '', 'k-lib' + (libMan ? '' : ' pl-pje')]);
  return P.map(function (p) {
    var i = idx(p[0]), x = E.L[i] || {}, ok = !!x.ok, at = i === E.n, dt = x.dt ? brD(x.dt) : '';
    var pode = at || i === E.n - 1, tt = at ? 'Marcar hoje' : i === E.n - 1 ? 'Desfazer' : ok ? 'Feita' : 'Depois da etapa anterior';
    var quem = p[2] ? (G.desEd === p[2] ? '<input type="text" id="pm-des" data-des="' + p[2] + '" value="' + esc(d(p[2])) + '" placeholder="nome" aria-label="' + p[1] + '">' :
      '<button type="button" class="pl-q" data-des-ed="' + p[2] + '"' + (G.gestor ? ' title="Designar (Enter grava)"' : ' disabled title="Designação: só o gestor"') + '>' + esc(nome(p[2]) || 'a designar') + '</button>') : '';
    return '<span class="pm-pl ' + p[3] + (ok ? ' ok' : at ? ' at' : '') + '"><button type="button" class="pl-e" data-et="' + i + '"' + (pode ? '' : ' disabled') + ' title="' + tt + '">' + SV(IC[p[0]]||IC.et,13) + esc(p[1]) + (p[2] ? ':' : '') + '</button>' + (quem ? ' ' + quem : '') +
      (dt ? '<span class="pl-d"> · ' + esc(dt) + '</span>' : '') + '</span>';
  }).join('');
}
function marcarEtapa(i) {
  var E = etapas(), x = E.L[i]; if (!x) return;
  var cam = function (k) { return k.indexOf('.') > 0 && /^(triagem|producao|origem)\./.test(k) ? k : 'producao.' + k; };
  if (i === E.n) Object.keys(x.on).forEach(function (k) { marcar(cam(k), x.on[k] === 1 ? hojeIso() : x.on[k] === 'U' ? (ses.estado().usuario || '') : x.on[k]); });
  else if (i === E.n - 1) x.off.forEach(function (k) { marcar(cam(k), ''); });
  else return;
  agendar(500); render();
}
function iniciais(v) { var p = S(v).split(/\s+/).filter(Boolean); return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '—'; }
function diasDesde(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(v)) || /^(\d{2})\/(\d{2})\/(\d{4})/.exec(S(v)); if (!m) return null; var d = m[1].length === 4 ? new Date(+m[1], m[2] - 1, +m[3]) : new Date(+m[3], m[2] - 1, +m[1]); return Math.max(0, Math.floor((Date.now() - d) / 864e5)); }
function cabeca(s) {
  var R = {};
  ['Autuação', 'Partes'].forEach(function (n) { var g = grupoModelo(n); (g ? g.campos : []).forEach(function (c) { R[c.rotulo] = valorDe(c); }); });
  var classe = R['Classe'] || fonteVal({ fonte: ['classe_judicial', 'Classe'] }), assunto = assuntoCNJ();
  var abrev = (pjeDoProcesso() ? window.MutaPje.classe() : '') || classe.split(/\s*[\/(]/)[0];
  /* 0.64: etiqueta com a sigla da classe (TPU/CNJ) e o recurso julgado dentro do processo — "ApCiv · ED" */
  var etqCl = null; try { var TT = window.MutaRoteiro && window.MutaRoteiro.tipos ? window.MutaRoteiro.tipos(gRot(), G.cnj) : null; etqCl = window.ClassesCNJ ? window.ClassesCNJ.etiqueta((pjeDoProcesso() ? window.MutaPje.classe() : '') || classe, TT || V('triagem', 'Tipo de Julgamento')) : null; } catch (e) {}
  if (etqCl && etqCl.t) abrev = etqCl.t;
  var tarefa = (pjeDoProcesso() && window.MutaPje.tarefa && window.MutaPje.tarefa()) || fonteVal({ fonte: ['tarefa_atual'] });
  var dias = diasDesde(fonteVal({ fonte: ['data_entrada_tarefa'] }));
  var AL = window.MutaAutos && window.MutaAutos.estado().itens ? window.MutaAutos.alertas().filter(function (a) { return a.nivel === 'al'; }) : [];
  var E = etapas(), FASE = E.mono ? ['Para triagem', 'Para minuta', 'Para revisão', 'Para envio', 'Para assinatura', 'Assinada'] : ['Para triagem', 'Para minuta', 'Para correção', 'Para liberação', 'Liberado'];
  var partes = S(R['Polo ativo']) ? S(R['Polo ativo']) + (S(R['Polo passivo']) ? ' x ' + S(R['Polo passivo']) : '') : S(R['Partes (texto da pauta)']);
  var tipoJ = S(V('triagem', 'Tipo de Julgamento')) || S(V('triagem', 'Padrão - Espécie'));
  /* tipo de julgamento: o da ficha; a leitura dos autos (classe, tarefa, último recurso) sugere e confere */
  var TA = window.MutaAutos && window.MutaAutos.estado().itens ? window.MutaAutos.alertas().filter(function (a) { return /^Tipo de julgamento:/.test(a.t); })[0] : null;
  var tjHtml = tipoJ ? '<span class="pm-tj' + (TA && TA.nivel === 'al' ? ' al' : '') + '" title="' + esc(TA ? TA.t : 'Tipo de julgamento na ficha') + '">' + esc(tipoJ) + '</span>' +
      (TA && TA.campo && N(TA.valor) !== N(tipoJ) ? '<button type="button" class="pm-tj sug" data-tj="' + esc(TA.valor) + '" title="' + esc(TA.t) + '">autos: ' + esc(TA.valor) + ' ✓</button>' : '')
    : TA ? '<button type="button" class="pm-tj sug' + (TA.nivel === 'al' ? ' al' : '') + '" data-tj="' + esc(TA.valor) + '" title="' + esc(TA.t) + ' Clique para gravar.">' + esc(TA.valor) + ' ✓</button>' : '';
  var dl = [['Órgão julgador', 'Órgão julgador'], ['Seção', 'Seção competente'], ['Distribuição', 'Distribuição'], ['1º grau', 'Distribuição no 1º grau'], ['Valor da causa', 'Valor da causa'], ['Prioridade', 'Prioridade'], ['Sigilo', 'Sigiloso']]
    .filter(function (x) { return S(R[x[1]]) && !/^(não|nao|n|false|0)$/i.test(S(R[x[1]])); })
    .map(function (x) { var v = S(R[x[1]]); if (/^(true|sim|s)$/i.test(v)) v = 'Sim'; else if (x[0] === 'Valor da causa') v = moeda(v); else v = fmtV(R[x[1]]);
      return '<div' + (x[0] === 'Prioridade' || x[0] === 'Sigilo' ? ' class="pri"' : '') + '><dt>' + esc(x[0]) + '</dt><dd>' + esc(v) + '</dd></div>'; }).join('');
  var polo = function (rot, p, a) { return S(R[p]) ? '<div class="pc-p"><span>' + esc(rot) + '</span><b>' + esc(R[p]) + '</b>' + (S(R[a]) ? '<small>Adv.: ' + esc(R[a]) + '</small>' : '') + '</div>' : ''; };
  var polos = polo('Polo ativo', 'Polo ativo', 'Advogado do polo ativo') + polo('Polo passivo', 'Polo passivo', 'Advogado do polo passivo') +
    (S(R['DPU']) && !/^(não|nao)$/i.test(S(R['DPU'])) ? '<div class="pc-p"><span>DPU</span><b>' + esc(R['DPU']) + '</b></div>' : '') +
    (S(R['MPF']) && !/^(não|nao)$/i.test(S(R['MPF'])) ? '<div class="pc-p"><span>MPF</span><b>' + esc(R['MPF']) + '</b></div>' : '');
  var etq = S(R['Etiquetas do PJe']).split(/\s*[;,|]\s*/).filter(Boolean);
  var pills = ORD_CE.filter(function (g) { return g !== 'monocratica' && vale(g); }).map(function (g) { return '<button type="button" class="gp ' + g + '" data-ir="g-ctl" title="Abrir o controle">' + ROT_CE[g] + '</button>'; }).join('');
  var et = E.L.map(function (x, i) {
    var cls = x.ok ? 'ok' : i === E.n ? 'at' : i < E.n ? 'pul' : '', t = i === E.n ? 'Marcar hoje' : i === E.n - 1 ? 'Desfazer' : x.ok ? 'Feita' : i < E.n ? 'Sem registro: o processo seguiu sem esta etapa' : 'Depois da etapa anterior';
    return '<button type="button" class="pm-e ' + cls + '" data-et="' + i + '" title="' + t + '">' + (i === E.n ? '<em>agora</em>' : '') + '<span class="pm-o">' + SV(IC[x.ic], 14) + '</span><b>' + esc(x.r) + '</b><small>' + (x.dt ? esc(brD(x.dt).slice(0, 5)) : '—') + '</small></button>';
  }).join('');
  var pess = function (k, rot) { var v = S(V('producao', k));
    if (G.desEd === k) return '<span class="pm-pp ed"><span class="pm-pn"><small>' + rot + '</small><input type="text" id="pm-des" data-des="' + k + '" value="' + esc(v) + '" placeholder="nome" aria-label="' + rot + '"></span></span>';
    return '<button type="button" class="pm-pp' + (v ? '' : ' vz') + '" data-des-ed="' + k + '"' + (G.gestor ? ' title="Designar (Enter grava)"' : ' disabled title="Designação: só o gestor"') + '><span class="pm-av">' + esc(v ? iniciais(v) : '—') + '</span><span class="pm-pn"><small>' + rot + '</small>' + esc(v || 'não designado') + '</span></button>'; };
  return '<section class="pc pm">' +
    '<div class="pm-top"><span class="pm-fase">' + FASE[Math.min(E.n, FASE.length - 1)] + '</span>' + (dias != null ? '<span class="pm-dd' + (dias > 30 ? ' al' : '') + '">' + dias + ' dias na tarefa<i><i style="width:' + Math.min(100, dias / 60 * 100) + '%"></i></i></span>' : '') + '<span class="sp"></span>' + pills + '</div>' +
    '<div class="pm-l1"><button type="button" class="mono pc-cnj" data-copia="' + esc(G.cnj) + '" title="Copiar o número">' + esc(G.cnj) + '</button>' + (abrev ? '<button type="button" class="pc-cl" data-cl-tipo title="' + esc((etqCl && etqCl.nome) || classe) + ' · clique para o tipo de julgamento">' + esc(abrev) + '</button>' : '') +
      tjHtml + (AL.length ? '<button type="button" class="pm-al" data-aba="Autos" title="' + esc(AL.map(function (a) { return a.t; }).join(' · ')) + '">' + AL.length + ' alerta' + (AL.length > 1 ? 's' : '') + '</button>' : '') + '</div>' +
    '<p class="pm-as">' + (assunto ? '<b>' + esc(assunto) + '</b>' : '') + (!G.adEd && !S(gravado('triagem', 'Registro - Assunto detalhado')) && !S(V('triagem', 'Assunto detalhado')) ? '<button type="button" class="pm-ad-ic" data-ad="ed" title="Incluir o assunto detalhado (vai para a ficha; o Caput mostra o mesmo)" aria-label="Incluir o assunto detalhado">' + SV('<path d="M12 5v14M5 12h14"/>', 12) + '</button>' : '') + '</p>' +
    assuntoDetalhado() +
    /* 0.66: tipo de caso e especificidades junto do assunto e do assunto detalhado */
    '<div class="gr pm-esp">' + campoRot('triagem', 'Detalhamento do caso', 'Detalhamento do caso') + '</div>' +

    /* 0.65: etapas compactas — Minuta (verde), Correção/Revisão (azul), Liberada/Assinada (roxo); o nome designa, a data marca ou desfaz */
    '<div class="pm-pills">' + pilulas(E) + '</div>' +
    /* 0.66: encaminhamento junto do tipo de ato */
    '<div class="pm-resp">' + atoSel() + '<div class="gr pm-enc">' + situacaoHtml() + (N(V('producao', 'Destino')) === 'monocratica' ? campoRot('triagem', 'Hipóteses Monocrática', 'Hipótese do artigo 932') : '') + '</div></div>' +
    /* 0.49.1: 1ª seta = autuação e partes, em blocos com título (como a 2ª); os controles foram para a 2ª seta */
    '<details class="pm-aut pm-aut1"' + (G.autAb ? ' open' : '') + '><summary data-aut aria-label="Autuação e partes" title="Autuação e partes"><span class="pm-aut-t">autuação, partes e controles</span><i class="pm-aut-h"></i></summary>' +
      ((partes && !polos) || polos ? '<h4 class="pm-mer-h">Partes</h4>' : '') +
      (partes && !polos ? '<p class="pm-pt" title="' + esc(partes) + '">' + SV(IC.pt, 14) + '<span>' + esc(partes) + '</span></p>' : '') +
      (polos ? '<div class="pc-ps">' + polos + '</div>' : '') +
      (tarefa || dl ? '<h4 class="pm-mer-h">Autuação</h4>' : '') +
      (tarefa ? '<div class="pm-tf"><span>Tarefa no PJe</span><b>' + esc(tarefa) + '</b>' + (dias != null ? '<small>' + dias + ' dias</small>' : '') + '</div>' : '') +
      (dl ? '<dl class="pc-dl">' + dl + '</dl>' : '') +
      (window.MutaAutos ? '<div class="pm-sit">' + window.MutaAutos.htmlSituacao(gravado('triagem', 'Registro - Situação atual')) + '</div>' : '') +
      (etq.length ? '<h4 class="pm-mer-h">Etiquetas do PJe</h4><div class="pc-etq">' + etq.map(function (e) { return '<span class="chip">' + esc(e) + '</span>'; }).join('') + '</div>' : '') + /* 0.66: controles (urgência, meta, sobrestamento, caso sensível) na 1ª seta */ controlesProcesso(true) + '</details>' +
    merEnc() +
    '</section>';
}
/* 0.46 · 2ª seta do cartão: síntese e questões, mérito e encaminhamento (antes no Roteiro e na aba Processo); os campos só são
   desenhados com a seta aberta, para não repetir campos na tela */
function merEnc() {
  var ab = !!G.merAb, h = '<details class="pm-aut pm-mer"' + (ab ? ' open' : '') + '><summary aria-label="Mérito" title="Mérito: complexidade e tipo de voto"><span class="pm-aut-t">mérito</span><i class="pm-aut-h"></i></summary>';
  if (!ab) return h + '</details>';
  /* 0.50: com a seta aberta, o que dá para obter sozinho vai para os campos vazios (marca "auto", Desfazer) */
  if (!G._seco) try { autoGab(); situacaoSync(); } catch (e) {}
  var TR = window.MutaTriagem, mono = N(V('producao', 'Destino')) === 'monocratica';
  var etqX = (TR && TR.etiquetasDe ? TR.etiquetasDe(G.op, G.fo) : '') + (window.MutaAlertas ? window.MutaAlertas.htmlRoteiro(G.cnj, V('triagem', 'Etiquetas sugeridas'), function () { render(); }) : '');
  var ag = autoGabItens();
  return h + (ag.length ? '<div class="au-auto-av pm-auto"><span><b>' + ag.length + (ag.length === 1 ? ' campo preenchido' : ' campos preenchidos') + ' pela extensão</b> · marcados “auto”: confira</span><button type="button" class="lnk" data-autog="desfazer" title="Limpa o que a extensão pôs e não o repõe neste processo">Desfazer</button></div>' : '') +
    /* 0.64: síntese, questões, tipo de caso e especificidades foram para o painel acima dos roteiros (sinteseQuestoes) */
    '<h4 class="pm-mer-h">Mérito</h4><div class="gr">' +
      (S(V('triagem', 'COMPLEXIDADE')) ? campoRot('triagem', 'COMPLEXIDADE', 'Complexidade') : '') + campoRot('triagem', 'Tipo de Voto', 'Tipo de voto') + '</div>' +
    /* 0.50: pendências e etiquetas do gabinete saíram daqui (estão em Sinalizações e na 1ª seta); a situação é calculada pelas sinalizações */
    /* 0.66: encaminhamento foi para junto do tipo de ato e os controles para a 1ª seta */
    '</details>';
}
/* ---------- 0.50 · campos obtidos sozinhos na 2ª seta ----------
   Tipo de caso (assunto detalhado do Caput ou o assunto), tipo de voto (minuta-matriz da Conformidade ou tipo de julgamento
   e resultado) e hipótese do artigo 932 (fundamento e resultado da monocrática). Só campos vazios; Desfazer limpa o que
   ainda está como a extensão pôs e não repõe naquele processo (localStorage hero18810:autoGab). */
var AUTO_G = 'hero18810:autoGab';
function autoGabMem() { try { return JSON.parse(localStorage.getItem(AUTO_G) || '{}'); } catch (e) { return {}; } }
function autoGabGuardar(m) { try { localStorage.setItem(AUTO_G, JSON.stringify(m)); } catch (e) {} }
function hipotese932() {
  var res = N(V('producao', 'Voto - Resultado')) + ' ' + N(V('producao', 'Mono - Tipo de ato')), fund = N(V('producao', 'Mono - Fundamento')) + ' ' + N(V('triagem', 'Tipo de Julgamento'));
  if (/nao conhec|prejudicad|inadmiss|desist|intempest|deserc/.test(res + ' ' + fund)) return 'III · recurso inadmissível, prejudicado ou sem impugnação específica';
  var V5 = /^\s*(dou|deu|dado|provid|provimento)|parcial provimento|\bprovido|dou provimento/.test(res) && !/nego|negad|desprov/.test(res);
  if (/sumula/.test(fund)) return V5 ? 'V a · decisão recorrida contrária a súmula' : 'IV a · contrário a súmula do STF, STJ ou do TRF';
  if (/\btema\b|repetitiv|repercussao geral/.test(fund)) return V5 ? 'V b · decisão recorrida contrária a repetitivo' : 'IV b · contrário a repetitivo do STF ou STJ';
  if (/\birdr\b|\biac\b/.test(fund)) return V5 ? 'V c · decisão recorrida contrária a IRDR ou IAC' : 'IV c · contrário a IRDR ou IAC';
  return '';
}
function derivados() {
  var L = [], mono = N(V('producao', 'Destino')) === 'monocratica';
  L.push(['triagem.Detalhamento do caso', 'Detalhamento do caso', S(gravado('triagem', 'Registro - Assunto detalhado')) || S(V('triagem', 'Assunto detalhado'))]);
  var mx = null; try { mx = window.MutaComparar && window.MutaComparar.matriz ? window.MutaComparar.matriz() : null; } catch (e) {}
  var tj = S(V('triagem', 'Tipo de Julgamento')), res = S(V('producao', 'Voto - Resultado'));
  if (!mono) L.push(['triagem.Tipo de Voto', 'Tipo de voto', mx && (mx.nome || mx.titulo) ? S(mx.nome || mx.titulo) : tj && res ? tj + ' · ' + res : '']);
  if (mono && (pronAtual() === 1 || pronAtual() === 4)) L.push(['triagem.Hipóteses Monocrática', 'Hipótese do artigo 932', hipotese932()]);
  return L.filter(function (x) { return S(x[2]); });
}
function autoGab() {
  if (window.MUTA_WEB || !G.cnj || !G.op) return;
  var k = Muta.chaveProcesso(G.cnj), M = autoGabMem(), m = M[k] = M[k] || { pos: {}, rec: {} }, mud = 0;
  derivados().forEach(function (x) {
    var i = x[0].indexOf('.'), atual = S(V(x[0].slice(0, i), x[0].slice(i + 1)));
    if (atual || m.rec[x[0]] || !campoModelo(x[0].slice(0,i),x[0].slice(i+1))) return;
    marcar(x[0], x[2]); m.pos[x[0]] = x[2]; mud++;
  });
  if (mud) { autoGabGuardar(M); agendar(800); }
}
function autoGabItens() {
  if (!G.cnj) return []; var m = autoGabMem()[Muta.chaveProcesso(G.cnj)]; if (!m) return [];
  return Object.keys(m.pos).filter(function (a) { var i = a.indexOf('.'); return !!campoModelo(a.slice(0,i),a.slice(i+1)) && S(V(a.slice(0, i), a.slice(i + 1))) === S(m.pos[a]); });
}
function autoGabDesfazer() {
  var k = Muta.chaveProcesso(G.cnj), M = autoGabMem(), m = M[k]; if (!m) return;
  autoGabItens().forEach(function (a) { marcar(a, ''); m.rec[a] = 1; delete m.pos[a]; });
  autoGabGuardar(M); agendar(400); render();
}
function autoGabPos(alvo) { return autoGabItens().indexOf(alvo) >= 0; }
/* situação para julgar: Pendente com pendência ou intercorrência em aberto; senão, Pronto. À mão só com motivo fora delas
   (escolha guardada neste navegador, hero18810:sitManual) */
var SIT_M = 'hero18810:sitManual';
function sitManual() { try { return !!JSON.parse(localStorage.getItem(SIT_M) || '{}')[Muta.chaveProcesso(G.cnj)]; } catch (e) { return false; } }
function sitManualSet(on) { try { var o = JSON.parse(localStorage.getItem(SIT_M) || '{}'), k = Muta.chaveProcesso(G.cnj); if (on) o[k] = 1; else delete o[k]; localStorage.setItem(SIT_M, JSON.stringify(o)); } catch (e) {} }
function abertas(t) { return snLinhas(t).filter(function (l) { return !/^✓/.test(l); }).length; }
function situacaoCalc() { var pd = abertas('pd'), ic = abertas('ic'); return { v: pd || ic ? 'Pendente' : 'Pronto para julgar', pd: pd, ic: ic }; }
function situacaoSync() { if (window.MUTA_WEB || !G.cnj || !G.op || sitManual()) return; var c = situacaoCalc(); if (S(V('producao', 'Destino - Situação')) !== c.v) { marcar('producao.Destino - Situação', c.v); agendar(800); } }
function situacaoHtml() {
  var c = situacaoCalc(), man = sitManual() || !!S(V('producao','Destino - Situação')), motivo = [c.pd ? c.pd + (c.pd > 1 ? ' pendências' : ' pendência') : '', c.ic ? c.ic + (c.ic > 1 ? ' intercorrências' : ' intercorrência') : ''].filter(Boolean).join(' e ');
  if (man) return '<div class="gf w pm-sitj"><span class="gl">Situação para julgar <i class="au-tag">à mão</i></span>' + chips('producao', 'Destino - Situação') + '<small class="muted">pelas sinalizações seria “' + esc(c.v) + '” · <button type="button" class="lnk" data-sitman="0">voltar ao cálculo</button></small></div>';
  return '<div class="gf w pm-sitj"><span class="gl">Situação para julgar</span><span class="pm-sitv ' + (c.v === 'Pendente' ? 'pend' : 'ok') + '">' + esc(c.v) + '</span><small class="muted">' + (motivo ? motivo + ' em aberto' : 'nenhuma pendência ou intercorrência em aberto') + ' · <button type="button" class="lnk" data-sitman="1" title="Para motivo que não está nas sinalizações">marcar à mão</button></small></div>';
}

window.MutaRender = function () { render(); };
/* faixa do usuário no topo do painel, acima das abas */
function faixaUsuario(s) {
  var t0 = $('topo-u'), t = $('tu-main'); if (!t0 || !t) return;
  var pb = $('pje-bar'); if (pb && t.contains(pb) && PJE_CASA && PJE_CASA.parentNode) PJE_CASA.parentNode.insertBefore(pb, PJE_CASA);
  var saveStatus=$('tu-st');if(saveStatus&&t.contains(saveStatus))t0.appendChild(saveStatus);
  var pjeOpen=!!t.querySelector('.hero-pje-details[open]');
  t0.hidden = false;
  var on = s && s.estado === 'on';
  var q = function (attr, tit, svg) { return '<button type="button" class="tu-b" ' + attr + ' title="' + tit + '" aria-label="' + tit + '">' + SV(svg, 14) + '</button>'; };
  var ajustes=$('pv-ajustes');if(ajustes&&t.contains(ajustes))t0.appendChild(ajustes);
  t.innerHTML = '<div class="hero-cmt-brand" aria-label="HERO18810 · TRF3 Gabinete CMT"><svg class="hero-cmt-star" aria-hidden="true" fill="currentColor" viewBox="0 0 64 72"><path d="M31 0v18c0 7-5 12-12 12H0l8-8h9c6 0 10-4 10-10V4zM33 72V54c0-7 5-12 12-12h19l-8 8h-9c-6 0-10 4-10 10v8zM0 34h18c7 0 12 5 12 12v18l-8-8v-9c0-6-4-10-10-10H4zM64 38H46c-7 0-12-5-12-12V8l8 8v9c0 6 4 10 10 10h8z"/></svg><div class="hero-cmt-identity"><span>TRF3 · GABINETE CMT</span><strong>HERO <em>18810</em></strong></div></div><button type="button" id="tu-sino" class="tu-n tu-profile-trigger tu-profile-notif" aria-haspopup="dialog" aria-controls="tu-pop" aria-expanded="false" aria-label="Perfil">'+(on?'<i class="tu-av">'+esc(iniciais(s.usuario))+'</i><span class="tu-profile-name">'+esc(s.usuario)+'</span>':'<span class="tu-profile-name">Entrar</span>')+SV('<path d="m6 9 6 6 6-6"/>',11)+'<b class="tu-profile-count"></b></button><span class="tu-pje" id="tu-pje-slot"></span>' +
    q('data-tema-tu', 'Tema claro ou escuro', '<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/>');
  var utils=document.createElement('div');utils.className='hero-header-utilities';
  var tema=t.querySelector('[data-tema-tu]'),perfil=$('tu-sino');
  if(on&&s.perfil==='desembargador'){var cmt=document.createElement('a');cmt.className='hero-cmt-shortcut';cmt.href='https://www.gabinete-cmt.com/cmt/';cmt.target='_blank';cmt.rel='noopener noreferrer';cmt.title='Abrir painel do desembargador';cmt.setAttribute('aria-label',cmt.title);cmt.textContent='CMT';utils.appendChild(cmt);}
  if(tema)utils.appendChild(tema);if(ajustes)utils.appendChild(ajustes);if(perfil)utils.appendChild(perfil);t.appendChild(utils);
  var sl = $('tu-pje-slot'); if (sl && pb) { if (!PJE_CASA) { PJE_CASA = document.createComment('pje-bar'); pb.parentNode.insertBefore(PJE_CASA, pb); } sl.appendChild(pb); }
  var brand=t.querySelector('.hero-cmt-brand');
  if(brand&&sl&&pb){
    var d=document.createElement('details');d.className='hero-pje-details';d.open=pjeOpen;
    var sm=document.createElement('summary');sm.className='hero-pje-indicator';sm.title=$('pje-status').textContent;sm.setAttribute('aria-label',sm.title+' · opções do PJe');
    var dot=document.createElement('span');dot.className='hero-pje-dot';dot.setAttribute('aria-hidden','true');sm.appendChild(dot);
    d.append(sm,sl);brand.appendChild(d);
  }
  if(brand&&saveStatus)brand.appendChild(saveStatus);
  if(window.MutaAlertas&&window.MutaAlertas.sincronizarPerfil)window.MutaAlertas.sincronizarPerfil();
}
(function () { var t = $('topo-u'); if (!t) return;
  t.addEventListener('click', function (e) { var b=e.target.closest('button');if(!b)return;
  if (b.hasAttribute('data-sair')) { gravarJa().catch(function () {}).then(function () { ses.sair(); }); }
  else if (b.dataset.g === 'atualizar') { gravarJa().catch(function () {}).then(function () { carregar(true); }); }
  else if (b.hasAttribute('data-tu-ctl')) { var u=ses.estado(); if(u.estado==='on'&&u.gestor&&window.MutaAbas)window.MutaAbas.ir('ctl'); }
  else if (b.hasAttribute('data-tema-tu')) { var tb = $('pje-tema'); if (tb) tb.click(); } }); })();
/* assunto detalhado logo abaixo do assunto: o do Caput (lote) e, na falta, o da ficha, incluído aqui pelo ícone */
function adAcao(a) {
  if (a === 'ed') { G.adEd = true; render(); var t = $('pm-ad-tx'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } return; }
  if (a === 'ok') { var t2 = $('pm-ad-tx'); if (t2) { marcar('triagem.Assunto detalhado', S(t2.value).replace(/\s*\n+\s*/g, ' ')); agendar(400); } }
  G.adEd = false; render();
}
function assuntoDetalhado() {
  var lote = S(gravado('triagem', 'Registro - Assunto detalhado')), proprio = S(V('triagem', 'Assunto detalhado'));
  if (G.adEd) return '<div class="pm-ad ed"><textarea id="pm-ad-tx" rows="2" placeholder="Assunto detalhado (vai para a ficha; o Caput mostra o mesmo)">' + esc(proprio) + '</textarea><span class="pm-ad-b"><button type="button" class="btn solid sm" data-ad="ok">Gravar</button><button type="button" class="lnk" data-ad="x">cancelar</button></span></div>';
  if (lote) return '<p class="pm-ad"><span>' + esc(lote) + '</span><i class="pm-ad-o" title="Do registro da triagem no Caput">Caput</i></p>';
  if (proprio) return '<p class="pm-ad"><span>' + esc(proprio) + '</span><button type="button" class="pm-ad-i" data-ad="ed" title="Editar o assunto detalhado" aria-label="Editar">' + SV(IC.min, 12) + '</button></p>';
  return '';
}
/* sinalizações: pendências e intercorrências da ficha, uma por linha ("✓ " no início = resolvida) */
var SN = [['av', 'Aviso', 'triagem', 'Avisos'], ['pd', 'Pendência', 'triagem', 'O que falta sanar'], ['ic', 'Intercorrência', 'triagem', 'Intercorrências']];
function snLinhas(t) { var x = SN.filter(function (q) { return q[0] === t; })[0]; return S(V(x[2], x[3])).split(/\n+/).map(S).filter(Boolean); }
function tramiteMapa(){try{var m=JSON.parse(S(V('origem','Mapa de próximos passos'))||'{}');return {versao:1,passos:Array.isArray(m.passos)?m.passos:[],historico:Array.isArray(m.historico)?m.historico:[]};}catch(e){return {versao:1,passos:[],historico:[]};}}
function tramiteLog(m,p,acao,origem,extra){m.historico.push(Object.assign({id:p.id,texto:p.texto,acao:acao,origem:origem,autor:ses.estado().usuario||'',data:new Date().toISOString()},extra||{}));}
function tramiteDescricao(v){return S(v).replace(/\s*·\s*[^·]+\s*·\s*\d{2}\/\d{2}(?:\/\d{4})?(?: \d{2}:\d{2})?(?:\s*·\s*tr-[a-z0-9-]+)?$/,'');}
function tramiteIndice(L,p){return L.findIndex(function(l){return l.replace(/^✓\s*/,'')===p.vinculo;});}
function tramiteEstado(L,p){var i=tramiteIndice(L,p);return i<0?'ausente':/^✓/.test(L[i])?'resolvida':'aberta';}
function tramiteSinal(L){marcar('triagem.O que falta sanar',L.join('\n'));try{situacaoSync();}catch(e){}}
function snGravar(t, L) {
 var x=SN.filter(function(q){return q[0]===t;})[0];if(!x)return;
 if(t==='pd'){
  var m=tramiteMapa(),antes=snLinhas('pd'),mudou=false;
  m.passos.filter(function(p){return p.tipo==='pendencia'||p.condicao;}).forEach(function(p){
   var ref=p.tipo==='pendencia'?p:p.condicao,a=tramiteEstado(antes,ref),b=tramiteEstado(L,ref);if(a===b)return;
   if(b==='ausente'){var i=tramiteIndice(antes,ref);if(i>=0){if(tramiteIndice(L,ref)<0)L.push(antes[i]);st('Pendência vinculada: converta ou remova pelo Trâmite.','err');}return;}
   tramiteLog(m,p,b==='resolvida'?'pendência resolvida':'pendência reaberta','Sinalizações');mudou=true;
  });
  if(mudou)marcar('origem.Mapa de próximos passos',JSON.stringify(m));
 }
 marcar(x[2]+'.'+x[3],L.join('\n'));try{situacaoSync();}catch(e){}agendar(500);render();
}
function sinalizacoes() {
  var cont = {}, itens = [];
  SN.forEach(function (q) { snLinhas(q[0]).forEach(function (l, i) { var ok = /^✓\s*/.test(l); if (!ok) cont[q[0]] = (cont[q[0]] || 0) + 1; itens.push({ t: q[0], r: q[1], i: i, ok: ok, tx: l.replace(/^✓\s*/, '') }); }); });
  itens.sort(function (a, b) { return a.ok - b.ok; });
  var NOMES_SN = { av: ['aviso', 'avisos'], ic: ['intercorrência', 'intercorrências'], pd: ['pendência', 'pendências'] };
  var tag = function (t) { return cont[t] ? '<em class="sn-st ' + t + '">' + cont[t] + ' ' + NOMES_SN[t][cont[t] > 1 ? 1 : 0] + '</em>' : ''; };
  /* 0.49: incluir como em "Notas": botão no alto, que abre o campo com o seletor do tipo */
  return '<section class="card pc-sec sn" id="g-sn"><div class="pc-sh"><h3>' + SV(IC.sn, 13) + ' Sinalizações</h3>' + tag('ic') + tag('pd') + tag('av') + (!cont.ic && !cont.pd && !cont.av ? '<small class="muted">nada em aberto</small>' : '') +
    '<span class="sp"></span><button type="button" class="btn solid sm" data-sn-add aria-expanded="' + (G.snAb ? 'true' : 'false') + '">' + (G.snAb ? 'cancelar' : '+ Incluir sinalização') + '</button></div>' +
    (G.snAb ? '<div class="sn-n sn-novo"><select id="sn-tp" aria-label="Tipo">' + SN.map(function (q) { return '<option value="' + q[0] + '"' + ((G.snTp || 'pd') === q[0] ? ' selected' : '') + '>' + q[1] + '</option>'; }).join('') + '</select>' +
      '<textarea id="sn-tx" rows="2" placeholder="Descreva a sinalização (Enter inclui)"></textarea><button type="button" class="btn solid sm" data-sn-inc>Incluir</button></div>' : '') +
    (itens.length ? '<ul class="sn-l">' + itens.map(function (x) {
      var m = /^(.*?)\s*·\s*([^·]{2,40})\s*·\s*(\d{2}\/\d{2}(?:\/\d{4})?)$/.exec(x.tx);
      return '<li class="sn-i ' + x.t + (x.ok ? ' ok' : '') + '"><input type="checkbox" data-sn-ok="' + x.t + ':' + x.i + '"' + (x.ok ? ' checked' : '') + ' aria-label="Resolvida"><div><span class="sn-tp ' + x.t + '">' + x.r + '</span><p>' + esc(m ? m[1] : x.tx) + '</p>' + (m ? '<small>' + esc(m[2] + ' · ' + m[3]) + '</small>' : '') + '</div><button type="button" class="sn-x" data-sn-x="' + x.t + ':' + x.i + '" title="Excluir" aria-label="Excluir">×</button></li>';
    }).join('') + '</ul>' : '') +
    '<small class="muted sn-h">Intercorrência retém a liberação; pendência é o que falta sanar; aviso é só para ciência.</small></section>';
}
function snIncluir() {
  var i = $('sn-tx'), t = ($('sn-tp') || {}).value || 'pd', v = i ? S(i.value) : ''; if (!v) return;
  var u = ses.estado().usuario || '', d = new Date(), L = snLinhas(t);
  L.push(v.replace(/\s*\n+\s*/g, ' ') + ' · ' + (u || 'equipe') + ' · ' + pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1)); G.snTp = t; G.snAb = false; snGravar(t, L);
}
/* notas sobre o caso: log em origem.Observações ("DD/MM/AAAA HH:MM · autor · texto"), a nova no fim */
function notasL() { return S(V('origem', 'Observações')).split(/\n+/).map(S).filter(Boolean); }
function notas() {
  var L = notasL();
  return '<section class="card pc-sec nt" id="g-nt"><div class="pc-sh"><h3>' + SV(IC.nt, 13) + ' Anotações</h3><small class="muted">' + (L.length || 'nenhuma') + '</small><span class="sp"></span><button type="button" class="btn solid sm" data-nt-add title="Ctrl+Enter">+ Incluir nota</button></div>' +
    casoNotas() +
    (L.length ? '<ol class="nt-l">' + L.map(function (l, i) { var m = /^(\d{2}\/\d{2}\/\d{4}(?: \d{2}:\d{2})?)\s*·\s*(?:([^·]{2,40}?)\s*·\s*)?(.+)$/.exec(l);
      return '<li><p>' + esc(m ? m[3] : l) + '</p>' + (m ? '<small>' + esc([m[2], m[1]].filter(Boolean).join(' · ')) + '</small>' : '') + '<button type="button" class="sn-x" data-nt-x="' + i + '" title="Excluir esta nota" aria-label="Excluir">×</button></li>'; }).join('') + '</ol>' : '') +
    '<textarea id="nt-tx" rows="2" placeholder="Nova nota: síntese, observação, lembrete para quem vai revisar… (Ctrl+Enter inclui)"></textarea></section>';
}
/* 0.68 · síntese do processo, síntese fática e questões no card das notas, antes do log; vazio não ocupa espaço: vira um botão "+" */
var CS_AB = {};
function casoNotas() {
  var F = [['sp', 'triagem', 'Síntese Processual', 'Síntese do processo'], ['sf', 'triagem', 'Síntese Fática', 'Síntese fática']], h = '', vaz = [];
  F.forEach(function (f) { var v = S(V(f[1], f[2])); if (v || CS_AB[f[0]]) h += campoRot(f[1], f[2], f[3]); else vaz.push('<button type="button" class="nt-add" data-cs="' + f[0] + '">+ ' + f[3] + '</button>'); });

  return (h ? '<div class="gr nt-cs">' + h + '</div>' : '') + (vaz.length ? '<div class="nt-vz">' + vaz.join('') + '</div>' : '');
}
function notaIncluir() { var t = $('nt-tx'), v = t ? S(t.value).replace(/\s*\n+\s*/g, ' ') : ''; if (!v) { if (t) t.focus(); return; } var L = notasL(); L.push(agoraBr() + ' · ' + (ses.estado().usuario || 'equipe') + ' · ' + v); marcar('origem.Observações', L.join('\n')); agendar(500); render(); }
/* decisão da monocrática em botões, como na gaveta da pauta */
/* a mesma chave pode estar na ficha como texto e como lista: aqui vale a lista */
function campoLista(sec, chave) { var c = null; ((G.F && G.F.abas) || []).forEach(function (a) { (a.grupos || []).forEach(function (g) { (g.campos || []).forEach(function (x) { if (!c && x.chave === chave && (x.secao || '') === sec && x.tipo === 'lista') c = x; }); }); }); return c || campoModelo(sec, chave); }
function chips(sec, chave, curto) {
  var c = campoLista(sec, chave) || {}, v = S(V(sec, chave));
  var O = (c.opcoes || []).map(function (o) { return typeof o === 'string' ? o : o.valor; });
  return '<div class="pm-seg">' + O.map(function (o) { var r = curto ? o.split(' · ')[0] : o; return '<button type="button" class="pm-ch' + (o === v ? ' on' : '') + ' ' + (/provimento|provido|deferido/i.test(o) ? (/negado|indeferido/i.test(o) ? 'neg' : /parcial/i.test(o) ? 'par' : 'pos') : /não conhec|prejudic|extint/i.test(o) ? 'neu' : '') + '" data-ch="' + esc(sec + '.' + chave) + '" data-v="' + esc(o) + '" title="' + esc(o) + '">' + esc(r) + '</button>'; }).join('') + '</div>';
}
function monoMais() {
  var ja = { 'Hipóteses Monocrática': 1, 'Voto - Resultado': 1, 'Voto - Honorários': 1, 'Tópico-síntese': 1, 'Mono - Fundamento': 1, 'Mono - Tipo de ato': 1, 'Data da Liberação': 1, Assinado: 1, 'Data da Assinatura': 1, Destino: 1 }, L = [];
  var g1 = grupoModelo('Decisão monocrática'); (g1 ? g1.campos : []).forEach(function (c) { if (!ja[c.chave]) L.push(c); });
  var C = abaModelo(CE); (C ? C.grupos.filter(function (g) { return g.controle === 'monocratica'; }) : []).forEach(function (g) { g.campos.forEach(function (c) { if (!ja[c.chave]) L.push(c); }); });
  return L.length ? '<details class="rt-mais"><summary>Mais campos · publicação e controle</summary><div class="gr">' + L.map(campo).join('') + '</div></details>' : '';
}
function decisaoMono() {
  var ts = S(V('producao', 'Tópico-síntese'));
  return '<section class="card pc-sec pm-dec"><div class="pc-sh"><h3>' + SV(IC.dc, 13) + ' Decisão</h3><small class="muted">art. 932 do CPC</small></div>' +
    '<p class="pm-lb">Hipótese do art. 932</p>' + chips('triagem', 'Hipóteses Monocrática', true) +
    '<p class="pm-lb">Resultado</p>' + chips('producao', 'Voto - Resultado') +
    '<div class="pm-r2">' + (function () { var c = campoLista('producao', 'Voto - Honorários'); return c ? campo(Object.assign({}, c, { rotulo: 'Honorários' })) : ''; })() +
    '<div class="gf"><span class="gl">Tópico-síntese</span><span class="seg">' + ['Sim', 'Não'].map(function (x) { return '<button type="button" data-ch="producao.Tópico-síntese" data-v="' + x + '" aria-selected="' + (ts === x) + '">' + x + '</button>'; }).join('') + '</span></div></div>' +
    campoRot('producao', 'Mono - Fundamento', 'Precedente ou fundamento') + monoMais() + '</section>';
}

/* 0.52.1 · ato monocrático: sem campos que pedem relatório, voto, ementa ou acórdão (só servem à sessão) */
var SO_SESSAO = { 'Tipo de Voto': 1, 'Relatório Padronizado': 1, 'Adequação Ementa': 1, 'Formatação Subementa': 1, 'Rev - Ementa': 1, 'Rev - Subementa': 1, 'Mídias Necessárias': 1 };
function soSessao(chave) { return !!SO_SESSAO[chave] && destino() === 'monocratica'; }
function campoRot(sec, chave, rot) { if (soSessao(chave)) return ''; var c = campoModelo(sec, chave); if (!c) return ''; return campo(Object.assign({}, c, { rotulo: rot || c.rotulo })); }
/* questões do processo: uma por linha do campo "Alegações" da ficha */
function questoesLista(v) {
  return S(v).split(/(?:[;\r\n]+|\s+(?=\d{1,3}\)\s*))/).map(function(q){return S(q).replace(/^\d{1,3}\)\s*/,'').trim();}).filter(Boolean);
}
function questoes() {
  var L = questoesLista(V('triagem', 'Alegações'));
  if (G.qVazia) L.push('');
  return '<div class="gf w q-w"><span class="gl">Questões do processo</span><ol class="q-l">' + L.map(function (q, i) {
    return '<li><input type="text" data-q="' + i + '" value="' + esc(q) + '" placeholder="Questão a decidir"><button type="button" class="lnk" data-qdel="' + i + '" title="Tirar a questão">×</button></li>';
  }).join('') + '</ol><button type="button" class="btn line sm" data-qadd>+ Questão</button></div>';
}
function grupos(nomeAba, filtro, abrir) {
  var A = abaModelo(nomeAba); if (!A) return '';
  return A.grupos.filter(function (g) { return (!g.destino || g.destino === destino()) && grupoVisivel(g) && (!filtro || filtro(g)); })
    .map(function (g, i) { return grupoHtml(g, abrir ? abrir(g, i) : i < 2); }).join('');
}
/* Controles num cartão só: cada tipo com Sim/Não; com Sim, a razão (e o resto dos campos, recolhido) */
var CTL_RAZAO = { urgencia: [['triagem', 'Urgência', 'Medida'], ['triagem', 'Urgência - Observação', 'Razão']],
  meta: [],
  sobrestamento: [['controles', 'Sobrestamento - Motivo', 'Motivo'], ['controles', 'Sobrestamento - Tema', 'Tema ou precedente']],
  sensivel: [['controles', 'Sensível - Categoria', 'Categoria'], ['controles', 'Sensível - Quadro', 'Razão']] };
function ctlLista(id) { var N = naLista(); return id === 'meta' ? !!(N.metas || G.ctl.meta) : id === 'sobrestamento' ? !!(N.sobrestados || G.ctl.sobrestamento) : id === 'sensivel' ? !!N.sensiveis : false; }
function ctlSim(id) { if (id === 'meta') return vale('meta') || !!S(V('triagem', 'META')) || !!G.mostra.meta;
  return vale(id) || !!G.mostra[id] || CTL_RAZAO[id].some(function (r) { return !!S(V(r[0], r[1])); }) && !(id === 'sensivel' && V('controles', 'Sensível - Excluído') === 'Sim'); }
function ctlMarcar(id, on) {
  G.mostra[id] = on;
  if (id === 'sensivel') { marcar('controles.Sensível - Incluído', on ? 'Sim' : ''); marcar('controles.Sensível - Excluído', on ? '' : (ctlLista('sensivel') ? 'Sim' : '')); }
  else if (id === 'meta') { if (!ctlLista('meta')) marcar('triagem.META', on ? (S(V('triagem', 'META')) || 'Sim') : ''); }
  else if (!on) { var k = CTL_RAZAO[id][0]; if (!ctlLista(id)) marcar(k[0] + '.' + k[1], ''); }
  agendar(500); render();
}
function controlesProcesso(naSeta) {
  var A = abaModelo(CE); if (!A) return '';
  var gs = A.grupos.filter(function (g) { return CTL_PROC.indexOf(g.controle) >= 0; });
  var n = 0;
  var linhas = gs.map(function (g) {
    var id = g.controle, on = ctlSim(id), fixo = ctlLista(id) && id !== 'sensivel'; if (on) n++;
    var raz = CTL_RAZAO[id], usados = {}; raz.forEach(function (r) { usados[r[1]] = 1; });
    var resto = id === 'meta' && !heroV53() ? [] : g.campos.filter(function (c) { return !usados[c.chave]; });
    return '<div class="ct-i ' + id + (on ? ' on' : '') + (on && raz.length ? ' wide' : '') + '"><div class="ct-h"><b>' + esc(ROT_CE[id] === 'Sobrestado' ? 'Sobrestamento' : ROT_CE[id]) + '</b>' +
      (fixo ? '<small class="muted" title="' + esc(g.inclusao || '') + '">pelo PJe</small>' : '') +
      '<span class="seg ct-sn"><button type="button" data-ct="' + id + ':1" aria-selected="' + on + '">Sim</button><button type="button" data-ct="' + id + ':0" aria-selected="' + !on + '"' + (fixo ? ' disabled title="Vem da lista do PJe"' : '') + '>Não</button></span></div>' +
      (on && (raz.length || (heroV53()&&resto.length)) ? (raz.length?'<div class="gr ct-r">' + raz.map(function (r) { return campoRot(r[0], r[1], r[2]); }).join('') + '</div>':'') +
        (resto.length ? '<details class="ct-mais"><summary>Mais campos</summary><div class="gr">' + resto.map(campo).join('') + '</div></details>' : '') : '') + '</div>';
  }).join('');
  if (naSeta) return '<h4 class="pm-mer-h">Controles <small>' + (n ? n + ' em vigor' : 'nenhum em vigor') + '</small></h4><div class="ct-l pm-ctl2" id="g-ctl">' + linhas + '</div>';
  return '<section class="card pc-sec" id="g-ctl"><div class="pc-sh"><h3>Controles</h3><small class="muted">' + (n ? n + ' em vigor' : 'nenhum em vigor') + '</small></div><div class="ct-l">' + linhas + '</div></section>';
}
/* precedentes relacionados do processo aberto: no topo da aba Ementário */
function casoPrec() { return { cnj: G.cnj, assunto: assuntoCNJ(),
    subassuntos: S(gravado('triagem', 'Registro - Assunto detalhado')) || S(V('triagem', 'Assunto detalhado')), questoes: S(V('triagem', 'Alegações')),
    sintese: [S(V('triagem', 'Síntese Processual')), S(V('triagem', 'Síntese Fática'))].join(' '), especificidades: [S(V('triagem', 'Especificidades')), S(V('triagem', 'Tema'))].join(' ') }; }
function precEmentario(k) { if (window.MutaEmentario && window.MutaEmentario.caso) window.MutaEmentario.caso(k); }
/* peças do processo (sentença, origem, recursos e contrarrazões, outras peças): um cartão só, uma seção por grupo */
/* 0.44 · grupos de documento vindos do Roteiro (em Autos › Peças e documentos): os campos são os mesmos da ficha */
var PECAS_DOC = [
  { grupo: 'Decisão impugnada', quando: function (tj) { return /agravo de instrumento|agravo interno|embargos|retrata/.test(tj) || !!S(V('triagem', 'Impugnada - ID')); },
    campos: [['triagem', 'Impugnada - ID'], ['triagem', 'Impugnada - Data'], ['triagem', 'Impugnada - Publicação'], ['triagem', 'Impugnada - Síntese'], ['triagem', 'Impugnada - Ementa literal'], ['triagem', 'Impugnada - Órgão'], ['triagem', 'Impugnada - Relator']] },
  { grupo: 'Parecer do MPF', campos: [['triagem', 'MPF'], ['triagem', 'ID do Parecer MPF'], ['triagem', 'MPF - Data'], ['triagem', 'Parecer - Sentido'], ['triagem', 'Parecer - Sentido (outro)'], ['triagem', 'MPF - Info adicional']] },
  { grupo: 'Procuração', campos: [['triagem', 'ID da Procuração'], ['triagem', 'Procurações']] }
];
var PECAS_ORDEM = { 'Sentença': ['Sentença - ID', 'Sentença - Data', 'Sentença - Publicação', 'Sentença - Decisão', 'Sentença - Resultado', 'Sentença - Honorários', 'Sentença - Custas', 'Sentença - Reexame', 'Sentença - Tutela', 'Sentença - Fundamento', 'Sentença - Providências'],
  'Origem': ['Origem - Juízo', 'Origem - Julgador', 'Origem - Valor da causa', 'Origem - Processo de referência', 'Origem - Documentos 1G'],
  'Recursos e contrarrazões': ['Contrarrazões - Situação', 'Recursos', 'Contrarrazões'] };
var PECAS_RESUMO = { 'Decisão impugnada': ['Impugnada - ID', 'Impugnada - Data'], 'Parecer do MPF': ['MPF', 'ID do Parecer MPF', 'Parecer - Sentido'], 'Procuração': ['ID da Procuração'], 'Sentença': ['Sentença - ID', 'Sentença - Data', 'Sentença - Decisão'], 'Origem': ['Origem - Juízo', 'Origem - Julgador'], 'Recursos e contrarrazões': ['Recursos', 'Contrarrazões - Situação'], 'Outras peças e ocorrências': ['Outras peças'] };
/* Dados dos autos: as faixas são tópicos estáticos, não novos níveis de expansão. */
function heroDadosTopico(c,g){
 var k=c.chave||'';
 if(g==='1º grau')return /^Origem - (Documentos|Peças vinculadas)/.test(k)?'Documentos vinculados':/^Origem -/.test(k)?'Origem':/^(Sentença -|1G - Sentença)/.test(k)?'Sentença':/^1G - Decisão/.test(k)?'Decisão interlocutória':'Outros dados';
 if(g==='2º grau')return /^2G - Monocrática/.test(k)?'Decisão monocrática':/^(2G - Acórdão|Acórdão -)/.test(k)?'Acórdão':/^Impugnada -/.test(k)?'Decisão impugnada':/Sucumbência/.test(k)?'Sucumbência':'Outros dados';
 if(g==='Recursos e contrarrazões')return /^(Recursos|Contrarrazões)/.test(k)?'Registros recursais':'Questões incidentais';
 if(g==='Teor dos autos · Documentos e peças')return /^Autos -/.test(k)?'Extração':'Classificação e registros';
 return g;
}
function heroDadosEstado(n,t){return n===t?'completo':n?'parcial':'vazio';}
function heroDadosIndicador(n,t){return '<span class="hero-data-ind" data-status="'+heroDadosEstado(n,t)+'" title="'+n+' de '+t+' campos preenchidos"><i aria-hidden="true"></i>'+n+'/'+t+'</span>';}
function heroDadosGrupos(C,g,val){
 var topics=new Map();C.forEach(function(c){var h=campo(c);if(!h)return;var t=heroDadosTopico(c,g);if(!topics.has(t))topics.set(t,[]);topics.get(t).push({c:c,h:h,v:val(c)});});
 return Array.from(topics).map(function(pair){var t=pair[0],L=pair[1],n=L.filter(function(x){return !!x.v;}).length;return '<section class="hero-data-topic"><header class="hero-data-topic-head"><span>'+esc(t)+'</span>'+heroDadosIndicador(n,L.length)+'</header><div class="gr hero-data-fields">'+L.map(function(x){var c=x.c,w=c.tipo==='tabela'||c.tipo==='texto-longo'||/Honorários|Resultado/.test(c.chave)||/\bclass="gf[^"]*\bw\b/.test(x.h);return '<div class="hero-data-entry'+(w?' wide':'')+'" data-filled="'+!!x.v+'" data-label="'+esc(c.rotulo||c.chave)+'">'+x.h+'</div>';}).join('')+'</div></section>';}).join('');
}
var heroDadosView={cnj:'',mode:'all',q:''};
function heroDadosFiltros(){
 var root=caixa.querySelector('#g-docs .hero-doc-data');if(!root)return;
 if(heroDadosView.cnj!==G.cnj)heroDadosView={cnj:G.cnj,mode:'all',q:''};
 var bar=root.querySelector('.hero-data-toolbar');if(!bar)return;
 var q=bar.querySelector('input'),buttons=bar.querySelectorAll('[data-dados-mode]');q.value=heroDadosView.q;
 function apply(){
 var term=normalDados( heroDadosView.q);
 buttons.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.dadosMode===heroDadosView.mode));});
 root.querySelectorAll('details[data-grupo]').forEach(function(d){var total=0;d.querySelectorAll('.hero-data-topic').forEach(function(s){var n=0;s.querySelectorAll('.hero-data-entry').forEach(function(f){var filled=f.dataset.filled==='true',match=heroDadosView.mode==='all'||(heroDadosView.mode==='filled'?filled:!filled),txt=normalDados(f.dataset.label+' '+f.textContent+' '+Array.from(f.querySelectorAll('input,textarea,select')).map(function(x){return x.value;}).join(' '));f.hidden=!match||!!term&&!txt.includes(term);if(!f.hidden)n++;});s.hidden=!n;total+=n;});d.hidden=!total;if(total&&term)d.open=true;});
 var empty=root.querySelector('.hero-data-empty');if(empty)empty.hidden=Array.from(root.querySelectorAll('details[data-grupo]')).some(function(d){return !d.hidden;});
 }
 function normalDados(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
 q.oninput=function(){heroDadosView.q=q.value;apply();};buttons.forEach(function(b){b.onclick=function(){heroDadosView.mode=b.dataset.dadosMode;apply();};});bar.querySelector('[data-dados-collapse]').onclick=function(){heroDadosView.q='';q.value='';apply();root.querySelectorAll('details[data-grupo]').forEach(function(d){d.open=false;});};apply();
}
function pecasCartao(soGrupos) {
  var A = abaModelo('Processo'); if (!A) return '';
  var AU = window.MutaAutos;
  var gs = A.grupos.filter(function (g) { return !FORA_PROC[g.grupo] && grupoVisivel(g) && (!heroV53()||g.grupo!=='Caso, Conteúdo e Questões'); });
  /* 0.44: as informações de documento do Roteiro (decisão impugnada, parecer do MPF, procuração) também moram aqui, em Peças e documentos */
  if (soGrupos) {
    var tj = N(V('triagem', 'Tipo de Julgamento')), outras = -1;
    gs.forEach(function (g, i) { if (outras < 0 && /^Outras pe/.test(g.grupo)) outras = i; });
    var extra = PECAS_DOC.filter(function (d) { return !d.quando || d.quando(tj); }).map(function (d) {
      return { grupo: d.grupo, campos: d.campos.map(function (k) { return campoModelo(k[0], k[1]); }).filter(Boolean) }; }).filter(function (g) { return g.campos.length; });
    if (extra.length) gs = outras < 0 ? gs.concat(extra) : gs.slice(0, outras).concat(extra, gs.slice(outras));
  }
  if(heroV53()){var seenDocs=new Set();gs=gs.map(function(g){return Object.assign({},g,{campos:g.campos.filter(function(c){var id=c.secao+'.'+c.chave;if(seenDocs.has(id))return false;seenDocs.add(id);return true;})});}).filter(function(g){return g.campos.length;});}
  if (!gs.length) return '';
  var val = function (c) { var v = c.secao ? V(c.secao, c.chave) : fonteVal(c); return Array.isArray(v) ? (v.length ? v.length + ' item(ns)' : '') : S(v); };var fluid=heroV53()&&soGrupos&&AU&&AU.estado().docAba==='ficha';var tool=fluid?'<div class="hero-data-toolbar hero-rep-search"><div class="hero-rep-query"><input type="search" aria-label="Localizar campo" placeholder="Localizar campo…"><button type="button" class="tu-b" data-dados-collapse title="Recolher grupos" aria-label="Recolher grupos">−</button></div><div class="hero-rep-filters" role="group" aria-label="Filtrar campos"><button type="button" class="chip" data-dados-mode="all">Todos</button><button type="button" class="chip" data-dados-mode="filled">Preenchidos</button><button type="button" class="chip" data-dados-mode="empty">A preencher</button></div></div>':'';
  return (soGrupos ? '' : '<section class="card pc-sec pecas" id="g-pecas"><div class="pc-sh"><h3>Peças</h3><small class="muted">da ficha do processo</small></div>') + tool + gs.map(function (g) {
    var ord = PECAS_ORDEM[g.grupo] || [], C = g.campos.slice().sort(function (a, b) { var ia = ord.indexOf(a.chave), ib = ord.indexOf(b.chave); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
    var n = C.filter(function (c) { return !!val(c); }).length, ab = G.pecAb && G.pecAb[g.grupo] != null ? G.pecAb[g.grupo] : false;
    var res = (PECAS_RESUMO[g.grupo] || []).map(function (k) { var c = C.filter(function (x) { return x.chave === k; })[0]; var v = c ? val(c) : ''; return /^\d{4}-\d{2}-\d{2}$/.test(v) ? brD(v) : k.indexOf('ID') >= 0 && v ? 'ID ' + v : v; }).filter(Boolean).join(' · ');
    /* no agravo de instrumento a "Sentença" da ficha guarda a decisão agravada */
    var titulo = g.grupo === 'Teor dos autos · Documentos e peças' ? 'Extração e outras peças' : g.grupo === 'Sentença' && /agravo de instrumento/i.test(((G.fo || {})['classe_judicial'] || (G.fo || {})['Classe'] || '') + ' ' + V('triagem', 'Tipo de Julgamento')) ? 'Decisão agravada' : g.grupo;
    if(fluid){var tones={'1º grau':'origin','2º grau':'appeal','Recursos e contrarrazões':'resources','Parecer do MPF':'mpf','Procuração':'mandate','Teor dos autos · Documentos e peças':'extract'};var visible=C.filter(function(c){return !c.legado&&c.chave!=='Padrão - Espécie';});return '<details class="pc-s hero-data-group" data-tone="'+(tones[g.grupo]||'extract')+'"'+(ab?' open':'')+' data-grupo="'+esc(g.grupo)+'"><summary><span class="hero-data-dot" aria-hidden="true"></span><span class="pc-s-t"><b>'+esc(titulo)+'</b></span>'+heroDadosIndicador(visible.filter(function(c){return !!val(c);}).length,visible.length)+'</summary>'+pecaExtracao(C,val)+heroDadosGrupos(C,g.grupo,val)+'</details>';}
    return '<details class="pc-s"' + (ab ? ' open' : '') + ' data-grupo="' + esc(g.grupo) + '"><summary><span class="pc-s-t"><b>' + esc(titulo) + '</b>' + (res ? '<small>' + esc(res.slice(0, 120)) + '</small>' : '<small class="vz">sem registro</small>') + '</span><span class="gn">' + n + '/' + C.length + '</span></summary>' +
      (AU && AU.docsDoGrupo ? AU.docsDoGrupo(g.grupo) : '') + pecaExtracao(C, val) + '<div class="gr">' + C.map(campo).join('') + '</div></details>';
  }).join('') + (fluid?'<p class="muted hero-data-empty" hidden>Nenhum campo correspondente.</p>':'') + (soGrupos ? '' : '</section>');
}
/* extrair da peça: o ID e a data vêm da cronologia; o resto (decisão, resultado, honorários…) só do texto da peça.
   O botão lê o texto (se ainda não lido) e preenche os campos vazios do grupo; nunca troca o que já está gravado. */
function pecaIdDe(C, val) {
  for (var i = 0; i < C.length; i++) { if (/(^|\s|-\s)ID(\s|$)|^ID\b/.test(C[i].chave)) { var v = S(val(C[i])).split(/[,;\s]+/).filter(function (x) { return /^\d{6,}$/.test(x); }); if (v.length) return v[v.length - 1]; } }
  return '';
}
function pecaSug(C) {
  var AU = window.MutaAutos; if (!AU || !AU.sugestoes) return [];
  var ids = {}; C.forEach(function (c) { if (c.secao) ids[c.secao + '.' + c.chave] = 1; });
  var vazio = function (alvo) { var i = alvo.indexOf('.'), v = V(alvo.slice(0, i), alvo.slice(i + 1)); return Array.isArray(v) ? !v.length : !S(v); };
  return AU.sugestoes().filter(function (x) { return !x.manual && x.alvo && ids[x.alvo] && x.status === 'novo' && vazio(x.alvo) && (Array.isArray(x.value) ? x.value.length : S(x.value)); });
}
function pecaExtracao(C, val) {
  var AU = window.MutaAutos; if (!AU || !AU.estado || !C.some(function (c) { return c.secao; })) return '';
  var EA = AU.estado();
  if (!EA.itens) return '<div class="pc-x"><small class="muted">Leia os autos (aba Autos) para extrair desta peça.</small></div>';
  var id = pecaIdDe(C, val), d = id ? EA.docs[id] : null, sug = pecaSug(C), h = '';
  if (sug.length) h += '<button type="button" class="btn solid sm" data-pec-apl="' + esc(id) + '" title="' + esc(sug.map(function (x) { return x.label || x.key; }).join(' · ')) + '">Preencher ' + sug.length + ' campo' + (sug.length > 1 ? 's' : '') + ' pela leitura</button>';
  if (id && (!d || d.estado === 'erro')) h += '<button type="button" class="btn ' + (sug.length ? 'line' : 'solid') + ' sm" data-pec-ler="' + esc(id) + '" title="Lê o texto da peça no PJe e preenche os campos vazios">Extrair da peça (ID ' + esc(id) + ')</button>' + (d && d.estado === 'erro' ? '<small class="err">' + esc(d.erro || 'erro na leitura') + '</small>' : '');
  else if (d && d.estado === 'lendo') h += '<small class="muted">lendo a peça ' + esc(id) + (d.prog ? ' · ' + esc(d.prog) : '') + '…</small>';
  else if (d && d.estado === 'sem') h += '<button type="button" class="btn solid sm" data-pec-ocr="' + esc(id) + '" title="A peça não tem camada de texto (digitalizada)">Ler com OCR e preencher</button>';
  else if (d && d.estado === 'ok' && !sug.length) {
    var vz = C.filter(function (c) { return c.secao && !val(c); }).map(function (c) { return c.rotulo || c.chave; });
    if (vz.length) h += '<small class="muted">Peça lida' + (d.ocr ? ' por OCR' : '') + '; a leitura não identificou: ' + esc(vz.join(', ')) + '. Preencha à mão.</small>';
  }
  if (!id && !sug.length) h += '<small class="muted">Sem ID da peça na ficha nem na cronologia lida.</small>';
  return h ? '<div class="pc-x">' + h + '</div>' : '';
}
function pecaPreencher(id) {
  var A = abaModelo('Processo'); if (!A) return 0;
  var C = []; A.grupos.forEach(function (g) { if (!FORA_PROC[g.grupo]) C = C.concat(g.campos); });
  var val = function (c) { var v = c.secao ? V(c.secao, c.chave) : fonteVal(c); return Array.isArray(v) ? (v.length ? '1' : '') : S(v); };
  /* só os campos dos grupos que citam esta peça (ou, sem ID, todos os da leitura) */
  var gs = A.grupos.filter(function (g) { return !FORA_PROC[g.grupo] && (!id || pecaIdDe(g.campos, val) === id); });
  var L = []; gs.forEach(function (g) { L = L.concat(pecaSug(g.campos)); });
  L.forEach(function (x) { marcar(x.alvo, x.value); });
  if (L.length) agendar(300);
  render(); return L.length;
}
/* 0.60 · Sinalizações e notas do caso: card recolhível no painel superior do prontuário (vale em Processo e em Autos) */
var SN_AB = null, SN_HTML = '';
var CAB_HTML = '';
function snCard() {
  var si = sinalizacoes(), nt = notas(), rg = grupos('Processo', function (g) { return g.grupo === 'Registro no acervo'; }, function () { return false; });
  /* 0.66: síntese do processo, síntese fática e questões antes das notas; notas acima das sinalizações */
  var cs = ''; /* 0.68: síntese e questões estão dentro do card das notas (casoNotas) */
  SN_HTML = cs + si + nt;
  var n = (si.match(/class="sn-i [a-z]+"/g) || []).length;
  var ab = SN_AB != null ? SN_AB : n > 0;
  /* 0.62: 3ª seta do cartão do processo (fundo cinza), no formato de "autuação e partes" */
  return '<details class="pm-aut pm-sn"' + (ab ? ' open' : '') + '><summary aria-label="Síntese, notas e sinalizações" title="Síntese, notas e sinalizações"><span class="pm-aut-t">síntese · notas · sinalizações' + (n ? ' · <b class="pm-sn-n">' + n + ' em aberto</b>' : '') + '</span><i class="pm-aut-h"></i></summary><div class="sn-b">' + cs + nt + si + rg + '</div></details>';
}
/* 0.64 · Síntese e questões: painel acima do seletor dos roteiros (vale para a triagem e para a produção) */
var SQ_AB = null, SQ_HTML = '';
function sinteseQuestoes() {
  var tc = S(V('triagem', 'Tema')), sp = S(V('triagem', 'Síntese Processual')), nq = S(V('triagem', 'Alegações')).split(/\n+/).filter(function (x) { return S(x); }).length;
  var vazio = !tc && !sp && !nq, ab = SQ_AB != null ? SQ_AB : vazio;
  SQ_HTML = campoRot('triagem', 'Detalhamento do caso', 'Detalhamento do caso') + campoRot('triagem', 'Síntese Processual', 'Síntese do processo') + questoes();
  var res = [tc || 'sem tipo de caso', nq ? nq + (nq > 1 ? ' questões' : ' questão') : 'sem questões', sp ? 'síntese preenchida' : 'sem síntese'].join(' · ');
  return '<details class="card sq-card"' + (ab ? ' open' : '') + '><summary><b>Síntese e questões</b><small>' + esc(res) + '</small></summary><div class="gr">' + SQ_HTML + '</div></details>';
}

/* Análise e Indexação: modelo atual e lote de produção; registros importados permanecem históricos.
   Mesmas chaves da ficha. Uma seção operacional no início da Produção, recolhida por processo. */
var PROD_INDEX_STATE={cnj:'',open:false};
function producaoIndexCampos(){
 var A=grupoModelo('Análise e Indexação'),B=grupoModelo('Lote e correção (Index)'),seen=new Set();
 return (A&&A.campos||[]).concat(B&&B.campos||[]).filter(function(c){var k=c.secao+'.'+c.chave;if(seen.has(k))return false;seen.add(k);return true;});
}
function producaoIndex(){
 if(PROD_INDEX_STATE.cnj!==G.cnj)PROD_INDEX_STATE={cnj:G.cnj,open:false};
 var fields=producaoIndexCampos(),M=(window.MUTA_WEB&&window.MUTA_WEB.matriz)||{},sg=window.MutaSigilo;
 if(sg&&(sg.bloqueado()||sg.sigiloso()))return '';
 function find(k){return fields.find(function(c){return c.chave===k;});}
 function render(c){return c?campo(c):'';}
 function ro(label,value){return '<div class="gf w"><span class="gl">'+esc(label)+'</span><span class="ro">'+esc(S(value)||'—')+'</span></div>';}
 function hist(k,fallback){var c=find(k);if(c&&S(V(c.secao,c.chave)))return render(Object.assign({},c,{editavel:false}));return ro(c?c.rotulo:k,fallback);}
 function sub(title,content){return content?'<section class="hero-prod-index-group"><h4 class="pm-mer-h">'+esc(title)+'</h4><div class="gr">'+content+'</div></section>':'';}
 var model=['Modelo aplicável','Variação do modelo'],lote=fields.filter(function(c){return ['Lote','Lote - Tipo de caso','Lote - Variações','Lote - Caso'].indexOf(c.chave)>=0;}),histKeys=['Registro - Lote','Registro - Grupo','Registro - Variações','Registro - Modelo'];
 var title=S(V('producao','Modelo aplicável')),lot=S(V('producao','Lote')),desc=[lot?'Lote '+lot:'',title].filter(Boolean).join(' · ');
 var histBody=hist(histKeys[0],M.lote)+hist(histKeys[1],M.grupo)+hist(histKeys[2],M.variacoes)+hist(histKeys[3],M.modelo);
 if(S(M.proposta)||S(V('triagem','Registro - Proposta')))histBody+=ro('Proposta registrada na triagem',V('triagem','Registro - Proposta')||M.proposta);
 if(S(M.resultado))histBody+=ro('Resultado proposto pelo grupo · histórico',M.resultado);
 return '<details id="hero-prod-index" class="card gg hero-prod-index"'+(PROD_INDEX_STATE.open?' open':'')+'><summary><h4>Análise e Indexação</h4><span class="gn">'+esc(desc||'Modelo e lote')+'</span></summary>'+
 sub('Modelo de produção',model.map(function(k){return render(find(k));}).join(''))+
 sub('Referências do lote',lote.map(render).join(''))+
 '<details class="gg hero-prod-index-history"><summary><h4>Indexação de origem · histórico</h4></summary><div class="gr">'+histBody+'</div></details>'+
 '</details>';
}
document.addEventListener('toggle',function(e){var d=e.target;if(d&&d.id==='hero-prod-index'&&d.isConnected&&PROD_INDEX_STATE.cnj===G.cnj)PROD_INDEX_STATE.open=d.open;},true);


/* Produção é o roteiro de redação, não um espelho da ficha nem um controle administrativo. */
function fichaFacePermitida(){
 var u=ses&&ses.estado?ses.estado():null;
 return !!(u&&u.estado==='on'&&u.gestor&&G.gestor&&N(u.usuario)==='bruno');
}
var HERO_MINUTA_NAV={cnj:'',sec:'relatorio',todos:false};
function producaoMinuta(){
 if(HERO_MINUTA_NAV.cnj!==G.cnj)HERO_MINUTA_NAV={cnj:G.cnj,sec:'relatorio',todos:false};
 var ui=window.MutaRoteiro;if(!ui||!ui.painel)return '<p class="muted">Roteiro indisponível.</p>';var nav=[],counts={n:0,filled:0},phaseAtual='',avancou=true;
 var sg=window.MutaSigilo;if(sg&&sg.bloqueado())return '<p class="muted">Acesso restrito.</p>';
 var T=ccTipos(),p=pronAtual(),d=destGrav(),desp=p===3||p===7||d==='Outro destino',ac=p===0||p<0&&d==='Sessão',urg=p===2||p===8,hom=p===6,mono=!ac&&p>=0,seen=new Set();
 function field(sec,k,rot,extras){
  var id=sec+'.'+k,c=campoModelo(sec,k);if(!c||seen.has(id))return '';seen.add(id);
  var htmlCampo=campo(Object.assign({},c,rot?{rotulo:rot}:{},extras||{}));
  if(htmlCampo){var v=V(sec,k);counts.n++;if(Array.isArray(v)?v.length>0:v!=null&&S(v)!=='')counts.filled++;}
  return htmlCampo;
 }
 function prod(keys){return keys.map(function(k){return Array.isArray(k)?field('producao',k[0],k[1]):field('producao',k);}).join('');}
 function block(id,title,h,open){
  if(!h)return '';var st=counts;counts={n:0,filled:0};nav.push({id:id,title:title,n:st.n,filled:st.filled});
  var active=HERO_MINUTA_NAV.sec===id,state=CC_ABERTO['minuta-'+id],expanded=HERO_MINUTA_NAV.todos?(state==null?open:state):active&&!HERO_MINUTA_NAV.fechada;
  var status=st.n&&st.filled===st.n?'ok':st.filled?'partial':'pend',number=String(nav.length).padStart(2,'0'),advance=avancou&&status==='ok';if(status!=='ok')avancou=false;
  var fase=id==='relatorio'||id==='questoes'?'rel':id==='solucao'||id==='fundamentacao'?'fund':'fim',prefix='';
  nav[nav.length-1].fase=fase;
  if(phaseAtual!==fase){phaseAtual=fase;prefix='@@FASE_'+fase+'@@';}
  return prefix+ui.inicioEtapa({status:status,open:expanded,advance:advance,number:number,state:(status==='ok'?'Concluído':status==='partial'?'Em elaboração':'Pendente')+' · '+st.filled+'/'+st.n+' registrados',title:title,search:title+' '+h.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,15000),attr:'data-minuta-nav',key:'step:'+id,cardAttrs:' data-cc="minuta-'+id+'"'+(id==='solucao'?' id="pv-julgamento"':'')})+(expanded?'<div class="rt-b"><div class="gr">'+h+'</div></div>':'')+'</div></li>';

 }
 function value(v){return Array.isArray(v)?v.length+' registro(s)':S(v);}
 function ref(title,keys){var vals=keys.map(function(k){return value(V(k[0],k[1]));}).filter(Boolean);return '<div class="gf w hero-minuta-ref"><span class="gl">'+esc(title)+'</span><span class="ro">'+esc(vals.join(' · ')||'A conferir nos Autos')+'</span></div>';}
 function resultado(){
  var L=['Provido','Parcialmente provido','Desprovido','Não conhecido','Prejudicado','Anulado'];
  if(urg)L=['Deferido','Parcialmente deferido','Indeferido','Prejudicado'];
  else if(hom)L=['Homologado','Extinto'];
  else{var types=[];if(T.ed)types=types.concat(['Rejeitados','Acolhidos sem efeito infringente','Acolhidos com efeito infringente','Não conhecido']);if(T.ret||p===5)types=types.concat(['Retratação exercida','Acórdão mantido']);if(T.rn)types=types.concat(['Sentença confirmada','Sentença parcialmente reformada','Sentença reformada','Não conhecida']);if(T.ms)types=types.concat(['Concedido','Parcialmente concedido','Denegado','Extinto']);if(types.length)L=(T.ap||T.ai||T.agint?L:[]).concat(types);}
  var atual=S(V('producao','Voto - Resultado')), aliases={'negado provimento':'Desprovido','negar provimento':'Desprovido','dado provimento':'Provido','dar provimento':'Provido','dado parcial provimento':'Parcialmente provido','dar parcial provimento':'Parcialmente provido','nao conhecer':'Não conhecido'};
  var normal=window.VOC&&typeof window.VOC.norm==='function'?window.VOC.norm('resJulg',atual):atual;
  if(L.indexOf(normal)<0)normal=aliases[N(atual)]||atual;
  return field('producao','Voto - Resultado','Resultado proposto',{tipo:'lista',opcoes:Array.from(new Set(L)),valorExibicao:L.indexOf(normal)>=0?normal:atual});
 }
 var AU=window.MutaAutos,auto=AU&&AU.barra?AU.barra():'',h='<div class="rt-em-proc hero-route-production">@@HERO_MINUTA_NAV@@<div class="hero-route-aux">'+auto+'</div><ol class="rt" aria-label="Etapas do roteiro de produção">';
 var rel='<div class="gf w"><small class="muted">Relatório: dados recuperados da ficha, sem nova transcrição.</small></div>';
 if(!(sg&&sg.sigiloso())){
  rel+=ref('Decisão recorrida / atos de referência',[['triagem','Impugnada - ID'],['origem','Sentença - ID'],['origem','1G - Decisão ID'],['origem','2G - Monocrática ID'],['producao','Acórdão - ID']]);
  rel+=ref('Recursos',[['origem','Recursos']])+ref('Respostas',[['origem','Contrarrazões']])+ref('Parecer',[['triagem','MPF'],['triagem','ID do Parecer MPF']]);
 }
 rel+='<div class="gf w"><button type="button" class="btn line sm" data-minuta-autos>Consultar peças e documentos nos Autos</button></div>';
 rel+=prod(['Particularidades do relatório']);
 h+=block('relatorio','Relatório',rel,true);
 var Q=questoesLista(V('triagem','Alegações')),q='<div class="gf w"><span class="gl">Questões da ficha</span>'+(Q.length?'<ol class="hero-minuta-questoes">'+Q.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ol>':'<span class="ro">Nenhuma questão registrada.</span>')+'<button type="button" class="lnk" data-minuta-caso>Editar no cartão Caso, Conteúdo e Questões</button></div>';
 q+=field('triagem','Questões jurídicas individualizadas')+prod(['Objeto do recurso','Objeto devolvido','Limites do julgamento','Matérias de ofício']);h+=block('questoes','Questões a decidir',q,true);
 if(!desp){
  var sol=prod(['Conhecimento do recurso','Extensão do conhecimento','Preliminares acolhidas','Preliminares rejeitadas','Prejudiciais de mérito'])+resultado();
  var rec=V('origem','Recursos'),res=V('producao','Resultado por recurso');
  if(typeof rec==='string')try{rec=JSON.parse(rec);}catch(e){}if(typeof res==='string')try{res=JSON.parse(res);}catch(e){}
  if((Array.isArray(rec)&&rec.length>1)||(Array.isArray(res)&&res.length)||T.rn&&T.ap||Object.keys(T).filter(function(k){return T[k];}).length>1)sol+=field('producao','Resultado por recurso');
  var species={'Apelação':'ap','Remessa':'rn','AI':'ai','ED':'ed','AgInt':'agint','JR':'ret','MS':'ms'},g=grupoModelo('Questões específicas da espécie');
  (g&&g.campos||[]).forEach(function(c){var k=species[c.chave.split(' - ')[0]];if(!k||T[k]||S(V(c.secao,c.chave)))sol+=field(c.secao,c.chave);});
  h+=block('solucao','Solução do julgamento',sol,true);
 }
 var fund=field('triagem','Questões jurídicas individualizadas')+prod(['Tese jurídica adotada','Dispositivos legais aplicáveis','Precedentes aplicáveis','Distinção de precedente','Aplicação ao caso concreto']);
 if(mono)fund+=prod(['Mono - Fundamento']);
 fund+=prod([['Voto - Descrição','Desenvolvimento / detalhes da minuta'],'Tópico-síntese']);
 if(ac||S(V('triagem','Tipo de Voto')))fund+=field('triagem','Tipo de Voto');
 h+=block('fundamentacao','Fundamentação',fund,false);
 if(!desp&&!urg){
  var suc='<div class="gf w"><small class="muted">Compare a solução proposta com a sucumbência da decisão recorrida, registrada nos Autos.</small><button type="button" class="lnk" data-minuta-autos>Consultar decisão recorrida</button></div>';
  suc+=prod(['Voto - Honorários','Honorários - Percentual ou valor','Honorários - Base de cálculo','Honorários recursais','Fundamento da sucumbência','Custas no julgamento','Gratuidade no julgamento','Natureza da condenação','Consectários no julgamento','Juros e correção monetária','Termo inicial dos efeitos']);
  h+=block('sucumbencia','Sucumbência e consectários',suc,false);
 }
 h+=block('dispositivo','Dispositivo',prod(['Extensão da reforma','Capítulos mantidos','Capítulos reformados','Providências determinadas','Dispositivo do pronunciamento']),false);
 var idx=nav.findIndex(function(x){return x.id===HERO_MINUTA_NAV.sec;});
 if(idx<0){HERO_MINUTA_NAV.sec=nav[0]?nav[0].id:'';return producaoMinuta();}
 var totalCampos=nav.reduce(function(n,x){return n+x.n;},0),F=nav.reduce(function(n,x){return n+x.filled;},0);
 var labels={relatorio:'Relatório',questoes:'Questões',solucao:'Solução',fundamentacao:'Fundamentos',sucumbencia:'Sucumbência',dispositivo:'Dispositivo'};
 var toolbar=ui.painel({title:'Roteiro de produção',total:F+'/'+totalCampos,caption:F+'/'+totalCampos+' campos registrados',pct:totalCampos?Math.round(F/totalCampos*100):0,metrics:[['ok','Registradas',nav.filter(function(x){return x.n&&x.filled===x.n;}).length],['partial','Parciais',nav.filter(function(x){return x.filled&&x.filled<x.n;}).length],['pend','A preencher',nav.filter(function(x){return !x.filled;}).length]],attr:'data-minuta-nav',index:idx,length:nav.length,prev:'anterior',next:'proximo',focus:'focus',listKey:'list',list:HERO_MINUTA_NAV.todos,collapse:'recolher'});
 var phaseNames={rel:'Relatório e questões',fund:'Solução e fundamentação',fim:'Conclusão do pronunciamento'};
 Object.keys(phaseNames).forEach(function(k){var steps=nav.filter(function(x){return x.fase===k;});h=h.replace('@@FASE_'+k+'@@',ui.fase(phaseNames[k],steps.filter(function(x){return x.n&&x.filled===x.n;}).length,steps.length,0));});
 return h.replace('@@HERO_MINUTA_NAV@@',toolbar)+'</ol></div>';
}
caixa.addEventListener('click',function(e){
 var b=e.target.closest&&e.target.closest('[data-minuta-nav],[data-minuta-autos],[data-minuta-caso]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(b.hasAttribute('data-minuta-nav')){
 var k=b.getAttribute('data-minuta-nav'),L=Array.from(caixa.querySelectorAll('.hero-route-production [data-cc^="minuta-"]')).map(function(x){return x.getAttribute('data-cc').slice(7);}),i=L.indexOf(HERO_MINUTA_NAV.sec);
 if(k.indexOf('step:')===0){var id=k.slice(5),open=b.getAttribute('aria-expanded')==='true';HERO_MINUTA_NAV.sec=id;if(HERO_MINUTA_NAV.todos)CC_ABERTO['minuta-'+id]=!open;else HERO_MINUTA_NAV.fechada=open;}
 else if(k==='focus'){HERO_MINUTA_NAV.todos=false;HERO_MINUTA_NAV.fechada=false;}
 else if(k==='list'){HERO_MINUTA_NAV.todos=true;L.forEach(function(id){CC_ABERTO['minuta-'+id]=id===HERO_MINUTA_NAV.sec;});}
 else if(k==='recolher'){HERO_MINUTA_NAV.todos=true;L.forEach(function(id){CC_ABERTO['minuta-'+id]=false;});}
 else if(k==='anterior'||k==='proximo'){var id=L[Math.max(0,Math.min(L.length-1,i+(k==='anterior'?-1:1)))];if(id){HERO_MINUTA_NAV.sec=id;HERO_MINUTA_NAV.fechada=false;if(HERO_MINUTA_NAV.todos)CC_ABERTO['minuta-'+id]=true;}}
 else if(L.indexOf(k)>=0){HERO_MINUTA_NAV.sec=k;HERO_MINUTA_NAV.fechada=false;}
 render();return;}
 if(b.hasAttribute('data-minuta-autos')){G.aba='Autos';render();return;}
 heroTopo.pagina=3;render();var p=caixa.querySelector('.hero-top-pages');if(p)p.scrollIntoView({block:'start'});
},true);

function corpoProcesso() {
  /* 0.60: a aba Processo = Roteiro de triagem + Roteiro de produção; sinalizações, notas e registro no acervo foram para o card do topo (snCard) */
  /* 0.66: o painel Síntese e questões foi desfeito; os campos estão no cartão do processo (CAB_HTML) */
  if(heroV53()&&['res','ger'].includes(G.rot))return '';
  var h = '<div class="rt-em-proc">' + corpoRoteiro() + '</div>', rot = G.rot === 'sol' ? 'sol' : G.rot === 'pro' ? 'pro' : 'tri';
  /* 0.55: sem repetição — o Roteiro de produção não repete o que já aparece no Roteiro de triagem, nesta aba ou nas setas do cartão */
  var ja = {}, sc = '';
  try { var ab0 = G.merAb; G.merAb = true; G._seco = 1; sc = merEnc() + controlesProcesso(true); G.merAb = ab0; G._seco = 0; } catch (e) { G._seco = 0; }
  sc += SN_HTML + CAB_HTML;
  (h + sc).replace(/data-(?:fk|ch)="([^"]+)"/g, function (m, k) { ja[k.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'")] = 1; return m; });
  /* 0.63: a aba Processo se divide em Roteiro de triagem | Roteiro de produção (a deduplicação usa sempre os dois) */
  if(rot==='sol')return '<div id="hero-sol-main"></div>';
  if(rot==='tri')return h;
  producaoIndexCampos().forEach(function(c){ja[c.secao+'.'+c.chave]=1;});
  return producaoMinuta()+(heroV53()?'':producaoIndex());
}
/* 0.54 · Roteiro de produção: todos os campos da ficha que a Minuta-Matriz do Compendium usa (@apelido), do destino do caso
   (sessão ou monocrática). Preenchimento automatizado: a leitura dos autos põe sozinha o que acha nos campos vazios
   (autos.js › autoPreencher, marca "autos"), a extensão deriva o que se calcula (marca "auto") e, onde os autos divergem
   da ficha, o campo mostra a sugestão com "Usar". Grava na ficha; o Compendium relê a ficha sozinho. */
var CC_ABERTO = {};
/* 0.56 · Roteiro de produção por perfil da minuta (o tipo de ato vem do cartão do processo):
   Caso (o que o Compendium usa e não está acima) → Decisão monocrática (o mesmo do prontuário da página Monocráticas do Ex Officio)
   ou Acórdão (designação e minuta, revisão, relatório/voto/ementa, liberação) + Pauta e julgamento (histórico de pautas,
   sustentação/preferência, retirado/adiado e para quando). */
var CC_MONO = [['Decisão', [['producao', 'Mono - Título', 'Título do caso (painel do Desembargador)'], ['producao', 'Mono - Fundamento', 'Precedente ou fundamento'], ['triagem', 'Hipóteses Monocrática', 'Hipótese do art. 932'], ['producao', 'Voto - Resultado', 'Resultado'],
    ['producao', 'Voto - Honorários', 'Honorários'], ['producao', 'Tópico-síntese', 'Tópico-síntese (INSS)'], ['producao', 'Voto - Descrição', 'Detalhes da minuta']]],
  ['Designação e minuta', 'Designação e minuta'], ['Revisão', 'Revisão'],
  ['Assinatura e publicação', [['producao', 'Data da Liberação'], ['producao', 'Assinado'], ['producao', 'Data da Assinatura'], ['producao', 'Decisão - ID'], ['producao', 'Publicado'], ['producao', 'Mono - Data da publicação']]],
  ['Controle da monocrática', 'Monocrática'], ['Urgência', 'Urgência']];
var CC_AC = [['Designação e minuta', 'Designação e minuta'], ['Revisão', 'Revisão'], ['Relatório, voto e ementa', 'Relatório, voto e ementa'],
  ['Revisão do acórdão (ementa)', 'Revisão do acórdão (ementa)'], ['Liberação para a sessão', 'Liberação para a sessão']];
/* 0.58: Pauta e julgamento (histórico, sustentação, retirado/adiado) mora na aba Pauta — pautaHtml */
var CC_PROD = { 'Produção': 1, 'Pauta': 1, 'Controles especiais': 1 };
/* 0.57 · grupos do Caso pelo tipo de julgamento (o mesmo do Roteiro de triagem, automático ou escolhido nos botões):
   grupo fora do tipo some, salvo se já tem algo gravado; sem tipo identificado, aparece tudo. Título conforme o recurso. */
var CC_TIPO = { 'Sentença': ['ap', 'rn', 'ms'], 'Espécie e decisão impugnada': ['ai', 'agint', 'ed', 'ret'], 'Acórdão recorrido (embargos de declaração)': ['ed'],
  'Embargos de declaração': ['ed'], 'Agravo interno': ['agint'], 'Juízo de retratação': ['ret'] };
function ccTipos() { try { return window.MutaRoteiro && window.MutaRoteiro.tipos ? window.MutaRoteiro.tipos(gRot(), G.cnj) || {} : {}; } catch (e) { return {}; } }
function ccGrupoVale(g, T) {
  var L = CC_TIPO[g.grupo], tem = Object.keys(T).length;
  var cheio = (g.campos || []).some(function (c) { var v = c.secao ? gravado(c.secao, c.chave) : ''; return Array.isArray(v) ? v.length : !!S(v); });
  if (!L || !tem) return grupoVisivel(g) || cheio;
  return L.some(function (k) { return T[k]; }) || cheio;
}
function ccTitulo(g, T) {
  if (g.grupo === 'Espécie e decisão impugnada') return T.ai ? 'Decisão agravada' : T.ed ? 'Acórdão embargado' : T.agint ? 'Decisão agravada (agravo interno)' : T.ret ? 'Acórdão devolvido' : g.grupo;
  if (g.grupo === 'Sentença' && T.ms && !T.ap && !T.rn) return 'Sentença (mandado de segurança)';
  return g.grupo;
}
function camposCaso(ja) {
  ja = ja || {};
  var AU = window.MutaAutos, SG = AU && AU.sugestoes ? AU.sugestoes() : [], tot = 0, ok = 0, au = 0, vist = {}, mono = destino() === 'monocratica';
  function comSug(c) {
    var alvo = c.secao + '.' + c.chave, h = campo(c), k = -1;
    if (/au-tag/.test(h)) au++;
    SG.forEach(function (it, i) { if (k < 0 && it.alvo === alvo && it.status !== 'igual' && it.kind !== 'tabela' && S(it.value)) k = i; });
    if (k < 0) return h;
    var v = S(SG[k].value); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) v = v.split('-').reverse().join('/');
    return h + '<div class="rt-s"><span>Autos' + (SG[k].doc ? ' (ID ' + esc(SG[k].doc) + ')' : '') + ':</span> <b>' + esc(v.slice(0, 140)) + '</b><button type="button" class="btn line sm" data-rt="u:' + k + '">Usar</button></div>';
  }
  /* campo entra uma vez só e nunca o que já aparece acima; o tipo de ato fica no cartão */
  function usa(c, ro) { var id = c.secao + '.' + c.chave; if(/^(triagem\.(Hipóteses Monocrática|Art\. 932 - Nota de enquadramento)|producao\.Art\. 932 - Confirmação)$/.test(id))return false; if (!c.secao || vist[id] || ja[id] || TRI_EXTRA[c.chave] || /^(Síntese Processual|Síntese Fática|Alegações)$/.test(c.chave) || c.chave === 'Mono - Tipo de ato' || c.chave === 'Destino' || soSessao(c.chave) || c.tipo === 'tabela') return false;
    if (!ro && !editavel(c)) return false; vist[id] = 1; return true; }
  function bloco(id, cs, extra) {
    if (!cs.length && !extra) return '';
    var ed = cs.filter(editavel), n = ed.filter(function (c) { return !!S(V(c.secao, c.chave)); }).length; tot += ed.length; ok += n;
    var ab = CC_ABERTO[id] != null ? CC_ABERTO[id] : n < ed.length && tot <= 30;
    return '<details class="gg" data-cc="' + esc(id) + '"' + (ab ? ' open' : '') + '><summary><h4>' + esc(id) + '</h4><span class="gn">' + n + '/' + ed.length + '</span></summary><div class="gr">' + (extra || '') + cs.map(comSug).join('') + '</div></details>';
  }
  function doGrupo(nome, ro) { var g = grupoModelo(nome); return g ? (g.campos || []).filter(function (c) { return usa(c, ro); }) : []; }
  function daLista(L) { return L.map(function (x) { var c = campoModelo(x[0], x[1]); if (!c || !usa(c)) return null; return x[2] ? Object.assign({}, c, { rotulo: x[2] }) : c; }).filter(Boolean); }
  /* 1. Caso: abas Processo e Triagem */
  var T = ccTipos();
  var caso = ((G.F && G.F.abas) || []).filter(function (a) { return !CC_PROD[a.aba]; }).map(function (a) {
    return (a.grupos || []).filter(function (g) { return !g.controle && !GRUPOS_TRIAGEM[g.grupo] && ccGrupoVale(g, T); }).map(function (g) {
      return bloco('Caso · ' + ccTitulo(g, T), (g.campos || []).filter(function (c) { return c.apelido && usa(c); }));
    }).join('');
  }).join('');
  /* 2. perfil da minuta */
  var perfil = (mono ? CC_MONO : CC_AC).map(function (s) {
    var cs = Array.isArray(s[1]) ? daLista(s[1]) : doGrupo(s[1], s[1] === 'Pauta e julgamento' || s[1] === 'Monocrática'), extra = '';
    if (s[1] === 'Pauta e julgamento') extra = historicoPautas();
    return bloco((mono ? 'Decisão monocrática · ' : 'Acórdão · ') + s[0], cs, extra);
  }).join('');
  if (!tot) return '';
  var pct = Math.round(100 * ok / tot);
  return '<section class="card rt-top cc-caso"><div class="rt-tt"><b>Roteiro de produção</b><span class="rt-n">' + ok + '/' + tot + '</span>' + (au ? '<span class="rt-al cc-au">' + au + ' automático' + (au > 1 ? 's' : '') + '</span>' : '') + '</div>' +
    '<div class="rt-bar"><i style="width:' + pct + '%"></i></div>' + (AU && AU.barra ? AU.barra() : '') +
    '<p class="muted">Perfil da minuta: <b>' + (mono ? 'decisão monocrática' : 'acórdão') + '</b>, pelo pronunciamento do cartão do processo' + (Object.keys(T).length && window.MutaRoteiro ? '; campos do caso de <b>' + window.MutaRoteiro.TIPOS.filter(function (x) { return T[x[0]]; }).map(function (x) { return x[1].toLowerCase(); }).join(', ') + '</b>, pelo tipo de julgamento do Roteiro de triagem' : '') + '. Os autos lidos preenchem sozinhos os vazios; confira o que vier marcado. Grava na ficha.</p>' +
    caso + perfil + '</section>';
}
/* 0.58 · aba Pauta › Processo em tela: situação, remarcação e sustentação/preferência (gravam na ficha) e o histórico de pautas */
function pautaHtml() {
  if (!G.F || !G.cnj) return '<p class="muted">Lendo o prontuário…</p>';
  var P = (G.op || {}).pauta || {}, br2 = function (d) { return /^\d{4}-\d{2}-\d{2}/.test(S(d)) ? S(d).slice(0, 10).split('-').reverse().join('/') : S(d); };
  var g = grupoModelo('Pauta e julgamento'), cs = g ? g.campos || [] : [], dt = function (k) { var v = S(P[k]); return v ? esc(br2(v)) : '—'; };
  var mono = destino() === 'monocratica', st = S(V('pauta', 'Status de Julgamento')) || 'PAUTADO', so = S(V('pauta', 'Sustentação oral'));
  /* resumo, no formato da 1ª seta do cartão */
  var dl = [['Situação', esc(st)], ['Sessão original', dt('Sessão original')], ['Item', esc(S(P['Item (Pauta de Julgamento)']) || '—')],
    ['Sessão de destino', dt('Nova sessão de destino')], ['Sustentação / preferência', esc(so || '—')], ['Julgamento', esc(S(P.JULGAMENTO) || '—')]]
    .map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('');
  var pje = [['Publicação da pauta', 'Pauta - Publicação'], ['Inclusão na pauta', 'Pauta - Inclusão'], ['Proclamação', 'Pauta - Proclamação'], ['Último movimento', 'Pauta - Último movimento']]
    .filter(function (x) { return S(P[x[1]]); }).map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + esc(br2(P[x[1]])) + '</dd></div>'; }).join('');
  var ed = cs.filter(function (c) { return editavel(c); });
  return '<div class="pc pa-pc"><div class="pa-st0"><span class="pa-sit s-' + esc(N(st).replace(/\s+/g, '-')) + '">' + esc(st) + '</span>' + (mono ? '<small class="muted">destino monocrático: sem pauta de sessão</small>' : '') + '</div>' +
    '<h4 class="pm-mer-h">Sessões de julgamento</h4>' + historicoPautas() +
    '<h4 class="pm-mer-h">Resumo da pauta</h4><dl class="pc-dl">' + dl + '</dl>' +
    (pje ? '<h4 class="pm-mer-h">No PJe</h4><dl class="pc-dl">' + pje + '</dl>' : '') +
    '<details class="pm-aut pa-reg"><summary><span class="pm-aut-t">registrar situação, remarcação e sustentação</span><i class="pm-aut-h"></i></summary><div class="gr">' + ed.map(campo).join('') + '</div></details></div>';
}
/* histórico de pautas do processo: sessões registradas na ficha e cartões das pautas em curso (retirado, adiado, sustentação, preferência) */
function historicoJulgamento(){
 var P=(G.op||{}).pauta||{},E=[],seen=new Set();
 function dia(v){v=S(v);var m=/^(\d{2})\/(\d{2})\/(\d{4})/.exec(v);return m?m[3]+'-'+m[2]+'-'+m[1]:/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):'';}
 function add(dt,t,info,id){var d=dia(dt),k=[d,t,S(id),S(info)].join('|');if(seen.has(k))return;seen.add(k);E.push({d:d,t:t,info:S(info),id:S(id)});}
 var sessoes=Array.isArray(P.sessoes)?P.sessoes:[],por={};
 function sess(d,it,r){d=dia(d);if(!d)return;var x=por[d]||(por[d]={});if(it)x.i=S(it);if(r)x.r=S(r);}
 sessoes.forEach(function(x){if(x)sess(x.sessao,x.item,x.resultado);});
 sess(P['Sessão original'],P['Item (Pauta de Julgamento)'],P['Status de Julgamento']);
 var SI=window.MutaSincronia&&window.MutaSincronia.situacao?window.MutaSincronia.situacao():null;
 if(SI&&dg(SI.cnj)===dg(G.cnj))(SI.cartoes||[]).forEach(function(c){sess(c.sessao,c.item,c.resultado);});
 Object.keys(por).forEach(function(d){var x=por[d];add(d,'Sessão de julgamento',[x.i?'Item '+x.i:'',x.r].filter(Boolean).join(' · '));});
 if(P['Nova sessão de destino']&&dia(P['Nova sessão de destino'])&&!por[dia(P['Nova sessão de destino'])])add(P['Nova sessão de destino'],'Sessão prevista / remarcação',P['Motivo da remarcação']);
 ['Publicação','Proclamação'].forEach(function(k){var v=P['Pauta - '+k];if(dia(v))add(v,k==='Publicação'?'Publicação da pauta':'Proclamação do julgamento','');});
 var R=V('origem','Recursos'),ids=new Set();if(Array.isArray(R))R.forEach(function(r){if(!r)return;var L=S(r.ids).match(/\b\d{6,}\b/g)||[];L.forEach(function(id){ids.add(id);});add(r.data,'Recurso interposto',r.parte,L.join(', ')||S(r.ids));});
 var AU=window.MutaAutos,au=AU&&AU.doProcesso&&AU.doProcesso(),sig=window.MutaSigilo;
 if(!(sig&&(sig.bloqueado()||sig.sigiloso()))){
   var H=V('triagem','Registro - Peças'),D=(au&&au.lista||[]).concat(Array.isArray(H)?H.map(function(r){return {id:r.id,tipo:r.peca,data:r.data};}):[]);
   D.forEach(function(r){if(!r||r.anexo||sig&&sig.docSigiloso&&sig.docSigiloso(r))return;var tipo=S(r.tipo),id=S(r.id);if(id&&ids.has(id))return;if(!/^(apela|agravo|embargos de declara|recurso|ac[óo]rd[ãa]o|decis[ãa]o|senten[çc]a|ju[íi]zo de retrata)/i.test(tipo))return;if(id)ids.add(id);add(r.data,tipo,'',id);});
 }
 var ass=V('producao','Data da Assinatura'),pub=V('producao','Mono - Data da publicação'),idDec=V('producao','Decisão - ID');if(ass)add(ass,'Assinatura da decisão','',idDec);if(pub)add(pub,'Publicação da decisão','',idDec);
 E.sort(function(a,b){return (a.d||'9999').localeCompare(b.d||'9999');});
 return E.length?'<ol class="cc-pautas pa-tl hero-julg-tl">'+E.map(function(e){return '<li><b>'+esc(e.d?brD(e.d):'Sem data')+'</b><span>'+esc(e.t)+'</span>'+(e.id?'<small>ID '+esc(e.id)+'</small>':'')+(e.info?'<small>'+esc(e.info)+'</small>':'')+'</li>';}).join('')+'</ol>':'<p class="muted">Nenhum evento de julgamento registrado.</p>';
}
function historicoPautas() {
  var P = (G.op || {}).pauta || {}, L = [], br2 = function (d) { return /^\d{4}-\d{2}-\d{2}/.test(S(d)) ? S(d).slice(0, 10).split('-').reverse().join('/') : S(d); };
  var poe = function (d, o) { d = S(d).slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return; var e = L.filter(function (x) { return x.s === d; })[0]; if (!e) { e = { s: d }; L.push(e); } Object.keys(o).forEach(function (k) { if (o[k] && !e[k]) e[k] = o[k]; }); };
  (Array.isArray(P.sessoes) ? P.sessoes : []).forEach(function (x) { if (x) poe(x.sessao, { i: S(x.item), r: S(x.resultado) }); });
  if (P['Sessão original']) poe(P['Sessão original'], { i: S(P['Item (Pauta de Julgamento)']), o: 'sessão original' });
  if (P['Nova sessão de destino']) poe(P['Nova sessão de destino'], { o: 'remarcado para esta sessão', m: S(P['Motivo da remarcação']) });
  var SI = window.MutaSincronia && window.MutaSincronia.situacao ? window.MutaSincronia.situacao() : null, C = SI && SI.cnj && SI.cnj.replace(/\D/g, '') === S(G.cnj).replace(/\D/g, '') ? SI.cartoes : [];
  (C || []).forEach(function (c) { poe(c.sessao, { i: S(c.item), r: S(c.resultado), so: (c.ctl || {}).sopref || '', atual: 1, srv: S(c.servidor), lib: S(c.dataLiberacao) }); });
  if (!L.length) return '<p class="muted">Sem pauta registrada para este processo.</p>';
  L.sort(function (a, b) { return a.s.localeCompare(b.s); });
  var hj = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
  return '<ol class="cc-pautas pa-tl">' + L.map(function (x) {
    var r = x.r || (x.s >= hj ? (x.atual ? 'em pauta' : 'prevista') : ''), k = /retirad/i.test(r) ? 'ret' : /adiad/i.test(r) ? 'adi' : x.s >= hj ? 'fut' : r ? 'jul' : 'pas';
    return '<li class="pa-tl-' + k + '"><b>' + esc(br2(x.s)) + '</b>' + (x.i ? '<span>item ' + esc(x.i) + '</span>' : '') + (r ? '<span class="cc-pr">' + esc(r) + '</span>' : '') +
      (x.so ? '<span class="pa-tl-so">' + esc(x.so) + '</span>' : '') + (x.o ? '<small>' + esc(x.o) + (x.m ? ' · ' + esc(x.m) : '') + '</small>' : '') + (x.lib ? '<small>liberado em ' + esc(br2(x.lib)) + '</small>' : '') + '</li>';
  }).join('') + '</ol>';
}
document.addEventListener('toggle', function (e) { var d = e.target; if (d && d.getAttribute && d.getAttribute('data-cc') != null) CC_ABERTO[d.getAttribute('data-cc')] = d.open; }, true);
function corpoTriagem() {
  var AU = window.MutaAutos, TR = window.MutaTriagem, h = '';
  if (AU) h += AU.htmlConferencia();
  if (TR && TR.etiquetasDe) h += TR.etiquetasDe(G.op, G.fo);
  var A = abaModelo('Triagem');
  if (A) h += A.grupos.filter(function (g) { return g.grupo !== 'Registro da triagem (lote)' && (!g.destino || g.destino === destino()) && grupoVisivel(g); }).map(function (g, i) {
    var g2 = Object.assign({}, g, { campos: g.campos.filter(function (c) { return !NO_TOPO[c.chave]; }) });
    return grupoHtml(g2, i < 2);
  }).join('');
  /* 0.46.1: sem o quadro "Registro da triagem" */
  return h;
}
/* tipo de ato / pronunciamento, no topo de Produção: define o destino (sessão, monocrática, outro) e o tipo de ato */
var PRON = [['Acórdão (sessão)', 'Sessão', ''], ['Decisão monocrática', 'Monocrática', 'Decisão monocrática (art. 932)'], ['Decisão de urgência', 'Monocrática', 'Decisão de urgência'],
  ['Despacho', 'Monocrática', 'Despacho'], ['Admissibilidade', 'Monocrática', 'Decisão de admissibilidade'], ['Juízo de retratação', 'Monocrática', 'Juízo de retratação'],
  ['Homologação / extinção', 'Monocrática', 'Homologação / extinção'], ['Outro destino', 'Outro destino', ''], ['Decisão interlocutória', 'Monocrática', 'Decisão interlocutória']];
function pronAtual() { var d = destGrav(), t = S(V('producao', 'Mono - Tipo de ato'));
  for (var i = 0; i < PRON.length; i++) { if (PRON[i][1] === d && (d !== 'Monocrática' || PRON[i][2] === t || (!t && i === 1))) return i; } return -1; }
/* 0.44 · sem tipo de ato gravado: sugestão pela tarefa do PJe, pela triagem e pelas últimas peças e movimentações dos autos lidos.
   É só sugestão: vale o que a pessoa escolher. Índices de PRON: 0 acórdão, 1 monocrática, 2 urgência, 3 despacho, 5 retratação, 6 homologação/extinção. */
function sugerirAto() {
  var tf = N(window.MutaPje && window.MutaPje.tarefa ? window.MutaPje.tarefa() : ''), tj = N(V('triagem', 'Tipo de Julgamento'));
  var urg = S(V('triagem', 'Urgência')), urgAp = N(V('triagem', 'Urgência - Apreciação')), hip = N(V('triagem', 'Hipóteses Monocrática'));
  var AU = window.MutaAutos, L = AU && AU.doProcesso ? ((AU.doProcesso() || {}).lista || []) : [];
  var ult = L.filter(function (d) { return !d.anexo; }).sort(function (a, b) { return Number(b.id) - Number(a.id); }).slice(0, 4), txt = N(ult.map(function (d) { return d.tipo + ' ' + (d.desc || '') + ' ' + (d.movs || []).join(' '); }).join(' | '));
  var u0 = ult[0] ? N(ult[0].tipo + ' ' + (ult[0].desc || '') + ' ' + (ult[0].movs || []).join(' ')) : '';
  if (/urgencia|liminar|tutela|efeito suspensivo/.test(tf)) return { i: 2, por: 'tarefa do PJe' };
  if (urg && !/apreciad|decidid|prejudicad/.test(urgAp)) return { i: 2, por: 'urgência não apreciada na triagem' };
  if (/retratacao/.test(tf + ' ' + tj) || /devolu[a-z]* .*(vice|retratacao)|juizo de retratacao/.test(txt)) return { i: 5, por: /retratacao/.test(tf) ? 'tarefa do PJe' : /retratacao/.test(tj) ? 'tipo de julgamento' : 'devolução da Vice-Presidência nos autos' };
  if (/desistencia|renuncia|acordo|transacao|homologa/.test(u0)) return { i: 6, por: 'última peça: ' + (ult[0].desc || ult[0].tipo) };
  if (/pedido de (tutela|liminar|efeito)|tutela (de urgencia|antecipada)|efeito suspensivo/.test(u0)) return { i: 2, por: 'última peça: ' + (ult[0].desc || ult[0].tipo) };
  if (/^(possivel|provavel|cabivel)/.test(hip)) return { i: 1, por: 'hipótese de monocrática na triagem' };
  if (/sessao|pauta|relatorio e voto|voto/.test(tf)) return { i: 0, por: 'tarefa do PJe' };
  if (ult[0] && ult[0].k === 'peticao' && !/contrarraz|parecer|apelacao|agravo|embargos|inicial/.test(u0)) return { i: 3, por: 'última peça é petição intercorrente: ' + (ult[0].desc || ult[0].tipo) };
  if (/embargos de declaracao|agravo interno|apelacao|remessa/.test(tj)) return { i: 0, por: 'tipo de julgamento: ' + V('triagem', 'Tipo de Julgamento') };
  if (/contrarraz|parecer/.test(u0)) return { i: 0, por: 'recurso respondido (' + (ult[0].desc || ult[0].tipo) + ')' };
  var cl = N(((G.fo || {}).classe_judicial) || ((G.fo || {}).Classe) || '');
  if (/apela|remessa|agravo de instrumento|embargos de declara|agravo interno/.test(cl)) return { i: 0, por: 'classe do processo, sem urgência nem hipótese de monocrática na triagem' };
  return null;
}
/* Sugestão é uma indicação dentro da própria opção, sem definir o ato. */
function atoOpcoes(k) {
  var sug = k < 0 ? sugerirAto() : null;
  return '<option value=""' + (k < 0 ? ' selected' : '') + '>A definir</option>' +
    PRON.map(function (x, i) {
      var indicado = sug && sug.i === i;
      return '<option value="' + i + '"' + (i === k ? ' selected' : '') +
        (indicado ? ' title="' + esc('Sugestão: ' + sug.por) + '"' : '') +
        '>' + esc(x[0] + (indicado ? ' · sugerido' : '')) + '</option>';
    }).join('');
}
function atoSel() {
  var k = pronAtual();
  return '<label class="pm-pp pm-ato"><span class="pm-pn"><small>Pronunciamento</small><select id="pm-pron" aria-label="Pronunciamento">' + atoOpcoes(k) + '</select></span></label>';
}
function pronunciamento() {
  var k = pronAtual();
  return '<section class="card pc-sec pm-pron"><div class="pc-sh"><h3>Pronunciamento</h3><small class="muted">' + (k < 0 ? 'a definir na triagem' : esc(PRON[k][1] === 'Sessão' ? 'vai à sessão' : PRON[k][1] === 'Monocrática' ? 'decisão do relator' : 'outro destino')) + '</small></div>' +
    '<select id="pm-pron" class="pm-pron-s" aria-label="Pronunciamento">' + atoOpcoes(k) + '</select></section>';
}
function corpoProducao() {
  var A = abaModelo('Produção'), h = '';
  if (!A) return '';
  h += pronunciamento();
  var mono = destino() === 'monocratica';
  if (mono) h += decisaoMono();
  /* o que já está no cartão (etapas, designação), no tipo de ato e na Decisão não se repete */
  var JA = { MINUTADO: 1, CORRIGIDO: 1, 'Data da Revisão': 1, LIBERADO: 1, 'Data da Liberação': 1, Assinado: 1, 'Data da Assinatura': 1, SERVIDOR: 1, CORRETOR: 1, 'Mono - Tipo de ato': 1 };
  var FORA = { 'Designação e minuta': 1, 'Lote e correção (Index)': 1, 'Ato e fundamento': 1, 'Decisão monocrática': 1 };
  h += A.grupos.filter(function (g) { return !FORA[g.grupo] && (!g.destino || g.destino === destino()) && grupoVisivel(g); })
    .map(function (g) { return Object.assign({}, g, { campos: g.campos.filter(function (c) { return !JA[c.chave]; }) }); })
    .filter(function (g) { return g.campos.length; })
    .map(function (g, i) { return grupoHtml(g, i < 2); }).join('');
  if (!mono) h += grupos(PAUTA_ABA, null, function () { return true; });
  return h;
}
var PAUTA_ABA = 'Pauta';
var PJE_CASA = null;
/* contagem sob cada modo, como nas abas da gaveta: em aberto, preenchidos/total, passos conferidos */
function preench(nomeAba, filtroG) { var A = abaModelo(nomeAba), t = 0, n = 0; if (!A) return '';
  A.grupos.filter(function (g) { return (!g.destino || g.destino === destino()) && grupoVisivel(g) && (!filtroG || filtroG(g)); }).forEach(function (g) { g.campos.forEach(function (c) { if (!c.secao) return; t++; var v = V(c.secao, c.chave); if (Array.isArray(v) ? v.length : S(v)) n++; }); });
  return n + '/' + t; }
function contaModo(a) {
  if (a === 'Processo') { var R0 = window.MutaRoteiro && window.MutaRoteiro.resumo ? window.MutaRoteiro.resumo(gRot()) : null; if (R0) return R0.ok + '/' + R0.total; var k = 0; SN.forEach(function (q) { snLinhas(q[0]).forEach(function (l) { if (!/^✓/.test(l)) k++; }); }); return k ? String(k) : ''; }
  if (a === 'Autos') { var AE = window.MutaAutos && window.MutaAutos.estado(); if (!AE || !AE.itens) return ''; var nd = window.MutaAutos.lista().length, nl = Object.keys(AE.docs || {}).filter(function (k) { return /^(ok|sem)$/.test(AE.docs[k].estado); }).length; return nl + '/' + nd; }
  if (a === 'Roteiro') { var R = window.MutaRoteiro && window.MutaRoteiro.resumo ? window.MutaRoteiro.resumo(gRot()) : null; return R ? R.ok + '/' + R.total : ''; }
  if (a === 'Produção') return preench('Produção');
  return '';
}   /* marcador do lugar original da faixa do PJe (fora do cartão quando não há processo) */
/* Roteiro: a triagem em passos, pelo tipo de julgamento (roteiro.js) */
function gRot() { return { V: V, F: function (k) { return fonteVal({ fonte: [k] }); }, cnj: function () { return G.cnj; }, marcar: marcar, gravar: function () { return gravarJa(); } }; }
/* o Roteiro de triagem reúne toda a triagem: os passos, a leitura dos autos, as etiquetas, o registro do lote e os demais campos */
var FORA_ROT = { 'Avisos': 1, 'Síntese Processual': 1, 'Alegações': 1, 'O que falta sanar': 1, 'Intercorrências': 1, 'Assunto detalhado': 1, 'Tipo de Julgamento': 1, 'Etiquetas sugeridas': 1 };
/* Autos: a conferência automática, a lista de peças (com detalhamento, JSON, OCR e PDF) e o preenchimento pelos autos */
/* 0.38: Leitura dos autos (o que achou e o que pôs na ficha) → A conferir (alertas e divergências) → Peças e documentos */
/* 0.52.2 · A conferir dentro de Peças e documentos: um só painel para conferir, editar e gravar na ficha */
var CF_ABERTO = false, AU_SECOES = {matriz:false,localizados:false};
function corpoAutos() {
  var AU = window.MutaAutos; if (!AU || !AU.htmlLeitura) return pecasCartao();
  var cf = AU.htmlConferir(), dc = AU.htmlDocs(function () { return pecasCartao(true); });
  if (cf) cf = cf.replace(/^<section class="card pc-sec" id="g-cf"><div class="pc-sh"><h3>A conferir<\/h3>(<small[^>]*>[\s\S]*?<\/small>)<\/div>/, '<details class="gg au-cf au-coverage-section" id="g-cf"' + (CF_ABERTO ? ' open' : '') + '><summary><h4>A conferir</h4>$1</summary><div class="au-coverage-body au-cf-b">').replace(/<\/section>$/, '</div></details>');
  var leitura=AU.htmlLeitura();
  var loc=AU.htmlLocalizados?AU.htmlLocalizados():'';
  if(loc)loc=loc.replace(/^<section class="au-localizados" aria-label="Localizados"><div class="au-loc-head"><h4>Localizados<\/h4>(<small>[\s\S]*?<\/small>)<\/div>/,'<details class="gg au-localizados au-coverage-section" id="g-au-localizados"'+(AU_SECOES.localizados?' open':'')+'><summary><h4>Localizados</h4>$1</summary><div class="au-coverage-body">').replace(/<\/section>$/,'</div></details>');
  var matriz=window.MutaGerador&&window.MutaGerador.htmlCobertura?window.MutaGerador.htmlCobertura():'';
  if(matriz)matriz=matriz.replace(/^<details class="gg">/,'<details class="gg au-coverage-section au-matriz" id="g-au-matriz"'+(AU_SECOES.matriz?' open':'')+'>');
  var cobertura=matriz||loc||cf?'<div class="card au-coverage-card" aria-label="Cobertura e conferência dos autos">'+matriz+loc+cf+'</div>':'';
  if(cobertura) leitura=leitura.replace(/<\/section>$/,cobertura+'</section>');
  return '<div class="hero-autos-workspace">'+leitura+dc+'</div>';
}
document.addEventListener('toggle', function (e) {
  var d=e.target;if(!d||d.tagName!=='DETAILS'||!d.isConnected)return;
  if(d.id==='g-cf')CF_ABERTO=d.open;
  if(d.id==='g-au-matriz')AU_SECOES.matriz=d.open;
  if(d.id==='g-au-localizados')AU_SECOES.localizados=d.open;
}, true);
/* 0.55: Roteiro de triagem = admissibilidade e MPF (e os passos); matéria, espécie e decisão impugnada ficam no Roteiro de produção */
var GRUPOS_TRIAGEM = { 'Admissibilidade e regularidade': 1, 'Ministério Público': 1 };
/* 0.59: mídias e etiquetas do gabinete (e as sugeridas, no quadro de etiquetas) também são triagem */
var TRI_EXTRA = { 'Mídias': 1, 'Etiquetas': 1, 'Etiquetas sugeridas': 1, 'Seleção Prévia': 1 };
function corpoRoteiro() {
  if (!window.MutaRoteiro) return '<div class="empty">Roteiro indisponível.</div>';
  var A = abaModelo('Triagem'), todos = [], TR = window.MutaTriagem, AU = window.MutaAutos;
  if (A) A.grupos.filter(function (g) { return (GRUPOS_TRIAGEM[g.grupo] || g.grupo === 'Matéria e gestão') && grupoVisivel(g); }).forEach(function (g) { g.campos.forEach(function (c) { if (c.secao && !FORA_ROT[c.chave] && (GRUPOS_TRIAGEM[g.grupo] || TRI_EXTRA[c.chave])) todos.push([c.secao, c.chave, c.rotulo]); }); });
  return window.MutaRoteiro.html(gRot(), campoRot, questoes, { todos: todos, barra: !heroV53() && AU && AU.barra ? AU.barra() : '',
    etiquetas: (TR && TR.etiquetasDe ? TR.etiquetasDe(G.op, G.fo) : '') + (window.MutaAlertas ? window.MutaAlertas.htmlRoteiro(G.cnj, V('triagem', 'Etiquetas sugeridas'), function () { render(); }) : ''), registro: '' /* 0.46.1: o quadro "Registro da triagem" saiu do prontuário (pedido do gestor); triagem.js › registroDe fica */ });
}
/* a aba Minuta › Gerador acompanha o prontuário: cada redesenho repinta o Gerador, se estiver à vista */

/* HERO: apresentação compartilhada pela extensão, prévia e prontuário web.
   Move os controles existentes; conserva chaves da ficha e eventos delegados. */
var heroTopo = {cnj:'', pagina:0, acompanhamento:false};
function heroV53(){return typeof document!=='undefined'&&document.body&&document.body.classList.contains('hero-redesign-v53');}
function heroOrganizarProntuario(){
  var top=caixa.querySelector('.pc.pm'); if(!top||top.querySelector('.hero-header-nav'))return;
  if(heroTopo.cnj!==G.cnj)heroTopo={cnj:G.cnj,pagina:0,acompanhamento:false,sinalizacoes:false};
  function el(tag,cls,txt){var n=document.createElement(tag);if(cls)n.className=cls;if(txt)n.textContent=txt;return n;}
  function html(n,h){var t=document.createElement('template');t.innerHTML=h;n.append(t.content);}
  function move(n,q){var x=caixa.querySelector(q);if(x)n.append(x);return x;}
  if(!document.getElementById('hero-top-style')){
    var st=el('style');st.id='hero-top-style';st.textContent='.hero-pauta-resumo>.hero-pauta-ingresso-linha{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px;align-items:start;margin-top:5px}.hero-pauta-ingresso-linha>.gf{min-width:0;grid-column:auto!important;margin:0}.hero-pauta-ingresso-linha select{width:100%;min-width:0;font-size:11px;padding:4px}.hero-pauta-ingresso-linha .gl{font-size:10px;white-space:normal}.hero-nao-julg[hidden]{display:none!important}.hero-nao-julg{grid-column:1/-1;display:grid;gap:5px;margin-top:6px}.hero-nao-julg select,.hero-nao-julg textarea{width:100%;min-width:0}.hero-nao-julg [hidden]{display:none!important}.hero-pauta-resumo>.hero-pauta-linha{display:grid!important;grid-template-columns:minmax(0,.95fr) minmax(0,1fr) minmax(0,.35fr) minmax(0,1.15fr);gap:4px;align-items:start}.hero-pauta-linha>.gf{min-width:0}.hero-pauta-linha>.gf select{max-width:100%;box-sizing:border-box;text-overflow:ellipsis}.hero-pauta-linha .gl{overflow-wrap:normal}.hero-pauta-linha>.gf{grid-column:auto!important;min-width:0;margin:0}.hero-pauta-linha .gl{font-size:10px;white-space:normal}.hero-pauta-linha select{width:100%;min-width:0;font-size:10px;padding:3px}.hero-pauta-linha .ro{font-size:11px;white-space:nowrap}.hero-sint-hist{margin:7px 0}.hero-sint-hist-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;line-height:1.45}.hero-sint-hist-actions{display:flex;flex-wrap:wrap;gap:4px}.hero-sint-hist-actions button{padding:4px 6px;border:1px solid var(--line,#8793a344);border-radius:4px}.hero-sint-hist .hero-ann-edit textarea{width:100%;box-sizing:border-box}.hero-sint-hist [hidden]{display:none!important}.hero-enc-confirm{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:5px}.hero-enc-confirm>small{flex:1;min-width:100px}.hero-main-tabs{display:flex;flex-wrap:nowrap!important;gap:2px;min-width:0}.hero-main-tabs>button{flex:1 1 0;min-width:0;padding:5px 3px;font-size:11px;white-space:nowrap}.hero-main-tabs>button>span{font-size:inherit;white-space:nowrap}.hero-dest-top{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:7px;align-items:start;min-width:0}.hero-dest-top>.gf{grid-column:auto!important;min-width:0;margin:0}.hero-dest-top select{width:100%;min-width:0}.hero-dest-top .pm-sitj{overflow-wrap:anywhere}.hero-dest-top .pm-sitj .gl{white-space:normal}.hero-enq-label{grid-column:1/-1}.hero-ann-v2 .hero-ann-unified:not(.hero-ann-open) .hero-ann-card .hero-ann-tools{display:none!important}.hero-ann-v2 .hero-ann-unified:not(.hero-ann-open) .hero-ann-detail-featured>.hero-ann-head{display:none!important}.hero-ann-v2 .hero-ann-unified .hero-note-tag.hero-ann-synthesis-tag{border:1px solid var(--line,#8793a344);background:var(--soft,#8793a315);border-radius:2px;padding:2px 5px;font-size:10px;line-height:1.3;font-weight:600}.hero-ann-v2 .hero-ann-unified:not(.hero-ann-open) .hero-detail-footer>.hero-ann-action{display:none!important}.hero-ann-v2 .hero-ann-unified .hero-detail-footer>.hero-ann-icon-toggle{display:inline-flex!important}.hero-ann-v2 .hero-ann-unified:not(.hero-ann-open) .hero-ann-card.hero-ann-expanded .hero-ann-text{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.hero-ann-v2 .hero-note-tag.hero-ann-synthesis-tag{display:inline-flex;align-items:center;border:1px solid var(--line,#8793a344);background:var(--soft,#8793a310);border-radius:2px;padding:2px 5px;font-size:10px;line-height:1.3;font-weight:600;letter-spacing:0}.hero-ann-v2 .hero-ann-detail-featured>.hero-ann-head{justify-content:flex-end;margin:3px 0 0;gap:3px}.hero-ann-v2 .hero-ann-detail-featured>.hero-ann-text{margin:0}.hero-proposta-julg{grid-column:1/-1;margin:0;min-width:0}.hero-proposta-julg>.gr{padding:6px 8px;gap:5px}.hero-proposta-julg textarea{width:100%;box-sizing:border-box;resize:vertical;min-height:72px}.hero-proposta-hist{grid-column:1/-1;font-size:11px}.hero-proposta-hist>summary{cursor:pointer}.hero-proposta-hist-text{white-space:pre-wrap;overflow-wrap:anywhere;padding-top:5px}.hero-enc-integrado>.hero-enc-tipo{display:grid;gap:4px;padding:2px 0 7px;margin:0;min-width:0}.hero-enc-tipo .rt-tsel{margin:0;min-width:0}.hero-enc-group{margin:5px 0;min-width:0}.hero-enc-group>.hero-enc-fields,.hero-enc-group>.hero-tramite{padding:7px 9px}.hero-enc-group>summary h4{font-size:11px}.hero-enc-group>.hero-tramite{min-width:0}.hero-tr-condition{display:flex;align-items:flex-start;gap:5px;border-left:2px solid var(--line,#8793a344);padding:5px 6px;margin-top:5px;font-size:11px}.hero-tr-condition input{width:auto;flex:none}.hero-tr-condition span{flex:1;overflow-wrap:anywhere}.hero-tr-legacy{margin:5px 0;font-size:11px}.hero-tr-legacy summary{cursor:pointer}.hero-tramite [hidden]{display:none!important}.hero-q-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}.hero-q-tag{white-space:normal;overflow-wrap:anywhere;max-width:100%;font-size:10px;line-height:1.3}.hero-ann-v2 .hero-ann-unified .hero-ann-icon-toggle{font-size:15px;line-height:1;padding:2px 6px}.hero-materia .hero-ann-questions-group{margin-top:8px}.hero-materia .hero-ann-questions .hero-ann-card{border:0;border-bottom:1px solid var(--line,#8793a344);border-radius:0;background:transparent;padding:6px 0}.hero-materia .hero-ann-questions .hero-ann-card:last-child{border-bottom:0}.hero-materia .hero-ann-questions [hidden]{display:none!important}.hero-ann-v2 .hero-ann-unified{padding:7px 10px;border:1px solid var(--line,#8793a344);border-radius:6px;background:var(--field,#fff)}.hero-ann-v2 .hero-ann-unified>.hero-primary-note{margin:0;padding:0!important}.hero-ann-v2 .hero-ann-unified>.hero-tags-content{padding:6px 0 0!important;gap:0}.hero-ann-v2 .hero-ann-unified .hero-detail-footer{justify-content:flex-end;gap:5px;margin-top:3px}.hero-ann-v2 .hero-ann-unified .hero-detail-footer>button{opacity:1}.hero-ann-v2 .hero-ann-unified .hero-ann-tab{margin-right:auto}.hero-ann-v2 .hero-ann-unified .hero-detail-footer .hero-ann-action{font-size:15px;line-height:1}.hero-ann-v2 .hero-ann-unified .hero-ann-stack:empty{display:none}.hero-ann-v2 .hero-ann-unified .hero-ann-panel[hidden]{display:none!important}.hero-acomp-tabs>.hero-sn-ind{display:inline-flex;align-items:center;gap:3px;margin-left:0}.hero-sn-mini{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:30px;padding:4px 5px;border:1px solid var(--line,#8793a344);border-radius:5px;background:transparent;color:var(--muted-fg,inherit);font:inherit;font-size:11px;cursor:pointer;font-variant-numeric:tabular-nums}.hero-sn-mini.has-count.pd{color:#b7791f}.hero-sn-mini.has-count.ic{color:#c4572b}.hero-sn-mini.has-count.av{color:#547b9e}.hero-sn-mini[aria-pressed=true]{background:var(--soft,#8793a322);border-color:currentColor}.hero-sinalizacoes .sn-i[hidden]{display:none!important}.hero-acomp-tabs>button .hero-sn-ind{display:inline-flex;gap:3px;margin-left:4px;vertical-align:middle}.hero-acomp-tabs>button .hero-sn-ind .sn-st{font-size:9px}.hero-sol-main-body{padding:8px 0}.rt-modos{flex-wrap:wrap}.hero-ann-v2 .hero-primary-note{background:transparent!important;border:0!important;padding:0!important}.hero-ann-v2 .hero-ann-card{border:0;border-bottom:1px solid var(--line,#8793a344);border-radius:0;background:transparent;padding:7px 0}.hero-ann-v2 .hero-ann-stack>.hero-ann-card:last-child,.hero-ann-v2 .hero-ann-panel>.hero-ann-card:last-child{border-bottom:0}.hero-ann-v2 .hero-ann-stack{gap:0}.hero-ann-v2 .hero-ann-panels{display:grid;grid-template-columns:minmax(0,1fr);gap:5px}.hero-ann-v2 .hero-ann-group{min-width:0;margin:0}.hero-ann-v2 .hero-ann-group>.hero-tags-content{display:grid;gap:0;padding:6px 10px}.hero-ann-v2 .hero-ann-group>summary .hero-ann-action{margin-left:5px}.hero-ann-v2 .hero-ann-group>summary h4{flex:1}.hero-ann-v2 .hero-note-tag{border:0;background:transparent;padding:0;font-size:10px;letter-spacing:.025em}.hero-ann-v2 .hero-ann-head{margin-bottom:3px}.hero-ann-v2 .hero-ann-notes>summary h4:before,.hero-ann-v2 .hero-ann-questions-group>summary h4:before{mask:none;background:transparent;width:auto;height:auto;content:"≡";font-size:15px;line-height:1}.hero-ann-v2 .hero-ann-questions-group>summary h4:before{content:"≡"}.hero-ann-v2 .hero-ann-action:disabled{display:none}.hero-ann-v2 .hero-primary-note{padding:6px!important}.hero-ann-stack{display:grid;gap:5px}.hero-ann-card{min-width:0;border:1px solid var(--line,#8793a344);border-radius:6px;padding:6px 8px;background:var(--field,#fff)}.hero-ann-head{display:flex;align-items:center;justify-content:space-between;gap:5px;margin-bottom:4px}.hero-ann-tools{display:flex;align-items:center;gap:3px;flex-wrap:wrap;justify-content:flex-end}.hero-ann-action,.hero-ann-tab{border:0;background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:11px;padding:3px 5px;border-radius:4px}.hero-ann-action:hover,.hero-ann-tab:hover,.hero-ann-tab[aria-expanded=true]{background:var(--soft,#8793a322)}.hero-ann-text{font-size:12px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.hero-ann-expanded .hero-ann-text,.hero-ann-questions .hero-ann-text{display:block;overflow:visible}.hero-ann-meta{display:block;margin-top:4px;font-size:10px;color:var(--muted-fg,inherit)}.hero-ann-nav{display:flex;gap:4px;flex-wrap:wrap;flex:1}.hero-ann-panels{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start;margin-top:5px}.hero-ann-panel{flex:1 1 280px;min-width:0;display:grid;gap:5px}.hero-ann-edit{display:grid;gap:5px;margin:4px 0}.hero-ann-edit textarea{width:100%;box-sizing:border-box;resize:vertical}.hero-ann-v2 [hidden]{display:none!important}.hero-ann-v2 .hero-detail-footer{margin-top:4px;min-height:23px}.hero-ann-v2 .hero-ann-tab[aria-expanded=true]{font-weight:650}.hero-tr-actions{display:flex;gap:3px;flex-wrap:wrap;margin-top:5px}.hero-tr-actions[hidden]{display:none!important}.hero-tr-history{margin-top:8px}.hero-tr-history>summary{font-size:11px;cursor:pointer}.hero-enc-fields[hidden],.hero-tramite[hidden]{display:none!important}.hero-tr-list{list-style:none;padding:0;margin:5px 0}.hero-tr-item{border-left:2px solid var(--line,#8793a344);padding:6px 8px;margin:4px 0;font-size:11px}.hero-tr-item>small{display:block;margin-top:4px}.hero-tr-item .hero-sol-head input{width:auto}.hero-sol-form .gf[hidden]{display:none!important}.hero-sol-head h3{margin:0;font-size:12px}.hero-sol-head{margin-bottom:4px}.hero-pauta-hist{margin-top:10px;padding-top:8px;border-top:1px solid var(--line,#8793a344)}.hero-pauta-hist>summary{cursor:pointer;font-size:10px;letter-spacing:.07em;font-weight:650;text-transform:uppercase}.hero-hist-body{margin-top:6px}.hero-julg-tl li small{display:block}.hero-art932-prod{margin-bottom:8px}.hero-art932-prod>small{display:block;margin:5px 0}.hero-sol-nav{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0}.hero-sol-type{font:inherit;font-size:10px;border:1px solid var(--line,#8793a344);background:transparent;border-radius:5px;padding:4px 6px;cursor:pointer}.hero-sol-type[aria-pressed=true]{background:var(--soft,#8793a322);font-weight:700}.hero-sol-panel[hidden],.hero-sol-form [hidden]{display:none!important}.hero-acomp-tabs{flex-wrap:nowrap!important;white-space:nowrap;min-width:0;overflow-x:auto;scrollbar-width:thin}.hero-sol-head{display:flex;align-items:center;justify-content:space-between;gap:6px}.hero-sol-head h4{margin:0}.hero-sol-form{display:grid;gap:6px;margin:8px 0}.hero-sol-form[hidden]{display:none!important}.hero-sol-item{border-top:1px solid var(--line,#8793a344);padding:7px 0;font-size:11px}.hero-sol-item small{display:block;margin-top:4px}.hero-sol-desc{white-space:pre-wrap;overflow-wrap:anywhere;margin-top:4px}.hero-sol-item select{font-size:10px;max-width:45%}.hero-note-tag{display:inline-flex;align-items:center;justify-content:center;align-self:flex-start;flex:none;max-width:100%;border:1px solid var(--line,#8793a344);border-radius:4px;padding:2px 5px;background:var(--soft,#8793a310);color:inherit;font-size:10px;font-weight:600;line-height:1.3;white-space:nowrap}.hero-note-number{min-width:23px;font-variant-numeric:tabular-nums}.hero-note-title{white-space:normal}.hero-notes-inline .nt-l{list-style:none;padding-left:0}.hero-notes-inline .nt-l>li{list-style:none;padding-left:35px!important}.hero-notes-inline .nt-l>li::marker{content:none}.hero-notes-inline .nt-l>li>.hero-note-number{position:absolute;top:6px;left:4px}.hero-fixed-note>.hero-note-number{margin-top:1px}.hero-structured-note{padding:6px 0;min-width:0}.hero-structured-note .gf{margin:0}.hero-structured-note .gl[hidden]{display:none!important}.hero-annotation-panels{display:grid;grid-template-columns:minmax(0,1fr);gap:4px}.hero-questions{border-top:1px solid var(--line,#8793a344);padding:5px 0}.hero-questions>summary{font-size:11px;cursor:pointer;color:var(--muted-fg,inherit)}.hero-questions-body{padding-top:5px}@media(min-width:760px){.hero-annotation-panels:has(.hero-notes-inline[open]):has(.hero-questions[open]){grid-template-columns:1fr 1fr}}.hero-detail-footer{flex-wrap:wrap}.hero-detail-footer .hero-note-options{display:flex;gap:3px;flex-wrap:wrap;opacity:0;margin:0;padding:0}.hero-primary-note:hover .hero-note-options,.hero-detail-footer:focus-within .hero-note-options{opacity:1}.hero-note-options .nt-add{font-size:10px;padding:2px 4px}.hero-fixed-notes{display:grid;gap:4px;margin-top:7px;border-top:1px solid var(--line,#8793a344);padding-top:6px}.hero-fixed-note{display:flex;align-items:flex-start;gap:6px;font-size:11px}.hero-fixed-text{flex:1;min-width:0;overflow-wrap:anywhere}.hero-fixed-text small{display:block;font-size:9px}.hero-note-pin{border:0;background:transparent;color:var(--muted-fg,inherit);cursor:pointer;padding:2px;flex:none}.hero-note-pin[aria-pressed=true]{color:#a57935}.hero-notes-inline .nt-l>li{position:relative;padding-right:38px}.hero-notes-inline .nt-l>li>.hero-note-pin{position:absolute;right:19px;top:5px}@media(hover:none){.hero-detail-footer .hero-note-options{opacity:1}}.hero-detail-footer{display:flex;align-items:center;gap:6px;min-height:8px;margin-top:3px}.hero-detail-footer>button{border:0;background:transparent;color:var(--muted-fg,inherit);font:inherit;font-size:10px;padding:2px 4px;cursor:pointer}.hero-detail-footer .hero-detail-expand{margin:0 0 0 auto}.hero-detail-footer .hero-note-toggle,.hero-detail-footer .hero-note-add{opacity:0;transition:opacity .12s}.hero-primary-note:hover .hero-detail-footer>button,.hero-detail-footer:focus-within>button,.hero-note-toggle[aria-expanded=true]{opacity:1}.hero-notes-inline>summary[hidden]{display:none!important}.hero-detail-footer button[hidden]{display:none!important}@media(hover:none){.hero-detail-footer .hero-note-toggle,.hero-detail-footer .hero-note-add{opacity:1}}.hero-acomp-tabs{display:flex;align-items:center;gap:3px;border-bottom:1px solid var(--line,#8793a344)}.hero-acomp-tabs>button{font:inherit;font-size:10px;padding:6px 3px;border:0;background:transparent;color:inherit;cursor:pointer}.hero-acomp-tabs>button[aria-selected=true]{font-weight:650;border-bottom:2px solid currentColor}.hero-acomp-tabs>.hero-monitor-tab{display:inline-flex;align-items:center;flex:0 1 auto;min-width:0;gap:0;border-radius:4px;white-space:nowrap}.hero-monitor-tab>.hero-monitor-label{font:inherit;font-size:10px;padding:6px 2px 6px 3px;border:0;background:transparent;color:inherit;cursor:pointer;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis}.hero-monitor-tab>.hero-monitor-label[aria-selected=true]{font-weight:650;border-bottom:2px solid currentColor}.hero-monitor-tab>.hero-urg-short{display:inline-flex;align-items:center;justify-content:center;flex:none;width:19px;height:22px;padding:2px;border:0;background:transparent;color:var(--muted-fg,inherit);cursor:pointer}.hero-monitor-tab:has(>.hero-monitor-label[aria-selected=true]){background:var(--soft,#8793a315)}.hero-acomp-tabs>.hero-acomp-label{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hero-acomp-tabs>.hero-sn-ind{flex:none;margin-left:auto;gap:2px}.hero-acomp-tabs .hero-sn-mini{min-width:24px;gap:2px;padding:3px;font-size:10px;flex:none;white-space:nowrap}.hero-acomp-tabs .hero-sn-mini svg{width:12px;height:12px;flex:none}.hero-acomp-dock details[hidden],.hero-acomp-dock summary[hidden]{display:none!important}.hero-acomp-dock .hero-acomp{margin-top:0;border-top:0}.hero-acomp-tabs .hero-urg-short[aria-pressed=true]{color:#c4572b}.hero-top-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}.hero-top-nav button{border:0;background:transparent;color:inherit;cursor:pointer;padding:4px 12px;font-size:18px}.hero-top-nav button:disabled{opacity:.3}.hero-header-nav{display:flex;align-items:center;gap:5px;min-width:0}.hero-header-nav .pm-top{flex:1;min-width:0;margin:0;display:flex;flex-wrap:nowrap!important;align-items:center;gap:5px;overflow-x:auto;scrollbar-width:none}.hero-header-nav .pm-top::-webkit-scrollbar{display:none}.hero-header-nav .pm-top>*{flex:none;white-space:nowrap}.hero-header-nav .pm-top .pm-dd>i{display:none}.hero-header-nav .hero-face-label{font-size:11px;font-weight:650}.hero-header-nav .hero-face-label[hidden]{display:none!important}.hero-proc-tags{display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0}.hero-proc-tags .pm-tj{max-width:160px;overflow:hidden;text-overflow:ellipsis}.hero-header-nav{padding:0 0 5px;border-bottom:1px solid var(--line,#8793a344);margin-bottom:7px}.hero-header-nav>button{flex:none;border:0;background:transparent;color:inherit;cursor:pointer;padding:4px 6px;font:inherit;font-size:12px}.hero-header-nav>button[aria-pressed=true]{font-weight:700;text-decoration:underline}.hero-acomp-group{border-top:1px solid var(--line,#8793a344);padding-top:7px}.hero-acomp-group>summary{cursor:pointer;font-weight:600;font-size:12px}.hero-acomp-group[open]>summary{margin-bottom:7px}.hero-reg-acervo{margin:10px 0 0;padding:0;border:0;background:transparent;box-shadow:none}.hero-reg-acervo>.gr{margin-top:5px}.hero-etiquetas{margin:0;min-width:0}.hero-tags-content{padding:8px 12px;display:grid;gap:10px}.hero-tag-section .pm-mer-h{margin:0 0 6px}.hero-tag-list{display:flex;flex-wrap:wrap;gap:5px;align-items:center}.hero-tag-chip{display:inline-flex;align-items:center;gap:5px;max-width:100%;overflow-wrap:anywhere}.hero-tag-chip button{border:0;background:transparent;color:inherit;cursor:pointer;font-size:14px;line-height:1;padding:0 2px}.hero-tag-add{display:flex;gap:5px;margin-top:7px}.hero-tag-add input{flex:1;min-width:0;font:inherit}.hero-ctl-integrado{padding:6px 0;border:0;background:transparent;box-shadow:none}.hero-ctl-integrado>.pm-mer-h{margin:0 0 6px}.hero-ctl-integrado .ct-l{display:grid;grid-template-columns:1fr;gap:0;background:transparent;border:0;padding:0}.hero-ctl-integrado .ct-i{background:transparent;border:0;border-bottom:1px solid var(--line,#8793a344);border-radius:0;padding:7px 0;box-shadow:none}.hero-ctl-integrado .ct-i:last-child{border-bottom:0}.hero-ctl-integrado .ct-h{display:flex;align-items:center;gap:6px}.hero-ctl-integrado .ct-h .ct-sn{margin-left:auto}.hero-ctl-integrado .ct-r{margin:6px 0}.hero-ctl-integrado .ct-mais{margin:4px 0 0;border:0;background:transparent;box-shadow:none;padding:0}.hero-ctl-integrado .ct-mais>summary{display:inline-flex;align-items:center;gap:5px;list-style:none;width:auto;padding:3px 7px;border-radius:5px;border:1px solid var(--line,#8793a344);font-size:10px;font-weight:600;line-height:1.4;color:var(--muted-fg,inherit);cursor:pointer}.hero-ctl-integrado .ct-mais>summary::-webkit-details-marker{display:none}.hero-ctl-integrado .ct-mais>summary:after{content:"+";font-size:13px;line-height:1}.hero-ctl-integrado .ct-mais[open]>summary:after{content:"−"}.hero-ctl-integrado .ct-mais>summary:hover{background:var(--line,#8793a344)}.hero-ctl-integrado .ct-mais>.gr{padding:7px 0 0!important}.hero-julgamento-top{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;padding:0 0 9px;border-bottom:1px solid var(--line,#8793a344)}.hero-julgamento-top .hero-tipo-roteiro,.hero-julgamento-top .hero-resultado{grid-column:1/-1;margin:0;min-width:0}.hero-resultado select{width:100%;min-width:0}.hero-enc-integrado{background:transparent;border:0;border-bottom:1px solid var(--line,#8793a344);padding:0 0 9px;margin:0;box-shadow:none}.hero-enc-integrado>.pm-mer-h{margin:0 0 6px}.hero-enc-fields{padding:0;gap:8px}.hero-enc-fields .pm-sitj{margin:0;background:transparent;border:0;box-shadow:none;padding:0}.hero-etiquetas>summary h4{display:flex;align-items:center;gap:8px}.hero-etiquetas>summary h4:before{content:"";display:inline-block;width:16px;height:16px;background:currentColor;mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath fill=%27black%27 d=%27M3 3h10l8 8-10 10-8-8V3zm4 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z%27/%3E%3C/svg%3E") center/contain no-repeat}.hero-top-page[hidden]{display:none!important}.hero-top-page{min-width:0;overflow-wrap:anywhere}.hero-top-pages{min-height:150px}.hero-top-classif{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;margin:5px 0}.hero-top-classif span{font-weight:600}.hero-top-classif{align-items:flex-start;flex-wrap:nowrap}.hero-assunto-stack{flex:1;min-width:0;display:grid;gap:2px}.hero-assunto-stack .pm-ad{margin:0;font-size:11.5px;line-height:1.35;color:var(--muted-fg,inherit)}.hero-assunto-stack .pm-ad span{text-decoration:none!important;border:0;font-weight:400}.hero-case-notes{margin:8px 0;border-top:1px solid var(--line,#8793a344);padding:6px 0 0}.hero-case-notes>summary{display:flex;align-items:center;gap:6px;cursor:pointer;list-style:none;font-size:10px;font-weight:650;letter-spacing:.08em;text-transform:uppercase}.hero-case-notes>summary small{margin-left:auto}.hero-case-notes>summary:after{content:"⌄"}.hero-case-notes[open]>summary:after{content:"⌃"}.hero-case-notes .hero-notes-inner{margin:6px 0 0!important;padding:0!important;border:0!important;background:transparent;box-shadow:none}.hero-cl-jg{cursor:pointer}.hero-top-classif .hero-secao{display:inline-flex;align-items:center;justify-content:center;min-width:22px;padding:2px 6px;border-radius:5px;font-size:11px;line-height:1.35;background:var(--line,#e2e8f0);color:inherit}.hero-top-classif .hero-secao-1{background:#dbeafe;color:#1e40af}.hero-top-classif .hero-secao-2{background:#fef3c7;color:#92400e}.hero-top-classif .hero-secao-3{background:#dcfce7;color:#166534}.hero-top-page .pc-dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.hero-top-page .pc-dl>div{min-width:0}.hero-top-page .pm-aut,.hero-top-page .pv-identity{margin:0;border:0;box-shadow:none}.hero-top-page details>summary.hero-hidden-summary{display:none}.hero-acomp{margin-top:10px;border:0;border-top:1px solid var(--line,#8793a344);border-radius:0;padding:8px 0 0;min-width:0}.hero-acomp>summary{cursor:pointer;font-weight:600;display:flex;justify-content:space-between;gap:8px}.hero-acomp>summary small{font-weight:400}.hero-acomp>summary .hero-urg-short{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:3px;border:0;border-radius:5px;background:transparent;color:var(--muted-fg,inherit);cursor:pointer;flex:none}.hero-acomp>summary .hero-urg-short[aria-pressed=true]{color:#c4572b;background:#c4572b19}.hero-acomp>summary .hero-urg-short:hover{background:var(--line,#8793a344)}.hero-sn-ind{display:flex;gap:5px;align-items:center;margin-left:auto}.hero-sn-ind .sn-st{font-size:11px;font-style:normal;white-space:nowrap}.hero-header-nav>button{font-size:20px;line-height:1}.hero-sinalizacoes #g-sn{margin:0;box-shadow:none;border:0}.hero-acomp-b{display:grid;gap:10px;padding-top:10px}.hero-steps{border:1px solid var(--line,#8793a344);border-radius:8px;padding:8px;margin:8px 0}.hero-steps-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}.hero-steps-head h4{margin:0;flex:none}.hero-steps-head select{max-width:70%;min-width:0;width:auto;font:inherit;font-size:12px}.hero-steps .pv-flowbox{border:0;box-shadow:none;padding:0;margin:0}.hero-materia{padding:0;background:transparent;border:0;box-shadow:none}.hero-materia .pv-field,.hero-materia .pv-idrow,.hero-materia .pv-sintese{background:transparent;border:0;box-shadow:none;padding:0;margin:0;min-width:0}.hero-materia .pv-value{overflow-wrap:anywhere}.hero-materia .gr{gap:8px}.hero-designacoes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:center;gap:5px;margin:6px 0}.hero-design-cell{display:grid;gap:3px;min-width:0}.hero-design-cell .gl{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hero-design-cell select{width:100%;min-width:0;max-width:100%;font-size:11px;padding:3px 12px 3px 4px;text-overflow:ellipsis;white-space:nowrap}.hero-responsavel{flex:1 1 100px;min-width:0}.hero-responsavel .gf{margin:0;padding:0}.hero-responsavel .gl{font-size:10px}.hero-responsavel input,.hero-responsavel select{width:100%;min-width:0;font-size:12px}.hero-destino{margin:6px 0}.hero-destino small{display:block;opacity:.75}.hero-detalhes{display:grid;gap:4px}.hero-notes-wrap{margin:7px 0}.hero-notes-wrap .hero-primary-note{margin:0;padding:8px 9px;border:1px solid var(--line,#8793a344);border-radius:6px;background:var(--field,#fff)}.hero-notes-wrap .hero-extra-notes{margin:0;padding:0;border:0}.hero-notes-wrap{position:relative}.hero-notes-wrap .hero-extra-notes>summary{box-sizing:border-box;min-height:7px;height:7px;padding:0 8px;display:flex;align-items:center;justify-content:center;gap:5px;font-size:10px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--muted-fg);cursor:pointer;list-style:none;border-radius:0 0 5px 5px;overflow:hidden;transition:height .12s ease,background .12s ease}.hero-notes-wrap .hero-extra-notes>summary::-webkit-details-marker{display:none}.hero-notes-wrap .hero-extra-notes>summary>*{opacity:0}.hero-notes-wrap .hero-extra-notes>summary:after{margin-left:0;opacity:0}.hero-notes-wrap .hero-extra-notes>summary:hover,.hero-notes-wrap .hero-extra-notes>summary:focus-visible,.hero-notes-wrap .hero-primary-note:hover+.hero-extra-notes>summary,.hero-notes-wrap .hero-extra-notes[open]>summary{height:21px;background:var(--soft,#f1f3f5)}.hero-notes-wrap .hero-extra-notes>summary:hover>*,.hero-notes-wrap .hero-extra-notes>summary:focus-visible>*,.hero-notes-wrap .hero-primary-note:hover+.hero-extra-notes>summary>*,.hero-notes-wrap .hero-extra-notes[open]>summary>*{opacity:1}.hero-notes-wrap .hero-extra-notes>summary:hover:after,.hero-notes-wrap .hero-extra-notes>summary:focus-visible:after,.hero-notes-wrap .hero-primary-note:hover+.hero-extra-notes>summary:after,.hero-notes-wrap .hero-extra-notes[open]>summary:after{opacity:1}@media(hover:none){.hero-notes-wrap .hero-extra-notes>summary{height:21px}.hero-notes-wrap .hero-extra-notes>summary>*,.hero-notes-wrap .hero-extra-notes>summary:after{opacity:1}}.hero-notes-wrap .hero-extra-notes .hero-notes-inner{margin-top:3px!important}.hero-primary-note-head{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:5px;font-size:10px;font-weight:650}.hero-primary-note-head small{font-size:9px;font-weight:400;opacity:.7}.hero-primary-note .hero-detalhamento{margin:0}.hero-detail-text{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-align:left;width:100%;border:0;background:transparent;padding:0;color:inherit;font:inherit;font-size:12px;line-height:1.4;overflow-wrap:anywhere;white-space:pre-wrap;cursor:text}.hero-detail-text.hero-detail-open{display:block;-webkit-line-clamp:unset;overflow:visible}.hero-detail-text:disabled{opacity:1;cursor:default}.hero-detail-expand{display:block;margin:3px 0 0 auto;padding:1px 0;border:0;background:transparent;color:var(--muted-fg,inherit);font-size:10px;cursor:pointer}.hero-detail-expand[hidden]{display:none!important}.hero-detalhes .pm-ad,.hero-detalhes .pm-ad span,.hero-detalhes .pm-ad a{text-decoration:none!important;border-bottom:0}.hero-detalhes .pm-ad span{font-weight:400}.hero-detalhes .gl{display:none}.hero-detalhes input,.hero-detalhes textarea{width:100%}';document.head.append(st);
  }
  var nav=el('div','hero-header-nav'),prev=el('button','','‹'),next=el('button','','›'),label=el('span','muted');
  prev.type=next.type='button';prev.setAttribute('aria-label','Face anterior');next.setAttribute('aria-label','Próxima face');var faixa=top.querySelector('.pm-top');nav.append(prev);if(faixa){nav.append(faixa);faixa.querySelectorAll('.sp').forEach(function(x){x.remove();});var phase=faixa.querySelector('.pm-fase');if(phase)phase.before(label);else faixa.prepend(label);}else nav.append(label);label.classList.add('hero-face-label');nav.append(next);
  var enhanced=!!(window.MUTA_PREVIA&&window.MutaGabinete&&window.MutaGabinete.fichaFace),ficha=enhanced&&fichaFacePermitida()?el('div','hero-top-page pv2-ficha-face'):null;
  var pages=el('div','hero-top-pages'),id=el('div','hero-top-page'),encFace=el('div','hero-top-page hero-enc-face'),aut=el('div','hero-top-page'),mat=el('div','hero-top-page');
  /* Encaminhamento é a segunda face do prontuário (antes, aba do rodapé do cartão). */
  pages.append(id,encFace,aut,mat);var pn=[id,encFace,aut,mat],names=['Resumo','Encaminhamento','Identificação e Autuação','Caso, Conteúdo e Questões'];
  if(ficha){pages.append(ficha);pn.push(ficha);names.push('Ficha');}
  function show(i){var n=pn.length;heroTopo.pagina=(i+n)%n;pn.forEach(function(p,j){p.hidden=j!==heroTopo.pagina;});label.textContent='';label.hidden=true;prev.title='Anterior: '+names[(heroTopo.pagina+n-1)%n];next.title='Próxima: '+names[(heroTopo.pagina+1)%n];prev.setAttribute('aria-label',prev.title);next.setAttribute('aria-label',next.title);nav.setAttribute('aria-label',names[heroTopo.pagina]);if(ficha){if(heroTopo.pagina===n-1&&fichaFacePermitida()){if(!ficha.childElementCount)html(ficha,window.MutaGabinete.fichaFace());}else ficha.replaceChildren();}if(faceNav)Array.from(faceNav.children).forEach(function(b,j){b.setAttribute('aria-pressed',String(j===heroTopo.pagina));});}
  var faceNav=enhanced||document.querySelector('link[href="universal-layout.css"]')?el('div','pv3-face-nav'):null;if(faceNav){faceNav.style.gridTemplateColumns='repeat('+pn.length+',minmax(0,1fr))';['Resumo','Encaminhamento','Autuação','Caso'].concat(ficha?['Ficha']:[]).forEach(function(name,i){var b=el('button','',name);b.type='button';b.onclick=function(){show(i);};faceNav.append(b);});}
  prev.addEventListener('click',function(){show(heroTopo.pagina-1);});next.addEventListener('click',function(){show(heroTopo.pagina+1);});
  var sx=0;pages.addEventListener('touchstart',function(e){sx=e.changedTouches[0].clientX;},{passive:true});pages.addEventListener('touchend',function(e){if(heroV53())return;var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>65)show(heroTopo.pagina+(dx<0?1:-1));},{passive:true});
  var l1=top.querySelector('.pm-l1'),cls=l1&&l1.querySelector('.pc-cl'),classText=cls&&cls.title?cls.title.split(' · ')[0]:'';
  var m=grupoModelo('Autuação'),R={};(m&&m.campos||[]).forEach(function(c){R[c.rotulo]=valorDe(c);});
  var tj=el('div','gr');
  /* Classe abreviada e julgamento são etiquetas distintas; a classe completa continua em Autuação. */
  var classFull=S(classeAutuacao()||R['Classe']),classShort=classFull.replace(/\s*\(\d+\)\s*$/,'');
  try{var clInfo=window.ClassesCNJ&&window.ClassesCNJ.etiqueta(classFull,null);if(clInfo&&clInfo.t)classShort=clInfo.t.split(' · ')[0];else if(classFull&&/^[A-Za-z]{2,14}$/.test(classFull))classShort=classFull;}catch(e){}
  if(cls)cls.remove();
  var procTags=el('div','hero-proc-tags');
  if(classShort){var clTag=el('span','pc-cl hero-class-only',classShort);clTag.title=classFull;procTags.append(clTag);}
  if(l1)l1.querySelectorAll('.pm-tj').forEach(function(x){if(x.classList.contains('sug'))tj.append(x);else x.remove();});
  if(l1&&procTags.childNodes.length)l1.append(procTags);
  if(l1)l1.querySelectorAll('.pm-al').forEach(function(x){x.remove();});
  top.insertBefore(nav,l1||top.firstChild);nav.after(pages);if(faceNav)pages.before(faceNav);if(l1)id.append(l1);
  /* 0.76.1: seção e assunto sempre no cabeçalho. Seção: Autuação, fonte, etiqueta "Nª Seção" do PJe ou do gabinete; sem nenhuma, etiqueta "Seção ?".
     Assunto: Autuação, fonte (Assunto, assunto_judicial, Assunto_Principal), assunto detalhado ou o da pauta; sem nenhum, "Assunto não informado", que abre o Caso. */
  var as=el('div','hero-top-classif');
  var secao=S(R['Seção competente']||fonteVal({fonte:['Seção Competente','Seção competente']}));
  if(!secao){var etqS=[R['Etiquetas do PJe'],R['Etiquetas do gabinete'],V('origem','Etiquetas do gabinete'),fonteVal({fonte:['Etiquetas','etiquetas']})].map(S).join(';');var mS=etqS.match(/(?:^|[;,|\s])([1-4])\s*[ªº°a]?\s*se[cç][aã]o\b/i);if(mS)secao=mS[1]+'ª Seção';}
  var smatch=secao.match(/([1-4])\s*[ªº°a]?/),stag=el('span','hero-secao'+(smatch?' hero-secao-'+smatch[1]:secao?'':' hero-secao-vazia'),smatch?smatch[1]+'ª':secao||'Seção ?');stag.title=smatch?smatch[1]+'ª Seção':secao||'Seção competente não informada (na Autuação, na fonte ou nas etiquetas)';stag.setAttribute('aria-label',stag.title);as.append(stag);
  var assuntoTopo=assuntoCNJ();
  if(assuntoTopo){var assuntoEl=el('span','hero-assunto-cnj',assuntoTopo);assuntoEl.title='Assunto CNJ da autuação';as.append(assuntoEl);}else{var semAs=el('span','hero-assunto-vazio','Assunto CNJ ainda não sincronizado');semAs.title='Abra os autos do mesmo processo no PJe para recuperar a autuação';as.append(semAs);}
  id.append(as);
  var old=top.querySelector('.pm-as');if(old)old.remove();var ad=top.querySelector('.pm-ad');if(ad)ad.remove();var esp=top.querySelector('.pm-esp');if(esp)esp.remove();
  var detail=el('div','hero-detalhes');
  var assuntoPrincipal=assuntoCNJ(),assuntoComp=S(gravado('triagem','Registro - Assunto detalhado'))||S(V('triagem','Assunto detalhado'));
  function normalAssunto(v){return N(S(v)).replace(/\s+/g,' ').trim();}
  var assuntoStack=el('div','hero-assunto-stack'),principal=Array.from(as.children).find(function(x){return !x.classList.contains('hero-secao');});if(principal)assuntoStack.append(principal);as.append(assuntoStack);
  if(assuntoComp&&normalAssunto(assuntoComp)!==normalAssunto(assuntoPrincipal)){var sub=el('button','hero-case-preview',assuntoComp);sub.type='button';sub.title='Editar assunto detalhado em Caso, Conteúdo e Questões';sub.onclick=function(){show(2);};assuntoStack.append(sub);}
  if(S(V('triagem','Detalhamento do caso'))){var resumo=el('button','hero-case-preview hero-case-detail',S(V('triagem','Detalhamento do caso')));resumo.type='button';resumo.title='Editar detalhamento em Caso, Conteúdo e Questões';resumo.onclick=function(){show(2);};id.append(resumo);}
  /* Um editor de detalhamento; os dois campos antigos são conservados e concatenados na leitura. */
  var dkey='triagem.Detalhamento do caso',dv=S(V('triagem','Detalhamento do caso'));
  var dt=el('div','hero-detalhamento'),db=el('button','hero-detail-text',dv),expand=el('button','hero-detail-expand','Expandir');
  db.type=expand.type='button';db.title='Editar detalhamento do caso';expand.hidden=true;expand.setAttribute('aria-expanded',String(!!heroTopo.detalhamento));dt.append(db,expand);
  function ajustarDetalhe(){db.classList.toggle('hero-detail-open',!!heroTopo.detalhamento);expand.textContent=heroTopo.detalhamento?'Recolher':'Expandir';expand.setAttribute('aria-expanded',String(!!heroTopo.detalhamento));expand.hidden=!heroTopo.detalhamento&&db.scrollHeight<=db.clientHeight+1;}
  expand.onclick=function(){heroTopo.detalhamento=!heroTopo.detalhamento;ajustarDetalhe();};
  db.addEventListener('click',function(){var t=el('textarea');t.rows=3;t.value=dv;t.setAttribute('aria-label','Detalhamento do caso');var ok=el('button','btn solid sm','Gravar'),cancel=el('button','lnk','Cancelar');ok.type=cancel.type='button';dt.replaceChildren(t,ok,cancel);t.focus();ok.onclick=function(){if(window.MUTA_WEB&&window.MUTA_WEB.leitura)return;marcar(dkey,t.value.trim());agendar(400);render();};cancel.onclick=function(){dt.replaceChildren(db);if(!expand.closest('.hero-detail-footer'))dt.append(expand);ajustarDetalhe();};});
  if(window.MUTA_WEB&&window.MUTA_WEB.leitura)db.disabled=true;if(!dv)db.textContent='Registrar detalhamento do caso';if(detail.childNodes.length)id.append(detail);
  var ac=el('details','hero-acomp hero-enc-pane'),sum=el('summary','','Encaminhamento'),fase=top.querySelector('.pm-fase');if(fase)sum.append(el('small','muted',fase.textContent));var urg=el('button','hero-urg-short');urg.type='button';urg.innerHTML=SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',15);urg.setAttribute('aria-pressed',String(ctlSim('urgencia')));urg.title='Controle de urgência';urg.setAttribute('aria-label',urg.title);urg.disabled=false;sum.append(urg);urg.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();});ac.append(sum);var body=el('div','hero-acomp-b');ac.append(body);ac.open=true;ac.addEventListener('toggle',function(){if(ac.isConnected)heroTopo.acompanhamento=ac.open;});
  var flow=top.querySelector('.pv-flowbox,.pm-pills'),steps=el('section','hero-steps'),stepsHead=el('div','hero-steps-head');
  var oldHead=flow&&flow.querySelector('.pv-stage-head');if(oldHead)oldHead.remove();
  stepsHead.append(el('h4','pm-mer-h','Etapas'));
  var resp=top.querySelector('.pm-resp'),ato=resp&&resp.querySelector('.pm-ato'),dest=el('div','hero-destino');
  if(ato)dest.append(ato);else html(dest,atoSel());
  
  steps.append(stepsHead);
  if(flow){
    var people=flow.querySelector('.pv-people'),tags=el('div','hero-designacoes');
    if(people){people.querySelectorAll('.pv-person').forEach(function(x){tags.append(x);});people.remove();}
    else{flow.querySelectorAll('[data-des-ed],[data-des]').forEach(function(x){var k=x.getAttribute('data-des-ed')||x.getAttribute('data-des'),v=S(V('producao',k));if(x.closest('.pm-pl')){var label=el('span','pl-q',v||'a designar');x.replaceWith(label);}else{x.remove();}});}
    flow.querySelectorAll('.pv-stage-situacao,.pm-enc').forEach(function(x){body.append(x);});
    flow.querySelectorAll('.pv-enc-summary').forEach(function(x){x.remove();});
    steps.append(flow,tags);
  }
  id.append(steps);
  var au=top.querySelector('.pm-aut1');if(au){au.open=true;var sm=au.querySelector('summary');if(sm)sm.classList.add('hero-hidden-summary');var dl=au.querySelector('.pc-dl');if(!dl){dl=el('dl','pc-dl');au.append(dl);}var c=el('div');c.append(el('dt','','Classe'),el('dd','',S(R['Classe']||classText)));dl.prepend(c);var dist,val;Array.from(dl.children).forEach(function(x){var k=x.querySelector('dt');if(!k)return;if(k.textContent==='Seção')x.remove();if(k.textContent==='Distribuição')dist=x;if(k.textContent==='Valor da causa')val=x;});if(dist&&val){dl.prepend(dist,val);}aut.append(au);}
  /* Matéria usa a mesma estrutura de títulos e campos da Autuação. */
  var identity=caixa.querySelector('#pv-identity'),materia=el('section','hero-materia'),mg=el('div','gr');
  materia.append(el('h4','pm-mer-h','Caso, conteúdo e questões'));
  if(identity){
    var ic=identity.querySelector('.pv-id-content');
    if(ic){Array.from(ic.children).forEach(function(x){
      var k=x.querySelector('.gl'),labelText=k?S(k.textContent):'';
      if(x.matches('h4')||labelText==='Classe'||labelText==='Conclusão / resultado'||labelText==='Tipo de julgamento'||x.querySelector('.rt-tsel,[data-fk="producao.Voto - Resultado"],[data-pv-jg]'))return;
      if(x.classList.contains('pv-idrow')&&labelText==='Assunto CNJ'){var dlm=el('dl','pc-dl'),line=el('div');line.append(el('dt','','Assunto CNJ'),el('dd','',S(x.querySelector('.pv-value')&&x.querySelector('.pv-value').textContent)));dlm.append(line);materia.append(dlm);return;}
      if(x.querySelector('[data-pv-field="triagem.Tema"],[data-pv-field="triagem.Especificidades"],[data-fk="triagem.Tema"],[data-fk="triagem.Especificidades"]'))return;
      if(/^(Síntese processual|Síntese fática|Detalhamento do caso|Questões|Alegações|Assunto detalhado)$/i.test(labelText)||x.querySelector('[data-fk="triagem.Síntese Processual"],[data-fk="triagem.Síntese Fática"],[data-pv-field="triagem.Síntese Processual"],[data-pv-field="triagem.Síntese Fática"],.pv-sint'))return;
      mg.append(x);
    });}
  }else{
    var dlm=el('dl','pc-dl'),line=el('div');line.append(el('dt','','Assunto CNJ'),el('dd','',assuntoCNJ()));dlm.append(line);materia.append(dlm);
    html(mg,campoRot('triagem','Ramo do direito','Ramo do direito')+campoRot('triagem','Outros assuntos','Outros assuntos'));
  }
  /* A inclusão fica em Matéria, não na face de resumo. */
  if(!mg.querySelector('[data-ad]')&&!mg.querySelector('.pm-ad'))html(mg,campoRot('triagem','Assunto detalhado','Assunto detalhado'));
  if(!mg.querySelector('[data-fk="triagem.Detalhamento do caso"]')&&!mg.querySelector('[data-pv-field="triagem.Detalhamento do caso"]'))html(mg,campoRot('triagem','Detalhamento do caso','Detalhamento do caso'));
  html(mg,campoRot('triagem','Síntese Processual','Síntese processual')+campoRot('triagem','Síntese Fática','Síntese fática'));materia.append(mg);mat.append(materia);
  var sd=el('details','hero-acomp hero-sinalizacoes'),ss=el('summary','','Sinalizações'),ind=el('span','hero-sn-ind'),sig=el('div','hero-acomp-b');
  sd.append(ss,sig);ss.append(ind);sd.open=!!heroTopo.sinalizacoes;sd.addEventListener('toggle',function(){if(sd.isConnected)heroTopo.sinalizacoes=sd.open;});
  var sn=top.querySelector('.pm-sn'),dialog=caixa.querySelector('#pv-sn-dlg');if(sn){var sb=sn.querySelector('.sn-b');if(sb)while(sb.firstChild)sig.append(sb.firstChild);sn.remove();}else if(dialog){var sc=dialog.querySelector('.pv-sn-c');if(sc)while(sc.firstChild)sig.append(sc.firstChild);dialog.remove();var bar=top.querySelector('.pv-sn-bar');if(bar)bar.remove();}
  [['pd','Pendências','<path d="M12 9v4m0 4h.01M10.3 4.5 2.6 18a1 1 0 0 0 .9 1.5h17a1 1 0 0 0 .9-1.5L13.7 4.5a2 2 0 0 0-3.4 0Z"/>'],['ic','Intercorrências','<path d="M4 22V3m0 1c4-4 8 4 12 0v11c-4 4-8-4-12 0"/>'],['av','Avisos','<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>']].forEach(function(z){var n=snLinhas(z[0]).filter(function(l){return !/^✓/.test(l);}).length,b=el('button','hero-sn-mini '+z[0]+(n?' has-count':''));b.type='button';b.innerHTML=SV(z[2],14);b.append(el('span','hero-sn-count',String(n)));b.title=z[1]+': '+n+' em aberto';b.setAttribute('aria-label',b.title);b.dataset.snKind=z[0];ind.append(b);});
    var sh=sig.querySelector('#g-sn .pc-sh');if(sh){sh.querySelectorAll('h3,.sn-st').forEach(function(x){x.remove();});}
  /* Etiquetas e controles especiais passam a pertencer ao Acompanhamento. */
  var tagsGroup=el('details','gg hero-etiquetas'),tagsTitle=el('summary'),tagsHeading=el('h4','','Etiquetas'),tagsCount=el('span','gn');
  tagsTitle.append(tagsHeading,tagsCount);tagsGroup.append(tagsTitle);tagsGroup.open=!!heroTopo.etiquetas;tagsGroup.addEventListener('toggle',function(){if(tagsGroup.isConnected)heroTopo.etiquetas=tagsGroup.open;});
  var existingTags=aut.querySelector('.pv-etiquetas');if(existingTags)existingTags.remove();
  var pjeTags=aut.querySelector('.pc-etq');if(pjeTags){var ph=pjeTags.previousElementSibling;if(ph&&ph.tagName==='H4')ph.remove();pjeTags.remove();}
  function tagList(v){return [...new Set(String(v||'').split(/[,;|\n]+/).map(S).filter(Boolean))];}
  var pjeList=tagList(R['Etiquetas do PJe']),gabList=tagList(V('triagem','Etiquetas'));
  tagsCount.textContent=String(pjeList.length+gabList.length);tagsCount.title='Total de etiquetas do PJe e do gabinete';
  tagsTitle.title='Expandir ou recolher as etiquetas do processo';
  var tagsContent=el('div','hero-tags-content');tagsGroup.append(tagsContent);
  var readonly=!!(window.MUTA_WEB&&window.MUTA_WEB.leitura);
  function tagSection(title,L,editable,key){key=key||'triagem.Etiquetas';
    var sec=el('section','hero-tag-section'),row=el('div','hero-tag-list');sec.append(el('h4','pm-mer-h',title),row);
    if(!L.length)row.append(el('small','muted','Nenhuma etiqueta'));
    L.forEach(function(v,index){var chip=el('span','chip hero-tag-chip');chip.append(el('span','',v));
      if(editable&&!readonly){var rm=el('button','','×');rm.type='button';rm.title='Remover '+v;rm.setAttribute('aria-label',rm.title);rm.onclick=function(){marcar(key,L.filter(function(x,i){return i!==index;}).join(', '));agendar(400);render();};chip.append(rm);}row.append(chip);});
    if(editable&&!readonly){var addrow=el('div','hero-tag-add'),input=el('input'),add=el('button','btn line sm','+');input.type='text';input.placeholder='Adicionar etiquetas, separadas por vírgula';input.setAttribute('aria-label','Adicionar '+title.toLowerCase());add.type='button';add.setAttribute('aria-label','Adicionar etiquetas');function save(){var values=tagList(input.value);if(!values.length)return;marcar(key,[...new Set(L.concat(values))].join(', '));agendar(400);render();}add.onclick=save;input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();e.stopPropagation();save();}});addrow.append(input,add);sec.append(addrow);}
    tagsContent.append(sec);
  }
  tagSection('Etiquetas do PJe',pjeList,false);tagSection('Etiquetas do gabinete',gabList,true);if(heroV53()){var sug=campoModelo('triagem','Etiquetas sugeridas'),sugList=tagList(V('triagem','Etiquetas sugeridas'));tagSection('Sugeridas para o PJe',sugList,!!sug&&editavel(sug),'triagem.Etiquetas sugeridas');tagsCount.textContent=String(pjeList.length+gabList.length+sugList.length);}
  /* Registro no acervo: integra os campos na Autuação, sem cartão ou resumo próprio. */
  var registros=Array.from(top.querySelectorAll('details.gg')).concat(Array.from(sig.querySelectorAll('details.gg'))).filter(function(x){var h=x.querySelector('summary h4');return h&&S(h.textContent)==='Registro no acervo';});
  var destinoReg=au||aut;
  var regExistente=aut.querySelector('.pv-reg'),reg=regExistente||el('section','hero-reg-acervo');
  if(!regExistente){reg.append(el('h4','pm-mer-h','Registro no acervo'));}
  registros.forEach(function(x){var gr=Array.from(x.children).find(function(y){return y.classList.contains('gr');});if(gr)reg.append(gr);x.remove();});
  if(registros.length&&!regExistente)destinoReg.append(reg);
  if(regExistente)regExistente.classList.add('hero-reg-acervo');
  var ctlGroup=el('section','hero-ctl-integrado');
  var ctl=aut.querySelector('.pm-ctl2');if(ctl){var ch=ctl.previousElementSibling;if(ch&&ch.tagName==='H4'&&/^Controles/.test(ch.textContent))ch.remove();ctlGroup.append(ctl);}
  var mon=el('details','hero-acomp hero-monitoramento'),ms=el('summary','','Monitoramento especial'),mb=el('div','hero-acomp-b');
  if(heroV53()&&ctl){
    var ativos=el('section','hero-mon-section'),disponiveis=el('details','hero-mon-section hero-mon-available'),ah=el('h4','hero-mon-heading','Controles ativos'),dh=el('summary','hero-mon-heading','Controles disponíveis'),al=el('div','hero-mon-list'),dlMon=el('div','hero-mon-list');
    var grupos=Array.from(ctl.querySelectorAll('.ct-i')),nAt=0,nDisp=0;
    grupos.forEach(function(node){
      var ativo=node.classList.contains('on'),key=CTL_PROC.find(function(k){return node.classList.contains(k);}),head=node.querySelector('.ct-h');
      node.dataset.monitorControl=key||'';
      if(ativo){nAt++;al.append(node);var more=node.querySelector('.ct-mais');if(more&&key==='meta')more.querySelector('summary').textContent='Dados e providências da meta';}
      else{nDisp++;dlMon.append(node);}
      if(head&&readonly)head.querySelectorAll('[data-ct]').forEach(function(b){b.disabled=true;});
    });
    var monoGroup=(abaModelo(CE)&&abaModelo(CE).grupos||[]).find(function(x){return x.controle==='monocratica';});
    if(monoGroup&&vale('monocratica')){
      var mono=el('article','ct-i monocratica on'),mh=el('div','ct-h'),moreMono=el('details','ct-mais'),mf=el('div','gr');
      mh.append(el('b','','Monocrática'),el('small','muted','Destino registrado'));moreMono.append(el('summary','','Dados e prazo'));
      html(mf,monoGroup.campos.filter(function(x){return x.chave!=='Destino';}).map(campo).join(''));
      moreMono.append(mf);mono.append(mh,moreMono);al.append(mono);nAt++;
    }
    ah.append(el('small','hero-mon-total',String(nAt)));dh.append(el('small','hero-mon-total',String(nDisp)));ativos.append(ah,al);
    if(!nAt)al.append(el('small','muted','Nenhum controle ativo.'));
    disponiveis.append(dh,dlMon);ctl.replaceChildren(ativos,disponiveis);ctl.classList.add('hero-mon-organized');
  }
  mb.append(ctlGroup);mon.append(ms,mb);mon.open=!!heroTopo.monitoramento;
  mon.addEventListener('toggle',function(){if(mon.isConnected)heroTopo.monitoramento=mon.open;});
  /* Anotações e questões: uma representação por registro, sem mover controles legados. */
  caixa.querySelectorAll('#g-nt,.nt-cs,.nt-vz,.q-w').forEach(function(n){n.remove();});
  var noteWrap=el('section','hero-notes-wrap hero-ann-v2'),primary=el('div','hero-primary-note'),pair=el('div','hero-ann-panels'),ann=el('section','hero-ann-panel'),questions=el('section','hero-ann-panel hero-ann-questions'),foot=el('div','hero-detail-footer');
  var linhas=notasL(),fixCampo=campoModelo('origem','Notas fixadas'),fixados=[],readonly=!!(window.MUTA_WEB&&window.MUTA_WEB.leitura);
  try{var fx=JSON.parse(S(V('origem','Notas fixadas'))||'[]');if(Array.isArray(fx))fixados=fx.filter(function(x){return typeof x==='string';});}catch(e){}
  var regs=heroV53()?[['@detalhamento','Detalhamento do caso','Detalhamento do caso'],['@fatica','Síntese Fática','Síntese fática'],['@processual','Síntese Processual','Síntese processual']]:[];
  function salvarNotaFixa(r,t){var c=campoModelo('triagem',r[1]);if(!c||!editavel(c))return;var anterior=S(V('triagem',r[1])),novo=S(t);if(anterior===novo)return;if(anterior){var L=notasL();L.push(agoraBr()+' · '+(ses.estado().usuario||'equipe')+' · [Histórico '+r[0]+'] '+anterior.replace(/\r?\n/g,' ⏎ '));marcar('origem.Observações',L.join('\n'));}marcar('triagem.'+r[1],novo);heroTopo.notas=true;agendar(500);render();}
  var historicoFixo=linhas.filter(function(l){return / · \[Histórico @(detalhamento|fatica|processual)\] /.test(l);});if(heroV53())linhas=linhas.filter(function(l){return historicoFixo.indexOf(l)<0;});
  var PADRAO_ON={'@detalhamento':1,'@fatica':1,'@processual':1};function destacado(k){return PADRAO_ON[k]?fixados.indexOf('@ocultar-'+k.slice(1))<0:fixados.indexOf(k)>=0;}
  function gravaFix(){marcar('origem.Notas fixadas',JSON.stringify(fixados));}
  function pin(k){var b=el('button','hero-note-pin');b.type='button';b.title=destacado(k)?'Retirar destaque':'Destacar no prontuário';b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',String(destacado(k)));b.innerHTML=SV('<path d="m16 3 5 5-4 1-3 5v3l-2 2-3-5-5-3 2-2h3l5-3zM9 14l-6 7"/>',13);b.disabled=!fixCampo||!editavel(fixCampo);b.onclick=function(){var key=PADRAO_ON[k]?'@ocultar-'+k.slice(1):k,idx=fixados.indexOf(key);if(idx<0)fixados.push(key);else fixados.splice(idx,1);gravaFix();heroTopo.notas=true;agendar(500);render();};return b;}
  function action(label,title,fn){var b=el('button','hero-ann-action',label);b.type='button';b.title=title;b.setAttribute('aria-label',title);b.disabled=readonly;b.onclick=fn;return b;}
  function card(key,label,value,meta,onSave,onRemove){
    var r=el('article','hero-ann-card'),h=el('div','hero-ann-head'),tx=el('div','hero-ann-text',value||'Não registrado'),tools=el('div','hero-ann-tools');var isDetail=key==='@detalhamento'&&destacado(key),isSintese=key==='@processual'||key==='@fatica';
    if(isDetail){r.classList.add('hero-ann-detail-featured');r.setAttribute('aria-label',label);if(enhanced||heroV53())h.append(el('span','hero-note-tag hero-ann-detail-label',label));h.append(tools);}else{h.append(el('span','hero-note-tag'+(isSintese?' hero-ann-synthesis-tag':''),label),tools);}tools.append(pin(key));
    var exp=action('⌄','Expandir ou recolher conteúdo',function(){var open=r.classList.toggle('hero-ann-expanded');exp.textContent=open?'⌃':'⌄';exp.setAttribute('aria-expanded',String(open));});exp.disabled=false;exp.setAttribute('aria-expanded','false');tools.prepend(exp);
    if(!readonly&&onSave)tools.append(action('✎','Editar '+label,function(){var t=el('textarea');t.rows=3;t.value=value;var f=el('div','hero-ann-edit'),buttons=el('div','hero-ann-tools');buttons.append(action('Gravar','Gravar alteração',function(){onSave(t.value);}),action('Cancelar','Cancelar edição',function(){f.remove();tx.hidden=false;}));f.append(t,buttons);tx.hidden=true;r.insertBefore(f,tx.nextSibling);t.focus();}));
    if(!readonly&&onRemove)tools.append(action('×','Excluir anotação',onRemove));
    if(isDetail&&!enhanced&&!heroV53()){r.append(tx,h);}else r.append(h,tx);if(meta){var metaEl=el('small','hero-ann-meta',meta);if(heroV53())r.insertBefore(metaEl,tx);else r.append(metaEl);}
    if(!value)tx.classList.add('muted');
    return r;
  }
  var fixed=el('div','hero-ann-stack'),others=el('div','hero-ann-stack');primary.append(fixed,foot);
  regs.forEach(function(r){var k=r[0],field=r[1],v=S(V('triagem',field)),label=k==='@processual'?'Síntese processual':k==='@fatica'?'Síntese fática':field;
    if(!enhanced&&!v&&k!=='@detalhamento'&&!destacado(k))return;
    var c=campoModelo('triagem',field),item=card(k,label,v,'',c&&editavel(c)?function(t){salvarNotaFixa(r,t);}:null);var hist=historicoFixo.filter(function(l){return l.includes(' · [Histórico '+k+'] ');});if(hist.length){var hd=el('details','hero-fixed-history');hd.append(el('summary','','Histórico · '+hist.length));hist.slice().reverse().forEach(function(l){hd.append(el('p','hero-ann-meta',l.replace(' · [Histórico '+k+'] ',' · ').replace(/ ⏎ /g,'\n')));});item.append(hd);}if(heroV53())fixed.append(item);else(destacado(k)?fixed:others).append(item);
  });
  linhas.forEach(function(l,n){var m=/^(\d{2}\/\d{2}\/\d{4}(?: \d{2}:\d{2})?)\s*·\s*(?:([^·]{2,40}?)\s*·\s*)?(.+)$/.exec(l);
    var item=card(l,heroV53()?'Anotação geral':String(n+1).padStart(2,'0'),m?m[3]:l,m?[m[2]||'Autor não registrado',m[1]].join(' · '):'Autoria e data não registradas',function(t){t=S(t).replace(/\s*\n+\s*/g,' ');if(!t)return;var novo=m?m[1]+' · '+(m[2]||'Autor não registrado')+' · '+t:t,at=fixados.indexOf(l);if(at>=0){fixados[at]=novo;gravaFix();}var L=notasL(),ix=L.indexOf(l);if(ix<0)return;L[ix]=novo;marcar('origem.Observações',L.join('\n'));agendar(500);render();},function(){if(!confirm('Excluir esta anotação?'))return;var L=notasL(),ix=L.indexOf(l);if(ix<0)return;L.splice(ix,1);fixados=fixados.filter(function(x){return x!==l;});gravaFix();marcar('origem.Observações',L.join('\n'));agendar(500);render();});(heroV53()?others:destacado(l)?fixed:others).append(item);
  });
  var qs=questoesLista(V('triagem','Alegações'));
  var qfix=[],qCampo=campoModelo('triagem','Questões destacadas');try{var qraw=JSON.parse(S(V('triagem','Questões destacadas'))||'[]');if(Array.isArray(qraw))qfix=[...new Set(qraw.filter(function(q){return typeof q==='string';}).flatMap(questoesLista).filter(function(q){return qs.includes(q);}))];}catch(e){}
  function gravarQfix(){if(qCampo&&editavel(qCampo))marcar('triagem.Questões destacadas',JSON.stringify([...new Set(qfix)]));}
  function pinQ(q){var b=action('','Destacar questão',function(){if(!qCampo||!editavel(qCampo))return;var i=qfix.indexOf(q);if(i>=0)qfix.splice(i,1);else qfix.push(q);gravarQfix();heroTopo.questoes=true;agendar(500);render();});b.classList.add('hero-note-pin');b.innerHTML=SV('<path d="m16 3 5 5-4 1-3 5v3l-2 2-3-5-5-3 2-2h3l5-3zM9 14l-6 7"/>',13);b.disabled=!qCampo||!editavel(qCampo);b.setAttribute('aria-pressed',String(qfix.includes(q)));b.title=qfix.includes(q)?'Retirar destaque':'Destacar questão';b.setAttribute('aria-label',b.title);return b;}

  var nb=el('summary'),qb=el('summary'),ncount=linhas.length+regs.filter(function(r){return !!S(V('triagem',r[1]));}).length;
  nb.append(el('h4','','Anotações'),el('span','gn',String(ncount)));qb.append(el('h4','','Questões'),el('span','gn',String(qs.length)));
  var add=action('+','Incluir anotação',function(){heroTopo.notas=true;atualizaAnn();var owner=nb.closest('details');if(owner)owner.open=true;formAnotacao.hidden=false;nt.focus();});nb.append(add);add.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();});
  var formAnotacao=el('div','hero-ann-edit'),kind=el('select'),nt=el('textarea');formAnotacao.hidden=true;nt.rows=3;nt.placeholder='Registrar anotação';[['livre','Anotação geral']].concat(regs.map(function(r){return [r[0],r[2]||r[1]];})).forEach(function(r){var o=el('option','',r[1]);o.value=r[0];kind.append(o);});
  kind.onchange=function(){var r=regs.find(function(x){return x[0]===kind.value;});nt.value=r?S(V('triagem',r[1])):'';};
  var fb=el('div','hero-ann-tools');fb.append(action('Gravar','Gravar anotação',function(){var t=S(nt.value),r=regs.find(function(x){return x[0]===kind.value;});if(r){salvarNotaFixa(r,t);return;}else{if(!t)return;var L=notasL();L.push(agoraBr()+' · '+(ses.estado().usuario||'equipe')+' · '+t.replace(/\s*\n+\s*/g,' '));marcar('origem.Observações',L.join('\n'));}agendar(500);render();}),action('Cancelar','Cancelar inclusão',function(){formAnotacao.hidden=true;}));formAnotacao.append(kind,nt,fb);ann.append(formAnotacao,others);
  if(!others.childNodes.length)others.append(el('small','muted','Nenhuma anotação adicional.'));
  var qh=el('div','hero-ann-head'),qa=action('+','Incluir questão',function(){qform.hidden=false;qt.focus();});qb.append(qa);qa.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();heroTopo.questoes=true;atualizaAnn();});
  function salvarQ(L){marcar('triagem.Alegações',L.flatMap(questoesLista).join('\n'));heroTopo.questoes=true;agendar(500);render();}
  var qform=el('div','hero-ann-edit'),qt=el('textarea'),qbuttons=el('div','hero-ann-tools');qt.rows=2;qt.placeholder='1) Primeira questão; 2) Segunda questão';qform.hidden=true;qbuttons.append(action('Incluir','Gravar questão',function(){if(S(qt.value))salvarQ(qs.concat([qt.value]));}),action('Cancelar','Cancelar questão',function(){qform.hidden=true;}));qform.append(qt,qbuttons);questions.append(qform);
  qs.forEach(function(q,n){var r=el('article','hero-ann-card'),h=el('div','hero-ann-head'),t=el('div','hero-ann-text',q),b=el('div','hero-ann-tools');h.append(el('span','hero-note-tag',String(n+1).padStart(2,'0')),b);b.append(pinQ(q),action('✎','Editar questão',function(){var x=el('textarea'),f=el('div','hero-ann-edit'),a=el('div','hero-ann-tools');x.rows=3;x.value=q;a.append(action('Gravar','Gravar questão',function(){if(!S(x.value))return;var L=qs.slice();var novos=questoesLista(x.value);if(!novos.length)return;L.splice(n,1,...novos);if(qfix.includes(q)){qfix=qfix.flatMap(function(v){return v===q?novos:[v];});gravarQfix();}salvarQ(L);}),action('Cancelar','Cancelar edição',function(){f.remove();t.hidden=false;}));f.append(x,a);t.hidden=true;r.append(f);x.focus();}),action('×','Excluir questão',function(){if(confirm('Excluir esta questão?')){var L=qs.filter(function(x,i){return i!==n;});if(!L.includes(q)){qfix=qfix.filter(function(x){return x!==q;});gravarQfix();}salvarQ(L);}}));r.append(h,t);questions.append(r);});
  if(!qs.length)questions.append(el('small','muted','Nenhuma questão registrada.'));
  var nd=el('details','gg hero-etiquetas hero-ann-group hero-ann-notes'),qd=el('details','gg hero-etiquetas hero-ann-group hero-ann-questions-group');
  ann.classList.add('hero-tags-content');questions.classList.add('hero-tags-content');
    /* Card único de anotações: sem header; destaques sempre visíveis e comandos no rodapé dos destaques. */
  var noteCard=el('section','gg hero-ann-group hero-ann-notes hero-ann-unified'),toggleNotes=el('button','hero-ann-tab hero-ann-icon-toggle'),arrowNotes=el('span','hero-ann-chevron');
  toggleNotes.type='button';toggleNotes.title='Expandir ou recolher anotações adicionais';toggleNotes.setAttribute('aria-label',toggleNotes.title);toggleNotes.append(arrowNotes);toggleNotes.onclick=function(){heroTopo.notas=!heroTopo.notas;atualizaAnn();};
  add.remove();if(enhanced){add.textContent='+ Nota';toggleNotes.append(el('span','pv3-note-toggle-label','Anotações e sínteses'));}foot.replaceChildren(toggleNotes,add);primary.replaceChildren(fixed,foot);noteCard.append(primary,ann);qd.append(qb,questions);
  function atualizaAnn(){ann.hidden=heroV53()?false:!heroTopo.notas;noteCard.classList.toggle('hero-ann-open',!!heroTopo.notas);toggleNotes.setAttribute('aria-expanded',String(!!heroTopo.notas));arrowNotes.textContent=heroTopo.notas?' ▴':' ▾';qd.open=!!heroTopo.questoes;}
  qd.addEventListener('toggle',function(){if(qd.isConnected)heroTopo.questoes=qd.open;});
  pair.append(noteCard);noteWrap.append(pair);
  var qtags=el('div','hero-q-tags');qtags.setAttribute('aria-label','Questões destacadas');
  qs.filter(function(q,i){return qfix.includes(q)&&qs.indexOf(q)===i;}).forEach(function(q){var t=el('span','chip hero-q-tag',enhanced?String(qs.indexOf(q)+1).padStart(2,'0')+' · '+q:q);t.title=q;qtags.append(t);});
  if(qtags.childNodes.length){id.insertBefore(qtags,steps);if(false){var qw=el('section','pv3-q-highlight'),qh=el('div','pv3-q-head');qh.append(el('b','','Questões destacadas'));var goQ=el('button','lnk','Ver todas');goQ.type='button';goQ.onclick=function(){heroTopo.questoes=true;qd.open=true;show(2);qd.scrollIntoView({block:'nearest'});};qh.append(goQ);qw.append(qh,qtags);noteWrap.append(qw);}}
  /* Registro histórico dos autos: fonte preservada, classificação humana e complementação das sínteses. */
  var sgHist=window.MutaSigilo,teorHist=sgHist&&(sgHist.bloqueado()||sgHist.sigiloso())?'':S(gravado('triagem','Registro - Teor dos autos'));
  if(teorHist){
    var hdHist=el('details','gg hero-etiquetas hero-sint-hist'),hsHist=el('summary'),hbHist=el('div','hero-tags-content'),htHist=el('div','hero-sint-hist-text',teorHist);
    hsHist.append(el('h4','','Anotações · registro histórico dos autos'));hdHist.append(hsHist,hbHist);hbHist.append(htHist);
    var optsHist=el('div','hero-sint-hist-actions'),editorHist=el('div','hero-ann-edit');editorHist.hidden=true;hbHist.append(optsHist,editorHist);
    [['Síntese Processual','Síntese processual'],['Síntese Fática','Síntese fática']].forEach(function(r){
      var c=campoModelo('triagem',r[0]),b=action('+ '+r[1],'Incorporar registro histórico à '+r[1],function(){
        editorHist.replaceChildren();var t=el('textarea'),cur=S(V('triagem',r[0]));t.rows=6;t.value=teorHist;
        var info=el('small','muted','Selecione ou ajuste apenas os trechos pertinentes. O texto será acrescentado à síntese existente, sem substituir o original.');
        var save=action('Incorporar','Gravar complemento',function(){var v=S(t.value),current=S(V('triagem',r[0]));if(!v||!c||!editavel(c))return;if(current.includes(v)){info.textContent='Este trecho já consta da síntese.';return;}marcar('triagem.'+r[0],[current,v].filter(Boolean).join('\n\n'));heroTopo.pagina=2;heroTopo.notas=true;agendar(500);render();});
        editorHist.append(info,t,save,action('Cancelar','Cancelar incorporação',function(){editorHist.hidden=true;}));editorHist.hidden=false;t.focus();
      });b.disabled=readonly||!c||!editavel(c);optsHist.append(b);
    });
    materia.append(hdHist);
  }
  /* Caso / Conteúdo / Questões: seções da mesma ficha, com edição original e expansão independente. */
  var secCaso=el('details','hero-case-block'),secConteudo=el('details','hero-case-block'),caseGrid=el('div','gr hero-case-grid'),contentGrid=el('div','gr hero-case-grid');
  secCaso.append(el('summary','','Caso · classificação e delimitação'),caseGrid);secConteudo.append(el('summary','','Conteúdo · sínteses e detalhamento'),contentGrid);
  heroTopo.caseOpen=heroTopo.caseOpen||{caso:true,conteudo:true};
  Array.from(mg.children).forEach(function(x){var l=x.querySelector('.gl'),v=l?S(l.textContent):'';(/síntese|detalhamento do caso/i.test(v)?contentGrid:caseGrid).append(x);});
  Array.from(materia.querySelectorAll(':scope > .pc-dl')).forEach(function(x){caseGrid.prepend(x);});
  mg.replaceWith(secCaso,secConteudo);[['caso',secCaso],['conteudo',secConteudo]].forEach(function(x){x[1].open=heroTopo.caseOpen[x[0]]!==false;x[1].addEventListener('toggle',function(){if(x[1].isConnected)heroTopo.caseOpen[x[0]]=x[1].open;});});
  qd.classList.add('hero-case-block');materia.append(qd,noteWrap);atualizaAnn();
  /* O Acompanhamento é proprietário dos campos, não depende do DOM da aba Triagem. */
  var prior=caixa.querySelector('#pv-acomp');if(prior)prior.remove();
  caixa.querySelectorAll('#pv-tri-enc,.pv-followup').forEach(function(x){x.remove();});
  if(resp)resp.remove();
  var sel=caixa.querySelector('.rt-tsel');
  if(!sel&&window.MutaRoteiro){var tmp=el('div');html(tmp,corpoRoteiro());sel=tmp.querySelector('.rt-tsel');}
  if(sel){sel.classList.add('hero-tipo-roteiro');tj.prepend(sel);caixa.querySelectorAll('.rt-tsel').forEach(function(x){if(x!==sel)x.remove();});}
  else html(tj,campoRot('triagem','Tipo de Julgamento','Tipo de julgamento'));
  /* Especificações jurídicas ficam na Produção; planejamento não altera resultado. */
  /* Encaminhamento: um único cartão, com tipo de julgamento antes de destino e trâmite. */
  if(identity)identity.remove();
  var encSection=el('section','hero-enc-integrado hero-enc-card');encSection.id='hero-encaminhamento';encSection.append(el('h4','pm-mer-h','Encaminhamento'));
  tj.classList.add('hero-enc-tipo');
  var tiposAtuais=ccTipos(),tiposCatalogo=window.MutaRoteiro&&window.MutaRoteiro.TIPOS||[],tipoReferencia=tiposCatalogo.filter(function(x){return tiposAtuais[x[0]];}).map(function(x){return ({ap:'Ap',rn:'RemNec',ai:'AI',ms:'MS',ed:'ED',agint:'AgInt',ret:'JR'})[x[0]]||x[1];}).join(' · ')||S(V('triagem','Tipo de Julgamento'))||'A definir';
  var refTipo=el('button','chip hero-tipo-ref',tipoReferencia);refTipo.type='button';refTipo.title='Editar tipo de julgamento em Encaminhamento';refTipo.setAttribute('aria-label','Tipo de julgamento: '+tipoReferencia+'. Editar em Encaminhamento');
  refTipo.onclick=function(){abrirA('acompanhamento');var d=encSection.querySelector('.rt-tsel');if(d)d.open=true;var group=tj.closest('details.hero-enc-group');if(group)group.open=true;encSection.scrollIntoView({block:'nearest'});if(d){var sm=d.querySelector('summary');if(sm)sm.focus();}};
  procTags.append(refTipo);var secTag=as.querySelector('.hero-secao');if(secTag)procTags.append(secTag);
  if(l1){if(!procTags.isConnected)l1.append(procTags);}else id.prepend(procTags);
  var encFields=el('div','gr hero-enc-fields');
  body.querySelectorAll('.pm-enc,.pv-acomp-sit,.pv-followup,.pm-sitj').forEach(function(x){x.remove();});
  var destinoAtual=destGrav(),destRow=el('label','gf'),destSel=el('select'),destTop=el('div','hero-dest-top');
  destRow.append(el('span','gl','Destino final'));destSel.dataset.fk='producao.Destino';[['','A definir'],['Sessão','Colegiado'],['Monocrática','Relator'],['Outro destino','Outro destino final']].forEach(function(x){var o=el('option','',x[1]);o.value=x[0];destSel.append(o);});destSel.value=destinoAtual;destSel.disabled=!!(window.MUTA_WEB&&window.MUTA_WEB.leitura);destRow.append(destSel);destTop.append(destRow);html(destTop,situacaoHtml());encFields.append(destTop);
  var fluxoP=pautaAtualFluxo();var enquad=el('div','gf w hero-enq-label');enquad.append(el('span','gl','Enquadramento'),el('span','ro',destinoAtual==='Sessão'?(fluxoP.estado==='oficial'?'Pauta oficial':fluxoP.estado==='adiado'?'Adiado · aguardando nova inclusão':fluxoP.estado==='retirado'?'Retirado · reavaliar seleção':fluxoP.estado==='historico'?'Reavaliar destino após julgamento':'Seleção prévia'):destinoAtual==='Monocrática'?'Hipóteses de monocrática':destinoAtual==='Outro destino'?'Outro destino final':'A definir'));encFields.append(enquad);
  var prop=el('details','gg hero-proposta-julg gf w'),propSum=el('summary'),propTitle=el('h4','','Proposta de julgamento'),propBody=el('div','gr'),propVal=S(V('triagem','Proposta de julgamento')),propHist=S(V('triagem','Registro - Proposta'));
  propSum.append(propTitle);if(propVal)propSum.append(el('span','gn','Registrada'));prop.append(propSum,propBody);
  prop.open=heroTopo.proposta!==undefined?!!heroTopo.proposta:false;
  prop.addEventListener('toggle',function(){if(prop.isConnected)heroTopo.proposta=prop.open;});
  html(propBody,campoRot('triagem','Proposta de julgamento','Proposta de julgamento'));
  if(propHist){var ph=el('details','hero-proposta-hist'),ps=el('summary','','Proposta histórica do lote'),pt=el('div','hero-proposta-hist-text',propHist);ph.append(ps,pt);propBody.append(ph);}
  encFields.append(prop);

  if(destinoAtual==='Outro destino'){html(encFields,campoRot('producao','Destino - Outro','Especificar destino'));html(encFields,campoRot('triagem','Destino - Outro Nota','Nota de enquadramento'));}
  if(destinoAtual==='Sessão'){
    var pf=fluxoP,oficial=pf.estado==='oficial',ultimo=pf.atual||pf.ultima;
    function pLinha(label,value){var r=el('div','gf');r.append(el('span','gl',label),el('span','ro',value||'—'));return r;}
    function dataPlano(label){var r=el('label','gf'),v=el('input');v.type='date';v.dataset.fk='pauta.Nova sessão de destino';v.value=pf.alvo||'';var c=campoModelo('pauta','Nova sessão de destino');v.disabled=!c||!editavel(c)||!!(window.MUTA_WEB&&window.MUTA_WEB.leitura);r.append(el('span','gl',label),v);return r;}
    if(!oficial){
      var sp=el('label','gf'),spSel=el('select');sp.append(el('span','gl','Seleção prévia'));spSel.dataset.fk='triagem.Seleção Prévia';
      [['','Não selecionado'],['SELECIONADO PREVIAMENTE','Selecionado previamente']].forEach(function(x){var o=el('option','',x[1]);o.value=x[0];spSel.append(o);});
      spSel.value=S(V('triagem','Seleção Prévia'));spSel.disabled=!!(window.MUTA_WEB&&window.MUTA_WEB.leitura);sp.append(spSel);encFields.append(sp);
      if(spSel.value==='SELECIONADO PREVIAMENTE'||pf.estado==='adiado')encFields.append(dataPlano(pf.estado==='adiado'?'Sessão prevista para remarcação':'Sessão pretendida (vazio = banco de reserva)'));
      html(encFields,campoRot('triagem','Seleção Prévia - Nota','Nota de enquadramento'));
      if(ultimo&&pf.estado!=='adiado'&&pf.estado!=='retirado')encFields.append(pLinha('Última pauta',brD(ultimo.sessao)+' · item '+ultimo.item+' · '+(ultimo.status||'Sem resultado registrado')));
      if(pf.estado==='adiado'||pf.estado==='retirado')html(encFields,campoRot('pauta','Motivo da remarcação'));
    }
    if(oficial||ultimo&&(pf.estado==='adiado'||pf.estado==='retirado')){
      var resumoP=el('div','hero-pauta-resumo gf w'),resumoL=el('div','gr');resumoP.append(el('h4','pm-mer-h',oficial?'Pauta oficial':'Pauta de origem'),resumoL);
      resumoL.classList.add('hero-pauta-linha');resumoL.append(pLinha(oficial?'Sessão atual':'Sessão de origem',brD(ultimo.sessao)),pLinha('Item',ultimo.item));
      var stP=el('label','gf'),selP=el('select'),cP=campoLista('pauta','Status de Julgamento'),ocCampo=campoModelo('pauta','Ingresso e ocorrências da sessão'),ocMap={};
      try{var om=JSON.parse(S(V('pauta','Ingresso e ocorrências da sessão'))||'{}');if(om&&typeof om==='object'&&!Array.isArray(om))ocMap=om;}catch(e){}
      var ocKey=ultimo.sessao+'|'+ultimo.item,oc=ocMap[ocKey]||{},vP=S(ultimo.status||V('pauta','Status de Julgamento'));
      stP.append(el('span','gl','Ingresso em sessão'));selP.setAttribute('aria-label','Ingresso em sessão');
      ['','PAUTADO','EM MESA'].forEach(function(v){var o=el('option','',v||'A definir');o.value=v;selP.append(o);});selP.value=oc.ingresso||(/^(PAUTADO|EM MESA)$/.test(vP)?vP:'');selP.disabled=!ocCampo||!editavel(ocCampo);stP.append(selP);resumoL.insertBefore(stP,resumoL.lastElementChild);
      function gravarOc(){if(!ocCampo||!editavel(ocCampo))return;ocMap[ocKey]=oc;marcar('pauta.Ingresso e ocorrências da sessão',JSON.stringify(ocMap));agendar(500);}
      selP.onchange=function(){oc.ingresso=selP.value;gravarOc();};
      var occ=el('div','hero-nao-julg gf w'),oh=el('div','hero-sol-head'),os=el('select'),ot=el('textarea'),ol=el('select'),oe=el('small','muted'),ob=el('button','btn line sm','Registrar solicitação'),og=el('button','btn line sm','Vincular solicitação'),cancelO=el('button','lnk','Limpar seleção');
      var naoJulgLabel=el('label','gf');naoJulgLabel.append(el('span','gl','Não julgamento'));os.setAttribute('aria-label','Não julgamento');os.disabled=!ocCampo||!editavel(ocCampo);[['','Sem ocorrência'],['Retirada de pauta','Retirada de pauta'],['Adiamento','Adiamento']].forEach(function(x){var o=el('option','',x[1]);o.value=x[0];os.append(o);});os.value=oc.ocorrencia||(pf.estado==='adiado'?'Adiamento':pf.estado==='retirado'?'Retirada de pauta':'');ot.rows=2;ot.placeholder='Justificativa obrigatória';ot.value=oc.justificativa||'';
      var of=el('div','hero-sol-form'),olabel=el('label','gf');olabel.append(el('span','gl','Solicitação de origem (opcional)'),ol);of.append(olabel,ot,oe,ob,og,cancelO);naoJulgLabel.append(os);resumoL.append(naoJulgLabel);occ.append(of);resumoP.append(occ);
      var oMan=[];try{var omr=JSON.parse(S(V('origem','Solicitações manuais'))||'[]');if(Array.isArray(omr))oMan=omr;}catch(e){}
      function refreshO(){of.hidden=!os.value;occ.hidden=!os.value;ol.replaceChildren();var blank=el('option','','Registro direto · sem solicitação');blank.value='';ol.append(blank);oMan.filter(function(r){return r.tipo===os.value&&(!r.sessaoOrigem||r.sessaoOrigem===ultimo.sessao)&&(!r.itemOrigem||String(r.itemOrigem)===String(ultimo.item));}).forEach(function(r){var o=el('option','',(r.estado||'Pendente')+' · '+S(r.justificativa||r.descricao).slice(0,90));o.value=r.id;ol.append(o);});ol.value=oc.ocorrencia===os.value?oc.solicitacao||'':'';if(ol.selectedIndex<0)ol.value='';ot.value=oc.ocorrencia===os.value?oc.justificativa||'':'';syncO(false);}
      function syncO(copy){var r=oMan.find(function(r){return r.id===ol.value;});ot.readOnly=false;if(r&&(copy||!S(ot.value)))ot.value=S(r.justificativa||r.descricao);oe.textContent=r?'Origem: solicitação '+(r.estado||'Pendente')+'. A justificativa do não julgamento pode ser complementada.':'Registro independente, sem criar solicitação.';ob.hidden=false;og.hidden=true;ob.disabled=!ocCampo||!editavel(ocCampo);ol.disabled=os.disabled;ot.disabled=os.disabled;cancelO.disabled=os.disabled;}
      os.onchange=refreshO;ol.onchange=function(){syncO(true);};ob.type=og.type=cancelO.type='button';ob.textContent='Gravar não julgamento';
      ob.onclick=function(){if(!ocCampo||!editavel(ocCampo)||!os.value)return;var t=S(ot.value);if(!t){oe.textContent='Informe a justificativa obrigatória.';return;}if(!confirm('Registrar a ocorrência efetiva de não julgamento nesta sessão? Isto não decide uma solicitação vinculada.'))return;oc.ocorrencia=os.value;oc.justificativa=t;oc.solicitacao=ol.value||'';oc.efetivada=true;gravarOc();render();};
      cancelO.onclick=function(){if(!ocCampo||!editavel(ocCampo))return;if(oc.efetivada&&!confirm('Remover o registro de não julgamento desta sessão?'))return;delete oc.ocorrencia;delete oc.justificativa;delete oc.solicitacao;delete oc.efetivada;gravarOc();render();};refreshO();
      encFields.append(resumoP);
    }
  }
  /* Solicitações: bloco único anterior ao encaminhamento, inclusive sem pauta oficial. */
  if(N(destinoAtual)==='monocratica'&&(pronAtual()===1||pronAtual()===4)){
    var hip=campoLista('triagem','Hipóteses Monocrática');if(hip)html(encFields,campo(Object.assign({},hip,{rotulo:'Hipótese do artigo 932'})));
    html(encFields,campoRot('triagem','Art. 932 - Nota de enquadramento','Nota de enquadramento'));
    /* Enquadramento único no Encaminhamento; confirmação usa os valores vigentes da ficha. */
    var conf=null;try{conf=JSON.parse(S(V('producao','Art. 932 - Confirmação'))||'null');}catch(e){}
    var hv=S(V('triagem','Hipóteses Monocrática')),hn=S(V('triagem','Art. 932 - Nota de enquadramento')),valida=!!(conf&&hv&&conf.hipotese===hv&&conf.nota===hn);
    var confirmRow=el('div','gf w hero-enc-confirm'),cb=el('button','btn line sm',valida?'Desfazer confirmação':'Confirmar enquadramento');cb.type='button';
    var confCampo=campoModelo('producao','Art. 932 - Confirmação');cb.disabled=!hv||!confCampo||!editavel(confCampo)||!!(window.MUTA_WEB&&window.MUTA_WEB.leitura);
    confirmRow.append(el('small','muted',valida?'Confirmado por '+S(conf.autor)+' · '+brD(S(conf.data).slice(0,10)):conf?'Enquadramento alterado · reconfirmar':'Aguardando confirmação'),cb);encFields.append(confirmRow);
    cb.onclick=function(){var h=S(V('triagem','Hipóteses Monocrática')),n=S(V('triagem','Art. 932 - Nota de enquadramento'));if(!h||!confCampo||!editavel(confCampo))return;var vigente=conf&&conf.hipotese===h&&conf.nota===n;marcar('producao.Art. 932 - Confirmação',vigente?'':JSON.stringify({hipotese:h,nota:n,autor:ses.estado().usuario||'',data:new Date().toISOString()}));agendar(500);render();};

  }

  var tramite=el('section','hero-tramite'),map=tramiteMapa(),mc=campoModelo('origem','Mapa de próximos passos'),canMap=!!mc&&editavel(mc);
  function salvarMapa(){if(!canMap)return;marcar('origem.Mapa de próximos passos',JSON.stringify(map));if(!heroTopo.encOpen)heroTopo.encOpen={destino:true};heroTopo.encOpen.tramite=true;agendar(500);render();}
  var mhTr=el('div','hero-sol-head'),addTr=el('button','btn line sm','+');addTr.type='button';addTr.title='Adicionar pronunciamento ou providência';addTr.setAttribute('aria-label',addTr.title);addTr.disabled=!canMap;mhTr.append(el('h4','pm-mer-h','Pronunciamentos e providências'),addTr);tramite.append(mhTr);
  /* Os registros antigos permanecem acessíveis, sem duplicar o adicionador. */
  if(['Próximo pronunciamento','Ato a proferir','Próxima ação'].some(function(k){return !!S(V('origem',k));})){var legado=el('details','hero-tr-legacy'),ls=el('summary','','Planejamento anterior'),lf=el('div','gr');legado.append(ls,lf);['Próximo pronunciamento','Ato a proferir','Próxima ação'].forEach(function(k){if(S(V('origem',k)))html(lf,campoRot('origem',k,k==='Próxima ação'?'Próxima providência':k));});tramite.append(legado);}
  var formTr=el('div','hero-sol-form');formTr.hidden=true;var kindTr=el('select'),pronTr=el('select'),txTr=el('textarea'),modeTr=el('select'),existingTr=el('select'),newTr=el('textarea'),errTr=el('small','status err'),svTr=el('button','btn solid sm','Incluir'),cxTr=el('button','lnk','Cancelar');
  function trOption(node,val,label){var o=el('option','',label);o.value=val;node.append(o);}
  function trField(label,input){var w=el('label','gf');w.append(el('span','gl',label),input);return w;}
  [['ato','Pronunciamento'],['providencia','Providência']].forEach(function(x){trOption(kindTr,x[0],x[1]);});
  trOption(pronTr,'','Selecionar pronunciamento');var pmc=campoLista('origem','Próximo pronunciamento');((pmc&&pmc.opcoes)||['Despacho','Decisão interlocutória','Acórdão','Monocrática terminativa']).forEach(function(o){var v=typeof o==='string'?o:o.valor;trOption(pronTr,v,v);});
  [['','Sem condição'],['existente','Vincular pendência existente'],['nova','Criar pendência condicionante']].forEach(function(x){trOption(modeTr,x[0],x[1]);});
  txTr.rows=2;txTr.placeholder='Descrever o ato ou a providência';newTr.rows=2;newTr.placeholder='Descrever o que deve ser sanado';
  var pronRow=trField('Pronunciamento',pronTr),existingRow=trField('Pendência existente',existingTr),newRow=trField('Nova pendência',newTr);
  function preencherExistentes(sel){sel.replaceChildren();trOption(sel,'','Selecionar pendência');[...new Set(snLinhas('pd').map(function(l){return l.replace(/^✓\s*/,'');}))].forEach(function(v){trOption(sel,v,tramiteDescricao(v)+(tramiteEstado(snLinhas('pd'),{vinculo:v})==='resolvida'?' · resolvida':''));});}
  function ajustarTr(){pronRow.hidden=kindTr.value!=='ato';existingRow.hidden=modeTr.value!=='existente';newRow.hidden=modeTr.value!=='nova';if(modeTr.value==='existente')preencherExistentes(existingTr);errTr.textContent='';}
  kindTr.onchange=modeTr.onchange=ajustarTr;svTr.type=cxTr.type='button';formTr.append(trField('Tipo',kindTr),pronRow,trField('Descrição',txTr),trField('Condicionamento',modeTr),existingRow,newRow,errTr,svTr,cxTr);tramite.append(formTr);
  addTr.onclick=function(){formTr.hidden=!formTr.hidden;if(!formTr.hidden){ajustarTr();kindTr.focus();}};cxTr.onclick=function(){formTr.hidden=true;};ajustarTr();
  function associarCond(p,mode,existing,novo){var L=snLinhas('pd');if(mode==='existente'){if(!existing||tramiteIndice(L,{vinculo:existing})<0)return false;p.condicao={vinculo:existing,criada:false};}
    else if(mode==='nova'){var t=S(novo).replace(/\s*\n+\s*/g,' ');if(!t)return false;var ref=t+' · '+(ses.estado().usuario||'equipe')+' · '+agoraBr()+' · '+p.id+'-c';L.push(ref);p.condicao={vinculo:ref,criada:true};tramiteSinal(L);}
    else delete p.condicao;return true;}
  svTr.onclick=function(){if(!canMap)return;var t=S(txTr.value).replace(/\s*\n+\s*/g,' ');if(!t||kindTr.value==='ato'&&!pronTr.value){errTr.textContent='Informe o tipo de pronunciamento e/ou a descrição do passo.';return;}
    var p={id:'tr-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),tipo:kindTr.value,texto:t,pronunciamento:kindTr.value==='ato'?pronTr.value:'',feito:false,autor:ses.estado().usuario||'',data:new Date().toISOString()};
    if(!associarCond(p,modeTr.value,existingTr.value,newTr.value)){errTr.textContent='Informe a pendência condicionante.';return;}map.passos.push(p);tramiteLog(map,p,'incluído','Trâmite',{condicao:p.condicao||null});salvarMapa();};
  var trList=el('ol','hero-tr-list'),bloqueado=false;
  map.passos.forEach(function(p,i){var cond=p.tipo==='pendencia',lin=cond?snLinhas('pd'):[],idx=cond?lin.findIndex(function(l){return l.replace(/^✓\s*/,'')===p.vinculo;}):-1,feito=cond?idx>=0&&/^✓/.test(lin[idx]):!!p.feito;
    var row=el('li','hero-tr-item'),hd=el('div','hero-sol-head'),cb=el('input');cb.type='checkbox';cb.checked=feito;var cst=p.condicao?tramiteEstado(snLinhas('pd'),p.condicao):'',cblock=!!p.condicao&&cst!=='resolvida';cb.disabled=!canMap||(!feito&&(bloqueado||cblock))||cond&&idx<0;
    cb.setAttribute('aria-label',cond?'Resolver pendência':'Concluir passo');hd.append(el('small','chip',String(i+1).padStart(2,'0')+' · '+(cond?'Pendência':p.tipo==='ato'?(p.pronunciamento||'Pronunciamento'):'Providência')),cb);row.append(hd,el('div','',p.texto),el('small','muted',feito?'Concluído':cond&&idx<0?'Vínculo ausente · conferir sinalização':cblock?'Condicionado à resolução da pendência':bloqueado?'Aguardando passo anterior':cond?'Aguardando resolução':'Disponível'));
    cb.onchange=function(){if(!canMap)return;if(cond){var L=snLinhas('pd'),k=L.findIndex(function(l){return l.replace(/^✓\s*/,'')===p.vinculo;});if(k<0)return;L[k]=(cb.checked?'✓ ':'')+p.vinculo;marcar('triagem.O que falta sanar',L.join('\n'));try{situacaoSync();}catch(e){}}else p.feito=cb.checked;tramiteLog(map,p,cb.checked?'concluído':'reaberto','Trâmite');salvarMapa();};
    if(p.condicao){var cr=el('div','hero-tr-condition'),ck=el('input');ck.type='checkbox';ck.checked=cst==='resolvida';ck.disabled=!canMap||cst==='ausente';ck.setAttribute('aria-label','Resolver pendência condicionante');cr.append(ck,el('span','',tramiteDescricao(p.condicao.vinculo)),el('small','muted',cst==='ausente'?'Vínculo ausente':ck.checked?'Resolvida':'Pendente'));row.append(cr);ck.onchange=function(){var L=snLinhas('pd'),k=tramiteIndice(L,p.condicao);if(k<0)return;L[k]=(ck.checked?'✓ ':'')+p.condicao.vinculo;tramiteSinal(L);map.passos.filter(function(x){return x.condicao&&x.condicao.vinculo===p.condicao.vinculo||x.tipo==='pendencia'&&x.vinculo===p.condicao.vinculo;}).forEach(function(x){tramiteLog(map,x,ck.checked?'pendência resolvida':'pendência reaberta','Trâmite');});salvarMapa();};}
    var toolsTr=el('div','hero-tr-actions');
    function actionTr(label,title,fn,disabled){var b=el('button','btn line sm',label);b.type='button';b.title=title;b.setAttribute('aria-label',title);b.disabled=!canMap||!!disabled;b.onclick=fn;toolsTr.append(b);}
    function mover(delta){var j=i+delta;if(j<0||j>=map.passos.length)return;map.passos.splice(i,1);map.passos.splice(j,0,p);tramiteLog(map,p,'reordenado','Trâmite',{de:i+1,para:j+1});salvarMapa();}
    actionTr('↑','Mover para cima',function(){mover(-1);},i===0);
    actionTr('↓','Mover para baixo',function(){mover(1);},i===map.passos.length-1);
    actionTr('Editar','Editar descrição',function(){var editor=el('textarea');editor.rows=2;editor.value=p.texto;var save=el('button','btn solid sm','Salvar'),cancel=el('button','lnk','Cancelar');save.type=cancel.type='button';var ed=el('div','hero-sol-form');ed.append(editor,save,cancel);toolsTr.hidden=true;row.append(ed);editor.focus();cancel.onclick=function(){ed.remove();toolsTr.hidden=false;};save.onclick=function(){var v=S(editor.value).replace(/\s*\n+\s*/g,' ');if(!v)return;var ant=p.texto;if(cond){var L=snLinhas('pd'),k=tramiteIndice(L,p);if(k<0)return;var novo=v+' · '+(p.autor||'equipe')+' · '+agoraBr()+' · '+p.id;L[k]=(/^✓/.test(L[k])?'✓ ':'')+novo;p.vinculo=novo;tramiteSinal(L);}p.texto=v;tramiteLog(map,p,'editado','Trâmite',{anterior:ant});salvarMapa();};});
    if(cond)actionTr(cond?'→ Providência':'→ Pendência',cond?'Converter em providência':'Converter em pendência',function(){
      if(!canMap)return;var L=snLinhas('pd'),ant=p.tipo;
      if(cond){var k=tramiteIndice(L,p);p.feito=k>=0&&/^✓/.test(L[k]);if(k>=0)L.splice(k,1);delete p.vinculo;p.tipo='providencia';}
      else{p.tipo='pendencia';p.vinculo=p.texto+' · '+(p.autor||'equipe')+' · '+agoraBr()+' · '+p.id;L.push((p.feito?'✓ ':'')+p.vinculo);delete p.feito;}
      tramiteSinal(L);tramiteLog(map,p,'convertido','Trâmite',{de:ant,para:p.tipo});salvarMapa();
    });
    if(cond&&idx<0)actionTr('Restaurar vínculo','Restaurar sinalização ausente',function(){var L=snLinhas('pd');if(tramiteIndice(L,p)<0){p.vinculo=p.vinculo||p.texto+' · '+(p.autor||'equipe')+' · '+agoraBr()+' · '+p.id;L.push(p.vinculo);tramiteSinal(L);tramiteLog(map,p,'vínculo restaurado','Trâmite');salvarMapa();}});
    if(!cond)actionTr(p.condicao?'Condição':'Vincular pendência','Configurar pendência condicionante',function(){
      var ed=el('div','hero-sol-form'),m=el('select'),e=el('select'),t=el('textarea'),ok=el('button','btn solid sm','Gravar'),cancel=el('button','lnk','Cancelar'),er=el('small','status err');
      [['manter','Manter condição atual'],['','Sem condição'],['existente','Vincular existente'],['nova','Criar pendência']].forEach(function(x){if(x[0]!=='manter'||p.condicao)trOption(m,x[0],x[1]);});preencherExistentes(e);t.placeholder='Nova pendência';t.rows=2;ok.type=cancel.type='button';m.onchange=function(){e.hidden=m.value!=='existente';t.hidden=m.value!=='nova';};m.onchange();ed.append(m,e,t,er,ok,cancel);row.append(ed);toolsTr.hidden=true;cancel.onclick=function(){ed.remove();toolsTr.hidden=false;};ok.onclick=function(){if(m.value!=='manter'){if(!associarCond(p,m.value,e.value,t.value)){er.textContent='Informe a pendência.';return;}tramiteLog(map,p,'condição alterada','Trâmite',{condicao:p.condicao||null});}salvarMapa();};
    });
    actionTr('×','Remover passo',function(){if(!confirm('Remover este passo do Trâmite?'))return;if(cond){var L=snLinhas('pd'),k=tramiteIndice(L,p);if(k>=0)L.splice(k,1);tramiteSinal(L);}tramiteLog(map,p,'removido','Trâmite');map.passos.splice(i,1);salvarMapa();});
    row.append(toolsTr);
    if(!feito)bloqueado=true;trList.append(row);
  });tramite.append(trList);if(!map.passos.length)tramite.append(el('small','muted','Nenhum passo mapeado.'));if(map.historico.length){var hTr=el('details','hero-tr-history'),hs=el('summary','','Histórico do trâmite · '+map.historico.length);hTr.append(hs);map.historico.slice().reverse().forEach(function(e){var r=el('div','hero-tr-item');r.append(el('b','',S(e.acao)),el('div','',S(e.texto)||S(e.id)),el('small','muted',[fmtV(e.data),e.autor,e.origem].filter(Boolean).join(' · ')));if(e.de!=null)r.append(el('small','muted',String(e.de)+' → '+String(e.para)));hTr.append(r);});tramite.append(hTr);}
  /* Três seções no mesmo cartão; o seletor existente mantém seus eventos e estado. */
  if(!heroTopo.encOpen)heroTopo.encOpen={destino:true,tramite:heroTopo.encTab==='tramite'};
  var tipoSec=el('section','hero-enc-tipo-section');tipoSec.append(tj);encSection.append(tipoSec);
  var encGroups=[['destino','Destino',encFields],['tramite','Trâmite',tramite]];
  encGroups.forEach(function(x){var d=el('details','gg hero-enc-group'),h=el('summary'),t=el('h4','',x[1]);h.append(t);d.append(h,x[2]);x[2].hidden=false;d.open=!!heroTopo.encOpen[x[0]];d.addEventListener('toggle',function(){if(d.isConnected)heroTopo.encOpen[x[0]]=d.open;});encSection.append(d);});
  var solTab=el('details','hero-acomp hero-solicitacoes-tab'),solSum=el('summary','','Solicitações'),solBody=el('div','hero-acomp-b');
  solTab.append(solSum,solBody);
  var manCampo=campoModelo('origem','Solicitações manuais'),man=[];
  try{var raw=JSON.parse(S(V('origem','Solicitações manuais'))||'[]');if(Array.isArray(raw))man=raw.filter(function(x){return x&&typeof x==='object';});}catch(e){}
  var canSol=!!manCampo&&editavel(manCampo),canDec=canSol&&!!G.desembargador;
  function salvarSol(r){if(!canSol)return;marcar('origem.Solicitações manuais',JSON.stringify(man));agendar(500);render();}
  var solGroups=[['Sustentação oral',['Sustentação presencial','Sustentação por videoconferência']],['Preferência',['Preferência']],['Despacho',['Despacho']],['Retirada de pauta',['Retirada de pauta']],['Adiamento',['Adiamento']],['Outras',['Outra solicitação']]];
  var solHead=el('div','pc-sh hero-sol-head'),add=el('button','btn line sm','+ Solicitação');add.type='button';add.disabled=!canSol;solHead.append(el('h3','','Solicitações'),add);solBody.append(solHead);
  var form=el('div','hero-sol-form');form.hidden=true;var tipo=el('select'),pessoa=el('input'),oab=el('input'),parte=el('input'),desc=el('textarea'),data=el('input'),sessao=el('input'),save=el('button','btn solid sm','Registrar'),cancel=el('button','lnk','Cancelar'),err=el('small','status err');
  solGroups.forEach(function(g){g[1].forEach(function(t){var o=el('option','',t);o.value=t;tipo.append(o);});});
  tipo.setAttribute('aria-label','Tipo de solicitação');oab.placeholder='OAB';parte.placeholder='Parte representada';data.type='date';data.value=hojeIso();sessao.type='date';sessao.value=/^\d{4}-\d{2}-\d{2}$/.test(S(V('pauta','Sessão original')))?S(V('pauta','Sessão original')):'';save.type=cancel.type='button';desc.rows=3;
  function campoSol(label,ctrl){var w=el('label','gf');w.append(el('span','gl',label),ctrl);return w;}
  var lp=campoSol('Solicitante / advogado',pessoa),lo=campoSol('OAB',oab),la=campoSol('Parte representada',parte),ld=campoSol('Data do pedido',data),ls=campoSol('Sessão',sessao),lt=campoSol('Descrição ou observação',desc);
  form.append(campoSol('Tipo',tipo),lp,lo,la,ld,ls,lt,err,save,cancel);solBody.append(form);
  function extTipo(t){return t==='Preferência'||/^Sustentação/.test(t);}
  function intTipo(t){return t==='Retirada de pauta'||t==='Adiamento';}
  function ajustarForm(){var t=tipo.value,ex=extTipo(t),interno=intTipo(t);lp.firstChild.textContent=interno?'Servidor solicitante':'Solicitante / advogado';pessoa.readOnly=interno;if(interno)pessoa.value=ses.estado().usuario||'';else if(pessoa.value===ses.estado().usuario)pessoa.value='';lo.hidden=la.hidden=!ex;ls.hidden=!ex&&t!=='Adiamento';ls.firstChild.textContent=t==='Adiamento'?'Sessão pretendida':'Sessão';ld.hidden=ex;lt.hidden=ex;lt.firstChild.textContent=interno?'Justificativa obrigatória':'Descrição ou observação';err.textContent='';}
  tipo.onchange=ajustarForm;add.onclick=function(){form.hidden=!form.hidden;if(!form.hidden){var g=solGroups.find(function(g){return g[0]===heroTopo.tipoSol;});if(g)tipo.value=g[1][0];ajustarForm();tipo.focus();}};cancel.onclick=function(){form.hidden=true;};
  save.onclick=function(){if(!canSol)return;var t=tipo.value,interno=intTipo(t),txt=S(desc.value),g=solGroups.find(function(g){return g[1].indexOf(t)>=0;});heroTopo.tipoSol=g?g[0]:t;
    if(extTipo(t)){if(!S(pessoa.value)||!S(parte.value)||!sessao.value){err.textContent='Informe advogado, parte e sessão.';return;}if(!window.MutaPauta||!window.MutaPauta.registrarPedido){err.textContent='Integração de pedidos indisponível.';return;}save.disabled=true;var cnj=G.cnj;window.MutaPauta.registrarPedido({cnj:cnj,tipo:t==='Preferência'?t:t==='Sustentação presencial'?'Presencial':'Virtual',data:sessao.value,advogado:S(pessoa.value),oab:S(oab.value),parte:S(parte.value)}).then(function(){if(G.cnj===cnj){render();}},function(e){err.textContent=e.message||'Não foi possível registrar.';save.disabled=false;});return;}
    if(interno&&!txt){err.textContent='Informe a justificativa.';return;}var fluxoSol=pautaAtualFluxo(),origSol=fluxoSol.atual;man.push({id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),tipo:t,solicitante:S(pessoa.value),descricao:txt,justificativa:interno?txt:'',data:data.value||hojeIso(),sessaoPretendida:sessao.value,...(origSol?{sessaoOrigem:origSol.sessao||'',itemOrigem:origSol.item||''}:{}),autor:ses.estado().usuario||'',estado:'Pendente',criadoEm:new Date().toISOString()});salvarSol();};
  var solNav=el('div','hero-sol-nav'),solPanels=el('div','hero-sol-panels');solBody.append(solNav,solPanels);
  var activeSol=heroTopo.tipoSol||(enhanced?'Todas':'Sustentação oral');
  if(enhanced){solBody.classList.add('pv3-solicitacoes');var stats=el('div','pv3-sol-stats');[['Registradas',man.length],['Pendentes',man.filter(function(r){return !r.estado||r.estado==='Pendente';}).length],['Apreciadas',man.filter(function(r){return ['Deferida','Indeferida'].includes(r.estado);}).length]].forEach(function(x){var v=el('div','pv3-sol-stat');v.append(el('b','',String(x[1])),el('small','',x[0]));stats.append(v);});var cap=el('small','muted pv3-sol-caption','Solicitações internas · sustentações e preferências consultadas na pauta');solHead.after(stats,cap);var all=el('button','hero-sol-type','Todas');all.type='button';all.setAttribute('aria-pressed',String(activeSol==='Todas'));all.onclick=function(){heroTopo.tipoSol='Todas';solNav.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b===all));});Array.from(solPanels.children).forEach(function(p){p.hidden=false;});};solNav.append(all);}
  solGroups.forEach(function(group){var nome=group[0],tipos=group[1],externo=nome==='Sustentação oral'||nome==='Preferência',tab=el('button','hero-sol-type',nome),panel=el('section','hero-sol-panel');
    tab.type='button';tab.setAttribute('aria-pressed',String(activeSol===nome));panel.hidden=activeSol!==nome&&(!enhanced||activeSol!=='Todas');solNav.append(tab);solPanels.append(panel);if(enhanced){panel.append(el('h4','pv3-sol-category',nome));var count=man.filter(function(r){return tipos.indexOf(r.tipo)>=0;}).length;if(count)tab.append(el('small','pv3-sol-count',String(count)));}
    tab.onclick=function(){heroTopo.tipoSol=nome;solNav.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b===tab));});Array.from(solPanels.children).forEach(function(p){p.hidden=p!==panel;});};
    if(externo){var ped=el('div','hero-pauta-pedidos');ped.dataset.cnj=G.cnj;panel.append(ped);if(window.MutaPauta&&window.MutaPauta.pedidosProcesso)window.MutaPauta.pedidosProcesso(ped,G.cnj,nome);}
    if(nome==='Despacho')html(panel,campoRot('origem','Solicitações de despacho','Registros anteriores'));
    var registros=man.filter(function(r){return tipos.indexOf(r.tipo)>=0;});if(enhanced)registros.sort(function(a,b){var ap=!a.estado||a.estado==='Pendente',bp=!b.estado||b.estado==='Pendente';return Number(bp)-Number(ap)||S(b.criadoEm||b.data).localeCompare(S(a.criadoEm||a.data));});
    registros.forEach(function(r){var card=el('div','hero-sol-item'),h=el('div','hero-sol-head');h.append(el('b','',r.tipo),el('span','chip',r.estado||'Pendente'));card.append(h,el('small','muted',[fmtV(r.data),r.solicitante].filter(Boolean).join(' · ')));if(enhanced){card.dataset.solEstado=r.estado||'Pendente';if(r.sessaoOrigem||r.itemOrigem)card.append(el('small','muted','Origem: '+[fmtV(r.sessaoOrigem),r.itemOrigem?'item '+r.itemOrigem:''].filter(Boolean).join(' · ')));if(r.oab||r.parte)card.append(el('small','muted',[r.oab?'OAB '+r.oab:'',r.parte].filter(Boolean).join(' · ')));}if(r.sessaoPretendida)card.append(el('small','muted','Sessão pretendida: '+fmtV(r.sessaoPretendida)));if(r.descricao||r.justificativa)card.append(el('div','hero-sol-desc',r.justificativa||r.descricao));
    if(r.decididoPor)card.append(el('small','muted','Decidido por '+r.decididoPor+' · '+fmtV(r.decididoEm)));
    if(canDec&&!['Deferida','Indeferida'].includes(r.estado)&&!externo){var actions=el('div','hero-sol-head');[['Deferir','Deferida'],['Indeferir','Indeferida']].forEach(function(v){var b=el('button','btn line sm',v[0]);b.type='button';b.onclick=function(){if(!canDec||!confirm(v[0]+' esta solicitação?'))return;r.estado=v[1];if(enhanced){r.decididoPor=ses.estado().usuario||'';r.decididoEm=new Date().toISOString();}heroTopo.tipoSol=nome;salvarSol();};actions.append(b);});card.append(actions);}panel.append(card);});
    if(!registros.length&&!externo)panel.append(el('small','muted','Nenhuma solicitação registrada.'));
  });
  if(enhanced){var filt=el('select','pv3-sol-filter');filt.setAttribute('aria-label','Filtrar solicitações internas por situação');[['Todas','Todas as situações'],['Pendente','Pendentes'],['Deferida','Deferidas'],['Indeferida','Indeferidas']].forEach(function(x){var o=el('option','',x[1]);o.value=x[0];filt.append(o);});filt.value=heroTopo.solFiltro||'Todas';function filtrarSol(){heroTopo.solFiltro=filt.value;solPanels.querySelectorAll('[data-sol-estado]').forEach(function(x){x.hidden=filt.value!=='Todas'&&x.dataset.solEstado!==filt.value;});}filt.onchange=filtrarSol;solNav.after(filt);filtrarSol();}
  var hist=el('details','hero-pauta-hist'),histTitle=el('summary','','Histórico de julgamento'),histBody=el('div','hero-hist-body');hist.append(histTitle,histBody);hist.open=!!heroTopo.histJulg;hist.addEventListener('toggle',function(){if(hist.isConnected)heroTopo.histJulg=hist.open;});
  html(histBody,historicoJulgamento());
  var histModelo=campoModelo('triagem','Histórico de julgamento'),histRaw=V('triagem','Histórico de julgamento');
  if(histModelo){
    var histRows=Array.isArray(histRaw)?JSON.parse(JSON.stringify(histRaw)):[],histEdit=editavel(histModelo)&&!(window.MUTA_WEB&&window.MUTA_WEB.leitura),histValid=Array.isArray(histRaw)||!histRaw;
    function histGravar(){marcar('triagem.Histórico de julgamento',histRows);heroTopo.histJulg=true;heroTopo.pagina=2;agendar(500);render();}
    var custom=el('div','hero-hist-custom');histBody.append(custom);
    custom.append(el('h4','pm-mer-h','Registros e justificativas'));
    if(!histValid)custom.append(el('p','muted','Registro em formato não reconhecido; preservado.'));
    else {
      function historicoEditor(row,i){
        var form=el('div','hero-sol-form'),grid=el('div','gr'),refs={};form.append(grid);
        (histModelo.colunas||[]).forEach(function(c){var label=el('label','gf'+(c.tipo==='texto-longo'?' w':'')),input=el(c.opcoes?'select':c.tipo==='texto-longo'?'textarea':'input');label.append(el('span','gl',c.rotulo));if(c.opcoes){var empty=el('option','','—');empty.value='';input.append(empty);var vals=c.opcoes.slice();if(row[c.chave]&&vals.indexOf(row[c.chave])<0)vals.push(row[c.chave]);vals.forEach(function(v){var op=el('option','',v);op.value=v;input.append(op);});}else if(c.tipo==='data')input.type='date';else if(c.tipo==='texto-longo')input.rows=2;input.value=S(row[c.chave]);refs[c.chave]=input;label.append(input);grid.append(label);});
        var save=el('button','btn solid sm','Salvar evento'),cancel=el('button','lnk','Cancelar');save.type=cancel.type='button';form.append(save,cancel);custom.append(form);cancel.onclick=function(){form.remove();};save.onclick=function(){var next=Object.assign({},row);Object.keys(refs).forEach(function(k){next[k]=S(refs[k].value);});if(!next.data||!next.evento||(['Retirada','Adiamento','Vista','Suspensão','Conversão em diligência'].includes(next.evento)&&!next.justificativa)){st('Informe data, evento e justificativa da intercorrência.','err');return;}if(i<0){if(histRows.length>=60){st('Limite atual: 60 eventos.','err');return;}histRows.push(next);}else histRows[i]=next;histGravar();};
      }
      histRows.forEach(function(row,i){var d=el('details','hero-tr-item'),h=el('summary','', [fmtV(row.data),row.evento,row.tipo_julgamento,row.sessao].filter(Boolean).join(' · ')||'Evento');d.append(h);(histModelo.colunas||[]).filter(function(c){return !!row[c.chave];}).forEach(function(c){d.append(el('div','',c.rotulo+': '+row[c.chave]));});if(histEdit){var b=el('button','btn line sm','Editar'),del=el('button','btn line sm','Remover');b.type=del.type='button';b.onclick=function(){historicoEditor(row,i);};del.onclick=function(){if(confirm('Excluir este evento registrado?')){histRows.splice(i,1);histGravar();}};d.append(b,del);}custom.append(d);});
      if(histEdit){var add=el('button','btn line sm','+ Evento de julgamento');add.type='button';add.onclick=function(){historicoEditor({data:new Date().toISOString().slice(0,10)},-1);};custom.append(add);}
    }
  }
  hist.classList.add('hero-aut-historico');aut.append(hist);
  body.prepend(encSection);body.append(tagsGroup);
  /* Responsável pelo acompanhamento: mesma chave da ficha, agora ao lado das designações. */
  var responsaveis=Array.from(caixa.querySelectorAll('[data-fk="origem.Responsável"],[data-pv-field="origem.Responsável"]'));
  responsaveis.forEach(function(x){var f=x.closest('.gf,.pv-field,.pv-idrow');if(f)f.remove();else x.remove();});
  var design=steps.querySelector('.hero-designacoes');if(!design){design=el('div','hero-designacoes');steps.append(design);}
  /* Três designações independentes em uma única faixa. O valor persistido é o nome do cadastro. */
  var equipe=Array.isArray(G.equipe)?G.equipe:[],roles=[['origem','Responsável','Responsável'],['producao','SERVIDOR','Minutador'],['producao','CORRETOR','Corretor']];
  var normNome=function(v){return N(S(v));};
  function curto(r){if(r.apelido)return r.apelido;if(normNome(r.nome)==='maria eduarda')return 'Duda';return r.nome;}
  design.replaceChildren();
  roles.forEach(function(role){
    var sec=role[0],key=role[1],label=role[2],cur=S(V(sec,key)),item=el('label','hero-design-cell'),found=equipe.find(function(r){return [r.nome].concat(r.aliases||[]).some(function(x){return normNome(x)===normNome(cur);});});
    item.append(el('span','gl',label));var disabled=!!(window.MUTA_WEB&&window.MUTA_WEB.leitura)||(sec==='producao'&&!G.gestor);
    html(item,heroEquipeInput(found?found.nome:cur,'data-fk="'+esc(sec+'.'+key)+'" aria-label="'+esc(label)+'"'+(disabled?' disabled':''),'design-'+key));design.append(item);
  });
  /* Três visões mutuamente exclusivas do mesmo cartão: Etapas, Sinalizações e Monitoramento. */
  var sgBox=null;
  [['monitoramento',mon],['sinalizacoes',sd]].forEach(function(x){x[1].id='hero-dock-pane-'+x[0];var sm=x[1].querySelector('summary');if(sm)sm.hidden=true;});
  mon.hidden=true;mon.open=true;
  function abrirMon(foco){
    foco=foco||'';
    var fechar=heroTopo.abaAcomp==='monitoramento'&&heroTopo.monFoco===foco&&heroTopo.pagina===0;
    heroTopo.monFoco=fechar?'':foco;
    show(0);abrirA(fechar?'':'monitoramento');
    if(!fechar&&foco){
      var t=foco==='sigilo'?sgBox:mon.querySelector('.ct-i.'+foco);
      if(t){var parent=t.closest('.hero-mon-available');if(parent)parent.open=true;var detail=t.querySelector('.ct-mais');if(detail)detail.open=true;t.scrollIntoView({block:'nearest'});}
    }
  }
  /* Sinalizações: ocupam o lugar das etapas no mesmo cartão (não abrem abaixo); "‹ Etapas" ou a mesma categoria voltam. */
  var SNR={pd:'Pendências',ic:'Intercorrências',av:'Avisos'},stepsTitle=stepsHead.querySelector('h4'),voltar=el('button','hero-steps-voltar','‹ Etapas');
  voltar.type='button';voltar.title='Voltar às etapas';voltar.hidden=true;voltar.onclick=function(){abrirA('');};
  function abrirA(k){
    if(k==='acompanhamento'){show(1);return;}
    var on=k==='sinalizacoes',monitor=k==='monitoramento';heroTopo.abaAcomp=on||monitor?k:'';heroTopo.sinalizacoes=on;
    if(!monitor)heroTopo.monFoco='';
    sd.hidden=!on;sd.open=on;mon.hidden=!monitor;mon.open=monitor;
    steps.classList.toggle('hero-steps-sn',on);steps.classList.toggle('hero-steps-mon',monitor);
    if(stepsTitle)stepsTitle.textContent=monitor?'Monitoramento':on?'Sinalizações'+(SNR[heroTopo.snKind]?' · '+SNR[heroTopo.snKind]:''):'Etapas';voltar.hidden=!(on||monitor);
    status.querySelectorAll('[data-mon-foco]').forEach(function(b){var p=monitor&&b.dataset.monFoco===(heroTopo.monFoco||'');b.setAttribute('aria-expanded',String(monitor));b.setAttribute('aria-pressed',String(p));});
    mon.querySelectorAll('.ct-i').forEach(function(c){c.classList.toggle('hero-mon-foco',monitor&&!!heroTopo.monFoco&&c.classList.contains(heroTopo.monFoco));});
    ind.querySelectorAll('button').forEach(function(b){var p=on&&b.dataset.snKind===heroTopo.snKind;b.setAttribute('aria-pressed',String(p));b.setAttribute('aria-expanded',String(p));});
    sig.querySelectorAll('.sn-i').forEach(function(r){r.hidden=on&&!!heroTopo.snKind&&!r.classList.contains(heroTopo.snKind);});
  }
  ind.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-controls',sd.id);b.onclick=function(){var kind=b.dataset.snKind,close=heroTopo.abaAcomp==='sinalizacoes'&&heroTopo.snKind===kind;heroTopo.snKind=kind;G.snTp=kind;abrirA(close?'':'sinalizacoes');};});
  ind.setAttribute('role','group');ind.setAttribute('aria-label','Sinalizações');stepsHead.append(voltar,ind);
  urg.onclick=function(){abrirMon('urgencia');};
  if(flow&&flow.parentNode===steps)flow.after(sd,mon);else steps.append(sd,mon);
  encFace.append(ac);
  /* Condições processuais: apenas indicadores no cabeçalho, sem alteração de estado ao consultar. */
  var status=el('div','hero-case-status');status.setAttribute('role','group');status.setAttribute('aria-label','Condições do processo');
  urg.classList.add('hero-status-icon','status-urgencia');urg.title='Urgência'+(ctlSim('urgencia')?' · ativa':' · não registrada');urg.setAttribute('aria-label',urg.title);urg.setAttribute('aria-controls',mon.id);urg.dataset.monFoco='urgencia';urg.disabled=false;urg.dataset.ativo=String(ctlSim('urgencia'));urg.hidden=!ctlSim('urgencia');status.append(urg);
  var sg=top.querySelector('.sg-b'),lock=el('button','hero-status-icon status-sigilo');lock.type='button';lock.innerHTML=SV('<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',14);
  lock.title=sg?sg.textContent.trim():'Sigilo · sem restrição identificada';lock.setAttribute('aria-label',lock.title);lock.dataset.ativo=String(!!sg);lock.dataset.estado=sg?(sg.classList.contains('sg-ok')?'liberado':sg.classList.contains('sg-l')?'consulta':'restrito'):'inativo';
  if(sg){sgBox=el('section','hero-sig-details');sgBox.append(sg);mb.prepend(sgBox);lock.setAttribute('aria-controls',mon.id);lock.dataset.monFoco='sigilo';lock.onclick=function(){abrirMon('sigilo');};}else{lock.disabled=true;}
  lock.hidden=!sg;status.append(lock);
  [['meta','Meta','<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'],['sensivel','Caso sensível','<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="M12 8v4m0 4h.01"/>']].forEach(function(x){var b=el('button','hero-status-icon status-'+x[0]);b.type='button';b.innerHTML=SV(x[2],14);b.dataset.ativo=String(ctlSim(x[0]));b.hidden=!ctlSim(x[0]);b.title=x[1]+(ctlSim(x[0])?' · ativo':' · não registrado');b.setAttribute('aria-label',b.title);b.setAttribute('aria-controls',mon.id);b.dataset.monFoco=x[0];b.onclick=function(){abrirMon(x[0]);};status.append(b);});
  var openMon=el('button','hero-monitor-hover','Monitoramento');openMon.type='button';openMon.title='Abrir monitoramento';openMon.setAttribute('aria-label','Abrir monitoramento');openMon.setAttribute('aria-controls',mon.id);openMon.dataset.monFoco='';openMon.onclick=function(){abrirMon('');};status.append(openMon);status.classList.toggle('hero-monitor-empty',!Array.from(status.querySelectorAll('.hero-status-icon')).some(function(b){return !b.hidden;}));nav.append(status);
  solBody.classList.add('hero-sol-main-body');
  var solMain=caixa.querySelector('#hero-sol-main');
  if(solMain){solMain.append(solBody);if(window.MutaPauta&&window.MutaPauta.receberEditor)window.MutaPauta.receberEditor(G.cnj,solBody);}
  if(heroTopo.abaAcomp==='solicitacoes')heroTopo.abaAcomp='';
  if(heroV53()){
    /* Reorganiza os nós reais, sem clonar inputs, IDs, handlers ou registros.
       Os callbacks legados de Autuação/Caso abrem Perfil; os de tipo abrem Triagem. */
    var mainTabs=caixa.querySelector('.hero-v53-tabs'),gbody=caixa.querySelector('.gbody');
    var resumo=G.aba==='Processo'&&G.rot==='res';
    var perfil=el('section','hero-v53-profile hero-profile-static'),perfilSum=el('h4','hero-editorial-heading hero-editorial-heading-main','Perfil do processo');
    perfil.classList.add('hero-profile-editorial');aut.classList.add('hero-profile-aut');mat.classList.add('hero-profile-context');
    perfil.append(perfilSum,aut,mat);aut.hidden=mat.hidden=false;
    /* Perfil editorial: reutiliza os nós da autuação e das partes, sem clonar editores. */
    var profileAut=au||el('section','hero-profile-aut-fallback'),profileDL=profileAut.querySelector('.pc-dl')||el('dl','pc-dl');
    if(!au)aut.prepend(profileAut);
    var profileParts=el('section','hero-profile-band hero-profile-partes');
    Array.from(profileAut.children).forEach(function(n){
      if(n.matches('.pc-ps,.pm-pt')||(n.matches('h4')&&S(n.textContent)==='Partes'))profileParts.append(n);
      else if(n.matches('h4')&&S(n.textContent)==='Autuação')n.remove();
    });
    if(profileParts.children.length){if(!profileParts.querySelector('h4'))profileParts.prepend(el('h4','pm-mer-h','Partes'));profileAut.after(profileParts);}
    var profileTitle=el('h4','pm-mer-h hero-profile-band-title','Identificação e Autuação');
    function profileField(label,value){var existing=Array.from(profileDL.children).find(function(n){var k=n.querySelector('dt');return k&&S(k.textContent)===label;});if(existing)return existing;var n=el('div');n.append(el('dt','',label),el('dd','',S(value)||'—'));return n;}
    var profileNumber=profileField('Processo',G.cnj);profileNumber.classList.add('hero-profile-number');
    profileDL.prepend(profileNumber,profileField('Classe',classFull),profileField('Seção competente',secao),profileField('Relator',R['Relator']));
    var pSummary=profileAut.querySelector(':scope > summary');if(pSummary)pSummary.after(profileTitle);else profileAut.prepend(profileTitle);
    profileTitle.after(profileDL);var pTask=profileAut.querySelector(':scope > .pm-tf');if(pTask)profileDL.after(pTask);
    profileAut.classList.add('hero-profile-band');
    heroTopo.perfil=true;
    /* Perfil e pauta: painéis expansíveis independentes; a ficha completa mantém seu diálogo. */
    id.append(perfil);var fichaBtn=null,fdlg=null;if(fichaFacePermitida()&&window.MutaGabinete&&window.MutaGabinete.fichaFace){fichaBtn=el('button','btn line sm hero-v53-ficha-btn','Ficha completa');fichaBtn.type='button';fdlg=el('dialog','hero-v53-field-dialog hero-v53-ficha-dlg');var fhd=el('div','hero-v53-dlg-head'),fclose=el('button','btn line sm','Fechar'),fb=el('div','hero-v53-ficha-body');fclose.type='button';fhd.append(el('h4','pm-mer-h','Ficha completa'),fclose);fdlg.append(fhd,fb);fichaBtn.onclick=function(){if(!fichaFacePermitida())return;fb.replaceChildren();html(fb,window.MutaGabinete.fichaFace());fdlg.showModal();};fclose.onclick=function(){fdlg.close();};fdlg.addEventListener('close',function(){fb.replaceChildren();});}
    var pautaPerfil=el('details','hero-v53-profile'),pautaSum=el('summary','','Pauta e julgamento');
    pautaPerfil.append(pautaSum);
    /* Usa os controles e histórico já construídos; não cria segunda edição da pauta. */
    var pautaBody=el('div','hero-v53-pauta-body'),pautaReal=encFields.querySelector('.hero-pauta-resumo');
    if(pautaReal&&resumo){pautaBody.append(pautaReal);var pg=grupoModelo('Pauta e julgamento');if(pg)html(pautaBody,pg.campos.filter(function(c){return /^Pauta - /.test(c.chave);}).map(campo).join(''));}
    else if(resumo){var pg=grupoModelo('Pauta e julgamento');if(pg)html(pautaBody,pg.campos.filter(function(c){return c.chave!=='Ingresso e ocorrências da sessão';}).map(campo).join(''));}
    pautaPerfil.append(pautaBody);pautaPerfil.open=!!heroTopo.pautaPerfil;
    pautaPerfil.addEventListener('toggle',function(){if(pautaPerfil.isConnected)heroTopo.pautaPerfil=pautaPerfil.open;});
    if(resumo&&destGrav()==='Sessão'){var full=id.querySelector('.hero-v53-profile:nth-last-child(1)');perfil.after(pautaPerfil);}
    /* Composição da prévia: dois painéis nativos independentes, sem abas simulando expansão. */
    var painel=el('section','hero-v53-painel hero-profile-panels'),pbody=el('div','hero-v53-painel-body');
    var pabas=[['perfil','Perfil do processo',perfil]];if(pautaPerfil.parentNode)pabas.push(['pauta','Pauta e julgamento',pautaPerfil]);
    perfil.replaceWith(painel);pbody.append(perfil);if(pabas.length>1)pbody.append(pautaPerfil);
    pabas.forEach(function(a){a[2].classList.add('hero-profile-panel');});
    var psync=function(){painel.classList.toggle('aberto',pabas.some(function(x){return x[2]===perfil||x[2].open;}));};
    pabas.forEach(function(a){a[2].addEventListener('toggle',psync);});
    painel.append(pbody);
    if(fichaBtn){var fichaTools=el('div','hero-profile-tools');fichaTools.append(fichaBtn);perfil.append(fichaTools);}
    if(fdlg)painel.append(fdlg);psync();
    /* Acesso aos documentos: fonte existente da leitura, IDs registrados na ficha. */
    var auDocs=window.MutaAutos,coverage=el('details','hero-v53-coverage'),cvSum=el('summary','','Documentos extraídos');
    coverage.append(cvSum);
    if(!(window.MutaSigilo&&(window.MutaSigilo.bloqueado()||window.MutaSigilo.sigiloso()))){
      var cvList=el('div','hero-v53-coverage-list'),live=auDocs&&auDocs.cobertura?auDocs.cobertura():null;
      cvList.append(el('small','muted',live?live.filter(function(d){return d.naFicha;}).length+' documento(s) referenciado(s) · '+live.filter(function(d){return d.gravado;}).length+' inteiro(s) teor(es) com gravação confirmada nesta sessão':'Leia os autos para conferir a cobertura documental.'));
      (live||[]).forEach(function(d){
        var row=el('div','hero-v53-coverage-row');
        row.append(el('span','',S(d.desc||d.tipo)||'Documento'),el('small','muted','ID '+S(d.id)+' · '+(d.naFicha?'Na ficha':'Sem referência na ficha')+(d.gravado?' · Inteiro teor gravado':d.texto?' · Texto extraído':' · Inteiro teor não verificado')));
        cvList.append(row);
      });
      var cvGo=el('button','btn line sm','Abrir Autos');cvGo.type='button';cvGo.onclick=function(){G.aba='Autos';render();};cvList.append(cvGo);coverage.append(cvList);
    }else coverage.append(el('p','muted','Acesso restrito.'));
    aut.append(coverage);
    /* Perfil editorial e etiquetas: anotações só em Sinalizações, questões no Perfil. */
    materia.append(tagsGroup);if(heroV53()){var annSection=el('details','hero-case-block hero-summary-section hero-case-annotations');annSection.open=heroTopo.caseOpen.conteudo!==false;annSection.addEventListener('toggle',function(){if(annSection.isConnected)heroTopo.caseOpen.conteudo=annSection.open;});annSection.append(nb);nb.append(add);var generalHead=el('h4','hero-ann-general-heading','Anotações gerais');ann.replaceChildren(generalHead,formAnotacao,others);ann.hidden=false;primary.replaceChildren(fixed);noteCard.replaceChildren(primary,ann);annSection.append(noteCard);secConteudo.replaceWith(annSection);secConteudo=annSection;contentGrid=fixed;}else sig.append(noteWrap);
    var highlight=el('div','hero-v53-highlights');
    [['@detalhamento','Detalhamento do caso','detalhamento'],['@fatica','Síntese Fática','fatica'],['@processual','Síntese Processual','processual']].forEach(function(x){
      var inp=contentGrid.querySelector('[data-fk="triagem.'+x[1]+'"],[data-pv-field="triagem.'+x[1]+'"]'),fieldNode=inp&&inp.closest('.gf,.pv-field,.pv-idrow');
      if(fieldNode){var lab=fieldNode.querySelector('.gl');(lab||fieldNode).append(pin(x[0]));}
      var value=S(V('triagem',x[1]));if(value&&destacado(x[0])){var b=el('button','hero-v53-highlight '+x[2],value);b.type='button';b.title='Editar '+x[1];b.onclick=function(){if(!resumo){heroTopo.perfil=true;}secConteudo.open=true;contentGrid.scrollIntoView({block:'nearest'});};highlight.append(b);}
    });
    if(heroV53()){id.querySelectorAll('.hero-case-preview.hero-case-detail').forEach(function(n){n.remove();});linhas.filter(destacado).forEach(function(l){var m=/^(\d{2}\/\d{2}\/\d{4}(?: \d{2}:\d{2})?)\s*·\s*(?:([^·]{2,40}?)\s*·\s*)?(.+)$/.exec(l),b=el('button','hero-v53-highlight geral',m?m[3]:l);b.type='button';b.title=m?[m[2],m[1]].filter(Boolean).join(' · '):'Anotação destacada';b.onclick=function(){secConteudo.open=true;secConteudo.scrollIntoView({block:'nearest'});};highlight.append(b);});}if(highlight.childNodes.length)id.insertBefore(highlight,qtags.parentNode===id?qtags:steps);
    if(qtags.childNodes.length){qtags.replaceChildren();qs.forEach(function(q,i){if(qfix.includes(q)){var b=el('button','hero-v53-question',String(i+1).padStart(2,'0')+' · '+q);b.type='button';b.onclick=function(){if(!resumo){heroTopo.perfil=true;}qd.open=true;qd.scrollIntoView({block:'nearest'});};qtags.append(b);}});}
    /* Mantém a seção imediatamente antes do assunto; tags reais ficam agrupadas. */
    if(secTag)as.prepend(secTag);
    if(l1){l1.append(status);openMon.remove();status.querySelectorAll('.hero-status-icon').forEach(function(b){var labels={urgencia:'Urgência',sigilo:'Sigilo',meta:'Meta',sensivel:'Caso sensível'};b.append(el('span','',labels[b.dataset.monFoco]||b.title));});}
    procTags.classList.add('hero-v53-classification');
    var complexity=campoModelo('triagem','COMPLEXIDADE'),complexValue=S(V('triagem','COMPLEXIDADE'));
    if(l1&&complexity&&complexValue){var cx=el('span','hero-v53-complexidade',complexValue);cx.dataset.nivel=complexValue;cx.title='Complexidade · '+complexValue;l1.append(cx);}
    /* Seletor de tipo abre o cartão de Encaminhamento da Triagem. */
    refTipo.onclick=function(){heroTopo.gerDockOpen=true;heroTopo.encDockOpen=true;G.aba='Processo';G.rot='ger';render();var t=caixa.querySelector('#hero-enc-dock>summary');if(t)t.focus({preventScroll:true});};
    /* Encaminhamento deixa de ser face; os campos continuam os mesmos da ficha. */
    var encTr=el('section','hero-v53-enc card hero-enc-integrated'),encHd=el('div','hero-v53-section-head'),encTitle=el('h4','pm-mer-h','Encaminhamento');
    encTr.id='hero-encaminhamento';encHd.append(encTitle,el('small','muted','Julgamento · destino · enquadramento'));encTr.append(encHd);
    function encGroup(n,t,content){var s=el('section','hero-enc-part hero-enc-part-'+n),h=el('div','hero-enc-part-head');h.append(el('h5','',t));s.append(h,content);encTr.append(s);return s;}
    encGroup('tipo','Tipo de julgamento',tipoSec);
    var sit=encFields.querySelector('.pm-sitj');if(sit)sit.remove();
    destTop.append(enquad);
    var triStatus=campoModelo('triagem','Situação da triagem');
    if(triStatus&&triStatus.chave!=='Destino - Situação')html(destTop,campo(triStatus));
    if(sit)destTop.append(sit);
    var destinoSec=encGroup('destino','Destino e situação',encFields);
    var notaKeys=['triagem.Seleção Prévia - Nota','triagem.Art. 932 - Nota de enquadramento','triagem.Destino - Outro Nota'];
    var notaNodes=notaKeys.map(function(k){var n=Array.from(encFields.querySelectorAll('[data-fk]')).find(function(e){return e.dataset.fk===k;});return n&&n.closest('.gf,.pv-field,.pv-idrow');}).filter(Boolean);
    var confirmar=encFields.querySelector('.hero-enc-confirm');if(confirmar)notaNodes.push(confirmar);
    var hipEl=Array.from(encFields.querySelectorAll('[data-fk]')).find(function(e){return e.dataset.fk==='triagem.Hipóteses Monocrática';});if(hipEl){var hipRow=hipEl.closest('.gf,.pv-field,.pv-idrow');if(hipRow)notaNodes.unshift(hipRow);}
    if(notaNodes.length){var notas=el('div','gr hero-enc-note-fields');Array.from(new Set(notaNodes)).forEach(function(n){notas.append(n);});encGroup('enquadramento','Detalhamento do enquadramento',notas);}
    prop.classList.add('hero-enc-proposal');encTr.append(prop);
    /* Acompanhamento é a cronologia real do mapa de próximos passos. */
    body.replaceChildren(tramite);ac.classList.remove('hero-enc-pane');ac.classList.add('hero-v53-acomp');sum.hidden=true;ac.open=true;
    steps.append(ac);
    var oldAbrir=abrirA,dockTabs=el('div','hero-v53-dock-tabs');
    [['','Etapas'],['acompanhamento','Acompanhamento'],['monitoramento','Monitoramento']].forEach(function(x){
      var b=el('button','',x[1]);b.type='button';b.dataset.heroDock=x[0];b.onclick=function(){abrirA(x[0]);};dockTabs.append(b);
    });
    stepsHead.replaceChildren(dockTabs,ind);
    /* Conserva os contadores de pendências, avisos e intercorrências. */
    var nextFoot=el('div','hero-v53-next');
    var first=map.passos.find(function(p){return p.tipo==='pendencia'?tramiteEstado(snLinhas('pd'),p)!=='resolvida':!p.feito;});
    if(first){var nextBtn=el('button','hero-v53-next-button');nextBtn.type='button';nextBtn.append(el('small','','Próximo passo'),el('b','',S(first.texto)));if(first.condicao)nextBtn.append(el('small','muted','Após: '+tramiteDescricao(first.condicao.vinculo)));nextBtn.onclick=function(){abrirA('acompanhamento');};nextFoot.append(nextBtn);}
    else {var nextBtn=el('button','lnk','+ Próximo passo');nextBtn.type='button';nextBtn.onclick=function(){abrirA('acompanhamento');addTr.click();};nextFoot.append(nextBtn);}
    steps.append(nextFoot);
    abrirA=function(k){
      oldAbrir(k==='acompanhamento'?'':k);
      heroTopo.abaAcomp=k||'';
      var isEt=!k,follow=k==='acompanhamento';
      if(flow)flow.hidden=!isEt;design.hidden=!isEt;nextFoot.hidden=!isEt;ac.hidden=!follow;
      dockTabs.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.heroDock===(k||'')));});
    };
    var selectedDock=heroTopo.abaAcomp||'';abrirA(selectedDock);if(faceNav)faceNav.remove();
    /* O cabeçalho é a navegação única; a área de resumo não aparece nas outras subabas. */
    if(faixa)id.prepend(faixa);
    /* A identificação e as etapas compõem a primeira superfície do Resumo.
       O perfil e a pauta ficam após a divisória, sem mudar os nós nem os handlers. */
    if(resumo&&painel.parentNode===id){
      var firstPanel=el('div','hero-first-panel');id.insertBefore(firstPanel,id.firstChild);while(firstPanel.nextSibling&&firstPanel.nextSibling!==painel)firstPanel.append(firstPanel.nextSibling);
      /* A seção superior é proprietária de todos os campos de caso: move os nós reais, inclusive campos destacados e históricos. */
      var complement=el('section','hero-summary-complement hero-summary-integrated'),ctitle=el('h4','pm-mer-h','Caso, conteúdo, questões e etiquetas');
      complement.append(ctitle);complement.setAttribute('aria-label','Caso, conteúdo, questões e etiquetas');
      function existing(c){var key=(c.secao||'')+'.'+c.chave;return Array.from(caseGrid.children).concat(Array.from(contentGrid.children)).find(function(n){var a=n.querySelector('.gl'),f=Array.from(n.querySelectorAll('[data-fk],[data-pv-field]')).some(function(x){return x.getAttribute('data-fk')===key||x.getAttribute('data-pv-field')===key;});return f||!!(a&&normalAssunto(a.textContent).replace(/\s*(?:autos|auto)$/,'')===normalAssunto(c.rotulo));});}
      var cg=grupoModelo('Caso, Conteúdo e Questões');
      (cg&&cg.campos||[]).forEach(function(c){
        if(c.legado||/^(Alegações|Questões destacadas|Questões jurídicas individualizadas|Etiquetas sugeridas|Detalhamento do caso|Síntese Processual|Síntese Fática)$/.test(c.chave)||existing(c))return;
        html(/Síntese|Detalhamento do caso/.test(c.chave)?contentGrid:caseGrid,campo(c));
      });
      [[secCaso,'Caso']].forEach(function(p){p[0].classList.add('hero-summary-section');var sh=p[0].querySelector('summary');if(sh){sh.replaceChildren(el('h4','',p[1]));}});
      qd.classList.add('hero-summary-section');var qtHead=qd.querySelector('summary h4');if(qtHead)qtHead.textContent='Questões';
      var qc=campoModelo('triagem','Questões jurídicas individualizadas');
      if(qc){var qn=existing(qc),qgrid=el('div','gr hero-summary-fields');if(qn)qgrid.append(qn);else html(qgrid,campo(qc));qd.append(qgrid);}
      tagsGroup.classList.add('hero-summary-section');
      var sugg=campoModelo('triagem','Etiquetas sugeridas');if(sugg&&!heroV53()){var eg=el('div','gr hero-summary-fields'),en=existing(sugg);if(en)eg.append(en);else if(!tagsGroup.querySelector('[data-fk="triagem.Etiquetas sugeridas"],[data-pv-field="triagem.Etiquetas sugeridas"]'))html(eg,campo(sugg));if(eg.childNodes.length)tagsGroup.append(eg);}
      complement.append(secCaso,secConteudo);
      Array.from(materia.children).forEach(function(n){if(!n.matches('h4')&&n!==qd&&n!==tagsGroup)complement.append(n);});
      complement.append(qd,tagsGroup);Array.from(complement.children).forEach(function(n){if(n.tagName==='DETAILS'){n.classList.add('hero-summary-section');var sh=n.querySelector(':scope > summary');if(sh&&!sh.classList.contains('hero-editorial-heading'))tituloResumo(n,S(sh.querySelector('h4')?sh.querySelector('h4').textContent:sh.textContent));}});
      /* Um único contrato de cabeçalho: título, contagem/ações existentes e chevron. */
      function tituloResumo(d,t){var sh=d.querySelector(':scope > summary');if(!sh)return;sh.classList.add('hero-editorial-heading');var h=sh.querySelector('h4');if(!h){h=el('h4','',t);Array.from(sh.childNodes).filter(function(n){return n.nodeType===3&&S(n.textContent)===t;}).forEach(function(n){n.remove();});sh.prepend(h);}h.classList.add('hero-editorial-heading-text');}
      tituloResumo(secCaso,'Caso');tituloResumo(secConteudo,'Anotações');tituloResumo(qd,'Questões');tituloResumo(tagsGroup,'Etiquetas');tituloResumo(perfil,'Perfil do processo');if(pautaPerfil.parentNode)tituloResumo(pautaPerfil,'Pauta e julgamento');
      ctitle.classList.add('hero-editorial-heading','hero-editorial-heading-main');
      /* O mesmo assunto CNJ aparece na autuação e no Caso: no Caso, mantém uma única linha de leitura. Não remove editores. */
      var assuntoLido=false;
      Array.from(caseGrid.querySelectorAll('.pc-dl>div,.gf')).forEach(function(n){var l=n.querySelector('dt,.gl');if(!l||normalAssunto(l.textContent)!=='assunto cnj')return;if(n.querySelector('input,textarea,select,button,[contenteditable=true]'))return;if(assuntoLido){n.hidden=true;n.classList.add('hero-duplicate-readonly');}else assuntoLido=true;});
      complement.classList.add('hero-case-standard');painel.classList.add('hero-summary-standard');perfil.classList.add('hero-summary-section');pautaPerfil.classList.add('hero-summary-section');coverage.classList.add('hero-summary-nested');tituloResumo(coverage,'Documentos extraídos');pautaBody.classList.add('hero-summary-fields');Array.from(caseGrid.children).forEach(function(n){if(n.matches('.gf,.pv-field,.pv-idrow,.pc-dl'))n.classList.add('hero-case-field');var key=n.querySelector('[data-fk],[data-pv-field]'),k=key&&(key.getAttribute('data-fk')||key.getAttribute('data-pv-field'));if(k)n.setAttribute('data-case-key',k);});id.insertBefore(complement,painel);
      mat.remove();

    }
    nav.replaceChildren();if(mainTabs)nav.append(mainTabs);
    pages.replaceChildren(id);id.hidden=!resumo;pages.hidden=!resumo;
    if(gbody){
      if(G.aba==='Processo'&&G.rot==='ger'){
        /* Gerador em subaba própria; Encaminhamento e Indexação preservam os editores canônicos. */
        var gerDock=el('section','hero-ger-dock hero-ger-page'),gs=el('header','hero-ger-page-head'),gt=el('span','hero-ger-dock-title','Gerador'),gm=el('small','hero-ger-dock-meta');
        gerDock.id='hero-ger-dock';gerDock.setAttribute('aria-label','Gerador');
        gm.textContent=S(destinoAtual)||'Destino a definir';gs.append(gt,gm);gerDock.append(gs);
        var gerBody=el('div','hero-ger-dock-body'),gerHead=el('header','hero-ger-dock-header'),dock=el('details','hero-enc-dock'),ds=el('summary'),dt=el('span','hero-enc-dock-title','Encaminhamento'),dm=el('small','hero-enc-dock-meta'),dc=el('span','hero-conf-chevron');
        dock.id='hero-enc-dock';dc.setAttribute('aria-hidden','true');
        dm.textContent=[S(V('triagem','Tipo de Julgamento')),S(destinoAtual)||'A definir'].filter(Boolean).join(' · ');
        ds.append(dt,dm,dc);dock.append(ds);
        var av=el('button','lnk hero-v53-autos-link','Conferir documentos em Autos');av.type='button';av.onclick=function(){G.aba='Autos';render();};encHd.append(av);
        var inner=el('div','hero-enc-dock-body');inner.append(encTr);dock.append(inner);dock.open=!!heroTopo.encDockOpen;
        dock.addEventListener('toggle',function(){if(dock.isConnected)heroTopo.encDockOpen=dock.open;});
        var gerHost=el('div','hero-ger-dock-content');gerHost.id='ger-app';gerHead.append(dock);
        /* Indexação compartilhada: reutiliza o editor da Produção ou monta o mesmo formulário na Triagem. */
        var idx=gbody.querySelector('#hero-prod-index');
        if(!idx){var idxHost=el('div');html(idxHost,producaoIndex());idx=idxHost.querySelector('#hero-prod-index');}
        if(idx){idx.classList.remove('card','gg');idx.classList.add('hero-enc-dock');var ih=idx.querySelector('summary'),it=ih&&ih.querySelector('h4'),im=ih&&ih.querySelector('.gn');if(ih&&it&&im){it.className='hero-enc-dock-title';im.className='hero-enc-dock-meta';var ic=el('span','hero-conf-chevron');ic.setAttribute('aria-hidden','true');ih.append(ic);}idx.open=!!heroTopo.gerIndexOpen;idx.addEventListener('toggle',function(){if(idx.isConnected)heroTopo.gerIndexOpen=idx.open;});gerHead.append(idx);}
        gerHead.setAttribute('aria-label','Configuração e dados do gerador');gerBody.append(gerHead,gerHost);gerDock.append(gerBody);
        gbody.classList.add('hero-generator-route');gbody.append(gerDock);
      }
      if(G.aba==='Processo'&&G.rot==='tri')gbody.classList.add('hero-tri-with-dock');
      if(G.aba==='Processo'&&G.rot==='pro')gbody.classList.add('hero-production-route','hero-tri-with-dock');
      gbody.hidden=resumo;
    }
    if(!resumo&&gbody&&top.parentNode)top.after(gbody);
    if(window.MutaPauta&&window.MutaPauta.receberEditor)window.MutaPauta.receberEditor(G.cnj,solBody);
    show=function(i){if(i===1){G.aba='Processo';G.rot='tri';render();}else if(i>=2){heroTopo.perfil=true;}else if(!resumo){G.aba='Processo';G.rot='res';render();}};
    heroTopo.pagina=0;
    return;
  }
  abrirA(heroTopo.abaAcomp==='monitoramento'?'monitoramento':heroTopo.abaAcomp==='sinalizacoes'||(!heroTopo.abaAcomp&&heroTopo.sinalizacoes)?'sinalizacoes':'');show(heroTopo.pagina);
}

var HERO_ROUTE_FILTER={cnj:'',tri:{q:'',status:'all'},pro:{q:'',status:'all'}};
function heroRoteiroFiltros(){
 if(G.aba!=='Processo'||['tri','pro'].indexOf(G.rot)<0)return;
 var root=caixa.querySelector(G.rot==='tri'?'.hero-tri-with-dock:not(.hero-production-route)':'.hero-production-route');if(!root)return;
 if(HERO_ROUTE_FILTER.cnj!==G.cnj)HERO_ROUTE_FILTER={cnj:G.cnj,tri:{q:'',status:'all'},pro:{q:'',status:'all'}};
 var st=HERO_ROUTE_FILTER[G.rot],overview=root.querySelector('.hero-route-overview');if(overview){if(heroV53()){var tools=overview.querySelector('.hero-route-tools'),route=root.querySelector('ol.rt');if(tools&&route){tools.classList.add('hero-route-footer-tools');tools.setAttribute('aria-label','Comandos do roteiro');route.after(tools);overview.remove();st.status='all';}}else{overview.open=st.overview!==false;overview.addEventListener('toggle',function(){if(overview.isConnected)st.overview=overview.open;});}}
 var input=root.querySelector('[data-route-search]'),steps=Array.from(root.querySelectorAll('.hero-route-step')),buttons=Array.from(root.querySelectorAll('[data-route-filter]')),next=root.querySelector('[data-route-next]');if(!input)return;
 function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
 st.phases=st.phases||{};var phases=Array.from(root.querySelectorAll('ol.rt>li.rt-f'));phases.forEach(function(h,i){var b=document.createElement('button');b.type='button';b.className='rt-phase-toggle';b.setAttribute('aria-label','Expandir ou recolher '+h.textContent);b.onclick=function(){st.phases[i]=!st.phases[i];apply();};h.append(b);});function apply(){var q=norm(st.q);root.querySelectorAll('ol.rt>li.rt-p:not(.hero-route-step)').forEach(function(x){x.hidden=false;});steps.forEach(function(s){s.hidden=!(st.status==='all'||s.dataset.routeStatus===st.status)||!!q&&!norm(s.dataset.routeText).includes(q);});buttons.forEach(function(b){b.setAttribute('aria-pressed',String(st.status===b.dataset.routeFilter));});phases.forEach(function(h,i){var x=h.nextElementSibling,found=false,any=false,closed=!!st.phases[i]&&!q&&st.status==='all';while(x&&!x.classList.contains('rt-f')){if(x.classList.contains('hero-route-step')){any=true;if(!x.hidden)found=true;}if(closed)x.hidden=true;x=x.nextElementSibling;}h.hidden=any&&!found;var b=h.querySelector('.rt-phase-toggle');b.setAttribute('aria-expanded',String(!closed));b.textContent=closed?'⌄':'⌃';});if(next)next.disabled=!steps.some(function(s){return s.dataset.routeStatus!=='ok';});}
 input.value=st.q;input.oninput=function(){st.q=input.value;apply();};buttons.forEach(function(b){b.onclick=function(){var k=b.dataset.routeFilter;st.status=st.status===k?'all':k;if(k==='all'){st.q='';input.value='';}apply();};});
 if(next)next.onclick=function(){var pending=steps.filter(function(s){return s.dataset.routeStatus!=='ok';}),active=pending.findIndex(function(s){return s.classList.contains('ab')||s.querySelector('details[open]');});if(!pending.length)return;var target=pending[(active+1)%pending.length],b=target.querySelector('.rt-h,summary');st.status='all';st.q='';st.phases={};input.value='';apply();if(b&&!target.classList.contains('ab')&&!target.querySelector('details[open]')){var k=target.querySelector('[data-rt],[data-cc]');var id=target.querySelector('[data-cc]');b.click();var live=id?caixa.querySelector('[data-cc="'+id.getAttribute('data-cc')+'"]'):k?Array.from(caixa.querySelectorAll('[data-rt]')).find(function(n){return n.dataset.rt===k.dataset.rt;}):null;if(live)live.scrollIntoView({block:'nearest'});}else target.scrollIntoView({block:'nearest'});};apply();
}
function render() { render0(); heroOrganizarProntuario(); heroDadosFiltros(); heroRoteiroFiltros(); if (window.MutaGerador && window.MutaGerador.pintar) window.MutaGerador.pintar();estadoFila(filaAtual()); }
function render0() {
  if (!caixa) return;
  faixaUsuario(ses.estado());
  /* a faixa do PJe mora no cartão do processo; antes de redesenhar, volta ao lugar de origem para não se perder */
  var pb = $('pje-bar'); if (pb && caixa.contains(pb) && PJE_CASA && PJE_CASA.parentNode) PJE_CASA.parentNode.insertBefore(pb, PJE_CASA);
  var s = ses.estado();
  if (s.estado === 'verificando') { caixa.innerHTML = '<div class="empty">Verificando a sessão do Ex Officio…</div>'; return; }
  if (s.estado !== 'on') { ses.formulario(caixa, 'Entrar para ver o prontuário do processo'); return; }
  if (!G.cnj) { caixa.innerHTML = '<div class="empty"><h3>Nenhum processo aberto</h3>Abra os autos ou a tarefa no PJe.</div>'; return; }
  var st0 = '<p class="status" id="g-st" role="status" aria-live="polite"></p>';
  if (G.carregando) { caixa.innerHTML = '<div class="pc"><div class="pc-n"><span class="mono pc-cnj">' + esc(G.cnj) + '</span></div></div><div class="empty">Lendo o prontuário do processo…</div>' + st0; stEl = $('g-st'); return; }
  if (G.erro) { caixa.innerHTML = '<div class="pc"><div class="pc-n"><span class="mono pc-cnj">' + esc(G.cnj) + '</span><span class="sp"></span><button type="button" class="lnk" data-g="atualizar">Atualizar</button></div></div><div class="err-box">Não foi possível ler o prontuário: ' + esc(G.erro) + '</div>' + st0; stEl = $('g-st'); return; }
  if (!G.F) { caixa.innerHTML = st0; stEl = $('g-st'); return; }
  if (G.aba === 'Triagem' || G.aba === 'Roteiro') { G.aba = 'Processo'; G.rot = 'tri'; }
  if (G.aba === 'Produção') { G.aba = 'Processo'; G.rot = 'pro'; }
  if (G.aba === 'Gerador') { G.aba = 'Processo'; if(heroV53())G.rot='ger';else if (window.MutaAbas) setTimeout(function () { window.MutaAbas.ir('ger'); }, 0); }
  if (MODOS.indexOf(G.aba) < 0) G.aba = 'Processo';
  if(heroV53()&&!G.rot)G.rot='res';
  var grupoHero='pront';
  if(heroV53()&&window.MutaAbas&&window.MutaAbas.sincronizarProntuario)window.MutaAbas.sincronizarProntuario(grupoHero);
  var nAl = window.MutaAutos && window.MutaAutos.estado().itens ? window.MutaAutos.alertas().filter(function (a) { return a.nivel === 'al'; }).length : 0;
  var tabs = '<div class="seg gtabs pmodos hero-main-tabs" role="tablist" aria-label="Parte do prontuário">' +
    '<button type="button" role="tab" data-aba="Autos" aria-selected="'+(G.aba==='Autos')+'"><span>Autos'+(nAl?' <i class="gnum">'+nAl+'</i>':'')+'</span><small>'+esc(contaModo('Autos'))+'</small></button>'+
    [['tri','Triagem'],['pro','Produção'],['sol','Solicitações']].map(function(x){var on=G.aba==='Processo'&&(G.rot||'tri')===x[0];return '<button type="button" role="tab" data-rot="'+x[0]+'" data-pv-tab="'+x[0]+'" aria-selected="'+on+'"><span>'+x[1]+'</span></button>';}).join('')+'</div>';
  if(heroV53())tabs='<div class="seg gtabs pmodos hero-main-tabs hero-v53-tabs" role="tablist" aria-label="Parte do prontuário">'+([['res','Resumo'],['autos','Autos'],['tri','Triagem'],['pro','Produção'],['ger','Gerador']]).map(function(x){var on=x[0]==='autos'?G.aba==='Autos':G.aba==='Processo'&&G.rot===x[0];return '<button type="button" role="tab" '+(x[0]==='autos'?'data-aba="Autos"':'data-rot="'+x[0]+'"')+' aria-selected="'+on+'">'+(x[0]==='pro'?'Produção':x[1])+(x[0]==='autos'&&nAl?' <i class="gnum">'+nAl+'</i>':'')+'</button>';}).join('')+'</div>';
  var snc = snCard(), cab = cabeca(s); CAB_HTML = cab;
  /* 0.69: aviso de sigilo no alto do cartão (processo sigiloso ou documento sigiloso nos autos) */
  if (window.MutaSigilo) { window.MutaSigilo.consultar(G.cnj); var sgh = window.MutaSigilo.html(); if (sgh) cab = cab.replace('<section class="pc pm">', '<section class="pc pm">' + sgh); }
  var corpo = G.aba === 'Autos' ? corpoAutos() : G.aba === 'Produção' ? corpoProducao() : corpoProcesso();
  var ab = document.activeElement && document.activeElement.dataset ? (document.activeElement.dataset.fk || (document.activeElement.dataset.esp ? 'esp:' + document.activeElement.dataset.esp : '') || (document.activeElement.dataset.q != null ? 'q:' + document.activeElement.dataset.q : '')) : '';
  var y = window.scrollY, pp = $('panel-pront'), yp = pp ? pp.scrollTop : 0;
  precEmentario(casoPrec());
  caixa.innerHTML = cab.replace(/<\/section>$/, snc + '</section>') + tabs + st0 + '<div class="gbody">' + corpo + '</div>';
  // Universal: notas depois das etapas; no layout original, depois das especificidades.
  var nt=caixa.querySelector('#g-nt'),esp=caixa.querySelector('.pv-flowbox')||caixa.querySelector('.pm-esp');
  if(nt&&esp){
    var sx=Array.from(nt.querySelectorAll('.nt-cs,.nt-vz'));esp.after(nt);
    if(sx.length)nt.after(...sx);
    nt.classList.add('proc-notas-inline');
    if(!document.body.classList.contains('pv-universal-body')){
      var tx=nt.querySelector('#nt-tx'),bot=nt.querySelector('[data-nt-add]');
      if(tx&&bot){tx.hidden=true;bot.textContent='+ Nota';bot.removeAttribute('data-nt-add');bot.setAttribute('aria-expanded','false');
        var save=document.createElement('button');save.type='button';save.className='btn solid sm';save.setAttribute('data-nt-add','');save.textContent='Incluir';save.hidden=true;tx.after(save);
        bot.addEventListener('click',function(e){e.stopPropagation();tx.hidden=!tx.hidden;bot.textContent=tx.hidden?'+ Nota':'Cancelar';bot.setAttribute('aria-expanded',String(!tx.hidden));save.hidden=tx.hidden;if(!tx.hidden)tx.focus();else tx.value='';});
      }
    }
  }
  var snTitulo=caixa.querySelector('.pm-sn .pm-aut-t');
  if(snTitulo&&nt&&esp){var textNode=snTitulo.firstChild;if(textNode&&textNode.nodeType===3)textNode.nodeValue=textNode.nodeValue.replace(/síntese · notas · |acompanhamento · notas · /i,'');}
  stEl = $('g-st');
  if (ab) {
    var sel = /^esp:/.test(ab) ? '[data-esp="' + ab.slice(4) + '"]' : /^q:/.test(ab) ? '[data-q="' + ab.slice(2) + '"]' : '[data-fk="' + ab.replace(/"/g, '\\"') + '"]';
    var f = caixa.querySelector(sel); if (f) { f.focus({ preventScroll: true }); try { var n = f.value.length; f.setSelectionRange(n, n); } catch (e) {} }
  }
  window.scrollTo(0, y); if (pp) pp.scrollTop = yp;
}
/* avisos de gravação: na faixa acima das abas */
function st(t, c) {
  var el = $('tu-st');
  if (!el) { el = stEl || $('g-st'); if (el) { el.textContent = t || ''; el.className = 'status' + (c ? ' ' + c : ''); } return; }
  /* ícone na faixa do topo: ✓ gravado, ⋯ a gravar, ! não gravou; a mensagem fica na dica */
  el.hidden = !t; el.title = t || ''; el.setAttribute('aria-label', t || '');
  el.className = 'tu-st ' + (c === 'err' ? 'err' : c === 'ok' || /^gravad|^salv/i.test(t || '') ? 'ok' : 'pend');
  /* gravação que falhou não fica só no ícone: aviso visível no prontuário, com "Tentar de novo", até gravar */
  var fx = $('g-falha');
  if (c === 'err') {
    if (!fx && caixa) { fx = document.createElement('div'); fx.id = 'g-falha'; fx.className = 'err-box g-falha'; fx.setAttribute('role', 'alert'); }
    if (fx) { fx.innerHTML = '<span>' + esc(t) + '</span><button type="button" class="btn sm" data-g="regravar">Tentar de novo</button>'; if (caixa && fx.parentNode !== caixa) caixa.insertBefore(fx, caixa.firstChild); }
  } else if (fx && (c === 'ok' || /^gravad|^nada mudou/i.test(t || ''))) fx.remove();
}

/* ---------- gravação ---------- */
/* Fila por conta e processo: o rascunho só sai após ACK explícito. */
function chaveFila(u,c){return encodeURIComponent(String(u||'')) + ':' + dg(c);}
function obterFila(u,c){var k=chaveFila(u,c);return FILA_FICHA[k]||(FILA_FICHA[k]={key:k,usuario:u,cnj:c,campos:Object.create(null),base:Object.create(null),bloqueados:Object.create(null),rev:0,op:null,t:null,voo:null,erro:'',recuperado:false,local:false,geracao:0,versoes:Object.create(null)});}
function filaAtual(){return FILA_FICHA[G.saveKey]||null;}
function mesmaConta(f){var s=ses.estado();return s.estado==='on'&&s.usuario===f.usuario;}
function igualFila(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function valorOperacional(op,k){var i=k.indexOf('.'),o=(op||{})[k.slice(0,i)]||{};return o[k.slice(i+1)]==null?'':o[k.slice(i+1)];}
function condicaoLocal(f){if(window.MUTA_WEB||location.protocol!=='chrome-extension:')return 'restrito';var sg=window.MutaSigilo;return sg&&sg.situacaoRascunho?sg.situacaoRascunho(f.cnj):'aguardando';}
function persistirFila(f){var k=RASCUNHO_FICHA+f.key,cs=condicaoLocal(f);try{
 if(cs==='restrito'){localStorage.removeItem(k);f.local=false;return;}
 if(cs==='permitido')f.local=true;
 if(!f.local||!f.recuperado)return;
 if(!Object.keys(f.campos).length){localStorage.removeItem(k);return;}
 /* não duplicar classificação documental, peças vinculadas ou inteiro teor. */
 var campos={},base={},bloqueados={};Object.keys(f.campos).forEach(function(id){if(/Classificação documental|Peças vinculadas|Inteiro teor/i.test(id))return;campos[id]=f.campos[id];base[id]=f.base[id];if(f.bloqueados[id])bloqueados[id]=f.bloqueados[id];});
 if(Object.keys(campos).length)localStorage.setItem(k,JSON.stringify({campos:campos,base:base,bloqueados:bloqueados}));else localStorage.removeItem(k);
 }catch(e){f.local=false;f.avisoLocal='Sem recuperação em disco: '+e.message;}}
function recuperarFila(f){if(!f||f.recuperado||f!==filaAtual()||!G.F||!mesmaConta(f))return;var cs=condicaoLocal(f);if(cs==='aguardando')return;f.recuperado=true;if(cs!=='permitido'){persistirFila(f);return;}f.local=true;
 try{var q=JSON.parse(localStorage.getItem(RASCUNHO_FICHA+f.key)||'null');if(q&&q.campos)Object.keys(q.campos).forEach(function(k){if(k in f.campos)return;var v=valorOperacional(G.op,k);if(igualFila(v,q.campos[k]))return;f.campos[k]=q.campos[k];f.base[k]=(q.base||{})[k];f.versoes[k]=++f.geracao;if(!igualFila(v,f.base[k]))f.bloqueados[k]='conflito';else if((q.bloqueados||{})[k])f.bloqueados[k]=q.bloqueados[k];});}catch(e){f.avisoLocal='Não foi possível recuperar o rascunho local.';}
 persistirFila(f);if(Object.keys(f.campos).length){render();estadoFila(f);programarFila(f,900);}}
function filaSemDisco(f){return Object.keys(f.campos).some(function(k){return !f.local||!f.recuperado||/Classificação documental|Peças vinculadas|Inteiro teor/i.test(k);});}
function estadoFila(f){if(!f||f!==filaAtual())return;var n=Object.keys(f.campos).length,b=Object.keys(f.bloqueados).filter(function(k){return k in f.campos;});if(f.erro||b.length){st((f.erro||('Alterações requerem conferência: '+b.join(', ')))+(f.avisoLocal?' · '+f.avisoLocal:''),'err');}else if(n)st(f.voo?'Gravando '+n+' campo(s)…':n+' campo(s) a gravar'+(filaSemDisco(f)?' · há dados somente nesta janela':' · rascunho local')+'…');}
function programarFila(f,ms){if(!f)return;clearTimeout(f.t);if(!mesmaConta(f)||!Object.keys(f.campos).some(function(k){return !f.bloqueados[k];}))return;f.t=setTimeout(function(){enviarFila(f).catch(function(){});},ms);}
function agendar(ms){var f=filaAtual();if(!f)return;persistirFila(f);programarFila(f,ms);estadoFila(f);}
function enviarFila(f){if(!f||!mesmaConta(f)||window.MUTA_WEB&&window.MUTA_WEB.leitura)return Promise.resolve();clearTimeout(f.t);if(f.voo)return f.voo;var P={},vs={};Object.keys(f.campos).forEach(function(k){if(!f.bloqueados[k]){P[k]=f.campos[k];vs[k]=f.versoes[k];}});if(!Object.keys(P).length)return Promise.resolve();
 f.erro='';f.voo=Promise.resolve().then(function(){if(!mesmaConta(f))throw Error('Sessão alterada antes do envio.');return ses.api('/api/pauta?ficha=1',{method:'POST',body:JSON.stringify({cnj:f.cnj,campos:P})});}).then(function(j){
  if(!j||j.ok!==true)throw Error('Resposta sem confirmação de gravação.');
  var recus=Array.isArray(j.recusados)?j.recusados:[];f.rev++;f.op=j.operacional||f.op;
  Object.keys(P).forEach(function(k){if(f.versoes[k]!==vs[k]){if(!recus.includes(k))f.base[k]=valorOperacional(f.op,k);return;}if(recus.includes(k)){f.bloqueados[k]='recusado';return;}delete f.campos[k];delete f.base[k];delete f.versoes[k];delete f.bloqueados[k];});
  persistirFila(f);if(mesmaConta(f)&&window.MutaAlertas)window.MutaAlertas.esquecer(f.cnj);
  if(f===filaAtual()&&mesmaConta(f)){G.op=f.op||G.op;render();if(Object.keys(f.campos).length)estadoFila(f);else st('Gravado na ficha'+((j.cartoes||[]).length?' e no cartão da pauta':'')+' às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'.','ok');}
  if(mesmaConta(f)&&window.MUTA_WEB&&window.parent!==window)window.parent.postMessage({tipo:'cmt:hero-gravado',cnj:f.cnj},location.origin);return j;
 }).catch(function(e){var recus=e.dados&&e.dados.recusados;if(Array.isArray(recus))recus.forEach(function(k){if(f.versoes[k]===vs[k])f.bloqueados[k]='recusado';});else if(e.status===400||e.status===403||e.status===404)Object.keys(P).forEach(function(k){if(f.versoes[k]===vs[k])f.bloqueados[k]='validacao';});f.erro='Não gravou: '+e.message+(e.status===401?' Entre de novo.':'');persistirFila(f);estadoFila(f);throw e;}).finally(function(){f.voo=null;if(Object.keys(f.campos).length){if(f===filaAtual())estadoFila(f);programarFila(f,f.erro?30000:600);}});
 estadoFila(f);return f.voo;
}
function gravarJa(keepalive){var f=filaAtual();if(!f)return Promise.resolve();persistirFila(f);/* a saída nunca é tratada como confirmação do servidor. */return enviarFila(f);}
function tentarFicha(){var f=filaAtual();if(!f)return;if(Object.keys(f.bloqueados).length&&!window.confirm('Há campos recusados ou alterados por outra interface. Deseja reenviar os valores pendentes?'))return;f.bloqueados=Object.create(null);f.erro='';persistirFila(f);return enviarFila(f);}
function marcar(id,v){if(window.MUTA_WEB&&window.MUTA_WEB.leitura)return;var f=filaAtual();if(!f||!mesmaConta(f))return;if(!(id in f.campos))f.base[id]=valorOperacional(G.op,id);f.campos[id]=v;f.versoes[id]=++f.geracao;delete f.bloqueados[id];f.erro='';G.pend=f.campos;G.pendCnj=f.cnj;persistirFila(f);}
function retomarFilas(){Object.keys(FILA_FICHA).forEach(function(k){var f=FILA_FICHA[k];if(mesmaConta(f))programarFila(f,800);});}
function copiar(t, el) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { if (el) { var o = el.textContent; el.textContent = 'Copiado'; setTimeout(function () { el.textContent = o; }, 1100); } }, function () {}); }
function questoesDe(sem) {
  var L = Array.prototype.map.call(caixa.querySelectorAll('[data-q]'), function (i) { return S(i.value); });
  if (sem != null) L.splice(sem, 1);
  return L.flatMap(questoesLista).join('\n');
}

caixa.addEventListener('change', function (e) {
  var t = e.target;
  if (t.dataset && t.dataset.auSug != null) { if (window.MutaAutos) window.MutaAutos.marcarSugestao(Number(t.dataset.auSug), t.checked); return; }
  if (t.dataset && t.dataset.esp) { if (window.MutaAutos) window.MutaAutos.especificarJa(t.dataset.esp); return; }
  if (t.dataset && t.dataset.auG) { if (window.MutaAutos) window.MutaAutos.selecionar(t.dataset.auG, t.checked); return; }
  if (t.dataset && t.dataset.auAuto != null) { if (window.MutaAutos) window.MutaAutos.autoLigar(t.checked); return; }
  if (t.dataset && t.dataset.snOk) { var po = t.dataset.snOk.split(':'), Lo = snLinhas(po[0]), io = Number(po[1]); if (Lo[io] != null) Lo[io] = t.checked ? '✓ ' + Lo[io].replace(/^✓\s*/, '') : Lo[io].replace(/^✓\s*/, ''); snGravar(po[0], Lo); return; }
  if (t.id === 'sn-tp') { G.snTp = t.value; return; }
  if (t.id === 'pm-pron') { var xp = t.value === '' ? null : PRON[Number(t.value)]; marcar('producao.Mono - Tipo de ato', xp ? xp[2] : ''); G.dest = null; agendar(400); render(); return; }
  if (t.dataset && t.dataset.rtc) { if (window.MutaRoteiro) window.MutaRoteiro.conferir(t.dataset.rtc, t.checked, gRot()); render(); return; }
  if (!t.dataset || !t.dataset.fk) return;
  marcar(t.dataset.fk, t.value); if(t.dataset.fk==='producao.Destino')G.dest=null; var l = t.closest('label'); if (l) l.classList.add('mud');
  agendar(900);
  if (t.closest('.hero-acomp') || /^(triagem\.(Urgência|Padrão - Espécie)|producao\.Destino|controles\.Sensível - (In|Ex)cluído)$/.test(t.dataset.fk) || G.aba === 'Processo') render();
});
caixa.addEventListener('toggle', function (e) { var c = e.target.classList; if (!c) return; if (c.contains('pm-sn')) { SN_AB = e.target.open; return; } if (c.contains('sq-card')) { SQ_AB = e.target.open; return; } if (c.contains('pm-mer')) { if (G.merAb !== e.target.open) { G.merAb = e.target.open; render(); } return; } if (c.contains('pm-aut')) { if (G.autAb !== e.target.open) { G.autAb = e.target.open; render(); } return; } if (c.contains('au-it') && window.MutaAutos) { window.MutaAutos.abrirTexto(e.target.dataset.auIt, e.target.open); return; } if (c.contains('au-auto-d') && window.MutaAutos) window.MutaAutos.estado().autoAb = e.target.open; if (c.contains('pc-s')) { G.pecAb = G.pecAb || {}; G.pecAb[e.target.dataset.grupo] = e.target.open; } }, true);
caixa.addEventListener('keydown', function (e) {
  if (e.target.id === 'sn-tx' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); snIncluir(); }
  else if (e.target.id === 'pm-ad-tx' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); adAcao('ok'); }
  else if (e.target.id === 'pm-des' && (e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); if (e.key === 'Enter') { marcar('producao.' + e.target.dataset.des, S(e.target.value)); agendar(400); } G.desEd = null; render(); }
  else if (e.target.id === 'pm-ad-tx' && e.key === 'Escape') { adAcao('x'); }
  else if (e.target.id === 'nt-tx' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); notaIncluir(); }
});
caixa.addEventListener('input', function (e) {
  var t = e.target;
  if (t.dataset && t.dataset.esp) { if (window.MutaAutos) window.MutaAutos.especificar(t.dataset.esp, t.value); return; }
  if (t.dataset && t.dataset.q != null) { G.qVazia = false; marcar('triagem.Alegações', questoesDe()); agendar(1800); return; }
  if (!t.dataset || !t.dataset.fk || t.tagName === 'SELECT') return;
  marcar(t.dataset.fk, t.value); var l = t.closest('label'); if (l) l.classList.add('mud');
  agendar(1800);
});
caixa.addEventListener('click', function (e) {
  var rb = e.target.closest && e.target.closest('[data-rot]'); if (rb) { G.aba = 'Processo'; G.rot = rb.getAttribute('data-rot'); render(); return; }
  var cb = e.target.closest && e.target.closest('[data-cs]'); if (cb) { var k = cb.getAttribute('data-cs'); CS_AB[k] = true; if (k === 'q') G.qVazia = true; render(); setTimeout(function () { var el = caixa.querySelector(k === 'q' ? '[data-q]' : '[data-fk="triagem.' + (k === 'sp' ? 'Síntese Processual' : 'Síntese Fática') + '"]'); if (el) el.focus(); }, 0); return; }
  if (e.target.closest && e.target.closest('[data-cl-tipo]')) { G.aba = 'Processo'; G.rot = 'tri'; heroTopo.pagina=1;render();var r=caixa.querySelector('.hero-tipo-ref');if(r)r.click();else{var d=caixa.querySelector('.rt-tsel');if(d){d.open=true;d.scrollIntoView({block:'center'});}}return; }
  var b = e.target.closest('button,a'); if (!b) return;
  if (b.tagName === 'BUTTON' && b.closest('summary')) e.preventDefault(); /* botão no título de um campo expansível não abre nem fecha o campo */
  if (b.dataset.au != null) { if (window.MutaAutos) window.MutaAutos.clique(b); return; }
  if (b.dataset.et != null) { marcarEtapa(Number(b.dataset.et)); return; }
  if (b.dataset.ct) { var pc = b.dataset.ct.split(':'); ctlMarcar(pc[0], pc[1] === '1'); return; }
  if (b.dataset.ad) { adAcao(b.dataset.ad); return; }
  if (b.dataset.tj) { marcar('triagem.Tipo de Julgamento', b.dataset.tj); agendar(400); render(); return; }
  if (b.dataset.desEd) { G.desEd = b.dataset.desEd; render(); var di = $('pm-des'); if (di) { di.focus(); di.select(); } return; }
  if (b.dataset.pron != null) { var x = PRON[Number(b.dataset.pron)]; if (x) { marcar('producao.Destino', x[1]); marcar('producao.Mono - Tipo de ato', x[2]); G.dest = null; agendar(400); render(); } return; }
  if (b.dataset.snX) { var px = b.dataset.snX.split(':'), Lx = snLinhas(px[0]); Lx.splice(Number(px[1]), 1); snGravar(px[0], Lx); return; }
  if (b.hasAttribute('data-nt-add')) { notaIncluir(); return; }
  if (b.dataset.autog === 'desfazer') { autoGabDesfazer(); return; }
  if (b.dataset.sitman) { sitManualSet(b.dataset.sitman === '1'); if (b.dataset.sitman === '0') { if(window.MUTA_WEB){marcar('producao.Destino - Situação',situacaoCalc().v);agendar(400);}else situacaoSync(); } render(); return; }
  if (b.hasAttribute('data-sn-add')) { G.snAb = !G.snAb; render(); var sx = $('sn-tx'); if (sx) sx.focus(); return; }
  if (b.hasAttribute('data-sn-inc')) { snIncluir(); return; }
  if (b.dataset.ntX != null) { var Ln = notasL(); Ln.splice(Number(b.dataset.ntX), 1); marcar('origem.Observações', Ln.join('\n')); agendar(500); render(); return; }
  if (b.dataset.ch) { var cv = S(V.apply(null, [b.dataset.ch.slice(0, b.dataset.ch.indexOf('.')), b.dataset.ch.slice(b.dataset.ch.indexOf('.') + 1)])); marcar(b.dataset.ch, cv === b.dataset.v ? '' : b.dataset.v); agendar(500); render(); return; }
  if (b.dataset.rt != null) { if (window.MutaRoteiro && window.MutaRoteiro.clique(b, gRot())) render(); return; }
  if (b.dataset.copia) { copiar(b.dataset.copia, b); return; }
  if (b.dataset.pecApl != null) { pecaPreencher(b.dataset.pecApl); return; }
  if (b.dataset.pecLer || b.dataset.pecOcr) { var pid = b.dataset.pecLer || b.dataset.pecOcr, AUx = window.MutaAutos; if (!AUx) return;
    AUx.extrair(pid, b.dataset.pecOcr ? 'ocr' : '').then(function (dd) { if (dd && dd.estado === 'ok') pecaPreencher(pid); else render(); }); render(); return; }
  if (b.dataset.aba) { G.aba = b.dataset.aba; render(); var pp = $('panel-pront'); if (pp) pp.scrollTop = 0; return; }
  if (b.dataset.ir) { G.aba = 'Processo'; render(); var alvo = $(b.dataset.ir); if (alvo) alvo.scrollIntoView({ block: 'start' }); return; }
  if (b.hasAttribute('data-qadd')) { G.qVazia = true; render(); var qs = caixa.querySelectorAll('[data-q]'); if (qs.length) qs[qs.length - 1].focus(); return; }
  if (b.dataset.qdel != null) { G.qVazia = false; marcar('triagem.Alegações', questoesDe(Number(b.dataset.qdel))); agendar(600); render(); return; }
  if (b.dataset.add) {
    var L = S(V('triagem', 'Etiquetas sugeridas')).split(/\s*[;,|]\s*/).filter(Boolean);
    if (!L.some(function (x) { return N(x) === N(b.dataset.add); })) L.push(b.dataset.add);
    marcar('triagem.Etiquetas sugeridas', L.join('; ')); agendar(400); render(); return;
  }
  if (b.dataset.etqCopia != null) { copiar(S(V('triagem', 'Etiquetas sugeridas')), b); return; }
  if (b.dataset.t === 'cmp') { if (window.MutaComparar && window.MutaComparar.triagem) window.MutaComparar.triagem(); return; }
  if (b.hasAttribute('data-sair')) { gravarJa().catch(function () {}).then(function () { ses.sair(); }); return; }
  if (b.dataset.dest != null) { var v = b.dataset.dest; G.dest = v === 'Monocrática' ? 'monocratica' : 'sessao'; if (v !== destGrav()) { marcar('producao.Destino', v); agendar(300); } render(); return; }
  if (b.dataset.inc) { var g = b.dataset.inc, x = INC[g][1]; G.mostra[g] = true; if (x) { marcar(x[0], x[1]); agendar(300); } render(); return; }
  if (b.dataset.g === 'atualizar') { gravarJa().catch(function () {}).then(function () { carregar(true); }); return; }
  if (b.dataset.g === 'regravar') { Promise.resolve(tentarFicha()).catch(function () {}); return; }
  if (b.dataset.g === 'enviar') { enviar(); return; }
  if (b.dataset.g === 'trazer') { trazer(); return; }
});

/* ---------- prontuário completo ↔ ficha do gabinete ---------- */
function getP(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
function setP(o, p, v) { var a = p.split('.'), x = o; for (var i = 0; i < a.length - 1; i++) { if (x[a[i]] == null) x[a[i]] = {}; x = x[a[i]]; } x[a[a.length - 1]] = v; }
function inv(m) { var o = {}; Object.keys(m).forEach(function (k) { if (!(m[k] in o)) o[m[k]] = k; }); return o; }
var SIMNAO = { 'Sim': 'Sim', 'Não': 'Não' };
/* vocabulário único (vocabulario.js): rascunho e ficha usam os mesmos valores; extra converte os valores antigos do rascunho */
function VM(k, extra) { var o = {}; (typeof VOC !== 'undefined' ? VOC.lista(k) : []).forEach(function (v) { o[v] = v; }); Object.keys(extra || {}).forEach(function (x) { if (!(x in o)) o[x] = extra[x]; }); return o; }
var RES = { 'Dar provimento': 'Provido', 'Dar parcial provimento': 'Parcialmente provido', 'Negar provimento': 'Desprovido', 'Não conhecer': 'Não conhecido', 'Prejudicado': 'Prejudicado',
  'Rejeitar': 'Rejeitados', 'Acolher sem efeitos infringentes': 'Acolhidos sem efeito infringente', 'Acolher com efeitos infringentes': 'Acolhidos com efeito infringente',
  'Exercer a retratação': 'Retratação exercida', 'Manter o acórdão': 'Acórdão mantido' };
var HON = { 'Majorar (art. 85, § 11, CPC)': 'Majorados', 'Manter': 'Mantidos', 'Inverter': 'Invertidos', 'Fixar': 'Fixados', 'Redistribuir': 'Redistribuídos', 'Sem honorários recursais': 'Sem honorários recursais' };
var ESP = { ed: 'Embargos de declaração', agint: 'Agravo interno', jr: 'Juízo de retratação' };
/* [campo da ficha, caminho no rascunho, mapa rascunho→ficha (opcional), condição (opcional)] */
var MAPA = [
  ['triagem.Tempestividade', 'regularidade.tempestividade', VM('tempest', { 'Não Verificado': 'Não verificado', 'A conferir': 'Não verificado' })],
  ['triagem.Tempest - Publicação', 'regularidade.intimacao'],
  ['triagem.Preparo', 'regularidade.preparo', VM('preparo', { 'A conferir': 'Não verificado', 'Não Recolhido': 'Não recolhido' })],
  ['triagem.AJG', 'regularidade.ajg', 'bool'],
  ['triagem.DPU (controle)', 'regularidade.dpu', 'bool'],
  ['triagem.Representação', 'regularidade.representacao', VM('repres', { 'Irregular': 'Irregular – intimar', 'A conferir': 'Não verificado' })],
  ['triagem.ID da Procuração', 'regularidade.procuracaoId'],
  ['triagem.Mídias', 'regularidade.midias', VM('midias', { 'Juntada': 'Juntadas', 'Faltante': 'Faltantes' })],
  ['triagem.Impedimento / Suspeição', 'regularidade.impedimento', { 'Impedimento': 'Impedimento', 'Suspeição': 'Suspeição' }],
  ['triagem.MPF - Custos Legis', 'regularidade.mpfAtuacao', VM('mpf', { 'Não': 'Sem hipótese' })],
  ['triagem.MPF', 'regularidade.mpfParecer', VM('parecer', { 'Com Parecer': 'Com parecer', 'Sem Parecer': 'Aguardando parecer' })],
  ['triagem.Parecer - Sentido', 'regularidade.mpfSentido', { 'Prosseguimento do feito': 'Prosseguimento do feito', 'Provimento do recurso': 'Provimento do recurso', 'Não provimento do recurso': 'Não provimento do recurso', 'Outro': 'Outro' }],
  ['triagem.ID do Parecer MPF', 'regularidade.mpfId'],
  ['triagem.MPF - Info adicional', 'regularidade.mpfInfo'],
  ['origem.Origem - Juízo', 'origem.juizo'],
  ['origem.Origem - Julgador', 'origem.julgador'],
  ['origem.Sentença - ID', 'origem.decisaoId', null, function (f) { return f.origem.decisao === 'Sentença'; }],
  ['origem.Sentença - Data', 'origem.decisaoData', null, function (f) { return f.origem.decisao === 'Sentença'; }],
  ['triagem.Detalhamento do caso', 'caso.subassunto'],
  ['triagem.Etiquetas', 'caso.etiquetas'],
  ['triagem.META', 'caso.meta'],
  ['triagem.Síntese Processual', 'triagem.resumo'],
  ['triagem.O que falta sanar', 'triagem.pendencias'],
  ['triagem.Tipo de Julgamento', 'caso.tipoManual', 'tipo-julgamento'],
  ['triagem.Impugnada - ID', 'recursoTipo.edId', null, function (f) { return f.caso.tipoManual === 'ed'; }],
  ['triagem.Impugnada - Data', 'recursoTipo.edData', null, function (f) { return f.caso.tipoManual === 'ed'; }],
  ['triagem.Impugnada - Órgão', 'recursoTipo.edOrgao', null, function (f) { return f.caso.tipoManual === 'ed'; }],
  ['triagem.ED - Vício', 'recursoTipo.edVicios'],
  ['triagem.ED - Ponto', 'recursoTipo.edPonto'],
  ['triagem.Impugnada - ID', 'recursoTipo.agintId', null, function (f) { return f.caso.tipoManual === 'agint'; }],
  ['triagem.Impugnada - Data', 'recursoTipo.agintData', null, function (f) { return f.caso.tipoManual === 'agint'; }],
  ['triagem.Impugnada - Síntese', 'recursoTipo.agintSintese', null, function (f) { return f.caso.tipoManual === 'agint'; }],
  ['triagem.AgInt - Fundamentos', 'recursoTipo.agintFundamentos'],
  ['triagem.Retratação - Tribunal', 'recursoTipo.jrTribunal', { 'STF': 'STF', 'STJ': 'STJ' }],
  ['triagem.Retratação - Precedente', 'recursoTipo.jrPrecedente'],
  ['triagem.Retratação - Síntese', 'recursoTipo.jrQuestao'],
  ['triagem.Retratação - Devolução ID', 'recursoTipo.jrDevolucaoId'],
  ['triagem.Retratação - Devolução mês', 'recursoTipo.jrDevolucaoMes'],
  ['triagem.Retratação - ED', 'recursoTipo.jrEd', { 'Opostos e rejeitados': 'Rejeitados', 'Opostos e acolhidos': 'Acolhidos', 'Parcialmente acolhidos': 'Parcialmente acolhidos', 'Não conhecidos': 'Não conhecidos' }],
  ['producao.Voto - Resultado', 'julgamento.resultado', 'res'],
  ['producao.Voto - Honorários', 'julgamento.honorarios', HON],
  ['producao.Voto - Descrição', 'julgamento.fundamentacao'],
  ['pauta.Status de Julgamento', 'julgamento.situacao', { 'EM MESA': 'EM MESA', 'ADIADO': 'ADIADO', 'RETIRADO DE PAUTA': 'RETIRADO DE PAUTA' }],
  ['producao.MINUTADO', 'workflow.minutadoEm'],
  ['producao.Data da Revisão', 'workflow.corrigidoEm'],
  ['producao.Data da Liberação', 'workflow.liberadoEm'],
  ['producao.SERVIDOR', 'caso.servidor', null, function () { return G.gestor; }],
  ['producao.CORRETOR', 'caso.corretor', null, function () { return G.gestor; }],
  ['origem.Observações', 'observacoes']
];
function tiposCanonicos(v){return S(v).split(/\s*(?:\+|;|,|·)\s*/).filter(Boolean);}
function tipoIncidental(v){return tiposCanonicos(v).map(function(t){return Object.keys(ESP).find(function(k){return N(ESP[k])===N(t);});}).find(Boolean);}
function paraFicha(m, v) {
  if(m==='tipo-julgamento')return ESP[v]||'';
  if (m === 'bool') return v === true ? 'Sim' : '';
  if (typeof v !== 'string' || !S(v)) return '';
  if (m === 'res') return RES[v] || v;
  if (m) return m[v] || '';
  return v;
}
function paraRascunho(m, v) {
  if(m==='tipo-julgamento')return tipoIncidental(v);
  v = S(v); if (!v) return undefined;
  if (m === 'bool') return /^(sim|s|true|1|x)$/i.test(v) ? true : undefined;
  if (m === 'res') return inv(RES)[v] || v;
  if (m) { var i = inv(m); return i[v]; }
  return v;
}
function rascunho() {
  var full = window.MutaProntuarioFull && window.MutaProntuarioFull.getState ? window.MutaProntuarioFull.getState() : br.getFull();
  return br.getFullSanitized(JSON.parse(JSON.stringify(full)));
}
function enviar() {
  if (!G.F || !G.cnj) return;
  var f = rascunho(), C = {}, troca = [];
  MAPA.forEach(function (e) {
    if (e[3] && !e[3](f)) return;
    var fv = paraFicha(e[2], getP(f, e[1]));
    if (!fv) return;
    var i = e[0].indexOf('.'), atual = S(V(e[0].slice(0, i), e[0].slice(i + 1)));
    if(e[2]==='tipo-julgamento')fv=juntarTipo(atual,fv);
    if (atual === fv) return;
    C[e[0]] = fv; if (atual) troca.push(e[0].slice(i + 1));
  });
  /* data de correção ou de liberação enviada agora marca também o Sim correspondente (como faz o cartão da pauta) */
  if (C['producao.Data da Revisão'] && V('producao', 'CORRIGIDO') !== 'Sim') C['producao.CORRIGIDO'] = 'Sim';
  if (C['producao.Data da Liberação'] && V('producao', 'LIBERADO') !== 'Sim') C['producao.LIBERADO'] = 'Sim';
  var ks = Object.keys(C);
  if (!ks.length) { st('Nada a enviar: a ficha já tem o que está no rascunho (ou o rascunho está vazio).', 'ok'); return; }
  var nomes = ks.map(function (k) { return k.slice(k.indexOf('.') + 1); });
  var msg = ks.length + ' campo(s) do rascunho serão gravados na ficha do gabinete de ' + G.cnj + ': ' + nomes.slice(0, 14).join(', ') + (nomes.length > 14 ? ' e mais ' + (nomes.length - 14) : '') + '.' +
    (troca.length ? '\n\nSubstituem o que já está na ficha: ' + troca.join(', ') + '.' : '') + '\n\nA ficha é a mesma do Ex Officio: a equipe passa a ver estes valores.';
  Muta.confirmar(msg, 'Gravar na ficha').then(function (ok) {
    if (!ok) return;
    ks.forEach(function (k) { marcar(k, C[k]); });
    gravarJa().catch(function () {});
  });
}
function trazer() {
  if (!G.F || !G.cnj) return;
  var f = rascunho(), n = 0, vazio = function (v) { return v == null || v === '' || v === false; };
  var padrao = { 'regularidade.impedimento': 'Sem impedimento', 'julgamento.situacao': 'PAUTADO' };
  var esp = ESP[tipoIncidental(V('triagem','Tipo de Julgamento')||V('triagem','Padrão - Espécie'))]||'';
  function vale(e) {
    if (/^recursoTipo\.ed(Id|Data|Orgao)$/.test(e[1])) return esp === ESP.ed || f.caso.tipoManual === 'ed';
    if (/^recursoTipo\.agint(Id|Data|Sintese)$/.test(e[1])) return esp === ESP.agint || f.caso.tipoManual === 'agint';
    return true;
  }
  MAPA.forEach(function (e) {
    if (!vale(e)) return;
    var i = e[0].indexOf('.'), fv = V(e[0].slice(0, i), e[0].slice(i + 1));
    if(e[2]==='tipo-julgamento'&&!fv)fv=V('triagem','Padrão - Espécie');
    if (typeof fv !== 'string') return;
    var lv = paraRascunho(e[2], fv); if (lv === undefined) return;
    var atual = getP(f, e[1]);
    if (!vazio(atual) && atual !== padrao[e[1]]) return;
    if (atual === lv) return;
    setP(f, e[1], lv); n++;
    if ((e[1] === 'origem.decisaoId' || e[1] === 'origem.decisaoData') && !f.origem.decisao) f.origem.decisao = 'Sentença';
  });
  /* identificação, a partir dos dados do acervo (fonte) */
  [['caso.classe', ['classe_judicial', 'Classe']], ['caso.autor', ['polo_ativo']], ['caso.reu', ['polo_passivo']], ['caso.assunto', ['Assunto']], ['caso.secao', ['Seção Competente']]].forEach(function (p) {
    var v = fonteVal({ fonte: p[1] }); if (v && vazio(getP(f, p[0]))) { setP(f, p[0], v); n++; }
  });
  if (!n) { st('Nada a trazer: os campos correspondentes do rascunho já estão preenchidos ou a ficha está vazia.', 'ok'); return; }
  if (window.MutaProntuarioFull && window.MutaProntuarioFull.setState) window.MutaProntuarioFull.setState(f);
  br.saveFull(f);
  st(n + ' campo(s) vazio(s) do prontuário preenchidos com a ficha. Os já preenchidos não mudaram. Veja em Prontuário completo.', 'ok');
}

/* ---------- ligações ---------- */
ses.ouvir(function () { if (modo === 'ficha') carregar(false); retomarFilas();if (window.MutaLote) window.MutaLote.sessao(); });
window.addEventListener('online',retomarFilas);
document.addEventListener('muta:sigilo',function(){var f=filaAtual();if(f){recuperarFila(f);persistirFila(f);}});
document.addEventListener('muta:autuacao',function(e){if(modo==='ficha'&&G.F&&e.detail&&Muta.chaveProcesso(e.detail.numero)===Muta.chaveProcesso(G.cnj))render();});
document.addEventListener('muta:prontuario', function () { if (modo === 'ficha') carregar(false); else if (G.pend && Object.keys(G.pend).length) gravarJa().catch(function () {}); });
window.addEventListener('pagehide', function () {Object.keys(FILA_FICHA).forEach(function(k){var f=FILA_FICHA[k];if(mesmaConta(f))persistirFila(f);});});
window.addEventListener('beforeunload',function(e){if(Object.keys(FILA_FICHA).some(function(k){return filaSemDisco(FILA_FICHA[k]);})){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange', function () { if (document.hidden && Object.keys(G.pend).length) gravarJa().catch(function () {}); });
/* ---------- correspondência rascunho ↔ ficha, para a sincronia automática (sincronia.js) ---------- */
function opVal(op, id) { var i=id.indexOf('.'), s=(op||{})[id.slice(0,i)]||{},k=id.slice(i+1),v=s[k];if(v==null&&id==='triagem.Detalhamento do caso')v=[s.Tema,s.Especificidades].map(S).filter(Boolean).filter(function(x,i,a){return a.indexOf(x)===i;}).join('\n');if(v==null&&id==='triagem.Tipo de Julgamento')v=s['Padrão - Espécie'];return v==null?'':v; }
function juntarTipo(atual,novo){var L=tiposCanonicos(atual);if(novo&&!L.some(function(x){return N(x)===N(novo);}))L.push(novo);return L.join(' + ');}
/* campos da ficha que o prontuário muda: só valores preenchidos e diferentes do que a ficha já tem */
function camposFicha(f, op, gestor, base) {
  var C = {};
  MAPA.forEach(function (e) {
    if (/^producao\.(SERVIDOR|CORRETOR)$/.test(e[0]) && !gestor) return;
    if (e[3] && !/^producao\.(SERVIDOR|CORRETOR)$/.test(e[0]) && !e[3](f)) return;
    var fv = paraFicha(e[2], getP(f, e[1]));
    if(base&&fv===paraFicha(e[2],getP(base,e[1])))return;
    if(e[2]==='tipo-julgamento'&&fv)fv=juntarTipo(opVal(op,e[0]),fv);
    if (!fv || S(opVal(op, e[0])) === fv) return;
    C[e[0]] = fv;
  });
  if (C['producao.Data da Revisão'] && opVal(op, 'producao.CORRIGIDO') !== 'Sim') C['producao.CORRIGIDO'] = 'Sim';
  if (C['producao.Data da Liberação'] && opVal(op, 'producao.LIBERADO') !== 'Sim') C['producao.LIBERADO'] = 'Sim';
  return C;
}
/* traz da ficha para o prontuário: preenche o vazio e, se a ficha é mais nova (substituir), troca o divergente */
function trazerFicha(f, op, fonte, substituir) {
  var n = [], vazio = function (v) { return v == null || v === '' || v === false; };
  var padrao = { 'regularidade.impedimento': 'Sem impedimento', 'julgamento.situacao': 'PAUTADO' };
  var esp = ESP[tipoIncidental(opVal(op,'triagem.Tipo de Julgamento'))]||'';
  MAPA.forEach(function (e) {
    if (/^recursoTipo\.ed(Id|Data|Orgao)$/.test(e[1]) && !(esp === ESP.ed || f.caso.tipoManual === 'ed')) return;
    if (/^recursoTipo\.agint(Id|Data|Sintese)$/.test(e[1]) && !(esp === ESP.agint || f.caso.tipoManual === 'agint')) return;
    var fv = opVal(op, e[0]);
    if (typeof fv !== 'string' || !S(fv)) return;
    var lv = paraRascunho(e[2], fv); if (lv === undefined) return;
    var atual = getP(f, e[1]);
    if (atual === lv) return;
    if (!vazio(atual) && atual !== padrao[e[1]] && !substituir) return;
    setP(f, e[1], lv); n.push(e[1]);
    if ((e[1] === 'origem.decisaoId' || e[1] === 'origem.decisaoData') && !f.origem.decisao) f.origem.decisao = 'Sentença';
  });
  var fv2 = function (L) { var o = fonte || {}; for (var i = 0; i < L.length; i++) { var v = S(o[L[i]]); if (v && v !== '####') return v; } return ''; };
  [['caso.classe', ['classe_judicial', 'Classe']], ['caso.autor', ['polo_ativo']], ['caso.reu', ['polo_passivo']], ['caso.assunto', ['Assunto']], ['caso.secao', ['Seção Competente']]].forEach(function (p) {
    var v = fv2(p[1]); if (v && vazio(getP(f, p[0]))) { setP(f, p[0], v); n.push(p[0]); }
  });
  return n;
}
window.MutaMapa = { camposFicha: camposFicha, trazerFicha: trazerFicha, getP: getP, setP: setP };
window.MutaGabinete = { recarregar: function () { carregar(true); }, gravarPendente: function () { return gravarJa(); }, modo: function () { return modo; },
  /* para os autos (autos.js) e a aba Minuta: o prontuário aberto e a gravação */
  render: function () { render(); }, cnj: function () { return G.cnj; }, modelo: function () { return G.F; }, op: function () { return G.op; }, fo: function () { var a=autuacaoAtual(),f=Object.assign({},G.fo||{});if(a.assunto)f.Assunto=a.assunto;if(a.classe)f.classe_judicial=a.classe;return f; }, assuntoCNJ:assuntoCNJ, classeAutuacao:classeAutuacao,
  api: function (p, o) { return ses.api(p, o); },
  gravado: gravado, V: V, F: function (k) { return fonteVal({ fonte: [k] }); }, marcar: marcar, gravar: function () { return gravarJa(); }, ir: function (aba) { if (aba === 'Triagem' || aba === 'Roteiro') {aba = 'Processo';if(heroV53())G.rot='tri';} if(heroV53()&&aba==='Produção'){aba='Processo';G.rot='pro';} if(heroV53()&&aba==='Gerador'){aba='Processo';G.rot='ger';} if(heroV53()&&aba==='Resumo'){aba='Processo';G.rot='res';} if (MODOS.indexOf(aba) >= 0) { G.aba = aba; render(); } },
  irGerador: function () { if(window.MutaAbas)window.MutaAbas.ir('pront'); if(!heroV53()){if(window.MutaAbas)window.MutaAbas.ir('ger');return;} G.aba='Processo';G.rot='ger';heroTopo.encDockOpen=false;render(); },
  destino: function () { return G.F ? destino() : ''; }, pronunciamento: function(){var i=pronAtual();return i>=0?PRON[i][0]:'';},
  casoPrec: function () { return G.cnj ? casoPrec() : null; },
  pautaHtml: pautaHtml,
  abrirReferencia: function(){G.pecAb=G.pecAb||{};G.pecAb.Origem=true;G.pecAb['1º grau']=true;if(window.MutaAutos)window.MutaAutos.estado().docAba='ficha';G.aba='Autos';if(window.MutaAbas)window.MutaAbas.ir('pront');render();},
  /* a sincronia gravou a ficha: o painel da ficha mostra o novo registro sem nova leitura */
  registro: function (cnj, op) { if (op && dg(cnj) === dg(G.cnj)) { G.op = op; if (modo === 'ficha') render(); } } };
/* Ampliação incremental: preserva os controles, OCR, cronologia e motores dos roteiros. */
(function(){
 var A=window.MutaAnaliseProntuario;if(!A)return;
 var DOC='origem.Classificação documental',SUC='origem.Sucumbência da decisão recorrida',RES='producao.Resultado por recurso';
 var tableDraft=Object.create(null),docDraft=Object.create(null),docFilter='Todos',docCnj='',pane=caixa;
 function val(id){var i=id.indexOf('.');return V(id.slice(0,i),id.slice(i+1));}
 function model(id){var i=id.indexOf('.');return campoModelo(id.slice(0,i),id.slice(i+1));}
 function list(v){return Array.isArray(v)?v:[];}
 function key(id){return G.cnj+'|'+id;}
 function blocked(d){var s=window.MutaSigilo;return !!(s&&(s.bloqueado()||(d&&s.docBloqueado(d))));}
 // Não transportar trechos sigilosos para a ficha compartilhada com a equipe.
 function restricted(d){var s=window.MutaSigilo;return blocked(d)||!!(s&&(s.sigiloso()||(d&&s.docSigiloso(d))));}
 function currentDocs(){var au=window.MutaAutos,r=au&&au.doProcesso&&au.doProcesso();return r?list(r.lista):[];}
 function rows(){return A.mesclar(gravado('origem','Classificação documental'),G.pend[DOC]);}
 function classified(d){var r=rows().find(function(x){return x.id===String(d.id);});return {row:r,classes:r?A.classesValidas(r.classes):A.sugerir(d)};}
 function b(action,id,label){return '<button type="button" class="btn line sm" data-plus="'+esc(action)+'" data-plus-id="'+esc(id)+'">'+esc(label)+'</button>';}
 function inp(c,v,attrs){v=String(v==null?'':v);if(c.tipo==='lista'){var o=[''].concat(c.opcoes||[]);if(v&&o.indexOf(v)<0)o.push(v);return '<select '+attrs+'>'+o.map(function(x){return '<option value="'+esc(x)+'"'+(x===v?' selected':'')+'>'+esc(x||'—')+'</option>';}).join('')+'</select>';}
 return c.tipo==='texto-longo'?'<textarea rows="2" '+attrs+'>'+esc(v)+'</textarea>':'<input type="'+(c.tipo==='data'?'date':'text')+'" '+attrs+' value="'+esc(v)+'">';}
 var baseCampo=campo0;
 campo0=function(c){var id=c.secao+'.'+c.chave;
 if(c.tipo!=='tabela'||!editavel(c)||id===DOC)return baseCampo(c);
 if(blocked())return '<div class="gf w"><span class="gl">'+esc(c.rotulo)+'</span><span class="ro">Acesso restrito.</span></div>';
 var d=tableDraft[key(id)],v=list(val(id)),h='<div class="gf w plus-table" data-plus-table="'+esc(id)+'"><div class="plus-head"><span class="gl">'+esc(c.rotulo)+'</span>'+(!d?b('table-edit',id,v.length?'Editar / +':'+ Incluir'):'')+'</div>';
 if(!d)return h+tabela(c,v)+'</div>';
 h+=d.map(function(row,i){return '<div class="plus-row"><div class="plus-head"><b>Registro '+(i+1)+'</b>'+b('table-remove',id+'|'+i,'Remover')+'</div><div class="gr">'+(c.colunas||[]).map(function(col){return '<label class="gf'+(col.tipo==='texto-longo'?' w':'')+'"><span class="gl">'+esc(col.rotulo)+'</span>'+inp(col,row[col.chave],'data-plus-col="'+esc(col.chave)+'" data-plus-index="'+i+'"')+'</label>';}).join('')+'</div></div>';}).join('');
 return h+'<div class="plus-head">'+b('table-add',id,'+ Linha')+'<span>'+b('table-cancel',id,'Cancelar')+' '+b('table-save',id,'Gravar')+'</span></div></div>';};
 function docHtml(d){if(!model(DOC))return '';if(restricted(d))return '<p class="muted">Classificação detalhada indisponível para documento sigiloso na ficha compartilhada.</p>';
 var id=String(d.id),c=classified(d),draft=docDraft[key(id)],cs=draft?A.classesValidas(draft.classes):c.classes;
 var h='<div class="plus-doc" data-plus-doc="'+esc(id)+'"><div class="plus-head"><span class="muted">'+(c.row?'Classificação registrada':'Classificação sugerida')+'</span>'+b('doc-edit',id,draft?'Fechar':'+ Classificar')+'</div><div class="plus-tags">'+cs.map(function(x){return '<span class="chip">'+esc(x)+'</span>';}).join('')+'</div>';
 if(!draft)return h+'</div>';
 h+='<div class="plus-tags">'+A.categorias.map(function(x){return '<button type="button" class="chip'+(cs.indexOf(x)>=0?' on':'')+'" data-plus="doc-tag" data-plus-id="'+esc(id)+'" data-plus-cat="'+esc(x)+'" aria-pressed="'+(cs.indexOf(x)>=0)+'">'+esc(x)+'</button>';}).join('')+'</div><small class="muted">Até duas funções por documento. Relatável: peça não principal a mencionar no relatório.</small><div class="gr">';
 var cols=model(DOC).colunas.filter(function(c){return ['id','tipo','data','classes','origem','confirmada'].indexOf(c.chave)<0;});
 h+=cols.map(function(c){return '<label class="gf'+(c.tipo==='texto-longo'?' w':'')+'"><span class="gl">'+esc(c.rotulo)+'</span>'+inp(c,draft[c.chave],'data-plus-doc-col="'+esc(c.chave)+'"')+'</label>';}).join('');
 return h+'</div><div class="plus-head">'+b('doc-cancel',id,'Cancelar')+b('doc-save',id,'Confirmar e gravar')+'</div></div>';
 }
 window.MutaGabinete.classificacaoDoc=docHtml;
 window.MutaGabinete.classificacaoFiltro=function(ds){if(restricted()||!model(DOC))return '';ds=ds.filter(function(d){return !restricted(d);});
 return '<details class="plus-docfilter au-class-filter"><summary><span>Classificação funcional</span><b>'+esc(docFilter)+'</b></summary><div class="plus-tags">'+['Todos'].concat(A.categorias,['Não classificados']).map(function(c){var n=c==='Todos'?ds.length:ds.filter(function(d){var v=classified(d).classes;return c==='Não classificados'?!v.length:v.indexOf(c)>=0;}).length;return '<button type="button" class="chip'+(docFilter===c?' on':'')+'" data-plus="filter" data-plus-id="'+esc(c)+'">'+esc(c)+' · '+n+'</button>';}).join('')+'</div></details>';};
 window.MutaGabinete.limparFiltroDocumental=function(){docFilter='Todos';};
 window.MutaGabinete.classificacaoVisivel=function(d){if(docFilter==='Todos'||blocked(d))return true;var c=classified(d).classes;return docFilter==='Não classificados'?!c.length:c.indexOf(docFilter)>=0;};
 FORA_PROC['Classificação documental']=1;
 GRUPOS_TRIAGEM['Classificação documental']=1;GRUPOS_TRIAGEM['Sucumbência da decisão recorrida']=1;
 var newGroups=['Plano do pronunciamento','Solução processual','Fundamentação e dispositivo','Sucumbência e consectários do julgamento','Questões específicas da espécie'];
 var species={'Apelação':'ap','Remessa':'rn','AI':'ai','ED':'ed','AgInt':'agint','JR':'ret','MS':'ms'};
 function applicable(c){if(!c||c.secao!=='producao')return true;var p=String(c.chave).split(' - ')[0],k=species[p];return !k||!!ccTipos()[k]||!!S(V(c.secao,c.chave));}
 var originalGrupo=grupoModelo;
 grupoModelo=function(n){var g=originalGrupo(n);return n==='Questões específicas da espécie'&&g?Object.assign({},g,{campos:g.campos.filter(applicable)}):g;};
 newGroups.slice().reverse().forEach(function(n){CC_AC.unshift([n,n]);CC_MONO.unshift([n,n]);});
 function indicatorHtml(){if(!model(SUC)||blocked())return '';
 var chapters=list(val(SUC)),rr=list(val(RES)),rec=list(V('origem','Recursos')),tipo=window.MutaRoteiro?window.MutaRoteiro.TIPOS.filter(function(t){return ccTipos()[t[0]];}).map(function(t){return t[1];}).join(' + '):V('triagem','Tipo de Julgamento');
 var h='<details class="gg plus-ind" open><summary><h4>Indicadores de custas e honorários</h4></summary><div class="gr"><div class="gf w"><small class="muted">Subsídio à revisão · não altera a solução registrada. Tema 1.059/STJ.</small><div>'+b('suc-open','','Ver decisão recorrida')+'</div></div>';
 var cases=rr.length?rr:[{resultado:V('producao','Voto - Resultado')}];
 var idsRec=rec.map(function(x){return String(x.ids||'').match(/\d+/g)||[];}),idsResult=rr.map(function(x){return S(x.id_recurso);});
 var individual=rec.length<=1||(rr.length===rec.length&&new Set(idsResult).size===rr.length&&idsRec.every(function(ids){return ids.some(function(i){return idsResult.indexOf(i)>=0;});})&&rr.every(function(x){return S(x.resultado)&&S(x.recorrente);}));
 if(!individual)cases=[{resultado:V('producao','Voto - Resultado'),incompleto:true}];
 cases.forEach(function(r){var match=chapters.filter(function(x){return r.recorrente&&S(x.devedor)===S(r.recorrente);}),I=A.indicador({resultado:r.resultado,tipo:tipo,sucumbencia:match.length?match:rr.length>1?[]:chapters,multiplos:rec.length>1,individual:individual&&!r.incompleto});
 h+='<div class="gf w plus-ind-item">'+(r.recorrente?'<b>'+esc(r.recorrente)+'</b> · ':'')+esc(r.resultado||'Resultado a definir')+I.itens.map(function(x){return '<p>'+esc(x)+'</p>';}).join('')+'</div>';});
 h+='<div class="gf w"><span class="gl">Registro anterior (texto livre)</span><span class="ro">'+esc(S(V('origem','Sentença - Honorários'))||'—')+' · '+esc(S(V('origem','Sentença - Custas'))||'—')+'</span></div></div></details>';
 return h;}
 function docRefs(){if(restricted()||!model(DOC))return '';
 var L=rows().filter(function(x){return x.confirmada==='Sim'&&S(x.classes);}),docs=currentDocs();
 L=L.filter(function(x){var d=docs.find(function(d){return String(d.id)===x.id;});return !d||!restricted(d);});
 if(!L.length)return '<details class="gg"><summary><h4>Documentos classificados</h4></summary><p class="muted">Classifique as peças em Autos para orientar o relatório e a fundamentação.</p></details>';
 var groups=[['Relatório',['Principal','Relatável']],['Fundamentação',['Comprobatório','Fundamentável','Precedente']],['Admissibilidade',['Admissibilidade']],['Sucumbência',['Consectários']]];
 return '<details class="gg"><summary><h4>Documentos classificados</h4><span class="gn">'+L.length+'</span></summary>'+groups.map(function(g){var R=L.filter(function(x){return String(x.classes).split(';').some(function(c){return g[1].indexOf(S(c))>=0;});});if(!R.length)return '';return '<h4 class="pm-mer-h">'+esc(g[0])+'</h4>'+R.map(function(x){return '<div class="plus-row"><b>'+esc(x.tipo||'Documento')+'</b> '+b('doc-open',x.id,'ID '+x.id)+(x.sintese?'<p>'+esc(String(x.sintese).slice(0,300))+'</p>':'')+'</div>';}).join('');}).join('')+'</details>';}
 var baseProd=camposCaso;
 camposCaso=function(ja){var h=baseProd(ja),c=model(RES);if(!h||!c)return h;return h.replace(/<\/section>$/, '<details class="gg"><summary><h4>Resultado individualizado por recurso</h4></summary><div class="gr">'+campo(c)+'</div></details>'+indicatorHtml()+docRefs()+'</section>');};
 var baseMer=merEnc;merEnc=function(){var h=baseMer();if(!G.merAb||location.pathname.endsWith('/universal.html'))return h;
 return h.replace(/<\/details>$/, '<div class="gr">'+campoRot('triagem','Ramo do direito')+campoRot('triagem','Outros assuntos')+'</div></details>');};
 var baseRender=render0;render0=function(){if(docCnj!==G.cnj){docCnj=G.cnj;docFilter='Todos';}baseRender();};
 pane.addEventListener('input',function(e){var t=e.target,w=t.closest&&t.closest('[data-plus-table],[data-plus-doc]');if(!w)return;
 if(t.dataset.plusCol){var d=tableDraft[key(w.dataset.plusTable)];if(d&&d[Number(t.dataset.plusIndex)])d[Number(t.dataset.plusIndex)][t.dataset.plusCol]=t.value;}
 if(t.dataset.plusDocCol){var d2=docDraft[key(w.dataset.plusDoc)];if(d2)d2[t.dataset.plusDocCol]=t.value;}},true);
 pane.addEventListener('change',function(e){var t=e.target;if(t.dataset.plusCol||t.dataset.plusDocCol)t.dispatchEvent(new Event('input',{bubbles:true}));},true);
 pane.addEventListener('click',function(e){var x=e.target.closest&&e.target.closest('[data-plus]');if(!x)return;e.preventDefault();e.stopImmediatePropagation();
 var act=x.dataset.plus,id=x.dataset.plusId,k=key(id),d,idx;
 if(act==='suc-open'){G.aba='Autos';G.pecAb=G.pecAb||{};G.pecAb['Sucumbência da decisão recorrida']=true;if(window.MutaAutos){window.MutaAutos.estado().docAba='ficha';window.MutaAutos.estado().filtro='pecas';}docFilter='Todos';render();var el=Array.from(pane.querySelectorAll('details[data-grupo]')).find(function(e){return e.dataset.grupo==='Sucumbência da decisão recorrida';});if(el){el.open=true;el.scrollIntoView({block:'start'});}return;}
 if(act==='doc-open'){G.aba='Autos';docFilter='Todos';if(window.MutaAutos){window.MutaAutos.estado().docAba='docs';window.MutaAutos.estado().filtro='todos';}render();var d=Array.from(pane.querySelectorAll('[data-au-it]')).find(function(x){return x.dataset.auIt===id;});if(d){var w=d.closest('.au-doc')||d;w.scrollIntoView({block:'start'});}else{var a=$('g-docs');if(a)a.scrollIntoView({block:'start'});}return;}
 if(act==='filter'){docFilter=id;if(window.MutaAutos){window.MutaAutos.estado().docAba='docs';if(id!=='Todos')window.MutaAutos.estado().filtro='todos';}render();return;}
 if(blocked())return;
 if(act==='table-edit'){if(!model(id)||!editavel(model(id)))return;tableDraft[k]=list(val(id)).map(function(r){return Object.assign({},r);});if(!tableDraft[k].length)tableDraft[k].push({});}
 else if(act==='table-remove'){idx=Number(id.split('|').pop());id=id.slice(0,id.lastIndexOf('|'));d=tableDraft[key(id)];if(d)d.splice(idx,1);}
 else if(act==='table-add'){d=tableDraft[k];if(d&&d.length<60)d.push({});}
 else if(act==='table-cancel')delete tableDraft[k];
 else if(act==='table-save'){d=tableDraft[k];if(!d||!model(id)||!editavel(model(id)))return;if(d.length>60){st('Limite de 60 linhas por tabela. Nenhum registro foi alterado.','err');return;}marcar(id,d.filter(function(r){return Object.values(r).some(function(v){return S(v);});}));delete tableDraft[k];agendar(400);}
 else if(act.indexOf('doc-')===0){var doc=currentDocs().find(function(z){return String(z.id)===id;});if(!doc||restricted(doc))return;
 if(act==='doc-edit'){if(docDraft[k])delete docDraft[k];else{var z=classified(doc);docDraft[k]=Object.assign({id:id,tipo:doc.tipo,data:doc.data,classes:z.classes.join('; ')},z.row||{});}}
 else if(act==='doc-cancel')delete docDraft[k];
 else if(act==='doc-tag'){d=docDraft[k];if(!d)return;var L=String(d.classes||'').split(';').map(S).filter(Boolean),cat=x.dataset.plusCat;if(L.indexOf(cat)>=0)L=L.filter(function(t){return t!==cat;});else {if(cat==='Principal')L=L.filter(function(t){return t!=='Relatável';});if(cat==='Relatável')L=L.filter(function(t){return t!=='Principal';});if(cat==='Dispensável')L=[];else L=L.filter(function(t){return t!=='Dispensável';});if(L.length>=2){st('Selecione no máximo duas classificações por documento. Retire uma antes de incluir outra.','err');return;}L.push(cat);}d.classes=A.classesValidas(L).join('; ');}
 else if(act==='doc-save'){d=docDraft[k];if(!d)return;d.classes=A.classesValidas(d.classes).join('; ');d.origem='Manual / confirmada';d.confirmada='Sim';marcar(DOC,A.mesclar(G.pend[DOC],[d]));delete docDraft[k];agendar(400);}
 }render();
 },true);
})();

aplicarModo();
})();
