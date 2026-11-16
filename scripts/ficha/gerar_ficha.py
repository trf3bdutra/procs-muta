#!/usr/bin/env python3
"""Gera padrao/ficha.json (ficha única padrão de processo) a partir de padrao/integracoes-ficha.md.

A ficha é a mesma do CMT-monitor: abas, grupos e campos, cada um com a chave e a seção onde fica
(fonte = só leitura; operacional · triagem/producao/pauta/origem = editável). Os apps leem este arquivo.
Uso: python3 scripts/ficha/gerar_ficha.py
"""
import json, re, pathlib
R = pathlib.Path(__file__).resolve().parents[2]
md = (R / 'padrao/integracoes-ficha.md').read_text(encoding='utf-8')
corpo = md.split('## Campos por aba', 1)[1].split('### Fora das abas', 1)[0]
abas, aba, grupo = [], None, None
TIPOS = {'lista': 'lista', 'texto': 'texto', 'texto longo': 'texto-longo', 'data': 'data', 'número': 'numero', 'Sim/—': 'simnao', 'sim/não': 'simnao', 'marcador': 'simnao'}
for l in corpo.splitlines():
    if l.startswith('### '):
        aba = {'aba': l[4:].strip(), 'grupos': []}; abas.append(aba); continue
    m = re.match(r'\*\*(.+)\*\*$', l.strip())
    if m:
        grupo = {'grupo': m.group(1), 'campos': []}; aba['grupos'].append(grupo); continue
    if not l.startswith('| ') or l.startswith('| Campo') or l.startswith('|---'):
        continue
    c = [x.strip() for x in l.strip().strip('|').split('|')]
    if len(c) < 6:
        continue
    rot, chave, tipo, onde, _, regra = c[:6]
    chave = chave.strip('`')
    mo = re.match(r'operacional · `(\w+)`', onde)
    secao = mo.group(1) if mo else None
    ft = re.match(r'fonte · `([^`]+)`', onde)
    calc = 'calculado' in tipo
    leitura = 'só leitura' in tipo
    t = 'texto'
    for k, v in TIPOS.items():
        if tipo.startswith(k):
            t = v
    campo = {'rotulo': rot, 'chave': chave, 'tipo': t}
    if secao:
        campo['secao'] = secao
    if ft:
        campo['fonte'] = [x.strip() for x in ft.group(1).split('·')]
    if leitura or not secao:
        campo['editavel'] = False
    elif calc:
        campo['calculado'] = True
    op = regra.split(';')[0]
    if t == 'lista' and ' / ' in op:
        campo['opcoes'] = [x.strip() for x in op.split(' / ') if x.strip()]
    if regra and 'opcoes' not in campo:
        campo['regra'] = regra
    elif ';' in regra:
        campo['regra'] = regra.split(';', 1)[1].strip()
    grupo['campos'].append(campo)
# campos do operacional que a Ficha usa e o mapa não lista: entram no grupo da seção correspondente
EXTRAS = {('Triagem', 'Urgência'): [('Nível da urgência', 'Urgência - Nível', 'texto'), ('Apreciação da urgência', 'Urgência - Apreciação', 'texto'), ('Data da urgência', 'Urgência - Data', 'data')],
          ('Triagem', 'Admissibilidade e regularidade'): [('Intimação / publicação', 'Tempest - Publicação', 'data'), ('Protocolo do recurso', 'Tempest - Protocolo', 'data'),
              ('Prazo legal (dias úteis)', 'Tempest - Prazo legal', 'numero'), ('Prazo em dobro', 'Tempest - Dobro', 'simnao'), ('Suspensões de prazo', 'Tempest - Suspensões', 'texto'),
              ('AJG', 'AJG', 'texto'), ('Impedimento / suspeição', 'Impedimento / Suspeição', 'texto')],
          ('Triagem', 'Matéria e gestão'): [('Tipo de julgamento', 'Tipo de Julgamento', 'texto'), ('Hipóteses de monocrática', 'Hipóteses Monocrática', 'texto'),
              ('Síntese processual', 'Síntese Processual', 'texto-longo'), ('Síntese fática', 'Síntese Fática', 'texto-longo'), ('Especificidades', 'Especificidades', 'texto-longo')],
          ('Produção', 'Elaboração e revisão'): [('Destino', 'Destino', 'texto'), ('Data da revisão', 'Data da Revisão', 'data'), ('Data da liberação', 'Data da Liberação', 'data'), ('Revisão · IDs', 'Rev - IDs', 'texto')]}
