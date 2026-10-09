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
    title: "Evil Robots",
    subtitle: "Machine Empire dossier",
    accent: "#ef4444",
  },
  {
    href: "/megabot",
    title: "MEGABOT",
    subtitle: "Enemy of the Universe",
    accent: "#f97316",
  },
  {
    href: "/cyl",
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

const STEAM_URL =
  "https://store.steampowered.com/app/4094340/Explore_the_Universe_2175/";

// Everything under the "Game" menu, desktop and mobile.
const GAME_LINKS = [
  { href: "/bosses", label: "Bosses" },
  { href: "/zones", label: "Zones" },
  { href: "/ship-designer", label: "Ship Designer" },
  { href: "/audio", label: "Soundtrack" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/backlog", label: "Backlog" },
] as const;

const PRIMARY_LINKS = [
  { href: "/devlog", label: "Devlog" },
  { href: "/feedback", label: "Feedback" },
  { href: "/faq", label: "FAQ" },
] as const;

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
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/85 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Logo */}
          <Link href="/#home" className="flex items-center gap-3 shrink-0">
            <Image
              src="/logo2.png"
              alt=""
              width={36}
              height={36}
            />
            <span className="font-display font-bold text-sm sm:text-base tracking-wide text-white whitespace-nowrap">
              Explore the Universe 2175
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav ref={navRef} aria-label="Main" className="hidden lg:flex items-center gap-1 flex-1">
            <NavDropdown
              label="Factions"
              open={openMenu === "factions"}
              onToggle={() => toggleMenu("factions")}
              align="center"
              panelClassName="w-[min(40rem,calc(100vw-2rem))]"
            >
              <FactionsMenu onNavigate={closeMenus} />
            </NavDropdown>

            <NavDropdown
              label="Game"
              open={openMenu === "features"}
              onToggle={() => toggleMenu("features")}
              align="left"
              panelClassName="w-56"
            >
              <div className="py-2">
                {GAME_LINKS.map((l) => (
                  <DropdownLink key={l.href} href={l.href} onNavigate={closeMenus}>
                    {l.label}
                  </DropdownLink>
                ))}
              </div>
            </NavDropdown>

            {PRIMARY_LINKS.map((l) => (
              <NavLink key={l.href} href={l.href}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <NavLink href="/profile">Profile</NavLink>
            <a
              href={STEAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-3d btn-3d-steam !py-2 !px-4 !text-sm"
            >
              Wishlist on Steam
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            id="menuBtn"
            className="lg:hidden p-2 rounded-lg border border-white/15 hover:border-white/30 transition-colors"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span className={`h-0.5 w-full bg-slate-200 rounded-full transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`h-0.5 w-full bg-slate-200 rounded-full transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`h-0.5 w-full bg-slate-200 rounded-full transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${
          mobileMenuOpen
            ? "max-h-[calc(100vh-4rem)] overflow-y-auto opacity-100"
            : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-5 space-y-6">
          <a
            href={STEAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-3d btn-3d-steam w-full"
          >
            Wishlist on Steam
          </a>

          <MobileSection title="Game">
            {GAME_LINKS.map((l) => (
              <MobileNavLink key={l.href} href={l.href} onNavigate={closeMobileMenu}>
                {l.label}
              </MobileNavLink>
            ))}
          </MobileSection>

          <MobileSection title="Community">
            {PRIMARY_LINKS.map((l) => (
              <MobileNavLink key={l.href} href={l.href} onNavigate={closeMobileMenu}>
                {l.label}
              </MobileNavLink>
            ))}
            <MobileNavLink href="/profile" onNavigate={closeMobileMenu}>Profile</MobileNavLink>
          </MobileSection>

          <MobileSection
            title="Factions"
            aside={`${FACTION_LINKS.length} · ${LIVE_FACTION_COUNT} live`}
          >
            {FEATURED_FACTION_PAGES.map((p) => (
              <MobileNavLink key={p.href} href={p.href} onNavigate={closeMobileMenu}>
                {p.title} <span className="text-slate-500">· {p.subtitle}</span>
              </MobileNavLink>
            ))}
            <MobileNavLink href="/factions" onNavigate={closeMobileMenu}>All Factions</MobileNavLink>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-2">
              {FACTION_LINKS.map((f) => {
                const { short } = splitFactionName(f.name);
                const isStub = f.status === "in-development";
                return (
                  <Link
                    key={f.id}
                    href={`/factions/${f.id}`}
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 text-sm text-slate-300 hover:text-white hover:border-white/25 transition-colors min-w-0"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: f.color.primary }}
                    />
                    <span className="truncate">{short}</span>
                    {isStub && (
                      <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
                        Dev
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </MobileSection>
        </div>
      </div>
    </header>
  );
}

function MobileSection({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
        {aside && <span className="font-mono normal-case tracking-normal">{aside}</span>}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
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
        className={`flex items-center gap-1 px-3 py-2 rounded-md text-[15px] font-medium transition-colors ${
          open ? "text-white bg-white/5" : "text-slate-300 hover:text-white hover:bg-white/5"
        }`}
      >
        {label}
        <svg
          className={`w-4 h-4 opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          style={{ left: panelLeft }}
          className={`absolute top-full mt-2 ${panelClassName} bg-slate-900 border border-white/10 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden`}
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
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.accent }} aria-hidden />
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

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-md text-[15px] font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block px-3 py-2.5 rounded-md text-base text-slate-200 hover:text-white hover:bg-white/5 transition-colors"
    >
      {children}
    </Link>
  );
}

function DropdownLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      role="menuitem"
      className="block px-4 py-2 text-[15px] text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
    >
      {children}
    </Link>
  );
}
