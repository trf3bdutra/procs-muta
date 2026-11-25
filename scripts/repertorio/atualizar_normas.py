"""Deriva usos normativos dos julgados catalogados do Relator, sem misturar o Collegium."""
import json, re, unicodedata, hashlib
from pathlib import Path
from collections import defaultdict

def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD', str(s or '')) if unicodedata.category(c) != 'Mn').lower().strip()

ALIASES = {'cpc':'Lei 13.105/2015','cf':'Constituição Federal','cf/1988':'Constituição Federal','constituicao':'Constituição Federal','constituicao federal':'Constituição Federal','ctn':'Lei 5.172/1966','cc':'Lei 10.406/2002','codigo civil':'Lei 10.406/2002','lef':'Lei 6.830/1980','cp':'Decreto-Lei 2.848/1940','cpp':'Decreto-Lei 3.689/1941','ritrf3':'RITRF3'}
DIP = r'(?:Lei Complementar|LC|Lei|Decreto-Lei|Decreto|Emenda Constitucional|EC|Resolução|Portaria)\s*(?:n[º°o]\.?\s*)?\d[\d.]*(?:/\d{4})?|Constituição Federal|Constituição|Código Civil|CPC|CF(?:/1988)?|CTN|CPP|CC|LEF|CP|RITRF3'
ART = r'(?:artigos?|arts?\.?)\s+'
# Não confundir parágrafos, incisos e datas com artigos; só enumerações inequívocas.
ITEM = r'\d+(?:\.\d{3})*(?:º|°)?(?:-[A-Za-z])?'
LIST = ITEM + r'(?:\s*(?:,\s*|\s+e\s+)(?:'+ITEM+r'))*'
def diploma(s):
    n=norm(s)
    if n in ALIASES: s=ALIASES[n]
    else:
        for alias in ALIASES:
            if n.startswith(alias+' ('):
                s=ALIASES[alias]; break
    s=re.sub(r'\s+n[º°o]\.?\s*',' ',s,flags=re.I)
    return norm(s).replace('.','')
def article(s):
    m=re.match(r'\s*(?:art(?:igo)?\.?\s*)?('+ITEM+r')', str(s or ''), re.I)
    return re.sub('[º°.]','',m.group(1)).upper() if m else ''
def citations(value):
    if isinstance(value,list): value='; '.join(x for x in value if isinstance(x,str))
    if not isinstance(value,str): return set()
    out=set()
    for part in re.split(r'[;\n]+',value):
        # Forma canônica: CPC, artigos 85, 98 e 99; admite qualificadores depois do primeiro artigo.
        for m in re.finditer(r'(?P<d>'+DIP+r')\s*,?\s*'+ART+r'(?P<a>'+LIST+r')',part,re.I):
            for x in re.findall(ITEM,m['a']): out.add((m['d'],article(x)))
        # Forma inversa: artigo 85, § 11, do CPC / artigos 98 e 99, CPC.
        for m in re.finditer(ART+r'(?P<a>'+LIST+r')(?:\s*,?\s*§{1,2}\s*\d+[º°]?(?:\s*(?:e|a)\s*\d+[º°]?)?|\s*,?\s*incisos?\s+[IVXLCDM]+)*\s*,?\s*(?:(?:do|da)\s+)?(?P<d>'+DIP+r')\b',part,re.I):
            for x in re.findall(ITEM,m['a']): out.add((m['d'],article(x)))
    return {(d,a) for d,a in out if a}
def gerar(raiz, snapshot, complemento, anteriores):
    indexed=defaultdict(list)
    codigos=set()
    for n in list(snapshot.get('Normas',[]))+list(complemento):
        k=n.get('Código')
        if not k: continue
        codigos.add(k)
        for d in (n.get('Diploma'),n.get('Norma')):
            a=article(n.get('Dispositivo'))
            if d and a and k not in indexed[(diploma(d),a)]: indexed[(diploma(d),a)].append(k)
    auto={}
    uses={}
    # Preserva os vínculos anteriores (inclusive casos com sintaxe não reconhecida pelo extrator).
    # Uma nova ocorrência com a mesma chave substitui a anterior; não se duplicam usos.
    for u in anteriores:
        uses[(u.get('Código do item'),u.get('Processo'),u.get('Data'))]=u
    with (raiz/'precedentes/precedentes.jsonl').open(encoding='utf-8') as f:
        for line in f:
            if not line.strip(): continue
            r=json.loads(line)
            for d,a in citations(r.get('dispositivosCitados')):
                key=(diploma(d),a)
                codes=indexed.get(key)
                if not codes:
                    # Só cadastrar referência nova quando o diploma é determinado.
                    if not (key[0] in {diploma(v) for v in ALIASES.values()} or re.search(r'/\d{4}$',key[0])): continue
                    code='AUTO-N-'+hashlib.sha256(('|'.join(key)).encode()).hexdigest()[:16]
                    label=ALIASES.get(norm(d),d)
                    auto[key]={'id':code,'Código':code,'Diploma':label,'Norma':label,'Dispositivo':a,'Assunto':'Referência citada · a conferir','Texto literal':'','Observação':'Dispositivo identificado em citação registrada de julgado do Relator. Texto normativo e pertinência sujeitos a conferência.'}
                    indexed[key]=codes=[code]
                dt=r.get('dataJulgamento') or ''
                data=dt[8:10]+'/'+dt[5:7]+'/'+dt[:4] if re.match(r'\d{4}-\d{2}-\d{2}',dt) else dt
                for code in codes:
                    u={'Código do item':code,'Tipo de decisão':r.get('especie') or r.get('pronunciamento') or 'Julgado','Processo':r.get('processo',''),'Data':data,'Órgão julgador':r.get('orgao',''),'Link':r.get('urlFonte',''),'Observação':'Citação normativa registrada no julgado do Relator · '+str(r.get('id',''))}
                    uses[(code,u['Processo'],data)]=u
    print(f'Repertório: {len(auto)} referências novas, {len(uses)} vínculos automáticos')
    return list(auto.values()), list(uses.values())
