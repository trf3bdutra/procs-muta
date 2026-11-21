"""Manual de redação (diretrizes_manual.html) em dia com apoio/diretrizes.json.

O manual é um documento diagramado à mão; o banco de redação é o que o editor do
Desembargador altera. No build, este módulo leva ao manual o que mudou no banco,
sem refazer o desenho:

- regra com título já no manual: Preferir e Evitar passam a ter o texto do banco
  (só quando o texto difere; as remissões do manual ficam quando nada mudou);
- regra com título novo: entra na seção onde moram as regras do mesmo grupo;
- termos (preferências sem título), conectivos e verbos ausentes: nova linha na
  tabela correspondente, com a contagem de linhas da legenda atualizada;
- o retrato JSON das verificações automáticas (alertas e correções) é renovado.

Retorna o HTML e um relatório curto do que foi alterado.
"""
import collections
import html
import json
import re
import unicodedata


def _nz(s):
    s = unicodedata.normalize('NFKD', html.unescape(re.sub(r'<[^>]+>', ' ', s or '')))
    s = s.encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'[^a-z0-9/§ ]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def _e(s):
    return html.escape(s or '', quote=False)


def _secao_de(H, pos):
    s = None
    for m in re.finditer(r'<div class="mn-sec" id="(mn-[^"]+)"', H):
        if m.start() > pos:
            break
        s = m.group(1)
    return s


def _fim_da_secao(H, sid):
    i = H.find('<div class="mn-sec" id="%s"' % sid)
    if i < 0:
        return -1
    prox = [p for p in (H.find('<div class="mn-sec" id="', i + 10), H.find('</section>', i)) if p >= 0]
    fim = min(prox)
    # a secao fecha com </div> logo antes do proximo bloco
    return H.rfind('</div>', i, fim)


def _linha_tabela(H, sid, linha, rot):
    """Acrescenta <tr> na tabela da seção sid e atualiza a legenda (N linhas)."""
    i = H.find('id="%s"' % sid)
    if i < 0:
        return H, False
    j = H.find('</tbody>', i)
    if j < 0:
        return H, False
    H = H[:j] + linha + H[j:]
    c = re.compile(r'<i>(\d+) linhas?</i>')
    m = c.search(H, i, j)
    if m:
        n = int(m.group(1)) + 1
        H = H[:m.start()] + '<i>%d linhas</i>' % n + H[m.end():]
    return H, True


def _celulas(H, sid, cls=None):
    i = H.find('id="%s"' % sid)
    j = H.find('</tbody>', i)
    if i < 0 or j < 0:
        return set()
    bloco = H[i:j]
    pad = r'<td class="%s">(.*?)</td>' % cls if cls else r'<tr><td>(.*?)</td>'
    out = set()
    for c in re.findall(pad, bloco, flags=re.S):
        c = re.sub(r'<div class="meta">.*?</div>', '', c, flags=re.S)
        for parte in re.split(r'·', html.unescape(re.sub(r'<[^>]+>', '', c))):
            k = _nz(parte)
            if k:
                out.add(k)
    return out


