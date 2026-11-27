# -*- coding: utf-8 -*-
"""Sincroniza a planilha "Monocráticas terminativas — matriz por grau de certeza" (Google Sheets) com a ficha.

A ficha (acervo/operacional.json) é a fonte única: é dela que o Cognitio (aba Monocráticas), o Caput e o Ex Officio leem.
A planilha é uma vista de trabalho. Duas colunas são editadas pela equipe e voltam para a ficha:
  K · Incluído no PJe  → producao."Minuta no PJe" (Sim) e "Minuta no PJe - Data" (dd/mm/aaaa no texto, se houver; sem data, fica só o Sim)
  L · Assinado         → producao."Assinado" (Sim) e "Data da Assinatura" (dd/mm/aaaa no texto, se houver)
"Não" ou vazio na planilha não apaga o que a ficha já tem (a divergência é informada). Texto começando por "Conferir"
fica como está, nos dois sentidos.
Depois da gravação, a planilha recebe da ficha: K e L recalculados, M · ID da decisão, N · Destino (situação),
O · Ficha (data da sincronização) e P · Pronto para julgar.
P separa o estado dos autos da certeza do tipo de caso (coluna B): "Sim" quando nada falta nos autos; "Não · <motivos>"
pelas categorias de "O que falta sanar" (preparo, tempestividade, ato prévio...); "Já assinada"; ou o destino, se não
for Monocrática. Dúvida de critério do Relator fica na coluna B (certeza), não em P.

Uso (a leitura e a escrita da planilha ficam com quem chama, pelo conector ou pela API do Google):
  python3 scripts/planilhas/monocraticas_sheet.py entrada.json saida.json [--grava]
entrada.json: {"linhas": [{"linha": 4, "processo": "...", "incluido": "...", "assinado": "...", "conferencia": "<coluna D>"}, ...]}
saida.json:   {"intervalo": "Monocráticas!K3:P<n>", "valores": [[...], ...], "mudancas": [...], "divergencias": [...]}
"""
import datetime, json, re, sys
from pathlib import Path

R = Path(__file__).resolve().parents[2]
OP = R / 'acervo/operacional.json'
HOJE = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=4)).date().isoformat()
CNJ = re.compile(r'\d{7}-\d{2}\.\d{4}\.4\.03\.\d{4}')
DATA = re.compile(r'(\d{2})/(\d{2})/(\d{4})')
br = lambda d: '/'.join(reversed(d.split('-'))) if d else ''


def sim(v):
    return str(v or '').strip().lower().startswith('sim')


def data_de(txt):
    m = DATA.search(str(txt or ''))
    return f'{m.group(3)}-{m.group(2)}-{m.group(1)}' if m else ''


def conferir(v):
    return str(v or '').strip().lower().startswith('conferir')


# Categorias de "O que falta sanar" para a coluna P (a ordem é a da exibição)
MOTIVOS = [
    ('preparo', r'preparo|\bgru\b|pix|tesouro|recolh|custas|comprovante'),
    ('gratuidade', r'gratuidade'),
    ('tempestividade', r'tempestiv|intempest|datas? (de|da|do) (publica|intima|ciência|protocolo|disponibiliza)|aferir o prazo|prazo em dobro'),
    ('representação', r'procura[çc]|representa[çc]|poderes'),
    ('ato prévio', r'\b(intimar|intimá-l|despacho para|apreciar|dar vista|(re)?abrir (nova )?vista|vista a|aguardar|retificar|revogar|citação|certificar)|despacho:|decisão interlocutória|intimação para|intimação d[ao]s? (agravad|apelad|união|pfn|parte)'),
    ('situação na origem', r'na origem|senten[çc]a|andamento|perda d[eo] objeto|prejuízo|certame'),
    ('leitura dos autos', r'ler no pje|ler a |sem leitura dos autos|sem triagem detalhada'),
    ('acordo', r'acordo|transigir|transa[çc]'),
    ('alinhar o resultado', r'alinhar o resultado'),
]
# Critério da GRU fechado pelo gestor em 27/11/2026: comprovante bancário vinculado à guia basta; guia com Pix ou
# outro comprovante sem vínculo com ela, não. A frase "critério ... em aberto" deixa de ser pendência.
GRU_FECHADO = re.compile(r'[^.;\n]*(crit[ée]rio[^.;\n]*GRU|GRU[^.;\n]*crit[ée]rio|GRU[^.;\n]*03/04/2026)[^.;\n]*', re.I)


# Avisos genéricos da extração, que não são pendência do processo
GENERICO = re.compile(r'\[VALIDAR\] Autos extraídos em[^\n]*|Contrarraz[õo]es: n[ãa]o verificad[oa]s?\.?|Movido da Sessão para Monocrática[^.]*\.', re.I)
# Conferência feita na planilha (coluna D "Conferido: ...") vale enquanto a ficha não tiver análise mais nova
CONFERIDO = re.compile(r'^\s*Conferido:', re.I)
AINDA = re.compile(r'\b(conferir|intimar|aguardar|apreciar|falta)\b', re.I)


