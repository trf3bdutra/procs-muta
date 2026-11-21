# scripts/triagem

Ferramentas usadas na extração dos autos e no registro da triagem. O procedimento completo está em `padrao/extracao-e-registro-da-triagem.md`.

Atenção: os scripts foram escritos na área de trabalho da sessão e guardam os caminhos dela:

- `/home/claude/procs-muta/` para o repositório;
- `/home/claude/work/` para os blocos `blkNN.py` e a pasta `out/`.

Ajuste as constantes `R`, `REPO` e os caminhos de `out/` antes de usar em outro lugar.

| Arquivo | Função |
|---|---|
| `mx3_receptor_app_v4.js` | Receptor `window.AP`, colado na aba do app (`/api/painel?lote=1`). Monta a fila e grava os autos. Traz embutido o mapa de autos já gravados e a lista `SKIPX`. |
| `mx3_ponte_v3.js` | Ponte `window.MX3`, colada na aba do visualizador pdf.js do PJe (`…/pdfjs/web/viewer.html#ponte`). A versão 4 em uso (MAXDOCS = 900 e limpeza do iframe dos autos) foi colada na aba e ainda não está salva aqui. |
| `tlib.py` | `mk(d)`: registro de triagem → item do lote e campos da ficha. |
| `tl2.py` | Atalhos `R` (agravo), `RM` (remessa) e `AP` (apelação) para escrever os blocos. |
| `montar.py` | `python3 montar.py blkNN` → `out/blkNN_lote.json` e `out/blkNN_ficha.json`. |
| `aplicar.py` | `python3 aplicar.py blkNN <lote>`: mescla no lote com a regra da ação `itens`. |
| `situacao.py` | Situação atual conferida nos autos (`--aplicar` grava no lote). |
| `ficha_tri.py` | Preenche, na ficha única, o prontuário de triagem do Caput: só campos vazios ou gerados. |
| `fx.js` | `FX.enviar(lista)`, colado na aba do app: grava os campos da ficha por `/api/pauta?ficha=1`. |
| `js.py`, `envio.py` | Geram as cargas de lote e de ficha para gravar pela aba do app. |
| `ler.py`, `ler2.py`, `doc.py`, `ap.py`, `visao.py`, `rm.py` | Leitura dos autos para a triagem. `rm.py` depende do índice de precedentes `prec.pkl`, que fica fora do repositório. |
