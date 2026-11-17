#!/usr/bin/env python3
"""Lote de prontuários pela LIA, com a planilha de triagem como base e controle.

  python3 lote.py status                       quadro do lote (triagem × pauta × prontuário)
  python3 lote.py prompts [--sessao AAAA-MM-DD] [--so N1,N2] [--saida PASTA]
                                               gera um prompt por processo pendente (o mesmo do Ex Officio,
                                               mais a pista da triagem), para colar na LIA com os autos abertos
  python3 lote.py lancar RESPOSTAS... [--sobrescrever] [--ensaio]
                                               lê os blocos <<<PRONTUARIO_CMT … >>> (arquivos .txt/.json ou pasta),
                                               confere e grava no cartão do processo na pauta (acervo/sessoes/*.json),
                                               como o botão "Aplicar" do Ex Officio, e atualiza a planilha de controle

Controle: acervo/controles/triagem-2886.xlsx — as colunas de controle ficam à direita das da triagem:
Pauta, Item, Grupo sugerido, Prompt gerado, Prontuário lançado, Modelo (LIA), Consulta.
Nada é apagado: campo já preenchido no cartão só é trocado com --sobrescrever.
"""
import argparse
import datetime as dt
import glob
import json
import os
import pathlib
import re
import subprocess
import sys
import unicodedata

RAIZ = pathlib.Path(__file__).resolve().parents[2]
SESSOES = RAIZ / 'acervo' / 'sessoes'
CONTROLE = RAIZ / 'acervo' / 'controles' / 'triagem-2886.xlsx'
CAMPOS = json.loads((RAIZ / 'padrao' / 'lia' / 'campos-prontuario.json').read_text(encoding='utf-8'))
SITE = 'https://www.gabinete-cmt.com'
PAUTA_MEM = {}
COLS = ['Pauta', 'Item', 'Grupo sugerido', 'Prompt gerado', 'Prontuário lançado', 'Modelo (LIA)', 'Consulta']
GRUPO_A = {'A1': '1', 'A2': '2', 'A3': '3', 'A5': '5', 'A1/A5': '6', 'A6': '7', 'A6/A2': '7'}


def dg(s):
    return re.sub(r'\D', '', str(s or ''))


def norm(v):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFD', str(v or '')).encode('ascii', 'ignore').decode().lower()).strip()


# ------------------------------------------------------------------ pautas
def pautas():
    """{cnj (só dígitos): [(data, item, registro, arquivo)]}, da sessão mais recente para a mais antiga."""
    P = {}
    for f in sorted(SESSOES.glob('20??-??-??.json'), reverse=True):
        try:
            d = json.loads(f.read_text(encoding='utf-8'))
        except Exception:
            continue
        PAUTA_MEM[f] = d
        for lista in ('itens', 'previa'):
            for it in d.get(lista) or []:
                P.setdefault(dg(it.get('cnj')), []).append((f.stem, it.get('item') or '', it, f, lista))
    return P


# ------------------------------------------------------------------ controle
def abrir_controle():
    import openpyxl
    wb = openpyxl.load_workbook(CONTROLE)
    ws = wb.worksheets[0]
    cab = [c.value for c in ws[1]]
    for c in COLS:
        if c not in cab:
            ws.cell(1, len(cab) + 1, c); cab.append(c)
    return wb, ws, {c: i + 1 for i, c in enumerate(cab)}


def linhas(ws, col):
    for r in range(2, ws.max_row + 1):
        cnj = ws.cell(r, 1).value
        if cnj and dg(cnj):
            yield r, str(cnj).strip()


def grupo_sugerido(ws, r):
    me = norm(ws.cell(r, 6).value); ap = norm(ws.cell(r, 4).value); cod = str(ws.cell(r, 8).value or '').strip()
    if 'protesto' in me: return 'SEM MODELO (protesto interruptivo)'
    if ap.startswith('ai'): return 'conferir (agravo de instrumento)'
    if 'legitimidade bacen' in me: return '6'
    return GRUPO_A.get(cod, 'conferir')


def pista(ws, r):
    v = lambda c: str(ws.cell(r, c).value or '').strip()
    return ('\n\nPISTA DA TRIAGEM DO GABINETE (só orientação; quem decide são os autos e a árvore de enquadramento):\n'
            f'- Ente: {v(3)} · Apelante: {v(4)} · Preliminares: {v(5) or "—"}\n- Mérito: {v(6)}\n- Observações: {v(7) or "—"}\n'
            f'- Grupo vigente sugerido pela triagem: {grupo_sugerido(ws, r)} (códigos A1–A6 da triagem são de modelos antigos).')


