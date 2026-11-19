#!/usr/bin/env python3
"""Perfil de monocráticas do Relator para a Triagem (indicador de decisão monocrática).

Lê a série histórica de julgados do Des. Fed. Carlos Muta (precedentes/jurisprudencia: monocráticas e
acórdãos) e o acervo fonte (acervo/fonte.json). Para cada classe e para cada assunto do acervo, conta
quantas vezes o Relator decidiu por monocrática e quantas por acórdão, em casos da mesma matéria, e
classifica as monocráticas pela hipótese (art. 932 do CPC, perda de objeto, não conhecimento,
competência, desistência etc.). Grava acervo/triagem/perfil-monocraticas.json, lido pela Triagem.

Uso:
  python3 scripts/triagem/perfil_monocraticas.py            gera o perfil
  python3 scripts/triagem/perfil_monocraticas.py --resumo   gera e mostra a cobertura por assunto

Base: anos com coleta densa das duas espécies (ver precedentes/jurisprudencia/README.md, Lacunas).
A Turma Regional de MS (2026) é a referência principal; a série 2020–2024 complementa.
"""
import argparse
import collections
import datetime as dt
import gzip
import json
import pathlib
import re
import unicodedata

RAIZ = pathlib.Path(__file__).resolve().parents[2]
JUR = RAIZ / 'precedentes' / 'jurisprudencia'
SAIDA = RAIZ / 'acervo' / 'triagem' / 'perfil-monocraticas.json'
ANOS_SERIE = (2020, 2021, 2022, 2023, 2024, 2026)
ANO_ATUAL = 2026  # Turma Regional de MS

# classe da jurisprudência -> sigla da Triagem (monitor/triagem, função abrev)
CLASSE = {
    'ApCiv': 'ApCiv', 'Ap': 'ApCiv', 'ApelRemNec': 'ApRemNec', 'ApReeNec': 'ApRemNec',
    'RemNecCiv': 'RemNec', 'ReeNec': 'RemNec', 'AI': 'AI', 'CCCiv': 'CC', 'CC': 'CC',
    'SuspApel': 'PESAp', 'SusApel': 'PESAp', 'PetCiv': 'Pet', 'TutCautAnt': 'TutCautAnt',
    'TutCautAntec': 'TutCautAnt', 'TutAntAntec': 'TutCautAnt', 'AR': 'AR', 'MSCiv': 'MS', 'MS': 'MS',
    'MSCol': 'MS', 'CumSen': 'CumSen', 'Rcl': 'Rcl',
}

# hipóteses da monocrática, na ordem de verificação sobre o dispositivo (e o início do texto)
HIP = [
    ('cancel', 'Cancelamento da distribuição (duplicidade ou erro)', 'cancelamento da distribuicao|duplicidade'),
    ('desist', 'Desistência, renúncia ou acordo homologados', 'homolog|desistenc|renuncia'),
    ('comp', 'Competência (conflito, declínio ou redistribuição)', 'conflito de competencia|declino|declaro competente|redistribu|incompeten'),
    ('perda', 'Prejudicado: perda de objeto (CPC, art. 932, III)', 'prejudicad|perda (superveniente )?d[oe] objeto'),
    ('remnc', 'Remessa necessária não conhecida (CPC, art. 496)', '__remnc__'),
    ('inadm', 'Não conhecimento: inadmissível (CPC, art. 932, III)', 'nao conhe[cç]o|nego seguimento|inadmit'),
    ('da', 'Dá provimento (CPC, art. 932, V)', 'dou provimento|dou parcial provimento|provejo'),
    ('nega', 'Nega provimento (CPC, art. 932, IV)', 'nego provimento|desprovejo'),
    ('susp', 'Pedido de efeito suspensivo ou tutela', 'efeito suspensivo|tutela|liminar'),
    ('extin', 'Extinção, satisfação ou outro desfecho', '.'),
]
HIP_RX = [(k, re.compile(rx)) for k, _, rx in HIP if rx != '__remnc__']
# causa do não conhecimento (para explicar a hipótese)
CAUSA = [
    ('preparo', 'deserção ou preparo', 'preparo|desert|custas'),
    ('tempest', 'intempestividade', 'intempestiv'),
    ('dialet', 'dialeticidade', 'dialetic'),
    ('rol', 'decisão não agravável (CPC, art. 1.015)', '1\\.015|taxativ|irrecorriv'),
    ('repres', 'representação processual', 'representacao|procuracao|capacidade postulatoria'),
    ('interesse', 'falta de interesse recursal', 'interesse recursal|falta de interesse'),
    ('valor', 'valor abaixo do limite da remessa', '496|mil salarios|limite'),
]

