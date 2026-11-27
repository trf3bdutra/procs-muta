# -*- coding: utf-8 -*-
"""Sincroniza a planilha "Monocráticas terminativas — matriz por grau de certeza" (Google Sheets) com a ficha.

A ficha (acervo/operacional.json) é a fonte única: é dela que o Cognitio (aba Monocráticas), o Caput e o Ex Officio leem.
A planilha é uma vista de trabalho. Duas colunas são editadas pela equipe e voltam para a ficha:
  K · Incluído no PJe  → producao."Minuta no PJe" (Sim) e "Minuta no PJe - Data" (dd/mm/aaaa no texto, se houver; sem data, fica só o Sim)
  L · Assinado         → producao."Assinado" (Sim) e "Data da Assinatura" (dd/mm/aaaa no texto, se houver)
"Não" ou vazio na planilha não apaga o que a ficha já tem (a divergência é informada). Texto começando por "Conferir"
fica como está, nos dois sentidos.
Depois da gravação, a planilha recebe da ficha: K e L recalculados, M · ID da decisão, N · Destino (situação) e
O · Ficha (data da sincronização).

Uso (a leitura e a escrita da planilha ficam com quem chama, pelo conector ou pela API do Google):
  python3 scripts/planilhas/monocraticas_sheet.py entrada.json saida.json [--grava]
entrada.json: {"linhas": [{"linha": 4, "processo": "...", "incluido": "...", "assinado": "..."}, ...]}
saida.json:   {"intervalo": "Monocráticas!K3:O<n>", "valores": [[...], ...], "mudancas": [...], "divergencias": [...]}
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


def main(ent, sai, grava):
    d = json.loads(OP.read_text(encoding='utf-8'))
    F = {}
    for x in d['registros']:
        m = CNJ.search(json.dumps(x, ensure_ascii=False)[:400])
        if m:
            F[m.group(0)] = x
    linhas = json.loads(Path(ent).read_text(encoding='utf-8'))['linhas']
    mud, div, vals = [], [], [['Incluído no PJe', 'Assinado', 'ID da decisão', 'Destino na ficha', 'Ficha']]
    for ln in linhas:
        p = ln['processo']
        x = F.get(p)
        if not x:
            div.append(f'{p}: não está na ficha')
            vals.append([ln.get('incluido', ''), ln.get('assinado', ''), '', 'fora da ficha', ''])
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
        vals.append([k, l, pr.get('Decisão - ID') or '', dest, br(HOJE)])
    primeira = min(l['linha'] for l in linhas) - 1 if linhas else 3
    out = {'intervalo': f'Monocráticas!K{primeira}:O{primeira + len(vals) - 1}', 'valores': vals, 'mudancas': mud, 'divergencias': div}
    Path(sai).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    if grava and mud:
        OP.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(linhas)} linhas · {len(mud)} mudança(s) na ficha{"" if grava else " (seco)"} · {len(div)} divergência(s)')


if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    main(a[0], a[1], '--grava' in sys.argv)
