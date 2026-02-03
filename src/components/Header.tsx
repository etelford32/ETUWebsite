"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setFeaturesDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex flex-col gap-0.5">
            <Link
              href="/#home"
              className="flex items-center gap-3 group relative"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-300"></div>
                <Image
                  src="/Explore the Universe Logo Official.png"
                  alt="Explore the Universe 2175 logo"
                  width={40}
                  height={40}
                  className="relative z-10 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)] group-hover:drop-shadow-[0_0_16px_rgba(34,211,238,0.8)] transition-all duration-300"
                />
              </div>
              <strong className="tracking-wide text-lg bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:via-blue-300 group-hover:to-indigo-300 transition-all duration-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                Explore the Universe 2175
              </strong>
            </Link>
            <a
              href="https://elliottelford.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-cyan-400 transition-colors duration-200 ml-14 flex items-center gap-1 group"
            >
              <span>by Elliot Telford</span>
              <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {/* Elliot's Devlog - Left-most position */}
            <Link
              href="/devlog"
              className="relative px-4 py-2 rounded-lg font-semibold text-sm overflow-hidden group mr-2"
            >
              {/* Animated gradient background - Purple/Pink gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-lg"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Glow effect */}
              <div className="absolute inset-0 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)] group-hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] transition-all duration-300"></div>

              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 skew-x-12"></div>

              {/* 3D border effect */}
              <div className="absolute inset-0 rounded-lg border border-white/20 group-hover:border-white/40 transition-all duration-300"></div>

              <span className="relative z-10 text-white drop-shadow-lg">Elliot's Devlog</span>
            </Link>

            {/* Features Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setFeaturesDropdownOpen(!featuresDropdownOpen)}
                className="relative px-3 py-2 group flex items-center gap-1"
              >
                {/* Hover background with glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 rounded-lg transition-all duration-300 group-hover:shadow-[0_0_16px_rgba(34,211,238,0.2)] scale-95 group-hover:scale-100"></div>

                {/* Top and bottom borders */}
                <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute bottom-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <span className="relative z-10 text-slate-300 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-300 group-hover:to-blue-300 group-hover:bg-clip-text drop-shadow-[0_0_8px_rgba(34,211,238,0)] group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-300 font-medium">
                  Features
                </span>
                <svg
                  className={`w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-all duration-300 ${featuresDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {featuresDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden">
                  <div className="py-2">
                    <DropdownLink href="/#factions" icon="🏛️">Factions</DropdownLink>
                    <DropdownLink href="/leaderboard" icon="🏆">Leaderboard</DropdownLink>
                    <DropdownLink href="/ship-designer" icon="🚀">Ship Designer</DropdownLink>
                    <DropdownLink href="/backlog" icon="📝">Backlog</DropdownLink>
                    <DropdownLink href="/roadmap" icon="🗺️">Roadmap</DropdownLink>
                  </div>
                </div>
              )}
            </div>

            <NavLink href="/audio" highlight={true}>
              <span className="font-semibold text-base">Audio</span>
            </NavLink>
            <NavLink href="/feedback">Feedback</NavLink>
            <NavLink href="/faq">FAQ</NavLink>
            <div className="flex-1"></div>
            <NavLink href="/profile">Profile</NavLink>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="relative px-4 py-2 rounded-lg font-medium text-cyan-300 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-lg transform transition-all duration-300 group-hover:border-cyan-400/50 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <span className="relative z-10">Sign in</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            id="menuBtn"
            className="md:hidden p-2 rounded-lg hover:bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:shadow-[0_0_12px_rgba(34,211,238,0.3)]"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span className={`h-0.5 w-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`h-0.5 w-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`h-0.5 w-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden border-t border-cyan-500/20 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${
          mobileMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
          {/* Features Section in Mobile */}
          <div className="mb-3">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 px-4">Features</div>
            <div className="space-y-1 pl-4 border-l-2 border-cyan-500/30">
              <MobileNavLink href="/#factions">🏛️ Factions</MobileNavLink>
              <MobileNavLink href="/leaderboard">🏆 Leaderboard</MobileNavLink>
              <MobileNavLink href="/ship-designer">🚀 Ship Designer</MobileNavLink>
              <MobileNavLink href="/backlog">📝 Backlog</MobileNavLink>
              <MobileNavLink href="/roadmap">🗺️ Roadmap</MobileNavLink>
            </div>
          </div>

          {/* Elliot's Devlog - Special Highlight */}
          <Link
            href="/devlog"
            className="block relative px-4 py-3 rounded-lg mb-3 overflow-hidden group"
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-lg"></div>

            {/* Glow effect */}
            <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] group-hover:shadow-[inset_0_0_30px_rgba(255,255,255,0.2)] transition-all duration-300"></div>

            {/* Content */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-white font-semibold flex items-center gap-2">
                <span>✍️</span>
                Elliot's Devlog
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">NEW</span>
              </span>
              <svg className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <MobileNavLink href="/audio" highlight={true}>
            <span className="font-semibold">Audio</span>
          </MobileNavLink>
          <MobileNavLink href="/feedback">Feedback</MobileNavLink>
          <MobileNavLink href="/faq">FAQ</MobileNavLink>
          <MobileNavLink href="/profile">Profile</MobileNavLink>

          <div className="pt-3">
            <Link
              href="/login"
              className="block w-full px-4 py-2 rounded-lg text-center border border-cyan-500/30 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-all duration-300 hover:shadow-[0_0_12px_rgba(34,211,238,0.2)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
    </header>
  );
}

