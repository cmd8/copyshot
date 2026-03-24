/**
 * Preprocess markdown: syntax-highlight fenced code blocks with shiki,
 * replacing their content with ANSI-colored text before passing to glow.
 */

import { createHighlighter, type Highlighter } from "shiki";

let hl: Highlighter | null = null;

const LANGS = [
  "javascript", "typescript", "python", "rust", "go", "bash", "shell",
  "json", "yaml", "html", "css", "sql", "markdown", "diff", "toml",
  "jsx", "tsx", "c", "cpp", "java", "ruby", "swift", "kotlin", "lua",
  "zig", "elixir", "haskell", "scala", "r", "php", "dockerfile",
];

async function getHighlighter(): Promise<Highlighter> {
  if (!hl) {
    hl = await createHighlighter({ themes: ["dracula"], langs: LANGS });
  }
  return hl;
}

function tokensToAnsi(tokens: any[][]): string {
  const RESET = "\x1b[0m";
  const lines: string[] = [];

  for (const line of tokens) {
    let out = "";
    for (const token of line) {
      const hex = token.color || "#F8F8F2";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      out += `\x1b[38;2;${r};${g};${b}m${token.content}${RESET}`;
    }
    lines.push(out);
  }

  return lines.join("\n");
}

const FENCE_RE = /^(`{3,})(\w*)\s*$/;

export async function highlightCodeBlocks(md: string): Promise<string> {
  const highlighter = await getHighlighter();
  const loadedLangs = new Set(highlighter.getLoadedLanguages());
  const lines = md.split("\n");
  const result: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const fenceMatch = lines[i].match(FENCE_RE);
    if (!fenceMatch) {
      result.push(lines[i]);
      i++;
      continue;
    }

    const fence = fenceMatch[1];
    const lang = fenceMatch[2];
    const codeLines: string[] = [];
    i++;

    // Collect lines until closing fence
    while (i < lines.length && !lines[i].startsWith(fence)) {
      codeLines.push(lines[i]);
      i++;
    }

    const code = codeLines.join("\n");

    if (lang && loadedLangs.has(lang)) {
      const tokens = highlighter.codeToTokens(code, { lang, theme: "dracula" });
      const highlighted = tokensToAnsi(tokens.tokens);
      // Emit as a fenced block without lang tag (so glow doesn't re-highlight)
      result.push(fence);
      result.push(highlighted);
      result.push(fence);
    } else {
      // No language or unsupported — pass through unchanged
      result.push(`${fence}${lang}`);
      for (const line of codeLines) result.push(line);
      result.push(fence);
    }

    if (i < lines.length) i++; // skip closing fence
  }

  return result.join("\n");
}

// CLI: preprocess a markdown file
if (process.argv[1]?.endsWith("highlight.ts")) {
  const { readFileSync } = await import("node:fs");
  const input = readFileSync(process.argv[2] || "/dev/stdin", "utf-8");
  const output = await highlightCodeBlocks(input);
  process.stdout.write(output);
}
