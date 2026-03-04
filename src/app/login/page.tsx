"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

// ─── Forgot Username Modal ────────────────────────────────────────────────────

function ForgotUsernameModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/forgot-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      setDone(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition text-xl leading-none"
        >
          ✕
        </button>

        {done ? (
          <div className="text-center space-y-3 py-2">
            <div className="text-4xl">📬</div>
            <h3 className="font-bold text-green-400">Check your inbox</h3>
            <p className="text-slate-400 text-sm">
              If an account is linked to that email, your commander name is on its way.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm transition"
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-bold text-lg mb-1">Forgot Commander Name?</h3>
            <p className="text-slate-400 text-sm mb-4">
              Enter the email linked to your account and we'll remind you.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="commander@galaxy.com"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm"
              />
              {error && <p className="text-rose-400 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg font-semibold text-sm transition disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send My Commander Name'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}

// ─── Main Login Form ──────────────────────────────────────────────────────────

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [redirectTo, setRedirectTo] = useState('/dashboard')
  const [isAlphaRedirect, setIsAlphaRedirect] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [identifier, setIdentifier] = useState('') // email or username
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showForgotUsername, setShowForgotUsername] = useState(false)

  useEffect(() => {
    const redirect = searchParams?.get('redirect') || '/dashboard'
    const isAlpha = redirect === '/alpha-testing'
    setRedirectTo(redirect)
    setIsAlphaRedirect(isAlpha)
    if (isAlpha) setMode('signup')

    const msg = searchParams?.get('message')
    const err = searchParams?.get('error')
    if (msg === 'steam_linked') {
      setMessage({ type: 'success', text: 'Steam account linked successfully!' })
    } else if (msg === 'password_reset') {
      setMessage({ type: 'success', text: 'Password updated! Please sign in with your new password.' })
    } else if (err === 'invalid_magic_link') {
      setMessage({ type: 'error', text: 'Invalid magic link. Please request a new one.' })
    } else if (err === 'magic_link_expired') {
      setMessage({ type: 'error', text: 'Magic link expired. Please request a new one.' })
    } else if (err === 'magic_link_failed') {
      setMessage({ type: 'error', text: 'Magic link authentication failed. Please try again.' })
    }
  }, [searchParams])

  useEffect(() => {
    checkUser()
  }, [redirectTo])

  async function checkUser() {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      if (data.authenticated) router.push(redirectTo)
    } catch {}
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error('Passwords do not match')

        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: identifier,
            password,
            username: identifier.includes('@') ? identifier.split('@')[0] : identifier,
            isAlphaApplicant: isAlphaRedirect,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create account')

        setMessage({
          type: 'success',
          text: isAlphaRedirect
            ? 'Account created! Redirecting to your alpha application…'
            : 'Account created! Redirecting…',
        })
        setTimeout(() => router.push(redirectTo), 1000)
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailOrUsername: identifier, password }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Invalid credentials')

        setMessage({ type: 'success', text: 'Signed in! Redirecting…' })
        setTimeout(() => router.push(redirectTo), 1000)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' })
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink() {
    if (!identifier) {
      setMessage({ type: 'error', text: 'Enter your email or commander name first' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, redirectTo }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send magic link')

      setMessage({ type: 'success', text: '🔮 Magic link sent! Check your email and click the link to sign in.' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send magic link' })
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setMessage({
      type: 'error',
      text: `${provider === 'apple' ? 'Apple' : 'Google'} sign-in is coming soon. Use Steam, email, or a magic link for now.`,
    })
  }

  const isEmailInput = identifier.includes('@')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <Header />

      {/* Animated background stars */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 etu-starfield opacity-30"></div>
      </div>

      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-64px)] p-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Alpha Testing Banner */}
          {isAlphaRedirect && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/50 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                  <span className="text-xl">☢️</span>
                </div>
                <div>
                  <h3 className="font-bold text-green-400">Alpha Testing Access</h3>
                  <p className="text-sm text-green-300/80">
                    {mode === 'signup'
                      ? 'Create an account to apply for alpha testing'
                      : 'Sign in to continue your alpha application'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Logo and title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
            >
              <img src="/logo2.png" alt="ETU Logo" className="w-20 h-20 mx-auto mb-4" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Explore the Universe 2175
              </h1>
              <p className="text-slate-400 mt-2">
                {mode === 'login' ? 'Welcome back, Commander' : 'Begin your journey'}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                One account for PC, Mac, Linux, Steam Deck &amp; Web
              </p>
            </motion.div>
          </div>

          {/* Auth card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-indigo-500/10">
            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-slate-800/60 rounded-lg">
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setMessage(null) }}
                  className={`py-2 rounded-lg font-medium transition-all capitalize ${
                    mode === m
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Message */}
            <AnimatePresence>
              {message && (
                <motion.div
                  key="msg"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mb-4 p-4 rounded-lg text-sm ${
                    message.type === 'success'
                      ? 'bg-green-900/20 border border-green-500/30 text-green-400'
                      : 'bg-rose-900/20 border border-rose-500/30 text-rose-400'
                  }`}
                >
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {/* Email or username */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="identifier" className="block text-sm font-medium text-slate-300">
                    {mode === 'signup' ? 'Email' : 'Email or Commander Name'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setShowForgotUsername(true)}
                      className="text-xs text-slate-500 hover:text-indigo-400 transition"
                    >
                      Forgot username?
                    </button>
                  )}
                </div>
                <input
                  id="identifier"
                  type={mode === 'signup' ? 'email' : 'text'}
                  inputMode={isEmailInput || mode === 'signup' ? 'email' : 'text'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder={mode === 'signup' ? 'commander@galaxy.com' : 'Email or commander name'}
                  autoComplete={mode === 'signup' ? 'email' : 'username email'}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                    Password
                  </label>
                  {mode === 'login' && (
                    <Link
                      href="/forgot-password"
                      className="text-xs text-slate-500 hover:text-indigo-400 transition"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full px-4 py-3 pr-12 bg-slate-800/80 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition text-sm"
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Confirm password (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 bg-slate-800/80 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-rose-500/60'
                        : 'border-slate-700'
                    }`}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-rose-400 mt-1">Passwords do not match</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg font-semibold shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing…
                  </span>
                ) : mode === 'login' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900 text-slate-400">Or continue with</span>
              </div>
            </div>

            {/* OAuth buttons */}
            <div className="space-y-3">
              {/* Steam */}
              <a
                href="/api/steam/auth"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1b2838] hover:bg-[#2a475e] rounded-lg transition font-medium"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
                </svg>
                Continue with Steam
              </a>

              {/* Google */}
              <button
                onClick={() => handleOAuth('google')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition border border-slate-700 font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
                <span className="text-xs text-slate-500 ml-auto">(Coming Soon)</span>
              </button>

              {/* Apple */}
              <button
                onClick={() => handleOAuth('apple')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black hover:bg-slate-900 rounded-lg transition border border-slate-700 font-medium"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Continue with Apple
                <span className="text-xs text-slate-500 ml-auto">(Coming Soon)</span>
              </button>
            </div>

            {/* Magic link */}
            <div className="mt-6 text-center">
              <button
                onClick={handleMagicLink}
                disabled={loading || !identifier}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🔮 Send me a magic link instead
              </button>
              {!identifier && (
                <p className="text-xs text-slate-600 mt-1">Enter your email or commander name above first</p>
              )}
            </div>
          </div>

          {/* Footer links */}
          <div className="mt-6 text-center space-y-2">
            <Link href="/" className="block text-sm text-slate-400 hover:text-slate-200 transition">
              ← Back to home
            </Link>
            <Link href="/leaderboard" className="block text-sm text-slate-400 hover:text-slate-200 transition">
              View Leaderboard 🏆
            </Link>
          </div>
        </motion.div>
      </main>

      <Footer />

      {/* Forgot Username Modal */}
      <AnimatePresence>
        {showForgotUsername && (
          <ForgotUsernameModal onClose={() => setShowForgotUsername(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center">
          <div className="text-slate-400">Loading…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
