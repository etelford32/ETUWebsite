"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { motion } from "framer-motion";

interface DevlogEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  tags: string[];
}

const devlogEntries: DevlogEntry[] = [
  {
    id: "devlog-1",
    date: "2025-01-13",
    title: "Welcome to Elliot's Devlog!",
    content: "This is where I'll be sharing regular updates about the development of Explore the Universe 2175. Stay tuned for insights into game design decisions, technical challenges, and exciting new features coming to the game. Check out the roadmap and backlog to see what's planned!",
    tags: ["announcement", "welcome"]
  }
];

export default function DevlogPage() {
  const [selectedTag, setSelectedTag] = useState<string>("all");

  // Get all unique tags
  const allTags = ["all", ...new Set(devlogEntries.flatMap(entry => entry.tags))];

  const filteredEntries = selectedTag === "all"
    ? devlogEntries
    : devlogEntries.filter(entry => entry.tags.includes(selectedTag));

  return (
    <div className="min-h-screen bg-deep-900">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <span>←</span> Back to Home
          </Link>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            ✍️ Elliot's Devlog
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mb-4">
            <strong>Behind the Scenes:</strong> Follow my journey building Explore the Universe 2175.
            Regular updates on development progress, technical challenges, design decisions, and what's coming next.
          </p>
          <p className="text-lg text-slate-400 max-w-3xl">
            From concept to code, I'm sharing it all. Join me on this indie game development adventure.
          </p>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="max-w-6xl mx-auto px-4 mb-12">
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔗</span>
            <h2 className="text-2xl font-bold text-purple-400">Development Resources</h2>
          </div>
          <p className="text-slate-300 mb-6">
            Want to see what's planned or influence the development? Check these out:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/roadmap"
              className="group bg-slate-800/50 rounded-lg p-6 border border-slate-700 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/20"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🗺️</span>
                <h3 className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">Development Roadmap</h3>
              </div>
              <p className="text-slate-400">
                See the complete timeline of planned features, milestones, and upcoming content for ETU2175.
              </p>
              <div className="mt-4 flex items-center gap-2 text-blue-400 group-hover:text-blue-300 transition-colors">
                <span>View Roadmap</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link
              href="/backlog"
              className="group bg-slate-800/50 rounded-lg p-6 border border-slate-700 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/20"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">📝</span>
                <h3 className="text-xl font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">Community Backlog</h3>
              </div>
              <p className="text-slate-400">
                Vote on features and bugs, submit your own ideas, and help shape the future of the game.
              </p>
              <div className="mt-4 flex items-center gap-2 text-cyan-400 group-hover:text-cyan-300 transition-colors">
                <span>View Backlog</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Tag Filter */}
      <section className="max-w-6xl mx-auto px-4 mb-12">
        <div className="flex flex-wrap gap-3">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-6 py-2 rounded-full font-medium transition-all capitalize ${
                selectedTag === tag
                  ? "bg-purple-600 text-white scale-105"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* Devlog Entries */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="space-y-8">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
              <p className="text-slate-400">No devlog entries found for this tag.</p>
            </div>
          ) : (
            filteredEntries.map((entry, index) => (
              <motion.article
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/20"
              >
                {/* Date and Title */}
                <div className="mb-4">
                  <div className="text-slate-500 text-sm mb-2">
                    {new Date(entry.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3">{entry.title}</h2>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-full text-xs font-semibold capitalize"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {entry.content}
                </div>
              </motion.article>
            ))
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            🎮 Want to Play ETU2175?
          </h2>
          <p className="text-purple-100 text-lg mb-6">
            Wishlist on Steam to get notified when the game launches and help support development!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-white text-purple-600 rounded-lg font-bold hover:bg-purple-50 transition-all shadow-lg hover:shadow-xl"
            >
              ⭐ Wishlist on Steam
            </a>
            <Link
              href="/feedback"
              className="px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg font-bold hover:bg-white/10 transition-all"
            >
              💬 Share Your Feedback
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
