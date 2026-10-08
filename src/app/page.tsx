"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import StickyHeaderCTA from "@/components/StickyHeaderCTA";
import EtuTitle from "@/components/EtuTitle";
import { initPerformanceOptimizations } from "@/lib/performance";

const STEAM_URL =
  "https://store.steampowered.com/app/4094340/Explore_the_Universe_2175/";
const SIGNUP_URL = "/login?mode=signup";

const PILLARS = [
  {
    title: "An AI That Learns You",
    color: "text-cyan-300",
    ring: "ring-cyan-400/25",
    image: "/ai_systems.jpg",
    lead: "MEGABOT doesn't follow a script.",
    body: "It studies your tactics and adapts. Beat it with missiles and the next encounter brings countermeasures. Every player faces a different boss.",
  },
  {
    title: "Real Orbital Physics",
    color: "text-amber-300",
    ring: "ring-amber-400/25",
    image: "/physics.jpg",
    lead: "Built in Rust by a computational astrophysicist.",
    body: "Fuel, velocity and gravity all matter. Slingshot around planets, plan transfers, and make every burn count.",
  },
  {
    title: "A Galaxy That Remembers",
    color: "text-purple-300",
    ring: "ring-purple-400/25",
    image: "/upgrade.jpg",
    lead: "Choices that stick.",
    body: "Level your commander, grow weapon ability trees and refit your ship. Lose your base, keep your knowledge.",
  },
];

const FACTIONS = [
  {
    href: "/factions/crystal-intelligences",
    image: "/Crystal_Race.jpg",
    name: "CYL",
    kind: "Crystal Intelligences",
    blurb: "Light-bending defenses and precision strikes.",
  },
  {
    href: "/factions/mycelari",
    image: "/Mycelari_Hero2.jpg",
    name: "Mycelari",
    kind: "Fungal Swarm",
    blurb: "Spore-based expansion and a biomass economy.",
  },
  {
    href: "/factions/megabot",
    image: "/eveil_robot_hero1.jpg",
    name: "Megabot",
    kind: "Machine Empire",
    blurb: "Modular forms and station-scale bosses.",
  },
  {
    href: "/factions/wild",
    image: "/Wild_Race.jpg",
    name: "Wild",
    kind: "Ent-born Guardians",
    blurb: "Pollen-based growth and terrain control.",
  },
];

