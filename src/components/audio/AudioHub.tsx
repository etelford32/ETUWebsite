"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, Loader2, Lock, Play, Plus, Radio, Satellite, Shuffle, Trash2, Upload as UploadIcon, Zap } from 'lucide-react'
import { ApiError, apiGet, apiSend } from './api'
import { formatDuration, formatRuntime } from './format'
import PlayerBar from './PlayerBar'
import TrackList from './TrackList'
import { Dial, ItemRef, Library, Playable, Playlist, Preview, refKey, Upload } from './types'
import UploadPanel from './UploadPanel'
import { usePlayer } from './usePlayer'

const PLAYLIST_COLORS = ['#22d3ee', '#60a5fa', '#a78bfa', '#f472b6', '#fb7185', '#fbbf24', '#34d399', '#f97316']
const FAVORITES_COLOR = '#fbbf24'
const UPLOADS_COLOR = '#34d399'
const SFX_COLOR = '#f97316'

type Source =
  | { type: 'station'; id: string }
  | { type: 'themes' }
  | { type: 'favorites' }
  | { type: 'uploads' }
  | { type: 'playlist'; id: string }
  | { type: 'sfx' }

type Status = 'loading' | 'signed-out' | 'ready' | 'unavailable' | 'error'

const pill =
  'inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display text-xs font-bold uppercase tracking-[0.16em] transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100'

/** /audio below the hero: the sign-in gate, or the radio console. */
export default function AudioHub() {
  const [status, setStatus] = useState<Status>('loading')
  const [library, setLibrary] = useState<Library | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const data = await apiGet<any>('/api/audio/library')
      if (data.unavailable) {
        setStatus(data.authenticated ? 'unavailable' : 'signed-out')
      } else if (!data.authenticated) {
        setPreview(data.preview ?? null)
        setStatus('signed-out')
      } else {
        setLibrary(data as Library)
        setStatus('ready')
      }
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-300" role="status">
        <Loader2 className="mr-3 h-5 w-5 animate-spin text-cyan-300" /> Tuning in
      </div>
    )
  }
  if (status === 'signed-out') return <SignInGate preview={preview} />
  if (status === 'ready' && library) return <RadioConsole library={library} setLibrary={setLibrary} />
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <Satellite className="mx-auto h-10 w-10 text-slate-500" />
      <h2 className="mt-4 font-display text-xl font-bold text-white">
        {status === 'unavailable' ? 'The library is being set up' : 'No signal'}
      </h2>
      <p className="mt-2 text-slate-300">
        {status === 'unavailable'
          ? 'The audio library isn’t open yet. Check back soon.'
          : 'We couldn’t reach the audio library.'}
      </p>
      {status === 'error' && (
        <button type="button" onClick={load} className={`${pill} mt-6 bg-cyan-400 text-deep-900`}>
          Try again
        </button>
      )}
    </div>
  )
}

// ── signed out ───────────────────────────────────────────────────────────

const STEPS = [
  { title: 'Listen', body: 'The soundtrack by station, as the in-game radio plays it, and every sound effect in the game.' },
  { title: 'Build stations', body: 'Star the tracks you like and arrange your own stations for the Intergalactic Radio.' },
  {
    title: 'Bring your own music',
    body: 'Upload your own tracks. They stay private to your account and sit on your stations beside the soundtrack.',
  },
]

