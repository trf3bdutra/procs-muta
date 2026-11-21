"""Situação atual conferida nos autos: última decisão (com conteúdo), última peça das partes, última informação e última movimentação.
Uso: python3 situacao.py <lote> [--aplicar]   (sem --aplicar só mostra)"""
import json, gzip, os, re, sys
R = '/home/claude/procs-muta/'
lid = sys.argv[1]; aplicar = '--aplicar' in sys.argv
HOJE = '21/11/2026'
MOVFIX = {'5026912-50': '10/04/2026 15:43 · CONCLUSOS PARA JULGAMENTO', '5013819-83': '30/09/2026 00:40 · DECORRIDO PRAZO DE UNIÃO FEDERAL EM 29/09/2026 23:59.',
 '5000189-54': '24/09/2026 08:23 · JUNTADA DE PETIÇÃO DE CONTRARRAZÕES DE RECURSO', '5002054-18': '27/03/2026 14:42 · CONCLUSOS PARA JULGAMENTO',
 '5015211-63': '27/04/2026 18:12 · JUNTADA DE PETIÇÃO DE INFORMAÇÕES PRESTADAS', '5023565-09': '23/04/2026 00:36 · PUBLICADO INTIMAÇÃO EM 23/04/2026.',
 '5011486-61': '01/08/2026 00:41 · DECORRIDO PRAZO DE FUNDO NACIONAL DE DESENVOLVIMENTO DA EDUCACAO EM 31/07/2026 23:59.', '5004791-91': '06/10/2026 14:54 · JUNTADA DE PETIÇÃO DE TUTELA DE EVIDÊNCIA',
 '5022908-72': '08/04/2026 01:11 · DECORRIDO PRAZO DE UNIÃO FEDERAL EM 07/04/2026 23:59.', '5012801-27': '28/09/2026 16:00 · JUNTADA DE PETIÇÃO DE PETIÇÃO INTERCORRENTE',
 '5012667-97': '24/08/2026 13:27 · JUNTADA DE PETIÇÃO DE CONTRARRAZÕES', '5029114-97': '30/04/2026 12:43 · JUNTADA DE PETIÇÃO DE PETIÇÃO INTERCORRENTE',
 '5007108-96': '22/06/2026 11:08 · JUNTADA DE PETIÇÃO DE MEMORIAIS', '5016318-74': '10/08/2026 18:13 · CONCLUSOS PARA JULGAMENTO',
 '5000141-95': '14/08/2026 15:05 · JUNTADA DE PETIÇÃO DE PETIÇÃO INTERCORRENTE'}
lote = json.load(open(R + f'acervo/lotes/{lid}.json'))

def carregar(cnj):
    p = R + f'acervo/autos/{cnj}.json.gz'
    if not os.path.exists(p): return None
    a = json.load(gzip.open(p))
    lista = json.loads(a['lista']) if isinstance(a['lista'], str) else a['lista']
    t = a.get('texto') or ''
    parts = re.split(r'===== ID (\d+) \| [^\n]*?=====', t)
    tx = {parts[k]: re.sub(r'\s+', ' ', parts[k + 1]) for k in range(1, len(parts) - 1, 2)}
    mm = re.match(r'===== MOVIMENTA[ÇC][ÕO]ES[^\n]*=====\n(.*?)(?:\n=====|\n\n|$)', t, re.S)
    movs = [x.strip() for x in mm.group(1).split('\n') if x.strip()] if mm else []
    return lista, tx, movs

def chave(d):
    m = re.match(r'(\d{2})/(\d{2})/(\d{4})', d[4] or '')
    return ((m.group(3) + m.group(2) + m.group(1)) if m else '00000000', int(d[0]))

