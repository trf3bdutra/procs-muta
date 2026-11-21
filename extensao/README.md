# HERO18810 · extensão do Gab. Muta, painel lateral ao lado do PJe

Nome desde a 0.19.3 (antes: Muta). Os identificadores internos (`window.Muta*`, chaves de armazenamento, `muta-pje.zip`, `atualizar-muta.cmd`) continuam os mesmos, para não perder dados nem atalhos.

Extensão do Chrome/Edge (Manifest V3) que abre o **Muta** num painel lateral, ao lado dos autos e das tarefas do PJe 2º grau do TRF-3.
Base: o HTML independente *muta-independente-prontuario-completo* (Prontuário + Acervo).

## O que muda na 0.29 · Minuta: estrutura, folha e janela grande; cartões no desenho do app

- Minuta-matriz: nenhuma matriz vem escolhida; sem escolha, o texto do editor é conferido só com a estrutura do gabinete
  (elementos obrigatórios do acórdão ou da monocrática e os avisos de estrutura, ementa e resultado do motor).
- Vistas "Recortes" e "Folha": a folha mostra o texto inteiro do editor com a formatação lida do PJe (títulos, negrito,
  itálico, recuo), com as diferenças à margem (amarelo mudou, verde só no editor, riscado falta).
- "Lado a lado em janela" e "Folha em janela": abre uma janela do tamanho da tela (`janela.html`), fonte × editor
  alinhados parágrafo a parágrafo. Conformidade: botão "Tela cheia", que acompanha as novas análises.
- Cartões do PJe no desenho do app: designação com avatar de iniciais (MINUTA / CORREÇÃO), trilha lápis → check →
  enviar em círculos tracejados que ficam verdes (data só no minutado) e sinalizações em ícones com contagem em círculo.

## O que muda na 0.28 · designação e trilha de produção nos cartões

- No cartão do processo (lista do PJe), quando designado: "Minuta: nome" e "Correção: nome" como etiquetas, e a trilha
  de produção em círculos — Min. (data) · Corr. (data) · Lib. (data); círculo cheio quando feito.

## O que muda na 0.27 · leitura da sentença medida no acervo, avisos e aba Autos

- Medido em 600 processos do acervo (`acervo/autos`): sentença localizada em 457; resultado 66% → 84%, honorários
  67% → 88%, custas 63% → 84%, fundamento 42% → 51%. Causas corrigidas: (1) a última decisão antes do recurso era a dos
  embargos de declaração — agora ela integra a sentença de mérito, de onde saem resultado, honorários e custas; (2)
  título colado ao dispositivo ("DISPOSITIVOIsto posto"); (3) fechos sem "Ante o exposto" ("Desta forma, julgo…").
- Conferência dos autos avisa quando a sentença não foi lida, é digitalizada (sem texto) ou a leitura não identificou
  resultado, decisão, honorários ou custas; e quando a decisão recorrida não está na cronologia lida.
- Aba Autos: "Documentos (cronologia do PJe)" com filtro "Principais" (decisões, recursos, contrarrazões, parecer,
  procuração, custas e inicial) e "Todos", sem repetir os botões de leitura; data igual em formatos diferentes não
  aparece mais como divergência.
- Diretrizes: todas as seções na faixa do topo, sem rolagem lateral.

## O que muda na 0.26 · sem emojis

- Selos, quadro de sinalizações, etiquetas redesenhadas, sino, relatório e notificações usam ícones SVG de traço
  (`MutaEtiquetas.ICONES`), não emojis. Nas categorias de etiqueta, "icone" é uma chave (raio, estrela, alerta,
  calendario, alvo, check, camadas, secao, pessoa, balanca, etiqueta). O "✓" que marca item resolvido na ficha continua.

## O que muda na 0.25 · inserir no editor do PJe

- Parágrafos-padrão: botão "Inserir" põe o parágrafo no editor do PJe, na posição do cursor (sem cursor no editor, no fim).
- Ementário: "Citar no editor" insere "Classe número, Rel. Des. Fed. NOME, DJEN data:" e a ementa entre aspas, em itálico
  e com recuo. A inserção é uma colagem (o editor converte para o formato dele); o texto também fica copiado.

## O que muda na 0.24 · quadro de sinalizações com registro

- O quadro dos ícones abre em 4 painéis lado a lado: Avisos | Intercorrências | Pendências | Notas (com a síntese e as
  questões da triagem). Em intercorrências e pendências, a caixa de marcar resolve (✓) ou reabre; cada painel tem campo
  para incluir. Grava na ficha do processo pelo serviço de fundo (lê a ficha atual e muda só a linha), com o login do painel.

