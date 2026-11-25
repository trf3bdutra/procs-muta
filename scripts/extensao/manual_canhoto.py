"""Reutiliza o renderizador e as fontes do Manual original do canhoto."""
import json
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
H = RAIZ / 'apoio/modus-operandi/fonte'

def trecho(s, a, b):
    i = s.index(a)
    return s[i:s.index(b, i)]

def montar(saida):
    saida = pathlib.Path(saida)
    em = (H/'ementario.js').read_text(encoding='utf-8')
    ed = (H/'editorial_d.js').read_text(encoding='utf-8')
    ler = lambda p: json.loads(p.read_text(encoding='utf-8'))
    dados = {'pecas': ler(H/'editorial_pecas.json'), 'padrao': ler(RAIZ/'apoio/diretrizes.json'),
             'normas': [r for r in ler(RAIZ/'apoio/repertorio.json')['registros'] if r.get('categoria') == 'norma']}
    man = ler(RAIZ/'apoio/vade-mecum.json').get('Diretrizes', [])
    pares = [('function esc(', 'function fmtD('), ('function man(){', 'function manTxt('),
             ('var MANG=', 'var FO='), ('function regs(', 'function xRender('),
             ('function estiloItens(', 'var VG='), ('function ehGrafia(', 'function tabela('),
             ('function conectivosVerbos(', '/* ================= EDITORIAL:'),
             ('function xFm(', 'function xParas('), ('function xLista(', '/* ===== Dados da peça'),
             ('function xRefTab(', 'function xRef(){')]
    js = '(function(){"use strict";\nvar ED='+json.dumps(dados, ensure_ascii=False)+';\nvar XP={q:""},MAN='+json.dumps(man, ensure_ascii=False)+';\n'
    js += '\n'.join(trecho(em,a,b) for a,b in pares)
    js += '\nfunction man(){return MAN.filter(function(r){return r["Código"];});}\nfunction refs(t){return esc(t);}\n'
    bloco = trecho(ed, '  /* manual da parte (orientações gerais, formatação e tensões) */', '  XP._G={h:g,t:pt.t};')
    js += '\nfunction geral(pid){var pt=ED.pecas.pecas.find(function(p){return p.id===pid;})||{id:pid,notas:[]};var XP={pc:/^(monocratica|despacho)$/.test(pid)?"decisao":"acordao"},FMT=((ED.pecas.forma.filter(function(f){return f.t==="Formatação para o PJe";})[0]||{}).r)||[];\n'+bloco+'\nreturn g;}\n'
    js += '\nwindow.MutaManualCanhoto={geral:geral,tab:function(tab,q){XP.q=q||"";return xRefTab(tab);}};\n})();\n'
    (saida/'manual-canhoto.js').write_text(js,encoding='utf-8')
    css = []
    for nome in ('ementario.css','editorial_d.css'):
        for linha in (H/nome).read_text(encoding='utf-8').splitlines():
            if linha.startswith(('.dori','.ohd','.oman','.xgd','.xgk','.xev','.xten','.xrtabs','#x-rq','.xrg','.xri','.xlb','.xrt')):
                css.append(linha)
    texto = re.sub(r'(^|})\s*([^{}]+)\{',lambda m:m[1]+'\n'+','.join('#dir-app '+x.strip() for x in m[2].split(','))+'{','\n'.join(css))
    texto += """
#dir-app{--ink:var(--fg);--mut:var(--muted-fg);--good:var(--ok);--bad:var(--danger)}
#dir-app .dori.man{margin-top:0;padding:10px 12px 14px;background:var(--card);min-width:0}
#dir-app .dori #x-rq{margin:8px 0;box-sizing:border-box}
#dir-app .xrtabs button{flex:1 1 auto}
#dir-app .mc-parte{margin:8px 0;width:100%;height:32px;font:12px var(--sans);background:var(--field);color:var(--fg);border:1px solid var(--line)}
#dir-app .xrt td,#dir-app .xrb{overflow-wrap:anywhere}
#dir-app .xri{line-height:1.5}
#dir-app .v{background:#f6e8b9;color:#805b18}
"""
    (saida/'manual-canhoto.css').write_text(texto,encoding='utf-8')
