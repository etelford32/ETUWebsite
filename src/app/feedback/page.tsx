"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import Header from '@/components/Header'
import Link from 'next/link'

type FeedbackType = 'bug' | 'feature' | 'suggestion' | 'support' | 'other'

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug Report', icon: '🐛', description: 'Report a technical issue or problem' },
  { value: 'feature', label: 'Feature Request', icon: '✨', description: 'Suggest a new feature or enhancement' },
  { value: 'suggestion', label: 'Suggestion', icon: '💡', description: 'Share your ideas for improvements' },
  { value: 'support', label: 'Support', icon: '🆘', description: 'Get help with an issue' },
  { value: 'other', label: 'Other', icon: '📝', description: 'General feedback or comments' },
]

export default function FeedbackPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [type, setType] = useState<FeedbackType>('suggestion')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')

  // Check auth status
  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user || null)

    // Pre-fill email if user is logged in
    if (session?.user?.email) {
      setEmail(session.user.email)
    }

    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!user) {
      setError('You must be signed in to submit feedback')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const { data, error: submitError } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          type,
          title: title.trim(),
          description: description.trim(),
          email: email.trim() || null,
          source: 'web',
          metadata: {
            user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
            url: typeof window !== 'undefined' ? window.location.href : null,
          }
        })
        .select()
        .single()

      if (submitError) throw submitError

      // Success!
      setSuccess(true)
      setTitle('')
      setDescription('')

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      console.error('Error submitting feedback:', err)
      setError(err.message || 'Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-slate-400">Loading...</div>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center py-12">
            <div className="text-6xl mb-6">🔒</div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Sign In Required
            </h1>
            <p className="text-slate-400 text-lg mb-8">
              You must be signed in to submit feedback
            </p>
            <Link
              href="/login"
              className="inline-block px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              Sign In
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            📣 Submit Feedback
          </h1>
          <p className="text-slate-400 text-lg mt-2">
            Help us improve Explore the Universe 2175 with your feedback!
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">✅</div>
              <div className="flex-1">
                <div className="font-semibold text-green-400">Feedback Submitted!</div>
                <div className="text-sm text-slate-300">
                  Thank you for helping us improve the game. We've received your feedback and will review it soon.
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-rose-900/40 to-red-900/40 border border-rose-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1">
                <div className="font-semibold text-rose-400">Error</div>
                <div className="text-sm text-slate-300">{error}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              What type of feedback are you providing? *
            </label>
            <div className="grid md:grid-cols-2 gap-3">
              {FEEDBACK_TYPES.map(feedbackType => (
                <button
                  key={feedbackType.value}
                  type="button"
                  onClick={() => setType(feedbackType.value as FeedbackType)}
                  className={`
                    p-4 rounded-xl text-left transition-all duration-200
                    ${type === feedbackType.value
                      ? 'bg-gradient-to-r from-cyan-900/60 to-blue-900/60 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-900/60 border-2 border-slate-700 hover:border-cyan-500/50 hover:bg-slate-900/80'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{feedbackType.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-200">{feedbackType.label}</div>
                      <div className="text-xs text-slate-400 mt-1">{feedbackType.description}</div>
                    </div>
                    {type === feedbackType.value && (
                      <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2" htmlFor="title">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              placeholder="Brief summary of your feedback..."
              className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-slate-100 placeholder:text-slate-500"
            />
            <div className="text-xs text-slate-500 mt-1">
              {title.length}/200 characters
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2" htmlFor="description">
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              minLength={10}
              rows={8}
              placeholder="Provide as much detail as possible... Steps to reproduce (for bugs), use cases (for features), etc."
              className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-slate-100 placeholder:text-slate-500 resize-none"
            />
            <div className="text-xs text-slate-500 mt-1">
              {description.length} characters (minimum 10)
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2" htmlFor="email">
              Contact Email (Optional)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-slate-100 placeholder:text-slate-500"
            />
            <div className="text-xs text-slate-500 mt-1">
              We'll use this to follow up if needed (defaults to your account email)
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || !title.trim() || !description.trim()}
              className="flex-1 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:scale-100 disabled:shadow-none"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </span>
              ) : (
                '📤 Submit Feedback'
              )}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-12 p-6 rounded-2xl bg-slate-900/40 border border-slate-700">
          <h3 className="font-semibold text-lg mb-3 text-cyan-400">💡 Tips for great feedback</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">•</span>
              <span><strong>Be specific:</strong> Include details like what you were doing, what you expected, and what actually happened</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">•</span>
              <span><strong>For bugs:</strong> List steps to reproduce the issue so we can fix it faster</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">•</span>
              <span><strong>For features:</strong> Explain the problem you're trying to solve and how your idea would help</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">•</span>
              <span><strong>Be constructive:</strong> We welcome all feedback, but constructive criticism helps us improve faster</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}
