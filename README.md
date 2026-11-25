# procs-muta · base do Gabinete do Des. Fed. Carlos Muta

Base de dados do gabinete do Desembargador Federal Carlos Muta (Turma Regional de Mato Grosso do Sul, TRF3), no padrão 1.0 do gabcmt.

## Estrutura

```
acervo/                        processos em tramitação no gabinete
  fonte.json · fonte.csv       acervo fonte: processos em andamento no gabinete, com o paradeiro (tarefa do PJe) atualizado.
                               Planilha principal (lista dos em andamento) define quem está e onde; complementares (Power BI,
                               sigilosos, outras) só preenchem; lista de uma tarefa atualiza o paradeiro de quem veio nela.
                               scripts/painel/atualizar_fonte.py · botão via padrao/acervo-fonte.js → acervo/entrada/carga.json
                               → Action acervo-fonte.yml (também complementa com o DataJud, sem acrescentar processos)
  operacional.json             trabalho do gabinete, 1 registro por processo da fonte, em seções:
                               origem (aba Processo da Ficha) · triagem · producao · pauta (histórico de sessões);
                               servidor, corretor, datas e itens vêm também de acervo/sessoes/;
                               nomes de campo da Ficha: triagem, AJG/DPU, impedimento,
                               contrarrazões, META, elaboração e passagens por pauta (sessão, item e resultado)
  sessoes/                     calendario.json (calendário de sessões) e um arquivo por sessão (AAAA-MM-DD.json)
  lotes/                       painéis de lote (1 arquivo por lote: <id>.json, esquema gabcmt.lote): grupos, colunas de variação,
                               e, por processo, enquadramento, variações, peculiaridades (versão da equipe e do Relator), peças,
                               ajustes e pendências; lido pelo painel /lotes/ (apoio/ex-officio/lotes) por /api/painel?lote=1
                               cada lote tem sessões associadas e um filtro (assunto, classe ou texto); o gestor cria lotes e associa
                               ou desassocia sessões pelo próprio painel (entram ou saem os processos da sessão que passam no filtro)
  minutas/<lote>/              minuta de cada processo do lote (<NNNNNNN-DD>.json, esquema gabcmt.minuta: relatório, voto, ementa,
                               acórdão, origem e data), carregada sob demanda no painel /lotes/ para leitura e cópia
  planilhas/                   cópia integral das planilhas do Google Sheets aposentadas: Controle de Pauta (espelho de 09/11),
                               pautas do 2º e 6º bimestres, tarefas do PJe (22/06) e divergências de servidor e revisor a conferir
  operacional-arquivo.json     trabalho registrado de quem saiu do gabinete; volta ao operacional se o processo voltar
  datajud/                     estado da sincronização e relatórios de cada coleta

precedentes/                   processos já julgados pelo relator
  precedentes.jsonl            ementário: 1 julgamento por linha (1.844), com curadoria e catalogação
  inteiros-teores/2026.jsonl   texto integral (relatório, voto, ementa, acórdão), ligado pelo id
  catalogo-cmt/                catálogo CMT: acórdãos publicados do relator, por assunto e tema (comece por INDICE.md)

modelos/                       tudo o que é modelo de texto
  modelos.json                 modelos-matriz por tipo: acórdão (253), decisão (102), despacho (43)
                               os de acórdão "mod-cat-*" vêm do catálogo: scripts/modelos-matriz/catalogo.py
  matrizes-estruturais.json    moldes por tipo de julgamento, usados no Editorial (e ids excluídos)
  paragrafos.json              parágrafos-padrão (328; os "rural.cr.*" e "pensao.cr.*" vêm dos recortes do Compêndio Rural)
  matrizes-2886.json           matrizes modulares do 28,86% (ACP 0005019-15.1997.4.03.6000): 44 módulos, 10 grupos, variáveis e ementas-base,
                               extraídos dos 75 acórdãos de 15/09 a 26/10/2026; usados na Consulta do Modus Operandi (consulta_2886.js)

apoio/                         recursos de apoio à redação
  diretrizes.json              vocabulário, conectivos, preferências, correções, alertas
  magistrados.json             cadastro de magistrados (TRF3 e 1º grau)
  assuntos.json                assuntos (TPU/CNJ) e temas
  vade-mecum.json              Vade Mecum do Modus Operandi (Assuntos, Temas, Súmulas, Jurisprudência, Normas, Regimento, Diretrizes,
                               Usos no gabinete, Matriz PIS-Cofins); antes vinha da planilha do Google, agora a fonte é este arquivo
  repertorio.json              repertório jurisprudencial e normativo (campo categoria: jurisprudencia | Lei, Código…)
  diretrizes-rapidas.json      Quadro de entradas rápidas das Diretrizes (registradas no Modus Operandi por quem tem acesso de editor)
  acessos.json                 Perfis do Modus Operandi: equipe (padrão, leitura), avancado (+ Enunciados, Repertório, Enciclopédia, Monitor)
                               e editor (+ edição de tudo); cada perfil inclui o anterior
  enciclopedia.json            Enciclopédia do modo avançado (servida só pelo /api/compendio, após o login): recursos, guias, rotina, PJe, competência, matérias, léxico
  usos-repertorio.json · .csv  em quais precedentes cada item do Vade Mecum é citado (gerado)
  ex-officio/                Ex Officio (/equipe/ na Vercel): login de cada servidor, cartões da pauta e das monocráticas e a ficha do processo;
                               lotes/index.html: painel de lotes (/lotes/), página independente da navegação do Ex Officio, no mesmo padrão
                               visual e com o mesmo login: matriz do lote, perfil de cada processo (prontuário da sessão) e minuta copiável;
                               liga-se ao Ex Officio (/equipe/) e à Consulta do Modus Operandi (/modus/#consulta=AAAA-MM-DD/ITEM);
                               lotes/previa.html: o CORTEX (/amicus/cortex/; o anterior segue em /amicus/cortex/classico/):
                               coleções Pauta (sessões ativas e lotes da pauta), Monocrática, Interlocutória e Despacho (monocráticas do
                               Ex Officio, /api/pauta?mono=1, pelo tipo de ato) e Avulsas; fluxo da minuta, matriz padrão e própria
                               (acervo/matrizes/ para a pauta e as decisões) e processo com versões e comparação, no layout da mesa de
                               trabalho (coluna esquerda minimizável; ?layout=antigo volta ao anterior). Sem versão final
                               importada, vale o acórdão ou a decisão publicada no Ementário (/jurisprudencia/indice.json.gz);
                               api/ grava em acervo/sessoes e, no mesmo commit, na ficha do processo em acervo/operacional.json (GH_TOKEN da Vercel)
  modus-operandi/               Modus Operandi: seções Ementário (precedentes), Editorial (Peças, Modelos, Parágrafos), Diretrizes e Consulta, numa pill própria ao lado da pill Início · Pauta (barra comum com a Ex Officio); modus-operandi.html (um só código; o que cada pessoa vê e edita depende do perfil em apoio/acessos.json) e modus-operandi-editor.html (/editor/: edita modelos, parágrafos, peças, diretrizes e normas e grava no procs-muta pelo servidor), com os usos automáticos embutidos

extensao/                      extensão Muta (Chrome/Edge, painel lateral ao lado do PJe): prontuário por processo, que segue o
                               processo aberto no PJe, e busca no Ementário do Compêndio (curados + série histórica);
                               publicada em /extensao/muta-pje.zip pelo vercel-caput.yml (ver extensao/README.md)

padrao/                        regras técnicas da base
  esquema.json                 formato obrigatório de cada arquivo
  ficha.json                   ficha única padrão do processo (abas, grupos e campos; Produção em versão sessão ou monocrática),
                               gerada de integracoes-ficha.md por scripts/ficha/gerar_ficha.py; usada pela Ex Officio
  manifesto.json               versão, contagem e hash de cada arquivo (gerado)
  paradigmas.js                biblioteca de leitura (navegador e Node)

gerar.py                       valida a base, atualiza o manifesto e importa exportações dos apps
scripts/                       rotinas auxiliares (DataJud, catálogo, modelos-matriz, apps)
cmt-monitor.html               Caput: menu Acervo com três páginas (Acervo Central: escaninhos à esquerda, com os fixos Aptos, Metas e Retirados de pauta; dados dos filtrados, com as fases do PJe; cartão Acervo filtrado e Busca avançada, em Planilha ou Prontuário, com Exportar; Panorama geral: indicadores em faixas, painel por blocos e relatórios; Planilha integral, só leitura), Seleção Prévia e Pautas de julgamento; botão Base do gabinete com a conexão e os dados; Configurações com as regras e a equipe
cmt-fluxograma.html            CMT-fluxograma: fluxograma interativo, rotina do gabinete, competência e impedimentos, assuntos e procedimentos
construtor.html · index.html   apps (ver observação abaixo)
```

