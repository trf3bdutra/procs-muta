# -*- coding: utf-8 -*-
"""Detalha as peças do prontuário de triagem (prontuario_triagem.cartao.pecas) de cada item de lote.

Para cada peça {desc, id, data} grava, sem apagar o que já foi escrito à mão:
  - nota:   o que a triagem registrou sobre aquela peça (trecho do teor, das razões, do dispositivo
            ou das especificidades que cita o ID da peça);
  - trecho: trecho do próprio documento nos autos extraídos (dispositivo da decisão, pedido final da
            petição ou início do texto), para conferência;
  - pje:    tipo e descrição no PJe, quem juntou, páginas e se o PDF está sem texto.

Nada é inventado: a nota é cópia do que a triagem registrou, e o trecho é cópia do documento.
Uso: python3 scripts/triagem/pecas_notas.py [lote ...]   (padrão: lotes adp-*)
"""
import glob, gzip, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LIM_NOTA, LIM_TRECHO = 420, 300


def _json(v):
    while isinstance(v, str) and v[:1] in '[{':
        try:
            v = json.loads(v)
        except ValueError:
            break
    return v


def limpa(t):
    t = re.sub(r'\s+', ' ', t or '')
    t = re.sub(r'Assinado eletronicamente por:.{0,220}?N[úu]mero do documento: \d+', ' ', t)
    t = re.sub(r'https?://\S+', ' ', t)
    t = re.sub(r'PODER JUDICI[ÁA]RIO.{0,260}?(Mato Grosso do Sul|S[ãa]o Paulo|Regi[ãa]o)\b', ' ', t, flags=re.I)
    t = re.sub(r'(-\s*)?Turma Regional de Mato Grosso do Sul|Tribunal Regional Federal da 3ª Regi[ãa]o|Rua Cear[áa], 2178.{0,60}?CEP: ?79021-000', ' ', t, flags=re.I)
    return re.sub(r'\s+', ' ', t).strip()


def autos(cnj):
    p = os.path.join(RAIZ, 'acervo/autos', cnj + '.json.gz')
    if not os.path.exists(p):
        return None
    a = json.load(gzip.open(p))
    docs = {str(d.get('id')): d for d in (_json(a.get('docs')) or []) if isinstance(d, dict)}
    partes = re.split(r'===== ID (\d+) \|[^\n]*?=====', a.get('texto') or '')
    tx = {partes[k]: partes[k + 1] for k in range(1, len(partes) - 1, 2)}
    falta = set(str(x) for x in (_json(a.get('faltam')) or []))
    return docs, tx, falta


DEC = re.compile(r'senten|decis|ac[óo]rd|despacho|voto|ementa', re.I)
PET = re.compile(r'apela|agravo|contrarraz|contramin|embargos|recurso|peti|parecer|manifesta|memoriais|impugna|resposta|informa', re.I)
FIM_DEC = re.compile(r'ante o exposto|diante do exposto|pelo exposto|posto isso|isto posto|em face do exposto|nesses termos|dispositivo', re.I)
FIM_PET = re.compile(r'ante o exposto|diante do exposto|pelo exposto|posto isso|isto posto|requer[- ]se|requer|pugna|postula|opina', re.I)


VERBO = re.compile(r'\b(ante o exposto|diante do exposto|pelo exposto|posto isso|isto posto|em face do exposto|indefiro|defiro|julgo|nego|dou provimento|concedo|rejeito|acolho|determino|homologo|extingo|conheço|mantenho|reconsidero|recebo|intime-se|intimem-se)\b', re.I)


def corta(t, ini):
    s = t[ini:ini + LIM_TRECHO + 40]
    return (s[:LIM_TRECHO].rsplit(' ', 1)[0] + ' …') if len(s) > LIM_TRECHO else s


def trecho(desc, texto):
    t = limpa(texto)
    if len(t) < 40:
        return ''
    if DEC.search(desc or ''):
        m = [x for x in VERBO.finditer(t) if x.start() > len(t) * 0.35]
        conc = [x for x in m if FIM_DEC.match(x.group(0))]
        alvo = conc[-1] if conc else (m[0] if m else None)
        if alvo:
            b = max(t.rfind('. ', 0, alvo.start()), t.rfind('; ', 0, alvo.start()))
            ini = b + 2 if b >= 0 and alvo.start() - b < 120 else alvo.start()
            return corta(t, ini)
        return corta(t, max(0, len(t) - LIM_TRECHO))
    if PET.search(desc or ''):
        m = [x for x in FIM_PET.finditer(t) if not re.search(r'intima|publica[çc]', t[x.end():x.end() + 90], re.I)]
        conc = [x for x in m if re.match(r'ante|diante|pelo|posto|isto', x.group(0), re.I) and x.start() > len(t) * 0.5]
        alvo = conc[-1] if conc else (m[-1] if m else None)
        if alvo:
            return corta(t, alvo.start())
    return corta(t, 0)


def no_intervalo(t, x):
    for a, b in re.findall(r'IDs? (\d{6,}) a (\d{6,})', t):
        if int(a) <= int(x) <= int(b):
            return True
    return False


