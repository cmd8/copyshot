# copyshot

Screenshot the last Claude Code assistant response as a styled PNG image and copy it to your clipboard.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/cmd8/copyshot/main/scripts/install.sh | bash
```

### Claude Code Plugin

```
/plugin marketplace add cmd8/copyshot
/plugin install copyshot@copyshot
```

Restart Claude Code after installing.

## Usage

```
/copyshot
```

The last assistant response is rendered as a Dracula-themed PNG and copied to your clipboard. Paste it anywhere.

## How It Works

1. Reads the session JSONL to find the last assistant response on the active branch
2. Renders markdown via `glow` with a Dracula color theme
3. Converts ANSI terminal output to SVG with color-mapped text
4. Rasterizes to PNG at 2x resolution via `resvg`
5. Copies the PNG to clipboard via `osascript`

## Dependencies

- [glow](https://github.com/charmbracelet/glow) — markdown renderer
- [resvg](https://github.com/nicecraftz/resvg-cli) — SVG to PNG rasterizer
- [bun](https://bun.sh) — TypeScript runtime

The install script handles all dependencies automatically on macOS (via Homebrew).

## License

MIT
