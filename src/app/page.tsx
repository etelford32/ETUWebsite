"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EtuTitle from "@/components/EtuTitle";
import { initPerformanceOptimizations } from "@/lib/performance";

const STEAM_URL =
  "https://store.steampowered.com/app/4094340/Explore_the_Universe_2175/";
const SIGNUP_URL = "/login?mode=signup";

const PILLARS = [
  {
    title: "A New Galaxy Every Run",
    color: "text-cyan-300",
    bar: "bg-cyan-400",
    lead: "Spiral arms, nebulae, pulsars and thousands of worlds.",
    body: "Generated fresh every run across sixteen regions, from fungal jungles to the frozen Outer Rim.",
  },
  {
    title: "Real Cosmic Danger",
    color: "text-amber-300",
    bar: "bg-amber-400",
    lead: "Slingshot around black holes. Outrun solar storms.",
    body: "Flares and coronal mass ejections follow real observations, and no two black holes are alike.",
  },
  {
    title: "Quests and a Buried Mystery",
    color: "text-purple-300",
    bar: "bg-purple-400",
    lead: "Wake ancient stations and earn the trust of strange allies.",
    body: "Follow the Khepri Signal with Cyl to learn why her people, the Lumari, were erased.",
  },
  {
    title: "Bosses Built to Be Broken",
    color: "text-rose-300",
    bar: "bg-rose-400",
    lead: "Strip MEGABOT's armour plate by plate.",
    body: "Escape the Null Architect's prison rooms. MEGABOT remembers what you did to his empire.",
  },
];