function SignInGate({ preview }: { preview: Preview | null }) {
  const music = preview?.music ?? []
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 lg:px-6 lg:py-16">
      <ol className="mb-12 grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="font-mono text-xs text-cyan-300">0{i + 1}</div>
            <div className="mt-1 font-display text-sm font-bold uppercase tracking-[0.14em] text-white">{step.title}</div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_60px_rgba(124,58,237,0.25)]">
          <Image
            src="/etu_soundtrack.png"
            alt="Explore the Universe 2175: The Official Soundtrack by the E.T."
            width={1536}
            height={1024}
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="h-auto w-full"
          />
        </div>

        <div>
          <div className="eyebrow mb-3 text-cyan-300">Members&rsquo; frequency</div>
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Sign in to tune in</h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-200">
            The soundtrack and every sound in the game are open to signed-in pilots. Star the tracks you like, build your own stations,
            and upload your own music to fly to. An account is free.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?redirect=/audio" className={`${pill} bg-cyan-400 text-deep-900`}>
              Sign in
            </Link>
            <Link
              href="/login?mode=signup&redirect=/audio"
              className={`${pill} border border-white/25 bg-white/5 text-white hover:bg-white/10`}
            >
              Create an account
            </Link>
          </div>

          {music.length > 0 && (
            <div className="mt-10">
              <div className="mb-3 flex items-center gap-3">
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.22em] text-slate-300">On the dial</h3>
                <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
              </div>
              <ul className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.03]">
                {music.slice(0, 8).map((track, i) => (
                  <li key={`${track.title}:${i}`} className="flex items-center gap-3 px-4 py-3">
                    <Lock className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{track.title}</span>
                    <span className="font-mono text-xs tabular-nums text-slate-400">{formatDuration(track.duration_seconds)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-slate-400">
                {music.length > 8 && `${music.length - 8} more tracks`}
                {music.length > 8 && !!preview?.sfx_count && ', and '}
                {!!preview?.sfx_count && `${preview.sfx_count} sound effects from the game`}
                {(music.length > 8 || !!preview?.sfx_count) && ' once you sign in.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ── signed in ────────────────────────────────────────────────────────────

function RadioConsole({ library, setLibrary }: { library: Library; setLibrary: React.Dispatch<React.SetStateAction<Library | null>> }) {
  const player = usePlayer()
  const dial: Dial = library.dial
  const [notice, setNotice] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)
  const [draft, setDraft] = useState<{ name: string; first?: Playable; saving: boolean } | null>(null)
  const [confirmDeleteStation, setConfirmDeleteStation] = useState(false)

  const update = useCallback(
    (change: (lib: Library) => Library) => setLibrary((lib) => (lib ? change(lib) : lib)),
    [setLibrary]
  )
  const fail = useCallback((error: unknown, fallback: string) => {
    setNotice({ kind: 'error', text: error instanceof ApiError ? error.message : fallback })
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  // ── everything playable, by key ──
  const stationFor = useCallback(
    (category: string) => dial.stations.find((s) => s.categories.includes(category)) ?? null,
    [dial]
  )
  const playables = useMemo(() => {
    const map = new Map<string, Playable>()
    for (const t of library.tracks) {
      const subtitle =
        t.kind === 'sfx' ? dial.sfx_labels[t.category] ?? 'Sound effect' : stationFor(t.category)?.name ?? dial.themes.name
      map.set(`track:${t.id}`, {
        type: 'track',
        id: t.id,
        title: t.title,
        subtitle,
        duration_seconds: t.duration_seconds,
        favorite: t.favorite,
        kind: t.kind,
      })
    }
    for (const u of library.uploads) {
      map.set(`upload:${u.id}`, {
        type: 'upload',
        id: u.id,
        title: u.title,
        subtitle: u.artist ?? 'Your upload',
        duration_seconds: u.duration_seconds,
        favorite: u.favorite,
        kind: 'upload',
      })
    }
    return map
  }, [library.tracks, library.uploads, dial, stationFor])

  const { refresh } = player
  useEffect(() => {
    refresh((key) => playables.get(key))
  }, [playables, refresh])

  const resolve = useCallback(
    (refs: ItemRef[]) => refs.map((ref) => playables.get(refKey(ref))).filter((p): p is Playable => !!p),
    [playables]
  )

  const music = useMemo(() => library.tracks.filter((t) => t.kind === 'music'), [library.tracks])
  const byStation = useMemo(() => {
    const out = new Map<string, Playable[]>()
    for (const station of dial.stations) {
      out.set(
        station.id,
        resolve(station.categories.flatMap((c) => music.filter((t) => t.category === c)).map((t) => ({ type: 'track', id: t.id })))
      )
    }
    return out
  }, [dial, music, resolve])
  const themes = useMemo(
    () => resolve(music.filter((t) => !stationFor(t.category)).map((t) => ({ type: 'track', id: t.id }))),
    [music, stationFor, resolve]
  )
  const favorites = useMemo(
    () => Array.from(playables.values()).filter((p) => p.favorite && p.kind !== 'sfx'),
    [playables]
  )
  const uploads = useMemo(() => resolve(library.uploads.map((u) => ({ type: 'upload', id: u.id }))), [library.uploads, resolve])
  const sfxGroups = useMemo(() => {
    const groups = new Map<string, Playable[]>()
    for (const t of library.tracks) {
      if (t.kind !== 'sfx') continue
      const list = groups.get(t.category) ?? []
      list.push(playables.get(`track:${t.id}`) as Playable)
      groups.set(t.category, list)
    }
    const order = Object.keys(dial.sfx_labels)
    return Array.from(groups.entries()).sort(
      (a, b) => (order.indexOf(a[0]) + 1 || 99) - (order.indexOf(b[0]) + 1 || 99) || a[0].localeCompare(b[0])
    )
  }, [library.tracks, playables, dial])
  const sfxCount = sfxGroups.reduce((n, [, list]) => n + list.length, 0)

  // Open on the first station that has signal.
  const [source, setSource] = useState<Source>(() => {
    const first = library.dial.stations.find((s) =>
      library.tracks.some((t) => t.kind === 'music' && s.categories.includes(t.category))
    )
    return first ? { type: 'station', id: first.id } : { type: 'themes' }
  })
  const select = useCallback((next: Source) => {
    setSource(next)
    setConfirmDeleteStation(false)
  }, [])

  // ── favourites ──
  const toggleFavorite = useCallback(
    async (item: Playable) => {
      const now = !(playables.get(refKey(item))?.favorite ?? item.favorite)
      const set = (value: boolean) =>
        update((lib) =>
          item.type === 'track'
            ? { ...lib, tracks: lib.tracks.map((t) => (t.id === item.id ? { ...t, favorite: value } : t)) }
            : { ...lib, uploads: lib.uploads.map((u) => (u.id === item.id ? { ...u, favorite: value } : u)) }
        )
      set(now)
      try {
        await apiSend(now ? 'POST' : 'DELETE', '/api/audio/favorites', { type: item.type, id: item.id })
      } catch (error) {
        set(!now)
        fail(error, 'Could not update your favorites.')
      }
    },
    [playables, update, fail]
  )

  // ── stations ──
  // Saves for one station go out one at a time, in order, and only the
  // latest reply is applied, so quick reordering can't land out of sequence.
  const chains = useRef(new Map<string, Promise<void>>())
  const latest = useRef(new Map<string, number>())

  const saveStation = useCallback(
    (id: string, body: Partial<Pick<Playlist, 'name' | 'color' | 'sync_to_game' | 'items'>>) => {
      const seq = (latest.current.get(id) ?? 0) + 1
      latest.current.set(id, seq)
      update((lib) => ({ ...lib, playlists: lib.playlists.map((p) => (p.id === id ? { ...p, ...body } : p)) }))
      const run = async () => {
        try {
          const data = await apiSend<{ playlist: Playlist }>('PUT', `/api/audio/playlists/${id}`, body)
          if (latest.current.get(id) === seq) {
            update((lib) => ({ ...lib, playlists: lib.playlists.map((p) => (p.id === id ? data.playlist : p)) }))
          }
        } catch (error) {
          if (latest.current.get(id) !== seq) return
          fail(error, 'Could not save the station.')
          // Show what the server actually holds.
          apiGet<Library>('/api/audio/library')
            .then((fresh) => update((lib) => ({ ...lib, playlists: fresh.playlists ?? lib.playlists })))
            .catch(() => {})
        }
      }
      const chain = (chains.current.get(id) ?? Promise.resolve()).then(run)
      chains.current.set(id, chain)
      return chain
    },
    [update, fail]
  )

  const addToStation = useCallback(
    (playlistId: string, item: Playable) => {
      const playlist = library.playlists.find((p) => p.id === playlistId)
      if (!playlist || playlist.items.some((ref) => refKey(ref) === refKey(item))) return
      if (playlist.items.length >= library.limits.max_playlist_items) {
        return setNotice({ kind: 'error', text: `A station holds up to ${library.limits.max_playlist_items} tracks.` })
      }
      saveStation(playlistId, { items: [...playlist.items, { type: item.type, id: item.id }] })
      setNotice({ kind: 'ok', text: `Added to ${playlist.name}.` })
    },
    [library.playlists, library.limits, saveStation]
  )

  const createStation = useCallback(async () => {
    if (!draft || draft.saving) return
    const name = draft.name.trim()
    if (!name) return
    setDraft({ ...draft, saving: true })
    try {
      const { playlist } = await apiSend<{ playlist: Playlist }>('POST', '/api/audio/playlists', { name })
      update((lib) => ({ ...lib, playlists: [...lib.playlists, playlist] }))
      if (draft.first) await saveStation(playlist.id, { items: [{ type: draft.first.type, id: draft.first.id }] })
      setDraft(null)
      select({ type: 'playlist', id: playlist.id })
    } catch (error) {
      setDraft((d) => (d ? { ...d, saving: false } : d))
      fail(error, 'Could not create the station.')
    }
  }, [draft, update, saveStation, select, fail])

  const deleteStation = useCallback(
    async (id: string) => {
      try {
        await apiSend('DELETE', `/api/audio/playlists/${id}`)
        update((lib) => ({ ...lib, playlists: lib.playlists.filter((p) => p.id !== id) }))
        select({ type: 'favorites' })
      } catch (error) {
        fail(error, 'Could not delete the station.')
      }
    },
    [update, select, fail]
  )

  // ── uploads ──
  const onUploaded = useCallback(
    (upload: Upload) =>
      update((lib) => ({
        ...lib,
        uploads: [upload, ...lib.uploads.filter((u) => u.id !== upload.id)],
        usage: { uploads: lib.usage.uploads + 1, upload_bytes: lib.usage.upload_bytes + upload.bytes },
      })),
    [update]
  )

  const renameUpload = useCallback(
    async (item: Playable, title: string) => {
      try {
        const { upload } = await apiSend<{ upload: Upload }>('PATCH', `/api/audio/uploads/${item.id}`, { title })
        update((lib) => ({ ...lib, uploads: lib.uploads.map((u) => (u.id === item.id ? { ...u, title: upload.title } : u)) }))
      } catch (error) {
        fail(error, 'Could not rename the track.')
        throw error
      }
    },
    [update, fail]
  )

  const { forget } = player
  const deleteUpload = useCallback(
    async (item: Playable) => {
      try {
        await apiSend('DELETE', `/api/audio/uploads/${item.id}`)
        forget(refKey(item))
        update((lib) => {
          const gone = lib.uploads.find((u) => u.id === item.id)
          return {
            ...lib,
            uploads: lib.uploads.filter((u) => u.id !== item.id),
            playlists: lib.playlists.map((p) => ({ ...p, items: p.items.filter((ref) => !(ref.type === 'upload' && ref.id === item.id)) })),
            usage: { uploads: Math.max(0, lib.usage.uploads - 1), upload_bytes: Math.max(0, lib.usage.upload_bytes - (gone?.bytes ?? 0)) },
          }
        })
      } catch (error) {
        fail(error, 'Could not delete the track.')
      }
    },
    [forget, update, fail]
  )

  // ── what the main panel shows ──
  const playlist = source.type === 'playlist' ? library.playlists.find((p) => p.id === source.id) ?? null : null
  const station = source.type === 'station' ? dial.stations.find((s) => s.id === source.id) ?? null : null

  let heading = { name: '', description: '', color: '#22d3ee' }
  let items: Playable[] = []
  if (station) {
    heading = station
    items = byStation.get(station.id) ?? []
  } else if (source.type === 'themes') {
    heading = dial.themes
    items = themes
  } else if (source.type === 'favorites') {
    heading = { name: 'Favorites', description: 'Every track you starred', color: FAVORITES_COLOR }
    items = favorites
  } else if (source.type === 'uploads') {
    heading = { name: 'My Uploads', description: 'Your own music, private to your account', color: UPLOADS_COLOR }
    items = uploads
  } else if (playlist) {
    heading = { name: playlist.name, description: playlist.sync_to_game ? 'Your station, on your in-game radio' : 'Your station', color: playlist.color }
    items = resolve(playlist.items)
  } else if (source.type === 'sfx') {
    heading = { name: 'Sound Lab', description: 'Every sound effect in the game', color: SFX_COLOR }
  }

  const runtime = items.reduce((sum, item) => sum + (item.duration_seconds ?? 0), 0)
  const play = (index: number) => player.playQueue(items, index)
  const shufflePlay = () => {
    if (!player.shuffle) player.toggleShuffle()
    player.playQueue(items, Math.floor(Math.random() * items.length))
  }

  const stationKeys = useMemo(() => new Set((playlist?.items ?? []).map(refKey)), [playlist])
  const addable = useMemo(
    () => (playlist ? Array.from(playables.values()).filter((p) => p.kind !== 'sfx' && !stationKeys.has(refKey(p))) : []),
    [playlist, playables, stationKeys]
  )

  const listProps = {
    player,
    onToggleFavorite: toggleFavorite,
    playlists: library.playlists,
    onAddToPlaylist: addToStation,
    onNewPlaylistWith: (item: Playable) => setDraft({ name: '', first: item, saving: false }),
  }
  const atStationLimit = library.playlists.length >= library.limits.max_playlists

  return (
    <section className={`mx-auto max-w-7xl px-4 pt-10 lg:px-6 ${player.current ? 'pb-36' : 'pb-16'}`}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* ── the dial ── */}
        <nav aria-label="Stations" className="min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-12rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <DialGroup title="On the air">
            {dial.stations.map((s) => (
              <DialButton
                key={s.id}
                active={source.type === 'station' && source.id === s.id}
                color={s.color}
                label={s.name}
                count={byStation.get(s.id)?.length ?? 0}
                onClick={() => select({ type: 'station', id: s.id })}
                icon={<Radio className="h-4 w-4" />}
              />
            ))}
            {themes.length > 0 && (
              <DialButton
                active={source.type === 'themes'}
                color={dial.themes.color}
                label={dial.themes.name}
                count={themes.length}
                onClick={() => select({ type: 'themes' })}
                icon={<Radio className="h-4 w-4" />}
              />
            )}
          </DialGroup>

          <DialGroup title="Your signal">
            <DialButton
              active={source.type === 'favorites'}
              color={FAVORITES_COLOR}
              label="Favorites"
              count={favorites.length}
              onClick={() => select({ type: 'favorites' })}
              icon={<Heart className="h-4 w-4" />}
            />
            <DialButton
              active={source.type === 'uploads'}
              color={UPLOADS_COLOR}
              label="My Uploads"
              count={uploads.length}
              onClick={() => select({ type: 'uploads' })}
              icon={<UploadIcon className="h-4 w-4" />}
            />
            {library.playlists.map((p) => (
              <DialButton
                key={p.id}
                active={source.type === 'playlist' && source.id === p.id}
                color={p.color}
                label={p.name}
                count={p.items.length}
                onClick={() => select({ type: 'playlist', id: p.id })}
                icon={<span className="block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />}
              />
            ))}
            <button
              type="button"
              onClick={() => setDraft({ name: '', saving: false })}
              disabled={atStationLimit}
              title={atStationLimit ? `You can keep up to ${library.limits.max_playlists} stations` : undefined}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-dashed border-white/20 px-3 py-2 text-left text-sm font-medium text-cyan-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40 lg:w-full"
            >
              <Plus className="h-4 w-4" /> New station
            </button>
          </DialGroup>

          {sfxCount > 0 && (
            <DialGroup title="From the game">
              <DialButton
                active={source.type === 'sfx'}
                color={SFX_COLOR}
                label="Sound Lab"
                count={sfxCount}
                onClick={() => select({ type: 'sfx' })}
                icon={<Zap className="h-4 w-4" />}
              />
            </DialGroup>
          )}
        </nav>

        {/* ── the selected station ── */}
        <div className="min-w-0">
          <header className="mb-5 flex flex-wrap items-end gap-x-6 gap-y-4 border-b border-white/10 pb-5">
            {/* Full width on a phone, so the buttons wrap below instead of crushing the title. */}
            <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: heading.color, boxShadow: `0 0 12px ${heading.color}` }} />
                <span className="eyebrow whitespace-nowrap" style={{ color: heading.color }}>
                  {source.type === 'playlist' ? 'Your station' : source.type === 'sfx' ? 'From the game' : source.type === 'station' ? 'On the air' : 'Your signal'}
                </span>
              </div>
              {playlist ? (
                <StationName key={playlist.id} name={playlist.name} onSave={(name) => saveStation(playlist.id, { name })} />
              ) : (
                <h2 className="mt-1 truncate font-display text-2xl font-bold text-white md:text-3xl">{heading.name}</h2>
              )}
              <p className="mt-1 text-sm text-slate-300">
                {heading.description}
                {source.type !== 'sfx' && items.length > 0 && (
                  <span className="font-mono text-slate-400">
                    {' '}
                    · {items.length} {items.length === 1 ? 'track' : 'tracks'} · {formatRuntime(runtime)}
                  </span>
                )}
              </p>
            </div>
            {source.type !== 'sfx' && (
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => play(0)} disabled={!items.length} className={`${pill} bg-cyan-400 text-deep-900`}>
                  <Play className="h-4 w-4" fill="currentColor" /> Play
                </button>
                <button
                  type="button"
                  onClick={shufflePlay}
                  disabled={items.length < 2}
                  className={`${pill} border border-white/20 bg-white/5 text-white hover:bg-white/10`}
                >
                  <Shuffle className="h-4 w-4" /> Shuffle
                </button>
              </div>
            )}
          </header>

          {/* station settings */}
          {playlist && (
            <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={playlist.sync_to_game}
                  onChange={(e) => saveStation(playlist.id, { sync_to_game: e.target.checked })}
                  className="h-4 w-4 accent-cyan-400"
                />
                Put this station on my in-game radio
              </label>
              <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Station color">
                {PLAYLIST_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={playlist.color === color}
                    aria-label={`Color ${color}`}
                    onClick={() => saveStation(playlist.id, { color })}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${playlist.color === color ? 'border-white' : 'border-transparent'}`}
                    style={{ background: color }}
                  />
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2 text-sm">
                {confirmDeleteStation ? (
                  <>
                    <span className="text-slate-300">Delete this station?</span>
                    <button type="button" onClick={() => deleteStation(playlist.id)} className="rounded-full bg-rose-500/20 px-3 py-1.5 font-semibold text-rose-200 hover:bg-rose-500/30">
                      Delete
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteStation(false)} className="rounded-full px-3 py-1.5 text-slate-300 hover:bg-white/10">
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteStation(true)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-slate-400 hover:bg-white/10 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" /> Delete station
                  </button>
                )}
              </div>
            </div>
          )}

          {(source.type === 'playlist' || source.type === 'uploads' || source.type === 'favorites') && <GameRadioNote steamLinked={library.steam_linked} />}

          {source.type === 'uploads' && (
            <div className="mb-6">
              <UploadPanel limits={library.limits} usage={library.usage} onUploaded={onUploaded} />
            </div>
          )}

          {/* the list */}
          {source.type === 'sfx' ? (
            <div className="space-y-8">
              {sfxGroups.map(([category, sounds]) => (
                <div key={category}>
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="font-display text-xs font-bold uppercase tracking-[0.22em] text-slate-200">
                      {dial.sfx_labels[category] ?? category.replace(/_/g, ' ')}
                    </h3>
                    <span className="font-mono text-xs text-slate-500">{sounds.length}</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {sounds.map((sound) => {
                      const isCurrent = player.current ? refKey(player.current) === refKey(sound) : false
                      return (
                        <button
                          key={sound.id}
                          type="button"
                          onClick={() => (isCurrent && player.playing ? player.toggle() : player.playQueue([sound], 0))}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                            isCurrent ? 'border-orange-400/60 bg-orange-400/10' : 'border-white/10 bg-white/[0.03] hover:border-orange-400/40 hover:bg-white/[0.06]'
                          }`}
                        >
                          <Zap className={`h-4 w-4 shrink-0 ${isCurrent && player.playing ? 'animate-pulse text-orange-300' : 'text-slate-500'}`} />
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{sound.title}</span>
                          <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400">{formatDuration(sound.duration_seconds)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <TrackList
              {...listProps}
              label={heading.name}
              items={items}
              onPlay={play}
              arrange={
                playlist
                  ? {
                      onMove: (index, direction) => {
                        const next = [...playlist.items]
                        const to = index + direction
                        if (to < 0 || to >= next.length) return
                        ;[next[index], next[to]] = [next[to], next[index]]
                        saveStation(playlist.id, { items: next })
                      },
                      onRemove: (index) => saveStation(playlist.id, { items: playlist.items.filter((_, i) => i !== index) }),
                    }
                  : undefined
              }
              manage={source.type === 'uploads' ? { onRename: renameUpload, onDelete: deleteUpload } : undefined}
            />
          ) : (
            <EmptyState source={source} />
          )}

          {/* add tracks to a station */}
          {playlist && addable.length > 0 && (
            <div className="mt-8">
              <div className="mb-3 flex items-center gap-3">
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.22em] text-slate-200">Add tracks</h3>
                <div className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
              </div>
              <TrackList
                {...listProps}
                label="Tracks you can add"
                items={addable}
                onPlay={(index) => player.playQueue([addable[index]], 0)}
                quickAdd={(item) => addToStation(playlist.id, item)}
              />
            </div>
          )}
        </div>
      </div>

      {/* new station */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && !draft.saving && setDraft(null)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-station-title"
            onSubmit={(e) => {
              e.preventDefault()
              createStation()
            }}
            onKeyDown={(e) => e.key === 'Escape' && !draft.saving && setDraft(null)}
            className="w-full max-w-md rounded-2xl border border-white/15 bg-deep-800 p-6 shadow-2xl"
          >
            <h3 id="new-station-title" className="font-display text-lg font-bold text-white">
              New station
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              {draft.first ? `It starts with “${draft.first.title}”.` : 'Name it, then add tracks from the soundtrack and your uploads.'}
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="new-station-name">
              Station name
            </label>
            <input
              id="new-station-name"
              autoFocus
              value={draft.name}
              maxLength={40}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Night Run FM"
              className="mt-1.5 w-full rounded-lg border border-white/20 bg-deep-900 px-3 py-2.5 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDraft(null)} disabled={draft.saving} className="rounded-full px-4 py-2 text-sm text-slate-300 hover:bg-white/10">
                Cancel
              </button>
              <button type="submit" disabled={!draft.name.trim() || draft.saving} className={`${pill} bg-cyan-400 text-deep-900`}>
                {draft.saving && <Loader2 className="h-4 w-4 animate-spin" />} Create station
              </button>
            </div>
          </form>
        </div>
      )}

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`fixed left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-2.5 text-sm shadow-2xl ${player.current ? 'bottom-24' : 'bottom-6'} ${
            notice.kind === 'error' ? 'border-rose-400/40 bg-rose-950 text-rose-100' : 'border-cyan-400/40 bg-deep-800 text-cyan-100'
          }`}
        >
          {notice.text}
        </div>
      )}

      <PlayerBar player={player} onToggleFavorite={toggleFavorite} />
    </section>
  )
}