SEC = {'Triagem': 'triagem', 'Produção': 'producao', 'Pauta': 'pauta', 'Processo': 'origem'}
for a in abas:
    for g in a['grupos']:
        tem = {c['chave'] for c in g['campos']}
        for rot, ch, t in EXTRAS.get((a['aba'], g['grupo']), []):
            if ch not in tem:
                g['campos'].append({'rotulo': rot, 'chave': ch, 'tipo': t, 'secao': SEC[a['aba']]})
# contagem do prazo: o CMT-monitor grava 1 (simples) ou 2 (em dobro) — mesmo valor na ficha
for a in abas:
    for g in a['grupos']:
        for c in g['campos']:
            if c['chave'] == 'Tempest - Dobro':
                c.update({'rotulo': 'Contagem do prazo', 'tipo': 'lista', 'opcoes': ['1', '2'], 'regra': '1 = simples · 2 = em dobro (Fazenda Pública, MP, Defensoria)'})
# Produção em duas versões, conforme o destino do processo: sessão (colegiado) ou decisão monocrática
def _prod(a):
    C = {c['chave']: c for g in a['grupos'] for c in g['campos']}
    def g(nome, chaves, destino=None, rot=None):
        out = {'grupo': nome, 'campos': []}
        for k in chaves:
            if k in C:
                c = dict(C[k])
                if rot and k in rot: c['rotulo'] = rot[k]
                out['campos'].append(c)
        if destino: out['destino'] = destino
        return out
    NOVO = lambda rot, ch, tipo, sec='producao', op=None: dict({'rotulo': rot, 'chave': ch, 'tipo': tipo, 'secao': sec}, **({'opcoes': op} if op else {}))
    def com(k, **mud): c = dict(C[k]); c.update(mud); return c
    TIPO_ATO = ['Decisão monocrática (art. 932)', 'Decisão de urgência', 'Despacho', 'Decisão de admissibilidade', 'Juízo de retratação', 'Homologação / extinção']
    HIP932 = ['III · recurso inadmissível, prejudicado ou sem impugnação específica', 'IV a · contrário a súmula do STF, STJ ou do TRF', 'IV b · contrário a repetitivo do STF ou STJ',
              'IV c · contrário a IRDR ou IAC', 'V a · decisão recorrida contrária a súmula', 'V b · decisão recorrida contrária a repetitivo', 'V c · decisão recorrida contrária a IRDR ou IAC', 'Não se aplica']
    RES_MONO = ['Não conhecido', 'Negado provimento', 'Dado provimento', 'Parcialmente provido', 'Deferido', 'Indeferido', 'Parcialmente deferido', 'Prejudicado', 'Homologado', 'Extinto']
    HONOR = ['Majorados', 'Mantidos', 'Invertidos', 'Fixados', 'Redistribuídos', 'Sem honorários recursais']
    a['seletor'] = {'secao': 'producao', 'chave': 'Destino', 'rotulo': 'Destino do julgamento',
                    'opcoes': [{'valor': '', 'rotulo': 'Sessão (colegiado)'}, {'valor': 'Monocrática', 'rotulo': 'Decisão monocrática'}],
                    'regra': 'vazio = sessão (acórdão): designação, minuta, revisão, revisão da ementa, relatório/voto/ementa, liberação e acórdão; '
                             'Monocrática: designação, minuta, revisão, ato e fundamento (art. 932), decisão, assinatura e publicação'}
    a['grupos'] = [
        g('Designação e minuta', ['SERVIDOR', 'MINUTADO', 'Refinado']),
        g('Revisão', ['CORRETOR', 'CORRIGIDO', 'Data da Revisão', 'Rev - Atenção', 'Rev - Mérito', 'Rev - Honorários', 'Rev - IDs', 'Rev - Nota de atenção']),
        # versão acórdão (sessão)
        g('Revisão do acórdão (ementa)', ['Rev - Ementa', 'Rev - Subementa'], 'sessao'),
        g('Relatório, voto e ementa', ['Relatório Padronizado', 'Adequação Ementa', 'Formatação Subementa', 'Voto - Resultado', 'Voto - Honorários', 'Tópico-síntese', 'Mídias Necessárias', 'Voto - Descrição'], 'sessao'),
        g('Liberação para a sessão', ['LIBERADO', 'Data da Liberação'], 'sessao'),
        {'grupo': 'Acórdão', 'destino': 'sessao', 'campos': [NOVO('ID do acórdão', 'Acórdão - ID', 'texto'), NOVO('Acórdão assinado', 'Acórdão - Assinado', 'simnao'),
            NOVO('Acórdão publicado', 'Acórdão - Publicado', 'simnao'), NOVO('Data da publicação', 'Acórdão - Data da publicação', 'data'),
            NOVO('Embargos de declaração opostos', 'Acórdão - ED opostos', 'simnao'), NOVO('Trânsito em julgado', 'Acórdão - Trânsito', 'data')]},
        # versão monocrática (art. 932)
        {'grupo': 'Ato e fundamento', 'destino': 'monocratica', 'campos': [NOVO('Tipo de ato', 'Mono - Tipo de ato', 'lista', op=TIPO_ATO),
            NOVO('Hipótese do art. 932', 'Hipóteses Monocrática', 'lista', 'triagem', HIP932), NOVO('Precedente ou fundamento', 'Mono - Fundamento', 'texto-longo')]},
        {'grupo': 'Decisão monocrática', 'destino': 'monocratica', 'campos': [com('Voto - Resultado', rotulo='Resultado', tipo='lista', opcoes=RES_MONO),
            com('Voto - Honorários', rotulo='Honorários', tipo='lista', opcoes=HONOR), NOVO('Tópico-síntese', 'Tópico-síntese', 'texto'),
            com('Voto - Descrição', rotulo='Fundamentos da decisão'), NOVO('Enviada para assinatura em', 'Data da Liberação', 'data'), com('Assinado', rotulo='Assinada'),
            com('Data da Assinatura', rotulo='Data da assinatura'), com('Decisão - ID', rotulo='ID da decisão'), com('Publicado', rotulo='Publicada'),
            NOVO('Data da publicação', 'Mono - Data da publicação', 'data')]}]
