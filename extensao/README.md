# Extensão Muta · painel lateral ao lado do PJe

Extensão do Chrome/Edge (Manifest V3) que abre o **Muta** num painel lateral, ao lado dos autos e das tarefas do PJe 2º grau do TRF-3.
Base: o HTML independente *muta-independente-prontuario-completo* (Prontuário + Acervo).

## O que faz (0.8)

O painel lê o número CNJ do processo aberto no PJe e acompanha esse processo em todas as abas. Ele lê tanto os autos digitais
(número no título) quanto o painel de tarefas do PJe, que é carregado num quadro de `frontend-pje.app.trf3.jus.br`
(número no cabeçalho da tarefa, “ApCiv 5001289-76.2023.4.03.6006 - [Sessão] Aguardando a sessão”).
"Acompanhar o PJe" desligado congela o processo aberto; a lista no topo reabre qualquer prontuário salvo.

- **Prontuário completo, no GitHub.** O prontuário de cada processo fica em `acervo/prontuarios/<20 dígitos>.json` e se
  alimenta, nos dois sentidos, da ficha do processo (`acervo/operacional.json`) e do cartão da pauta (`acervo/sessoes/*.json`,
  o prontuário da Ex Officio e da LIA). Ao abrir o processo, o que a equipe registrou entra no prontuário (preenche o vazio;
  substitui o divergente se foi gravado depois do prontuário); cada alteração vai ao GitHub alguns segundos depois, num só
  commit com os campos correspondentes da ficha e do cartão (`POST /api/pauta?prontuario=1`, ver `apoio/ex-officio/api/_prontuario.js`).
  Duas pessoas editando ao mesmo tempo: as versões se juntam campo a campo (vale o que cada uma mudou). Sem login ou sem
  conexão, o prontuário segue neste navegador e sincroniza depois. Correspondências: `MAPA` (ficha) em `gabinete.js` e
  `CART` (cartão) em `sincronia.js`.
- **Ficha do gabinete.** A ficha única do processo da Ex Officio (`padrao/ficha.json` → `acervo/operacional.json`), com o login
  da equipe (cookie `cmt_eq`), gravada por `POST /api/pauta?ficha=1`.
- **Comparar.** O texto do editor da minuta no PJe (ou colado) contra: a minuta do lote (Collectio); os modelos do banco
  (sugeridos pela semelhança); as minutas-matriz por recurso e resultado; a matriz modular e os acórdãos-modelo do 28,86%;
  os parágrafos-padrão; os precedentes do Ementário (vinculados ao prontuário ou pelo botão “Comparar com o editor”); ou
  texto colado. Parágrafos alinhados por LCS e pareados pela semelhança; palavra a palavra dentro do par. Trechos a preencher
  do modelo (`{{…}}`, `[PREENCHER]`) valem como vagas: o texto do editor que os ocupa aparece em amarelo. Motor em `comparador.js`.
- **Conformidade (ativável).** Confere a minuta do editor com o padrão do gabinete: estrutura das peças (Manual CMT),
  ementa CNJ 154/2024 adaptada (seções, numeração contínua, “saber se”, sem ID, rodapé), resultado coerente entre dispositivo,
  ementa, cabeçalho, acórdão e prontuário, verbo do resultado pela classe, honorários recursais (Tema 1.059/STJ), IDʼs da
  minuta contra as peças do prontuário e do cartão, pendências (`{{ }}`, `[VALIDAR]`), regras de redação do Compendium
  (`apoio/diretrizes.json`), alertas do Manual (`apoio/vade-mecum.json`) e a lista de caça do gabinete. Transcrições ficam
  fora das regras de redação. Com “Conformidade ativa”, relê o editor a cada 4 segundos e refaz a análise quando o texto
  muda; o número de alertas altos e médios aparece na aba. Motor em `conformidade-motor.js` (função pura, com testes).
- **Lote.** A minuta do processo nos lotes do Amicus Curiae · Collectio, com o perfil do processo e a comparação de sempre.
- **Ementário do Compêndio.** Busca nos precedentes curados e na série histórica do Relator (sintaxe do Compêndio).
- **Só leitura no PJe.** O `conteudo-pje.js` lê o número do processo e, a pedido do painel, o texto do editor (parágrafos,
  classe, recuo, negrito e itálico). Não clica, não grava e não envia nada ao tribunal.

