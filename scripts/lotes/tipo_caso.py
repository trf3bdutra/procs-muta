"""Integra o tipo de caso e as especificidades dos itens de um lote do Collectio.

Padrão (o mesmo dos cartões do prontuário e das fichas):
- assunto: o assunto cadastrado no PJe, como veio (pode estar errado ou vago).
- assunto_detalhado: o assunto do PJe corrigido e preciso, preenchido na triagem.
- tipo_caso: cadeia "Matéria · tipo · aspecto distintivo", com segmentos separados por " · ".
  A matéria vem do grupo do lote quando o texto não a traz (ex.: g6 → "Previdenciário"). Nome canônico e
  aliases no vocabulário comum padrao/tipo-caso.json, o mesmo dos precedentes do Compêndio
  (scripts/catalogo/tipo_caso.py): é a chave da busca de precedentes pelo tipo de caso.
  Substitui o antigo "subassunto", que deixou de existir.
- especificidades: fatos que distinguem o caso, um por segmento " · ", com o ID quando houver.
O cartão do prontuário guarda o tipo de caso na chave "subassuntos" (mantida por compatibilidade) e o
assunto detalhado em "assuntoDet"; alimentar.py os leva à ficha (Tema e Especificidades) e aos cartões da pauta.
Itens antigos com "subassunto" são migrados: o texto vai para tipo_caso e o tipo_caso anterior fica em
triagem.tipo_caso_anterior.

Uso: python3 scripts/lotes/tipo_caso.py acervo/lotes/adp-ai.json
"""
import json, re, sys, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / 'scripts'))
import tipocaso  # noqa: E402  vocabulário comum (padrao/tipo-caso.json), o mesmo dos precedentes do Compêndio

MATERIA = tipocaso.MATERIA_GRUPO


def nz(s):
    s = unicodedata.normalize('NFD', s or '')
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()


def segs(s):
    s = re.sub(r'\s+[—–-]\s+|;\s+|\s+›\s+', ' · ', (s or '').strip())
    return [x.strip(' .') for x in re.split(r'\s+·\s+', s) if x.strip(' .')]


def tipo_caso(texto, grupo=None):
    S = segs(texto)
    if not S:
        return ''
    if tipocaso.materia_de(S[0]):
        S = tipocaso.segs(tipocaso.canonico(' · '.join(S)))   # alias da matéria → nome canônico
    else:
        m = MATERIA.get(grupo or '')
        if m and nz(m).split()[0] not in nz(S[0]):
            S = [m] + S
    S[0] = S[0][:1].upper() + S[0][1:]
    return ' · '.join(S)


ABREV = {'des', 'fed', 'rel', 'min', 'art', 'arts', 'f', 'fls', 'n', 'nº', 'inc', 'al', 'p', 'pp', 'dr', 'dra', 'sr', 'sra', 'proc', 'ltda', 'cia', 'av', 'id', 'cf', 'v', 'vol', 'ex', 'res', 'pres', 'est'}


def frases(texto):
    """Divide em frases sem quebrar abreviaturas (Des. Fed., f. 28) nem o que está entre parênteses."""
    out, ini, prof = [], 0, 0
    for i, ch in enumerate(texto):
        if ch in '([':
            prof += 1
        elif ch in ')]':
            prof = max(0, prof - 1)
        elif ch == '.' and prof == 0 and i + 2 < len(texto) and texto[i + 1] == ' ' and re.match(r'[A-ZÁÉÍÓÚÂÊÔ"“]', texto[i + 2]):
            ant = re.search(r'([\wº]+)$', texto[ini:i])
            if ant and (ant.group(1).lower() in ABREV or len(ant.group(1)) == 1):
                continue
            out.append(texto[ini:i]); ini = i + 2
    out.append(texto[ini:])
    return [x.strip().rstrip('.') for x in out if x.strip()]


def especificidades(texto):
    if not texto:
        return ''
    if ' · ' in texto:
        return ' · '.join(x.strip().rstrip('.') for x in texto.split(' · ') if x.strip())
    return ' · '.join(frases(texto.strip()))


def classe(tipo_caso):
    t = (tipo_caso or '').split(' · ')[0].strip()
    return t if len(t) <= 30 and re.fullmatch(r'(AI|AgInt|ED|Apel\w*|ApCiv|ReeNec|RemNecCiv|ResAutCiv|TutCautAnt)', t) else ''


def aplicar(it):
    C = (it.get('prontuario_triagem') or {}).get('cartao') or {}
    atual = it.get('tipo_caso') or ''
    cl = classe(atual)
    base = it.get('subassunto') or C.get('subassuntos') or (atual[len(cl) + 3:] if cl else atual)
    tc = tipo_caso(base, it.get('grupo'))
    if not tc:
        return False
    esp = especificidades(it.get('especificidades') or C.get('especificidades') or it.get('peculiaridades'))
    mudou = 'subassunto' in it or (it.get('especificidades'), atual) != (esp, tc)
    if atual and atual != tc and not cl and not (it.get('triagem') or {}).get('tipo_caso_anterior'):
        it.setdefault('triagem', {})['tipo_caso_anterior'] = atual
    it.pop('subassunto', None)
    it['especificidades'], it['tipo_caso'] = esp, tc
    it.setdefault('assunto_detalhado', it.get('assunto_detalhado') or C.get('assuntoDet') or '')
    if it.get('prontuario_triagem'):
        C['subassuntos'] = tc
        if esp:
            C['especificidades'] = esp
    return mudou


if __name__ == '__main__':
    arq = Path(sys.argv[1] if len(sys.argv) > 1 else 'acervo/lotes/adp-ai.json')
    L = json.loads(arq.read_text(encoding='utf-8'))
    n = sum(aplicar(it) for it in L.get('itens', []))
    arq.write_text(json.dumps(L, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{arq}: {n} item(ns) com tipo de caso/especificidades atualizados')
