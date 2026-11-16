/* Ab Initio · Pautas — esteira da sessão (desenho "Pautas · criação da sessão").
   Camada de apresentação sobre o motor: lê CMTSessao, o acervo (acervoDe) e a equipe.
   Etapas: 1 seleção prévia · 2 pauta oficial · 3 preparar · 4 publicar · 5 painel da sessão.
   As ações que gravam usam os comandos já existentes do painel (data-cwt); as novas
   (publicar à equipe, aplicar regras) ficam desativadas até a validação. */
(function (W, D) {
  'use strict';
  if (W.CMTEsteira) return;
  const est = { arq: false, ses: '', etapa: 0, prep: 0, cfg: false, cfgTab: 0, exp: false, q: '', filtro: 'all', take: 60, sel: '', mag: null, magPedido: false };
  const HOJE = () => new Date().toISOString().slice(0, 10);
  const SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  let A = null; let ligado = null;

  const e = (v) => A.esc(v);
  const pct = (n, t) => (t ? Math.round(100 * n / t) : 0) + '%';
  const conta = (lista, f, top) => {
    const m = new Map(); lista.forEach((x) => { const k = f(x) || '—'; m.set(k, (m.get(k) || 0) + 1); });
    const a = [...m.entries()].sort((x, y) => y[1] - x[1]); const vis = top ? a.slice(0, top) : a;
    const resto = a.slice(vis.length).reduce((z, x) => z + x[1], 0);
    return resto ? vis.concat([['outros (' + (a.length - vis.length) + ')', resto]]) : vis;
  };
  const tipoTarefa = (t) => /\[(Sessão - )?ED\]/i.test(t || '') ? 'ED' : /\[Ag\.? ?Int\]/i.test(t || '') ? 'AgInt' : /retrata/i.test(t || '') ? 'JR' : '';
  const retirado = (t) => /retirados e adiados/i.test(t || '');
  const situacao = (x) => x.dataLiberacao ? 'Liberado' : x.dataCorrecao ? 'A liberar' : x.dataMinuta ? 'A corrigir' : 'A minutar';

  function magistrados() {
    if (est.mag || est.magPedido) return est.mag || [];
    est.magPedido = true;
    const pm = A.getMotor()?.ProcsMuta;
    if (!pm?.ler) return [];
    pm.ler('apoio/magistrados.json').then((t) => { try { const d = JSON.parse(t); est.mag = Array.isArray(d) ? d : (d.registros || []); A.render(); } catch (er) { est.mag = []; } }).catch(() => { est.mag = []; });
    return [];
  }

  function dados(ss) {
    const s = A.getSes(); const info = A.sesInfo(ss); const lines = info.lines; const itens = ss.itens || [];
    const pauta = itens.length > 0; const realizada = ss.data < HOJE();
    const raw = new Map(itens.map((it) => [A.digits(it.cnj), it]));
    const plan = (() => { try { return s?.planilha?.(ss.id) || []; } catch (er) { return []; } })();
    const planMap = new Map(plan.map((p) => [A.digits(p.Processo), p]));
    const acv = (c) => { try { return s?.acervoDe?.(c) || null; } catch (er) { return null; } };
    const previa = (ss.previa || []).map((x) => A.digits(x.cnj || x));
    const pv = new Set(previa), it = new Set(itens.map((x) => A.digits(x.cnj)));
    const conf = { fora: previa.filter((d) => !it.has(d)), novos: [...it].filter((d) => !pv.has(d)), batem: [...it].filter((d) => pv.has(d)) };
    let foraAc = 0, assDiv = 0, foraTar = 0;
    lines.forEach((x) => {
      const r = acv(x.cnj); if (!r) { foraAc++; return; }
      const a1 = A.norm((raw.get(A.digits(x.cnj)) || {}).assunto || ''), a2 = A.norm(r.Assunto || r.assunto_judicial || '');
      if (a1 && a2 && a1 !== a2) assDiv++;
      if (!/^\[Sessão\]/.test(r.tarefa_atual || '')) foraTar++;
    });
    const tipos = { ED: 0, AgInt: 0, JR: 0, ret: 0 };
    lines.forEach((x) => { const t = tipoTarefa(x.tarefa) || (x.julg === 'ED' || x.julg === 'AgInt' || x.julg === 'JR' ? x.julg : ''); if (t) tipos[t]++; if (retirado(x.tarefa)) tipos.ret++; });
    const metas = lines.filter((x) => (x.metas || []).length).length;
    const f = realizada ? 5 : !pauta ? 1 : (info.unassigned || info.unrevised) ? 3 : 4;
    let cur = est.etapa || f; if (pauta && cur === 1) cur = 2;
    return { s, info, lines, itens, pauta, realizada, raw, plan, planMap, acv, previa, conf, foraAc, assDiv, foraTar, tipos, metas, f, cur };
  }

  /* ---------- cabeçalho, marcos, esteira ---------- */
  function cabecalho(ss, d) {
    const dt = new Date(ss.data + 'T12:00:00'); const dia = isNaN(dt) ? '' : SEM[dt.getDay()];
    const desc = [dia, ss.hora || '', d.pauta ? d.itens.length + ' itens' : 'sem pauta oficial', d.realizada ? 'realizada' : ss.pronta ? 'pauta publicada' : d.pauta ? 'pauta não publicada' : 'seleção prévia'].filter(Boolean).join(' · ');
    const mg = magistrados().map((m) => { const at = (m.atuacao || []).find((x) => /Turma Regional/i.test(x.orgao || '')) || {}; return `<span><b>${e(m.nome)}</b> <small>${e(at.papel || m.cargo || '')}</small></span>`; }).join('');
    const exp = [['xlsx', 'Planilha de controle padrão', '.xlsx · aba da sessão no bimestre'], ['doc', 'Pauta simplificada', '.doc · item, processo, partes, assunto'], ['pdf', 'Pauta simplificada', 'PDF · pela impressão do navegador'], ['txt', 'Lista de processos', '.txt · um número por linha'], ['csv', 'Estatísticas da sessão', '.csv · o painel da etapa 5'], ['copiar', 'Copiar a lista', 'área de transferência']];
    return `<div class="cwe-top"><div><span class="cwe-k">PAUTAS · SESSÃO</span><h1>Sessão de ${e(A.br(ss.data))}</h1><p>${e(desc)}</p>
      ${mg ? `<p class="cwe-julg"><span class="cwe-k">JULGADORES</span>${mg}<small>· composição padrão</small></p>` : ''}</div>
      <div class="cwe-tools"><button type="button" data-cwt="create-session" title="Cadastrar outra sessão">+ Sessão</button>
      <span class="cwe-expwrap"><button type="button" data-cwe="exp" aria-expanded="${est.exp}">Exportar ▾</button>${est.exp ? `<span class="cwe-menu" role="menu">${exp.map(([k, t, s]) => `<button type="button" role="menuitem" data-cwe="x-${k}"><b>${e(t)}</b><small>${e(s)}</small></button>`).join('')}</span>` : ''}</span>
      <button type="button" data-cwe="cfg" title="Configurações das pautas" aria-label="Configurações das pautas">⚙</button></div></div>`;
  }
  function marcos(ss) {
    const f = ss.fases || {};
    const M = [['Peço dia', f.pauta, 'do calendário do tribunal'], ['Início', f.inicio, 'início da preparação'], ['Entrega', f.minutas, 'entrega das minutas'], ['Liberação', f.liberacao, 'liberação dos votos'], ['Sessão', ss.data, 'data do julgamento']];
    return `<section class="cwe-marcos" aria-label="Marcos da sessão"><button type="button" class="cwe-regras" data-cwe="cfg-0">regras</button><span class="cwe-mk"><span class="cwe-k">MARCOS</span></span>
      ${M.map(([t, v, o]) => `<label title="${e(t + ' · ' + o)}">${e(t)}<input readonly value="${e(v ? A.br(v) : 'a definir')}" class="${v ? '' : 'vazio'}"></label>`).join('')}
      <span class="cwe-mkb"><button type="button" data-cwt="marcos">Editar marcos</button></span></section>`;
  }
  function esteira(d) {
    const E = [['Seleção prévia', 'escaninho · rascunho na Triagem'], ['Pauta oficial', 'PDF e conferência'], ['Preparar', 'regras e designação'], ['Publicar a pauta', 'conferência final e equipe'], ['Painel da sessão', 'todas as estatísticas']];
    const ok = 'ok', pd = 'pd', vz = 'vz'; const i = d.info;
    const C = [
      [['Sessão cadastrada', 'feito', ok], ['Processos na seleção prévia', d.previa.length + ' processos', d.previa.length ? ok : pd], ['Rascunho de regras e designação', 'na Triagem', vz]],
      [['PDF da pauta importado', d.pauta ? d.itens.length + ' itens' : 'aguardando o PDF', d.pauta ? ok : vz], ['Conferência com a seleção prévia', d.pauta ? `${d.conf.fora.length} fora · ${d.conf.novos.length} novos · ${d.conf.batem.length} batem` : 'depois do PDF', d.pauta ? ok : vz]],
      [['A · Regras de etiquetas', `${d.tipos.ED} ED · ${d.tipos.AgInt} AgInt · ${d.tipos.JR} JR · ${d.tipos.ret} retirados`, d.pauta ? ok : vz, 0], ['B · Designação e correção', `${i.unassigned} sem minutante · ${i.unrevised} sem corretor`, !d.pauta ? vz : (i.unassigned || i.unrevised) ? pd : ok, 1]],
      [['Conferência final', `${d.foraAc} fora do acervo · ${d.assDiv} assuntos · ${d.foraTar} fora de tarefa de sessão`, !d.pauta ? vz : (d.foraAc || d.assDiv) ? pd : ok], ['Pauta publicada à equipe', d.realizada ? 'sessão realizada' : 'a validar', vz]],
      [['Painel integral', 'números e distribuição', d.pauta ? ok : vz], ['Produção', `${i.lines.filter((x) => x.dataMinuta).length} minutadas · ${i.released} liberadas`, i.released ? ok : vz]]
    ];
    return `<ol class="cwe-esteira" aria-label="Etapas da sessão">${E.map(([t, s], k) => {
      const n = k + 1, trava = n === 1 && d.pauta, feito = n < d.f || (n === 2 && d.pauta), agora = n === d.f, sel = n === d.cur;
      const st = trava ? 'FECHADA' : agora ? 'AGORA' : feito ? 'FEITO' : 'A SEGUIR';
      return `<li class="${sel ? 'sel' : ''} ${trava ? 'trava' : ''}"><button type="button" data-cwe="etapa" data-n="${n}" ${trava ? 'aria-disabled="true"' : ''} aria-current="${sel}">
        <i class="${feito && !agora ? 'feito' : agora ? 'agora' : ''}">${n}</i><span><small>${st}</small><b>${e(t)}</b><em>${e(trava ? 'fechada · a pauta oficial já existe' : s)}</em></span></button>
        ${sel ? `<span class="cwe-checks">${C[k].map(([ct, cs, cl, sub]) => `<span class="ck ${cl} ${sub != null ? 'aba' : ''} ${sub != null && sub === est.prep ? 'on' : ''}" ${sub != null ? `data-cwe="prep" data-n="${sub}" role="tab"` : ''}><span class="dot">${cl === ok ? '✓' : cl === pd ? '!' : ''}</span><span>${e(ct)}<small>${e(cs)}</small></span></span>`).join('')}</span>` : ''}</li>`;
    }).join('')}</ol>`;
  }

  function sessoes(ss) {
    const hoje = HOJE(), lista = A.sessionData();
    const ant = lista.filter((x) => x.data < hoje), vis = lista.filter((x) => x.data >= hoje || est.arq || x.id === ss.id);
    const sub = (x) => { const n = (x.itens || []).length; if (!n) return (x.previa || []).length ? (x.previa || []).length + ' na seleção prévia' : 'sem pauta'; const m = (x.itens || []).filter((i) => i.dataMinuta).length; return m + ' de ' + n + ' minutadas'; };
    return `<span class="cwe-k">SESSÕES</span><div class="cwe-ses">${vis.map((x) => `<button type="button" data-cwt-ses="${e(x.id)}" class="${x.id === ss.id ? 'on' : ''} ${x.data < hoje ? 'passada' : ''}"><b>${e(A.br(x.data))}</b><small>${e(x.data < hoje ? 'realizada · ' + sub(x) : sub(x))}</small></button>`).join('')}</div>
      ${ant.length ? `<button type="button" class="cwe-arq" data-cwe="arq">${est.arq ? 'Ocultar as realizadas' : 'Ver realizadas e arquivadas (' + ant.length + ')'}</button>` : ''}`;
  }

  /* ---------- listagem e prontuário ---------- */
  function filtrar(lines) {
    const q = A.norm(est.q.trim());
    return lines.filter((x) => {
      const sit = situacao(x);
      if (est.filtro === 'minutar' && sit !== 'A minutar') return false;
      if (est.filtro === 'corrigir' && sit !== 'A corrigir') return false;
      if (est.filtro === 'liberar' && sit !== 'A liberar') return false;
      if (est.filtro === 'sem-servidor' && x.servidor) return false;
      if (est.filtro === 'sem-corretor' && x.corretor) return false;
      if (est.filtro === 'meta' && !(x.metas || []).length) return false;
      if (est.filtro === 'fora' && x.noAcervo) return false;
      return !q || A.norm([x.cnj, x.assunto, x.servidor, x.corretor, x.item, x.classe, x.tarefa].join(' ')).includes(q);
    });
  }
  function prontuario(d) {
    const x = d.lines.find((l) => A.digits(l.cnj) === est.sel); if (!x) return '';
    const it = d.raw.get(est.sel) || {}, p = d.planMap.get(est.sel) || {}, r = d.acv(x.cnj) || {};
    const k = [['Tarefa no PJe', x.tarefa || '—'], ['Seção', x.secao || '—'], ['Distribuição', x.dist ? A.br(x.dist) : '—'], ['Apreciação', p['Apreciação'] || '—'], ['Meta', p.Meta || (x.metas || []).join(' ') || '—'], ['Etapa', p.Etapa || situacao(x)], ['Minutante', x.servidor || '—'], ['Corretor', x.corretor || '—'], ['Tempestividade', p.Tempestividade || '—'], ['Preparo', p.Preparo || '—'], ['Intervenção do MPF', p['Intervenção MPF'] || '—'], ['Etiquetas', r.Etiquetas || r.etiquetas || '—'], ['Pautas anteriores', (x.anteriores || []).join(' · ') || '—'], ['Pendências', p['Pendências'] || 'nenhuma']];
    return `<section class="cwe-prt" aria-label="Prontuário"><div class="cwe-prt-h"><span class="cwe-k">PRONTUÁRIO</span><b>Item ${e(x.item || '—')}</b><button type="button" class="cwe-cnj" data-cwt="ficha" data-p="${e(est.sel)}">${e(A.cnj(x.cnj))}</button><span>${e(x.assunto || '—')} · ${e(x.classe || '')}</span>${it.partes ? `<small>${e(it.partes)}</small>` : ''}
      <span class="cwe-prt-a"><button type="button" data-cwe="prt-prev" title="Anterior">‹</button><button type="button" data-cwe="prt-next" title="Próximo">›</button><button type="button" data-cwt="ficha" data-p="${e(est.sel)}">Abrir a ficha completa</button><button type="button" data-cwe="prt-x" title="Fechar">×</button></span></div>
      <div class="cwe-prt-g">${k.map(([t, v]) => `<span><small>${e(t)}</small>${e(v)}</span>`).join('')}</div></section>`;
  }
  function listagem(d, titulo) {
    const l = filtrar(d.lines), vis = l.slice(0, est.take);
    const F = [['all', 'Todos'], ['minutar', 'A minutar'], ['corrigir', 'A corrigir'], ['liberar', 'A liberar'], ['sem-servidor', 'Sem minutante'], ['sem-corretor', 'Sem corretor'], ['meta', 'Com meta'], ['fora', 'Fora do acervo']];
    return `<section class="cwe-lista"><div class="cwe-lista-h"><h3>${e(titulo)}</h3><span>${l.length} de ${d.lines.length} processos</span></div>
      ${prontuario(d)}
      <div class="cwe-filtros"><input type="search" data-cwe-input="q" value="${e(est.q)}" placeholder="Buscar CNJ, assunto, minutante, corretor, tarefa…" aria-label="Buscar processos da sessão"><span>${F.map(([k, t]) => `<button type="button" data-cwe="filtro" data-v="${k}" class="${est.filtro === k ? 'on' : ''}">${t}</button>`).join('')}</span></div>
      <div class="cwe-cards">${vis.map((x) => { const dg = A.digits(x.cnj), it = d.raw.get(dg) || {}, sit = situacao(x), t = tipoTarefa(x.tarefa);
        return `<div class="cwe-card ${est.sel === dg ? 'on' : ''}" data-cwe="sel" data-p="${e(dg)}"><span class="n">${e(x.item || '—')}</span>
          <span class="m"><span class="l1"><b class="cwe-mono">${e(A.cnj(x.cnj))}</b> · ${e(x.classe || '')}${t ? ` · <em>${t}</em>` : ''}${(x.metas || []).length ? ` · <em class="meta">★ ${e(x.metas.join(' '))}</em>` : ''}${retirado(x.tarefa) ? ' · <em class="ret">retirado/adiado</em>' : ''}${x.noAcervo ? '' : ' · <em class="ret">fora do acervo</em>'}${(() => { const r = d.acv(x.cnj) || {}, sg = String(r['Nível_Sigilo'] || '').trim() || (r.Consta_Acervo_Sigiloso === 'Sim' ? 'Sigiloso' : ''); return sg ? ` · <em class="sg" title="Sigilo: ${e(sg)}">🔒 sigilo</em>` : ''; })()}</span>
          <span class="l2">${e(x.assunto || '—')}${it.partes ? ' · ' + e(it.partes) : ''}</span></span>
          <span class="p"><small>Minutante</small>${e(x.servidor || '—')}</span><span class="p"><small>Corretor</small>${e(x.corretor || '—')}</span>
          <span class="s s-${A.norm(sit).replace(/\s+/g, '-')}">${e(sit)}</span><button type="button" data-cwt="ficha" data-p="${e(dg)}">Ficha</button></div>`; }).join('') || '<p class="cwe-vazio">Nenhum processo neste filtro.</p>'}</div>
      ${l.length > est.take ? `<button type="button" class="cwe-mais" data-cwe="mais">Mostrar mais ${Math.min(80, l.length - est.take)}</button>` : ''}</section>`;
  }

  /* ---------- etapas ---------- */
  function etapa1(ss, d) {
    if (d.pauta) return `<section class="cwe-st"><h2>1 · Seleção prévia</h2><p class="cwe-nota">Fechada: a pauta oficial da sessão de ${e(A.br(ss.data))} já existe. O que valia como rascunho está na Triagem.</p></section>`;
    return `<section class="cwe-st"><h2>1 · Seleção prévia da sessão de ${e(A.br(ss.data))}</h2>
      <p>A seleção prévia se monta e se edita na Triagem, no escaninho da sessão. Aqui fica a sessão inteira de uma vez, para decidir se a lista está pronta antes do registro no PJe.</p>
      <div class="cwe-kpis">${[[d.previa.length, 'na seleção prévia'], [d.metas, 'com meta'], [d.tipos.ED + d.tipos.AgInt + d.tipos.JR, 'ED, AgInt ou JR'], [d.lines.filter((x) => !x.noAcervo).length, 'fora do acervo']].map(([n, t]) => `<span><b>${n}</b>${t}</span>`).join('')}</div>
      <div class="cwe-acoes"><button type="button" class="pri" data-cwe="triagem">Editar na Triagem</button><button type="button" data-cwt="open-pre">Abrir a seleção prévia</button><button type="button" data-cwe="x-copiar">Copiar a lista para o registro no PJe</button></div>
      ${d.lines.length ? listagem(d, 'Processos da seleção prévia') : '<p class="cwe-vazio">Nenhum processo na seleção prévia. Encaminhe pela Triagem.</p>'}</section>`;
  }
  function etapa2(ss, d) {
    const g = (t, lista, cl) => lista.length ? `<div class="cwe-conf ${cl}"><b>${e(t)} · ${lista.length}</b><span>${lista.slice(0, 60).map((x) => `<button type="button" data-cwt="ficha" data-p="${e(x)}">${e(A.cnj(x))}</button>`).join('')}${lista.length > 60 ? `<small>e mais ${lista.length - 60}</small>` : ''}</span></div>` : '';
    return `<section class="cwe-st"><h2>2 · Pauta oficial</h2>
      <p>O registro no PJe devolve o resumo em PDF (o espelho da pauta). Ao importá-lo, a lista vira oficial e cada processo ganha o item da pauta.</p>
      <div class="cwe-drop"><b>${d.pauta ? 'Pauta oficial importada · ' + d.itens.length + ' itens' : 'Aguardando o PDF da pauta'}</b><span>${e(ss.arquivo || 'resumo da pauta em PDF')}</span><button type="button" class="pri" data-cwt="import-pdf">${d.pauta ? 'Reimportar o PDF' : 'Importar o PDF da pauta'}</button><input type="file" id="cwt-pdf-file" accept=".pdf,application/pdf" hidden></div>
      ${d.pauta ? `<h3>Conferência com a seleção prévia</h3>${d.previa.length ? '' : '<p class="cwe-nota">A sessão não tinha seleção prévia gravada: todos os itens entram como novos.</p>'}${g('Ficaram de fora da pauta', d.conf.fora, 'fora')}${g('Novos na pauta', d.conf.novos, 'novos')}${g('Batem com a seleção prévia', d.conf.batem, 'batem')}
      <div class="cwe-acoes"><button type="button" class="pri" data-cwe="etapa" data-n="3">Próximo: preparar →</button></div>` : ''}</section>`;
  }
  function etapa3(ss, d) {
    const i = d.info, aba = est.prep;
    const tabs = `<div class="cwe-tabs" role="tablist"><button type="button" role="tab" data-cwe="prep" data-n="0" aria-selected="${aba === 0}">A · Regras de etiquetas</button><button type="button" role="tab" data-cwe="prep" data-n="1" aria-selected="${aba === 1}">B · Designação e correção</button></div>`;
    if (!d.pauta) return `<section class="cwe-st"><h2>3 · Preparar</h2>${tabs}<p class="cwe-nota">As regras de etiquetas e a designação se aplicam depois da pauta oficial. O rascunho fica na Triagem.</p></section>`;
    if (aba === 0) {
      return `<section class="cwe-st"><h2>3 · Preparar · A · Regras de etiquetas</h2>${tabs}
        <p>A tarefa atual do PJe decide o tipo de julgamento: tarefas com [ED] ou [Sessão - ED] são embargos; [Ag. Int] é agravo interno; retratação vai a JR. A etiqueta só informa.</p>
        <div class="cwe-kpis">${[[d.tipos.ED, 'ED pela tarefa'], [d.tipos.AgInt, 'AgInt'], [d.tipos.JR, 'juízo de retratação'], [d.tipos.ret, 'retirados e adiados'], [d.metas, 'com meta CNJ']].map(([n, t]) => `<span><b>${n}</b>${t}</span>`).join('')}</div>
        <div class="cwe-acoes"><button type="button" class="pri" disabled title="Aplicação automática a validar">Aplicar as conversões</button><button type="button" data-cwe="cfg-2">Ver as regras</button><button type="button" data-cwe="prep" data-n="1">Próximo: designação e correção →</button></div>
        ${listagem(d, 'Processos da pauta')}</section>`;
    }
    return `<section class="cwe-st"><h2>3 · Preparar · B · Designação e correção</h2>${tabs}
      <p>Vale o primeiro critério ativo, na ordem das regras: tipo de julgamento, tema, histórico, especificidade, seção e prontidão. Menor carga não designa ninguém sozinha.</p>
      <div class="cwe-kpis">${[[i.total, 'processos'], [i.total - i.unassigned, 'com minutante'], [i.unassigned, 'sem minutante'], [i.total - i.unrevised, 'com corretor'], [i.unrevised, 'sem corretor']].map(([n, t]) => `<span><b>${n}</b>${t}</span>`).join('')}</div>
      <div class="cwe-acoes"><button type="button" class="pri" data-cwt="designar">Prévia da designação</button><button type="button" data-cwt="rules">Regras desta sessão</button><button type="button" data-cwe="etapa" data-n="4">Próximo: publicar a pauta →</button></div>
      ${listagem(d, 'Processos da pauta')}</section>`;
  }
  function etapa4(ss, d) {
    const cf = [[d.itens.length, 'itens no espelho', 'pauta oficial importada', ''], [d.foraAc, 'fora do acervo fonte', 'sem registro no acervo', d.foraAc ? 'r' : 'g'], [d.assDiv, 'assuntos divergentes', 'pauta × acervo fonte', d.assDiv ? 'a' : 'g'], [d.foraTar, 'fora de tarefa de sessão', 'tarefa atual sem [Sessão]', d.foraTar ? 'a' : 'g'], [d.info.unassigned + d.info.unrevised, 'sem designação', 'minutante ou corretor', (d.info.unassigned + d.info.unrevised) ? 'a' : 'g']];
    return `<section class="cwe-st"><h2>4 · Publicar a pauta e acompanhar</h2>
      ${d.pauta ? `<div class="cwe-final"><div class="h"><span class="cwe-k">CONFERÊNCIA FINAL · ANTES DE PUBLICAR</span><small>espelho da pauta × acervo fonte</small></div>
        <div class="g">${cf.map(([n, t, s, c]) => `<span class="${c}"><b>${n}</b>${e(t)}<small>${e(s)}</small></span>`).join('')}</div></div>` : '<p class="cwe-nota">Sem pauta oficial ainda: a conferência final começa depois do PDF.</p>'}
      <div class="cwe-acoes linha"><button type="button" class="pri" disabled title="Publicação à equipe a validar">Publicar à equipe</button><button type="button" data-cwe="x-xlsx">Controle da pauta · Excel do bimestre</button><button type="button" data-cwt="open-pos">Abrir a pauta oficial</button><small>painel, app da equipe e planilha de controle</small></div>
      ${d.pauta ? listagem(d, 'Listagem da pauta') : ''}</section>`;
  }
  function etapa5(ss, d) {
    if (!d.pauta) return `<section class="cwe-st"><h2>5 · Painel da sessão</h2><p class="cwe-nota">O painel da sessão aparece depois da pauta oficial. A sessão de ${e(A.br(ss.data))} ainda não tem pauta.</p></section>`;
    const L = d.lines, N = L.length || 1, P = d.plan;
    const kp = [[L.length, 'itens'], [d.metas, 'com meta CNJ'], [d.tipos.AgInt, 'agravos internos'], [d.tipos.ED, 'embargos'], [d.tipos.JR, 'retratação'], [d.tipos.ret, 'retirados e adiados'], [d.info.unassigned, 'sem minutante'], [d.info.unrevised, 'sem corretor'], [L.filter((x) => x.dataMinuta).length, 'minutadas'], [L.filter((x) => x.dataCorrecao).length, 'corrigidas'], [d.info.released, 'liberadas'], [d.foraAc, 'fora do acervo']];
    const B = [['APRECIAÇÃO', conta(P, (p) => p['Apreciação'])], ['CLASSE', conta(L, (x) => x.recurso || x.classe)], ['META', conta(P, (p) => p.Meta || 'sem meta')], ['MINUTANTE', conta(L, (x) => x.servidor || 'sem minutante')], ['CORRETOR', conta(L, (x) => x.corretor || 'sem corretor')], ['ASSUNTO · 10 MAIS', conta(L, (x) => x.assunto, 10)], ['SEÇÃO', conta(L, (x) => x.secao)], ['TAREFA NO PJe', conta(L, (x) => x.tarefa || 'sem tarefa', 7)], ['ETAPA', conta(L, situacao)], ['PENDÊNCIAS DA FICHA', conta(P.flatMap((p) => (p['Pendências'] || '').split(' · ').filter(Boolean)).map((t) => ({ t })), (o) => o.t)], ['INTERVENÇÃO DO MPF', conta(P, (p) => p['Intervenção MPF'] || 'sem hipótese marcada')], ['TEMPESTIVIDADE', conta(P, (p) => p.Tempestividade)]];
    return `<section class="cwe-st"><h2>5 · Painel da sessão</h2><p>Todas as estatísticas da sessão num lugar só. O painel inteiro sai em .csv pelo Exportar.</p>
      <div class="cwe-kpis grande">${kp.map(([n, t]) => `<span><b>${n}</b>${t}</span>`).join('')}</div>
      <div class="cwe-blocos">${B.map(([t, rows]) => { const mx = rows.length ? Math.max(...rows.map((r) => r[1])) : 1; return `<div class="cwe-bloco"><p>${t}</p>${rows.length ? rows.map(([k, n]) => `<span class="r"><span class="t" title="${e(k)}">${e(k)}<i><i style="width:${Math.max(3, Math.round(100 * n / mx))}%"></i></i></span><b>${n}</b><small>${pct(n, N)}</small></span>`).join('') : '<small class="cwe-vazio">sem dados</small>'}</div>`; }).join('')}</div></section>`;
  }

  /* ---------- configurações ---------- */
  function config(ss, d) {
    const S = d.s?.estado?.() || {}; const eq = S.equipe || [];
    const f = ss.fases || {}; const dias = (a, b) => (a && b) ? Math.round((new Date(b) - new Date(a)) / 864e5) : null;
    const desig = (() => { try { return d.s?.regrasDesignacaoSessao?.(ss.id) || null; } catch (er) { return null; } })();
    const crit = Array.isArray(desig?.ordem) ? desig.ordem : Array.isArray(desig) ? desig.map((x) => x.id || x.nome || x) : [];
    const T = [
      ['Regras dos marcos', `<p>Nenhuma data fica fixa: cada marco segue uma regra em dias úteis, contada da sessão ou do peço dia. A sessão pode ajustar a própria data sem mudar a regra.</p><div class="cwe-cfg-l">${[['Peço dia', 'calendário do tribunal', f.pauta ? 'nesta sessão: ' + A.br(f.pauta) : ''], ['Início da preparação', '[definir] dias úteis depois do peço dia', dias(f.inicio, ss.data) != null ? 'nesta sessão: ' + dias(f.inicio, ss.data) + ' dias corridos antes da sessão' : ''], ['Entrega das minutas', '[definir] dias úteis antes da sessão', dias(f.minutas, ss.data) != null ? 'nesta sessão: ' + dias(f.minutas, ss.data) + ' dias corridos' : ''], ['Liberação', '[definir] dias úteis antes da sessão', dias(f.liberacao, ss.data) != null ? 'nesta sessão: ' + dias(f.liberacao, ss.data) + ' dias corridos' : '']].map(([a, b, c]) => `<span><b>${e(a)}</b>${e(b)}<small>${e(c)}</small></span>`).join('')}</div><button type="button" data-cwt="marcos">Calendário e marcos</button>`],
      ['Calendário forense', '<p>Feriados nacionais e da Justiça Federal, de MS, Carnaval, Semana Santa, Corpus Christi e recesso (20/12 a 20/01). Os marcos, os prazos da triagem e as urgências seguem este calendário.</p><button type="button" data-cwt="marcos">Abrir o calendário</button>'],
      ['Regras de etiquetas', '<p>A tarefa do PJe decide o tipo de julgamento ([ED], [Sessão - ED], [Ag. Int], retratação); a etiqueta de ED só informa. Remessa necessária vem da classe. As conversões gerais (subassuntos, MPF, especificidades, alertas de impedimento e suspeição) estão em apoio/regras/etiquetas.json.</p><button type="button" data-cwt="rules">Abrir as regras</button>'],
      ['Regras de designação', `<p>Critérios tentados em ordem até um deles indicar alguém. Cada critério vale para a minuta (equipe), a correção (assessoria) ou as duas. A sessão pode ter ajuste próprio, gravado no JSON da sessão.</p>${crit.length ? `<ol class="cwe-cfg-o">${crit.map((c) => `<li>${e(typeof c === 'string' ? c : JSON.stringify(c))}</li>`).join('')}</ol>` : ''}<button type="button" data-cwt="rules">Regras desta sessão</button>`],
      ['Regras de produtividade', '<p>Metas internas do gabinete, distintas das metas do CNJ: cota fixa de minutas por dia útil para quem minuta. Dia sem expediente ou sem processos pendentes: meta zero. Cada processo minutado conta uma vez por número.</p><div class="cwe-cfg-l">' + [['Dalete, José, Rodrigo, Débora e Maria Eduarda', '3 minutas por dia'], ['Victor e Estela', '4 minutas por dia'], ['Demais da equipe', 'sem meta interna'], ['Monocráticas e correções', 'sem meta interna'], ['Complexidade (½ · Ω · A · Σ)', '0,5 · 1 · 2 · 3 [VALIDAR peso na meta]']].map(([a, b]) => `<span><b>${e(a)}</b>${e(b)}</span>`).join('') + '</div>'],
      ['Sessão', `<p>O que toda sessão nova recebe ao ser criada.</p><div class="cwe-cfg-l">${[['Órgão julgador', 'Turma Regional de MS'], ['Gabinete na relação do PJe', S.gab || 'Gab. A da Turma Regional de Mato Grosso do Sul'], ['Horário', ss.hora || '14:00'], ['Julgadores', (est.mag || []).map((m) => m.nome).join(' · ') || 'apoio/magistrados.json']].map(([a, b]) => `<span><b>${e(a)}</b>${e(b)}</span>`).join('')}</div>`],
      ['Equipe', `<p>A equipe fica aqui, junto das regras que a usam: quem minuta entra na designação e na meta interna; a Assessoria corrige.</p><div class="cwe-eq">${eq.map((m) => `<span><b>${e(m.nome)}</b><small>${e((m.papel === 'assessoria' ? 'Assessoria' : 'Equipe') + (m.cargo ? ' · ' + m.cargo : ''))}</small><em class="${m.minuta ? 'min' : m.correcao ? 'cor' : ''}">${m.minuta ? 'minuta' : m.correcao ? 'corrige' : 'apoio'}</em></span>`).join('')}</div><button type="button" data-cwe="equipe">Abrir o cadastro completo da equipe</button>`]
    ];
    const t = Math.min(est.cfgTab, T.length - 1);
    return `<div class="cwe-cfg-bg" data-cwe="cfg-x"></div><section class="cwe-cfg" role="dialog" aria-label="Configurações das pautas"><nav>${T.map(([n], k) => `<button type="button" data-cwe="cfg-${k}" aria-current="${k === t}">${e(n)}</button>`).join('')}</nav>
      <div class="cwe-cfg-b"><div class="cwe-cfg-h"><span class="cwe-k">CONFIGURAÇÕES DAS PAUTAS</span><button type="button" data-cwe="cfg-x" aria-label="Fechar">×</button></div><h3>${e(T[t][0])}</h3>${T[t][1]}</div></section>`;
  }

  /* ---------- exportações ---------- */
  function baixar(nome, texto, tipo) { const a = D.createElement('a'); const u = URL.createObjectURL(new Blob([texto], { type: tipo })); a.href = u; a.download = nome; D.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 800); }
  function simplificada(ss, d) {
    const linhas = d.lines.map((x) => { const it = d.raw.get(A.digits(x.cnj)) || {}; return `<tr><td>${e(x.item || '')}</td><td>${e(A.cnj(x.cnj))}</td><td>${e(x.classe || '')}</td><td>${e(it.partes || '')}</td><td>${e(x.assunto || '')}</td></tr>`; }).join('');
    return `<html><head><meta charset="utf-8"><title>Pauta ${e(A.br(ss.data))}</title><style>body{font:11pt Arial,sans-serif}h1{font-size:14pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:3px 5px;font-size:9.5pt;text-align:left;vertical-align:top}</style></head><body><h1>Pauta da sessão de ${e(A.br(ss.data))}${ss.hora ? ' · ' + e(ss.hora) : ''}</h1><p>${e((d.s?.estado?.() || {}).gab || '')} · ${d.lines.length} processos</p><table><thead><tr><th>Item</th><th>Processo</th><th>Classe</th><th>Partes</th><th>Assunto</th></tr></thead><tbody>${linhas}</tbody></table></body></html>`;
  }
  function exportar(k, ss, d) {
    const nome = 'Pauta_' + A.br(ss.data).replace(/\//g, '-');
    if (k === 'xlsx') { if (!d.pauta) return A.msg('A planilha de controle sai da pauta oficial.', true); if (!d.s?.exportarXlsx?.(ss.id)) A.msg('Exportação indisponível no motor.', true); return; }
    if (k === 'txt') return baixar(nome + '.txt', d.lines.map((x) => A.cnj(x.cnj)).join('\r\n'), 'text/plain;charset=utf-8');
    if (k === 'doc') return baixar(nome + '_simplificada.doc', simplificada(ss, d), 'application/msword');
    if (k === 'pdf') { const w = W.open('', '_blank'); if (!w) return A.msg('O navegador bloqueou a janela de impressão.', true); w.document.write(simplificada(ss, d)); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); return; }
    if (k === 'copiar') { const t = d.lines.map((x) => A.cnj(x.cnj)).join('\n'); (navigator.clipboard?.writeText(t) || Promise.reject()).then(() => A.msg(d.lines.length + ' números copiados.')).catch(() => A.msg('Não foi possível copiar.', true)); return; }
    if (k === 'csv') {
      const P = d.plan, L = d.lines; const linhas = [['bloco', 'valor', 'quantidade']];
      [['situação', conta(L, situacao)], ['minutante', conta(L, (x) => x.servidor || 'sem minutante')], ['corretor', conta(L, (x) => x.corretor || 'sem corretor')], ['assunto', conta(L, (x) => x.assunto)], ['seção', conta(L, (x) => x.secao)], ['tarefa', conta(L, (x) => x.tarefa || 'sem tarefa')], ['apreciação', conta(P, (p) => p['Apreciação'])], ['meta', conta(P, (p) => p.Meta || 'sem meta')]].forEach(([b, rows]) => rows.forEach(([v, n]) => linhas.push([b, v, n])));
      return baixar(nome + '_estatisticas.csv', '﻿' + linhas.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n'), 'text/csv;charset=utf-8');
    }
  }

  /* ---------- eventos ---------- */
  function ligar(view) {
    if (ligado === view) return; ligado = view;
    view.addEventListener('click', (ev) => {
      const b = ev.target.closest?.('[data-cwe]'); if (!b || !A) return;
      const k = b.dataset.cwe, ss = A.selectedSession(); if (!ss) return;
      if (ev.target.closest('[data-cwt]') && k === 'sel') return;
      ev.preventDefault();
      if (k === 'etapa') { const n = +b.dataset.n; if (b.getAttribute('aria-disabled') === 'true') return; est.etapa = n; est.exp = false; }
      else if (k === 'prep') { est.prep = +b.dataset.n; est.etapa = 3; }
      else if (k === 'exp') est.exp = !est.exp;
      else if (k === 'arq') est.arq = !est.arq;
      else if (k.startsWith('x-')) { est.exp = false; exportar(k.slice(2), ss, dados(ss)); }
      else if (k === 'cfg') { est.cfg = true; est.exp = false; }
      else if (k === 'cfg-x') est.cfg = false;
      else if (k.startsWith('cfg-')) { est.cfg = true; est.cfgTab = +k.slice(4); }
      else if (k === 'filtro') { est.filtro = b.dataset.v; est.take = 60; }
      else if (k === 'mais') est.take += 80;
      else if (k === 'sel') est.sel = est.sel === b.dataset.p ? '' : b.dataset.p;
      else if (k === 'prt-x') est.sel = '';
      else if (k === 'prt-prev' || k === 'prt-next') { const l = filtrar(dados(ss).lines).map((x) => A.digits(x.cnj)); const i = l.indexOf(est.sel); if (l.length) est.sel = l[(i + (k === 'prt-next' ? 1 : -1) + l.length) % l.length]; }
      else if (k === 'triagem') { D.querySelector('nav.mods .mod[data-cmt="triagem"]')?.click(); return; }
      else if (k === 'equipe') { est.cfg = false; const bt = D.querySelector('nav.mods .mod[data-cmt="equipe"]') || D.querySelector('nav.mods .mod[data-tab="equipe"]'); if (bt) bt.click(); return; }
      A.render();
    });
    view.addEventListener('input', (ev) => {
      if (ev.target.dataset.cweInput !== 'q') return;
      est.q = ev.target.value; est.take = 60; const pos = ev.target.selectionStart; A.render();
      const n = view.querySelector('[data-cwe-input="q"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) {} }
    });
    D.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && (est.cfg || est.exp)) { est.cfg = false; est.exp = false; A.render(); } });
  }

  function render(api) {
    A = api; const view = api.view; ligar(view);
    const ss = api.selectedSession();
    if (!ss) { view.innerHTML = `<div class="cwe"><div class="cwe-top"><div><span class="cwe-k">PAUTAS · SESSÃO</span><h1>Nenhuma sessão cadastrada</h1><p>Cadastre a data do julgamento para começar a seleção prévia.</p></div><div class="cwe-tools"><button type="button" class="pri" data-cwt="create-session">Cadastrar sessão</button></div></div></div>`; return; }
    if (est.ses !== ss.id) { est.ses = ss.id; est.etapa = 0; est.prep = 0; est.sel = ''; est.q = ''; est.filtro = 'all'; est.take = 60; }
    const d = dados(ss);
    const corpo = [null, etapa1, etapa2, etapa3, etapa4, etapa5][d.cur](ss, d);
    view.innerHTML = `<div class="cwe">${cabecalho(ss, d)}${marcos(ss)}<div class="cwe-grid"><nav class="cwe-nav">${sessoes(ss)}<span class="cwe-k cwe-k2">ESTEIRA · ${e(A.br(ss.data))}</span>${esteira(d)}</nav><div class="cwe-main">${corpo}</div></div>${est.cfg ? config(ss, d) : ''}</div>`;
  }

  W.CMTEsteira = { render, estado: () => ({ ...est }) };
})(window, document);
