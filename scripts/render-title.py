#!/usr/bin/env python3
"""
Render text in the ETU 2175 title typography to a PNG — for social images,
Steam capsules, thumbnails, video overlays — using the same sprite font,
kerning and spacing as the website (public/brand/etu-glyphs.*).

Examples:
  python3 scripts/render-title.py "Explore the|Universe 2175" -o title.png
  python3 scripts/render-title.py "Megabot" --height 120 --bg "#05070d" -o megabot.png
  python3 scripts/render-title.py "Patch 0.4" --align left --padding 24 -o patch.png

Lines are separated by "|". Height is the letter depth (face + extrusion)
in px; the sprites are about 172 px deep, so larger sizes upscale and soften.
Needs: pillow
"""

import argparse
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = json.load(open(os.path.join(ROOT, 'public/brand/etu-glyphs.json'), encoding='utf-8'))
ATLAS = os.path.join(ROOT, 'public/brand/etu-glyphs.webp')

# Keep in sync with src/lib/etuTitle/layout.ts
TRACK = 12
WORD_GAP = 64
LINE_GAP = 0.1 / 0.8  # 0.1em between lines, in letter depths


def layout_line(line):
    """[(glyph, x)] in sprite px, and the line width."""
    placed = []
    x = 0
    words = line.upper().split()
    for wi, word in enumerate(words):
        if wi:
            x += WORD_GAP
        chars = [c for c in word if c in FONT['glyphs']]
        for i, ch in enumerate(chars):
            g = FONT['glyphs'][ch]
            placed.append((g, x))
            x += g['advance']
            if i < len(chars) - 1:
                x += TRACK + FONT['kerning'].get(ch + chars[i + 1], 0)
    return placed, x


def render(text, height, bg, align, padding):
    atlas = Image.open(ATLAS).convert('RGBA')
    depth, margin, frame = FONT['depth'], FONT['margin'], FONT['frameHeight']
    lines = [layout_line(l) for l in text.split('|')]
    width = max(w for _, w in lines)
    line_step = depth * (1 + LINE_GAP)
    canvas_w = width + 2 * margin
    canvas_h = int(line_step * (len(lines) - 1) + frame)
    out = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    for li, (placed, w) in enumerate(lines):
        offset = {'left': 0, 'center': (width - w) // 2, 'right': width - w}[align]
        y = int(li * line_step)
        for g, x in placed:
            cell = atlas.crop((g['x'], g['y'], g['x'] + g['w'], g['y'] + frame))
            out.alpha_composite(cell, (offset + x, y))

    scale = height / depth
    out = out.resize((max(1, round(out.width * scale)), max(1, round(out.height * scale))), Image.LANCZOS)
    if padding:
        padded = Image.new('RGBA', (out.width + 2 * padding, out.height + 2 * padding), (0, 0, 0, 0))
        padded.alpha_composite(out, (padding, padding))
        out = padded
    if bg != 'transparent':
        base = Image.new('RGBA', out.size, bg)
        base.alpha_composite(out)
        out = base.convert('RGB')
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('text', help='text to render; "|" separates lines')
    ap.add_argument('-o', '--out', default='title.png')
    ap.add_argument('--height', type=int, default=172, help='letter depth in px (default: native 172)')
    ap.add_argument('--bg', default='transparent', help='"transparent" or a colour like "#05070d"')
    ap.add_argument('--align', choices=['left', 'center', 'right'], default='center')
    ap.add_argument('--padding', type=int, default=0, help='extra px around the output')
    args = ap.parse_args()

    missing = sorted({c for c in args.text.upper() if c not in FONT['glyphs'] and c not in ' |'})
    if missing:
        print('note: no glyph for', ' '.join(missing), '— skipped')
    img = render(args.text, args.height, args.bg, args.align, args.padding)
    img.save(args.out)
    print(args.out, f'{img.width}x{img.height}')


if __name__ == '__main__':
    main()
