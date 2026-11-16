"""Modo noturno da Minuta-Matriz, dos Modelos e das Diretrizes (seção #v-edit), gerado a partir de editorial_d.css.
editorial_d.css nasceu só claro, com cores fixas; aqui cada cor fixa vira a do tema escuro do Compendium
(variáveis --bg, --panel, --card, --field, --ink, --mut, --line), e as cores de destaque ganham uma versão clara.
O build.py chama escuro(css) e acrescenta o resultado logo depois de editorial_d.css: mexeu no claro, o escuro acompanha."""
import re, colorsys

PREFIXO = ':root:not([data-theme="light"]) '
PROPS = re.compile(r'^(color|background(-color|-image)?|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|box-shadow|text-decoration(-color)?|caret-color|fill|stroke|column-rule(-color)?|accent-color)$')
# cores da marca do Compendium: no escuro, as mesmas variáveis do resto da página
MARCA = {'#235a55': 'var(--evd)', '#173f3d': 'var(--evd)', '#1d4f49': 'var(--evd)', '#37786e': 'var(--evd)', '#805b18': 'var(--eoc)', '#a57829': 'var(--eoc)',
         '#9a3d2e': 'var(--crit)', '#5c430f': 'var(--eoc)'}
HEX = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')


def _rgb(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def _hex(r, g, b): return '#%02x%02x%02x' % tuple(max(0, min(255, round(x * 255))) for x in (r, g, b))


def _lum(r, g, b): return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _hsl(h, l, s): return _hex(*colorsys.hls_to_rgb(h, l, s))


def mapear(cor, papel):
    """papel: 'fundo', 'texto' ou 'borda'"""
    k = cor.lower()
    if papel != 'fundo' and k in MARCA: return MARCA[k]
    r, g, b = _rgb(cor); L = _lum(r, g, b); h, l, s = colorsys.rgb_to_hls(r, g, b); neutra = (max(r, g, b) - min(r, g, b)) < .11 or l > .95
    if papel == 'fundo':
        if neutra:
            if L > .96: return 'var(--card)'
            if L > .88: return 'var(--panel)'
            if L > .7: return 'var(--field)'
            if L > .45: return 'var(--line)'
            return cor
        if l > .8: return _hsl(h, .2, min(s, .45))          # tinta clara de destaque vira tinta escura do mesmo tom
        if l < .35: return _hsl(h, .32, min(s * 1.1, .6))   # fundo escuro de destaque (botão ligado) clareia um pouco
        return cor
    if papel == 'texto':
        if neutra:
            if L > .85: return cor                           # texto branco sobre botão escuro continua
            if L < .4: return 'var(--ink)'
            return 'var(--mut)'
        if l < .62: return _hsl(h, .72, min(s, .55))         # destaque escuro (verde, ouro, vermelho) ganha versão clara
        return cor
    # borda
    if neutra:
        if L > .5: return 'var(--line)'
        return 'var(--mut)'
    if l > .8: return _hsl(h, .3, min(s, .4))
    if l < .5: return _hsl(h, .62, min(s, .5))
    return cor


def _decls(corpo):
    out, i, d, ini, q = [], 0, 0, 0, None
    while i < len(corpo):
        c = corpo[i]
        if q:
            if c == '\\': i += 2; continue
            if c == q: q = None
        elif c in '"\'': q = c
        elif c == '(': d += 1
        elif c == ')': d -= 1
        elif c == ';' and d == 0: out.append(corpo[ini:i]); ini = i + 1
        i += 1
    out.append(corpo[ini:])
    return [x.strip() for x in out if x.strip()]


def _bloco(css, i):
    d = 1
    while i < len(css):
        if css[i] == '{': d += 1
        elif css[i] == '}':
            d -= 1
            if d == 0: return i
        i += 1
    raise ValueError('chave sem fechamento')


def _converte(css):
    out, i = [], 0
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    while i < len(css):
        j = css.find('{', i)
        if j < 0: break
        pre = css[i:j].strip(); fim = _bloco(css, j + 1); corpo = css[j + 1:fim]
        if pre.startswith('@'):
            if re.match(r'@(media|supports|container)\b', pre):
                dentro = _converte(corpo)
                if dentro: out.append(pre + '{' + dentro + '}')
        elif pre:
            novas = []
            for d in _decls(corpo):
                if ':' not in d: continue
                p, v = d.split(':', 1); p = p.strip().lower()
                if not PROPS.match(p) or not HEX.search(v): continue
                papel = 'texto' if p in ('color', 'caret-color', 'fill', 'text-decoration-color', 'text-decoration') else 'fundo' if p.startswith('background') or p == 'accent-color' else 'borda'
                if p == 'box-shadow': papel = 'borda'
                nv = HEX.sub(lambda m: mapear(m.group(0), papel), v)
                if nv != v: novas.append(p + ':' + nv.strip())
            if novas:
                sel = ','.join(PREFIXO + s.strip() for s in pre.split(',') if s.strip())
                out.append(sel + '{' + ';'.join(novas) + '}')
        i = fim + 1
    return '\n'.join(out)


def escuro(css):
    out = _converte(css).replace('body.dsk #v-edit{background:var(--card)}', 'body.dsk #v-edit{background:var(--bg)}')  # chão da seção = chão da página
    return '\n/* ===== modo noturno de #v-edit (gerado por escuro.py a partir de editorial_d.css) ===== */\n' + out + '\n'


if __name__ == '__main__':
    import pathlib, sys
    print(escuro((pathlib.Path(__file__).parent / 'editorial_d.css').read_text(encoding='utf-8')))
