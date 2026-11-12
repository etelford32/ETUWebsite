/**
 * AUDIO-01: how a file under the game repository's `assets/audio` becomes a
 * row in `audio_tracks`. Pure functions, no I/O.
 *
 * The layout is the game's own (AUDIOREPO-01):
 *
 *   music/<state>/<track>.ogg   music for one music state; `<state>` is the
 *                               category (playing, combat, boss, station ...)
 *   sfx/<group>/<sound>.wav     a sound effect; `<group>` is the category
 *   disabled/**                 turned off in the game; never listed
 *   <file>.wav                  the original loose files. Most are early
 *                               placeholder takes, several byte-identical
 *                               under two names, so they import hidden; an
 *                               admin can publish any of them. The ones named
 *                               in ROOT_FILES import as listed.
 */

import { AUDIO_FORMATS, audioExtension } from './config'

export interface ClassifiedTrack {
  repo_path: string
  kind: 'music' | 'sfx'
  category: string
  title: string
  mime_type: string
  status: 'published' | 'hidden'
}

/** Titles the file name alone would get wrong, by lower-case stem. */
const TITLES: Record<string, string> = {
  exploreintrovocal: 'Explore the Universe (Title Theme)',
  northern_winds_atmosphere: 'Northern Winds',
  world_map_loop: 'World Map',
  character_screen: 'Character Screen',
}

/** Loose files at the root of assets/audio that are music, by stem. */
const ROOT_FILES: Record<string, { kind: 'music'; category: string }> = {
  exploreintrovocal: { kind: 'music', category: 'main_menu' },
  character_screen: { kind: 'music', category: 'character_screen' },
}

const SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'the', 'to'])

function stemOf(path: string): string {
  const name = path.split('/').pop() ?? path
  return name.replace(/\.[A-Za-z0-9]+$/, '')
}

/** `cyl_laser_shot` -> `Cyl Laser Shot`; `Boost1` -> `Boost 1`. */
export function titleFromStem(stem: string): string {
  const known = TITLES[stem.toLowerCase()]
  if (known) return known
  const words = stem
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .split(/[\s_\-]+/)
    .filter(Boolean)
  const title = words
    .map((word, i) => {
      const lower = word.toLowerCase()
      if (i > 0 && SMALL_WORDS.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
  return (title || stem).slice(0, 120)
}

function categoryToken(folder: string): string | null {
  const token = folder.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 40)
  return /^[a-z0-9_]{1,40}$/.test(token) ? token : null
}

/**
 * Classify `path`, relative to assets/audio. Null for anything that is not
 * a listable audio file.
 */
export function classifyRepoPath(path: string): ClassifiedTrack | null {
  const clean = path.replace(/^\/+/, '')
  const ext = audioExtension(clean)
  if (!ext) return null
  const parts = clean.split('/')
  if (parts.some((p) => !p || p === '.' || p === '..')) return null
  const stem = stemOf(clean)
  const base = { repo_path: clean, title: titleFromStem(stem), mime_type: AUDIO_FORMATS[ext] }

  if (parts.length === 1) {
    const known = ROOT_FILES[stem.toLowerCase()]
    if (known) return { ...base, ...known, status: 'published' }
    return { ...base, kind: 'sfx', category: 'general', status: 'hidden' }
  }

  const [top, group] = parts
  if (top === 'disabled') return null
  if (top === 'music') {
    const category = parts.length >= 3 ? categoryToken(group) : 'playing'
    return category ? { ...base, kind: 'music', category, status: 'published' } : null
  }
  if (top === 'sfx') {
    const category = parts.length >= 3 ? categoryToken(group) : 'general'
    return category ? { ...base, kind: 'sfx', category, status: 'published' } : null
  }
  // A folder the game has not told us about: keep it out of sight.
  return { ...base, kind: 'sfx', category: categoryToken(top) ?? 'general', status: 'hidden' }
}

/** Where a repo file lives in the game-audio bucket. */
export function repoStoragePath(repoPath: string): string {
  return `repo/${repoPath}`
}
