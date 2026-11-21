/* Muta · peças dos autos digitais (painel esquerdo da página dos autos no PJe), na aba Triagem
   Lê a cronologia pelo conteudo-pje.js (só leitura: ID, tipo, descrição, data e movimentos de cada documento),
   separa as peças que importam para o julgamento e:
   - confere com as peças registradas na triagem (ID registrado que não está no painel; peça-chave do painel sem registro);
   - preenche o prontuário do processo (aba Prontuário) só nos campos vazios: decisão de origem, recursos e respostas,
     ID do parecer do MPF e "Outras peças". Nada do que já foi preenchido é trocado.
   As datas são as da cronologia do PJe (juntada); a data de assinatura da peça pode ser outra. */
(function () {
'use strict';
var br = window.MutaProntuarioBridge;
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function S(v) { return String(v == null ? '' : v).trim(); }
function iso(d) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
var A = { cnj: '', itens: null, n: 0, lendo: false, erro: '', em: 0, msg: '', abertos: {} };

/* categorias pelo tipo do documento no PJe: [chave, padrão, rótulo, grupo] */
var CAT = [
  ['sentenca', /^senten[çc]a/i, 'Sentença', 'Decisões'],
  ['acordao', /^ac[óo]rd[ãa]o/i, 'Acórdão', 'Decisões'],
  ['decisao', /^decis[ãa]o/i, 'Decisão', 'Decisões'],
  ['despacho', /^despacho/i, 'Despacho', 'Decisões'],
  ['adesivo', /adesiv/i, 'Recurso adesivo', 'Recursos'],
  ['apelacao', /^(apela[çc][ãa]o|recurso de apela|raz[õo]es de apela)/i, 'Apelação', 'Recursos'],
  ['ed', /^embargos de declara/i, 'Embargos de declaração', 'Recursos'],
  ['agravo', /^agravo/i, 'Agravo', 'Recursos'],
  ['recurso', /^recurso (especial|extraordin|ordin|inominado)/i, 'Recurso', 'Recursos'],
  ['contrarrazoes', /^(contrarraz|contra-raz|contraminuta|resposta ao recurso)/i, 'Contrarrazões', 'Recursos'],
  ['parecer', /^parecer|^manifesta[çc][ãa]o do (mp|minist)|^cota do mp/i, 'Parecer do MPF', 'MPF'],
  ['inicial', /^peti[çc][ãa]o inicial/i, 'Petição inicial', 'Petições'],
  ['contestacao', /^contesta[çc]/i, 'Contestação', 'Petições'],
  ['replica', /^r[ée]plica|^impugna[çc][ãa]o [àa] contesta/i, 'Réplica', 'Petições'],
  ['impugnacao', /^impugna[çc][ãa]o ao cumprimento/i, 'Impugnação ao cumprimento de sentença', 'Petições'],
  ['laudo', /^laudo/i, 'Laudo pericial', 'Provas e documentos'],
  ['procuracao', /^procura[çc]|substabelecimento/i, 'Procuração', 'Provas e documentos'],
  ['custas', /custas|recolhimento|\bguia\b|\bgru\b|comprovante de pagamento/i, 'Custas e preparo', 'Provas e documentos'],
  ['transito', /tr[âa]nsito em julgado/i, 'Certidão de trânsito', 'Provas e documentos']
];
var GRUPOS = ['Decisões', 'Recursos', 'MPF', 'Petições', 'Provas e documentos'];
var CHAVE = { sentenca: 1, acordao: 1, decisao: 1, apelacao: 1, adesivo: 1, ed: 1, agravo: 1, recurso: 1, contrarrazoes: 1, parecer: 1 };
function categoria(d) {
  for (var i = 0; i < CAT.length; i++) if (CAT[i][1].test(d.tipo)) return { k: CAT[i][0], rot: CAT[i][2], g: CAT[i][3] };
  return null;
}
/* peças relevantes, da mais antiga para a mais recente */
function pecas() {
  var out = [];
  (A.itens || []).forEach(function (it) {
    it.docs.forEach(function (d, j) {
      var c = categoria(d);
      if (c) out.push({ id: d.id, tipo: d.tipo, desc: d.desc, origem: d.origem, data: it.data, hora: it.hora, k: c.k, rot: c.rot, g: c.g, anexo: j > 0, movs: it.movs });
    });
  });
  return out.reverse();
}
function todosIds() { var o = {}; (A.itens || []).forEach(function (it) { it.docs.forEach(function (d) { o[d.id] = d; }); }); return o; }

/* ---------- leitura ---------- */
function ler() {
  if (!window.MutaPje || !window.MutaPje.lerAutos) return Promise.resolve();
  A.lendo = true; A.erro = ''; A.msg = ''; redesenhar();
  return window.MutaPje.lerAutos().then(function (r) {
    A.lendo = false; A.itens = r.itens; A.n = r.docs; A.cnj = r.numero || ''; A.em = Date.now(); redesenhar();
  }, function (e) { A.lendo = false; A.erro = e.message; redesenhar(); });
}
function redesenhar() { if (window.MutaTriagem && window.MutaTriagem.render) window.MutaTriagem.render(); }

/* ---------- conferência com o registro da triagem ---------- */
function conferencia(registradas) {
  if (!A.itens) return '';
  var ids = todosIds(), reg = (registradas || []).filter(function (p) { return /^\d{6,12}$/.test(S(p.id)); });
  var faltam = reg.filter(function (p) { return !ids[S(p.id)]; });
  var regIds = {}; reg.forEach(function (p) { regIds[S(p.id)] = 1; });
  var semReg = pecas().filter(function (p) { return CHAVE[p.k] && !p.anexo && !regIds[p.id] && p.k !== 'despacho'; });
  if (!reg.length && !semReg.length) return '';
  var h = '<div class="au-cf">';
  if (reg.length) h += faltam.length
    ? '<p class="status err">' + faltam.length + ' ID(s) registrado(s) na triagem não aparece(m) no painel dos autos: ' + faltam.map(function (p) { return '<b>' + esc(p.id) + '</b> (' + esc(p.peca) + ')'; }).join(', ') + ' [VALIDAR].</p>'
    : '<p class="status ok">Os ' + reg.length + ' IDs registrados na triagem estão no painel dos autos.</p>';
  if (semReg.length) h += '<p class="muted">Peças-chave do painel sem registro na triagem: ' + semReg.map(function (p) { return esc(p.rot) + ' <span class="mono">' + esc(p.id) + '</span> (' + esc(p.data) + ')'; }).join('; ') + '.</p>';
  return h + '</div>';
}

/* ---------- preenchimento do prontuário (só campos vazios) ---------- */
function vazio(v) { return !S(v); }
function preencher() {
  var cnj = A.cnj, k = br.chaveAtual();
  if (!A.itens) { A.msg = 'Leia o painel dos autos primeiro.'; redesenhar(); return; }
  if (!cnj || Muta.chaveProcesso(cnj) !== k) { A.msg = 'O prontuário aberto no painel não é o dos autos lidos (' + (cnj || 'sem número') + ').'; redesenhar(); return; }
  if (window.MutaProntuarioFull && window.MutaProntuarioFull.flush) window.MutaProntuarioFull.flush();
  var f = JSON.parse(JSON.stringify(br.getFull())), P = pecas(), feitos = [];
  f.recursos = f.recursos || []; f.pecas = f.pecas || [];
  var usados = {};
  JSON.stringify([f.origem, f.regularidade, f.recursos, f.pecas, f.recursoTipo]).replace(/\d{6,12}/g, function (x) { usados[x] = 1; return x; });

  /* decisão de origem: a última sentença (ou decisão) anterior ao primeiro recurso; sem recurso, a última */
  var rec1 = P.filter(function (p) { return /^(apelacao|adesivo|agravo|recurso)$/.test(p.k); })[0];
  var antes = P.filter(function (p) { return !rec1 || P.indexOf(p) < P.indexOf(rec1); });
  var dec = antes.filter(function (p) { return p.k === 'sentenca'; }).pop() || antes.filter(function (p) { return p.k === 'decisao'; }).pop();
  if (dec && vazio(f.origem.decisaoId) && !usados[dec.id]) {
    if (vazio(f.origem.decisao)) f.origem.decisao = dec.k === 'sentenca' ? 'Sentença' : 'Decisão interlocutória';
    f.origem.decisaoId = dec.id; if (vazio(f.origem.decisaoData)) f.origem.decisaoData = iso(dec.data);
    usados[dec.id] = 1; feitos.push('decisão de origem: ' + dec.rot + ' ID ' + dec.id);
  }
  /* recursos: apelações, adesivos, agravos, embargos de declaração (uma linha por recurso) */
  var ESP = { apelacao: 'Apelação', adesivo: 'Apelação adesiva', agravo: 'Agravo de instrumento', ed: 'Embargos de declaração', recurso: 'Outro' };
  /* embargos de declaração só contam como recurso depois de um acórdão (os da origem vão para "Outras peças") */
  var ultAc = -1; P.forEach(function (p, i) { if (p.k === 'acordao') ultAc = i; });
  P.filter(function (p, i) { return ESP[p.k] && !p.anexo && (p.k !== 'ed' || (ultAc >= 0 && i > ultAc)); }).forEach(function (p) {
    if (usados[p.id]) return;
    var esp = p.k === 'agravo' && /interno/i.test(p.tipo) ? 'Agravo interno' : ESP[p.k];
    var alvo = f.recursos.filter(function (r) { return vazio(r.ids) && !r.semId && (vazio(r.especie) || r.especie === esp); })[0];
    if (!alvo) { alvo = { especie: '', parte: '', parteCustom: '', data: '', ids: '', semId: false, contra: { situacao: '', data: '', ids: '', semId: false } }; f.recursos.push(alvo); }
    if (vazio(alvo.especie)) alvo.especie = esp;
    alvo.ids = p.id; if (vazio(alvo.data)) alvo.data = iso(p.data);
    usados[p.id] = 1; feitos.push(esp + ' ID ' + p.id);
  });
  /* respostas: cada contrarrazão vai para o primeiro recurso com ID e sem resposta registrada */
  P.filter(function (p) { return p.k === 'contrarrazoes' && !p.anexo; }).forEach(function (p) {
    if (usados[p.id]) return;
    var alvo = f.recursos.filter(function (r) { return !vazio(r.ids) && r.contra && vazio(r.contra.ids) && !r.contra.semId; })[0];
    if (!alvo) return;
    if (vazio(alvo.contra.situacao)) alvo.contra.situacao = 'apresentadas';
    alvo.contra.ids = p.id; if (vazio(alvo.contra.data)) alvo.contra.data = iso(p.data);
    usados[p.id] = 1; feitos.push('contrarrazões ID ' + p.id);
  });
  /* parecer do MPF: o mais recente */
  var par = P.filter(function (p) { return p.k === 'parecer'; }).pop();
  if (par && vazio(f.regularidade.mpfId) && !usados[par.id]) {
    f.regularidade.mpfId = par.id;
    if (vazio(f.regularidade.mpfInfo)) f.regularidade.mpfInfo = par.tipo + (par.desc ? ' (' + par.desc + ')' : '') + ', juntado em ' + par.data + ' [conferir o sentido].';
    usados[par.id] = 1; feitos.push('parecer do MPF ID ' + par.id);
  }
  /* outras peças: petição inicial, contestação, réplica, impugnação, laudo, procuração, custas, acórdão, trânsito,
     decisões e despachos que não entraram acima (sem os anexos) */
  P.filter(function (p) { return !p.anexo && /^(inicial|contestacao|replica|impugnacao|laudo|procuracao|custas|acordao|transito|decisao|sentenca|ed)$/.test(p.k); }).forEach(function (p) {
    if (usados[p.id] || f.pecas.length >= 100) return;
    f.pecas.push({ tipo: p.rot, id: p.id, data: iso(p.data), descricao: S(p.tipo + (p.desc ? ' (' + p.desc + ')' : '')) });
    usados[p.id] = 1; feitos.push(p.rot + ' ID ' + p.id);
  });
  if (!feitos.length) { A.msg = 'Nada a preencher: os campos do prontuário já têm essas peças.'; redesenhar(); return; }
  br.saveFull(f);
  if (window.MutaProntuarioFull && window.MutaProntuarioFull.setState) window.MutaProntuarioFull.setState(f);
  A.msg = 'Prontuário preenchido (' + feitos.length + '): ' + feitos.join('; ') + '. Confira na aba Prontuário.';
  redesenhar();
}

/* ---------- desenho (dentro da aba Triagem) ---------- */
function html(cnjTriagem, registradas) {
  var h = '<section class="card tr-b au"><p class="kicker">Peças dos autos digitais <small class="muted">painel esquerdo do PJe</small></p>';
  var bar = '<div class="bar"><button type="button" class="btn ' + (A.itens ? 'line' : 'solid') + '" data-au="ler"' + (A.lendo ? ' disabled' : '') + '>' + (A.lendo ? 'Lendo…' : A.itens ? 'Ler de novo' : 'Ler o painel dos autos') + '</button>' +
    (A.itens ? '<button type="button" class="btn solid" data-au="preencher" title="Só preenche campos vazios do prontuário; nada é trocado">Preencher o prontuário</button>' : '') + '</div>';
  if (A.erro) return h + bar + '<p class="status err">' + esc(A.erro) + '</p></section>';
  if (!A.itens) return h + '<p class="muted">Abra os autos digitais do processo no PJe: a extensão lê a cronologia (documentos, IDs e datas) para conferir a triagem e preencher as peças do prontuário.</p>' + bar + '</section>';
  var outro = A.cnj && cnjTriagem && A.cnj !== cnjTriagem ? '<p class="status err">Os autos lidos são do processo ' + esc(A.cnj) + ', não do ' + esc(cnjTriagem) + '.</p>' : '';
  var P = pecas();
  h += '<p class="muted">' + A.n + ' documento(s) na cronologia · ' + P.length + ' peça(s) relevante(s)' + (A.em ? ' · lido às ' + new Date(A.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '') + '. As datas são as da juntada no PJe.</p>' + outro + bar +
    (A.msg ? '<p class="status ' + (/^(Nada|Leia|O prontuário aberto)/.test(A.msg) ? 'err' : 'ok') + '">' + esc(A.msg) + '</p>' : '') + (outro ? '' : conferencia(registradas));
  var porG = {}; P.forEach(function (p) { (porG[p.g] = porG[p.g] || []).push(p); });
  h += '<div class="au-lista">' + GRUPOS.filter(function (g) { return porG[g]; }).map(function (g) {
    var L = porG[g].slice().reverse(); /* mais recente primeiro, como no PJe */
    return '<h4 class="tr-g">' + esc(g) + ' <small class="muted">' + L.length + '</small></h4>' + L.map(function (p) {
      return '<div class="au-it' + (p.anexo ? ' anx' : '') + (CHAVE[p.k] ? ' ch' : '') + '"><span class="au-d">' + esc(p.data) + '</span><b>' + esc(p.tipo) + '</b>' +
        ' <button type="button" class="mono lnk" data-copia="' + esc(p.id) + '" title="Copiar o ID">ID ' + esc(p.id) + '</button>' +
        (p.desc ? '<div class="muted au-ds">' + esc(p.desc) + '</div>' : '') + '</div>';
    }).join('');
  }).join('') + '</div>';
  return h + '</section>';
}
function clique(b) {
  var a = b.dataset.au;
  if (a === 'ler') ler();
  else if (a === 'preencher') preencher();
}
window.MutaAutos = { ler: ler, html: html, clique: clique, pecas: pecas, estado: function () { return A; } };
})();
