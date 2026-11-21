# -*- coding: utf-8 -*-
"""Migra os dados para o vocabulário único (padrao/vocabulario.json).

- acervo/operacional.json (ficha do processo · seção triagem): Tempestividade, Preparo, Representação, Prelim.,
  Mídias, MPF - Custos Legis (hipótese de intervenção) e MPF (parecer).
  Os genéricos antigos ('Dispensado', 'Regular' com observação de dispensa, 'Sim' no custos legis) são resolvidos
  pelo recorrente (1º nome do polo ativo: ente público isento, a própria DPU, CEF ou conselho profissional), pelo
  advogado do polo ativo, pelo AJG, pela DPU e pelas observações; combinações impossíveis já gravadas ('Assistência da
  DPU' para ente público, CEF ou conselho) são corrigidas; havendo lote ou cartão da pauta com o valor específico da mesma classe,
  prevalece o específico.
- acervo/sessoes/*.json (cartões das pautas, ctl): tempest, preparo, repres, prelim, midias, mpf, parecer e papeis.
- acervo/lotes/*.json (Collectio, prontuario_triagem.ctl e cartao.papeis).

Valores que o vocabulário não reconhece ficam como estão (são listados no relatório). Pode rodar de novo: o que já
está no vocabulário não muda.
Uso: python3 scripts/vocabulario/migrar.py [--seco]
"""
import collections, glob, json, sys
from pathlib import Path

R = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(R / 'scripts'))
import vocabulario as V  # noqa: E402

SECO = '--seco' in sys.argv
dg = lambda s: ''.join(c for c in str(s or '') if c.isdigit())
FICHA = {f['ficha']: k for k, f in V.CAMPOS.items() if f.get('ficha')}
PRONT = [k for k in V.CAMPOS if V.CAMPOS[k].get('prontuario') == k]
GENERICOS = {'dispensado', 'regular', 'sim', 'sem parecer', 'isento (dpu/ente publico)', 'dispensada (proc. publico/dpu)'}
mud = collections.Counter(); desconhecidos = collections.Counter()


def carrega(p):
    return json.loads(Path(p).read_text(encoding='utf-8'))


def grava(p, d, indent):
    if not SECO:
        Path(p).write_text(json.dumps(d, ensure_ascii=False, indent=indent) + '\n', encoding='utf-8')


def norma(k, v, ctx=None):
    n = V.norm(k, v, ctx)
    if n and n not in V.lista(k):
        desconhecidos[(k, n)] += 1
    return n


def parte(fo, partes=None):
    """Recorrente (1º nome do polo ativo) e advogado particular do polo ativo, para resolver 'Dispensado' e afins."""
    rec = str(fo.get('polo_ativo') or '').split(' e outros')[0].split(';')[0].strip()
    if not rec and partes:
        rec = str(partes).split(' x ')[0].split(' X ')[0].strip()
    return {'recorrente': rec, 'advogado': fo.get('advogado_pa') or ''}


# 1. valores específicos já registrados nos lotes e nas pautas (para resolver os genéricos da ficha)
espec = {}
for p in glob.glob(str(R / 'acervo/lotes/*.json')):
    L = carrega(p); its = L.get('itens') or (L.get('lote') or {}).get('itens') or []
    for it in (its if isinstance(its, list) else list(its.values())):
        ctl = ((it.get('prontuario_triagem') or {}).get('ctl') or {})
        for k in PRONT:
            if ctl.get(k):
                espec.setdefault(dg(it.get('processo')), {})[k] = ctl[k]
for p in glob.glob(str(R / 'acervo/sessoes/*.json')):
    S = carrega(p)
    for it in S.get('itens', []) if isinstance(S, dict) else []:
        ctl = it.get('ctl') or {}
        for k in PRONT:
            if ctl.get(k) and k not in espec.get(dg(it.get('cnj')), {}):
                espec.setdefault(dg(it.get('cnj')), {})[k] = ctl[k]

