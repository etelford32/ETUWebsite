/**
 * AUDIO-01: shared constants for the audio library (/audio), the admin
 * catalogue (/admin/audio) and the game's radio endpoint (/api/game/radio).
 *
 * Import-safe on both sides: no server-only modules, no secrets. Limits read
 * `process.env` and so are only meaningful on the server; the client gets
 * them from GET /api/audio/library.
 */

/** Private bucket for the game's own audio (repo sync + admin uploads). */
export const GAME_AUDIO_BUCKET = 'game-audio'
/** Private bucket for players' uploads. */
export const USER_AUDIO_BUCKET = 'user-audio'

/** How long a signed playback URL lasts, in seconds. */
export const STREAM_URL_TTL_SECONDS = 60 * 60
/** How long the game's download URLs last, in seconds. */
export const GAME_URL_TTL_SECONDS = 2 * 60 * 60

/**
 * The formats the game's music stream plays (etu.audio.soundtrack
 * AUDIO_EXTENSIONS), so anything a player uploads here also plays in-game.
 */
export const AUDIO_FORMATS = {
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
} as const

export type AudioExtension = keyof typeof AUDIO_FORMATS

export function audioExtension(filename: string): AudioExtension | null {
  const match = /\.([A-Za-z0-9]+)$/.exec(filename.trim())
  const ext = match?.[1].toLowerCase()
  return ext && ext in AUDIO_FORMATS ? (ext as AudioExtension) : null
}

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt(process.env[name] ?? '', 10)
  if (!Number.isFinite(raw)) return fallback
  return Math.min(max, Math.max(min, raw))
}

const MB = 1024 * 1024

export interface AudioLimits {
  uploads_enabled: boolean
  max_upload_bytes: number
  max_uploads: number
  max_total_upload_bytes: number
  max_playlists: number
  max_playlist_items: number
}

/**
 * Per-account limits. The user-audio bucket itself refuses anything over
 * 20 MB or outside the four audio types, whatever these say.
 */
export function audioLimits(): AudioLimits {
  return {
    uploads_enabled: !/^(0|off|false|no)$/i.test(process.env.AUDIO_UPLOADS_ENABLED ?? ''),
    max_upload_bytes: envInt('AUDIO_MAX_UPLOAD_MB', 20, 1, 20) * MB,
    max_uploads: envInt('AUDIO_MAX_UPLOADS', 25, 0, 500),
    max_total_upload_bytes: envInt('AUDIO_MAX_TOTAL_UPLOAD_MB', 200, 1, 10_000) * MB,
    max_playlists: envInt('AUDIO_MAX_PLAYLISTS', 12, 1, 100),
    max_playlist_items: envInt('AUDIO_MAX_PLAYLIST_ITEMS', 100, 1, 200),
  }
}

/** An admin upload of a soundtrack master may be this large (bucket cap). */
export const MAX_CATALOG_UPLOAD_BYTES = 50 * MB

export interface RadioStation {
  /** The game's station id (etu.audio.radio_stations.STATIONS). */
  id: string
  name: string
  description: string
  /** Music states it plays, in order; the game's `music/<state>/` folders. */
  categories: readonly string[]
  color: string
}

/**
 * The Intergalactic Radio's dial, as the game ships it. Keep in step with
 * `STATIONS` in the game's src/etu/audio/radio_stations.py.
 */
export const RADIO_STATIONS: readonly RadioStation[] = [
  {
    id: 'EXPLORATION',
    name: 'Deep Space FM',
    description: 'Ambient tracks for cosmic exploration',
    categories: ['playing', 'game_start', 'world_map'],
    color: '#0096ff',
  },
  {
    id: 'COMBAT',
    name: 'Battle Wave',
    description: 'High-energy combat music',
    categories: ['combat'],
    color: '#ff6464',
  },
  {
    id: 'STATION',
    name: 'Dock Radio',
    description: 'Relaxing tunes for station visits',
    categories: ['station'],
    color: '#64ff96',
  },
  {
    id: 'BOSS',
    name: 'Epic Encounters',
    description: 'Boss battle themes',
    categories: ['boss'],
    color: '#ff32c8',
  },
]

/**
 * Music that is on no in-game station (menu and screen themes). The website
 * lists it under one heading; the game keeps those tracks to their own
 * screens (AUDIOREPO-02).
 */
export const THEMES_GROUP = {
  id: 'THEMES',
  name: 'Title Themes',
  description: 'Menu and screen themes',
  color: '#a78bfa',
} as const

const STATION_CATEGORIES = new Set(RADIO_STATIONS.flatMap((s) => s.categories))

/** Does the in-game radio offer music of this category? */
export function isRadioCategory(category: string): boolean {
  return STATION_CATEGORIES.has(category)
}

export const SFX_CATEGORY_LABELS: Record<string, string> = {
  player: 'Your Ship',
  cyl: 'Cyl',
  enemy: 'Enemies',
  impacts: 'Impacts',
  station: 'Stations',
  ui: 'Interface',
  progress: 'Progress',
  world: 'The World',
  general: 'General',
}

export const PLAYLIST_COLORS = [
  '#22d3ee',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
  '#fb7185',
  '#fbbf24',
  '#34d399',
  '#f97316',
] as const

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
