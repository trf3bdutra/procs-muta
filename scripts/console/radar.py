#!/usr/bin/env python3
"""Radar semanal de precedentes vinculantes (Claude API com busca na web).

Pesquisa o que mudou nos últimos dias em temas do STF e do STJ, súmulas, Manual de Cálculos e
legislação, nas matérias do acervo, e cruza cada tema com o que o gabinete usa: diz quais
modelos, módulos da matriz e parágrafos-padrão citam o tema e podem precisar de ajuste.

Saída: relatorios/radar/AAAA-MM-DD.md

Uso:
  python3 scripts/console/radar.py              # janela de 7 dias até hoje
  python3 scripts/console/radar.py --dias 14
  python3 scripts/console/radar.py --ensaio     # não chama a API: mostra a lista de temas vigiados
"""
import argparse
import collections
import json
import re
import sys

from comum import RAIZ, RELATORIOS, MODELO, HOJE, aviso, cliente, chamar, texto, gravar, br
import datetime as dt

MATERIAS = ('previdenciário (incapacidade, tempo especial, rural e segurado especial, BPC/LOAS, pensão, revisões e decadência); '
            'consectários contra a Fazenda (EC 113/2021, EC 136/2025, Temas 810, 905, 1.419 e 1.484, ADI 7.873); gratuidade (Tema 1.178/STJ, ADC 80); '
            'tributário (PIS/COFINS, Tema 69 e derivados, IRPF, compensação); execução fiscal e conselhos (Tema 1.184/STF, Tema 1.193/STJ, Resolução CNJ 547/2024); '
            'execução coletiva do 28,86% (Temas 1.075, 733 e 499/STF; Temas 1.433 e 1.302/STJ); perdimento aduaneiro; servidor público; FGTS; '
            'saúde (Temas 6, 500 e 1.234); processo (Temas 988, 1.059, 1.076, 1.201 e 1.306)')
FONTES = [RAIZ / 'modelos' / 'modelos.json', RAIZ / 'modelos' / 'matrizes-2886.json', RAIZ / 'modelos' / 'paragrafos.json',
          RAIZ / 'modelos' / 'matrizes-estruturais.json'] + sorted((RAIZ / 'padrao' / 'lia').glob('Catalogo_*.txt'))
RE_TEMA = re.compile(r'Tema\s+(?:n[º°]\s*)?(\d{1,2}\.\d{3}|\d{1,4})\s*(?:/|do|da|-)?\s*(STF|STJ)?', re.I)


def norm(n):
    n = n.replace('.', '')
    return '{:,}'.format(int(n)).replace(',', '.')


def temas_do_gabinete():
    """{(tribunal, número): {arquivo: [ids]}} a partir dos modelos, matrizes, parágrafos e catálogos."""
    T = collections.defaultdict(lambda: collections.defaultdict(set))
    for arq in FONTES:
        if not arq.exists():
            continue
        if arq.suffix == '.json':
            d = json.loads(arq.read_text(encoding='utf-8'))
            itens = d.get('registros') or d.get('modulos') or []
            if arq.name == 'matrizes-2886.json':
                itens = [{'id': m['id'] + ' · ' + v.get('rotulo', ''), 't': ' '.join(v['paragrafos'])} for m in d['modulos'] for v in m['versoes']]
            for x in itens:
                s = json.dumps(x, ensure_ascii=False)
                rot = x.get('id') or x.get('titulo') or '?'
                if x.get('nomeModelo'):
                    rot += ' (' + x['nomeModelo'][:70] + ')'
                for m in RE_TEMA.finditer(s):
                    T[(m.group(2) or '?').upper(), norm(m.group(1))][arq.name].add(rot)
        else:
            for i, l in enumerate(arq.read_text(encoding='utf-8').split('\n')):
                for m in RE_TEMA.finditer(l):
                    T[(m.group(2) or '?').upper(), norm(m.group(1))][arq.name].add('linha %d' % (i + 1))
    return T


def ultimo_radar():
    L = sorted((RELATORIOS / 'radar').glob('*.md'))
    return (L[-1].name, L[-1].read_text(encoding='utf-8')[:8000]) if L else ('', '')


