# HERO — preparação do redesign v53

Referência visual: protótipo v53 aprovado na conversa. Base: extensão real 0.73.6. Não copiar o estado demonstrativo do HTML. Esta branch é de preparação; não está homologada nem publicada.

## Alterações preparadas

- Prontuário: navegação Resumo / Autos / Triagem / Produção. Perfil e Pauta e julgamento integrados ao Resumo. Reutilização dos campos e handlers reais. Sínteses e questões destacadas, sinalizações, monitoramento e mapa de próximos passos.
- Encaminhamento: controles reais na Triagem, nota e proposta em diálogos, confirmação do art. 932 preservada. Não modificar os códigos de destino da ficha.
- Autos: cobertura construída pelo leitor real e referências da ficha; inteiro teor gravado somente quando há confirmação no estado do leitor. O histórico do acervo entre sessões requer validação adicional.
- Produção: Gerador real montado na subaba, em vez da página Corretor.
- Corretor: seletor de pronunciamento, editor e referência em sequência, busca de referência recolhível, comparação e conformidade usando os motores atuais. Expansão interna da conformidade. Remoção da fonte 28,86% da seleção visual, não do acervo.
- Pauta: sessão e subabas no cabeçalho, contadores calculados dos processos reais, tags de designação e lista de alertas existente.
- Deliberações: rótulo Urgências, Sustentações e ações atuais. A lista recebida pela extensão é de urgências já encaminhadas à assinatura; ainda não é um inventário de todas as urgências.
- Diretrizes: aba própria com o manual existente. Estilos compactos escopados ao novo layout.

## Contratos que não podem ser quebrados

- padrao/ficha.json e API de ficha: seções e chaves existentes, permissões, persistência e sugestões de leitura.
- origem.Mapa de próximos passos: formato JSON existente, vinculação às pendências, histórico e estados.
- origem.Notas fixadas, triagem.Questões destacadas, triagem.Síntese Fática e triagem.Síntese Processual: manter os valores registrados.
- triagem.COMPLEXIDADE: manter Ω/Α/Σ e a semântica do sistema. Não inventar gradações.
- producao.Destino e producao.Art. 932 - Confirmação: manter o fluxo jurídico e a validação.
- Leitura, OCR, sigilo e inteiro teor: somente funções reais de autos.js; nenhum conteúdo de outro CNJ.
- Gerador e Minuta-Matriz: usar gerador.js, compendium e modelos reais; não substituir por texto simulado.
- Pauta: sessões, etapas e solicitações da API atual; não fabricar datas ou registros.
- Diligências e Deliberações: preservar autorização e ações do servidor. Só apresentar comando de assinatura para registros efetivamente prontos.

## Pendências antes de publicar

1. Homologar no navegador com autenticação e dados reais (não efetuar gravações de teste em processos reais sem ambiente próprio).
2. Consolidar Autos: Peças principais / Cronologia, atributos por documento, vínculos ID na Documentação do caso e ausência de campos duplicados, incluindo sentença. Verificar inteiro teor já gravado em sessões anteriores.
3. Validar todas as ramificações da Minuta-Matriz e o preenchimento compartilhado da ficha; revisar escopos e campos duplicados.
4. Conferir visual e comportamento do Prontuário, incluindo cores originais da complexidade, atalhos de Ficha, área de sigilo, menu de perfil, sinalizações e preservação de foco/edição.
5. Completar Repertório: cabeçalhos, busca banco inteiro, relacionados ao processo e ao editor; preservar resultados e vínculos reais.
6. Completar marcos da sessão e agrupamentos/solicitações de Pauta a partir dos campos reais da API.
7. Localizar ou ampliar a fonte autorizada de urgências para incluir as ainda não minutadas, separando-as das decisões disponíveis para assinatura. Não inferir que toda urgência está pronta.
8. Testar layout estreito, tema escuro e navegação por teclado, comparação com modelo e precedente, texto colado, geração, OCR, leitura e troca de processo, gravação com erro, permissões, navegação e atualização.
9. Rodar regressões existentes, corrigir falhas, revisar diff e só então preparar release/manifest e merge.

## Verificações executadas nesta preparação

- Análise de sintaxe dos nove arquivos JavaScript alterados (compilação sem execução).
- Verificação de IDs estáticos duplicados em painel.html: nenhum.
- Verificação do host do Gerador: presente no código de Produção, removido do HTML do Corretor.

Não houve execução funcional em navegador, testes autenticados ou homologação de integração. Manifesto e main permanecem inalterados.
