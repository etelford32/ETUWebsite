"use client"

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Heart, ListPlus, Loader2, Pause, Pencil, Play, Plus, Trash2, X } from 'lucide-react'
import { formatDuration } from './format'
import { Playable, Playlist, refKey } from './types'
import { Player } from './usePlayer'

export interface TrackListProps {
  items: Playable[]
  player: Player
  /** Play the list from `index`. */
  onPlay: (index: number) => void
  onToggleFavorite: (item: Playable) => void
  playlists: Playlist[]
  onAddToPlaylist: (playlistId: string, item: Playable) => void
  /** Start a new station holding `item`. */
  onNewPlaylistWith: (item: Playable) => void
  /** Station editing: reorder and remove rows. */
  arrange?: { onMove: (index: number, direction: -1 | 1) => void; onRemove: (index: number) => void }
  /** Uploads: rename and delete the file. */
  manage?: { onRename: (item: Playable, title: string) => Promise<void>; onDelete: (item: Playable) => void }
  /** A single "add to this station" button instead of the station menu. */
  quickAdd?: (item: Playable) => void
  label: string
}

const action =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:opacity-30 disabled:hover:bg-transparent'

export default function TrackList(props: TrackListProps) {
  const { items, player } = props
  const [menuKey, setMenuKey] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ key: string; value: string; saving: boolean } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const listRef = useRef<HTMLOListElement>(null)

  // Close the station menu on an outside click or Escape.
  useEffect(() => {
    if (!menuKey) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-station-menu]')) setMenuKey(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuKey(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuKey])

  const currentKey = player.current ? refKey(player.current) : null

  const submitRename = async (item: Playable) => {
    if (!renaming || !props.manage) return
    const title = renaming.value.trim()
    if (!title || title === item.title) return setRenaming(null)
    setRenaming({ ...renaming, saving: true })
    try {
      await props.manage.onRename(item, title)
      setRenaming(null)
    } catch {
      setRenaming((r) => (r ? { ...r, saving: false } : r))
    }
  }

  return (
    <ol ref={listRef} aria-label={props.label} className="divide-y divide-white/5 overflow-visible rounded-xl border border-white/10 bg-white/[0.03]">
      {items.map((item, index) => {
        const key = refKey(item)
        const isCurrent = key === currentKey
        const isPlaying = isCurrent && player.playing
        const isRenaming = renaming?.key === key
        return (
          <li key={`${key}:${index}`} className={`group relative flex items-center gap-2 px-2 py-1.5 sm:gap-3 sm:px-3 ${isCurrent ? 'bg-cyan-400/[0.07]' : 'hover:bg-white/[0.04]'}`}>
            <button
              type="button"
              onClick={() => (isCurrent ? player.toggle() : props.onPlay(index))}
              aria-label={isPlaying ? `Pause ${item.title}` : `Play ${item.title}`}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                isCurrent ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200' : 'border-white/10 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200'
              }`}
            >
              {isCurrent && player.loading && player.playing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" fill="currentColor" />
              ) : (
                <Play className="h-4 w-4 translate-x-px" fill="currentColor" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              {isRenaming ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    submitRename(item)
                  }}
                >
                  <input
                    autoFocus
                    value={renaming.value}
                    maxLength={120}
                    onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
                    onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)}
                    aria-label="Track title"
                    className="w-full min-w-0 rounded-md border border-cyan-400/40 bg-deep-900 px-2 py-1 text-sm text-white outline-none focus:border-cyan-300"
                  />
                  <button type="submit" disabled={renaming.saving} aria-label="Save title" className={action}>
                    {renaming.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setRenaming(null)} aria-label="Cancel" className={action}>
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <>
                  <div className={`truncate text-sm font-medium ${isCurrent ? 'text-cyan-100' : 'text-slate-100'}`}>{item.title}</div>
                  <div className="truncate text-xs text-slate-400">{item.subtitle}</div>
                </>
              )}
            </div>

            {!isRenaming && (
              <>
                <span className="hidden shrink-0 font-mono text-xs tabular-nums text-slate-400 sm:block">{formatDuration(item.duration_seconds)}</span>

                {confirmDelete === key && props.manage ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDelete(null)
                        props.manage?.onDelete(item)
                      }}
                      className="rounded-full bg-rose-500/20 px-3 py-1.5 font-semibold text-rose-200 hover:bg-rose-500/30"
                    >
                      Delete file
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-full px-3 py-1.5 text-slate-300 hover:bg-white/10">
                      Keep
                    </button>
                  </span>
                ) : (
                  <div className="flex shrink-0 items-center">
                    {item.kind !== 'sfx' && (
                      <button
                        type="button"
                        onClick={() => props.onToggleFavorite(item)}
                        aria-pressed={item.favorite}
                        aria-label={item.favorite ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
                        className={`${action} ${item.favorite ? 'text-amber-300 hover:text-amber-200' : ''}`}
                      >
                        <Heart className="h-4 w-4" fill={item.favorite ? 'currentColor' : 'none'} />
                      </button>
                    )}

                    {props.quickAdd ? (
                      <button type="button" onClick={() => props.quickAdd?.(item)} aria-label={`Add ${item.title} to this station`} className={action}>
                        <Plus className="h-4 w-4" />
                      </button>
                    ) : (
                      item.kind !== 'sfx' &&
                      !props.arrange && (
                        <div className="relative" data-station-menu>
                          <button
                            type="button"
                            onClick={() => setMenuKey(menuKey === key ? null : key)}
                            aria-haspopup="menu"
                            aria-expanded={menuKey === key}
                            aria-label={`Add ${item.title} to a station`}
                            className={action}
                          >
                            <ListPlus className="h-4 w-4" />
                          </button>
                          {menuKey === key && (
                            <div
                              role="menu"
                              className="absolute right-0 top-10 z-30 w-60 overflow-hidden rounded-xl border border-white/15 bg-deep-800 py-1 shadow-2xl"
                            >
                              <div className="px-3 py-2 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Add to station</div>
                              <div className="max-h-56 overflow-y-auto">
                                {props.playlists.map((playlist) => {
                                  const has = playlist.items.some((ref) => refKey(ref) === key)
                                  return (
                                    <button
                                      key={playlist.id}
                                      type="button"
                                      role="menuitem"
                                      disabled={has}
                                      onClick={() => {
                                        setMenuKey(null)
                                        props.onAddToPlaylist(playlist.id, item)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10 disabled:text-slate-500 disabled:hover:bg-transparent"
                                    >
                                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: playlist.color }} />
                                      <span className="min-w-0 flex-1 truncate">{playlist.name}</span>
                                      {has && <Check className="h-3.5 w-3.5" aria-label="Already on this station" />}
                                    </button>
                                  )
                                })}
                              </div>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setMenuKey(null)
                                  props.onNewPlaylistWith(item)
                                }}
                                className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-2 text-left text-sm font-medium text-cyan-200 hover:bg-white/10"
                              >
                                <Plus className="h-3.5 w-3.5" /> New station
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {props.arrange && (
                      <>
                        <button
                          type="button"
                          onClick={() => props.arrange?.onMove(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move ${item.title} up`}
                          className={action}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => props.arrange?.onMove(index, 1)}
                          disabled={index === items.length - 1}
                          aria-label={`Move ${item.title} down`}
                          className={action}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => props.arrange?.onRemove(index)} aria-label={`Remove ${item.title} from this station`} className={action}>
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}

                    {props.manage && (
                      <>
                        <button
                          type="button"
                          onClick={() => setRenaming({ key, value: item.title, saving: false })}
                          aria-label={`Rename ${item.title}`}
                          className={action}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(key)} aria-label={`Delete ${item.title}`} className={`${action} hover:text-rose-300`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </li>
        )
      })}
    </ol>
  )
}