def sincroniza(H, diretrizes):
    reg = diretrizes.get('registros') or []
    rel = collections.Counter()

    # 1. regras com título (grupos A a G)
    grupo_sec = collections.defaultdict(collections.Counter)
    pref = [r for r in reg if r.get('tipo') == 'preferencia' and r.get('titulo')]
    for r in pref:
        p = H.find('<h4>' + _e(r['titulo']) + '</h4>')
        if p >= 0:
            grupo_sec[r.get('grupo') or ''][_secao_de(H, p)] += 1
    for r in pref:
        h4 = '<h4>' + _e(r['titulo']) + '</h4>'
        p = H.find(h4)
        if p >= 0:
            fim = H.find('</div>', p)
            corpo = H[p + len(h4):fim]
            for rot, cls, campo in (('Preferir', 'ok', 'preferir'), ('Evitar', 'no', 'evitar')):
                novo = (r.get(campo) or '').strip()
                pad = re.compile(r'<p><span class="xlb %s">%s</span>(.*?)</p>' % (cls, rot), re.S)
                m = pad.search(corpo)
                if m and _nz(m.group(1)) == _nz(novo):
                    continue
                if m and novo:
                    corpo = corpo[:m.start(1)] + _e(novo) + corpo[m.end(1):]
                elif m and not novo:
                    corpo = corpo[:m.start()] + corpo[m.end():]
                elif novo:
                    para = '<p><span class="xlb %s">%s</span>%s</p>' % (cls, rot, _e(novo))
                    if cls == 'ok':
                        corpo = para + corpo
                    else:
                        corpo = corpo + para
                else:
                    continue
                rel['regras atualizadas'] += 1
            H = H[:p + len(h4)] + corpo + H[fim:]
            continue
        # regra nova: vai para a seção do seu grupo
        cand = grupo_sec.get(r.get('grupo') or '')
        sid = cand.most_common(1)[0][0] if cand else None
        if not sid:
            rel['regras sem lugar'] += 1
            continue
        fim = _fim_da_secao(H, sid)
        if fim < 0:
            rel['regras sem lugar'] += 1
            continue
        nums = re.findall(r'<span class="rn"[^>]*>([0-9A-Z]+)\.(\d+)([a-z]?)</span>', H[H.find('id="%s"' % sid):fim])
        rn = ''
        if nums:
            cap, n, suf = nums[-1]
            usados = set(re.findall(r'<span class="rn"[^>]*>(%s\.\d+[a-z]?)</span>' % re.escape(cap), H))
            prox = '%s.%02d' % (cap, int(n) + 1)
            if prox in usados:
                for letra in 'abcdefghij':
                    prox = '%s.%s%s' % (cap, n, letra)
                    if prox not in usados:
                        break
            rn = '<span class="rn" title="Número da regra neste capítulo">%s</span>' % prox
        div = ('<div class="mn-r">' + rn + '<h4>' + _e(r['titulo']) + '</h4>' +
               ('<p><span class="xlb ok">Preferir</span>' + _e(r['preferir']) + '</p>' if r.get('preferir') else '') +
               ('<p><span class="xlb no">Evitar</span>' + _e(r['evitar']) + '</p>' if r.get('evitar') else '') + '</div>')
        H = H[:fim] + div + H[fim:]
        rel['regras novas'] += 1

    # 2. termos (preferências sem título)
    tem = _celulas(H, 'mn-vocabulario-0', 'tok') | _celulas(H, 'mn-grafias-0', 'tok')
    evi = _celulas(H, 'mn-vocabulario-0', 'tno') | _celulas(H, 'mn-grafias-0', 'tno')
    partes = lambda t: [_nz(x) for x in re.split(r'\s/\s|·', t or '') if _nz(x)]
    for r in reg:
        if r.get('tipo') == 'preferencia' and not r.get('titulo') and r.get('preferir'):
            if _nz(r['preferir']) in tem or all(x in tem for x in partes(r['preferir'])) or (r.get('evitar') and all(x in evi for x in partes(r['evitar']))):
                continue
            linha = '<tr><td class="tok">%s</td><td class="tno">%s</td><td>%s</td></tr>' % (_e(r['preferir']), _e(r.get('evitar')), _e(r.get('observacao')))
            H, ok = _linha_tabela(H, 'mn-vocabulario-0', linha, 'Termos')
            if ok:
                tem.add(_nz(r['preferir']))
                rel['termos novos'] += 1

    # 3. conectivos e verbos
    tem = _celulas(H, 'mn-vocabulario-1')
    for r in reg:
        if r.get('tipo') == 'conectivo' and r.get('expressao') and _nz(r['expressao']) not in tem:
            linha = '<tr><td><b>%s</b></td><td>%s</td></tr>' % (_e(r['expressao'].rstrip(' ,:')), _e(r.get('funcao')))
            H, ok = _linha_tabela(H, 'mn-vocabulario-1', linha, 'Conectivos')
            if ok:
                tem.add(_nz(r['expressao']))
                rel['conectivos novos'] += 1
    tem = _celulas(H, 'mn-vocabulario-2')
    for r in reg:
        if r.get('tipo') == 'verbo' and r.get('verbo') and _nz(r['verbo']) not in tem:
            linha = '<tr><td><b>%s</b></td><td>%s</td></tr>' % (_e(r['verbo']), _e(' · '.join(x for x in (r.get('construcao'), r.get('emprego')) if x)))
            H, ok = _linha_tabela(H, 'mn-vocabulario-2', linha, 'Verbos')
            if ok:
                tem.add(_nz(r['verbo']))
                rel['verbos novos'] += 1

    # 4. retrato das verificações automáticas
    m = re.search(r'(<script type="application/json" id="verificacoes-automaticas">)(.*?)(</script>)', H, re.S)
    if m:
        try:
            snap = json.loads(m.group(2))
        except ValueError:
            snap = {}
        snap['origem'] = 'apoio/diretrizes.json (%s)' % (diretrizes.get('atualizadoEm') or '')
        al = [r for r in reg if r.get('tipo') == 'alerta']
        co = [r for r in reg if r.get('tipo') == 'correcao']
        if snap.get('alertas') != al or snap.get('correcoes') != co:
            rel['verificações renovadas'] += 1
        snap['alertas'] = al
        snap['correcoes'] = co
        txt = json.dumps(snap, ensure_ascii=False, indent=1).replace('</', '<\\/')
        H = H[:m.start(2)] + txt + H[m.end(2):]
    return H, dict(rel)


if __name__ == '__main__':
    import sys
    from pathlib import Path
    raiz = Path(__file__).resolve().parents[3]
    src = Path(__file__).with_name('diretrizes_manual.html')
    H, rel = sincroniza(src.read_text(encoding='utf-8'), json.loads((raiz / 'apoio/diretrizes.json').read_text(encoding='utf-8')))
    print(rel or 'manual em dia com as diretrizes')
    if '-w' in sys.argv:
        src.write_text(H, encoding='utf-8')
