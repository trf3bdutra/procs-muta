# Extensão Muta · painel lateral ao lado do PJe

Extensão do Chrome/Edge (Manifest V3) que abre o **Muta** num painel lateral, ao lado dos autos e das tarefas do PJe 2º grau do TRF-3.
Base: o HTML independente *muta-independente-prontuario-completo* (Prontuário + Acervo).

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

Para atualizar: extraia o ZIP novo sobre a mesma pasta e clique em Recarregar no cartão da extensão.
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
