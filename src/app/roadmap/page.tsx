"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
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
    id: "alpha-1",
    title: "Alpha v0.1 - Core Engine",
    description: "Foundation of the game engine with basic physics and controls",
    status: "completed",
    date: "Q2 2024",
    category: "alpha",
    features: [
      "Realistic Newtonian physics engine",
      "Basic ship controls and movement",
      "Space environment rendering",
      "Collision detection system"
    ]
  },
  {
    id: "alpha-2",
    title: "Alpha v0.2 - AI Systems",
    description: "Implementation of adaptive AI and faction mechanics",
    status: "completed",
    date: "Q3 2024",
    category: "alpha",
    features: [
      "Learning AI boss - Megabot",
      "Faction relationship system",
      "Basic combat mechanics",
      "Enemy behavior patterns"
    ]
  },
  {
    id: "alpha-3",
    title: "Alpha v0.3 - Universe Building",
    description: "Expanded universe with multiple systems and planets",
    status: "completed",
    date: "Q4 2024",
    category: "alpha",
    features: [
      "Procedural star system generation",
      "Planet surfaces and landing",
      "Resource gathering mechanics",
      "Trading system foundation"
    ]
  },
  {
    id: "beta-1",
    title: "Beta v1.0 - Demo Release",
    description: "Public demo showcasing core gameplay loop",
    status: "in-progress",
    date: "Dec 31, 2024",
    category: "beta",
    features: [
      "Polished tutorial experience",
      "3-4 hour gameplay demo",
      "Steam integration",
      "Global leaderboards",
      "Performance optimizations"
    ]
  },
  {
    id: "beta-2",
    title: "Beta v1.5 - Community Feedback",
    description: "Refinements based on player feedback",
    status: "planned",
    date: "Q1 2025",
    category: "beta",
    features: [
      "Balance adjustments",
      "Bug fixes and stability",
      "UI/UX improvements",
      "Additional ship customization",
      "Enhanced visual effects"
    ]
  },
  {
    id: "launch-1",
    title: "Full Release v2.0",
    description: "Complete game launch with all features",
    status: "planned",
    date: "Q2 2025",
    category: "launch",
    features: [
      "Complete story campaign",
      "All factions and systems unlocked",
      "Multiplayer co-op mode",
      "Ship designer & customization",
      "Achievement system",
      "Full mod support"
    ]
  },
  {
    id: "post-1",
    title: "Expansion: Deep Space",
    description: "Major content expansion with new regions",
    status: "planned",
    date: "Q3 2025",
    category: "post-launch",
    features: [
      "New galaxy regions to explore",
      "Advanced ship types",
      "Extended storylines",
      "Legendary boss encounters",
      "Community events"
    ]
  },
  {
    id: "post-2",
    title: "Expansion: Faction Wars",
    description: "PvP and large-scale faction conflicts",
    status: "planned",
    date: "Q4 2025",
    category: "post-launch",
    features: [
      "Faction vs faction battles",
      "Territory control system",
      "PvP arenas and ranked play",
      "Guild/clan systems",
      "Seasonal content"
    ]
  }
];

const categories = [
  { id: "all", name: "All", color: "bg-slate-600" },
  { id: "alpha", name: "Alpha", color: "bg-purple-600" },
  { id: "beta", name: "Beta", color: "bg-blue-600" },
  { id: "launch", name: "Launch", color: "bg-green-600" },
  { id: "post-launch", name: "Post-Launch", color: "bg-orange-600" }
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
    const { data: { session } } = await supabase.auth.getSession();
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
      const { data: { session } } = await supabase.auth.getSession();

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
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Development Roadmap
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl">
            Follow our journey from alpha to full release and beyond. We're committed to transparency
            and building the best space RPG experience possible.
          </p>
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
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-slate-700"></div>

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

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Want to Shape the Future?
          </h2>
          <p className="text-blue-100 text-lg mb-6">
            Join our community and help us build the ultimate space RPG. Your feedback matters!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-all"
            >
              Wishlist on Steam
            </a>
            <Link
              href="/faq"
              className="px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg font-bold hover:bg-white/10 transition-all"
            >
              Read FAQ
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
