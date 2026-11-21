/* Vocabulário único do gabinete (padrao/vocabulario.json): ficha do processo, prontuário das pautas, Collectio e Caput
   falam a mesma língua. Use VOC.lista(campo) para montar as opções, VOC.norm(campo, valor, ctx) para converter valores
   antigos e VOC.classe(campo, valor) nas regras ('regular', 'pendente', 'irregular', 'na'), no lugar de comparar o texto.
   ctx (opcional): { ajg, dpu, obs } resolve os genéricos antigos ('Dispensado', 'Isento (DPU/ente público)',
   'Dispensada (proc. público/DPU)'). Os dados abaixo são gerados por scripts/vocabulario/aplicar.py: não editar à mão. */
(function (raiz, fab) { var V = fab(); if (typeof module === 'object' && module.exports) module.exports = V; else raiz.VOC = V; })(typeof self !== 'undefined' ? self : this, function () {
  var D = /*VOC-DADOS*/{"versao":"1.0.0","campos":{"tempest":{"rotulo":"Tempestividade","opcoes":[["Tempestivo","regular"],["Intempestivo","irregular"],["Não verificado","pendente"],["Não se aplica","na"]],"sinonimos":{}},"preparo":{"rotulo":"Preparo","opcoes":[["Comprovado","regular"],["Justiça gratuita","regular"],["Gratuidade pedida no recurso","pendente"],["Isento (ente público/MP)","regular"],["Assistência da DPU","regular"],["Recolhido sem comprovante STN","pendente"],["Recolhido a menor","pendente"],["Recolhido após a interposição","pendente"],["Não recolhido","irregular"],["Não se aplica","na"],["Não verificado","pendente"]],"sinonimos":{"AJG":"Justiça gratuita","Dispensado":"@dispensado","Isento (DPU/ente público)":"@isento"}},"repres":{"rotulo":"Representação","opcoes":[["Regular","regular"],["Dispensada (procurador público)","regular"],["Dispensada (DPU)","regular"],["Irregular – intimar","irregular"],["Não verificado","pendente"]],"sinonimos":{"Negativo":"Irregular – intimar","Irregular":"Irregular – intimar","Irregular - intimar":"Irregular – intimar","Dispensada (proc. público/DPU)":"@dispensada"}},"prelim":{"rotulo":"Preliminares","opcoes":[["Sem preliminares","na"],["Há preliminares","regular"],["Preliminar de ofício","regular"]],"sinonimos":{"Não há":"Sem preliminares","Não":"Sem preliminares","Sim":"Há preliminares"}},"midias":{"rotulo":"Mídias","opcoes":[["Juntadas","regular"],["Faltantes","irregular"],["Não se aplica","na"],["Não verificado","pendente"]],"sinonimos":{"Juntada":"Juntadas","Faltante":"Faltantes"}},"mpf":{"rotulo":"Hipótese de intervenção do MPF","opcoes":[["Sem hipótese","na"],["Interesse público ou social (178, I)","regular"],["Incapaz (178, II)","regular"],["Litígio coletivo pela posse de terra (178, III)","regular"],["Mandado de segurança","regular"],["ACP/ação popular","regular"],["Improbidade","regular"],["Indígenas (CF 232)","regular"],["Comunidade quilombola","regular"],["Pessoa com deficiência","regular"],["Idoso em risco","regular"],["Reforma agrária","regular"],["Reintegração de posse coletiva","regular"],["Extradição, expulsão ou deportação","regular"],["Outra hipótese","regular"]],"sinonimos":{"Não":"Sem hipótese","Parte no feito":"Sem hipótese","Interesse público (178 I)":"Interesse público ou social (178, I)","Incapaz (178 II)":"Incapaz (178, II)","Litígio coletivo terra (178 III)":"Litígio coletivo pela posse de terra (178, III)","Menor de Idade (proteção de crianças e adolescentes)":"Incapaz (178, II)","Interdito (curatela)":"Incapaz (178, II)","Pessoa com Deficiência (acessibilidade e benefícios)":"Pessoa com deficiência","Idoso (vulnerabilidade social)":"Idoso em risco","Idoso (Estatuto)":"Idoso em risco","Comunidade Indígena (direitos originários e terras)":"Indígenas (CF 232)","Comunidade Quilombola (tutela de territórios ancestrais)":"Comunidade quilombola","Conflito Coletivo - Terra Rural (litígios agrários e INCRA)":"Litígio coletivo pela posse de terra (178, III)","Conflito Coletivo - Terra Urbana (ocupações em imóveis da União/CEF)":"Litígio coletivo pela posse de terra (178, III)","Reintegração de Posse Coletiva":"Reintegração de posse coletiva","Mandado de Segurança (fiscalização obrigatória da lei)":"Mandado de segurança","Outros":"Outra hipótese","Não se aplica":"Sem hipótese","Interesse público ou social relevante":"Interesse público ou social (178, I)","Comunidades indígenas":"Indígenas (CF 232)","Comunidades quilombolas e tradicionais":"Comunidade quilombola","Idoso":"Idoso em risco","Incapaz":"Incapaz (178, II)","Litígios coletivos federais pela posse de terra rural ou urbana":"Litígio coletivo pela posse de terra (178, III)","Ação civil pública proposta por outro legitimado":"ACP/ação popular","Ação popular":"ACP/ação popular","Processos de desapropriação para reforma agrária":"Reforma agrária","Ações de improbidade administrativa":"Improbidade","Processos de extradição, expulsão e deportação":"Extradição, expulsão ou deportação"}},"parecer":{"rotulo":"Parecer do MPF","opcoes":[["Com parecer","regular"],["Aguardando parecer","pendente"],["Intimado sem manifestação","regular"],["Vista a abrir","pendente"],["Não verificado","pendente"],["Não se aplica","na"]],"sinonimos":{"Sem Parecer":"Aguardando parecer","Sem parecer":"Aguardando parecer","Parecer juntado":"Com parecer"}},"papel":{"rotulo":"Papel da parte no 1º grau","opcoes":[["Autor(a)","regular"],["Réu/ré","regular"],["Terceiro","regular"]],"sinonimos":{"Autor":"Autor(a)","Autora":"Autor(a)","Réu":"Réu/ré","Ré":"Réu/ré"}}}}/*VOC-FIM*/;
  var N = function (s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase(); };
  var sim = function (x) { return x === true || /^(sim|s|true|1|2)$/i.test(String(x == null ? '' : x).trim()); };
  function campo(c) { return (D.campos || {})[c] || null; }
  function lista(c) { var f = campo(c); return f ? f.opcoes.map(function (o) { return o[0]; }) : []; }
  function resolve(alvo, ctx) {
    ctx = ctx || {}; var obs = String(ctx.obs || '').replace(/\(proc\. público\/DPU\)|DPU\/ente público|procurador público ou DPU/gi, ''), dpu = sim(ctx.dpu) || /DPU|Defensoria/i.test(obs), ajg = sim(ctx.ajg);
    if (alvo === '@dispensado') return dpu ? 'Assistência da DPU' : ajg ? 'Justiça gratuita' : 'Isento (ente público/MP)';
    if (alvo === '@isento') return dpu ? 'Assistência da DPU' : 'Isento (ente público/MP)';
    if (alvo === '@dispensada') return dpu ? 'Dispensada (DPU)' : 'Dispensada (procurador público)';
    return alvo;
  }
  function norm(c, v, ctx) {
    var f = campo(c), s = String(v == null ? '' : v).trim();
    if (!f || !s) return s;
    var n = N(s), i, o;
    /* Representação 'Regular' com observação de dispensa (formato antigo da ficha) */
    if (c === 'repres' && n === 'regular' && ctx && /^Dispensada/i.test(ctx.obs || '')) return resolve('@dispensada', ctx);
    for (i = 0; i < f.opcoes.length; i++) { o = f.opcoes[i][0]; if (o === s || N(o) === n) return o; }
    for (o in f.sinonimos) if (o === s || N(o) === n) return resolve(f.sinonimos[o], ctx);
    return s;
  }
  function classe(c, v, ctx) {
    var f = campo(c), s = norm(c, v, ctx), i;
    if (!f || !s) return '';
    for (i = 0; i < f.opcoes.length; i++) if (f.opcoes[i][0] === s) return f.opcoes[i][1];
    return '';
  }
  function eh(c, v, cl, ctx) { return classe(c, v, ctx) === cl; }
  return { dados: D, lista: lista, norm: norm, classe: classe, eh: eh, rotulo: function (c) { var f = campo(c); return f ? f.rotulo : c; } };
});
