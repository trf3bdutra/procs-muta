#!/usr/bin/env python3
"""Lê a série histórica de julgados do Relator (precedentes/jurisprudencia).

Uso:
  python3 ler.py                                   totais por ano e espécie
  python3 ler.py --de 2022                         só de 2022 em diante
  python3 ler.py --de 2022 --especie acordao       só acórdãos
  python3 ler.py --de 2022 --atuacao relator       só como relator
  python3 ler.py --de 2022 --com-inteiro-teor      só os que têm inteiro teor
  python3 ler.py --de 2022 --saida /tmp/x.jsonl    exporta os registros em JSONL
"""
import argparse
import gzip
import json
import pathlib
import sys

BASE = pathlib.Path(__file__).resolve().parents[2] / 'precedentes' / 'jurisprudencia'
ESPECIES = {'acordao': 'acordaos', 'monocratica': 'monocraticas'}


def anos(pasta):
    return sorted(int(p.stem.split('.')[0]) for p in (BASE / pasta).glob('*.json.gz'))


def ler(pasta, ano):
    d = json.load(gzip.open(BASE / pasta / f'{ano}.json.gz', 'rt', encoding='utf-8'))
    return d.get('registros', d) if isinstance(d, dict) else d


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--de', type=int, default=0, help='ano inicial do julgamento')
    p.add_argument('--ate', type=int, default=9999, help='ano final do julgamento')
    p.add_argument('--especie', choices=sorted(ESPECIES), help='acordao ou monocratica')
    p.add_argument('--atuacao', help='filtra atuacao_muta (ex.: relator)')
    p.add_argument('--com-inteiro-teor', action='store_true')
    p.add_argument('--saida', help='arquivo JSONL de saída')
    a = p.parse_args()

    if not BASE.exists():
        sys.exit(f'base não encontrada em {BASE}')
    pastas = [ESPECIES[a.especie]] if a.especie else list(ESPECIES.values())
    saida = open(a.saida, 'w', encoding='utf-8') if a.saida else None
    tot = {}
    for pasta in pastas:
        for ano in anos(pasta):
            if ano < a.de or ano > a.ate:
                continue
            n = 0
            for r in ler(pasta, ano):
                # as monocráticas não trazem atuacao_muta: são todas do Relator
                atuacao = r.get('atuacao_muta') or ('relator' if pasta == 'monocraticas' else '')
                if a.atuacao and atuacao != a.atuacao:
                    continue
                if a.com_inteiro_teor and not r.get('possui_inteiro_teor'):
                    continue
                n += 1
                if saida:
                    saida.write(json.dumps(r, ensure_ascii=False) + '\n')
            tot[(pasta, ano)] = n
    if saida:
        saida.close()
    for (pasta, ano), n in sorted(tot.items()):
        print(f'{pasta:14} {ano} {n:6}')
    print(f'{"TOTAL":14}      {sum(tot.values()):6}')
    if a.saida:
        print(f'gravado em {a.saida}')


if __name__ == '__main__':
    main()