DEC = re.compile(r'^(Decis|Despacho(?! de Inspe)|Ac[óo]rd|Voto|Ementa|Senten)', re.I)
PRIMEIRO = lid != 'adp-ai'  # primeiro grau presente (remessas e apelações)
SENT_R = [(r'concedo parcialmente a seguran|concedo em parte a seguran', 'concedeu em parte a segurança'), (r'concedo a seguran|concedendo a seguran|concedo a ordem', 'concedeu a segurança'), (r'denego a seguran', 'denegou a segurança'),
          (r'julgo parcialmente procedente', 'julgou parcialmente procedente o pedido'), (r'julgo (im)?procedentes? (todos )?(o|os)? ?pedidos?|julgo improcedente', None), (r'julgo procedente', 'julgou procedente o pedido'),
          (r'(extingo|extinto|declaro extinto)[^.]{0,80}sem (resolu|julgamento)', 'extinguiu o processo sem resolução do mérito'), (r'indefiro a (peti[çc][ãa]o )?inicial', 'indeferiu a petição inicial'),
          (r'rejeito os embargos|rejeito os declarat', 'rejeitou os embargos de declaração'), (r'acolho (parcialmente )?os embargos', 'acolheu os embargos de declaração')]
def resumo_sentenca(t):
    low = re.sub(r'\s+', ' ', t).lower(); mk = list(re.finditer(r'ante o exposto|posto isso|diante do exposto|pelo exposto|isto posto|em face do exposto|ante todo o exposto|por todo o exposto', low))
    fim = low[mk[-1].start():] if mk else low[-1500:]
    for rx, rot in SENT_R:
        if re.search(rx, fim):
            if rot is None: rot = 'julgou improcedente o pedido' if re.search(r'improcedente', fim) else 'julgou procedente o pedido'
            neg = re.search(r'deix\w* de (submeter|remeter|encaminhar)[^.]{0,30}(reexame|remessa|duplo grau)|(n[ãa]o (est[áa] |se )?(sujeit\w*|submet\w*|cab\w*)|dispens\w*|incab\w*|afast\w*|descab\w*|sem)( (ao|à|a|o|de|do|da))? ?(reexame|duplo grau|remessa necess)|(reexame|remessa necess\w*|duplo grau)[^.]{0,40}(dispensad|incab|descab|n[ãa]o se aplica)', fim)
            return 'sentença: ' + rot + ('' if neg else ('; sujeita a reexame necessário' if re.search(r'reexame|duplo grau|remessa necess', fim) else ''))
    return 'sentença (dispositivo a conferir)'
INF = re.compile(r'^(Ato ordinat|Certid|Informa[çc][ãa]o(?! Prestada)|Intima[çc][ãa]o de Pauta|Comunica)', re.I)

def corpo(t):
    m = re.search(r'(D\s?E\s?C\s?I\s?S\s?[ÃA]\s?O|D\s?E\s?S\s?P\s?A\s?C\s?H\s?O|ATO ORDINAT[ÓO]RIO|DECIDO|Vistos)', t)
    return t[m.start():] if m else t

def resumo_acordao(t):
    b = re.sub(r'\s+', ' ', t)
    m = list(re.finditer(r'(?:Turma Regional de Mato Grosso do Sul|Turma), por (unanimidade|maioria)[, ]+(.{10,240}?)(?:, nos termos|\.)', b))
    if m: return 'acórdão: ' + m[-1].group(2).strip(' ,') + (' (por maioria)' if m[-1].group(1) == 'maioria' else '')
    m = re.search(r'IV\. Dispositivo\s*\d*\.?\s*(.{10,200}?\.)', b)
    return 'acórdão: ' + m.group(1).strip() if m else 'acórdão'

