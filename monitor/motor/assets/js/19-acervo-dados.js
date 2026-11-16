

/* Acervo do gabinete — padrão 1.0 · repositório PRIVADO brndutra/gabcmt-dados
     acervo/importado.json     dados dos sistemas (PJe 2G, BI), um campo por informação
     acervo/operacional.json   o que o gabinete decide (triagem, minuta, revisão, fluxo, pauta)
     trabalho.json             estado geral do painel e configuração do gabinete (sessões, equipe, calendário)
     produtividade/registros.json   derivada das etapas do fluxo (registros "fluxo-…")
   A conversão linha do painel ⇄ padrão é feita por AcervoConversao (scripts/painel/acervo-conversao.js), com as regras
   de acervo/correspondencias.json — as mesmas da migração em Python.
   Leitura e escrita exigem o token do repositório privado (Contents: read/write); ele pode ficar só na aba
   ou ser lembrado neste navegador.
   Injetado no Painel Central por scripts/painel/montar.py. Abaixo, a descrição do formato de linha (v2), que segue
   sendo o formato interno do painel e o das exportações .json/.html:

   Formato 2 (espelho do painel): o banco guarda o Acervo Central como ele está no navegador —
   - cada processo com TODAS as colunas (dados das planilhas e controles de trabalho: etiquetas atuais, Tema,
     Especificidades, Síntese Processual, complexidade, servidor, regularidade, voto, seleção, pauta…) e, no campo
     "_", o estado interno da linha (triagem, escaninho, ordem da seleção, participações em pauta, histórico,
     intercorrências, etiquetas convertidas/removidas…);
   - em "painel", o estado geral: sessões e seus marcos, equipe, calendário, escaninhos, configuração de colunas…;
   - em "colunas", a lista completa das colunas do Acervo Central (é também o cabeçalho de banco/acervo.csv, a
     planilha legível que o GitHub mostra como tabela).
   Sincronização: cada edição salva carimba o processo (atualizado_em); ao SALVAR e após cada importação o painel
   encaminha ao GitHub (um commit com acervo.json e acervo.csv); ao abrir, traz do GitHub o que for mais recente.
   Por processo (e para o estado geral), prevalece a versão mais recente.
   Saneamento (repositório público): campos de celular, telefone, e-mail e CPF não saem do navegador, em nenhum nível.
   Os sigilosos entram: a planilha de origem já mascara as informações sigilosas (###). */
