#!/usr/bin/env bash
# Renders scripts/og-image.html to public/og-image.png (1200×630) with headless
# Chrome or Chromium. CHROME picks the binary; the default tries the usual names.
set -euo pipefail
cd "$(dirname "$0")/.."

chrome="${CHROME:-$(command -v chromium || command -v google-chrome-stable || command -v google-chrome || true)}"
if [ -z "$chrome" ]; then
  echo "og-image: no Chrome or Chromium found; set CHROME to its path" >&2
  exit 1
fi

"$chrome" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
  --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=3000 \
  --screenshot="$PWD/public/og-image.png" "file://$PWD/scripts/og-image.html" 2>/dev/null
echo "og-image: wrote public/og-image.png"
