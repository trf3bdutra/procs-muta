#!/usr/bin/env python3
"""Árvore de assuntos do CNJ (SGT/TPU) para os assuntos do acervo.

Lê os códigos de assunto do acervo fonte (DataJud e Power BI), consulta o webservice
público do SGT do CNJ e grava apoio/assuntos-cnj.json com, para cada código, o nome,
a cadeia de pais (do ramo do direito até o assunto), com códigos e nomes, e o ramo (primeiro nível).

Webservice: https://www.cnj.jus.br/sgt/infWebService.php
  getStringPaisItemPublicoWS(seqItem, tipoItem='A')   -> códigos dos pais, do ramo ao pai imediato
  getArrayDetalhesItemPublicoWS(seqItem, tipoItem='A') -> detalhes do item
  getDataUltimaVersao()                               -> data da versão das tabelas
"""
import argparse, json, re, sys, time, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ENDERECOS = ['https://www.cnj.jus.br/sgt/sgt_ws.php', 'https://sgt.cloud.cnj.jus.br/api/v1/soap']
NS = 'https://www.cnj.jus.br/sgt/sgt_ws.php'
CAMPOS = ('DataJud · Código Assunto', 'Código_Assunto_Principal', 'Assuntos_do_Processo')


def envelope(fn, args):
    corpo = ''.join(f'<{k}>{v}</{k}>' for k, v in args.items())
    return (f'<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '
            f'xmlns:sgt="{NS}"><soapenv:Body><sgt:{fn}>{corpo}</sgt:{fn}></soapenv:Body></soapenv:Envelope>').encode()


def local(tag):
    return tag.rsplit('}', 1)[-1]


def chamar(fn, args, tentativas=4):
    erro = None
    for url in ENDERECOS:
        for t in range(tentativas):
            try:
                req = urllib.request.Request(url, data=envelope(fn, args), method='POST', headers={
                    'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': f'{NS}#{fn}'})
                with urllib.request.urlopen(req, timeout=60) as r:
                    txt = r.read().decode('utf-8', 'replace')
                raiz = ET.fromstring(txt)
                corpo = next(e for e in raiz.iter() if local(e.tag) == 'Body')
                resp = list(corpo)[0]
                if local(resp.tag) == 'Fault':
                    raise RuntimeError(ET.tostring(resp, encoding='unicode')[:300])
                return resp, txt
            except Exception as e:  # noqa: BLE001
                erro = e
                time.sleep(1.5 * (t + 1))
    raise RuntimeError(f'{fn}{args}: {erro}')


def achatar(el):
    """Converte a resposta SOAP em texto, dict ou lista."""
    filhos = list(el)
    if not filhos:
        return (el.text or '').strip()
    nomes = [local(f.tag) for f in filhos]
    if len(set(nomes)) == 1 and len(filhos) > 1 or nomes[0] == 'item':
        return [achatar(f) for f in filhos]
    return {local(f.tag): achatar(f) for f in filhos}


def retorno(resp):
    filhos = list(resp)
    return achatar(filhos[0]) if len(filhos) == 1 else achatar(resp)


def cadeia_de(texto):
    """'Direito X:Assunto A:Assunto B' -> lista. Aceita ':' ou ' > ' como separador."""
    if not isinstance(texto, str) or not texto.strip():
        return []
    sep = ' > ' if ' > ' in texto else (':' if ':' in texto else '|')
    return [p.strip() for p in texto.split(sep) if p.strip()]


def codigos(fonte):
    regs = json.loads(Path(fonte).read_text())['registros']
    cods = {}
    for r in regs:
        for k in CAMPOS:
            v = r.get(k)
            if v in (None, ''):
                continue
            for x in re.split(r'[;,\s]+', str(v)):
                if x.isdigit():
                    cods[int(x)] = cods.get(int(x), 0) + 1
    return cods


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--fonte', default='acervo/fonte.json')
    ap.add_argument('--saida', default='apoio/assuntos-cnj.json')
    ap.add_argument('--limite', type=int, default=0)
    a = ap.parse_args()

    anterior = {}
    if Path(a.saida).exists():
        try:
            anterior = json.loads(Path(a.saida).read_text()).get('assuntos', {})
        except Exception:  # noqa: BLE001
            anterior = {}

    cods = codigos(a.fonte)
    lista = sorted(cods)[: a.limite or None]
    try:
        versao = retorno(chamar('getDataUltimaVersao', {})[0])
    except Exception as e:  # noqa: BLE001
        print('versão:', e, file=sys.stderr); versao = None

    cache, falhas = {}, []

    def det(c):
        c = int(c)
        if c not in cache:
            rd, _ = chamar('getArrayDetalhesItemPublicoWS', {'seqItem': c, 'tipoItem': 'A'})
            bruto = retorno(rd)
            kv = {i.get('key'): i.get('value') for i in bruto if isinstance(i, dict)} if isinstance(bruto, list) else (bruto or {})
            cache[c] = {k: kv.get(k, '') for k in ('nome', 'cod_item_pai', 'situacao', 'dispositivo_legal', 'artigo')}
            time.sleep(0.1)
        return cache[c]

    saida = {}
    for i, c in enumerate(lista, 1):
        try:
            rp, _ = chamar('getStringPaisItemPublicoWS', {'seqItem': c, 'tipoItem': 'A'})
            pais = [int(x) for x in re.findall(r'\d+', str(retorno(rp) or ''))]
            pais = [x for x in pais if x != c]
            d = det(c)
            nomes = [det(x)['nome'] for x in pais] + [d['nome']]
            saida[str(c)] = {'nome': d['nome'], 'codigos': pais + [c], 'cadeia': nomes, 'ramo': nomes[0],
                             'ramo_codigo': (pais + [c])[0], 'situacao': d['situacao'],
                             'dispositivo_legal': d['dispositivo_legal'], 'artigo': d['artigo'], 'processos': cods[c]}
        except Exception as e:  # noqa: BLE001
            falhas.append({'codigo': c, 'erro': str(e)[:300]})
            if str(c) in anterior:
                saida[str(c)] = anterior[str(c)]
        if i % 50 == 0:
            print(f'{i}/{len(lista)}', flush=True)
        time.sleep(0.1)

    doc = {
        'schema': 'gabcmt.assuntos-cnj', 'schema_versao': 1,
        'fonte': 'CNJ · SGT/TPU, webservice público (https://www.cnj.jus.br/sgt/infWebService.php)',
        'versao_tpu': versao, 'consultado_em': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'total': len(saida), 'falhas': falhas,
        'ramos': {}, 'assuntos': saida,
    }
    for v in saida.values():
        if v.get('ramo'):
            doc['ramos'][v['ramo']] = doc['ramos'].get(v['ramo'], 0) + v.get('processos', 0)
    doc['ramos'] = dict(sorted(doc['ramos'].items(), key=lambda kv: -kv[1]))
    Path(a.saida).write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
    print(f'{len(saida)} assuntos; {len(falhas)} falhas; versão {versao}')
    if not saida:
        sys.exit(1)


if __name__ == '__main__':
    main()