(function () {
  "use strict";
  if (window.__acervoGitHub) return;

  const GH = { dono: "trf3bdutra", repo: "procs-muta", ramo: "main", pasta: "acervo", arquivo: "fonte.json", planilha: "fonte.csv" };
  const ARQ = { importado: "acervo/importado.json", operacional: "acervo/operacional.json", corr: "acervo/correspondencias.json",
                trabalho: "trabalho.json", produtividade: "produtividade/registros.json" };
  const PUB = { dono: "trf3bdutra", repo: "procs-muta", ramo: "main" };
  const LS_TOKEN = "procsmuta_token";
  const Conv = () => window.AcervoConversao;
  const SCHEMA = "gabA.acervo", VERSAO = 2;
  const SANEAMENTO = "Acervo do gabinete no repositório privado (padrão 1.0: importado + operacional). Sem celulares, telefones, e-mails e CPF. Processos sigilosos incluídos: as informações sigilosas já vêm mascaradas (###) na planilha de origem.";
  const LS_AUTO = "acv_gh_auto", LS_PAINEL = "acv_gh_painel";

  /* ---------- campos ---------- */
  /* formato 1 (antigo): só os dados de origem — usados para ler bancos anteriores */
  const ACERVO_COLUMNS = ["processo","classe_judicial","assunto_judicial","data_distribuição","tarefa_atual","data_entrada_tarefa","prioridade","etiquetas","polo_ativo","advogado_pa","polo_passivo","advogado_pp","dpu","mpf","valor_causa","ultimo_movimento","dt_distribuicao_1g"];
  const GAB_ACERVO_COLUMNS = ["Ano","Mês","Processo","Gabinete","Julgador_Colegiado","Data_Distribuição","Código_Classe","Classe","Código_Assunto_Principal","Assunto_Principal","Assuntos_do_Processo","Pendente_1Julgamento","Conclusão?","Data_Conclusão","Data_Fase","Fase","Complemento","Última_Movimentação","Data_Última_Movimentação","Tempo_de_Tramitação","Polo_Ativo","Polo_Passivo","Seção de Origem","Valor_da_Causa","etiquetas","tarefa_atual","DAT_FIM","NUM_CPF_MAGIST","SIN_PRAZO_LEGAL","SIN_SECRETARIA","SIN_CONTADORIA","SIN_REM_EXTERNA","SIN_UFOR","BASE","K_TEMPO"];
  const GAB_SIGILOSOS_COLUMNS = ["Ano","Mês","Processo","Gabinete","Julgador_Colegiado","Nível_Sigilo","Data_Distribuição","Tempo_Última_Movimentação","DAT_FIM","NUM_CPF_MAGIST","SIN_PEND_1JULG","SIN_CLS","SIN_PRAZO_LEGAL","SIN_SECRETARIA","SIN_CONTADORIA","SIN_REM_EXTERNA","SIN_UFOR","BASE","DES_ULTIMA_MOVIME_SIGILO","K_TEMPO"];
  const CAMPOS_V1 = new Set([...ACERVO_COLUMNS, ...GAB_ACERVO_COLUMNS, ...GAB_SIGILOSOS_COLUMNS, "Consta_Acervo_Gab_A", "Consta_Acervo_Sigiloso", "Assunto", "Etiquetas Originais"].filter(c => !/^etiquetas$/i.test(c)));
  const SENSIVEL = /celular|telefone|fone|whats|e-?mail|cpf|token|senha|password/i;
  const META = new Set(["id", "processo", "atualizado_em", "_"]);
  /* estado só deste navegador (nunca vai para o banco) */
  const LOCAL = new Set(["_acervoSync", "_acervoHash", "_acervoPend"]);

  const txt = v => String(v == null ? "" : v).trim();
  const procId = v => txt(v).replace(/\D/g, "");
  const agora = () => new Date().toISOString();
  const esc = s => txt(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sim = v => /^(sim|s|true|1|x)$/i.test(txt(v));
  const vazio = v => v == null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && !Object.keys(v).length);

  function sigiloso(r) {
    if (sim(r.Consta_Acervo_Sigiloso)) return true;
    for (const k of Object.keys(r)) {
      if (!/sigil|segredo/i.test(k) || /^consta_acervo/i.test(k)) continue;
      const v = txt(r[k]);
      if (v && !/^(0|n[aã]o|nao|n|false|p[uú]blico|-)$/i.test(v)) return true;
    }
    return false;
  }
  /* cópia profunda sem chaves sensíveis (em qualquer nível) */
  function limpar(v, completo) {
    if (v == null) return v;
    if (v instanceof Date) return isNaN(v) ? "" : v.toISOString();
    if (v instanceof Set) return [...v].map(x => limpar(x, completo));
    if (Array.isArray(v)) return v.map(x => limpar(x, completo));
    if (typeof v === "object") { const o = {}; Object.keys(v).forEach(k => { if (!completo && SENSIVEL.test(k)) return; const x = limpar(v[k], completo); if (x !== undefined) o[k] = x; }); return o; }
    if (typeof v === "function") return undefined;
    return typeof v === "string" ? v : v;
  }
  /* registro do banco a partir de uma linha do Acervo Central: todas as colunas + estado interno em "_" */
  function registroDe(r, completo) {
    const proc = txt(r.Processo || r.processo), p = procId(proc);
    if (p.length < 15) return null;
    const o = { id: "acv-" + p, processo: proc }, interno = {};
    Object.keys(r).sort().forEach(k => {
      if (k === "Processo" || META.has(k) || LOCAL.has(k) || (!completo && SENSIVEL.test(k))) return;
      const v = r[k]; if (v === undefined || typeof v === "function") return;
      if (k.startsWith("_")) { interno[k] = limpar(v, completo); return; } // estado interno vai inteiro (inclusive listas vazias)
      if (vazio(v)) return;
      o[k] = typeof v === "string" ? v.trim() : limpar(v, completo);
    });
    if (Object.keys(interno).length) o._ = interno;
    o.atualizado_em = r._acervoSync || "";
    return o;
  }
  /* impressão digital da linha (para saber o que mudou desde a última sincronização) */
  function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + ":" + s.length; }
  const hashLinha = r => fnv(JSON.stringify(r, (k, v) => LOCAL.has(k) ? undefined : v instanceof Set ? [...v] : v));

  /* ---------- estado geral do painel ---------- */
  function painelDados(c) {
    return limpar({
      sessionDetails: c.sessionDetails,
      subjectCatalog: c.subjectCatalog, subjectRamos: c.subjectRamos, subjectManual: c.subjectManual, assignmentRules: c.assignmentRules,
      prePanelState: { ...(c._prePanelState || {}), calendar: undefined }, columnConfig: c.columnConfig, selectionLayoutVersion: 4,
      centralKnownColumns: [...(c.centralKnownColumns || [])], gabSourceColumns: [...(c.gabSourceColumns || [])], deletedTags: c.deletedTags,
      escaninhos: Array.isArray(c.escaninhos) ? c.escaninhos.filter(e => !e.virtual) : []
    });
  }
  const lerPainelLocal = () => { try { return JSON.parse(localStorage.getItem(LS_PAINEL) || "{}"); } catch (e) { return {}; } };
  const gravarPainelLocal = v => { try { localStorage.setItem(LS_PAINEL, JSON.stringify(v)); } catch (e) {} };

  /* ---------- colunas e planilha ---------- */
  function colunasDe(c, regs) {
    const vistas = new Set(); regs.forEach(r => Object.keys(r).forEach(k => { if (!META.has(k)) vistas.add(k); }));
    const ordem = ["Processo", ...((c && c.columnConfig && c.columnConfig.central) || []), ...((c && c.centralKnownColumns) || []), ...[...vistas].sort((a, b) => a.localeCompare(b, "pt-BR"))];
    return [...new Set(ordem)].filter(k => k && !k.startsWith("_") && !SENSIVEL.test(k) && !META.has(k));
  }
  function csv(doc) {
    const cols = doc.colunas && doc.colunas.length ? doc.colunas : ["Processo"];
    const cel = v => { let s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const linhas = [[...cols, "atualizado_em"].map(cel).join(",")];
    doc.registros.forEach(r => linhas.push([...cols.map(k => k === "Processo" ? (r.Processo || r.processo) : r[k]), r.atualizado_em].map(cel).join(",")));
    return linhas.join("\r\n") + "\r\n";
  }

  /* ---------- mescla (mesma regra de scripts/banco/importar.py) ---------- */
  function mesclar(remotos, locais, opts = {}) {
    const rem = new Map(remotos.filter(r => r && r.id).map(r => [r.id, r]));
    const mapa = opts.substituir ? new Map() : new Map(rem);
    let novos = 0, alterados = 0;
    locais.forEach(l => {
      const r = rem.get(l.id);
      if (!r) { mapa.set(l.id, l); novos++; return; }
      const usar = txt(l.atualizado_em) >= txt(r.atualizado_em) ? l : r;
      mapa.set(l.id, usar);
      if (usar === l && JSON.stringify(l) !== JSON.stringify(r)) alterados++;
    });
    (opts.remover || []).forEach(id => mapa.delete(id));
    const registros = [...mapa.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    return { registros, novos, alterados };
  }
  function documento(registros, extra = {}) {
    const t = agora();
    return { schema: SCHEMA, schema_versao: VERSAO, versao: t.slice(0, 10), atualizado_em: t, saneamento: SANEAMENTO, ...extra, registros };
  }
  /* um registro por linha: diffs legíveis no GitHub */
  function serializar(doc) {
    const cab = Object.entries(doc).filter(([k]) => k !== "registros").map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
    const regs = doc.registros.map(r => "    " + JSON.stringify(r));
    return "{\n" + cab.join(",\n") + ',\n  "registros": [\n' + regs.join(",\n") + (regs.length ? "\n" : "") + "  ]\n}\n";
  }

  const NO_SITE = /^https?:$/.test(location.protocol) && /(^|\.)github\.io$/i.test(location.hostname);
  /* ---------- leitura (repositório privado, pela API, com token) ---------- */
  async function lerArquivo(caminho) {
    const bruto = await gh(`contents/${caminho}?ref=${GH.ramo}`, {}, "application/vnd.github.raw+json");
    if (bruto == null) return null;
    return JSON.parse(bruto);
  }
  let CORR = null;
  async function correspondencias() { if (!CORR) { CORR = await lerArquivo(ARQ.corr); if (!CORR) throw new Error("acervo/correspondencias.json não encontrado"); } return CORR; }
  /* ---------- operacional (procs-muta): seções da Ficha ⇄ linha do painel ---------- */
  const OPER_CAMPOS = {
    origem: ["Sentença - Decisão","Sentença - ID","Sentença - Honorários","Sentença - Custas","Sentença - Resultado","Sentença - Fundamento","Sentença - Providências","Contrarrazões - Situação","Responsável","Próxima ação","Observações"],
    triagem: ["Triado em","Urgência","Urgência - Observação","Tempest - Publicação","Tempest - Protocolo","Tempest - Prazo legal","Tempest - Dobro","Tempest - Suspensões","Urgência - Nível","Urgência - Apreciação","Urgência - Data","Urgência - Painel","Tipo de Julgamento","Hipóteses Monocrática","Tempestividade","Preparo","AJG","DPU (controle)","Representação","ID da Procuração","Impedimento / Suspeição","Observação do Impedimento","Regularidade","Regularidade Manual","Observação da Representação","MPF","MPF - Custos Legis","ID do Parecer MPF","Parecer - Sentido","MPF - Info adicional","Observação MPF","Tema","COMPLEXIDADE","Tipo de Voto","Prelim.","Descrição da Preliminar","META","Seleção Prévia","Mídias","Etiquetas","Alegações","O que falta sanar","Intercorrências","Síntese Processual","Especificidades"],
    producao: ["Destino","SERVIDOR","MINUTADO","Refinado","CORRETOR","CORRIGIDO","Data da Revisão","LIBERADO","Data da Liberação","Rev - Atenção","Tópico-síntese","Rev - Ementa","Rev - Subementa","Rev - IDs","Rev - Mérito","Rev - Honorários","Rev - Nota de atenção","Assinado","Data da Assinatura","Decisão - ID","Publicado","Relatório Padronizado","Adequação Ementa","Formatação Subementa","Voto - Resultado","Voto - Honorários","Mídias Necessárias","Voto - Descrição"],
    pauta: ["Status de Julgamento","Sessão original","Item (Pauta de Julgamento)","Nova sessão de destino","JULGAMENTO","Motivo da remarcação"]
  };
  const OPER_SECOES = ["origem","triagem","producao","pauta"];
  const operVazio = v => v == null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
  const operDig = v => String(v || "").replace(/\D/g, "");
  /* operacional (nomes da Ficha) → linha do painel (nomes do app) */
  function operParaLinha(row, o) {
    if (!o) return row;
    OPER_SECOES.forEach(s => Object.entries(o[s] || {}).forEach(([k, v]) => { if (k !== "sessoes" && !operVazio(v)) row[k] = v; }));
    if (row["Nova sessão de destino"] && !row["Sessão Destino"]) row["Sessão Destino"] = row["Nova sessão de destino"];
    if (row.COMPLEXIDADE && !row.Dificuldade) row.Dificuldade = row.COMPLEXIDADE;
    if (row.Preparo === "Dispensado" && (String(row.AJG).toLowerCase() === "sim" || String(row["DPU (controle)"]).toLowerCase() === "sim")) row.Preparo = "AJG";
    const tipo = row["Impedimento / Suspeição"];
    if (tipo && !/ — /.test(tipo)) {
      row._restricaoTipo = row._restricaoTipo || tipo; row._magistradoRestricao = row["Observação do Impedimento"] || row._magistradoRestricao || "";
      row["Impedimento / Suspeição"] = row._magistradoRestricao ? `${tipo} — ${row._magistradoRestricao}` : tipo;
    }
    if (o.origem && o.origem.baixado) row._baixado = true;
    if (o.pauta && Array.isArray(o.pauta.sessoes)) row._operSessoes = o.pauta.sessoes;
    return row;
  }
  /* linha do painel → valor de cada campo da Ficha (para gravar no operacional) */
  function linhaParaOper(row) {
    const v = k => row[k] == null ? "" : row[k], out = {};
    OPER_SECOES.forEach(s => { out[s] = {}; OPER_CAMPOS[s].forEach(k => { out[s][k] = v(k); }); });
    out.pauta["Nova sessão de destino"] = v("Sessão Destino") || v("Nova sessão de destino");
    out.triagem.COMPLEXIDADE = v("Dificuldade") || v("COMPLEXIDADE");
    if (out.triagem.Preparo === "AJG") out.triagem.Preparo = "Dispensado";
    if (row._restricaoTipo !== undefined) { out.triagem["Impedimento / Suspeição"] = row._restricaoTipo || ""; out.triagem["Observação do Impedimento"] = row._restricaoTipo && !/^\//.test(row._magistradoRestricao || "") ? (row._magistradoRestricao || "") : ""; }
    else { const m = String(v("Impedimento / Suspeição")).split(" — "); out.triagem["Impedimento / Suspeição"] = m[0] || ""; if (m[1]) out.triagem["Observação do Impedimento"] = m[1]; }
    const PADRAO = { Tempestividade: "Não Verificado", Representação: "Não Verificado", Preparo: "Não Verificado", MPF: "Não se Aplica", Mídias: "Não se Aplica", "Status de Julgamento": "PENDENTE" };
    Object.entries(PADRAO).forEach(([k, p]) => OPER_SECOES.forEach(s => { if (out[s][k] === p) out[s][k] = ""; }));
    OPER_SECOES.forEach(s => Object.keys(out[s]).forEach(k => { const x = out[s][k]; out[s][k] = typeof x === "string" ? x : x === true ? "Sim" : x === false ? "" : x; }));
    return out;
  }
  /* grava no acervo/operacional.json o que mudou nas linhas (um commit) */
  async function operGravar(rows) {
    if (!window.ProcsMuta || !window.ProcsMuta.gravar) throw new Error("gravação no procs-muta indisponível nesta página");
    const op = JSON.parse(await window.ProcsMuta.ler("acervo/operacional.json"));
    if (!op || !Array.isArray(op.registros)) throw new Error("acervo/operacional.json ilegível");
    const por = new Map(op.registros.map(r => [operDig(r.processo), r])), agora = new Date().toISOString();
    let mud = 0, novos = 0;
    (rows || []).forEach(row => {
      if (!row || !row.Processo) return;
      const d = operDig(row.Processo), novo = linhaParaOper(row);
      let r = por.get(d);
      const temAlgo = OPER_SECOES.some(s => Object.values(novo[s]).some(x => !operVazio(x)));
      if (!r) { if (!temAlgo) return; r = { processo: row.Processo, origem: { atualizado_em: agora }, triagem: {}, producao: {}, pauta: { sessoes: [] } }; op.registros.push(r); por.set(d, r); novos++; }
      let alterou = false;
      OPER_SECOES.forEach(s => { r[s] = r[s] || {}; Object.entries(novo[s]).forEach(([k, x]) => { const atual = r[s][k] == null ? "" : r[s][k]; if (JSON.stringify(atual) !== JSON.stringify(x)) { r[s][k] = x; alterou = true; } }); });
      if (alterou) { r.origem.atualizado_em = agora; mud++; }
    });
    if (!mud) return { mud: 0, novos: 0 };
    op.registros.sort((a, b) => String(a.processo).localeCompare(String(b.processo)));
    op.atualizado_em = agora;
    await window.ProcsMuta.gravar({ "acervo/operacional.json": JSON.stringify(op, null, 1) + "\n" }, `Ab Initio: triagem de ${mud} processo(s) gravada no operacional`);
    return { mud, novos };
  }
  window.CMTOperacional = { campos: OPER_CAMPOS, paraLinha: operParaLinha, paraOper: linhaParaOper, gravar: operGravar };
  /* o acervo inteiro no formato de linha do painel (v2), montado a partir de importado + operacional */
  async function lerRemoto() {
    /* procs-muta: o acervo fonte vem pronto em acervo/fonte.json (gabA.acervo v2), atualizado pelo DataJud e pelas planilhas */
    const doc = await lerArquivo(`${GH.pasta}/${GH.arquivo}`);
    if (!doc || !Array.isArray(doc.registros)) throw new Error(`${GH.pasta}/${GH.arquivo} não encontrado no procs-muta`);
    let oper = null; try { oper = await lerArquivo("acervo/operacional.json"); } catch (e) { console.warn("[operacional]", e); }
    if (oper && Array.isArray(oper.registros) && oper.schema_versao >= 2) {
      const por = new Map(oper.registros.map(r => [operDig(r.processo), r]));
      doc.registros.forEach(row => operParaLinha(row, por.get(operDig(row.processo || row.Processo))));
    }
    const painel = doc.painel && doc.painel.dados ? doc.painel : oper && oper.painel && oper.painel.dados ? oper.painel : null;
    return { schema: SCHEMA, schema_versao: VERSAO, atualizado_em: doc.atualizado_em || "", registros: doc.registros,
             painel, _trabalho: {}, _imp: null, _op: null };
  }


  /* ---------- escrita (API do GitHub, token só na memória da aba) ---------- */
  let TOKEN = (() => { try { return sessionStorage.getItem(LS_TOKEN) || localStorage.getItem(LS_TOKEN) || ""; } catch (e) { return ""; } })();
  function b64(str) {
    const bytes = new TextEncoder().encode(str); let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  async function gh(caminho, opts = {}, accept = "application/vnd.github+json") {
    if (!TOKEN && window.ProcsMuta) TOKEN = await window.ProcsMuta.token("Para ler o acervo do gabinete.");
    if (!TOKEN) { const e = new Error("sem token de acesso ao repositório privado do gabinete"); e.status = 401; throw e; }
    const url = `https://api.github.com/repos/${GH.dono}/${GH.repo}/${caminho}`;
    const r = await fetch(url + (opts.method && opts.method !== "GET" ? "" : (url.includes("?") ? "&" : "?") + "t=" + Date.now()), {
      ...opts, cache: "no-store",
      headers: { Accept: accept, Authorization: "Bearer " + TOKEN, "X-GitHub-Api-Version": "2022-11-28", ...(opts.body ? { "Content-Type": "application/json" } : {}), ...(opts.headers || {}) }
    });
    if (r.status === 404 && (!opts.method || opts.method === "GET")) return null;
    const corpo = accept.includes("raw") && r.ok ? await r.text() : await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((corpo && corpo.message) || "HTTP " + r.status); e.status = r.status; throw e; }
    return corpo;
  }
  /* um commit com vários arquivos (API Git Data: aceita arquivos grandes) */
  async function commitar(arquivos, mensagem) {
    throw Object.assign(new Error('O envio antigo do painel (gabcmt-dados) está desligado. Sessões, designações e regras são gravadas na área Sessões.'), { status: 0 });
    const ref = await gh(`git/ref/heads/${GH.ramo}`); if (!ref) throw new Error(`ramo ${GH.ramo} não encontrado`);
    const base = ref.object.sha, commit = await gh(`git/commits/${base}`);
    const tree = [];
    for (const [caminho, conteudo] of arquivos) {
      const blob = await gh("git/blobs", { method: "POST", body: JSON.stringify({ content: b64(conteudo), encoding: "base64" }) });
      tree.push({ path: caminho, mode: "100644", type: "blob", sha: blob.sha });
    }
    const arvore = await gh("git/trees", { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
    if (arvore.sha === commit.tree.sha) return null;
    const novo = await gh("git/commits", { method: "POST", body: JSON.stringify({ message: mensagem, tree: arvore.sha, parents: [base] }) });
    await gh(`git/refs/heads/${GH.ramo}`, { method: "PATCH", body: JSON.stringify({ sha: novo.sha, force: false }) });
    return novo.sha;
  }
  function pedirToken(motivo) {
    return new Promise(res => {
      if (TOKEN) { res(TOKEN); return; }
      const bg = document.createElement("div"); bg.className = "acv-modal";
      bg.innerHTML = `<form class="acv-box"><h3>Gravar no repositório do gabinete</h3>
        <p>${esc(motivo || "")} Informe o <b>token de acesso</b> do repositório privado <code>${GH.dono}/${GH.repo}</code> (permissão <i>Contents</i>: leitura e escrita).</p>
        <input type="password" autocomplete="off" placeholder="github_pat_…" required>
        <label style="display:flex;gap:7px;margin-top:9px;font-size:12px"><input type="checkbox" data-lembrar style="width:auto"> Lembrar neste navegador (só use em computador do gabinete)</label>
        <div class="acv-acoes"><button type="button" data-n>Agora não</button><button type="submit" class="acv-pri">Encaminhar</button></div></form>`;
      document.body.appendChild(bg);
      const fim = v => { bg.remove(); res(v); };
      bg.querySelector("[data-n]").onclick = () => { ST.recusado = true; fim(""); };
      bg.addEventListener("mousedown", e => { if (e.target === bg) { ST.recusado = true; fim(""); } });
      bg.querySelector("form").onsubmit = e => { e.preventDefault(); const v = bg.querySelector("input[type=password]").value.trim(); if (v) { TOKEN = v; ST.recusado = false; if (bg.querySelector("[data-lembrar]").checked) { try { localStorage.setItem(LS_TOKEN, v); } catch (er) {} } } fim(v); };
      setTimeout(() => bg.querySelector("input").focus(), 30);
    });
  }

  /* ---------- ponte com o Painel Central ---------- */
  const comp = () => window.__painelCentralComponent;
  const pronto = c => c && Array.isArray(c.rows) && !c._exclusive && !(c.state && c.state.storageBusy);
  const ST = { total: null, versao: "", lidoEm: "", erro: "", enviando: false, pendentes: 0, ultimoEnvio: "", recusado: false };
  function avisar(msg, tipo) { try { comp().notify(msg, tipo); } catch (e) { console.log("[acervo]", msg); } desenhar(); }

  /* carimbo: toda linha alterada desde a última leitura recebe atualizado_em = agora (roda a cada gravação do painel) */
  function normalizar(c) { c.rows.forEach(r => { try { c.syncJudgment(r); r["Seção Competente"] = c.secaoCompetente(r); r["Ramo"] = c.ramoAssunto(r); } catch (e) {} }); }
  function carimbar(c) {
    const t = agora(); let n = 0;
    normalizar(c);
    c.rows.forEach(r => {
      const h = hashLinha(r);
      if (r._acervoHash === undefined) { r._acervoHash = h; return; }
      if (r._acervoHash !== h) { r._acervoHash = h; r._acervoSync = t; r._acervoPend = true; }
      if (r._acervoPend) n++;
    });
    const pl = lerPainelLocal(), hp = fnv(JSON.stringify(painelDados(c)));
    if (!pl.hash) gravarPainelLocal({ ...pl, hash: hp });
    else if (pl.hash !== hp) gravarPainelLocal({ ...pl, hash: hp, sync: t, pend: true });
    ST.pendentes = n + (lerPainelLocal().pend ? 1 : 0);
    return ST.pendentes;
  }
  function locaisParaBanco(c) {
    const regs = [];
    c.rows.forEach(r => { const reg = registroDe(r); if (reg) regs.push(reg); });
    return { regs, sigilosos: [] };
  }

  /* aplica um registro do banco numa linha do painel */
  function aplicarV1(c, r, rec, completo) {
    Object.keys(rec).forEach(k => { if (!META.has(k) && CAMPOS_V1.has(k) && (completo || !SENSIVEL.test(k)) && k !== "Etiquetas Originais") r[k] = rec[k]; });
    try { c.applyCanonicalSource(r, rec, sigiloso(rec) ? "sigilosos" : "acervo"); } catch (e) { console.warn(e); }
    if (txt(rec["Etiquetas Originais"])) { try { c.setImportedTags(r, rec["Etiquetas Originais"], r._tagOriginalSource || "acervo"); } catch (e) { r["Etiquetas Originais"] = rec["Etiquetas Originais"]; } }
  }
  function aplicarV2(c, r, rec) {
    // o registro do banco é a linha inteira: o que não veio nele fica vazio (exceto campos sensíveis, que nunca saem daqui)
    Object.keys(r).forEach(k => { if (k === "Processo" || LOCAL.has(k) || SENSIVEL.test(k)) return; delete r[k]; });
    Object.keys(rec).forEach(k => { if (!META.has(k)) r[k] = JSON.parse(JSON.stringify(rec[k])); });
    if (rec._ && typeof rec._ === "object") Object.keys(rec._).forEach(k => { if (!LOCAL.has(k)) r[k] = JSON.parse(JSON.stringify(rec._[k])); });
    r.Processo = txt(rec.processo) || r.Processo; if (!txt(r.processo)) r.processo = r.Processo;
  }

  /* mescla um documento gabA.acervo no Acervo Central */
  async function receber(doc, origem) {
    const c = comp(); if (!pronto(c)) throw new Error("O painel ainda está carregando; tente de novo em instantes.");
    const regs = Array.isArray(doc) ? doc : (doc && Array.isArray(doc.registros) ? doc.registros : null);
    if (!regs) throw new Error("O arquivo não contém um banco gabA.acervo (lista \"registros\").");
    if (doc.schema && doc.schema !== SCHEMA) throw new Error(`Banco de outro tipo (${doc.schema}); esperado ${SCHEMA}.`);
    const completo = !!(doc && doc.completo), v2 = Number(doc && doc.schema_versao) >= 2;
    const mapa = new Map(c.rows.map(r => [procId(r.Processo || r.processo), r]).filter(x => x[0]));
    let criados = 0, atualizados = 0, iguais = 0, ignorados = 0, geral = false;
    const tocados = [];
    for (const rec of regs) {
      const proc = txt(rec && (rec.processo || rec.Processo)), p = procId(proc);
      if (p.length < 15) { ignorados++; continue; }
      let r = mapa.get(p);
      const novo = !r;
      if (!novo && !(txt(rec.atualizado_em) > txt(r._acervoSync))) { iguais++; continue; }
      if (novo) { r = c.ensureShape({ Processo: proc, processo: proc }); c.rows.push(r); mapa.set(p, r); }
      const antes = novo ? "" : hashLinha(r);
      if (v2) aplicarV2(c, r, rec); else aplicarV1(c, r, rec, completo);
      r._acervoSync = txt(rec.atualizado_em) || agora(); r._acervoPend = false;
      tocados.push(r);
      if (novo) criados++; else if (hashLinha(r) !== antes) atualizados++; else iguais++;
    }
    // estado geral (sessões, equipe, escaninhos, calendário, colunas…): vale o mais recente
    if (v2 && doc.painel && doc.painel.dados) {
      const pl = lerPainelLocal();
      if (txt(doc.painel.atualizado_em) > txt(pl.sync)) {
        try {
          const d = JSON.parse(JSON.stringify(doc.painel.dados));
          // sessões, equipe e calendário não vêm daqui: são do arquivo do gabinete
          c.restoreSnapshot({ ...d, rows: c.rows, names: c.names, sessions: c.sessions, globalSettings: c.globalSettings, teamProfiles: c.teamProfiles, prePanelState: { ...(d.prePanelState || {}), calendar: (c._prePanelState || {}).calendar } });
          if (GST.doc) impor(c, GST.doc);
          geral = true;
        } catch (e) { console.warn("[acervo] painel", e); }
        gravarPainelLocal({ sync: doc.painel.atualizado_em, hash: fnv(JSON.stringify(painelDados(c))), pend: false });
      }
    }
    if (criados || atualizados || geral) {
      c.rows = c.rows.map(r => c.ensureShape(r));
      tocados.forEach(r => { try { c.recompute(r); } catch (e) {} r._acervoHash = hashLinha(r); });
      if (geral) gravarPainelLocal({ ...lerPainelLocal(), hash: fnv(JSON.stringify(painelDados(c))) });
      await c.saveDB(); c.refresh();
    } else tocados.forEach(r => { r._acervoHash = hashLinha(r); });
    const msg = `Banco do acervo (${origem}): ${criados} novo(s) · ${atualizados} atualizado(s) · ${iguais} já em dia` + (ignorados ? ` · ${ignorados} ignorado(s)` : "") + (geral ? " · sessões, equipe, escaninhos e configurações atualizados" : "") + ".";
    return { criados, atualizados, iguais, ignorados, geral, msg };
  }

  async function puxar(silencioso) {
    ST.erro = "";
    try {
      if (!TOKEN) { const tok = await pedirToken(silencioso ? "Para abrir o acervo do gabinete, conecte o repositório privado." : ""); if (!tok) throw new Error("repositório privado não conectado"); }
      const doc = await lerRemoto();
      ST.total = (doc.registros || []).length; ST.versao = doc.atualizado_em || doc.versao || ""; ST.lidoEm = agora();
      const r = await receber(doc, "repositório");
      if (!silencioso || r.criados || r.atualizados || r.geral) avisar(r.msg, "ok"); else desenhar();
      return r;
    } catch (e) {
      ST.erro = e.message || String(e);
      if (!silencioso) avisar("Banco do acervo no repositório: " + ST.erro, "warn"); else desenhar();
      return null;
    }
  }

  window.CMTAcervoDados = { puxar: s => puxar(s), estado: () => ({ total: ST.total, erro: ST.erro, lidoEm: ST.lidoEm, versao: ST.versao }) };
  async function encaminhar(opts = {}) {
    const c = comp(); if (!pronto(c)) return avisar("O painel ainda está carregando; tente de novo em instantes.", "warn");
    if (ST.enviando) return;
    if (opts.silencioso) { desenhar(); return; }
    return avisar("O envio antigo do painel está desligado: o acervo vem do DataJud e das planilhas, e sessões e regras são gravadas na área Sessões.", "warn");
    if (opts.silencioso && ST.recusado && !TOKEN) { desenhar(); return; }
    const tok = await pedirToken(opts.motivo); if (!tok) { desenhar(); return; }
    ST.enviando = true; desenhar();
    try {
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        carimbar(c);
        const remoto = await lerRemoto(), corr = await correspondencias();
        // traz primeiro o que estiver mais recente no repositório (outro computador), depois grava a união
        if (remoto.registros.length || remoto.painel) await receber(remoto, "repositório");
        carimbar(c);
        const { regs } = locaisParaBanco(c), t = agora();
        regs.forEach(r => { if (!r.atualizado_em) r.atualizado_em = t; });
        const remotos = remoto.registros;
        const m = mesclar(remotos, regs, { substituir: !!opts.substituir });
        const removidos = remotos.length + m.novos - m.registros.length;
        const pl = lerPainelLocal(), localPainel = { atualizado_em: pl.sync || t, dados: painelDados(c) };
        const painel = remoto.painel && txt(remoto.painel.atualizado_em) > txt(localPainel.atualizado_em) ? remoto.painel : localPainel;
        // linha do painel → importado + operacional (mantém correções e divergências já registradas)
        const impAnt = new Map((((remoto._imp || {}).registros) || []).map(i => [i.id, i]));
        const MG = window.__acvMagistrados; try { MG && await MG.carregarCadastro(); } catch (e) {}
        const imps = [], ops = [];
        m.registros.forEach(rec => {
          const { imp, op } = Conv().paraPadrao(rec, corr, rec.atualizado_em);
          const ant = impAnt.get(imp.id);
          if (ant && ant.correcoes) { const t2 = imp.atualizadoEm; delete imp.atualizadoEm; imp.correcoes = ant.correcoes; imp.atualizadoEm = t2; }
          const pg = op && op.triagem && op.triagem.primeiroGrau;
          if (pg && pg.juiz && MG) { const mg = MG.achar(pg.juiz); if (mg) pg.magistradoId = mg.id; }
          imps.push(imp); if (op) ops.push(op);
        });
        const igual = JSON.stringify(imps) === JSON.stringify((remoto._imp || {}).registros || []) && JSON.stringify(ops) === JSON.stringify((remoto._op || {}).registros || []) && JSON.stringify(painel) === JSON.stringify(remoto.painel);
        if (igual) {
          c.rows.forEach(r => { r._acervoPend = false; }); gravarPainelLocal({ ...lerPainelLocal(), pend: false });
          ST.total = remotos.length; ST.pendentes = 0;
          if (!opts.silencioso) avisar(`Nada a encaminhar: o repositório já está igual a este painel (${remotos.length} processos).`, "ok"); else desenhar();
          return;
        }
        const env = (schema, regs2, extra) => JSON.stringify({ schema, versao: "1.0.0", atualizadoEm: t, ...(extra || {}), registros: regs2 }, null, 1) + "\n";
        const linhas = (schema, regs2) => "{\n \"schema\": " + JSON.stringify(schema) + ",\n \"versao\": \"1.0.0\",\n \"atualizadoEm\": " + JSON.stringify(t) + ",\n \"registros\": [\n" + regs2.map(x => "  " + JSON.stringify(x)).join(",\n") + "\n ]\n}\n";
        // relê o trabalho.json logo antes de gravar: o servidor (Replit) grava "sessoes" e "servidores" no mesmo arquivo
        const trabAtual = (await lerArquivo(ARQ.trabalho)) || remoto._trabalho || {};
        const trab = { ...trabAtual, schema: "gabcmt.trabalho", versao: "1.0.0", atualizadoEm: t, painel };
        // produtividade: registros "fluxo-…" refeitos a partir do fluxo; os demais (lançados à mão) ficam como estão
        const prodAnt = (await lerArquivo(ARQ.produtividade)) || { registros: [] };
        const prodFluxo = []; const impPorId = new Map(imps.map(i => [i.id, i]));
        ops.forEach(o => Conv().produtividade(o, impPorId.get(o.id) || o, corr).forEach(x => prodFluxo.push(x)));
        const prodRegs = [...(prodAnt.registros || []).filter(x => !String(x.id || "").startsWith("fluxo-")), ...prodFluxo];
        const prod = { ...prodAnt, atualizadoEm: t, registros: prodRegs, totais: { registros: prodRegs.length, servidores: new Set(prodRegs.map(x => x.servidor)).size } };
        // quantos processos mudaram de fato no formato do repositório (não na linha do painel, que tem as colunas de regra)
        const semData = x => { const o = { ...x }; delete o.atualizadoEm; return JSON.stringify(o); };
        const impRem = new Map((((remoto._imp || {}).registros) || []).map(x => [x.id, semData(x)]));
        const opRem = new Map((((remoto._op || {}).registros) || []).map(x => [x.id, semData(x)]));
        const opLoc = new Map(ops.map(x => [x.id, semData(x)]));
        const mudaram = imps.filter(i => impRem.get(i.id) !== semData(i) || (opLoc.get(i.id) || null) !== (opRem.get(i.id) || null)).length;
        m.alterados = Math.max(0, mudaram - m.novos);
        const msgCommit = `Painel Central: acervo (${m.novos} novo(s), ${m.alterados} atualizado(s)${removidos > 0 ? `, ${removidos} removido(s)` : ""} · ${m.registros.length} processos, ${ops.length} com trabalho registrado)`;
        try {
          await commitar([[ARQ.importado, linhas("gabcmt.acervo.importado", imps)], [ARQ.operacional, linhas("gabcmt.acervo.operacional", ops)],
                          [ARQ.trabalho, JSON.stringify(trab, null, 1) + "\n"], [ARQ.produtividade, JSON.stringify(prod, null, 2) + "\n"]], msgCommit);
        }
        catch (e) { if ([409, 422].includes(e.status) && tentativa < 2) continue; throw e; }
        c.rows.forEach(r => { r._acervoPend = false; }); gravarPainelLocal({ ...lerPainelLocal(), pend: false });
        ST.total = m.registros.length; ST.pendentes = 0; ST.ultimoEnvio = t;
        ST.versao = t;
        avisar(`Repositório do gabinete atualizado: ${m.novos} novo(s) · ${m.alterados} atualizado(s)${removidos > 0 ? ` · ${removidos} removido(s)` : ""} · ${m.registros.length} processos (importado + operacional), produtividade do fluxo e estado do painel.`, "ok");
        return;
      }
    } catch (e) {
      if (e.status === 401 || e.status === 403) TOKEN = "";
      avisar("Falha ao gravar no repositório: " + (e.message || e), "err");
    } finally { ST.enviando = false; desenhar(); }
  }

  /* ================= Gabinete: sessões, calendário e equipe vêm do repositório (banco/gabinete.json) =================
     O painel só lê: as abas de configuração ficam em modo consulta. Exceção: início da produção, entrega das minutas
     e liberação, alterados na Seleção Prévia, são gravados no repositório na hora. */
  const GAB = { arquivo: "gabinete.json", schema: "gabA.gabinete" };
  const MARCOS_EDITAVEIS = ["prepStart", "minutasDeadline", "releaseDeadline"];
  const MARCOS = ["date", "pautaDeadline", "prepStart", "minutasDeadline", "releaseDeadline", "minutasMode", "releaseMode", "gabinete", "observations"];
  const LOCAL_SERVIDOR = ["profile", "logs", "daily", "personal", "photo"];
  const GST = { doc: null, versao: "", lidoEm: "", erro: "", enviando: false, aplicando: false, pendente: null };
  let applyOriginal = null;
  async function lerGabinetePublico() {
    const trab = await lerArquivo(ARQ.trabalho);
    if (!trab || !trab.gabinete) throw new Error("o trabalho.json ainda não tem a configuração do gabinete (sessões, equipe, calendário)");
    return trab.gabinete;
  }
  const servidorPublico = m => { const o = {}; Object.keys(m || {}).forEach(k => { if (!LOCAL_SERVIDOR.includes(k) && !SENSIVEL.test(k)) o[k] = limpar(m[k]); }); if (Array.isArray(o.absences)) o.absences = o.absences.map(a => ({ from: a.from || a.start || "", to: a.to || a.end || "", ...(a.type ? { type: a.type } : {}), ...(a.kind ? { kind: a.kind } : {}) })); return o; };
  /* configuração global do painel com os dados do repositório por cima (preserva o que é só deste navegador) */
  function configComGabinete(c, doc) {
    const cfg = c.globalConfigSnapshot(), sd = {};
    const sessoes = (doc.sessoes || []).map(s => s && (s.nome || s.name)).filter(Boolean);
    sessoes.forEach(nome => { const s = doc.sessoes.find(x => (x.nome || x.name) === nome) || {}; const base = cfg.sessionDetails[nome] || {}; sd[nome] = { ...base }; MARCOS.forEach(k => { sd[nome][k] = s[k] == null ? "" : s[k]; }); });
    const equipe = doc.equipe || {}, locais = (cfg.team && cfg.team.members) || [];
    const membros = (doc.servidores || []).map(m => { const l = locais.find(x => x.id === m.id) || locais.find(x => String(x.name).toLowerCase() === String(m.name).toLowerCase()) || {}; const o = { ...m }; LOCAL_SERVIDOR.forEach(k => { if (l[k] !== undefined) o[k] = l[k]; }); if (!Array.isArray(o.functions)) o.functions = []; if (!Array.isArray(o.absences)) o.absences = []; return o; });
    return { ...cfg, sessions: sessoes, sessionDetails: sd, workCalendar: { weekdays: (doc.calendario && doc.calendario.weekdays) || [1, 2, 3, 4, 5], excluded: (doc.calendario && doc.calendario.excluded) || [] },
      names: [...new Set([...(doc.nomes || []), ...membros.map(m => m.name)])], team: { ...(cfg.team || {}), ...equipe, members: membros, catalog: equipe.catalog || (cfg.team && cfg.team.catalog) || [], subjects: equipe.subjects || (cfg.team && cfg.team.subjects) || [] } };
  }
  function impor(c, doc) {
    if (!doc || !c || GST.aplicando) return false;
    GST.aplicando = true;
    try { (applyOriginal || c.applyGlobalConfig).call(c, configComGabinete(c, doc)); return true; }
    catch (e) { GST.erro = "configuração do gabinete inválida: " + (e.message || e); console.warn("[gabinete]", e); return false; }
    finally { GST.aplicando = false; }
  }
  function sincronizarConfiguracoes() { try { const f = document.getElementById("global-config-frame"), app = f && f.contentWindow && f.contentWindow.PautaApp; if (app && app._configModalOpen && app.loadDB) app.loadDB(); } catch (e) {} }
  async function puxarGabinete(silencioso) {
    const c = comp(); GST.erro = "";
    try {
      const doc = await lerGabinetePublico();
      if (doc.schema && doc.schema !== GAB.schema) throw new Error(`arquivo de outro tipo (${doc.schema})`);
      GST.doc = doc; GST.versao = doc.atualizado_em || ""; GST.lidoEm = agora();
      if (pronto(c) && impor(c, doc)) { sincronizarConfiguracoes(); if (!silencioso) avisar(`Sessões, calendário e equipe atualizados conforme o repositório (${(doc.sessoes || []).length} sessões, ${(doc.servidores || []).length} servidores).`, "ok"); }
      return doc;
    } catch (e) { GST.erro = e.message || String(e); if (!silencioso) avisar("Configurações do gabinete: " + GST.erro, "warn"); return null; }
    finally { desenhar(); }
  }
  /* marcos editáveis na Seleção Prévia: grava no repositório assim que mudam */
  function marcosAlterados(c) {
    const doc = GST.doc; if (!doc || !Array.isArray(doc.sessoes)) return [];
    const mud = [];
    doc.sessoes.forEach(s => { const nome = s.nome || s.name, m = (c.sessionDetails || {})[nome]; if (!m) return; MARCOS_EDITAVEIS.forEach(k => { const v = txt(m[k]); if (v !== txt(s[k])) mud.push({ nome, k, v }); }); });
    return mud;
  }
  let marcoTimer = null;
  function marcoEditado(c, s, k, v) {
    if (!MARCOS_EDITAVEIS.includes(k) || !GST.doc || !Array.isArray(GST.doc.sessoes)) return;
    const reg = GST.doc.sessoes.find(x => (x.nome || x.name) === s); if (!reg || txt(reg[k]) === txt(v)) return;
    agendarMarcos(c, [{ nome: s, k, v: txt(v) }]);
  }
  function agendarMarcos(c, mud) {
    mud = mud || marcosAlterados(c); if (!mud.length) return;
    mud.forEach(({ nome, k, v }) => { const s = GST.doc.sessoes.find(x => (x.nome || x.name) === nome); if (s) s[k] = v; }); // otimista: o painel não volta atrás
    GST.pendente = [...(GST.pendente || []), ...mud];
    clearTimeout(marcoTimer); marcoTimer = setTimeout(() => enviarMarcos(), 900);
  }
  const ROT = { prepStart: "início da produção", minutasDeadline: "entrega das minutas", releaseDeadline: "liberação" };
  async function enviarMarcos() {
    const lista = GST.pendente || []; if (!lista.length || GST.enviando) return;
    const tok = await pedirToken("Os marcos da sessão foram alterados e serão gravados no repositório do gabinete."); if (!tok) { avisar("Marcos alterados só neste navegador: sem acesso de escrita ao repositório.", "warn"); return; }
    GST.enviando = true; desenhar();
    try {
      for (let t = 0; t < 3; t++) {
        const trab = await lerArquivo(ARQ.trabalho);
        if (!trab || !trab.gabinete) throw new Error("o repositório ainda não tem a configuração do gabinete em trabalho.json");
        const doc = trab.gabinete; let n = 0;
        lista.forEach(({ nome, k, v }) => { const s = (doc.sessoes || []).find(x => (x.nome || x.name) === nome); if (s && txt(s[k]) !== v) { s[k] = v; n++; } });
        if (!n) { GST.pendente = null; GST.doc = doc; return; }
        doc.atualizado_em = agora();
        const sessoes = [...new Set(lista.map(x => x.nome))];
        try { await commitar([[ARQ.trabalho, JSON.stringify({ ...trab, gabinete: doc, atualizadoEm: agora() }, null, 1) + "\n"]], `Seleção Prévia: marcos de ${sessoes.join(", ")} (${[...new Set(lista.map(x => ROT[x.k]))].join(", ")})`); }
        catch (e) { if ([409, 422].includes(e.status) && t < 2) continue; throw e; }
        GST.doc = doc; GST.versao = doc.atualizado_em; GST.pendente = null;
        avisar(`Marcos de ${sessoes.join(", ")} gravados no repositório do gabinete.`, "ok");
        return;
      }
    } catch (e) { if (e.status === 401 || e.status === 403) TOKEN = ""; avisar("Falha ao gravar os marcos no repositório: " + (e.message || e), "err"); }
    finally { GST.enviando = false; desenhar(); }
  }
  /* as configurações globais não redefinem o que vem do repositório: depois de cada gravação, reimpõe o arquivo */
  function protegerConfiguracoes(c) {
    if (!c || c.__gabProtegido || typeof c.applyGlobalConfig !== "function") return;
    c.__gabProtegido = true; applyOriginal = c.applyGlobalConfig;
    c.applyGlobalConfig = function (...a) { const r = applyOriginal.apply(this, a); if (GST.doc && !GST.aplicando) { impor(this, GST.doc); return this.globalConfigSnapshot(); } return r; };
    // marcos editáveis: só edições explícitas na Seleção Prévia (setSessionMeta e o planejamento) vão ao repositório
    c.__marcoEditado = (s, k, v) => marcoEditado(c, s, k, v);
    const setMeta = c.setSessionMeta;
    if (typeof setMeta === "function") c.setSessionMeta = function (s, k, v) { const r = setMeta.call(this, s, k, v); marcoEditado(this, s, k, v); return r; };
  }

  /* gravações do painel carimbam o que mudou; SALVAR e importações encaminham ao GitHub */
  function envolver(c) {
    if (!c || c.__acvEnvolvido) return;
    c.__acvEnvolvido = true;
    const saveDB = c.saveDB;
    if (typeof saveDB === "function") c.saveDB = function (...a) { try { carimbar(this); desenhar(); } catch (e) { console.warn("[acervo] carimbo", e); } return saveDB.apply(this, a); };
    const saveNow = c.saveNow;
    if (typeof saveNow === "function") c.saveNow = async function (...a) {
      const ok = await saveNow.apply(this, a);
      if (ok && autoLigado() && ST.pendentes) setTimeout(() => encaminhar({ motivo: `Você salvou ${ST.pendentes} alteração(ões); grave-as no repositório.`, silencioso: true }), 200);
      return ok;
    };
    const importTyped = c.importTyped;
    if (typeof importTyped === "function") c.importTyped = async function (...a) {
      const ep = await importTyped.apply(this, a);
      await this.saveDB(); desenhar();
      if (ST.pendentes && autoLigado()) setTimeout(() => encaminhar({ motivo: `A importação alterou ${ST.pendentes} processo(s) do acervo.`, silencioso: true }), 400);
      return ep;
    };
    // linha de base ao abrir: o que veio do banco local não é edição nova (preserva pendências ainda não enviadas)
    normalizar(c); c.rows.forEach(r => { r._acervoHash = hashLinha(r); });
    gravarPainelLocal({ ...lerPainelLocal(), hash: fnv(JSON.stringify(painelDados(c))) });
    ST.pendentes = c.rows.filter(r => r._acervoPend).length + (lerPainelLocal().pend ? 1 : 0); desenhar();
  }

  /* ---------- arquivos: acervo.json e acervo.html ---------- */
  function baixar(nome, conteudo, tipo) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function docLocal(completo) {
    const c = comp(); if (!pronto(c)) throw new Error("O painel ainda está carregando.");
    carimbar(c);
    const regs = c.rows.map(r => registroDe(r, !!completo)).filter(Boolean), t = agora();
    regs.forEach(r => { if (!r.atualizado_em) r.atualizado_em = t; });
    regs.sort((a, b) => a.id < b.id ? -1 : 1);
    const pl = lerPainelLocal();
    return documento(regs, { ...(completo ? { completo: true } : {}), colunas: colunasDe(c, regs), painel: { atualizado_em: pl.sync || t, dados: limpar(painelDados(c), !!completo) } });
  }
  function paginaHtml(doc) {
    const comp_ = !!doc.completo;
    const linhas = doc.registros.map(r => `<tr><td>${esc(r.processo)}${sigiloso(r) ? ' <span class="sig">SIGILOSO</span>' : ""}</td><td>${esc(r.classe_judicial || r.Classe)}</td><td>${esc(r.assunto_judicial || r.Assunto_Principal || r.Assunto)}</td><td>${esc(r["data_distribuição"] || r["Data_Distribuição"])}</td><td>${esc(r.tarefa_atual)}</td><td>${esc(r.polo_ativo || r.Polo_Ativo)}</td><td>${esc(r.polo_passivo || r.Polo_Passivo)}</td></tr>`).join("\n");
    const json = JSON.stringify(doc).replace(/</g, "\\u003c");
    return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${comp_ ? "Acervo Completo (sigiloso)" : "Acervo Geral"} · Gabinete A</title>
<style>:root{--fundo:#f7f5f0;--papel:#fff;--tinta:#14263c;--suave:#6d7b8a;--linha:#e1dcd2;--marca:#1b3553;--ouro:#c4953c}
@media (prefers-color-scheme:dark){:root{--fundo:#0f1722;--papel:#16212f;--tinta:#e6edf5;--suave:#9fb0c2;--linha:#2a3a4e;--marca:#8fb3e0}}
*{box-sizing:border-box}body{margin:0;background:var(--fundo);color:var(--tinta);font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:20px 16px 12px;max-width:1400px;margin:auto}h1{margin:0;font-size:20px;color:var(--marca)}p{margin:4px 0;color:var(--suave)}
.barra{position:sticky;top:0;background:var(--fundo);padding:8px 16px;max-width:1400px;margin:auto}
input{width:100%;padding:9px 12px;border:1px solid var(--linha);border-radius:8px;background:var(--papel);color:var(--tinta);font:inherit}
main{max-width:1400px;margin:auto;padding:0 16px 32px;overflow-x:auto}table{width:100%;border-collapse:collapse;background:var(--papel)}
th,td{border-bottom:1px solid var(--linha);padding:6px 8px;text-align:left;vertical-align:top}th{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--suave);background:var(--papel)}
.sig{display:inline-block;margin-left:4px;padding:1px 6px;border-radius:999px;background:#a14d4d;color:#fff;font-size:10px;font-weight:700;letter-spacing:.04em}
.alerta{margin-top:10px;padding:10px 12px;border-radius:8px;background:#fbeaea;color:#7a2e2e;border:1px solid #e9c3c3;font-weight:600}</style></head>
<body><header><h1>${comp_ ? "Acervo Completo" : "Acervo Geral"} · Gabinete A</h1>
<p>${doc.registros.length} processos · gerado em ${esc(new Date(doc.atualizado_em).toLocaleString("pt-BR"))} · ${esc(doc.saneamento)}</p>
${comp_ ? `<div class="alerta">${doc.registros.filter(sigiloso).length} processo(s) sigiloso(s) incluído(s). Reimportável no Painel Central (Banco do Acervo Geral › Importar), que restaura também os sigilosos no seu navegador; ao gravar no repositório, eles continuam de fora.</div>` : `<p>Este arquivo pode ser reimportado no Painel Central (Banco do Acervo › Importar).</p>`}</header>
<div class="barra"><input id="q" placeholder="Filtrar por processo, classe, assunto, tarefa ou parte…" aria-label="Filtrar"></div>
<main><table><thead><tr><th>Processo</th><th>Classe</th><th>Assunto</th><th>Distribuição</th><th>Tarefa atual</th><th>Polo ativo</th><th>Polo passivo</th></tr></thead><tbody id="t">
${linhas}
</tbody></table></main>
<script id="gabA-acervo" type="application/json">${json}<\/script>
<script>(function(){var q=document.getElementById("q"),rows=[].slice.call(document.querySelectorAll("#t tr"));q.addEventListener("input",function(){var v=q.value.toLowerCase();rows.forEach(function(r){r.style.display=!v||r.textContent.toLowerCase().indexOf(v)>=0?"":"none"})})})();<\/script>
</body></html>
`;
  }
  function docDeArquivo(texto, nome) {
    const t = texto.replace(/^﻿/, "");
    if (/^\s*[\[{]/.test(t)) return JSON.parse(t);
    const html = new DOMParser().parseFromString(t, "text/html");
    const s = html.getElementById("gabA-acervo") || html.querySelector('script[type="application/json"][data-schema="gabA.acervo"]');
    if (!s) throw new Error(`${nome}: não encontrei o banco do acervo neste HTML (script#gabA-acervo).`);
    return JSON.parse(s.textContent);
  }
  function escolherArquivo() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,.html,.htm,application/json,text/html";
    inp.addEventListener("change", async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      try {
        const doc = docDeArquivo(await f.text(), f.name);
        const r = await receber(doc, f.name);
        avisar(r.msg, "ok");
        if ((r.criados || r.atualizados || r.geral) && autoLigado()) setTimeout(() => encaminhar({ motivo: `O arquivo ${f.name} alterou ${r.criados + r.atualizados} processo(s).`, silencioso: true }), 400);
      } catch (e) { avisar("Importação do banco do acervo: " + (e.message || e), "err"); }
    });
    inp.click();
  }

  /* ---------- interface: botão flutuante e painel ---------- */
  const autoLigado = () => { try { return localStorage.getItem(LS_AUTO) !== "0"; } catch (e) { return true; } };
  const css = document.createElement("style");
  css.textContent = `
#acvBtn{position:fixed;right:16px;bottom:16px;z-index:230;display:flex;align-items:center;gap:7px;border:1px solid #1b3553;background:#1b3553;color:#fff;border-radius:999px;padding:8px 13px;font:800 10.5px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.04em;cursor:pointer;box-shadow:0 4px 14px rgba(20,38,60,.25)}
#acvBtn i{width:8px;height:8px;border-radius:50%;background:#8fa9c0;display:inline-block}#acvBtn i.ok{background:#5fc27e}#acvBtn i.warn{background:#c4953c}#acvBtn i.run{background:#7fb3ff;animation:acvP 1s infinite}
#acvBtn b{background:#c4953c;color:#33240a;border-radius:999px;padding:2px 6px;font-size:9.5px}
@keyframes acvP{50%{opacity:.35}}
#acv-gh-slot{font:600 11.5px/1.5 Figtree,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#14263c}
#acv-gh-slot .st{background:#f7f5f0;border:1px solid #eeebe4;border-radius:9px;padding:9px 11px;color:#4c5b6b;font-size:11px}
#acv-gh-slot .st b{color:#14263c}
#acv-gh-slot .g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}
#acv-gh-slot button{border:1px solid #cfd7e0;background:#fff;color:#14263c;border-radius:8px;padding:9px 8px;font-family:inherit;font-size:10px;font-weight:850;line-height:1.2;letter-spacing:.03em;cursor:pointer}
#acv-gh-slot button:hover{border-color:#9fb3c9}
#acv-gh-slot button.acv-pri{background:#c4953c;border-color:#c4953c;color:#33240a}#acv-gh-slot button.acv-nav{background:#1b3553;border-color:#1b3553;color:#fff}
#acv-gh-slot button:disabled{opacity:.5;cursor:wait}
#acv-gh-slot label{display:flex;gap:7px;align-items:flex-start;margin-top:10px;font-size:10.5px;color:#4c5b6b;cursor:pointer}
#acv-gh-slot .nota{margin-top:8px;font-size:9.5px;color:#7e8b99;line-height:1.45}
#acv-gh-slot .full{grid-column:1/-1}#acv-gh-slot .sub{background:transparent;border-color:transparent;color:#a14d4d;font-weight:750;justify-self:start;padding-left:0}
@media(max-width:700px){#acv-gh-slot .g{grid-template-columns:1fr 1fr}}
.acv-modal{position:fixed;inset:0;z-index:600;background:rgba(20,38,60,.55);display:flex;align-items:center;justify-content:center;padding:16px}
.acv-box{background:#fff;color:#14263c;border-radius:12px;max-width:440px;width:100%;padding:18px 20px;box-shadow:0 18px 50px rgba(0,0,0,.3);font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.acv-box h3{margin:0 0 6px;font-size:15px}.acv-box p{margin:0 0 12px}.acv-box code{font-size:12px}
.acv-box input{width:100%;padding:8px 10px;border:1px solid #c9ced4;border-radius:7px;font:inherit}
.acv-acoes{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.acv-acoes button{padding:7px 14px;border-radius:7px;border:1px solid #c9ced4;background:#fff;cursor:pointer;font:inherit}.acv-acoes .acv-pri{background:#1b3553;border-color:#1b3553;color:#fff}`;
  document.head.appendChild(css);

  const btn = document.createElement("button");
  btn.id = "acvBtn"; btn.type = "button"; btn.title = "Banco do Acervo Geral — importar, exportar e sincronizar";
  btn.onclick = () => { const c = comp(); if (c) c.setState({ acervoDialog: true }); };

  const dataBr = iso => { try { return iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"; } catch (e) { return iso; } };
  let ultimoHtml = "";
  function desenhar() {
    const estado = ST.enviando ? "run" : ST.erro ? "warn" : ST.total != null ? "ok" : "";
    btn.innerHTML = `<i class="${estado}"></i>ACERVO · SINCRONIA${ST.pendentes ? ` <b>${ST.pendentes}</b>` : ""}`;
    const slot = document.getElementById("acv-gh-slot");
    if (!slot) return;
    const c = comp(), n = c && Array.isArray(c.rows) ? c.rows.length : 0;
    const situacao = ST.erro ? `Sem leitura do repositório: ${esc(ST.erro)}.` :
      ST.total == null ? "Lendo o banco do acervo…" : `<b>${ST.total}</b> processo(s) no banco do acervo · versão ${esc(dataBr(ST.versao))}`;
    const html = `<div class="st">${situacao}<br>${n} processo(s) neste painel${ST.pendentes ? ` · <b>${ST.pendentes} alterado(s) desde o último envio</b>` : ""}${ST.ultimoEnvio ? ` · último envio ${esc(dataBr(ST.ultimoEnvio))}` : ""}</div>
      <div class="g">
        <button type="button" data-a="puxar" title="Trazer para este painel o que estiver mais recente no repositório">⇣ ATUALIZAR DO REPOSITÓRIO</button>
        <button type="button" class="acv-nav" data-a="enviar" ${ST.enviando ? "disabled" : ""} title="Gravar no repositório o que mudou neste painel">${ST.enviando ? "GRAVANDO…" : "⇡ GRAVAR NO REPOSITÓRIO"}</button>
        <button type="button" class="acv-pri" data-a="importar" title="Importar acervo.html ou acervo.json exportado por este painel">⇧ IMPORTAR .HTML / .JSON</button>
        <button type="button" data-a="json">⇩ EXPORTAR ACERVO.JSON</button>
        <button type="button" data-a="csv">⇩ EXPORTAR ACERVO.CSV</button>
        <button type="button" data-a="html">⇩ EXPORTAR ACERVO.HTML</button>
        <button type="button" class="sub" data-a="substituir" ${ST.enviando ? "disabled" : ""}>Substituir o banco…</button>
      </div>
      <label><input type="checkbox" data-a="auto" ${autoLigado() ? "checked" : ""}> Gravar no repositório ao clicar em SALVAR e após cada importação (planilhas Gab A, PJe 2G ou arquivo do banco)</label>
      <div class="nota">Repositório privado <b>${GH.dono}/${GH.repo}</b>: o acervo fica dividido em <i>importado</i> (dados dos sistemas, sem colunas repetidas) e <i>operacional</i> (só o que o gabinete decidiu: triagem, minuta, revisão, fluxo com quem e quando, pauta com sessão inaugural e histórico). Regras (seção, META, impedimento, AJG, regularidade, etiquetas operacionais) são recalculadas aqui. A produtividade sai das datas do fluxo. Mescla por processo: prevalece a alteração mais recente; nada é apagado. ${TOKEN ? '<button type="button" class="sub" data-a="esquecer">Esquecer o token deste navegador</button>' : ""}</div>
      <div id="acv-mag"></div>`;
    if (slot.dataset.pronto === "1" && html === ultimoHtml) return;
    slot.innerHTML = html; slot.dataset.pronto = "1"; ultimoHtml = html;
    try { window.__acvMagistrados && window.__acvMagistrados.desenhar(); } catch (e) {}
  }
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("#acv-gh-slot [data-a]"); if (!a) return;
    const acao = a.dataset.a;
    if (acao === "puxar") puxar(false);
    else if (acao === "enviar") encaminhar({ motivo: "" });
    else if (acao === "importar") escolherArquivo();
    else if (acao === "csv") { try { baixar("acervo.csv", "\ufeff" + csv(docLocal()), "text/csv;charset=utf-8"); } catch (er) { avisar(er.message, "err"); } }
    else if (acao === "json") { try { baixar("acervo.json", serializar(docLocal()), "application/json"); } catch (er) { avisar(er.message, "err"); } }
    else if (acao === "html") { try { baixar("acervo.html", paginaHtml(docLocal()), "text/html;charset=utf-8"); } catch (er) { avisar(er.message, "err"); } }
    else if (acao === "esquecer") { TOKEN = ""; try { localStorage.removeItem(LS_TOKEN); } catch (er) {} avisar("Token esquecido neste navegador.", "ok"); }
    else if (acao === "substituir") {
      if (window.confirm("Substituir o banco do acervo pelo acervo deste painel?\n\nProcessos que estão no repositório mas não neste painel serão retirados do banco. Use só quando este painel tiver o acervo completo.")) encaminhar({ substituir: true, motivo: "" });
    }
  });
  document.addEventListener("change", e => { if (e.target.matches && e.target.matches('#acv-gh-slot [data-a="auto"]')) { try { localStorage.setItem(LS_AUTO, e.target.checked ? "1" : "0"); } catch (er) {} } });
  document.addEventListener("keydown", e => { if (e.key !== "Escape" || document.querySelector(".acv-modal")) return; const c = comp(); if (c && c.state && c.state.acervoDialog && !c.state.clearDialog) c.setState({ acervoDialog: false }); });
  /* o espaço do GitHub nasce e some com o diálogo: redesenha quando ele aparece */
  new MutationObserver(() => { const slot = document.getElementById("acv-gh-slot"); if (slot && slot.dataset.pronto !== "1") desenhar(); }).observe(document.documentElement, { childList: true, subtree: true });

  /* colunas de 1º grau na triagem (juízo e juiz): entram no Acervo Central, logo após Impedimento / Suspeição */
  function colunasPrimeiroGrau(c) {
    try {
      const novas = ["Juízo de 1º grau", "Juiz de 1º grau"];
      const conhecidas = c.centralKnownColumns instanceof Set ? c.centralKnownColumns : null;
      if (conhecidas) novas.forEach(x => conhecidas.add(x)); else if (Array.isArray(c.centralKnownColumns)) novas.forEach(x => { if (!c.centralKnownColumns.includes(x)) c.centralKnownColumns.push(x); });
      const cen = c.columnConfig && c.columnConfig.central;
      if (Array.isArray(cen) && !cen.includes(novas[0])) { const i = cen.indexOf("Impedimento / Suspeição"); cen.splice(i >= 0 ? i + 1 : cen.length, 0, ...novas); }
    } catch (e) { console.warn("[acervo] colunas de 1º grau", e); }
  }

  function montar() {
    if (!document.body) return setTimeout(montar, 50);
    document.body.appendChild(btn); desenhar();
  }
  montar();

  /* aguarda o painel terminar de carregar o banco local; depois envolve a importação e lê o GitHub */
  let iniciado = false;
  setInterval(() => {
    const c = comp(); if (!pronto(c)) return;
    if (!iniciado) { iniciado = true; envolver(c); protegerConfiguracoes(c); colunasPrimeiroGrau(c); setTimeout(async () => { if (!TOKEN && window.ProcsMuta) { try { TOKEN = await window.ProcsMuta.token("Para ler o acervo do gabinete."); } catch (e) {} } if (TOKEN) { await puxar(true); if (GST.doc) impor(c, GST.doc); } else { ST.erro = "repositório privado não conectado — abra ACERVO · SINCRONIA e clique em ATUALIZAR"; desenhar(); } }, 300); }
  }, 400);

  window.__acervoGitHub = { puxar, encaminhar, receber, docLocal, serializar, mesclar, registroDe, sigiloso, paginaHtml, docDeArquivo, csv, carimbar, colunasDe, estado: ST, GH, PUB, lerRemoto, token: v => { TOKEN = v; },
    gabinete: { puxar: puxarGabinete, estado: GST, servidorPublico, impor: () => impor(comp(), GST.doc), enviarMarcos } };
})();

