"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Footer() {
  const [year, setYear] = useState(2025);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 text-sm text-slate-300/80">
        <div className="grid md:grid-cols-5 gap-6">
          <div>
            <Image
              src="/logo2.png"
              alt="Explore the Universe 2175"
              width={32}
              height={32}
              loading="lazy"
            />
            <p className="mt-3 max-w-xs">
              An open-world space adventure by Telford Projects. Built with
              science, art, and a pinch of chaos.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175/"
                target="_blank"
                rel="noopener noreferrer"
                className="etu-pill etu-pill--cyan"
              >
                <span className="ping" />Live · Steam Page
              </a>
              <span className="etu-pill etu-pill--amber">☢ Alpha 0.7</span>
            </div>
          </div>
          <nav className="space-y-2">
            <h4 className="font-semibold text-slate-200">Game</h4>
            <Link className="block hover:text-cyan-400 transition-colors" href="/#features">
              Features
            </Link>
            <Link className="block hover:text-cyan-400 transition-colors" href="/#factions">
              Factions
            </Link>
            <Link className="block hover:text-cyan-400 transition-colors" href="/stats">
              Stats
            </Link>
            <Link className="block hover:text-cyan-400 transition-colors" href="/#download">
              Download
            </Link>
          </nav>
          <nav className="space-y-2">
            <h4 className="font-semibold text-slate-200">Community</h4>
            <Link className="block hover:text-cyan-400 transition-colors" href="/leaderboard">
              Leaderboard
            </Link>
            <Link className="block hover:text-cyan-400 transition-colors" href="/forum">
              Forum
            </Link>
            <Link className="block hover:text-cyan-400 transition-colors" href="/discord">
              Discord
            </Link>
          </nav>
          <nav className="space-y-2">
            <h4 className="font-semibold text-slate-200">Company</h4>
            <Link className="block hover:text-cyan-400 transition-colors" href="/careers">
              Careers
            </Link>
            <Link className="block hover:text-cyan-400 transition-colors" href="/investors">
              Investors
            </Link>
            <Link className="block hover:text-cyan-400 transition-colors" href="/press-kit">
              Press Kit
            </Link>
          </nav>
          <nav className="space-y-2">
            <h4 className="font-semibold text-slate-200">Legal</h4>
            <Link className="block hover:text-cyan-400 transition-colors" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="block hover:text-cyan-400 transition-colors" href="/health-warning">
              Health Warning
            </Link>
            <Link className="block hover:text-cyan-400 transition-colors" href="/terms">
              Terms
            </Link>
          </nav>
        </div>
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <p>© {year} Telford Projects. All rights reserved.</p>
          <p className="font-mono tracking-[0.16em] text-slate-500 uppercase">
            Build 0.7.3-α
          </p>
        </div>
      </div>
    </footer>
  );
}
