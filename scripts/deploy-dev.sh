#!/usr/bin/env bash
set -euo pipefail

DEV_ALIAS="carddamda-develop.vercel.app"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
SHA="$(git rev-parse HEAD)"

if [[ "${BRANCH}" != "develop" && "${ALLOW_NON_DEVELOP:-}" != "1" ]]; then
  echo "Refusing dev deploy from '${BRANCH}'. Switch to develop or set ALLOW_NON_DEVELOP=1." >&2
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI is required. Install or authenticate it before deploying." >&2
  exit 1
fi

tmp_output="$(mktemp)"
trap 'rm -f "${tmp_output}"' EXIT

vercel deploy . \
  -y \
  --target=preview \
  --meta "githubCommitRef=${BRANCH}" \
  --meta "githubCommitSha=${SHA}" \
  --meta "githubCommitRepo=carddamda" \
  --meta "githubCommitOrg=HanC0M" | tee "${tmp_output}"

deployment_url="$(awk '/^https:\/\/.*\.vercel\.app$/ { url=$0 } END { print url }' "${tmp_output}")"

if [[ -z "${deployment_url}" ]]; then
  echo "Could not determine Vercel deployment URL from deploy output." >&2
  exit 1
fi

vercel alias set "${deployment_url}" "${DEV_ALIAS}"

echo "Development deployment: https://${DEV_ALIAS}"
