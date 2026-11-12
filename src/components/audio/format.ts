/** `83.4` -> `1:23`; short sounds keep a decimal (`0.3s`). */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '–:––'
  if (seconds < 10 && seconds % 1 !== 0) return `${seconds.toFixed(1)}s`
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** Playback clock: always `m:ss`. */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const total = Math.floor(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  const mb = bytes / (1024 * 1024)
  return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`
}

/** Total running time of a list, e.g. `12 min` or `1 h 4 min`. */
export function formatRuntime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}
