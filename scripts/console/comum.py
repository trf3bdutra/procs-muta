"""Peças comuns das rotinas pela API do Claude (Claude Console): cliente, série de julgados,
recortes de ementa e voto, saída estruturada por ferramenta e lotes (Message Batches).

A chave vem de ANTHROPIC_API_KEY. Os modelos podem ser trocados por variável de ambiente:
CONSOLE_MODELO_FORTE (radar e análise), CONSOLE_MODELO (divergências), CONSOLE_MODELO_LEVE (extração em lote).
"""
import datetime as dt
import gzip
import json
import os
import pathlib
import re
import sys
import time

RAIZ = pathlib.Path(__file__).resolve().parents[2]
SERIE = RAIZ / 'precedentes' / 'jurisprudencia'
RELATORIOS = RAIZ / 'relatorios'
MODELO = {
    'forte': os.environ.get('CONSOLE_MODELO_FORTE', 'claude-opus-5-5'),
    'medio': os.environ.get('CONSOLE_MODELO', 'claude-sonnet-5-5'),
    'leve': os.environ.get('CONSOLE_MODELO_LEVE', 'claude-haiku-5-5'),
}
HOJE = dt.date.today()


def aviso(*a):
    print(*a, file=sys.stderr, flush=True)


def cliente():
    if not os.environ.get('ANTHROPIC_API_KEY'):
        sys.exit('ANTHROPIC_API_KEY não definida: crie a chave no Claude Console e grave-a como segredo do repositório.')
    import anthropic
    return anthropic.Anthropic(max_retries=4)


# ---------------------------------------------------------------- série de julgados
def serie(especie=None, de=None, ate=None):
    """Registros de precedentes/jurisprudencia. especie: 'acordao' | 'monocratica' | None (ambas).
    Cada registro ganha _especie e _data (AAAA-MM-DD)."""
    pastas = {'acordao': 'acordaos', 'monocratica': 'monocraticas'}
    for esp, pasta in pastas.items():
        if especie and especie != esp:
            continue
        for arq in sorted((SERIE / pasta).glob('*.json.gz')):
            ano = int(arq.name[:4])
            if (de and ano < int(str(de)[:4])) or (ate and ano > int(str(ate)[:4])):
                continue
            d = json.load(gzip.open(arq, 'rt', encoding='utf-8'))
            for r in (d.get('registros', d) if isinstance(d, dict) else d):
                r['_especie'] = esp
                r['_data'] = r.get('data_julgamento_iso') or r.get('data_decisao_iso') or ''
                yield r


def ementa(r):
    """Só o texto da ementa, sem o cabeçalho do PJe."""
    t = str(r.get('ementa') or '')
    m = re.search(r'\n\s*(E\s?M\s?E\s?N\s?T\s?A|Ementa|EMENTA)\s*:?\s*\n', t)
    if m:
        t = t[m.end():]
    else:
        ls = t.split('\n')
        for i, l in enumerate(ls):
            if len(l) > 60 and l.upper() == l and re.search(r'[A-ZÁÉÍÓÚÇ]{4}', l):
                t = '\n'.join(ls[i:]); break
    t = re.split(r'\n\s*(ACÓRDÃO|A C Ó R D Ã O)\s*\n', t)[0]
    return t.strip()


def secao(texto, nome, ate=('EMENTA', 'Ementa', 'ACÓRDÃO', 'E M E N T A', 'A C Ó R D Ã O', 'RELATÓRIO')):
    t = str(texto or '')
    m = re.search(r'\n\s*' + nome + r'\s*\n', t)
    if not m:
        return ''
    resto = t[m.end():]
    fim = len(resto)
    for a in ate:
        k = re.search(r'\n\s*' + re.escape(a) + r'\s*\n', resto)
        if k and k.start() < fim:
            fim = k.start()
    return resto[:fim]


def sem_transcricoes(t):
    """Tira ementas e trechos transcritos entre aspas, para medir só o texto do gabinete."""
    t = re.sub(r'“[^”]{60,}”', ' ', t, flags=re.S)
    t = re.sub(r'"[^"\n]{60,}"', ' ', t)
    return '\n'.join(l for l in t.split('\n') if not (len(l) > 80 and l.upper() == l))


# ---------------------------------------------------------------- respostas
def ferramenta(nome, descricao, propriedades, obrigatorias):
    return {'name': nome, 'description': descricao,
            'input_schema': {'type': 'object', 'properties': propriedades, 'required': obrigatorias}}


def da_ferramenta(msg, nome):
    for b in msg.content:
        if getattr(b, 'type', '') == 'tool_use' and b.name == nome:
            return dict(b.input)
    raise RuntimeError('resposta sem a ferramenta %s (stop_reason=%s)' % (nome, getattr(msg, 'stop_reason', '?')))


def texto(msg):
    return ''.join(getattr(b, 'text', '') for b in msg.content if getattr(b, 'type', '') == 'text').strip()


def chamar(cli, **kw):
    """messages.create com streaming (respostas longas) e continuação de pause_turn (ferramentas do servidor)."""
    msgs = list(kw.pop('messages'))
    for _ in range(6):
        with cli.messages.stream(messages=msgs, **kw) as st:
            msg = st.get_final_message()
        if msg.stop_reason != 'pause_turn':
            return msg
        msgs = msgs + [{'role': 'assistant', 'content': msg.content}]
    return msg


# ---------------------------------------------------------------- lotes
def em_lote(cli, pedidos, rotulo='lote', intervalo=60):
    """pedidos: lista de (custom_id, params). Devolve {custom_id: Message ou Exception}.
    Lotes de até 10.000 pedidos cada; espera todos terminarem."""
    R = {}
    for i in range(0, len(pedidos), 10000):
        parte = pedidos[i:i + 10000]
        b = cli.messages.batches.create(requests=[{'custom_id': c, 'params': p} for c, p in parte])
        aviso('%s: lote %s com %d pedidos' % (rotulo, b.id, len(parte)))
        while True:
            b = cli.messages.batches.retrieve(b.id)
            if b.processing_status == 'ended':
                break
            n = b.request_counts
            aviso('  em processamento %s · prontos %s' % (n.processing, n.succeeded + n.errored + n.canceled + n.expired))
            time.sleep(intervalo)
        for x in cli.messages.batches.results(b.id):
            R[x.custom_id] = x.result.message if x.result.type == 'succeeded' else RuntimeError(x.result.type)
    return R


def gravar(caminho, conteudo):
    caminho = pathlib.Path(caminho)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(conteudo, encoding='utf-8')
    aviso('gravado', caminho.relative_to(RAIZ) if RAIZ in caminho.parents else caminho)
    return caminho


def br(d):
    return '/'.join(reversed(str(d)[:10].split('-')))
