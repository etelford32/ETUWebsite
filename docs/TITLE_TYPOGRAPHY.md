# ETU 2175 — Title Typography

The official title typography for Explore the Universe 2175, and the system
that turns it into a usable font on the website, in exported images and
(potentially) in the game.

- Reference artwork: [`public/brand/etu-title-typography.webp`](../public/brand/etu-title-typography.webp)
- Live specimen: [`/typography`](../src/app/typography/page.tsx)
- Component: [`src/components/EtuTitle.tsx`](../src/components/EtuTitle.tsx)
- Font builder: [`scripts/extract-title-glyphs.py`](../scripts/extract-title-glyphs.py)
- Image export: [`scripts/render-title.py`](../scripts/render-title.py)

---

## 1. The design

Heavy, squared block capitals with 45° chamfered corners and rectangular
counters, built like hull armour: riveted silver plating peeled back to a
core of dark crystal tiles whose seams glow cyan. Each letter is extruded
into stacked metal walls, has a cyan halo, and throws off star sparkles.

The look comes from a single illustrated sheet (`ETU` plus A–Z). The system
**does not redraw it**: every letter on screen is a pixel-for-pixel cut of
that sheet. That's the core decision of this work — see §11 for why.

## 2. Character set

| Characters | Source |
|------------|--------|
| A–Z | Cut directly from the sheet's three alphabet rows |
| 0 1 5 8 | Reuse O, I, S, B |
| 2 3 | Mirrored S, mirrored E |
| 4 | H with its lower-left leg erased |
| 7 | Z with most of its base erased (keeps a small foot) |
| 6 9 | G, and G rotated 180° — **weakest**, avoid in key titles |
| `-` | E's middle-arm end joined to its mirror image |
| `.` `,` | L's base-bar end joined to its mirror (a bevelled block) |
| `:` | Two dots |
| `'` `’` | A dot raised to the cap line |
| `!` | Top of I (cut edge softened) over a dot |
| `–` `—` | Same as `-` |

Pieces are joined at their *cut* edges, so every visible edge is a real
bevel from the artwork. Lowercase maps to capitals. Anything else renders as
plain styled text (Orbitron, silver→cyan) and is skipped by the image exporter.

## 3. Metrics

