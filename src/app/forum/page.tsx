"use client";

import Link from "next/link";
import { useState } from "react";

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  threads: number;
  posts: number;
  color: string;
}

interface RecentThread {
  id: string;
  title: string;
  author: string;
  category: string;
  replies: number;
  views: number;
  lastActivity: string;
  isHot: boolean;
}

export default function ForumPage() {
  const categories: ForumCategory[] = [
    {
      id: "general",
      name: "General Discussion",
      description: "Talk about anything related to ETU 2175",
      icon: "💬",
      threads: 1247,
      posts: 8934,
      color: "cyan",
    },
    {
      id: "gameplay",
      name: "Gameplay & Mechanics",
      description: "Discuss game mechanics, strategies, and tips",
      icon: "🎮",
      threads: 892,
      posts: 5621,
      color: "blue",
    },
    {
      id: "factions",
      name: "Faction Discussions",
      description: "Faction strategies, lore, and recruitment",
      icon: "⚔️",
      threads: 456,
      posts: 3289,
      color: "indigo",
    },
    {
      id: "ship-builds",
      name: "Ship Builds & Loadouts",
      description: "Share and discuss ship designs and configurations",
      icon: "🚀",
      threads: 678,
      posts: 4521,
      color: "purple",
    },
    {
      id: "lfg",
      name: "Looking for Group",
      description: "Find teammates and organize gaming sessions",
      icon: "👥",
      threads: 2134,
      posts: 6789,
      color: "pink",
    },
    {
      id: "bug-reports",
      name: "Bug Reports & Technical Issues",
      description: "Report bugs and get technical support",
      icon: "🐛",
      threads: 234,
      posts: 1567,
      color: "red",
    },
    {
      id: "suggestions",
      name: "Suggestions & Feedback",
      description: "Share your ideas for improving the game",
      icon: "💡",
      threads: 567,
      posts: 2890,
      color: "yellow",
    },
    {
      id: "creative",
      name: "Creative Corner",
      description: "Share fan art, stories, and creative content",
      icon: "🎨",
      threads: 345,
      posts: 1234,
      color: "green",
    },
  ];

  const recentThreads: RecentThread[] = [
    {
      id: "1",
      title: "Best loadout for taking down the Megabot?",
      author: "SpaceAce_42",
      category: "Gameplay & Mechanics",
      replies: 34,
      views: 892,
      lastActivity: "5 minutes ago",
      isHot: true,
    },
    {
      id: "2",
      title: "LFG: Level 45+ players for faction raid tonight",
      author: "CommanderZero",
      category: "Looking for Group",
      replies: 12,
      views: 234,
      lastActivity: "15 minutes ago",
      isHot: false,
    },
    {
      id: "3",
      title: "My new stealth build - decimating enemies!",
      author: "ShadowPilot",
      category: "Ship Builds & Loadouts",
      replies: 56,
      views: 1523,
      lastActivity: "1 hour ago",
      isHot: true,
    },
    {
      id: "4",
      title: "Lore deep dive: The origins of the Void Syndicate",
      author: "LoreKeeper",
      category: "Faction Discussions",
      replies: 78,
      views: 2145,
      lastActivity: "2 hours ago",
      isHot: true,
    },
    {
      id: "5",
      title: "Game crashes when entering certain sectors",
      author: "TechSupport_Needed",
      category: "Bug Reports & Technical Issues",
      replies: 9,
      views: 156,
      lastActivity: "3 hours ago",
      isHot: false,
    },
  ];

  const [searchQuery, setSearchQuery] = useState("");

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: { bg: string; border: string; text: string } } = {
      cyan: { bg: "from-cyan-500/10 to-cyan-600/10", border: "border-cyan-500/20", text: "text-cyan-400" },
      blue: { bg: "from-blue-500/10 to-blue-600/10", border: "border-blue-500/20", text: "text-blue-400" },
      indigo: { bg: "from-indigo-500/10 to-indigo-600/10", border: "border-indigo-500/20", text: "text-indigo-400" },
      purple: { bg: "from-purple-500/10 to-purple-600/10", border: "border-purple-500/20", text: "text-purple-400" },
      pink: { bg: "from-pink-500/10 to-pink-600/10", border: "border-pink-500/20", text: "text-pink-400" },
      red: { bg: "from-red-500/10 to-red-600/10", border: "border-red-500/20", text: "text-red-400" },
      yellow: { bg: "from-yellow-500/10 to-yellow-600/10", border: "border-yellow-500/20", text: "text-yellow-400" },
      green: { bg: "from-green-500/10 to-green-600/10", border: "border-green-500/20", text: "text-green-400" },
    };
    return colors[color] || colors.cyan;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-blue-950/20 to-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Community Forum
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
            Connect with fellow explorers, share strategies, find teammates, and
            shape the future of ETU 2175.
          </p>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search discussions..."
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-6 py-4 pl-12 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
              <svg
                className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 rounded-xl p-6 mb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📢</span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">
                  Welcome to the ETU 2175 Forums!
                </h3>
                <p className="text-slate-400 text-sm">
                  Please read our community guidelines before posting
                </p>
              </div>
            </div>
            <button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all whitespace-nowrap">
              Create New Thread
            </button>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Categories</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {categories.map((category) => {
              const colors = getColorClasses(category.color);
              return (
                <div
                  key={category.id}
                  className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-6 hover:scale-105 transition-transform cursor-pointer group`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 bg-${category.color}-500/20 rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}>
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-white font-semibold text-lg mb-1 group-hover:${colors.text} transition-colors`}>
                        {category.name}
                      </h3>
                      <p className="text-slate-400 text-sm mb-3">
                        {category.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{category.threads.toLocaleString()} threads</span>
                        <span>•</span>
                        <span>{category.posts.toLocaleString()} posts</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-6">
            Recent Discussions
          </h2>
          <div className="bg-gradient-to-br from-slate-900/50 to-blue-900/20 border border-slate-700/50 rounded-xl overflow-hidden">
            {recentThreads.map((thread, index) => (
              <div
                key={thread.id}
                className={`p-6 hover:bg-slate-800/50 transition-colors cursor-pointer ${
                  index !== recentThreads.length - 1
                    ? "border-b border-slate-700/50"
                    : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {thread.isHot && (
                        <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded font-semibold">
                          🔥 HOT
                        </span>
                      )}
                      <h3 className="text-white font-semibold text-lg hover:text-cyan-400 transition-colors">
                        {thread.title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                      <span>by {thread.author}</span>
                      <span>•</span>
                      <span className="text-cyan-400">{thread.category}</span>
                      <span>•</span>
                      <span>{thread.replies} replies</span>
                      <span>•</span>
                      <span>{thread.views} views</span>
                      <span>•</span>
                      <span className="text-slate-500">
                        {thread.lastActivity}
                      </span>
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-slate-600 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-8 text-center">
          <h3 className="text-white font-semibold text-xl mb-3">
            Join the Conversation
          </h3>
          <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
            Create an account to participate in discussions, vote on threads,
            and connect with the community.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/login"
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              Sign Up
            </Link>
            <Link
              href="/login"
              className="bg-slate-800/50 border border-slate-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-slate-700/50 transition-all"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