## O que muda na 0.23 · sinalizações em ícones e lista recolhível

- Nos cartões da lista de tarefas e no cabeçalho dos autos digitais: ícones com contagem — ⚡ urgência, 🔔 avisos,
  ⛔ intercorrências, ⚑ pendências, 📝 notas. O clique abre um quadro com os detalhes (lidos da ficha).
- Botão "⇤ Ocultar a lista" (canto inferior esquerdo do PJe) recolhe a coluna da lista de processos para dar espaço
  ao editor e à tarefa; a escolha fica neste navegador.

## O que muda na 0.22 · etiquetas redesenhadas e só urgências notificadas

- **Redesenho das etiquetas do PJe** nos cartões da lista de tarefas, para toda a equipe: cada tipo (`categorias` em
  `padrao/etiquetas-gabinete.json`) com cor, estilo (sólido, suave, contorno) e ícone — Urgência, Prioridade legal,
  Conferência, Sessão, Meta, Fluxo, Lote e tema, Seção, Designação, Classe e espécie e Matéria. Vale a
  primeira expressão que combinar com o nome. O gestor edita tipos e cores no sino › Etiquetas; só muda a aparência.
- **Selos** logo abaixo do número do processo (o cartão do PJe tem altura limitada e escondia o que ia no fim).
  Diagnóstico no console da página: `[HERO18810] lista do PJe`.
- **Notificações**: alertas da lista (tempo na tarefa etc.) ficam só no sino. O Chrome avisa apenas chegadas novas com
  urgência ou liminar (só o gestor) e avisos do app. Chegada = número nunca visto cujo cartão mostra só datas recentes
  (até 2 dias); sem a "base" da 0.21.

## O que muda na 0.21 · notificações do app e chegadas do PJe

- **Avisos do app do gabinete** (`/api/notificacoes`) entram na extensão a cada 5 minutos (`chrome.alarms`). Os urgentes
  e importantes novos viram notificação do Chrome com 🏛 e ícone azul (`icones/app-128.png`); os da lista do PJe saem com
  ⚖ e ícone laranja (`icones/pje-128.png`). No sino do painel, abas separadas: **PJe** (alertas da lista) e **Gabinete**
  (avisos do app, com etiqueta App ou PJe e barra azul ou laranja). O número no ícone soma os dois; vermelho se houver
  alerta do PJe, azul se só houver aviso do app. Na primeira leitura, os avisos já existentes não disparam notificação.
- **Chegadas (só o gestor)**: o app não tem esse registro; ele nasce na extensão. A cada leitura da lista de tarefas do
  PJe, número nunca visto e novo no gabinete (sem ficha, ou entrou na tarefa há até 2 dias) vira chegada. A primeira lista
  vira a base, sem avisos. Urgência pelo texto do cartão (liminar, tutela, efeito suspensivo, medicamento, cirurgia,
  oncológico, réu preso, bloqueio de valores…) e pelo que a ficha já tiver; urgente avisa na hora (⚡📥, fica na tela até
  ser vista). Registro local (45 dias) e no site (`apoio/chegadas.json`, `GET|POST /api/pauta?chegadas=1`, 90 dias,
  só o gestor), que também põe as urgências e o relatório do dia na central de notificações do app.
- **Relatório do fim do dia** (padrão 18:00, ajustável no sino › Prazos): notificação com o total do dia que abre
  `relatorio.html` (com urgência primeiro, copiar e imprimir). Sino › Chegadas mostra as de hoje.
- Ao atualizar, aceite a permissão nova de alarmes.

## O que muda na 0.20 · Gerador

- **Prontuário › Gerador** (`gerador.js`): relatório, dispositivo do voto, ementa, acórdão e proclamação do julgamento
  no padrão do gabinete, pelo tipo de julgamento (Apelação, Remessa Necessária, Agravo de Instrumento, Embargos de
  Declaração, Agravo Interno, Juízo de Retratação) e pelo resultado escolhido (o da ficha vem marcado). Fórmulas do
  Padrão Muta 1 e 2 e do Padrão de ementa do gabinete, sem reescrever; dados da ficha e, onde ela está vazia, da
  leitura dos autos. O que não se confirma sai como `[VALIDAR: …]`, destacado, com a contagem em cada bloco.
  "Copiar" leva o texto com negrito e itálico para colar no PJe. Nada é gravado.
- Honorários da sentença no padrão "quem paga · quanto e sobre o quê · observações", com 😭 no rótulo (0.19.3).

