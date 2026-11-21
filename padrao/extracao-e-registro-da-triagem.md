# Extração dos autos do PJe e registro da triagem

Procedimento usado para extrair o inteiro teor dos processos do PJe 2G (TRF-3), triar cada processo e registrar o resultado nos lotes, na ficha única e no Caput. Gabinete do Des. Fed. Carlos Muta, Turma Regional de MS.

Versão de 21/11/2026. As ferramentas citadas estão em `scripts/triagem/` (ver o README da pasta).

---

## 1. Visão geral do fluxo

| Etapa | O que acontece | Onde fica o resultado |
|---|---|---|
| 1. Fonte do acervo | O painel do PJe é exportado para a fonte do acervo, com tarefa, etiquetas, seção e partes. | `acervo/fonte.json` |
| 2. Lotes e coleções | Os processos da tarefa "Analisar tipo de decisão a proferir" são distribuídos em lotes por espécie e seção. | `acervo/lotes/<id>.json` e `acervo/lotes/colecoes.json` |
| 3. Extração dos autos | A ponte MX3 baixa e lê todos os documentos do processo no PJe e grava o inteiro teor. | `acervo/autos/<cnj>.json.gz` |
| 4. Leitura e triagem | Cada processo é lido nos autos e triado: admissibilidade, MPF, urgência, questões, proposta e pendências. | blocos `blkNN.py` (área de trabalho) |
| 5. Registro no lote | O bloco é convertido em itens de lote e em campos da ficha, e aplicado ao lote. | `acervo/lotes/<id>.json` (item) |
| 6. Situação atual | Última decisão, última peça, última informação e última movimentação, conferidas nos autos. | `situacao_atual` do item |
| 7. Ficha única | Os campos do prontuário de triagem vão para a ficha do processo. | `acervo/operacional.json` |
| 8. Caput | A triagem aparece em `/caput/triagem` (A triar, Triados, Seleção prévia), com painel do processo, prontuário e etiquetas sugeridas. | `caput/triagem/index.html` |
| 9. Publicação | Todo push em `caput/**` publica o Caput em gabinete-cmt.com. | workflow "Caput na Vercel" |

Lotes de triagem em uso:

| Lote | Conteúdo |
|---|---|
| `adp-ai` | Agravos de instrumento |
| `adp-remessas` | Remessas necessárias |
| `adp-ap-1s`, `adp-ap-2s`, `adp-ap-3s` | Apelações da 1ª Seção, da 2ª Seção, e da 3ª Seção ou sem seção |
| `adp-serie-*` | Séries entre lotes (mesmo tema em lotes diferentes) |

---

## 2. Regras que valem em todas as etapas

1. Os autos extraídos são a fonte primária. Nunca inventar ID, fato, data, valor ou precedente.
2. O que os autos não confirmam vai marcado como `[VALIDAR: …]`. Se o documento não está no texto extraído, isso não prova que ele não exista nos autos (pode ser PDF digitalizado sem texto).
3. Alegação de parte não é fato comprovado.
4. Precedente só com fonte verificável (banco de julgados do Relator, STF, STJ). A TNU é vedada.
5. A triagem não define `Destino` nem `Seleção Prévia` na ficha: essa decisão é do gabinete.
6. O item 5000588-83.2026.4.03.0001 tem a etiqueta "CMT REVISADO - NÃO MEXER": não se altera.
7. Não se executa `scripts/ficha/embutir.py`.
8. Claude não faz login no PJe. A sessão é aberta pelo próprio usuário.
9. Não se carrega código de terceiros nem código remoto na página do PJe. O código da ponte é colado na própria aba.
10. Não há OCR no servidor. Os documentos sem texto ficam listados como "sem texto".
11. Downloads de arquivos só com autorização expressa.

### Preparo (regra confirmada em 21/11/2026)

- **Pix ou cartão:** só vale com o comprovante da Secretaria do Tesouro Nacional (PagTesouro, "Pagamento realizado com sucesso", com a "Identificação do pagamento"). A base é a Resolução PRES 138/2017, artigo 2º, § 2º, III, na redação da Resolução PRES 790, de 04/07/2025.
  - Não bastam o comprovante bancário do Pix nem a tela "Aguardando realização do pagamento".
  - Nesses casos cabe intimação única (artigo 1.007, § 4º, do CPC). Sem o comprovante do Tesouro, segue a deserção.
