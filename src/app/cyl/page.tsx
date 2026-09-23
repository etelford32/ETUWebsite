import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/siteUrl";

const STEAM_URL =
  "https://store.steampowered.com/app/4094340/Explore_the_Universe_2175";

export const metadata: Metadata = {
  title: "Cyl — Companion AI | Explore the Universe 2175",
  description:
    "Cyl is the Lumari crystal consciousness who flies beside you: eighteen abilities across six branches, autonomous combat support, survey scanning, signal listening and a face that reads her own state.",
  alternates: { canonical: "./" },
  openGraph: {
    title: "Cyl — Companion AI | Explore the Universe 2175",
    description:
      "Eighteen abilities, four autonomous support lanes, a survey scanner, a signal antenna and eleven expressions. Meet the companion who flies beside you.",
    url: `${SITE_URL}/cyl`,
    siteName: "Explore the Universe 2175",
    images: [{ url: `${SITE_URL}/cyl/cyl-expressions.png`, width: 960, height: 774 }],
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cyl — Companion AI | Explore the Universe 2175",
    description:
      "Eighteen abilities, four autonomous support lanes, a survey scanner and eleven expressions.",
    images: [`${SITE_URL}/cyl/cyl-expressions.png`],
  },
};

/* ---------------------------------------------------------------- data --- */

type Ability = {
  glyph: string;
  label: string;
  kind: string;
  rgb: string;
  blurb: string;
};

// Her ability inventory, carrying the glyph and colour each node wears in
// the character screen.
const BRANCHES: { name: string; abilities: Ability[] }[] = [
  {
    name: "Core",
    abilities: [
      {
        glyph: "LINK",
        label: "Docking Anchor",
        kind: "Command",
        rgb: "150,220,255",
        blurb:
          "Latch her to the hull or send her back out. Attached, she rides with you and mends herself.",
      },
    ],
  },
  {
    name: "Combat",
    abilities: [
      {
        glyph: "LAS",
        label: "Companion Lasers",
        kind: "Toggle",
        rgb: "200,160,255",
        blurb: "Her auxiliary rifle, firing on its own at whatever you are fighting.",
      },
      {
        glyph: "ATK",
        label: "Cyl Attack",
        kind: "Command",
        rgb: "255,128,188",
        blurb: "She charges the selected target and lands a five-shot burst.",
      },
      {
        glyph: "LOCK",
        label: "Cyl Target Lock",
        kind: "Command",
        rgb: "118,232,210",
        blurb: "A Cyl-side lock that follows her own combat priorities.",
      },
      {
        glyph: "TAU",
        label: "Taunt",
        kind: "Command",
        rgb: "255,184,104",
        blurb: "Forces the target to focus her for a threat window.",
      },
      {
        glyph: "DIS",
        label: "Distract",
        kind: "Command",
        rgb: "150,210,255",
        blurb: "She flanks as a decoy so the target tracks her instead of you.",
      },
      {
        glyph: "NOV",
        label: "Energy Nova",
        kind: "Command",
        rgb: "255,200,100",
        blurb: "Discharges all of her energy as an EMP that stuns and damages everything close.",
      },
      {
        glyph: "BANE",
        label: "Mega Bot's Bane",
        kind: "Passive",
        rgb: "255,140,140",
        blurb: "Her fire deals +50% damage to mechanical foes.",
      },
    ],
  },
  {
    name: "Defense",
    abilities: [
      {
        glyph: "SHD",
        label: "Aegis Loop",
        kind: "Toggle",
        rgb: "140,210,255",
        blurb: "A standing loop that keeps the ship's shield topped up.",
      },
      {
        glyph: "HEAL",
        label: "Healing Field",
        kind: "Command",
        rgb: "60,240,130",
        blurb:
          "A green grid over the hull: 2% of every defensive layer back every 200ms for four seconds.",
      },
      {
        glyph: "CRY",
        label: "Crystal Shield",
        kind: "Passive",
        rgb: "150,220,255",
        blurb: "A crystalline barrier she raises for herself when a killing blow is coming.",
      },
      {
        glyph: "TER",
        label: "Terra Echo Shield",
        kind: "Passive",
        rgb: "255,140,100",
        blurb:
          "Earthfall resonance: her Crystal Shield resolves +40% capacity and +35% duration.",
      },
    ],
  },
  {
    name: "Scan",
    abilities: [
      {
        glyph: "SCAN",
        label: "Active Scan",
        kind: "Command",
        rgb: "120,245,200",
        blurb: "An orbital identification pass. What she finishes is discovered and archived.",
      },
      {
        glyph: "DIM",
        label: "Dimensional Sight",
        kind: "Passive",
        rgb: "200,100,255",
        blurb: "Always on: +25% scan range, surfacing more of the scan layer.",
      },
      {
        glyph: "KHP",
        label: "Khepri Scan Analysis",
        kind: "Passive",
        rgb: "140,235,255",
        blurb: "Khepri upgrades her scan speed, range, archive detail and tactical refresh depth.",
      },
      {
        glyph: "EYE",
        label: "Ocular Fracture Analysis",
        kind: "Passive",
        rgb: "110,245,255",
        blurb: "Completed scans expose Megabot's eye-lance apertures as weak points.",
      },
    ],
  },
  {
    name: "Mobility",
    abilities: [
      {
        glyph: "PHZ",
        label: "Phase Shift",
        kind: "Passive",
        rgb: "100,200,255",
        blurb: "She phase-steps after you: +25% follow speed and acceleration.",
      },
    ],
  },
  {
    name: "Ultimate",
    abilities: [
      {
        glyph: "ASC",
        label: "Crystal Ascension",
        kind: "Command",
        rgb: "255,215,0",
        blurb: "Half her energy to become a healing force, mending you for ten seconds.",
      },
    ],
  },
];

