#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
  printf 'Error: Node.js is required.\n' >&2
  exit 1
fi

if ! command -v yarn >/dev/null 2>&1; then
  printf 'Error: Yarn is required.\n' >&2
  exit 1
fi

printf 'Starting Hop API and web app...\n'
printf 'Web app: http://localhost:5173\n'
printf 'API:      http://localhost:4321\n\n'

yarn dev