- **GRU:** valem o comprovante de caixa eletrônico e o de pagamento pela internet.
  - A GRU Judicial foi extinta a partir de 03/04/2026.
  - O tratamento de GRU Judicial paga depois dessa data ainda está em aberto: marcar `[VALIDAR]`. Exemplo: 0004626-26, GRU Judicial paga em 22/05/2026, com o recibo da CAIXA intitulado "IPVA".

---

## 3. Extração dos autos (PJe → repositório)

### 3.1 As duas abas

O processo roda no Chrome do usuário, com a sessão do PJe já aberta por ele:

| Aba | Endereço | Título | Código |
|---|---|---|---|
| App (receptor) | `https://www.gabinete-cmt.com/api/painel?lote=1` | "NÃO FECHAR · extração" | `window.AP`, em `scripts/triagem/mx3_receptor_app_v4.js` |
| Ponte PJe | `https://pje2g.trf3.jus.br/pje/js/pdfjs/web/viewer.html#ponte` | "NÃO FECHAR · ponte PJe · N ok · N erros" | `window.MX3`, em `scripts/triagem/mx3_ponte_v3.js`, com os ajustes v4 do item 3.4 |

- A aba da ponte é aberta por um clique no botão da aba do app, porque o navegador bloqueia janelas abertas por script. Assim a ponte tem `window.opener` = aba do app.
- As duas abas conversam por `postMessage`, com a chave `k: 'mx3'`. A ponte só aceita mensagens de `window.opener`, e a origem `https://www.gabinete-cmt.com`.
- O visualizador pdf.js do próprio PJe é usado como página da ponte porque já traz `pdfjsLib` e está na origem do PJe, onde a sessão vale.

### 3.2 Receptor (aba do app): `AP`

1. `AP.montar()` monta a fila com os lotes `adp-ai`, `adp-remessas`, `adp-ap-3s`, `adp-ap-1s` e `adp-ap-2s`, nesta ordem:
   - primeiro, os agravos sem autos;
   - depois, os processos da lista a refazer (`MX2L`);
   - por último, as apelações e remessas sem autos.
2. Processos que já têm autos gravados (mapa `G`, CNJ → número de documentos) ficam fora da fila.
3. `SKIPX` exclui os processos gigantes, que serão extraídos à parte.
4. A cada pedido `prox` da ponte, o receptor devolve o próximo CNJ e o lote.
5. Ao receber `autos`, `AP.enviar` grava pelo endpoint `POST /api/painel?lote=1` com `{acao:'autos', …}`, tratado em `apoio/ex-officio/api/_lote.js`.
   - Faz até 6 tentativas em caso de 409 ou 5xx.
   - Nunca grava uma versão com menos documentos do que a já gravada (`n < G[cnj]` → pulado).
6. Cada gravação gera um commit "Autos (…): inteiro teor de 1 processo(s) do lote …".

### 3.3 Ponte (aba do PJe): `MX3`

`MX3.rodar()` repete o ciclo abaixo até a fila acabar ou `MX3.parar()`:

1. **Pesquisa.**
   - Abre, num iframe invisível, `/pje/Processo/ConsultaProcesso/listView.seam`.
   - Preenche os campos `fPP:numeroProcesso:*` com as partes do CNJ e pesquisa.
   - Intercepta o `window.open` que leva a `listAutosDigitais` para obter o endereço dos autos.
2. **Autos.**
   - Abre os autos digitais em outro iframe.
   - Lista os documentos: ID, tipo, descrição, juntado por, data, formato e páginas.
   - Lê a linha do tempo de movimentações.
3. **Download e leitura.**
   - Cada documento é baixado por `GET /pje/seam/resource/rest/pje-legacy/documento/download/TRF3/2g/<idProcesso>/<idDocumento>` (`credentials: 'include'`), com timeout de 90 s.
   - PDF: o texto é lido com `pdfjsLib.getDocument`, página a página.
   - HTML: o texto é lido do próprio documento.
   - Os tipos sem valor para a triagem (`Documento de Identificação`, `Intimação de Pauta`, `Ciência`) não são baixados.
