# Ficha única — matriz de rastreabilidade técnica

Gerada a partir de `padrao/ficha.json`, versão 1.3.0, e dos módulos no commit `3feddd9d50b2c43444e8a45699f27be9e76b5ed9`. Inventário de chaves, não de dados processuais. Nenhuma informação de casos foi consultada.

## Como interpretar

- **Base**: `acervo/fonte.json` para campos de acervo; `acervo/operacional.json` para as chaves com seção. Campos calculados e legados não são novas fontes de escrita.
- **Modelo**: cada linha reúne todas as ocorrências da mesma chave. Permissão indicada pelo modelo; designação e correção nominal são restritas ao gestor na API. Outras regras específicas, incluindo sigilo e deliberações, prevalecem no servidor.
- **Consumidores explícitos**: referências literais à chave nos módulos inspecionados, limitadas a três ocorrências por módulo. Referência não demonstra necessariamente leitura, escrita ou uso no texto final. Ausência de referência literal não significa ausência de consumo: renderizadores e inventários percorrem o modelo dinamicamente.
- **Ponte antiga**: associação explícita em `MAPA` da extensão, agora com filtragem diferencial. Não equivale à cobertura do Prontuário atual.
- **Gerador**: o catálogo de apelidos cobre as 374 chaves. Consumo redacional depende do pronunciamento e dos requisitos de cada modelo; cobertura cadastral não garante uso na minuta.
- **Cognitio/Ex Officio**: o contrato compartilhado consta em `cognitio/README.md` e `padrao/integracoes-ficha.md`. O adaptador antigo do monitor em `padrao/ficha-adaptador-monitor.js` grava diretamente no operacional; a API atual aplica permissões e espelhos. A rota ativa e o comportamento autenticado ainda exigem validação. Não inferir integração individual apenas pelo catálogo.

## Divergências a conferir

- `producao.Voto - Resultado` e `producao.Voto - Honorários`: texto no grupo de acórdão e lista no grupo de monocrática. Mesma chave, tipos diferentes; conservar até decisão sobre vocabulário e contexto.
- Campos de julgamento, destaque e anotações: testar atualização em duas interfaces simultâneas; a fila local não elimina conflitos de edição concorrente no servidor.
- A ponte antiga ainda não espelha exclusões vazias e não implementa todas as chaves novas. Não ampliar automaticamente as associações sem confirmar semântica.

## Matriz por chave

