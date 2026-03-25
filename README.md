# copyshot

You just got a perfect response from Claude Code — a clean explanation, a working code block, a neat table. You want to share it. But screenshots look rough, copy-paste loses formatting, and there's no export button.

`/copyshot` turns the last assistant response into a styled PNG and copies it to your clipboard. One command, paste anywhere.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/cmd8/copyshot/main/scripts/install.sh | bash
```

Requires macOS. The script installs all dependencies via Homebrew.

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
