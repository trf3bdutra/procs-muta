#!/usr/bin/env python3
"""Matriz modular do 28,86% (modelos/matrizes-2886.json), usada na Consulta do Modus Operandi.

  python3 scripts/modelos-matriz/matrizes_2886.py            confere a matriz (módulos, variáveis, grupos, ementas)
  python3 scripts/modelos-matriz/matrizes_2886.py --novos    lista os acórdãos de 28,86% do Relator julgados depois da
                                                              data da matriz (precedentes/precedentes.jsonl): candidatos
                                                              a nova versão de módulo ou a módulo novo

A matriz é dado curado: cada versão de módulo reproduz o texto do acórdão indicado em "origem" e só tem variáveis {{ }}
onde o caso muda. Para incluir um texto novo, acrescente a versão no módulo (ou um módulo e a sua posição na receita
do grupo) e rode este script antes de gravar.
"""
import json, re, sys, pathlib
RAIZ = pathlib.Path(__file__).resolve().parents[2]
ARQ = RAIZ / 'modelos/matrizes-2886.json'


def conferir(d):
    erros, avisos = [], []
    mods = {m['id']: m for m in d.get('modulos', [])}
    vars_ = {v['id']: v for v in d.get('variaveis', [])}
    usadas = set()

    def ver_txt(t, onde):
        if t.count('[[') != t.count(']]'):
            erros.append(f'{onde}: [[ ]] desbalanceado')
        for k in re.findall(r'\{\{([a-z0-9_]+)\}\}', t):
            usadas.add(k)
            if k not in vars_:
                erros.append(f'{onde}: variável {{{{{k}}}}} sem cadastro')
        if re.search(r'ID \d{6,}', t):
            avisos.append(f'{onde}: ID literal (do processo-modelo?)')
    for m in mods.values():
        if not m.get('versoes'):
            erros.append(f'módulo {m["id"]}: sem versões')
        for v in m.get('versoes', []):
            if not v.get('paragrafos'):
                erros.append(f'módulo {m["id"]} · {v.get("rotulo")}: sem parágrafos')
            for t in v.get('paragrafos', []):
                ver_txt(t, f'módulo {m["id"]} · {v.get("rotulo")}')
        if m.get('gatilho'):
            try:
                re.compile(m['gatilho'])
            except re.error as e:
                erros.append(f'módulo {m["id"]}: gatilho inválido ({e})')
    for g in d.get('grupos', []):
        for r in g.get('receita', []):
            ids = r.get('umDe') or [r.get('mod')]
            for i in ids:
                if i and i not in mods:
                    erros.append(f'grupo {g["id"]}: módulo {i} inexistente')
        rel = g.get('relatorio', {})
        for t in rel.get('paragrafos', []) + rel.get('mpf', []) + [o.get('texto', '') for o in rel.get('opcionais', [])]:
            ver_txt(t, f'grupo {g["id"]} · relatório')
        for c in g.get('modelosEmenta', []):
            if c not in d.get('ementas', {}):
                avisos.append(f'grupo {g["id"]}: ementa-base 2886-{c} ausente')
    for k in vars_:
        if k not in usadas and k not in ('ementa_item1', 'contrarrazoes_id'):
            avisos.append(f'variável {k} sem uso')
    return erros, avisos


def novos(d):
    ref = d.get('atualizadoEm', '0000-00-00')
    ult = max((v['origem'].split('(')[-1].rstrip(')') for m in d['modulos'] for v in m['versoes'] if '(' in v.get('origem', '')),
              key=lambda s: s[6:] + s[3:5] + s[:2], default='')
    corte = ult[6:] + '-' + ult[3:5] + '-' + ult[:2] if ult else ref
    out = []
    for l in (RAIZ / 'precedentes/precedentes.jsonl').read_text(encoding='utf-8').splitlines():
        if not l.strip():
            continue
        r = json.loads(l)
        if (r.get('dataJulgamento') or '') > corte and re.search(r'28[,.]86', json.dumps(r, ensure_ascii=False)):
            out.append((r['dataJulgamento'], r['processo'], (r.get('ementaCabecalho') or '')[:140]))
    return corte, sorted(out, reverse=True)


if __name__ == '__main__':
    d = json.loads(ARQ.read_text(encoding='utf-8'))
    if '--novos' in sys.argv:
        corte, L = novos(d)
        print(f'acórdãos de 28,86% julgados depois de {corte}: {len(L)}')
        for x in L:
            print(' ', *x)
        sys.exit(0)
    e, a = conferir(d)
    for x in a:
        print('aviso:', x)
    for x in e:
        print('ERRO:', x)
    print(f'{len(d["modulos"])} módulos, {len(d["grupos"])} grupos, {len(d["variaveis"])} variáveis, {len(d["ementas"])} ementas-base: '
          + ('ok' if not e else f'{len(e)} erro(s)'))
    sys.exit(1 if e else 0)