def resumo_decisao(tipo, t):
    if re.match(r'Senten', tipo or '', re.I): return resumo_sentenca(t)
    if re.match(r'(Ac[óo]rd|Ementa|Voto)', tipo or '', re.I): return resumo_acordao(t)
    s = corpo(t); low = s.lower()
    if PRIMEIRO and len(s) < 700 and re.search(r'vistos em (inspe|correi)', low): return 'despacho de inspeção ou correição'
    mk = list(re.finditer(r'ante o exposto|posto isso|diante do exposto|pelo exposto|isto posto|em face do exposto|ante o quadro', low))
    fim = low[mk[-1].start():] if mk and len(low) - mk[-1].start() > 60 else low[-1600:]
    R_ = []
    if re.search(r'resolu[çc][ãa]o n?[ºo.]* ?33|turma regional de mato grosso do sul|redistribu|remet[ae]m?-se|remessa (do presente )?(feito|dos autos)|declin', low) and len(s) < 4500 and not re.search(r'indefiro|defiro|nego provimento|dou provimento|n[ãa]o conhe[çc]o|contraminuta|procuradoria regional da rep', low):
        return 'remessa ou redistribuição à Turma Regional (sem exame do recurso)'
    if re.search(r'1\.?021, ?(§|par[áa]grafo) ?2', low): return 'intimação para resposta ao agravo interno'
    if re.search(r'1\.?023, ?§ ?2', low): return 'intimação para resposta aos embargos de declaração'
    if re.search(r'persiste interesse', low): return 'intimou a agravante para dizer se persiste o interesse no julgamento'
    if len(s) < 200 and re.search(r'anote-se', low): return 'mero expediente (anotação)'
    if re.search(r'perda superveniente|artigo 933|art\. 933', low) and re.search(r'intime', low): return 'intimação sobre perda superveniente do interesse ou do objeto'
    if re.search(r'n[ãa]o conhe[çc]o d[oa] recurso, quanto', fim) and re.search(r'quanto ao mais, nego provimento', fim):
        R_.append('não conheceu em parte e negou provimento quanto ao mais' + ('; determinou o recolhimento das custas em dobro' if 'em dobro' in fim else ''))
    elif re.search(r'n[ãa]o conhe[çc]o d[oa]', fim): R_.append('não conheceu do recurso')
    if re.search(r'nego provimento|nego-lhe provimento', fim) and not any('quanto ao mais' in x for x in R_): R_.append('negou provimento')
    if re.search(r'dou provimento|dou-lhe provimento|dou parcial provimento', fim): R_.append('deu provimento')
    if re.search(r'julgo prejudicad', fim): R_.append('julgou prejudicado')
    if re.search(r'n[ãa]o se vislumbra concorr[êe]ncia dos requisitos', low): R_.append('não concedeu a tutela recursal antes do contraditório')
    if re.search(r'indefiro (o pedido de )?(atribui[çc][ãa]o de )?(a |o )?(concess[ãa]o d[eo] )?(efeito suspensivo|tutela|antecipa|pleito liminar|pedido liminar|medida postulada|liminar)', fim): R_.append('indeferiu a liminar ou a tutela' if PRIMEIRO else 'indeferiu o efeito suspensivo ou a tutela recursal')
    elif re.search(r'defiro (parcialmente )?(o (pedido|pleito) de )?(atribui[çc][ãa]o de )?(o |a )?(efeito suspensivo|antecipa[çc][ãa]o|tutela)', fim): R_.append(('deferiu a liminar ou a tutela' if PRIMEIRO else 'deferiu o efeito suspensivo ou a tutela recursal') + (' em parte' if 'parcial' in fim[max(0, fim.find('defiro') - 5):fim.find('defiro') + 60] else ''))
    if re.search(r'postergo', low): R_.append('postergou a apreciação da tutela')
    if re.search(r'indefiro o pedido de gratuidade|indefiro a gratuidade', low): R_.append('indeferiu a gratuidade')
    if re.search(r'(recolh|comprov)[a-z]* .{0,80}(preparo|custas)|deser[çc]', low) and not R_: R_.append('intimou para comprovar ou recolher o preparo')
    if re.search(r'procuradoria regional da rep[úu]blica para parecer|vista .{0,30}minist[ée]rio p[úu]blico|d[êe]-se vista [àa] procuradoria', low): R_.append('abriu vista ao MPF')
    if re.search(r'sobresto|determino o sobrestamento|imp[õo]e-se, por cautela, o sobrestamento|suspendo o (processo|feito|curso)|arquivamento provis', fim): R_.append('sobrestou o processo')
    elif re.search(r'suspend[ae][rm]?[^.]{0,40}execu[çc][ãa]o fiscal|suspens[ãa]o da execu[çc][ãa]o fiscal', fim) and re.search(r'\bdefiro', fim): R_.append('suspendeu a execução na origem')
    if re.search(r'declaro-me impedid|declaro meu impedimento|reconhe[çc]o (o )?meu impedimento|por impedimento', low): R_.append('declarou impedimento')
    if re.search(r'inclus[ãa]o do feito em pauta|aguarde-se a inclus[ãa]o', fim): R_.append('mandou incluir em pauta')
    if re.search(r'recebo o recurso', fim): R_.append('recebeu o recurso sem conceder efeito suspensivo')
    if re.search(r'intime-se a (parte )?agravad|determino a intima[çc][ãa]o d[oa] agravad|intime-se o agravad|d[êe]-se vista [àa] parte agravada', fim) and not any('contraditório' in x for x in R_): R_.append('mandou intimar a agravada para contraminuta')
    if R_:
        return '; '.join(dict.fromkeys(R_))
    if PRIMEIRO: s = re.split(r'C[óo]pia d[aeo]st[ae] |servir[áa] como|CHAVE ELETR|Ponta Por[ãa], \(data|Corumb[áa]/MS, datado', s)[0]
    return '…' + re.sub(r'\s*(S[ãa]o Paulo|Campo Grande)[^.]*$', '', s[-220:]).strip(' ,.')

