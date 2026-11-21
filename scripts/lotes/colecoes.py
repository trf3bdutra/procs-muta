# -*- coding: utf-8 -*-
"""Coleções do Collectio ligadas à triagem do Caput.

1. Avulsos = escaninhos personalizáveis. Os escaninhos antigos (acervo/triagem/escaninhos.json) viram lotes
   tipo 'avulso' (acervo/lotes/esc-<id>.json), com título, subtítulo, cor e bilhete. Depois da migração o arquivo
   antigo fica só com a marca "migrado"; a triagem do Caput lê e grava os escaninhos nos lotes.
2. Seleção prévia: cada sessão futura do calendário (acervo/sessoes/calendario.json) sem pauta oficial ganha o
   lote 'selecao-AAAA-MM-DD' (tipo 'selecao'). Os processos são os marcados na triagem do Caput como
   "SELECIONADO PREVIAMENTE" com aquela "Nova sessão de destino" (acervo/operacional.json); quem sai da seleção vai
   para lote.retirados, com o que já foi registrado. Quando a pauta oficial entra (acervo/sessoes/AAAA-MM-DD.json com
   itens), o lote de seleção é arquivado: some da coleção e dá lugar à pauta da sessão (matriz pauta-AAAA-MM-DD).
3. Índice acervo/lotes/colecoes.json (pautas, triagem, avulsos, seleção prévia), lido pela triagem do Caput.

Nada que a equipe registrou num processo é apagado. Pode rodar de novo.
Uso: python3 scripts/lotes/colecoes.py [--seco]
"""
import datetime, glob, json, os, re, sys
from pathlib import Path

R = Path(os.environ.get('CMT_RAIZ') or Path(__file__).resolve().parents[2])  # CMT_RAIZ: só para os testes
SECO = '--seco' in sys.argv
_UTC = datetime.datetime.now(datetime.timezone.utc)
HOJE = (_UTC - datetime.timedelta(hours=4)).date().isoformat()
AGORA = _UTC.strftime('%Y-%m-%dT%H:%M:%SZ')
dg = lambda s: re.sub(r'\D', '', str(s or ''))
br = lambda d: '/'.join(reversed(d.split('-')))
mud = []


def ler(p, padrao=None):
    p = Path(p)
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else padrao


def grava(p, d):
    mud.append(str(Path(p).relative_to(R)))
    if not SECO:
        Path(p).write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


FONTE = {dg(x.get('processo') or x.get('Processo')): x for x in (ler(R / 'acervo/fonte.json', {}) or {}).get('registros', [])}
OP = {dg(r.get('processo')): r for r in (ler(R / 'acervo/operacional.json', {}) or {}).get('registros', [])}


def item_base(n, cnj):
    f, o = FONTE.get(dg(cnj), {}), OP.get(dg(cnj), {})
    partes = ' x '.join(x for x in [str(f.get('polo_ativo') or '').strip(), str(f.get('polo_passivo') or '').strip()] if x)
    return {'sessao': '', 'item': n, 'processo': cnj, 'recurso': str(f.get('Classe') or f.get('classe') or ''), 'partes': partes,
            'exequente': '', 'executado': '', 'assunto': str(f.get('Assunto') or ''), 'assunto_detalhado': '', 'grupo': None,
            'tipo_caso': str(((o.get('triagem') or {}).get('Tema')) or ''), 'resultado': '', 'modelo': '', 'variacoes': [],
            'observacao': '', 'peculiaridades': '', 'peculiaridades_relator': '', 'orientacao': '',
            'equipe': {'minuta': '', 'correcao': '', 'situacao': 'A minutar'}, 'pecas': [], 'mpf': '', 'triagem': {},
            'ajustes': [], 'pendencias': [], 'minuta': False}


def lote_novo(id_, tipo, titulo, **extra):
    d = {'schema': 'gabcmt.lote', 'versao': 1, 'tipo': tipo, 'origem': extra.pop('origem', 'caput'), 'id': id_, 'titulo': titulo,
         'descricao': extra.pop('descricao', ''), 'sessoes': extra.pop('sessoes', []), 'filtro': {}, 'criado_por': 'colecoes',
         'atualizado_em': HOJE, 'colunas': [], 'grupos': [], 'grupo_outros': {'rotulo': 'A triar', 'cor': '#9aa0a8'},
         'minutas': 'acervo/minutas/' + id_ + '/<processo>.json', 'itens': []}
    d.update(extra)
    return d


def sincroniza(lote, cnjs):
    """Deixa no lote exatamente os processos de cnjs: os novos entram no fim; os que saem vão para lote.retirados."""
    alvo = [c for c in dict.fromkeys(cnjs)]
    atuais = {dg(i.get('processo')): i for i in lote.get('itens', [])}
    ret = {dg(i.get('processo')): i for i in lote.get('retirados', [])}
    novos = []
    for c in alvo:
        k = dg(c)
        novos.append(atuais.get(k) or ret.pop(k, None) or item_base(len(novos) + 1, c))
    sai = [i for k, i in atuais.items() if k not in {dg(c) for c in alvo}]
    for n, i in enumerate(novos, 1):
        i['item'] = n
    alterou = [dg(i.get('processo')) for i in novos] != [dg(i.get('processo')) for i in lote.get('itens', [])]
    lote['itens'] = novos
    if sai or ret:
        lote['retirados'] = list(ret.values()) + sai
    return alterou or bool(sai)


