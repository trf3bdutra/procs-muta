#!/usr/bin/env python3
"""Auditoria mensal do padrão de redação (contagem local + análise pela API do Claude).

Mede, mês a mês, a porcentagem de ementas, votos e decisões monocráticas com cada desvio da lista
de caça do gabinete, separa exemplos reais e pede ao modelo a leitura das tendências e as sugestões
para a lista de caça e o "Padrão de ementa do gabinete". A contagem é feita aqui, em Python; o
modelo só interpreta a tabela (não conta nada).

Saída: relatorios/auditoria/AAAA-MM.md

Uso:
  python3 scripts/console/auditoria.py                 # mês anterior, comparado aos três anteriores
  python3 scripts/console/auditoria.py --mes 2026-10
  python3 scripts/console/auditoria.py --ensaio        # só a tabela, sem chamar a API
"""
import argparse
import collections
import re

from comum import RELATORIOS, MODELO, HOJE, aviso, cliente, chamar, texto, gravar, serie, ementa, secao, sem_transcricoes

TIT_CAPS = re.compile(r'^\s*(I\. CASO EM EXAME|II\. QUEST[ÃA]O EM DISCUSS[ÃA]O|III\. RAZ[ÕO]ES DE DECIDIR|IV\. DISPOSITIVO)', re.M)


def partes_ementa(e):
    cnj = bool(re.search(r'Caso em exame|CASO EM EXAME', e))
    cab, rod = e, ''
    m = re.search(r'\n\s*(_{3,}|-{3,})?\s*\n?\s*Dispositivos? relevantes? citados?|\n\s*Jurisprud[êe]ncia relevante citada|\n\s*Legisla[çc][ãa]o relevante citada', e)
    if m:
        cab, rod = e[:m.start()], e[m.start():]
    caso = re.search(r'Caso em exame\s*(.*?)(?:II\.\s*Quest|II\.\s*QUEST)', e, re.S | re.I)
    quest = re.search(r'Quest[ãa]o em discuss[ãa]o\s*(.*?)(?:III\.\s*Raz|III\.\s*RAZ)', e, re.S | re.I)
    return cnj, cab, rod, caso.group(1) if caso else '', quest.group(1) if quest else ''


def numeracao_ruim(e):
    ns = [int(x) for x in re.findall(r'^\s*(\d{1,2})\.\s?\S', e, re.M)]
    return bool(ns) and ns != list(range(ns[0], ns[0] + len(ns))) or (ns and ns[0] != 1)


def frases(t):
    return [f for f in re.split(r'(?<=[.;:])\s+(?=[A-ZÁÉÍÓÚ0-9(“"])', t.replace('\n', ' ')) if f.strip()]


# (nome, alvo, função(registro_preparado) -> trecho ou None)
def rx(pat, flags=0, campo='txt'):
    r = re.compile(pat, flags)
    def f(P):
        t = P.get(campo, '') or ''
        m = r.search(t)
        return ' '.join(t[max(0, m.start() - 70):m.end() + 50].split()) if m else None
    return f