4. **Envio.** A ponte devolve ao app `{tipo:'autos', lote, rec}` e espera a confirmação, por até 240 s.
5. **Falhas.** Depois de 5 falhas seguidas, a ponte pausa, porque a causa provável é a sessão do PJe expirada. O usuário entra de novo no PJe e retoma com `MX3.rodar()`.

### 3.4 Ajustes da versão 4 da ponte

Esta versão foi colada na aba e ainda não foi salva em arquivo.

- `MAXDOCS = 900`. Processo com mais documentos é pulado com o erro "muito grande".
  - Esse erro não conta para a pausa de 5 falhas.
- O iframe dos autos (`A`) é limpo a cada processo, para não acumular memória.

Processos gigantes deixados para extração à parte:

| Processo | Documentos |
|---|---|
| 0006799-28.2013.4.03.6000 | 1.406 |
| 0001231-18.2010.4.03.6006 | 2.629 |

### 3.5 Formato do arquivo de autos

O arquivo `acervo/autos/<cnj>.json.gz` traz:

| Chave | Conteúdo |
|---|---|
| `cnj` | número do processo |
| `extraido_em` | data e hora ISO |
| `lista` | `[id, tipo, descrição, juntado por, data, formato, …]` por documento |
| `docs` | `{id, tipo, descricao, juntado_por, juntado_em, formato, paginas, caracteres, anexo}` |
| `faltam` | IDs sem texto (digitalizados) ou que falharam |
| `texto` | inteiro teor em blocos |

O `texto` tem os blocos abaixo, com a movimentação mais recente primeiro:

```
===== MOVIMENTAÇÕES (linha do tempo do PJe, mais recente primeiro) =====
20/03/2026 18:00 · Redistribuído por sorteio …
===== ID 312868471 | Certidão | … =====
<texto do documento>
```

Observação: a página do PJe altera o `JSON.stringify`, e por isso `lista`, `docs` e `faltam` podem chegar como texto JSON. Quem lê decodifica de novo (ver `_json` em `scripts/autos/registrar.py`).

### 3.6 Depois da extração

`python3 scripts/autos/registrar.py [lote …]` registra nos itens do lote:

- a tabela de documentos (`autos`);
- as peças principais (`pecas`), só quando o item ainda não tem peças anotadas à mão.

### 3.7 Acompanhamento

- O título da aba da ponte mostra os contadores.
- `MX3.S.log` e `AP.S.log` guardam as últimas linhas de log; `AP.S.pulados` e `AP.S.erros` guardam os pulados e os erros.
- No repositório, cada processo gravado é um commit em `acervo/autos/`.
- **Não se reextrai** o que já tem autos, salvo pedido expresso.

---

## 4. Leitura e triagem (processo a processo)

### 4.1 Ferramentas de leitura (`scripts/triagem/`)

| Script | Uso |
|---|---|
| `ler.py <lote> <cnj-prefixo> [lim]` | Leitura condensada dos autos para a triagem. |
| `ler2.py <cnj10> […]` | Leitura compacta com o dispositivo de cada decisão. |
| `doc.py <cnj> <id> [ini] [fim]` | Texto limpo de um documento. |
| `ap.py <cnj10>` (LOTE no ambiente) | Apelações: tópicos das razões, pedido final, contrarrazões, certidões de prazo e movimentos de ciência ou decurso. |
| `rm.py <cnj10…>` | Remessas: pré-análise e precedentes semelhantes no banco de julgados do Relator (busca TF-IDF; o índice `prec.pkl` fica fora do repositório). |
| `visao.py <lote> <cnj…>` | Visão rápida dos pendentes. |

### 4.2 Roteiro de cada processo