# 2. ficha do processo (operacional)
FONTE = {dg(x.get('processo') or x.get('Processo')): x for x in carrega(R / 'acervo/fonte.json').get('registros', [])}
OBS_AUTO = 'Dispensada a procuração: representação por procurador público ou DPU.'
op_p = R / 'acervo/operacional.json'
OP = carrega(op_p); n_op = 0
for r in OP.get('registros', []):
    t = r.get('triagem') or {}
    if not t:
        continue
    if t.get('Observação da Representação') == OBS_AUTO:
        t['Observação da Representação'] = ''; mud['ficha · observação automática removida'] += 1
    fo = FONTE.get(dg(r.get('processo'))) or {}
    dpu = t.get('DPU (controle)') or fo.get('dpu')
    ctx = {'ajg': t.get('AJG'), 'dpu': dpu, 'obs': t.get('Observação da Representação'), **parte(fo)}
    antes = json.dumps(t, ensure_ascii=False, sort_keys=True)
    for chave, k in FICHA.items():
        v = t.get(chave)
        if not v or not isinstance(v, str):
            continue
        if k == 'mpf' and V.N(v) == 'sim':
            n = V.norm('mpf', t.get('Observação MPF') or '')
            n = n if n in V.lista('mpf') else 'Outra hipótese'
        else:
            n = norma(k, v, ctx)
        e = espec.get(dg(r.get('processo')), {}).get(k)
        e = V.norm(k, e, ctx) if e else e
        if e and e in V.lista(k) and V.N(v) in GENERICOS and V.classe(k, e) == V.classe(k, n):
            n = V.coerente(k, e, ctx)
        n = V.coerente(k, n, ctx)
        if n != v:
            t[chave] = n; mud['ficha · ' + chave] += 1
    if V.norm('preparo', t.get('Preparo')) == 'Justiça gratuita' and not t.get('AJG'):
        t['AJG'] = 'Sim'; mud['ficha · AJG'] += 1
    if json.dumps(t, ensure_ascii=False, sort_keys=True) != antes:
        n_op += 1
if n_op:
    grava(op_p, OP, 1)

# 3. cartões das pautas
n_ses = 0
for p in sorted(glob.glob(str(R / 'acervo/sessoes/*.json'))):
    S = carrega(p); alt = False
    for it in S.get('itens', []) if isinstance(S, dict) else []:
        ctl = it.get('ctl') or {}
        fo = FONTE.get(dg(it.get('cnj'))) or {}
        cx = {'dpu': fo.get('dpu'), **parte(fo, it.get('partes'))}
        for k in PRONT:
            v = ctl.get(k)
            if isinstance(v, str) and v:
                n = V.coerente(k, norma(k, v, cx), cx)
                if n != v:
                    ctl[k] = n; mud['pauta · ' + k] += 1; alt = True
        pap = (ctl.get('cartao') or {}).get('papeis')
        if isinstance(pap, list):
            novo = [V.norm('papel', x) if x else x for x in pap]
            if novo != pap:
                ctl['cartao']['papeis'] = novo; mud['pauta · papeis'] += 1; alt = True
    if alt:
        S['atualizadoEm'] = S.get('atualizadoEm')
        grava(p, S, 1); n_ses += 1

# 4. lotes do Collectio
n_lot = 0
for p in sorted(glob.glob(str(R / 'acervo/lotes/*.json'))):
    L = carrega(p); alt = False
    its = L.get('itens') or (L.get('lote') or {}).get('itens') or []
    for it in (its if isinstance(its, list) else list(its.values())):
        PT = it.get('prontuario_triagem') or {}
        ctl = PT.get('ctl') or {}
        fo = FONTE.get(dg(it.get('processo'))) or {}
        cx = {'dpu': fo.get('dpu'), **parte(fo, it.get('partes'))}
        for k in PRONT:
            v = ctl.get(k)
            if isinstance(v, str) and v:
                n = V.coerente(k, norma(k, v, cx), cx)
                if n != v:
                    ctl[k] = n; mud['lote · ' + k] += 1; alt = True
        pap = (PT.get('cartao') or {}).get('papeis')
        if isinstance(pap, list):
            novo = [V.norm('papel', x) if x else x for x in pap]
            if novo != pap:
                PT['cartao']['papeis'] = novo; mud['lote · papeis'] += 1; alt = True
    if alt:
        grava(p, L, 1); n_lot += 1

print(('[seco] ' if SECO else '') + f'vocabulário {V.D["versao"]}: ficha {n_op} processo(s), {n_ses} pauta(s), {n_lot} lote(s)')
for k, n in sorted(mud.items()):
    print(f'  {k}: {n}')
if desconhecidos:
    print('valores fora do vocabulário (mantidos):')
    for (k, v), n in desconhecidos.most_common(30):
        print(f'  {k} · {v!r}: {n}')
