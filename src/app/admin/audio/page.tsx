"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { ApiError, apiGet, apiSend, putFile } from '@/components/audio/api'
import { formatBytes, formatDuration } from '@/components/audio/format'

interface AdminTrack {
  id: string
  source: 'repo' | 'website'
  repo_path: string | null
  kind: 'music' | 'sfx'
  category: string
  title: string
  description: string | null
  bytes: number
  duration_seconds: number | null
  status: 'published' | 'hidden' | 'removed'
}

interface AdminData {
  migrated: boolean
  repo: { configured: boolean; repo?: string; branch?: string; path?: string }
  tracks: AdminTrack[]
  players?: { uploads: number; upload_bytes: number; playlists: number }
}

interface SyncReport {
  in_repo: number
  unchanged: number
  uploaded: string[]
  removed: string[]
  skipped: { path: string; reason: string }[]
  remaining: number
}

// The game's music states (assets/audio/music/<state>/). The first four are
// the stations of the in-game radio.
const MUSIC_CATEGORIES = [
  ['playing', 'Deep Space FM · exploring'],
  ['combat', 'Battle Wave · combat'],
  ['station', 'Dock Radio · docked'],
  ['boss', 'Epic Encounters · bosses'],
  ['game_start', 'Deep Space FM · game start'],
  ['world_map', 'Deep Space FM · world map'],
  ['main_menu', 'Title themes · main menu'],
  ['load_menu', 'Title themes · load menu'],
  ['game_over', 'Title themes · game over'],
]
const SFX_CATEGORIES = ['player', 'cyl', 'enemy', 'impacts', 'station', 'ui', 'progress', 'world', 'general']

const STATUS_STYLES: Record<AdminTrack['status'], string> = {
  published: 'bg-green-500/20 text-green-300 border-green-500/30',
  hidden: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  removed: 'bg-red-500/20 text-red-300 border-red-500/30',
}

type Filter = 'all' | 'music' | 'sfx' | 'hidden' | 'removed'

function measureDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const probe = new Audio()
    const finish = (value: number | null) => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(value)
    }
    const timer = setTimeout(() => finish(null), 8000)
    probe.preload = 'metadata'
    probe.onloadedmetadata = () => finish(Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : null)
    probe.onerror = () => finish(null)
    probe.src = url
  })
}

