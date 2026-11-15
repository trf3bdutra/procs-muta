#!/usr/bin/env python3
"""Modelos-matriz de acórdão a partir do catálogo de acórdãos do Relator (precedentes/catalogo-cmt).

  python3 scripts/modelos-matriz/catalogo.py [--seco]

1. Questão: os temas do catálogo (catalogacao.temaId, 2+ acórdãos) do mesmo assunto são fundidos quando têm o mesmo
   rótulo ou questão muito próxima (TF-IDF do cabeçalho e da "Questão em discussão", ligação média, cosseno ≥ 0,45).
   Os embargos de declaração ficam separados do mérito, por assunto.
2. Solução: cada questão se divide pelo resultado (provimento, parcial provimento, desprovimento, ED rejeitados…).
3. Modelo: questão × solução com 2+ acórdãos. O texto é o da ementa do acórdão representante, sem alteração
   (o mais próximo do conjunto, preferindo ementa no padrão I–IV): questão em discussão, razões de decidir e
   dispositivo nos tópicos do voto-matriz; ementa integral e lista de acórdãos no registro.

Os registros gerados têm id "mod-cat-…" e são refeitos a cada execução; os demais modelos não são tocados.
"""
import collections, json, re, sys, unicodedata
from pathlib import Path
import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / 'scripts/catalogo'))
from similaridade import GENERICO, normalizar, secao  # noqa: E402

CORTE = 0.55          # distância (1 − cosseno) para fundir temas na mesma questão
MIN = 2               # acórdãos por questão × solução

SOLUCAO = {'provido': 'Provimento', 'parcialmente provido': 'Parcial provimento', 'desprovido': 'Desprovimento',
           'prejudicado/extinto': 'Prejudicado ou extinção', 'não conhecido': 'Não conhecimento'}
ORDEM_SOL = ['Desprovimento', 'Provimento', 'Parcial provimento', 'Não conhecimento', 'Prejudicado ou extinção',
             'ED rejeitados', 'ED acolhidos']


def slug(s):
    s = unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def solucao(p):
    r = p.get('sentidoResultado') or ''
    if p.get('especie') == 'EDcl':
        if r in ('acolhidos', 'provido', 'parcialmente provido'):
            return 'ED acolhidos'
        return 'ED rejeitados' if r in ('rejeitados', 'desprovido') else None
    return SOLUCAO.get(r)


def cab_segs(e):
    segs = [s.strip(' .') for s in re.split(r'\.\s*', (e or '').split('\n')[0]) if s.strip(' .')]
    return [s for s in segs if not GENERICO.match(s.upper()) and len(s) > 3]


def questao_txt(e):
    q = secao(e, r'II\.\s*Quest[aã]o em discuss[aã]o', r'III\.\s*Raz')
    return re.sub(r'^\s*\d+\.\s*', '', q).strip()


def itens(e, ini, fim):
    """itens numerados de uma seção da ementa, sem o número"""
    t = secao(e, ini, fim)
    partes = [re.sub(r'^\s*\d+\.\s*', '', x).strip() for x in re.split(r'\n\s*(?=\d+\.\s*)', t)]
    partes = [re.split(r'\n\s*(?:_{3,}|-{3,})', x)[0].strip() for x in partes]
    return [x for x in partes if x]


SIGLAS = r'\b(ec|cf|stj|stf|tnu|inss|cpc|ctn|lc|irpj|csll|pis|cofins|sus|oab|cnis|ppp|epi|ltcat|der|dib|bpc|loas|ii|iii|iv|vi|vii|viii|ix|xi)\b'


def rotulo(s):
    s = re.sub(SIGLAS, lambda m: m.group(1).upper(), s or '')
    s = re.sub(r'\b(artigo|art\.) (\d[\w.-]*), (i|v|x)\b', lambda m: f'{m.group(1)} {m.group(2)}, {m.group(3).upper()}', s)
    for a, b in [('ministério público', 'Ministério Público'), ('justiça federal', 'Justiça Federal'),
                 ('justiça estadual', 'Justiça Estadual'), ('tribunal de justiça', 'Tribunal de Justiça'),
                 ('mato grosso do sul', 'Mato Grosso do Sul'), ('regime geral de previdência social', 'Regime Geral de Previdência Social')]:
        s = re.sub(a, b, s, flags=re.I)
    s = re.sub(r'\b(lei|decreto|tema|súmula|resolução|portaria)\s+(n[º°]\s*)?(\d)', lambda m: m.group(1).capitalize() + ' ' + m.group(3), s)
    return s[:1].upper() + s[1:]


