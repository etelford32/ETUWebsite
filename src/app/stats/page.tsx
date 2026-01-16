"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StatCard {
  label: string;
  value: string;
  change: string;
  icon: string;
  color: string;
}

export default function StatsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking authentication
    setTimeout(() => {
      setLoading(false);
      // In a real app, check actual auth state
      setIsLoggedIn(false);
    }, 500);
  }, []);

  const globalStats: StatCard[] = [
    {
      label: "Total Players",
      value: "127,456",
      change: "+2,340 this week",
      icon: "👥",
      color: "cyan",
    },
    {
      label: "Ships Destroyed",
      value: "5.2M",
      change: "+45.3K today",
      icon: "💥",
      color: "red",
    },
    {
      label: "Systems Explored",
      value: "892",
      change: "12 new systems",
      icon: "🌌",
      color: "purple",
    },
    {
      label: "Active Factions",
      value: "7",
      change: "Void Syndicate leading",
      icon: "⚔️",
      color: "yellow",
    },
  ];

  const playerStats: StatCard[] = [
    {
      label: "Total Playtime",
      value: "47h 32m",
      change: "+3h 15m this week",
      icon: "⏱️",
      color: "blue",
    },
    {
      label: "Ships Destroyed",
      value: "234",
      change: "+12 today",
      icon: "🎯",
      color: "green",
    },
    {
      label: "Credits Earned",
      value: "1,456,789",
      change: "+45,678 this week",
      icon: "💰",
      color: "yellow",
    },
    {
      label: "Rank",
      value: "#1,247",
      change: "↑ 23 positions",
      icon: "🏆",
      color: "orange",
    },
    {
      label: "Systems Visited",
      value: "42",
      change: "+3 this week",
      icon: "🗺️",
      color: "indigo",
    },
    {
      label: "Missions Completed",
      value: "89",
      change: "+7 this week",
      icon: "✅",
      color: "green",
    },
    {
      label: "Deaths",
      value: "12",
      change: "K/D: 19.5",
      icon: "💀",
      color: "red",
    },
    {
      label: "Rare Items Found",
      value: "17",
      change: "3 legendary",
      icon: "⭐",
      color: "purple",
    },
  ];

  const achievements = [
    { name: "First Blood", description: "Destroy your first enemy ship", unlocked: true },
    { name: "Explorer", description: "Visit 10 different star systems", unlocked: true },
    { name: "Megabot Hunter", description: "Defeat the Megabot", unlocked: false },
    { name: "Faction Leader", description: "Reach rank 10 in any faction", unlocked: false },
  ];

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: { bg: string; border: string; text: string } } = {
      cyan: { bg: "from-cyan-500/10 to-cyan-600/10", border: "border-cyan-500/20", text: "text-cyan-400" },
      blue: { bg: "from-blue-500/10 to-blue-600/10", border: "border-blue-500/20", text: "text-blue-400" },
      indigo: { bg: "from-indigo-500/10 to-indigo-600/10", border: "border-indigo-500/20", text: "text-indigo-400" },
      purple: { bg: "from-purple-500/10 to-purple-600/10", border: "border-purple-500/20", text: "text-purple-400" },
      red: { bg: "from-red-500/10 to-red-600/10", border: "border-red-500/20", text: "text-red-400" },
      yellow: { bg: "from-yellow-500/10 to-yellow-600/10", border: "border-yellow-500/20", text: "text-yellow-400" },
      green: { bg: "from-green-500/10 to-green-600/10", border: "border-green-500/20", text: "text-green-400" },
      orange: { bg: "from-orange-500/10 to-orange-600/10", border: "border-orange-500/20", text: "text-orange-400" },
    };
    return colors[color] || colors.cyan;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-950 via-blue-950/20 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading statistics...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-blue-950/20 to-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Player Statistics
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Track your progress, compare with other explorers, and see how the
            universe is evolving.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Global Stats</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {globalStats.map((stat, index) => {
              const colors = getColorClasses(stat.color);
              return (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-6`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-3xl">{stat.icon}</div>
                  </div>
                  <div className={`text-3xl font-bold ${colors.text} mb-1`}>
                    {stat.value}
                  </div>
                  <div className="text-white font-medium mb-1">{stat.label}</div>
                  <div className="text-slate-400 text-sm">{stat.change}</div>
                </div>
              );
            })}
          </div>
        </div>

        {!isLoggedIn ? (
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-12 text-center mb-12">
            <div className="w-20 h-20 bg-cyan-500/20 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl">
              🔒
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Sign In to View Your Stats
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Create an account or log in to track your personal statistics,
              achievements, and compare your progress with other players.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/login"
                className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
              >
                Sign Up / Log In
              </Link>
              <Link
                href="/leaderboard"
                className="bg-slate-800/50 border border-slate-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-slate-700/50 transition-all"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Your Stats</h2>
                <button className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-2">
                  <span>Download Report</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </button>
              </div>
              <div className="grid md:grid-cols-4 gap-6">
                {playerStats.map((stat, index) => {
                  const colors = getColorClasses(stat.color);
                  return (
                    <div
                      key={index}
                      className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-6 hover:scale-105 transition-transform`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="text-2xl">{stat.icon}</div>
                      </div>
                      <div className={`text-2xl font-bold ${colors.text} mb-1`}>
                        {stat.value}
                      </div>
                      <div className="text-white font-medium text-sm mb-1">
                        {stat.label}
                      </div>
                      <div className="text-slate-400 text-xs">{stat.change}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">
                Achievements
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className={`bg-gradient-to-br ${
                      achievement.unlocked
                        ? "from-yellow-500/10 to-orange-500/10 border-yellow-500/20"
                        : "from-slate-800/30 to-slate-900/30 border-slate-700/30"
                    } border rounded-xl p-6 flex items-center gap-4`}
                  >
                    <div
                      className={`w-16 h-16 ${
                        achievement.unlocked
                          ? "bg-yellow-500/20"
                          : "bg-slate-700/50"
                      } rounded-lg flex items-center justify-center text-3xl`}
                    >
                      {achievement.unlocked ? "🏆" : "🔒"}
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`font-semibold text-lg mb-1 ${
                          achievement.unlocked
                            ? "text-yellow-400"
                            : "text-slate-500"
                        }`}
                      >
                        {achievement.name}
                      </h3>
                      <p
                        className={
                          achievement.unlocked
                            ? "text-slate-300 text-sm"
                            : "text-slate-600 text-sm"
                        }
                      >
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-8 text-center">
          <h3 className="text-white font-semibold text-xl mb-3">
            Want to Compete?
          </h3>
          <p className="text-slate-400 mb-6">
            Check out the global leaderboard to see how you rank against other
            players.
          </p>
          <Link
            href="/leaderboard"
            className="inline-block bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all"
          >
            View Leaderboard
          </Link>
        </div>
      </div>
    </main>
  );
}
