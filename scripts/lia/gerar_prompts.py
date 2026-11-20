"""Prompts da LIA (padrao/lia/), a partir do Prompt_Minuta_CMT_v3 e da base do gabinete.

Gera:
  Prompt_Gerar_CMT.txt              prompt único e enxuto: (1) preencher o prontuário, (2) escolher modelo,
                                    parágrafos-padrão e precedentes no material anexado, (3) redigir pelas regras
                                    de redação do gabinete. Sem a planilha de conferência nem o modelo HTML.
  Catalogo_Paragrafos_Padrao_CMT.txt  parágrafos-padrão (modelos/paragrafos.json), por categoria
  Catalogo_Modelos_CMT.txt          modelos do banco (modelos/modelos.json): nome, assunto, tese, resultado
  Catalogo_Precedentes_CMT_*.txt    precedentes do relator, em dois arquivos (previdenciário; demais matérias) (precedentes/precedentes.jsonl): referência, assunto, resultado, tese
O Compendium (aba Consulta) monta a versão do caso: o mesmo prompt com o prontuário, o modelo aplicado,
os precedentes e os parágrafos escolhidos pela busca. Idempotente."""
import json, re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
LIA = RAIZ / 'padrao/lia'
V3 = (LIA / 'Prompt_Minuta_CMT_v3.txt').read_text(encoding='utf-8')
CAMPOS = json.loads((LIA / 'campos-prontuario.json').read_text(encoding='utf-8'))


def secoes(txt):
    L = txt.split('\n')
    ix = [i for i, x in enumerate(L) if re.match(r'^══ [A-Z0-9]+\.', x)]
    S = {}
    for n, i in enumerate(ix):
        k = re.match(r'^══ ([A-Z0-9]+)\.', L[i]).group(1)
        S[k] = '\n'.join(L[i:(ix[n + 1] if n + 1 < len(ix) else len(L))]).rstrip()
    return S


S = secoes(V3)
# regras de redação pertinentes à geração: limites, construção, citação, vocabulário, grafias, forma, fidelidade,
# lista de caça, relatório, voto (fórmulas, preliminares), ementa, rodapé, padrões do acervo, proclamação,
# tensões, anexo por matéria e controle de qualidade. Fora: roteiro de conferência (RT) e saída HTML (S).
REGRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'R1', 'R2', 'R3', 'V', 'W', 'PR', 'M', 'N', 'M2', 'P', 'T', 'X', 'Q']
for k in REGRAS:
    assert k in S, k


def lista_campos(mono):
    def um(e):
        t = e[2]
        v = ('uma destas opções, exatamente: ' + ' | '.join('"%s"' % o for o in e[3])) if t == 'opcao' else \
            'data AAAA-MM-DD' if t == 'data' else 'true ou false' if t == 'sim_nao' else 'número' if t == 'numero' else 'texto'
        return '- %s — %s (%s)' % (e[0][2:], e[1], v)
    L = [um(e) for e in CAMPOS['mono' if mono else 'pauta']]
    if not mono:
        R = CAMPOS['recursos']
        L.append('- recursos — lista [{"parte","tipo","id","contra"}]; parte: %s; tipo: %s; contra (contrarrazões): %s'
                 % (' | '.join(R['parte']), ' | '.join(R['tipo']), ' | '.join(R['contra'])))
        L.append('- pecas — lista [{"desc","id","data"}] de outras peças relevantes')
    L.append('- pendencias — lista de providências que impedem ou atrasam o julgamento (intimar para contrarrazões, aguardar parecer, juntar mídia, conferir prevenção ou conexão, regularizar representação…)')
    return '\n'.join(L)


