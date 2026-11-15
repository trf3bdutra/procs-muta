# Planilhas do Drive (espelho da Pauta da equipe)

Três planilhas do Google, atualizadas todo dia útil por uma tarefa agendada, a partir do que está no GitHub.
Os IDs estão em `planilhas.json`. O app continua sendo o lugar de editar; o Drive é cópia para consulta.

| Planilha | Abas |
|---|---|
| Pautas — Gabinete CMT | uma por sessão liberada para a equipe (exportação integral, padrão Controle de Pauta) |
| Monocráticas — Gabinete CMT | uma por mês de registro (sem data de registro: mês da minuta) |
| Controles especiais — Gabinete CMT | Metas (com encerrados), Sobrestados, Casos sensíveis |

Cores das linhas: formatação condicional na própria planilha (liberado/para assinatura lilás, corrigido/revisado azul,
aviso amarelo, minutado verde), então os dados regravados ficam coloridos sem passo extra.

## Atualização diária

1. Gerar os dados (só leitura do repositório; nada é gravado no GitHub):
   ```
   NODE_PATH=$(npm root -g) node scripts/drive/exportar.js /tmp/cmt-drive
   python3 scripts/drive/montar_xlsx.py /tmp/cmt-drive
   ```
   Saída: `/tmp/cmt-drive/abas.json` (para cada planilha, as abas e o `.tsv` de cada uma).
2. Para cada planilha de `planilhas.json` e cada aba listada em `abas.json` (mesmo grupo: pautas, monocraticas, controles):
   - ler as abas existentes (`get_spreadsheet`, campos `sheets.properties`);
   - aba que ainda não existe (sessão ou mês novo): `duplicateSheet` da última aba do mesmo arquivo (mantém cabeçalho,
     larguras e cores), com o nome da aba nova, na posição certa (pautas e meses em ordem cronológica);
   - limpar os valores da aba (`batch_clear_values` em `'Aba'!A1:AZ`);
   - colar o `.tsv` inteiro (cabeçalho + linhas) com `update_spreadsheet` → `pasteData` em A1
     (`delimiter` "\t", `type` "PASTE_VALUES").
3. Abas que não vêm mais em `abas.json` (sessão antiga, por exemplo) ficam como estão: são histórico. Não apagar abas.