# Controles especiais: grupos oficiais da ficha para os processos sob acompanhamento próprio (seção "controles" do operacional;
# a urgência e a monocrática usam os campos que já existem na triagem e na produção). Mesmo vocabulário no CMT-monitor e na Ex Officio.
URG_MEDIDA = ['Tutela de urgência', 'Tutela de evidência', 'Antecipação da tutela recursal', 'Efeito suspensivo', 'Liminar em mandado de segurança',
              'Reconsideração de liminar', 'Prioridade legal', 'Outra']
URG_NIVEL = ['Urgentíssima (mesmo dia)', 'Urgente (24 h)', 'Prioritária (48 h)', 'Ordinária (5 dias)']
URG_APREC = ['Pendente · não apreciada', 'Em análise', 'Minuta pronta', 'Apreciada · deferida', 'Apreciada · parcialmente deferida',
             'Apreciada · indeferida', 'Apreciada · prejudicada', 'Apreciada · reconsiderada']
META_SIT = ['Em andamento', 'Aguardando pauta', 'Pautado', 'Julgado · aguardando trânsito', 'Encerrado']
SOBR_MOT = ['Tribunal superior (repetitivo ou repercussão geral)', 'IRDR ou IAC', 'Suspensão nacional (STF/STJ)', 'Decisão do relator', 'Acordo / conciliação', 'Outro motivo']
SOBR_SIT = ['Afetado · aguardando julgamento', 'Julgado · aguardando publicação ou trânsito', 'Julgado · apto a retirar o sobrestamento', 'Cancelado ou desafetado · retirar', 'Sem informação']
SENS_CAT = ['Saúde · medicamento', 'Saúde · oncológico', 'Saúde · cirurgia ou internação', 'Saúde · tratamento', 'Saúde · outro', 'Pessoa idosa',
            'Criança ou adolescente', 'Pessoa com deficiência', 'Subsistência (verba alimentar)', 'Outro']
SENS_DEC = ['Sem pedido de urgência', 'Liminar/tutela deferida', 'Liminar/tutela indeferida', 'Pedido pendente de apreciação', 'Decisão de mérito proferida']
SENS_CUMP = ['Não se aplica', 'Cumprida', 'Pendente de cumprimento', 'Descumprimento noticiado', 'Bloqueio de valores / sequestro']
def CE(rot, ch, tipo, op=None, sec='controles', **x):
    c = {'rotulo': rot, 'chave': ch, 'tipo': tipo, 'secao': sec}
    if op: c['opcoes'] = op
    c.update(x); return c
