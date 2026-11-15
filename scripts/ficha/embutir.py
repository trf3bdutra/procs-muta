#!/usr/bin/env python3
"""Embute a ficha única (padrao/ficha-dialogo.js + .css) nos dois HTML que a usam: o CMT-monitor (cmt-monitor.html, no documento
de fora, não no motor) e a Pauta da equipe (apoio/pauta-equipe/index.html). Fonte única: edite os arquivos de padrao/ e rode
   python3 scripts/ficha/embutir.py
O monitor recebe também o adaptador (padrao/ficha-adaptador-monitor.js). O bloco fica entre <!-- cmt-ficha:inicio --> e <!-- cmt-ficha:fim --> e é trocado inteiro a cada execução."""
import pathlib, re
R = pathlib.Path(__file__).resolve().parents[2]
js = (R / 'padrao/ficha-dialogo.js').read_text(encoding='utf-8')
css = (R / 'padrao/ficha-dialogo.css').read_text(encoding='utf-8')
assert '</script' not in js and '</style' not in css
ad = (R / 'padrao/ficha-adaptador-monitor.js').read_text(encoding='utf-8')
assert '</script' not in ad
for rel in ['apoio/pauta-equipe/index.html', 'cmt-monitor.html']:
    BLOCO = '<!-- cmt-ficha:inicio -->\n<style id="cmt-ficha-css">\n' + css + '\n</style>\n<script id="cmt-ficha">\n' + js + '\n</script>\n' + \
        ('<script id="cmt-ficha-monitor">\n' + ad + '\n</script>\n' if rel == 'cmt-monitor.html' else '') + '<!-- cmt-ficha:fim -->'
    p = R / rel; s = p.read_text(encoding='utf-8')
    i, j = s.find('<!-- cmt-ficha:inicio -->'), s.find('<!-- cmt-ficha:fim -->')
    if i >= 0 and j > i:
        s = s[:i] + BLOCO + s[j + len('<!-- cmt-ficha:fim -->'):]
    else:
        k = s.rfind('</body>'); assert k > 0, rel
        s = s[:k] + BLOCO + '\n' + s[k:]
    p.write_text(s, encoding='utf-8')
    print(rel, 'ok', len(s))
