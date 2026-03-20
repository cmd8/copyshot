#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_INPUT="/tmp/copyshot-input.md"
TMP_ANSI="/tmp/copyshot-ansi.txt"
TMP_OUTPUT="/tmp/copyshot-output.png"

python3 "$SCRIPT_DIR/extract-last-response.py" "$1" > "$TMP_INPUT"

CLICOLOR_FORCE=1 glow -s "$SCRIPT_DIR/style.json" -w 120 "$TMP_INPUT" | cat > "$TMP_ANSI"

bun "$ROOT_DIR/src/pipeline.ts" "$TMP_ANSI" "$TMP_OUTPUT"

osascript -e "set the clipboard to (read (POSIX file \"$TMP_OUTPUT\") as «class PNGf»)"

echo "Image copied to clipboard"
