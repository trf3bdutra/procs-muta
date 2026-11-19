# -*- coding: utf-8 -*-
"""Leva o que está registrado nos lotes do Index (acervo/lotes/*.json) para os dados do processo.

1. Ficha única (acervo/operacional.json)
   - campos do lote, sempre atualizados a partir do lote: producao."Lote …" e origem."Autos …";
   - campos já existentes, preenchidos só quando vazios: Sentença (ID e data), Recursos,
     Contrarrazões, Outras peças, ID do Parecer MPF, Subassunto, Voto - Resultado.
2. Prontuário da pauta (acervo/sessoes/<sessão>.json, ctl.cartao), só campos vazios:
   tipo de julgamento, decisão de origem (ID e data), embargos de declaração, agravo interno,
   agravo de instrumento, ID do parecer, resultado, observação geral; e as pendências:
   a pendência "disponibilizar os documentos ao agente" é dada por cumprida quando os autos
   foram extraídos, e as pendências do lote entram no cartão.

Nada que a equipe preencheu é apagado: os campos comuns só recebem valor quando estão vazios.
Uso: python3 scripts/lotes/alimentar.py [lote ...]   (padrão: todos)
"""
import datetime, glob, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HOJE = datetime.date.today().isoformat()
OP = os.path.join(RAIZ, 'acervo/operacional.json')
dg = lambda s: re.sub(r'\D', '', s or '')


def dt(s):
    m = re.match(r'(\d{2})/(\d{2})/(\d{4})', s or '')
    return (m.group(3), m.group(2), m.group(1)) if m else ('9999',)


def vazio(v):
    return v is None or v == '' or v == [] or v == {}


def classifica(docs, recurso):
    """docs: [id, data, tipo, descrição, juntado por, formato, páginas] em ordem de ID."""
    R = lambda rx, d: re.search(rx, d[2] + ' ' + d[3], re.I)
    ai = re.search(r'agravo de instrumento', recurso or '', re.I)
    rec, contra, outras, sent, parecer = [], [], [], [], None
    for d in docs:
        t = d[2]
        if re.match(r'(Apela|Recurso|Agravo|Embargos de Declara)', t, re.I) or (ai and re.match(r'Peti[çc][ãa]o Inicial', t, re.I)):
            rec.append(d)
        elif re.match(r'Contrarraz', t, re.I):
            contra.append(d)
        elif re.match(r'Senten[çc]a', t, re.I):
            sent.append(d)
        elif re.match(r'Parecer', t, re.I) and re.search(r'MINIST|PROCURADORIA-REGIONAL DA REP|\(MP\)|MPF', d[4] + ' ' + d[3] + ' ' + t, re.I):
            parecer = d
        elif re.match(r'(Peti[çc][ãa]o Inicial|Emenda|Contesta|Informa[çc][õo]es|Decis[ãa]o|Ac[óo]rd[ãa]o|Certid[ãa]o de julgamento|Voto|Ementa|Parecer|Laudo|Memoriais)', t, re.I):
            outras.append(d)
    # agrupa peças do mesmo dia e da mesma pessoa (capa + PDF anexo)
    def junta(lst):
        g = {}
        for d in lst:
            g.setdefault((d[1], d[4]), []).append(d)
        out = []
        for (data, por), ds in g.items():
            out.append({'ids': ', '.join(x[0] for x in ds), 'data': data, 'por': por,
                        'tipo': ds[0][2], 'desc': next((x[3] for x in ds if x[3]), '')})
        return sorted(out, key=lambda x: dt(x['data']))
    rec_j, contra_j = junta(rec), junta(contra)
    s = None
    if sent:
        lim = dt(rec_j[0]['data']) if rec_j else ('9999',)
        antes = [d for d in sent if dt(d[1]) <= lim]
        s = (antes or sent)[-1]
    return rec_j, contra_j, junta(outras), s, parecer


def tipo_julg(it, rec_j):
    r = (it.get('recurso') or '').lower()
    ult = rec_j[-1]['tipo'].lower() if rec_j else ''
    if 'embargos de declara' in ult:
        return 'Embargos de Declaração'
    if 'agravo interno' in ult:
        return 'Agravo Interno'
    if 'agravo de instrumento' in r:
        return 'Agravo de Instrumento'
    if 'remessa' in r and 'apela' not in r:
        return 'Remessa Necessária'
    if 'apela' in r or 'apela' in ult:
        return 'Apelação'
    return ''


