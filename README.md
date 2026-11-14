# gabcmt · Gabinete do Des. Fed. Carlos Muta

Construtor de Minutas e bancos do gabinete do Desembargador Federal Carlos Muta (Turma Regional de Mato Grosso do Sul, TRF3).

## Padrão 1.0: a base comum (em transição)

A base passa a ter três áreas, lidas por todos os apps do mesmo jeito. Duas ficam aqui; o **acervo** (processos que estão no gabinete) fica no repositório privado `brndutra/gabcmt-dados`.

```
paradigmas/                    processos já julgados pelo relator
  precedentes.jsonl            ementário: 1 julgamento por linha (1.844), com curadoria e catalogação
  inteiros-teores/2026.jsonl   texto integral (relatório, voto, ementa, acórdão), ligado pelo id
  modelos.json                 voto-padrão · voto-matriz · decisão · despacho (202)
referencias/
  diretrizes.json              redação e estilística: vocabulário, conectivos, preferências, correções, alertas
  paragrafos.json              parágrafos-padrão
  citacoes.json                jurisprudência (TRF3, outros tribunais, superiores) e normas
  assuntos.json                assuntos (TPU/CNJ) e temas — o eixo que gera as coleções
  magistrados.json             cadastro único de magistrados (TRF3 e 1º grau), com as grafias usadas em etiquetas
padrao/
  manifesto.json               versão do padrão, contagem e hash de cada arquivo
  esquema.json                 formato obrigatório de cada categoria
  paradigmas.js                biblioteca comum de leitura (navegador e Node)
gerar.py                       porta única: valida, atualiza o manifesto, importa e gera a compatibilidade
scripts/migrar.py              migração única das bases antigas para o padrão 1.0
```

**Identificador do precedente:** `acd-<20 dígitos do processo>-<AAAAMMDD do julgamento>-<espécie>` (ex.: `acd-50003247020244036004-20260928-ap`; `ed` para embargos de declaração). O id antigo (`par-…`) fica em `idAnterior`.

**Coleções** não têm arquivo: são consultas por assunto + tema (+ período), feitas na hora pela biblioteca: `Paradigmas.criar().carregar()` e depois `colecao({ assunto, tema })`.

**Magistrados:** cada precedente traz `relatorId`, `colegiado` (vogais que votaram, lidos do acórdão) e `primeiroGrau` (`juizo`, `juiz`, `magistradoId`). `porMagistrado("NEY")` reúne o que o magistrado relatou, julgou no colegiado ou sentenciou em 1º grau; o cadastro também resolve as etiquetas de impedimento e suspeição do acervo.

**Temas:** os 17 temas da análise de veículos, saúde e concursos estão aprovados; os 673 do agrupamento automático estão *a revisar*, numerados em `prioridadeRevisao` (assuntos com mais precedentes primeiro).

## Apps (padrão 1.0)

| App | Lê | Grava |
|---|---|---|
| `construtor.html` (Construtor de Minutas) | `paradigmas/` e `referencias/` pela biblioteca `padrao/paradigmas.js` (embutida); se a base nova falhar, `banco/` | um commit em `paradigmas/precedentes.jsonl`, `paradigmas/modelos.json`, `referencias/paragrafos.json` e `referencias/citacoes.json`, no formato do padrão |
| `painel.html` (Painel Central) | acervo no repositório privado `gabcmt-dados` (`acervo/importado.json` + `acervo/operacional.json` + `trabalho.json`), com token | os mesmos arquivos e `produtividade/registros.json` (derivada do fluxo) |
| Servidor no Replit | cópia própria (prevalece quando o Construtor é aberto por ele) | publica no formato antigo em `banco/`; o GitHub Actions importa para a base nova |

O GitHub Actions (`.github/workflows/base.yml`) roda a cada gravação: importa o que veio em `banco/` no formato antigo, valida a base, atualiza o manifesto, regera `data/paradigmas.json` e `banco/` e confere os conversores (`scripts/testes/legado.js`).

Para atualizar os apps depois de mudar a biblioteca ou os módulos: `python3 scripts/construtor/atualizar.py` e `python3 scripts/painel/atualizar.py painel.html` (também aceitam uma versão nova baixada do app). O Painel ganhou: sincronização com o repositório privado (token que pode ser lembrado no navegador), colunas "Juízo de 1º grau" e "Juiz de 1º grau" na triagem, busca por magistrado (acervo e precedentes; 1º grau e colegiado) e leitura correta das datas dd/mm/aaaa na importação de planilhas.

**Compatibilidade:** enquanto os apps não migram, `python3 gerar.py --compat` regrava `data/paradigmas.json` e `banco/*.json` a partir da base nova; `python3 gerar.py` confere, registro a registro, que a base nova reproduz esses arquivos sem perda. Ao fim da transição saem `banco/`, `catalogo-trf3/`, `index.html` e `data/paradigmas.json`.

## Estrutura antiga (em uso até a migração dos apps)