def gerar():
    P = [json.loads(l) for l in (RAIZ / 'precedentes/precedentes.jsonl').read_text(encoding='utf-8').splitlines() if l.strip()]
    R = []
    for p in P:
        c = p.get('catalogacao') or {}
        e = p.get('ementa') or ''
        txt = normalizar(' '.join(cab_segs(e)) + ' ' + questao_txt(e)).strip() or normalizar(e[:800]).strip()
        R.append(dict(p=p, tema=c.get('temaId'), rot=c.get('temaRotulo') or '', mt=c.get('modeloTextoId'),
                      ass=p.get('assunto') or 'Sem assunto', ed=p.get('especie') == 'EDcl', sol=solucao(p),
                      txt=txt or 'sem ementa', e=e))
    tam = collections.Counter(r['tema'] for r in R if r['tema'])
    vec = TfidfVectorizer(sublinear_tf=True, ngram_range=(1, 2)).fit([r['txt'] for r in R])

    # 1. questões: fusão de temas
    temas = collections.defaultdict(list)
    for i, r in enumerate(R):
        if r['tema'] and tam[r['tema']] >= 2:
            temas[(r['ed'], r['ass'], r['tema'])].append(i)
    por_grupo = collections.defaultdict(list)
    for k in temas:
        por_grupo[k[:2]].append(k)
    questao = {}
    for g, ks in sorted(por_grupo.items(), key=lambda x: (x[0][0], x[0][1])):
        rot = collections.defaultdict(list)
        for k in sorted(ks):
            rot[re.sub(r'\W+', ' ', R[temas[k][0]]['rot'].lower()).strip()].append(k)
        blocos = list(rot.values())
        if len(blocos) > 1:
            C = np.vstack([np.asarray(vec.transform([R[i]['txt'] for k in b for i in temas[k]]).mean(axis=0)) for b in blocos])
            lab = AgglomerativeClustering(n_clusters=None, metric='cosine', linkage='average',
                                          distance_threshold=CORTE).fit_predict(C)
        else:
            lab = [0]
        for b, l in zip(blocos, lab):
            for k in b:
                questao[k] = (g, int(l))
    Q = collections.defaultdict(list)
    for k, idx in temas.items():
        Q[questao[k]].extend(idx)

    # 2–3. modelos: questão × solução
    out = []
    for q, idx in Q.items():
        sols = collections.defaultdict(list)
        for i in idx:
            if R[i]['sol']:
                sols[R[i]['sol']].append(i)
        ts = collections.Counter(R[i]['tema'] for i in idx)
        t0 = ts.most_common(1)[0][0]
        rot0 = rotulo(next(R[i]['rot'] for i in idx if R[i]['tema'] == t0))
        rot0 = re.sub(r'^Embargos de declaração · ', '', rot0)
        # rótulo curto: acrescenta o traço específico mais frequente do grupo
        if len(rot0.split()) <= 4:
            segs = collections.Counter(s.capitalize() for i in idx for s in cab_segs(R[i]['e'])
                                       if s.lower() not in rot0.lower() and len(s) < 70)
            extra = [s for s, n in segs.most_common(3) if n >= 2 and s.lower() != rot0.lower()][:1]
            if extra:
                rot0 = rot0 + '. ' + rotulo(extra[0])
        for sol, ii in sols.items():
            if len(ii) < MIN:
                continue
            X = vec.transform([R[i]['txt'] for i in ii])
            c = np.asarray(X.mean(axis=0))
            sim = cosine_similarity(X, c).ravel()
            padrao = np.array([1.0 if 'Caso em exame' in R[i]['e'] and 'Dispositivo' in R[i]['e'] else 0.0 for i in ii])
            rep = ii[int(np.argmax(sim + padrao))]
            p, e = R[rep]['p'], R[rep]['e']
            ordem = [rep] + sorted([i for i in ii if i != rep], key=lambda i: R[i]['p'].get('dataJulgamento') or '', reverse=True)
            out.append(dict(q=q, sol=sol, rot=rot0, ii=ordem, rep=rep, temas=sorted(ts), mts=sorted({R[i]['mt'] for i in ii if R[i]['mt']})))
    return R, out


TOPICOS = None


def esqueleto(contro, jurid, disp):
    base = {'_estrutura': 'padrao'}
    vazio = {'admiss': 'Conheço do {{recurso interposto}}, por preenchidos os pressupostos de admissibilidade.',
             'tutela': 'Quanto ao pedido de tutela recursal, {{análise da tutela}}.',
             'prelim': 'Cabe examinar, inicialmente, a preliminar de {{preliminar}}. {{fundamentação e conclusão da preliminar}}',
             'citnorma': '{{dispositivo normativo}}', 'citjur': '{{trecho do precedente}}',
             'desenv': '{{desenvolvimento da fundamentação}}', 'fatos': 'Na espécie, {{situação concreta}}.',
             'provas': 'O documento de ID {{ID do documento}} registra {{conteúdo da prova}}.',
             'aplic': '{{aplicação do direito aos fatos comprovados}}', 'concl': 'Assim, {{conclusão sobre a controvérsia}}.',
             'provid': '{{providências e determinações}}', 'consec': '{{tratamento dos consectários e custas}}',
             'honor': '{{tratamento dos honorários}}'}
    for t in TOPICOS:
        k = t['id']
        if k == 'contro':
            base[k] = {'texto': contro or '{{delimite a controvérsia}}', 'ativo': bool(contro)}
        elif k == 'jurid':
            base[k] = {'texto': jurid or '{{fundamentação}}', 'ativo': True}
        elif k == 'disp':
            base[k] = {'texto': disp or '{{dispositivo}}', 'ativo': True}
        elif k == 'fecho':
            base[k] = {'texto': 'É como voto.', 'ativo': True}
        else:
            base[k] = {'texto': vazio.get(k, '{{' + t['titulo'].lower() + '}}'), 'ativo': False}
    base['_topicos'] = TOPICOS
    return json.dumps(base, ensure_ascii=False)


