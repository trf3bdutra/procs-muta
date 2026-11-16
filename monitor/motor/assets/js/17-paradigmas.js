
/* paradigmas.js — biblioteca comum de leitura da base gabcmt (padrão 1.x).
   Funciona no navegador (<script src=".../padrao/paradigmas.js">  → window.Paradigmas)
   e no Node 18+ (const Paradigmas = require("./padrao/paradigmas.js")).

   const base = Paradigmas.criar();            // lê do GitHub Pages, com alternativas (raw, CDN)
   await base.carregar();                       // manifesto + precedentes + modelos + referências
   base.colecao({ assunto: "Apreensão", tema: "locadora" })  // monta a coleção na hora
   await base.inteiroTeor("acd-…-ap");          // busca o texto integral só quando pedido

   Regra de compatibilidade: o app declara a versão maior que entende (padrão 1). Se o manifesto
   trouxer outra versão maior, carregar() falha com mensagem clara em vez de ler dados errados.
*/
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.Paradigmas = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const VERSAO_MAIOR = 1;
  const FONTES_PADRAO = [
    "https://brndutra.github.io/gabcmt/",
    "https://raw.githubusercontent.com/brndutra/gabcmt/main/",
    "https://cdn.jsdelivr.net/gh/brndutra/gabcmt@main/",
  ];

  const sem = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const contem = (alvo, termo) => !termo || sem(alvo).includes(sem(termo));
  const linhas = (txt) => txt.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

  function criar(opcoes = {}) {
    const fontes = opcoes.fontes || (opcoes.base ? [opcoes.base] : FONTES_PADRAO);
    const lerTexto = opcoes.ler || (async (rel) => {
      let erro;
      for (const f of fontes) {
        try {
          const r = await fetch(f + rel + (f.startsWith("http") ? `?t=${Date.now()}` : ""), { cache: "no-store" });
          if (r.ok) return await r.text();
          erro = `HTTP ${r.status} em ${f}${rel}`;
        } catch (e) { erro = e.message; }
      }
      throw new Error(`Não consegui ler ${rel}: ${erro}`);
    });

    const estado = { manifesto: null, precedentes: [], porId: new Map(), modelos: [], paragrafos: [], citacoes: [],
                     diretrizes: [], assuntos: [], temas: [], magistrados: [], textos: new Map() };

    async function carregar() {
      const man = JSON.parse(await lerTexto("padrao/manifesto.json"));
      const maior = parseInt(String(man.versao).split(".")[0], 10);
      if (maior !== VERSAO_MAIOR) throw new Error(`Base no padrão ${man.versao}; esta biblioteca lê o padrão ${VERSAO_MAIOR}.x.`);
      const json = async (rel) => JSON.parse(await lerTexto(rel));
      const [prec, mod, par, cit, dir, ass, mag] = await Promise.all([
        lerTexto("precedentes/precedentes.jsonl").then(linhas), json("modelos/modelos.json"),
        json("modelos/paragrafos.json"), json("apoio/repertorio.json"),
        json("apoio/diretrizes.json"), json("apoio/assuntos.json"),
        json("apoio/magistrados.json").catch(() => ({ registros: [] })),
      ]);
      Object.assign(estado, { manifesto: man, precedentes: prec, porId: new Map(prec.map((p) => [p.id, p])),
        modelos: mod.registros, paragrafos: par.registros, citacoes: cit.registros, diretrizes: dir.registros,
        assuntos: ass.registros, temas: ass.temas || [], magistrados: mag.registros });
      return api;
    }

    // filtro comum: assunto, tema (em temas, catalogação ou rótulo), texto livre, período e status
    function filtrar(lista, f = {}) {
      return lista.filter((x) => {
        if (f.assunto && sem(x.assunto) !== sem(f.assunto) && !contem(x.assunto, f.assunto)) return false;
        if (f.tema) {
          const alvo = [x.temas, x.tema, x.titulo, x.catalogacao && x.catalogacao.temaRotulo,
            x.catalogacao && x.catalogacao.temaSugerido, x.catalogacao && x.catalogacao.temaId].join(" | ");
          if (!contem(alvo, f.tema)) return false;
        }
        if (f.de && (x.dataJulgamento || x.dataReferencia || "") < f.de) return false;
        if (f.ate && (x.dataJulgamento || x.dataReferencia || "9999") > f.ate) return false;
        if (f.especie && x.especie !== f.especie && x.especieModelo !== f.especie) return false;
        if (f.status && !(x.curadoria && x.curadoria.status === f.status)) return false;
        if (f.texto && !contem(JSON.stringify(x), f.texto)) return false;
        return true;
      });
    }

    async function inteiroTeor(id) {
      if (estado.textos.has(id)) return estado.textos.get(id);
      const p = estado.porId.get(id);
      if (!p || !p.inteiroTeor) return null;
      const ano = (p.dataJulgamento || "semdata").slice(0, 4) || "semdata";
      for (const t of linhas(await lerTexto(`precedentes/inteiros-teores/${ano}.jsonl`))) estado.textos.set(t.id, t.inteiroTeor);
      return estado.textos.get(id) || null;
    }

    const api = {
      carregar, inteiroTeor,
      get manifesto() { return estado.manifesto; },
      precedentes: (f) => filtrar(estado.precedentes, f),
      precedente: (id) => estado.porId.get(id) || null,
      porProcesso: (proc) => estado.precedentes.filter((p) => p.processo === proc),
      modelos: (f) => filtrar(estado.modelos, f),
      paragrafos: (f) => filtrar(estado.paragrafos, f),
      citacoes: (f = {}) => filtrar(estado.citacoes, f).filter((c) => (!f.categoria || c.categoria === f.categoria) && (!f.origem || c.origem === f.origem)),
      diretrizes: (f) => filtrar(estado.diretrizes, f),
      assuntos: () => estado.assuntos,
      temas: (assunto) => estado.temas.filter((t) => !assunto || contem(t.assunto, assunto)),
      magistrados: () => estado.magistrados,
      /** Acha o magistrado por id, nome ou qualquer grafia usada em etiquetas e acórdãos ("NEY", "Dr. Jean"…). */
      magistrado(nome) {
        const n = sem(nome).replace(/^(dr|dra|des|juiz|juiza)\.?\s+/, "").trim();
        return estado.magistrados.find((m) => m.id === nome || sem(m.nome) === n ||
          (m.aliases || []).some((a) => sem(a).replace(/^(dr|dra|des)\.?\s+/, "") === n)) || null;
      },
      /** Precedentes ligados ao magistrado: os que ele julgou em 1º grau e os de que participou no colegiado. */
      porMagistrado(nome) {
        const m = api.magistrado(nome);
        if (!m) return { magistrado: null, primeiroGrau: [], colegiado: [] };
        const nomes = [m.nome, ...(m.aliases || [])].map(sem);
        return {
          magistrado: m,
          primeiroGrau: estado.precedentes.filter((p) => p.primeiroGrau && (p.primeiroGrau.magistradoId === m.id ||
            (p.primeiroGrau.juiz && nomes.includes(sem(p.primeiroGrau.juiz))))),
          relator: estado.precedentes.filter((p) => p.relatorId === m.id),
          colegiado: estado.precedentes.filter((p) => (p.colegiado || []).includes(m.id)),
        };
      },
      /** Coleção = consulta por assunto + tema (+ período): reúne tudo o que a base tem sobre o ponto. */
      colecao(f = {}) {
        return { criterio: f, precedentes: api.precedentes(f), modelos: api.modelos(f), paragrafos: api.paragrafos(f),
                 citacoes: api.citacoes(f), diretrizes: api.diretrizes({ texto: f.tema || f.assunto }) };
      },
      buscar: (texto) => api.colecao({ texto }),
    };
    return api;
  }

  /* ---------- formato antigo (gabA.*) ⇄ padrão 1.0: para os apps em transição (Construtor) e para gerar.py --importar ----------
     Espelha precedente_antigo/modelo_antigo de gerar.py; testes em scripts/testes/legado.js. */
  const MAPA = [["processo", "processo"], ["especie", "especie"], ["classe", "classe"], ["classeSigla", "classeSigla"],
    ["pronunciamento", "pronunciamento"], ["orgao", "orgaoJulgador"], ["assunto", "assunto"], ["assuntoOrigem", "assuntoOrigem"],
    ["temas", "temas"], ["ramoDireito", "ramoDireito"], ["ementaCabecalho", "ementaCabecalho"], ["ementa", "ementaIntegral"],
    ["resultado", "resultado"], ["dispositivosCitados", "dispositivosCitados"], ["jurisprudenciaCitada", "jurisprudenciaCitada"],
    ["fonte", "fonte"], ["urlFonte", "urlFonte"]];
  const CUR = ["tese", "fundamentacao", "causaPedir", "especificidades", "especificidadesTags", "preliminares", "honorarios",
    "parteNotavel", "papelNotavel", "processosAssociados"];
  const MV = ["formatoModelo", "nomeModelo", "textoModelo", "esqueletoModelo", "paragrafosModelo"];
  const ESP = { ApCiv: "ap", ApelRemNec: "aprn", RemNecCiv: "rn", AI: "ai", EDcl: "ed", AgInt: "agint", CCCiv: "cc", AR: "ar", MSCol: "ms", SuspApel: "susp" };
  const SUPERIORES = ["STF", "STJ", "TST", "TSE", "STM", "TNU"];
  const dmy = d => d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "";
  const isoDe = d => { const m = String(d || "").match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : (/^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d : ""); };
  const copia = x => JSON.parse(JSON.stringify(x));
  const idPrecedente = (proc, julg, esp) => `acd-${String(proc).replace(/\D/g, "")}-${julg ? julg.replace(/-/g, "") : "semdata"}-${ESP[esp] || sem(esp).replace(/[^a-z0-9]/g, "") || "x"}`;

  function precedenteAntigo(r) {
    const leg = r._legado, cur = r.curadoria || {}, mv = r.modeloVinculado || {};
    let v = { id: r.idAnterior || r.id, processo: r.processo, tipo: "Precedente",
      pronunciamento: r.pronunciamento || "", especie: r.especie || "", assunto: r.assunto || "", temas: r.temas || "",
      resultado: r.resultado || "", sessao: leg ? leg.sessao : dmy(r.dataJulgamento), fonte: r.fonte || "",
      data: leg ? leg.data : (r.dataPublicacao || ""), classe: r.classe || "", classeSigla: r.classeSigla || "",
      ementaIntegral: r.ementa || "", ementaCabecalho: r.ementaCabecalho || "", ramoDireito: r.ramoDireito || "",
      dispositivosCitados: r.dispositivosCitados || "", jurisprudenciaCitada: r.jurisprudenciaCitada || "",
      orgaoJulgador: r.orgao || "", assuntoOrigem: r.assuntoOrigem || "", statusCuradoria: cur.status || "bruto", urlFonte: r.urlFonte || "" };
    CUR.forEach(c => { v[c] = cur[c] || ""; });
    v.primeiroGrau = leg ? ((r.primeiroGrau || {}).juizo || "") : "";
    MV.forEach(c => { v[c] = mv[c] || ""; });
    if (leg) { Object.assign(v, leg.valores || {}); const o = {}; leg.campos.forEach(c => { o[c] = v[c] === undefined ? "" : v[c]; }); v = o; }
    return v;
  }
  /* registro antigo (vindo de um app) → precedente do padrão; "ex" é o precedente atual (mesmo idAnterior), se houver */
  function precedenteDeAntigo(old, ex) {
    const r = ex ? copia(ex) : { id: "", processo: old.processo, especie: "", classe: "", classeSigla: "", pronunciamento: "Voto", orgao: "",
      relator: "CARLOS MUTA", relatorId: "mag-carlos-muta", dataJulgamento: "", dataPublicacao: "", assunto: "", assuntoOrigem: "", temas: "",
      ramoDireito: "", ementaCabecalho: "", ementa: "", resultado: "", sentidoResultado: "", dispositivosCitados: "", jurisprudenciaCitada: "",
      primeiroGrau: { juizo: "", juiz: "", magistradoId: "" }, colegiado: [], curadoria: { status: "curado" }, catalogacao: {},
      inteiroTeor: false, fonte: "", urlFonte: "", idAnterior: "", origens: ["app"] };
    const leg = (ex && ex._legado) || { campos: [], sessao: "", data: "", valores: {} };
    const valores = { ...(leg.valores || {}) };
    const tem = c => Object.prototype.hasOwnProperty.call(old, c);
    const mudou = (c, novo) => { if (c in valores) { if (valores[c] === novo) return false; delete valores[c]; } return true; };
    MAPA.forEach(([n, a]) => { if (tem(a) && mudou(a, old[a])) r[n] = old[a] == null ? "" : old[a]; });
    if (tem("sessao")) r.dataJulgamento = isoDe(old.sessao);
    if (tem("data")) r.dataPublicacao = isoDe(old.data);
    r.curadoria = r.curadoria || { status: "curado" };
    CUR.forEach(c => { if (tem(c)) r.curadoria[c] = old[c] == null ? "" : old[c]; });
    if (tem("statusCuradoria") && old.statusCuradoria) r.curadoria.status = old.statusCuradoria;
    if (tem("primeiroGrau")) r.primeiroGrau = { ...(r.primeiroGrau || {}), juizo: old.primeiroGrau || "" };
    const mv = {}; MV.forEach(c => { if (old[c] != null && old[c] !== "") mv[c] = old[c]; });
    if (Object.keys(mv).length) r.modeloVinculado = mv; else delete r.modeloVinculado;
    if (!r.id) r.id = idPrecedente(r.processo, r.dataJulgamento, r.especie);
    r.idAnterior = old.id && !String(old.id).startsWith("acd-") ? old.id : (r.idAnterior || "");
    r._legado = { campos: Object.keys(old), sessao: old.sessao || "", data: old.data || "", valores };
    return r;
  }
  function modeloAntigo(m) {
    const v = {}; Object.keys(m).forEach(k => { if (!["idAnterior", "especieModelo", "dataReferencia"].includes(k)) v[k] = m[k]; });
    v.id = m.idAnterior || m.id;
    ["atualizadoEm", "historico"].forEach(c => { if (v[c] === "" || v[c] == null || (Array.isArray(v[c]) && !v[c].length)) delete v[c]; });
    return v;
  }
  function modeloDeAntigo(old, ex, quando) {
    const p = String(old.pronunciamento || "").toLowerCase();
    const especieModelo = p.startsWith("voto") ? (String(old.formatoModelo || "").toLowerCase() === "modelo-matriz" ? "voto-matriz" : "voto-padrao")
      : p.includes("despacho") ? "despacho" : "decisao";
    const igual = ex && JSON.stringify(modeloAntigo(ex)) === JSON.stringify(old);
    if (igual) return ex;
    const historico = ((ex && ex.historico) || []).concat(ex ? [{ em: quando || new Date().toISOString(), alteracao: "editado num app (formato antigo)" }] : []);
    return { ...old, idAnterior: old.id, id: ex ? ex.id : "mod-" + String(old.id).replace(/^par-(matriz-)?/, ""),
             especieModelo: ex ? ex.especieModelo : especieModelo, dataReferencia: old.data || "", atualizadoEm: quando || new Date().toISOString(), historico };
  }
  const citacaoAntiga = c => { const o = { ...c }; delete o.categoria; delete o.origem; return o; };
  const citacaoDeAntiga = (j, categoria) => ({ categoria, origem: categoria === "norma" ? "legislacao"
    : SUPERIORES.includes(String(j.tribunal || "").toUpperCase()) ? "superiores" : String(j.tribunal || "").toUpperCase() === "TRF3" ? "trf3" : "outros-tribunais", ...j });

  return { criar, VERSAO_MAIOR,
           legado: { precedenteAntigo, precedenteDeAntigo, modeloAntigo, modeloDeAntigo, citacaoAntiga, citacaoDeAntiga, idPrecedente } };
});

