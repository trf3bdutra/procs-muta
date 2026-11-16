# Ficha do processo · mapa de integrações

Cada campo da Ficha, a aba onde aparece, onde fica na base `trf3bdutra/procs-muta` e quantos processos já têm valor.
Gerado em 15/11/2026 a partir da Ficha (v198 reorganizada) e do ramo `separar-fonte-operacional`.

## Arquitetura

| Camada | Arquivo | O que guarda | Quem grava |
|---|---|---|---|
| Fonte | `acervo/fonte.json` · `.csv` | só dados de origem: planilhas do PJe e do Power BI e DataJud (5820 processos) | coleta DataJud e importação das planilhas |
| Operacional | `acervo/operacional.json` | trabalho do gabinete, 1 registro por processo ativo (4725), em 4 seções com todos os campos da Ficha | Ficha / app (hoje: `scripts/painel/separar_fonte.py`) |
| Sessões | `acervo/sessoes/AAAA-MM-DD.json` + `calendario.json` | pauta de cada sessão: item, servidor, corretor, datas de minuta, correção e liberação, resultado | Controle de Pauta |

Chave de ligação: número CNJ (`processo`). Baixados e arquivados em definitivo ficam fora do operacional, salvo se tiverem histórico (marcados `baixado`).

| Aba da Ficha | Seção do operacional |
|---|---|
| Resumo | todas (leitura) |
| Processo | fonte + `origem` |
| Triagem | `triagem` |
| Produção | `producao` |
| Pauta | `pauta` (+ `pauta.sessoes`) |
| Controles especiais | `controles` (+ urgência em `triagem` e destino em `producao`) |

**Controles especiais** (grupos oficiais da ficha, gerados em `scripts/ficha/gerar_ficha.py`; mesmo modelo no CMT-monitor e na Ex Officio):

| Grupo | Quando vale para o processo | Onde ficam os campos |
|---|---|---|
| Urgência | `Urgência` (medida) preenchido; sugestão pelas etiquetas do PJe | `triagem` · `Urgência`, `Urgência - Nível`, `Urgência - Data` (pedido), `Urgência - Apreciação`, `Urgência - Apreciada em`, `Urgência - Observação`, `Urgência - Painel` |
| Monocrática | `producao.Destino` = `Monocrática` | `producao` (designação, minuta, revisão, ato e decisão) e `controles` · `Monocrática - Registrada em`, `Monocrática - Observação` |
| Meta | etiqueta de meta do PJe ou `triagem.META`, fora dos sobrestados | `triagem.META` e `controles` · `Meta - *` |
| Sobrestamento | tarefa de sobrestamento ou suspensão no PJe | `controles` · `Sobrestamento - *` |
| Caso sensível | assunto ou etiqueta de saúde, ou `Sensível - Incluído` = Sim | `controles` · `Sensível - *` |

**Diálogo da ficha** (o mesmo no CMT-monitor e na Ex Officio): `padrao/ficha-dialogo.js` + `padrao/ficha-dialogo.css`, no visual v198, desenhado a partir de `padrao/ficha.json`. `scripts/ficha/embutir.py` copia o módulo para `cmt-monitor.html` (com o adaptador `padrao/ficha-adaptador-monitor.js`, que grava direto na base pelo token) e para `apoio/ex-officio/index.html` (grava por `/api/pauta?ficha=1`). Na Ex Officio, a gaveta lateral passou a ser o prontuário de produção (preenchimento rápido); a ficha é o diálogo.

**Inteiro teor (.txt do PJe)** na ficha: `padrao/inteiro-teor.js` (leitura, pré-seleção e sugestões do módulo v40 do app Gabinete CMT, sem mudança de regra). O painel tem três etapas (arquivo, documentos, conferência) e grava no operacional só os campos confirmados que existem no modelo; dados do acervo (PJe), recursos e outras peças aparecem na conferência, mas não são gravados. O .txt é lido só no navegador.