def onde(T, trib, num):
    U = collections.defaultdict(set)
    for k in [(trib, num), ('?', num)]:
        for arq, ids in T.get(k, {}).items():
            U[arq] |= ids
    linhas = []
    for arq, ids in sorted(U.items()):
        ids = sorted(ids)
        linhas.append('  - %s: %s%s' % (arq, ', '.join(ids[:8]), ' e mais %d' % (len(ids) - 8) if len(ids) > 8 else ''))
    return linhas


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dias', type=int, default=7)
    ap.add_argument('--ensaio', action='store_true')
    a = ap.parse_args()
    T = temas_do_gabinete()
    vig = sorted(((k, sum(len(v) for v in T[k].values())) for k in T if k[0] != '?'), key=lambda x: -x[1])
    lista = ', '.join('Tema %s/%s' % (k[1], k[0]) for k, _ in vig[:80])
    ini = HOJE - dt.timedelta(days=a.dias)
    nome_ant, ant = ultimo_radar()
    if a.ensaio:
        print('%d temas citados nos modelos; os 80 mais usados vão ao radar:' % len(vig)); print(lista)
        print('radar anterior:', nome_ant or '(nenhum)'); return
    sistema = ('Você faz o radar semanal de precedentes vinculantes do gabinete do Des. Fed. Carlos Muta (TRF-3, Turma Regional de Mato Grosso do Sul). '
               'Responda em português do Brasil, texto direto, uma ideia por frase. Não invente número de tema, data, tese ou link: '
               'só o que estiver confirmado em fonte oficial (portal.stf.jus.br, stj.jus.br, processo.stj.jus.br/repetitivos, cjf.jus.br, cnj.jus.br, trf3.jus.br, planalto.gov.br, in.gov.br). '
               'O que depender do Relator ou de confirmação fica marcado [VALIDAR].')
    pedido = f"""Janela: {br(ini)} a {br(HOJE)}.

1. Pesquise o que mudou na janela em: temas de repercussão geral e recursos repetitivos (afetação, julgamento, tese fixada ou revista, modulação, suspensão nacional, cancelamento); súmulas novas; resoluções do CJF sobre o Manual de Cálculos; emendas constitucionais, leis e medidas provisórias que afetem a Justiça Federal.
2. Matérias do acervo: {MATERIAS}.
3. Temas que o gabinete cita nos seus modelos (vigie também estes): {lista}.
4. Para cada novidade confirmada: o que mudou (tese, data, modulação, alcance da suspensão), a fonte com link e o impacto prático nos votos do gabinete, com sugestão de redação no padrão do gabinete ("artigo" por extenso, leis sem "nº", tribunal por extenso no corpo, tese transcrita entre aspas).
5. Não repita o que o radar anterior já trouxe, salvo fato novo sobre o mesmo tema.
6. Formato: título "# Radar de precedentes — {br(ini)} a {br(HOJE)}"; uma seção por matéria, só com novidades; ao fim, "## Fontes" com os links. Sem novidade relevante: uma linha dizendo isso.
7. Na última linha, e só nela, a lista dos temas tratados no formato exato <<<TEMAS [{{"tribunal":"STF","numero":"1.075"}}] TEMAS>>> (lista vazia se nenhum).

Radar anterior ({nome_ant or 'nenhum'}):
{ant or '(não há)'}"""
    cli = cliente()
    base = dict(model=MODELO['forte'], max_tokens=16000, system=sistema, messages=[{'role': 'user', 'content': pedido}])
    busca = {'type': 'web_search_20250305', 'name': 'web_search', 'max_uses': 25}
    leitura = {'type': 'web_fetch_20250910', 'name': 'web_fetch', 'max_uses': 15}
    try:
        msg = chamar(cli, tools=[busca, leitura], extra_headers={'anthropic-beta': 'web-fetch-2025-09-10'}, **base)
    except Exception as ex:
        aviso('leitura de páginas indisponível (%s); seguindo só com a busca' % str(ex)[:120])
        msg = chamar(cli, tools=[busca], **base)
    rel = texto(msg)
    m = re.search(r'<<<TEMAS\s*(\[.*?\])\s*TEMAS>>>', rel, re.S)
    temas = []
    if m:
        try:
            temas = json.loads(m.group(1))
        except Exception:
            temas = []
        rel = rel[:m.start()].rstrip()
    cruz = []
    for t in temas:
        trib = str(t.get('tribunal', '?')).upper(); num = norm(re.sub(r'[^\d.]', '', str(t.get('numero', '0'))) or '0')
        L = onde(T, trib, num)
        cruz.append('- **Tema %s/%s**' % (num, trib) + (':\n' + '\n'.join(L) if L else ': não aparece nos modelos, matrizes, parágrafos ou catálogos do gabinete.'))
    if cruz:
        rel += '\n\n## Onde o gabinete usa esses temas\n\nBusca no repositório (modelos, matrizes, parágrafos-padrão e catálogos da LIA). Conferir cada um antes de alterar.\n\n' + '\n'.join(cruz)
    rel += '\n\n---\nGerado pela API do Claude (%s) em %s.\n' % (MODELO['forte'], br(HOJE))
    gravar(RELATORIOS / 'radar' / ('%s.md' % HOJE.isoformat()), rel)


if __name__ == '__main__':
    main()