## O que muda na 0.19 · prazos, alertas e etiquetas do gabinete

- **Selos na lista de tarefas do PJe** (`conteudo-pje.js`, `etiquetas.js`): em cada cartão de processo, a etapa
  (triagem, minuta, correção, liberação, assinatura), as iniciais de quem minuta e de quem corrige, ⚡ urgência não
  apreciada com os dias, ⛔ intercorrências, ⚑ pendências, ⏱ dias na tarefa, ★ meta, ⏸ sobrestado, ♥ caso sensível e
  🏷 as etiquetas do gabinete que faltam no PJe (o toque copia; nada é aplicado no PJe). Os dados vêm em lote de
  `GET /api/pauta?fichas=CNJ1,CNJ2,…` (até 150; exige o login do painel). Um número que o servidor não devolve só é
  pedido de novo depois de 2 minutos.
- **Catálogo de etiquetas do gabinete** (`padrao/etiquetas-gabinete.json`; `GET`/`POST /api/pauta?etiquetas=1`): nome,
  cor, descrição e condições sobre o resumo do processo (todas devem valer; operações `tem`, `vazio`, `igual`, `contem`,
  `re`, `maior`). Só o gestor grava. No painel: sino na faixa do topo → aba Etiquetas.
- **Prazos e alertas** (`fundo.js`, `alertas.js`): a cada leitura da lista, o serviço de fundo guarda os alertas,
  mostra no ícone da extensão quantos processos têm alerta vermelho e manda notificação do Chrome (no máximo 3 novas
  por vez; a mesma uma vez por dia por processo e tipo). Limites ajustáveis no sino → Prazos (urgência: 2 dias;
  tempo na tarefa: 30 dias, vermelho no dobro); selos e notificações podem ser desligados. Vale por navegador.
- **Roteiro → Etiquetas:** bloco "Regras do catálogo" com as etiquetas que as regras indicam para o processo, as que
  já estão no PJe e "+ sugerir" para incluir nas sugeridas; "Copiar" leva as que faltam.
- **Autos → conferência:** sugere a data da intimação da decisão recorrida (primeira ciência, intimação ou publicação
  na cronologia entre a decisão e o recurso) para "Intimação / publicação" da tempestividade, a conferir.
- Ao atualizar: recarregue a extensão e a aba do PJe e aceite a permissão nova de notificações.
- **0.19.2 · Peças › extrair da peça:** o ID e a data vêm da cronologia; decisão, resultado, honorários, custas,
  remessa, tutela, fundamento e providências só saem do texto. Cada grupo de Peças mostra "Extrair da peça (ID …)"
  (lê o texto no PJe e preenche os campos vazios), "Ler com OCR e preencher" quando a peça é digitalizada, ou
  "Preencher N campos pela leitura" quando o texto já foi lido. Nada que já esteja gravado é trocado; o que a leitura
  não achar fica indicado para preencher à mão.

## O que muda na 0.18

- **Textos justificados** (com hifenização em português) no texto do editor, no texto dos documentos dos autos, nas
  ementas e inteiros teores do Ementário, nos parágrafos-padrão e nas diretrizes.
- **Negrito, itálico e sublinhado onde houver:** o leitor do PJe (`conteudo-pje.js`, `leve()`) guarda, de cada parágrafo do
  editor e dos documentos HTML dos autos, uma versão só com `<b>`, `<i>` e `<u>` (pela marca ou pelo estilo calculado);
  o painel mostra essa versão. Recuo de citação e centralização do editor também. No Ementário, o cabeçalho em caixa alta
  da ementa sai em negrito, como no acórdão. PDF lido por pdf.js ou OCR continua sem formatação.
- Recarregue a aba do PJe depois de atualizar (o leitor mudou).
- **0.18.2:** etiquetas de classe e de tipo de julgamento no mesmo padrão (sugestão ainda não gravada, tracejada);
  corrige o erro que parava o painel quando havia tipo de julgamento gravado e sugestão diferente dos autos; sem espaço vazio
  depois das sub-abas do prontuário.

## O que muda na 0.17

- **Prontuário com três modos: Processo · Autos · Roteiro.** A aba Produção saiu (revisão, pauta e julgamento, revisão do
  acórdão ficam no Ex Officio); o **tipo de ato** virou uma pílula no cartão, à esquerda de quem minuta e de quem corrige.
