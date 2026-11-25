"""Incorpora ao portal Amicus o material de referência da Central de Comando (central.json):
recursos e ato → via cabível, temas processuais, assuntos recorrentes, léxico recursal e competência.
Uso: python3 apoio/amicus/central.py apoio/amicus/index.html (o mesmo índice publicado)."""
import json
import sys
from pathlib import Path
AQUI = Path(__file__).resolve().parent
MARCA = '<script type="application/json" id="amicus-central">'
def apply(html, dados):
    payload = json.dumps(dados, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    if MARCA in html:
        a = html.index(MARCA) + len(MARCA)
        b = html.index('</script>', a)
        return html[:a] + payload + html[b:]
    return html.replace('</main>', MARCA + payload + '</script></main>', 1)
if __name__ == '__main__':
    p = Path(sys.argv[1] if len(sys.argv) > 1 else AQUI / 'index.html')
    dados = json.loads((AQUI / 'central.json').read_text(encoding='utf-8'))
    p.write_text(apply(p.read_text(encoding='utf-8'), dados), encoding='utf-8')
    print('Amicus: material da Central de Comando incorporado')
