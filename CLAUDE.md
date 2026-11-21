# Regras para sessões que editam este repositório

Várias sessões trabalham ao mesmo tempo neste repositório. Para não apagar o trabalho umas das outras:

- Antes de editar um arquivo, rode `git pull --rebase` e edite a versão atual. Nunca grave por cima um arquivo com uma cópia guardada antes (de outra pasta, do /tmp ou de uma leitura antiga).
- Em conflito de rebase, junte as duas versões; não descarte a do outro lado.
- Antes de enviar mudanças em `apoio/ex-officio/lotes/previa.html` (o Collectio em /amicus/collectio/) ou em `apoio/ex-officio/api/_lote.js`, rode em `apoio/ex-officio`:
  `node --test tests/collectio-previa.test.js tests/collectio-matriz.test.js`.
  A publicação na Vercel roda esses testes e para se algum falhar.
- O Collectio tem, entre outras coisas: coleções Pauta, Monocrática, Interlocutória, Despacho e Avulsas; versão final pelo Ementário quando não há versão importada; layout da mesa de trabalho com coluna esquerda minimizável (`?layout=antigo` volta ao anterior); modo `?caput=1` para a triagem do Caput. Não remova nada disso sem pedido do gestor.
- Extensão HERO18810, antes Muta (`extensao/`; nome visível HERO18810, identificadores internos `Muta*` mantidos), versão 0.20 (Gerador em `gerador.js`; selos na lista de tarefas do PJe, catálogo de etiquetas do gabinete em `padrao/etiquetas-gabinete.json`, prazos e alertas em `etiquetas.js`, `alertas.js` e `fundo.js`; cabeçalho, etapas, sinalizações e notas no formato da gaveta da pauta; tema escuro padrão em `tema.js`; OCR local em `vendor/tesseract` + `ocr.js`; Roteiro por tipo de julgamento em `roteiro.js`): abas Prontuário (Processo, Autos, Roteiro, Gerador; o tipo de ato fica no cartão do processo), Minuta (Lote + Comparar + Conformidade), Ementário, Parágrafos-padrão e Diretrizes. `extensao/padrao-*.js` são cópias de `padrao/`: ao mudar um, copie para o outro (há teste). Não remova abas nem funções sem pedido do gestor.