def carrega_json(p):
    return json.load(open(p, encoding='utf-8'))


def grava_json(p, d):
    open(p, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=1) + '\n')


def main(lotes):
    op = carrega_json(OP)
    regs = {dg(r.get('processo')): r for r in op.get('registros', [])}
    sessoes, mud_op, mud_s = {}, 0, {}
    for lote_id in lotes:
        L = carrega_json(os.path.join(RAIZ, 'acervo/lotes', lote_id + '.json'))
        for it in L.get('itens', []):
            cnj = it['processo']
            a = it.get('autos') or {}
            docs = a.get('documentos') or []
            rec_j, contra_j, outras_j, sent, parecer = classifica(docs, it.get('recurso'))
            # ---------- ficha única ----------
            r = regs.get(dg(cnj))
            if r is None:
                r = {'processo': cnj, 'origem': {}, 'triagem': {}, 'producao': {}, 'pauta': {'sessoes': []}, 'controles': {}}
                op['registros'].append(r); regs[dg(cnj)] = r
            o, t, pr = r.setdefault('origem', {}), r.setdefault('triagem', {}), r.setdefault('producao', {})
            antes = json.dumps(r, ensure_ascii=False, sort_keys=True)
            eq = it.get('equipe') or {}
            pr['Lote'] = f"{L.get('titulo', lote_id)} · item {it['item']}" + (f" · sessão {it['sessao']}" if it.get('sessao') else '')
            pr['Lote - Tipo de caso'] = it.get('tipo_caso') or it.get('assunto') or ''
            pr['Lote - Resultado'] = it.get('resultado') or ''
            pr['Lote - Variações'] = '; '.join(it.get('variacoes') or [])
            pr['Lote - Caso'] = it.get('peculiaridades') or ''
            pr['Lote - Observação'] = it.get('observacao') or ''
            aj = [x for x in (it.get('ajustes') or []) if isinstance(x, list) and len(x) >= 3 and x[0] != 'Seção']
            pr['Lote - Ajustes da correção'] = [{'secao': x[0], 'ajuste': x[1], 'tipo': x[2]} for x in aj]
            pr['Lote - Pendências'] = '\n'.join(it.get('pendencias') or [])
            mp = os.path.join(RAIZ, 'acervo/minutas', lote_id, cnj[:10] + '.json')
            if os.path.exists(mp):
                m = carrega_json(mp)
                pr['Lote - Minuta'] = f"versão {m.get('versao', '')} · {m.get('atualizado_em', '')} · {m.get('origem', '')}".strip()
            else:
                pr['Lote - Minuta'] = 'sem minuta no lote'
            if docs:
                o['Autos - Extraído em'] = a.get('extraido_em', '')
                o['Autos - Total'] = str(len(docs))
                o['Autos - Sem texto'] = ', '.join(a.get('sem_texto') or [])
                o['Autos - Documentos'] = [{'id': d[0], 'data': d[1], 'documento': d[2] + (' · ' + d[3] if d[3] else ''),
                                            'juntado': d[4], 'formato': d[5] + (f' · {d[6]} p.' if d[6] else '')} for d in docs]
            if sent and vazio(o.get('Sentença - ID')):
                o['Sentença - ID'] = sent[0]
            if sent and vazio(o.get('Sentença - Data')):
                o['Sentença - Data'] = sent[1]
            if rec_j and vazio(o.get('Recursos')):
                o['Recursos'] = [{'parte': x['por'], 'ids': x['ids'], 'data': x['data'], 'preliminares': '', 'teses': x['desc'] if x['desc'] != x['tipo'] else '', 'pedidos': '', 'merito': x['tipo']} for x in rec_j]
            if contra_j and vazio(o.get('Contrarrazões')):
                o['Contrarrazões'] = [{'parte': x['por'], 'ids': x['ids'], 'data': x['data'], 'preliminares': '', 'teses': ''} for x in contra_j]
            if outras_j and vazio(o.get('Outras peças')):
                o['Outras peças'] = [{'tipo': x['tipo'] + (' · ' + x['desc'] if x['desc'] and x['desc'] != x['tipo'] else ''), 'ids': x['ids'], 'data': x['data'], 'texto': x['por']} for x in outras_j]
            if parecer and vazio(t.get('ID do Parecer MPF')):
                t['ID do Parecer MPF'] = parecer[0]
            if vazio(t.get('Tema')) and (it.get('tipo_caso') or it.get('assunto')):
                t['Tema'] = it.get('tipo_caso') or it.get('assunto')
            if vazio(pr.get('Voto - Resultado')) and it.get('resultado'):
                pr['Voto - Resultado'] = it['resultado']
            if json.dumps(r, ensure_ascii=False, sort_keys=True) != antes:
                o['atualizado_em'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
                mud_op += 1
            # ---------- prontuário da pauta ----------
            ses = it.get('sessao')
            sp = os.path.join(RAIZ, 'acervo/sessoes', (ses or '') + '.json')
            if not ses or not os.path.exists(sp):
                continue
            S = sessoes.setdefault(sp, carrega_json(sp))
            x = next((y for y in S.get('itens', []) if dg(y.get('cnj')) == dg(cnj)), None)
            if x is None:
                continue
            antes = json.dumps(x, ensure_ascii=False, sort_keys=True)
            ctl = x.setdefault('ctl', {}); c = ctl.setdefault('cartao', {})
            def poe(caminho, v):
                if vazio(v):
                    return
                ks = caminho.split('.'); alvo = c
                for k in ks[:-1]:
                    alvo = alvo.setdefault(k, {})
                if vazio(alvo.get(ks[-1])):
                    alvo[ks[-1]] = v
            tj = tipo_julg(it, rec_j)
            poe('tipoJ', tj)
            if sent:
                poe('orig.tipo', 'Sentença'); poe('orig.id', sent[0]); poe('orig.data', sent[1])
            ed = [y for y in rec_j if 'embargos de declara' in y['tipo'].lower()]
            if ed:
                poe('ed.id', ed[-1]['ids'].split(', ')[0]); poe('ed.data', ed[-1]['data'])
            ag = [y for y in rec_j if 'agravo interno' in y['tipo'].lower()]
            if ag:
                poe('agint.id', ag[-1]['ids'].split(', ')[0]); poe('agint.data', ag[-1]['data'])
            if tj == 'Agravo de Instrumento' and rec_j:
                poe('ai.id', rec_j[0]['ids'].split(', ')[0]); poe('ai.data', rec_j[0]['data'])
            if parecer:
                poe('mpfx.id', parecer[0])
            poe('obsGeral', it.get('observacao'))
            if vazio(ctl.get('resJulg')) and it.get('resultado'):
                ctl['resJulg'] = it['resultado']
            pend = c.setdefault('pendencias', [])
            if docs:
                for p in pend:
                    if not p.get('ok') and re.search(r'Disponibilizar os documentos do processo ao agente', p.get('desc', '')):
                        p['ok'] = True; p['okEm'] = HOJE; p['okPor'] = 'Index · autos extraídos do PJe'
            ja = {p.get('desc') for p in pend}
            for d in it.get('pendencias') or []:
                if d not in ja and not re.match(r'N[ãa]o h[áa] pend', d):
                    pend.append({'desc': d, 'ok': False, 'em': HOJE, 'por': 'Index · lote ' + lote_id})
            ctl['lote'] = {'id': lote_id, 'item': it['item'], 'autos': len(docs)}
            if json.dumps(x, ensure_ascii=False, sort_keys=True) != antes:
                ctl['editadoPor'] = ctl.get('editadoPor') or 'Index'
                mud_s[sp] = mud_s.get(sp, 0) + 1
    if mud_op:
        op['atualizado_em'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        grava_json(OP, op)
    for sp, n in mud_s.items():
        sessoes[sp]['atualizadoEm'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        grava_json(sp, sessoes[sp])
    print('ficha única:', mud_op, 'processos atualizados')
    for sp, n in mud_s.items():
        print(os.path.basename(sp), n, 'cartões atualizados')


if __name__ == '__main__':
    todos = [os.path.basename(f)[:-5] for f in glob.glob(os.path.join(RAIZ, 'acervo/lotes/*.json'))]
    main(sys.argv[1:] or todos)
