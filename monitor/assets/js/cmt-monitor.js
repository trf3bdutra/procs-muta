
/* Ab Initio no formato do CMT-Acervo.
   Abas: Acervo (painéis da antiga página Início, indicadores, planilha e busca do antigo CMT-Acervo; o cartão abre no motor),
   Triagem e Pautas de julgamento (com a Seleção Prévia como pré-pauta de cada sessão); Configurações (regras de etiquetas, designação e equipe) num diálogo.
   O "motor" (Acervo Central, sessões e regras, que leem e gravam no procs-muta) roda numa página modular da mesma origem. */
(function (W, D) {
  'use strict';
  var ABAS = [
    { id: 'central', t: 'Triagem', m: '--m-pje', v: 'central', ix: [['central', 'Edição em tabela (Acervo Central)'], ['importar', 'Importar planilhas do PJe e do Power BI']] },
    { id: 'triagem', t: 'Triagem', m: '--m-tri', v: 'triagem', ix: [] },
    { id: 'selecao', t: 'Seleção Prévia', oculta: true, m: '--m-eq', v: 'selecao', ix: [] },   /* fica dentro das Pautas: é a pré-pauta de cada sessão */
    { id: 'pautas', t: 'Pautas', m: '--m-ses', v: 'sessoes', ix: [] },
    { id: 'equipe', t: 'Equipe', m: '--m-eq', v: 'equipe', ix: [] }
  ];
  var CFG = [['regras', 'Regras de etiquetas'], ['desig', 'Regras de designação'], ['relatorios', 'Gerador de relatórios']];
  var modo = '', frame = null, motorPronto = false, cfgAnterior = '';
  var $ = function (s, r) { return (r || D).querySelector(s); };

  /* ---------- estilos ---------- */
  var css = D.createElement('style');
  css.textContent = '#cmt-motor{position:fixed;top:56px;left:232px;border:0;width:calc(100vw - 232px);height:calc(100vh - 56px);background:#f4f2ed;z-index:40;visibility:hidden;pointer-events:none}' +
    'body.cmt-modo #cmt-motor{visibility:visible;pointer-events:auto}' +
    'body.ix-min #cmt-motor{left:0;width:100vw}' +
    'body.cmt-modo #main>.tabpane,body.cmt-modo #rail{visibility:hidden}' +
    'body.cmt-modo #index .ix-g{display:none!important}body.cmt-modo #index .ix-g.cmt-on{display:block!important}' +
    'body.cmt-token #cmt-motor{visibility:visible;pointer-events:auto;z-index:100;top:0;left:0;width:100vw;height:100vh}' +
    '.cmt-cfg{position:fixed;inset:0;z-index:60;background:rgba(10,20,32,.55);display:none}.cmt-cfg.on{display:block}' +
    '.cmt-cfg .hd{position:fixed;left:4vw;right:4vw;top:4vh;height:48px;background:#0f1f2e;color:#fff;display:flex;align-items:center;gap:10px;padding:0 14px;border-radius:12px 12px 0 0;font:600 13px Figtree,system-ui,sans-serif}' +
    '.cmt-cfg .hd b{letter-spacing:.12em;font-size:11px;color:#e6c27a;margin-right:8px}.cmt-cfg .hd button{border:1px solid rgba(255,255,255,.25);background:transparent;color:#d6dde5;border-radius:999px;padding:5px 12px;cursor:pointer;font:600 12.5px inherit}' +
    '.cmt-cfg .hd button.on{background:#c4953c;border-color:#c4953c;color:#14263c}.cmt-cfg .hd .x{margin-left:auto;border-radius:8px}' +
    'body.cmt-cfg-on #cmt-motor{visibility:visible;pointer-events:auto;z-index:61;top:calc(4vh + 48px);left:4vw;width:92vw;height:calc(92vh - 48px);border-radius:0 0 12px 12px;box-shadow:0 20px 60px rgba(0,0,0,.4)}';
  D.head.appendChild(css);

  /* ---------- motor ---------- */
  function mw() { try { return frame && frame.contentWindow; } catch (e) { return null; } }
  function ir(v) { var w = mw(); if (w && w.CMTMotor) { w.CMTMotor.ir(v); return true; } return false; }
  function quandoPronto(fn) { var n = 0, t = setInterval(function () { var w = mw(); if (w && w.CMTMotor && w.__painelCentralComponent) { clearInterval(t); fn(); } else if (++n > 240) { clearInterval(t); console.error('[CMT] O motor não inicializou em 60 segundos.'); var el = D.getElementById('cmt-motor-erro'); if (!el) { el=D.createElement('div');el.id='cmt-motor-erro';el.setAttribute('role','alert');el.style.cssText='position:fixed;right:16px;bottom:16px;z-index:300;background:#fff2f0;border:1px solid #bc5950;border-radius:10px;padding:12px 16px;max-width:400px;color:#823a34';el.textContent='Falha ao inicializar o gestor. Verifique se a pasta motor/ foi publicada junto com o index.html.';D.body.appendChild(el); } } }, 250); }
  async function criarMotor() {
    // A aplicação de trabalho é entregue como documento normal, em vez de 1 MB de
    // Documento separado no mesmo domínio: APIs do motor permanecem acessíveis.
    frame = D.createElement('iframe'); frame.id = 'cmt-motor'; frame.title = 'Ab Initio · motor de Acervo, Triagem, Sessões e Equipe';
    D.body.appendChild(frame);
    frame.src = new URL('./motor/index.html', D.baseURI).href;
    quandoPronto(function () { motorPronto = true; if (modo) ir(vista(modo)); alimentarRelatorios(); });
  }

  /* ---------- abas ---------- */
  function vista(m) { var a = ABAS.find(function (x) { return x.id === m; }); return a ? a.v : m; }
  function marcarNav() {
    D.querySelectorAll('nav.mods .mod').forEach(function (b) { var on = modo ? b.dataset.cmt === modo : b.dataset.tab === 'acervo'; if (b.classList.contains('on') !== on) b.classList.toggle('on', on); });
  }
  function grupoIndex(m) {
    var ix = $('#index'); if (!ix) return;
    D.querySelectorAll('#index .ix-g.cmt').forEach(function (g) { g.classList.remove('cmt-on', 'cur'); });
    var a = ABAS.find(function (x) { return x.id === m; }), sub = a ? a.ix : [];
    var g = ix.querySelector('.ix-g.cmt[data-cmt="' + m + '"]');
    if (g && g.classList.contains('cmt-on')) return;
    if (!g) {
      g = D.createElement('div'); g.className = 'ix-g cmt'; g.dataset.cmt = m;
      g.innerHTML = '<button>' + (a ? a.t : 'Acervo') + '</button><ul>' + (sub.length ? sub : [[a ? a.v : m, a ? a.t : m]]).map(function (s) { return '<li><a href="#" data-cmt-ir="' + s[0] + '"><i></i>' + s[1] + '</a></li>'; }).join('') + '' + '</ul>';
      ix.appendChild(g);
    }
    g.classList.add('cmt-on', 'cur');
  }
  var subAtual = '';
  function entrar(m, sub) {
    var antes = subAtual; subAtual = sub || vista(m);
    modo = m; D.body.classList.add('cmt-modo'); D.body.dataset.mod = 'cmt-' + m;
    D.body.classList.toggle('cmt-acv', m === 'central'); D.body.classList.toggle('cmt-eq', m === 'equipe');
    if (m === 'central' && antes === 'importar' && subAtual !== 'importar') setTimeout(function () { alimentarRelatorios(true); }, 300);
    marcarNav(); grupoIndex(m);
    if (!ir(sub || vista(m))) quandoPronto(function () { ir(sub || vista(m)); });
  }
  function sair() { var antes = modo; modo = ''; subAtual = ''; D.body.classList.remove('cmt-acv'); D.body.classList.remove('cmt-eq'); if (antes === 'central') setTimeout(function () { alimentarRelatorios(true); }, 50); D.body.classList.remove('cmt-modo'); D.querySelectorAll('#index .ix-g.cmt').forEach(function (g) { g.classList.remove('cmt-on'); }); marcarNav(); }

  /* ---------- configurações ---------- */
  var cfg = null;
  function abrirCfg(aba) {
    if (!cfg) {
      cfg = D.createElement('div'); cfg.className = 'cmt-cfg';
      cfg.innerHTML = '<div class="hd"><b>CONFIGURAÇÕES</b>' + CFG.map(function (c) { return '<button data-cfg="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '<button class="x" data-cfg="fechar">Fechar ×</button></div>';
      D.body.appendChild(cfg);
      cfg.addEventListener('click', function (e) { var b = e.target.closest('[data-cfg]'); if (!b) { if (e.target === cfg) fecharCfg(); return; } if (b.dataset.cfg === 'fechar') fecharCfg(); else abrirCfg(b.dataset.cfg); });
    }
    if (!D.body.classList.contains('cmt-cfg-on')) cfgAnterior = modo;
    cfg.classList.add('on'); D.body.classList.add('cmt-cfg-on');
    cfg.querySelectorAll('[data-cfg]').forEach(function (b) { b.classList.toggle('on', b.dataset.cfg === aba); });
    D.body.classList.toggle('cmt-cfg-rel', aba === 'relatorios'); if (aba === 'relatorios') return;
    if (!ir(aba)) quandoPronto(function () { ir(aba); });
  }
  function fecharCfg() {
    if (cfg) cfg.classList.remove('on'); D.body.classList.remove('cmt-cfg-on'); D.body.classList.remove('cmt-cfg-rel');
    if (cfgAnterior) ir(vista(cfgAnterior)); else { var w = mw(); if (w && w.CMTSessao) w.CMTSessao.fechar(); }
  }

  /* ---------- relatórios do acervo: os mesmos processos do motor ---------- */
  var COLS = ['processo', 'classe_judicial', 'assunto_judicial', 'data_distribuição', 'tarefa_atual', 'data_entrada_tarefa', 'prioridade', 'etiquetas',
    'polo_ativo', 'polo_passivo', 'advogado_pa', 'advogado_pp', 'ultimo_movimento', 'valor_causa', 'dt_distribuicao_1g'];
  var DATAS = { 'data_distribuição': 1, 'data_entrada_tarefa': 1, 'dt_distribuicao_1g': 1 };
  function serial(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); if (!m) { m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(v || '')); if (!m) return v || ''; return Date.UTC(+m[3], +m[2] - 1, +m[1]) / 864e5 + 25569; } return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 + 25569; }
  function linhas(regs) {
    var out = [COLS.slice()];
    regs.forEach(function (r) {
      if (!r || !r.processo) return;
      out.push(COLS.map(function (c) {
        var v = r[c];
        if (c === 'processo') return String(r.processo).replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6');
        if (DATAS[c]) return serial(v);
        if (c === 'valor_causa') { var n = parseFloat(String(v || '').replace(',', '.')); return isNaN(n) ? null : n; }
        if (c === 'classe_judicial' && !v) return r['Classe'] || r['DataJud · Classe'] || '';
        if (c === 'assunto_judicial' && !v) return r['Assunto'] || r['Assunto_Principal'] || '';
        if (c === 'polo_ativo' && !v) return r['Polo_Ativo'] || '';
        if (c === 'polo_passivo' && !v) return r['Polo_Passivo'] || '';
        return v == null ? '' : v;
      }));
    });
    return out;
  }
  var carregados = 0;
  function alimentarRelatorios(forcar) {
    var w = mw(), comp = w && w.__painelCentralComponent, regs = comp && comp.rows;
    if (!regs || !regs.length || typeof acvBuild !== 'function') return false;
    if (!forcar && carregados === regs.length) return true;
    var L = linhas(regs), recs = acvBuild(L); if (!recs) return false;
    try { var imp = acervoFromRows(L); imp.src = 'procs-muta · acervo/fonte.json'; pref.pjeImp = imp; pref.pje = {}; pref.pjeDate = null; if (typeof tkRefreshAll === 'function') tkRefreshAll(); } catch (e) {}
    try { if (typeof acvFixTags === 'function') acvFixTags(recs); } catch (e) {}
    ACV.recs = recs; ACV.src = 'procs-muta · acervo/fonte.json'; ACV.d = new Date().toISOString().slice(0, 10); ACV.at = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    ACV.st = ACV.st || {}; ACV.st.f = ACV.st.f || {};
    carregados = regs.length;
    try { acvRender(); } catch (e) { console.error('[Ab Initio] relatórios', e); }
    return true;
  }
  setInterval(function () { if (motorPronto) alimentarRelatorios(false); }, 3000);
  /* o pedido de token do GitHub aparece dentro do motor: enquanto estiver aberto, o motor fica à vista */
  setInterval(function () {
    var w = mw(), pede = false; try { pede = !!(w && w.document.querySelector('form input[type=password]')); } catch (e) {}
    D.body.classList.toggle('cmt-token', pede);
    var bt = $('#cmtConBtn'), sem = false; try { sem = !!(w && w.ProcsMuta && !w.ProcsMuta.atual) && !pede; } catch (e) {}
    if (bt) { bt.style.display = ''; bt.classList.toggle('au-off', sem); }
  }, 400);

  /* ---------- montagem da barra ---------- */
  function montar() {
    var nav = $('nav.mods'); if (!nav) return;
    nav.querySelectorAll('.mod[data-tab]').forEach(function (b) { if (b.dataset.tab !== 'acervo') b.style.display = 'none'; });
    var acv = nav.querySelector('.mod[data-tab="acervo"]');
    if (acv && !acv.dataset.cmtLigado) { acv.dataset.cmtLigado = '1'; acv.addEventListener('click', function (e) { e.stopImmediatePropagation(); if (D.body.classList.contains('cmt-cfg-on')) fecharCfg(); if (e.isTrusted && typeof W.CMTAcervoMenu === 'function') W.CMTAcervoMenu(acv); else entrar('central'); }, true); }
    ABAS.forEach(function (a) {
      if (a.oculta || nav.querySelector('[data-cmt="' + a.id + '"]')) return;
      var b = D.createElement('button'); b.className = 'mod'; b.dataset.cmt = a.id; b.style.setProperty('--m', 'var(' + a.m + ')'); b.textContent = a.t;
      b.addEventListener('click', function () { if (D.body.classList.contains('cmt-cfg-on')) fecharCfg(); entrar(a.id); });
      if (a.id === 'central' && acv) acv.after(b); else nav.appendChild(b);
    });
    var tools = $('header.bar .tools');
    if (tools && !$('#cmtCfgBtn')) {
      var g = D.createElement('button'); g.className = 'chipbtn'; g.id = 'cmtCfgBtn'; g.title = 'Configurações: regras de etiquetas, designação e equipe'; g.setAttribute('aria-label', 'Configurações'); g.textContent = '⚙';
      g.addEventListener('click', function () { abrirCfg('regras'); }); tools.insertBefore(g, tools.firstChild);
      var cn = D.createElement('button'); cn.className = 'chipbtn'; cn.id = 'cmtConBtn'; cn.style.display = 'none'; cn.title = 'Conectar ao repositório do gabinete (procs-muta)'; cn.textContent = 'Conectar ao procs-muta';
      cn.addEventListener('click', function () { if (typeof W.CMTConexao === 'function') W.CMTConexao(); else { var w = mw(); if (w && w.ProcsMuta) w.ProcsMuta.conectar().then(function (k) { if (k) location.reload(); }); } }); tools.insertBefore(cn, tools.firstChild);
    }
    if (modo) { marcarNav(); grupoIndex(modo); }
    var marca = D.querySelector('header.bar .brand b');
    if (marca && !/Ab Initio/.test(marca.textContent)) marca.innerHTML = 'Ab Initio <em>· Gabinete A</em>';
    /* a fonte é o procs-muta: some a importação e a limpeza locais do app antigo */
    D.querySelectorAll('#acervo button').forEach(function (b) { if (/^(Apagar dados)$/i.test(b.textContent.trim())) b.style.display = 'none'; });
    /* o grupo do Acervo no índice ganha a edição e a importação */

  }
  D.addEventListener('click', function (e) {
    var a = e.target.closest('[data-cmt-ir],[data-cmt-sair]'); if (!a) return; e.preventDefault(); e.stopPropagation();
    if (a.dataset.cmtSair) { sair(); return; }
    if (a.dataset.cmtModo) entrar(a.dataset.cmtModo, a.dataset.cmtIr); else ir(a.dataset.cmtIr);
  }, true);
  var ag = 0;
  new MutationObserver(function () { if (!ag) ag = requestAnimationFrame(function () { ag = 0; montar(); }); }).observe(D.body, { childList: true, subtree: true });
  function inicio() {
    montar();
    if (D.body.dataset.mod !== 'acervo') { try { showTab('acervo'); } catch (e) {} }
    D.title = 'Ab Initio · Triagem, Sessões e Equipe';
    criarMotor();
    entrar('central');   /* página inicial: o Acervo (página do Acervo Central, com os painéis laterais) */
  }
  W.CMTShell = { entrar: entrar, sair: sair, configuracoes: abrirCfg, recarregar: function () { return alimentarRelatorios(true); } };
  if (D.readyState === 'complete') setTimeout(inicio, 50); else W.addEventListener('load', function () { setTimeout(inicio, 50); });
})(window, document);

/* Ab Initio · Acervo único e Planilha integral.
   A aba Acervo (formato do antigo CMT-Acervo) recebe os painéis da antiga página Início, calculados sobre os mesmos
   registros e sob o mesmo filtro. Regras:
   · coluna principal: PJe, depois Power BI, depois DataJud;
   · situações: o padrão do cartão “Acervo filtrado” passa a ser Ativos (sem arquivados, baixados, cancelados, fora de tramitação e eliminados);
   · processos sem tarefa no PJe ainda não chegaram ao gabinete: painel próprio, fora das contagens;
   · seção pelo assunto do CNJ (apoio/assuntos-cnj.json + apoio/regras/secoes.json, RI TRF3, art. 10);
     a etiqueta de seção do PJe só gera alerta quando diverge;
   · clicar no número abre o cartão do processo (edição no motor); Alt+clique copia o número. */
(function (W, D) {
  'use strict';
  var CNJ = null, REG = null, TPU = '', CAL = null, OPER = null;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var nf = function (v) { return Math.round(v).toLocaleString('pt-BR'); };
  var n1 = function (v) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dig = function (s) { return String(s || '').replace(/\D/g, ''); };
  var txt = function (v) { return v == null ? '' : String(v).trim(); };
  function mw() { var f = D.getElementById('cmt-motor'); try { return f && f.contentWindow; } catch (e) { return null; } }
  function comp() { var w = mw(); return w && w.__painelCentralComponent; }
  function aviso(m) { try { toast(m); } catch (e) { console.log(m); } }

  /* ---------------- colunas principais ---------------- */
  var PRINC = {
    classe: [['classe_judicial', 'PJe'], ['Classe', 'Power BI'], ['DataJud · Classe', 'DataJud']],
    assunto: [['assunto_judicial', 'PJe'], ['Assunto_Principal', 'Power BI'], ['DataJud · Assunto Principal', 'DataJud']],
    ativo: [['polo_ativo', 'PJe'], ['Polo_Ativo', 'Power BI']],
    passivo: [['polo_passivo', 'PJe'], ['Polo_Passivo', 'Power BI']],
    dist: [['data_distribuição', 'PJe'], ['Data_Distribuição', 'Power BI']],
    valor: [['valor_causa', 'PJe'], ['Valor_da_Causa', 'Power BI']]
  };
  function pega(r, k) { var L = PRINC[k]; for (var i = 0; i < L.length; i++) { var v = txt(r[L[i][0]]); if (v) return { v: v, o: L[i][1] }; } return { v: '', o: '' }; }
  function serial(v) {
    if (typeof v === 'number') return v; var s = txt(v), m;
    if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 + 25569;
    if ((m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s))) return Date.UTC(+m[3], +m[2] - 1, +m[1]) / 864e5 + 25569;
    return null;
  }
  function numero(v) { if (typeof v === 'number') return v; var s = txt(v).replace(/[^\d.,-]/g, ''); if (!s) return null; if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); var x = parseFloat(s); return isFinite(x) ? x : null; }

  /* ---------------- seção pelo CNJ ---------------- */
  function codigos(r) {
    var out = [];
    ['DataJud · Código Assunto', 'Código_Assunto_Principal', 'Assuntos_do_Processo'].forEach(function (k) {
      String(r[k] == null ? '' : r[k]).split(/[;,\s]+/).forEach(function (x) { if (/^\d+$/.test(x) && out.indexOf(+x) < 0) out.push(+x); });
    });
    return out;
  }
  function secaoDoAssunto(c) {
    var a = CNJ && CNJ[String(c)]; if (!a) return null;
    for (var i = a.codigos.length - 1; i >= 0; i--) { var g = REG[a.codigos[i]]; if (g) return { secao: g.secao, regra: g, ramo: a.ramo, nome: a.nome }; }
    return { secao: null, ramo: a.ramo, nome: a.nome };
  }
  function secaoEtiqueta(o) {
    var j = o.etq.join(' '), m = (j + ' ').match(/\b([123])\s*[ªa]\s*se[cç][aã]o\b/i) || j.match(/^\s*S([123])\s*$/m);
    return m ? m[1] + 'ª Seção' : '';
  }

  /* ---------------- enriquecimento dos registros do relatório ---------------- */
  var MAPA = new Map(), GERACAO = 0;
  function enriquecer(recs) {
    var c = comp(), rows = (c && c.rows) || [], M = new Map();
    rows.forEach(function (r, i) { var k = dig(r.processo || r.Processo); if (k) M.set(k, i); });
    recs.forEach(function (o) {
      var i = M.get(dig(o.p)), r = i == null ? {} : rows[i];
      o.ri = i; o.cl0 = pega(r, 'classe'); o.as0 = pega(r, 'assunto');
      if (o.cl0.v) o.classe = o.cl0.v; if (o.as0.v) o.assunto = o.as0.v;
      var at = pega(r, 'ativo'), ps = pega(r, 'passivo'); if (at.v) o.ativo = at.v; if (ps.v) o.passivo = ps.v;
      if (typeof o.dd !== 'number') { var dd = pega(r, 'dist'); o.dd = serial(dd.v); }
      if (o.vc == null) o.vc = numero(pega(r, 'valor').v);
      o.cods = codigos(r); o.secEtq = secaoEtiqueta(o); o.ramo = ''; o.secCNJ = ''; o.secOrig = '';
      if (CNJ) {
        for (var k = 0; k < o.cods.length; k++) {
          var s = secaoDoAssunto(o.cods[k]); if (!s) continue;
          if (!o.ramo) { o.ramo = s.ramo; o.assCNJ = s.nome; }
          if (s.secao) { o.secCNJ = s.secao; o.secRegra = s.regra; break; }
        }
      }
      if (o.secCNJ) { o.secao = o.secCNJ; o.secOrig = 'CNJ'; }
      else if (o.secao && o.secao !== 'Sem Seção') o.secOrig = o.secEtq === o.secao ? 'etiqueta' : 'tabela antiga';
      o.secAlerta = !!(o.secCNJ && o.secEtq && o.secEtq !== o.secCNJ);
      o.caminho = !o.tks.length;
      var p1 = txt(r.Pendente_1Julgamento).toLowerCase(); o.pend1 = p1 === 'sim' ? 'sim' : p1 === 'não' || p1 === 'nao' ? 'não' : '';
      o.sel = r['Seleção Prévia'] === 'SELECIONADO PREVIAMENTE';
    });
    MAPA = new Map(recs.map(function (o) { return [dig(o.p), o]; })); GERACAO++;
    return recs;
  }
  var FXI = [[0, 1, '< 1 ano'], [1, 2, '1–2 anos'], [2, 3, '2–3 anos'], [3, 5, '3–5 anos'], [5, 10, '5–10 anos'], [10, 1e9, '≥ 10 anos']];
  var FXT = [[0, 31, 'até 30 dias'], [31, 91, '31–90 dias'], [91, 181, '91–180 dias'], [181, 366, '181–365 dias'], [366, 1e9, '> 1 ano']];
  function idade(o) { var d = acvDays(o.dd); return d == null ? null : d / 365.25; }
  function noTk(o) { var d = o.tks.map(function (x) { return acvDays(x.de); }).filter(function (x) { return x != null && x >= 0; }); return d.length ? Math.max.apply(null, d) : null; }
  function faixa(F, v) { if (v == null) return ''; for (var i = 0; i < F.length; i++) if (v >= F[i][0] && v < F[i][1]) return F[i][2]; return ''; }

  /* ---------------- ganchos no Acervo do index ---------------- */
  function ligar() {
    if (typeof acvBuild !== 'function' || typeof acvMatch !== 'function' || W.__acvUnico) return false;
    W.__acvUnico = true;
    var _b = acvBuild; acvBuild = function (rows) { var r = _b(rows); return r ? enriquecer(r) : r; };
    var _m = acvMatch;
    acvMatch = function (o, f, q) {
      if (f.cam === 'só') { if (!o.caminho) return false; }
      else if (o.caminho && f.cam !== 'com') return false;
      if (f.motor && !f.motor.has(dig(o.p))) return false;
      if (f.ramo && o.ramo !== f.ramo) return false;
      if (f.fxi && faixa(FXI, idade(o)) !== f.fxi) return false;
      if (f.fxt && faixa(FXT, noTk(o)) !== f.fxt) return false;
      if (f.alerta && !o.secAlerta) return false;
      if (f.pend1 && o.pend1 !== f.pend1) return false;
      if (f.sel && !o.sel) return false;
      return _m(o, f, q);
    };
    try { Object.assign(ACV_FIELDS, { motor: 'Filtro do Acervo', ramo: 'Ramo (CNJ)', fxi: 'Idade', fxt: 'Tempo na tarefa', alerta: 'Seção', pend1: '1º julgamento pendente', sel: 'Seleção prévia', cam: 'A caminho do gabinete' }); } catch (e) {}
    /* situações: o padrão passa a ser "Ativos" (sem arquivados, baixados, cancelados, fora de tramitação e eliminados) */
    try {
      var tram = ACS_PRESETS.find(function (x) { return x[0] === 'tram'; }), atv = ACS_PRESETS.find(function (x) { return x[0] === 'ativos'; });
      if (tram) { tram[3] = ACS_DEF.slice(); tram[2] = 'Somente processos em tramitação'; }
      if (atv) atv[2] = 'Sem os encerrados no TRF: arquivados, baixados, cancelados, fora de tramitação e eliminados (padrão)';
      ACS_DEF.splice(0, ACS_DEF.length); ACS_ENC.forEach(function (k) { ACS_DEF.push(k); });
      if (!pref.ui.acsAtivosCMT) { pref.ui.acsAtivosCMT = 1; acsSetHide(ACS_ENC.slice()); }
    } catch (e) { console.warn('[acervo único] padrão de situações', e); }
    var _fl = acvFiltered; acvFiltered = function (extra) {
      if (!D.body.classList.contains('au-pan')) return _fl.apply(this, arguments);
      var f = Object.assign({}, extra || {});
      return (ACV.recs || []).filter(function (o) { return ACS_ENC.indexOf(o.sit) < 0 && acvMatch(o, f, ''); });
    };
    var _r = acvRender; acvRender = function () { var x = _r.apply(this, arguments); try { pintar(); arrumar(); indice(); } catch (e) { console.error('[acervo único]', e); } return x; };
    try { if (!pref.ui.stOpen) { pref.ui.stOpen = true; } } catch (e) {}
    try { var _sh = shRender; shRender = function () { var x = _sh.apply(this, arguments); try { fixarCabecalho(); } catch (e) {} return x; }; } catch (e) {}
    var _ap = acsPanel; acsPanel = function () { var x = _ap.apply(this, arguments); try { arrumar(); indice(); if (D.body.classList.contains('au-pan')) secoesPanorama(); importacaoNaBase(); } catch (e) { console.error('[acervo único]', e); } return x; };
    if (ACV.recs) { try { W.CMTShell.recarregar(); } catch (e) {} }
    return true;
  }

  /* ---------------- desenho dos painéis ---------------- */
  var css = D.createElement('style');
  css.textContent = '#acv-pan .p3-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}#acv-pan .p3-k small em{font-style:normal;font-weight:700}' +
    '#acv-pan .p3-k .up{color:var(--green)}#acv-pan .p3-k .down{color:var(--wine)}' +
    '.au-note{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 0;font-size:12.5px;color:var(--muted)}.au-note .chipbtn.on{background:var(--ink);color:var(--bg)}' +
    '.au-mes{display:flex;align-items:flex-end;gap:3px;height:110px;padding:8px 2px 0}.au-mes i{flex:1;background:var(--m-pje);border-radius:3px 3px 0 0;min-height:2px;position:relative}.au-mes i:hover{opacity:.75}' +
    '.au-mesl{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:4px}' +
    '.au-x{width:100%;border-collapse:collapse;font-size:12.5px}.au-x th,.au-x td{padding:5px 6px;border-bottom:1px solid var(--line);text-align:right}.au-x th:first-child,.au-x td:first-child{text-align:left}' +
    '.au-ses{display:grid;gap:6px}.au-ses div{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:6px 8px;border:1px solid var(--line);border-radius:8px}.au-ses b{font-variant-numeric:tabular-nums}' +
    '.acv-alert{display:inline-block;margin-left:4px;font:700 10px/1 system-ui;color:#fff;background:var(--wine);border-radius:4px;padding:2px 4px;vertical-align:middle}' +
    '#acervo code.acv-p{cursor:pointer}#acervo code.acv-p:hover{text-decoration:underline}' +
    '.cmt-ficha{position:fixed;inset:0;z-index:60;background:rgba(10,20,32,.55);display:none}.cmt-ficha.on{display:block}' +
    '.cmt-ficha .hd{position:fixed;left:4vw;right:4vw;top:4vh;height:48px;background:#0f1f2e;color:#fff;display:flex;align-items:center;gap:12px;padding:0 14px;border-radius:12px 12px 0 0;font:600 13px Figtree,system-ui,sans-serif}' +
    '.cmt-ficha .hd b{letter-spacing:.12em;font-size:11px;color:#e6c27a}.cmt-ficha .hd code{font-size:13px;color:#fff}.cmt-ficha .hd button{margin-left:auto;border:1px solid rgba(255,255,255,.25);background:transparent;color:#d6dde5;border-radius:8px;padding:5px 12px;cursor:pointer;font:600 12.5px inherit}' +
    'body.cmt-ficha-on #cmt-motor{visibility:visible!important;pointer-events:auto!important;z-index:61;top:calc(4vh + 48px);left:4vw;width:92vw;height:calc(92vh - 48px);border-radius:0 0 12px 12px;box-shadow:0 20px 60px rgba(0,0,0,.4)}';
  D.head.appendChild(css);

  function base() { return acvFiltered(); }
  function kpi(t, v, s, c, go) { return '<' + (go ? 'button' : 'div') + ' class="p3-k" style="--fc:var(' + c + ')"' + (go ? ' data-acvset="' + go + '"' : '') + '><span>' + t + '</span><b>' + v + '</b><small>' + s + '</small></' + (go ? 'button' : 'div') + '>'; }
  function compacto(v) { return v >= 1e9 ? n1(v / 1e9) + ' bi' : v >= 1e6 ? n1(v / 1e6) + ' mi' : v >= 1e3 ? n1(v / 1e3) + ' mil' : nf(v); }
  function pintar() {
    var body = $('#acvbody'); if (!body || !ACV.recs) return;
    var pan = $('#acv-pan');
    if (!pan) {
      pan = D.createElement('section'); pan.className = 'blk'; pan.id = 'acv-pan';
      pan.innerHTML = '<h2>Números do acervo <small class="h2s">os números seguem a busca, as situações e os filtros abaixo</small></h2><div class="p3-kpis" id="au-kpi"></div><div class="au-note" id="au-note"></div>';
      var pane = $('#acervo'), head = pane && pane.querySelector('.pane-head'); head ? head.after(pan) : body.prepend(pan);
      var ini = D.createElement('section'); ini.className = 'blk'; ini.id = 'acv-ini';
      ini.innerHTML = '<h2>Indicadores do acervo <small class="h2s">ramo do direito, distribuições, idade, tempo na tarefa, 1º julgamento e sessões · clique numa barra para filtrar</small></h2><div class="acv-ind" id="au-ind"></div>';
      var sit = $('#acv-sit'); sit ? sit.before(ini) : body.appendChild(ini);
      var cam = D.createElement('section'); cam.className = 'blk'; cam.id = 'acv-cam';
      cam.innerHTML = '<h2>A caminho do gabinete <small class="h2s">no Power BI ou no DataJud, ainda sem tarefa no PJe do gabinete (distribuição, UFOR) · fora das contagens</small></h2><div id="au-cam"></div>';
      var out = $('#acv-out'); out ? out.after(cam) : body.appendChild(cam);
    }
    var f = ACV.st.f, all = base();
    var cam2 = acvFiltered({ cam: 'só' });
    /* cartões da antiga página Início */
    var e = new Array(24).fill(0), hoje = new Date(), k0 = hoje.getFullYear() * 12 + hoje.getMonth();
    var idades = [], p1 = 0, p1i = 0, sel = 0, val = 0;
    ACV.recs.forEach(function (o) {   /* distribuições: todo o relatório, inclusive os já baixados (entradas no gabinete) */
      if (o.caminho || typeof o.dd !== 'number') return; var d = new Date((o.dd - 25569) * 864e5), k = d.getUTCFullYear() * 12 + d.getUTCMonth(), j = k - (k0 - 23); if (j >= 0 && j < 24) e[j]++; });
    var maior = 0;
    all.forEach(function (o) {
      if (typeof o.dd === 'number') { var a = idade(o); if (a != null && a >= 0) idades.push(a); }
      if (o.vc > maior) maior = o.vc;
      if (o.pend1) { p1i++; if (o.pend1 === 'sim') p1++; }
      if (o.sel) sel++; if (o.vc > 0) val += o.vc;
    });
    idades.sort(function (a, b) { return a - b; });
    var med = idades.length ? idades[Math.floor((idades.length - 1) / 2)] : null;
    var e12 = e.slice(12).reduce(function (a, b) { return a + b; }, 0);
    var gab = all.filter(function (o) { return o.gab; }).length, alerta = all.filter(function (o) { return o.secAlerta; }).length;
    $('#au-kpi').innerHTML = [
      kpi(acsPresetName ? 'Acervo · ' + acsPresetName() : 'Acervo', nf(all.length), nf(gab) + ' no gabinete · ' + nf(all.length - gab) + ' fora', '--m-acv', null),
      kpi('1º julgamento pendente', nf(p1), 'de ' + nf(p1i) + ' com a informação', '--gold', 'pend1:sim'),
      kpi('Distribuições · 12 meses', nf(e12), 'média de ' + n1(e12 / 12) + ' por mês · todo o relatório', '--m-pje', null),
      kpi('Idade mediana', med == null ? '—' : n1(med) + ' anos', 'desde a distribuição no TRF3', '--plum', null),
      kpi('Seleção prévia', nf(sel), 'selecionados previamente', '--m-eq', 'sel:1'),
      kpi('Valor das causas', 'R$ ' + compacto(val), 'soma do filtro · maior causa R$ ' + compacto(maior), '--green', null),
      kpi('A caminho do gabinete', nf(cam2.length), 'sem tarefa no PJe · fora da conta', '--navy', null),
      kpi('Seção divergente da etiqueta', nf(alerta), 'seção pelo CNJ ≠ etiqueta do PJe', '--wine', 'alerta:1')
    ].join('');
    $('#au-kpi .p3-k:nth-child(7)').setAttribute('data-au-ir', 'acv-cam');
    $('#au-note').innerHTML = '<span>Situações no filtro: <b>' + esc(typeof acsPresetName === 'function' ? acsPresetName() : '') + '</b> · segue a busca e os critérios da Triagem · ' +
      'Seção pelo assunto do CNJ (RI TRF3, art. 10)' + (TPU ? ' · TPU de ' + esc(TPU) : CNJ ? '' : ' · árvore do CNJ não carregada: seção pela etiqueta e pela tabela antiga') + '</span>';
    /* a caminho */
    $('#au-cam').innerHTML = cam2.length ? acvTable(cam2, null, 300) : '<p class="p-empty">Nenhum processo a caminho no filtro atual.</p>';
    /* indicadores da antiga página Início */
    var ind = $('#au-ind'); if (!ind) return;
    ind.innerHTML = '';
    var mesHtml = '<div class="acv-card au-card"><h4>Distribuições por mês<small>24 meses · todo o relatório</small></h4><div class="au-mes">' + e.map(function (v, i) { var k = k0 - 23 + i; return '<i style="height:' + (100 * v / Math.max.apply(null, e.concat(1))) + '%" title="' + ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][k % 12] + '/' + String(Math.floor(k / 12)).slice(2) + ': ' + v + '"></i>'; }).join('') + '</div><div class="au-mesl"><span>' + mesNome(k0 - 23) + '</span><span>' + mesNome(k0 - 11) + '</span><span>' + mesNome(k0) + '</span></div></div>';
    var ordem = function (F) { return function (rows) { return F.map(function (x) { return rows.find(function (r) { return r[0] === x[2]; }); }).filter(Boolean); }; };
    var cross = {}; all.forEach(function (o) { var s = o.secao || 'Sem Seção', c = cross[s] || (cross[s] = { sim: 0, nao: 0, ni: 0 }); c[o.pend1 === 'sim' ? 'sim' : o.pend1 === 'não' ? 'nao' : 'ni']++; });
    var crossHtml = '<div class="acv-card au-card"><h4>1º julgamento por seção</h4><table class="au-x"><thead><tr><th>Seção</th><th>Pendente</th><th>Não</th><th>Sem informação</th></tr></thead><tbody>' +
      Object.keys(cross).sort().map(function (s) { var c = cross[s]; return '<tr><td>' + esc(s) + '</td><td><b>' + nf(c.sim) + '</b></td><td>' + nf(c.nao) + '</td><td>' + nf(c.ni) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var sesHtml = '<div class="acv-card au-card"><h4>Próximas sessões</h4><div class="au-ses">' + proximas() + '</div></div>';
    var html = acvBars('Por ramo do direito (CNJ)', acvCount(all, function (o) { return o.ramo || 'Sem assunto do CNJ'; }), 'ramo', 8, '--m-ref') +
      mesHtml + acvBars('Idade do acervo', ordem(FXI)(acvCount(all, function (o) { return faixa(FXI, idade(o)); })), 'fxi', 6, '--plum') +
      acvBars('Tempo na tarefa atual', ordem(FXT)(acvCount(all, function (o) { return faixa(FXT, noTk(o)); })), 'fxt', 5, '--gold') + crossHtml + sesHtml;
    var tmp = D.createElement('div'); tmp.innerHTML = html;
    [].slice.call(tmp.children).forEach(function (x) { x.classList.add('au-card'); ind.appendChild(x); });
    /* alerta de seção na lista */
    D.querySelectorAll('#acervo code.acv-p').forEach(function (c) { c.title = 'Clique para abrir o cartão do processo · Alt+clique copia o número'; });
    var meta = $('#acvmeta'); if (meta) meta.textContent = 'procs-muta · acervo/fonte.json · ' + nf(ACV.recs.length) + ' processos · ' + nf(all.length) + ' no acervo ativo · atualizado em ' + (ACV.at || '—');
  }
  function mesNome(k) { return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][k % 12] + '/' + String(Math.floor(k / 12)).slice(2); }
  function proximas() {
    var L = CAL && (CAL.sessoes || CAL.registros || []);
    if (!L || !L.length) return '<p class="p-empty">Calendário de sessões não carregado.</p>';
    var hoje = new Date().toISOString().slice(0, 10), cont = {};
    (OPER || []).forEach(function (r) { ((r.pauta && r.pauta.sessoes) || r.pautas || []).forEach(function (p) { cont[p.sessao] = (cont[p.sessao] || 0) + 1; }); });
    var dt = function (s) { return s.date || s.data || ''; };
    var fut = L.filter(function (s) { return dt(s) >= hoje; }).sort(function (a, b) { return dt(a) < dt(b) ? -1 : 1; }).slice(0, 4);
    if (!fut.length) return '<p class="p-empty">Nenhuma sessão futura no calendário.</p>';
    var br = function (d) { return d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '—'; };
    return fut.map(function (s) { var d = dt(s), dias = Math.round((Date.parse(d) - Date.parse(hoje)) / 864e5), pa = (s.marcos && s.marcos.pautarAte) || s.pautarAte, n = cont[d] || s.processos;
      return '<div><span><b>' + br(d) + '</b> · ' + (dias === 0 ? 'hoje' : 'em ' + dias + ' d') + (pa ? ' · peço dia ' + br(pa) + (pa < hoje ? ' (passou)' : '') : '') + '</span><span>' + (n ? nf(n) + ' processos' : '') + '</span></div>'; }).join('');
  }

  /* ---------------- cartão do processo (edição no motor) ---------------- */
  var ficha = null;
  function linhaFicha(r) {
    var A = function (v) { return String(v == null ? '' : v).trim(); };
    var et = A(r.Etiquetas || r.etiquetas).split(/[;,|]/).map(A).filter(Boolean);
    return { p: A(r.Processo || r.processo), classe: A(r['Descrição da Classe'] || r.Classe || r.classe_judicial), assunto: A(r.Assunto || r.assunto_judicial),
      ativo: A(r['Polo Ativo'] || r.Polo_Ativo || r.polo_ativo), passivo: A(r['Polo Passivo'] || r.Polo_Passivo || r.polo_passivo),
      tks: r.tarefa_atual ? [{ t: A(r.tarefa_atual), de: A(r.data_entrada_tarefa) }] : [], etq: et, pri: /sim|true|^1$/i.test(A(r.prioridade)),
      rodape: A(r.ultimo_movimento) ? 'Último movimento: ' + A(r.ultimo_movimento) : '' };
  }
  W.CMTProntuario = W.CMTProntuario || {};
  W.CMTProntuario.fonte = function (p) { var c = comp(); if (!c) return null; var r = c.rows.find(function (x) { return dig(x.processo || x.Processo) === dig(p); }); return r ? linhaFicha(r) : null; };
  function abrirFicha(p, lista) {
    var w = mw(), c = comp(); if (!c || !w) { aviso('O acervo ainda está carregando.'); return; }
    if (W.CMTProntuario && W.CMTProntuario.abrir) { W.CMTProntuario.abrir(p, lista); return; }
    if (D.body.classList.contains('cmt-acv')) { fichaNoLugar(p); return; }
    var i = c.rows.findIndex(function (r) { return dig(r.processo || r.Processo) === dig(p); });
    if (i < 0) { aviso('Processo fora do acervo fonte: ' + p); return; }
    if (!ficha) {
      ficha = D.createElement('div'); ficha.className = 'cmt-ficha';
      ficha.innerHTML = '<div class="hd"><b>CARTÃO DO PROCESSO</b><code></code><button data-fx="1">Fechar ×</button></div>';
      ficha.addEventListener('click', function (e) { if (e.target === ficha || e.target.closest('[data-fx]')) fecharFicha(); });
      D.body.appendChild(ficha);
    }
    ficha.querySelector('code').textContent = c.rows[i].Processo || p;
    try { if (w.CMTMotor) w.CMTMotor.ir('central'); } catch (e) {}
    try { c.openCards.clear(); c.openCards.add(i); c.criteria = []; c.tagFilters.clear(); c.setState({ tab: 'central', search: c.rows[i].Processo || p, showArquivados: true, limit: 60 }); } catch (e) { console.error(e); }
    ficha.classList.add('on'); D.body.classList.add('cmt-ficha-on');
    /* no motor: some o panorama antigo e a tela vai direto ao cartão aberto */
    try {
      var md = w.document;
      if (!md.getElementById('cmt-ficha-css')) { var st = md.createElement('style'); st.id = 'cmt-ficha-css'; st.textContent = 'body.cmt-ficha #pv-stats{display:none!important}'; md.head.appendChild(st); }
      md.body.classList.add('cmt-ficha');
      var num = dig(c.rows[i].Processo || p), n = 0;
      var t = setInterval(function () {
        var el = [].slice.call(md.querySelectorAll('div,span,h3,h4,b,strong')).find(function (e) { return !e.children.length && /^controles de trabalho$/i.test(e.textContent.trim()); });
        var card = el; while (card && card.parentElement && dig(card.textContent).indexOf(num) < 0) card = card.parentElement;
        if (card && card !== md.body) { clearInterval(t); card.scrollIntoView({ block: 'start' }); }
        else if (++n > 20) clearInterval(t);
      }, 150);
    } catch (e) {}
  }
  function fecharFicha() {
    if (ficha) ficha.classList.remove('on'); D.body.classList.remove('cmt-ficha-on');
    try { var c = comp(); c.openCards.clear(); c.setState({ search: '' }); mw().document.body.classList.remove('cmt-ficha'); } catch (e) {}
    try { W.CMTShell.recarregar(); } catch (e) {}
  }
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && D.body.classList.contains('cmt-ficha-on')) fecharFicha(); });
  D.addEventListener('click', function (e) {
    var go = e.target.closest && e.target.closest('[data-au-ir]');
    if (go) { e.preventDefault(); e.stopPropagation(); var el = D.getElementById(go.dataset.auIr); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    var cp = e.target.closest && e.target.closest('#acervo code.acv-p, #cmt-integral code.acv-p, #au-rail code.acv-p, #index code.acv-p');
    if (cp && !e.altKey) { e.preventDefault(); e.stopPropagation(); var tb = cp.closest('tbody,table'); abrirFicha(cp.dataset.acvcp || cp.textContent, tb ? [].slice.call(tb.querySelectorAll('code.acv-p')).map(function (x) { return x.dataset.acvcp || x.textContent; }) : null); }
  }, true);

  /* ---------------- Planilha integral (só leitura) ---------------- */
  var ORIG = [
    ['principal', 'Colunas principais', '#14263c'],
    ['pje', 'PJe · relatório 278', '#3e72ad'],
    ['pbi', 'Power BI', '#d9a046'],
    ['datajud', 'DataJud', '#1fa58a'],
    ['painel', 'Painel do gabinete', '#8a70c0'],
    ['oper', 'Operacional', '#b0524a']
  ];
  var PJE = ['classe_judicial', 'assunto_judicial', 'data_distribuição', 'tarefa_atual', 'data_entrada_tarefa', 'prioridade', 'polo_ativo', 'advogado_pa', 'polo_passivo', 'advogado_pp', 'dpu', 'mpf', 'valor_causa', 'ultimo_movimento', 'dt_distribuicao_1g', 'etiquetas'];
  var PBI_INI = 'Ano', PBI_FIM = 'Consta_Acervo_Sigiloso';
  var IT = { q: '', lim: 200, ocultos: {}, cols: null };
  function origemDe(k, ordem) {
    if (/^DataJud · /.test(k)) return 'datajud';
    if (PJE.indexOf(k) >= 0) return 'pje';
    var a = ordem.indexOf(PBI_INI), b = ordem.indexOf(PBI_FIM), i = ordem.indexOf(k);
    if (a >= 0 && i >= a && i <= b) return 'pbi';
    return 'painel';
  }
  function colunasIntegral() {
    var c = comp(), rows = (c && c.rows) || [], ordem = [], visto = {};
    ((c && c.columnConfig && c.columnConfig.central) || []).forEach(function (k) { if (!visto[k]) { visto[k] = 1; ordem.push(k); } });
    var FON = ["Processo", "AJG", "DPU (controle)", "ID do Parecer MPF", "Alegações", "Assunto", "Seção Competente", "Etiquetar", "Etiquetas", "Tema", "Observações", "SERVIDOR", "JULGAMENTO", "Tempestividade", "Preparo", "Regularidade", "Representação", "ID da Procuração", "Mídias", "Impedimento / Suspeição", "META", "MPF", "MPF - Custos Legis", "Prelim.", "Observação Complementar", "O que falta sanar", "Refinado", "Conferido", "Tipo de Voto", "MINUTADO", "CORRETOR", "CORRIGIDO", "LIBERADO", "classe_judicial", "assunto_judicial", "data_distribuição", "tarefa_atual", "data_entrada_tarefa", "prioridade", "polo_ativo", "advogado_pa", "polo_passivo", "advogado_pp", "dpu", "mpf", "valor_causa", "ultimo_movimento", "dt_distribuicao_1g", "Ano", "Mês", "Gabinete", "Data_Distribuição", "Código_Classe", "Classe", "Código_Assunto_Principal", "Assunto_Principal", "Assuntos_do_Processo", "Pendente_1Julgamento", "Conclusão?", "Data_Conclusão", "Data_Fase", "Fase", "Complemento", "Última_Movimentação", "Data_Última_Movimentação", "Tempo_de_Tramitação", "Polo_Ativo", "Polo_Passivo", "Seção de Origem", "Valor_da_Causa", "DAT_FIM", "SIN_PRAZO_LEGAL", "SIN_SECRETARIA", "SIN_CONTADORIA", "SIN_REM_EXTERNA", "SIN_UFOR", "BASE", "K_TEMPO", "Nível_Sigilo", "Tempo_Última_Movimentação", "SIN_PEND_1JULG", "SIN_CLS", "DES_ULTIMA_MOVIME_SIGILO", "Consta_Acervo_Gab_A", "Consta_Acervo_Sigiloso", "Dificuldade", "Intercorrências", "Observação do Impedimento", "Observação MPF", "Custos Legis - Outros", "Descrição da Preliminar", "Relatório Padronizado", "Adequação Ementa", "Formatação Subementa", "Sentença - Decisão", "Sentença - Honorários", "Voto - Resultado", "Voto - Honorários", "Voto - Descrição", "Voto - Tópico", "Tópico-síntese", "Rev - Ementa", "Rev - Subementa", "Rev - IDs", "Rev - Mérito", "Rev - Honorários", "Rev - Atenção", "Rev - Nota de atenção", "Nova sessão de destino", "Motivo da remarcação", "Sessão original", "Histórico", "Sentença - Resultado", "Sentença - Qualificação", "Sentença - Contexto", "Sentença - Fundamento", "Sentença - Providências", "Sentença - Custas", "Sentença - Info adicional", "Sentença - ID", "Sentença - Sem ID", "Rel - Tipo", "Rel - Abertura", "Rel - Fecho", "Contrarrazões - Padrão", "Contrarrazões - Situação", "MPF - Sem ID", "MPF - Info adicional", "Parecer - Sentido", "Parecer - Sentido (outro)", "Recorrente", "Recorrente - Artigo", "Recurso - ID", "Recurso - Sem ID", "Pedido recursal", "Contrarrazões - Parte", "Contrarrazões - ID", "Memoriais - Posição", "Outros - Posição", "Relatório (texto)", "Sub-ementa (texto)", "Voto", "Sessões", "Contrarrazões", "Contrarrazões Ausentes", "Descrição das Alegações", "Descrição das Contrarrazões", "Mídias Necessárias", "Memoriais", "Memoriais - Parte", "Memoriais - ID", "Memoriais - Descrição", "Outros Documentos", "Outros - Peça", "Outros - ID", "Outros - Descrição", "Outras Peças", "Controladores", "Intervenção MPF", "Numeração Prévia", "Item (Pauta de Julgamento)", "Sessão Destino", "Seleção Prévia", "Status de Julgamento", "etiquetas", "Regularidade Manual", "Etiquetas Operacionais", "Etiquetas Originais", "Indicador", "Qtde", "DataJud · Classe", "DataJud · Código Classe", "DataJud · Assunto Principal", "DataJud · Código Assunto", "DataJud · Assuntos", "DataJud · Órgão Julgador", "DataJud · Código Órgão", "DataJud · Ajuizamento", "DataJud · Graus", "DataJud · Situação", "DataJud · Conferir", "DataJud · Última coleta", "DataJud · Último movimento", "DataJud · Data movimento"];
    FON.forEach(function (k) { if (!visto[k]) { visto[k] = 1; ordem.push(k); } });
    rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (!visto[k] && k[0] !== '_') { visto[k] = 1; ordem.push(k); } }); });
    var ref = FON.length ? FON : ordem;
    var P = [
      { k: '·p', t: 'Processo', g: 'principal', v: function (o) { return o.p; } },
      { k: '·sit', t: 'Situação', g: 'principal', v: function (o) { return o.caminho ? 'A caminho do gabinete' : SIT_BY[o.sit].t; } },
      { k: '·loc', t: 'Local', g: 'principal', v: function (o) { return o.caminho ? 'Ainda não chegou' : o.gab ? 'Gabinete' : 'Fora'; } },
      { k: '·cl', t: 'Classe', g: 'principal', v: function (o) { return o.classe; }, o: function (o) { return o.cl0 && o.cl0.o; } },
      { k: '·as', t: 'Assunto', g: 'principal', v: function (o) { return o.assunto; }, o: function (o) { return o.as0 && o.as0.o; } },
      { k: '·ramo', t: 'Ramo (CNJ)', g: 'principal', v: function (o) { return o.ramo; } },
      { k: '·sec', t: 'Seção', g: 'principal', v: function (o) { return o.secao === 'Sem Seção' ? '' : o.secao; }, o: function (o) { return o.secOrig; } },
      { k: '·sece', t: 'Seção pela etiqueta', g: 'principal', v: function (o) { return o.secEtq; } },
      { k: '·at', t: 'Polo ativo', g: 'principal', v: function (o) { return o.ativo; } },
      { k: '·ps', t: 'Polo passivo', g: 'principal', v: function (o) { return o.passivo; } },
      { k: '·dd', t: 'Distribuição', g: 'principal', v: function (o) { return typeof o.dd === 'number' ? acvDate(o.dd) : ''; } }
    ];
    var resto = ordem.filter(function (k) { return k !== 'Processo' && k !== 'processo'; }).map(function (k) { return { k: k, t: k, g: origemDe(k, ref), raw: 1 }; });
    var gi = function (g) { return ORIG.findIndex(function (x) { return x[0] === g; }); };
    resto.sort(function (a, b) { return gi(a.g) - gi(b.g); });
    var op = [{ k: '·pautas', t: 'Sessões por que passou', g: 'oper', v: function (o) { var r = OPER && OPER.find(function (x) { return dig(x.processo) === dig(o.p); }); return r ? ((r.pauta && r.pauta.sessoes) || r.pautas || []).map(function (p) { return p.sessao.split('-').reverse().join('/') + (p.item ? ' · item ' + p.item : '') + (p.resultado ? ' · ' + p.resultado : ''); }).join(' | ') : ''; } }];
    return P.concat(resto, op);
  }
  function valor(c, o, r) {
    if (!c.raw) return c.v(o);
    var v = r[c.k]; if (v == null) return ''; if (typeof v === 'object') return JSON.stringify(v); return String(v);
  }
  function linhasIntegral() {
    var c = comp(), rows = (c && c.rows) || [], q = IT.q.trim().toLowerCase();
    var L = (ACV.recs || []).slice();
    if (q) L = L.filter(function (o) { var r = rows[o.ri] || {}; return (o.p + ' ' + o.classe + ' ' + o.assunto + ' ' + o.ativo + ' ' + o.passivo + ' ' + Object.keys(r).map(function (k) { var v = r[k]; return v == null || typeof v === 'object' ? '' : v; }).join(' ')).toLowerCase().indexOf(q) >= 0; });
    return L;
  }
  function pintarIntegral() {
    var box = $('#cmt-integral .it-wrap'); if (!box) return;
    if (!ACV.recs) { box.innerHTML = '<p class="p-empty" style="padding:20px">O acervo ainda está carregando…</p>'; return; }
    var c = comp(), rows = (c && c.rows) || [];
    if (!IT.cols) IT.cols = colunasIntegral();
    var cols = IT.cols.filter(function (x) { return x.g === 'principal' && x.k === '·p' || !IT.ocultos[x.g]; });
    var L = linhasIntegral(), V = L.slice(0, IT.lim);
    $('#cmt-integral .it-n').textContent = nf(L.length) + ' de ' + nf(ACV.recs.length) + ' processos · ' + nf(cols.length) + ' colunas';
    var grupos = []; cols.forEach(function (x) { var u = grupos[grupos.length - 1]; if (u && u.g === x.g) u.n++; else grupos.push({ g: x.g, n: 1 }); });
    var cor = function (g) { return (ORIG.find(function (x) { return x[0] === g; }) || [])[2]; };
    var nome = function (g) { return (ORIG.find(function (x) { return x[0] === g; }) || [])[1]; };
    var h1 = grupos.map(function (x, i) { return '<th colspan="' + x.n + '" class="it-g' + (i === 0 ? ' it-fix' : '') + '" style="--gc:' + cor(x.g) + '">' + esc(nome(x.g)) + '</th>'; }).join('');
    var h2 = cols.map(function (x, i) { return '<th class="' + (i === 0 ? 'it-fix' : '') + '" style="--gc:' + cor(x.g) + '">' + esc(x.t) + '</th>'; }).join('');
    var body = V.map(function (o) { var r = rows[o.ri] || {};
      return '<tr>' + cols.map(function (x, i) {
        if (i === 0) return '<td class="it-fix"><code class="acv-p" data-acvcp="' + esc(o.p) + '">' + esc(o.p) + '</code></td>';
        var v = valor(x, o, r), org = x.o ? x.o(o) : '';
        return '<td title="' + esc(v) + (org ? ' · origem: ' + esc(org) : '') + '">' + esc(v.length > 120 ? v.slice(0, 119) + '…' : v) + (org && org !== 'PJe' && org !== 'CNJ' ? '<sup>' + esc(org) + '</sup>' : '') + '</td>'; }).join('') + '</tr>'; }).join('');
    box.innerHTML = '<table class="it-t"><thead><tr>' + h1 + '</tr><tr>' + h2 + '</tr></thead><tbody>' + body + '</tbody></table>' + (L.length > V.length ? '<div class="it-more">carregando mais… (' + nf(V.length) + ' de ' + nf(L.length) + ')</div>' : '');
    var more = box.querySelector('.it-more');
    if (more) new IntersectionObserver(function (en, ob) { if (en.some(function (x) { return x.isIntersecting; })) { ob.disconnect(); IT.lim += 200; pintarIntegral(); } }, { root: box, rootMargin: '300px' }).observe(more);
  }
  var cssI = D.createElement('style');
  cssI.textContent = '#cmt-integral{position:fixed;top:56px;left:232px;right:0;bottom:0;background:var(--bg,#f4f2ed);z-index:39;display:none;flex-direction:column;padding:14px 18px 10px;gap:10px}' +
    'body.ix-min #cmt-integral{left:0}body.cmt-int-on #cmt-integral{display:flex}body.cmt-int-on #main>.tabpane,body.cmt-int-on #rail{visibility:hidden}body.cmt-int-on #cmt-motor{visibility:hidden!important;pointer-events:none!important}' +
    'body.cmt-int-on #index .ix-g{display:none!important}body.cmt-int-on #index .ix-g.it-ix{display:block!important}' +
    '#cmt-integral h1{margin:0;font:700 22px Figtree,system-ui,sans-serif}#cmt-integral .it-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}#cmt-integral .it-bar input[type=search]{min-width:320px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card,#fff);color:inherit}' +
    '#cmt-integral .it-bar label{font-size:12.5px;display:flex;gap:5px;align-items:center;padding:4px 9px;border-radius:999px;border:1px solid var(--line)}#cmt-integral .it-bar label i{width:9px;height:9px;border-radius:50%;background:var(--gc)}' +
    '#cmt-integral .it-n{margin-left:auto;font-size:12.5px;color:var(--muted)}#cmt-integral .it-wrap{flex:1;overflow:auto;border:1px solid var(--line);border-radius:10px;background:var(--card,#fff)}' +
    '.it-t{border-collapse:separate;border-spacing:0;font-size:12px}.it-t th,.it-t td{padding:5px 8px;border-bottom:1px solid var(--line);border-right:1px solid var(--line);white-space:nowrap;max-width:280px;overflow:hidden;text-overflow:ellipsis;text-align:left}' +
    '.it-t thead tr:first-child th{position:sticky;top:0;z-index:3;background:var(--gc);color:#fff;font-weight:700;letter-spacing:.04em;font-size:11px}.it-t thead tr:nth-child(2) th{position:sticky;top:25px;z-index:3;background:var(--card,#fff);box-shadow:inset 0 -3px 0 var(--gc);font-weight:700}' +
    '.it-t .it-fix{position:sticky;left:0;z-index:2;background:var(--card,#fff)}.it-t thead .it-fix{z-index:4}.it-t sup{font-size:9px;color:var(--muted);margin-left:3px}.it-t tbody tr:hover td{background:rgba(62,114,173,.07)}.it-more{padding:10px;color:var(--muted);font-size:12px}';
  D.head.appendChild(cssI);
  function montarIntegral() {
    var nav = $('nav.mods'); if (!nav || nav.querySelector('[data-cmt-int]')) return;
    var b = D.createElement('button'); b.className = 'mod'; b.dataset.cmtInt = '1'; b.style.setProperty('--m', 'var(--m-ref)'); b.textContent = 'Planilha integral';
    b.addEventListener('click', abrirIntegral);
    b.style.display = 'none';
    nav.appendChild(b);
    var pane = D.createElement('div'); pane.id = 'cmt-integral';
    pane.innerHTML = '<h1>Planilha integral <small style="font-size:13px;font-weight:500;color:var(--muted)">todas as colunas do acervo fonte e do operacional · só leitura · clique no número para abrir o cartão</small></h1>' +
      '<div class="it-bar"><input type="search" placeholder="Buscar em todas as colunas…" aria-label="Buscar na planilha integral">' + ORIG.slice(1).map(function (x) { return '<label style="--gc:' + x[2] + '"><input type="checkbox" checked data-itg="' + x[0] + '"><i></i>' + x[1] + '</label>'; }).join('') + '<select data-itir aria-label="Ir para o grupo de colunas"><option value="">Ir para o grupo…</option>' + ORIG.slice(1).map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('') + '</select><span class="it-n"></span></div><div class="it-wrap"></div>';
    D.body.appendChild(pane);
    var qT; pane.querySelector('input[type=search]').addEventListener('input', function (e) { clearTimeout(qT); qT = setTimeout(function () { IT.q = e.target.value; IT.lim = 200; pintarIntegral(); }, 220); });
    pane.addEventListener('change', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-itir')) { var go = e.target.value; e.target.value = ''; if (!go) return; var th = [].slice.call(pane.querySelectorAll('.it-t thead tr:nth-child(2) th')), ix = IT.cols ? IT.cols.filter(function (x) { return x.k === '·p' || !IT.ocultos[x.g]; }).findIndex(function (x) { return x.g === go; }) : -1; if (ix > 0 && th[ix]) pane.querySelector('.it-wrap').scrollTo({ left: th[ix].offsetLeft - th[0].offsetWidth, behavior: 'smooth' }); return; } var g = e.target.dataset && e.target.dataset.itg; if (!g) return; IT.ocultos[g] = !e.target.checked; pintarIntegral(); });
    var ix = $('#index'); if (ix) { var gI = D.createElement('div'); gI.className = 'ix-g it-ix cur'; gI.innerHTML = '<button>Planilha integral</button><ul>' + ORIG.map(function (x) { return '<li><a href="#" data-itgo="' + x[0] + '"><i></i>' + x[1] + '</a></li>'; }).join('') + '</ul>'; ix.appendChild(gI);
      gI.addEventListener('click', function (e) { var a = e.target.closest('[data-itgo]'); if (!a) return; e.preventDefault(); var th = [].slice.call(pane.querySelectorAll('.it-t thead tr:nth-child(2) th')), i = IT.cols ? IT.cols.filter(function (x) { return x.k === '·p' || !IT.ocultos[x.g]; }).findIndex(function (x) { return x.g === a.dataset.itgo; }) : -1; if (i > 0 && th[i]) pane.querySelector('.it-wrap').scrollTo({ left: th[i].offsetLeft - th[0].offsetWidth, behavior: 'smooth' }); }); }
  }
  function abrirIntegral() {
    try { if (D.body.classList.contains('cmt-cfg-on')) D.querySelector('[data-cfg="fechar"]').click(); } catch (e) {}
    try { W.CMTShell.sair(); } catch (e) {}
    D.body.classList.remove('cmt-blo-on'); D.body.classList.add('cmt-int-on');
    D.querySelectorAll('nav.mods .mod').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === 'acervo'); });
    IT.cols = null; IT.lim = 200; pintarIntegral();
  }
  D.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('nav.mods .mod'); if (b && !b.dataset.cmtInt && b.dataset.tab !== 'acervo') { D.body.classList.remove('cmt-int-on', 'cmt-blo-on'); var i = $('nav.mods [data-cmt-int]'); if (i) i.classList.remove('on'); } }, true);

  /* ---------------- organização da página Acervo ----------------
     Ordem: 1) Panorama geral (todo o relatório, recolhível) · 2) Estatísticas do filtro · 3) Filtros
     (Acervo filtrado à esquerda; busca e construtor de critérios à direita) · 4) Resultados (Painéis ou Planilha).
     As peças do antigo CMT-Acervo continuam dentro do #acspanel (os cliques delas dependem disso);
     a ordem na tela vem da grade do #acvbody. Importar e exportar ficam no painel lateral. */
  var LS_GERAL = 'cmt_acv_geral_min', LS_IND = 'cmt_acv_ind_min';
  var ls = { get: function (k) { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } }, set: function (k, v) { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) {} } };
  var cssO = D.createElement('style');
  cssO.textContent =
    /* grade e ordem */
    '#acvbody{display:grid;grid-template-columns:minmax(260px,300px) minmax(0,1fr);column-gap:14px;row-gap:14px;align-items:start}' +
    ':where(#acvbody>*,#acspanel>*,#acspanel .acs-flow>*,#acspanel .dp>*,#acspanel .acs-top>*,#acspanel .dp-stats>*,#acspanel .dp-g>*){grid-column:1/-1;order:90;min-width:0}' +
    '#acvbody #acspanel,#acvbody #acspanel .acs-flow,#acvbody #acspanel .dp,#acvbody #acspanel .acs-top,#acvbody #acspanel .dp-stats,#acvbody #acspanel .dp-g{display:contents!important}' +
    '#acvbody .fl-ch,#acvbody .fl-age,#acvbody #falist{grid-column:1/-1!important;width:auto!important;max-width:none!important}#acvbody .dp-h{display:none!important}#acvbody .fl-ch{order:10}#acvbody .fl-age{order:25}#acvbody #falist{order:26}' +
    '#acvbody .fl-ch,#acvbody .fl-age{background:var(--card,#fff)!important;border:1px solid var(--line)!important;border-radius:14px!important;padding:14px 16px!important;margin:0!important;box-sizing:border-box}' +
    '#acvbody .acs-build,#acvbody .acs-srch,#acvbody .acs-count{min-width:0!important;max-width:100%;box-sizing:border-box}#acvbody .acs-build{overflow-x:auto}' +
    '#acvbody .acs-count{align-self:start;height:auto!important}#acvbody .acs-build .acs-cols{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))!important}#acvbody .acs-build .acs-cols>*,#acvbody .acs-build label{min-width:0!important}#acvbody .acs-build .acs-bh,#acvbody .acs-build .est-h{flex-wrap:wrap;row-gap:2px}#acvbody .acs-build em{white-space:normal}#acvbody .acs-build .est-g{flex-wrap:wrap}#acvbody .acs-build label,#acvbody .acs-build .acs-vals{grid-template-columns:minmax(0,1fr)!important}#acvbody .acs-build select,#acvbody .acs-build input,#acvbody .acs-build textarea{max-width:100%;min-width:0;box-sizing:border-box}' +
    '#acvbody .dp-stats{order:10}#acvbody .dp-more{order:11}' +
    '#acvbody .au-h[data-r="filtro"]{order:20}#acvbody #acv-pan{order:21}#acvbody .acs-stats{order:22}#acvbody #acskslot{order:23}#acvbody #acv-ini{order:24}' +
    '#acvbody .au-busca{order:30}' +
    '.au-busca{background:var(--card,#fff);border:1px solid var(--line);border-radius:16px;padding:16px 18px;box-shadow:0 1px 2px rgba(0,0,0,.04)}' +
    '.au-busca>.au-bh{display:flex;align-items:baseline;gap:12px;margin:0 0 12px;padding-bottom:10px;border-bottom:1px solid var(--line)}.au-busca>.au-bh h2{margin:0;font:700 19px Figtree,system-ui,sans-serif}.au-busca>.au-bh small{color:var(--muted);font-size:12.5px}.au-busca>.au-bh .n{margin-left:auto;font:700 13px Figtree,system-ui,sans-serif}' +
    '.au-bg{display:grid;grid-template-columns:minmax(240px,280px) minmax(0,1fr);gap:16px;align-items:start}.au-bg>.au-bl{border-right:1px solid var(--line);padding-right:16px}.au-bg>.au-br{display:flex;flex-direction:column;gap:14px;min-width:0}' +
    '.au-busca .acs-count,.au-busca .acs-srch,.au-busca .acs-build{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0!important;position:static!important;min-width:0!important}' +
    '.au-busca .acs-build{border-top:1px dashed var(--line)!important;padding-top:12px!important}' +
    '.au-tags{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}.au-tags-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-bottom:8px}.au-tags-h b{font:800 11px Figtree,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--gold,#8a6116)}.au-tags-h small{color:var(--muted);font-size:12px}' +
    '.au-tags-h input{margin-left:auto;min-width:200px;padding:5px 9px;border:1px solid var(--line);border-radius:8px;background:var(--card,#fff);color:inherit;font:12.5px Figtree,system-ui,sans-serif}.au-tags-h button{border:1px solid var(--line);background:transparent;color:inherit;border-radius:999px;padding:4px 11px;font:700 11.5px Figtree,system-ui,sans-serif;cursor:pointer}' +
    '.au-tgrid{display:flex;flex-wrap:wrap;gap:6px;max-height:none}.au-tags:not(.aberto) .au-tgrid{max-height:76px;overflow:hidden}.au-tgrid button{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--card,#fff);color:inherit;border-radius:999px;padding:3px 10px;font:600 12px Figtree,system-ui,sans-serif;cursor:pointer}' +
    '.au-tgrid button b{font-size:11px;color:var(--muted)}.au-tgrid button.on{background:var(--ink,#14263c);color:var(--bg,#fff);border-color:var(--ink,#14263c)}.au-tgrid button.on b{color:inherit}.au-tgrid button:hover{border-color:var(--gold,#c4953c)}' +
    /* painel lateral direito: contagens e indicadores do filtro no lugar das Referências rápidas */
    'body:not(.rail-min):not(.cmt-modo):not(.cmt-int-on){--rlw:440px}' +
    '#rail .atl{display:none!important}#au-rail{padding:14px 14px 30px}#au-rail .au-rh{display:flex;align-items:baseline;gap:8px;margin:0 0 10px}#au-rail .au-rh b{font:800 11px Figtree,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--gold,#8a6116)}#au-rail .au-rh small{color:var(--muted);font-size:12px}' +
    '#au-rail #acv-general-stats{margin:0 0 14px}#au-rail #acv-general-stats>summary{display:none}#au-rail #acvkpi{display:grid!important;grid-template-columns:1fr;gap:10px}#au-rail #acvkpi .kg-b{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#au-rail #acvkpi .p3-k{min-width:0}' +
    '#au-rail #acv-ini{margin:0}#au-rail #au-ind{display:grid!important;grid-template-columns:1fr!important;gap:10px}#au-rail #acv-ini .au-h{margin:6px 0 10px}#au-rail #acv-ini .au-h h2{font-size:16px}#au-rail #acv-ini .au-h small{display:none}#au-rail .acv-card{margin:0}' +
    'body.cmt-modo #au-rail,body.cmt-int-on #au-rail{display:none}' +
    '#au-rail{overflow-x:clip;box-sizing:border-box}#au-rail .au-rc,#au-rail #acv-ini,#au-rail #au-ind,#au-rail .acv-card,#au-rail .acv-bars,#au-rail .acv-bar{min-width:0!important;max-width:100%!important;box-sizing:border-box}#au-rail #au-ind{grid-template-columns:minmax(0,1fr)!important}' +
    '#au-rail .acv-bar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}#au-rail .acv-card{padding:12px 12px!important}#au-rail .au-x{font-size:12px}#au-rail .au-x th,#au-rail .au-x td{padding:4px 4px}' +
    '.au-busca .acs-srch,.au-busca .acs-build,.au-busca .acs-count{flex:none!important;height:auto!important;align-self:stretch;margin-top:0!important}.au-busca .au-br{justify-content:flex-start}' +
    '.au-h h2{white-space:nowrap}.au-h small{flex:1;min-width:180px}.au-h{flex-wrap:wrap}' +
    '#au-rail .au-rh{position:sticky;top:0;z-index:5;background:var(--bar,#0f1f2e);margin:-14px -14px 12px;padding:14px 56px 14px 18px;min-height:20px}#au-rail .au-rh small{color:#9fb0c0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}#au-rail .au-rh b{white-space:nowrap}#au-rail .au-rh{display:flex!important;align-items:center!important;height:46px;box-sizing:border-box;padding-top:0!important;padding-bottom:0!important}' +
    '#acvbody .au-h[data-r="res"]{order:40}#acvbody #acv-sheet{order:42}#acvbody #acv-sit{order:43}#acvbody #acv-gab{order:44}#acvbody #acvlist-sec{order:45}#acvbody #acv-out{order:46}#acvbody #acv-cam{order:47}' +
    /* cartões: o #acspanel deixa de ser uma caixa só; cada peça vira um cartão */
    '#acvbody .acs-count,#acvbody .acs-srch,#acvbody .acs-build,#acvbody .acs-stats{background:var(--card,#fff);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:0}' +
    '#acvbody .acs-count{position:sticky;top:70px}#acvbody .acs-build{margin-top:-2px}' +
    /* títulos das regiões */
    '.au-h{display:flex;align-items:center;gap:12px;margin:10px 0 0;padding:0 2px;border-bottom:1px solid var(--line);padding-bottom:8px}' +
    '.au-h h2{margin:0;font:700 19px Figtree,system-ui,sans-serif;letter-spacing:-.01em}.au-h small{color:var(--muted);font-size:12.5px}' +
    '.au-h .au-tg{margin-left:auto;border:1px solid var(--line);background:var(--card,#fff);color:inherit;border-radius:999px;padding:4px 12px;font:600 12px Figtree,system-ui,sans-serif;cursor:pointer}' +
    '.au-h .acs-view,.au-h .acs-foot-v{margin-left:auto}' +
    '#acervo>.au-h{margin:4px 0 12px}' +
    /* panorama geral recolhível */
    'body.au-geral-min #tk-panorama,body.au-geral-min #acvbody .fl-ch,body.au-geral-min #acvbody .dp-more{display:none!important}' +
    'body.au-ind-min #acv-ini #au-ind{display:none}#acv-ini>h2{display:none!important}' +
    /* sobras e duplicidades */
    '#acvbody .dp-src{display:none!important}#tk-panorama .au-oculto{display:none!important}#acvbody .acs-foot{display:none!important}' +
    '#acv-pan>h2{display:none!important}#acv-pan{margin:0}' +
    'body.au-planilha #acv-cam,body.au-planilha #acv-sit,body.au-planilha #acv-gab,body.au-planilha #acv-out,body.au-planilha #acvlist-sec{display:none!important}' +
    /* índice lateral: só o bloco de dados, sem sumário */
    '#index .ix-g.it-ix{display:none!important}body.cmt-int-on #index .ix-g.it-ix{display:block!important}' +
    '#index .ix-g[data-tab="acervo"]>ul{display:none!important}' +
    '.au-side{margin:6px 12px 14px;padding:12px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.04);color:#d6dde5;font:500 12.5px/1.45 Figtree,system-ui,sans-serif}' +
    '.au-side .k{display:block;font:700 10.5px Figtree,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#e6c27a;margin:10px 0 6px}.au-side .k:first-child{margin-top:0}' +
    '.au-side .n{font:700 20px Figtree,system-ui,sans-serif;color:#fff}.au-side .s{display:block;color:#9fb0c0;font-size:11.5px}' +
    '.au-side button,.au-side label{display:block;width:100%;text-align:left;margin:5px 0 0;padding:7px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#eef2f5;font:600 12.5px Figtree,system-ui,sans-serif;cursor:pointer}' +
    '.au-side button:hover,.au-side label:hover{background:rgba(255,255,255,.08)}.au-side .pri{background:#c4953c;border-color:#c4953c;color:#14263c}.au-side .pri:hover{background:#d3a54d}';
  D.head.appendChild(cssO);
  var cssL = D.createElement('style');
  cssL.textContent =
    /* larguras dos painéis: normal e estendida (só na aba Acervo) */
    'body:not(.cmt-modo):not(.cmt-int-on):not(.ix-min){--ixw:340px}body.au-ix-ext:not(.cmt-modo):not(.cmt-int-on):not(.ix-min){--ixw:min(600px,36vw)}' +
    'body:not(.rail-min):not(.cmt-modo):not(.cmt-int-on){--rlw:440px}body.au-rl-ext:not(.rail-min):not(.cmt-modo):not(.cmt-int-on){--rlw:min(700px,40vw)}' +
    /* painel esquerdo */
    '.au-ixbar{margin:4px 12px 8px}.au-ixbar button{width:100%;border:1px dashed rgba(255,255,255,.25);background:transparent;color:#cfd8e1;border-radius:8px;padding:5px 8px;font:600 11.5px Figtree,system-ui,sans-serif;cursor:pointer}.au-ixbar button:hover{background:rgba(255,255,255,.06)}' +
    '.au-tk{margin:0 12px 12px}.au-tk #tk-panorama{margin:0!important}.au-tk #tkimp{padding:12px!important;border-radius:12px!important;margin:0!important;color:var(--ink);background:var(--card,#fff)}' +
    '.au-tk .tkc-top{flex-wrap:wrap;gap:4px 8px}.au-tk .tkc-top h3,.au-tk .tkc-top b{font-size:14px}.au-tk .tkc-bar{display:grid!important;grid-template-columns:1fr!important;gap:8px}.au-tk .tkc-sb{min-width:0}' +
    '.au-tk .sit{grid-template-columns:1fr!important}.au-tk .sit-l,.au-tk .sit-grid{grid-template-columns:1fr!important}.au-tk #tksit [class*="grid"]{grid-template-columns:1fr!important}' +
    'body.au-ix-ext .au-tk .tkc-bar{grid-template-columns:auto 1fr!important}body.au-ix-ext .au-tk .sit-l,body.au-ix-ext .au-tk .sit-grid,body.au-ix-ext .au-tk #tksit [class*="grid"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}' +
    '#acervo>#tk-leitura{margin:0 0 14px;background:var(--card,#fff);border:1px solid var(--line);border-radius:14px;padding:14px 16px}body.au-geral-min #acervo>#tk-leitura{display:none!important}' +
    '#acvbody .fl-age,#acvbody #falist{display:none!important}body.au-rl-ext #au-rail .au-dupla{grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)}' +
    /* painel direito: fundo, cabeçalho e seções */
    '#au-rail{padding:14px 14px 40px}#au-rail .au-rh{gap:10px}#au-rail .au-rh b{color:#e6c27a!important}#au-rail .au-ext{margin-left:auto;border:1px solid rgba(255,255,255,.25);background:transparent;color:#d6dde5;border-radius:999px;padding:3px 10px;font:700 11px Figtree,system-ui,sans-serif;cursor:pointer;white-space:nowrap}' +
    '#au-rail .au-rs{background:var(--card,#fff);border:1px solid var(--line);border-radius:14px;padding:12px;margin:0 0 12px;box-shadow:0 1px 2px rgba(15,31,46,.05)}' +
    '#au-rail .au-rs>h3{display:flex;align-items:center;gap:8px;margin:0 0 10px;font:800 10.5px Figtree,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}#au-rail .au-rs>h3 .au-xls{margin-left:auto;border:1px solid var(--line);background:transparent;color:inherit;border-radius:999px;padding:2px 9px;font:700 10.5px Figtree,system-ui,sans-serif;letter-spacing:0;text-transform:none;cursor:pointer}' +
    '#au-rail #acv-pan .p3-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px}#au-rail #acv-pan .au-note{font-size:11.5px}#au-rail #acv-pan .p3-k{padding:10px 12px}#au-rail #acv-pan .p3-k b{font-size:20px}' +
    'body.au-rl-ext #au-rail #acv-pan .p3-kpis{grid-template-columns:repeat(4,minmax(0,1fr))!important}' +
    '#au-rail #acv-general-stats{border:0!important;box-shadow:none!important;padding:0!important;margin:0!important;background:transparent!important}' +
    '#au-rail .acs-stats{background:transparent!important;border:0!important;padding:0!important;margin:0!important;box-shadow:none!important}#au-rail .acs-stats .st-hd,#au-rail .acs-stats .st-tags,#au-rail .acs-stats .st-age{display:none!important}#au-rail .au-dupla .st-age{display:block!important}' +
    '#au-rail .acs-stats .st-row,#au-rail .acs-stats .st-ind,#au-rail .acs-stats #acvind{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:10px}body.au-rl-ext #au-rail .acs-stats .st-row,body.au-rl-ext #au-rail .acs-stats #acvind{grid-template-columns:repeat(2,minmax(0,1fr))!important}' +
    '#au-rail .acv-card{background:var(--paper,#fbfcfd)!important;border:1px solid var(--line)!important;border-radius:12px!important;box-shadow:none!important}' +
    '#au-rail #acv-ini .au-h{display:none}#au-rail #acv-ini{border:0;padding:0}body.au-rl-ext #au-rail #au-ind{grid-template-columns:repeat(2,minmax(0,1fr))!important}' +
    '#au-rail .au-dupla{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;grid-column:1/-1}#au-rail .au-dupla>*{min-width:0;margin:0!important}#au-rail .au-dupla .st-years{overflow-x:auto}#au-rail .au-dupla .fl-age{background:var(--paper,#fbfcfd);border:1px solid var(--line);border-radius:12px;padding:10px;min-width:0}#au-rail .au-dupla .fl-age #falist{display:none}#au-rail .au-dupla .fa-grid{display:block}#au-rail .au-dupla .fa-bands{display:grid;grid-template-columns:1fr;gap:4px;margin-top:8px}#au-rail .au-dupla .fl-hd em{display:block;font-size:11px}' +
    /* lista aberta pelo clique */
    '#au-rail .au-sel{outline:2px solid var(--gold,#c4953c);outline-offset:1px;border-radius:8px}' +
    '.au-drill{grid-column:1/-1;margin:8px 0;border:1px solid var(--gold,#c4953c);border-radius:12px;background:var(--card,#fff);box-shadow:0 6px 18px rgba(15,31,46,.12);overflow:hidden}' +
    '.au-drill .au-dh{display:flex;align-items:center;gap:8px;padding:9px 10px;background:color-mix(in srgb,var(--gold,#c4953c) 12%,var(--card,#fff));border-bottom:1px solid var(--line)}.au-drill .au-dh div{flex:1;min-width:0}.au-drill .au-dh b{display:block;font:700 12.5px Figtree,system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.au-drill .au-dh small{color:var(--muted);font-size:11px}' +
    '.au-drill .au-dh button{border:1px solid var(--line);background:var(--card,#fff);color:inherit;border-radius:8px;padding:5px 9px;font:700 11.5px Figtree,system-ui,sans-serif;cursor:pointer;white-space:nowrap}.au-drill .au-dh .pri{background:#14263c;border-color:#14263c;color:#fff}.au-drill .au-dh .pri[disabled]{opacity:.45;cursor:default}' +
    '.au-dlist{max-height:320px;overflow:auto}.au-dl{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px 10px;border-bottom:1px solid var(--line);font-size:12px}.au-dl code{font-size:11.5px;cursor:pointer}.au-dl span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.au-dl small{display:block;color:var(--muted);overflow:hidden;text-overflow:ellipsis}.au-dl em{font-style:normal;font-size:11px;color:var(--muted);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.au-dmais{display:block;width:100%;border:0;background:transparent;color:var(--gold,#8a6116);padding:7px;font:700 11.5px Figtree,system-ui,sans-serif;cursor:pointer}' +
    /* busca: coluna da esquerda com Onde está o processo */
    '.au-busca .au-bl{display:flex;flex-direction:column;gap:14px}.au-busca .au-bl .acs-est{margin:0!important;padding-top:12px!important;border-top:1px dashed var(--line)}.au-busca .au-bl .acs-est .est-g{flex-wrap:wrap}' +
    /* planilha: barra de opções e cabeçalho num bloco só */
    '#acvbody #acv-sheet{background:var(--card,#fff);border:1px solid var(--line);border-radius:14px;overflow:hidden;padding:0!important;margin:0}#acv-sheet .sh-tip{display:none}' +
    '#acv-sheet .sh-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0!important;padding:10px 12px;background:var(--paper,#f6f8fa);border-bottom:1px solid var(--line)}#acv-sheet .sh-bar .ritcount{margin-right:auto;font-weight:700}' +
    '#acv-sheet .sh-wrap{border:0!important;border-radius:0!important}#acv-sheet .sh-t{border-collapse:separate!important;border-spacing:0!important}#acv-sheet .sh-t thead th{background:var(--paper,#f6f8fa)!important;background-clip:padding-box}#acv-sheet .sh-t thead tr:first-child th{z-index:4}#acv-sheet .sh-t thead tr:nth-child(2) th{z-index:3;box-shadow:0 1px 0 var(--line)}';
  cssL.textContent +=
    '.au-dl{grid-template-columns:minmax(0,1fr) auto!important;grid-template-areas:"p s" "c c";row-gap:2px}.au-dl code{grid-area:p}.au-dl em{grid-area:s;max-width:180px!important}.au-dl span{grid-area:c;white-space:normal!important}.au-dl span small{display:inline!important;margin-left:4px}.au-dl span small:before{content:"· "}' +
    '.au-busca>.au-bh{align-items:center!important;flex-wrap:wrap}.au-busca>.au-bh h2{white-space:nowrap;display:flex;align-items:center;gap:10px}.au-busca>.au-bh h2:before{content:"";width:4px;height:20px;border-radius:2px;background:var(--gold,#c4953c);display:inline-block}.au-busca>.au-bh small{flex:1;min-width:220px}.au-busca>.au-bh .n{white-space:nowrap}';
  cssL.textContent +=
    '.au-onde{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}.au-onde .acs-est{margin:0!important;padding:0!important;border:0!important;background:transparent!important;width:auto!important}' +
    '.au-onde .acs-est .est-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin-bottom:8px}.au-onde .acs-est .est-g{display:flex!important;flex-wrap:wrap!important;align-items:center;gap:6px 8px;margin:0 0 6px}' +
    '.au-onde .acs-est .est-g>*{flex:none}.au-onde .acs-est .est-c{width:auto!important}';
  cssL.textContent +=
    '#au-rail .au-rh{height:66px!important;margin:-14px -28px 14px!important;padding:0 52px 0 18px!important;background:linear-gradient(135deg,#0f1f2e 0%,#18324a 100%)!important;border-bottom:2px solid #c4953c;gap:12px;box-shadow:0 4px 12px rgba(15,31,46,.18)}' +
    '#au-rail .au-rt{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}#au-rail .au-rt>b{font:800 10px Figtree,system-ui,sans-serif!important;letter-spacing:.2em;text-transform:uppercase;color:#e6c27a!important}' +
    '#au-rail .au-rn{display:flex;align-items:baseline;gap:8px;min-width:0}#au-rail .au-rn strong{font:700 18px/1.1 Figtree,system-ui,sans-serif;color:#fff;white-space:nowrap;letter-spacing:-.01em}#au-rail .au-rn small{color:#9fb0c0!important;font-size:11.5px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#au-rail .au-ext{margin-left:0!important;background:rgba(255,255,255,.06)!important;border-color:rgba(230,194,122,.5)!important;color:#f1dfb5!important}#au-rail .au-ext:hover{background:rgba(230,194,122,.15)!important}#rlTog{z-index:7}';
  cssL.textContent +=
    '.au-alca{position:fixed;top:132px;z-index:45;width:18px;height:46px;display:none;align-items:center;justify-content:center;padding:0;border:1px solid var(--line);background:var(--card,#fff);color:var(--muted,#5d6475);cursor:pointer;box-shadow:0 2px 8px rgba(15,31,46,.14);transition:left .22s,right .22s,background .15s,color .15s}' +
    '.au-alca:hover{background:#c4953c;border-color:#c4953c;color:#14263c}' +
    '.au-alca-ix{left:var(--ixw);border-left:0;border-radius:0 9px 9px 0}.au-alca-rl{right:var(--rlw);border-right:0;border-radius:9px 0 0 9px}' +
    'body[data-mod="acervo"]:not(.cmt-modo):not(.cmt-int-on):not(.ix-min) .au-alca-ix,body[data-mod="acervo"]:not(.cmt-modo):not(.cmt-int-on):not(.rail-min) .au-alca-rl{display:flex}' +
    '#au-rail .au-rh{padding-right:52px!important}.au-ixbar{display:none!important}';
  cssL.textContent +=
    '#au-rail{padding-bottom:0!important;padding-top:44px!important}#au-rail .au-rc{padding-bottom:16px}' +
    '#au-rail .au-rfoot{position:sticky;bottom:0;z-index:6;margin:0 -14px;background:var(--card,#fff);border-top:2px solid #c4953c;box-shadow:0 -8px 22px rgba(15,31,46,.16)}#au-rail .au-rfoot[hidden]{display:none}' +
    '#au-rail .au-rfoot .au-dh{display:flex;align-items:center;gap:8px;padding:9px 12px;background:color-mix(in srgb,#c4953c 10%,var(--card,#fff))}#au-rail .au-rfoot .au-dh>div{flex:1;min-width:0;cursor:pointer}' +
    '#au-rail .au-rfoot .au-dh b{display:block;font:700 12.5px Figtree,system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#au-rail .au-rfoot .au-dh small{color:var(--muted);font-size:11px}' +
    '#au-rail .au-rfoot .au-dh button{border:1px solid var(--line);background:var(--card,#fff);color:inherit;border-radius:8px;padding:5px 9px;font:700 11.5px Figtree,system-ui,sans-serif;cursor:pointer;white-space:nowrap}#au-rail .au-rfoot .au-dh .pri{background:#14263c;border-color:#14263c;color:#fff}#au-rail .au-rfoot .au-dh .pri[disabled]{opacity:.45;cursor:default}' +
    '#au-rail .au-rfoot .au-dtg{width:28px;padding:5px 0!important;text-align:center}#au-rail .au-rfoot .au-dlist{max-height:min(46vh,420px);overflow:auto}' +
    /* painel recolhido: faixa com identidade própria, rótulo vertical e contagem; clicar em qualquer ponto abre */
    'body.rail-min #rail{background:repeating-linear-gradient(135deg,#14263c 0 10px,#172b43 10px 20px)!important;border-left:3px solid #c4953c!important;cursor:pointer}' +
    'body.rail-min #rail:hover{border-left-color:#e6c27a!important}body.rail-min #rlTog{background:#c4953c!important;color:#14263c!important;border-color:#c4953c!important}' +
    'body.rail-min #rlTog .side-lab{color:#14263c!important;letter-spacing:.18em}' +
    '#rlTog .au-rbadge{display:none}body.rail-min #rlTog .au-rbadge{display:block;writing-mode:vertical-rl;transform:rotate(180deg);font:800 10px Figtree,system-ui,sans-serif;background:#14263c;color:#e6c27a;border-radius:999px;padding:6px 2px}';
  D.head.appendChild(cssL);
  if (ls.get(LS_GERAL)) D.body.classList.add('au-geral-min');
  if (ls.get(LS_IND)) D.body.classList.add('au-ind-min');
  if (ls.get('cmt_au-ix-ext')) D.body.classList.add('au-ix-ext');
  if (ls.get('cmt_au-rl-ext') && !D.body.classList.contains('au-ix-ext')) D.body.classList.add('au-rl-ext');

  function titulo(r, h, sub, extra) { var d = D.createElement('div'); d.className = 'au-h'; d.dataset.r = r; d.innerHTML = '<h2>' + h + '</h2><small>' + sub + '</small>' + (extra || ''); return d; }
  function secaoRail(rc, id, tit, extra) {
    var s = rc.querySelector(':scope > [data-au-sec="' + id + '"]');
    if (!s) { s = D.createElement('section'); s.className = 'au-rs'; s.dataset.auSec = id; s.innerHTML = '<h3><span>' + tit + '</span>' + (extra || '') + '</h3><div class="au-rb"></div>'; rc.appendChild(s); }
    return s.querySelector('.au-rb');
  }
  var ULT_IDADE = null;
  /* alças de estender: ícone rente à borda de cada painel, do lado do conteúdo central */
  var SETA = function (dir) { return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + (dir === 'd' ? '<path d="M7 6l6 6-6 6M13 6l6 6-6 6"/>' : '<path d="M17 6l-6 6 6 6M11 6l-6 6 6 6"/>') + '</svg>'; };
  D.addEventListener('click', function (e) { if (!D.body.classList.contains('rail-min')) return; var r = e.target.closest && e.target.closest('#rail'); if (!r || e.target.closest('#rlTog')) return; var t = $('#rlTog'); if (t) t.click(); }, true);
  function alcas() {
    [['ix', 'au-ix-ext'], ['rl', 'au-rl-ext']].forEach(function (x) {
      var b = D.querySelector('.au-alca[data-au-ext="' + x[0] + '"]');
      if (!b) { b = D.createElement('button'); b.type = 'button'; b.className = 'au-alca au-alca-' + x[0]; b.dataset.auExt = x[0]; D.body.appendChild(b); }
      var ext = D.body.classList.contains(x[1]);
      b.title = ext ? 'Voltar à largura normal' : 'Estender o painel';
      b.setAttribute('aria-label', b.title);
      var dir = x[0] === 'ix' ? (ext ? 'e' : 'd') : (ext ? 'd' : 'e');
      if (b.__d !== dir) { b.innerHTML = SETA(dir); b.__d = dir; }
    });
  }
  function arrumar() {
    var pane = $('#acervo'), body = $('#acvbody'), P = $('#acspanel'); if (!pane || !body || !P || !ACV.recs) return;
    /* 1. Panorama geral (todo o relatório): leitura do acervo e entradas × saídas por mês */
    var tk = $('#tk-panorama'), leit = $('#tk-leitura');
    var hg = $('#acervo > .au-h[data-r="geral"]');
    if (!hg) { hg = titulo('geral', 'Visão geral do acervo', 'acervo ativo inteiro, sem filtros: leitura, entradas e saídas, situação, caixas do PJe e o que está a caminho', '<button class="au-tg" data-au-tg="geral"></button>'); body.before(hg); }
    if (leit && leit.previousElementSibling !== hg) hg.after(leit);
    var tg = $('[data-au-tg="geral"]'); if (tg) tg.textContent = D.body.classList.contains('au-geral-min') ? 'Mostrar ▾' : 'Minimizar ▴';
    var hf = body.querySelector(':scope > .au-h[data-r="filtro"]'); if (hf) hf.remove();
    /* 2. painel esquerdo: o "Acervo do gabinete" (caixas do PJe e situação processual) acima dos dados */
    var gx = conCorpo();
    if (gx) {
      if (tk) {
        var slot = gx.querySelector('.au-tk');
        if (tk.parentElement !== slot) slot.appendChild(tk);
        tk.querySelectorAll('.tkc-top button, .tkc-top label').forEach(function (b) { if (/importar|limpar/i.test(b.textContent)) b.classList.add('au-oculto'); });
      }
    }
    /* 3. painel direito: tudo o que é do filtro; o clique abre a lista, e só o botão filtra */
    var rail = $('#rail'), rl = $('#au-rail');
    if (rail && !rl) { rl = D.createElement('div'); rl.id = 'au-rail'; rl.innerHTML = '<div class="au-rc"></div><div class="au-rfoot" hidden></div>'; rail.appendChild(rl); ligarRail(rl); }
    if (rl) {
      var nCrit = 0; try { nCrit = ACS.crit.length + ACS.tags.size + (ACS.batch.length ? 1 : 0) + Object.keys(ACV.st.f).filter(function (k) { return ACV.st.f[k]; }).length + (ACV.st.q ? 1 : 0); } catch (e) {}
      var tgl = $('#rlTog'); if (tgl) { var bd = tgl.querySelector('.au-rbadge'); if (!bd) { bd = D.createElement('span'); bd.className = 'au-rbadge'; tgl.appendChild(bd); } bd.textContent = nf(acvFiltered().length); bd.title = (typeof acsPresetName === 'function' ? acsPresetName() : '') + (nCrit ? ' · ' + nCrit + ' critério(s)' : ''); }
      var rc = rl.querySelector('.au-rc');
      var rNum = secaoRail(rc, 'num', 'Números do filtro'), rCont = secaoRail(rc, 'cont', 'Por local, situação e prioridade'),
          rEst = secaoRail(rc, 'est', 'Estatísticas dos filtrados', '<button type="button" class="au-xls" data-au-act="stxls">⇩ Excel</button>'), rInd = secaoRail(rc, 'ind', 'Indicadores do acervo');
      var pan = $('#acv-pan'); if (pan && pan.parentElement !== rNum) rNum.appendChild(pan);
      var gs = $('#acv-general-stats'); if (gs) { if (gs.parentElement !== rCont) rCont.appendChild(gs); gs.open = true; }
      var st = P.querySelector('.acs-stats');
      if (st) { rEst.innerHTML = ''; rEst.appendChild(st); }
      var ini = $('#acv-ini'); if (ini && ini.parentElement !== rInd) rInd.appendChild(ini);
      /* idade do acervo e antiguidade por ano, lado a lado */
      var ind = $('#au-ind'), fxi = $('#acvb-fxi'), na = P.querySelector('.fl-age'); if (na) ULT_IDADE = na; var novaIdade = ULT_IDADE;
      if (ind && fxi) {
        var du = ind.querySelector('.au-dupla');
        if (!du) { du = D.createElement('div'); du.className = 'au-dupla'; fxi.before(du); }
        if (fxi.parentElement !== du) du.prepend(fxi);
        if (novaIdade && novaIdade.parentElement !== du) { du.querySelectorAll('.fl-age').forEach(function (x) { x.remove(); }); du.appendChild(novaIdade); }
      }
    }
    alcas();
    var rlab = $('#rlTog .side-lab'), rlt = D.body.classList.contains('au-pan') ? 'Relatórios' : 'Acervo filtrado'; if (rlab && rlab.textContent !== rlt) rlab.textContent = rlt;
    /* 4. busca e filtros: um cartão; "Onde está o processo" à esquerda, abaixo do Acervo filtrado; etiquetas no rodapé */
    var cnt = P.querySelector('.acs-count'), srch = P.querySelector('.acs-srch'), build = P.querySelector('.acs-build');
    var bx = P.querySelector(':scope > .au-busca');
    if (!bx) { bx = D.createElement('div'); bx.className = 'au-busca'; bx.innerHTML = '<div class="au-bh"><h2>Busca e filtros</h2><small>situações, busca por texto ou lote, construtor de critérios, onde está o processo e etiquetas</small><span class="n"></span></div><div class="au-bg"><div class="au-bl"></div><div class="au-br"></div></div><div class="au-onde"></div><div class="au-tags"></div>'; P.appendChild(bx); }
    var bl = bx.querySelector('.au-bl'), br = bx.querySelector('.au-br');
    if (cnt && cnt.parentElement !== bl) bl.prepend(cnt);
    var onde = bx.querySelector('.au-onde'), est = build && build.querySelector('.acs-est'); if (est && onde) { onde.innerHTML = ''; onde.appendChild(est); }
    if (srch && srch.parentElement !== br) br.appendChild(srch);
    if (build && build.parentElement !== br) br.appendChild(build);
    bx.querySelector('.au-bh .n').textContent = nf(acvFiltered().length) + ' processos no filtro';
    etiquetas(bx.querySelector('.au-tags'));
    /* 5. resultados: Painéis ou Planilha */
    var hr = body.querySelector(':scope > .au-h[data-r="res"]');
    if (!hr) { hr = titulo('res', 'Resultados', 'processos do filtro atual', '<div class="seg au-vw"><button data-au-vw="panels">Painéis</button><button data-au-vw="sheet">Planilha</button></div>'); body.appendChild(hr); }
    var planilha = (pref.ui && pref.ui.acvView) === 'sheet';
    hr.querySelectorAll('[data-au-vw]').forEach(function (b) { b.classList.toggle('on', (b.dataset.auVw === 'sheet') === planilha); });
    D.body.classList.toggle('au-planilha', planilha);
    var sh = $('#acv-sheet'); if (sh && sh.parentElement !== body) body.appendChild(sh);
    var tip = sh && sh.querySelector('.sh-tip'), sb = sh && sh.querySelector('.sh-bar'); if (tip && sb && !sb.title) sb.title = tip.textContent.trim();
    fixarCabecalho();
    var sm = $('#acv-general-stats > summary');
    if (sm && sm.firstChild && sm.firstChild.nodeType === 3 && !/contagens/i.test(sm.firstChild.textContent)) { sm.firstChild.textContent = 'Contagens do filtro por situação, local e prioridade'; var sl = sm.querySelector('small'); if (sl) sl.textContent = 'expandir / recolher'; }
  }
  /* planilha: as duas linhas do cabeçalho coladas, sem vão na rolagem */
  function fixarCabecalho() {
    var t = $('#acvsheet .sh-t'); if (!t) return;
    var r1 = t.querySelector('thead tr:first-child'); if (!r1) return;
    var h = r1.getBoundingClientRect().height; if (!h) return;
    t.querySelectorAll('thead tr:first-child th').forEach(function (th) { th.style.top = '0px'; });
    t.querySelectorAll('thead tr:nth-child(2) th').forEach(function (th) { th.style.top = (h - 1) + 'px'; });
  }
  /* etiquetas dos processos filtrados: clique filtra (o clique vai ao próprio #acspanel, como no construtor) */
  var ET = { q: '', aberto: false };
  function etiquetas(box) {
    if (!box) return;
    var L = acvCount(acvFiltered(), function (o) { return o.etq; }), q = ET.q.trim().toLowerCase();
    var on = (typeof ACS !== 'undefined' && ACS.tags) ? ACS.tags : new Set();
    var vis = q ? L.filter(function (x) { return x[0].toLowerCase().indexOf(q) >= 0; }) : L;
    var ativas = [].concat([].slice.call(on).filter(function (t) { return !L.some(function (x) { return x[0] === t; }); }).map(function (t) { return [t, 0]; }));
    if (!box.querySelector('.au-tags-h')) {
      box.innerHTML = '<div class="au-tags-h"><b>Etiquetas dos processos filtrados</b><small></small><input type="search" placeholder="Buscar etiqueta…" aria-label="Buscar etiqueta"><button type="button" data-au-tagmais="1"></button></div><div class="au-tgrid"></div>';
      var inp = box.querySelector('input'); inp.value = ET.q;
      inp.addEventListener('input', function () { ET.q = inp.value; etiquetas(box); });
      box.querySelector('[data-au-tagmais]').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); ET.aberto = !ET.aberto; etiquetas(box); });
    }
    box.classList.toggle('aberto', ET.aberto || !!q);
    box.querySelector('.au-tags-h small').textContent = nf(L.length) + ' etiqueta(s) · clique para filtrar; várias somam (E)' + (on.size ? ' · ' + on.size + ' ativa(s)' : '');
    box.querySelector('[data-au-tagmais]').textContent = ET.aberto ? 'Recolher ▴' : 'Expandir ▾';
    var html = ativas.concat(vis.slice(0, 600)).map(function (x) { return '<button type="button" class="' + (on.has(x[0]) ? 'on' : '') + '" data-acstag="' + esc(x[0]) + '"><span>' + esc(x[0]) + '</span><b>' + nf(x[1]) + '</b></button>'; }).join('') || '<span class="p-empty">Nenhuma etiqueta nos processos filtrados.</span>';
    var g = box.querySelector('.au-tgrid'); if (g.__h !== html) { g.innerHTML = html; g.__h = html; }
  }
  /* painel direito: o clique abre a lista dos processos; "Filtrar estes processos" aplica o filtro */
  var DR = null;
  function rodape() { var rl = $('#au-rail'); return rl && rl.querySelector(':scope > .au-rfoot'); }
  function fecharDrill() { var f = rodape(); if (f) { f.hidden = true; f.innerHTML = ''; } if (DR && DR.el) DR.el.classList.remove('au-sel'); DR = null; }
  function pintarDrill() {
    var f = DR.d, L = DR.lista, V = L.slice(0, DR.lim);
    f.hidden = false; f.classList.toggle('aberto', DR.aberto);
    f.innerHTML = '<div class="au-dh"><button type="button" class="au-dtg" data-dr="t" title="' + (DR.aberto ? 'Recolher a lista' : 'Abrir a lista') + '">' + (DR.aberto ? '▾' : '▴') + '</button><div data-dr="t"><b>' + esc(DR.titulo) + '</b><small>' + nf(L.length) + ' processo(s) · no filtro atual</small></div>' +
      '<button type="button" class="pri" data-dr="f"' + (DR.aplicar ? '' : ' disabled title="Já está no filtro"') + '>Filtrar estes</button><button type="button" data-dr="x" title="Fechar">×</button></div>' +
      (DR.aberto ? '<div class="au-dlist">' + (V.map(function (o) { var t = (o.tks[0] || {}).t || '';
        return '<div class="au-dl"><code class="acv-p" data-acvcp="' + esc(o.p) + '">' + esc(o.p) + '</code><span>' + esc(o.classe || '') + '<small>' + esc(o.assunto || '') + '</small></span><em>' + esc(o.caminho ? 'A caminho' : o.gab ? (t || 'Gabinete') : (SIT_BY[o.sit] || {}).t || '') + '</em></div>'; }).join('') || '<p class="p-empty">Nenhum processo.</p>') +
        (L.length > V.length ? '<button type="button" class="au-dmais" data-dr="m">mostrar mais (' + nf(V.length) + ' de ' + nf(L.length) + ')</button>' : '') + '</div>' : '');
  }
  function drill(el, titulo, lista, aplicar) {
    var mesmo = DR && DR.el === el; fecharDrill(); if (mesmo) return;
    var f = rodape(); if (!f) return;
    if (D.body.classList.contains('cmt-acv')) aplicar = function () { motorFiltrar(lista, titulo); };
    DR = { d: f, el: el, titulo: titulo, lista: lista, aplicar: aplicar, lim: 80, aberto: true };
    el.classList.add('au-sel'); pintarDrill();
  }
  function rotulo(el) { var s = el.querySelector('span'); return (s ? s.textContent : el.textContent).replace(/\s+/g, ' ').trim().slice(0, 90); }
  function ligarRail(rl) {
    rl.addEventListener('click', function (e) {
      var t = e.target;
      var dr = t.closest('[data-dr]');
      if (dr) { e.preventDefault(); e.stopPropagation(); var k = dr.dataset.dr;
        if (k === 'x') fecharDrill();
        else if (k === 't' && DR) { DR.aberto = !DR.aberto; pintarDrill(); }
        else if (k === 'm') { DR.lim += 120; pintarDrill(); }
        else if (k === 'f' && DR && DR.aplicar) { var ap = DR.aplicar; fecharDrill(); ap(); }
        return; }
      if (t.closest('code.acv-p') || t.closest('[data-acssitc]') || t.closest('[data-au-act]') || t.closest('[data-au-ext]') || t.closest('[data-au-ir]')) return;
      var m = t.closest('[data-acvmore]'); if (m) { e.preventDefault(); e.stopPropagation(); ACV.st.more = ACV.st.more || {}; ACV.st.more[m.dataset.acvmore] = !ACV.st.more[m.dataset.acvmore]; acvRender(); return; }
      var s = t.closest('[data-acvset]'); if (s) { e.preventDefault(); e.stopPropagation(); var kv = s.dataset.acvset.split(':'), ext = {}; ext[kv[0]] = kv[1];
        var lista = ACV.st.f[kv[0]] === kv[1] ? acvFiltered() : acvFiltered(ext);
        drill(s, rotulo(s), lista, ACV.st.f[kv[0]] === kv[1] ? null : function () { acvSet(kv[0], kv[1]); }); return; }
      var f = t.closest('[data-acvf]'); if (f) { e.preventDefault(); e.stopPropagation(); var e2 = {}; e2[f.dataset.acvf] = f.dataset.v;
        drill(f, (ACV_FIELDS[f.dataset.acvf] || f.dataset.acvf) + ': ' + f.dataset.v, acvFiltered(e2), ACV.st.f[f.dataset.acvf] === f.dataset.v ? null : function () { acvSet(f.dataset.acvf, f.dataset.v); }); return; }
      var porAnos = function (anos) { return function () { ACS.crit = ACS.crit.filter(function (c) { return c.column !== 'Ano de distribuição'; }); ACS.crit.push({ column: 'Ano de distribuição', op: 'equals', values: anos, combine: 'any' }); acsRefresh(); }; };
      var y = t.closest('[data-fay],[data-sty]'); if (y) { e.preventDefault(); e.stopPropagation(); var ano = y.dataset.fay || y.dataset.sty;
        drill(y, 'Distribuídos em ' + ano, acvFiltered().filter(function (o) { return String(yearOf(o)) === ano; }), porAnos([ano])); return; }
      var fb = t.closest('[data-fab]'); if (fb) { e.preventDefault(); e.stopPropagation(); var lb = rotulo(fb), nums = (lb.match(/\d+/g) || []).map(Number), a0 = 0, a1 = 1e9;
        if (/at[ée]/i.test(lb)) a1 = nums[0]; else if (/mais/i.test(lb)) a0 = nums[0]; else if (nums.length > 1) { a0 = nums[0]; a1 = nums[1]; }
        var L3 = acvFiltered().filter(function (o) { var a = idade(o); return a != null && a >= a0 && a < a1; });
        drill(fb, 'Antiguidade: ' + lb.toLowerCase(), L3, porAnos(Array.from(new Set(L3.map(function (o) { return String(yearOf(o)); }))))); return; }
      var sp = t.closest('[data-stspec]'); if (sp) { e.preventDefault(); e.stopPropagation(); var col = sp.dataset.stspec, v = sp.dataset.v, crit = { column: col, op: col === 'Classe' ? 'contains' : 'equals', values: [v], combine: 'any' };
        ACS.crit.push(crit); var L2 = acvFiltered(); ACS.crit.pop();
        drill(sp, rotulo(sp), L2, function () { ACS.crit.push(crit); acsRefresh(); }); return; }
      var x = t.closest('[data-st]'); if (x) { e.preventDefault(); e.stopPropagation(); if (x.dataset.st === 'xls') stExport(); return; }
    }, true);
  }
  D.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-au-tg],[data-au-vw],[data-au-act],[data-au-ext]'); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    if (t.dataset.auExt) { var ce = t.dataset.auExt === 'ix' ? 'au-ix-ext' : 'au-rl-ext', outra = ce === 'au-ix-ext' ? 'au-rl-ext' : 'au-ix-ext', ve = !D.body.classList.contains(ce); D.body.classList.toggle(ce, ve); ls.set('cmt_' + ce, ve); if (ve) { D.body.classList.remove(outra); ls.set('cmt_' + outra, false); } arrumar(); return; }
    if (t.dataset.auTg) { var cl = t.dataset.auTg === 'geral' ? 'au-geral-min' : 'au-ind-min', on = !D.body.classList.contains(cl); D.body.classList.toggle(cl, on); ls.set(t.dataset.auTg === 'geral' ? LS_GERAL : LS_IND, on); arrumar(); return; }
    if (t.dataset.auVw) { try { acvView(t.dataset.auVw); } catch (er) {} arrumar(); return; }
    var a = t.dataset.auAct;
    if (a === 'imp') W.CMTShell.entrar('central', 'importar');
    else if (a === 'tab') W.CMTShell.entrar('central', 'central');
    else if (a === 'int') { fecharCon(); abrirIntegral(); }
    else if (a === 'stxls') { try { stExport(); } catch (er) {} }
    else if (a === 'exp' || a === 'copy') { var b = $('#acspanel [data-acs="' + a + '"]') || $('#acspanel .acs-' + a); if (b) b.click(); }
  }, true);

  /* ---------------- painel lateral: dados, importação e exportação ---------------- */
  function indice() {
    var g = conCorpo(); if (!g) return;
    var s = g.querySelector('.au-side');
    if (!ACV.recs) { s.innerHTML = '<span class="k">Dados do acervo</span><span class="s">carregando…</span>'; return; }
    var C = Object.values(ACV.comp || {}), filt = acvFiltered().length;
    var html = '<span class="k">Dados do acervo</span><span class="n">' + nf(ACV.recs.length) + '</span> <span class="s">processos no acervo fonte (procs-muta)</span><span class="s">atualizado em ' + esc(ACV.at || '—') + (TPU ? ' · TPU do CNJ de ' + esc(TPU) : '') + '</span>' +
      '<span class="k">Importar</span><button class="pri" data-au-act="imp">Planilhas do PJe e do Power BI</button>' +
      '<label for="cpfile">Complementar com planilha…</label><span class="s">' + (C.length ? C.map(function (c) { return esc(c.kind) + ' · ' + nf(c.hit); }).join(' · ') : 'complementos: nenhum') + '</span>' +
      '<span class="k">Exportar · filtro atual (' + nf(filt) + ')</span><button data-au-act="exp">Exportar em Excel</button><button data-au-act="copy">Copiar os números</button>' +
      '<span class="k">Ver e editar</span><button data-au-act="tab">Edição em tabela (Acervo Central)</button><button data-au-act="int">Planilha integral</button>';
    if (s.__h !== html) { s.innerHTML = html; s.__h = html; }
  }

  /* ---------------- dados de apoio do procs-muta ---------------- */
  var apoio = false;
  async function carregarApoio() {
    var w = mw(); if (apoio || !w || !w.ProcsMuta || !w.ProcsMuta.atual) return; apoio = true;
    var ler = function (p) { return w.ProcsMuta.ler(p).then(function (t) { return JSON.parse(t); }).catch(function (e) { console.warn('[acervo único] ' + p, e); return null; }); };
    var r = await Promise.all([ler('apoio/assuntos-cnj.json'), ler('apoio/regras/secoes.json'), ler('acervo/sessoes/calendario.json'), ler('acervo/operacional.json')]);
    if (r[0] && r[1]) { CNJ = r[0].assuntos; TPU = r[0].versao_tpu || ''; REG = {}; r[1].regras.forEach(function (g) { REG[g.codigo] = g; }); }
    CAL = r[2]; OPER = r[3] && r[3].registros;
    if (ACV.recs) { try { W.CMTShell.recarregar(); } catch (e) {} }
  }
  /* =================== listas: o clique numa categoria abre os processos logo abaixo =================== */
  function localDe(o) { var t = (o.tks && o.tks[0] || {}).t || ''; return o.caminho ? 'A caminho do gabinete' : o.gab ? (t || 'Gabinete') : ((SIT_BY[o.sit] || {}).t || ''); }
  function abrirLista(onde, titulo, L, op) {
    op = op || {}; var doc = onde.ownerDocument;
    var box = op.box || onde.querySelector(':scope > .au-lst') || null;
    if (!box) { box = doc.createElement('div'); box.className = 'au-lst'; onde.appendChild(box); }
    if (box.__tit === titulo && !box.hidden && !op.forcar) { box.hidden = true; box.__tit = ''; return box; }
    box.__tit = titulo; box.__L = L; box.__lim = 60; box.__op = op; box.hidden = false;
    if (!box.__lig) { box.__lig = true; box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lst]'); if (!b) return; e.preventDefault(); e.stopPropagation(); var k = b.dataset.lst;
      if (k === 'x') { box.hidden = true; box.__tit = ''; }
      else if (k === 'm') { box.__lim += 120; pintarLista(box); }
      else if (k === 'c') { var t = box.__L.map(function (o) { return o.p; }).join('\n'); try { (doc.defaultView.navigator.clipboard || navigator.clipboard).writeText(t); b.textContent = 'Copiado ✓'; } catch (er) {} }
      else if (k === 'b') { var L2 = box.__L, ti = box.__tit; if (box.__op.antes) box.__op.antes(); abrirNaBusca(L2, ti); }
      else if (k === 'd') baixarListaCsv(box.__L, box.__tit);
    }); }
    pintarLista(box);
    if (op.rolar !== false) setTimeout(function () { try { box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }, 30);
    return box;
  }
  function pintarLista(box) {
    var L = box.__L, V = L.slice(0, box.__lim);
    box.innerHTML = '<div class="lh"><div><b>' + esc(box.__tit) + '</b><small>' + nf(L.length) + ' processo(s)</small></div>' +
      '<button type="button" class="pri" data-lst="b"' + (L.length ? '' : ' disabled') + '>' + esc(box.__op.rotulo || 'Abrir na Triagem') + '</button><button type="button" data-lst="c"' + (L.length ? '' : ' disabled') + '>Copiar números</button><button type="button" data-lst="d"' + (L.length ? '' : ' disabled') + '>Baixar planilha</button><button type="button" class="x" data-lst="x" aria-label="Fechar a lista">×</button></div>' +
      '<div class="lb">' + (V.map(function (o) { var d = o.tks && o.tks[0] ? acvDays(o.tks[0].de) : null;
        return '<div class="li"><code class="acv-p" data-acvcp="' + esc(o.p) + '">' + esc(o.p) + '</code><span>' + esc(o.classe || '') + '<small>' + esc(o.assunto || '') + '</small></span><em>' + esc(localDe(o)) + (d != null && o.gab ? '<i>' + nf(d) + ' d</i>' : '') + '</em></div>'; }).join('') || '<p class="p-empty">Nenhum processo.</p>') +
      (L.length > V.length ? '<button type="button" class="mais" data-lst="m">mostrar mais (' + nf(V.length) + ' de ' + nf(L.length) + ')</button>' : '') + '</div>';
  }
  function baixarListaCsv(L, titulo) {
    var q = function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var cab = ['Processo', 'Classe', 'Assunto', 'Seção', 'Situação', 'Local', 'Dias na tarefa', 'Prioridade'];
    var lin = L.map(function (o) { var d = o.tks && o.tks[0] ? acvDays(o.tks[0].de) : ''; return [o.p, o.classe, o.assunto, o.secao || o.sec || '', (SIT_BY[o.sit] || {}).t || o.sit || '', localDe(o), d == null ? '' : d, o.prio || o.prioridade || ''].map(q).join(';'); });
    var nome = 'Lista_' + String(titulo || 'processos').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) + '.csv';
    var a = D.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + [cab.join(';')].concat(lin).join('\r\n')], { type: 'text/csv;charset=utf-8' })); a.download = nome; D.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  /* leva uma lista ao Acervo Central, como critério da busca avançada */
  function abrirNaBusca(L, titulo) {
    if (D.body.classList.contains('cmt-acv') && comp()) { motorFiltrar(L, titulo); return; }
    irSub('central');
    var n = 0, tm = setInterval(function () { var c = comp(); if ((c && W.__acvUnico && D.body.classList.contains('cmt-acv')) || ++n > 40) { clearInterval(tm); if (c) motorFiltrar(L, titulo); } }, 150);
  }
  var CSS_LST =
    '.au-lst{margin:12px 0 4px;border:1px solid #d9d2c3;border-radius:14px;background:#fffdf8;box-shadow:0 8px 22px rgba(20,38,60,.08);overflow:hidden;font-family:Figtree,system-ui,sans-serif;color:#14263c;grid-column:1/-1}' +
    '.au-lst[hidden]{display:none}.au-lst .lh{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f6f1e6;border-bottom:1px solid #e7dfcf}.au-lst .lh>div{flex:1;min-width:0}.au-lst .lh b{display:block;font-size:14px}.au-lst .lh small{color:#6d7b8a;font-size:12px}' +
    '.au-lst button{border:1px solid #d8d2c6;background:#fff;color:#1b3553;border-radius:999px;padding:6px 12px;font:700 12px Figtree,system-ui,sans-serif;cursor:pointer}.au-lst button.pri{background:#1b3553;border-color:#1b3553;color:#fff}.au-lst button:disabled{opacity:.5;cursor:default}.au-lst button.x{border:0;background:transparent;font-size:18px;padding:2px 8px}' +
    '.au-lst .lb{max-height:420px;overflow:auto}.au-lst .li{display:grid;grid-template-columns:200px minmax(0,1fr) minmax(0,.8fr);gap:10px;align-items:baseline;padding:7px 12px;border-bottom:1px solid #f0ebe0;font-size:12.5px}.au-lst .li:hover{background:#faf6ec}' +
    '.au-lst .li code{font-size:12px;color:#1b3553;cursor:pointer}.au-lst .li span{min-width:0}.au-lst .li small{display:block;color:#6d7b8a;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.au-lst .li em{font-style:normal;color:#34495f;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.au-lst .li em i{font-style:normal;margin-left:6px;color:#8a6116;font-weight:700}' +
    '.au-lst .mais{display:block;margin:8px auto 10px}.au-lst .p-empty{padding:14px;color:#6d7b8a}@media (max-width:760px){.au-lst .li{grid-template-columns:minmax(0,1fr)}}';
  var cssL = D.createElement('style'); cssL.textContent = CSS_LST; D.head.appendChild(cssL);

  /* =================== Base do gabinete: conexão, dados e caixas do PJe num diálogo =================== */
  function conCorpo() {
    var d = $('#au-con');
    if (!d) {
      d = D.createElement('div'); d.id = 'au-con'; d.hidden = true; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'au-con-t');
      d.innerHTML = '<div class="cx"><div class="ch"><div><h2 id="au-con-t">Base do gabinete</h2><small>conexão com o procs-muta, dados do acervo e caixas do PJe</small></div><button type="button" class="x" data-con="x" aria-label="Fechar">×</button></div>' +
        '<div class="cb"><section class="au-conx"></section><div class="cg"><section class="au-side"></section><section class="au-tk"></section></div><div class="au-con-lst"></div></div></div>';
      D.body.appendChild(d);
      d.addEventListener('click', cliqueCon, true);
    }
    return d.querySelector('.cb');
  }
  function pintarCon() {
    var box = conCorpo().querySelector('.au-conx'), w = mw(), P = w && w.ProcsMuta, tem = !!(P && P.atual), e = {};
    try { e = w.CMTAcervoDados ? w.CMTAcervoDados.estado() : {}; } catch (er) {}
    var trocar = box.__trocar;
    var html = '<div class="st ' + (tem ? 'ok' : 'off') + '"><i></i><div><b>' + (tem ? 'Conectado ao procs-muta' : 'Não conectado') + '</b><small>' +
      (tem ? 'repositório privado trf3bdutra/procs-muta · ' + (P.lembrado ? 'token lembrado neste navegador' : 'token só nesta aba') + (e.erro ? ' · última leitura falhou: ' + esc(e.erro) : '') : 'sem o token, o acervo, as sessões e as regras não são lidos do procs-muta') + '</small></div>' +
      (tem && !trocar ? '<button type="button" data-con="trocar">Trocar token</button><button type="button" data-con="sair">Desconectar</button>' : '') + '</div>';
    if (!tem || trocar) html += '<form class="tf"><label for="au-con-tok">Token do GitHub (permissão Contents, leitura e gravação, no trf3bdutra/procs-muta)</label><div class="tr"><input id="au-con-tok" type="password" autocomplete="off" placeholder="github_pat_… ou ghp_…"><button type="submit" class="pri">Conectar</button>' + (trocar ? '<button type="button" data-con="cancelar">Cancelar</button>' : '') + '</div>' +
      '<label class="lb"><input type="checkbox" data-con-lembrar checked> Lembrar neste navegador (só em computador do gabinete)</label><p class="er" role="alert"></p></form>';
    if (box.__h !== html) { box.innerHTML = html; box.__h = html; var f = box.querySelector('form'); if (f) f.addEventListener('submit', conectar); }
  }
  async function conectar(e) {
    e.preventDefault(); var f = e.currentTarget, inp = f.querySelector('input[type=password]'), er = f.querySelector('.er'), bt = f.querySelector('button[type=submit]'), w = mw();
    if (!w || !w.ProcsMuta || !w.ProcsMuta.definir) { er.textContent = 'O Ab Initio ainda está carregando; tente de novo em instantes.'; return; }
    bt.disabled = true; bt.textContent = 'Conferindo…'; er.textContent = '';
    var r = await w.ProcsMuta.definir(inp.value, f.querySelector('[data-con-lembrar]').checked);
    if (r && r.ok) { bt.textContent = 'Conectado ✓'; setTimeout(function () { location.reload(); }, 300); return; }
    bt.disabled = false; bt.textContent = 'Conectar'; er.textContent = (r && r.erro) || 'Não foi possível conectar.';
  }
  function cliqueCon(e) {
    var d = $('#au-con'), b = e.target.closest('[data-con]');
    if (e.target === d) { fecharCon(); return; }
    if (b) { e.preventDefault(); var k = b.dataset.con, box = d.querySelector('.au-conx');
      if (k === 'x') fecharCon();
      else if (k === 'trocar') { box.__trocar = true; pintarCon(); var i = d.querySelector('#au-con-tok'); if (i) i.focus(); }
      else if (k === 'cancelar') { box.__trocar = false; pintarCon(); }
      else if (k === 'sair') { var w = mw(); if (w && w.ProcsMuta && w.confirm('Desconectar do procs-muta? O token sai deste navegador.')) { w.ProcsMuta.esquecer(); location.reload(); } }
      return; }
    /* caixas e situações do "Acervo do gabinete": abre a lista dentro do diálogo */
    var t = e.target.closest('.au-tk [data-acvset], .au-tk [data-acvf], .au-tk [data-tk], .au-tk [data-st], .au-tk [data-sit]:not([data-nolist])');
    if (t && !e.target.closest('code.acv-p')) {
      e.preventDefault(); e.stopPropagation();
      var ext = {}, tit;
      if (t.dataset.acvset) { var kv = t.dataset.acvset.split(':'); ext[kv[0]] = kv[1]; tit = rotulo(t); }
      else if (t.dataset.acvf) { ext[t.dataset.acvf] = t.dataset.v; tit = (ACV_FIELDS[t.dataset.acvf] || t.dataset.acvf) + ': ' + (t.dataset.acvf === 'sit' && SIT_BY[t.dataset.v] ? SIT_BY[t.dataset.v].t : t.dataset.v); }
      else if (t.dataset.tk) { ext.tk = t.dataset.tk; tit = rotulo(t); }
      else if (t.dataset.sit) { ext.sit = t.dataset.sit; tit = 'Situação: ' + ((SIT_BY[t.dataset.sit] || {}).t || t.dataset.sit); }
      else if (t.dataset.st) { var st = (STN.find(function (x) { return x.id === t.dataset.st; }) || {}), tks = TK.filter(function (x) { return x.st === t.dataset.st; }).map(function (x) { return x.id; }); ext = null; tit = 'Estação: ' + (st.nome || st.t || rotulo(t)); }
      var L = (ACV.recs || []).filter(function (o) { if (ACS_ENC.indexOf(o.sit) >= 0) return false; if (!ext) return o.gab && o.gtk && o.gtk.some(function (k) { return tks.indexOf(k) >= 0; }); return acvMatch(o, ext, ''); });
      abrirLista(d.querySelector('.au-con-lst'), tit, L, { antes: fecharCon, forcar: true });
    }
  }
  function fecharCon() { var d = $('#au-con'); if (d) d.hidden = true; var b = $('#cmtConBtn'); if (b) b.focus(); }
  W.CMTConexao = function () { var b = conCorpo(); pintarCon(); try { indice(); arrumar(); importacaoNaBase(); } catch (e) {} var d = $('#au-con'); d.hidden = false; var i = d.querySelector('#au-con-tok') || d.querySelector('.x'); if (i) i.focus(); };
  D.addEventListener('keydown', function (e) { var d = $('#au-con'); if (e.key === 'Escape' && d && !d.hidden) fecharCon(); });
  setInterval(function () { var d = $('#au-con'); if (d && !d.hidden) pintarCon(); var b = $('#cmtConBtn'); if (b) { var w = mw(), tem = false; try { tem = !!(w && w.ProcsMuta && w.ProcsMuta.atual); } catch (er) {} } }, 800);
  var cssK = D.createElement('style');
  cssK.textContent =
    '#au-con{position:fixed;inset:0;z-index:2147481500;background:rgba(8,18,28,.55);display:flex;align-items:flex-start;justify-content:center;padding:70px 16px 24px;overflow:auto}#au-con[hidden]{display:none}' +
    '#au-con .cx{width:min(1080px,100%);background:#0f1f2e;color:#d6dde5;border:1px solid rgba(230,194,122,.3);border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.45);font-family:Figtree,system-ui,sans-serif}' +
    '#au-con .ch{display:flex;align-items:flex-start;gap:12px;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.1)}#au-con .ch>div{flex:1}#au-con h2{margin:0;font:800 19px Figtree,system-ui,sans-serif;color:#fff}#au-con .ch small{color:#9fb0c0;font-size:12.5px}' +
    '#au-con .ch .x{border:0;background:transparent;color:#d6dde5;font-size:24px;line-height:1;cursor:pointer;padding:0 6px}#au-con .cb{padding:16px 20px 20px;display:grid;gap:16px}' +
    '#au-con .cg{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:16px;align-items:start}#au-con .cg>section{min-width:0}#au-con .au-side{margin:0}#au-con .au-tk:empty{display:none}' +
    '#au-con .au-conx .st{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}#au-con .st>div{flex:1}#au-con .st b{display:block;color:#fff;font-size:14.5px}#au-con .st small{color:#9fb0c0;font-size:12px}' +
    '#au-con .st i{width:12px;height:12px;border-radius:50%;background:#c0843d;flex:0 0 auto}#au-con .st.ok i{background:#4fbf8f}' +
    '#au-con button{border:1px solid rgba(255,255,255,.25);background:transparent;color:#eef2f5;border-radius:999px;padding:7px 13px;font:700 12.5px Figtree,system-ui,sans-serif;cursor:pointer}#au-con button.pri{background:#e6c27a;border-color:#e6c27a;color:#14263c}#au-con button:disabled{opacity:.6}' +
    '#au-con .tf{margin-top:10px;display:grid;gap:8px}#au-con .tf label{font-size:12.5px;color:#c9d3dc}#au-con .tf .tr{display:flex;gap:8px}#au-con .tf input[type=password]{flex:1;min-width:0;padding:9px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:#0b1824;color:#fff;font:14px Figtree,system-ui,sans-serif}' +
    '#au-con .tf .lb{display:flex;gap:7px;align-items:center}#au-con .er{margin:0;color:#ffb4a3;font-weight:600;font-size:12.5px}#au-con .er:empty{display:none}#au-con .au-lst{margin:0}' +
    '#au-con .au-tk button:not(.pri),#au-con .au-conimp button:not(.pri){color:inherit;border-color:transparent;background:transparent;border-radius:6px}#au-con .au-conimp .lnk,#au-con .dp-c .lnk{color:#a7433d}#au-con .au-conimp .lnk:disabled{color:#b9c3cc}' +
    '#cmtConBtn.au-off{background:#e6c27a!important;color:#14263c!important;border-color:#e6c27a!important}' +
    '@media (max-width:760px){#au-con .cg{grid-template-columns:minmax(0,1fr)}#au-con{padding-top:56px}}' +
    /* o painel esquerdo do Acervo Central sai (o conteúdo foi para o diálogo) */
    'body.cmt-acv:not(.ix-min){--ixw:300px!important}body.cmt-acv{--rlw:0px!important}html body.cmt-acv.cmt-modo #rail{visibility:hidden!important;overflow:hidden!important;width:0!important;min-width:0!important;padding:0!important;border:0!important}body.cmt-acv .au-alca{display:none!important}' +
    'html body.au-shfull #cmt-motor{position:fixed!important;inset:0!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;z-index:2147482500!important}' +
    '@media (max-width:1060px){html body.cmt-acv,html body.cmt-acv:not(.ix-min){--ixw:48px!important}body.cmt-acv.ix-sheet #index{box-shadow:0 0 40px rgba(0,0,0,.45)}}' +
    '@media (max-width:1180px){header.bar .brand,header.bar .brand b{white-space:nowrap}header.bar .brand em{display:none}nav.mods{overflow-x:auto;scrollbar-width:none;flex-wrap:nowrap}nav.mods .mod{white-space:nowrap}#cmtConBtn{white-space:nowrap}}' +
    'nav.mods [data-cmt="triagem"]{display:none!important}html body.cmt-acv #rlTog,html body.cmt-acv .au-alca-rl,html body.cmt-acv:not(.rail-min) .au-alca-rl,html body.cmt-acv:not(.ix-min) .au-alca-ix,html body.cmt-acv .au-alca-ix{display:none!important}' +
    'body.cmt-acv.ix-min .au-escs{display:none!important}.au-escmini{display:none}body.cmt-acv.ix-min .au-escmini{display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 0}' +
    '.au-escmini .mt{writing-mode:vertical-rl;transform:rotate(180deg);border:0;background:transparent;color:#e6c27a;font:800 10.5px Figtree,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;padding:4px 0}' +
    '.au-escmini .mq{width:18px;height:18px;border-radius:5px;border:2px solid transparent;background:var(--c);cursor:pointer;padding:0}.au-escmini .mq:hover,.au-escmini .mq.on{border-color:#fff}body.cmt-acv.ix-min #ixTog .side-lab{display:none}' +
    '.au-escs .ei.on{background:rgba(196,149,60,.18);border-color:rgba(230,194,122,.6)}' +
    '.au-escs{margin:6px 12px 14px;font:500 12.5px Figtree,system-ui,sans-serif;color:#d6dde5}.au-escs .eh{display:flex;align-items:center;justify-content:space-between;margin:0 0 6px}.au-escs .k{font:700 10.5px Figtree,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#e6c27a}.au-escs .s{color:#9fb0c0;font-size:11.5px;margin:0 0 10px;line-height:1.4}.au-escs .s b{color:#f1dfb5}' +
    '.au-escs button{font:inherit;cursor:pointer}.au-escs .eh button{border:1px solid rgba(230,194,122,.5);background:transparent;color:#f1dfb5;border-radius:999px;padding:4px 10px;font-weight:800;font-size:11.5px}' +
    '.au-escs .ei{border:1px solid rgba(255,255,255,.12);border-left:4px solid var(--c);border-radius:11px;background:rgba(255,255,255,.04);margin:0 0 7px;padding:2px 4px 4px}.au-escs .ei.cfg{background:rgba(255,255,255,.08)}' +
    '.au-escs .eo{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:8px;align-items:center;width:100%;border:0;background:transparent;color:#eef2f5;text-align:left;padding:7px 6px 3px}.au-escs .eo:hover b{color:#f1dfb5}.au-escs .dot{width:10px;height:10px;border-radius:3px;background:var(--c)}' +
    '.au-escs .eo span{min-width:0}.au-escs .eo span b{display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.au-escs .eo i{font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#14263c;background:#e6c27a;border-radius:4px;padding:1px 4px;margin-left:4px;vertical-align:1px}.au-escs .eo small{display:block;color:#9fb0c0;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.au-escs .eo small.lb{color:#e8d6aa}.au-escs .eo .n{font-size:13px;color:#f1dfb5}' +
    '.au-escs .ea{display:flex;justify-content:flex-end;gap:5px;padding:0 4px}.au-escs .ea button{border:1px solid rgba(255,255,255,.2);background:transparent;color:#d6dde5;border-radius:999px;padding:2px 8px;font-size:11.5px}.au-escs .ea button.pri{background:#e6c27a;color:#14263c;border-color:#e6c27a;font-weight:800}' +
    '.au-escs .ec{display:grid;gap:6px;padding:8px 6px 6px}.au-escs .ec label{display:grid;gap:3px;font-size:11px;color:#9fb0c0}.au-escs .ec input,.au-escs .ec textarea{border:1px solid rgba(255,255,255,.22);background:#0b1824;color:#fff;border-radius:7px;padding:6px 8px;font:13px Figtree,system-ui,sans-serif;resize:vertical}' +
    '.au-escs .cores{display:flex;flex-wrap:wrap;gap:5px}.au-escs .cores button{width:20px;height:20px;border-radius:6px;border:2px solid transparent;padding:0}.au-escs .cores button.on{border-color:#fff}.au-escs .del{justify-self:start;border:1px solid rgba(255,140,120,.5);background:transparent;color:#ffb4a3;border-radius:999px;padding:3px 10px;font-size:11.5px}' +
    /* sem conexão: aviso discreto, sem bloquear */
    '#au-semcon{position:fixed;left:50%;transform:translateX(-50%);top:64px;z-index:2147480000;display:flex;align-items:center;gap:10px;padding:8px 10px 8px 14px;border-radius:999px;background:#0f1f2e;color:#eef2f5;border:1px solid rgba(230,194,122,.55);box-shadow:0 8px 24px rgba(0,0,0,.25);font:600 13px Figtree,system-ui,sans-serif}' +
    '#au-semcon button{border:0;background:#e6c27a;color:#14263c;border-radius:999px;padding:6px 12px;font:800 12.5px Figtree,system-ui,sans-serif;cursor:pointer}#au-semcon .x{background:transparent;color:#d6dde5;font-size:16px;padding:2px 6px}';
  D.head.appendChild(cssK);

  /* abertura: carga → (token) → carga → painéis; sem token, tela "não conectado". Os painéis nunca aparecem vazios. */
  var t0 = Date.now(), jaPronto = false, vistoToken = false, lendoDesde = 0;
  var CARGA_HTML = '<div class="cc"><span class="mk" role="img" aria-label="Gabinete CMT"><span class="st"></span></span><p class="id">Ab Initio · Gabinete A</p><p class="gr" data-cmtc-gr>' + (function () { var h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; })() + ', <em>gabinete.</em></p><div class="tk" aria-hidden="true"><i></i></div><p class="sg">Carregando o acervo do procs-muta…</p><p class="dt">Gabinete do Des. Fed. Carlos Muta · TRF-3 · Turma Regional de MS</p></div>';
  function tirarCarga() { var el = D.getElementById('cmt-carga'); if (el && !el.classList.contains('sai')) { el.classList.add('sai'); setTimeout(function () { el.remove(); }, 400); } }
  function porCarga() { var el = D.getElementById('cmt-carga'); if (el && !el.classList.contains('sai')) return; if (el) el.remove(); el = D.createElement('div'); el.id = 'cmt-carga'; el.setAttribute('role', 'status'); el.innerHTML = CARGA_HTML; D.body.prepend(el); }
  function descon(on) {
    D.body.classList.toggle('au-descon', on);
    var o = D.getElementById('au-semcon');
    if (!on) { if (o) o.remove(); return; }
    if (o || D.body.__semconFechado) return;
    o = D.createElement('div'); o.id = 'au-semcon'; o.setAttribute('role', 'status');
    o.innerHTML = '<span>Sem conexão com o procs-muta: o acervo não foi lido.</span><button type="button" data-au-con>Conectar</button><button type="button" class="x" data-au-semx aria-label="Dispensar o aviso">×</button>';
    D.body.appendChild(o);
  }
  setInterval(function () { var o = D.getElementById('au-semcon'); if (!o) return; var w = mw(), tem = false; try { tem = !!(w && w.ProcsMuta && w.ProcsMuta.atual); } catch (e) {} if (tem) descon(false); else if (ACV.recs && ACV.recs.length) o.remove(); }, 600);
  D.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-au-con],[data-au-semx]'); if (!b) return; e.preventDefault(); if (b.hasAttribute('data-au-semx')) { D.body.__semconFechado = true; descon(false); return; } W.CMTConexao(); }, true);
  function carga() {
    if (jaPronto) return;
    var w = mw(), tok = D.body.classList.contains('cmt-token'), tem = false, erro = '';
    try { tem = !!(w && w.ProcsMuta && w.ProcsMuta.atual); } catch (e) {}
    try { erro = w && w.CMTAcervoDados ? w.CMTAcervoDados.estado().erro : ''; } catch (e) {}
    var pronto = ACV.recs && ACV.recs.length && $('#au-kpi') && $('#au-kpi').children.length;
    if (pronto) { jaPronto = true; descon(!tem); tirarCarga(); return; }
    if (tok) { vistoToken = true; descon(false); lendoDesde = 0; return; }          /* o motor, em tela cheia, cobre tudo */
    var temPM = false; try { temPM = !!(w && w.ProcsMuta); } catch (e) {}
    if (!tem && temPM && (erro || Date.now() - t0 > 1200)) { jaPronto = true; tirarCarga(); descon(true); return; }   /* sem token: abre o app e avisa, sem pedir nada */
    descon(false);
    if (!lendoDesde) lendoDesde = Date.now();
    if (erro || Date.now() - lendoDesde > 45000) { jaPronto = true; tirarCarga(); descon(!tem); return; } /* falhou: os painéis mostram o aviso e o botão de atualizar */
    porCarga();
  }
  var cssC = D.createElement('style');
  cssC.textContent =
    'body.cmt-token #cmt-motor,body.cmt-token.cmt-acv #cmt-motor{left:0!important;top:0!important;width:100vw!important;height:100vh!important;z-index:2147483100!important;visibility:visible!important;pointer-events:auto!important}' +
    'body.cmt-token #index,body.cmt-token #rail,body.cmt-token #au-rail{visibility:hidden!important}' +
    '#au-descon{position:fixed;inset:0;z-index:2147482000;background:#0f1f2e;display:flex;align-items:center;justify-content:center;font:14px/1.5 Figtree,system-ui,sans-serif}' +
    '#au-descon .dc{display:flex;flex-direction:column;align-items:center;gap:16px;width:calc(100% - 32px);max-width:460px}' +
    '#au-descon .dc>b{color:#fff;font-size:15px;letter-spacing:.14em;text-transform:uppercase}#au-descon em{font-style:normal;color:#e6c27a}' +
    '#au-descon .dk{background:#fff;color:#22313c;border-radius:12px;padding:20px 22px;box-shadow:0 10px 40px rgba(0,0,0,.3);width:100%;box-sizing:border-box}' +
    '#au-descon h3{margin:0 0 8px;font-size:17px}#au-descon p{margin:0 0 14px}' +
    '#au-descon button{display:block;margin-left:auto;padding:7px 14px;border:0;background:#265f85;color:#fff;border-radius:7px;cursor:pointer;font:700 14px Figtree,system-ui,sans-serif}' +
    '';
  D.head.appendChild(cssC);
  /* sobra da versão antiga: o botão flutuante de sincronia do painel (o envio antigo está desligado) */
  function limparMotor() { try { var md = mw().document; if (md && md.head && !md.getElementById('cmt-sobras')) { var st = md.createElement('style'); st.id = 'cmt-sobras'; st.textContent = '#acvBtn{display:none!important}'; md.head.appendChild(st); }
    [].slice.call(md.querySelectorAll('span,div,small,p')).forEach(function (e) { if (!e.children.length && /^\s*gabinete a\s*·\s*painel central\s*$/i.test(e.textContent)) e.textContent = 'Gabinete A · Ab Initio'; }); } catch (e) {} }
  setInterval(carga, 150);
  setInterval(function () { if (!W.__acvUnico) ligar(); montarIntegral(); indice(); limparMotor(); if (!apoio) carregarApoio(); }, 700);
  /* =================== Acervo = página do Acervo Central, com os painéis laterais =================== */
  var cssA = D.createElement('style');
  cssA.textContent =
    'body.cmt-acv.cmt-modo #rail{visibility:visible!important}body.cmt-acv #au-rail{display:block!important}' +
    'body.cmt-acv #cmt-motor{left:var(--ixw)!important;width:calc(100vw - var(--ixw) - var(--rlw))!important}' +
    'body.cmt-acv:not(.ix-min){--ixw:340px}body.cmt-acv.au-ix-ext:not(.ix-min){--ixw:min(600px,36vw)}body.cmt-acv:not(.rail-min){--rlw:440px}body.cmt-acv.au-rl-ext:not(.rail-min){--rlw:min(700px,40vw)}' +
    'body.cmt-acv.cmt-modo #index .ix-g[data-tab="acervo"]{display:block!important}body.cmt-acv.cmt-modo #index .ix-g.cmt{display:none!important}' +
    'body.cmt-acv:not(.ix-min) .au-alca-ix,body.cmt-acv:not(.rail-min) .au-alca-rl{display:flex!important}body.cmt-acv .au-side [data-au-act="tab"]{display:none}' +
    '.au-side .au-aviso{display:block;margin:8px 0 2px;padding:7px 9px;border-radius:8px;background:rgba(196,149,60,.16);border:1px solid rgba(230,194,122,.45);color:#f1dfb5;font-size:11.5px;line-height:1.4}';
  D.head.appendChild(cssA);

  /* situação pela regra do PJe e seção pelo CNJ, dentro do Acervo Central */
  var ganchos = 0;
  function ligarMotor() {
    var w = mw(), c = comp(); if (!w || !c || !ACV.recs) return;
    if (ganchos === GERACAO && w.__cmtSitPJe) return;
    ganchos = GERACAO;
    w.__cmtSitFiltro = function (r) {
      var o = MAPA.get(dig(r.processo || r.Processo)); if (!o) return true;
      if (o.caminho) return ACV.st.f.cam === 'com';
      return !ACS.hide.has(o.sit);
    };
    w.__cmtSitPJe = function (r) {
      var o = MAPA.get(dig(r.processo || r.Processo)); if (!o) return null;
      if (o.caminho) return { label: 'A CAMINHO', bg: '#e7eef7', fg: '#1b3553' };
      if (o.sit === 'baix' || o.sit === 'fora') return { label: 'BAIXADO', bg: '#f6e9ea', fg: '#7a2633' };
      if (o.sit === 'arq' || o.sit === 'canc' || o.sit === 'elim') return { label: 'ARQUIVADO', bg: '#eef0f6', fg: '#4d5b69' };
      return null;
    };
    if (!c.__sitOrig) {
      c.__sitOrig = c.computeSituacao;
      c.computeSituacao = function (r) {
        var out = c.__sitOrig.call(c, r);
        if (out && out.label === 'ARQUIVADO') { var o = MAPA.get(dig(r.processo || r.Processo)); if (o && !o.caminho && ['arq', 'baix', 'canc', 'elim', 'fora'].indexOf(o.sit) < 0) return o.sit === 'julg' ? { label: 'JULGADO', bg: '#e6f0ea', fg: '#2f6b52' } : { label: 'EM TRAMITAÇÃO', bg: '#e6f0ea', fg: '#2f6b52' }; }
        return out;
      };
    }
    if (!c.__secOrig) c.__secOrig = c.secaoCompetente;
    c.secaoCompetente = function (r) { var o = MAPA.get(dig(r.processo || r.Processo)); return (o && o.secCNJ) || (c.__secOrig ? c.__secOrig.call(c, r) : r['Seção Competente']); };
    try { c._sitCache = new Map(); c.refresh(); } catch (e) {}
  }
  /* o filtro do Acervo Central vale também para o painel direito */
  var SIG = '';
  function sincronizarFiltro() {
    var c = comp(); if (!c || !ACV.recs || typeof c.filteredCentral !== 'function') return;
    var on = D.body.classList.contains('cmt-acv'), st = c.state || {};
    var lista = null; if (on) { try { lista = c.filteredCentral(); } catch (e) { lista = null; } }
    var sig = on ? JSON.stringify([c.criteria, [].slice.call(c.tagFilters || []), st.search, st.showArquivados, st.searchMode, c.rows.length, GERACAO, lista && lista.length, lista && lista.length && dig(lista[0].r.Processo), lista && lista.length && dig(lista[lista.length - 1].r.Processo)]) : 'fora';
    if (sig === SIG) return; SIG = sig;
    if (on && lista) ACV.st.f.motor = new Set(lista.map(function (x) { return dig(x.r.processo || x.r.Processo); }));
    else delete ACV.st.f.motor;
    try { acvRender(); } catch (e) {}
    fases(true);
  }
  function motorFiltrar(lista, titulo) {
    var c = comp(); if (!c) return;
    /* a lista pode trazer encerrados ou processos a caminho: o seletor de situações abre espaço para eles */
    try { var falta = new Set(), cam = false; lista.forEach(function (o) { if (o.caminho) cam = true; else if (ACS.hide.has(o.sit)) falta.add(o.sit); });
      if (cam) ACV.st.f.cam = 'com'; if (falta.size) acsSetHide(Array.from(ACS.hide).filter(function (k) { return !falta.has(k); })); } catch (e) {}
    var M = new Map(); c.rows.forEach(function (x) { M.set(dig(x.processo || x.Processo), x.Processo || x.processo); });
    var vals = lista.map(function (o) { return M.get(dig(o.p)) || o.p; });
    c.criteria.push({ column: 'Processo', op: 'equals', values: vals, combine: 'any', rotuloCMT: titulo });
    try { c.setState({ limit: (c.props && c.props.pageSize) || 60 }); } catch (e) { c.refresh(); }
    aviso('Filtro aplicado no Acervo: ' + titulo + ' (' + nf(vals.length) + ').');
  }
  function fichaNoLugar(p) {
    var w = mw(), c = comp(); var i = c.rows.findIndex(function (r) { return dig(r.processo || r.Processo) === dig(p); });
    if (i < 0) { aviso('Processo fora do acervo fonte: ' + p); return; }
    try { c.openCards.clear(); c.openCards.add(i); c.setState({ tab: 'central', search: c.rows[i].Processo || p, showArquivados: true, limit: 60 }); } catch (e) {}
    var md = w.document, num = dig(p), n = 0;
    var t = setInterval(function () {
      var el = [].slice.call(md.querySelectorAll('div,span,h3,h4,b,strong')).find(function (e) { return !e.children.length && /^controles de trabalho$/i.test(e.textContent.trim()); });
      var card = el; while (card && card.parentElement && dig(card.textContent).indexOf(num) < 0) card = card.parentElement;
      if (card && card !== md.body) { clearInterval(t); card.scrollIntoView({ block: 'start', behavior: 'smooth' }); } else if (++n > 20) clearInterval(t);
    }, 150);
  }

  /* painel "Fases e tarefas do PJe" logo abaixo dos indicadores do Acervo Central */
  var CORES = ['#3e72ad', '#d9a046', '#b0524a', '#8a70c0', '#1f8a6e', '#2a9d8f', '#5d6475'];
  var FSIG = '';
  function fases(forcar) {
    var w = mw(), md = w && w.document; if (!md || !ACV.recs || typeof STN === 'undefined' || typeof TK === 'undefined') return;
    var pv = md.getElementById('pv-stats'); if (!pv || !pv.isConnected) return;
    var sec = md.getElementById('cmt-fases');
    if (!md.getElementById('cmt-fases-css')) { var st = md.createElement('style'); st.id = 'cmt-fases-css'; st.textContent =
      '#cmt-fases{margin:4px 0 6px;order:-1;font-family:Figtree,system-ui,sans-serif;color:#14263c}#cmt-fases[hidden]{display:none}' +
      '#cmt-fases .fh{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin:0 2px 12px}#cmt-fases .fh h2{white-space:nowrap;margin:0;font:800 22px Figtree,system-ui,sans-serif;letter-spacing:-.02em}#cmt-fases .fh small{color:#6d7b8a;font-size:13px}#cmt-fases .fh b{margin-left:auto;font-size:13px;color:#1b3553}' +
      '#cmt-fases .fg{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}' +
      '#cmt-fases .fc{background:#fff;border:1px solid #e7e2d8;border-radius:18px;padding:14px 16px;box-shadow:0 1px 2px rgba(20,38,60,.04);border-top:4px solid var(--fc)}' +
      '#cmt-fases .fc h3{display:flex;align-items:baseline;gap:8px;margin:0 0 10px;font:800 14px Figtree,system-ui,sans-serif}#cmt-fases .fc h3 span{margin-left:auto;font:800 20px Figtree,system-ui,sans-serif;color:var(--fc)}' +
      '#cmt-fases .ft{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;align-items:center;width:100%;text-align:left;border:0;background:transparent;padding:7px 8px;margin:0 -8px;border-radius:10px;cursor:pointer;font:inherit;color:inherit}' +
      '#cmt-fases .ft:hover{background:#f6f3ec}#cmt-fases .ft.au-sel{background:#fbf3e3;outline:2px solid #c4953c}#cmt-fases .ft span{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#cmt-fases .ft b{font-size:14px;color:var(--fc)}' +
      '#cmt-fases .ft small{grid-column:1/-1;color:#6d7b8a;font-size:11.5px}#cmt-fases .ft i{grid-column:1/-1;height:4px;border-radius:3px;background:linear-gradient(90deg,var(--fc) var(--w),#eef0f3 var(--w))}' +
      '#cmt-fases .old{color:#b0524a;font-weight:700}';
      md.head.appendChild(st); }
    if (!sec) { sec = md.createElement('section'); sec.id = 'cmt-fases'; sec.addEventListener('click', cliqueFase); }
    var cdb = md.querySelector('#cmt-dados .cd-b'); if (!cdb) return;
    if (sec.parentElement !== cdb) cdb.appendChild(sec);
    sec.hidden = pv.hidden || !D.body.classList.contains('cmt-acv');
    var all = acvFiltered(), sig = GERACAO + '|' + all.length + '|' + SIG.length + '|' + (all[0] && all[0].p);
    if (!forcar && sig === FSIG && sec.firstChild) return; FSIG = sig;
    var gab = all.filter(function (o) { return o.gab; }), fora = all.filter(function (o) { return !o.gab; });
    var cards = STN.map(function (s, si) {
      var tks = TK.filter(function (t) { return t.st === s.id; }).map(function (t) { var L = gab.filter(function (o) { return o.gtk.indexOf(t.id) >= 0; }); return { t: t, L: L }; }).filter(function (x) { return x.L.length; });
      if (!tks.length) return '';
      var tot = new Set([].concat.apply([], tks.map(function (x) { return x.L.map(function (o) { return o.p; }); }))).size, mx = Math.max.apply(null, tks.map(function (x) { return x.L.length; }));
      return '<div class="fc" style="--fc:' + CORES[si % CORES.length] + '"><h3>' + esc(s.t) + '<span>' + nf(tot) + '</span></h3>' + tks.map(function (x) {
        var ds = x.L.map(function (o) { var tk = o.tks.find(function (k) { return PJEF_TK[pjeNorm(k.t)] === x.t.id; }); return tk ? acvDays(tk.de) : null; }).filter(function (d) { return d != null; });
        var med = ds.length ? Math.round(ds.reduce(function (a, b) { return a + b; }, 0) / ds.length) : null, velho = ds.length ? Math.max.apply(null, ds) : null;
        return '<button type="button" class="ft" data-cmt-tk="' + esc(x.t.id) + '" style="--w:' + Math.max(3, Math.round(100 * x.L.length / mx)) + '%"><span>' + esc(x.t.nome) + '</span><b>' + nf(x.L.length) + '</b>' + (med != null ? '<small>média ' + med + ' d · mais antigo <span class="' + (velho > 180 ? 'old' : '') + '">' + velho + ' d</span></small>' : '') + '<i></i></button>'; }).join('') + '</div>';
    }).join('');
    var sits = SIT.map(function (x) { return { x: x, L: fora.filter(function (o) { return o.sit === x.k; }) }; }).filter(function (g) { return g.L.length; });
    var mxs = Math.max.apply(null, sits.map(function (g) { return g.L.length; }).concat(1));
    var foraCard = sits.length ? '<div class="fc" style="--fc:#5d6475"><h3>Fora do gabinete<span>' + nf(fora.length) + '</span></h3>' + sits.map(function (g) {
      var top = acvCount(g.L, function (o) { return o.tks.map(function (t) { return t.t; }); }).slice(0, 2).map(function (y) { return esc(y[0]) + ' (' + y[1] + ')'; }).join(' · ');
      return '<button type="button" class="ft" data-cmt-sit="' + g.x.k + '" style="--w:' + Math.max(3, Math.round(100 * g.L.length / mxs)) + '%"><span>' + esc(g.x.t) + '</span><b>' + nf(g.L.length) + '</b>' + (top ? '<small>' + top + '</small>' : '') + '<i></i></button>'; }).join('') + '</div>' : '';
    sec.innerHTML = '<div class="fh"><h2>Fases e tarefas do PJe</h2><small>caixas do gabinete por estação e processos fora do gabinete · acervo ativo do filtro · clique para ver a lista no painel à direita</small><b>' + nf(gab.length) + ' no gabinete · ' + nf(fora.length) + ' fora</b></div><div class="fg">' + cards + foraCard + '</div>';
  }
  function cliqueFase(e) {
    var b = e.target.closest('[data-cmt-tk],[data-cmt-sit]'); if (!b) return; e.preventDefault();
    var all = acvFiltered(), L, tit;
    if (b.dataset.cmtTk) { var t = (TK.find(function (x) { return x.id === b.dataset.cmtTk; }) || {}); L = all.filter(function (o) { return o.gab && o.gtk.indexOf(b.dataset.cmtTk) >= 0; }); tit = 'Caixa: ' + (t.nome || b.dataset.cmtTk); }
    else { var sx = SIT_BY[b.dataset.cmtSit]; L = all.filter(function (o) { return !o.gab && o.sit === b.dataset.cmtSit; }); tit = 'Fora do gabinete: ' + (sx ? sx.t : b.dataset.cmtSit); }
    abrirLista(b.closest('#cmt-fases'), tit, L, { rotulo: 'Filtrar estes' });
  }
  /* estado da leitura do procs-muta no bloco de dados (painel esquerdo) */
  function avisoDados() {
    var s = $('.au-side'), w = mw(), c = comp(); if (!s || !w || !w.CMTAcervoDados || !c) return;
    var e = w.CMTAcervoDados.estado(), msg = '';
    if (e.erro) msg = 'O acervo do procs-muta não foi lido: ' + e.erro + '.';
    else if (e.total && c.rows.length < e.total) msg = 'Este navegador tem ' + nf(c.rows.length) + ' processos, e o procs-muta tem ' + nf(e.total) + '.';
    var a = s.querySelector('.au-aviso');
    if (!msg) { if (a) a.remove(); return; }
    if (!a) { a = D.createElement('div'); a.className = 'au-aviso'; var n = s.querySelector('.s'); (n ? n.nextSibling : s.firstChild) ? s.insertBefore(a, (s.querySelectorAll('.s')[1] || n || s.firstChild).nextSibling) : s.appendChild(a); }
    var html = esc(msg) + ' <button type="button" class="pri" data-au-act="puxar" style="margin-top:6px">Atualizar do procs-muta</button>';
    if (a.__h !== html) { a.innerHTML = html; a.__h = html; }
  }
  D.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-au-act="puxar"]'); if (!b) return; e.preventDefault(); e.stopPropagation(); var w = mw(); if (w && w.CMTAcervoDados) { b.disabled = true; b.textContent = 'Lendo o procs-muta…'; w.CMTAcervoDados.puxar(false).then(function () { try { W.CMTShell.recarregar(); } catch (er) {} }); } }, true);
  setInterval(function () { if (!W.__acvUnico) return; ligarMotor(); sincronizarFiltro(); if (D.body.classList.contains('cmt-acv')) fases(false); else { try { var fz = mw().document.getElementById('cmt-fases'); if (fz) fz.hidden = true; } catch (e) {} } avisoDados(); }, 400);

  /* =================== Acervo: menu suspenso com três páginas =================== */
  var PAGS = [['panorama', 'Gestor de acervo', 'indicadores, retrato, entradas e saídas, no gabinete, blocos e mapa de vazão'], ['central', 'Triagem', 'busca avançada, escaninhos, planilha e prontuário'], ['relatorios', 'Relatórios', 'gerador de relatórios em PDF']];
  function subAtual() { var b = D.body.classList; return b.contains('cmt-acv') ? 'central' : b.contains('cmt-int-on') ? 'integral' : b.contains('au-relpag') ? 'relatorios' : b.contains('au-pan') ? 'panorama' : ''; }
  function fecharMenu() { var m = $('#au-dd'); if (m) m.remove(); D.querySelectorAll('nav.mods .mod[data-tab="acervo"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); }
  W.CMTAcervoMenu = function (btn) {
    irSub('panorama'); return;
    if ($('#au-dd')) { fecharMenu(); return; }
    var r = btn.getBoundingClientRect(), at = subAtual(), m = D.createElement('div');
    m.id = 'au-dd'; m.setAttribute('role', 'menu');
    m.style.left = Math.max(8, r.left) + 'px'; m.style.top = (r.bottom + 6) + 'px';
    m.innerHTML = PAGS.map(function (x) { return '<a href="#" role="menuitem" data-au-sub="' + x[0] + '" class="' + (at === x[0] ? 'on' : '') + '"><b>' + x[1] + '</b><small>' + x[2] + '</small></a>'; }).join('');
    D.body.appendChild(m); btn.setAttribute('aria-expanded', 'true');
    var a = m.querySelector('a.on') || m.querySelector('a'); if (a) a.focus();
  };
  D.addEventListener('click', function (e) { if (!$('#au-dd')) return; if (e.target.closest && (e.target.closest('#au-dd') || e.target.closest('nav.mods .mod[data-tab="acervo"]'))) return; fecharMenu(); }, true);
  D.addEventListener('keydown', function (e) {
    var m = $('#au-dd'); if (!m) return;
    if (e.key === 'Escape') { fecharMenu(); var b = $('nav.mods .mod[data-tab="acervo"]'); if (b) b.focus(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var L = [].slice.call(m.querySelectorAll('a')), i = L.indexOf(D.activeElement); i = (i + (e.key === 'ArrowDown' ? 1 : -1) + L.length) % L.length; L[i].focus(); }
  });
  function marcarAcervo() { var pan = D.body.classList.contains('au-pan'); D.querySelectorAll('nav.mods .mod').forEach(function (b) { if (b.dataset.tab === 'acervo') b.classList.toggle('on', pan); else if (pan) b.classList.remove('on'); }); }
  function sairPanorama() { D.body.classList.remove('au-relpag'); if (!D.body.classList.contains('au-pan')) return; D.body.classList.remove('au-pan'); try { acvRender(); } catch (e) {} }
  function irSub(k) {
    fecharMenu(); if (ESC.dlg) fecharEscaninho();
    D.body.classList.remove('cmt-int-on', 'cmt-blo-on');
    if (k === 'blocos') k = 'panorama';
    if (k === 'central') { sairPanorama(); W.CMTShell.entrar('central'); }
    else if (k === 'panorama' || k === 'relatorios') { W.CMTShell.sair(); try { showTab('acervo'); } catch (e) {} D.body.classList.add('au-pan'); D.body.classList.remove('au-relpag'); if (k === 'relatorios' && D.body.classList.contains('rail-min')) { var tg = $('#rlTog'); if (tg) tg.click(); } relatoriosNoPanorama(); panorama(); scrollTo({ top: 0 }); }
    else if (k === 'integral') { sairPanorama(); abrirIntegral(); }
    marcarAcervo();
  }
  D.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-au-sub]'); if (!a) return; e.preventDefault(); e.stopPropagation(); irSub(a.dataset.auSub); }, true);
  /* qualquer outra navegação encerra o Panorama */
  D.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('nav.mods .mod'); if (b && b.dataset.tab !== 'acervo') sairPanorama(); }, true);
  setInterval(function () { if (D.body.classList.contains('au-pan') && (D.body.classList.contains('cmt-modo') || D.body.classList.contains('cmt-int-on') || D.body.classList.contains('cmt-cfg-on'))) sairPanorama(); }, 300);

  /* =================== Navegação: Monitor | Triagem | Pautas =================== */
  function rrSeta() { var b = $('#au-relrail [data-au-rrx]'); if (!b) return; var ext = D.body.classList.contains('au-rl-ext'), d = ext ? 'd' : 'e'; if (b.__d !== d) { b.innerHTML = SETA(d); b.__d = d; } b.title = ext ? 'Voltar à largura normal' : 'Estender o painel'; b.setAttribute('aria-label', b.title); }
  D.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('nav.mods .mod[data-cmt="central"]'); if (!b) return; e.preventDefault(); e.stopImmediatePropagation(); irSub('central'); }, true);
  var RAIL_INI = false;
  function rotulosNav() {
    if (!RAIL_INI && D.body.classList.contains('au-pan') && $('#rlTog')) { RAIL_INI = true; if (!D.body.classList.contains('rail-min')) $('#rlTog').click(); }
    var m = $('nav.mods .mod[data-tab="acervo"]'); if (m && m.textContent !== 'Gestor de acervo') m.textContent = 'Gestor de acervo';
    if (m) { m.removeAttribute('aria-haspopup'); m.title = 'Gestor de acervo: indicadores, retrato, entradas e saídas, no gabinete, blocos, mapa de vazão e relatórios'; }
    marcarAcervo();
  }
  setInterval(rotulosNav, 500);
  var cssNav = D.createElement('style');
  cssNav.textContent = 'html body nav.mods .mod[data-tab="acervo"]::after{content:none!important}' +
    /* Monitor: o painel direito é o gerador de relatórios */
    'html body.au-pan:not(.rail-min){--rlw:min(520px,38vw)!important}html body.au-pan.au-rl-ext:not(.rail-min){--rlw:min(1180px,68vw)!important}html body.au-pan.rail-min{--rlw:46px!important}' +
    'html body.au-pan #rail{visibility:visible!important;width:auto!important;min-width:0!important;overflow:auto!important;padding:0!important}' +
    'html body.au-pan:not(.rail-min) #rail{border-left:1px solid var(--line)!important;background:var(--bg,#f4f2ed)!important}html body.au-pan.rail-min #rail{border-left:3px solid #c4953c!important}' +
    'html body.au-pan #au-rail{display:none!important}#au-relrail{display:none}html body.au-pan:not(.rail-min) #au-relrail{display:block}html body.au-pan .au-alca{display:none!important}' +
    'html body.au-pan #rlTog .au-rbadge{display:none!important}' +
    '#au-relrail .au-rrh{position:sticky;top:0;z-index:6;display:flex;align-items:center;gap:12px;height:66px;padding:0 54px 0 18px;background:linear-gradient(135deg,#0f1f2e 0%,#18324a 100%);border-bottom:2px solid #c4953c;box-shadow:0 4px 12px rgba(15,31,46,.18)}' +
    '#au-relrail .au-rt{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}#au-relrail .au-rt>b{font:800 10px Figtree,system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#e6c27a}' +
    '#au-relrail .au-rn{display:flex;align-items:baseline;gap:8px;min-width:0}#au-relrail .au-rn strong{font:700 18px/1.1 Figtree,system-ui,sans-serif;color:#fff;white-space:nowrap}#au-relrail .au-rn small{color:#9fb0c0;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}' +
    '#au-relrail .au-rrx{flex:0 0 auto;display:grid;place-items:center;width:30px;height:30px;border-radius:999px;border:1px solid rgba(230,194,122,.5);background:rgba(255,255,255,.06);color:#f1dfb5;cursor:pointer}#au-relrail .au-rrx:hover{background:rgba(230,194,122,.15)}' +
    '#au-relrail .au-rrc{padding:14px 14px 40px}#au-relrail #relatorios{display:block!important;margin:0!important;padding:0!important}#au-relrail .au-sub-pdf,#au-relrail #relatorios>.pane-head{display:none!important}' +
    '#au-relrail #rp{margin:0!important;border:0!important;box-shadow:none!important;background:transparent!important;padding:0!important}' +
    'html body:not(.au-rl-ext) #au-relrail #rp .rp-grid{display:block!important}html body:not(.au-rl-ext) #au-relrail #rp .rp-cat{position:static!important;max-height:none!important;margin:0 0 14px!important;width:auto!important}' +
    'html body.au-rl-ext #au-relrail #rp .rp-grid{display:grid!important;grid-template-columns:260px minmax(0,1fr)!important;gap:16px!important}' +
    '#au-relrail .rp-main{min-width:0}#au-relrail #rp-prev{max-width:100%;overflow:auto}';
  D.head.appendChild(cssNav);

  /* =================== Panorama geral =================== */
  function relatoriosNoPanorama() {
    var rel = $('#relatorios'), body = $('#acvbody'); if (!rel || !body) return;
    var rail = $('#rail'); if (!rail) return;
    var rr = $('#au-relrail');
    if (!rr) {
      rr = D.createElement('div'); rr.id = 'au-relrail';
      rr.innerHTML = '<div class="au-rrh"><div class="au-rt"><b>Relatórios</b><div class="au-rn"><strong>Gerador de PDF</strong><small>gabinete, triagem, sessão, competência e matérias</small></div></div>' +
        '<button type="button" class="au-rrx" data-au-rrx title="Estender o painel" aria-label="Estender o painel">' + SETA('e') + '</button></div><div class="au-rrc"></div>';
      rail.appendChild(rr);
      rr.querySelector('[data-au-rrx]').addEventListener('click', function () { D.body.classList.toggle('au-rl-ext'); try { alcas(); } catch (e) {} rrSeta(); });
    }
    var cx = rr.querySelector('.au-rrc');
    if (rel.parentElement !== cx) { rel.classList.remove('tabpane'); rel.hidden = false; rel.classList.add('au-rel'); cx.appendChild(rel); }
    var velho = $('#au-pan-rel'); if (velho) velho.remove();
    rrSeta();
    try { acvRender(); } catch (e) {}
  }
  function panorama() {
    var pane = $('#acervo'), hg = $('#acervo > .au-h[data-r="geral"]'), body = $('#acvbody'); if (!pane || !hg || !body) return;
    var topo = $('#au-pan-top');
    if (!topo) {
      topo = D.createElement('div'); topo.id = 'au-pan-top';
      topo.innerHTML = '<div class="pt-h"><h1>Monitor</h1><small>acervo ativo inteiro, sem filtros · para buscar e filtrar, use a Triagem</small></div>' +
        '<nav class="pt-nav" aria-label="Seções do Panorama"><a href="#ai-b1">Panorama</a><a href="#ai-b2">Destinação</a><a href="#ai-b3">Movimento</a><a href="#ai-b4">Localização</a></nav>' +
        '<div id="au-pan-pvs"></div><div id="au-pan-ind"></div>';
      topo.querySelector('.pt-nav').addEventListener('click', function (e) { var a = e.target.closest('a'); if (!a) return; e.preventDefault(); var t = D.getElementById(a.getAttribute('href').slice(1)); if (t) scrollTo({ top: t.getBoundingClientRect().top + scrollY - 70, behavior: 'smooth' }); });
    }
    if (topo.nextElementSibling !== hg) hg.before(topo);
    hg.id = 'au-pan-vg';
    var blo = $('#au-pan-blo');
    if (!blo) {
      blo = titulo('blo', 'Painel por blocos', 'acervo ativo atual: processos semelhantes agrupados, com o destino provável de cada bloco'); blo.id = 'au-pan-blo';
      var cx = D.createElement('div'); cx.id = 'au-pan-blobox'; cx.innerHTML = '';
      blo.__cx = cx;
    }
    if (blo.previousElementSibling !== body) body.after(blo);
    if (!blo.__cx.parentElement) blo.after(blo.__cx);
    var gb = $('#au-pan-gab'), ag = $('#acv-gab');
    if (!gb) { gb = titulo('gab', 'No gabinete', 'por estação e caixa do PJe · abra a caixa para ver os processos, do mais antigo ao mais recente'); gb.id = 'au-pan-gab'; }
    if (gb.previousElementSibling !== topo) topo.after(gb);
    gabNoOndeEstao();
    try { if (pref.ui && pref.ui.acvView === 'sheet') { pref.ui.acvView = 'panels'; acvRender(); } } catch (e) {}
    try { portarIndicadores(); } catch (e) { console.warn('[Monitor] indicadores', e); }
    indicadores($('#au-pan-ind')); pintarBlocos(blo.__cx); relatoriosUmTitulo(); textosPanorama(); secoesPanorama();
  }
  setInterval(function () { if (D.body.classList.contains('au-pan')) { panorama(); alturaBlocos(); } }, 900);
  /* os cliques de filtro no Panorama abrem a lista no Acervo Central */
  D.addEventListener('click', function (e) {
    if (!D.body.classList.contains('au-pan')) return;
    var t = e.target.closest && e.target.closest('#acervo [data-acvset], #acervo [data-acvf]'); if (!t || t.closest('#relatorios')) return;
    e.preventDefault(); e.stopPropagation();
    var ext = {}, tit;
    if (t.dataset.acvset) { var kv = t.dataset.acvset.split(':'); ext[kv[0]] = kv[1]; tit = rotulo(t.closest('.tkc-row, li, div') || t); }
    else { ext[t.dataset.acvf] = t.dataset.v; tit = (ACV_FIELDS[t.dataset.acvf] || t.dataset.acvf) + ': ' + (t.dataset.acvf === 'sit' && SIT_BY[t.dataset.v] ? SIT_BY[t.dataset.v].t : t.dataset.v); }
    var lista = acvFiltered(ext);
    irSub('central');
    var n = 0, tm = setInterval(function () { var c = comp(); if ((c && W.__acvUnico && D.body.classList.contains('cmt-acv')) || ++n > 40) { clearInterval(tm); if (c) motorFiltrar(lista, tit); } }, 150);
  }, true);
  function relatoriosUmTitulo() {
    var rel = $('#relatorios'); if (!rel) return;
    var rp = rel.querySelector('#rp, .rp'); if (rp && !rel.querySelector('.au-sub-pdf')) { var h = D.createElement('div'); h.className = 'au-sub au-sub-pdf'; h.textContent = 'Gerador de PDF'; rp.before(h); }
    var mi = rel.querySelector('#rl-interativo'); if (mi && !mi.classList.contains('au-sub')) { mi.classList.add('au-sub'); }
  }
  function textosPanorama() {
    var s = $('#acv-sit'); if (s) s.querySelectorAll('small, .sub, em').forEach(function (x) { if (/clique para filtrar/i.test(x.textContent)) x.textContent = 'clique para abrir a lista na Triagem'; });
    D.querySelectorAll('#acervo [data-acvset]').forEach(function (b) { if (/^(filtrar|abrir no Central)$/.test(b.textContent.trim())) { b.textContent = 'abrir na Triagem'; b.title = 'Abrir estes processos na busca avançada da Triagem'; } });
  }
  /* Indicadores do acervo: o mesmo módulo do Acervo Central, aqui sobre o acervo inteiro */
  var PV = false;
  function portarIndicadores() {
    if (PV) return; var w = mw(), md = w && w.document; if (!md || !comp()) return;
    var js = md.getElementById('pv-stats-js'), css = md.getElementById('pv-stats-css'); if (!js || !css) return;
    var t = js.textContent, ok = true;
    function tr(a, b) { var u = typeof a === 'string' ? t.replace(a, b) : t.replace(a, b); if (u === t) { ok = false; console.warn('[Panorama] indicadores: trecho não encontrado', String(a).slice(0, 60)); } t = u; }
    tr("const P = () => window.__painelCentralComponent;", "const P = () => { try { return document.getElementById('cmt-motor').contentWindow.__painelCentralComponent; } catch (e) { return null; } };");
    tr("main = document.querySelector('main')", "main = document.getElementById('au-pan-pvs')");
    tr("const isCentral = c.state && c.state.tab === 'central';", "const isCentral = document.body.classList.contains('au-pan');");
    tr(/const header = main\.querySelector\(':scope > header'\);[\s\S]*?root\.hidden = !isCentral;/, "if (root.parentElement !== main) { main.insertBefore(root, main.firstChild); sig = ''; }\n    root.hidden = !isCentral;");
    PV = true; if (!ok) return;
    var st = D.createElement('style'); st.id = 'pv-stats-css'; st.textContent = css.textContent; D.head.appendChild(st);
    try { prefixar(st.sheet); } catch (e) { console.warn('[Panorama] CSS dos indicadores', e); }
    var rs = D.createElement('style'); rs.textContent = 'html body #main #au-pan-pvs :is(h2,h3){display:block;gap:0;border:0;background:none;box-shadow:none;padding:0}html body #main #au-pan-pvs :is(h2,h3)::before{content:none!important;display:none!important}html body #main #au-pan-pvs .pvs-mod>header{padding:0!important;margin:0!important;border:0!important;background:none!important;box-shadow:none!important;position:static!important;min-height:0!important}html body #main #au-pan-pvs .pvs{margin-bottom:26px}'; st.before(rs);
    var sc = D.createElement('script'); sc.id = 'pv-stats-js'; sc.textContent = t; D.body.appendChild(sc);
  }
  function prefixar(sh) {
    var P0 = 'html body #main #au-pan-pvs ';
    function regras(L) { [].slice.call(L).forEach(function (r) {
      if (r.cssRules && !r.selectorText) { regras(r.cssRules); return; }
      if (!r.selectorText || /pvs-tip/.test(r.selectorText)) return;
      r.selectorText = r.selectorText.split(',').map(function (x) { x = x.trim(); return /^(html|body|:root)\b/.test(x) ? x : P0 + x; }).join(', ');
    }); }
    regras(sh.cssRules);
  }
  /* Painel por blocos: lido do procs-muta (acervo/blocos-destinos.html), sem CPF; altura acompanha o conteúdo */
  var bloLido = false;
  function blocos(box) {
    if (bloLido || !box) return;
    var w = mw(); if (!w || !w.ProcsMuta || !w.ProcsMuta.atual) return;
    bloLido = true;
    w.ProcsMuta.ler('acervo/blocos-destinos.html').then(function (html) {
      var f = box.querySelector('iframe'); f.srcdoc = html; f.hidden = false; var m = box.querySelector('.au-blo-msg'); if (m) m.remove();
      f.addEventListener('load', alturaBlocos);
    }).catch(function (e) { bloLido = false; var m = box.querySelector('.au-blo-msg'); if (m) m.textContent = 'Não foi possível ler acervo/blocos-destinos.html no procs-muta: ' + (e.message || e); });
  }
  function alturaBlocos() { var f = $('#au-pan-blobox iframe'); if (!f || f.hidden) return; try { var h = f.contentDocument.documentElement.scrollHeight; if (h && Math.abs(h - f.offsetHeight) > 4) f.style.height = h + 'px'; } catch (e) {} }

  /* =================== Indicadores do acervo (Panorama geral) =================== */
  var IREG = {}, IND_SIG = '';
  function ehApto(o) { return o.etq.some(function (e) { return /\bapto(s)?\b|apto para julgamento/i.test(e) && !/inapt/i.test(e); }) || (o.gtk || []).indexOf('s_aptos') >= 0; }
  var ST_MONO = null;
  function ehMono(o) {
    if (o.etq.some(function (e) { return /monocr/i.test(e); })) return true;
    if (ST_MONO === null) { var s = (STN || []).find(function (x) { return /monocr/i.test(x.nome || x.t || '') && !/recurso/i.test(x.nome || x.t || ''); }); ST_MONO = s ? s.id : ''; }
    return !!ST_MONO && TK.some(function (t) { return t.st === ST_MONO && (o.gtk || []).indexOf(t.id) >= 0; });
  }
  function ehMeta(o) { return o.etq.some(function (e) { return /\bmeta\b/i.test(e); }); }
  function ehRetirado(o) { return o.sit === 'adiam' || (o.gtk || []).indexOf('s_ret') >= 0 || o.etq.some(function (e) { return /retirad|retirar de pauta|\badiad/i.test(e); }); }
  function mesDe(v) { if (typeof v !== 'number') return ''; var d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); }
  function movimento(o) {
    if (o.__mvG === GERACAO) return o.__mv;
    var sa = o.tks.filter(function (x) { return /baixados ao juizo|arquivo permanente|remessa a outro orgao|cancelamento da distribuicao/.test(acsCanon(x.t)); }).map(function (x) { return x.de; }).filter(function (x) { return typeof x === 'number'; });
    var jg = o.tks.filter(function (x) { return /prazo em curso - acordao|intimacao de acordao|analisar manifestacao - acordao/.test(acsCanon(x.t)); }).map(function (x) { return x.de; }).filter(function (x) { return typeof x === 'number'; });
    o.__mv = { e: mesDe(o.dd), s: sa.length ? mesDe(Math.min.apply(null, sa)) : '', j: jg.length ? mesDe(Math.min.apply(null, jg)) : '' }; o.__mvG = GERACAO; return o.__mv;
  }
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function rotMes(k) { return MESES[+k.slice(5) - 1] + '/' + k.slice(0, 4); }
  function ultimosMeses(n) { var t = new Date(), out = []; for (var i = n - 1; i >= 0; i--) { var d = new Date(t.getFullYear(), t.getMonth() - i, 1); out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); } return out; }
  function reg(k, t, L) { IREG[k] = { t: t, L: L }; return k; }
  function linhas(pref, itens, tot, cor) {
    var mx = Math.max.apply(null, itens.map(function (x) { return x[2].length; }).concat([1]));
    return itens.map(function (x, i) { var n = x[2].length, k = reg(pref + i, x[1], x[2]);
      return '<button type="button" class="ai-r" data-ik="' + k + '" style="--c:' + (x[3] || cor || '#3e72ad') + '"><span>' + esc(x[0]) + '</span><i style="--w:' + Math.round(n / mx * 100) + '%"></i><b>' + nf(n) + '</b><em>' + (tot ? Math.round(n / tot * 100) + '%' : '') + '</em></button>'; }).join('') || '<p class="ai-v">Nenhum processo.</p>';
  }
  function cartao(tit, sub, corpo, cls) { return '<article class="ai-c ' + (cls || '') + '"><header><h4>' + esc(tit) + '</h4>' + (sub ? '<small>' + sub + '</small>' : '') + '</header>' + corpo + '</article>'; }
  function grupo(L, fn) { var m = new Map(); L.forEach(function (o) { var k = fn(o) || '—'; if (!m.has(k)) m.set(k, []); m.get(k).push(o); }); return Array.from(m.entries()).sort(function (a, b) { return b[1].length - a[1].length; }); }
  function secaoDe(o) { var s = o.secao || ''; return /^[123]ª Seção$/.test(s) ? s : 'Sem seção identificada'; }
  function indicadores(host) {
    if (!host || !ACV.recs) return;
    var A = ACV.recs.filter(function (o) { return ACS_ENC.indexOf(o.sit) < 0 && !o.caminho; }), CAM = ACV.recs.filter(function (o) { return o.caminho; });
    var sig = GERACAO + '|' + ACV.recs.length + '|' + new Date().getMonth(); if (host.__sig === sig) return; host.__sig = sig; IREG = {};
    var nA = A.length, cur = ultimosMeses(1)[0], m3 = ultimosMeses(3), m12 = ultimosMeses(12);
    var pend = A.filter(function (o) { return o.pend1 === 'sim'; }), apt = A.filter(ehApto), aptM = apt.filter(ehMono), aptC = apt.filter(function (o) { return !ehMono(o); });
    var ent = function (ms) { return ACV.recs.filter(function (o) { return ms.indexOf(movimento(o).e) >= 0; }); }, sai = function (ms) { return ACV.recs.filter(function (o) { return ms.indexOf(movimento(o).s) >= 0; }); }, jul = function (ms) { return ACV.recs.filter(function (o) { return ms.indexOf(movimento(o).j) >= 0; }); };
    var kp = function (k, t, n, sub, L, cls) { reg(k, t, L); return '<button type="button" class="ai-k ' + (cls || '') + '" data-ik="' + k + '"><span>' + esc(t) + '</span><b>' + nf(n) + '</b><small>' + sub + '</small></button>'; };
    var hero = '<div class="ai-hero"><div class="ai-ht"><span class="ai-ey">Monitor · acervo ativo inteiro</span><h3>Indicadores do acervo</h3><small>' + nf(ACV.recs.length) + ' processos no banco · ' + nf(nA) + ' ativos (sem encerrados e sem os que estão a caminho) · clique em qualquer número para ver os processos</small></div><div class="ai-ks">' +
      kp('k-at', 'Acervo ativo', nA, Math.round(nA / ACV.recs.length * 100) + '% do banco', A) +
      kp('k-p1', '1º julgamento pendente', pend.length, (nA ? Math.round(pend.length / nA * 100) : 0) + '% do ativo', pend) +
      kp('k-ap', 'Aptos para julgar', apt.length, nf(aptC.length) + ' colegiado · ' + nf(aptM.length) + ' monocrática', apt) +
      kp('k-dm', 'Distribuídos no mês', ent([cur]).length, rotMes(cur) + ' · mês corrente', ent([cur])) +
      kp('k-cm', 'A caminho do gabinete', CAM.length, 'sem tarefa no PJe do gabinete', CAM) +
      kp('k-sp', 'Seleção prévia', A.filter(function (o) { return o.sel; }).length, 'selecionados para sessão', A.filter(function (o) { return o.sel; })) +
      kp('k-sd', 'Seção divergente', A.filter(function (o) { return o.secAlerta; }).length, 'assunto do CNJ × etiqueta', A.filter(function (o) { return o.secAlerta; })) +
      (function () { var ida = A.map(idade).filter(function (x) { return x != null; }).sort(function (a, b) { return a - b; }), med = ida.length ? ida[Math.floor(ida.length / 2)] : null, val = A.reduce(function (s, o) { return s + (o.vc || 0); }, 0);
        return '<div class="ai-k st"><span>Idade mediana</span><b>' + (med == null ? '—' : med.toFixed(1).replace('.', ',') + ' anos') + '</b><small>valor das causas R$ ' + (val >= 1e9 ? (val / 1e9).toFixed(1).replace('.', ',') + ' bi' : (val / 1e6).toFixed(1).replace('.', ',') + ' mi') + '</small></div>'; })() + '</div></div>';
    /* 1. visão geral */
    var sits = SIT.map(function (x) { return [x.t, 'Situação: ' + x.t, A.filter(function (o) { return o.sit === x.k; }), cor(x.c)]; }).filter(function (x) { return x[2].length; });
    var secs = grupo(A, secaoDe).map(function (g) { return [g[0], 'Seção: ' + g[0], g[1]]; }), COR_S = { '1ª Seção': '#3e72ad', '2ª Seção': '#d9a046', '3ª Seção': '#8a70c0' };
    secs.forEach(function (x) { x[3] = COR_S[x[0]] || '#b3ab9c'; }); secs.sort(function (a, b) { return a[0].localeCompare(b[0], 'pt-BR'); });
    var ids = FXI.map(function (f) { return [f[2], 'Idade do acervo: ' + f[2], A.filter(function (o) { return faixa(FXI, idade(o)) === f[2]; })]; });
    var gab = A.filter(function (o) { return o.gab; }), tts = FXT.map(function (f) { return [f[2], 'Tempo na tarefa atual: ' + f[2], gab.filter(function (o) { return faixa(FXT, noTk(o)) === f[2]; })]; });
    var cls = grupo(A, function (o) { return String(o.classe || '').toUpperCase() || 'SEM CLASSE'; }).slice(0, 6).map(function (g) { return [g[0], 'Classe: ' + g[0], g[1]]; });
    var anos = grupo(A, function (o) { return mesDe(o.dd).slice(0, 4) || 'sem data'; }).sort(function (a, b) { return String(b[0]).localeCompare(String(a[0])); }).slice(0, 6).map(function (g) { return [g[0], 'Distribuídos em ' + g[0], g[1]]; });
    var b1 = '<section class="ai-b" id="ai-b1"><h3><b>1</b>Panorama<button type="button" class="au-mintg" data-aimin="b1"></button><small>retrato do acervo ativo: onde se concentra, situação, seção, classe, idade e tempo na tarefa</small></h3><div class="ai-g ai-g3">' +
      cartao('Situação do acervo', nf(nA) + ' ativos', linhas('s', sits, nA)) + cartao('Seção competente', 'pelo assunto do CNJ; sem ele, pela etiqueta', linhas('c', secs, nA)) + cartao('Classes', 'as 6 maiores', linhas('k1', cls, nA, '#1b3553')) +
      cartao('Idade do acervo', 'desde a distribuição no TRF', linhas('i', ids, nA, '#8a70c0')) + cartao('Distribuição por ano', 'no TRF · os 6 anos mais recentes', linhas('y', anos, nA, '#3e72ad')) + cartao('Tempo na tarefa atual', nf(gab.length) + ' no gabinete', linhas('t', tts, gab.length, '#1fa58a')) +
      /* cartões que também abrem a Triagem: assuntos, tarefas, aptos e listas específicas (acervo ativo inteiro) */
      (function () {
        var up = function (v) { return String(v || '').toUpperCase(); };
        var ass = grupo(A, function (o) { return String(o.assunto || '').trim(); }).filter(function (g) { return g[0] !== '—'; }).slice(0, 8).map(function (g) { return [g[0], 'Assunto: ' + g[0], g[1]]; });
        var tar = grupo(gab, function (o) { return ((o.tks || [])[0] || {}).t || ''; }).filter(function (g) { return g[0] !== '—'; }).slice(0, 8).map(function (g) { return [g[0], 'Tarefa atual: ' + g[0], g[1]]; });
        var apS = grupo(apt, secaoDe).map(function (g) { return [g[0], 'Aptos para julgamento · ' + g[0], g[1], COR_S[g[0]] || '#b3ab9c']; });
        var tem = function (rx, rxE) { return A.filter(function (o) { return rx.test(up(o.classe)) || (rxE && (o.etq || []).some(function (e) { return rxE.test(e); })); }); };
        var esp = [['Embargos de declaração', 'Lista específica · embargos de declaração', tem(/^(ED$|EMBARGOS? DE DECLARA)/, /^\s*(ed|embargos? de declara[cç][aã]o)\s*$/i), '#a33b4a'],
          ['Agravo interno', 'Lista específica · agravo interno', tem(/^AGRAVO INTERNO/, /^\s*(agint|ag\.?\s?int\.?|agravo interno)\s*$/i), '#6a4fb3'],
          ['Mandado de segurança', 'Lista específica · mandado de segurança', tem(/^(MS$|MANDADO DE SEGURAN)/, /^\s*(ms|mandado de seguran[cç]a)\s*$/i), '#2b698e']];
        return cartao('Assuntos mais frequentes', 'os 8 maiores · pelo assunto do PJe', linhas('as', ass, nA, '#2b698e')) +
          cartao('Tarefas atuais', nf(gab.length) + ' no gabinete · as 8 maiores', linhas('ta', tar, gab.length, '#1a7f5a')) +
          cartao('Aptos para julgamento', '<button type="button" class="ai-n" data-ik="' + reg('apt1', 'Aptos para julgamento', apt) + '">' + nf(apt.length) + ' aptos</button>', linhas('aps', apS, apt.length) + '<p class="ai-nota">Etiquetas APTO, APTOS, APTO PARA JULGAMENTO e variações, ou a tarefa “Aptos para julgamento”.</p>') +
          cartao('Listas específicas', 'pela classe ou pela etiqueta', linhas('le', esp, nA));
      })() + '</div></section>';
    /* 2. prontos para julgar */
    var porClasse = function (L, p) { return grupo(L, function (o) { return String(o.classe || '').toUpperCase(); }).slice(0, 8).map(function (g) { return [g[0], p + ' · ' + g[0], g[1]]; }); };
    var porSecao = function (L, p) { return grupo(L, secaoDe).map(function (g) { return [g[0], p + ' · ' + g[0], g[1], COR_S[g[0]] || '#b3ab9c']; }); };
    /* prontos: aptos sem pendência identificada nas etiquetas (parecer do MPF, contrarrazões, preparo, liminar, precedente, "não pautar", impedimento) */
    var pendDe = function (o) { var tg = (o.etq || []).map(function (e) { try { return rlNz(e); } catch (er) { return String(e).toLowerCase(); } }), has = function (rx) { return tg.some(function (x) { return rx.test(x); }); }, L = [];
      if (has(/ag\. parecer|aguardando parecer|intimar mpf/)) L.push('parecer do MPF'); if (has(/ag\. contrarraz|ag\. contraminuta/)) L.push('contrarrazões'); if (has(/preparo/) && !has(/custas ok/)) L.push('preparo');
      if (has(/liminar pendente/)) L.push('liminar'); if (has(/aguardar novos precedentes|tema 1433/)) L.push('precedente'); if (has(/nao pautar/)) L.push('não pautar');
      try { if (acvAl(o).some(function (x) { return x.k !== 'orig'; })) L.push('impedimento'); } catch (er) {} return L; };
    var aptL = apt.filter(function (o) { return !pendDe(o).length; }), aptP = apt.filter(function (o) { return pendDe(o).length; }), livC = aptL.filter(function (o) { return !ehMono(o); }), livM = aptL.filter(ehMono);
    var destino = [['Colegiado: pautar', 'Possível destinação · colegiado (aptos sem pendência)', livC, '#1b3553'], ['Decisão do relator (monocrática)', 'Possível destinação · monocrática (aptos sem pendência)', livM, '#c4953c'], ['Aptos com pendência: conferir antes', 'Aptos com pendência identificada', aptP, '#b0524a']];
    var b2 = '<section class="ai-b" id="ai-b2"><h3><b>2</b>Destinação<button type="button" class="au-mintg" data-aimin="b2"></button><small>para onde vai cada processo: prontos para julgar, destino provável, decisão do relator, massas sem caminho, convocações e o que espera</small></h3>' +
      '<h4 class="au-sub4" data-k="prontos">Prontos para julgar <small>aptos sem pendência identificada nas etiquetas e a destinação provável: colegiado ou decisão do relator</small></h4><div class="ai-g ai-g3">' +
      cartao('Possível destinação', '<button type="button" class="ai-n" data-ik="' + reg('pl', 'Prontos: aptos sem pendência', aptL) + '">' + nf(aptL.length) + ' prontos</button>', linhas('pd', destino, apt.length) + '<p class="ai-nota">Aptos pela etiqueta (Apto, Apto para julgamento) ou pela tarefa “Aptos para julgamento”; monocrática pela etiqueta ou pela estação de decisão monocrática.</p>') +
      cartao('Colegiado', '<button type="button" class="ai-n" data-ik="' + reg('pc', 'Prontos para o colegiado', livC) + '">' + nf(livC.length) + ' prontos</button>', '<h5>Por classe</h5>' + linhas('pcc', porClasse(livC, 'Colegiado'), livC.length, '#1b3553') + '<h5>Por seção</h5>' + linhas('pcs', porSecao(livC, 'Colegiado'), livC.length)) +
      cartao('Decisão do relator', '<button type="button" class="ai-n" data-ik="' + reg('pm', 'Prontos para decisão do relator', livM) + '">' + nf(livM.length) + ' prontos</button>', '<h5>Por classe</h5>' + linhas('pmc', porClasse(livM, 'Monocrática'), livM.length, '#c4953c') + '<h5>Por seção</h5>' + linhas('pms', porSecao(livM, 'Monocrática'), livM.length)) + '</div></section>';
    /* 3. movimento */
    var col = function (tit, ms, sub) { var e = ent(ms), s = sai(ms), j = jul(ms), p = tit;
      return cartao(tit, sub, linhas('mv' + tit.length + ms[0], [['Entradas (distribuição no TRF)', p + ' · entradas', e, '#3e72ad'], ['Saídas (baixa, arquivo, remessa)', p + ' · saídas', s, '#1fa58a'], ['Julgados (acórdão publicado)', p + ' · julgados', j, '#d9a046']], 0)); };
    var serie = m12.map(function (k) { return [k, ent([k]).length, sai([k]).length, jul([k]).length]; }), mx = Math.max.apply(null, serie.map(function (x) { return Math.max(x[1], x[2], x[3]); }).concat([1]));
    var graf = '<div class="ai-ch" role="img" aria-label="Entradas, saídas e julgados nos últimos 12 meses">' + serie.map(function (x) { return '<div class="ai-cm' + (x[0] === cur ? ' cur' : '') + '" title="' + rotMes(x[0]) + ' · entradas ' + x[1] + ' · saídas ' + x[2] + ' · julgados ' + x[3] + '"><div class="ai-cb"><i class="e" style="height:' + (x[1] / mx * 100) + '%"></i><i class="s" style="height:' + (x[2] / mx * 100) + '%"></i><i class="j" style="height:' + (x[3] / mx * 100) + '%"></i></div><span>' + MESES[+x[0].slice(5) - 1] + '</span></div>'; }).join('') + '</div><div class="ai-lg"><span class="e">Entradas</span><span class="s">Saídas</span><span class="j">Julgados</span></div>';
    var b3 = '<section class="ai-b" id="ai-b3"><h3><b>3</b>Movimento<button type="button" class="au-mintg" data-aimin="b3"></button><small>todo o banco; saídas e julgados pela data da tarefa no PJe (não se excluem: um processo pode ter os dois)</small></h3><div class="ai-g ai-g3">' +
      col('Mês corrente', [cur], rotMes(cur) + ' · parcial') + col('Últimos 3 meses', m3, rotMes(m3[0]) + ' a ' + rotMes(cur)) + col('Últimos 12 meses', m12, rotMes(m12[0]) + ' a ' + rotMes(cur)) +
      '</div></section>';   /* o mês a mês fica no painel Entradas e saídas, logo abaixo */
    /* 4. onde estão */
    var est = STN.map(function (s) { var tks = TK.filter(function (t) { return t.st === s.id; }).map(function (t) { return t.id; }); return [s.nome || s.t || s.id, 'Estação: ' + (s.nome || s.t || s.id), gab.filter(function (o) { return o.gtk.some(function (k) { return tks.indexOf(k) >= 0; }); })]; }).filter(function (x) { return x[2].length; });
    var tarefas = TK.map(function (t) { return [t.nome || t.t || t.id, 'Tarefa: ' + (t.nome || t.t || t.id), gab.filter(function (o) { return o.gtk.indexOf(t.id) >= 0; })]; }).filter(function (x) { return x[2].length; }).sort(function (a, b) { return b[2].length - a[2].length; }).slice(0, 12);
    var fora = A.filter(function (o) { return !o.gab; }), foraS = SIT.map(function (x) { return [x.t, 'Fora do gabinete: ' + x.t, fora.filter(function (o) { return o.sit === x.k; }), cor(x.c)]; }).filter(function (x) { return x[2].length; });
    var camC = grupo(CAM, function (o) { return String(o.classe || '').toUpperCase(); }).slice(0, 6).map(function (g) { return [g[0], 'A caminho · ' + g[0], g[1]]; });
    var b4 = '<section class="ai-b" id="ai-b4"><h3><b>4</b>Localização<button type="button" class="au-mintg" data-aimin="b4"></button><small>fora do gabinete, a caminho, caixas do PJe e o que está no gabinete por etapa, tipo, origem, pendência e matéria</small></h3><div class="ai-g ai-g2">' +
      cartao('Fora do gabinete', nf(fora.length) + ' processos', linhas('f', foraS, fora.length)) + cartao('A caminho do gabinete', '<button type="button" class="ai-n" data-ik="' + reg('ac', 'A caminho do gabinete', CAM) + '">' + nf(CAM.length) + ' processos</button>', linhas('a', camC, CAM.length, '#6b7b8d')) + '</div></section>';
    host.querySelectorAll('[data-au-mov]').forEach(function (el) { el.hidden = true; host.after(el); });
    host.innerHTML = hero + b1 + b2 + b3 + b4; aplicarMins(); gabNoOndeEstao();
  }
  D.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#au-pan-ind [data-ik]'); if (!b) return; e.preventDefault(); e.stopPropagation();
    var r = IREG[b.dataset.ik]; if (!r) return;
    var grade = b.closest('.ai-g') || b.closest('.ai-hero') || b.closest('.ai-b'), alvo = grade.nextElementSibling;
    if (!alvo || !alvo.classList.contains('au-lst-slot')) { alvo = D.createElement('div'); alvo.className = 'au-lst-slot'; grade.after(alvo); }
    D.querySelectorAll('.au-lst-slot').forEach(function (s) { if (s !== alvo) s.querySelectorAll(':scope > .au-lst').forEach(function (x) { x.hidden = true; x.__tit = ''; }); });
    D.querySelectorAll('#au-pan-ind .ai-sel').forEach(function (x) { x.classList.remove('ai-sel'); });
    var bx = abrirLista(alvo, r.t, r.L); if (!bx.hidden) b.classList.add('ai-sel');
  }, true);
  var cssAI = D.createElement('style');
  cssAI.textContent =
    '#au-pan-ind{font-family:Figtree,system-ui,sans-serif;color:#14263c}' +
    '.ai-hero{position:relative;border-radius:24px;padding:22px 24px 20px;color:#fff;background:radial-gradient(520px 260px at 92% -30%,rgba(217,160,70,.38),transparent 70%),radial-gradient(480px 300px at 8% 140%,rgba(62,114,173,.55),transparent 70%),linear-gradient(135deg,#1b3553,#122840);margin-bottom:22px}' +
    '.ai-ey{display:block;font:800 10.5px Figtree,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#e6c27a}#au-pan-ind .ai-hero h3{display:block!important;margin:4px 0 2px!important;font:800 28px Figtree,system-ui,sans-serif!important;letter-spacing:-.02em;color:#fff!important;border:0!important;padding:0!important;background:none!important}html body #main .ai-hero h3::before{content:none;display:none}.ai-ht small{color:#c9d3dc;font-size:12.5px}' +
    '.ai-ks{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:16px}.ai-k{display:flex;flex-direction:column;gap:2px;text-align:left;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;border-radius:16px;padding:12px 14px;cursor:pointer;font:inherit}' +
    '.ai-k:hover,.ai-k.ai-sel{background:rgba(255,255,255,.13);border-color:rgba(230,194,122,.7)}.ai-k span{font:800 10.5px Figtree,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#e6c27a}.ai-k b{font:800 30px Figtree,system-ui,sans-serif;line-height:1.1}.ai-k small{color:#c9d3dc;font-size:12px}' +
    '.ai-hero .au-lst{margin-top:14px;color:#14263c}' +
    '.ai-b{margin:0 0 26px}html body #main .ai-b>h3{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;margin:0 0 12px;padding:0;border:0;background:none;font:800 20px Figtree,system-ui,sans-serif;color:#14263c}html body #main .ai-b>h3::before{content:none;display:none}' +
    '.ai-b>h3>b{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:8px;background:#1b3553;color:#e6c27a;font-size:13px}.ai-b>h3 small{flex-basis:100%;font:500 12.5px Figtree,system-ui,sans-serif;color:#6d7b8a;margin-left:36px}' +
    '.ai-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;align-items:start}.ai-g2{grid-template-columns:repeat(auto-fit,minmax(380px,1fr))}.ai-g3{grid-template-columns:repeat(3,minmax(0,1fr))}.ai-g3 .ai-w{grid-column:1/-1}' +
    '.ai-c{background:#fff;border:1px solid #ebe6dc;border-radius:18px;padding:14px 16px;box-shadow:0 1px 2px rgba(20,38,60,.04);min-width:0}.ai-c header{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:8px}html body #main .ai-c h4{margin:0;font:800 14.5px Figtree,system-ui,sans-serif;color:#14263c}.ai-c header small{color:#6d7b8a;font-size:12px;text-align:right}' +
    '.ai-c h5{margin:12px 0 4px;font:800 10.5px Figtree,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#8a6116}' +
    '.ai-r{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(40px,1fr) auto 38px;gap:8px;align-items:center;width:100%;border:0;background:transparent;padding:6px 8px;margin:0 -8px;border-radius:9px;cursor:pointer;font:inherit;color:inherit;text-align:left;box-sizing:content-box}' +
    '.ai-r:hover{background:#f6f3ec}.ai-r.ai-sel{background:#fbf3e3;outline:2px solid #c4953c}.ai-r span{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ai-r i{height:8px;border-radius:5px;background:linear-gradient(90deg,var(--c) var(--w),#eef0f3 var(--w))}.ai-r b{font-size:13.5px;color:#14263c;text-align:right}.ai-r em{font-style:normal;font-size:11.5px;color:#6d7b8a;text-align:right}' +
    '.ai-n{border:1px solid #d8d2c6;background:#fbfaf7;color:#1b3553;border-radius:999px;padding:4px 10px;font:800 12.5px Figtree,system-ui,sans-serif;cursor:pointer}.ai-n:hover,.ai-n.ai-sel{background:#1b3553;color:#fff}.ai-v{color:#6d7b8a;font-size:12.5px;margin:4px 0}' +
    '.ai-ch{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:8px;align-items:end;height:170px;padding-top:6px}.ai-cm{display:flex;flex-direction:column;align-items:center;gap:4px;height:100%}.ai-cb{flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center;gap:2px}.ai-cb i{width:28%;border-radius:3px 3px 0 0;min-height:1px}' +
    '.ai-cb .e,.ai-lg .e:before{background:#3e72ad}.ai-cb .s,.ai-lg .s:before{background:#1fa58a}.ai-cb .j,.ai-lg .j:before{background:#d9a046}.ai-cm span{font-size:11px;color:#6d7b8a}.ai-cm.cur span{color:#8a6116;font-weight:800}' +
    '.ai-lg{display:flex;gap:14px;margin-top:8px;font-size:12px;color:#34495f}.ai-lg span:before{content:"";display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}' +
    '@media (max-width:900px){.ai-g3{grid-template-columns:minmax(0,1fr)}.ai-g2{grid-template-columns:minmax(0,1fr)}}';
  D.head.appendChild(cssAI);

  /* =================== Painel por blocos: acervo atual, por semelhança e destino provável =================== */
  var DEST = [
    ['pos', 'Pós-julgamento: certificar trânsito e baixar', '#7a5ba6', function (o) { return o.sit === 'julg'; }],
    ['fora', 'Fora do gabinete: aguardar retorno', '#6b7b8d', function (o) { return !o.gab; }],
    ['sob', 'Manter sobrestado: aguardar o tema', '#8a70c0', function (o) { return o.sit === 'sobr' || o.sit === 'susp' || o.gtk.some(function (k) { return /^(sob_|su_)/.test(k); }); }],
    ['ret', 'Retirado ou adiado: repautar', '#b0524a', function (o) { return ehRetirado(o); }],
    ['ass', 'Ato já minutado: revisar e assinar', '#1fa58a', function (o) { return o.gtk.some(function (k) { return k === 'revisar' || k === 'assinar'; }); }],
    ['min', 'Monocrática em curso: minutar', '#c4953c', function (o) { return o.gtk.some(function (k) { return k === 'minutar' || k === 'ed_min' || k === 'agint_min'; }); }],
    ['sel', 'Colegiado: já selecionado para sessão', '#1b3553', function (o) { return o.sel; }],
    ['apc', 'Colegiado: apto, pautar', '#3e72ad', function (o) { return ehApto(o) && !ehMono(o); }],
    ['apm', 'Monocrática provável (apto)', '#d9a046', function (o) { return ehApto(o) && ehMono(o); }],
    ['ed', 'Embargos de declaração em sessão', '#2f6690', function (o) { return o.gtk.some(function (k) { return /^sed_/.test(k); }); }],
    ['ai', 'Agravo de instrumento antigo: verificar perda de objeto', '#a6545e', function (o) { var d = acvDays(o.dd); return /agravo de instrumento/i.test(o.classe || '') && d != null && d > 365; }],
    ['prep', 'Colegiado: preparar relatório e voto', '#4a8f74', function (o) { return o.gtk.some(function (k) { return /^s_/.test(k); }); }],
    ['tri', 'Indefinido: definir na triagem', '#b4763a', function (o) { return o.gtk.some(function (k) { return k === 'rec_unid' || k === 'triagem' || k === 'analisar'; }); }],
    ['out', 'Outros: conferir', '#9aa3ad', function () { return true; }]
  ];
  var BLQ = { dest: '', sec: '', q: '', lim: 12, sig: '' };
  function destinoDe(o) { for (var i = 0; i < DEST.length; i++) if (DEST[i][3](o)) return DEST[i]; return DEST[DEST.length - 1]; }
  function montarBlocos() {
    var A = ACV.recs.filter(function (o) { return ACS_ENC.indexOf(o.sit) < 0 && !o.caminho; }), M = new Map();
    A.forEach(function (o) { var d = destinoDe(o), ass = String(o.assCNJ || o.assunto || 'Assunto não informado').trim(), cl = String(o.classe || '').toUpperCase(), k = d[0] + '|' + ass.toUpperCase() + '|' + cl + '|' + secaoDe(o);
      if (!M.has(k)) M.set(k, { d: d, ass: ass, cl: cl, sec: secaoDe(o), L: [] }); M.get(k).L.push(o); });
    var todos = Array.from(M.values()), blocos = todos.filter(function (b) { return b.L.length >= 3; }).sort(function (a, b) { return b.L.length - a.L.length; });
    return { A: A, blocos: blocos, emBloco: blocos.reduce(function (s, b) { return s + b.L.length; }, 0) };
  }
  /* =================== Blocos e semelhanças: um painel, várias formas de agrupar =================== */
  var SEMQ = { por: 'assunto', comb: true, sec: '', dest: '', min: 3, q: '', lim: 12, uni: 'ativo' }, SEMC = { k: '', G: null };
  var DIM = [['assunto', 'Assunto e classe', false], ['materia', 'Matéria', false], ['origem', 'Origem', true], ['advogado', 'Advogado', true], ['parte', 'Parte (PJ)', true], ['tarefa', 'Caixa do PJe', true], ['destino', 'Destino provável', true], ['etiqueta', 'Etiqueta', false]];
  function smNz(s) { try { return rlNz(s); } catch (e) { return String(s || '').toLowerCase(); } }
  function materiaDe(o) { var tg = (o.etq || []).map(smNz); try { for (var i = 0; i < tg.length; i++) if (RL_THEME[tg[i]]) return RL_THEME[tg[i]]; return RL_ASS[smNz(o.assunto)] || String(o.assunto || 'Matéria não informada'); } catch (e) { return String(o.assunto || 'Matéria não informada'); } }
  function origemDe(o) { var m = String(o.p).match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.(\d{4})/), c = m ? m[1] : ''; try { return RL_ORIG[c] || (c ? 'Outra unidade (' + c + ')' : 'Origem não identificada'); } catch (e) { return c || '—'; } }
  function advsDe(o) { return String(o.adv || '').split(/\s*·\s*|,\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ ]+ OAB)/).map(function (s) { return s.trim(); }).filter(function (s) { return /OAB/.test(s); }).map(function (s) { return s.replace(/ OAB:\s*/, ' · OAB '); }); }
  function partesDe(o) { return [o.passivo, o.ativo].reduce(function (a, s) { return a.concat(String(s || '').split(/\s*[;|]\s*|\s+e outros?\b/)); }, []).map(function (s) { return s.trim(); }).filter(function (s) { try { return s && RL_PJ.test(smNz(s)); } catch (e) { return false; } }); }
  function chavesDe(o, por) {
    if (por === 'assunto') return [String(o.assCNJ || o.assunto || 'Assunto não informado').trim() + '\u0001' + String(o.classe || '').toUpperCase() + ' · ' + secaoDe(o)];
    if (por === 'materia') return [materiaDe(o)];
    if (por === 'origem') return [origemDe(o)];
    if (por === 'advogado') return advsDe(o);
    if (por === 'parte') return partesDe(o);
    if (por === 'tarefa') return o.gab && o.tks && o.tks[0] ? [o.tks[0].t] : [];
    if (por === 'destino') return [destinoDe(o)[1]];
    if (por === 'etiqueta') return (o.etq || []).filter(function (e) { return e && !/^apto|^\s*\d\s*[ªºa]?\s*se[çc][ãa]o|^se[çc][ãa]o\b|^prioridade|^segredo/i.test(e); });
    return [];
  }
  function gruposSem() {
    var k = GERACAO + '|' + SEMQ.por + '|' + SEMQ.comb + '|' + SEMQ.uni; if (SEMC.k === k) return SEMC.G;
    var A = ACV.recs.filter(function (o) { return ACS_ENC.indexOf(o.sit) < 0 && !o.caminho && (SEMQ.uni !== 'gab' || o.gab); }), M = new Map(), comb = SEMQ.comb && (DIM.find(function (d) { return d[0] === SEMQ.por; }) || [])[2];
    A.forEach(function (o) { var mt = comb ? materiaDe(o) : ''; chavesDe(o, SEMQ.por).forEach(function (c) { var key = c + (comb ? '\u0002' + mt : ''); var g = M.get(key); if (!g) { g = { c: c, mt: mt, L: [] }; M.set(key, g); } if (g.L[g.L.length - 1] !== o) g.L.push(o); }); });
    var G = Array.from(M.values()).sort(function (a, b) { return b.L.length - a.L.length; });
    G.forEach(function (g) { var p = g.c.split('\u0001'); g.tit = p[0]; g.sub = p[1] || ''; });
    SEMC = { k: k, G: G, A: A }; return G;
  }
  function pintarSem(box) {
    if (!box || !ACV.recs) return;
    var G = gruposSem(), q = SEMQ.q.trim().toLowerCase(), A = SEMC.A;
    G.forEach(function (g) { g.Lv = SEMQ.dest ? g.L.filter(function (o) { return destinoDe(o)[0] === SEMQ.dest; }) : g.L; });
    var V = G.filter(function (g) { if (g.Lv.length < SEMQ.min) return false; if (q && (g.tit + ' ' + g.sub + ' ' + g.mt).toLowerCase().indexOf(q) < 0) return false;
      if (SEMQ.sec && !g.Lv.some(function (o) { return secaoDe(o) === SEMQ.sec; })) return false; return true; }).sort(function (a, b) { return b.Lv.length - a.Lv.length; });
    var sig = SEMC.k + '|' + SEMQ.min + '|' + q + '|' + SEMQ.sec + '|' + SEMQ.dest + '|' + SEMQ.lim + '|' + V.length; if (box.__sig === sig) return; box.__sig = sig;
    var emG = new Set(); V.forEach(function (g) { g.Lv.forEach(function (o) { emG.add(o); }); });
    var dimAtual = DIM.find(function (d) { return d[0] === SEMQ.por; }) || DIM[0], destNome = SEMQ.dest ? (DEST.find(function (d) { return d[0] === SEMQ.dest; }) || [])[1] : '';
    var foco = D.activeElement && box.contains(D.activeElement) && D.activeElement.matches('input[type=search]');
    box.__V = V;
    box.innerHTML = '<div class="sm-bar"><div class="sm-por" role="group" aria-label="Agrupar por">' + DIM.map(function (d) { return '<button type="button" data-smpor="' + d[0] + '" aria-pressed="' + (d[0] === SEMQ.por) + '">' + d[1] + '</button>'; }).join('') + '</div>' +
      (dimAtual[2] ? '<label class="sm-x"><input type="checkbox" data-smcomb' + (SEMQ.comb ? ' checked' : '') + '> × matéria</label>' : '') + '</div>' +
      '<div class="sm-f"><input type="search" data-smq placeholder="Buscar nos grupos…" value="' + esc(SEMQ.q) + '" aria-label="Buscar nos grupos">' +
      '<select data-smsec aria-label="Seção"><option value="">Todas as seções</option>' + ['1ª Seção', '2ª Seção', '3ª Seção', 'Sem seção identificada'].map(function (s) { return '<option' + (s === SEMQ.sec ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
      '<select data-smmin aria-label="Tamanho mínimo">' + [2, 3, 5, 10, 20].map(function (n) { return '<option value="' + n + '"' + (n === SEMQ.min ? ' selected' : '') + '>' + n + ' ou mais</option>'; }).join('') + '</select>' +
      '<select data-smuni aria-label="Universo"><option value="ativo"' + (SEMQ.uni === 'ativo' ? ' selected' : '') + '>acervo ativo</option><option value="gab"' + (SEMQ.uni === 'gab' ? ' selected' : '') + '>só no gabinete</option></select>' +
      (destNome ? '<button type="button" class="sm-chip" data-smdest="">' + esc(destNome) + ' ×</button>' : '') + '</div>' +
      '<div class="sm-k"><span><b>' + nf(V.length) + '</b> grupos</span><span><b>' + nf(emG.size) + '</b> processos em grupo · ' + (A.length ? Math.round(emG.size / A.length * 100) : 0) + '% de ' + nf(A.length) + '</span>' + (V[0] ? '<span>maior: <b>' + nf(V[0].Lv.length) + '</b></span>' : '') + '</div>' +
      '<div class="sm-l">' + (V.slice(0, SEMQ.lim).map(function (g, i) {
        var dd = grupo(g.Lv, function (o) { return destinoDe(o)[0]; })[0], dP = dd ? DEST.find(function (d) { return d[0] === dd[0]; }) : null, ida = g.Lv.map(idade).filter(function (x) { return x != null; }).sort(function (a, b) { return a - b; }), med = ida.length ? ida[Math.floor(ida.length / 2)] : null;
        var secs = grupo(g.Lv, secaoDe).slice(0, 3).map(function (s) { return s[0].replace(' Seção', 'ª').replace('ªª', 'ª') + ' ' + s[1].length; }).join(' · ');
        var cls = grupo(g.Lv, function (o) { return String(o.classe || '').toUpperCase(); })[0];
        return '<button type="button" class="sm-c" data-smg="' + i + '" style="--c:' + (dP ? dP[2] : '#1b3553') + '"><b>' + nf(g.Lv.length) + '</b><div><strong>' + esc(g.tit) + '</strong><small>' + esc([g.sub, g.mt, cls && SEMQ.por !== 'assunto' ? cls[0] : ''].filter(Boolean).join(' · ')) + '</small><small class="t">' + esc(secs) + (med != null ? ' · idade mediana ' + med.toFixed(1).replace('.', ',') + ' a' : '') + '</small></div><em>' + (dP ? esc(dP[1]) + (dd[1].length < g.Lv.length ? ' · ' + Math.round(dd[1].length / g.Lv.length * 100) + '%' : '') : '') + '</em></button>';
      }).join('') || '<p class="sm-v">Nenhum grupo com esses filtros.</p>') + '</div>' +
      (V.length > SEMQ.lim ? '<button type="button" class="sm-mais" data-smmais>mostrar mais (' + nf(Math.min(SEMQ.lim, V.length)) + ' de ' + nf(V.length) + ')</button>' : '');
    if (foco) { var i2 = box.querySelector('[data-smq]'); if (i2) { i2.focus(); i2.setSelectionRange(i2.value.length, i2.value.length); } }
  }
  function ligarSem(box) {
    if (box.__lig) return; box.__lig = true;
    var re = function (reset) { if (reset) SEMQ.lim = 12; box.__sig = ''; pintarSem(box); };
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-smpor],[data-smdest],[data-smmais],[data-smg]'); if (!b) return; e.preventDefault();
      if (b.dataset.smpor) { SEMQ.por = b.dataset.smpor; re(true); return; }
      if (b.hasAttribute('data-smdest')) { SEMQ.dest = ''; BLQ.dest = ''; re(true); return; }
      if (b.hasAttribute('data-smmais')) { SEMQ.lim += 24; re(); return; }
      var g = box.__V[+b.dataset.smg]; if (!g) return;
      var lst = b.nextElementSibling && b.nextElementSibling.classList.contains('au-lst') ? b.nextElementSibling : null;
      if (!lst) { lst = D.createElement('div'); lst.className = 'au-lst'; lst.hidden = true; b.after(lst); }
      box.querySelectorAll('.au-lst').forEach(function (x) { if (x !== lst && !x.hidden) { x.hidden = true; x.__tit = ''; } });
      var L = g.Lv || g.L;
      abrirLista(lst, (DIM.find(function (d) { return d[0] === SEMQ.por; }) || [])[1] + ': ' + g.tit + (g.mt ? ' · ' + g.mt : ''), L, { box: lst });
    });
    var qT; box.addEventListener('input', function (e) { if (!e.target.matches('[data-smq]')) return; clearTimeout(qT); var v = e.target.value; qT = setTimeout(function () { SEMQ.q = v; re(true); }, 250); });
    box.addEventListener('change', function (e) { var x = e.target;
      if (x.matches('[data-smcomb]')) SEMQ.comb = x.checked; else if (x.matches('[data-smsec]')) SEMQ.sec = x.value; else if (x.matches('[data-smmin]')) SEMQ.min = +x.value; else if (x.matches('[data-smuni]')) SEMQ.uni = x.value; else return;
      re(true); });
  }
  var cssSem = D.createElement('style');
  cssSem.textContent = '#au-sem{font-family:Figtree,system-ui,sans-serif;color:#14263c}' +
    '#au-sem .sm-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:0 0 10px}#au-sem .sm-por{display:flex;flex-wrap:wrap;gap:4px;padding:3px;border:1px solid #e6e1d6;border-radius:12px;background:#fbfaf7}' +
    '#au-sem .sm-por button{border:0;background:transparent;color:#34495f;border-radius:9px;padding:5px 10px;font:700 12px Figtree,system-ui,sans-serif;cursor:pointer}#au-sem .sm-por button:hover{background:#f1ece2}#au-sem .sm-por button[aria-pressed=true]{background:#1b3553;color:#fff}' +
    '#au-sem .sm-x{display:inline-flex;align-items:center;gap:6px;font:700 12px Figtree,system-ui,sans-serif;color:#34495f;cursor:pointer}' +
    '#au-sem .sm-f{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px}#au-sem .sm-f input,#au-sem .sm-f select{font:600 12.5px Figtree,system-ui,sans-serif;border:1px solid #ddd6c8;border-radius:9px;padding:6px 9px;background:#fff;color:#14263c}#au-sem .sm-f input{flex:1;min-width:200px;padding-left:10px!important;background-image:none!important}' +
    '#au-sem .sm-chip{border:1px solid #1b3553;background:#1b3553;color:#fff;border-radius:999px;padding:4px 10px;font:700 11.5px Figtree,system-ui,sans-serif;cursor:pointer}' +
    '#au-sem .sm-k{display:flex;flex-wrap:wrap;gap:6px 16px;margin:0 0 10px;font-size:12.5px;color:#5d6475}#au-sem .sm-k b{color:#14263c;font-size:14px}' +
    '#au-sem .sm-l{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,500px),1fr));gap:6px;align-items:start}#au-sem .sm-l>.au-lst{grid-column:1/-1}#au-sem .sm-c{display:grid;grid-template-columns:52px minmax(0,1fr) minmax(110px,.45fr);gap:10px;align-items:center;width:100%;text-align:left;background:#fff;border:1px solid #ebe6dc;border-left:5px solid var(--c);border-radius:12px;padding:7px 12px;cursor:pointer;font:inherit;color:inherit}' +
    '#au-sem .sm-c:hover{border-color:#c4953c;border-left-color:var(--c)}#au-sem .sm-c>b{font:800 19px Figtree,system-ui,sans-serif;text-align:center;color:var(--c)}#au-sem .sm-c strong{display:block;font-size:13px;line-height:1.3}#au-sem .sm-c small{display:block;color:#6d7b8a;font-size:11.5px;line-height:1.35}#au-sem .sm-c small.t{color:#34495f}' +
    '#au-sem .sm-c em{font-style:normal;font-size:11px;font-weight:700;color:var(--c);text-align:right;line-height:1.3}#au-sem .sm-mais{display:block;margin:10px auto 0;border:1px solid #d8d2c6;background:#fff;color:#1b3553;border-radius:999px;padding:6px 14px;font:700 12px Figtree,system-ui,sans-serif;cursor:pointer}' +
    '#au-sem .sm-v{color:#6d7b8a;padding:10px}#au-sem button:focus-visible,#au-sem input:focus-visible,#au-sem select:focus-visible{outline:2px solid #c4953c;outline-offset:2px}' +
    '@media (max-width:760px){#au-sem .sm-c{grid-template-columns:44px minmax(0,1fr)}#au-sem .sm-c em{grid-column:2;text-align:left}}' +
    /* o painel novo substitui a lista antiga de blocos e as tabelas de mesma origem, advogado e parte */
    'html body #main #au-pan-ind .au-gabslot[data-k="blo"] #au-pan-blobox,html body #main #au-pan-ind .au-gabslot[data-k="blo"] #rl-sim{display:none!important}';
  D.head.appendChild(cssSem);

  var BLX = null;
  function pintarBlocos(box) {
    if (!box || !ACV.recs) return;
    if (!BLX || BLX.g !== GERACAO) { BLX = montarBlocos(); BLX.g = GERACAO; IREG = IREG || {}; }
    var sig = GERACAO + '|' + BLQ.dest + '|' + BLQ.sec + '|' + BLQ.q + '|' + BLQ.lim; if (box.__sig === sig) return; box.__sig = sig;
    var X = BLX, q = BLQ.q.trim().toLowerCase();
    var porDest = DEST.map(function (d) { return [d, X.A.filter(function (o) { return destinoDe(o) === d; })]; }).filter(function (x) { return x[1].length; });
    var V = X.blocos.filter(function (b) { return (!BLQ.dest || b.d[0] === BLQ.dest) && (!BLQ.sec || b.sec === BLQ.sec) && (!q || (b.ass + ' ' + b.cl).toLowerCase().indexOf(q) >= 0); });
    var mx = Math.max.apply(null, porDest.map(function (x) { return x[1].length; }).concat([1]));
    box.innerHTML = '<div class="bl-k"><div><b>' + nf(X.A.length) + '</b><small>processos ativos</small></div><div><b>' + nf(X.blocos.length) + '</b><small>blocos (3 ou mais semelhantes)</small></div><div><b>' + nf(X.emBloco) + '</b><small>em bloco · ' + (X.A.length ? Math.round(X.emBloco / X.A.length * 100) : 0) + '%</small></div><div><b>' + nf(X.A.length - X.emBloco) + '</b><small>individuais</small></div></div>' +
      '<div class="bl-g"><article class="ai-c bl-d"><header><h4>Processos por destino provável</h4><small>clique para ver os processos</small></header>' + porDest.map(function (x) { var d = x[0];
        return '<div class="bl-dr"><button type="button" class="ai-r" data-bld="' + d[0] + '" style="--c:' + d[2] + '"><span>' + esc(d[1]) + '</span><i style="--w:' + Math.round(x[1].length / mx * 100) + '%"></i><b>' + nf(x[1].length) + '</b><em>' + Math.round(x[1].length / X.A.length * 100) + '%</em></button><button type="button" class="bl-f' + (BLQ.dest === d[0] ? ' on' : '') + '" data-blf="' + d[0] + '" title="Mostrar só os blocos deste destino">blocos</button></div>'; }).join('') + '</article>' +
      '<div class="bl-l"><div class="bl-bar"><input type="search" placeholder="Buscar assunto ou classe nos blocos…" value="' + esc(BLQ.q) + '" aria-label="Buscar nos blocos"><select data-bls aria-label="Seção"><option value="">Todas as seções</option>' + ['1ª Seção', '2ª Seção', '3ª Seção', 'Sem seção identificada'].map(function (s) { return '<option' + (BLQ.sec === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
        (BLQ.dest ? '<button type="button" class="bl-f on" data-blf="">' + esc((DEST.find(function (d) { return d[0] === BLQ.dest; }) || [])[1]) + ' ×</button>' : '') + '<span>' + nf(V.length) + ' bloco(s)</span></div>' +
        V.slice(0, BLQ.lim).map(function (b, i) { var tk = grupo(b.L.filter(function (o) { return o.gab; }), function (o) { return (o.tks[0] || {}).t; }).slice(0, 2), ida = b.L.map(idade).filter(function (x) { return x != null; }), med = ida.length ? ida.sort(function (a, c) { return a - c; })[Math.floor(ida.length / 2)] : null;
          return '<button type="button" class="bl-c" data-blb="' + i + '" style="--c:' + b.d[2] + '"><b>' + nf(b.L.length) + '</b><div><strong>' + esc(b.ass) + '</strong><small>' + esc(b.cl) + ' · ' + esc(b.sec) + (med != null ? ' · idade mediana ' + med.toFixed(1).replace('.', ',') + ' anos' : '') + '</small>' + (tk.length ? '<small class="t">' + tk.map(function (t) { return esc(t[0]) + ' (' + t[1].length + ')'; }).join(' · ') + '</small>' : '') + '</div><em>' + esc(b.d[1]) + '</em></button>'; }).join('') +
        (V.length > BLQ.lim ? '<button type="button" class="bl-mais" data-blm>mostrar mais blocos (' + nf(BLQ.lim) + ' de ' + nf(V.length) + ')</button>' : '') + (V.length ? '' : '<p class="ai-v">Nenhum bloco com esses critérios.</p>') + '</div></div>' +
      '<p class="bl-nota">Destinos são sugestões de triagem por regras sobre a situação, a tarefa do PJe e as etiquetas (sem leitura dos autos); a decisão é do relator. Blocos reúnem processos com o mesmo destino, assunto, classe e seção.</p>';
    box.__V = V;
    var inp = box.querySelector('.bl-bar input'), qT; inp.addEventListener('input', function () { clearTimeout(qT); qT = setTimeout(function () { BLQ.q = inp.value; BLQ.lim = 12; pintarBlocos(box); var i2 = box.querySelector('.bl-bar input'); i2.focus(); i2.setSelectionRange(i2.value.length, i2.value.length); }, 250); });
    box.querySelector('[data-bls]').addEventListener('change', function (e) { BLQ.sec = e.target.value; BLQ.lim = 12; pintarBlocos(box); });
  }
  D.addEventListener('click', function (e) {
    var box = $('#au-pan-blobox'); if (!box || !e.target.closest || !(box.contains(e.target) || e.target.closest('.au-gabslot[data-k="dest"]'))) return;
    var t = e.target.closest('[data-bld],[data-blf],[data-blb],[data-blm]'); if (!t) return; e.preventDefault(); e.stopPropagation();
    if (t.hasAttribute('data-blf')) { BLQ.dest = t.dataset.blf === BLQ.dest ? '' : t.dataset.blf; BLQ.lim = 12; pintarBlocos(box); SEMQ.dest = BLQ.dest; SEMQ.lim = 12; var sm0 = $('#au-sem'); if (sm0) { sm0.__sig = ''; pintarSem(sm0); window.scrollTo({ top: sm0.getBoundingClientRect().top + scrollY - 130, behavior: 'smooth' }); } return; }
    if (t.hasAttribute('data-blm')) { BLQ.lim += 40; pintarBlocos(box); return; }
    if (t.dataset.bld) { var d = DEST.find(function (x) { return x[0] === t.dataset.bld; }); abrirLista(t.closest('.bl-d'), 'Destino provável: ' + d[1], BLX.A.filter(function (o) { return destinoDe(o) === d; }), { forcar: true }); return; }
    var b = box.__V[+t.dataset.blb]; if (!b) return;
    var lst = t.__lst; if (!lst || !lst.isConnected) { lst = D.createElement('div'); lst.className = 'au-lst'; t.after(lst); t.__lst = lst; }
    abrirLista(lst, 'Bloco: ' + b.ass + ' · ' + b.cl + ' · ' + b.sec, b.L, { box: lst });
  }, true);
  var cssB = D.createElement('style');
  cssB.textContent =
    'html body #main .ai-c>header{padding:0!important;margin:0 0 8px!important;background:none!important;border:0!important;position:static!important;min-height:0!important;height:auto!important;box-shadow:none!important}' +
    '#au-pan-blobox{border:0!important;background:transparent!important;overflow:visible!important;font-family:Figtree,system-ui,sans-serif;color:#14263c}#au-pan-blobox iframe{display:none!important}' +
    '.bl-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}.bl-k>div{background:#fff;border:1px solid #ebe6dc;border-radius:14px;padding:12px 14px}.bl-k b{display:block;font:800 26px Figtree,system-ui,sans-serif}.bl-k small{color:#6d7b8a;font-size:12px}' +
    '.bl-g{display:grid;grid-template-columns:minmax(320px,.9fr) minmax(0,1.6fr);gap:14px;align-items:start}.bl-dr{display:flex;align-items:center;gap:6px}.bl-dr .ai-r{flex:1;min-width:0}' +
    '.bl-f{border:1px solid #d8d2c6;background:#fbfaf7;color:#1b3553;border-radius:999px;padding:3px 9px;font:700 11px Figtree,system-ui,sans-serif;cursor:pointer;white-space:nowrap}.bl-f.on{background:#1b3553;color:#fff;border-color:#1b3553}' +
    '.bl-l{display:grid;gap:8px;min-width:0}.bl-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.bl-bar input{flex:1 1 240px;min-width:0}.bl-bar span{color:#6d7b8a;font-size:12.5px;margin-left:auto}' +
    '.bl-c{display:grid;grid-template-columns:54px minmax(0,1fr) minmax(120px,.5fr);gap:12px;align-items:center;width:100%;text-align:left;background:#fff;border:1px solid #ebe6dc;border-left:5px solid var(--c);border-radius:14px;padding:10px 14px;cursor:pointer;font:inherit;color:inherit}' +
    '.bl-c:hover{border-color:#c4953c;border-left-color:var(--c)}.bl-c>b{font:800 22px Figtree,system-ui,sans-serif;text-align:center;color:var(--c)}.bl-c strong{display:block;font-size:13.5px}.bl-c small{display:block;color:#6d7b8a;font-size:12px}.bl-c small.t{color:#34495f}' +
    '.bl-c em{font-style:normal;font-size:11.5px;font-weight:700;color:var(--c);text-align:right}.bl-mais{justify-self:center;border:1px solid #d8d2c6;background:#fff;border-radius:999px;padding:6px 14px;font:700 12.5px Figtree,system-ui,sans-serif;cursor:pointer}' +
    '.bl-nota{margin:12px 0 0;color:#6d7b8a;font-size:12px}@media (max-width:900px){.bl-g{grid-template-columns:minmax(0,1fr)}.bl-c{grid-template-columns:44px minmax(0,1fr)}.bl-c em{grid-column:2;text-align:left}}';
  D.head.appendChild(cssB);

  /* =================== Acervo Central: escaninhos, prontuário, exportar e dados dos filtrados =================== */
  var pid = function (v) { return String(v || '').replace(/\D/g, ''); };
  var FIXOS = [['fx_aptos', 'Aptos', 'aptos para julgamento (etiqueta ou tarefa)', '#3e72ad'], ['fx_metas', 'Metas', 'etiquetas de meta do CNJ', '#c4953c'], ['fx_retirados', 'Retirados de pauta', 'retirados, adiados ou a retirar de pauta', '#b0524a']];
  var FXC = new WeakMap(), FXG = -1, SPSIG = '', SPSET = new Set();
  /* escaninhos automáticos de seleção prévia: um por sessão futura ainda sem pauta oficial */
  function sessoesSemPauta() { try { var w = mw(), S = w && w.CMTSessao && w.CMTSessao.estado(), h = new Date().toISOString().slice(0, 10);
    return ((S && S.sessoes) || []).filter(function (x) { return x.data >= h && !(x.itens || []).length; }).sort(function (a, b) { return a.data < b.data ? -1 : 1; }); } catch (e) { return []; } }
  function dataDaSessao(nome) { var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(nome || '')); if (m) return m[3] + '-' + m[2] + '-' + m[1]; var c = comp(), d = ((c && c.sessionDetails) || {})[nome]; return (d && d.date) || ''; }
  function escPrevia(r) { if (r['Seleção Prévia'] !== 'SELECIONADO PREVIAMENTE') return ''; var d = dataDaSessao(r['Sessão Destino']); return d && SPSET.has(d) ? 'sp_' + d : ''; }
  function escFixo(r) { if (FXG !== GERACAO + '|' + SPSIG) { FXC = new WeakMap(); FXG = GERACAO + '|' + SPSIG; } var v = FXC.get(r); if (v !== undefined) return v;
    v = escPrevia(r); if (v) { FXC.set(r, v); return v; }
    var o = MAPA.get(dig(r.processo || r.Processo)); v = (!o || o.caminho || ACS_ENC.indexOf(o.sit) >= 0) ? '' : ehRetirado(o) ? 'fx_retirados' : ehApto(o) ? 'fx_aptos' : ehMeta(o) ? 'fx_metas' : ''; FXC.set(r, v); return v; }
  function garantirFixos(c) {
    if (!Array.isArray(c.escaninhos)) c.escaninhos = [];
    var mud = false; FIXOS.slice().reverse().forEach(function (f) { var e = c.escaninhos.find(function (x) { return x.id === f[0]; }); if (!e) { c.escaninhos.unshift({ id: f[0], titulo: f[1], subtitulo: f[2], obs: '', cor: f[3], fixo: true, criado: new Date().toISOString().slice(0, 10) }); mud = true; } else if (!e.fixo) { e.fixo = true; mud = true; } });
    var SP = sessoesSemPauta(), sig = SP.map(function (x) { return x.data; }).join(','); if (sig !== SPSIG) { SPSIG = sig; SPSET = new Set(SP.map(function (x) { return x.data; })); }
    var ultimoFixo = function () { var k = -1; c.escaninhos.forEach(function (e, i) { if (e.fixo) k = i; }); return k; };
    SP.forEach(function (x) { var id = 'sp_' + x.data, e = c.escaninhos.find(function (y) { return y.id === id; }), br = x.data.slice(8, 10) + '/' + x.data.slice(5, 7) + '/' + x.data.slice(0, 4);
      if (!e) { c.escaninhos.splice(ultimoFixo() + 1, 0, { id: id, titulo: 'Seleção prévia · ' + br, subtitulo: 'sessão sem pauta oficial · automático', obs: '', cor: '#4a8f74', fixo: true, auto: true, criado: new Date().toISOString().slice(0, 10) }); mud = true; } });
    c.escaninhos = c.escaninhos.filter(function (e) { if (!e.auto || SPSET.has(String(e.id).slice(3))) return true; c.rows.forEach(function (r) { if (r._escaninho === e.id) r._escaninho = ''; }); mud = true; return false; });
    var w = mw(); if (w && w.__cmtEscFixo !== escFixo) { w.__cmtEscFixo = escFixo; mud = true; }
    if (mud) { try { c.saveDeb ? c.saveDeb() : c.saveDB(); c.refresh(); } catch (e) {} }
  }
  function membros(c) { var ids = new Set(c.escaninhos.map(function (e) { return e.id; })), cont = {}; c.rows.forEach(function (r) { var k = ids.has(r._escaninho) ? r._escaninho : escFixo(r); if (k) cont[k] = (cont[k] || 0) + 1; }); return cont; }
  var ESC = { cfg: '', dlg: '' };
  function painelEscaninhos() {
    var g = $('#index .ix-g[data-tab="acervo"]'), c = comp(); if (!g || !c || !ACV.recs) return;
    garantirFixos(c);
    var box = g.querySelector('.au-escs'); if (!box) { box = D.createElement('div'); box.className = 'au-escs'; g.prepend(box); box.addEventListener('click', cliqueEsc); box.addEventListener('input', editaEsc); }
    miniEscaninhos(g, c);
    if (box.contains(D.activeElement) && /INPUT|TEXTAREA/.test(D.activeElement.tagName)) return;
    var cont = membros(c), nsel = c.selected ? c.selected.size : 0, PAL = ['#2f6690', '#4a8f74', '#b4763a', '#7a5ba6', '#a6545e', '#3d8b9c', '#6b7d2f', '#c0843d', '#3e72ad', '#c4953c', '#b0524a'];
    var html = '<div class="eh"><span class="k">Escaninhos</span><button type="button" data-esc="novo" title="Criar um escaninho">+ Novo</button></div>' +
      '<p class="s">' + (nsel ? '<b>' + nf(nsel) + ' marcado(s)</b> na busca: clique em “guardar” no escaninho de destino.' : 'Marque processos na busca avançada e guarde-os aqui. Clique no escaninho para abrir a lista.') + '</p>' +
      c.escaninhos.filter(function (e) { return !e.virtual; }).map(function (e) { var cfg = ESC.cfg === e.id;
        return '<div class="ei' + (cfg ? ' cfg' : '') + (ESC.dlg === e.id ? ' on' : '') + '" style="--c:' + esc(e.cor || '#2f6690') + '"><button type="button" class="eo" data-esc="abrir" data-id="' + esc(e.id) + '" title="Abrir o escaninho"><em class="dot"></em><span><b>' + esc(e.titulo || 'Sem título') + (e.fixo ? ' <i>fixo</i>' : '') + '</b>' + (e.subtitulo ? '<small>' + esc(e.subtitulo) + '</small>' : '') + (e.obs ? '<small class="lb">📝 ' + esc(e.obs) + '</small>' : '') + '</span><b class="n">' + nf(cont[e.id] || 0) + '</b></button>' +
          '<div class="ea">' + (nsel ? '<button type="button" class="pri" data-esc="guardar" data-id="' + esc(e.id) + '">⤵ guardar ' + nf(nsel) + '</button>' : '') + '<button type="button" data-esc="cfg" data-id="' + esc(e.id) + '" aria-expanded="' + cfg + '" title="Nome, subtítulo, lembrete e cor">⚙</button></div>' +
          (cfg ? '<div class="ec"><label>Nome<input data-campo="titulo" data-id="' + esc(e.id) + '" value="' + esc(e.titulo || '') + '" maxlength="70"></label><label>Subtítulo<input data-campo="subtitulo" data-id="' + esc(e.id) + '" value="' + esc(e.subtitulo || '') + '" maxlength="90"></label><label>Lembrete<textarea data-campo="obs" data-id="' + esc(e.id) + '" rows="2">' + esc(e.obs || '') + '</textarea></label>' +
            '<div class="cores">' + PAL.map(function (p) { return '<button type="button" data-esc="cor" data-id="' + esc(e.id) + '" data-cor="' + p + '" style="background:' + p + '" class="' + (e.cor === p ? 'on' : '') + '" aria-label="Cor ' + p + '"></button>'; }).join('') + '</div>' +
            (e.fixo ? '<small class="s">Escaninho fixo: recebe os processos pela regra e também os que você guardar à mão.</small>' : '<button type="button" class="del" data-esc="excluir" data-id="' + esc(e.id) + '">Excluir escaninho</button>') + '</div>' : '') + '</div>'; }).join('');
    if (box.__h !== html) { box.innerHTML = html; box.__h = html; }
  }
  var ESC_RECOLHIDO = false;
  function miniEscaninhos(g, c) {
    if (!ESC_RECOLHIDO) { ESC_RECOLHIDO = true; var estreita = W.matchMedia('(max-width:1060px)').matches, tg0 = $('#ixTog');
      if (tg0 && (estreita ? D.body.classList.contains('ix-sheet') : !D.body.classList.contains('ix-min'))) tg0.click(); }
    var sl = $('#ixTog .side-lab'); if (sl && sl.textContent !== 'Escaninhos') sl.textContent = 'Escaninhos';
    var mi = g.querySelector('.au-escmini'); if (!mi) { mi = D.createElement('div'); mi.className = 'au-escmini'; g.prepend(mi); mi.addEventListener('click', function (e) { e.preventDefault(); var q = e.target.closest('[data-id]'); if (q) { abrirEscaninho(q.dataset.id); return; } var tg = $('#ixTog'); if (D.body.classList.contains('ix-min') && tg) tg.click(); }); }
    var cont = membros(c), html = '<button type="button" class="mt" title="Abrir o painel de escaninhos">Escaninhos</button>' + c.escaninhos.filter(function (e) { return !e.virtual; }).map(function (e) { return '<button type="button" class="mq' + (ESC.dlg === e.id ? ' on' : '') + '" data-id="' + esc(e.id) + '" style="--c:' + esc(e.cor || '#2f6690') + '" title="' + esc(e.titulo) + ' · ' + nf(cont[e.id] || 0) + ' processo(s)" aria-label="' + esc(e.titulo) + ', ' + nf(cont[e.id] || 0) + ' processos"></button>'; }).join('');
    if (mi.__h !== html) { mi.innerHTML = html; mi.__h = html; }
  }
  function salvarMotor(c) { try { c.saveDB(); } catch (e) { try { c.saveDeb(); } catch (er) {} } try { c.refresh(); } catch (e) {} }
  function cliqueEsc(e) {
    var b = e.target.closest('[data-esc]'); if (!b) return; e.preventDefault(); var c = comp(); if (!c) return; var k = b.dataset.esc, id = b.dataset.id, es = c.escaninhos.find(function (x) { return x.id === id; });
    if (k === 'novo') { var nid = 'esc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); c.escaninhos.push({ id: nid, titulo: 'Novo escaninho', subtitulo: '', obs: '', cor: '#2f6690', criado: new Date().toISOString().slice(0, 10) }); ESC.cfg = nid; salvarMotor(c); }
    else if (k === 'cfg') ESC.cfg = ESC.cfg === id ? '' : id;
    else if (k === 'cor' && es) { es.cor = b.dataset.cor; salvarMotor(c); }
    else if (k === 'excluir' && es && !es.fixo) { if (!W.confirm('Excluir o escaninho "' + es.titulo + '"? Os processos dele saem do escaninho e continuam no acervo.')) return; c.rows.forEach(function (r) { if (r._escaninho === id) r._escaninho = ''; }); c.escaninhos = c.escaninhos.filter(function (x) { return x.id !== id; }); ESC.cfg = ''; salvarMotor(c); }
    else if (k === 'guardar' && es) { var hoje = new Date().toISOString().slice(0, 10), n = 0; c.rows.forEach(function (r) { if (c.selected.has(pid(r.Processo))) { if (!r._triagem) r._triagem = hoje; r._escaninho = id; n++; } }); c.selected.clear(); salvarMotor(c); aviso(nf(n) + ' processo(s) guardado(s) no escaninho “' + es.titulo + '”.'); }
    else if (k === 'abrir') abrirEscaninho(id);
    var box = $('.au-escs'); if (box) box.__h = ''; painelEscaninhos();
  }
  var edT;
  function editaEsc(e) { var t = e.target, c = comp(); if (!t.dataset.campo || !c) return; var es = c.escaninhos.find(function (x) { return x.id === t.dataset.id; }); if (!es) return; es[t.dataset.campo] = t.dataset.campo === 'titulo' ? (t.value || 'Sem título') : t.value; clearTimeout(edT); edT = setTimeout(function () { try { c.saveDeb(); c.refresh(); } catch (er) {} }, 400); }
  /* escaninho aberto: a vista da triagem num diálogo, sobre o Acervo Central */
  var ESCF = { id: '', titulo: '', set: null };
  function membrosEsc(id) { var c = comp(); if (!c) return new Set(); var ids = new Set(c.escaninhos.map(function (e) { return e.id; })), S = new Set();
    c.rows.forEach(function (r) { var k = ids.has(r._escaninho) ? r._escaninho : escFixo(r); if (k === id) S.add(dig(r.processo || r.Processo)); }); return S; }
  function escNaPlanilha(id) {
    var c = comp(); if (!c) return; garantirFixos(c);
    if (!id || id === '__bandeja') { ESCF = { id: '', titulo: '', set: null }; }
    else { var es = c.escaninhos.find(function (x) { return x.id === id; }); ESCF = { id: id, titulo: es ? es.titulo : id, cor: es && es.cor, set: membrosEsc(id) }; }
    try { if ((c.state || {}).tab !== 'central' || (c.state || {}).view !== 'sheet') c.setState({ tab: 'central', triOpen: '', view: 'sheet' }); } catch (e) {}
    if (ESCF.id) triagemPlanilha(true); else { var md = mw() && mw().document, b = md && md.getElementById('cmt-sheet'); if (b) b.__sig = ''; planilha(); }
    var bx = $('.au-escs'); if (bx) bx.__h = ''; var bx2 = $('.au-esc'); if (bx2) bx2.__h = '';
  }
  function abrirEscaninho(id, lista, titulo) {
    if (!lista) { escNaPlanilha(id); return; }
    var c = comp(), w = mw(), md = w && w.document; if (!c || !md) return;
    garantirFixos(c);
    if (lista) { w.__cmtVirtual = new Set(lista.map(function (x) { return pid(x.Processo || x.processo); })); c.escaninhos = c.escaninhos.filter(function (x) { return !x.virtual; }); c.escaninhos.push({ id: '__busca', titulo: titulo || 'Triagem', subtitulo: nf(lista.length) + ' processo(s) do resultado da busca', obs: '', cor: '#1b3553', virtual: true }); id = '__busca'; }
    var es = c.escaninhos.find(function (x) { return x.id === id; }); if (!es) return;
    cssMotor('cmt-escdlg-css', CSS_ESCDLG);
    c.triEscSel = new Set();
    c.setState({ tab: 'triagem', triOpen: id, triConfig: false, triVista: 'cards' });
    ESC.dlg = id; D.body.classList.add('au-escdlg'); md.body.classList.add('cmt-escdlg'); md.body.classList.toggle('cmt-escfx', !!es.fixo); md.body.classList.toggle('cmt-escvt', !!es.virtual);
    voltarBar(md, es);
    var bx = $('.au-escs'); if (bx) bx.__h = '';
    try { md.scrollingElement.scrollTop = 0; } catch (e) {}
  }
  function fecharEscaninho() {
    var c = comp(), w = mw(), md = w && w.document; if (!ESC.dlg) return; ESC.dlg = '';
    D.body.classList.remove('au-escdlg');
    if (md) md.body.classList.remove('cmt-escdlg', 'cmt-escfx', 'cmt-escvt');
    if (w) delete w.__cmtVirtual;
    if (c) { c.escaninhos = c.escaninhos.filter(function (x) { return !x.virtual; }); c.triEscSel = new Set(); c.setState({ tab: 'central', triOpen: '' }); }
    var box = $('.au-escs'); if (box) box.__h = '';
  }
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ESC.dlg) fecharEscaninho(); });
  function vigiarEscaninho() {
    var c = comp(), w = mw(), md = w && w.document; if (!ESC.dlg || !c || !md) return;
    if ((c.state || {}).triOpen !== ESC.dlg || !D.body.classList.contains('cmt-acv')) { fecharEscaninho(); return; }
    md.addEventListener && !md.__cmtEscLig && (md.__cmtEscLig = true, md.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ESC.dlg) fecharEscaninho(); }));
    /* por card: enviar só este processo à Seleção prévia */
    var vb = md.getElementById('cmt-voltar'), mm = md.querySelector('main'); if (vb && mm && mm.firstElementChild !== vb) mm.prepend(vb);
    md.querySelectorAll('.tri-pcard[data-tri-card] .tri-pcard-topo:not(.cmt-ok)').forEach(function (tp) { var cd = tp.closest('.tri-pcard'); tp.classList.add('cmt-ok'); if (tp.querySelector('.cmt-sp1')) return; var b = md.createElement('button'); b.type = 'button'; b.className = 'cmt-sp1'; b.dataset.pid = cd.dataset.triCard; b.title = 'Lançar só este processo na Seleção prévia da sessão escolhida na barra'; b.textContent = '→ Seleção prévia'; tp.appendChild(b); });
    /* mover os marcados para outro escaninho */
    var bar = md.querySelector('.tri-selbar'); if (bar && !bar.querySelector('.cmt-mover')) { var s = md.createElement('select'); s.className = 'cmt-mover'; s.setAttribute('aria-label', 'Mover os marcados para outro escaninho'); bar.appendChild(s); s.addEventListener('change', moverMarcados); }
    var sm = bar && bar.querySelector('.cmt-mover'); if (sm) { var op = '<option value="">Mover marcados para…</option>' + c.escaninhos.filter(function (x) { return !x.virtual && x.id !== ESC.dlg; }).map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.titulo) + '</option>'; }).join('') + (ESC.dlg !== '__busca' ? '<option value="__fora">Tirar do escaninho</option>' : ''); if (sm.__h !== op) { sm.innerHTML = op; sm.__h = op; } }
  }
  function voltarBar(md, es) {
    var v = md.getElementById('cmt-voltar');
    if (!v) { v = md.createElement('div'); v.id = 'cmt-voltar'; v.innerHTML = '<button type="button" data-v="voltar">← Voltar à busca avançada</button><span></span>'; v.querySelector('button').addEventListener('click', fecharEscaninho); }
    var m = md.querySelector('main'); if (m && v.parentElement !== m) m.prepend(v); else if (!m && v.parentElement !== md.body) md.body.prepend(v);
    v.querySelector('span').textContent = es.virtual ? 'Modo triagem: o prontuário de cada processo do resultado da busca' : (es.fixo ? 'Escaninho fixo: pela regra e pelo que foi guardado à mão' : 'Escaninho');
  }
  function moverMarcados(e) {
    var c = comp(), v = e.target.value; e.target.value = ''; if (!c || !v) return;
    var sel = c.triEscSel || new Set(); if (!sel.size) { aviso('Marque os processos no escaninho antes de mover.'); return; }
    var hoje = new Date().toISOString().slice(0, 10), n = 0, dest = c.escaninhos.find(function (x) { return x.id === v; });
    c.rows.forEach(function (r) { if (sel.has(pid(r.Processo))) { if (v === '__fora') r._escaninho = ''; else { if (!r._triagem) r._triagem = hoje; r._escaninho = v; } n++; } });
    c.triEscSel = new Set(); salvarMotor(c); aviso(nf(n) + ' processo(s) ' + (v === '__fora' ? 'tirado(s) do escaninho' : 'movido(s) para “' + (dest ? dest.titulo : v) + '”') + '.');
  }
  function enviarUmSP(md, p) {
    var c = comp(); if (!c) return;
    if (!(c.state || {}).triSessao) { var s = md.querySelector('.tri-sel-sp select'); if (s) s.focus(); aviso('Escolha a sessão da Seleção prévia na barra do escaninho e clique de novo.'); return; }
    c.triEscSel = new Set([p]); c.refresh();
    setTimeout(function () { var b = md.querySelector('.tri-sel-sp button'); if (b && !b.disabled) b.click(); else aviso('Não foi possível lançar na Seleção prévia agora.'); }, 120);
  }
  var CSS_ESCDLG =
    'body.cmt-escdlg .tri-kpis,body.cmt-escdlg .tri-movel-topo,body.cmt-escdlg .tri-int-corpo,body.cmt-escdlg main>header,body.cmt-escdlg #cmt-fases,body.cmt-escdlg main>div:not(#cmt-voltar):not(:has(.tri-movel)),.tri-icone[title^="Remover da triagem"]{display:none!important}' +
    'body.cmt-escdlg .tri-procs,body.cmt-escdlg .tri-plan-wrap{max-height:none!important;overflow:visible!important}body.cmt-escdlg .tri-aberto,body.cmt-escdlg .tri-movel,body.cmt-escdlg main,body.cmt-escdlg div:has(>main){overflow:visible!important}body.cmt-escdlg .tri-selbar{position:sticky;top:0;z-index:6;box-shadow:0 6px 14px rgba(20,38,60,.08)}' +
    '#cmt-voltar{display:none}body.cmt-escdlg #cmt-voltar{display:flex;align-items:center;gap:12px;margin:0 0 12px;font-family:Figtree,system-ui,sans-serif}#cmt-voltar button{border:1px solid #1b3553;background:#1b3553;color:#fff;border-radius:999px;padding:8px 16px;font:800 13px Figtree,system-ui,sans-serif;cursor:pointer}#cmt-voltar button:hover{background:#244a73}#cmt-voltar span{color:#6d7b8a;font-size:12.5px}' +
    'body.cmt-escdlg .tri-movel{border:0;box-shadow:none;background:transparent}body.cmt-escdlg .tri-int .tri-aberto,body.cmt-escdlg .tri-aberto{margin:0!important}' +
    'body.cmt-escfx .tri-ab-btn.perigo,body.cmt-escvt .tri-ab-btn.perigo,body.cmt-escvt .tri-ab-btn.ouro,body.cmt-escvt .tri-ab-btn[aria-expanded]{display:none!important}' +
    '.cmt-sp1{align-self:center;justify-self:end;margin:6px 10px;border:1px solid #c4953c;background:#fbf3e3;color:#6b4a12;border-radius:999px;padding:5px 10px;font:800 11px Figtree,system-ui,sans-serif;cursor:pointer;white-space:nowrap}.cmt-sp1:hover{background:#c4953c;color:#fff}' +
    '.cmt-mover{border:1px solid #d8d2c6;border-radius:8px;background:#fff;padding:5px 8px;font:600 11.5px Figtree,system-ui,sans-serif;color:#1b3553;margin-left:6px}';
  function cssMotor(id, txt) { var md = mw() && mw().document; if (!md || md.getElementById(id)) return; var st = md.createElement('style'); st.id = id; st.textContent = txt; md.head.appendChild(st); }
  /* cliques no motor: prontuário, exportar e seleção prévia por card */
  function ligarCliquesMotor() {
    var md = mw() && mw().document; if (!md || md.__cmtCliques) return; md.__cmtCliques = true;
    md.addEventListener('keydown', tecladoTri, true);
    md.addEventListener('keydown', function (e) { if (e.key === 'Escape' && md.body.classList.contains('cmt-shfull')) telaCheia(md, false); });
    md.addEventListener('click', function (e) {
      var pl = e.target.closest && e.target.closest('[data-cmt-plan]'); if (pl) { triagemPlanilha(false); return; }
      var t = e.target.closest && e.target.closest('[data-cmt-pront],[data-cmt-exp],[data-cmt-oper],.cmt-sp1'); if (!t) return;
      if (t.hasAttribute('data-cmt-oper')) { e.preventDefault(); e.stopPropagation(); var w2 = mw(), c2 = comp(); if (!w2 || !w2.CMTOperacional || !c2) { aviso('Gravação indisponível: motor não carregado.'); return; }
        t.disabled = true; t.textContent = 'GRAVANDO…';
        w2.CMTOperacional.gravar(c2.rows).then(function (r) { aviso(r.mud ? 'Triagem gravada no procs-muta: ' + nf(r.mud) + ' processo(s) no operacional.' : 'Nada a gravar: o operacional já está igual.'); })
          .catch(function (er) { aviso('Falha ao gravar: ' + (er && er.message || er)); }).then(function () { t.disabled = false; t.textContent = '⇪ GRAVAR TRIAGEM'; });
        return; }
      if (t.classList.contains('cmt-sp1')) { e.preventDefault(); e.stopPropagation(); enviarUmSP(md, t.dataset.pid); return; }
      if (t.hasAttribute('data-cmt-exp') && W.__cmtExpDireto) { W.__cmtExpDireto = false; return; }
      e.preventDefault(); e.stopPropagation();
      if (t.hasAttribute('data-cmt-pront')) { triagemPlanilha(true); return; }
      else menuExportar(t);
    }, true);
  }
  /* exportar: um botão, um menu compacto */
  function menuExportar(btn) {
    var md = btn.ownerDocument, m = md.getElementById('cmt-expm'); if (m) { m.remove(); return; }
    m = md.createElement('div'); m.id = 'cmt-expm'; m.setAttribute('role', 'menu');
    var r = btn.getBoundingClientRect(); m.style.left = r.left + 'px'; m.style.top = (r.bottom + 4 + md.scrollingElement.scrollTop) + 'px';
    m.innerHTML = '<button type="button" data-x="xlsx">Excel (.xlsx)</button><button type="button" data-x="csv">CSV (.csv)</button><button type="button" data-x="pdf">PDF (imprimir)</button><button type="button" data-x="copiar">Copiar os números</button>';
    md.body.appendChild(m);
    m.addEventListener('click', function (e) { var b = e.target.closest('[data-x]'); if (!b) return; var k = b.dataset.x; m.remove(); exportar(k, btn); });
    setTimeout(function () { md.addEventListener('click', function f(e) { if (!m.contains(e.target)) { m.remove(); md.removeEventListener('click', f, true); } }, true); }, 0);
  }
  function exportar(k, btn) {
    var c = comp(), L = c.filteredCentral().map(function (x) { return x.r; }), R = L.map(function (r) { return MAPA.get(dig(r.processo || r.Processo)); }).filter(Boolean);
    if (k === 'xlsx') { W.__cmtExpDireto = true; btn.click(); return; }
    if (k === 'copiar') { var t = L.map(function (r) { return r.Processo || r.processo; }).join('\n'); try { navigator.clipboard.writeText(t); aviso(nf(L.length) + ' número(s) copiado(s).'); } catch (e) { aviso('Não foi possível copiar.'); } return; }
    var cols = [['Processo', function (o) { return o.p; }], ['Classe', function (o) { return o.classe || ''; }], ['Assunto', function (o) { return o.assunto || ''; }], ['Local', localDe], ['Situação', function (o) { return o.caminho ? 'A caminho' : (SIT_BY[o.sit] || {}).t || ''; }], ['Seção', function (o) { return o.secao || ''; }], ['Etiquetas', function (o) { return o.etq.join('; '); }]];
    var hoje = new Date().toISOString().slice(0, 10);
    if (k === 'csv') { var q = function (v) { v = String(v == null ? '' : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      var csv = '﻿' + cols.map(function (x) { return x[0]; }).join(';') + '\n' + R.map(function (o) { return cols.map(function (x) { return q(x[1](o)); }).join(';'); }).join('\n');
      var a = D.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'acervo-filtrado-' + hoje + '.csv'; D.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); return; }
    if (k === 'pdf') { var wn = W.open('', '_blank'); if (!wn) { aviso('O navegador bloqueou a janela de impressão.'); return; }
      wn.document.write('<!doctype html><meta charset="utf-8"><title>Acervo filtrado · ' + hoje + '</title><style>body{font:11px Figtree,system-ui,sans-serif;color:#14263c;margin:18px}h1{font-size:16px;margin:0 0 4px}p{margin:0 0 10px;color:#555}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}th{background:#1b3553;color:#fff}@page{size:A4 landscape;margin:12mm}</style>' +
        '<h1>Acervo filtrado · Gabinete A</h1><p>' + nf(R.length) + ' processo(s) · ' + hoje.split('-').reverse().join('/') + '</p><table><thead><tr>' + cols.map(function (x) { return '<th>' + x[0] + '</th>'; }).join('') + '</tr></thead><tbody>' + R.map(function (o) { return '<tr>' + cols.map(function (x) { return '<td>' + esc(x[1](o)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table><script>setTimeout(function(){print()},300)<\/script>');
      wn.document.close(); }
  }
  var CSS_EXPM = '#cmt-expm{position:absolute;z-index:999;display:flex;flex-direction:column;min-width:190px;padding:5px;border-radius:10px;background:#fff;border:1px solid #d8d2c6;box-shadow:0 10px 26px rgba(20,38,60,.18);font-family:Figtree,system-ui,sans-serif}#cmt-expm button{border:0;background:transparent;text-align:left;padding:8px 10px;border-radius:7px;font:650 12.5px Figtree,system-ui,sans-serif;color:#14263c;cursor:pointer}#cmt-expm button:hover{background:#f4f2ed}';
  /* dados dos filtrados: painel expansível acima da busca avançada (com as fases do PJe) */
  var IREGF = {}, LS_DADOS = 'cmt_dados_aberto';
  function dadosFiltrados() {
    var w = mw(), md = w && w.document, c = comp(); if (!md || !c || !ACV.recs) return;
    var velho = md.getElementById('cmt-dados'); if (velho) velho.remove(); md.body.classList.remove('cmt-dados-min'); return;   /* os números e cartões dos filtrados agora estão na Visão geral do Monitor */
    var sp = md.querySelector('.central-search-panel'), grade = sp && sp.parentElement; if (!grade) return;
    cssMotor('cmt-ai-css', cssAI.textContent + CSS_LST + CSS_DADOS + CSS_EXPM);
    cssMotor('cmt-busca-css', CSS_BUSCA);
    grade.classList.add('cmt-dados-grade');
    var box = md.getElementById('cmt-dados');
    if (!box) { box = md.createElement('section'); box.id = 'cmt-dados'; box.innerHTML = '<button type="button" class="cd-h" aria-expanded="true"><b>Dados dos filtrados</b><small></small><span></span></button><div class="cd-b"><div class="cd-c"></div></div>';
      box.querySelector('.cd-h').addEventListener('click', function () { var min = !md.body.classList.contains('cmt-dados-min'); md.body.classList.toggle('cmt-dados-min', min); ls.set(LS_DADOS, !min); box.__sig = ''; box.__pre = ''; dadosFiltrados(); });
      box.addEventListener('click', function (e) { var b = e.target.closest('[data-ik]'); if (!b) return; e.preventDefault(); var r = IREGF[b.dataset.ik]; if (!r) return; if (md.body.classList.contains('cmt-dados-min')) { md.body.classList.remove('cmt-dados-min'); ls.set(LS_DADOS, true); box.__sig = ''; box.__pre = ''; dadosFiltrados(); } var slot = box.querySelector('.cd-lst'); if (!slot) { slot = md.createElement('div'); slot.className = 'cd-lst'; box.querySelector('.cd-c').after(slot); } abrirLista(slot, r.t, r.L, { rotulo: 'Filtrar estes' }); });
      if (!ls.get(LS_DADOS)) md.body.classList.add('cmt-dados-min'); }
    if (box.parentElement !== grade) grade.prepend(box);
    var fm = ACV.st.f.motor, pre = GERACAO + '|' + (fm ? fm.size + ':' + fm.values().next().value : '-') + '|' + Array.from(ACS.hide).sort().join(',') + '|' + (ACV.st.f.cam || '') + '|' + md.body.classList.contains('cmt-dados-min');
    if (box.__pre === pre && box.__F) return; box.__pre = pre;
    var min = md.body.classList.contains('cmt-dados-min'), F = acvFiltered(); box.__F = F;
    var h = box.querySelector('.cd-h'); h.setAttribute('aria-expanded', String(!min)); h.querySelector('small').textContent = nf(F.length) + ' processo(s) no filtro · números, situação, seção, idade, aptos, classes, fases e tarefas do PJe'; h.querySelector('span').textContent = min ? 'Expandir: situação, seção, idade, aptos, fases e tarefas ▾' : 'Minimizar ▴';
    var sig = GERACAO + '|' + F.length + '|' + (F[0] || {}).p + '|' + (F[F.length - 1] || {}).p; if (box.__sig === sig) return; box.__sig = sig;
    var salvo = IREG; IREG = {};
    var pend = F.filter(function (o) { return o.pend1 === 'sim'; }), apt = F.filter(ehApto), aptM = apt.filter(ehMono), sel = F.filter(function (o) { return o.sel; }), div = F.filter(function (o) { return o.secAlerta; }), gab = F.filter(function (o) { return o.gab; });
    var ida = F.map(idade).filter(function (x) { return x != null; }).sort(function (a, b) { return a - b; }), med = ida.length ? ida[Math.floor(ida.length / 2)] : null, val = F.reduce(function (s, o) { return s + (o.vc || 0); }, 0);
    var kp = function (k, t, n, sub, L) { reg(k, t, L); return '<button type="button" class="cd-k" data-ik="' + k + '"><span>' + esc(t) + '</span><b>' + n + '</b><small>' + sub + '</small></button>'; };
    var COR_S = { '1ª Seção': '#3e72ad', '2ª Seção': '#d9a046', '3ª Seção': '#8a70c0' };
    var html = '<div class="cd-ks">' + kp('f-n', 'Filtrados', nf(F.length), nf(gab.length) + ' no gabinete', F) + kp('f-p', '1º julgamento pendente', nf(pend.length), (F.length ? Math.round(pend.length / F.length * 100) : 0) + '% do filtro', pend) +
      kp('f-a', 'Aptos para julgar', nf(apt.length), nf(apt.length - aptM.length) + ' colegiado · ' + nf(aptM.length) + ' monocrática', apt) + kp('f-s', 'Seleção prévia', nf(sel.length), 'selecionados para sessão', sel) +
      kp('f-d', 'Seção divergente', nf(div.length), 'CNJ × etiqueta', div) + '<div class="cd-k st"><span>Idade mediana</span><b>' + (med == null ? '—' : med.toFixed(1).replace('.', ',') + ' anos') + '</b><small>valor das causas R$ ' + (val >= 1e9 ? (val / 1e9).toFixed(1).replace('.', ',') + ' bi' : val >= 1e6 ? (val / 1e6).toFixed(1).replace('.', ',') + ' mi' : nf(Math.round(val))) + '</small></div></div>' +
      '<div class="ai-g">' + cartao('Situação', '', linhas('fs', SIT.map(function (x) { return [x.t, 'Situação: ' + x.t, F.filter(function (o) { return o.sit === x.k && !o.caminho; }), cor(x.c)]; }).filter(function (x) { return x[2].length; }).concat(F.some(function (o) { return o.caminho; }) ? [['A caminho do gabinete', 'A caminho do gabinete', F.filter(function (o) { return o.caminho; }), '#1b3553']] : []), F.length)) +
      cartao('Seção competente', '', linhas('fc', grupo(F, secaoDe).map(function (g) { return [g[0], 'Seção: ' + g[0], g[1], COR_S[g[0]] || '#b3ab9c']; }), F.length)) +
      cartao('Idade do acervo', '', linhas('fi', FXI.map(function (f) { return [f[2], 'Idade: ' + f[2], F.filter(function (o) { return faixa(FXI, idade(o)) === f[2]; })]; }), F.length, '#8a70c0')) +
      cartao('Tempo na tarefa atual', nf(gab.length) + ' no gabinete', linhas('ft', FXT.map(function (f) { return [f[2], 'Tempo na tarefa: ' + f[2], gab.filter(function (o) { return faixa(FXT, noTk(o)) === f[2]; })]; }), gab.length, '#1fa58a')) +
      cartao('Classes', 'as 8 maiores', linhas('fk', grupo(F, function (o) { return String(o.classe || '').toUpperCase(); }).slice(0, 8).map(function (g) { return [g[0], 'Classe: ' + g[0], g[1]]; }), F.length, '#1b3553')) +
      cartao('Distribuição por ano', 'no TRF', linhas('fy', grupo(F, function (o) { return mesDe(o.dd).slice(0, 4) || 'sem data'; }).sort(function (a, b) { return String(b[0]).localeCompare(String(a[0])); }).slice(0, 10).map(function (g) { return [g[0], 'Distribuídos em ' + g[0], g[1]]; }), F.length, '#3e72ad')) + '</div>';
    IREGF = IREG; IREG = salvo;
    box.querySelector('.cd-c').innerHTML = html;
  }
  var CSS_DADOS =
    '.cmt-dados-grade>#cmt-dados{order:-6}.cmt-dados-grade>div[style*="padding-bottom:16px"],.cmt-dados-grade>div[style*="padding-bottom: 16px"]{order:-3}body.cmt-dados-min .cmt-dados-grade>div[style*="padding-bottom:16px"],body.cmt-dados-min .cmt-dados-grade>div[style*="padding-bottom: 16px"],body.cmt-dados-min #cmt-dados .ai-g,body.cmt-dados-min #cmt-dados #cmt-fases,body.cmt-dados-min #cmt-dados .cd-lst{display:none!important}' +
    '#cmt-dados{background:#fff;border:1px solid #e5e1d8;border-radius:22px;box-shadow:0 12px 28px rgba(20,38,60,.05);overflow:hidden;font-family:Figtree,system-ui,sans-serif;color:#14263c}' +
    '#cmt-dados .cd-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;width:100%;border:0;background:#f6f1e6;padding:12px 18px;cursor:pointer;text-align:left;font:inherit;color:inherit}#cmt-dados .cd-h b{font:800 16px Figtree,system-ui,sans-serif}#cmt-dados .cd-h small{flex:1 1 260px;min-width:0;color:#6d7b8a;font-size:12px}#cmt-dados .cd-h span{font:800 12px Figtree,system-ui,sans-serif;color:#8a6116;white-space:nowrap}' +
    'body.cmt-dados-min #cmt-dados .cd-b{padding-bottom:4px}#cmt-dados .cd-b{padding:14px 18px 16px}#cmt-dados .cd-b>#cmt-fases{margin:16px 0 0!important}' +
    '.cd-ks{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}.cd-k{display:flex;flex-direction:column;gap:2px;text-align:left;border:1px solid #ebe6dc;background:#fbfaf7;border-radius:14px;padding:10px 12px;cursor:pointer;font:inherit;color:inherit}.cd-k.st{cursor:default}' +
    '.cd-k:hover:not(.st){border-color:#c4953c}.cd-k span{font:800 10px Figtree,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#8a6116}.cd-k b{font:800 22px Figtree,system-ui,sans-serif}.cd-k small{color:#6d7b8a;font-size:11.5px}#cmt-dados .ai-c h4{margin:0;font:800 14px Figtree,system-ui,sans-serif}#cmt-dados .ai-c header{display:flex;justify-content:space-between;gap:8px;margin-bottom:6px}';
  setInterval(function () {
    if (!W.__acvUnico) return;
    if (D.body.classList.contains('cmt-acv')) { var c0 = comp(); if (c0 && c0.state && c0.state.tab === 'triagem' && !ESC.dlg) { try { var md0 = mw().document; md0.body.classList.remove('cmt-escdlg', 'cmt-escfx', 'cmt-escvt'); c0.setState({ tab: 'central', triOpen: '' }); } catch (e) {} }
      ligarCliquesMotor(); painelEscaninhos(); dadosFiltrados(); vigiarEscaninho(); painelStats(); if (!W.__cmtVistaIni) { var cc = comp(); if (cc && cc.state) { W.__cmtVistaIni = true; if (cc.state.view !== 'sheet') try { cc.setState({ view: 'sheet' }); } catch (e) {} } } }
    else if (ESC.dlg) fecharEscaninho();
  }, 700);

  /* =================== Acervo Central · Planilha no formato da planilha do index, com tela cheia =================== */
  var LS_SHC = 'cmt_planilha_cols', SHX = { f: {}, sort: { k: '', d: 1 }, lim: 200, cols: null, sig: '' };
  function shCols() { if (!SHX.cols) { var sv = null; try { sv = JSON.parse(localStorage.getItem(LS_SHC) || 'null'); } catch (e) {} var PADRAO = ['p', 'sig', 'classe', 'assunto', 'secao', 'sit', 'local', 'tarefa', 'dias', 'dist', 'pri']; SHX.cols = Array.isArray(sv) ? sv : SH_COLS.filter(function (c) { return PADRAO.indexOf(c.k) >= 0; }).map(function (c) { return c.k; }); } return SH_COLS.filter(function (c) { return SHX.cols.indexOf(c.k) >= 0; }); }
  function shVal(c, o) { try { return c.v(o); } catch (e) { return ''; } }
  function shFmt(c, v) { if (v == null || v === '') return ''; if (c.date && typeof v === 'number') { var d = new Date(Math.round((v - 25569) * 864e5)); return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear(); } if (c.num && typeof v === 'number') return nf(v); return String(v); }
  function shLinhas() {
    if (ESCF.id) ESCF.set = membrosEsc(ESCF.id);
    var F = ESCF.id ? (ACV.recs || []).filter(function (o) { return ESCF.set.has(dig(o.p)); }) : acvFiltered(), cols = SH_COLS, f = SHX.f;
    var ks = Object.keys(f).filter(function (k) { return f[k]; });
    var L = ks.length ? F.filter(function (o) { return ks.every(function (k) { var c = cols.find(function (x) { return x.k === k; }); if (!c) return true; var v = shFmt(c, shVal(c, o)); return c.sel ? v === f[k] : acsCanon(v).indexOf(acsCanon(f[k])) >= 0; }); }) : F.slice();
    if (SHX.sort.k) { var c = cols.find(function (x) { return x.k === SHX.sort.k; }), d = SHX.sort.d; if (c) L.sort(function (a, b) { var x = shVal(c, a), y = shVal(c, b); if (x == null || x === '') return 1; if (y == null || y === '') return -1; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR', { numeric: true })) * d; }); }
    return L;
  }
  function planilha() {
    var w = mw(), md = w && w.document, c = comp(); if (!md || !c || !ACV.recs || typeof SH_COLS === 'undefined') return;
    var sp = md.querySelector('.central-search-panel'), grade = sp && sp.parentElement; if (!grade) return;
    var on = (c.state || {}).view === 'sheet' && !ESC.dlg;
    md.body.classList.toggle('cmt-sheet-on', on);
    var box = md.getElementById('cmt-sheet');
    if (!on) { if (box) box.hidden = true; return; }
    cssMotor('cmt-sheet-css', CSS_SHEET);
    if (!box) { box = md.createElement('section'); box.id = 'cmt-sheet'; box.addEventListener('click', cliqueSheet); box.addEventListener('input', filtroSheet); box.addEventListener('change', filtroSheet);
      box.addEventListener('scroll', function () { if (box.scrollTop + box.clientHeight > box.scrollHeight - 300) maisSheet(box); }, { passive: true }); }
    if (box.parentElement !== grade) grade.appendChild(box);
    box.hidden = false; shCols();
    var fm = ACV.st.f.motor, sig = GERACAO + '|' + (fm ? fm.size + ':' + fm.values().next().value : '-') + '|' + Array.from(ACS.hide).sort().join(',') + '|' + (ACV.st.f.cam || '') + '|' + JSON.stringify(SHX.f) + '|' + ESCF.id + (ESCF.set ? ESCF.set.size : '') + '|' + SHX.sort.k + SHX.sort.d + '|' + SHX.cols.join(',');
    if (box.__sig === sig) return; box.__sig = sig;
    var foco = md.activeElement && box.contains(md.activeElement) && md.activeElement.dataset.shf ? [md.activeElement.dataset.shf, md.activeElement.selectionStart] : null;
    var cols = shCols(), L = shLinhas(); box.__L = L; box.__lim = SHX.lim;
    var nF = Object.keys(SHX.f).filter(function (k) { return SHX.f[k]; }).length;
    box.innerHTML = '<div class="sh-bar"><b>Planilha</b>' + (ESCF.id ? '<span class="sh-esc" style="--ec:' + esc(ESCF.cor || '#2f6690') + '">Escaninho · ' + esc(ESCF.titulo) + '<button type="button" data-sh="escx" title="Voltar ao resultado da busca">✕</button></span>' : '') + '<span>' + nf(L.length) + ' processo(s)' + (nF ? ' · ' + nF + ' filtro(s) de coluna' : '') + '</span>' +
      '<details class="sh-cols"><summary>Colunas ▾</summary><div>' + SH_COLS.map(function (x) { return '<label><input type="checkbox" data-shc="' + x.k + '"' + (SHX.cols.indexOf(x.k) >= 0 ? ' checked' : '') + '> ' + esc(x.t) + '</label>'; }).join('') + '</div></details>' +
      '<button type="button" data-sh="limpar"' + (nF ? '' : ' disabled') + '>Limpar filtros da planilha</button><button type="button" data-sh="full">' + (md.body.classList.contains('cmt-shfull') ? 'Sair da tela cheia' : 'Tela cheia') + '</button><button type="button" class="pri" data-sh="csv">Exportar .csv</button></div>' +
      '<div class="sh-wrap"><table class="sh-t"><thead><tr>' + cols.map(function (x) { var s = SHX.sort.k === x.k ? (SHX.sort.d > 0 ? ' ▲' : ' ▼') : ''; return '<th style="min-width:' + Math.max(x.w || 100, x.sel ? 100 : 0) + 'px" data-shs="' + x.k + '" title="Ordenar">' + esc(x.t) + s + '</th>'; }).join('') + '</tr><tr class="sh-f">' +
      cols.map(function (x) { var v = SHX.f[x.k] || ''; if (x.sel) { var ops = []; try { ops = x.sel(); } catch (e) {} return '<th><select data-shf="' + x.k + '"><option value="">todas</option>' + ops.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></th>'; }
        return '<th><input data-shf="' + x.k + '" value="' + esc(v) + '" placeholder="filtrar…"></th>'; }).join('') + '</tr></thead><tbody>' + linhasSheet(L.slice(0, SHX.lim), cols) + '</tbody></table>' +
      (L.length > SHX.lim ? '<button type="button" class="sh-mais" data-sh="mais">carregar mais (' + nf(SHX.lim) + ' de ' + nf(L.length) + ')</button>' : '') + (L.length ? '' : '<p class="sh-v">Nenhum processo com esses filtros.</p>') + '</div>';
    if (foco) { var i = box.querySelector('[data-shf="' + foco[0] + '"]'); if (i) { i.focus(); try { i.setSelectionRange(foco[1], foco[1]); } catch (e) {} } }
    md.body.classList.toggle('cmt-shtri', SHT.on);
    if (SHT.on && SHT.cur) { var tr0 = box.querySelector('tbody tr[data-p="' + SHT.cur.replace(/"/g, '') + '"]'); if (tr0) abrirLinha(tr0, true); }
  }
  /* =================== Modo triagem dentro da planilha: o prontuário ocupa o lugar da linha clicada =================== */
  var SHT = { on: false, cur: '' }, LS_TRI = 'pr_triados';
  /* triados: gravados no operacional (triagem."Triado em"); o que estava só neste navegador migra para as linhas e sobe na próxima gravação */
  var TRI_MIG = false, triT = null;
  function triados() { var c = comp(), T = {}; if (!c) return T;
    if (!TRI_MIG && c.rows && c.rows.length) { TRI_MIG = true; var LS = {}; try { LS = JSON.parse(localStorage.getItem(LS_TRI) || '{}'); } catch (e) {}
      var ks = Object.keys(LS); if (ks.length) { var by = {}; c.rows.forEach(function (r) { by[dig(r.processo || r.Processo)] = r; }); var n = 0;
        ks.forEach(function (p) { var r = by[dig(p)]; if (r && !r['Triado em']) { r['Triado em'] = String(LS[p]).slice(0, 10); n++; } });
        if (n) { aviso(nf(n) + ' processo(s) marcados como triados neste navegador passam para o operacional na próxima gravação.'); agendarGravacao(); } } }
    c.rows.forEach(function (r) { if (r['Triado em']) T[dig(r.processo || r.Processo)] = r['Triado em']; }); return T; }
  function agendarGravacao() { clearTimeout(triT); triT = setTimeout(function () { gravarTriagem(true); }, 6000); }
  function gravarTriagem(auto) { var w2 = mw(), c2 = comp(); if (!w2 || !w2.CMTOperacional || !c2) { if (!auto) aviso('Gravação indisponível: motor não carregado.'); return; }
    var tem = false; try { tem = !!(w2.ProcsMuta && w2.ProcsMuta.atual); } catch (e) {} if (!tem) { if (!auto) aviso('Conecte o procs-muta (Base) para gravar a triagem.'); return; }
    if (!auto) aviso('Gravando a triagem…');
    w2.CMTOperacional.gravar(c2.rows).then(function (r) { aviso(r.mud ? 'Triagem gravada no procs-muta: ' + nf(r.mud) + ' processo(s) no operacional.' : (auto ? '' : 'Nada a gravar: o operacional já está igual.')); try { localStorage.removeItem(LS_TRI); } catch (e) {} })
      .catch(function (er) { aviso('Falha ao gravar a triagem: ' + (er && er.message || er)); }); }
  var PR_MAP = { 'Publicação': 'Tempest - Publicação', 'Protocolo': 'Tempest - Protocolo', 'Prazo': 'Tempest - Prazo legal', 'Contagem': 'Tempest - Dobro', 'Preparo': 'Preparo',
    'Representação': 'Representação', 'ID da procuração': 'ID da Procuração', 'Contrarrazões': 'Contrarrazões - Situação', 'Mídias': 'Mídias', 'Impedimento / suspeição': 'Impedimento / Suspeição',
    'Magistrado': 'Observação do Impedimento', 'Nível': 'Urgência - Nível', 'Medida': 'Urgência', 'Apreciação': 'Urgência - Apreciação', 'Motivo': 'Urgência - Observação', 'Parecer': 'MPF',
    'Custos legis': 'MPF - Custos Legis', 'Tipo de julgamento': 'Tipo de Julgamento', 'Complexidade': 'Dificuldade', 'Destino': 'Destino', 'Pendências': 'O que falta sanar' };
  function triagemPlanilha(on) {
    var w = mw(), md = w && w.document, c = comp(); if (!md || !c) return;
    SHT.on = !!on; if (!on) fecharLinha(md);
    md.body.classList.toggle('cmt-shtri', SHT.on);
    if (on) { if ((c.state || {}).view !== 'sheet') try { c.setState({ view: 'sheet' }); } catch (e) {}
      setTimeout(function () { planilha(); var b = md.getElementById('cmt-sheet'); if (b) b.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
      aviso('Modo triagem: clique numa linha da planilha para abrir o prontuário no lugar dela · ↑ ↓ trocam de processo · Enter marca triado · Esc fecha.'); }
  }
  function cssProntMotor(md) {
    if (md.getElementById('pr-css-m')) return; var src = D.getElementById('pr-css'); if (!src) return;
    var st = md.createElement('style'); st.id = 'pr-css-m'; st.textContent = src.textContent; md.head.appendChild(st);
    var sq = md.createElement('style'); sq.id = 'shq-css'; sq.textContent = CSS_Q; md.head.appendChild(sq);
    var lk = md.createElement('link'); lk.rel = 'stylesheet'; lk.href = 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap'; md.head.appendChild(lk);
  }
  function linhaMotor(p) { var c = comp(); return c ? c.rows.find(function (r) { return dig(r.processo || r.Processo) === dig(p); }) : null; }
  function campoPr(box, lab) { var sp = [].slice.call(box.querySelectorAll('label.f > span')).find(function (x) { return x.textContent.trim().indexOf(lab) === 0; }); return sp ? sp.parentElement.querySelector('input,select,textarea') : null; }
  function ligarCampos(box, r) {
    if (!r) return;
    var put = function (el, v) { if (!el || v == null || v === '') return; v = Array.isArray(v) ? v.join('; ') : String(v);
      if (el.tagName === 'SELECT') { var nz = function (x) { return String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }, hit = [].find.call(el.options, function (o) { return nz(o.value) === nz(v) || nz(o.textContent) === nz(v); }); if (hit) v = hit.value; }
      if (el.tagName === 'SELECT' && ![].some.call(el.options, function (o) { return o.value === v; })) { var op = el.ownerDocument.createElement('option'); op.value = op.textContent = v; el.appendChild(op); }
      el.value = v; };
    Object.keys(PR_MAP).forEach(function (lab) { var el = campoPr(box, lab); if (!el) return; if (/Publica|Protocolo/.test(lab)) { el.type = 'date'; var v0 = String(r[PR_MAP[lab]] || ''), m = v0.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); put(el, m ? m[3] + '-' + m[2] + '-' + m[1] : v0); } else put(el, r[PR_MAP[lab]]);
      el.dataset.prk = PR_MAP[lab]; });
    var chk = function (txt, k) { var lb = [].slice.call(box.querySelectorAll('label')).find(function (x) { return x.querySelector('input[type=checkbox]') && x.textContent.trim().indexOf(txt) === 0; }); if (!lb) return; var cb = lb.querySelector('input'); cb.dataset.prk = k; if (r[k] && !/^(n[aã]o|false|0)$/i.test(String(r[k]))) cb.checked = true; };
    chk('DPU', 'DPU (controle)'); chk('AJG', 'AJG'); chk('Lançar no painel', 'Urgência - Painel');
    var hips = String(r['Hipóteses Monocrática'] || '').split(/;\s*/).filter(Boolean);
    box.querySelectorAll('.hip').forEach(function (h) { var cb = h.querySelector('input'), nm = (h.querySelector('b') || {}).textContent || ''; cb.dataset.prhip = nm; if (hips.indexOf(nm) >= 0) cb.checked = true; });
    var sint = box.querySelector('textarea[placeholder^="Pedido, sentença"]'); if (sint) { sint.dataset.prk = 'Síntese Processual'; put(sint, r['Síntese Processual']); }
    var grava = function (e) { var el = e.target; if (el.dataset.prhip != null) { r['Hipóteses Monocrática'] = [].slice.call(box.querySelectorAll('[data-prhip]')).filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.prhip; }).join('; '); return; }
      var k = el.dataset.prk; if (!k) return; r[k] = el.type === 'checkbox' ? (el.checked ? 'Sim' : '') : el.value; };
    box.addEventListener('change', grava); box.addEventListener('input', grava);
  }
  /* =================== Ficha rápida: responder a triagem em uma tela, sem rolar =================== */
  var LS_PRM = 'pr_modo';
  function modoPr() { try { return localStorage.getItem(LS_PRM) || 'rapido'; } catch (e) { return 'rapido'; } }
  var CURTO = { 'Em dobro · Fazenda ou MP': 'Dobro · Faz/MP', 'Em dobro · Defensoria': 'Dobro · DPU', 'Em dobro · litisconsortes': 'Dobro · litis.', 'Dispensado · isenção legal': 'Isento', 'Dispensado · AJG': 'AJG',
    'Não recolhido': 'Não recolhido', 'Não verificado': 'Não verif.', 'Não apresentadas': 'Não apres.', 'Prazo em curso': 'Em curso', 'Não intimado': 'Não intim.', 'Não se aplica': 'N/A',
    'Urgentíssima (mesmo dia)': 'Hoje', 'Urgente (24 h)': '24 h', 'Prioritária (48 h)': '48 h', 'Ordinária (5 dias)': '5 dias', 'Aguardando parecer': 'Aguardando', 'Com parecer': 'Com parecer', 'Sem parecer': 'Sem',
    '½ · Serial (0,5)': '½ Serial', 'Ω · Padrão (1)': 'Ω Padrão', 'A · Intermediário (2)': 'A Interm.', 'Σ · Complexo (3)': 'Σ Complexo', 'Sessão de julgamento': 'Sessão', 'Decisão monocrática': 'Monocrática', 'Outro encaminhamento': 'Outro', '5 dias (embargos)': '5 (ED)', '15 dias': '15', '30 dias': '30' };
  var QG = [
    { t: 'Admissibilidade', c: '#2b698e', f: [['Publicação', 'd'], ['Protocolo', 'd'], ['Prazo', 'c'], ['Contagem', 'c'], ['Preparo', 'c'], ['#tmp'], ['#chk', 'DPU', 'AJG']] },
    { t: 'Partes e instrução', c: '#1a7f5a', f: [['Representação', 'c'], ['ID da procuração', 't'], ['Contrarrazões', 'c'], ['Mídias', 'c'], ['Impedimento / suspeição', 'c'], ['Magistrado', 't', 'imp']] },
    { t: 'Urgência e MPF', c: '#a33b4a', f: [['Nível', 'c'], ['Medida', 's', 'urg'], ['Apreciação', 's', 'urg'], ['Motivo', 't', 'urg'], ['#chk', 'Lançar no painel'], ['Parecer', 'c'], ['Custos legis', 's']] },
    { t: 'Julgamento', c: '#6a4fb3', f: [['Tipo de julgamento', 's'], ['Complexidade', 'c'], ['Destino', 'c'], ['#hip'], ['Pendências', 't']] }
  ];
  function montarRapido(q, host, o) {
    var md = q.ownerDocument, ctl = function (lab) { return campoPr(host, lab); };
    var cb = function (txt) { var lb = [].slice.call(host.querySelectorAll('label')).find(function (x) { return x.querySelector('input[type=checkbox]') && x.textContent.trim().indexOf(txt) === 0; }); return lb && lb.querySelector('input'); };
    var tk = (o.tks || [])[0] || {};
    var h = '<div class="q-hd"><div class="q-id"><b>' + esc(o.p) + '</b><span>' + esc(o.classe || '') + '</span>' + (o.pri ? '<i class="q-pri">Prioridade</i>' : '') + '</div><div class="q-as">' + esc(o.assunto || '') + '</div>' +
      '<div class="q-pt">' + esc((o.ativo || '') + (o.passivo ? ' × ' + o.passivo : '')) + '</div><div class="q-tk">' + esc(tk.t || '') + '</div></div><div class="q-g">';
    QG.forEach(function (g, gi) {
      h += '<section class="q-c" style="--qc:' + g.c + '"><h5>' + g.t + '</h5>';
      g.f.forEach(function (f, fi) {
        var id = gi + '-' + fi;
        if (f[0] === '#tmp') { h += '<div class="q-r q-tmp" data-q="tmp"><span>Tempestividade</span><b>—</b></div>'; return; }
        if (f[0] === '#chk') { h += '<div class="q-r"><span>Marcar</span><div class="q-ch">' + f.slice(1).map(function (t) { return '<button type="button" data-qcb="' + esc(t) + '">' + esc(t === 'Lançar no painel' ? 'Painel de urgências' : t) + '</button>'; }).join('') + '</div></div>'; return; }
        if (f[0] === '#hip') { var hs = [].slice.call(host.querySelectorAll('.hip')); if (hs.length) h += '<div class="q-r q-hips"><span>Hipóteses de monocrática</span><div class="q-ch">' + hs.map(function (x, k) { return '<button type="button" data-qhip="' + k + '">' + esc((x.querySelector('b') || {}).textContent || '') + '</button>'; }).join('') + '</div></div>'; return; }
        var el = ctl(f[0]); if (!el) return;
        h += '<div class="q-r' + (f[2] ? ' q-dep q-' + f[2] : '') + '"><span>' + esc(f[0] === 'Impedimento / suspeição' ? 'Impedimento' : f[0]) + '</span>';
        if (f[1] === 'c' && el.tagName === 'SELECT') h += '<div class="q-ch">' + [].slice.call(el.options).filter(function (op) { return op.value && op.value !== '—'; }).map(function (op) { return '<button type="button" data-qf="' + esc(f[0]) + '" data-qv="' + esc(op.value) + '" title="' + esc(op.textContent) + '">' + esc(CURTO[op.textContent] || op.textContent) + '</button>'; }).join('') + '</div>';
        else if (el.tagName === 'SELECT') h += '<select data-qf="' + esc(f[0]) + '">' + [].slice.call(el.options).map(function (op) { return '<option value="' + esc(op.value) + '">' + esc(op.textContent) + '</option>'; }).join('') + '</select>';
        else h += '<input data-qf="' + esc(f[0]) + '"' + (f[1] === 'd' ? ' type="date"' : ' type="text" placeholder="' + esc(el.placeholder || '') + '"') + '>';
        h += '</div>';
      });
      h += '</section>';
    });
    h += '</div>';
    q.innerHTML = h;
    function sync() {
      q.querySelectorAll('[data-qf]').forEach(function (x) { var el = ctl(x.dataset.qf); if (!el) return;
        if (x.tagName === 'BUTTON') x.classList.toggle('on', el.value === x.dataset.qv); else if (x !== md.activeElement) x.value = el.value; });
      q.querySelectorAll('[data-qcb]').forEach(function (x) { var c = cb(x.dataset.qcb); x.classList.toggle('on', !!(c && c.checked)); });
      var hs = host.querySelectorAll('.hip input'); q.querySelectorAll('[data-qhip]').forEach(function (x) { var c = hs[+x.dataset.qhip]; x.classList.toggle('on', !!(c && c.checked)); });
      var t = host.querySelector('.pr-tmp'), tb = q.querySelector('[data-q="tmp"] b'); if (t && tb) { tb.textContent = t.textContent; tb.className = /Intemp/.test(t.textContent) ? 'm' : /Tempest/.test(t.textContent) ? 'ok' : ''; var lim = host.querySelector('.pr-lim'); tb.title = lim ? 'Prazo final: ' + lim.textContent : ''; }
      var imp = ctl('Impedimento / suspeição'); q.classList.toggle('q-imp-on', !!(imp && imp.value && !/^Nenhum$/.test(imp.value)));
      var nv = ctl('Nível'); q.classList.toggle('q-urg-on', !!(nv && nv.value && nv.value !== '—'));
      var n = 0; q.querySelectorAll('.q-ch button.on,select[data-qf],input[data-qf]').forEach(function (x) { if (x.tagName === 'BUTTON' || (x.value && x.value !== '—')) n++; }); q.dataset.n = n;
    }
    function dispara(el, tipo) { el.dispatchEvent(new (el.ownerDocument.defaultView.Event)(tipo, { bubbles: true })); }
    q.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; e.preventDefault(); e.stopPropagation();
      if (b.dataset.qf) { var el = ctl(b.dataset.qf); if (!el) return; el.value = el.value === b.dataset.qv ? (el.options[0] ? el.options[0].value : '') : b.dataset.qv; dispara(el, 'change'); }
      else if (b.dataset.qcb) { var c = cb(b.dataset.qcb); if (!c) return; c.checked = !c.checked; dispara(c, 'change'); }
      else if (b.dataset.qhip != null) { var hc = host.querySelectorAll('.hip input')[+b.dataset.qhip]; if (!hc) return; hc.checked = !hc.checked; dispara(hc, 'change'); }
      sync();
    });
    var mexe = function (e) { var x = e.target; if (!x.dataset || !x.dataset.qf || x.tagName === 'BUTTON') return; var el = ctl(x.dataset.qf); if (!el) return; el.value = x.value; dispara(el, e.type); sync(); };
    q.addEventListener('input', mexe); q.addEventListener('change', mexe);
    sync(); q.__sync = sync;
  }
  var CSS_Q =
    '.sh-pr .sh-modo{display:inline-flex;border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:2px;margin-left:6px}.sh-pr .sh-modo button{border:0!important;background:transparent!important;color:#cfd9e3!important;border-radius:999px!important;padding:4px 11px!important;font:800 12px Figtree,sans-serif!important;box-shadow:none!important}.sh-pr .sh-modo button.on{background:#fff!important;color:#14263c!important}' +
    '#cmt-sheet .sh-pr .sh-prwrap{position:sticky;left:10px;box-sizing:border-box;width:var(--shw);max-width:var(--shw);display:grid;grid-template-columns:168px minmax(0,1fr);align-items:stretch;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px -14px rgba(15,31,46,.45);background:#fff}#cmt-sheet .sh-pr .sh-prmain{min-width:0}#cmt-sheet .sh-pr .sh-prhost{position:static!important;max-width:none!important}' +
'#cmt-sheet .sh-pr .sh-prbar{display:flex!important;align-items:center;gap:6px!important;flex-wrap:wrap;margin:0!important;padding:8px 10px 8px 14px!important;border-radius:14px 14px 0 0!important;background:#0f1f2e!important;border-bottom:1px solid rgba(255,255,255,.08);box-shadow:none!important;font:600 12px Figtree,system-ui,sans-serif!important}' +
    '#cmt-sheet .sh-pr .sh-q{margin-top:0!important;border-top:0!important;border-radius:0 0 14px 14px!important}#cmt-sheet .sh-pr .sh-prhost .pr-cnt article{border-top-left-radius:0!important;border-top-right-radius:0!important}' +
    '#cmt-sheet .sh-pr .sh-pos{display:flex;align-items:center;gap:8px;margin-right:6px;padding-right:12px;border-right:1px solid rgba(255,255,255,.14)}#cmt-sheet .sh-pr .sh-pos>b{font:800 15px Figtree,sans-serif;color:#fff}#cmt-sheet .sh-pr .sh-pos>b small{font-size:11.5px;font-weight:600;color:#9fb0c0}' +
    '#cmt-sheet .sh-pr .sh-pos>span{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9fb0c0;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:2px 8px}#cmt-sheet .sh-pr .sh-pos>span.ok{color:#0f1f2e;background:#4fd1a5;border-color:#4fd1a5}' +
    '#cmt-sheet .sh-pr .sh-prog{display:block;width:90px;height:4px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden}#cmt-sheet .sh-pr .sh-prog em{display:block;height:100%;background:linear-gradient(90deg,#4fd1a5,#e6c27a)}#cmt-sheet .sh-pr .sh-pc{color:#9fb0c0;font-size:11px}' +
    '#cmt-sheet .sh-pr .sh-prbar>button{height:30px;border:1px solid rgba(255,255,255,.22)!important;background:rgba(255,255,255,.04)!important;color:#e7edf3!important;border-radius:8px!important;padding:0 11px!important;font:700 12px Figtree,sans-serif!important;cursor:pointer;box-shadow:none!important}#cmt-sheet .sh-pr .sh-prbar>button:hover{border-color:#e6c27a!important;color:#fff!important}' +
    '#cmt-sheet .sh-pr .sh-prbar>button[data-shtri=ant],#cmt-sheet .sh-pr .sh-prbar>button[data-shtri=prox]{width:30px;padding:0!important;font-size:15px!important}' +
    '#cmt-sheet .sh-pr .sh-prbar>button.pri{background:#e6c27a!important;border-color:#e6c27a!important;color:#14263c!important;font-weight:800!important;padding:0 14px!important}#cmt-sheet .sh-pr .sh-prbar>button.pri:hover{background:#f0cf8a!important}' +
    '#cmt-sheet .sh-pr .sh-prbar>button[data-shtri=x]{order:9}#cmt-sheet .sh-pr .sh-modo{order:5;margin-left:auto!important}#cmt-sheet .sh-pr .sh-prbar .k{order:8;margin:0 4px 0 10px!important;color:#9fb0c0!important;font-size:11px!important}#cmt-sheet .sh-pr .k kbd{font:700 10px "JetBrains Mono",monospace;color:#e7edf3;border:1px solid rgba(255,255,255,.25);border-bottom-width:2px;border-radius:4px;padding:0 4px;margin:0 2px 0 4px}' +
    '#cmt-sheet .sh-pr .sh-q .q-hd{background:#1b3553}' +
    /* faixa lateral vertical */
    '#cmt-sheet .sh-pr .sh-prbar{flex-direction:column!important;flex-wrap:nowrap!important;align-items:stretch!important;gap:7px!important;padding:14px 12px!important;border-radius:0!important;border-bottom:0!important;border-right:3px solid #c4953c;max-width:none!important;position:static!important}' +
    '#cmt-sheet .sh-pr .sh-pos{flex-direction:column;align-items:flex-start!important;gap:6px!important;margin:0 0 6px!important;padding:0 0 10px!important;border-right:0!important;border-bottom:1px solid rgba(255,255,255,.12)}#cmt-sheet .sh-pr .sh-pos>b{font-size:20px!important;line-height:1}#cmt-sheet .sh-pr .sh-pos>b small{display:block;margin-top:2px}#cmt-sheet .sh-pr .sh-prog{width:100%!important}' +
    '#cmt-sheet .sh-pr .sh-prbar .sh-nav{order:0}#cmt-sheet .sh-pr .sh-nav button{flex:1;height:30px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.04);color:#e7edf3;border-radius:8px;font:800 16px Figtree,sans-serif;cursor:pointer}#cmt-sheet .sh-pr .sh-nav button:hover{border-color:#e6c27a}' +
    '#cmt-sheet .sh-pr .sh-prbar>button{width:100%;justify-content:center;text-align:center}#cmt-sheet .sh-pr .sh-prbar>button.pri{order:1;height:38px!important}' +
    '#cmt-sheet .sh-pr .sh-prbar>button[data-shtri=ant],#cmt-sheet .sh-pr .sh-prbar>button[data-shtri=prox]{order:0;width:calc(50% - 4px)!important;display:inline-block}#cmt-sheet .sh-pr .sh-prbar .sh-nav{display:flex;gap:7px}' +
    '#cmt-sheet .sh-pr .sh-prbar>button[data-shtri=grava]{order:2}#cmt-sheet .sh-pr .sh-modo{order:3;margin:4px 0 0!important;display:flex!important;width:100%;box-sizing:border-box}#cmt-sheet .sh-pr .sh-modo button{flex:1;padding:4px 6px!important;font-size:11.5px!important}' +
    '#cmt-sheet .sh-pr .sh-prbar>button[data-shtri=x]{order:4;margin-top:auto}#cmt-sheet .sh-pr .sh-prbar .k{order:5;margin:6px 0 0!important;line-height:2;display:block}' +
    '.sh-pr.m-rapido .sh-prhost{display:none}.sh-pr.m-full .sh-q{display:none}' +
    '.sh-q{font-family:Figtree,system-ui,sans-serif;color:#14263c;background:#fff;border:1px solid #d9dfe5;border-radius:14px;overflow:hidden;margin:6px 0 4px;box-shadow:0 8px 24px -14px rgba(15,31,46,.35)}' +
    '.sh-q .q-hd{display:grid;grid-template-columns:auto minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr);gap:4px 18px;align-items:center;padding:10px 16px;background:#1b3553;color:#fff;border-bottom:3px solid #c4953c}' +
    '.sh-q .q-id b{display:block;font:800 15px "JetBrains Mono",ui-monospace,monospace;letter-spacing:-.01em}.sh-q .q-id span{font-size:10.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#e6c27a}.sh-q .q-pri{font-style:normal;margin-left:6px;font-size:10px;font-weight:800;background:#e6c27a;color:#14263c;border-radius:4px;padding:1px 5px}' +
    '.sh-q .q-as{font-weight:700;font-size:13px;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.sh-q .q-pt,.sh-q .q-tk{font-size:12px;color:#c4d0dc;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.sh-q .q-tk{color:#f1dfb5}' +
    '.sh-q .q-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:0}' +
    '.sh-q .q-c{padding:10px 14px 12px;border-right:1px solid #eceff2;border-top:3px solid var(--qc);min-width:0}.sh-q .q-c:last-child{border-right:0}.sh-q h5{margin:0 0 8px;font:800 10.5px Figtree,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--qc)}' +
    '.sh-q .q-r{display:grid;grid-template-columns:84px minmax(0,1fr);gap:6px;align-items:center;margin:0 0 6px}.sh-q .q-r>span{font-size:11.5px;font-weight:700;color:#5d6b78;line-height:1.2}' +
    '.sh-q .q-ch{display:flex;flex-wrap:wrap;gap:4px}.sh-q .q-ch button{border:1px solid #d6dde4;background:#f7f9fb;color:#33475a;border-radius:7px;padding:3px 8px;font:700 11.5px Figtree,sans-serif;cursor:pointer;line-height:1.35}.sh-q .q-ch button:hover{border-color:var(--qc)}' +
    '.sh-q .q-ch button.on{background:var(--qc);border-color:var(--qc);color:#fff}' +
    '.sh-q select,.sh-q input{width:100%;min-width:0;box-sizing:border-box;border:1px solid #d6dde4;border-radius:7px;padding:4px 7px;font:600 12px Figtree,sans-serif;color:#14263c;background:#fbfcfd}.sh-q select:focus,.sh-q input:focus{outline:2px solid var(--qc);outline-offset:-1px}' +
    '.sh-q .q-tmp b{font-size:12.5px}.sh-q .q-tmp b.ok{color:#1a7f5a}.sh-q .q-tmp b.m{color:#a8322a}' +
    '.sh-q .q-hips{grid-template-columns:1fr}.sh-q .q-hips>span{margin-bottom:2px}' +
    '.sh-q .q-dep{display:none}.sh-q.q-imp-on .q-imp,.sh-q.q-urg-on .q-urg{display:grid}';
  function fecharLinha(md) { if (!md) return; md.querySelectorAll('#cmt-sheet .sh-pr').forEach(function (x) { x.remove(); }); md.querySelectorAll('#cmt-sheet tr.sh-hide').forEach(function (x) { x.classList.remove('sh-hide'); }); }
  function abrirLinha(tr, quieto) {
    var md = tr.ownerDocument, p = tr.dataset.p, box = md.getElementById('cmt-sheet'); if (!p || !box) return;
    fecharLinha(md); cssProntMotor(md); SHT.cur = p;
    var o = (ACV.recs || []).find(function (x) { return x.p === p; }) || { p: p }, r = linhaMotor(p);
    var L = box.__L || [], pos = L.findIndex(function (x) { return x.p === p; }), T = triados();
    var row = md.createElement('tr'); row.className = 'sh-pr';
    var nT = 0; L.forEach(function (x) { if (T[dig(x.p)]) nT++; });
    row.innerHTML = '<td colspan="' + tr.children.length + '"><div class="sh-prwrap"><div class="sh-prbar"><div class="sh-pos"><b>' + (pos >= 0 ? nf(pos + 1) + '<small> de ' + nf(L.length) + '</small>' : '') + '</b><span class="' + (T[dig(p)] ? 'ok' : '') + '">' + (T[dig(p)] ? '✓ triado' : 'a triar') + '</span><i class="sh-prog" title="' + nf(nT) + ' de ' + nf(L.length) + ' triados nesta lista"><em style="width:' + (L.length ? Math.max(1, Math.round(nT / L.length * 100)) : 0) + '%"></em></i><small class="sh-pc">' + nf(nT) + ' triados</small></div>' +
      '<div class="sh-nav"><button type="button" data-shtri="ant" title="Processo anterior (↑)">‹</button><button type="button" data-shtri="prox" title="Próximo processo (↓)">›</button></div>' +
      '<button type="button" class="pri" data-shtri="ok" title="Marcar triado e ir ao próximo (Enter)">' + (T[dig(p)] ? 'Triado ✓ · próximo' : 'Marcar triado') + '</button>' +
      '<button type="button" data-shtri="grava" title="Gravar a triagem no procs-muta">⇪ Gravar triagem</button><button type="button" data-shtri="x" title="Fechar o prontuário (Esc)">Fechar ✕</button>' +
      '<span class="sh-modo"><button type="button" data-shtri="m-rapido" class="' + (modoPr() === 'rapido' ? 'on' : '') + '" title="Ficha rápida: responder em uma tela">Rápido</button><button type="button" data-shtri="m-full" class="' + (modoPr() === 'full' ? 'on' : '') + '" title="Prontuário completo">Completo</button></span>' +
      '<span class="k"><kbd>↑</kbd><kbd>↓</kbd> processo <kbd>Enter</kbd> triado <kbd>Esc</kbd> fecha</span></div><div class="sh-prmain"><div class="sh-q"></div><div class="sh-prhost"></div></div></div></td>';
    row.classList.add(modoPr() === 'full' ? 'm-full' : 'm-rapido');
    var wr = box.querySelector('.sh-wrap') || box; row.style.setProperty('--shw', Math.max(600, wr.clientWidth - 22) + 'px');
    tr.after(row); tr.classList.add('sh-hide');
    var host = row.querySelector('.sh-prhost');
    try { var t0 = (o.tks || [])[0] || {}; W.CMTProntuario.montar(host, { p: o.p, classe: o.classe, assunto: o.assunto, ativo: o.ativo, passivo: o.passivo, tks: o.tks || [], etq: o.etq || [], pri: o.pri }); } catch (e) { host.textContent = 'Prontuário indisponível: ' + (e && e.message || e); }
    ligarCampos(host, r);
    try { montarRapido(row.querySelector('.sh-q'), host, o); } catch (e) { console.warn('[Ficha rápida]', e); }
    var th = box.querySelector('thead'); box.scrollTop = Math.max(0, row.offsetTop - (th ? th.offsetHeight : 0) - 4);
    if (!quieto) { var bt = box.getBoundingClientRect().top; if (bt < 0 || bt > 200) box.scrollIntoView({ block: 'start' }); }
  }
  function irLinha(n) { var md = mw() && mw().document; if (!md) return; var rows = [].slice.call(md.querySelectorAll('#cmt-sheet tbody tr[data-p]')), i = rows.findIndex(function (x) { return x.dataset.p === SHT.cur; }); var nx = rows[i + n]; if (nx) abrirLinha(nx); else if (n > 0) { var box = md.getElementById('cmt-sheet'); maisSheet(box); var r2 = [].slice.call(md.querySelectorAll('#cmt-sheet tbody tr[data-p]')); if (r2[i + n]) abrirLinha(r2[i + n]); } }
  function acaoTri(a) {
    var md = mw() && mw().document;
    if (a === 'x') { fecharLinha(md); SHT.cur = ''; return; }
    if (a === 'm-rapido' || a === 'm-full') { var m = a.slice(2); try { localStorage.setItem(LS_PRM, m); } catch (e) {} var pr = md && md.querySelector('#cmt-sheet .sh-pr'); if (pr) { pr.classList.toggle('m-full', m === 'full'); pr.classList.toggle('m-rapido', m !== 'full'); pr.querySelectorAll('.sh-modo button').forEach(function (b) { b.classList.toggle('on', b.dataset.shtri === a); }); var qq = pr.querySelector('.sh-q'); if (qq && qq.__sync) qq.__sync(); } return; }
    if (a === 'ant') return irLinha(-1); if (a === 'prox') return irLinha(1);
    if (a === 'ok') { var r = linhaMotor(SHT.cur); if (r && !r['Triado em']) r['Triado em'] = new Date().toISOString().slice(0, 10); agendarGravacao();
      var tr = md && md.querySelector('#cmt-sheet tbody tr[data-p="' + SHT.cur + '"]'); if (tr) tr.classList.add('sh-tok'); return irLinha(1); }
    if (a === 'grava') { clearTimeout(triT); gravarTriagem(false); }
  }
  function tecladoTri(e) {
    if (!SHT.on || !SHT.cur) return; var t = e.target; if (t && t.closest && t.closest('input,select,textarea,[contenteditable]')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); irLinha(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); irLinha(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); acaoTri('ok'); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); acaoTri('x'); }
  }
  var LS_STM = 'cmt_stats_min';
  function painelStats() {
    var md = mw() && mw().document; if (!md) return; var st = md.querySelector('.central-stats-stack'); if (!st) return; var w0 = st.parentElement; if (!w0) return;
    if (!w0.classList.contains('cmt-stats')) w0.classList.add('cmt-stats');
    var h = w0.querySelector(':scope > .cmt-stats-h'), min = false; try { min = localStorage.getItem(LS_STM) !== '0'; } catch (e) { min = true; }
    if (!h) { h = md.createElement('div'); h.className = 'cmt-stats-h'; w0.insertBefore(h, w0.firstChild);
      h.addEventListener('click', function () { var m = !w0.classList.contains('min'); w0.classList.toggle('min', m); try { localStorage.setItem(LS_STM, m ? '1' : '0'); } catch (er) {} var bt = h.querySelector('button'); if (bt) bt.textContent = m ? 'Expandir ▴' : 'Recolher ▾'; if (!m) w0.scrollTop = 0; }); }
    w0.classList.toggle('min', min);
    var html = '<div><span class="ey">Painel</span><b>Estatísticas dos filtrados</b></div><small>assuntos, classes, tarefas, aptos, antiguidade e seção do resultado da busca</small><button type="button">' + (min ? 'Expandir ▴' : 'Recolher ▾') + '</button>';
    if (h.__h !== html) { h.innerHTML = html; h.__h = html; }
  }
  function linhasSheet(L, cols) {
    var TRI = triados(); return L.map(function (o) { return '<tr data-p="' + esc(o.p) + '"' + (TRI[dig(o.p)] ? ' class="sh-tok"' : '') + '>' + cols.map(function (x) { var v = shFmt(x, shVal(x, o));
      if (x.k === 'p') return '<td class="mono"><a href="#" data-shp="' + esc(o.p) + '" title="Abrir o cartão do processo">' + esc(o.p) + '</a>' + (o.pri ? ' <i class="pri" title="Prioridade">P</i>' : '') + '</td>';
      if (x.k === 'sit') { var sx = SIT_BY[o.sit] || {}; return '<td><span class="chip" style="--fc:' + cor(sx.c || '--muted') + '">' + esc(o.caminho ? 'A caminho' : v) + '</span></td>'; }
      return '<td' + (x.num ? ' class="num"' : '') + ' title="' + esc(v) + '">' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('');
  }
  function maisSheet(box) { if (!box.__L || box.__lim >= box.__L.length) return; var n = box.__lim; box.__lim += 300; SHX.lim = box.__lim; var tb = box.querySelector('tbody'); tb.insertAdjacentHTML('beforeend', linhasSheet(box.__L.slice(n, box.__lim), shCols())); var m = box.querySelector('.sh-mais'); if (m) { if (box.__lim >= box.__L.length) m.remove(); else m.textContent = 'carregar mais (' + nf(box.__lim) + ' de ' + nf(box.__L.length) + ')'; } }
  var shT;
  function filtroSheet(e) {
    var t = e.target;
    if (t.dataset.shc) { var k = t.dataset.shc; SHX.cols = SHX.cols.filter(function (x) { return x !== k; }); if (t.checked) SHX.cols = SH_COLS.map(function (c) { return c.k; }).filter(function (x) { return x === k || SHX.cols.indexOf(x) >= 0; }); try { localStorage.setItem(LS_SHC, JSON.stringify(SHX.cols)); } catch (er) {} SHX.lim = 200; planilha(); var d = t.ownerDocument.querySelector('#cmt-sheet .sh-cols'); if (d) d.open = true; return; }
    if (!t.dataset.shf) return; var k2 = t.dataset.shf, v = t.value;
    clearTimeout(shT); shT = setTimeout(function () { SHX.f[k2] = v; SHX.lim = 200; planilha(); }, t.tagName === 'SELECT' ? 0 : 250);
  }
  function cliqueSheet(e) {
    var t = e.target, md = t.ownerDocument;
    if (t.closest('.sh-pr')) { var bb = t.closest('[data-shtri]'); if (bb) { e.preventDefault(); acaoTri(bb.dataset.shtri); } return; }
    var p = t.closest('[data-shp]');
    if (SHT.on) { var tr = t.closest('tbody tr[data-p]'); if (tr && !t.closest('input,select,textarea')) { e.preventDefault(); abrirLinha(tr); return; } }
    if (p) { e.preventDefault(); try { if (W.CMTProntuario && W.CMTProntuario.abrir) W.CMTProntuario.abrir(p.dataset.shp, (md.getElementById('cmt-sheet').__L || []).map(function (o) { return o.p; })); else fichaNoLugar(p.dataset.shp); } catch (er) {} return; }
    var s = t.closest('[data-shs]'); if (s) { var k = s.dataset.shs; SHX.sort = SHX.sort.k === k ? { k: k, d: -SHX.sort.d } : { k: k, d: 1 }; planilha(); return; }
    var b = t.closest('[data-sh]'); if (!b) return; e.preventDefault(); var a = b.dataset.sh, box = md.getElementById('cmt-sheet');
    if (a === 'escx') { escNaPlanilha(''); return; }
    if (a === 'limpar') { SHX.f = {}; SHX.lim = 200; planilha(); }
    else if (a === 'mais') maisSheet(box);
    else if (a === 'full') telaCheia(md, !md.body.classList.contains('cmt-shfull'));
    else if (a === 'csv') { var cols = shCols(), q = function (v) { v = String(v == null ? '' : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      var csv = '﻿' + cols.map(function (x) { return q(x.t); }).join(';') + '\n' + box.__L.map(function (o) { return cols.map(function (x) { return q(shFmt(x, shVal(x, o))); }).join(';'); }).join('\n');
      var a2 = D.createElement('a'); a2.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a2.download = 'planilha-acervo-' + new Date().toISOString().slice(0, 10) + '.csv'; D.body.appendChild(a2); a2.click(); setTimeout(function () { URL.revokeObjectURL(a2.href); a2.remove(); }, 500); }
  }
  function telaCheia(md, on) { md.body.classList.toggle('cmt-shfull', on); D.body.classList.toggle('au-shfull', on); var box = md.getElementById('cmt-sheet'); if (box) { box.__sig = ''; planilha(); } }
  D.addEventListener('keydown', function (e) { var md = mw() && mw().document; if (e.key === 'Escape' && md && md.body.classList.contains('cmt-shfull')) telaCheia(md, false); });
  var CSS_SHEET =
    'body.cmt-sheet-on main>div:has(#cmt-sheet)~*{display:none!important}' +
    '.central-monthly-card{display:none!important}' +
    '#cmt-sheet .sh-esc{display:inline-flex;align-items:center;gap:6px;padding:3px 4px 3px 10px;border-radius:999px;background:#fff;border:1.5px solid var(--ec);color:#14263c;font:800 11.5px Figtree,sans-serif}#cmt-sheet .sh-esc button{border:0;background:var(--ec);color:#fff;border-radius:999px;width:20px;height:20px;cursor:pointer;font-size:10px;padding:0}' +
    '.cmt-stats{background:#fff;border:1px solid #e1e7ec!important;border-top:3px solid #6a4fb3!important;border-radius:18px;padding:12px 16px 14px!important;box-shadow:0 1px 3px rgba(20,38,60,.06)}' +
    '.cmt-stats>button[style*="translateX(-50%)"],.cmt-stats>div[style*="height: 1px"]{display:none!important}' +
    '.cmt-stats-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px;font-family:Figtree,system-ui,sans-serif}.cmt-stats-h .ey{display:block;font:800 10px Figtree,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#b8862b}.cmt-stats-h b{font:800 17px Figtree,sans-serif;color:#14263c}.cmt-stats-h small{color:#5d6b78;font-size:12px}' +
    '.cmt-stats-h button{margin-left:auto;border:1.5px solid #6a4fb3;color:#6a4fb3;background:#fff;border-radius:999px;font:800 10.5px Figtree,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:5px 12px;cursor:pointer}.cmt-stats-h button:hover{background:#6a4fb3;color:#fff}' +
    '.cmt-stats.min .central-stats-stack{display:none!important}.cmt-stats.min .cmt-stats-h{margin:0}' +
    /* rodapé que se expande para cima */
    '.cmt-stats{position:fixed!important;left:12px!important;right:12px!important;bottom:0!important;top:auto!important;z-index:45!important;margin:0!important;max-height:74vh;overflow:auto;border-radius:18px 18px 0 0!important;border-bottom:0!important;box-shadow:0 -14px 40px -12px rgba(15,31,46,.35)!important;transition:max-height .28s ease}' +
    '.cmt-stats-h button{font-size:0!important;width:30px;height:30px;padding:0!important;display:inline-grid!important;place-items:center}.cmt-stats-h button::before{content:"";width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(2px) rotate(-135deg)}.cmt-stats:not(.min) .cmt-stats-h button::before{transform:translateY(-2px) rotate(45deg)}' +
    '.cmt-stats.min{max-height:58px;overflow:hidden}.cmt-stats .cmt-stats-h{position:sticky;top:-12px;z-index:2;background:#fff;margin:-12px -16px 10px!important;padding:12px 16px 10px;cursor:pointer;border-radius:18px 18px 0 0}.cmt-stats.min .cmt-stats-h{margin:-12px -16px 0!important}' +
    'body:has(.cmt-stats) main{padding-bottom:84px!important}' +
    'body.cmt-shtri [data-cmt-pront]{background:#1b3553!important;color:#fff!important}body.cmt-shtri [data-cmt-plan]{background:transparent!important;color:#33506e!important}' +
    'body.cmt-shtri #cmt-sheet tbody tr[data-p]{cursor:pointer}body.cmt-shtri #cmt-sheet tbody tr[data-p]:hover td{background:#eef6fb!important}' +
    'body.cmt-shtri #cmt-sheet{max-height:calc(100vh - 80px)!important}#cmt-sheet tr.sh-tok td:first-child{box-shadow:inset 3px 0 #1a7f5a}#cmt-sheet tr.sh-hide{display:none}' +
    '#cmt-sheet tr.sh-pr>td{padding:10px 10px 14px!important;background:#eef2f5!important;white-space:normal!important;max-width:none!important;position:sticky;left:0}' +
    '#cmt-sheet .sh-prbar{position:sticky;left:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;padding:8px 12px;border-radius:12px;color:#fff;font:600 12.5px Figtree,system-ui,sans-serif;background:radial-gradient(420px 160px at 95% -40%,rgba(217,160,70,.35),transparent 70%),linear-gradient(135deg,#1b3553,#122840);max-width:calc(100vw - 340px)}' +
    '#cmt-sheet .sh-prbar b{font-size:14px;font-weight:800}#cmt-sheet .sh-prbar span{color:#c9d3dc}#cmt-sheet .sh-prbar .k{margin-left:auto;color:#e6c27a;font-size:11px}' +
    '#cmt-sheet .sh-prbar button{height:28px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);border-radius:8px;font:700 12px Figtree,sans-serif;color:#dfe5ee;cursor:pointer;padding:0 10px}#cmt-sheet .sh-prbar button:hover{background:rgba(255,255,255,.14)}#cmt-sheet .sh-prbar .pri{background:#c4953c;border-color:#c4953c;color:#1f2442}' +
    '#cmt-sheet .sh-prhost{position:sticky;left:10px;max-width:calc(100vw - 340px)}#cmt-sheet .sh-prhost .pr-cnt{padding:0}' +
    'body.cmt-sheet-on .cmt-dados-grade~*{display:none!important}' +
    '#cmt-sheet{order:-1;background:#fff;border:1px solid #e5e1d8;border-radius:18px;box-shadow:0 12px 28px rgba(20,38,60,.05);font-family:Figtree,system-ui,sans-serif;color:#14263c;max-height:78vh;overflow:auto;position:relative}#cmt-sheet[hidden]{display:none}' +
    '#cmt-sheet .sh-bar{position:sticky;left:0;top:0;z-index:6;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 14px;background:#fbfaf7;border-bottom:1px solid #eee7da}#cmt-sheet .sh-bar b{font:800 15px Figtree,system-ui,sans-serif}#cmt-sheet .sh-bar>span{color:#6d7b8a;font-size:12.5px;margin-right:auto}' +
    '#cmt-sheet button,#cmt-sheet summary{border:1px solid #d8d2c6;background:#fff;color:#1b3553;border-radius:999px;padding:6px 12px;font:700 12px Figtree,system-ui,sans-serif;cursor:pointer;list-style:none}#cmt-sheet button.pri{background:#1b3553;border-color:#1b3553;color:#fff}#cmt-sheet button:disabled{opacity:.5;cursor:default}' +
    '#cmt-sheet .sh-cols{position:relative}#cmt-sheet .sh-cols>div{position:absolute;right:0;top:34px;z-index:9;display:grid;gap:4px;min-width:220px;padding:10px 12px;background:#fff;border:1px solid #d8d2c6;border-radius:12px;box-shadow:0 10px 26px rgba(20,38,60,.16);font-size:12.5px}' +
    '#cmt-sheet .sh-t{border-collapse:separate;border-spacing:0;width:100%;font-size:13px}#cmt-sheet thead th{position:sticky;top:51px;z-index:4;background:#fff;text-align:left;padding:10px 12px 8px;font:800 11.5px Figtree,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8a6116;white-space:nowrap;cursor:pointer;user-select:none}' +
    '#cmt-sheet thead tr.sh-f th{top:86px;padding:4px 6px 8px;cursor:default;border-bottom:2px solid #c9a35a;text-transform:none;letter-spacing:0}' +
    '#cmt-sheet .sh-f input,#cmt-sheet .sh-f select{width:100%;box-sizing:border-box;border:1px solid #e1dcd2;border-radius:10px;background:#fff;padding:8px 10px;font:500 13px Figtree,system-ui,sans-serif;color:#14263c}#cmt-sheet .sh-f select{padding:7px 8px}#cmt-sheet .sh-f input::placeholder{color:#9aa3ad}' +
    '#cmt-sheet tbody td{padding:7px 12px;border-bottom:1px solid #eef0f3;white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis}#cmt-sheet tbody tr:nth-child(even) td{background:#f5f7f9}#cmt-sheet tbody tr:hover td{background:#fbf3e3}' +
    '#cmt-sheet td.mono{font:500 12.5px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}#cmt-sheet td.mono a{color:#14263c;text-decoration:none}#cmt-sheet td.mono a:hover{text-decoration:underline;color:#1b3553}#cmt-sheet td.num{text-align:right}' +
    '#cmt-sheet i.pri{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:4px;background:#5b9bd5;color:#fff;font:800 10px Figtree,system-ui,sans-serif;font-style:normal;margin-left:6px;vertical-align:1px}' +
    '#cmt-sheet .chip{display:inline-block;padding:2px 7px;border-radius:5px;border:1px solid var(--fc);color:var(--fc);font:800 11.5px Figtree,system-ui,sans-serif;background:#fff}' +
    '#cmt-sheet .sh-mais{display:block;margin:12px auto 16px}#cmt-sheet .sh-v{padding:16px;color:#6d7b8a}' +
    'body.cmt-shfull #cmt-sheet{position:fixed!important;inset:0!important;max-height:none!important;border-radius:0!important;z-index:2147483000!important}';
  function fundoMotor() {
    var md = mw() && mw().document; if (!md || !md.head) return;
    var bg = getComputedStyle(D.body).backgroundColor; if (!bg || bg === 'rgba(0, 0, 0, 0)') bg = getComputedStyle(D.documentElement).backgroundColor;
    var st = md.getElementById('cmt-fundo'); if (!st) { st = md.createElement('style'); st.id = 'cmt-fundo'; md.head.appendChild(st); }
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(bg || ''); if (!m || (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) < 128) bg = 'rgb(241, 244, 248)';   /* o motor é claro: no tema escuro, o fundo claro do design base */
    var css = 'html:root,html:root body{background:' + bg + '!important;background-image:none!important}';
    if (st.textContent !== css) st.textContent = css;
  }
  setInterval(fundoMotor, 1000);
  var t0Ini = Date.now();
  setInterval(function () { if (W.__cmtInicio || !W.__acvUnico) return; if (ACV.recs || (D.body.classList.contains('au-descon') && Date.now() - t0Ini > 3000)) { W.__cmtInicio = true; if (D.body.classList.contains('cmt-acv') && !ESC.dlg) irSub('panorama'); } }, 300);
  setInterval(function () { if (W.__acvUnico && D.body.classList.contains('cmt-acv')) planilha(); else { var md = mw() && mw().document; if (md && md.body.classList.contains('cmt-shfull')) telaCheia(md, false); } }, 600);

  /* =================== Busca avançada: o visual dos cartões novos (o funcionamento é o do motor) =================== */
  var CSS_BUSCA = (function () { var P = 'html body .central-search-panel';
    return P + '{border-radius:22px!important;border:1px solid #e5e1d8!important;box-shadow:0 12px 28px rgba(20,38,60,.05)!important;overflow:visible!important;font-family:Figtree,system-ui,sans-serif}' +
      P + '>div{border-radius:22px;overflow:hidden}' +
      P + ' .central-search-top{padding:16px 18px!important;gap:14px!important;background:#fbfaf7!important}' + P + ' #cmt-filtro{border-radius:16px!important;padding:14px 16px!important}' +
      P + ' [style*="padding: 10px 14px 0px"]{padding:16px 18px 6px!important;gap:12px!important}' +
      P + ' [style*="margin: 0px -14px"]{margin:0 -18px!important;padding-left:18px!important;padding-right:18px!important}' + P + ' [style*="margin: 0px -14px"][style*="display: flex"]{padding-top:12px!important;padding-bottom:12px!important;gap:10px!important}' +
      /* títulos de seção */
      P + ' [style*="font-weight: 900"][style*="letter-spacing"]:not(button){display:flex!important;align-items:center;gap:9px;font:800 15px Figtree,system-ui,sans-serif!important;letter-spacing:-.01em!important;text-transform:none;color:#14263c!important}' +
      P + ' [style*="font-weight: 900"][style*="letter-spacing"]:not(button)::before{content:"";width:4px;height:17px;border-radius:3px;background:#c4953c;display:inline-block}' +
      /* rótulos e textos auxiliares */
      P + ' [style*="font-weight: 850"][style*="font-size: 8.5px"],' + P + ' label>span[style*="font-size: 8.5px"]{font-size:10.5px!important;font-weight:800!important;letter-spacing:.09em!important;color:#8a6116!important}' +
      P + ' [style*="font-size: 8px"]{font-size:11px!important}' + P + ' [style*="font-size: 8.5px"]{font-size:11.5px!important}' + P + ' [style*="font-size: 9px"]:not([style*="font-weight: 900"]){font-size:11.5px!important}' +
      P + ' [style*="font-size: 9.5px"]{font-size:12.5px!important}' + P + ' [style*="font-size: 10px"]{font-size:12.5px!important}' + P + ' [style*="font-size: 10.5px"]{font-size:12.5px!important}' +
      /* campos */
      P + ' input:not([type=checkbox]),' + P + ' select,' + P + ' textarea{font:500 13.5px Figtree,system-ui,sans-serif!important;color:#14263c!important}' +
      P + ' select,' + P + ' textarea,' + P + ' input[type=search]{border:1px solid #e1dcd2!important;border-radius:11px!important;background:#fff!important;padding:9px 11px!important}' +
      P + ' [style*="height: 196px"]{height:236px!important}' + P + ' [style*="border-radius: 9px"]:not(button){border-radius:12px!important}' +
      P + ' [style*="border: 1px solid rgb(216, 210, 198)"][style*="border-radius: 9px"]:not(button){border-radius:14px!important;padding:5px 5px 5px 7px!important}' +
      /* botões */
      P + ' button{font-family:Figtree,system-ui,sans-serif!important}' + P + ' button[style*="border-radius: 9px"],' + P + ' button[style*="border-radius: 7px"]{border-radius:999px!important}' +
      P + ' button[style*="border-radius: 9px"]{padding:9px 16px!important}' + P + ' [style*="background: rgb(231, 235, 240)"]{border-radius:999px!important;padding:4px!important}' + P + ' [style*="background: rgb(231, 235, 240)"] button{padding:8px 16px!important}' +
      P + ' [style*="align-items: stretch"][style*="overflow: hidden"][style*="border: 1px solid rgb(225, 220, 210)"]{border-radius:999px!important}' + P + ' [style*="background: rgb(196, 149, 6"]{border-radius:0 999px 999px 0!important;padding:9px 16px!important}';
  })();
  /* =================== Panorama: seções próprias e minimizáveis; importação na Base do gabinete =================== */
  var LS_MIN = 'cmt_secoes_min', MINS = (function () { try { return JSON.parse(localStorage.getItem(LS_MIN) || '{}') || {}; } catch (e) { return {}; } })();
  function secaoPan(id, tit, sub) {
    var h = D.getElementById('au-pan-' + id); if (!h) { h = titulo(id, tit, sub); h.id = 'au-pan-' + id; }
    if (!h.querySelector('.au-mintg')) { var b = D.createElement('button'); b.type = 'button'; b.className = 'au-mintg'; b.dataset.aimin = id; h.appendChild(b); }
    return h;
  }
  function caixaPan(id) { var x = D.getElementById('au-pan-' + id + 'box'); if (!x) { x = D.createElement('div'); x.id = 'au-pan-' + id + 'box'; x.className = 'au-pbox'; } return x; }
  /* Painéis que entram nas seções dos indicadores:
     4 Onde estão ← No gabinete (estações e caixas do PJe) · 3 Movimento ← Entradas e saídas
     2 Prontos para julgar ← Painel por blocos (destino provável), Candidatos à decisão do relator e Massas que ainda esperam caminho */
  function slotSecao(sec, k, tit, sub) {
    var slot = sec.querySelector(':scope > .au-gabslot[data-k="' + k + '"]');
    if (!slot) { slot = D.createElement('div'); slot.className = 'au-gabslot'; slot.dataset.k = k; slot.innerHTML = '<h4>' + tit + (sub ? ' <small>' + sub + '</small>' : '') + '</h4>';
      var ult = sec.querySelectorAll(':scope > .au-gabslot'), ref = ult.length ? ult[ult.length - 1] : sec.querySelector(':scope > .ai-g'); if (ref) ref.after(slot); else sec.appendChild(slot); }
    return slot;
  }
  /* na seção final, os painéis de lote vêm antes do mapa de vazão */
  function limparVazios() { D.querySelectorAll('#ai-b2 > .au-gabslot[data-k="blo"], #ai-b5 > .au-gabslot[data-k="massas"]').forEach(function (s) { if (!s.querySelector('#au-pan-blobox,#rl-sim,#rl-triagem')) s.remove(); }); }
  function slotLote(sec, k, tit, sub) { limparVazios();
    var slot = sec.querySelector(':scope > .au-gabslot[data-k="' + k + '"]'), mapa = sec.querySelector(':scope > #au-pan-mapabox');
    if (!slot) { slot = D.createElement('div'); slot.className = 'au-gabslot au-lote'; slot.dataset.k = k; slot.innerHTML = '<h4>' + tit + (sub ? ' <small>' + sub + '</small>' : '') + '</h4>'; }
    var outros = sec.querySelectorAll(':scope > .au-lote'), ult = outros.length ? outros[outros.length - 1] : null;
    if (slot.parentElement !== sec) { if (ult) ult.after(slot); else { var h3 = sec.querySelector(':scope > h3'); if (h3) h3.after(slot); else sec.prepend(slot); } }
    if (mapa && mapa.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING) mapa.before(slot);
    return slot;
  }
  function poeNoSlot(el, slot) { if (!el || !slot) return; el.dataset.auMov = '1'; el.hidden = false; if (el.parentElement !== slot) slot.appendChild(el); }
  function gabNoOndeEstao() {
    var b4 = $('#ai-b4'), b3 = $('#ai-b3'), b2 = $('#ai-b2');
    if (b4) { var ag = $('#acv-gab'); if (ag) { ag.classList.add('au-pan-gabx'); poeNoSlot(ag, slotSecao(b4, 'gab', 'No gabinete, por estação e caixa do PJe', 'abra a caixa para ver os processos, do mais antigo ao mais recente')); } }
    if (b3) poeNoSlot($('#au-pan-esbox'), slotSecao(b3, 'es', 'Entradas e saídas', 'distribuições no TRF, baixas e julgados, mês a mês'));
    var b1 = $('#ai-b1'), leit = $('#tk-leitura');
    if (b1 && leit) { var sl = b1.querySelector(':scope > .au-gabslot[data-k="leit"]'); if (!sl) { sl = D.createElement('div'); sl.className = 'au-gabslot au-topo'; sl.dataset.k = 'leit'; var h3 = b1.querySelector(':scope > h3'); if (h3) h3.after(sl); else b1.prepend(sl); } poeNoSlot(leit, sl); }
    if (b4) { var sr = slotSecao(b4, 'rlret', '', ''), tr = [].slice.call(D.querySelectorAll('#rl-retrato')), nv = tr.find(function (v) { return v.closest('#rl-body'); }) || tr.find(function (v) { return v.parentElement === sr; }) || tr[0];
      tr.forEach(function (v) { if (v !== nv) v.remove(); });
      if (nv) { poeNoSlot(nv, sr); nv.classList.add('au-rlmov'); nv.querySelectorAll('.rl-p').forEach(function (pp) { var h = (pp.querySelector('h4') || {}).textContent || ''; if (/^(Por Seção|Tempo na tarefa atual)/.test(h.trim())) pp.classList.add('au-dup'); }); } }
    if (b2) {
      var b5 = $('#ai-b5'), blo = $('#au-pan-blo'), sBlo = b5 && slotLote(b5, 'blo', 'Blocos e semelhanças', 'agrupe por assunto, matéria, origem, advogado, parte, caixa do PJe, destino provável ou etiqueta · clique num grupo para ver, copiar, baixar ou levar à Triagem');
      if (b5 && blo && blo.__cx) poeNoSlot(blo.__cx, sBlo);
      if (sBlo) { var sem = $('#au-sem'); if (!sem) { sem = D.createElement('div'); sem.id = 'au-sem'; ligarSem(sem); } if (sem.parentElement !== sBlo) { var h4 = sBlo.querySelector(':scope > h4'); if (h4) h4.after(sem); else sBlo.prepend(sem); } pintarSem(sem); }
      var dsl = slotSecao(b2, 'dest', 'Destino provável do acervo ativo', 'cada processo pela situação, tarefa e etiquetas · clique para ver os processos; “blocos” filtra o painel de blocos na seção 5'),
        dTodos = [].slice.call(D.querySelectorAll('article.bl-d')), dNovo = dTodos.find(function (v) { return v.closest('#au-pan-blobox'); }) || dTodos.find(function (v) { return v.parentElement === dsl; }) || dTodos[0];
      dTodos.forEach(function (v) { if (v !== dNovo) v.remove(); }); if (dNovo) { dNovo.dataset.auMov = '1'; if (dNovo.parentElement !== dsl) dsl.appendChild(dNovo); var dmono = b2.querySelector(':scope > .au-gabslot[data-k="mono"]'); if (dmono && dmono.compareDocumentPosition(dsl) & Node.DOCUMENT_POSITION_FOLLOWING) dmono.before(dsl); }
      /* "Mesma origem, mesmo advogado, mesma parte" (mapa de vazão) junto do painel por blocos */
      var sim = [].slice.call(D.querySelectorAll('#rl-sim')), sv = sim.find(function (v) { return v.closest('#rl-body'); }) || sim.find(function (v) { return v.parentElement === sBlo; }) || sim[0];
      if (b5) sim.forEach(function (v) { if (v !== sv) v.remove(); }); if (b5 && sv) { poeNoSlot(sv, sBlo); sv.classList.add('au-rlmov', 'au-sim'); }
      /* o mapa de vazão se refaz: a versão nova de cada parte substitui a anterior */
      var rb = $('#rl-body');
      if (rb) { var kp = rb.querySelector(':scope > .rl-kpis'); if (kp) kp.id = 'rl-kpis'; [].slice.call(rb.querySelectorAll(':scope > .card')).forEach(function (c) { if (/Confer[êe]ncia da base/i.test(c.textContent)) c.id = 'rl-conf'; }); }
      [['rl-kpis', 'kpis', b2], ['rl-mono', 'mono', b2], ['rl-triagem', 'massas', b2], ['rl-origem', 'conv', b2], ['rl-espera', 'espera', b2], ['rl-pauta', 'lotesp', b5]].forEach(function (x) { if (!x[2]) return;
        var slot = x[2] === b2 ? slotSecao(b2, x[1], '', '') : slotLote(b5, x[1], '', ''), todos = [].slice.call(D.querySelectorAll('#' + x[0]));
        var novo = todos.find(function (v) { return v.closest('#rl-body'); }) || todos.find(function (v) { return v.parentElement === slot; }) || todos[0];
        todos.forEach(function (v) { if (v !== novo) v.remove(); });
        if (novo) { poeNoSlot(novo, slot); novo.classList.add('au-rlmov'); }
      });
      /* ordem da Destinação: números · Prontos para julgar · destino provável · decisão do relator · massas · convocações · o que espera */
      var kS = b2.querySelector(':scope > .au-gabslot[data-k="kpis"]'), h3b = b2.querySelector(':scope > h3'); if (kS && h3b && h3b.nextElementSibling !== kS) h3b.after(kS);
      var grade = b2.querySelector(':scope > .ai-g'), ref = grade && grade.nextElementSibling && grade.nextElementSibling.classList.contains('au-lst-slot') ? grade.nextElementSibling : grade;
      ['dest', 'mono', 'massas', 'conv', 'espera'].forEach(function (k) { var s = b2.querySelector(':scope > .au-gabslot[data-k="' + k + '"]'); if (s && ref) { if (ref.nextElementSibling !== s) ref.after(s); ref = s; } });
      /* a conferência da base vai para o diálogo Base do gabinete */
      var cf = [].slice.call(D.querySelectorAll('#rl-conf')), cfn = cf.find(function (v) { return v.closest('#rl-body'); }) || cf[0], cb = conCorpo(), cs = cb.querySelector('.au-conf');
      if (!cs) { cs = D.createElement('section'); cs.className = 'au-conf'; cb.appendChild(cs); }
      cf.forEach(function (v) { if (v !== cfn) v.remove(); }); if (cfn && cfn.parentElement !== cs) cs.appendChild(cfn);
      if (b5) ajudaLotes(b5);
    }
  }
  /* Lotes: as frentes de trabalho e o método viram balões de ajuda (passar o cursor ou focar) */
  function ajudaLotes(b5) {
    var le = $('#rl-leitura'), me = $('#rl-metodo'); if (!le && !me) return;
    var sig = (le ? le.textContent.length : 0) + '|' + (me ? me.textContent.length : 0), bx = b5.querySelector(':scope > .au-ajuda');
    if (!bx) { bx = D.createElement('div'); bx.className = 'au-ajuda'; var h3 = b5.querySelector(':scope > h3'); if (h3) h3.after(bx); else b5.prepend(bx);
      bx.addEventListener('click', function (e) { var a = e.target.closest('[data-rlgo2]'); if (!a) return; e.preventDefault(); var al = $('#' + a.dataset.rlgo2); if (al) window.scrollTo({ top: al.getBoundingClientRect().top + scrollY - 130, behavior: 'smooth' }); }); }
    if (bx.__sig === sig) return; bx.__sig = sig;
    var fr = le ? [].slice.call(le.querySelectorAll('.rl-rec')).map(function (r) { var b = r.querySelector('b'), pp = r.querySelector('p'), a = r.querySelector('[data-rlgo]');
      return '<span class="au-bal" tabindex="0"' + (a ? ' data-rlgo2="' + esc(a.dataset.rlgo) + '"' : '') + ' style="--c:' + esc(getComputedStyle(r).getPropertyValue('--c') || '#1b3553') + '">' + esc(b ? b.textContent : '') + '<span class="au-balt" role="tooltip">' + esc(pp ? pp.textContent : '') + (a ? '<em>clique para ir à lista</em>' : '') + '</span></span>'; }).join('') : '';
    var mt = me ? '<span class="au-bal au-balm" tabindex="0">ⓘ Como os números são feitos<span class="au-balt" role="tooltip">' + (me.querySelector('ul') ? me.querySelector('ul').outerHTML : esc(me.textContent)) + '</span></span>' : '';
    bx.innerHTML = '<span class="k">Frentes de trabalho</span>' + fr + mt;
  }
  /* =================== Monitor: um só padrão de seção, de cartão e de listagem ===================
     Seções numeradas (1 a 6) com o mesmo cabeçalho e o mesmo minimizar; todo item que representa processos
     abre a listagem padrão logo abaixo dele (Abrir na Triagem · Copiar números · Baixar planilha · ×). */
  function secaoMonitor(host, n, id, tit, sub, conteudo) {
    var s = $('#ai-b' + n);
    if (!s) { s = D.createElement('section'); s.className = 'ai-b'; s.id = 'ai-b' + n; s.dataset.auMov = '1';
      s.innerHTML = '<h3><b>' + n + '</b>' + tit + '<button type="button" class="au-mintg" data-aimin="b' + n + '"></button><small>' + sub + '</small></h3>'; }
    if (s.parentElement !== host || s.previousElementSibling !== $('#ai-b' + (n - 1))) { var ant = $('#ai-b' + (n - 1)); if (ant && ant.parentElement === host) ant.after(s); else host.appendChild(s); }
    s.hidden = false;
    if (conteudo && conteudo.parentElement !== s) { conteudo.hidden = false; s.appendChild(conteudo); }
    return s;
  }
  function secoesFinais() {
    var host = $('#au-pan-ind'); if (!host || !$('#ai-b4')) return;
    var s6 = $('#ai-b6'); if (s6) { var mb6 = s6.querySelector('#au-pan-mapabox'); if (mb6) host.after(mb6); s6.remove(); }
    var rb = $('#au-pan-retbox'); if (rb) rb.hidden = true;
    secaoMonitor(host, 5, 'lotes', 'Lotes', 'processos semelhantes para triar e agir em lote: por assunto, matéria, origem, advogado, parte, caixa, destino ou etiqueta, e os lotes de pauta', $('#au-pan-mapabox'));
    gabNoOndeEstao();
    botoesPdf(); aplicarMins(); limitarListas();
  }
  /* cada seção do Monitor que já tem relatório próprio: o botão abre o painel de relatórios com a prévia gerada */
  var PDF_SEC = { 'ai-b1': ['retrato', 'Retrato do acervo do gabinete'], 'ai-b2': ['vazao', 'Mapa de vazão (sumário executivo)'], 'ai-b3': ['fluxo', 'Entradas, saídas e julgados por mês'], 'ai-b4': ['tarefa', 'Por caixa do PJe'], 'ai-b5': ['lotes', 'Lotes de pauta por matéria'] };
  var SVG_PDF = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 14h6M9 17h4"/></svg>';
  function botoesPdf() {
    Object.keys(PDF_SEC).forEach(function (id) {
      var h = D.querySelector('#' + id + ' > h3'); if (!h || h.querySelector('.au-pdfbt')) return;
      var b = D.createElement('button'); b.type = 'button'; b.className = 'au-pdfbt'; b.dataset.aupdf = PDF_SEC[id][0]; b.title = 'Abrir no painel de relatórios: ' + PDF_SEC[id][1]; b.innerHTML = SVG_PDF + 'Relatório em PDF';
      var mt = h.querySelector('.au-mintg'); if (mt) mt.before(b); else h.appendChild(b);
      if (id === 'ai-b2' && !h.querySelector('.au-xlsbt')) { var x = D.createElement('button'); x.type = 'button'; x.className = 'au-pdfbt au-xlsbt'; x.title = 'Planilha da destinação: cada processo com frente, critério e pendências (o antigo mapa de vazão)'; x.innerHTML = SVG_PDF + 'Planilha (Excel)'; x.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); try { if (!RL.M) RL.M = rlModel(); rlExport(); } catch (er) { console.error('[CMT] planilha', er); } }); b.before(x); }
    });
  }
  function abrirRelatorio(id) {
    try { relatoriosNoPanorama(); } catch (e) {}
    if (W.CMTShell && W.CMTShell.configuracoes) { W.CMTShell.configuracoes('relatorios'); relCfg(); }
    try { rpSelect(id); } catch (e) { console.error('[CMT] relatório', e); }
    var rail = $('#rail'); if (rail) rail.scrollTop = 0;
    var rr = $('#au-relrail'); if (rr) {
      var cx = rr.querySelector('.au-rrc'), vb = rr.querySelector('.au-relvolta');
      if (!vb && cx) { vb = D.createElement('button'); vb.type = 'button'; vb.className = 'au-relvolta'; vb.textContent = '‹ Todos os relatórios'; cx.prepend(vb); vb.addEventListener('click', function () { rr.classList.remove('au-rel-foco'); }); }
      rr.classList.add('au-rel-foco'); rr.classList.remove('au-pisca'); void rr.offsetWidth; rr.classList.add('au-pisca'); }
  }
  D.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-aupdf]'); if (!b) return; e.preventDefault(); e.stopPropagation(); abrirRelatorio(b.dataset.aupdf); }, true);
  /* listas longas de cartões: as 8 primeiras, com "mostrar todos" */
  function limitarListas() {
    D.querySelectorAll('#au-pan-ind .rl-cards').forEach(function (c) {
      var n = c.querySelectorAll(':scope > details.rl-card').length, bt = c.nextElementSibling && c.nextElementSibling.classList.contains('au-tudo-bt') ? c.nextElementSibling : null;
      if (n <= 8) { c.classList.remove('au-lim'); if (bt) bt.remove(); return; }
      c.classList.add('au-lim');
      if (!bt) { bt = D.createElement('button'); bt.type = 'button'; bt.className = 'au-tudo-bt'; c.after(bt); bt.addEventListener('click', function () { c.classList.toggle('au-tudo'); limitarListas(); }); }
      var txt = c.classList.contains('au-tudo') ? 'Mostrar só os 8 primeiros' : 'Mostrar todos (' + nf(n) + ')'; if (bt.textContent !== txt) bt.textContent = txt;
    });
  }
  setInterval(function () { if (D.body.classList.contains('au-pan')) { try { secoesFinais(); } catch (e) { console.error('[CMT] monitor', e); } } }, 900);
  /* cartões do mapa de vazão e caixas do PJe: o clique abre a listagem padrão logo abaixo */
  function listaAbaixo(el, titulo, L) {
    var lst = el.nextElementSibling && el.nextElementSibling.classList.contains('au-lst') ? el.nextElementSibling : null;
    if (!lst) { lst = D.createElement('div'); lst.className = 'au-lst'; lst.hidden = true; el.after(lst); }
    D.querySelectorAll('#au-pan-ind .au-lst').forEach(function (x) { if (x !== lst && !x.hidden) { x.hidden = true; x.__tit = ''; } });
    var bx = abrirLista(lst, titulo, L, { box: lst });
    D.querySelectorAll('#au-pan-ind .au-aberto').forEach(function (x) { x.classList.remove('au-aberto'); });
    if (!bx.hidden) el.classList.add('au-aberto');
  }
  D.addEventListener('click', function (e) {
    if (!e.target.closest || !D.body.classList.contains('au-pan')) return;
    var sm = e.target.closest('#au-pan-ind details.rl-card > summary');
    if (sm && !e.target.closest('[data-rlcopy],[data-rlacv],[data-rlgo],a,button')) {
      e.preventDefault(); e.stopPropagation(); var d = sm.parentElement, L = null; try { L = RL.lists[d.dataset.rl]; } catch (er) {}
      if (L) listaAbaixo(d, L.label || (sm.querySelector('.rl-ct b') || {}).textContent || 'Lista', L.L); return;
    }
    var tk = e.target.closest('#au-pan-ind details.acv-tk > summary');
    if (tk && !e.target.closest('[data-acvset],button,a')) {
      e.preventDefault(); e.stopPropagation(); var dt = tk.parentElement, id = dt.dataset.acvtk, nome = (tk.querySelector('code') || {}).textContent || id;
      var L2 = ACV.recs.filter(function (o) { return o.gab && (o.gtk || []).indexOf(id) >= 0; }).sort(function (a, b) { var x = a.tks && a.tks[0] ? acvDays(a.tks[0].de) : 0, y = b.tks && b.tks[0] ? acvDays(b.tks[0].de) : 0; return (y || 0) - (x || 0); });
      listaAbaixo(dt, 'Caixa do PJe: ' + nome, L2);
    }
  }, true);
  var cssMon = D.createElement('style');
  cssMon.textContent =
    /* cabeçalhos antigos de Retrato e Mapa: agora são as seções 5 e 6 */
    'html body #au-pan-ret,html body #au-pan-mapa{display:none!important}html body #main #au-pan-ind #ai-b5>.au-pbox,html body #main #au-pan-ind #ai-b6>.au-pbox{margin:0}' +
    /* subpainéis dentro das seções: o mesmo título */
    'html body #main #au-pan-ind .au-gabslot{margin-top:22px;padding-top:18px;border-top:1px solid var(--line,#e6e1d6)}html body #main #au-pan-ind .au-gabslot>h4{margin:0 0 12px;font:800 15px Figtree,system-ui,sans-serif;color:#14263c}' +
    'html body #main #au-pan-ind .au-gabslot .au-rlmov>h2,html body #main #au-pan-ind #acv-gab>h2{display:block!important;margin:0 0 12px!important;padding:0!important;border:0!important;background:none!important;font:800 15px Figtree,system-ui,sans-serif!important;color:#14263c!important}' +
    'html body #main #au-pan-ind .au-rlmov>h2 small,html body #main #au-pan-ind #acv-gab>h2 small{display:block;font:500 12px Figtree,system-ui,sans-serif;color:#6d7b8a;margin-top:2px}html body #main #au-pan-ind #acv-gab>h2{display:none!important}' +
    /* cartões-linha: mapa de vazão e caixas do PJe no mesmo desenho dos blocos */
    'html body #main #au-pan-ind .rl-cards{gap:8px}html body #main #au-pan-ind details.rl-card{background:#fff;border:1px solid #ebe6dc;border-left:5px solid var(--c,#1b3553);border-radius:14px;overflow:visible}' +
    'html body #main #au-pan-ind details.rl-card>summary{padding:10px 14px}html body #main #au-pan-ind details.rl-card:hover{border-color:#c4953c;border-left-color:var(--c,#1b3553)}' +
    'html body #main #au-pan-ind details.rl-card .rl-n{font:800 22px Figtree,system-ui,sans-serif;color:var(--c,#1b3553);min-width:46px;text-align:center}html body #main #au-pan-ind details.rl-card .rl-chev{font:700 11.5px Figtree,system-ui,sans-serif;color:#8a6116}' +
    'html body #main #au-pan-ind details.acv-tk{background:#fff;border:1px solid #ebe6dc;border-left:5px solid var(--fc,#1b3553);border-radius:14px;margin:0 0 8px}html body #main #au-pan-ind details.acv-tk>summary{cursor:pointer;padding:10px 14px}html body #main #au-pan-ind details.acv-tk:hover{border-color:#c4953c;border-left-color:var(--fc,#1b3553)}' +
    'html body #main #au-pan-ind details.acv-tk>summary::-webkit-details-marker,html body #main #au-pan-ind details.acv-tk>summary::marker{display:none;content:""}html body #main #au-pan-ind details.acv-tk .acv-tkb{display:none!important}' +
    'html body #main #au-pan-ind .au-aberto{border-color:#c4953c!important;box-shadow:0 0 0 2px rgba(196,149,60,.25)}html body #main #au-pan-ind .au-lst{margin:6px 0 12px}' +
    /* botão de relatório em cada seção */
    'html body #main #au-pan-ind .ai-b>h3 .au-pdfbt{margin-left:auto;display:inline-flex;align-items:center;gap:6px;border:1px solid #d8d2c6;background:#fff;color:#1b3553;border-radius:999px;padding:4px 11px;font:700 11.5px Figtree,system-ui,sans-serif;cursor:pointer;white-space:nowrap}' +
    'html body #main #au-pan-ind .ai-b>h3 .au-pdfbt:hover{border-color:#c4953c;color:#8a6116}html body #main #au-pan-ind .ai-b>h3 .au-pdfbt+.au-mintg{margin-left:8px!important}' +
    '#au-relrail.au-rel-foco .rp-cat{display:none!important}.au-relvolta{display:none}#au-relrail.au-rel-foco .au-relvolta{display:inline-flex;margin:0 0 12px;border:1px solid #d8d2c6;background:#fff;color:#1b3553;border-radius:999px;padding:5px 12px;font:700 12px Figtree,system-ui,sans-serif;cursor:pointer}#au-relrail .au-relvolta:hover{border-color:#c4953c}' +
    '@keyframes auPisca{0%{box-shadow:inset 0 0 0 0 rgba(196,149,60,0)}30%{box-shadow:inset 0 0 0 3px rgba(196,149,60,.8)}100%{box-shadow:inset 0 0 0 0 rgba(196,149,60,0)}}#au-relrail.au-pisca{animation:auPisca 1.2s ease}' +
    'html body #main #au-pan-ind #au-pan-blobox .bl-g{grid-template-columns:minmax(0,1fr)!important}html body #main #au-pan-ind .au-gabslot[data-k="dest"] article.bl-d{max-width:760px}' +
    'html body #main #au-pan-ind .au-sub4{margin:6px 0 12px;font:800 15px Figtree,system-ui,sans-serif;color:#14263c}html body #main #au-pan-ind .au-sub4 small{display:block;font:500 12px Figtree,system-ui,sans-serif;color:#6d7b8a;margin-top:2px}' +
    'html body #main #au-pan-ind .au-gabslot[data-k="kpis"]{margin:0 0 18px;padding:0;border:0}html body #main #au-pan-ind #rl-kpis{margin:0!important}' +
    'html body #main #au-pan-ind #ai-b5>#au-pan-mapabox,html body #au-pan-mapabox{display:none!important}' +
    '.au-ajuda{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin:0 0 16px;font-family:Figtree,system-ui,sans-serif}.au-ajuda .k{font:800 10.5px Figtree,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8a6116;margin-right:4px}' +
    '.au-bal{position:relative;display:inline-flex;align-items:center;border:1px solid #e1dbcf;border-left:4px solid var(--c,#1b3553);background:#fff;border-radius:999px;padding:4px 11px;font:700 12px Figtree,system-ui,sans-serif;color:#14263c;cursor:help}.au-bal[data-rlgo2]{cursor:pointer}' +
    '.au-bal:hover,.au-bal:focus-visible{border-color:#c4953c;outline:none}.au-balm{border-left-color:#c4953c}' +
    '.au-balt{position:absolute;z-index:50;left:0;top:calc(100% + 8px);width:min(420px,80vw);padding:10px 12px;border-radius:12px;background:#1f2442;color:#e8ecf2;font:500 12.5px/1.45 Figtree,system-ui,sans-serif;box-shadow:0 14px 34px rgba(0,0,0,.3);opacity:0;visibility:hidden;transform:translateY(-4px);transition:.15s;pointer-events:none;white-space:normal}' +
    '.au-balt em{display:block;margin-top:6px;font-style:normal;color:#e6c27a;font-weight:700}.au-balm .au-balt{width:min(620px,86vw)}.au-balt ul{margin:0;padding-left:16px}html body .au-balt li{margin:0 0 6px;color:#dfe5ee!important;font-size:12.5px!important}.au-balt b{color:#fff}' +
    '.au-bal:hover .au-balt,.au-bal:focus-visible .au-balt,.au-bal:focus-within .au-balt{opacity:1;visibility:visible;transform:none}' +
    '#au-con .au-conf{margin-top:14px}#au-con .au-conf .card{margin:0!important;color:#34495f!important}#au-con .au-conf .card b{color:#14263c!important}' +
    'html body #au-con .sit-k span,html body #au-con .sit-all{color:#14263c!important}html body #au-con .tk-k span{color:#34495f!important}' +
    'html body #main #au-pan-ind .ai-b>h3 .au-xlsbt+.au-pdfbt{margin-left:8px!important}.au-balm .au-balt{left:auto;right:0}' +
    'html body #main #au-pan-ind .ai-nota{margin:10px 0 0;font-size:11.5px;color:#6d7b8a}html body #main #au-pan-ind .au-gabslot.au-lote:first-of-type{margin-top:4px}html body #main #au-pan-ind #ai-b5>#au-pan-mapabox{margin-top:22px;padding-top:18px;border-top:1px solid var(--line,#e6e1d6)}' +
    'html body #main #au-pan-ind .au-sim{margin-top:18px!important}html body #main #au-pan-ind .au-gabslot.au-topo{margin:0 0 16px;padding:0;border:0}html body #main #au-pan-ind .au-topo #tk-leitura{margin:0!important}html body #main #au-pan-ind .rl-p.au-dup{display:none!important}' +
    'html body #main #au-pan-ind .ai-hero .ai-ks{grid-template-columns:repeat(4,minmax(0,1fr))!important}@media (max-width:1100px){html body #main #au-pan-ind .ai-hero .ai-ks{grid-template-columns:repeat(2,minmax(0,1fr))!important}}' +
    'html body #main #au-pan-ind .ai-hero .ai-k.st{cursor:default}' +
    /* listas longas */
    '.rl-cards.au-lim:not(.au-tudo)>details.rl-card:nth-of-type(n+9){display:none}.au-tudo-bt{display:block;margin:10px auto 4px;border:1px solid #d8d2c6;background:#fff;color:#1b3553;border-radius:999px;padding:6px 14px;font:700 12.5px Figtree,system-ui,sans-serif;cursor:pointer}.au-tudo-bt:hover{border-color:#c4953c}' +
    /* as listas abertas dentro de cartões-linha não usam mais o detalhe antigo */
    'html body #main #au-pan-ind details.rl-card .rl-slot{display:none!important}';
  D.head.appendChild(cssMon);

  /* as listas do mapa de vazão fora do painel de relatórios: abrir, copiar e abrir na Triagem */
  D.addEventListener('toggle', function (e) {
    var d = e.target; if (!d.matches || !d.matches('details.rl-card') || d.closest('#relatorios')) return;
    try { var ch = d.querySelector('.rl-chev'); if (ch) ch.textContent = d.open ? 'fechar ▴' : 'abrir lista ▾'; if (!d.open) return; var s = d.querySelector('.rl-slot'); if (!s || s.dataset.ok) return; var L = RL.lists[d.dataset.rl]; if (!L) return; s.innerHTML = rlTable(L.L, L.sec); s.dataset.ok = '1'; } catch (er) { console.error('[CMT] mapa', er); }
  }, true);
  D.addEventListener('click', function (e) {
    var tg = e.target.closest && e.target.closest('[data-rlcopy],[data-rlacv],[data-rlgo]'); if (!tg || tg.closest('#relatorios')) return; e.preventDefault(); e.stopPropagation();
    try {
      if (tg.dataset.rlgo) { var alvo = $('#' + tg.dataset.rlgo); if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      var L = RL.lists[tg.dataset.rlcopy || tg.dataset.rlacv]; if (!L) return;
      if (tg.dataset.rlcopy) { var txt = L.L.map(function (o) { return o.p; }).join('\n'); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { try { toast(L.L.length + ' números copiados · ' + L.label + '.'); } catch (er) {} }, function () {}); return; }
      abrirNaBusca(L.L, L.label);
    } catch (er) { console.error('[CMT] mapa', er); }
  }, true);
  function ordemPan(lista) { for (var i = 1; i < lista.length; i++) if (lista[i] && lista[i - 1] && lista[i - 1].nextElementSibling !== lista[i]) lista[i - 1].after(lista[i]); }
  function secoesPanorama() {
    var topo = $('#au-pan-top'), gb = $('#au-pan-gab'), ag = $('#acv-gab'), bl = $('#au-pan-blo'); if (!topo || !gb || !bl) return;
    var hRet = secaoPan('ret', 'Retrato do acervo', 'onde o acervo se concentra, o que espera rumo, sobrestados e fluxo da pauta'), bRet = caixaPan('ret');
    var hEs = secaoPan('es', 'Entradas e saídas', 'distribuições no TRF, baixas e julgados, mês a mês'), bEs = caixaPan('es');
    var hMp = secaoPan('mapa', 'Mapa de vazão', 'listas abertas na tela, com cópia de números e atalho para o acervo'), bMp = caixaPan('mapa');
    secaoPan('gab'); secaoPan('blo');
    var leit = $('#tk-leitura'); if (leit && leit.parentElement !== bRet) bRet.appendChild(leit);
    var ch = $('#acspanel .fl-ch'); if (ch) { bEs.innerHTML = ''; bEs.appendChild(ch); }
    var mb = $('#relatorios #rl-body'); if (mb) { var card = mb.previousElementSibling && mb.previousElementSibling.classList.contains('card') ? mb.previousElementSibling : null; bMp.innerHTML = ''; if (card) bMp.appendChild(card); bMp.appendChild(mb); var mh = $('#rl-interativo'); if (mh) mh.classList.add('au-oculto'); }
    ordemPan([topo, hRet, hMp]); [bEs, bRet, bMp].forEach(function (x) { if (!x.isConnected) { x.hidden = true; topo.after(x); } }); gabNoOndeEstao(); secoesFinais();
    var nav = topo.querySelector('.pt-nav'); if (nav && !nav.querySelector('[href="#ai-b5"]')) nav.insertAdjacentHTML('beforeend', '<a href="#ai-b5">Lotes</a>');
    aplicarMins();
  }
  function aplicarMins() {
    D.querySelectorAll('[data-aimin]').forEach(function (b) { var id = b.dataset.aimin, min = !!MINS[id], alvo = b.closest('.ai-b') || b.closest('.au-h'); if (!alvo) return; alvo.classList.toggle('ai-min', min); b.textContent = min ? 'Expandir ▾' : 'Minimizar ▴'; b.setAttribute('aria-expanded', String(!min)); });
  }
  D.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-aimin]'); if (!b) return; e.preventDefault(); e.stopPropagation(); MINS[b.dataset.aimin] = !MINS[b.dataset.aimin]; try { localStorage.setItem(LS_MIN, JSON.stringify(MINS)); } catch (er) {} aplicarMins(); }, true);
  /* importação dos relatórios (PJe, Power BI, complementos): na Base do gabinete */
  function importacaoNaBase() {
    var d = $('#au-con'); if (!d) return; var slot = d.querySelector('.au-conimp');
    if (!slot) { slot = D.createElement('section'); slot.className = 'au-conimp'; slot.innerHTML = '<h3>Relatórios que atualizam o acervo fonte</h3><div class="ci"></div>'; var cx = d.querySelector('.au-conx'); cx.after(slot); }
    var ci = slot.querySelector('.ci'); if (ci && !ci.textContent) ci.textContent = 'Importações disponíveis no diálogo Base do Acervo.';
  }
  var cssSec = D.createElement('style');
  cssSec.textContent =
    '.au-side [data-au-act="tab"]{display:none!important}' +
    '.au-mintg{margin-left:auto;align-self:center;border:1px solid var(--line,#ddd);background:var(--card,#fff);color:#8a6116;border-radius:999px;padding:4px 12px;font:800 11.5px Figtree,system-ui,sans-serif;cursor:pointer;white-space:nowrap}.au-mintg:hover{border-color:#c4953c}' +
    '.ai-b>h3 .au-mintg{font-size:11.5px}.ai-b.ai-min>:not(h3){display:none!important}.au-h.ai-min+*{display:none!important}.au-h.ai-min+#acv-gab{display:none!important}' +
    '.au-pbox{margin:0 0 26px}#au-pan-esbox .fl-ch{background:var(--card,#fff);border:1px solid var(--line);border-radius:18px;padding:16px 18px}#au-pan-retbox #tk-leitura{margin:0}#au-pan-mapabox .card{margin-bottom:14px}.au-oculto{display:none!important}' +
    'body:not(.au-pan) #au-pan-ret,body:not(.au-pan) #au-pan-es,body:not(.au-pan) #au-pan-mapa,body:not(.au-pan) .au-pbox,body.au-relpag #au-pan-ret,body.au-relpag #au-pan-es,body.au-relpag #au-pan-mapa,body.au-relpag .au-pbox{display:none!important}' +
    'body.au-pan .au-pbox #tk-leitura,body.au-pan .au-pbox .fl-ch,html body.au-pan .au-topo #tk-leitura{display:block!important}' +
    '#au-con .au-conimp .dp-src{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}#au-con .au-conimp .dp-src>*{display:block!important}#au-con .au-conimp{background:#fff;color:#14263c;border-radius:14px;padding:14px 16px}#au-con .au-conimp h3{margin:0 0 10px;font:800 14.5px Figtree,system-ui,sans-serif;color:#14263c}#au-con .au-conimp .ci:empty::after{content:"O acervo ainda está carregando.";color:#6d7b8a;font-size:12.5px}';
  D.head.appendChild(cssSec);

  /* =================== Cabeçalho: pílula Base + Configurações, lupa só de processos, sem os botões antigos =================== */
  var SVG_DB = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>';
  function cabecalho() {
    ['#cmpBtn', '#atlBtn', '#gx-bkp', '#gx-bkp-pop'].forEach(function (q) { D.querySelectorAll(q).forEach(function (e) { e.remove(); }); });
    var base = $('#cmtConBtn'), cfg = $('#cmtCfgBtn'); if (!base || !cfg) return;
    var pil = $('#au-pilula'); if (!pil) { pil = D.createElement('span'); pil.id = 'au-pilula'; pil.setAttribute('role', 'group'); pil.setAttribute('aria-label', 'Base do gabinete e configurações'); base.before(pil); }
    if (base.parentElement !== pil) pil.appendChild(base); if (cfg.parentElement !== pil) pil.appendChild(cfg);
    var w = mw(), tem = false; try { tem = !!(w && w.ProcsMuta && w.ProcsMuta.atual); } catch (e) {}
    var html = SVG_DB + '<span>Base</span><i class="' + (tem ? 'ok' : 'off') + '"></i>';
    if (base.__h !== html) { base.innerHTML = html; base.__h = html; }
    base.title = tem ? 'Base do gabinete: conectado ao procs-muta · dados, importação e planilha integral' : 'Base do gabinete: sem conexão com o procs-muta · clique para conectar';
    base.setAttribute('aria-label', base.title); cfg.title = 'Configurações: regras de etiquetas, designação e equipe';
  }
  setInterval(cabecalho, 800);
  /* lupa: busca processos; Enter abre a Triagem com o termo na Busca avançada */
  D.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#searchBtn'); if (!b) return; e.preventDefault(); e.stopPropagation();
    var pop = $('#au-lupa'); if (pop) { pop.remove(); return; }
    pop = D.createElement('form'); pop.id = 'au-lupa'; pop.setAttribute('role', 'search');
    var r = b.getBoundingClientRect(); pop.style.top = (r.bottom + 8) + 'px'; pop.style.right = Math.max(8, innerWidth - r.right) + 'px';
    pop.innerHTML = '<input type="search" placeholder="Número, parte, classe, assunto ou etiqueta…" aria-label="Buscar processos"><button type="submit">Buscar</button><small>Enter abre a Triagem com o termo na Busca avançada</small>';
    D.body.appendChild(pop); var inp = pop.querySelector('input'); inp.focus();
    pop.addEventListener('submit', function (ev) { ev.preventDefault(); var q = inp.value.trim(); pop.remove(); if (!q) return; buscarNaTriagem(q); });
    inp.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') pop.remove(); });
  }, true);
  D.addEventListener('click', function (e) { var p = $('#au-lupa'); if (p && !p.contains(e.target) && !(e.target.closest && e.target.closest('#searchBtn'))) p.remove(); }, true);
  function buscarNaTriagem(q) {
    if (!D.body.classList.contains('cmt-acv')) irSub('central');
    var n = 0, t = setInterval(function () { var c = comp(); if ((c && D.body.classList.contains('cmt-acv')) || ++n > 40) { clearInterval(t); if (!c) return;
      try { c.setState({ search: q, limit: (c.props && c.props.pageSize) || 60 }); } catch (er) {}
      var d = q.replace(/\D/g, ''); if (d.length >= 15) { var r = c.rows.find(function (x) { return String(x.Processo || x.processo || '').replace(/\D/g, '') === d; }); if (r) setTimeout(function () { try { fichaNoLugar(r.Processo || r.processo); } catch (er) {} }, 300); }
      aviso('Busca na Triagem: “' + q + '”.'); } }, 150);
  }
  /* abas antigas do CMT-Acervo: saem do monitor (ficam num HTML próprio) */
  var ANTIGAS_FORA = false;
  function tirarAntigas() {
    if (ANTIGAS_FORA || !W.__acvUnico || !ACV.recs) return; ANTIGAS_FORA = true;
    D.querySelectorAll('#main > .tabpane').forEach(function (p) { if (p.id !== 'acervo' && p.id !== 'relatorios') { p.innerHTML = ''; p.hidden = true; p.dataset.fora = '1'; } });
    D.querySelectorAll('nav.mods .mod[data-tab]').forEach(function (b) { if (b.dataset.tab !== 'acervo') b.remove(); });
    D.querySelectorAll('#index .ix-g[data-tab]').forEach(function (g) { if (g.dataset.tab !== 'acervo') g.remove(); });
  }
  setInterval(tirarAntigas, 1000);
  var cssH = D.createElement('style');
  cssH.textContent =
    '#main>.tabpane[data-fora]{display:none!important}' +
    '#au-pilula{display:inline-flex;align-items:stretch;border:1px solid rgba(255,255,255,.22);border-radius:999px;overflow:hidden;background:rgba(255,255,255,.06)}' +
    '#au-pilula>button{border:0!important;border-radius:0!important;background:transparent!important;color:#eef2f5!important;margin:0!important;min-height:34px;display:inline-flex;align-items:center;gap:7px;padding:6px 13px!important;font:700 13px Figtree,system-ui,sans-serif!important;cursor:pointer}' +
    '#au-pilula>button:hover{background:rgba(255,255,255,.1)!important}#au-pilula>#cmtCfgBtn{border-left:1px solid rgba(255,255,255,.22)!important;padding:6px 12px!important}' +
    '#cmtConBtn i{width:8px;height:8px;border-radius:50%;background:#e6c27a;box-shadow:0 0 0 2px rgba(230,194,122,.25)}#cmtConBtn i.ok{background:#4fbf8f;box-shadow:0 0 0 2px rgba(79,191,143,.25)}#cmtConBtn.au-off{background:transparent!important;color:#f1dfb5!important}' +
    '#au-lupa{position:fixed;z-index:2147481000;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 8px;width:min(420px,calc(100vw - 16px));padding:10px;border-radius:14px;background:#0f1f2e;border:1px solid rgba(230,194,122,.4);box-shadow:0 14px 40px rgba(0,0,0,.35);font-family:Figtree,system-ui,sans-serif}' +
    '#au-lupa input{min-width:0;padding:9px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:#0b1824;color:#fff;font:14px Figtree,system-ui,sans-serif}#au-lupa button{border:0;border-radius:999px;background:#e6c27a;color:#14263c;font:800 13px Figtree,system-ui,sans-serif;padding:0 14px;cursor:pointer}#au-lupa small{grid-column:1/-1;color:#9fb0c0;font-size:11.5px}';
  D.head.appendChild(cssH);

  /* =================== Acervo Central: o cartão "Acervo filtrado" do index, com as situações =================== */
  function cartaoFiltro() {
    var w = mw(), md = w && w.document, c = comp(); if (!md || !c || !ACV.recs || typeof ACS === 'undefined') return;
    var top = md.querySelector('.central-search-top'); if (!top) return;
    if (!md.getElementById('cmt-filtro-css')) { var st = md.createElement('style'); st.id = 'cmt-filtro-css'; st.textContent = CSS_FILTRO; md.head.appendChild(st); }
    var card = md.getElementById('cmt-filtro');
    if (!card) { card = md.createElement('div'); card.id = 'cmt-filtro'; card.addEventListener('click', cliqueFiltro); }
    if (top.firstElementChild !== card) top.prepend(card);
    var all = {}, cam = 0; ACV.recs.forEach(function (o) { if (o.caminho) cam++; else all[o.sit] = (all[o.sit] || 0) + 1; });
    var filt = 0; try { filt = c.filteredCentral().length; } catch (e) {}
    var pk = acsPresetKey(), comCam = ACV.st.f.cam === 'com';
    var vis = 0; Object.keys(all).forEach(function (k) { if (!ACS.hide.has(k)) vis += all[k]; }); if (comCam) vis += cam;
    var desc = (ACS_PRESETS.find(function (x) { return x[0] === pk; }) || [, , 'Seleção personalizada de situações'])[2];
    var html = '<div class="cf-h"><span>Acervo filtrado</span><em>' + esc(acsPresetName()) + (comCam ? ' + a caminho' : '') + '</em></div>' +
      '<div class="cf-n"><b>' + nf(filt) + '</b><small>de ' + nf(vis) + ' processos nas situações marcadas · ' + nf(ACV.recs.length) + ' no banco</small></div>' +
      '<div class="cf-pre" role="group" aria-label="Situações predefinidas">' + ACS_PRESETS.map(function (x) { return '<button type="button" data-cfpre="' + x[0] + '" title="' + esc(x[2]) + '" class="' + (pk === x[0] ? 'on' : '') + '">' + esc(x[1]) + '</button>'; }).join('') + '<small>' + esc(desc) + '</small></div>' +
      '<div class="cf-sit" role="group" aria-label="Situações visíveis">' + SIT.filter(function (x) { return all[x.k]; }).map(function (x) { var on = !ACS.hide.has(x.k);
        return '<button type="button" data-cfsit="' + x.k + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" title="' + esc(x.d) + '" style="--fc:' + cor(x.c) + '"><i></i><span>' + esc(x.t) + '</span><b>' + nf(all[x.k]) + '</b></button>'; }).join('') +
      (cam ? '<button type="button" data-cfcam="1" class="' + (comCam ? 'on' : '') + '" aria-pressed="' + comCam + '" title="Ainda sem tarefa no PJe do gabinete (distribuição, UFOR)" style="--fc:#1b3553"><i></i><span>A caminho do gabinete</span><b>' + nf(cam) + '</b></button>' : '') + '</div>';
    if (card.__h !== html) { card.innerHTML = html; card.__h = html; }
  }
  var CORES = {};
  function cor(v) { if (CORES[v]) return CORES[v]; var host = $('#acervo') || D.body, sp = D.createElement('span'); sp.style.color = /^--/.test(v) ? 'var(' + v + ')' : v; host.appendChild(sp); var x = getComputedStyle(sp).color; sp.remove(); return (CORES[v] = (x && x !== 'rgba(0, 0, 0, 0)' ? x : '#6b7b8d')); }
  function cliqueFiltro(e) {
    var b = e.target.closest('button'); if (!b) return; e.preventDefault();
    if (b.dataset.cfpre) { var p = ACS_PRESETS.find(function (x) { return x[0] === b.dataset.cfpre; }); if (!p) return;
      var l = p[3] || SIT.map(function (x) { return x.k; }).filter(function (k) { return ACS_ENC.indexOf(k) < 0; }); acsSetHide(l.slice()); }
    else if (b.dataset.cfsit) { var h = new Set(ACS.hide), k = b.dataset.cfsit; h.has(k) ? h.delete(k) : h.add(k); acsSetHide(Array.from(h)); }
    else if (b.dataset.cfcam) { if (ACV.st.f.cam === 'com') delete ACV.st.f.cam; else ACV.st.f.cam = 'com'; try { acvRender(); } catch (er) {} }
    else return;
    var c = comp(); try { c.setState({ limit: (c.props && c.props.pageSize) || 60 }); } catch (er) {}
    setTimeout(cartaoFiltro, 60);
  }
  var CSS_FILTRO =
    '#pv-stats{display:none!important}.cmt-agrup{display:none!important}' +
    '.central-search-panel{order:-2}#cmt-filtro+div{display:none!important}' +
    '#cmt-filtro{flex:1 1 100%;min-width:0;background:#fff;border:1px solid #e1dcd2;border-radius:12px;padding:12px 14px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 18px;align-items:start;font-family:Figtree,system-ui,sans-serif;color:#14263c}' +
    '#cmt-filtro .cf-h{grid-column:1;display:flex;flex-direction:column;gap:2px}#cmt-filtro .cf-h span{font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7e8b99}#cmt-filtro .cf-h em{font-style:normal;font-size:12px;font-weight:800;color:#8a6116}' +
    '#cmt-filtro .cf-n{grid-column:1;grid-row:2/4}#cmt-filtro .cf-n b{display:block;font-size:30px;font-weight:800;line-height:1}#cmt-filtro .cf-n small{display:block;max-width:190px;margin-top:4px;font-size:11px;color:#6d7b8a;line-height:1.35}' +
    '#cmt-filtro .cf-pre{grid-column:2;grid-row:1;display:flex;flex-wrap:wrap;align-items:center;gap:5px}#cmt-filtro .cf-pre small{flex:1 1 220px;font-size:11px;color:#7e8b99;min-width:0}' +
    '#cmt-filtro .cf-pre button{border:1px solid #d8d2c6;background:#fbfaf7;color:#1b3553;border-radius:999px;padding:5px 11px;font:800 11px Figtree,system-ui,sans-serif;cursor:pointer}#cmt-filtro .cf-pre button:hover{border-color:#1b3553}#cmt-filtro .cf-pre button.on{background:#1b3553;border-color:#1b3553;color:#fff}' +
    '#cmt-filtro .cf-sit{grid-column:2;grid-row:2/4;display:flex;flex-wrap:wrap;gap:5px}' +
    '#cmt-filtro .cf-sit button{display:inline-flex;align-items:center;gap:6px;border:1px solid #e1dcd2;background:#fff;color:#8a96a3;border-radius:999px;padding:4px 9px 4px 7px;font:650 11.5px Figtree,system-ui,sans-serif;cursor:pointer}' +
    '#cmt-filtro .cf-sit button i{width:9px;height:9px;border-radius:50%;border:2px solid var(--fc);background:transparent;flex:0 0 auto}#cmt-filtro .cf-sit button b{font-size:11px;color:inherit;font-weight:800}' +
    '#cmt-filtro .cf-sit button.on{color:#14263c;border-color:color-mix(in srgb,var(--fc) 45%,#e1dcd2);background:color-mix(in srgb,var(--fc) 9%,#fff)}#cmt-filtro .cf-sit button.on i{background:var(--fc)}' +
    '#cmt-filtro button:focus-visible{outline:2px solid #c4953c;outline-offset:2px}' +
    '@media (max-width:760px){#cmt-filtro{grid-template-columns:minmax(0,1fr)}#cmt-filtro .cf-h,#cmt-filtro .cf-n,#cmt-filtro .cf-pre,#cmt-filtro .cf-sit{grid-column:1;grid-row:auto}}';
  setInterval(function () { if (D.body.classList.contains('cmt-acv')) cartaoFiltro(); }, 500);

  /* Triagem: escaninhos no painel esquerdo */
  function escaninhos() {
    var g = $('#index .ix-g.cmt[data-cmt="triagem"]'), c = comp(); if (!g || !c || !Array.isArray(c.escaninhos)) return;
    var box = g.querySelector('.au-esc'); if (!box) { box = D.createElement('div'); box.className = 'au-esc'; g.appendChild(box);
      box.addEventListener('click', function (e) { var a = e.target.closest('[data-au-esc]'); if (!a) return; e.preventDefault(); escNaPlanilha(a.dataset.auEsc); }); }
    var ids = new Set(c.escaninhos.map(function (x) { return x.id; })), cont = {}, band = 0;
    try { c.triagemRows().forEach(function (x) { var k = ids.has(x.r._escaninho) ? x.r._escaninho : ''; if (k) cont[k] = (cont[k] || 0) + 1; else band++; }); } catch (e) {}
    var aberto = ESCF.id || '';
    var html = '<span class="k">Escaninhos</span>' + '<a href="#" data-au-esc="__bandeja" class="' + (!aberto ? 'on' : '') + '"><em class="dot" style="background:#8a96a3"></em><span>Bandeja (sem escaninho)</span><b>' + nf(band) + '</b></a>' +
      (c.escaninhos.length ? c.escaninhos.map(function (x) { return '<a href="#" data-au-esc="' + esc(x.id) + '" class="' + (aberto === x.id ? 'on' : '') + '"><em class="dot" style="background:' + esc(x.cor || '#2f6690') + '"></em><span>' + esc(x.titulo || 'Sem título') + '</span><b>' + nf(cont[x.id] || 0) + '</b></a>'; }).join('') : '<p class="s">Nenhum escaninho criado. Use “+ Novo escaninho” na página.</p>');
    if (box.__h !== html) { box.innerHTML = html; box.__h = html; }
  }
  /* =================== Pautas =================== 
     Painel esquerdo: Nova sessão e a lista das sessões. Cada sessão abre a sua página, com os marcos no cabeçalho
     e duas versões: a pré-pauta (seleção prévia feita no aplicativo) e a pós-pauta (planilha de controle, da pauta importada do PDF).
     Em ambas: Baixar (Excel no padrão Controle de Pauta, CSV, lista simplificada em PDF e estatísticas em PDF).
     Tudo fica no JSON do procs-muta; o Excel sai pelo Baixar. */
  var SES = { id: '', v: '' }, pdfPara = '';
  function isoBr(s) { var m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(String(s || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  function isoData(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? m[0] : isoBr(s); }
  var DSEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  function dataBr(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : iso || ''; }
  function diaSem(iso) { var d = new Date(iso + 'T12:00:00Z'); return isNaN(d) ? '' : DSEM[d.getUTCDay()]; }
  function hojeIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function diasAte(iso) { if (!iso) return null; var a = new Date(hojeIso() + 'T12:00:00Z'), b = new Date(isoData(iso) + 'T12:00:00Z'); return isNaN(b) ? null : Math.round((b - a) / 864e5); }
  function contagem(iso) { var n = diasAte(iso); return n == null ? '' : n < 0 ? 'vencido há ' + (-n) + ' d' : n === 0 ? 'hoje' : 'faltam ' + n + ' d'; }
  /* pré-pauta: processos com seleção prévia, por data da sessão de destino */
  function prePautas(c) {
    var nomes = {}, det = c.sessionDetails || {}, out = {};
    (c.sessions || []).forEach(function (n) { nomes[n] = isoData((det[n] || {}).date) || isoBr(n); });
    (c.rows || []).forEach(function (r) {
      if (r['Seleção Prévia'] !== 'SELECIONADO PREVIAMENTE') return;
      var n = r['Sessão Destino'] || '', d = nomes[n] || isoData((det[n] || {}).date) || isoBr(n); if (!d) return;
      var o = out[d] || (out[d] = { n: 0, nome: n }); o.n++; if (!o.nome) o.nome = n;
    });
    return out;
  }
  function sessaoPorId(id) { var w = mw(), S = w && w.CMTSessao && w.CMTSessao.estado(); return S ? (S.sessoes || []).find(function (x) { return x.id === id; }) : null; }
  function aviso(txt) { var t = $('#au-pau-toast'); if (!t) { t = D.createElement('div'); t.id = 'au-pau-toast'; t.setAttribute('role', 'status'); D.body.appendChild(t); } t.textContent = txt; t.classList.add('on'); clearTimeout(t.__t); t.__t = setTimeout(function () { t.classList.remove('on'); }, 3800); }
  function pdfInput() {
    var fi = $('#au-pau-pdf'); if (fi) return fi;
    fi = D.createElement('input'); fi.type = 'file'; fi.accept = '.pdf,.json,.txt'; fi.hidden = true; fi.id = 'au-pau-pdf'; D.body.appendChild(fi);
    fi.addEventListener('change', function () {
      var f = fi.files && fi.files[0], ww = mw(); if (!f || !ww || !ww.CMTSessao) return; var id = pdfPara; pdfPara = '';
      Promise.resolve(ww.CMTSessao.importar(f, id)).then(function () { try { var S = ww.CMTSessao.estado(); SES = { id: S.atual || id, v: 'pos' }; } catch (e) {} pautas(); });
    });
    return fi;
  }
  /* abre a página da sessão na versão pedida (pre | pos); sem versão, a pós-pauta se houver pauta, senão a pré-pauta */
  function abrirSessao(id, v) {
    var w = mw(), c = comp(), ss = sessaoPorId(id); if (!w || !c || !ss) return;
    var np = w.CMTSessao.previa(id);
    if (!v) v = (ss.itens || []).length || !np ? 'pos' : 'pre';
    if (v === 'imp') { pdfPara = id; var fi = pdfInput(); fi.value = ''; fi.click(); return; }
    if (v === 'pre' && (!np || (ss.itens || []).length)) v = 'pos';   /* pauta importada: a pré-pauta fica encerrada */
    w.CMTSessao.abrirSessao(id, v);
    SES = { id: id, v: v }; pautas();
  }
  function visaoGeral() { var w = mw(); SES = { id: '', v: '' }; if (w && w.CMTMotor) w.CMTMotor.ir('sessoes'); pautas(); }
  /* painel esquerdo: Nova sessão e as sessões */
  function pautasIndex(c, CS) {
    var g = $('#index .ix-g.cmt[data-cmt="pautas"]'); if (!g) return;
    var box = g.querySelector('.au-pau');
    if (!box) {
      box = D.createElement('div'); box.className = 'au-esc au-pau'; g.appendChild(box);
      var nv = D.createElement('div'); nv.className = 'au-nova'; g.insertBefore(nv, box);
      nv.innerHTML = '<span class="k">Nova sessão</span><form><input type="date" required aria-label="Data do julgamento"><button type="submit" title="Cadastrar a sessão" aria-label="Cadastrar a sessão">+</button></form>';
      nv.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault(); var ww = mw(), inp = nv.querySelector('input'); if (!ww || !ww.CMTSessao) return;
        var r = ww.CMTSessao.novaSessao(inp.value); if (r.erro) { aviso(r.erro); return; }
        inp.value = ''; aviso('Sessão de ' + dataBr(ww.CMTSessao.estado().sessoes.find(function (x) { return x.id === r.id; }).data) + ' cadastrada.'); abrirSessao(r.id);
      });
      box.addEventListener('click', function (e) { var a = e.target.closest('[data-au-ses]'); if (!a) return; e.preventDefault(); if (a.dataset.auSes === '__todas') visaoGeral(); else abrirSessao(a.dataset.auSes); });
    }
    var S = CS.estado() || {}, L = (S.sessoes || []).slice(), hj = hojeIso(), pre = prePautas(c);
    var fut = L.filter(function (x) { return (x.data || '') >= hj; }).sort(function (a, b) { return a.data.localeCompare(b.data); }),
      pas = L.filter(function (x) { return (x.data || '') < hj; }).sort(function (a, b) { return b.data.localeCompare(a.data); });
    function linha(ss) {
      var n = (ss.itens || []).length, p = pre[ss.data], cor = n ? '#4f9d69' : p && p.n ? '#c4953c' : '#8a96a3',
        tit = n ? 'pauta importada' : p && p.n ? 'só seleção prévia' : 'sem pauta';
      return '<a href="#" data-au-ses="' + esc(ss.id) + '" class="' + (SES.id === ss.id ? 'sel' : '') + '" title="' + tit + '"><em class="dot" style="background:' + cor + '"></em><span>' + esc(dataBr(ss.data)) +
        ' <small>' + esc(diaSem(ss.data).slice(0, 3)) + '</small></span><b>' + (n ? nf(n) : p && p.n ? nf(p.n) : '—') + '</b></a>';
    }
    var html = '<span class="k">Sessões</span><a href="#" data-au-ses="__todas" class="todas' + (!SES.id ? ' sel' : '') + '"><em class="dot" style="background:transparent"></em><span>Visão geral</span><b></b></a>' +
      (L.length ? (fut.length ? '<span class="gk">Próximas</span>' + fut.map(linha).join('') : '') + (pas.length ? '<span class="gk">Realizadas</span>' + pas.map(linha).join('') : '')
        : '<p class="s">Nenhuma sessão cadastrada.</p>') +
      '<p class="lg"><span><i style="background:#4f9d69"></i>pauta importada</span><span><i style="background:#c4953c"></i>só seleção prévia</span></p>';
    if (box.__h !== html) { box.innerHTML = html; box.__h = html; }
  }
  /* página da sessão: cabeçalho com a data, os marcos, a versão (pré-pauta | pós-pauta), Baixar e Planilha pronta */
  var MARCOS = [['pauta', 'Peço dia'], ['inicio', 'Início da preparação'], ['minutas', 'Prazo das minutas'], ['liberacao', 'Liberação dos votos']];
  function sessaoBar(c, CS) {
    var md = mw() && mw().document; if (!md || !md.body) return;
    var aba = ''; try { aba = CS.aba(); } catch (e) {}
    var S = CS.estado() || {}, tab = (c.state || {}).tab;
    if (aba === 'planilha' && S.atual) SES = { id: S.atual, v: CS.versao() };
    else SES = { id: '', v: '' };
    var ss = SES.id ? sessaoPorId(SES.id) : null;
    var bar = md.__sesbar, pre = md.__prebar;
    if (!bar) {
      cssMotor('cmt-sesbar-css', '#cmt-sesbar{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;font-family:Figtree,system-ui,sans-serif}#cmt-sesbar .l1,#cmt-sesbar .l2{display:flex;align-items:center;gap:14px;flex-wrap:wrap}' +
        '#cmt-sesbar .sd small{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#d8b46a;font-weight:800}#cmt-sesbar .sd b{display:block;font-size:17px;font-weight:800;color:#fff;white-space:nowrap}#cmt-sesbar .sd b em{font-style:normal;font-weight:600;font-size:13px;color:#c8cfdc;margin-left:6px}' +
        '#cmt-sesbar .sv{display:inline-flex;padding:3px;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);gap:3px}' +
        '#cmt-sesbar .sv button{all:unset;cursor:pointer;display:flex;flex-direction:column;padding:6px 14px;border-radius:9px;color:#dfe5ee;min-width:150px}#cmt-sesbar .sv button span{font-size:13px;font-weight:800}#cmt-sesbar .sv button small{display:block;font-size:11px;color:#aab4c3;text-transform:none;letter-spacing:0;font-weight:500}' +
        '#cmt-sesbar .sv button:hover{background:rgba(255,255,255,.08)}#cmt-sesbar .sv button[aria-pressed=true]{background:#c4953c;color:#1f2442}#cmt-sesbar .sv button[aria-pressed=true] small{color:#3a3320}' +
        '#cmt-sesbar .sv button[disabled]{cursor:default;opacity:.45}#cmt-sesbar button:focus-visible{outline:2px solid #e6c27a;outline-offset:2px}' +
        '#cmt-sesbar .ac{margin-left:auto;display:flex;gap:8px;align-items:center}#cmt-sesbar .bt{all:unset;cursor:pointer;font-size:12.5px;font-weight:700;color:#e6ebf2;padding:7px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.22);white-space:nowrap}#cmt-sesbar .bt:hover{border-color:#e6c27a;color:#fff}' +
        '#cmt-sesbar .bt.gold{background:#c4953c;border-color:#c4953c;color:#1f2442}#cmt-sesbar .bt.gold:hover{background:#d4a64c}#cmt-sesbar .bt.ok{background:rgba(124,107,196,.22);border-color:rgba(160,146,230,.6)}' +
        '#cmt-sesbar .l2{gap:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.1)}#cmt-sesbar .l2 label{display:flex;flex-direction:column;gap:2px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#aab4c3;font-weight:800}' +
        '#cmt-sesbar .l2 input{all:unset;box-sizing:border-box;font:600 12.5px Figtree,system-ui,sans-serif;color:#fff;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:4px 8px;min-width:128px;color-scheme:dark}#cmt-sesbar .l2 input[type=time]{min-width:92px}' +
        '#cmt-sesbar .l2 label i{font-style:normal;text-transform:none;letter-spacing:0;font-weight:600;font-size:11px;color:#c8cfdc;min-height:14px}#cmt-sesbar .l2 label i.v{color:#f0a3a3}#cmt-sesbar .l2 label i.p{color:#f1d28a}' +
        '#cmt-baixar{position:fixed;z-index:2147483646;min-width:290px;padding:6px;border-radius:12px;background:#1f2442;border:1px solid rgba(230,194,122,.35);box-shadow:0 14px 40px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:2px;font-family:Figtree,system-ui,sans-serif}' +
        '#cmt-baixar button{all:unset;cursor:pointer;display:block;padding:9px 12px;border-radius:9px;color:#eef2f5}#cmt-baixar button b{display:block;font-size:13.5px;font-weight:700}#cmt-baixar button small{display:block;font-size:11.5px;color:#9fb0c0;margin-top:1px}#cmt-baixar button:hover,#cmt-baixar button:focus-visible{background:rgba(255,255,255,.08)}' +
        '#cmt-prebar{position:fixed;top:0;left:0;right:0;z-index:2147483000;background:#1f2442;padding:10px 18px;display:none;box-sizing:border-box}body.cmt-prebar-on #cmt-prebar{display:block}' +
        'body.cmt-sesbar-pos #cs-root .cs-top>div:has(>h1),body.cmt-sesbar-pos #cs-root .cs-marcos,body.cmt-sesbar-pos #cs-root .cs-top>.cs-sp{display:none}body.cmt-sesbar-pos #cs-root [data-cs="xlsx"]{display:none}#cs-root .cs-top>#cmt-sesbar{flex:1 1 0;min-width:min(760px,100%)}');
      bar = md.createElement('div'); bar.id = 'cmt-sesbar';
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-ses-v],[data-ses-a]'); if (!b || b.disabled) return;
        if (b.dataset.sesA === 'todas') { visaoGeral(); return; }
        if (b.dataset.sesA === 'baixar') { menuBaixar(b); return; }
        if (b.dataset.sesA === 'copiar') { copiarProcessos(b); return; }
        abrirSessao(SES.id, b.dataset.sesV);
      });
      bar.addEventListener('change', function (e) {
        var t = e.target, ww = mw(); if (!ww || !ww.CMTSessao || !SES.id) return;
        if (t.dataset.fase) ww.CMTSessao.fase(SES.id, t.dataset.fase, t.value); else if (t.dataset.hora != null) ww.CMTSessao.hora(SES.id, t.value);
        bar.__h = ''; pautas();
      });
      pre = md.createElement('div'); pre.id = 'cmt-prebar'; md.body.appendChild(pre); md.__sesbar = bar; md.__prebar = pre;
    }
    md.body.classList.remove('cmt-prebar-on');
    md.body.classList.toggle('cmt-sesbar-pos', !!ss);
    if (!ss) { if (bar.parentNode) bar.parentNode.removeChild(bar); md.body.style.paddingTop = ''; fecharBaixar(); return; }
    var alvo = md.querySelector('#cs-root .cs-top');
    if (alvo && bar.parentNode !== alvo) alvo.insertBefore(bar, alvo.firstChild);
    var np = CS.previa(ss.id), p = { n: np }, n = (ss.itens || []).length, f = ss.fases || {};
    var marcos = MARCOS.map(function (m) { var v = f[m[0]] || '', ct = m[0] === 'minutas' || m[0] === 'liberacao' ? contagem(v) : '', dn = diasAte(v);
      return '<label>' + m[1] + '<input type="date" data-fase="' + m[0] + '" value="' + esc(v) + '"><i class="' + (dn != null && dn < 0 ? 'v' : dn != null && dn <= 3 ? 'p' : '') + '">' + esc(ct) + '</i></label>'; }).join('');
    var html = '<div class="l1"><div class="sd"><small>Sessão de julgamento</small><b>' + esc(dataBr(ss.data)) + '<em>' + esc(diaSem(ss.data)) + ' · ' + esc(contagem(ss.data).replace('faltam', 'faltam').replace('vencido há', 'realizada há')) + '</em></b></div>' +
      '<div class="sv" role="group" aria-label="Versão da pauta">' +
      '<button type="button" data-ses-v="pre" aria-pressed="' + (SES.v === 'pre') + '"' + (n ? ' disabled title="Pauta oficial importada: a pré-pauta foi encerrada"' : p && p.n ? '' : ' disabled title="A seleção prévia desta sessão não foi feita no aplicativo"') + '><span>Pré-pauta</span><small>' + (n ? 'encerrada · pauta importada' : p && p.n ? 'seleção prévia · ' + nf(p.n) + ' processos' : 'sem seleção prévia') + '</small></button>' +
      '<button type="button" data-ses-v="' + (n || SES.v !== 'pos' ? 'pos' : 'imp') + '" aria-pressed="' + (SES.v === 'pos') + '"><span>Pós-pauta</span><small>' + (n ? 'planilha de controle · ' + nf(n) + ' processos' : SES.v === 'pos' ? 'importar o PDF da pauta' : 'pauta ainda não importada') + '</small></button></div>' +
      '<div class="ac">' + ((SES.v === 'pre' && np) || (SES.v === 'pos' && n) ? '<button type="button" class="bt" data-ses-a="copiar" title="Copia os números dos processos desta versão, um por linha">⧉ Copiar processos</button><button type="button" class="bt" data-ses-a="baixar" aria-haspopup="menu">⇩ Baixar ▾</button>' : '') +
      '<button type="button" class="bt" data-ses-a="todas">‹ Todas as sessões</button></div></div>' +
      '<div class="l2"><label>Hora<input type="time" data-hora value="' + esc(ss.hora || '') + '"><i></i></label>' + marcos + '</div>';
    if (bar.__h !== html && !(bar.contains(md.activeElement) && md.activeElement.tagName === 'INPUT')) { bar.innerHTML = html; bar.__h = html; }
    if (md.body.style.paddingTop) md.body.style.paddingTop = '';
  }
  function pautas() {
    var w = mw(), c = comp(), CS = w && w.CMTSessao; if (!c || !CS) return;
    pautasIndex(c, CS); sessaoBar(c, CS);
  }

  /* ---------- Baixar: os dados da versão aberta, num formato só ---------- */
  function cnjFmt(v) { var d = String(v || '').replace(/\D/g, ''); return d.length === 20 ? d.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6') : String(v || ''); }
  function siglaClasse(c) { var t = String(c || '').toUpperCase(); if (!t) return ''; if (/AGRAVO DE INSTRUMENTO/.test(t)) return 'AI'; if (/APELA[ÇC][ÃA]O\s*\/\s*REMESSA|APELA[ÇC][ÃA]O E REMESSA|APREMNEC/.test(t)) return 'ApRemNec'; if (/REMESSA NECESS/.test(t)) return 'RemNec'; if (/APELA[ÇC][ÃA]O/.test(t)) return 'ApCiv'; return String(c); }
  function apreciacao(j) { var t = String(j || ''); if (/^ED$|embarg/i.test(t)) return 'ED'; if (/agint|agravo interno/i.test(t)) return 'AgInt'; if (/^JR$|retrat/i.test(t)) return 'Retrat'; if (/^QO$|quest[ãa]o de ordem/i.test(t)) return 'QO'; return '1º julg'; }
  function metaSigla(L) { var out = []; [].concat(L || []).forEach(function (m) { String(m || '').replace(/META\s*(\d+\s*[AB]?)/gi, function (_, n) { out.push('M' + n.replace(/\s/g, '').toUpperCase()); return ''; }); if (/^\s*META\s*$/i.test(String(m))) out.push('M?'); }); return out.filter(function (x, i) { return out.indexOf(x) === i; }); }
  function dadosSessao() {
    var c = comp(), w = mw(), ss = SES.id ? sessaoPorId(SES.id) : null; if (!c || !w || !ss) return null;
    var L = [];
    L = w.CMTSessao.linhas(ss.id, SES.v).map(function (x) { var ms = metaSigla(x.metas), des = /^(Julgado|Retirado|Adiado)$/.test(x.resultado) ? x.resultado : '';
        return { item: x.item, cnj: cnjFmt(x.cnj), classe: siglaClasse(x.classe), classeTxt: x.classe, assunto: x.assunto, secao: x.secao, apreciacao: apreciacao(x.julg), meta: ms.join(' '),
          servidor: x.servidor, revisor: x.corretor, minutado: x.dataMinuta, etapa: x.dataLiberacao ? 'Liberado' : x.dataCorrecao ? 'Corrigido' : x.dataMinuta ? 'Minutado' : 'A fazer',
          desfecho: des, intercorrencia: des ? '' : x.resultado, detalhes: x.obs, dist: x.dist, tarefa: x.tarefa, prioridade: x.prioridade, anteriores: (x.anteriores || []).join('; '), foraDoAcervo: !x.noAcervo }; });
    var f = ss.fases || {};
    return { ss: ss, pre: SES.v === 'pre', versao: SES.v === 'pre' ? 'Pré-pauta (seleção prévia)' : 'Pós-pauta (planilha de controle)', data: ss.data, hora: ss.hora || '', minutas: f.minutas || '', liberacao: f.liberacao || '', pauta: f.pauta || '', inicio: f.inicio || '', linhas: L };
  }
  function nomeArq(d, ext, tipo) { var dt = dataBr(d.data).replace(/\//g, '-'); return (tipo || (d.pre ? 'Previa_Sessao_' : 'Pauta_Sessao_')) + dt + '.' + ext; }
  function baixarBlob(nome, blob) { var a = D.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; D.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
  var CAB = ['Item', 'Processo', 'Classe', 'Assunto', 'Detalhes', 'Pendências', 'Etapa', 'Minutado em', 'Servidor', 'Revisor', 'Intervenção MPF', 'Parecer MPF', 'Preliminares', 'Tempestividade', 'Preparo', 'Representação', 'Mídias', 'Resultado', 'Consectários', 'Honorários', 'Tópico-síntese', 'Desfecho', 'Intercorrência', 'Meta', 'Apreciação'];
  function valoresLinha(x) { return [x.item, x.cnj, x.classe, x.assunto, x.detalhes || '', '', x.etapa, dataBr(x.minutado), x.servidor, x.revisor, '', '', '', 'Não verificado', 'Não verificado', 'Não verificado', 'Não verificado', '', '', '', '', x.desfecho, x.intercorrencia || '', x.meta, x.apreciacao]; }
  function baixarCsv(d) {
    var q = function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var txt = '﻿' + [CAB.join(';')].concat(d.linhas.map(function (x) { return valoresLinha(x).map(q).join(';'); })).join('\r\n');
    baixarBlob(nomeArq(d, 'csv'), new Blob([txt], { type: 'text/csv;charset=utf-8' }));
  }
  /* Excel no padrão Controle de Pauta: o modelo da sessão (pasta CMT - Pautas de Julgamento) preenchido a partir da linha 21 */
  var MODELO_PAUTA = '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', MODELO = null;
  async function modeloPauta() {
    if (MODELO) return MODELO;
    var bytes = Uint8Array.from(atob(MODELO_PAUTA), function (ch) { return ch.charCodeAt(0); });
    MODELO = JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    return MODELO;
  }
  var CRCT = (function () { var t = [], c; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u) { var c = 0xFFFFFFFF; for (var i = 0; i < u.length; i++) c = CRCT[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zipar(arqs) {   /* zip sem compressão (o xlsx aceita) */
    var enc = new TextEncoder(), partes = [], central = [], off = 0, d0 = new Date(), dt = ((d0.getFullYear() - 1980) << 9) | ((d0.getMonth() + 1) << 5) | d0.getDate();
    arqs.forEach(function (f) {
      var nm = enc.encode(f[0]), dd = typeof f[1] === 'string' ? enc.encode(f[1]) : f[1], crc = crc32(dd);
      var h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, 0, true); h.setUint16(12, dt, true);
      h.setUint32(14, crc, true); h.setUint32(18, dd.length, true); h.setUint32(22, dd.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      partes.push(new Uint8Array(h.buffer), nm, dd);
      var c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, dt, true);
      c.setUint32(16, crc, true); c.setUint32(20, dd.length, true); c.setUint32(24, dd.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + dd.length;
    });
    var tam = central.reduce(function (s, a) { return s + a.length; }, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, arqs.length, true); e.setUint16(10, arqs.length, true); e.setUint32(12, tam, true); e.setUint32(16, off, true);
    return new Blob(partes.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function serialData(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoData(iso)); return m ? (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 864e5 : null; }
  function xq(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''); }
  async function xlsxPauta(d) {
    var M = await modeloPauta(), F = {}; Object.keys(M).forEach(function (k) { F[k] = M[k]; });
    var aba = (d.pre ? 'Prévia ' : 'Sessão ') + dataBr(d.data).slice(0, 5).replace('/', '-');
    F['xl/workbook.xml'] = F['xl/workbook.xml'].split('__ABA__').join(xq(aba));
    var S = F['xl/worksheets/sheet1.xml'];
    function num(ref, v) { if (v == null) return; S = S.replace(new RegExp('<c r="' + ref + '" s="(\\d+)"/>'), '<c r="' + ref + '" s="$1"><v>' + v + '</v></c>'); }
    num('R1', serialData(d.data)); num('E3', serialData(d.minutas)); num('K3', serialData(d.liberacao));
    var L = d.linhas.slice(0, 300), porLinha = {};
    L.forEach(function (x, i) { porLinha[21 + i] = x; });
    S = S.replace(/<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g, function (tudo, rn, attrs, corpo) {
      var x = porLinha[+rn]; if (!x) return tudo;
      var val = { A: [/^\d+$/.test(String(x.item)) ? 'n' : 's', x.item], B: ['s', x.cnj], C: ['s', x.classe], D: ['s', x.assunto], E: ['s', x.detalhes], H: ['n', serialData(x.minutado)], I: ['s', x.servidor], J: ['s', x.revisor],
        V: ['s', x.desfecho], W: ['s', x.intercorrencia], X: ['s', x.meta], Y: ['s', x.apreciacao] };
      if (x.etapa === 'Corrigido' || x.etapa === 'Liberado') val.G = ['s', x.etapa];
      corpo = corpo.replace(/<c r="([A-Y])(\d+)" s="(\d+)"(?: t="str")?(?:\/>|>[\s\S]*?<\/c>)/g, function (cel, col, r, s) {
        var v = val[col]; if (!v || v[1] == null || v[1] === '') return cel;
        return v[0] === 'n' ? '<c r="' + col + r + '" s="' + s + '"><v>' + v[1] + '</v></c>' : '<c r="' + col + r + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + xq(v[1]) + '</t></is></c>';
      });
      return '<row r="' + rn + '"' + attrs + '>' + corpo + '</row>';
    });
    F['xl/worksheets/sheet1.xml'] = S;
    var ord = ['[Content_Types].xml'].concat(Object.keys(F).filter(function (k) { return k !== '[Content_Types].xml'; }));
    return zipar(ord.map(function (k) { return [k, F[k]]; }));
  }
  async function baixarXlsx(d, tipo) {
    if (d.linhas.length > 300) aviso('O modelo comporta 300 processos; os demais ficaram de fora.');
    baixarBlob(nomeArq(d, 'xlsx', tipo), await xlsxPauta(d));
  }

  /* PDF: página de impressão (o navegador salva em PDF) */
  function imprimir(titulo, corpo) {
    var fr = D.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    D.body.appendChild(fr);
    var doc = fr.contentDocument;
    doc.open(); doc.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(titulo) + '</title><style>' + CSS_IMP + '</style></head><body>' + corpo + '</body></html>'); doc.close();
    setTimeout(function () { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) {} setTimeout(function () { fr.remove(); }, 60000); }, 300);
    W.__cmtUltimaImpressao = { titulo: titulo, html: corpo };
  }
  var CSS_IMP = '@page{size:A4 landscape;margin:12mm 11mm}*{box-sizing:border-box}body{margin:0;font:10.5px/1.4 Figtree,Inter,system-ui,Arial,sans-serif;color:#14263c;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.cb{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;border-bottom:2px solid #c4953c;padding-bottom:8px;margin-bottom:10px}.cb small{display:block;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#8a6116;font-weight:800}.cb h1{margin:2px 0 0;font-size:19px}.cb .v{font-size:11px;color:#5d6475}' +
    '.mk{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:10.5px;margin:0 0 10px}.mk b{color:#14263c}.mk span{color:#5d6475}' +
    '.kp{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin:0 0 12px}.kp div{border:1px solid #d9dee6;border-radius:8px;padding:6px 8px}.kp b{display:block;font-size:17px}.kp span{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#5d6475;font-weight:700}' +
    'table{width:100%;border-collapse:collapse}th{text-align:left;font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:#1f2442;padding:5px 6px}td{padding:4px 6px;border-bottom:1px solid #e3e7ed;vertical-align:top}tr{break-inside:avoid}' +
    'td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}td.p{font-family:ui-monospace,Menlo,monospace;font-size:9.5px;white-space:nowrap}.m{color:#b3261e;font-weight:700}' +
    '.gr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}.bx{border:1px solid #d9dee6;border-radius:10px;padding:8px 10px;break-inside:avoid;margin:0 0 12px}.bx h2{margin:0 0 6px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8a6116}' +
    '.bx td{border-bottom:1px solid #eef1f5;padding:3px 4px}.bar{height:7px;border-radius:4px;background:#e9edf3;overflow:hidden;min-width:60px}.bar i{display:block;height:100%;background:#2f6690}.w2{grid-column:span 2}.w3{grid-column:1/-1}' +
    '.rod{margin-top:10px;font-size:9px;color:#8a93a3}';
  function cabecalhoImp(d, tipo, extra) {
    var mk = [['Sessão', dataBr(d.data) + ' (' + diaSem(d.data) + (d.hora ? ', ' + d.hora : '') + ')'], ['Peço dia', dataBr(d.pauta)], ['Início da preparação', dataBr(d.inicio)], ['Prazo das minutas', dataBr(d.minutas) + (d.minutas ? ' · ' + contagem(d.minutas) : '')], ['Liberação dos votos', dataBr(d.liberacao) + (d.liberacao ? ' · ' + contagem(d.liberacao) : '')]]
      .filter(function (x) { return x[1] && x[1] !== ' ()'; });
    return '<div class="cb"><div><small>Gabinete do Des. Fed. Carlos Muta · TRF3 · Turma Regional de MS</small><h1>' + esc(tipo) + ' · Sessão de ' + esc(dataBr(d.data)) + '</h1></div><div class="v">' + esc(d.versao) + '</div></div>' +
      '<div class="mk">' + mk.map(function (x) { return '<span>' + esc(x[0]) + ': <b>' + esc(x[1]) + '</b></span>'; }).join('') + '</div>' + (extra || '');
  }
  function contar(L, f) { var m = {}; L.forEach(function (x) { var ks = [].concat(f(x)); if (!ks.length) ks = ['—']; ks.forEach(function (k) { k = k || '—'; m[k] = (m[k] || 0) + 1; }); }); return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'); }); }
  function kpis(d) {
    var L = d.linhas, t = L.length, min = L.filter(function (x) { return x.etapa !== 'A fazer'; }).length, cor = L.filter(function (x) { return x.etapa === 'Corrigido' || x.etapa === 'Liberado'; }).length, lib = L.filter(function (x) { return x.etapa === 'Liberado'; }).length,
      meta = L.filter(function (x) { return x.meta; }).length, semS = L.filter(function (x) { return !x.servidor; }).length;
    return '<div class="kp"><div><b>' + nf(t) + '</b><span>Processos</span></div><div><b>' + nf(meta) + '</b><span>Com meta CNJ</span></div><div><b>' + nf(min) + '</b><span>Minutados · ' + (t ? Math.round(min / t * 100) : 0) + '%</span></div>' +
      '<div><b>' + nf(cor) + '</b><span>Corrigidos</span></div><div><b>' + nf(lib) + '</b><span>Liberados</span></div><div><b>' + nf(semS) + '</b><span>Sem servidor</span></div></div>';
  }
  function listaSimplificada(d) {
    var L = d.linhas;
    var corpo = cabecalhoImp(d, 'Lista da pauta', kpis(d)) +
      '<table><thead><tr><th>Item</th><th>Processo</th><th>Classe</th><th>Apreciação</th><th>Meta</th><th>Assunto</th><th>Seção</th><th>Servidor</th><th>Revisor</th>' + (d.pre ? '' : '<th>Etapa</th>') + '</tr></thead><tbody>' +
      L.map(function (x) { return '<tr><td class="n">' + esc(x.item) + '</td><td class="p">' + esc(x.cnj) + '</td><td>' + esc(x.classe) + '</td><td>' + esc(x.apreciacao) + '</td><td class="m">' + esc(x.meta) + '</td><td>' + esc(x.assunto) + '</td><td>' + esc(String(x.secao || '').replace(/ Seção.*/, ' Seção')) + '</td><td>' + esc(x.servidor) + '</td><td>' + esc(x.revisor) + '</td>' + (d.pre ? '' : '<td>' + esc(x.etapa) + '</td>') + '</tr>'; }).join('') +
      '</tbody></table><div class="rod">Ab Initio · gerado em ' + esc(new Date().toLocaleString('pt-BR')) + ' · ' + nf(L.length) + ' processos</div>';
    imprimir(nomeArq(d, 'pdf', d.pre ? 'Lista_Previa_' : 'Lista_Pauta_').replace(/\.pdf$/, ''), corpo);
  }
  function tabelaCont(tit, pares, total, cls, lim) {
    var mx = pares.reduce(function (m, p) { return Math.max(m, p[1]); }, 1), rest = lim && pares.length > lim ? pares.slice(lim) : [], vis = lim ? pares.slice(0, lim) : pares;
    if (rest.length) vis = vis.concat([['Outros (' + rest.length + ')', rest.reduce(function (s, p) { return s + p[1]; }, 0)]]);
    return '<div class="bx ' + (cls || '') + '"><h2>' + esc(tit) + '</h2><table>' + vis.map(function (p) { return '<tr><td>' + esc(p[0]) + '</td><td style="width:34%"><div class="bar"><i style="width:' + Math.round(p[1] / mx * 100) + '%"></i></div></td><td class="n"><b>' + nf(p[1]) + '</b></td><td class="n">' + (total ? Math.round(p[1] / total * 100) : 0) + '%</td></tr>'; }).join('') + '</table></div>';
  }
  function idadeFaixa(dist) { var iso = isoData(dist); if (!iso) return 'sem data'; var a = (Date.now() - new Date(iso + 'T12:00:00Z')) / (365.25 * 864e5); return a < 1 ? '< 1 ano' : a < 2 ? '1–2 anos' : a < 3 ? '2–3 anos' : a < 5 ? '3–5 anos' : a < 10 ? '5–10 anos' : '≥ 10 anos'; }
  function estatisticas(d) {
    var L = d.linhas, t = L.length;
    var srv = {}; L.forEach(function (x) { var k = x.servidor || 'Sem servidor'; var o = srv[k] || (srv[k] = { n: 0, min: 0, cor: 0, lib: 0, meta: 0 }); o.n++; if (x.etapa !== 'A fazer') o.min++; if (x.etapa === 'Corrigido' || x.etapa === 'Liberado') o.cor++; if (x.etapa === 'Liberado') o.lib++; if (x.meta) o.meta++; });
    var srvT = '<div class="bx w3"><h2>Por servidor</h2><table><thead><tr><th>Servidor</th><th>Total</th><th>Faltam</th><th>Minutados</th><th>% entregue</th><th>Corrigidos</th><th>Liberados</th><th>Com meta</th></tr></thead><tbody>' +
      Object.keys(srv).sort(function (a, b) { return srv[b].n - srv[a].n; }).map(function (k) { var o = srv[k]; return '<tr><td>' + esc(k) + '</td><td class="n"><b>' + o.n + '</b></td><td class="n">' + (o.n - o.min) + '</td><td class="n">' + o.min + '</td><td class="n">' + Math.round(o.min / o.n * 100) + '%</td><td class="n">' + o.cor + '</td><td class="n">' + o.lib + '</td><td class="n">' + o.meta + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var idades = ['< 1 ano', '1–2 anos', '2–3 anos', '3–5 anos', '5–10 anos', '≥ 10 anos', 'sem data'], ci = contar(L, function (x) { return idadeFaixa(x.dist); }).sort(function (a, b) { return idades.indexOf(a[0]) - idades.indexOf(b[0]); });
    var corpo = cabecalhoImp(d, 'Estatísticas da pauta', kpis(d)) +
      '<div class="gr">' +
      tabelaCont('Apreciação', contar(L, function (x) { return x.apreciacao; }), t) +
      tabelaCont('Classe', contar(L, function (x) { return x.classe || 'Sem classe'; }), t) +
      tabelaCont('Metas do CNJ', contar(L, function (x) { return x.meta ? x.meta.split(' ') : 'Sem meta'; }), t) +
      tabelaCont('Seção competente', contar(L, function (x) { return x.secao || 'Sem seção'; }), t) +
      tabelaCont('Etapa', contar(L, function (x) { return x.etapa; }), t) +
      tabelaCont('Idade (desde a distribuição)', ci, t) +
      tabelaCont('Revisor', contar(L, function (x) { return x.revisor || 'Sem revisor'; }), t) +
      (d.pre ? tabelaCont('Tarefa atual no PJe', contar(L, function (x) { return x.tarefa || '—'; }), t, '', 8) : tabelaCont('Desfecho', contar(L, function (x) { return x.desfecho || x.intercorrencia || 'Sem registro'; }), t)) +
      tabelaCont('Prioridade', contar(L, function (x) { return x.prioridade || 'Sem prioridade'; }), t) +
      srvT +
      tabelaCont('Assuntos (todos)', contar(L, function (x) { return x.assunto || 'Sem assunto'; }), t, 'w3') +
      '</div><div class="rod">Ab Initio · gerado em ' + esc(new Date().toLocaleString('pt-BR')) + ' · ' + nf(t) + ' processos · ' + esc(d.versao) + '</div>';
    imprimir(nomeArq(d, 'pdf', d.pre ? 'Estatisticas_Previa_' : 'Estatisticas_Pauta_').replace(/\.pdf$/, ''), corpo);
  }
  function copiarProcessos(btn) {
    var d = dadosSessao(); if (!d || !d.linhas.length) { aviso('Nenhum processo nesta versão.'); return; }
    var txt = d.linhas.map(function (x) { return x.cnj; }).join('\n'), ok = function () { aviso(nf(d.linhas.length) + ' processos copiados (' + (d.pre ? 'pré-pauta' : 'pós-pauta') + ' de ' + dataBr(d.data) + ').'); };
    var falha = function () { var ta = D.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; D.body.appendChild(ta); ta.select(); try { D.execCommand('copy'); ok(); } catch (e) { aviso('Não foi possível copiar.'); } ta.remove(); };
    try { navigator.clipboard.writeText(txt).then(ok, falha); } catch (e) { falha(); }
    W.__cmtCopiado = txt;
  }
  function fecharBaixar() { var md = mw() && mw().document, m = md && md.getElementById('cmt-baixar'); if (m) m.remove(); }
  function menuBaixar(btn) {
    var md = btn.ownerDocument; if (md.getElementById('cmt-baixar')) { fecharBaixar(); return; }
    var r = btn.getBoundingClientRect(), m = md.createElement('div'); m.id = 'cmt-baixar'; m.setAttribute('role', 'menu');
    m.innerHTML = [['xlsx', 'Planilha (Excel)', 'padrão Controle de Pauta, com o painel do cabeçalho'], ['csv', 'Planilha (CSV)', 'as mesmas colunas, em texto separado por ponto e vírgula'], ['lista', 'Lista simplificada (PDF)', 'item, processo, classe, apreciação, meta, assunto e equipe, com o cabeçalho da sessão'], ['stats', 'Estatísticas (PDF)', 'apreciação, classe, metas, seção, etapa, idade, equipe e todos os assuntos']]
      .map(function (x) { return '<button type="button" role="menuitem" data-baixar="' + x[0] + '"><b>' + x[1] + '</b><small>' + x[2] + '</small></button>'; }).join('');
    m.style.top = (r.bottom + 6) + 'px'; m.style.right = Math.max(8, md.documentElement.clientWidth - r.right) + 'px';
    md.body.appendChild(m); var b0 = m.querySelector('button'); if (b0) b0.focus();
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-baixar]'); if (!b) return; fecharBaixar(); var d = dadosSessao(); if (!d || !d.linhas.length) { aviso('Nada a baixar nesta versão.'); return; }
      var k = b.dataset.baixar;
      if (k === 'xlsx') baixarXlsx(d).catch(function (er) { aviso('Falha ao gerar o Excel: ' + er.message); });
      else if (k === 'csv') baixarCsv(d); else if (k === 'lista') listaSimplificada(d); else estatisticas(d);
    });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { fecharBaixar(); btn.focus(); } });
    setTimeout(function () { md.addEventListener('click', function fora(e) { if (!e.target.closest('#cmt-baixar,[data-ses-a="baixar"]')) { fecharBaixar(); md.removeEventListener('click', fora, true); } }, true); }, 0);
  }
  W.CMTPautas = { dados: dadosSessao, xlsx: function () { var d = dadosSessao(); return d ? xlsxPauta(d) : null; } };
  /* nas Pautas o painel esquerdo fica aberto (é onde estão as sessões); ao sair, volta como estava */
  var PAU_ABRIU = false, PAU_ERA = null;
  function painelPautas(on) {
    var tg = $('#ixTog'); if (!tg) return;
    if (on && PAU_ERA === null) { PAU_ERA = D.body.classList.contains('ix-min'); if (PAU_ERA) { tg.click(); PAU_ABRIU = true; } }
    else if (!on && PAU_ERA !== null) { if (PAU_ABRIU && !D.body.classList.contains('ix-min')) tg.click(); PAU_ERA = null; PAU_ABRIU = false; }
  }
  var cssP = D.createElement('style');
  cssP.textContent = '.au-pau .gk{display:block;margin:10px 2px 4px;font:700 10px Figtree,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#9fb0c0}' +
    '.au-pau a small{color:#9fb0c0;font-size:11px;margin-left:4px}.au-pau a .dot{border-radius:50%!important;width:8px!important;height:8px!important}.au-pau a.todas span{font-weight:600}' +
    'html body #index .au-pau a.sel{background:rgba(196,149,60,.22);box-shadow:inset 3px 0 0 #c4953c}html body #index .au-pau a.sel span{color:#fff;font-weight:700}' +
    '.au-pau .lg{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin:10px 2px 0;font-size:10.5px;color:#9fb0c0}.au-pau .lg span{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}.au-pau .lg i{display:inline-block;width:7px;height:7px;border-radius:50%}' +
    '#index .ix-g.cmt[data-cmt="pautas"]>ul{display:none!important}' +
    '.au-nova{margin:10px 12px 0;padding:10px;border:1px solid rgba(230,194,122,.35);border-radius:12px;background:rgba(196,149,60,.08);font:500 12.5px Figtree,system-ui,sans-serif}.au-nova .k{display:block;font:700 10.5px Figtree,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#e6c27a;margin:0 0 6px}' +
    '.au-nova form{display:flex;gap:6px}.au-nova input{flex:1;min-width:0;font:600 12.5px Figtree,system-ui,sans-serif;color:#fff;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:5px 7px;color-scheme:dark}' +
    '.au-nova button{flex:0 0 32px;border:0;border-radius:8px;background:#c4953c;color:#14263c;font:800 18px/1 Figtree,system-ui,sans-serif;padding:0;cursor:pointer}.au-nova button:hover{background:#d4a64c}.au-nova :focus-visible{outline:2px solid #e6c27a;outline-offset:2px}' +
    '#au-pau-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);opacity:0;pointer-events:none;z-index:2147483647;background:#1f2442;color:#fff;border:1px solid rgba(230,194,122,.5);border-radius:12px;padding:10px 16px;font:600 13px Figtree,system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.3);transition:.2s;max-width:min(680px,90vw)}#au-pau-toast.on{opacity:1;transform:translateX(-50%)}';
  D.head.appendChild(cssP);

  var cssS = D.createElement('style');
  cssS.textContent =
    '.au-subnav{display:none!important}#index .ix-g[data-tab="acervo"]>button{display:none}' +
    'nav.mods .mod[data-tab="acervo"]::after{content:"▾";margin-left:6px;font-size:.8em;opacity:.75}' +
    '#au-dd{position:fixed;z-index:2147481000;min-width:270px;padding:6px;border-radius:12px;background:#0f1f2e;border:1px solid rgba(230,194,122,.35);box-shadow:0 14px 40px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:2px;font-family:Figtree,system-ui,sans-serif}' +
    '#au-dd a{display:block;padding:9px 12px;border-radius:9px;color:#eef2f5;text-decoration:none;border:1px solid transparent}#au-dd a b{display:block;font-size:13.5px;font-weight:700}#au-dd a small{display:block;font-size:11.5px;color:#9fb0c0;margin-top:1px}' +
    '#au-dd a:hover,#au-dd a:focus-visible{background:rgba(255,255,255,.07);outline:none}#au-dd a.on{background:rgba(196,149,60,.18);border-color:rgba(230,194,122,.5)}#au-dd a.on b{color:#f1dfb5}' +
    /* Planilha integral e Panorama: largura inteira, sem os painéis laterais */
    'body.cmt-int-on #cmt-integral{left:0!important}body.cmt-int-on #index,body.cmt-int-on .au-alca{display:none!important}' +
    'body.au-pan{--ixw:0px!important;--rlw:0px!important}body.au-pan #index,body.au-pan #rail{visibility:hidden!important;overflow:hidden!important;width:0!important;min-width:0!important;padding:0!important;border:0!important}body.au-pan .au-alca{display:none!important}' +
    'body.au-pan #acvbody .au-busca,body.au-pan #acvbody>.au-h[data-r="res"],body.au-pan #acv-sheet,body.au-pan #acvlist-sec,body.au-pan #acvbody .acs-foot,body.au-pan #acvbody .acs-tags,body.au-pan #acvbody .filterbar{display:none!important}' +
    'body.au-pan #acvbody .fl-ch{order:1}body.au-pan #acv-sit{order:2}body.au-pan #acv-gab{order:3}body.au-pan #acv-out{order:4}body.au-pan #acv-cam{order:5}' +
    'body.au-pan #acervo>.au-h[data-r="geral"],body.au-pan #tk-leitura,body.au-pan #acvbody{display:none!important}' +
    'body.au-pan #rp>h2{display:none!important}html body #main #relatorios .au-sub{display:flex;align-items:baseline;gap:10px;margin:22px 0 10px;font:800 15px Figtree,system-ui,sans-serif;color:#14263c}html body #main #relatorios .au-sub::before{content:none}' +
    'html body.au-pan:not(.au-relpag) #acervo #relatorios,html body.au-pan:not(.au-relpag) #au-pan-rel{display:none!important}' +
    'body.au-relpag #au-pan-top,body.au-relpag #au-pan-gab,body.au-relpag .au-pan-gabx,body.au-relpag #au-pan-blo,body.au-relpag #au-pan-blobox{display:none!important}body.au-relpag #au-pan-rel{margin-top:0}' +
    'html body #au-pan-gab,html body #au-pan-es,html body #au-pan-blo{display:none!important}.au-gabslot>h4:empty{display:none}.au-gabslot .au-rlmov{margin:0!important}.au-gabslot .au-rlmov>h2{font-size:15px!important;margin:0 0 10px!important}.au-gabslot #au-pan-esbox,.au-gabslot #au-pan-blobox{margin:0!important}.au-gabslot{margin-top:18px}.au-gabslot>h4{margin:0 0 10px;font:800 15px Figtree,system-ui,sans-serif;color:var(--ink,#14263c)}.au-gabslot>h4 small{display:block;font-weight:500;font-size:12px;color:var(--muted);margin-top:2px}html body.au-pan .au-gabslot .au-pan-gabx{margin:0!important}' +
    'body:not(.au-pan) #au-pan-gab,body:not(.au-pan) .au-pan-gabx{display:none!important}body.au-pan .au-pan-gabx{display:block!important;margin:0 0 26px}body.au-pan .au-pan-gabx>h2{display:none!important}' +
    'body:not(.au-pan) #au-pan-top,body:not(.au-pan) #au-pan-blo,body:not(.au-pan) #au-pan-blobox{display:none!important}' +
    '#au-pan-top .pt-h{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px 14px;margin:0 0 10px}#au-pan-top h1{margin:0;font:800 28px Figtree,system-ui,sans-serif;letter-spacing:-.02em;color:var(--ink,#14263c)}#au-pan-top .pt-h small{color:var(--muted);font-size:13px}' +
    '#au-pan-top .pt-nav{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px;position:sticky;top:58px;z-index:5;padding:6px 0;background:var(--bg,#f4f2ed)}' +
    '#au-pan-top .pt-nav a{padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:var(--card,#fff);color:var(--ink,#14263c);text-decoration:none;font:700 12.5px Figtree,system-ui,sans-serif}#au-pan-top .pt-nav a:hover{border-color:#c4953c}' +
    '#au-pan-ind .pvs{margin-bottom:26px}#au-pan-blo,#au-pan-rel{margin-top:26px}#au-pan-blobox{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#f4f6fa}#au-pan-blobox iframe{display:block;border:0;width:100%;height:900px;background:#f4f6fa}' +
    '#acervo .au-rel{display:block!important;margin-top:8px}#acervo .au-rel>.pane-head{display:none}#acervo .au-relh{margin-top:26px}' +
    '.au-esc{margin:10px 12px 14px;padding:10px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.04);font:500 12.5px Figtree,system-ui,sans-serif;color:#d6dde5}' +
    '.au-esc .k{display:block;font:700 10.5px Figtree,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#e6c27a;margin:0 0 6px}.au-esc .s{color:#9fb0c0;font-size:11.5px;margin:6px 0 0}' +
    '.au-esc a{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px 8px;border-radius:8px;color:#eef2f5;text-decoration:none}.au-esc a:hover{background:rgba(255,255,255,.07)}.au-esc a.on{background:rgba(196,149,60,.18)}' +
    '.au-esc a .dot{display:block;width:10px;height:10px;border-radius:3px}.au-esc a span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.au-esc a b{font-size:12px;color:#f1dfb5}';
  D.head.appendChild(cssS);
  setInterval(function () { D.querySelectorAll('.au-subnav').forEach(function (x) { x.remove(); }); if ($('#index .ix-g.cmt.cmt-on[data-cmt="triagem"]')) escaninhos(); var pauOn = !!$('#index .ix-g.cmt.cmt-on[data-cmt="pautas"]'); if (pauOn) { try { pautas(); } catch (e) { console.error('[CMT] pautas', e); } } painelPautas(pauOn); }, 600);

  W.CMTAcervo = { _sync: function () { var a = SIG; sincronizarFiltro(); return [a.length, SIG.length, a === SIG]; }, abrirFicha: abrirFicha, integral: abrirIntegral, estado: function () { return { cnj: !!CNJ, tpu: TPU, cal: !!CAL, oper: !!OPER }; } };
  /* =================== Configurações › Gerador de relatórios =================== */
  var CR = null, CR_SIG = '';
  function crEscs() { var c = comp(); if (!c) return []; try { garantirFixos(c); } catch (e) {} return (c.escaninhos || []).map(function (e) { return { id: e.id, t: e.titulo || e.id, cor: e.cor }; }); }
  function crSecs(d) { var B = (d.full || d.doc.blocks), L = []; B.forEach(function (b, i) { if (b.h2 != null) L.push({ i: i, t: b.h2 }); }); return L; }
  function crAplicaSecs(d) { if (!d.full) d.full = d.doc.blocks.slice(); var oc = d.oc || {}, B = [], fora = false; d.full.forEach(function (b, i) { if (b.h2 != null) fora = !!oc[i]; if (!fora) B.push(b); }); d.doc.blocks = B; }
  function crBarra() {
    if (typeof RP === 'undefined' || !RP.docs) return;
    var d = RP.docs[RP.id]; if (!d) { try { rpCur(); } catch (e) { return; } d = RP.docs[RP.id]; if (!d) return; }
    var es = crEscs(), secs = crSecs(d), oc = d.oc || {};
    var sig = RP.id + '|' + RP.fonte + '|' + es.map(function (e) { return e.id; }).join(',') + '|' + secs.map(function (s) { return s.i + (oc[s.i] ? '-' : '+'); }).join(',') + '|' + (d.doc.title || '');
    var ti = CR.querySelector('#cr-tit');
    if (sig === CR_SIG && ti) return; CR_SIG = sig;
    var foco = D.activeElement === ti;
    var bar = CR.querySelector('.cr-bar');
    bar.innerHTML =
      '<label class="cr-f"><span>Fonte dos dados</span><select id="cr-fonte"><option value="">Acervo do gabinete (inteiro)</option>' +
        (es.length ? '<optgroup label="Escaninhos">' + es.map(function (e) { return '<option value="' + esc(e.id) + '"' + (RP.fonte === e.id ? ' selected' : '') + '>' + esc(e.t) + '</option>'; }).join('') + '</optgroup>' : '') + '</select></label>' +
      '<label class="cr-f cr-t"><span>Título do relatório</span><input id="cr-tit" type="text" value="' + esc(d.doc.title || '') + '"></label>' +
      '<div class="cr-ac"><button type="button" class="cr-b" data-cr="pdf">⇩ Baixar PDF</button><button type="button" class="cr-b pri" data-cr="docx">⇩ Baixar Word (.docx)</button></div>' +
      (secs.length ? '<div class="cr-secs"><span>Seções do relatório</span>' + secs.map(function (s) { return '<label class="cr-s' + (oc[s.i] ? '' : ' on') + '"><input type="checkbox" data-crsec="' + s.i + '"' + (oc[s.i] ? '' : ' checked') + '> ' + esc(s.t) + '</label>'; }).join('') + '<button type="button" class="cr-l" data-cr="todas">todas</button><button type="button" class="cr-l" data-cr="refazer">refazer do zero</button></div>' : '');
    if (foco) { var n = bar.querySelector('#cr-tit'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
  }
  function crMontar() {
    CR = D.createElement('div'); CR.id = 'cmt-cfg-rel';
    CR.innerHTML = '<div class="cr-hd"><div><b>Gerador de relatórios</b><small>escolha o relatório e a fonte dos dados, ajuste título, seções e textos na prévia; baixe em PDF ou Word</small></div></div><div class="cr-bar"></div><div class="cr-body"></div>';
    CR.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'cr-fonte') { var id = t.value, es = crEscs().find(function (x) { return x.id === id; }); rpFonte(id, es ? es.t : '', id ? membrosEsc(id) : null); CR_SIG = ''; crBarra(); aviso(id ? 'Relatório refeito só com o escaninho «' + (es ? es.t : id) + '».' : 'Relatório refeito com o acervo inteiro.'); return; }
      if (t.dataset.crsec != null) { var d = RP.docs[RP.id] || (rpCur(), RP.docs[RP.id]); d.oc = d.oc || {}; if (t.checked) delete d.oc[t.dataset.crsec]; else d.oc[t.dataset.crsec] = 1; crAplicaSecs(d); rpPreview(); CR_SIG = ''; crBarra(); }
    });
    CR.addEventListener('input', function (e) { if (e.target.id !== 'cr-tit') return; rpSet('title', e.target.value); var p = $('#rp-prev'); if (p) p.querySelectorAll('[data-f="title"]').forEach(function (x) { x.textContent = e.target.value; }); CR_SIG = ''; });
    CR.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cr]'); if (!b) return; e.preventDefault(); var a = b.dataset.cr;
      if (a === 'pdf') rpPDF(); else if (a === 'docx') rpDOCX();
      else if (a === 'todas') { var d = RP.docs[RP.id]; if (d) { d.oc = {}; crAplicaSecs(d); rpPreview(); } CR_SIG = ''; crBarra(); }
      else if (a === 'refazer') { delete RP.docs[RP.id]; rpBuild(); rpPreview(); CR_SIG = ''; crBarra(); aviso('Relatório refeito do zero.'); }
    });
    /* trocar de relatório no catálogo: a barra acompanha */
    CR.addEventListener('click', function (e) { if (e.target.closest('[data-rp]')) setTimeout(function () { CR_SIG = ''; crBarra(); }, 60); });
  }
  function relCfg() {
    var on = D.body.classList.contains('cmt-cfg-rel'), rr = $('#au-relrail');
    if (on) {
      if (!rr) { try { relatoriosNoPanorama(); } catch (e) {} rr = $('#au-relrail'); if (!rr) return; }
      if (!CR) crMontar();
      var box = D.querySelector('.cmt-cfg'); if (box && CR.parentElement !== box) box.appendChild(CR);
      var cx = CR.querySelector('.cr-body'); if (rr.parentElement !== cx) { cx.appendChild(rr); try { rpSelect(RP.id); } catch (e) {} CR_SIG = ''; }
      try { crBarra(); } catch (e) { console.warn('[Relatórios]', e); }
    } else if (rr && CR && rr.parentElement === CR.querySelector('.cr-body')) { var rail = $('#rail'); if (rail) rail.appendChild(rr); }
  }
  setInterval(relCfg, 400);
  /* =================== Monitor › Movimento: Controle mensal (distribuições do mês, acervo inteiro) =================== */
  var CM = { mes: '', sel: null, sig: '' };
  function cmDist(r) { return r['data_distribuição'] || r['Data_Distribuição'] || r['Data Distribuição'] || r['data_distribuicao'] || r.Data_Distribuicao || ''; }
  function cmMes(c, r) { try { return c.dateToMonth(cmDist(r)); } catch (e) { return ''; } }
  function cmVals(c, k, r) { try { return c.monthlyValues(k, r) || []; } catch (e) { return []; } }
  function cmCanon(v) { return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function controleMensal() {
    if (!D.body.classList.contains('au-pan')) return;
    var c = comp(), sec = [].slice.call(D.querySelectorAll('#au-pan-ind > section.ai-b')).find(function (x) { var h = x.querySelector(':scope > h3'); return h && /movimento|entradas/i.test(h.textContent); }); if (!sec || !c || !c.rows || !c.rows.length) return;
    var box = $('#cm-mensal');
    if (!box) { box = D.createElement('div'); box.id = 'cm-mensal';
      box.addEventListener('change', function (e) { if (e.target.id === 'cm-mes') { CM.mes = e.target.value; CM.sel = null; CM.sig = ''; controleMensal(); } });
      box.addEventListener('click', function (e) { var b = e.target.closest('[data-cmk]'); if (b) { var k = b.dataset.cmk, v = b.dataset.cmv; CM.sel = CM.sel && CM.sel.k === k && CM.sel.v === v ? null : { k: k, v: v, t: b.dataset.cmt }; CM.sig = ''; controleMensal(); return; }
        var p = e.target.closest('[data-cmp]'); if (p) { e.preventDefault(); try { W.CMTProntuario.abrir(p.dataset.cmp, [].slice.call(box.querySelectorAll('[data-cmp]')).map(function (x) { return x.dataset.cmp; })); } catch (er) {} } }); }
    if (!box.isConnected || box.parentElement !== sec) { var h = D.createElement('h4'); h.className = 'au-sub4'; h.id = 'cm-mensal-h'; h.textContent = 'Controle mensal'; var old = $('#cm-mensal-h'); if (old) old.remove(); sec.appendChild(h); sec.appendChild(box); CM.sig = ''; }
    var meses = {}, all = c.rows; all.forEach(function (r) { var m = cmMes(c, r); if (m) meses[m] = (meses[m] || 0) + 1; });
    var L = Object.keys(meses).sort(); if (!L.length) return; if (!CM.mes || !meses[CM.mes]) CM.mes = L[L.length - 1];
    var sig = CM.mes + '|' + all.length + '|' + (CM.sel ? CM.sel.k + CM.sel.v : ''); if (sig === CM.sig) return; CM.sig = sig;
    var R = all.filter(function (r) { return cmMes(c, r) === CM.mes; });
    var G = [['classes', 'Classes'], ['sections', 'Seções competentes'], ['subjects', 'Assuntos'], ['parties', 'Partes com mais de um processo'], ['tags', 'Etiquetas atuais'], ['relief', 'Tutela ou liminar']];
    var grupos = G.map(function (g) { var M = {}; R.forEach(function (r) { cmVals(c, g[0], r).forEach(function (v) { var k = cmCanon(v); if (!k) return; (M[k] = M[k] || { t: v, n: 0 }).n++; }); });
      var arr = Object.keys(M).map(function (k) { return { k: k, t: M[k].t, n: M[k].n }; }).filter(function (x) { return g[0] !== 'parties' || x.n > 1; }).sort(function (a, b) { return b.n - a.n || a.t.localeCompare(b.t); });
      return { k: g[0], t: g[1], L: arr }; });
    var semT = R.filter(function (r) { return !cmVals(c, 'relief', r).length; }).length;
    var mesL = function (m) { var p = m.split('-'); return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+p[1] - 1] + '/' + p[0]; };
    var html = '<div class="cm-top"><label>Mês de distribuição <input type="month" id="cm-mes" value="' + esc(CM.mes) + '" min="' + L[0] + '" max="' + L[L.length - 1] + '"></label>' +
      '<b class="cm-n">' + nf(R.length) + ' processo(s) distribuído(s) em ' + mesL(CM.mes) + '</b><small>acervo inteiro, sem filtros · ' + nf(semT) + ' sem informação de tutela ou liminar</small></div><div class="cm-g">' +
      grupos.map(function (g) { return '<div class="cm-c"><h5>' + esc(g.t) + '<span>' + nf(g.L.length) + '</span></h5><div class="cm-l">' + (g.L.length ? g.L.slice(0, 40).map(function (x) {
        var on = CM.sel && CM.sel.k === g.k && CM.sel.v === x.k; return '<button type="button" data-cmk="' + g.k + '" data-cmv="' + esc(x.k) + '" data-cmt="' + esc(x.t) + '" class="' + (on ? 'on' : '') + '"><span>' + esc(x.t) + '</span><b>' + nf(x.n) + '</b></button>'; }).join('') : '<p>Nada neste mês.</p>') + '</div></div>'; }).join('') + '</div>';
    if (CM.sel) { var P = R.filter(function (r) { return cmVals(c, CM.sel.k, r).some(function (v) { return cmCanon(v) === CM.sel.v; }); });
      html += '<div class="cm-det"><h5>' + esc(CM.sel.t) + ' · ' + nf(P.length) + ' processo(s)</h5><div class="cm-tw"><table><thead><tr><th>Processo</th><th>Distribuição</th><th>Classe</th><th>Seção</th><th>Assunto</th><th>Tarefa atual</th></tr></thead><tbody>' +
        P.map(function (r) { var pn = r.Processo || r.processo || ''; return '<tr><td><a href="#" data-cmp="' + esc(pn) + '">' + esc(pn) + '</a></td><td>' + esc(String(cmDist(r)).slice(0, 10)) + '</td><td>' + esc(cmVals(c, 'classes', r)[0] || '') + '</td><td>' + esc(cmVals(c, 'sections', r)[0] || '') + '</td><td>' + esc(cmVals(c, 'subjects', r)[0] || '') + '</td><td>' + esc(r.tarefa_atual || r['Tarefa Atual'] || '') + '</td></tr>'; }).join('') + '</tbody></table></div></div>'; }
    box.innerHTML = html;
  }
  setInterval(controleMensal, 900);
  var cssCM = D.createElement('style');
  cssCM.textContent =
    '#cm-mensal{font-family:Figtree,system-ui,sans-serif;color:#14263c;background:#fff;border:1px solid #e1e7ec;border-radius:16px;padding:14px 16px;margin:4px 0 18px}' +
    '#cm-mensal .cm-top{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;margin:0 0 12px}#cm-mensal .cm-top label{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#5d6b78}' +
    '#cm-mensal input[type=month]{font:700 13px Figtree,sans-serif;border:1px solid #d6dde4;border-radius:8px;padding:5px 8px;color:#14263c}#cm-mensal .cm-n{font-size:13px;background:#eef3f8;color:#1b3553;border-radius:999px;padding:6px 12px}#cm-mensal .cm-top small{color:#6b7b8d;font-size:12px}' +
    '#cm-mensal .cm-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}#cm-mensal .cm-c{border:1px solid #e5e1d8;border-radius:11px;overflow:hidden;min-width:0;border-top:3px solid var(--mx,#1a7f5a)}' +
    '#cm-mensal h5{display:flex;justify-content:space-between;margin:0;padding:8px 10px;background:#f7f5f0;font:800 11.5px Figtree,sans-serif;color:#14304e}#cm-mensal h5 span{color:#6b7b8d;font-weight:700}' +
    '#cm-mensal .cm-l{max-height:210px;overflow:auto}#cm-mensal .cm-l p{margin:0;padding:10px;color:#7e8b99;font-size:11.5px}' +
    '#cm-mensal .cm-l button{display:flex;gap:8px;justify-content:space-between;width:100%;text-align:left;border:0;border-bottom:1px solid #f0ede6;background:#fff;padding:6px 10px;font:600 12px Figtree,sans-serif;color:#33475a;cursor:pointer}#cm-mensal .cm-l button span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#cm-mensal .cm-l button:hover{background:#f4f8fb}#cm-mensal .cm-l button.on{background:#1b3553;color:#fff}' +
    '#cm-mensal .cm-det{margin-top:12px}#cm-mensal .cm-det h5{border-radius:10px 10px 0 0;border:1px solid #e5e1d8;border-bottom:0}#cm-mensal .cm-tw{max-height:360px;overflow:auto;border:1px solid #e5e1d8;border-radius:0 0 10px 10px}' +
    '#cm-mensal table{border-collapse:collapse;width:100%;font-size:12px}#cm-mensal th{position:sticky;top:0;background:#f7f5f0;text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#5c6a78;padding:6px 9px}#cm-mensal td{padding:5px 9px;border-top:1px solid #f0ede6;white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis}#cm-mensal td a{font-family:"JetBrains Mono",monospace;color:#1b3553}';
  D.head.appendChild(cssCM);
  /* =================== Visão geral: o panorama estatístico é o painel inicial; os cartões repetidos saem =================== */
  var DUP_B1 = /^(situa[cç][aã]o do acervo|se[cç][aã]o competente|idade do acervo|tempo na tarefa atual|assuntos mais frequentes)$/i;
  var PTH = null;
  function pvsNoInicio() {
    if (!D.body.classList.contains('au-pan')) return;
    var pv = $('#au-pan-pvs'), b1 = $('#ai-b1'); if (!b1) return;
    if (!pv) { pv = D.createElement('div'); pv.id = 'au-pan-pvs'; }
    var h3 = b1.querySelector(':scope > h3'); if (h3 && pv.previousElementSibling !== h3) h3.after(pv);
    if (!PTH) PTH = $('#au-pan-top > .pt-h'); if (PTH && b1.firstElementChild !== PTH) b1.insertBefore(PTH, b1.firstChild);
    var k0 = $('#au-pan-ind .ai-k[data-ik="k-ap"]'), kg = k0 && k0.parentElement; if (kg && kg.parentElement !== b1) { kg.classList.add('mx-kres'); pv.after(kg); }
    b1.querySelectorAll(':scope > .ai-g > article.ai-c').forEach(function (a) { var h = a.querySelector('header h4'); a.classList.toggle('mx-dup', !!(h && DUP_B1.test(h.textContent.trim()))); });
  }
  setInterval(pvsNoInicio, 500);
  var cssPV = D.createElement('style');
  cssPV.textContent = 'html body #main #ai-b1>.pt-h{display:block!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0 0 14px!important;margin:0 0 14px!important;border-bottom:1px solid #e6ebf0!important;border-radius:0!important}html body #main #ai-b1>.pt-h .mx-ey{display:block;font:800 10.5px Figtree,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#b8862b;margin-bottom:2px}html body #main #ai-b1>.pt-h h1{display:inline;font:800 30px Figtree,system-ui,sans-serif!important;letter-spacing:-.02em;color:#14263c!important;margin:0 12px 0 0!important}html body #main #ai-b1>.pt-h small{color:#5d6b78;font-size:13px}html body #main #ai-b1>.pt-h .mx-sub{margin:6px 0 0;font-size:13px;color:#2b4a63}' + '.mx-kres>.ai-k[data-ik=k-at],.mx-kres>.ai-k[data-ik=k-p1],.mx-kres>.ai-k[data-ik=k-dm],.mx-kres>.ai-k[data-ik=k-sp],.mx-kres>.ai-k.st{display:none!important}html body #main #ai-b1>.mx-kres{margin:0 0 18px!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important}html body #main #au-pan-pvs .pvs-hero h2{display:none!important}' + '#ai-b1 article.ai-c.mx-dup{display:none!important}#ai-b1>#au-pan-pvs{margin:6px 0 18px}#ai-b1>#au-pan-pvs .pvs{margin-bottom:0!important}' +
    'html body #main #au-pan-pvs .pvs-top{padding:14px 20px 12px!important;border-radius:18px!important}html body #main #au-pan-pvs .pvs-hero h2{font-size:20px!important}html body #main #au-pan-pvs .pvs-hero small{font-size:9.5px!important}';
  D.head.appendChild(cssPV);
  /* =================== Triagem › painel de escaninhos: referência rápida de impedimentos e suspeições =================== */
  var IMPR = { d: null, lendo: false, aberto: (function () { try { return localStorage.getItem('cmt_impref') !== '0'; } catch (e) { return true; } })() };
  function impRef() {
    var g = $('#index .ix-g[data-tab="acervo"]'); if (!g || !g.querySelector('.au-escs')) return;
    var w = mw(); if (!IMPR.d && !IMPR.lendo && w && w.ProcsMuta && w.ProcsMuta.atual) { IMPR.lendo = true;
      w.ProcsMuta.ler('apoio/regras/impedimentos.json').then(function (t) { IMPR.d = JSON.parse(t); }).catch(function () {}).then(function () { IMPR.lendo = false; }); }
    var box = $('#cmt-impref'); if (!box) { box = D.createElement('div'); box.id = 'cmt-impref';
      box.addEventListener('click', function (e) { if (e.target.closest('[data-imp="tg"]')) { IMPR.aberto = !IMPR.aberto; try { localStorage.setItem('cmt_impref', IMPR.aberto ? '1' : '0'); } catch (er) {} box.__h = ''; impRef(); } }); }
    if (box.parentElement !== g || g.lastElementChild !== box) g.appendChild(box);
    var d = IMPR.d, html;
    if (!d) html = '<div class="ih"><b>Impedimentos e suspeições</b></div><p class="iv">' + (IMPR.lendo ? 'lendo apoio/regras/impedimentos.json…' : 'conecte o procs-muta para ler apoio/regras/impedimentos.json') + '</p>';
    else {
      var J = d.julgadores || [], A = d.advogados || [], C = (d.convocacoes || []).filter(function (x) { return x.data >= new Date().toISOString().slice(0, 10); }), O = d.origens || {};
      var br = function (s) { return s ? s.slice(8, 10) + '/' + s.slice(5, 7) : ''; };
      html = '<div class="ih"><b>Impedimentos e suspeições</b><button type="button" data-imp="tg">' + (IMPR.aberto ? 'recolher' : 'abrir') + '</button></div>';
      if (IMPR.aberto) {
        html += J.map(function (j) {
          var adv = A.filter(function (a) { return a.julgador === j.id; });
          var locs = (j.periodos || []).map(function (p) { return (O[p.loc] || p.loc) + (p.fim ? ' até ' + p.fim.slice(0, 4) : ''); });
          return '<div class="ij"><div class="ijn">' + esc(j.nome) + '</div>' +
            (locs.length ? '<div class="ijl"><span>1º grau</span>' + esc(locs.join(' · ')) + '</div>' : '') +
            (adv.length ? '<ul>' + adv.map(function (a) { return '<li><i class="' + (a.tipo === 'imp' ? 'im' : 'su') + '" title="' + esc(a.base || '') + '">' + (a.tipo === 'imp' ? 'IMP' : 'SUSP') + '</i><span>' + esc(a.nome) + '<small>' + esc(a.oab || '') + (a.vinculo && a.vinculo !== 'Advogado' ? ' · ' + esc(a.vinculo) : '') + '</small></span></li>'; }).join('') + '</ul>' : '') + '</div>';
        }).join('') +
        (C.length ? '<div class="ic"><span>Convocações</span>' + C.map(function (x) { return '<b>' + br(x.data) + '</b> ' + esc(x.secao); }).join(' · ') + '</div>' : '') +
        '<p class="iv">fonte: apoio/regras/impedimentos.json' + (d.atualizadoEm ? ' · ' + esc(String(d.atualizadoEm).slice(0, 10).split('-').reverse().join('/')) : '') + '</p>';
      }
    }
    if (box.__h !== html) { box.innerHTML = html; box.__h = html; }
  }
  setInterval(impRef, 900);

  /* =================== Painéis laterais: o modelo do Monitor (cartão escuro flutuante à esquerda) em todas as páginas =================== */
  function paginaAtual() { var b = D.body.classList; return b.contains('au-pan') ? 'monitor' : b.contains('cmt-acv') ? 'triagem' : b.contains('cmt-modo') ? (b.contains('cmt-eq') ? 'equipe' : 'pautas') : ''; }
  var PX = { min: (function () { try { return localStorage.getItem('px_min') === '1'; } catch (e) { return false; } })() };
  function sessoesPainel() {
    var el = $('#px-lado'); if (!el) { el = D.createElement('aside'); el.id = 'px-lado'; el.setAttribute('aria-label', 'Sessões de julgamento'); D.body.appendChild(el);
      el.addEventListener('click', function (e) { if (e.target.closest('[data-px="min"]')) { PX.min = !PX.min; try { localStorage.setItem('px_min', PX.min ? '1' : '0'); } catch (er) {} D.body.classList.toggle('px-min', PX.min); el.__h = ''; sessoesPainel(); return; }
        if (e.target.closest('[data-pxg]')) { e.preventDefault(); try { mw().CMTSessao.abrir('sessoes'); } catch (er) {} return; } var b = e.target.closest('[data-pxs]'); if (!b) return; e.preventDefault(); if (!b.dataset.pxs) { if (PX.min) { PX.min = false; try { localStorage.setItem('px_min', '0'); } catch (er) {} D.body.classList.remove('px-min'); el.__h = ''; sessoesPainel(); } return; } var w = mw(); try { if (!w.CMTSessao.abrirSessao(b.dataset.pxs, 'pos')) w.CMTSessao.abrir(b.dataset.pxs); } catch (er) {} }); }
    D.body.classList.toggle('px-min', PX.min);
    var w = mw(), S = null; try { S = w && w.CMTSessao && w.CMTSessao.estado(); } catch (e) {}
    var L = (S && S.sessoes || []).slice(), dt = function (s) { return String(s.data || s.date || ''); }; L.sort(function (a, b) { return dt(a).localeCompare(dt(b)); });
    var hoje = new Date().toISOString().slice(0, 10), CORES = ['#006291', '#8a5cb8', '#1a8a6a', '#c46a1f', '#b0406a', '#3e72ad'];
    var br = function (s) { return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : s; };
    var fut = L.filter(function (s) { return dt(s) >= hoje; }), pas = L.filter(function (s) { return dt(s) < hoje; }).slice(-3).reverse();
    var item = function (s, k, past) { var I = s.itens || [], n = I.length, min = I.filter(function (i) { return i.dataMinuta; }).length, lib = I.filter(function (i) { return i.dataLiberacao; }).length;
      return '<a href="#" class="mx-s px-s' + (past ? ' past' : '') + '" data-pxs="' + esc(s.id) + '" title="' + esc(br(dt(s))) + '" style="--mx:' + (s.cor || (past ? '#8a98a3' : CORES[k % CORES.length])) + '"><span><b>' + esc(br(dt(s))) + '</b><small>' + esc(n ? nf(min) + ' de ' + nf(n) + ' minutadas · ' + nf(lib) + ' liberadas' : 'sem pauta') + '</small></span></a>'; };
    var html = '<button type="button" class="px-tg" data-px="min" title="' + (PX.min ? 'Abrir o painel' : 'Recolher o painel') + '" aria-label="' + (PX.min ? 'Abrir o painel' : 'Recolher o painel') + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="' + (PX.min ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6') + '"/></svg></button>' +
      '<span class="mx-k">Pautas</span><a href="#" class="mx-i px-geral" style="--mx:#c9a24a" data-pxg="1" title="Visão geral das sessões"><em>◎</em>Visão geral</a><a href="#" class="mx-i" style="--mx:#c46a1f" data-pxs=""><em>I</em>Sessões futuras<b>' + nf(fut.length) + '</b></a><div class="mx-ss">' + (fut.length ? fut.map(function (s, k) { return item(s, k); }).join('') : '<span class="px-v">nenhuma cadastrada</span>') + '</div>' +
      (pas.length ? '<a href="#" class="mx-i" style="--mx:#8a98a3" data-pxs=""><em>II</em>Anteriores</a><div class="mx-ss">' + pas.map(function (s) { return item(s, 0, true); }).join('') + '</div>' : '');
    if (el.__h !== html) { el.innerHTML = html; el.__h = html; }
  }
  function padronizar() {
    var pg = paginaAtual(); if (D.body.getAttribute('data-lado') !== pg) D.body.setAttribute('data-lado', pg);
    if (pg === 'pautas') sessoesPainel();
  }
  setInterval(padronizar, 500);
  var CARD = 'border-radius:18px!important;background:linear-gradient(180deg,#132a3e,#0e2132)!important;color:#c9d3dc!important;box-shadow:0 8px 24px rgba(14,33,50,.18)!important;border:0!important';
  var cssLado = D.createElement('style');
  cssLado.textContent =
    /* Triagem: o painel de escaninhos vira o mesmo cartão flutuante do Monitor */
    'html body[data-lado=triagem]{--rlw:0px!important}html body[data-lado=triagem]:not(.ix-min){--ixw:300px!important}html body[data-lado=triagem].ix-min{--ixw:78px!important}' +
    'html body[data-lado=triagem] aside#index.index{position:fixed!important;top:72px!important;left:22px!important;bottom:16px!important;height:auto!important;width:calc(var(--ixw) - 40px)!important;min-width:0!important;overflow:auto!important;padding:14px 8px 16px!important;z-index:41!important;' + CARD + '}' +
    'html body[data-lado=equipe] #index,html body[data-lado=equipe] #rail,html body[data-lado=equipe] #px-lado{display:none!important}html body[data-lado=equipe] #cmt-motor{left:0!important;width:100vw!important;background:#eef2f5!important}' +
    'html body[data-lado=triagem] #cmt-motor{left:var(--ixw)!important;width:calc(100vw - var(--ixw) - var(--rdw,0px))!important;background:#eef2f5!important}html body[data-lado=triagem]{background:#eef2f5}' +
    '@media (min-width:1061px){html body[data-lado=triagem]:not(.ix-min) #index>.side-tog.l{left:calc(var(--ixw) - 33px)!important;top:130px!important}html body[data-lado=triagem].ix-min #index>.side-tog.l{left:30px!important;top:80px!important}}' +
    /* Pautas: cartão de sessões no mesmo modelo */
    '#px-lado{display:none}html body[data-lado=pautas]{--ixw:300px!important}html body[data-lado=pautas].px-min{--ixw:78px!important}' +
    'html body[data-lado=pautas] #index,html body[data-lado=pautas] #rail{display:none!important}html body[data-lado=pautas] #cmt-motor{left:var(--ixw)!important;width:calc(100vw - var(--ixw))!important;background:#eef2f5!important}' +
    'html body[data-lado=pautas] #px-lado{display:block;position:fixed;top:72px;left:22px;bottom:16px;width:calc(var(--ixw) - 40px);overflow:auto;padding:16px 12px 14px;z-index:41;font:500 13px Figtree,system-ui,sans-serif;' + CARD + '}' +
    '#px-lado .px-tg{position:absolute;top:10px;right:10px;width:28px;height:28px;display:grid;place-items:center;border:1px solid rgba(230,194,122,.45);border-radius:999px;background:transparent;color:#e6c27a;cursor:pointer}' +
    '#px-lado .mx-k{display:block;font:800 10.5px Figtree,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#e6c27a;margin:4px 6px 10px}' +
    '#px-lado .mx-i{display:flex;align-items:center;gap:8px;padding:6px 6px;border-radius:9px;color:#eef2f5;text-decoration:none;font-weight:700;margin-top:4px}#px-lado .mx-i em{font-style:normal;display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;padding:0 4px;border-radius:6px;background:var(--mx);color:#fff;font:800 10.5px Figtree,sans-serif}#px-lado .mx-i b{margin-left:auto;font:700 11px Figtree,sans-serif;color:#9fb0c0}' +
    '#px-lado .mx-ss{margin:0 0 4px 22px;border-left:1px solid rgba(255,255,255,.12);padding-left:6px}#px-lado .px-s{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;color:#aebccb;text-decoration:none}#px-lado .px-s::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--mx);flex:none}#px-lado .px-s:hover{background:rgba(255,255,255,.07)}' +
    '#px-lado .px-s b{display:block;color:#fff;font-size:12.5px}#px-lado .px-s small{display:block;font-size:11px;color:#9fb0c0}#px-lado .px-s.past{opacity:.6}#px-lado .px-v{display:block;color:#9fb0c0;font-size:12px;padding:4px 8px}' +
    'html body.px-min #px-lado .mx-k{display:none}html body.px-min #px-lado .mx-i{font-size:0;justify-content:center;padding:4px 0;margin-top:10px}html body.px-min #px-lado .mx-i b{display:none}html body.px-min #px-lado .mx-ss{margin:4px 0 0;padding:0;border:0;display:grid;justify-items:center;gap:2px}html body.px-min #px-lado .px-s{padding:5px;justify-content:center}html body.px-min #px-lado .px-s span{display:none}html body.px-min #px-lado .px-s::before{width:11px;height:11px}html body.px-min #px-lado .px-v{display:none}html body.px-min #px-lado{padding:46px 4px 10px}html body.px-min #px-lado .px-tg{right:50%;transform:translateX(50%)}' +
    /* impedimentos e suspeições, ao pé dos escaninhos */
    '#cmt-impref{margin:16px 8px 6px;padding:12px 12px 8px;border:1px solid rgba(255,255,255,.12);border-top:3px solid #c45a4a;border-radius:12px;background:rgba(255,255,255,.035);font:500 12px Figtree,system-ui,sans-serif;color:#d6dde5}' +
    '#cmt-impref .ih{display:flex;align-items:center;justify-content:space-between;margin:0 0 8px}#cmt-impref .ih b{font:800 10.5px Figtree,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#f0b4a8}#cmt-impref .ih button{all:unset;cursor:pointer;font:700 10.5px Figtree,sans-serif;color:#e6c27a}' +
    '#cmt-impref .ij{padding:6px 0 8px;border-top:1px solid rgba(255,255,255,.08)}#cmt-impref .ij:first-of-type{border-top:0}#cmt-impref .ijn{font-weight:800;color:#fff;font-size:12.5px;margin:0 0 3px}#cmt-impref .ijl{font-size:11px;color:#aebccb;margin:0 0 5px;line-height:1.35}#cmt-impref .ijl span{font-weight:800;color:#e6c27a;margin-right:5px}' +
    '#cmt-impref ul{list-style:none;margin:0;padding:0;display:grid;gap:4px}#cmt-impref li{display:grid;grid-template-columns:38px minmax(0,1fr);gap:6px;align-items:start}#cmt-impref li i{font-style:normal;font:800 9px Figtree,sans-serif;letter-spacing:.06em;text-align:center;border-radius:4px;padding:2px 0;margin-top:1px}#cmt-impref li i.im{background:#c45a4a;color:#fff}#cmt-impref li i.su{background:#e6c27a;color:#14263c}' +
    '#cmt-impref li span{font-size:11.5px;color:#eef2f5;line-height:1.3}#cmt-impref li small{display:block;font-size:10.5px;color:#9fb0c0}#cmt-impref .ic{margin:6px 0 2px;font-size:11px;color:#d6dde5}#cmt-impref .ic span{font-weight:800;color:#e6c27a;margin-right:5px}#cmt-impref .iv{margin:6px 0 0;font-size:10px;color:#7d8e9f}' +
    'html body.ix-min #cmt-impref{display:none!important}' +
    /* botões de minimizar: só o ícone */
    'html body #au-pan-ind>section.ai-b>h3>button.au-mintg,html body .au-mintg{font-size:0!important;letter-spacing:0!important;width:30px!important;height:30px!important;padding:0!important;display:inline-grid!important;place-items:center;border-radius:999px!important;flex:none}html body .au-mintg::before{content:"";width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(2px) rotate(-135deg);transition:transform .2s}' +
    'html body .ai-min .au-mintg::before,html body .au-h.ai-min .au-mintg::before{transform:translateY(-2px) rotate(45deg)}';
  D.head.appendChild(cssLado);
  setInterval(function () { D.querySelectorAll('.au-mintg').forEach(function (b) { var min = !!b.closest('.ai-min'), t = min ? 'Expandir' : 'Minimizar'; if (b.title !== t) { b.title = t; b.setAttribute('aria-label', t); } }); }, 800);
  /* =================== Cabeçalho: ferramentas à direita, "monitor" em dourado =================== */
  function cabecalhoMarca() { var b = D.querySelector('header.bar .brand > b'); if (b && !b.querySelector('.mx-mon') && /monitor/i.test(b.textContent)) b.innerHTML = 'CMT-<strong class="mx-mon">monitor</strong> <em>· Gabinete A</em>'; }
  setInterval(cabecalhoMarca, 700);
  /* =================== Modo noturno: mesmas superfícies escuras em Monitor, Triagem e Pautas =================== */
  var DK = { bg: '#0b1c28', sf: '#132a3b', sf2: '#183447', ln: '#27465c', ink: '#e3ebf2', mut: '#9fb3c4' };
  function caixas(sel) { return sel.split(',').map(function (x) { return '[data-theme="dark"] ' + x.trim(); }).join(','); }
  function escuro(sel) { var c = caixas(sel), txt = sel.split(',').map(function (x) { return '[data-theme="dark"] ' + x.trim() + ' :is(h1,h2,h3,h4,h5,h6,b,strong,p,span,td,th,label,li,a,div,small,em,i):not([class*="chip"]):not([class*="pill"]):not([class*="tag"]):not([class*="pri"]):not(.on):not([style*="background"])'; }).join(',');
    return c + '{background:' + DK.sf + '!important;border-color:' + DK.ln + '!important;color:' + DK.ink + '!important;box-shadow:none!important}' + txt + '{color:inherit!important;-webkit-text-fill-color:currentColor}' +
      sel.split(',').map(function (x) { return '[data-theme="dark"] ' + x.trim() + ' :is(small,.cs-mut,.mut)'; }).join(',') + '{color:' + DK.mut + '!important}'; }
  var CAMPOS = ':is(input:not([type=checkbox]):not([type=radio]):not([type=color]),select,textarea)';
  var cssDK = D.createElement('style');
  cssDK.textContent =
    'header.bar .tools{margin-left:auto!important}header.bar .brand>b{gap:0!important}header.bar .brand>b>em{margin-left:.45em}header.bar .brand .mx-mon{display:inline!important;font:inherit!important;letter-spacing:inherit!important;color:#e6c27a!important;-webkit-text-fill-color:#e6c27a!important;background:none!important}' +
    '[data-theme="dark"] body,[data-theme="dark"] body.au-pan #main,[data-theme="dark"] #main{background:' + DK.bg + '!important}' +
    escuro('#au-pan-ind section.ai-b,#au-pan-ind .ai-c,#au-pan-ind .ai-k,#ai-b1>.pt-h,#au-pan-top>.pt-h,#cm-mensal,#cmt-cfg-rel,#cmt-cfg-rel .cr-bar,#au-pan-ind .au-gabslot,#au-pan-blobox,#au-pan-ind .rl-card') +
    '[data-theme="dark"] #cm-mensal :is(.cm-c,h5,.cm-l button,th,td){background:' + DK.sf2 + '!important;border-color:' + DK.ln + '!important}[data-theme="dark"] #cm-mensal .cm-l button.on{background:#e6c27a!important;color:#14263c!important}' +
    'html[data-theme="dark"] body #main #au-pan-pvs .pvs,[data-theme="dark"] .pvs{--ink:' + DK.ink + ';--ink2:#c8d6e2;--mut:' + DK.mut + ';--line:' + DK.ln + ';--soft:' + DK.sf2 + '}[data-theme="dark"] :is(.pvs-tile,.pvs-mod,.pvs-insights p){background:' + DK.sf + '!important;border-color:' + DK.ln + '!important}' +
    '[data-theme="dark"] ' + CAMPOS.replace(':is(', ':is(#cm-mensal ').replace(/,select,textarea\)/, ',#cm-mensal select)') + '{background:' + DK.sf2 + '!important;color:' + DK.ink + '!important;border-color:' + DK.ln + '!important}' +
    '[data-theme="dark"] #cmt-cfg-rel{background:' + DK.bg + '!important}[data-theme="dark"] #cmt-cfg-rel :is(input,select){background:' + DK.sf2 + '!important;color:' + DK.ink + '!important;border-color:' + DK.ln + '!important}' +
    '[data-theme="dark"] #cmt-carga{filter:none}' +
    '[data-theme="dark"] .dkw{background:' + DK.sf + '!important;border-color:' + DK.ln + '!important;color:' + DK.ink + '!important}[data-theme="dark"] .dkw :is(b,strong,h1,h2,h3,h4,h5,span,div,p,small,label,td,th):not(.on):not([class*=chip]):not([class*=tag]):not([style*=background]){color:inherit}' +
    'html[data-theme="dark"] body #main :is(#ai-b1,#au-pan-top)>.pt-h h1,html[data-theme="dark"] body #main #au-pan-ind>section.ai-b>h3{color:' + DK.ink + '!important}html[data-theme="dark"] body #main #au-pan-ind>section.ai-b>h3 small,html[data-theme="dark"] body #main :is(#ai-b1,#au-pan-top)>.pt-h :is(small,.mx-sub){color:' + DK.mut + '!important}';
  D.head.appendChild(cssDK);
  var CSS_DK_M =
    'html[data-theme="dark"],html[data-theme="dark"] body,html[data-theme="dark"] main{background:' + DK.bg + '!important;color:' + DK.ink + '}' +
    escuro('main>header,.central-search-panel,.central-stat-card,.central-stats-stack>*,#cmt-sheet,#cmt-sheet .sh-wrap,.cmt-stats,.cmt-stats .cmt-stats-h,.sh-q,.sh-q .q-c,#cs-root .cs-card,#cs-root .cs-tbl,#cs-root .cs-ses,#cs-root .cs-kpi,#cs-root .cs-note,#cs-root .cs-empty,.pr-scope article') +
    '[data-theme="dark"] :is(#cmt-filtro,.central-search-top>div,.central-search-panel>div){background:' + DK.sf + '!important;border-color:' + DK.ln + '!important;color:' + DK.ink + '!important}[data-theme="dark"] #cmt-filtro *:not(.on):not([class*=chip]){color:inherit}' +
    '[data-theme="dark"] #cmt-filtro button:not(.on):not([aria-pressed="true"]){background:' + DK.sf2 + '!important;border-color:' + DK.ln + '!important}' +
    '[data-theme="dark"] #cs-root :is(.sx-h,.pn,.cs-ses,.cs-bar,.cs-card,.cs-kpi,.ex-g .cs-card,.cs-note,.cs-empty){background:' + DK.sf + '!important;border-color:' + DK.ln + '!important;color:' + DK.ink + '!important;box-shadow:none!important}' +
    '[data-theme="dark"] #cs-root :is(.sx-tt h2,.pn-h>b,.cs-ses .dt,.cs-kpi b,.cs-card h2,.pn-cg b){color:' + DK.ink + '!important}[data-theme="dark"] #cs-root :is(.sx-t small,.pn-n,.cs-mut,.pn-cg span,.cs-ses .dt small){color:' + DK.mut + '!important}' +
    '[data-theme="dark"] #cs-root .sx-v{background:' + DK.bg + '}[data-theme="dark"] #cs-root .sx-v button{color:' + DK.mut + '}[data-theme="dark"] #cs-root .sx-v button[aria-pressed=true]{background:#e6c27a;color:#14263c}' +
    '[data-theme="dark"] #cs-root .sx-ic button,[data-theme="dark"] #cs-root .pn-min,[data-theme="dark"] #cs-root .cs-btn:not(.pri):not(.gold){background:' + DK.sf2 + '!important;border-color:' + DK.ln + '!important;color:' + DK.ink + '!important}[data-theme="dark"] #cs-root .pn-min::before{border-color:' + DK.ink + '}' +
    '[data-theme="dark"] #cs-root :is(.pn-b,.sx-m){border-color:' + DK.ln + '!important}[data-theme="dark"] #cs-root .pn-tabs button{background:' + DK.sf2 + ';border-color:' + DK.ln + ';color:' + DK.ink + '}[data-theme="dark"] #cs-root .pn-tabs button[aria-pressed=true]{background:#e6c27a;border-color:#e6c27a;color:#14263c}' +
    '[data-theme="dark"] #cs-root :is(.pn-cf,.pn-cg>div){background:' + DK.sf2 + '!important;border-color:' + DK.ln + '!important}[data-theme="dark"] #cs-root .pn-t td.pd{background:#3a3218!important}[data-theme="dark"] #cs-root .pn-t td.pm{background:#2a2346!important}' +
    '[data-theme="dark"] #cs-root .sx-ic .cs-pill{background:#16362c;color:#7fd3ae;border-color:#25563f}[data-theme="dark"] #cs-root .sx-ic .cs-pill.sujo{background:#3a3218;color:#f0cf8a;border-color:#6b5520}' +
    '[data-theme="dark"] #cs-root .cs-tag{background:' + DK.sf2 + '!important;color:' + DK.ink + '!important}' +
    '[data-theme="dark"] .dkw{background:' + DK.sf + '!important;border-color:' + DK.ln + '!important;color:' + DK.ink + '!important}[data-theme="dark"] .dkw :is(b,strong,h1,h2,h3,h4,h5,span,div,p,small,label,td,th):not(.on):not([class*=chip]):not([class*=tag]):not([style*=background]){color:inherit}' +
    'html[data-theme="dark"] #cs-root:has(#cs-body) .cs-top{background:' + DK.sf + '!important;border-color:' + DK.ln + '!important;color:' + DK.ink + '!important;box-shadow:none!important}html[data-theme="dark"] #cs-root:has(#cs-body) .cs-top h1{color:' + DK.ink + '!important}' +
    '[data-theme="dark"] #cs-root .cs-top .cs-pill{background:' + DK.sf2 + '!important;color:' + DK.ink + '!important;border-color:' + DK.ln + '!important}[data-theme="dark"] #cs-root .cs-card :is(h2,h3,b,strong,th){color:' + DK.ink + '!important}' +
    '[data-theme="dark"] #cs-root{background:' + DK.bg + '!important;color:' + DK.ink + '!important}' +
    '[data-theme="dark"] #cmt-sheet :is(th,td){background:' + DK.sf + '!important;border-color:' + DK.ln + '!important;color:' + DK.ink + '!important}[data-theme="dark"] #cmt-sheet tr.sh-tok td{background:#16362c!important}' +
    '[data-theme="dark"] #cs-root .cs-tbl td{background:' + DK.sf + '!important;border-color:' + DK.ln + '!important}[data-theme="dark"] #cs-root .cp-tbl tr.cp-cor td{background:#16324d!important}[data-theme="dark"] #cs-root .cp-tbl tr.cp-lib td{background:#2a2346!important}[data-theme="dark"] #cs-root .cp-tbl tr.cp-pend td{background:#3a3218!important}[data-theme="dark"] #cs-root .cp-tbl .cs-cnj{color:#e6c27a!important}' +
    '[data-theme="dark"] .sh-q .q-ch button{background:' + DK.sf2 + '!important;border-color:' + DK.ln + '!important;color:' + DK.ink + '!important}[data-theme="dark"] .sh-q .q-ch button.on{background:var(--qc)!important;color:#fff!important}' +
    '[data-theme="dark"] ' + CAMPOS + '{background:' + DK.sf2 + '!important;color:' + DK.ink + '!important;border-color:' + DK.ln + '!important}' +
    '[data-theme="dark"] :is(.pv-title,h1,h2){color:' + DK.ink + '!important}' +
    '[data-theme="dark"] main :is([style*="255, 255, 255"],[style*="#fff"],[style*="#FFF"],[style*="247, 245, 240"],[style*="#f7f5f0"],[style*="248, 250, 252"],[style*="251, 250, 247"],[style*="244, 242, 237"],[style*="238, 243, 248"]):not(button):not([class*=chip]){background:' + DK.sf + '!important;border-color:' + DK.ln + '!important;color:' + DK.ink + '!important}' +
    '[data-theme="dark"] main :is([style*="color: rgb(20, 38, 60)"],[style*="color:#14263c"],[style*="color: rgb(20, 48, 78)"],[style*="color: rgb(61, 76, 92)"],[style*="color: rgb(29, 36, 51)"]){color:' + DK.ink + '!important}' +
    '[data-theme="dark"] main section,[data-theme="dark"] main>div>div[class*="central"]{border-color:' + DK.ln + '!important}';
  /* modo noturno: superfícies claras que sobram (cores fixas no código) ganham a superfície escura */
  function claroParaEscuro(doc, raiz) {
    if (!doc || doc.documentElement.getAttribute('data-theme') !== 'dark') return;
    var W2 = doc.defaultView; [].slice.call(doc.querySelectorAll(raiz)).forEach(function (el) {
      if (el.__dk === 1) return; el.__dk = 1; var bg = W2.getComputedStyle(el).backgroundColor, m = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/.exec(bg);
      if (m && (m[4] == null || +m[4] > .5) && +m[1] > 225 && +m[2] > 225 && +m[3] > 215) el.classList.add('dkw'); });
  }
  setInterval(function () { var md = mw() && mw().document; try { claroParaEscuro(md, '#cs-root :is(div,section,article,aside,header,label,span,details,summary,form,li,table,thead,tr,th,td)'); claroParaEscuro(md, 'main :is(div,section,article,aside,header)'); claroParaEscuro(D, '#main :is(div,section,article,aside,header)'); } catch (e) {} }, 1500);
  setInterval(function () { var md = mw() && mw().document; if (!md) return; var t = D.documentElement.getAttribute('data-theme') || ''; if (md.documentElement.getAttribute('data-theme') !== t) { if (t) md.documentElement.setAttribute('data-theme', t); else md.documentElement.removeAttribute('data-theme'); } cssMotor('cmt-dk', CSS_DK_M); }, 600);
  /* =================== Triagem › painel direito: referências rápidas (vias, admissibilidade, competência, matérias, caixas, Regimento) =================== */
  var RF = { q: '', min: (function () { try { return localStorage.getItem('rf_min') === '1'; } catch (e) { return false; } })(), ab: {} };
  function rfTxt(h) { return String(h || '').replace(/<[^>]+>/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function rfBlocos() {
    var B = [];
    try { B.push({ id: 'vias', t: 'Vias recursais', c: '#2b698e', it: R.map(function (r) { return { t: r.nome, s: r.badge, h: '<dl><dt>Contra</dt><dd>' + esc(r.contra || '') + '</dd><dt>Prazo</dt><dd>' + esc(r.prazo || '') + '</dd><dt>Base</dt><dd>' + esc(r.base || '') + '</dd><dt>Órgão</dt><dd>' + esc(r.orgao || '') + '</dd><dt>Sustentação</dt><dd>' + esc(r.sust || '') + '</dd></dl>' + ((r.ess || []).length ? '<ul>' + r.ess.slice(0, 5).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : ''), k: r.kw || '' }; }) }); } catch (e) {}
    try { var RN = {}; R.forEach(function (r) { RN[r.id] = r.nome; }); B.push({ id: 'ato', t: 'Qual recurso cabe?', c: '#1a7f5a', it: ACTS.map(function (a) { return { t: a.t, s: a.d, h: '<p class="rf-v">' + (a.ids || []).map(function (i) { return '<span>' + esc(RN[i] || i) + '</span>'; }).join('') + '</p><p>' + (a.hint || '') + '</p>' }; }) }); } catch (e) {}
    try { var RQ = []; Object.keys(REQ).forEach(function (k) { REQ[k].i.forEach(function (x) { RQ.push({ t: x.t, s: REQ[k].t.replace('Requisitos ', ''), h: '<p>' + x.pl + '</p>' + (x.tc ? '<p class="rf-tc">' + x.tc + '</p>' : '') }); }); }); B.push({ id: 'adm', t: 'Admissibilidade', c: '#a8761c', it: RQ }); } catch (e) {}
    try { B.push({ id: 'sec', t: 'Competência das Seções', c: '#6a4fb3', it: SEC.map(function (s) { return { t: s.n, s: s.t + ' · ' + s.b, h: '<ul>' + (s.m || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' }; }) }); } catch (e) {}
    try { B.push({ id: 'mat', t: 'Matérias frequentes', c: '#a33b4a', it: ASS.map(function (a) { return { t: a.t, s: a.sec, h: '<p>' + (a.d || '') + '</p>' + ((a.pts || []).length ? '<ul>' + a.pts.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : ''), k: (a.tags || []).join(' ') }; }) }); } catch (e) {}
    try { var SN = {}; STN.forEach(function (s) { SN[s.id] = s.t; }); B.push({ id: 'cx', t: 'Caixas do PJe', c: '#3e72ad', it: TK.map(function (k) { return { t: k.nome, s: SN[k.st] || k.st, h: '<p>' + (k.serve || '') + '</p>' + (k.gab ? '<p class="rf-tc">' + k.gab + '</p>' : '') }; }) }); } catch (e) {}
    return B;
  }
  var RF_B = null;
  function rfRit(q) { if (q.length < 3) return ''; var out = [], cap = '';
    try { RIT_DOC.forEach(function (x) { if (out.length >= 8) return; if (x.h != null) { cap = x.k + ' · ' + x.t; return; } var tx = (x.b || []).map(function (b) { return b[1]; }).join(' '); if (rfTxt(tx).indexOf(q) >= 0) out.push('<details class="rf-i"><summary><b>Art. ' + esc(x.n) + '</b><small>' + esc(cap) + '</small></summary><div class="rf-b">' + (x.b || []).filter(function (b) { return b[0] !== 'n'; }).slice(0, 8).map(function (b) { return '<p>' + esc(b[1]) + '</p>'; }).join('') + '</div></details>'); }); } catch (e) {}
    return out.length ? '<section class="rf-s" style="--rc:#5d6475"><h4>Regimento Interno · ' + out.length + (out.length >= 8 ? '+' : '') + ' artigo(s)</h4>' + out.join('') + '</section>' : '';
  }
  /* Referências rápidas da Triagem no modelo do painel "Atalhos" da Central de Comando:
     lista numerada (teclas 1–0), cor por assunto, cada item abre ali mesmo o conteúdo completo do atalho */
  function rfLista() { try { return (typeof MENU === 'function' ? MENU() : (typeof SC !== 'undefined' ? SC : [])).filter(function (s) { return s && s.body; }); } catch (e) { return []; } }
  function rfAbrir(id, rolar) {
    var el = $('#rf-lado'); if (!el) return false; var d = el.querySelector('.atl-i[data-sc="' + id + '"]'); if (!d) return false;
    if (RF.min) { RF.min = false; try { localStorage.setItem('rf_min', '0'); } catch (er) {} refsPainel(); d = el.querySelector('.atl-i[data-sc="' + id + '"]'); }
    d.open = true; if (rolar !== false) setTimeout(function () { d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); return true;
  }
  function rfPreencher(d) {
    var b = d.querySelector('.atl-b'); if (!b || b.dataset.ok) return;
    var s = rfLista().find(function (x) { return x.id === d.dataset.sc; }); if (!s) return;
    try { b.innerHTML = s.body(); if (s.after) s.after(b); } catch (e) { b.innerHTML = '<p class="rf-v0">Não foi possível montar este atalho.</p>'; }
    b.dataset.ok = 1;
  }
  function refsPainel() {
    var on = D.body.getAttribute('data-lado') === 'triagem'; D.body.classList.toggle('rf-on', on); D.body.classList.toggle('rf-min', RF.min);
    var el = $('#rf-lado'); if (!on) return;
    if (!el) { el = D.createElement('aside'); el.id = 'rf-lado'; el.setAttribute('aria-label', 'Referências rápidas'); D.body.appendChild(el);
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-rf="min"]')) { RF.min = !RF.min; try { localStorage.setItem('rf_min', RF.min ? '1' : '0'); } catch (er) {} el.__h = ''; refsPainel(); return; }
        var k = e.target.closest('[data-rf-k]'); if (k) { e.preventDefault(); rfAbrir(k.dataset.rfK); }
      });
      el.addEventListener('toggle', function (e) { var d = e.target; if (d.classList && d.classList.contains('atl-i')) { if (d.open) rfPreencher(d); RF.ab[d.dataset.sc] = d.open; } }, true);
    }
    var L = rfLista(), sig = (RF.min ? 'min' : 'ab') + ':' + L.length;
    if (el.__h === sig) return; el.__h = sig;
    var seta = function (dir) { return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="' + (dir ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6') + '"/></svg>'; };
    if (RF.min) { el.innerHTML = '<button type="button" class="rf-tg" data-rf="min" title="Abrir as referências rápidas" aria-label="Abrir as referências rápidas">' + seta(false) + '</button><span class="rf-vl">Referências</span>' +
      L.slice(0, 10).map(function (s, i) { return '<button type="button" class="rf-k" data-rf-k="' + s.id + '" title="' + esc(s.t) + ' · tecla ' + ((i + 1) % 10) + '" style="--sc:var(' + s.c + ')">' + ((i + 1) % 10) + '</button>'; }).join(''); return; }
    if (!L.length) { el.innerHTML = '<div class="rf-h"><span class="mx-k">Referências rápidas</span></div><p class="rf-v0">Atalhos indisponíveis nesta versão.</p>'; return; }
    el.innerHTML = '<div class="rf-h"><span class="mx-k">Referências rápidas <small>teclas 1–0</small></span><button type="button" class="rf-tg" data-rf="min" title="Recolher" aria-label="Recolher">' + seta(true) + '</button></div>' +
      '<div class="rf-atl">' + L.map(function (s, i) { var ab = RF.ab[s.id] != null ? RF.ab[s.id] : s.id === 'spz';
        return '<details class="atl-i" data-sc="' + s.id + '" style="--sc:var(' + s.c + ')"' + (ab ? ' open' : '') + '><summary>' + (i < 10 ? '<kbd>' + ((i + 1) % 10) + '</kbd>' : '<span></span>') + '<span><b>' + s.t + '</b><small>' + s.s + '</small></span><span class="ic">' + (s.ic || '') + '</span></summary><div class="atl-b"></div></details>'; }).join('') + '</div>';
    el.querySelectorAll('.atl-i[open]').forEach(rfPreencher);
  }
  /* teclas 1–0 na Triagem (no painel e dentro do motor), fora de campos de texto */
  function rfTecla(e) {
    if (D.body.getAttribute('data-lado') !== 'triagem' || e.ctrlKey || e.metaKey || e.altKey) return;
    var a = e.target, tg = a && a.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || (a && a.isContentEditable)) return;
    if (!/^[0-9]$/.test(e.key)) return; var n = e.key === '0' ? 10 : +e.key, L = rfLista(); if (n > L.length) return;
    e.preventDefault(); e.stopImmediatePropagation(); rfAbrir(L[n - 1].id);
  }
  D.addEventListener('keydown', rfTecla, true);
  setInterval(function () { var w = mw(); try { if (w && w.document && !w.document.__rfk) { w.document.__rfk = 1; w.document.addEventListener('keydown', rfTecla, true); } } catch (e) {} }, 1500);
  setInterval(refsPainel, 500);
  var cssRF = D.createElement('style');
  cssRF.textContent =
    '#rf-lado{display:none}html body.rf-on{--rdw:360px}html body.rf-on.rf-min{--rdw:78px}' +
    'html body.rf-on[data-lado=triagem] #cmt-motor{width:calc(100vw - var(--ixw) - var(--rdw))!important}' +
    'html body.rf-on #rf-lado{display:block;position:fixed;top:72px;right:16px;bottom:16px;width:calc(var(--rdw) - 30px);overflow:auto;padding:0 0 14px;z-index:41;border-radius:16px;background:#fff;color:#14263c;border:1px solid #dfe5ea;box-shadow:0 12px 32px -12px rgba(15,31,46,.28);font:500 12.5px Figtree,system-ui,sans-serif}' +
    '#rf-lado .rf-h{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;margin:0;padding:12px 14px 10px;background:#fff;border-bottom:1px solid #eef1f4;border-top:3px solid #c4953c;border-radius:16px 16px 0 0}#rf-lado .mx-k{font:800 10.5px Figtree,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8a6116}' +
    '#rf-lado .rf-tg{width:28px;height:28px;display:grid;place-items:center;border:1px solid #d6dde4;border-radius:999px;background:#fff;color:#1b3553;cursor:pointer;flex:none}#rf-lado .rf-tg:hover{border-color:#c4953c}' +
    'html body.rf-min #rf-lado{padding:12px 4px;display:flex;flex-direction:column;align-items:center;gap:14px;border-top:3px solid #c4953c}#rf-lado .rf-vl{writing-mode:vertical-rl;transform:rotate(180deg);font:800 10.5px Figtree,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#8a6116}' +
    '#rf-lado .rf-q{display:block;width:calc(100% - 28px);box-sizing:border-box;margin:10px 14px;border:1px solid #d6dde4;background:#f7f9fb;color:#14263c;border-radius:999px;padding:8px 14px;font:500 12.5px Figtree,sans-serif}#rf-lado .rf-q:focus{outline:2px solid #c4953c;outline-offset:0;background:#fff}' +
    '#rf-lado .rf-s{margin:0 10px 8px;border:1px solid #e6ebf0;border-radius:12px;background:#fbfcfd;overflow:hidden}#rf-lado .rf-s>summary{list-style:none;cursor:pointer;border-left:4px solid var(--rc)}#rf-lado .rf-s>summary::-webkit-details-marker{display:none}' +
    '#rf-lado .rf-s h4{display:flex;justify-content:space-between;align-items:center;margin:0;padding:9px 10px;font:800 12.5px Figtree,sans-serif;color:#14263c}#rf-lado .rf-s[open]>summary h4{background:color-mix(in srgb,var(--rc) 9%,#fff)}#rf-lado .rf-s h4 b{font:800 10.5px Figtree,sans-serif;color:var(--rc);background:#fff;border:1px solid color-mix(in srgb,var(--rc) 35%,#fff);border-radius:999px;padding:1px 8px}' +
    '#rf-lado .rf-i{border-top:1px solid #eef1f4;background:#fff}#rf-lado .rf-i>summary{cursor:pointer;padding:7px 12px;list-style:none}#rf-lado .rf-i>summary::-webkit-details-marker{display:none}#rf-lado .rf-i>summary b{display:block;color:#1b3553;font-size:12.5px}#rf-lado .rf-i>summary small{display:block;color:#6b7b8d;font-size:11px;line-height:1.3}#rf-lado .rf-i[open]>summary b{color:var(--rc)}' +
    '#rf-lado .rf-b{padding:0 12px 10px;font-size:12px;line-height:1.5;color:#33475a}#rf-lado .rf-b p{margin:4px 0}#rf-lado .rf-b ul{margin:4px 0;padding-left:16px}#rf-lado .rf-b li{margin:2px 0}#rf-lado .rf-b b{color:#14263c}#rf-lado .rf-tc{color:#5d6b78;font-size:11.5px;border-left:2px solid #e6c27a;padding-left:7px}' +
    '#rf-lado dl{display:grid;grid-template-columns:82px 1fr;gap:3px 8px;margin:2px 0 6px}#rf-lado dt{color:#8a6116;font-weight:800;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase}#rf-lado dd{margin:0}#rf-lado .rf-v span{display:inline-block;margin:0 4px 4px 0;padding:2px 9px;border-radius:999px;background:#eef3f8;color:#1b3553;font-weight:700;font-size:11px}#rf-lado .rf-v0{color:#6b7b8d;padding:4px 14px}' +
    '#rf-lado .rf-atl{display:flex;flex-direction:column;gap:5px;padding:10px 10px 0}#rf-lado .atl-i{background:#fff;border:1px solid #e3e8ed;border-left:3px solid var(--sc);border-radius:8px}' +
    '#rf-lado .atl-i>summary{list-style:none;display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;padding:7px 9px;cursor:pointer}#rf-lado .atl-i>summary::-webkit-details-marker{display:none}' +
    '#rf-lado .atl-i kbd{min-width:20px;height:20px;display:inline-grid;place-items:center;border:1px solid #d6dde4;border-bottom-width:2px;border-radius:5px;font:700 11px ui-monospace,Consolas,monospace;color:#1b3553;background:#f7f9fb}' +
    '#rf-lado .atl-i summary b{display:block;font:800 13px/1.2 Figtree,sans-serif;color:#14263c}#rf-lado .atl-i summary small{display:block;font-size:11px;color:#6b7b8d;line-height:1.25}#rf-lado .atl-i .ic{color:var(--sc);font-size:15px}' +
    '#rf-lado .atl-i[open]{box-shadow:0 8px 20px -16px var(--sc)}#rf-lado .atl-i[open]>summary{border-bottom:1px dashed #e3e8ed}' +
    '#rf-lado .atl-b{padding:8px 10px 10px;font-size:12.4px;line-height:1.5;color:#33475a;max-height:62vh;overflow:auto}#rf-lado .atl-b h4{font-size:13.5px!important;color:var(--sc)!important;margin:10px 0 4px!important}#rf-lado .atl-b h4:first-child{margin-top:0!important}' +
    '#rf-lado .atl-b .qa div{grid-template-columns:1fr;gap:2px;padding:6px 8px;font-size:12px}#rf-lado .atl-b .qa b{text-align:left;max-width:none}#rf-lado .atl-b table{font-size:11.5px}#rf-lado .atl-b th,#rf-lado .atl-b td{padding:4px 6px}#rf-lado .atl-b .verbs{grid-template-columns:1fr}#rf-lado .atl-b .tbl{overflow:auto}' +
    '#rf-lado .rf-k{width:30px;height:30px;border-radius:9px;border:1px solid #d6dde4;border-left:3px solid var(--sc);background:#fff;color:#1b3553;font:800 12px ui-monospace,Consolas,monospace;cursor:pointer}#rf-lado .rf-k:hover{background:#f3f6f8}' +
    '#rf-lado .atl-b h1,#rf-lado .atl-b h2,#rf-lado .atl-b h3{font-size:15px!important;line-height:1.25!important;margin:8px 0 4px!important}#rf-lado .atl-b ul{padding-left:18px;margin:4px 0}' +
    '#rf-lado .rf-h small{font-weight:600;letter-spacing:.04em;text-transform:none;color:#8a98a6;margin-left:6px}' +
    '[data-theme="dark"] #rf-lado .atl-i,[data-theme="dark"] #rf-lado .rf-k{background:#183447;border-color:#27465c}[data-theme="dark"] #rf-lado .atl-i summary b{color:#e3ebf2}[data-theme="dark"] #rf-lado .atl-b{color:#c9d6e1}[data-theme="dark"] #rf-lado kbd{background:#132a3b;color:#e3ebf2;border-color:#27465c}' +
    '[data-theme="dark"] body.rf-on #rf-lado,[data-theme="dark"] #rf-lado .rf-h,[data-theme="dark"] #rf-lado .rf-i,[data-theme="dark"] #rf-lado .rf-tg{background:#132a3b;border-color:#27465c;color:#e3ebf2}[data-theme="dark"] #rf-lado .rf-s{background:#183447;border-color:#27465c}[data-theme="dark"] #rf-lado .rf-s h4,[data-theme="dark"] #rf-lado .rf-i>summary b,[data-theme="dark"] #rf-lado .rf-b b{color:#e3ebf2}[data-theme="dark"] #rf-lado .rf-s[open]>summary h4{background:#1d3d52}[data-theme="dark"] #rf-lado .rf-b{color:#c8d6e2}[data-theme="dark"] #rf-lado .rf-q{background:#183447;border-color:#27465c;color:#e3ebf2}[data-theme="dark"] #rf-lado .rf-v span{background:#1d3d52;color:#e3ebf2}[data-theme="dark"] #rf-lado .mx-k,[data-theme="dark"] #rf-lado dt{color:#e6c27a}';
  D.head.appendChild(cssRF);
  var cssCR = D.createElement('style');
  cssCR.textContent =
    'html body.au-pan{--rlw:0px!important}html body.au-pan #rail{display:none!important}' +
    'body.cmt-cfg-rel #cmt-motor{visibility:hidden!important;pointer-events:none!important}#cmt-cfg-rel{display:none}' +
    'body.cmt-cfg-rel #cmt-cfg-rel{display:flex;flex-direction:column;position:fixed;left:4vw;top:calc(4vh + 48px);width:92vw;height:calc(92vh - 48px);z-index:61;background:#f4f2ed;border-radius:0 0 12px 12px;box-shadow:0 20px 60px rgba(0,0,0,.4);overflow:hidden;font-family:Figtree,system-ui,sans-serif;color:#14263c}' +
    '#cmt-cfg-rel .cr-hd{padding:14px 20px 8px}#cmt-cfg-rel .cr-hd b{display:block;font:800 20px Figtree,system-ui,sans-serif;letter-spacing:-.02em}#cmt-cfg-rel .cr-hd small{color:#6b7b8d;font-size:12.5px}' +
    '#cmt-cfg-rel .cr-bar{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 14px;margin:0 20px 10px;padding:12px 14px;background:#fff;border:1px solid #e1dcd2;border-radius:14px;box-shadow:0 1px 2px rgba(20,38,60,.04)}' +
    '#cmt-cfg-rel .cr-f{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6b7b8d}#cmt-cfg-rel .cr-f.cr-t{flex:1 1 320px}' +
    '#cmt-cfg-rel .cr-f select,#cmt-cfg-rel .cr-f input{font:600 13.5px Figtree,system-ui,sans-serif;text-transform:none;letter-spacing:0;color:#14263c;border:1px solid #d8d2c6;border-radius:9px;padding:7px 10px;background:#fbfaf7;min-width:240px}#cmt-cfg-rel .cr-f select:focus,#cmt-cfg-rel .cr-f input:focus{outline:2px solid #c4953c;outline-offset:0;border-color:#c4953c}' +
    '#cmt-cfg-rel .cr-ac{display:flex;gap:8px;margin-left:auto}#cmt-cfg-rel .cr-b{border:1px solid #1b3553;background:#fff;color:#1b3553;border-radius:999px;padding:8px 16px;font:800 13px Figtree,system-ui,sans-serif;cursor:pointer}#cmt-cfg-rel .cr-b.pri{background:#1b3553;color:#fff}#cmt-cfg-rel .cr-b:hover{border-color:#c4953c;box-shadow:0 0 0 3px rgba(196,149,60,.18)}' +
    '#cmt-cfg-rel .cr-secs{flex:1 1 100%;display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding-top:8px;border-top:1px dashed #e1dcd2}#cmt-cfg-rel .cr-secs>span{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6b7b8d;margin-right:4px}' +
    '#cmt-cfg-rel .cr-s{display:inline-flex;align-items:center;gap:5px;border:1px solid #d8d2c6;border-radius:999px;padding:3px 10px 3px 7px;font-size:12px;font-weight:600;color:#6b7b8d;background:#f6f4ef;cursor:pointer}#cmt-cfg-rel .cr-s.on{background:#eef3f8;border-color:#9db6cf;color:#1b3553}#cmt-cfg-rel .cr-s input{margin:0;accent-color:#1b3553}' +
    '#cmt-cfg-rel .cr-l{border:0;background:none;color:#2b698e;font:700 12px Figtree,system-ui,sans-serif;cursor:pointer;text-decoration:underline;padding:2px 4px}' +
    '#cmt-cfg-rel .cr-body{flex:1;min-height:0;overflow:auto;padding:0 20px 20px}' +
    'html body #cmt-cfg-rel #au-relrail{display:block!important;background:transparent}html body #cmt-cfg-rel #au-relrail .au-rrh{display:none!important}html body #cmt-cfg-rel #au-relrail .au-rrc{padding:0!important}' +
    'html body #cmt-cfg-rel #au-relrail #rp .rp-grid{display:grid!important;grid-template-columns:270px minmax(0,1fr)!important;gap:16px!important}' +
    'html body #cmt-cfg-rel #au-relrail #rp .rp-cat{position:sticky!important;top:0!important;max-height:calc(92vh - 230px)!important;overflow:auto!important;margin:0!important}' +
    'html body #cmt-cfg-rel #au-relrail.au-rel-foco .rp-cat{display:flex!important}html body #cmt-cfg-rel .au-relvolta{display:none!important}html body #cmt-cfg-rel #rp>h2{display:none!important}';
  D.head.appendChild(cssCR);
})(window, document);

