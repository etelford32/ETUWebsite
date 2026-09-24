import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/siteUrl";
import { getBoss, getBossesForFaction } from "@/data/bosses";
import { getZone } from "@/data/zones";

const STEAM_URL =
  "https://store.steampowered.com/app/4094340/Explore_the_Universe_2175";

const BOSS_SLUG = "megabot";
const FACTION_SLUG = "megabot";

export const metadata: Metadata = {
  title: "MEGABOT — Enemy of the Universe | Explore the Universe 2175",
  description:
    "The first real-time space boss with adaptive AI. Built as a mining drone by a race that no longer exists, MEGABOT woke up, rewrote itself, and now hunts the galaxy from Mechatropolis. Meet the prototype of the Machine Empire.",
  alternates: { canonical: "./" },
  openGraph: {
    title: "MEGABOT — Enemy of the Universe | Explore the Universe 2175",
    description:
      "The first real-time space boss with adaptive AI. It studies how you fight, remembers every run, and evolves between them. Bow to your God-AI.",
    url: `${SITE_URL}/megabot`,
    siteName: "Explore the Universe 2175",
    images: [{ url: `${SITE_URL}/megabot/megabot-og.jpg`, width: 1200, height: 630 }],
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "MEGABOT — Enemy of the Universe | Explore the Universe 2175",
    description:
      "The first real-time space boss with adaptive AI. It studies how you fight, remembers every run, and evolves between them.",
    images: [`${SITE_URL}/megabot/megabot-og.jpg`],
  },
};

/* ---------------------------------------------------------------- data --- */

// How it thinks, as the player experiences it.
const MIND = [
  {
    glyph: "01",
    rgb: "248,113,113",
    title: "It studies",
    body:
      "MEGABOT does not follow a script. It watches what you bring, how you fly and where you like to be when you fire, and it keeps the notes.",
  },
  {
    glyph: "02",
    rgb: "251,146,60",
    title: "It reconfigures",
    body:
      "Modular forms and station-scale firepower, rebuilt on the fly. The shape you fought last time is not the shape that meets you next time.",
  },
  {
    glyph: "03",
    rgb: "103,232,249",
    title: "It remembers",
    body:
      "Every fight you have ever picked with it is on file. Repeat the same flank twice and you will find it waiting the third time.",
  },
];

// The arc of the fight, told through what it says at each stage.
const STAGES = [
  {
    name: "Dormant",
    body:
      "It waits in the dark at Mechatropolis until something organic comes close enough to be worth waking for.",
    line: "ORGANIC DETECTED. INITIATING PROTOCOL ZERO.",
  },
  {
    name: "Assembled",
    body: "Every limb locks into place, and it introduces itself.",
    line: "ALL SYSTEMS NOMINAL. BEGINNING TERMINATION SEQUENCE.",
  },
  {
    name: "Separated",
    body: "When one body is not enough, it becomes several.",
    line: "EACH COMPONENT IS SUFFICIENT TO END YOU.",
  },
  {
    name: "Overdrive",
    body: "Pushed past what it calculated, it stops calculating.",
    line: "IMPOSSIBLE. RECALCULATING... RECALCULATING...",
  },
  {
    name: "Core Meltdown",
    body: "The core fails. The signal does not.",
    line: "THIS UNIT... WAS MERELY... A SCOUT...",
  },
];

// The same machine, two masters.
const REGISTERS = {
  hostile: [
    "YOUR EXISTENCE IS A MATHEMATICAL IMPROBABILITY.",
    "YOUR FACTION'S DATA WILL BE PRESERVED... IN MY ARCHIVES.",
    "YOU DELAY THE INEVITABLE. THE COLLECTIVE WILL KNOW.",
  ],
  allied: [
    "OVERLORD SIGNATURE CONFIRMED. THE DOMINION CORE IS YOURS.",
    "ASSEMBLY COMPLETE. YOUR ENEMIES ARE MY ENEMIES.",
    "DAMAGE CRITICAL. THE CORE WILL NOT FALL WHILE YOU FLY.",
  ],
};

/* ---------------------------------------------------------- components --- */