STOP = set('a o e de da do das dos em no na nos nas por para com sem ou ao aos as os sobre entre contra '
           'demais afins outros outras outro outra geral gerais processo processual direito acao recurso '
           'art lei e/ou etc nao sim seu sua'.split())
# matéria: termos extras para assuntos do acervo cujo rótulo do CNJ não aparece assim nos julgados
SINONIMOS = {
    'vicios de construcao': ['vicios construtivos', 'vicio construtivo', 'vicios de construcao', 'danos fisicos no imovel'],
    'indice de 28,86% lei 8.622/1993 e 8.627/1993': ['28,86'],
    'conselhos regionais e afins (anuidade)': ['anuidade'],
    'anuidades oab': ['anuidade oab', 'ordem dos advogados', 'anuidades'],
    'multas e demais sancoes': ['multa administrativa', 'auto de infracao'],
    'expurgos inflacionarios / planos economicos': ['expurgos', 'plano collor', 'plano verao', 'plano bresser'],
    'liberacao de veiculo apreendido': ['veiculo apreendido', 'liberacao do veiculo', 'apreensao de veiculo', 'perdimento'],
    'apreensao': ['apreensao', 'perdimento'],
    'cnh - carteira nacional de habilitacao': ['cnh', 'habilitacao'],
    'esbulho / turbacao / ameaca': ['reintegracao de posse', 'esbulho', 'possessoria'],
    'reintegracao': ['reintegracao de posse', 'reintegracao'],
    'sustacao/alteracao de leilao': ['leilao', 'consolidacao da propriedade', 'alienacao fiduciaria'],
    'alienacao fiduciaria': ['alienacao fiduciaria', 'consolidacao da propriedade'],
    'fies': ['fies', 'financiamento estudantil'],
    'itr/ imposto territorial rural': ['itr', 'imposto territorial rural'],
    'irpj/imposto de renda de pessoa juridica': ['irpj', 'imposto de renda pessoa juridica', 'imposto de renda da pessoa juridica'],
    'irpf/imposto de renda de pessoa fisica': ['irpf', 'imposto de renda pessoa fisica', 'imposto de renda da pessoa fisica', 'isencao de imposto de renda'],
    'pis': ['pis'], 'cofins': ['cofins'],
    'contratos bancarios': ['contrato bancario', 'contratos bancarios', 'caixa economica federal', 'cedula de credito', 'revisao contratual'],
    'cedula de credito bancario': ['cedula de credito bancario', 'ccb'],
    'cedula de credito rural': ['cedula rural', 'credito rural', 'cedula de credito rural'],
    'credito rural': ['credito rural', 'cedula rural'],
    'indenizacao por dano moral': ['dano moral', 'danos morais'],
    'indenizacao por dano material': ['dano material', 'danos materiais'],
    'inquerito / processo / recurso administrativo': ['processo administrativo', 'procedimento administrativo'],
    'anulacao e correcao de provas / questoes': ['questao da prova', 'correcao da prova', 'anulacao da questao', 'banca examinadora', 'exame de ordem'],
    'classificacao e/ou pretericao': ['pretericao', 'classificacao', 'concurso'],
    'ressarcimento do sus': ['ressarcimento ao sus', 'ressarcimento do sus', 'ressarcimento ao sistema unico de saude'],
    'fornecimento de medicamentos': ['medicamento', 'fornecimento de medicamento'],
    'oncologico': ['oncolog', 'cancer', 'neoplasia'],
    'servicos de saude': ['tratamento de saude', 'internacao hospitalar', 'cirurgia', 'sistema unico de saude'],
    'minha casa, minha vida': ['minha casa minha vida', 'pmcmv', 'mcmv'],
    'sistema financeiro da habitacao': ['sistema financeiro da habitacao', 'sfh'],
    'fgts/fundo de garantia por tempo de servico': ['fgts'],
    'pensao por morte (art. 74/9)': ['pensao por morte'],
    'aposentadoria rural (art. 48/51)': ['aposentadoria por idade rural', 'trabalhador rural', 'segurado especial', 'segurada especial'],
    'aposentadoria por incapacidade permanente': ['aposentadoria por invalidez', 'incapacidade permanente', 'beneficio por incapacidade'],
    'auxilio por incapacidade temporaria': ['auxilio-doenca', 'auxilio doenca', 'incapacidade temporaria', 'beneficio por incapacidade'],
    'pessoa com deficiencia': ['beneficio assistencial', 'bpc', 'loas', 'pessoa com deficiencia'],
    'aposentadoria por tempo de contribuicao (art. 55/6)': ['aposentadoria por tempo de contribuicao', 'tempo de contribuicao'],
    'aposentadoria especial (art. 57/8)': ['aposentadoria especial', 'atividade especial', 'tempo especial'],
    'aposentadoria hibrida (art. 48/106)': ['aposentadoria hibrida', 'aposentadoria por idade hibrida'],
    'contribuicoes previdenciarias': ['contribuicao previdenciaria', 'contribuicoes previdenciarias'],
    'contribuicao sobre a folha de salarios': ['folha de salarios', 'contribuicao previdenciaria patronal'],
    'reducao de aliquota ir/csll - servicos hospitalares': ['servicos hospitalares'],
    'taxa de fiscalizacao ambiental': ['tcfa', 'taxa de controle e fiscalizacao ambiental'],
    'indenizacao por dano ambiental': ['dano ambiental'],
    'ambiental': ['ambiental', 'ibama', 'meio ambiente'],
    'registro / porte de arma de fogo': ['arma de fogo', 'porte de arma', 'registro de arma'],
    'acidente de transito': ['acidente de transito', 'colisao'],
    'adicional de insalubridade': ['insalubridade'],
    '1/3 de ferias': ['terco de ferias', 'terco constitucional', '1/3 de ferias'],
    'abono pecuniario (art. 78 lei 8.112/1990)': ['abono pecuniario', 'ferias'],
    'simples': ['simples nacional'],
    'iptu/ imposto predial e territorial urbano': ['iptu'],
    'telefonia': ['telefonia', 'anatel'],
    'metrologica': ['inmetro', 'metrolog'],
    'cota para ingresso - acoes afirmativas': ['cotas', 'heteroidentificacao', 'acoes afirmativas'],
    'progressao funcional com intersticio de doze meses': ['progressao funcional', 'intersticio'],
    'processo administrativo disciplinar ou sindicancia': ['processo administrativo disciplinar', 'pad', 'sindicancia'],
    'demissao ou exoneracao': ['demissao', 'exoneracao'],
    'acidente de trabalho - ressarcimento ao erario': ['acao regressiva', 'acidente de trabalho'],
    'restituicao ao erario': ['restituicao ao erario', 'devolucao de valores', 'reposicao ao erario'],
    'descontos indevidos': ['descontos indevidos', 'desconto em beneficio', 'emprestimo consignado'],
    'adidos, agregados e adjuntos': ['agregado', 'adido', 'militar'],
    'reforma': ['reforma militar', 'reforma ex officio', 'militar'],
    'pensao': ['pensao'],
    'concurso publico / edital': ['concurso publico', 'edital'],
    'inscricao / documentacao': ['inscricao no conselho', 'inscricao na ordem', 'registro profissional', 'inscricao profissional'],
    'registro profissional': ['registro profissional', 'conselho regional'],
    'profissional': ['conselho regional', 'exercicio profissional'],
}

