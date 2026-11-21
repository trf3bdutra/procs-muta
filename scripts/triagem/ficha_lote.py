# -*- coding: utf-8 -*-
"""Leva o registro completo da triagem (itens dos lotes adp-*) para a ficha única do processo (acervo/operacional.json).

1. Grupo "Registro da triagem (lote)" (triagem."Registro - …", só leitura na ficha): sempre atualizado a partir do lote:
   lote e item, assunto detalhado, grupo da matriz, variações, proposta, modelo, triagem, situação atual,
   teor dos autos e a tabela de peças (com nota da triagem e trecho dos autos).
2. Campos comuns da ficha, preenchidos só quando vazios (nada que a equipe escreveu é apagado):
   origem: Sentença - ID / Data / Decisão / Resultado, Origem - Juízo, Recursos, Contrarrazões,
           Contrarrazões - Situação, Autos - Extraído em / Total / Sem texto;
   triagem: Tempest - Protocolo / Prazo legal / Dobro, Observação da Representação, MPF - Info adicional,
           Síntese Fática, Alegações.
Destino e Seleção Prévia não são tocados (decisão do gabinete).
Uso: python3 scripts/triagem/ficha_lote.py [lote ...]   (padrão: adp-ai, adp-remessas, adp-ap-*, depois as séries)
"""
import datetime, glob, gzip, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(RAIZ, 'scripts'))
import vocabulario as VOC  # noqa: E402
OP = os.path.join(RAIZ, 'acervo/operacional.json')
dg = lambda s: re.sub(r'\D', '', s or '')
vazio = lambda v: v is None or v == '' or v == [] or v == {}


def br(d):
    d = str(d or '')
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})$', d)
    return f'{m.group(3)}/{m.group(2)}/{m.group(1)}' if m else d


def iso(d):
    d = str(d or '')
    m = re.match(r'(\d{2})/(\d{2})/(\d{4})$', d)
    return f'{m.group(3)}-{m.group(2)}-{m.group(1)}' if m else d


def _json(v):
    while isinstance(v, str) and v[:1] in '[{':
        try:
            v = json.loads(v)
        except ValueError:
            break
    return v


def linhas(pares):
    return '\n'.join(f'{r}: {v}' for r, v in pares if not vazio(v) and not re.match(r'N[ãa]o consta\.?$', str(v)))


TRI = [('ato', 'Ato a proferir'), ('materia', 'Matéria'), ('origem', 'Origem'), ('decisao_agravada', 'Decisão impugnada'), ('recurso', 'Recurso'),
       ('preparo', 'Preparo'), ('monocratica', 'Monocrática'), ('conf_preparo', 'Conferência do preparo'), ('conf_prevencao', 'Conferência da prevenção'), ('analisado_em', 'Analisado em')]
SIT = [('ultima_decisao', 'Última decisão'), ('ultima_decisao_relevante', 'Última decisão relevante'), ('ultima_peca', 'Última peça'), ('ultima_informacao', 'Última informação'),
       ('ultima_movimentacao', 'Última movimentação'), ('aviso', 'Aviso'), ('mov_fonte', 'Fonte da movimentação')]
TEOR = [('sintese_fatica', 'Síntese fática'), ('inicial', 'Inicial'), ('decisao_recorrida', 'Decisão recorrida'), ('recurso', 'Recurso'), ('resposta', 'Resposta'),
        ('parecer', 'Parecer do MPF'), ('memoriais', 'Memoriais'), ('representacao', 'Representação'), ('preparo', 'Preparo')]


def decisao_origem(disp):
    t = (disp or '').lower()
    if re.search(r'parcialmente procedente|concedeu parcialmente a seguran|procedência parcial|parcial procedência', t): return 'Parcialmente procedente'
    if re.search(r'improceden|denegou a seguran|denegada a seguran', t): return 'Improcedente'
    if re.search(r'procedente|concedeu a seguran|concedida a seguran|procedência', t): return 'Procedente'
    if re.search(r'sem resolução do mérito|sem julgamento do mérito|extingui|extinção', t): return 'Extinção sem resolução do mérito'
    if re.search(r'homolog', t): return 'Homologatória'
    return ''


