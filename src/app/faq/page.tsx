"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "general" | "gameplay" | "technical" | "community";
}

const faqData: FAQItem[] = [
  // GENERAL
  {
    id: "what-is-etu",
    question: "What is Explore the Universe 2175?",
    answer: "ETU 2175 is an open-world space RPG set in the year 2175. It features realistic Newtonian physics, an adaptive AI boss (Megabot) that learns from your tactics, dynamic faction systems, and a living galaxy where your choices matter. Think Elite Dangerous meets Dark Souls in space!",
    category: "general"
  },
  {
    id: "release-date",
    question: "When is the game releasing?",
    answer: "We're releasing a public demo on December 31st, 2024 (New Year's Eve). The full game is planned for Q2 2025. Quality is our top priority - we'd rather deliver an amazing experience than rush to market!",
    category: "general"
  },
  {
    id: "platforms",
    question: "What platforms will ETU 2175 be available on?",
    answer: "The game will launch on PC (Windows, macOS, and Linux) via Steam. We're focusing on delivering the best PC experience first, with potential console ports considered for the future based on community demand.",
    category: "general"
  },
  {
    id: "price",
    question: "How much will the game cost?",
    answer: "Final pricing hasn't been announced yet, but we're aiming for a fair price point around $29.99 USD for the base game. The demo will be completely free! We'll never have pay-to-win mechanics or aggressive monetization.",
    category: "general"
  },
  {
    id: "demo-content",
    question: "What's included in the demo?",
    answer: "The demo includes 3-4 hours of gameplay featuring: the tutorial sequence, access to 2 star systems, basic ship customization, your first encounters with Megabot, faction introduction missions, and full access to the global leaderboards!",
    category: "general"
  },

  // GAMEPLAY
  {
    id: "megabot-ai",
    question: "How does the AI boss \"Megabot\" learn from me?",
    answer: "Megabot uses an adaptive AI system that tracks your tactics, weapon preferences, and movement patterns. If you rely too heavily on one strategy, Megabot will develop counters. It remembers encounters across playthroughs and evolves its behavior, making each battle unique and challenging.",
    category: "gameplay"
  },
  {
    id: "difficulty",
    question: "Is the game difficult? Can casual players enjoy it?",
    answer: "We offer multiple difficulty modes! 'Story Mode' focuses on exploration with more forgiving combat. 'Balanced' provides a challenge without frustration. 'Hardcore' is for veterans seeking Dark Souls-level difficulty. You can adjust difficulty at any time.",
    category: "gameplay"
  },
  {
    id: "ship-customization",
    question: "How deep is ship customization?",
    answer: "Very deep! You can customize weapons, shields, engines, thrusters, reactor cores, and even hull plating. There's also a visual customization system for colors, decals, and modifications. Post-launch, we're adding a full ship designer where you can build ships from scratch!",
    category: "gameplay"
  },
  {
    id: "faction-system",
    question: "How do factions work?",
    answer: "There are 6 major factions, each with unique ideologies and technologies. Your actions affect reputation - help one faction, anger another. Factions can go to war, form alliances, and even fall. Your choices have permanent consequences on the galaxy's political landscape.",
    category: "gameplay"
  },
  {
    id: "multiplayer",
    question: "Does the game have multiplayer?",
    answer: "The full release will feature co-op multiplayer for 2-4 players! You can explore together, tackle missions as a team, and fight Megabot cooperatively. The demo is single-player only, but competitive leaderboards let you compete globally.",
    category: "gameplay"
  },
  {
    id: "progression",
    question: "How does character/ship progression work?",
    answer: "You earn experience through combat, exploration, and missions. Level up to unlock new ship modules, weapons, and abilities. There's also a skill tree system for piloting specializations. Your reputation with factions unlocks unique equipment and storylines.",
    category: "gameplay"
  },

  // TECHNICAL
  {
    id: "system-requirements",
    question: "What are the system requirements?",
    answer: "Minimum: Intel i5 or equivalent, 8GB RAM, GTX 1060 or equivalent, 20GB storage. Recommended: Intel i7 or equivalent, 16GB RAM, RTX 2060 or equivalent, SSD storage. The game is well-optimized and runs on lower-end hardware with quality settings adjusted.",
    category: "technical"
  },
  {
    id: "controller-support",
    question: "Does the game support controllers?",
    answer: "Yes! Full controller support for Xbox, PlayStation, and most third-party controllers. We also support HOTAS (Hands On Throttle And Stick) flight systems for the true space sim experience. Keyboard + mouse is fully supported too.",
    category: "technical"
  },
  {
    id: "vr-support",
    question: "Will there be VR support?",
    answer: "VR support is planned for a post-launch update! We want to ensure the core game is solid first, then we'll add VR compatibility. It's a highly requested feature and definitely on our roadmap.",
    category: "technical"
  },
  {
    id: "mods",
    question: "Can I mod the game?",
    answer: "Absolutely! Full mod support will be available at launch via Steam Workshop. We're providing modding tools, documentation, and API access. We love the creativity of the modding community and can't wait to see what you create!",
    category: "technical"
  },
  {
    id: "save-system",
    question: "How does saving work?",
    answer: "The game features autosave at key moments plus manual save slots. Your progress syncs to Steam Cloud, so you can play across multiple devices. In Hardcore mode, there's permadeath with limited saves for extra challenge.",
    category: "technical"
  },

  // COMMUNITY
  {
    id: "discord",
    question: "Is there a Discord community?",
    answer: "Yes! Join our Discord for dev updates, community events, multiplayer coordination, and direct access to the development team. We host weekly Q&A sessions and share behind-the-scenes content. Link coming soon!",
    category: "community"
  },
  {
    id: "feedback",
    question: "How can I provide feedback?",
    answer: "We love feedback! Use our Discord, Steam community forums, or the in-game feedback tool (available in demo). We read everything and actively implement community suggestions. Your input shapes the game!",
    category: "community"
  },
  {
    id: "leaderboards",
    question: "How do leaderboards work?",
    answer: "Global leaderboards track various challenges: speedruns, boss kills, exploration %, faction influence, and more. Compete in daily/weekly challenges for exclusive rewards. Top players get featured on our website and in-game!",
    category: "community"
  },
  {
    id: "updates",
    question: "How often will the game be updated?",
    answer: "Major content updates every 3-4 months, with smaller patches monthly. We're committed to long-term support with new story content, ships, systems, and features. Post-launch expansions are already in planning!",
    category: "community"
  }
];

