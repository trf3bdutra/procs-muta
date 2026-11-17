# Rotinas pela API do Claude (Claude Console)

Três rotinas automáticas sobre material público ou do próprio gabinete. Nenhuma lê autos.

| Rotina | Quando | O que faz | Saída |
|---|---|---|---|
| `radar.py` | segunda, 06h17 | Busca na web o que mudou na semana em temas do STF e do STJ, súmulas, Manual de Cálculos e legislação. Cruza cada tema com os modelos, os módulos da matriz, os parágrafos-padrão e os catálogos da LIA que o citam. | `relatorios/radar/AAAA-MM-DD.md` |
| `auditoria.py` | dia 1, 07h43 | Conta em Python os desvios da lista de caça (ementas, votos e monocráticas) do mês anterior e dos três meses antes. Separa exemplos e pede ao modelo só a leitura das tendências e as sugestões. | `relatorios/auditoria/AAAA-MM.md` |
| `indice.py` | sábado, 04h23 | Indexa os julgados da série em lote (matéria, assunto, questão, tese, resultado, temas, súmulas, dispositivos). Monta o índice por tema e um ementário por matéria, e confere as possíveis divergências internas. | `precedentes/indice-ia/` |

Horários de Cuiabá. Quem agenda é o GitHub Actions (`.github/workflows/console.yml`), e o resultado entra no repositório com um commit "Console: …".

## Configuração (uma vez)

1. No **Claude Console**, crie uma chave da API e defina um limite de gasto mensal.
2. No GitHub, em **trf3bdutra/procs-muta › Settings › Secrets and variables › Actions**, crie o segredo `ANTHROPIC_API_KEY` com essa chave.
3. Em **Actions › Rotinas pela API do Claude › Run workflow**, rode cada rotina uma vez à mão para conferir.

Sem o segredo, as execuções agendadas só registram um aviso.

## Modelos

| Variável | Padrão | Usada em |
|---|---|---|
| `CONSOLE_MODELO_FORTE` | `claude-opus-5-5` | radar e análise da auditoria |
| `CONSOLE_MODELO` | `claude-sonnet-5-5` | conferência das divergências |
| `CONSOLE_MODELO_LEVE` | `claude-haiku-5-5` | extração do índice, em lote |

## Índice do banco

- Vai à API só o julgado novo ou com a ementa alterada. O cache fica em `extracoes.jsonl.gz`.
- Cada execução manda no máximo `--limite` julgados (padrão 3.000), dos mais recentes para os mais antigos.
- O padrão cobre os últimos 5 anos: cerca de 15.700 julgados. Em cerca de seis semanas o índice fica completo; para acelerar, rode à mão com `--limite 8000`.
- A extração usa a Message Batches API, mais barata e assíncrona. A execução espera o lote terminar.
- Divergências:
  - candidatas são pares de acórdãos com a mesma questão e teses diferentes;
  - o modelo confere até `--divergencias` pares por execução (padrão 30);
  - a decisão de cada par fica guardada e não é paga de novo;
  - a leitura é sobre teses resumidas, então tudo sai marcado [VALIDAR].
- `--so-indices` refaz `temas.json` e os ementários sem chamar a API.

## Rodar no computador

```bash
pip install anthropic
export ANTHROPIC_API_KEY=...
cd scripts/console
python3 auditoria.py --mes 2026-10 --ensaio   # só a contagem, sem API
python3 radar.py --ensaio                     # lista dos temas vigiados, sem API
python3 indice.py --ensaio                    # quantos julgados iriam à API
python3 radar.py && python3 auditoria.py && python3 indice.py --limite 200
```

Estas rotinas substituem as tarefas agendadas do Claude "Radar de precedentes vinculantes" e "Auditoria mensal do padrão Muta", que estão pausadas.
