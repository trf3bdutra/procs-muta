/* Ab Initio · Regras gerais (diálogo comum da Triagem e das Pautas).
   Uso: <script src="/init/assets/js/regras-gerais.js"></script>
        CMTRegrasGerais.abrir({ motor: () => iframeDoMotor.contentWindow, pagina: 'triagem' | 'pautas', aba: 'escopo', aoGravarEscopo: (json) => {...} });
   Lê e grava pelo motor (ProcsMuta, CMTSessao). Edita o escopo da triagem (apoio/regras/escopo-triagem.json) e a equipe;
   escopo, designação (ordem e interruptores), produtividade, metas e prazos (apoio/regras/produtividade.json) e equipe se editam aqui;
   calendário, etiquetas, quem recebe em cada critério e sessão nova abrem a tela do motor (ctx.abrirMotor). A fonte do acervo nunca é gravada daqui. */
(function (W, D) {
  'use strict';
  if (W.CMTRegrasGerais) return;
  var ARQ_ESC = 'apoio/regras/escopo-triagem.json', ARQ_DES = 'apoio/regras/designacao.json', ARQ_PROD = 'apoio/regras/produtividade.json';
  /* regras de produtividade e prazos (padrões do Gabinete CMT); gravadas em apoio/regras/produtividade.json */
  var PESOS_ROT = [['voto', 'Minuta de voto', 'apelação, remessa, agravo de instrumento e demais classes'], ['ed', 'ED ou Agravo Interno', 'mesmo valor para os dois'], ['mono', 'Monocrática', 'decisão do relator entregue'], ['despacho', 'Despacho', ''], ['diligencia', 'Diligência', ''], ['pendencia', 'Pendência concluída', ''], ['revisao', 'Revisão de monocrática', ''], ['complementar', 'Produção complementar', '']];
  var CX_ROT = [['cx1', 'Ω · Padrão'], ['cx2', 'Α · Intermediário'], ['cx3', 'Σ · Complexo']];
  function prodPadrao() { return { schema: 'gabcmt.regras.produtividade', versao: 1, painel: { liberacao: 5, minutasDia: 3, pertoMeta: 75, redistribuir: true },
    pesos: { voto: 1, ed: 0.5, mono: 0.75, despacho: 0.25, diligencia: 0.25, pendencia: 0.25, revisao: 0.25, complementar: 0.5, cx1: 1, cx2: 1.5, cx3: 2 }, metaPadrao: { voto: 3, mono: 0 }, metas: { 'VICTOR': { voto: 4 }, 'ESTELA': { voto: 4 } } }; }
  function prodNorm(j) { var d = prodPadrao(); j = j && typeof j === 'object' ? j : {}; return Object.assign({}, d, j, { painel: Object.assign({}, d.painel, j.painel || {}), pesos: Object.assign({}, d.pesos, j.pesos || {}), metaPadrao: Object.assign({}, d.metaPadrao, j.metaPadrao || {}), metas: Object.assign({}, j.metas ? {} : d.metas, j.metas || {}) }); }
  var chaveNome = function (n) { return String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase(); };
  var num = function (v) { var n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; };
  var fmt = function (n) { return String(Math.round(Number(n) * 100) / 100).replace('.', ','); };
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
    'section.rg{position:fixed;left:50%;top:4vh;transform:translateX(-50%);width:min(1080px,calc(100vw - 24px));height:92vh;display:grid;grid-template-columns:230px minmax(0,1fr);grid-template-rows:minmax(0,1fr);background:#fbfaf5;border:1px solid #c8c3b6;border-top:3px solid #173f3d;box-shadow:0 24px 60px rgba(23,63,61,.28);z-index:2147481001;font:14px/1.45 Figtree,system-ui,sans-serif;color:#203b39;border-radius:8px;overflow:hidden}' +
    '.rg nav{background:#f4f2ea;border-right:1px solid #d8d3c6;padding:14px 10px;overflow:auto;display:flex;flex-direction:column;gap:2px}' +
    '.rg nav p{margin:12px 8px 4px;font:500 10px "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:#805b18}.rg nav p:first-child{margin-top:0}' +
    '.rg nav button{border:0;background:transparent;text-align:left;padding:7px 10px;border-radius:5px;font:600 13px Figtree,sans-serif;color:#4f5a57;cursor:pointer}.rg nav button:hover{background:#ece9df}.rg nav button[aria-current=true]{background:#173f3d;color:#fff}' +
    '.rg main{display:flex;flex-direction:column;min-width:0;min-height:0!important;height:100%;padding:0!important}' +
    '.rg .rg-h{display:flex;align-items:center;gap:10px;padding:14px 20px 10px;border-bottom:1px solid #e3ded2}.rg .rg-h h2{margin:0;font-size:20px;font-weight:800;letter-spacing:-.02em;color:#173f3d;flex:1}.rg .rg-h .rg-x{border:0;background:transparent;font-size:22px;color:#5c6b67;cursor:pointer}' +
    '.rg .rg-sj{display:grid;grid-template-columns:90px minmax(0,1fr) auto;gap:10px;align-items:start;padding:8px 14px;border-top:1px solid #ece8de;font-size:12.5px}.rg .rg-sj .d{font:600 12px ui-monospace,monospace}.rg .rg-sj small{color:#7a8580;font-size:11px}.rg .rg-sj ul{margin:4px 0 0;padding-left:16px;font-size:12px}' +
    '.rg .rg-c{flex:1;overflow:auto;padding:14px 20px 24px;display:flex;flex-direction:column;gap:12px}.rg .rg-c.emb{padding:0;gap:0;overflow:hidden}.rg .rg-emb-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:10px 20px;border-bottom:1px solid #e3ded2}.rg .rg-emb-h .rg-n{margin-left:auto}.rg .rg-emb{flex:1;min-height:0;background:#fff}.rg .rg-evf{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px 10px;padding:10px 14px 12px;border-bottom:1px solid #e3ded2;background:#f6f3ea}.rg .rg-evf label{display:flex;flex-direction:column;gap:3px;font:700 11.5px Figtree,sans-serif;color:#4f5e5a}.rg .rg-evf label.tit{flex:1 1 220px}.rg .rg-evf input,.rg .rg-evf select{height:30px;border:1px solid #c8c3b6;border-radius:5px;padding:0 7px;font:500 13px Figtree,sans-serif;background:#fff;color:#203b39}.rg .rg-er{flex:0 0 100%;font-style:normal;font-size:12px;color:#8a2f22}.rg .rg-er:empty{display:none}.rg .rg-ev{display:grid;grid-template-columns:96px 170px minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 14px;border-top:1px solid #f0ece2;font-size:13px}.rg .rg-ev i{font-style:normal;color:#fff;font:700 10.5px Figtree,sans-serif;padding:3px 7px;border-radius:4px;text-align:center}.rg .rg-ev .d{font:500 12px "JetBrains Mono",monospace;color:#4f5e5a}.rg .rg-ev small{color:#617570}.rg .rg-ev .rg-btn{height:26px;padding:0 9px;font-size:11.5px}.rg .rg-c p{margin:0}.rg .rg-c .rg-n{font-size:12.5px;color:#5c6b67}' +
    '.rg .rg-f{display:flex;gap:8px;justify-content:flex-end;align-items:center;padding:10px 20px;border-top:1px solid #e3ded2;background:#fff}' +
    '.rg .rg-btn{height:32px;padding:0 12px;border:1px solid #c8c3b6;background:#fff;color:#203b39;font:700 12.5px Figtree,sans-serif;border-radius:6px;cursor:pointer}.rg .rg-btn.pri{background:#173f3d;border-color:#173f3d;color:#fff}.rg .rg-btn:disabled{opacity:.45;cursor:not-allowed}' +
    '.rg .rg-card{border:1px solid #d8d3c6;background:#fff;border-radius:8px}.rg .rg-card>b{display:block;padding:9px 14px;border-bottom:1px solid #e3ded2;font-size:13.5px;color:#173f3d}.rg .rg-card>b small{font-weight:500;color:#5c6b67;margin-left:6px}' +
    '.rg .rg-sum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 10px}.rg .rg-sum>span{border:1px solid #d8d3c6;border-top:2px solid #235a55;background:#fff;padding:8px 12px;font-size:12px;color:#5c6b67}.rg .rg-sum>span.av{border-top-color:#a5382a}.rg .rg-sum b{display:block;font:600 20px "JetBrains Mono",monospace;color:#173f3d}.rg .rg-sum small{display:block;font-size:11px}.rg details.rg-dt>summary{list-style:none;cursor:pointer}.rg details.rg-dt>summary>b{display:block;padding:9px 14px;border-bottom:1px solid #e3ded2;font-size:13.5px;color:#173f3d}.rg details.rg-dt>summary>b small{margin-left:8px;font-weight:400;font-size:11.5px;color:#5c6b67}.rg details.rg-dt>summary::-webkit-details-marker{display:none}.rg details.rg-dt>summary>b::before{content:"▸ ";color:#805b18}.rg details.rg-dt[open]>summary>b::before{content:"▾ "}.rg details.rg-dt:not([open])>summary>b{border-bottom:0}.rg .rg-etq{padding:7px 14px;border-top:1px solid #f0ece2}.rg .rg-etq.off{opacity:.55}.rg .rg-etq-h{display:flex;align-items:center;gap:10px;font-size:13px}.rg .rg-etq-h b{flex:1;min-width:0;color:#173f3d}.rg .rg-etq-h .q{font:500 11px "JetBrains Mono",monospace;color:#5c6b67;white-space:nowrap}.rg .rg-sw{display:flex;align-items:center;gap:4px;font-size:11px;color:#5c6b67;min-width:84px}.rg .rg-etq-t{margin:3px 0 0 94px;font-size:12px;color:#5c6b67}.rg .rg-etq-t code{font-size:11px;background:#f4f2ea;border:1px solid #e3ded2;border-radius:4px;padding:0 4px}.rg .rg-etq-ed{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:8px 0 4px 94px}.rg .rg-etq-ed label{display:grid;gap:3px;font-size:11px;color:#5c6b67}.rg .rg-etq-ed .w{grid-column:1/-1}.rg .rg-etq-ed textarea{min-height:60px;font:12px "JetBrains Mono",monospace}.rg .rg-etq-ed input,.rg .rg-etq-ed select{height:30px}.rg .rg-etq-b{display:flex;gap:12px;align-items:center}.rg .rg-lk{border:0;background:none;color:#235a55;text-decoration:underline;cursor:pointer;font:600 12px Figtree,sans-serif}.rg .rg-li{display:grid;grid-template-columns:minmax(0,1fr) 64px 210px;gap:10px;align-items:center;padding:4px 14px;border-top:1px solid #f0ece2;font-size:13px}.rg .rg-li:first-of-type{border-top:0}' +
    '.rg .rg-li .q{font:500 12px "JetBrains Mono",monospace;text-align:right;color:#173f3d}.rg .rg-li select{height:28px;border:1px solid #c8c3b6;border-radius:5px;font:600 12px Figtree,sans-serif;background:#fff;color:#203b39;width:100%}' +
    '.rg .rg-li.mud{background:#fbf3df}.rg .rg-tl{display:grid;grid-template-columns:240px minmax(0,1fr);gap:4px 14px;padding:8px 14px;border-top:1px solid #f0ece2;font-size:13px}.rg .rg-tl:first-of-type{border-top:0}.rg .rg-tl b{font-weight:600}' +
    '.rg .rg-in{height:28px;border:1px solid #c8c3b6;border-radius:5px;padding:0 6px;font:500 12.5px "JetBrains Mono",monospace;background:#fff;color:#173f3d}.rg .rg-ord{display:inline-flex;gap:2px;margin-right:6px}.rg .rg-ord button{width:22px;height:22px;border:1px solid #c8c3b6;background:#fff;border-radius:4px;cursor:pointer;font-size:11px;padding:0}.rg .rg-ord button:disabled{opacity:.35;cursor:default}.rg .rg-dc{display:flex;gap:14px;margin-top:5px;font-size:12.5px}.rg .rg-dc label{display:flex;gap:5px;align-items:center}' +
    '.rg .rg-msg{padding:9px 12px;border:1px solid #d8d3c6;border-radius:6px;background:#fff;font-size:12.5px}.rg .rg-msg.bad{border-color:#e2b3aa;color:#8a2f22}' +
    '.rg .rg-eq{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:7px 14px;border-top:1px solid #f0ece2;font-size:13px}.rg .rg-eq label{margin-left:10px;font-size:12.5px;white-space:nowrap}' +
    '.rg .rg-add{display:flex;gap:8px;padding:10px 14px;border-top:1px solid #e3ded2}.rg .rg-add input{flex:1;height:30px;border:1px solid #c8c3b6;border-radius:5px;padding:0 8px;font:13px Figtree,sans-serif}' +
    '.rg.embutida{position:relative;left:auto;top:auto;transform:none;width:100%;height:min(78vh,860px);min-height:620px;box-shadow:none;z-index:auto;border-radius:0}.rg.embutida .rg-x{display:none}.rg.embutida .rg-f:empty{display:none}' +
    '@media (max-width:760px){section.rg{grid-template-columns:minmax(0,1fr);top:0;height:100vh;width:100vw;border-radius:0}.rg.embutida{position:relative;top:auto;height:auto;min-height:720px;width:100%;grid-template-columns:minmax(0,1fr)}.rg nav{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid #d8d3c6}.rg nav p{display:none}.rg .rg-li{grid-template-columns:minmax(0,1fr) 50px}.rg .rg-li select{grid-column:1/-1}.rg .rg-tl{grid-template-columns:minmax(0,1fr)}}';
  D.head.appendChild(css);

  var ABAS = [['TRIAGEM'], ['escopo', 'Escopo da triagem'], ['destino', 'Destino provável e candidatos'], ['ACERVO'], ['acervo', 'Acervo fonte'], ['PAUTAS'], ['calendario', 'Calendário forense'], ['etiquetas', 'Regras de etiquetas'], ['EQUIPE'], ['equipe', 'Equipe'], ['designacao', 'Regras de designação'], ['produtividade', 'Regras de produtividade'], ['sessao', 'Sessão nova']];

  function M() { try { return ST && ST.ctx.motor && ST.ctx.motor(); } catch (e) { return null; } }
  function PM() { var m = M(); return m && m.ProcsMuta; }
  function contagem() { if (ST && ST.ctx.contagem) { try { return ST.ctx.contagem(); } catch (e) {} } var m = M(), c = m && m.__painelCentralComponent, R = (c && c.rows) || [], out = {}; R.forEach(function (r) { var t = String(r.tarefa_atual || '').trim(); if (t) out[t] = (out[t] || 0) + 1; }); return out; }

  function abrir(ctx) {
    fechar(); ctx = ctx || {}; var alvo = ctx.embutirEm ? (typeof ctx.embutirEm === 'string' ? D.querySelector(ctx.embutirEm) : ctx.embutirEm) : null;
    ST = { ctx: ctx, aba: ctx.aba || 'escopo', esc: null, orig: '', escErro: '', mud: {}, msg: '', bad: false, ocupado: false, des: null, fonte: null, prod: null, prodOrig: '', embutida: !!alvo };
    var v = null, g = D.createElement('section'); g.className = 'rg' + (alvo ? ' embutida' : ''); g.id = 'rg'; g.setAttribute('role', alvo ? 'region' : 'dialog'); g.setAttribute('aria-label', 'Regras gerais');
    if (alvo) { alvo.innerHTML = ''; alvo.appendChild(g); }
    else { v = D.createElement('div'); v.className = 'rg-veu'; v.id = 'rg-veu'; v.onclick = fechar; D.body.append(v, g); }
    g.addEventListener('click', clique); g.addEventListener('change', muda);
    g.addEventListener('submit', function (e) { var fm = e.target.closest('#rg-evf'); if (!fm) return; e.preventDefault(); incluirEvento(fm); });
    g.addEventListener('input', function (e) { if (e.target.closest('#rg-evf')) { var er = D.getElementById('rg-ever'); if (er) er.textContent = ''; } });
    if (!alvo) D.addEventListener('keydown', tecla);
    carregarEscopo(); pintar(); }
  function fechar() { if (ST && ST.ocupado) return; soltarMotor(); var g = D.getElementById('rg'), v = D.getElementById('rg-veu'); if (g) g.remove(); if (v) v.remove(); D.removeEventListener('keydown', tecla); ST = null; }
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
    var foraT = 0, foraN = 0; Object.keys(E.ignorar || {}).forEach(function (g) { (E.ignorar[g].tarefas || []).forEach(function (t) { foraT++; foraN += n(t); }); });
    var h = '<div class="rg-sum"><span><b>' + nf(tot) + '</b>processos entram<small>' + nf(tri.length) + ' tarefa(s)</small></span><span><b>' + nf(foraN) + '</b>ficam fora<small>' + nf(foraT) + ' tarefa(s) em ' + Object.keys(E.ignorar || {}).length + ' grupo(s)</small></span><span class="' + (nc.length ? 'av' : '') + '"><b>' + nf(nc.length) + '</b>tarefa(s) sem classificação<small>' + (nc.length ? 'decida abaixo' : 'tudo classificado') + '</small></span></div>' +
      '<p class="rg-n">Entra na triagem só o processo cuja tarefa do PJe está em “entra na triagem”; sem tarefa, fica fora. A contagem é do acervo carregado neste navegador. Mude o destino de uma tarefa no seletor e grave.</p>';
    if (nc.length) h += '<div class="rg-card"><b>Não classificadas<small>' + nf(nc.length) + ' tarefa(s)</small></b>' + nc.map(linha).join('') + '</div>';
    h += '<div class="rg-card"><b>Entram na triagem<small>' + nf(tri.length) + ' tarefa(s) · ' + nf(tot) + ' processos</small></b>' + tri.map(linha).join('') + '<div class="rg-add"><input type="text" id="rg-nova" placeholder="Incluir tarefa pelo nome exato do PJe" aria-label="Nova tarefa"><button type="button" class="rg-btn" data-rg="incluir">Incluir na triagem</button></div></div>';
    Object.keys(E.ignorar || {}).forEach(function (g) { var L = (E.ignorar[g].tarefas || []).slice().sort(function (a, b) { return n(b) - n(a); });
      h += '<details class="rg-card rg-dt"' + (L.some(function (t) { return ST.mud[nzT(t)]; }) ? ' open' : '') + '><summary><b>Fora · ' + esc(GRUPOS[g] || g) + '<small>' + esc(E.ignorar[g].motivo || '') + ' · ' + nf(L.length) + ' tarefa(s) · ' + nf(L.reduce(function (s, t) { return s + n(t); }, 0)) + ' processos</small></b></summary>' + L.map(linha).join('') + '</details>'; });
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
  function tl(L) { return L.map(function (x) { return '<div class="rg-tl"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join(''); }
  /* telas do motor que abrem DENTRO do diálogo (no lugar do conteúdo da seção), sem fechar as regras gerais */
  var EMB = { desig: 'Quem recebe em cada critério' }, EMBF = null;
  function frameMotor() { var m = M(); try { return m && m.frameElement; } catch (e) { return null; } }
  function posMotor() { var f = frameMotor(), el = D.getElementById('rg-emb'); if (!f || !el) return; var r = el.getBoundingClientRect();
    [['position', 'fixed'], ['left', r.left + 'px'], ['top', r.top + 'px'], ['width', r.width + 'px'], ['height', r.height + 'px'], ['visibility', 'visible'], ['z-index', '2147481002'], ['background', '#fff'], ['border', '0']].forEach(function (x) { f.style.setProperty(x[0], x[1], 'important'); }); }
  function embutirMotor(aba) { var m = M(), f = frameMotor(); if (!m || !m.CMTSessao || !f) return false;
    if (EMBF == null) { EMBF = f.getAttribute('style') || ''; W.addEventListener('resize', posMotor); }
    try { var md = m.document; if (!md.getElementById('rg-emb-css')) { var c = md.createElement('style'); c.id = 'rg-emb-css'; c.textContent = '#cs-root.cs-emb .cs-top{display:none!important}'; md.head.appendChild(c); }
      m.CMTSessao.abrir(aba); var rt = md.getElementById('cs-root'); if (rt) rt.classList.add('cs-emb'); } catch (e) { soltarMotor(); return false; }
    return true; }
  function soltarMotor() { if (EMBF == null) return; var m = M(), f = frameMotor(); W.removeEventListener('resize', posMotor);
    try { var rt = m && m.document.getElementById('cs-root'); if (rt) rt.classList.remove('cs-emb'); if (m && m.CMTSessao) m.CMTSessao.fechar(); } catch (e) {}
    if (f) { if (EMBF) f.setAttribute('style', EMBF); else f.removeAttribute('style'); } EMBF = null; if (ST) ST.emb = null; }
  function vEmb() { return '<div class="rg-emb-h"><button type="button" class="rg-btn" data-rg="emb-volta">← Voltar às regras de designação</button><b>' + esc(EMB[ST.emb] || '') + '</b><span class="rg-n">As alterações gravam sozinhas no procs-muta.</span></div><div class="rg-emb" id="rg-emb"></div>'; }
  function tela(aba, rot) { return ST.ctx.abrirMotor ? '<button type="button" class="rg-btn" data-rg="motor" data-m="' + aba + '">' + esc(rot) + '</button>' : ''; }
  function lerProd() { if (ST.prod) return; ST.prod = 'lendo'; var P = PM(); if (!P) { ST.prod = prodNorm(null); ST.prodOrig = JSON.stringify(ST.prod); return; }
    P.ler(ARQ_PROD).then(function (t) { if (!ST) return; var j = null; try { j = JSON.parse(t); } catch (e) {} ST.prod = prodNorm(j); ST.prodOrig = JSON.stringify(ST.prod); pintar(); })
      .catch(function () { if (!ST) return; ST.prod = prodNorm(null); ST.prodOrig = JSON.stringify(ST.prod); pintar(); }); }
  function prodOk() { return ST.prod && typeof ST.prod === 'object'; }
  function sujoProd() { return prodOk() && JSON.stringify(ST.prod) !== ST.prodOrig; }
  /* eventos da agenda do calendário (acervo/sessoes/agenda.json, a mesma do calendário do Monitor e da Ex Officio) */
  var EVT = { evento: 'Evento', prazo: 'Prazo-limite', data: 'Data', alerta: 'Alerta', afazer: 'Afazer' }, EVTC = { evento: '#3e72ad', prazo: '#c0392b', data: '#7a5cc0', alerta: '#c46a1f', afazer: '#1a8a6a' };
  function AGd() { var m = M(); return m && m.CMTAgenda; }
  function hojeIso() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function brD(i) { return i ? i.slice(8, 10) + '/' + i.slice(5, 7) + '/' + i.slice(0, 4) : ''; }
  function vEventos() { var A = AGd();
    if (!A) return '<div class="rg-card"><b>Eventos do calendário</b><p class="rg-n" style="padding:8px 14px">O motor ainda está carregando. Feche e abra de novo em instantes.</p></div>';
    var L = A.get('itens', []) || [], h0 = hojeIso();
    var vis = L.filter(function (i) { return EVT[i.tipo] && i.freq !== 'sessao' && i.freq !== 'semanal' && i.freq !== 'mensal' && (i.ate || i.data) >= h0; }).sort(function (a, b) { return String(a.data).localeCompare(String(b.data)) || String(a.hora || '').localeCompare(String(b.hora || '')); });
    var rec = L.filter(function (i) { return EVT[i.tipo] && (i.freq === 'sessao' || i.freq === 'semanal' || i.freq === 'mensal'); }).length;
    var lin = function (i) { return '<div class="rg-ev"><i style="background:' + (EVTC[i.tipo] || '#56656e') + '">' + esc(EVT[i.tipo]) + '</i><span class="d">' + esc(brD(i.data)) + (i.ate && i.ate !== i.data ? ' a ' + esc(brD(i.ate)) : '') + (i.hora ? ' · ' + esc(i.hora) : '') + '</span><span>' + esc(i.titulo || '') + (i.quem ? ' <small>· ' + esc(i.quem) + '</small>' : '') + '</span><button type="button" class="rg-btn" data-rg="ev-del" data-id="' + esc(i.id) + '" aria-label="Excluir ' + esc(i.titulo || 'evento') + '">Excluir</button></div>'; };
    return '<div class="rg-card"><b>Eventos do calendário<small>aparecem no calendário do Monitor, das Pautas e da Ex Officio · acervo/sessoes/agenda.json</small></b>' +
      '<form class="rg-evf" id="rg-evf" autocomplete="off"><label>Tipo<select name="tipo">' + Object.keys(EVT).map(function (k) { return '<option value="' + k + '">' + EVT[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>Data<input type="date" name="data"></label><label class="ate">Até (opcional)<input type="date" name="ate"></label><label>Horário<input type="time" name="hora"></label>' +
      '<label class="tit">Título<input type="text" name="titulo" maxlength="140" placeholder="ex.: reunião da equipe, correição, ponto facultativo"></label><label>Responsável<input type="text" name="quem" maxlength="60" placeholder="Assessoria"></label>' +
      '<button type="submit" class="rg-btn pri">Incluir no calendário</button><em class="rg-er" id="rg-ever"></em></form>' +
      (vis.length ? vis.map(lin).join('') : '<p class="rg-n" style="padding:8px 14px">Nenhum evento a partir de hoje.</p>') +
      (rec ? '<p class="rg-n" style="padding:6px 14px 10px">' + nf(rec) + ' item(ns) recorrente(s) (semanal, mensal ou por marco de sessão) se editam no próprio calendário, pelo botão de cadastrar.</p>' : '') + '</div>'; }
  /* sessões futuras com a composição de julgadores, convocados e substituições (editados no cartão da sessão, em Pautas) */
  function vSesJulg() { var m = M(), S = m && m.CMTSessao; if (!S) return '';
    var h0 = hojeIso(), L = (S.estado().sessoes || []).filter(function (x) { return x.data >= h0; }).sort(function (a, b) { return a.data.localeCompare(b.data); });
    var alc = function (sb) { var a = sb.alcance || (sb.itens === 'todos' || !sb.itens ? 'todos' : 'itens'); return a === 'todos' ? 'em todos os processos' : a === 'itens' ? 'nos itens ' + (sb.itens || []).join(', ') : a === 'casos' ? 'nos casos de ' + (sb.casos || '—') : 'onde houver impedimento ou suspeição'; };
    var lin = function (ss) { var J = ss.julgadores, comp = J && J.composicao, sub = (J && J.substituicoes) || [];
      return '<div class="rg-sj"><span class="d">' + esc(brD(ss.data)) + '</span><span>' + (comp && comp.length ? comp.map(function (c) { return esc(c.nome) + ' <small>' + esc(c.papel || '') + '</small>'; }).join(' · ') : '<small>composição padrão da Turma</small>') +
        (sub.length ? '<ul>' + sub.map(function (sb) { var sai = (comp || []).find(function (c) { return c.id === sb.sai; }); return '<li><b>' + esc((sb.entra && sb.entra.nome) || 'a indicar') + '</b> no lugar de ' + esc(sai ? sai.nome : '—') + ' · ' + esc(sb.motivo || '') + ' · ' + esc(alc(sb)) + '</li>'; }).join('') + '</ul>' : '') +
        '</span><button type="button" class="rg-btn" data-rg="sesjulg" data-v="' + esc(ss.id) + '">Julgadores da sessão</button></div>'; };
    return '<div class="rg-card"><b>Sessões e julgadores<small>convocados e substituições por sessão · editados no cartão da sessão, em Pautas</small></b>' + (L.length ? L.map(lin).join('') : '<p class="rg-n" style="padding:8px 14px">Nenhuma sessão futura cadastrada.</p>') + '</div>'; }
  function incluirEvento(fm) { var A = AGd(), er = D.getElementById('rg-ever'); if (!A) return; var v = function (n) { return (fm[n] && fm[n].value || '').trim(); }, tp = v('tipo');
    var msg = !v('titulo') ? 'Informe o título.' : !v('data') ? 'Informe a data.' : v('ate') && v('ate') < v('data') ? 'O fim não pode ser antes do início.' : '';
    if (msg) { if (er) er.textContent = msg; return; }
    var so = tp === 'prazo' || tp === 'data', ate = so ? '' : v('ate');
    var it = { id: Date.now().toString(36), tipo: tp, sub: '', sit: '', titulo: v('titulo'), quem: v('quem'), ses: '', freq: ate ? 'diaria' : 'unica', hora: v('hora'), data: v('data'), ate: ate, dias: [], marco: '', desloc: 0 };
    var L = (A.get('itens', []) || []).slice(); L.push(it); A.set('itens', L);
    ST.msg = EVT[tp] + ' incluído em ' + brD(it.data) + (ate ? ' a ' + brD(ate) : '') + '. Grava no procs-muta em instantes.'; ST.bad = false; pintar(); }
  function vCalendario() { return '<p>Dia útil é dia de expediente do gabinete (segunda a sexta) que não esteja excluído no calendário. Os marcos das sessões, os prazos da triagem, a capacidade da equipe e as urgências seguem esta contagem.</p>' +
      '<div class="rg-card"><b>Dias não úteis sugeridos<small>calendário da Justiça Federal</small></b>' + tl([['Fixos', '01/01, 21/04, 01/05, 11/08 (Dia da Justiça Federal), 07/09, 12/10, 01/11, 02/11, 15/11, 20/11 e 08/12 (Dia da Justiça)'], ['Móveis (pela Páscoa)', 'Carnaval (segunda e terça), quarta, quinta e sexta-feira santas e Corpus Christi'], ['Recesso forense', '20/12 a 06/01'], ['Suspensão de prazos (CPC, art. 220)', '20/12 a 20/01: conta para prazos processuais, não para o expediente interno']]) + '</div>' +
      '<p class="rg-n">Os feriados são sugeridos para os próximos 120 dias e só passam a valer quando incluídos no calendário do gabinete. Feriado local de MS entra manualmente. A data e os marcos de cada sessão se editam na página Pautas (Editar marcos).</p>' +
      vEventos() + vSesJulg() +
      '<div>' + tela('sessoes', 'Editar calendário do gabinete: expediente, feriados e sessões') + '</div>' +
      (lerProd(), '<div class="rg-card"><b>Marcos da sessão<small>contados em dias úteis · liberação e ritmo se editam em Regras de produtividade</small></b>') + tl([['Liberação dos votos', (prodOk() ? ST.prod.painel.liberacao : 5) + ' dias úteis antes da sessão (contagem estrita, sem o dia da sessão)'], ['Prazo das minutas', 'primeiro dia útil em que a capacidade da equipe, ao ritmo de ' + fmt(prodOk() ? ST.prod.painel.minutasDia : 3) + ' minutas por servidor por dia útil, cobre a carga de cada um e os processos ainda sem servidor'], ['Correção', 'do dia seguinte ao prazo das minutas até a liberação'], ['Folga', 'dias úteis entre a liberação e a véspera da sessão'], ['Início da preparação', 'definido na sessão; antes dele, a contagem parte de hoje']]) + '</div>'; }
  /* regras de etiquetas: as mesmas que Pautas › 3 · Etiquetagem aplica (motor), editadas aqui; grava sozinho no procs-muta */
  function etqGrava(msg) { var SM = sesM(); ST.msg = msg || 'Gravando as regras de etiquetas…'; ST.bad = false; pintar(); clearTimeout(etqGrava.t);
    etqGrava.t = setTimeout(function () { Promise.resolve(SM && SM.gravar && SM.gravar()).then(function (r) { if (!ST) return; ST.msg = r && r.ok === false && !r.ocupado ? 'Não gravou: ' + (r.erro || '') : 'Regras de etiquetas gravadas no procs-muta. Valem já na etapa 3 · Etiquetagem de Pautas.'; ST.bad = !!(r && r.ok === false && !r.ocupado); pintar(); }); }, 700); }
  function vEtiquetas() { var SM = sesM(), RE = SM && SM.regrasEtiquetas; if (!RE) return '<p class="rg-n">O motor ainda está carregando as regras de etiquetas…</p>';
    var EFs = RE.efeitos(), L = RE.lista(), G = {}, ord = [];
    Object.keys(EFs).forEach(function (k) { var g = EFs[k].g; if (!G[g]) { G[g] = []; ord.push(g); } });
    L.forEach(function (r) { var g = (EFs[r.ef] || {}).g || 'Outras'; if (!G[g]) { G[g] = []; ord.push(g); } G[g].push(r); });
    /* na próxima pauta com processos: quantos processos cada regra marcou (mesma conta da etapa 3) */
    var ses = null, uso = {}; try { var h0 = new Date(); h0 = h0.getFullYear() + '-' + ('0' + (h0.getMonth() + 1)).slice(-2) + '-' + ('0' + h0.getDate()).slice(-2); ses = (SM.estado().sessoes || []).filter(function (x) { return x.data >= h0 && (x.itens || []).length; }).sort(function (a, b) { return a.data.localeCompare(b.data); })[0] || null;
      if (ses) (SM.conversoes(ses.id) || []).forEach(function (p) { var vistos = {}; (p.tags || []).forEach(function (t) { (t.regras || []).forEach(function (g) { if (g.id && !vistos[g.id]) { vistos[g.id] = 1; uso[g.id] = (uso[g.id] || 0) + 1; } }); }); }); } catch (e) {}
    var ativas = L.filter(function (r) { return r.on; }).length, ab = ST.etqAb || '';
    var h = '<div class="rg-sum"><span><b>' + nf(ativas) + '</b>regras ativas<small>' + nf(L.length - ativas) + ' desligada(s)</small></span><span><b>' + nf(L.reduce(function (a, r) { return a + (r.on ? r.alcance : 0); }, 0)) + '</b>marcações no acervo<small>soma do alcance das regras ativas</small></span><span><b>' + (ses ? nf(Object.keys(uso).reduce(function (a, k) { return a + uso[k]; }, 0)) : '—') + '</b>' + (ses ? 'marcações na pauta de ' + esc(brD(ses.data)) : 'sem pauta futura') + '<small>as mesmas da etapa 3 · Etiquetagem</small></span></div>';
    h += '<p class="rg-n">A tarefa do PJe decide o tipo de julgamento; a etiqueta de ED só informa. Remessa necessária vem da classe. Termos: sem prefixo = começa por; <code>=</code> igual; <code>*</code> contém; <code>$</code> termina com; <code>/…/</code> expressão regular. Regras só de uma pauta ficam em Pautas › 3 · Etiquetagem.</p>';
    h += '<div class="rg-add"><select id="rg-etq-ef" aria-label="Efeito da nova regra">' + Object.keys(EFs).map(function (k) { return '<option value="' + k + '">' + esc(EFs[k].t) + '</option>'; }).join('') + '</select><button type="button" class="rg-btn" data-rg="etq-nova">Nova regra</button></div>';
    ord.forEach(function (g) { var R = G[g]; if (!R.length) return;
      h += '<details class="rg-card rg-dt"' + (R.some(function (r) { return r.id === ab; }) || g === 'Tipo de julgamento' ? ' open' : '') + '><summary><b>' + esc(g) + '<small>' + nf(R.length) + ' regra(s)</small></b></summary>' + R.map(function (r) { var E = EFs[r.ef] || {}, aberta = r.id === ab;
        return '<div class="rg-etq' + (r.on ? '' : ' off') + '"><div class="rg-etq-h"><label class="rg-sw"><input type="checkbox" data-rg-etq-on="' + esc(r.id) + '"' + (r.on ? ' checked' : '') + '> <span>' + (r.on ? 'ativa' : 'desligada') + '</span></label><b>' + esc(r.nome || E.t || r.ef) + (r.v ? ' · ' + esc(r.v) : '') + '</b><span class="q" title="processos do acervo com etiqueta que casa">' + nf(r.alcance) + ' no acervo</span>' + (ses ? '<span class="q" title="processos da pauta de ' + esc(brD(ses.data)) + ' marcados por esta regra">' + nf(uso[r.id] || 0) + ' na pauta</span>' : '') + '<button type="button" class="rg-lk" data-rg="etq-abre" data-v="' + esc(r.id) + '">' + (aberta ? 'fechar' : 'editar') + '</button></div>' +
          '<div class="rg-etq-t">' + r.termosTx.map(function (x) { return '<code>' + esc(x) + '</code>'; }).join(' ') + ((r.excetoTx || []).length ? ' <small>exceto ' + r.excetoTx.map(esc).join(', ') + '</small>' : '') + (r.exemplos.length ? '<small> · ex.: ' + r.exemplos.slice(0, 3).map(esc).join(', ') + '</small>' : '') + '</div>' +
          (aberta ? '<div class="rg-etq-ed" data-etq="' + esc(r.id) + '"><label>Efeito<select data-ef="ef">' + Object.keys(EFs).map(function (k) { return '<option value="' + k + '"' + (k === r.ef ? ' selected' : '') + '>' + esc(EFs[k].t) + '</option>'; }).join('') + '</select></label>' + (E.v ? '<label>' + esc(E.v) + '<input data-ef="v" value="' + esc(r.v || '') + '"></label>' : '') + '<label>Nome<input data-ef="nome" value="' + esc(r.nome || '') + '"></label>' +
            '<label class="w">Termos (um por linha)<textarea data-ef="termos">' + esc(r.termosTx.join('\n')) + '</textarea></label><label class="w">Exceções (um por linha; padrão: contém)<textarea data-ef="exceto">' + esc((r.excetoTx || []).join('\n')) + '</textarea></label>' +
            '<label>Só para as classes (separe por ;)<input data-ef="classes" value="' + esc((r.classes || []).join('; ')) + '"></label><label>Nota<input data-ef="nota" value="' + esc(r.nota || '') + '"></label>' +
            '<div class="w rg-etq-b"><button type="button" class="rg-btn pri" data-rg="etq-salva" data-v="' + esc(r.id) + '">Aplicar</button><button type="button" class="rg-lk" data-rg="etq-apaga" data-v="' + esc(r.id) + '">apagar regra</button></div></div>' : '') + '</div>'; }).join('') + '</details>'; });
    return h; }
  var CRIT = { julg: 'Julgamento e META', tema: 'Tema ou assunto', hist: 'Histórico de assuntos', esp: 'Especialidade', sec: 'Seção', secao: 'Seção', pron: 'Pronunciamento (padrão)' };
  var CRIT_TX = { julg: 'Tipo de julgamento (ED, Agravo Interno, juízo de retratação) e, depois, processo com META.', tema: 'Tema do processo; sem tema, o assunto.', hist: 'Quem já minutou ou corrigiu o mesmo assunto, em todas as sessões e nas monocráticas.', esp: 'Especialidade cadastrada do servidor coincidente com a especificidade, o tema ou o assunto.', sec: 'Seção competente (1ª, 2ª, 3ª ou sem seção).', secao: 'Seção competente (1ª, 2ª, 3ª ou sem seção).', pron: 'Responsável padrão do tipo de pronunciamento (voto, monocrática, despacho).' };
  function vDesignacao() {
    if (!ST.des) { ST.des = 'lendo'; var P = PM(); if (P) P.ler(ARQ_DES).then(function (t) { if (ST) { try { ST.des = JSON.parse(t); } catch (e) { ST.des = 'erro'; } pintar(); } }).catch(function () { if (ST) { ST.des = 'erro'; pintar(); } }); }
    var D2 = ST.des && typeof ST.des === 'object' ? ST.des : null, C2 = D2 && D2.criterios && !Array.isArray(D2.criterios) ? D2.criterios : null,
      L = C2 && Array.isArray(C2.ordem) ? C2.ordem : D2 ? (Array.isArray(D2.ordem) ? D2.ordem : Array.isArray(D2.criterios) ? D2.criterios : Array.isArray(D2) ? D2 : []) : [], ON = (C2 && C2.on) || {};
    var SM = sesM(), SD = null; try { SD = SM && SM.estado && SM.estado().desig; } catch (e) {} if (SD && Array.isArray(SD.ordem)) { L = SD.ordem.slice(); ON = SD.on || {}; }
    var ed = !!(SM && SM.desigDefinir);
    return '<p>As regras só preenchem processo sem servidor ou sem corretor. Os critérios são tentados em ordem; vale o primeiro que indicar alguém. Cada critério vale para a designação de minuta (Designa), para a correção (Corrige) ou para as duas.</p>' +
      (L.length ? '<div class="rg-card"><b>1. Ordem dos critérios<small>' + ARQ_DES + (ed ? ' · editável: a mudança grava sozinha' : '') + '</small></b>' + L.map(function (c, i) { var k = typeof c === 'string' ? c : (c.k || c.id || ''), o = ON[k] || {};
        if (!ed) { var f = [o.d !== false ? 'Designa' : '', o.c !== false ? 'Corrige' : ''].filter(Boolean).join(' · ') || 'desligado'; return '<div class="rg-tl"><b>' + (i + 1) + '. ' + esc(CRIT[k] || k) + '</b><span>' + esc((CRIT_TX[k] || '') + ' [' + f + ']') + '</span></div>'; }
        return '<div class="rg-tl rg-cr"><b><span class="rg-ord"><button type="button" data-rg="d-sobe" data-k="' + k + '"' + (i ? '' : ' disabled') + ' aria-label="Subir">↑</button><button type="button" data-rg="d-desce" data-k="' + k + '"' + (i < L.length - 1 ? '' : ' disabled') + ' aria-label="Descer">↓</button></span>' + (i + 1) + '. ' + esc(CRIT[k] || k) + '</b><span>' + esc(CRIT_TX[k] || '') +
          '<span class="rg-dc"><label><input type="checkbox" data-rg-dc="' + k + '" data-x="d"' + (o.d !== false ? ' checked' : '') + '> Designa</label><label><input type="checkbox" data-rg-dc="' + k + '" data-x="c"' + (o.c !== false ? ' checked' : '') + '> Corrige</label></span></span></div>'; }).join('') + '</div>' : '<p class="rg-n">' + (ST.des === 'lendo' ? 'Lendo ' + ARQ_DES + '…' : 'Sem critérios gravados em ' + ARQ_DES + '.') + '</p>') +
      '<div class="rg-card"><b>2. Sem regra que indique alguém: sugestão por aderência</b>' + tl([['Quem pode receber', 'Servidor da equipe (não Assessoria nem CM) com a função Minutar e escopo de minuta de voto, com dia útil disponível até o prazo das minutas. Ausência e status indisponível tiram o dia.'], ['Assunto exato no escopo de minuta', '+4'], ['Seção de atuação (sem assunto)', '+2'], ['Especialidade ou tema coincidente', '+3'], ['Preferência registrada', '+2'], ['Experiência registrada', '+2'], ['Área a evitar', '−4 e só recebe se não houver alternativa'], ['Histórico de minutas no assunto', '+0,75 por minuta, até +3; sem histórico no assunto, +0,25 por minuta na seção, até +0,75'], ['Desempate', 'maior pontuação; depois mais vagas livres na cota; depois mais dias disponíveis; depois nome']]) + '</div>' +
      '<div class="rg-card"><b>3. Cota de cada servidor na sessão</b>' + tl([['Base', 'pontos pendentes da sessão × dias úteis disponíveis do servidor ÷ total de dias úteis da equipe'], ['Arredondamento', 'parte inteira para cada um; as sobras vão a quem tem a maior fração']]) + '</div>' +
      '<div class="rg-card"><b>4. Correção</b>' + tl([['Regra específica', 'mesma ordem de critérios; o corretor indicado prevalece se estiver válido'], ['Escopo de correção correspondente', '+4'], ['Preferência · experiência · área a evitar', '+2 · +3 · −5'], ['Histórico de correções no assunto', '+2 por correção, até +8; sem histórico no assunto, +0,5 por correção na seção, até +2'], ['Carga pendente na sessão', '−0,5 por correção pendente, até −4'], ['Desempate', 'maior pontuação; depois menor carga; depois nome']]) + '</div>' +
      '<p class="rg-n">As sugestões trazem o motivo em cada processo e só são gravadas depois de revisadas. As regras por tema, seção, especialidade e pronunciamento (quem recebe) se editam na tela de designação.</p><div>' + tela('desig', 'Editar quem recebe em cada critério') + '</div>'; }
  function sesM() { var m = M(); return m && m.CMTSessao; }
  function desigMuda(fn) { var SM = sesM(); if (!SM || !SM.desigDefinir || !SM.estado) return; var d = SM.estado().desig || { ordem: [], on: {} }, ordem = (d.ordem || []).slice(), on = JSON.parse(JSON.stringify(d.on || {})); fn(ordem, on); SM.desigDefinir(ordem, on);
    ST.msg = 'Gravando as regras de designação…'; ST.bad = false; pintar(); clearTimeout(desigMuda.t);
    desigMuda.t = setTimeout(function () { Promise.resolve(SM.gravar && SM.gravar()).then(function (r) { if (!ST) return; ST.msg = r && r.ok === false && !r.ocupado ? 'Não gravou: ' + (r.erro || '') : 'Regras de designação gravadas no procs-muta.'; ST.bad = !!(r && r.ok === false && !r.ocupado); pintar(); }); }, 900); }
  function vProdutividade() { lerProd(); if (!prodOk()) return '<p class="rg-n">Lendo ' + ARQ_PROD + '…</p>';
    var P = ST.prod, SM = sesM(), eq = []; try { eq = ((SM && SM.estado && SM.estado().equipe) || []).filter(function (m) { return m.minuta != null ? !!m.minuta : m.papel === 'equipe'; }); } catch (e) {}
    var inp = function (grupo, k, v, passo, min, max, larg) { return '<input type="number" class="rg-in" data-rg-p="' + grupo + '" data-k="' + esc(k) + '" value="' + esc(v == null ? '' : v) + '" step="' + passo + '" min="' + min + '"' + (max != null ? ' max="' + max + '"' : '') + ' style="width:' + (larg || 78) + 'px">'; };
    var linha = function (rot, sub, campo) { return '<div class="rg-tl"><b>' + esc(rot) + (sub ? '<small style="display:block;font-weight:500;color:#5c6b67">' + esc(sub) + '</small>' : '') + '</b><span>' + campo + '</span></div>'; };
    var metaDe = function (n) { var m = P.metas[chaveNome(n)] || {}; return { voto: m.voto != null ? m.voto : P.metaPadrao.voto, mono: m.mono != null ? m.mono : P.metaPadrao.mono, pontos: m.pontos != null ? m.pontos : '' }; };
    var pts = function (n) { var m = metaDe(n); return m.pontos !== '' ? m.pontos : (num(m.voto) || 0) * P.pesos.voto + (num(m.mono) || 0) * P.pesos.mono; };
    return '<p>Metas internas do gabinete, distintas das metas do CNJ. A meta diária é medida em pontos: 1 ponto = 1 minuta de voto de complexidade padrão. Dia sem expediente, ausência ou sem processos pendentes: meta zero. Assessoria e CM ficam fora. Tudo aqui é editável; grave no rodapé.</p>' +
      '<div class="rg-card"><b>Prazos e painel<small>' + ARQ_PROD + '</small></b>' +
        linha('Liberação dos votos', 'antes da sessão', inp('painel', 'liberacao', P.painel.liberacao, 1, 0, 30) + ' dias úteis') +
        linha('Ritmo para sugerir o prazo das minutas', '', inp('painel', 'minutasDia', P.painel.minutasDia, 0.5, 0.5, 20) + ' minutas por servidor por dia útil') +
        linha('“Perto da meta” de correção', '', inp('painel', 'pertoMeta', P.painel.pertoMeta, 5, 10, 100) + ' % da meta diária') +
        linha('Redistribuição', '', '<label><input type="checkbox" data-rg-p="painel" data-k="redistribuir"' + (P.painel.redistribuir ? ' checked' : '') + '> sugerir na Ordem do Dia quando alguém não fecha a entrega</label>') + '</div>' +
      '<div class="rg-card"><b>Meta diária por servidor<small>em minutas por dia útil; pontos em branco = calculado pelos pesos</small></b>' +
        linha('Padrão de quem minuta', 'vale para quem não tem meta própria', inp('padrao', 'voto', P.metaPadrao.voto, 1, 0, 20, 64) + ' votos · ' + inp('padrao', 'mono', P.metaPadrao.mono, 1, 0, 20, 64) + ' monocráticas') +
        (eq.length ? eq.map(function (m) { var x = metaDe(m.nome), k = chaveNome(m.nome); return linha(m.nome, m.cargo || '', inp('meta', k + '|voto', x.voto, 1, 0, 20, 64) + ' votos · ' + inp('meta', k + '|mono', x.mono, 1, 0, 20, 64) + ' monocráticas · ' + inp('meta', k + '|pontos', x.pontos, 0.25, 0, 40, 70) + ' pontos <span class="rg-n">(= ' + fmt(pts(m.nome)) + ' pt)</span>'); }).join('') : '<p class="rg-n" style="padding:8px 14px">A equipe ainda não carregou; reabra em instantes.</p>') + '</div>' +
      '<div class="rg-card"><b>Pesos<small>pontos por entrega · complexidade multiplica voto, ED, Agravo Interno e a monocrática que a tiver</small></b>' +
        PESOS_ROT.map(function (x) { return linha(x[1], x[2], inp('pesos', x[0], P.pesos[x[0]], 0.05, 0, 10) + ' pt'); }).join('') +
        CX_ROT.map(function (x) { return linha('Complexidade ' + x[1], 'multiplica o peso', '× ' + inp('pesos', x[0], P.pesos[x[0]], 0.05, 0, 10)); }).join('') +
        linha('Equivalências', '', 'voto Σ = ' + fmt(P.pesos.voto * P.pesos.cx3) + ' pt · voto Α = ' + fmt(P.pesos.voto * P.pesos.cx2) + ' pt · ED Ω = ' + fmt(P.pesos.ed * P.pesos.cx1) + ' pt · ED Σ = ' + fmt(P.pesos.ed * P.pesos.cx3) + ' pt · 4 despachos = ' + fmt(4 * P.pesos.despacho) + ' pt') + '</div>' +
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
    return '<p>O que toda sessão nova recebe ao ser criada na página Pautas.</p><div>' + tela('marcos', 'Editar marcos padrão e dados da sessão nova') + '</div><div class="rg-card">' + [['Órgão julgador', 'Turma Regional de MS'], ['Gabinete na relação do PJe', S.gab || 'Gab. A da Turma Regional de Mato Grosso do Sul'], ['Horário', '14:00'], ['Julgadores', 'apoio/magistrados.json']].map(function (x) { return '<div class="rg-tl"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>'; }
  function vEquipe() { var s = M() && M().CMTSessao, S = {}; try { S = (s && s.estado && s.estado()) || {}; } catch (e) {} var eq = S.equipe || [];
    if (!eq.length) return '<p class="rg-n">A equipe ainda não carregou. Feche e abra de novo em instantes.</p>';
    return '<p>Quem minuta entra na designação e na meta interna; a Assessoria corrige. As marcas valem na hora para a designação e são gravadas no procs-muta. Nomes, cargos e ausências ficam no cadastro da equipe da Ex Officio; competências (especialidade, prefere, evita e experiência pelo histórico) ficam no cadastro completo.</p><div>' + tela('equipe', 'Abrir o cadastro completo da equipe') + '</div><div class="rg-card">' +
      eq.map(function (m) { var mi = m.minuta != null ? !!m.minuta : m.papel === 'equipe', co = m.correcao != null ? !!m.correcao : m.papel === 'assessoria', au = m.auto !== false;
        return '<div class="rg-eq"><span><b style="font-weight:600">' + esc(m.nome) + '</b> <span class="rg-n">' + esc((m.papel === 'assessoria' ? 'Assessoria' : 'Equipe') + (m.cargo ? ' · ' + m.cargo : '')) + '</span>' + (function () { var c = [['Especialidade', m.exp], ['Prefere', m.pref], ['Evita', m.nao]].filter(function (x) { return (x[1] || []).length; }).map(function (x) { return x[0] + ': ' + x[1].join(', '); }); return c.length ? '<br><span class="rg-n" style="font-size:11px">' + esc(c.join(' · ')) + '</span>' : ''; })() + '</span><span>' +
          [['minuta', 'minuta', mi], ['correcao', 'corrige', co], ['auto', 'designação automática', au]].map(function (x) { return '<label><input type="checkbox" data-rg-eq="' + esc(m.nome) + '" data-k="' + x[0] + '"' + (x[2] ? ' checked' : '') + '> ' + x[1] + '</label>'; }).join('') + '</span></div>'; }).join('') + '</div>'; }
  async function fonteInfo() { try { var P = PM(), k = P && P.atual; if (!k) return null; var r = await fetch('https://api.github.com/repos/trf3bdutra/procs-muta/commits?path=acervo/fonte.json&per_page=1', { cache: 'no-store', headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + k } }); if (!r.ok) return null; var j = await r.json(); return j[0] ? { em: j[0].commit.committer.date, msg: j[0].commit.message.split('\n')[0] } : null; } catch (e) { return null; } }

  var VIS = { escopo: vEscopo, destino: vDestino, acervo: vAcervo, calendario: vCalendario, etiquetas: vEtiquetas, designacao: vDesignacao, produtividade: vProdutividade, sessao: vSessao, equipe: vEquipe };
  function sujo() { return ST && ST.esc && JSON.stringify(ST.esc) !== ST.orig; }
  function abasVis() { var ok = ST && ST.ctx.abas, L = ABAS.filter(function (x) { return x.length === 1 || !ok || ok.indexOf(x[0]) >= 0; }); return L.filter(function (x, i) { return x.length > 1 || (L[i + 1] && L[i + 1].length > 1); }); }
  function pintar() { var g = D.getElementById('rg'); if (!g || !ST) return; if (ST.ctx.abas && ST.ctx.abas.indexOf(ST.aba) < 0) ST.aba = ST.ctx.abas[0]; var a = ST.aba, tit = (ABAS.find(function (x) { return x[0] === a; }) || [])[1] || '';
    var sc = g.querySelector('.rg-c'), top = sc ? sc.scrollTop : 0;
    g.innerHTML = '<nav aria-label="Seções">' + abasVis().map(function (x) { return x.length === 1 ? '<p>' + x[0] + '</p>' : '<button type="button" data-rg-aba="' + x[0] + '" aria-current="' + (x[0] === a) + '">' + esc(x[1]) + (x[0] === 'escopo' && sujo() ? ' •' : '') + '</button>'; }).join('') + '</nav>' +
      '<main><div class="rg-h"><h2>' + esc(tit) + '</h2><span class="rg-n" style="font:500 10px JetBrains Mono,monospace;letter-spacing:.14em;text-transform:uppercase;color:#805b18">Regras gerais</span>' + (ST.embutida ? '' : '<button type="button" class="rg-x" data-rg="fechar" aria-label="Fechar">×</button>') + '</div>' +
      (ST.emb ? '<div class="rg-c emb">' + vEmb() + '</div>' : '<div class="rg-c">' + (ST.msg ? '<div class="rg-msg' + (ST.bad ? ' bad' : '') + '" role="status">' + esc(ST.msg) + '</div>' : '') + VIS[a]() + '</div>') +
      '<div class="rg-f">' + (a === 'escopo' ? '<span class="rg-n" style="margin-right:auto">' + (sujo() ? 'Alterações ainda não gravadas.' : 'Escopo igual ao gravado.') + '</span><button type="button" class="rg-btn" data-rg="desfazer"' + (sujo() && !ST.ocupado ? '' : ' disabled') + '>Desfazer</button><button type="button" class="rg-btn pri" data-rg="gravar"' + (sujo() && !ST.ocupado ? '' : ' disabled') + '>' + (ST.ocupado ? 'Gravando…' : 'Gravar escopo') + '</button>' : a === 'produtividade' && prodOk() ? '<span class="rg-n" style="margin-right:auto">' + (sujoProd() ? 'Alterações ainda não gravadas.' : 'Igual ao gravado.') + '</span><button type="button" class="rg-btn" data-rg="p-padrao"' + (ST.ocupado ? ' disabled' : '') + '>Restaurar padrões</button><button type="button" class="rg-btn" data-rg="p-desfazer"' + (sujoProd() && !ST.ocupado ? '' : ' disabled') + '>Desfazer</button><button type="button" class="rg-btn pri" data-rg="p-gravar"' + (sujoProd() && !ST.ocupado ? '' : ' disabled') + '>' + (ST.ocupado ? 'Gravando…' : 'Gravar') + '</button>' : ST.embutida ? '' : '<button type="button" class="rg-btn" data-rg="fechar">Fechar</button>') + '</div></main>';
    var nc = g.querySelector('.rg-c'); if (nc) nc.scrollTop = top; if (ST.emb) posMotor(); }
  function clique(e) { var b = e.target.closest('[data-rg-aba],[data-rg]'); if (!b || b.disabled) return;
    if (b.dataset.rg === 'sesjulg') { try { sessionStorage.setItem('pt-ses', b.dataset.v); } catch (er) {} if (W.CMTPautas && W.CMTPautas.settings) W.CMTPautas.settings.sessId = b.dataset.v; if (W.CMTEsteira && W.CMTEsteira.abrirJulgadores) W.CMTEsteira.abrirJulgadores(); if (typeof ir === 'function') ir('pautas'); else W.location.href = '/caput/pautas'; return; }
    if (b.dataset.rgAba) { soltarMotor(); ST.aba = b.dataset.rgAba; ST.msg = ''; pintar(); return; }
    var k = b.dataset.rg;
    if (k === 'etq-abre') { ST.etqAb = ST.etqAb === b.dataset.v ? '' : b.dataset.v; pintar(); return; }
    if (k === 'etq-nova' || k === 'etq-salva' || k === 'etq-apaga') { var RE = sesM() && sesM().regrasEtiquetas; if (!RE) return;
      if (k === 'etq-nova') { var ef = (D.getElementById('rg-etq-ef') || {}).value; ST.etqAb = RE.nova(ef); pintar(); return; }
      if (k === 'etq-apaga') { if (!W.confirm('Apagar esta regra de etiqueta?')) return; RE.apagar(b.dataset.v); ST.etqAb = ''; etqGrava(); return; }
      var box = b.closest('[data-etq]'), q = function (x) { var el = box && box.querySelector('[data-ef="' + x + '"]'); return el ? el.value : undefined; }, c = {};
      ['ef', 'v', 'nome', 'termos', 'exceto', 'classes', 'nota'].forEach(function (x) { var v = q(x); if (v !== undefined) c[x] = v; });
      RE.salvar(b.dataset.v, c); ST.etqAb = ''; etqGrava(); return; }
    if (k === 'fechar') { if ((sujo() || sujoProd()) && !W.confirm('Há mudanças ainda não gravadas. Fechar e descartar?')) return; fechar(); }
    else if (k === 'desfazer') { ST.esc = JSON.parse(ST.orig); ST.mud = {}; ST.msg = ''; pintar(); }
    else if (k === 'incluir') { var i = D.getElementById('rg-nova'), t = (i && i.value || '').trim(); if (!t) return; mover(t, 'triar'); pintar(); }
    else if (k === 'gravar') gravarEscopo();
    else if (k === 'p-gravar') gravarProd();
    else if (k === 'p-desfazer') { ST.prod = JSON.parse(ST.prodOrig); ST.msg = ''; pintar(); }
    else if (k === 'p-padrao') { ST.prod = prodPadrao(); ST.msg = 'Padrões do Gabinete CMT restaurados; grave para valer.'; ST.bad = false; pintar(); }
    else if (k === 'd-sobe' || k === 'd-desce') { var ck = b.dataset.k; desigMuda(function (o) { var i = o.indexOf(ck), j = k === 'd-sobe' ? i - 1 : i + 1; if (i < 0 || j < 0 || j >= o.length) return; o[i] = o[j]; o[j] = ck; }); }
    else if (k === 'emb-volta') { soltarMotor(); pintar(); }
    else if (k === 'motor' && EMB[b.dataset.m] && embutirMotor(b.dataset.m)) { ST.emb = b.dataset.m; ST.msg = ''; pintar(); }
    else if (k === 'ev-del') { var A = AGd(); if (!A) return; var id = b.dataset.id, L0 = A.get('itens', []) || [], it = L0.find(function (x) { return x.id === id; }); A.set('itens', L0.filter(function (x) { return x.id !== id; })); ST.msg = (it ? '“' + (it.titulo || '') + '” excluído' : 'Excluído') + ' do calendário. Grava no procs-muta em instantes.'; ST.bad = false; pintar(); }
    else if (k === 'motor') { var ab = b.dataset.m, volta = ST.aba; if (sujo() || sujoProd()) { if (!W.confirm('Há mudanças ainda não gravadas nesta seção. Sair e descartar?')) return; } var cx = ST.ctx; fechar(); cx.abrirMotor(ab, function () { abrir(Object.assign({}, cx, { aba: volta })); }); } }
  function muda(e) { var t = e.target;
    if (t.dataset.rgEtqOn != null) { var RE2 = sesM() && sesM().regrasEtiquetas; if (RE2) { RE2.salvar(t.dataset.rgEtqOn, { on: t.checked }); etqGrava(); } return; }
    if (t.dataset.ef === 'ef' && t.closest('[data-etq]')) { var RE3 = sesM() && sesM().regrasEtiquetas; if (RE3) { RE3.salvar(t.closest('[data-etq]').dataset.etq, { ef: t.value }); pintar(); } return; }
    if (t.dataset.rgDc != null) { var dk = t.dataset.rgDc, dx = t.dataset.x, dv = t.checked; desigMuda(function (o, on) { on[dk] = on[dk] || { d: true, c: true }; on[dk][dx] = dv; }); return; }
    if (t.dataset.rgP != null && prodOk()) { var g = t.dataset.rgP, kk = t.dataset.k, P = ST.prod, v = t.type === 'checkbox' ? t.checked : num(t.value);
      if (g === 'painel') P.painel[kk] = t.type === 'checkbox' ? v : (v == null ? prodPadrao().painel[kk] : v);
      else if (g === 'pesos') P.pesos[kk] = v == null ? prodPadrao().pesos[kk] : v;
      else if (g === 'padrao') P.metaPadrao[kk] = v == null ? 0 : v;
      else if (g === 'meta') { var pr = kk.split('|'), m = P.metas[pr[0]] = P.metas[pr[0]] || {}; if (v == null || (pr[1] !== 'pontos' && v === P.metaPadrao[pr[1]])) delete m[pr[1]]; else m[pr[1]] = v; if (!Object.keys(m).length) delete P.metas[pr[0]]; }
      ST.msg = ''; pintar(); return; }
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

  async function gravarProd() { var P = PM(); if (!P || !P.gravar) { ST.msg = 'Gravação indisponível nesta página.'; ST.bad = true; pintar(); return; }
    ST.ocupado = true; ST.msg = 'Gravando as regras de produtividade…'; ST.bad = false; pintar();
    try { var novo = Object.assign({}, ST.prod, { atualizadoEm: new Date().toISOString() });
      await P.gravar({ [ARQ_PROD]: JSON.stringify(novo, null, 1) + '\n' }, 'Regras: produtividade, metas e prazos alterados pelo diálogo de regras gerais');
      ST.prod = novo; ST.prodOrig = JSON.stringify(novo); ST.msg = 'Regras de produtividade gravadas no procs-muta. A designação e os marcos sugeridos já usam os valores novos.';
      try { var SM2 = sesM(); if (SM2 && SM2.regrasProdutividade) SM2.regrasProdutividade(novo); } catch (e) {}
    } catch (e) { ST.msg = 'Não gravou: ' + (e.message || e); ST.bad = true; }
    ST.ocupado = false; pintar(); }

  W.CMTRegrasGerais = { abrir: abrir, embutir: function (alvo, ctx) { ctx = Object.assign({}, ctx || {}, { embutirEm: alvo }); abrir(ctx); }, fechar: fechar, aberto: aberto };
})(window, document);
