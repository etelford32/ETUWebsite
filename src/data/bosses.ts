import { resolveFactionSlug } from "./factions";

/**
 * The bosses in the game, as the site presents them: who they are, what they
 * look like, whose flag they fly and where they live.
 *
 * Deliberately nothing about how they fight. No abilities, stats, phases,
 * encounter triggers or attack screenshots belong in this file or under
 * /public/bosses: this repository is public and this data ships in the page
 * bundle. Players learn the fights in the game.
 */

/** Bestiary rarity. */
export type BossTier = "Rare" | "Epic" | "Legendary";
export type BossStatus = "live" | "in-development";

export interface BossShot {
  src: string;
  alt: string;
}

export interface Boss {
  /** URL slug. Hyphenated, lower-case. */
  id: string;
  /** Display name, as the game shows it. */
  name: string;
  /** One short hook. */
  tagline: string;
  /** Portrait (path under /public). */
  image: BossShot;
  /** Same as image.src. */
  heroImage: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  tier?: BossTier;
  /** Game-side faction token. */
  factionToken?: string;
  /** Resolved website faction slug for cross-linking (computed). */
  factionId?: string;
  /** A line the boss says. */
  quote?: string;
  homeZone?: string;
  homePlanet?: string;
  status: BossStatus;
  /** Other bosses this one is tied to, with the tie. */
  related?: { id: string; note: string }[];
  /** Long-form page for this boss outside /bosses/[slug] (e.g. /megabot). */
  featurePage?: { href: string; label: string };
}

const SHOT = "/bosses";

type RawBoss = Omit<Boss, "heroImage" | "factionId" | "status">;