- Sub-abas compactas (nome e número na mesma linha; a dica explica o número).
- **Peças** (sentença, origem, recursos e contrarrazões, outras peças) num cartão só, com uma seção por grupo.
- Partes no rodapé expansível da autuação.
- Avisos de gravação ("Não gravou…", "Alterações a gravar…") na faixa acima das abas.
- **0.17.1 · Ementário:** busca e filtros numa faixa colada às abas (ícones para buscar, limpar, abrir o Compêndio e
  recarregar); sem busca, a lista abre nos **precedentes relacionados ao processo** (filtro inicial, com "Todo o Ementário");
  resultados no visual dos relacionados, cada um com Expandir (ementa, resultado, inteiro teor, vincular, copiar, comparar),
  Compendium ↗ e Copiar ementa.
- **0.17.2:** tema claro em branco e cinza (sem bege); Parágrafos e Diretrizes com a busca numa faixa colada às abas e
  resultados em cartões; aviso de gravação como ícone na faixa do topo (mensagem na dica); **Peças** na aba Autos, em ordem
  fixa por seção, com resumo na seção fechada, campos curtos lado a lado e tabelas como listas compactas.

## O que muda na 0.16

- **Modos do Prontuário: Processo · Autos · Roteiro de triagem · Produção**, com a contagem embaixo de cada um (em
  aberto, peças lidas, passos conferidos, campos preenchidos), sublinhados como as abas da gaveta da pauta.
- **Cartão do processo:** tipo de julgamento ao lado da classe (o da ficha; a leitura dos autos sugere, ✓ grava);
  **assunto detalhado** logo abaixo do assunto (o do Caput; na falta, o da ficha, incluído pelo ícone — campo novo
  `triagem.Assunto detalhado`, que o Caput também mostra); controles do PJe (acompanhar, trocar de aba, prontuários,
  tema, ajuda) em ícones no canto do cartão; designação editável nas pílulas (só o gestor).
- **Processo:** sinalizações, notas, síntese e questões, situação atual, sentença e demais peças da ficha e **Controles num
  cartão só** (urgência, meta, sobrestamento, caso sensível: Sim/Não e, com Sim, a razão). Saiu o grupo Acompanhamento.
- **Autos (novo):** conferência automática e a lista de peças com ID, data, hora, categoria, movimentos e **detalhamento**;
  por peça, Ver texto, OCR, **JSON** e ↗ (PDF); **Baixar inteiro teor (JSON)** lê tudo e baixa no formato de
  `acervo/autos/<CNJ>.json.gz` (o mesmo do Caput e da Ex Officio). Nos autos digitais, o painel abre neste modo.
- **Roteiro de triagem** substitui o modo Triagem e reúne todos os campos: cada passo tem "Mais campos", os alertas dos
  autos vão para o passo a que se referem, etiquetas e o registro do lote entram no roteiro e o que sobrar fica em
  "Outros campos da triagem".
- **Produção:** tipo de ato · pronunciamento no topo (acórdão, decisão monocrática, urgência, despacho, admissibilidade,
  retratação, homologação, outro destino); saíram "Designação e minuta" (está no cartão) e "Lote e correção (Index)";
  a decisão da monocrática num cartão só, sem repetir campos.
- **0.16.1:** etapa **Triagem** antes de Minuta (marca `triagem.Destino - Confirmado em/por`); a faixa do usuário (nome,
  Atualizar, Ex Officio, Sair) fica no topo do painel, acima das abas.
- **0.16.2:** a faixa do usuário fica integrada ao cabeçalho, com botões quadrados (atualizar, Ex Officio, tema, sair);
  a tarefa do PJe e a situação atual ficam dentro do expansível "Autuação, partes e situação" do cartão.
- **0.16.3:** os botões do PJe (acompanhar, trocar de aba, prontuários, ajuda) ficam na faixa do topo, quadrados; o
  cabeçalho do processo vira uma faixa escura de ponta a ponta (cores da base do app); número, classe e tipo numa linha, sem
  repetir a classe por extenso; Controles em cartõezinhos compactos (meta sem razão).
- **0.16.4:** **Precedentes relacionados** no modo Processo (o mesmo critério da gaveta do Ex Officio: temas, assunto,
  assunto detalhado e questões; curados e série histórica; links para o Ementário do Compendium) — `precedentes.js`; a faixa
  do topo aparece também sem processo aberto e antes do login, com os botões do PJe.
- **0.16.5:** dicas ao passar o cursor em todos os campos (o que é e o que preencher) e botões (o que fazem) — `dicas.js`
  e `dicaCampo` em `gabinete.js`; precedentes relacionados no topo da aba Ementário; faixa do processo em bege mais fechado
  (noite no escuro), sem o título "Etapas"; assunto detalhado só com o ícone à direita do assunto; autuação, partes e
  situação num rodapé expansível da faixa (fechado, só a alça).
