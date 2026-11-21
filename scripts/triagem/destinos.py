# -*- coding: utf-8 -*-
"""Destinos da triagem: leva às coleções de decisões do Collectio os processos triados que estão aptos.

A partir dos lotes de triagem (acervo/lotes/adp-*.json), pelo "ato a proferir" registrado na triagem:
  - Monocrática    → decisão monocrática (artigo 932 do CPC) indicada com paradigma ("Possível"/"Provável") ou já
                     como "Decisão monocrática";
  - Interlocutória → decisão de urgência pendente (tutela recursal, efeito suspensivo, liminar, implantação imediata);
  - Despacho       → despacho ou diligência antes do julgamento (preparo, representação, vista ao MPF, resposta etc.).
Na ficha (acervo/operacional.json) grava o que o Caput grava ao mandar para a monocrática (producao.Destino
"Monocrática" e controles "Monocrática - *"), mais producao."Mono - Tipo de ato" (a coleção sai do tipo de ato) e,
se vazio, "Mono - Fundamento" com a proposta da triagem. As coleções agrupam os processos pela matriz de cada uma
(acervo/matrizes/<monocratica|interlocutoria|despacho>.json): um grupo por série ou tipo de providência.

A Interlocutória não muda o destino: o processo com urgência pendente registrada na ficha (triagem."Urgência") já
aparece na coleção, com o destino do mérito que tiver; aqui ele só entra na matriz (grupo).
Não mexe em: processo com destino já definido (Sessão, Monocrática, Outro destino), em pauta de sessão futura, com
seleção prévia, com a etiqueta "NÃO MEXER", já julgado (AP5) ou sem autos triados. Votos aptos (ato de voto sem
[VALIDAR], triagem conferida, sem pendência de preparo, representação, parecer ou urgência) vão, com --reserva, para o
banco reserva da seleção prévia: triagem."Seleção Prévia" = "SELECIONADO PREVIAMENTE" sem "Nova sessão de destino"
(scripts/lotes/colecoes.py monta o lote selecao-reserva). A sessão é escolhida depois, no Caput.

Uso: python3 scripts/triagem/destinos.py [--gravar [--reserva]] [lote ...]
"""
import datetime, glob, json, re, sys
from pathlib import Path

R = Path(__file__).resolve().parents[2]
GRAVAR = '--gravar' in sys.argv
RESERVA = '--reserva' in sys.argv
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
_UTC = datetime.datetime.now(datetime.timezone.utc)
HOJE_D = (_UTC - datetime.timedelta(hours=4)).date()
HOJE = HOJE_D.isoformat()
HOJE_BR = HOJE_D.strftime('%d/%m/%Y')
PRAZO_BR = (HOJE_D + datetime.timedelta(days=30)).strftime('%d/%m/%Y')
POR = 'Triagem (lotes do Caput)'
dg = lambda s: re.sub(r'\D', '', str(s or ''))


def ler(p, padrao=None):
    p = Path(p)
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else padrao


def sem(s):
    import unicodedata
    return ''.join(c for c in unicodedata.normalize('NFD', str(s or '')) if unicodedata.category(c) != 'Mn').lower()


# ---------- processos fora de alcance ----------
pautados = {}
for p in glob.glob(str(R / 'acervo/sessoes/2*.json')):
    d = ler(p, {}) or {}
    data = Path(p).stem
    if data >= HOJE:
        for it in d.get('itens') or []:
            pautados[dg(it.get('cnj') or it.get('processo') or it.get('numero'))] = data

OP = ler(R / 'acervo/operacional.json')
REG = {dg(r.get('processo')): r for r in OP['registros']}

# séries primeiro: o processo que está numa série vai com ela (a série é o lote mais específico)
lotes = ARGS or sorted(Path(x).stem for x in glob.glob(str(R / 'acervo/lotes/adp-serie-*.json'))) + ['adp-ai', 'adp-remessas', 'adp-ap-1s', 'adp-ap-2s', 'adp-ap-3s']
VISTOS = set()


def urgencia_pendente(r):
    t = (r or {}).get('triagem') or {}
    return bool(t.get('Urgência')) and re.search(r'pendente|nao apreciad', sem(t.get('Urgência - Apreciação') or 'pendente'))


