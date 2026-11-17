#!/usr/bin/env python3
"""Agente de conferência final das minutas de 28,86% (Claude API / Console).

Entrada: os pacotes baixados na Consulta do Compendium (botão "Pacote para conferência"),
um arquivo conf-2886_*.json por processo, ou uma pasta com vários.

Saída (pasta --saida):
  relatorio.md    quadro da pauta: veredito por processo e ajustes, do mais grave ao mais leve;
  relatorio.json  o mesmo, estruturado;
  casos/*.json    a resposta do agente para cada processo.

Uso:
  export ANTHROPIC_API_KEY=...            # chave criada no Claude Console
  python3 conferir.py ~/Downloads/conf-2886_*.json
  python3 conferir.py pacotes/ --lote     # Message Batches: metade do custo, resposta em minutos
  python3 conferir.py pacotes/ --texto    # pede também o texto integral corrigido
  python3 conferir.py pacotes/ --ensaio   # não chama a API: só mostra o que seria enviado

O agente não altera o resultado do voto, não reescreve o texto do acervo e não inventa ID ou fato:
ver SISTEMA.md.
"""
import argparse, concurrent.futures as cf, datetime as dt, glob, json, os, re, sys, time
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
MATERIAL = RAIZ / 'padrao' / 'lia' / 'Material_Gabinete_2886.txt'
MATRIZES = RAIZ / 'modelos' / 'matrizes-2886.json'
MODELO_PADRAO = 'claude-sonnet-5-5'

FERRAMENTA = {
    'name': 'registrar_conferencia',
    'description': 'Registra o resultado da conferência final de uma minuta de 28,86%.',
    'input_schema': {
        'type': 'object',
        'properties': {
            'processo': {'type': 'string'},
            'veredito': {'type': 'string', 'enum': ['pronta', 'ajustar', 'refazer']},
            'resumo': {'type': 'string', 'description': 'Uma ou duas frases: o que impede a minuta de ir ao PJe, ou "Sem ajustes."'},
            'ajustes': {'type': 'array', 'items': {'type': 'object', 'properties': {
                'local': {'type': 'string'}, 'trecho': {'type': 'string'}, 'problema': {'type': 'string'},
                'correcao': {'type': 'string'},
                'natureza': {'type': 'string', 'enum': ['DOC', 'FAT', 'PROC', 'JUR', 'RED', 'EST']},
                'criticidade': {'type': 'string', 'enum': ['ALTA', 'MÉDIA', 'BAIXA']}},
                'required': ['local', 'problema', 'correcao', 'natureza', 'criticidade']}},
            'pendencias': {'type': 'array', 'items': {'type': 'string'}, 'description': 'O que só os autos resolvem, em [VALIDAR: …].'},
            'texto_corrigido': {'type': 'string', 'description': 'Só quando pedido: a minuta inteira com os ajustes aplicados, sem mudar o resultado.'}},
        'required': ['processo', 'veredito', 'resumo', 'ajustes', 'pendencias']}}


def catalogo():
    """Grupos (receita, dispositivo, acórdão) e módulos (título, gatilho, versões) da matriz vigente."""
    m = json.loads(MATRIZES.read_text(encoding='utf-8'))
    L = ['CATÁLOGO DA MATRIZ 28,86%% (atualizado em %s)' % m.get('atualizadoEm', ''), '', 'GRUPOS']
    for g in m['grupos']:
        rec = []
        for r in g['receita']:
            if r.get('umDe'):
                rec.append('um de [' + ' | '.join(x or 'nenhum' for x in r['umDe']) + ']')
            else:
                rec.append(r['mod'] + ('?' if r.get('opcional') else ''))
        L.append('- Grupo %s · %s · resultado: %s · honorários padrão: %s' % (g['id'], g['nome'], g.get('resJulg', ''), g.get('honorPadrao', '')))
        L.append('  receita (? = opcional): ' + ' → '.join(rec))
        L.append('  dispositivo: ' + g.get('dispositivo', ''))
        L.append('  acórdão: ' + g.get('acordao', ''))
    L += ['', 'MÓDULOS']
    for md in m['modulos']:
        vs = ' / '.join(v.get('rotulo', '') for v in md.get('versoes', []))
        L.append('- %s (%s): %s%s%s' % (md['id'], md.get('tipo', ''), md.get('titulo', ''),
                                         ' · gatilho: ' + md['gatilho'] if md.get('gatilho') else '', ' · versões: ' + vs if len(md.get('versoes', [])) > 1 else ''))
    regras = m.get('regras')
    if regras:
        L += ['', 'REGRAS DA MATRIZ', json.dumps(regras, ensure_ascii=False, indent=1)]
    return '\n'.join(L)


