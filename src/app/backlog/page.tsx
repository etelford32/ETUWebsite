"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BacklogItemWithProfile } from '@/lib/types'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

type BacklogType = 'all' | 'feature' | 'bug'
type BacklogStatus = 'all' | 'open' | 'in_progress' | 'completed' | 'wont_fix' | 'duplicate'
type SortBy = 'created_at' | 'vote_count' | 'priority'

const TYPE_OPTIONS = [
  { key: 'all' as BacklogType, label: 'All Items', icon: '🌟' },
  { key: 'feature' as BacklogType, label: 'Features', icon: '✨' },
  { key: 'bug' as BacklogType, label: 'Bugs', icon: '🐛' },
]

const STATUS_OPTIONS = [
  { key: 'all' as BacklogStatus, label: 'All Status', icon: '📋' },
  { key: 'open' as BacklogStatus, label: 'Open', icon: '🔓' },
  { key: 'in_progress' as BacklogStatus, label: 'In Progress', icon: '⚙️' },
  { key: 'completed' as BacklogStatus, label: 'Completed', icon: '✅' },
  { key: 'wont_fix' as BacklogStatus, label: "Won't Fix", icon: '❌' },
  { key: 'duplicate' as BacklogStatus, label: 'Duplicate', icon: '🔄' },
]

const SORT_OPTIONS = [
  { key: 'created_at' as SortBy, label: 'Newest', icon: '🕐' },
  { key: 'vote_count' as SortBy, label: 'Most Voted', icon: '🔥' },
  { key: 'priority' as SortBy, label: 'Priority', icon: '⚡' },
]

const PRIORITY_COLORS = {
  low: 'text-blue-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
}

