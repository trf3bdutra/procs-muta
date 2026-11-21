"""python3 doc.py <cnj> <id> [ini] [fim]  — texto limpo de um documento"""
import json,gzip,re,sys
c,i=sys.argv[1],sys.argv[2]; a=int(sys.argv[3]) if len(sys.argv)>3 else 0; b=int(sys.argv[4]) if len(sys.argv)>4 else 999999
t=json.load(gzip.open(f'/home/claude/procs-muta/acervo/autos/{c}.json.gz'))['texto']
p=re.split(r'===== ID (\d+) \| [^\n]*?=====',t); tx={p[k]:p[k+1] for k in range(1,len(p)-1,2)}
s=re.sub(r'\s+',' ',tx.get(i,''))
s=re.sub(r'Assinado eletronicamente por:.{0,200}?Número do documento: \d+',' ',s); s=re.sub(r'https?://\S+','',s)
print(len(s)); print(s[a:b])