DESVIOS = [
    ('Títulos da ementa em caixa alta', 'ementa', lambda P: (lambda m: m.group(0).strip() if m else None)(TIT_CAPS.search(P['cab'])) if P['cnj'] else None),
    ('"IV. Dispositivo e tese" sem tese', 'ementa', lambda P: 'Dispositivo e tese' if P['cnj'] and re.search(r'Dispositivo e tese', P['txt'], re.I) and not re.search(r'Tese de julgamento', P['txt'], re.I) else None),
    ('Numeração reiniciada ou com salto', 'ementa', lambda P: 'numeração' if P['cnj'] and numeracao_ruim(P['cab']) else None),
    ('Separador com hífens ou ausente', 'ementa', lambda P: 'separador' if P['rod'] and not re.search(r'_{5,}', P['txt'][-len(P['rod']) - 40:]) else None),
    ('"Legislação relevante citada"', 'ementa', rx(r'Legisla[çc][ãa]o relevante citada')),
    ('"TRF3" sem hífen', 'ementa', rx(r'\bTRF3\b')),
    ('"art." ou "nº" no rodapé', 'ementa', rx(r'\bart\.|\bn[º°]\s?\d', campo='rod')),
    ('"CF," sem /1988 no rodapé', 'ementa', rx(r'\bCF,', campo='rod')),
    ('"CF/88"', 'ementa', rx(r'CF/88')),
    ('TNU no rodapé', 'ementa', rx(r'\bTNU\b', campo='rod')),
    ('"Trata-se de" no caso em exame', 'ementa', rx(r'\bTrata-se de', re.I, campo='caso')),
    ('"definir/verificar se" na questão', 'ementa', rx(r'\b(definir|verificar|analisar|examinar) se\b', re.I, campo='quest')),
    ('Item 2 sem a fórmula de abertura', 'ementa', lambda P: P['quest'].strip()[:60] if P['cnj'] and P['quest'].strip() and not re.match(r'\s*2\.\s*(A quest[ãa]o em discuss[ãa]o consiste em saber se|H[áa] (duas|tr[êe]s|quatro|cinco) quest)', P['quest']) else None),
    ('ID de documento na ementa', 'ementa', rx(r'\(IDs?\s*\d{6,}')),
    ('"apontados destacados"', 'ementa', rx(r'apontados destacados', re.I)),
    ('Aglutinações', 'ementa', rx(r'embargosde|Naesp[ée]cie|\b\d{1,2}\.[A-ZÁÉÍÓÚ][a-z]')),
    ('Frase com mais de 40 palavras', 'ementa', lambda P: (lambda f: f[:90] if f else None)(next((f for f in frases(P['cab']) if len(f.split()) > 40), None))),
    ('"j. data" no rodapé', 'ementa', rx(r'\bj\.\s*\d', campo='rod')),
    ('Data com pontos no rodapé', 'ementa', rx(r'\b\d{2}\.\d{2}\.\d{4}\b', campo='rod')),
    ('"União Federal"', 'todos', rx(r'Uni[ãa]o Federal')),
    ('"a r. sentença"', 'todos', rx(r'\ba r\. senten', re.I)),
    ('"Nesse sentido"', 'todos', rx(r'\bNesse sentido\b')),
    ('"Por outro lado"', 'todos', rx(r'\bPor outro lado\b')),
    ('"Outrossim"', 'todos', rx(r'\bOutrossim\b')),
    ('Latinismos', 'todos', rx(r'\b(in casu|mandamus|writ|decisum)\b', re.I)),
    ('"apontados destacados" (voto/decisão)', 'texto', rx(r'apontados destacados', re.I)),
    ('Aglutinações (voto/decisão)', 'texto', rx(r'embargosde|Naesp[ée]cie')),
]


def preparar(r):
    if r['_especie'] == 'acordao':
        e = ementa(r)
        cnj, cab, rod, caso, quest = partes_ementa(e)
        voto = sem_transcricoes(secao(r.get('inteiro_teor'), 'VOTO'))
        return [('ementa', {'txt': e, 'cab': cab, 'rod': rod, 'caso': caso, 'quest': quest, 'cnj': cnj}),
                ('voto', {'txt': voto})] if e else [('voto', {'txt': voto})]
    return [('mono', {'txt': sem_transcricoes(str(r.get('inteiro_teor') or ''))})]


def aplica(alvo, tipo):
    return alvo == tipo or (alvo == 'todos') or (alvo == 'texto' and tipo in ('voto', 'mono'))


