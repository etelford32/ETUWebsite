"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { getAllFactions, type Faction } from "@/data/factions";

type MenuKey = "factions" | "features";

// Long-form faction pages that live outside /factions/[slug].
const FEATURED_FACTION_PAGES = [
  {
    href: "/evil-robots",
    icon: "🤖",
    title: "Evil Robots",
    subtitle: "Machine Empire dossier",
    accent: "#ef4444",
  },
  {
    href: "/megabot",
    icon: "👁️",
    title: "MEGABOT",
    subtitle: "Enemy of the Universe",
    accent: "#f97316",
  },
  {
    href: "/cyl",
    icon: "🔮",
    title: "Cyl",
    subtitle: "Lumari companion AI",
    accent: "#e879f9",
  },
] as const;

function factionStatusOrder(f: Faction) {
  return (f.status ?? "live") === "live" ? 0 : 1;
}

// Live factions first, then the in-development roster, alphabetical within each.
const FACTION_LINKS: Faction[] = getAllFactions()
  .slice()
  .sort(
    (a, b) =>
      factionStatusOrder(a) - factionStatusOrder(b) || a.name.localeCompare(b.name)
  );

const LIVE_FACTION_COUNT = FACTION_LINKS.filter(
  (f) => (f.status ?? "live") === "live"
).length;

// "Megabot • Machine Empire" -> { short: "Megabot", sub: "Machine Empire" }
function splitFactionName(name: string): { short: string; sub: string } {
  const [short, ...rest] = name.split("•");
  return { short: short.trim(), sub: rest.join("•").trim() };
}

