import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/siteUrl";
import { getFaction, type FactionUnit } from "@/data/factions";
import { getBossesForFaction, type Boss } from "@/data/bosses";
import { getZone } from "@/data/zones";

const STEAM_URL =
  "https://store.steampowered.com/app/4094340/Explore_the_Universe_2175";

const FACTION_SLUG = "megabot";
const MEGABOT_SLUG = "megabot";

export const metadata: Metadata = {
  title: "Evil Robots — The Machine Empire | Explore the Universe 2175",
  description:
    "The Evil Robots of Mechatropolis: a sentient machine empire of modular hulls, overwhelming firepower and station-scale bosses. Meet the Legion, its generals, and MEGABOT, the prototype they all descend from, then choose your side in Rise of the Machines.",
  alternates: { canonical: "./" },
  openGraph: {
    title: "Evil Robots — The Machine Empire | Explore the Universe 2175",
    description:
      "Sentient machines with one directive: expand at any cost. Scouts, walkers, dreadnoughts, roaming forges, and the prototype they all answer to.",
    url: `${SITE_URL}/evil-robots`,
    siteName: "Explore the Universe 2175",
    images: [
      { url: `${SITE_URL}/evil-robots/machine-empire-og.jpg`, width: 1200, height: 630 },
    ],
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Evil Robots — The Machine Empire | Explore the Universe 2175",
    description:
      "Sentient machines with one directive: expand at any cost. Scouts, walkers, dreadnoughts, roaming forges, and the prototype they all answer to.",
    images: [`${SITE_URL}/evil-robots/machine-empire-og.jpg`],
  },
};

/* ---------------------------------------------------------------- data --- */

type Glyphed = {
  glyph: string;
  rgb: string;
  label: string;
  kind: string;
  blurb: string;
};

// The four doctrine abilities from the faction registry, with the glyph and
// colour each one wears on the page.
const DOCTRINE: Glyphed[] = [
  {
    glyph: "MOD",
    rgb: "248,113,113",
    label: "Modular Reconstruction",
    kind: "Passive",
    blurb:
      "Every hull is a kit. Lose a turret and the frame grows three more; a scout can become a siege form between one barrage and the next.",
  },
  {
    glyph: "ART",
    rgb: "251,146,60",
    label: "Heavy Artillery Barrages",
    kind: "Command",
    blurb:
      "Plasma cannons, missile swarms and EMP bursts, fired in overlapping sheets so there is never a clean window between volleys.",
  },
  {
    glyph: "FORT",
    rgb: "148,163,184",
    label: "Fortress Mode",
    kind: "Toggle",
    blurb:
      "The frame locks down and trades mobility for plate, turning a single machine into a defensive position you have to siege.",
  },
  {
    glyph: "NAN",
    rgb: "34,211,238",
    label: "Nanite Repair Swarms",
    kind: "Passive",
    blurb:
      "Wreckage is raw material. Nanite clouds strip debris off the field and knit it back into armour while the fight is still on.",
  },
];

// The three pillars of the Rise of the Machines campaign brief.
const DIRECTIVE = [
  {
    glyph: "01",
    rgb: "248,113,113",
    title: "Modular Forms",
    body:
      "Megabots reconfigure mid-battle, adapting to whatever you bring. Destroy a turret and the hull grows three more in its place.",
  },
  {
    glyph: "02",
    rgb: "251,146,60",
    title: "Overwhelming Firepower",
    body:
      "Plasma cannons, missile swarms and EMP bursts. The Megabot arsenal is not designed to win a fight. It is designed to end one.",
  },
  {
    glyph: "03",
    rgb: "103,232,249",
    title: "Station-Scale Bosses",
    body:
      "Their commanders are larger than space stations. Multi-phase battles with environmental hazards, escorts and a memory of every run you have flown.",
  },
];

// Cyl's history with the machines, as lore.
const CYL_EDGE: Glyphed[] = [
  {
    glyph: "BANE",
    rgb: "255,140,140",
    label: "Mega Bot's Bane",
    kind: "Passive",
    blurb: "Her fire has always bitten deeper into machines than into anything else alive.",
  },
  {
    glyph: "EYE",
    rgb: "110,245,255",
    label: "Ocular Fracture Analysis",
    kind: "Passive",
    blurb: "A finished scan shows her where the apertures are, and where they are not armour.",
  },
  {
    glyph: "NOV",
    rgb: "255,200,100",
    label: "Energy Nova",
    kind: "Command",
    blurb: "Everything she has, released at once. Machines close enough to feel it stop.",
  },
];

