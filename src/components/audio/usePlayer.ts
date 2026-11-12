"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet, ApiError } from './api'
import { Playable, refKey } from './types'

export type RepeatMode = 'off' | 'all' | 'one'

export interface PlayerState {
  queue: Playable[]
  index: number
  /** The listener wants sound (true while a track is still loading). */
  playing: boolean
  loading: boolean
  time: number
  duration: number
  volume: number
  shuffle: boolean
  repeat: RepeatMode
  error: string | null
}

export interface Player extends PlayerState {
  current: Playable | null
  /** Play `items` starting at `startIndex`; the same list is the queue. */
  playQueue: (items: Playable[], startIndex: number) => void
  toggle: () => void
  next: () => void
  previous: () => void
  seek: (seconds: number) => void
  setVolume: (volume: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  /** Drop a deleted track from the queue (stops it if it is playing). */
  forget: (key: string) => void
  /** Keep queued titles and stars in step with the library. */
  refresh: (lookup: (key: string) => Playable | undefined) => void
}

const VOLUME_KEY = 'etu-audio-volume'
// A signed URL lasts an hour; ask again a little before that.
const URL_LIFETIME_MS = 50 * 60 * 1000

const INITIAL: PlayerState = {
  queue: [],
  index: -1,
  playing: false,
  loading: false,
  time: 0,
  duration: 0,
  volume: 0.8,
  shuffle: false,
  repeat: 'off',
  error: null,
}

function storedVolume(): number {
  try {
    const value = Number.parseFloat(window.localStorage.getItem(VOLUME_KEY) ?? '')
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : INITIAL.volume
  } catch {
    return INITIAL.volume
  }
}

/**
 * One audio element playing a queue of game tracks and uploads. Each track's
 * file is reached through a short-lived URL from /api/audio/stream, fetched
 * when the track starts.
 */
export function usePlayer(): Player {
  const [state, setState] = useState<PlayerState>(INITIAL)
  const stateRef = useRef(state)
  stateRef.current = state

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urls = useRef(new Map<string, { url: string; at: number }>())
  // Bumped on every load so a slow URL lookup can't start a track the
  // listener has already moved on from.
  const loadId = useRef(0)
  const retried = useRef<string | null>(null)

  const patch = useCallback((changes: Partial<PlayerState>) => {
    setState((s) => ({ ...s, ...changes }))
  }, [])

  const load = useCallback(
    async (queue: Playable[], index: number, autoplay = true) => {
      const audio = audioRef.current
      const item = queue[index]
      if (!audio || !item) return
      const id = ++loadId.current
      const key = refKey(item)
      audio.pause()
      patch({ queue, index, playing: autoplay, loading: true, time: 0, duration: item.duration_seconds ?? 0, error: null })

      try {
        let entry = urls.current.get(key)
        if (!entry || Date.now() - entry.at > URL_LIFETIME_MS) {
          const data = await apiGet<{ url: string }>(`/api/audio/stream?type=${item.type}&id=${item.id}`)
          entry = { url: data.url, at: Date.now() }
          urls.current.set(key, entry)
        }
        if (id !== loadId.current) return
        audio.src = entry.url
        audio.currentTime = 0
        if (autoplay) await audio.play()
      } catch (error: any) {
        if (id !== loadId.current) return
        // play() rejects with AbortError when another load interrupts it.
        if (error?.name === 'AbortError') return
        const message =
          error instanceof ApiError
            ? error.status === 404
              ? 'That track is no longer available.'
              : error.message
            : error?.name === 'NotAllowedError'
              ? 'Press play to start the music.'
              : 'Could not play that track.'
        patch({ playing: false, loading: false, error: message })
      }
    },
    [patch]
  )

  /** The index after `index`, honouring shuffle; -1 at the end of the queue. */
  const following = useCallback((s: PlayerState, wrap: boolean): number => {
    if (!s.queue.length) return -1
    if (s.shuffle && s.queue.length > 1) {
      let pick = s.index
      while (pick === s.index) pick = Math.floor(Math.random() * s.queue.length)
      return pick
    }
    if (s.index + 1 < s.queue.length) return s.index + 1
    return wrap ? 0 : -1
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.volume = storedVolume()
    audioRef.current = audio
    patch({ volume: audio.volume })

    const onTime = () => patch({ time: audio.currentTime })
    const onDuration = () => {
      if (Number.isFinite(audio.duration)) patch({ duration: audio.duration })
    }
    const onPlaying = () => {
      retried.current = null
      patch({ playing: true, loading: false, error: null })
    }
    const onPause = () => {
      // Our own pause() before a new track is not the listener pausing.
      if (!audio.ended && !stateRef.current.loading) patch({ playing: false })
    }
    const onWaiting = () => patch({ loading: true })
    const onCanPlay = () => patch({ loading: false })
    const onEnded = () => {
      const s = stateRef.current
      if (s.repeat === 'one') {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }
      const nextIndex = following(s, s.repeat === 'all')
      if (nextIndex === -1) patch({ playing: false, time: 0 })
      else load(s.queue, nextIndex)
    }
    const onError = () => {
      const s = stateRef.current
      const item = s.queue[s.index]
      if (!item || !audio.src) return
      const key = refKey(item)
      // Most likely the signed URL ran out: fetch a new one, once.
      if (retried.current !== key) {
        retried.current = key
        urls.current.delete(key)
        load(s.queue, s.index, s.playing)
        return
      }
      patch({ playing: false, loading: false, error: 'Could not play that track.' })
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    return () => {
      loadId.current++
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audioRef.current = null
    }
  }, [following, load, patch])

  const playQueue = useCallback(
    (items: Playable[], startIndex: number) => {
      if (!items.length) return
      load(items, Math.min(Math.max(startIndex, 0), items.length - 1))
    },
    [load]
  )

  const toggle = useCallback(() => {
    const audio = audioRef.current
    const s = stateRef.current
    if (!audio || s.index < 0) return
    if (!audio.src) {
      load(s.queue, s.index)
    } else if (audio.paused) {
      patch({ playing: true })
      audio.play().catch(() => patch({ playing: false }))
    } else {
      // Said outright: the pause event is ignored while a track is loading.
      patch({ playing: false })
      audio.pause()
    }
  }, [load, patch])

  const next = useCallback(() => {
    const s = stateRef.current
    const index = following(s, true)
    if (index !== -1) load(s.queue, index, true)
  }, [following, load])

  const previous = useCallback(() => {
    const audio = audioRef.current
    const s = stateRef.current
    if (!audio || s.index < 0) return
    // Like every player: back restarts the track unless it has just begun.
    if (audio.currentTime > 3 || s.queue.length === 1) {
      audio.currentTime = 0
      return
    }
    load(s.queue, s.index > 0 ? s.index - 1 : s.queue.length - 1, true)
  }, [load])

  const seek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current
      if (!audio || !audio.src || !Number.isFinite(seconds)) return
      audio.currentTime = Math.max(0, seconds)
      patch({ time: audio.currentTime })
    },
    [patch]
  )

