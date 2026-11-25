#!/usr/bin/env python3
"""Apelidos dos campos da ficha (padrao/ficha.json) para os campos automáticos das peças e modelos: @apelido.

Cada campo da ficha ganha a propriedade "apelido" (curta, sem espaço e sem acento). A tela da ficha não mostra a propriedade;
quem a lê é o Compendium, que troca @apelido pelo valor do campo na ficha do processo aberto na Minuta-Matriz,
e o editor do Compendium, que abre a lista dos apelidos ao digitar @.
O mesmo campo (seção + chave) recebe sempre o mesmo apelido; se dois campos diferentes derem o mesmo apelido, o segundo leva a seção na frente.
Idempotente: rodar de novo não muda nada. Também é chamado ao fim de scripts/ficha/gerar_ficha.py.
Uso: python3 scripts/ficha/apelidos.py
"""
import json, pathlib, re, unicodedata
R = pathlib.Path(__file__).resolve().parents[2]
FICHA = R / 'padrao/ficha.json'
PARE = {'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'no', 'na', 'para', 'por', 'com'}
# apelidos escolhidos à mão para os campos mais citados nas peças
FIXOS = {
    ('', 'classe_judicial'): 'classe', ('', 'Assunto'): 'assunto', ('', 'Polo Ativo'): 'polo_ativo', ('', 'Polo Passivo'): 'polo_passivo',
    ('', 'advogado_pa'): 'advogado_polo_ativo', ('', 'advogado_pp'): 'advogado_polo_passivo', ('', 'Órgão Julgador'): 'orgao_julgador',
    ('', 'Seção'): 'secao', ('', 'data_distribuição'): 'data_distribuicao', ('', 'dt_distribuicao_1g'): 'data_distribuicao_1g',
    ('', '_etq'): 'etiquetas_pje', ('', 'valor_causa'): 'valor_causa', ('', 'Relator'): 'relator',
    ('origem', 'Origem - Juízo'): 'juizo_origem', ('origem', 'Origem - Julgador'): 'juiz_origem', ('origem', 'Origem - Valor da causa'): 'valor_causa_origem',
    ('triagem', 'Tema'): 'tipo_de_caso', ('triagem', 'MPF'): 'parecer_mpf', ('triagem', 'ID do Parecer MPF'): 'parecer_mpf_id',
    ('triagem', 'Parecer - Sentido'): 'parecer_sentido', ('triagem', 'MPF - Custos Legis'): 'mpf_custos_legis', ('triagem', 'ID da Procuração'): 'procuracao_id',
    ('producao', 'Voto - Resultado'): 'resultado_julgamento', ('producao', 'Voto - Honorários'): 'honorarios_julgamento', ('producao', 'Destino'): 'destino',
}
# nomes que o Compendium calcula na própria peça ou no caso: não podem ser apelido de campo da ficha
RESERVADOS = {'processo', 'ramo', 'recorrente', 'resultado', 'conclusao', 'dispositivo_ementa', 'abertura_relatorio', 'resultado_decisao_recorrida', 'comandos_dispositivos', 'frase_honorarios_origem', 'razoes_recursais', 'contrarrazoes_relatorio', 'parecer_relatorio', 'caso_em_exame', 'questao_em_discussao'}


def slug(s):
    s = unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode().lower()
    p = [w for w in re.split(r'[^a-z0-9]+', s) if w and w not in PARE]
    return '_'.join(p)


def campos(F):
    for a in F['abas']:
        for g in a.get('grupos', []):
            for c in g.get('campos', []):
                yield c
        if a.get('seletor'):
            yield a['seletor']


def aplicar(F):
    dono, usados = {}, set(RESERVADOS)
    for c in campos(F):
        k = (c.get('secao') or '', c['chave'])
        if k not in dono:
            ap = FIXOS.get(k) or slug(c['chave'].lstrip('_')) or 'campo'
            if ap in usados:
                ap = (k[0] or 'acervo') + '_' + ap
            n, base = 2, ap
            while ap in usados:
                ap, n = base + '_' + str(n), n + 1
            usados.add(ap)
            dono[k] = ap
        c['apelido'] = dono[k]
    return len(dono)


if __name__ == '__main__':
    F = json.loads(FICHA.read_text(encoding='utf-8'))
    n = aplicar(F)
    FICHA.write_text(json.dumps(F, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'padrao/ficha.json: {n} apelidos')
