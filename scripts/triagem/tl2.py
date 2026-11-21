"""Atalho para registros de triagem no esquema do tlib.mk."""
def R(cnj, tipo, assunto, ato, ato_txt, materia, origem, dec_ag, recurso, preparo, mono, conf_preparo, conf_prev, obs, esp, sint, ini, dec, razoes,
      resp='Não consta.', parecer='Não consta', rep='', prep_t='', quest='', orig=('Decisão interlocutória', '', '', ''), ai=('Tutela provisória', 'Não apreciado', ''),
      prot='', recs=(), pecas=(), ctl=None, proposta='', peculiar='', val=(), pend=(), tipoJ='Agravo de Instrumento', papeis=('Réu/ré', 'Autor(a)'), grupo=None, **ex):
    d = dict(cnj=cnj, grupo=grupo, variacoes=['VAL'], tipo_caso=tipo, assunto_det=assunto, ato=ato, ato_txt=ato_txt, materia=materia, origem=origem,
             decisao_agravada=dec_ag, recurso=recurso, preparo=preparo, monocratica=mono, conf_preparo=conf_preparo, conf_prevencao=conf_prev,
             observacao=obs, peculiaridades=peculiar, especificidades=esp, validar=list(val), pendencias=list(pend),
             teor=dict(sintese=sint, inicial=ini, decisao=dec, recurso=razoes, resposta=resp, parecer=parecer, representacao=rep, preparo=prep_t),
             cartao=dict(tipoJ=tipoJ, questoes=quest, orig=dict(tipo=orig[0], id=orig[1], juizo=orig[2], dispositivo=orig[3]),
                         ai=dict(hip=ai[0], efeito=ai[1], id=ai[2]), adm=dict(prot=prot, prazo='15', dobro=False, ajg=False, dpu=False),
                         recursos=[dict(parte=a, tipo=b, id=c, contra=e) for a, b, c, e in recs], pecas=[dict(desc=a, id=b, data=c) for a, b, c in pecas],
                         pend='; '.join(pend), papeis=list(papeis)),
             ctl=dict(dict(tempest='Não verificado', preparo='Não verificado', prelim='Sem preliminares', repres='Regular', midias='Não se aplica', mpf='Sem hipótese'), **(ctl or {})),
             proposta=proposta)
    d.update(ex)
    if ex.get('adm'): d['cartao']['adm'].update(ex.pop('adm')); d.pop('adm', None)
    return d

def RM(cnj, tipo, assunto, origem, sentenca, disp_txt, sint, ini, ato, ato_txt, mono, obs, esp, proposta, parecer_id='', parecer_txt='', rep='', val=(), pend=(),
       pecas=(), prot='', quest='', apelacao=False, papeis=('Autor(a)', 'Réu/ré'), materia='', grupo=None, mpf='Mandado de segurança', **ex):
    """Remessa necessária (sem recurso voluntário, salvo apelacao=True)."""
    sid, sdata = sentenca
    return R(cnj, tipo, assunto, ato, ato_txt, materia, origem, f'Sentença ID {sid} ({sdata})', f'Remessa necessária · sentença de {sdata}', 'Não se aplica (remessa necessária)', mono,
             'NÃO SE APLICA · remessa necessária · conferido em 21/11/2026', 'Redistribuição à Turma Regional (Resolução 33/2025) · conferido em 21/11/2026',
             obs, esp, sint, ini, f'Sentença ID {sid} ({sdata}): {disp_txt}', 'Sem recurso voluntário; remessa necessária.' if not apelacao else 'Há apelação [VALIDAR].',
             parecer=(f'MPF ID {parecer_id}: {parecer_txt}' if parecer_id else 'Não consta'), rep=rep, prep_t='Não se aplica.', quest=quest,
             orig=('Sentença', sid, origem, disp_txt), ai=('Não se aplica', 'Não se aplica', ''), prot=prot, recs=[('Remessa', 'Remessa necessária', sid, 'Não se aplica')],
             pecas=pecas, ctl=dict(tempest='Não se aplica', preparo='Não se aplica', repres='Não verificado', mpf=mpf, parecer='Com parecer' if parecer_id else 'Não verificado'),
             proposta=proposta, val=val, pend=pend, tipoJ='Remessa Necessária', papeis=papeis, grupo=grupo,
             **({'id_parecer': parecer_id, 'parecer_sentido': parecer_txt} if parecer_id else {}), **ex)


def AP(cnj, tipo, assunto, origem, sentenca, disp_txt, apelos, sint, ini, ato, ato_txt, mono, obs, esp, proposta, resp='Não consta.', parecer_id='', parecer_txt='',
       rep='', val=(), pend=(), pecas=(), prot='', quest='', remessa=False, papeis=('Réu/ré', 'Autor(a)'), materia='', grupo=None, tempest='Não verificado',
       preparo='Não verificado', prep_t='', mpf='Sem hipótese', prelim='Sem preliminares', **ex):
    """Apelação (com ou sem remessa). apelos = [(parte, id, data, tipo_parte_preparo, razoes_resumo)]."""
    sid, sdata = sentenca
    recs = [(p, 'Apelação', i, 'Sentença') for p, i, _d, _pp, _r in apelos] + ([('Remessa', 'Remessa necessária', sid, 'Não se aplica')] if remessa else [])
    rz = ' '.join(f'{p} (ID {i}, {d}): {r}' for p, i, d, _pp, r in apelos)
    prep = '; '.join(f'{p}: {pp}' for p, _i, _d, pp, _r in apelos)
    rec_txt = ' e '.join(f'apelação de {p} (ID {i}, {d})' for p, i, d, _pp, _r in apelos) + (' · remessa necessária' if remessa else '')
    return R(cnj, tipo, assunto, ato, ato_txt, materia, origem, f'Sentença ID {sid} ({sdata})', rec_txt, prep, mono,
             f'{prep} · conferido em 21/11/2026', 'Redistribuição à Turma Regional (Resolução 33/2025) · conferido em 21/11/2026',
             obs, esp, sint, ini, f'Sentença ID {sid} ({sdata}): {disp_txt}', rz, resp=resp,
             parecer=(f'MPF ID {parecer_id}: {parecer_txt}' if parecer_id else 'Não consta'), rep=rep, prep_t=prep_t or prep, quest=quest,
             orig=('Sentença', sid, origem, disp_txt), ai=('Não se aplica', 'Não se aplica', ''), prot=prot, recs=recs, pecas=pecas,
             ctl=dict(tempest=tempest, preparo=preparo, repres='Não verificado', mpf=mpf, prelim=prelim, parecer='Com parecer' if parecer_id else 'Não verificado'),
             proposta=proposta, val=val, pend=pend, tipoJ='Apelação', papeis=papeis, grupo=grupo,
             **({'id_parecer': parecer_id, 'parecer_sentido': parecer_txt} if parecer_id else {}), **ex)
