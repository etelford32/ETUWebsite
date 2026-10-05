#!/usr/bin/env python3
"""
Cut the ETU 2175 title letters out of the official reference sheet
(public/brand/etu-title-typography.webp) into a sprite font:

  public/brand/etu-glyphs.webp         RGBA letters (solid body + glow)
  public/brand/etu-glyphs-energy.webp  the cyan emission only, same layout
  src/lib/etuTitle/spriteFont.ts       atlas metrics (generated)

The sheet has A–Z only. Digits are assembled from letters (mirrored,
rotated or with strokes erased) until a digits sheet exists.

Usage: python3 scripts/extract-title-glyphs.py
Needs: numpy, opencv-python-headless, pillow
"""

import json
import os

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public/brand/etu-title-typography.webp')
OUT_ART = os.path.join(ROOT, 'public/brand/etu-glyphs.webp')
OUT_ENERGY = os.path.join(ROOT, 'public/brand/etu-glyphs-energy.webp')
OUT_TS = os.path.join(ROOT, 'src/lib/etuTitle/spriteFont.ts')

# Letter rows on the sheet: characters and the y-band holding their centres.
ROWS = [
    ('ABCDEFGHI', (320, 512)),
    ('JKLMNOPQR', (512, 700)),
    ('STUVWXYZ', (700, 890)),
]
MARGIN = 16        # px kept around each letter for its glow
BODY_LEVEL = 60    # brightness above background that counts as letter body
GUTTER = 2


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def load():
    img = cv2.imread(SRC, cv2.IMREAD_COLOR)[:, :, ::-1].astype(np.float32)
    # Smooth background estimate: erode away the letters, then blur.
    bg = cv2.erode(img, np.ones((41, 41), np.uint8))
    bg = cv2.GaussianBlur(bg, (0, 0), 15)
    sig = np.clip(img - bg, 0, 255)
    body = (sig.max(2) > BODY_LEVEL).astype(np.uint8)
    body = cv2.morphologyEx(body, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    _, labels, stats, _ = cv2.connectedComponentsWithStats(body, 8)
    return img, sig, labels, stats


def cut_letters(img, sig, labels, stats):
    """Return {char: RGBA float32 crop} with a shared frame per row."""
    found = []
    for chars, (y0, y1) in ROWS:
        comps = [
            (i, s) for i, s in enumerate(stats)
            if i > 0 and s[4] > 1500 and s[3] > 100 and y0 <= s[1] + s[3] / 2 < y1
        ]
        comps.sort(key=lambda c: c[1][0])
        assert len(comps) == len(chars), f'{chars}: found {len(comps)} components'
        face_top = int(np.median([s[1] for _, s in comps]))
        bottom = max(s[1] + s[3] for _, s in comps)
        found.append((chars, comps, face_top, bottom))

    depth = max(bottom - top for _, _, top, bottom in found)
    frame_h = depth + 2 * MARGIN
    letters = {}
    h, w = labels.shape
    for chars, comps, face_top, _ in found:
        fy0 = face_top - MARGIN
        for ch, (label, s) in zip(chars, comps):
            x0 = max(s[0] - MARGIN, 0)
            x1 = min(s[0] + s[2] + MARGIN, w)
            ys = slice(fy0, fy0 + frame_h)
            xs = slice(x0, x1)
            own = (labels[ys, xs] == label).astype(np.float32)
            other = ((labels[ys, xs] != label) & (labels[ys, xs] != 0)).astype(np.uint8)

            body_a = np.clip(cv2.GaussianBlur(own, (0, 0), 0.8) * 1.15, 0, 1)
            dist = cv2.distanceTransform((own < 0.5).astype(np.uint8), cv2.DIST_L2, 5)
            # Keep glow near this letter only, and never a neighbour's body.
            reach = (1 - smoothstep(MARGIN * 0.55, MARGIN, dist)) * (1 - cv2.dilate(other, np.ones((5, 5), np.uint8)))
            glow = sig[ys, xs] * reach[..., None]
            glow_a = np.clip(glow.max(2) / 255 * 1.6, 0, 1)

            # premultiplied: solid body over additive glow
            premul = img[ys, xs] / 255 * body_a[..., None] + glow / 255 * (1 - body_a[..., None])
            alpha = body_a + glow_a * (1 - body_a)
            letters[ch] = {
                'rgba': np.dstack([premul, alpha]),
                'advance': int(s[2]),
                'height': frame_h,
            }
    return letters, frame_h, depth


def mirror(g):
    return {**g, 'rgba': g['rgba'][:, ::-1].copy()}


def rot180(g):
    return {**g, 'rgba': g['rgba'][::-1, ::-1].copy()}


def erase(g, x0, x1, y0, y1):
    """Clear a box given as fractions of the letter's body box (x) and face depth (y)."""
    out = {**g, 'rgba': g['rgba'].copy()}
    h = g['height'] - 2 * MARGIN
    adv = g['advance']
    ys = slice(max(MARGIN + int(y0 * h), 0), MARGIN + int(y1 * h) if y1 < 1 else g['height'])
    xs = slice(max(MARGIN + int(x0 * adv), 0), MARGIN + int(x1 * adv))
    out['rgba'][ys, xs] = 0
    return out


def energy_map(rgba):
    """Isolate the cyan emission (premultiplied) for the pulse layer."""
    a = np.maximum(rgba[..., 3:4], 1e-4)
    c = rgba[..., :3] / a
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    cyan = np.clip((np.minimum(g, b) - r - 0.08) / 0.35, 0, 1) * np.clip((b - 0.35) / 0.4, 0, 1)
    e = cyan * rgba[..., 3]
    col = np.dstack([r * e, g * e, b * e])
    return np.dstack([col, e])


def main():
    img, sig, labels, stats = load()
    letters, frame_h, depth = cut_letters(img, sig, labels, stats)

    L = letters
    glyphs = dict(L)
    glyphs.update({
        '0': L['O'],
        '1': L['I'],
        '2': mirror(L['S']),
        '3': mirror(L['E']),
        '4': erase(L['H'], -0.2, 0.33, 0.55, 1.0),
        '5': L['S'],
        '6': L['G'],
        '7': erase(L['Z'], 0.4, 1.2, 0.64, 1.0),
        '8': L['B'],
        '9': rot180(L['G']),
    })

    # Shelf-pack into an atlas about 2048 px wide. Digits that reuse a letter
    # unchanged share its cell.
    order = list(glyphs.keys())
    limit = 2048
    x = y = 0
    rects = {}
    width = 0
    for ch in order:
        same = next((o for o in rects if glyphs[o]['rgba'] is glyphs[ch]['rgba']), None)
        if same:
            rects[ch] = rects[same]
            continue
        gw = glyphs[ch]['rgba'].shape[1]
        if x + gw > limit:
            x = 0
            y += frame_h + GUTTER
        rects[ch] = (x, y, gw)
        x += gw + GUTTER
        width = max(width, x)
    height = y + frame_h
    art = np.zeros((height, width, 4), np.float32)
    energy = np.zeros_like(art)
    for ch, (gx, gy, gw) in rects.items():
        rgba = glyphs[ch]['rgba']
        art[gy:gy + frame_h, gx:gx + gw] = rgba
        energy[gy:gy + frame_h, gx:gx + gw] = energy_map(rgba)

    def save(arr, path, scale=1.0, quality=84):
        if scale != 1.0:
            arr = cv2.resize(arr, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        a = np.clip(arr[..., 3:4], 0, 1)
        straight = np.where(a > 1e-4, arr[..., :3] / np.maximum(a, 1e-4), 0)
        out = np.dstack([np.clip(straight, 0, 1), a]) * 255
        Image.fromarray(out.round().astype(np.uint8), 'RGBA').save(path, 'WEBP', quality=quality, alpha_quality=90, method=6)
        print(path, os.path.getsize(path) // 1024, 'KB')

    save(art, OUT_ART)
    # The energy layer is soft light: half resolution is plenty.
    save(energy, OUT_ENERGY, scale=0.5, quality=70)

    metrics = {
        ch: {'x': int(rects[ch][0]), 'y': int(rects[ch][1]), 'w': int(rects[ch][2]), 'advance': int(glyphs[ch]['advance'])}
        for ch in order
    }
    with open(OUT_TS, 'w') as f:
        f.write('// Generated by scripts/extract-title-glyphs.py — do not edit by hand.\n')
        f.write('// Letters cut from public/brand/etu-title-typography.webp; digits are\n')
        f.write('// assembled from letters until a digits sheet exists.\n\n')
        f.write('export interface SpriteGlyph {\n  /** Cell in the atlas, px. */\n  x: number\n  y: number\n  w: number\n')
        f.write('  /** Width of the letter body; the cell adds `margin` of glow each side. */\n  advance: number\n}\n\n')
        f.write('export const ETU_SPRITE_FONT = {\n')
        f.write("  art: '/brand/etu-glyphs.webp',\n")
        f.write("  energy: '/brand/etu-glyphs-energy.webp',\n")
        f.write(f'  width: {int(width)},\n  height: {int(height)},\n')
        f.write(f'  /** Every cell is this tall: margin + letter depth (face + extrusion) + margin. */\n  frameHeight: {int(frame_h)},\n')
        f.write(f'  margin: {MARGIN},\n  /** Face top to the bottom of the extrusion, px. */\n  depth: {int(depth)},\n')
        f.write('  glyphs: ' + json.dumps(metrics, indent=2).replace('\n', '\n  ') + ' as Record<string, SpriteGlyph>,\n')
        f.write('} as const\n')
    print(OUT_TS, f'{len(order)} glyphs, atlas {width}x{height}, frame {frame_h}')


if __name__ == '__main__':
    main()
