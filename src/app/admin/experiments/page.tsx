'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { createExperiment, startExperiment, stopExperiment, ABExperiment, ABVariant } from '@/lib/abTesting'
import { isStaff } from '@/lib/adminAuth'
import { useRouter } from 'next/navigation'

interface ExperimentResult {
  variant_id: string
  variant_name: string
  assignments: number
  conversions: number
  conversion_rate: number
  revenue: number
  avg_value: number
}

interface ExperimentStats {
  experiment_id: string
  p_value: number
  confidence_level: number
  winner_variant_id: string | null
  is_significant: boolean
  sample_size: number
}

export default function ExperimentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [experiments, setExperiments] = useState<ABExperiment[]>([])
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null)
  const [experimentResults, setExperimentResults] = useState<ExperimentResult[]>([])
  const [experimentStats, setExperimentStats] = useState<ExperimentStats | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newExperiment, setNewExperiment] = useState({
    name: '',
    description: '',
    hypothesis: '',
    primaryMetric: 'conversion',
    variants: [
      { id: 'control', name: 'Control', traffic: 50 },
      { id: 'variant_a', name: 'Variant A', traffic: 50 }
    ] as Array<{ id: string; name: string; traffic: number }>
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (authorized) {
      loadExperiments()
    }
  }, [authorized])

  useEffect(() => {
    if (selectedExperiment) {
      loadExperimentResults(selectedExperiment)
    }
  }, [selectedExperiment])

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

  async function loadExperiments() {
    try {
      const { data, error } = await supabase
        .from('ab_experiments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setExperiments(data || [])
      if (data && data.length > 0 && !selectedExperiment) {
        setSelectedExperiment(data[0].id)
      }
    } catch (error) {
      console.error('Error loading experiments:', error)
    }
  }

  async function loadExperimentResults(experimentId: string) {
    try {
      // Load results
      const { data: results, error: resultsError } = await supabase
        .from('ab_results')
        .select('*')
        .eq('experiment_id', experimentId)

      if (resultsError) throw resultsError
      setExperimentResults(results || [])

      // Load stats
      const { data: stats, error: statsError } = await supabase
        .from('ab_statistical_analysis')
        .select('*')
        .eq('experiment_id', experimentId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single()

      if (statsError && statsError.code !== 'PGRST116') throw statsError
      setExperimentStats(stats || null)
    } catch (error) {
      console.error('Error loading experiment results:', error)
    }
  }

  async function handleCreateExperiment() {
    if (!newExperiment.name || newExperiment.variants.length < 2) {
      alert('Please provide experiment name and at least 2 variants')
      return
    }

    const totalTraffic = newExperiment.variants.reduce((sum, v) => sum + v.traffic, 0)
    if (Math.abs(totalTraffic - 100) > 0.01) {
      alert('Variant traffic must sum to 100%')
      return
    }

    const variants: ABVariant[] = newExperiment.variants.map(v => ({
      id: v.id,
      name: v.name
    }))

    const traffic: Record<string, number> = {}
    newExperiment.variants.forEach(v => {
      traffic[v.id] = v.traffic
    })

    const experimentId = await createExperiment(
      newExperiment.name,
      newExperiment.description,
      newExperiment.hypothesis,
      variants,
      traffic,
      newExperiment.primaryMetric
    )

    if (experimentId) {
      setShowCreateModal(false)
      setNewExperiment({
        name: '',
        description: '',
        hypothesis: '',
        primaryMetric: 'conversion',
        variants: [
          { id: 'control', name: 'Control', traffic: 50 },
          { id: 'variant_a', name: 'Variant A', traffic: 50 }
        ]
      })
      loadExperiments()
    }
  }

  async function handleStartExperiment(experimentId: string) {
    await startExperiment(experimentId)
    loadExperiments()
  }

  async function handleStopExperiment(experimentId: string) {
    await stopExperiment(experimentId)
    loadExperiments()
  }

  function addVariant() {
    const nextLetter = String.fromCharCode(65 + newExperiment.variants.length - 1)
    const currentTraffic = newExperiment.variants.reduce((sum, v) => sum + v.traffic, 0)
    const remainingTraffic = Math.max(0, 100 - currentTraffic)

    setNewExperiment({
      ...newExperiment,
      variants: [
        ...newExperiment.variants,
        {
          id: `variant_${nextLetter.toLowerCase()}`,
          name: `Variant ${nextLetter}`,
          traffic: Math.min(remainingTraffic, 20)
        }
      ]
    })
  }

  function updateVariant(index: number, field: string, value: string | number) {
    const updatedVariants = [...newExperiment.variants]
    updatedVariants[index] = { ...updatedVariants[index], [field]: value }
    setNewExperiment({ ...newExperiment, variants: updatedVariants })
  }

  function removeVariant(index: number) {
    if (newExperiment.variants.length <= 2) {
      alert('You must have at least 2 variants')
      return
    }
    const updatedVariants = newExperiment.variants.filter((_, i) => i !== index)
    setNewExperiment({ ...newExperiment, variants: updatedVariants })
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

  const selectedExperimentData = experiments.find(e => e.id === selectedExperiment)
  const totalTraffic = newExperiment.variants.reduce((sum, v) => sum + v.traffic, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">A/B Experiments</h1>
            <p className="text-gray-400">Test and optimize user experiences</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            Create Experiment
          </button>
        </div>

        {/* Experiments List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {experiments.map(experiment => (
            <div
              key={experiment.id}
              onClick={() => setSelectedExperiment(experiment.id)}
              className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border cursor-pointer transition-all ${
                selectedExperiment === experiment.id
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">{experiment.name}</h3>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  experiment.status === 'running'
                    ? 'bg-green-500/20 text-green-300'
                    : experiment.status === 'completed'
                    ? 'bg-blue-500/20 text-blue-300'
                    : experiment.status === 'paused'
                    ? 'bg-yellow-500/20 text-yellow-300'
                    : 'bg-gray-500/20 text-gray-300'
                }`}>
                  {experiment.status}
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                {experiment.description}
              </p>
              <div className="text-xs text-gray-500">
                {(experiment.variants as ABVariant[]).length} variants • {experiment.primary_metric}
              </div>
            </div>
          ))}

          {experiments.length === 0 && (
            <div className="col-span-3 bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/10 text-center">
              <p className="text-gray-400 mb-4">No experiments created yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-colors"
              >
                Create Your First Experiment
              </button>
            </div>
          )}
        </div>

        {/* Experiment Details */}
        {selectedExperimentData && (
          <div className="space-y-6">
            {/* Experiment Info */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {selectedExperimentData.name}
                  </h2>
                  <p className="text-gray-400 mb-4">{selectedExperimentData.description}</p>
                  {selectedExperimentData.hypothesis && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="text-blue-300 text-sm font-medium mb-1">Hypothesis</div>
                      <p className="text-gray-300 text-sm">{selectedExperimentData.hypothesis}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  {selectedExperimentData.status === 'draft' && (
                    <button
                      onClick={() => handleStartExperiment(selectedExperimentData.id)}
                      className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 hover:bg-green-500/30 transition-colors"
                    >
                      Start
                    </button>
                  )}
                  {selectedExperimentData.status === 'running' && (
                    <button
                      onClick={() => handleStopExperiment(selectedExperimentData.id)}
                      className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Status</div>
                  <div className="text-white font-semibold capitalize">
                    {selectedExperimentData.status}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">Primary Metric</div>
                  <div className="text-white font-semibold capitalize">
                    {selectedExperimentData.primary_metric}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">Confidence Level</div>
                  <div className="text-white font-semibold">
                    {selectedExperimentData.confidence_level}%
                  </div>
                </div>
              </div>
            </div>

            {/* Statistical Significance */}
            {experimentStats && (
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20">
                <h3 className="text-xl font-bold text-white mb-4">Statistical Analysis</h3>
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <div className="text-purple-300 text-sm mb-1">Sample Size</div>
                    <div className="text-2xl font-bold text-white">
                      {experimentStats.sample_size.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-sm mb-1">P-Value</div>
                    <div className="text-2xl font-bold text-white">
                      {experimentStats.p_value.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-sm mb-1">Confidence</div>
                    <div className="text-2xl font-bold text-white">
                      {experimentStats.confidence_level.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-sm mb-1">Significant?</div>
                    <div className={`text-2xl font-bold ${
                      experimentStats.is_significant ? 'text-green-400' : 'text-orange-400'
                    }`}>
                      {experimentStats.is_significant ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>
                {experimentStats.winner_variant_id && (
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="text-green-300 text-sm font-medium">
                      Winner: {experimentResults.find(r => r.variant_id === experimentStats.winner_variant_id)?.variant_name}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Variant Results */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-6">Variant Performance</h3>

              {experimentResults.length > 0 ? (
                <div className="space-y-4">
                  {experimentResults.map((result, index) => {
                    const isWinner = result.variant_id === experimentStats?.winner_variant_id
                    const maxConversion = Math.max(...experimentResults.map(r => r.conversion_rate))
                    const width = (result.conversion_rate / maxConversion) * 100

                    return (
                      <div
                        key={result.variant_id}
                        className={`bg-white/5 rounded-xl p-4 border ${
                          isWinner ? 'border-green-500/50' : 'border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              index === 0 ? 'bg-blue-500' : 'bg-purple-500'
                            }`} />
                            <span className="text-white font-semibold">{result.variant_name}</span>
                            {isWinner && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">
                                Winner
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-gray-400">
                              {result.assignments.toLocaleString()} users
                            </div>
                            <div className="text-green-400">
                              {result.conversions.toLocaleString()} conversions
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <div className="text-gray-400 text-xs mb-1">Conversion Rate</div>
                            <div className="text-white font-semibold">
                              {result.conversion_rate.toFixed(2)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs mb-1">Revenue</div>
                            <div className="text-white font-semibold">
                              ${result.revenue.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs mb-1">Avg Value</div>
                            <div className="text-white font-semibold">
                              ${result.avg_value.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Performance bar */}
                        <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                              index === 0 ? 'bg-blue-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No results available yet</p>
                  <p className="text-sm mt-2">
                    {selectedExperimentData.status === 'draft'
                      ? 'Start the experiment to begin collecting data'
                      : 'Waiting for user interactions...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Experiment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Create A/B Experiment</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Experiment Name
                </label>
                <input
                  type="text"
                  value={newExperiment.name}
                  onChange={(e) => setNewExperiment({ ...newExperiment, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Homepage CTA Button Test"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newExperiment.description}
                  onChange={(e) => setNewExperiment({ ...newExperiment, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  placeholder="What are you testing?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hypothesis
                </label>
                <textarea
                  value={newExperiment.hypothesis}
                  onChange={(e) => setNewExperiment({ ...newExperiment, hypothesis: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  placeholder="If we change X, then Y will happen because Z..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Primary Metric
                </label>
                <select
                  value={newExperiment.primaryMetric}
                  onChange={(e) => setNewExperiment({ ...newExperiment, primaryMetric: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="conversion" className="bg-gray-900">Conversion Rate</option>
                  <option value="revenue" className="bg-gray-900">Revenue</option>
                  <option value="engagement" className="bg-gray-900">Engagement</option>
                  <option value="retention" className="bg-gray-900">Retention</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Variants ({totalTraffic.toFixed(0)}% allocated)
                  </label>
                  <button
                    onClick={addVariant}
                    className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 text-sm hover:bg-purple-500/30 transition-colors"
                  >
                    + Add Variant
                  </button>
                </div>

                <div className="space-y-3">
                  {newExperiment.variants.map((variant, index) => (
                    <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          index === 0 ? 'bg-blue-500' : 'bg-purple-500'
                        }`} />
                        <input
                          type="text"
                          value={variant.id}
                          onChange={(e) => updateVariant(index, 'id', e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Variant ID"
                        />
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) => updateVariant(index, 'name', e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Variant Name"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={variant.traffic}
                            onChange={(e) => updateVariant(index, 'traffic', Number(e.target.value))}
                            className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            min="0"
                            max="100"
                          />
                          <span className="text-gray-400 text-sm">%</span>
                        </div>
                        {newExperiment.variants.length > 2 && (
                          <button
                            onClick={() => removeVariant(index)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {Math.abs(totalTraffic - 100) > 0.01 && (
                  <div className="mt-2 text-orange-400 text-sm">
                    ⚠️ Traffic allocation must sum to 100% (currently {totalTraffic.toFixed(1)}%)
                  </div>
                )}
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
                onClick={handleCreateExperiment}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                Create Experiment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