const FACTIONS = [
  {
    href: "/factions/crystal-intelligences",
    image: "/Crystal_Race.jpg",
    name: "CYL",
    kind: "Crystal Intelligences",
    blurb: "Crystal minds that bend light to defend and strike.",
  },
  {
    href: "/factions/mycelari",
    image: "/Mycelari_Hero2.jpg",
    name: "Mycelari",
    kind: "Fungal Swarm",
    blurb: "A fungal swarm that spreads by spores.",
  },
  {
    href: "/factions/megabot",
    image: "/eveil_robot_hero1.jpg",
    name: "Megabot",
    kind: "Machine Empire",
    blurb: "Shape-shifting robots and station-sized bosses.",
  },
  {
    href: "/factions/wild",
    image: "/Wild_Race.jpg",
    name: "Wild",
    kind: "Ent-born Guardians",
    blurb: "Tree-born guardians who control the land.",
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
      <Header />

      {/* HERO — brand, pitch, then Wishlist › Playtest › Sign up */}
      <section
        id="home"
        className="relative min-h-[92svh] flex items-center overflow-hidden"
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

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 lg:px-6 pt-8 pb-12 md:pt-14 md:pb-16 text-center">
          <p
            className="reveal mb-4 md:mb-6 uppercase font-semibold tracking-[0.18em] text-sm md:text-lg text-slate-200"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,.9)" }}
          >
            Telford Projects presents
          </p>

          {/* Phones get a stacked title so each line can run much larger */}
          <h1>
            <EtuTitle
              as="span"
              text={["Explore", "the", "Universe", "2175"]}
              fit
              className="block sm:hidden -mx-2 text-[7rem]"
            />
            <EtuTitle
              as="span"
              text={["Explore the", "Universe 2175"]}
              fit
              className="hidden sm:block mx-auto sm:text-7xl md:text-8xl lg:text-[8rem] xl:text-[8.75rem]"
            />
          </h1>

          <p
            className="reveal mt-6 md:mt-10 mx-auto max-w-4xl text-2xl md:text-4xl font-bold text-white leading-tight text-balance"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,.9)" }}
          >
            Explore a new galaxy of quests, bosses and cosmic wonders.
          </p>

          <p
            className="reveal mt-4 mx-auto max-w-3xl text-lg md:text-2xl text-slate-100 leading-relaxed text-balance"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,.85)" }}
          >
            Chart black holes, outrun solar storms and uncover a lost civilization with Cyl, a crystal AI who learns who you are.
          </p>

          <div className="reveal mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
            <a
              href={STEAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-3d btn-3d-steam group w-full sm:w-auto text-lg md:text-xl md:px-9 md:py-4 whitespace-nowrap"
            >
              <SteamIcon className="w-7 h-7 transition-transform group-hover:scale-110" />
              <span>Wishlist on Steam</span>
            </a>

            <a
              href={STEAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-ghost--lg w-full sm:w-auto whitespace-nowrap text-lg md:text-xl md:px-9 md:py-4"
            >
              Join the Free Playtest
            </a>
          </div>

          <p className="reveal mt-5 text-lg md:text-xl text-slate-100">
            Want launch news?{" "}
            <Link
              href={SIGNUP_URL}
              className="font-semibold text-cyan-300 underline decoration-cyan-400/50 underline-offset-4 hover:text-cyan-200 hover:decoration-cyan-200 transition-colors"
            >
              Sign up for updates →
            </Link>
          </p>

          <p className="reveal mt-8 text-base md:text-lg font-medium text-slate-300">
            Windows · macOS · Linux · Early Access 2027
          </p>
        </div>
      </section>

      {/* What makes 2175 different */}
      <section
        id="features"
        className="py-16 md:py-24 bg-gradient-to-b from-deep-900 via-indigo-950/20 to-deep-900"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight text-balance">
              What Awaits Out There
            </h2>
          </header>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {PILLARS.map((p) => (
              <article
                key={p.title}
                className="reveal p-7 md:p-9 rounded-2xl bg-white/[0.04] ring-1 ring-white/10"
              >
                <span className={`block h-1 w-12 rounded-full mb-6 ${p.bar}`} aria-hidden="true" />
                <h3 className={`text-2xl md:text-3xl font-bold leading-tight text-balance ${p.color}`}>
                  {p.title}
                </h3>
                <p className="mt-3 text-lg md:text-xl text-slate-100 leading-relaxed">
                  <span className="font-semibold text-white">{p.lead}</span>{" "}
                  {p.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Official trailer */}
      <section id="trailer" className="reveal py-16 md:py-24 bg-deep-900">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <header className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight text-balance">
              Watch the Trailer
            </h2>
            <p className="mt-4 text-lg md:text-2xl text-slate-100 leading-relaxed">
              Black holes, solar storms, boss fights and the galaxy in motion.
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
              className="btn-3d btn-3d-steam group text-lg"
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
        className="py-16 md:py-24 bg-gradient-to-b from-deep-900 to-deep-800"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight text-balance">
              The Factions
            </h2>
            <p className="mt-4 text-lg md:text-2xl text-slate-100 leading-relaxed">
              Four are playable now, with more in development. Each plays by its own rules.
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
                  <h3 className="text-2xl font-bold text-white">
                    {f.name}
                  </h3>
                  <p className="mt-0.5 uppercase font-semibold tracking-wider text-sm md:text-base text-cyan-300">
                    {f.kind}
                  </p>
                  <p className="mt-2 text-lg text-slate-100 leading-relaxed">
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
        className="relative py-16 md:py-24 bg-gradient-to-b from-deep-800 to-deep-900 border-t border-cyan-500/20 overflow-hidden"
      >
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight text-balance">
              Join the Mission
            </h2>
            <p className="mt-4 text-lg md:text-2xl text-slate-100 leading-relaxed">
              Three ways to get involved.
            </p>
          </header>

          <ol className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <CtaCard
              step="Step 1"
              title="Wishlist on Steam"
              body="The best way to support the game. Steam tells you when Early Access launches."
              href={STEAM_URL}
              cta="Wishlist Now"
              featured
            />
            <CtaCard
              step="Step 2"
              title="Join the Playtest"
              body="Free on Steam. Play the latest build and tell us what to fix."
              href={STEAM_URL}
              cta="Request Access"
            />
            <CtaCard
              step="Step 3"
              title="Sign Up for Updates"
              body="Get devlogs, playtest news and a spot on the leaderboard."
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
      className={`reveal flex flex-col p-7 md:p-9 rounded-2xl ${
        featured
          ? "bg-gradient-to-b from-sky-500/15 to-sky-500/5 ring-2 ring-sky-400/50 shadow-[0_0_50px_rgba(56,189,248,0.15)]"
          : "bg-white/[0.04] ring-1 ring-white/10"
      }`}
    >
      <span className="text-base md:text-lg font-bold text-cyan-300">
        {step}
      </span>
      <h3 className="mt-1 text-2xl md:text-3xl font-bold text-white leading-tight">
        {title}
      </h3>
      <p className="mt-3 mb-7 flex-1 text-lg text-slate-100 leading-relaxed">
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
