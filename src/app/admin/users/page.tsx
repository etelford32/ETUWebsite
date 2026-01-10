"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getUserRole } from '@/lib/adminAuth'
import { createServerClient } from '@/lib/supabaseServer'
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


interface User {
  id: string
  email: string
  username: string
  role: 'user' | 'admin' | 'moderator'
  avatar_url: string
  created_at: string
  last_sign_in_at: string
  steam_id: string | null
  faction_choice: string | null
  level: number
  xp: number
}

const ROLE_COLORS = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  moderator: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  user: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

export default function UserManagement() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [updating, setUpdating] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [searchQuery, roleFilter, users])

  async function checkAuth() {
    setLoading(true)
    const sessionRes = await fetch("/api/auth/session"); const sessionData = await sessionRes.json(); const session = sessionData.authenticated ? { user: sessionData.user } : null

    if (!session?.user) {
      router.push('/login?message=admin_auth_required')
      return
    }

    const role = await getUserRole(session.user.id)

    if (role !== 'admin' && role !== 'moderator') {
      router.push('/?error=unauthorized_admin_access')
      return
    }

    setCurrentUser(session.user)
    setIsAdmin(role === 'admin')
    await fetchUsers()
    setLoading(false)
  }

  async function fetchUsers() {
    try {
      // Fetch profiles with auth data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Fetch auth users for email and last sign in
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()

      if (authError) {
        // Fallback if admin API not available
        const usersData = profiles?.map((profile: any) => ({
          id: profile.id,
          email: 'N/A',
          username: profile.username || 'Anonymous',
          role: profile.role || 'user',
          avatar_url: profile.avatar_url || '',
          created_at: profile.created_at,
          last_sign_in_at: 'N/A',
          steam_id: profile.steam_id,
          faction_choice: profile.faction_choice,
          level: profile.level || 1,
          xp: profile.xp || 0,
        })) || []

        setUsers(usersData)
        return
      }

      // Merge profile and auth data
      const usersData = profiles?.map((profile: any) => {
        const authUser = authUsers?.find((au: any) => au.id === profile.id)
        return {
          id: profile.id,
          email: authUser?.email || 'N/A',
          username: profile.username || 'Anonymous',
          role: profile.role || 'user',
          avatar_url: profile.avatar_url || '',
          created_at: authUser?.created_at || profile.created_at,
          last_sign_in_at: authUser?.last_sign_in_at || 'N/A',
          steam_id: profile.steam_id,
          faction_choice: profile.faction_choice,
          level: profile.level || 1,
          xp: profile.xp || 0,
        }
      }) || []

      setUsers(usersData)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  function filterUsers() {
    let filtered = [...users]

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(u =>
        u.username?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.id.toLowerCase().includes(query)
      )
    }

    setFilteredUsers(filtered)
    setPage(1)
  }

  async function updateUserRole(userId: string, newRole: 'user' | 'admin' | 'moderator') {
    if (!isAdmin) {
      alert('Only admins can change user roles')
      return
    }

    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return
    }

    setUpdating(true)
    try {
      const { error } = await (supabase
        .from('profiles') as any)
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      setSelectedUser(null)
      alert('User role updated successfully!')
    } catch (error: any) {
      console.error('Error updating user role:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="text-center text-slate-400">
            Loading user management...
          </div>
        </div>
      </div>
    )
  }

  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filteredUsers.length / pageSize)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                User Management
              </h1>
              <p className="text-slate-400 mt-2">
                Manage user accounts and roles
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Total Users</div>
              <div className="text-3xl font-bold text-white">{users.length}</div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-4 overflow-x-auto pb-2">
            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/security"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              Security
            </Link>
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg whitespace-nowrap"
            >
              User Management
            </Link>
            <Link
              href="/admin/feedback"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              Feedback
            </Link>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Search Users</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username, email, or ID..."
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Filter by Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="user">User</option>
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-400">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.username}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {user.username?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <div className="text-white font-medium">{user.username || 'Anonymous'}</div>
                          <div className="text-xs text-slate-400">{user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${ROLE_COLORS[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      Level {user.level}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <a
                          href={`/profile/${user.id}`}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Profile
                        </a>
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-800/30 flex items-center justify-between">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Previous
              </button>
              <div className="text-slate-400">
                Page {page} of {totalPages}
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* User Management Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Manage User</h2>

            <div className="space-y-4 mb-6">
              <div>
                <div className="text-sm text-slate-400">Username</div>
                <div className="text-white font-medium">{selectedUser.username}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400">Email</div>
                <div className="text-white">{selectedUser.email}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400">User ID</div>
                <div className="text-white text-xs font-mono">{selectedUser.id}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400">Current Role</div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${ROLE_COLORS[selectedUser.role]}`}>
                  {selectedUser.role}
                </span>
              </div>
            </div>

            {isAdmin && (
              <div className="space-y-3 mb-6">
                <div className="text-sm text-slate-400 mb-2">Change Role</div>
                <button
                  onClick={() => updateUserRole(selectedUser.id, 'admin')}
                  disabled={updating || selectedUser.role === 'admin'}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Make Admin
                </button>
                <button
                  onClick={() => updateUserRole(selectedUser.id, 'moderator')}
                  disabled={updating || selectedUser.role === 'moderator'}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Make Moderator
                </button>
                <button
                  onClick={() => updateUserRole(selectedUser.id, 'user')}
                  disabled={updating || selectedUser.role === 'user'}
                  className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Make Regular User
                </button>
              </div>
            )}

            <button
              onClick={() => setSelectedUser(null)}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
