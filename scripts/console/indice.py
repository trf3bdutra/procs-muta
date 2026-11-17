#!/usr/bin/env python3
"""Índice do banco de julgados do Relator pela API do Claude (Message Batches).

1. EXTRAÇÃO (modelo leve, em lote): para cada julgado da série precedentes/jurisprudencia, a matéria,
   o assunto, a questão ("saber se …"), a tese, o resultado, os temas, as súmulas e os dispositivos.
   É incremental: só vai à API o julgado novo ou com ementa alterada (chave id + hash da ementa).
2. ÍNDICES (local): temas.json (cada tema com os julgados que o aplicam) e um ementário por matéria.
3. DIVERGÊNCIAS (modelo médio): julgados com a mesma questão e teses diferentes são reunidos em
   grupos e conferidos pelo modelo; só os confirmados entram em divergencias.md.

Saída em precedentes/indice-ia/:
  extracoes.jsonl.gz · temas.json · ementarios/<matéria>.md · divergencias.md · divergencias.json

Uso:
  python3 scripts/console/indice.py --de 2021 --limite 3000      # extrai até 3.000 julgados novos
  python3 scripts/console/indice.py --so-indices                  # refaz índices e ementários sem API
  python3 scripts/console/indice.py --divergencias 30             # confere até 30 grupos candidatos
  python3 scripts/console/indice.py --ensaio                      # mostra o que iria à API
"""
import argparse
import collections
import gzip
import hashlib
import itertools
import json
import re
import unicodedata

from comum import RAIZ, MODELO, HOJE, aviso, cliente, em_lote, chamar, da_ferramenta, ferramenta, gravar, serie, ementa, br

PASTA = RAIZ / 'precedentes' / 'indice-ia'
CACHE = PASTA / 'extracoes.jsonl.gz'
MATERIAS = ['Previdenciário', 'Assistencial (BPC/LOAS)', 'Tributário', 'Execução fiscal e conselhos', 'Aduaneiro',
            'Administrativo · servidor público', 'Administrativo · outros', 'Saúde', 'SFH, MCMV e CEF', 'FGTS',
            'Processual civil', 'Civil e consumidor', 'Ambiental', 'Penal', 'Outro']
RESULTADOS = ['Provido', 'Parcialmente provido', 'Desprovido', 'Não conhecido', 'Prejudicado', 'Embargos rejeitados',
              'Embargos acolhidos', 'Retratação exercida', 'Acórdão mantido', 'Segurança concedida', 'Segurança denegada', 'Outro']
EXTRAIR = ferramenta('registrar', 'Registra o índice de um julgado.', {
    'materia': {'type': 'string', 'enum': MATERIAS},
    'assunto': {'type': 'string', 'description': 'Até 8 palavras, sem nomes de partes.'},
    'questao': {'type': 'string', 'description': 'A questão central, numa frase que começa com "saber se".'},
    'tese': {'type': 'string', 'description': 'A conclusão do julgado sobre a questão, em até duas frases, sem nomes, IDs ou valores do caso.'},
    'resultado': {'type': 'string', 'enum': RESULTADOS},
    'temas': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Temas de repercussão geral ou repetitivos aplicados, no formato "Tema 1.075/STF".'},
    'sumulas': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Formato "Súmula 111/STJ".'},
    'dispositivos': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Formato "Lei 8.213/1991, artigo 86".'},
    'palavras_chave': {'type': 'array', 'items': {'type': 'string'}, 'maxItems': 6}},
    ['materia', 'assunto', 'questao', 'tese', 'resultado', 'temas'])
SISTEMA = ('Você indexa julgados do Des. Fed. Carlos Muta (TRF-3). Use só o texto recebido; não complete com conhecimento próprio. '
           'Tema, súmula ou dispositivo só se estiverem citados no texto. Português do Brasil, frases curtas, sem nomes de partes. '
           'Responda chamando a ferramenta registrar.')
AVALIAR = ferramenta('avaliar', 'Registra se o grupo de julgados tem divergência real.', {
    'divergente': {'type': 'boolean'},
    'questao': {'type': 'string', 'description': 'A questão comum, com "saber se".'},
    'explicacao': {'type': 'string', 'description': 'Em até 3 frases: em que as teses se opõem, ou por que não há divergência (fatos diferentes, mudança de precedente vinculante etc.).'},
    'em_conflito': {'type': 'array', 'items': {'type': 'string'}, 'description': 'ids dos julgados que se opõem.'},
    'explicacao_temporal': {'type': 'string', 'description': 'Se a diferença se explica por precedente vinculante ou mudança legislativa posterior, qual; senão vazio.'}},
    ['divergente', 'questao', 'explicacao', 'em_conflito'])


def nq(s):
    return unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode().lower()


def toks(s):
    return {w for w in re.findall(r'[a-z0-9]{4,}', nq(s)) if w not in {'saber', 'sobre', 'para', 'pela', 'pelo', 'como', 'deve', 'entre', 'quando', 'possivel', 'cabivel'}}


def jac(a, b):
    return len(a & b) / len(a | b) if a and b else 0.0