// ── small pieces ─────────────────────────────────────────────────────────

function DialGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{title}</div>
      {/* A row that scrolls sideways on a phone; a column beside the list on desktop. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">{children}</div>
    </div>
  )
}

function DialButton(props: { active: boolean; color: string; label: string; count: number; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-current={props.active ? 'true' : undefined}
      className={`flex shrink-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 lg:w-full ${
        props.active ? 'bg-white/10 text-white' : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
      style={props.active ? { borderColor: `${props.color}88` } : undefined}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center" style={{ color: props.color }}>
        {props.icon}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{props.label}</span>
      <span className="font-mono text-xs tabular-nums text-slate-500">{props.count}</span>
    </button>
  )
}

/** A station's name: click to edit, Enter or blur to save. */
function StationName({ name, onSave }: { name: string; onSave: (name: string) => void }) {
  const [value, setValue] = useState(name)
  useEffect(() => setValue(name), [name])
  const commit = () => {
    const next = value.trim()
    if (next && next !== name) onSave(next)
    else setValue(name)
  }
  return (
    <input
      value={value}
      maxLength={40}
      aria-label="Station name"
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') {
          setValue(name)
          requestAnimationFrame(() => (e.target as HTMLInputElement).blur())
        }
      }}
      className="mt-1 w-full truncate rounded-md border border-transparent bg-transparent font-display text-2xl font-bold text-white outline-none transition-colors hover:border-white/15 focus:border-cyan-400/60 focus:bg-deep-900 md:text-3xl"
    />
  )
}