- Listas curtas e Sim/Não viram botões em todo o prontuário; cabeçalho das abas branco no tema claro.

## O que muda na 0.15

- **Cabeçalho no formato da gaveta "Para minuta" da pauta.** Fase (para minuta, correção, liberação; na monocrática,
  revisão, envio e assinatura) e dias na tarefa; número, classe e alertas; assunto e tipo; partes; autuação recolhida.
  **Etapas** em linha: tocar na próxima marca hoje, tocar na última feita desfaz (campos `producao.*` da ficha, os mesmos da
  pauta). **Designação** em pílulas (minuta e correção).
- **Sinalizações** em cartões no modo Processo: pendências e intercorrências da ficha (uma por linha), com caixa de
  resolvida, exclusão e "Nova sinalização" (Enter). Saíram da lista de campos da Triagem para não repetir.
- **Notas sobre o caso** em log (`origem.Observações`, "data hora · autor · texto"), com "+ Incluir nota" (Ctrl+Enter).
- **Decisão da monocrática** em botões (hipótese do artigo 932, resultado, tópico-síntese) e honorários; as datas das etapas e
  os campos da decisão não se repetem nos grupos de Produção.

## O que muda na 0.14

- **Tema escuro, padrão do painel**, nas cores do Ex Officio escuro (azul-noite, linhas finas, rótulos em mono versalete,
  destaque em ouro, abas sublinhadas como os filtros da pauta). O botão ◐ ao lado do "?" volta ao tema claro; a escolha fica
  neste navegador (`tema.js`, carregado no `<head>` para não piscar). As cores fixas do CSS viraram variáveis
  (`--field`, `--line`, `--soft`), comuns aos dois temas.

## O que muda na 0.13

- **Roteiro (novo modo do Prontuário: Processo · Triagem · Roteiro · Produção).** A triagem em passos, pelo tipo de
  julgamento (Padrão Muta 2: roteiro-mestre e por espécie), em linha do tempo por fase: recurso, admissibilidade, Ministério
  Público, preliminares e prejudiciais, mérito e encaminhamento. Cada passo mostra só os campos da ficha que lhe dizem
  respeito (os mesmos do modo Triagem), com estado ✓ conferido, ! alerta ou ○ a conferir, e a dica do padrão. Passos que
  dependem de condição só aparecem quando valem (embargos, agravo interno, retratação, mandado de segurança, AJG,
  procuração, descrição da preliminar, hipótese de monocrática). O tipo vem da espécie, da classe e da tarefa; os botões
  no topo trocam ou somam tipos. A leitura dos autos aparece em cada campo ("Autos: … · Usar"), e "Usar todas" grava de uma
  vez. Passo sem campo na ficha tem "Conferi", guardado só neste navegador. Código em `roteiro.js`.
- **Visual compacto (0.12.3).** Botões, campos e abas menores; mensagens explicativas longas viraram dica ao passar o mouse.
- **Aba 28,86% (0.12.2)** só aparece nos processos do 28,86%.

## O que muda na 0.12

- **OCR local.** Cada documento dos autos tem "Inteiro teor", "OCR" e "↗" (abre o PDF no PJe). "Inteiro teor" lê a camada
  de texto e manda ao OCR só as páginas digitalizadas; "OCR" passa todas as páginas pelo OCR (texto ruim ou ausente).
  O OCR é o Tesseract em português, dentro da própria extensão (`vendor/tesseract`, `ocr.js`): nada sai do computador.
  Lê até 30 páginas por documento; o texto por OCR vem marcado para conferir nomes, números e datas.

## O que muda na 0.11

Cinco abas, nesta ordem: **Prontuário, Minuta, Ementário, Parágrafos-padrão e Diretrizes**. A Ajuda fica no botão "?" ao lado
do processo. As abas não têm mais cabeçalho grande: logo abaixo delas vem o cartão do processo.

- **Prontuário único (Processo · Triagem · Produção).** Prontuário e Triagem viraram um só, sem duplicar campos e sem a
  chave "Ficha do gabinete / Prontuário completo". Pauta e monocrática só aparecem em Produção.
- **Cartão do processo.** Autuação e partes no topo: classe, assunto, órgão, distribuição, valor da causa, prioridades,
  polos e advogados, etiquetas.
- **Processo.** Assunto detalhado, síntese do processo e questões (itens; automáticas quando o texto permite, manuais
  sempre); controles (urgência, meta, sobrestamento, caso sensível); "Situação atual" no lugar da Tramitação.
