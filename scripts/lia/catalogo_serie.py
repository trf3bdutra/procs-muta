"""Catálogo da série histórica do Relator (precedentes/jurisprudencia) para a LIA, a partir de um ano.

Uso: python3 scripts/lia/catalogo_serie.py [ANO_INICIAL=2018]
Gera em padrao/lia/serie/ (fora do Git, ver .gitignore):
  Catalogo_Precedentes_CMT_desde_AAAA_Indice.txt   todos os julgados, uma entrada curta cada (referência, resultado, início da ementa)
  Precedentes_CMT_AAAA.txt                          por ano: acórdãos com a ementa integral e o resultado; monocráticas com o resumo e o dispositivo
  Precedentes_CMT_desde_AAAA.zip                    os arquivos por ano, compactados
Fonte: Base de Jurisprudência do TRF-3 (coleções Acórdãos e Monocráticas), importada em precedentes/jurisprudencia."""
import gzip, json, re, sys, zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
J = RAIZ / 'precedentes/jurisprudencia'
OUT = RAIZ / 'padrao/lia/serie'
INI = sys.argv[1] if len(sys.argv) > 1 else '2018'
OUT.mkdir(parents=True, exist_ok=True)


def limpa(t):
    t = str(t or '').replace('\r', '')
    t = re.sub(r'^\s*E\s*M\s*E\s*N\s*T\s*A\s*', '', t)
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\n\s*\n+', '\n', t)
    return t.strip()


def um(t):
    return re.sub(r'\s+', ' ', str(t or '')).strip()


def br(iso):
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', str(iso or ''))
    return '%s/%s/%s' % (m.group(3), m.group(2), m.group(1)) if m else ''


def ref(r, mono):
    cl = r.get('classe_sigla') or ''
    d = r.get('data_decisao_iso') if mono else r.get('data_julgamento_iso')
    pub = ' '.join(x for x in [um(r.get('publicacao_veiculo')) if str(r.get('publicacao_veiculo')) != 'None' else '', r.get('data_publicacao') or ''] if x)
    rel = 'Rel. Des. Fed. CARLOS MUTA' + (' (relator para o acórdão)' if 'acórdão' in str(r.get('atuacao_muta') or '') else '')
    org = um(r.get('orgao_julgador')) if str(r.get('orgao_julgador')) != 'None' else ''
    return '%s%s %s, %s%s, %s %s%s' % ('Decisão monocrática · ' if mono else '', cl, r.get('numero_processo') or '', rel, (', ' + org) if org else '',
                                     'decisão' if mono else 'julgamento', br(d), (', publicação ' + pub) if pub else '')


IDX = {x['id']: x for x in json.load(gzip.open(J / 'indice.json.gz'))}
anos = {}
for tipo, mono in (('acordaos', False), ('monocraticas', True)):
    for f in sorted((J / tipo).glob('*.json.gz')):
        ano = f.name[:4]
        if ano < INI:
            continue
        for r in json.load(gzip.open(f))['registros']:
            anos.setdefault(ano, []).append((mono, r))

indice, arqs = [], []
for ano in sorted(anos):
    R = sorted(anos[ano], key=lambda x: (x[1].get('data_decisao_iso') if x[0] else x[1].get('data_julgamento_iso')) or '')
    L = ['PRECEDENTES DO RELATOR (Des. Fed. CARLOS MUTA) · %s · %d julgados (%d acórdãos, %d decisões monocráticas)' % (
        ano, len(R), sum(1 for m, _ in R if not m), sum(1 for m, _ in R if m)),
        'Fonte: Base de Jurisprudência do TRF-3, importada no procs-muta (precedentes/jurisprudencia). Cite pela referência; confira no PJe antes de transcrever.', '']
    for mono, r in R:
        rf = ref(r, mono)
        ix = IDX.get(r.get('id')) or {}
        if mono:
            res = um(r.get('dispositivo'))
            corpo = um(ix.get('e'))
            L += ['◆ ' + rf] + (['  Resumo: ' + corpo] if corpo else []) + (['  Dispositivo: ' + res] if res else []) + ['']
            indice.append('◆ %s\n  %s%s' % (rf, ('Resumo: ' + corpo[:260]) if corpo else '', ('\n  Dispositivo: ' + res[:220]) if res else ''))
        else:
            em = limpa(r.get('ementa'))
            res = um(r.get('resultado_colegiado')).strip('"')
            L += ['◆ ' + rf, em, ('Resultado: ' + res) if res else '', '']
            indice.append('◆ %s\n  %s%s' % (rf, um(em)[:300] + ('…' if len(um(em)) > 300 else ''), ('\n  Resultado: ' + res[:200]) if res else ''))
    p = OUT / ('Precedentes_CMT_%s.txt' % ano)
    p.write_text('\n'.join(x for x in L if x is not None) + '\n', encoding='utf-8')
    arqs.append(p)
    print('ok', p.name, len(R), p.stat().st_size // 1024, 'KB')

n = sum(len(v) for v in anos.values())
cab = ['CATÁLOGO DE PRECEDENTES DO RELATOR (Des. Fed. CARLOS MUTA) desde %s — %d julgados' % (INI, n),
       'Uma entrada por julgado: referência, início da ementa (acórdãos) ou resumo (monocráticas) e resultado. Ementa integral nos arquivos Precedentes_CMT_AAAA.',
       'Contagem por ano: ' + ' · '.join('%s: %d' % (a, len(anos[a])) for a in sorted(anos)),
       'Atenção: 2018, 2019, 2024 e 2025 têm poucos registros na coleta do TRF-3 (lacuna da base, não da produção) [VALIDAR].', '']
pi = OUT / ('Catalogo_Precedentes_CMT_desde_%s_Indice.txt' % INI)
pi.write_text('\n'.join(cab + indice) + '\n', encoding='utf-8')
print('ok', pi.name, n, pi.stat().st_size // 1024, 'KB')
pz = OUT / ('Precedentes_CMT_desde_%s.zip' % INI)
with zipfile.ZipFile(pz, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in arqs + [pi]:
        z.write(p, p.name)
print('ok', pz.name, pz.stat().st_size // 1024, 'KB')
