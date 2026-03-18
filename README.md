# copyshot

Screenshot the last Claude Code assistant response as a styled PNG image and copy it to your clipboard.

## Install

### Prerequisites

- [glow](https://github.com/charmbracelet/glow) — markdown renderer
- [freeze](https://github.com/charmbracelet/freeze) — terminal screenshot tool
- [resvg](https://github.com/nicecraftz/resvg-cli) — SVG to PNG rasterizer
- Python 3

```bash
brew install glow charmbracelet/tap/freeze
cargo install resvg-cli
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
3. Captures the output as SVG via `freeze`
4. Fixes emoji rendering for color display
5. Rasterizes to PNG at 2x resolution via `resvg`
6. Copies the PNG to clipboard via `osascript`

## License

MIT
