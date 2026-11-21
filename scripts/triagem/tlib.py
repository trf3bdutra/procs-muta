"""Monta o registro de triagem (lote) e os campos da ficha a partir de um dicionário curto."""
import json, re
HOJE = '21/11/2026'
def iso(d):
    m = re.match(r'(\d{2})/(\d{2})/(\d{4})', d or ''); return f'{m.group(3)}-{m.group(2)}-{m.group(1)}' if m else (d or '')
def mk(d):
    t = d.get('teor', {}); c = d.get('cartao', {}); k = dict(d.get('ctl', {}))
    val = d.get('validar') or []
    res = 'Ato a proferir: ' + d['ato_txt']
    if d.get('proposta'): res += ' ‖ Proposta pelos precedentes: ' + d['proposta']
    if val: res += ' [VALIDAR: ' + '; '.join(val) + ']'
    if d.get('fundamento'): k['fundamento'] = d['fundamento']
    for a, b in [('obs_repres', 'obsRepres'), ('ajg', 'ajg'), ('desc_prelim', 'descPrelim'), ('id_parecer', 'idParecer'), ('parecer_sentido', 'parecerSentido')]:
        if d.get(a): k[b] = d[a]
    tri = {'ato': d['ato'], 'materia': d['materia'], 'origem': d.get('origem', ''), 'decisao_agravada': d.get('decisao_agravada', ''),
           'recurso': d.get('recurso', ''), 'preparo': d.get('preparo', ''), 'monocratica': d.get('monocratica', ''), 'analisado_em': HOJE}
    if d.get('conf_preparo'): tri['conf_preparo'] = d['conf_preparo']
    if d.get('conf_prevencao'): tri['conf_prevencao'] = d['conf_prevencao']
    teor = {'sintese_fatica': t.get('sintese', ''), 'inicial': t.get('inicial', ''), 'decisao_recorrida': t.get('decisao', ''), 'recurso': t.get('recurso', ''),
            'resposta': t.get('resposta', ''), 'parecer': t.get('parecer', 'Não consta'), 'memoriais': t.get('memoriais', 'Não consta'),
            'representacao': t.get('representacao', ''), 'preparo': t.get('preparo', '')}
    cart = {'tipoJ': c.get('tipoJ', 'Agravo de Instrumento'), 'subassuntos': d['tipo_caso'], 'sintese': t.get('sintese', ''), 'questoes': c.get('questoes', ''),
            'rel': {'razoes': t.get('recurso', ''), 'contrarrazoes': t.get('resposta', '')}, 'orig': c.get('orig', {}), 'ai': c.get('ai', {}),
            'adm': c.get('adm', {}), 'recursos': c.get('recursos', []), 'pecas': [dict(p, data=iso(p.get('data'))) for p in c.get('pecas', [])],
            'pendencias': c.get('pend', ''), 'especificidades': d.get('especificidades', ''), 'assuntoDet': d['assunto_det'], 'papeis': c.get('papeis', [])}
    item = {'processo': d['cnj'], 'tipo_caso': d['tipo_caso'], 'assunto_detalhado': d['assunto_det'], 'resultado': res, 'observacao': d['observacao'],
            'peculiaridades': d.get('peculiaridades', ''), 'especificidades': d.get('especificidades', ''), 'variacoes': d.get('variacoes', []),
            'pendencias': d.get('pendencias', []), 'triagem': tri, 'teor': teor, 'prontuario_triagem': {'cartao': cart, 'ctl': k}}
    if d.get('grupo') is not None: item['grupo'] = d['grupo']
    if d.get('mpf_txt'): item['mpf'] = d['mpf_txt']
    F = {'triagem.Tempestividade': k.get('tempest', 'Não verificado'), 'triagem.Preparo': k.get('preparo', 'Não verificado'),
         'triagem.Representação': k.get('repres', 'Não verificado'), 'triagem.Mídias': k.get('midias', 'Não se aplica'),
         'triagem.Prelim.': k.get('prelim', 'Sem preliminares'), 'triagem.MPF - Custos Legis': k.get('mpf', 'Sem hipótese'),
         'triagem.MPF': k.get('parecer') or ('Não se aplica' if k.get('mpf', 'Sem hipótese') == 'Sem hipótese' else 'Não verificado'),
         'triagem.Tema': d['tipo_caso'], 'triagem.Síntese Fática': t.get('sintese', ''), 'triagem.Especificidades': d.get('especificidades', ''),
         'triagem.Tipo de Julgamento': cart['tipoJ']}
    if c.get('questoes'): F['triagem.Alegações'] = c['questoes']
    if k.get('urgTipo'): F['triagem.Urgência'] = k['urgTipo']
    if k.get('urgSit'): F['triagem.Urgência - Apreciação'] = k['urgSit']
    if d.get('fundamento'): F['producao.Mono - Fundamento'] = d['fundamento']
    for a, b in [('obs_repres', 'triagem.Observação da Representação'), ('ajg', 'triagem.AJG'), ('desc_prelim', 'triagem.Descrição da Preliminar'),
                 ('id_parecer', 'triagem.ID do Parecer MPF'), ('parecer_sentido', 'triagem.Parecer - Sentido')]:
        if d.get(a): F[b] = d[a]
    return item, {'cnj': d['cnj'], 'campos': {x: y for x, y in F.items() if y not in (None, '')}}
