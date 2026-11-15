#!/usr/bin/env python3
"""Pautas no Drive: uma planilha Google por sessão, no molde "Controle de Pauta" (Pauta_Sessao_30-11-2026).
   O molde tem o painel nas linhas 1-19, o cabeçalho na linha 20 e os processos em A21:Y320 (até 300).
   Este script lê planilhas.json (saída de exportar.js) e grava, para cada sessão, pautas_sessao/<AAAA-MM-DD>.json:
     titulo  nome da planilha no Drive          aba  nome da aba
     r1      data da sessão (número de série)    limpar  faixas a limpar antes de gravar (A21:E320 e G21:Y320)
     faixa   onde gravar valores (A21:Y<20+n>)   valores uma linha por processo, colunas A..Y
   A coluna F (Pendências) fica fora da limpeza e vai como null em valores: a fórmula do molde permanece.
   A coluna G (Etapa) leva a fórmula do molde (A fazer/Minutado pela data da minuta) ou o valor Corrigido/Liberado.
   Fórmulas: nomes em inglês com ";" (a planilha está em pt_BR). Texto que pareceria número ou data vai com apóstrofo.
   Uso: python3 scripts/drive/pautas_sessao.py <pasta com planilhas.json>
"""
import json, sys, pathlib, re, datetime

pasta = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')
D = json.loads((pasta / 'planilhas.json').read_text(encoding='utf-8'))
LINHAS = 300
# colunas do molde (A..Y) e o cabeçalho correspondente na exportação da Pauta da equipe
MOLDE = ['Item', 'Processo', 'Classe', 'Assunto', 'Detalhes', None, None, 'Minutado em', 'Servidor', 'Revisor',
         'Intervenção', 'Parecer', 'Preliminares', 'Tempestividade', 'Preparo', 'Representação', 'Mídias',
         'Resultado', 'Consectários', 'Honorários', 'Tópico-síntese', 'Desfecho', 'Intercorrência', 'Meta', 'Apreciação']
ETAPA = '=IF($B{n}="";"";IF($H{n}<>"";"Minutado";"A fazer"))'
BASE = datetime.date(1899, 12, 30)


def serial(br):
    m = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', br or '')
    return (datetime.date(int(m[3]), int(m[2]), int(m[1])) - BASE).days if m else ''


def texto(v):
    """texto que a planilha leria como número, data ou fórmula vai com apóstrofo"""
    v = str(v or '').strip()
    if v and (re.match(r'^[=+@-]', v) or re.match(r'^[\d.,/:%\s-]+$', v)): return "'" + v
    return v


saida = pasta / 'pautas_sessao'; saida.mkdir(exist_ok=True)
for nome, L in (D.get('pautas') or {}).items():
    m = re.search(r'(\d{2})-(\d{2})-(\d{4})', nome)
    if not m or not L: continue
    d, H = m[3] + '-' + m[2] + '-' + m[1], L[0]
    v = lambda r, c: (r[H.index(c)] if c in H and H.index(c) < len(r) else '') or ''
    linhas = []
    for k, r in enumerate(L[1:LINHAS + 1]):
        n = 21 + k
        lin = []
        for i, c in enumerate(MOLDE):
            if i == 5: lin.append(None); continue                       # F: fórmula do molde
            if i == 6:                                                   # G: etapa
                et = v(r, 'Etapa'); lin.append(et if et in ('Corrigido', 'Liberado') else ETAPA.format(n=n)); continue
            x = v(r, c)
            if c == 'Item': lin.append(int(x) if str(x).isdigit() else texto(x)); continue
            if c == 'Minutado em': lin.append(serial(x)); continue
            if c == 'Apreciação': x = x.split(' · META')[0]
            if c == 'Detalhes':                                          # sustentação oral / preferência, como no molde
                so = v(r, 'SO/Pref')                                     # Virtual | Presencial | Preferência
                t = '#Pref' if so.startswith('Pref') else ('#SO' if so else '')
                if t and t.lower() not in x.lower(): x = (x + ' ' + t).strip()
            lin.append(texto(x))
        linhas.append(lin)
    for lin in linhas:                                                   # sem células vazias no fim da linha
        while lin and lin[-1] == '': lin.pop()
    if len(L) - 1 > LINHAS: print('AVISO: sessão ' + d + ' tem ' + str(len(L) - 1) + ' processos; o molde comporta ' + str(LINHAS))
    arq = {'data': d, 'titulo': 'Pauta_Sessao_' + m[1] + '-' + m[2] + '-' + m[3] + ' (Pauta da equipe)',
           'aba': 'Sessão ' + m[1] + '-' + m[2], 'r1': serial(m[1] + '/' + m[2] + '/' + m[3]), 'processos': len(linhas),
           'limpar': ['A21:E320', 'G21:Y320'], 'faixa': 'A21:Y' + str(20 + max(1, len(linhas))), 'valores': linhas}
    (saida / (d + '.json')).write_text(json.dumps(arq, ensure_ascii=False), encoding='utf-8')
    print(arq['titulo'] + ': ' + str(arq['processos']) + ' processos')
