#!/usr/bin/env python3
"""Incorpora novos julgados à série de jurisprudência do Relator, sem apagar nada.

Entrada: um ou mais arquivos JSON com os registros extraídos da base de
jurisprudência do TRF-3 (lista de objetos, no mesmo formato da série).

O script:
  - descarta o que já está na série (mesmo processo e mesma data de julgamento);
  - acrescenta os novos ao arquivo do ano (acordaos/AAAA.json.gz ou
    monocraticas/AAAA.json.gz), criando o arquivo quando o ano ainda não existe;
  - refaz indice.json.gz, MANIFESTO.json e SHA256SUMS;
  - escreve um resumo do que entrou.

Nada é removido nem reescrito: os registros antigos seguem como estavam.

Uso:
  python3 scripts/jurisprudencia/incorporar.py novos.json [outro.json ...]
  python3 scripts/jurisprudencia/incorporar.py --conferir   (só verifica a série)
"""
import argparse
import gzip
import hashlib
import json
import pathlib
import re
import sys
from datetime import datetime, timezone

BASE = pathlib.Path(__file__).resolve().parents[2] / 'precedentes' / 'jurisprudencia'
PASTAS = {'A': 'acordaos', 'M': 'monocraticas'}


def ler(p):
    """Devolve (registros, cabeçalho) do arquivo do ano; o cabeçalho é mantido."""
    if not p.exists():
        return [], {}
    d = json.load(gzip.open(p, 'rt', encoding='utf-8'))
    if isinstance(d, dict):
        return d.get('registros', []), {k: v for k, v in d.items() if k != 'registros'}
    return d, {}


def gravar(p, dados, cab=None):
    p.parent.mkdir(parents=True, exist_ok=True)
    saida = dados
    if cab is not None:
        saida = dict(cab)
        saida['total'] = len(dados)
        saida['registros'] = dados
    with gzip.open(p, 'wt', encoding='utf-8', compresslevel=9) as f:
        json.dump(saida, f, ensure_ascii=False, separators=(',', ':'))


def sha_txt(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest() if s else None


def sha_arq(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def especie(r):
    """Acórdão ou monocrática, pelo campo tipo ou pelo id."""
    t = str(r.get('tipo') or '').lower()
    if 'monocr' in t:
        return 'M'
    if 'acórd' in t or 'acord' in t:
        return 'A'
    i = str(r.get('id') or '')
    return 'M' if i.startswith('M') else 'A'


def data_iso(r):
    d = r.get('data_julgamento_iso') or r.get('data') or ''
    m = re.match(r'^(\d{4})-(\d{2})-(\d{2})', str(d))
    if m:
        return m.group(0)
    m = re.match(r'^(\d{2})/(\d{2})/(\d{4})', str(r.get('data_julgamento') or ''))
    return f'{m.group(3)}-{m.group(2)}-{m.group(1)}' if m else ''


def chave(r):
    return (str(r.get('numero_processo') or '').strip(), data_iso(r))


CABS = {}


def serie():
    """Toda a série, por espécie e ano; os cabeçalhos ficam em CABS."""
    out = {}
    for esp, pasta in PASTAS.items():
        for p in sorted((BASE / pasta).glob('*.json.gz')):
            ano = p.stem.split('.')[0]
            regs, cab = ler(p)
            out[(esp, ano)] = regs
            CABS[(esp, ano)] = cab
    return out


def indice(reg, esp):
    d = data_iso(reg)
    return {'id': reg.get('id'), 't': esp, 'n': reg.get('numero_processo'), 'c': reg.get('classe_sigla'),
            'cl': reg.get('classe'), 'o': reg.get('orgao_julgador'), 'd': d, 'p': reg.get('data_publicacao'),
            'v': reg.get('publicacao_veiculo'), 'a': reg.get('atuacao_muta'), 'k': reg.get('conteudo_texto'),
            'e': (reg.get('ementa') or reg.get('ementa_previa') or '')[:400],
            'r': reg.get('resultado_colegiado') or reg.get('resultado_ou_dispositivo') or '', 'y': d[:4]}


def refazer_indice_e_hashes(S):
    todos = []
    for (esp, ano), L in sorted(S.items()):
        for r in L:
            todos.append(indice(r, esp))
    todos.sort(key=lambda x: (x.get('d') or ''), reverse=True)
    gravar(BASE / 'indice.json.gz', todos)
    arquivos = sorted([p for p in BASE.rglob('*.json.gz')], key=lambda p: str(p.relative_to(BASE)))
    linhas = [f'{sha_arq(p)}  {p.relative_to(BASE)}' for p in arquivos]
    (BASE / 'SHA256SUMS').write_text('\n'.join(linhas) + '\n', encoding='utf-8')
    man = {}
    mp = BASE / 'MANIFESTO.json'
    if mp.exists():
        man = json.loads(mp.read_text(encoding='utf-8'))
    man['atualizado_em'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
    man['totais'] = {'acordaos': sum(len(v) for (e, _), v in S.items() if e == 'A'),
                     'monocraticas': sum(len(v) for (e, _), v in S.items() if e == 'M'),
                     'registros': len(todos)}
    man['arquivos'] = {str(p.relative_to(BASE)): sha_arq(p) for p in arquivos}
    mp.write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding='utf-8')
    return len(todos)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('arquivos', nargs='*', help='JSON com os registros novos')
    ap.add_argument('--conferir', action='store_true', help='só confere a série e sai')
    a = ap.parse_args()
    if not BASE.exists():
        sys.exit(f'série não encontrada em {BASE}')
    S = serie()
    existentes = {chave(r) for L in S.values() for r in L}
    print(f'série atual: {sum(len(v) for v in S.values())} registros, {len(S)} arquivos de ano')
    if a.conferir or not a.arquivos:
        return
    novos, repetidos, sem_data = [], 0, 0
    for nome in a.arquivos:
        dados = json.loads(pathlib.Path(nome).read_text(encoding='utf-8'))
        regs = dados.get('registros', dados) if isinstance(dados, dict) else dados
        for r in regs:
            if not data_iso(r):
                sem_data += 1
                continue
            if chave(r) in existentes:
                repetidos += 1
                continue
            existentes.add(chave(r))
            novos.append(r)
    if not novos:
        print(f'nada a incorporar ({repetidos} já estavam na série, {sem_data} sem data)')
        return
    por_arquivo = {}
    for r in novos:
        esp = especie(r)
        ano = data_iso(r)[:4]
        r.setdefault('sha256_inteiro_teor', sha_txt(r.get('inteiro_teor')))
        r.setdefault('sha256_ementa', sha_txt(r.get('ementa')))
        por_arquivo.setdefault((esp, ano), []).append(r)
    for (esp, ano), L in sorted(por_arquivo.items()):
        p = BASE / PASTAS[esp] / f'{ano}.json.gz'
        atual = S.get((esp, ano), [])
        atual = atual + L
        atual.sort(key=lambda r: (data_iso(r), str(r.get('numero_processo') or '')), reverse=True)
        gravar(p, atual, CABS.get((esp, ano), {'tipo': PASTAS[esp], 'ano': int(ano)}))
        S[(esp, ano)] = atual
        print(f'  {PASTAS[esp]}/{ano}: +{len(L)} (total {len(atual)})')
    total = refazer_indice_e_hashes(S)
    print(f'incorporados {len(novos)} julgados; {repetidos} já estavam na série; índice com {total} registros')


if __name__ == '__main__':
    main()
