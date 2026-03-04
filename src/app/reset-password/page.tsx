"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const passed = checks.filter(Boolean).length

  const levels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-emerald-400']

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= passed ? colors[passed] : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${passed >= 4 ? 'text-green-400' : passed >= 3 ? 'text-yellow-400' : 'text-slate-500'}`}>
        {passed > 0 ? `Strength: ${levels[passed]}` : ''}
      </p>
    </div>
  )
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<string[]>([])

  useEffect(() => {
    const t = searchParams?.get('token')
    if (!t) {
      setError('Invalid or missing reset link. Please request a new one.')
    } else {
      setToken(t)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors([])

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.details?.length) {
          setFieldErrors(data.details)
        } else {
          setError(data.error || 'Failed to reset password. Please try again.')
        }
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/login?message=password_reset'), 2500)
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
          <div className="text-center mb-8">
            <img src="/logo2.png" alt="ETU Logo" className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              New Password
            </h1>
            <p className="text-slate-400 mt-2">Choose a strong password for your account</p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-indigo-500/10">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-green-900/40 border border-green-500/40 flex items-center justify-center text-3xl">
                  ✅
                </div>
                <h2 className="text-xl font-bold text-green-400">Password Updated!</h2>
                <p className="text-slate-400 text-sm">
                  Redirecting you to the sign-in page…
                </p>
              </motion.div>
            ) : error && !token ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-900/40 border border-rose-500/40 flex items-center justify-center text-3xl">
                  ⚠️
                </div>
                <p className="text-rose-400 text-sm">{error}</p>
                <Link
                  href="/forgot-password"
                  className="block px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg font-semibold transition-all text-center"
                >
                  Request New Reset Link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full px-4 py-3 pr-12 bg-slate-800/80 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <PasswordStrengthBar password={password} />
                </div>

                {/* Confirm */}
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 bg-slate-800/80 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                      confirm && password !== confirm ? 'border-rose-500/60' : 'border-slate-700'
                    }`}
                  />
                  {confirm && password !== confirm && (
                    <p className="text-xs text-rose-400 mt-1">Passwords do not match</p>
                  )}
                </div>

                {/* Password requirements */}
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-xs text-slate-400 space-y-1">
                  {[
                    ['8+ characters', password.length >= 8],
                    ['Uppercase letter', /[A-Z]/.test(password)],
                    ['Lowercase letter', /[a-z]/.test(password)],
                    ['Number', /[0-9]/.test(password)],
                    ['Special character (!@#$...)', /[^A-Za-z0-9]/.test(password)],
                  ].map(([label, met]) => (
                    <div key={label as string} className="flex items-center gap-2">
                      <span className={met ? 'text-green-400' : 'text-slate-600'}>
                        {met ? '✓' : '○'}
                      </span>
                      <span className={met ? 'text-slate-300' : ''}>{label as string}</span>
                    </div>
                  ))}
                </div>

                {/* Errors */}
                {(error || fieldErrors.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-rose-900/20 border border-rose-500/30 text-rose-400 text-sm"
                  >
                    {error && <p>{error}</p>}
                    {fieldErrors.map((e, i) => <p key={i}>{e}</p>)}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || !password || !confirm || password !== confirm}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating…
                    </span>
                  ) : (
                    'Set New Password'
                  )}
                </button>

                <div className="text-center pt-2 border-t border-slate-800">
                  <Link href="/login" className="text-sm text-slate-400 hover:text-slate-200 transition">
                    ← Back to Sign In
                  </Link>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="text-slate-400">Loading…</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
