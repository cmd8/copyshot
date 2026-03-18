#!/usr/bin/env python3
"""Post-process freeze SVG to split emoji into separate <text> elements for color rendering."""

import re
import sys

EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001FFFF"  # emoticons, symbols, flags, etc
    "\U0000200D"             # zero-width joiner
    "\U0000FE0F"             # variation selector (emoji presentation)
    "]"
)


def has_emoji(text):
    return bool(EMOJI_RE.search(text or ""))


def split_text_by_emoji(text):
    """Split text into runs of (is_emoji, substring)."""
    if not text:
        return []
    runs = []
    current = []
    current_is_emoji = has_emoji(text[0])
    for ch in text:
        ch_is_emoji = bool(EMOJI_RE.match(ch))
        if ch_is_emoji != current_is_emoji:
            runs.append((current_is_emoji, "".join(current)))
            current = [ch]
            current_is_emoji = ch_is_emoji
        else:
            current.append(ch)
    if current:
        runs.append((current_is_emoji, "".join(current)))
    return runs


def process_svg(input_path, output_path):
    with open(input_path) as f:
        svg = f.read()

    font_size_match = re.search(r'font-size="([\d.]+)px"', svg)
    if not font_size_match:
        with open(output_path, "w") as f:
            f.write(svg)
        return
    font_size = float(font_size_match.group(1))
    char_width = font_size * 0.6

    font_family_match = re.search(r'<g[^>]*font-family="([^"]*)"', svg)
    base_font = font_family_match.group(1) if font_family_match else "JetBrains Mono"

    text_pattern = re.compile(r'(<text\s[^>]*>)(.*?)(</text>)', re.DOTALL)

    def replace_text_element(match):
        text_open = match.group(1)
        inner = match.group(2)

        tspan_texts = re.findall(r'<tspan[^>]*>([^<]*)</tspan>', inner)
        if not any(has_emoji(t) for t in tspan_texts):
            return match.group(0)

        x_match = re.search(r'x="([\d.]+)(?:px)?"', text_open)
        y_match = re.search(r'y="([\d.]+)(?:px)?"', text_open)
        if not x_match or not y_match:
            return match.group(0)
        base_x = float(x_match.group(1))
        y = y_match.group(1)

        tspan_pattern = re.compile(r'<tspan([^>]*)>([^<]*)</tspan>')
        tspans = tspan_pattern.findall(inner)

        new_elements = []
        x_offset = 0.0

        for attrs_str, content in tspans:
            if not content:
                continue

            dx_match = re.search(r'dx="([\d.]+)(?:px)?"', attrs_str)
            if dx_match:
                x_offset += float(dx_match.group(1))

            fill_match = re.search(r'fill="([^"]*)"', attrs_str)
            fill = fill_match.group(1) if fill_match else ""
            fill_attr = f' fill="{fill}"' if fill else ""

            runs = split_text_by_emoji(content)
            for is_emoji, run_text in runs:
                if not run_text:
                    continue

                if is_emoji:
                    new_elements.append(
                        f'<text x="{base_x + x_offset}px" y="{y}px" '
                        f'font-family="Apple Color Emoji" font-size="{font_size}px" '
                        f'xml:space="preserve">{run_text}</text>'
                    )
                else:
                    new_elements.append(
                        f'<text x="{base_x + x_offset}px" y="{y}px" '
                        f'font-family="{base_font}" font-size="{font_size}px"{fill_attr} '
                        f'xml:space="preserve">{run_text}</text>'
                    )
                x_offset += len(run_text) * char_width

        if new_elements:
            return "\n".join(new_elements)
        return match.group(0)

    svg = text_pattern.sub(replace_text_element, svg)

    with open(output_path, "w") as f:
        f.write(svg)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: fix-emoji-svg.py <input.svg> <output.svg>", file=sys.stderr)
        sys.exit(1)
    process_svg(sys.argv[1], sys.argv[2])