def texto_do(r):
    if r['_especie'] == 'acordao':
        t = ementa(r) or str(r.get('inteiro_teor') or '')[:5000]
    else:
        t = str(r.get('inteiro_teor') or '')
        k = re.search(r'\n\s*(DECIDO|Decido|DECIDE-SE|É o relatório\.)', t)
        t = (t[:1500] + '\n[…]\n' + t[k.start():k.start() + 3500]) if k else t[:5000]
        if r.get('dispositivo'):
            t += '\n\nDispositivo: ' + str(r['dispositivo'])
    return t[:7000]


def chave(r):
    h = r.get('sha256_ementa') or r.get('sha256_inteiro_teor') or hashlib.sha256(texto_do(r).encode()).hexdigest()
    return r['id'] + ':' + h[:16]


def ler_cache():
    C = {}
    if CACHE.exists():
        for l in gzip.open(CACHE, 'rt', encoding='utf-8'):
            if l.strip():
                x = json.loads(l); C[x['chave']] = x
    return C


def gravar_cache(C):
    PASTA.mkdir(parents=True, exist_ok=True)
    with gzip.open(CACHE, 'wt', encoding='utf-8') as f:
        for k in sorted(C):
            f.write(json.dumps(C[k], ensure_ascii=False) + '\n')


def pedido(r):
    return {'model': MODELO['leve'], 'max_tokens': 1200,
            'system': [{'type': 'text', 'text': SISTEMA, 'cache_control': {'type': 'ephemeral'}}],
            'tools': [EXTRAIR], 'tool_choice': {'type': 'tool', 'name': 'registrar'},
            'messages': [{'role': 'user', 'content': 'Classe: %s · %s · julgado em %s\n\n%s' % (
                r.get('classe', ''), 'acórdão' if r['_especie'] == 'acordao' else 'decisão monocrática', br(r['_data']), texto_do(r))}]}


def extrair(a, C):
    novos = []
    for r in serie(especie=a.especie, de=a.de):
        if not r['_data'] or chave(r) in C:
            continue
        novos.append(r)
    novos.sort(key=lambda r: r['_data'], reverse=True)  # os mais recentes primeiro
    aviso('%d julgados sem índice desde %s; nesta execução: %d' % (len(novos), a.de, min(len(novos), a.limite)))
    novos = novos[:a.limite]
    if a.ensaio:
        if novos:
            p = pedido(novos[0]); print(json.dumps(p['messages'][0]['content'][:1500], ensure_ascii=False))
        return 0
    if not novos:
        return 0
    cli = cliente()
    ids = {'j%06d' % i: r for i, r in enumerate(novos)}
    R = em_lote(cli, [(c, pedido(r)) for c, r in ids.items()], 'extração')
    ok = 0
    for c, r in ids.items():
        m = R.get(c)
        if isinstance(m, Exception) or m is None:
            continue
        try:
            x = da_ferramenta(m, 'registrar')
        except Exception:
            continue
        C[chave(r)] = dict(chave=chave(r), id=r['id'], processo=r.get('numero_processo', ''), classe=r.get('classe_sigla', ''),
                           especie=r['_especie'], data=r['_data'], orgao=r.get('orgao_julgador', ''), **x)
        ok += 1
    gravar_cache(C)
    aviso('extraídos', ok, 'de', len(ids))
    return ok


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', nq(s)).strip('-')


def norm_tema(t):
    m = re.search(r'(\d{1,2}\.?\d{3}|\d{1,4})\s*/?\s*(STF|STJ)?', str(t), re.I)
    if not m:
        return None
    n = '{:,}'.format(int(m.group(1).replace('.', ''))).replace(',', '.')
    return 'Tema %s/%s' % (n, (m.group(2) or '?').upper())


def indices(C):
    X = sorted(C.values(), key=lambda x: x['data'], reverse=True)
    T = collections.defaultdict(list)
    for x in X:
        for t in set(filter(None, map(norm_tema, x.get('temas') or []))):
            T[t].append({k: x.get(k) for k in ('id', 'processo', 'classe', 'data', 'resultado', 'tese')})
    gravar(PASTA / 'temas.json', json.dumps(dict(sorted(T.items(), key=lambda kv: -len(kv[1]))), ensure_ascii=False, indent=1))
    por = collections.defaultdict(lambda: collections.defaultdict(list))
    for x in X:
        por[x.get('materia') or 'Outro'][(x.get('assunto') or '—').strip().rstrip('.')].append(x)
    for mat, A in por.items():
        L = ['# Ementário · %s' % mat, '',
             'Gerado do índice dos julgados do Relator (%d julgados, %d assuntos). Teses resumidas pelo modelo a partir da ementa: '
             'conferir no inteiro teor antes de citar.' % (sum(len(v) for v in A.values()), len(A)), '']
        for ass, xs in sorted(A.items(), key=lambda kv: -len(kv[1])):
            L.append('## %s (%d)' % (ass, len(xs)))
            for x in xs[:30]:
                L.append('- %s — %s %s, %s · %s%s' % (x.get('tese', ''), x.get('classe', ''), x.get('processo', ''), br(x['data']),
                                                      x.get('resultado', ''), (' · ' + ', '.join(x['temas'])) if x.get('temas') else ''))
            if len(xs) > 30:
                L.append('- … e mais %d julgados.' % (len(xs) - 30))
            L.append('')
        gravar(PASTA / 'ementarios' / ('%s.md' % slug(mat)), '\n'.join(L))
    return X


