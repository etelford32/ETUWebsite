# ETU 2175 — Official Title Typography

Reference artwork: [`public/brand/etu-title-typography.webp`](../public/brand/etu-title-typography.webp)
Live specimen: `/typography`

Every Explore the Universe 2175 title is set in **ETU Block**: heavy, chamfered
capitals built like hull armour — riveted silver plates over a crystalline core
that leaks cyan energy through the seams.

| Property    | Spec |
|-------------|------|
| Letterforms | ETU Block — custom squared capitals with 45° chamfers and rectangular counters (A–Z, 0–9, `. , - : ! ? ' / + ·`). Lowercase maps to caps; unknown characters render as `?`. |
| Proportions | Cap height 0.74em; vertical strokes 0.25 cap, horizontals 0.21 cap; tracking 0.12 cap |
| Material    | Raised irregular tiles: patches of riveted, grained silver plating and dark crystal |
| Energy      | Cyan `#22d3ee` — glowing crystal seams, engraved panel line, halo, sparkles, glints |
| Depth       | Flat silver chamfer lit from top-left; stacked metal walls receding toward a vanishing point below the title |
| Motion      | Intro: letters drop in one by one and lock their tiles with a flash. Ambient: seam flicker, energy wave, dust, idle glints. Hover lifts and charges letters; click sends a shockwave. |
| Fallback    | The same glyphs as inline SVG with a silver → cyan fill and CSS extrusion |

## Using it

```tsx
import EtuTitle from '@/components/EtuTitle'

<EtuTitle as="h1" text={['Explore the', 'Universe 2175']} className="text-6xl md:text-8xl" />
```

| Prop | Default | |
|------|---------|-|
| `text` | — | A string, or one string per line. Words wrap naturally. |
| `as` | `h2` | Rendered tag (`h1`–`h4`, `p`, `div`, `span`). |
| `variant` | `cyan` | `cyan` (official), `amber`, `violet` — energy colour only. |
| `energy` | preset | Glow intensity multiplier. |
| `intro` / `stagger` | `true` / `0.075` | Drop-in intro the first time the title scrolls into view; seconds between letters (compressed for long titles). |
| `animate` | `true` | Ambient loop after the intro. |
| `interactive` | `true` | Hover lift/charge and click shockwave. |

Size it with ordinary font-size classes.

## How it works

```
EtuTitle.tsx           DOM: transparent real text + inline SVG of the glyphs (layout + fallback)
  └─ EtuTitleRenderer  WebGL context, render loop, choreography (intro, hover, pulse, glints)
       ├─ glyphs.ts    ETU Block glyph set as vector contours; layout + SVG path helpers
       ├─ atlas.ts     rasterises each glyph/size once; exact distance transform → R coverage,
       │               G inside distance, B outside distance
       ├─ actors.ts    Spring + GlyphActor — one object per letter (transform, reveal, flash,
       │               charge, glint)
       ├─ shaders.ts   per-letter quad, 3 passes: halo/sparkles (additive), walls, faces
       └─ presets.ts   material variants
```

- Each letter is a `GlyphActor`, so it can move, tilt, scale and flash on its
  own. New choreographies are a few lines in `actors.ts` / the renderer's
  `step()`.
- Tiles are seeded from each letter's rest position, so the plating reads as
  continuous across a word but travels with the letter when it moves.
- Re-layout on resize keeps every actor's animation state and only rebuilds the
  atlas when glyphs or sizes change.

Runtime behaviour: renders only while on screen and the tab is visible; drops
to ~30fps when nothing is moving; device pixel ratio is capped at 2 and canvas
area at 4MP; `prefers-reduced-motion` gets one static frame with no intro or
interaction. Without WebGL (or after a lost context) the SVG fallback shows.

## Guidelines

- Reserve it for page titles and hero moments, one or two per screen — each
  instance owns a WebGL context, and browsers cap them at around 16.
- Keep titles short. Section headings and body copy stay in Orbitron / Exo 2.
- Use `variant` for faction or event pages; keep `cyan` for the game title.
- To add or adjust a character, edit `glyphs.ts` and check it on `/typography`.
- Fonts are self-hosted with `next/font` (see `src/app/layout.tsx`). The CSP only
  allows fonts and stylesheets from `'self'`, so do not reintroduce a Google
  Fonts `<link>` or `@import`.
