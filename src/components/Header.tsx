"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/#home"
            className="flex items-center gap-3 group relative"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-300"></div>
              <Image
                src="/logo2.png"
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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <NavLink href="/#features">Features</NavLink>
            <NavLink href="/#factions">Factions</NavLink>
            <NavLink href="/leaderboard">Leaderboard</NavLink>
            <NavLink href="/ship-designer">Ship Designer</NavLink>
            <NavLink href="/backlog">Backlog</NavLink>
            <NavLink href="/#roadmap">Roadmap</NavLink>
            <NavLink href="/#faq">FAQ</NavLink>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/#download"
              className="relative px-4 py-2 rounded-lg font-medium text-cyan-300 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-lg transform transition-all duration-300 group-hover:border-cyan-400/50 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <span className="relative z-10">Download</span>
            </Link>

            <Link
              href="/login"
              className="relative px-6 py-2.5 rounded-lg font-semibold text-white overflow-hidden group"
            >
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-lg"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Glow effect */}
              <div className="absolute inset-0 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_40px_rgba(34,211,238,0.8)] transition-all duration-300"></div>

              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 skew-x-12"></div>

              {/* 3D border effect */}
              <div className="absolute inset-0 rounded-lg border border-white/20 group-hover:border-white/40 transition-all duration-300"></div>

              <span className="relative z-10 drop-shadow-lg">Sign in</span>
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
          <MobileNavLink href="/#features">Features</MobileNavLink>
          <MobileNavLink href="/#factions">Factions</MobileNavLink>
          <MobileNavLink href="/leaderboard">Leaderboard</MobileNavLink>
          <MobileNavLink href="/ship-designer">Ship Designer</MobileNavLink>
          <MobileNavLink href="/backlog">Backlog</MobileNavLink>
          <MobileNavLink href="/#roadmap">Roadmap</MobileNavLink>
          <MobileNavLink href="/#faq">FAQ</MobileNavLink>

          <div className="pt-3 flex gap-3">
            <Link
              href="/#download"
              className="flex-1 px-4 py-2 rounded-lg text-center border border-cyan-500/30 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-all duration-300 hover:shadow-[0_0_12px_rgba(34,211,238,0.2)]"
            >
              Download
            </Link>
            <Link
              href="/login"
              className="flex-1 px-6 py-2.5 rounded-lg text-center font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all duration-300"
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
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative px-3 py-2 group"
    >
      {/* Hover background with glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:shadow-[0_0_16px_rgba(34,211,238,0.2)] scale-95 group-hover:scale-100"></div>

      {/* Top and bottom borders */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute bottom-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Text with gradient */}
      <span className="relative z-10 text-slate-300 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-300 group-hover:to-blue-300 group-hover:bg-clip-text transition-all duration-300 drop-shadow-[0_0_8px_rgba(34,211,238,0)] group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] font-medium">
        {children}
      </span>
    </Link>
  );
}

// Mobile Navigation Link Component
function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block relative px-4 py-3 rounded-lg group overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 rounded-lg group-hover:border-cyan-400/40 group-hover:bg-gradient-to-r group-hover:from-cyan-500/10 group-hover:to-blue-500/10 transition-all duration-300"></div>

      {/* Glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]"></div>

      {/* Text */}
      <span className="relative z-10 text-slate-300 group-hover:text-cyan-300 transition-colors duration-300">
        {children}
      </span>

      {/* Animated line */}
      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-cyan-400 to-blue-400 group-hover:w-full transition-all duration-300 rounded-full"></div>
    </Link>
  );
}