# ------------------------------------------------------------------ comandos
def cmd_status(a):
    wb, ws, C = abrir_controle(); P = pautas()
    tot = {}
    print('%-27s %-12s %-5s %-8s %-10s %-10s %s' % ('Processo', 'Pauta', 'Item', 'Grupo', 'Prompt', 'Lançado', 'Modelo'))
    for r, cnj in linhas(ws, C):
        p = P.get(dg(cnj), [])
        pa, item = (p[0][0], p[0][1]) if p else ('', '')
        lan = ws.cell(r, C['Prontuário lançado']).value or ''
        cart = ((p[0][2].get('ctl') or {}).get('cartao') or {}) if p else {}
        est = 'lançado' if lan else ('com cartão' if cart.get('especificidades') else ('sem pauta' if not p else 'pendente'))
        tot[est] = tot.get(est, 0) + 1
        print('%-27s %-12s %-5s %-8s %-10s %-10s %s' % (cnj, pa, item, str(grupo_sugerido(ws, r))[:8], str(ws.cell(r, C['Prompt gerado']).value or '')[:10], str(lan)[:10], ws.cell(r, C['Modelo (LIA)']).value or ''))
    print('\n' + ' · '.join('%s: %d' % kv for kv in sorted(tot.items())))


def cmd_prompts(a):
    wb, ws, C = abrir_controle(); P = pautas()
    so = {dg(x) for x in (a.so or '').split(',') if x.strip()}
    saida = pathlib.Path(a.saida or (RAIZ / 'tmp-prompts-2886')); saida.mkdir(parents=True, exist_ok=True)
    n = 0
    for r, cnj in linhas(ws, C):
        if so and dg(cnj) not in so: continue
        p = P.get(dg(cnj), [])
        if a.sessao: p = [x for x in p if x[0] == a.sessao]
        if a.sessao and not p: continue
        cart = ((p[0][2].get('ctl') or {}).get('cartao') or {}) if p else {}
        if cart.get('especificidades') and not a.todos: continue
        if 'SEM MODELO' in str(grupo_sugerido(ws, r)) and not a.todos: continue
        assunto = (p[0][2].get('assunto') if p else '') or 'Índice de 28,86% Lei 8.622/1993 e 8.627/1993'
        txt = subprocess.run(['node', str(RAIZ / 'scripts/prontuario/prompt.js'), cnj, assunto], capture_output=True, text=True, check=True).stdout
        nome = '%s%s_%s.txt' % ((p[0][0] + '_item' + str(p[0][1]).zfill(3) + '_') if p else 'sem-pauta_', '', dg(cnj))
        (saida / nome).write_text(txt + pista(ws, r) + '\n', encoding='utf-8')
        ws.cell(r, C['Prompt gerado'], dt.date.today().strftime('%d/%m/%Y'))
        if p:
            ws.cell(r, C['Pauta'], '/'.join(reversed(p[0][0].split('-')))); ws.cell(r, C['Item'], str(p[0][1]))
        ws.cell(r, C['Grupo sugerido'], grupo_sugerido(ws, r))
        n += 1
    wb.save(CONTROLE)
    print('%d prompt(s) em %s' % (n, saida))


def blocos(entradas):
    arqs = []
    for e in entradas:
        p = pathlib.Path(e)
        arqs += sorted(p.glob('*')) if p.is_dir() else [pathlib.Path(x) for x in glob.glob(e)]
    for f in arqs:
        t = f.read_text(encoding='utf-8', errors='ignore')
        achou = False
        for m in re.finditer(r'<<<\s*PRONTUARIO_CMT(.*?)PRONTUARIO_CMT\s*>>>', t, re.S):
            achou = True; yield f, json_de(m.group(1))
        if not achou and t.strip().startswith('{'):
            yield f, json_de(t)


def json_de(t):
    t = re.sub(r'^\s*```(json)?|```\s*$', '', t.strip(), flags=re.M)
    i = t.index('{'); n = 0; k = i; s = False
    while k < len(t):
        ch = t[k]
        if s:
            if ch == '\\': k += 1
            elif ch == '"': s = False
        elif ch == '"': s = True
        elif ch == '{': n += 1
        elif ch == '}':
            n -= 1
            if n == 0: break
        k += 1
    return json.loads(t[i:k + 1])


def valor(e, v):
    tipo = e[2]
    if v is None or v == '': return None
    if tipo == 'opcao':
        n = norm(v)
        return next((o for o in e[3] if norm(o) == n), None) or next((o for o in e[3] if norm(o).startswith(n) or n.startswith(norm(o))), None)
    if tipo == 'data':
        s = str(v).strip(); m = re.match(r'(\d{2})/(\d{2})/(\d{4})$', s)
        return '%s-%s-%s' % (m.group(3), m.group(2), m.group(1)) if m else (s[:10] if re.match(r'\d{4}-\d{2}-\d{2}', s) else None)
    if tipo == 'sim_nao':
        if v is True or norm(v) in ('true', 'sim', 's', '1'): return True
        if v is False or norm(v) in ('false', 'nao', 'n', '0'): return False
        return None
    if tipo == 'numero':
        d = dg(v); return d or None
    return str(v).strip() or None


def set_p(cart, path, v):
    ks = path.split('.'); o = cart
    for k in ks[:-1]:
        o = o.setdefault(k, {})
    o[ks[-1]] = v


def get_p(cart, path):
    o = cart
    for k in path.split('.'):
        o = o.get(k) if isinstance(o, dict) else None
    return o


