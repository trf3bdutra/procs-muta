# Banco do Construtor de Minutas

Exportações dos catálogos auxiliares do app, importadas por `scripts/banco/importar.py` (sem duplicatas: por id e por chave natural).

| Arquivo | Conteúdo | Registros | Versão |
|---|---|---:|---|
| [`assuntos.json`](assuntos.json) | Catálogo de assuntos (TPU/CNJ, seções e sinônimos) | 556 | 2026-10-13 |
| [`jurisprudencia.json`](jurisprudencia.json) | Jurisprudência de referência (temas, súmulas, precedentes qualificados) | 42 | 2026-10-13 |
| [`normas.json`](normas.json) | Catálogo de normas (siglas, aliases e forma por extenso) | 56 | 2026-10-13 |
| [`paragrafos.json`](paragrafos.json) | Parágrafos-modelo do gestor de parágrafos | 120 | 2026-10-13 |
| [`redacao.json`](redacao.json) | Padrão de redação: conectivos, verbos, preferências, correções e alertas | 136 | 2026-10-13 |

Para atualizar: exporte cada banco no app e rode `python3 scripts/construir.py ARQUIVOS.json`.

Os modelos e os precedentes curados não ficam aqui: a base do app é `data/paradigmas.json` (ementário, modelos-matriz, parágrafos e citações). Os 202 modelos-matriz retirados em 20/10/2026 foram restaurados em 21/10/2026 a partir do commit a2ae68b.