- **Documentos dos autos.** Na página dos autos digitais, a lista de documentos com ID, data e hora da juntada e nome; cada
  um com campo de especificação (vai para "Outras peças e ocorrências"), "Ver texto" (extrai o inteiro teor, inclusive de
  PDF, por pdf.js) e "PDF" (abre o documento no PJe). Só leitura: nada é gravado no PJe. O antigo "Registro de autos
  extraídos do PJe" saiu; a lista é o único lugar.
- **Preencher pelos autos.** Sentença, origem, recursos e contrarrazões e outras peças saem do inteiro teor lido (motor
  `padrao-inteiro-teor.js`, o mesmo do site), como sugestões para confirmar.
- **Triagem automática (sugestões para conferir).** Tempestividade (calendário forense, prazo em dobro da Fazenda), preparo,
  procuração, órgão prolator (ED e agravo interno), MPF no 2º grau (inclusive parte idosa), contrarrazões com preliminar,
  remessa necessária, Pix, gratuidade e tipo de julgamento (ED pela tarefa; os demais pelas etiquetas, conferidos pelo
  último recurso).
- **Minuta (Lote + Comparar + Conformidade).** Tipo de pronunciamento (automático: "Aguardando a sessão" → acórdão); caixa
  minimizável com o texto do editor e botões para localizar o processo no Collectio e mandar o texto para lá; "Comparar
  com", por padrão a minuta-matriz do tipo de julgamento (confere a estrutura: blocos presentes, parecidos, ausentes e
  vagas preenchidas), além de Collectio, modelos, precedentes, texto colado, triagem, 28,86% e parágrafos-padrão;
  Conformidade num rodapé fixo e minimizável, com a nota e as contagens.
- **Parágrafos-padrão.** Busca por palavra e categoria; "Copiar" leva o texto com as vagas em [MAIÚSCULAS].
- **Diretrizes.** O Manual CMT por capítulos e a lista de caça, com busca.


## O que faz (0.10)

O painel lê o número CNJ do processo aberto no PJe e acompanha esse processo em todas as abas. Ele lê tanto os autos digitais
(número no título) quanto o painel de tarefas do PJe, que é carregado num quadro de `frontend-pje.app.trf3.jus.br`
(número no cabeçalho da tarefa, “ApCiv 5001289-76.2023.4.03.6006 - [Sessão] Aguardando a sessão”).
"Acompanhar o PJe" desligado congela o processo aberto; a lista no topo reabre qualquer prontuário salvo.

- **Lista de tarefas (0.10).** O processo escolhido na lista do PJe (clique no cartão ou na caixa de seleção) passa a ser o
  do painel, mesmo sem abrir a tarefa; cliques no editor e em campos de texto não contam.
- **Trocar de aba (0.10).** Com "Trocar de aba" ligado, a aba do painel segue a tela do PJe: autos digitais → Triagem (e
  lê o painel esquerdo dos autos); tarefa com o editor da minuta → Comparar (e lê a minuta; a Conformidade analisa a mesma
  leitura). Só troca quando o processo ou a tela mudam.
- **Peças dos autos digitais (0.10).** Na Triagem, "Ler o painel dos autos" lê a cronologia da página dos autos (ID, tipo,
  descrição, data e movimentos de cada documento), separa as peças relevantes (decisões, recursos, MPF, petições, provas),
  confere os IDs registrados na triagem e, em "Preencher o prontuário", completa só os campos vazios do prontuário: decisão
  de origem, recursos e contrarrazões, ID do parecer do MPF e "Outras peças". Código em `autos.js`.
- **Abas já abertas (0.10).** Ao instalar ou atualizar, a extensão põe o leitor nas abas do PJe já abertas (permissão
  `scripting`), sem precisar recarregar a página.

- **Triagem (0.9).** O prontuário de triagem do processo aberto no PJe, o mesmo do Caput · Triagem, lido da ficha única
  (`GET /api/pauta?ficha=<CNJ>`): admissibilidade, MPF e urgência, matéria e gestão, providências (editáveis; grava só o que
  mudou, por `POST /api/pauta?ficha=1`) e o registro da triagem do lote (grupo e modelo da matriz, proposta com o precedente,
  situação atual, caso, peças e teor dos autos com nota e trecho). Etiquetas sugeridas para o PJe, nas regras do Caput, com
  as que o processo já tem; um clique inclui no campo "Etiquetas sugeridas" e "Copiar" leva ao PJe. Botões para comparar o
  editor com a triagem e para transferir o texto do PJe ao Collectio. Código em `triagem.js`.
