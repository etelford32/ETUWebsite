"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Profile, LeaderboardEntry } from '@/lib/types'
import { SteamProfileLink } from '@/components/SteamProfileLink'
import Header from '@/components/Header'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    checkUser()
    fetchLeaderboard()
  }, [])

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/')
        return
      }

      // Fetch user profile
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
      } else {
        setProfile(profileData)
      }
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  async function fetchLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard?window=30d&pageSize=100')
      const json = await res.json()

      if (json.data) {
        setLeaderboard(json.data)

        // Find user's rank
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const userEntry = json.data.find((entry: LeaderboardEntry) =>
            entry.user_id === session.user.id
          )
          if (userEntry) {
            setUserRank(userEntry.rank || null)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header with Sign Out */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-slate-400 mt-1">Manage your profile and view your stats</p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition-colors"
          >
            Sign Out
          </button>
        </div>
        {/* Steam Link Section */}
        <div className="mb-6">
          <SteamProfileLink currentSteamId={profile?.steam_id} />
        </div>

        {/* User Profile Card */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30">
          <div className="flex items-center gap-4">
            {profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={profile.username || 'Avatar'}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {profile?.username || 'Commander'}
              </h2>
              {profile?.faction_choice && (
                <p className="text-slate-300">
                  Faction: <span className="capitalize">{profile.faction_choice}</span>
                </p>
              )}
            </div>
            {userRank && (
              <div className="text-right">
                <div className="text-3xl font-bold text-indigo-400">#{userRank}</div>
                <div className="text-sm text-slate-400">Global Rank</div>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-xl font-bold">Top 100 Commanders</h3>
            <p className="text-slate-400 text-sm mt-1">Last 30 days</p>
          </div>

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
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No scores yet. Be the first to submit!
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((entry, idx) => (
                    <tr
                      key={entry.id}
                      className={`border-t border-slate-800/80 hover:bg-slate-900/40 ${
                        entry.user_id === profile?.id ? 'bg-indigo-950/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-right font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {entry.profile?.avatar_url && (
                            <img
                              src={entry.profile.avatar_url}
                              alt="avatar"
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <span className="font-medium">
                            {entry.profile?.username || 'Anonymous'}
                          </span>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid md:grid-cols-4 gap-4">
          <a
            href="/profile"
            className="p-4 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 hover:border-indigo-400/50 transition"
          >
            <h4 className="font-semibold">Player Profile</h4>
            <p className="text-sm text-slate-400 mt-1">View stats & achievements</p>
          </a>
          <a
            href="/"
            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <h4 className="font-semibold">Download Game</h4>
            <p className="text-sm text-slate-400 mt-1">Get the latest version</p>
          </a>
          <a
            href="/"
            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <h4 className="font-semibold">Join Discord</h4>
            <p className="text-sm text-slate-400 mt-1">Connect with community</p>
          </a>
          <a
            href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <h4 className="font-semibold">Steam Page</h4>
            <p className="text-sm text-slate-400 mt-1">Wishlist on Steam</p>
          </a>
        </div>
      </main>
    </div>
  )
}
