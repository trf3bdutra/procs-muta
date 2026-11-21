#!/usr/bin/env python3
"""Embute a ficha única (padrao/ficha-dialogo.js + .css, com o calendário forense padrao/calendario-forense.js e a leitura do inteiro teor padrao/inteiro-teor.js) nos dois HTML que a usam: o Caput (cmt-monitor.html, no documento
de fora, não no motor) e a Ex Officio (apoio/ex-officio/index.html). Fonte única: edite os arquivos de padrao/ e rode
   python3 scripts/ficha/embutir.py
O monitor recebe também o adaptador (padrao/ficha-adaptador-monitor.js). O bloco fica entre <!-- cmt-ficha:inicio --> e <!-- cmt-ficha:fim --> e é trocado inteiro a cada execução."""
import pathlib, re
R = pathlib.Path(__file__).resolve().parents[2]
js = (R / 'padrao/calendario-forense.js').read_text(encoding='utf-8') + '\n' + (R / 'padrao/inteiro-teor.js').read_text(encoding='utf-8') + '\n' + (R / 'padrao/ficha-dialogo.js').read_text(encoding='utf-8')
css = (R / 'padrao/ficha-dialogo.css').read_text(encoding='utf-8')
assert '</script' not in js and '</style' not in css
ad = (R / 'padrao/ficha-adaptador-monitor.js').read_text(encoding='utf-8')
assert '</script' not in ad
for rel in ['apoio/ex-officio/index.html', 'cmt-monitor.html']:
    if not (R / rel).exists(): print(rel, 'ausente (aposentado), pulado'); continue
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

# Caput (caput/triagem): a ficha é carregada de caput/assets (js/cmt-ficha.js e css/95-ficha-unica.css), com as mesmas fontes
cj, cc = R / 'caput/assets/js/cmt-ficha.js', R / 'caput/assets/css/95-ficha-unica.css'
if cj.exists():
    cj.write_text(js, encoding='utf-8'); cc.write_text('\n' + css, encoding='utf-8'); print('caput/assets ok', len(js))

# Caput: o motor (iframe, guardado comprimido em var MOTOR) recebe o calendário forense e o CSS do editor do calendário do gabinete
import base64, gzip, re
mon = R / 'cmt-monitor.html'
if not mon.exists(): print('cmt-monitor.html aposentado: motor embutido não atualizado'); raise SystemExit(0)
t = mon.read_text(encoding='utf-8')
m = re.search(r"var MOTOR = '([^']*)'", t)
motor = gzip.decompress(base64.b64decode(m.group(1))).decode('utf-8')
fr = (R / 'padrao/calendario-forense.js').read_text(encoding='utf-8'); ecss = (R / 'padrao/calendario-editor.css').read_text(encoding='utf-8')
B2 = '<!-- cmt-forense:inicio -->\n<style id="cmt-calendario-editor-css">\n' + ecss + '\n</style>\n<script id="cmt-forense">\n' + fr + '\n</script>\n<!-- cmt-forense:fim -->'
i, j = motor.find('<!-- cmt-forense:inicio -->'), motor.find('<!-- cmt-forense:fim -->')
if i >= 0 and j > i: motor = motor[:i] + B2 + motor[j + len('<!-- cmt-forense:fim -->'):]
else:
    k = motor.rfind('</body>'); assert k > 0; motor = motor[:k] + B2 + '\n' + motor[k:]
b64 = base64.b64encode(gzip.compress(motor.encode('utf-8'), 9)).decode()
t = t[:m.start(1)] + b64 + t[m.end(1):]
mon.write_text(t, encoding='utf-8'); print('motor do cmt-monitor.html ok', len(motor))
