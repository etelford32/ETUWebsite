'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getActiveFunnels, getFunnelStats, Funnel, createFunnel, FunnelStep } from '@/lib/funnels'
import { isStaff } from '@/lib/adminAuth'
import { useRouter } from 'next/navigation'

interface FunnelStats {
  step_index: number
  step_name: string
  total_entries: number
  completions: number
  conversion_rate: number
  drop_off_rate: number
}

export default function FunnelsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null)
  const [funnelStats, setFunnelStats] = useState<FunnelStats[]>([])
  const [timeRange, setTimeRange] = useState(7)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFunnel, setNewFunnel] = useState({
    name: '',
    description: '',
    steps: [] as FunnelStep[]
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (authorized) {
      loadFunnels()
    }
  }, [authorized])

  useEffect(() => {
    if (selectedFunnel) {
      loadFunnelStats(selectedFunnel)
    }
  }, [selectedFunnel, timeRange])

  async function checkAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const hasAccess = await isStaff(user.id)
      if (!hasAccess) {
        router.push('/')
        return
      }

      setAuthorized(true)
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function loadFunnels() {
    const data = await getActiveFunnels()
    setFunnels(data)
    if (data.length > 0 && !selectedFunnel) {
      setSelectedFunnel(data[0].id)
    }
  }

  async function loadFunnelStats(funnelId: string) {
    const stats = await getFunnelStats(funnelId, timeRange)
    setFunnelStats(stats)
  }

  async function handleCreateFunnel() {
    if (!newFunnel.name || newFunnel.steps.length === 0) {
      alert('Please provide funnel name and at least one step')
      return
    }

    const funnelId = await createFunnel(
      newFunnel.name,
      newFunnel.description,
      newFunnel.steps
    )

    if (funnelId) {
      setShowCreateModal(false)
      setNewFunnel({ name: '', description: '', steps: [] })
      loadFunnels()
    }
  }

  function addStep() {
    setNewFunnel({
      ...newFunnel,
      steps: [
        ...newFunnel.steps,
        {
          index: newFunnel.steps.length,
          name: '',
          description: '',
          requiredAction: ''
        }
      ]
    })
  }

  function updateStep(index: number, field: keyof FunnelStep, value: string | number) {
    const updatedSteps = [...newFunnel.steps]
    updatedSteps[index] = { ...updatedSteps[index], [field]: value }
    setNewFunnel({ ...newFunnel, steps: updatedSteps })
  }

  function removeStep(index: number) {
    const updatedSteps = newFunnel.steps.filter((_, i) => i !== index)
    // Re-index the steps
    const reindexed = updatedSteps.map((step, i) => ({ ...step, index: i }))
    setNewFunnel({ ...newFunnel, steps: reindexed })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  const selectedFunnelData = funnels.find(f => f.id === selectedFunnel)
  const overallConversion = funnelStats.length > 0
    ? (funnelStats[funnelStats.length - 1]?.completions / funnelStats[0]?.total_entries * 100) || 0
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Funnel Analysis</h1>
            <p className="text-gray-400">Track conversion rates through user journeys</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            Create Funnel
          </button>
        </div>

        {/* Funnel Selector */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/10">
          <div className="flex items-center gap-4 mb-4">
            <select
              value={selectedFunnel || ''}
              onChange={(e) => setSelectedFunnel(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {funnels.map(funnel => (
                <option key={funnel.id} value={funnel.id} className="bg-gray-900">
                  {funnel.name}
                </option>
              ))}
            </select>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={7} className="bg-gray-900">Last 7 days</option>
              <option value={30} className="bg-gray-900">Last 30 days</option>
              <option value={90} className="bg-gray-900">Last 90 days</option>
            </select>
          </div>

          {selectedFunnelData && (
            <div className="text-gray-300">
              <p className="text-sm">{selectedFunnelData.description}</p>
            </div>
          )}
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/20">
            <div className="text-blue-300 text-sm font-medium mb-2">Total Entries</div>
            <div className="text-3xl font-bold text-white">
              {funnelStats[0]?.total_entries?.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-lg rounded-2xl p-6 border border-green-500/20">
            <div className="text-green-300 text-sm font-medium mb-2">Completions</div>
            <div className="text-3xl font-bold text-white">
              {funnelStats[funnelStats.length - 1]?.completions?.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20">
            <div className="text-purple-300 text-sm font-medium mb-2">Overall Conversion</div>
            <div className="text-3xl font-bold text-white">
              {overallConversion.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-lg rounded-2xl p-6 border border-orange-500/20">
            <div className="text-orange-300 text-sm font-medium mb-2">Drop-off Rate</div>
            <div className="text-3xl font-bold text-white">
              {(100 - overallConversion).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Funnel Visualization */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6">Conversion Funnel</h2>

          {funnelStats.length > 0 ? (
            <div className="space-y-4">
              {funnelStats.map((step, index) => {
                const width = (step.total_entries / funnelStats[0].total_entries) * 100
                const conversionFromPrevious = index > 0
                  ? (step.total_entries / funnelStats[index - 1].total_entries * 100)
                  : 100

                return (
                  <div key={index} className="space-y-2">
                    {/* Step Header */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                          {index + 1}
                        </div>
                        <span className="text-white font-medium">{step.step_name}</span>
                      </div>
                      <div className="flex items-center gap-6 text-gray-300">
                        <span>{step.total_entries.toLocaleString()} users</span>
                        <span className="text-green-400">{step.conversion_rate.toFixed(1)}%</span>
                        {index > 0 && (
                          <span className="text-orange-400">
                            {conversionFromPrevious.toFixed(1)}% from prev
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Funnel Bar */}
                    <div className="relative h-16 bg-white/5 rounded-xl overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 flex items-center justify-end px-4"
                        style={{ width: `${width}%` }}
                      >
                        <span className="text-white font-semibold text-sm">
                          {step.conversion_rate.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Drop-off indicator */}
                    {index < funnelStats.length - 1 && step.drop_off_rate > 0 && (
                      <div className="flex items-center gap-2 text-xs text-orange-400 pl-11">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                        </svg>
                        <span>{step.drop_off_rate.toFixed(1)}% drop-off to next step</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>No data available for this funnel yet</p>
              <p className="text-sm mt-2">Start tracking events to see funnel analytics</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Funnel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Funnel</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Funnel Name
                </label>
                <input
                  type="text"
                  value={newFunnel.name}
                  onChange={(e) => setNewFunnel({ ...newFunnel, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., User Signup Flow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newFunnel.description}
                  onChange={(e) => setNewFunnel({ ...newFunnel, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Describe what this funnel tracks"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Funnel Steps
                  </label>
                  <button
                    onClick={addStep}
                    className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 text-sm hover:bg-purple-500/30 transition-colors"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="space-y-3">
                  {newFunnel.steps.map((step, index) => (
                    <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-semibold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={step.name}
                            onChange={(e) => updateStep(index, 'name', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Step name"
                          />
                          <input
                            type="text"
                            value={step.requiredAction}
                            onChange={(e) => updateStep(index, 'requiredAction', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Required action (e.g., page_view, button_click)"
                          />
                        </div>
                        <button
                          onClick={() => removeStep(index)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  {newFunnel.steps.length === 0 && (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      No steps added yet. Click "Add Step" to create funnel steps.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFunnel}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Create Funnel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
