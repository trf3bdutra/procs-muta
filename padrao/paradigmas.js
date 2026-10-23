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
                     diretrizes: [], assuntos: [], temas: [], textos: new Map() };

    async function carregar() {
      const man = JSON.parse(await lerTexto("padrao/manifesto.json"));
      const maior = parseInt(String(man.versao).split(".")[0], 10);
      if (maior !== VERSAO_MAIOR) throw new Error(`Base no padrão ${man.versao}; esta biblioteca lê o padrão ${VERSAO_MAIOR}.x.`);
      const json = async (rel) => JSON.parse(await lerTexto(rel));
      const [prec, mod, par, cit, dir, ass] = await Promise.all([
        lerTexto("paradigmas/precedentes.jsonl").then(linhas), json("paradigmas/modelos.json"),
        json("referencias/paragrafos.json"), json("referencias/citacoes.json"),
        json("referencias/diretrizes.json"), json("referencias/assuntos.json"),
      ]);
      Object.assign(estado, { manifesto: man, precedentes: prec, porId: new Map(prec.map((p) => [p.id, p])),
        modelos: mod.registros, paragrafos: par.registros, citacoes: cit.registros, diretrizes: dir.registros,
        assuntos: ass.registros, temas: ass.temas || [] });
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
      for (const t of linhas(await lerTexto(`paradigmas/inteiros-teores/${ano}.jsonl`))) estado.textos.set(t.id, t.inteiroTeor);
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
      /** Coleção = consulta por assunto + tema (+ período): reúne tudo o que a base tem sobre o ponto. */
      colecao(f = {}) {
        return { criterio: f, precedentes: api.precedentes(f), modelos: api.modelos(f), paragrafos: api.paragrafos(f),
                 citacoes: api.citacoes(f), diretrizes: api.diretrizes({ texto: f.tema || f.assunto }) };
      },
      buscar: (texto) => api.colecao({ texto }),
    };
    return api;
  }

  return { criar, VERSAO_MAIOR };
});
