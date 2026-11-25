"""Instala a identidade GAB.18810 na distribuição, sem alterar os dados dos apps."""
from pathlib import Path
import re
import shutil
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
VERSION = "20261125f"
FAMILIES = {
    "monitor": "caput", "caput": "caput", "office": "office",
    "equipe": "office", "exofficio": "office", "cmt": "office",
    "amicus": "amicus", "amicus/cortex": "amicus",
    "amicus/collectio": "collectio", "amicus/compendium": "compendium",
    "amicus/collegium": "collegium", "cognitio": "cognitio",
    "modus": "compendium", "compendio": "compendium", "editor": "compendium",
    "collegium": "collegium", "collectio": "collectio", "compendium": "compendium",
}
MARKS = re.compile(r"<!-- favicon:cmt\b.*?<!-- /favicon:cmt -->", re.S)
ICONS = re.compile(r"<link\b[^>]*\brel=[\"'][^\"']*\b(?:icon|apple-touch-icon)\b[^\"']*[\"'][^>]*>", re.I)
HEAD = re.compile(r"(<head(?:\s[^>]*)?>)(.*?)(</head>)", re.I | re.S)

def family(path):
    keys = [k for k in FAMILIES if path == k or path.startswith(k + "/")]
    return FAMILIES[max(keys, key=len)] if keys else None

def apply(html, fam):
    def update(m):
        inner = ICONS.sub("", MARKS.sub("", m[2]))
        inner = re.sub(r"""<link\b[^>]*href=["'][^"']*/padrao/loading/gabinete-loader\.css[^"']*["'][^>]*>""", "", inner, flags=re.I)
        inner = re.sub(r"""<script\b[^>]*src=["'][^"']*/padrao/loading/gabinete-loader\.js[^"']*["'][^>]*>\s*</script>""", "", inner, flags=re.I)
        inner += '\n<link rel="stylesheet" href="/padrao/loading/gabinete-loader.css?v=20261125f">\n<script defer src="/padrao/loading/gabinete-loader.js?v=20261125f"></script>\n'
        icon = f'<link rel="icon" type="image/svg+xml" href="/padrao/favicon/{fam}.svg?v={VERSION}">'
        apple = f'<link rel="apple-touch-icon" sizes="180x180" href="/padrao/favicon/{fam}.png?v={VERSION}">'
        return m[1] + "\n<!-- favicon:cmt · identidade GAB.18810 -->\n" + icon + "\n" + apple + "\n<!-- /favicon:cmt -->\n" + inner + m[3]
    return HEAD.sub(update, html, count=1)

def main(public):
    import cairosvg
    fav = public / "padrao/favicon"
    loading = public / "padrao/loading"
    fav.mkdir(parents=True, exist_ok=True)
    loading.mkdir(parents=True, exist_ok=True)
    for name in set(FAMILIES.values()):
        src = HERE / (name + ".svg")
        shutil.copyfile(src, fav / src.name)
        cairosvg.svg2png(url=str(src), write_to=str(fav / (name + ".png")), output_width=180, output_height=180)
    for name in ("gab18810.svg", "gab18810-negativa.svg", "estrela.svg", "grafismo-login.svg", "grafismo-loading.svg", "gabinete-loader.js", "gabinete-loader.css"):
        shutil.copyfile(ROOT / "padrao/loading" / name, loading / name)
    for page in public.rglob("*.html"):
        fam = family(page.relative_to(public).as_posix().rsplit("/", 1)[0])
        if not fam:
            continue
        old = page.read_text(encoding="utf-8")
        new = apply(old, fam)
        # O carregamento pós-login acompanha a sessão inicial real; não intercepta a senha.
        if fam == "office" and 'id="en-form"' in new:
            new = new.replace("sessoesEquipe(true);", "var abertura = window.GabineteLoader && window.GabineteLoader.afterLogin(nome); var sessaoInicial = sessoesEquipe(true); if(abertura) Promise.resolve(sessaoInicial).finally(abertura.close);", 1)
            new = new.replace("if(!(mesma&&editando))carregar(!primeira);", "var cargaInicial = !(mesma&&editando) ? carregar(!primeira) : null;", 1)
            new = new.replace("P.dados=null;painel();}\n  }).catch(function(e){if(primeira)falha(e);});", "P.dados=null;painel();} return cargaInicial;\n  }).catch(function(e){if(primeira)falha(e);});", 1)
        if old != new:
            page.write_text(new, encoding="utf-8")
            print("Identidade:", page.relative_to(public), fam)

if __name__ == "__main__":
    main(Path(sys.argv[1]))
