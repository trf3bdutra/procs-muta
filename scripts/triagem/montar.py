import json, sys, importlib
from tlib import mk
m = importlib.import_module(sys.argv[1])
L, F = [], []
for d in m.B:
    a, b = mk(d); L.append(a); F.append(b)
json.dump(L, open(f'/home/claude/work/out/{sys.argv[1]}_lote.json', 'w'), ensure_ascii=False)
json.dump(F, open(f'/home/claude/work/out/{sys.argv[1]}_ficha.json', 'w'), ensure_ascii=False)
# conferência: todo ID citado existe nos autos
import gzip, re
for a in L:
    au = json.load(gzip.open(f"/home/claude/procs-muta/acervo/autos/{a['processo']}.json.gz"))
    lista = json.loads(au['lista']) if isinstance(au['lista'], str) else au['lista']
    ids = {str(x[0]) for x in lista}
    txt = json.dumps(a, ensure_ascii=False)
    cit = set(re.findall(r'\bIDs? (\d{9})\b', txt)) | set(re.findall(r'\b(\d{9})\b', txt))
    fora = sorted(c for c in cit if c not in ids)
    print(a['processo'], 'IDs citados', len(cit), '· fora dos autos do recurso:', fora)
print(len(json.dumps(L, ensure_ascii=False)), len(json.dumps(F, ensure_ascii=False)))
for a in L:
    t = json.load(gzip.open(f"/home/claude/procs-muta/acervo/autos/{a['processo']}.json.gz"))['texto']
    txt = json.dumps(a, ensure_ascii=False)
    lista = json.loads(json.load(gzip.open(f"/home/claude/procs-muta/acervo/autos/{a['processo']}.json.gz"))['lista'])
    ids = {str(x[0]) for x in lista}
    sem = [c for c in set(re.findall(r'\b(\d{9})\b', txt)) if c not in ids and c not in t]
    if sem: print('!! ID sem respaldo no texto:', a['processo'], sem)
