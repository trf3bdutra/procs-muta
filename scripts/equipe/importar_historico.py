#!/usr/bin/env python3
"""Importa o "Histórico por servidor" (Historico_por_Servidor.xlsx, levantado das pautas do OneDrive de 05/11/2026)
para acervo/planilhas/historico-por-servidor.json: um registro por processo e pauta, com redator, coautor e conferente.

A planilha traz uma aba por servidor (Autoria, Conferência ou as duas) e uma aba de autoria não identificada. O mesmo
processo e pauta aparece na aba de quem redigiu e na de quem conferiu; aqui os dois se juntam num registro só.
Autoria conjunta ("Rodrigo/Bruno") fica com o primeiro nome como redator e o segundo como coautor.
Serve de fonte complementar da matriz de minutas (scripts/equipe/matriz_minutas.py), marcada como histórico.

Uso: python3 scripts/equipe/importar_historico.py Historico_por_Servidor.xlsx"""
import json, re, sys, pathlib, datetime, openpyxl

R = pathlib.Path(__file__).resolve().parents[2]
arq = pathlib.Path(sys.argv[1])
dg = lambda s: re.sub(r'\D', '', str(s or ''))
fmt = lambda d: f'{d[:7]}-{d[7:9]}.{d[9:13]}.{d[13]}.{d[14:16]}.{d[16:]}' if len(d) == 20 else d
NADA = {'', 'NAO IDENTIFICADO', 'NÃO IDENTIFICADO', 'NONE'}

def sessao(nome):
    s = str(nome or '')
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', s)
    if m: return f'{m[1]}-{m[2]}-{m[3]}'
    m = re.search(r'(\d{2})[-.](\d{2})(?:[-.](\d{4}))?', s)
    return f'{m[3] or "2026"}-{m[2]}-{m[1]}' if m else ''

def iso(v):
    if isinstance(v, (datetime.date, datetime.datetime)): return v.strftime('%Y-%m-%d')
    m = re.match(r'(\d{4}-\d{2}-\d{2})', str(v or '')); return m[1] if m else ''

wb = openpyxl.load_workbook(arq, read_only=True, data_only=True)
REG, sem_autor = {}, 0
for ws in wb.worksheets[1:]:
    rows = list(ws.iter_rows(values_only=True))
    if ws.title.startswith('Autoria não'):
        sem_autor = sum(1 for r in rows[6:] if r and r[0]); continue
    H = [str(h or '').strip() for h in rows[5]]
    for r in rows[6:]:
        if not r or not r[0]: continue
        x = dict(zip(H, r)); p = dg(x.get('Processo'))
        if len(p) != 20: continue
        ses = sessao(x.get('Arquivo da pauta'))
        k = (p, ses, str(x.get('Aba de origem') or ''))
        e = REG.setdefault(k, {'processo': fmt(p), 'sessao': ses, 'arquivo': x.get('Arquivo da pauta') or '', 'aba': x.get('Aba de origem') or '',
                               'linha': x.get('Linha'), 'assunto': '', 'detalhe': '', 'redator': '', 'coautor': '', 'conferente': '',
                               'dataMinuta': '', 'conferido': '', 'liberado': ''})
        autor = str(x.get('Autor na fonte') or '').strip()
        if autor.upper() not in NADA and 'Autoria' in str(x.get('Atuação registrada') or ''):
            nomes = [n.strip() for n in autor.split('/') if n.strip()]
            e['redator'] = e['redator'] or nomes[0]
            if len(nomes) > 1: e['coautor'] = e['coautor'] or nomes[1]
        conf = str(x.get('Conferência atribuída') or '').strip()
        if conf: e['conferente'] = e['conferente'] or conf
        for c, f in (('assunto', 'Assunto / tema'), ('detalhe', 'Observações')):
            if not e[c] and x.get(f): e[c] = str(x[f]).strip()
        e['dataMinuta'] = e['dataMinuta'] or iso(x.get('Data original'))
        e['conferido'] = e['conferido'] or str(x.get('Conferido na fonte') or '').strip()
        e['liberado'] = e['liberado'] or iso(x.get('Liberado na fonte')) or str(x.get('Liberado na fonte') or '').strip()

regs = sorted(REG.values(), key=lambda e: (e['sessao'], e['processo']))
saida = {'schema': 'gabcmt.historico-servidor', 'versao': 1,
         'origem': arq.name + ' (pautas do OneDrive de 05/11/2026: 14 pautas principais; versões antigas, abas duplicadas e planilha complementar de 28,86% excluídas na fonte)',
         'importadoEm': datetime.date.today().isoformat(),
         'descricao': 'Fonte complementar, para informação: registro de data não comprova correção ou liberação. Um registro por processo, pauta e aba de origem.',
         'semAutoriaIdentificada': sem_autor, 'registros': regs}
(R / 'acervo/planilhas/historico-por-servidor.json').write_text(json.dumps(saida, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(len(regs), 'registros ·', sum(1 for e in regs if e['redator']), 'com redator ·', sum(1 for e in regs if e['conferente']), 'com conferente ·',
      len({e['sessao'] for e in regs}), 'pautas ·', sem_autor, 'linhas sem autoria identificada (fora)')
