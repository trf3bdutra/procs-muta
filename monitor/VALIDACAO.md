# Verificação da refatoração — Ab Initio

Data: 15/11/2026 · Base: `cmt-monitor (1).html` fornecido pelo usuário.

## Validado em ambiente local sem credenciais

- A edição HTML portátil inicializou com `CMTShell`, `CMTMotor`, `__painelCentralComponent`, `CMTFichaMonitor` e `CMTSessao`, sem erro JavaScript.
- Navegação para Acervo Central, Triagem, Pautas e Equipe foi exercitada por Playwright.
- O diálogo Base do Acervo abriu nas abas Situação, Importar/Atualizar e Conexão; seus seis controles de arquivo foram encontrados.
- Relatório PJe inválido foi rejeitado com diagnóstico de coluna ausente; complemento inválido sem acervo prévio também foi rejeitado. Nenhuma dessas verificações realizou commit remoto.
- Simulação da conexão confirmou chamada única para atualizar após validação do token. O token usado no teste é fictício e não foi exportado.
- As regras de uma sessão foram alteradas independentemente; outra sessão e as regras gerais permaneceram inalteradas, com persistência do override no estado da sessão.
- Foram analisados estaticamente todos os 39 scripts JS extraídos e verificados todos os caminhos locais referenciados no HTML modular.
- Os módulos extraídos foram reintegrados apenas em memória para teste de inicialização, mantendo a ordem de scripts do pacote: shell, motor, repositório, ficha, importadores e sessões carregaram sem erros JavaScript.

## Não validado em ambiente real

- Autenticação real com token autorizado no repositório privado `trf3bdutra/procs-muta`.
- Commits concorrentes e proteção contra conflitos entre navegadores diferentes.
- Importação real de planilhas PJe/Power BI de todas as variantes, importação de PDF, sincronização com documentos reais e salvamento simultâneo de sessões.
- Publicação na Vercel, login por servidor, permissões e comportamento multiusuário autenticado.

**Não houve alteração ou publicação no repositório GitHub.** Este pacote é para testes e integração controlada, não é certificado para produção. Preserve o original até concluir homologação.

## Como executar

1. Extraia o ZIP.
2. Acesse a pasta `monitor/` em terminal.
3. Execute `python -m http.server 8000` e abra `http://localhost:8000/`.
4. Use **Base do Acervo** para conectar e consultar. As credenciais não são fornecidas.
5. Em homologação, compare uma amostra de processos entre o `procs-muta` e os módulos do gestor antes de efetuar gravações.

Para a Vercel, copie `index.html`, `assets/` e `motor/` juntos para a rota `/monitor/`. Não substitua `/hub` nem publique o HTML modular sem os assets.