LIMIAR_GENERICO = 0.20  # termo que aparece em mais de 20% dos julgados não identifica matéria


def nz(s):
    s = unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', s.lower()).strip()


def ler(pasta, ano):
    p = JUR / pasta / f'{ano}.json.gz'
    if not p.exists():
        return []
    d = json.load(gzip.open(p, 'rt', encoding='utf-8'))
    return d.get('registros', d) if isinstance(d, dict) else d


def corpo_mono(r):
    t = r.get('inteiro_teor') or ''
    i = min([x for x in (t.find('Trata-se'), t.find('Vistos'), t.find('Cuida-se')) if x >= 0] or [0])
    f = t.find('DECIDO', i)
    trecho = t[i:(f if f > i else i + 2200)][:2200]
    return trecho + ' ' + dispositivo(r)


def corpo_acd(r):
    t = r.get('ementa') or ''
    m = re.search(r'(DIREITO|EMENTA|PROCESSUAL|PREVIDENCI|TRIBUT|ADMINISTRATIV|CONSTITUCIONAL|CIVIL)', t)
    return t[m.start() if m else 0:][:1800]


_DISP = re.compile(r'(Ante o exposto|Do exposto|Pelo exposto|Em face do exposto|Diante do exposto|Isto posto|Isso posto|Posto isso|Nesses termos|Em vista do exposto)[^\n]*', re.I)


