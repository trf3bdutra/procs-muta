/* acervo-conversao.js — conversão entre a linha do Painel Central (formato gabA.acervo v2: todas as colunas + "_")
   e o acervo do padrão 1.0 (gabcmt-dados/acervo: importado + operacional).

   As regras NÃO estão aqui: vêm de acervo/correspondencias.json (o mesmo arquivo que scripts/migrar_acervo.py usa),
   para que Python e Painel nunca divirjam. Funções puras: rodam no navegador e no Node (testes).

     const { paraPadrao, paraLinha } = AcervoConversao;
     const { imp, op } = paraPadrao(registro, corr)      // registro = { id, processo, ...colunas, _: {...} }
     const registro    = paraLinha(imp, op, corr)       // volta ao formato do Painel (regras e padrões: recompute)
*/
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.AcervoConversao = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const APP = "Painel (cópia)";
  const MINUTA_PREF = ["Sentença", "Voto", "Rel ", "Rel -", "Relatório", "Sub-ementa", "Contrarrazões", "Memoriais", "Outros",
    "Outras Peças", "Recorrente", "Recurso", "Pedido recursal", "Tópico-síntese", "Adequação Ementa",
    "Formatação Subementa", "Parecer", "MPF - Sem ID", "MPF - Info"];

  const vazio = v => v == null || v === "" || (Array.isArray(v) && !v.length) ||
    (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
  const norm = x => String(x).replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
  const igual = (a, b) => norm(a) === norm(b);
  const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x)
    ? Object.keys(x).sort().reduce((o, c) => (o[c] = x[c], o), {}) : x);
  const bloco = col => col.startsWith("Rev - ") ? "revisao" : MINUTA_PREF.some(p => col.startsWith(p)) ? "minuta" : "triagem";
  const iso = v => {
    const s = String(v == null ? "" : v).trim();
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);            // m/d/aa (DAT_FIM do BI)
    if (m) return `20${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
  };
  const dataSessao = d => { const m = String(d || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : String(d || ""); };

  /* índices derivados de correspondencias.json (memorizados por objeto) */
  const cache = new WeakMap();
  function indices(corr) {
    if (cache.has(corr)) return cache.get(corr);
    const colsImp = new Set(), campoDaColuna = {};
    Object.entries(corr.importado).forEach(([campo, fs]) => fs.forEach(f => { colsImp.add(f.coluna); campoDaColuna[f.coluna] = campo; }));
    const fluxo = corr.fluxo.colunasAntigas;
    const fluxoVis = Object.keys(fluxo).filter(c => !c.startsWith("_")), fluxoTec = Object.keys(fluxo).filter(c => c.startsWith("_"));
    const pautaVis = corr.pauta.colunas.filter(c => !c.startsWith("_")), pautaTec = corr.pauta.colunas.filter(c => c.startsWith("_"));
    const meta = corr.metadadosDaImportacao || {};
    const pg = (corr.primeiroGrau && corr.primeiroGrau.colunasDoPainel) || {};
    const reservadas = new Set([...colsImp, ...Object.keys(corr.regras), ...fluxoVis, ...pautaVis, ...Object.keys(corr.descartadas), "processo"]);
    const usados = new Set([...(corr.regrasTecnicas || []), ...fluxoTec, ...pautaTec, ...Object.keys(meta), "_horaEntradaTarefa"]);
    const r = { colsImp, campoDaColuna, fluxo, fluxoVis, fluxoTec, pautaVis, pautaTec, meta, pg, reservadas, usados };
    cache.set(corr, r);
    return r;
  }

  function montarPauta(r, t) {
    const h = (t._pautaEntries || []).map(e => {
      const st = String(e.status || "").trim().toLowerCase();
      return { sessao: e.session || "", numeroPrevio: "", item: e.item || "", situacao: !st || st === "pendente" ? "pendente" : st,
               proximaSessao: e.next || "", encerrado: !!e.closed, motivo: "" };
    });
    const destino = r["Sessão Destino"] || r["Nova sessão de destino"] || "";
    if (destino && !h.some(x => x.sessao === destino))
      h.push({ sessao: destino, numeroPrevio: "", item: "", situacao: "selecionado", proximaSessao: "", encerrado: false, motivo: "", registradoPor: "selecao" });
    const alvo = h.find(x => x.sessao === destino) || h[h.length - 1];
    if (alvo) {
      if (String(r["Seleção Prévia"] || r.JULGAMENTO || "").toUpperCase() === "SELECIONADO PREVIAMENTE") alvo.situacao = "selecionado";
      alvo.numeroPrevio = r["Numeração Prévia"] || alvo.numeroPrevio;
      alvo.item = r["Item (Pauta de Julgamento)"] || alvo.item;
      alvo.motivo = r["Motivo da remarcação"] || alvo.motivo;
    }
    const datas = h.map(x => x.sessao).concat(r["Sessão original"] ? [r["Sessão original"]] : []);
    const p = {};
    if (datas.length) p.sessaoInaugural = datas.reduce((a, b) => dataSessao(b) < dataSessao(a) ? b : a);
    if (h.length) p.historico = h;
    if (!vazio(t._pautaHistory)) p.eventos = t._pautaHistory;
    if (!vazio(t._pautaIncidents)) p.incidentes = t._pautaIncidents;
    ["Sessões", "Histórico"].forEach(k => { if (!vazio(r[k])) (p.anotacoes = p.anotacoes || {})[k] = r[k]; });
    return p;
  }

  /* linha do Painel → { imp, op } (op = null quando não há nada decidido) */
  function paraPadrao(r, corr, carimbo) {
    const ix = indices(corr), t = r._ || {};
    const imp = { id: r.id, processo: r.processo }, fontes = new Set(), div = {};
    Object.entries(corr.importado).forEach(([campo, fs]) => {
      const vals = fs.filter(f => !vazio(r[f.coluna])).map(f => [f.sistema, r[f.coluna]]);
      if (!vals.length) return;
      const [, v0] = vals[0];
      imp[campo] = campo === "dataFim" || campo === "dataEntradaTarefa" ? iso(v0) : v0;
      if (campo === "dataEntradaTarefa") { const h = String(v0).match(/\s(\d{2}:\d{2}(?::\d{2})?)$/); if (h) imp.horaEntradaTarefa = h[1]; else if (t._horaEntradaTarefa) imp.horaEntradaTarefa = t._horaEntradaTarefa; }
      vals.forEach(([s]) => { if (s !== APP) fontes.add(s); });
      vals.slice(1).forEach(([s, v]) => { if (s !== APP && !igual(v, v0)) (div[campo] = div[campo] || {})[s] = v; });
    });
    imp.fontes = [...fontes].sort();
    Object.entries(ix.meta).forEach(([k, campo]) => { if (!vazio(t[k])) imp[campo] = t[k]; });
    if (Object.keys(div).length) imp.divergencias = div;
    imp.atualizadoEm = carimbo || r.atualizado_em || "";

    const op = {};
    Object.keys(r).forEach(col => {
      const v = r[col];
      if (col === "_" || col === "id" || ix.reservadas.has(col) || vazio(v) || corr.padroes[col] === v) return;
      if (col === "Preparo" && v === "AJG" && t._preparoAJG) return;
      if (ix.pg[col]) { ((op.triagem = op.triagem || {}).primeiroGrau = op.triagem.primeiroGrau || {})[ix.pg[col]] = v; return; }
      (op[bloco(col)] = op[bloco(col)] || {})[col] = v;
    });
    const fl = {};
    Object.entries(ix.fluxo).forEach(([col, caminho]) => {
      const v = col.startsWith("_") ? t[col] : r[col];
      if (vazio(v)) return;
      const [a, b] = caminho.split(".");
      if (b) (fl[a] = fl[a] || {})[b] = v; else fl[a] = v;
    });
    if (Object.keys(fl).length) op.fluxo = fl;
    const pa = montarPauta(r, t);
    if (Object.keys(pa).length) op.pauta = pa;
    const tec = {};
    Object.keys(t).forEach(k => {
      if (ix.usados.has(k) || vazio(t[k])) return;
      if (k in corr.padroesTecnicos && canon(t[k]) === canon(corr.padroesTecnicos[k])) return;
      tec[k] = t[k];
    });
    if (Object.keys(tec).length) op.tecnico = tec;
    return { imp, op: Object.keys(op).length ? { id: r.id, processo: r.processo, ...op, atualizadoEm: carimbo || r.atualizado_em || "" } : null };
  }

  /* { imp, op } → linha do Painel (sem as colunas de regra nem os valores-padrão: o Painel recalcula) */
  function paraLinha(imp, op, corr) {
    const ix = indices(corr), r = { id: imp.id, processo: imp.processo }, t = {};
    const fontes = new Set(imp.fontes || []), div = imp.divergencias || {};
    Object.entries(corr.importado).forEach(([campo, fs]) => {
      if (vazio(imp[campo])) return;
      fs.forEach(f => {
        if (f.sistema !== APP && !fontes.has(f.sistema)) return;
        r[f.coluna] = div[campo] && div[campo][f.sistema] != null ? div[campo][f.sistema] : imp[campo];
      });
    });
    Object.entries(ix.meta).forEach(([k, campo]) => { if (imp[campo] !== undefined) t[k] = imp[campo]; });
    if (imp.horaEntradaTarefa) t._horaEntradaTarefa = imp.horaEntradaTarefa;
    op = op || {};
    ["triagem", "minuta", "revisao"].forEach(b => Object.entries(op[b] || {}).forEach(([col, v]) => {
      if (col === "primeiroGrau" && v && typeof v === "object") {
        Object.entries(ix.pg).forEach(([coluna, campo]) => { if (!vazio(v[campo])) r[coluna] = v[campo]; });
        return;
      }
      r[col] = v;
    }));
    Object.entries(ix.fluxo).forEach(([col, caminho]) => {
      const [a, b] = caminho.split("."), base = (op.fluxo || {})[a];
      const v = b ? base && typeof base === "object" ? base[b] : undefined : base;
      if (vazio(v)) return;
      if (col.startsWith("_")) t[col] = v; else r[col] = v;
    });
    const pa = op.pauta || {};
    if (pa.historico) {
      t._pautaEntries = pa.historico.filter(x => x.registradoPor !== "selecao").map(x => ({
        session: x.sessao, item: x.item || "", status: x.situacao === "pendente" || x.situacao === "selecionado" ? "PENDENTE" : String(x.situacao).toUpperCase(),
        next: x.proximaSessao || "", closed: !!x.encerrado }));
      const sel = pa.historico.filter(x => x.situacao === "selecionado").pop();
      if (sel) { r["Sessão Destino"] = sel.sessao; r["Seleção Prévia"] = "SELECIONADO PREVIAMENTE"; r.JULGAMENTO = "SELECIONADO PREVIAMENTE"; }
      const alvo = sel || pa.historico[pa.historico.length - 1];
      if (alvo) {
        if (alvo.numeroPrevio) r["Numeração Prévia"] = alvo.numeroPrevio;
        if (alvo.item && !t._pautaEntries.some(e => e.item)) r["Item (Pauta de Julgamento)"] = alvo.item;
        if (alvo.motivo) r["Motivo da remarcação"] = alvo.motivo;
      }
    }
    if (pa.sessaoInaugural) r["Sessão original"] = pa.sessaoInaugural;
    if (pa.eventos) t._pautaHistory = pa.eventos;
    if (pa.incidentes) t._pautaIncidents = pa.incidentes;
    Object.entries(pa.anotacoes || {}).forEach(([k, v]) => { r[k] = v; });
    Object.assign(t, op.tecnico || {});
    if (Object.keys(t).length) r._ = t;
    r.atualizado_em = [imp.atualizadoEm, op.atualizadoEm].filter(Boolean).sort().pop() || "";
    return r;
  }

  /* produtividade derivada do fluxo: um registro por etapa com data (ids estáveis, prefixo "fluxo-") */
  function produtividade(op, imp, corr) {
    const tipos = { minutado: "minuta", corrigido: "correcao", refinado: "revisao", conferido: "revisao" };
    const out = [], fl = (op && op.fluxo) || {};
    Object.entries(tipos).forEach(([etapa, tipo]) => {
      const e = fl[etapa]; if (!e || typeof e !== "object") return;
      const data = String(e.data || "").slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
      const servidor = e.servidor || e.corretor || e.responsavel || (etapa === "minutado" ? fl.responsavel : "") || "";
      let t = tipo;
      const tv = String(((op.triagem || {})["Tipo de Voto"]) || "").toLowerCase();
      if (etapa === "minutado" && /monocr/.test(tv)) t = "mono"; else if (etapa === "minutado" && /despacho/.test(tv)) t = "despacho";
      out.push({ id: `fluxo-${etapa}-${String(imp.processo).replace(/\D/g, "")}-${data}`, origem: "fluxo", servidor, data, tipo: t,
                 processo: imp.processo, sessao: e.sessao || "", classe: imp.classe || "", assunto: imp.assunto || "",
                 natureza: etapa, quantidade: 1 });
    });
    return out;
  }

  return { paraPadrao, paraLinha, produtividade, _interno: { iso, bloco, montarPauta, canon } };
});
