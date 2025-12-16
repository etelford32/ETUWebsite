"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-2xs bg-deep-900/70 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/#home" className="flex items-center gap-3 group">
            <Image
              src="/logo2.png"
              alt="Explore the Universe 2175 logo"
              width={40}
              height={40}
            />
            <strong className="tracking-wide text-lg group-hover:text-white">
              Explore the Universe 2175
            </strong>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/#features" className="opacity-90 hover:opacity-100">
              Features
            </Link>
            <Link href="/#factions" className="opacity-90 hover:opacity-100">
              Factions
            </Link>
            <Link href="/leaderboard" className="opacity-90 hover:opacity-100">
              Leaderboard
            </Link>
            <Link href="/ship-designer" className="opacity-90 hover:opacity-100">
              Ship Designer
            </Link>
            <Link href="/#roadmap" className="opacity-90 hover:opacity-100">
              Roadmap
            </Link>
            <Link href="/#faq" className="opacity-90 hover:opacity-100">
              FAQ
            </Link>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/#download" className="btn-warp px-3 py-2 rounded-md">
              Download
            </Link>
            <Link
              href="/login"
              className="relative px-6 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.7)] transition-all duration-300 hover:scale-105"
            >
              Sign in
            </Link>
          </div>
          <button
            id="menuBtn"
            className="md:hidden p-2 rounded hover:bg-white/10"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      <div
        className={`md:hidden border-t border-white/10 ${
          mobileMenuOpen ? "" : "hidden"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
          <Link href="/#features" className="block">
            Features
          </Link>
          <Link href="/#factions" className="block">
            Factions
          </Link>
          <Link href="/leaderboard" className="block">
            Leaderboard
          </Link>
          <Link href="/ship-designer" className="block">
            Ship Designer
          </Link>
          <Link href="/#roadmap" className="block">
            Roadmap
          </Link>
          <Link href="/#faq" className="block">
            FAQ
          </Link>
          <div className="pt-3 flex gap-3">
            <Link
              href="/#download"
              className="px-3 py-2 rounded-md border border-white/20"
            >
              Download
            </Link>
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