ENTE = re.compile(r'UNI[ÃA]O|INSTITUTO NACIONAL|INSS|INCRA|FUNDA[ÇC][ÃA]O|FUNDO NACIONAL|UNIVERSIDADE|INSTITUTO FEDERAL|IBAMA|ICMBIO|ANTT|AG[ÊE]NCIA|CONSELHO|MUNIC[ÍI]PIO|ESTADO DE|FAZENDA|DNIT|CAIXA ECON|EMPRESA BRASILEIRA', re.I)
def emissor(t, it=None):
    h = t[-900:]
    if re.search(r'MINIST[ÉE]RIO P[ÚU]BLICO FEDERAL|PROCURADORIA REGIONAL DA REP[ÚU]BLICA|PRR3|transparencia\.mpf\.mp\.br|PROCURADORA? (REGIONAL )?DA REP[ÚU]BLICA', h) or re.search(r'MINIST[ÉE]RIO P[ÚU]BLICO FEDERAL', t[:400]): return 'MPF'
    if re.search(r'Fazenda Nacional|PGFN|PRFN', h, re.I): return 'PFN'
    if re.search(r'PROCURADORIA-GERAL FEDERAL|Procurador Federal', h, re.I): return 'PGF'
    if re.search(r'PROCURADORIA-GERAL DA UNI[ÃA]O|PROCURADORIA-REGIONAL DA UNI[ÃA]O|Advogad[oa] da Uni[ãa]o', h, re.I): return 'AGU (PRU)'
    if re.search(r'Procuradoria-Geral do Munic[íi]pio|PROCURADORIA (GERAL )?DO MUNIC', h, re.I): return 'Município'
    if re.search(r'DEFENSORIA P[ÚU]BLICA', h, re.I): return 'DPU'
    if re.search(r'OAB', h) and it:
        at, ad = ENTE.search(it.get('exequente') or ''), ENTE.search(it.get('executado') or '')
        if at and not ad: return 'agravado' if lid == 'adp-ai' else 'apelado'
        if ad and not at: return 'agravante' if lid == 'adp-ai' else 'apelante'
    return 'advogado de parte'

PECA = re.compile(r'^(Peti|Contraminuta|Contrarraz|Manifesta|Agravo|Embargos|Recurso|Apela|Tutela|Parecer|Memoriais|Informa[çc][õo]es Prestadas|Impugna|Comprovante|Custas|Substabelec|Procura|Requerimento|Terceiro)', re.I)

def situ(it):
    c = carregar(it['processo'])
    if not c: return None
    lista, tx, movs = c
    docs = sorted(lista, key=chave)
    decs = [d for d in docs if DEC.match(d[1] or '')]
    pecs = [d for d in docs if PECA.match(d[1] or '') and not DEC.match(d[1] or '')]
    infs = [d for d in docs if INF.match(d[1] or '')]
    out = {}
    if decs:
        d = decs[-1]; out['ultima_decisao'] = f"{d[1][:60]} · ID {d[0]} · {d[4]} — {resumo_decisao(d[1], tx.get(str(d[0]), ''))}"
        rel = [x for x in decs if not resumo_decisao(x[1], tx.get(str(x[0]), '')).startswith(('remessa ou redistribuição', 'declarou impedimento'))]
        if rel and rel[-1] is not d:
            x = rel[-1]; out['ultima_decisao_relevante'] = f"{x[1][:60]} · ID {x[0]} · {x[4]} — {resumo_decisao(x[1], tx.get(str(x[0]), ''))}"
    if pecs:
        d = pecs[-1]; t = tx.get(str(d[0]), '')
        if re.match(r'Peti[çc][ãa]o intercorrente', d[1] or '') and re.search(r'A\s?GRAVO\s?I\s?NTERNO', t[:1500]): d = [d[0], 'Agravo interno (petição intercorrente)'] + list(d[2:])
        out['ultima_peca'] = f"{(re.sub(r'^Peti[çc][ãa]o Inicial$', 'Agravo de instrumento', re.sub(r' ?\(.*', '', d[1])) if lid == 'adp-ai' else re.sub(r' ?\(.*', '', d[1]))[:60]} ({'MPF' if re.match(r'Parecer', d[1] or '') else emissor(t, it)}) · ID {d[0]} · {d[4]}"
    if infs:
        d = infs[-1]; out['ultima_informacao'] = f"{d[1][:50]} · ID {d[0]} · {d[4]}"
    if movs: out['_movs'] = movs
    return out

