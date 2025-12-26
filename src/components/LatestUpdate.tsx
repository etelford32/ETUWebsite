'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LatestUpdate() {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this update
    const dismissed = localStorage.getItem('etu-update-2025-12-26-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('etu-update-2025-12-26-dismissed', 'true');
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <section className="py-12 bg-gradient-to-b from-deep-900 via-amber-950/10 to-deep-900 border-y border-amber-500/20 relative overflow-hidden animate-fadeIn">
      {/* Decorative background glow */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-amber-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-red-500 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-6 relative z-10">
        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-0 right-4 lg:right-6 text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
          aria-label="Dismiss update"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Update Content */}
        <div className="p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 ring-2 ring-amber-500/30 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <span className="text-4xl flex-shrink-0 mt-1">🎄</span>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-amber-100 mb-2">
                CHRISTMAS UPDATE: Demo Delayed to New Year's
              </h2>
              <p className="text-sm text-slate-400">
                December 26, 2025
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-4 text-slate-200 leading-relaxed">
            <p>
              The demo won't be launching as planned. After a year of building adaptive AI and real-time physics systems, the last 10% has proven to be critical.
            </p>

            <p className="font-semibold text-lg text-amber-200">
              New target: New Year's Eve (possibly earlier)
            </p>

            <p>
              I'm not rushing this. When you download the demo, I want you to experience:
            </p>

            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>MEGABOT's adaptive AI working flawlessly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>Smooth orbital mechanics that feel real</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>All four factions operating in harmony</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>The immersion this game deserves</span>
              </li>
            </ul>

            <p className="text-slate-300">
              This isn't just another space game - it's a physics-based RTS where the AI boss learns from YOU. That requires polish.
            </p>

            {/* CTA Link */}
            <div className="pt-4">
              <a
                href="https://elliottelford.com/explore-universe-2175-demo-delay/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <span>Read the full dev update</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>

            {/* Signature */}
            <p className="pt-4 text-slate-300 italic">
              Thank you for your patience. The wait will be worth it.
            </p>
            <p className="text-amber-200 font-semibold">
              — Eliot
            </p>

            {/* Additional CTAs */}
            <div className="pt-6 border-t border-amber-500/20">
              <p className="text-sm text-slate-400 mb-3 font-semibold">
                Stay Updated:
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/5 text-sm transition-all hover:border-white/40"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
                  </svg>
                  <span>Wishlist on Steam</span>
                </a>
                <a
                  href="https://twitter.com/elliottelford"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/5 text-sm transition-all hover:border-white/40"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>Follow on Twitter/X</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
