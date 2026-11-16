#!/usr/bin/env python3
"""Importa a "Relação de Processos de uma sessão - Pauta" (PJe 2G, relatório 151) para acervo/operacional.json.

O PJe só gera essa planilha depois que os processos estão pautados. Ela traz, por processo, o item da pauta,
a publicação, a inclusão, a proclamação (depois da sessão), o último movimento, a vara e os documentos do 1º grau.
A planilha cobre a sessão inteira; só entram as linhas do gabinete (--gabinete).

Grava:
- pauta.sessoes[] (entrada da sessão): item, publicacao, inclusao, proclamacao, importado_em;
- pauta (campos da ficha): Item (Pauta de Julgamento), Pauta - Publicação, Pauta - Inclusão, Pauta - Proclamação,
  Pauta - Último movimento, Pauta - MPU e Pauta - Importado em, sempre da sessão mais recente importada;
  Sessão original só quando estiver vazia;
- origem: Origem - Processo de referência e Origem - Documentos 1G; Origem - Juízo, Origem - Julgador e
  Sentença - Data só quando estiverem vazios.
Sem CPF: números de CPF e o rótulo "CPF" saem do texto do último movimento.

Uso: python3 scripts/pauta/importar_relacao_pje.py RELATORIO.xlsx [mais.xlsx ...] [--gravar]
Sem --gravar, só mostra o que mudaria.
"""
import argparse, json, pathlib, re, sys
from datetime import datetime, timezone

import openpyxl

R = pathlib.Path(__file__).resolve().parents[2]
OP = R / 'acervo/operacional.json'
GAB = 'Gab. A da Turma Regional de Mato Grosso do Sul'
SECOES = ['origem', 'triagem', 'producao', 'pauta', 'controles']
dg = lambda s: re.sub(r'\D', '', str(s or ''))


def txt(v):
    return '' if v is None else str(v).strip()