def meses_ate(mes, n=4):
    a, m = map(int, mes.split('-'))
    L = []
    for _ in range(n):
        L.append('%04d-%02d' % (a, m)); m -= 1
        if m == 0: a, m = a - 1, 12
    return list(reversed(L))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ant = HOJE.replace(day=1) - __import__('datetime').timedelta(days=1)
    ap.add_argument('--mes', default=ant.strftime('%Y-%m'))
    ap.add_argument('--ensaio', action='store_true')
    a = ap.parse_args()
    MES = meses_ate(a.mes)
    base = collections.Counter(); hits = collections.Counter(); ex = collections.defaultdict(list)
    for r in serie(de=MES[0][:4], ate=MES[-1][:4]):
        mm = r['_data'][:7]
        if mm not in MES:
            continue
        for tipo, P in preparar(r):
            if not P['txt'].strip():
                continue
            base[(mm, tipo)] += 1
            if tipo == 'ementa' and P.get('cnj'):
                base[(mm, 'ementa-cnj')] += 1
            for nome, alvo, f in DESVIOS:
                if not aplica(alvo, tipo):
                    continue
                t = f(P)
                if t:
                    hits[(mm, tipo, nome)] += 1
                    if mm == a.mes and len(ex[nome]) < 3:
                        ex[nome].append((r.get('numero_processo', ''), ' '.join(str(t).split()[:18])))
    rot = {'ementa': 'Ementas', 'voto': 'Votos (acórdãos)', 'mono': 'Decisões monocráticas'}
    L = ['| Mês | ' + ' | '.join(rot[t] for t in rot) + ' | Ementas no padrão CNJ |', '|---|---|---|---|---|']
    for mm in MES:
        L.append('| %s | %s | %s | %s | %s |' % (mm, base[(mm, 'ementa')], base[(mm, 'voto')], base[(mm, 'mono')], base[(mm, 'ementa-cnj')]))
    tabela = ['| Desvio | Onde | ' + ' | '.join(MES) + ' |', '|---|---|' + '---|' * len(MES)]
    linhas = []
    for nome, alvo, _ in DESVIOS:
        for tipo in ('ementa', 'voto', 'mono'):
            if not aplica(alvo, tipo):
                continue
            pct = []
            for mm in MES:
                b = base[(mm, tipo)]
                pct.append(100.0 * hits[(mm, tipo, nome)] / b if b else None)
            if not any(pct):
                continue
            linhas.append((pct[-1] or 0, '| %s | %s | %s |' % (nome, rot[tipo], ' | '.join('—' if p is None else ('%.1f%%' % p).replace('.', ',') for p in pct))))
    tabela += [l for _, l in sorted(linhas, key=lambda x: -x[0])]
    exemplos = '\n'.join('- %s — %s: “%s”' % (nome, p, t) for nome, L2 in ex.items() for p, t in L2)
    dados = '## Base\n\n' + '\n'.join(L) + '\n\n## Desvios (porcentagem dos documentos com ao menos uma ocorrência)\n\n' + '\n'.join(tabela) + '\n\n## Exemplos de ' + a.mes + '\n\n' + (exemplos or '(nenhum)')
    if a.ensaio:
        print(dados); return
    anteriores = sorted((RELATORIOS / 'auditoria').glob('*.md'))
    prev = anteriores[-1].read_text(encoding='utf-8')[:6000] if anteriores else '(não há)'
    sistema = ('Você analisa a auditoria mensal do padrão de redação do gabinete do Des. Fed. Carlos Muta (TRF-3). Português do Brasil, texto direto. '
               'Os números da tabela foram contados por script: não recalcule nem invente números. Use só os exemplos fornecidos.')
    pedido = f"""Mês auditado: {a.mes}; comparação: {', '.join(MES[:-1])}.

Escreva o relatório em Markdown com:
# Auditoria mensal do padrão de redação — {a.mes}
- Um parágrafo de contexto: tamanho da base em cada mês e qualquer mês claramente incompleto.
## (a) Desvios mais frequentes — a tabela abaixo, reduzida aos desvios que importam, com uma coluna "Tendência" (↑, ↓, ≈) e uma frase de leitura quando houver mudança forte.
## (b) Exemplos — até 5, dos fornecidos, com número do processo e trecho de até 15 palavras.
## (c) Sugestões — itens novos ou ajustes para a lista de caça e para o "Padrão de ementa do gabinete", só se a tabela mostrar padrão recorrente; diga o que fazer com os itens sugeridos na auditoria anterior.
Termine com: "Nada foi alterado no repositório."

{dados}

Auditoria anterior (para comparar sugestões):
{prev}"""
    cli = cliente()
    msg = chamar(cli, model=MODELO['forte'], max_tokens=8000, system=sistema, messages=[{'role': 'user', 'content': pedido}])
    rel = texto(msg) + '\n\n<details><summary>Tabela completa (contagem do script)</summary>\n\n' + dados + '\n\n</details>\n\n---\nContagem local; análise pela API do Claude (%s).\n' % MODELO['forte']
    gravar(RELATORIOS / 'auditoria' / ('%s.md' % a.mes), rel)


if __name__ == '__main__':
    main()
