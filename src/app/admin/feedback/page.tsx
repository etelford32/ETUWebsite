"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getUserRole } from '@/lib/adminAuth'
import Header from '@/components/Header'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/* MIGRATION STUB - needs API route migration */
const supabase: any = {
  from: () => ({
    select: () => ({ 
      eq: () => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      order: () => ({ limit: () => Promise.resolve({ data: [] }) })
    }),
    insert: () => Promise.resolve({ error: { message: 'Not migrated' } }),
    update: () => ({ eq: () => Promise.resolve({ error: { message: 'Not migrated' } }) })
  }),
  removeChannel: () => {},
  channel: () => ({ on: () => ({ subscribe: () => {} }) })
};


interface FeedbackItem {
  id: string
  user_id: string | null
  type: string
  title: string
  description: string
  status: string
  priority: string
  source: string
  email: string | null
  created_at: string
  updated_at: string
  profile?: {
    username: string
    email: string
  }
}

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed', 'duplicate']
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical']
const TYPE_OPTIONS = ['bug', 'feature', 'suggestion', 'support', 'other']

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
  closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  duplicate: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
}

export default function AdminFeedbackPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [filteredFeedback, setFilteredFeedback] = useState<FeedbackItem[]>([])
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null)
  const [updating, setUpdating] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  // Check auth and admin status
  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    setLoading(true)
    const sessionRes = await fetch("/api/auth/session"); const sessionData = await sessionRes.json(); const session = sessionData.authenticated ? { user: sessionData.user } : null

    if (!session?.user) {
      // Not authenticated - redirect to login
      router.push('/login?message=admin_auth_required')
      setLoading(false)
      return
    }

    // Check if user has admin or moderator role
    const role = await getUserRole(session.user.id)

    if (role !== 'admin' && role !== 'moderator') {
      // Not authorized - redirect to home with error message
      router.push('/?error=unauthorized_admin_access')
      setLoading(false)
      return
    }

    setUser(session.user)
    setIsAdmin(role === 'admin' || role === 'moderator')
    fetchFeedback()
  }

  async function fetchFeedback() {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select(`
          *,
          profile:profiles(username, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setFeedback(data || [])
      setFilteredFeedback(data || [])
    } catch (err) {
      console.error('Error fetching feedback:', err)
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = [...feedback]

    if (statusFilter !== 'all') {
      filtered = filtered.filter(f => f.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(f => f.type === typeFilter)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(f => f.priority === priorityFilter)
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(f => f.source === sourceFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(f =>
        f.title.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query) ||
        f.profile?.username?.toLowerCase().includes(query) ||
        f.email?.toLowerCase().includes(query)
      )
    }

    setFilteredFeedback(filtered)
    setPage(1)
  }, [statusFilter, typeFilter, priorityFilter, sourceFilter, searchQuery, feedback])

  async function updateFeedback(id: string, updates: Partial<FeedbackItem>) {
    setUpdating(true)
    try {
      const { error } = await (supabase
        .from('feedback') as any)
        .update(updates)
        .eq('id', id)

      if (error) throw error

      // Update local state
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
      setSelectedItem(null)
    } catch (err) {
      console.error('Error updating feedback:', err)
      alert('Failed to update feedback')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center min-h-[50vh]">
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
              Admin Access Required
            </h1>
            <p className="text-slate-400 text-lg mb-8">
              You must be signed in as an administrator to access this page
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

  const paginatedFeedback = filteredFeedback.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filteredFeedback.length / pageSize)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            🛡️ Admin - Feedback Management
          </h1>
          <p className="text-slate-400 text-lg mt-2">
            {filteredFeedback.length} feedback item{filteredFeedback.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, username, or email..."
              className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* Filter Buttons */}
          <div className="grid md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-cyan-500 outline-none text-sm"
              >
                <option value="all">All Status</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Type</label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-cyan-500 outline-none text-sm"
              >
                <option value="all">All Types</option>
                {TYPE_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Priority</label>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-cyan-500 outline-none text-sm"
              >
                <option value="all">All Priorities</option>
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Source</label>
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-cyan-500 outline-none text-sm"
              >
                <option value="all">All Sources</option>
                <option value="web">Web</option>
                <option value="game">Game</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feedback Table */}
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
          {paginatedFeedback.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No feedback found matching your filters
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/70 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold">Type</th>
                      <th className="py-3 px-4 text-left font-semibold">Title</th>
                      <th className="py-3 px-4 text-left font-semibold">User</th>
                      <th className="py-3 px-4 text-center font-semibold">Status</th>
                      <th className="py-3 px-4 text-center font-semibold">Priority</th>
                      <th className="py-3 px-4 text-center font-semibold">Source</th>
                      <th className="py-3 px-4 text-left font-semibold">Created</th>
                      <th className="py-3 px-4 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFeedback.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="border-t border-slate-800/80 hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="capitalize text-slate-300">{item.type}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="max-w-md">
                            <div className="font-medium text-slate-200 truncate">{item.title}</div>
                            <div className="text-xs text-slate-500 truncate">{item.description}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-300">
                            {item.profile?.username || item.email || 'Anonymous'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${STATUS_COLORS[item.status]}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${PRIORITY_COLORS[item.priority]}`}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-slate-400 text-xs">{item.source}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-xs font-medium transition-colors"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-800 bg-slate-900/30 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, filteredFeedback.length)} of {filteredFeedback.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
                    >
                      ← Previous
                    </button>
                    <div className="px-4 py-2 text-sm text-slate-300">
                      Page {page} of {totalPages}
                    </div>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-2xl font-bold text-cyan-400">Edit Feedback</h2>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Title</label>
                    <div className="text-slate-100">{selectedItem.title}</div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Description</label>
                    <div className="text-slate-300 text-sm whitespace-pre-wrap bg-slate-950/60 p-4 rounded-lg border border-slate-800">
                      {selectedItem.description}
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">User</label>
                      <div className="text-slate-400 text-sm">
                        {selectedItem.profile?.username || 'Anonymous'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
                      <div className="text-slate-400 text-sm">
                        {selectedItem.email || selectedItem.profile?.email || 'Not provided'}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
                    <select
                      value={selectedItem.status}
                      onChange={e => setSelectedItem({ ...selectedItem, status: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-950/60 border border-slate-700 focus:border-cyan-500 outline-none"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Priority</label>
                    <select
                      value={selectedItem.priority}
                      onChange={e => setSelectedItem({ ...selectedItem, priority: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-slate-950/60 border border-slate-700 focus:border-cyan-500 outline-none"
                    >
                      {PRIORITY_OPTIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Metadata */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Metadata</label>
                    <pre className="text-xs text-slate-400 bg-slate-950/60 p-4 rounded-lg border border-slate-800 overflow-x-auto">
                      {JSON.stringify(selectedItem, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => updateFeedback(selectedItem.id, {
                      status: selectedItem.status,
                      priority: selectedItem.priority,
                    })}
                    disabled={updating}
                    className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 font-semibold transition-all"
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