def candidatos(X, anos=5):
    """Grupos de julgados com a mesma questão (temas ou assunto em comum, questões parecidas) e teses diferentes."""
    corte = '%04d' % (HOJE.year - anos)
    X = [x for x in X if x['data'] >= corte and x.get('especie') == 'acordao' and x.get('questao') and x.get('tese')]
    blocos = collections.defaultdict(list)
    for x in X:
        for t in set(filter(None, map(norm_tema, x.get('temas') or []))):
            blocos['T:' + t].append(x)
        blocos['A:%s|%s' % (x.get('materia'), ' '.join(sorted(toks(x.get('assunto')))))].append(x)
    G = {}
    for k, xs in blocos.items():
        if len(xs) < 2 or len(xs) > 500:
            continue
        Q = [toks(x['questao']) for x in xs]; Te = [toks(x['tese']) for x in xs]
        for i, j in itertools.combinations(range(len(xs)), 2):
            if jac(Q[i], Q[j]) >= 0.55 and jac(Te[i], Te[j]) < 0.3:
                ids = tuple(sorted({xs[i]['id'], xs[j]['id']}))
                G.setdefault(ids, (jac(Q[i], Q[j]), [xs[i], xs[j]]))
    return sorted(G.values(), key=lambda g: -g[0])


def divergencias(X, n, ensaio):
    arq = PASTA / 'divergencias.json'
    feito = json.loads(arq.read_text(encoding='utf-8')) if arq.exists() else {}
    cand = [g for g in candidatos(X) if '|'.join(sorted(x['id'] for x in g[1])) not in feito]
    aviso('%d pares candidatos a divergência ainda não conferidos; nesta execução: %d' % (len(cand), min(n, len(cand))))
    if ensaio or not cand or not n:
        return
    cli = cliente()
    for _, xs in cand[:n]:
        k = '|'.join(sorted(x['id'] for x in xs))
        txt = '\n\n'.join('[%s] %s %s, %s · %s\nQuestão: %s\nTese: %s' % (x['id'], x['classe'], x['processo'], br(x['data']), x['resultado'], x['questao'], x['tese']) for x in xs)
        try:
            m = chamar(cli, model=MODELO['medio'], max_tokens=1500, tools=[AVALIAR], tool_choice={'type': 'tool', 'name': 'avaliar'},
                       system='Você confere se julgados do mesmo Relator (TRF-3) divergem sobre a mesma questão de direito. Diferença de fatos não é divergência. '
                              'Mudança de precedente vinculante entre as datas explica a diferença: diga qual. Português do Brasil.',
                       messages=[{'role': 'user', 'content': txt}])
            r = da_ferramenta(m, 'avaliar')
        except Exception as ex:
            aviso('falhou', k, ex); continue
        r['julgados'] = [{kk: x.get(kk) for kk in ('id', 'processo', 'classe', 'data', 'resultado', 'tese')} for x in xs]
        feito[k] = r
    gravar(arq, json.dumps(feito, ensure_ascii=False, indent=1))
    D = [v for v in feito.values() if v.get('divergente')]
    D.sort(key=lambda v: max(j['data'] for j in v['julgados']), reverse=True)
    L = ['# Divergências internas (julgados do Relator)', '',
         '%d grupos conferidos pelo modelo; %d com divergência. Leitura feita sobre ementas resumidas: confirmar no inteiro teor [VALIDAR].' % (len(feito), len(D)), '']
    for v in D:
        L += ['## ' + v.get('questao', ''), '', v.get('explicacao', ''), ''] + \
             (['Explicação temporal: ' + v['explicacao_temporal'], ''] if v.get('explicacao_temporal') else []) + \
             ['- %s %s, %s · %s — %s' % (j['classe'], j['processo'], br(j['data']), j['resultado'], j['tese']) for j in v['julgados']] + ['']
    gravar(PASTA / 'divergencias.md', '\n'.join(L))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--de', type=int, default=HOJE.year - 5, help='ano inicial (padrão: últimos 5 anos)')
    ap.add_argument('--especie', choices=['acordao', 'monocratica'])
    ap.add_argument('--limite', type=int, default=3000, help='máximo de julgados novos enviados à API nesta execução')
    ap.add_argument('--divergencias', type=int, default=30, help='máximo de pares conferidos pelo modelo nesta execução')
    ap.add_argument('--so-indices', action='store_true', help='não chama a API: só refaz índices e ementários')
    ap.add_argument('--ensaio', action='store_true')
    a = ap.parse_args()
    C = ler_cache()
    aviso('índice atual: %d julgados' % len(C))
    if not a.so_indices:
        extrair(a, C)
    if a.ensaio:
        divergencias(list(C.values()), a.divergencias, True); return
    X = indices(C) if C else []
    if not a.so_indices:
        divergencias(X, a.divergencias, False)


if __name__ == '__main__':
    main()