- **Prontuário completo, no GitHub.** O prontuário de cada processo fica em `acervo/prontuarios/<20 dígitos>.json` e se
  alimenta, nos dois sentidos, da ficha do processo (`acervo/operacional.json`) e do cartão da pauta (`acervo/sessoes/*.json`,
  o prontuário da Ex Officio e da LIA). Ao abrir o processo, o que a equipe registrou entra no prontuário (preenche o vazio;
  substitui o divergente se foi gravado depois do prontuário); cada alteração vai ao GitHub alguns segundos depois, num só
  commit com os campos correspondentes da ficha e do cartão (`POST /api/pauta?prontuario=1`, ver `apoio/ex-officio/api/_prontuario.js`).
  Duas pessoas editando ao mesmo tempo: as versões se juntam campo a campo (vale o que cada uma mudou). Sem login ou sem
  conexão, o prontuário segue neste navegador e sincroniza depois. Correspondências: `MAPA` (ficha) em `gabinete.js` e
  `CART` (cartão) em `sincronia.js`.
- **Ficha do gabinete.** A ficha única do processo da Ex Officio (`padrao/ficha.json` → `acervo/operacional.json`), com o login
  da equipe (cookie `cmt_eq`), gravada por `POST /api/pauta?ficha=1`.
- **Comparar.** O texto do editor da minuta no PJe (ou colado) contra: a triagem do processo (proposta, grupo e modelo da
  matriz e os precedentes citados, abertos pelo Ementário pelo número); a minuta do lote (Collectio); os modelos do banco
  (sugeridos pela semelhança); as minutas-matriz por recurso e resultado; a matriz modular e os acórdãos-modelo do 28,86%;
  os parágrafos-padrão; os precedentes do Ementário (vinculados ao prontuário ou pelo botão “Comparar com o editor”); ou
  texto colado. Parágrafos alinhados por LCS e pareados pela semelhança; palavra a palavra dentro do par. Trechos a preencher
  do modelo (`{{…}}`, `[PREENCHER]`) valem como vagas: o texto do editor que os ocupa aparece em amarelo. Motor em `comparador.js`.
- **Conformidade (ativável).** Confere a minuta do editor com o padrão do gabinete: estrutura das peças (Manual CMT),
  ementa CNJ 154/2024 adaptada (seções, numeração contínua, “saber se”, sem ID, rodapé), resultado coerente entre dispositivo,
  ementa, cabeçalho, acórdão e prontuário, verbo do resultado pela classe, honorários recursais (Tema 1.059/STJ), IDʼs da
  minuta contra as peças do prontuário e do cartão, pendências (`{{ }}`, `[VALIDAR]`), regras de redação do Compendium
  (`apoio/diretrizes.json`), alertas do Manual (`apoio/vade-mecum.json`) e a lista de caça do gabinete. Transcrições ficam
  fora das regras de redação. Com “Conformidade ativa”, relê o editor a cada 4 segundos e refaz a análise quando o texto
  muda; o número de alertas altos e médios aparece na aba. Motor em `conformidade-motor.js` (função pura, com testes).
- **Lote.** A minuta do processo nos lotes do Amicus Curiae · Collectio, com o perfil do processo e a comparação de sempre.
  **Transferir o texto do PJe para o Collectio (0.9):** lê o editor da tarefa de minuta, separa relatório, voto, ementa e
  acórdão pelos títulos e grava como nova versão da minuta do processo no lote (`POST /api/painel?lote=1 {acao:'minuta-versao'}`),
  vigente ou só guardada; as versões anteriores ficam no Collectio. Pede confirmação e confere se o editor é do mesmo processo.
- **Ementário do Compêndio.** Busca nos precedentes curados e na série histórica do Relator (sintaxe do Compêndio).
- **Só leitura no PJe.** O `conteudo-pje.js` lê o número do processo e, a pedido do painel, o texto do editor (parágrafos,
  classe, recuo, negrito e itálico). Não clica, não grava e não envia nada ao tribunal.

## Arquivos

