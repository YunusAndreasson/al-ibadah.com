#!/usr/bin/env bash
#
# Uploads the exported articles in `dist-r2/` to the R2 bucket that backs the
# AI Search instance. Object keys mirror the site URL (e.g. `bon/slug.md`), so
# the search Pages Function can reconstruct each article link from the key.
#
# Usage: pnpm upload:r2            (uploads to the default bucket below)
#        BUCKET=my-bucket pnpm upload:r2
#
# Requires a wrangler session with R2 write scope (run `wrangler login` once).

set -euo pipefail

cd "$(dirname "$0")/.."

export BUCKET="${BUCKET:-al-ibadah-content}"

if [ ! -d dist-r2 ]; then
  echo "dist-r2/ not found — run 'pnpm export:r2' first." >&2
  exit 1
fi

total=$(find dist-r2 -type f -name '*.md' | wc -l | tr -d ' ')
echo "Uploading $total files to R2 bucket '$BUCKET'…"

find dist-r2 -type f -name '*.md' -print0 \
  | xargs -0 -P 6 -I{} bash -c '
      f="$1"
      key="${f#dist-r2/}"
      wrangler r2 object put "$BUCKET/$key" --file "$f" --content-type text/markdown --remote >/dev/null
    ' _ {}

echo "Upload complete: $total files → $BUCKET"
