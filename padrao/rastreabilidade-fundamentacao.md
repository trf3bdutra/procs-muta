# Rastreabilidade da fundamentação — HERO

Registro incremental no operacional: `producao._fundamentacaoVinculos`. Metadado interno, não integra os apelidos da minuta-matriz nem o formulário genérico. Consulta e gravação autenticadas por `POST /api/pauta?ficha=1`, corpo `{cnj, vinculoFundamentacao: {acao: "listar"|"vincular"|"situacao", ...}}`.

- Vínculo exige questão individualizada registrada (ordem, texto e ID do recurso correspondentes de forma inequívoca). Não há ID estável de questão no modelo atual; alteração dessa identidade sinaliza vínculo desatualizado e bloqueia adoção até novo vínculo. Não há reatribuição por índice.
- Tipos: Precedente, Parágrafo, Modelo e Dispositivo legal. Grava referência, título, ID, autoria e data, não inteiro teor nem texto do banco. Material manual e metadados enviados pelo cliente não são validados quanto à vigência ou autenticidade jurídica.
- Estado inicial Pesquisa. Adoção exige declaração de utilização em Fundamentação, Dispositivo ou Ambos. Descartado conserva histórico. Adoção não altera os campos de fundamentação, solução e dispositivo nem comprova inserção no pronunciamento final.
- Controle concorrente por versão do vínculo, revalidação da questão a cada tentativa de commit. Limite de 150 vínculos e 20 registros anteriores por vínculo. Vínculos são mantidos após exclusão da questão para rastreabilidade; não contam como questão atual.
- Não grava rascunhos persistentes de vínculos; confirmação expressa da API. Contexto sigiloso ou não identificado no acervo é bloqueado, independentemente de autorização para leitura dos autos. A interface somente leitura não apresenta comandos de edição.
- Validação em navegador autenticado, publicação, conferência jurídica e comparação automática com a minuta final ainda pendentes.