const STATUS_COLORS = {
  open: 'bg-green-500/20 text-green-400 border-green-500/30',
  in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  wont_fix: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  duplicate: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

export default function BacklogPage() {
  const router = useRouter()
  const [items, setItems] = useState<BacklogItemWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set())

  // Filters
  const [typeFilter, setTypeFilter] = useState<BacklogType>('all')
  const [statusFilter, setStatusFilter] = useState<BacklogStatus>('open')
  const [sortBy, setSortBy] = useState<SortBy>('vote_count')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)

  // Modal states
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitType, setSubmitType] = useState<'feature' | 'bug'>('feature')
  const [submitTitle, setSubmitTitle] = useState('')
  const [submitDescription, setSubmitDescription] = useState('')
  const [submitPriority, setSubmitPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [submitting, setSubmitting] = useState(false)

  // Check current user
  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    setCurrentUser(session?.user || null)

    if (session?.user) {
      fetchUserVotes(session.user.id)
    }
  }

  async function fetchUserVotes(userId: string) {
    try {
      const res = await fetch(`/api/backlog/vote?user_id=${userId}`)
      const json = await res.json()

      if (json.success && json.votes) {
        setUserVotes(new Set(json.votes))
      }
    } catch (err) {
      console.error('Error fetching user votes:', err)
    }
  }

  // Fetch backlog items
  useEffect(() => {
    fetchBacklog()
  }, [typeFilter, statusFilter, sortBy, searchQuery, page])

  async function fetchBacklog() {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder: 'desc',
      })

      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const res = await fetch(`/api/backlog?${params}`)
      const json = await res.json()

      if (json.error) {
        throw new Error(json.error)
      }

      setItems(json.items || [])
      setTotal(json.pagination?.total || 0)
    } catch (err: any) {
      console.error('Error fetching backlog:', err)
      setError(err.message || 'Failed to load backlog')
    } finally {
      setLoading(false)
    }
  }

  async function handleVote(itemId: string) {
    if (!currentUser) {
      router.push('/login')
      return
    }

    const hasVoted = userVotes.has(itemId)

    try {
      const res = await fetch('/api/backlog/vote', {
        method: hasVoted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          backlog_item_id: itemId,
        }),
      })

      const json = await res.json()

      if (json.error) {
        throw new Error(json.error)
      }

      // Update local state
      const newVotes = new Set(userVotes)
      if (hasVoted) {
        newVotes.delete(itemId)
      } else {
        newVotes.add(itemId)
      }
      setUserVotes(newVotes)

      // Update vote count in items
      setItems(items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            vote_count: hasVoted ? item.vote_count - 1 : item.vote_count + 1,
          }
        }
        return item
      }))
    } catch (err: any) {
      console.error('Error voting:', err)
      alert(err.message || 'Failed to vote')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!currentUser) {
      router.push('/login')
      return
    }

    if (submitTitle.length < 3) {
      alert('Title must be at least 3 characters')
      return
    }

    if (submitDescription.length < 10) {
      alert('Description must be at least 10 characters')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          type: submitType,
          title: submitTitle,
          description: submitDescription,
          priority: submitPriority,
          tags: [],
          source: 'web',
        }),
      })

      const json = await res.json()

      if (json.error) {
        throw new Error(json.error)
      }

      // Reset form
      setSubmitTitle('')
      setSubmitDescription('')
      setSubmitPriority('medium')
      setShowSubmitModal(false)

      // Refresh backlog
      fetchBacklog()
    } catch (err: any) {
      console.error('Error submitting:', err)
      alert(err.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                🗳️ Community Backlog
              </h1>
              <p className="text-slate-400 mt-2 text-lg">
                Submit and vote on features and bug reports. Your voice shapes the future of ETU2175!
              </p>
            </div>
            <button
              onClick={() => {
                if (!currentUser) {
                  router.push('/login')
                } else {
                  setShowSubmitModal(true)
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 font-semibold shadow-lg hover:shadow-cyan-500/50"
            >
              + Submit Item
            </button>
          </div>
          <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <p className="text-slate-300">
                Want to see the big picture? Check out our{' '}
                <a href="/roadmap" className="text-cyan-400 hover:text-cyan-300 font-semibold underline">
                  Development Roadmap
                </a>
                {' '}to see major milestones and planned features.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search backlog items..."
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white placeholder-slate-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
            {/* Type Filter */}
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setTypeFilter(option.key)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    typeFilter === option.key
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <span className="mr-2">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setStatusFilter(option.key)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    statusFilter === option.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <span className="mr-2">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setSortBy(option.key)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    sortBy === option.key
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <span className="mr-2">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-slate-400 mt-4">Loading backlog...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400">Error: {error}</p>
            <button
              onClick={fetchBacklog}
              className="mt-4 px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500"
            >
              Retry
            </button>
          </div>
        )}

        {/* Backlog Items */}
        {!loading && !error && (
          <>
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="mb-4 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 hover:border-indigo-500/50 transition-all duration-200"
                >
                  <div className="flex gap-6">
                    {/* Vote Button */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => handleVote(item.id)}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ${
                          userVotes.has(item.id)
                            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        <span className="text-2xl">▲</span>
                      </button>
                      <span className="mt-2 font-bold text-lg">{item.vote_count}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[item.status]}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                          <span className={`text-sm font-semibold ${item.type === 'feature' ? 'text-cyan-400' : 'text-red-400'}`}>
                            {item.type === 'feature' ? '✨ Feature' : '🐛 Bug'}
                          </span>
                          <span className={`text-sm font-semibold ${PRIORITY_COLORS[item.priority]}`}>
                            {item.priority}
                          </span>
                        </div>
                        <span className="text-sm text-slate-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-slate-300 mb-3">{item.description}</p>

                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span>
                          Submitted by{' '}
                          <span className="text-indigo-400 font-semibold">
                            {item.profiles?.username || 'Anonymous'}
                          </span>
                        </span>
                        {item.source === 'game' && (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                            🎮 From Game
                          </span>
                        )}
                      </div>

                      {item.tags && item.tags.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {item.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {items.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-400 text-lg">No items found</p>
                <p className="text-slate-500 mt-2">Try adjusting your filters</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-slate-800/50 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-slate-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-slate-800/50 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Submit Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Submit New Item
            </h2>

            <form onSubmit={handleSubmit}>
              {/* Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-3">Type</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setSubmitType('feature')}
                    className={`flex-1 px-4 py-3 rounded-lg transition-all duration-200 ${
                      submitType === 'feature'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    ✨ Feature Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmitType('bug')}
                    className={`flex-1 px-4 py-3 rounded-lg transition-all duration-200 ${
                      submitType === 'bug'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    🐛 Bug Report
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={submitTitle}
                  onChange={(e) => setSubmitTitle(e.target.value)}
                  placeholder="Brief description of the feature or bug"
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                  required
                  minLength={3}
                  maxLength={200}
                />
                <p className="text-xs text-slate-500 mt-1">{submitTitle.length}/200 characters</p>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={submitDescription}
                  onChange={(e) => setSubmitDescription(e.target.value)}
                  placeholder="Detailed description of what you'd like to see or what went wrong"
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white h-32 resize-none"
                  required
                  minLength={10}
                />
                <p className="text-xs text-slate-500 mt-1">Minimum 10 characters</p>
              </div>

              {/* Priority */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-3">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'critical'] as const).map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setSubmitPriority(priority)}
                      className={`px-4 py-2 rounded-lg transition-all duration-200 capitalize ${
                        submitPriority === priority
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all duration-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 font-semibold disabled:opacity-50 shadow-lg hover:shadow-cyan-500/50"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
        )}
      </main>
    </div>
  )
}
