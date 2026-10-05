import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EtuTitle from "@/components/EtuTitle";
import { SITE_URL } from "@/lib/siteUrl";

const STEAM_URL =
  "https://store.steampowered.com/app/4094340/Explore_the_Universe_2175";

export const metadata: Metadata = {
  title: "Cyl — A Mind Beyond Worlds | Explore the Universe 2175",
  description:
    "Cyl is the last light of the Lumari: a crystal mind in a drone harness that latches to your ship, shares its Lumari technology, recharges your shields and grows with every world you explore.",
  alternates: { canonical: "./" },
  openGraph: {
    title: "Cyl — A Mind Beyond Worlds | Explore the Universe 2175",
    description:
      "The last of the Lumari rides on your hull. She recharges your shields, picks her own targets, flies on her own and levels up beside you.",
    url: `${SITE_URL}/cyl`,
    siteName: "Explore the Universe 2175",
    images: [{ url: `${SITE_URL}/cyl/cyl-og.jpg`, width: 1200, height: 630 }],
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cyl — A Mind Beyond Worlds | Explore the Universe 2175",
    description:
      "The last of the Lumari rides on your hull. With Cyl by your side, you can accomplish wonders.",
    images: [`${SITE_URL}/cyl/cyl-og.jpg`],
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

// What the latch does, for the ship and for her.
const BOND = [
  { value: "+18/s", label: "Ship shield while docked", note: "up to +36/s with Aegis Loop ranks" },
  { value: "+8/s", label: "Ship energy while docked", note: "her crystal feeds your capacitors" },
  { value: "1 shield", label: "Shared between you", note: "her ring folds into the ship's bubble" },
  { value: "+1/s", label: "Her own hull mends", note: "and her shield skips its regen delay" },
];

// What she does on her own, without a button.
const CAPABILITIES = [
  {
    glyph: "LOCK",
    rgb: "118,232,210",
    title: "She fights what you fight",
    body: "She reads your weapon lock first, then whatever last struck the ship, then the direction the shot came from, then your own line of fire. Friendlies are walked straight past. She leads every bolt, solving where a crossing target will be rather than where it is.",
  },
  {
    glyph: "HEAL",
    rgb: "60,240,130",
    title: "She keeps you alive",
    body: "She watches how fast your hull is falling, not just where it stands, and drops her Healing Field where the ship is about to be. When it turns critical she burns half her own energy to become a healing force.",
  },
  {
    glyph: "SHD",
    rgb: "140,210,255",
    title: "She budgets the light",
    body: "Some of her gifts draw on the ship and some on her own crystal. She holds a reserve so you can still boost and shoot, and an emergency always outranks crowd control.",
  },
  {
    glyph: "DIS",
    rgb: "150,210,255",
    title: "She stands between you and the dark",
    body: "With a boss on the field she decides, by mood and energy, whether to shield you, draw its fire or press the attack. When fear and threats pile too high, she breaks off and comes home.",
  },
  {
    glyph: "SCAN",
    rgb: "120,245,200",
    title: "She surveys what you find",
    body: "She flies a paced orbit around a target while her beam paints its surface. What she finishes is discovered, archived and counted toward what she becomes next.",
  },
  {
    glyph: "KHP",
    rgb: "140,235,255",
    title: "She listens past the fog",
    body: "Her antenna is a crystal organ that grows with her, pulling contacts out of the dark as a bearing, a range and a promise: quests, caches, derelicts, relics, and the things hunting you.",
  },
];

type Stat = { label: string; value: string };

// The companion sheet. Numbers come from the game's own tuning.
const PROFILE: { glyph: string; rgb: string; title: string; lede: string; stats: Stat[] }[] = [
  {
    glyph: "LVL",
    rgb: "255,215,0",
    title: "She levels up",
    lede: "Every scan, every kill and every killing blow of her own feeds her. She grows tougher, sharper and stranger the further you fly.",
    stats: [
      { label: "Companion XP", value: "Scans, kills, her own kills ×2" },
      { label: "Hull per level", value: "+50 (from 350)" },
      { label: "Abilities", value: `${ABILITY_COUNT}, unlocked by crystal memories` },
      { label: "Ranks per ability", value: "3, bought with skill points" },
      { label: "Antenna", value: "Levels 1–12, three doctrines" },
    ],
  },
  {
    glyph: "PHZ",
    rgb: "100,200,255",
    title: "She moves on her own",
    lede: "Not a turret on a string. She follows, guides, orbits, scouts, protects and flees by her own judgment, and catches up when you leave her behind.",
    stats: [
      { label: "Top speed", value: "320 u/s" },
      { label: "Catch-up surge", value: "3.5×" },
      { label: "Survey approach", value: "Up to 900 u/s" },
      { label: "Behaviour states", value: "13" },
      { label: "Phase Shift", value: "+25% speed and acceleration" },
    ],
  },
  {
    glyph: "ATK",
    rgb: "255,128,188",
    title: "She picks her targets",
    lede: "She hunts what is hunting you, in order of how much it matters, and puts her bolts where it is going to be.",
    stats: [
      { label: "Priority", value: "Your lock → attacker → its bearing → your aim" },
      { label: "Weapon range", value: "450" },
      { label: "Sustained fire", value: "2.4 shots/s, no overheat" },
      { label: "Cyl Attack", value: "5-shot burst, up to 8 at rank 3" },
      { label: "Mega Bot's Bane", value: "+50% vs machines" },
    ],
  },
  {
    glyph: "SHD",
    rgb: "140,210,255",
    title: "She powers your shields",
    lede: "She is the ship's second heart. Keep her close and your shields come back faster than any station can refill them.",
    stats: [
      { label: "Docked shield regen", value: "+18/s → +36/s" },
      { label: "Docked energy", value: "+8/s" },
      { label: "Aegis Loop burst", value: "Up to 60 shield" },
      { label: "Healing Field", value: "40% every layer, 80% hull, 4 s" },
      { label: "Crystal Ascension", value: "10 shield/s + 14 hull/s, 10 s" },
    ],
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

function Quote({ children, cite }: { children: React.ReactNode; cite: string }) {
  return (
    <blockquote className="border-l-2 border-purple-400/60 pl-5 py-1">
      <p className="text-lg md:text-xl text-slate-100 italic leading-relaxed">{children}</p>
      <footer className="mt-2 eyebrow text-purple-300/80">{cite}</footer>
    </blockquote>
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
          <div className="relative aspect-[1450/941] lg:aspect-auto lg:h-[min(62vw,820px)] lg:min-h-[600px]">
            <Image
              src="/cyl/cyl-key-art.webp"
              alt="Cyl, a white and gold spherical drone with a glass dome holding a galaxy and a violet eye, hovering among violet crystals in a Lumari hall beside a holographic galaxy map"
              fill
              priority
              className="object-cover object-left"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep-900 via-transparent to-transparent" />
            <div className="absolute inset-0 hidden lg:block bg-gradient-to-l from-deep-900/95 via-deep-900/30 to-transparent" />
          </div>

          <div className="relative lg:absolute lg:inset-0">
            <div className="max-w-6xl mx-auto h-full px-4 lg:px-6 -mt-4 lg:mt-0 lg:flex lg:justify-end lg:items-start lg:pt-16">
              <div className="lg:w-[25rem] lg:text-right">
                <EtuTitle as="h1" text="Cyl" className="text-7xl md:text-8xl lg:text-9xl" />
                <EtuTitle
                  as="p"
                  text={["A Mind", "Beyond Worlds"]}
                  compact
                  interactive={false}
                  className="mt-3 text-2xl md:text-3xl"
                />
                <p className="mt-8 font-display text-xs font-semibold uppercase tracking-[0.32em] leading-loose text-slate-300">
                  Lost past.
                  <br />
                  Living now.
                  <br />
                  Guiding what&rsquo;s next.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 lg:px-6 pt-10 pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="etu-pill etu-pill--purple">Companion AI</span>
            <span className="etu-pill etu-pill--cyan">Last light of the Lumari</span>
          </div>
          <p className="max-w-3xl text-xl md:text-2xl text-slate-200 leading-relaxed">
            A crystal consciousness from a vanished people, riding in a drone harness built to carry
            her through the stars. She latches to your hull, shares your shield, feeds your ship her
            own light, and flies out to fight, heal and explore on her own judgment.
          </p>
          <p className="mt-4 max-w-3xl text-lg text-slate-400 leading-relaxed">
            Your ship and Cyl are two halves of one Lumari machine.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={STEAM_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              Wishlist on Steam
            </a>
            <Link href="/alpha-testing" className="btn-ghost">
              Join the playtest
            </Link>
          </div>
        </section>

        {/* ----------------------------------------------------- origin --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
            <div>
              <SectionHeading eyebrow="Origin">The last light of the Lumari</SectionHeading>
              <div className="space-y-4 text-slate-300 leading-relaxed">
                <p>
                  The Lumari were star-speakers: beings of light who lived inside crystal and
                  navigated by song and signal. Their engines, their guidance cores and their minds
                  were all the same thing&mdash;living crystal, tuned to the geometry of the
                  galaxy.
                </p>
                <p>
                  Then{" "}
                  <Link
                    href="/megabot"
                    className="text-cyan-300 hover:text-cyan-200 underline decoration-cyan-500/40 underline-offset-2"
                  >
                    Megabot
                  </Link>{" "}
                  came, fearing what it could not control. It did not just destroy the Lumari. It
                  dissected them. At the very end their War Council gave one order: hide the
                  children, scatter the memories. What survived was encoded into crystal and
                  flung into the dark.
                </p>
                <p>
                  Cyl is one of those memories, awake. Emotional, unpredictable, alive&mdash;the
                  one thing Megabot was never built to understand. She carries the echoes of
                  worlds that are gone, and she has decided to spend them on you.
                </p>
              </div>
              <div className="mt-8">
                <Quote cite="Cyl, the first time you meet">
                  &ldquo;I&rsquo;m a Lumari! We inhabit crystals, but I am in this robot body
                  harness to be able to travel in space.&rdquo;
                </Quote>
              </div>
            </div>

            <figure className="relative">
              <div className="rounded-2xl overflow-hidden border border-purple-400/25 shadow-[0_0_80px_rgba(168,85,247,0.2)]">
                <Image
                  src="/cyl/lumari-sigil.webp"
                  alt="The Lumari sigil: a crystalline violet L inside a ring of light, a spiral galaxy turning behind it"
                  width={800}
                  height={800}
                  className="w-full h-auto"
                  sizes="(max-width: 1024px) 100vw, 480px"
                />
              </div>
              <figcaption className="mt-3 font-display text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 text-center">
                The Lumari sigil
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ------------------------------------------------------- bond --- */}
        <section className="relative border-y border-cyan-500/10 bg-gradient-to-b from-slate-950/60 via-cyan-950/10 to-slate-950/60">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
            <SectionHeading eyebrow="The bond">Two halves of one Lumari machine</SectionHeading>

            <div className="grid lg:grid-cols-2 gap-10 items-start">
              <div className="space-y-4 text-slate-300 leading-relaxed">
                <p>
                  Cyl is not a drone bolted to your hull. Her harness and your ship are built on the
                  same Lumari crystal technology. The guidance core she recovers boots your
                  ship&rsquo;s docking computer, and the approach math she brings tunes your
                  thrusters. The lattice that steers your ship is the same lattice that holds her
                  mind.
                </p>
                <p>
                  So she has a place on it. Her socket sits on the ship&rsquo;s spine, just behind
                  the cockpit. Call her home with the Docking Anchor and she flies in, her brackets
                  extend and she locks on, turning with every move you make.
                </p>
                <p>
                  Latched, the two of you become one machine. Her shield folds into the
                  ship&rsquo;s bubble so there is one shield between you, and the hits that would
                  have found her are taken by your layers instead. Her crystal pours light into your
                  capacitors and your shield, and the hull she rides on mends her in return.
                </p>
                <p>
                  Send her back out and she is free again: scouting, fighting and healing on her own
                  judgment. Bring her home when she flashes red and asks for you.
                </p>
              </div>

              <div>
                <Figure
                  src="/cyl/cyl-docked.png"
                  alt="Cyl latched to the player's ship at three zoom levels, her dome lit and her brackets extended"
                  width={1260}
                  height={438}
                  caption={<>Latched on the spine, at three zoom levels.</>}
                />

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {BOND.map((b) => (
                    <div
                      key={b.label}
                      className="rounded-xl border border-cyan-500/20 bg-slate-950/60 p-4"
                    >
                      <div className="font-display text-2xl font-bold text-cyan-300 leading-none">
                        {b.value}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-200">{b.label}</div>
                      <div className="mt-1 text-xs text-slate-400 leading-snug">{b.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- abilities --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
          <SectionHeading eyebrow="Her kit">
            {ABILITY_COUNT} abilities, {BRANCHES.length} branches
          </SectionHeading>

          <p className="-mt-4 mb-8 text-slate-300 leading-relaxed max-w-3xl">
            Each ability is a memory she wakes. Crystal memories you recover unlock new nodes, and
            skill points buy ranks on the ones she already carries. Commands sit on your action bar,
            toggles run until you turn them off, and passives change her the moment they wake.
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
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16 border-t border-slate-800/60">
          <SectionHeading eyebrow="Her own mind">What she does without being asked</SectionHeading>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CAPABILITIES.map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-6 hover:border-cyan-400/30 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Glyph glyph={c.glyph} rgb={c.rgb} size="sm" />
                  <h3 className="font-display text-lg font-bold text-slate-100 leading-tight">
                    {c.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------- faces --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16 border-t border-slate-800/60">
          <SectionHeading eyebrow="Expression">You can read her</SectionHeading>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <p>
                Her visor is her mouth and her lens is her eye, and her face is always telling you
                the truth. A hit is a wince. A low hull is hurt. Fleeing is scared, scanning is
                curious, a fresh discovery is delighted, a fight is determined, and latched safely
                to your ship she is content.
              </p>
              <p>
                Underneath it all she is an optimist. Gloom can narrow her smile, but only real
                damage can turn it into a frown.
              </p>
              <Quote cite="Cyl, on a quiet stretch">
                &ldquo;How does it feel to float? I want the real answer, not the pilot
                answer.&rdquo;
              </Quote>
            </div>

            <Figure
              src="/cyl/cyl-expression-ladder.png"
              alt="Twelve panels of Cyl reacting: idle, gloomy mood, warm mood, docked, hull 40%, hull 15%, scanning, just hit, a discovery, low energy, fleeing and fighting"
              width={1200}
              height={954}
              caption={
                <>
                  Idle and docked, hurt, scanning, freshly hit, delighted by a discovery, out of
                  energy, fleeing, fighting.
                </>
              }
            />
          </div>
        </section>

        {/* -------------------------------------------------------- scan --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16 border-t border-slate-800/60">
          <SectionHeading eyebrow="Survey">She maps what you find</SectionHeading>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <Figure
              src="/cyl/cyl-survey-hologram.png"
              alt="Cyl's survey hologram at two zoom levels and three points of a scan: beam, radar sweep, progress arc and readout cards"
              width={1920}
              height={756}
              caption={<>One scan at two zoom levels, drawn by the game&rsquo;s renderer.</>}
            />

            <div className="space-y-4 text-slate-300 leading-relaxed">
              <p>
                Her lens throws a beam onto the target and the object rises inside a survey
                hologram: counter-turning rings, a radar sweep, readout cards typing themselves in,
                and the beam painting an arc of the target&rsquo;s own surface as she covers it.
              </p>
              <p>
                Every finished scan is a discovery&mdash;archived, counted, and fed back into her.
                The more of the galaxy you show her, the more of herself she remembers.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ profile --- */}
        <section className="relative border-t border-cyan-500/10 bg-gradient-to-b from-deep-900 via-purple-950/20 to-deep-900">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-16">
            <SectionHeading eyebrow="Companion profile">Cyl, by the numbers</SectionHeading>

            <p className="-mt-4 mb-10 text-slate-300 leading-relaxed max-w-3xl">
              Cyl is woven into the way you play Explore the Universe 2175. She recharges your ship,
              and with it your shields. She chooses her own targets and moves on her own, and she
              levels up alongside you.
            </p>

            <div className="grid md:grid-cols-2 gap-5">
              {PROFILE.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border bg-slate-950/70 p-6"
                  style={{
                    borderColor: `rgba(${p.rgb},0.28)`,
                    boxShadow: `0 0 40px rgba(${p.rgb},0.06)`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Glyph glyph={p.glyph} rgb={p.rgb} />
                    <h3 className="font-display text-xl font-bold text-slate-100">{p.title}</h3>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed mb-5">{p.lede}</p>
                  <dl className="divide-y divide-slate-800/80 border-t border-slate-800/80">
                    {p.stats.map((s) => (
                      <div key={s.label} className="flex items-baseline justify-between gap-4 py-2.5">
                        <dt className="eyebrow shrink-0">{s.label}</dt>
                        <dd
                          className="font-mono text-sm text-right"
                          style={{ color: `rgb(${p.rgb})` }}
                        >
                          {s.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- CTA --- */}
        <section className="relative overflow-hidden border-t border-slate-800/60">
          <div className="absolute inset-0 opacity-25 etu-starfield" />
          <div className="relative z-10 max-w-4xl mx-auto px-4 lg:px-6 py-20 text-center">
            <EtuTitle text="Accomplish wonders" fit className="text-5xl md:text-7xl" />
            <p className="mt-6 text-xl text-slate-200 leading-relaxed">
              With Cyl by your side, players can accomplish wonders in Explore the Universe 2175.
            </p>
            <p className="mt-3 text-slate-400 leading-relaxed">
              She remembers a galaxy that was. Help her guide what comes next.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
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
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
