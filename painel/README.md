# Estrutura do Painel

Esta pasta centraliza todo o código do Painel Central.

## Organização proposta

- `atualizar.py`: rotina de embutimento e correção do painel.
- `acervo-conversao.js`: regras de conversão do acervo para a estrutura operacional.
- `acervo-dados.js`: sincronização com os dados do acervo e do repositório de processos.
- `magistrados.js`: suporte de busca por magistrado.

## Observação

A estrutura antiga foi mantida para compatibilidade. O centro do painel fica aqui, mas a lógica vinculada ao acervo segue centralizada em `acervo/`.
