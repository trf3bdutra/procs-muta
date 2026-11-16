# Ab Initio · Gestor de Acervo e Pautas

Esta é uma refatoração do `cmt-monitor.html` fornecido (15/11/2026), sem troca de banco ou supressão de controles.

## Execução

- `index.html` é a aplicação modular. Abra em um servidor HTTP da pasta `monitor/`, por exemplo `python -m http.server 8000` e acesse `http://localhost:8000/`.
- Publicado em `/monitor/` pelo workflow `vercel-monitor.yml`, que copia `index.html`, `assets/` e `motor/` juntos. O endereço sem barra final (`/monitor`) é redirecionado para `/monitor/`, porque os caminhos são relativos.
- `/motor/index.html` contém o núcleo original de Acervo, Triagem, Sessões, Equipe e suas integrações.

## Mapa dos módulos preservados

- Gestor do acervo: indicadores, panorama, escaninhos, busca avançada, filtros, lista integral, planilhas, importação PJe/Power BI, exportações e fichas.
- Triagem: bandeja, escaninhos, classificação, etiquetas, prontuário, seleção prévia e transferência de processos.
- Sessões: calendário, marcos, pré-pauta, importação de PDF, pauta definitiva, Excel, relatórios, minutas, correções, liberação e histórico.
- Equipe: cadastro, papéis, preferências, histórico, designação, ausências, solicitações e avisos.
- Integrações: `trf3bdutra/procs-muta`, arquivos `acervo/`, `apoio/`, `padrao/`, sessão/monocrática e ficha única.

## Pautas: esteira da sessão

- A aba Pautas abre a sessão escolhida na esteira de 5 etapas (`assets/js/87-esteira-pautas.js` e `assets/css/87-esteira-pautas.css`): seleção prévia, pauta oficial, preparar (A · regras de etiquetas, B · designação e correção), publicar (com a conferência final da pauta contra o acervo fonte) e painel da sessão.
- No topo: título da sessão, julgadores (`apoio/magistrados.json`), quadro de marcos e os botões Exportar (planilha de controle .xlsx, pauta simplificada .doc ou PDF, lista .txt, estatísticas .csv, copiar a lista) e Configurações (regras, calendário, produtividade, sessão e equipe).
- A Equipe deixou de ser aba própria: fica nas Configurações, com atalho para o cadastro completo.
- As ações que gravam usam os comandos que já existiam (importar PDF, marcos, designação, regras). Publicar à equipe e aplicar as conversões de etiquetas ficam desativados até validação.

## Base do Acervo: diálogo reparado

- A Base abre um diálogo independente com Situação, Importar/Atualizar e Conexão.
- Os importadores específicos PJe, Power BI e sigilosos usam `runImport()` do motor original, incluindo os validadores e o registro de importação.
- Os importadores de relatório local e planilhas complementares usam as funções originais (sem o envio automático para a API `GabCMT` legada).
- Importações não são confundidas com persistência remota: a origem do repositório continua `acervo/fonte.json`, e não há sobreposição silenciosa de arquivos.
- Atualizar do repositório chama `CMTAcervoDados.puxar()` e informa os erros de conexão; sem token a janela explica como conectar.
- O código não move `.dp-src` entre containers e não fica mais com uma caixa vazia em “carregando…”.
- Ao conectar, tenta imediatamente atualizar os registros remotos, mostrando falha de leitura sem confundi-la com falha de autenticação.

## Entregas por etapa

- **Etapa 1:** diálogo Base do Acervo e importadores independentes do painel anterior.
- **Etapa 2:** regras gerais e overrides independentes por sessão; conferência dos fluxos de Triagem, Sessões e Equipe.
- **Etapa 3:** pacote modular que preserva a ordem do código original e suas integrações. Para a verificação técnica detalhada, consulte `VALIDACAO.md`.

## Alterações verificáveis

1. Motor antes embutido como base64/gzip em um JS de 1,6 MB agora tem documentos e scripts separados, com nomes por função.
2. Scripts e CSS do shell foram separados sem alterar ordem de execução.
3. Tela de regras de designação passa a oferecer escopo geral e personalização independente por sessão; o override fica no JSON da sessão e não em `apoio/regras/designacao.json`.
4. `CMTFichaMonitor.gravar()` tem fila por documento para impedir gravações simultâneas do mesmo `operacional.json` na mesma aba, com releitura imediata antes da edição.
5. A inicialização não falha silenciosamente após o prazo de carregamento, e a aba Monitor foi identificada como Gestor de acervo.

## Limitações de validação

O código preserva o acesso pelo token GitHub conforme o arquivo de origem, sem incorporar credenciais. Acesso remoto, gravação real, importação de PDF e edição concorrente entre navegadores devem ser validados autenticados no ambiente de homologação. **Não há garantia de transações multiusuário atômicas** para escritas no mesmo JSON; a fila nova protege apenas operações da mesma aba.

A exportação modular exige que todos os arquivos da pasta sejam servidos na mesma origem. Não substitua diretamente o `cmt-monitor.html` do workflow antigo sem adaptar a cópia de assets/motor.

## Nome do aplicativo

O nome exibido é **Ab Initio**, inclusive nas telas do motor e nos diálogos. As integrações `CMT*`, caminhos `cmt-*`, o repositório `trf3bdutra/procs-muta` e a rota `/monitor` foram preservados para compatibilidade.
