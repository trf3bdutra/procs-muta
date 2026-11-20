"""Integra subassunto e especificidades ao "tipo de caso" dos itens de um lote do Collectio.

Padrão (o mesmo dos cartões do prontuário e das fichas):
- subassunto: cadeia "Matéria · Subassunto · aspecto distintivo", com segmentos separados por " · ".
  A matéria vem do grupo do lote quando o subassunto não a traz (ex.: g6 → "Previdenciário").
- especificidades: fatos que distinguem o caso, um por segmento " · ", com o ID quando houver.
- tipo_caso: "<classe/recorrente> · <subassunto>"; o texto anterior fica em triagem.tipo_caso_anterior.
O cartão do prontuário (prontuario_triagem.cartao.subassuntos/especificidades) recebe os mesmos textos,
para que alimentar.py os leve à ficha (Tema/Subassunto e Especificidades) e aos cartões da pauta.

Uso: python3 scripts/lotes/subassunto.py acervo/lotes/adp-ai.json
"""
import json, re, sys, unicodedata
from pathlib import Path

MATERIA = {'g1': 'Alienação fiduciária', 'g2': 'Ambiental', 'g3': 'Execução da OAB', 'g4': 'Execução fiscal',
           'g5': 'Cumprimento de sentença', 'g6': 'Previdenciário', 'g7': 'Tributário', 'g8': '28,86%',
           'g9': 'Concurso público', 'g10': 'Aduaneiro', 'g11': 'Contratos bancários', 'g12': 'Saúde'}


def nz(s):
    s = unicodedata.normalize('NFD', s or '')
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()


def segs(s):
    s = re.sub(r'\s+[—–-]\s+|;\s+|\s+›\s+', ' · ', (s or '').strip())
    return [x.strip(' .') for x in re.split(r'\s+·\s+', s) if x.strip(' .')]


def subassunto(texto, grupo=None):
    S = segs(texto)
    if not S:
        return ''
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
    return t if len(t) <= 30 else ''


def aplicar(it):
    C = (it.get('prontuario_triagem') or {}).get('cartao') or {}
    sub = subassunto(it.get('subassunto') or C.get('subassuntos'), it.get('grupo'))
    if not sub:
        return False
    esp = especificidades(it.get('especificidades') or C.get('especificidades') or it.get('peculiaridades'))
    novo_tc = ' · '.join(x for x in [classe(it.get('tipo_caso')), sub] if x)
    mudou = (it.get('subassunto'), it.get('especificidades'), it.get('tipo_caso')) != (sub, esp, novo_tc)
    if it.get('tipo_caso') and it.get('tipo_caso') != novo_tc and not (it.get('triagem') or {}).get('tipo_caso_anterior'):
        it.setdefault('triagem', {})['tipo_caso_anterior'] = it['tipo_caso']
    it['subassunto'], it['especificidades'], it['tipo_caso'] = sub, esp, novo_tc
    if C is not None and it.get('prontuario_triagem'):
        C['subassuntos'] = sub
        if esp:
            C['especificidades'] = esp
    return mudou


if __name__ == '__main__':
    arq = Path(sys.argv[1] if len(sys.argv) > 1 else 'acervo/lotes/adp-ai.json')
    L = json.loads(arq.read_text(encoding='utf-8'))
    n = sum(aplicar(it) for it in L.get('itens', []))
    arq.write_text(json.dumps(L, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{arq}: {n} item(ns) com subassunto/especificidades atualizados')
