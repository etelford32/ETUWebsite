"use client";

import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Dynamically import StarMap to avoid SSR issues
const StarMap = dynamic(() => import("@/components/StarMap"), { ssr: false });

export default function HomePage() {
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  useEffect(() => {
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
      {/* Top Announcement */}
      <div className="w-full bg-indigo-600/10 border-b border-indigo-500/20 text-center text-sm py-2">
        <span className="mr-3">🚀 Playtest Sign-ups are open</span>
        <a href="#download" className="underline decoration-dotted hover:text-white">
          Join the Alpha
        </a>
      </div>

      <Header />

      {/* HERO with Christmas Theme + 3D Star Map */}
      <section
        id="home"
        className="relative h-[85vh] min-h-[600px] flex items-center overflow-hidden hero-xmas"
      >
        {/* 3D Interactive Star Map (WebGL) */}
        <Suspense fallback={<div />}>
          <StarMap />
        </Suspense>

        {/* Optimized background image with gradient overlay (fallback + blend) */}
        <div className="hero-bg-wrapper" style={{ opacity: 0.2 }}>
          <Image
            src="/ETU_XMAS.png"
            alt="Explore the Universe 2175 - Available December 25th"
            className="hero-bg-image"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
          <div className="hero-gradient-overlay"></div>
        </div>

        {/* Animated particles for depth (keeping for extra sparkle) */}
        <div className="hero-particles" aria-hidden="true"></div>

        {/* Floating light orbs */}
        <div className="hero-light-orbs" aria-hidden="true">
          <div className="light-orb orb-1"></div>
          <div className="light-orb orb-2"></div>
          <div className="light-orb orb-3"></div>
          <div className="light-orb orb-4"></div>
        </div>

        <div className="relative w-full z-10">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="max-w-4xl mx-auto text-center">
              {/* Hero badge */}
              <div className="hero-badge reveal inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-400/30 backdrop-blur-sm mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="text-sm font-medium text-amber-100">
                  🎄 Available December 25th
                </span>
              </div>

              <h1 className="reveal hero-title text-4xl sm:text-5xl md:text-8xl font-bold leading-tight mb-6">
                <span className="hero-gradient-text">
                  The Most Immersive
                  <br />
                  Galaxy Ever Created
                </span>
              </h1>

              <p className="reveal mt-6 text-lg md:text-xl text-slate-100/90 max-w-2xl mx-auto leading-relaxed">
                Explore, trade, build, and battle across a simulated cosmos
                powered by realistic physics and adaptive AI factions.
              </p>

              {/* CTA Buttons with Steam */}
              <div className="reveal mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                {/* Steam Wishlist Button (Primary) */}
                <a
                  href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="steam-btn group inline-flex items-center gap-3 px-6 py-4 rounded-xl font-semibold text-base transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  <svg
                    className="w-6 h-6 transition-transform group-hover:scale-110"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
                  </svg>
                  <span>Wishlist on Steam</span>
                </a>

                {/* Download Button */}
                <a
                  href="#download"
                  className="btn-warp-alt px-6 py-4 rounded-xl font-semibold text-base"
                >
                  Download Alpha
                </a>

                {/* Leaderboard Button */}
                <Link
                  href="/leaderboard"
                  className="btn-minimal px-6 py-4 rounded-xl font-medium text-base"
                >
                  View Leaderboard
                </Link>
              </div>

              {/* Platform info */}
              <div className="reveal mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-300/80">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                  </svg>
                  <span>Windows / macOS / Linux</span>
                </div>
                <span className="text-slate-500">•</span>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 2h6v2h-6zm6.5 8c0 1.11-.89 2-2 2h-3c-1.11 0-2-.89-2-2V9h7m3.5 6c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1M6 9h12V4H6m13 8c-1.1 0-2 .9-2 2v5c0 1.1.9 2 2 2s2-.9 2-2v-5c0-1.1-.9-2-2-2m-14 0c-1.1 0-2 .9-2 2v5c0 1.1.9 2 2 2s2-.9 2-2v-5c0-1.1-.9-2-2-2z" />
                  </svg>
                  <span>Controller + KB/M</span>
                </div>
                <span className="text-slate-500">•</span>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                  </svg>
                  <span>Single-player + Online Stats</span>
                </div>
              </div>

              {/* Scroll indicator */}
              <div className="reveal mt-12">
                <a
                  href="#features"
                  className="scroll-indicator inline-flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="Scroll to features"
                >
                  <span className="text-xs uppercase tracking-wider">
                    Scroll to explore
                  </span>
                  <svg
                    className="w-6 h-6 animate-bounce"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="reveal border-t border-white/10 bg-deep-800/40">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-slate-300/80 text-sm">
          <div className="flex items-center gap-6">
            <span className="uppercase tracking-widest">Powered by</span>
            <Image
              src="/media/badges/physics.svg"
              className="h-6 opacity-80"
              alt="Realistic physics"
              width={24}
              height={24}
              loading="lazy"
            />
            <Image
              src="/media/badges/ai.svg"
              className="h-6 opacity-80"
              alt="Adaptive AI"
              width={24}
              height={24}
              loading="lazy"
            />
            <Image
              src="/media/badges/procgen.svg"
              className="h-6 opacity-80"
              alt="Procedural generation"
              width={24}
              height={24}
              loading="lazy"
            />
          </div>
          <div>
            <a href="#press" className="underline decoration-dotted">
              Press Kit
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="py-20 bg-gradient-to-b from-deep-800/30 to-deep-900"
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
              <h3 className="font-semibold text-lg">Realistic Spaceflight</h3>
              <p className="mt-2 text-sm text-slate-300/90">
                Inertial navigation, orbital mechanics, and fuel-aware
                trajectories—accessible with helpful assists.
              </p>
            </article>
            <article className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <h3 className="font-semibold text-lg">Dynamic Factions</h3>
              <p className="mt-2 text-sm text-slate-300/90">
                AI civilizations expand, trade, and wage war. Your choices shift
                the balance.
              </p>
            </article>
            <article className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <h3 className="font-semibold text-lg">Evolving Economy</h3>
              <p className="mt-2 text-sm text-slate-300/90">
                Simulated markets, smuggling routes, mining, crafting, and
                research trees.
              </p>
            </article>
            <article className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <h3 className="font-semibold text-lg">Boss Encounters</h3>
              <p className="mt-2 text-sm text-slate-300/90">
                Multi-phase entities and station-scale fights with environmental
                hazards.
              </p>
            </article>
            <article className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <h3 className="font-semibold text-lg">Procedural Galaxies</h3>
              <p className="mt-2 text-sm text-slate-300/90">
                Seeded star maps with handcrafted points of interest and story
                arcs.
              </p>
            </article>
            <article className="reveal p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <h3 className="font-semibold text-lg">Online Scoreboard</h3>
              <p className="mt-2 text-sm text-slate-300/90">
                Challenge the community in time trials, discoveries, and faction
                influence.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Trailer */}
      <section
        id="trailer"
        className="reveal py-14 border-t border-white/10 bg-deep-800/40"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="grid lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2">
              <div className="relative aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10">
                <video
                  controls
                  poster="/media/trailer-poster.jpg"
                  className="w-full h-full object-cover"
                  preload="none"
                >
                  <source src="/ETU1.mp4#t=40" type="video/mp4" />
                  <source src="/media/trailer.webm#t=40" type="video/webm" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold">Watch the Trailer</h3>
              <p className="text-slate-300/90">
                Deep-space traversal, station sieges, and faction AI in motion.
              </p>
              <div className="flex gap-3">
                <a href="#download" className="btn-warp px-4 py-2 rounded-md">
                  Join Alpha
                </a>
                <Link href="/leaderboard" className="btn-warp px-4 py-2 rounded-md">
                  View Scores
                </Link>
              </div>
            </div>
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
            <article className="reveal group p-5 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-indigo-400/40 transition">
              <Image
                src="/Crystal_Race.jpg"
                alt="Crystal AI"
                className="rounded-xl mb-3 aspect-[16/9] object-cover group-hover:opacity-95"
                width={300}
                height={169}
                loading="lazy"
              />
              <h3 className="font-semibold">CYL • Crystal Intelligences</h3>
              <p className="text-sm text-slate-300/90">
                Light-bending defenses and precision strikes.
              </p>
            </article>
            <article className="reveal group p-5 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-indigo-400/40 transition">
              <Image
                src="/Mycelari_Hero2.jpg"
                alt="Mycelari swarm"
                className="rounded-xl mb-3 aspect-[16/9] object-cover group-hover:opacity-95"
                width={300}
                height={169}
                loading="lazy"
              />
              <h3 className="font-semibold">Mycelari • Fungal Swarm</h3>
              <p className="text-sm text-slate-300/90">
                Spore-based expansion and biomass economy.
              </p>
            </article>
            <article className="reveal group p-5 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-indigo-400/40 transition">
              <Image
                src="/eveil_robot_hero1.jpg"
                alt="Megabot empire"
                className="rounded-xl mb-3 aspect-[16/9] object-cover group-hover:opacity-95"
                width={300}
                height={169}
                loading="lazy"
              />
              <h3 className="font-semibold">Megabot • Machine Empire</h3>
              <p className="text-sm text-slate-300/90">
                Modular forms, overwhelming firepower, station-scale bosses.
              </p>
            </article>
            <article className="reveal group p-5 rounded-2xl bg-white/5 ring-1 ring-white/10 hover:ring-indigo-400/40 transition">
              <Image
                src="/Wild_Race.jpg"
                alt="Wild Guardians"
                className="rounded-xl mb-3 aspect-[16/9] object-cover group-hover:opacity-95"
                width={300}
                height={169}
                loading="lazy"
              />
              <h3 className="font-semibold">Wild • Ent-born Guardians</h3>
              <p className="text-sm text-slate-300/90">
                Pollen-based growth and terrain control.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Steam Wishlist + Leaderboard Section */}
      <section
        id="leaderboard"
        className="reveal py-20 border-t border-white/10 bg-gradient-to-b from-deep-800/40 to-deep-900"
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
                  Join <span className="text-[#66c0f4]">Thousands</span> of
                  Commanders
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
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-green-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      <strong>December 25th</strong> Launch
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    <span>
                      <strong>Solo Dev</strong> Passion Project
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
                        src="/ETU_XMAS.png"
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
                  <div className="absolute -bottom-4 -left-4 bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg">
                    DEC 25th
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

      {/* Devlog */}
      <section
        id="news"
        className="reveal py-16 border-t border-white/10 bg-deep-800/40"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-end justify-between">
            <header>
              <h2 className="text-3xl font-bold">Latest Devlog</h2>
              <p className="text-slate-300">
                Deep dives on AI, physics, and worldbuilding.
              </p>
            </header>
            <a href="/devlog" className="underline decoration-dotted">
              Read more →
            </a>
          </div>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <article className="reveal rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <Image
                src="/ai_systems.jpg"
                alt="AI systems"
                className="w-full aspect-[16/9] object-cover"
                width={400}
                height={225}
                loading="lazy"
              />
              <div className="p-5">
                <h3 className="font-semibold">Adaptive Faction AI</h3>
                <p className="text-sm text-slate-300/90 mt-2">
                  How empires grow, fight, and negotiate over time.
                </p>
              </div>
            </article>
            <article className="reveal rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <Image
                src="/physics.jpg"
                alt="Physics"
                className="w-full aspect-[16/9] object-cover"
                width={400}
                height={225}
                loading="lazy"
              />
              <div className="p-5">
                <h3 className="font-semibold">Flight & Orbital Mechanics</h3>
                <p className="text-sm text-slate-300/90 mt-2">
                  Balancing realism with fun assists.
                </p>
              </div>
            </article>
            <article className="reveal rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition">
              <Image
                src="/upgrade.jpg"
                alt="Boss"
                className="w-full aspect-[16/9] object-cover"
                width={400}
                height={225}
                loading="lazy"
              />
              <div className="p-5">
                <h3 className="font-semibold">Designing Station Bosses</h3>
                <p className="text-sm text-slate-300/90 mt-2">
                  Multi-phase challenges and environmental hazards.
                </p>
              </div>
            </article>
          </div>
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
                Co-op stats are planned.
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