SITFIX = {  # correções manuais conferidas nos autos em 21/11/2026
 '5016545-64': {'ultima_peca': 'Agravo de instrumento (União) · ID 329381133 · 01/07/2025'},
 '5016367-52': {'ultima_peca': 'Agravo de instrumento (INMETRO) · ID 292824671 · 25/06/2024'},
 '5032704-48': {'ultima_peca': 'Agravo de instrumento (agravante) · ID 404484696 · 15/10/2026'},
 '5013965-27': {'ultima_peca': 'Agravo de instrumento (agravante) · ID 374295102 · 18/05/2026'},
 '5005209-29': {'ultima_decisao': 'Decisão · ID 366505084 · 17/04/2026 — deferiu a gratuidade e o efeito suspensivo (execução e efeitos da alienação suspensos); mandou intimar a agravada e o arrematante'},
 '5030013-95': {'ultima_decisao_relevante': 'Decisão · ID 342973449 · 13/11/2025 — suspendeu a tutela deferida na origem (efeito suspensivo)', 'ultima_peca': 'Parecer (MPF, falta de interesse) · ID 366735364 · 15/04/2026'},
 '5030876-51': {'ultima_decisao_relevante': 'Decisão · ID 344616032 · 01/12/2025 — deferiu a prioridade e indeferiu o efeito suspensivo'},
 '5023103-18': {'ultima_decisao': 'Decisão monocrática · ID 399879679 · 28/09/2026 — negou provimento ao agravo de instrumento', 'ultima_decisao_relevante': None, 'ultima_peca': 'Contraminuta ao agravo interno (PFN) · ID 403816717 · 12/10/2026'},
 '5030311-87': {'ultima_decisao': 'Decisão · ID 366754499 · 28/04/2026 — não concedeu a tutela recursal antes do contraditório; mandou intimar a agravada', 'ultima_decisao_relevante': None, 'ultima_peca': 'Contrarrazões da CEF, juntadas como procuração · ID 374286615 · 18/05/2026'},
 '5017744-24': {'ultima_decisao_relevante': 'Decisão · ID 330882223 · 17/07/2025 — deferiu a antecipação da tutela recursal', 'ultima_peca': 'Contraminuta (CEBRASPE) · ID 333841178 · 19/08/2025'},
 '5025307-69': {'ultima_peca': 'Contraminuta (CEF) · ID 342845869 · 10/11/2025'},
 '5028259-84': {'ultima_decisao': 'Decisão monocrática · ID 398914224 · 24/09/2026 — não conheceu quanto à perícia, negou provimento quanto ao mais e determinou o recolhimento das custas em dobro', 'ultima_peca': 'Petição com guia de custas (ERBE) · ID 399496501 · 21/09/2026'},
 '5028641-14': {'ultima_decisao_relevante': 'Decisão · ID 341097488 · 12/11/2025 — indeferiu a antecipação da tutela recursal; mandou intimar as agravadas', 'ultima_peca': 'Contraminuta (EBSERH) · ID 344976760 · 01/12/2025'},
 '5032136-66': {'ultima_decisao': 'Decisão · ID 385288702 · 17/07/2026 — acolheu os embargos de declaração, dispensou as custas e mandou intimar a União para contraminuta', 'ultima_decisao_relevante': None, 'ultima_peca': 'Contrarrazões aos embargos de declaração (União) · ID 346271316 · 11/12/2025'},
 '5025596-02': {'ultima_peca': 'Contraminuta (agravado) · ID 338809162 · 09/10/2025'},
 '5002838-92': {'ultima_decisao_relevante': 'Decisão · ID 353941209 · 10/02/2026 — deferiu a tutela recursal (remessa à Comissão de Soluções Fundiárias; desocupação obstada); mandou intimar a agravada', 'ultima_peca': 'Petição de ciência (DNIT) · ID 372952956 · 12/05/2026'},
 '5009173-30': {'ultima_decisao': 'Decisão · ID 367180511 · 30/04/2026 — indeferiu a gratuidade no recurso, mandou recolher o preparo em 5 dias e, recolhido, intimar a agravada; não concedeu a tutela recursal antes do contraditório', 'ultima_peca': 'Contraminuta (IFMS) · ID 384547118 · 05/07/2026'},
 '5032026-38': {'ultima_decisao': 'Despacho · ID 387904497 · 24/07/2026 — intimou a agravante sobre a persistência do pedido de nova prorrogação da tutela e, persistindo, a agravada e o MPF', 'ultima_peca': 'Manifestação da CEF contra a prorrogação · ID 393000963 · 21/08/2026'},
 '5000303-90': {'ultima_decisao': 'Despacho · ID 397076582 · 12/09/2026 — mandou comprovar o preparo pelo comprovante da STN em 5 dias, sob pena de deserção', 'ultima_peca': 'Recibo bancário de Pix (agravante) · ID 391284985 · 10/08/2026'},
 '5009594-25': {'ultima_decisao_relevante': 'Despacho · ID 278226911 · 25/08/2023 — intimou as partes (artigo 10 do CPC) sobre a CDA, a Súmula 392/STJ e o artigo 8º do Decreto-lei 1.736/1979', 'ultima_peca': 'Contraminuta (PFN) · ID 279513408 · 05/09/2023'},
 '5030978-73': {'ultima_peca': 'Contraminuta (UFMS) · ID 352212258 · 28/01/2026'},
 '5022961-14': {'ultima_peca': 'Contraminuta (CEF) · ID 394006599 · 27/08/2026'},
 '5016428-39': {'ultima_peca': 'Substabelecimento sem reserva de poderes (agravantes) · ID 396388330 · 07/09/2026'},
 '5000535-08': {'ultima_decisao_relevante': 'Decisão · ID 350515200 · 23/01/2026 — deferiu a tutela recursal à CEF para prosseguir na execução extrajudicial; mandou intimar a agravada', 'ultima_peca': 'Impugnação da CEF ao agravo interno · ID 358076700 · 04/03/2026'},
 '5021454-18': {'ultima_peca': 'Contraminuta (CEF) · ID 391065294 · 08/08/2026'},
 '5000187-84': {'ultima_decisao': 'Decisão · ID 380865011 · 17/06/2026 — indeferiu o efeito ativo; mandou intimar a agravada para contraminuta', 'ultima_peca': 'Contraminuta (CEF) · ID 386621313 · 16/07/2026'},
 '5012001-96': {'ultima_decisao': 'Decisão · ID 377003576 · 29/05/2026 — não concedeu a tutela recursal antes do contraditório; mandou intimar a agravada', 'ultima_peca': 'Contraminuta (ANS) · ID 378815738 · 06/06/2026'},
 '5019752-37': {'ultima_peca': 'Contraminuta (CEF) · ID 391741330 · 13/08/2026'},
 '5009375-75': {'ultima_peca': 'Memoriais (agravantes) · ID 328236048 · 18/06/2025'},
 '5001739-87': {'ultima_decisao': 'Decisão · ID 355495392 · 23/02/2026 — deferiu em parte o efeito suspensivo (relator prevento da 2ª Turma)', 'ultima_peca': 'Contraminuta (exequente) · ID 356702178 · 25/02/2026'},
 '5015454-02': {'ultima_peca': 'Contraminuta (CEF) · ID 385369246 · 10/07/2026'},
 '5012422-23': {'ultima_peca': 'Contraminuta (executada) · ID 342641015 · 09/11/2025'},
 '5028832-59': {'ultima_decisao': 'Decisão · ID 362814663 · 27/03/2026 — remessa ou redistribuição à Turma Regional (sem exame do recurso)', 'ultima_decisao_relevante': 'Despacho · ID 346810039 · 15/12/2025 — tutela postergada; reiterou o ofício à Defesa Civil de Três Lagoas', 'ultima_peca': 'Manifestação da CEF contra a tutela · ID 359301764 · 10/03/2026'},
 '5032669-25': {'ultima_decisao_relevante': 'Decisão · ID 345468992 · 04/12/2025 — indeferiu a tutela à apelação', 'ultima_peca': 'Embargos de declaração (requerente) · ID 346984730 · 16/12/2025; resposta da PFN · ID 347783556 · 22/12/2025'},
 '5014843-83': {'ultima_peca': 'Contraminuta (CEF) · ID 330524748 · 12/07/2025'},
 '5000355-34': {'ultima_decisao': 'Decisão (sentença cadastrada como decisão) · ID 385294634 · 15/05/2026 — sentença: concedeu a segurança; sujeita a reexame necessário'},
 '5028278-90': {'ultima_decisao': 'Decisão monocrática · ID 399802808 · 24/09/2026 — não conheceu quanto à perícia e negou provimento quanto ao mais', 'ultima_peca': 'Agravo interno (ERBE) · ID 405908768 · 21/10/2026'},
}

