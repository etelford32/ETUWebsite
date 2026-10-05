# ETU 2175 — Official Title Typography

Reference artwork: [`public/brand/etu-title-typography.webp`](../public/brand/etu-title-typography.webp)
Live specimen: `/typography`

Titles are built from **the letters of the official artwork itself**: heavy
chamfered block capitals with riveted silver plating peeled back to glowing
cyan crystal. Nothing is re-drawn; each letter is cut from the sheet.

## Using it

```tsx
import EtuTitle from '@/components/EtuTitle'

<EtuTitle as="h1" text={['Explore the', 'Universe 2175']} className="text-6xl md:text-8xl" />
```

| Prop | Default | |
|------|---------|-|
| `text` | — | A string, or one string per line. Words wrap naturally. |
| `as` | `h2` | Rendered tag (`h1`–`h4`, `p`, `div`, `span`). |
| `variant` | `cyan` | `cyan` (the artwork), `amber`, `violet` — hue-shifted energy for faction pages. |
| `intro` / `stagger` | `true` / `0.07` | Letters drop in one by one the first time the title is seen. |
| `interactive` | `true` | Hover lifts and charges letters; click sends a shockwave. |
| `glints` | `true` | Idle star glints on random letters. |

Size it with ordinary font-size classes: the letter (face + extrusion) is 0.8em tall.

Supported: A–Z and 0–9. Any other character falls back to plain styled text.

## How it works

```
scripts/extract-title-glyphs.py   cuts the letters out of the reference sheet
  → public/brand/etu-glyphs.webp          RGBA sprite atlas (solid body + glow)
  → public/brand/etu-glyphs-energy.webp   the cyan emission only, same layout
  → src/lib/etuTitle/spriteFont.ts        atlas metrics (generated)
src/components/EtuTitle.tsx       one <span class="etu-glyph"> per letter, positioned
                                  into the atlas with CSS variables; real text in an
                                  sr-only span for screen readers and search
src/lib/etuTitle/motion.ts        GlyphActor (one per letter: springs for position,
                                  tilt, scale, charge, flash) + TitleMotion (intro,
                                  hover, click shockwave, glints)
```

- The extractor subtracts the sheet's background, keeps each letter's solid
  body opaque and its glow as additive light, and gives every row the same
  frame so baselines line up.
- Each letter has three layers: the art, an energy layer that breathes in
  screen blend mode (pure CSS, phase-shifted per letter so a wave runs across
  the title), and a charge layer that TitleMotion drives on hover and impact.
- The rAF loop only runs while letters are moving. Reduced-motion users get a
  still title with no intro, glints or breathing.

## Digits

The sheet has no digits, so they are assembled from letters: 0 = O, 1 = I,
2 = mirrored S, 3 = mirrored E, 4 = H minus its lower-left leg, 5 = S, 6 = G,
7 = Z minus most of its base, 8 = B, 9 = G rotated. 2, 1, 7 and 5 read well;
6 and 9 are the weakest. For proper digits, generate a matching
`0123456789` sheet in the same style, add it to the extractor and rerun it.

## Regenerating

```
pip install numpy opencv-python-headless pillow
python3 scripts/extract-title-glyphs.py
```

## Guidelines

- Reserve it for page titles and hero moments — one or two per screen.
- Keep titles short. Section headings and body copy stay in Orbitron / Exo 2.
- Very large sizes (above ~8rem on high-DPI screens) upscale the source letters
  and soften slightly; a higher-resolution source sheet would fix that.
- Fonts are self-hosted with `next/font` (see `src/app/layout.tsx`). The CSP only
  allows fonts and stylesheets from `'self'`, so do not reintroduce a Google
  Fonts `<link>` or `@import`.