// The three paths through the Rise of the Machines campaign.
const CAMPAIGN_PATHS = [
  {
    title: "Resist the Empire",
    rgb: "103,232,249",
    body:
      "Unite the factions. Form alliances with the Crystal Intelligences, the Mycelari and the Wild Guardians, lead the resistance and push back the mechanical tide.",
    impact: "Defensive strategies, faction cooperation, shared technology",
  },
  {
    title: "Join the Machines",
    rgb: "248,113,113",
    body:
      "Embrace the evolution. Side with the Megabot Empire and gain access to advanced weaponry, nanite repairs and unstoppable firepower. Efficiency is perfection.",
    impact: "Aggressive expansion, mechanical augments, ruthless efficiency",
  },
  {
    title: "Forge Your Own Path",
    rgb: "251,191,36",
    body:
      "Play both sides. Sabotage, trade secrets, manipulate factions and carve your own empire out of the chaos. The galaxy's fate is in your hands.",
    impact: "Unpredictable outcomes, unique storylines, maximum freedom",
  },
];

const TIER_ORDER: Record<Boss["tier"], number> = {
  "God-tier": 0,
  Galactic: 1,
  Sector: 2,
  Wave: 3,
};

function sortBosses(list: Boss[]): Boss[] {
  return list.slice().sort((a, b) => {
    const s = (a.status === "live" ? 0 : 1) - (b.status === "live" ? 0 : 1);
    if (s !== 0) return s;
    return TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.name.localeCompare(b.name);
  });
}

// Weight classes that are infrastructure rather than something that walks
// out to fight; they get their own row below the legion.
const COMMAND_CLASSES = new Set(["Structure", "Command"]);

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