def sistema():
    return [
        {'type': 'text', 'text': (AQUI / 'SISTEMA.md').read_text(encoding='utf-8')},
        {'type': 'text', 'text': 'MATERIAL DO GABINETE\n\n' + MATERIAL.read_text(encoding='utf-8') + '\n\n' + catalogo(),
         'cache_control': {'type': 'ephemeral'}},
    ]


def ler_pacotes(entradas):
    arqs = []
    for e in entradas:
        p = Path(os.path.expanduser(e))
        if p.is_dir():
            arqs += sorted(p.glob('*.json'))
        else:
            arqs += [Path(x) for x in sorted(glob.glob(os.path.expanduser(e)))]
    vistos, out = set(), []
    for a in arqs:
        try:
            d = json.loads(a.read_text(encoding='utf-8'))
        except Exception as ex:
            print('ignorado (JSON inválido):', a, ex, file=sys.stderr); continue
        if d.get('schema') != 'gabcmt-conf-2886-1' or not d.get('minuta'):
            print('ignorado (não é pacote de conferência 28,86%):', a, file=sys.stderr); continue
        chave = re.sub(r'\D', '', d.get('processo', '')) or a.stem
        if chave in vistos:  # o mesmo processo baixado duas vezes: fica o mais recente
            out = [x for x in out if re.sub(r'\D', '', x[1].get('processo', '')) != chave]
        vistos.add(chave); out.append((a, d))
    out.sort(key=lambda x: (x[1].get('sessao', ''), int(re.sub(r'\D', '', str(x[1].get('item', ''))) or 0)))
    return out


def mensagem(d, texto):
    p = dict(d); p.pop('perfil', None)
    pedido = ('Confira a minuta deste pacote e registre o resultado.' +
              (' Inclua também `texto_corrigido` com a minuta inteira já ajustada.' if texto else ' Não inclua `texto_corrigido`.'))
    return [{'role': 'user', 'content': pedido + '\n\n<pacote>\n' + json.dumps(p, ensure_ascii=False, indent=1) + '\n</pacote>'}]


def params(d, a):
    return {'model': a.modelo, 'max_tokens': 24000 if a.texto else 8000, 'system': sistema(),
            'tools': [FERRAMENTA], 'tool_choice': {'type': 'tool', 'name': 'registrar_conferencia'},
            'messages': mensagem(d, a.texto)}


def resposta(msg, d):
    for b in msg.content:
        if getattr(b, 'type', '') == 'tool_use' and b.name == 'registrar_conferencia':
            r = dict(b.input); r.setdefault('processo', d.get('processo', '')); return r
    raise RuntimeError('o modelo não chamou registrar_conferencia (stop_reason=%s)' % getattr(msg, 'stop_reason', '?'))


def um(cli, d, a):
    for t in range(4):
        try:
            with cli.messages.stream(**params(d, a)) as st:
                msg = st.get_final_message()
            r = resposta(msg, d); r['_uso'] = msg.usage.model_dump() if hasattr(msg.usage, 'model_dump') else {}
            return r
        except Exception as ex:
            if t == 3:
                return {'processo': d.get('processo', ''), 'veredito': 'erro', 'resumo': 'Falha na API: %s' % ex, 'ajustes': [], 'pendencias': []}
            time.sleep(5 * (t + 1))


