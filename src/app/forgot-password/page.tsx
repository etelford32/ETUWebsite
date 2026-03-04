"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: input.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <Header />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 etu-starfield opacity-20"></div>
      </div>

      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <img src="/logo2.png" alt="ETU Logo" className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Reset Password
            </h1>
            <p className="text-slate-400 mt-2">
              We'll send a reset link to your email
            </p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-indigo-500/10">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-green-900/40 border border-green-500/40 flex items-center justify-center text-3xl">
                  📬
                </div>
                <h2 className="text-xl font-bold text-green-400">Check Your Inbox</h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  If an account exists for <strong className="text-white">{input}</strong>,
                  a password reset link has been sent. The link expires in <strong>1 hour</strong>.
                </p>
                <p className="text-slate-500 text-xs">
                  Didn't receive it? Check your spam folder, or{' '}
                  <button
                    onClick={() => { setSubmitted(false); setInput('') }}
                    className="text-indigo-400 hover:text-indigo-300 underline"
                  >
                    try again
                  </button>
                  .
                </p>
                <Link
                  href="/login"
                  className="block mt-4 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg font-semibold transition-all text-center"
                >
                  Back to Sign In
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="input" className="block text-sm font-medium text-slate-300 mb-2">
                    Email or Commander Name
                  </label>
                  <input
                    id="input"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    required
                    placeholder="commander@galaxy.com or your username"
                    autoComplete="email username"
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Enter the email or commander name linked to your account.
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-rose-900/20 border border-rose-500/30 text-rose-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <div className="text-center space-y-2 pt-2 border-t border-slate-800">
                  <Link href="/login" className="block text-sm text-slate-400 hover:text-slate-200 transition">
                    ← Back to Sign In
                  </Link>
                  <p className="text-xs text-slate-600">
                    Know your username but not your email?{' '}
                    <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
                      Use a magic link
                    </Link>
                  </p>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
