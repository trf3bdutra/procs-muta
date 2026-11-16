#!/usr/bin/env python3
"""Tira a marca de seleção prévia dos processos que já entraram numa pauta oficial.

A seleção prévia vale para uma sessão (pauta."Nova sessão de destino"). Quando o processo aparece numa pauta oficial
(acervo/sessoes/AAAA-MM-DD.json) da sessão de destino ou de uma sessão posterior, a seleção foi cumprida:
saem triagem."Seleção Prévia", pauta."JULGAMENTO" e pauta."Nova sessão de destino".
Fica marcado quem não entrou em pauta nenhuma depois do destino: a lista sai no fim, para decidir caso a caso.

Uso: python3 scripts/pauta/limpar_selecao_previa.py [--gravar]
"""
import argparse, glob, json, pathlib, re
from datetime import datetime, timezone

R = pathlib.Path(__file__).resolve().parents[2]
OP = R / 'acervo/operacional.json'
dg = lambda s: re.sub(r'\D', '', str(s or ''))


def iso(br):
    m = re.match(r'(\d{2})/(\d{2})/(\d{4})', str(br or ''))
    return f'{m[3]}-{m[2]}-{m[1]}' if m else ''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gravar', action='store_true')
    a = ap.parse_args()
    pautas = {}
    for f in sorted(glob.glob(str(R / 'acervo/sessoes/2*.json'))):
        data = pathlib.Path(f).stem
        for it in json.loads(pathlib.Path(f).read_text(encoding='utf-8')).get('itens', []):
            pautas.setdefault(dg(it.get('cnj')), []).append(data)
    op = json.loads(OP.read_text(encoding='utf-8'))
    limpos, ficam = [], []
    agora = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(timespec='milliseconds') + 'Z'
    for r in op['registros']:
        t, p = r.get('triagem') or {}, r.get('pauta') or {}
        if not t.get('Seleção Prévia'):
            continue
        destino = iso(p.get('Nova sessão de destino'))
        ses = [s for s in pautas.get(dg(r['processo']), []) if not destino or s >= destino]
        if ses:
            t['Seleção Prévia'] = ''
            if p.get('JULGAMENTO') == 'SELECIONADO PREVIAMENTE':
                p['JULGAMENTO'] = ''
            p['Nova sessão de destino'] = ''
            r.setdefault('origem', {})['atualizado_em'] = agora
            limpos.append((r['processo'], destino, ses[0]))
        else:
            ficam.append((r['processo'], destino, pautas.get(dg(r['processo']), [])))
    por = {}
    for _, d, s in limpos:
        por[s] = por.get(s, 0) + 1
    print(f'{len(limpos)} marcas cumpridas e retiradas: ' + ', '.join(f'{n} na pauta de {s}' for s, n in sorted(por.items())))
    print(f'{len(ficam)} continuam marcados (sem pauta oficial depois do destino):')
    for cnj, d, s in ficam:
        print(f'  {cnj} · destino {d or "—"} · pautas: {", ".join(s) or "nenhuma"}')
    if a.gravar and limpos:
        op['atualizado_em'] = agora
        OP.write_text(json.dumps(op, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        print('gravado em acervo/operacional.json')
    elif not a.gravar:
        print('(simulação: use --gravar para gravar)')


if __name__ == '__main__':
    main()
