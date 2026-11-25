#!/usr/bin/env python3
"""Coleta periódica pelo DJEN (CNJ): série do Relator e Collegium — roda no computador do gabinete.

Uso (na raiz do procs-muta):
  python3 scripts/jurisprudencia/coletar_djen.py            coleta, confere, gera e envia (commit e push na main)
  python3 scripts/jurisprudencia/coletar_djen.py --sem-envio   coleta, confere e gera, sem commit
  python3 scripts/jurisprudencia/coletar_djen.py --de 2026-11-01 --ate 2026-11-24   janela explícita

Passos (os mesmos da rotina de coleta, com o DJEN no lugar da Base de Jurisprudência do TRF-3):
 1. git pull --rebase; teste de acesso ao DJEN (sem resposta 200: para e registra "DJEN inacessível").
 2. Janela incremental: da última coleta menos 30 dias (publicações atrasadas) até hoje.
 3. Relator (Gab. A, idOrgao 101584): acórdãos e monocráticas terminativas com texto integral →
    completar_djen.py (completa os "apenas_ementa", acrescenta os que faltam; repetição = mesmo processo e data).
 4. Collegium (Gab. B 98372 e Gab. C 102009): ementa e resultado / abertura e dispositivo → collegium.py.
 5. Conferências: total nunca cai, checksums batem (SHA256SUMS das duas pastas), base válida (gerar.py),
    Compendium e Collegium montados (build.py), arquivos de busca gerados.
 6. Commit "Jurisprudência: coleta de DD/MM/AAAA (+N acórdãos, +M monocráticas; Collegium +K)" e push na main.
Ritmo: 1 segundo entre requisições; até 3 tentativas por página; erros persistentes ficam no MANIFESTO.
"""
import argparse, gzip, json, subprocess, sys, tempfile, urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import djen  # noqa: E402

RAIZ = AQUI.parents[1]


def sh(*cmd, ok=True):
    print("$", " ".join(cmd))
    r = subprocess.run(cmd, cwd=RAIZ, text=True, capture_output=True)
    print((r.stdout or "")[-3000:], (r.stderr or "")[-2000:], sep="")
    if ok and r.returncode != 0:
        raise SystemExit(f"falhou: {' '.join(cmd)}")
    return r


def total_serie():
    return len(json.loads((RAIZ / "precedentes/jurisprudencia/MANIFESTO.json").read_text(encoding="utf-8"))["registros"])


def total_collegium():
    p = RAIZ / "precedentes/collegium/MANIFESTO.json"
    return len(json.loads(p.read_text(encoding="utf-8"))["registros"]) if p.exists() else 0


def ultima_coleta():
    datas = []
    m = json.loads((RAIZ / "precedentes/jurisprudencia/MANIFESTO.json").read_text(encoding="utf-8"))
    datas += [c.get("data", "") for c in m.get("coletas_incrementais", [])] + list((m.get("coleta_original") or {}).values())
    p = RAIZ / "precedentes/collegium/MANIFESTO.json"
    if p.exists():
        datas.append(json.loads(p.read_text(encoding="utf-8")).get("ultima_coleta") or "")
    datas = [d[:10] for d in datas if d]
    return date.fromisoformat(max(datas)) if datas else date.today() - timedelta(days=30)


def acesso():
    try:
        u = djen.API + "?siglaTribunal=TRF3&orgaoId=101584&dataDisponibilizacaoInicio=" + date.today().isoformat() + \
            "&dataDisponibilizacaoFim=" + date.today().isoformat() + "&itensPorPagina=1&pagina=1"
        with urllib.request.urlopen(u, timeout=30) as r:
            return r.status == 200
    except Exception as e:
        print("acesso ao DJEN:", e)
        return False