def em_lote(cli, P, a):
    ids = {}
    reqs = []
    for i, (_, d) in enumerate(P):
        cid = 'c%03d_%s' % (i, re.sub(r'\D', '', d.get('processo', ''))[:40])
        ids[cid] = d; reqs.append({'custom_id': cid, 'params': params(d, a)})
    b = cli.messages.batches.create(requests=reqs)
    print('lote', b.id, 'enviado com', len(reqs), 'processos; aguardando…', file=sys.stderr)
    while True:
        b = cli.messages.batches.retrieve(b.id)
        if b.processing_status == 'ended': break
        c = b.request_counts; print('  em processamento: %s · prontos: %s' % (c.processing, c.succeeded + c.errored), file=sys.stderr)
        time.sleep(30)
    R = {}
    for x in cli.messages.batches.results(b.id):
        d = ids[x.custom_id]
        if x.result.type == 'succeeded':
            try: R[x.custom_id] = resposta(x.result.message, d)
            except Exception as ex: R[x.custom_id] = {'processo': d.get('processo', ''), 'veredito': 'erro', 'resumo': str(ex), 'ajustes': [], 'pendencias': []}
        else:
            R[x.custom_id] = {'processo': d.get('processo', ''), 'veredito': 'erro', 'resumo': 'lote: ' + x.result.type, 'ajustes': [], 'pendencias': []}
    return [R[k] for k in ids]


ORD_V = {'refazer': 0, 'erro': 1, 'ajustar': 2, 'pronta': 3}
ORD_C = {'ALTA': 0, 'MÉDIA': 1, 'BAIXA': 2}


def cel(s):
    return str(s or '').replace('|', '\\|').replace('\n', ' ').strip()


def relatorio(P, R, a, saida):
    linhas = []
    for (arq, d), r in zip(P, R):
        r['_item'] = d.get('item', ''); r['_sessao'] = d.get('sessao', ''); r['_grupo'] = (d.get('grupo') or {}).get('id', '')
        r['ajustes'] = sorted(r.get('ajustes') or [], key=lambda z: ORD_C.get(z.get('criticidade'), 9))
        linhas.append(r)
        nome = 'item%s_%s.json' % (d.get('item', ''), re.sub(r'\D', '', d.get('processo', '')))
        (saida / 'casos').mkdir(parents=True, exist_ok=True)
        (saida / 'casos' / nome).write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding='utf-8')
        if r.get('texto_corrigido'):
            (saida / 'casos' / nome.replace('.json', '_minuta.txt')).write_text(r['texto_corrigido'], encoding='utf-8')
    linhas.sort(key=lambda r: (ORD_V.get(r.get('veredito'), 9), int(re.sub(r'\D', '', str(r['_item'])) or 0)))
    cont = {}
    for r in linhas: cont[r.get('veredito')] = cont.get(r.get('veredito'), 0) + 1
    ses = sorted({r['_sessao'] for r in linhas if r['_sessao']})
    M = ['# Conferência final · 28,86%%'.replace('%%', '%') + (' · sessão ' + ', '.join('/'.join(reversed(s.split('-'))) for s in ses) if ses else ''), '',
         'Gerado em %s com %s · %d processo(s): %s.' % (dt.datetime.now().strftime('%d/%m/%Y %H:%M'), a.modelo, len(linhas),
                                                       ', '.join('%d %s' % (v, k) for k, v in sorted(cont.items(), key=lambda x: ORD_V.get(x[0], 9)))), '',
         '| Item | Processo | Grupo | Veredito | Resumo |', '|---|---|---|---|---|']
    for r in linhas:
        M.append('| %s | %s | %s | **%s** | %s |' % (cel(r['_item']), cel(r.get('processo')), cel(r['_grupo']), cel(r.get('veredito')), cel(r.get('resumo'))))
    for r in linhas:
        if not r.get('ajustes') and not r.get('pendencias'): continue
        M += ['', '## Item %s · %s · %s' % (r['_item'], r.get('processo', ''), r.get('veredito', '')), '', cel(r.get('resumo')), '']
        if r.get('ajustes'):
            M += ['| Local | Problema | Correção | Natureza | Criticidade |', '|---|---|---|---|---|']
            for z in r['ajustes']:
                M.append('| %s | %s | %s | %s | %s |' % (cel(z.get('local')), cel(z.get('problema')) + (' — trecho: “' + cel(z.get('trecho')) + '”' if z.get('trecho') else ''),
                                                       cel(z.get('correcao')), cel(z.get('natureza')), cel(z.get('criticidade'))))
        if r.get('pendencias'):
            M += ['', 'Pendências:'] + ['- ' + cel(p) for p in r['pendencias']]
    (saida / 'relatorio.md').write_text('\n'.join(M) + '\n', encoding='utf-8')
    (saida / 'relatorio.json').write_text(json.dumps(linhas, ensure_ascii=False, indent=1), encoding='utf-8')
    return cont


