"use client";

import { useState } from "react";
import Link from "next/link";

export default function InvestorsPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    investmentRange: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const investmentRanges = [
    "Less than $50K",
    "$50K - $100K",
    "$100K - $500K",
    "$500K - $1M",
    "$1M - $5M",
    "$5M+",
    "Prefer not to say",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setSubmitted(true);
    setLoading(false);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Thank You for Your Interest!
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              We've received your investment inquiry. Our team will review your
              submission and reach out within 48 hours.
            </p>
            <Link
              href="/"
              className="inline-block bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Invest in the Future
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Join us in revolutionizing space gaming. Explore the Universe 2175
            is building the next generation of immersive space exploration.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-to-br from-slate-900/50 to-indigo-900/20 border border-slate-700/50 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6">Why Invest?</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-indigo-400">📈</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">
                    Growing Market
                  </h3>
                  <p className="text-slate-400 text-sm">
                    The space gaming market is projected to reach $8B by 2027,
                    with a 15% annual growth rate.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-400">🎮</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">
                    Proven Traction
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Active community of early adopters, with growing engagement
                    and positive feedback.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-pink-400">🚀</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">
                    Innovative Technology
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Cutting-edge AI systems, procedural generation, and
                    immersive 3D environments.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-cyan-400">💡</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">
                    Experienced Team
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Led by industry veterans with decades of combined
                    experience in game development.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-700/50">
              <Link
                href="/roadmap"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all"
              >
                <span>View Product Roadmap</span>
                <svg
                  className="w-5 h-5"
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
              </Link>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-gradient-to-br from-slate-900/50 to-purple-900/20 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm"
          >
            <h2 className="text-2xl font-bold text-white mb-6">
              Investment Inquiry
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">
                  Company / Fund (Optional)
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Acme Ventures"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">
                  Investment Range *
                </label>
                <select
                  name="investmentRange"
                  value={formData.investmentRange}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                >
                  <option value="">Select a range</option>
                  {investmentRanges.map((range) => (
                    <option key={range} value={range}>
                      {range}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">
                  Additional Information *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                  placeholder="Tell us about your investment goals and any questions you have..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Submitting..." : "Submit Inquiry"}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-gradient-to-br from-slate-900/30 to-indigo-900/10 border border-slate-700/30 rounded-xl p-8 text-center">
          <h3 className="text-white font-semibold text-lg mb-2">
            Need More Information?
          </h3>
          <p className="text-slate-400 mb-4">
            Download our investor pitch deck or schedule a call with our team.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="bg-slate-800/50 border border-slate-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-700/50 transition-all">
              Download Pitch Deck
            </button>
            <button className="bg-slate-800/50 border border-slate-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-700/50 transition-all">
              Schedule a Call
            </button>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          All investment opportunities are subject to regulatory approval and
          accreditation requirements.{" "}
          <Link href="/privacy" className="text-indigo-400 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </main>
  );
}
