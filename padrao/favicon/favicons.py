# -*- coding: utf-8 -*-
"""Favicons padronizados das aplicações do Gabinete CMT.

Uma só peça para todas as páginas: a marca do gabinete (os quatro traços do logo), em dourado,
sobre placa azul-petróleo com filete dourado. Uma barra na base, na cor da família, distingue
as abas abertas lado a lado:

    gabinete    cinza-azulado   Acórdãos, construtor, fluxograma, calendário, blocos e destinos
    office      azul            Ex Officio (/office, /equipe), lotes da equipe e da gestão
    relator     dourado         Painel do Desembargador (/cmt) e lotes do Relator (/cmt/lotes)
    abinitio    verde           Ab Initio (monitor, motor, triagem)
    compendium  violeta         Compendium e o editor

Cada página recebe um bloco entre marcas (<!-- favicon:cmt --> ... <!-- /favicon:cmt -->) com
o SVG e dois PNG embutidos (32 px e 180 px, este para a tela inicial do celular), sem arquivo
externo: vale em qualquer endereço em que a página for publicada. Rodar de novo substitui o bloco.
O Ex Officio e a página de lotes também atendem /cmt; ali o bloco troca para a versão do Relator.

Uso:  python3 padrao/favicon/favicons.py            (gera os blocos e atualiza as páginas)
      python3 padrao/favicon/favicons.py --amostra  (só a folha de amostra, em padrao/favicon/amostra.png)

Os geradores que regravam páginas usam os blocos desta pasta: scripts/construir.py (index.html)
e apoio/modus-operandi/fonte/template.html (Compendium e editor).
"""
import base64, re, sys, urllib.parse
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
AQUI = Path(__file__).resolve().parent

# marca do gabinete: os mesmos quatro traços usados no favicon do cmt-fluxograma e na estrela das páginas
MARCA = (
    "M349.96 304.90L349.96 287.14C349.96 280.71 344.75 275.50 338.33 275.50L319.34 275.50L327.63 283.46L336.49 283.46"
    "C342.58 283.46 347.51 288.40 347.51 294.49L347.51 302.55L349.96 304.90",
    "M352.41 233.85L352.41 251.61C352.41 258.04 357.62 263.25 364.05 263.25L383.04 263.25L374.74 255.29L365.89 255.29"
    "C359.80 255.29 354.86 250.35 354.86 244.26L354.86 236.20L352.41 233.85",
    "M349.96 261.41L349.96 243.65L341.39 251.88L341.39 259.58C341.39 266.00 336.18 271.21 329.75 271.21L321.25 271.21"
    "L319.34 273.05L338.33 273.05C344.75 273.05 349.96 267.84 349.96 261.41",
    "M352.41 277.34L352.41 295.10L360.99 286.87L360.99 279.18C360.99 272.75 366.20 267.54 372.63 267.54L381.12 267.54"
    "L383.04 265.70L364.05 265.70C357.62 265.70 352.41 270.91 352.41 277.34",
)
OURO = '#e6c27a'
FAMILIAS = {
    'gabinete':   ('Gabinete CMT', '#9fb6c4'),
    'office':     ('Ex Officio', '#4e9bcb'),
    'relator':    ('Painel do Desembargador', OURO),
    'abinitio':   ('Ab Initio', '#3fae84'),
    'compendium': ('Compendium', '#a58bec'),
}
# página → (família, família alternativa em /cmt)
PAGINAS = {
    'index.html': ('gabinete', None),
    'construtor.html': ('gabinete', None),
    'cmt-fluxograma.html': ('gabinete', None),
    'apoio/cmt-calendario.html': ('gabinete', None),
    'acervo/blocos-destinos.html': ('gabinete', None),
    'apoio/ex-officio/index.html': ('office', 'relator'),
    'apoio/ex-officio/lotes/index.html': ('compendium', None),
    'monitor/index.html': ('abinitio', None),
    'monitor/motor/index.html': ('abinitio', None),
    'monitor/triagem/index.html': ('abinitio', None),
    'apoio/modus-operandi/fonte/template.html': ('compendium', None),
    'apoio/modus-operandi/modus-operandi.html': ('compendium', None),
    'apoio/modus-operandi/modus-operandi-editor.html': ('compendium', None),
}


def svg(familia, cheio=False):
    """Placa 64×64. cheio=True: sem cantos arredondados (o iOS arredonda o ícone da tela inicial)."""
    nome, cor = FAMILIAS[familia]
    rx, rx2 = (0, 0) if cheio else (14, 12.5)
    tracos = ''.join("<path d='%s'/>" % d for d in MARCA)
    return (
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>"
        "<title>Gabinete CMT · %s</title>"
        "<defs><linearGradient id='p' x1='0' y1='0' x2='1' y2='1'>"
        "<stop offset='0' stop-color='#17506f'/><stop offset='1' stop-color='#0a2232'/></linearGradient></defs>"
        "<rect width='64' height='64' rx='%s' fill='url(#p)'/>"
        "<rect x='1.5' y='1.5' width='61' height='61' rx='%s' fill='none' stroke='%s' stroke-opacity='.4' stroke-width='1.2'/>"
        "<g transform='translate(32,29.5) scale(.53) translate(-351.19,-269.375)' fill='%s'>%s</g>"
        "<rect x='20' y='52.4' width='24' height='3.6' rx='1.8' fill='%s'/>"
        "</svg>"
    ) % (nome, rx, rx2, OURO, OURO, tracos, cor)