def main():
    ap = argparse.ArgumentParser(description='Conferência final das minutas de 28,86% pela API do Claude.')
    ap.add_argument('entradas', nargs='+', help='pacotes conf-2886_*.json ou pastas com eles')
    ap.add_argument('--saida', default='', help='pasta do relatório (padrão: conferencia-2886_AAAA-MM-DD_HHMM)')
    ap.add_argument('--modelo', default=os.environ.get('CONF2886_MODELO', MODELO_PADRAO))
    ap.add_argument('--paralelo', type=int, default=4, help='processos conferidos ao mesmo tempo (fora do lote)')
    ap.add_argument('--lote', action='store_true', help='usa a Message Batches API (metade do custo; espera o lote terminar)')
    ap.add_argument('--texto', action='store_true', help='pede também o texto integral corrigido de cada minuta')
    ap.add_argument('--ensaio', action='store_true', help='não chama a API: mostra tamanhos e grava o prompt montado')
    a = ap.parse_args()
    P = ler_pacotes(a.entradas)
    if not P: sys.exit('Nenhum pacote de conferência encontrado.')
    saida = Path(a.saida or 'conferencia-2886_' + dt.datetime.now().strftime('%Y-%m-%d_%H%M')); saida.mkdir(parents=True, exist_ok=True)
    if a.ensaio:
        S = sistema(); tam = sum(len(x['text']) for x in S)
        (saida / 'sistema_montado.txt').write_text('\n\n'.join(x['text'] for x in S), encoding='utf-8')
        for arq, d in P:
            print('item %-4s %s · grupo %s · %d módulos · minuta %d caracteres' % (d.get('item', ''), d.get('processo', ''), (d.get('grupo') or {}).get('id', ''), len(d.get('modulos') or []), len(d.get('minuta', ''))))
        print('sistema: %d caracteres (~%d mil tokens, em cache); %d processo(s); modelo %s' % (tam, tam // 3500, len(P), a.modelo))
        print('prompt gravado em', saida / 'sistema_montado.txt'); return
    if not os.environ.get('ANTHROPIC_API_KEY'): sys.exit('Defina ANTHROPIC_API_KEY com a chave criada no Claude Console.')
    import anthropic
    cli = anthropic.Anthropic()
    if a.lote:
        R = em_lote(cli, P, a)
    else:
        with cf.ThreadPoolExecutor(max_workers=max(1, a.paralelo)) as ex:
            fut = [ex.submit(um, cli, d, a) for _, d in P]
            R = []
            for i, f in enumerate(fut):
                R.append(f.result()); print('  %d/%d %s: %s' % (i + 1, len(P), P[i][1].get('processo', ''), R[-1].get('veredito')), file=sys.stderr)
    cont = relatorio(P, R, a, saida)
    print('Conferência concluída:', ', '.join('%d %s' % (v, k) for k, v in cont.items()), '→', saida / 'relatorio.md')


if __name__ == '__main__':
    main()
