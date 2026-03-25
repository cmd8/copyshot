#!/bin/bash
set -e

REPO="cmd8/copyshot"
INSTALL_DIR="$HOME/.local/share/copyshot"
COMMAND_FILE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/commands/copyshot.md"

# Parse flags
force=false
for arg in "$@"; do
    case "$arg" in
        --force|-f) force=true ;;
    esac
done
[ "${COPYSHOT_FORCE:-}" = "1" ] && force=true

echo "=== copyshot installer ==="
echo ""

# Check if command file already exists
if [ -f "$COMMAND_FILE" ] && [ "$force" = false ]; then
    echo "Error: $COMMAND_FILE already exists."
    echo ""
    echo "To avoid overwriting your data, installation was stopped."
    echo "Options:"
    echo "  • Delete or rename the file and re-run the installer"
    echo "  • Re-run with --force to overwrite:"
    echo "    curl -fsSL https://raw.githubusercontent.com/${REPO}/main/scripts/install.sh | bash -s -- --force"
    exit 1
fi

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

# Download/update copyshot source
echo ""
if [ -d "$INSTALL_DIR/.git" ]; then
    echo "Updating copyshot..."
    git -C "$INSTALL_DIR" pull --quiet
else
    echo "Downloading copyshot..."
    rm -rf "$INSTALL_DIR"
    git clone --depth 1 "https://github.com/${REPO}.git" "$INSTALL_DIR" --quiet
fi

# Install npm dependencies
echo "Installing dependencies..."
(cd "$INSTALL_DIR" && bun install --silent)

# Download fonts
FONTS_DIR="$INSTALL_DIR/fonts"
mkdir -p "$FONTS_DIR"

echo ""
echo "Checking fonts..."

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

# Install slash command
COMMANDS_DIR="$(dirname "$COMMAND_FILE")"
mkdir -p "$COMMANDS_DIR"

cat > "$COMMAND_FILE" << 'COMMAND_EOF'
---
name: copyshot
description: Screenshot the last assistant response as a styled PNG image and copy to clipboard
allowed-tools: Bash(bash:*)
---

## Result

!`bash $HOME/.local/share/copyshot/scripts/copyshot.sh ${CLAUDE_SESSION_ID}`

## Task

Say only: "Image copied to clipboard." — nothing else. Do not mention file paths, SVG, PNG, or /tmp. Do not save or copy files anywhere.
COMMAND_EOF

echo ""
echo "=== copyshot installed ==="
echo ""
echo "Installed to: $INSTALL_DIR"
echo "Command:      $COMMAND_FILE"
echo ""
echo "Use /copyshot in Claude Code to screenshot the last response."
