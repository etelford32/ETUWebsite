'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import {
  Rocket,
  Target,
  Brain,
  Bug,
  MessageSquare,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  GamepadIcon
} from 'lucide-react'

interface FormData {
  // Profile data
  username: string
  email: string
  discord?: string

  // Alpha testing questions
  interests: string[]
  experience: string
  availability: string
  motivation: string
  balancingInterest: string
  aiDifficultyFeedback: string
  bugTestingExperience: string
}

export default function AlphaTestingPage() {
  const [step, setStep] = useState(1)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    discord: '',
    interests: [],
    experience: 'beginner',
    availability: '',
    motivation: '',
    balancingInterest: '',
    aiDifficultyFeedback: '',
    bugTestingExperience: ''
  })

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      setIsLoggedIn(true)
      setUserEmail(user.email || '')
      setFormData(prev => ({ ...prev, email: user.email || '' }))

      // Try to get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile && typeof profile === 'object') {
        setFormData(prev => ({
          ...prev,
          username: (profile as any).username || '',
          discord: (profile as any).discord || ''
        }))
      }
    }
  }

  const interestOptions = [
    { id: 'balancing', label: 'Game Balancing', icon: Target, description: 'Help fine-tune gameplay mechanics' },
    { id: 'ai-testing', label: 'AI Difficulty', icon: Brain, description: 'Test AI difficulty modes' },
    { id: 'bug-hunting', label: 'Bug Hunting', icon: Bug, description: 'Find and report issues' },
    { id: 'feedback', label: 'General Feedback', icon: MessageSquare, description: 'Share overall thoughts' },
    { id: 'competitive', label: 'Competitive Play', icon: Shield, description: 'Test multiplayer balance' },
    { id: 'content', label: 'Content Testing', icon: Sparkles, description: 'Explore new features' }
  ]

  const toggleInterest = (interestId: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(i => i !== interestId)
        : [...prev.interests, interestId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!isLoggedIn && (!formData.username || !formData.email)) {
      setError('Please fill in your profile information')
      return
    }

    if (formData.interests.length === 0) {
      setError('Please select at least one testing interest')
      return
    }

    if (!formData.motivation || formData.motivation.length < 20) {
      setError('Please tell us why you want to join (minimum 20 characters)')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Submit the application
      const response = await fetch('/api/alpha-testing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application')
      }

      setSuccess('Application submitted successfully! We\'ll be in touch soon.')
      setSubmitted(true)

      // Reset form
      setTimeout(() => {
        setFormData({
          username: userEmail ? formData.username : '',
          email: userEmail || '',
          discord: '',
          interests: [],
          experience: 'beginner',
          availability: '',
          motivation: '',
          balancingInterest: '',
          aiDifficultyFeedback: '',
          bugTestingExperience: ''
        })
        setStep(1)
        setSubmitted(false)
        setSuccess('')
      }, 5000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step === 1 && !isLoggedIn) {
      if (!formData.username || !formData.email) {
        setError('Please fill in your profile information')
        return
      }
      // Basic email validation
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        setError('Please enter a valid email address')
        return
      }
    }
    setError('')
    setStep(prev => Math.min(prev + 1, 3))
  }

  const prevStep = () => {
    setError('')
    setStep(prev => Math.max(prev - 1, 1))
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 etu-starfield opacity-50"></div>

      {/* Hero Video/Image Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950 z-10"></div>
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-30"
        >
          <source src="/ETU_Cinematic_Trailer_4K.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Glowing Orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-3xl"></div>

      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 py-20">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-4"
          >
            <div className="px-6 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-cyan-300 font-semibold text-sm tracking-wider">APPLICATIONS OPEN</span>
                <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
              </div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(6,182,212,0.5)]"
          >
            Closed Alpha Playtesting
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed"
          >
            Join an elite group of explorers to shape the future of{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-semibold">
              Explore the Universe 2175
            </span>
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-8 mt-12"
          >
            {[
              { icon: GamepadIcon, label: 'Early Access', value: 'Q1 2026' },
              { icon: Target, label: 'Focus Areas', value: '3 Core' },
              { icon: Shield, label: 'Limited Slots', value: 'Apply Now' }
            ].map((stat, index) => (
              <div key={index} className="flex items-center gap-3 px-6 py-3 rounded-lg bg-slate-900/50 backdrop-blur-sm border border-slate-700/50">
                <stat.icon className="w-5 h-5 text-cyan-400" />
                <div className="text-left">
                  <div className="text-xs text-slate-400">{stat.label}</div>
                  <div className="text-sm font-semibold text-white">{stat.value}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Main Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl shadow-cyan-500/10 overflow-hidden">
            {/* Progress Bar */}
            <div className="relative h-2 bg-slate-800">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                initial={{ width: '0%' }}
                animate={{ width: `${(step / 3) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-slate-700/50">
              {[
                { num: 1, label: 'Profile', icon: Shield },
                { num: 2, label: 'Interests', icon: Target },
                { num: 3, label: 'Application', icon: Rocket }
              ].map((s) => (
                <div key={s.num} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    step >= s.num
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 border-cyan-400 shadow-lg shadow-cyan-500/50'
                      : 'bg-slate-800 border-slate-600'
                  }`}>
                    {step > s.num ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <s.icon className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <span className={`hidden md:block font-medium ${
                    step >= s.num ? 'text-white' : 'text-slate-500'
                  }`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-8">
              <AnimatePresence mode="wait">
                {/* Step 1: Profile */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-2xl font-bold mb-2 text-white">Create Your Profile</h2>
                      <p className="text-slate-400">
                        {isLoggedIn
                          ? 'Your account information has been loaded. You can update it below.'
                          : 'Tell us about yourself to get started with your alpha testing application.'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Username <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-white placeholder-slate-500 transition-all"
                        placeholder="YourGamertag"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-white placeholder-slate-500 transition-all"
                        placeholder="your.email@example.com"
                        required
                        disabled={isLoggedIn}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Discord Username <span className="text-slate-500">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.discord}
                        onChange={(e) => setFormData(prev => ({ ...prev, discord: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-white placeholder-slate-500 transition-all"
                        placeholder="username#1234"
                      />
                      <p className="mt-2 text-xs text-slate-400">
                        Join our official{' '}
                        <a
                          href="https://discord.com/api/webhooks/1458859257553227901/Y2l5AfqWwkVSkQXblX2_z-b481UDPc62g-Tv4JjrvYsvHZ_MijZY_2uHPc5vgdbSOffL"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 underline font-semibold"
                        >
                          Explore the Universe 2175 Discord
                        </a>
                        {' '}to connect with the community and get alpha testing updates!
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Interests */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-2xl font-bold mb-2 text-white">What Interests You?</h2>
                      <p className="text-slate-400">
                        Select all the areas you'd like to focus on during alpha testing
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {interestOptions.map((option) => {
                        const Icon = option.icon
                        const isSelected = formData.interests.includes(option.id)

                        return (
                          <motion.button
                            key={option.id}
                            type="button"
                            onClick={() => toggleInterest(option.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                              isSelected
                                ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500 shadow-lg shadow-cyan-500/20'
                                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className={`p-3 rounded-lg ${
                                isSelected ? 'bg-cyan-500/20' : 'bg-slate-700/50'
                              }`}>
                                <Icon className={`w-6 h-6 ${
                                  isSelected ? 'text-cyan-400' : 'text-slate-400'
                                }`} />
                              </div>

                              <div className="flex-1">
                                <h3 className={`font-semibold mb-1 ${
                                  isSelected ? 'text-white' : 'text-slate-300'
                                }`}>
                                  {option.label}
                                </h3>
                                <p className="text-sm text-slate-400">{option.description}</p>
                              </div>

                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute top-4 right-4"
                                >
                                  <CheckCircle2 className="w-6 h-6 text-cyan-400" />
                                </motion.div>
                              )}
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Gaming Experience Level
                      </label>
                      <select
                        value={formData.experience}
                        onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-white"
                      >
                        <option value="beginner">Casual Gamer</option>
                        <option value="intermediate">Experienced Gamer</option>
                        <option value="advanced">Hardcore Gamer</option>
                        <option value="competitive">Competitive/Pro Player</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Application */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-2xl font-bold mb-2 text-white">Tell Us More</h2>
                      <p className="text-slate-400">
                        Help us understand your interest in alpha testing
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Why do you want to join the alpha? <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={formData.motivation}
                        onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-white placeholder-slate-500 transition-all resize-none"
                        rows={4}
                        placeholder="Share your enthusiasm and what you hope to contribute..."
                        required
                      />
                      <div className="flex justify-between mt-1">
                        <p className="text-xs text-slate-500">Minimum 20 characters</p>
                        <p className={`text-xs ${formData.motivation.length >= 20 ? 'text-green-400' : 'text-slate-500'}`}>
                          {formData.motivation.length} characters
                        </p>
                      </div>
                    </div>

                    {formData.interests.includes('balancing') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          What aspects of game balancing interest you most?
                        </label>
                        <textarea
                          value={formData.balancingInterest}
                          onChange={(e) => setFormData(prev => ({ ...prev, balancingInterest: e.target.value }))}
                          className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-white placeholder-slate-500 transition-all resize-none"
                          rows={3}
                          placeholder="E.g., weapon balance, faction balance, economy tuning..."
                        />
                      </div>
                    )}

                    {formData.interests.includes('ai-testing') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          What would you focus on when testing AI difficulty modes?
                        </label>
                        <textarea
                          value={formData.aiDifficultyFeedback}
                          onChange={(e) => setFormData(prev => ({ ...prev, aiDifficultyFeedback: e.target.value }))}
                          className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-white placeholder-slate-500 transition-all resize-none"
                          rows={3}
                          placeholder="E.g., AI decision-making, difficulty curve, behavior patterns..."
                        />
                      </div>
                    )}

                    {formData.interests.includes('bug-hunting') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Do you have experience with bug testing or QA?
                        </label>
                        <textarea
                          value={formData.bugTestingExperience}
                          onChange={(e) => setFormData(prev => ({ ...prev, bugTestingExperience: e.target.value }))}
                          className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-white placeholder-slate-500 transition-all resize-none"
                          rows={3}
                          placeholder="Share any testing experience or methodologies you're familiar with..."
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Weekly Availability <span className="text-slate-500">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.availability}
                        onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg bg-slate-800/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-white placeholder-slate-500 transition-all"
                        placeholder="E.g., 5-10 hours per week, weekends only, etc."
                      />
                    </div>

                    {/* Important Note */}
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <div className="flex gap-3">
                        <MessageSquare className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-slate-300">
                          <p className="font-semibold text-white mb-1">Bug Reporting</p>
                          <p>
                            If you find bugs during testing, please submit them through our{' '}
                            <a href="/feedback" className="text-cyan-400 hover:text-cyan-300 underline">
                              feedback section
                            </a>
                            . You'll need to create an account if you haven't already.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error/Success Messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400"
                  >
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={step === 1}
                  className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white font-medium"
                >
                  Previous
                </button>

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all text-white font-semibold flex items-center gap-2 shadow-lg shadow-cyan-500/30"
                  >
                    Next Step
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || submitted}
                    className="px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed transition-all text-white font-semibold flex items-center gap-2 shadow-lg shadow-cyan-500/30"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : submitted ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Submitted!
                      </>
                    ) : (
                      <>
                        Submit Application
                        <Rocket className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </motion.div>

        {/* Additional Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            {
              icon: Target,
              title: 'Balance Testing',
              description: 'Help us fine-tune gameplay mechanics and ensure fair competitive play'
            },
            {
              icon: Brain,
              title: 'AI Difficulty',
              description: 'Test our adaptive AI systems and provide feedback on difficulty curves'
            },
            {
              icon: Bug,
              title: 'Bug Reporting',
              description: 'Find issues and help us deliver a polished experience at launch'
            }
          ].map((item, index) => {
            const Icon = item.icon
            return (
              <div
                key={index}
                className="p-6 rounded-xl bg-slate-900/40 backdrop-blur-sm border border-slate-700/30 hover:border-cyan-500/50 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.description}</p>
              </div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
