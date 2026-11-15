# Planilhas do Drive (espelho da Pauta da equipe)

Planilhas do Google atualizadas todo dia útil por uma tarefa agendada, a partir do que está no GitHub.
Os IDs estão em `planilhas.json`. O app continua sendo o lugar de editar; o Drive é cópia para consulta.

| Onde | Formato |
|---|---|
| Pasta **CMT - Pautas de Julgamento** | uma planilha por sessão liberada para a equipe, no molde **Controle de Pauta** (o da `Pauta_Sessao_30-11-2026`): painel nas linhas 1-19, cabeçalho na linha 20, processos em A21:Y320. Nome: `Pauta_Sessao_DD-MM-AAAA (Pauta da equipe)` |
| Monocráticas — Gabinete CMT | uma aba por mês de registro (sem data de registro: mês da minuta) |
| Controles especiais — Gabinete CMT | Metas (com encerrados), Sobrestados, Casos sensíveis |

Cores: formatação condicional na própria planilha. Nas pautas, a do molde (liberado lilás, corrigido azul,
pendência amarela, minutado verde, desfecho laranja); nas demais, a mesma lógica pelas colunas de etapa e aviso.

## Pautas: colunas do molde × Pauta da equipe

A Item · B Processo · C Classe · D Assunto · E Detalhes (com `#SO`/`#Pref` quando há sustentação oral/preferência) ·
F Pendências (**fórmula do molde, nunca gravada**) · G Etapa (fórmula do molde, ou Corrigido/Liberado) · H Minutado em ·
I Servidor · J Revisor · K Intervenção MPF · L Parecer MPF · M Preliminares · N Tempestividade · O Preparo ·
P Representação · Q Mídias · R Resultado · S Consectários · T Honorários · U Tópico-síntese · V Desfecho ·
W Intercorrência · X Meta · Y Apreciação. A data da sessão fica em R1 (o título e os prazos do painel dependem dela).

## Atualização diária

1. Gerar os dados (só leitura do repositório; nada é gravado no GitHub):
   ```
   NODE_PATH=$(npm root -g) node scripts/drive/exportar.js /tmp/cmt-drive
   python3 scripts/drive/montar_xlsx.py /tmp/cmt-drive
   python3 scripts/drive/pautas_sessao.py /tmp/cmt-drive
   ```
   Saída: `/tmp/cmt-drive/abas.json` (monocráticas e controles: abas e `.tsv` de cada uma) e
   `/tmp/cmt-drive/pautas_sessao/<AAAA-MM-DD>.json` (uma por sessão: `titulo`, `aba`, `r1`, `limpar`, `faixa`, `valores`).
2. **Pautas**, para cada arquivo de `pautas_sessao/`:
   - achar a planilha na pasta (`pasta_id`) pelo `titulo` (busca do Drive: `title = '<titulo>' and parentId = '<pasta_id>'`);
   - se não existir (sessão nova): `copy_file` de `copiar_de` com o `titulo`, na pasta; renomear a aba para `aba`
     (`updateSheetProperties`, campo `title`);
   - `batch_clear_values` nas faixas de `limpar` (A21:E320 e G21:Y320 da aba; a coluna F não é limpa);
   - `update_values` em `'<aba>'!R1` com `[[r1]]` e em `'<aba>'!<faixa>` com `valores`
     (null em F não grava nada; fórmulas usam nomes em inglês com ";", a planilha está em pt_BR).
3. **Monocráticas e Controles especiais**, para cada aba listada em `abas.json`:
   - ler as abas existentes (`get_spreadsheet`, campos `sheets.properties`);
   - aba que ainda não existe (mês novo): `duplicateSheet` da última aba do mesmo arquivo (mantém cabeçalho,
     larguras e cores), com o nome da aba nova, em ordem cronológica;
   - limpar os valores da aba (`batch_clear_values` em `'Aba'!A1:AZ`);
   - colar o `.tsv` inteiro (cabeçalho + linhas) com `update_spreadsheet` → `pasteData` em A1
     (`delimiter` "\t", `type` "PASTE_VALUES").
4. Planilhas e abas que não vêm mais na exportação (sessão antiga, por exemplo) ficam como estão: são histórico.
   Não apagar nada no Drive.
