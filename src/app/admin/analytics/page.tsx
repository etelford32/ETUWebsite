"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { getUserRole } from '@/lib/adminAuth'
import Header from '@/components/Header'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AnalyticsData {
  summary: {
    totalSessions: number
    totalPageViews: number
    totalUsers: number
    avgSessionDuration: number
    bounceRate: number
  }
  timeSeriesData: Array<{
    date: string
    sessions: number
    pageViews: number
    users: number
  }>
  topPages: Array<{
    page_url: string
    views: number
  }>
  acquisitionSources: Array<{
    source: string
    sessions: number
    users: number
  }>
  deviceBreakdown: Array<{
    device_type: string
    count: number
    percentage: number
  }>
  recentSessions: Array<{
    session_id: string
    user_id: string | null
    started_at: string
    page_views: number
    duration_seconds: number
    device_type: string
  }>
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(7)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics()
    }
  }, [timeRange, isAdmin])

  async function checkAuth() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      router.push('/login?message=admin_auth_required')
      return
    }

    const role = await getUserRole(session.user.id)

    if (role !== 'admin' && role !== 'moderator') {
      router.push('/?error=unauthorized_admin_access')
      return
    }

    setUser(session.user)
    setIsAdmin(role === 'admin' || role === 'moderator')
    setLoading(false)
  }

  async function fetchAnalytics() {
    try {
      setRefreshing(true)

      // Fetch sessions in time range
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - timeRange)

      const { data: sessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: false })

      if (sessionsError && sessionsError.code !== 'PGRST116') {
        console.error('Sessions error:', sessionsError)
      }

      // Fetch events
      const { data: events, error: eventsError } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate.toISOString())

      if (eventsError && eventsError.code !== 'PGRST116') {
        console.error('Events error:', eventsError)
      }

      // Calculate summary metrics (mock data for now)
      const summaryData = {
        totalSessions: sessions?.length || 0,
        totalPageViews: events?.filter((e: any) => e.event_type === 'page_view').length || 0,
        totalUsers: new Set(sessions?.map((s: any) => s.user_id).filter(Boolean)).size || 0,
        avgSessionDuration: sessions?.length
          ? sessions.reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0) / sessions.length
          : 0,
        bounceRate: sessions?.length
          ? (sessions.filter((s: any) => s.page_views === 1).length / sessions.length) * 100
          : 0,
      }

      // Process time series data
      const timeSeriesMap = new Map<string, any>()
      sessions?.forEach((session: any) => {
        const date = new Date(session.started_at).toISOString().split('T')[0]
        if (!timeSeriesMap.has(date)) {
          timeSeriesMap.set(date, { date, sessions: 0, pageViews: 0, users: new Set() })
        }
        const dayData = timeSeriesMap.get(date)
        dayData.sessions++
        dayData.pageViews += session.page_views || 0
        if (session.user_id) dayData.users.add(session.user_id)
      })

      const timeSeriesData = Array.from(timeSeriesMap.values())
        .map(d => ({
          date: d.date,
          sessions: d.sessions,
          pageViews: d.pageViews,
          users: d.users.size,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Top pages
      const pageViewsMap = new Map<string, number>()
      events?.filter((e: any) => e.event_type === 'page_view').forEach((event: any) => {
        const url = event.page_url || 'Unknown'
        pageViewsMap.set(url, (pageViewsMap.get(url) || 0) + 1)
      })

      const topPages = Array.from(pageViewsMap.entries())
        .map(([page_url, views]) => ({ page_url, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10)

      // Acquisition sources (mock data)
      const acquisitionSources = [
        { source: 'Direct', sessions: Math.floor((sessions?.length || 0) * 0.4), users: 0 },
        { source: 'Organic Search', sessions: Math.floor((sessions?.length || 0) * 0.3), users: 0 },
        { source: 'Social', sessions: Math.floor((sessions?.length || 0) * 0.2), users: 0 },
        { source: 'Referral', sessions: Math.floor((sessions?.length || 0) * 0.1), users: 0 },
      ]

      // Device breakdown
      const deviceMap = new Map<string, number>()
      sessions?.forEach((session: any) => {
        const device = session.device_type || 'Unknown'
        deviceMap.set(device, (deviceMap.get(device) || 0) + 1)
      })

      const total = sessions?.length || 1
      const deviceBreakdown = Array.from(deviceMap.entries())
        .map(([device_type, count]) => ({
          device_type,
          count,
          percentage: (count / total) * 100,
        }))
        .sort((a, b) => b.count - a.count)

      setAnalytics({
        summary: summaryData,
        timeSeriesData,
        topPages,
        acquisitionSources,
        deviceBreakdown,
        recentSessions: sessions?.slice(0, 10) || [],
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
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
            Loading analytics...
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-slate-400 mt-2">
                Real-time application insights and metrics
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value) as 7 | 30 | 90)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button
                onClick={fetchAnalytics}
                disabled={refreshing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-4 overflow-x-auto pb-2">
            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/security"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              Security
            </Link>
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              Users
            </Link>
            <Link
              href="/admin/analytics"
              className="px-4 py-2 bg-green-600 text-white rounded-lg whitespace-nowrap"
            >
              Analytics
            </Link>
            <Link
              href="/admin/feedback"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              Feedback
            </Link>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <MetricCard
            title="Total Sessions"
            value={analytics?.summary.totalSessions || 0}
            icon="📊"
            color="from-blue-500 to-cyan-500"
          />
          <MetricCard
            title="Page Views"
            value={analytics?.summary.totalPageViews || 0}
            icon="👁️"
            color="from-purple-500 to-pink-500"
          />
          <MetricCard
            title="Unique Users"
            value={analytics?.summary.totalUsers || 0}
            icon="👥"
            color="from-green-500 to-emerald-500"
          />
          <MetricCard
            title="Avg. Duration"
            value={`${Math.round(analytics?.summary.avgSessionDuration || 0)}s`}
            icon="⏱️"
            color="from-orange-500 to-red-500"
          />
          <MetricCard
            title="Bounce Rate"
            value={`${Math.round(analytics?.summary.bounceRate || 0)}%`}
            icon="↩️"
            color="from-yellow-500 to-orange-500"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Time Series Chart */}
          <ChartCard title="Traffic Over Time" icon="📈">
            {analytics?.timeSeriesData && analytics.timeSeriesData.length > 0 ? (
              <SimpleLineChart data={analytics.timeSeriesData} />
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                No data available for selected time range
              </div>
            )}
          </ChartCard>

          {/* Device Breakdown */}
          <ChartCard title="Device Breakdown" icon="📱">
            {analytics?.deviceBreakdown && analytics.deviceBreakdown.length > 0 ? (
              <DeviceChart data={analytics.deviceBreakdown} />
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                No device data available
              </div>
            )}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Pages */}
          <ChartCard title="Top Pages" icon="📄">
            {analytics?.topPages && analytics.topPages.length > 0 ? (
              <div className="space-y-2">
                {analytics.topPages.map((page, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex-1 truncate text-slate-300">{page.page_url}</div>
                    <div className="text-white font-bold ml-4">{page.views}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                No page view data available
              </div>
            )}
          </ChartCard>

          {/* Acquisition Sources */}
          <ChartCard title="Acquisition Sources" icon="🎯">
            {analytics?.acquisitionSources && analytics.acquisitionSources.length > 0 ? (
              <div className="space-y-2">
                {analytics.acquisitionSources.map((source, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                  >
                    <div className="text-slate-300">{source.source}</div>
                    <div className="text-white font-bold">{source.sessions} sessions</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                No acquisition data available
              </div>
            )}
          </ChartCard>
        </div>

        {/* Recent Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6"
        >
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🕐</span> Recent Sessions
          </h2>
          {analytics?.recentSessions && analytics.recentSessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-left text-slate-400 text-sm">
                  <tr>
                    <th className="pb-3">Session ID</th>
                    <th className="pb-3">Started</th>
                    <th className="pb-3">Page Views</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3">Device</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {analytics.recentSessions.map((session) => (
                    <tr key={session.session_id} className="border-t border-slate-800">
                      <td className="py-3 font-mono text-xs">{session.session_id.slice(0, 8)}...</td>
                      <td className="py-3">{new Date(session.started_at).toLocaleString()}</td>
                      <td className="py-3">{session.page_views}</td>
                      <td className="py-3">{session.duration_seconds || 0}s</td>
                      <td className="py-3">{session.device_type || 'Unknown'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-slate-400">No recent sessions</div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: number | string
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
          {value}
        </div>
      </div>
      <div className="text-slate-400">{title}</div>
    </motion.div>
  )
}

// Chart Card Component
function ChartCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </motion.div>
  )
}

// Simple Line Chart Component (SVG-based)
function SimpleLineChart({ data }: { data: Array<{ date: string; sessions: number; pageViews: number }> }) {
  if (!data || data.length === 0) return null

  const maxSessions = Math.max(...data.map(d => d.sessions), 1)
  const width = 600
  const height = 200
  const padding = 40

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding)
    const y = height - padding - (d.sessions / maxSessions) * (height - 2 * padding)
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + ratio * (height - 2 * padding)
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="4"
            />
          )
        })}

        {/* Line chart */}
        <polyline
          points={points}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* Data points */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * (width - 2 * padding)
          const y = height - padding - (d.sessions / maxSessions) * (height - 2 * padding)
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="#10b981"
              className="hover:r-6 transition-all cursor-pointer"
            >
              <title>{`${d.date}: ${d.sessions} sessions`}</title>
            </circle>
          )
        })}
      </svg>
      <div className="flex justify-between text-xs text-slate-500 mt-2 px-10">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}

// Device Chart Component (Bar chart)
function DeviceChart({ data }: { data: Array<{ device_type: string; count: number; percentage: number }> }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="space-y-4">
      {data.map((device, idx) => (
        <div key={idx}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-300">{device.device_type}</span>
            <span className="text-slate-400">{device.count} ({Math.round(device.percentage)}%)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(device.count / maxCount) * 100}%` }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