def cmd_lancar(a):
    wb, ws, C = abrir_controle(); P = pautas()
    lin = {dg(cnj): r for r, cnj in linhas(ws, C)}
    mexidos = {}; rel = []
    for f, o in blocos(a.respostas):
        cnj = dg(o.get('processo'))
        p = P.get(cnj, [])
        if not p:
            rel.append('%s: processo fora das pautas do Ex Officio (%s) — não lançado' % (o.get('processo'), f.name)); continue
        data, item, it, arq, lista = p[0]
        it.setdefault('ctl', {}); cart = it['ctl'].setdefault('cartao', {})
        Cs = o.get('campos') or {}; n = 0; conf = []
        validas = {e[0][2:] for e in CAMPOS['pauta']}
        fora = [k for k in Cs if k not in validas]
        for e in CAMPOS['pauta']:
            ch = e[0][2:]
            if ch not in Cs: continue
            v = valor(e, Cs[ch])
            if v is None: conf.append(ch + ' (valor inválido)'); continue
            tp = e[0][0]
            atual = it['ctl'].get(ch) if tp == 'c' else (it.get(ch) if tp == 'd' else get_p(cart, ch))
            if atual not in (None, '', [], {}) and atual != v and not a.sobrescrever:
                conf.append(ch); continue
            if atual == v: continue
            if tp == 'c': it['ctl'][ch] = v
            elif tp == 'd': it[ch] = v
            else: set_p(cart, ch, v)
            n += 1
        R = CAMPOS['recursos']
        if o.get('recursos') and (a.sobrescrever or not cart.get('recursos')):
            rec = []
            for r in o['recursos']:
                x = {k: valor([k, k, 'opcao', R[k]], r.get(k)) for k in ('parte', 'tipo', 'contra')}
                x = {k: v for k, v in x.items() if v}
                if r.get('id'): x['id'] = str(r['id'])
                if x: rec.append(x)
            if rec: cart['recursos'] = rec; n += 1
        if o.get('pecas') and (a.sobrescrever or not cart.get('pecas')):
            pc = [{'desc': str(x.get('desc') or ''), 'id': str(x.get('id') or ''), 'data': valor([0, 0, 'data'], x.get('data')) or ''} for x in o['pecas'] if x.get('desc') or x.get('id')]
            if pc: cart['pecas'] = pc; n += 1
        ex = cart.get('pendencias') or []
        nov = [t for t in map(str, o.get('pendencias') or []) if t.strip() and not any(norm(q.get('desc')) == norm(t) for q in ex)]
        if nov:
            cart['pendencias'] = ex + [{'desc': t, 'ok': False, 'em': dt.date.today().isoformat(), 'por': 'LIA · lote'} for t in nov]; n += 1
        if n:
            it['ctl']['editadoPor'] = 'LIA (lote)'; it['ctl']['editadoEm'] = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None).isoformat(timespec='milliseconds') + 'Z'
            mexidos[arq] = data
        mod = re.search(r'2886-(3d|\d[a-z]?(?:-esp)?)', json.dumps(o, ensure_ascii=False))
        r = lin.get(cnj)
        if r:
            if n: ws.cell(r, C['Prontuário lançado'], dt.date.today().strftime('%d/%m/%Y'))
            ws.cell(r, C['Modelo (LIA)'], '2886-' + mod.group(1) if mod else 'sem modelo')
            ws.cell(r, C['Pauta'], '/'.join(reversed(data.split('-')))); ws.cell(r, C['Item'], str(item))
            ws.cell(r, C['Consulta'], '%s/modus/#consulta=%s/%s' % (SITE, data, item))
        rel.append('%s (pauta %s, item %s): %d campo(s)%s%s%s' % (o.get('processo'), data, item, n,
                   ('; mantidos ou inválidos: ' + ', '.join(conf)) if conf else '',
                   ('; %d chave(s) fora do padrão do Ex Officio, ignoradas (%s) — a LIA não usou o prompt gerado' % (len(fora), ', '.join(fora[:6]))) if fora else '',
                   '' if r else '; fora da planilha de triagem'))
    if a.ensaio:
        print('\n'.join(rel)); print('(ensaio: nada gravado)'); return
    for arq in mexidos:
        PAUTA_MEM[arq]['atualizadoEm'] = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None).isoformat(timespec='milliseconds') + 'Z'
        arq.write_text(json.dumps(PAUTA_MEM[arq], ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    wb.save(CONTROLE)
    print('\n'.join(rel))
    print('arquivos de pauta alterados:', ', '.join(sorted(str(p.relative_to(RAIZ)) for p in mexidos)) or 'nenhum')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    sp.add_parser('status')
    p = sp.add_parser('prompts'); p.add_argument('--sessao'); p.add_argument('--so'); p.add_argument('--saida'); p.add_argument('--todos', action='store_true')
    p = sp.add_parser('lancar'); p.add_argument('respostas', nargs='+'); p.add_argument('--sobrescrever', action='store_true'); p.add_argument('--ensaio', action='store_true')
    a = ap.parse_args()
    {'status': cmd_status, 'prompts': cmd_prompts, 'lancar': cmd_lancar}[a.cmd](a)


if __name__ == '__main__':
    main()