def trechos_com_id(texto, x):
    """Frases do texto que citam o ID x (ou um intervalo de IDs que o contém)."""
    if not texto or (x not in texto and not no_intervalo(texto, x)):
        return []
    if len(texto) <= LIM_NOTA:
        return [texto.strip()]
    out = []
    for fr in re.split(r'(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ(\d])|\n+| \| ', texto):
        if x in fr or no_intervalo(fr, x):
            out.append(fr.strip())
    return out


PREF = [  # campo da triagem preferido para cada espécie de peça
    (re.compile(r'senten|decis[ãa]o agravada|decis[ãa]o recorrida', re.I), ['decisao_recorrida', 'orig.dispositivo']),
    (re.compile(r'apela|agravo|recurso|embargos', re.I), ['recurso', 'rel.razoes']),
    (re.compile(r'contrarraz|contramin|resposta', re.I), ['resposta', 'rel.contrarrazoes']),
    (re.compile(r'parecer', re.I), ['parecer']),
    (re.compile(r'custas|preparo|gru|comprovante', re.I), ['preparo']),
    (re.compile(r'procura|substabelec', re.I), ['representacao']),
    (re.compile(r'inicial', re.I), ['inicial']),
]


def nota(desc, x, F):
    ordem = []
    for rx, campos in PREF:
        if rx.search(desc or ''):
            ordem += campos
    ordem += [k for k in F if k not in ordem]
    out = []
    for k in ordem:
        for fr in trechos_com_id(F.get(k) or '', x):
            if len(fr) < 25 or any(fr[:60] in o or o[:60] in fr for o in out):
                continue
            out.append(fr)
        if len(out) >= 2 or sum(len(o) for o in out) > LIM_NOTA:
            break
    s = ' · '.join(out)
    return (s[:LIM_NOTA].rsplit(' ', 1)[0] + ' …') if len(s) > LIM_NOTA else s


def campos_triagem(it):
    te = it.get('teor') or {}
    c = (it.get('prontuario_triagem') or {}).get('cartao') or {}
    sa = it.get('situacao_atual') or {}
    F = {k: str(v) for k, v in te.items() if isinstance(v, str) and v and not re.match(r'N[ãa]o consta', v)}
    for k, v in (c.get('rel') or {}).items():
        if isinstance(v, str) and v:
            F['rel.' + k] = v
    for k, v in (c.get('orig') or {}).items():
        if isinstance(v, str) and v:
            F['orig.' + k] = v
    for k in ('questoes', 'sintese', 'especificidades'):
        if isinstance(c.get(k), str) and c.get(k):
            F[k] = c[k]
    for k in ('especificidades', 'peculiaridades', 'observacao'):
        if isinstance(it.get(k), str) and it.get(k):
            F['item.' + k] = it[k]
    r = sa.get('resumo') or ''
    for k in list(F):
        v = F[k]
        if r and v.startswith(r):
            v = v[len(r):].lstrip(' ·')
        if v.startswith('► Situação'):
            v = ''
        if v:
            F[k] = v
        else:
            del F[k]
    return F


def main(lotes):
    tot = mud = 0
    for lid in lotes:
        p = os.path.join(RAIZ, 'acervo/lotes', lid + '.json')
        L = json.load(open(p, encoding='utf-8'))
        mudou = False
        for it in L.get('itens', []):
            c = (it.get('prontuario_triagem') or {}).get('cartao') or {}
            P = c.get('pecas') or []
            if not P:
                continue
            A = autos(it['processo'])
            F = campos_triagem(it)
            for pc in P:
                if not isinstance(pc, dict) or not pc.get('id'):
                    continue
                tot += 1
                x = str(pc['id']).strip()
                antes = json.dumps(pc, ensure_ascii=False, sort_keys=True)
                if not pc.get('nota'):
                    n = nota(pc.get('desc', ''), x, F)
                    if n:
                        pc['nota'] = n
                if A:
                    docs, tx, falta = A
                    d = docs.get(x)
                    if d:
                        pj = {'tipo': d.get('tipo') or '', 'descricao': d.get('descricao') or '', 'juntado_por': d.get('juntado_por') or '',
                              'paginas': d.get('paginas') or 0}
                        if pj['descricao'] == pj['tipo']:
                            pj['descricao'] = ''
                        if x in falta or (d.get('formato') == 'pdf' and not (d.get('caracteres') or 0)):
                            pj['sem_texto'] = True
                        pc['pje'] = {k: v for k, v in pj.items() if v not in ('', 0, None)}
                    if not pc.get('trecho') and tx.get(x):
                        t = trecho(pc.get('desc', '') + ' ' + ((d or {}).get('tipo') or ''), tx[x])
                        if t:
                            pc['trecho'] = t
                if json.dumps(pc, ensure_ascii=False, sort_keys=True) != antes:
                    mud += 1; mudou = True
        if mudou:
            open(p, 'w', encoding='utf-8').write(json.dumps(L, ensure_ascii=False, indent=1) + '\n')
    print('peças', tot, 'detalhadas agora', mud)


if __name__ == '__main__':
    ls = sys.argv[1:] or sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(RAIZ, 'acervo/lotes/adp-*.json')))
    main(ls)
