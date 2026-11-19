# monitor/ · motor e páginas do gabinete

O Ab Initio antigo (`index.html` com Acervo Central, Base do gabinete e Configurações) foi aposentado em 16/11/2026.
`/init` agora só redireciona para a Triagem.

- `triagem/index.html` — Triagem (`/triagem/`): fila de triagem, Atualizar acervo fonte, Regras gerais, ficha.
  Indicador de monocrática (Ver › Monocrática, facetas do rail, selo na lista e seção 0 do prontuário de triagem):
  lê `acervo/triagem/perfil-monocraticas.json` (scripts/triagem/perfil_monocraticas.py) e soma os sinais do processo.
- Pautas (`/pautas/`): aba da Triagem (`triagem/index.html`); a rota da Vercel leva `/pautas/` à Triagem já na aba Pautas.
- `motor/` — motor de dados (iframe oculto, `/init/motor/index.html`): leitura e gravação no procs-muta (ProcsMuta),
  acervo, sessões, equipe e regras. Usado pela Triagem e pelas Pautas.
- `assets/` — só o que as páginas compartilham: `js/cmt-ficha.js` e `js/cmt-ficha-monitor.js` (ficha única do processo),
  `css/95-ficha-unica.css` e `js/regras-gerais.js` (diálogo Regras gerais).
- `index.html` — redirecionamento de `/init` para `/triagem/`.

Publicação: `.github/workflows/vercel-monitor.yml`.