**Calendário forense do gabinete** (`padrao/calendario-forense.js`, o do Controle de Pauta): feriados nacionais e da Justiça Federal (Lei 5.010/66), de MS, Carnaval, Semana Santa, Corpus Christi, recesso de 20/12 a 20/01 na contagem de prazos (CPC, art. 220), datas do calendário do gabinete marcadas “não conta para prazo” e suspensões do processo. O expediente fica em `acervo/sessoes/calendario.json` (`expediente`: `diasSemana`, `semExpediente`, `nomes`, `tipos`, `semPrazo`, `recesso`), editado no CMT-monitor (Sessões › Calendário do gabinete · expediente e prazos, com sugestão de feriados por ano). A ficha mostra a tempestividade calculada na Triagem; o inteiro teor, o prontuário de triagem do monitor e a prévia de prazo da Ex Officio usam a mesma contagem.

**Campos da ficha 1.2.0**: sentença (data, reexame, tutela), origem (juízo, julgador, valor da causa), tabelas de recursos, contrarrazões, outras peças e procurações, data e conclusão livre do parecer do MPF, espécie (ED, agravo interno, juízo de retratação) com a decisão impugnada e os grupos próprios de cada espécie. `Tempest - Dobro` passa a 1 (simples) ou 2 (em dobro), como no CMT-monitor.

Não há arquivos paralelos: a página Monocráticas, as urgências e a aba Controles especiais da Ex Officio leem e gravam esses campos no `acervo/operacional.json`.

Valores padrão do Painel Central ("Não Verificado", "Não se Aplica", "PENDENTE", "VERIFICAR REPRESENTAÇÃO") não são gravados: campo vazio = ainda não verificado.

## Campos por aba


### Triagem

**Urgência**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Liminar / urgência | `Urgência` | lista | operacional · `triagem` | 0 de 4.725 | Pedido de liminar / Tutela de urgência / Efeito suspensivo / Prioridade legal / Outra urgência; pílula vermelha nas Regras |
| Observação da urgência | `Urgência - Observação` | texto | operacional · `triagem` | 0 de 4.725 |  |

**Admissibilidade e regularidade**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Tempestividade | `Tempestividade` | lista | operacional · `triagem` | 0 de 4.725 | Não Verificado / Tempestivo / Intempestivo |
| Preparo | `Preparo` | lista | operacional · `triagem` | 179 de 4.725 | Não Verificado / Comprovado / Não Recolhido / Dispensado / Não se Aplica; AJG/DPU → Dispensado |
| DPU | `DPU (controle)` | texto | operacional · `triagem` | 129 de 4.725 |  |
| Representação | `Representação` | lista | operacional · `triagem` | 0 de 4.725 | Não Verificado / Regular / Negativo |
| ID da procuração | `ID da Procuração` | texto | operacional · `triagem` | 0 de 4.725 |  |
| Observação do impedimento | `Observação do Impedimento` | texto | operacional · `triagem` | 48 de 4.725 |  |
| Regularidade | `Regularidade` | regra · calculado | operacional · `triagem` | 0 de 4.725 | calculada pelo app a partir de tempestividade, preparo e representação |
| Regularidade · observação | `Regularidade Manual` | texto longo | operacional · `triagem` | 0 de 4.725 |  |
| Observação da representação | `Observação da Representação` | texto longo | operacional · `triagem` | 0 de 4.725 |  |

**Ministério Público**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Parecer | `MPF` | lista | operacional · `triagem` | 0 de 4.725 | Não se Aplica / Com Parecer / Sem Parecer |
| Custos legis | `MPF - Custos Legis` | lista | operacional · `triagem` | 0 de 4.725 | Sim / Não |
| ID do parecer | `ID do Parecer MPF` | texto | operacional · `triagem` | 0 de 4.725 |  |
| Sentido do parecer | `Parecer - Sentido` | lista | operacional · `triagem` | 0 de 4.725 | Prosseguimento do feito / Provimento do recurso / Não provimento do recurso / Outro |
| Fundamentos do parecer | `MPF - Info adicional` | texto longo | operacional · `triagem` | 0 de 4.725 |  |
| Observação do parecer | `Observação MPF` | texto longo | operacional · `triagem` | 0 de 4.725 |  |