const categories = [
  { id: "all", name: "All Questions", icon: "🌟" },
  { id: "general", name: "General", icon: "ℹ️" },
  { id: "gameplay", name: "Gameplay", icon: "🎮" },
  { id: "technical", name: "Technical", icon: "⚙️" },
  { id: "community", name: "Community", icon: "👥" }
];

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredData = faqData.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = searchQuery === "" ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const expandAll = () => {
    setOpenItems(new Set(filteredData.map(item => item.id)));
  };

  const collapseAll = () => {
    setOpenItems(new Set());
  };

  return (
    <div className="min-h-screen bg-deep-900">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent"></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <span>←</span> Back to Home
          </Link>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Everything you need to know about Explore the Universe 2175. Can't find your answer?
            Reach out to us on Discord!
          </p>
        </div>
      </section>

      {/* Search Bar */}
      <section className="max-w-4xl mx-auto px-4 mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="max-w-4xl mx-auto px-4 mb-8">
        <div className="flex flex-wrap gap-3 mb-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                selectedCategory === category.id
                  ? "bg-purple-600 text-white scale-105"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={expandAll}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Expand All
          </button>
          <span className="text-slate-600">•</span>
          <button
            onClick={collapseAll}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Collapse All
          </button>
        </div>
      </section>

      {/* FAQ Items */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No questions found matching your search.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredData.map((item) => (
              <div
                key={item.id}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all"
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-slate-700/30 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-white pr-4">{item.question}</h3>
                  <div className={`text-2xl text-purple-400 transition-transform ${openItems.has(item.id) ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </button>
                {openItems.has(item.id) && (
                  <div className="px-6 pb-5 animate-fadeIn">
                    <div className="pt-2 border-t border-slate-700">
                      <p className="text-slate-300 leading-relaxed">{item.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Still Have Questions CTA */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Still Have Questions?
          </h2>
          <p className="text-purple-100 text-lg mb-6">
            Join our Discord community and chat with the dev team directly!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#"
              className="px-8 py-3 bg-white text-purple-600 rounded-lg font-bold hover:bg-purple-50 transition-all inline-flex items-center justify-center gap-2"
            >
              <span>💬</span> Join Discord
            </a>
            <Link
              href="/roadmap"
              className="px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg font-bold hover:bg-white/10 transition-all"
            >
              View Roadmap
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