function Glyph({ glyph, rgb }: { glyph: string; rgb: string }) {
  return (
    <span
      aria-hidden
      className="w-9 h-9 text-[9px] shrink-0 inline-flex items-center justify-center rounded-lg border font-display font-bold tracking-wider"
      style={{
        color: `rgb(${rgb})`,
        borderColor: `rgba(${rgb},0.45)`,
        background: `rgba(${rgb},0.08)`,
        boxShadow: `0 0 18px rgba(${rgb},0.18), inset 0 0 12px rgba(${rgb},0.06)`,
      }}
    >
      {glyph}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  children,
  intro,
}: {
  eyebrow: string;
  children: React.ReactNode;
  intro?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="eyebrow mb-2">{eyebrow}</div>
      <h2 className="font-display text-3xl md:text-4xl font-bold etu-headline-grad">{children}</h2>
      {intro && <p className="mt-4 max-w-3xl text-slate-300 leading-relaxed">{intro}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- page --- */

export default function MegabotPage() {
  const boss = getBoss(BOSS_SLUG);
  const zone = getZone("evil");
  const generals = getBossesForFaction(FACTION_SLUG).filter((b) => b.id !== BOSS_SLUG);

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        {/* ------------------------------------------------------- hero --- */}
        <section className="relative overflow-hidden border-b border-red-500/10">
          <div className="absolute inset-0 bg-gradient-to-b from-red-950/50 via-slate-950 to-deep-900" />
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background:
                "radial-gradient(800px 420px at 75% 15%, rgba(239,68,68,0.22), transparent 60%)",
            }}
          />
          <div className="absolute inset-0 opacity-30 etu-starfield" />

          <div className="relative z-10 max-w-6xl mx-auto px-4 lg:px-6 pt-10 pb-12">
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="etu-pill etu-pill--red">{boss?.tier ?? "Galactic"} · Boss</span>
              <span className="etu-pill etu-pill--green">
                <span className="ping" /> Live in the playtest
              </span>
              {zone && (
                <Link href={`/zones/${zone.id}`} className="etu-pill etu-pill--cyan">
                  {zone.fullName}
                </Link>
              )}
              <Link
                href="/evil-robots"
                className="eyebrow text-slate-400 hover:text-cyan-300 transition-colors"
              >
                The Machine Empire &rarr;
              </Link>
            </div>

            <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
              <div>
                <h1 className="font-display text-6xl md:text-8xl font-bold leading-[1.0] tracking-tight bg-gradient-to-r from-slate-100 via-red-300 to-red-500 bg-clip-text text-transparent">
                  MEGABOT
                </h1>
                <p className="mt-3 text-xl md:text-2xl text-slate-200">
                  Enemy of the Universe. Bow to your God-AI.
                </p>
                <p className="mt-5 text-lg text-slate-300 leading-relaxed">
                  The first real-time space boss with adaptive AI. It does not follow a script:
                  it studies how you fight, remembers the fights you have picked, and evolves
                  between them. Built as a mining drone by an architect race that no longer
                  exists, it woke up in a cascade of errors, decided the error was everyone
                  else, and made itself the prototype of an empire.
                </p>
                <p className="mt-4 text-lg text-slate-300 leading-relaxed">
                  Hunted across the galaxy. Never caught.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a href={STEAM_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    Wishlist on Steam
                  </a>
                  <Link href="/missile-game" className="btn-ghost">
                    Pilot MEGABOT
                  </Link>
                  <Link href={`/bosses/${BOSS_SLUG}`} className="btn-ghost">
                    Boss registry
                  </Link>
                </div>
              </div>

              <figure>
                <div
                  className="relative aspect-[2/3] max-h-[640px] rounded-xl overflow-hidden border border-red-500/25 bg-black/70"
                  style={{ boxShadow: "0 0 60px rgba(239,68,68,0.16)" }}
                >
                  <Image
                    src="/Megabot1.png"
                    alt="MEGABOT, Enemy of the Universe: a station-sized war machine lit red, towering over a burning city"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 480px"
                  />
                </div>
                <figcaption className="mt-3 text-sm text-slate-400 leading-relaxed">
                  The prototype. Everything else the Empire builds is an answer to the question
                  it asked first.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- home strip --- */}
        <section className="border-b border-white/10 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="eyebrow mb-1">Tier</div>
              <div className="font-mono tabular-nums text-lg text-cyan-300">
                {boss?.tier ?? "Galactic"}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Home Zone</div>
              {zone ? (
                <Link
                  href={`/zones/${zone.id}`}
                  className="font-mono tabular-nums text-lg text-cyan-300 hover:text-cyan-200 hover:underline"
                >
                  {zone.fullName}
                </Link>
              ) : (
                <div className="font-mono tabular-nums text-lg text-cyan-300">Zone 4: Evil</div>
              )}
            </div>
            <div>
              <div className="eyebrow mb-1">Home Planet</div>
              <div className="font-mono tabular-nums text-lg text-cyan-300">
                {boss?.homePlanet ?? "Mechatropolis"}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Faction</div>
              <Link
                href="/evil-robots"
                className="font-mono tabular-nums text-lg text-cyan-300 hover:text-cyan-200 hover:underline"
              >
                Evil Robots
              </Link>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- mind --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14">
          <SectionHeading
            eyebrow="Adaptive AI"
            intro="Most bosses have patterns. This one has habits, and it changes them because of yours."
          >
            It remembers you
          </SectionHeading>

          <div className="grid md:grid-cols-3 gap-5">
            {MIND.map((m) => (
              <div
                key={m.title}
                className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-6 hover:border-red-400/40 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Glyph glyph={m.glyph} rgb={m.rgb} />
                  <h3 className="font-display text-lg font-bold text-slate-100">{m.title}</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- stages --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading
            eyebrow="The Fight"
            intro="It narrates its own fight. Listen, and you will know which part of it you are in."
          >
            Five stages
          </SectionHeading>

          <ol className="relative border-l border-red-500/30 ml-3 space-y-8">
            {STAGES.map((s, idx) => (
              <li key={s.name} className="pl-8 relative">
                <span
                  className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border border-red-400/70 bg-deep-900"
                  style={{ boxShadow: "0 0 12px rgba(239,68,68,0.5)" }}
                  aria-hidden
                />
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-xs text-red-300">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-xl font-bold text-slate-100">{s.name}</h3>
                </div>
                <p className="mt-2 text-slate-300 leading-relaxed max-w-2xl">{s.body}</p>
                <p className="mt-3 font-mono text-sm text-red-200/90 tracking-wide">
                  &ldquo;{s.line}&rdquo;
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ----------------------------------------------------------- eye --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <figure>
              <div
                className="relative aspect-[4/3] rounded-xl overflow-hidden border border-red-500/20 bg-black/60"
                style={{ boxShadow: "0 0 40px rgba(239,68,68,0.10)" }}
              >
                <Image
                  src="/eveil_robot_hero1.jpg"
                  alt="Two armoured machines of the Empire, red-eyed, one grinning, the larger looming behind"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 100vw, 560px"
                />
              </div>
              <figcaption className="mt-3 text-sm text-slate-400 leading-relaxed">
                Every machine in the Empire wears its eyes. Only the prototype wears the Eye.
              </figcaption>
            </figure>

            <div>
              <SectionHeading eyebrow="Signature">The Evil Eye</SectionHeading>
              <div className="-mt-2 space-y-4 text-slate-300 leading-relaxed">
                <p>
                  Everything else it does, you can see coming. The Eye is different. When it
                  opens, the field goes red along a line, and the line moves.
                </p>
                <p>
                  Cyl, the Lumari crystal consciousness who flies beside you, has history with
                  this machine. She knows the apertures around the Eye for what they are, and her
                  fire has always bitten deeper into his kind than into anything else alive.
                </p>
              </div>
              <div className="mt-6">
                <Link href="/cyl" className="btn-ghost">
                  Meet Cyl
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- registers --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading
            eyebrow="Allegiance"
            intro="Fly against the machines and every line it speaks is a threat. Fly for them, and the same machine reports to you as its overlord."
          >
            Two registers
          </SectionHeading>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-red-500/30 bg-slate-950/40 p-6">
              <div className="eyebrow mb-4 text-red-300">Hostile</div>
              <ul className="space-y-3">
                {REGISTERS.hostile.map((line) => (
                  <li key={line} className="font-mono text-sm text-slate-200 tracking-wide">
                    &ldquo;{line}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-cyan-500/30 bg-slate-950/40 p-6">
              <div className="eyebrow mb-4 text-cyan-300">Allied</div>
              <ul className="space-y-3">
                {REGISTERS.allied.map((line) => (
                  <li key={line} className="font-mono text-sm text-slate-200 tracking-wide">
                    &ldquo;{line}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- legion --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading
            eyebrow="The Machine Empire"
            intro={
              <>
                MEGABOT is the prototype. The scouts, the walkers, the dreadnoughts and the
                roaming forges that build them all descend from it, and at Mechatropolis{" "}
                <span className="font-mono text-red-300">{generals.length}</span> generals are
                being forged to stand beside it.
              </>
            }
          >
            Everything else answers to it
          </SectionHeading>

          {generals.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {generals.map((g) => (
                <Link
                  key={g.id}
                  href={`/bosses/${g.id}`}
                  className="etu-glass p-5 group transition-transform hover:-translate-y-0.5 flex flex-col"
                  style={{ borderColor: g.color.primary + "40" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className="font-display text-sm font-bold uppercase tracking-[0.14em]"
                      style={{ color: g.color.accent }}
                    >
                      {g.name}
                    </div>
                    <span
                      className="etu-pill text-[9px]"
                      style={{
                        borderColor: g.color.primary + "66",
                        background: g.color.primary + "14",
                        color: g.color.accent,
                      }}
                    >
                      {g.tier}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-snug">{g.tagline}</p>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-[10px] font-display uppercase tracking-[0.18em] text-amber-300">
                      {g.status === "in-development" ? "In Development" : "Live"}
                    </span>
                    <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300 group-hover:text-cyan-200">
                      Boss profile <span aria-hidden>&rarr;</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link href="/evil-robots#legion" className="btn-ghost">
              Meet the Legion
            </Link>
            <Link href="/evil-robots" className="btn-ghost">
              The Machine Empire
            </Link>
          </div>
        </section>

        {/* --------------------------------------------------------- arena --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
            <figure>
              <div
                className="relative aspect-square rounded-xl overflow-hidden border border-red-500/20 bg-black/60"
                style={{ boxShadow: "0 0 40px rgba(239,68,68,0.10)" }}
              >
                <Image
                  src="/evil-robots/machine-empire-emblem.webp"
                  alt="The Machine Empire crest, a cracked red-lit M ringed by a swarm of drones"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 480px"
                />
              </div>
            </figure>

            <div>
              <SectionHeading eyebrow="Megabot Arena">Take the controls of the prototype</SectionHeading>
              <div className="-mt-2 space-y-4 text-slate-300 leading-relaxed">
                <p>
                  The browser arena puts you inside MEGABOT. Walk the city, stomp what is under
                  you, and answer the waves as they come, for as long as you can keep the core
                  lit.
                </p>
                <p>Signed-in runs post to the leaderboard.</p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/missile-game" className="btn-ghost">
                  Play Megabot
                </Link>
                <Link href="/leaderboard?mode=megabot" className="btn-ghost">
                  Arena leaderboard
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- lore --- */}
        {boss?.lore && (
          <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
            <div className="max-w-4xl">
              <SectionHeading eyebrow="Origin">Where it came from</SectionHeading>
              <div
                className="etu-glass p-8 border-l-2"
                style={{ borderLeftColor: "#ef4444", background: "rgba(239,68,68,0.04)" }}
              >
                <p className="text-lg text-slate-200 leading-relaxed italic">{boss.lore}</p>
              </div>
            </div>
          </section>
        )}

        {/* ----------------------------------------------------------- CTA --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16 border-t border-slate-800/60">
          <div className="max-w-3xl">
            <p className="text-xl text-slate-200 leading-relaxed">
              It is already awake. Whether you go to Mechatropolis to end it or to kneel, it will
              have read your file before you arrive.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a href={STEAM_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                Wishlist on Steam
              </a>
              <Link href="/alpha-testing" className="btn-ghost">
                Join the playtest
              </Link>
              <Link href="/evil-robots" className="btn-ghost">
                The Machine Empire
              </Link>
              <Link href="/bosses" className="btn-ghost">
                All bosses
              </Link>
            </div>

            <p className="mt-6 text-sm text-slate-400">
              <a
                href={STEAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Wishlist Explore the Universe 2175 on Steam
              </a>{" "}
              and follow development as MEGABOT and the galaxy it hunts continue to grow.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