CAB = """PROMPT DO GABINETE CMT — PRONTUÁRIO, PESQUISA E MINUTA (LIA)
Gabinete do Desembargador Federal CARLOS MUTA · Turma Regional de Mato Grosso do Sul · TRF-3. Responda em português do Brasil.
Use com o processo aberto no PJe (inteiro teor). Trabalhe nas quatro etapas abaixo, nesta ordem, e entregue a SAÍDA no fim.

TAREFA (preencha ao colar; sem resultado, proponha um e marque [VALIDAR: resultado]):
- Peça: acórdão completo (ementa, relatório, voto e proclamação) | relatório | voto | ementa | proclamação | decisão monocrática | despacho
- Resultado pretendido: …

ETAPA 1 · PRONTUÁRIO
Leia os autos e preencha o prontuário de produção. Use só o que está nos autos; sem base, deixe o campo de fora. Para cada campo preenchido, indique a fonte (ID e tipo da peça). Campos de opção: copie exatamente uma das opções. Textos: direto, impessoal, uma ideia por frase.
Campos — acórdão (pauta de julgamento):
{CAMPOS_PAUTA}
Campos — decisão monocrática:
{CAMPOS_MONO}

ETAPA 2 · PESQUISA NO MATERIAL DO GABINETE
Use o MATERIAL DO GABINETE colado ao fim deste prompt (gerado pelo Compendium para este processo) ou os catálogos anexados (Catalogo_Modelos_CMT, Catalogo_Paragrafos_Padrao_CMT e o Catalogo_Precedentes_CMT da matéria).
1. Modelo: escolha o modelo do banco cuja matéria, tese e espécie recursal coincidem com o caso (assunto, assunto detalhado, tipo de caso, especificidades e questões do prontuário). Sem modelo aderente, use a estrutura da Minuta-Matriz da espécie (seções R2, W e PR). Diga qual escolheu e por quê, em uma linha.
2. Parágrafos-padrão: selecione os que se aplicam (admissibilidade, preliminares, mérito, honorários, consectários, dispositivo). Preencha os campos entre { } e [ ] com os dados destes autos; não altere o texto fixo.
3. Precedentes: cite só os do material ou dos catálogos, com a referência como está lá, na forma da seção C, depois do raciocínio. Não cite precedente de memória; se for indispensável, marque [VALIDAR: precedente].
4. Nada do modelo, dos parágrafos ou dos precedentes vale como fato deste processo. O resultado do modelo não vincula o resultado deste caso.

ETAPA 3 · REDAÇÃO
Redija a peça pedida pelas REGRAS DE REDAÇÃO DO GABINETE abaixo (seções A a Q), com os dados do prontuário (Etapa 1) e o material escolhido (Etapa 2). Tudo o que não constar dos autos vira [VALIDAR: motivo]. No acórdão, a ordem é EMENTA → RELATÓRIO → VOTO → PROCLAMAÇÃO; a proclamação espelha o dispositivo do voto (seção P).

ETAPA 4 · CONFERÊNCIA FINAL
Antes de entregar: (1) cada ID citado existe e corresponde à peça; (2) dispositivo do voto, item IV da ementa e proclamação dizem o mesmo; (3) lista de caça (seção H) e controle de qualidade (seção Q) aplicados; (4) nenhum [PREENCHER] restou.

SAÍDA (nesta ordem, sem comentário fora dos blocos)
1. Bloco do prontuário, exatamente neste formato (o Ex Officio lê este bloco no botão LIA do prontuário):
<<<PRONTUARIO_CMT
{"processo":"NNNNNNN-DD.AAAA.J.TR.OOOO","campos":{"chave":"valor"},"recursos":[],"pecas":[],"pendencias":[],"fontes":{"chave":"ID … – peça"},"validar":["ponto a conferir"]}
PRONTUARIO_CMT>>>
2. Material usado: modelo (ou Minuta-Matriz), parágrafos-padrão e precedentes, um por linha.
3. A peça, pronta para colar no PJe, cada parte sob seu título (EMENTA, RELATÓRIO, VOTO, PROCLAMAÇÃO; ou DECISÃO / DESPACHO). Negrito com **…**, itálico com *…*. Sem comentários dentro do texto, salvo [VALIDAR: …].
4. Pendências: cada [VALIDAR] com o motivo.

══════════════════════════════
REGRAS DE REDAÇÃO DO GABINETE (Prompt_Minuta_CMT v3, sem a planilha de conferência e sem o modelo HTML)
══════════════════════════════
"""


def prompt_gerar():
    t = CAB.replace('{CAMPOS_PAUTA}', lista_campos(False)).replace('{CAMPOS_MONO}', lista_campos(True))
    return t + '\n\n'.join(S[k] for k in REGRAS) + '\n\n══════════════════════════════\nMATERIAL DO GABINETE (colado pelo Compendium para este processo; se vazio, use os catálogos anexados)\n══════════════════════════════\n'


def limpa(v):
    return re.sub(r'\s+', ' ', str(v or '')).strip()


