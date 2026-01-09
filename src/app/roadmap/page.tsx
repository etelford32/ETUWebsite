"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { motion } from "framer-motion";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "planned";
  date: string;
  category: "alpha" | "beta" | "launch" | "post-launch";
  features: string[];
}

const roadmapData: RoadmapItem[] = [
  {
    id: "milestone-1",
    title: "MILESTONE 1: The Foundations",
    description: "Polish the core loop until it's addictive. Every battle feels rewarding. Every upgrade matters. Your AI companion actually feels alive.",
    status: "in-progress",
    date: "Q1 2025",
    category: "alpha",
    features: [
      "Ship Designer with website integration",
      "Crafting system for upgrades and new abilities",
      "Cyl dialogue and personality system",
      "Station leveling and experience polish",
      "Enhanced targeting system with evolution mechanics",
      "Energy survival tactics at stations",
      "First 10 Crystal Memories unlocked"
    ]
  },
  {
    id: "milestone-2",
    title: "MILESTONE 2: Rise of the Machines",
    description: "Face the ultimate AI threat. The machines don't just fight—they learn, adapt, and evolve. Every general battle is a puzzle. Every victory reshapes the galaxy.",
    status: "planned",
    date: "Q2 2025",
    category: "beta",
    features: [
      "Central Wormhole Battle - Epic intro with 4 unique bosses",
      "MegaBot & Evil Robot Pressure System",
      "MegaBot Generals with unique strategies",
      "Evil Robot Zone - AI-controlled region",
      "Cinematic Cut Scenes - Hollywood-quality storytelling",
      "Procedural Galaxy Evolution Event Engine",
      "Black Hole gravity affects projectiles",
      "Advanced targeting system with AI reticle"
    ]
  },
  {
    id: "milestone-3",
    title: "MILESTONE 3: Bloom Begins",
    description: "The Mycelari awakening. Nature fights back. Stations bloom with alien life. Your enemies become gardens. Nothing is quite what it seems.",
    status: "planned",
    date: "Q3-Q4 2025",
    category: "launch",
    features: [
      "Mycelari Mind Control Mechanics",
      "Infection Logic - Stations become living ecosystems",
      "Erosion Mechanics - Parasitic armor growth",
      "Mycelari Substrate - New resource system",
      "Unique Mycelari Weapons",
      "Boss: Ursos - The Mycelari Titan",
      "Boss: Arkanvil - Greed incarnate",
      "New Locations: Mycelar Prime, Fungal Biomes"
    ]
  },
  {
    id: "multiplayer-1",
    title: "Multiplayer Expansion",
    description: "Team up with friends or challenge rivals in competitive space combat",
    status: "planned",
    date: "2026",
    category: "post-launch",
    features: [
      "Co-operative Multiplayer",
      "1v1 PvP battles",
      "Asynchronous Multiplayer Influence",
      "Guild/clan systems",
      "Seasonal competitive events"
    ]
  },
  {
    id: "3d-evolution",
    title: "3D Evolution",
    description: "Visual and gameplay overhaul with 3D engine expansion",
    status: "planned",
    date: "2026+",
    category: "post-launch",
    features: [
      "3D Game Engine Expansion",
      "3D Rendering Engine - Visual overhaul",
      "3D Physics Engine - Realistic space combat",
      "3D Coordinate Transformation",
      "Transfer Orbit Simulations",
      "Realistic orbital mechanics"
    ]
  },
  {
    id: "ai-advanced",
    title: "Advanced AI Features",
    description: "Next-generation AI companion with true consciousness",
    status: "planned",
    date: "2026+",
    category: "post-launch",
    features: [
      "Cyl GPT/Claude Integration - True AI conversations",
      "Consciousness System Layers - Deep AI personality",
      "Memory & Perception - AI that remembers",
      "Adaptive learning based on your playstyle",
      "Emotional intelligence and empathy"
    ]
  }
];

const categories = [
  { id: "all", name: "All Milestones", color: "bg-slate-600" },
  { id: "alpha", name: "Q1 2025", color: "bg-cyan-600" },
  { id: "beta", name: "Q2 2025", color: "bg-blue-600" },
  { id: "launch", name: "Q3-Q4 2025", color: "bg-purple-600" },
  { id: "post-launch", name: "2026+", color: "bg-indigo-600" }
];

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  vote_count: number;
  status: string;
  type: string;
  created_at: string;
  user_voted?: boolean;
}