**Matéria e gestão**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Subassunto | `Tema` | texto longo | operacional · `triagem` | 0 de 4.725 |  |
| Complexidade | `COMPLEXIDADE` | regra · calculado | operacional · `triagem` | 1 de 4.725 | lê COMPLEXIDADE ou Dificuldade; 1/2/3 → Ω/Α/Σ |
| Tipo de voto | `Tipo de Voto` | texto | operacional · `triagem` | 0 de 4.725 |  |
| Preliminares | `Prelim.` | Sim/— | operacional · `triagem` | 0 de 4.725 |  |
| Descrição da preliminar | `Descrição da Preliminar` | texto longo | operacional · `triagem` | 0 de 4.725 |  |
| Meta | `META` | texto | operacional · `triagem` | 308 de 4.725 |  |
| Seleção prévia | `Seleção Prévia` | texto | operacional · `triagem` | 175 de 4.725 |  |
| Mídias | `Mídias` | lista | operacional · `triagem` | 0 de 4.725 | Não se Aplica / Juntada / Faltante |
| Etiquetas do gabinete | `Etiquetas` | texto | operacional · `triagem` | 0 de 4.725 |  |
| Alegações | `Alegações` | texto longo | operacional · `triagem` | 0 de 4.725 |  |
| O que falta sanar | `O que falta sanar` | texto longo | operacional · `triagem` | 0 de 4.725 |  |
| Intercorrências | `Intercorrências` | texto longo | operacional · `triagem` | 0 de 4.725 |  |

### Produção

