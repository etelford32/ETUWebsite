"use client"

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LeaderboardEntry } from '@/lib/types'
import Header from '@/components/Header'

type TimeWindow = 'today' | '7d' | '30d' | '90d' | 'all'

const WINDOWS = [
  { key: 'today' as TimeWindow, label: 'Today' },
  { key: '7d' as TimeWindow, label: '7 Days' },
  { key: '30d' as TimeWindow, label: '30 Days' },
  { key: '90d' as TimeWindow, label: '90 Days' },
  { key: 'all' as TimeWindow, label: 'All-Time' },
]

const MODE_TABS = [
  { key: 'megabot', label: 'Megabot Arena', primary: true },
  { key: 'all', label: 'All Modes' },
  { key: 'speedrun', label: 'Speedrun' },
  { key: 'survival', label: 'Survival' },
  { key: 'discovery', label: 'Discovery' },
  { key: 'boss_rush', label: 'Boss Rush' },
]

const PLATFORMS = ['all', 'PC', 'Mac', 'Linux', 'PS', 'Xbox', 'Switch']

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const [window, setWindow] = useState<TimeWindow>('30d')
  const [mode, setMode] = useState<string>('megabot')
  const [platform, setPlatform] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      setCurrentUser(data.authenticated ? data.user : null)
    } catch {
      setCurrentUser(null)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [window, mode, platform, page, pageSize])

  async function fetchLeaderboard() {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        window,
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortField: 'score',
        sortDir: 'desc',
      })

      if (mode !== 'all') {
        params.append('mode', mode)
      }

      const res = await fetch(`/api/leaderboard?${params}`)
      const json = await res.json()

      if (json.error) {
        throw new Error(json.error)
      }

      setEntries(json.data || [])
      setTotal(json.total || 0)
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err)
      setError(err.message || 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (platform !== 'all' && entry.platform !== platform) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const username = entry.profile?.username?.toLowerCase() || ''
        if (!username.includes(query)) return false
      }
      return true
    })
  }, [entries, platform, searchQuery])

  const userEntry = useMemo(() => {
    if (!currentUser) return null
    return entries.find(e => e.user_id === currentUser.id)
  }, [entries, currentUser])

  const totalPages = Math.ceil(total / pageSize)
  const isMegabot = mode === 'megabot'

  // Megabot Arena stat tiles — derived from the loaded page. The API sorts by
  // score desc, so entries[0] is the current Top Score. Top Wave reads off
  // the same row's `level`. Total Runs uses the API's count.
  const megabotStats = useMemo(() => {
    if (!isMegabot) return null
    const top = entries[0]
    return {
      topScore: top ? top.score : 0,
      topWave: top ? top.level : 0,
      topName: top?.profile?.username || '—',
      totalRuns: total,
    }
  }, [isMegabot, entries, total])

  return (
    <div className="min-h-screen bg-deep-900 text-slate-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <div className="eyebrow mb-3">Global Standings</div>
          <h1 className="font-display text-4xl md:text-5xl font-bold etu-headline-grad tracking-tight">
            {isMegabot ? 'Megabot Arena Leaderboard' : 'Global Leaderboards'}
          </h1>
          <p className="text-slate-400 text-lg mt-3 font-body">
            <span className="font-mono text-cyan-300">{total.toLocaleString()}</span>{' '}
            commanders competing across the galaxy
          </p>
        </div>

        {/* Megabot stat tiles — only on the Megabot tab */}
        {isMegabot && megabotStats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatTile
              label="Top Score"
              value={megabotStats.topScore.toLocaleString()}
              hint={megabotStats.topName === '—' ? 'No runs yet' : `By ${megabotStats.topName}`}
              accent="cyan"
            />
            <StatTile
              label="Top Wave"
              value={megabotStats.topWave > 0 ? `Wave ${megabotStats.topWave}` : '—'}
              hint={megabotStats.topWave > 0 ? 'Furthest run on this leaderboard' : 'Be the first'}
              accent="amber"
            />
            <StatTile
              label="Total Runs"
              value={megabotStats.totalRuns.toLocaleString()}
              hint="Submitted this period"
              accent="purple"
            />
          </div>
        )}

        {/* Mode Tabs — Megabot Arena is the primary tab */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Game mode">
            {MODE_TABS.map(tab => {
              const active = mode === tab.key
              if (tab.primary) {
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => { setMode(tab.key); setPage(1) }}
                    className={`
                      relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full
                      font-display text-xs font-semibold uppercase tracking-[0.18em]
                      transition-all
                      ${active
                        ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 border border-cyan-400/60 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.25)]'
                        : 'bg-cyan-500/[0.06] border border-cyan-400/30 text-cyan-300 hover:border-cyan-300/60 hover:bg-cyan-500/10'
                      }
                    `}
                  >
                    <span
                      className={`w-2 h-2 rounded-full bg-cyan-400 ${active ? 'animate-pulse' : ''}`}
                      style={{ boxShadow: '0 0 10px rgb(34 211 238)' }}
                    />
                    {tab.label}
                    <span className="ml-1 px-1.5 py-0.5 rounded-sm bg-cyan-400/15 border border-cyan-400/30 text-[9px] tracking-widest">
                      NEW
                    </span>
                  </button>
                )
              }
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => { setMode(tab.key); setPage(1) }}
                  className={`
                    px-4 py-2.5 rounded-full font-display text-xs font-semibold
                    uppercase tracking-[0.18em] transition-all
                    ${active
                      ? 'bg-white/10 border border-white/30 text-slate-100'
                      : 'bg-white/[0.03] border border-white/10 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                    }
                  `}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* User Rank Banner */}
        {userEntry && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="etu-glass mb-6 p-6 bg-gradient-to-r from-cyan-500/[0.06] via-blue-500/[0.06] to-indigo-500/[0.08]"
          >
            <div className="flex items-center gap-4">
              {userEntry.profile?.avatar_url && (
                <img
                  src={userEntry.profile.avatar_url}
                  alt="Your avatar"
                  className="w-16 h-16 rounded-full border-2 border-cyan-400/60"
                />
              )}
              <div className="flex-1">
                <div className="eyebrow text-cyan-300 mb-1">Your Standing</div>
                <div className="text-lg font-semibold font-display tracking-wide">
                  {userEntry.profile?.username || 'Commander'}
                </div>
                <div className="text-slate-300 text-sm mt-1">
                  Best score:{' '}
                  <span className="font-mono text-cyan-300 tabular-nums">
                    {userEntry.score.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-4xl font-bold tabular-nums etu-headline-grad">
                  #{userEntry.rank || '—'}
                </div>
                <div className="eyebrow text-slate-500 mt-1">Global Rank</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="etu-glass p-5 mb-6 space-y-5">
          {/* Time Window */}
          <div>
            <div className="eyebrow mb-3">Time Period</div>
            <div className="flex flex-wrap gap-2">
              {WINDOWS.map(w => (
                <button
                  key={w.key}
                  onClick={() => { setWindow(w.key); setPage(1) }}
                  className={`
                    px-4 py-2 rounded-md text-sm font-display font-semibold
                    uppercase tracking-[0.14em] transition-all
                    ${window === w.key
                      ? 'bg-cyan-500/15 border border-cyan-400/50 text-cyan-200'
                      : 'bg-white/[0.03] border border-white/10 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                    }
                  `}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform & Search */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="eyebrow mb-2">Platform</div>
              <select
                value={platform}
                onChange={e => { setPlatform(e.target.value); setPage(1) }}
                className="w-full px-4 py-2.5 rounded-md bg-deep-900/80 border border-white/10 hover:border-white/20 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 outline-none font-mono text-sm"
              >
                {PLATFORMS.map(p => (
                  <option key={p} value={p}>
                    {p === 'all' ? 'All Platforms' : p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="eyebrow mb-2">Search Commander</div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Username..."
                className="w-full px-4 py-2.5 rounded-md bg-deep-900/80 border border-white/10 hover:border-white/20 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Leaderboard Card */}
        <div className="etu-glass overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
              <div className="eyebrow text-slate-400">Loading leaderboard…</div>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-rose-400 mb-3">⚠ {error}</div>
              <button
                onClick={fetchLeaderboard}
                className="btn-ghost"
              >
                Retry
              </button>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-12 text-center">
              <div className="eyebrow text-slate-400 mb-2">No Records</div>
              <div className="text-slate-300">
                {isMegabot
                  ? 'No Megabot Arena scores yet. Be the first to set a record.'
                  : 'No scores found. Be the first to set a record.'}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.03] border-b border-white/10">
                    <tr className="text-left">
                      <th className="py-4 px-4 text-right font-display text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 w-20">Rank</th>
                      <th className="py-4 px-4 font-display text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Commander</th>
                      <th className="py-4 px-4 text-right font-display text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Score</th>
                      <th className="py-4 px-4 text-center font-display text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Level</th>
                      {!isMegabot && (
                        <th className="py-4 px-4 font-display text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Mode</th>
                      )}
                      <th className="py-4 px-4 text-center font-display text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Platform</th>
                      <th className="py-4 px-4 font-display text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {filteredEntries.map((entry, idx) => (
                        <LeaderboardRow
                          key={entry.id}
                          entry={entry}
                          index={idx}
                          isCurrentUser={entry.user_id === currentUser?.id}
                          showMode={!isMegabot}
                        />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-400 font-mono tabular-nums">
                    {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="px-4 py-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm font-display uppercase tracking-[0.14em]"
                    >
                      ← Prev
                    </button>
                    <div className="px-4 py-2 text-xs text-slate-400 font-mono tabular-nums">
                      Page {page} / {totalPages}
                    </div>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="px-4 py-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm font-display uppercase tracking-[0.14em]"
                    >
                      Next →
                    </button>
                  </div>

                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                    className="px-3 py-2 rounded-md bg-deep-900/80 border border-white/10 text-sm font-mono"
                  >
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* CTA */}
        <div className="etu-glass mt-8 p-8 text-center bg-gradient-to-r from-cyan-500/[0.04] via-blue-500/[0.04] to-indigo-500/[0.06]">
          <h3 className="font-display text-2xl font-bold mb-2 etu-headline-grad">
            Want to see your name here?
          </h3>
          <p className="text-slate-300 mb-5">
            Download Explore the Universe 2175 and start your climb to the top.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="/" className="btn-ghost">Download Game</a>
            <a
              href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Wishlist on Steam
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

function LeaderboardRow({
  entry,
  index,
  isCurrentUser,
  showMode,
}: {
  entry: LeaderboardEntry
  index: number
  isCurrentUser: boolean
  showMode: boolean
}) {
  const rank = entry.rank || index + 1

  return (
    <motion.tr
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ delay: index * 0.02 }}
      className={`
        border-t border-white/5 transition-colors
        ${isCurrentUser
          ? 'bg-cyan-500/[0.08] hover:bg-cyan-500/[0.12]'
          : 'hover:bg-white/[0.03]'
        }
      `}
    >
      <td className="py-4 px-4 text-right">
        <RankBadge rank={rank} />
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          {entry.profile?.avatar_url ? (
            <img
              src={entry.profile.avatar_url}
              alt={entry.profile.username || 'Avatar'}
              className="w-10 h-10 rounded-full border border-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-500">
              ⌬
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <a
                href={entry.user_id ? `/profile/${entry.user_id}` : '#'}
                className={`font-display font-semibold tracking-wide truncate ${
                  entry.user_id
                    ? 'text-cyan-300 hover:text-cyan-200 hover:underline transition-colors'
                    : 'text-slate-100'
                }`}
                onClick={(e) => { if (!entry.user_id) e.preventDefault() }}
              >
                {entry.profile?.username || 'Anonymous'}
              </a>
              {isCurrentUser && (
                <span className="text-[10px] font-display uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-400/40 text-cyan-300">
                  You
                </span>
              )}
            </div>
            {entry.profile?.steam_id && (
              <div className="text-xs text-slate-500 font-mono truncate">
                Steam · {entry.profile.steam_id}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="py-4 px-4 text-right">
        <span className="font-mono text-lg font-bold tabular-nums text-cyan-300">
          {entry.score.toLocaleString()}
        </span>
      </td>
      <td className="py-4 px-4 text-center">
        <span className="font-mono tabular-nums text-xs px-2 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300">
          Lv {entry.level}
        </span>
      </td>
      {showMode && (
        <td className="py-4 px-4">
          <span className="capitalize text-slate-300 text-sm">{entry.mode}</span>
        </td>
      )}
      <td className="py-4 px-4 text-center">
        <span className="font-mono text-xs text-slate-400">{entry.platform}</span>
      </td>
      <td className="py-4 px-4 text-slate-400 font-mono tabular-nums text-xs whitespace-nowrap">
        {new Date(entry.submitted_at).toLocaleDateString()}
      </td>
    </motion.tr>
  )
}

// Megabot subtitle stat tile — used in the 3-up row above the mode tabs.
// Each tile is an .etu-glass card with a tinted ring + radial glow bleed
// in the chosen accent. Values are Orbitron + tabular-nums; eyebrow labels
// match the rest of the page.
function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint: string
  accent: 'cyan' | 'amber' | 'purple'
}) {
  const accentMap = {
    cyan:   { ring: 'rgba(34,211,238,0.30)',  glow: 'rgba(34,211,238,0.20)',  fg: '#67e8f9' },
    amber:  { ring: 'rgba(251,191,36,0.30)',  glow: 'rgba(251,191,36,0.18)',  fg: '#fcd34d' },
    purple: { ring: 'rgba(168,85,247,0.30)',  glow: 'rgba(168,85,247,0.20)',  fg: '#c4b5fd' },
  } as const
  const a = accentMap[accent]
  return (
    <div
      className="etu-glass p-5 relative overflow-hidden"
      style={{ borderColor: a.ring, boxShadow: `0 0 24px ${a.glow}` }}
    >
      <div
        className="absolute inset-y-0 -right-12 w-24 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${a.glow} 0%, transparent 70%)` }}
      />
      <div className="eyebrow">{label}</div>
      <div
        className="font-display font-bold tabular-nums leading-none mt-2 text-3xl md:text-4xl"
        style={{ color: a.fg, textShadow: `0 0 18px ${a.glow}` }}
      >
        {value}
      </div>
      <div className="text-xs text-slate-400 mt-2">{hint}</div>
    </div>
  )
}

// Glowing-pip rank badge: top 3 get a colored glowing ring around the medal
// emoji (gold / silver / bronze). 4+ render as a tidy #NNN mono chip with a
// hairline border so the column has consistent width across ranks.
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1 || rank === 2 || rank === 3) {
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
    const glow =
      rank === 1 ? 'rgba(253,224,71,0.45)' :
      rank === 2 ? 'rgba(203,213,225,0.40)' :
                   'rgba(251,146,60,0.45)'
    const ring =
      rank === 1 ? 'rgba(253,224,71,0.55)' :
      rank === 2 ? 'rgba(203,213,225,0.50)' :
                   'rgba(251,146,60,0.55)'
    return (
      <span
        className="inline-flex items-center justify-center w-11 h-11 rounded-full"
        style={{
          background: 'rgba(15,23,42,0.6)',
          border: `1px solid ${ring}`,
          boxShadow: `0 0 18px ${glow}, inset 0 0 10px ${glow}`,
        }}
        aria-label={`Rank ${rank}`}
      >
        <span className="text-2xl leading-none">{medal}</span>
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center justify-center font-mono tabular-nums text-sm font-semibold px-2.5 py-1 rounded-md"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        color: 'rgb(203 213 225)',
      }}
    >
      #{rank}
    </span>
  )
}
