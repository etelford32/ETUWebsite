"use client"

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LeaderboardEntry } from '@/lib/types'
import Header from '@/components/Header'

type TimeWindow = 'today' | '7d' | '30d' | '90d' | 'all'
type SortField = 'score' | 'level' | 'submitted_at'

const WINDOWS = [
  { key: 'today' as TimeWindow, label: 'Today', icon: '🌟' },
  { key: '7d' as TimeWindow, label: '7 Days', icon: '📅' },
  { key: '30d' as TimeWindow, label: '30 Days', icon: '🔥' },
  { key: '90d' as TimeWindow, label: '90 Days', icon: '⚡' },
  { key: 'all' as TimeWindow, label: 'All-Time', icon: '🏆' },
]

const MODES = [
  { key: 'all', label: 'All Modes', icon: '🌌' },
  { key: 'speedrun', label: 'Speedrun', icon: '⚡' },
  { key: 'survival', label: 'Survival', icon: '🛡️' },
  { key: 'discovery', label: 'Discovery', icon: '🔭' },
  { key: 'boss_rush', label: 'Boss Rush', icon: '⚔️' },
]

const PLATFORMS = ['all', 'PC', 'Mac', 'Linux', 'PS', 'Xbox', 'Switch']

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Filters
  const [window, setWindow] = useState<TimeWindow>('30d')
  const [mode, setMode] = useState('all')
  const [platform, setPlatform] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  // Check current user
  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      setCurrentUser(data.authenticated ? data.user : null)
    } catch (error) {
      setCurrentUser(null)
    }
  }

  // Fetch leaderboard data
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

  // Client-side filtering
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Platform filter
      if (platform !== 'all' && entry.platform !== platform) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const username = entry.profile?.username?.toLowerCase() || ''
        if (!username.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [entries, platform, searchQuery])

  // Find user's rank
  const userEntry = useMemo(() => {
    if (!currentUser) return null
    return entries.find(e => e.user_id === currentUser.id)
  }, [entries, currentUser])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            🏆 Global Leaderboards
          </h1>
          <p className="text-slate-400 text-lg mt-2">
            {total.toLocaleString()} commanders competing across the galaxy
          </p>
        </div>
        {/* User Rank Banner */}
        {userEntry && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 shadow-xl shadow-indigo-500/10"
          >
            <div className="flex items-center gap-4">
              {userEntry.profile?.avatar_url && (
                <img
                  src={userEntry.profile.avatar_url}
                  alt="Your avatar"
                  className="w-16 h-16 rounded-full border-2 border-indigo-400"
                />
              )}
              <div className="flex-1">
                <div className="text-lg font-semibold">
                  {userEntry.profile?.username || 'Commander'}
                </div>
                <div className="text-slate-300 text-sm">
                  Your best score: <span className="font-mono text-indigo-400">{userEntry.score.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-indigo-400">
                  #{userEntry.rank || '—'}
                </div>
                <div className="text-sm text-slate-400">Global Rank</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Time Window */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Time Period</label>
            <div className="flex flex-wrap gap-2">
              {WINDOWS.map(w => (
                <button
                  key={w.key}
                  onClick={() => { setWindow(w.key); setPage(1) }}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${window === w.key
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }
                  `}
                >
                  <span className="mr-2">{w.icon}</span>
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode & Platform & Search */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Mode */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Game Mode</label>
              <select
                value={mode}
                onChange={e => { setMode(e.target.value); setPage(1) }}
                className="w-full px-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              >
                {MODES.map(m => (
                  <option key={m.key} value={m.key}>
                    {m.icon} {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Platform */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Platform</label>
              <select
                value={platform}
                onChange={e => { setPlatform(e.target.value); setPage(1) }}
                className="w-full px-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              >
                {PLATFORMS.map(p => (
                  <option key={p} value={p}>
                    {p === 'all' ? '🌐 All Platforms' : `🎮 ${p}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Search Commander</label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by username..."
                className="w-full px-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <div className="text-slate-400">Loading leaderboard...</div>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-rose-400 mb-2">⚠️ {error}</div>
              <button
                onClick={fetchLeaderboard}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm"
              >
                Retry
              </button>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No scores found. Be the first to set a record! 🚀
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/70 text-slate-300 border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-4 text-right font-semibold w-20">Rank</th>
                      <th className="py-4 px-4 text-left font-semibold">Commander</th>
                      <th className="py-4 px-4 text-right font-semibold">Score</th>
                      <th className="py-4 px-4 text-center font-semibold">Level</th>
                      <th className="py-4 px-4 text-left font-semibold">Mode</th>
                      <th className="py-4 px-4 text-center font-semibold">Platform</th>
                      <th className="py-4 px-4 text-left font-semibold">Date</th>
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
                        />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/30">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-400">
                    Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()} entries
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
                    >
                      ← Previous
                    </button>
                    <div className="px-4 py-2 text-sm text-slate-300">
                      Page {page} of {totalPages}
                    </div>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
                    >
                      Next →
                    </button>
                  </div>

                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
                  >
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Call to Action */}
        <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 text-center">
          <h3 className="text-xl font-bold mb-2">Want to see your name here?</h3>
          <p className="text-slate-300 mb-4">
            Download Explore the Universe 2175 and start your journey to the top!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="/"
              className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold transition"
            >
              Download Game
            </a>
            <a
              href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              Wishlist on Steam
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

// Leaderboard Row Component
function LeaderboardRow({
  entry,
  index,
  isCurrentUser
}: {
  entry: LeaderboardEntry
  index: number
  isCurrentUser: boolean
}) {
  const rank = entry.rank || index + 1

  // Medal colors for top 3
  const getRankDisplay = () => {
    if (rank === 1) {
      return <span className="text-2xl">🥇</span>
    }
    if (rank === 2) {
      return <span className="text-2xl">🥈</span>
    }
    if (rank === 3) {
      return <span className="text-2xl">🥉</span>
    }
    return <span className="font-mono">#{rank}</span>
  }

  return (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.02 }}
      className={`
        border-t border-slate-800/80 transition-colors
        ${isCurrentUser
          ? 'bg-indigo-950/40 hover:bg-indigo-950/60'
          : 'hover:bg-slate-900/40'
        }
      `}
    >
      <td className="py-4 px-4 text-right font-bold">
        {getRankDisplay()}
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          {entry.profile?.avatar_url ? (
            <img
              src={entry.profile.avatar_url}
              alt={entry.profile.username || 'Avatar'}
              className="w-10 h-10 rounded-full border-2 border-slate-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg">
              👤
            </div>
          )}
          <div>
            <div className="font-semibold text-slate-100">
              {entry.profile?.username || 'Anonymous'}
              {isCurrentUser && (
                <span className="ml-2 text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-400">
                  You
                </span>
              )}
            </div>
            {entry.profile?.steam_id && (
              <div className="text-xs text-slate-500">
                Steam: {entry.profile.steam_id}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="py-4 px-4 text-right">
        <span className="font-mono text-lg font-bold text-indigo-400">
          {entry.score.toLocaleString()}
        </span>
      </td>
      <td className="py-4 px-4 text-center">
        <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-300 text-xs">
          Lv {entry.level}
        </span>
      </td>
      <td className="py-4 px-4">
        <span className="capitalize text-slate-300">{entry.mode}</span>
      </td>
      <td className="py-4 px-4 text-center">
        <span className="text-slate-400">{entry.platform}</span>
      </td>
      <td className="py-4 px-4 text-slate-400">
        {new Date(entry.submitted_at).toLocaleDateString()}
      </td>
    </motion.tr>
  )
}
