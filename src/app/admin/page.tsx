"use client"

import { useState, useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DashboardStats {
  stats: {
    totalUsers: number
    alphaTesters: number
    alphaApplicationsPending: number
    alphaApplicationsTotal: number
    pendingInvites: number
    signups30d: number
    logins30d: number
    steamLinked: number
    steamVerifiedOwners: number
    steamSignins30d: number
    steamSignups30d: number
    wishlistClicks30d: number
  }
  recentActivity: ActivityItem[]
  securityAlerts: SecurityAlert[]
  systemHealth: SystemHealth
}

interface ActivityItem {
  id: string
  type: string
  description: string
  timestamp: string
  user?: string
  detail?: string
}

interface SecurityAlert {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  timestamp: string
  resolved: boolean
}

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error'
  authentication: 'healthy' | 'warning' | 'error'
  api: 'healthy' | 'warning' | 'error'
  steamPublisherKey?: 'healthy' | 'warning' | 'error'
  steamWebApiKey?: 'healthy' | 'warning' | 'error'
}

interface RecentFeedback {
  id: string
  type: string
  title: string
  description: string
  status: string
  priority: string
  source: string
  email: string | null
  created_at: string
  profile?: { username?: string; display_name?: string; email?: string } | null
}

interface RecentApplication {
  id: string
  kind: 'alpha' | 'career'
  name: string
  email: string
  headline: string
  summary: string
  status: string
  created_at: string
}

const RECENT_LIMIT = 10

const FEEDBACK_STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
  closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  duplicate: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const APPLICATION_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  reviewing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  interviewed: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  accepted: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const FEEDBACK_TYPE_ICONS: Record<string, string> = {
  bug: '🐛',
  feature: '✨',
  suggestion: '💡',
  support: '🛟',
  other: '💬',
}

