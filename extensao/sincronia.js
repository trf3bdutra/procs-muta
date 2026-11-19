/* Muta · prontuário ligado ao GitHub do gabinete
   O prontuário completo de cada processo é guardado em acervo/prontuarios/<20 dígitos>.json (procs-muta) e se alimenta,
   nos dois sentidos, da ficha do processo (acervo/operacional.json) e do cartão da pauta (acervo/sessoes/*.json, o
   prontuário da Ex Officio e da LIA):
     GET  /api/pauta?prontuario=<CNJ>        prontuário gravado e cartões das pautas de hoje em diante
     GET  /api/pauta?ficha=<CNJ>             ficha (registro do operacional), fonte e perfil (gestor)
     POST /api/pauta?prontuario=1            { cnj, prontuario, base, campos (ficha), cartao } — um só commit
   Regras:
   - ao abrir um processo: vale o prontuário do GitHub; alterações locais ainda não enviadas se juntam a ele campo a campo
     (o que você mudou desde a última sincronia prevalece);
   - depois, a ficha e o cartão preenchem o que estiver vazio e, se foram alterados depois do prontuário, substituem
     o valor divergente (a equipe alterou no Ex Officio, na pauta ou pela LIA);
   - cada alteração no prontuário vai ao GitHub alguns segundos depois, com os campos correspondentes da ficha e do
     cartão; uma cópia fica neste navegador para trabalhar sem conexão (sincroniza quando voltar). */