const RAW_BOSSES: RawBoss[] = [
  {
    id: "megabot",
    name: "MEGABOT",
    tagline: "The machine god. Its eyes are its weapons.",
    image: { src: `${SHOT}/megabot.jpg`, alt: "MEGABOT" },
    color: { primary: "#ef4444", secondary: "#dc2626", accent: "#fca5a5" },
    tier: "Legendary",
    factionToken: "evil_robots",
    quote: "ORGANIC DETECTED. INITIATING PROTOCOL ZERO.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    related: [
      { id: "xj9", note: "The armour he wears to war." },
      { id: "siege-colossus", note: "His ultimate weapon, and his pet." },
      { id: "null-architect", note: "His high priest." },
      { id: "crush", note: "His strangler." },
      { id: "alpha-robot", note: "The soldier he built." },
    ],
    featurePage: { href: "/megabot", label: "Meet MEGABOT" },
  },
  {
    id: "mega-mecha-scout",
    name: "Mega Mecha Scout",
    tagline: "A scout scaled past all reason.",
    image: { src: `${SHOT}/mega-mecha-scout.jpg`, alt: "Mega Mecha Scout" },
    color: { primary: "#f97316", secondary: "#ea580c", accent: "#fdba74" },
    tier: "Epic",
    factionToken: "evil_robots",
    quote: "Biggest scout in the fleet.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
  },
  {
    id: "robo-b",
    name: "Robo B",
    tagline: "A chrome war frame, and he knows it.",
    image: { src: `${SHOT}/robo-b.jpg`, alt: "Robo B" },
    color: { primary: "#60ccff", secondary: "#5c687c", accent: "#bfe9ff" },
    tier: "Epic",
    factionToken: "evil_robots",
    quote: "ROBO B ONLINE. TARGET ACQUIRED.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
  },
  {
    id: "alpha-robot",
    name: "Alpha Robot",
    tagline: "Two minds, one fight.",
    image: { src: `${SHOT}/alpha-robot.jpg`, alt: "Alpha Robot" },
    color: { primary: "#d6463c", secondary: "#782420", accent: "#ffb3ab" },
    tier: "Epic",
    factionToken: "evil_robots",
    quote: "THE EYE SENDS ITS REGARDS.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    related: [
      { id: "megabot", note: "The Eye that sends him." },
    ],
  },
  {
    id: "sidewinder",
    name: "SideWinder",
    tagline: "It never flies where it is pointed.",
    image: { src: `${SHOT}/sidewinder.jpg`, alt: "SideWinder" },
    color: { primary: "#fbbf24", secondary: "#d97706", accent: "#fde68a" },
    tier: "Rare",
    factionToken: "evil_robots",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
  },
  {
    id: "null-architect",
    name: "Null Architect",
    tagline: "Megabot's high priest. He built the room you are standing in.",
    image: { src: `${SHOT}/null-architect.jpg`, alt: "The Null Architect" },
    color: { primary: "#5aff8c", secondary: "#aa82ff", accent: "#e8ffee" },
    tier: "Legendary",
    factionToken: "evil_robots",
    quote: "I computed you before you were born.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    related: [
      { id: "megabot", note: "He is Megabot's high priest." },
    ],
  },
  {
    id: "siege-colossus",
    name: "Siege Colossus",
    tagline: "Megabot's ultimate weapon. And his pet.",
    image: { src: `${SHOT}/siege-colossus.jpg`, alt: "The Siege Colossus" },
    color: { primary: "#ff7850", secondary: "#ff4646", accent: "#ffc9a8" },
    tier: "Legendary",
    factionToken: "evil_robots",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    related: [
      { id: "megabot", note: "Megabot's ultimate weapon, and his pet." },
    ],
  },
  {
    id: "crush",
    name: "Crush",
    tagline: "The Megabot's strangler.",
    image: { src: `${SHOT}/crush.jpg`, alt: "Crush" },
    color: { primary: "#ff3b30", secondary: "#c4181e", accent: "#ffb09c" },
    tier: "Legendary",
    factionToken: "evil_robots",
    quote: "COME CLOSER, LITTLE SHIP.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    related: [
      { id: "megabot", note: "He is the Megabot's strangler." },
    ],
  },
  {
    id: "xj9",
    name: "XJ9",
    tagline: "The armour the Megabot wears to war.",
    image: { src: `${SHOT}/xj9.jpg`, alt: "XJ9" },
    color: { primary: "#ff8424", secondary: "#b0803e", accent: "#f6cc7e" },
    tier: "Legendary",
    factionToken: "evil_robots",
    quote: "THIS WORLD IS MINE. YOU DO NOT PASS.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    related: [
      { id: "megabot", note: "The Megabot wears this suit to war." },
    ],
  },
  {
    id: "siege-mecha",
    name: "Siege Mecha",
    tagline: "The Evil Robots' long gun.",
    image: { src: `${SHOT}/siege-mecha.jpg`, alt: "Siege Mecha" },
    color: { primary: "#e0333a", secondary: "#681016", accent: "#e8c063" },
    tier: "Epic",
    factionToken: "evil_robots",
    quote: "RANGE IS MINE.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
  },
  {
    id: "ursos",
    name: "Ursos, Bear King",
    tagline: "Half fur, half steel. King of the Wild.",
    image: { src: `${SHOT}/ursos.jpg`, alt: "Ursos, Bear King" },
    color: { primary: "#34d399", secondary: "#059669", accent: "#a7f3d0" },
    tier: "Epic",
    factionToken: "wild_clans",
    quote: "Steel and claw. We settle this the old way.",
    homeZone: "Zone 2: Wild",
    homePlanet: "Urthan Prime",
    related: [
      { id: "ent-lord", note: "The other lord of the Wild." },
    ],
  },
  {
    id: "bloom-queen",
    name: "Bloom Queen",
    tagline: "She seeds the field and reaps what grows.",
    image: { src: `${SHOT}/bloom-queen.jpg`, alt: "The Bloom Queen" },
    color: { primary: "#e879f9", secondary: "#c026d3", accent: "#f5d0fe" },
    tier: "Epic",
    factionToken: "mycelari",
    quote: "The bloom welcomes your presence.",
    homeZone: "Zone 1: Fungal",
    homePlanet: "Bloomhaven",
    related: [
      { id: "fungal-lord", note: "The crown she blooms beside." },
    ],
  },
  {
    id: "fungal-lord",
    name: "Fungal Lord",
    tagline: "Everything that grows answers to him.",
    image: { src: `${SHOT}/fungal-lord.jpg`, alt: "The Fungal Lord" },
    color: { primary: "#f87171", secondary: "#b91c1c", accent: "#fecaca" },
    tier: "Epic",
    factionToken: "mycelari",
    homeZone: "Zone 1: Fungal",
    homePlanet: "Lordspore",
    related: [
      { id: "bloom-queen", note: "The queen of his bloom." },
    ],
  },
  {
    id: "arkanvil-king",
    name: "King Arkanvil Starhammer",
    tagline: "A forge-hull that falls like a hammer.",
    image: { src: `${SHOT}/arkanvil-king.jpg`, alt: "King Arkanvil Starhammer" },
    color: { primary: "#a78bfa", secondary: "#7c3aed", accent: "#ddd6fe" },
    tier: "Epic",
    factionToken: "crystal_consortium",
    quote: "Threaten the guild and I'll shatter your hull where it drifts.",
    homeZone: "Zone 10: Crystal",
    homePlanet: "Yllar",
  },
  {
    id: "ent-lord",
    name: "EntLord",
    tagline: "The whole Ent Council in one body.",
    image: { src: `${SHOT}/ent-lord.jpg`, alt: "EntLord" },
    color: { primary: "#ffd86e", secondary: "#78e68c", accent: "#fff0c2" },
    tier: "Legendary",
    factionToken: "wild_clans",
    quote: "I was old when your sun was young. Speak quickly.",
    homeZone: "Zone 2: Wild",
    homePlanet: "Enthara",
    related: [
      { id: "ursos", note: "The other lord of the Wild." },
    ],
  },
];

export const bosses: Record<string, Boss> = Object.fromEntries(
  RAW_BOSSES.map((b) => [
    b.id,
    {
      ...b,
      heroImage: b.image.src,
      status: "live" as const,
      factionId: b.factionToken ? resolveFactionSlug(b.factionToken) : undefined,
    },
  ])
) as Record<string, Boss>;

export function getBoss(slug: string): Boss | undefined {
  return bosses[slug];
}

export function getAllBossSlugs(): string[] {
  return Object.keys(bosses);
}

export function getAllBosses(): Boss[] {
  return Object.values(bosses);
}

export function getBossesForFaction(factionSlug: string): Boss[] {
  return Object.values(bosses).filter((b) => b.factionId === factionSlug);
}