def categoria(it, r=None):
    """(coleção, tipo de ato) pelo ato a proferir da triagem; None quando não é decisão do gabinete agora ou não está apta."""
    tri = it.get('triagem') or {}
    a = sem(tri.get('ato') or '')
    mono = sem(tri.get('monocratica') or '')
    g = tri.get('grupo') or it.get('grupo') or ''
    if g in ('AP5', 'A8') or re.search(r'certificar o transito|vice-presidencia|sobrestamento|retratac|adequacao', a):
        return None
    if urgencia_pendente(r) or re.search(r'^(decisao (liminar|de urgencia|sobre (a |o )?(tutela|efeito|pedido de implantacao))|apreciar (a |o )?(tutela|efeito)|apreciacao da tutela|exame d[ao] (tutela|efeito))', a):
        return ('interlocutoria', 'Decisão de urgência')
    if re.search(r'^(despacho|vista ao|vista a|intimar|intimacao|verificar a regulariz|decisao sobre o pedido de dilacao|requisitar)', a):
        return ('despacho', 'Despacho')
    condicional = re.search(r'se houver|apos|a verificar|se confirmad|depende|nao indicada|^improvavel', mono)
    if re.search(r'^(possivel|provavel|sim)', mono) and not condicional and (
            re.search(r'^decisao monocratica|monocratica provavel|possivel decisao monocratica|decisao monocratica de', a)
            or (re.search(r'\(voto\) ou decisao monocratica', a) and re.search(r'intempestiv|desert|prejudic', a))):
        return ('monocratica', 'Decisão monocrática (art. 932)')
    return None


def apto_voto(it):
    tri = it.get('triagem') or {}
    if 'Triagem assistida' in str(it.get('especificidades') or ''):
        return False  # extração assistida: só depois da conferência
    a = sem(tri.get('ato') or '')
    if not re.search(r'\(voto\)|^julgamento d', a) or re.search(r'despacho|intimar|vista|diligenc|ou prejuizo|ou prejudicialidade|monocratica|\[validar|a verificar|triagem pendente', a):
        return False
    pend = ' '.join(it.get('pendencias') or []) if isinstance(it.get('pendencias'), list) else str(it.get('pendencias') or '')
    if re.search(r'preparo|representa|intempest|parecer|urg', sem(pend)):
        return False
    return True


COL = {'monocratica': [], 'interlocutoria': [], 'despacho': []}
VOTOS, PULADOS = [], []
for lid in lotes:
    L = ler(R / 'acervo/lotes' / (lid + '.json'))
    if not L:
        continue
    gmap = {g['id']: g for g in L.get('grupos') or []}
    serie = re.sub(r'^Série · ', '', L.get('titulo') or '') if lid.startswith('adp-serie-') else ''
    for it in L.get('itens') or []:
        if not it.get('tipo_caso'):
            continue
        d = dg(it['processo'])
        if d in VISTOS:
            continue
        VISTOS.add(d)
        r = REG.get(d) or {}
        prod, tri = r.get('producao') or {}, r.get('triagem') or {}
        etq = str(it.get('etiquetas') or '')
        motivo = ''
        if d in pautados:
            motivo = 'em pauta de ' + pautados[d]
        elif re.search(r'NÃO MEXER|NAO MEXER', etq, re.I):
            motivo = 'etiqueta NÃO MEXER'
        elif prod.get('Destino'):
            motivo = 'destino já definido: ' + prod['Destino']
        elif tri.get('Seleção Prévia'):
            motivo = 'seleção prévia já feita'
        c = categoria(it, r)
        if motivo and not (c and c[0] == 'interlocutoria'):
            if c:
                PULADOS.append((it['processo'], c[0], motivo))
            continue
        g = (it.get('triagem') or {}).get('grupo') or it.get('grupo') or ''
        rot = (gmap.get(g) or {}).get('rotulo', '')
        if serie:  # série de um tema só: o título da série; série mista: o grupo dentro dela
            rot = 'Lote · ' + (serie if len(gmap) <= 1 else rot)
        if c:
            COL[c[0]].append({'processo': it['processo'], 'tipo': c[1], 'lote': lid, 'grupo': g, 'grupo_rot': rot, 'it': it})
        elif apto_voto(it):
            VOTOS.append({'processo': it['processo'], 'lote': lid, 'grupo': g, 'grupo_rot': rot, 'tipo_caso': it.get('tipo_caso'), 'assunto': it.get('assunto_detalhado') or it.get('assunto')})