n = 0; sem = []
for it in lote['itens']:
    if not it.get('prontuario_triagem'): continue
    s = situ(it)
    if s is None: sem.append(it['processo']); continue
    for k, v in SITFIX.get(it['processo'][:10], {}).items():
        if v is None: s.pop(k, None)
        else: s[k] = v
    sa = dict(it.get('situacao_atual') or {})
    mv = s.pop('_movs', None)
    if mv: sa['ultima_movimentacao'] = mv[0]; sa['mov_fonte'] = 'linha do tempo do PJe (extração de 21/11/2026)'
    mov = sa.get('ultima_movimentacao', '')
    if it['processo'][:10] in MOVFIX and not mv: mov = sa['ultima_movimentacao'] = MOVFIX[it['processo'][:10]]
    movok = bool(sa.get('mov_fonte')) and not re.search(r'lidos?|VALIDAR', mov)
    sa.update(s)
    sa['aviso'] = 'Conferido em ' + HOJE + ': decisões e peças pelo inteiro teor dos autos extraídos' + ('; movimentação pela linha do tempo do PJe' if movok else '; movimentação a conferir no PJe')
    if not movok: sa['ultima_movimentacao'] = '[VALIDAR no PJe]'
    partes = [f"última decisão: {s['ultima_decisao'].split(' · ', 1)[1] if 'ultima_decisao' in s else '—'}"]
    if 'ultima_decisao_relevante' in s: partes.append(f"último ato decisório sobre o recurso: {s['ultima_decisao_relevante'].split(' · ', 1)[1]}")
    partes.append(f"última peça: {s.get('ultima_peca', '—')}")
    partes.append(f"última movimentação: {sa['ultima_movimentacao']}")
    sa['resumo'] = '► Situação em ' + HOJE + ': ' + ' | '.join(partes)
    esp = it.get('especificidades') or ''
    velho = (it.get('situacao_atual') or {}).get('resumo')
    if velho and esp.startswith(velho): esp = esp[len(velho):].lstrip(' ·')
    novo_esp = sa['resumo'] + (' · ' + esp if esp else '')
    if aplicar:
        it['situacao_atual'] = sa
        it['especificidades'] = novo_esp[:2000]
        if isinstance(it['prontuario_triagem'].get('cartao'), dict): it['prontuario_triagem']['cartao']['especificidades'] = novo_esp[:2000]
    elif n < 6:
        print(it['processo']); print('  ', sa['resumo'][:700])
    n += 1
print('itens com situação conferida:', n, '· sem autos no repositório:', len(sem))
if aplicar:
    lote['atualizado_em'] = '2026-11-21'
    open(R + f'acervo/lotes/{lid}.json', 'w').write(json.dumps(lote, ensure_ascii=False, indent=1) + '\n')
    json.dump(sem, open('/home/claude/work/sem_autos_situacao.json', 'w'))
