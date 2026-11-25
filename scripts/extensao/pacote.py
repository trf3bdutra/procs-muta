#!/usr/bin/env python3
"""Monta o pacote da extensão HERO18810 (/extensao/muta-pje.zip) com o prontuário universal.

O prontuário universal é composto pelos mesmos arquivos da prévia (scripts/extensao/previa/), pela mesma
montagem de scripts/extensao/previa.py: uma fonte só para a prévia e para a extensão. Aqui saem as peças
da prévia (o shim que faz o papel do Chrome, a marca MUTA_PREVIA e o endereço do site trocado) e o painel
lateral passa a abrir universal.html. O painel anterior (painel.html) continua no pacote.

Uso: python3 scripts/extensao/pacote.py --saida site/public/extensao/muta-pje.zip
"""
import argparse
import json
import pathlib
import re
import shutil
import sys
import tempfile
import zipfile

RAIZ = pathlib.Path(__file__).resolve().parents[2]
EXT = RAIZ / 'extensao'
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import previa  # noqa: E402

UNIVERSAL = ('gabinete-universal.js', 'roteiro-universal.js', 'universal-layout.css', 'universal-ajustes.js')


def montar(zip_saida: pathlib.Path) -> None:
    with tempfile.TemporaryDirectory() as t:
        tmp = pathlib.Path(t)
        previa.montar(tmp / 'previa')
        painel = tmp / 'previa' / 'painel'
        pac = tmp / 'pacote'
        shutil.copytree(EXT, pac, ignore=shutil.ignore_patterns('README.md'))
        for f in UNIVERSAL:
            shutil.copy2(painel / f, pac / f)
        html = (painel / 'universal.html').read_text(encoding='utf-8')
        html = html.replace('<script src="shim-previa.js"></script>\n', '').replace('<script>window.MUTA_PREVIA = true;</script>\n', '')
        html = re.sub(r'\n<script>/\* prévia: o site é o da própria página \*/[^<]*</script>', '', html)
        if 'shim-previa' in html or 'MUTA_PREVIA' in html or re.search(r'<script>(?!</script>)', html):
            sys.exit('universal.html: sobrou código da prévia ou script embutido (o Chrome não executa script inline na extensão)')
        (pac / 'universal.html').write_text(html, encoding='utf-8')
        man = json.loads((pac / 'manifest.json').read_text(encoding='utf-8'))
        man.setdefault('side_panel', {})['default_path'] = 'universal.html'
        (pac / 'manifest.json').write_text(json.dumps(man, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        zip_saida.parent.mkdir(parents=True, exist_ok=True)
        if zip_saida.exists():
            zip_saida.unlink()
        with zipfile.ZipFile(zip_saida, 'w', zipfile.ZIP_DEFLATED) as z:
            for f in sorted(pac.rglob('*')):
                if f.is_file():
                    z.write(f, f.relative_to(pac).as_posix())
    print('pacote da extensão (prontuário universal) em', zip_saida)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--saida', required=True, type=pathlib.Path)
    montar(ap.parse_args().saida)


if __name__ == '__main__':
    main()