**Elaboração e revisão**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Servidor | `SERVIDOR` | texto | operacional · `producao` | 433 de 4.725 | também de sessoes/*.json |
| Minutado em | `MINUTADO` | data | operacional · `producao` | 18 de 4.725 | também de sessoes/*.json (dataMinuta) |
| Minuta refinada | `Refinado` | Sim/— | operacional · `producao` | 0 de 4.725 |  |
| Corretor | `CORRETOR` | texto | operacional · `producao` | 427 de 4.725 | também de sessoes/*.json |
| Corrigido | `CORRIGIDO` | Sim/— | operacional · `producao` | 0 de 4.725 | Sim quando a sessão traz dataCorrecao |
| Liberado | `LIBERADO` | Sim/— | operacional · `producao` | 0 de 4.725 | Sim quando a sessão traz dataLiberacao |
| Atenção na revisão | `Rev - Atenção` | Sim/— | operacional · `producao` | 0 de 4.725 |  |
| Tópico-síntese | `Tópico-síntese` | texto | operacional · `producao` | 0 de 4.725 |  |
| Ementa | `Rev - Ementa` | Sim/— | operacional · `producao` | 0 de 4.725 |  |
| Subementa | `Rev - Subementa` | Sim/— | operacional · `producao` | 0 de 4.725 |  |
| Mérito | `Rev - Mérito` | Sim/— | operacional · `producao` | 0 de 4.725 |  |
| Honorários | `Rev - Honorários` | Sim/— | operacional · `producao` | 0 de 4.725 |  |
| Nota de atenção | `Rev - Nota de atenção` | texto longo | operacional · `producao` | 0 de 4.725 |  |

**Monocrática**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Assinado | `Assinado` | Sim/— | operacional · `producao` | 0 de 4.725 |  |
| Assinado em | `Data da Assinatura` | data | operacional · `producao` | 0 de 4.725 |  |
| ID da decisão | `Decisão - ID` | texto | operacional · `producao` | 0 de 4.725 |  |
| Publicada | `Publicado` | Sim/— | operacional · `producao` | 0 de 4.725 |  |

**Relatório e voto**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Relatório padronizado | `Relatório Padronizado` | Sim/— | operacional · `producao` | 0 de 4.725 |  |
| Adequação da ementa | `Adequação Ementa` | Sim/— | operacional · `producao` | 0 de 4.725 |  |
| Formatação da subementa | `Formatação Subementa` | Sim/— | operacional · `producao` | 0 de 4.725 |  |
| Resultado do voto | `Voto - Resultado` | texto | operacional · `producao` | 0 de 4.725 |  |
| Honorários no voto | `Voto - Honorários` | texto | operacional · `producao` | 0 de 4.725 |  |
| Mídias necessárias | `Mídias Necessárias` | texto | operacional · `producao` | 0 de 4.725 |  |
| Descrição do voto | `Voto - Descrição` | texto longo | operacional · `producao` | 0 de 4.725 |  |

### Pauta

**Pauta e julgamento**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Status de julgamento | `Status de Julgamento` | lista | operacional · `pauta` | 0 de 4.725 | PAUTADO / EM MESA / ADIADO / RETIRADO DE PAUTA; status da entrada de pauta (_pautaEntries) ou campo |
| Sessão original | `Sessão original` | regra · calculado | operacional · `pauta` | 1.008 de 4.725 | data dd/mm/aaaa |
| Item | `Item (Pauta de Julgamento)` | regra · calculado | operacional · `pauta` | 0 de 4.725 | item da entrada de pauta da sessão selecionada |
| Sessão de destino | `Nova sessão de destino` | regra · calculado | operacional · `pauta` | 175 de 4.725 | antes "Sessão Destino" |
| Situação na seleção | `JULGAMENTO` | regra · calculado | operacional · `pauta` | 175 de 4.725 | situação da seleção prévia |
| Motivo da remarcação | `Motivo da remarcação` | texto | operacional · `pauta` | 0 de 4.725 |  |
| Publicação da pauta | `Pauta - Publicação` | importado · só leitura | operacional · `pauta` | — | dt_publicacao da Relação de Processos da sessão (PJe 2G, relatório 151) |
| Inclusão na pauta | `Pauta - Inclusão` | importado · só leitura | operacional · `pauta` | — | tp_insercao do relatório 151, como vem do PJe (N ou M) [VALIDAR significado] |
| Proclamação do julgamento | `Pauta - Proclamação` | importado · só leitura | operacional · `pauta` | — | proclamacao_decisao do relatório 151, depois da sessão |
| Último movimento | `Pauta - Último movimento` | importado · só leitura | operacional · `pauta` | — | ds_ultimo_movimento do relatório 151 (ex.: intimação de pauta publicada) |
| MPU | `Pauta - MPU` | importado · só leitura | operacional · `pauta` | — | mpu do relatório 151, SIM ou NÃO [VALIDAR significado] |
| Relação do PJe importada em | `Pauta - Importado em` | importado · só leitura | operacional · `pauta` | — | data e hora da importação do relatório 151 |

### Processo

**Sentença**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Decisão | `Sentença - Decisão` | lista | operacional · `origem` | 0 de 4.725 | Procedente / Parcialmente procedente / Improcedente / Extinção sem resolução do mérito / Homologatória / Outra |
| ID da sentença | `Sentença - ID` | texto | operacional · `origem` | 0 de 4.725 |  |
| Honorários | `Sentença - Honorários` | texto | operacional · `origem` | 0 de 4.725 |  |
| Custas / gratuidade | `Sentença - Custas` | texto | operacional · `origem` | 0 de 4.725 |  |
| Resultado | `Sentença - Resultado` | texto | operacional · `origem` | 0 de 4.725 |  |
| Fundamento | `Sentença - Fundamento` | texto longo | operacional · `origem` | 0 de 4.725 |  |
| Providências | `Sentença - Providências` | texto longo | operacional · `origem` | 0 de 4.725 |  |

**Recursos e contrarrazões**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Contrarrazões | `Contrarrazões - Situação` | regra · calculado | operacional · `origem` | 208 de 4.725 | apresentadas/nao/omitir → rótulo |

**Registro no acervo**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Baixado / arquivado | `baixado` | regra · calculado | operacional · `origem` | 137 de 4.725 | tarefa do PJe de baixa definitiva/arquivo |
| Fora do acervo atual | `fora_do_fonte` | regra · calculado | operacional · `origem` | 3 de 4.725 | tem histórico, mas saiu do fonte |
| Atualizado em | `atualizado_em` | regra · calculado | operacional · `origem` | 1.497 de 4.725 |  |

**Acompanhamento**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Responsável pelo acompanhamento | `Responsável` | texto | operacional · `origem` | 0 de 4.725 |  |
| Próxima ação | `Próxima ação` | texto | operacional · `origem` | 0 de 4.725 |  |
| Observações gerais | `Observações` | texto longo | operacional · `origem` | 0 de 4.725 |  |

**Autuação**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Classe | `classe_judicial` | importado · só leitura | fonte · `classe_judicial ou Classe ou DataJud · Classe` | 2.788 de 2.788 |  |
| Assunto CNJ | `Assunto` | importado · só leitura | fonte · `Assunto` | 2.788 de 2.788 |  |
| Seção competente | `Seção` | regra · calculado | fonte · `Seção Competente` | 2.553 de 2.788 | regra secaoCompetente do app, senão Seção Competente |
| Distribuição | `data_distribuição` | importado · só leitura | fonte · `data_distribuição` | 2.788 de 2.788 |  |
| Relator | `Relator` | importado · só leitura | — (sem coluna na base) | — |  |
| Etiquetas do PJe | `_etq` | importado · só leitura | fonte · `Etiquetas Originais` | 2.658 de 2.788 |  |
| Valor da causa | `valor_causa` | importado · só leitura | fonte · `valor_causa` | 2.762 de 2.788 |  |
| Distribuição no 1º grau | `dt_distribuicao_1g` | data · importado · só leitura | fonte · `dt_distribuicao_1g` | 2.016 de 2.788 |  |
| Prioridade | `prioridade` | importado · só leitura | fonte · `prioridade` | 2.788 de 2.788 | do PJe |
| Sigiloso | `Sigiloso` | importado · só leitura | fonte · `Sigiloso` | — | do PJe |
| Órgão julgador | `Órgão Julgador` | importado · só leitura | fonte · `Órgão Julgador` | — | do PJe |

**Partes**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Polo ativo | `Polo Ativo` | importado · só leitura | fonte · `polo_ativo` | 2.788 de 2.788 |  |
| Polo passivo | `Polo Passivo` | importado · só leitura | fonte · `polo_passivo` | 2.788 de 2.788 |  |
| Advogado do polo ativo | `advogado_pa` | importado · só leitura | fonte · `advogado_pa` | 1.973 de 2.788 |  |
| Advogado do polo passivo | `advogado_pp` | importado · só leitura | fonte · `advogado_pp` | 1.157 de 2.788 |  |
| DPU | `dpu` | importado · só leitura | fonte · `dpu` | 70 de 2.788 |  |
| MPF | `mpf` | importado · só leitura | fonte · `mpf` | 3 de 2.788 |  |
| Partes (texto da pauta) | `Partes` | importado · só leitura | — (sem coluna na base) | — |  |

**Tramitação**

| Campo | Chave | Tipo | Onde fica | Com valor | Opções / regra |
|---|---|---|---|---|---|
| Tarefa atual | `tarefa_atual` | importado · só leitura | fonte · `tarefa_atual` | 2.788 de 2.788 | paradeiro no PJe |
| Na tarefa desde | `data_entrada_tarefa` | data · importado · só leitura | fonte · `data_entrada_tarefa` | 2.788 de 2.788 | data de chegada na tarefa |
| Paradeiro conferido em | `paradeiro_em` | data · importado · só leitura | fonte · `paradeiro_em` | 2.788 de 2.788 | data da carga que confirmou a tarefa |
| Tarefa anterior | `tarefa_anterior` | importado · só leitura | fonte · `tarefa_anterior` | 0 de 2.788 | quando saiu de uma tarefa sem entrar em outra conhecida |
| Saiu da tarefa em | `saiu_da_tarefa_em` | data · importado · só leitura | fonte · `saiu_da_tarefa_em` | 0 de 2.788 |  |
| Última movimentação | `ultimo_movimento` | importado · só leitura | fonte · `ultimo_movimento` | — | do PJe |
| Data da última movimentação | `Data Último Movimento` | data · importado · só leitura | fonte · `Data Último Movimento` | — | do PJe |
| DataJud · último movimento | `DataJud · Último movimento` | importado · só leitura | fonte · `DataJud · Último movimento` | 0 de 2.788 |  |
| DataJud · data do movimento | `DataJud · Data movimento` | data · importado · só leitura | fonte · `DataJud · Data movimento` | 0 de 2.788 |  |
| DataJud · situação | `DataJud · Situação` | importado · só leitura | fonte · `DataJud · Situação` | 0 de 2.788 |  |
| DataJud · última coleta | `DataJud · Última coleta` | data · importado · só leitura | fonte · `DataJud · Última coleta` | 0 de 2.788 |  |
| Situação na pauta | `Situação da Pauta` | importado · só leitura | — (sem coluna na base) | — |  |
| Sessão na planilha | `Sessão atual (Excel)` | importado · só leitura | — (sem coluna na base) | — |  |

### Fora das abas

- `Destino` (operacional · `producao`): "Sessão" ou "Monocrática", gravado pela triagem ao confirmar o destino (ou no seletor da última etapa do fluxo). Vazio = a definir na triagem; o fluxo mostrado é o da sessão até a confirmação. "Sessão" = Pautado, Minutado, Corrigido, Liberado, Sessão; "Monocrática" = Minutado, Corrigido, Assinado, Monocrática.
- Estado técnico do Painel, preservado:

`_pautaEntries` (entradas por sessão), `_pautaHistory`, `_recursos`, `_contras`, `_ementa`, `_autoMetaTags`, `_preparoAJG`, `_ajgFromDpu`, `_dpuAuto`, `_autoRestriction`, `_magistradoRestricao`, `_restricaoTipo`: vêm do Painel Central e ficam nas seções do operacional, sem exibição direta.

## CMT-monitor · Acervo Central (busca avançada)

- Modos de resultado: **Planilha** e **Triagem**. Na Triagem, cada processo aparece como o seu **Prontuário** (card triável).
- Ao carregar, o motor lê `acervo/fonte.json` e sobrepõe `acervo/operacional.json` (`CMTOperacional.paraLinha`), convertendo os nomes da Ficha para os do app: `Nova sessão de destino` → `Sessão Destino`, `COMPLEXIDADE` → `Dificuldade`, `Preparo: Dispensado` com AJG/DPU → `AJG`, impedimento em tipo + nome → `Impedimento — Nome`.
- **⇪ Gravar triagem** grava no `operacional.json`, num commit, só os processos alterados (`CMTOperacional.gravar`), com a conversão inversa e sem gravar valores padrão.
- O Prontuário (redesenho B) tem cabeçalho cinza com seleção prévia (sessão + Enviar) e ações em ícones; alertas; e cinco grupos:
  1. Admissibilidade: calculadora de tempestividade (`Tempest - Publicação`, `Tempest - Protocolo`, `Tempest - Prazo legal`, `Tempest - Dobro`, `Tempest - Suspensões`; dias úteis sem fins de semana, recesso 20/12–20/01, feriados nacionais e da JF, suspensões; com o protocolo, grava `Tempestividade`), preparo com DPU/AJG, representação e ID, contrarrazões, mídias.
  2. Impedimento: tipo e magistrado.
  3. Urgência (`Urgência` = medida, `Urgência - Nível`, `Urgência - Apreciação`, `Urgência - Observação`, `Urgência - Data`, `Urgência - Painel`) e MPF (parecer, custos legis).
  4. Matéria: `Tipo de Julgamento` (automático pela classe), complexidade, metas (várias, separadas por `;` em `META`).
  5. Encaminhamento: `Destino`, `Hipóteses Monocrática` (contagens das monocráticas do relator em 2026), sugestão automática e `O que falta sanar`.
  - Etiquetas do PJe com S/E/O (Subassuntos = `Tema`, `Especificidades`, `Observações`) e `Síntese Processual`.
  - Produção (minuta, correção, equipe, próximo passo) fica só no Controle de Pauta.
- As sessões gravadas pela área Sessões vão para `pauta.sessoes` (formato em seções).

## Pendências de integração

| # | Ponto | Situação |
|---|---|---|
| 1 | META | 38 textos livres na base ("META 2 CNJ (até 2022)"…); falta a tabela de conversão para os códigos M2A, M2B, M4, M6, M7, M10, ★ |
| 2 | Impedimento | "Ney" (9) e "Ney Gustavo" (26) separados; confirmar se é o mesmo magistrado |
| 3 | Relator | não existe no fonte; a Ficha usa valor fixo |
| 4 | Sentença, MPF, revisão, voto | campos criados e vazios; dependem do inteiro teor (.txt) ou do preenchimento manual |
| 5 | Gravação | a Ficha edita em memória e exporta JSON; falta gravar direto no operacional do GitHub |
| 6 | Status de julgamento | sem valor gravado; a Ficha usa a entrada de pauta da sessão |
| 7 | Ramo | mudanças em `separar-fonte-operacional`, ainda fora do `main` |