def checksums(pasta):
    """Confere SHA256SUMS em Python (funciona também no Windows, sem sha256sum)."""
    import hashlib
    base = RAIZ / pasta
    ruins = []
    for linha in (base / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
        if not linha.strip():
            continue
        h, nome = linha.split(None, 1)
        p = base / nome.strip().lstrip("*")
        if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest() != h:
            ruins.append(nome.strip())
    if ruins:
        raise SystemExit(f"checksums não batem em {pasta}: {', '.join(ruins[:10])}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--de"); ap.add_argument("--ate")
    ap.add_argument("--sem-envio", action="store_true")
    ap.add_argument("--pausa", type=float, default=1.0)
    a = ap.parse_args()
    hoje = date.today()
    sh("git", "pull", "--rebase")
    if not acesso():
        print("DJEN inacessível — coleta não feita"); raise SystemExit(2)
    de = date.fromisoformat(a.de) if a.de else ultima_coleta() - timedelta(days=30)
    ate = date.fromisoformat(a.ate) if a.ate else hoje
    print(f"janela: {de} a {ate}")
    ser0, col0 = total_serie(), total_collegium()
    m0 = json.loads((RAIZ / "precedentes/jurisprudencia/MANIFESTO.json").read_text(encoding="utf-8"))["totais"]

    tmp = Path(tempfile.mkdtemp(prefix="djen-"))
    rel, erros_r = [], []
    for org in djen.ORG_RELATOR:
        x, e = djen.ler(org, de, ate, texto_integral=True, pausa=a.pausa); rel += x; erros_r += e
    (tmp / "relator.json").write_text(json.dumps(rel, ensure_ascii=False), encoding="utf-8")
    col, erros_c = [], []
    for org in djen.ORG_COLLEGIUM:
        x, e = djen.ler(org, de, ate, texto_integral=False, pausa=a.pausa); col += x; erros_c += e
    (tmp / "collegium.json").write_text(json.dumps(col, ensure_ascii=False), encoding="utf-8")

    crit = f"DJEN, disponibilização de {de.strftime('%d/%m/%Y')} a {ate.strftime('%d/%m/%Y')}"
    sh(sys.executable, "scripts/jurisprudencia/completar_djen.py", str(tmp / "relator.json"), "--coleta", hoje.isoformat(),
       "--criterio", crit + " · Gab. A (idOrgao 101584)" + (f" · {len(erros_r)} páginas com erro: " + "; ".join(erros_r[:20]) if erros_r else ""))
    sh(sys.executable, "scripts/jurisprudencia/collegium.py", str(tmp / "collegium.json"), "--coleta", hoje.isoformat(),
       "--criterio", crit + " · Gab. B (98372) e Gab. C (102009)" + (f" · {len(erros_c)} páginas com erro: " + "; ".join(erros_c[:20]) if erros_c else ""))

    ser1, col1 = total_serie(), total_collegium()
    if ser1 < ser0 or col1 < col0:
        raise SystemExit(f"o total caiu (série {ser0}→{ser1}, Collegium {col0}→{col1}); nada enviado")
    checksums("precedentes/jurisprudencia"); checksums("precedentes/collegium")
    sh(sys.executable, "gerar.py")
    sh(sys.executable, "apoio/modus-operandi/fonte/build.py")
    sh(sys.executable, "scripts/jurisprudencia/gerar_busca.py")
    sh(sys.executable, "scripts/jurisprudencia/gerar_busca.py", "--pasta", "precedentes/collegium")
    sh("node", "--test", "apoio/ex-officio/tests/collegium.test.js", "apoio/ex-officio/tests/amicus-index.test.js", ok=True)

    m1 = json.loads((RAIZ / "precedentes/jurisprudencia/MANIFESTO.json").read_text(encoding="utf-8"))["totais"]
    na, nm = m1["acordaos"] - m0["acordaos"], m1["monocraticas"] - m0["monocraticas"]
    msg = f"Jurisprudência: coleta de {hoje.strftime('%d/%m/%Y')} (+{na} acórdãos, +{nm} monocráticas; Collegium +{col1 - col0})"
    print(msg)
    if a.sem_envio:
        return
    sh("git", "add", "precedentes/jurisprudencia", "precedentes/collegium", "precedentes/precedentes.jsonl",
       "apoio/modus-operandi/modus-operandi.html", "apoio/modus-operandi/modus-operandi-editor.html", "apoio/modus-operandi/collegium.html",
       "padrao/manifesto.json", ok=False)
    if subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=RAIZ).returncode == 0:
        print("nada novo para enviar"); return
    sh("git", "commit", "-m", msg)
    sh("git", "pull", "--rebase")
    sh("git", "push", "origin", "HEAD:main")


if __name__ == "__main__":
    main()
