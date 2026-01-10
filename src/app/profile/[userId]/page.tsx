"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import {
  User,
  Shield,
  Sword,
  Trophy,
  Clock,
  Target,
  TrendingUp,
  Lock,
  Eye,
  Settings
} from 'lucide-react'

interface ProfileData {
  id: string
  username: string
  avatar_url: string | null
  faction_choice: string | null
  created_at: string
  level: number
  xp: number
  is_public: boolean
  stats: {
    total_kills: number
    total_deaths: number
    total_wins: number
    total_losses: number
    total_matches: number
    highest_score: number
    total_playtime: number
    playtime_formatted: string
    win_rate: string
    kd_ratio: string
  }
  meta?: {
    role: string
    ship_class: string | null
  }
  access: {
    is_owner: boolean
    is_admin: boolean
    can_edit: boolean
    can_view_private: boolean
  }
}

// Mock achievements for display
const mockAchievements = [
  {
    id: '1',
    name: 'First Blood',
    description: 'Destroy your first enemy ship',
    icon: '⚔️',
    unlocked: true,
    rarity: 'common'
  },
  {
    id: '2',
    name: 'Ace Pilot',
    description: 'Win 10 consecutive battles',
    icon: '🎖️',
    unlocked: true,
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
]

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements'>('stats')

  useEffect(() => {
    fetchProfile()
  }, [userId])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/profile/${userId}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Profile not found')
        } else if (response.status === 403) {
          setError('This profile is private')
        } else {
          setError('Failed to load profile')
        }
        return
      }

      const data = await response.json()
      setProfile(data.profile)
    } catch (err) {
      setError('Failed to load profile')
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const getFactionColor = (faction: string | null) => {
    switch (faction) {
      case 'crystal':
        return 'from-blue-500 to-cyan-500'
      case 'mycelari':
        return 'from-purple-500 to-pink-500'
      case 'megabot':
        return 'from-red-500 to-orange-500'
      case 'wild':
        return 'from-green-500 to-emerald-500'
      default:
        return 'from-slate-500 to-slate-600'
    }
  }

  const getFactionName = (faction: string | null) => {
    switch (faction) {
      case 'crystal':
        return 'Crystal Collective'
      case 'mycelari':
        return 'Mycelari Network'
      case 'megabot':
        return 'MEGABOT Empire'
      case 'wild':
        return 'The Wild'
      default:
        return 'No Faction'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Loading profile...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{error || 'Profile Not Found'}</h2>
              <p className="text-slate-400 mb-6">
                {error === 'This profile is private'
                  ? 'This user has set their profile to private.'
                  : 'The profile you\'re looking for doesn\'t exist.'}
              </p>
              <button
                onClick={() => router.push('/leaderboard')}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
              >
                View Leaderboard
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />

      <main className="container mx-auto px-4 py-12">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-slate-900/50 backdrop-blur rounded-2xl border border-slate-800 p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-5xl overflow-hidden border-4 border-slate-700">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-slate-500" />
                  )}
                </div>
                {/* Level Badge */}
                <div className={`absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-gradient-to-br ${getFactionColor(profile.faction_choice)} flex items-center justify-center border-4 border-slate-900 font-bold text-lg`}>
                  {profile.level}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{profile.username}</h1>
                  {!profile.is_public && profile.access.can_view_private && (
                    <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-yellow-400 text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      <span>Private</span>
                    </div>
                  )}
                  {profile.access.is_admin && (
                    <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-purple-400 text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>{profile.meta?.role === 'admin' ? 'Admin' : 'Moderator'}</span>
                    </div>
                  )}
                </div>

                {/* Faction */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${getFactionColor(profile.faction_choice)} bg-opacity-20 border border-white/10`}>
                    <span className="font-semibold">{getFactionName(profile.faction_choice)}</span>
                  </div>
                </div>

                {/* XP Progress */}
                <div className="max-w-md">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Level {profile.level}</span>
                    <span className="text-cyan-400">{profile.xp.toLocaleString()} XP</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      style={{ width: `${(profile.xp % 1000) / 10}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {profile.access.is_owner && (
                  <button
                    onClick={() => router.push('/profile')}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Edit Profile</span>
                  </button>
                )}
                {profile.access.is_admin && !profile.access.is_owner && (
                  <button
                    onClick={() => router.push(`/admin/users`)}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Shield className="w-5 h-5" />
                    <span>Admin Tools</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="bg-slate-900/50 backdrop-blur rounded-2xl border border-slate-800 overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-800">
            {[
              { id: 'stats', label: 'Stats', icon: TrendingUp },
              { id: 'achievements', label: 'Achievements', icon: Trophy },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {[
                  {
                    label: 'K/D Ratio',
                    value: profile.stats.kd_ratio,
                    icon: Sword,
                    color: 'text-red-400',
                  },
                  {
                    label: 'Win Rate',
                    value: `${profile.stats.win_rate}%`,
                    icon: Trophy,
                    color: 'text-yellow-400',
                  },
                  {
                    label: 'Highest Score',
                    value: profile.stats.highest_score.toLocaleString(),
                    icon: Target,
                    color: 'text-purple-400',
                  },
                  {
                    label: 'Total Matches',
                    value: profile.stats.total_matches,
                    icon: Shield,
                    color: 'text-blue-400',
                  },
                  {
                    label: 'Playtime',
                    value: profile.stats.playtime_formatted,
                    icon: Clock,
                    color: 'text-cyan-400',
                  },
                  {
                    label: 'Level',
                    value: profile.level,
                    icon: TrendingUp,
                    color: 'text-green-400',
                  },
                ].map((stat, index) => (
                  <div
                    key={index}
                    className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      <span className="text-slate-400 text-sm font-medium">{stat.label}</span>
                    </div>
                    <div className="text-3xl font-bold">{stat.value}</div>
                  </div>
                ))}

                {/* Detailed Stats */}
                <div className="md:col-span-2 lg:col-span-3 bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold mb-4">Combat Stats</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-slate-400 text-sm mb-1">Total Kills</div>
                      <div className="text-2xl font-bold text-green-400">{profile.stats.total_kills}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm mb-1">Total Deaths</div>
                      <div className="text-2xl font-bold text-red-400">{profile.stats.total_deaths}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm mb-1">Wins</div>
                      <div className="text-2xl font-bold text-yellow-400">{profile.stats.total_wins}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm mb-1">Losses</div>
                      <div className="text-2xl font-bold text-slate-400">{profile.stats.total_losses}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {mockAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      achievement.unlocked
                        ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        : 'bg-slate-900/30 border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`text-4xl ${achievement.unlocked ? 'grayscale-0' : 'grayscale'}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1">{achievement.name}</h4>
                        <p className="text-sm text-slate-400 mb-2">{achievement.description}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            achievement.rarity === 'legendary'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : achievement.rarity === 'epic'
                              ? 'bg-purple-500/20 text-purple-400'
                              : achievement.rarity === 'rare'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {achievement.rarity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="md:col-span-2 lg:col-span-3 text-center py-8 text-slate-500">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>More achievements coming soon!</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
