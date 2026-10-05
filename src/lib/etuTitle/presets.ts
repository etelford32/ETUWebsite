/**
 * Material presets for ETU 2175 title typography. `cyan` is the official
 * treatment from public/brand/etu-title-typography.webp; the others reuse
 * the same plating with a different energy colour for faction/event pages.
 */

export type EtuTitleVariant = 'cyan' | 'amber' | 'violet'

export interface EtuTitlePreset {
  /** Linear-ish RGB 0..1 of the energy/crystal light. */
  accent: [number, number, number]
  /** Glow intensity multiplier. */
  energy: number
  /** Share of each face that is exposed crystal rather than silver plating. */
  crystal: number
  /** Tile size as a fraction of the font size. */
  cellScale: number
  /** Extrusion length as a fraction of the font size. */
  depthScale: number
  /** Extrusion direction (y down), normalized. */
  extrudeDir: [number, number]
}

const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const dir = (x: number, y: number): [number, number] => {
  const l = Math.hypot(x, y)
  return [x / l, y / l]
}

const BASE: Omit<EtuTitlePreset, 'accent'> = {
  energy: 1,
  crystal: 0.5,
  cellScale: 0.058,
  depthScale: 0.1,
  extrudeDir: dir(0.32, 1),
}

export const ETU_TITLE_PRESETS: Record<EtuTitleVariant, EtuTitlePreset> = {
  cyan: { ...BASE, accent: hex('#22d3ee') },
  amber: { ...BASE, accent: hex('#fbbf24'), energy: 0.9 },
  violet: { ...BASE, accent: hex('#a78bfa'), energy: 1.1 },
}

export function resolvePreset(variant: EtuTitleVariant = 'cyan', energy?: number): EtuTitlePreset {
  const preset = ETU_TITLE_PRESETS[variant] ?? ETU_TITLE_PRESETS.cyan
  return energy === undefined ? preset : { ...preset, energy }
}
