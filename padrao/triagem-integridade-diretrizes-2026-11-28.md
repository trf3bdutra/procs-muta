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


## Política de preenchimento e exibição condicional — acordada em 28/11/2026

A ficha única e os apelidos existentes são o contrato; não duplicar campos. Para cada campo, especificar fonte, autorização de preenchimento, necessidade de conferência, permissão de edição, condição de exibição e obrigatoriedade contextual. Quatro perfis: (1) extração objetiva automática; (2) sugestão automática sujeita à conferência; (3) conclusão humana; (4) decisão reservada à gestão. Sem IA como requisito para preenchimento. Todo valor extraído na ficha deve admitir correção autorizada; preservar a fonte bruta e a identidade CNJ, utilizando correção operacional auditada. Nova extração divergente não sobrescreve correção ou validação humana; sinaliza divergência. Registrar origem, valor anterior/novo, responsável e data. Cálculos e registros históricos permanecem derivados/auditáveis, não são campos de livre alteração.

### Matriz inicial de condições (chaves existentes em padrao/ficha.json)
| Controlador | Condição | Campos dependentes / exigência contextual |
|---|---|---|
| triagem.Tipo de Julgamento | Contém Embargos de declaração, Agravo interno ou Juízo de retratação | Grupos específicos já declarados com quando/contem_tipo; conferir execução em todas as telas. |
| triagem.Representação | Irregular – intimar ou Não verificado | Observação da Representação e, se localizada, ID da Procuração/Procurações; indicar deficiência ou motivo de não verificação. Se irregular, O que falta sanar e Próxima ação. |
| triagem.Preparo | Justiça gratuita / Gratuidade pedida no recurso | Preparo - ID AJG, Preparo - Situação AJG; fundamento e providência conforme o caso. |
| triagem.Preparo | Isento (ente público/MP), Assistência da DPU ou Não se aplica | Preparo - Fundamento dispensa; não exigir comprovantes de recolhimento. |
| triagem.Preparo | Recolhimento informado ou em conferência | Preparo por recurso, IDs, tipo de comprovante, conferência STN, vinculação, valores e datas conforme disponíveis; localização não equivale a comprovação. |
| triagem.Preparo - Regularização | Providência aplicável | ID intimação, prazo e cumprimento conforme a etapa; ausência de intimação não impede registrar pendência. |
| triagem.Tempestividade | Recurso sujeito a prazo | Tempestividade por recurso, publicação, protocolo, prazo legal, dobro e suspensões aplicáveis; não exigir dados inexistentes para registrar Não verificado. |
| triagem.MPF | Com parecer | ID do Parecer MPF, MPF - Data e Parecer - Sentido; se Outro, Parecer - Sentido (outro). |
| triagem.MPF | Vista a abrir / Aguardando parecer / Intimado sem manifestação | Observação MPF, hipótese de atuação e próxima ação quando necessária. |
| triagem.Cabimento recursal / Instrução recursal / Dialeticidade / Inovação recursal | Irregularidade, questão ou dúvida pertinente | Respectivos campos existentes de fundamento, pendências ou pontos. |

Condições controlam apresentação e validação, nunca apagam valores anteriores. Campos preenchidos fora da condição devem permanecer recuperáveis e indicar possível conflito; não contar como pendência ativa sem pertinência. Campo vazio, não verificado e não se aplica são estados diferentes. Exigir fundamentos/documentos para concluir triagem quando aplicáveis, não para salvar rascunho. Não inferir aptidão nem destino confirmado por mera presença de campos. Textos-padrão editáveis reutilizam apelidos existentes e só são aplicados quando acionados/confirmados pelo servidor.

Achado confirmado na inspeção: ficha.json é gerado por scripts/ficha/gerar_ficha.py e contém grupos condicionais para ED, AgInt e retratação, além de apelidos e campos detalhados de preparo, representação e MPF. A rastreabilidade já distingue campos editáveis e calculados. A matriz acima é especificação inicial; implementar no gerador, consumidores web/extensão e validação da API, com testes de alternância sem perda, permissão, reimportação divergente e múltiplos recursos. Não afirmar cobertura integral nem publicação antes da homologação.
