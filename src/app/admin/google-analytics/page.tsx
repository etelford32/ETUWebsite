"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Row = Record<string, string | number>

interface Overview {
  range: { days: number }
  summary: Row
  previous: Row
  daily: Row[]
  topPages: Row[]
  channels: Row[]
  countries: Row[]
  devices: Row[]
  events: Row[]
  realtimeActiveUsers: number
  cachedAt: string
}

const RANGES = [7, 28, 90] as const
const TREND_METRICS = [
  { key: 'activeUsers', label: 'Users' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'screenPageViews', label: 'Page views' },
] as const
type TrendKey = (typeof TREND_METRICS)[number]['key']

// One accent hue for every mark on the page — no series identity to encode.
const ACCENT = '#34d399'

const fmtInt = (n: number) => Math.round(n).toLocaleString()
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`
function fmtDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m ? `${m}m ${s}s` : `${s}s`
}
function parseGADate(d: string) {
  return new Date(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)))
}
const fmtDay = (d: string) => parseGADate(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export default function GoogleAnalyticsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [days, setDays] = useState<number>(28)
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notConfigured, setNotConfigured] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s) => {
        if (!s.authenticated) router.push('/login?redirect=/admin/google-analytics')
        else if (s.user?.role !== 'admin') router.push('/admin')
        else setAuthorized(true)
      })
      .catch(() => router.push('/login'))
  }, [router])

  const load = useCallback(async (range: number, refresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/google-analytics?days=${range}${refresh ? '&refresh=1' : ''}`)
      const body = await res.json()
      if (res.status === 503 && body.configured === false) {
        setNotConfigured(body.error)
        setData(null)
      } else if (!res.ok) {
        throw new Error(body.error || 'Failed to load')
      } else {
        setNotConfigured(null)
        setData(body)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authorized) load(days)
  }, [authorized, days, load])

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header />
        <div className="py-20 text-center text-slate-400">Checking access…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Google Analytics
            </h1>
            <p className="text-slate-400 mt-2">
              GA4 traffic for exploretheuniverse2175.com · admins only
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg">
              ← Admin
            </Link>
            <Link href="/admin/analytics" className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg">
              Site analytics
            </Link>
          </div>
        </div>

        {/* Filters: one row above the charts */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div role="group" aria-label="Date range" className="inline-flex rounded-lg border border-slate-700 overflow-hidden">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                aria-pressed={days === r}
                className={`px-4 py-2 text-sm ${days === r ? 'bg-emerald-600/30 text-emerald-200' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                Last {r} days
              </button>
            ))}
          </div>
          <button
            onClick={() => load(days, true)}
            disabled={loading}
            className="px-3 py-2 text-sm border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          {data && (
            <span className="text-xs text-slate-500">
              Updated {new Date(data.cachedAt).toLocaleTimeString()} · GA data can lag up to a day
            </span>
          )}
        </div>

        {notConfigured && <SetupInstructions detail={notConfigured} />}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
            {error}
          </div>
        )}
        {data && <Dashboard data={data} />}
      </div>
    </div>
  )
}

function Dashboard({ data }: { data: Overview }) {
  const s = data.summary
  const p = data.previous
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Tile label="Active now" value={fmtInt(data.realtimeActiveUsers)} note="last 30 min" />
        <Tile label="Users" value={fmtInt(+s.activeUsers)} delta={change(+s.activeUsers, +p.activeUsers)} />
        <Tile label="New users" value={fmtInt(+s.newUsers)} delta={change(+s.newUsers, +p.newUsers)} />
        <Tile label="Sessions" value={fmtInt(+s.sessions)} delta={change(+s.sessions, +p.sessions)} />
        <Tile label="Page views" value={fmtInt(+s.screenPageViews)} delta={change(+s.screenPageViews, +p.screenPageViews)} />
        <Tile
          label="Engagement rate"
          value={fmtPct(+s.engagementRate)}
          note={`avg session ${fmtDuration(+s.averageSessionDuration)}`}
        />
      </div>

      <TrendChart daily={data.daily} />

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <BarList title="Top pages" rows={data.topPages} labelKey="pagePath" valueKey="screenPageViews" unit="views" mono />
        <BarList title="Traffic channels" rows={data.channels} labelKey="sessionDefaultChannelGroup" valueKey="sessions" unit="sessions" />
        <BarList title="Countries" rows={data.countries} labelKey="country" valueKey="activeUsers" unit="users" />
        <BarList title="Devices" rows={data.devices} labelKey="deviceCategory" valueKey="activeUsers" unit="users" capitalize />
        <BarList title="Top events" rows={data.events} labelKey="eventName" valueKey="eventCount" unit="events" mono />
      </div>
    </>
  )
}

function change(current: number, previous: number): number | null {
  if (!previous) return null
  return (current - previous) / previous
}

function Tile({ label, value, delta, note }: { label: string; value: string; delta?: number | null; note?: string }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {delta !== undefined && (
        <div className="text-xs text-slate-400 mt-1">
          {delta === null ? 'no prior data' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta * 100).toFixed(0)}% vs prior period`}
        </div>
      )}
      {note && <div className="text-xs text-slate-500 mt-1">{note}</div>}
    </div>
  )
}

