/* Busca por magistrado no Painel Central (padrão 1.0).
   Cadastro único: gabcmt/referencias/magistrados.json (nome, cargo, atuação e as grafias usadas em etiquetas e acórdãos).
   Mostra, para o magistrado escolhido:
     · no acervo: processos com impedimento/suspeição por etiqueta e processos em que ele é o juiz de 1º grau
       (coluna "Juiz de 1º grau" da triagem);
     · nos paradigmas: precedentes que relatou, de que participou no colegiado ou que sentenciou em 1º grau
       (biblioteca comum padrao/paradigmas.js, carregada só na primeira busca).
   Também resolve "Juiz de 1º grau" → magistradoId ao gravar no repositório. */
(function () {
  "use strict";
  if (window.__acvMagistrados) return;
  const PUB = ["https://brndutra.github.io/gabcmt/", "https://raw.githubusercontent.com/brndutra/gabcmt/main/", "https://cdn.jsdelivr.net/gh/brndutra/gabcmt@main/"];
  const sem = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^(dr|dra|des|juiz|juiza)\.?\s+/, "").trim();
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let cadastro = null, base = null, ultimo = "", resultado = null, carregando = false;

  async function lerPub(rel) {
    let erro = "";
    for (const f of PUB) { try { const r = await fetch(f + rel + (f.includes("jsdelivr") ? "" : "?t=" + Date.now()), { cache: "no-store" }); if (r.ok) return await r.json(); erro = "HTTP " + r.status; } catch (e) { erro = e.message; } }
    throw new Error(`${rel}: ${erro}`);
  }
  async function carregarCadastro() { if (!cadastro) cadastro = (await lerPub("referencias/magistrados.json")).registros || []; return cadastro; }
  function achar(nome) {
    const n = sem(nome); if (!n || !cadastro) return null;
    return cadastro.find(m => m.id === nome || sem(m.nome) === n || (m.aliases || []).some(a => sem(a) === n)) || null;
  }
  /* etiquetas "Impedimento Dr. Ney Gustavo", "IMPEDIMENTO - DR. JEAN", "Suspeição Dr. Jean"… */
  function restricoes(r) {
    const tags = String(r.etiquetas || r.Etiquetas || "").split(/\s*,\s*/).concat(String(r["Impedimento / Suspeição"] || ""));
    const out = [];
    tags.forEach(t => { const m = t.match(/^(impedimento|suspei[cç][aã]o)\s*(?:[-—]\s*)?(?:dr\.?\s*)?(.+)$/i); if (m) { const mg = achar(m[2]); if (mg) out.push({ tipo: /^imp/i.test(m[1]) ? "impedimento" : "suspeição", id: mg.id }); } });
    return out;
  }

  async function buscar(nome) {
    ultimo = nome; carregando = true; desenhar();
    try {
      await carregarCadastro();
      const m = achar(nome);
      if (!m) { resultado = { erro: `"${nome}" não está no cadastro de magistrados.` }; return; }
      const c = window.__painelCentralComponent, rows = (c && c.rows) || [];
      const acervo = [];
      rows.forEach(r => {
        const motivos = restricoes(r).filter(x => x.id === m.id).map(x => x.tipo);
        const j1 = achar(r["Juiz de 1º grau"]); if (j1 && j1.id === m.id) motivos.push("juiz de 1º grau");
        if (motivos.length) acervo.push({ processo: r.Processo || r.processo, motivos: [...new Set(motivos)], assunto: r.assunto_judicial || r.Assunto || "", juizo: r["Juízo de 1º grau"] || "" });
      });
      if (!base && window.Paradigmas) { base = window.Paradigmas.criar(); await base.carregar(); }
      const prec = base ? base.porMagistrado(m.id) : { relator: [], colegiado: [], primeiroGrau: [] };
      resultado = { m, acervo, prec };
    } catch (e) { resultado = { erro: e.message || String(e) }; }
    finally { carregando = false; desenhar(); }
  }

  function lista(itens, fmt, max = 60) {
    if (!itens.length) return '<div class="mg-v">nenhum</div>';
    return "<ul>" + itens.slice(0, max).map(fmt).join("") + "</ul>" + (itens.length > max ? `<div class="mg-v">… e mais ${itens.length - max}</div>` : "");
  }
  /* o diálogo do acervo é redesenhado pelo runtime do painel; por isso a busca abre num painel próprio, fora dele */
  function corpoHtml() {
    if (carregando) return '<div class="mg-v">Buscando…</div>';
    if (!resultado) return '<div class="mg-v">Digite um nome ou a grafia usada na etiqueta.</div>';
    if (resultado.erro) return `<div class="mg-v">${esc(resultado.erro)}</div>`;
    const { m, acervo, prec } = resultado, p = x => `<li><b>${esc(x.processo)}</b> · ${esc(x.especie || "")} · j. ${esc(x.dataJulgamento || "—")} · ${esc((x.ementaCabecalho || "").slice(0, 110))}</li>`;
    return `<div class="mg-h">${esc(m.nome)} · ${esc(m.cargo)}</div>
      <div class="mg-t">No acervo (${acervo.length})</div>${lista(acervo, x => `<li><b>${esc(x.processo)}</b> · ${esc(x.motivos.join(", "))}${x.juizo ? " · " + esc(x.juizo) : ""} · ${esc(x.assunto)}</li>`)}
      <div class="mg-t">Precedentes em que foi juiz de 1º grau (${prec.primeiroGrau.length})</div>${lista(prec.primeiroGrau, p)}
      <div class="mg-t">Precedentes em que votou no colegiado (${prec.colegiado.length})</div>${lista(prec.colegiado, p, 20)}
      ${prec.relator.length ? `<div class="mg-t">Precedentes como relator: ${prec.relator.length}</div>` : ""}
      <div class="mg-v">O juiz de 1º grau vem da coluna "Juiz de 1º grau" (triagem) e, nos precedentes, do inteiro teor. Etiquetas de impedimento e suspeição são resolvidas pelo cadastro único de magistrados.</div>`;
  }
  function desenhar() {
    const el = document.getElementById("acv-mag");
    if (el && !el.querySelector("[data-mag]")) el.innerHTML = '<button type="button" data-mag="abrir" class="full">⌕ MAGISTRADOS · 1º GRAU E COLEGIADO</button>';
    const caixa = document.getElementById("acv-mag-caixa"); if (caixa) caixa.querySelector(".mg-r").innerHTML = corpoHtml();
  }
  function abrir() {
    if (document.getElementById("acv-mag-caixa")) return;
    const bg = document.createElement("div"); bg.className = "acv-modal"; bg.id = "acv-mag-caixa";
    bg.innerHTML = `<form class="acv-box mg-caixa"><h3>Magistrados</h3>
      <div class="mg-f"><input name="q" placeholder="Nome ou grafia da etiqueta (ex.: NEY, Dr. Jean)" value="${esc(ultimo)}"><button type="submit">Buscar</button></div>
      <div class="mg-r"></div><div class="acv-acoes"><button type="button" data-fechar>Fechar</button></div></form>`;
    document.body.appendChild(bg);
    bg.querySelector(".mg-r").innerHTML = corpoHtml();
    const fechar = () => bg.remove();
    bg.querySelector("[data-fechar]").onclick = fechar;
    bg.addEventListener("mousedown", e => { if (e.target === bg) fechar(); });
    bg.querySelector("form").onsubmit = e => { e.preventDefault(); const v = e.target.q.value.trim(); if (v) buscar(v); };
    setTimeout(() => bg.querySelector("input").focus(), 30);
  }
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest('[data-mag="abrir"]'); if (b) { e.preventDefault(); abrir(); } }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { const c = document.getElementById("acv-mag-caixa"); if (c) { e.stopPropagation(); c.remove(); } } }, true);
  const css = document.createElement("style");
  css.textContent = `#acv-mag{margin-top:10px}#acv-mag button{width:100%}
.mg-caixa{max-width:760px!important;max-height:90vh;overflow:auto}.mg-caixa .mg-f{display:flex;gap:6px;margin:8px 0}.mg-caixa .mg-f input{flex:1}
.mg-caixa .mg-f button{padding:7px 14px;border-radius:7px;border:1px solid #1b3553;background:#1b3553;color:#fff;cursor:pointer;font:inherit}
.mg-caixa .mg-h{font-weight:800;margin:8px 0 2px}.mg-caixa .mg-t{font-size:11px;font-weight:800;color:#4c5b6b;margin-top:10px}
.mg-caixa ul{margin:4px 0;padding-left:18px;max-height:200px;overflow:auto;font-size:12px}.mg-caixa .mg-v{font-size:11px;color:#7e8b99;margin-top:6px}`;
  document.head.appendChild(css);

  window.__acvMagistrados = { desenhar, buscar, carregarCadastro, achar, restricoes };
})();
