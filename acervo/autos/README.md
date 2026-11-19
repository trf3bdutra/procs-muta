# Autos extraídos do PJe

Um arquivo por processo: `<CNJ>.json.gz` (gzip de JSON), gerado pelo extrator do gabinete no navegador.

Campos do JSON:
- `cnj`, `extraido_em`;
- `lista`: lista de documentos do PJe (ID, tipo, descrição, juntado por, juntado em, última alteração, tamanho);
- `docs`: por documento lido, ID, tipo, formato (pdf/html), páginas e caracteres extraídos;
- `faltam`: IDs listados que o extrator não conseguiu percorrer;
- `texto`: inteiro teor, em ordem de ID, com o cabeçalho `===== ID … | tipo | juntado por … em … =====` antes de cada documento.

PDFs sem camada de texto (digitalizados) vêm marcados com `[ATENÇÃO: PDF com pouco ou nenhum texto …]`.
A cronologia e a tabela de IDs de cada processo ficam no item do lote (`acervo/lotes/<id>.json`).
