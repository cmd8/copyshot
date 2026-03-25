# copyshot

Screenshot the last Claude Code assistant response as a styled PNG image and copy it to your clipboard.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/cmd8/copyshot/main/scripts/install.sh | bash
```

If `~/.claude/commands/copyshot.md` already exists, the installer will stop to avoid overwriting your data. To force overwrite:

```bash
curl -fsSL https://raw.githubusercontent.com/cmd8/copyshot/main/scripts/install.sh | bash -s -- --force
```

## Usage

```
/copyshot
```

The last assistant response is rendered as a Dracula-themed PNG and copied to your clipboard. Paste it anywhere.

## How It Works

1. Reads the session JSONL to find the last assistant response on the active branch
2. Syntax-highlights fenced code blocks via `shiki` (Dracula theme)
3. Renders markdown via `glow` with a Dracula color theme
4. Converts ANSI terminal output to SVG with color-mapped text
5. Rasterizes to PNG at 2x resolution via `resvg`
6. Copies the PNG to clipboard via `osascript`

## Dependencies

- [glow](https://github.com/charmbracelet/glow) — markdown renderer
- [resvg](https://github.com/linebender/resvg) — SVG to PNG rasterizer
- [bun](https://bun.sh) — TypeScript runtime and package manager

The install script handles all dependencies automatically on macOS (via Homebrew).

## License

MIT
