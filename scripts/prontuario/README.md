# Lote de prontuários pela LIA (28,86%)

A planilha de triagem é a base e o controle do lote: `acervo/controles/triagem-2886.xlsx`. O script acrescenta à direita dela as colunas de controle: Pauta, Item, Grupo sugerido, Prompt gerado, Prontuário lançado, Modelo (LIA) e Consulta.

O fluxo tem três comandos:

```bash
python3 scripts/prontuario/lote.py status                                    # quadro do lote
python3 scripts/prontuario/lote.py prompts --sessao 2026-12-07 --saida PASTA  # um prompt por processo pendente
python3 scripts/prontuario/lote.py lancar RESPOSTAS.txt|PASTA [--ensaio]      # grava os prontuários nos cartões
```

- **prompts:** usa o mesmo prompt do Ex Officio (`prompt.js` chama a função `liaPrompt` do próprio Ex Officio), mais a pista da triagem.
  - Pula os casos que já têm cartão e os marcados SEM MODELO; `--todos` inclui esses também.
- **lancar:** lê um ou vários blocos `<<<PRONTUARIO_CMT … PRONTUARIO_CMT>>>` e faz o mesmo que o botão Aplicar do Ex Officio.
  - Só aceita as chaves oficiais; as outras são relatadas e ignoradas.
  - Não troca campo já preenchido, salvo com `--sobrescrever`.
  - Inclui as pendências novas.
  - `--autor NOME` registra quem preencheu o cartão (padrão: `LIA (lote)`); use `--autor 'Claude (autos)'` quando o prontuário vier da leitura direta do inteiro teor.
  - Grava `acervo/sessoes/AAAA-MM-DD.json` e atualiza a planilha de controle.
  - O commit fica a cargo de quem roda.
- **Depois do lançamento:** o link da coluna Consulta abre a minuta pela matriz modular (`/modus/#consulta=SESSÃO/ITEM`).

O lançamento grava direto no arquivo da pauta. Por isso, a ficha do processo em `acervo/operacional.json` só é atualizada quando alguém salva o cartão pelo Ex Officio.
