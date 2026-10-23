#!/usr/bin/env python3
"""Atualiza o construtor.html para o padrão 1.0 (idempotente).

Uso: python3 scripts/construtor/atualizar.py [construtor.html]

  1. embute a biblioteca comum padrao/paradigmas.js (script#paradigmas-lib), logo antes do módulo de fonte;
  2. troca o módulo de fonte (script#gh-fonte) por scripts/construtor/gh-fonte.js: lê paradigmas/ e referencias/
     pela biblioteca (com volta a banco/ se a base nova falhar), não lê o GitHub quando servido pelo Replit (cópia
     própria) e grava as alterações direto no formato do padrão 1.0.
Rode de novo sempre que a biblioteca ou o módulo mudarem, ou quando o Replit exportar um construtor.html novo.
"""
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent


def script(id_, codigo):
    return f'<script id="{id_}">\n' + codigo.replace("</script", "<\\/script") + "\n</script>"


def atualizar(html):
    lib = script("paradigmas-lib", (RAIZ / "padrao/paradigmas.js").read_text(encoding="utf-8"))
    fonte = script("gh-fonte", (AQUI / "gh-fonte.js").read_text(encoding="utf-8").strip())
    html = re.sub(r'<script id="paradigmas-lib">.*?</script>\n?', "", html, flags=re.S)
    m = re.search(r'<script id="gh-fonte">.*?</script>', html, re.S)
    if not m:
        raise SystemExit("construtor.html sem script#gh-fonte")
    return html[:m.start()] + lib + "\n" + fonte + html[m.end():]


if __name__ == "__main__":
    alvo = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "construtor.html"
    html = atualizar(alvo.read_text(encoding="utf-8"))
    alvo.write_text(html, encoding="utf-8")
    print(f"{alvo}: {len(html):,} caracteres")