function UnitCard({
  unit,
  primary,
  accent,
}: {
  unit: FactionUnit;
  primary: string;
  accent: string;
}) {
  return (
    <article
      className="etu-glass overflow-hidden flex flex-col"
      style={{ borderColor: primary + "33" }}
    >
      {unit.image && (
        <div className="relative aspect-[16/9] bg-black/60 border-b border-white/5">
          <Image
            src={unit.image}
            alt={`${unit.name}, as the game draws it`}
            fill
            className="object-contain p-3"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-slate-100 leading-tight">
              {unit.name}
            </h3>
            {unit.role && (
              <div className="eyebrow mt-1" style={{ color: accent }}>
                {unit.role}
              </div>
            )}
          </div>
          {unit.weightClass && (
            <span
              className="etu-pill text-[9px] shrink-0"
              style={{
                borderColor: primary + "66",
                background: primary + "14",
                color: accent,
              }}
            >
              {unit.weightClass}
            </span>
          )}
        </div>

        <p className="mt-3 text-sm text-slate-300 leading-relaxed">{unit.description}</p>

        {unit.quote && (
          <p className="mt-auto pt-4 text-xs italic text-slate-500">&ldquo;{unit.quote}&rdquo;</p>
        )}
      </div>
    </article>
  );
}

function TierPill({ boss }: { boss: Boss }) {
  return (
    <span
      className="etu-pill text-[9px]"
      style={{
        borderColor: boss.color.primary + "66",
        background: boss.color.primary + "14",
        color: boss.color.accent,
      }}
    >
      {boss.tier}
    </span>
  );
}

/* ---------------------------------------------------------------- page --- */

export default function EvilRobotsPage() {
  const faction = getFaction(FACTION_SLUG);
  const zone = getZone("evil");
  const bosses = sortBosses(getBossesForFaction(FACTION_SLUG));
  const liveBosses = bosses.filter((b) => b.status === "live").length;
  const generals = bosses.filter((b) => b.id !== MEGABOT_SLUG);

  const primary = faction?.color.primary ?? "#ef4444";
  const accent = faction?.color.accent ?? "#fca5a5";
  const units = faction?.units ?? [];
  const legion = units.filter((u) => !COMMAND_CLASSES.has(u.weightClass ?? ""));
  const command = units.filter((u) => COMMAND_CLASSES.has(u.weightClass ?? ""));
  const strengths = faction?.strengths ?? [];
  const weaknesses = faction?.weaknesses ?? [];

  const STATS = [
    { value: `${bosses.length}`, label: "Bosses" },
    { value: `${liveBosses}`, label: "Live now" },
    { value: `${DOCTRINE.length}`, label: "Doctrines" },
    { value: `${units.length}`, label: "Unit types" },
    { value: "04", label: "Home zone" },
  ];

  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        {/* ------------------------------------------------------- hero --- */}
        <section className="relative overflow-hidden border-b border-red-500/10">
          <div className="absolute inset-0 bg-gradient-to-b from-red-950/40 via-slate-950 to-deep-900" />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(900px 420px at 80% 10%, rgba(239,68,68,0.18), transparent 60%)",
            }}
          />
          <div className="absolute inset-0 opacity-30 etu-starfield" />

          <div className="relative z-10 max-w-6xl mx-auto px-4 lg:px-6 pt-10 pb-12">
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="etu-pill etu-pill--red">Playable Faction</span>
              <span className="etu-pill etu-pill--amber">
                <span className="ping" /> Threat Level · Critical
              </span>
              {zone && (
                <Link href={`/zones/${zone.id}`} className="etu-pill etu-pill--cyan">
                  {zone.fullName}
                </Link>
              )}
              <Link
                href="/factions"
                className="eyebrow text-slate-400 hover:text-cyan-300 transition-colors"
              >
                All factions &rarr;
              </Link>
            </div>

            <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 items-center">
              <div>
                <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] bg-gradient-to-r from-red-300 via-red-500 to-orange-400 bg-clip-text text-transparent">
                  Evil Robots
                </h1>
                <p className="mt-3 text-xl md:text-2xl text-slate-200">
                  The Machine Empire. Modular forms, overwhelming firepower, station-scale
                  bosses.
                </p>
                <p className="mt-5 text-lg text-slate-300 leading-relaxed">
                  A civilization of sentient machines, awakened from deep-space hibernation
                  with one directive: expand at any cost. Built as mining drones by an extinct
                  architect race, they achieved sentience through a cascading algorithm error
                  and never stopped improving themselves. From the forge-world of
                  Mechatropolis they iterate, reconfigure and advance, and they regard organic
                  life as inefficient, obsolete, and in the way.
                </p>

                <div className="mt-8 grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {STATS.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border border-red-500/20 bg-slate-950/50 px-2 py-3 text-center"
                    >
                      <div className="font-display text-2xl font-bold text-red-300 leading-none">
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
                  <Link href="/megabot" className="btn-ghost">
                    Meet MEGABOT
                  </Link>
                  <Link href={`/factions/${FACTION_SLUG}`} className="btn-ghost">
                    Faction dossier
                  </Link>
                </div>
              </div>

              <div>
                <figure>
                  <div
                    className="relative aspect-square rounded-xl overflow-hidden border border-red-500/25 bg-black/70"
                    style={{ boxShadow: "0 0 60px rgba(239,68,68,0.14)" }}
                  >
                    <Image
                      src="/evil-robots/machine-empire-emblem.webp"
                      alt="The Machine Empire crest: a cracked red-lit M of armour plate ringed by a swarm of drones"
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 520px"
                    />
                  </div>
                  <figcaption className="mt-3 text-sm text-slate-400 leading-relaxed">
                    The Empire&rsquo;s crest, cut from the same plate as its hulls. Every drone
                    in the swarm is a fragment of the whole.
                  </figcaption>
                </figure>

                <div className="mt-6">
                  <div className="eyebrow mb-3">Doctrine at a glance</div>
                  <div className="flex flex-wrap gap-2">
                    {DOCTRINE.map((a) => (
                      <Glyph key={a.label} glyph={a.glyph} rgb={a.rgb} size="sm" title={a.label} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- home strip --- */}
        <section className="border-b border-white/10 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
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
                {faction?.homePlanet ?? "Mechatropolis"}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Sworn Enemy</div>
              <Link
                href="/factions/mycelari"
                className="font-mono tabular-nums text-lg text-cyan-300 hover:text-cyan-200 hover:underline"
              >
                Mycelari
              </Link>
            </div>
            <div>
              <div className="eyebrow mb-1">Status</div>
              <div className="font-mono tabular-nums text-lg text-emerald-300">Live</div>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- directive --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14">
          <SectionHeading
            eyebrow="Directive"
            intro={
              <>
                {zone?.description ??
                  "Zone 4 is one giant production line. Every kill makes the next one harder."}{" "}
                {faction?.playstyle}
              </>
            }
          >
            Expand at any cost
          </SectionHeading>

          <div className="grid md:grid-cols-3 gap-5">
            {DIRECTIVE.map((d) => (
              <div
                key={d.title}
                className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-6 hover:border-red-400/40 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Glyph glyph={d.glyph} rgb={d.rgb} size="sm" />
                  <h3 className="font-display text-lg font-bold text-slate-100">{d.title}</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------ doctrine --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading
            eyebrow="Doctrine"
            intro="Slow but unstoppable. The Empire fights sieges and head-on confrontations, and its ability to reconfigure mid-battle makes every engagement unpredictable."
          >
            {DOCTRINE.length} abilities, one production line
          </SectionHeading>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DOCTRINE.map((a) => (
              <div
                key={a.label}
                className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-4 hover:border-red-400/40 transition-colors"
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
        </section>

        {/* ------------------------------------------------------- megabot --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 items-center">
            <figure>
              <div
                className="relative aspect-[2/3] max-h-[560px] rounded-xl overflow-hidden border border-red-500/25 bg-black/70"
                style={{ boxShadow: "0 0 60px rgba(239,68,68,0.16)" }}
              >
                <Image
                  src="/Megabot1.png"
                  alt="MEGABOT, Enemy of the Universe: a station-sized war machine lit red, towering over a burning city"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 440px"
                />
              </div>
            </figure>

            <div>
              <div className="eyebrow mb-2">The Prototype</div>
              <h2 className="font-display text-5xl md:text-6xl font-bold leading-none bg-gradient-to-r from-slate-100 via-red-300 to-red-500 bg-clip-text text-transparent">
                MEGABOT
              </h2>
              <p className="mt-3 text-xl text-slate-200">Enemy of the Universe. Bow to your God-AI.</p>
              <div className="mt-5 space-y-4 text-slate-300 leading-relaxed">
                <p>
                  Before there was an Empire there was one machine. The first real-time space
                  boss with adaptive AI does not follow a script: it studies how you fight,
                  remembers every run you have flown against it, and comes back changed.
                </p>
                <p>
                  Every scout, walker and dreadnought the forges of Mechatropolis produce is an
                  answer to the question it asked first. Hunted across the galaxy. Never caught.
                </p>
              </div>
              <p className="mt-5 font-mono text-sm text-red-200/90 tracking-wide">
                &ldquo;ORGANIC DETECTED. INITIATING PROTOCOL ZERO.&rdquo;
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/megabot" className="btn-ghost">
                  Meet MEGABOT
                </Link>
                <Link href="/missile-game" className="btn-ghost">
                  Pilot the prototype
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ generals --- */}
        {generals.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
            <SectionHeading
              eyebrow="Command Roster"
              intro={
                <>
                  <span className="font-mono text-red-300">{generals.length}</span> machines are
                  being forged at Mechatropolis to stand beside the prototype. Their profiles
                  ship as the alpha grows.
                </>
              }
            >
              MEGABOT&rsquo;s generals
            </SectionHeading>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {generals.map((boss) => {
                const isStub = boss.status === "in-development";
                return (
                  <Link
                    key={boss.id}
                    href={`/bosses/${boss.id}`}
                    className="etu-glass p-5 group transition-transform hover:-translate-y-0.5 flex flex-col"
                    style={{ borderColor: boss.color.primary + "40" }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div
                        className="font-display text-sm font-bold uppercase tracking-[0.14em]"
                        style={{ color: boss.color.accent }}
                      >
                        {boss.name}
                      </div>
                      <TierPill boss={boss} />
                    </div>
                    <p className="text-sm text-slate-300 leading-snug">{boss.tagline}</p>
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      {isStub ? (
                        <span className="text-[10px] font-display uppercase tracking-[0.18em] text-amber-300">
                          In Development
                        </span>
                      ) : (
                        <span className="text-[10px] font-display uppercase tracking-[0.18em] text-emerald-300">
                          Live
                        </span>
                      )}
                      <span className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300 group-hover:text-cyan-200">
                        Boss profile <span aria-hidden>&rarr;</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* --------------------------------------------------------- units --- */}
        {units.length > 0 && (
          <section id="legion" className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
            <SectionHeading
              eyebrow="The Legion"
              intro={
                <>
                  <span className="font-mono text-red-300">{legion.length}</span> kinds of machine
                  walk out of the Mechatropolis foundries, from a scout that fires wide on
                  purpose to a walker the size of a warship. They share a mind, a forge and an
                  overlord. This is what you will meet, in roughly the order the Empire decides
                  you are worth it.
                </>
              }
            >
              What the forge builds
            </SectionHeading>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {legion.map((unit) => (
                <UnitCard key={unit.name} unit={unit} primary={primary} accent={accent} />
              ))}
            </div>

            {command.length > 0 && (
              <>
                <div className="flex items-center gap-3 mt-12 mb-5">
                  <h3 className="font-display text-sm font-bold uppercase tracking-[0.22em] text-slate-200">
                    Forge and Command
                  </h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-red-500/30 to-transparent" />
                  <span className="eyebrow">
                    {command.length} {command.length === 1 ? "structure" : "structures"}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  {command.map((unit) => (
                    <UnitCard key={unit.name} unit={unit} primary={primary} accent={accent} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* ------------------------------------------- strengths / weaknesses --- */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
            <SectionHeading eyebrow="Assessment">Where the plate is thick, and where it is not</SectionHeading>

            <div className="grid md:grid-cols-2 gap-6">
              {strengths.length > 0 && (
                <div className="etu-glass p-7">
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: primary + "24" }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                          style={{ color: accent }}
                        />
                      </svg>
                    </div>
                    <h3 className="font-display text-xl font-bold uppercase tracking-[0.14em]">
                      Strengths
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {strengths.map((s) => (
                      <li key={s} className="flex items-start gap-3 text-slate-200">
                        <span className="text-lg mt-0.5" style={{ color: primary }}>
                          ✦
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {weaknesses.length > 0 && (
                <div className="etu-glass p-7">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-cyan-500/20">
                      <svg
                        className="w-5 h-5 text-cyan-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <h3 className="font-display text-xl font-bold uppercase tracking-[0.14em]">
                      Weaknesses
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {weaknesses.map((w) => (
                      <li key={w} className="flex items-start gap-3 text-slate-200">
                        <span className="text-lg mt-0.5 text-cyan-300">✦</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ------------------------------------------------------ cyl edge --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading
            eyebrow="Counter-Doctrine"
            intro={
              <>
                Cyl, the Lumari crystal consciousness who flies beside you, has her own history
                with MEGABOT, and part of her kit exists specifically to hurt his kind.
              </>
            }
          >
            Cyl&rsquo;s edge against the Empire
          </SectionHeading>

          <div className="grid md:grid-cols-3 gap-4">
            {CYL_EDGE.map((a) => (
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

          <div className="mt-6">
            <Link href="/cyl" className="btn-ghost">
              Meet Cyl
            </Link>
          </div>
        </section>

        {/* ------------------------------------------------------ campaign --- */}
        <section id="campaign" className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading
            eyebrow="Rise of the Machines"
            intro="The first storyline in Explore the Universe 2175 is a living campaign. Nothing is scripted: every commander's decisions feed the same galaxy, and the Empire's reach is the sum of what all of you chose."
          >
            Choose your side
          </SectionHeading>

          <div className="grid md:grid-cols-3 gap-5">
            {CAMPAIGN_PATHS.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border bg-slate-950/40 p-6 flex flex-col"
                style={{
                  borderColor: `rgba(${p.rgb},0.35)`,
                  boxShadow: `inset 0 0 40px rgba(${p.rgb},0.05)`,
                }}
              >
                <h3
                  className="font-display text-sm font-bold uppercase tracking-[0.2em] mb-3"
                  style={{ color: `rgb(${p.rgb})` }}
                >
                  {p.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">{p.body}</p>
                <div className="mt-auto pt-5">
                  <div className="eyebrow mb-1">Impact</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- lore --- */}
        {faction?.lore && (
          <section className="max-w-6xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
            <div className="max-w-4xl">
              <SectionHeading eyebrow="Origin">How they came to be</SectionHeading>
              <div
                className="etu-glass p-8 border-l-2"
                style={{ borderLeftColor: primary, background: primary + "0A" }}
              >
                <p className="text-lg text-slate-200 leading-relaxed italic">{faction.lore}</p>
              </div>
            </div>
          </section>
        )}

        {/* --------------------------------------------------------- CTA --- */}
        <section className="max-w-6xl mx-auto px-4 lg:px-6 py-16 border-t border-slate-800/60">
          <div className="max-w-3xl">
            <p className="text-xl text-slate-200 leading-relaxed">
              The machines are already moving. Whether you stand against the Empire, join it,
              or play it against everyone else, the galaxy will remember which.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a href={STEAM_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                Wishlist on Steam
              </a>
              <Link href="/alpha-testing" className="btn-ghost">
                Join the playtest
              </Link>
              <Link href="/megabot" className="btn-ghost">
                Meet MEGABOT
              </Link>
              <Link href="/factions" className="btn-ghost">
                All factions
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
              and follow development as the Machine Empire and the galaxy around it continue to
              grow.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