# 1. escaninhos → lotes avulsos
ESC_P = R / 'acervo/triagem/escaninhos.json'
ESC = ler(ESC_P, {}) or {}
if ESC.get('escaninhos') and not ESC.get('migrado'):
    ids = []
    for e in ESC['escaninhos']:
        id_ = 'esc-' + re.sub(r'[^a-z0-9-]', '', str(e.get('id', '')).lower())[:36]
        p = R / 'acervo/lotes' / (id_ + '.json')
        L = ler(p) or lote_novo(id_, 'avulso', str(e.get('titulo') or 'Escaninho')[:80], origem='escaninho',
                                colecao='avulsos', subtitulo=e.get('subtitulo', ''), bilhete=e.get('bilhete', ''),
                                cor=e.get('cor', ''), criado_em=e.get('criadoEm', ''))
        sincroniza(L, e.get('processos') or [])
        grava(p, L); ids.append(id_)
    grava(ESC_P, {'schema': ESC.get('schema', 'gabcmt.escaninhos'), 'versao': 2, 'atualizadoEm': AGORA,
                  'migrado': 'acervo/lotes (coleção Avulsos do Collectio)', 'lotes': ids, 'escaninhos': []})

# 2. seleção prévia por sessão futura
CAL = (ler(R / 'acervo/sessoes/calendario.json', {}) or {}).get('sessoes', [])
selecionados = {}
for k, r in OP.items():
    if str((r.get('triagem') or {}).get('Seleção Prévia') or '').upper() == 'SELECIONADO PREVIAMENTE':
        d = str((r.get('pauta') or {}).get('Nova sessão de destino') or '').strip()
        m = re.match(r'^(\d{2})/(\d{2})/(\d{4})$', d)
        if m:
            selecionados.setdefault(f'{m.group(3)}-{m.group(2)}-{m.group(1)}', []).append(r.get('processo'))
for s in CAL:
    data = s.get('date') or ''
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', data):
        continue
    sess = ler(R / 'acervo/sessoes' / (data + '.json'), {}) or {}
    oficial = len(sess.get('itens') or []) > 0
    p = R / 'acervo/lotes' / ('selecao-' + data + '.json')
    L = ler(p)
    if oficial:
        if L and not L.get('arquivado'):
            L['arquivado'] = True; L['arquivado_em'] = HOJE
            L['arquivado_motivo'] = 'pauta oficial adicionada: a sessão segue na coleção Pautas (pauta-' + data + ')'
            grava(p, L)
        continue
    if data < HOJE and not L:
        continue
    if not L:
        L = lote_novo('selecao-' + data, 'selecao', 'Seleção prévia · ' + br(data), origem='caput', colecao='selecao-previa',
                      sessoes=[data], descricao='Processos selecionados previamente na triagem do Caput para a sessão de ' + br(data) + '.')
        alt = True
    else:
        alt = False
    alt = sincroniza(L, selecionados.get(data, [])) or alt
    if alt:
        L['atualizado_em'] = HOJE; grava(p, L)

# 3. índice das coleções
col = {'pautas': [], 'triagem': [], 'avulsos': [], 'selecao-previa': []}
for p in sorted(glob.glob(str(R / 'acervo/lotes/*.json'))):
    if p.endswith('/colecoes.json'):
        continue
    L = ler(p, {}) or {}
    if not L.get('id'):
        continue
    n = len(L.get('itens') or [])
    t = L.get('tipo')
    if t == 'selecao':
        if not L.get('arquivado'):
            col['selecao-previa'].append({'id': L['id'], 'titulo': L.get('titulo'), 'sessao': (L.get('sessoes') or [''])[0], 'n': n})
    elif t == 'triagem':
        col['triagem'].append({'id': L['id'], 'titulo': L.get('titulo'), 'tarefa': L.get('tarefa', ''), 'n': n})
    elif t == 'pauta' and len(L.get('sessoes') or []) == 1:
        col['pautas'].append({'id': L['id'], 'titulo': L.get('titulo'), 'sessao': L['sessoes'][0], 'n': n})
    elif not L.get('arquivado'):
        col['avulsos'].append({'id': L['id'], 'titulo': L.get('titulo'), 'subtitulo': L.get('subtitulo', ''), 'cor': L.get('cor', ''),
                               'bilhete': L.get('bilhete', ''), 'escaninho': L.get('origem') == 'escaninho' or L.get('colecao') == 'avulsos', 'n': n})
for s in CAL:
    data = s.get('date') or ''
    if len((ler(R / 'acervo/sessoes' / (data + '.json'), {}) or {}).get('itens') or []):
        col['pautas'].append({'id': 'pauta-' + data, 'titulo': 'Pauta · ' + br(data), 'sessao': data, 'matriz': True,
                              'n': len(ler(R / 'acervo/sessoes' / (data + '.json'), {}).get('itens'))})
col['selecao-previa'].sort(key=lambda x: x['sessao']); col['pautas'].sort(key=lambda x: x['sessao'], reverse=True)
IDX_P = R / 'acervo/lotes/colecoes.json'
idx = {'schema': 'gabcmt.colecoes', 'versao': 1, 'colecoes': col}
antes = ler(IDX_P, {}) or {}
if antes.get('colecoes') != col:
    idx['atualizado_em'] = AGORA; grava(IDX_P, idx)
print(('[seco] ' if SECO else '') + 'coleções: ' + ', '.join(f'{k} {len(v)}' for k, v in col.items()) + ' · ' + (str(len(mud)) + ' arquivo(s)' if mud else 'nada a mudar'))
for m in mud:
    print('  ' + m)
