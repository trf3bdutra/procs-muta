"""Consulta no DataJud uma lista de números (pedido em JSON) e grava os movimentos de cada processo.

Uso: python3 scripts/datajud/consultar_lista.py <pedido.json> <saida.json>
Pedido: {"numeros": [{"numero": "50014913720244036000", "tribunal": "trf3"}, ...]}
Serve ao saneamento da triagem (sentença na origem, gratuidade, intimação e prazos), sem login no PJe.
Processos sigilosos não vêm do DataJud.
"""
import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cliente import ClienteDatajud, ErroConsulta, normalizar_numero  # noqa: E402


def chave():
    k = os.environ.get("DATAJUD_API_KEY", "").strip()
    if k:
        return k[7:].strip() if k.startswith("APIKey ") else k
    from sincronizar import chave_publica_wiki
    return chave_publica_wiki()


def compl(m):
    out = []
    for c in m.get("complementosTabelados") or []:
        t = " ".join(str(x) for x in (c.get("nome"), c.get("descricao")) if x)
        if t:
            out.append(t)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("pedido")
    ap.add_argument("saida")
    a = ap.parse_args()
    pedido = json.loads(Path(a.pedido).read_text(encoding="utf-8"))
    cli = ClienteDatajud(chave=chave(), intervalo=1.0)
    resultados = {}
    for it in pedido.get("numeros", []):
        tribunal = (it.get("tribunal") or "trf3").lower()
        try:
            numero = normalizar_numero(it.get("numero", ""))
        except ErroConsulta as e:
            resultados[str(it.get("numero"))] = {"erro": str(e)}
            continue
        r = None
        for tentativa in range(3):
            try:
                r = cli.consultar(numero, tribunal)
                break
            except ErroConsulta as e:
                if e.transitorio and tentativa < 2:
                    time.sleep(10 * (tentativa + 1))
                    continue
                resultados[numero] = {"tribunal": tribunal, "erro": str(e)}
                break
        if r is None:
            continue
        regs = []
        for h in r["dados"]["hits"]["hits"]:
            s = h["_source"]
            movs = [{"data": m.get("dataHora"), "codigo": m.get("codigo"), "nome": m.get("nome"), "compl": compl(m)}
                    for m in (s.get("movimentos") or [])]
            movs.sort(key=lambda x: x["data"] or "")
            regs.append({"grau": s.get("grau"), "classe": (s.get("classe") or {}).get("nome"),
                         "orgao": (s.get("orgaoJulgador") or {}).get("nome"),
                         "ajuizamento": s.get("dataAjuizamento"), "atualizado": s.get("dataHoraUltimaAtualizacao"),
                         "movimentos": movs})
        resultados[numero] = {"tribunal": tribunal, "registros": regs}
    saida = {"schema": "gabcmt.datajud.consulta", "pedido": a.pedido,
             "consultado_em": datetime.now(timezone.utc).isoformat(), "resultados": resultados}
    Path(a.saida).parent.mkdir(parents=True, exist_ok=True)
    Path(a.saida).write_text(json.dumps(saida, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(len(resultados), "processos consultados")


if __name__ == "__main__":
    main()