export default function AdminAudioPage() {
  const router = useRouter()
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const [syncing, setSyncing] = useState(false)
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null)

  const [kind, setKind] = useState<'music' | 'sfx'>('music')
  const [category, setCategory] = useState('playing')
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const say = (kind: 'ok' | 'error', text: string) => setMessage({ kind, text })
  const explain = (error: unknown, fallback: string) => say('error', error instanceof ApiError ? error.message : fallback)

  const load = useCallback(async () => {
    try {
      setData(await apiGet<AdminData>('/api/admin/audio'))
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        router.replace(error.status === 401 ? '/login?redirect=/admin/audio' : '/dashboard')
        return
      }
      setMessage({ kind: 'error', text: 'Could not load the audio catalogue.' })
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  const sync = async () => {
    setSyncing(true)
    setMessage(null)
    const total: SyncReport = { in_repo: 0, unchanged: 0, uploaded: [], removed: [], skipped: [], remaining: 0 }
    try {
      // Each call uploads a batch; keep going until nothing is waiting.
      for (let round = 0; round < 40; round++) {
        const report = await apiSend<SyncReport>('POST', '/api/admin/audio/sync')
        total.in_repo = report.in_repo
        total.unchanged = report.unchanged
        total.uploaded.push(...report.uploaded)
        total.removed.push(...report.removed)
        total.skipped = report.skipped
        total.remaining = report.remaining
        setSyncReport({ ...total })
        if (!report.remaining || !report.uploaded.length) break
      }
      await load()
      say('ok', total.uploaded.length || total.removed.length ? 'Synced with the game repository.' : 'Already up to date.')
    } catch (error) {
      explain(error, 'The sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  const patch = async (track: AdminTrack, body: Record<string, unknown>) => {
    try {
      const { track: updated } = await apiSend<{ track: AdminTrack }>('PATCH', `/api/admin/audio/${track.id}`, body)
      setData((d) => (d ? { ...d, tracks: d.tracks.map((t) => (t.id === track.id ? updated : t)) } : d))
    } catch (error) {
      explain(error, 'Could not save that change.')
    }
  }

  const remove = async (track: AdminTrack) => {
    if (!window.confirm(`Delete "${track.title}"? It also leaves every player's stations and favorites.`)) return
    try {
      await apiSend('DELETE', `/api/admin/audio/${track.id}`)
      setData((d) => (d ? { ...d, tracks: d.tracks.filter((t) => t.id !== track.id) } : d))
    } catch (error) {
      explain(error, 'Could not delete that track.')
    }
  }

  const upload = async (file: File) => {
    setMessage(null)
    setUploading(0)
    let trackId: string | null = null
    try {
      const duration = await measureDuration(file)
      const slot = await apiSend<{ track_id: string; upload_url: string; content_type: string }>('POST', '/api/admin/audio', {
        filename: file.name,
        size: file.size,
        kind,
        category,
        title: title.trim() || undefined,
      })
      trackId = slot.track_id
      await putFile(slot.upload_url, file, slot.content_type, setUploading)
      await apiSend('PATCH', `/api/admin/audio/${slot.track_id}`, { finalize: true, duration_seconds: duration })
      trackId = null
      setTitle('')
      // Refresh first, so the track is in the table when the message appears.
      await load()
      say('ok', `Published "${file.name}".`)
    } catch (error) {
      if (trackId) apiSend('DELETE', `/api/admin/audio/${trackId}`).catch(() => {})
      explain(error, 'The upload failed.')
    } finally {
      setUploading(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const tracks = data?.tracks ?? []
  const counts = useMemo(
    () => ({
      all: tracks.length,
      music: tracks.filter((t) => t.kind === 'music' && t.status === 'published').length,
      sfx: tracks.filter((t) => t.kind === 'sfx' && t.status === 'published').length,
      hidden: tracks.filter((t) => t.status === 'hidden').length,
      removed: tracks.filter((t) => t.status === 'removed').length,
    }),
    [tracks]
  )
  const shown = tracks.filter((t) =>
    filter === 'all' ? true : filter === 'hidden' || filter === 'removed' ? t.status === filter : t.kind === filter && t.status === 'published'
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center text-slate-400">Loading the audio catalogue…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Header />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-4xl font-bold text-transparent">Audio Library</h1>
            <p className="mt-2 text-slate-400">
              What players hear on{' '}
              <Link href="/audio" className="text-cyan-300 underline underline-offset-2">
                /audio
              </Link>{' '}
              and on the in-game radio.
            </p>
          </div>
          <Link href="/admin" className="whitespace-nowrap rounded-lg bg-slate-800 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-700">
            ← Dashboard
          </Link>
        </div>

        {message && (
          <div
            role={message.kind === 'error' ? 'alert' : 'status'}
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              message.kind === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-green-500/30 bg-green-500/10 text-green-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {data && !data.migrated && (
          <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
            The database isn&rsquo;t ready: apply <code className="font-mono">supabase/migrations/20261112_audio01_library_and_radio.sql</code>, then
            reload this page.
          </div>
        )}

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* sync */}
          <section className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-slate-100">Game repository</h2>
            {data?.repo.configured ? (
              <p className="mt-1 text-sm text-slate-400">
                <span className="font-mono text-slate-300">
                  {data.repo.repo}@{data.repo.branch}
                </span>{' '}
                · <span className="font-mono">{data.repo.path}</span>. A sync copies new and changed files here and retires the ones that left the
                repository.
              </p>
            ) : (
              <p className="mt-1 text-sm text-yellow-200">
                Not connected. Set <code className="font-mono">GAME_REPO_TOKEN</code> (a GitHub token that can read the game repository) in the
                site&rsquo;s environment, then redeploy.
              </p>
            )}
            <button
              type="button"
              onClick={sync}
              disabled={syncing || !data?.repo.configured || !data?.migrated}
              className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync from the game repository'}
            </button>
            {syncReport && (
              <div className="mt-4 space-y-1 text-sm text-slate-300" aria-live="polite">
                <div>
                  {syncReport.in_repo} files in the repository · {syncReport.uploaded.length} uploaded · {syncReport.removed.length} retired
                  {syncing && syncReport.remaining > 0 && ` · ${syncReport.remaining} to go`}
                </div>
                {syncReport.skipped.map((s) => (
                  <div key={s.path} className="text-yellow-200">
                    Skipped <span className="font-mono">{s.path}</span>: {s.reason}
                  </div>
                ))}
                {!syncing && syncReport.remaining > 0 && (
                  <div className="text-yellow-200">{syncReport.remaining} files are still waiting. Run the sync again.</div>
                )}
              </div>
            )}
          </section>

          {/* upload */}
          <section className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-slate-100">Add a track</h2>
            <p className="mt-1 text-sm text-slate-400">
              For music the repository doesn&rsquo;t carry. OGG or MP3 is best; a file can be up to 50 MB. Players&rsquo; games download it for the
              station you choose.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-300">
                Kind
                <select
                  value={kind}
                  onChange={(e) => {
                    const next = e.target.value as 'music' | 'sfx'
                    setKind(next)
                    setCategory(next === 'music' ? 'playing' : 'general')
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  <option value="music">Music</option>
                  <option value="sfx">Sound effect</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">
                {kind === 'music' ? 'Plays on' : 'Group'}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  {kind === 'music'
                    ? MUSIC_CATEGORIES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))
                    : SFX_CATEGORIES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                </select>
              </label>
              <label className="text-sm text-slate-300 sm:col-span-2">
                Title <span className="text-slate-500">(optional; taken from the file name otherwise)</span>
                <input
                  value={title}
                  maxLength={120}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </label>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".ogg,.mp3,.wav,.flac"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading !== null || !data?.migrated}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading !== null ? `Uploading ${Math.round(uploading * 100)}%` : 'Choose a file and publish'}
            </button>
          </section>
        </div>

        {data?.players && (
          <p className="mb-4 text-sm text-slate-400">
            Players have built {data.players.playlists} {data.players.playlists === 1 ? 'station' : 'stations'} and uploaded {data.players.uploads}{' '}
            {data.players.uploads === 1 ? 'track' : 'tracks'} ({formatBytes(data.players.upload_bytes)}).
          </p>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', 'music', 'sfx', 'hidden', 'removed'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
                filter === f ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f === 'sfx' ? 'Sound effects' : f} <span className="opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/60">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Where it plays</th>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 text-right font-medium">Length</th>
                <th className="px-4 py-3 text-right font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {shown.map((track) => (
                <tr key={track.id} className="text-slate-200">
                  <td className="px-4 py-2">
                    <input
                      defaultValue={track.title}
                      key={track.title}
                      maxLength={120}
                      aria-label={`Title of ${track.title}`}
                      onBlur={(e) => {
                        const next = e.target.value.trim()
                        if (next && next !== track.title) patch(track, { title: next })
                        else e.target.value = track.title
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      className="w-full min-w-[12rem] rounded border border-transparent bg-transparent px-2 py-1 hover:border-slate-700 focus:border-cyan-500 focus:bg-slate-950 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-slate-300">
                    {track.kind === 'music' ? 'Music' : 'SFX'} · <span className="font-mono text-xs">{track.category}</span>
                  </td>
                  <td className="max-w-[16rem] truncate px-4 py-2 font-mono text-xs text-slate-400" title={track.repo_path ?? undefined}>
                    {track.repo_path ?? 'uploaded here'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">{formatDuration(track.duration_seconds)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">{formatBytes(track.bytes)}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[track.status]}`}>{track.status}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    {track.status !== 'removed' && (
                      <button
                        type="button"
                        onClick={() => patch(track, { status: track.status === 'published' ? 'hidden' : 'published' })}
                        className="rounded px-2 py-1 text-cyan-300 hover:bg-slate-800"
                      >
                        {track.status === 'published' ? 'Hide' : 'Publish'}
                      </button>
                    )}
                    {(track.source === 'website' || track.status === 'removed') && (
                      <button type="button" onClick={() => remove(track)} className="rounded px-2 py-1 text-red-300 hover:bg-slate-800">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    {tracks.length ? 'Nothing matches this filter.' : 'No tracks yet. Run a sync, or add one above.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
