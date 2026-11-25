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
import re
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
    # Mesmo painel, mesmos scripts e abas: somente o renderizador do cartão recebe um adaptador.
    fonte = (painel / 'gabinete.js').read_text(encoding='utf-8')
    ancora = 'aplicarModo();\n})();'
    if fonte.count(ancora) != 1:
        sys.exit('gabinete.js: ponto de integração da prévia ausente')
    overlay = (AQUI / 'universal-layout.js').read_text(encoding='utf-8')
    (painel / 'gabinete-universal.js').write_text(fonte.replace(ancora, overlay + '\n' + ancora, 1), encoding='utf-8')
    # Ganchos de apresentação do roteiro, sem modificar as regras nem os estados dos passos.
    roteiro = (painel / 'roteiro.js').read_text(encoding='utf-8')
    if "      if (DOC_RT[alvo] && !mostrados[alvo])" not in roteiro:
        sys.exit('roteiro.js: gancho de referências documentais não encontrado')
    if "        if (ab) {\n          var mais =" not in roteiro:
        sys.exit('roteiro.js: gancho de referências documentais não encontrado')
    roteiro = roteiro.replace("      if (DOC_RT[alvo] && !mostrados[alvo])", "      if (X.docOwned && X.docOwned(alvo)) { mostrados[alvo] = 1; return ''; }\n      if (DOC_RT[alvo] && !mostrados[alvo])", 1)
    roteiro = roteiro.replace("        if (ab) {\n          var mais =", "        if (X.docRef) h += X.docRef(p.id);\n        if (ab) {\n          var mais =", 1)
    (painel / 'roteiro-universal.js').write_text(roteiro, encoding='utf-8')
    shutil.copy2(AQUI / 'universal-layout.css', painel / 'universal-layout.css')
    universal = html.replace('<script src="gabinete.js"></script>', '<script src="gabinete-universal.js"></script>', 1)
    if universal == html:
        sys.exit('painel.html: gabinete.js não encontrado')
    universal = universal.replace('<script src="roteiro.js"></script>', '<script src="roteiro-universal.js"></script>', 1)
    universal = universal.replace('</head>', '<link rel="stylesheet" href="universal-layout.css">\n</head>', 1)
    # A navegação conserva todos os IDs e painéis originais, inclusive as abas
    # ocultas por permissão ou acessadas por atalhos. Só agrupa a apresentação.
    nav = re.search(r'(<div class="nav" role="tablist"[^>]*>)([\s\S]*?)(</div>)', universal)
    if not nav:
        sys.exit('painel.html: navegador principal não encontrado')
    itens = {m.group(1): m.group(0) for m in re.finditer(r'<button\b[^>]*\bid="tab-([^"]+)"[^>]*>[\s\S]*?</button>', nav.group(2))}
    ferramentas = ('acervo', 'pauta', 'dil', 'del')
    processo = ('pront', 'min')
    if not all(k in itens for k in ferramentas + processo):
        sys.exit('painel.html: abas principais da prévia não encontradas')
    itens['min'] = itens['min'].replace('<b>Minuta ', '<b>Minutário ', 1).replace('Editor × padrão', 'Elaboração e revisão', 1)
    def grupo(id, titulo, chaves):
        return ('<div class="pv-nav-group" role="group" aria-label="' + titulo + '" id="' + id + '">'
                '<span class="pv-nav-label">' + titulo + '</span><div class="pv-nav-row">' +
                ''.join(itens[k] for k in chaves) + '</div></div>')
    resto = ''.join(v for k, v in itens.items() if k not in ferramentas + processo)
    conteudo = grupo('pv-nav-tools', 'Ferramentas do gabinete', ferramentas) + grupo('pv-nav-case', 'Processo em tela', processo) + resto
    universal = universal[:nav.start()] + nav.group(1) + conteudo + nav.group(3) + universal[nav.end():]
    universal = universal.replace('<div class="nav-label">PRODUÇÃO</div>', '', 1)
    universal = universal.replace('aria-label="Parte da aba Minuta"', 'aria-label="Parte do Minutário"', 1)
    (painel / 'universal.html').write_text(universal, encoding='utf-8')
    for antigo in ('universal.html', 'universal-ficha.json'):
        (saida / antigo).unlink(missing_ok=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--saida', required=True, type=pathlib.Path)
    a = ap.parse_args()
    a.saida.mkdir(parents=True, exist_ok=True)
    montar(a.saida)
    print('prévia do painel em', a.saida)


if __name__ == '__main__':
    main()
