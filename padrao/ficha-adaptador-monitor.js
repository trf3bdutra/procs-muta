/* CMT-monitor · adaptador da ficha única (padrao/ficha-dialogo.js). Lê o modelo (padrao/ficha.json) e o registro do gabinete
   (acervo/operacional.json) pelo token do procs-muta do motor (window.ProcsMuta) e grava direto na base, com as mesmas regras do
   servidor da Pauta da equipe (CMTFicha.aplicar). Os dados do acervo vêm da linha do painel central (fonte já carregada).
   Toda abertura de ficha do monitor (Acervo, Triagem, Cadastro de sessão) passa por CMTProntuario.abrir, que agora abre esta ficha. */
(function () {
  'use strict';
  var W = window, dg = function (v) { return String(v || '').replace(/\D/g, ''); };
  function mw() { var f = document.getElementById('cmt-motor'); try { return f && f.contentWindow; } catch (e) { return null; } }
  function pm() { var w = mw(); return w && w.ProcsMuta; }
  var FIC = null, OP = null, OP_T = 0;
  function lerJSON(rel) { var P = pm(); if (!P || !P.ler) return Promise.reject(new Error('O motor do monitor ainda está carregando; tente de novo em instantes.')); return P.ler(rel).then(function (t) { return JSON.parse(t); }); }
  function ficha() { return FIC ? Promise.resolve(FIC) : lerJSON('padrao/ficha.json').then(function (F) { FIC = F; return F; }); }
  function oper(fresco) { if (!fresco && OP && Date.now() - OP_T < 180e3) return Promise.resolve(OP); return lerJSON('acervo/operacional.json').then(function (O) { if (!O || !Array.isArray(O.registros)) throw new Error('acervo/operacional.json ilegível'); OP = O; OP_T = Date.now(); return O; }); }
  function linha(cnj) { var w = mw(), c = w && w.__painelCentralComponent, R = (c && c.rows) || []; for (var i = 0; i < R.length; i++) if (dg(R[i].processo || R[i].Processo) === dg(cnj)) return R[i]; return null; }
  function registro(O, cnj) { var R = O.registros || []; for (var i = 0; i < R.length; i++) if (dg(R[i].processo) === dg(cnj)) return R[i]; return null; }
  var copia = function (o) { return o ? JSON.parse(JSON.stringify(o)) : null; };
  var AD = {
    carregar: function (cnj) { return Promise.all([ficha(), oper()]).then(function (x) { return { ficha: x[0], operacional: copia(registro(x[1], cnj)), fonte: linha(cnj) || {}, gestor: true }; }); },
    gravar: function (cnj, campos) {
      var P = pm(); if (!P || !P.gravar) return Promise.reject(new Error('gravação no procs-muta indisponível nesta página'));
      return oper(true).then(function (O) {
        var r = registro(O, cnj);
        if (!r) { var l = linha(cnj); r = { processo: (l && (l.processo || l.Processo)) || cnj, origem: {}, triagem: {}, producao: {}, pauta: { sessoes: [] }, controles: {} }; O.registros.push(r); O.registros.sort(function (a, b) { return String(a.processo).localeCompare(String(b.processo)); }); }
        var out = W.CMTFicha.aplicar(r, campos, 'CMT-monitor');
        if (!out.length) return { operacional: copia(r) };
        O.atualizado_em = new Date().toISOString();
        return P.gravar({ 'acervo/operacional.json': JSON.stringify(O, null, 1) + '\n' }, 'Ficha (CMT-monitor): ' + r.processo + ' · ' + out.slice(0, 6).join(', ')).then(function () {
          OP_T = Date.now();
          /* a linha do painel recebe os valores novos (mesmo caminho da leitura do operacional) */
          try { var row = linha(cnj), w = mw(); if (row && w.CMTOperacional) w.CMTOperacional.paraLinha(row, r); var c = w.__painelCentralComponent; if (c && c.refresh) c.refresh(); } catch (e) { console.warn('[ficha] painel', e); }
          return { operacional: copia(r) };
        });
      });
    },
    avisar: function (t) { try { (W.toast || (mw() || {}).toast || console.log)(t); } catch (e) { console.log(t); } }
  };
  W.CMTFichaMonitor = AD;
  var P = W.CMTProntuario = W.CMTProntuario || {};
  P.abrirProntuario = P.abrirProntuario || P.abrir;
  P.abrir = function (p, lista) { W.CMTFicha.abrir(p, Object.assign({}, AD, { lista: Array.isArray(lista) ? lista.slice() : [] })); };
})();