def pronto(x, ass_em_conferencia=False, conferencia=''):
    pr, tr = x.get('producao', {}), x.get('triagem', {})
    if (sim(pr.get('Assinado')) or pr.get('Data da Assinatura')) and not ass_em_conferencia:
        return 'Já assinada'
    dest = pr.get('Destino') or ''
    if dest and not dest.startswith('Monocr'):
        return f'Não · destino {dest} na ficha'
    falta = str(tr.get('O que falta sanar') or pr.get('O que falta sanar') or '')
    nota = str(pr.get('Art. 932 - Nota de enquadramento') or tr.get('Art. 932 - Nota de enquadramento') or '')
    if CONFERIDO.match(conferencia or '') and not AINDA.search(conferencia) and not nota.startswith('Análise de'):
        falta = ''
    falta = GENERICO.sub('', GRU_FECHADO.sub('', falta)).lower()
    if re.fullmatch(r'\s*(sem pend[êe]ncia\.?|—|-)?\s*', falta):
        falta = ''
    if 'embargos' in falta and re.search(r'teor|tempestiv', falta):
        mot = ['teor e prazo dos embargos']
    else:
        mot = [n for n, rx in MOTIVOS if re.search(rx, falta)]
    if falta and not mot and not re.search(r'definir|decidir|confirmar (a linha|com o relator)|basta como|suspens[ãa]o nacional|irdr', falta):
        mot = ['conferência pendente']
    if mot:
        return 'Não · ' + ', '.join(mot)
    if (pr.get('Destino - Situação') or '') == 'Pendente':
        return 'Não · ver a pendência na ficha'
    return 'Sim'


def main(ent, sai, grava):
    d = json.loads(OP.read_text(encoding='utf-8'))
    F = {}
    for x in d['registros']:
        m = CNJ.search(json.dumps(x, ensure_ascii=False)[:400])
        if m:
            F[m.group(0)] = x
    linhas = json.loads(Path(ent).read_text(encoding='utf-8'))['linhas']
    mud, div, vals = [], [], [['Incluído no PJe', 'Assinado', 'ID da decisão', 'Destino na ficha', 'Ficha', 'Pronto para julgar']]
    for ln in linhas:
        p = ln['processo']
        x = F.get(p)
        if not x:
            div.append(f'{p}: não está na ficha')
            vals.append([ln.get('incluido', ''), ln.get('assinado', ''), '', 'fora da ficha', '', ''])
            continue
        pr = x.setdefault('producao', {})
        inc, ass = ln.get('incluido', ''), ln.get('assinado', '')
        # planilha → ficha
        if sim(inc) and not sim(pr.get('Minuta no PJe')):
            pr['Minuta no PJe'] = 'Sim'
            if data_de(inc):
                pr['Minuta no PJe - Data'] = data_de(inc)
            mud.append(f'{p}: minuta no PJe')
        elif not sim(inc) and not conferir(inc) and sim(pr.get('Minuta no PJe')):
            div.append(f'{p}: planilha diz "{inc or "vazio"}", ficha diz incluída no PJe')
        if sim(ass) and not (sim(pr.get('Assinado')) or pr.get('Data da Assinatura')):
            pr['Assinado'] = 'Sim'
            if data_de(ass):
                pr['Data da Assinatura'] = data_de(ass)
            mud.append(f'{p}: assinado')
        elif not sim(ass) and not conferir(ass) and (sim(pr.get('Assinado')) or pr.get('Data da Assinatura')):
            div.append(f'{p}: planilha diz "{ass or "vazio"}", ficha diz assinado em {br(pr.get("Data da Assinatura"))}')
        # ficha → planilha
        assinado = sim(pr.get('Assinado')) or bool(pr.get('Data da Assinatura'))
        no_pje = sim(pr.get('Minuta no PJe')) or bool(pr.get('Minuta no PJe - Data')) or assinado
        k = inc if conferir(inc) or (sim(inc) and no_pje) else ('Sim' + (' · ' + br(pr.get('Minuta no PJe - Data')) if pr.get('Minuta no PJe - Data') else '') if no_pje else 'Não')
        l = ass if conferir(ass) or (sim(ass) and assinado) else ('Sim' + (' · ' + br(pr.get('Data da Assinatura')) if pr.get('Data da Assinatura') else '') if assinado else 'Não')
        dest = (pr.get('Destino') or '—') + (' · ' + pr['Destino - Situação'] if pr.get('Destino - Situação') else '')
        vals.append([k, l, pr.get('Decisão - ID') or '', dest, br(HOJE), pronto(x, conferir(ass), ln.get('conferencia', ''))])
    primeira = min(l['linha'] for l in linhas) - 1 if linhas else 3
    out = {'intervalo': f'Monocráticas!K{primeira}:P{primeira + len(vals) - 1}', 'valores': vals, 'mudancas': mud, 'divergencias': div}
    Path(sai).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    if grava and mud:
        OP.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(linhas)} linhas · {len(mud)} mudança(s) na ficha{"" if grava else " (seco)"} · {len(div)} divergência(s)')


if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    main(a[0], a[1], '--grava' in sys.argv)
