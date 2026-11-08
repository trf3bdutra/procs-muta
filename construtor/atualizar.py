#!/usr/bin/env python3
"""Atualiza o construtor para o padrão 1.0 mantendo compatibilidade.

Este wrapper aponta para o script original do construtor, mantendo toda a
lógica de geração em um único centro dedicado ao app.
"""
from pathlib import Path
import sys

BASE = Path(__file__).resolve().parent
RAIZ = BASE.parent
ORIGEM = RAIZ / "scripts" / "construtor" / "atualizar.py"

if __name__ == "__main__":
    if not ORIGEM.exists():
        raise SystemExit(f"script original não encontrado: {ORIGEM}")
    sys.path.insert(0, str(ORIGEM.parent))
    code = compile(ORIGEM.read_text(encoding="utf-8"), str(ORIGEM), "exec")
    ns = {"__file__": str(ORIGEM), "__name__": "__main__"}
    exec(code, ns, ns)
