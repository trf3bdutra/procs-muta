# Caput / Cognitio — integridade da triagem
Registro de decisões e propostas de 28/11/2026. Documento de trabalho; não constitui alteração do software ou validação de processos.

## Diretrizes acordadas
- Uma ficha única por CNJ; acervo fonte do PJe separado dos registros operacionais. Importar por conciliação, com backup e simulação prévios; preservar trabalho, vínculos e histórico.
- Caput/Cognitio: mesma interface, leitura por padrão para usuários autorizados, edição mediante autenticação e permissão. Cortex de uso exclusivo da gestão. Não abrir dados internos/sigilosos a acesso público nem disparar notificações ou ampliar permissões nesta etapa.
- Registrar separadamente última movimentação PJe, última extração, última verificação efetiva da triagem e última alteração da ficha. Importar não equivale a verificar.
- Retiradas e adiamentos retornam à triagem para reconferência; preservar sessão, item, motivo, data e análise anterior. Sem repautamento automático.
- PJe é fonte principal das minutas; Corretor é ferramenta de comparação. Preservar minutas não salvas no PJe. Não criar gerenciador paralelo de versões nesta etapa.

## Achados da inspeção estática
Arquivo caput/triagem/index.html:
- atTri: qualquer um dos campos Síntese Fática, Tema, Próxima ação ou Alegações basta para o indicador "com prontuário". Não prova triagem completa.
- temTriC/nTriados: existência de objeto triagem, prontuario_triagem ou teor não vazio no lote determina contagem; critério distinto da ficha.
- pendDe: pendências inferidas das etiquetas. Ausência de etiqueta não comprova regularidade.
- funilTriagem: destino confirmado entra no grupo mono/sessão mesmo com pendências; categorias prontas podem ser inferidas de etiquetas. Risco de confundir destino com aptidão.
- destinoAtual: seleção prévia tem precedência sobre destino Monocrática quando ambos coexistem; risco de conflito oculto.

## Proposta de saneamento (a validar)
Reutilizar campos existentes. Separar situação da análise (não iniciada, parcial, verificada, reconferir), regularidade/pendências e destino sugerido/confirmado. Classificar como pronta somente quando os requisitos aplicáveis foram efetivamente examinados e não há impedimento ao ato proposto; distinguir ato saneador/urgente de julgamento terminativo. Uma pendência deve indicar motivo, evidência e próxima ação. Campo vazio não equivale a não se aplica. Registrar responsável, data, documentos consultados e justificativa da confirmação/alteração; preservar valores anteriores. Contadores derivados da mesma regra e universo de CNJs únicos. Validar conflitos e ausência de destino sem corrigir silenciosamente. A gestão confirma o destino; propostas automatizadas não são decisão final.
Testes mínimos: ficha apenas com tema; pendência sem etiqueta; destino com pendência; novo documento após triagem; retirada/adiamento; dois destinos incompatíveis; atualização fonte sem perda do trabalho; contadores coincidentes; acesso sem autorização. Dados reais e PJe ainda não auditados integralmente.

## Conferência material dos requisitos — representação processual
Diretriz indicada pela gestão: existência de documento não equivale à sua validade ou suficiência jurídica. Em Representação, registrar o ID do instrumento, a conclusão fundamentada da conferência e a eventual providência, utilizando os campos existentes de peças, representação e pendências. Verificar outorgante, advogado, assinatura ou forma válida de outorga, poderes pertinentes ao ato, substabelecimentos e eventual revogação. A assinatura eletrônica deve ser examinada conforme o regime aplicável, sem exigir automaticamente ICP-Brasil. Procuração particular contendo apenas impressão digital, sem outros elementos de outorga regular, não pode ser marcada automaticamente como regular; sinalizar a deficiência e conferir a forma de regularização admissível conforme orientação do Relator e legislação aplicável. Se a assinatura ou a imagem não foi examinada (inclusive PDF digitalizado sem texto), marcar não verificado/a conferir, nunca presumir regularidade. Não inferir analfabetismo apenas da digital. Se confirmada irregularidade, registrar a providência de saneamento cabível, sem presumir desde logo inadmissibilidade definitiva. Aplicar a mesma distinção entre documento localizado, examinado e suficiente ao preparo, tempestividade, contraditório, MPF e demais requisitos. Teste obrigatório: procuração localizada com mera digital, outra sem assinatura e outra não legível não podem gerar regularidade automática.
