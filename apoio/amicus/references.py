"""Incorpora somente os referenciais do Vade Mecum ao portal; não altera as bases de julgados."""
import json
import sys
from pathlib import Path
RAIZ=Path(__file__).resolve().parents[2]
def apply(html, snapshot):
    marker='<script type="application/json" id="amicus-references">'
    start=html.index(marker)+len(marker)
    end=html.index('</script>',start)
    data={k:snapshot.get(k,[]) for k in ('Temas','Súmulas','Regimento')}
    payload=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
    return html[:start]+payload+html[end:]
if __name__=='__main__':
    p=Path(sys.argv[1])
    snapshot=json.loads((RAIZ/'apoio/vade-mecum.json').read_text(encoding='utf-8'))
    p.write_text(apply(p.read_text(encoding='utf-8'),snapshot),encoding='utf-8')
    print('Amicus: enunciados e regimento incorporados da fonte canônica')
