"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Profile } from '@/lib/types'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface PlayerProfile {
  id: string
  username: string
  steam_id: string | null
  avatar_url: string | null
  faction_choice: string // Always has default 'neutral'
  ship_class: string | null
  created_at: string
  updated_at: string
  // Stats - always populated (from DB or defaults)
  level: number
  xp: number
  total_kills: number
  total_deaths: number
  total_wins: number
  total_losses: number
  total_playtime: number
  highest_score: number
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface MatchHistory {
  id: string
  mode: string
  score: number
  kills: number
  deaths: number
  result: 'win' | 'loss'
  duration: number
  date: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUsername, setEditedUsername] = useState('')
  const [editedFaction, setEditedFaction] = useState('')
  const [editedShipClass, setEditedShipClass] = useState('')
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements' | 'history' | 'settings'>('stats')

  // Mock data for now - will be replaced with real data from game
  const [achievements] = useState<Achievement[]>([
    {
      id: '1',
      name: 'First Blood',
      description: 'Destroy your first enemy ship',
      icon: '⚔️',
      unlocked: true,
      unlockedAt: '2024-12-20',
      rarity: 'common'
    },
    {
      id: '2',
      name: 'Ace Pilot',
      description: 'Win 10 consecutive battles',
      icon: '🎖️',
      unlocked: true,
      unlockedAt: '2024-12-22',
      rarity: 'rare'
    },
    {
      id: '3',
      name: 'MEGABOT Slayer',
      description: 'Defeat the MEGABOT boss',
      icon: '🤖',
      unlocked: false,
      rarity: 'epic'
    },
    {
      id: '4',
      name: 'Galaxy Explorer',
      description: 'Discover 100 star systems',
      icon: '🌌',
      unlocked: true,
      unlockedAt: '2024-12-15',
      rarity: 'rare'
    },
    {
      id: '5',
      name: 'Legendary Commander',
      description: 'Reach level 100',
      icon: '👑',
      unlocked: false,
      rarity: 'legendary'
    },
    {
      id: '6',
      name: 'Speed Runner',
      description: 'Complete a run in under 30 minutes',
      icon: '⚡',
      unlocked: false,
      rarity: 'epic'
    }
  ])

  const [matchHistory] = useState<MatchHistory[]>([
    {
      id: '1',
      mode: 'Any% Run',
      score: 125430,
      kills: 45,
      deaths: 3,
      result: 'win',
      duration: 2340,
      date: '2024-12-22T18:30:00Z'
    },
    {
      id: '2',
      mode: 'Boss Rush',
      score: 98200,
      kills: 32,
      deaths: 8,
      result: 'loss',
      duration: 1920,
      date: '2024-12-22T16:15:00Z'
    },
    {
      id: '3',
      mode: 'Discovery',
      score: 156700,
      kills: 28,
      deaths: 2,
      result: 'win',
      duration: 3600,
      date: '2024-12-21T20:00:00Z'
    }
  ])

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // Fetch profile from database
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
      }

      // Type assertion for profileData (safe because we're providing defaults)
      const dbProfile = profileData as Profile | null

      // Use database data if available, otherwise use defaults
      const profile: PlayerProfile = {
        id: session.user.id,
        username: dbProfile?.username || session.user.email?.split('@')[0] || 'Commander',
        steam_id: dbProfile?.steam_id || null,
        avatar_url: dbProfile?.avatar_url || null,
        faction_choice: dbProfile?.faction_choice || 'neutral',
        ship_class: dbProfile?.ship_class || null,
        created_at: dbProfile?.created_at || new Date().toISOString(),
        updated_at: dbProfile?.updated_at || new Date().toISOString(),
        // Stats - use DB values or defaults (handles case where columns don't exist yet)
        level: dbProfile?.level ?? 1,
        xp: dbProfile?.xp ?? 0,
        total_kills: dbProfile?.total_kills ?? 0,
        total_deaths: dbProfile?.total_deaths ?? 0,
        total_wins: dbProfile?.total_wins ?? 0,
        total_losses: dbProfile?.total_losses ?? 0,
        total_playtime: dbProfile?.total_playtime ?? 0,
        highest_score: dbProfile?.highest_score ?? 0
      }

      setProfile(profile)
      setEditedUsername(profile.username)
      setEditedFaction(profile.faction_choice)
      setEditedShipClass(profile.ship_class || '')
    } catch (error) {
      console.error('Error loading profile:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile() {
    if (!profile) return

    try {
      const { error } = await (supabase
        .from('profiles') as any)
        .update({
          username: editedUsername,
          faction_choice: editedFaction
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({
        ...profile,
        username: editedUsername,
        faction_choice: editedFaction,
        ship_class: editedShipClass
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    }
  }

  const calculateXPProgress = () => {
    if (!profile) return 0
    const xpForNextLevel = profile.level * 1000
    const currentLevelXP = profile.xp % 1000
    return (currentLevelXP / xpForNextLevel) * 100
  }

  const formatPlaytime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-slate-500 to-slate-600'
      case 'rare': return 'from-blue-500 to-blue-600'
      case 'epic': return 'from-purple-500 to-purple-600'
      case 'legendary': return 'from-amber-500 to-orange-600'
      default: return 'from-slate-500 to-slate-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="text-xl text-slate-400">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="text-xl text-slate-400">Profile not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <Header />

      {/* Animated background stars */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 etu-starfield opacity-20"></div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-cyan-900/40 border border-indigo-500/30 p-8">
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 blur-3xl"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur-xl opacity-60"></div>
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-4xl">
                      🚀
                    </div>
                  )}
                </div>
                {/* Level badge */}
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full px-4 py-1 font-bold text-sm shadow-lg">
                  LVL {profile.level}
                </div>
              </div>

              {/* User info */}
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editedUsername}
                      onChange={(e) => setEditedUsername(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Username"
                    />
                    <select
                      value={editedFaction}
                      onChange={(e) => setEditedFaction(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="neutral">Neutral</option>
                      <option value="crystal">Crystal Intelligences</option>
                      <option value="mycelari">Mycelari</option>
                      <option value="megabot">Megabot</option>
                      <option value="wild">Wild</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                      {profile.username}
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-slate-300">
                      <span className="flex items-center gap-2">
                        <span className="text-indigo-400">⚔️</span>
                        {profile.ship_class || 'No Ship Selected'}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-2 capitalize">
                        <span className="text-purple-400">🏴</span>
                        {profile.faction_choice}
                      </span>
                    </div>
                  </>
                )}

                {/* XP Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-400">Experience</span>
                    <span className="text-cyan-400 font-mono">{profile.xp.toLocaleString()} XP</span>
                  </div>
                  <div className="h-3 bg-slate-800/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${calculateXPProgress()}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full"
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {Math.floor(calculateXPProgress())}% to Level {profile.level + 1}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveProfile}
                      className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg font-semibold transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setEditedUsername(profile.username)
                        setEditedFaction(profile.faction_choice)
                      }}
                      className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold transition-all"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg font-semibold transition-all"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {(['stats', 'achievements', 'history', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-semibold capitalize transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-xl bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30">
                <div className="text-3xl mb-2">🏆</div>
                <div className="text-3xl font-bold text-green-400">{profile.total_wins}</div>
                <div className="text-sm text-slate-400">Victories</div>
              </div>
              <div className="p-6 rounded-xl bg-gradient-to-br from-red-900/20 to-rose-900/20 border border-red-500/30">
                <div className="text-3xl mb-2">💀</div>
                <div className="text-3xl font-bold text-red-400">{profile.total_losses}</div>
                <div className="text-sm text-slate-400">Defeats</div>
              </div>
              <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30">
                <div className="text-3xl mb-2">⚔️</div>
                <div className="text-3xl font-bold text-cyan-400">{profile.total_kills}</div>
                <div className="text-sm text-slate-400">Eliminations</div>
              </div>
              <div className="p-6 rounded-xl bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30">
                <div className="text-3xl mb-2">⏱️</div>
                <div className="text-3xl font-bold text-amber-400">{formatPlaytime(profile.total_playtime)}</div>
                <div className="text-sm text-slate-400">Playtime</div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-700">
                <h3 className="text-xl font-bold mb-4">Combat Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">K/D Ratio</span>
                    <span className="font-bold text-cyan-400">
                      {(profile.total_kills / Math.max(profile.total_deaths, 1)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Win Rate</span>
                    <span className="font-bold text-green-400">
                      {((profile.total_wins / (profile.total_wins + profile.total_losses)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Highest Score</span>
                    <span className="font-bold font-mono text-amber-400">
                      {profile.highest_score.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Matches</span>
                    <span className="font-bold text-indigo-400">
                      {profile.total_wins + profile.total_losses}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-700">
                <h3 className="text-xl font-bold mb-4">Career Progress</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Commander Since</span>
                    <span className="font-bold text-slate-300">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Level</span>
                    <span className="font-bold text-amber-400">{profile.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total XP Earned</span>
                    <span className="font-bold font-mono text-cyan-400">
                      {profile.xp.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Achievements Unlocked</span>
                    <span className="font-bold text-purple-400">
                      {achievements.filter(a => a.unlocked).length}/{achievements.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Achievements</h2>
                <p className="text-slate-400">
                  {achievements.filter(a => a.unlocked).length} of {achievements.length} unlocked
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-400">
                  {Math.floor((achievements.filter(a => a.unlocked).length / achievements.length) * 100)}%
                </div>
                <div className="text-sm text-slate-400">Completion</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement) => (
                <motion.div
                  key={achievement.id}
                  whileHover={{ scale: 1.02 }}
                  className={`p-6 rounded-xl border ${
                    achievement.unlocked
                      ? `bg-gradient-to-br ${getRarityColor(achievement.rarity)}/20 border-${achievement.rarity === 'legendary' ? 'amber' : achievement.rarity === 'epic' ? 'purple' : achievement.rarity === 'rare' ? 'blue' : 'slate'}-500/30`
                      : 'bg-slate-900/40 border-slate-700 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`text-4xl ${!achievement.unlocked && 'grayscale'}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold mb-1">{achievement.name}</h3>
                      <p className="text-sm text-slate-400 mb-2">{achievement.description}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize font-semibold ${
                          achievement.rarity === 'legendary' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' :
                          achievement.rarity === 'epic' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' :
                          achievement.rarity === 'rare' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {achievement.rarity}
                        </span>
                        {achievement.unlocked && achievement.unlockedAt && (
                          <span className="text-xs text-slate-500">
                            {new Date(achievement.unlockedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Match History Tab */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold mb-6">Recent Matches</h2>
            <div className="space-y-4">
              {matchHistory.map((match) => (
                <div
                  key={match.id}
                  className="p-6 rounded-xl bg-slate-900/60 border border-slate-700 hover:border-slate-600 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          match.result === 'win'
                            ? 'bg-green-900/40 text-green-400 border border-green-500/30'
                            : 'bg-red-900/40 text-red-400 border border-red-500/30'
                        }`}>
                          {match.result.toUpperCase()}
                        </span>
                        <span className="font-semibold">{match.mode}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 text-sm">
                          {new Date(match.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Score:</span>
                          <span className="ml-2 font-mono text-cyan-400">{match.score.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">K/D:</span>
                          <span className="ml-2 font-mono text-amber-400">{match.kills}/{match.deaths}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Duration:</span>
                          <span className="ml-2 text-slate-300">{formatPlaytime(match.duration)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-700">
              <h3 className="text-xl font-bold mb-4">Account Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile.id}
                    className="w-full px-4 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Privacy
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="w-4 h-4 rounded" defaultChecked />
                      <span className="text-sm">Show my profile on leaderboards</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="w-4 h-4 rounded" defaultChecked />
                      <span className="text-sm">Allow friend requests</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="w-4 h-4 rounded" />
                      <span className="text-sm">Hide match history</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-red-900/20 border border-red-500/30">
              <h3 className="text-xl font-bold mb-2 text-red-400">Danger Zone</h3>
              <p className="text-slate-400 text-sm mb-4">
                These actions are irreversible. Please be certain.
              </p>
              <div className="space-y-3">
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-all">
                  Reset Statistics
                </button>
                <button className="px-4 py-2 bg-red-800 hover:bg-red-900 rounded-lg font-semibold transition-all ml-3">
                  Delete Account
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  )
}