def main(lotes):
    O = json.load(open(OP, encoding='utf-8'))
    regs = {dg(r.get('processo')): r for r in O['registros']}
    feitos, mud = set(), 0
    agora = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    for lid in lotes:
        L = json.load(open(os.path.join(RAIZ, 'acervo/lotes', lid + '.json'), encoding='utf-8'))
        cols = {c['id']: c.get('rotulo', c['id']) for c in L.get('colunas', [])}
        grupos = {g['id']: g for g in L.get('grupos', [])}
        for it in L.get('itens', []):
            PR = it.get('prontuario_triagem') or {}
            c = PR.get('cartao') or {}
            if not c and not it.get('triagem'):
                continue                      # ainda não triado
            d = dg(it['processo'])
            if d in feitos:
                continue                      # o lote principal vem antes das séries
            feitos.add(d)
            r = regs.get(d)
            if r is None:
                continue
            o, t = r.setdefault('origem', {}), r.setdefault('triagem', {})
            antes = json.dumps(r, ensure_ascii=False, sort_keys=True)
            g = grupos.get(it.get('grupo')) or {}
            te, tr, sa, orig, adm, rel = it.get('teor') or {}, it.get('triagem') or {}, it.get('situacao_atual') or {}, c.get('orig') or {}, c.get('adm') or {}, c.get('rel') or {}
            P = c.get('pecas') or []
            data_de = {str(p.get('id')): br(p.get('data')) for p in P if isinstance(p, dict)}
            # ---------- 1. registro da triagem ----------
            REG = {
                'Registro - Lote': f"{L.get('titulo', lid)} ({lid}) · item {it.get('item', '')}",
                'Registro - Assunto detalhado': it.get('assunto_detalhado') or '',
                'Registro - Grupo': linhas([('Grupo', g.get('rotulo')), ('Resultado do grupo', g.get('resultado')), ('Modelo do grupo', g.get('modelo'))]),
                'Registro - Variações': '; '.join(cols.get(v, v) for v in (it.get('variacoes') or [])),
                'Registro - Proposta': it.get('resultado') or '',
                'Registro - Modelo': it.get('modelo') or '',
                'Registro - Triagem': linhas([(rr, tr.get(k)) for k, rr in TRI]),
                'Registro - Situação atual': linhas([(rr, sa.get(k)) for k, rr in SIT]),
                'Registro - Teor dos autos': linhas([(rr, te.get(k)) for k, rr in TEOR]),
                'Registro - Peças': [{'data': br(p.get('data')), 'id': str(p.get('id') or ''), 'peca': p.get('desc') or '',
                                      'pje': ' · '.join(x for x in [(p.get('pje') or {}).get('tipo'), (p.get('pje') or {}).get('descricao'),
                                                                     ('juntado por ' + (p.get('pje') or {}).get('juntado_por')) if (p.get('pje') or {}).get('juntado_por') else '',
                                                                     (str((p.get('pje') or {}).get('paginas')) + ' p.') if (p.get('pje') or {}).get('paginas') else '',
                                                                     'sem texto' if (p.get('pje') or {}).get('sem_texto') else ''] if x),
                                      'nota': p.get('nota') or '', 'trecho': p.get('trecho') or ''} for p in P if isinstance(p, dict)],
            }
            for k, v in REG.items():
                if vazio(v):
                    t.pop(k, None)
                else:
                    t[k] = v
            # ---------- 2. campos comuns, só quando vazios ----------
            def fp(sec, k, v):
                if not vazio(v) and vazio(sec.get(k)):
                    sec[k] = v
            if orig.get('id'):
                fp(o, 'Sentença - ID', str(orig['id'])); fp(o, 'Sentença - Data', data_de.get(str(orig['id']), ''))
            fp(o, 'Sentença - Resultado', orig.get('dispositivo'))
            if re.search(r'senten', orig.get('tipo') or '', re.I):
                fp(o, 'Sentença - Decisão', decisao_origem(orig.get('dispositivo')))
            fp(o, 'Origem - Juízo', orig.get('juizo'))
            recs = [x for x in (c.get('recursos') or []) if isinstance(x, dict)]
            if recs and vazio(o.get('Recursos')):
                o['Recursos'] = [{'parte': x.get('parte') or '', 'ids': str(x.get('id') or ''), 'data': data_de.get(str(x.get('id')), ''), 'preliminares': '',
                                  'teses': (rel.get('razoes') or te.get('recurso') or '') if len(recs) == 1 else next((p.get('nota') for p in P if str(p.get('id')) == str(x.get('id')) and p.get('nota')), ''),
                                  'pedidos': '', 'merito': x.get('tipo') or ''} for x in recs]
            cr = [p for p in P if isinstance(p, dict) and re.search(r'contrarraz|contramin', p.get('desc') or '', re.I)]
            if cr and vazio(o.get('Contrarrazões')):
                o['Contrarrazões'] = [{'parte': re.sub(r'^(contrarraz[õo]es|contraminuta)\s*(d[aoe]s?\s+)?', '', p.get('desc') or '', flags=re.I), 'ids': str(p.get('id') or ''),
                                       'data': br(p.get('data')), 'preliminares': '', 'teses': (rel.get('contrarrazoes') or te.get('resposta') or '') if len(cr) == 1 else (p.get('nota') or '')} for p in cr]
            if cr:
                fp(o, 'Contrarrazões - Situação', 'apresentadas')
            ap = os.path.join(RAIZ, 'acervo/autos', it['processo'] + '.json.gz')
            if os.path.exists(ap):
                a = json.load(gzip.open(ap))
                docs = _json(a.get('docs')) or []
                falta = [str(x) for x in (_json(a.get('faltam')) or [])]
                fp(o, 'Autos - Extraído em', str(a.get('extraido_em') or '')[:10]); fp(o, 'Autos - Total', str(len(docs)) if docs else '')
                fp(o, 'Autos - Sem texto', ', '.join(falta))
            fp(t, 'Tempest - Protocolo', iso(adm.get('prot'))); fp(t, 'Tempest - Prazo legal', str(adm.get('prazo') or ''))
            if adm.get('dobro') is True:
                fp(t, 'Tempest - Dobro', 'Sim')
            fp(t, 'Observação da Representação', te.get('representacao'))
            if te.get('parecer') and not re.match(r'N[ãa]o consta', te['parecer']):
                fp(t, 'MPF - Info adicional', te['parecer'])
            fp(t, 'Síntese Fática', c.get('sintese') or te.get('sintese_fatica')); fp(t, 'Alegações', c.get('questoes'))
            # prontuário de triagem (controles do lote), no vocabulário único, só quando vazios
            PL = PR.get('ctl') or {}
            for k, v in [('Tempestividade', VOC.norm('tempest', PL.get('tempest'))), ('Preparo', VOC.norm('preparo', PL.get('preparo'))),
                         ('Representação', VOC.norm('repres', PL.get('repres'))), ('Prelim.', VOC.norm('prelim', PL.get('prelim'))),
                         ('Mídias', VOC.norm('midias', PL.get('midias'))), ('MPF - Custos Legis', VOC.norm('mpf', PL.get('mpf'))),
                         ('MPF', VOC.norm('parecer', PL.get('parecer'))), ('Tipo de Julgamento', c.get('tipoJ')), ('Urgência', PL.get('urgTipo')),
                         ('Urgência - Apreciação', PL.get('urgSit')), ('Observação da Representação', PL.get('obsRepres')), ('AJG', PL.get('ajg')),
                         ('Descrição da Preliminar', PL.get('descPrelim')), ('ID do Parecer MPF', PL.get('idParecer')), ('Parecer - Sentido', PL.get('parecerSentido'))]:
                fp(t, k, v)
            if it.get('tipo_caso') and (vazio(t.get('Tema')) or t.get('Tema') == it.get('assunto')):
                t['Tema'] = it['tipo_caso']
            fp(r.setdefault('producao', {}), 'Mono - Fundamento', PL.get('fundamento'))
            if json.dumps(r, ensure_ascii=False, sort_keys=True) != antes:
                t['Registro - Atualizado em'] = agora[:10]
                o['atualizado_em'] = agora
                mud += 1
    if mud:
        O['atualizado_em'] = agora
        open(OP, 'w', encoding='utf-8').write(json.dumps(O, ensure_ascii=False, indent=1) + '\n')
    print('processos na ficha:', len(feitos), '· atualizados:', mud)


if __name__ == '__main__':
    base = ['adp-ai', 'adp-remessas', 'adp-ap-1s', 'adp-ap-2s', 'adp-ap-3s']
    series = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(RAIZ, 'acervo/lotes/adp-serie-*.json')))
    main(sys.argv[1:] or base + series)
