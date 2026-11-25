# Cognitio
Cópia da interface de Triagem do Caput na rota /cognitio/, preservando os componentes originais. O motor e os ativos comuns continuam em /init/; o repositório e a ficha são únicos.

- Acervo: Visão geral + Busca geral, universo inicial completo.
- Triagem: painel operacional, tarefas, coleções institucionais, grupos e séries, com escaninhos excluídos.
- Seleção Prévia: matriz de seleção, excluindo processos identificados na pauta correspondente.
- Monocráticas e Outras Decisões: recortes da ficha, usando a matriz e o prontuário originais. A espécie ambígua fica em Tipo a confirmar; nenhum lote é criado por esses recortes.
- Chefia: importação e administração permanecem no Caput. Etiquetas: editor original, para o gestor.
- Autenticação: /api/login, cookie cmt_eq e ponte de acesso Office. Não usa token pessoal nem aceita cmt_tri como substituição. Mantém os perfis do servidor.

Validação: node --test cognitio/tests/cognitio.test.js. O deploy publica uma rota adicional e não substitui o Caput. A validação em navegador autenticado e a extensão do fluxo de acompanhamento/retornos e do Prontuário Universal devem ser feitas antes de retirar a Triagem original.