All font metrics are in **sprite px** (the sheet's resolution).

| Metric | Value | Meaning |
|--------|-------|---------|
| depth | 172 | Face top to the bottom of the extrusion — the "letter height" |
| margin | 16 | Glow kept around every glyph in its cell |
| frame | 204 | Cell height: margin + depth + margin |
| advance | per glyph | Width of the solid letter (glow and sparkles excluded) |
| tracking | 12 | Added between letters |
| word gap | 64 | Between words |
| kerning | 490 pairs | Optical adjustment between specific pairs (§4) |

On the web the depth is **0.8em**, so `--k = 0.8em / 172` converts sprite px
to em; lines are 1em apart plus a 0.1em gap. The constants live in
[`layout.ts`](../src/lib/etuTitle/layout.ts) (`DEPTH_EM`, `TRACK`,
`WORD_GAP`), are mirrored in CSS (`.etu-title` in `globals.css`) and in
`render-title.py`; change them together.

## 4. Spacing

**Advances.** Each letter's advance is the horizontal extent of its *solid*
metal and crystal — pixels well above the background (`SOLID_LEVEL`),
morphologically closed, with small detached blobs (sparkle bursts from the
painting) removed. Using the raw component bounds instead lets glow and
sparkles widen some letters and makes spacing uneven.

**Optical kerning.** Block capitals with diagonals (A V W X Y K, and L T)
leave visible holes next to each other. For every glyph the extractor builds
an edge profile: in 24 horizontal bands, how much air there is between the
advance box and the solid letter on each side. For a pair *ab* the gap per
band is `right(a) + left(b)`; the pair is pulled together by

```
kern = -min((min_gap - 4px) * 0.6, 48px)      (only if ≤ -2px)
```

so the tightest point keeps a small, consistent sliver of air. Straight pairs
(HH, OO) get nothing; examples: WA −22, AV −22, VA −28, TA −29, LY −34,
P. −46, C- −48. Tunables: `KERN_BANDS`, `KERN_TARGET`, `KERN_STRENGTH`,
`KERN_MAX` in the extractor. `/typography` shows the same text with and without.

## 5. Building the font

`python3 scripts/extract-title-glyphs.py` (needs numpy, opencv-python-headless, pillow):

1. **Background.** Erode the sheet with a 41 px window and blur it to get a
   smooth background estimate; subtract it to get the letters' own light.
2. **Bodies.** Threshold that light (`BODY_LEVEL`), close 9×9 so dark crystal
   cells join their letter, and take connected components. Each alphabet row
   must yield exactly its letters, sorted left to right.
3. **Frames.** Each row's median letter top is its face top; every glyph gets
   the same frame (margin + max depth + margin), so baselines line up across rows.
4. **Alpha.** Inside the body: the original pixels, fully opaque. Outside:
   the light within `MARGIN` px of *this* letter (never a neighbour's body),
   stored as additive glow. Combined as premultiplied colour + alpha.
5. **Solid mask** (§4) is kept as a fifth channel for advances and kerning.
6. **Digits and punctuation** are assembled with `mirror`, `rot180`,
   `erase`, `piece`, `hcat` and `over` (§2).
7. **Energy map.** The cyan emission alone (hue and brightness keyed),
   used to make the crystal pulse.
8. **Pack and write** (shelf packing, ~2048 px wide; identical glyphs share a cell):

| Output | Size | |
|--------|------|-|
| `public/brand/etu-glyphs.webp` | ~620 KB | Full-resolution RGBA atlas (wide screens only) |
| `public/brand/etu-glyphs-sm.webp` | ~200 KB | Half resolution — what every title lights up with |
| `public/brand/etu-glyphs-shadow.webp` | ~26 KB | Unlit silhouettes, quarter resolution (intro first paint) |
| `public/brand/etu-glyphs-energy.webp` | ~120 KB | Cyan emission, half resolution (fetched once lit) |
| `public/brand/etu-glyphs.json` | ~10 KB | Metrics + kerning (any tool or engine) |
| `src/lib/etuTitle/spriteFont.ts` | | The same metrics for the site |

Never edit the generated files by hand; change the script and rerun it.

### `etu-glyphs.json` format

```jsonc
{
  "art": "/brand/etu-glyphs.webp", "artSmall": "...", "energy": "...",
  "width": 2042, "height": 822,          // atlas size
  "frameHeight": 204, "margin": 16, "depth": 172,
  "glyphs": { "A": { "x": 0, "y": 0, "w": 216, "advance": 184 }, ... },
  "kerning": { "WA": -22, "AV": -22, ... }
}
```

A glyph's cell is `(x, y, w, frameHeight)`. To draw a run: for each glyph,
blit its cell with its left edge at `pen - margin` and top at `line - margin`,
then `pen += advance + tracking + kerning[pair]`. That is all a game engine
needs to use it as a bitmap font.

## 6. On the website

```tsx
import EtuTitle from '@/components/EtuTitle'

<EtuTitle as="h1" text={['Explore the', 'Universe 2175']} fit className="text-6xl md:text-8xl" />
```

| Prop | Default | |
|------|---------|-|
| `text` | — | A string, or one string per line. |
| `as` | `h2` | Rendered tag (`h1`–`h4`, `p`, `div`, `span`). |
| `fit` | `false` | Shrink (down to half size) so each line fits its container instead of wrapping. |
| `compact` | `false` | Use the half-resolution atlas — for titles under ~3rem. |
| `variant` | `cyan` | `amber` / `violet` hue-shift the energy for faction pages; silver barely changes. |
| `kerning` | `true` | Optical kerning. |
| `animate` | `true` | Any motion at all (`false` = a still title, no JS work). |
| `intro` / `stagger` | `true` / `0.055` | Start as unlit shadows; the holographic lighting powers on letter by letter once the art has loaded and the title is on screen. |
| `interactive` | `true` | Hover lifts and charges letters; click sends a shockwave. |
| `glints` | `true` | Idle star glints. |

Size it with ordinary font-size classes. Line structure comes from `text`;
inside a line, words wrap when they don't fit (unless `fit`).

**DOM.** The real text sits in an `sr-only` span for screen readers and
search; the visual is `aria-hidden`. Each glyph is
`span.etu-glyph` (width = advance, margin-right = tracking + kerning) holding
layers positioned into the atlas through CSS variables
(`--gx --gy --gw --ga --kern`, atlas size and URLs on the title):

- `__shadow` — the unlit silhouette (intro only).
- `__art` — the letter: half-res atlas, with the full-res one layered on top
  at ≥768px wide.
- `__energy` — the cyan emission in `screen` blend, breathing on a CSS loop
  phase-shifted per letter, so a slow wave of light runs across the title.
- `__charge` — the same emission, driven by JS on hover and impact.
- `__holo` — scanlines and a light band, masked to the letter's shape by the
  shadow atlas (intro only).

**Loading.** The component preloads the shadow atlas and the half-res atlas
with high priority, so they download with the HTML instead of after CSS and
hydration. The full-res atlas is only referenced inside a ≥768px media
query, so phones never fetch it and wide screens fetch it after the lights
are on. Measured on a
throttled mid-range phone (fast 4G, 4× CPU): shadows visible at ~0.3 s,
lights on at ~1.4 s (previously nothing showed until ~7.4 s and the title
finished at ~10 s). Phones never download the full-res atlas.

**Fit** uses CSS container units: the title is an `inline-size` container,
and its body's font-size is `clamp(0.5em, 100cqw / widest-line-em, 1em)`,
with the widest line computed from the metrics at render time. No JS, no
layout shift. Because of size containment, a `fit` title takes its width from
its parent: fine in blocks and grid cells; in a flex row it grows to fill the
free space (`flex: 1 1 auto`). Don't use `fit` in shrink-to-content contexts.

**Pages using it:** home hero, `/bosses`, `/factions`, `/devlog`,
`/press-kit`, and the `/typography` specimen.

## 7. Motion

[`motion.ts`](../src/lib/etuTitle/motion.ts) treats each letter as an object:

- `Spring` — damped spring (stiffness, damping ratio; < 1 overshoots).
- `GlyphActor` — one per letter: springs for x, y, tilt, scale and charge,
  plus flash. `apply()` writes `transform`, a brightness `filter` and the
  charge layer's opacity.
- `TitleMotion` — owns the actors and the interactions.

**Intro — lights on.** Titles render as unlit shadows straight from the
server. A tiny inline script (`powerOnScript`, emitted after each title's
markup) waits for the half-res atlas and for the title to be on screen, then
sets `data-lit` on it — before React hydrates. `TitleMotion` does the same
after hydration in case the script didn't run. `data-lit` starts a pure-CSS
sequence per letter, staggered by `--i × --etu-stagger`:

1. the hologram projects: cyan scanlines over the silhouette (`etu-holo`);
2. a bright band crosses the letter — staggered, the bands form one sweep;
3. the art flickers on like a tube catching, flares at 2.2× brightness and
   settles (`etu-power-on`), while the crystal flashes (`etu-energy-flash`);
4. the shadow fades out underneath (`etu-shadow-out`).

Each letter takes 1.1s; a 21-letter title is fully lit about 2.2s after the
lights come on. Without JS, the lights come on after 6s anyway.

**Interactions:**

  - **Hover**: proximity to the cursor (Gaussian, ~0.9em) lifts letters by up
    to 0.07em, scales them 5% and charges their crystal.
  - **Click**: a shockwave travels outward from the click; each letter gets
    an upward kick, a twist, a flash and a charge as it arrives.
  - **Idle**: every 1.8–4.6s a random letter gets a star glint on an edge.

The rAF loop runs only while something moves and stops when everything is at
rest; the power-on waits until the title is on screen; glints pause offscreen
and in background tabs. `prefers-reduced-motion` gets a lit, still title: no
power-on, hover, glints or breathing.

## 8. Outside the website

```
python3 scripts/render-title.py "Explore the|Universe 2175" --height 120 -o title.png
python3 scripts/render-title.py "Megabot" --bg "#05070d" --padding 32 -o megabot.png
```

`|` separates lines; `--height` is the letter depth in px (native 172 —
larger upscales and softens); `--align left|center|right`; transparent by
default. Same atlas, spacing and kerning as the site.

## 9. Guidelines

- Use it for titles and hero moments — one or two per screen. Section
  headings and body copy stay in Orbitron / Exo 2.
- Keep titles short and within the character set (§2). Avoid 6 and 9 in key
  titles until real digits exist.
- Use `fit` for long hero titles, `compact` for anything under ~3rem,
  `animate={false}` where several titles share a screen.
- Keep `cyan` for the game's own title; variants are for faction/event pages.
- Fonts (Orbitron, Exo 2, JetBrains Mono) are self-hosted with `next/font`.
  The CSP only allows fonts and stylesheets from `'self'`, so never add a
  Google Fonts `<link>` or `@import`.

## 10. Known limitations and next steps

- **Digits and punctuation are assembled**, not drawn. A `0123456789` sheet
  (plus `& ? / + #`) in the same style would replace them: add its row to
  `ROWS` in the extractor and drop the assembled versions.
- **Resolution.** Letters are ~172 px deep; above ~8rem on high-DPI screens
  they upscale and soften. A 2× export of the sheet fixes this with no code
  changes beyond rerunning the extractor.
- **Weight.** Wide screens still fetch the ~620 KB full atlas (after the
  lights are already on). Splitting it so a page loads only its glyphs would
  cut that further.
- **Lighting is baked.** Mirrored and rotated glyphs (2, 3, 9) have mirrored
  highlights; acceptable at title sizes.

## 11. History — how we got here

1. **Procedural WebGL (v1, v2).** First a shader painted the material over
   Orbitron; then a custom vector alphabet with a signed-distance-field
   atlas, per-letter actors, perspective walls and tile bevels. Both were
   stylised approximations: they never matched the painted detail of the
   artwork (plate cracks, rivets, the specific crystal colour and glow).
2. **The artwork as the font (v3, current).** Cut the real letters out of the
   sheet and engineer the typographic layer around them — metrics, spacing,
   kerning, extra glyphs, layout, fitting — plus the motion system. The look
   is exact by construction, the result works without WebGL, and the same
   assets serve the site, exported images and the game.

Along the way: the site's CSP was blocking Google Fonts, so the design-system
fonts had never loaded in production; they are now self-hosted.