1. **Espécie e decisão impugnada:** sentença ou decisão, ID, data, dispositivo, e se há remessa necessária.
2. **Tempestividade:** intimação ou publicação, protocolo, prazo legal em dias úteis, prazo em dobro e suspensões.
3. **Preparo:** pelas regras do item 2. Cabe também "Isento (ente público/MP)", "Justiça gratuita", "Assistência da DPU" ou "Não se aplica".
4. **Representação:** procuração e substabelecimento (ID), ou dispensa (procurador público ou DPU).
5. **MPF:** hipótese de intervenção (mandado de segurança, ACP, incapaz, indígenas, idoso em risco), parecer (ID e sentido) ou falta dele.
6. **Urgência:** medida pedida, data, se já foi apreciada e o resultado.
7. **Preliminares, mídias e prevenção.**
8. **Questões:** o que o recurso devolve, numerado.
9. **Proposta pelos precedentes:** linha da Turma e do Relator, tema repetitivo ou de repercussão geral.
10. **Hipótese de monocrática:** artigo 932 do CPC, com o paradigma. Se não houver, "Improvável sem paradigma".
11. **O que falta sanar:** cada ponto não confirmado vira um `[VALIDAR: …]`.

---

## 5. Registro no lote

### 5.1 Blocos de triagem

Cada leva de processos é escrita num bloco Python (`blkNN.py`, `blkRNN.py`, `blkANN.py`) com uma lista `B`. Cada registro é montado pelos atalhos de `tl2.py`:

| Atalho | Uso |
|---|---|
| `R(...)` | Agravo de instrumento |
| `RM(...)` | Remessa necessária (sem recurso voluntário, salvo `apelacao=True`) |
| `AP(...)` | Apelação, com ou sem remessa; `apelos = [(parte, id, data, tipo_parte_preparo, razoes_resumo)]` |

`tlib.mk(d)` converte o registro em duas coisas.

**Item do lote:**

- `resultado` = `Ato a proferir: … ‖ Proposta pelos precedentes: … [VALIDAR: …; …]`;
- `tipo_caso`, `assunto_detalhado` ("Matéria — questão"), `observacao`, `peculiaridades`, `especificidades`, `variacoes`, `pendencias`, `grupo`, `mpf`;
- `triagem`: `ato`, `materia`, `origem`, `decisao_agravada`, `recurso`, `preparo`, `monocratica`, `analisado_em`, `conf_preparo`, `conf_prevencao`;
- `teor`: síntese fática, inicial, decisão recorrida, recurso, resposta, parecer, memoriais, representação e preparo;
- `prontuario_triagem.cartao`: tipo de julgamento, subassuntos, síntese, questões, origem, admissibilidade, recursos, peças, pendências e papéis;
- `prontuario_triagem.ctl`: `tempest`, `preparo`, `repres`, `prelim`, `midias`, `mpf`, `parecer`, `urgTipo`, `urgSit` etc.

**Campos da ficha:**

- `triagem.Tempestividade`, `triagem.Preparo`, `triagem.Representação`, `triagem.Mídias`, `triagem.Prelim.`;
- `triagem.MPF - Custos Legis`, `triagem.MPF`;
- `triagem.Tema` (tipo de caso), `triagem.Síntese Fática`, `triagem.Especificidades`, `triagem.Tipo de Julgamento`, `triagem.Alegações`;
- `triagem.Urgência`, `triagem.Urgência - Apreciação`;
- `producao.Mono - Fundamento`, quando há fundamento de monocrática.

### 5.2 Montar e aplicar

```
python3 montar.py blkA02                 # → out/blkA02_lote.json e out/blkA02_ficha.json
python3 aplicar.py blkA02 adp-ap-3s      # mescla no acervo/lotes/adp-ap-3s.json
```

`aplicar.py` segue a regra da ação `itens` do Index:

- os campos de texto são substituídos (até 2.000 caracteres);
- os objetos (`triagem`, `situacao_atual`, `extracao`, `teor`, `prontuario_triagem`) são mesclados;
- as listas (`variacoes`, `pendencias`, `pecas`) são substituídas (até 80 itens).

Em seguida faz-se o commit e o push do lote. Alternativa pelo navegador: `js.py <blk> <lote>` gera um script que grava o lote (`acao:'itens'`) e a ficha (`/api/pauta?ficha=1`) pela aba do app.

### 5.3 Conferência antes do commit

Todo ID, data, vara e nome de advogado do bloco é conferido de novo nos autos.

