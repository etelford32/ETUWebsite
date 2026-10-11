import { createSign } from 'crypto'

/**
 * Minimal GA4 Data API client (server-only, no SDK dependency).
 *
 * Auth: a Google Cloud service account with "Viewer" access on the GA4
 * property. Configure on Vercel:
 *   GA4_PROPERTY_ID           numeric property id (Admin → Property details),
 *                             not the G-XXXX measurement id
 *   GA_SERVICE_ACCOUNT_KEY    the service account's JSON key file contents,
 *                             raw or base64-encoded
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API_BASE = 'https://analyticsdata.googleapis.com/v1beta'
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'

interface ServiceAccount {
  client_email: string
  private_key: string
}

export class GAConfigError extends Error {}

function loadConfig(): { propertyId: string; account: ServiceAccount } {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim()
  const rawKey = process.env.GA_SERVICE_ACCOUNT_KEY?.trim()
  if (!propertyId || !rawKey) {
    throw new GAConfigError('GA4_PROPERTY_ID and GA_SERVICE_ACCOUNT_KEY must be set')
  }
  if (!/^\d+$/.test(propertyId)) {
    throw new GAConfigError('GA4_PROPERTY_ID must be the numeric property id, not the G- measurement id')
  }

  let account: ServiceAccount
  try {
    const json = rawKey.startsWith('{') ? rawKey : Buffer.from(rawKey, 'base64').toString('utf8')
    account = JSON.parse(json)
  } catch {
    throw new GAConfigError('GA_SERVICE_ACCOUNT_KEY is not valid JSON (or base64-encoded JSON)')
  }
  if (!account.client_email || !account.private_key) {
    throw new GAConfigError('GA_SERVICE_ACCOUNT_KEY is missing client_email or private_key')
  }
  // Keys pasted into env vars often carry literal "\n" sequences.
  account.private_key = account.private_key.replace(/\\n/g, '\n')
  return { propertyId, account }
}

const base64url = (input: string | Buffer) => Buffer.from(input).toString('base64url')

let cachedToken: { value: string; expiresAt: number } | null = null
let pendingToken: Promise<string> | null = null

// Parallel report calls share one token request.
function getAccessToken(account: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return Promise.resolve(cachedToken.value)
  pendingToken ??= fetchAccessToken(account).finally(() => { pendingToken = null })
  return pendingToken
}

async function fetchAccessToken(account: ServiceAccount): Promise<string> {

  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })
  )
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const assertion = `${header}.${claims}.${base64url(signer.sign(account.private_key))}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) {
    throw new Error(`Google auth failed: ${data.error_description || data.error || res.status}`)
  }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 }
  return cachedToken.value
}

async function callApi(path: string, body: unknown): Promise<any> {
  const { propertyId, account } = loadConfig()
  const token = await getAccessToken(account)
  const res = await fetch(`${API_BASE}/properties/${propertyId}:${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`GA Data API: ${data.error?.message || res.status}`)
  return data
}

type Row = Record<string, string | number>

/** Flatten a GA report into [{ dimension: value, metric: number }]. */
function toRows(report: any): Row[] {
  const dims: string[] = (report.dimensionHeaders || []).map((h: any) => h.name)
  const mets: string[] = (report.metricHeaders || []).map((h: any) => h.name)
  return (report.rows || []).map((r: any) => {
    const row: Row = {}
    dims.forEach((d, i) => { row[d] = r.dimensionValues[i].value })
    mets.forEach((m, i) => { row[m] = Number(r.metricValues[i].value) })
    return row
  })
}

function totals(report: any): Row {
  const mets: string[] = (report.metricHeaders || []).map((h: any) => h.name)
  const t = report.totals?.[0] ?? report.rows?.[0]
  const out: Row = {}
  mets.forEach((m, i) => { out[m] = t ? Number(t.metricValues[i].value) : 0 })
  return out
}

const SUMMARY_METRICS = [
  'activeUsers', 'newUsers', 'sessions', 'screenPageViews',
  'averageSessionDuration', 'engagementRate', 'eventCount',
]

export interface GAOverview {
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
}

/** Everything the admin page shows, in two batch calls and one realtime call. */
export async function getOverview(days: number): Promise<GAOverview> {
  const current = { startDate: `${days - 1}daysAgo`, endDate: 'today' }
  const previous = { startDate: `${days * 2 - 1}daysAgo`, endDate: `${days}daysAgo` }
  const metric = (name: string) => ({ name })
  const dim = (name: string) => ({ name })
  const byMetric = (name: string) => [{ metric: { metricName: name }, desc: true }]

  const [batchA, batchB, realtime] = await Promise.all([
    callApi('batchRunReports', {
      requests: [
        { dateRanges: [current], metrics: SUMMARY_METRICS.map(metric), metricAggregations: ['TOTAL'] },
        { dateRanges: [previous], metrics: SUMMARY_METRICS.map(metric), metricAggregations: ['TOTAL'] },
        {
          dateRanges: [current],
          dimensions: [dim('date')],
          metrics: ['activeUsers', 'sessions', 'screenPageViews'].map(metric),
          orderBys: [{ dimension: { dimensionName: 'date' } }],
          keepEmptyRows: true,
        },
        {
          dateRanges: [current],
          dimensions: [dim('pagePath')],
          metrics: ['screenPageViews', 'activeUsers'].map(metric),
          orderBys: byMetric('screenPageViews'),
          limit: 10,
        },
        {
          dateRanges: [current],
          dimensions: [dim('sessionDefaultChannelGroup')],
          metrics: [metric('sessions')],
          orderBys: byMetric('sessions'),
          limit: 8,
        },
      ],
    }),
    callApi('batchRunReports', {
      requests: [
        {
          dateRanges: [current],
          dimensions: [dim('country')],
          metrics: [metric('activeUsers')],
          orderBys: byMetric('activeUsers'),
          limit: 10,
        },
        {
          dateRanges: [current],
          dimensions: [dim('deviceCategory')],
          metrics: [metric('activeUsers')],
          orderBys: byMetric('activeUsers'),
        },
        {
          dateRanges: [current],
          dimensions: [dim('eventName')],
          metrics: [metric('eventCount')],
          orderBys: byMetric('eventCount'),
          limit: 10,
        },
      ],
    }),
    callApi('runRealtimeReport', { metrics: [metric('activeUsers')] }),
  ])

  const [summaryR, previousR, dailyR, pagesR, channelsR] = batchA.reports
  const [countriesR, devicesR, eventsR] = batchB.reports

  return {
    range: { days },
    summary: totals(summaryR),
    previous: totals(previousR),
    daily: toRows(dailyR),
    topPages: toRows(pagesR),
    channels: toRows(channelsR),
    countries: toRows(countriesR),
    devices: toRows(devicesR),
    events: toRows(eventsR),
    realtimeActiveUsers: Number(realtime.rows?.[0]?.metricValues?.[0]?.value ?? 0),
  }
}
