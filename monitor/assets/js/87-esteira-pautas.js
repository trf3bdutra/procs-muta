/* Ab Initio · Pautas — esteira da sessão (desenho "Pautas · criação da sessão").
   Camada de apresentação sobre o motor: lê CMTSessao, o acervo (acervoDe) e a equipe.
   Etapas: 1 seleção prévia · 2 pauta oficial · 3 preparar · 4 publicar · 5 painel da sessão.
   As ações que gravam pedem confirmação: conferência do PDF, conversões, designação,
   publicação e a seleção prévia na Triagem (pelo mesmo caminho do botão Gravar triagem). */
(function (W, D) {
  'use strict';
  if (W.CMTEsteira) return;
  const est = { arq: false, ses: '', etapa: 0, prep: 0, cfg: false, cfgTab: 0, exp: false, q: '', filtro: 'all', take: 60, sel: '', mag: null, magPedido: false,
    desm: {}, c2: {}, etqF: 'todos', etqTake: 50, convAb: false, convG: new Set(), desF: 'todos', desTake: 50, dsg: {}, cf: '' };
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
    /* a seleção prévia gravada na sessão; sem ela, as marcas da Triagem para esta sessão */
    let previa = (ss.previa || []).map((x) => A.digits(x.cnj || x));
    if (!previa.length && pauta) { try { previa = s?.previaDaTriagem?.(ss.id) || []; } catch (er) { previa = []; } }
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
    return { ss, s, info, lines, itens, pauta, realizada, raw, plan, planMap, acv, previa, conf, foraAc, assDiv, foraTar, tipos, metas, f, cur };
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
      [['PDF da pauta importado', d.pauta ? d.itens.length + ' itens' : 'aguardando o PDF', d.pauta ? ok : vz], ['Conferência com a seleção prévia', d.pauta ? `${d.conf.fora.length} fora · ${d.conf.novos.length} novos · ${d.conf.batem.length} batem` : 'depois do PDF', !d.pauta ? vz : (d.ss.conferencia || {}).confirmada ? ok : pd]],
      [['A · Regras de etiquetas', `${d.tipos.ED} ED · ${d.tipos.AgInt} AgInt · ${d.tipos.JR} JR · ${d.tipos.ret} retirados`, d.pauta ? ok : vz, 0], ['B · Designação e correção', `${i.unassigned} sem minutante · ${i.unrevised} sem corretor`, !d.pauta ? vz : (i.unassigned || i.unrevised) ? pd : ok, 1]],
      [['Conferência final', `${d.foraAc} fora do acervo · ${d.assDiv} assuntos · ${d.foraTar} fora de tarefa de sessão`, !d.pauta ? vz : (d.foraAc || d.assDiv) ? pd : ok], ['Pauta publicada à equipe', d.ss.pronta ? 'publicada em ' + A.br(d.ss.pronta) : d.realizada ? 'sessão realizada' : 'a publicar', d.ss.pronta ? ok : vz]],
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
  const AP_T = { '—': '1º julgamento', '': '1º julgamento', ED: 'ED', AgInt: 'AgInt', JR: 'Retratação', AI: 'AI', META: 'META' };
  const proxSessao = (ss) => A.sessionData().filter((x) => x.data > ss.data && x.data >= HOJE()).sort((a, b) => a.data.localeCompare(b.data))[0] || null;
  const ondeEsta = (dg, ss) => A.sessionData().filter((x) => x.id !== ss.id && (x.itens || []).some((i) => A.digits(i.cnj) === dg)).map((x) => A.br(x.data).slice(0, 5));
  const marcado = (k, dg) => !(est.desm[k] || new Set()).has(dg);
  const ck = (k, dg) => `<input type="checkbox" data-cwe-ck="${k}" data-p="${e(dg)}" ${marcado(k, dg) ? 'checked' : ''} aria-label="Marcar">`;
  const kpi = (n, t, s, cl) => `<span class="${cl || ''}"><b>${n}</b>${e(t)}${s ? `<small>${e(s)}</small>` : ''}</span>`;

  function vencidas() { try { return (A.getSes()?.previaVencida?.() || []).map((v) => ({ ...v, id: v.data })); } catch (er) { return []; } }
  function etapa1(ss, d) {
    if (d.pauta) return `<section class="cwe-st"><h2>1 · Seleção prévia</h2><p class="cwe-nota">Fechada: a pauta oficial da sessão de ${e(A.br(ss.data))} já existe. O que valia como rascunho está na Triagem.</p></section>`;
    const L = d.lines, sec = (k) => L.filter((x) => (x.secao || '').startsWith(k)).length, semSec = L.filter((x) => !/^[123]ª/.test(x.secao || '')).length;
    const prio = L.filter((x) => x.prioridade).length;
    const imp = L.filter((x) => { const r = d.acv(x.cnj) || {}; return /impedi|suspei/i.test(r['Impedimento / Suspeição'] || ''); }).length;
    const V = vencidas();
    const venc = V.length ? `<div class="cwe-alerta"><b>Seleções prévias vencidas: ${V.reduce((a, v) => a + v.cnjs.length, 0)}.</b> ${V.map((v) => `${v.cnjs.length} marcado(s) para a sessão de ${e(A.br(v.data))}, que já passou, sem entrar em pauta: ${v.cnjs.slice(0, 8).map((c) => `<button type="button" class="cwe-lnk" data-cwt="ficha" data-p="${e(c)}">${e(A.cnj(c))}</button>`).join(', ')}${v.cnjs.length > 8 ? '…' : ''}. <span class="cwe-acoes in"><button type="button" class="pri" data-cwe="venc-passar" data-v="${e(v.id)}">Passar a ${e(A.br(ss.data).slice(0, 5))}</button><button type="button" data-cwe="venc-devolver" data-v="${e(v.id)}">Devolver à Triagem</button></span>`).join(' ')}</div>` : '';
    const mat = conta(L, (x) => x.assunto, 5).filter((r) => !/^outros/.test(r[0]));
    const comM = L.filter((x) => x.servidor).length, comC = L.filter((x) => x.corretor).length;
    return `<section class="cwe-st"><h2>1 · Seleção prévia da sessão de ${e(A.br(ss.data))}</h2>
      <p>A seleção prévia se monta e se edita na Triagem, no escaninho da sessão. Aqui fica o que a Triagem não mostra: a sessão inteira de uma vez, para decidir se a lista está pronta, e o ato de fechá-la para o registro no PJe.</p>
      ${venc}
      <div class="cwe-kpis">${kpi(L.length, 'Selecionados', 'na seleção prévia')}${kpi(`${sec('1ª')} · ${sec('2ª')} · ${sec('3ª')}`, '1ª · 2ª · 3ª Seção', semSec + ' sem seção')}${kpi(`${d.metas} · ${prio}`, 'Metas · prioridades legais', 'com meta CNJ · prioridade no PJe')}${kpi(`${imp} · ${d.tipos.ret}`, 'Impedimento · retirados', 'conferir antes de fechar')}</div>
      <div class="cwe-duo"><div class="cwe-pares"><div class="h">MATÉRIAS QUE MAIS PESAM</div><div>${mat.length ? mat.map(([t, n]) => `<span title="${e(t)}">${e(t)}</span><b>${n}</b>`).join('') : '<span>nenhuma ainda</span><b>—</b>'}</div></div>
        <div class="cwe-pares"><div class="h">RASCUNHO FEITO NA TRIAGEM</div><div><span>Com minutante no rascunho</span><b>${comM} de ${L.length}</b><span>Com corretor no rascunho</span><b>${comC} de ${L.length}</b><span>Com meta CNJ</span><b>${d.metas}</b><span>ED, AgInt ou JR</span><b>${d.tipos.ED + d.tipos.AgInt + d.tipos.JR}</b></div></div></div>
      <div class="cwe-acoes"><button type="button" class="pri" data-cwe="fechar-sel" ${L.length ? '' : 'disabled'}>Fechar a seleção e copiar a lista para o registro no PJe</button><button type="button" data-cwe="triagem">Editar na Triagem</button><button type="button" data-cwt="open-pre">Abrir a seleção prévia</button></div>
      ${L.length ? listagem(d, 'Processos da seleção prévia') : '<p class="cwe-vazio">Nenhum processo na seleção prévia. Encaminhe pela Triagem.</p>'}</section>`;
  }

  function etapa2(ss, d) {
    const drop = `<div class="cwe-drop"><span><span class="cwe-k">ESPELHO DA PAUTA · SESSÃO DE ${e(A.br(ss.data))}</span><b>${d.pauta ? 'Pauta oficial importada · ' + d.itens.length + ' itens' : 'Arraste o PDF da pauta aqui ou escolha o arquivo.'}</b><small>${e(ss.arquivo || 'resumo do espelho de pauta em PDF')}</small></span><button type="button" class="pri" data-cwt="import-pdf">${d.pauta ? 'Reimportar o PDF' : 'Importar PDF'}</button></div>`;
    if (!d.pauta) return `<section class="cwe-st"><h2>2 · Pauta oficial</h2><p>Oficializado o registro no PJe, chega o PDF do Resumo do Espelho de Pauta. O PDF oficializa a listagem: cada processo da seleção prévia recebe o número do seu item.</p>${drop}</section>`;
    const conf = (ss.conferencia || {}).confirmada, prox = proxSessao(ss);
    const ass = (dg) => { const it = d.raw.get(dg) || {}; const r = d.acv(dg) || {}; return it.assunto || r.Assunto || r.assunto_judicial || '—'; };
    const tg = (cl, t) => `<span class="cwe-tg ${cl}">${e(t)}</span>`;
    const semPrevia = !d.previa.length;
    const G = [
      ['fora', 'Ficaram de fora', 'estavam na seleção prévia e não vieram no PDF', 'r', d.conf.fora, 'Marcados na seleção prévia e ausentes do PDF. Escolha o destino de cada um.', 'Onde está', (dg) => { const o = ondeEsta(dg, ss); return o.length ? 'pauta' + (o.length > 1 ? 's' : '') + ' de ' + o.join(' e ') : 'nenhuma pauta'; }, () => tg('r', 'tirar a marca'),
        [prox ? `<button type="button" class="pri" data-cwe="c2-passar" data-v="${e(prox.id)}">Passar à próxima sessão (${e(A.br(prox.data).slice(0, 5))})</button>` : '', `<button type="button" data-cwe="c2-devolver">Devolver à Triagem</button>`]],
      ['novos', semPrevia ? 'Itens do PDF' : 'Novos', semPrevia ? 'a sessão não tinha seleção prévia gravada' : 'vieram no PDF sem estar na seleção prévia', 'a', d.conf.novos, semPrevia ? 'Sem seleção prévia, a conferência só lista os itens do PDF.' : 'Entraram na pauta pelo PDF, sem rascunho da Triagem. Recebem as regras e a designação na etapa 3, com os demais.', 'Tarefa no PJe', (dg) => (d.acv(dg) || {}).tarefa_atual || '—', () => tg('a', 'na pauta · sem rascunho'),
        [`<button type="button" data-cwe="triagem">Abrir na Triagem</button>`]],
      ['batem', 'Batem', 'estavam na seleção prévia e vieram no PDF', 'g', d.conf.batem, 'O PDF oficializa: recebem o número do item. O rascunho de regras e designação feito na Triagem segue para a etapa 3.', 'Seção', (dg) => { const x = d.lines.find((l) => A.digits(l.cnj) === dg); return x?.secao || '—'; }, () => tg('g', 'na pauta'), []]
    ].filter((g) => !(semPrevia && g[0] !== 'novos'));
    const res = G.map(([k, t, s, cl, l]) => `<a href="#cwe-g-${k}" class="${cl}"><b>${l.length}</b><span>${e(t)}</span><small>${e(s)}</small></a>`).join('');
    const corpo = G.map(([k, t, , cl, l, aj, c3, f3, f4, acoes]) => {
      const vis = est.c2[k] ? l : l.slice(0, 5);
      return `<tbody id="cwe-g-${k}"><tr class="gh ${cl}"><td colspan="5"><div><b class="n">${l.length}</b><b>${e(t)}</b><span>${e(aj)}</span><span class="cwe-acoes in">${acoes.join('')}</span></div></td></tr>
        ${vis.map((dg) => `<tr><td>${ck('c2' + k, dg)}</td><td><button type="button" class="cwe-mono cwe-lnk" data-cwt="ficha" data-p="${e(dg)}">${e(A.cnj(dg))}</button></td><td>${e(ass(dg))}</td><td class="m">${e(f3(dg))}</td><td>${f4(dg)}</td></tr>`).join('')}
        ${l.length > 5 ? `<tr><td colspan="5"><button type="button" class="cwe-mais2" data-cwe="c2-mais" data-v="${k}">${est.c2[k] ? 'Mostrar só os 5 primeiros' : 'Mostrar os outros ' + (l.length - 5)}</button></td></tr>` : ''}</tbody>`;
    }).join('');
    return `<section class="cwe-st"><h2>2 · Pauta oficial</h2>
      <p>O PDF oficializa a listagem: cada processo recebe o número do seu item. Tudo numa lista só: no topo os que ficaram de fora, depois os novos e, embaixo, os que batem.</p>
      ${drop}
      <div class="cwe-res">${res}</div>
      <div class="cwe-lst"><div class="cwe-lst-h"><span><b>Uma lista só</b>, na ordem: ficaram de fora, novos e os que batem.</span>${conf ? `<span class="cwe-ok">Pauta oficial conferida em ${e(A.br(conf))}</span>` : ''}<button type="button" class="pri" data-cwe="c2-confirmar">${conf ? 'Confirmar de novo' : 'Confirmar a pauta oficial'}</button></div>
        <div class="cwe-tbl"><table><thead><tr><th></th><th>Processo</th><th>Assunto</th><th>Detalhe</th><th>Situação ou destino</th></tr></thead>${corpo}</table></div></div>
      <p class="cwe-nota">Ao confirmar, os processos que batem ficam como pautados na Triagem. Quem ficou de fora volta à Triagem ou passa para a seleção prévia da próxima sessão. A gravação vai ao procs-muta como o botão Gravar triagem.</p>
      <div class="cwe-acoes"><button type="button" class="pri" data-cwe="etapa" data-n="3">Próximo: preparar →</button></div></section>`;
  }

  /* 3 · A · conversões de etiquetas */
  function convDados(ss, d) { try { return d.s?.conversoes?.(ss.id) || []; } catch (er) { return []; } }
  function etapa3(ss, d) {
    const aba = est.prep;
    const tabs = `<div class="cwe-tabs" role="tablist"><button type="button" role="tab" data-cwe="prep" data-n="0" aria-selected="${aba === 0}">A · Regras de etiquetas</button><button type="button" role="tab" data-cwe="prep" data-n="1" aria-selected="${aba === 1}">B · Designação e correção</button></div>`;
    if (!d.pauta) return `<section class="cwe-st"><h2>3 · Preparar</h2>${tabs}<p class="cwe-nota">As regras de etiquetas e a designação se aplicam depois da pauta oficial. O rascunho fica na Triagem.</p></section>`;
    return aba === 0 ? etapa3a(ss, d, tabs) : etapa3b(ss, d, tabs);
  }
  function etapa3a(ss, d, tabs) {
    const C = convDados(ss, d);
    let tot = 0, conv = 0, ign = 0, sem = 0; const semM = new Map(), grp = new Map();
    C.forEach((p) => p.tags.forEach((t) => { tot++; if (t.ign) { ign++; return; } if (!t.regras.length) { sem++; semM.set(t.e, (semM.get(t.e) || 0) + 1); return; } conv++;
      t.regras.forEach((r) => { const k = r.rot + (r.v ? ' · ' + r.v : ''); if (!grp.has(k)) grp.set(k, { rot: r.rot, v: r.v, rows: [], regras: new Set() }); const g = grp.get(k); g.rows.push({ item: p.item, cnj: p.cnj, e: t.e, id: r.nome || r.id }); g.regras.add(r.nome || r.id); }); }));
    const tipo = (p) => p.proposta?.ap && p.proposta.ap !== '—' ? p.proposta.ap : p.tipo;
    const F = [['todos', 'Todos', C.length], ['dif', 'Com conversão a aplicar', C.filter((p) => p.proposta?.dif.length).length], ['ED', 'ED', 0], ['AgInt', 'AgInt', 0], ['JR', 'JR', 0], ['META', 'META', 0], ['ret', 'Retirados e adiados', 0], ['conf', 'Conferir', C.filter((p) => p.proposta?.man.length).length]];
    F.forEach((f) => { if (['ED', 'AgInt', 'JR'].includes(f[0])) f[2] = C.filter((p) => tipo(p) === f[0]).length; if (f[0] === 'META') f[2] = C.filter((p) => (p.c.metas || []).length).length; if (f[0] === 'ret') f[2] = C.filter((p) => retirado(p.tarefa)).length; });
    const fl = est.etqF;
    const L = C.filter((p) => fl === 'todos' ? true : fl === 'dif' ? p.proposta?.dif.length : fl === 'conf' ? p.proposta?.man.length : fl === 'META' ? (p.c.metas || []).length : fl === 'ret' ? retirado(p.tarefa) : fl === 'sem' ? p.tags.some((t) => !t.ign && !t.regras.length) : tipo(p) === fl);
    const vis = L.slice(0, est.etqTake);
    const aplic = C.filter((p) => p.proposta?.dif.length && marcado('etq', A.digits(p.cnj))).length;
    const G = [...grp.entries()].sort((a, b) => b[1].rows.length - a[1].rows.length);
    const painel = est.convAb ? `<section class="cwe-convs"><div class="h"><span><span class="cwe-k">TODAS AS ${conv} CONVERSÕES · PAUTA DE ${e(A.br(ss.data).slice(0, 5))}</span><small>Agrupadas pelo resultado. Abra um grupo para ver cada etiqueta, o processo e a regra.</small></span><button type="button" data-cwe="conv-todos">${G.every(([k]) => est.convG.has(k)) ? 'Recolher todos' : 'Abrir todos'}</button></div>
      ${G.map(([k, g]) => { const ab = est.convG.has(k); return `<div class="g"><button type="button" data-cwe="conv-g" data-v="${e(k)}" aria-expanded="${ab}"><span>${ab ? '▾' : '▸'}</span><b>${g.rows.length}</b><span><b>${e(g.rot)}</b>${g.v ? ' ' + e(g.v) : ''}</span><small>${e([...g.regras].slice(0, 3).join(' · '))}</small></button>
        ${ab ? `<table><thead><tr><th>Item</th><th>Processo</th><th>Etiqueta no PJe</th><th>Regra</th></tr></thead><tbody>${g.rows.map((r) => `<tr><td>${e(r.item || '')}</td><td class="cwe-mono">${e(A.cnj(r.cnj))}</td><td>${e(r.e)}</td><td class="m">${e(r.id)}</td></tr>`).join('')}</tbody></table>` : ''}</div>`; }).join('')}</section>` : '';
    const card = (p) => { const dg = A.digits(p.cnj), pr = p.proposta;
      const chips = p.tags.map((t) => t.ign ? `<span class="cwe-chp ign"><span>${e(t.e)}</span><i>→</i><b>ignorada</b></span>` : t.regras.length ? `<span class="cwe-chp cv"><span>${e(t.e)}</span><i>→</i><b>${e(t.regras.map((r) => r.rot + (r.v ? ' ' + r.v : '')).join(' · '))}</b><small>${e(t.regras.map((r) => r.nome || r.id).join(' · '))}</small></span>` : `<span class="cwe-chp"><span>${e(t.e)}</span></span>`).join('') || '<span class="cwe-chp vazio">sem etiquetas no PJe</span>';
      const ap = pr ? pr.ap : (p.tipoManual || p.tipo || '—');
      const campos = [['APRECIAÇÃO', AP_T[ap] || ap, tipoTarefa(p.tarefa) ? 'pela tarefa no PJe' : pr?.dif.includes('ap') ? 'pela etiqueta · a aplicar' : p.tipoManual ? 'fixado' : 'padrão'], ['TAREFA NO PJe', p.tarefa || '—', ''], ['META', (pr?.meta || p.meta || (p.c.metas || []).join(' ') || '—'), pr?.dif.includes('meta') ? 'a aplicar' : ''], ['MPF', pr?.mpf || p.mpf || (p.c.mpf || []).join(' · ') || '—', pr?.dif.includes('mpf') ? 'a aplicar' : ''], ['SUBASSUNTO', (p.c.tema || []).join(' · ') || '—', ''], ['ESPECIFICIDADE', (p.c.esp || []).join(' · ') || '—', '']];
      const nc = p.tags.filter((t) => t.regras.length && !t.ign).length;
      return `<article class="cwe-pc ${pr?.dif.length ? 'dif' : ''}"><div class="t">${ck('etq', dg)}<span class="it">item ${e(p.item || '—')}</span><button type="button" class="cwe-mono cwe-lnk" data-cwt="ficha" data-p="${e(dg)}">${e(A.cnj(p.cnj))}</button><span class="as">${e(p.assunto || '—')} · ${e(p.recurso || p.classe || '')}</span><span class="ct">${p.tags.length} etiqueta(s) · ${nc} convertida(s)</span></div>
        <div class="chs">${chips}</div>
        ${pr?.man.length ? `<p class="cf"><b>CONFERIR</b><span>O valor fixado à mão difere do que a regra daria (${e(pr.man.map((x) => ({ ap: 'apreciação', meta: 'meta', mpf: 'MPF' }[x])).join(', '))}). A aplicação não mexe no que foi fixado.</span></p>` : ''}
        <div class="cps">${campos.map(([k, v, o]) => `<div><span>${e(k)}</span><b>${e(v)}</b>${o ? `<small>${e(o)}</small>` : ''}</div>`).join('')}</div></article>`; };
    const semL = [...semM.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return `<section class="cwe-st"><h2>3 · Preparar · A · Regras de etiquetas</h2>${tabs}
      <p>Cada processo mostra todas as etiquetas do PJe. O tipo de julgamento sai primeiro da tarefa em que o processo está no PJe; a etiqueta confirma ou, sem indicação na tarefa, sugere. A etiqueta convertida aponta o resultado e a regra que a converteu.</p>
      <div class="cwe-fil" role="group" aria-label="Filtrar os processos"><span class="cwe-k">METAS E TIPO DE JULGAMENTO</span>${F.map(([k, t, n]) => `<button type="button" data-cwe="etq-f" data-v="${k}" aria-pressed="${fl === k}">${e(t)}<span>${n}</span></button>`).join('')}</div>
      <div class="cwe-kpis cwe-k4">${kpi(tot, 'Etiquetas na pauta', 'em ' + C.length + ' processos')}<button type="button" data-cwe="conv-ab" aria-expanded="${est.convAb}"><b>${conv}</b>Convertidas ${est.convAb ? '▴' : '▾'}<small>${est.convAb ? 'recolher a lista' : 'ver todas as conversões'}</small></button>${kpi(ign, 'Ignoradas por regra', 'APTO, SESSÃO, origem…')}<button type="button" data-cwe="etq-f" data-v="${fl === 'sem' ? 'todos' : 'sem'}" aria-pressed="${fl === 'sem'}"><b>${sem}</b>Sem regra<small>${fl === 'sem' ? 'mostrar todos' : 'filtrar os processos'}</small></button></div>
      ${painel}
      <div class="cwe-2col"><div class="cwe-lst"><div class="cwe-lst-h"><span><b>${aplic} de ${C.filter((p) => p.proposta?.dif.length).length} com conversão a aplicar</b> · desmarque o processo que não deve receber as conversões</span><button type="button" class="pri" data-cwe="etq-aplicar" ${aplic ? '' : 'disabled'}>Aplicar as conversões</button><button type="button" class="cwe-lnk2" data-cwe="prep" data-n="1">Próximo: designação e correção →</button></div>
        ${vis.map(card).join('') || '<p class="cwe-vazio">Nenhum processo neste filtro.</p>'}
        <div class="cwe-mostra"><span>mostrando ${vis.length} de ${L.length}</span>${L.length > vis.length ? `<button type="button" data-cwe="etq-mais">Mostrar mais 50</button><button type="button" data-cwe="etq-todos">Mostrar todos</button>` : ''}</div></div>
      <div class="cwe-lado"><section class="cwe-box"><div class="h"><span><b>Regras base pela tarefa no PJe</b><button type="button" class="cwe-lnk" data-cwe="cfg-2">Editar regras</button></span><small>valem antes das etiquetas · o tipo de julgamento sai daqui</small></div>
          <div class="rb"><code>[Sessão - ED] …  ·  [ED] …</code><b>→ ED</b></div><div class="rb"><code>[Ag. Int] …</code><b>→ AgInt</b></div><div class="rb"><code>tarefa com "retratação"</code><b>→ JR</b></div><div class="rb"><code>… Processos retirados e adiados</code><b>→ Retirado ou adiado</b></div>
          <p>A etiqueta de ED só informa. Remessa necessária vem da classe.</p></section>
        <aside class="cwe-box"><div class="h"><span><b>Sem regra, mais frequentes</b><button type="button" class="cwe-lnk" data-cwt="rules">Editar regras</button></span><small>na pauta de ${e(A.br(ss.data).slice(0, 5))}</small></div>
          ${semL.map(([t, n]) => `<div class="sr"><b>${n}</b><span>${e(t)}</span><button type="button" data-cwt="rules">Criar regra</button></div>`).join('') || '<p>Todas as etiquetas têm regra.</p>'}</aside></div></div></section>`;
  }

  /* 3 · B · designação e correção */
  function etapa3b(ss, d, tabs) {
    let Z = null; try { Z = d.s?.designacao?.(ss.id) || null; } catch (er) { Z = null; }
    if (!Z) return `<section class="cwe-st"><h2>3 · Preparar · B · Designação e correção</h2>${tabs}<p class="cwe-nota">Designação indisponível: motor não carregado.</p></section>`;
    const Ls = Z.linhas, esc = est.dsg;
    const vD = (p) => esc[A.digits(p.cnj)]?.d ?? (p.servidor || p.sugD?.nome || ''), vC = (p) => esc[A.digits(p.cnj)]?.c ?? (p.corretor || p.sugC?.nome || '');
    const porRegD = Ls.filter((p) => p.sugD).length, porRegC = Ls.filter((p) => p.sugC).length;
    const brD = Ls.filter((p) => !p.servidor && !p.sugD).length, brC = Ls.filter((p) => !p.corretor && !p.sugC).length;
    const aus = Z.minutantes.concat(Z.corretores).filter((m) => m.ausente).map((m) => m.nome);
    const semAss = new Map(); Ls.filter((p) => (!p.servidor && !p.sugD) || (!p.corretor && !p.sugC)).forEach((p) => { const k = p.assunto || '—'; const o = semAss.get(k) || { n: 0, d: 0, c: 0 }; o.n++; if (!p.servidor && !p.sugD) o.d++; if (!p.corretor && !p.sugC) o.c++; semAss.set(k, o); });
    const semA = [...semAss.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8);
    const quadro = (t, P, kind) => { const mx = Math.max(1, ...P.map((m) => m.atual + Ls.filter((p) => (kind === 'd' ? p.sugD : p.sugC)?.nome === m.nome).length));
      return `<div class="q"><div class="h"><span class="cwe-k">${e(t)}</span><small>só informação · já designados <i class="a"></i> · por regra agora <i class="b"></i></small></div>${P.map((m) => { const nv = Ls.filter((p) => (kind === 'd' ? p.sugD : p.sugC)?.nome === m.nome).length;
        return `<div class="p ${m.ausente ? 'aus' : ''}"><b>${e(m.nome)}</b><span class="cwe-br"><span class="a" style="width:${100 * m.atual / mx}%"></span><span class="b" style="width:${100 * nv / mx}%"></span></span><span>${m.atual}${nv ? ' + ' + nv : ''}${m.ausente ? ' · ausente' : ''}</span></div>`; }).join('')}</div>`; };
    const F = [['todos', 'Todos'], ['regra', 'Por regra agora'], ['branco', 'Em branco'], ['feitos', 'Já designados']];
    const fl = est.desF;
    const L = Ls.filter((p) => fl === 'todos' ? true : fl === 'regra' ? (p.sugD || p.sugC) : fl === 'branco' ? ((!p.servidor && !p.sugD) || (!p.corretor && !p.sugC)) : (p.servidor && p.corretor));
    const vis = L.slice(0, est.desTake);
    const sel = (kind, p) => { const atual = kind === 'd' ? p.servidor : p.corretor, sug = kind === 'd' ? p.sugD : p.sugC, P = kind === 'd' ? Z.minutantes : Z.corretores, v = kind === 'd' ? vD(p) : vC(p);
      if (atual) return `<span class="v">${e(atual)}</span><small>${e((kind === 'd' ? p.porD : p.porC) || 'já designado')}</small>`;
      return `<select data-cwe-esc="${kind}" data-p="${e(A.digits(p.cnj))}" class="${v ? (sug && v === sug.nome ? 'reg' : 'man') : 'vz'}"><option value="">— escolher —</option>${P.map((m) => `<option ${m.nome === v ? 'selected' : ''}>${e(m.nome)}</option>`).join('')}</select><small>${e(sug && v === sug.nome ? 'por regra: ' + sug.por : v ? 'escolha manual' : 'nenhuma regra casa')}</small>`; };
    const aplicN = Ls.filter((p) => marcado('dsg', A.digits(p.cnj)) && ((!p.servidor && vD(p)) || (!p.corretor && vC(p)))).length;
    return `<section class="cwe-st"><h2>3 · Preparar · B · Designação e correção</h2>${tabs}
      <p>Regras de designação do gabinete${Z.escopo === 'sessao' ? ', com o ajuste desta sessão' : ''}, na ordem cadastrada. Só se preenche quem está sem minutante ou sem corretor. Onde nenhuma regra casa, o campo fica em branco para escolha.</p>
      <div class="cwe-kpis cwe-k4">${kpi(Ls.length, 'Processos na pauta', `${Ls.filter((p) => p.servidor).length} com minutante · ${Ls.filter((p) => p.corretor).length} com corretor`)}${kpi(`${porRegD} · ${porRegC}`, 'Preenchidos por regra', 'minutantes · corretores')}${kpi(`${brD} · ${brC}`, 'Sem regra que case', 'minutantes · corretores, a escolher', brD + brC ? 'a' : '')}${kpi(aus.length, 'Ausências no período', aus.length ? aus.join(', ') : `nenhuma cadastrada entre ${A.br(Z.periodo.de).slice(0, 5)} e ${A.br(Z.periodo.ate).slice(0, 5)}`)}</div>
      <div class="cwe-2eq"><section class="cwe-box"><div class="h"><span><span class="cwe-k">REGRAS DE DESIGNAÇÃO · NESTA ORDEM</span><button type="button" class="cwe-lnk" data-cwe="cfg-3">Editar regras</button></span></div>
          ${Z.criterios.map((k, i) => `<div class="cr ${k.d || k.c ? '' : 'off'}"><b>${i + 1}</b><span><b>${e(k.t)}</b></span><span>${e([k.d ? 'minuta' : '', k.c ? 'correção' : ''].filter(Boolean).join(' · ') || 'desligada')}</span></div>`).join('')}
          <p>A primeira regra que casa decide, separadamente para minuta e para correção. Ausência cadastrada tira a pessoa do período.${Z.equilibrar ? ' Equilibrar a carga · ligado.' : ''}</p></section>
        <section class="cwe-box"><div class="h"><span><span class="cwe-k">ASSUNTOS SEM REGRA NESTA PAUTA</span></span><small>Uma regra por assunto resolve todos os processos dele, nesta e nas próximas pautas.</small></div>
          ${semA.map(([t, o]) => `<div class="sr"><b>${o.n}</b><span>${e(t)}<small>${[o.d ? o.d + ' sem minutante' : '', o.c ? o.c + ' sem corretor' : ''].filter(Boolean).join(' · ')}</small></span><button type="button" data-cwt="rules">Criar regra</button></div>`).join('') || '<p>Todos os assuntos têm regra que casa.</p>'}</section></div>
      <section class="cwe-carga">${quadro('MINUTA · EQUIPE', Z.minutantes, 'd')}${quadro('CORREÇÃO · ASSESSORIA', Z.corretores, 'c')}</section>
      <div class="cwe-lst"><div class="cwe-lst-h"><span class="cwe-segs">${F.map(([k, t]) => `<button type="button" data-cwe="des-f" data-v="${k}" aria-pressed="${fl === k}">${e(t)}</button>`).join('')}</span><span><b>${aplicN} a preencher</b> · o que veio por regra pode ser trocado; o que está em branco espera escolha</span><button type="button" class="pri" data-cwe="des-aplicar" ${aplicN ? '' : 'disabled'}>Aplicar à pauta</button><button type="button" class="cwe-lnk2" data-cwe="etapa" data-n="4">Próximo: publicar a pauta →</button></div>
        ${vis.map((p) => { const dg = A.digits(p.cnj); return `<article class="cwe-pc"><div class="t">${ck('dsg', dg)}<span class="it">item ${e(p.item || '—')}</span><button type="button" class="cwe-mono cwe-lnk" data-cwt="ficha" data-p="${e(dg)}">${e(A.cnj(p.cnj))}</button><span class="as">${e(p.assunto || '—')} · ${e(p.recurso || p.classe || '')} · ${e(p.secao || '')}</span><span class="ct">${e(AP_T[p.tipo] || p.tipo || '1º julgamento')}</span></div>
          <div class="ds"><div><span>MINUTANTE</span>${sel('d', p)}</div><div><span>CORRETOR</span>${sel('c', p)}</div></div></article>`; }).join('') || '<p class="cwe-vazio">Nenhum processo neste filtro.</p>'}
        <div class="cwe-mostra"><span>mostrando ${vis.length} de ${L.length}</span>${L.length > vis.length ? `<button type="button" data-cwe="des-mais">Mostrar mais 50</button><button type="button" data-cwe="des-todos">Mostrar todos</button>` : ''}</div></div></section>`;
  }

  function etapa4(ss, d) {
    const semDes = d.lines.filter((x) => !x.servidor || !x.corretor);
    const LST = {
      fora: d.lines.filter((x) => !d.acv(x.cnj)),
      ass: d.lines.filter((x) => { const r = d.acv(x.cnj); if (!r) return false; const a1 = A.norm((d.raw.get(A.digits(x.cnj)) || {}).assunto || ''), a2 = A.norm(r.Assunto || r.assunto_judicial || ''); return a1 && a2 && a1 !== a2; }),
      tar: d.lines.filter((x) => { const r = d.acv(x.cnj); return r && !/^\[Sessão\]/.test(r.tarefa_atual || ''); }),
      des: semDes
    };
    const cf = [['', d.itens.length, 'itens no espelho', 'pauta oficial importada', ''], ['fora', d.foraAc, 'fora do acervo fonte', 'sem registro no acervo', d.foraAc ? 'r' : 'g'], ['ass', d.assDiv, 'assuntos divergentes', 'pauta × acervo fonte', d.assDiv ? 'a' : 'g'], ['tar', d.foraTar, 'fora de tarefa de sessão', 'tarefa atual sem [Sessão]', d.foraTar ? 'a' : 'g'], ['des', semDes.length, 'sem designação', 'minutante ou corretor', semDes.length ? 'a' : 'g']];
    const ab = est.cf && LST[est.cf] ? LST[est.cf] : null;
    const pub = ss.pronta;
    return `<section class="cwe-st"><h2>4 · Publicar a pauta e acompanhar</h2>
      <p>A pauta vai à equipe depois de uma conferência rápida. Os marcos seguem por conta própria, no quadro acima da esteira.</p>
      ${d.pauta ? `<div class="cwe-final"><div class="h"><span class="cwe-k">CONFERÊNCIA FINAL · ANTES DE PUBLICAR</span><small>espelho da pauta × acervo fonte</small></div>
        <div class="g">${cf.map(([k, n, t, s, c]) => k ? `<button type="button" class="${c} ${est.cf === k ? 'on' : ''}" data-cwe="cf" data-v="${k}" ${n ? '' : 'disabled'}><b>${n}</b>${e(t)}<small>${e(s)}</small></button>` : `<span><b>${n}</b>${e(t)}<small>${e(s)}</small></span>`).join('')}</div>
        ${ab ? `<div class="cwe-cfl"><div>${ab.slice(0, 80).map((x) => `<button type="button" class="cwe-lnk cwe-mono" data-cwt="ficha" data-p="${e(A.digits(x.cnj))}">${e(A.cnj(x.cnj))}</button>`).join('')}${ab.length > 80 ? ` <small>e mais ${ab.length - 80}</small>` : ''}</div></div>` : '<p class="pe">Cada número abre a lista dos processos. O que ficar pendente vai como alerta no card do processo.</p>'}</div>` : '<p class="cwe-nota">Sem pauta oficial ainda: a conferência final começa depois do PDF.</p>'}
      <div class="cwe-acoes linha">${pub ? `<span class="cwe-ok">Publicada à equipe em ${e(A.br(pub))}</span><button type="button" data-cwe="despublicar">Retirar a publicação</button>` : `<button type="button" class="pri" data-cwe="publicar" ${d.pauta && !d.realizada ? '' : 'disabled'}>Publicar à equipe</button>`}<button type="button" data-cwe="x-xlsx">Controle da pauta · Excel do bimestre</button><button type="button" data-cwt="open-pos">Abrir a pauta oficial</button><small>painel, app da equipe e planilha de controle</small></div>
      <div class="cwe-vinc"><div class="h"><span class="cwe-k">VÍNCULO DA PAUTA DE ${e(A.br(ss.data))}</span><small>os três devem ter os mesmos itens, designações e situações</small></div>
        <div class="g"><div><span class="cwe-k">PAINEL · PAUTAS</span><b>Esta página</b><small>fonte da pauta</small></div><div><span class="cwe-k">APP DA EQUIPE</span><b>Ex Officio</b><small>${pub ? 'publicada · lê o procs-muta' : 'ainda não publicada'}</small></div><div><span class="cwe-k">PLANILHA · CONTROLE DE PAUTA</span><b>Excel do bimestre</b><small>sai pelo botão Controle da pauta</small></div></div></div>
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

  /* ---------- ações que gravam (sempre com confirmação) ---------- */
  const marcados = (k, lista) => lista.filter((dg) => marcado(k, dg));
  function mover(ss, cnjs, dest, txt) {
    const s = A.getSes(); if (!s?.moverPrevia) { A.msg('Motor indisponível.', true); return; }
    if (!cnjs.length) { A.msg('Nenhum processo marcado.', true); return; }
    if (!W.confirm(txt + '\n\n' + cnjs.length + ' processo(s). A Triagem grava no procs-muta como o botão Gravar triagem.')) return;
    const r = s.moverPrevia(ss.id, cnjs, dest);
    if (r.erro) { A.msg(r.erro, true); return; }
    A.msg(r.n ? r.n + ' processo(s) atualizados na Triagem.' : 'Nenhuma marca de seleção prévia encontrada na Triagem para esses processos.', !r.n);
    Promise.resolve(r.gravando).then((g) => { if (g && g.mud) A.msg('Triagem gravada no procs-muta: ' + g.mud + ' processo(s).'); }).catch((er) => A.msg('Falha ao gravar a triagem: ' + (er?.message || er), true)).then(() => A.render());
  }
  function acao(k, b, ss) {
    const d = dados(ss), s = d.s;
    if (k === 'fechar-sel') { const t = d.lines.map((x) => A.cnj(x.cnj)).join('\n'); (navigator.clipboard?.writeText(t) || Promise.reject()).then(() => A.msg(d.lines.length + ' números copiados para o registro no PJe. A seleção segue editável na Triagem até o PDF da pauta.')).catch(() => A.msg('Não foi possível copiar.', true)); return true; }
    if (k === 'venc-passar' || k === 'venc-devolver') { const v = vencidas().find((x) => x.id === b.dataset.v); if (!v) return true;
      mover({ id: '*' }, v.cnjs, k === 'venc-passar' ? ss.id : null, k === 'venc-passar' ? 'Passar para a sessão de ' + A.br(ss.data) + ' os processos marcados para ' + A.br(v.data) + '?' : 'Devolver à Triagem (tirar a marca de seleção prévia) os processos marcados para ' + A.br(v.data) + '?'); return true; }
    if (k === 'c2-passar') { const p = A.sessionData().find((x) => x.id === b.dataset.v); mover(ss, marcados('c2fora', d.conf.fora), b.dataset.v, 'Passar os que ficaram de fora para a seleção prévia da sessão de ' + (p ? A.br(p.data) : '') + '?'); return true; }
    if (k === 'c2-devolver') { mover(ss, marcados('c2fora', d.conf.fora), null, 'Devolver à Triagem os que ficaram de fora (tirar a marca de seleção prévia)?'); return true; }
    if (k === 'c2-confirmar') {
      if (!s?.confirmarPauta) { A.msg('Motor indisponível.', true); return true; }
      const bt = marcados('c2batem', d.conf.batem);
      if (!W.confirm('Confirmar a pauta oficial de ' + A.br(ss.data) + '?\n\n' + d.itens.length + ' itens do PDF.' + (bt.length ? ' ' + bt.length + ' processo(s) da seleção prévia passam a pautados na Triagem.' : ''))) return true;
      s.confirmarPauta(ss.id);
      if (bt.length && s.moverPrevia) { const r = s.moverPrevia(ss.id, bt, 'pautar'); Promise.resolve(r.gravando).catch((er) => A.msg('Falha ao gravar a triagem: ' + (er?.message || er), true)).then(() => A.render()); }
      A.msg('Pauta oficial conferida.'); A.render(); return true; }
    if (k === 'etq-aplicar') { if (!s?.aplicarConversoes) { A.msg('Motor indisponível.', true); return true; }
      const L = convDados(ss, d).filter((p) => p.proposta?.dif.length && marcado('etq', A.digits(p.cnj))).map((p) => p.cnj);
      if (!L.length || !W.confirm('Aplicar as conversões de etiquetas a ' + L.length + ' processo(s)?\n\nFixa apreciação, meta e MPF que vieram das regras. O que foi fixado à mão não muda.')) return true;
      const n = s.aplicarConversoes(ss.id, L); A.msg(n + ' processo(s) com as conversões aplicadas. Grave no procs-muta pela Base.'); A.render(); return true; }
    if (k === 'des-aplicar') { if (!s?.aplicarDesignacao || !s.designacao) { A.msg('Motor indisponível.', true); return true; }
      const Z = s.designacao(ss.id); const lista = Z.linhas.filter((p) => marcado('dsg', A.digits(p.cnj))).map((p) => { const o = est.dsg[A.digits(p.cnj)] || {}; const dd = p.servidor ? '' : (o.d ?? p.sugD?.nome ?? ''), cc = p.corretor ? '' : (o.c ?? p.sugC?.nome ?? '');
        return { cnj: p.cnj, d: dd, c: cc, porD: o.d != null && o.d !== p.sugD?.nome ? 'escolha manual' : p.sugD?.por, porC: o.c != null && o.c !== p.sugC?.nome ? 'escolha manual' : p.sugC?.por }; }).filter((x) => x.d || x.c);
      if (!lista.length || !W.confirm('Aplicar a designação a ' + lista.length + ' processo(s) da pauta?\n\nSó preenche quem está sem minutante ou sem corretor.')) return true;
      const n = s.aplicarDesignacao(ss.id, lista); est.dsg = {}; A.msg(n + ' processo(s) designados. Grave no procs-muta pela Base.'); A.render(); return true; }
    if (k === 'publicar' || k === 'despublicar') { if (!s?.publicar) { A.msg('Motor indisponível.', true); return true; }
      const on = k === 'publicar';
      if (!W.confirm(on ? 'Publicar a pauta de ' + A.br(ss.data) + ' à equipe?\n\nGrava a sessão no procs-muta; a Ex Officio passa a mostrá-la como publicada.' : 'Retirar a publicação da pauta de ' + A.br(ss.data) + '?')) return true;
      s.publicar(ss.id, on); A.render(); if (s.gravar) setTimeout(() => { try { s.gravar(); } catch (er) {} }, 400);
      A.msg(on ? 'Pauta publicada. Gravando no procs-muta…' : 'Publicação retirada.'); return true; }
    return false;
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
      else if (k === 'c2-mais') est.c2[b.dataset.v] = !est.c2[b.dataset.v];
      else if (k === 'etq-f') { est.etqF = b.dataset.v; est.etqTake = 50; }
      else if (k === 'etq-mais') est.etqTake += 50;
      else if (k === 'etq-todos') est.etqTake = 1e5;
      else if (k === 'conv-ab') est.convAb = !est.convAb;
      else if (k === 'conv-g') { const v = b.dataset.v; if (est.convG.has(v)) est.convG.delete(v); else est.convG.add(v); }
      else if (k === 'conv-todos') { const ks = [...view.querySelectorAll('[data-cwe="conv-g"]')].map((x) => x.dataset.v); est.convG = ks.every((x) => est.convG.has(x)) ? new Set() : new Set(ks); }
      else if (k === 'des-f') { est.desF = b.dataset.v; est.desTake = 50; }
      else if (k === 'des-mais') est.desTake += 50;
      else if (k === 'des-todos') est.desTake = 1e5;
      else if (k === 'cf') est.cf = est.cf === b.dataset.v ? '' : b.dataset.v;
      else if (acao(k, b, ss)) return;
      else if (k === 'triagem') { D.querySelector('nav.mods .mod[data-cmt="triagem"]')?.click(); return; }
      else if (k === 'equipe') { est.cfg = false; const bt = D.querySelector('nav.mods .mod[data-cmt="equipe"]') || D.querySelector('nav.mods .mod[data-tab="equipe"]'); if (bt) bt.click(); return; }
      A.render();
    });
    view.addEventListener('change', (ev) => {
      const t = ev.target;
      if (t.dataset.cweCk) { const k = t.dataset.cweCk, dg = t.dataset.p, S0 = est.desm[k] || (est.desm[k] = new Set()); if (t.checked) S0.delete(dg); else S0.add(dg); A.render(); return; }
      if (t.dataset.cweEsc) { const dg = t.dataset.p; est.dsg[dg] = { ...(est.dsg[dg] || {}), [t.dataset.cweEsc]: t.value }; A.render(); }
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
    if (est.ses !== ss.id) { est.ses = ss.id; est.etapa = 0; est.prep = 0; est.sel = ''; est.q = ''; est.filtro = 'all'; est.take = 60; est.desm = {}; est.c2 = {}; est.etqF = 'todos'; est.etqTake = 50; est.convAb = false; est.convG = new Set(); est.desF = 'todos'; est.desTake = 50; est.dsg = {}; est.cf = ''; }
    const d = dados(ss);
    const corpo = [null, etapa1, etapa2, etapa3, etapa4, etapa5][d.cur](ss, d);
    view.innerHTML = `<div class="cwe">${cabecalho(ss, d)}${marcos(ss)}<div class="cwe-grid"><nav class="cwe-nav">${sessoes(ss)}<span class="cwe-k cwe-k2">ESTEIRA · ${e(A.br(ss.data))}</span>${esteira(d)}</nav><div class="cwe-main">${corpo}</div></div>${est.cfg ? config(ss, d) : ''}</div>`;
  }

  W.CMTEsteira = { render, estado: () => ({ ...est }) };
})(window, document);