## Compendium — definição funcional

- **Ementário:** memória jurisprudencial do relator; precedentes, teses e inteiros teores.
- **Minuta-Matriz:** estrutura do pronunciamento conforme o tipo de julgamento, independente da matéria. Ao aplicar um processo da pauta, seleciona a estrutura correspondente e preenche os campos com as informações disponíveis no cartão e na ficha. Campos sem informação permanecem pendentes; não se presume resultado. Na ausência de modelo específico, a Minuta-Matriz sustenta a elaboração da minuta individualizada.
- **Modelos:** conteúdo jurídico reutilizável para matérias, controvérsias e hipóteses processuais específicas; os modelos são oferecidos separadamente e aplicados após escolha e conferência da aderência. A estrutura da Minuta-Matriz também orienta a elaboração e conferência dos modelos.

Abrir um processo na Minuta-Matriz não equivale a aplicar um modelo temático. A matriz estrutural por resultado somente é selecionada quando há resultado registrado e correspondência exata com o pronunciamento e a espécie. A redação do mérito e a validação das particularidades dos autos permanecem necessárias.

## Uso

```
python3 gerar.py                         valida tudo e atualiza padrao/manifesto.json
python3 gerar.py --importar A.json …     mescla exportações dos apps por id e valida
python3 scripts/repertorio/vincular.py apoio/modus-operandi/modus-operandi.html --html
                                         localiza nos precedentes os temas, súmulas, julgados e artigos
                                         do Vade Mecum e atualiza os usos (JSON, CSV e o próprio HTML)
```

