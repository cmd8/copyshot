# copyshot

You just got a perfect response from Claude Code — a clean explanation, a working code block, a neat table. You want to share it. But screenshots look rough, copy-paste loses formatting, and there's no export button.

`/copyshot` turns the last assistant response into a styled PNG and copies it to your clipboard. One command, paste anywhere.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/cmd8/copyshot/main/scripts/install.sh | bash
```

Requires macOS. The script installs all dependencies via Homebrew.

If `~/.claude/commands/copyshot.md` already exists, the installer will stop to avoid overwriting your data. Re-run with `--force` to overwrite:

```bash
curl -fsSL https://raw.githubusercontent.com/cmd8/copyshot/main/scripts/install.sh | bash -s -- --force
```

## Usage

```
/copyshot
```

## How It Works

<!-- TODO: replace with copyshot-generated architecture image -->
![How copyshot works](docs/architecture.png)

## Dependencies

- [glow](https://github.com/charmbracelet/glow) — markdown renderer
- [resvg](https://github.com/linebender/resvg) — SVG to PNG rasterizer
- [bun](https://bun.sh) — TypeScript runtime and package manager

## License

MIT