def sem_cpf(s):
    s = re.sub(r'\s*-?\s*CPF[\s:nº.]*[\d.\-/]{11,18}', '', s, flags=re.I)
    return re.sub(r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b', '', s).strip()


def data_br(v):
    """'2026-12-07 00:00:00', datetime ou '07/12/2026 10:00' → '07/12/2026'."""
    if isinstance(v, datetime):
        return v.strftime('%d/%m/%Y')
    s = txt(v)
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', s)
    if m:
        return f'{m[3]}/{m[2]}/{m[1]}'
    m = re.match(r'(\d{2}/\d{2}/\d{4})', s)
    return m[1] if m else s


def iso(br):
    d, m, a = br.split('/')
    return f'{a}-{m}-{d}'


def ler(arq, gabinete):
    ws = openpyxl.load_workbook(arq, read_only=True, data_only=True).worksheets[0]
    linhas = [list(r) for r in ws.iter_rows(values_only=True)]
    par = {txt(r[0]): next((c for c in r[1:] if c not in (None, '')), '') for r in linhas if r and r[0]}
    if txt(par.get('Id do Relatório')) != '151':
        raise SystemExit(f'{arq}: não é o relatório 151 do PJe (Relação de Processos de uma sessão - Pauta)')
    sessao = data_br(par.get('Data da Sessão'))
    executado = txt(par.get('Executado em'))
    i = next(i for i, r in enumerate(linhas) if r and txt(r[0]) == 'id_lote')
    cab = [txt(c) for c in linhas[i]]
    dados = [dict(zip(cab, r)) for r in linhas[i + 1:] if r and txt(r[0])]
    total = {txt(d['proc_cnj']) for d in dados}
    dados = [d for d in dados if txt(d.get('ds_orgao_julgador')) == gabinete]
    procs = {}
    for d in dados:
        procs.setdefault(txt(d['proc_cnj']), []).append(d)
    return sessao, executado, procs, len(total)


def importar(op, sessao, executado, procs):
    regs = {dg(r['processo']): r for r in op['registros']}
    ses_iso = iso(sessao)
    mud, novos, por_campo = 0, 0, {}
    for cnj, ls in procs.items():
        d0 = ls[0]
        r = regs.get(dg(cnj))
        if not r:
            r = {'processo': cnj}
            for s in SECOES:
                r[s] = {}
            r['pauta']['sessoes'] = []
            op['registros'].append(r); regs[dg(cnj)] = r; novos += 1
        for s in SECOES:
            r.setdefault(s, {})
        antes = json.dumps(r, ensure_ascii=False, sort_keys=True)

        def pon(sec, k, v, so_vazio=False):
            if v in ('', None) or (so_vazio and r[sec].get(k)):
                return
            if r[sec].get(k) != v:
                r[sec][k] = v; por_campo[k] = por_campo.get(k, 0) + 1

        # entrada da sessão
        ses = r['pauta'].setdefault('sessoes', [])
        e = next((x for x in ses if x.get('sessao') == ses_iso), None)
        if not e:
            e = {'sessao': ses_iso, 'item': '', 'resultado': ''}; ses.append(e)
        e['item'] = txt(d0['nr_ordem'])
        e['publicacao'] = data_br(d0.get('dt_publicacao'))
        e['inclusao'] = txt(d0.get('tp_insercao'))
        proc = next((txt(d.get('proclamacao_decisao')) for d in ls if txt(d.get('proclamacao_decisao'))), '')
        if proc:
            e['proclamacao'] = proc
        e['importado_em'] = executado
        ses.sort(key=lambda x: x.get('sessao', ''))
        # campos da ficha: sempre da sessão mais recente importada do PJe
        ult = max((x for x in ses if x.get('importado_em')), key=lambda x: x['sessao'])
        if ult is e:
            pon('pauta', 'Item (Pauta de Julgamento)', e['item'])
            pon('pauta', 'Pauta - Publicação', e['publicacao'])
            pon('pauta', 'Pauta - Inclusão', e['inclusao'])
            pon('pauta', 'Pauta - Proclamação', proc)
            pon('pauta', 'Pauta - Último movimento', sem_cpf(txt(d0.get('ds_ultimo_movimento'))))
            pon('pauta', 'Pauta - MPU', txt(d0.get('mpu')))
            pon('pauta', 'Pauta - Importado em', executado)
        pon('pauta', 'Sessão original', sessao, so_vazio=True)
        # origem
        ref = txt(d0.get('Processo_Referencia'))
        pon('origem', 'Origem - Processo de referência', ref if dg(ref) != dg(cnj) else '')
        pon('origem', 'Origem - Juízo', txt(d0.get('Vara_origem')), so_vazio=True)
        docs, vistos = [], set()
        for d in ls:
            doc = txt(d.get('documento_1g'))
            if not doc:
                continue
            lin = {'data': data_br(d.get('data_doc_1g')), 'documento': doc, 'magistrado': txt(d.get('magistrado_1g')).title()}
            k = (lin['data'], lin['documento'], lin['magistrado'])
            if k not in vistos:
                vistos.add(k); docs.append(lin)
        docs.sort(key=lambda x: iso(x['data']) if re.match(r'\d{2}/\d{2}/\d{4}$', x['data']) else '', reverse=True)
        if docs:
            pon('origem', 'Origem - Documentos 1G', docs)
            sent = next((x for x in docs if x['documento'].lower().startswith('sentença')), None)
            if sent:
                pon('origem', 'Sentença - Data', sent['data'], so_vazio=True)
                pon('origem', 'Origem - Julgador', sent['magistrado'], so_vazio=True)
        if json.dumps(r, ensure_ascii=False, sort_keys=True) != antes:
            r['origem']['atualizado_em'] = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(timespec='milliseconds') + 'Z'
            mud += 1
    return mud, novos, por_campo


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('planilhas', nargs='+')
    ap.add_argument('--gabinete', default=GAB)
    ap.add_argument('--gravar', action='store_true')
    a = ap.parse_args()
    op = json.loads(OP.read_text(encoding='utf-8'))
    lidas = sorted((ler(p, a.gabinete) for p in a.planilhas), key=lambda x: iso(x[0]))   # a mais recente por último
    for sessao, executado, procs, total in lidas:
        mud, novos, por = importar(op, sessao, executado, procs)
        print(f'sessão {sessao}: {len(procs)} processos do gabinete (de {total} na sessão) · {mud} registros alterados · {novos} criados')
        for k, n in sorted(por.items()):
            print(f'  {k}: {n}')
    if a.gravar:
        op['atualizado_em'] = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(timespec='milliseconds') + 'Z'
        OP.write_text(json.dumps(op, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        print('gravado em acervo/operacional.json')
    else:
        print('(simulação: use --gravar para gravar)')


if __name__ == '__main__':
    sys.exit(main())
