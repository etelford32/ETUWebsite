"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile, LeaderboardEntry } from '@/lib/types'
import { SteamProfileLink } from '@/components/SteamProfileLink'
import Header from '@/components/Header'

interface SessionUser {
  id: string
  email: string
  displayName?: string | null
  role: string
  isAlphaTester: boolean
  status?: string | null
  createdAt?: string | null
  lastLoginAt?: string | null
  loginCount: number
}

const STEAM_URL = 'https://store.steampowered.com/app/4094340/Explore_the_Universe_2175/'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<SessionUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    void init()
  }, [])

  async function init() {
    try {
      const sessionRes = await fetch('/api/auth/session')
      const sessionData = await sessionRes.json()

      if (!sessionData.authenticated) {
        router.push('/login?redirect=/dashboard')
        return
      }

      setAccount(sessionData.user)

      // Profile (game fields) and leaderboard in parallel; the user id from
      // the session lets us locate the player's own rank.
      const [profileRes, lbRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/leaderboard?window=30d&pageSize=100'),
      ])

      const profileData = await profileRes.json()
      if (profileData.profile) setProfile(profileData.profile)

      const lbData = await lbRes.json()
      if (Array.isArray(lbData.data)) {
        setLeaderboard(lbData.data)
        const mine = lbData.data.find(
          (e: LeaderboardEntry) => e.user_id === sessionData.user.id
        )
        if (mine) setUserRank(mine.rank ?? null)
      }
    } catch (error) {
      console.error('Dashboard load error:', error)
      router.push('/login?redirect=/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      router.push('/')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black">
        <Header />
        <div className="flex items-center justify-center py-32 text-slate-400">
          Loading your dashboard…
        </div>
      </div>
    )
  }

  const name = profile?.username || account?.displayName || account?.email?.split('@')[0] || 'Commander'
  const memberSince = account?.createdAt
    ? new Date(account.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header with Sign Out */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome back, {name}</h1>
            <p className="text-slate-400 mt-1">Your commander profile and playtest status</p>
          </div>
          <div className="flex items-center gap-3">
            {account?.role === 'admin' || account?.role === 'staff' ? (
              <a
                href="/admin"
                className="px-4 py-2 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-200 hover:bg-purple-600/50 text-sm transition-colors"
              >
                Admin
              </a>
            ) : null}
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Profile + account status */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Profile card */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30">
            <div className="flex items-center gap-4">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={name}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500/40"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-600/30 flex items-center justify-center text-2xl font-bold text-indigo-200">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-white">{name}</h2>
                  {account?.isAlphaTester && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/40">
                      ☢ Alpha Tester
                    </span>
                  )}
                  {(account?.role === 'admin' || account?.role === 'staff') && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 capitalize">
                      {account.role}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm mt-1">{account?.email}</p>
                {profile?.faction_choice && (
                  <p className="text-slate-300 text-sm mt-1">
                    Faction: <span className="capitalize">{profile.faction_choice}</span>
                  </p>
                )}
              </div>
              {userRank != null && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-indigo-400">#{userRank}</div>
                  <div className="text-sm text-slate-400">Global Rank</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
              <Stat label="Member since" value={memberSince || '—'} />
              <Stat label="Sign-ins" value={String(account?.loginCount ?? 0)} />
              <Stat label="Status" value={account?.status || 'active'} capitalize />
            </div>
          </div>

          {/* Steam link */}
          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h3 className="font-semibold text-white mb-1">Steam</h3>
            <p className="text-sm text-slate-400 mb-4">
              Link Steam to sync your avatar and request playtest access.
            </p>
            <SteamProfileLink currentSteamId={profile?.steam_id} />
          </div>
        </div>

        {/* Playtest CTA */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">The Steam Playtest is open</h3>
            <p className="text-slate-300 text-sm mt-1">
              Request access on Steam — 100 testers approved daily. Be ready for Early Access in 2027.
            </p>
          </div>
          <a
            href={STEAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition"
          >
            ▶ Request Playtest Access
          </a>
        </div>

        {/* Leaderboard */}
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-xl font-bold text-white">Top Commanders</h3>
            <p className="text-slate-400 text-sm mt-1">Last 30 days</p>
          </div>

          {leaderboard.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">🏆</div>
              <p className="text-slate-300 font-medium">Leaderboards launch with the playtest</p>
              <p className="text-slate-500 text-sm mt-1">
                Your runs will rank here once in-game scoring goes live.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/70 text-slate-300">
                  <tr className="border-b border-slate-800">
                    <th className="py-3 px-4 text-right font-semibold">#</th>
                    <th className="py-3 px-4 text-left font-semibold">Commander</th>
                    <th className="py-3 px-4 text-right font-semibold">Score</th>
                    <th className="py-3 px-4 text-left font-semibold">Mode</th>
                    <th className="py-3 px-4 text-left font-semibold">Platform</th>
                    <th className="py-3 px-4 text-left font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, idx) => (
                    <tr
                      key={entry.id}
                      className={`border-t border-slate-800/80 hover:bg-slate-900/40 ${
                        entry.user_id === account?.id ? 'bg-indigo-950/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-right font-mono">{entry.rank ?? idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {entry.profile?.avatar_url && (
                            <img src={entry.profile.avatar_url} alt="avatar" className="w-8 h-8 rounded-full" />
                          )}
                          <span className="font-medium">{entry.profile?.username || 'Anonymous'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-indigo-400">
                        {entry.score.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{entry.mode}</td>
                      <td className="py-3 px-4">{entry.platform}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(entry.submitted_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid md:grid-cols-4 gap-4">
          <a href="/profile" className="p-4 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 hover:border-indigo-400/50 transition">
            <h4 className="font-semibold text-white">Player Profile</h4>
            <p className="text-sm text-slate-400 mt-1">Edit name, avatar & faction</p>
          </a>
          <a href="/feedback" className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
            <h4 className="font-semibold text-white">Feedback</h4>
            <p className="text-sm text-slate-400 mt-1">Shape the game</p>
          </a>
          <a href="/leaderboard" className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
            <h4 className="font-semibold text-white">Leaderboard</h4>
            <p className="text-sm text-slate-400 mt-1">See top commanders</p>
          </a>
          <a href={STEAM_URL} target="_blank" rel="noopener noreferrer" className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
            <h4 className="font-semibold text-white">Steam Page</h4>
            <p className="text-sm text-slate-400 mt-1">Wishlist & playtest</p>
          </a>
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <div className={`text-lg font-bold text-white ${capitalize ? 'capitalize' : ''}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}