  const setVolume = useCallback(
    (volume: number) => {
      const level = Math.min(1, Math.max(0, volume))
      if (audioRef.current) audioRef.current.volume = level
      try {
        window.localStorage.setItem(VOLUME_KEY, String(level))
      } catch {
        // Private mode: the level just won't be remembered.
      }
      patch({ volume: level })
    },
    [patch]
  )

  const toggleShuffle = useCallback(() => setState((s) => ({ ...s, shuffle: !s.shuffle })), [])
  const cycleRepeat = useCallback(
    () => setState((s) => ({ ...s, repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),
    []
  )

  const forget = useCallback((key: string) => {
    urls.current.delete(key)
    const s = stateRef.current
    const at = s.queue.findIndex((item) => refKey(item) === key)
    if (at === -1) return
    const queue = s.queue.filter((_, i) => i !== at)
    if (at === s.index) {
      loadId.current++
      const audio = audioRef.current
      if (audio) {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      }
      setState((prev) => ({ ...prev, queue, index: queue.length ? Math.min(at, queue.length - 1) : -1, playing: false, loading: false, time: 0, duration: 0 }))
    } else {
      setState((prev) => ({ ...prev, queue, index: at < s.index ? s.index - 1 : s.index }))
    }
  }, [])

  const refresh = useCallback((lookup: (key: string) => Playable | undefined) => {
    setState((s) => {
      let changed = false
      const queue = s.queue.map((item) => {
        const latest = lookup(refKey(item))
        if (!latest || (latest.title === item.title && latest.subtitle === item.subtitle && latest.favorite === item.favorite)) {
          return item
        }
        changed = true
        return { ...item, title: latest.title, subtitle: latest.subtitle, favorite: latest.favorite }
      })
      return changed ? { ...s, queue } : s
    })
  }, [])

  // Lock-screen and media-key controls.
  const current = state.index >= 0 ? state.queue[state.index] ?? null : null
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    if (!current) {
      navigator.mediaSession.metadata = null
      return
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.subtitle,
      album: 'Explore the Universe 2175',
      artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
    })
    const handlers: [MediaSessionAction, () => void][] = [
      ['play', toggle],
      ['pause', toggle],
      ['nexttrack', next],
      ['previoustrack', previous],
    ]
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        // Not every browser knows every action.
      }
    }
  }, [current, toggle, next, previous])

  return { ...state, current, playQueue, toggle, next, previous, seek, setVolume, toggleShuffle, cycleRepeat, forget, refresh }
}
