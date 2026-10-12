"use client"

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { APPLICATION_STATUSES, type AdminApplication, type ApplicationKind } from '@/lib/adminApplications'

const KIND_LABELS: Record<ApplicationKind, string> = {
  alpha: '🚀 Alpha Tester',
  career: '💼 Career',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  reviewing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  interviewed: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  accepted: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const ALL_STATUSES = Array.from(
  new Set([...APPLICATION_STATUSES.alpha, ...APPLICATION_STATUSES.career])
)

export default function AdminApplicationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<AdminApplication[]>([])
  const [selectedItem, setSelectedItem] = useState<AdminApplication | null>(null)
  const [pendingStatus, setPendingStatus] = useState('')
  const [updating, setUpdating] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filters
  const [kindFilter, setKindFilter] = useState<'all' | ApplicationKind>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    setLoading(true)
    const sessionRes = await fetch('/api/auth/session')
    const sessionData = await sessionRes.json()

    if (!sessionData.authenticated) {
      router.push('/login?message=admin_auth_required')
      setLoading(false)
      return
    }

    const role = sessionData.user.role
    if (role !== 'admin' && role !== 'staff' && !sessionData.user.isSuperuser) {
      router.push('/?error=unauthorized_admin_access')
      setLoading(false)
      return
    }

    setUser(sessionData.user)
    fetchApplications()
  }

  async function fetchApplications() {
    try {
      const res = await fetch('/api/admin/applications')
      if (!res.ok) throw new Error(`Failed to load applications (${res.status})`)
      const { applications: data } = await res.json()
      setApplications(data || [])

      // Deep link from the dashboard: ?id=<uuid>&kind=<alpha|career> opens that item.
      const params = new URLSearchParams(window.location.search)
      const linkedId = params.get('id')
      const linkedKind = params.get('kind')
      const linked = linkedId && (data || []).find(
        (a: AdminApplication) => a.id === linkedId && (!linkedKind || a.kind === linkedKind)
      )
      if (linked) openItem(linked)
    } catch (err: any) {
      console.error('Error fetching applications:', err)
      setLoadError(err.message || 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  function openItem(item: AdminApplication) {
    setSelectedItem(item)
    setPendingStatus(item.status)
  }

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return applications.filter(a =>
      (kindFilter === 'all' || a.kind === kindFilter) &&
      (statusFilter === 'all' || a.status === statusFilter) &&
      (!query ||
        a.name?.toLowerCase().includes(query) ||
        a.email?.toLowerCase().includes(query) ||
        a.headline.toLowerCase().includes(query) ||
        a.summary.toLowerCase().includes(query))
    )
  }, [applications, kindFilter, statusFilter, searchQuery])

  useEffect(() => {
    setPage(1)
  }, [kindFilter, statusFilter, searchQuery])

  const counts = useMemo(() => ({
    alpha: applications.filter(a => a.kind === 'alpha').length,
    career: applications.filter(a => a.kind === 'career').length,
    pending: applications.filter(a => a.status === 'pending').length,
  }), [applications])

  async function updateStatus(item: AdminApplication, status: string) {
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, kind: item.kind, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update application')

      setApplications(prev => prev.map(a =>
        a.id === item.id && a.kind === item.kind ? { ...a, status } : a
      ))
      setSelectedItem(null)
    } catch (err: any) {
      console.error('Error updating application:', err)
      alert(err.message || 'Failed to update application')
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

  if (!user) return null

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)
  const statusOptions = kindFilter === 'all' ? ALL_STATUSES : APPLICATION_STATUSES[kindFilter]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-sm text-slate-400 hover:text-slate-200">
            ← Admin Dashboard
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent mt-2">
            📝 Admin - Applications
          </h1>
          <p className="text-slate-400 text-lg mt-2">
            {filtered.length} application{filtered.length !== 1 ? 's' : ''} found
            <span className="text-slate-500 text-sm">
              {' '}· {counts.alpha} alpha · {counts.career} career · {counts.pending} pending
            </span>
          </p>
        </div>

        {loadError && (
          <div className="mb-6 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
            {loadError}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, position, or message..."
            className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-slate-100 placeholder:text-slate-500"
          />

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Type</label>
              <select
                value={kindFilter}
                onChange={e => {
                  setKindFilter(e.target.value as 'all' | ApplicationKind)
                  setStatusFilter('all')
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-cyan-500 outline-none text-sm"
              >
                <option value="all">All Types</option>
                <option value="alpha">Alpha Tester</option>
                <option value="career">Career</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 focus:border-cyan-500 outline-none text-sm"
              >
                <option value="all">All Status</option>
                {statusOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
          {paginated.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No applications found matching your filters
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/70 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold">Type</th>
                      <th className="py-3 px-4 text-left font-semibold">Applicant</th>
                      <th className="py-3 px-4 text-left font-semibold">Summary</th>
                      <th className="py-3 px-4 text-center font-semibold">Status</th>
                      <th className="py-3 px-4 text-left font-semibold">Submitted</th>
                      <th className="py-3 px-4 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(item => (
                      <tr
                        key={`${item.kind}-${item.id}`}
                        className="border-t border-slate-800/80 hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                          {KIND_LABELS[item.kind]}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="max-w-md">
                            <div className="text-slate-300 truncate">{item.headline}</div>
                            <div className="text-xs text-slate-500 truncate">{item.summary}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium border capitalize ${STATUS_COLORS[item.status] || ''}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => openItem(item)}
                            className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-xs font-medium transition-colors"
                          >
                            Review
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
                    Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
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

      {/* Review Modal */}
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
                  <div>
                    <div className="text-xs text-slate-500 mb-1">{KIND_LABELS[selectedItem.kind]} application</div>
                    <h2 className="text-2xl font-bold text-cyan-400">{selectedItem.name}</h2>
                    <a href={`mailto:${selectedItem.email}`} className="text-sm text-slate-400 hover:text-cyan-300">
                      {selectedItem.email}
                    </a>
                  </div>
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
                  <div className="text-xs text-slate-500">
                    Submitted {new Date(selectedItem.created_at).toLocaleString()}
                  </div>

                  {Object.entries(selectedItem.details)
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label}>
                        <label className="block text-sm font-semibold text-slate-300 mb-1">{label}</label>
                        {typeof value === 'string' && /^https?:\/\//.test(value) ? (
                          <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 break-all">
                            {value}
                          </a>
                        ) : (
                          <div className="text-slate-300 text-sm whitespace-pre-wrap bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                            {String(value)}
                          </div>
                        )}
                      </div>
                    ))}

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
                    <select
                      value={pendingStatus}
                      onChange={e => setPendingStatus(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-950/60 border border-slate-700 focus:border-cyan-500 outline-none capitalize"
                    >
                      {APPLICATION_STATUSES[selectedItem.kind].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => updateStatus(selectedItem, pendingStatus)}
                    disabled={updating || pendingStatus === selectedItem.status}
                    className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 font-semibold transition-all"
                  >
                    {updating ? 'Saving...' : 'Save Status'}
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
