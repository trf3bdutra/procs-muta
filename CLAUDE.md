# Regras para sessões que editam este repositório

Várias sessões trabalham ao mesmo tempo neste repositório. Para não apagar o trabalho umas das outras:

- Antes de editar um arquivo, rode `git pull --rebase` e edite a versão atual. Nunca grave por cima um arquivo com uma cópia guardada antes (de outra pasta, do /tmp ou de uma leitura antiga).
- Em conflito de rebase, junte as duas versões; não descarte a do outro lado.
- Antes de enviar mudanças em `apoio/ex-officio/lotes/previa.html` (o Collectio em /amicus/collectio/) ou em `apoio/ex-officio/api/_lote.js`, rode em `apoio/ex-officio`:
  `node --test tests/collectio-previa.test.js tests/collectio-matriz.test.js`.
  A publicação na Vercel roda esses testes e para se algum falhar.
- O Collectio tem, entre outras coisas: coleções Pauta, Monocrática, Interlocutória, Despacho e Avulsas; versão final pelo Ementário quando não há versão importada; layout da mesa de trabalho com coluna esquerda minimizável (`?layout=antigo` volta ao anterior); modo `?caput=1` para a triagem do Caput. Não remova nada disso sem pedido do gestor.
- Extensão Muta (`extensao/`): a versão 0.11 (abas Prontuário, Minuta, Ementário, Parágrafos-padrão e Diretrizes; prontuário único com Processo, Triagem e Produção) está sendo montada por outra sessão a pedido do gestor (21/11/2026). Até ela sair, não edite `extensao/` sem antes conferir no `git log` o que mudou e juntar as duas versões.
