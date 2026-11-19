#!/usr/bin/env python3
"""Pacote de dados da extensão Muta (comparativos e conformidade), publicado em /extensao/dados/base.json.gz.

Junta, já montados em texto, os materiais com que a extensão compara o editor do PJe e as regras da conformidade:
  modelos/modelos.json               modelos do banco (texto por tópico, na ordem do esqueleto)
  modelos/matrizes-estruturais.json  minutas-matriz por recurso e resultado (texto padrão de cada tópico)
  modelos/matrizes-2886.json         matriz modular do 28,86%: minuta-base de cada grupo (relatório, voto e ementa)
  modelos/kit-2886/*.txt             acórdãos-modelo do 28,86% na íntegra
  modelos/paragrafos.json            parágrafos-padrão do gabinete
  apoio/diretrizes.json              alertas e correções de redação do Compendium (expressões regulares)
  apoio/vade-mecum.json              Diretrizes do Manual CMT (regras, preferências e alertas)
O mesmo conteúdo já é público no Compendium (/amicus/compendium/); aqui vai só o que a extensão usa.

Uso: python3 scripts/extensao/dados.py --saida site/public/extensao/dados
"""
import argparse, gzip, json, re, pathlib, datetime

RAIZ = pathlib.Path(__file__).resolve().parents[2]
ler = lambda p: json.loads((RAIZ / p).read_text(encoding='utf-8'))


def js(v):
    if isinstance(v, str):
        try:
            return json.loads(v)
        except Exception:
            return None
    return v


def paragrafos(t):
    return [p.strip() for p in re.split(r'\n\s*\n|\n', str(t or '')) if p.strip()]


def secoes_de(reg):
    """Texto de um modelo ou matriz por tópico: o texto do esqueleto e os parágrafos do tópico (primeira versão de cada ordem)."""
    esq = js(reg.get('esqueletoModelo')) or {}
    pars = js(reg.get('paragrafosModelo')) or []
    out = []
    topicos = esq.get('_topicos') or []
    vistos = set()
    for t in topicos:
        tid = t.get('id')
        vistos.add(tid)
        bloco = esq.get(tid) or {}
        ps = paragrafos(bloco.get('texto')) if bloco.get('ativo', True) else []
        por_ordem = {}
        for p in pars:
            if p.get('posicao') == tid:
                por_ordem.setdefault(p.get('ordem') or 0, []).append(p)
        alt = 0
        for k in sorted(por_ordem, key=lambda x: (str(type(x)), x)):
            vs = sorted(por_ordem[k], key=lambda p: str(p.get('versao')))
            alt += len(vs) - 1
            ps += paragrafos(vs[0].get('texto'))
        if ps:
            out.append({'t': t.get('titulo') or tid, 'ps': ps, **({'alt': alt} if alt else {})})
    return out


def modelos():
    out = []
    for r in ler('modelos/modelos.json')['registros']:
        sec = secoes_de(r)
        if not sec:
            continue
        out.append({'id': r['id'], 'nome': r.get('nomeModelo') or r.get('processo') or r['id'], 'pron': r.get('pronunciamento', ''),
                    'classe': r.get('classeSigla') or r.get('classe', ''), 'assunto': r.get('assunto', ''), 'resultado': (r.get('resultado') or '')[:200],
                    'tags': r.get('especificidadesTags', ''), 'secoes': sec})
    return out


def matrizes():
    out = []
    for r in ler('modelos/matrizes-estruturais.json')['registros']:
        sec = secoes_de(r)
        if sec:
            out.append({'id': r['id'], 'nome': r.get('nomeModelo') or r['id'], 'classe': r.get('classeSigla') or r.get('classe', ''),
                        'resultado': r.get('resultado', ''), 'pron': r.get('pronunciamento', ''), 'secoes': sec})
    return out


