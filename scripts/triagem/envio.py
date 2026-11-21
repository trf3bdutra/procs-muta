"""python3 envio.py blkNN [blkMM ...] → out/envio_<blks>.js (ficha com datas de urgência)"""
import json, sys
L = json.load(open('/home/claude/procs-muta/acervo/lotes/adp-ai.json')); idx = {it['processo']: it for it in L['itens']}
R = {r['processo']: r for r in json.load(open('/home/claude/procs-muta/acervo/operacional.json'))['registros']}
F = []
for b in sys.argv[1:]: F += json.load(open(f'out/{b}_ficha.json'))
for f in F:
    p = idx[f['cnj']]['prontuario_triagem']; ctl = p.get('ctl') or {}; prot = (p.get('cartao') or {}).get('adm', {}).get('prot')
    c = f['campos']; ex = (R.get(f['cnj']) or {}).get('triagem') or {}
    if c.get('triagem.Urgência'):
        ped = ctl.get('urgPedido') or prot
        if ped and not ex.get('Urgência - Data'): c['triagem.Urgência - Data'] = ped
        if ctl.get('urgData') and not ex.get('Urgência - Apreciada em'): c['triagem.Urgência - Apreciada em'] = ctl['urgData']
        if ctl.get('urgObs'): c['triagem.Urgência - Observação'] = ctl['urgObs']
nm = '_'.join(sys.argv[1:])
js = ("(async()=>{const F=" + json.dumps(F, ensure_ascii=False, separators=(',', ':')) + ";window.__env={ok:[],n:F.length};for(const f of F){let ok=0;for(let t=0;t<5&&!ok;t++){try{const q=await fetch('/api/pauta?ficha=1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)});const x=await q.text();if([401,409,429,500,502,503].includes(q.status)){await new Promise(z=>setTimeout(z,3000));continue;}let j={};try{j=JSON.parse(x)}catch(e){};window.__env.ok.push(f.cnj.slice(0,10)+' '+q.status+(j.recusados&&j.recusados.length?' rec:'+j.recusados.join('|'):'')+(j.erro?' '+j.erro:''));ok=1;}catch(e){await new Promise(z=>setTimeout(z,3000));}}if(!ok)window.__env.ok.push(f.cnj.slice(0,10)+' falhou');}window.__env.fim=1;})();'iniciado'")
open(f'out/envio_{nm}.js', 'w').write(js); print(nm, len(F), len(js))
