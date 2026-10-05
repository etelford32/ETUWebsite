#!/usr/bin/env python3
"""
Cut the ETU 2175 title letters out of the official reference sheet
(public/brand/etu-title-typography.webp) into a sprite font:

  public/brand/etu-glyphs.webp         RGBA letters (solid body + glow)
  public/brand/etu-glyphs-sm.webp      the same at half resolution (small titles)
  public/brand/etu-glyphs-energy.webp  the cyan emission only, same layout
  public/brand/etu-glyphs.json         atlas metrics for any tool or engine
  src/lib/etuTitle/spriteFont.ts       the same metrics for the site (generated)

The sheet has A–Z only. Digits and punctuation are assembled from pieces
of letters (mirrored, rotated, erased, cut and re-joined) until a sheet
with those characters exists.

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
OUT_ART_SM = os.path.join(ROOT, 'public/brand/etu-glyphs-sm.webp')
OUT_ENERGY = os.path.join(ROOT, 'public/brand/etu-glyphs-energy.webp')
OUT_JSON = os.path.join(ROOT, 'public/brand/etu-glyphs.json')
OUT_TS = os.path.join(ROOT, 'src/lib/etuTitle/spriteFont.ts')

# Letter rows on the sheet: characters and the y-band holding their centres.
ROWS = [
    ('ABCDEFGHI', (320, 512)),
    ('JKLMNOPQR', (512, 700)),
    ('STUVWXYZ', (700, 890)),
]
MARGIN = 16        # px kept around each letter for its glow
BODY_LEVEL = 60    # brightness above background that counts as letter body
SOLID_LEVEL = 110  # ...and as solid metal, for measuring advance widths
SOLID_MIN_PX = 3   # columns with fewer solid px don't count toward the advance
KERN_BANDS = 24    # vertical bands in each glyph's edge profile
KERN_TARGET = 4    # px of air the tightest point of a pair should keep
KERN_STRENGTH = 0.6
KERN_MAX = 48
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


def solid_mask(own, sig):
    """The letter's metal and crystal, without glow or sparkles."""
    m = (own & (sig.max(2) > SOLID_LEVEL)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    # Drop sparkle bursts: keep only blobs of a real size.
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    if n <= 1:
        return m.astype(bool)
    keep = [i for i in range(1, n) if stats[i, 4] >= 0.12 * stats[1:, 4].max()]
    return np.isin(lab, keep)


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
            # Advance comes from the solid metal only: the component also holds
            # glow and stray sparkles, which would make spacing uneven.
            ys = slice(fy0, fy0 + frame_h)
            cs = slice(s[0], s[0] + s[2])
            solid = solid_mask(labels[ys, cs] == label, sig[ys, cs])
            cols = np.flatnonzero(solid.sum(0) >= SOLID_MIN_PX)
            bx0, bx1 = s[0] + cols[0], s[0] + cols[-1] + 1
            x0 = max(bx0 - MARGIN, 0)
            x1 = min(bx1 + MARGIN, w)
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
            solid = solid_mask(own > 0.5, sig[ys, xs]).astype(np.float32)
            letters[ch] = {
                # channels: premultiplied RGB, alpha, solid-metal mask (for kerning)
                'rgba': np.dstack([premul, alpha, solid]),
                'advance': int(bx1 - bx0),
                'height': frame_h,
            }
    return letters, frame_h, depth


def mirror(g):
    return {**g, 'rgba': g['rgba'][:, ::-1].copy()}


def rot180(g):
    return {**g, 'rgba': g['rgba'][::-1, ::-1].copy()}


def depth_of(g):
    return g['height'] - 2 * MARGIN


def erase(g, x0, x1, y0, y1):
    """Clear a box given as fractions of the letter's body box (x) and depth (y)."""
    out = {**g, 'rgba': g['rgba'].copy()}
    h = depth_of(g)
    adv = g['advance']
    ys = slice(max(MARGIN + int(y0 * h), 0), MARGIN + int(y1 * h) if y1 < 1 else g['height'])
    xs = slice(max(MARGIN + int(x0 * adv), 0), MARGIN + int(x1 * adv))
    out['rgba'][ys, xs] = 0
    return out


def piece(g, x0, x1, y0, y1, cut_left=False, cut_right=False, fade_bottom=0):
    """Cut a box out of a letter (fractions of body width / depth) as a new glyph.

    The glow margin is kept on natural edges and cleared on cut edges so
    pieces can be re-joined without seams. `fade_bottom` softens a cut
    bottom edge over that many px.
    """
    h = depth_of(g)
    adv = g['advance']
    c0 = int(x0 * adv)
    c1 = int(x1 * adv)
    rgba = g['rgba'][:, c0:c1 + 2 * MARGIN].copy()
    r0 = max(MARGIN + int(y0 * h), 0)
    r1 = min(MARGIN + int(y1 * h), g['height'])
    rgba[:r0] = 0
    rgba[r1:] = 0
    if fade_bottom:
        ramp = np.linspace(1, 0, fade_bottom)[:, None, None]
        rgba[r1 - fade_bottom:r1] *= ramp
    if cut_left:
        rgba[:, :MARGIN] = 0
    if cut_right:
        rgba[:, -MARGIN:] = 0
    return {'rgba': rgba, 'advance': c1 - c0, 'height': g['height']}


def blank(advance, height):
    return {'rgba': np.zeros((height, advance + 2 * MARGIN, 5), np.float32), 'advance': advance, 'height': height}


def over(base, top, dx, dy=0):
    """Composite `top` onto `base` (premultiplied), offset by px."""
    out = {**base, 'rgba': base['rgba'].copy()}
    t = np.roll(top['rgba'], dy, axis=0)
    if dy > 0:
        t[:dy] = 0
    elif dy < 0:
        t[dy:] = 0
    tw = t.shape[1]
    region = out['rgba'][:, dx:dx + tw]
    t = t[:, :region.shape[1]]
    solid = np.maximum(region[..., 4], t[..., 4])
    region[:] = t + region * (1 - t[..., 3:4])
    region[..., 4] = solid
    return out


def hcat(a, b):
    """Join two glyphs side by side: a's right edge meets b's left edge."""
    out = blank(a['advance'] + b['advance'], a['height'])
    out = over(out, a, 0)
    return over(out, b, a['advance'])


def edge_profile(g):
    """Air between the advance box and the solid letter, per vertical band.

    Returns (left, right) arrays of px; inf where the band is empty.
    """
    solid = g['rgba'][..., 4] > 0.5
    left_edge, right_edge = MARGIN, MARGIN + g['advance']
    bands = np.array_split(np.arange(g['height']), KERN_BANDS)
    left = np.full(KERN_BANDS, np.inf)
    right = np.full(KERN_BANDS, np.inf)
    for i, rows in enumerate(bands):
        cols = np.flatnonzero(solid[rows].any(0))
        if len(cols):
            left[i] = cols[0] - left_edge
            right[i] = right_edge - 1 - cols[-1]
    return left, right


def kerning(glyphs, chars):
    """Optical kerning: pull each pair together until its closest point keeps
    KERN_TARGET px of air (scaled by KERN_STRENGTH). Only nonzero pairs."""
    profiles = {c: edge_profile(glyphs[c]) for c in chars}
    pairs = {}
    for a in chars:
        for b in chars:
            gap = profiles[a][1] + profiles[b][0]
            gap = gap[np.isfinite(gap)]
            if not len(gap):
                continue
            k = -min(max(gap.min() - KERN_TARGET, 0) * KERN_STRENGTH, KERN_MAX)
            if k <= -2:
                pairs[a + b] = int(round(k))
    return pairs


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

    # Punctuation from re-joined letter ends, so every edge is a real bevel.
    arm = piece(L['E'], 0.42, 0.73, 0.33, 0.66, cut_left=True)    # E's middle arm, right end
    dash = hcat(mirror(arm), arm)
    foot = piece(L['L'], 0.6, 0.8, 0.6, 0.97, cut_left=True)      # L's base bar, right end
    dot = hcat(mirror(foot), foot)
    lift = -int(0.6 * depth)
    stem = piece(L['I'], 0.0, 1.0, -0.2, 0.55, fade_bottom=8)
    bang = over(stem, dot, max((stem['advance'] - dot['advance']) // 2, 0))
    glyphs.update({
        '-': dash,
        '.': dot,
        ',': dot,
        ':': over(dot, dot, 0, int(-0.42 * depth)),
        "'": over(blank(dot['advance'], frame_h), dot, 0, lift),
        '!': bang,
    })
    glyphs['’'] = glyphs["'"]
    glyphs['–'] = glyphs['-']
    glyphs['—'] = glyphs['-']

    # Shelf-pack into an atlas about 2048 px wide. Glyphs that reuse another
    # glyph unchanged share its cell.
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
        art[gy:gy + frame_h, gx:gx + gw] = rgba[..., :4]
        energy[gy:gy + frame_h, gx:gx + gw] = energy_map(rgba[..., :4])

    def save(arr, path, scale=1.0, quality=84):
        if scale != 1.0:
            arr = cv2.resize(arr, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        a = np.clip(arr[..., 3:4], 0, 1)
        straight = np.where(a > 1e-4, arr[..., :3] / np.maximum(a, 1e-4), 0)
        out = np.dstack([np.clip(straight, 0, 1), a]) * 255
        Image.fromarray(out.round().astype(np.uint8), 'RGBA').save(path, 'WEBP', quality=quality, alpha_quality=90, method=6)
        print(path, os.path.getsize(path) // 1024, 'KB')

    save(art, OUT_ART)
    save(art, OUT_ART_SM, scale=0.5, quality=82)
    # The energy layer is soft light: half resolution is plenty.
    save(energy, OUT_ENERGY, scale=0.5, quality=70)

    kern_chars = [c for c in order if c not in '’–—']
    kern = kerning(glyphs, kern_chars)
    for alias, src in (('’', "'"), ('–', '-'), ('—', '-')):
        for pair, k in list(kern.items()):
            if src in pair:
                kern[pair.replace(src, alias)] = k

    font = {
        'art': '/brand/etu-glyphs.webp',
        'artSmall': '/brand/etu-glyphs-sm.webp',
        'energy': '/brand/etu-glyphs-energy.webp',
        'width': int(width),
        'height': int(height),
        'frameHeight': int(frame_h),
        'margin': MARGIN,
        'depth': int(depth),
        'glyphs': {
            ch: {'x': int(rects[ch][0]), 'y': int(rects[ch][1]), 'w': int(rects[ch][2]), 'advance': int(glyphs[ch]['advance'])}
            for ch in order
        },
        'kerning': kern,
    }
    with open(OUT_JSON, 'w') as f:
        json.dump(font, f, indent=2, ensure_ascii=False)
        f.write('\n')

    with open(OUT_TS, 'w') as f:
        f.write('// Generated by scripts/extract-title-glyphs.py — do not edit by hand.\n')
        f.write('// Letters cut from public/brand/etu-title-typography.webp; digits and\n')
        f.write('// punctuation are assembled from pieces of letters. See docs/TITLE_TYPOGRAPHY.md.\n\n')
        f.write('export interface SpriteGlyph {\n  /** Cell in the atlas, px. */\n  x: number\n  y: number\n  w: number\n')
        f.write('  /** Width of the glyph body; the cell adds `margin` of glow each side. */\n  advance: number\n}\n\n')
        f.write('export const ETU_SPRITE_FONT = {\n')
        for key in ('art', 'artSmall', 'energy'):
            f.write(f"  {key}: '{font[key]}',\n")
        f.write(f"  width: {font['width']},\n  height: {font['height']},\n")
        f.write(f"  /** Every cell is this tall: margin + depth + margin. */\n  frameHeight: {font['frameHeight']},\n")
        f.write(f"  margin: {MARGIN},\n  /** Letter depth: face top to the bottom of the extrusion, px. */\n  depth: {font['depth']},\n")
        f.write('  glyphs: ' + json.dumps(font['glyphs'], indent=2, ensure_ascii=False).replace('\n', '\n  ') + ' as Record<string, SpriteGlyph>,\n')
        f.write('  /** Optical kerning, px added to the advance between a pair (nonzero pairs only). */\n')
        f.write('  kerning: ' + json.dumps(kern, ensure_ascii=False) + ' as Record<string, number>,\n')
        f.write('} as const\n')
    print(OUT_TS, f'{len(order)} glyphs, {len(kern)} kerning pairs, atlas {width}x{height}, frame {frame_h}')


if __name__ == '__main__':
    main()
