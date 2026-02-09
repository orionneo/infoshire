#!/usr/bin/env bash
set -euo pipefail

# sempre roda a partir da raiz do repo
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# outDir local (evita /workspace)
OUTDIR="$REPO_ROOT/.dist-check"
rm -rf "$OUTDIR"

# Use pnpm exec para garantir versão local do vite
# Desabilita minify para debug, igual seu script atual
if ! OUTPUT=$(pnpm exec vite build --minify false --logLevel error --outDir "$OUTDIR" 2>&1); then
  echo "$OUTPUT"
  exit 1
fi

# cleanup opcional (se quiser manter pra inspeção, comente)
rm -rf "$OUTDIR"