// Desktop Navigation Link Component with 3D effects
function NavLink({ href, children, highlight = false }: { href: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className={`relative px-3 py-2 group ${highlight ? 'animate-pulse-slow' : ''}`}
    >
      {/* Hover background with glow */}
      <div className={`absolute inset-0 bg-gradient-to-b ${
        highlight
          ? 'from-purple-500/10 via-purple-500/15 to-purple-500/10 opacity-100 group-hover:from-purple-500/20 group-hover:via-purple-500/25 group-hover:to-purple-500/20'
          : 'from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100'
      } rounded-lg transition-all duration-300 group-hover:shadow-[0_0_16px_rgba(34,211,238,0.2)] scale-95 group-hover:scale-100`}></div>

      {/* Top and bottom borders */}
      <div className={`absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent ${
        highlight ? 'via-purple-400' : 'via-cyan-400'
      } to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
      <div className={`absolute bottom-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent ${
        highlight ? 'via-pink-400' : 'via-blue-400'
      } to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

      {/* Text with gradient */}
      <span className={`relative z-10 ${
        highlight
          ? 'text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text group-hover:from-purple-200 group-hover:to-pink-200 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]'
          : 'text-slate-300 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-300 group-hover:to-blue-300 group-hover:bg-clip-text drop-shadow-[0_0_8px_rgba(34,211,238,0)] group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'
      } transition-all duration-300 font-medium`}>
        {children}
      </span>
    </Link>
  );
}

// Mobile Navigation Link Component
function MobileNavLink({ href, children, highlight = false }: { href: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className="block relative px-4 py-3 rounded-lg group overflow-hidden"
    >
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-r ${
        highlight
          ? 'from-purple-500/10 to-pink-500/10 border border-purple-500/30 group-hover:border-purple-400/50 group-hover:from-purple-500/20 group-hover:to-pink-500/20'
          : 'from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 group-hover:border-cyan-400/40 group-hover:from-cyan-500/10 group-hover:to-blue-500/10'
      } rounded-lg transition-all duration-300`}></div>

      {/* Glow on hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
        highlight
          ? 'shadow-[inset_0_0_20px_rgba(168,85,247,0.2)]'
          : 'shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]'
      }`}></div>

      {/* Text */}
      <span className={`relative z-10 ${
        highlight
          ? 'text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text group-hover:from-purple-200 group-hover:to-pink-200'
          : 'text-slate-300 group-hover:text-cyan-300'
      } transition-colors duration-300`}>
        {children}
      </span>

      {/* Animated line */}
      <div className={`absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r ${
        highlight ? 'from-purple-400 to-pink-400' : 'from-cyan-400 to-blue-400'
      } group-hover:w-full transition-all duration-300 rounded-full`}></div>
    </Link>
  );
}

// Dropdown Link Component for Features Menu
function DropdownLink({ href, children, icon }: { href: string; children: React.ReactNode; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all duration-200 group"
    >
      <span className="text-lg group-hover:scale-110 transition-transform duration-200">{icon}</span>
      <span className="text-sm font-medium">{children}</span>
      <svg className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
