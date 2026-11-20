"""Vocabulário comum do tipo de caso (padrao/tipo-caso.json), para processos e precedentes.

Tipo de caso = "Matéria · tipo · aspecto distintivo". A matéria (1º segmento) é a chave da
interconexão entre os processos do gabinete e os precedentes do Compêndio: os dois lados usam
o mesmo nome canônico, e as formas alternativas (aliases) são reconhecidas.

Funções:
  materia_de(texto)          matéria canônica do 1º segmento de um tipo de caso ('' se não reconhecida)
  materia_do_assunto(ass)    matéria canônica de um assunto do catálogo ('' se não mapeado)
  materia_do_ramo(ramo)      matéria do ramo do direito catalogado no precedente
  canonico(texto)            o tipo de caso com o 1º segmento trocado pelo nome canônico, quando é um alias
  cadeia(materia, *segs)     monta a cadeia sem repetir segmentos nem a matéria
"""
import json, re, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
VOCAB = json.loads((RAIZ / 'padrao/tipo-caso.json').read_text(encoding='utf-8'))
VAZIAS = {'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'por', 'para', 'art', 'lei', 'cf', '88', 'contra'}


def nz(s):
    s = unicodedata.normalize('NFD', s or '')
    return re.sub(r'\s+', ' ', ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()).strip()


def toks(s):
    return {t for t in re.findall(r'[a-z0-9]+', nz(s)) if t not in VAZIAS and len(t) > 2}


def segs(s):
    s = re.sub(r'\s+[—–]\s+|;\s+|\s+›\s+', ' · ', (s or '').strip())
    return [x.strip(' .') for x in re.split(r'\s+·\s+', s) if x.strip(' .')]


MATERIAS = [m['nome'] for m in VOCAB['materias']]
MATERIA_GRUPO = {m['grupo']: m['nome'] for m in VOCAB['materias'] if m.get('grupo')}
_ALIAS = {}
for m in VOCAB['materias']:
    for a in [m['nome']] + m.get('aliases', []):
        _ALIAS[nz(a)] = m['nome']
_ASSUNTO = {nz(a): m['nome'] for m in VOCAB['materias'] for a in m.get('assuntos', [])}


def materia_de(texto):
    """Matéria canônica do 1º segmento: igualdade com o nome ou um alias; senão, o nome ou alias
    mais longo que inicia o segmento (ex.: "Cumprimento de sentença contra o INSS")."""
    S = segs(texto)
    if not S:
        return ''
    p = nz(S[0])
    if p in _ALIAS:
        return _ALIAS[p]
    best = ''
    for a, nome in _ALIAS.items():
        if len(a) > len(best) and (p.startswith(a + ' ') or p.startswith(a + '(')):
            best = a
    return _ALIAS.get(best, '')


_RAMOS = [(re.compile(a), m) for a, m in VOCAB.get('ramos', [])]


def materia_do_ramo(ramo):
    """Matéria do ramo do direito catalogado ("Direito Processual Civil e Previdenciário" → Previdenciário):
    a 1ª regra de "ramos" que casar, na ordem do vocabulário (o ramo substantivo vem antes do processual)."""
    r = nz(ramo)
    for rx, m in _RAMOS:
        if rx.search(r):
            return m
    return ''


def materia_do_assunto(assunto):
    a = nz(assunto)
    if not a:
        return ''
    if a in _ASSUNTO:
        return _ASSUNTO[a]
    return _ALIAS.get(a, '')


def canonico(texto):
    """1º segmento com o nome canônico da matéria. Forma longa que começa pela matéria é desdobrada
    ("Cumprimento de sentença contra o INSS" → "Cumprimento de sentença · contra o INSS"); alias
    exato vira o nome canônico, e o alias segue como 2º segmento quando acrescenta algo
    ("ACP ambiental" → "Ambiental · ACP ambiental"; "OAB" → "Execução da OAB")."""
    S = segs(texto)
    if not S:
        return ''
    m = materia_de(S[0])
    if not m or nz(S[0]) == nz(m):
        if m:
            S[0] = m
        return ' · '.join(S)
    p, c = nz(S[0]), nz(m)
    if p.startswith(c + ' ') or p.startswith(c + '('):
        resto = re.sub(r'^(?:de|da|do|das|dos|e)\s+', '', S[0][len(m):].strip(' ,-'), flags=re.I)
        S = [m] + ([resto] if resto else []) + S[1:]
    else:
        extra = toks(S[0]) - toks(m)
        S = [m] + ([S[0]] if extra and not (len(S) > 1 and extra <= toks(S[1])) else []) + S[1:]
    return ' · '.join(S)


def repete(seg, outro):
    a, b = toks(seg), toks(outro)
    if not a or not b:
        return False
    return len(a & b) / len(a) >= 0.5


def cadeia(materia, *partes):
    out = [materia] if materia else []
    for p in partes:
        for s in segs(p):
            if any(nz(s) == nz(o) or repete(s, o) for o in out):
                continue
            out.append(s)
    if out:
        out[0] = out[0][:1].upper() + out[0][1:]
    return ' · '.join(out)
