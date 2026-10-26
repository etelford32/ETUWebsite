"use client"

import { useCallback, useEffect, useState } from 'react'
import type { PeriodKey, PeriodMetrics, SiteAnalytics } from '@/lib/superuserAnalytics'

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
]

const int = (n: number) => n.toLocaleString()
const dec = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 })

type Row = {
  label: string
  hint: string
  value: (m: PeriodMetrics) => string
  sub?: (m: PeriodMetrics) => string | null
}

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: 'Traffic',
    rows: [
      { label: 'Visits', hint: 'Browser sessions started', value: (m) => int(m.visits) },
      { label: 'Unique visitors', hint: 'Distinct browsers', value: (m) => int(m.uniqueVisitors) },
      { label: 'Page views', hint: 'All page loads and route changes', value: (m) => int(m.pageViews) },
      { label: 'Admin visits', hint: 'Visits by admin, staff, moderator or superuser accounts', value: (m) => int(m.adminVisits) },
      {
        label: 'Profile visits',
        hint: 'Views of /profile pages',
        value: (m) => int(m.profileVisits),
        sub: (m) => (m.profileVisits ? `${int(m.publicProfileVisits)} public` : null),
      },
    ],
  },
  {
    title: 'Users',
    rows: [
      { label: 'Active users', hint: 'Distinct signed-in accounts seen', value: (m) => int(m.activeUsers) },
      { label: 'New users', hint: 'Active accounts created in this period', value: (m) => int(m.newUsers) },
      { label: 'Returning users', hint: 'Active accounts created before this period', value: (m) => int(m.returningUsers) },
    ],
  },
  {
    title: 'Engagement',
    rows: [
      { label: 'Minutes per visitor', hint: 'Time on site ÷ unique visitors', value: (m) => dec(m.minutesPerVisitor) },
      { label: 'Pages per visitor', hint: 'Page views ÷ unique visitors', value: (m) => dec(m.pagesPerVisitor) },
    ],
  },
  {
    title: 'Accounts',
    rows: [
      { label: 'Sign-ins', hint: 'Successful logins, all methods', value: (m) => int(m.signIns) },
      { label: 'Sign-ups', hint: 'New accounts created', value: (m) => int(m.signUps) },
      {
        label: 'Password resets',
        hint: 'Resets completed (requested)',
        value: (m) => int(m.passwordResetsCompleted),
        sub: (m) => `${int(m.passwordResetsRequested)} requested`,
      },
    ],
  },
  {
    title: 'Steam',
    rows: [
      {
        label: 'Active users with Steam',
        hint: 'Active accounts that have a Steam ID linked',
        value: (m) => int(m.activeSteamUsers),
        sub: (m) => (m.activeUsers ? `${Math.round((m.activeSteamUsers / m.activeUsers) * 100)}% of active users` : null),
      },
      { label: 'Steam sign-ins', hint: 'Successful logins via Steam (website or game)', value: (m) => int(m.steamSignIns) },
      { label: 'Steam sign-ups', hint: 'Accounts created via Steam (website or game)', value: (m) => int(m.steamSignUps) },
      { label: 'Steam links', hint: 'Existing accounts that attached Steam', value: (m) => int(m.steamLinks) },
      { label: 'Wishlist clicks', hint: 'Clicks on any Wishlist / Steam store button', value: (m) => int(m.wishlistClicks) },
    ],
  },
]

/** Start of the viewer's local day, week (Monday) and month. */
function periodStarts() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const week = new Date(today)
  week.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const month = new Date(now.getFullYear(), now.getMonth(), 1)
  return { today, week, month }
}

function localDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AnalyticsPanel() {
  const [data, setData] = useState<SiteAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const starts = periodStarts()
      const qs = new URLSearchParams({
        today: starts.today.toISOString(),
        week: starts.week.toISOString(),
        month: starts.month.toISOString(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      })
      const res = await fetch(`/api/admin/superuser/analytics?${qs}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load analytics')
      setData(json)
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Every day of the month so far, including days with no traffic.
  const days = (() => {
    if (!data) return []
    const byDate = new Map(data.daily.map((d) => [d.date, d]))
    const out = []
    const { month } = periodStarts()
    const today = new Date()
    for (const d = new Date(month); d <= today; d.setDate(d.getDate() + 1)) {
      const key = localDateKey(d)
      out.push(byDate.get(key) || { date: key, visits: 0, uniqueVisitors: 0, pageViews: 0 })
    }
    return out
  })()
  const maxVisits = Math.max(1, ...days.map((d) => d.visits))

  const today = data?.periods.today

  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-xl font-semibold">Site analytics</h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {data && <span>Updated {new Date(data.generatedAt).toLocaleTimeString()}</span>}
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg border text-sm bg-red-500/10 border-red-500/30 text-red-300">
          {error}
        </div>
      )}

      {data && today && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-4">
            {[
              ['Visits today', int(today.visits)],
              ['Unique visitors today', int(today.uniqueVisitors)],
              ['Active users today', int(today.activeUsers)],
              ['Sign-ups today', int(today.signUps)],
              ['Registered accounts', int(data.totals.accounts)],
              ['Admin accounts', int(data.totals.admins)],
              ['Steam-linked accounts', int(data.totals.steamLinked)],
              ['Verified Steam owners', int(data.totals.verifiedOwners)],
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-2xl font-bold tabular-nums">{value}</div>
                <div className="text-xs uppercase tracking-wide text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Metric</th>
                  {PERIODS.map((p) => (
                    <th key={p.key} className="px-4 py-3 text-right">{p.label}</th>
                  ))}
                </tr>
              </thead>
              {SECTIONS.map((section) => (
                <tbody key={section.title}>
                  <tr>
                    <td colSpan={4} className="px-4 pt-4 pb-1 text-[11px] uppercase tracking-wider text-amber-400/80">
                      {section.title}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.label} className="border-b border-slate-800/60 last:border-0">
                      <td className="px-4 py-2">
                        <div>{row.label}</div>
                        <div className="text-xs text-slate-500">{row.hint}</div>
                      </td>
                      {PERIODS.map((p) => {
                        const m = data.periods[p.key]
                        const sub = row.sub?.(m)
                        return (
                          <td key={p.key} className="px-4 py-2 text-right tabular-nums align-top">
                            <div className="font-medium">{row.value(m)}</div>
                            {sub && <div className="text-xs text-slate-500">{sub}</div>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
              <span className="uppercase tracking-wide">Visits per day — this month</span>
              <span>peak {int(maxVisits)}</span>
            </div>
            <div className="flex items-end gap-1 h-32">
              {days.map((d) => (
                <div
                  key={d.date}
                  className="flex-1 h-full flex items-end group relative"
                  title={`${d.date}: ${d.visits} visits · ${d.uniqueVisitors} unique · ${d.pageViews} page views`}
                >
                  <div
                    className="w-full rounded-t bg-amber-400/70 group-hover:bg-amber-300"
                    style={{ height: `${Math.max(d.visits ? 4 : 1, (d.visits / maxVisits) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-600">
              <span>{days[0]?.date.slice(5)}</span>
              <span>{days[days.length - 1]?.date.slice(5)}</span>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
