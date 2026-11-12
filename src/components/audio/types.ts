/** What GET /api/audio/library returns, as the /audio page uses it. */

export interface RadioStationInfo {
  id: string
  name: string
  description: string
  categories: string[]
  color: string
}

export interface Dial {
  stations: RadioStationInfo[]
  themes: { id: string; name: string; description: string; color: string }
  sfx_labels: Record<string, string>
}

export interface Track {
  id: string
  kind: 'music' | 'sfx'
  category: string
  title: string
  description: string | null
  mime_type: string
  bytes: number
  duration_seconds: number | null
  favorite: boolean
}

export interface Upload {
  id: string
  title: string
  artist: string | null
  mime_type: string
  bytes: number
  duration_seconds: number | null
  created_at: string
  favorite: boolean
}

export interface ItemRef {
  type: 'track' | 'upload'
  id: string
}

export interface Playlist {
  id: string
  name: string
  description: string | null
  color: string
  sync_to_game: boolean
  updated_at: string
  items: ItemRef[]
}

export interface Limits {
  uploads_enabled: boolean
  max_upload_bytes: number
  max_uploads: number
  max_total_upload_bytes: number
  max_playlists: number
  max_playlist_items: number
}

export interface Library {
  dial: Dial
  tracks: Track[]
  uploads: Upload[]
  playlists: Playlist[]
  limits: Limits
  usage: { uploads: number; upload_bytes: number }
  steam_linked: boolean
}

export interface Preview {
  music: { title: string; category: string; duration_seconds: number | null }[]
  sfx_count: number
}

/** One thing the player can play: a game track or one of your uploads. */
export interface Playable extends ItemRef {
  title: string
  /** Second line: the station, the artist, "Your upload". */
  subtitle: string
  duration_seconds: number | null
  favorite: boolean
  /** Sound effects can't go on a station. */
  kind: 'music' | 'sfx' | 'upload'
}

export function refKey(ref: ItemRef): string {
  return `${ref.type}:${ref.id}`
}