const ABILITY_COUNT = BRANCHES.reduce((n, b) => n + b.abilities.length, 0);

const ALL_ABILITIES = BRANCHES.flatMap((b) => b.abilities);

const STATS = [
  { value: `${ABILITY_COUNT}`, label: "Abilities" },
  { value: `${BRANCHES.length}`, label: "Branches" },
  { value: "4", label: "Support lanes" },
  { value: "11", label: "Faces" },
  { value: "2.4/s", label: "Shots" },
];

// What she does on her own, without a button.
const CAPABILITIES = [
  {
    glyph: "LOCK",
    rgb: "118,232,210",
    title: "She shoots what you are fighting",
    body: "Her trigger reads your weapon lock first, then whatever last hit the ship, then the direction the hit came from, then your own firing line. Every candidate is checked for hostile, alive and in reach before she pulls — a friendly station you happen to have locked is walked straight past.",
  },
  {
    glyph: "ATK",
    rgb: "255,128,188",
    title: "She leads the shot",
    body: "Her bolts are ballistic, so she solves the intercept: target velocity against projectile speed for the earliest point the two meet, then aims there. Crossing targets that used to fly through the gap now take the hit.",
  },
  {
    glyph: "LAS",
    rgb: "200,160,255",
    title: "She keeps firing",
    body: "2.40 shots a second, sustained — heat falls under continuous fire instead of stacking, so there are no dead stops mid-engagement. Her energy and heat both read off her profile card, so you can see what she has left.",
  },
  {
    glyph: "HEAL",
    rgb: "60,240,130",
    title: "She spends her abilities on you",
    body: "Four lanes run on their own: the Healing Field on a hurt hull, Crystal Ascension when it turns critical, Energy Nova when a crowd is inside the blast and pressing you, and the Taunt/Distract peel on whatever just landed a hit.",
  },
  {
    glyph: "SHD",
    rgb: "140,210,255",
    title: "She budgets the energy",
    body: "The Healing Field draws on the ship, so she keeps 1.6× its cost in reserve and leaves you able to boost and shoot. The nova and the ultimate draw on her own pool, and the emergency always outranks the crowd control.",
  },
  {
    glyph: "SCAN",
    rgb: "120,245,200",
    title: "She surveys what you find",
    body: "She flies a paced orbit around the target while her beam scans the surface beneath her, the reticle's arc filling with the ground she has actually covered. A finished scan is discovered, archived and counted by the discovery tree.",
  },
  {
    glyph: "KHP",
    rgb: "140,235,255",
    title: "She listens past the fog",
    body: "Her antenna is a crystal organ that grows with her, pulling contacts out of the dark as a bearing, a range and a promise — quests, caches, derelicts, relics, and the things hunting you — before you fly into them.",
  },
  {
    glyph: "DIM",
    rgb: "200,100,255",
    title: "She grows on what you explore",
    body: "Decoding a contact banks discovery XP; reaching the waypoint it plotted pays again. Crystal memories unlock new abilities, and skill points buy stat ranks on the ones she already has — volley size, attack cost, aegis regen, shield cooldown, scan duration.",
  },
  {
    glyph: "CRY",
    rgb: "150,220,255",
    title: "She tells you when she is hurt",
    body: "Below a quarter hull she flashes a smoky red aura and asks you to bring her in. Latched to the hull she recharges her shield and regenerates at 1/s, and her face settles to content.",
  },
  {
    glyph: "LINK",
    rgb: "150,220,255",
    title: "She talks first",
    body: "She introduces herself before the first quest arrives, asks what to call you, and teaches the thrusters, the guns and the camera in her own speech bubbles — naming the keys you actually have bound.",
  },
];

