import { resolveFactionSlug } from "./factions";

/**
 * The bosses that exist in the game today: the Construct LAB's boss roster
 * (`_construct_boss_token_order` in the ETU runtime). Every line of copy here
 * is taken from the game code — bestiary blurbs, registry fields, ability
 * names and in-game dialogue. Nothing planned, nothing invented.
 */

/** Bestiary rarity. Only bosses with a bestiary entry carry one. */
export type BossTier = "Rare" | "Epic" | "Legendary";
export type BossStatus = "live" | "in-development";

export interface BossAbility {
  name: string;
  /** One short line: what it does. */
  text: string;
}

export interface BossShot {
  src: string;
  alt: string;
}

export interface Boss {
  /** URL slug. Hyphenated, lower-case. */
  id: string;
  /** Game-side registry token (snake_case). */
  token: string;
  /** Display name, as the game shows it. */
  name: string;
  /** One line, from the game's own text. */
  tagline: string;
  /** Hero image (path under /public). */
  heroImage: string;
  /** In-game screenshots. */
  screenshots: BossShot[];
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  tier?: BossTier;
  /** Game-side faction token from the boss registry. */
  factionToken?: string;
  /** Resolved website faction slug for cross-linking (computed). */
  factionId?: string;
  abilities: BossAbility[];
  /** A line the boss says in-game. */
  quote?: string;
  homeZone?: string;
  homePlanet?: string;
  status: BossStatus;
  /** Long-form page for this boss outside /bosses/[slug] (e.g. /megabot). */
  featurePage?: { href: string; label: string };
}

const SHOT = "/bosses";