function TrendChart({ daily }: { daily: Row[] }) {
  const [metric, setMetric] = useState<TrendKey>('activeUsers')
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const W = 900
  const H = 260
  const pad = { top: 16, right: 16, bottom: 28, left: 44 }
  const values = daily.map((d) => Number(d[metric]) || 0)
  const max = Math.max(1, ...values)
  const niceMax = useMemo(() => {
    // Round up to 1/2/5 × 10^n so the line fills the plot.
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
    const step = [1, 2, 5, 10].find((m) => m * magnitude >= max / 2)! * magnitude / 2
    return Math.ceil(max / step) * step
  }, [max])
  const x = (i: number) => pad.left + (daily.length <= 1 ? 0 : (i / (daily.length - 1)) * (W - pad.left - pad.right))
  const y = (v: number) => pad.top + (1 - v / niceMax) * (H - pad.top - pad.bottom)
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')
  const area = `${line} L${x(values.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
  const label = TREND_METRICS.find((m) => m.key === metric)!.label
  const tickEvery = Math.max(1, Math.ceil(daily.length / 7))

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - pad.left) / (W - pad.left - pad.right)) * (daily.length - 1))
    setHover(Math.min(daily.length - 1, Math.max(0, i)))
  }

  return (
    <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">Daily {label.toLowerCase()}</h2>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Metric" className="inline-flex rounded-lg border border-slate-700 overflow-hidden">
            {TREND_METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                aria-pressed={metric === m.key}
                className={`px-3 py-1.5 text-xs ${metric === m.key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowTable((v) => !v)}
            className="px-3 py-1.5 text-xs border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-800"
          >
            {showTable ? 'Chart' : 'Table'}
          </button>
        </div>
      </div>

      {daily.length === 0 ? (
        <p className="text-sm text-slate-500 py-10 text-center">No data for this range.</p>
      ) : showTable ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr><th className="py-1">Date</th><th className="py-1 text-right">Users</th><th className="py-1 text-right">Sessions</th><th className="py-1 text-right">Page views</th></tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={String(d.date)} className="border-t border-slate-800">
                  <td className="py-1 text-slate-300">{fmtDay(String(d.date))}</td>
                  <td className="py-1 text-right">{fmtInt(+d.activeUsers)}</td>
                  <td className="py-1 text-right">{fmtInt(+d.sessions)}</td>
                  <td className="py-1 text-right">{fmtInt(+d.screenPageViews)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Daily ${label} chart`}>
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={pad.left} x2={W - pad.right} y1={y(niceMax * f)} y2={y(niceMax * f)} stroke="#334155" strokeWidth={1} strokeDasharray={f ? '3 4' : undefined} />
                <text x={pad.left - 8} y={y(niceMax * f) + 4} textAnchor="end" fontSize={11} fill="#94a3b8">{(niceMax * f).toLocaleString(undefined, { maximumFractionDigits: 1 })}</text>
              </g>
            ))}
            {daily.map((d, i) => i % tickEvery === 0 && (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#94a3b8">{fmtDay(String(d.date))}</text>
            ))}
            <path d={area} fill={ACCENT} opacity={0.12} />
            <path d={line} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />
            {hover !== null && (
              <>
                <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={y(0)} stroke="#64748b" strokeWidth={1} />
                <circle cx={x(hover)} cy={y(values[hover])} r={5} fill={ACCENT} stroke="#0f172a" strokeWidth={2} />
              </>
            )}
            <rect
              x={pad.left} y={pad.top} width={W - pad.left - pad.right} height={H - pad.top - pad.bottom}
              fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)}
            />
          </svg>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-2 px-3 py-2 rounded-lg bg-slate-950/95 border border-slate-700 text-xs shadow-lg"
              style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${x(hover) > W * 0.7 ? '-110%' : '10%'})` }}
            >
              <div className="text-slate-400">{fmtDay(String(daily[hover].date))}</div>
              <div className="font-semibold text-slate-100">{fmtInt(values[hover])} {label.toLowerCase()}</div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function BarList({
  title, rows, labelKey, valueKey, unit, mono, capitalize,
}: {
  title: string; rows: Row[]; labelKey: string; valueKey: string; unit: string; mono?: boolean; capitalize?: boolean
}) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0))
  return (
    <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No data for this range.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const v = Number(r[valueKey]) || 0
            const name = String(r[labelKey] || '(not set)')
            return (
              <li key={name} title={`${name}: ${fmtInt(v)} ${unit}`} className="text-sm">
                <div className="flex justify-between gap-3 mb-1">
                  <span className={`truncate text-slate-300 ${mono ? 'font-mono text-xs' : ''} ${capitalize ? 'capitalize' : ''}`}>{name}</span>
                  <span className="text-slate-400 tabular-nums">{fmtInt(v)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800">
                  <div className="h-1.5 rounded-full" style={{ width: `${(v / max) * 100}%`, background: ACCENT }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function SetupInstructions({ detail }: { detail: string }) {
  return (
    <div className="mb-8 p-6 rounded-xl border border-amber-500/30 bg-amber-500/5">
      <h2 className="text-lg font-semibold text-amber-200 mb-2">Connect Google Analytics</h2>
      <p className="text-sm text-slate-400 mb-4">
        The site already sends data to GA4 (tag G-6RCVW65DDL). To show it here, give the server read access:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
        <li>In Google Cloud Console, enable the <b>Google Analytics Data API</b> and create a service account. Create a JSON key for it.</li>
        <li>In GA4, go to Admin → Property access management, and add the service account&apos;s email as a <b>Viewer</b>.</li>
        <li>In GA4, go to Admin → Property details, and copy the numeric <b>Property ID</b>.</li>
        <li>
          In Vercel (etu-website → Settings → Environment Variables), set <code className="text-amber-200">GA4_PROPERTY_ID</code> and{' '}
          <code className="text-amber-200">GA_SERVICE_ACCOUNT_KEY</code> (the JSON key&apos;s contents), then redeploy.
        </li>
      </ol>
      <p className="text-xs text-slate-500 mt-4">Server says: {detail}</p>
    </div>
  )
}
