# procs-muta · base do Gabinete do Des. Fed. Carlos Muta

Base de dados do gabinete do Desembargador Federal Carlos Muta (Turma Regional de Mato Grosso do Sul, TRF3), no padrão 1.0 do gabcmt.

## Estrutura

```
acervo/                        processos em tramitação no gabinete
  fonte.json · fonte.csv       acervo fonte: só dados de origem (planilhas do PJe e do Power BI e DataJud); valores
                               padrão do Painel Central não são gravados (scripts/painel/separar_fonte.py)
  operacional.json             trabalho do gabinete, 1 registro por processo ativo (baixados/arquivados fora), em seções:
                               origem (aba Processo da Ficha) · triagem · producao · pauta (histórico de sessões);
                               servidor, corretor, datas e itens vêm também de acervo/sessoes/;
                               nomes de campo da Ficha: triagem, AJG/DPU, impedimento,
                               contrarrazões, META, elaboração e passagens por pauta (sessão, item e resultado)
  sessoes/                     calendario.json (calendário de sessões) e um arquivo por sessão (AAAA-MM-DD.json)
  planilhas/                   cópia integral das planilhas do Google Sheets aposentadas: Controle de Pauta (espelho de 09/11),
                               pautas do 2º e 6º bimestres, tarefas do PJe (22/06) e divergências de servidor e revisor a conferir
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

apoio/                         recursos de apoio à redação
  diretrizes.json              vocabulário, conectivos, preferências, correções, alertas
  magistrados.json             cadastro de magistrados (TRF3 e 1º grau)
  assuntos.json                assuntos (TPU/CNJ) e temas
  vade-mecum.json              Vade Mecum do Compêndio (Assuntos, Temas, Súmulas, Jurisprudência, Normas, Regimento, Diretrizes,
                               Usos no gabinete, Matriz PIS-Cofins); antes vinha da planilha do Google, agora a fonte é este arquivo
  repertorio.json              repertório jurisprudencial e normativo (campo categoria: jurisprudencia | Lei, Código…)
  acessos.json                 Quem tem o modo avançado do Compêndio e quem usa o editor (nomes da equipe da Pauta)
  enciclopedia.json            Enciclopédia do modo avançado (servida só pelo /api/compendio, após o login): recursos, guias, rotina, PJe, competência, matérias, léxico
  usos-repertorio.json · .csv  em quais precedentes cada item do Vade Mecum é citado (gerado)
  pauta-equipe/                Pauta da equipe (/equipe/ na Vercel): login de cada servidor e cartões da pauta; api/ grava em acervo/sessoes com o GH_TOKEN da Vercel
  cmt-compendio/               CMT Compêndio: cmt-compendio.html (um só código: modo padrão para todos; modo avançado, com Enunciados, Repertório, Enciclopédia e atalho para o Monitor, liberado pelo login a quem está em apoio/acessos.json) e cmt-editor.html (/editor/: edita modelos, parágrafos, peças, diretrizes e normas e grava no procs-muta pelo servidor), com os usos automáticos embutidos

padrao/                        regras técnicas da base
  esquema.json                 formato obrigatório de cada arquivo
  manifesto.json               versão, contagem e hash de cada arquivo (gerado)
  paradigmas.js                biblioteca de leitura (navegador e Node)

gerar.py                       valida a base, atualiza o manifesto e importa exportações dos apps
scripts/                       rotinas auxiliares (DataJud, catálogo, modelos-matriz, apps)
cmt-monitor.html               CMT-monitor: menu Acervo com três páginas (Acervo Central: escaninhos à esquerda, com os fixos Aptos, Metas e Retirados de pauta; dados dos filtrados, com as fases do PJe; cartão Acervo filtrado e Busca avançada, em Planilha ou Prontuário, com Exportar; Panorama geral: indicadores em faixas, painel por blocos e relatórios; Planilha integral, só leitura), Seleção Prévia e Pautas de julgamento; botão Base do gabinete com a conexão e os dados; Configurações com as regras e a equipe
cmt-fluxograma.html            CMT-fluxograma: fluxograma interativo, rotina do gabinete, competência e impedimentos, assuntos e procedimentos
construtor.html · index.html   apps (ver observação abaixo)
```

## Uso

```
python3 gerar.py                         valida tudo e atualiza padrao/manifesto.json
python3 gerar.py --importar A.json …     mescla exportações dos apps por id e valida
python3 scripts/repertorio/vincular.py apoio/cmt-compendio/cmt-compendio.html --html
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

O **CMT-monitor** (`cmt-monitor.html`, antigo Painel Central) lê e grava nesta base, com um token do GitHub com permissão *Contents* (leitura e gravação):

- lê `acervo/fonte.json`, o acervo fonte (DataJud e planilhas); em cada informação repetida vale a coluna do PJe, depois a do Power BI, depois a do DataJud;
- tira a seção e o ramo do assunto do CNJ: `apoio/assuntos-cnj.json` (árvore da TPU, atualizada toda segunda-feira pelo workflow `cnj-assuntos`) e `apoio/regras/secoes.json` (RI TRF3, art. 10); a etiqueta de seção do PJe só gera alerta quando diverge;
- `acervo/blocos-destinos.html`: painel por blocos e destinos prováveis (retrato de 04/11/2026, sem CPF), exibido em Acervo › Panorama geral;
- o acervo conta por padrão os processos ativos (sem arquivados, baixados, cancelados, fora de tramitação e eliminados); os que ainda não têm tarefa no PJe do gabinete aparecem em "A caminho do gabinete", fora das contagens;
- grava o calendário de sessões (datas, hora e marcos) em `acervo/sessoes/calendario.json` e a pauta de cada sessão (item, quem minuta, quem corrige e as datas de minuta, correção e liberação) em `acervo/sessoes/AAAA-MM-DD.json`;
- grava as regras em `apoio/regras/etiquetas.json` (conversão de etiquetas) e `apoio/regras/designacao.json` (critérios de designação e correção), e a equipe em `apoio/equipe.json`; as regras de impedimento e suspeição ficam em `apoio/regras/impedimentos.json` (sem CPF);
- tudo vai num único commit pelo botão "Gravar no procs-muta"; até lá, o trabalho fica no navegador.

`construtor.html` e `index.html` ainda leem e gravam no repositório `brndutra/gabcmt`, com a estrutura antiga de pastas.