Exemplo: no `blkA02`, a conferência corrigiu datas de protocolo, a vara (5002279-56: 6ª Vara confirmada) e nomes de advogados que não constavam dos autos.

---

## 6. Situação atual

```
python3 situacao.py <lote>            # só mostra
python3 situacao.py <lote> --aplicar  # grava situacao_atual no lote
```

O script calcula, pelos autos:

- a última decisão e um resumo do conteúdo;
  - para a sentença, detecta se há remessa necessária e reconhece as negativas: "não sujeita", "dispensado", "deixo de submeter";
- a última decisão relevante, sem redistribuições nem declarações de impedimento;
- a última peça das partes;
- a última informação;
- a última movimentação.

Grava `situacao_atual.resumo` = `► Situação em DD/MM/AAAA: …` e põe esse resumo no início das `especificidades`, substituindo o resumo anterior.

`MOVFIX` e `SITFIX` corrigem processo a processo quando a linha do tempo do PJe diverge dos autos.

---

## 7. Grupos e séries (para minutar em lote)

- **Grupos por lote.** Para as apelações:

  | Grupo | Conteúdo |
  |---|---|
  | AP1 | monocrática (artigo 932 do CPC) |
  | AP2 | voto, paradigma a conferir |
  | AP3 | não conhecimento, deserção ou prejuízo |
  | AP4 | conferir antes |
  | AP5 | já julgada, pendência pós-acórdão |

  Nos agravos, os grupos temáticos juntam a mesma tese, o mesmo resultado e o mesmo paradigma (`lotes_minuta.py`). Exemplos: "Lote · Alienação fiduciária", "Lote · Exceção de pré-executividade".
- **Séries entre lotes** (`adp-serie-*`): o mesmo tema espalhado por lotes diferentes. Exemplos: IRPJ/CSLL de serviços hospitalares, saúde, ITR, perdimento, professor substituto. Estão registradas em `colecoes.json` (`colecoes.triagem`, com `serie: true`).
- O grupo leva `resultado` e `modelo` comuns. Cada item guarda as variações e o que falta sanar.

---

## 8. Ficha única (prontuário de triagem)

A ficha (`acervo/operacional.json`, seções `origem`, `triagem`, `producao`, `pauta`, `controles`) recebe os campos do item 5.1 por um destes caminhos:

- **`FX.enviar(lista)`** (`scripts/triagem/fx.js`), colado na aba do app.
  - Monta os campos de cada item (`FX.mk`) e grava por `POST /api/pauta?ficha=1`.
  - Repete a tentativa em caso de 401, 409, 429 ou 5xx.
  - `envio.py` gera a mesma carga a partir dos blocos.
- **`ficha_tri.py [lotes]`**, direto no `operacional.json`, seguido de commit.
  - Preenche "O que falta sanar" (lista de `[VALIDAR]`), "Síntese Processual" (resumo da situação atual), "Hipóteses Monocrática", "Especificidades" e "Próxima ação" (a proposta).
  - Só preenche campo vazio ou texto gerado antes (iniciado por "► Situação").

O formato de gravação é `json.dumps(O, indent=1, ensure_ascii=False) + '\n'`, idêntico byte a byte ao do app.

No Caput, o prontuário de triagem lê a ficha atual ao abrir e grava só os campos que a pessoa alterou. Com isso, não sobrescreve o que outra aba gravou.

---

## 9. Caput · Triagem (onde a triagem aparece)

O Caput · Triagem fica em `https://www.gabinete-cmt.com/caput/triagem`.

### 9.1 Abas

| Aba | Conteúdo |
|---|---|
| A triar | Processos em triagem por tarefa do PJe: indicadores, símbolos do prontuário (T, P, R, M), destino e próxima ação, botões Prontuário e Ficha. |
| Triados | Coleções de triagem com a matriz completa. Abre filtrado em "Analisar tipo de decisão a proferir" e mostra só processos com triagem feita. |
| Seleção prévia | Coleções de seleção prévia. |

A "Busca geral no acervo em triagem" fica recolhida e só carrega o acervo ao ser aberta.

### 9.2 Componente `CaputColecoes`

As abas Triados e Seleção prévia usam o componente `CaputColecoes` (shadow DOM), alimentado pelos lotes vivos de `/api/painel?lote=1&id=<id>`.

