# procs-muta · base do Gabinete do Des. Fed. Carlos Muta

Base de dados do gabinete do Desembargador Federal Carlos Muta (Turma Regional de Mato Grosso do Sul, TRF3), no padrão 1.0 do gabcmt.

## Estrutura

```
acervo/                        processos em tramitação no gabinete
  fonte.json · fonte.csv       acervo fonte: o acervo atual, atualizado pelo DataJud e pelas planilhas do PJe e do Power BI
  operacional.json             dados operacionais de cada processo, inclusive as passagens por pauta (sessão, item e resultado)
  sessoes/                     calendario.json (calendário de sessões) e um arquivo por sessão (AAAA-MM-DD.json)
  datajud/                     estado da sincronização e relatórios de cada coleta

precedentes/                   processos já julgados pelo relator
  precedentes.jsonl            ementário: 1 julgamento por linha (1.844), com curadoria e catalogação
  inteiros-teores/2026.jsonl   texto integral (relatório, voto, ementa, acórdão), ligado pelo id
  catalogo-cmt/                catálogo CMT: acórdãos publicados do relator, por assunto e tema (comece por INDICE.md)

modelos/                       tudo o que é modelo de texto
  modelos.json                 voto-padrão, voto-matriz, decisão, despacho (202)
  paragrafos.json              parágrafos-padrão (120)

apoio/                         recursos de apoio à redação
  diretrizes.json              vocabulário, conectivos, preferências, correções, alertas
  magistrados.json             cadastro de magistrados (TRF3 e 1º grau)
  assuntos.json                assuntos (TPU/CNJ) e temas
  repertorio.json              repertório jurisprudencial e normativo (campo categoria: jurisprudencia | Lei, Código…)
  usos-repertorio.json · .csv  em quais precedentes cada item do Vade Mecum é citado (gerado)
  vade-mecum/                  Vade Mecum CMT (HTML), com os usos automáticos embutidos

padrao/                        regras técnicas da base
  esquema.json                 formato obrigatório de cada arquivo
  manifesto.json               versão, contagem e hash de cada arquivo (gerado)
  paradigmas.js                biblioteca de leitura (navegador e Node)

gerar.py                       valida a base, atualiza o manifesto e importa exportações dos apps
scripts/                       rotinas auxiliares (DataJud, catálogo, modelos-matriz, apps)
cmt-monitor.html               CMT-monitor: acervo, sessões de julgamento, designação e regras
construtor.html · index.html   apps (ver observação abaixo)
```

## Uso

```
python3 gerar.py                         valida tudo e atualiza padrao/manifesto.json
python3 gerar.py --importar A.json …     mescla exportações dos apps por id e valida
python3 scripts/repertorio/vincular.py apoio/vade-mecum/Vade_Mecum_CMT.html --html
                                         localiza nos precedentes os temas, súmulas, julgados e artigos
                                         do Vade Mecum e atualiza os usos (JSON, CSV e o próprio HTML)
```

Nada é apagado na importação. O que vem de fora só entra se passar no esquema.

## Automação

- `.github/workflows/base.yml`: a cada alteração em `precedentes/`, `modelos/`, `apoio/` ou `padrao/`, valida a base e atualiza o manifesto.
- `.github/workflows/datajud-acervo.yml`: coleta o DataJud, atualiza `acervo/` e grava o relatório.

## Identificadores

Precedente: `acd-<20 dígitos do processo>-<AAAAMMDD do julgamento>-<espécie>` (ex.: `acd-50003247020244036004-20260928-ap`; `ed` para embargos de declaração). O id antigo (`par-…`) fica em `idAnterior`.

## Observação sobre os apps

O **CMT-monitor** (`cmt-monitor.html`, antigo Painel Central) lê e grava nesta base, com um token do GitHub com permissão *Contents* (leitura e gravação):

- lê `acervo/fonte.json`, o acervo fonte (DataJud e planilhas) e `apoio/assuntos.json` (seção e ramo de cada assunto);
- grava o calendário de sessões (datas, hora e marcos) em `acervo/sessoes/calendario.json` e a pauta de cada sessão (item, quem minuta, quem corrige e as datas de minuta, correção e liberação) em `acervo/sessoes/AAAA-MM-DD.json`;
- grava as regras em `apoio/regras/etiquetas.json` (conversão de etiquetas) e `apoio/regras/designacao.json` (critérios de designação e correção), e a equipe em `apoio/equipe.json`; as regras de impedimento e suspeição ficam em `apoio/regras/impedimentos.json` (sem CPF);
- tudo vai num único commit pelo botão "Gravar no procs-muta"; até lá, o trabalho fica no navegador.

`construtor.html` e `index.html` ainda leem e gravam no repositório `brndutra/gabcmt`, com a estrutura antiga de pastas.
