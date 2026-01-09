"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DashboardStats {
  totalUsers: number
  totalFeedback: number
  totalBacklogItems: number
  totalScores: number
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

      const response = await fetch('/api/admin/stats')
      const data = await response.json()

      if (response.ok) {
        setStats(data)
      }
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
              href="/admin/feedback"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              Feedback Management
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            icon="👥"
            color="from-blue-500 to-cyan-500"
          />
          <StatsCard
            title="Feedback Items"
            value={stats?.totalFeedback || 0}
            icon="💬"
            color="from-purple-500 to-pink-500"
          />
          <StatsCard
            title="Backlog Items"
            value={stats?.totalBacklogItems || 0}
            icon="📋"
            color="from-green-500 to-emerald-500"
          />
          <StatsCard
            title="Player Scores"
            value={stats?.totalScores || 0}
            icon="🏆"
            color="from-orange-500 to-red-500"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg opacity-50">
              <div className="text-2xl mb-2">👥</div>
              <div className="text-slate-400 font-semibold">
                User Management
              </div>
              <div className="text-slate-500 text-sm">Coming soon</div>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg opacity-50">
              <div className="text-2xl mb-2">📈</div>
              <div className="text-slate-400 font-semibold">
                Analytics
              </div>
              <div className="text-slate-500 text-sm">Coming soon</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: number
  icon: string
  color: string
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
    </motion.div>
  )
}

// Health Item Component
function HealthItem({
  label,
  status,
}: {
  label: string
  status: 'healthy' | 'warning' | 'error'
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
      <span className="text-slate-300">{label}</span>
      <span className={`flex items-center gap-2 font-semibold ${HEALTH_COLORS[status]}`}>
        <span>{HEALTH_ICONS[status]}</span>
        <span className="capitalize">{status}</span>
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
          <div className="text-white">{item.description}</div>
          {item.user && (
            <div className="text-sm text-slate-400 mt-1">By {item.user}</div>
          )}
        </div>
        <div className="text-xs text-slate-500 whitespace-nowrap">
          {new Date(item.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
