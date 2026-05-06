"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

interface Invite {
  id: string
  email: string
  role: 'user' | 'admin' | 'moderator'
  invited_by_email: string | null
  message: string | null
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
  created_at: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
}

const STATUS_STYLES: Record<Invite['status'], string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  accepted: 'bg-green-500/20 text-green-300 border-green-500/30',
  revoked: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  expired: 'bg-red-500/20 text-red-300 border-red-500/30',
}

const ROLE_STYLES: Record<Invite['role'], string> = {
  admin: 'bg-red-500/20 text-red-300 border-red-500/30',
  moderator: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  user: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

export default function AdminInvitesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [refreshing, setRefreshing] = useState(false)

  // Form state
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'user' | 'admin' | 'moderator'>('user')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string; debugUrl?: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()
        if (!data.authenticated) {
          router.push('/login?message=admin_auth_required')
          return
        }
        if (data.user.role !== 'admin') {
          router.push('/?error=unauthorized_admin_access')
          return
        }
        setAuthorized(true)
        await loadInvites()
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadInvites() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/invites')
      const data = await res.json()
      if (res.ok) setInvites(data.invites || [])
    } finally {
      setRefreshing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    setSending(true)
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, message: message || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ kind: 'err', text: data.error || 'Failed to send invite' })
        return
      }
      setFeedback({
        kind: 'ok',
        text: data.emailSent
          ? `Invitation sent to ${email}.`
          : `Invitation created for ${email}. Email service not configured — share the link manually.`,
        debugUrl: data.debugUrl,
      })
      setEmail('')
      setMessage('')
      setRole('user')
      await loadInvites()
    } catch {
      setFeedback({ kind: 'err', text: 'Network error. Please try again.' })
    } finally {
      setSending(false)
    }
  }

  async function revokeInvite(id: string) {
    if (!confirm('Revoke this invitation? The link will stop working immediately.')) return
    const res = await fetch(`/api/admin/invites/${id}`, { method: 'DELETE' })
    if (res.ok) {
      await loadInvites()
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Failed to revoke invitation')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center text-slate-400">
          Loading invitations…
        </div>
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                User Invitations
              </h1>
              <p className="text-slate-400 mt-2">Invite new users to ETU 2175 by email.</p>
            </div>
            <button
              onClick={loadInvites}
              disabled={refreshing}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg transition-colors"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg whitespace-nowrap"
            >
              Invitations
            </Link>
            <Link
              href="/admin/feedback"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              Feedback
            </Link>
          </div>
        </motion.div>

        {/* Invite form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 mb-8"
        >
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>✉️</span> Send a new invitation
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="commander@example.com"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Invite['role'])}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">
                Personal message <span className="text-slate-600">(optional, max 500)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Welcome to the crew!"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between gap-4 flex-wrap">
              {feedback && (
                <div
                  className={`text-sm px-3 py-2 rounded-lg border ${
                    feedback.kind === 'ok'
                      ? 'bg-green-500/10 border-green-500/30 text-green-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  <div>{feedback.text}</div>
                  {feedback.debugUrl && (
                    <div className="mt-1 text-xs break-all">
                      Dev link:{' '}
                      <a className="underline" href={feedback.debugUrl}>
                        {feedback.debugUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={sending}
                className="ml-auto px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg transition"
              >
                {sending ? 'Sending…' : 'Send invitation'}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Invite list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-xl font-semibold text-white">Recent invitations</h2>
          </div>
          {invites.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400">
              No invitations yet. Send your first one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Sent by
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {invites.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3 text-sm text-slate-200">{inv.email}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_STYLES[inv.role]}`}
                        >
                          {inv.role}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[inv.status]} capitalize`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-400">
                        {inv.invited_by_email || '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-400 whitespace-nowrap">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-400 whitespace-nowrap">
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {inv.status === 'pending' ? (
                          <button
                            onClick={() => revokeInvite(inv.id)}
                            className="px-3 py-1 bg-slate-700 hover:bg-red-600/80 text-slate-200 text-sm rounded-lg transition-colors"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