function GameRadioNote({ steamLinked }: { steamLinked: boolean }) {
  return (
    <p className="mb-5 flex items-start gap-2.5 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.07] px-4 py-3 text-sm leading-relaxed text-slate-200">
      <Satellite className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
      <span>
        Your favorites and stations are saved to your account for the Intergalactic Radio. Tuning them in-game arrives with an upcoming game update.
        {!steamLinked && (
          <>
            {' '}
            The game signs in through Steam, so{' '}
            <Link href="/profile?tab=settings" className="font-medium text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
              link your Steam account
            </Link>{' '}
            to have them follow you there.
          </>
        )}
      </span>
    </p>
  )
}

function EmptyState({ source }: { source: Source }) {
  const copy: Record<Source['type'], { title: string; body: string }> = {
    station: { title: 'No signal yet', body: 'This station’s tracks haven’t been released. They appear here as they are added to the game.' },
    themes: { title: 'No signal yet', body: 'No themes have been released yet.' },
    favorites: { title: 'Nothing starred yet', body: 'Press the heart on any track and it lands here.' },
    uploads: { title: 'No uploads yet', body: 'Add your own music above, then put it on a station.' },
    playlist: { title: 'This station is empty', body: 'Add tracks from the list below, or with the add button on any track.' },
    sfx: { title: 'No sounds yet', body: 'The game’s sound effects appear here.' },
  }
  const { title, body } = copy[source.type]
  return (
    <div className="rounded-xl border border-dashed border-white/15 px-6 py-12 text-center">
      <Radio className="mx-auto h-8 w-8 text-slate-600" />
      <h3 className="mt-3 font-display text-base font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">{body}</p>
    </div>
  )
}