# ---------- grupos (lotes dentro de cada coleção) ----------
CORES = ['#2a6a4a', '#6a5a2a', '#2a4a6a', '#6a2a5a', '#4a6a2a', '#6a3a2a', '#2a5a6a', '#5a2a6a', '#3a6a5a', '#6a4a3a', '#5d6b72']


def chave_grupo(col, x):
    """Lote dentro da coleção: a série do lote de triagem (L/série) ou, nas ações genéricas, o assunto ou a providência."""
    it, tri = x['it'], x['it'].get('triagem') or {}
    a = sem(tri.get('ato') or '')
    if col == 'despacho':
        if re.search(r'preparo|stn|1\.007', a): return 'Preparo: comprovante do Tesouro ou recolhimento em dobro'
        if re.search(r'representa|procura|desentranh|dilacao', a): return 'Representação processual'
        if re.search(r'vista ao mpf|vista a procuradoria|prr|mpf', a): return 'Vista ao MPF'
        if re.search(r'agravo interno|contraminuta|contrarraz|resposta', a): return 'Resposta ao recurso (contraminuta, contrarrazões, agravo interno)'
        if re.search(r'laudo|pericia', a): return 'Vista de laudo ou perícia'
        if re.search(r'midia|audiencia', a): return 'Mídias da audiência'
        return 'Outras diligências'
    if col == 'interlocutoria':
        if re.search(r'preparo|stn|desert', a): return 'Urgência pendente · antes, o preparo (comprovante do Tesouro ou deserção)'
        if re.search(r'efeito suspensivo', a): return 'Efeito suspensivo pendente'
        if re.search(r'implantacao', a): return 'Implantação imediata do benefício'
        return 'Tutela recursal pendente'
    if str(x['grupo_rot']).startswith('Lote · '):
        return re.sub(r'^Lote · ', '', x['grupo_rot'])
    if re.match(r'^RM[13]$', x['grupo']) and x['grupo_rot']:
        return 'Remessa necessária · ' + re.sub(r'^Remessa · ', '', x['grupo_rot'])
    if re.match(r'^RA\d', x['grupo']) and x['grupo_rot']:
        return re.sub(r'^Apelação com remessa · ', '', x['grupo_rot'])
    ad = str(it.get('assunto_detalhado') or '').split(' — ')[0].split(';')[0].strip()
    return ad[:90] or (it.get('assunto') or 'Outros')


MATRIZ = {}
for col, xs in COL.items():
    grupos, itens = {}, {}
    chaves = {}
    for x in xs:
        chaves.setdefault(sem(chave_grupo(col, x)), []).append(x)
    for k, lx in chaves.items():
        rot = chave_grupo(col, lx[0]) if len(lx) > 1 or col != 'monocratica' else 'Casos individuais (sem série)'
        for x in lx:
            x['lote_col'] = rot
            grupos.setdefault(rot, []).append(x)
    ordem = sorted(grupos, key=lambda k: (k.startswith('Casos individuais'), -len(grupos[k]), k))
    gl = []
    for i, k in enumerate(ordem):
        gid = col[:3].upper() + str(i + 1)
        ex = grupos[k][0]
        res = (ex['it'].get('resultado') or '').split('‖')[-1].strip()
        gl.append({'id': gid, 'rotulo': k[:200], 'cor': CORES[i % len(CORES)], 'resultado': ('' if len(grupos[k]) > 1 else res)[:600], 'modelo': ''})
        for x in grupos[k]:
            itens[x['processo']] = {'grupo': gid, 'variacoes': [], 'observacao': ('Triagem: ' + x['lote'] + ' · ' + (x['grupo'] + ' ' + x['grupo_rot']).strip())[:2000]}
    MATRIZ[col] = {'grupos': gl, 'itens': itens}

# ---------- relatório ----------
for col, xs in COL.items():
    print(f'== {col}: {len(xs)}')
    for g in MATRIZ[col]['grupos']:
        n = sum(1 for v in MATRIZ[col]['itens'].values() if v['grupo'] == g['id'])
        print(f'   {g["id"]} ({n}) {g["rotulo"][:90]}')
print(f'== votos aptos para a seleção prévia (banco reserva com --reserva): {len(VOTOS)}')
print(f'== fora (destino, pauta ou etiqueta), com categoria: {len(PULADOS)}')
from collections import Counter
print('   ', Counter(m.split(':')[0].split(' de ')[0] for _, _, m in PULADOS))

