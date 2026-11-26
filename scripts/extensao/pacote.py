#!/usr/bin/env python3
"""Monta o pacote HERO18810 diretamente da interface universal canônica.

Nenhum shim, marca MUTA_PREVIA ou ajuste de origem da prévia entra no ZIP.
O painel anterior (painel.html) permanece disponível para compatibilidade.

Uso: python3 scripts/extensao/pacote.py --saida site/public/extensao/muta-pje.zip
"""
import argparse
import json
import pathlib
import shutil
import sys
import tempfile
import zipfile

RAIZ = pathlib.Path(__file__).resolve().parents[2]
EXT = RAIZ / 'extensao'
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import previa  # noqa: E402


def montar(zip_saida: pathlib.Path) -> None:
    with tempfile.TemporaryDirectory() as t:
        tmp = pathlib.Path(t)
        pac = tmp / 'pacote'
        shutil.copytree(EXT, pac, ignore=shutil.ignore_patterns('README.md'))
        # Montagem limpa: não cria nem importa a prévia; o manifesto aponta para o painel universal.
        previa.montar_universal(pac)
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
