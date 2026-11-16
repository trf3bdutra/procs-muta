/* CMT · Ficha única do processo — diálogo no visual v198 (padrão cmtx), com os campos de padrao/ficha.json.
   Um só módulo para o CMT-monitor e a Ex Officio: scripts/ficha/embutir.py copia este arquivo e padrao/ficha-dialogo.css
   para os dois HTML. Cada página entrega um adaptador:
     CMTFicha.abrir(cnj, {
       carregar: cnj => Promise<{ ficha, operacional, fonte, controles?, gestor? }>,
       gravar:   (cnj, campos) => Promise<{ operacional, recusados? }>   campos = { 'triagem.Tempestividade': 'Tempestivo', ... }
       irPara?:  controle => void        (botão "Abrir a página" dos Controles especiais)
       lista?:   [cnj, ...]              (anterior / próximo)
       avisar?:  (texto, tipo) => void
       leitura?: true                    (só leitura: sem o botão Editar e sem gravar; a Ex Officio edita pelo prontuário lateral)
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
var ST = { cnj: '', ad: null, d: null, err: '', tab: 'resumo', edit: false, draft: {}, busy: false, view: 'ficha', mostra: {}, histAll: false, teor: null };
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
function destino() { return val('producao', 'Destino') === 'Monocrática' ? 'monocratica' : 'sessao'; }
/* destino confirmado: "Sessão" ou "Monocrática" (gravado pela triagem ou pelo seletor); vazio = a definir na triagem */
function destinoDef() { var v = val('producao', 'Destino'); return v === 'Monocrática' ? 'monocratica' : v === 'Sessão' ? 'sessao' : ''; }
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
  host.addEventListener('click', onClick); host.addEventListener('change', onChange); host.addEventListener('input', onInput);
  host.addEventListener('dragover', function (ev) { if (!ST.teor || ST.view !== 'ficha') return; if ([].slice.call((ev.dataTransfer && ev.dataTransfer.types) || []).indexOf('Files') >= 0) { ev.preventDefault(); host.classList.add('is-drop'); } });
  host.addEventListener('dragleave', function (ev) { if (ev.target === host || !host.contains(ev.relatedTarget)) host.classList.remove('is-drop'); });
  host.addEventListener('drop', function (ev) { host.classList.remove('is-drop'); var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]; if (!f || !ST.teor) return; ev.preventDefault(); lerTxt(f); });
  doc.body.appendChild(host); return host;
}
function abrir(cnj, ad) {
  ensureHost();
  ST.ad = ad || ST.ad || {}; ST.cnj = cnjFmt(cnj); ST.d = null; ST.err = ''; ST.edit = false; ST.draft = {}; ST.busy = false; ST.view = 'ficha'; ST.mostra = {}; ST.histAll = false; descartarTeor();
  ST.tab = (ad && ad.aba) || 'resumo';
  host.classList.add('on'); host.setAttribute('aria-hidden', 'false'); doc.documentElement.classList.add('cmt-fx-open');
  doc.addEventListener('keydown', onKey, true);
  render();
  var alvo = ST.cnj;
  Promise.resolve().then(function () { return ST.ad.carregar(alvo); }).then(function (d) {
    if (ST.cnj !== alvo) return;
    ST.d = d || {}; if (window.CMTForense) window.CMTForense.atual = ST.d.expediente || null; if (!ST.d.controles || !ST.d.controles.naLista) ST.d.controles = Object.assign({}, ST.d.controles, controlesDe(ST.d.fonte, ST.d.operacional));
    if (ST.tab === CE && !ativos().length) ST.tab = 'resumo';
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
  if (Object.keys(ST.draft).length && !window.confirm('Descartar as alterações não salvas da ficha?')) return;
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
  var m = host.querySelector('.fx-main'), y = m ? m.scrollTop : 0;
  host.innerHTML = ST.view === 'doc' && ST.d ? docView() : fichaView();
  var m2 = host.querySelector('.fx-main'); if (m2) m2.scrollTop = y;
}
function cabecalho() {
  var f = fo(), cl = S(f.classe_judicial || f.Classe || f['Descrição da Classe']), as = S(f.Assunto || f.Assunto_Principal || f.assunto_judicial);
  var partes = [S(f.polo_ativo || f.Polo_Ativo || f['Polo Ativo']), S(f.polo_passivo || f.Polo_Passivo || f['Polo Passivo'])].filter(Boolean).join(' × ');
  var L = ST.ad.lista || [], i = L.map(dg).indexOf(dg(ST.cnj));
  var nav = L.length > 1 && i >= 0 ? '<button type="button" class="fx-sq" data-fx="ant" title="Processo anterior (Alt+↑)">' + svg('back') + '</button><span class="fx-note">' + (i + 1) + ' de ' + L.length + '</span><button type="button" class="fx-sq" data-fx="prox" title="Próximo processo (Alt+↓)">' + svg('fwd') + '</button>' : '';
  return '<header class="fx-head"><span class="fx-ic">' + svg('ficha') + '</span>' +
    '<div class="fx-tt"><span>' + E(['Ficha do processo', cl, as].filter(Boolean).join(' · ')) + '</span><div class="fx-num"><h2 id="fx-titulo">' + E(ST.cnj) + '</h2><button type="button" class="fx-sq" data-fx="copiar-num" aria-label="Copiar número do processo" title="Copiar número">' + svg('copy') + '</button></div>' + (partes ? '<small>' + E(partes) + '</small>' : '') + '</div>' +
    '<div class="fx-acts" role="group" aria-label="Ações da ficha">' + (window.CMTInteiroTeor && ST.d && !ST.err && !ST.ad.leitura ? '<button type="button" class="fx-pill' + (ST.teor ? ' is-on' : '') + '" data-fx="teor" title="Importar o inteiro teor (.txt do PJe): lista os documentos e sugere os campos; grava só o que for confirmado">' + svg('txt') + 'Inteiro teor .txt</button>' : '') + nav + '</div>' +
    '<button type="button" class="fx-sq fx-x" data-fx="fechar" aria-label="Fechar" title="Fechar (Esc)">' + svg('x') + '</button></header>';
}
function faixa() {
  var R = regras(), FL = fluxo();
  return '<div class="fx-strip"><div class="fx-rules"><span class="fx-k">' + svg('rule') + 'Regras</span>' +
    (R.length ? R.map(function (r) { return '<span class="fx-chip t-' + r[2] + '"><i>' + E(r[0]) + '</i>' + E(r[1]) + '</span>'; }).join('') : '<span class="fx-dim">sem regras calculadas</span>') + '</div>' +
    '<ol class="fx-flow" aria-label="Fluxo do processo">' + FL.map(function (s, j) {
      return '<li class="' + (s.feito ? 'is-done' : s.atual ? 'is-cur' : 'is-todo') + '"' + (s.atual ? ' aria-current="step"' : '') + '><span class="fx-dot">' + (s.feito ? svg('ok') : s.atual ? '<i></i>' : '') + '</span>' + (j < FL.length - 1 ? '<span class="fx-line"></span>' : '') +
        (s.destino ? '<select class="fx-dest-sel" data-fx-destino' + (ST.ad.leitura ? ' disabled' : '') + ' aria-label="Destino do julgamento" title="Destino do julgamento: sessão (acórdão) ou decisão monocrática">' + [['', 'A definir'], ['Sessão', 'Sessão'], ['Monocrática', 'Monocrática']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === (destinoDef() === 'monocratica' ? 'Monocrática' : destinoDef() === 'sessao' ? 'Sessão' : '') ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' : '<b>' + E(s.etapa) + '</b>') +
        '<small>' + E([s.quem, s.quando].filter(Boolean).join(' · ')) + '</small></li>';
    }).join('') + '</ol></div>';
}
function abas() {
  var P = pendencias(), L = [['resumo', 'Resumo', 0]];
  (F().abas || []).forEach(function (a) { var n = a.aba === CE ? ativos().length : P.filter(function (p) { return p[1] === a.aba; }).length; L.push([a.aba, a.aba, n, a.aba === CE]); });
  return L;
}
function fichaView() {
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
    else if (c.tipo === 'texto-longo') body = '<textarea rows="' + Math.min(6, Math.max(2, S(v).split('\n').length)) + '" ' + a + '>' + E(v) + '</textarea>';
    else body = '<input ' + a + ' value="' + E(v) + '">';
  } else if (c.calculado) body = v ? '<span class="fx-calc">' + E(v) + '</span>' : '<span class="fx-dim">—</span>';
  else if (c.tipo === 'simnao') body = '<span class="fx-v ' + (sim(v) ? '' : 'fx-dim') + '">' + (sim(v) ? 'Sim' : v ? E(v) : '—') + '</span>';
  else if (c.tipo === 'data') body = '<span class="fx-v fx-mono ' + (v ? '' : 'fx-dim') + '">' + E(brD(iso(v) || v) || '—') + '</span>';
  else body = '<span class="fx-v ' + (v ? '' : 'fx-dim') + (/ID\b/.test(c.rotulo) ? ' fx-mono' : '') + '">' + E(mostra(v) || '—') + '</span>';
  return '<div class="fx-f s' + span(c, v) + (ed ? ' is-edit' : '') + (sujo ? ' is-dirty' : '') + '">' + lab + body + '</div>';
}
var grade = function (campos) { return '<div class="fx-grid">' + campos.map(campo).join('') + '</div>'; };
function abaGrupos(A) {
  if (A.aba === CE) return abaControles(A);
  var dn = destino(), h = '', n = 0;
  if (A.destino && A.destino !== dn) return card('Não se aplica a este processo', '<p>' + (A.destino === 'sessao' ? 'O destino do julgamento é decisão monocrática: o processo não vai à pauta. A decisão fica em Produção › Decisão monocrática.' : 'Esta parte só vale para a decisão monocrática.') + '</p><p>Para mudar, use o destino no fim do fluxo, acima.</p>');
  if (A.seletor) h += '<p class="fx-info-p">' + svg('rule') + '<span><b>' + E(A.seletor.rotulo) + ':</b> ' + (dn === 'monocratica' ? 'decisão monocrática' : destinoDef() ? 'sessão (acórdão)' : 'a definir na triagem (o fluxo mostra o da sessão)') + '. ' + E(A.seletor.regra || '') + '</span></p>';
  if (A.aba === 'Triagem') h += cardDestino() + cardTempest();
  h += (A.grupos || []).filter(function (g) { return (!g.destino || g.destino === dn) && grupoVisivel(g); }).map(function (g) { return card(g.grupo, grade(g.campos), { n: ('0' + (++n)).slice(-2), nota: g.destino ? (g.destino === 'sessao' ? 'acórdão' : 'monocrática') : '' }); }).join('');
  if (A.aba === 'Pauta') { var SS = sessoes(); h += card('Histórico de sessões', SS.length ? '<div class="fx-tbl"><span>Sessão</span><span>Item · situação</span><span>Resultado</span>' + SS.map(function (s) { return '<span class="fx-mono">' + E(brD(iso(s.sessao || s.data)) || s.sessao) + '</span><span>' + E([s.item ? 'item ' + s.item : '', S(s.status).toLowerCase()].filter(Boolean).join(' · ') || '—') + '</span><span>' + E(s.resultado || s.motivo || '—') + '</span>'; }).join('') + '</div>' : '<p class="fx-dim">Sem passagens por pauta.</p>', { n: ('0' + (++n)).slice(-2), nota: 'inclusões, adiamentos e retiradas' }); }
  return h;
}
/* destino do julgamento confirmado na triagem: Sessão ou Monocrática (producao.Destino); a data e o autor ficam na triagem */
function cardDestino() {
  var d = destinoDef(), em = val('triagem', 'Destino - Confirmado em'), por = val('triagem', 'Destino - Confirmado por'), hip = val('triagem', 'Hipóteses Monocrática'), ro = ST.ad.leitura;
  var est = d ? '<b>' + (d === 'monocratica' ? 'Decisão monocrática' : 'Sessão (colegiado)') + '</b> <span class="fx-dim">· confirmado' + (iso(em) ? ' em ' + E(brD(iso(em))) : '') + (por ? ' por ' + E(por) : '') + '</span>' : '<b>A definir</b> <span class="fx-dim">· o processo segue na fila de triagem até a confirmação</span>';
  var bt = function (v, t, on) { return '<button type="button" class="fx-pill' + (on ? ' is-on' : '') + '" data-fx-confdest="' + v + '"' + (ro || on ? ' disabled' : '') + '>' + t + '</button>'; };
  var acoes = bt('Sessão', 'Confirmar sessão', d === 'sessao') + bt('Monocrática', 'Confirmar monocrática', d === 'monocratica') + (d ? '<button type="button" class="fx-pill fx-mini" data-fx-confdest=""' + (ro ? ' disabled' : '') + '>Desfazer</button>' : '');
  return card('Destino do julgamento', '<p>' + est + '</p>' + (hip && hip !== 'Não se aplica' ? '<p class="fx-note">Hipótese de monocrática anotada: ' + E(hip) + '</p>' : '') + '<div class="fx-acts">' + acoes + '</div>', { cls: 'fx-destino' + (d ? ' is-ok' : ' is-warn') });
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
function abaControles(A) {
  var n = 0;
  return '<p class="fx-info-p">' + svg('shield') + '<span>Grupos oficiais de acompanhamento. Cada um vale para o processo pela sua regra; os campos ficam no registro do processo (operacional) e são os mesmos das páginas de controle.</span></p>' +
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
  var defd = destinoDef(), destTxt = !defd ? 'A definir na triagem' : mono ? 'Decisão monocrática' : 'Sessão ' + (brD(sd) || 'a definir'), destSub = mono ? (val('producao', 'Decisão - ID') ? 'ID ' + val('producao', 'Decisão - ID') : val('producao', 'Mono - Tipo de ato') || 'sem pauta') : [ss.item ? 'item ' + ss.item : 'sem item', val('pauta', 'Status de Julgamento').toLowerCase()].filter(Boolean).join(' · ');
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
  var pro = kv(mono ? [['Servidor', p('SERVIDOR')], ['Minutado em', brD(iso(p('MINUTADO')))], ['Corretor', p('CORRETOR')], ['Revisado em', brD(iso(p('Data da Revisão')))], ['Tipo de ato', p('Mono - Tipo de ato')], ['Resultado', p('Voto - Resultado')], ['Enviada para assinatura', brD(iso(p('Data da Liberação')))], ['Assinada', sim(p('Assinado')) ? 'Sim' : '']]
    : [['Servidor', p('SERVIDOR')], ['Minutado em', brD(iso(p('MINUTADO')))], ['Corretor', p('CORRETOR')], ['Corrigido', sim(p('CORRIGIDO')) ? 'Sim' : brD(iso(p('Data da Revisão')))], ['Liberado', sim(p('LIBERADO')) ? 'Sim' : brD(iso(p('Data da Liberação')))], ['Resultado do voto', p('Voto - Resultado')], ['Tópico-síntese', p('Tópico-síntese')]]);
  var SS = sessoes(), pau = mono ? '<p class="rs-empty">Decisão monocrática: não vai à pauta.</p>' : kv([['Status', val('pauta', 'Status de Julgamento')], ['Sessão original', brD(iso(val('pauta', 'Sessão original')))], ['Sessão de destino', brD(iso(val('pauta', 'Nova sessão de destino')))], ['Seleção', val('pauta', 'JULGAMENTO')]]) +
    (SS.length ? '<ol class="rs-tl">' + SS.slice(0, 6).map(function (s) { return '<li><b class="fx-mono">' + E(brD(iso(s.sessao || s.data)) || s.sessao) + '</b> ' + E([s.item ? 'item ' + s.item : '', s.resultado || ''].filter(Boolean).join(' · ')) + '</li>'; }).join('') + '</ol>' : '');
  var A = ativos(), ce = A.length ? '<div class="rs-tiles">' + A.map(function (g) {
    var v = g === 'urgencia' ? [t('Urgência'), t('Urgência - Apreciação')].filter(Boolean).join(' · ') : g === 'monocratica' ? p('Mono - Tipo de ato') || 'registrada' : g === 'meta' ? val('controles', 'Meta - Situação') || ((naLista().metas || {}).metas || []).map(function (m) { return 'Meta ' + m; }).join(', ') || t('META')
      : g === 'sobrestamento' ? [val('controles', 'Sobrestamento - Motivo') || (naLista().sobrestados || {}).motivoAuto, val('controles', 'Sobrestamento - Tema')].filter(Boolean).join(' · ') : val('controles', 'Sensível - Categoria') || (naLista().sensiveis || {}).catAuto;
    return '<div class="rs-t ' + (g === 'urgencia' && !/^Apreciada/.test(t('Urgência - Apreciação')) ? 'is-warn' : '') + '"><span>' + E({ urgencia: 'Urgência', monocratica: 'Monocrática', meta: 'Meta', sobrestamento: 'Sobrestamento', sensivel: 'Caso sensível' }[g]) + '</span><b>' + E(v || 'sim') + '</b></div>';
  }).join('') + '</div>' : '<p class="rs-empty">Nenhum controle especial vale para este processo.</p>';
  var pr = kv([['Partes', [S(f.polo_ativo || f.Polo_Ativo), S(f.polo_passivo || f.Polo_Passivo)].filter(Boolean).join(' × ')], ['Seção', S(f['Seção Competente'])], ['Distribuição', brD(iso(f['data_distribuição'] || f['Data_Distribuição']))], ['Última movimentação', [S(f['Última_Movimentação'] || f.ultimo_movimento), brD(iso(f['Data_Última_Movimentação']))].filter(Boolean).join(' · ')], ['Tramitação', S(f['Tempo_de_Tramitação']) ? S(f['Tempo_de_Tramitação']) + ' dias' : ''], ['Sentença', [val('origem', 'Sentença - Decisão'), val('origem', 'Sentença - ID') ? 'ID ' + val('origem', 'Sentença - ID') : ''].filter(Boolean).join(' · ')], ['Responsável', val('origem', 'Responsável')], ['Próxima ação', val('origem', 'Próxima ação')]]);
  return top + pend + '<div class="rs-grid"><div class="rs-stack">' + col('Triagem', 'Triagem', 'tri', tri) + col(CE, CE, 'ce', ce) + '</div><div class="rs-stack">' + col(mono ? 'Pauta' : 'Pauta', 'Pauta', 'jul', pau) + col('Processo', 'Processo', 'processo', pr) + '</div><div class="rs-stack">' + col('Produção · ' + (mono ? 'monocrática' : 'acórdão'), 'Produção', 'pro', pro) + '</div></div>';
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

/* ───── inteiro teor (.txt do PJe): painel lateral, leitura por padrao/inteiro-teor.js ───── */
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
function lerTxt(file) {
  var T = TX(); if (!T.parseTxt) return;
  if (!/\.txt$/i.test(file.name) && file.type && file.type !== 'text/plain') { ST.teor = { step: 0, err: 'Envie o arquivo .txt do inteiro teor exportado pelo PJe.' }; render(); return; }
  if (file.size > 25 * 1024 * 1024) { ST.teor = { step: 0, err: 'Arquivo muito grande para leitura no navegador (limite de 25 MB).' }; render(); return; }
  var rd = new FileReader();
  rd.onload = function () { var txt = String(rd.result || ''); try {
    var P = T.parseTxt(txt); txt = '';
    if (!P.docs.length) { ST.teor = { step: 0, err: 'Nenhum documento identificado no .txt (esperado o cabeçalho “Documento: ID - Tipo”).' }; render(); return; }
    T.preselect(P); try { P.kind = T.especie(P); T.preselectKind(P); } catch (e) { console.warn('[ficha] inteiro teor · espécie', e); }
    ST.teor = { step: 1, parsed: P, file: file.name, items: null }; render();
  } catch (e) { ST.teor = { step: 0, err: 'Não foi possível ler o .txt: ' + ((e && e.message) || e) }; render(); } };
  rd.onerror = function () { ST.teor = { step: 0, err: 'Falha na leitura do arquivo.' }; render(); };
  rd.readAsText(file, 'utf-8');
}
function teorPanel() {
  var D = ST.teor, P = D.parsed, T = TX(), steps = ['Arquivo', 'Documentos', 'Conferência'], body = '', foot = '';
  var head = '<header class="fx-teor-h"><div><span>Importar inteiro teor · .txt do PJe</span><h3>' + (P ? E(D.file) + ' · ' + P.docs.length + ' documentos' : 'Escolha o arquivo') + '</h3></div><button type="button" class="fx-sq" data-fx="teor-fechar" aria-label="Fechar importação" title="Fechar importação">' + svg('x') + '</button></header>' +
    '<ol class="fx-steps">' + steps.map(function (st, k) { return '<li class="' + (k < D.step ? 'is-done' : k === D.step ? 'is-cur' : '') + '">' + (k < D.step ? svg('ok') : '') + (k + 1) + ' · ' + st + '</li>'; }).join('') + '</ol>';
  if (D.step === 0) {
    body = '<label class="fx-drop"><input type="file" accept=".txt,text/plain" data-fx-file>' + svg('txt') + '<b>Arraste o .txt do PJe para a ficha</b><span>ou clique para escolher o arquivo</span></label>' + (D.err ? '<p class="fx-alert-p">' + E(D.err) + '</p>' : '') +
      '<p class="fx-help">Cada bloco “Documento: ID - tipo” do .txt vira uma linha, com o destino sugerido pelo tipo. Depois, os campos sugeridos são conferidos com os valores da ficha; só o que for marcado é gravado.</p>' +
      '<p class="fx-help">O .txt é lido só no navegador e não é guardado; ficam os campos confirmados, e o commit registra os IDs dos documentos.</p>';
    foot = '<button type="button" class="fx-b" data-fx="teor-fechar">Cancelar</button>';
  } else if (D.step === 1) {
    var outro = P.main && dg(ST.cnj) !== P.main, TG = T.TARGETS || [['', 'Não usar']];
    body = (outro ? '<p class="fx-alert-p">' + svg('warn') + '<span>O .txt é do processo <b>' + E(P.processo) + '</b>, diferente desta ficha (' + E(ST.cnj) + '). Confira antes de continuar.</span></p>' : '') +
      (P.kind && T.KIND_TXT ? '<p class="fx-info-p">' + E(T.KIND_TXT[P.kind] || '') + ': pré-seleção própria da espécie.</p>' : '') +
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
  if (ST.busy || ST.ad.leitura) return Promise.resolve(false);
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
  var t = ev.target.closest('[data-fx],[data-fx-tab],[data-fx-inc],[data-fx-ir],[data-fx-tba],[data-fx-tbx],[data-fx-confdest]'); if (!t) return;
  if (t.hasAttribute('data-fx-confdest')) { var dv = t.getAttribute('data-fx-confdest'); if (ST.edit) { ST.draft['producao.Destino'] = dv; render(); } else gravar({ 'producao.Destino': dv }, dv === 'Monocrática' ? 'Destino confirmado: decisão monocrática.' : dv === 'Sessão' ? 'Destino confirmado: sessão.' : 'Destino desfeito: volta a definir na triagem.').catch(function () {}); return; }
  if (t.hasAttribute('data-fx-tab')) { ST.tab = t.getAttribute('data-fx-tab'); render(); var m = host.querySelector('.fx-main'); if (m) m.scrollTop = 0; return; }
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
  if (a === 'teor') { if (ST.teor) fecharTeor(); else { ST.teor = { step: 0 }; render(); } return; }
  if (a === 'teor-fechar') return fecharTeor();
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
  if (t.hasAttribute('data-fx-destino')) { if (t.value === gravado('producao', 'Destino')) return; if (ST.edit) { ST.draft['producao.Destino'] = t.value; render(); } else gravar({ 'producao.Destino': t.value }, t.value === 'Monocrática' ? 'Destino: decisão monocrática.' : t.value === 'Sessão' ? 'Destino: sessão.' : 'Destino a definir na triagem.').catch(function () {}); return; }
  if (t.hasAttribute('data-fx-file')) { var f = t.files && t.files[0]; if (f) lerTxt(f); t.value = ''; return; }
  if (t.hasAttribute('data-fx-dest')) { ST.teor.parsed.docs[+t.getAttribute('data-fx-dest')].target = t.value; render(); return; }
  if (t.hasAttribute('data-fx-apply')) { ST.teor.items[+t.getAttribute('data-fx-apply')].apply = t.checked; render(); return; }
  if (t.hasAttribute('data-fx-val')) { onInput(ev); return; }
  if (t.hasAttribute('data-fx-k')) { onInput(ev); if (t.type === 'checkbox' || t.tagName === 'SELECT') render(); }
}
function onInput(ev) {
  var t = ev.target; if (!t.hasAttribute) return;
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

/* regras de gravação dos Controles especiais, iguais às do servidor (api/_ficha.js · aplica e regras): para quem grava direto na base (CMT-monitor) */
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
