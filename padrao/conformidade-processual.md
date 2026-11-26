# Conformidade jurídico-processual integrada (HERO)

Motor puro: `extensao/conformidade-motor.js`, função `conferirFluxo(ficha, texto)`. Fontes: campos canônicos de questões jurídicas individualizadas, recursos, resultado por recurso, dispositivo do pronunciamento e metadados de vínculos de fundamentação. Usa a posição disponível da ficha na extensão (incluindo edição pendente); não consulta autos remotamente nem homologa o pronunciamento.

- Gerador: conferência estrutural dos registros, sem inferir lacuna textual quando não há texto efetivo. Corretor: acrescenta apontamentos à matriz existente quando o CNJ do editor corresponde ao prontuário, não há erro de leitura e o contexto está liberado. Texto colado ou processo divergente recebe somente análise textual geral.
- Questões: delimitação, conferência, solução/fundamentação, ID de recurso e repercussão no dispositivo. Busca de termos é indício de possível ausência, não verificação semântica nem prova de enfrentamento.
- Resultado: associação por ID da ficha e menção inequívoca ao recorrente/ID no texto; comparação de vocabulário de provimento, desprovimento, provimento parcial, não conhecimento e prejudicialidade. Outros resultados e ambiguidades exigem análise humana. Não reduzir múltiplos recursos a resultado único. Não corrige o dispositivo automaticamente.
- Vínculos: identidade conservadora da questão, estado declarado, CNJ de precedente e referência normativa literal quando identificáveis. Não comprova adoção, autenticidade, vigência, pertinência ou reprodução de modelo/parágrafo. Não cruza automaticamente comandos complexos nem todas as formas de citação.
- Não bloqueia liberação ou assinatura; apontamentos orientam revisão. Nenhuma mudança nas permissões da equipe, nem novo armazenamento de texto do editor.
- Testes simulados e sintáticos, homologação em navegador e publicação a confirmar.
