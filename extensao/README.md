# Extensão Muta · painel lateral ao lado do PJe

Extensão do Chrome/Edge (Manifest V3) que abre o **Muta** num painel lateral, ao lado dos autos no PJe 2º grau do TRF-3.
Base: o HTML independente *muta-independente-prontuario-completo* (Prontuário + Acervo).

## O que faz

O painel lê o número CNJ do processo aberto na aba do PJe e acompanha esse processo em todas as abas.
"Acompanhar o PJe" desligado congela o processo aberto; a lista no topo reabre qualquer prontuário salvo.

- **Ficha do gabinete (Prontuário › Ficha do gabinete).** A ficha única do processo da Ex Officio
  (`padrao/ficha.json` → `acervo/operacional.json`), com o login da equipe (cookie `cmt_eq` do site; quem já entrou no
  Ex Officio no mesmo Chrome entra direto). Abas Processo, Triagem, Produção, Controles especiais e Pauta, no padrão do
  prontuário lateral da Ex Officio; o que se altera é gravado na hora por `POST /api/pauta?ficha=1`, com as mesmas
  regras do servidor (designação só do gestor; o que tem correspondência no cartão da pauta vai junto).
- **Rascunho pessoal (Prontuário › Rascunho pessoal).** O prontuário completo da versão independente, um por processo,
  guardado só no navegador (chave: os 20 dígitos do número). Liga-se à ficha por dois botões:
  *Enviar o rascunho à ficha* (grava os campos correspondentes, com confirmação que lista o que muda) e
  *Trazer da ficha* (preenche só os campos vazios do rascunho, inclusive classe, partes e assunto do acervo).
  A correspondência de campos está em `MAPA`, no `gabinete.js`.
- **Lote.** Procura o processo nos lotes do Amicus Curiae · Index (`/api/painel?lote=1`) e mostra o perfil no lote:
  tipo de caso, resultado, modelo, variações, peculiaridades da equipe e do Relator, MPF, peças (ID copiável),
  ajustes da correção, pendências e a minuta do lote por seção, com cópia. A gestão continua no Index.
- **Ementário do Compêndio.** A antiga aba Acervo agora busca na mesma base do Ementário do Compêndio:
  o ementário curado (`precedentes/precedentes.jsonl`) e a série histórica do Relator (`precedentes/jurisprudencia`),
  sem repetição. A sintaxe de busca é a do Compêndio (E, OU, "frase", -excluir, radical\*), em dois modos:
  índice (número, classe, órgão, ementa, resultado e catalogação) e texto integral (ementa e inteiro teor).
  Cada julgado pode ser vinculado ao prontuário do processo.
- **Só leitura no PJe.** O `conteudo-pje.js` apenas lê o número do processo na tela; não clica, não grava e não envia
  nada ao tribunal. Em telas com vários números (listas de tarefas), não informa nada.

## Arquivos

```
manifest.json      MV3: painel lateral, permissões sidePanel e storage, acesso a www.gabinete-cmt.com (dados e API)
fundo.js           service worker: ícone abre o painel; guarda o processo de cada aba (chrome.storage.session)
conteudo-pje.js    lê o número CNJ na página do PJe (pje2g.trf3.jus.br)
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

## Pendências

- [VALIDAR] Leitura do número nos autos reais do PJe2g: o critério (título, cabeçalho ou número único na tela) foi
  testado só em páginas simuladas. Se o painel não reconhecer o processo, ajustar os seletores em `CABECALHOS`
  (`conteudo-pje.js`).
- [VALIDAR] Política de instalação de extensões nos computadores do TRF-3.
