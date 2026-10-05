# ETU 2175 — Official Title Typography

Reference artwork: [`public/brand/etu-title-typography.webp`](../public/brand/etu-title-typography.webp)
Live specimen: `/typography`

Every Explore the Universe 2175 title is set in heavy, squared letterforms built
like hull armour: silver plates over a crystalline core that leaks cyan energy
through the seams.

| Property  | Spec |
|-----------|------|
| Typeface  | Orbitron Black (900), uppercase, `+0.04em` tracking (`--etu-title-tracking`) |
| Material  | Irregular (Voronoi) tiles — patches of silver plating and exposed crystal |
| Energy    | Cyan `#22d3ee` — glowing tile seams, thin inner rim, halo, star sparkles |
| Depth     | Chamfered silver bevel lit from top-left; dark stacked-metal extrusion down-right |
| Motion    | Intro: tiles lock in left → right behind a scan beam. Ambient: seam pulses, energy wave, sparkle twinkle, cursor charge |
| Fallback  | Silver → cyan gradient text with a CSS drop-shadow extrusion |

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
| `intro` / `introDuration` | `true` / `2.2` | Tile-assembly intro the first time the title scrolls into view. |
| `animate` | `true` | Ambient loop after the intro. |
| `interactive` | `true` | Cursor charges nearby crystal tiles. |

Size it with ordinary font-size classes; the canvas follows the DOM text.

## How it works

- `src/components/EtuTitle.tsx` renders the title as real DOM text (selectable,
  indexed, read by screen readers, styled as the fallback) and lays a WebGL
  canvas over it. It measures each word's box, waits for the font, and
  re-measures on resize.
- `src/lib/etuTitle/glyphMask.ts` rasterises those words into a mask texture:
  sharp coverage, a narrow blur (bevel height field) and a wide blur (halo).
- `src/lib/etuTitle/shaders.ts` builds the material procedurally from the mask:
  Voronoi tiles, plating/crystal patches, bevel lighting, extrusion, halo,
  sparkles and the intro sweep.
- `src/lib/etuTitle/EtuTitleRenderer.ts` owns the WebGL context, timeline and
  render loop; `presets.ts` holds the material variants.

Runtime behaviour: renders only while on screen and the tab is visible; the
ambient loop runs at ~30fps; device pixel ratio is capped at 2 and canvas area
at 4MP; `prefers-reduced-motion` gets one static frame. Without WebGL (or after
a lost context) the CSS fallback shows.

## Guidelines

- Reserve it for page titles and hero moments, one or two per screen — each
  instance owns a WebGL context, and browsers cap them at around 16.
- Keep titles short. Section headings and body copy stay in Orbitron / Exo 2.
- Use `variant` for faction or event pages; keep `cyan` for the game title.
- Fonts are self-hosted with `next/font` (see `src/app/layout.tsx`). The CSP only
  allows fonts and stylesheets from `'self'`, so do not reintroduce a Google
  Fonts `<link>` or `@import`.
