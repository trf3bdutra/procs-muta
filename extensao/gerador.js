/* HERO18810 · Gerador (Minuta › Gerador; até a 0.37, Prontuário › Gerador): relatório, dispositivo do voto, ementa, acórdão e proclamação no padrão do
   gabinete (Padrão Muta 1 e 2; Padrão de ementa do gabinete), pelo tipo de julgamento e pelo resultado escolhido.
   Fonte: a ficha do processo (o que está gravado ou a gravar); propostas de leitura precisam ser incorporadas à ficha.
   Fórmulas transcritas sem reescrever; o que não se confirma na ficha ou nos autos sai como [VALIDAR: …]. Nada é gravado. */
(function () {
  'use strict';
  var S = function (v) { return v == null ? '' : String(v).trim(); };
  var N = function (v) { return S(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var VAL = function (t) { return '[VALIDAR: ' + t + ']'; };
  var ST = { tipo: '', res: '', cnj: '', ficha: '', abertos: {} };
  /* 0.43: por ora, só relatório e ementa (pedido do gestor, 23/11/2026); dispositivo, acórdão e proclamação continuam no código, desligados */
  var PECAS = { rel: true, em: true, disp: false, ac: false, pr: false };

  /* ---------- dados ---------- */
  var CONTEXTO = null;
  function GB() { return CONTEXTO || window.MutaGabinete || {}; }
  function sugDe(alvo) {
    var AU = CONTEXTO ? null : window.MutaAutos; if (!AU || !AU.sugestoes) return '';
    var x = (AU.sugestoes() || []).filter(function (s) { return s.alvo === alvo; })[0];
    return x ? x.value : '';
  }
  function v(sec, k) { var g = GB(), x = g.V ? g.V(sec, k) : ''; if (Array.isArray(x) ? x.length : S(x)) return x; return ''; /* somente o registro da ficha, nunca sugestão ainda não gravada */ }
  function tab(sec, k) { var x = v(sec, k); if (typeof x === 'string') { try { x = JSON.parse(x); } catch (e) { x = []; } } return Array.isArray(x) ? x.filter(function (r) { return r && typeof r === 'object'; }) : []; }
  /* Mapa de apelidos derivado da ficha padrão: fallback para o Compendium sem a ficha carregada. */
  var CONTRATO_FICHA=[{"s":"triagem","k":"Tempestividade por recurso","a":"tempestividade_por_recurso","f":[],"t":"tabela"},{"s":"origem","k":"Origem - Juízo","a":"juizo_origem","f":[],"t":"texto"},{"s":"origem","k":"Origem - Julgador","a":"juiz_origem","f":[],"t":"texto"},{"s":"origem","k":"Origem - Valor da causa","a":"valor_causa_origem","f":[],"t":"texto"},{"s":"origem","k":"Origem - Processo de referência","a":"origem_processo_referencia","f":[],"t":"texto"},{"s":"origem","k":"Origem - Documentos 1G","a":"origem_documentos_1g","f":[],"t":"tabela"},{"s":"origem","k":"Origem - Peças vinculadas 1G","a":"origem_pecas_vinculadas_1g","f":[],"t":"tabela"},{"s":"origem","k":"Origem - Data de ajuizamento","a":"origem_data_ajuizamento","f":[],"t":"data"},{"s":"origem","k":"1G - Sentença recorrida","a":"1g_sentenca_recorrida","f":[],"t":"simnao"},{"s":"origem","k":"Sentença - Decisão","a":"sentenca_decisao","f":[],"t":"lista"},{"s":"origem","k":"Sentença - ID","a":"sentenca_id","f":[],"t":"texto"},{"s":"origem","k":"Sentença - Honorários","a":"sentenca_honorarios","f":[],"t":"texto"},{"s":"origem","k":"Sentença - Custas","a":"sentenca_custas","f":[],"t":"texto"},{"s":"origem","k":"Sentença - Resultado","a":"sentenca_resultado","f":[],"t":"texto"},{"s":"origem","k":"Sentença - Fundamento","a":"sentenca_fundamento","f":[],"t":"texto-longo"},{"s":"origem","k":"Sentença - Providências","a":"sentenca_providencias","f":[],"t":"texto-longo"},{"s":"origem","k":"Sentença - Data","a":"sentenca_data","f":[],"t":"data"},{"s":"origem","k":"Sentença - Reexame","a":"sentenca_reexame","f":[],"t":"lista"},{"s":"origem","k":"Sentença - Tutela","a":"sentenca_tutela","f":[],"t":"lista"},{"s":"origem","k":"Sentença - Comandos","a":"sentenca_comandos","f":[],"t":"tabela"},{"s":"origem","k":"Sentença - Publicação","a":"sentenca_publicacao","f":[],"t":"data"},{"s":"origem","k":"1G - Decisão recorrida","a":"1g_decisao_recorrida","f":[],"t":"simnao"},{"s":"origem","k":"1G - Decisão ID","a":"1g_decisao_id","f":[],"t":"texto"},{"s":"origem","k":"1G - Decisão Data","a":"1g_decisao_data","f":[],"t":"data"},{"s":"origem","k":"1G - Decisão Publicação","a":"1g_decisao_publicacao","f":[],"t":"data"},{"s":"origem","k":"1G - Decisão Julgador","a":"1g_decisao_julgador","f":[],"t":"texto"},{"s":"origem","k":"1G - Decisão Resultado","a":"1g_decisao_resultado","f":[],"t":"texto-longo"},{"s":"origem","k":"1G - Decisão Fundamentos","a":"1g_decisao_fundamentos","f":[],"t":"texto-longo"},{"s":"origem","k":"2G - Monocrática recorrida","a":"2g_monocratica_recorrida","f":[],"t":"simnao"},{"s":"origem","k":"2G - Monocrática ID","a":"2g_monocratica_id","f":[],"t":"texto"},{"s":"origem","k":"2G - Monocrática Data","a":"2g_monocratica_data","f":[],"t":"data"},{"s":"origem","k":"2G - Monocrática Publicação","a":"2g_monocratica_publicacao","f":[],"t":"data"},{"s":"origem","k":"2G - Monocrática Relator","a":"2g_monocratica_relator","f":[],"t":"texto"},{"s":"origem","k":"2G - Monocrática Órgão","a":"2g_monocratica_orgao","f":[],"t":"texto"},{"s":"origem","k":"2G - Monocrática Resultado","a":"2g_monocratica_resultado","f":[],"t":"texto-longo"},{"s":"origem","k":"2G - Monocrática Fundamentos","a":"2g_monocratica_fundamentos","f":[],"t":"texto-longo"},{"s":"origem","k":"2G - Acórdão recorrido","a":"2g_acordao_recorrido","f":[],"t":"simnao"},{"s":"producao","k":"Acórdão - ID","a":"acordao_id","f":[],"t":"texto"},{"s":"producao","k":"Acórdão - Assinado","a":"acordao_assinado","f":[],"t":"simnao"},{"s":"producao","k":"Acórdão - Publicado","a":"acordao_publicado","f":[],"t":"simnao"},{"s":"producao","k":"Acórdão - Data da publicação","a":"acordao_data_publicacao","f":[],"t":"data"},{"s":"producao","k":"Acórdão - ED opostos","a":"acordao_ed_opostos","f":[],"t":"simnao"},{"s":"producao","k":"Acórdão - Trânsito","a":"acordao_transito","f":[],"t":"data"},{"s":"origem","k":"2G - Acórdão Data","a":"2g_acordao_data","f":[],"t":"data"},{"s":"origem","k":"2G - Acórdão Relator","a":"2g_acordao_relator","f":[],"t":"texto"},{"s":"origem","k":"2G - Acórdão Órgão","a":"2g_acordao_orgao","f":[],"t":"texto"},{"s":"origem","k":"2G - Acórdão Resultado","a":"2g_acordao_resultado","f":[],"t":"texto-longo"},{"s":"origem","k":"2G - Acórdão Ementa","a":"2g_acordao_ementa","f":[],"t":"texto-longo"},{"s":"triagem","k":"Impugnada - ID","a":"impugnada_id","f":[],"t":"texto"},{"s":"triagem","k":"Impugnada - Data","a":"impugnada_data","f":[],"t":"data"},{"s":"triagem","k":"Impugnada - Órgão","a":"impugnada_orgao","f":[],"t":"texto"},{"s":"triagem","k":"Impugnada - Relator","a":"impugnada_relator","f":[],"t":"texto"},{"s":"triagem","k":"Impugnada - Síntese","a":"impugnada_sintese","f":[],"t":"texto-longo"},{"s":"triagem","k":"Impugnada - Publicação","a":"impugnada_publicacao","f":[],"t":"data"},{"s":"triagem","k":"Impugnada - Ementa literal","a":"impugnada_ementa_literal","f":[],"t":"texto-longo"},{"s":"origem","k":"Sucumbência da decisão recorrida","a":"sucumbencia_decisao_recorrida","f":[],"t":"tabela"},{"s":"origem","k":"Contrarrazões - Situação","a":"contrarrazoes_situacao","f":[],"t":"lista"},{"s":"origem","k":"Recursos","a":"recursos","f":[],"t":"tabela"},{"s":"origem","k":"Contrarrazões","a":"contrarrazoes","f":[],"t":"tabela"},{"s":"triagem","k":"Prelim.","a":"prelim","f":[],"t":"lista"},{"s":"triagem","k":"Descrição da Preliminar","a":"descricao_preliminar","f":[],"t":"texto-longo"},{"s":"triagem","k":"Recurso adesivo","a":"recurso_adesivo","f":[],"t":"simnao"},{"s":"triagem","k":"Má-fé alegada","a":"ma_fe_alegada","f":[],"t":"simnao"},{"s":"origem","k":"Autos - Extraído em","a":"autos_extraido","f":[],"t":"texto"},{"s":"origem","k":"Autos - Total","a":"autos_total","f":[],"t":"texto"},{"s":"origem","k":"Autos - Sem texto","a":"autos_sem_texto","f":[],"t":"texto"},{"s":"origem","k":"Autos - Documentos","a":"autos_documentos","f":[],"t":"tabela"},{"s":"origem","k":"Outras peças","a":"outras_pecas","f":[],"t":"tabela"},{"s":"origem","k":"Classificação documental","a":"classificacao_documental","f":[],"t":"tabela"},{"s":"triagem","k":"Registro - Teor dos autos","a":"registro_teor_autos","f":[],"t":"texto-longo"},{"s":"triagem","k":"Registro - Peças","a":"registro_pecas","f":[],"t":"tabela"},{"s":"origem","k":"baixado","a":"baixado","f":[],"t":"texto"},{"s":"origem","k":"fora_do_fonte","a":"fora_fonte","f":[],"t":"texto"},{"s":"origem","k":"atualizado_em","a":"atualizado","f":[],"t":"texto"},{"s":"triagem","k":"Registro - Atualizado em","a":"registro_atualizado","f":[],"t":"texto"},{"s":"","k":"classe_judicial","a":"classe","f":["classe_judicial","Classe","DataJud · Classe"],"t":"texto"},{"s":"","k":"Seção","a":"secao","f":["Seção Competente"],"t":"texto"},{"s":"","k":"data_distribuição","a":"data_distribuicao","f":["data_distribuição"],"t":"texto"},{"s":"","k":"Relator","a":"relator","f":[],"t":"texto"},{"s":"","k":"_etq","a":"etiquetas_pje","f":["Etiquetas Originais"],"t":"texto"},{"s":"","k":"valor_causa","a":"valor_causa","f":["valor_causa"],"t":"texto"},{"s":"","k":"dt_distribuicao_1g","a":"data_distribuicao_1g","f":["dt_distribuicao_1g"],"t":"data"},{"s":"","k":"prioridade","a":"prioridade","f":["prioridade"],"t":"texto"},{"s":"","k":"Sigiloso","a":"sigiloso","f":["Sigiloso"],"t":"texto"},{"s":"","k":"Órgão Julgador","a":"orgao_julgador","f":["Órgão Julgador"],"t":"texto"},{"s":"triagem","k":"Etiquetas","a":"etiquetas","f":[],"t":"texto"},{"s":"triagem","k":"Etiquetas sugeridas","a":"etiquetas_sugeridas","f":[],"t":"texto"},{"s":"","k":"Assunto","a":"assunto","f":["Assunto"],"t":"texto"},{"s":"triagem","k":"Ramo do direito","a":"ramo_direito","f":[],"t":"texto"},{"s":"triagem","k":"Assunto detalhado","a":"assunto_detalhado","f":[],"t":"texto-longo"},{"s":"triagem","k":"Outros assuntos","a":"outros_assuntos","f":[],"t":"texto-longo"},{"s":"triagem","k":"Detalhamento do caso","a":"detalhamento","f":[],"t":"texto-longo"},{"s":"triagem","k":"Síntese Processual","a":"sintese_processual","f":[],"t":"texto-longo"},{"s":"triagem","k":"Síntese Fática","a":"sintese_fatica","f":[],"t":"texto-longo"},{"s":"triagem","k":"COMPLEXIDADE","a":"complexidade","f":[],"t":"texto"},{"s":"triagem","k":"Registro - Assunto detalhado","a":"registro_assunto_detalhado","f":[],"t":"texto-longo"},{"s":"triagem","k":"Alegações","a":"alegacoes","f":[],"t":"texto-longo"},{"s":"triagem","k":"Questões jurídicas individualizadas","a":"questoes_juridicas_individualizadas","f":[],"t":"tabela"},{"s":"","k":"Polo Ativo","a":"polo_ativo","f":["polo_ativo"],"t":"texto"},{"s":"","k":"Polo Passivo","a":"polo_passivo","f":["polo_passivo"],"t":"texto"},{"s":"","k":"advogado_pa","a":"advogado_polo_ativo","f":["advogado_pa"],"t":"texto"},{"s":"","k":"advogado_pp","a":"advogado_polo_passivo","f":["advogado_pp"],"t":"texto"},{"s":"","k":"dpu","a":"dpu","f":["dpu"],"t":"texto"},{"s":"","k":"mpf","a":"mpf","f":["mpf"],"t":"texto"},{"s":"","k":"Partes","a":"partes","f":[],"t":"texto"},{"s":"","k":"tarefa_atual","a":"tarefa_atual","f":["tarefa_atual"],"t":"texto"},{"s":"","k":"data_entrada_tarefa","a":"data_entrada_tarefa","f":["data_entrada_tarefa"],"t":"data"},{"s":"","k":"paradeiro_em","a":"paradeiro","f":["paradeiro_em"],"t":"data"},{"s":"","k":"tarefa_anterior","a":"tarefa_anterior","f":["tarefa_anterior"],"t":"texto"},{"s":"","k":"saiu_da_tarefa_em","a":"saiu_tarefa","f":["saiu_da_tarefa_em"],"t":"data"},{"s":"","k":"ultimo_movimento","a":"ultimo_movimento","f":["ultimo_movimento"],"t":"texto"},{"s":"","k":"Data Último Movimento","a":"data_ultimo_movimento","f":["Data Último Movimento"],"t":"data"},{"s":"","k":"DataJud · Último movimento","a":"datajud_ultimo_movimento","f":["DataJud","Último movimento"],"t":"texto"},{"s":"","k":"DataJud · Data movimento","a":"datajud_data_movimento","f":["DataJud","Data movimento"],"t":"data"},{"s":"","k":"DataJud · Situação","a":"datajud_situacao","f":["DataJud","Situação"],"t":"texto"},{"s":"","k":"DataJud · Última coleta","a":"datajud_ultima_coleta","f":["DataJud","Última coleta"],"t":"data"},{"s":"","k":"Situação da Pauta","a":"situacao_pauta","f":[],"t":"texto"},{"s":"","k":"Sessão atual (Excel)","a":"sessao_atual_excel","f":[],"t":"texto"},{"s":"triagem","k":"Tipo de Julgamento","a":"tipo_julgamento","f":[],"t":"texto"},{"s":"triagem","k":"Status da triagem","a":"status_triagem","f":[],"t":"lista"},{"s":"triagem","k":"Seleção Prévia","a":"selecao_previa","f":[],"t":"texto"},{"s":"producao","k":"Destino - Situação","a":"destino_situacao","f":[],"t":"lista"},{"s":"producao","k":"Destino - Outro","a":"destino_outro","f":[],"t":"lista"},{"s":"triagem","k":"Destino - Confirmado em","a":"destino_confirmado","f":[],"t":"data"},{"s":"triagem","k":"Destino - Confirmado por","a":"triagem_destino_confirmado","f":[],"t":"texto"},{"s":"triagem","k":"Hipóteses Monocrática","a":"hipoteses_monocratica","f":[],"t":"lista"},{"s":"triagem","k":"Art. 932 - Nota de enquadramento","a":"art932_nota","f":[],"t":"texto-longo"},{"s":"triagem","k":"Registro - Proposta","a":"registro_proposta","f":[],"t":"texto-longo"},{"s":"triagem","k":"Proposta de julgamento","a":"proposta_julgamento","f":[],"t":"texto-longo"},{"s":"triagem","k":"Seleção Prévia - Nota","a":"selecao_previa_nota","f":[],"t":"texto-longo"},{"s":"triagem","k":"Destino - Outro Nota","a":"destino_outro_nota","f":[],"t":"texto-longo"},{"s":"origem","k":"Mapa de próximos passos","a":"mapa_proximos_passos","f":[],"t":"texto-longo"},{"s":"triagem","k":"Histórico de julgamento","a":"historico_julgamento","f":[],"t":"tabela"},{"s":"triagem","k":"Registro - Triagem","a":"registro_triagem","f":[],"t":"texto-longo"},{"s":"origem","k":"Responsável","a":"responsavel","f":[],"t":"texto"},{"s":"origem","k":"Solicitações manuais","a":"solicitacoes_manuais","f":[],"t":"texto-longo"},{"s":"origem","k":"Solicitações de despacho","a":"solicitacoes_despacho","f":[],"t":"texto-longo"},{"s":"origem","k":"Próximo pronunciamento","a":"proximo_pronunciamento","f":[],"t":"lista"},{"s":"origem","k":"Ato a proferir","a":"ato_a_proferir","f":[],"t":"texto-longo"},{"s":"origem","k":"Próxima ação","a":"proxima_acao","f":[],"t":"texto"},{"s":"origem","k":"Conferência dos autos","a":"conferencia_autos","f":[],"t":"texto-longo"},{"s":"origem","k":"Notas fixadas","a":"notas_fixadas","f":[],"t":"texto-longo"},{"s":"origem","k":"Observações","a":"observacoes","f":[],"t":"texto-longo"},{"s":"triagem","k":"Registro - Situação atual","a":"registro_situacao_atual","f":[],"t":"texto-longo"},{"s":"triagem","k":"Padrão - Espécie","a":"padrao_especie","f":[],"t":"lista"},{"s":"triagem","k":"Registro - Lote","a":"registro_lote","f":[],"t":"texto"},{"s":"triagem","k":"Registro - Grupo","a":"registro_grupo","f":[],"t":"texto-longo"},{"s":"producao","k":"Modelo aplicável","a":"modelo_aplicavel","f":[],"t":"texto"},{"s":"producao","k":"Variação do modelo","a":"variacao_modelo","f":[],"t":"texto"},{"s":"triagem","k":"Registro - Variações","a":"registro_variacoes","f":[],"t":"texto"},{"s":"triagem","k":"Registro - Modelo","a":"registro_modelo","f":[],"t":"texto-longo"},{"s":"triagem","k":"Tempestividade","a":"tempestividade","f":[],"t":"lista"},{"s":"triagem","k":"Preparo","a":"preparo","f":[],"t":"lista"},{"s":"triagem","k":"Preparo por recurso","a":"preparo_por_recurso","f":[],"t":"tabela"},{"s":"triagem","k":"Preparo - Recorrente","a":"preparo_recorrente","f":[],"t":"texto"},{"s":"triagem","k":"Preparo - ID recurso","a":"preparo_id_recurso","f":[],"t":"texto"},{"s":"triagem","k":"Preparo - ID guia","a":"preparo_id_guia","f":[],"t":"texto"},{"s":"triagem","k":"Preparo - ID comprovante","a":"preparo_id_comprovante","f":[],"t":"texto"},{"s":"triagem","k":"Preparo - Tipo comprovante","a":"preparo_tipo_comprovante","f":[],"t":"lista"},{"s":"triagem","k":"Preparo - Conferência STN","a":"preparo_conferencia_stn","f":[],"t":"lista"},{"s":"triagem","k":"Preparo - Código receita","a":"preparo_codigo_receita","f":[],"t":"texto"},{"s":"triagem","k":"Preparo - UG","a":"preparo_ug","f":[],"t":"texto"},{"s":"triagem","k":"Preparo - Vinculação","a":"preparo_vinculacao","f":[],"t":"lista"},{"s":"triagem","k":"Preparo - Valor devido","a":"preparo_valor_devido","f":[],"t":"texto"},{"s":"triagem","k":"Preparo - Valor recolhido","a":"preparo_valor_recolhido","f":[],"t":"texto"},{"s":"triagem","k":"Preparo - Data recolhimento","a":"preparo_data_recolhimento","f":[],"t":"data"},{"s":"triagem","k":"Preparo - Data comprovação","a":"preparo_data_comprovacao","f":[],"t":"data"},{"s":"triagem","k":"Preparo - ID AJG","a":"preparo_id_ajg","f":[],"t":"texto"},{"s":"triagem","k":"Preparo - Situação AJG","a":"preparo_situacao_ajg","f":[],"t":"lista"},{"s":"triagem","k":"Preparo - Fundamento dispensa","a":"preparo_fundamento_dispensa","f":[],"t":"texto-longo"},{"s":"triagem","k":"Preparo - Regularização","a":"preparo_regularizacao","f":[],"t":"lista"},{"s":"triagem","k":"Preparo - ID intimação","a":"preparo_id_intimacao","f":[],"t":"texto"},{"s":"triagem","k":"Preparo - Prazo regularização","a":"preparo_prazo_regularizacao","f":[],"t":"data"},{"s":"triagem","k":"Preparo - Cumprimento","a":"preparo_cumprimento","f":[],"t":"lista"},{"s":"triagem","k":"Preparo - Conferência","a":"preparo_conferencia","f":[],"t":"texto-longo"},{"s":"triagem","k":"DPU (controle)","a":"dpu_controle","f":[],"t":"texto"},{"s":"triagem","k":"Representação","a":"representacao","f":[],"t":"lista"},{"s":"triagem","k":"ID da Procuração","a":"procuracao_id","f":[],"t":"texto"},{"s":"triagem","k":"Observação do Impedimento","a":"observacao_impedimento","f":[],"t":"texto"},{"s":"triagem","k":"Regularidade","a":"regularidade","f":[],"t":"texto"},{"s":"triagem","k":"Regularidade Manual","a":"regularidade_manual","f":[],"t":"texto-longo"},{"s":"triagem","k":"Observação da Representação","a":"observacao_representacao","f":[],"t":"texto-longo"},{"s":"triagem","k":"Tempest - Publicação","a":"tempest_publicacao","f":[],"t":"data"},{"s":"triagem","k":"Tempest - Protocolo","a":"tempest_protocolo","f":[],"t":"data"},{"s":"triagem","k":"Tempest - Prazo legal","a":"tempest_prazo_legal","f":[],"t":"numero"},{"s":"triagem","k":"Tempest - Dobro","a":"tempest_dobro","f":[],"t":"lista"},{"s":"triagem","k":"Tempest - Suspensões","a":"tempest_suspensoes","f":[],"t":"texto"},{"s":"triagem","k":"AJG","a":"ajg","f":[],"t":"texto"},{"s":"triagem","k":"Impedimento / Suspeição","a":"impedimento_suspeicao","f":[],"t":"texto"},{"s":"triagem","k":"Procurações","a":"procuracoes","f":[],"t":"tabela"},{"s":"triagem","k":"Cabimento recursal","a":"cabimento_recursal","f":[],"t":"lista"},{"s":"triagem","k":"Cabimento - Fundamento","a":"cabimento_fundamento","f":[],"t":"texto-longo"},{"s":"triagem","k":"Instrução recursal","a":"instrucao_recursal","f":[],"t":"lista"},{"s":"triagem","k":"Instrução - Pendências","a":"instrucao_pendencias","f":[],"t":"texto-longo"},{"s":"triagem","k":"Dialeticidade","a":"dialeticidade","f":[],"t":"lista"},{"s":"triagem","k":"Dialeticidade - Fundamento","a":"dialeticidade_fundamento","f":[],"t":"texto-longo"},{"s":"triagem","k":"Inovação recursal","a":"inovacao_recursal","f":[],"t":"lista"},{"s":"triagem","k":"Inovação - Pontos","a":"inovacao_pontos","f":[],"t":"texto-longo"},{"s":"triagem","k":"Reexame - Cabimento","a":"reexame_cabimento","f":[],"t":"lista"},{"s":"triagem","k":"Reexame - Fundamento","a":"reexame_fundamento","f":[],"t":"texto-longo"},{"s":"triagem","k":"AgInt - Impugnação específica","a":"agint_impugnacao_especifica","f":[],"t":"lista"},{"s":"triagem","k":"Admissibilidade - Observação","a":"admissibilidade_observacao","f":[],"t":"texto-longo"},{"s":"triagem","k":"Mídias","a":"midias","f":[],"t":"lista"},{"s":"triagem","k":"Gratuidade - Tipo de pessoa","a":"gratuidade_tipo_pessoa","f":[],"t":"lista"},{"s":"triagem","k":"MPF","a":"parecer_mpf","f":[],"t":"lista"},{"s":"triagem","k":"MPF - Custos Legis","a":"mpf_custos_legis","f":[],"t":"lista"},{"s":"triagem","k":"ID do Parecer MPF","a":"parecer_mpf_id","f":[],"t":"texto"},{"s":"triagem","k":"Parecer - Sentido","a":"parecer_sentido","f":[],"t":"lista"},{"s":"triagem","k":"MPF - Info adicional","a":"mpf_info_adicional","f":[],"t":"texto-longo"},{"s":"triagem","k":"Observação MPF","a":"observacao_mpf","f":[],"t":"texto-longo"},{"s":"triagem","k":"MPF - Data","a":"mpf_data","f":[],"t":"data"},{"s":"triagem","k":"Parecer - Sentido (outro)","a":"parecer_sentido_outro","f":[],"t":"texto"},{"s":"triagem","k":"O que falta sanar","a":"que_falta_sanar","f":[],"t":"texto-longo"},{"s":"triagem","k":"Intercorrências","a":"intercorrencias","f":[],"t":"texto-longo"},{"s":"triagem","k":"Avisos","a":"avisos","f":[],"t":"texto-longo"},{"s":"triagem","k":"ED - Vício","a":"ed_vicio","f":[],"t":"texto"},{"s":"triagem","k":"ED - Ponto","a":"ed_ponto","f":[],"t":"texto-longo"},{"s":"triagem","k":"AgInt - Fundamentos","a":"agint_fundamentos","f":[],"t":"texto-longo"},{"s":"triagem","k":"Retratação - Tribunal","a":"retratacao_tribunal","f":[],"t":"lista"},{"s":"triagem","k":"Retratação - Tema","a":"retratacao_tema","f":[],"t":"texto"},{"s":"triagem","k":"Retratação - Precedente","a":"retratacao_precedente","f":[],"t":"texto"},{"s":"triagem","k":"Retratação - Síntese","a":"retratacao_sintese","f":[],"t":"texto-longo"},{"s":"triagem","k":"Retratação - Devolução ID","a":"retratacao_devolucao_id","f":[],"t":"texto"},{"s":"triagem","k":"Retratação - Devolução órgão","a":"retratacao_devolucao_orgao","f":[],"t":"texto"},{"s":"triagem","k":"Retratação - Devolução mês","a":"retratacao_devolucao_mes","f":[],"t":"texto"},{"s":"triagem","k":"Retratação - ED","a":"retratacao_ed","f":[],"t":"lista"},{"s":"triagem","k":"Retratação - ED IDs","a":"retratacao_ed_ids","f":[],"t":"texto"},{"s":"triagem","k":"Retratação - ED data","a":"retratacao_ed_data","f":[],"t":"data"},{"s":"producao","k":"SERVIDOR","a":"servidor","f":[],"t":"texto"},{"s":"producao","k":"MINUTADO","a":"minutado","f":[],"t":"data"},{"s":"producao","k":"Refinado","a":"refinado","f":[],"t":"simnao"},{"s":"producao","k":"CORRETOR","a":"corretor","f":[],"t":"texto"},{"s":"producao","k":"CORRIGIDO","a":"corrigido","f":[],"t":"simnao"},{"s":"producao","k":"Data da Revisão","a":"data_revisao","f":[],"t":"data"},{"s":"producao","k":"Rev - Atenção","a":"rev_atencao","f":[],"t":"simnao"},{"s":"producao","k":"Rev - Mérito","a":"rev_merito","f":[],"t":"simnao"},{"s":"producao","k":"Rev - Honorários","a":"rev_honorarios","f":[],"t":"simnao"},{"s":"producao","k":"Rev - IDs","a":"rev_ids","f":[],"t":"texto"},{"s":"producao","k":"Rev - Nota de atenção","a":"rev_nota_atencao","f":[],"t":"texto-longo"},{"s":"producao","k":"Lote","a":"lote","f":[],"t":"texto"},{"s":"producao","k":"Lote - Tipo de caso","a":"lote_tipo_caso","f":[],"t":"texto"},{"s":"producao","k":"Lote - Resultado","a":"lote_resultado","f":[],"t":"texto"},{"s":"producao","k":"Lote - Variações","a":"lote_variacoes","f":[],"t":"texto"},{"s":"producao","k":"Lote - Caso","a":"lote_caso","f":[],"t":"texto-longo"},{"s":"producao","k":"Lote - Observação","a":"lote_observacao","f":[],"t":"texto-longo"},{"s":"producao","k":"Lote - Ajustes da correção","a":"lote_ajustes_correcao","f":[],"t":"tabela"},{"s":"producao","k":"Lote - Pendências","a":"lote_pendencias","f":[],"t":"texto-longo"},{"s":"producao","k":"Lote - Minuta","a":"lote_minuta","f":[],"t":"texto-longo"},{"s":"producao","k":"Rev - Ementa","a":"rev_ementa","f":[],"t":"simnao"},{"s":"producao","k":"Rev - Subementa","a":"rev_subementa","f":[],"t":"simnao"},{"s":"producao","k":"Relatório Padronizado","a":"relatorio_padronizado","f":[],"t":"simnao"},{"s":"producao","k":"Adequação Ementa","a":"adequacao_ementa","f":[],"t":"simnao"},{"s":"producao","k":"Formatação Subementa","a":"formatacao_subementa","f":[],"t":"simnao"},{"s":"producao","k":"Voto - Resultado","a":"resultado_julgamento","f":[],"t":"lista"},{"s":"producao","k":"Voto - Honorários","a":"honorarios_julgamento","f":[],"t":"lista"},{"s":"producao","k":"Tópico-síntese","a":"topico_sintese","f":[],"t":"texto"},{"s":"producao","k":"Mídias Necessárias","a":"midias_necessarias","f":[],"t":"texto"},{"s":"producao","k":"Voto - Descrição","a":"voto_descricao","f":[],"t":"texto-longo"},{"s":"triagem","k":"Tipo de Voto","a":"tipo_voto","f":[],"t":"texto"},{"s":"producao","k":"LIBERADO","a":"liberado","f":[],"t":"simnao"},{"s":"producao","k":"Data da Liberação","a":"data_liberacao","f":[],"t":"data"},{"s":"producao","k":"Mono - Tipo de ato","a":"mono_tipo_ato","f":[],"t":"lista"},{"s":"producao","k":"Mono - Fundamento","a":"mono_fundamento","f":[],"t":"texto-longo"},{"s":"producao","k":"Mono - Título","a":"mono_titulo","f":[],"t":"texto"},{"s":"producao","k":"Art. 932 - Confirmação","a":"art932_confirmacao","f":[],"t":"texto-longo"},{"s":"producao","k":"Assinado","a":"assinado","f":[],"t":"simnao"},{"s":"producao","k":"Data da Assinatura","a":"data_assinatura","f":[],"t":"data"},{"s":"producao","k":"Decisão - ID","a":"decisao_id","f":[],"t":"texto"},{"s":"producao","k":"Publicado","a":"publicado","f":[],"t":"simnao"},{"s":"producao","k":"Mono - Data da publicação","a":"mono_data_publicacao","f":[],"t":"data"},{"s":"producao","k":"Objeto do recurso","a":"objeto_recurso","f":[],"t":"texto-longo"},{"s":"producao","k":"Objeto devolvido","a":"objeto_devolvido","f":[],"t":"texto-longo"},{"s":"producao","k":"Limites do julgamento","a":"limites_julgamento","f":[],"t":"texto-longo"},{"s":"producao","k":"Matérias de ofício","a":"materias_oficio","f":[],"t":"texto-longo"},{"s":"producao","k":"Conhecimento do recurso","a":"conhecimento_recurso","f":[],"t":"lista"},{"s":"producao","k":"Preliminares acolhidas","a":"preliminares_acolhidas","f":[],"t":"texto-longo"},{"s":"producao","k":"Preliminares rejeitadas","a":"preliminares_rejeitadas","f":[],"t":"texto-longo"},{"s":"producao","k":"Prejudiciais de mérito","a":"prejudiciais_merito","f":[],"t":"texto-longo"},{"s":"producao","k":"Extensão do conhecimento","a":"extensao_conhecimento","f":[],"t":"texto-longo"},{"s":"producao","k":"Tese jurídica adotada","a":"tese_juridica_adotada","f":[],"t":"texto-longo"},{"s":"producao","k":"Dispositivos legais aplicáveis","a":"dispositivos_legais_aplicaveis","f":[],"t":"texto-longo"},{"s":"producao","k":"Precedentes aplicáveis","a":"precedentes_aplicaveis","f":[],"t":"texto-longo"},{"s":"producao","k":"Distinção de precedente","a":"distincao_precedente","f":[],"t":"texto-longo"},{"s":"producao","k":"Aplicação ao caso concreto","a":"aplicacao_ao_caso_concreto","f":[],"t":"texto-longo"},{"s":"producao","k":"Extensão da reforma","a":"extensao_reforma","f":[],"t":"texto-longo"},{"s":"producao","k":"Capítulos mantidos","a":"capitulos_mantidos","f":[],"t":"texto-longo"},{"s":"producao","k":"Capítulos reformados","a":"capitulos_reformados","f":[],"t":"texto-longo"},{"s":"producao","k":"Providências determinadas","a":"providencias_determinadas","f":[],"t":"texto-longo"},{"s":"producao","k":"Dispositivo do pronunciamento","a":"dispositivo_pronunciamento","f":[],"t":"texto-longo"},{"s":"producao","k":"Particularidades do relatório","a":"particularidades_relatorio","f":[],"t":"texto-longo"},{"s":"producao","k":"Honorários - Percentual ou valor","a":"honorarios_percentual_ou_valor","f":[],"t":"texto"},{"s":"producao","k":"Honorários - Base de cálculo","a":"honorarios_base_calculo","f":[],"t":"texto"},{"s":"producao","k":"Honorários recursais","a":"honorarios_recursais","f":[],"t":"lista"},{"s":"producao","k":"Custas no julgamento","a":"custas_julgamento","f":[],"t":"texto-longo"},{"s":"producao","k":"Gratuidade no julgamento","a":"gratuidade_julgamento","f":[],"t":"texto-longo"},{"s":"producao","k":"Juros e correção monetária","a":"juros_correcao_monetaria","f":[],"t":"texto-longo"},{"s":"producao","k":"Termo inicial dos efeitos","a":"termo_inicial_efeitos","f":[],"t":"texto"},{"s":"producao","k":"Fundamento da sucumbência","a":"fundamento_sucumbencia","f":[],"t":"texto-longo"},{"s":"producao","k":"Natureza da condenação","a":"natureza_condenacao","f":[],"t":"lista"},{"s":"producao","k":"Consectários no julgamento","a":"consectarios_julgamento","f":[],"t":"simnao"},{"s":"producao","k":"Resultado por recurso","a":"resultado_recurso","f":[],"t":"tabela"},{"s":"producao","k":"Apelação - Capítulos impugnados","a":"apelacao_capitulos_impugnados","f":[],"t":"texto-longo"},{"s":"producao","k":"Remessa - Extensão do reexame","a":"remessa_extensao_reexame","f":[],"t":"texto-longo"},{"s":"producao","k":"AI - Tutela recursal","a":"ai_tutela_recursal","f":[],"t":"texto-longo"},{"s":"producao","k":"AI - Perda do objeto","a":"ai_perda_objeto","f":[],"t":"texto-longo"},{"s":"producao","k":"ED - Vício reconhecido","a":"ed_vicio_reconhecido","f":[],"t":"texto-longo"},{"s":"producao","k":"ED - Integração","a":"ed_integracao","f":[],"t":"texto-longo"},{"s":"producao","k":"ED - Efeitos modificativos","a":"ed_efeitos_modificativos","f":[],"t":"simnao"},{"s":"producao","k":"ED - Prequestionamento","a":"ed_prequestionamento","f":[],"t":"texto-longo"},{"s":"producao","k":"AgInt - Solução","a":"agint_solucao","f":[],"t":"texto-longo"},{"s":"producao","k":"AgInt - Multa","a":"agint_multa","f":[],"t":"texto-longo"},{"s":"producao","k":"JR - Aderência ao precedente","a":"jr_aderencia_ao_precedente","f":[],"t":"texto-longo"},{"s":"producao","k":"JR - Solução","a":"jr_solucao","f":[],"t":"texto-longo"},{"s":"producao","k":"MS - Direito líquido e certo","a":"ms_direito_liquido_certo","f":[],"t":"texto-longo"},{"s":"producao","k":"MS - Prova pré-constituída","a":"ms_prova_pre_constituida","f":[],"t":"texto-longo"},{"s":"triagem","k":"Urgência","a":"urgencia","f":[],"t":"lista"},{"s":"triagem","k":"Urgência - Nível","a":"urgencia_nivel","f":[],"t":"lista"},{"s":"triagem","k":"Urgência - Data","a":"urgencia_data","f":[],"t":"data"},{"s":"triagem","k":"Urgência - Apreciação","a":"urgencia_apreciacao","f":[],"t":"lista"},{"s":"triagem","k":"Urgência - Apreciada em","a":"urgencia_apreciada","f":[],"t":"data"},{"s":"triagem","k":"Urgência - Observação","a":"urgencia_observacao","f":[],"t":"texto-longo"},{"s":"triagem","k":"Urgência - Painel","a":"urgencia_painel","f":[],"t":"simnao"},{"s":"producao","k":"Destino","a":"destino","f":[],"t":"lista"},{"s":"controles","k":"Monocrática - Registrada em","a":"monocratica_registrada","f":[],"t":"data"},{"s":"controles","k":"Monocrática - Prazo","a":"monocratica_prazo","f":[],"t":"data"},{"s":"controles","k":"Monocrática - Observação","a":"monocratica_observacao","f":[],"t":"texto-longo"},{"s":"controles","k":"Monocrática - Atualizado por","a":"monocratica_atualizado","f":[],"t":"texto"},{"s":"controles","k":"Monocrática - Atualizado em","a":"controles_monocratica_atualizado","f":[],"t":"data"},{"s":"triagem","k":"META","a":"meta","f":[],"t":"texto"},{"s":"controles","k":"Meta - Situação","a":"meta_situacao","f":[],"t":"lista"},{"s":"controles","k":"Meta - Prazo da providência","a":"meta_prazo_providencia","f":[],"t":"data"},{"s":"controles","k":"Meta - Próxima providência","a":"meta_proxima_providencia","f":[],"t":"texto"},{"s":"controles","k":"Meta - Responsável","a":"meta_responsavel","f":[],"t":"texto"},{"s":"controles","k":"Meta - Observação","a":"meta_observacao","f":[],"t":"texto-longo"},{"s":"controles","k":"Meta - Atualizado por","a":"meta_atualizado","f":[],"t":"texto"},{"s":"controles","k":"Meta - Atualizado em","a":"controles_meta_atualizado","f":[],"t":"data"},{"s":"controles","k":"Sobrestamento - Motivo","a":"sobrestamento_motivo","f":[],"t":"lista"},{"s":"controles","k":"Sobrestamento - Tema","a":"sobrestamento_tema","f":[],"t":"texto"},{"s":"controles","k":"Sobrestamento - Situação do precedente","a":"sobrestamento_situacao_precedente","f":[],"t":"lista"},{"s":"controles","k":"Sobrestamento - Previsão de retirada","a":"sobrestamento_previsao_retirada","f":[],"t":"data"},{"s":"controles","k":"Sobrestamento - Sem previsão","a":"sobrestamento_sem_previsao","f":[],"t":"simnao"},{"s":"controles","k":"Sobrestamento - Próxima providência","a":"sobrestamento_proxima_providencia","f":[],"t":"texto"},{"s":"controles","k":"Sobrestamento - Responsável","a":"sobrestamento_responsavel","f":[],"t":"texto"},{"s":"controles","k":"Sobrestamento - Observação","a":"sobrestamento_observacao","f":[],"t":"texto-longo"},{"s":"controles","k":"Sobrestamento - Atualizado por","a":"sobrestamento_atualizado","f":[],"t":"texto"},{"s":"controles","k":"Sobrestamento - Atualizado em","a":"controles_sobrestamento_atualizado","f":[],"t":"data"},{"s":"controles","k":"Sensível - Categoria","a":"sensivel_categoria","f":[],"t":"lista"},{"s":"controles","k":"Sensível - Incluído","a":"sensivel_incluido","f":[],"t":"simnao"},{"s":"controles","k":"Sensível - Excluído","a":"sensivel_excluido","f":[],"t":"simnao"},{"s":"controles","k":"Sensível - Quadro","a":"sensivel_quadro","f":[],"t":"texto-longo"},{"s":"controles","k":"Sensível - Decisão","a":"sensivel_decisao","f":[],"t":"lista"},{"s":"controles","k":"Sensível - Cumprimento","a":"sensivel_cumprimento","f":[],"t":"lista"},{"s":"controles","k":"Sensível - Última verificação","a":"sensivel_ultima_verificacao","f":[],"t":"data"},{"s":"controles","k":"Sensível - Próxima verificação","a":"sensivel_proxima_verificacao","f":[],"t":"data"},{"s":"controles","k":"Sensível - Próxima providência","a":"sensivel_proxima_providencia","f":[],"t":"texto"},{"s":"controles","k":"Sensível - Responsável","a":"sensivel_responsavel","f":[],"t":"texto"},{"s":"controles","k":"Sensível - Observação","a":"sensivel_observacao","f":[],"t":"texto-longo"},{"s":"controles","k":"Sensível - Atualizado por","a":"sensivel_atualizado","f":[],"t":"texto"},{"s":"controles","k":"Sensível - Atualizado em","a":"controles_sensivel_atualizado","f":[],"t":"data"},{"s":"pauta","k":"Status de Julgamento","a":"status_julgamento","f":[],"t":"lista"},{"s":"pauta","k":"Sessão original","a":"sessao_original","f":[],"t":"texto"},{"s":"pauta","k":"Item (Pauta de Julgamento)","a":"item_pauta_julgamento","f":[],"t":"texto"},{"s":"pauta","k":"Nova sessão de destino","a":"nova_sessao_destino","f":[],"t":"texto"},{"s":"pauta","k":"JULGAMENTO","a":"julgamento","f":[],"t":"texto"},{"s":"pauta","k":"Motivo da remarcação","a":"motivo_remarcacao","f":[],"t":"texto"},{"s":"pauta","k":"Sustentação oral","a":"sustentacao_oral","f":[],"t":"lista"},{"s":"pauta","k":"Pauta - Publicação","a":"pauta_publicacao","f":[],"t":"texto"},{"s":"pauta","k":"Pauta - Inclusão","a":"pauta_inclusao","f":[],"t":"texto"},{"s":"pauta","k":"Pauta - Proclamação","a":"pauta_proclamacao","f":[],"t":"texto"},{"s":"pauta","k":"Pauta - Último movimento","a":"pauta_ultimo_movimento","f":[],"t":"texto"},{"s":"pauta","k":"Pauta - MPU","a":"pauta_mpu","f":[],"t":"texto"},{"s":"pauta","k":"Pauta - Importado em","a":"pauta_importado","f":[],"t":"texto"}];
  function mapaFicha(modelo){var m=new Map();((modelo&&modelo.abas)||[]).forEach(function(a){(a.grupos||[]).forEach(function(gr){(gr.campos||[]).forEach(function(c){m.set((c.secao||'acervo')+'.'+c.chave,{s:c.secao||'',k:c.chave,a:c.apelido,f:c.fonte||[],t:c.tipo,aba:a.aba,grupo:gr.grupo,rotulo:c.rotulo||c.chave});});});});return m.size?Array.from(m.values()):CONTRATO_FICHA;}
  function fonteCampo(c,f){var ks=[c.k].concat(c.f||[]);if(c.f&&c.f.length>1)ks.push(c.f.join('.'));for(var i=0;i<ks.length;i++){var x=f[ks[i]];if(x!=null&&(Array.isArray(x)?x.length:S(x)))return x;}return '';}
  function aliasesFicha(modelo){var G=GB(),f=G.fo?G.fo()||{}:{},R={};mapaFicha(modelo||G.modelo&&G.modelo()).forEach(function(c){if(!c.a)return;var x=c.s?v(c.s,c.k):fonteCampo(c,f);if(x!=null&&(Array.isArray(x)?x.length:S(x)))R[c.a]=x;});return R;}
  function fo(k) { var f = (GB().fo && GB().fo()) || {}; return S(f[k]); }
  /* itens de alegação: descarta o que não é texto de razão (cabeçalho de documento, carimbo de hora, rótulo solto) */
  function linhas(t) { return S(t).split(/\n+|;\s*(?=\(?\d+\)|\w)/).map(function (l) { return S(l).replace(/^[-•·\d.)(\s]+/, '').replace(/[.;]+$/, ''); }).filter(function (l) { return l && l.split(/\s+/).length >= 3 && !/^P_|\d{2}:\d{2}:\d{2}|^(apela[çc][ãa]o|recurso|contrarraz[õo]es)$/i.test(l); }); }
  function enumerar(L) { if (!L.length) return ''; if (L.length === 1) return L[0]; return L.map(function (x, i) { return '(' + (i + 1) + ') ' + x; }).slice(0, -1).join('; ') + '; e (' + L.length + ') ' + L[L.length - 1]; }
  function ids(t) { var L = S(t).split(/[,;\s]+/).filter(function (x) { return /^\d{6,}$/.test(x); }); return !L.length ? '' : L.length === 1 ? '(ID ' + L[0] + ')' : '(ID’s ' + L.slice(0, -1).join(', ') + ' e ' + L[L.length - 1] + ')'; }
  function idOu(t, o) { return ids(t) || '(ID ' + VAL(o) + ')'; }

  /* ---------- tipo de julgamento e resultado ---------- */
  var TIPOS = ['Apelação', 'Remessa Necessária', 'Agravo de Instrumento', 'Embargos de Declaração', 'Agravo Interno', 'Juízo de Retratação'];
  function tiposReconhecidos(raw){
    var t=N(raw),out=[];
    [['Embargos de Declaração',/embargos de declara|\bed\b/],['Agravo Interno',/agravo interno|\bagint\b/],['Juízo de Retratação',/retrata|\bjr\b/],['Agravo de Instrumento',/agravo de instrumento|\bai\b/],['Apelação',/apela|\bapciv\b|\bap\b/],['Remessa Necessária',/remessa|reexame|\bremnec\b/]].forEach(function(p){if(p[1].test(t))out.push(p[0]);});
    return out;
  }
  function tipoDetectado(){
    var registrado=S(v('triagem','Tipo de Julgamento')),legado=S(v('triagem','Padrão - Espécie')),cl=fo('classe_judicial')||fo('Classe')||fo('Descrição da Classe'),L=tiposReconhecidos(registrado||legado||cl);
    if(L.length===2&&L.includes('Apelação')&&L.includes('Remessa Necessária'))return 'Apelação';
    return L.length===1?L[0]:'';
  }
  function remessaConjunta(){
    var L=tiposReconhecidos(v('triagem','Tipo de Julgamento')||fo('classe_judicial')||fo('Classe'));
    return N(v('origem','Sentença - Reexame'))==='sim'||(L.includes('Apelação')&&L.includes('Remessa Necessária'));
  }
  function syncEstado(){
    var g=GB(),cnj=g.cnj?g.cnj():'',ficha=[S(v('triagem','Tipo de Julgamento')),S(v('triagem','Padrão - Espécie')),fo('classe_judicial')||fo('Classe')].join('|');
    if(ST.cnj!==cnj){ST.cnj=cnj;ST.tipo='';ST.res='';ST.abertos={};FOLHA=[];}
    if(ST.ficha!==ficha){ST.ficha=ficha;ST.tipo='';ST.res='';}
  }
  /* resultado: chave → [voto (1ª pessoa), acórdão (3ª pessoa), conclusão da ementa (particípio)] por tipo */
  function objeto(tipo) {
    var rec = tab('origem', 'Recursos').length, rn = remessaConjunta();
    if (tipo === 'Apelação') { var ap = rec > 1 ? 'às apelações' : 'à apelação'; return { art: rec > 1 ? 'das apelações' : 'da apelação', a: rn ? ap + ' e à remessa necessária' : ap, nome: rec > 1 ? 'Apelações' : 'Apelação', fem: true, pl: rec > 1, rn: rn }; }
    if (tipo === 'Remessa Necessária') return { art: 'da remessa necessária', a: 'à remessa necessária', nome: 'Remessa necessária', fem: true };
    if (tipo === 'Agravo de Instrumento') return { art: 'do agravo de instrumento', a: 'ao agravo de instrumento', nome: 'Agravo de instrumento', fem: false };
    if (tipo === 'Agravo Interno') return { art: 'do agravo interno', a: 'ao agravo interno', nome: 'Agravo interno', fem: false };
    return { art: '', a: '', nome: '', fem: false };
  }
  function opcoesRes(tipo) {
    if(!TIPOS.includes(tipo))return [];
    if (tipo === 'Embargos de Declaração') return [['rej', 'Rejeição'], ['acol', 'Acolhimento'], ['acolp', 'Acolhimento parcial'], ['nc', 'Não conhecimento']];
    if (tipo === 'Juízo de Retratação') return [['mant', 'Mantém o acórdão'], ['retr', 'Exerce a retratação']];
    var L = [['desp', 'Desprovimento'], ['prov', 'Provimento'], ['parc', 'Parcial provimento'], ['ncdesp', 'Conhece em parte e nega'], ['nc', 'Não conhecimento'], ['prej', 'Prejudicado']];
    /* remessa necessária não se conhece "em parte" */
    return tipo === 'Remessa Necessária' ? L.filter(function (o) { return o[0] !== 'ncdesp'; }) : L;
  }
  /* sem resultado na ficha, nenhum é presumido: o gerador marca [VALIDAR] (regra: nunca escolher o resultado em silêncio) */
  function resDaFicha(tipo) {
    var r=N(v('producao','Voto - Resultado'));
    if(!r||/\b(e|mas|porem|enquanto)\b|[;\/]/.test(r))return '';
    if(tipo==='Embargos de Declaração'){
      if(/^(acolhimento parcial|parcialmente acolhidos?|parcialmente provido)$/.test(r))return 'acolp';
      if(/^(acolhimento|acolhidos?(?: (?:sem|com) efeitos? (?:infringentes?|modificativos?))?|dado provimento)$/.test(r))return 'acol';
      if(/^(rejeicao|rejeitados?|negado provimento|desprovimento)$/.test(r))return 'rej';
      return /^(nao conhecido|nao conhecimento)$/.test(r)?'nc':'';
    }
    if(tipo==='Juízo de Retratação')return /^(mantem o acordao|acordao mantido|mantido|nao exercido)$/.test(r)?'mant':/^(exerce a retratacao|retratacao exercida|retratado)$/.test(r)?'retr':'';
    if(/^(nao conhecido|nao conhecimento)$/.test(r))return 'nc';
    if(/^(parcialmente provido|parcial provimento|provimento parcial)$/.test(r))return 'parc';
    if(/^(dado provimento|provimento|provido)$/.test(r))return 'prov';
    if(/^(negado provimento|desprovimento|desprovido)$/.test(r))return 'desp';
    if(/^(prejudicado|recurso prejudicado)$/.test(r))return 'prej';
    return '';
  }
  function resultado(tipo, k) {
    if (!k) return [VAL('resultado do voto: escolha acima'), VAL('resultado do julgamento'), VAL('CONCLUSÃO'), VAL('conclusão')];
    var o = objeto(tipo), cmd = VAL('comando: para reformar a ' + (/Agravo/.test(tipo) ? 'decisão agravada' : 'sentença') + ' e …');
    if (tipo === 'Embargos de Declaração') return ({
      rej: ['rejeito os embargos de declaração', 'rejeitou os embargos de declaração', 'EMBARGOS DE DECLARAÇÃO REJEITADOS', 'Embargos de declaração rejeitados.'],
      acol: ['acolho os embargos de declaração, ' + (N(v('producao','ED - Efeitos modificativos'))==='sim'||/com efeito/.test(N(v('producao','Voto - Resultado')))?'com efeitos modificativos':N(v('producao','ED - Efeitos modificativos'))==='nao'||/sem efeito/.test(N(v('producao','Voto - Resultado')))?'sem efeitos modificativos':VAL('sem efeitos modificativos | com efeitos modificativos')) + ', para ' + VAL('sanar o vício'), 'acolheu os embargos de declaração, ' + VAL('sem efeitos modificativos | com efeitos modificativos') + ', para ' + VAL('sanar o vício'), 'EMBARGOS DE DECLARAÇÃO ACOLHIDOS', 'Embargos de declaração acolhidos.'],
      acolp: ['acolho parcialmente os embargos de declaração para, sem efeitos modificativos, ' + VAL('acrescer fundamentação …'), 'acolheu parcialmente os embargos de declaração para, sem efeitos modificativos, ' + VAL('acrescer fundamentação …'), 'EMBARGOS DE DECLARAÇÃO PARCIALMENTE ACOLHIDOS', 'Embargos de declaração parcialmente acolhidos.'],
      nc: ['não conheço dos embargos de declaração', 'não conheceu dos embargos de declaração', 'EMBARGOS DE DECLARAÇÃO NÃO CONHECIDOS', 'Embargos de declaração não conhecidos.'] })[k];
    if (tipo === 'Juízo de Retratação') return ({
      mant: ['em juízo de retratação, mantenho o acórdão ' + VAL('confirmar a fórmula do gabinete'), 'em juízo de retratação, manteve o acórdão ' + VAL('confirmar a fórmula do gabinete'), 'JUÍZO DE RETRATAÇÃO NÃO EXERCIDO', 'Acórdão mantido.'],
      retr: ['em juízo de retratação, ' + VAL('novo resultado'), 'em juízo de retratação, ' + VAL('novo resultado'), 'JUÍZO DE RETRATAÇÃO EXERCIDO', VAL('dispositivo')] })[k];
    var pp = function (m, f) { return (o.fem ? f : m) + (o.pl ? 's' : ''); }, nome = o.nome + (o.rn && o.nome === 'Apelação' ? ' e remessa necessária' : '');
    var nomeCx = nome.toUpperCase(), pl = o.pl || o.rn;
    var part = function (m, f) { var x = o.fem ? f : m; return pl ? x + (x === x.toUpperCase() ? 'S' : 's') : x; };
    return ({
      desp: ['nego provimento ' + o.a, 'negou provimento ' + o.a, nomeCx + ' ' + part('DESPROVIDO', 'DESPROVIDA'), nome + ' ' + part('desprovido', 'desprovida') + '.'],
      prov: ['dou provimento ' + o.a + ' ' + cmd, 'deu provimento ' + o.a + ' ' + cmd, nomeCx + ' ' + part('PROVIDO', 'PROVIDA'), nome + ' ' + part('provido', 'provida') + '.'],
      parc: ['dou parcial provimento ' + o.a + ' ' + cmd, 'deu parcial provimento ' + o.a + ' ' + cmd, nomeCx + ' ' + part('PARCIALMENTE PROVIDO', 'PARCIALMENTE PROVIDA'), nome + ' ' + part('parcialmente provido', 'parcialmente provida') + '.'],
      ncdesp: ['conheço em parte ' + o.art + ' e ' + (pl ? 'nego-lhes' : 'nego-lhe') + ' provimento', 'conheceu em parte ' + o.art + ' e ' + (pl ? 'negou-lhes' : 'negou-lhe') + ' provimento', nomeCx + ' ' + part('PARCIALMENTE CONHECIDO', 'PARCIALMENTE CONHECIDA') + ' E ' + part('DESPROVIDO', 'DESPROVIDA'), nome + ' ' + part('conhecido', 'conhecida') + ' em parte e, nessa extensão, ' + part('desprovido', 'desprovida') + '.'],
      nc: ['não conheço ' + o.art, 'não conheceu ' + o.art, nomeCx + ' NÃO ' + part('CONHECIDO', 'CONHECIDA'), nome + ' não ' + part('conhecido', 'conhecida') + '.'],
      prej: ['julgo ' + part('prejudicado', 'prejudicada') + ' ' + o.art.replace(/^d[ao]s? /, function (m) { return m.replace(/^d/, ''); }), 'julgou ' + part('prejudicado', 'prejudicada') + ' ' + o.art.replace(/^d[ao]s? /, function (m) { return m.replace(/^d/, ''); }), nomeCx + ' ' + part('PREJUDICADO', 'PREJUDICADA'), nome + ' ' + part('prejudicado', 'prejudicada') + '.'] })[k] || ['', '', '', ''];
  }

  /* ---------- partes ---------- */
  var PELO_NOME = [[/fazenda nacional/i, 'a Fazenda Nacional'], [/\buni[ãa]o\b/i, 'a União'], [/caixa econ[ôo]mica federal|\bcef\b/i, 'a Caixa Econômica Federal'], [/banco central|\bbacen\b/i, 'o Banco Central do Brasil']];
  function porNome(nome) { for (var i = 0; i < PELO_NOME.length; i++) if (PELO_NOME[i][0].test(nome || '')) return PELO_NOME[i][1]; return ''; }
  function feminino(nome) {
    var n = N(nome).replace(/^(o|a)\s+/, '');
    if (/^(instituto|conselho|departamento|banco|municipio|estado|fundo|servico)\b/.test(n)) return false;
    if (/^(universidade|fundacao|agencia|caixa|empresa|companhia|cooperativa|associacao|sociedade|uniao|fazenda|autarquia)\b/.test(n)) return true;
    var p = n.split(/\s+/)[0] || ''; return /a$/.test(p) && !/^(luca|joshua|nicola|elia|jonatha)$/.test(p);
  }
  function polos() {
    var a = fo('polo_ativo') || fo('Polo Ativo'), p = fo('polo_passivo') || fo('Polo Passivo');
    return { a: a.split(/;|\s+e\s+(?=[A-ZÁ-Ú])/)[0] || '', p: p.split(/;|\s+e\s+(?=[A-ZÁ-Ú])/)[0] || '', aN: a.split(';').filter(Boolean).length, pN: p.split(';').filter(Boolean).length };
  }
  /* designação pela posição na origem; pelo nome se União, CEF, BACEN ou Fazenda Nacional */
  function designa(polo) {
    var P = polos(), nome = polo === 'autor' ? P.a : P.p, nm = porNome(nome);
    if (nm) return nm;
    if(CONTEXTO)return polo==='autor'?'a parte autora':'a parte ré';
    var ms = /mandado de seguran/i.test(fo('classe_judicial') || fo('Classe'));
    if (polo === 'autor') { var f = feminino(nome); return ms ? (f ? 'a impetrante' : 'o impetrante') : (P.aN > 1 ? 'os autores' : f ? 'a autora' : 'o autor'); }
    var fr = feminino(nome); return P.pN > 1 ? 'os réus' : fr ? 'a ré' : 'o réu';
  }
  function poloDe(txt) {
    var n = N(txt); if (!n) return '';
    if (/\b(autor|autora|autores|autoras|requerente|exequente|impetrante|demandante)\b/.test(n)) return 'autor';
    if (/\b(re|reu|res|reus|requerid[oa]s?|executad[oa]s?|impetrad[oa]s?|demandad[oa]s?)\b/.test(n)) return 're';
    var P = polos();
    if (P.a && N(P.a).indexOf(n.slice(0, 12)) >= 0) return 'autor';
    if (P.p && N(P.p).indexOf(n.slice(0, 12)) >= 0) return 're';
    if (porNome(txt)) { if (P.p && porNome(P.p) === porNome(txt)) return 're'; if (P.a && porNome(P.a) === porNome(txt)) return 'autor'; }
    return '';
  }
  var TIPO = '';
  /* o nome lido na peça pode ser o do advogado: vale o polo que ele representa */
  function poloDoAdvogado(txt) {
    var n = N(txt); if (n.length < 6) return '';
    if (N(fo('advogado_pa')).indexOf(n) >= 0) return 'autor';
    if (N(fo('advogado_pp')).indexOf(n) >= 0) return 're';
    return '';
  }
  function quem(txt) {
    var nm = porNome(txt); if (nm) return nm;
    var n = N(txt), p = /\bagravante\b/.test(n) ? 'autor' : /\bagravad[oa]\b/.test(n) ? 're' : poloDe(txt) || poloDoAdvogado(txt);
    /* agravo de instrumento: a capa traz agravante e agravado; o Padrão designa pela posição na origem (autor, réu), que a capa não diz */
    if (p && TIPO === 'Agravo de Instrumento') { var P = polos(), nome = p === 'autor' ? P.a : P.p, pn = porNome(nome); if (pn) return pn; return VAL('posição na origem (o autor | o réu) — ' + (p === 'autor' ? 'agravante' : 'agravado') + (nome ? ': ' + nome : '')); }
    return p ? designa(p) : VAL(S(txt) ? 'recorrente (lido: ' + S(txt) + ')' : 'recorrente');
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* ---------- sentença ---------- */
  function confirmadosOrigem(){
    var x=tab('origem','Sentença - Comandos');
    if(!Array.isArray(x)||!x.length||x.some(function(r){return N(r.confirmado)!=='sim'||!S(r.redacao)||!S(r.id_decisao)||r.categoria==='A conferir';}))return [];
    var id=S(x[0].id_decisao),sid=S(v('origem','Sentença - ID')).split(/[,;\s]+/).filter(Boolean);
    if(x.some(function(r){return S(r.id_decisao)!==id;})||sid.length!==1||sid[0]!==id||!x.some(function(r){return r.categoria==='Resultado';}))return [];
    return x.slice().sort(function(a,b){return Number(a.ordem)-Number(b.ordem);});
  }
  function limpaComando(s){return S(s).replace(/[.;\s]+$/,'');}
  function comandosOrigem(){
    var x=confirmadosOrigem();
    if(x.length)return x.filter(function(r){return r.categoria==='Resultado'||r.categoria==='Providência'||r.categoria==='Custas / gratuidade';}).map(function(r){return limpaComando(r.redacao);}).join('; ');
    var r=resultadoSentenca(),p=S(v('origem','Sentença - Providências')).split(/\n+/).map(limpaComando).filter(function(t){return t&&r.indexOf(t)<0;});
    var aviso=tab('origem','Sentença - Comandos');return [r].concat(p).map(limpaComando).join('; ')+(Array.isArray(aviso)&&aviso.length?' '+VAL('conferir capítulos dispositivos e ID da decisão'):'');
  }
  function honorariosAbertura(){
    var h=confirmadosOrigem().filter(function(r){return r.categoria==='Honorários';});
    if(h.length)return h.map(function(r){
      var s=limpaComando(r.redacao).replace(/^fixou (?:os )?honorários advocatícios\s*/i,'Honorários advocatícios fixados ').replace(/^fixou (?:os )?honorários\s*/i,'Honorários advocatícios fixados ');
      var m=/^condenou (o|a|os|as) (.+?) ao pagamento de honorários(?: advocatícios)? (?:de|em) (.+)$/i.exec(s);
      if(m){var art={o:'do',a:'da',os:'dos',as:'das'};s='Honorários advocatícios fixados em '+m[3]+', a cargo '+art[m[1].toLowerCase()]+' '+m[2];}
      return cap(s)+'.';
    }).join(' ');
    return fraseHonorarios();
  }
  function aberturaOrigem(tipo){
    var sid=S(v('origem','Sentença - ID')),rn=remessaConjunta(),nRec=tab('origem','Recursos').length;
    var ab=tipo==='Remessa Necessária'?'Trata-se de remessa necessária de sentença ':rn?'Trata-se de remessa necessária e de apelação interposta contra sentença ':nRec>2?'Trata-se de apelações à sentença ':nRec===2?'Trata-se de dupla apelação à sentença ':'Trata-se de apelação à sentença ';
    return ab+idOu(sid,'ID da sentença')+' que '+comandosOrigem()+'. '+honorariosAbertura();
  }
  function resultadoSentenca(oque) {
    var r = S(v('origem', 'Sentença - Resultado')), d = N(v('origem', 'Sentença - Decisão'));
    if (r) {
      r = r.replace(/\b(IMPROCEDENTES?|PROCEDENTES?|PARCIALMENTE|EXTINTO|EXTINTA)\b/g, function(m){return m.toLowerCase();}).replace(/^(?:o juiz|a ju[íi]za|a sentença)\s+/i, '')
        .replace(/,?\s*(?:e\s+)?(?:resolvendo|com resolu[çc][ãa]o|extinguindo o (?:processo|feito) com|nos termos d[oe] (?:art|artigo))[\s\S]*$/i, '').replace(/[.;,\s]+$/, '');
      if (!/^(julgou|extinguiu|denegou|concedeu|homologou|indeferiu|deferiu|rejeitou|acolheu|reconheceu|declarou|condenou|determinou)/i.test(r)) r = VAL('verbo nuclear') + ' ' + r;
      return r;
    }
    return d === 'procedente' ? 'julgou procedente o pedido' : d === 'improcedente' ? 'julgou improcedente o pedido' : d === 'parcialmente procedente' ? 'julgou parcialmente procedente o pedido' : /extin/.test(d) ? 'extinguiu o processo sem resolução do mérito' : /homolog/.test(d) ? 'homologou ' + VAL('o acordo | a desistência') : VAL('o que a ' + (oque || 'sentença') + ' decidiu');
  }
  /* "Parte ré (INSS) · 10% sobre o valor da condenação (Súmula 111/STJ) · exigibilidade suspensa (…)" → frase do relatório */
  function fraseHonorarios() {
    var h = S(v('origem', 'Sentença - Honorários')); if (!h) return VAL('honorários fixados na sentença');
    return h.split(/\s*\|\s*/).map(function (um) {
      var p = um.split(/\s*·\s*/), q = p[0] || '';
      if (/^sem honor/i.test(q)) { var m = /\(([^)]+)\)/.exec(q); return 'Sem condenação em honorários advocatícios' + (m ? ' (' + m[1].replace(/^(mandado de segurança|Juizado):\s*/, '') + ')' : '') + '.'; }
      if (!/^(parte|ambas|\[VALIDAR)/i.test(q)) return cap(um.replace(/[.;]\s*$/, '')) + '.';
      var valor = p[1] || VAL('valor'), obs = p.slice(2), sum = /\(Súmula 111\/STJ\)/.test(valor); valor = valor.replace(/\s*\(Súmula 111\/STJ\)/, '');
      var dev = /^ambas/i.test(q) ? '' : /\(([^)]+)\)/.exec(q) ? quem(/\(([^)]+)\)/.exec(q)[1]) : /autora/i.test(q) ? designa('autor') : /r[ée]/i.test(q) ? designa('re') : VAL('quem paga');
      var fr = /^ambas/i.test(q) ? 'Fixou honorários advocatícios em sucumbência recíproca, em ' + valor : 'Condenou ' + dev + ' ao pagamento de honorários advocatícios de ' + valor;
      if (sum) fr += ', observada a Súmula 111/STJ';
      obs.forEach(function (o) { if (/equidade/.test(o)) fr += ', fixados por equidade (artigo 85, § 8º, do CPC)'; else if (/exigibilidade/.test(o)) fr += ', com exigibilidade suspensa pela gratuidade de justiça (artigo 98, § 3º, do CPC)'; else if (/DPU/.test(o)) fr += ', em favor da Defensoria Pública da União'; else fr += ', ' + o; });
      return fr + '.';
    }).join(' ');
  }

  /* ---------- relatório ---------- */
  function pRecursos(tipo) {
    var R = tab('origem', 'Recursos'), verbo = tipo === 'Agravo de Instrumento' ? 'Agravou' : 'Apelou', out = [];
    if (!R.length) {
      var al = linhas(v('triagem', 'Alegações'));
      out.push(verbo + ' ' + VAL('a parte recorrente') + ' (ID ' + VAL('ID do recurso') + '), alegando, em suma, que: ' + (al.length ? enumerar(al) : VAL('razões, em itens')) + '.');
      return out;
    }
    /* recurso único sem parte lida e contrarrazões de um polo identificado: recorreu o outro polo */
    var C0 = tab('origem', 'Contrarrazões'), pc = R.length === 1 && C0.length === 1 && !S(R[0].parte) ? poloDe(C0[0].parte) : '';
    if (pc) R = [Object.assign({}, R[0], { parte: pc === 're' ? 'autor' : 're' })];
    R.forEach(function (r) {
      /* o título da peça ("Agravo de Instrumento - Fulana x Beltrano", "petição inicial Laerte") não é alegação */
      var rotulo = function (x) { return /\s[xX]\s/.test(x) || /^(agravo|apela[çc][ãa]o|peti[çc][ãa]o|recurso|contrarraz|embargos)\b/i.test(x) && x.split(/\s+/).length <= 8; };
      var L = linhas(r.preliminares).map(function (x) { return 'preliminarmente, ' + x; }).concat(linhas(r.teses).concat(linhas(r.merito)).filter(function (x) { return !rotulo(x); }));
      if (!L.length && R.length === 1) L = linhas(v('triagem', 'Alegações'));
      var ped = S(r.pedidos);
      out.push(verbo + ' ' + quem(r.parte) + ' ' + idOu(r.ids, 'ID do recurso') + ', alegando, em suma, que: ' + (L.length ? enumerar(L) : VAL('razões, em itens')) + (ped ? ', pelo que requereu ' + ped.replace(/^(requer(eu)?|pede)\s+/i, '').replace(/[.;]+$/, '') : '') + '.');
    });
    return out;
  }
  function pContrarrazoes(tipo) {
    var C = tab('origem', 'Contrarrazões'), sit = N(v('origem', 'Contrarrazões - Situação')), nome = /agravo/.test(N(tipo)) ? 'contraminuta' : 'contrarrazões';
    if (C.length) {
      if(/^(nao|nao apresentadas?|nao houve|sem contrarrazoes|sem contraminuta|prazo decorrido sem manifestacao)$/.test(sit))return VAL('divergência entre a situação e as peças de resposta registradas');
      var com = C.filter(function (c) { return S(c.preliminares); });
      if (C.length === 1) return 'Houve ' + nome + ' ' + idOu(C[0].ids, 'ID') + (com.length ? ', com arguição preliminar de ' + linhas(com[0].preliminares).join('; ') : '') + '.';
      return 'Houve ' + nome + ' ' + C.map(function (c, i) { var q = quem(c.parte), d = q.replace(/^(o|a) /, function (m) { return m === 'o ' ? 'do ' : 'da '; }).replace(/^os /, 'dos '); return d + ' ' + idOu(c.ids, 'ID') + (S(c.preliminares) ? ', com arguição preliminar de ' + linhas(c.preliminares).join('; ') : ''); }).reduce(function (a, x, i, L) { return a + (i === 0 ? '' : i === L.length - 1 ? ' e ' : ', ') + x; }, '') + '.';
    }
    if (/^(nao|nao apresentadas?|nao houve|sem contrarrazoes|sem contraminuta|prazo decorrido sem manifestacao|decorrido o prazo sem manifestacao)$/.test(sit)) return 'Não houve ' + nome + '.';
    if (/apresent/.test(sit)) return 'Houve ' + nome + ' (ID ' + VAL('ID') + ').';
    return VAL('Houve ' + nome + ' (ID …). | Não houve ' + nome + '.');
  }
  function pMpf(){
    var m=N(v('triagem','MPF')),s=N(v('triagem','Parecer - Sentido')),id=S(v('triagem','ID do Parecer MPF')),outro=S(v('triagem','Parecer - Sentido (outro)')),o=N(outro),t='';
    if(!id&&m==='nao se aplica')return '';
    if(!id&&m==='intimado sem manifestacao')return 'Intimada, a Procuradoria Regional da República não se manifestou.';
    if(!id&&m!=='com parecer')return VAL('verificar situação do MPF');
    if(m&&m!=='com parecer')return VAL('conferir situação da manifestação do MPF e ID');
    if(/^(sem hipotese de intervencao|ausencia de hipotese de intervencao)$/.test(s)||/^(sem hipotese de intervencao|ausencia de hipotese de intervencao)$/.test(o))return 'A Procuradoria Regional da República '+idOu(id,'ID do parecer')+' deixou de opinar quanto ao mérito, por ausência de hipótese de intervenção.';
    if(/^(sem interesse publico|inexistencia de interesse publico)$/.test(s)||/^(sem interesse publico|inexistencia de interesse publico)$/.test(o))t='opinou pela inexistência de interesse público para intervenção no feito';
    else if(/^(sem exame do merito|nao se manifestou sobre o merito)$/.test(s)||/^(sem exame do merito|nao se manifestou sobre o merito)$/.test(o))t='não se manifestou sobre o mérito da demanda';
    else if(/prosseguimento/.test(s))t='opinou pelo regular prosseguimento do feito';
    else if(/desprovimento|nao provimento/.test(s))t='opinou pelo desprovimento do recurso';
    else if(/parcial.*provimento|provimento.*parcial/.test(s))t='opinou pelo parcial provimento do recurso';
    else if(/^provimento( do recurso)?$/.test(s))t='opinou pelo provimento do recurso';
    else t='opinou '+VAL(outro||'sentido do parecer');
    return 'A Procuradoria Regional da República '+t+' '+idOu(id,'ID do parecer')+'.';
  }
  /* Identidade do ato recorrido: só campo explicitamente impugnado ou ato marcado na origem. */
  function atoRecorrido(tipo){
    var imp=S(v('triagem','Impugnada - ID')),si=S(v('triagem','Impugnada - Síntese')),id='',texto='';
    if(/^(Embargos de Declaração|Juízo de Retratação)$/.test(tipo)&&N(v('origem','2G - Acórdão recorrido'))==='sim'){id=S(v('producao','Acórdão - ID'));texto=S(v('origem','2G - Acórdão Resultado'));}
    if(tipo==='Agravo de Instrumento'&&N(v('origem','1G - Decisão recorrida'))==='sim'){id=S(v('origem','1G - Decisão ID'));texto=S(v('origem','1G - Decisão Resultado'));}
    if(tipo==='Agravo Interno'&&N(v('origem','2G - Monocrática recorrida'))==='sim'){id=S(v('origem','2G - Monocrática ID'));texto=S(v('origem','2G - Monocrática Resultado'));}
    if(imp&&id&&imp!==id)return {id:VAL('divergência entre IDs do ato impugnado'),sintese:VAL('conferir ato impugnado')};
    return {id:imp||id,sintese:si||texto};
  }
  function relatorio(tipo) {
    if(!TIPOS.includes(tipo))return [VAL('definir tipo de julgamento e fórmula aplicável')];
    var P = [], sid = S(v('origem', 'Sentença - ID')), rn = remessaConjunta(), nRec = tab('origem', 'Recursos').length;
    var imp = S(v('triagem', 'Impugnada - ID')), impS = S(v('triagem', 'Impugnada - Síntese'));
    if (tipo === 'Embargos de Declaração') {
      P.push('Trata-se de embargos de declaração contra acórdão '+idOu(atoRecorrido(tipo).id,'ID do acórdão embargado')+' assim ementado:');
      var literal=S(v('triagem','Impugnada - Ementa literal'))||(N(v('origem','2G - Acórdão recorrido'))==='sim'?S(v('origem','2G - Acórdão Ementa')):'');P.push(literal?'“'+literal+'”':VAL('transcrever a ementa literal do acórdão embargado'));
      var pts = linhas(v('triagem', 'ED - Ponto')).concat(linhas(v('triagem', 'Alegações')));
      var vicio = S(v('triagem', 'ED - Vício')).toLowerCase() || VAL('vício alegado');
      P.push('Alegou-se ' + vicio + ', inclusive em prequestionamento, pois: ' + (pts.length ? enumerar(pts) : VAL('pontos, em itens')) + '.');
    } else if (tipo === 'Agravo Interno') {
      P.push('Trata-se de agravo interno à decisão ' + idOu(atoRecorrido(tipo).id, 'ID da decisão agravada') + ' que ' + (atoRecorrido(tipo).sintese || VAL('o que a decisão decidiu')) + '.');
      var fa = linhas(v('triagem', 'AgInt - Fundamentos')).concat(linhas(v('triagem', 'Alegações')));
      var R0 = tab('origem', 'Recursos')[0] || {};
      P.push('Alegou ' + (R0.parte ? quem(R0.parte).replace(/^(a|o) (autora?|réu|ré)$/, function (m, a, b) { return a + ' agravante'; }) : 'o agravante') + ', em suma ' + idOu(R0.ids, 'ID do agravo') + ': ' + (fa.length ? enumerar(fa) : VAL('razões, em itens')) + '.');
      P.push(pContrarrazoes(tipo).replace(/contrarrazões/g, 'contraminuta'));
    } else if (tipo === 'Juízo de Retratação') {
      P.push('Trata-se de juízo de retratação a acórdão da Turma, proferido em ' + (S(v('triagem', 'Impugnada - Data')) ? brD(v('triagem', 'Impugnada - Data')) : VAL('data')) + ', assim ementado ' + idOu(atoRecorrido(tipo).id, 'ID do acórdão') + ':');
      P.push('“' + (S(v('triagem','Impugnada - Ementa literal')) || (N(v('origem','2G - Acórdão recorrido'))==='sim'?S(v('origem','2G - Acórdão Ementa')):'') || VAL('ementa literal do acórdão')) + '”');
      var trib = S(v('triagem', 'Retratação - Tribunal')), tema = S(v('triagem', 'Retratação - Tema')), prec = S(v('triagem', 'Retratação - Precedente'));
      P.push('Na tramitação dos recursos excepcionais perante a Vice-Presidência, houve, em ' + (S(v('triagem', 'Retratação - Devolução mês')) || VAL('mês/ano')) + ', decisão para devolução dos autos à Turma para eventual juízo de retratação face ao julgamento do ' + (prec || VAL('precedente')) + ' ' + (trib === 'STJ' ? 'pelo Superior Tribunal de Justiça' : trib==='STF'?'pela Suprema Corte':VAL('tribunal do precedente')) + ' (Tema ' + (tema || VAL('número')) + ') ' + idOu(v('triagem', 'Retratação - Devolução ID'), 'ID') + '.');
    } else if (tipo === 'Agravo de Instrumento') {
      /* O ID da decisão agravada não é o ID genérico da sentença. */
      P.push('Trata-se de agravo de instrumento à decisão ' + idOu(atoRecorrido(tipo).id, 'ID da decisão agravada') + ' que ' + (atoRecorrido(tipo).sintese||VAL('o que a decisão agravada decidiu')) + '.');
      pRecursos(tipo).forEach(function (x) { P.push(x); });
      P.push(pContrarrazoes(tipo));
    } else if (tipo === 'Remessa Necessária') {
      P.push(aberturaOrigem(tipo));
      P.push(nRec ? VAL('há recurso voluntário: conferir o tipo de julgamento') : 'Sem recurso voluntário, subiram os autos por força da remessa necessária.');
    } else {
      var ab = rn ? 'Trata-se de remessa necessária e de apelação interposta contra sentença ' : nRec > 2 ? 'Trata-se de apelações à sentença ' : nRec === 2 ? 'Trata-se de dupla apelação à sentença ' : 'Trata-se de apelação à sentença ';
      P.push(aberturaOrigem(tipo));
      pRecursos(tipo).forEach(function (x) { P.push(x); });
      P.push(pContrarrazoes(tipo));
    }
    var mp = pMpf(); if (mp) P.push(mp);
    P.push('É o relatório.');
    return P;
  }
  function brD(x) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(x)); return m ? m[3] + '/' + m[2] + '/' + m[1] : S(x); }

  /* ---------- ementa ---------- */
  var RAMOS = [[/previdenc|inss|aposentad|auxilio|beneficio|pensao por morte|salario-maternidade|bpc|loas|assistencial/, 'PREVIDENCIÁRIO'], [/tribut|contribui|pis|cofins|imposto|irpf|irpj|ipi|icms|taxa|execucao fiscal|cda/, 'TRIBUTÁRIO'],
    [/servidor|28,86|militar|licenciamento|concurso|improbidade|licitacao|administrativ|perdimento|aduan/, 'ADMINISTRATIVO'], [/sfh|mcmv|minha casa|contrato|dano moral|responsabilidade civil|consumidor|fies|caixa/, 'CIVIL'],
    [/saude|medicamento|sus\b|tratamento/, 'CONSTITUCIONAL E ADMINISTRATIVO'], [/ambient|ibama/, 'AMBIENTAL'], [/indigena|funai|terra/, 'CONSTITUCIONAL']];
  function ramo() {
    var informado=S(v('triagem','Ramo do direito'));if(informado)return informado.replace(/^direito\s+/i,'').toUpperCase();
    var t = N([fo('Assunto'), v('triagem', 'Assunto detalhado'), v('triagem', 'Registro - Assunto detalhado'), v('triagem', 'Detalhamento do caso')].join(' '));
    for (var i = 0; i < RAMOS.length; i++) if (RAMOS[i][0].test(t)) return RAMOS[i][1];
    return VAL('RAMO');
  }
  function classeEmenta(tipo) {
    var cl = N(fo('classe_judicial') || fo('Classe')), base = /agravo de instrumento/.test(cl) ? 'AGRAVO DE INSTRUMENTO' : /remessa/.test(cl) && !/apela/.test(cl) ? 'REMESSA NECESSÁRIA' : /mandado/.test(cl) ? 'APELAÇÃO EM MANDADO DE SEGURANÇA' : 'APELAÇÃO CÍVEL';
    if (tipo === 'Embargos de Declaração') return 'EMBARGOS DE DECLARAÇÃO EM ' + base;
    if (tipo === 'Agravo Interno') return 'AGRAVO INTERNO EM ' + base;
    if (tipo === 'Juízo de Retratação') return 'JUÍZO DE RETRATAÇÃO EM ' + base;
    if (tipo === 'Remessa Necessária') return 'REMESSA NECESSÁRIA';
    if (tipo === 'Agravo de Instrumento') return 'AGRAVO DE INSTRUMENTO';
    return remessaConjunta() ? 'REMESSA NECESSÁRIA E ' + base : base;
  }
  function assuntoCx() {
    var a = S(v('triagem', 'Registro - Assunto detalhado')) || S(v('triagem', 'Assunto detalhado')) || fo('Assunto');
    a = a.replace(/\s*\(\d+\)\s*/g, ' ').split(/\s*[|›>]\s*|\s*-\s+(?=[A-ZÁ-Ú])/).filter(Boolean).slice(-2).join('. ');
    return a ? a.toUpperCase().replace(/\.+$/, '') : VAL('ASSUNTO');
  }
  /* Questões: apenas análise confirmada compõe o julgamento; alegação nunca é tese adotada. */
  function questoesFicha(){
    return tab('triagem','Questões jurídicas individualizadas').filter(function(q){return S(q.questao)||S(q.alegacao);}).sort(function(a,b){return (Number(a.ordem)||0)-(Number(b.ordem)||0);});
  }
  function questaoConfirmada(q){return N(q.confirmado)==='sim';}
  function textoQuestao(q){return S(q.questao)||S(q.alegacao);}
  function fundamentosQuestao(q){
    if(!questaoConfirmada(q))return VAL('conferir questão: '+textoQuestao(q));
    var L=[S(q.tese_adotada),S(q.fundamentacao),S(q.solucao)].filter(Boolean);
    return L.length&&S(q.fundamentacao)?L.join('\n\n'):VAL('fundamentar: '+textoQuestao(q));
  }
  function refsQuestoes(k){
    var L=questoesFicha().filter(questaoConfirmada).map(function(q){return S(q[k]);}).filter(Boolean);
    var global=S(v('producao',k==='precedentes'?'Precedentes aplicáveis':'Dispositivos legais aplicáveis'));
    if(global)L.unshift(global);return Array.from(new Set(L)).join('; ');
  }
  function resultadosIndividuais(tipo){
    var R=tab('origem','Recursos'),J=tab('producao','Resultado por recurso');
    if(R.length<2&&!J.length)return null;
    if(!/^(Apelação|Agravo de Instrumento|Agravo Interno)$/.test(tipo))return {v:VAL('individualizar resultado de cada recurso'),e:VAL('resultado individualizado')};
    var used=new Set(),V=[],E=[],invalid=false;
    R.forEach(function(r){
      var idsR=S(r.ids).match(/\b\d{6,}\b/g)||[],L=J.filter(function(j){return idsR.indexOf(S(j.id_recurso))>=0;});
      if(L.length!==1||used.has(L[0])){invalid=true;return;}
      var j=L[0];used.add(j);
      var nome=S(r.parte),rot=N(j.resultado),a={'desprovido':'nego provimento','provido':'dou provimento','parcialmente provido':'dou parcial provimento','nao conhecido':'não conheço','prejudicado':'julgo prejudicado'}[rot];
      if(!nome||!a||(S(j.recorrente)&&N(j.recorrente)!==N(nome))){invalid=true;return;}
      var gen=(/^INSS$/i.test(nome)?'o INSS':quem(nome)).replace(/^o /i,'do ').replace(/^a /i,'da ').replace(/^os /i,'dos ').replace(/^as /i,'das ');if(!/^(d[oa]s?) /i.test(gen))gen='de '+nome;var nom=tipo==='Apelação'?'apelação':tipo==='Agravo Interno'?'agravo interno':'agravo de instrumento',fem=tipo==='Apelação';var alvo=(rot==='nao conhecido'?(fem?' da ':' do ')+nom+' ':rot==='prejudicado'?' o recurso ':(fem?' à ':' ao ')+nom+' ')+gen;
      V.push(a+alvo+(/^(provido|parcialmente provido)$/.test(rot)?' '+VAL('comando específico do recurso ID '+S(j.id_recurso)):''));
      E.push(cap(nom)+' '+gen+': '+(fem?S(j.resultado).toLowerCase().replace(/o$/,'a'):S(j.resultado).toLowerCase()));
    });
    if(invalid||used.size!==J.length||R.length!==V.length)return {v:VAL('conferir resultado individual por ID de recurso'),e:VAL('resultado individual por recurso')};
    if(remessaConjunta()){V.push(VAL('resultado da remessa necessária'));E.push(VAL('resultado da remessa necessária'));}
    return {v:V.join('; '),e:E.join('; ') + '.'};
  }
  function dispositivoFicha(tipo,k){var ind=resultadosIndividuais(tipo);return S(v('producao','Dispositivo do pronunciamento'))||'Ante o exposto, '+(ind?ind.v:resultado(tipo,k)[0])+'.';}
  function ementa(tipo, k) {
    if(!TIPOS.includes(tipo))return {cab:VAL('definir tipo de julgamento'),sec:[['I. Caso em exame',[]],['II. Questão em discussão',[]],['III. Razões de decidir',[]],['IV. Dispositivo',[]]],rod:['Dispositivos relevantes citados: '+VAL('conferir tipo de julgamento'),'Jurisprudência relevante citada: '+VAL('conferir tipo de julgamento')]};
    var R = resultado(tipo, k), n = 0, it = function (t) { n++; return { n: n, t: t }; }, I = [], II = [], III = [], IV = [];
    var indiv=resultadosIndividuais(tipo); var cab = 'DIREITO ' + ramo() + '. ' + classeEmenta(tipo) + '. ' + assuntoCx() + '. ' + (indiv?'RESULTADOS INDIVIDUALIZADOS':R[2]) + '.';
    if (tipo === 'Embargos de Declaração') I.push(it('Embargos de declaração opostos contra acórdão que ' + VAL('resultado do acórdão embargado') + ', alegando ' + (S(v('triagem', 'ED - Vício')).toLowerCase() || VAL('vício alegado')) + '.'));
    else if (tipo === 'Agravo Interno') I.push(it('Agravo interno contra decisão que ' + (S(v('triagem', 'Impugnada - Síntese')) || VAL('o que a decisão decidiu')) + '.'));
    else if (tipo === 'Juízo de Retratação') I.push(it('Juízo de retratação de acórdão da Turma, após devolução dos autos pela Vice-Presidência, em razão do Tema ' + (S(v('triagem', 'Retratação - Tema')) || VAL('número')) + '.'));
    else if (tipo === 'Remessa Necessária') I.push(it('Remessa necessária de sentença que ' + resultadoSentenca() + '.'));
    else if (tipo === 'Agravo de Instrumento') I.push(it('Agravo de instrumento contra decisão que ' + (atoRecorrido(tipo).sintese||VAL('o que a decisão agravada decidiu')) + '.'));
    else I.push(it((remessaConjunta() ? 'Remessa necessária e ' + (tab('origem', 'Recursos').length > 1 ? 'apelações' : 'apelação') : tab('origem', 'Recursos').length > 1 ? 'Apelações' : 'Apelação') + ' contra sentença que ' + resultadoSentenca() + '.'));
    var Q = linhas(v('triagem', 'Alegações')); if (!Q.length) Q = linhas(v('triagem', 'ED - Ponto'));
    if (Q.length <= 1) II.push(it('A questão em discussão consiste em saber se ' + VAL(Q[0] ? 'reescrever como pergunta: ' + Q[0] : 'questão') + '.'));
    else { var nn = ['duas', 'três', 'quatro', 'cinco', 'seis'][Math.min(Q.length, 6) - 2]; II.push(it('Há ' + nn + ' questões em discussão: ' + Q.slice(0, 6).map(function (q, i) { return '(' + ['i', 'ii', 'iii', 'iv', 'v', 'vi'][i] + ') saber se ' + VAL(q); }).reduce(function (a, x, i, L) { return a + (i === 0 ? '' : i === L.length - 1 ? '; e ' : '; ') + x; }, '') + '.')); }
    (Q.length ? Q.slice(0, 6) : ['']).forEach(function (q, i) { III.push(it(VAL('fundamento' + (Q.length > 1 ? ' da questão (' + ['i', 'ii', 'iii', 'iv', 'v', 'vi'][i] + ')' : '')))); });
    var QF=questoesFicha();
    if(QF.length){n=I.length;II=[];III=[];QF.forEach(function(q){II.push(it(questaoConfirmada(q)&&S(q.questao)?S(q.questao):VAL('delimitar: '+textoQuestao(q))));});QF.forEach(function(q){III.push(it(fundamentosQuestao(q)));});}
    else if(S(v('producao','Tese jurídica adotada'))&&S(v('producao','Aplicação ao caso concreto'))){n=I.length+II.length;III=[it(S(v('producao','Tese jurídica adotada'))+' '+S(v('producao','Aplicação ao caso concreto')))];}
    IV.push(it(indiv?indiv.e:R[3]));
    return { cab: cab, sec: [['I. Caso em exame', I], ['II. Questão em discussão', II], ['III. Razões de decidir', III], ['IV. Dispositivo', IV]],
      rod: ['Dispositivos relevantes citados: ' + (refsQuestoes('dispositivos_legais')||VAL('dispositivos legais aplicáveis')) + '.', 'Jurisprudência relevante citada: ' + (refsQuestoes('precedentes')||VAL('precedentes aplicáveis')) + '.'] };
  }

  /* ---------- montagem ---------- */
  function inventarioFicha(){
    var G=GB(),F=G.modelo&&G.modelo(),fonte=G.fo?G.fo()||{}:{},A=CONTEXTO?null:window.MutaAutos,sug=A&&A.sugestoes?A.sugestoes():[],by=new Map(),L=[];
    sug.forEach(function(s){if(s&&s.alvo){var x=by.get(s.alvo)||[];x.push(s);by.set(s.alvo,x);}});
    mapaFicha(F).forEach(function(c){
      var id=(c.s||'acervo')+'.'+c.k,x=c.s?v(c.s,c.k):fonteCampo(c,fonte),ss=by.get(id)||[];
      var reg=Array.isArray(x)?x.length>0:!!S(x)&&!/\[VALIDAR:/.test(S(x));
      var pend=ss.filter(function(s){return s.status!=='igual'&&!(A.preenchido&&A.preenchido(s.alvo));});
      var docs=Array.from(new Set(ss.flatMap(function(s){return S(s.doc).match(/\b\d{6,}\b/g)||[];})));
      L.push({alvo:id,rotulo:c.rotulo||c.k,aba:c.aba,grupo:c.grupo,tipo:c.t,apelido:c.a,valor:x,registrado:reg,estado:pend.some(function(s){return s.status==='conflito';})?'Divergência':pend.length?'Extraído · a conferir':reg?(ss.some(function(s){return s.status==='igual';})?'Coincidente com os autos':A&&A.preenchido&&A.preenchido(id)?'Preenchido pelos autos':'Registrado'):'Sem registro',docs:docs.join(', '),pendente:pend.length>0});
    });return L;
  }
  function dependenciasCobertura(a,tipo){
    var D=[a],G=[],analise=false;
    function add(keys,groups){D=D.concat(keys||[]);G=G.concat(groups||[]);}
    if(a==='triagem.Assunto detalhado')add(['acervo.Assunto'],['Petição inicial','Recursos']);
    if(/^origem\.Sentença - /.test(a))add(a==='origem.Sentença - ID'?[]:a==='origem.Sentença - Resultado'?['origem.Sentença - ID','origem.Sentença - Comandos','origem.Sentença - Decisão']:['origem.Sentença - ID','origem.Sentença - Comandos'],['Sentença']);
    if(/^triagem\.Impugnada - /.test(a)){
      if(tipo==='Agravo de Instrumento')add(['origem.1G - Decisão recorrida','origem.1G - Decisão ID','origem.1G - Decisão Resultado'],['Decisão recorrida','Decisões']);
      else if(tipo==='Agravo Interno')add(['origem.2G - Monocrática recorrida','origem.2G - Monocrática ID','origem.2G - Monocrática Resultado'],['Decisão recorrida','Decisões']);
      else add(['origem.2G - Acórdão recorrido','producao.Acórdão - ID','origem.2G - Acórdão Ementa'],['Decisão recorrida','Acórdão']);
    }
    if(a==='origem.Recursos'||/^triagem\.ED - /.test(a))add(['origem.Recursos'],['Recursos']);
    if(a==='origem.Contrarrazões - Situação')add(['origem.Contrarrazões'],['Contrarrazões']);
    if(a==='triagem.MPF')add(['triagem.ID do Parecer MPF','triagem.Parecer - Sentido','triagem.Parecer - Sentido (outro)'],['Parecer / manifestação MPF']);
    if(a==='triagem.Tempestividade por recurso')add(['origem.Recursos','triagem.Tempest - Protocolo','triagem.Tempest - Publicação'],['Recursos']);
    if(a==='triagem.Questões jurídicas individualizadas')add(['triagem.Alegações','origem.Recursos'],['Recursos']);
    if(a==='producao.Aplicação ao caso concreto'){add(['triagem.Questões jurídicas individualizadas','producao.Tese jurídica adotada'],[]);analise=true;}
    if(a==='producao.Voto - Resultado'){add(['producao.Resultado por recurso'],[]);analise=true;}
    if(a==='producao.Fundamento da sucumbência'){add(['producao.Resultado por recurso','origem.Sentença - Honorários'],[]);analise=true;}
    return {campos:Array.from(new Set(D)),grupos:Array.from(new Set(G)),analise:analise};
  }
  function cruzarCobertura(L,I,grupos,tipo){
    var by=new Map(I.map(function(c){return [c.alvo,c];})),byGroup=new Map((grupos||[]).map(function(x){return [x.label,x.rows||[]];})),docMap=new Map();
    (grupos||[]).forEach(function(gr){(gr.rows||[]).forEach(function(d){if(!docMap.has(S(d.id))||d.src==='cronologia')docMap.set(S(d.id),d);});});
    return L.map(function(c){
      var dep=dependenciasCobertura(c.alvo,tipo),fs=dep.campos.map(function(k){return by.get(k);}).filter(Boolean),direct=by.get(c.alvo),pending=fs.filter(function(f){return f.pendente;}),conflict=pending.some(function(f){return f.estado==='Divergência';});
      var refs=Array.from(new Set(fs.flatMap(function(f){return S(f.docs).match(/\b\d{6,}\b/g)||[];})));
      fs.forEach(function(f){if(/(?:\.ID do | - ID$| ID$)/.test(f.alvo))refs=refs.concat(S(f.valor).match(/\b\d{6,}\b/g)||[]);if(Array.isArray(f.valor))f.valor.forEach(function(r){['ids','id_recurso','id_decisao','id_intimacao','id_guia','id_comprovante','documentos'].forEach(function(k){refs=refs.concat(S(r&&r[k]).match(/\b\d{6,}\b/g)||[]);});});});
      refs=Array.from(new Set(refs));var candidates=[],seen=new Set(refs);
      dep.grupos.forEach(function(k){(byGroup.get(k)||[]).forEach(function(d){var id=S(d.id);if(d.src==='ficha'||seen.has(id))return;seen.add(id);candidates.push({id:id,src:d.src,grupo:k});});});
      var ok=c.ok&&!conflict&&!pending.length;
      return Object.assign({},c,{ok:ok,estado:conflict?'Divergência':pending.length?'Extraído · a conferir':ok?'Registrado':dep.analise?'Análise jurídica pendente':candidates.length?'Peça localizada · a conferir':direct&&direct.registrado?'Registro incompleto':'Sem registro',campos:fs,refs:refs.map(function(id){return {id:id,src:(docMap.get(id)||{}).src||'ficha'};}),candidatos:candidates});
    });
  }
  function htmlRefsCobertura(L){return L.slice(0,6).map(function(d){return d.src==='cronologia'?'<button type="button" class="lnk au-cov-id" data-au="loc:'+esc(d.id)+'">ID '+esc(d.id)+' ↗</button>':'<span class="au-cov-id">ID '+esc(d.id)+(d.src==='1g'?' · 1º grau':' · ficha')+'</span>';}).join('')+(L.length>6?'<small class="muted">+'+(L.length-6)+'</small>':'');}
  function htmlLinhaCobertura(c){
    return '<div class="au-group-row au-cov-row"><div class="au-cov-main"><b>'+esc(c.rotulo)+'</b><span class="au-row-state">'+esc(c.estado)+'</span></div><details class="au-cov-detail"><summary>Campos e fontes</summary><div class="au-cov-fields">'+c.campos.map(function(f){return '<div><span>'+esc(f.rotulo)+'</span><small>'+esc([f.aba,f.grupo].filter(Boolean).join(' › '))+' · '+esc(f.estado)+'</small>'+(f.pendente?'<button type="button" class="lnk" data-au="campo:'+esc(f.alvo)+'">Ver em A conferir ↗</button>':'')+'</div>';}).join('')+'</div>'+(c.refs.length?'<div class="au-cov-refs"><small>Referências dos campos</small>'+htmlRefsCobertura(c.refs)+'</div>':'')+(c.candidatos.length?'<div class="au-cov-refs"><small>Peças possíveis · vínculo a confirmar</small>'+htmlRefsCobertura(c.candidatos)+'</div>':'')+'</details></div>';
  }
  function cobertura(){
    var tipo=tipoDetectado(),m=[];
    function add(sec,k,rot,etapa,check){var x=v(sec,k);var ok=check?check(x):Array.isArray(x)?x.length>0:!!S(x)&&!/\[VALIDAR:/.test(S(x));m.push({alvo:sec+'.'+k,rotulo:rot,etapa:etapa,ok:!!ok});}
    add('triagem','Tipo de Julgamento','Tipo de julgamento','Identificação');
    add('triagem','Ramo do direito','Ramo do direito','Identificação');
    add('triagem','Assunto detalhado','Assunto detalhado','Identificação',function(x){return !!S(x)||!!fo('Assunto');});
    if(/Apelação|Remessa/.test(tipo)){
      add('origem','Sentença - ID','ID da sentença','Relatório',function(x){return !!ids(x);});
      add('origem','Sentença - Resultado','Resultado da sentença','Relatório',function(x){return !!S(x)||confirmadosOrigem().length>0||!!S(v('origem','Sentença - Decisão'));});
      add('origem','Sentença - Honorários','Honorários de origem','Relatório',function(x){return !!S(x)||confirmadosOrigem().some(function(r){return r.categoria==='Honorários';});});
      add('origem','Sentença - Reexame','Remessa necessária','Relatório');
    }else{
      add('triagem','Impugnada - ID','ID do ato impugnado','Relatório',function(x){return !!ids(x)||!!ids(atoRecorrido(tipo).id);});
      if(tipo==='Embargos de Declaração'){add('triagem','Impugnada - Ementa literal','Ementa literal','Relatório');add('triagem','ED - Vício','Vício alegado','Relatório');add('triagem','ED - Ponto','Pontos dos embargos','Relatório');}
      else add('triagem','Impugnada - Síntese','Síntese do ato impugnado','Relatório',function(x){return !!S(x)||!!S(atoRecorrido(tipo).sintese);});
    }
    if(!/Remessa Necessária|Juízo de Retratação/.test(tipo)){
      add('origem','Recursos','Partes e IDs dos recursos','Relatório',function(){var R=tab('origem','Recursos');return R.length&&R.every(function(x){return !!S(x.parte)&&!!ids(x.ids);});});
      if(/Apelação|Agravo/.test(tipo))add('origem','Recursos','Razões de cada recurso','Relatório',function(){return tab('origem','Recursos').length&&tab('origem','Recursos').every(function(r){return !!S(r.teses)||!!S(r.preliminares)||!!S(r.merito);});});
      add('triagem','Tempestividade por recurso','Tempestividade individual conferida','Identificação',function(){var R=tab('origem','Recursos'),T=tab('triagem','Tempestividade por recurso');if(!R.length)return false;return R.every(function(r){var I=S(r.ids).match(/\b\d{6,}\b/g)||[],L=T.filter(function(t){return I.indexOf(S(t.id_recurso))>=0;});return L.length===1&&N(L[0].confirmado)==='sim'&&/^(tempestivo|intempestivo|nao se aplica)$/.test(N(L[0].situacao))&&(N(L[0].situacao)==='nao se aplica'||(S(L[0].id_decisao)&&S(L[0].id_intimacao)&&S(L[0].publicacao)&&S(L[0].evidencia)));});});
      add('origem','Contrarrazões - Situação','Resposta recursal','Relatório',function(){return !/\[VALIDAR:/.test(pContrarrazoes(tipo));});
    }
    add('triagem','MPF','Manifestação do MPF','Relatório',function(){return !!S(v('triagem','MPF'))&&!/\[VALIDAR:/.test(pMpf())&&!/aguardando|vista a abrir|nao verificado/.test(N(v('triagem','MPF')));});
    add('triagem','Questões jurídicas individualizadas','Questões delimitadas e conferidas','Fundamentação',function(){var Q=questoesFicha();return Q.length?Q.every(function(q){return questaoConfirmada(q)&&!!S(q.questao);}):!!S(v('triagem','Alegações'));});
    add('producao','Aplicação ao caso concreto','Fundamentação das questões','Fundamentação',function(x){var Q=questoesFicha();return Q.length?Q.every(function(q){return questaoConfirmada(q)&&!!S(q.fundamentacao);}):!!S(x);});
    add('producao','Voto - Resultado','Resultado do julgamento','Dispositivo',function(){var ind=resultadosIndividuais(tipo);return ind?!/\[VALIDAR:/.test(ind.e):!!resDaFicha(tipo);});
    add('producao','Fundamento da sucumbência','Sucumbência (quando aplicável)','Dispositivo',function(){return !/\[VALIDAR:/.test(honorariosEditorial(tipo).texto);});
    return m;
  }
  function htmlInventario(){var F=inventarioFicha(),groups=new Map();F.forEach(function(c){var k=c.aba+' · '+c.grupo;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(c);});return F.length?'<details class="gr-cov-catalog"><summary>Catálogo completo da ficha · '+F.filter(function(c){return c.registrado;}).length+'/'+F.length+' registrados</summary><small class="muted">Inventário de todos os campos; nem todos são necessários ao pronunciamento. Sugestões não gravadas não compõem a minuta.</small>'+Array.from(groups).map(function(p){return '<details class="au-group-card"><summary class="au-group-head"><b>'+esc(p[0])+'</b><small>'+p[1].filter(function(c){return c.registrado;}).length+'/'+p[1].length+'</small></summary>'+p[1].map(function(c){return '<div class="au-group-row au-equal-row"><span>'+esc(c.rotulo)+'</span><small>'+esc(c.estado)+(c.docs?' · ID '+esc(c.docs):'')+'</small></div>';}).join('')+'</details>';}).join('')+'</details>':'';}
  function htmlCobertura(){
    var g=GB();if(!g.cnj||!g.cnj()||window.MutaSigilo&&window.MutaSigilo.bloqueado())return '';
    var I=inventarioFicha(),A=window.MutaAutos,L=cruzarCobertura(cobertura(),I,A&&A.gruposLocalizados?A.gruposLocalizados():[],tipoDetectado()),N=L.filter(function(x){return x.ok;}).length;
    return '<details class="gg"><summary><h4>Dados para a Minuta-Matriz</h4><span class="gn">'+N+'/'+L.length+'</span></summary><div class="gr"><div class="gf w"><small class="muted">Requisitos por pronunciamento, cruzados com os campos da ficha e as peças dos autos. Localizado não significa confirmado.</small>'+['Identificação','Relatório','Fundamentação','Dispositivo'].map(function(e){var F=L.filter(function(x){return x.etapa===e;});return '<section class="au-group-card au-cov-group"><header class="au-group-head"><div class="au-group-title"><h4>'+esc(e)+'</h4></div><small class="au-group-count">'+F.filter(function(x){return x.ok;}).length+'/'+F.length+'</small></header><div class="au-group-rows">'+F.map(htmlLinhaCobertura).join('')+'</div></section>';}).join('')+htmlInventario()+'</div></div></details>';
  }
  function docs() {
    if(!CONTEXTO)syncEstado();var tipo = ST.tipo || tipoDetectado(), k = tipo?(ST.res || resDaFicha(tipo)):'';
    if (k && !opcoesRes(tipo).some(function (o) { return o[0] === k; })) k = '';
    TIPO = tipo;
    var R = resultado(tipo, k), E = ementa(tipo, k), individual=resultadosIndividuais(tipo), proclamacao=individual?VAL('proclamar resultados individualizados após a sessão'):R[1];
    return { tipo: tipo, k: k, rel: relatorio(tipo), disp: [dispositivoFicha(tipo,k), 'É como voto.'], em: E,
      acordao: 'Vistos e relatados estes autos em que são partes as acima indicadas, a Turma Regional de Mato Grosso do Sul, ' + VAL('quórum e proclamação da sessão')  + ', ' + proclamacao + ', nos termos do relatório e voto que ficam fazendo parte integrante do presente julgado.',
      procl: VAL('quórum da sessão') + ', ' + proclamacao + '.' };
  }
  function marca(t) { return esc(t).replace(/\[VALIDAR:[^\]]*\]/g, function (m) { return '<mark class="gv">' + m + '</mark>'; }); }
  function emTexto(E) { return E.cab + '\n' + E.sec.map(function (s) { return s[0] + '\n' + s[1].map(function (x) { return x.n + '. ' + x.t; }).join('\n'); }).join('\n') + '\n__________\n' + E.rod.join('\n'); }
  function emHtml(E) { return '<p><b>' + esc(E.cab) + '</b></p>' + E.sec.map(function (s) { return '<p><b>' + esc(s[0]) + '</b></p>' + s[1].map(function (x) { return '<p><b>' + x.n + '.</b> ' + esc(x.t) + '</p>'; }).join(''); }).join('') + '<p>__________</p>' + E.rod.map(function (r) { var i = r.indexOf(':'); return '<p><i>' + esc(r.slice(0, i + 1)) + '</i>' + esc(r.slice(i + 1)) + '</p>'; }).join(''); }
  function bloco(id, titulo, html, nVal) {
    return '<section class="card pc-sec gr-doc" id="gr-' + id + '"><div class="pc-sh"><h3>' + titulo + '</h3>' + (nVal ? '<small class="gr-nv" title="Trechos a conferir ou completar">' + nVal + ' a validar</small>' : '<small class="muted">pronto</small>') +
      '<button type="button" class="btn sm" data-gr-copia="' + id + '" title="Copiar para colar no PJe (com negrito e itálico)">Copiar</button></div><div class="gr-tx tx-j">' + html + '</div></section>';
  }
  function conta(t) { return (String(t).match(/\[VALIDAR:/g) || []).length; }

  /* Folha única do HERO: as partes do pronunciamento permanecem juntas; dados faltantes são lacunas, nunca fatos presumidos. */
  var FOLHA = [];
  function folhaPartes(pron,D) {
    function reg(k,label){return S(v('producao',k))||VAL(label||k);}
    function ps(L){return L.filter(Boolean).map(function(p){return '<p>'+marca(p)+'</p>';}).join('');}
    function part(id,t,L,h){return {id:id,titulo:t,texto:L.join('\n\n'),html:h||ps(L)};}
    var fund=['Tese jurídica adotada','Aplicação ao caso concreto','Voto - Descrição'].map(function(k){return S(v('producao',k));}).filter(Boolean);
    var qf=questoesFicha();if(qf.length)fund=qf.map(fundamentosQuestao); if(!fund.length)fund.push(VAL('desenvolver fundamentação jurídica e aplicação ao caso concreto'));
    var prec=S(v('producao','Precedentes aplicáveis'));if(prec)fund.push(prec);
    var dis=dispositivoFicha(D.tipo,D.k);
    var suc=S(v('producao','Fundamento da sucumbência'));var atos=S(v('producao','Providências determinadas'));var juros=S(v('producao','Juros e correção monetária'));if(juros)fund.push(juros);
    if(pron==='Acórdão (sessão)'){
      var R=resultado(D.tipo,D.k),voto=['O Desembargador Federal Carlos Muta (Relator):','Senhores Desembargadores,'].concat(fund,[suc||honorariosEditorial(D.tipo).texto,dis||'Ante o exposto, '+R[0]+'.','É como voto.']);
      var em=D.em,eh='<p><b>'+marca(em.cab)+'</b></p>'+em.sec.map(function(s){return '<p><b>'+esc(s[0])+'</b></p>'+s[1].map(function(x){return '<p><b>'+x.n+'.</b> '+marca(x.t)+'</p>';}).join('');}).join('')+'<p>__________</p>'+em.rod.map(function(r){return '<p>'+marca(r)+'</p>';}).join('');
      return [part('ementa','Ementa',[emTexto(em)],eh),part('relatorio','Relatório',D.rel),part('voto','Voto',voto),part('acordao','Acórdão',['Vistos e relatados estes autos em que são partes as acima indicadas, a Turma Regional de Mato Grosso do Sul, '+VAL('quórum e resultado proclamado em sessão')+', nos termos do relatório e voto que ficam fazendo parte integrante do presente julgado.'])];
    }
    if(pron==='Outro destino'||!pron)return [];
    if(pron==='Despacho')return [part('despacho','Despacho',[reg('Particularidades do relatório','contexto da providência'),atos||S(v('producao','Dispositivo do pronunciamento'))||VAL('providência a determinar')])];
    var mono=S(v('producao','Mono - Fundamento'));if(mono)fund.unshift(mono);
    var titulo=pron==='Decisão monocrática'?'Decisão monocrática':pron;
    return [part('relatorio','Relatório',D.rel),part('fundamentacao','Fundamentação',fund),part('dispositivo','Dispositivo',[suc,S(v('producao','Dispositivo do pronunciamento'))||(/Apelação|Agravo|Remessa/.test(D.tipo)?dis:VAL('dispositivo adequado ao pronunciamento')),atos])];
  }
  function folhaHtml(g,D){
    var pron=g.pronunciamento?g.pronunciamento():g.destino&&g.destino()==='monocratica'?'Decisão monocrática':g.destino&&g.destino()==='sessao'?'Acórdão (sessão)':'';
    FOLHA=folhaPartes(pron,D);
    if(!D.tipo)FOLHA=[];
    var cnj=g.cnj(),n=FOLHA.reduce(function(s,p){return s+conta(p.texto);},0);
    var sel='<label class="hero-ger-field"><span>Tipo de julgamento da prévia</span><select data-ger-tipo aria-label="Tipo de julgamento da prévia"><option value="">Da ficha / automático</option>'+TIPOS.map(function(t){return '<option value="'+esc(t)+'"'+(ST.tipo===t?' selected':'')+'>'+esc(t)+'</option>';}).join('')+'</select></label>';
    var base=tipoDetectado(),info=S(v('triagem','Tipo de Julgamento'))||base||'A definir';
    var cfg='<section class="hero-ger-config"><div class="hero-ger-config-grid">'+sel+'<div class="hero-ger-field"><span>Pronunciamento · ficha</span><b>'+esc(pron||'A definir')+'</b></div></div><small class="muted">Ficha: '+esc(info)+(ST.tipo?' · seleção apenas para a prévia; não altera a ficha':' · sem alteração na ficha')+'</small></section>';
    if(!FOLHA.length)return '<div class="hero-ger-sheet">'+cfg+'<p class="gr-av">'+(!D.tipo?'Defina um tipo de julgamento suportado. Nenhuma fórmula será presumida.':'Defina o pronunciamento em Encaminhamento para montar a folha.')+'</p></div>';
    var cov=htmlCobertura().replace('<details class="gg">','<details class="gg hero-ger-coverage" data-ger-key="coverage"'+(ST.abertos.coverage?' open':'')+'>');
    return '<div class="hero-ger-sheet">'+cfg+'<div class="hero-ger-head"><div class="hero-ger-summary"><b>'+esc(pron)+'</b><small class="muted">'+esc(cnj)+' · '+FOLHA.length+' partes · '+n+' pontos a validar</small></div><div class="hero-ger-tools"><button type="button" class="btn line sm" data-gr-copia="folha">Copiar folha</button><a class="btn line sm" target="_blank" rel="noopener noreferrer" href="'+esc((window.Muta&&window.Muta.SITE||'https://www.gabinete-cmt.com')+'/amicus/compendium/#processo='+encodeURIComponent(cnj))+'">Minutário ↗</a></div></div>'+cov+'<div class="hero-ger-parts">'+FOLHA.map(function(p){var k=conta(p.texto),key='part-'+p.id,open=Object.prototype.hasOwnProperty.call(ST.abertos,key)?ST.abertos[key]:p.id==='relatorio';return '<details class="hero-ger-part" data-ger-key="'+key+'" id="gr-folha-'+p.id+'"'+(open?' open':'')+'><summary class="hero-ger-part-head"><h4>'+esc(p.titulo)+'</h4><small class="'+(k?'gr-nv':'muted')+'">'+(k?k+' a validar':'Sem lacunas sinalizadas')+'</small><span class="hero-conf-chevron" aria-hidden="true"></span></summary><div class="hero-ger-part-actions"><button type="button" class="btn line sm" data-gr-copia="folha-'+p.id+'">Copiar '+esc(p.titulo.toLowerCase())+'</button></div><div class="gr-tx">'+p.html+'</div></details>';}).join('')+'</div><small class="muted hero-ger-disclaimer">Prévia de redação. Confira dados, fundamentação e resultado antes de utilizar. Nada é gravado.</small></div>';

  }

  var ULT = null;
  function html() {
    var g = GB();if(window.MutaSigilo&&window.MutaSigilo.bloqueado())return '<p class="muted">Acesso restrito.</p>'; if (!g.cnj || !g.cnj()) return '<div class="empty">Abra um processo no PJe para gerar as peças.</div>';
    if (g.modelo && !g.modelo()) return '<div class="empty">Lendo o prontuário do processo ' + esc(g.cnj()) + '…</div>';
    if(novoHero()){var H=docs();ULT=H;return folhaHtml(g,H);}
    /* 0.52.1 · ato monocrático: relatório e ementa do Gerador são de acórdão; a decisão monocrática se monta na Minuta-Matriz do Compendium */
    if (g.destino && g.destino() === 'monocratica') return '<section class="card pc-sec gr-cfg"><div class="pc-sh"><h3>Gerador</h3><small class="muted">ato monocrático</small></div>' +
      '<p class="muted">O Gerador monta relatório e ementa de acórdão. Este processo está com destino monocrático: a decisão se monta na Minuta-Matriz do Compendium (pronunciamento Monocrática). Se o destino estiver errado, corrija-o no cartão do processo.</p></section>';
    var D = docs(); ULT = D;
    var chips = function (L, at, sel) { return L.map(function (o) { var k = Array.isArray(o) ? o[0] : o, r = Array.isArray(o) ? o[1] : o; return '<button type="button" class="chip' + (k === sel ? ' on' : '') + '" ' + at + '="' + esc(k) + '">' + esc(r) + '</button>'; }).join(''); };
    var relT = D.rel.join('\n'), emT = emTexto(D.em);
    var ai = D.tipo === 'Agravo de Instrumento';
    var aviso = !S(v('origem', 'Sentença - Resultado')) && !/Embargos|Interno|Retrata/.test(D.tipo) ? '<p class="gr-av">' + (ai ? 'A decisão agravada ainda não foi lida: em Prontuário › Autos › Peças e documentos › Decisão agravada, use "Extrair da peça" para trazer o que ela decidiu.' : 'A sentença ainda não foi lida: em Prontuário › Autos › Peças e documentos › Sentença, use "Extrair da peça" para trazer resultado e honorários.') + ' <button type="button" class="lnk" data-gr-ir="Autos">Abrir Autos</button></p>' : '';
    return '<section class="card pc-sec gr-cfg"><div class="pc-sh"><h3>Gerador</h3><small class="muted">padrão do gabinete · nada é gravado</small></div>' +
      '<div class="gr-l"><span>Tipo de julgamento</span><div class="chips">' + chips(TIPOS, 'data-gr-tipo', D.tipo) + '</div></div>' +
      '<div class="gr-l"><span>Resultado</span><div class="chips">' + chips(opcoesRes(D.tipo), 'data-gr-res', D.k) + '</div></div>' + (D.k ? '' : '<p class="gr-av">Sem resultado do voto na ficha: escolha o resultado acima para completar a ementa (cabeçalho e item IV).</p>') + aviso + '</section>' +
      bloco('rel', 'Relatório', D.rel.map(function (p) { return '<p>' + marca(p) + '</p>'; }).join(''), conta(relT)) +
      (PECAS.disp ? bloco('disp', 'Dispositivo do voto', D.disp.map(function (p) { return '<p>' + marca(p) + '</p>'; }).join(''), conta(D.disp.join(' '))) : '') +
      bloco('em', 'Ementa', '<p class="gr-cab"><b>' + marca(D.em.cab) + '</b></p>' + D.em.sec.map(function (s) { return '<p><b>' + esc(s[0]) + '</b></p>' + s[1].map(function (x) { return '<p><b>' + x.n + '.</b> ' + marca(x.t) + '</p>'; }).join(''); }).join('') + '<p>__________</p>' + D.em.rod.map(function (r) { var i = r.indexOf(':'); return '<p><i>' + esc(r.slice(0, i + 1)) + '</i>' + marca(r.slice(i + 1)) + '</p>'; }).join(''), conta(emT)) +
      (PECAS.ac ? bloco('ac', 'Acórdão', '<p>' + marca(D.acordao) + '</p>', conta(D.acordao)) : '') +
      (PECAS.pr ? bloco('pr', 'Proclamação do julgamento', '<p>' + marca(D.procl) + '</p>', conta(D.procl)) : '');
  }
  function textos(id) {
    if(id==='folha'||id.indexOf('folha-')===0){var P=id==='folha'?FOLHA:FOLHA.filter(function(p){return 'folha-'+p.id===id;});return {t:P.map(function(p){return p.titulo.toUpperCase()+'\n\n'+p.texto;}).join('\n\n'),h:P.map(function(p){return '<h3>'+esc(p.titulo)+'</h3>'+p.html;}).join('')};}
    var D = ULT || docs();
    if (id === 'rel') return { t: 'RELATÓRIO\n\n' + D.rel.join('\n\n'), h: D.rel.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') };
    if (id === 'disp') return { t: D.disp.join('\n\n'), h: D.disp.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') };
    if (id === 'em') return { t: emTexto(D.em), h: emHtml(D.em) };
    if (id === 'ac') return { t: D.acordao, h: '<p>' + esc(D.acordao) + '</p>' };
    return { t: D.procl, h: '<p>' + esc(D.procl) + '</p>' };
  }
  function copiar(id, b) {
    var x = textos(id), ok = function () { if (b) { var o = b.textContent; b.textContent = 'Copiado'; setTimeout(function () { b.textContent = o; }, 1100); } };
    try {
      if (window.ClipboardItem && navigator.clipboard.write) { navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([x.t], { type: 'text/plain' }), 'text/html': new Blob([x.h], { type: 'text/html' }) })]).then(ok, function () { navigator.clipboard.writeText(x.t).then(ok); }); return; }
    } catch (e) {}
    navigator.clipboard.writeText(x.t).then(ok, function () {});
  }
  /* cliques: tratados pelo gabinete.js (delegação), que chama acao() */
  function selecionarTipo(tipo){syncEstado();ST.tipo=TIPOS.includes(tipo)?tipo:'';ST.res='';return docs();}
  function acao(b) {
    if (b.dataset.grTipo) { selecionarTipo(b.dataset.grTipo); return true; }
    if (b.dataset.grRes) { ST.res = b.dataset.grRes; return true; }
    if (b.dataset.grCopia) { copiar(b.dataset.grCopia, b); return false; }
    if (b.dataset.grIr) { if (window.MutaAbas) window.MutaAbas.ir('pront'); if (GB().ir) GB().ir(b.dataset.grIr); return false; }
    return false;
  }
  /* ---------- 0.38: a casa do Gerador é a aba Minuta (Comparar | Gerador) ---------- */
  var MM_K = 'hero18810:minModo';
  function $(id) { return typeof document !== 'undefined' ? document.getElementById(id) : null; }
  /* 0.45: a aba CORTEX da Minuta é só do gestor */
  function gestor() { var x = window.MutaSessao && window.MutaSessao.estado ? window.MutaSessao.estado() : {}; return x.estado === 'on' && !!x.gestor; }
  function novoHero(){return typeof document!=='undefined'&&document.body&&document.body.classList.contains('hero-redesign-v53');}
  function modoMin() { if(novoHero())return 'cmp';try { var m = localStorage.getItem(MM_K); return m === 'ger' || m === 'conf' || m === 'dir' ? m : 'cmp'; } catch (e) { return 'cmp'; } }
  function visivel() { var p = $(novoHero()?'panel-pront':'panel-min'), g = $('ger-app'); return !!(p && !p.hidden && g && !g.hidden); }
  function pintar(forca) {
    var g = $('ger-app'); if (!g || (!forca && !visivel())) return;
    var p = $(novoHero()?'panel-pront':'panel-min'), y = p ? p.scrollTop : 0;
    try { g.innerHTML = html(); if(novoHero()){g.querySelectorAll('.gr-l').forEach(function(l){if(l.querySelector('[data-gr-tipo],[data-gr-res]'))l.remove();});g.querySelectorAll('.gr-av').forEach(function(p){if(/^Sem resultado do voto na ficha/.test(p.textContent.trim()))p.textContent='Registre o resultado em Produção para completar a ementa.';});} if(window.MutaModelosHero)window.MutaModelosHero.montarGerador(g); } catch (e) { g.innerHTML = '<div class="empty">Gerador indisponível: ' + esc(e && e.message || e) + '</div>'; }
    if (p) p.scrollTop = y;
  }
  function modo(m) {
    if(novoHero()&&m==='ger'){if(window.MutaAbas)window.MutaAbas.ir('pront');var dock=$('hero-ger-dock');if(!dock&&window.MutaGabinete){window.MutaGabinete.ir('Produção');dock=$('hero-ger-dock');}if(dock){dock.open=true;var sum=dock.querySelector('summary');if(sum)sum.focus({preventScroll:true});pintar(true);}return;}
    var dir=$('dir-consulta');
    if(m==='dir'&&!dir&&window.MutaAbas){window.MutaAbas.ir('dir');return;}
    if(m==='dir'&&dir){dir.hidden=!dir.hidden;if(!dir.hidden){dir.open=true;if(window.MutaDiretrizes)window.MutaDiretrizes.abrir();}return;}
    var ger=m==='ger',cor=!ger;
    try{localStorage.setItem(MM_K,ger?'ger':'cmp');}catch(e){}
    var ca=$('cmp-app'),cf=$('min-conf'),g=$('ger-app');
    if(ca)ca.hidden=!cor;if(cf)cf.hidden=!cor;if(g&&!novoHero())g.hidden=!ger;
    if(cor&&window.MutaConformidade){window.MutaConformidade.abrir();if(m==='conf'&&cf){cf.open=true;cf.scrollIntoView({block:'nearest'});}}
    if(cor&&window.MutaComparar)window.MutaComparar.abrir();
    if(typeof document!=='undefined')document.querySelectorAll('.min-modos [role="tab"]').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.mm===(ger?'ger':'cor')));});
    if(ger)pintar(true);
  }
  function abrir() { modo(modoMin()); }
  try { if (window.MutaSessao && window.MutaSessao.ouvir) window.MutaSessao.ouvir(function () { var p = $('panel-min'); if (p && !p.hidden) modo(modoMin()); else { var b = typeof document !== 'undefined' ? document.querySelector('[data-mm="lote"]') : null; if (b) b.hidden = !gestor(); } }); } catch (e) {}
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-mm]') : null;
    if (t) { modo(t.dataset.mm); return; }
    var b = e.target && e.target.closest ? e.target.closest('#ger-app button') : null;
    if (b && acao(b)) pintar(true);
  });
  if(typeof document!=='undefined'&&document.addEventListener){document.addEventListener('change',function(e){var t=e.target;if(t&&t.matches&&t.matches('#ger-app [data-ger-tipo]')){selecionarTipo(t.value);pintar(true);}});document.addEventListener('toggle',function(e){var d=e.target;if(d&&d.dataset&&d.dataset.gerKey&&d.isConnected&&d.closest('#ger-app'))ST.abertos[d.dataset.gerKey]=d.open;},true);}
  /* Composição compartilhada: recebe apenas os dados registrados do CNJ, sem recorrer ao estado da extensão. */
  /* Fórmulas de sucumbência consultivas: nenhum dado vazio é tratado como negativa. */
  function honorariosEditorial(tipo){
    var r=resDaFicha(tipo),sol=N(v('producao','Voto - Honorários')),sol2=N(v('producao','Honorários recursais')),cls=N(fo('classe_judicial')||fo('Classe')),tj=N(v('triagem','Tipo de Julgamento')),R=tab('origem','Recursos'),C=tab('origem','Sucumbência da decisão recorrida');
    var livre=S(v('producao','Fundamento da sucumbência')),texto='',item='',validar=function(x){return {texto:VAL(x),ementa:''};};
    if(/mandado de seguranca|msciv/.test(cls+' '+tj)){
      if(sol==='majorados'||sol2==='majorados')return validar('mandado de segurança: conferir solução de honorários incompatível com artigo 25 da Lei 12.016/2009');
      return {texto:'Sem condenação em honorários advocatícios (artigo 25 da Lei 12.016/2009 e Súmula 512/STF).',ementa:''};
    }
    if(R.length>1||tab('producao','Resultado por recurso').length>1)return validar('individualizar a sucumbência por recurso e recorrente; não aplicar uma fórmula global');
    if(r==='prov'||r==='parc'){
      if(sol==='majorados'||sol2==='majorados')return validar('resultado provido: incompatível com majoração pelo Tema 1.059/STJ');
      if(/invertidos|redistribuidos|fixados/.test(sol))return livre?{texto:livre,ementa:''}:validar('redimensionamento da sucumbência, critérios e base de cálculo');
      return {texto:'Por fim, deixa-se de determinar a majoração dos honorários advocatícios, nos termos do Tema 1.059/STJ.',ementa:''};
    }
    if(tipo==='Remessa Necessária'||tipo==='Embargos de Declaração'||tipo==='Agravo Interno'||tipo==='Juízo de Retratação')return livre?{texto:livre,ementa:''}:validar('conferir o cabimento de honorários nesta espécie de julgamento');
    if(tipo==='Agravo de Instrumento')return livre?{texto:livre,ementa:''}:validar('conferir natureza da decisão agravada e cabimento de honorários');
    if(r!=='desp'&&r!=='nc')return livre?{texto:livre,ementa:''}:validar('resultado e solução da sucumbência, inclusive eventual anulação ou perda do objeto');
    var pub=S(v('origem','Sentença - Publicação')),date=S(v('origem','Sentença - Data'));
    if(/^\d{4}-\d{2}-\d{2}$/.test(pub)&&pub<'2016-03-18'){
      if(sol==='majorados'||sol2==='majorados')return validar('publicação anterior a 18/03/2016: conferir incompatibilidade com Enunciado Administrativo 7/STJ');
      return validar('não majorar pelo artigo 85, § 11: publicação anterior a 18/03/2016; validar redação');
    }
    if(!(/^\d{4}-\d{2}-\d{2}$/.test(pub)&&pub>='2016-03-18')&&!(/^\d{4}-\d{2}-\d{2}$/.test(date)&&date>='2016-03-18'))return validar('data de publicação da decisão recorrida e regime temporal');
    if(C.length&&C.every(function(x){return /^(nao|nao se aplica)$/.test(N(x.honorarios));})||/^sem (?:condenacao em )?honorarios/.test(N(v('origem','Sentença - Honorários')))){
      return validar('sem honorários previamente fixados: não majorar verba inexistente; validar redação');
    }
    if(sol!=='majorados'&&sol2!=='majorados')return livre?{texto:livre,ementa:''}:validar('confirmar solução dos honorários recursais');
    if(sol&&sol!=='majorados'||sol2&&sol2!=='majorados'&&sol2!=='a definir')return validar('divergência entre os campos de honorários do julgamento');
    if(!R.length||!S(R[0].parte))return validar('identificar recorrente e devedor da verba fixada na origem');
    var parte=R[0].parte,polo=poloDe(parte),P=polos(),unico=polo==='autor'?P.aN<=1:polo==='re'?P.pN<=1:false,match=C.filter(function(x){return N(x.honorarios)==='sim'&&S(x.devedor)&&(N(x.devedor)===N(parte)||(unico&&polo&&poloDe(x.devedor)===polo));});
    if(!match.length)return validar('confirmar honorários previamente fixados contra o recorrente');
    var pct=S(v('producao','Honorários - Percentual ou valor'));if(!/^\d+(?:[.,]\d+)?\s*%$/.test(pct))return validar('percentual de majoração confirmado pelo servidor');
    if(!match.every(function(x){return S(x.base)&&S(x.criterio)&&(/^(sim|nao|nao se aplica)$/.test(N(x.suspensao))||/^(indeferida|nao se aplica|revogada)$/.test(N(x.gratuidade)));}))return validar('base, critério e exigibilidade dos honorários na origem');
    if(!polo&&!porNome(parte))return validar('designação da parte recorrente');
    var nome=porNome(parte)||(polo==='autor'?'a parte autora':'a parte ré'),grat=match.every(function(x){return N(x.gratuidade)==='deferida'&&N(x.suspensao)==='sim';});
    if(match.some(function(x){return N(x.gratuidade)==='deferida'||N(x.suspensao)==='sim';})&&!grat)return validar('gratuidade e suspensão da exigibilidade do recorrente');
    texto='Pela sucumbência recursal, '+nome+' deve suportar condenação adicional (artigo 85, § 11, do CPC), no equivalente a '+pct.replace(/\s+/g,'')+', a ser acrescido ao fixado na origem'+(grat?', observada a gratuidade de justiça concedida (artigo 98, § 3º, do CPC)':'')+'.';
    if(livre)texto=livre;item=(r==='desp'?'Apelação desprovida':'Apelação não conhecida')+', honorários recursais em acréscimo ao fixado na origem.';
    return {texto:texto,ementa:item};
  }
  function variaveisEditorial(tipo,rel,em){
    var rec=tab('origem','Recursos'),rs=/^(Apelação|Agravo de Instrumento)$/.test(tipo)?pRecursos(tipo):[],hon=honorariosEditorial(tipo),d=resultado(tipo,resDaFicha(tipo)),sid=S(v('origem','Sentença - ID')),imp=S(v('triagem','Impugnada - ID'));
    var literal=S(v('triagem','Impugnada - Ementa literal'))||(N(v('origem','2G - Acórdão recorrido'))==='sim'?S(v('origem','2G - Acórdão Ementa')):''),per=S(v('triagem','Parecer - Sentido'));
    return {razoes_primeiro_recurso:rs[0]||VAL('razões do primeiro recurso'),razoes_segundo_recurso:rec.length>1&&rs[1]||VAL('razões do segundo recurso'),razoes_agravo_interno:tipo==='Agravo Interno'?rel[1]:VAL('razões do agravo interno'),vicios_relatorio:tipo==='Embargos de Declaração'?rel[2]:VAL('vícios alegados'),ementa_embargada_literal:literal||VAL('transcrever ementa literal'),sentenca_paragrafo:'A sentença '+idOu(sid,'ID da sentença')+' '+comandosOrigem()+'. '+honorariosAbertura(),parecer_sentido_redacional:/^nao provimento|^desprovimento/.test(N(per))?'desprovimento':/^parcial.*provimento/.test(N(per))?'parcial provimento':/^provimento/.test(N(per))?'provimento':VAL('sentido do parecer'),dispositivo_voto:dispositivoFicha(tipo,resDaFicha(tipo)),honorarios_recursais_texto:hon.texto,honorarios_ementa:hon.ementa,dispositivo_ementa_ficha:(resultadosIndividuais(tipo)||{}).e||hon.ementa||d[3],acordao_recorrido_id:atoRecorrido(tipo).id||VAL('ID do acórdão recorrido'),decisao_agravada_id:atoRecorrido(tipo).id||VAL('ID da decisão agravada'),decisao_agravada_sintese:atoRecorrido(tipo).sintese||VAL('síntese da decisão agravada')};
  }
  /* A tabela é a fonte dos fragmentos; não separar frases já compostas por regex. */
  function fragmentosRecursos(tipo){
    var R=tab('origem','Recursos'),out={};
    if(/^(Apelação|Agravo de Instrumento)$/.test(tipo))R.forEach(function(r,i){
      var n=i+1,L=linhas(r.preliminares).map(function(x){return 'preliminarmente, '+x;}).concat(linhas(r.teses),linhas(r.merito)),ped=S(r.pedidos);
      out['recurso_'+n+'_parte']=quem(r.parte);
      out['recurso_'+n+'_referencia']=idOu(r.ids,'ID do recurso');
      out['recurso_'+n+'_razoes']=(L.length?enumerar(L):VAL('razões, em itens'))+(ped?', pelo que requereu '+ped.replace(/^(requer(eu)?|pede)\s+/i,'').replace(/[.;]+$/,''):'');
    });
    if(tipo==='Agravo Interno'&&R.length){var r=R[0],L=linhas(v('triagem','AgInt - Fundamentos')).concat(linhas(r.preliminares),linhas(r.teses),linhas(r.merito));if(!L.length)L=linhas(v('triagem','Alegações'));out.agint_parte=quem(r.parte);out.agint_referencia=idOu(r.ids,'ID do agravo');out.agint_razoes=L.length?enumerar(L):VAL('razões, em itens');}
    return out;
  }
  function fragmentosEditorialDiretos(tipo,R){
    var C=tab('origem','Contrarrazões'),p=R.contrarrazoes_relatorio||'',mp=R.parecer_relatorio||'',r=resultado(tipo,resDaFicha(tipo)),ind=resultadosIndividuais(tipo);
    var m=/^(Houve|Não houve)\s+(?:contrarrazões|contraminuta)([\s\S]*)$/i.exec(p),res={};
    res.resposta_ocorrencia=m?m[1]:p;res.resposta_complemento=m?m[2].trim().replace(/\.$/,''):'';
    res.contrarrazoes_ids=C.map(function(c){return S(c.ids);}).filter(Boolean).join(', ');
    res.contrarrazoes_preliminares=C.map(function(c){return S(c.preliminares);}).filter(Boolean).join('; ');
    res.parecer_manifestacao=mp.replace(/^A Procuradoria Regional da República\s+/,'').replace(/\.$/,'');
    res.honorarios_solucao=S(R.honorarios_recursais_texto).replace(/^Pela sucumbência recursal,\s*/i,'').replace(/\.$/,'');
    res.dispositivo_conclusao=S(R.dispositivo_voto).replace(/^Ante o exposto,\s*/i,'').replace(/\.$/,'');
    res.ramo=ramo();res.classe_ementa=classeEmenta(tipo);res.assunto_ementa=assuntoCx();
    res.conclusao=ind?ind.e:r[2];res.resultado=ind?ind.e:r[3];
    res.relato_objeto=S(R.abertura_relatorio).replace(/^Trata-se de\s+/,'').replace(/\.$/,'');
    if(tipo==='Embargos de Declaração'){res.ed_vicio_redacao=S(v('triagem','ED - Vício')).toLowerCase()||VAL('vício alegado');var pts=linhas(v('triagem','ED - Ponto')).concat(linhas(v('triagem','Alegações')));res.ed_pontos_redacao=pts.length?enumerar(pts):VAL('pontos dos embargos');}
    return res;
  }
  function comporFicha(campos, fonte, tipo, modelo){var ant=CONTEXTO,t0=TIPO;try{campos=campos||{};var f=Object.assign({},fonte||{});Object.keys(campos).filter(function(k){return k.indexOf('acervo.')===0;}).forEach(function(k){f[k.slice(7)]=campos[k];});CONTEXTO={V:function(sec,k){return campos[sec+'.'+k];},fo:function(){return f;},modelo:function(){return modelo;}};TIPO=tipo||tipoDetectado();var rel=relatorio(TIPO),em=ementa(TIPO,resDaFicha(TIPO)),R={abertura_relatorio:rel[0],razoes_recursais:/^(Apelação|Agravo de Instrumento)$/.test(TIPO)?pRecursos(TIPO).join('\n\n'):'',contrarrazoes_relatorio:pContrarrazoes(TIPO),parecer_relatorio:pMpf()||'',caso_em_exame:em.sec[0][1].map(function(x){return x.t;}).join('\n'),questao_em_discussao:em.sec[1][1].map(function(x){return x.t;}).join('\n')};if(/^(Apelação|Remessa Necessária)$/.test(TIPO)){R.resultado_decisao_recorrida=resultadoSentenca();R.comandos_dispositivos=comandosOrigem();R.frase_honorarios_origem=honorariosAbertura();}else if(TIPO==='Agravo de Instrumento'){R.resultado_decisao_recorrida=atoRecorrido(TIPO).sintese||VAL('resultado da decisão agravada');}Object.assign(R,variaveisEditorial(TIPO,rel,em));Object.assign(R,fragmentosRecursos(TIPO));var qf=questoesFicha();if(qf.length){R.tese_juridica_adotada=qf.map(function(q){return questaoConfirmada(q)&&S(q.tese_adotada)||VAL('tese: '+textoQuestao(q));}).join('\n\n');R.aplicacao_ao_caso_concreto=qf.map(fundamentosQuestao).join('\n\n');R.dispositivos_legais_aplicaveis=refsQuestoes('dispositivos_legais');R.precedentes_aplicaveis=refsQuestoes('precedentes');}if(R.honorarios_ementa)em.sec[3][1][0].t=R.honorarios_ementa;Object.assign(R,fragmentosEditorialDiretos(TIPO,R));var dados=aliasesFicha(modelo);return {tipo:TIPO,rel:rel,em:em,variaveis:Object.assign({},dados,R),dados:dados};}finally{CONTEXTO=ant;TIPO=t0;}}
  window.MutaGerador = { comporFicha: comporFicha, cobertura: cobertura, inventarioFicha: inventarioFicha, cruzarCobertura: cruzarCobertura, aliasesFicha: aliasesFicha, htmlCobertura: htmlCobertura, pintar: pintar, abrir: abrir, modo: modo, html: html, acao: acao, docs: docs, selecionarTipo: selecionarTipo, _ST: ST, _t: { resultado: resultado, fraseHonorarios: fraseHonorarios, designa: designa, feminino: feminino } };
})();