export default function HomePage() {
  useEffect(() => {
    initPerformanceOptimizations();

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

    return () => io.disconnect();
  }, []);

  return (
    <>
      <StickyHeaderCTA />
      <ExitIntentPopup />

      <Header />

      {/* HERO — brand, pitch, then Wishlist › Playtest › Sign up */}
      <section
        id="home"
        className="relative min-h-[100svh] flex items-center overflow-hidden"
      >
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/etu_epic.png"
            className="w-full h-full"
            style={{ objectFit: "cover", objectPosition: "center" }}
          >
            <source src="/ETU_Vid1.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Darker overlay so the type reads cleanly over the video */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(2,6,23,.45), rgba(2,6,23,.85) 70%), linear-gradient(180deg, rgba(2,6,23,.3), rgba(2,6,23,.6) 60%, #020617)",
          }}
        />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 lg:px-6 pt-24 pb-16 md:pt-28 md:pb-20 text-center">
          <div className="reveal flex justify-center mb-6">
            <span className="etu-pill etu-pill--amber etu-pill--lg">
              <span className="ping" /> Steam Playtest Open Now
            </span>
          </div>

          <EtuTitle
            as="h1"
            text={["Explore the", "Universe 2175"]}
            fit
            className="mx-auto text-[3.25rem] sm:text-7xl md:text-8xl lg:text-[8rem] xl:text-[8.75rem]"
          />

          <p
            className="reveal mt-4 font-display uppercase tracking-[0.3em] text-sm md:text-lg text-slate-300"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,.9)" }}
          >
            A game by Elliot Telford
          </p>

          <p
            className="reveal mt-8 mx-auto max-w-4xl text-2xl md:text-4xl font-semibold text-white leading-snug text-balance"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,.9)" }}
          >
            Real orbital physics. An AI that learns how you fight.
            A galaxy that remembers.
          </p>

          <p
            className="reveal mt-4 mx-auto max-w-2xl text-lg md:text-2xl text-slate-200 leading-relaxed text-balance"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,.85)" }}
          >
            An open-world space adventure for PC. Join the free playtest now,
            Early Access in 2027.
          </p>

          <div className="reveal mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
            <a
              href={STEAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-3d btn-3d-steam group w-full sm:w-auto text-lg md:text-xl px-6 md:px-10 py-5 whitespace-nowrap"
            >
              <SteamIcon className="w-7 h-7 transition-transform group-hover:scale-110" />
              <span>Wishlist on Steam</span>
            </a>

            <a
              href={STEAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-ghost--lg w-full sm:w-auto justify-center whitespace-nowrap"
            >
              ▶ Join the Free Playtest
            </a>
          </div>

          <p className="reveal mt-6 text-lg md:text-xl text-slate-300">
            Want launch news?{" "}
            <Link
              href={SIGNUP_URL}
              className="font-semibold text-cyan-300 underline decoration-cyan-400/50 underline-offset-4 hover:text-cyan-200 hover:decoration-cyan-200 transition-colors"
            >
              Sign up for updates →
            </Link>
          </p>

          <p className="reveal mt-10 font-display uppercase tracking-[0.2em] text-xs md:text-sm text-slate-400">
            Windows · macOS · Linux&nbsp;&nbsp;|&nbsp;&nbsp;Early Access 2027
          </p>
        </div>
      </section>

      {/* What makes 2175 different */}
      <section
        id="features"
        className="py-24 md:py-32 bg-gradient-to-b from-deep-900 via-indigo-950/20 to-deep-900"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-14 md:mb-20">
            <h2 className="font-display text-4xl md:text-6xl font-bold headline-gradient leading-tight">
              What Makes 2175 Different
            </h2>
          </header>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
            {PILLARS.map((p) => (
              <article
                key={p.title}
                className={`reveal p-8 md:p-10 rounded-2xl bg-white/[0.04] ring-1 ${p.ring}`}
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-white/10 mb-6">
                  <Image
                    src={p.image}
                    alt=""
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className={`font-display text-2xl md:text-3xl font-bold leading-tight ${p.color}`}>
                  {p.title}
                </h3>
                <p className="mt-4 text-lg md:text-xl text-slate-200 leading-relaxed">
                  <span className="font-semibold text-white">{p.lead}</span>{" "}
                  {p.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Official trailer */}
      <section id="trailer" className="reveal py-24 md:py-32 bg-deep-900">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <header className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight">
              Watch the Trailer
            </h2>
            <p className="mt-5 text-lg md:text-2xl text-slate-300 leading-relaxed">
              Deep-space travel, station sieges and faction AI in motion.
            </p>
          </header>

          <div className="relative aspect-video rounded-2xl overflow-hidden ring-2 ring-indigo-500/30 shadow-[0_0_60px_rgba(99,102,241,0.3)]">
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

          <div className="mt-10 flex justify-center">
            <a
              href={STEAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-3d btn-3d-steam group text-lg px-9 py-4"
            >
              <SteamIcon className="w-6 h-6 transition-transform group-hover:scale-110" />
              <span>Wishlist on Steam</span>
            </a>
          </div>
        </div>
      </section>

      {/* Factions */}
      <section
        id="factions"
        className="py-24 md:py-32 bg-gradient-to-b from-deep-900 to-deep-800"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-14">
            <h2 className="font-display text-4xl md:text-6xl font-bold headline-gradient leading-tight">
              Four Factions, One Galaxy
            </h2>
            <p className="mt-5 text-lg md:text-2xl text-slate-300 leading-relaxed">
              Each civilization plays by its own rules.
            </p>
          </header>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FACTIONS.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className="reveal group rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-cyan-400/40 transition"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={f.image}
                    alt={`${f.name}, ${f.kind}`}
                    width={480}
                    height={300}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl font-bold text-white">
                    {f.name}
                  </h3>
                  <p className="mt-1 font-display uppercase tracking-[0.15em] text-sm text-cyan-300">
                    {f.kind}
                  </p>
                  <p className="mt-3 text-base md:text-lg text-slate-300 leading-relaxed">
                    {f.blurb}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — same order as the hero: Wishlist › Playtest › Sign up */}
      <section
        id="download"
        className="relative py-24 md:py-32 bg-gradient-to-b from-deep-800 to-deep-900 border-t border-cyan-500/20 overflow-hidden"
      >
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-14">
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight">
              Join the Mission
            </h2>
            <p className="mt-5 text-lg md:text-2xl text-slate-300 leading-relaxed">
              Three ways to be part of Explore the Universe 2175.
            </p>
          </header>

          <ol className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <CtaCard
              step="01"
              title="Wishlist on Steam"
              body="The single biggest way to help. You'll get notified the moment Early Access launches."
              href={STEAM_URL}
              cta="Wishlist Now"
              featured
            />
            <CtaCard
              step="02"
              title="Play the Playtest"
              body="Free on Steam. Request access, play the current build, and help shape the balance and AI."
              href={STEAM_URL}
              cta="Request Access"
            />
            <CtaCard
              step="03"
              title="Sign Up for Updates"
              body="Create a commander account for devlogs, leaderboards and playtest news."
              href={SIGNUP_URL}
              cta="Create Account"
              internal
            />
          </ol>
        </div>
      </section>

      <Footer />
    </>
  );
}

function CtaCard({
  step,
  title,
  body,
  href,
  cta,
  featured = false,
  internal = false,
}: {
  step: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  featured?: boolean;
  internal?: boolean;
}) {
  const buttonClass = featured
    ? "btn-3d btn-3d-steam w-full whitespace-nowrap !px-5 text-base md:text-lg"
    : "btn-ghost btn-ghost--lg w-full justify-center whitespace-nowrap !px-5 !text-base";
  const button = internal ? (
    <Link href={href} className={buttonClass}>
      {cta}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass}>
      {featured && <SteamIcon className="w-6 h-6" />}
      {cta}
    </a>
  );

  return (
    <li
      className={`reveal flex flex-col p-8 md:p-10 rounded-2xl ${
        featured
          ? "bg-gradient-to-b from-sky-500/15 to-sky-500/5 ring-2 ring-sky-400/50 shadow-[0_0_50px_rgba(56,189,248,0.15)]"
          : "bg-white/[0.04] ring-1 ring-white/10"
      }`}
    >
      <span className="font-display text-sm md:text-base tracking-[0.25em] text-slate-400">
        {step}
      </span>
      <h3 className="mt-3 font-display text-2xl md:text-3xl font-bold text-white leading-tight">
        {title}
      </h3>
      <p className="mt-4 mb-8 flex-1 text-lg text-slate-300 leading-relaxed">
        {body}
      </p>
      {button}
    </li>
  );
}

function SteamIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
    </svg>
  );
}
