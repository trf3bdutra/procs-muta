#!/usr/bin/env python3
"""Ementário curado em formato resumido, para a extensão Muta (aba Ementário).

Uso:  python3 scripts/jurisprudencia/gerar_curados.py [--raiz .] [--saida DIR]

Lê precedentes/precedentes.jsonl e precedentes/inteiros-teores/*.jsonl e grava, em DIR
(padrão: precedentes/jurisprudencia), dois arquivos que o workflow vercel-monitor.yml publica
em /jurisprudencia/ (não ficam no Git):

  curados.json.gz        {"schema": "gabcmt.jurisprudencia.curados", "registros": [...]}
                         chaves curtas: id, n (processo), c (sigla), cl (classe), pr (pronunciamento),
                         o (órgão), d (julgamento), p (publicação), e (ementa), r (resultado),
                         as (assunto), tm (temas), ts (tese), tc (tipo de caso: matéria · tipo · aspecto),
                         mt (matéria canônica, padrao/tipo-caso.json), u (fonte), it (tem inteiro teor)
  curados-texto.json.gz  {"schema": "gabcmt.jurisprudencia.curados-texto", "textos": {id: inteiro teor}}

Mesmo conteúdo público do Ementário do Compêndio; CPF e CNPJ são retirados dos textos.
Idempotente (gzip sem data).
"""
import argparse, gzip, json, re
from pathlib import Path

SEMDOC = re.compile(r'\s*[-–,]?\s*\b(CPF|CNPJ)\b:?\s*[\d.\-/]+|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b')


def limpa(t):
    return SEMDOC.sub('', str(t or '')).strip()


def grava(caminho, obj):
    dado = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    with open(caminho, 'wb') as fo:
        with gzip.GzipFile(fileobj=fo, mode='wb', mtime=0, compresslevel=9) as g:
            g.write(dado)
    return caminho.stat().st_size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raiz', default='.')
    ap.add_argument('--saida', default=None)
    a = ap.parse_args()
    R = Path(a.raiz)
    S = Path(a.saida) if a.saida else R / 'precedentes/jurisprudencia'
    S.mkdir(parents=True, exist_ok=True)

    textos = {}
    for f in sorted((R / 'precedentes/inteiros-teores').glob('*.jsonl')):
        for l in f.read_text(encoding='utf-8').splitlines():
            if not l.strip():
                continue
            r = json.loads(l)
            if r.get('id') and r.get('inteiroTeor'):
                textos[r['id']] = limpa(r['inteiroTeor'])

    regs = []
    for l in (R / 'precedentes/precedentes.jsonl').read_text(encoding='utf-8').splitlines():
        if not l.strip():
            continue
        r = json.loads(l)
        cur = r.get('curadoria') or {}
        cat = r.get('catalogacao') or {}
        x = {
            'id': r.get('id'), 'n': r.get('processo'), 'c': r.get('classeSigla') or r.get('especie'),
            'cl': r.get('classe'), 'pr': r.get('pronunciamento'), 'o': r.get('orgao'),
            'd': r.get('dataJulgamento'), 'p': r.get('dataPublicacao'),
            'e': limpa(r.get('ementa')), 'r': limpa(r.get('resultado')),
            'as': r.get('assunto'), 'tm': r.get('temas'), 'ts': limpa(cur.get('tese')),
            'tc': cur.get('tipoCaso') or cur.get('subassunto') or cat.get('tipoCasoSugerido'),
            'mt': cat.get('materia'), 'u': r.get('urlFonte'),
        }
        if r.get('id') in textos:
            x['it'] = True
        regs.append({k: v for k, v in x.items() if v not in (None, '', [], {})})
    regs.sort(key=lambda x: x.get('d') or '', reverse=True)

    b1 = grava(S / 'curados.json.gz', {'schema': 'gabcmt.jurisprudencia.curados', 'registros': regs})
    b2 = grava(S / 'curados-texto.json.gz', {'schema': 'gabcmt.jurisprudencia.curados-texto', 'textos': textos})
    print(f'{len(regs)} curados ({b1 // 1000} kB); {len(textos)} inteiros teores ({b2 // 1000} kB)')


if __name__ == '__main__':
    main()
