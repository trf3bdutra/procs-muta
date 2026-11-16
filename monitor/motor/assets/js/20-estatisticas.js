/* ==========================================================================
   Panorama estatístico · módulo de leitura do Painel Central
   Apenas lê window.__painelCentralComponent.rows — não grava nada no banco.
   ========================================================================== */
(function () {
  'use strict';
  const CAT = ['#3e72ad', '#d9a046', '#8a70c0', '#1fa58a'];   // ordem fixa (validada)
  const OTHER = '#b3ab9c';
  const SEQ = '#3e72ad';
  const LS_HIDE = 'pv_stats_hidden', LS_OPEN = 'pv_stats_open', LS_TAB = 'pv_stats_tables';
  const MODULES = [
    ['situacao', 'Situação do acervo'], ['secao', 'Distribuição por seção'],
    ['entradas', 'Distribuições por mês'], ['idade', 'Idade do acervo'],
    ['tarefa', 'Tempo na tarefa atual'], ['assuntos', 'Concentração por assunto'],
    ['sessoes', 'Próximas sessões'], ['cruzamento', '1º julgamento por seção']
  ];
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('pt-BR');
  const n = v => nf.format(Math.round(v));
  const n1 = v => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(v);
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const compact = v => v >= 1e9 ? n1(v / 1e9) + ' bi' : v >= 1e6 ? n1(v / 1e6) + ' mi' : v >= 1e3 ? n1(v / 1e3) + ' mil' : n(v);
  const txt = v => v == null ? '' : String(v).trim();
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  function parseDate(v) {
    v = txt(v); if (!v) return null; let m;
    if ((m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1], m[2] - 1, +m[3]);
    if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return new Date(+m[3], m[2] - 1, +m[1]);
    if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/))) return new Date(2000 + +m[3], m[1] - 1, +m[2]);
    return null;
  }
  const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
  const quant = (arr, q) => { if (!arr.length) return null; const a = [...arr].sort((x, y) => x - y), i = (a.length - 1) * q, lo = Math.floor(i); return a[lo] + (a[Math.ceil(i)] - a[lo]) * (i - lo); };
  const P = () => window.__painelCentralComponent;

  /* ------------------------------------------------------------ cálculo */
  function compute() {
    const c = P(), rows = (c && c.rows) || [], t = today(), D = 864e5;
    const sit = r => { try { return c.situacao(r).label; } catch (e) { return 'PENDENTE'; } };
    const sitMap = new Map(), secMap = new Map(), assMap = new Map();
    const cross = new Map();
    let ativos = 0, pend1 = 0, pend1Info = 0, prio = 0, sel = 0, valSum = 0;
    const idades = [], tarefas = [], vals = [], mes = new Map();
    for (const r of rows) {
      const s = sit(r); sitMap.set(s, (sitMap.get(s) || 0) + 1);
      const foraDoAcervo = /^(ARQUIVADO|BAIXADO|A CAMINHO)$/.test(s);
      if (foraDoAcervo) { if (s !== 'A CAMINHO') { const dd0 = parseDate(r.Data_Distribuição || r['data_distribuição']); if (dd0) { const k0 = dd0.getFullYear() * 12 + dd0.getMonth(); mes.set(k0, (mes.get(k0) || 0) + 1); } } continue; }
      ativos++;
      const p1 = txt(r.Pendente_1Julgamento).toLowerCase();
      if (p1) { pend1Info++; if (p1 === 'sim') pend1++; }
      if (/^sim$/i.test(txt(r.prioridade))) prio++;
      if (r['Seleção Prévia'] === 'SELECIONADO PREVIAMENTE') sel++;
      let sec = ''; try { sec = c.secaoCompetente ? c.secaoCompetente(r) : r['Seção Competente']; } catch (e) { sec = r['Seção Competente']; }
      sec = txt(sec) || 'Não identificada'; secMap.set(sec, (secMap.get(sec) || 0) + 1);
      { const cr = cross.get(sec) || { sim: 0, nao: 0, ni: 0 }; cr[p1 === 'sim' ? 'sim' : p1 === 'não' || p1 === 'nao' ? 'nao' : 'ni']++; cross.set(sec, cr); }
      const as = txt(r.Assunto || r.assunto_judicial) || 'Sem assunto'; assMap.set(as, (assMap.get(as) || 0) + 1);
      const dd = parseDate(r.Data_Distribuição || r['data_distribuição']);
      if (dd) { idades.push((t - dd) / D / 365.25); const k = dd.getFullYear() * 12 + dd.getMonth(); mes.set(k, (mes.get(k) || 0) + 1); }
      const dt = parseDate(r.data_entrada_tarefa); if (dt && dt <= t) tarefas.push((t - dt) / D);
      const v = parseFloat(String(r.Valor_da_Causa || r.valor_causa || '').replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
      if (v > 0 && isFinite(v)) { vals.push(v); valSum += v; }
    }
    // situação: 4 primeiras categorias + demais
    const sitOrder = ['APTO PARA JULGAMENTO', 'PENDENTE', 'AGUARDANDO JULGAMENTO', 'SUSPENSO', 'A CAMINHO', 'BAIXADO', 'ARQUIVADO'];
    const situacao = sitOrder.filter(k => sitMap.get(k)).map(k => ({ k, v: sitMap.get(k) }));
    const sitOutros = [...sitMap.entries()].filter(([k]) => !sitOrder.includes(k)).reduce((a, [, v]) => a + v, 0);
    if (sitOutros) situacao.push({ k: 'Outras', v: sitOutros, other: true });
    // seções
    const secoes = [...secMap.entries()].filter(([k]) => k !== 'Não identificada').sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true })).map(([k, v]) => ({ k, v }));
    const secTop = secoes.slice(0, 4); const secResto = secoes.slice(4).reduce((a, x) => a + x.v, 0) + (secMap.get('Não identificada') || 0);
    if (secResto) secTop.push({ k: 'Não identificada / outras', v: secResto, other: true });
    // entradas: últimos 24 meses
    const k0 = t.getFullYear() * 12 + t.getMonth(), entradas = [];
    for (let k = k0 - 23; k <= k0; k++) entradas.push({ k, y: Math.floor(k / 12), m: k % 12, v: mes.get(k) || 0 });
    // idade
    const faixasI = [[0, 1, '< 1 ano'], [1, 2, '1–2 anos'], [2, 3, '2–3 anos'], [3, 5, '3–5 anos'], [5, 10, '5–10 anos'], [10, 1e9, '≥ 10 anos']];
    const idade = faixasI.map(([a, b, l]) => ({ k: l, v: idades.filter(x => x >= a && x < b).length }));
    const faixasT = [[0, 31, 'até 30 dias'], [31, 91, '31–90 dias'], [91, 181, '91–180 dias'], [181, 366, '181–365 dias'], [366, 1e9, '> 1 ano']];
    const tarefa = faixasT.map(([a, b, l]) => ({ k: l, v: tarefas.filter(x => x >= a && x < b).length }));
    // assuntos — Pareto
    const assSort = [...assMap.entries()].sort((a, b) => b[1] - a[1]);
    const assuntos = assSort.slice(0, 8).map(([k, v]) => ({ k, v }));
    const top8 = assuntos.reduce((a, x) => a + x.v, 0);
    // HHI (concentração) normalizado
    const hhi = rows.length ? assSort.reduce((a, [, v]) => a + Math.pow(v / rows.length * 100, 2), 0) : 0;
    // sessões
    let sessoes = [];
    try { sessoes = (c.upcomingSessions(true) || []).slice(0, 6).map(s => ({ k: s, v: (c.selectionSessionRows(s) || []).length })); } catch (e) {}
    return {
      total: rows.length, ativos, pend1, pend1Info, prio, sel, valSum, valMed: quant(vals, .5), nVal: vals.length,
      idadeMed: quant(idades, .5), idadeP90: quant(idades, .9), nIdade: idades.length,
      tarefaMed: quant(tarefas, .5), nTarefa: tarefas.length,
      cross: [...cross.entries()].filter(([k]) => k !== 'Não identificada').sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true })).map(([k, v]) => ({ k, ...v, t: v.sim + v.nao + v.ni })),
      situacao, secoes: secTop, entradas, idade, tarefa, assuntos, top8, nAssuntos: assMap.size, hhi, sessoes,
      arquivados: (sitMap.get('ARQUIVADO') || 0) + (sitMap.get('BAIXADO') || 0), caminho: sitMap.get('A CAMINHO') || 0, suspensos: sitMap.get('SUSPENSO') || 0, aguardando: sitMap.get('AGUARDANDO JULGAMENTO') || 0
    };
  }

  /* ------------------------------------------------------------ peças visuais */
  const legend = items => `<ul class="pvs-legend">${items.map(x => `<li><i style="background:${x.c}"></i><span>${esc(x.k)}</span><b>${n(x.v)}</b><em>${x.p}%</em></li>`).join('')}</ul>`;
  const table = (cols, rows) => `<table class="pvs-table"><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((v, i) => `<td${i ? ' class="r"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  function stacked(items, total) {
    let x = 0;
    const segs = items.map((it, i) => {
      const w = total ? it.v / total * 100 : 0, c = it.other ? OTHER : CAT[i % 4], p = pct(it.v, total);
      const s = `<span class="pvs-seg" style="left:${x}%;width:${w}%;background:${c}" data-tip="<b>${esc(it.k)}</b>${n(it.v)} processos · ${p}%"></span>`;
      x += w; it.c = c; it.p = p; return s;
    }).join('');
    return `<div class="pvs-stack">${segs}</div>`;
  }

  function donut(items, total) {
    const r = 46, C = 2 * Math.PI * r, gap = items.length > 1 ? 7 : 0; let off = 0;
    const arcs = items.map((it, i) => {
      const c = it.other ? OTHER : CAT[i % 4]; it.c = c; it.p = pct(it.v, total);
      const len = total ? it.v / total * C : 0, L = Math.max(0, len - gap);
      const h = L > 0 ? `<circle cx="64" cy="64" r="${r}" fill="none" stroke="${c}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${L.toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-off - gap / 2).toFixed(1)}" transform="rotate(-90 64 64)" data-tip="<b>${esc(it.k)}</b>${n(it.v)} processos · ${it.p}%"/>` : '';
      off += len; return h;
    }).join('');
    const lead = items.filter(x => !x.other).sort((a, b) => b.v - a.v)[0];
    return `<div class="pvs-donut"><svg viewBox="0 0 128 128" role="img" aria-label="Distribuição por seção"><circle cx="64" cy="64" r="${r}" fill="none" stroke="#f1ede6" stroke-width="14"/>${arcs}
      <text x="64" y="62" text-anchor="middle" class="pvs-dn-v">${lead ? lead.p + '%' : '—'}</text>
      <text x="64" y="78" text-anchor="middle" class="pvs-dn-l">${lead ? esc(lead.k) : ''}</text></svg>${legend(items)}</div>`;
  }

  function columns(items, fmtLabel) {
    const W = 640, H = 190, pl = 34, pr = 8, pt = 22, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
    const max = Math.max(1, ...items.map(x => x.v));
    const step = niceStep(max), top = Math.ceil(max / step) * step;
    const bw = Math.min(24, iw / items.length - 4);
    let grid = '';
    for (let v = 0; v <= top; v += step) { const y = pt + ih - v / top * ih; grid += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" class="pvs-gl"/><text x="${pl - 6}" y="${y + 3}" text-anchor="end" class="pvs-ax">${compact(v)}</text>`; }
    const iMax = items.reduce((b, x, i) => x.v > items[b].v ? i : b, 0);
    const bars = items.map((it, i) => {
      const cx = pl + (i + .5) * iw / items.length, h = it.v / top * ih, y = pt + ih - h, x = cx - bw / 2;
      const last = i === items.length - 1, hl = i === iMax || last;
      const lab = (i % 3 === 0 || last) ? `<text x="${cx}" y="${H - 8}" text-anchor="middle" class="pvs-ax">${esc(fmtLabel(it, true))}</text>` : '';
      const val = hl && it.v ? `<text x="${cx}" y="${y - 6}" text-anchor="middle" class="pvs-val">${n(it.v)}</text>` : '';
      return `<g><rect x="${cx - iw / items.length / 2}" y="${pt}" width="${iw / items.length}" height="${ih}" fill="transparent" data-tip="<b>${esc(fmtLabel(it, false))}</b>${n(it.v)} processos"/>`
        + (h > 0 ? `<path class="pvs-colbar" style="animation-delay:${i * 18}ms" d="${roundTop(x, y, bw, h)}" fill="url(#${last ? 'pvsColL' : 'pvsCol'})" pointer-events="none"/>` : '') + val + lab + '</g>';
    }).join('');
    const avg = items.reduce((a, x) => a + x.v, 0) / items.length, ya = pt + ih - avg / top * ih;
    const defs = `<defs><linearGradient id="pvsCol" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b8fc9"/><stop offset="1" stop-color="${SEQ}"/></linearGradient><linearGradient id="pvsColL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f5d93"/><stop offset="1" stop-color="#1b3553"/></linearGradient></defs>`;
    const avgL = `<line x1="${pl}" x2="${W - pr}" y1="${ya}" y2="${ya}" class="pvs-avg"/><text x="${pl + 4}" y="${ya - 5}" class="pvs-avg-t">média 24 meses · ${n1(avg)}</text>`;
    return `<svg class="pvs-cols" viewBox="0 0 ${W} ${H}" role="img">${defs}${grid}<line x1="${pl}" x2="${W - pr}" y1="${pt + ih}" y2="${pt + ih}" class="pvs-base"/>${bars}${avgL}</svg>`;
  }
  function roundTop(x, y, w, h) { const r = Math.min(4, h, w / 2); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; }
  function niceStep(max) { const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }

  function hbars(items, total, color, opts = {}) {
    const max = Math.max(1, ...items.map(x => x.v));
    let acc = 0;
    return `<div class="pvs-hbars">${items.map(it => {
      acc += it.v; const p = pct(it.v, total), cum = pct(acc, total);
      return `<div class="pvs-hb" data-tip="<b>${esc(it.k)}</b>${n(it.v)} processos · ${p}%${opts.cum ? ` · acumulado ${cum}%` : ''}">
        <span class="pvs-hb-l" title="${esc(it.k)}">${esc(it.k)}</span>
        <span class="pvs-hb-t"><i style="width:${it.v / max * 100}%;background:linear-gradient(90deg,${color}cc,${color})"></i></span>
        <span class="pvs-hb-v"><b>${n(it.v)}</b><em>${opts.cum ? cum + '% ac.' : p + '%'}</em></span></div>`;
    }).join('')}</div>`;
  }

  function crossBars(rows) {
    const K = [['sim', 'Pendente', CAT[0]], ['nao', 'Não pendente', CAT[1]], ['ni', 'Sem informação', OTHER]];
    const tot = { sim: 0, nao: 0, ni: 0 }; rows.forEach(r => K.forEach(([k]) => tot[k] += r[k]));
    const all = tot.sim + tot.nao + tot.ni;
    return `<div class="pvs-cross">${rows.map(r => { let x = 0; return `<div class="pvs-cr"><span class="pvs-cr-l">${esc(r.k)}</span><div class="pvs-stack">${K.map(([k, l, c]) => { const w = r.t ? r[k] / r.t * 100 : 0, h = `<span class="pvs-seg" style="left:${x}%;width:${w}%;background:${c}" data-tip="<b>${esc(r.k)} · ${l}</b>${n(r[k])} processos · ${Math.round(w)}%"></span>`; x += w; return h; }).join('')}</div><span class="pvs-cr-v"><b>${pct(r.sim, r.t)}%</b> pendente</span></div>`; }).join('')}</div>`
      + legend(K.map(([k, l, c]) => ({ k: l, v: tot[k], c, p: pct(tot[k], all) })));
  }

  /* ------------------------------------------------------------ módulos */
  function modules(S) {
    const f = (it, short) => short ? MES[it.m] + (it.m === 0 ? '/' + String(it.y).slice(2) : '') : MES[it.m] + '/' + it.y;
    const e12 = S.entradas.slice(-12).reduce((a, x) => a + x.v, 0), e12p = S.entradas.slice(0, 12).reduce((a, x) => a + x.v, 0);
    const delta = e12p ? Math.round((e12 - e12p) / e12p * 100) : null;
    const stackHtml = stacked(S.situacao, S.total);
    const secHtml = donut(S.secoes, S.total);
    const conc = S.hhi < 1500 ? 'baixa' : S.hhi < 2500 ? 'moderada' : 'alta';
    return {
      situacao: {
        span: 2, sub: `${n(S.total)} processos no banco mestre`,
        body: `<div class="pvs-big"><b>${n(S.ativos)}</b><span>ativos · ${pct(S.ativos, S.total)}% do banco</span></div>${stackHtml}${legend(S.situacao)}`,
        table: table(['Situação', 'Processos', '%'], S.situacao.map(x => [x.k, n(x.v), x.p + '%']))
      },
      secao: {
        span: 1, sub: 'Seção competente',
        body: secHtml,
        table: table(['Seção', 'Processos', '%'], S.secoes.map(x => [x.k, n(x.v), x.p + '%']))
      },
      entradas: {
        span: 2, sub: `Data de distribuição · últimos 24 meses`,
        head: `<div class="pvs-kv"><span>12 meses</span><b>${n(e12)}</b>${delta === null ? '' : `<em class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% vs. 12 meses anteriores</em>`}<span>média</span><b>${n1(e12 / 12)}</b><em>por mês</em></div>`,
        body: columns(S.entradas, f),
        table: table(['Mês', 'Distribuições'], S.entradas.map(x => [f(x, false), n(x.v)]))
      },
      idade: {
        span: 1, sub: `Tempo desde a distribuição · ${n(S.nIdade)} com data`,
        head: `<div class="pvs-kv"><span>mediana</span><b>${S.idadeMed == null ? '—' : n1(S.idadeMed)}</b><em>anos</em><span>P90</span><b>${S.idadeP90 == null ? '—' : n1(S.idadeP90)}</b><em>anos</em></div>`,
        body: hbars(S.idade, S.nIdade, SEQ),
        table: table(['Faixa', 'Processos', '%'], S.idade.map(x => [x.k, n(x.v), pct(x.v, S.nIdade) + '%']))
      },
      tarefa: {
        span: 1, sub: `Desde a entrada na tarefa · ${n(S.nTarefa)} com data`,
        head: `<div class="pvs-kv"><span>mediana</span><b>${S.tarefaMed == null ? '—' : n(S.tarefaMed)}</b><em>dias</em></div>`,
        body: hbars(S.tarefa, S.nTarefa, CAT[2]),
        table: table(['Faixa', 'Processos', '%'], S.tarefa.map(x => [x.k, n(x.v), pct(x.v, S.nTarefa) + '%']))
      },
      assuntos: {
        span: 2, sub: `${n(S.nAssuntos)} assuntos distintos · concentração ${conc} (HHI ${n(S.hhi)})`,
        head: `<div class="pvs-kv"><span>8 maiores</span><b>${pct(S.top8, S.total)}%</b><em>do acervo</em></div>`,
        body: hbars(S.assuntos, S.total, CAT[0], { cum: true }),
        table: table(['Assunto', 'Processos', '%'], S.assuntos.map(x => [x.k, n(x.v), pct(x.v, S.total) + '%']))
      },
      cruzamento: {
        span: 2, sub: 'Pendente_1Julgamento em cada seção competente',
        body: crossBars(S.cross),
        table: table(['Seção', 'Pendente', 'Não pendente', 'Sem informação'], S.cross.map(x => [x.k, n(x.sim), n(x.nao), n(x.ni)]))
      },
      sessoes: {
        span: 1, sub: 'Processos selecionados por sessão',
        body: S.sessoes.length ? hbars(S.sessoes, S.sessoes.reduce((a, x) => a + x.v, 0), CAT[1]) : '<p class="pvs-empty">Nenhuma sessão futura cadastrada.</p>',
        table: table(['Sessão', 'Processos'], S.sessoes.map(x => [x.k, n(x.v)]))
      }
    };
  }

  /* ------------------------------------------------------------ micrográficos */
  function ring(p, color) {
    const r = 19, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, p));
    return `<svg class="pvs-ring" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="${r}" class="bg"/>
      <circle cx="25" cy="25" r="${r}" class="fg" stroke="${color}" stroke-dasharray="${(c * v / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 25 25)"/>
      <text x="25" y="29" text-anchor="middle">${v}%</text></svg>`;
  }
  function spark(vals, color) {
    const W = 190, H = 46, max = Math.max(1, ...vals), st = W / (vals.length - 1);
    const pts = vals.map((v, i) => [i * st, H - 4 - v / max * (H - 10)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
    const last = pts[pts.length - 1];
    return `<svg class="pvs-spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><linearGradient id="pvsSp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      <path d="${line}L${W},${H}L0,${H}Z" fill="url(#pvsSp)"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`;
  }
  function minibars(vals, color) {
    const max = Math.max(1, ...vals);
    return `<div class="pvs-minib" aria-hidden="true">${vals.map(v => `<i style="height:${Math.max(6, v / max * 100)}%;background:${color}"></i>`).join('')}</div>`;
  }
  const cnt = (v, fmt) => `<b class="pvs-num" data-count="${v}" data-fmt="${fmt || 'int'}">${fmt === 'dec' ? n1(v) : n(v)}</b>`;

  function kpis(S) {
    const e = S.entradas.map(x => x.v), e12 = e.slice(-12).reduce((a, b) => a + b, 0), e12p = e.slice(0, 12).reduce((a, b) => a + b, 0);
    const d = e12p ? Math.round((e12 - e12p) / e12p * 100) : null;
    const t = (cls, ico, lbl, val, sub, vis) => `<article class="pvs-tile ${cls}"><div class="pvs-tile-h"><span class="pvs-ico">${ico}</span><span>${lbl}</span></div>
      <div class="pvs-tile-b"><div>${val}<small>${sub}</small></div>${vis || ''}</div></article>`;
    return `<div class="pvs-tiles">
      ${t('t-blue', '▣', 'Acervo ativo', cnt(S.ativos), `${n(S.arquivados)} baixados ou arquivados · ${n(S.caminho || 0)} a caminho · ${n(S.suspensos)} suspensos`, ring(pct(S.ativos, S.total), CAT[0]))}
      ${t('t-gold', '⚖', '1º julgamento pendente', cnt(S.pend1), `de ${n(S.pend1Info)} com a informação`, ring(pct(S.pend1, S.pend1Info), CAT[1]))}
      ${t('t-blue wide', '↗', 'Distribuições · 12 meses', cnt(e12) + (d === null ? '' : `<em class="pvs-delta ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}%</em>`), `média de ${n1(e12 / 12)} por mês`, `<div class="pvs-kv2"><span>3 meses</span><b>${n(e.slice(-3).reduce((a, b) => a + b, 0))}</b><span>${MES[S.entradas[S.entradas.length - 1].m]}/${S.entradas[S.entradas.length - 1].y} · mês corrente</span><b>${n(e[e.length - 1])}</b></div>` + spark(e.slice(-12), CAT[0]))}
      ${t('t-violet', '◷', 'Idade mediana', (S.idadeMed == null ? '<b>—</b>' : cnt(S.idadeMed, 'dec')) + '<i class="pvs-unit">anos</i>', S.idadeP90 == null ? 'sem datas' : `P90 · ${n1(S.idadeP90)} anos`, minibars(S.idade.map(x => x.v), CAT[2]))}
      ${t('t-teal', '✓', 'Em seleção prévia', cnt(S.sel), S.sessoes.length ? `${S.sessoes.length} sessão(ões) à frente` : 'sem sessões futuras', minibars(S.sessoes.map(x => x.v), CAT[3]))}
      ${t('t-ink wide', 'R$', 'Valor das causas', `<b class="pvs-num">R$ ${compact(S.valSum)}</b>`, `${n(S.nVal)} processos com valor informado`, `<div class="pvs-kv2"><span>mediana</span><b>R$ ${S.valMed == null ? '—' : compact(S.valMed)}</b><span>prioridade legal</span><b>${n(S.prio)} <em>· ${pct(S.prio, S.total)}%</em></b></div>`)}
    </div>`;
  }

  function insights(S) {
    const out = [];
    const cr = S.cross.filter(x => x.t > 0).map(x => ({ ...x, p: pct(x.sim, x.t) })).sort((a, b) => b.p - a.p);
    if (cr.length > 1) out.push(['⚖', `<b>${esc(cr[0].k)}</b> concentra a maior pendência de 1º julgamento (<b>${cr[0].p}%</b>); a <b>${esc(cr[cr.length - 1].k)}</b>, a menor (${cr[cr.length - 1].p}%).`]);
    const e = S.entradas.map(x => x.v), e12 = e.slice(-12).reduce((a, b) => a + b, 0), e12p = e.slice(0, 12).reduce((a, b) => a + b, 0);
    if (e12p) { const d = Math.round((e12 - e12p) / e12p * 100); out.push([d >= 0 ? '↗' : '↘', `Distribuições ${d >= 0 ? 'cresceram' : 'caíram'} <b>${Math.abs(d)}%</b> nos últimos 12 meses (${n(e12)} contra ${n(e12p)}).`]); }
    const velho = S.tarefa.slice(3).reduce((a, x) => a + x.v, 0);
    if (S.nTarefa) out.push(['◷', `<b>${n(velho)}</b> processos (${pct(velho, S.nTarefa)}%) estão há mais de 180 dias na mesma tarefa.`]);
    if (S.assuntos.length) out.push(['◎', `Os 8 maiores assuntos somam <b>${pct(S.top8, S.total)}%</b> do acervo; o líder é <b>${esc(S.assuntos[0].k)}</b>.`]);
    if (S.sessoes.length) out.push(['✓', `Próxima sessão <b>${esc(S.sessoes[0].k)}</b> com <b>${n(S.sessoes[0].v)}</b> processo(s) selecionado(s).`]);
    return `<div class="pvs-insights">${out.slice(0, 4).map(([i, t]) => `<p><span>${i}</span><span>${t}</span></p>`).join('')}</div>`;
  }

  function countUp(scope) {
    const els = scope.querySelectorAll('.pvs-num[data-count]'), t0 = performance.now(), D = 900;
    const fr = now => {
      const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
      els.forEach(el => { const v = +el.dataset.count * e; el.textContent = el.dataset.fmt === 'dec' ? n1(v) : n(v); });
      if (k < 1) requestAnimationFrame(fr);
    };
    requestAnimationFrame(fr);
  }

  /* ------------------------------------------------------------ montagem */
  let root, tip, sig = '', busy = false;
  function render(force) {
    const c = P(); if (!c || !c.rows || !root) return;
    const s = c.rows.length + '|' + c.rows.filter(r => r['Seleção Prévia'] === 'SELECIONADO PREVIAMENTE').length + '|' + (c.state && c.state.storageStatus || '');
    if (!force && s === sig) return; sig = s;
    const S = compute(), M = modules(S), hidden = new Set(ls.get(LS_HIDE, [])), tabs = new Set(ls.get(LS_TAB, [])), open = ls.get(LS_OPEN, true);
    root.classList.toggle('closed', !open);
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const first = !root.dataset.anim;
    root.classList.toggle('pvs-anim', first || !!force && force !== 'quiet');
    root.innerHTML = `
      <div class="pvs-top">
        <div class="pvs-hero">
          <button type="button" class="pvs-chev" data-pvs="toggle" aria-expanded="${open}" title="${open ? 'Recolher' : 'Expandir'} panorama">›</button>
          <div><small><i class="pvs-live"></i>Panorama estatístico · ao vivo</small><h2>Indicadores do acervo</h2>
          <p>${n(S.total)} processos no banco mestre · calculado às ${hora}</p></div>
        </div>
        <div class="pvs-chips" role="group" aria-label="Módulos visíveis"><span class="pvs-chips-l">Módulos</span>${MODULES.map(([id, l]) => `<button type="button" class="pvs-chip ${hidden.has(id) ? '' : 'on'}" data-pvs="mod" data-id="${id}" aria-pressed="${!hidden.has(id)}">${esc(l)}</button>`).join('')}</div>
      </div>
      <div class="pvs-body">
        ${kpis(S)}
        ${insights(S)}
        <div class="pvs-grid">${MODULES.filter(([id]) => !hidden.has(id)).map(([id, l], k) => {
          const m = M[id], t = tabs.has(id);
          return `<section class="pvs-mod s${m.span}" data-mod="${id}" style="animation-delay:${k * 45}ms">
            <header><div><h3>${esc(l)}</h3><p>${m.sub}</p></div>
              <div class="pvs-mod-act"><div class="pvs-seg2"><button type="button" data-pvs="tab" data-id="${id}" class="${t ? '' : 'on'}" ${t ? '' : 'disabled'}>Gráfico</button><button type="button" data-pvs="tab" data-id="${id}" class="${t ? 'on' : ''}" ${t ? 'disabled' : ''}>Tabela</button></div>
              <button type="button" class="pvs-x" data-pvs="hide" data-id="${id}" title="Ocultar módulo" aria-label="Ocultar módulo">×</button></div></header>
            ${m.head || ''}<div class="pvs-mod-body">${t ? m.table : m.body}</div></section>`;
        }).join('')}</div>
        <p class="pvs-foot">Calculado no navegador a partir do banco do acervo · atualiza sozinho quando os dados mudam · passe o mouse nos gráficos para ver os valores.</p>
      </div>`;
    if (first) { root.dataset.anim = '1'; countUp(root); }
  }

  function onClick(e) {
    const b = e.target.closest('[data-pvs]'); if (!b) return;
    const a = b.dataset.pvs, id = b.dataset.id;
    if (a === 'toggle') { ls.set(LS_OPEN, !ls.get(LS_OPEN, true)); }
    if (a === 'mod' || a === 'hide') { const h = new Set(ls.get(LS_HIDE, [])); if (a === 'mod' && h.has(id)) h.delete(id); else h.add(id); ls.set(LS_HIDE, [...h]); }
    if (a === 'tab') { const t = new Set(ls.get(LS_TAB, [])); t.has(id) ? t.delete(id) : t.add(id); ls.set(LS_TAB, [...t]); }
    render('quiet');
  }
  function onMove(e) {
    const el = e.target.closest('[data-tip]');
    if (!el || !root.contains(el)) { tip.classList.remove('show'); return; }
    tip.innerHTML = el.getAttribute('data-tip'); tip.classList.add('show');
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = e.clientX + 14, y = e.clientY - h - 12;
    if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y < 8) y = e.clientY + 16;
    tip.style.transform = `translate(${x}px,${y}px)`;
  }

  function mount() {
    const c = P(), main = document.querySelector('main'); if (!c || !main) return;
    const isCentral = c.state && c.state.tab === 'central';
    if (!root) {
      root = document.createElement('section'); root.id = 'pv-stats'; root.className = 'pvs';
      root.addEventListener('click', onClick); root.addEventListener('mousemove', onMove); root.addEventListener('mouseleave', () => tip.classList.remove('show'));
      tip = document.createElement('div'); tip.className = 'pvs-tip'; document.body.appendChild(tip);
    }
    const header = main.querySelector(':scope > header');
    const anchor = main.querySelector('.central-stats-stack, .central-stats-grid');
    let before = anchor; while (before && before.parentElement !== main) before = before.parentElement;
    if (before) { const nx = root.nextElementSibling; if (nx !== before && !(nx && nx.id === 'cmt-fases' && nx.nextElementSibling === before)) { main.insertBefore(root, before); sig = ''; } }
    else if (header && root.previousElementSibling !== header && !root.isConnected) { header.after(root); sig = ''; }
    root.hidden = !isCentral;
    if (isCentral && !busy) { busy = true; try { render(false); } finally { busy = false; } }
  }
  setInterval(mount, 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) mount(); });
})();