Nada é apagado na importação. O que vem de fora só entra se passar no esquema.

## Automação

- `.github/workflows/base.yml`: a cada alteração em `precedentes/`, `modelos/`, `apoio/` ou `padrao/`, valida a base e atualiza o manifesto.
- `.github/workflows/datajud-acervo.yml`: coleta o DataJud, atualiza `acervo/` e grava o relatório.

## Identificadores

Precedente: `acd-<20 dígitos do processo>-<AAAAMMDD do julgamento>-<espécie>` (ex.: `acd-50003247020244036004-20260928-ap`; `ed` para embargos de declaração). O id antigo (`par-…`) fica em `idAnterior`.

## Observação sobre os apps

O **Caput** (`cmt-monitor.html`, antigo Painel Central) lê e grava nesta base, com um token do GitHub com permissão *Contents* (leitura e gravação):

- lê `acervo/fonte.json`, o acervo fonte (DataJud e planilhas); em cada informação repetida vale a coluna do PJe, depois a do Power BI, depois a do DataJud;
- tira a seção e o ramo do assunto do CNJ: `apoio/assuntos-cnj.json` (árvore da TPU, atualizada toda segunda-feira pelo workflow `cnj-assuntos`) e `apoio/regras/secoes.json` (RI TRF3, art. 10); a etiqueta de seção do PJe só gera alerta quando diverge;
- `acervo/blocos-destinos.html`: painel por blocos e destinos prováveis (retrato de 04/11/2026, sem CPF), exibido em Acervo › Panorama geral;
- o acervo conta por padrão os processos ativos (sem arquivados, baixados, cancelados, fora de tramitação e eliminados); os que ainda não têm tarefa no PJe do gabinete aparecem em "A caminho do gabinete", fora das contagens;
- grava o calendário de sessões (datas, hora e marcos) em `acervo/sessoes/calendario.json` e a pauta de cada sessão (item, quem minuta, quem corrige e as datas de minuta, correção e liberação) em `acervo/sessoes/AAAA-MM-DD.json`;
- grava as regras em `apoio/regras/etiquetas.json` (conversão de etiquetas) e `apoio/regras/designacao.json` (critérios de designação e correção), e a equipe em `apoio/equipe.json`; as regras de impedimento e suspeição ficam em `apoio/regras/impedimentos.json` (sem CPF);
- tudo vai num único commit pelo botão "Gravar no procs-muta"; até lá, o trabalho fica no navegador.

`construtor.html` e `index.html` ainda leem e gravam no repositório `brndutra/gabcmt`, com a estrutura antiga de pastas.

### Amicus Curiae — separação das ferramentas
- **CORTEX** (`/amicus/cortex/`): lotes, coleções, versões e controle da produção; preserva a base `acervo/lotes`.
- **Collectio** (`/amicus/collectio/`): consulta, curadoria e edição dos bancos `modelos/modelos.json` e `modelos/paragrafos.json`.
- **Compendium** (`/amicus/compendium/`): Minutário e elaboração de minutas, além dos referenciais jurídicos. Os bancos são compartilhados como fontes canônicas, sem duplicação.
