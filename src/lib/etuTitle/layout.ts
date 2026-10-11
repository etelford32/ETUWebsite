/**
 * Text layout for the ETU sprite font: which glyph each character uses, the
 * kerning to the next one, and how wide a line is. All widths are in sprite
 * px; `pxToEm` converts with the same scale CSS uses (--k in globals.css).
 */

import { ETU_SPRITE_FONT as FONT, type SpriteGlyph } from './spriteFont'

/** Letter depth (face + extrusion) in em. Keep in sync with --k in CSS. */
export const DEPTH_EM = 0.8
/** Space between letters, sprite px (--etu-track in CSS). */
export const TRACK = 12
/** Space between words, sprite px (--etu-gap in CSS). */
export const WORD_GAP = 64

export const pxToEm = (px: number) => (px * DEPTH_EM) / FONT.depth

export interface LaidGlyph {
  char: string
  /** null when the artwork has no glyph for this character. */
  glyph: SpriteGlyph | null
  /** Kerning to the next character in the word, sprite px (0 for the last). */
  kern: number
}

export interface LaidWord {
  text: string
  glyphs: LaidGlyph[]
  /** Width at the word's own scale, sprite px. */
  width: number
  /** Size relative to the title (1 = title size). */
  scale: number
}

/** Rough width of a fallback character (plain styled text), sprite px. */
const FALLBACK_WIDTH = 0.7 * FONT.depth

export function hasGlyph(char: string) {
  return char.toUpperCase() in FONT.glyphs
}

export interface LayoutOptions {
  /** Apply the optical kerning table (default true). */
  kerning?: boolean
  /** Per-word size multipliers, keyed by word (case-insensitive). */
  wordScale?: Record<string, number>
}

export function scaleFor(word: string, wordScale?: Record<string, number>) {
  if (!wordScale) return 1
  const key = Object.keys(wordScale).find((k) => k.toUpperCase() === word.toUpperCase())
  return key ? wordScale[key] : 1
}

export function layoutWord(word: string, { kerning = true, wordScale }: LayoutOptions = {}): LaidWord {
  const chars = Array.from(word.toUpperCase())
  const glyphs = chars.map((char, i) => ({
    char,
    glyph: FONT.glyphs[char] ?? null,
    kern: kerning && i < chars.length - 1 ? FONT.kerning[char + chars[i + 1]] ?? 0 : 0,
  }))
  const width = glyphs.reduce(
    (w, g, i) => w + (g.glyph ? g.glyph.advance : FALLBACK_WIDTH) + g.kern + (i < glyphs.length - 1 ? TRACK : 0),
    0,
  )
  const scale = scaleFor(word, wordScale)
  return { text: word, glyphs, width: width * scale, scale }
}

export function layoutLine(line: string, options: LayoutOptions = {}) {
  const words = line.split(/\s+/).filter(Boolean).map((w) => layoutWord(w, options))
  // the gap after a word is sized in that word's em (margin-right in CSS)
  const width = words.reduce((w, word, i) => w + word.width + (i ? WORD_GAP * words[i - 1].scale : 0), 0)
  return { words, width }
}

/** Width of the widest line, in em — what a title needs to stay unwrapped. */
export function titleWidthEm(lines: string[], options: LayoutOptions = {}) {
  return pxToEm(Math.max(0, ...lines.map((l) => layoutLine(l, options).width)))
}