- **À esquerda:** abas, métricas, busca, filtros e a lista de coleções e séries.
- **À direita:** a matriz, com as colunas Prontuário da triagem, Indicadores e Variações.
- **Painel do processo** (clique na linha):
  - etiquetas sugeridas para o PJe;
  - prontuário da triagem, lido da ficha;
  - caso: síntese, questões, sentença, recurso, resposta e origem;
  - proposta: grupo, proposta para o processo, hipótese de monocrática, o que falta sanar e próxima ação;
  - situação atual, peças e minuta;
  - registro completo do lote.

### 9.3 Etiquetas sugeridas para o PJe

As etiquetas sugeridas seguem o vocabulário que o gabinete já usa no PJe:

| Etiqueta | Quando é sugerida |
|---|---|
| `1ª Seção` / `2ª Seção` | Seção do lote, ou seção competente sem a etiqueta de seção. |
| `APTO` / `APTO - CONFERIR` | Proposta de voto sem pendência de admissibilidade, MPF ou urgência, e sem despacho na próxima ação. "CONFERIR" quando há `[VALIDAR]`. |
| `MONOCRÁTICA TERMINATIVA` | Proposta de monocrática (artigo 932, não conhecimento, prejuízo), ou hipótese de monocrática possível na ficha. |
| `ver. preparo` | Preparo sem comprovante do Tesouro, não recolhido, a menor ou posterior à interposição. |
| `tempestividade` | Tempestividade não verificada, com ponto a conferir. |
| `representação` | Representação irregular ou procuração a conferir. |
| `aguardando parecer` | Hipótese de intervenção do MPF sem parecer. |
| `LIMINAR PENDENTE` | Urgência não apreciada. |
| `apenas remessa` | Remessa necessária sem apelação. |
| `Dupla Apelação` | Duas apelações. |
| `LOTE <TEMA> - AI` / `- APCIV` / `- REMNEC` | Grupo temático do lote ou série entre lotes. |
| `Tema N STF` / `Tema N STJ` | Paradigma citado na proposta. |
| Tipo de caso específico | "Matéria - questão", tirado do assunto detalhado ou, na falta, do tipo de caso da ficha. Serve para etiquetar os similares; o painel mostra quantos processos das coleções têm o mesmo tipo de caso (×N). |

- As etiquetas que o processo já tem no PJe, pela fonte do acervo, aparecem riscadas.
- "Copiar" copia só as etiquetas que faltam.
- Na matriz, o selo 🏷 N indica quantas etiquetas faltam. Na aba A triar, o mesmo selo vem calculado pela ficha.
- No prontuário de triagem, o campo "Etiquetas sugeridas para o PJe" (`triagem.Etiquetas sugeridas`) guarda as etiquetas escolhidas: clique nas sugestões para incluir, depois Copiar.
- O campo `triagem.Etiquetas` ("Etiquetas do gabinete") não é tocado.

---

## 10. Publicação

- Todo push em `main` que altere `caput/**` dispara o workflow "Caput na Vercel" (`.github/workflows/vercel-caput.yml`).
- O workflow localiza a equipe (plano Pro) e o projeto pelo domínio gabinete-cmt.com e publica a pasta `site` em produção.
- O segredo `VERCEL_TOKEN` é cadastrado pelo usuário no GitHub. Claude não manuseia tokens.
- Para conferir a publicação:
  - rodar `gh run list -R trf3bdutra/procs-muta -L 3`;
  - recarregar `/caput/triagem`.

Os lotes e a ficha (`acervo/**`) não dependem de publicação: o app lê o repositório pela API.

---

## 11. Pendências conhecidas (21/11/2026)

- Tratamento da GRU Judicial paga depois de 03/04/2026.
- Os dois processos gigantes do item 3.4.
- As apelações da 1ª e da 2ª Seção (`adp-ap-1s` e `adp-ap-2s`) estão sendo triadas à medida que os autos chegam.
- A fonte do acervo é de 16/11/2026: tarefas e etiquetas podem estar defasadas até a próxima exportação do painel do PJe.
- A versão 4 da ponte (item 3.4) ainda precisa ser salva em arquivo.
