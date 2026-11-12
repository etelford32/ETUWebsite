"use client"

import { Heart, Loader2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { formatClock } from './format'
import { Playable } from './types'
import { Player } from './usePlayer'

interface Props {
  player: Player
  onToggleFavorite: (item: Playable) => void
}

const iconButton =
  'inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:opacity-40'

/** The transport, fixed to the bottom of the page while something is loaded. */
export default function PlayerBar({ player, onToggleFavorite }: Props) {
  const { current } = player
  if (!current) return null

  const duration = player.duration || current.duration_seconds || 0
  const progress = duration > 0 ? Math.min(100, (player.time / duration) * 100) : 0
  const repeatLabel = player.repeat === 'off' ? 'Repeat is off' : player.repeat === 'all' ? 'Repeating the list' : 'Repeating this track'

  return (
    <div
      role="region"
      aria-label="Player"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-400/25 bg-deep-900/95 backdrop-blur-md"
      style={{ boxShadow: '0 -12px 40px rgba(2, 6, 23, 0.8)' }}
    >
      {/* Seek bar: a range input over a painted track. */}
      <div className="relative h-1.5 w-full bg-white/10">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-indigo-400" style={{ width: `${progress}%` }} />
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(player.time, duration || 0)}
          onChange={(e) => player.seek(Number(e.target.value))}
          disabled={!duration}
          aria-label="Seek"
          aria-valuetext={`${formatClock(player.time)} of ${formatClock(duration)}`}
          className="absolute -top-2 left-0 h-5 w-full cursor-pointer opacity-0"
        />
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 lg:px-6">
        <div className="min-w-0 flex-1 md:flex-none md:basis-72">
          <div className="truncate font-display text-sm font-semibold text-white">{current.title}</div>
          <div className="truncate text-xs text-slate-400" aria-live="polite">
            {player.error ? <span className="text-rose-300">{player.error}</span> : current.subtitle}
          </div>
        </div>

        <div className="flex items-center gap-1 md:flex-1 md:justify-center">
          <button
            type="button"
            onClick={player.toggleShuffle}
            aria-pressed={player.shuffle}
            aria-label="Shuffle"
            title="Shuffle"
            className={`${iconButton} hidden sm:inline-flex ${player.shuffle ? 'text-cyan-300' : ''}`}
          >
            <Shuffle className="h-4 w-4" />
          </button>
          <button type="button" onClick={player.previous} aria-label="Previous track" title="Previous" className={iconButton}>
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={player.toggle}
            aria-label={player.playing ? 'Pause' : 'Play'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400 text-deep-900 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {player.loading && player.playing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : player.playing ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
            )}
          </button>
          <button
            type="button"
            onClick={player.next}
            disabled={player.queue.length < 2}
            aria-label="Next track"
            title="Next"
            className={iconButton}
          >
            <SkipForward className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={player.cycleRepeat}
            aria-label={repeatLabel}
            title={repeatLabel}
            className={`${iconButton} hidden sm:inline-flex ${player.repeat !== 'off' ? 'text-cyan-300' : ''}`}
          >
            {player.repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </button>
        </div>

        <div className="hidden items-center gap-3 md:flex md:basis-72 md:justify-end">
          <span className="whitespace-nowrap font-mono text-xs tabular-nums text-slate-400">
            {formatClock(player.time)} / {formatClock(duration)}
          </span>
          {current.kind !== 'sfx' && (
            <button
              type="button"
              onClick={() => onToggleFavorite(current)}
              aria-pressed={current.favorite}
              aria-label={current.favorite ? 'Remove from favorites' : 'Add to favorites'}
              className={`${iconButton} ${current.favorite ? 'text-amber-300' : ''}`}
            >
              <Heart className="h-4 w-4" fill={current.favorite ? 'currentColor' : 'none'} />
            </button>
          )}
          <button
            type="button"
            onClick={() => player.setVolume(player.volume > 0 ? 0 : 0.8)}
            aria-label={player.volume > 0 ? 'Mute' : 'Unmute'}
            className={iconButton}
          >
            {player.volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={player.volume}
            onChange={(e) => player.setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="h-1 w-24 cursor-pointer accent-cyan-400"
          />
        </div>
      </div>
    </div>
  )
}