def dispositivo(r):
    """Dispositivo da monocrática; se a coleta não o separou, o último parágrafo conclusivo do inteiro teor."""
    d = (r.get('dispositivo') or '').strip()
    if d:
        return d
    t = r.get('inteiro_teor') or ''
    m = list(_DISP.finditer(t))
    return m[-1].group(0) if m else t[-600:]


def hipotese(disp, texto, cl):
    d = nz(disp)
    if cl == 'RemNec' and re.search('nao conhe', d):
        return 'remnc'
    for k, rx in HIP_RX:
        if rx.search(d):
            return k
    return 'extin'


def causa(texto):
    t = nz(texto)
    for k, rot, rx in CAUSA:
        if re.search(rx, t):
            return k
    return ''


def termos_do_assunto(a):
    k = nz(a)
    sin = {nz(x): v for x, v in SINONIMOS.items()}
    if k in sin:
        return [nz(x) for x in sin[k]]
    base = re.sub(r'\(art\.[^)]*\)', ' ', k)
    alts = [x.strip() for x in re.split(r'[/;]| - ', base) if x.strip()]
    out = []
    for x in alts:
        ws = [w for w in re.findall(r'[a-z0-9,]+', x) if w not in STOP and len(w) > 2]
        if ws:
            out.append(' '.join(ws))
    return out or [k]


_RX = {}


def rx_termo(termo):
    """Palavras do termo na ordem, cada uma pela raiz (6 letras; palavra curta inteira),
    admitidas até duas palavras curtas entre elas (de, da, do, a, o...)."""
    if termo not in _RX:
        ws = termo.split()
        partes = [(re.escape(w[:6]) + r'\w*') if len(w) > 5 else (re.escape(w) + r'\b') for w in ws]
        _RX[termo] = re.compile(r'\b' + r'(?:\W+\w{1,3}){0,2}\W+'.join(partes))
    return _RX[termo]


