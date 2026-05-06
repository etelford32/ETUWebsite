"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface InviteInfo {
  email: string
  role: string
  message?: string | null
  invitedBy?: string | null
  expiresAt: string
}

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params?.token

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [details, setDetails] = useState<string[]>([])

  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        const res = await fetch(`/api/auth/invite/${token}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Invitation is not valid')
        } else {
          setInvite(data.invite)
          setUsername(data.invite.email.split('@')[0])
        }
      } catch {
        setError('Failed to load invitation')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setDetails([])

    if (password !== confirm) {
      setSubmitError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, username }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to accept invitation')
        if (Array.isArray(data.details)) setDetails(data.details)
        return
      }
      router.push('/dashboard?welcome=invited')
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-md w-full">
        {loading ? (
          <div className="text-center text-slate-400 py-20">Loading invitation…</div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/70 border border-red-500/30 rounded-2xl p-8 text-center"
          >
            <div className="text-4xl mb-3">🚫</div>
            <h1 className="text-2xl font-bold text-red-300 mb-2">Invitation unavailable</h1>
            <p className="text-slate-400">{error}</p>
            <a
              href="/login"
              className="inline-block mt-6 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition"
            >
              Go to login
            </a>
          </motion.div>
        ) : (
          invite && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/70 border border-slate-700 rounded-2xl p-8 shadow-xl"
            >
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🚀</div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  You're invited
                </h1>
                <p className="text-slate-400 mt-1">
                  Set up your ETU 2175 account for{' '}
                  <span className="text-slate-200 font-medium">{invite.email}</span>
                </p>
                {invite.invitedBy && (
                  <p className="text-xs text-slate-500 mt-1">
                    Invited by {invite.invitedBy}
                  </p>
                )}
                <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium border bg-purple-500/20 text-purple-300 border-purple-500/30 uppercase tracking-wider">
                  {invite.role}
                </span>
              </div>

              {invite.message && (
                <div className="bg-slate-800/60 border-l-2 border-indigo-500 rounded-md px-4 py-3 mb-6 text-sm text-slate-300 italic">
                  "{invite.message}"
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Commander name</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={32}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Min 8 characters with uppercase, lowercase, number, and symbol.
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    required
                    minLength={8}
                  />
                </div>

                {submitError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300">
                    <div>{submitError}</div>
                    {details.length > 0 && (
                      <ul className="list-disc pl-5 mt-2 space-y-0.5 text-red-300/80">
                        {details.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
                >
                  {submitting ? 'Creating account…' : 'Accept invitation & sign in'}
                </button>
              </form>
            </motion.div>
          )
        )}
      </main>
      <Footer />
    </div>
  )
}
