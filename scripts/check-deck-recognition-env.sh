#!/usr/bin/env bash
set -euo pipefail

target_url="${1:-http://localhost:5174}"
config_url="${target_url%/}/api/deck-image-recognition"

local_status="missing"
if [[ -f ".env.local" ]] && grep -Eq '^OPENAI_API_KEY=.+$' ".env.local"; then
  local_status="configured"
fi

shell_status="missing"
if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  shell_status="configured"
fi

echo "local .env.local OPENAI_API_KEY: ${local_status}"
echo "current shell OPENAI_API_KEY: ${shell_status}"

if command -v vercel >/dev/null 2>&1; then
  if vercel env ls 2>/dev/null | grep -q '^ OPENAI_API_KEY'; then
    echo "vercel OPENAI_API_KEY: configured"
  else
    echo "vercel OPENAI_API_KEY: missing"
  fi
else
  echo "vercel OPENAI_API_KEY: unchecked (vercel CLI not found)"
fi

echo "config endpoint: ${config_url}"

if command -v curl >/dev/null 2>&1; then
  curl -fsS "${config_url}" || {
    echo
    echo "config endpoint check failed" >&2
    exit 1
  }
  echo
fi