def _acomp(pref):
    return [CE('Próxima providência', pref + ' - Próxima providência', 'texto'), CE('Responsável', pref + ' - Responsável', 'texto'),
            CE('Observação', pref + ' - Observação', 'texto-longo'), CE('Atualizado por', pref + ' - Atualizado por', 'texto', editavel=False),
            CE('Atualizado em', pref + ' - Atualizado em', 'data', editavel=False)]
CONTROLES = {'aba': 'Controles especiais', 'secao': 'controles',
  'descricao': 'Grupos oficiais de acompanhamento: urgência, monocrática, meta, sobrestamento e caso sensível. '
               'Cada grupo vale para o processo quando a regra de inclusão é atendida; os campos ficam no próprio registro do operacional.',
  'grupos': [
   {'grupo': 'Urgência', 'controle': 'urgencia', 'inclusao': 'campo "Medida" preenchido (sugerida pelas etiquetas do PJe)', 'ativo': 'triagem.Urgência',
    'campos': [CE('Medida', 'Urgência', 'lista', URG_MEDIDA, 'triagem'), CE('Nível', 'Urgência - Nível', 'lista', URG_NIVEL, 'triagem'),
               CE('Pedido em', 'Urgência - Data', 'data', sec='triagem', regra='conta o prazo do nível'),
               CE('Apreciação', 'Urgência - Apreciação', 'lista', URG_APREC, 'triagem'), CE('Apreciada em', 'Urgência - Apreciada em', 'data', sec='triagem'),
               CE('Motivo / observação', 'Urgência - Observação', 'texto-longo', sec='triagem'),
               CE('Lançar no painel de urgências', 'Urgência - Painel', 'simnao', sec='triagem')]},
   {'grupo': 'Monocrática', 'controle': 'monocratica', 'inclusao': 'destino do julgamento = Monocrática (minuta feita ou possível)', 'ativo': 'producao.Destino=Monocrática',
    'campos': [CE('Destino do julgamento', 'Destino', 'lista', ['Monocrática'], 'producao', regra='vazio = sessão (acórdão)'),
               CE('Registrada em', 'Monocrática - Registrada em', 'data'), CE('Prazo', 'Monocrática - Prazo', 'data'), CE('Observação', 'Monocrática - Observação', 'texto-longo'),
               CE('Atualizado por', 'Monocrática - Atualizado por', 'texto', editavel=False), CE('Atualizado em', 'Monocrática - Atualizado em', 'data', editavel=False)]},
   {'grupo': 'Meta', 'controle': 'meta', 'inclusao': 'etiqueta de meta do CNJ no PJe ou campo META da triagem (sobrestados ficam no grupo Sobrestamento)', 'ativo': 'lista',
    'campos': [CE('Metas do CNJ', 'META', 'texto', sec='triagem', regra='ex.: Meta 2; Meta 6'), CE('Situação', 'Meta - Situação', 'lista', META_SIT),
               CE('Prazo da providência', 'Meta - Prazo da providência', 'data')] + _acomp('Meta')},
   {'grupo': 'Sobrestamento', 'controle': 'sobrestamento', 'inclusao': 'tarefa de sobrestamento ou suspensão no PJe', 'ativo': 'lista',
    'campos': [CE('Motivo', 'Sobrestamento - Motivo', 'lista', SOBR_MOT), CE('Tema ou precedente', 'Sobrestamento - Tema', 'texto', regra='ex.: Tema 1039 STJ'),
               CE('Situação do precedente', 'Sobrestamento - Situação do precedente', 'lista', SOBR_SIT),
               CE('Previsão de retirada', 'Sobrestamento - Previsão de retirada', 'data'), CE('Sem previsão de retirada', 'Sobrestamento - Sem previsão', 'simnao')] + _acomp('Sobrestamento')},
   {'grupo': 'Caso sensível', 'controle': 'sensivel', 'inclusao': 'assunto ou etiqueta de saúde, ou inclusão manual', 'ativo': 'lista',
    'campos': [CE('Categoria', 'Sensível - Categoria', 'lista', SENS_CAT), CE('Incluído manualmente', 'Sensível - Incluído', 'simnao'),
               CE('Excluído do controle', 'Sensível - Excluído', 'simnao'), CE('Quadro / motivo', 'Sensível - Quadro', 'texto-longo'),
               CE('Decisão', 'Sensível - Decisão', 'lista', SENS_DEC), CE('Cumprimento', 'Sensível - Cumprimento', 'lista', SENS_CUMP),
               CE('Última verificação', 'Sensível - Última verificação', 'data'), CE('Próxima verificação', 'Sensível - Próxima verificação', 'data')] + _acomp('Sensível')}]}