def uri_svg(s):
    return 'data:image/svg+xml,' + urllib.parse.quote(s, safe=" /:=',.()-")


def uri_png(s, lado):
    import cairosvg
    png = cairosvg.svg2png(bytestring=s.encode('utf-8'), output_width=lado, output_height=lado)
    return 'data:image/png;base64,' + base64.b64encode(png).decode('ascii')


def icones(familia):
    return {'svg': uri_svg(svg(familia)),
            'png': uri_png(svg(familia), 32),
            'apple': uri_png(svg(familia, cheio=True), 180)}


def bloco(familia, alternativa=None):
    i = icones(familia)
    a = icones(alternativa) if alternativa else None
    rel = lambda k: (' data-cmt-rel="%s"' % a[k]) if a else ''
    linhas = [
        '<!-- favicon:cmt · %s · gerado por padrao/favicon/favicons.py; não editar à mão -->' % familia,
        '<link rel="icon" type="image/svg+xml" href="%s"%s>' % (i['svg'], rel('svg')),
        '<link rel="icon" type="image/png" sizes="32x32" href="%s"%s>' % (i['png'], rel('png')),
        '<link rel="apple-touch-icon" sizes="180x180" href="%s"%s>' % (i['apple'], rel('apple')),
    ]
    if a:
        linhas.append("<script>/^\\/cmt(\\/|$)/.test(location.pathname)&&document.querySelectorAll('link[data-cmt-rel]')"
                      ".forEach(function(l){l.href=l.getAttribute('data-cmt-rel')})</script>")
    linhas.append('<!-- /favicon:cmt -->')
    return '\n'.join(linhas)


MARCAS = re.compile(r'\n?<!-- favicon:cmt\b.*?<!-- /favicon:cmt -->\n?', re.S)
ANTIGOS = re.compile(r'\n?[ \t]*<link\b[^>]*\brel=["\'][^"\']*\b(?:icon|apple-touch-icon)\b[^"\']*["\'][^>]*>', re.I)


def aplicar(texto, blk):
    """Põe o bloco no primeiro <head> do documento, retirando ícones anteriores só desse <head>."""
    m = re.search(r'<head(?:\s[^>]*)?>', texto, re.I)
    if not m or m.start() > 6000:
        raise ValueError('<head> do documento não encontrado no início do arquivo')
    fim = texto.find('</head>', m.end())
    if fim < 0:
        raise ValueError('</head> não encontrado')
    cab = ANTIGOS.sub('', MARCAS.sub('\n', texto[m.end():fim]))
    c = re.search(r'<meta\s+charset[^>]*>', cab, re.I)
    p = c.end() if c else 0
    cab = cab[:p] + '\n' + blk + '\n' + cab[p:].lstrip('\n')
    return texto[:m.end()] + cab + texto[fim:]


def amostra():
    """Folha com as cinco famílias em 16, 32, 64 e 180 px, sobre fundo claro e escuro."""
    import io, cairosvg
    from PIL import Image, ImageDraw
    tam = [16, 32, 64, 180]
    larg, alt = 60 + sum(t + 28 for t in tam) * 2, 70 + len(FAMILIAS) * 210
    img = Image.new('RGB', (larg, alt), '#f4f2ee')
    d = ImageDraw.Draw(img)
    d.rectangle([larg // 2, 0, larg, alt], fill='#1b1f24')
    for n, (fam, (nome, cor)) in enumerate(FAMILIAS.items()):
        y = 50 + n * 210
        d.text((24, y - 30), '%s  ·  %s' % (fam, nome), fill='#333')
        for lado, x0 in ((0, 24), (1, larg // 2 + 24)):
            x = x0
            for t in tam:
                png = cairosvg.svg2png(bytestring=svg(fam).encode(), output_width=t, output_height=t)
                ic = Image.open(io.BytesIO(png)).convert('RGBA')
                img.paste(ic, (x, y + (180 - t) // 2), ic)
                x += t + 28
    saida = AQUI / 'amostra.png'
    img.save(saida)
    return saida


def main():
    if '--amostra' in sys.argv:
        print(amostra())
        return
    for fam in FAMILIAS:
        (AQUI / ('bloco-%s.html' % fam)).write_text(bloco(fam) + '\n', encoding='utf-8')
        (AQUI / ('%s.svg' % fam)).write_text(svg(fam) + '\n', encoding='utf-8')
    for rel, (fam, alt) in PAGINAS.items():
        p = RAIZ / rel
        if not p.exists():
            print('ausente  ', rel)
            continue
        antes = p.read_text(encoding='utf-8')
        depois = aplicar(antes, bloco(fam, alt))
        if depois != antes:
            p.write_text(depois, encoding='utf-8')
        print('%-9s %-10s %s' % ('ok' if depois != antes else 'igual', fam + ('/' + alt if alt else ''), rel))
    print(amostra())


if __name__ == '__main__':
    main()