/* ---------------------------------------------------------- components --- */

function Glyph({
  glyph,
  rgb,
  size = "md",
  title,
}: {
  glyph: string;
  rgb: string;
  size?: "md" | "sm";
  title?: string;
}) {
  const box = size === "sm" ? "w-9 h-9 text-[9px]" : "w-12 h-12 text-[11px]";
  return (
    <span
      aria-hidden={title ? undefined : true}
      title={title}
      className={`${box} shrink-0 inline-flex items-center justify-center rounded-lg border font-display font-bold tracking-wider`}
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

function SectionHeading({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="eyebrow mb-2">{eyebrow}</div>
      <h2 className="font-display text-3xl md:text-4xl font-bold etu-headline-grad">{children}</h2>
    </div>
  );
}

function Figure({
  src,
  alt,
  width,
  height,
  caption,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: React.ReactNode;
}) {
  return (
    <figure>
      <div className="rounded-xl overflow-hidden border border-cyan-500/20 bg-black/60 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto"
          sizes="(max-width: 768px) 100vw, 640px"
        />
      </div>
      <figcaption className="mt-3 text-sm text-slate-400 leading-relaxed">{caption}</figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------- page --- */

export default function CylPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        {/* ------------------------------------------------------- hero --- */}
        <section className="relative overflow-hidden border-b border-cyan-500/10">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/25 via-slate-950 to-deep-900" />
          <div className="absolute inset-0 opacity-30 etu-starfield" />

          <div className="relative z-10 max-w-6xl mx-auto px-4 lg:px-6 pt-10 pb-10">
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="etu-pill etu-pill--purple">Companion AI</span>
              <span className="etu-pill etu-pill--cyan">Lumari crystal consciousness</span>
              <Link
                href="/devlog"
                className="eyebrow text-slate-400 hover:text-cyan-300 transition-colors"
              >
                Elliot&rsquo;s Devlog &rarr;
              </Link>
            </div>

            <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 items-center">
              <div>
                <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] etu-devlog-grad">
                  Cyl
                </h1>
                <p className="mt-3 text-xl md:text-2xl text-slate-200">
                  She flies beside you, fights with you, and reads the dark ahead.
                </p>
                <p className="mt-5 text-lg text-slate-300 leading-relaxed">
                  A crystal consciousness riding inside a drone body, with her own history with{" "}
                  <Link
                    href="/megabot"
                    className="text-cyan-300 hover:text-cyan-200 underline decoration-cyan-500/40 underline-offset-2"
                  >
                    Megabot
                  </Link>
                  . She holds her own trigger, spends her own abilities to keep you alive,
                  surveys what you find, listens for what you have not found yet&mdash;and wears
                  every bit of it on her face.
                </p>

                <div className="mt-8 grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {STATS.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border border-cyan-500/20 bg-slate-950/50 px-2 py-3 text-center"
                    >
                      <div className="font-display text-2xl font-bold text-cyan-300 leading-none">
                        {s.value}
                      </div>
                      <div className="mt-1.5 font-display text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a href={STEAM_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    Wishlist on Steam
                  </a>
                  <Link href="/alpha-testing" className="btn-ghost">
                    Join the playtest
                  </Link>
                </div>
              </div>

              <div>
                <Figure
                  src="/cyl/cyl-docked.png"
                  alt="Cyl latched to the player's ship at three zoom levels, her dome lit and her brackets extended"
                  width={1260}
                  height={438}
                  caption={
                    <>
                      Latched to the hull at three zoom levels. Attached, she recharges her shield
                      and regenerates at 1/s.
                    </>
                  }
                />

                <div className="mt-6">
                  <div className="eyebrow mb-3">Her kit at a glance</div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_ABILITIES.map((a) => (
                      <Glyph key={a.label} glyph={a.glyph} rgb={a.rgb} size="sm" title={a.label} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- abilities --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14">
          <SectionHeading eyebrow="Her kit">
            {ABILITY_COUNT} abilities, {BRANCHES.length} branches
          </SectionHeading>

          <p className="-mt-4 mb-8 text-slate-300 leading-relaxed max-w-3xl">
            Commands sit on your action bar, toggles run until you turn them off, and passives
            change her numbers the moment they unlock. Crystal memories open the nodes; skill points
            buy ranks on what she already carries.
          </p>

          <div className="space-y-10">
            {BRANCHES.map((branch) => (
              <div key={branch.name}>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="font-display text-sm font-bold uppercase tracking-[0.22em] text-slate-200">
                    {branch.name}
                  </h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/30 to-transparent" />
                  <span className="eyebrow">
                    {branch.abilities.length} {branch.abilities.length === 1 ? "node" : "nodes"}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {branch.abilities.map((a) => (
                    <div
                      key={a.label}
                      className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-4 hover:border-cyan-400/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Glyph glyph={a.glyph} rgb={a.rgb} />
                        <div className="min-w-0">
                          <div className="font-display font-bold text-slate-100 leading-tight">
                            {a.label}
                          </div>
                          <div className="eyebrow mt-1">{a.kind}</div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">{a.blurb}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------- capabilities --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading eyebrow="Autonomy">What she does without being asked</SectionHeading>

          <div className="grid md:grid-cols-2 gap-5">
            {CAPABILITIES.map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-6 hover:border-cyan-400/30 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Glyph glyph={c.glyph} rgb={c.rgb} size="sm" />
                  <h3 className="font-display text-lg font-bold text-slate-100">{c.title}</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------- faces --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading eyebrow="Expression">You can read her</SectionHeading>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <p>
                Her visor is her mouth and her lens is her eye, and the face is resolved from her
                live state every frame&mdash;first match wins. A hit in the last half second is a
                wince. A quarter hull is hurt. Fleeing is scared, scanning is curious, a fresh
                discovery is delighted, a fight is determined, latched and safe is content.
              </p>
              <p>
                Underneath it she carries a mood, and the mood only shades the default smile. She is
                an optimist: gloom can narrow it, but only her body can turn it into a frown.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {[
                  ["Wince", "a hit in the last 0.45s"],
                  ["Hurt", "hull at 25%"],
                  ["Worried", "hull at 50%"],
                  ["Scared", "fleeing"],
                  ["Delighted", "a discovery"],
                  ["Determined", "fighting"],
                  ["Curious", "scanning"],
                  ["Tired", "energy at 15%"],
                  ["Content", "latched, safe"],
                  ["Happy", "everything else"],
                ].map(([face, when]) => (
                  <div
                    key={face}
                    className="rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2"
                  >
                    <div className="text-sm font-semibold text-cyan-300">{face}</div>
                    <div className="text-xs text-slate-400">{when}</div>
                  </div>
                ))}
              </div>
            </div>

            <Figure
              src="/cyl/cyl-expression-ladder.png"
              alt="Twelve panels of Cyl reacting: idle, gloomy mood, warm mood, docked, hull 40%, hull 15%, scanning, just hit, a discovery, low energy, fleeing and fighting"
              width={1200}
              height={954}
              caption={
                <>
                  Idle and docked, hull at 40% and at 15% inside the low-health aura, scanning,
                  freshly hit, delighted by a discovery, out of energy, fleeing, fighting.
                </>
              }
            />
          </div>
        </section>

        {/* -------------------------------------------------------- scan --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading eyebrow="Survey">The scan is a hologram</SectionHeading>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <Figure
              src="/cyl/cyl-survey-hologram.png"
              alt="Cyl's survey hologram at two zoom levels and three points of a scan: beam, radar sweep, progress arc and readout cards"
              width={1920}
              height={756}
              caption={
                <>Two zoom levels by three points of one scan, drawn by the game&rsquo;s renderer.</>
              }
            />

            <div className="space-y-4 text-slate-300 leading-relaxed">
              <p>
                Her lens throws a beam onto the target and the object comes up inside a survey rig: a
                dashed outer ring and a counter-turning inner one, a radar sweep with a fading trail,
                corner brackets standing off the reticle, motes riding the ring, two readout cards
                typing themselves in, and at the contact point the beam painting an arc of the
                target&rsquo;s own surface as she covers it.
              </p>
              <p>
                Detail arrives with her. Close up she is a glass dome over a galaxy with a violet
                eye; far out she is a lit dot with an antenna, and nothing is spent drawing what
                nobody can see. The effect stays sharp at any zoom and cheap at any screen size.
              </p>
              <Figure
                src="/cyl/cyl-lod-ladder.png"
                alt="Cyl rendered at hull radii from 6 to 80 pixels, detail arriving as she gets closer"
                width={1300}
                height={556}
                caption={<>Cyl from r=6 to r=80.</>}
              />
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- CTA --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16 border-t border-slate-800/60">
          <div className="max-w-3xl">
            <p className="text-xl text-slate-200 leading-relaxed">
              As you explore, Cyl&rsquo;s actions are meant to give you reasons to notice her,
              understand her, and eventually trust her.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a href={STEAM_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                Wishlist on Steam
              </a>
              <Link href="/alpha-testing" className="btn-ghost">
                Join the playtest
              </Link>
              <Link href="/devlog" className="btn-ghost">
                Read the devlog
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
              and follow development as Cyl and the galaxy around her continue to grow.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