def fmt(d):
    return f'{d[8:10]}/{d[5:7]}/{d[:4]}' if d and len(d) >= 10 else ''


def registro(R, m):
    p, e = R[m['rep']]['p'], R[m['rep']]['e']
    contro = ' '.join(itens(e, r'II\.\s*Quest[aã]o em discuss[aã]o', r'III\.\s*Raz'))
    jurid = '\n\n'.join(itens(e, r'III\.\s*Raz[oõ]es de decidir', r'IV\.\s*Dispositivo'))
    disp_it = itens(e, r'IV\.\s*Dispositivo(?: e tese)?', r'\n\s*(?:Tese de julgamento|Dispositivos? relevantes?|Jurisprud[eê]ncia relevante|_{3,}|-{3,})')
    disp = disp_it[0] if disp_it else ''
    tese = ' '.join(itens(e, r'Tese de julgamento\s*:?', r'\n\s*(?:Dispositivos? relevantes?|Jurisprud[eê]ncia relevante|_{3,}|-{3,})'))
    procs = [R[i]['p']['processo'] for i in m['ii']]
    (ed, ass), _ = m['q']
    nome = m['rot'] + ' · ' + m['sol']
    tid = '-'.join(m['temas'][:2]).lower()
    return {
        'id': f"mod-cat-{tid}-{slug(m['sol'])}",
        'processo': 'MODELO-MATRIZ · ' + nome,
        'tipo': 'Modelo', 'pronunciamento': 'Voto', 'especie': p.get('especie') or '',
        'primeiroGrau': '', 'parteNotavel': '', 'papelNotavel': '',
        'assunto': ass, 'temas': p.get('temas') or '', 'causaPedir': '',
        'tese': tese, 'fundamentacao': jurid, 'especificidades': '',
        'preliminares': '', 'honorarios': '', 'resultado': m['sol'] + (': ' + disp if disp else ''),
        'sessao': fmt(p.get('dataJulgamento') or ''),
        'fonte': (f"Catálogo de acórdãos do Relator (precedentes/catalogo-cmt), tema{'s' if len(m['temas']) > 1 else ''} "
                  f"{', '.join(m['temas'])}" + (f"; modelo de texto {', '.join(m['mts'])}" if m['mts'] else '') +
                  f". Texto da ementa do acórdão representante {p['processo']}, julgado em {fmt(p.get('dataJulgamento') or '')}; "
                  f"{len(procs)} acórdãos com a mesma questão e solução."),
        'data': p.get('dataJulgamento') or '', 'processosAssociados': '; '.join(procs),
        'especificidadesTags': '', 'classe': p.get('classe') or '', 'classeSigla': p.get('classeSigla') or p.get('especie') or '',
        'numeroProcesso': '', 'formatoModelo': 'Modelo-matriz', 'nomeModelo': nome, 'textoModelo': '',
        'esqueletoModelo': esqueleto(contro, jurid, disp), 'paragrafosModelo': '[]',
        'orgaoJulgador': p.get('orgao') or '', 'statusCuradoria': 'bruto', 'urlFonte': p.get('urlFonte') or '',
        'ementaCabecalho': e.split('\n')[0].strip(), 'ementaIntegral': e,
        'dispositivosCitados': p.get('dispositivosCitados') or '', 'jurisprudenciaCitada': p.get('jurisprudenciaCitada') or '',
        'idAnterior': '', 'especieModelo': 'voto-matriz', 'dataReferencia': p.get('dataJulgamento') or '',
        'atualizadoEm': '', 'historico': []}


def main(args):
    global TOPICOS
    arq = RAIZ / 'modelos/modelos.json'
    doc = json.loads(arq.read_text(encoding='utf-8'))
    base = next(m for m in doc['registros'] if m['especieModelo'] == 'voto-matriz' and json.loads(m['esqueletoModelo']).get('_estrutura') == 'padrao')
    TOPICOS = json.loads(base['esqueletoModelo'])['_topicos']
    R, mods = gerar()
    novos = [registro(R, m) for m in mods]
    vistos = collections.Counter()
    for n in novos:   # ids únicos
        vistos[n['id']] += 1
        if vistos[n['id']] > 1:
            n['id'] += f"-{vistos[n['id']]}"
    novos.sort(key=lambda r: (r['assunto'], r['nomeModelo']))
    outros = [m for m in doc['registros'] if not m['id'].startswith('mod-cat-')]
    print(f'{len(novos)} modelos de acórdão do catálogo ({sum(len(r["processosAssociados"].split("; ")) for r in novos)} acórdãos); '
          f'{len(outros)} outros modelos mantidos')
    if '--seco' in args:
        return novos
    doc['registros'] = outros + novos
    arq.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    return novos


if __name__ == '__main__':
    main(sys.argv[1:])
