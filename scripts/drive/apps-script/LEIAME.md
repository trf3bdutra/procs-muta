# Planilhas do Google ⇄ Ex Officio (Apps Script)

`Codigo.gs` liga as planilhas do Drive ao app, nos dois sentidos:

- **planilha → app**: cada célula editada vai ao app na hora (gatilho "ao editar" de cada arquivo);
- **app → planilha**: a cada minuto, todos os dias, o script pergunta ao app se o repositório mudou; se mudou, grava só as células diferentes. Célula editada há menos de 2,5 minutos não é sobrescrita.

Arquivos ligados: pautas (um por bimestre na pasta *CMT - Pautas de Julgamento*, uma aba por sessão, molde Controle de Pauta),
*Monocráticas — Gabinete CMT* (uma aba por mês) e *Controles especiais — Gabinete CMT* (Metas, Sobrestados, Casos sensíveis).
Sessão nova ganha aba no arquivo do bimestre; bimestre novo ganha arquivo (cópia do modelo) e o gatilho de edição dele.

O que volta ao app (cabeçalho → campo): na pauta, Detalhes (com `#SO`/`#Pref`), Etapa, Minutado em, Servidor, Revisor, admissibilidade
(Intervenção e Parecer MPF, Preliminares, Tempestividade, Preparo, Representação, Mídias), Resultado, Consectários, Honorários,
Tópico-síntese, Desfecho e Intercorrência; nas monocráticas, Tipo de ato, Hipótese art. 932, Detalhes, Etapa, datas, Servidor, Revisor,
Resultado, Honorários, Tópico-síntese e Intercorrência; nos controles, as colunas de acompanhamento (controle, providência, prazo,
responsável, observação, motivo, tema, situação, previsão, categoria, quadro, decisão, cumprimento, verificações).
As demais colunas (processo, classe, assunto, tarefa, pendências, apreciação…) são do app: editadas na planilha, voltam ao valor do app.

Quem grava aparece no app como **Planilha Google**. A planilha é ferramenta do gestor: por ela também se designa servidor e revisor
e se registra o desfecho. Compartilhe as planilhas com edição só com quem pode fazer isso.

O lado do app é `apoio/ex-officio/api/_planilha.js` (rota `/api/pauta?planilha=1`), autenticado pelo token `CMT_PLANILHA_TOKEN`.

## Instalação (uma vez)

1. **Vercel** (projeto da Ex Officio) › Settings › Environment Variables: `CMT_PLANILHA_TOKEN` = um texto aleatório
   de 32+ caracteres (Production). Fazer um novo deploy para valer.
2. **script.google.com** › Novo projeto › nome "Planilhas ⇄ Ex Officio". Apagar o conteúdo de `Código.gs` e colar `Codigo.gs`.
3. **Configurações do projeto** (engrenagem): fuso horário *(GMT-04:00) Cuiabá*; em *Propriedades do script*, adicionar
   `CMT_TOKEN` com o mesmo valor do passo 1.
4. No editor, escolher a função **instalar** e clicar em **Executar**. Autorizar com a conta dona das planilhas
   (aviso "o Google não verificou este app": *Avançado* › *Acessar*). A primeira sincronização roda em seguida.

Para parar: executar `desinstalar` (apaga os gatilhos). Os registros de execução ficam em *Execuções*, no menu do projeto.
Com o script ativo, a tarefa agendada diária (`scripts/drive/LEIAME.md`) fica desnecessária.