| Chave | Aba / grupo | Tipo | Escrita no modelo | Apelido | Fonte ou seção | Referências literais (até 3 por módulo) | Ponte antiga |
|---|---|---|---|---|---|---|---|
| `origem.Origem - Juízo` | Processo / 1º grau | texto | editável | `juizo_origem` | `origem` | HERO (2), API (3+) | `origem.juizo` |
| `origem.Origem - Julgador` | Processo / 1º grau | texto | editável | `juiz_origem` | `origem` | HERO (2), API (3+) | `origem.julgador` |
| `origem.Origem - Valor da causa` | Processo / 1º grau | texto | editável | `valor_causa_origem` | `origem` | HERO (1), API (3+) | — |
| `origem.Origem - Processo de referência` | Processo / 1º grau | texto | consulta | `origem_processo_referencia` | `origem` | HERO (1) | — |
| `origem.Origem - Documentos 1G` | Processo / 1º grau | tabela | consulta | `origem_documentos_1g` | `origem` | HERO (1) | — |
| `origem.Origem - Peças vinculadas 1G` | Processo / 1º grau | tabela | editável | `origem_pecas_vinculadas_1g` | `origem` | HERO (1), API (1) | — |
| `origem.Origem - Data de ajuizamento` | Processo / 1º grau | data | editável | `origem_data_ajuizamento` | `origem` | dinâmico / a conferir | — |
| `origem.1G - Sentença recorrida` | Processo / 1º grau | simnao | editável | `1g_sentenca_recorrida` | `origem` | dinâmico / a conferir | — |
| `origem.Sentença - Decisão` | Processo / 1º grau | lista | editável | `sentenca_decisao` | `origem` | HERO (2), Autos (2), Gerador (2), Ficha web (1) | — |
| `origem.Sentença - ID` | Processo / 1º grau | texto | editável | `sentenca_id` | `origem` | HERO (3+), Autos (3+), Gerador (3+), Ficha web (2), API (3+) | `origem.decisaoId` |
| `origem.Sentença - Honorários` | Processo / 1º grau | texto | editável | `sentenca_honorarios` | `origem` | HERO (2), Autos (1), Gerador (3+), Ficha web (1), API (3+) | — |
| `origem.Sentença - Custas` | Processo / 1º grau | texto | editável | `sentenca_custas` | `origem` | HERO (2), Autos (1), Ficha web (1), API (3+) | — |
| `origem.Sentença - Resultado` | Processo / 1º grau | texto | editável | `sentenca_resultado` | `origem` | HERO (1), Autos (2), Gerador (3+) | — |
| `origem.Sentença - Fundamento` | Processo / 1º grau | texto-longo | editável | `sentenca_fundamento` | `origem` | HERO (1) | — |
| `origem.Sentença - Providências` | Processo / 1º grau | texto-longo | editável | `sentenca_providencias` | `origem` | HERO (1), Gerador (1) | — |
| `origem.Sentença - Data` | Processo / 1º grau | data | editável | `sentenca_data` | `origem` | HERO (2), Gerador (1), API (3+) | `origem.decisaoData` |
| `origem.Sentença - Reexame` | Processo / 1º grau | lista | editável | `sentenca_reexame` | `origem` | HERO (1), Autos (1), Gerador (2) | — |
| `origem.Sentença - Tutela` | Processo / 1º grau | lista | editável | `sentenca_tutela` | `origem` | HERO (1) | — |
| `origem.Sentença - Comandos` | Processo / 1º grau | tabela | editável | `sentenca_comandos` | `origem` | Autos (1), Gerador (2) | — |
| `origem.Sentença - Publicação` | Processo / 1º grau | data | editável | `sentenca_publicacao` | `origem` | HERO (1), Gerador (1) | — |
| `origem.1G - Decisão recorrida` | Processo / 1º grau | simnao | editável | `1g_decisao_recorrida` | `origem` | Autos (1), Gerador (1) | — |
| `origem.1G - Decisão ID` | Processo / 1º grau | texto | editável | `1g_decisao_id` | `origem` | HERO (1), Autos (1), Gerador (1), Ficha web (1) | — |
| `origem.1G - Decisão Data` | Processo / 1º grau | data | editável | `1g_decisao_data` | `origem` | dinâmico / a conferir | — |
| `origem.1G - Decisão Publicação` | Processo / 1º grau | data | editável | `1g_decisao_publicacao` | `origem` | dinâmico / a conferir | — |
| `origem.1G - Decisão Julgador` | Processo / 1º grau | texto | editável | `1g_decisao_julgador` | `origem` | dinâmico / a conferir | — |
| `origem.1G - Decisão Resultado` | Processo / 1º grau | texto-longo | editável | `1g_decisao_resultado` | `origem` | Gerador (1) | — |
| `origem.1G - Decisão Fundamentos` | Processo / 1º grau | texto-longo | editável | `1g_decisao_fundamentos` | `origem` | dinâmico / a conferir | — |
| `origem.2G - Monocrática recorrida` | Processo / 2º grau | simnao | editável | `2g_monocratica_recorrida` | `origem` | Autos (1), Gerador (1) | — |
| `origem.2G - Monocrática ID` | Processo / 2º grau | texto | editável | `2g_monocratica_id` | `origem` | HERO (1), Autos (1), Gerador (1), Ficha web (1) | — |
| `origem.2G - Monocrática Data` | Processo / 2º grau | data | editável | `2g_monocratica_data` | `origem` | dinâmico / a conferir | — |
| `origem.2G - Monocrática Publicação` | Processo / 2º grau | data | editável | `2g_monocratica_publicacao` | `origem` | dinâmico / a conferir | — |
| `origem.2G - Monocrática Relator` | Processo / 2º grau | texto | editável | `2g_monocratica_relator` | `origem` | dinâmico / a conferir | — |
| `origem.2G - Monocrática Órgão` | Processo / 2º grau | texto | editável | `2g_monocratica_orgao` | `origem` | dinâmico / a conferir | — |
| `origem.2G - Monocrática Resultado` | Processo / 2º grau | texto-longo | editável | `2g_monocratica_resultado` | `origem` | Gerador (1) | — |
| `origem.2G - Monocrática Fundamentos` | Processo / 2º grau | texto-longo | editável | `2g_monocratica_fundamentos` | `origem` | dinâmico / a conferir | — |
| `origem.2G - Acórdão recorrido` | Processo / 2º grau | simnao | editável | `2g_acordao_recorrido` | `origem` | Gerador (3+) | — |
| `producao.Acórdão - ID` | Processo / 2º grau | texto | editável | `acordao_id` | `producao` | HERO (1), Gerador (1), Ficha web (1) | — |
| `producao.Acórdão - Assinado` | Processo / 2º grau | simnao | editável | `acordao_assinado` | `producao` | dinâmico / a conferir | — |
| `producao.Acórdão - Publicado` | Processo / 2º grau | simnao | editável | `acordao_publicado` | `producao` | dinâmico / a conferir | — |
| `producao.Acórdão - Data da publicação` | Processo / 2º grau | data | editável | `acordao_data_publicacao` | `producao` | dinâmico / a conferir | — |
| `producao.Acórdão - ED opostos` | Processo / 2º grau | simnao | editável | `acordao_ed_opostos` | `producao` | dinâmico / a conferir | — |
| `producao.Acórdão - Trânsito` | Processo / 2º grau | data | editável | `acordao_transito` | `producao` | dinâmico / a conferir | — |
| `origem.2G - Acórdão Data` | Processo / 2º grau | data | editável | `2g_acordao_data` | `origem` | dinâmico / a conferir | — |
| `origem.2G - Acórdão Relator` | Processo / 2º grau | texto | editável | `2g_acordao_relator` | `origem` | dinâmico / a conferir | — |
| `origem.2G - Acórdão Órgão` | Processo / 2º grau | texto | editável | `2g_acordao_orgao` | `origem` | dinâmico / a conferir | — |
| `origem.2G - Acórdão Resultado` | Processo / 2º grau | texto-longo | editável | `2g_acordao_resultado` | `origem` | Gerador (1) | — |
| `origem.2G - Acórdão Ementa` | Processo / 2º grau | texto-longo | editável | `2g_acordao_ementa` | `origem` | Gerador (3+) | — |
| `triagem.Impugnada - ID` | Processo / 2º grau | texto | editável | `impugnada_id` | `triagem` | HERO (3+), Autos (1), Gerador (3+) | `recursoTipo.edId; recursoTipo.agintId` |
| `triagem.Impugnada - Data` | Processo / 2º grau | data | editável | `impugnada_data` | `triagem` | HERO (2), Gerador (1) | `recursoTipo.edData; recursoTipo.agintData` |
| `triagem.Impugnada - Órgão` | Processo / 2º grau | texto | editável | `impugnada_orgao` | `triagem` | HERO (1) | `recursoTipo.edOrgao` |
| `triagem.Impugnada - Relator` | Processo / 2º grau | texto | editável | `impugnada_relator` | `triagem` | HERO (1) | — |
| `triagem.Impugnada - Síntese` | Processo / 2º grau | texto-longo | editável | `impugnada_sintese` | `triagem` | HERO (1), Gerador (3+) | `recursoTipo.agintSintese` |
| `triagem.Impugnada - Publicação` | Processo / 2º grau | data | editável | `impugnada_publicacao` | `triagem` | HERO (1) | — |
| `triagem.Impugnada - Ementa literal` | Processo / 2º grau | texto-longo | editável | `impugnada_ementa_literal` | `triagem` | HERO (1), Gerador (3+) | — |
| `origem.Sucumbência da decisão recorrida` | Processo / 2º grau | tabela | editável | `sucumbencia_decisao_recorrida` | `origem` | HERO (2), Autos (1), Gerador (1), Ficha web (2) | — |
| `origem.Contrarrazões - Situação` | Processo / Recursos e contrarrazões | lista | editável | `contrarrazoes_situacao` | `origem` | HERO (2), Autos (1), Gerador (2), Ficha web (1) | — |
| `origem.Recursos` | Processo / Recursos e contrarrazões | tabela | editável | `recursos` | `origem` | HERO (3+), Autos (3+), Gerador (3+), Ficha web (3+) | — |
| `origem.Contrarrazões` | Processo / Recursos e contrarrazões | tabela | editável | `contrarrazoes` | `origem` | HERO (2), Autos (3+), Gerador (3+), Ficha web (3+) | — |
| `triagem.Prelim.` | Processo / Recursos e contrarrazões | lista | editável | `prelim` | `triagem` | HERO (1), API (3+) | — |
| `triagem.Descrição da Preliminar` | Processo / Recursos e contrarrazões | texto-longo | editável | `descricao_preliminar` | `triagem` | dinâmico / a conferir | — |
| `triagem.Recurso adesivo` | Processo / Recursos e contrarrazões | simnao | editável | `recurso_adesivo` | `triagem` | Autos (1) | — |
| `triagem.Má-fé alegada` | Processo / Recursos e contrarrazões | simnao | editável | `ma_fe_alegada` | `triagem` | dinâmico / a conferir | — |
| `origem.Autos - Extraído em` | Processo / Teor dos autos · Documentos e peças | texto | consulta | `autos_extraido` | `origem` | dinâmico / a conferir | — |
| `origem.Autos - Total` | Processo / Teor dos autos · Documentos e peças | texto | consulta | `autos_total` | `origem` | dinâmico / a conferir | — |
| `origem.Autos - Sem texto` | Processo / Teor dos autos · Documentos e peças | texto | consulta | `autos_sem_texto` | `origem` | dinâmico / a conferir | — |
| `origem.Autos - Documentos` | Processo / Teor dos autos · Documentos e peças | tabela | consulta | `autos_documentos` | `origem` | Autos (1), Ficha web (1) | — |
| `origem.Outras peças` | Processo / Teor dos autos · Documentos e peças | tabela | editável | `outras_pecas` | `origem` | HERO (1), Autos (3+), Ficha web (2) | — |
| `origem.Classificação documental` | Processo / Teor dos autos · Documentos e peças | tabela | editável | `classificacao_documental` | `origem` | HERO (3+), Ficha web (3+), API (1) | — |
| `triagem.Registro - Teor dos autos` | Processo / Teor dos autos · Documentos e peças | texto-longo | consulta | `registro_teor_autos` | `triagem` | HERO (1), Autos (1), Ficha web (1) | — |
| `triagem.Registro - Peças` | Processo / Teor dos autos · Documentos e peças | tabela | consulta | `registro_pecas` | `triagem` | HERO (1), Autos (3+), Ficha web (1) | — |
| `origem.baixado` | Processo / Registro no acervo | texto | calculado | `baixado` | `origem` | dinâmico / a conferir | — |
| `origem.fora_do_fonte` | Processo / Registro no acervo | texto | calculado | `fora_fonte` | `origem` | dinâmico / a conferir | — |
| `origem.atualizado_em` | Processo / Registro no acervo | texto | calculado | `atualizado` | `origem` | dinâmico / a conferir | — |
| `triagem.Registro - Atualizado em` | Processo / Registro no acervo | texto | consulta | `registro_atualizado` | `triagem` | dinâmico / a conferir | — |
| `acervo.classe_judicial` | Processo / Identificação e Autuação | texto | fonte / consulta | `classe` | classe_judicial / Classe / DataJud · Classe | HERO (3+), Gerador (3+) | — |
| `acervo.Seção` | Processo / Identificação e Autuação | texto | fonte / consulta | `secao` | Seção Competente | HERO (3+), Ficha web (3+) | — |
| `acervo.data_distribuição` | Processo / Identificação e Autuação | texto | fonte / consulta | `data_distribuicao` | data_distribuição | Ficha web (1) | — |
| `acervo.Relator` | Processo / Identificação e Autuação | texto | fonte / consulta | `relator` | fonte; regra do modelo | HERO (3+), Ficha web (1) | — |
| `acervo._etq` | Processo / Identificação e Autuação | texto | fonte / consulta | `etiquetas_pje` | Etiquetas Originais | dinâmico / a conferir | — |
| `acervo.valor_causa` | Processo / Identificação e Autuação | texto | fonte / consulta | `valor_causa` | valor_causa | dinâmico / a conferir | — |
| `acervo.dt_distribuicao_1g` | Processo / Identificação e Autuação | data | fonte / consulta | `data_distribuicao_1g` | dt_distribuicao_1g | dinâmico / a conferir | — |
| `acervo.prioridade` | Processo / Identificação e Autuação | texto | fonte / consulta | `prioridade` | prioridade | dinâmico / a conferir | — |
| `acervo.Sigiloso` | Processo / Identificação e Autuação | texto | fonte / consulta | `sigiloso` | Sigiloso | HERO (2) | — |
| `acervo.Órgão Julgador` | Processo / Identificação e Autuação | texto | fonte / consulta | `orgao_julgador` | Órgão Julgador | dinâmico / a conferir | — |
| `triagem.Etiquetas` | Processo / Identificação e Autuação | texto | editável | `etiquetas` | `triagem` | HERO (3+), API (1) | `caso.etiquetas` |
| `triagem.Etiquetas sugeridas` | Processo / Identificação e Autuação | texto | editável | `etiquetas_sugeridas` | `triagem` | HERO (3+), API (2) | — |
| `acervo.Assunto` | Processo / Caso, Conteúdo e Questões | texto | fonte / consulta | `assunto` | Assunto | HERO (3+), Autos (1), Gerador (3+), Ficha web (1) | — |
| `triagem.Ramo do direito` | Processo / Caso, Conteúdo e Questões | texto | editável | `ramo_direito` | `triagem` | HERO (2), Gerador (2) | — |
| `triagem.Assunto detalhado` | Processo / Caso, Conteúdo e Questões | texto-longo | editável | `assunto_detalhado` | `triagem` | HERO (3+), Gerador (3+), API (3+) | — |
| `triagem.Outros assuntos` | Processo / Caso, Conteúdo e Questões | texto-longo | editável | `outros_assuntos` | `triagem` | HERO (2) | — |
| `triagem.Detalhamento do caso` | Processo / Caso, Conteúdo e Questões | texto-longo | editável | `detalhamento` | `triagem` | HERO (3+), Gerador (1), Ficha web (2), API (3+) | `caso.subassunto` |
| `triagem.Síntese Processual` | Processo / Caso, Conteúdo e Questões | texto-longo | editável | `sintese_processual` | `triagem` | HERO (3+), Ficha web (2), API (2) | `triagem.resumo` |
| `triagem.Síntese Fática` | Processo / Caso, Conteúdo e Questões | texto-longo | editável | `sintese_fatica` | `triagem` | HERO (3+), Ficha web (2), API (3+) | — |
| `triagem.COMPLEXIDADE` | Processo / Caso, Conteúdo e Questões | texto | calculado | `complexidade` | `triagem` | HERO (2), Ficha web (1) | — |
| `triagem.Registro - Assunto detalhado` | Processo / Caso, Conteúdo e Questões | texto-longo | consulta | `registro_assunto_detalhado` | `triagem` | HERO (3+), Gerador (2) | — |
| `triagem.Alegações` | Processo / Caso, Conteúdo e Questões | texto-longo | editável | `alegacoes` | `triagem` | HERO (3+), Gerador (3+), Ficha web (2), API (3+) | — |
| `triagem.Questões destacadas` | Processo / Caso, Conteúdo e Questões | texto-longo | editável | — | `triagem` | HERO (3+) | — |
| `triagem.Questões jurídicas individualizadas` | Processo / Caso, Conteúdo e Questões; Produção / Fundamentação e dispositivo | tabela | editável | `questoes_juridicas_individualizadas` | `triagem` | HERO (3+), Autos (1), Gerador (2) | — |
| `acervo.Polo Ativo` | Processo / Partes | texto | fonte / consulta | `polo_ativo` | polo_ativo | Gerador (1), Ficha web (2) | — |
| `acervo.Polo Passivo` | Processo / Partes | texto | fonte / consulta | `polo_passivo` | polo_passivo | Gerador (1), Ficha web (2) | — |
| `acervo.advogado_pa` | Processo / Partes | texto | fonte / consulta | `advogado_polo_ativo` | advogado_pa | Gerador (1) | — |
| `acervo.advogado_pp` | Processo / Partes | texto | fonte / consulta | `advogado_polo_passivo` | advogado_pp | Gerador (1) | — |
| `acervo.dpu` | Processo / Partes | texto | fonte / consulta | `dpu` | dpu | dinâmico / a conferir | — |
| `acervo.mpf` | Processo / Partes | texto | fonte / consulta | `mpf` | mpf | HERO (2), API (3+) | — |
| `acervo.Partes` | Processo / Partes | texto | fonte / consulta | `partes` | fonte; regra do modelo | HERO (3+), Autos (1), Ficha web (3+) | — |
| `acervo.tarefa_atual` | Processo / Tramitação | texto | fonte / consulta | `tarefa_atual` | tarefa_atual | HERO (2) | — |
| `acervo.data_entrada_tarefa` | Processo / Tramitação | data | fonte / consulta | `data_entrada_tarefa` | data_entrada_tarefa | HERO (1) | — |
| `acervo.paradeiro_em` | Processo / Tramitação | data | fonte / consulta | `paradeiro` | paradeiro_em | dinâmico / a conferir | — |
| `acervo.tarefa_anterior` | Processo / Tramitação | texto | fonte / consulta | `tarefa_anterior` | tarefa_anterior | dinâmico / a conferir | — |
| `acervo.saiu_da_tarefa_em` | Processo / Tramitação | data | fonte / consulta | `saiu_tarefa` | saiu_da_tarefa_em | dinâmico / a conferir | — |
| `acervo.ultimo_movimento` | Processo / Tramitação | texto | fonte / consulta | `ultimo_movimento` | ultimo_movimento | dinâmico / a conferir | — |
| `acervo.Data Último Movimento` | Processo / Tramitação | data | fonte / consulta | `data_ultimo_movimento` | Data Último Movimento | Ficha web (1), API (1) | — |
| `acervo.DataJud · Último movimento` | Processo / Tramitação | texto | fonte / consulta | `datajud_ultimo_movimento` | DataJud / Último movimento | dinâmico / a conferir | — |
| `acervo.DataJud · Data movimento` | Processo / Tramitação | data | fonte / consulta | `datajud_data_movimento` | DataJud / Data movimento | dinâmico / a conferir | — |
| `acervo.DataJud · Situação` | Processo / Tramitação | texto | fonte / consulta | `datajud_situacao` | DataJud / Situação | dinâmico / a conferir | — |
| `acervo.DataJud · Última coleta` | Processo / Tramitação | data | fonte / consulta | `datajud_ultima_coleta` | DataJud / Última coleta | dinâmico / a conferir | — |
| `acervo.Situação da Pauta` | Processo / Tramitação | texto | fonte / consulta | `situacao_pauta` | fonte; regra do modelo | dinâmico / a conferir | — |
| `acervo.Sessão atual (Excel)` | Processo / Tramitação | texto | fonte / consulta | `sessao_atual_excel` | fonte; regra do modelo | dinâmico / a conferir | — |
| `triagem.Tipo de Julgamento` | Triagem / Análise e Acompanhamento | texto | editável | `tipo_julgamento` | `triagem` | HERO (3+), Autos (2), Gerador (3+), Ficha web (3+), API (3+) | `caso.tipoManual` |
| `triagem.Status da triagem` | Triagem / Análise e Acompanhamento | lista | editável | `status_triagem` | `triagem` | HERO (1), Ficha web (3+) | — |
| `triagem.Seleção Prévia` | Triagem / Análise e Acompanhamento | texto | editável | `selecao_previa` | `triagem` | HERO (2), Ficha web (1), API (3+) | — |
| `producao.Destino - Situação` | Triagem / Análise e Acompanhamento | lista | editável | `destino_situacao` | `producao` | HERO (3+), Ficha web (3+) | — |
| `producao.Destino - Outro` | Triagem / Análise e Acompanhamento | lista | editável | `destino_outro` | `producao` | HERO (1), Ficha web (3+), API (3+) | — |
| `triagem.Destino - Confirmado em` | Triagem / Análise e Acompanhamento | data | editável | `destino_confirmado` | `triagem` | HERO (1), Ficha web (3+), API (3+) | — |
| `triagem.Destino - Confirmado por` | Triagem / Análise e Acompanhamento | texto | editável | `triagem_destino_confirmado` | `triagem` | Ficha web (3+), API (2) | — |
| `triagem.Hipóteses Monocrática` | Triagem / Análise e Acompanhamento; Produção / Ato e fundamento | lista | editável | `hipoteses_monocratica` | `triagem` | HERO (3+), Ficha web (2), API (3+) | — |
| `triagem.Art. 932 - Nota de enquadramento` | Triagem / Análise e Acompanhamento | texto-longo | editável | `art932_nota` | `triagem` | HERO (3+), Ficha web (1) | — |
| `triagem.Registro - Proposta` | Triagem / Análise e Acompanhamento | texto-longo | consulta | `registro_proposta` | `triagem` | HERO (2), Ficha web (1) | — |
| `triagem.Proposta de julgamento` | Triagem / Análise e Acompanhamento | texto-longo | editável | `proposta_julgamento` | `triagem` | HERO (2) | — |
| `triagem.Seleção Prévia - Nota` | Triagem / Análise e Acompanhamento | texto-longo | editável | `selecao_previa_nota` | `triagem` | HERO (1), Ficha web (1) | — |
| `triagem.Destino - Outro Nota` | Triagem / Análise e Acompanhamento | texto-longo | editável | `destino_outro_nota` | `triagem` | HERO (1), Ficha web (1) | — |
| `origem.Mapa de próximos passos` | Triagem / Análise e Acompanhamento | texto-longo | editável | `mapa_proximos_passos` | `origem` | HERO (3+), Ficha web (1) | — |
| `triagem.Histórico de julgamento` | Triagem / Análise e Acompanhamento | tabela | editável | `historico_julgamento` | `triagem` | HERO (3+), Ficha web (3+) | — |
| `triagem.Registro - Triagem` | Triagem / Análise e Acompanhamento | texto-longo | consulta | `registro_triagem` | `triagem` | Ficha web (1) | — |
| `origem.Responsável` | Triagem / Análise e Acompanhamento | texto | editável | `responsavel` | `origem` | HERO (1), Ficha web (2) | — |
| `origem.Solicitações manuais` | Triagem / Análise e Acompanhamento | texto-longo | editável | `solicitacoes_manuais` | `origem` | HERO (3+), Ficha web (1), API (3+) | — |
| `origem.Solicitações de despacho` | Triagem / Análise e Acompanhamento | texto-longo | editável | `solicitacoes_despacho` | `origem` | HERO (1), Ficha web (1) | — |
| `origem.Próximo pronunciamento` | Triagem / Análise e Acompanhamento | lista | editável | `proximo_pronunciamento` | `origem` | HERO (2), Ficha web (1) | — |
| `origem.Ato a proferir` | Triagem / Análise e Acompanhamento | texto-longo | editável | `ato_a_proferir` | `origem` | HERO (1), Ficha web (1) | — |
| `origem.Próxima ação` | Triagem / Análise e Acompanhamento | texto | editável | `proxima_acao` | `origem` | HERO (1), Ficha web (2), API (1) | — |
| `origem.Conferência dos autos` | Triagem / Análise e Acompanhamento | texto-longo | editável | `conferencia_autos` | `origem` | Ficha web (1) | — |
| `origem.Notas fixadas` | Triagem / Análise e Acompanhamento | texto-longo | editável | `notas_fixadas` | `origem` | HERO (2), Ficha web (1) | — |
| `origem.Observações` | Triagem / Análise e Acompanhamento | texto-longo | editável | `observacoes` | `origem` | HERO (1), Ficha web (3+), API (3+) | `observacoes` |
| `triagem.Registro - Situação atual` | Triagem / Análise e Acompanhamento | texto-longo | consulta | `registro_situacao_atual` | `triagem` | HERO (1), Ficha web (1) | — |
| `triagem.Padrão - Espécie` | Triagem / Análise e Acompanhamento | lista | legado | `padrao_especie` | `triagem` | HERO (3+), Gerador (2), Ficha web (3+), API (3+) | — |
| `triagem.Registro - Lote` | Triagem / Análise e Indexação | texto | consulta | `registro_lote` | `triagem` | HERO (1), Ficha web (1) | — |
| `triagem.Registro - Grupo` | Triagem / Análise e Indexação | texto-longo | consulta | `registro_grupo` | `triagem` | HERO (1), Ficha web (1) | — |
| `producao.Modelo aplicável` | Triagem / Análise e Indexação | texto | editável | `modelo_aplicavel` | `producao` | HERO (2) | — |
| `producao.Variação do modelo` | Triagem / Análise e Indexação | texto | editável | `variacao_modelo` | `producao` | HERO (1) | — |
| `triagem.Registro - Variações` | Triagem / Análise e Indexação | texto | consulta | `registro_variacoes` | `triagem` | HERO (1), Ficha web (1) | — |
| `triagem.Registro - Modelo` | Triagem / Análise e Indexação | texto-longo | consulta | `registro_modelo` | `triagem` | HERO (1), Ficha web (1) | — |
| `triagem.Tempestividade` | Triagem / Admissibilidade e regularidade | lista | editável | `tempestividade` | `triagem` | HERO (1), Autos (1), Ficha web (3+), API (2) | `regularidade.tempestividade` |
| `triagem.Preparo` | Triagem / Admissibilidade e regularidade | lista | editável | `preparo` | `triagem` | HERO (1), Autos (1), Ficha web (3+), API (2) | `regularidade.preparo` |
| `triagem.Preparo por recurso` | Triagem / Admissibilidade e regularidade | tabela | editável | `preparo_por_recurso` | `triagem` | Autos (1) | — |
| `triagem.Preparo - Recorrente` | Triagem / Admissibilidade e regularidade | texto | editável | `preparo_recorrente` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - ID recurso` | Triagem / Admissibilidade e regularidade | texto | editável | `preparo_id_recurso` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - ID guia` | Triagem / Admissibilidade e regularidade | texto | editável | `preparo_id_guia` | `triagem` | Autos (1) | — |
| `triagem.Preparo - ID comprovante` | Triagem / Admissibilidade e regularidade | texto | editável | `preparo_id_comprovante` | `triagem` | Autos (1) | — |
| `triagem.Preparo - Tipo comprovante` | Triagem / Admissibilidade e regularidade | lista | editável | `preparo_tipo_comprovante` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - Conferência STN` | Triagem / Admissibilidade e regularidade | lista | editável | `preparo_conferencia_stn` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - Código receita` | Triagem / Admissibilidade e regularidade | texto | editável | `preparo_codigo_receita` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - UG` | Triagem / Admissibilidade e regularidade | texto | editável | `preparo_ug` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - Vinculação` | Triagem / Admissibilidade e regularidade | lista | editável | `preparo_vinculacao` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - Valor devido` | Triagem / Admissibilidade e regularidade | texto | editável | `preparo_valor_devido` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - Valor recolhido` | Triagem / Admissibilidade e regularidade | texto | editável | `preparo_valor_recolhido` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - Data recolhimento` | Triagem / Admissibilidade e regularidade | data | editável | `preparo_data_recolhimento` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - Data comprovação` | Triagem / Admissibilidade e regularidade | data | editável | `preparo_data_comprovacao` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - ID AJG` | Triagem / Admissibilidade e regularidade | texto | editável | `preparo_id_ajg` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - Situação AJG` | Triagem / Admissibilidade e regularidade | lista | editável | `preparo_situacao_ajg` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - Fundamento dispensa` | Triagem / Admissibilidade e regularidade | texto-longo | editável | `preparo_fundamento_dispensa` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - Regularização` | Triagem / Admissibilidade e regularidade | lista | editável | `preparo_regularizacao` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - ID intimação` | Triagem / Admissibilidade e regularidade | texto | editável | `preparo_id_intimacao` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - Prazo regularização` | Triagem / Admissibilidade e regularidade | data | editável | `preparo_prazo_regularizacao` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - Cumprimento` | Triagem / Admissibilidade e regularidade | lista | editável | `preparo_cumprimento` | `triagem` | dinâmico / a conferir | — |
| `triagem.Preparo - Conferência` | Triagem / Admissibilidade e regularidade | texto-longo | editável | `preparo_conferencia` | `triagem` | dinâmico / a conferir | — |
| `triagem.DPU (controle)` | Triagem / Admissibilidade e regularidade | texto | editável | `dpu_controle` | `triagem` | Ficha web (2), API (3+) | `regularidade.dpu` |
| `triagem.Representação` | Triagem / Admissibilidade e regularidade | lista | editável | `representacao` | `triagem` | HERO (1), Autos (3+), Ficha web (3+), API (3+) | `regularidade.representacao` |
| `triagem.ID da Procuração` | Triagem / Admissibilidade e regularidade | texto | editável | `procuracao_id` | `triagem` | HERO (2), Autos (1), Ficha web (2) | `regularidade.procuracaoId` |
| `triagem.Observação do Impedimento` | Triagem / Admissibilidade e regularidade | texto | editável | `observacao_impedimento` | `triagem` | dinâmico / a conferir | — |
| `triagem.Regularidade` | Triagem / Admissibilidade e regularidade | texto | calculado | `regularidade` | `triagem` | dinâmico / a conferir | — |
| `triagem.Regularidade Manual` | Triagem / Admissibilidade e regularidade | texto-longo | editável | `regularidade_manual` | `triagem` | dinâmico / a conferir | — |
| `triagem.Observação da Representação` | Triagem / Admissibilidade e regularidade | texto-longo | editável | `observacao_representacao` | `triagem` | API (2) | — |
| `triagem.Tempest - Publicação` | Triagem / Admissibilidade e regularidade | data | editável | `tempest_publicacao` | `triagem` | Autos (1), Ficha web (1), API (3+) | `regularidade.intimacao` |
| `triagem.Tempest - Protocolo` | Triagem / Admissibilidade e regularidade | data | editável | `tempest_protocolo` | `triagem` | Ficha web (1), API (3+) | — |
| `triagem.Tempest - Prazo legal` | Triagem / Admissibilidade e regularidade | numero | editável | `tempest_prazo_legal` | `triagem` | Ficha web (1), API (2) | — |
| `triagem.Tempest - Dobro` | Triagem / Admissibilidade e regularidade | lista | editável | `tempest_dobro` | `triagem` | Ficha web (1), API (2) | — |
| `triagem.Tempest - Suspensões` | Triagem / Admissibilidade e regularidade | texto | editável | `tempest_suspensoes` | `triagem` | Ficha web (1) | — |
| `triagem.AJG` | Triagem / Admissibilidade e regularidade | texto | editável | `ajg` | `triagem` | Ficha web (2), API (3+) | `regularidade.ajg` |
| `triagem.Impedimento / Suspeição` | Triagem / Admissibilidade e regularidade | texto | editável | `impedimento_suspeicao` | `triagem` | Ficha web (1) | `regularidade.impedimento` |
| `triagem.Procurações` | Triagem / Admissibilidade e regularidade | tabela | editável | `procuracoes` | `triagem` | HERO (1), Autos (2), Ficha web (3+) | — |
| `triagem.Cabimento recursal` | Triagem / Admissibilidade e regularidade | lista | editável | `cabimento_recursal` | `triagem` | dinâmico / a conferir | — |
| `triagem.Cabimento - Fundamento` | Triagem / Admissibilidade e regularidade | texto-longo | editável | `cabimento_fundamento` | `triagem` | dinâmico / a conferir | — |
| `triagem.Instrução recursal` | Triagem / Admissibilidade e regularidade | lista | editável | `instrucao_recursal` | `triagem` | dinâmico / a conferir | — |
| `triagem.Instrução - Pendências` | Triagem / Admissibilidade e regularidade | texto-longo | editável | `instrucao_pendencias` | `triagem` | dinâmico / a conferir | — |
| `triagem.Dialeticidade` | Triagem / Admissibilidade e regularidade | lista | editável | `dialeticidade` | `triagem` | dinâmico / a conferir | — |
| `triagem.Dialeticidade - Fundamento` | Triagem / Admissibilidade e regularidade | texto-longo | editável | `dialeticidade_fundamento` | `triagem` | dinâmico / a conferir | — |
| `triagem.Inovação recursal` | Triagem / Admissibilidade e regularidade | lista | editável | `inovacao_recursal` | `triagem` | dinâmico / a conferir | — |
| `triagem.Inovação - Pontos` | Triagem / Admissibilidade e regularidade | texto-longo | editável | `inovacao_pontos` | `triagem` | dinâmico / a conferir | — |
| `triagem.Reexame - Cabimento` | Triagem / Admissibilidade e regularidade | lista | editável | `reexame_cabimento` | `triagem` | dinâmico / a conferir | — |
| `triagem.Reexame - Fundamento` | Triagem / Admissibilidade e regularidade | texto-longo | editável | `reexame_fundamento` | `triagem` | dinâmico / a conferir | — |
| `triagem.AgInt - Impugnação específica` | Triagem / Admissibilidade e regularidade | lista | editável | `agint_impugnacao_especifica` | `triagem` | dinâmico / a conferir | — |
| `triagem.Admissibilidade - Observação` | Triagem / Admissibilidade e regularidade | texto-longo | editável | `admissibilidade_observacao` | `triagem` | dinâmico / a conferir | — |
| `triagem.Mídias` | Triagem / Admissibilidade e regularidade | lista | editável | `midias` | `triagem` | HERO (1), Ficha web (2), API (3+) | `regularidade.midias` |
| `triagem.Gratuidade - Tipo de pessoa` | Triagem / Admissibilidade e regularidade | lista | editável | `gratuidade_tipo_pessoa` | `triagem` | dinâmico / a conferir | — |
| `triagem.Tempestividade por recurso` | Triagem / Admissibilidade e regularidade | tabela | editável | `tempestividade_por_recurso` | `triagem` | Autos (2), Gerador (1) | — |
| `triagem.MPF` | Triagem / Ministério Público | lista | editável | `parecer_mpf` | `triagem` | HERO (3+), Autos (3+), Gerador (2), Ficha web (1), API (2) | `regularidade.mpfParecer` |
| `triagem.MPF - Custos Legis` | Triagem / Ministério Público | lista | editável | `mpf_custos_legis` | `triagem` | HERO (1), API (3+) | `regularidade.mpfAtuacao` |
| `triagem.ID do Parecer MPF` | Triagem / Ministério Público | texto | editável | `parecer_mpf_id` | `triagem` | HERO (3+), Gerador (1), Ficha web (1), API (3+) | `regularidade.mpfId` |
| `triagem.Parecer - Sentido` | Triagem / Ministério Público | lista | editável | `parecer_sentido` | `triagem` | HERO (2), Gerador (2), Ficha web (1), API (3+) | `regularidade.mpfSentido` |
| `triagem.MPF - Info adicional` | Triagem / Ministério Público | texto-longo | editável | `mpf_info_adicional` | `triagem` | HERO (1) | `regularidade.mpfInfo` |
| `triagem.Observação MPF` | Triagem / Ministério Público | texto-longo | editável | `observacao_mpf` | `triagem` | API (2) | — |
| `triagem.MPF - Data` | Triagem / Ministério Público | data | editável | `mpf_data` | `triagem` | HERO (1), Ficha web (1) | — |
| `triagem.Parecer - Sentido (outro)` | Triagem / Ministério Público | texto | editável | `parecer_sentido_outro` | `triagem` | HERO (1), Gerador (1) | — |
| `triagem.O que falta sanar` | Triagem / Sinalizações | texto-longo | editável | `que_falta_sanar` | `triagem` | HERO (3+), Ficha web (3+), API (2) | `triagem.pendencias` |
| `triagem.Intercorrências` | Triagem / Sinalizações | texto-longo | editável | `intercorrencias` | `triagem` | HERO (3+), Ficha web (1), API (3+) | — |
| `triagem.Avisos` | Triagem / Sinalizações | texto-longo | editável | `avisos` | `triagem` | HERO (3+), Ficha web (1), API (1) | — |
| `triagem.ED - Vício` | Triagem / Embargos de declaração | texto | editável | `ed_vicio` | `triagem` | HERO (1), Gerador (3+) | `recursoTipo.edVicios` |
| `triagem.ED - Ponto` | Triagem / Embargos de declaração | texto-longo | editável | `ed_ponto` | `triagem` | Gerador (3+) | `recursoTipo.edPonto` |
| `triagem.AgInt - Fundamentos` | Triagem / Agravo interno | texto-longo | editável | `agint_fundamentos` | `triagem` | HERO (1), Gerador (2) | `recursoTipo.agintFundamentos` |
| `triagem.Retratação - Tribunal` | Triagem / Juízo de retratação | lista | editável | `retratacao_tribunal` | `triagem` | Gerador (1) | `recursoTipo.jrTribunal` |
| `triagem.Retratação - Tema` | Triagem / Juízo de retratação | texto | editável | `retratacao_tema` | `triagem` | Gerador (2) | — |
| `triagem.Retratação - Precedente` | Triagem / Juízo de retratação | texto | editável | `retratacao_precedente` | `triagem` | Gerador (1) | `recursoTipo.jrPrecedente` |
| `triagem.Retratação - Síntese` | Triagem / Juízo de retratação | texto-longo | editável | `retratacao_sintese` | `triagem` | dinâmico / a conferir | `recursoTipo.jrQuestao` |
| `triagem.Retratação - Devolução ID` | Triagem / Juízo de retratação | texto | editável | `retratacao_devolucao_id` | `triagem` | Gerador (1) | `recursoTipo.jrDevolucaoId` |
| `triagem.Retratação - Devolução órgão` | Triagem / Juízo de retratação | texto | editável | `retratacao_devolucao_orgao` | `triagem` | dinâmico / a conferir | — |
| `triagem.Retratação - Devolução mês` | Triagem / Juízo de retratação | texto | editável | `retratacao_devolucao_mes` | `triagem` | Gerador (1) | `recursoTipo.jrDevolucaoMes` |
| `triagem.Retratação - ED` | Triagem / Juízo de retratação | lista | editável | `retratacao_ed` | `triagem` | dinâmico / a conferir | `recursoTipo.jrEd` |
| `triagem.Retratação - ED IDs` | Triagem / Juízo de retratação | texto | editável | `retratacao_ed_ids` | `triagem` | dinâmico / a conferir | — |
| `triagem.Retratação - ED data` | Triagem / Juízo de retratação | data | editável | `retratacao_ed_data` | `triagem` | dinâmico / a conferir | — |
| `producao.SERVIDOR` | Produção / Designação e minuta | texto | editável | `servidor` | `producao` | HERO (2), Ficha web (3+), API (2) | `caso.servidor` |
| `producao.MINUTADO` | Produção / Designação e minuta | data | editável | `minutado` | `producao` | HERO (1), Ficha web (3+), API (2) | `workflow.minutadoEm` |
| `producao.Refinado` | Produção / Designação e minuta | simnao | editável | `refinado` | `producao` | dinâmico / a conferir | — |
| `producao.CORRETOR` | Produção / Revisão | texto | editável | `corretor` | `producao` | HERO (2), Ficha web (3+), API (2) | `caso.corretor` |
| `producao.CORRIGIDO` | Produção / Revisão | simnao | editável | `corrigido` | `producao` | HERO (2), Ficha web (3+), API (1) | — |
| `producao.Data da Revisão` | Produção / Revisão | data | editável | `data_revisao` | `producao` | HERO (2), Ficha web (3+), API (3+) | `workflow.corrigidoEm` |
| `producao.Rev - Atenção` | Produção / Revisão | simnao | editável | `rev_atencao` | `producao` | Ficha web (1) | — |
| `producao.Rev - Mérito` | Produção / Revisão | simnao | editável | `rev_merito` | `producao` | dinâmico / a conferir | — |
| `producao.Rev - Honorários` | Produção / Revisão | simnao | editável | `rev_honorarios` | `producao` | dinâmico / a conferir | — |
| `producao.Rev - IDs` | Produção / Revisão | texto | editável | `rev_ids` | `producao` | dinâmico / a conferir | — |
| `producao.Rev - Nota de atenção` | Produção / Revisão | texto-longo | editável | `rev_nota_atencao` | `producao` | Ficha web (1) | — |
| `producao.Lote` | Produção / Lote e correção (Index) | texto | consulta | `lote` | `producao` | HERO (2) | — |
| `producao.Lote - Tipo de caso` | Produção / Lote e correção (Index) | texto | consulta | `lote_tipo_caso` | `producao` | HERO (1) | — |
| `producao.Lote - Resultado` | Produção / Lote e correção (Index) | texto | consulta | `lote_resultado` | `producao` | dinâmico / a conferir | — |
| `producao.Lote - Variações` | Produção / Lote e correção (Index) | texto | consulta | `lote_variacoes` | `producao` | HERO (1) | — |
| `producao.Lote - Caso` | Produção / Lote e correção (Index) | texto-longo | consulta | `lote_caso` | `producao` | HERO (1) | — |
| `producao.Lote - Observação` | Produção / Lote e correção (Index) | texto-longo | consulta | `lote_observacao` | `producao` | dinâmico / a conferir | — |
| `producao.Lote - Ajustes da correção` | Produção / Lote e correção (Index) | tabela | consulta | `lote_ajustes_correcao` | `producao` | dinâmico / a conferir | — |
| `producao.Lote - Pendências` | Produção / Lote e correção (Index) | texto-longo | consulta | `lote_pendencias` | `producao` | dinâmico / a conferir | — |
| `producao.Lote - Minuta` | Produção / Lote e correção (Index) | texto-longo | consulta | `lote_minuta` | `producao` | dinâmico / a conferir | — |
| `producao.Rev - Ementa` | Produção / Revisão do acórdão (ementa) | simnao | editável | `rev_ementa` | `producao` | HERO (1) | — |
| `producao.Rev - Subementa` | Produção / Revisão do acórdão (ementa) | simnao | editável | `rev_subementa` | `producao` | HERO (1) | — |
| `producao.Relatório Padronizado` | Produção / Relatório, voto e ementa | simnao | editável | `relatorio_padronizado` | `producao` | HERO (1) | — |
| `producao.Adequação Ementa` | Produção / Relatório, voto e ementa | simnao | editável | `adequacao_ementa` | `producao` | HERO (1) | — |
| `producao.Formatação Subementa` | Produção / Relatório, voto e ementa | simnao | editável | `formatacao_subementa` | `producao` | HERO (1) | — |
| `producao.Voto - Resultado` | Produção / Relatório, voto e ementa; Produção / Decisão monocrática | texto / lista | editável | `resultado_julgamento` | `producao` | HERO (3+), Gerador (3+), Ficha web (3+), API (3+) | `julgamento.resultado` |
| `producao.Voto - Honorários` | Produção / Relatório, voto e ementa; Produção / Decisão monocrática | texto / lista | editável | `honorarios_julgamento` | `producao` | HERO (3+), Gerador (1), API (3+) | `julgamento.honorarios` |
| `producao.Tópico-síntese` | Produção / Relatório, voto e ementa; Produção / Decisão monocrática | texto | editável | `topico_sintese` | `producao` | HERO (3+), Ficha web (2), API (3+) | — |
| `producao.Mídias Necessárias` | Produção / Relatório, voto e ementa | texto | editável | `midias_necessarias` | `producao` | HERO (1) | — |
| `producao.Voto - Descrição` | Produção / Relatório, voto e ementa; Produção / Decisão monocrática | texto-longo | editável | `voto_descricao` | `producao` | HERO (2), Gerador (1), API (3+) | `julgamento.fundamentacao` |
| `triagem.Tipo de Voto` | Produção / Relatório, voto e ementa | texto | editável | `tipo_voto` | `triagem` | HERO (3+) | — |
| `producao.LIBERADO` | Produção / Liberação para a sessão | simnao | editável | `liberado` | `producao` | HERO (3+), Ficha web (3+), API (1) | — |
| `producao.Data da Liberação` | Produção / Liberação para a sessão; Produção / Decisão monocrática | data | editável | `data_liberacao` | `producao` | HERO (3+), Ficha web (3+), API (3+) | `workflow.liberadoEm` |
| `producao.Mono - Tipo de ato` | Produção / Ato e fundamento | lista | editável | `mono_tipo_ato` | `producao` | HERO (3+), Ficha web (3+), API (3+) | — |
| `producao.Mono - Fundamento` | Produção / Ato e fundamento | texto-longo | editável | `mono_fundamento` | `producao` | HERO (3+), Gerador (1), API (2) | — |
| `producao.Mono - Título` | Produção / Ato e fundamento | texto | editável | `mono_titulo` | `producao` | HERO (1), API (2) | — |
| `producao.Art. 932 - Confirmação` | Produção / Ato e fundamento | texto-longo | editável | `art932_confirmacao` | `producao` | HERO (2) | — |
| `producao.Assinado` | Produção / Decisão monocrática | simnao | editável | `assinado` | `producao` | HERO (2), Autos (1), Ficha web (3+), API (1) | — |
| `producao.Data da Assinatura` | Produção / Decisão monocrática | data | editável | `data_assinatura` | `producao` | HERO (3+), Ficha web (3+), API (3+) | — |
| `producao.Decisão - ID` | Produção / Decisão monocrática | texto | editável | `decisao_id` | `producao` | HERO (2), Ficha web (2), API (1) | — |
| `producao.Publicado` | Produção / Decisão monocrática | simnao | editável | `publicado` | `producao` | HERO (1), Autos (1), Ficha web (2), API (1) | — |
| `producao.Mono - Data da publicação` | Produção / Decisão monocrática | data | editável | `mono_data_publicacao` | `producao` | HERO (2), Ficha web (3+), API (1) | — |
| `producao.Objeto do recurso` | Produção / Plano do pronunciamento | texto-longo | editável | `objeto_recurso` | `producao` | HERO (1) | — |
| `producao.Objeto devolvido` | Produção / Plano do pronunciamento | texto-longo | editável | `objeto_devolvido` | `producao` | HERO (1) | — |
| `producao.Limites do julgamento` | Produção / Plano do pronunciamento | texto-longo | editável | `limites_julgamento` | `producao` | HERO (1) | — |
| `producao.Matérias de ofício` | Produção / Plano do pronunciamento | texto-longo | editável | `materias_oficio` | `producao` | HERO (1) | — |
| `producao.Conhecimento do recurso` | Produção / Solução processual | lista | editável | `conhecimento_recurso` | `producao` | HERO (1) | — |
| `producao.Preliminares acolhidas` | Produção / Solução processual | texto-longo | editável | `preliminares_acolhidas` | `producao` | HERO (1) | — |
| `producao.Preliminares rejeitadas` | Produção / Solução processual | texto-longo | editável | `preliminares_rejeitadas` | `producao` | HERO (1) | — |
| `producao.Prejudiciais de mérito` | Produção / Solução processual | texto-longo | editável | `prejudiciais_merito` | `producao` | HERO (1) | — |
| `producao.Extensão do conhecimento` | Produção / Solução processual | texto-longo | editável | `extensao_conhecimento` | `producao` | HERO (1) | — |
| `producao.Tese jurídica adotada` | Produção / Fundamentação e dispositivo | texto-longo | editável | `tese_juridica_adotada` | `producao` | HERO (1), Gerador (2) | — |
| `producao.Dispositivos legais aplicáveis` | Produção / Fundamentação e dispositivo | texto-longo | editável | `dispositivos_legais_aplicaveis` | `producao` | HERO (1), Gerador (1) | — |
| `producao.Precedentes aplicáveis` | Produção / Fundamentação e dispositivo | texto-longo | editável | `precedentes_aplicaveis` | `producao` | HERO (1), Gerador (2) | — |
| `producao.Distinção de precedente` | Produção / Fundamentação e dispositivo | texto-longo | editável | `distincao_precedente` | `producao` | HERO (1) | — |
| `producao.Aplicação ao caso concreto` | Produção / Fundamentação e dispositivo | texto-longo | editável | `aplicacao_ao_caso_concreto` | `producao` | HERO (1), Gerador (3+) | — |
| `producao.Extensão da reforma` | Produção / Fundamentação e dispositivo | texto-longo | editável | `extensao_reforma` | `producao` | HERO (1) | — |
| `producao.Capítulos mantidos` | Produção / Fundamentação e dispositivo | texto-longo | editável | `capitulos_mantidos` | `producao` | HERO (1) | — |
| `producao.Capítulos reformados` | Produção / Fundamentação e dispositivo | texto-longo | editável | `capitulos_reformados` | `producao` | HERO (1) | — |
| `producao.Providências determinadas` | Produção / Fundamentação e dispositivo | texto-longo | editável | `providencias_determinadas` | `producao` | HERO (1), Gerador (1) | — |
| `producao.Dispositivo do pronunciamento` | Produção / Fundamentação e dispositivo | texto-longo | editável | `dispositivo_pronunciamento` | `producao` | HERO (1), Gerador (3+) | — |
| `producao.Particularidades do relatório` | Produção / Fundamentação e dispositivo | texto-longo | editável | `particularidades_relatorio` | `producao` | HERO (1), Gerador (1) | — |
| `producao.Honorários - Percentual ou valor` | Produção / Sucumbência e consectários do julgamento | texto | editável | `honorarios_percentual_ou_valor` | `producao` | HERO (1), Gerador (1) | — |
| `producao.Honorários - Base de cálculo` | Produção / Sucumbência e consectários do julgamento | texto | editável | `honorarios_base_calculo` | `producao` | HERO (1) | — |
| `producao.Honorários recursais` | Produção / Sucumbência e consectários do julgamento | lista | editável | `honorarios_recursais` | `producao` | HERO (1), Gerador (1) | — |
| `producao.Custas no julgamento` | Produção / Sucumbência e consectários do julgamento | texto-longo | editável | `custas_julgamento` | `producao` | HERO (1) | — |
| `producao.Gratuidade no julgamento` | Produção / Sucumbência e consectários do julgamento | texto-longo | editável | `gratuidade_julgamento` | `producao` | HERO (1) | — |
| `producao.Juros e correção monetária` | Produção / Sucumbência e consectários do julgamento | texto-longo | editável | `juros_correcao_monetaria` | `producao` | HERO (1), Gerador (1) | — |
| `producao.Termo inicial dos efeitos` | Produção / Sucumbência e consectários do julgamento | texto | editável | `termo_inicial_efeitos` | `producao` | HERO (1) | — |
| `producao.Fundamento da sucumbência` | Produção / Sucumbência e consectários do julgamento | texto-longo | editável | `fundamento_sucumbencia` | `producao` | HERO (1), Gerador (3+) | — |
| `producao.Natureza da condenação` | Produção / Sucumbência e consectários do julgamento | lista | editável | `natureza_condenacao` | `producao` | HERO (1) | — |
| `producao.Consectários no julgamento` | Produção / Sucumbência e consectários do julgamento | simnao | editável | `consectarios_julgamento` | `producao` | HERO (1), API (3+) | — |
| `producao.Resultado por recurso` | Produção / Resultado individualizado | tabela | editável | `resultado_recurso` | `producao` | HERO (2), Gerador (2) | — |
| `producao.Apelação - Capítulos impugnados` | Produção / Questões específicas da espécie | texto-longo | editável | `apelacao_capitulos_impugnados` | `producao` | dinâmico / a conferir | — |
| `producao.Remessa - Extensão do reexame` | Produção / Questões específicas da espécie | texto-longo | editável | `remessa_extensao_reexame` | `producao` | dinâmico / a conferir | — |
| `producao.AI - Tutela recursal` | Produção / Questões específicas da espécie | texto-longo | editável | `ai_tutela_recursal` | `producao` | dinâmico / a conferir | — |
| `producao.AI - Perda do objeto` | Produção / Questões específicas da espécie | texto-longo | editável | `ai_perda_objeto` | `producao` | dinâmico / a conferir | — |
| `producao.ED - Vício reconhecido` | Produção / Questões específicas da espécie | texto-longo | editável | `ed_vicio_reconhecido` | `producao` | dinâmico / a conferir | — |
| `producao.ED - Integração` | Produção / Questões específicas da espécie | texto-longo | editável | `ed_integracao` | `producao` | dinâmico / a conferir | — |
| `producao.ED - Efeitos modificativos` | Produção / Questões específicas da espécie | simnao | editável | `ed_efeitos_modificativos` | `producao` | Gerador (1) | — |
| `producao.ED - Prequestionamento` | Produção / Questões específicas da espécie | texto-longo | editável | `ed_prequestionamento` | `producao` | dinâmico / a conferir | — |
| `producao.AgInt - Solução` | Produção / Questões específicas da espécie | texto-longo | editável | `agint_solucao` | `producao` | dinâmico / a conferir | — |
| `producao.AgInt - Multa` | Produção / Questões específicas da espécie | texto-longo | editável | `agint_multa` | `producao` | dinâmico / a conferir | — |
| `producao.JR - Aderência ao precedente` | Produção / Questões específicas da espécie | texto-longo | editável | `jr_aderencia_ao_precedente` | `producao` | dinâmico / a conferir | — |
| `producao.JR - Solução` | Produção / Questões específicas da espécie | texto-longo | editável | `jr_solucao` | `producao` | dinâmico / a conferir | — |
| `producao.MS - Direito líquido e certo` | Produção / Questões específicas da espécie | texto-longo | editável | `ms_direito_liquido_certo` | `producao` | dinâmico / a conferir | — |
| `producao.MS - Prova pré-constituída` | Produção / Questões específicas da espécie | texto-longo | editável | `ms_prova_pre_constituida` | `producao` | dinâmico / a conferir | — |
| `producao.Destino` | Produção / Seletor de destino; Controles especiais / Monocrática | lista | editável | `destino` | `producao` | HERO (3+), Autos (1), Gerador (1), Ficha web (3+), API (3+) | — |
| `triagem.Urgência` | Controles especiais / Urgência | lista | editável | `urgencia` | `triagem` | HERO (3+), Ficha web (3+), API (3+) | — |
| `triagem.Urgência - Nível` | Controles especiais / Urgência | lista | editável | `urgencia_nivel` | `triagem` | Ficha web (1), API (3+) | — |
| `triagem.Urgência - Data` | Controles especiais / Urgência | data | editável | `urgencia_data` | `triagem` | Ficha web (3+), API (3+) | — |
| `triagem.Urgência - Apreciação` | Controles especiais / Urgência | lista | editável | `urgencia_apreciacao` | `triagem` | HERO (1), Ficha web (3+), API (3+) | — |
| `triagem.Urgência - Apreciada em` | Controles especiais / Urgência | data | editável | `urgencia_apreciada` | `triagem` | API (3+) | — |
| `triagem.Urgência - Observação` | Controles especiais / Urgência | texto-longo | editável | `urgencia_observacao` | `triagem` | HERO (1), API (2) | — |
| `triagem.Urgência - Painel` | Controles especiais / Urgência | simnao | editável | `urgencia_painel` | `triagem` | API (2) | — |
| `controles.Monocrática - Registrada em` | Controles especiais / Monocrática | data | editável | `monocratica_registrada` | `controles` | Ficha web (1), API (1) | — |
| `controles.Monocrática - Prazo` | Controles especiais / Monocrática | data | editável | `monocratica_prazo` | `controles` | dinâmico / a conferir | — |
| `controles.Monocrática - Observação` | Controles especiais / Monocrática | texto-longo | editável | `monocratica_observacao` | `controles` | dinâmico / a conferir | — |
| `controles.Monocrática - Atualizado por` | Controles especiais / Monocrática | texto | consulta | `monocratica_atualizado` | `controles` | dinâmico / a conferir | — |
| `controles.Monocrática - Atualizado em` | Controles especiais / Monocrática | data | consulta | `controles_monocratica_atualizado` | `controles` | dinâmico / a conferir | — |
| `triagem.META` | Controles especiais / Meta | texto | editável | `meta` | `triagem` | HERO (2), Ficha web (3+) | `caso.meta` |
| `controles.Meta - Situação` | Controles especiais / Meta | lista | editável | `meta_situacao` | `controles` | Ficha web (1) | — |
| `controles.Meta - Prazo da providência` | Controles especiais / Meta | data | editável | `meta_prazo_providencia` | `controles` | Ficha web (1) | — |
| `controles.Meta - Próxima providência` | Controles especiais / Meta | texto | editável | `meta_proxima_providencia` | `controles` | dinâmico / a conferir | — |
| `controles.Meta - Responsável` | Controles especiais / Meta | texto | editável | `meta_responsavel` | `controles` | dinâmico / a conferir | — |
| `controles.Meta - Observação` | Controles especiais / Meta | texto-longo | editável | `meta_observacao` | `controles` | dinâmico / a conferir | — |
| `controles.Meta - Atualizado por` | Controles especiais / Meta | texto | consulta | `meta_atualizado` | `controles` | dinâmico / a conferir | — |
| `controles.Meta - Atualizado em` | Controles especiais / Meta | data | consulta | `controles_meta_atualizado` | `controles` | dinâmico / a conferir | — |
| `controles.Sobrestamento - Motivo` | Controles especiais / Sobrestamento | lista | editável | `sobrestamento_motivo` | `controles` | HERO (2), Ficha web (1) | — |
| `controles.Sobrestamento - Tema` | Controles especiais / Sobrestamento | texto | editável | `sobrestamento_tema` | `controles` | HERO (2), Ficha web (2) | — |
| `controles.Sobrestamento - Situação do precedente` | Controles especiais / Sobrestamento | lista | editável | `sobrestamento_situacao_precedente` | `controles` | Ficha web (1) | — |
| `controles.Sobrestamento - Previsão de retirada` | Controles especiais / Sobrestamento | data | editável | `sobrestamento_previsao_retirada` | `controles` | Ficha web (1) | — |
| `controles.Sobrestamento - Sem previsão` | Controles especiais / Sobrestamento | simnao | editável | `sobrestamento_sem_previsao` | `controles` | dinâmico / a conferir | — |
| `controles.Sobrestamento - Próxima providência` | Controles especiais / Sobrestamento | texto | editável | `sobrestamento_proxima_providencia` | `controles` | dinâmico / a conferir | — |
| `controles.Sobrestamento - Responsável` | Controles especiais / Sobrestamento | texto | editável | `sobrestamento_responsavel` | `controles` | dinâmico / a conferir | — |
| `controles.Sobrestamento - Observação` | Controles especiais / Sobrestamento | texto-longo | editável | `sobrestamento_observacao` | `controles` | dinâmico / a conferir | — |
| `controles.Sobrestamento - Atualizado por` | Controles especiais / Sobrestamento | texto | consulta | `sobrestamento_atualizado` | `controles` | dinâmico / a conferir | — |
| `controles.Sobrestamento - Atualizado em` | Controles especiais / Sobrestamento | data | consulta | `controles_sobrestamento_atualizado` | `controles` | dinâmico / a conferir | — |
| `controles.Sensível - Categoria` | Controles especiais / Caso sensível | lista | editável | `sensivel_categoria` | `controles` | HERO (2), Ficha web (2) | — |
| `controles.Sensível - Incluído` | Controles especiais / Caso sensível | simnao | editável | `sensivel_incluido` | `controles` | HERO (1), Ficha web (1), API (2) | — |
| `controles.Sensível - Excluído` | Controles especiais / Caso sensível | simnao | editável | `sensivel_excluido` | `controles` | HERO (2), Ficha web (1), API (2) | — |
| `controles.Sensível - Quadro` | Controles especiais / Caso sensível | texto-longo | editável | `sensivel_quadro` | `controles` | HERO (2) | — |
| `controles.Sensível - Decisão` | Controles especiais / Caso sensível | lista | editável | `sensivel_decisao` | `controles` | dinâmico / a conferir | — |
| `controles.Sensível - Cumprimento` | Controles especiais / Caso sensível | lista | editável | `sensivel_cumprimento` | `controles` | Ficha web (1) | — |
| `controles.Sensível - Última verificação` | Controles especiais / Caso sensível | data | editável | `sensivel_ultima_verificacao` | `controles` | dinâmico / a conferir | — |
| `controles.Sensível - Próxima verificação` | Controles especiais / Caso sensível | data | editável | `sensivel_proxima_verificacao` | `controles` | Ficha web (1) | — |
| `controles.Sensível - Próxima providência` | Controles especiais / Caso sensível | texto | editável | `sensivel_proxima_providencia` | `controles` | dinâmico / a conferir | — |
| `controles.Sensível - Responsável` | Controles especiais / Caso sensível | texto | editável | `sensivel_responsavel` | `controles` | dinâmico / a conferir | — |
| `controles.Sensível - Observação` | Controles especiais / Caso sensível | texto-longo | editável | `sensivel_observacao` | `controles` | dinâmico / a conferir | — |
| `controles.Sensível - Atualizado por` | Controles especiais / Caso sensível | texto | consulta | `sensivel_atualizado` | `controles` | dinâmico / a conferir | — |
| `controles.Sensível - Atualizado em` | Controles especiais / Caso sensível | data | consulta | `controles_sensivel_atualizado` | `controles` | dinâmico / a conferir | — |
| `pauta.Status de Julgamento` | Pauta / Pauta e julgamento | lista | editável | `status_julgamento` | `pauta` | HERO (3+), Ficha web (3+), API (3+) | `julgamento.situacao` |
| `pauta.Sessão original` | Pauta / Pauta e julgamento | texto | calculado | `sessao_original` | `pauta` | HERO (3+), Ficha web (3+), API (1) | — |
| `pauta.Item (Pauta de Julgamento)` | Pauta / Pauta e julgamento | texto | calculado | `item_pauta_julgamento` | `pauta` | HERO (3+), Ficha web (1) | — |
| `pauta.Nova sessão de destino` | Pauta / Pauta e julgamento | texto | calculado | `nova_sessao_destino` | `pauta` | HERO (3+), Ficha web (3+), API (3+) | — |
| `pauta.JULGAMENTO` | Pauta / Pauta e julgamento | texto | calculado | `julgamento` | `pauta` | Ficha web (1) | — |
| `pauta.Motivo da remarcação` | Pauta / Pauta e julgamento | texto | editável | `motivo_remarcacao` | `pauta` | HERO (3+), Ficha web (1) | — |
| `pauta.Sustentação oral` | Pauta / Pauta e julgamento | lista | editável | `sustentacao_oral` | `pauta` | HERO (3+), API (2) | — |
| `pauta.Pauta - Publicação` | Pauta / Pauta e julgamento | texto | consulta | `pauta_publicacao` | `pauta` | HERO (1) | — |
| `pauta.Pauta - Inclusão` | Pauta / Pauta e julgamento | texto | consulta | `pauta_inclusao` | `pauta` | HERO (1) | — |
| `pauta.Pauta - Proclamação` | Pauta / Pauta e julgamento | texto | consulta | `pauta_proclamacao` | `pauta` | HERO (1) | — |
| `pauta.Pauta - Último movimento` | Pauta / Pauta e julgamento | texto | consulta | `pauta_ultimo_movimento` | `pauta` | HERO (1) | — |
| `pauta.Pauta - MPU` | Pauta / Pauta e julgamento | texto | consulta | `pauta_mpu` | `pauta` | dinâmico / a conferir | — |
| `pauta.Pauta - Importado em` | Pauta / Pauta e julgamento | texto | consulta | `pauta_importado` | `pauta` | dinâmico / a conferir | — |
| `pauta.Ingresso e ocorrências da sessão` | Pauta / Pauta e julgamento | texto-longo | editável | — | `pauta` | HERO (3+), API (1) | — |