def cat_paragrafos():
    P = json.loads((RAIZ / 'modelos/paragrafos.json').read_text(encoding='utf-8'))['registros']
    P = sorted(P, key=lambda p: (p.get('categoria') or '', p.get('titulo') or ''))
    out, cat = ['CATÁLOGO DE PARÁGRAFOS-PADRÃO DO GABINETE CMT (modelos/paragrafos.json) — %d parágrafos' % len(P),
                'Campos entre { } e [ ] se preenchem com os dados dos autos; o texto fixo não se altera.', ''], None
    for p in P:
        if p.get('categoria') != cat:
            cat = p.get('categoria'); out += ['', '■ ' + (cat or 'Sem categoria')]
        out.append('◆ [%s] %s%s' % (p.get('id'), limpa(p.get('titulo')), (' · uso: ' + limpa(p.get('uso'))) if p.get('uso') else ''))
        out.append(str(p.get('texto') or '').strip())
    return '\n'.join(out) + '\n'


def cat_modelos():
    M = json.loads((RAIZ / 'modelos/modelos.json').read_text(encoding='utf-8'))['registros']
    M = sorted(M, key=lambda m: (m.get('assunto') or '', m.get('nomeModelo') or ''))
    out = ['CATÁLOGO DE MODELOS DO GABINETE CMT (modelos/modelos.json) — %d modelos' % len(M),
           'O texto integral de cada modelo vem no MATERIAL DO GABINETE quando o Compendium o escolhe para o caso.', '']
    for m in M:
        out.append('◆ [%s] %s' % (m.get('id'), limpa(m.get('nomeModelo') or m.get('processo'))))
        for rot, k in [('Espécie', 'classeSigla'), ('Assunto', 'assunto'), ('Tese', 'tese'), ('Especificidades', 'especificidadesTags'), ('Resultado', 'resultado')]:
            v = m.get(k)
            if isinstance(v, list): v = '; '.join(map(str, v))
            v = limpa(v)
            if v: out.append('  %s: %s' % (rot, v[:400]))
    return '\n'.join(out) + '\n'


def grupo_prec(r):
    t = (r.get('ramoDireito') or '') + ' ' + (r.get('assunto') or '')
    if re.search(r'Previdenci|Assistencial|aposentad|benef[ií]cio|pens[aã]o|aux[ií]lio|LOAS|BPC', t, re.I): return 'Previdenciario'
    return 'Administrativo_Tributario_Outros'


def cat_precedentes():
    G = {}
    for ln in (RAIZ / 'precedentes/precedentes.jsonl').read_text(encoding='utf-8').splitlines():
        if not ln.strip(): continue
        r = json.loads(ln)
        cur = r.get('curadoria') if isinstance(r.get('curadoria'), dict) else {}
        dt = r.get('dataPublicacao') or r.get('dataJulgamento') or ''
        ref = '%s %s, Rel. Des. Fed. %s, %s %s' % (r.get('classeSigla') or r.get('especie') or '', r.get('processo') or '', r.get('relator') or 'CARLOS MUTA',
                                                ('publicação' if r.get('dataPublicacao') else 'julgamento'), '/'.join(reversed(str(dt).split('-'))))
        L = ['◆ ' + limpa(ref)]
        for rot, v, mx in [('Assunto', r.get('assunto'), 120), ('Resultado', r.get('resultado'), 120), ('Tese', cur.get('tese'), 260)]:
            v = limpa(v)
            if v: L.append('  %s: %s' % (rot, v[:mx]))
        G.setdefault(grupo_prec(r), []).append('\n'.join(L))
    out = []
    for g, L in sorted(G.items()):
        nome = {'Previdenciario': 'previdenciário e assistencial', 'Administrativo_Tributario_Outros': 'administrativo, tributário, civil e processual'}[g]
        out.append(('Catalogo_Precedentes_CMT_%s.txt' % g, '\n'.join(['CATÁLOGO DE PRECEDENTES DO RELATOR · %s (precedentes/precedentes.jsonl) — %d' % (nome, len(L)),
            'Cite com a referência como está aqui (seção C das regras). A ementa integral vem no MATERIAL DO GABINETE quando o Compendium escolhe o precedente.', ''] + L) + '\n'))
    return out


for nome, txt in [('Prompt_Gerar_CMT.txt', prompt_gerar()), ('Catalogo_Paragrafos_Padrao_CMT.txt', cat_paragrafos()),
                  ('Catalogo_Modelos_CMT.txt', cat_modelos())] + cat_precedentes():
    (LIA / nome).write_text(txt, encoding='utf-8')
    print('ok', nome, len(txt.encode()) // 1024, 'KB')
