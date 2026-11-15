#!/usr/bin/env python3
"""Monta os .xlsx do Drive a partir de planilhas.json (saída de exportar.js):
     Monocraticas.xlsx          (uma aba por mês de registro)
     Controles_especiais.xlsx   (Metas, Sobrestados, Casos sensíveis)
   (As pautas têm uma planilha por sessão, no molde Controle de Pauta: ver pautas_sessao.py.)
   Cabeçalho na linha 1 (fixo, com filtro), cores das etapas como na Pauta da equipe e nas planilhas de pauta:
   minutado verde, aviso amarelo, corrigido/revisado azul, liberado/para assinatura lilás.
   Também grava, para cada aba, um .tsv (usado pela tarefa diária para regravar os dados na mesma planilha).
   Uso: python3 scripts/drive/montar_xlsx.py <pasta com planilhas.json>
"""
import json, sys, pathlib, re
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

pasta = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')
D = json.loads((pasta / 'planilhas.json').read_text(encoding='utf-8'))
CAB = PatternFill('solid', fgColor='1F4C4F')
COR = {'mi': 'EAF6EF', 'al': 'FFF8DE', 'co': 'E8F1FB', 'li': 'F1EAFA'}
FONTE = Font(name='Arial', size=10)


def cor_da_linha(h, r):
    """mesma prioridade do app: liberado > corrigido > aviso > minutado"""
    v = lambda n: (r[h.index(n)] if n in h and h.index(n) < len(r) else '') or ''
    et = v('Etapa')
    if et in ('Liberado', 'Para assinatura', 'Assinada'): return COR['li']
    if et in ('Corrigido', 'Revisado'): return COR['co']
    if v('Pendências') or v('Alertas'): return COR['al']
    if et == 'Minutado': return COR['mi']
    return None


def aba(wb, nome, L):
    ws = wb.create_sheet(re.sub(r'[\[\]\*\?/\\:]', '-', nome)[:31])
    if not L: L = [['Sem dados']]
    h = L[0]
    for r in L: ws.append([str(x) if x is not None else '' for x in r])
    for c in ws[1]:
        c.font = Font(name='Arial', size=10, bold=True, color='FFFFFF'); c.fill = CAB
        c.alignment = Alignment(vertical='center', wrap_text=True)
    for i, r in enumerate(L[1:], start=2):
        f = cor_da_linha(h, r)
        for c in ws[i]:
            c.font = FONTE
            if f: c.fill = PatternFill('solid', fgColor=f)
    ws.freeze_panes = 'C2' if 'Processo' in h[:2] else 'B2'
    ws.auto_filter.ref = ws.dimensions
    ws.row_dimensions[1].height = 30
    for j, nome_c in enumerate(h, start=1):
        largura = max([len(str(nome_c))] + [len(str(r[j - 1])) for r in L[1:60] if j - 1 < len(r)])
        ws.column_dimensions[get_column_letter(j)].width = max(8, min(48, largura + 2))
    # .tsv da aba, para a atualização diária (células sem tabulação nem quebra de linha)
    tsv = '\n'.join('\t'.join(str(x if x is not None else '').replace('\t', ' ').replace('\r', ' ').replace('\n', ' ') for x in r) for r in L)
    (pasta / 'tsv').mkdir(exist_ok=True)
    return ws.title, tsv


saida = {}
for arquivo, grupo in (('Monocraticas.xlsx', 'monocraticas'), ('Controles_especiais.xlsx', 'controles')):
    wb = Workbook(); wb.remove(wb.active); abas = []
    for nome, L in (D.get(grupo) or {'Sem dados': [['Sem dados']]}).items():
        t, tsv = aba(wb, nome, L)
        f = pasta / 'tsv' / (grupo + '__' + re.sub(r'\W+', '_', t) + '.tsv'); f.write_text(tsv, encoding='utf-8')
        abas.append({'aba': t, 'tsv': str(f), 'linhas': len(L), 'colunas': max(len(r) for r in L)})
    wb.save(pasta / arquivo)
    saida[grupo] = {'xlsx': str(pasta / arquivo), 'abas': abas}
    print(arquivo + ': ' + ', '.join(a['aba'] + ' (' + str(a['linhas'] - 1) + ')' for a in abas))
(pasta / 'abas.json').write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding='utf-8')
