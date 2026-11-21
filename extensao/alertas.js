/* Muta 0.19 · prazos, alertas e etiquetas do gabinete no painel.
   - Sino na faixa do topo: alertas da última leitura da lista de tarefas do PJe (o serviço de fundo grava em storage.session).
   - Prazos: limites de dias para os avisos e liga/desliga de selos e notificações (storage.local 'muta-prazos').
   - Etiquetas do gabinete: catálogo compartilhado (padrao/etiquetas-gabinete.json, via /api/pauta?etiquetas=1); o gestor edita.
   Nada é gravado no PJe: as etiquetas são só copiadas. */
(function () {
  'use strict';
  var E = window.MutaEtiquetas, ses = window.MutaSessao;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var SVG = function (p, n) { return '<svg viewBox="0 0 24 24" width="' + (n || 14) + '" height="' + (n || 14) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var SINO = '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>';
  var A = { app: [], appEm: '', cheg: [], gestor0: false, itens: [], em: '', cfg: null, cat: null, gestor: false, catErro: '', ed: null, aba: 'al', res: {}, pedindo: {} };
  var temChrome = typeof chrome !== 'undefined' && chrome.storage;

  /* ---------- dados ---------- */
  function lerAlertas() {
    if (!temChrome || !chrome.storage.session) return Promise.resolve();
    return Promise.all([chrome.storage.session.get(['muta-alertas', 'muta-app']), chrome.storage.local.get(['muta-chegadas', 'muta-gestor'])]).then(function (v) {
      var o = v[0], a = o['muta-alertas'] || {}, ap = o['muta-app'] || {}; A.itens = a.itens || []; A.em = a.em || ''; A.app = ap.eventos || []; A.appEm = ap.em || '';
      var hoje = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
      A.gestor0 = !!v[1]['muta-gestor']; A.cheg = (v[1]['muta-chegadas'] || []).filter(function (x) { return new Date(Date.parse(x.em) - 4 * 3600e3).toISOString().slice(0, 10) === hoje; });
      sino(); if (aberto()) pintar();
    }).catch(function () {});
  }
  function lerCfg() {
    var base = Object.assign({}, E ? E.CFG : {});
    if (!temChrome) { A.cfg = base; return Promise.resolve(A.cfg); }
    return chrome.storage.local.get('muta-prazos').then(function (o) { A.cfg = Object.assign(base, o['muta-prazos'] || {}); return A.cfg; }).catch(function () { A.cfg = base; return base; });
  }
  function gravarCfg(c) {
    A.cfg = c;
    var p = temChrome ? chrome.storage.local.set({ 'muta-prazos': c }) : Promise.resolve();
    return p.then(avisarAbas, function () {});
  }
  function avisarAbas() {
    if (!temChrome) return;
    try { chrome.runtime.sendMessage({ tipo: 'muta-resumos-limpar' }).catch(function () {}); } catch (e) {}
    try { chrome.tabs.query({ url: 'https://frontend-pje.app.trf3.jus.br/*' }).then(function (ts) { ts.forEach(function (t) { chrome.tabs.sendMessage(t.id, { tipo: 'muta-selos-atualizar' }).catch(function () {}); }); }).catch(function () {}); } catch (e) {}
  }
  function lerCatalogo(forcar) {
    if (A.cat && !forcar) return Promise.resolve(A.cat);
    if (!ses || ses.estado().estado !== 'on') return Promise.resolve(null);
    return ses.api('/api/pauta?etiquetas=1').then(function (j) { A.cat = j.catalogo || { etiquetas: [] }; A.gestor = !!j.gestor; A.catErro = ''; return A.cat; })
      .catch(function (e) { A.catErro = e.message || 'Não foi possível ler o catálogo.'; return null; });
  }
  /* resumo de um processo (os mesmos campos dos selos da lista), para o passo Etiquetas do Roteiro */
  function chave(cnj) { return String(cnj || '').replace(/\D/g, ''); }
  function resumoJa(cnj, depois) {
    var k = chave(cnj); if (!k) return null;
    if (A.res[k]) return A.res[k];
    if (A.pedindo[k] || !ses || ses.estado().estado !== 'on') return null;
    A.pedindo[k] = 1;
    Promise.all([ses.api('/api/pauta?fichas=' + encodeURIComponent(cnj)), lerCatalogo()]).then(function (r) {
      var x = (r[0].resumos || {})[k] || {}; A.res[k] = { r: x }; delete A.pedindo[k]; if (depois) depois();
    }).catch(function (e) { A.res[k] = { erro: e.message || 'falhou' }; delete A.pedindo[k]; if (depois) depois(); });
    return null;
  }
  function esquecer(cnj) { delete A.res[chave(cnj)]; }
  /* HTML do bloco "Etiquetas do gabinete" no passo Etiquetas do Roteiro */
  function htmlRoteiro(cnj, sugeridas, depois) {
    if (!E) return '';
    var x = resumoJa(cnj, depois);
    if (!x) return '<div class="etq-cat"><div class="etq-cat-h"><b>Regras do catálogo</b><small class="muted">conferindo as regras…</small></div></div>';
    if (x.erro) return '<div class="etq-cat"><div class="etq-cat-h"><b>Regras do catálogo</b><small class="muted">' + esc(x.erro) + '</small></div></div>';
    var cat = A.cat || { etiquetas: [] }, r = Object.assign({}, x.r);
    var dev = E.devidas(r, cat), jaPje = E.N(r.etqPje || ''), sug = E.N(sugeridas || '');
    if (!dev.length) return '<div class="etq-cat"><div class="etq-cat-h"><b>Regras do catálogo</b><small class="muted">nenhuma se aplica a este processo</small></div></div>';
    var falta = [];
    var chips = dev.map(function (e) {
      var n = E.N(e.nome), noPje = jaPje.indexOf(n) >= 0, naSug = sug.indexOf(n) >= 0;
      if (!noPje) falta.push(e.nome);
      var cor = /^#[0-9a-f]{3,8}$/i.test(e.cor || '') ? e.cor : '#6b7280';
      return '<span class="etq-c' + (noPje ? ' ok' : '') + '" style="--c:' + cor + '" title="' + esc((e.descricao || '') + (noPje ? ' · já está no PJe' : ' · falta no PJe')) + '"><i></i>' + esc(e.nome) +
        (noPje ? '<em>no PJe</em>' : naSug ? '<em>sugerida</em>' : '<button type="button" class="lnk" data-add="' + esc(e.nome) + '" title="Incluir nas sugeridas">+ sugerir</button>') + '</span>';
    }).join('');
    return '<div class="etq-cat"><div class="etq-cat-h"><b>Regras do catálogo</b>' + (falta.length ? '<button type="button" class="btn sm" data-copia="' + esc(falta.join('; ')) + '" title="Copiar as que faltam no PJe">Copiar ' + falta.length + '</button>' : '<small class="muted">todas já estão no PJe</small>') + '</div><div class="etq-cs">' + chips + '</div></div>';
  }

  /* ---------- sino ---------- */
  function vermelhos() { return A.itens.filter(function (i) { return (i.alertas || []).some(function (a) { return a.nivel === 'al'; }); }).length; }
  function sino() {
    var b = $('tu-sino'); if (!b) return;
    var nApp = appPend().length, n = vermelhos() + nApp, t = A.itens.length;
    b.querySelector('b').textContent = n ? String(n) : '';
    b.classList.toggle('al', !!vermelhos()); b.classList.toggle('ap', !vermelhos() && !!nApp);
    b.title = n ? n + ' processo' + (n > 1 ? 's' : '') + ' com alerta' + (n > 1 ? 's' : '') + ' na lista do PJe' : t ? t + ' processo' + (t > 1 ? 's' : '') + ' com aviso' : 'Alertas, prazos e etiquetas do gabinete';
  }
  function appPend() { return A.app.filter(function (e) { return !e.resolved && (e.nivel === 'urgente' || e.nivel === 'importante'); }); }
  function aberto() { var p = $('tu-pop'); return p && !p.hidden; }
  function abrir(s) {
    var p = $('tu-pop'); if (!p) return;
    p.hidden = !s; $('tu-sino').setAttribute('aria-expanded', s ? 'true' : 'false');
    if (s) { try { chrome.runtime.sendMessage({ tipo: 'muta-app-ler' }).catch(function () {}); } catch (e) {} Promise.all([lerAlertas(), lerCfg(), lerCatalogo()]).then(pintar); pintar(); }
  }
  function quando(iso) { if (!iso) return ''; var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function fmtCnj(k) { var d = String(k).replace(/\D/g, ''); return d.length === 20 ? d.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6') : k; }

  function pintar() {
    var p = $('tu-pop'); if (!p) return;
    var gst = A.gestor0 || (ses && ses.estado().gestor);
    var abas = [['al', 'PJe'], ['app', 'Gabinete']].concat(gst ? [['ch', 'Chegadas']] : []).concat([['pz', 'Prazos'], ['et', 'Etiquetas'], ['ver', 'Versão']]);
    if (A.aba === 'ch' && !gst) A.aba = 'al';
    var h = '<div class="ap-t" role="tablist">' + abas.map(function (a) { return '<button type="button" role="tab" class="ap-tab-' + a[0] + '" data-ap="' + a[0] + '" aria-selected="' + (A.aba === a[0]) + '">' + a[1] + (a[0] === 'al' && A.itens.length ? ' <i>' + A.itens.length + '</i>' : a[0] === 'app' && appPend().length ? ' <i>' + appPend().length + '</i>' : a[0] === 'ch' && A.cheg.length ? ' <i>' + A.cheg.length + '</i>' : '') + '</button>'; }).join('') +
      '<button type="button" class="ap-x" data-ap-x title="Fechar" aria-label="Fechar">×</button></div>';
    h += '<div class="ap-c">' + (A.aba === 'al' ? pAlertas() : A.aba === 'app' ? pApp() : A.aba === 'ch' ? pChegadas() : A.aba === 'pz' ? pPrazos() : A.aba === 'ver' ? pVersao() : pEtiquetas()) + '</div>';
    p.innerHTML = h;
  }
  function pAlertas() {
    if (!A.itens.length) return '<p class="muted ap-v">Nenhum alerta. Os alertas surgem quando a lista de tarefas do PJe é aberta com o HERO18810 ligado.</p>';
    var L = A.itens.slice().sort(function (a, b) { return al(b) - al(a); });
    return '<small class="muted ap-em">Leitura da lista em ' + esc(quando(A.em)) + ' · toque no número para copiar</small><ul class="ap-l">' + L.map(function (i) {
      return '<li class="org-pje"><div class="ap-h"><i class="ap-org pje">PJe</i><button type="button" class="ap-k" data-ap-cnj="' + esc(fmtCnj(i.k)) + '" title="Copiar o número">' + esc(fmtCnj(i.k)) + '</button><small>' + esc(i.etapa || '') + (i.servidor ? ' · ' + esc(i.servidor) : '') + '</small></div>' +
        '<div class="ap-as">' + (i.alertas || []).map(function (a) { return '<span class="ap-a ' + (a.nivel === 'al' ? 'al' : 'av') + '">' + esc(a.t) + '</span>'; }).join('') + '</div></li>';
    }).join('') + '</ul>';
    function al(i) { return (i.alertas || []).filter(function (a) { return a.nivel === 'al'; }).length; }
  }
  function pApp() {
    if (!A.app.length) return '<p class="muted ap-v">Sem avisos do app do gabinete' + (A.appEm ? '' : ' (entre no painel para recebê-los)') + '.</p>';
    return '<small class="muted ap-em">App do gabinete · ' + esc(quando(A.appEm)) + '</small><ul class="ap-l">' + A.app.slice(0, 40).map(function (e) {
      var pje = e.origem === 'pje';
      return '<li class="org-' + (pje ? 'pje' : 'app') + (e.resolved ? ' lido' : '') + '"><div class="ap-h"><i class="ap-org ' + (pje ? 'pje' : 'app') + '">' + (pje ? 'PJe' : 'App') + '</i><b class="ap-ti">' + esc(e.title || '') + '</b></div>' +
        '<div class="ap-ms">' + esc(e.message || '') + '</div><small class="muted">' + esc(quando(e.time)) + (e.user ? ' · ' + esc(e.user) : '') + (e.nivel && e.nivel !== 'info' ? ' · <span class="ap-nv ' + esc(e.nivel) + '">' + esc(e.nivel) + '</span>' : '') +
        (e.numero ? ' · <button type="button" class="ap-k" data-ap-cnj="' + esc(e.numero) + '">' + esc(e.numero) + '</button>' : '') + '</small></li>';
    }).join('') + '</ul><a class="lnk" target="_blank" rel="noopener" href="https://www.gabinete-cmt.com/exofficio/">Abrir o app</a>';
  }
  function pChegadas() {
    var U = A.cheg.filter(function (x) { return x.urg; });
    var lk = temChrome && chrome.runtime.getURL ? chrome.runtime.getURL('relatorio.html') : '#';
    return '<small class="muted ap-em">Hoje: ' + A.cheg.length + ' chegada' + (A.cheg.length === 1 ? '' : 's') + (U.length ? ' · ' + U.length + ' com urgência' : '') + ' · vistas na lista do PJe</small>' +
      (A.cheg.length ? '<ul class="ap-l">' + A.cheg.slice().sort(function (a, b) { return b.urg - a.urg; }).map(function (x) {
        return '<li class="org-pje"><div class="ap-h"><i class="ap-org pje">PJe</i><button type="button" class="ap-k" data-ap-cnj="' + esc(fmtCnj(x.k)) + '">' + esc(fmtCnj(x.k)) + '</button><small>' + esc(quando(x.em)) + '</small></div>' +
          '<div class="ap-as">' + (x.urg ? '<span class="ap-a al">⚡ ' + esc(x.motivos.join(', ')) + '</span>' : (x.motivos || []).length ? '<span class="ap-a av">' + esc(x.motivos.join(', ')) + '</span>' : '') + (x.tarefa ? '<span class="ap-a">' + esc(x.tarefa) + '</span>' : '') + '</div></li>';
      }).join('') + '</ul>' : '<p class="muted ap-v">Nenhuma chegada vista hoje. As chegadas são registradas quando a lista de tarefas do PJe é aberta com a extensão ligada.</p>') +
      '<a class="lnk" target="_blank" href="' + lk + '">Relatório completo do dia</a>';
  }
  function pPrazos() {
    var c = A.cfg || (E ? E.CFG : {});
    var num = function (k, r, d) { return '<label class="ap-f"><span>' + r + '</span><input type="number" min="1" max="999" data-pz="' + k + '" value="' + esc(c[k]) + '"><small>' + d + '</small></label>'; };
    var lig = function (k, r, d) { return '<label class="ap-f ap-s"><input type="checkbox" data-pz="' + k + '"' + (c[k] !== false ? ' checked' : '') + '><span>' + r + '</span><small>' + d + '</small></label>'; };
    return num('urgDias', 'Urgência não apreciada', 'dias até o alerta vermelho') +
      num('tarefaDias', 'Tempo na tarefa', 'dias até o aviso (vermelho no dobro)') +
      lig('selos', 'Selos na lista de tarefas do PJe', 'etapa, designação, alertas e etiquetas que faltam') +
      lig('avisos', 'Notificações do Chrome', 'só alertas vermelhos, uma vez por dia por processo') +
      lig('avisosApp', 'Avisos do app do gabinete', 'urgentes e importantes viram notificação (🏛, ícone azul)') +
      (A.gestor0 || (ses && ses.estado().gestor) ? lig('chegadas', 'Registrar chegadas (só gestor)', 'processos novos na lista do PJe; urgentes avisam na hora (⚡📥)') +
        lig('relatorio', 'Relatório de chegadas no fim do dia', 'notificação com o total do dia, que abre o relatório') +
        '<label class="ap-f"><span>Hora do relatório</span><input type="time" data-pz="relHora" value="' + esc(c.relHora || '18:00') + '"><small>todo dia, neste navegador</small></label>' : '') +
      '<small class="muted ap-v">Vale só neste navegador.</small>';
  }
  function pEtiquetas() {
    if (!ses || ses.estado().estado !== 'on') return '<p class="muted ap-v">Entre no painel para ver o catálogo.</p>';
    if (A.catErro) return '<p class="ap-v err">' + esc(A.catErro) + '</p>';
    if (!A.cat) return '<p class="muted ap-v">Carregando…</p>';
    var L = A.ed || A.cat.etiquetas || [];
    if (!A.ed) {
      return '<small class="muted ap-em">' + L.length + ' etiqueta' + (L.length === 1 ? '' : 's') + (A.cat.atualizadoPor ? ' · por ' + esc(A.cat.atualizadoPor) : '') + (A.cat.atualizadoEm ? ' em ' + esc(quando(A.cat.atualizadoEm)) : '') + '</small>' +
        '<ul class="ap-e">' + L.map(function (e) {
          return '<li><span class="etq-c" style="--c:' + esc(e.cor || '#6b7280') + '"><i></i>' + esc(e.nome) + '</span><small>' + esc(e.descricao || '') + '</small><code>' + esc(regra(e)) + '</code></li>';
        }).join('') + '</ul>' + (A.gestor ? '<button type="button" class="btn sm" data-ap-ed>Editar o catálogo</button>' : '<small class="muted ap-v">Só o gestor altera o catálogo.</small>');
    }
    var sel = function (L2, v, at) { return '<select ' + at + '>' + L2.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; };
    return '<div class="ap-ed">' + L.map(function (e, i) {
      return '<fieldset data-e="' + i + '"><div class="ap-er"><input type="color" data-ef="cor" value="' + esc(/^#[0-9a-f]{6}$/i.test(e.cor || '') ? e.cor : '#6b7280') + '" title="Cor"><input type="text" data-ef="nome" value="' + esc(e.nome) + '" placeholder="Nome como no PJe"><button type="button" class="sn-x" data-e-x="' + i + '" title="Excluir a etiqueta" aria-label="Excluir">×</button></div>' +
        '<input type="text" data-ef="descricao" value="' + esc(e.descricao || '') + '" placeholder="Para que serve">' +
        (e.quando || []).map(function (q, j) {
          return '<div class="ap-q" data-q="' + j + '">' + sel(E.CAMPOS, q.campo, 'data-qf="campo"') + sel(E.OPS, q.op, 'data-qf="op"') + (q.op === 'tem' || q.op === 'vazio' ? '' : '<input type="text" data-qf="valor" value="' + esc(q.valor == null ? '' : q.valor) + '">') + '<button type="button" class="sn-x" data-q-x="' + i + ':' + j + '" title="Excluir a condição" aria-label="Excluir">×</button></div>';
        }).join('') + ((e.quando || []).length < 6 ? '<button type="button" class="lnk" data-q-add="' + i + '">+ condição (todas devem valer)</button>' : '') + '</fieldset>';
    }).join('') + '<div class="ap-eb"><button type="button" class="lnk" data-e-add>+ etiqueta</button><span><button type="button" class="lnk" data-ap-cancelar>cancelar</button><button type="button" class="btn solid sm" data-ap-gravar>Gravar catálogo</button></span></div><small class="ap-msg" id="ap-msg"></small></div>';
  }
  function regra(e) {
    var C = {}, O = {}; (E ? E.CAMPOS : []).forEach(function (c) { C[c[0]] = c[1]; }); (E ? E.OPS : []).forEach(function (o) { O[o[0]] = o[1]; });
    return (e.quando || []).map(function (q) { return (C[q.campo] || q.campo) + ' ' + (O[q.op] || q.op) + (q.op === 'tem' || q.op === 'vazio' ? '' : ' "' + q.valor + '"'); }).join(' e ') || 'sem condição (não é sugerida)';
  }
  /* lê o formulário do editor para A.ed */
  function colher() {
    var p = $('tu-pop'); if (!p || !A.ed) return;
    Array.prototype.forEach.call(p.querySelectorAll('fieldset[data-e]'), function (f) {
      var e = A.ed[Number(f.dataset.e)]; if (!e) return;
      Array.prototype.forEach.call(f.querySelectorAll('[data-ef]'), function (i) { e[i.dataset.ef] = i.value; });
      Array.prototype.forEach.call(f.querySelectorAll('.ap-q'), function (d) { var q = e.quando[Number(d.dataset.q)]; if (!q) return; Array.prototype.forEach.call(d.querySelectorAll('[data-qf]'), function (i) { q[i.dataset.qf] = i.dataset.qf === 'valor' && q.op === 'maior' ? Number(i.value) || 0 : i.value; }); });
    });
  }

  /* ---------- eventos ---------- */
  function montar() {
    var t0 = $('topo-u'); if (!t0 || $('tu-sino')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'tu-sino'; b.className = 'tu-b tu-sino'; b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
    b.innerHTML = SVG(SINO, 14) + '<b></b>';
    var st = $('tu-st'); t0.insertBefore(b, st || null);
    var p = document.createElement('div'); p.id = 'tu-pop'; p.className = 'tu-pop'; p.hidden = true; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Alertas, prazos e etiquetas'); t0.appendChild(p);
    b.addEventListener('click', function (e) { e.stopPropagation(); abrir(!aberto()); });
    document.addEventListener('click', function (e) { if (aberto() && !p.contains(e.target) && e.target !== b && !A.ed) abrir(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && aberto() && !A.ed) abrir(false); });
    p.addEventListener('click', function (e) {
      e.stopPropagation(); /* o conteúdo é redesenhado no clique: o documento não deve tomá-lo por clique de fora */
      var x = e.target.closest('button'); if (!x) return;
      if (x.dataset.ap) { colher(); A.aba = x.dataset.ap; pintar(); return; }
      if (x.hasAttribute('data-ap-x')) { abrir(false); return; }
      if (x.dataset.apCnj) { try { navigator.clipboard.writeText(x.dataset.apCnj).then(function () { var o = x.textContent; x.textContent = 'Copiado'; setTimeout(function () { x.textContent = o; }, 1000); }); } catch (er) {} return; }
      if (x.hasAttribute('data-ap-ed')) { A.ed = JSON.parse(JSON.stringify(A.cat.etiquetas || [])); pintar(); return; }
      if (x.hasAttribute('data-ap-cancelar')) { A.ed = null; pintar(); return; }
      if (x.hasAttribute('data-e-add')) { colher(); A.ed.push({ nome: '', cor: '#6b7280', descricao: '', quando: [{ campo: 'urgPend', op: 'tem', valor: '' }] }); pintar(); return; }
      if (x.dataset.eX != null) { colher(); A.ed.splice(Number(x.dataset.eX), 1); pintar(); return; }
      if (x.dataset.qAdd != null) { colher(); var e1 = A.ed[Number(x.dataset.qAdd)]; (e1.quando = e1.quando || []).push({ campo: 'urgPend', op: 'tem', valor: '' }); pintar(); return; }
      if (x.dataset.qX) { colher(); var ij = x.dataset.qX.split(':'); A.ed[Number(ij[0])].quando.splice(Number(ij[1]), 1); pintar(); return; }
      if (x.hasAttribute('data-ap-gravar')) {
        colher();
        var L = A.ed.map(function (e) { return { nome: String(e.nome || '').trim(), cor: e.cor, descricao: String(e.descricao || '').trim(), quando: (e.quando || []).map(function (q) { var o = { campo: q.campo, op: q.op }; if (q.op !== 'tem' && q.op !== 'vazio') o.valor = q.valor; return o; }) }; });
        var m = $('ap-msg');
        if (L.some(function (e) { return !e.nome; })) { if (m) { m.textContent = 'Toda etiqueta precisa de nome.'; m.className = 'ap-msg err'; } return; }
        x.disabled = true; if (m) { m.textContent = 'Gravando…'; m.className = 'ap-msg'; }
        ses.api('/api/pauta?etiquetas=1', { method: 'POST', body: JSON.stringify({ etiquetas: L }) }).then(function (j) {
          A.cat = j.catalogo || Object.assign({}, A.cat, { etiquetas: L }); A.ed = null; A.res = {}; pintar(); avisarAbas();
          if (typeof window.MutaRender === 'function') window.MutaRender();
        }).catch(function (er) { x.disabled = false; if (m) { m.textContent = 'Não gravou: ' + (er.message || 'erro'); m.className = 'ap-msg err'; } });
        return;
      }
    });
    p.addEventListener('change', function (e) {
      var i = e.target;
      if (i.dataset.pz) { var c = Object.assign({}, A.cfg || {}); c[i.dataset.pz] = i.type === 'checkbox' ? i.checked : i.type === 'time' ? (i.value || '18:00') : Math.max(1, Number(i.value) || 1); gravarCfg(c); return; }
      if (i.dataset.qf === 'op') { colher(); pintar(); }
    });
    if (temChrome && chrome.storage.onChanged) chrome.storage.onChanged.addListener(function (ch, area) { if ((area === 'session' && (ch['muta-alertas'] || ch['muta-app'])) || (area === 'local' && ch['muta-chegadas'])) lerAlertas(); });
    lerAlertas(); lerCfg(); iniciarVersao();
    if (ses && ses.ouvir) ses.ouvir(function () { A.cat = null; A.res = {}; });
  }

  /* ---------- atualização sem chrome://extensions ----------
     - os arquivos da pasta mudaram (atualizar-muta.cmd, ou ZIP extraído por cima): o manifest em disco traz versão
       diferente da carregada → a extensão se recarrega sozinha;
     - o site publica versão mais nova (/extensao/versao.json) → aviso na faixa do topo com o caminho. */
  var VER = { local: '', site: '' };
  function cmpV(a, b) { a = String(a).split('.').map(Number); b = String(b).split('.').map(Number); for (var i = 0; i < 3; i++) { var d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; }
  function olharDisco() {
    if (!temChrome || !chrome.runtime || !chrome.runtime.getURL) return;
    fetch(chrome.runtime.getURL('manifest.json') + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (m) {
      if (m && m.version && m.version !== VER.local) { try { chrome.runtime.reload(); } catch (e) {} }
    }).catch(function () {});
  }
  function olharSite() {
    var site = window.Muta && window.Muta.SITE; if (!site) return;
    fetch(site + '/extensao/versao.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      VER.site = j && j.versao || ''; aviso();
    }).catch(function () {});
  }
  function aviso() {
    var t0 = $('topo-u'), b = $('tu-nova'); if (!t0) return;
    var nova = VER.site && VER.local && cmpV(VER.site, VER.local) > 0;
    if (!nova) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'tu-nova'; b.className = 'tu-nova'; t0.insertBefore(b, $('tu-sino') || $('tu-st') || null);
      b.addEventListener('click', function (e) { e.stopPropagation(); A.aba = 'ver'; abrir(true); }); }
    b.textContent = '↑ ' + VER.site; b.title = 'Versão nova do HERO18810 (' + VER.site + '; esta é ' + VER.local + '). Dê dois cliques em atualizar-muta.cmd, na pasta da extensão: o painel se recarrega sozinho.';
  }
  function pVersao() {
    return '<p class="ap-v">Instalada: <b>' + esc(VER.local) + '</b>' + (VER.site ? ' · no site: <b>' + esc(VER.site) + '</b>' : '') + '</p>' +
      (VER.site && cmpV(VER.site, VER.local) > 0 ? '<ol class="ap-ol"><li>Na pasta onde a extensão foi extraída, dê dois cliques em <b>atualizar-muta.cmd</b>.</li><li>Deixe este painel aberto: ele se recarrega sozinho em alguns segundos.</li><li>Recarregue a aba do PJe.</li></ol><small class="muted">Sem o arquivo (versões até 0.19.0): baixe o ZIP uma última vez e extraia sobre a mesma pasta.</small>' : '<small class="muted">Está em dia.</small>');
  }
  function iniciarVersao() {
    try { VER.local = chrome.runtime.getManifest().version; } catch (e) { return; }
    setInterval(olharDisco, 8000);
    olharSite(); setInterval(olharSite, 30 * 60e3);
  }

  window.MutaAlertas = { resumoJa: resumoJa, esquecer: esquecer, htmlRoteiro: htmlRoteiro, catalogo: lerCatalogo, montar: montar, _A: A };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
