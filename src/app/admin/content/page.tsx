"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'

interface DevlogEntry {
  id: string
  title: string
  content: string
  date: string
  tags: string[]
  published: boolean
}

const EMPTY_FORM = {
  title: '',
  content: '',
  date: new Date().toISOString().split('T')[0],
  tags: '',
  published: true,
}

export default function AdminContentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<DevlogEntry[]>([])
  const [editingEntry, setEditingEntry] = useState<DevlogEntry | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  async function checkAuthAndLoad() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/session')
      const { authenticated, user } = await res.json()

      if (!authenticated || user?.role !== 'admin') {
        router.push('/login?message=admin_required')
        return
      }
    } catch {
      router.push('/login')
      return
    }

    await loadEntries()
    setLoading(false)
  }

  async function loadEntries() {
    try {
      // Admin can see all entries including drafts — call DB directly via the GET route
      // (currently GET only returns published; for admin, show all)
      const res = await fetch('/api/devlog')
      const { entries: data } = await res.json()
      setEntries(data || [])
    } catch {
      setError('Failed to load entries.')
    }
  }

  function startCreate() {
    setEditingEntry(null)
    setForm(EMPTY_FORM)
    setIsCreating(true)
    setError('')
    setSuccessMsg('')
  }

  function startEdit(entry: DevlogEntry) {
    setIsCreating(false)
    setEditingEntry(entry)
    setForm({
      title: entry.title,
      content: entry.content,
      date: entry.date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      tags: entry.tags.join(', '),
      published: entry.published,
    })
    setError('')
    setSuccessMsg('')
  }

  function cancelEdit() {
    setEditingEntry(null)
    setIsCreating(false)
    setError('')
  }

  async function saveEntry() {
    setError('')
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required.')
      return
    }

    setSaving(true)
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      date: form.date,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      published: form.published,
    }

    try {
      let res: Response
      if (editingEntry) {
        res = await fetch(`/api/devlog/${editingEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/devlog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || 'Save failed')
      }

      setSuccessMsg(editingEntry ? 'Entry updated!' : 'Entry created!')
      setEditingEntry(null)
      setIsCreating(false)
      await loadEntries()
    } catch (e: any) {
      setError(e.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/devlog/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || 'Delete failed')
      }
      setEntries(prev => prev.filter(e => e.id !== id))
      setSuccessMsg('Entry deleted.')
    } catch (e: any) {
      setError(e.message || 'Delete failed.')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-900 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">Loading…</div>
      </div>
    )
  }

  const showForm = isCreating || editingEntry !== null

  return (
    <div className="min-h-screen bg-deep-900">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-8 text-sm text-slate-400">
          <Link href="/admin" className="hover:text-white transition-colors">Admin</Link>
          <span>›</span>
          <span className="text-white">Content Editor</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">✏️ Content Editor</h1>
            <p className="text-slate-400 text-sm">Manage devlog entries — changes go live instantly on the public page.</p>
          </div>
          {!showForm && (
            <button
              onClick={startCreate}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold text-sm transition-all shadow-lg hover:shadow-purple-500/30"
            >
              + New Entry
            </button>
          )}
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="ml-4 opacity-60 hover:opacity-100 text-lg leading-none">×</button>
          </div>
        )}

        {/* Entry form */}
        {showForm && (
          <div className="mb-10 bg-slate-800/60 border border-purple-500/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-purple-300 mb-5">
              {editingEntry ? '✏️ Edit Entry' : '+ New Entry'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Entry title…"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg text-white placeholder-slate-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="px-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg text-white outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Tags <span className="text-slate-500">(comma-separated, e.g. announcement, update)</span>
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="announcement, update, feature…"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg text-white placeholder-slate-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Content * <span className="text-slate-500">(plain text, line breaks preserved)</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Write your devlog entry here…"
                  rows={12}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg text-white placeholder-slate-500 outline-none transition-colors resize-y leading-relaxed font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-sm text-slate-300">Published (visible to public)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={saveEntry}
                disabled={saving}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-white font-semibold text-sm transition-all"
              >
                {saving ? 'Saving…' : editingEntry ? 'Save Changes' : 'Publish Entry'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Entry list */}
        {entries.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/40 border border-slate-700 rounded-xl">
            <p className="text-slate-400 mb-4">No entries yet.</p>
            <button onClick={startCreate} className="text-purple-400 hover:text-purple-300 underline text-sm">
              Create your first entry →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </p>
            {entries.map(entry => (
              <div
                key={entry.id}
                className={`bg-slate-800/50 border rounded-xl p-5 transition-all ${
                  editingEntry?.id === entry.id
                    ? 'border-purple-500/50 shadow-lg shadow-purple-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs text-slate-500">
                        {new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      {!entry.published && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-xs">
                          Draft
                        </span>
                      )}
                      {entry.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded text-xs capitalize">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-semibold text-white text-lg leading-tight">{entry.title}</h3>
                    <p className="text-slate-400 text-sm mt-1 line-clamp-2">{entry.content}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(entry)}
                      disabled={showForm}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-slate-300 text-xs font-medium transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      disabled={deleting === entry.id}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-40 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium transition-all"
                    >
                      {deleting === entry.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer links */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex items-center gap-6 text-sm text-slate-500">
          <Link href="/devlog" className="hover:text-white transition-colors">View public devlog →</Link>
          <Link href="/admin" className="hover:text-white transition-colors">← Admin dashboard</Link>
        </div>
      </div>
    </div>
  )
}
