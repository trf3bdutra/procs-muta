# -*- coding: utf-8 -*-
"""Registra nos lotes a tabela de documentos dos autos extraídos do PJe.

Lê acervo/autos/<CNJ>.json.gz (gerado pelo extrator do navegador) e grava, em cada item
de lote com o mesmo processo:
  - autos: arquivo, data da extração, total de documentos, IDs sem texto e a lista
    completa [id, data, tipo, descrição, juntado por, formato, páginas];
  - pecas: as peças principais (inicial, sentença, recursos, decisões, parecer...),
    só quando o item ainda não tem peças anotadas à mão;
  - extracao: situação "extraída", data (DD/MM/AAAA), documentos, sem texto e não lidos
    (os demais campos de extracao são mantidos).
Só regrava o lote que mudou. Roda de hora em hora no workflow lotes-alimentar.yml.

Uso: python3 scripts/autos/registrar.py [lote ...]   (padrão: todos os lotes)
"""
import glob, gzip, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PRINCIPAIS = re.compile(
    r'peti[çc][ãa]o inicial|emenda|senten[çc]a|apela[çc][ãa]o|recurso|agravo|embargos de declara|'
    r'contrarraz|contesta[çc][ãa]o|informa[çc][õo]es|decis[ãa]o|despacho|ac[óo]rd[ãa]o|voto|ementa|'
    r'parecer|minist[ée]rio p[úu]blico|procuradoria|certid[ãa]o de julgamento|tr[âa]nsito|laudo|per[íi]cia|memoriais',
    re.I)
IGNORAR = re.compile(r'^(intima[çc][ãa]o|cita[çc][ãa]o|ato ordinat[óo]rio|certid[ãa]o|custas|documento comprobat[óo]rio)$', re.I)
# documento comprobatório: anexo da parte; a descrição ("DOC. 05 PARECER…") não faz dele peça principal


def _json(v):
    """O extrator roda numa página que altera o JSON.stringify: listas podem vir como texto."""
    while isinstance(v, str) and v[:1] in '[{':
        try:
            v = json.loads(v)
        except ValueError:
            break
    return v


def data_br(s):
    m = re.match(r'(\d{2})/(\d{2})/(\d{2,4})', s or '')
    if not m:
        return ''
    a = m.group(3)
    return f'{m.group(1)}/{m.group(2)}/{"20" + a if len(a) == 2 else a}'


def carregar(caminho):
    d = json.loads(gzip.open(caminho).read())
    d = {k: _json(v) for k, v in d.items()}
    lista = [r for r in (d.get('lista') or []) if isinstance(r, list) and len(r) >= 7
             and 'ainda não juntado' not in (r[3] + r[4])]
    lidos = {x['id']: x for x in (d.get('docs') or []) if isinstance(x, dict)}
    docs, sem_texto = [], []
    for r in sorted(lista, key=lambda r: int(r[0])):
        i, tipo, desc, por, em = r[0], r[1], r[2], r[3], r[4]
        x = lidos.get(i, {})
        if x.get('formato') == 'pdf' and x.get('paginas') and x.get('caracteres', 0) < 40 * x['paginas'] + 40:
            sem_texto.append(i)
        docs.append([i, data_br(em), tipo, desc if desc != tipo else '', por.split(' - ')[0],
                     x.get('formato', ''), x.get('paginas', 0)])
    return d['cnj'], {'extraido_em': d.get('extraido_em', '')[:10], 'documentos': docs,
                      'sem_texto': sem_texto, 'faltam': d.get('faltam') or []}


def pecas_principais(docs):
    out = []
    for i, data, tipo, desc, por, fmt, pag in docs:
        rot = desc or tipo
        if not PRINCIPAIS.search(tipo + ' ' + desc) or IGNORAR.match(tipo.strip()):
            continue
        if not (desc or fmt) and tipo.lower().startswith('petição'):
            continue  # capa vazia da petição; o conteúdo vem no documento seguinte
        out.append({'id': i, 'peca': rot + (f' ({data})' if data else ''), 'tipo': tipo, 'data': data})
    return out


def main(lotes):
    autos = dict(carregar(f) for f in sorted(glob.glob(os.path.join(RAIZ, 'acervo/autos/*.json.gz'))))
    for lote in lotes:
        p = os.path.join(RAIZ, 'acervo/lotes', lote + '.json')
        antes = open(p, encoding='utf-8').read()
        L = json.loads(antes)
        if not isinstance(L, dict) or not isinstance(L.get('itens'), list):
            continue  # índices da pasta (colecoes.json etc.) não são lotes
        n = 0
        for it in L['itens']:
            a = autos.get(it['processo'])
            if not a:
                continue
            arq = 'acervo/autos/' + it['processo'] + '.json.gz'
            it['autos'] = {'arquivo': arq, 'extraido_em': a['extraido_em'], 'total': len(a['documentos']),
                           'sem_texto': a['sem_texto'], 'faltam': a['faltam'], 'documentos': a['documentos']}
            if not it.get('pecas'):
                it['pecas'] = pecas_principais(a['documentos'])
            ext = a['extraido_em']
            it['extracao'] = dict(it.get('extracao') or {}, situacao='extraída',
                                  em=f'{ext[8:10]}/{ext[5:7]}/{ext[:4]}' if len(ext) == 10 else ext,
                                  documentos=str(len(a['documentos'])), sem_texto=str(len(a['sem_texto'])),
                                  faltam=str(len(a['faltam'])))
            n += 1
        novo = json.dumps(L, ensure_ascii=False, indent=1) + '\n'
        if novo != antes:
            open(p, 'w', encoding='utf-8').write(novo)
            print(lote, n, 'itens com autos (atualizado)')


if __name__ == '__main__':
    main(sys.argv[1:] or [os.path.basename(f)[:-5] for f in glob.glob(os.path.join(RAIZ, 'acervo/lotes/*.json'))])
