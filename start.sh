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

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    printf 'Created .env from .env.example\n'
  else
    printf 'Warning: no .env or .env.example file found. Continuing with defaults.\n' >&2
  fi
fi

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

API_PORT="${PORT:-4321}"

printf 'Starting Hop API and web app...\n'
printf 'Web app: http://localhost:5173\n'
printf "API:      http://localhost:${API_PORT}\n\n"

yarn dev
