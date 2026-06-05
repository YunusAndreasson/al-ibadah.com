#!/usr/bin/env bash
#
# Uploads the exported articles in `dist-r2/` to the AI Search instance's
# built-in storage via the Items API. Each file's key preserves its path
# (e.g. `bon/slug.md`), so the search Pages Function can reconstruct the
# article link from the key.
#
# Requires an AI Search API token (Edit + Run), passed via env:
#   AI_SEARCH_API_TOKEN=<token> pnpm upload:items
# Optional overrides: ACCOUNT_ID, INSTANCE.
#
# Run `pnpm export:r2` first to generate dist-r2/.

set -euo pipefail
cd "$(dirname "$0")/.."

: "${AI_SEARCH_API_TOKEN:?Set AI_SEARCH_API_TOKEN (an AI Search Edit+Run API token)}"
export ACCOUNT_ID="${ACCOUNT_ID:-268ba8e0685ad4a55f6e384ade67a941}"
export INSTANCE="${INSTANCE:-al-ibadah-search}"
export AI_SEARCH_API_TOKEN

if [ ! -d dist-r2 ]; then
  echo "dist-r2/ not found — run 'pnpm export:r2' first." >&2
  exit 1
fi

total=$(find dist-r2 -type f -name '*.md' | wc -l | tr -d ' ')
echo "Uploading $total files to instance '$INSTANCE' (built-in storage)…"

find dist-r2 -type f -name '*.md' -print0 \
  | xargs -0 -P 8 -I{} bash -c '
      f="$1"; key="${f#dist-r2/}"
      code=$(curl -s -o /dev/null -w "%{http_code}" --retry 3 --retry-delay 1 -X POST \
        "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/ai-search/instances/$INSTANCE/items" \
        -H "Authorization: Bearer $AI_SEARCH_API_TOKEN" \
        -F "file=@$f;filename=$key")
      [ "$code" = "200" ] || echo "  ! HTTP $code  $key"
    ' _ {}

echo "Upload complete: $total files submitted. They index asynchronously —"
echo "check progress with: wrangler ai-search stats $INSTANCE"
