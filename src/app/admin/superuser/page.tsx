"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AnalyticsPanel from './AnalyticsPanel'
import { ROLES, ROLE_COLORS, TIER_LABELS, type Role, type Tier } from '@/lib/accountTiers'

type Status = 'active' | 'suspended' | 'banned' | 'deleted'

interface ManagedUser {
  id: string
  email: string | null
  username: string | null
  displayName: string | null
  role: Role
  tier: Tier
  status: Status
  isSuperuser: boolean
  isAlphaTester: boolean
  steamId: string | null
  providers: string[]
  emailConfirmed: boolean
  bannedUntil: string | null
  createdAt: string
  lastSignInAt: string | null
  loginCount: number
  hasProfile: boolean
}

interface AuditEntry {
  id: number
  created_at: string
  actor_email: string | null
  target_email: string | null
  action: string
  details: Record<string, any>
}


const STATUS_COLORS: Record<Status, string> = {
  active: 'text-green-400',
  suspended: 'text-yellow-400',
  banned: 'text-red-400',
  deleted: 'text-slate-500',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function describeAudit(entry: AuditEntry) {
  const v = entry.details?.value
  switch (entry.action) {
    case 'set_role': return `role → ${v}`
    case 'set_status': return `status → ${v}`
    case 'set_superuser': return v ? 'granted superuser' : 'removed superuser'
    case 'set_alpha': return v ? 'granted alpha access' : 'removed alpha access'
    case 'delete_user': return 'deleted account'
    default: return entry.action
  }
}

export default function SuperuserConsole() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'superuser' | Role>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadData = useCallback(async () => {
    const res = await fetch('/api/admin/superuser', { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load users')
    setMe(data.me)
    setUsers(data.users)
    setAudit(data.audit)
  }, [])

  useEffect(() => {
    async function init() {
      try {
        const sessionRes = await fetch('/api/auth/session')
        const session = await sessionRes.json()
        if (!session.authenticated) {
          router.push('/login?redirect=/admin/superuser')
          return
        }
        if (!session.user?.isSuperuser) {
          router.push('/admin')
          return
        }
        setAuthorized(true)
        const [csrfRes] = await Promise.all([fetch('/api/csrf-token'), loadData()])
        const csrf = await csrfRes.json()
        setCsrfToken(csrf.csrfToken ?? null)
      } catch (error: any) {
        setNotice({ type: 'error', text: error.message || 'Failed to load' })
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router, loadData])

  async function mutate(user: ManagedUser, method: 'PATCH' | 'DELETE', body?: object) {
    setBusyId(user.id)
    setNotice(null)
    try {
      const url = method === 'DELETE'
        ? `/api/admin/superuser?userId=${encodeURIComponent(user.id)}`
        : '/api/admin/superuser'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken ?? '' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setNotice({ type: 'success', text: `Updated ${user.email || user.username || user.id}` })
      await loadData()
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message || 'Update failed' })
    } finally {
      setBusyId(null)
    }
  }

  function changeRole(user: ManagedUser, role: Role) {
    if (role === user.role) return
    if (role === 'admin' && !confirm(`Give ${user.email} full admin access?`)) return
    mutate(user, 'PATCH', { userId: user.id, action: 'set_role', value: role })
  }

  function changeStatus(user: ManagedUser, status: Status) {
    if (status === user.status) return
    if (status !== 'active' && !confirm(`${status === 'banned' ? 'Ban' : 'Suspend'} ${user.email}? They will be signed out and blocked from signing in.`)) return
    mutate(user, 'PATCH', { userId: user.id, action: 'set_status', value: status })
  }

  function toggleSuperuser(user: ManagedUser) {
    const next = !user.isSuperuser
    const prompt = next
      ? `Make ${user.email} a superuser? They will be able to manage every account, including yours.`
      : `Remove superuser access from ${user.email}?`
    if (!confirm(prompt)) return
    mutate(user, 'PATCH', { userId: user.id, action: 'set_superuser', value: next })
  }

  function deleteUser(user: ManagedUser) {
    const typed = window.prompt(
      `Permanently delete this account and its profile? This cannot be undone.\n\nType the account's email to confirm:`
    )
    if (typed === null) return
    if (typed.trim().toLowerCase() !== (user.email || '').toLowerCase()) {
      setNotice({ type: 'error', text: 'Email did not match — nothing was deleted.' })
      return
    }
    mutate(user, 'DELETE')
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (q && ![u.email, u.username, u.displayName, u.steamId, u.id]
        .some((field) => field?.toLowerCase().includes(q))) return false
      if (roleFilter === 'superuser' ? !u.isSuperuser : roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter !== 'all' && u.status !== statusFilter) return false
      return true
    })
  }, [users, search, roleFilter, statusFilter])

  const counts = useMemo(() => ({
    total: users.length,
    superusers: users.filter((u) => u.isSuperuser).length,
    admins: users.filter((u) => u.role === 'admin').length,
    staff: users.filter((u) => u.role === 'staff' || u.role === 'moderator').length,
    blocked: users.filter((u) => u.status !== 'active').length,
  }), [users])

  if (loading || !authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center text-slate-400">
          {loading ? 'Loading superuser console…' : 'Redirecting…'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                Superuser Console
              </h1>
              <p className="text-slate-400 mt-2">
                Manage every account, including administrators. All changes are audit-logged.
              </p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              ← Admin Dashboard
            </Link>
          </div>
        </motion.div>

        <AnalyticsPanel />

        <h2 className="text-xl font-semibold mb-3">Accounts</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            ['Accounts', counts.total],
            ['Superusers', counts.superusers],
            ['Admins', counts.admins],
            ['Staff & mods', counts.staff],
            ['Suspended / banned', counts.blocked],
          ].map(([label, value]) => (
            <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs uppercase tracking-wide text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {notice && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg border text-sm ${
              notice.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, commander name, Steam ID…"
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg"
          >
            <option value="all">All roles</option>
            <option value="superuser">Superusers</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg"
          >
            <option value="all">All statuses</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="banned">banned</option>
          </select>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-x-auto mb-10">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Sign-in</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isMe = u.id === me
                const busy = busyId === u.id
                return (
                  <tr key={u.id} className={`border-b border-slate-800/60 ${busy ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium flex items-center gap-2">
                        {u.email || <span className="text-slate-500">no email</span>}
                        {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">YOU</span>}
                        {u.isSuperuser && <span title="Superuser">👑</span>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {u.username ? `@${u.username}` : '—'}
                        {u.steamId && <> · Steam {u.steamId}</>}
                        {!u.hasProfile && <span className="text-yellow-500"> · no profile row</span>}
                      </div>
                      <div className="text-xs text-slate-600">Joined {formatDate(u.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-400">
                      <div>{u.providers.length ? u.providers.join(', ') : '—'}</div>
                      <div>Last: {formatDate(u.lastSignInAt)}</div>
                      <div>{u.loginCount} logins{u.emailConfirmed ? '' : ' · unverified'}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select
                        value={u.role}
                        disabled={busy || !u.hasProfile || u.isSuperuser}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                        title={u.isSuperuser ? 'Superusers are always admins' : undefined}
                        className={`px-2 py-1 rounded border bg-transparent ${ROLE_COLORS[u.role] || ROLE_COLORS.user} disabled:cursor-not-allowed`}
                      >
                        {ROLES.map((r) => <option key={r} value={r} className="bg-slate-900 text-slate-100">{r}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select
                        value={u.status}
                        disabled={busy || isMe || !u.hasProfile || u.isSuperuser}
                        onChange={(e) => changeStatus(u, e.target.value as Status)}
                        className={`px-2 py-1 rounded border border-slate-700 bg-slate-900 ${STATUS_COLORS[u.status] || ''} disabled:cursor-not-allowed`}
                      >
                        <option value="active">active</option>
                        <option value="suspended">suspended</option>
                        <option value="banned">banned</option>
                        {u.status === 'deleted' && <option value="deleted" disabled>deleted</option>}
                      </select>
                    </td>
                    <td className="px-4 py-3 align-top space-y-1">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={u.isSuperuser}
                          disabled={busy || isMe || !u.hasProfile}
                          onChange={() => toggleSuperuser(u)}
                        />
                        Superuser
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={u.isAlphaTester}
                          disabled={busy || !u.hasProfile}
                          onChange={() => mutate(u, 'PATCH', { userId: u.id, action: 'set_alpha', value: !u.isAlphaTester })}
                        />
                        Alpha tester
                      </label>
                      <div className="pt-1">
                        <span
                          title={TIER_LABELS[u.tier]?.hint}
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] border ${(TIER_LABELS[u.tier] || TIER_LABELS.player).className}`}
                        >
                          {(TIER_LABELS[u.tier] || TIER_LABELS.player).label} build
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <button
                        onClick={() => deleteUser(u)}
                        disabled={busy || isMe || u.isSuperuser}
                        className="px-3 py-1 text-xs rounded border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">No accounts match.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-semibold mb-3">Audit log</h2>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl divide-y divide-slate-800">
          {audit.length === 0 && <div className="px-4 py-6 text-sm text-slate-500">No superuser actions yet.</div>}
          {audit.map((entry) => (
            <div key={entry.id} className="px-4 py-3 text-sm flex flex-wrap gap-x-3">
              <span className="text-slate-500">{formatDate(entry.created_at)}</span>
              <span className="text-amber-300">{entry.actor_email || 'unknown'}</span>
              <span className="text-slate-300">{describeAudit(entry)}</span>
              <span className="text-slate-400">for {entry.target_email || 'unknown'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
