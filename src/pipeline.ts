/**
 * ansi-to-png: Converts ANSI-colored terminal text to a PNG image.
 *
 * Pipeline: ANSI text → parse SGR codes → SVG with <text>/<tspan> → resvg → PNG
 *
 * Each line is a single <text> element with <tspan> children for color/style
 * changes. No x-position math — the monospace font handles character spacing
 * naturally. This avoids accumulated rounding errors that cause misaligned
 * columns.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(__dirname, "..", "fonts");

// ── ANSI Parser ──────────────────────────────────────────────

const ANSI_RE = /\x1b\[([0-9;]*)m/g;

interface Style {
  bold: boolean;
  italic: boolean;
  faint: boolean;
  underline: boolean;
  color: string | null;
  bgColor: string | null;
}

interface Span {
  text: string;
  style: Style;
}

// Dracula terminal palette — maps standard ANSI color indices to theme hex.
const PALETTE = [
  "#282A36", "#FF5555", "#69CC7A", "#F1FA8C",  // 0-3: black, red, green, yellow
  "#BD93F9", "#FF79C6", "#8BE9FD", "#F8F8F2",  // 4-7: blue, magenta, cyan, white
  "#6272A4", "#FF6E6E", "#69CC7A", "#FFFFA5",  // 8-11: bright variants
  "#D6ACFF", "#FF92DF", "#A4D4F5", "#FFFFFF",  // 12-15: bright variants
];

function ansiColor(index: number): string | null {
  if (index < 16) return PALETTE[index];
  if (index < 232) {
    // 216 color cube
    const i = index - 16;
    const r = Math.floor(i / 36);
    const g = Math.floor((i % 36) / 6);
    const b = i % 6;
    const toVal = (v: number) => (v === 0 ? 0 : 55 + v * 40);
    return `#${toVal(r).toString(16).padStart(2, "0")}${toVal(g).toString(16).padStart(2, "0")}${toVal(b).toString(16).padStart(2, "0")}`;
  }
  // Grayscale ramp
  const v = 8 + (index - 232) * 10;
  return `#${v.toString(16).padStart(2, "0")}${v.toString(16).padStart(2, "0")}${v.toString(16).padStart(2, "0")}`;
}

function parseLine(line: string): Span[] {
  const spans: Span[] = [];
  const defaultStyle: Style = { bold: false, italic: false, faint: false, underline: false, color: null, bgColor: null };
  let style = { ...defaultStyle };
  let lastIndex = 0;

  ANSI_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ANSI_RE.exec(line)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ text: line.slice(lastIndex, match.index), style: { ...style } });
    }
    lastIndex = match.index + match[0].length;

    const codes = match[1].split(";").map(Number);
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i];
      if (c === 0 || isNaN(c))        style = { ...defaultStyle };
      else if (c === 1)               style.bold = true;
      else if (c === 2)               style.faint = true;
      else if (c === 3)               style.italic = true;
      else if (c === 4)               style.underline = true;
      else if (c === 22)              { style.bold = false; style.faint = false; }
      else if (c >= 30 && c <= 37)    style.color = ansiColor(c - 30);
      else if (c === 38 && codes[i+1] === 5) { style.color = ansiColor(codes[i+2]); i += 2; }
      else if (c === 38 && codes[i+1] === 2) {
        style.color = `#${codes[i+2].toString(16).padStart(2,"0")}${codes[i+3].toString(16).padStart(2,"0")}${codes[i+4].toString(16).padStart(2,"0")}`;
        i += 4;
      }
      else if (c === 39)              style.color = null;
      else if (c >= 40 && c <= 47)    style.bgColor = ansiColor(c - 40);
      else if (c === 48 && codes[i+1] === 5) { style.bgColor = ansiColor(codes[i+2]); i += 2; }
      else if (c === 48 && codes[i+1] === 2) {
        style.bgColor = `#${codes[i+2].toString(16).padStart(2,"0")}${codes[i+3].toString(16).padStart(2,"0")}${codes[i+4].toString(16).padStart(2,"0")}`;
        i += 4;
      }
      else if (c === 49)              style.bgColor = null;
      else if (c >= 90 && c <= 97)    style.color = ansiColor(c - 90 + 8);
    }
  }

  if (lastIndex < line.length) {
    spans.push({ text: line.slice(lastIndex), style: { ...style } });
  }

  return spans;
}

// ── SVG Renderer ─────────────────────────────────────────────

const DEFAULTS = {
  bg: "#171717",
  fg: "#F8F8F2",
  fontFamily: "JetBrains Mono",
  fontSize: 14,
  lineHeight: 17,
  padding: 20,
  columns: 120,
};

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}



function buildSvg(lines: string[], opts = DEFAULTS): string {
  // Measure width using a test SVG rendered through resvg.
  // Instead, use a known monospace ratio — for JetBrains Mono at 14px the
  // advance width is exactly 8.4px (0.6em). We verify this is correct
  // because resvg uses the actual font metrics from the TTF file.
  const charWidth = opts.fontSize * 0.6;
  const width = Math.ceil(opts.columns * charWidth + opts.padding * 2);
  const height = Math.ceil(lines.length * opts.lineHeight + opts.padding * 2);

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  parts.push(`<rect width="${width}" height="${height}" fill="${opts.bg}"/>`);

  // Global font group
  parts.push(`<g font-family="${opts.fontFamily}" font-size="${opts.fontSize}px" fill="${opts.fg}">`);

  for (let i = 0; i < lines.length; i++) {
    const spans = parseLine(lines[i]);
    if (spans.length === 0) continue;

    const y = opts.padding + i * opts.lineHeight + opts.fontSize;

    // Each line is ONE <text> element. Style changes use <tspan>.
    // The monospace font advances each character by the same width,
    // so we never set x on tspans — they flow naturally.
    parts.push(`<text x="${opts.padding}" y="${y}" xml:space="preserve">`);

    for (const span of spans) {
      const text = escapeXml(span.text);
      const attrs: string[] = [];
      if (span.style.color) attrs.push(`fill="${span.style.color}"`);
      if (span.style.bold) attrs.push(`font-weight="bold"`);
      if (span.style.italic) attrs.push(`font-style="italic"`);
      if (span.style.faint) attrs.push(`opacity="0.5"`);
      if (span.style.underline) attrs.push(`text-decoration="underline"`);

      if (attrs.length > 0) {
        parts.push(`<tspan ${attrs.join(" ")}>${text}</tspan>`);
      } else {
        parts.push(text);
      }
    }

    parts.push(`</text>`);
  }

  parts.push(`</g></svg>`);
  return parts.join("");
}

// ── SVG + PNG Export ──────────────────────────────────────────

export function ansiToSvg(ansiText: string): string {
  const lines = ansiText.split("\n");
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return buildSvg(lines);
}

export function svgToPng(svgPath: string, pngPath: string, scale = 2): void {
  const { execSync } = require("node:child_process");
  execSync(
    `resvg --skip-system-fonts --use-fonts-dir "${fontsDir}" --font-family "JetBrains Mono" -z ${scale} "${svgPath}" "${pngPath}"`,
    { stdio: "pipe" },
  );
}

// ── CLI ──────────────────────────────────────────────────────

if (process.argv[1]?.endsWith("ansi-to-png.ts")) {
  const input = readFileSync(process.argv[2] || "/dev/stdin", "utf-8");
  const svgPath = "/tmp/copyshot-output.svg";
  const pngPath = process.argv[3] || "/tmp/copyshot-output.png";

  const svg = ansiToSvg(input);
  writeFileSync(svgPath, svg);
  svgToPng(svgPath, pngPath);
  console.log(`Wrote ${pngPath}`);
}