if GRAVAR:
    n = 0
    for col, xs in COL.items():
        if col == 'interlocutoria':
            continue  # a urgência registrada na ficha já põe o processo na coleção Interlocutória; o destino do mérito fica como está
        for x in xs:
            d = dg(x['processo'])
            r = REG.get(d)
            if not r:
                r = {'processo': x['processo'], 'origem': {}, 'triagem': {}, 'producao': {}, 'pauta': {'sessoes': []}}
                OP['registros'].append(r); REG[d] = r
            p = r.setdefault('producao', {}); c = r.setdefault('controles', {})
            p['Destino'] = 'Monocrática'
            p['Mono - Tipo de ato'] = x['tipo']
            prop = (x['it'].get('resultado') or '').split('‖')[-1].strip()
            if not p.get('Mono - Fundamento') and prop:
                p['Mono - Fundamento'] = prop[:1500]
            c.setdefault('Monocrática - Registrada em', HOJE_BR)
            c.setdefault('Monocrática - Prazo', PRAZO_BR)
            if not c.get('Monocrática - Observação'):
                c['Monocrática - Observação'] = ('Coleção ' + {'monocratica': 'Monocrática', 'interlocutoria': 'Interlocutória', 'despacho': 'Despacho'}[col] + ' · ' + x['lote_col'] + ' · triagem ' + x['lote'] + ' ' + x['grupo'])[:500]
            c['Monocrática - Atualizado por'] = POR
            c['Monocrática - Atualizado em'] = HOJE_BR
            r.setdefault('origem', {})['atualizado_em'] = _UTC.strftime('%Y-%m-%dT%H:%M:%SZ')
            n += 1
    nr = 0
    if RESERVA:  # votos aptos → banco reserva da seleção prévia (sem sessão)
        for x in VOTOS:
            d = dg(x['processo'])
            r = REG.get(d)
            if not r:
                r = {'processo': x['processo'], 'origem': {}, 'triagem': {}, 'producao': {}, 'pauta': {'sessoes': []}}
                OP['registros'].append(r); REG[d] = r
            t = r.setdefault('triagem', {}); pa = r.setdefault('pauta', {'sessoes': []})
            if t.get('Seleção Prévia') or (r.get('producao') or {}).get('Destino'):
                continue
            t['Seleção Prévia'] = 'SELECIONADO PREVIAMENTE'
            pa['Nova sessão de destino'] = ''
            r.setdefault('origem', {})['atualizado_em'] = _UTC.strftime('%Y-%m-%dT%H:%M:%SZ')
            nr += 1
    OP['atualizado_em'] = _UTC.strftime('%Y-%m-%dT%H:%M:%SZ')
    (R / 'acervo/operacional.json').write_text(json.dumps(OP, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    (R / 'acervo/matrizes').mkdir(exist_ok=True)
    for col, mx in MATRIZ.items():
        p = R / 'acervo/matrizes' / (col + '.json')
        ant = ler(p) or {'schema': 'gabcmt.matriz', 'versao': 1, 'id': col, 'colecao': col, 'grupos': [], 'colunas': [], 'itens': {}}
        rots = {g['rotulo']: g for g in ant.get('grupos') or []}
        ids = {g['id'] for g in ant.get('grupos') or []}
        novo_id = {}
        for g in mx['grupos']:
            if g['rotulo'] in rots:
                novo_id[g['id']] = rots[g['rotulo']]['id']; continue
            gid, k = g['id'], 1
            while gid in ids:
                k += 1; gid = col[:3].upper() + str(len(ids) + k)
            ids.add(gid); novo_id[g['id']] = gid
            ant.setdefault('grupos', []).append(dict(g, id=gid))
        for proc, m in mx['itens'].items():
            if proc in (ant.get('itens') or {}) and (ant['itens'][proc].get('grupo')):
                continue  # marca feita no Collectio prevalece
            ant.setdefault('itens', {})[proc] = dict(m, grupo=novo_id[m['grupo']])
        ant['atualizado_em'] = HOJE; ant['por'] = POR
        p.write_text(json.dumps(ant, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'gravado: {n} processo(s) na ficha e as matrizes de {", ".join(MATRIZ)}')