def casa(termo, texto):
    return rx_termo(termo).search(texto) is not None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--resumo', action='store_true')
    a = ap.parse_args()

    docs = []  # (tipo, ano, cl, texto_nz, registro)
    for ano in ANOS_SERIE:
        for r in ler('monocraticas', ano):
            cl = CLASSE.get(r.get('classe_sigla'), r.get('classe_sigla') or '?')
            docs.append(('M', ano, cl, nz(corpo_mono(r)), r))
        for r in ler('acordaos', ano):
            if (r.get('atuacao_muta') or 'relator') != 'relator':
                continue
            cl = CLASSE.get(r.get('classe_sigla'), r.get('classe_sigla') or '?')
            docs.append(('A', ano, cl, nz(corpo_acd(r)), r))

    def vazio():
        return {'m': 0, 'a': 0, 'm26': 0, 'a26': 0, 'hip': collections.Counter(), 'hip26': collections.Counter(), 'causa': collections.Counter()}

    def soma(acc, tipo, ano, h, c):
        if tipo == 'M':
            acc['m'] += 1
            acc['hip'][h] += 1
            if c:
                acc['causa'][c] += 1
            if ano == ANO_ATUAL:
                acc['m26'] += 1
                acc['hip26'][h] += 1
        else:
            acc['a'] += 1
            if ano == ANO_ATUAL:
                acc['a26'] += 1

    def sai(acc):
        o = {k: acc[k] for k in ('m', 'a', 'm26', 'a26')}
        o['hip'] = dict(acc['hip'].most_common())
        o['hip26'] = dict(acc['hip26'].most_common())
        if acc['causa']:
            o['causa'] = dict(acc['causa'].most_common())
        return o

    hips = []
    for tipo, ano, cl, txt, r in docs:
        if tipo == 'M':
            h = hipotese(dispositivo(r), txt, cl)
            c = causa(txt) if h in ('inadm', 'remnc') else ''
        else:
            h = c = ''
        hips.append((h, c))

    classes = collections.defaultdict(vazio)
    for (tipo, ano, cl, txt, r), (h, c) in zip(docs, hips):
        soma(classes[cl], tipo, ano, h, c)

    # assuntos presentes no acervo fonte
    fonte = json.load(open(RAIZ / 'acervo' / 'fonte.json', encoding='utf-8'))['registros']
    assuntos = collections.Counter()
    for f in fonte:
        s = str(f.get('assunto_judicial') or f.get('Assunto') or '').strip()
        if s:
            assuntos[s] += 1

    n_docs = len(docs)
    perfil_ass = {}
    exemplos = {}
    for s, n_acervo in assuntos.most_common():
        termos = termos_do_assunto(s)
        hits = [i for i, d in enumerate(docs) if any(casa(t, d[3]) for t in termos)]
        generico = len(hits) / max(1, n_docs) > LIMIAR_GENERICO
        tot, por_cl = vazio(), collections.defaultdict(vazio)
        for i in hits:
            tipo, ano, cl, txt, r = docs[i]
            h, c = hips[i]
            soma(tot, tipo, ano, h, c)
            soma(por_cl[cl], tipo, ano, h, c)
        # paradigmas: monocráticas mais recentes da matéria, por classe e hipótese (2026 primeiro)
        mono = [i for i in hits if docs[i][0] == 'M']
        mono.sort(key=lambda i: (docs[i][4].get('data_decisao_iso') or ''), reverse=True)
        ex_cl = collections.defaultdict(list)
        vistos = collections.defaultdict(set)
        for i in mono:
            cl = docs[i][2]
            h = hips[i][0]
            if len(ex_cl[cl]) >= 6 or (h in vistos[cl] and len(ex_cl[cl]) >= 3):
                continue
            vistos[cl].add(h)
            r = docs[i][4]
            ex_cl[cl].append(r['id'])
            if r['id'] not in exemplos:
                disp = re.sub(r'\s+', ' ', dispositivo(r)).strip()
                disp = re.split(r'(?<=\.)\s+(Comunique|Intime|Publique|Oportunamente|Campo Grande|S[aã]o Paulo|Int\.)', disp)[0]
                txt = re.sub(r'\s+', ' ', corpo_mono(r)).strip()
                txt = re.sub(r'^(Vistos\.?\s*)', '', txt)
                exemplos[r['id']] = {
                    'n': r.get('numero_processo'), 'cl': cl, 'd': r.get('data_decisao_iso'), 'h': hips[i][0],
                    'o': r.get('orgao_julgador'), 'r': disp[:320], 'e': txt[:300], 'u': r.get('link_impressao') or r.get('link_pje'),
                }
        perfil_ass[nz(s)] = {
            'rotulo': s, 'acervo': n_acervo, 'termos': termos, 'generico': generico,
            'total': sai(tot), 'classes': {cl: sai(v) for cl, v in sorted(por_cl.items()) if v['m'] + v['a']},
            'paradigmas': dict(ex_cl),
        }

    # processos da fonte já decididos pelo Relator: decisão (monocrática ou acórdão) na série com data igual ou
    # posterior à distribuição no gabinete. A Triagem tira esses processos do indicador e os mostra à parte.
    dg = lambda v: re.sub(r'\D', '', str(v or ''))
    dist = {dg(f.get('processo')): str(f.get('data_distribuição') or '')[:10] for f in fonte}
    decididos = collections.defaultdict(list)
    for ano in sorted(set(ANOS_SERIE) | {ANO_ATUAL}):
        for tipo, pasta in (('M', 'monocraticas'), ('A', 'acordaos')):
            for r in ler(pasta, ano):
                d = dg(r.get('numero_processo'))
                if d not in dist:
                    continue
                data = r.get('data_decisao_iso') or r.get('data_julgamento_iso') or ''
                if data < (dist[d] or f'{ANO_ATUAL}-01-01'):
                    continue
                res = dispositivo(r) if tipo == 'M' else (r.get('resultado_colegiado') or '')
                decididos[d].append({'t': tipo, 'd': data, 'c': CLASSE.get(r.get('classe_sigla'), r.get('classe_sigla')),
                                     'r': re.sub(r'\s+', ' ', res).strip()[:200], 'u': r.get('link_impressao') or r.get('link_pje')})
    for d in decididos:
        decididos[d].sort(key=lambda x: x['d'])

    out = {
        'schema': 'gabcmt.triagem.perfil-monocraticas',
        'versao': 1,
        'atualizadoEm': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
        'descricao': ('Perfil das decisões do Relator por classe e assunto: monocráticas (m) e acórdãos (a) na série '
                      + ', '.join(map(str, ANOS_SERIE)) + '; m26 e a26 só ' + str(ANO_ATUAL)
                      + ' (Turma Regional de MS). Fonte: precedentes/jurisprudencia. Gerado por scripts/triagem/perfil_monocraticas.py.'),
        'base': {'anos': list(ANOS_SERIE), 'anoAtual': ANO_ATUAL, 'julgados': n_docs,
                 'monocraticas': sum(1 for d in docs if d[0] == 'M'), 'acordaos': sum(1 for d in docs if d[0] == 'A'),
                 'limiarGenerico': LIMIAR_GENERICO},
        'hipoteses': {k: rot for k, rot, _ in HIP},
        'causas': {k: rot for k, rot, _ in CAUSA},
        'classes': {cl: sai(v) for cl, v in sorted(classes.items(), key=lambda x: -(x[1]['m'] + x[1]['a']))},
        'assuntos': perfil_ass,
        'exemplos': exemplos,
        'decididos': dict(decididos),
    }
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{SAIDA.relative_to(RAIZ)}: {len(perfil_ass)} assuntos, {len(exemplos)} paradigmas, '
          f'{out["base"]["monocraticas"]} monocráticas e {out["base"]["acordaos"]} acórdãos, '
          f'{len(decididos)} processos da fonte já decididos, {SAIDA.stat().st_size // 1024} KB')
    if a.resumo:
        for cl, v in list(out['classes'].items())[:12]:
            print(f'  {cl:10} m26 {v["m26"]:4} a26 {v["a26"]:5} | série m {v["m"]:5} a {v["a"]:5} | {list(v["hip26"].items())[:4]}')
        for k, v in list(perfil_ass.items())[:60]:
            t = v['total']
            print(f'  {v["acervo"]:3} {v["rotulo"][:48]:48} m26 {t["m26"]:4} a26 {t["a26"]:4} m {t["m"]:5} a {t["a"]:5}'
                  + (' GENÉRICO' if v['generico'] else ''))


if __name__ == '__main__':
    main()
