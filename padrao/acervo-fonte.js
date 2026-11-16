/* Atualizar acervo fonte · módulo comum (sem dependência de tela).

   Objetivo: a fonte (acervo/fonte.json) sempre atualizada quanto ao paradeiro de cada processo (tarefa do PJe).
   Cada planilha escolhida tem um papel (sugerido pelo conteúdo; a tela deixa trocar antes de enviar):
     principal     lista dos em andamento (PJe, com a coluna Tarefa): define quem está na fonte e onde está.
                   Entra quem aparece; sai quem não aparece (o trabalho registrado vai para acervo/operacional-arquivo.json).
     complementar  mais informações (Power BI, sigilosos, relação detalhada, outra): só preenche quem já está na fonte.
     tarefa        lista de uma tarefa do PJe: atualiza o paradeiro de quem veio nela; quem estava naquela tarefa
                   e não veio perde a tarefa (fica tarefa_anterior e saiu_da_tarefa_em), sem sair da fonte.
   Fluxo: o navegador lê as planilhas, grava acervo/entrada/carga.json no procs-muta; o GitHub Action
   "Acervo fonte · atualizar" aplica scripts/painel/atualizar_fonte.py, complementa com o DataJud e grava fonte.json,
   fonte.csv, operacional.json e operacional-arquivo.json num commit.

   Uso numa página:
     <script src="/padrao/acervo-fonte.js"></script>
     const lidos = await CMTAtualizarFonte.classificar(arquivos, XLSX);  // [{nome, tipo, papel, processos, tarefas}]
     // mostrar a lista; o usuário pode trocar o papel de cada uma
     const r = await CMTAtualizarFonte.atualizar(null, { lidos, papeis: {'arquivo.csv': 'tarefa'}, XLSX, ProcsMuta, aviso: t => ... });
     // r = { commit, mensagem, modo, resumo, ignorados }; depois, reler acervo/fonte.json e acervo/operacional.json.
*/
(function (W) {
  'use strict';
  if (W.CMTAtualizarFonte) return;
  var PASTA = 'acervo/entrada/';
  /* uma carga por envio, com nome próprio (data e hora + sufixo): cargas seguidas não se sobrepõem */
  function nomeCarga() { var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
    return PASTA + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + '-' + Math.random().toString(36).slice(2, 6) + '.json'; }
  var COLS = {
    pje: ['Número do Processo', 'Classe', 'Assunto', 'Tarefa', 'Etiquetas', 'Prioridade', 'Data de Chegada', 'Polo Ativo', 'Polo Passivo',
          'Órgão Julgador', 'Colegiado', 'Sigiloso', 'Liminar Pendente', 'Cargo Judicial', 'Peso Prioridade', 'Data Último Movimento'],
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

  var CHAVES = ['Número do Processo', 'Processo', 'processo', 'Nº Processo', 'Número Processo'];
  var PII = /cpf|celular|telefone|e-?mail/i;
  var LISTA = { nomeTarefa: 'Tarefa', dataChegada: 'Data de Chegada', tagsProcessoList: 'Etiquetas', poloAtivo: 'Polo Ativo', poloPassivo: 'Polo Passivo', classeJudicial: 'Classe', assuntoPrincipal: 'Assunto', orgaoJulgador: 'Órgão Julgador', orgaoJulgadorColegiado: 'Colegiado', sigiloso: 'Sigiloso', cargoJudicial: 'Cargo Judicial', prioridade: 'Prioridade' };
  var PAPEIS = { principal: 'principal (em andamento)', complementar: 'complementar', tarefa: 'lista de uma tarefa' };

  /* tipo pelo cabeçalho; papel padrão: PJe com 3+ tarefas = principal, com 1-2 = lista de tarefa; o resto = complementar.
     Só número de processo completo (20 dígitos; "Sigilo(...)" fica de fora); sem colunas de CPF, telefone e e-mail. */
  function planilha(linhas, nome) {
    var i = linhas.findIndex(function (l) { return (l || []).some(function (v) { return CHAVES.indexOf(String(v == null ? '' : v).trim()) >= 0; }); });
    if (i < 0) return null;
    var H = linhas[i].map(function (v) { return String(v == null ? '' : v).trim(); }), tem = function (c) { return H.indexOf(c) >= 0; };
    /* exportação da lista de uma tarefa do PJe (camelCase): os mesmos campos do painel gerencial */
    if (tem('nomeTarefa') || tem('dataChegada')) { H = H.map(function (h) { return LISTA[h] || h; }); if (!tem('Número do Processo') && tem('Processo')) H[H.indexOf('Processo')] = 'Número do Processo'; }
    var tipo = tem('Número do Processo') && tem('Tarefa') ? 'pje'
      : tem('Nível_Sigilo') ? 'sigilosos'
      : tem('Processo') && (tem('Indicador') || tem('Tempo_de_Tramitação')) ? 'bi' : 'generica';
    var cols = COLS[tipo] || H.filter(function (h) { return h && !PII.test(h); });
    var chave = CHAVES.find(function (c) { return tem(c); }), idx = {};
    H.forEach(function (h, k) { if (cols.indexOf(h) >= 0 && !(h in idx)) idx[h] = k; });
    var regs = [], tarefas = {};
    linhas.slice(i + 1).forEach(function (l) {
      var o = {};
      cols.forEach(function (c) { if (!(c in idx)) return; var v = l[idx[c]]; o[c] = v === undefined || v === '' ? null : v; });
      if (String(l[H.indexOf(chave)] == null ? '' : l[H.indexOf(chave)]).replace(/\D/g, '').length !== 20) return;
      o[chave] = l[H.indexOf(chave)];
      var t = o.Tarefa || o.tarefa_atual; if (t) tarefas[t] = (tarefas[t] || 0) + 1;
      regs.push(o);
    });
    var nt = Object.keys(tarefas).length;
    return { nome: nome || '', tipo: tipo, papel: tipo === 'pje' ? (nt >= 3 ? 'principal' : 'tarefa') : 'complementar',
             processos: regs.length, tarefas: tarefas, linhas: regs };
  }

  /* lê os arquivos e devolve o que cada um é, para a tela mostrar e deixar trocar o papel antes de enviar */
  async function classificar(arquivos, X) {
    var out = [];
    for (var k = 0; k < arquivos.length; k++) {
      var f = arquivos[k];
      var linhas = /\.csv$/i.test(f.name) ? linhasCsv(await f.text()) : linhasXlsx(X, new Uint8Array(await f.arrayBuffer()));
      var p = planilha(linhas, f.name);
      out.push(p || { nome: f.name, tipo: '', papel: '', processos: 0, tarefas: {}, linhas: [], erro: 'sem coluna de número do processo' });
    }
    return out;
  }

  /* papeis: { 'nome do arquivo': 'principal' | 'complementar' | 'tarefa' } troca o papel sugerido */
  function montarCarga(lidos, papeis) {
    var ok = lidos.filter(function (p) { return p.tipo && p.processos; });
    ok.forEach(function (p) { if (papeis && PAPEIS[papeis[p.nome]]) p.papel = papeis[p.nome]; });
    if (!ok.length) throw new Error('Nenhuma planilha com número de processo.');
    var pr = ok.filter(function (p) { return p.papel === 'principal'; });
    var resumo = ok.map(function (p) { return p.nome + ' (' + PAPEIS[p.papel] + ', ' + p.processos + ')'; }).join(' · ');
    return { resumo: resumo, modo: pr.length ? 'completa' : 'parcial', ignorados: lidos.filter(function (p) { return !p.tipo || !p.processos; }).map(function (p) { return p.nome; }),
             carga: { schema: 'gabA.acervo.carga', versao: 2, enviado_em: new Date().toISOString(),
                      arquivos: ok.map(function (p) { return { nome: p.nome, tipo: p.tipo, papel: p.papel, linhas: p.linhas }; }) } };
  }

  /* espera o Action consumir a carga: o arquivo sai de acervo/entrada (processada) ou vai para acervo/entrada/recusadas */
  async function acompanhar(PM, sha, caminho, aviso, minutos) {
    var base = 'https://api.github.com/repos/' + PM.dono + '/' + PM.repo, limite = Date.now() + (minutos || 20) * 60000, volta = 0, semActions = false;
    var op = function (raw) { return { cache: 'no-store', headers: { 'Accept': raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'Authorization': 'Bearer ' + PM.atual, 'X-GitHub-Api-Version': '2022-11-28' } }; };
    var espera = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var nome = caminho.split('/').pop(), recus = PASTA + 'recusadas/' + nome;
    while (Date.now() < limite) {
      await espera(volta ? 10000 : 6000); volta++;
      var c = null; try { c = await fetch(base + '/contents/' + caminho + '?ref=' + PM.ramo + '&t=' + Date.now(), op()); } catch (e) {}
      if (c && c.status === 404) {
        var rr = null; try { rr = await fetch(base + '/contents/' + recus.replace(/\.json$/, '.txt') + '?ref=' + PM.ramo + '&t=' + Date.now(), op(true)); } catch (e) {}
        if (rr && rr.ok) throw new Error('A carga foi recusada pelo processamento: ' + (await rr.text()).trim().split('\n').slice(-2).join(' '));
        var cm = null; try { var l = await fetch(base + '/commits?sha=' + PM.ramo + '&path=' + encodeURIComponent(caminho) + '&per_page=1', op()); if (l.ok) cm = (await l.json())[0]; } catch (e) {}
        return cm || { commit: { message: 'Acervo fonte: carga processada' } };
      }
      if (!semActions) {
        var r = null; try { r = await fetch(base + '/actions/runs?head_sha=' + sha + '&per_page=10', op()); } catch (e) {}
        if (r && r.ok) {
          var j = await r.json(), run = (j.workflow_runs || []).find(function (x) { return /acervo-fonte\.yml$/.test(x.path || ''); });
          if (run && run.status === 'completed' && run.conclusion === 'failure')
            throw new Error('O GitHub não conseguiu processar a carga. A carga continua em ' + caminho + '. Detalhes: ' + run.html_url);
          aviso('O GitHub está aplicando a regra do acervo (' + (run ? (run.status === 'queued' ? 'na fila' : run.status === 'completed' ? 'concluído; aguardando a gravação' : 'em execução') : 'aguardando início') + ', ' + Math.round(volta / 6) + ' min)…');
        } else if (r && (r.status === 403 || r.status === 404)) semActions = true;
      }
      if (semActions) aviso('Carga enviada. Aguardando o GitHub gravar a nova fonte (' + Math.round(volta / 6) + ' min)…');
    }
    throw new Error('A carga foi enviada, mas não foi processada em ' + (minutos || 20) + ' minutos. Confira a aba Actions do procs-muta (Acervo fonte · atualizar).');
  }

  async function atualizar(arquivos, o) {
    o = o || {};
    var X = o.XLSX || W.XLSX, PM = o.ProcsMuta || W.ProcsMuta, aviso = o.aviso || function () {};
    if (!X) throw new Error('Leitor de planilhas (XLSX) indisponível.');
    if (!PM || !PM.gravar) throw new Error('Gravação no procs-muta indisponível nesta página.');
    if (!PM.atual && PM.token) await PM.token('Para atualizar o acervo fonte.', true);
    aviso('Lendo as planilhas…');
    var lidos = o.lidos || await classificar(Array.from(arquivos || []), X);
    var m = montarCarga(lidos, o.papeis);
    aviso('Enviando ao procs-muta: ' + m.resumo + '…');
    var caminho = nomeCarga();
    var sha = await PM.gravar({ [caminho]: JSON.stringify(m.carga) }, 'Acervo fonte: carga ' + m.modo + ' enviada pelo painel (' + m.resumo + ')');
    aviso('Carga enviada. O GitHub aplica a regra do acervo; leva um ou dois minutos (o DataJud complementa depois, em segundo plano).');
    var cm = await acompanhar(PM, sha, caminho, aviso, o.minutos);
    return { commit: cm, mensagem: ((cm.commit || {}).message || '').split('\n')[0], modo: m.modo, resumo: m.resumo, ignorados: m.ignorados };
  }

  W.CMTAtualizarFonte = { atualizar: atualizar, classificar: classificar, montarCarga: montarCarga, planilha: planilha, linhasCsv: linhasCsv, linhasXlsx: linhasXlsx, PAPEIS: PAPEIS, PASTA: PASTA };
})(typeof window !== 'undefined' ? window : globalThis);