## Arquivos

```
manifest.json      MV3: painel lateral, permissões sidePanel e storage, acesso a www.gabinete-cmt.com (dados e API);
                   lê pje2g.trf3.jus.br e frontend-pje.app.trf3.jus.br (painel de tarefas), em todos os quadros
fundo.js           service worker: ícone abre o painel; junta o que cada quadro da aba vê (o mais forte e mais recente)
conteudo-pje.js    lê o número CNJ (título, cabeçalho da tarefa, número único) e o texto do editor da minuta
sincronia.js       prontuário ↔ GitHub (acervo/prontuarios), ficha e cartão da pauta
comparador.js      motor de comparação de textos (também usado nos testes)
fontes.js          materiais do gabinete publicados em /extensao/dados/base.json.gz (scripts/extensao/dados.py)
editor.js          leitura do editor do PJe compartilhada pelas abas Comparar e Conformidade (e leitura automática)
comparar.js        aba Comparar
conformidade-motor.js  regras da conformidade (função pura, com testes)
conformidade.js    aba Conformidade
painel.html/.css   painel (Prontuário, Ementário, Ajuda)
comum.js           site, download com gzip, diálogo de confirmação, número CNJ
prontuario.js      estado e gravação do prontuário, por processo (localStorage da extensão)
ficha.js           rascunho pessoal: ficha completa (análise guiada, julgamento, ciclo da minuta)
sessao.js          login do Ex Officio (/api/login) e chamadas à API do site
gabinete.js        ficha do gabinete (Ex Officio) e correspondência rascunho ↔ ficha
lote.js            aba Lote (Amicus Curiae · Index)
ementario.js       busca no Ementário do Compêndio
pje.js             painel acompanha o processo da aba ativa
icones/            ícones 16, 32, 48 e 128
```

## Dados lidos do site (públicos)

Publicados pelo workflow `.github/workflows/vercel-monitor.yml` em `https://www.gabinete-cmt.com/jurisprudencia/`:

| Arquivo | Origem |
| --- | --- |
| `curados.json.gz`, `curados-texto.json.gz` | `scripts/jurisprudencia/gerar_curados.py` (precedentes curados e inteiros teores) |
| `indice.json.gz` | série histórica resumida (`precedentes/jurisprudencia/indice.json.gz`) |
| `busca/indice.json`, `busca/A-AAAA.txt.gz`, `busca/M-AAAA.txt.gz` | `scripts/jurisprudencia/gerar_busca.py` |

## Instalação

O mesmo workflow publica o pacote em `https://www.gabinete-cmt.com/extensao/muta-pje.zip`.

1. Extraia o ZIP numa pasta permanente.
2. `chrome://extensions` › Modo do desenvolvedor › Carregar sem compactação › pasta com o `manifest.json`.
3. Fixe o ícone do Muta e abra-o com os autos na tela.

Para atualizar: extraia o ZIP novo sobre a mesma pasta e clique em Recarregar no cartão da extensão.
Não remova a extensão para atualizar: isso apaga os prontuários guardados nela.

## Testes

`node --test apoio/ex-officio/tests/extensao-muta.test.js apoio/ex-officio/tests/prontuario-extensao.test.js`
(motor de comparação, conformidade, leitura do cabeçalho da tarefa, pacote de dados e a API do prontuário com o GitHub simulado).

## Pendências

- [VALIDAR] Leitura no PJe2g real depois da 0.8: o painel de tarefas vem de `frontend-pje.app.trf3.jus.br` (conferido em
  19/11/2026) e a tarefa aberta de `pje2g.trf3.jus.br/pje/Processo/movimentar.seam`, num quadro dentro dele. Se o painel
  não reconhecer o processo, ajustar `RE_TAREFA`/`CABECALHOS`; se não ler o editor, ajustar `editores()` (`conteudo-pje.js`).
- [VALIDAR] Classes de estilo do editor do PJe (parágrafo sem recuo, citação): a conformidade usa o recuo e o negrito/itálico
  calculados; se o PJe marcar a citação por classe própria, incluí-la em `cita`.
- [VALIDAR] Política de instalação de extensões nos computadores do TRF-3.