# campos que o inteiro teor (.txt do PJe) identifica e que o operacional ainda não tinha: entram como campos oficiais.
# Tabelas (tipo "tabela"): lista de linhas com as colunas indicadas, gravada como lista no registro do processo.
def C(rot, ch, tipo, sec, op=None, **x):
    c = {'rotulo': rot, 'chave': ch, 'tipo': tipo, 'secao': sec}
    if op: c['opcoes'] = op
    c.update(x); return c
def T(rot, ch, sec, cols):
    return {'rotulo': rot, 'chave': ch, 'tipo': 'tabela', 'secao': sec, 'colunas': [{'chave': k, 'rotulo': r, 'tipo': t} for k, r, t in cols]}
ESPECIES = ['Embargos de declaração', 'Agravo interno', 'Juízo de retratação']
def grupo(a, nome):
    for g in a['grupos']:
        if g['grupo'] == nome: return g
def mais(g, campos):
    tem = {c['chave'] for c in g['campos']}
    g['campos'] += [c for c in campos if c['chave'] not in tem]
for a in abas:
    if a['aba'] == 'Processo':
        mais(grupo(a, 'Sentença'), [C('Data da sentença', 'Sentença - Data', 'data', 'origem'), C('Remessa necessária', 'Sentença - Reexame', 'lista', 'origem', ['Sim', 'Não', 'Dispensada']),
            C('Tutela na sentença', 'Sentença - Tutela', 'lista', 'origem', ['Concedida', 'Negada', 'Revogada', 'Não'])])
        i = a['grupos'].index(grupo(a, 'Sentença'))
        a['grupos'].insert(i + 1, {'grupo': 'Origem', 'campos': [C('Juízo de origem', 'Origem - Juízo', 'texto', 'origem'), C('Julgador(a) de origem', 'Origem - Julgador', 'texto', 'origem'),
            C('Valor da causa', 'Origem - Valor da causa', 'texto', 'origem')]})
        mais(grupo(a, 'Recursos e contrarrazões'), [
            T('Recursos', 'Recursos', 'origem', [('parte', 'Parte', 'texto'), ('ids', 'IDs', 'texto'), ('data', 'Data', 'data'), ('preliminares', 'Preliminares', 'texto-longo'),
                ('teses', 'Teses / alegações', 'texto-longo'), ('pedidos', 'Pedidos', 'texto-longo'), ('merito', 'Mérito', 'texto-longo')]),
            T('Contrarrazões', 'Contrarrazões', 'origem', [('parte', 'Parte', 'texto'), ('ids', 'IDs', 'texto'), ('data', 'Data', 'data'), ('preliminares', 'Preliminares', 'texto-longo'),
                ('teses', 'Teses', 'texto-longo')])])
        i = a['grupos'].index(grupo(a, 'Recursos e contrarrazões'))
        a['grupos'].insert(i + 1, {'grupo': 'Outras peças e ocorrências', 'campos': [T('Outras peças', 'Outras peças', 'origem', [('tipo', 'Peça', 'texto'), ('ids', 'IDs', 'texto'), ('data', 'Data', 'data'), ('texto', 'Observação', 'texto-longo')])]})
    if a['aba'] == 'Triagem':
        mais(grupo(a, 'Admissibilidade e regularidade'), [T('Procurações', 'Procurações', 'triagem', [('id', 'ID', 'texto'), ('data', 'Data', 'data'), ('validade', 'Validade', 'texto'), ('advogados', 'Advogados', 'texto-longo')])])
        mais(grupo(a, 'Ministério Público'), [C('Data do parecer', 'MPF - Data', 'data', 'triagem'), C('Conclusão do parecer (texto)', 'Parecer - Sentido (outro)', 'texto', 'triagem')])
        a['grupos'] += [
            {'grupo': 'Espécie e decisão impugnada', 'campos': [C('Espécie', 'Padrão - Espécie', 'lista', 'triagem', ESPECIES, mapa={'ed': 'Embargos de declaração', 'interno': 'Agravo interno', 'retratacao': 'Juízo de retratação'}),
                C('ID da decisão impugnada', 'Impugnada - ID', 'texto', 'triagem'), C('Data do julgamento / decisão', 'Impugnada - Data', 'data', 'triagem'), C('Órgão julgador', 'Impugnada - Órgão', 'texto', 'triagem'),
                C('Relator(a)', 'Impugnada - Relator', 'texto', 'triagem'), C('Síntese / ementa', 'Impugnada - Síntese', 'texto-longo', 'triagem')]},
            {'grupo': 'Embargos de declaração', 'quando': {'campo': 'triagem.Padrão - Espécie', 'valor': 'Embargos de declaração'},
             'campos': [C('Vício(s) apontado(s)', 'ED - Vício', 'texto', 'triagem'), C('Ponto dos embargos', 'ED - Ponto', 'texto-longo', 'triagem')]},
            {'grupo': 'Agravo interno', 'quando': {'campo': 'triagem.Padrão - Espécie', 'valor': 'Agravo interno'},
             'campos': [C('Fundamentos do agravo interno', 'AgInt - Fundamentos', 'texto-longo', 'triagem')]},
            {'grupo': 'Juízo de retratação', 'quando': {'campo': 'triagem.Padrão - Espécie', 'valor': 'Juízo de retratação'},
             'campos': [C('Tribunal do precedente', 'Retratação - Tribunal', 'lista', 'triagem', ['STF', 'STJ']), C('Tema', 'Retratação - Tema', 'texto', 'triagem'),
                C('Precedente', 'Retratação - Precedente', 'texto', 'triagem'), C('Síntese', 'Retratação - Síntese', 'texto-longo', 'triagem'),
                C('ID da devolução', 'Retratação - Devolução ID', 'texto', 'triagem'), C('Órgão da devolução', 'Retratação - Devolução órgão', 'texto', 'triagem'),
                C('Mês da devolução', 'Retratação - Devolução mês', 'texto', 'triagem'),
                C('Resultado dos embargos', 'Retratação - ED', 'lista', 'triagem', ['Rejeitados', 'Acolhidos', 'Parcialmente acolhidos', 'Não conhecidos'], mapa={'parcial': 'Parcialmente acolhidos', 'naoconhecidos': 'Não conhecidos'}),
                C('IDs dos embargos', 'Retratação - ED IDs', 'texto', 'triagem'), C('Data dos embargos', 'Retratação - ED data', 'data', 'triagem')]}]
