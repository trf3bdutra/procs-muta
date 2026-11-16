# Publicação sem remover /hub

Copie todo o conteúdo desta pasta (index.html, assets/, motor/) para `site/public/monitor/`.
A raiz `/` e `/hub` devem continuar servidas pelo aplicativo da equipe (não pelo monitor).

Exemplo para a etapa de montagem de Vercel:

```bash
mkdir -p site/public/monitor
cp -R monitor/index.html monitor/assets monitor/motor site/public/monitor/
```

Não publique apenas `index.html`: o motor e os JS/CSS externos são necessários.
O workflow `.github/workflows/vercel-monitor.yml` já faz essa cópia.