def m2886():
    d = ler('modelos/matrizes-2886.json')
    mods = {m['id']: m for m in d['modulos']}

    def versao(mid, gid):
        m = mods.get(mid)
        if not m or not m.get('versoes'):
            return []
        vs = m['versoes']
        v = next((x for x in vs if re.search(r'\bgrupo\s+' + re.escape(gid) + r'\b', x.get('rotulo', ''))), vs[0])
        return list(v.get('paragrafos') or [])

    grupos = []
    for g in d['grupos']:
        voto = []
        for it in g.get('receita') or []:
            if 'umDe' in it:
                mid = next((x for x in it['umDe'] if x), '')
                if mid:
                    voto += versao(mid, g['id'])
            elif not it.get('opcional') or it.get('padrao'):
                voto += versao(it['mod'], g['id'])
        voto += [g.get('dispositivo', ''), 'É como voto.']
        rel = list((g.get('relatorio') or {}).get('paragrafos') or [])
        mpf = (g.get('relatorio') or {}).get('mpf') or []
        if mpf:
            rel.append(mpf[0])
        rel.append('É o relatório.')
        em = (d.get('ementas') or {}).get((g.get('modelosEmenta') or [''])[0]) or {}
        grupos.append({'id': g['id'], 'nome': g.get('nome', ''), 'resJulg': g.get('resJulg', ''), 'acordao': g.get('acordao', ''),
                       'secoes': [{'t': 'Relatório', 'ps': [p for p in rel if p]}, {'t': 'Voto', 'ps': [p for p in voto if p]},
                                  {'t': 'Ementa', 'ps': list(em.get('linhas') or [])}]})
    return {'materia': d.get('materia', ''), 'regras': d.get('regras', []), 'grupos': grupos}


def kit2886():
    out = []
    for f in sorted((RAIZ / 'modelos/kit-2886').glob('2886-*.txt')):
        t = f.read_text(encoding='utf-8')
        ref = next((l for l in t.split('\n') if l.startswith('Referência:')), '').replace('Referência: ', '')
        i = t.find('\nRELATÓRIO\n')
        out.append({'codigo': f.name.split('_')[0], 'ref': ref, 'texto': t[i + 1:] if i >= 0 else t})
    return out


def paragrafos_padrao():
    return [{'id': r['id'], 'cat': r.get('categoria', ''), 'titulo': r.get('titulo', ''), 'texto': r.get('texto', '')}
            for r in ler('modelos/paragrafos.json')['registros'] if (r.get('texto') or '').strip()]


def diretrizes():
    out = []
    for r in ler('apoio/diretrizes.json')['registros']:
        if r.get('tipo') in ('alerta', 'correcao') and r.get('padrao'):
            out.append({'id': r['id'], 'tipo': r['tipo'], 'escopo': r.get('escopo', ''), 'padrao': r['padrao'], 'flags': r.get('flags', ''),
                        'msg': r.get('mensagem', ''), 'subst': r.get('substituir')})
    return out


def manual():
    out = []
    for r in ler('apoio/vade-mecum.json').get('Diretrizes', []):
        if r.get('Status', 'Vigente') != 'Vigente':
            continue
        out.append({'id': r.get('Código', ''), 'tipo': r.get('Tipo', ''), 'cap': r.get('Capítulo', ''), 'titulo': r.get('Título', ''),
                    'orientacao': r.get('Orientação', ''), 'evitar': r.get('Evitar', ''), 'padrao': r.get('Padrão de busca', ''), 'flags': r.get('Flags', '')})
    return out


def pacote():
    return {'schema': 'muta.extensao.dados', 'versao': 1, 'geradoEm': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
            'modelos': modelos(), 'matrizes': matrizes(), 'm2886': m2886(), 'kit2886': kit2886(), 'paragrafos': paragrafos_padrao(),
            'diretrizes': diretrizes(), 'manual': manual()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--saida', default='site/public/extensao/dados')
    a = ap.parse_args()
    p = pacote()
    # as expressões regulares precisam valer no JavaScript (o motor da conformidade roda no navegador)
    for r in p['diretrizes'] + [x for x in p['manual'] if x['padrao']]:
        re.compile(r['padrao'])
    destino = pathlib.Path(a.saida)
    destino.mkdir(parents=True, exist_ok=True)
    bruto = json.dumps(p, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    (destino / 'base.json.gz').write_bytes(gzip.compress(bruto, 9, mtime=0))
    print(f"ok {destino/'base.json.gz'} · {len(bruto)//1024} KB · {len(p['modelos'])} modelos, {len(p['matrizes'])} matrizes, "
          f"{len(p['m2886']['grupos'])} grupos do 28,86%, {len(p['kit2886'])} acórdãos-modelo, {len(p['paragrafos'])} parágrafos, "
          f"{len(p['diretrizes'])} regras de redação, {len(p['manual'])} diretrizes do Manual")


if __name__ == '__main__':
    main()
