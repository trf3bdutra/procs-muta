#!/usr/bin/env python3
"""Converte os campos das peças, modelos, parágrafos e moldes para a sintaxe do gabinete (21/11/2026):
   @apelido      campo automático (ficha do processo ou valor que a peça calcula)
   {{orientação}} campo manual; o texto de dentro diz o que escrever.

O que muda (só nos textos que a folha mostra; ementa de origem, fundamentação e demais metadados ficam como estão):
   [PREENCHER: x]  -> {{x}}          [PREENCHER] -> {{texto do caso}}
   [X] (marcador)  -> {{X}}          marcador = maiúsculas (ID, DATA, NOME DO AUTOR…) ou um dos marcadores das peças
   [PROCESSO] -> @processo   [resultado] -> @resultado   [dispositivo da ementa] -> @dispositivo_ementa
   [RAMO] -> @ramo   [CLASSE] -> @classe_ementa   [ASSUNTO] -> @assunto_ementa   [CONCLUSÃO] -> @conclusao
Não mexe em [VALIDAR …], em reticências ([…], …) nem em colchetes de citação (ex.: [sic], trechos entre colchetes em minúsculas).
Idempotente. Uso: python3 scripts/modelos/converter_campos.py [--aplicar]   (sem --aplicar, só o relatório)
"""
import json, pathlib, re, sys, collections
R = pathlib.Path(__file__).resolve().parents[2]
ARQ = [('apoio/modus-operandi/fonte/editorial_pecas.json', 2), ('modelos/modelos.json', 1), ('modelos/paragrafos.json', 1), ('modelos/matrizes-estruturais.json', 1)]
AUTO = {'PROCESSO': 'processo', 'resultado': 'resultado', 'dispositivo da ementa': 'dispositivo_ementa', 'RAMO': 'ramo',
        'CLASSE': 'classe_ementa', 'ASSUNTO': 'assunto_ementa', 'CONCLUSÃO': 'conclusao'}
# marcadores em minúsculas usados nas peças da Minuta-Matriz
PECAS = {'provimento / desprovimento', 'verbo nuclear', 'o autor / a autora', 'preliminar', 'da parte …', 'a agravante', 'motivo', '2º julgador', '3º julgador',
         'circunstâncias do caso, com ID’s e datas', 'pela parte …', 'dispositivos indicados', 'objeto da conclusão', 'fundamento do acórdão', 'erro material verificado',
         'correção', 'fundamento enfrentado', 'normas invocadas', 'não conheço d', 'a parte autora', 'a parte ré', 'ementa do acórdão embargado',
         'omissão / contradição / obscuridade'}
CONT = collections.Counter()


def marcador(x):
    x = x.strip()
    if x in AUTO or x in PECAS:
        return True
    letras = re.sub(r'[^A-Za-zÀ-ÿ]', '', x)
    return bool(letras) and letras == letras.upper() and len(letras) >= 1


def converte(s):
    if not isinstance(s, str) or '[' not in s:
        return s
    def pre(m):
        t = (m.group(1) or '').strip()
        CONT['[PREENCHER] -> {{}}'] += 1
        return '{{' + (t or 'texto do caso') + '}}'
    s = re.sub(r'\[PREENCHER(?::\s*([^\]\\"]*))?\]', pre, s)
    def col(m):
        x = m.group(1)
        if not marcador(x):
            CONT['mantido: [' + x.strip()[:40] + ']'] += 1
            return m.group(0)
        if x.strip() in AUTO:
            CONT['[' + x.strip() + '] -> @' + AUTO[x.strip()]] += 1
            return '@' + AUTO[x.strip()]
        CONT['[X] -> {{X}}'] += 1
        return '{{' + x.strip() + '}}'
    return re.sub(r'\[(?!VALIDAR)(?![.…\s]*\])([^\[\]<>\n"\\{}]{1,80})\]', col, s)


def campos_texto(arq, d):
    """Chama converte() só nos campos que a folha mostra como texto da peça."""
    if arq.endswith('editorial_pecas.json'):
        for p in d['pecas']:
            for e in p.get('elementos', []):
                e['f'] = converte(e.get('f'))
                for a in e.get('alts') or []:
                    a['f'] = converte(a.get('f'))
                    for sb in a.get('sub') or []:
                        sb['f'] = converte(sb.get('f'))
        return
    for r in d['registros']:
        for k in ('esqueletoModelo', 'paragrafosModelo', 'textoModelo', 'texto'):
            if k in r and isinstance(r[k], str):
                r[k] = converte(r[k])


if __name__ == '__main__':
    aplicar = '--aplicar' in sys.argv
    for arq, ind in ARQ:
        p = R / arq
        s = p.read_text(encoding='utf-8')
        d = json.loads(s)
        antes = sum(CONT.values())
        campos_texto(arq, d)
        novo = json.dumps(d, ensure_ascii=False, indent=ind) + '\n'
        mud = novo != s
        print(f'{arq}: {sum(CONT.values()) - antes} marcações vistas; {"muda" if mud else "sem mudança"}')
        if aplicar and mud:
            json.loads(novo)
            p.write_text(novo, encoding='utf-8')
    for k, v in CONT.most_common():
        print(f'  {v:5d}  {k}')
