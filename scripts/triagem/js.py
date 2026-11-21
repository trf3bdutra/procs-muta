import json, sys
b = sys.argv[1]; lote = sys.argv[2] if len(sys.argv) > 2 else 'adp-ai'
L = json.load(open(f'out/{b}_lote.json')); F = json.load(open(f'out/{b}_ficha.json'))
js = ("(async()=>{const L=" + json.dumps(L, ensure_ascii=False, separators=(',', ':')) + ";const F=" + json.dumps(F, ensure_ascii=False, separators=(',', ':')) +
      ";const out={};let r=await fetch('/api/painel?lote=1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({acao:'itens',id:'" + lote + "',itens:L})});out.lote=r.status+' '+(await r.text()).slice(0,160);"
      "out.ficha=[];for(const f of F){for(let t=0;t<3;t++){const q=await fetch('/api/pauta?ficha=1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)});const x=await q.text();if(q.status===409){await new Promise(z=>setTimeout(z,2500));continue;}let j={};try{j=JSON.parse(x)}catch(e){};out.ficha.push(f.cnj.slice(0,10)+' '+q.status+(j.recusados&&j.recusados.length?' rec:'+j.recusados.join('|'):'')+(j.erro?' '+j.erro:''));break;}}window.__ultimo=out;return out;})()")
open(f'out/{b}.js', 'w').write(js); print(len(js))
