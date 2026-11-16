/* Ab Initio · Regras gerais (diálogo comum da Triagem e das Pautas).
   Uso: <script src="/init/assets/js/regras-gerais.js"></script>
        CMTRegrasGerais.abrir({ motor: () => iframeDoMotor.contentWindow, pagina: 'triagem' | 'pautas', aba: 'escopo', aoGravarEscopo: (json) => {...} });
   Lê e grava pelo motor (ProcsMuta, CMTSessao). Edita o escopo da triagem (apoio/regras/escopo-triagem.json) e a equipe;
   o resto é a regra escrita, para consulta. A fonte do acervo nunca é gravada daqui. */
(function (W, D) {
  'use strict';
  if (W.CMTRegrasGerais) return;
  var ARQ_ESC = 'apoio/regras/escopo-triagem.json', ARQ_DES = 'apoio/regras/designacao.json';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nzT = function (t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s–—-]+/g, ' ').trim(); };
  var nf = function (n) { return Number(n || 0).toLocaleString('pt-BR'); };
  var GRUPOS = { pauta: 'já destinados à pauta', producao: 'já em produção de decisão', sobrestados: 'sobrestados', distribuicao: 'em análise da distribuição', secretaria: 'com a secretaria' };
  var DEST = [
    ['Retirado ou adiado: repautar', 'tarefa “[Sessão] Processos retirados e adiados” ou etiqueta de retirada ou adiamento'],
    ['Apto: pautar (colegiado)', 'etiqueta Apto / Apto para julgamento (não “inapto”) ou tarefa “Aptos para julgamento”, sem etiqueta de monocrática'],
    ['Apto: decisão do relator provável', 'apto, com etiqueta de monocrática ou destino “Monocrática” na ficha'],
    ['Embargos de declaração recebidos', 'tarefa “Recebidos com Embargos de Declaração”: sessão ou monocrática'],
    ['Retomada após o julgamento do tema', 'tarefa “Minutar ato judicial - Processo sobrestado”'],
    ['Agravo de instrumento antigo', 'agravo de instrumento distribuído antes do ano corrente: verificar perda de objeto'],
    ['Em “Minutar ato judicial”', 'a tarefa também recebe processos ainda não triados: conferir se já triado'],
    ['Voltou da unidade processante', 'tarefa “Recebidos da unidade processante”'],
    ['Indefinido: definir na triagem', '“Triagem de Gabinete” ou “Analisar tipo de decisão a proferir”'],
    ['Outros: conferir', 'o que não se encaixa acima']];
  var CAND = [
    ['Agravo de instrumento com risco de perda de objeto', 'autuado antes do ano corrente (CPC, art. 932, III)'],
    ['Remessa necessária sem apelação', 'classe Remessa Necessária ou etiqueta “apenas remessa” (CPC, art. 496, § 3º; Súmula 253/STJ)'],
    ['Embargos de declaração recebidos', 'tarefa “Recebidos com Embargos” ou classe ED (CPC, art. 1.024, § 2º)'],
    ['Já etiquetados como monocrática', 'etiqueta com “monocr…”'],
    ['Precedente qualificado indicado na etiqueta', 'etiqueta com tema, súmula, repetitivo ou IRDR (fora o Tema 1433/STJ) (CPC, art. 932, IV e V)'],
    ['Competência e prevenção', 'etiqueta de declínio, incompetência ou prevenção pendente'],
    ['Pedidos de competência do relator', 'efeito suspensivo à apelação, petição, tutela cautelar antecedente, restauração de autos']];
  var PEND = 'etiqueta de parecer do MPF (“ag. parecer”, “intimar MPF”), contrarrazões (“ag. contrarraz”), preparo (sem “custas ok”), “liminar pendente”, precedente (“aguardar novos precedentes”, “Tema 1433”) ou “não pautar”';
  var ST = null;

  var css = D.createElement('style');
  css.textContent =
    '.rg-veu{position:fixed;inset:0;background:rgba(23,63,61,.32);z-index:2147481000}' +
    '.rg{position:fixed;left:50%;top:4vh;transform:translateX(-50%);width:min(1080px,calc(100vw - 24px));height:92vh;display:grid;grid-template-columns:230px minmax(0,1fr);grid-template-rows:minmax(0,1fr);background:#fbfaf5;border:1px solid #c8c3b6;border-top:3px solid #173f3d;box-shadow:0 24px 60px rgba(23,63,61,.28);z-index:2147481001;font:14px/1.45 Figtree,system-ui,sans-serif;color:#203b39;border-radius:8px;overflow:hidden}' +
    '.rg nav{background:#f4f2ea;border-right:1px solid #d8d3c6;padding:14px 10px;overflow:auto;display:flex;flex-direction:column;gap:2px}' +
    '.rg nav p{margin:12px 8px 4px;font:500 10px "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:#805b18}.rg nav p:first-child{margin-top:0}' +
    '.rg nav button{border:0;background:transparent;text-align:left;padding:7px 10px;border-radius:5px;font:600 13px Figtree,sans-serif;color:#4f5a57;cursor:pointer}.rg nav button:hover{background:#ece9df}.rg nav button[aria-current=true]{background:#173f3d;color:#fff}' +
    '.rg main{display:flex;flex-direction:column;min-width:0;min-height:0;height:100%}' +
    '.rg .rg-h{display:flex;align-items:center;gap:10px;padding:14px 20px 10px;border-bottom:1px solid #e3ded2}.rg .rg-h h2{margin:0;font-size:20px;font-weight:800;letter-spacing:-.02em;color:#173f3d;flex:1}.rg .rg-h .rg-x{border:0;background:transparent;font-size:22px;color:#5c6b67;cursor:pointer}' +
    '.rg .rg-c{flex:1;overflow:auto;padding:14px 20px 24px;display:flex;flex-direction:column;gap:12px}.rg .rg-c p{margin:0}.rg .rg-c .rg-n{font-size:12.5px;color:#5c6b67}' +
    '.rg .rg-f{display:flex;gap:8px;justify-content:flex-end;align-items:center;padding:10px 20px;border-top:1px solid #e3ded2;background:#fff}' +
    '.rg .rg-btn{height:32px;padding:0 12px;border:1px solid #c8c3b6;background:#fff;color:#203b39;font:700 12.5px Figtree,sans-serif;border-radius:6px;cursor:pointer}.rg .rg-btn.pri{background:#173f3d;border-color:#173f3d;color:#fff}.rg .rg-btn:disabled{opacity:.45;cursor:not-allowed}' +
    '.rg .rg-card{border:1px solid #d8d3c6;background:#fff;border-radius:8px}.rg .rg-card>b{display:block;padding:9px 14px;border-bottom:1px solid #e3ded2;font-size:13.5px;color:#173f3d}.rg .rg-card>b small{font-weight:500;color:#5c6b67;margin-left:6px}' +
    '.rg .rg-li{display:grid;grid-template-columns:minmax(0,1fr) 64px 210px;gap:10px;align-items:center;padding:6px 14px;border-top:1px solid #f0ece2;font-size:13px}.rg .rg-li:first-of-type{border-top:0}' +
    '.rg .rg-li .q{font:500 12px "JetBrains Mono",monospace;text-align:right;color:#173f3d}.rg .rg-li select{height:28px;border:1px solid #c8c3b6;border-radius:5px;font:600 12px Figtree,sans-serif;background:#fff;color:#203b39;width:100%}' +
    '.rg .rg-li.mud{background:#fbf3df}.rg .rg-tl{display:grid;grid-template-columns:240px minmax(0,1fr);gap:4px 14px;padding:8px 14px;border-top:1px solid #f0ece2;font-size:13px}.rg .rg-tl:first-of-type{border-top:0}.rg .rg-tl b{font-weight:600}' +
    '.rg .rg-msg{padding:9px 12px;border:1px solid #d8d3c6;border-radius:6px;background:#fff;font-size:12.5px}.rg .rg-msg.bad{border-color:#e2b3aa;color:#8a2f22}' +
    '.rg .rg-eq{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:7px 14px;border-top:1px solid #f0ece2;font-size:13px}.rg .rg-eq label{margin-left:10px;font-size:12.5px;white-space:nowrap}' +
    '.rg .rg-add{display:flex;gap:8px;padding:10px 14px;border-top:1px solid #e3ded2}.rg .rg-add input{flex:1;height:30px;border:1px solid #c8c3b6;border-radius:5px;padding:0 8px;font:13px Figtree,sans-serif}' +
    '@media (max-width:760px){.rg{grid-template-columns:minmax(0,1fr);top:0;height:100vh;width:100vw;border-radius:0}.rg nav{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid #d8d3c6}.rg nav p{display:none}.rg .rg-li{grid-template-columns:minmax(0,1fr) 50px}.rg .rg-li select{grid-column:1/-1}.rg .rg-tl{grid-template-columns:minmax(0,1fr)}}';
  D.head.appendChild(css);

  var ABAS = [['TRIAGEM'], ['escopo', 'Escopo da triagem'], ['destino', 'Destino provável e candidatos'], ['ACERVO'], ['acervo', 'Acervo fonte'], ['PAUTAS E EQUIPE'], ['calendario', 'Calendário forense'], ['etiquetas', 'Regras de etiquetas'], ['designacao', 'Regras de designação'], ['produtividade', 'Regras de produtividade'], ['sessao', 'Sessão nova'], ['equipe', 'Equipe']];

  function M() { try { return ST && ST.ctx.motor && ST.ctx.motor(); } catch (e) { return null; } }
  function PM() { var m = M(); return m && m.ProcsMuta; }
  function contagem() { if (ST && ST.ctx.contagem) { try { return ST.ctx.contagem(); } catch (e) {} } var m = M(), c = m && m.__painelCentralComponent, R = (c && c.rows) || [], out = {}; R.forEach(function (r) { var t = String(r.tarefa_atual || '').trim(); if (t) out[t] = (out[t] || 0) + 1; }); return out; }

  function abrir(ctx) {
    fechar(); ST = { ctx: ctx || {}, aba: (ctx && ctx.aba) || 'escopo', esc: null, orig: '', escErro: '', mud: {}, msg: '', bad: false, ocupado: false, des: null, fonte: null };
    var v = D.createElement('div'); v.className = 'rg-veu'; v.id = 'rg-veu'; v.onclick = fechar;
    var g = D.createElement('section'); g.className = 'rg'; g.id = 'rg'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-label', 'Regras gerais');
    D.body.append(v, g);
    g.addEventListener('click', clique); g.addEventListener('change', muda);
    D.addEventListener('keydown', tecla);
    carregarEscopo(); pintar(); }
  function fechar() { if (ST && ST.ocupado) return; var g = D.getElementById('rg'), v = D.getElementById('rg-veu'); if (g) g.remove(); if (v) v.remove(); D.removeEventListener('keydown', tecla); ST = null; }
  function tecla(e) { if (e.key === 'Escape') fechar(); }
  function aberto() { return !!D.getElementById('rg'); }

  async function carregarEscopo() { var P = PM(); if (!P) { ST.escErro = 'O motor ainda está carregando. Feche e abra de novo em instantes.'; pintar(); return; }
    try { var t = await P.ler(ARQ_ESC); if (!ST) return; ST.esc = JSON.parse(t); ST.orig = JSON.stringify(ST.esc); ST.mud = {}; } catch (e) { if (ST) ST.escErro = 'Não li ' + ARQ_ESC + ': ' + (e.message || e); }
    if (ST) pintar(); }
  /* onde está cada tarefa: 'triar' | 'ign:<grupo>' | '' */
  function lugar(t) { var E = ST.esc, k = nzT(t); if (!E) return ''; if ((E.triar || []).some(function (x) { return nzT(x.tarefa) === k; })) return 'triar';
    var g = Object.keys(E.ignorar || {}).find(function (g) { return ((E.ignorar[g] || {}).tarefas || []).some(function (x) { return nzT(x) === k; }); }); return g ? 'ign:' + g : ''; }
  function mover(t, para) { var E = ST.esc, k = nzT(t);
    E.triar = (E.triar || []).filter(function (x) { return nzT(x.tarefa) !== k; });
    Object.keys(E.ignorar || {}).forEach(function (g) { E.ignorar[g].tarefas = (E.ignorar[g].tarefas || []).filter(function (x) { return nzT(x) !== k; }); });
    if (para === 'triar') E.triar.push({ tarefa: t, motivo: 'incluída pelo diálogo de regras gerais' });
    else if (para.indexOf('ign:') === 0) { var g = para.slice(4); E.ignorar[g] = E.ignorar[g] || { motivo: GRUPOS[g] || g, tarefas: [] }; E.ignorar[g].tarefas.push(t); }
    ST.mud[k] = 1; }
  function opcoes(atual) { var E = ST.esc || {}, gs = Object.keys(Object.assign({}, GRUPOS, E.ignorar || {}));
    return '<option value="triar"' + (atual === 'triar' ? ' selected' : '') + '>entra na triagem</option>' + gs.map(function (g) { return '<option value="ign:' + esc(g) + '"' + (atual === 'ign:' + g ? ' selected' : '') + '>fora · ' + esc(GRUPOS[g] || (E.ignorar[g] || {}).motivo || g) + '</option>'; }).join('') + '<option value=""' + (!atual ? ' selected' : '') + '>não classificada</option>'; }

  function vEscopo() {
    if (ST.escErro) return '<div class="rg-msg bad">' + esc(ST.escErro) + '</div>';
    if (!ST.esc) return '<p class="rg-n">Lendo ' + ARQ_ESC + '…</p>';
    var E = ST.esc, C = contagem(), todas = {};
    Object.keys(C).forEach(function (t) { todas[nzT(t)] = t; });
    (E.triar || []).forEach(function (x) { if (!todas[nzT(x.tarefa)]) todas[nzT(x.tarefa)] = x.tarefa; });
    Object.keys(E.ignorar || {}).forEach(function (g) { (E.ignorar[g].tarefas || []).forEach(function (t) { if (!todas[nzT(t)]) todas[nzT(t)] = t; }); });
    var n = function (t) { var k = nzT(t), s = 0; Object.keys(C).forEach(function (x) { if (nzT(x) === k) s += C[x]; }); return s; };
    var linha = function (t) { var l = lugar(t); return '<div class="rg-li' + (ST.mud[nzT(t)] ? ' mud' : '') + '"><span>' + esc(t) + '</span><span class="q">' + nf(n(t)) + '</span><select data-rg-t="' + esc(t) + '" aria-label="Destino da tarefa ' + esc(t) + '">' + opcoes(l) + '</select></div>'; };
    var nc = Object.keys(todas).map(function (k) { return todas[k]; }).filter(function (t) { return !lugar(t); }).sort(function (a, b) { return n(b) - n(a); });
    var tri = (E.triar || []).map(function (x) { return x.tarefa; }).sort(function (a, b) { return n(b) - n(a); });
    var tot = tri.reduce(function (s, t) { return s + n(t); }, 0);
    var h = '<p>Entra na triagem só o processo da fonte cuja tarefa do PJe está em “entra na triagem”. Processo sem tarefa fica fora. Tarefa que não está em nenhuma lista aparece em “não classificadas”, para decidir aqui. A contagem é do acervo carregado neste navegador.</p>';
    h += '<div class="rg-card"><b>Não classificadas<small>' + nf(nc.length) + ' tarefa(s)</small></b>' + (nc.length ? nc.map(linha).join('') : '<p class="rg-n" style="padding:8px 14px">Nenhuma. Todas as tarefas do acervo estão classificadas.</p>') + '</div>';
    h += '<div class="rg-card"><b>Entram na triagem<small>' + nf(tri.length) + ' tarefa(s) · ' + nf(tot) + ' processos</small></b>' + tri.map(linha).join('') + '<div class="rg-add"><input type="text" id="rg-nova" placeholder="Incluir tarefa pelo nome exato do PJe" aria-label="Nova tarefa"><button type="button" class="rg-btn" data-rg="incluir">Incluir na triagem</button></div></div>';
    Object.keys(E.ignorar || {}).forEach(function (g) { var L = (E.ignorar[g].tarefas || []).slice().sort(function (a, b) { return n(b) - n(a); });
      h += '<div class="rg-card"><b>Fora · ' + esc(GRUPOS[g] || g) + '<small>' + esc(E.ignorar[g].motivo || '') + ' · ' + nf(L.reduce(function (s, t) { return s + n(t); }, 0)) + ' processos</small></b>' + L.map(linha).join('') + '</div>'; });
    return h; }
  function vDestino() {
    return '<p>Regras usadas pela Triagem para sugerir o caminho de cada processo. São indícios: a decisão é de quem tria.</p>' +
      '<div class="rg-card"><b>Destino provável<small>cada processo fica no primeiro que atende, nesta ordem</small></b>' + DEST.map(function (x) { return '<div class="rg-tl"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>' +
      '<div class="rg-card"><b>Candidatos à decisão do relator<small>só processo sem destino; cada um no primeiro critério que atende</small></b>' + CAND.map(function (x) { return '<div class="rg-tl"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>' +
      '<div class="rg-card"><b>Prontos para julgar<small>aptos sem pendência</small></b><div class="rg-tl"><b>Apto</b><span>etiqueta Apto / Apto para julgamento ou tarefa “Aptos para julgamento”</span></div><div class="rg-tl"><b>Pendência</b><span>' + esc(PEND) + '</span></div><div class="rg-tl"><b>Seção divergente</b><span>a etiqueta de seção (1ª, 2ª ou 3ª Seção) difere da Seção competente</span></div></div>' +
      '<div class="rg-card"><b>Destino da triagem<small>o que o rodapé grava no procs-muta</small></b><div class="rg-tl"><b>Pauta</b><span>seleção prévia da sessão escolhida (página Pautas)</span></div><div class="rg-tl"><b>Monocrática</b><span>destino “Monocrática” na ficha; aparece nas Monocráticas da Ex Officio</span></div><div class="rg-tl"><b>Escaninho</b><span>pasta para examinar depois (acervo/triagem/escaninhos.json)</span></div></div>'; }
  function vAcervo() {
    if (!ST.fonte) { ST.fonte = 'lendo'; fonteInfo().then(function (i) { if (ST) { ST.fonte = i || 'sem'; pintar(); } }); }
    var f = ST.fonte && ST.fonte.em ? 'Última gravação da fonte: <b>' + esc(new Date(ST.fonte.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })) + '</b> · ' + esc(ST.fonte.msg) : ST.fonte === 'lendo' ? 'Consultando a última gravação da fonte…' : 'Não consegui consultar a última gravação da fonte.';
    return '<p>O acervo fonte (acervo/fonte.json, no procs-muta) reúne só os processos efetivamente no gabinete. Só o GitHub grava a fonte; as páginas leem.</p><p class="rg-n">' + f + '</p>' +
      '<div class="rg-card"><b>Papéis das planilhas<small>botão “Atualizar acervo fonte”, na Triagem</small></b><div class="rg-tl"><b>Principal (em andamento)</b><span>lista do PJe com a coluna Tarefa. Define quem está na fonte e onde está. Entra quem aparece; sai quem não aparece.</span></div><div class="rg-tl"><b>Complementar</b><span>Power BI, sigilosos ou outra planilha com mais dados. Só preenche quem já está na fonte; nunca acrescenta nem tira processo.</span></div><div class="rg-tl"><b>Lista de uma tarefa</b><span>exportação do PJe de uma tarefa. Atualiza o paradeiro de quem veio nela; quem estava nela e não veio perde a tarefa, mas continua na fonte.</span></div></div>' +
      '<div class="rg-card"><b>Entrada e saída</b><div class="rg-tl"><b>Entra</b><span>quem aparece na planilha principal, inclusive quem volta ao gabinete</span></div><div class="rg-tl"><b>Sai</b><span>quem não aparece: baixado, arquivado ou redistribuído. O trabalho registrado vai para acervo/operacional-arquivo.json e volta se o processo voltar.</span></div><div class="rg-tl"><b>Preservados</b><span>dados que as planilhas não trazem: DataJud, advogados, DPU, MPF, distribuição no 1º grau, seção competente</span></div><div class="rg-tl"><b>DataJud</b><span>só complementa processos que já estão na fonte; nunca acrescenta processo</span></div><div class="rg-tl"><b>Dados pessoais</b><span>celulares, telefones, e-mails e CPF não entram</span></div></div>' +
      '<div class="rg-card"><b>Trabalho do gabinete</b><div class="rg-tl"><b>acervo/operacional.json</b><span>um registro por processo da fonte: triagem, produção e histórico de pautas</span></div><div class="rg-tl"><b>acervo/operacional-arquivo.json</b><span>trabalho de quem saiu do gabinete; não aparece na triagem</span></div></div>'; }
  function vCalendario() { return '<p>Feriados nacionais e da Justiça Federal, de MS, Carnaval, Semana Santa, Corpus Christi e recesso (20/12 a 20/01). Os marcos das sessões, os prazos da triagem e as urgências seguem este calendário.</p><p class="rg-n">Cada sessão ajusta os próprios marcos na página Pautas (⚙ da sessão).</p>'; }
  function vEtiquetas() { return '<p>A tarefa do PJe decide o tipo de julgamento ([ED], [Sessão - ED], [Ag. Int], retratação); a etiqueta de ED só informa. Remessa necessária vem da classe.</p><p>As conversões gerais (subassuntos, MPF, especificidades, alertas de impedimento e suspeição) estão em <b>apoio/regras/etiquetas.json</b>.</p>'; }
  function vDesignacao() {
    if (!ST.des) { ST.des = 'lendo'; var P = PM(); if (P) P.ler(ARQ_DES).then(function (t) { if (ST) { try { ST.des = JSON.parse(t); } catch (e) { ST.des = 'erro'; } pintar(); } }).catch(function () { if (ST) { ST.des = 'erro'; pintar(); } }); }
    var D2 = ST.des && typeof ST.des === 'object' ? ST.des : null, L = D2 ? (Array.isArray(D2.ordem) ? D2.ordem : Array.isArray(D2.criterios) ? D2.criterios : Array.isArray(D2) ? D2 : []) : [];
    return '<p>Critérios tentados em ordem até um deles indicar alguém. Cada critério vale para a minuta (equipe), a correção (assessoria) ou as duas. A sessão pode ter ajuste próprio, gravado no JSON da sessão.</p>' +
      (L.length ? '<div class="rg-card"><b>Ordem dos critérios<small>' + ARQ_DES + '</small></b>' + L.map(function (c, i) { return '<div class="rg-tl"><b>' + (i + 1) + '.</b><span>' + esc(typeof c === 'string' ? c : (c.nome || c.id || c.titulo || JSON.stringify(c))) + '</span></div>'; }).join('') + '</div>' : '<p class="rg-n">' + (ST.des === 'lendo' ? 'Lendo ' + ARQ_DES + '…' : 'Sem critérios gravados em ' + ARQ_DES + '.') + '</p>'); }
  function vProdutividade() { return '<p>Metas internas do gabinete, distintas das metas do CNJ: cota fixa de minutas por dia útil para quem minuta. Dia sem expediente ou sem processos pendentes: meta zero. Cada processo minutado conta uma vez por número.</p><div class="rg-card">' +
      [['Dalete, José, Rodrigo, Débora e Maria Eduarda', '3 minutas por dia'], ['Victor e Estela', '4 minutas por dia'], ['Demais da equipe', 'sem meta interna'], ['Monocráticas e correções', 'sem meta interna'], ['Complexidade (½ · Ω · A · Σ)', '0,5 · 1 · 2 · 3 [VALIDAR peso na meta]']].map(function (x) { return '<div class="rg-tl"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>'; +
      '<p style="margin-top:16px"><b>Como se conta</b> (regra do Gabinete CMT, painel de produtividade da equipe).</p><div class="rg-card">' +
      [['Universo', 'Processos das listas oficiais das sessões de julgamento. Sessão arquivada sai do painel de sessões, mas continua na produtividade.'],
       ['Minuta concluída', 'Processo com MINUTADO preenchido. Conta na data do MINUTADO, dentro do período filtrado.'],
       ['Autoria da minuta', 'Quem marcou a minuta (identificador do servidor); na falta, o nome em SERVIDOR. Vale o nome ou o apelido cadastrado.'],
       ['Minutas avulsas', 'Lançamentos diários do próprio servidor (fora da pauta) somam ao total de minutas.'],
       ['Minutas designadas pendentes', 'Processos com o servidor em SERVIDOR e sem MINUTADO.'],
       ['Correção concluída', 'CORRIGIDO ou LIBERADO marcado (sim ou data), creditado a quem está em CORRETOR, na data da marca.'],
       ['Pendências concluídas', 'Baixas de pendência registradas pelo servidor no período.'],
       ['Total do servidor', 'Minutas da pauta + minutas avulsas.'],
       ['Classificação', 'Total de minutas, depois correções, depois pendências, depois nome.'],
       ['Situação do processo na pauta', 'Adiado, retirado ou julgado (resultado da sessão) prevalece; senão liberado; senão corrigido; senão minutado (feito); senão pendente.']
      ].map(function (x) { return '<div class="rg-tl"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>'; }
  function vSessao() { var s = M() && M().CMTSessao, S = {}; try { S = (s && s.estado && s.estado()) || {}; } catch (e) {}
    return '<p>O que toda sessão nova recebe ao ser criada na página Pautas.</p><div class="rg-card">' + [['Órgão julgador', 'Turma Regional de MS'], ['Gabinete na relação do PJe', S.gab || 'Gab. A da Turma Regional de Mato Grosso do Sul'], ['Horário', '14:00'], ['Julgadores', 'apoio/magistrados.json']].map(function (x) { return '<div class="rg-tl"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>'; }
  function vEquipe() { var s = M() && M().CMTSessao, S = {}; try { S = (s && s.estado && s.estado()) || {}; } catch (e) {} var eq = S.equipe || [];
    if (!eq.length) return '<p class="rg-n">A equipe ainda não carregou. Feche e abra de novo em instantes.</p>';
    return '<p>Quem minuta entra na designação e na meta interna; a Assessoria corrige. As marcas valem na hora para a designação e são gravadas no procs-muta. Nomes, cargos e ausências ficam no cadastro da equipe da Ex Officio.</p><div class="rg-card">' +
      eq.map(function (m) { var mi = m.minuta != null ? !!m.minuta : m.papel === 'equipe', co = m.correcao != null ? !!m.correcao : m.papel === 'assessoria', au = m.auto !== false;
        return '<div class="rg-eq"><span><b style="font-weight:600">' + esc(m.nome) + '</b> <span class="rg-n">' + esc((m.papel === 'assessoria' ? 'Assessoria' : 'Equipe') + (m.cargo ? ' · ' + m.cargo : '')) + '</span></span><span>' +
          [['minuta', 'minuta', mi], ['correcao', 'corrige', co], ['auto', 'designação automática', au]].map(function (x) { return '<label><input type="checkbox" data-rg-eq="' + esc(m.nome) + '" data-k="' + x[0] + '"' + (x[2] ? ' checked' : '') + '> ' + x[1] + '</label>'; }).join('') + '</span></div>'; }).join('') + '</div>'; }
  async function fonteInfo() { try { var P = PM(), k = P && P.atual; if (!k) return null; var r = await fetch('https://api.github.com/repos/trf3bdutra/procs-muta/commits?path=acervo/fonte.json&per_page=1', { cache: 'no-store', headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + k } }); if (!r.ok) return null; var j = await r.json(); return j[0] ? { em: j[0].commit.committer.date, msg: j[0].commit.message.split('\n')[0] } : null; } catch (e) { return null; } }

  var VIS = { escopo: vEscopo, destino: vDestino, acervo: vAcervo, calendario: vCalendario, etiquetas: vEtiquetas, designacao: vDesignacao, produtividade: vProdutividade, sessao: vSessao, equipe: vEquipe };
  function sujo() { return ST && ST.esc && JSON.stringify(ST.esc) !== ST.orig; }
  function pintar() { var g = D.getElementById('rg'); if (!g || !ST) return; var a = ST.aba, tit = (ABAS.find(function (x) { return x[0] === a; }) || [])[1] || '';
    var sc = g.querySelector('.rg-c'), top = sc ? sc.scrollTop : 0;
    g.innerHTML = '<nav aria-label="Seções">' + ABAS.map(function (x) { return x.length === 1 ? '<p>' + x[0] + '</p>' : '<button type="button" data-rg-aba="' + x[0] + '" aria-current="' + (x[0] === a) + '">' + esc(x[1]) + (x[0] === 'escopo' && sujo() ? ' •' : '') + '</button>'; }).join('') + '</nav>' +
      '<main><div class="rg-h"><h2>' + esc(tit) + '</h2><span class="rg-n" style="font:500 10px JetBrains Mono,monospace;letter-spacing:.14em;text-transform:uppercase;color:#805b18">Regras gerais</span><button type="button" class="rg-x" data-rg="fechar" aria-label="Fechar">×</button></div>' +
      '<div class="rg-c">' + (ST.msg ? '<div class="rg-msg' + (ST.bad ? ' bad' : '') + '" role="status">' + esc(ST.msg) + '</div>' : '') + VIS[a]() + '</div>' +
      '<div class="rg-f">' + (a === 'escopo' ? '<span class="rg-n" style="margin-right:auto">' + (sujo() ? 'Alterações ainda não gravadas.' : 'Escopo igual ao gravado.') + '</span><button type="button" class="rg-btn" data-rg="desfazer"' + (sujo() && !ST.ocupado ? '' : ' disabled') + '>Desfazer</button><button type="button" class="rg-btn pri" data-rg="gravar"' + (sujo() && !ST.ocupado ? '' : ' disabled') + '>' + (ST.ocupado ? 'Gravando…' : 'Gravar escopo') + '</button>' : '<button type="button" class="rg-btn" data-rg="fechar">Fechar</button>') + '</div></main>';
    var nc = g.querySelector('.rg-c'); if (nc) nc.scrollTop = top; }
  function clique(e) { var b = e.target.closest('[data-rg-aba],[data-rg]'); if (!b || b.disabled) return;
    if (b.dataset.rgAba) { ST.aba = b.dataset.rgAba; ST.msg = ''; pintar(); return; }
    var k = b.dataset.rg;
    if (k === 'fechar') { if (sujo() && !W.confirm('Há mudanças no escopo ainda não gravadas. Fechar e descartar?')) return; fechar(); }
    else if (k === 'desfazer') { ST.esc = JSON.parse(ST.orig); ST.mud = {}; ST.msg = ''; pintar(); }
    else if (k === 'incluir') { var i = D.getElementById('rg-nova'), t = (i && i.value || '').trim(); if (!t) return; mover(t, 'triar'); pintar(); }
    else if (k === 'gravar') gravarEscopo(); }
  function muda(e) { var t = e.target;
    if (t.dataset.rgT != null) { mover(t.dataset.rgT, t.value); ST.msg = ''; pintar(); return; }
    if (t.dataset.rgEq != null) { var s = M() && M().CMTSessao; if (!s || !s.equipeDefinir) { ST.msg = 'Motor indisponível.'; ST.bad = true; pintar(); return; }
      s.equipeDefinir(t.dataset.rgEq, t.dataset.k, t.checked); ST.msg = 'Gravando a equipe…'; ST.bad = false; pintar();
      Promise.resolve(s.gravar && s.gravar()).then(function (r) { if (!ST) return; ST.msg = r && r.ok === false ? 'Não gravou a equipe: ' + (r.erro || '') : 'Equipe gravada no procs-muta.'; ST.bad = !!(r && r.ok === false); pintar(); }).catch(function (er) { if (ST) { ST.msg = 'Não gravou a equipe: ' + (er.message || er); ST.bad = true; pintar(); } }); } }
  async function gravarEscopo() { var P = PM(); if (!P || !P.gravar) { ST.msg = 'Gravação indisponível nesta página.'; ST.bad = true; pintar(); return; }
    ST.ocupado = true; ST.msg = 'Gravando o escopo no procs-muta…'; ST.bad = false; pintar();
    try { var atual = JSON.parse(await P.ler(ARQ_ESC)), novo = Object.assign({}, atual, { triar: ST.esc.triar, ignorar: ST.esc.ignorar, atualizadoEm: new Date().toISOString() });
      var txt = JSON.stringify(novo, null, 1) + '\n';
      await P.gravar({ [ARQ_ESC]: txt }, 'Regras: escopo da triagem alterado pelo diálogo de regras gerais (' + Object.keys(ST.mud).length + ' tarefa(s))');
      ST.esc = novo; ST.orig = JSON.stringify(novo); ST.mud = {}; ST.msg = 'Escopo gravado. A triagem já usa a regra nova.';
      try { if (ST.ctx.aoGravarEscopo) ST.ctx.aoGravarEscopo(novo); } catch (e) {}
    } catch (e) { ST.msg = 'Não gravou: ' + (e.message || e); ST.bad = true; }
    ST.ocupado = false; pintar(); }

  W.CMTRegrasGerais = { abrir: abrir, fechar: fechar, aberto: aberto };
})(window, document);
