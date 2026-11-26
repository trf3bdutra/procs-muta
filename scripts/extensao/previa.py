#!/usr/bin/env python3
"""Monta os ambientes HERO a partir da interface universal canônica.
A extensão instalada usa a montagem limpa. A prévia e o ambiente web
aplicam somente os adaptadores próprios depois da montagem.

Uso: python3 scripts/extensao/previa.py --saida site/public/extensao/previa
"""
import argparse
import pathlib
import re
import shutil
import sys
import manual_canhoto

RAIZ = pathlib.Path(__file__).resolve().parents[2]
EXT = RAIZ / 'extensao'
AQUI = pathlib.Path(__file__).resolve().parent / 'previa'


def origem_local(html: str) -> str:
    """Mantém o login e as APIs na origem do ambiente web/preview."""
    comum = '<script src="comum.js"></script>'
    if comum not in html:
        sys.exit('painel.html sem comum.js: a prévia não sabe onde trocar o endereço do site.')
    html = html.replace(comum, comum + '\n<script>/* prévia: o site é o da própria página */ if (window.Muta) Muta.SITE = location.origin;</script>', 1)
    return html


def adaptar_previa(html: str) -> str:
    """O shim existe apenas na prévia, antes dos scripts do painel."""
    primeiro = html.find('<script src="')
    if primeiro < 0:
        sys.exit('painel.html sem <script src=…>: a prévia não sabe onde pôr o shim.')
    html = html[:primeiro] + '<script src="shim-previa.js"></script>\n<script>window.MUTA_PREVIA = true;</script>\n' + html[primeiro:]
    return origem_local(html)


def montar_universal(painel: pathlib.Path) -> str:
    """Monta a interface canônica sem shim, scripts inline ou configuração web."""
    manual_canhoto.montar(painel)
    html = (painel / 'painel.html').read_text(encoding='utf-8')
    # Mesmo painel, mesmos scripts e abas: somente o renderizador do cartão recebe um adaptador.
    fonte = (painel / 'gabinete.js').read_text(encoding='utf-8')
    ancora = 'aplicarModo();\n})();'
    if fonte.count(ancora) != 1:
        sys.exit('gabinete.js: ponto de integração da prévia ausente')
    overlay = (AQUI / 'universal-layout.js').read_text(encoding='utf-8')
    # Painel Julgamento (acórdão e monocrática, pelo pronunciamento): depois do adaptador, no mesmo ponto.
    overlay += '\n' + (AQUI / 'universal-julgamento.js').read_text(encoding='utf-8')
    # Acompanhamento no alto da Triagem; sinalizações numa janela móvel; registro no acervo em Autuação.
    overlay += '\n' + (AQUI / 'universal-triagem.js').read_text(encoding='utf-8')
    overlay += '\n' + (AQUI / 'universal-matriz.js').read_text(encoding='utf-8')
    # 0.73: organização (rótulos das sinalizações, Solicitações só com o que há, atalho para a aba Autos).
    overlay += '\n' + (AQUI / 'universal-organizacao.js').read_text(encoding='utf-8')
    (painel / 'gabinete-universal.js').write_text(fonte.replace(ancora, overlay + '\n' + ancora, 1), encoding='utf-8')
    # Compatibilidade dos caminhos públicos: o roteiro agora é uma única fonte.
    shutil.copy2(painel / 'roteiro.js', painel / 'roteiro-universal.js')
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
    ferramentas = ('acervo', 'pauta', 'dil', 'urg', 'del')
    processo = ('processo', 'pront', 'min')
    if not all(k in itens for k in ferramentas + processo):
        sys.exit('painel.html: abas principais da prévia não encontradas')
    itens['min'] = itens['min'].replace('<b>Minuta ', '<b>Minutário ', 1).replace('Editor × padrão', 'Elaboração e revisão', 1)
    # Uma faixa de abas: processo à esquerda, ferramentas após o divisor.
    ordem = processo + ferramentas
    resto = ''.join(v for k, v in itens.items() if k not in ordem)
    conteudo = '<div class="pv-nav-row" id="pv-nav-main">' + ''.join(itens[k] for k in processo) + '<span class="pv-nav-divider" aria-hidden="true"></span>' + ''.join(itens[k] for k in ferramentas) + '</div>' + resto
    universal = universal[:nav.start()] + nav.group(1) + conteudo + nav.group(3) + universal[nav.end():]
    universal = universal.replace('<div class="nav-label">PRODUÇÃO</div>', '', 1)
    universal = universal.replace('aria-label="Parte da aba Minuta"', 'aria-label="Parte do Minutário"', 1)
    # Ajustes independentes do HTML reconstruído por faixaUsuario().
    universal = universal.replace('<span class="tu-st" id="tu-st"', '<button type="button" id="pv-ajustes" class="tu-b" hidden tabindex="-1" title="Ajustes" aria-label="Ajustes" aria-haspopup="dialog" aria-controls="pv-ajustes-dialog"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M4.9 19.1 7 17m10-10 2.1-2.1"/><circle cx="12" cy="12" r="7"/></svg></button><span class="tu-st" id="tu-st"', 1)
    universal = universal.replace('</body>', '<script src="universal-ajustes.js"></script>\n</body>', 1)
    shutil.copy2(AQUI / 'universal-ajustes.js', painel / 'universal-ajustes.js')
    if 'shim-previa.js' in universal or 'MUTA_PREVIA = true;' in universal or re.search(r'<script\b(?![^>]*\bsrc\s*=)[^>]*>', universal, re.I):
        sys.exit('universal.html: adaptador de demonstração ou script inline na interface canônica')
    (painel / 'universal.html').write_text(universal, encoding='utf-8')
    return universal


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
    universal = montar_universal(painel)
    html = (painel / 'painel.html').read_text(encoding='utf-8')
    (painel / 'painel.html').write_text(adaptar_previa(html), encoding='utf-8')
    (painel / 'universal.html').write_text(adaptar_previa(universal), encoding='utf-8')
    shutil.copy2(AQUI / 'shim.js', painel / 'shim-previa.js')
    shutil.copy2(AQUI / 'index.html', saida / 'index.html')
    shutil.copy2(AQUI / 'pje-shim.js', saida / 'pje-shim.js')
    # O site parte diretamente da interface canônica; nunca da prévia.
    web = origem_local(universal)
    web = web.replace('<script src="sincronia.js"></script>', '', 1)
    web = web.replace('<script src="alertas.js"></script>', '', 1)
    web = web.replace('<script src="tema.js"></script>', '<script src="web-bootstrap.js"></script>\n<script src="tema.js"></script>', 1)
    web = web.replace('</head>', '<link rel="stylesheet" href="web.css">\n</head>', 1)
    web = web.replace('<div id="gab" class="gab"></div>', '<p class="web-aviso">Ficha única do Office · leitura direta dos autos e inserção no PJe somente na extensão instalada.</p><div id="gab" class="gab"></div>', 1)
    if 'MUTA_PREVIA = true' in web or 'shim-previa.js' in web:
        sys.exit('web.html: ambiente demonstrativo não permitido')
    (painel / 'web.html').write_text(web, encoding='utf-8')
    for arq in ('web-bootstrap.js', 'web.css', 'prontuario-host.js'):
        shutil.copy2(AQUI / arq, painel / arq)
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