const RAW_BOSSES: Boss[] = [
  {
    id: "megabot",
    token: "megabot",
    name: "MEGABOT",
    tagline: "The machine god. Its eyes are its weapons.",
    heroImage: `${SHOT}/megabot-orbital-strike.jpg`,
    screenshots: [
      { src: `${SHOT}/megabot-orbital-strike.jpg`, alt: "MEGABOT calling an Orbital Strike" },
      { src: `${SHOT}/megabot-eye-beam.jpg`, alt: "MEGABOT firing from its eye" },
      { src: `${SHOT}/megabot-evil-eye-telegraph.jpg`, alt: "MEGABOT locking on with the Evil Eye" },
    ],
    color: { primary: "#ef4444", secondary: "#dc2626", accent: "#fca5a5" },
    tier: "Legendary",
    factionToken: "evil_robots",
    abilities: [
      { name: "Evil Eye", text: "A tracking lance that pierces everything in its line." },
      { name: "Orbital Strike", text: "Three delayed impacts around your ship." },
      { name: "Minibot Swarm", text: "Releases a swarm of minibots." },
      { name: "Protocol Zero", text: "At 1% hull: a ten-second self-destruct countdown." },
    ],
    quote: "EACH COMPONENT IS SUFFICIENT TO END YOU.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
    featurePage: { href: "/megabot", label: "Meet MEGABOT" },
  },
  {
    id: "mega-mecha-scout",
    token: "mega_mecha_scout",
    name: "Mega Mecha Scout",
    tagline: "A scout scaled past all reason, and armed to match its arrogance.",
    heroImage: `${SHOT}/mega-mecha-scout-render.jpg`,
    screenshots: [
      { src: `${SHOT}/mega-mecha-scout-render.jpg`, alt: "Mega Mecha Scout hull" },
      { src: `${SHOT}/mega-mecha-scout-volley.jpg`, alt: "Mega Mecha Scout missile volley closing on the player" },
    ],
    color: { primary: "#f97316", secondary: "#ea580c", accent: "#fdba74" },
    tier: "Epic",
    factionToken: "evil_robots",
    abilities: [
      { name: "Missile Volleys", text: "Cluster, splitter and long-range homing rounds." },
      { name: "Machine Gun", text: "Opens up at close range." },
      { name: "Escorts", text: "Calls in ordinary Mecha Scouts." },
    ],
    quote: "My missiles are unstoppable.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
  },
  {
    id: "sidewinder",
    token: "sidewinder",
    name: "SideWinder",
    tagline: "It will not turn to face you and it will not fly where it is pointed.",
    heroImage: `${SHOT}/sidewinder-burn.jpg`,
    screenshots: [
      { src: `${SHOT}/sidewinder-burn.jpg`, alt: "SideWinder mid lateral burn" },
      { src: `${SHOT}/sidewinder-turn.jpg`, alt: "SideWinder swinging its drive yoke" },
      { src: `${SHOT}/sidewinder-drift.jpg`, alt: "SideWinder drifting between burns" },
    ],
    color: { primary: "#fbbf24", secondary: "#d97706", accent: "#fde68a" },
    tier: "Rare",
    factionToken: "evil_robots",
    abilities: [
      { name: "Lateral Drive", text: "Charges, then burns sideways across your line." },
      { name: "Drift Lance", text: "A heavy bolt from its free-turning gun cradle." },
      { name: "Crossfire", text: "A five-round fan, fired mid-burn." },
      { name: "Wake Charge", text: "Mines left in its wake." },
    ],
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
  },
  {
    id: "arkanvil-king",
    token: "arkanvil_king",
    name: "King Arkanvil Starhammer",
    tagline: "A forge-hull that charges its crystal and brings it down like a hammer.",
    heroImage: `${SHOT}/arkanvil-battery.jpg`,
    screenshots: [
      { src: `${SHOT}/arkanvil-battery.jpg`, alt: "King Arkanvil's hull battery firing" },
      { src: `${SHOT}/arkanvil-hull.jpg`, alt: "Rune band, gem inlays and the Starhammer sigil" },
    ],
    color: { primary: "#a78bfa", secondary: "#7c3aed", accent: "#ddd6fe" },
    tier: "Epic",
    factionToken: "space_dwarves",
    abilities: [
      { name: "Crystal Charge", text: "Dashes in from range." },
      { name: "Hammer Burst", text: "A lunge and shock at close quarters." },
      { name: "Turret Battery", text: "Eight twin-barrel mounts, firing in a ripple. Faster as he weakens." },
    ],
    quote: "Threaten the guild and I'll shatter your hull where it drifts.",
    homeZone: "Zone 10: Crystal",
    homePlanet: "Yllar",
    status: "live",
  },
  {
    id: "bloom-queen",
    token: "bloom_queen",
    name: "Bloom Queen",
    tagline: "She seeds the field with her own children and reaps what grows.",
    heroImage: `${SHOT}/bloom-queen.jpg`,
    screenshots: [
      { src: `${SHOT}/bloom-queen.jpg`, alt: "Bloom Queen in Spore Thruster Assault" },
      { src: `${SHOT}/bloom-queen-formation.jpg`, alt: "Bloom Queen commanding a battle formation" },
    ],
    color: { primary: "#e879f9", secondary: "#c026d3", accent: "#f5d0fe" },
    tier: "Epic",
    factionToken: "mycelari",
    abilities: [
      { name: "Spore Thruster Assault", text: "Charges, then dashes at her target." },
      { name: "Crimson Conversion", text: "Turns enemies into fungal warriors." },
      { name: "Paradise Protocol", text: "A spreading field that births Mycelari." },
      { name: "Convergence", text: "Shares one health pool with the Fungal Lord." },
    ],
    quote: "The bloom welcomes your presence.",
    homeZone: "Zone 1: Fungal",
    homePlanet: "Bloomhaven",
    status: "live",
  },
  {
    id: "fungal-lord",
    token: "fungal_lord",
    name: "Fungal Lord",
    tagline: "The supreme leader of the Mycelari. A massive networked consciousness.",
    heroImage: `${SHOT}/fungal-lord.jpg`,
    screenshots: [
      { src: `${SHOT}/fungal-lord.jpg`, alt: "The Fungal Lord" },
      { src: `${SHOT}/fungal-lord-network.jpg`, alt: "The Fungal Lord linked to his network" },
    ],
    color: { primary: "#f87171", secondary: "#b91c1c", accent: "#fecaca" },
    factionToken: "mycelari",
    abilities: [
      { name: "Spore Barrage", text: "Aimed spore volleys." },
      { name: "Orchestrating", text: "Summons fungal warriors and powers them up." },
      { name: "Defensive Cocoon", text: "Holds still and rebuilds his shield." },
      { name: "Death Bloom", text: "His network collapses with him." },
    ],
    homeZone: "Zone 1: Fungal",
    homePlanet: "Lordspore",
    status: "live",
  },
  {
    id: "ursos",
    token: "ursos",
    name: "Ursos, Bear King",
    tagline: "Wild King and Guardian of Urthan Prime. Half fur, half steel.",
    heroImage: `${SHOT}/ursos-charge.jpg`,
    screenshots: [
      { src: `${SHOT}/ursos-charge.jpg`, alt: "Ursos in a rampage charge" },
      { src: `${SHOT}/ursos-maw-beam.jpg`, alt: "Ursos firing his maw beam" },
      { src: `${SHOT}/ursos-hull.jpg`, alt: "Ursos" },
    ],
    color: { primary: "#34d399", secondary: "#059669", accent: "#a7f3d0" },
    factionToken: "wild_clans",
    abilities: [
      { name: "Rampage Charge", text: "Winds up, then rams." },
      { name: "Maw Beam", text: "A charged beam from the jaws." },
      { name: "Claw Launch", text: "A thrown claw that splits into finger missiles." },
      { name: "Grapple Chain", text: "Drags you in." },
    ],
    quote: "Steel and claw. We settle this the old way.",
    homeZone: "Zone 2: Wild",
    homePlanet: "Urthan Prime",
    status: "live",
  },
];

export const bosses: Record<string, Boss> = Object.fromEntries(
  RAW_BOSSES.map((b) => [b.id, { ...b, factionId: b.factionToken ? resolveFactionSlug(b.factionToken) : undefined }])
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
