"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QualitySettings, { type QualityLevel } from "@/components/QualitySettings";
import CountdownTimer from "@/components/CountdownTimer";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import StickyHeaderCTA from "@/components/StickyHeaderCTA";
import { initPerformanceOptimizations, detectConnectionQuality } from "@/lib/performance";

// Dynamically import Megabot to avoid SSR issues
const Megabot = dynamic(() => import("@/components/Megabot"), { ssr: false });
const HeroMissileGame = dynamic(() => import("@/components/HeroMissileGame"), { ssr: false });

export default function HomePage() {
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [animationQuality, setAnimationQuality] = useState<QualityLevel>("medium");
  const megabotRef = useRef<any>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [buttonBounds, setButtonBounds] = useState<DOMRect | null>(null);
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const steamButtonRef = useRef<HTMLAnchorElement>(null);
  const heroSectionRef = useRef<HTMLDivElement>(null);

  // Laser positions for game collision detection
  const [laserData, setLaserData] = useState<{
    leftStart: { x: number; y: number } | null;
    leftEnd: { x: number; y: number } | null;
    rightStart: { x: number; y: number } | null;
    rightEnd: { x: number; y: number } | null;
    visible: boolean;
  }>({
    leftStart: null,
    leftEnd: null,
    rightStart: null,
    rightEnd: null,
    visible: false
  });

  // 3D Game state from Megabot scene
  const [gameState, setGameState] = useState<{
    score: number;
    health: number;
    shipCount: number;
    missileCount: number;
  }>({
    score: 0,
    health: 10000,
    shipCount: 0,
    missileCount: 0
  });

  // Handle button hover for Megabot tracking (only Steam button)
  const handleButtonHover = (buttonId: string, event: React.MouseEvent) => {
    // Only track Steam button for Megabot laser eyes
    if (buttonId === 'steam') {
      setHoveredButton(buttonId);
      const rect = event.currentTarget.getBoundingClientRect();
      setMousePosition({
        x: event.clientX,
        y: event.clientY
      });
      setButtonBounds(rect);
    }
  };

  const handleButtonLeave = () => {
    setHoveredButton(null);
    // Don't reset mousePosition here - let continuous tracking handle it
    setButtonBounds(null);
  };

  const handleButtonClick = (event: React.MouseEvent) => {
    setIsButtonClicked(true);
    // Reset after animation
    setTimeout(() => setIsButtonClicked(false), 100);
  };

  // Handle continuous mouse tracking on hero section for eye following
  const handleHeroMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    setMousePosition({
      x: event.clientX,
      y: event.clientY
    });
  };

  useEffect(() => {
    // Initialize performance optimizations
    initPerformanceOptimizations();

    // Detect connection quality and set appropriate animation quality
    const savedQuality = typeof window !== "undefined"
      ? localStorage.getItem("etu-animation-quality") as QualityLevel | null
      : null;

    if (!savedQuality) {
      const suggestedQuality = detectConnectionQuality();
      setAnimationQuality(suggestedQuality);
    }

    // Section reveal animation
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("show");
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    // Demo leaderboard data (replace with API)
    const demoLB = [
      {
        rank: 1,
        name: "E.T.",
        mode: "Any% Run",
        score: 987654,
        time: "12:34",
        updated: "2m ago",
      },
      {
        rank: 2,
        name: "NovaKite",
        mode: "Discovery",
        score: 963420,
        time: "—",
        updated: "5m ago",
      },
      {
        rank: 3,
        name: "CrystalMind",
        mode: "Faction Influence",
        score: 951210,
        time: "—",
        updated: "9m ago",
      },
      {
        rank: 4,
        name: "SporeSpine",
        mode: "Boss Rush",
        score: 912340,
        time: "18:12",
        updated: "15m ago",
      },
      {
        rank: 5,
        name: "MegabotX",
        mode: "Siege",
        score: 889990,
        time: "—",
        updated: "22m ago",
      },
    ];
    setLeaderboardData(demoLB);

    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* Conversion Optimization Components */}
      <StickyHeaderCTA />
      <ExitIntentPopup />

      <Header />

      {/* HERO with Christmas Theme + Black Hole */}
      <section
        ref={heroSectionRef}
        id="home"
        className="relative h-[85vh] min-h-[600px] flex items-center overflow-hidden hero-xmas"
        onMouseMove={handleHeroMouseMove}
      >
        {/* 3D Megabot Effect (WebGL) */}
        <Suspense fallback={<div />}>
          <Megabot
            quality={animationQuality}
            trackingTarget={mousePosition}
            buttonBounds={buttonBounds}
            isButtonClicked={isButtonClicked}
            onLaserUpdate={setLaserData}
            onGameStateUpdate={setGameState}
          />
        </Suspense>

        {/* Interactive Missile Game - UI Overlay Only */}
        <Suspense fallback={<div />}>
          <HeroMissileGame
            gameState={gameState}
          />
        </Suspense>

        {/* Quality Settings Control */}
        <QualitySettings
          onChange={(quality) => setAnimationQuality(quality)}
          defaultQuality={animationQuality}
        />

        {/* Interactive hint */}
        <div className="absolute top-24 right-6 z-20 hidden md:block">
          <div className="relative group">
            <div className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-purple-500/30 text-xs text-white/80 hover:text-white hover:border-purple-400/50 transition-all cursor-pointer animate-pulse hover:animate-none shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <circle cx="12" cy="12" r="6" strokeWidth="2" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
                Witness the power of Megabot 🤖
              </span>
            </div>
          </div>
        </div>

        {/* Retro PC Game Box */}
        <a
          href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-20 right-6 z-20 hidden lg:block"
        >
          <div className="retro-game-box rounded-lg p-3 w-48 cursor-pointer">
            <div className="retro-game-box-image rounded overflow-hidden mb-2">
              <Image
                src="/Explore_Epic5.png"
                alt="ETU 2175 PC Game"
                width={180}
                height={120}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="text-center">
              <div className="retro-game-box-title text-white text-xs mb-1">
                ETU 2175
              </div>
              <div className="retro-game-box-subtitle text-white/70 text-[0.65rem]">
                FOR PC • WINDOWS/MAC/LINUX
              </div>
              <div className="mt-2 text-[0.6rem] text-amber-400 font-semibold">
                ★ WISHLIST NOW ★
              </div>
            </div>
          </div>
        </a>

        {/* Optimized background image with gradient overlay (fallback + blend) */}
        <div className="hero-bg-wrapper" style={{ opacity: 0.25 }}>
          <Image
            src="/Explore_Epic5.png"
            alt="Explore the Universe 2175 - Available January 1st"
            className="hero-bg-image"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
          <div className="hero-gradient-overlay"></div>
        </div>

        {/* Minimal hero - lots of space for the mini-game canvas */}
        <div className="relative w-full z-10">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="max-w-4xl mx-auto text-center pt-4">
              {/* Cinematic Hero Title - Minimal silvery blue */}
              <div className="reveal">
                <div className="cinematic-title-container">
                  <h1 className="cinematic-title text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-relaxed">
                    Explore the Universe
                    <br />
                    <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl opacity-80">
                      is now in Alpha Testing
                    </span>
                  </h1>
                </div>

                {/* Subtitle */}
                <p className="cinematic-subtitle text-[10px] sm:text-xs md:text-sm mt-2 opacity-70">
                  The First Real-Time Space RPG with Adaptive AI
                </p>
              </div>

              {/* Primary CTA - Buttons pushed down for canvas space */}
              <div className="reveal mt-[100px] flex flex-row items-center justify-center gap-4 max-w-xl mx-auto">
                {/* Alpha Testing Button - Steam Blue */}
                <Link
                  href="/alpha-testing"
                  ref={steamButtonRef}
                  className="btn-3d btn-3d-steam group text-sm px-6 py-3"
                  onMouseEnter={(e) => handleButtonHover('steam', e)}
                  onMouseMove={(e) => handleButtonHover('steam', e)}
                  onMouseLeave={handleButtonLeave}
                  onClick={handleButtonClick}
                >
                  <svg
                    className="w-5 h-5 transition-transform group-hover:scale-110"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
                  </svg>
                  <span>Alpha Testing</span>
                </Link>

                {/* Learn More Button - Red */}
                <a
                  href="#features"
                  className="btn-3d btn-3d-red group text-sm px-6 py-3"
                >
                  <svg
                    className="w-4 h-4 transition-transform group-hover:scale-110"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Learn More</span>
                </a>
              </div>

              {/* Minimal scroll indicator */}
              <div className="reveal mt-8 opacity-40 hover:opacity-70 transition-opacity">
                <a href="#features" aria-label="Scroll to features">
                  <svg className="w-5 h-5 animate-bounce mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why ETU Changes Everything - Above the Fold */}
      <section
        id="why-etu"
        className="py-20 bg-gradient-to-b from-deep-900 via-indigo-950/20 to-deep-900 border-y border-cyan-500/20"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Why ETU 2175 Changes Everything
            </h2>
            <p className="mt-4 text-xl text-slate-300">
              Three revolutionary systems that set this space RPG apart
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Living AI Opponent */}
            <article className="reveal p-8 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent ring-2 ring-cyan-500/20 hover:ring-cyan-400/40 transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden ring-2 ring-cyan-400/30 group-hover:scale-110 transition-transform">
                  <Image
                    src="/ai_systems.jpg"
                    alt="AI Systems"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-2xl font-bold text-cyan-300">Living AI Opponent</h3>
              </div>
              <p className="text-base text-slate-200 leading-relaxed">
                <span className="font-semibold text-white">MEGABOT doesn&apos;t follow a script</span>—it studies your tactics and evolves. Beat it with missiles? Next encounter, it deploys countermeasures. Every player faces a unique boss.
              </p>
              <div className="mt-4 pt-4 border-t border-cyan-500/20">
                <span className="text-sm text-cyan-400 font-medium">
                  ✓ Adaptive behavior patterns • ✓ Memory system • ✓ Tactical evolution
                </span>
              </div>
            </article>

            {/* Real Physics */}
            <article className="reveal p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent ring-2 ring-amber-500/20 hover:ring-amber-400/40 transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden ring-2 ring-amber-400/30 group-hover:scale-110 transition-transform">
                  <Image
                    src="/physics.jpg"
                    alt="Physics Systems"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-2xl font-bold text-amber-300">Real Physics, Real Consequences</h3>
              </div>
              <p className="text-base text-slate-200 leading-relaxed">
                <span className="font-semibold text-white">Built in Rust with NASA-grade orbital mechanics.</span> Your fuel matters. Your velocity vector matters. Gravity assists, orbital transfers—this isn&apos;t arcade space.
              </p>
              <div className="mt-4 pt-4 border-t border-amber-500/20">
                <span className="text-sm text-amber-400 font-medium">
                  ✓ True Newtonian physics • ✓ Orbital mechanics • ✓ Resource management
                </span>
              </div>
            </article>

            {/* Deep RPG Progression */}
            <article className="reveal p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent ring-2 ring-purple-500/20 hover:ring-purple-400/40 transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden ring-2 ring-purple-400/30 group-hover:scale-110 transition-transform">
                  <Image
                    src="/upgrade.jpg"
                    alt="Upgrade Systems"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-2xl font-bold text-purple-300">Deep RPG Progression</h3>
              </div>
              <p className="text-base text-slate-200 leading-relaxed">
                <span className="font-semibold text-white">Full character leveling • Weapon ability trees • Modular ship upgrades</span> • Permanent choices that shape your playthrough. This is a true RPG in space.
              </p>
              <div className="mt-4 pt-4 border-t border-purple-500/20">
                <span className="text-sm text-purple-400 font-medium">
                  ✓ Character progression • ✓ Skill trees • ✓ Meaningful choices
                </span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Latest Devlog - Compressed */}
      <section
        id="news"
        className="reveal py-10 border-t border-white/10 bg-gradient-to-b from-deep-900/50 to-deep-800/30"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Latest Devlog</h2>
              <p className="text-sm text-slate-400 mt-1">Deep dives on AI, physics, and worldbuilding</p>
            </div>
            <Link href="/backlog" className="text-sm text-cyan-400 hover:text-cyan-300 underline decoration-dotted transition-colors">
              Read more →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <article className="reveal rounded-xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition group">
              <div className="relative w-full aspect-[2/1] overflow-hidden">
                <Image
                  src="/ai_systems.jpg"
                  alt="Adaptive Faction AI"
                  width={400}
                  height={200}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-deep-900/40 to-transparent"></div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-base">Adaptive Faction AI</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  How empires grow, battles are lost and won, and negotiate over time and expand and contract their borders.
                </p>
              </div>
            </article>
            <article className="reveal rounded-xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition group">
              <div className="relative w-full aspect-[2/1] overflow-hidden">
                <Image
                  src="/physics.jpg"
                  alt="Flight & Orbital Mechanics"
                  width={400}
                  height={200}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-deep-900/40 to-transparent"></div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-base">Flight & Orbital Mechanics</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  The First game EVER to feature realistic models of Black Hole Physics.
                </p>
              </div>
            </article>
            <article className="reveal rounded-xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition group">
              <div className="relative w-full aspect-[2/1] overflow-hidden">
                <Image
                  src="/Megabot1.png"
                  alt="Open World Bosses"
                  width={400}
                  height={200}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-deep-900/40 to-transparent"></div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-base">Open World Bosses</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Zone Based Combat Evolution with Bosses that Hunt.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="reveal border-t border-white/10 bg-deep-800/40">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-slate-300/80 text-sm">
          <div className="flex items-center gap-6 flex-wrap">
            <span className="uppercase tracking-widest text-slate-400">Powered by</span>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <span className="text-cyan-400">⚛️</span>
              <span className="text-xs">Realistic Physics</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
              <span className="text-purple-400">🤖</span>
              <span className="text-xs">Adaptive AI</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-indigo-400">🌌</span>
              <span className="text-xs">Procedural Generation</span>
            </div>
          </div>
          <div>
            <Link href="/press-kit" className="underline decoration-dotted hover:text-white transition-colors">
              Press Kit
            </Link>
          </div>
        </div>
      </section>

      {/* Official Cinematic Trailer */}
      <section
        id="trailer"
        className="reveal py-16 bg-gradient-to-b from-deep-800/40 to-deep-900"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="relative aspect-video rounded-2xl overflow-hidden ring-2 ring-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.3)]">
                <video
                  controls
                  poster="/Explore_Epic5.png"
                  className="w-full h-full object-cover bg-black"
                  preload="metadata"
                >
                  <source src="/ETU_Cinematic_Trailer_4K.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
            <div className="space-y-4 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-xs font-semibold text-red-300">
                  Official Trailer
                </span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold">
                Experience the Galaxy
              </h3>
              <p className="text-lg text-slate-300/90 leading-relaxed">
                Watch deep-space traversal, intense station sieges, and faction AI in motion. See why commanders are calling it the most immersive space game ever created.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.7)] transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
                  </svg>
                  Wishlist on Steam
                </a>
                <Link
                  href="/leaderboard"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold border border-white/20 hover:bg-white/5 transition-all"
                >
                  View Leaderboard
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Gallery */}
      <section className="py-20 bg-gradient-to-b from-deep-900 to-deep-800 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              More Videos & Footage
            </h2>
            <p className="mt-4 text-xl text-slate-300">
              Dive deeper into the universe with gameplay footage and animations
            </p>
          </header>

          <div className="grid md:grid-cols-2 gap-8">
            <article className="reveal group">
              <div className="relative aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-cyan-500/50 transition-all">
                <video
                  controls
                  poster="/Explore_Epic5.png"
                  className="w-full h-full object-cover bg-black"
                  preload="metadata"
                >
                  <source src="Explore the Universe 2175 – Open-World Space Combat, Base Building & AI Factions.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-bold text-cyan-300">Gameplay Footage</h3>
                <p className="text-slate-300 mt-2">Watch real gameplay showcasing combat mechanics, ship customization, and faction interactions in action.</p>
              </div>
            </article>

            <article className="reveal group">
              <div className="relative aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-blue-500/50 transition-all">
                <video
                  controls
                  poster="/logo2.png"
                  className="w-full h-full object-cover bg-black"
                  preload="metadata"
                >
                  <source src="/ETU_Logo2.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-bold text-blue-300">Logo Animation</h3>
                <p className="text-slate-300 mt-2">Experience the mesmerizing animated logo reveal that sets the tone for your space adventure.</p>
              </div>
            </article>

            <article className="reveal group">
              <div className="relative aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-purple-500/50 transition-all">
                <video
                  controls
                  poster="/Explore_Epic5.png"
                  className="w-full h-full object-cover bg-black"
                  preload="metadata"
                >
                  <source src="/Quasar1.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-bold text-purple-300">Quasar Environment</h3>
                <p className="text-slate-300 mt-2">Explore the stunning space environments featuring quasars, nebulae, and cosmic phenomena.</p>
              </div>
            </article>

            <article className="reveal group">
              <div className="relative aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-indigo-500/50 transition-all">
                <video
                  controls
                  poster="/Explore_Epic5.png"
                  className="w-full h-full object-cover bg-black"
                  preload="metadata"
                >
                  <source src="/u3172841634__--ar_11_--video_1_--end_httpss.mj.runAlLxrf1zR6w_fc74704f-b0b3-4d69-a6e6-d2da06d47faa_0.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-bold text-indigo-300">Universe Exploration</h3>
                <p className="text-slate-300 mt-2">Journey through the procedurally generated galaxy and discover what awaits among the stars.</p>
              </div>
            </article>
          </div>

          <div className="reveal text-center mt-12">
            <a
              href="/press-kit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 font-semibold transition-all"
            >
              <span>Download All Media</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="py-20 bg-gradient-to-b from-deep-800 to-deep-900 border-t border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold">
              Why this galaxy feels alive
            </h2>
            <p className="mt-3 text-slate-300">
              Systems-driven gameplay meets astrophysical authenticity. Every
              star, orbit, and economy matters.
            </p>
          </header>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <article className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <h3 className="font-semibold text-lg text-cyan-300">Master True Orbital Combat</h3>
              <p className="mt-2 text-sm text-slate-300/90">
                Plan gravity assists to ambush enemies. Manage delta-v for escape burns. Dogfights with Newtonian physics that reward tactical thinking.
              </p>
            </article>
            <article className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <h3 className="font-semibold text-lg text-amber-300">Your Choices Reshape The Galaxy</h3>
              <p className="mt-2 text-sm text-slate-300/90">
                Ally with Crystals? Mycelari expand unchecked. Destroy a faction&apos;s home station? They become nomadic raiders. Every decision has consequences.
              </p>
            </article>
            <article className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <h3 className="font-semibold text-lg text-purple-300">Battle MEGABOT: The Boss That Learns</h3>
              <p className="mt-2 text-sm text-slate-300/90">
                Multi-phase station-scale encounters. Adaptive tactics. Evolving weaknesses. No two players fight the same MEGABOT.
              </p>
            </article>
            <article className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <h3 className="font-semibold text-lg text-emerald-300">Build Your Economic Empire</h3>
              <p className="mt-2 text-sm text-slate-300/90">
                Dominate trade routes, smuggle contraband, establish mining operations, and unlock powerful research trees that shape your playstyle.
              </p>
            </article>
            <article className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <h3 className="font-semibold text-lg text-indigo-300">Explore Infinite Possibilities</h3>
              <p className="mt-2 text-sm text-slate-300/90">
                Every galaxy is procedurally generated with unique star systems, hidden secrets, and handcrafted story moments waiting to be discovered.
              </p>
            </article>
            <article className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <h3 className="font-semibold text-lg text-rose-300">Compete on the Global Stage</h3>
              <p className="mt-2 text-sm text-slate-300/90">
                Prove your mastery in speedruns, faction influence rankings, and discovery leaderboards. See how you stack up against commanders worldwide.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Game Systems Showcase */}
      <section className="py-20 bg-gradient-to-b from-deep-900 to-deep-800 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Next-Gen Game Systems
            </h2>
            <p className="mt-4 text-xl text-slate-300">
              Revolutionary technology that brings the universe to life
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            <article className="reveal group rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-cyan-500/50 transition-all">
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src="/ai_systems.jpg"
                  alt="Adaptive AI Systems"
                  width={600}
                  height={400}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-deep-900/50 to-transparent"></div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-cyan-300 mb-3">Adaptive AI</h3>
                <p className="text-slate-300 leading-relaxed">
                  Face enemies that learn from your tactics. MEGABOT evolves with each encounter, analyzing your strategies and adapting its defenses. No two battles are ever the same.
                </p>
              </div>
            </article>

            <article className="reveal group rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-blue-500/50 transition-all">
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src="/physics.jpg"
                  alt="Realistic Physics Systems"
                  width={600}
                  height={400}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-deep-900/50 to-transparent"></div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-blue-300 mb-3">NASA-Grade Physics</h3>
                <p className="text-slate-300 leading-relaxed">
                  Experience true Newtonian orbital mechanics. Plan gravity assists, manage delta-v budgets, and master realistic space combat where every action has an equal and opposite reaction.
                </p>
              </div>
            </article>

            <article className="reveal group rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-purple-500/50 transition-all">
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src="/upgrade.jpg"
                  alt="Ship Upgrade Systems"
                  width={600}
                  height={400}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-deep-900/50 to-transparent"></div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-purple-300 mb-3">Deep Customization</h3>
                <p className="text-slate-300 leading-relaxed">
                  Craft your perfect starship with modular upgrades. From weapons to shields, engines to sensors—every component affects your ship&apos;s performance and your playstyle.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Emergent Upgrades */}
      <section
        id="progression"
        className="py-20 bg-gradient-to-b from-deep-800 via-deep-900 to-deep-800"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-4xl md:text-5xl font-bold">
              Progression That Matters
            </h2>
            <p className="mt-4 text-xl text-slate-300">
              Your journey from rookie to legend—every choice shapes your playstyle
            </p>
          </header>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Journey Visual */}
            <div className="reveal space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 ring-2 ring-green-500/30 border-l-4 border-green-400">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🔰</span>
                  <h3 className="text-xl font-bold text-green-300">Early Game</h3>
                </div>
                <p className="text-slate-200">
                  Scavenge resources. Master flight controls. Survive your first faction encounters. Learn the basics of orbital combat.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 ring-2 ring-blue-500/30 border-l-4 border-blue-400">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">⚡</span>
                  <h3 className="text-xl font-bold text-blue-300">Mid Game</h3>
                </div>
                <p className="text-slate-200">
                  Unlock weapon abilities. Choose faction allegiances. Hunt legendary loot. Upgrade your ship with modular components.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 ring-2 ring-purple-500/30 border-l-4 border-purple-400">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">👑</span>
                  <h3 className="text-xl font-bold text-purple-300">End Game</h3>
                </div>
                <p className="text-slate-200">
                  Face evolved MEGABOT. Master all ship classes. Dominate leaderboards. Shape the fate of entire civilizations.
                </p>
              </div>
            </div>

            {/* Progression Systems */}
            <div className="reveal space-y-4">
              <h3 className="text-2xl font-bold mb-6 text-center lg:text-left">
                Deep RPG Systems
              </h3>

              <div className="p-5 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">📊</span>
                  <div>
                    <h4 className="font-semibold text-lg text-cyan-300">Character XP & Skill Trees</h4>
                    <p className="text-sm text-slate-300 mt-1">
                      Level up your pilot across combat, engineering, and exploration specializations. Unlock permanent bonuses and abilities.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">⚔️</span>
                  <div>
                    <h4 className="font-semibold text-lg text-amber-300">Weapon Mastery Progression</h4>
                    <p className="text-sm text-slate-300 mt-1">
                      Each weapon type has its own progression tree. Master missiles, lasers, railguns, and experimental tech.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🚀</span>
                  <div>
                    <h4 className="font-semibold text-lg text-purple-300">Ship Module Research</h4>
                    <p className="text-sm text-slate-300 mt-1">
                      Research advanced engines, shields, sensors, and special systems. Customize your ship for your playstyle.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">💾</span>
                  <div>
                    <h4 className="font-semibold text-lg text-emerald-300">Permanent Save System</h4>
                    <p className="text-sm text-slate-300 mt-1">
                      Your choices persist across playthroughs. Multiple difficulty modes reward different strategies.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🎯</span>
                  <div>
                    <h4 className="font-semibold text-lg text-rose-300">Meaningful Choices</h4>
                    <p className="text-sm text-slate-300 mt-1">
                      Ally with a faction and gain unique ships. Betray them and face consequences. Every decision reshapes your galaxy.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="reveal text-center">
            <p className="text-lg text-slate-300 mb-4">
              Ready to start your journey?
            </p>
            <a
              href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
              target="_blank"
              rel="noopener noreferrer"
              className="steam-btn group inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg"
            >
              <span>Wishlist on Steam - It&apos;s FREE</span>
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Factions */}
      <section
        id="factions"
        className="py-20 bg-gradient-to-b from-deep-900 to-deep-800"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal max-w-3xl mb-8">
            <h2 className="text-3xl md:text-4xl font-bold">
              Factions shaping the galaxy
            </h2>
            <p className="mt-2 text-slate-300">
              From crystalline intellects to mycelial swarms, each civilization
              plays by its own rules.
            </p>
          </header>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/factions/crystal-intelligences" className="reveal group p-5 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-indigo-400/40 transition hover:scale-105 duration-300">
              <div className="relative rounded-xl mb-3 aspect-[16/9] overflow-hidden">
                <Image
                  src="/Crystal_Race.jpg"
                  alt="Crystal Intelligences"
                  width={400}
                  height={225}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-deep-900/20 to-transparent"></div>
              </div>
              <h3 className="font-semibold">CYL • Crystal Intelligences</h3>
              <p className="text-sm text-slate-300/90">
                Light-bending defenses and precision strikes.
              </p>
              <div className="mt-3 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more →
              </div>
            </Link>
            <Link href="/factions/mycelari" className="reveal group p-5 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-indigo-400/40 transition hover:scale-105 duration-300">
              <div className="relative rounded-xl mb-3 aspect-[16/9] overflow-hidden">
                <Image
                  src="/Mycelari_Hero2.jpg"
                  alt="Mycelari Fungal Swarm"
                  width={400}
                  height={225}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-deep-900/20 to-transparent"></div>
              </div>
              <h3 className="font-semibold">Mycelari • Fungal Swarm</h3>
              <p className="text-sm text-slate-300/90">
                Spore-based expansion and biomass economy.
              </p>
              <div className="mt-3 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more →
              </div>
            </Link>
            <Link href="/factions/megabot" className="reveal group p-5 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-indigo-400/40 transition hover:scale-105 duration-300">
              <div className="relative rounded-xl mb-3 aspect-[16/9] overflow-hidden">
                <Image
                  src="/eveil_robot_hero1.jpg"
                  alt="Megabot Machine Empire"
                  width={400}
                  height={225}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-deep-900/20 to-transparent"></div>
              </div>
              <h3 className="font-semibold">Megabot • Machine Empire</h3>
              <p className="text-sm text-slate-300/90">
                Modular forms, overwhelming firepower, station-scale bosses.
              </p>
              <div className="mt-3 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more →
              </div>
            </Link>
            <Link href="/factions/wild" className="reveal group p-5 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-indigo-400/40 transition hover:scale-105 duration-300">
              <div className="relative rounded-xl mb-3 aspect-[16/9] overflow-hidden">
                <Image
                  src="/Wild_Race.jpg"
                  alt="Wild Ent-born Guardians"
                  width={400}
                  height={225}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-deep-900/20 to-transparent"></div>
              </div>
              <h3 className="font-semibold">Wild • Ent-born Guardians</h3>
              <p className="text-sm text-slate-300/90">
                Pollen-based growth and terrain control.
              </p>
              <div className="mt-3 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more →
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Screenshot Gallery */}
      <section className="py-20 bg-gradient-to-b from-deep-800 to-deep-900 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Experience the Universe
            </h2>
            <p className="mt-4 text-xl text-slate-300">
              Stunning visuals from across the galaxy
            </p>
          </header>

          <div className="grid md:grid-cols-2 gap-6">
            <article className="reveal group relative overflow-hidden rounded-2xl ring-1 ring-white/10 hover:ring-cyan-500/50 transition-all">
              <div className="relative aspect-video">
                <Image
                  src="/etu_epic7.png"
                  alt="Epic gameplay showcase"
                  width={800}
                  height={450}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-transparent to-transparent opacity-60"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">Epic Space Battles</h3>
                  <p className="text-slate-200 mt-1">Engage in intense combat across the stars</p>
                </div>
              </div>
            </article>

            <article className="reveal group relative overflow-hidden rounded-2xl ring-1 ring-white/10 hover:ring-blue-500/50 transition-all">
              <div className="relative aspect-video">
                <Image
                  src="/ETC_Offish_cover6.png"
                  alt="Official game cover"
                  width={800}
                  height={450}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-transparent to-transparent opacity-60"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">Explore Unknown Worlds</h3>
                  <p className="text-slate-200 mt-1">Discover secrets in procedurally generated galaxies</p>
                </div>
              </div>
            </article>

            <article className="reveal group relative overflow-hidden rounded-2xl ring-1 ring-white/10 hover:ring-purple-500/50 transition-all">
              <div className="relative aspect-video">
                <Image
                  src="/etugp1.jpg"
                  alt="In-game screenshot"
                  width={800}
                  height={450}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-transparent to-transparent opacity-60"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">Master Your Ship</h3>
                  <p className="text-slate-200 mt-1">Navigate with NASA-grade physics</p>
                </div>
              </div>
            </article>

            <article className="reveal group relative overflow-hidden rounded-2xl ring-1 ring-white/10 hover:ring-red-500/50 transition-all">
              <div className="relative aspect-video">
                <Image
                  src="/Megabot1.png"
                  alt="Megabot faction showcase"
                  width={800}
                  height={450}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-transparent to-transparent opacity-60"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">Face MEGABOT Empire</h3>
                  <p className="text-slate-200 mt-1">Battle the adaptive AI boss that evolves</p>
                </div>
              </div>
            </article>
          </div>

          <div className="reveal text-center mt-12">
            <a
              href="/press-kit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 font-semibold transition-all"
            >
              <span>View Full Press Kit</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Steam Wishlist + Leaderboard Section */}
      <section
        id="leaderboard"
        className="reveal py-20 border-t border-white/10 bg-gradient-to-b from-deep-900 to-deep-800"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          {/* STEAM WISHLIST HERO */}
          <div className="mb-16 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b2838] via-[#2a475e] to-[#1b2838] p-8 lg:p-12 shadow-2xl">
            {/* Animated background glow */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#66c0f4] rounded-full blur-[120px] animate-pulse"></div>
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#1b2838] rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 grid lg:grid-cols-2 gap-8 items-center">
              {/* Left: Compelling Copy */}
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#66c0f4]/20 border border-[#66c0f4]/40 mb-6">
                  <svg
                    className="w-5 h-5 text-[#66c0f4]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
                  </svg>
                  <span className="text-sm font-semibold text-[#66c0f4]">
                    Now on Steam
                  </span>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                  Command <span className="text-[#66c0f4]">Invasions</span>, Battle AI
                </h2>

                <p className="text-lg text-slate-200/90 mb-6 leading-relaxed">
                  Wishlist <strong>Explore the Universe 2175</strong> on Steam to
                  get notified on launch day, support development, and help us
                  climb the ranks. Your wishlist matters!
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  {/* Primary Steam Wishlist Button */}
                  <a
                    href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="steam-wishlist-btn group inline-flex items-center justify-center gap-3 px-8 py-5 rounded-xl font-bold text-lg transition-all duration-300 shadow-2xl hover:shadow-[0_0_40px_rgba(102,192,244,0.6)] hover:scale-105"
                  >
                    <svg
                      className="w-7 h-7 transition-transform group-hover:scale-110"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
                    </svg>
                    <span>Wishlist on Steam</span>
                    <svg
                      className="w-5 h-5 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </a>

                  {/* Secondary: View Store Page */}
                  <a
                    href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-5 rounded-xl font-semibold text-base bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all"
                  >
                    <span>View Store Page</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>

                {/* Social Proof Stats */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>
                      <strong>Free Demo</strong> Available
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Visual Element */}
              <div className="hidden lg:block relative">
                <div className="relative">
                  {/* Steam Card Mockup */}
                  <div className="bg-[#0e141b] rounded-xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300">
                    <div className="aspect-video bg-gradient-to-br from-indigo-900/50 to-purple-900/50 flex items-center justify-center overflow-hidden">
                      <Image
                        src="/Megabot1.png"
                        alt="ETU Game Preview"
                        className="w-full h-full object-cover opacity-90"
                        width={400}
                        height={225}
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-1">
                        Explore the Universe 2175
                      </h3>
                      <p className="text-sm text-slate-400 mb-3">
                        Open-World Space Simulation
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-yellow-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm font-semibold text-[#66c0f4]">
                            Wishlist Now
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Windows • macOS • Linux
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating badges */}
                  <div className="absolute -top-4 -right-4 bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg animate-bounce">
                    FREE DEMO
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Global Leaderboard (Social Proof) */}
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <header>
                <h3 className="text-2xl md:text-3xl font-bold">
                  Top Commanders This Week
                </h3>
                <p className="text-slate-300/90 mt-1">
                  Join them—wishlist now and compete for glory when we launch!
                </p>
              </header>
              <Link
                href="/leaderboard"
                className="btn-warp px-5 py-3 rounded-lg font-semibold hover:scale-105 transition-transform"
              >
                View Full Leaderboard →
              </Link>
            </div>

            <div className="overflow-x-auto rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead className="text-slate-300/80 bg-white/5">
                  <tr className="border-b border-white/10">
                    <th className="py-4 px-4 font-semibold">Rank</th>
                    <th className="py-4 px-4 font-semibold">Commander</th>
                    <th className="py-4 px-4 font-semibold">Mode</th>
                    <th className="py-4 px-4 font-semibold">Score</th>
                    <th className="py-4 px-4 font-semibold">Best Time</th>
                    <th className="py-4 px-4 font-semibold">Last Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {leaderboardData.map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4">
                        {i < 3 ? (
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                              i === 0
                                ? "bg-yellow-500/20 text-yellow-400"
                                : i === 1
                                ? "bg-slate-400/20 text-slate-300"
                                : "bg-orange-500/20 text-orange-400"
                            } font-bold`}
                          >
                            {row.rank}
                          </span>
                        ) : (
                          row.rank
                        )}
                      </td>
                      <td className="py-4 px-4 font-semibold">{row.name}</td>
                      <td className="py-4 px-4 text-slate-300/80">{row.mode}</td>
                      <td className="py-4 px-4 font-mono text-indigo-400">
                        {row.score.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 font-mono text-green-400">
                        {row.time}
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-xs">
                        {row.updated}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom CTA */}
            <div className="mt-8 text-center p-6 rounded-xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30">
              <p className="text-lg mb-4">
                Want to see <strong>your name</strong> on this leaderboard?{" "}
                <span className="text-indigo-400">Wishlist now</span> and be ready
                for launch day!
              </p>
              <a
                href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#66c0f4] hover:bg-[#5ab2e8] text-[#1b2838] font-bold rounded-lg transition-colors shadow-lg"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
                </svg>
                Wishlist on Steam - It&apos;s Free!
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Closed Alpha Playtesting Event */}
      <section
        id="alpha-testing"
        className="py-20 bg-gradient-to-b from-deep-900 via-cyan-950/20 to-deep-900 border-y border-cyan-500/30 relative overflow-hidden"
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-cyan-500 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-6 relative z-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/40 backdrop-blur-sm mb-6">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <span className="text-sm font-bold text-cyan-100 uppercase tracking-wider">
                ✨ Applications Open
              </span>
            </div>

            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                ✨ CLOSED ALPHA PLAYTESTING!
              </span>
            </h2>

            <p className="text-2xl md:text-3xl font-bold text-white mb-2">
              Help Shape the Future of ETU 2175
            </p>

            <div className="flex justify-center mb-8">
              <CountdownTimer targetDate="2025-12-31T23:59:59" label="ALPHA TESTING STARTS IN" />
            </div>
          </div>

          {/* Alpha Testing Benefits */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="reveal p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 ring-2 ring-cyan-500/30 hover:ring-cyan-400/50 transition-all text-center">
              <div className="text-5xl mb-4">⚖️</div>
              <h3 className="text-xl font-bold text-cyan-300 mb-3">
                Shape Game Balance
              </h3>
              <p className="text-slate-200 text-sm">
                Help fine-tune gameplay mechanics, weapon systems, and faction balance to create the ultimate space combat experience!
              </p>
            </div>

            <div className="reveal p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 ring-2 ring-purple-500/30 hover:ring-purple-400/50 transition-all text-center">
              <div className="text-5xl mb-4">🧠</div>
              <h3 className="text-xl font-bold text-purple-300 mb-3">
                Test AI Difficulty Modes
              </h3>
              <p className="text-slate-200 text-sm">
                Experience our adaptive AI systems first-hand and help us perfect difficulty curves for all player types!
              </p>
            </div>

            <div className="reveal p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 ring-2 ring-amber-500/30 hover:ring-amber-400/50 transition-all text-center">
              <div className="text-5xl mb-4">🎁</div>
              <h3 className="text-xl font-bold text-amber-300 mb-3">
                Exclusive Alpha Tester Rewards
              </h3>
              <p className="text-slate-200 text-sm">
                Receive unique cosmetic items, special badges, and recognition in the game credits as a founding tester!
              </p>
            </div>
          </div>

          {/* Main CTA */}
          <div className="reveal text-center p-8 rounded-2xl bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-cyan-600/20 ring-2 ring-indigo-500/40 backdrop-blur-sm">
            <p className="text-xl text-slate-100 mb-6">
              <strong className="text-2xl text-cyan-300">Be Among the First to Explore!</strong><br />
              Limited alpha testing slots available. Apply now to secure your spot.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/alpha-testing"
                className="group inline-flex items-center gap-3 px-8 py-5 rounded-xl font-bold text-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white"
              >
                <svg className="w-7 h-7 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span>✨ APPLY FOR ALPHA ACCESS</span>
              </Link>
            </div>

            <p className="mt-6 text-sm text-slate-400">
              Join our elite group of alpha testers and help shape the future
            </p>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section
        id="roadmap"
        className="reveal py-20 bg-gradient-to-b from-deep-800/30 to-deep-900"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold">Roadmap</h2>
            <p className="mt-2 text-slate-300">
              Follow development from Alpha to 1.0 and beyond.
            </p>
          </header>
          <ol className="mt-10 grid md:grid-cols-3 gap-6">
            <li className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10">
              <h3 className="font-semibold">Alpha</h3>
              <ul className="mt-2 text-sm list-disc pl-5 text-slate-300/90">
                <li>Core flight & combat</li>
                <li>2 factions playable</li>
                <li>Leaderboard v1</li>
              </ul>
            </li>
            <li className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10">
              <h3 className="font-semibold">Beta</h3>
              <ul className="mt-2 text-sm list-disc pl-5 text-slate-300/90">
                <li>Story arcs & bosses</li>
                <li>Co-op stats & events</li>
                <li>Market & crafting</li>
              </ul>
            </li>
            <li className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10">
              <h3 className="font-semibold">1.0</h3>
              <ul className="mt-2 text-sm list-disc pl-5 text-slate-300/90">
                <li>Full faction roster</li>
                <li>Endgame systems</li>
                <li>Modding tools</li>
              </ul>
            </li>
          </ol>
        </div>
      </section>

      {/* Download / CTA */}
      <section
        id="download"
        className="reveal py-16 bg-gradient-to-b from-deep-900 to-deep-800"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">
              Download & Wishlist
            </h2>
            <p className="mt-3 text-slate-300">
              Get early builds, post feedback, and climb the leaderboard.
            </p>
            <p className="mt-4 text-xs text-slate-400">
              Requires 8 GB RAM, 4-core CPU, integrated or discrete GPU. ~2.5 GB
              free space.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 ring-1 ring-white/10">
            <h3 className="font-semibold">Join the Alpha</h3>
            <p className="text-sm text-slate-300/90 mt-1">
              Get keys, patch notes, and event invites.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="btn-warp px-5 py-3 rounded-lg text-center"
              >
                Sign Up Now
              </Link>
              <a
                href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-warp-alt px-5 py-3 rounded-lg text-center"
              >
                Wishlist on Steam
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="reveal py-16 border-t border-white/10 bg-deep-800/40"
      >
        <div className="max-w-5xl mx-auto px-4 lg:px-6">
          <h2 className="text-3xl font-bold">FAQ</h2>
          <div className="mt-8 grid md:grid-cols-2 gap-6 text-sm">
            <details
              className="rounded-xl bg-white/5 ring-1 ring-white/10 p-5"
              open
            >
              <summary className="font-semibold cursor-pointer">
                Is this single-player or multiplayer?
              </summary>
              <p className="mt-2 text-slate-300/90">
                Primarily single-player with online scoreboards and live events.
                Co-op and PvP is planned, but not in production yet.
              </p>
            </details>
            <details className="rounded-xl bg-white/5 ring-1 ring-white/10 p-5">
              <summary className="font-semibold cursor-pointer">
                How realistic is the physics?
              </summary>
              <p className="mt-2 text-slate-300/90">
                We model inertial flight and orbits with assists for
                accessibility. &quot;Simulation when you want it.&quot;
              </p>
            </details>
            <details className="rounded-xl bg-white/5 ring-1 ring-white/10 p-5">
              <summary className="font-semibold cursor-pointer">
                Will there be mods?
              </summary>
              <p className="mt-2 text-slate-300/90">
                Yes—tools and APIs post-1.0.
              </p>
            </details>
            <details className="rounded-xl bg-white/5 ring-1 ring-white/10 p-5">
              <summary className="font-semibold cursor-pointer">
                Which platforms?
              </summary>
              <p className="mt-2 text-slate-300/90">
                Windows, macOS, Linux at launch; console evaluation later.
              </p>
            </details>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