function blurb(text: string, max = 140) {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  return clean.length > max ? clean.slice(0, max).trimEnd() + '…' : clean
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

const SEVERITY_COLORS = {
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const HEALTH_COLORS = {
  healthy: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
}

const HEALTH_ICONS = {
  healthy: '✓',
  warning: '⚠',
  error: '✗',
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [recentFeedback, setRecentFeedback] = useState<RecentFeedback[] | null>(null)
  const [recentApplications, setRecentApplications] = useState<RecentApplication[] | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    setLoading(true)

    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()

      if (!data.authenticated) {
        router.push('/login?message=admin_auth_required')
        return
      }

      // Check admin role via session data
      const role = data.user.role

      if (role !== 'admin' && role !== 'staff') {
        router.push('/?error=unauthorized_admin_access')
        return
      }

      setUser(data.user)
      setIsAdmin(role === 'admin' || role === 'staff')
      await fetchDashboardData()
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function fetchDashboardData() {
    try {
      setRefreshing(true)

      const [statsRes, feedbackRes, applicationsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch(`/api/admin/feedback?limit=${RECENT_LIMIT}`),
        fetch(`/api/admin/applications?limit=${RECENT_LIMIT}`),
      ])

      if (statsRes.ok) {
        setStats(await statsRes.json())
      }
      setRecentFeedback(feedbackRes.ok ? (await feedbackRes.json()).feedback || [] : [])
      setRecentApplications(applicationsRes.ok ? (await applicationsRes.json()).applications || [] : [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="text-center text-slate-400">
            Loading admin dashboard...
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-slate-400 mt-2">
                Security monitoring and system overview
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              disabled={refreshing}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex gap-4 overflow-x-auto pb-2">
            <Link
              href="/admin"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg whitespace-nowrap"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              User Management
            </Link>
            <Link
              href="/admin/invites"
              className="px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-300 rounded-lg transition-colors whitespace-nowrap"
            >
              ✉️ Invitations
            </Link>
            <Link
              href="/admin/applications"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              Applications
            </Link>
            <Link
              href="/admin/feedback"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              Feedback Management
            </Link>
            <Link
              href="/admin/content"
              className="px-4 py-2 bg-pink-600/30 hover:bg-pink-600/50 border border-pink-500/30 text-pink-300 rounded-lg transition-colors whitespace-nowrap"
            >
              ✏️ Content Editor
            </Link>
            {user?.role === 'admin' && (
              <Link
                href="/admin/google-analytics"
                className="px-4 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/30 text-emerald-300 rounded-lg transition-colors whitespace-nowrap"
              >
                📈 Google Analytics
              </Link>
            )}
            {user?.isSuperuser && (
              <Link
                href="/admin/superuser"
                className="px-4 py-2 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/30 text-amber-300 rounded-lg transition-colors whitespace-nowrap"
              >
                👑 Superuser
              </Link>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <StatsCard
            title="Total Users"
            value={stats?.stats.totalUsers || 0}
            icon="👥"
            color="from-blue-500 to-cyan-500"
          />
          <StatsCard
            title="Alpha Applications"
            value={stats?.stats.alphaApplicationsPending || 0}
            hint={
              stats
                ? `${stats.stats.alphaApplicationsTotal} total · ${stats.stats.alphaTesters} approved`
                : undefined
            }
            icon="📝"
            color="from-purple-500 to-pink-500"
          />
          <StatsCard
            title="Pending Invites"
            value={stats?.stats.pendingInvites || 0}
            icon="✉️"
            color="from-green-500 to-emerald-500"
          />
          <StatsCard
            title="Sign-ins (30d)"
            value={stats?.stats.logins30d || 0}
            hint={stats ? `${stats.stats.signups30d} new signups` : undefined}
            icon="🔑"
            color="from-orange-500 to-red-500"
          />
          <StatsCard
            title="Steam Accounts"
            value={stats?.stats.steamLinked || 0}
            hint={
              stats
                ? `${stats.stats.steamVerifiedOwners} verified owners · ${stats.stats.steamSignins30d} Steam sign-ins (30d)`
                : undefined
            }
            icon="🎮"
            color="from-sky-500 to-indigo-500"
          />
          <StatsCard
            title="Wishlist Clicks (30d)"
            value={stats?.stats.wishlistClicks30d || 0}
            hint={stats ? `${stats.stats.steamSignups30d} signed up via Steam` : undefined}
            icon="🎯"
            color="from-cyan-500 to-teal-500"
          />
        </div>

        {/* Recent Applications & Feedback */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RecentPanel
            title="Latest Applications"
            icon="📝"
            viewAllHref="/admin/applications"
            delay={0.05}
            items={recentApplications}
            emptyText="No applications yet"
            renderItem={(app) => (
              <Link
                key={`${app.kind}-${app.id}`}
                href={`/admin/applications?id=${app.id}&kind=${app.kind}`}
                className="block p-3 bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-purple-500/30 rounded-lg transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">
                      {app.kind === 'alpha' ? '🚀' : '💼'} {app.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{app.headline}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-xs border capitalize ${APPLICATION_STATUS_COLORS[app.status] || FEEDBACK_STATUS_COLORS.closed}`}>
                      {app.status}
                    </span>
                    <span className="text-xs text-slate-500">{timeAgo(app.created_at)}</span>
                  </div>
                </div>
                {app.summary && (
                  <p className="text-sm text-slate-400 mt-2">{blurb(app.summary)}</p>
                )}
              </Link>
            )}
          />

          <RecentPanel
            title="Latest User Feedback"
            icon="💬"
            viewAllHref="/admin/feedback"
            delay={0.1}
            items={recentFeedback}
            emptyText="No feedback yet"
            renderItem={(item) => (
              <Link
                key={item.id}
                href={`/admin/feedback?id=${item.id}`}
                className="block p-3 bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-cyan-500/30 rounded-lg transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">
                      {FEEDBACK_TYPE_ICONS[item.type] || '💬'} {item.title}
                    </div>
                    <div className="text-xs text-slate-500 truncate capitalize">
                      {item.type} · {item.priority} priority · {item.source} ·{' '}
                      <span className="normal-case">
                        {item.profile?.username || item.profile?.display_name || item.email || 'Anonymous'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-xs border capitalize ${FEEDBACK_STATUS_COLORS[item.status] || FEEDBACK_STATUS_COLORS.closed}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500">{timeAgo(item.created_at)}</span>
                  </div>
                </div>
                {item.description && (
                  <p className="text-sm text-slate-400 mt-2">{blurb(item.description)}</p>
                )}
              </Link>
            )}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span>🔧</span> System Health
            </h2>
            <div className="space-y-4">
              <HealthItem
                label="Database Connection"
                status={stats?.systemHealth.database || 'healthy'}
              />
              <HealthItem
                label="Authentication Service"
                status={stats?.systemHealth.authentication || 'healthy'}
              />
              <HealthItem
                label="API Endpoints"
                status={stats?.systemHealth.api || 'healthy'}
              />
              <HealthItem
                label="Steam publisher key (ownership checks, game sign-in)"
                status={stats?.systemHealth.steamPublisherKey || 'warning'}
                statusLabel={{ healthy: 'configured', warning: 'missing', error: 'error' }}
              />
              <HealthItem
                label="Steam Web API key (persona & avatar)"
                status={stats?.systemHealth.steamWebApiKey || 'warning'}
                statusLabel={{ healthy: 'configured', warning: 'missing', error: 'error' }}
              />
            </div>
          </motion.div>

          {/* Security Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span>🔒</span> Security Alerts
            </h2>
            <div className="space-y-3">
              {stats?.securityAlerts.length === 0 ? (
                <p className="text-slate-400">No security alerts</p>
              ) : (
                stats?.securityAlerts.map((alert) => (
                  <SecurityAlertCard key={alert.id} alert={alert} />
                ))
              )}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 lg:col-span-2"
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📊</span> Recent Activity
            </h2>
            <div className="space-y-3">
              {stats?.recentActivity.length === 0 ? (
                <p className="text-slate-400">No recent activity</p>
              ) : (
                stats?.recentActivity.map((item) => (
                  <ActivityCard key={item.id} item={item} />
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6"
        >
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <span>⚡</span> Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/invites"
              className="p-4 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg transition-all group"
            >
              <div className="text-2xl mb-2">✉️</div>
              <div className="text-white font-semibold group-hover:text-indigo-300">
                Invite Users
              </div>
              <div className="text-slate-400 text-sm">
                Send email invitations to new users
              </div>
            </Link>
            <Link
              href="/admin/applications"
              className="p-4 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-lg transition-all group"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="text-white font-semibold group-hover:text-cyan-300">
                Review Applications
              </div>
              <div className="text-slate-400 text-sm">
                Alpha tester and career applications
              </div>
            </Link>
            <Link
              href="/admin/feedback"
              className="p-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-all group"
            >
              <div className="text-2xl mb-2">💬</div>
              <div className="text-white font-semibold group-hover:text-purple-300">
                Manage Feedback
              </div>
              <div className="text-slate-400 text-sm">
                Review and respond to user feedback
              </div>
            </Link>
            <Link
              href="/admin/content"
              className="p-4 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 rounded-lg transition-all group"
            >
              <div className="text-2xl mb-2">✏️</div>
              <div className="text-white font-semibold group-hover:text-pink-300">
                Content Editor
              </div>
              <div className="text-slate-400 text-sm">
                Write and publish devlog entries
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Recent-items panel (latest applications / feedback)
function RecentPanel<T>({
  title,
  icon,
  viewAllHref,
  delay,
  items,
  emptyText,
  renderItem,
}: {
  title: string
  icon: string
  viewAllHref: string
  delay: number
  items: T[] | null
  emptyText: string
  renderItem: (item: T) => ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>{icon}</span> {title}
        </h2>
        <Link
          href={viewAllHref}
          className="text-sm text-purple-300 hover:text-purple-200 whitespace-nowrap"
        >
          View all →
        </Link>
      </div>
      <div className="space-y-2 max-h-[36rem] overflow-y-auto pr-1">
        {items === null ? (
          <p className="text-slate-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-slate-400">{emptyText}</p>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </motion.div>
  )
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon,
  color,
  hint,
}: {
  title: string
  value: number
  icon: string
  color: string
  hint?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-3xl">{icon}</div>
        <div className={`text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
          {value.toLocaleString()}
        </div>
      </div>
      <div className="text-slate-400">{title}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </motion.div>
  )
}

// Health Item Component
function HealthItem({
  label,
  status,
  statusLabel,
}: {
  label: string
  status: 'healthy' | 'warning' | 'error'
  /** Optional wording per status (e.g. configured / missing). */
  statusLabel?: Partial<Record<'healthy' | 'warning' | 'error', string>>
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-slate-800/50 rounded-lg">
      <span className="text-slate-300">{label}</span>
      <span className={`flex items-center gap-2 font-semibold whitespace-nowrap ${HEALTH_COLORS[status]}`}>
        <span>{HEALTH_ICONS[status]}</span>
        <span className="capitalize">{statusLabel?.[status] ?? status}</span>
      </span>
    </div>
  )
}

// Security Alert Card
function SecurityAlertCard({ alert }: { alert: SecurityAlert }) {
  return (
    <div
      className={`p-3 rounded-lg border ${SEVERITY_COLORS[alert.severity]} ${
        alert.resolved ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="font-semibold">{alert.title}</div>
        {alert.resolved && (
          <span className="text-xs text-green-400">✓ Resolved</span>
        )}
      </div>
      <div className="text-sm opacity-80">{alert.description}</div>
      <div className="text-xs opacity-60 mt-2">
        {new Date(alert.timestamp).toLocaleString()}
      </div>
    </div>
  )
}

// Activity Card
function ActivityCard({ item }: { item: ActivityItem }) {
  return (
    <div className="p-3 bg-slate-800/50 rounded-lg">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-white">
            {item.description}
            {item.user && <span className="text-slate-400"> — {item.user}</span>}
          </div>
          {item.detail && (
            <div className="text-sm text-slate-500 mt-1">{item.detail}</div>
          )}
        </div>
        <div className="text-xs text-slate-500 whitespace-nowrap">
          {new Date(item.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
