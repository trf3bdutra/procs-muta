# Agente de conferência final · 28,86%

Confere as minutas de 28,86% montadas pela matriz modular antes de irem ao PJe. Roda pela API do Claude, com a chave do Claude Console.

## Fluxo

1. **LIA:** gera o prontuário do caso. Importe o prontuário no Ex Officio.
2. **Compendium › Consulta:** abra o processo (botão ◈ do Office ou sessão e item). A matriz monta a minuta. Clique em **Pacote para conferência**: é baixado um `conf-2886_<sessão>_item<n>_<processo>.json`.
3. **Agente:** rode o script sobre os pacotes da pauta:

```bash
pip install anthropic
export ANTHROPIC_API_KEY=...                  # chave do Claude Console
python3 scripts/conferencia-2886/conferir.py ~/Downloads/conf-2886_2026-12-07_*.json
```

4. Abra `relatorio.md` na pasta criada. A ordem é **refazer → ajustar → pronta**. Em cada processo há o quadro local | problema | correção | natureza | criticidade e as pendências [VALIDAR].

## Opções

| Opção | Efeito |
|---|---|
| `--lote` | Usa a Message Batches API: metade do custo; o script espera o lote terminar. Bom para a pauta inteira. |
| `--texto` | Pede também a minuta inteira já corrigida (`casos/item<n>_<processo>_minuta.txt`). Mais lento e mais caro. |
| `--modelo` | Padrão `claude-sonnet-5-5`. Para a conferência mais rigorosa, use `claude-opus-5-5`. |
| `--paralelo N` | Quantos processos ao mesmo tempo, fora do lote (padrão 4). |
| `--ensaio` | Não chama a API. Lista os pacotes e grava o prompt montado, para conferir o que seria enviado. |

## O que o agente confere

As regras completas estão em `SISTEMA.md`. Em resumo:

- enquadramento no grupo pela árvore e caso fora do lote;
- resultado: dispositivo, ementa e acórdão contra o `resJulg` do prontuário;
- módulos com suporte no prontuário e pedidos sem módulo;
- IDs contra as peças;
- relatório: exequente, sentença, acessórios, razões, contrarrazões e MPF;
- honorários: Tema 1.059/STJ e gratuidade;
- ementa no padrão do gabinete;
- forma.

O agente não muda o resultado, não reescreve texto do acervo (só aponta adaptação de gênero, número, ID ou nome) e não inventa fato nem precedente. O que depende dos autos vem como [VALIDAR].

O prompt do sistema junta três fontes, sempre lidas do repositório na hora de rodar:

- `SISTEMA.md`;
- `padrao/lia/Material_Gabinete_2886.txt`;
- o catálogo de `modelos/matrizes-2886.json`.

Atualizada a matriz, o agente acompanha. O prompt do sistema fica em cache: da segunda minuta em diante, só o pacote é cobrado inteiro.

## Cuidado

O pacote leva a minuta e o prontuário, que contêm dados do processo, para a API da Anthropic. Antes de usar, confirme que isso é permitido pelas regras do tribunal sobre uso de IA.
