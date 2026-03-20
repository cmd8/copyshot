#!/bin/bash
set -e

echo "=== copyshot installer ==="
echo ""

# Detect OS
case "$(uname -s)" in
    Darwin) os="macos" ;;
    Linux)  os="linux" ;;
    *)      echo "Unsupported OS: $(uname -s)" >&2; exit 1 ;;
esac

# Check/install dependencies
check_cmd() {
    if command -v "$1" &>/dev/null; then
        echo "  ✓ $1"
        return 0
    else
        echo "  ✗ $1 not found"
        return 1
    fi
}

echo "Checking dependencies..."
missing=()
check_cmd glow    || missing+=(glow)
check_cmd resvg   || missing+=(resvg)
check_cmd bun     || missing+=(bun)

if [ ${#missing[@]} -gt 0 ]; then
    echo ""
    echo "Missing: ${missing[*]}"

    if [ "$os" = "macos" ] && command -v brew &>/dev/null; then
        echo "Installing via brew..."
        for dep in "${missing[@]}"; do
            case "$dep" in
                glow)  brew install glow ;;
                resvg) brew install resvg ;;
                bun)   brew install oven-sh/bun/bun ;;
            esac
        done
    elif [ "$os" = "linux" ]; then
        echo ""
        echo "Please install manually:"
        for dep in "${missing[@]}"; do
            case "$dep" in
                glow)  echo "  glow:  https://github.com/charmbracelet/glow#installation" ;;
                resvg) echo "  resvg: cargo install resvg-cli" ;;
                bun)   echo "  bun:   curl -fsSL https://bun.sh/install | bash" ;;
            esac
        done
        exit 1
    else
        echo "Please install these dependencies manually."
        exit 1
    fi
fi

# Determine install location
PLUGIN_DIR="${COPYSHOT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
FONTS_DIR="$PLUGIN_DIR/fonts"
mkdir -p "$FONTS_DIR"

# Download fonts
echo ""
echo "Downloading fonts..."

if [ ! -f "$FONTS_DIR/JetBrainsMono-Regular.ttf" ]; then
    echo "  Downloading JetBrains Mono..."
    tmp=$(mktemp -d)
    curl -fsSL "https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip" -o "$tmp/jbmono.zip"
    unzip -o "$tmp/jbmono.zip" -d "$tmp/jbmono" "fonts/ttf/JetBrainsMono-Regular.ttf" "fonts/ttf/JetBrainsMono-Bold.ttf" >/dev/null
    cp "$tmp/jbmono/fonts/ttf/JetBrainsMono-Regular.ttf" "$tmp/jbmono/fonts/ttf/JetBrainsMono-Bold.ttf" "$FONTS_DIR/"
    rm -rf "$tmp"
    echo "  ✓ JetBrains Mono"
else
    echo "  ✓ JetBrains Mono (already installed)"
fi

if [ ! -f "$FONTS_DIR/NotoColorEmoji.ttf" ]; then
    echo "  Downloading Noto Color Emoji..."
    curl -fsSL "https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf" -o "$FONTS_DIR/NotoColorEmoji.ttf"
    echo "  ✓ Noto Color Emoji"
else
    echo "  ✓ Noto Color Emoji (already installed)"
fi

echo ""
echo "=== copyshot installed ==="
echo ""
echo "Install the Claude Code plugin:"
echo "  /plugin marketplace add cmd8/copyshot"
echo "  /plugin install copyshot@copyshot"
echo ""
echo "Then restart Claude Code. Use /copyshot to screenshot the last response."
