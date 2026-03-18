#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_INPUT="/tmp/copyshot-input.md"
TMP_SVG="/tmp/copyshot-output.svg"
TMP_SVG_FIXED="/tmp/copyshot-output-fixed.svg"
TMP_OUTPUT="/tmp/copyshot-output.png"

python3 "$SCRIPT_DIR/extract-last-response.py" "$1" > "$TMP_INPUT"

freeze --execute "glow -s $SCRIPT_DIR/style.json -w 120 $TMP_INPUT" \
  -o "$TMP_SVG" \
  --font.family Menlo \
  --window=false \
  -p 20

python3 "$SCRIPT_DIR/fix-emoji-svg.py" "$TMP_SVG" "$TMP_SVG_FIXED"

resvg --use-fonts-dir ~/Library/Fonts/ \
      --use-fonts-dir /System/Library/Fonts/ \
      -z 2 "$TMP_SVG_FIXED" "$TMP_OUTPUT" 2>/dev/null

osascript -e "set the clipboard to (read (POSIX file \"$TMP_OUTPUT\") as «class PNGf»)"

echo "Image copied to clipboard"