(function () {
'use strict';
var ses = window.MutaSessao, br = window.MutaProntuarioBridge, MP = window.MutaMapa;
var META = 'muta-pje:sinc:', ESPERA = 8000;
var $ = function (id) { return document.getElementById(id); };
function S_(v) { return String(v == null ? '' : v).trim(); }
function dg(v) { return String(v || '').replace(/\D/g, ''); }
function clone(o) { return JSON.parse(JSON.stringify(o == null ? null : o)); }
function hora(iso) { try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

var S = { chave: '', cnj: '', base: '', snap: null, pend: false, lido: false, op: null, fonte: null, gestor: false, cartoes: [],
  por: '', em: '', t: null, voo: null, tentativas: 0, estado: 'off', msg: '' };

/* ---------- memória local por processo: base lida, cópia da última sincronia e se há alterações a enviar ---------- */
function lerMeta(k) { try { return JSON.parse(localStorage.getItem(META + k) || 'null') || {}; } catch (e) { return {}; } }
function gravarMeta() {
  if (!S.chave) return;
  try { localStorage.setItem(META + S.chave, JSON.stringify({ base: S.base, pend: S.pend, snap: S.snap, em: Date.now() })); }
  catch (e) { podar(); try { localStorage.setItem(META + S.chave, JSON.stringify({ base: S.base, pend: S.pend, snap: null, em: Date.now() })); } catch (x) {} }
}
/* guarda a cópia de sincronia só dos 40 processos mais recentes */
function podar() {
  try {
    var ks = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(META) === 0) ks.push(k); }
    ks.map(function (k) { var m = {}; try { m = JSON.parse(localStorage.getItem(k)) || {}; } catch (e) {} return { k: k, em: m.em || 0, pend: m.pend }; })
      .sort(function (a, b) { return b.em - a.em; }).slice(40).forEach(function (x) { if (!x.pend) localStorage.removeItem(x.k); });
  } catch (e) {}
}

/* ---------- o que conta como alteração (fora a posição da tela e o carimbo local) ---------- */
function essencial(st) {
  var o = clone(st) || {};
  delete o.atualizadoEm; delete o.etapa;
  if (o.full) { delete o.full.modo; delete o.full.etapa; delete o.full.guiado; }
  return o;
}
function igual(a, b) { return JSON.stringify(essencial(a)) === JSON.stringify(essencial(b)); }

/* ---------- junção campo a campo (três vias): o que mudou aqui desde a base prevalece sobre o servidor ---------- */
function folhas(o, pre, out) {
  out = out || {};
  if (o && typeof o === 'object' && !Array.isArray(o)) Object.keys(o).forEach(function (k) { folhas(o[k], pre ? pre + '.' + k : k, out); });
  else out[pre] = JSON.stringify(o === undefined ? null : o);
  return out;
}
function poe(o, p, v) { var a = p.split('.'), x = o; for (var i = 0; i < a.length - 1; i++) { if (!x[a[i]] || typeof x[a[i]] !== 'object') x[a[i]] = {}; x = x[a[i]]; } x[a[a.length - 1]] = v; }
function mesclar(base, local, remoto) {
  var B = folhas(essencial(base || {})), Lc = folhas(essencial(local)), out = clone(remoto), n = 0;
  Object.keys(Lc).forEach(function (p) { if (Lc[p] !== (B[p] === undefined ? 'null' : B[p]) && p) { poe(out, p, JSON.parse(Lc[p])); n++; } });
  return { obj: out, n: n };
}

/* ---------- prontuário ↔ cartão da pauta (o que não passa pela ficha) ---------- */
function dmy(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(S_(v)); return m ? m[3] + '/' + m[2] + '/' + m[1] : S_(v); }
function iso(v) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(S_(v)); return m ? m[3] + '-' + m[2] + '-' + m[1] : S_(v); }
var CART = [
  ['orig.tipo', 'origem.decisao'], ['orig.id', 'origem.decisaoId'], ['orig.data', 'origem.decisaoData', 'data'],
  ['orig.juizo', 'origem.juizo'], ['orig.julgador', 'origem.julgador'],
  ['orig.acc.custas', 'origem.custas', 'bool'], ['orig.acc.honor', 'origem.honorarios', 'bool'], ['orig.acc.tutela', 'origem.tutela', 'bool'], ['orig.acc.valor', 'origem.valor', 'bool'],
  ['adm.dpu', 'regularidade.dpu', 'bool'], ['adm.ajg', 'regularidade.ajg', 'bool'],
  ['questoes', 'producao.questoes'],
  ['jul.topico', 'julgamento.topico'], ['jul.coment', 'julgamento.comentario'], ['jul.remessa', 'julgamento.remessa', 'bool'], ['jul.multa', 'julgamento.multa'],
  ['ed.id', 'recursoTipo.edId'], ['ed.data', 'recursoTipo.edData', 'data'], ['ed.ponto', 'recursoTipo.edPonto'], ['ed.vicio', 'recursoTipo.edVicios'],
  ['agint.id', 'recursoTipo.agintId'], ['agint.data', 'recursoTipo.agintData', 'data'], ['agint.sintese', 'recursoTipo.agintSintese'], ['agint.fund', 'recursoTipo.agintFundamentos'],
  ['jr.id', 'recursoTipo.jrId'], ['jr.data', 'recursoTipo.jrData', 'data'], ['jr.tema', 'recursoTipo.jrPrecedente'], ['jr.trib', 'recursoTipo.jrTribunal'], ['jr.ed', 'recursoTipo.jrEd'], ['jr.questao', 'recursoTipo.jrQuestao'],
  ['ai.id', 'recursoTipo.aiId'], ['ai.data', 'recursoTipo.aiData', 'data'], ['ai.efeito', 'recursoTipo.aiEfeito'],
  ['rem.proveito', 'recursoTipo.rnValor']
];
function g(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
function vazio(v) { return v == null || v === '' || v === false || (Array.isArray(v) && !v.length); }
function deCartao(tipo, v) { if (tipo === 'bool') return v === true || /^(sim|true)$/i.test(S_(v)); if (tipo === 'data') return iso(v); return typeof v === 'string' ? v : (v == null ? '' : String(v)); }
function paraCartao(tipo, v) { if (tipo === 'bool') return v === true; if (tipo === 'data') return dmy(v); return S_(v); }
function pecasDe(c) { return (Array.isArray(c) ? c : []).map(function (p) { return { tipo: '', id: S_(p.id), data: iso(p.data), descricao: S_(p.desc || p.descricao) }; }); }
function pecasPara(L) { return (L || []).filter(function (p) { return S_(p.id) || S_(p.descricao) || S_(p.tipo); }).map(function (p) { return { desc: S_(p.descricao) || S_(p.tipo), id: S_(p.id), data: S_(p.data) }; }); }
function chavePeca(p) { return S_(p.id) || (S_(p.desc || p.descricao) + '|' + S_(p.data)); }
function recursosDe(c) { return (Array.isArray(c) ? c : []).map(function (r) { return { especie: S_(r.tipo), parte: S_(r.parte), parteCustom: '', data: '', ids: S_(r.id), semId: false, contra: { situacao: S_(r.contra), data: '', ids: '', semId: false } }; }); }
function recursosPara(L) { return (L || []).filter(function (r) { return S_(r.especie) || S_(r.ids); }).map(function (r) { return { parte: S_(r.parte === 'Outra' ? r.parteCustom || r.parte : r.parte), tipo: S_(r.especie), contra: S_(r.contra && r.contra.situacao), id: S_(r.ids) }; }); }

/* cartão → prontuário: preenche o vazio; se o cartão foi editado depois do prontuário, substitui o divergente */
function trazerCartao(full, c, substituir) {
  var n = [];
  if (!c) return n;
  CART.forEach(function (e) {
    var cv = g(c, e[0]); if (vazio(cv)) return;
    var lv = deCartao(e[2], cv), atual = g(full, e[1]);
    if (JSON.stringify(atual) === JSON.stringify(lv)) return;
    if (!vazio(atual) && !substituir) return;
    poe(full, e[1], lv); n.push(e[1]);
  });
  if (Array.isArray(c.pecas) && c.pecas.length) {
    var ja = {}; (full.pecas || []).forEach(function (p) { ja[chavePeca(p)] = 1; });
    var novas = pecasDe(c.pecas).filter(function (p) { return !ja[chavePeca(p)]; });
    if (novas.length) { full.pecas = (full.pecas || []).concat(novas).slice(0, 100); n.push('pecas'); }
  }
  if (Array.isArray(c.recursos) && c.recursos.length && !(full.recursos || []).length) { full.recursos = recursosDe(c.recursos); n.push('recursos'); }
  if (!full.caso.tipoManual && c.tipoJ) {
    var k = { 'Embargos de Declaração': 'ed', 'Agravo Interno': 'agint', 'Juízo de Retratação': 'jr', 'Agravo de Instrumento': 'ai', 'Remessa Necessária': 'rn' }[c.tipoJ];
    if (k) { full.caso.tipoManual = k; n.push('caso.tipoManual'); }
  }
  return n;
}
/* prontuário → cartão: só valores preenchidos e diferentes; peças se somam às do cartão; recursos só se o cartão não tem */
function patchCartao(full, c) {
  var p = {}; c = c || {};
  CART.forEach(function (e) {
    var lv = g(full, e[1]); if (vazio(lv)) return;
    var cv = paraCartao(e[2], lv);
    if (JSON.stringify(g(c, e[0])) === JSON.stringify(cv)) return;
    poe(p, e[0], cv);
  });
  var minhas = pecasPara(full.pecas);
  if (minhas.length) {
    var atuais = Array.isArray(c.pecas) ? c.pecas : [], ja = {};
    atuais.forEach(function (x) { ja[chavePeca(x)] = 1; });
    var mais = minhas.filter(function (x) { return !ja[chavePeca(x)]; });
    if (mais.length) p.pecas = atuais.concat(mais).slice(0, 100);
  }
  var recs = recursosPara(full.recursos);
  if (recs.length && !(Array.isArray(c.recursos) && c.recursos.length)) p.recursos = recs;
  return p;
}

/* ---------- situação na tela ---------- */
function status(estado, msg) {
  S.estado = estado; S.msg = msg;
  var b = $('sinc'), t = $('sinc-txt');
  if (!b || !t) return;
  b.dataset.estado = estado; t.textContent = msg;
  var bt = $('sinc-agora'); if (bt) bt.hidden = !(estado === 'pend' || estado === 'erro' || estado === 'ok');
}
function resumoOk() {
  return 'Sincronizado com o GitHub' + (S.em ? ' · última gravação ' + hora(S.em) + (S.por ? ' por ' + S.por : '') : '') +
    (S.cartoes.length ? ' · pauta de ' + S.cartoes.map(function (c) { return dmy(c.sessao) + (c.item ? ', item ' + c.item : ''); }).join('; ') : '') + '.';
}

/* ---------- leitura ao abrir o processo ---------- */
function abrir(chave) {
  var cnj = chave && chave !== 'avulso' ? Muta.formatarCnj(chave) : '';
  if (S.chave && S.chave !== chave && S.pend && S.lido) enviar(true);
  clearTimeout(S.t);
  var m = chave ? lerMeta(chave) : {};
  S = { chave: chave || '', cnj: cnj, base: m.base || '', snap: m.snap || null, pend: !!m.pend, lido: false, op: null, fonte: null, gestor: false, cartoes: [],
    por: '', em: '', t: null, voo: null, tentativas: 0, estado: 'off', msg: '' };
  if (!cnj) { status('off', 'Prontuário avulso: fica só neste navegador até receber o número do processo.'); return; }
  if (ses.estado().estado !== 'on') { status('off', 'Entre no Ex Officio (Ficha do gabinete) para ligar este prontuário ao GitHub. Enquanto isso, ele fica neste navegador.'); return; }
  status('carregando', 'Lendo o prontuário, a ficha e o cartão de ' + cnj + ' no GitHub…');
  var alvo = chave;
  Promise.all([ses.api('/api/pauta?prontuario=' + encodeURIComponent(cnj)), ses.api('/api/pauta?ficha=' + encodeURIComponent(cnj)).catch(function () { return {}; })]).then(function (r) {
    if (S.chave !== alvo) return;
    var P = r[0] || {}, Fi = r[1] || {};
    S.op = Fi.operacional || null; S.fonte = Fi.fonte || null; S.gestor = !!Fi.gestor; S.cartoes = P.cartoes || [];
    S.por = P.atualizadoPor || ''; S.em = P.atualizadoEm || '';
    if (window.MutaProntuarioFull && window.MutaProntuarioFull.flush) window.MutaProntuarioFull.flush();
    var local = br.estado(), remoto = P.prontuario, novo, juntou = 0, localVazio = vazioPront(local);
    if (remoto) {
      var rem; try { rem = br.sanitizar(remoto); } catch (e) { rem = null; }
      if (!rem) novo = local;
      else if (S.pend && S.lido === false && (P.atualizadoEm || '') !== S.base) { var mj = mesclar(S.snap, local, rem); novo = mj.obj; juntou = mj.n; }
      else if (S.pend) novo = local;
      else novo = rem;
      S.snap = rem ? essencial(rem) : null;
    } else {
      novo = local; S.snap = null;
      if (!localVazio) S.pend = true;   /* primeiro envio: o rascunho deste navegador vai para o GitHub */
    }
    S.base = P.atualizadoEm || '';
    /* ficha e cartão alimentam o prontuário */
    var full = (br.sanitizar(novo) || {}).full || novo.full;
    var fichaEm = S_(((S.op || {}).origem || {}).atualizado_em), c0 = S.cartoes[0] || null;
    var nF = MP.trazerFicha(full, S.op, S.fonte, !!(fichaEm && S.em && fichaEm > S.em));
    var nC = trazerCartao(full, c0 && c0.cartao, !!(c0 && c0.editadoEm && S.em && c0.editadoEm > S.em));
    novo.full = full;
    if (!igual(novo, local)) br.aplicarRemoto(alvo, novo);
    /* só abrir o processo não grava nada: o que veio da ficha e do cartão vai ao GitHub com a próxima alteração sua;
       grava já se havia alterações locais pendentes ou se o rascunho deste navegador ainda não estava no GitHub */
    S.pend = remoto ? (S.pend && !igual(novo, S.snap || {})) : !localVazio;
    S.lido = true; gravarMeta();
    var veio = nF.length + nC.length;
    if (S.pend) { status('pend', (juntou ? 'Suas alterações locais foram juntadas ao prontuário do GitHub. ' : '') + (veio ? veio + ' campo(s) vieram da ficha e do cartão. ' : '') + 'Enviando…'); agendar(1200); }
    else status('ok', resumoOk() + (veio ? ' ' + veio + ' campo(s) vieram da ficha e do cartão.' : ''));
  }).catch(function (e) {
    if (S.chave !== alvo) return;
    if (e && e.status === 401) status('off', 'Sessão do Ex Officio encerrada: entre de novo para sincronizar. O prontuário segue neste navegador.');
    else status('erro', 'Não foi possível ler o GitHub (' + ((e && e.message) || 'erro') + '). O prontuário segue neste navegador.');
  });
}
function vazioPront(st) {
  try { var b = br.sanitizar({ comum: {}, triagem: {}, producao: {}, full: { caso: { numero: (st.full || {}).caso ? st.full.caso.numero : '', classe: (st.full || {}).caso ? st.full.caso.classe : '' } } });
    return !(st.vinculos || []).length && JSON.stringify(essencial(b).full) === JSON.stringify(essencial(st).full); } catch (e) { return false; }
}

/* ---------- envio ---------- */
function agendar(ms) { clearTimeout(S.t); S.t = setTimeout(function () { enviar(false); }, ms == null ? ESPERA : ms); }
function enviar(saindo) {
  clearTimeout(S.t);
  if (!S.cnj || !S.lido || !S.pend) return Promise.resolve();
  if (S.voo) { S.depois = true; return S.voo; }
  if (ses.estado().estado !== 'on') { status('off', 'Alterações guardadas neste navegador. Entre no Ex Officio para enviá-las ao GitHub.'); return Promise.resolve(); }
  var st = br.estado();
  if (Muta.chaveProcesso((st.full || {}).caso && st.full.caso.numero) && Muta.chaveProcesso(st.full.caso.numero) !== dg(S.cnj)) return Promise.resolve();
  if (S.snap && igual(st, S.snap)) { S.pend = false; gravarMeta(); status('ok', resumoOk()); return Promise.resolve(); }
  var corpo = { cnj: S.cnj, prontuario: essencialEnvio(st), base: S.base, campos: MP.camposFicha(st.full, S.op, S.gestor), cartao: S.cartoes.length ? patchCartao(st.full, S.cartoes[0].cartao) : {} };
  if (saindo) {
    try { fetch(Muta.SITE + '/api/pauta?prontuario=1', { method: 'POST', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }); } catch (e) {}
    return Promise.resolve();
  }
  var alvo = S.chave;
  status('enviando', 'Enviando o prontuário ao GitHub…');
  S.voo = ses.api('/api/pauta?prontuario=1', { method: 'POST', body: JSON.stringify(corpo) }).then(function (r) {
    if (S.chave !== alvo) return;
    S.voo = null; S.tentativas = 0;
    if (r.atualizadoEm) { S.base = r.atualizadoEm; S.em = r.atualizadoEm; S.por = r.atualizadoPor || S.por; }
    S.snap = essencial(corpo.prontuario);
    if (r.operacional) { S.op = r.operacional; if (window.MutaGabinete && window.MutaGabinete.registro) window.MutaGabinete.registro(S.cnj, r.operacional); }
    if (r.cartoes && r.cartoes.length) S.cartoes = r.cartoes;
    S.pend = !igual(br.estado(), S.snap); gravarMeta();
    var extra = [(r.ficha || []).length ? (r.ficha.length + ' campo(s) na ficha') : '', (r.cartao || []).length ? (r.cartao.length + ' no cartão da pauta') : ''].filter(Boolean).join(' e ');
    var rec = (r.recusados || []).length ? ' A ficha recusou: ' + r.recusados.map(function (k) { return k.slice(k.indexOf('.') + 1); }).join(', ') + ' (só o gestor designa).' : '';
    if (S.pend || S.depois) { S.depois = false; S.pend = true; agendar(); status('pend', 'Alterações a enviar…'); }
    else status('ok', resumoOk() + (extra ? ' Também gravado: ' + extra + '.' : '') + rec);
  }, function (e) {
    if (S.chave !== alvo) return;
    S.voo = null;
    if (e && e.status === 409 && e.dados && e.dados.conflito) {
      var rem = null; try { rem = br.sanitizar(e.dados.prontuario); } catch (x) {}
      if (rem && S.tentativas++ < 3) {
        var mj = mesclar(S.snap, br.estado(), rem);
        S.base = e.dados.atualizadoEm || ''; S.em = S.base; S.por = e.dados.atualizadoPor || ''; S.snap = essencial(rem);
        br.aplicarRemoto(alvo, mj.obj); S.pend = true; gravarMeta();
        status('pend', S.por + ' alterou este prontuário enquanto você editava. As versões foram juntadas campo a campo; enviando…');
        agendar(800); return;
      }
    }
    if (e && e.status === 401) { status('off', 'Sessão do Ex Officio encerrada: as alterações ficam neste navegador até você entrar de novo.'); return; }
    status('erro', 'Não foi possível gravar no GitHub (' + ((e && e.message) || 'erro') + '). As alterações ficam neste navegador; nova tentativa em 30 segundos.');
    agendar(30000);
  });
  return S.voo;
}
/* o que vai para o GitHub: o prontuário inteiro, sem o carimbo local */
function essencialEnvio(st) { var o = clone(st); delete o.atualizadoEm; return o; }

/* ---------- ligações ---------- */
document.addEventListener('muta:prontuario', function (e) { abrir(e.detail && e.detail.chave); });
ses.ouvir(function (s) { if (s.estado === 'on' && !S.lido) abrir(br.chaveAtual()); });
window.addEventListener('pagehide', function () { if (S.pend && S.lido) enviar(true); });
document.addEventListener('visibilitychange', function () { if (document.hidden && S.pend && S.lido) enviar(false); });
var bt = $('sinc-agora');
if (bt) bt.addEventListener('click', function () { if (S.lido && S.pend) enviar(false); else abrir(S.chave || br.chaveAtual()); });

window.MutaSincronia = {
  alterado: function (chave) {
    if (chave !== S.chave) return;
    S.pend = true; gravarMeta();
    if (!S.lido) return;
    status('pend', 'Alterações a enviar ao GitHub…'); agendar();
  },
  agora: function () { return enviar(false); },
  recarregar: function () { abrir(br.chaveAtual()); },
  situacao: function () { return { estado: S.estado, msg: S.msg, cnj: S.cnj, cartoes: S.cartoes, op: S.op, pend: S.pend }; },
  /* para testes: as funções puras */
  _mesclar: mesclar, _trazerCartao: trazerCartao, _patchCartao: patchCartao
};
setTimeout(function () { abrir(br.chaveAtual()); }, 0);
})();
