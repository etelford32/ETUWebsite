"use client"

import { useEffect, useState } from 'react'
import { SteamIcon } from '@/components/SteamIcon'

interface SteamEntry {
  rank: number
  score: number
  steam_id: string
  user_id: string | null
  username: string
  avatar_url: string | null
  is_verified_owner: boolean
  has_etu_profile: boolean
  profile_url: string | null
}

interface SteamBoardResponse {
  mode: string
  leaderboard: { id: number; name: string; total: number; only_trusted_writes: boolean }
  entries: SteamEntry[]
}

/**
 * Steam's own global leaderboard for a mode, as mirrored by the website
 * after each verified game submission. Read through /api/leaderboard/steam.
 */
export default function SteamLeaderboardPanel({
  mode,
  currentUserId,
  pageSize = 50,
}: {
  mode: string
  currentUserId?: string | null
  pageSize?: number
}) {
  const [data, setData] = useState<SteamBoardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [start, setStart] = useState(1)

  useEffect(() => {
    setStart(1)
  }, [mode])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/leaderboard/steam?mode=${encodeURIComponent(mode)}&start=${start}&count=${pageSize}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(
            json.error === 'not_configured'
              ? 'Steam leaderboards are not enabled on this server yet.'
              : json.error === 'steam_unavailable'
                ? "Steam didn't respond. Try again in a minute."
                : 'Could not load the Steam leaderboard.'
          )
          setData(null)
          return
        }
        setData(json)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the Steam leaderboard.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, start, pageSize])

  const total = data?.leaderboard.total ?? 0
  const hasPrev = start > 1
  const hasNext = data ? start + data.entries.length - 1 < total : false

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
      <div className="p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SteamIcon className="w-6 h-6 text-slate-300" />
          <div>
            <div className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Steam global leaderboard
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {data ? `${total.toLocaleString()} players · best score per player` : 'Mirrored from verified in-game runs'}
            </div>
          </div>
        </div>
        {data && (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setStart(Math.max(1, start - pageSize))}
              disabled={!hasPrev || loading}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 transition"
            >
              ← Prev
            </button>
            <span className="text-slate-500 font-mono">
              {start}–{start + data.entries.length - 1}
            </span>
            <button
              onClick={() => setStart(start + pageSize)}
              disabled={!hasNext || loading}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 transition"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading Steam leaderboard…</div>
      ) : error ? (
        <div className="p-12 text-center text-slate-300">{error}</div>
      ) : !data || data.entries.length === 0 ? (
        <div className="p-12 text-center">
          <div className="eyebrow text-slate-400 mb-2">No Records</div>
          <div className="text-slate-300">No Steam scores for this mode yet. Verified in-game runs appear here.</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] border-b border-white/10">
              <tr className="text-left">
                <th className="py-4 px-4 text-right font-display text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 w-20">Rank</th>
                <th className="py-4 px-4 font-display text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Commander</th>
                <th className="py-4 px-4 text-right font-display text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => {
                const you = !!currentUserId && entry.user_id === currentUserId
                return (
                  <tr
                    key={`${entry.rank}-${entry.steam_id}`}
                    className={`border-b border-white/5 ${you ? 'bg-cyan-500/[0.06]' : 'hover:bg-white/[0.02]'}`}
                  >
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">#{entry.rank}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} alt="" className="w-9 h-9 rounded-full border border-white/10" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-500">
                            ⌬
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {entry.profile_url ? (
                              <a href={entry.profile_url} className="font-display font-semibold tracking-wide text-cyan-300 hover:text-cyan-200 hover:underline truncate">
                                {entry.username}
                              </a>
                            ) : (
                              <span className="font-display font-semibold tracking-wide text-slate-100 truncate">{entry.username}</span>
                            )}
                            {you && (
                              <span className="text-[10px] font-display uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-400/40 text-cyan-300">
                                You
                              </span>
                            )}
                            {entry.is_verified_owner && (
                              <span title="Verified game owner" className="text-cyan-300/80">
                                <SteamIcon className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          {!entry.has_etu_profile && (
                            <div className="text-xs text-slate-500">No ETU profile yet</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono text-lg font-bold tabular-nums text-cyan-300">{entry.score.toLocaleString()}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