```
manifest.json      MV3: painel lateral, permissões sidePanel e storage, acesso a www.gabinete-cmt.com (dados e API);
                   lê pje2g.trf3.jus.br e frontend-pje.app.trf3.jus.br (painel de tarefas), em todos os quadros
fundo.js           service worker: ícone abre o painel; junta o que cada quadro da aba vê (o mais forte e mais recente)
conteudo-pje.js    lê o número CNJ (título, cabeçalho da tarefa, número único) e o texto do editor da minuta
sincronia.js       prontuário ↔ GitHub (acervo/prontuarios), ficha e cartão da pauta
comparador.js      motor de comparação de textos (também usado nos testes)
fontes.js          materiais do gabinete publicados em /extensao/dados/base.json.gz (scripts/extensao/dados.py)
editor.js          leitura do editor do PJe compartilhada pelas abas Comparar e Conformidade (e leitura automática)
comparar.js        aba Comparar
conformidade-motor.js  regras da conformidade (função pura, com testes)
conformidade.js    aba Conformidade
painel.html/.css   painel (Prontuário, Ementário, Ajuda)
comum.js           site, download com gzip, diálogo de confirmação, número CNJ
prontuario.js      estado e gravação do prontuário, por processo (localStorage da extensão)
ficha.js           rascunho pessoal: ficha completa (análise guiada, julgamento, ciclo da minuta)
sessao.js          login do Ex Officio (/api/login) e chamadas à API do site
gabinete.js        ficha do gabinete (Ex Officio) e correspondência rascunho ↔ ficha
lote.js            aba Lote (Amicus Curiae · Index) e transferência do texto do PJe ao Collectio
triagem.js         aba Triagem (prontuário de triagem da ficha, registro do lote, etiquetas sugeridas)
autos.js           peças dos autos digitais (cronologia do PJe): conferência com a triagem e preenchimento do prontuário
ementario.js       busca no Ementário do Compêndio
pje.js             painel acompanha o processo da aba ativa
icones/            ícones 16, 32, 48 e 128
```

## Dados lidos do site (públicos)

Publicados pelo workflow `.github/workflows/vercel-caput.yml` em `https://www.gabinete-cmt.com/jurisprudencia/`:

| Arquivo | Origem |
| --- | --- |
| `curados.json.gz`, `curados-texto.json.gz` | `scripts/jurisprudencia/gerar_curados.py` (precedentes curados e inteiros teores) |
| `indice.json.gz` | série histórica resumida (`precedentes/jurisprudencia/indice.json.gz`) |
| `busca/indice.json`, `busca/A-AAAA.txt.gz`, `busca/M-AAAA.txt.gz` | `scripts/jurisprudencia/gerar_busca.py` |

## Instalação

O mesmo workflow publica o pacote em `https://www.gabinete-cmt.com/extensao/muta-pje.zip`.

1. Extraia o ZIP numa pasta permanente.
2. `chrome://extensions` › Modo do desenvolvedor › Carregar sem compactação › pasta com o `manifest.json`.
3. Fixe o ícone do Muta e abra-o com os autos na tela.

Para atualizar (desde a 0.19.1): dê dois cliques em `atualizar-muta.cmd`, na pasta da extensão. Ele baixa o ZIP do site
(curl e tar do Windows), copia os arquivos por cima e o `manifest.json` por último. O painel do Muta confere a cada
8 segundos se a versão do manifest em disco mudou e, se mudou, se recarrega sozinho (`chrome.runtime.reload()`):
não é preciso abrir `chrome://extensions`. Quando o site tem versão mais nova (`/extensao/versao.json`, gerado na
publicação), aparece "↑ versão" na faixa do topo. Sem o atalho (até a 0.19.0): extraia o ZIP sobre a mesma pasta
uma última vez e clique em Recarregar no cartão da extensão.
Não remova a extensão para atualizar: isso apaga os prontuários guardados nela.

## Testes

`node --test apoio/ex-officio/tests/extensao-muta.test.js apoio/ex-officio/tests/prontuario-extensao.test.js`
(motor de comparação, conformidade, leitura do cabeçalho da tarefa, pacote de dados e a API do prontuário com o GitHub simulado).

## Pendências

- [VALIDAR] Leitura no PJe2g real depois da 0.8: o painel de tarefas vem de `frontend-pje.app.trf3.jus.br` (conferido em
  19/11/2026) e a tarefa aberta de `pje2g.trf3.jus.br/pje/Processo/movimentar.seam`, num quadro dentro dele. Se o painel
  não reconhecer o processo, ajustar `RE_TAREFA`/`CABECALHOS`; se não ler o editor, ajustar `editores()` (`conteudo-pje.js`).
- [VALIDAR] Classes de estilo do editor do PJe (parágrafo sem recuo, citação): a conformidade usa o recuo e o negrito/itálico
  calculados; se o PJe marcar a citação por classe própria, incluí-la em `cita`.
- [VALIDAR] Política de instalação de extensões nos computadores do TRF-3.
