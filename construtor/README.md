# Estrutura do Construtor

Esta pasta centraliza tudo que pertence ao Construtor de Minutas.

## Organização proposta

- `atualizar.py`: reaproveita a rotina de atualização do módulo do construtor.
- `gh-fonte.js`: módulo de fonte do construtor embutido pelo `atualizar.py`.
- Os dados e bibliotecas compartilhados continuam sob `paradigmas/`, `referencias/`, `padrao/` e `banco/`, mas a lógica do constringutor fica agrupada aqui.

## Observação

A estrutura original do repositório foi preservada para compatibilidade com a infraestrutura atual. A pasta `construtor/` funciona como centro do app, sem quebrar referências antigas.
