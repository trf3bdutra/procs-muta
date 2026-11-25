# Jurisprudência do Relator — série histórica

Base completa dos julgados do Des. Fed. Carlos Muta, coletada da Base de Jurisprudência do
TRF-3 (`web.trf3.jus.br/jurisprudencia`), coleções Monocráticas e TRF3/Acórdãos.

Importada para o procs-muta em 16/11/2026, a partir do repositório `brndutra/trf3-muta-jurisprudencia`.
O procs-muta é o repositório principal: a partir desta importação, nada aqui depende daquele.

## Conteúdo

| Pasta | Período | Registros |
| --- | --- | --- |
| `acordaos/` | 1999–2026 | 26.276 |
| `monocraticas/` | 2016–2026 | 7.248 |
| **Total** | | **33.524** |

Um arquivo por ano, em JSON comprimido (`AAAA.json.gz`). O `indice.json.gz` traz os 33.524
registros em forma resumida, com chaves curtas, para busca sem abrir os arquivos de ano.

Dos acórdãos: 12.694 com inteiro teor, 11.751 só com o acórdão e 1.831 só com a ementa.
Por atuação: 25.402 como relator e 648 como relator para o acórdão.

## Critério da coleta

- Monocráticas: `relator_t: CARLOS MUTA`
- Acórdãos: `relator_t | relator_acordao_t: CARLOS MUTA`

Coleta original em 30/10/2026, registrada em `MANIFESTO.json`.

Coletas incrementais ficam em `MANIFESTO.json › coletas_incrementais`. Em 24/11/2026 entraram 226
acórdãos publicados de 14/10 a 24/11/2026, colhidos só com a ementa (`conteudo_texto: apenas_ementa`,
sem partes, resultado, inteiro teor e links de impressão), por `scripts/jurisprudencia/acrescentar_ementas.py`;
a próxima coleta completa os substitui pela versão integral. Em 25/11/2026 entraram 91 monocráticas
publicadas de 30/09 a 24/11/2026, com inteiro teor (`scripts/jurisprudencia/acrescentar_monocraticas.py`);
das 220 da base nesse período, 124 ficaram por coletar porque o servidor do TRF-3 passou a responder com
erro — as posições estão na lacuna registrada no MANIFESTO.

## Lacunas conhecidas

- 162 acórdãos não foram coletados: o servidor do TRF-3 recusou as últimas requisições. São os
  mais antigos, de cerca de 1999 a 2001, em regra só com ementa.
- A contagem de acórdãos por ano tem quedas (2018 com 6, 2019 com 7, 2024 com 314 e 2025 com 8,
  contra mais de 2.900 em 2020). Conferido em 25/11/2026: a própria base do TRF-3 tem 13 acórdãos
  do Relator julgados em 2018–2019 e 322 em 2024–2025, os mesmos números da série; as quedas são
  da base, não falha da coleta.

## Integridade

`SHA256SUMS` traz o hash de cada arquivo. Para conferir:

```sh
cd precedentes/jurisprudencia && sha256sum -c SHA256SUMS
```

## Campos de cada registro

`id`, `seq`, `numero_processo`, `classe_sigla`, `classe`, `numero_classe_legado`,
`orgao_julgador`, `relator`, `relator_no_documento`, `data_julgamento`, `data_julgamento_iso`,
`publicacao_veiculo`, `data_publicacao`, `publicacao_complemento`, `partes`,
`resultado_colegiado`, `ementa`, `inteiro_teor`, `possui_inteiro_teor`,
`caracteres_inteiro_teor`, `link_pje`, `link_integra_externa`, `link_impressao`, `link_pdf`,
`atuacao_muta`, `sha256_inteiro_teor`, `sha256_ementa`, `conteudo_texto`.

## Relação com `precedentes.jsonl`

`precedentes/precedentes.jsonl` (1.844 registros, só de 2026) é o ementário **curado** que
alimenta o Modus Operandi: tem assunto, tese, tipo de caso (matéria · tipo · aspecto, padrao/tipo-caso.json) e tags revisados a mão. Esta pasta é a
série bruta, sem curadoria. As duas convivem; a série histórica não substitui o ementário.

## Leitura

`scripts/jurisprudencia/ler.py` lista, filtra por ano, espécie e atuação, e exporta em JSONL.
