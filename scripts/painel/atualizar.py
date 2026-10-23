#!/usr/bin/env python3
"""Atualiza o Painel Central para o padrão 1.0.

Uso:  python3 scripts/painel/atualizar.py PAINEL.html [--saida painel.html]

O que faz (idempotente: pode rodar de novo sobre o painel já atualizado):
  1. troca o módulo antigo de sincronização (script#acervo-github, que gravava banco/acervo.json no repositório
     público) pelos módulos do padrão 1.0, embutidos entre marcadores:
       acervo-conversao.js   linha do painel ⇄ importado + operacional (regras de acervo/correspondencias.json)
       padrao/paradigmas.js  biblioteca comum de leitura dos paradigmas (para a busca por magistrado)
       magistrados.js        busca por magistrado (acervo e precedentes; 1º grau e colegiado)
       acervo-dados.js       sincronização com o repositório privado gabcmt-dados
  2. corrige a leitura de data_entrada_tarefa (e demais datas) na importação de planilhas: o texto dd/mm/aaaa
     deixava de ser lido como mês/dia (XLSX.read com raw:true) e passa a ser convertido para AAAA-MM-DD.
"""
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
INICIO, FIM = "<!-- acervo-padrao:inicio -->", "<!-- acervo-padrao:fim -->"
MODULOS = [AQUI / "acervo-conversao.js", RAIZ / "padrao/paradigmas.js", AQUI / "magistrados.js", AQUI / "acervo-dados.js"]

LEITURA_ANTIGA = 'XLSX.read(buf,{type:"array",cellNF:true})'
LEITURA_NOVA = 'XLSX.read(buf,{type:"array",cellNF:true,raw:true})'
DATA_ANTIGA = ('} else if(cell.t==="d") {const d=sourceDateInfo(cell.v);if(d)value=`${d.year}-${String(d.month).padStart(2,"0")}'
               '-${String(d.day).padStart(2,"0")}`;}')
DATA_NOVA = DATA_ANTIGA + (' else if(typeof value==="string"){const d=sourceDateInfo(value);'
                           'if(d&&d.day)value=`${d.year}-${String(d.month).padStart(2,"0")}-${String(d.day).padStart(2,"0")}`;}')


def bloco_modulos():
    partes = []
    for m in MODULOS:
        codigo = m.read_text(encoding="utf-8").replace("</script", "<\\/script")
        partes.append(f'<script id="mod-{m.stem}">\n{codigo}\n</script>')
    return INICIO + "\n" + "\n".join(partes) + "\n" + FIM


def atualizar(html: str) -> str:
    novo = bloco_modulos()
    if INICIO in html:
        html = html[:html.index(INICIO)] + novo + html[html.index(FIM) + len(FIM):]
    else:
        m = re.search(r'<script id="acervo-github">.*?</script>', html, re.S)
        if not m:
            raise SystemExit("não encontrei o módulo antigo (script#acervo-github) nem os marcadores do padrão 1.0")
        html = html[:m.start()] + novo + html[m.end():]
    if LEITURA_ANTIGA in html:
        html = html.replace(LEITURA_ANTIGA, LEITURA_NOVA, 1)
    elif LEITURA_NOVA not in html:
        raise SystemExit("não encontrei a leitura de planilhas (XLSX.read) para corrigir as datas")
    if DATA_NOVA not in html:
        if DATA_ANTIGA not in html:
            raise SystemExit("não encontrei a conversão de datas da importação")
        html = html.replace(DATA_ANTIGA, DATA_NOVA, 1)
    return html


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        raise SystemExit(__doc__)
    saida = Path(args[args.index("--saida") + 1]) if "--saida" in args else RAIZ / "painel.html"
    html = atualizar(Path(args[0]).read_text(encoding="utf-8"))
    saida.write_text(html, encoding="utf-8")
    print(f"{saida}: {len(html):,} caracteres")
