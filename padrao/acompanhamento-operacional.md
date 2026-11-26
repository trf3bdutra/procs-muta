# Acompanhamento operacional no Prontuário HERO

A aba de acompanhamento do cartão de etapas consolida o mapa de próximos passos (`origem.Mapa de próximos passos`), pendências e intercorrências da ficha e controles de monitoramento. É uma projeção local, sem criar tarefas ou alterar a situação do julgamento.

O mapa existente admite dois atributos opcionais por passo: `responsavel` e `prazo` (AAAA-MM-DD). Ausência não atribui automaticamente o servidor do processo nem inventa prazo. Edição registra valores anteriores e atuais no histórico existente. A interface disponibiliza a equipe ao gestor e o próprio usuário (ou responsável já registrado) aos demais editores. Não cria nova regra de autorização no servidor: permanece a permissão do campo do mapa. A data de previsão de retirada de sobrestamento é apresentada como data de acompanhamento, não prazo processual fatal.

A visão diferencia passos concluídos, disponíveis, condicionados, aguardando anterior e vínculos a conferir. Pendências vinculadas ao mapa não aparecem novamente na lista de pendências sem vínculo. Controles apenas abertos para consulta não são considerados ativos por esse motivo. Datas passadas são sinais de acompanhamento; não equivalem a descumprimento de prazo legal.

Limitações: o mapa ainda é gravado como JSON completo, sujeito às regras existentes de concorrência da ficha. Não há sincronização automática de cada passo com o quadro de diligências, nem notificações externas por vencimento. Homologação em navegador e publicação pendentes.