export default function RoadmapPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [featureRequests, setFeatureRequests] = useState<FeedbackItem[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Fetch community feature requests
  useEffect(() => {
    fetchFeatureRequests();
    checkUser();
  }, []);

  async function checkUser() {
    const sessionRes = await fetch("/api/auth/session"); const sessionData = await sessionRes.json(); const session = sessionData.authenticated ? { user: sessionData.user } : null;
    setCurrentUser(session?.user || null);
  }

  async function fetchFeatureRequests() {
    try {
      // Get feature requests
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('type', 'feature')
        .order('vote_count', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Check if user has voted for each
      if (currentUser) {
        const { data: votes } = await supabase
          .from('feedback_votes')
          .select('feedback_id')
          .eq('user_id', currentUser.id);

        const votedIds = new Set(votes?.map((v: any) => v.feedback_id) || []);
        const dataWithVotes = data?.map((item: any) => ({
          ...item,
          user_voted: votedIds.has(item.id)
        })) || [];

        setFeatureRequests(dataWithVotes);
      } else {
        setFeatureRequests(data || []);
      }
    } catch (err) {
      console.error('Error fetching feature requests:', err);
    } finally {
      setLoadingFeatures(false);
    }
  }

  async function toggleVote(feedbackId: string) {
    if (!currentUser) {
      alert('Please sign in to vote on features');
      return;
    }

    try {
      const feature = featureRequests.find(f => f.id === feedbackId);
      const sessionRes = await fetch("/api/auth/session"); const sessionData = await sessionRes.json(); const session = sessionData.authenticated ? { user: sessionData.user } : null;

      if (feature?.user_voted) {
        // Remove vote
        await fetch(`/api/feedback/vote?feedback_id=${feedbackId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });
      } else {
        // Add vote
        await fetch('/api/feedback/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ feedback_id: feedbackId })
        });
      }

      // Refresh feature requests
      await fetchFeatureRequests();
    } catch (err) {
      console.error('Error toggling vote:', err);
    }
  }

  const filteredData = selectedCategory === "all"
    ? roadmapData
    : roadmapData.filter(item => item.category === selectedCategory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in-progress":
        return "bg-blue-500";
      case "planned":
        return "bg-slate-500";
      default:
        return "bg-slate-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✓";
      case "in-progress":
        return "⚡";
      case "planned":
        return "○";
      default:
        return "○";
    }
  };

  return (
    <div className="min-h-screen bg-deep-900">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-transparent"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <span>←</span> Back to Home
          </Link>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            🚀 Explore the Universe 2175 Roadmap
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mb-4">
            <strong>Our Vision:</strong> Build the ultimate space combat experience where every battle tells a story,
            every companion evolves, and every player shapes the galaxy.
          </p>
          <p className="text-lg text-slate-400 max-w-3xl">
            Follow our journey through epic campaigns, evolving AI companions, and expanding universes.
            We're committed to transparency and building together with our community.
          </p>
          <a
            href="/PUBLIC_ROADMAP.md"
            target="_blank"
            className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            📖 View Full Detailed Roadmap
          </a>
        </div>
      </section>

      {/* Current Focus Section */}
      <section className="max-w-6xl mx-auto px-4 mb-12">
        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🎯</span>
            <h2 className="text-3xl font-bold text-cyan-400">Current Focus: Q1 2025 - Core Experience Polish</h2>
          </div>
          <p className="text-slate-300 text-lg mb-6">
            Building the solid gameplay foundation that makes ETU2175 incredible
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🤖</span>
                <h3 className="font-bold text-cyan-400">Cyl AI Companion Evolution</h3>
              </div>
              <p className="text-sm text-slate-400">Your AI companion gets smarter dialogue, energy warnings, and personality</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🚀</span>
                <h3 className="font-bold text-cyan-400">Ship Designer</h3>
              </div>
              <p className="text-sm text-slate-400">Customize your ship with full website → game integration</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⚔️</span>
                <h3 className="font-bold text-cyan-400">Scoring & Damage Logic Polish</h3>
              </div>
              <p className="text-sm text-slate-400">Making combat feel incredible and rewarding</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💎</span>
                <h3 className="font-bold text-cyan-400">First 10 Crystal Memories</h3>
              </div>
              <p className="text-sm text-slate-400">Unlock the story through collectible memories</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="max-w-6xl mx-auto px-4 mb-12">
        <div className="flex flex-wrap gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedCategory === category.id
                  ? `${category.color} text-white scale-105`
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-blue-500 via-purple-500 to-indigo-700"></div>

          {/* Roadmap Items */}
          <div className="space-y-16">
            {filteredData.map((item, index) => (
              <div
                key={item.id}
                className={`relative flex flex-col md:flex-row gap-8 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Timeline Dot */}
                <div className="absolute left-8 md:left-1/2 -ml-3 md:-ml-4 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white font-bold text-sm z-10"
                  style={{ backgroundColor: getStatusColor(item.status).replace('bg-', '#').replace('500', '500') }}
                >
                  <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full ${getStatusColor(item.status)} flex items-center justify-center`}>
                    {getStatusIcon(item.status)}
                  </div>
                </div>

                {/* Content Card */}
                <div className={`flex-1 md:w-1/2 ${index % 2 === 0 ? "md:pr-12" : "md:pl-12"} ml-20 md:ml-0`}>
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getStatusColor(item.status)}`}>
                            {item.status.replace("-", " ").toUpperCase()}
                          </span>
                          <span className="text-slate-400 text-sm">{item.date}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                        <p className="text-slate-300">{item.description}</p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-blue-400 mb-2">Key Features:</h4>
                      <ul className="space-y-1">
                        {item.features.map((feature, idx) => (
                          <li key={idx} className="text-slate-400 text-sm flex items-start gap-2">
                            <span className="text-blue-400 mt-1">▸</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Spacer for alternating layout */}
                <div className="hidden md:block flex-1 md:w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Feature Requests */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            🗳️ Community Feature Requests
          </h2>
          <p className="text-slate-300 text-lg">
            Vote for the features you'd like to see! The most popular requests will be prioritized.
          </p>
        </div>

        {loadingFeatures ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : featureRequests.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
            <p className="text-slate-400">No feature requests yet. Be the first to suggest one!</p>
            <Link
              href="/feedback"
              className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
            >
              Submit Feature Request
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {featureRequests.map((feature) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Vote Button */}
                  <button
                    onClick={() => toggleVote(feature.id)}
                    className={`flex flex-col items-center justify-center min-w-[60px] px-3 py-2 rounded-lg font-bold transition-all ${
                      feature.user_voted
                        ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" transform="rotate(-90 12 12)" />
                    </svg>
                    <span className="text-sm">{feature.vote_count}</span>
                  </button>

                  {/* Feature Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-xl font-bold text-slate-100">{feature.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        feature.status === 'open' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        feature.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        feature.status === 'resolved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`}>
                        {feature.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm mb-3">{feature.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Submitted {new Date(feature.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="text-center pt-6">
              <Link
                href="/feedback"
                className="inline-block px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 rounded-lg font-semibold transition-all"
              >
                View All Feedback & Submit Your Ideas →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Transparency Dashboard */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            📈 Transparency Dashboard
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-cyan-400 font-semibold mb-2">Current Sprint Focus</h3>
              <p className="text-slate-300">Ship Designer + Cyl Dialogue + Combat Polish</p>
            </div>
            <div>
              <h3 className="text-cyan-400 font-semibold mb-2">Team Size</h3>
              <p className="text-slate-300">Indie dev (scaling with success)</p>
            </div>
            <div>
              <h3 className="text-cyan-400 font-semibold mb-2">Update Frequency</h3>
              <p className="text-slate-300">Bi-weekly dev blogs, monthly major updates</p>
            </div>
            <div>
              <h3 className="text-cyan-400 font-semibold mb-2">Community Influence</h3>
              <p className="text-slate-300">High - Your votes shape priorities</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            🗳️ Have Your Say - Shape the Future
          </h2>
          <p className="text-cyan-100 text-lg mb-6">
            This roadmap exists because of <strong>YOU</strong> - our incredible community. Every wishlist,
            every piece of feedback, every vote shapes this journey. Together, we're building something special.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
            >
              ⭐ Wishlist on Steam
            </a>
            <Link
              href="/backlog"
              className="px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg font-bold hover:bg-white/10 transition-all"
            >
              📋 Vote on Features
            </Link>
            <Link
              href="/feedback"
              className="px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg font-bold hover:bg-white/10 transition-all"
            >
              💬 Submit Feedback
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
