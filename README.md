# copyshot

Claude Code can `/copy` text or `/export` a chat, but sharing a single response as an image means screenshotting your terminal. `/copyshot` renders the last response as a PNG with syntax highlighting and copies it to your clipboard.

## Install (macOS only)

```bash
curl -fsSL https://raw.githubusercontent.com/cmd8/copyshot/main/scripts/install.sh | bash
```

Installs dependencies via Homebrew, downloads fonts, and adds the `/copyshot` command to Claude Code.

## Usage

```
/copyshot
```

## How It Works

<img src="https://github.com/user-attachments/assets/1fbf3a85-3e14-4ccf-9d3c-cf4755656eba" alt="How copyshot works" width="500">

## Dependencies

- [glow](https://github.com/charmbracelet/glow) — markdown renderer
- [resvg](https://github.com/linebender/resvg) — SVG to PNG rasterizer
- [bun](https://bun.sh) — TypeScript runtime and package manager

## License

MIT
