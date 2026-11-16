/* Atualizar acervo fonte · módulo comum (sem dependência de tela).

   Regra (scripts/painel/atualizar_fonte.py): a fonte tem só os processos efetivamente no gabinete, isto é, em tarefa
   do gabinete no PJe ou no acervo do Power BI (tramitação e sigilosos). Quem volta entra; quem foi baixado, arquivado
   ou redistribuído sai (o trabalho registrado vai para acervo/operacional-arquivo.json e volta se o processo voltar).

   Fluxo: o navegador lê as três planilhas do dia, guarda só as colunas usadas e grava acervo/entrada/carga.json no
   procs-muta. O GitHub Action "Acervo fonte · atualizar" (.github/workflows/acervo-fonte.yml) aplica a regra,
   complementa com o DataJud e grava fonte.json, fonte.csv, operacional.json e operacional-arquivo.json num commit.

   Uso numa página:
     <script src="/padrao/acervo-fonte.js"></script>
     const r = await CMTAtualizarFonte.atualizar(arquivos, { XLSX, ProcsMuta, aviso: texto => ... });
     // r = { commit, resumo, ignorados }; depois, recarregar acervo/fonte.json e acervo/operacional.json.
   As três planilhas (escolhidas juntas, em qualquer ordem; o tipo vem do cabeçalho, não do nome):
     PJe 2G · Painel Gerencial (.csv)     Power BI · Tramitação Total (.xlsx)     Power BI · Sigilosos (.xlsx)
*/
(function (W) {
  'use strict';
  if (W.CMTAtualizarFonte) return;
  var CARGA = 'acervo/entrada/carga.json';
  var COLS = {
    pje: ['Número do Processo', 'Classe', 'Assunto', 'Tarefa', 'Etiquetas', 'Prioridade', 'Data de Chegada', 'Polo Ativo', 'Polo Passivo'],
    bi: ['Processo', 'Ano', 'Mês', 'Gabinete', 'Indicador', 'Data_Distribuição', 'Código_Classe', 'Classe', 'Código_Assunto_Principal',
         'Assunto_Principal', 'Assuntos_do_Processo', 'Pendente_1Julgamento', 'Conclusão?', 'Data_Conclusão', 'Data_Fase', 'Fase',
         'Complemento', 'Última_Movimentação', 'Data_Última_Movimentação', 'Tempo_de_Tramitação', 'Polo_Ativo', 'Polo_Passivo',
         'Seção de Origem', 'Valor_da_Causa', 'Qtde'],
    sigilosos: ['Processo', 'Ano', 'Mês', 'Gabinete', 'Data_Distribuição', 'Nível_Sigilo', 'Tempo_Última_Movimentação']
  };
  var NOMES = { pje: 'PJe · painel gerencial (.csv)', bi: 'Power BI · tramitação (.xlsx)', sigilosos: 'Power BI · sigilosos (.xlsx)' };

  function isoData(y, m, d) { return String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }

  function linhasCsv(t) {
    t = String(t).replace(/^﻿/, '');
    var p = t.indexOf('\n'), cab = p < 0 ? t : t.slice(0, p);
    var sep = (cab.match(/;/g) || []).length >= (cab.match(/,/g) || []).length ? ';' : ',';
    var out = [], linha = [], campo = '', q = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else q = false; } else campo += ch; continue; }
      if (ch === '"') { q = true; continue; }
      if (ch === sep) { linha.push(campo); campo = ''; continue; }
      if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && t[i + 1] === '\n') i++;
        linha.push(campo); campo = '';
        if (linha.some(function (c) { return c !== ''; })) out.push(linha);
        linha = []; continue;
      }
      campo += ch;
    }
    if (campo !== '' || linha.length) { linha.push(campo); if (linha.some(function (c) { return c !== ''; })) out.push(linha); }
    return out;
  }

  /* datas viram AAAA-MM-DD pelo código da data do Excel (sem fuso); números continuam números */
  function linhasXlsx(X, buf) {
    var wb = X.read(buf, { type: 'array', cellNF: true }), ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws || !ws['!ref']) return [];
    var R = X.utils.decode_range(ws['!ref']), out = [];
    for (var r = R.s.r; r <= R.e.r; r++) {
      var l = [];
      for (var c = R.s.c; c <= R.e.c; c++) {
        var cel = ws[X.utils.encode_cell({ r: r, c: c })], v = null;
        if (cel) {
          v = cel.v;
          if (cel.t === 'n' && X.SSF.is_date(cel.z || '')) { var d = X.SSF.parse_date_code(v); if (d) v = isoData(d.y, d.m, d.d); }
          else if (cel.t === 'd' && v instanceof Date) v = isoData(v.getFullYear(), v.getMonth() + 1, v.getDate());
        }
        l.push(v);
      }
      out.push(l);
    }
    return out;
  }

  /* tipo pelo cabeçalho; só as colunas usadas; só número de processo completo (20 dígitos; "Sigilo(...)" fica de fora) */
  function planilha(linhas) {
    var i = linhas.findIndex(function (l) { return (l || []).some(function (v) { v = String(v == null ? '' : v).trim(); return v === 'Processo' || v === 'Número do Processo'; }); });
    if (i < 0) return null;
    var H = linhas[i].map(function (v) { return String(v == null ? '' : v).trim(); }), tem = function (c) { return H.indexOf(c) >= 0; };
    var tipo = tem('Número do Processo') && tem('Tarefa') ? 'pje'
      : tem('Nível_Sigilo') ? 'sigilosos'
      : tem('Processo') && (tem('Indicador') || tem('Tempo_de_Tramitação')) ? 'bi' : '';
    if (!tipo) return null;
    var cols = COLS[tipo], chave = cols[0], idx = {};
    H.forEach(function (h, k) { if (cols.indexOf(h) >= 0 && !(h in idx)) idx[h] = k; });
    var regs = [];
    linhas.slice(i + 1).forEach(function (l) {
      var o = {};
      cols.forEach(function (c) { var v = c in idx ? l[idx[c]] : null; o[c] = v === undefined || v === '' ? null : v; });
      if (String(o[chave] == null ? '' : o[chave]).replace(/\D/g, '').length === 20) regs.push(o);
    });
    return { tipo: tipo, regs: regs };
  }

  async function montarCarga(arquivos, X) {
    var carga = { schema: 'gabA.acervo.carga', versao: 1, enviado_em: new Date().toISOString(), arquivos: {} }, ignorados = [];
    for (var k = 0; k < arquivos.length; k++) {
      var f = arquivos[k];
      var linhas = /\.csv$/i.test(f.name) ? linhasCsv(await f.text()) : linhasXlsx(X, new Uint8Array(await f.arrayBuffer()));
      var p = planilha(linhas);
      if (!p) { ignorados.push(f.name); continue; }
      if (carga[p.tipo]) throw new Error('Duas planilhas de ' + NOMES[p.tipo] + ': ' + carga.arquivos[p.tipo] + ' e ' + f.name + '. Escolha uma de cada.');
      carga[p.tipo] = p.regs; carga.arquivos[p.tipo] = f.name;
    }
    var falta = ['pje', 'bi', 'sigilosos'].filter(function (t) { return !carga[t] || !carga[t].length; });
    if (falta.length) throw new Error('Faltou ' + falta.map(function (t) { return NOMES[t]; }).join(' e ') +
      '. A fonte só é refeita com as três planilhas do mesmo dia.' + (ignorados.length ? ' Não reconhecidas: ' + ignorados.join(', ') + '.' : ''));
    return { carga: carga, ignorados: ignorados,
             resumo: carga.pje.length + ' no PJe, ' + carga.bi.length + ' no Power BI, ' + carga.sigilosos.length + ' sigilosos' };
  }

  /* espera o commit do Action que consome a carga; se o token puder ler Actions, avisa o andamento e a falha */
  async function acompanhar(PM, sha, desde, aviso, minutos) {
    var base = 'https://api.github.com/repos/' + PM.dono + '/' + PM.repo, limite = Date.now() + (minutos || 20) * 60000, semActions = false, volta = 0;
    var op = function () { return { cache: 'no-store', headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + PM.atual, 'X-GitHub-Api-Version': '2022-11-28' } }; };
    var espera = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    while (Date.now() < limite) {
      await espera(15000); volta++;
      /* o commit do Action apaga a carga: é o sinal de que terminou (mesmo quando nada mudou na fonte) */
      var c = null; try { c = await fetch(base + '/commits?sha=' + PM.ramo + '&path=' + encodeURIComponent(CARGA) + '&since=' + encodeURIComponent(desde) + '&per_page=5', op()); } catch (e) {}
      if (c && c.ok) { var lst = await c.json(), fim = (lst || []).find(function (x) { return x.sha !== sha && /^Acervo fonte: regra/.test(((x.commit || {}).message) || ''); }); if (fim) return fim; }
      if (!semActions) {
        var r = null; try { r = await fetch(base + '/actions/runs?head_sha=' + sha + '&per_page=10', op()); } catch (e) {}
        if (r && r.ok) {
          var j = await r.json(), run = (j.workflow_runs || []).find(function (x) { return /acervo-fonte\.yml$/.test(x.path || ''); });
          if (run && run.status === 'completed' && run.conclusion !== 'success')
            throw new Error('O GitHub não conseguiu atualizar a fonte (' + run.conclusion + '). A carga ficou em ' + CARGA + '. Detalhes: ' + run.html_url);
          if (run) aviso('O GitHub está aplicando a regra do acervo e consultando o DataJud (' + (run.status === 'queued' ? 'na fila' : 'em execução') + ', ' + Math.round(volta / 4) + ' min)…');
        } else if (r && (r.status === 403 || r.status === 404)) semActions = true;
      }
      if (semActions) aviso('Carga enviada. Aguardando o GitHub gravar a nova fonte (' + Math.round(volta / 4) + ' min)…');
    }
    throw new Error('A carga foi enviada, mas a fonte não foi gravada em ' + (minutos || 20) + ' minutos. Confira a aba Actions do procs-muta (Acervo fonte · atualizar).');
  }

  async function atualizar(arquivos, o) {
    o = o || {};
    var X = o.XLSX || W.XLSX, PM = o.ProcsMuta || W.ProcsMuta, aviso = o.aviso || function () {};
    if (!X) throw new Error('Leitor de planilhas (XLSX) indisponível.');
    if (!PM || !PM.gravar) throw new Error('Gravação no procs-muta indisponível nesta página.');
    if (!PM.atual && PM.token) await PM.token('Para atualizar o acervo fonte.', true);
    aviso('Lendo as planilhas…');
    var m = await montarCarga(Array.from(arquivos || []), X);
    aviso('Enviando a carga ao procs-muta (' + m.resumo + ')…');
    var desde = new Date(Date.now() - 60000).toISOString();
    var sha = await PM.gravar({ [CARGA]: JSON.stringify(m.carga) }, 'Acervo fonte: carga enviada pelo painel (' + m.resumo + ')');
    aviso('Carga enviada (' + m.resumo + '). O GitHub aplica a regra do acervo e consulta o DataJud; leva alguns minutos.');
    var cm = await acompanhar(PM, sha, desde, aviso, o.minutos);
    return { commit: cm, mensagem: ((cm.commit || {}).message || '').split('\n')[0], resumo: m.resumo, ignorados: m.ignorados };
  }

  W.CMTAtualizarFonte = { atualizar: atualizar, montarCarga: montarCarga, planilha: planilha, linhasCsv: linhasCsv, linhasXlsx: linhasXlsx, CARGA: CARGA };
})(typeof window !== 'undefined' ? window : globalThis);
