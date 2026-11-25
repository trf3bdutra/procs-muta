#!/usr/bin/env python3
"""Monta a prévia do painel da extensão Muta (/extensao/previa/).

A prévia é o painel de verdade, com os mesmos arquivos da extensão (extensao/), num quadro ao lado de um PJe
simulado (scripts/extensao/previa/index.html). Só duas coisas mudam no painel.html copiado:
  - antes dos scripts do painel entra o shim.js, que faz o papel do Chrome (aba do PJe, leitura do editor e dos autos,
    bloqueio das gravações);
  - depois do comum.js, o endereço do site passa a ser o da própria página (mesmo login, sem depender de www).

Uso: python3 scripts/extensao/previa.py --saida site/public/extensao/previa
"""
import argparse
import pathlib
import shutil
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
EXT = RAIZ / 'extensao'
AQUI = pathlib.Path(__file__).resolve().parent / 'previa'


def montar(saida: pathlib.Path) -> None:
    painel = saida / 'painel'
    if painel.exists():
        shutil.rmtree(painel)
    painel.mkdir(parents=True)
    for f in EXT.iterdir():
        if f.is_file() and f.suffix in ('.js', '.css', '.html', '.json'):
            shutil.copy2(f, painel / f.name)
    for sub in ('icones', 'vendor'):
        if (EXT / sub).is_dir():
            shutil.copytree(EXT / sub, painel / sub)
    shutil.copy2(AQUI / 'shim.js', painel / 'shim-previa.js')

    html = (painel / 'painel.html').read_text(encoding='utf-8')
    primeiro = html.find('<script src="')
    if primeiro < 0:
        sys.exit('painel.html sem <script src=…>: a prévia não sabe onde pôr o shim.')
    html = html[:primeiro] + '<script src="shim-previa.js"></script>\n' + html[primeiro:]
    comum = '<script src="comum.js"></script>'
    if comum not in html:
        sys.exit('painel.html sem comum.js: a prévia não sabe onde trocar o endereço do site.')
    html = html.replace(comum, comum + '\n<script>/* prévia: o site é o da própria página */ if (window.Muta) Muta.SITE = location.origin;</script>', 1)
    (painel / 'painel.html').write_text(html, encoding='utf-8')

    shutil.copy2(AQUI / 'index.html', saida / 'index.html')
    shutil.copy2(AQUI / 'pje-shim.js', saida / 'pje-shim.js')
    shutil.copy2(AQUI / 'universal.html', saida / 'universal.html')
    shutil.copy2(RAIZ / 'padrao' / 'ficha.json', saida / 'universal-ficha.json')


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--saida', required=True, type=pathlib.Path)
    a = ap.parse_args()
    a.saida.mkdir(parents=True, exist_ok=True)
    montar(a.saida)
    print('prévia do painel em', a.saida)


if __name__ == '__main__':
    main()