```
data/paradigmas.json   base do app: ementário (precedentes), modelos-matriz (202), parágrafos, citações (jurisprudência e normas), assuntos e redação
banco/                 catálogos auxiliares exportados do app
  assuntos.json        catálogo de assuntos (TPU/CNJ, seções, sinônimos)
  jurisprudencia.json  temas, súmulas e precedentes de referência
  redacao.json         padrão de redação: conectivos, verbos, preferências, correções, alertas
  paragrafos.json      parágrafos-modelo do gestor de parágrafos
  normas.json          normas: siglas, aliases e forma por extenso
construtor.html        Construtor de Minutas
index.html             catálogo de acórdãos do TRF3 (visualização)
catalogo-trf3/         base bruta de acórdãos colhida no portal do TRF3, à espera de curadoria (não é banco)
scripts/               rotinas de importação e de geração do catálogo
```

## Bancos

Cada banco é um único arquivo em `banco/`, no formato das exportações do app (`schema: gabA.<banco>`, lista `registros`). O `construtor.html` os lê a cada abertura; publicado no GitHub Pages, lê do próprio site (`https://brndutra.github.io/gabcmt/construtor.html`). Contagens em [`banco/README.md`](banco/README.md).

Para atualizar a partir do app, exporte os bancos e rode na raiz do repositório:

```
python3 scripts/construir.py precedentes.json modelos.json assuntos.json jurisprudencia.json redacao.json paragrafos.json normas.json
```

Os arquivos são reconhecidos pelo `schema`, não pelo nome; uma exportação conjunta `gabA.paradigmas` é separada em precedentes e modelos. A importação mescla por `id` (atualiza o que existe, acrescenta o que é novo, não apaga nada) e elimina duplicatas pela chave natural de cada banco: processo e espécie nos precedentes, sigla nas normas, referência na jurisprudência, nome nos assuntos, texto nos parágrafos. Com `--substituir`, a exportação vira a fotografia oficial do banco, e o que foi apagado no app sai também daqui. Requer `scikit-learn` e `numpy`.

## Catálogo de acórdãos do TRF3

`catalogo-trf3/` reúne 1.828 acórdãos do relator (julgados de 18/03 a 06/10/2026), colhidos no portal do TRF3 (`acordaos.jsonl`) e organizados por **assunto** e, dentro do assunto, por **tema** (mesma questão jurídica), com as especificidades mais frequentes. Comece por [`catalogo-trf3/INDICE.md`](catalogo-trf3/INDICE.md). O `index.html` mostra o mesmo catálogo com busca, filtros, visão agrupada ou em tabela e exportação para o app.

Sem duplicidade: o que já está em `banco/precedentes.json` (ou é citado em `banco/modelos.json`) não entra nos arquivos de importação do catálogo; aparece nos índices com a marca *(no banco)*. Quando o mesmo processo tem outro julgamento já curado (ex.: a apelação no banco e os embargos de declaração no catálogo), o do catálogo recebe id próprio (`par-<processo>-<espécie>-<data>`), para não sobrescrever o curado ao importar.

Em `catalogo-trf3/inteiros-teores-2886-outubro-2026.json` está o acervo dos **inteiros teores** dos 58 acórdãos do relator sobre os 28,86% julgados em outubro de 2026 (relatório, voto, ementa e acórdão), copiados do portal de jurisprudência do TRF3.

Em `catalogo-trf3/inteiros-teores-veiculos-saude-concursos-2025-2026.json` estão os **inteiros teores** de 80 acórdãos do relator julgados de 23/10/2025 a 23/10/2026 sobre liberação de veículos (51), medicamentos (1), tratamentos e procedimentos médicos (6) e certames/concursos (22), com tipo, resultado e proporção de texto replicado de cada um. A análise (tipos mais recorrentes, blocos de texto replicados, acórdãos quase idênticos e erros que se propagaram pelo modelo) está em [`catalogo-trf3/ANALISE-veiculos-saude-concursos-2025-2026.md`](catalogo-trf3/ANALISE-veiculos-saude-concursos-2025-2026.md).

Campos acrescentados aos acórdãos do catálogo: `temaId`, `temaRotulo`, `temaTamanho`, `temaRepresentante`, `similaridadeTema`, `grauIgualdade` (idêntico, quase idêntico, similar, mesma questão, representante, único), `modeloTextoId`, `modeloTextoTamanho` e `sentidoResultado`. O agrupamento é automático; todos saem com `statusCuradoria: bruto`.

## Scripts

- `scripts/construir.py`: importa os bancos, refaz o catálogo, `catalogo-trf3/` e o `index.html`.
- `scripts/banco/importar.py`: só a importação dos bancos para `banco/`.
- `scripts/catalogo/`: geração do catálogo (`acumular.py`, `paradigma.py`, `similaridade.py`, `organizar.py`, `extrair.py`).
- `scripts/modelos-matriz/`: extração de votos dos PDFs do PJe (`extrair_pdf.py`, `estruturar.py`) e, em `v3/`, os dois modelos-matriz de 28,86% (abrangência territorial; exclusão por ação sindical), com a conferência literal com os votos-fonte.
