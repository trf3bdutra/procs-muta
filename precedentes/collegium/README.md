# Collegium — jurisprudência dos demais gabinetes da Turma Regional de MS

Ementário dos julgados da Turma Regional de Mato Grosso do Sul **sem os do Relator** (Des. Fed. Carlos Muta,
Gab. A): acórdãos e decisões monocráticas terminativas do **Gab. B** e do **Gab. C**. É lido pelo Collegium
(`/amicus/collegium/`), que usa o mesmo ementário do Compendium (`apoio/modus-operandi/fonte/ementario.js`,
montado por `build.py › gerar_html('collegium')`), com a dimensão **Relator** a mais.

## Fonte

Diário de Justiça Eletrônico Nacional (DJEN, CNJ), API pública `comunicaapi.pje.jus.br/api/v1/comunicacao`,
`siglaTribunal=TRF3`, por órgão (`orgaoId`):

| Órgão no DJEN | idOrgao |
|---|---|
| Gab. B da Turma Regional de Mato Grosso do Sul | 98372 |
| Gab. C da Turma Regional de Mato Grosso do Sul | 102009 |
| Gab. A (Relator — **não entra aqui**; vai para `precedentes/jurisprudencia`) | 101584 |

## O que cada registro guarda

- **Acórdão** (`acordaos/AAAA.json.gz`, ids `CA…`): ementa completa, parágrafo do acórdão (resultado) e partes.
- **Monocrática** (`monocraticas/AAAA.json.gz`, ids `CM…`): abertura (do "Vistos" em diante, 1.500 caracteres)
  e dispositivo (do "Ante o exposto" em diante).
- Não guarda o inteiro teor: o link do documento no PJe (`link_documento_djen`) vai em cada registro.
- **Relator**: lido do próprio texto ("nos termos do voto do Desembargador Federal NOME (Relator)" no acórdão;
  a assinatura no fim da monocrática). O cabeçalho do PJe traz só o gabinete.
- **Data do julgamento/decisão**: lida do número do documento no link do PJe (`x=AAMMDD…`, data da assinatura),
  conferida contra a série do Relator em 398 de 398 casos.
- Repetição (o DJEN traz a mesma decisão uma vez por destinatário): fica um registro por processo, tipo e data.

`resumo.json` (totais, relatores, período e última coleta) alimenta o painel de busca do Amicus.
`indice.json.gz` tem o mesmo formato do índice da série do Relator, com `rl` (relator) e `g` (gabinete).
`MANIFESTO.json` traz totais, contagem por ano, por relator e por gabinete, o histórico de coletas e os hashes;
`SHA256SUMS` confere os arquivos. A busca em texto (`busca/`) é gerada na publicação, fora do Git.

## Atualização

`scripts/jurisprudencia/coletar_djen.py` (rotina no computador do gabinete; o DJEN não responde do ambiente
em nuvem) lê o DJEN dia a dia desde a última coleta menos 30 dias e chama `scripts/jurisprudencia/collegium.py`.
Para acrescentar um lote já colhido: `python3 scripts/jurisprudencia/collegium.py LOTE.json --coleta AAAA-MM-DD --criterio "…"`.