for a in abas:
    if a['aba'] == 'Triagem':
        a['grupos'] = [g for g in a['grupos'] if g['grupo'] != 'Urgência']   # a urgência passa ao grupo oficial dos Controles especiais
        for g in a['grupos']:
            g['campos'] = [c for c in g['campos'] if c['chave'] != 'META']    # a meta também
    if a['aba'] == 'Produção':
        _prod(a)
    if a['aba'] == 'Pauta':
        a['destino'] = 'sessao'   # a pauta só vale para o acórdão; a monocrática não vai à sessão
abas.append(CONTROLES)
ordem = ['Processo', 'Triagem', 'Produção', 'Controles especiais', 'Pauta']
abas.sort(key=lambda a: ordem.index(a['aba']) if a['aba'] in ordem else 99)
out = {'schema': 'gabcmt.padrao.ficha', 'versao': '1.2.0', 'origem': 'padrao/integracoes-ficha.md (Ficha do CMT-monitor), por scripts/ficha/gerar_ficha.py',
       'descricao': 'Ficha única padrão de processo, usada pelo CMT-monitor e pela Ex Officio. Campos com "tipo": "tabela" são listas de linhas com as "colunas" indicadas. Grupos com "quando" só aparecem quando o campo indicado tem o valor. Campos com "secao" ficam em acervo/operacional.json (registro do processo, seção indicada: origem, triagem, producao, pauta ou controles) e são editáveis, salvo "editavel": false; campos com "fonte" vêm de acervo/fonte.json e são só leitura.',
       'abas': abas}
(R / 'padrao/ficha.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
n = sum(len(g['campos']) for a in abas for g in a['grupos'])
ed = sum(1 for a in abas for g in a['grupos'] for c in g['campos'] if c.get('secao') and c.get('editavel', True))
print(f'padrao/ficha.json: {len(abas)} abas, {n} campos, {ed} editáveis')
