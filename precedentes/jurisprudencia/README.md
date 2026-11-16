# Jurisprudência do Relator — série histórica

Base completa dos julgados do Des. Fed. Carlos Muta, coletada da Base de Jurisprudência do
TRF-3 (`web.trf3.jus.br/jurisprudencia`), coleções Monocráticas e TRF3/Acórdãos.

Importada para o procs-muta em 16/11/2026, a partir do repositório `brndutra/trf3-muta-jurisprudencia`.
O procs-muta é o repositório principal: a partir desta importação, nada aqui depende daquele.

## Conteúdo

| Pasta | Período | Registros |
| --- | --- | --- |
| `acordaos/` | 1999–2026 | 26.050 |
| `monocraticas/` | 2016–2026 | 7.157 |
| **Total** | | **33.207** |

Um arquivo por ano, em JSON comprimido (`AAAA.json.gz`). O `indice.json.gz` traz os 33.207
registros em forma resumida, com chaves curtas, para busca sem abrir os arquivos de ano.

Dos acórdãos: 12.694 com inteiro teor, 11.751 só com o acórdão e 1.605 só com a ementa.
Por atuação: 25.402 como relator e 648 como relator para o acórdão.

## Critério da coleta

- Monocráticas: `relator_t: CARLOS MUTA`
- Acórdãos: `relator_t | relator_acordao_t: CARLOS MUTA`

Coleta original em 30/10/2026, registrada em `MANIFESTO.json`.

## Lacunas conhecidas

- 162 acórdãos não foram coletados: o servidor do TRF-3 recusou as últimas requisições. São os
  mais antigos, de cerca de 1999 a 2001, em regra só com ementa.
- A contagem por ano tem quedas que não se explicam pela produção: 2018 com 6 registros, 2019
  com 7, 2024 com 312 e 2025 com 7, contra mais de 2.900 em 2020. Conferir antes de usar a série
  para qualquer estatística de produtividade [VALIDAR].

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
alimenta o Modus Operandi: tem assunto, tese, subassunto e tags revisados a mão. Esta pasta é a
série bruta, sem curadoria. As duas convivem; a série histórica não substitui o ementário.

## Leitura

`scripts/jurisprudencia/ler.py` lista, filtra por ano, espécie e atuação, e exporta em JSONL.
