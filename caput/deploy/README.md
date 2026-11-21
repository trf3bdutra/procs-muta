# Publicação sem remover /office

Copie todo o conteúdo desta pasta (index.html, assets/, motor/) para `site/public/monitor/`.
A raiz `/` leva ao `/office/` (aplicativo da equipe, Ex Officio); `/hub` e `/equipe` redirecionam para lá. Essas regras ficam nas Rotas do projeto, no painel da Vercel, e valem antes do `vercel.json`; `/monitor` também é reescrito ali para `/monitor/index.html`.

Exemplo para a etapa de montagem de Vercel:

```bash
mkdir -p site/public/monitor
cp -R caput/index.html caput/assets caput/motor site/public/monitor/
```

Não publique apenas `index.html`: o motor e os JS/CSS externos são necessários.
O workflow `.github/workflows/vercel-caput.yml` já faz essa cópia.