// useLayoutEffect measures DOM before paint; fall back to useEffect on the server.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const closeMenus = useCallback(() => setOpenMenu(null), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleMenu = (key: MenuKey) =>
    setOpenMenu((current) => (current === key ? null : key));

  // Close the desktop dropdowns on outside click or Escape.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
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

          {/* Desktop Navigation (lg+; the nav is too wide for tablet widths, which get the menu below) */}
          <nav ref={navRef} className="hidden lg:flex items-center gap-1 text-sm">
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

            {/* Factions Dropdown — every faction in the war, plus the long-form pages */}
            <NavDropdown
              label="Factions"
              open={openMenu === "factions"}
              onToggle={() => toggleMenu("factions")}
              align="center"
              panelClassName="w-[min(40rem,calc(100vw-2rem))]"
            >
              <FactionsMenu onNavigate={closeMenus} />
            </NavDropdown>

            {/* Features Dropdown */}
            <NavDropdown
              label="Features"
              open={openMenu === "features"}
              onToggle={() => toggleMenu("features")}
              align="left"
              panelClassName="w-56"
            >
              <div className="py-2">
                <DropdownLink href="/leaderboard" icon="🏆" onNavigate={closeMenus}>Leaderboard</DropdownLink>
                <DropdownLink href="/ship-designer" icon="🚀" onNavigate={closeMenus}>Ship Designer</DropdownLink>
                <DropdownLink href="/bosses" icon="👑" onNavigate={closeMenus}>Bosses</DropdownLink>
                <DropdownLink href="/zones" icon="🌌" onNavigate={closeMenus}>Zones</DropdownLink>
                <DropdownLink href="/backlog" icon="📝" onNavigate={closeMenus}>Backlog</DropdownLink>
                <DropdownLink href="/roadmap" icon="🗺️" onNavigate={closeMenus}>Roadmap</DropdownLink>
              </div>
            </NavDropdown>

            <NavLink href="/audio" highlight={true}>
              <span className="font-semibold text-base">Audio</span>
            </NavLink>
            <NavLink href="/feedback">Feedback</NavLink>
            <NavLink href="/faq">FAQ</NavLink>
            <div className="flex-1"></div>
            <NavLink href="/profile">Profile</NavLink>
          </nav>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <span className="etu-pill etu-pill--cyan hidden xl:inline-flex" title="Current build">
              <span className="ping" />Playtest · Open
            </span>
            <a
              href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175/"
              target="_blank"
              rel="noopener noreferrer"
              className="relative px-4 py-2 rounded-lg font-medium text-cyan-300 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-lg transform transition-all duration-300 group-hover:border-cyan-400/50 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <span className="relative z-10">▶ Join the Playtest</span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            id="menuBtn"
            className="lg:hidden p-2 rounded-lg hover:bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:shadow-[0_0_12px_rgba(34,211,238,0.3)]"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
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
        className={`lg:hidden border-t border-cyan-500/20 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${
          mobileMenuOpen
            ? "max-h-[calc(100vh-4rem)] overflow-y-auto opacity-100"
            : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-2">
          {/* Factions Section in Mobile */}
          <div className="mb-3">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 px-4">
              Factions
              <span className="ml-2 font-mono normal-case tracking-normal text-slate-600">
                {FACTION_LINKS.length} · {LIVE_FACTION_COUNT} live
              </span>
            </div>
            <div className="space-y-1 pl-4 border-l-2 border-red-500/30">
              {FEATURED_FACTION_PAGES.map((p) => (
                <MobileNavLink key={p.href} href={p.href} onNavigate={closeMobileMenu}>
                  {p.icon} {p.title} · {p.subtitle}
                </MobileNavLink>
              ))}
              <MobileNavLink href="/factions" onNavigate={closeMobileMenu}>🏛️ All Factions</MobileNavLink>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                {FACTION_LINKS.map((f) => {
                  const { short } = splitFactionName(f.name);
                  const isStub = f.status === "in-development";
                  return (
                    <Link
                      key={f.id}
                      href={`/factions/${f.id}`}
                      onClick={closeMobileMenu}
                      className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-slate-300 hover:text-cyan-200 hover:border-cyan-400/40 transition-colors min-w-0"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: f.color.primary, boxShadow: `0 0 6px ${f.color.primary}` }}
                      />
                      <span className="truncate">{short}</span>
                      {isStub && (
                        <span className="ml-auto shrink-0 text-[9px] font-semibold uppercase tracking-wider text-amber-300/80">
                          Dev
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Features Section in Mobile */}
          <div className="mb-3">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 px-4">Features</div>
            <div className="space-y-1 pl-4 border-l-2 border-cyan-500/30">
              <MobileNavLink href="/leaderboard" onNavigate={closeMobileMenu}>🏆 Leaderboard</MobileNavLink>
              <MobileNavLink href="/ship-designer" onNavigate={closeMobileMenu}>🚀 Ship Designer</MobileNavLink>
              <MobileNavLink href="/bosses" onNavigate={closeMobileMenu}>👑 Bosses</MobileNavLink>
              <MobileNavLink href="/zones" onNavigate={closeMobileMenu}>🌌 Zones</MobileNavLink>
              <MobileNavLink href="/backlog" onNavigate={closeMobileMenu}>📝 Backlog</MobileNavLink>
              <MobileNavLink href="/roadmap" onNavigate={closeMobileMenu}>🗺️ Roadmap</MobileNavLink>
            </div>
          </div>

          {/* Elliot's Devlog - Special Highlight */}
          <Link
            href="/devlog"
            onClick={closeMobileMenu}
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

          <MobileNavLink href="/audio" highlight={true} onNavigate={closeMobileMenu}>
            <span className="font-semibold">Audio</span>
          </MobileNavLink>
          <MobileNavLink href="/feedback" onNavigate={closeMobileMenu}>Feedback</MobileNavLink>
          <MobileNavLink href="/faq" onNavigate={closeMobileMenu}>FAQ</MobileNavLink>
          <MobileNavLink href="/profile" onNavigate={closeMobileMenu}>Profile</MobileNavLink>

          <div className="pt-3">
            <a
              href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175/"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-4 py-2 rounded-lg text-center border border-cyan-500/30 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-all duration-300 hover:shadow-[0_0_12px_rgba(34,211,238,0.2)]"
            >
              ▶ Join the Playtest
            </a>
          </div>
        </div>
      </div>

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
    </header>
  );
}

// Desktop dropdown trigger + panel. The trigger keeps the NavLink hover
// treatment; the panel sits under it, left-aligned or centred, and is
// clamped to the viewport so a wide panel never runs off either edge.
const PANEL_VIEWPORT_MARGIN = 16;

function NavDropdown({
  label,
  open,
  onToggle,
  align,
  panelClassName,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  align: "left" | "center";
  panelClassName: string;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Panel `left` in px relative to the trigger; measured before paint on open.
  const [panelLeft, setPanelLeft] = useState(0);

  useIsomorphicLayoutEffect(() => {
    if (!open) return;

    function place() {
      const wrap = wrapRef.current;
      const panel = panelRef.current;
      if (!wrap || !panel) return;
      const viewportWidth = document.documentElement.clientWidth;
      const trigger = wrap.getBoundingClientRect();
      const panelWidth = panel.offsetWidth;
      const wanted =
        align === "center"
          ? trigger.left + trigger.width / 2 - panelWidth / 2
          : trigger.left;
      const maxLeft = viewportWidth - PANEL_VIEWPORT_MARGIN - panelWidth;
      const clamped = Math.max(PANEL_VIEWPORT_MARGIN, Math.min(wanted, maxLeft));
      setPanelLeft(Math.round(clamped - trigger.left));
    }

    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, align]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative px-3 py-2 group flex items-center gap-1"
      >
        {/* Hover background with glow */}
        <div className={`absolute inset-0 bg-gradient-to-b from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 ${open ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 rounded-lg transition-all duration-300 group-hover:shadow-[0_0_16px_rgba(34,211,238,0.2)] scale-95 group-hover:scale-100`}></div>

        {/* Top and bottom borders */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute bottom-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <span className={`relative z-10 ${open ? 'text-cyan-300' : 'text-slate-300'} group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-300 group-hover:to-blue-300 group-hover:bg-clip-text drop-shadow-[0_0_8px_rgba(34,211,238,0)] group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-300 font-medium`}>
          {label}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-all duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          style={{ left: panelLeft }}
          className={`absolute top-full mt-2 ${panelClassName} bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// The Factions panel: the two long-form pages up top, then every faction in
// the registry (live first) linking to its /factions/[slug] profile.
function FactionsMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="p-3">
      <div className="flex items-center justify-between gap-3 px-2 pb-3">
        <div>
          <div className="eyebrow">Factions</div>
          <div className="mt-0.5 text-xs text-slate-400">
            <span className="font-mono text-cyan-300">{FACTION_LINKS.length}</span> in the war ·{' '}
            <span className="font-mono text-emerald-300">{LIVE_FACTION_COUNT}</span> live
          </div>
        </div>
        <Link
          href="/factions"
          onClick={onNavigate}
          className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors whitespace-nowrap"
        >
          All factions →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 px-1 pb-3">
        {FEATURED_FACTION_PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors group hover:bg-white/[0.04]"
            style={{ borderColor: p.accent + "55", background: p.accent + "0F" }}
          >
            <span className="text-xl leading-none" aria-hidden>{p.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-100 group-hover:text-white">
                {p.title}
              </span>
              <span className="block text-[11px] text-slate-400 truncate">{p.subtitle}</span>
            </span>
            <svg className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: p.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3 px-2 pb-2">
        <span className="eyebrow">Roster</span>
        <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/30 to-transparent" />
      </div>

      <div className="grid grid-cols-2 gap-x-2 max-h-[60vh] overflow-y-auto">
        {FACTION_LINKS.map((f) => {
          const { short, sub } = splitFactionName(f.name);
          const isStub = f.status === "in-development";
          return (
            <Link
              key={f.id}
              href={`/factions/${f.id}`}
              onClick={onNavigate}
              role="menuitem"
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-cyan-500/10 transition-colors group min-w-0"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: f.color.primary, boxShadow: `0 0 8px ${f.color.primary}` }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-slate-200 group-hover:text-cyan-200 truncate">
                  {short}
                </span>
                {sub && (
                  <span className="block text-[11px] text-slate-500 truncate">{sub}</span>
                )}
              </span>
              {isStub && (
                <span className="shrink-0 text-[9px] font-display font-semibold uppercase tracking-[0.18em] text-amber-300/80">
                  Dev
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
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
function MobileNavLink({
  href,
  children,
  highlight = false,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  highlight?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
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

// Dropdown Link Component for the Features menu
function DropdownLink({
  href,
  children,
  icon,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  icon: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      role="menuitem"
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
