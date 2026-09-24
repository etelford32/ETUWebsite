import { resolveFactionSlug } from "./factions";

/**
 * The bosses that exist in the game today: the Construct LAB's boss roster
 * (`_construct_boss_token_order` in the ETU runtime). Every line of copy here
 * is taken from the game code — bestiary blurbs, registry fields, class
 * constants, ability names and in-game dialogue. Nothing planned, nothing
 * invented.
 */

/** Bestiary rarity. Only bosses with a bestiary entry carry one. */
export type BossTier = "Rare" | "Epic" | "Legendary";
export type BossStatus = "live" | "in-development";

export interface BossAbility {
  name: string;
  /** One short line: what it does. */
  text: string;
  /** Revealed on click: the numbers behind it. */
  detail?: string;
  /** Index into `screenshots` that shows this ability, if one does. */
  shot?: number;
}

export interface BossShot {
  src: string;
  alt: string;
}

export interface BossStat {
  label: string;
  value: string;
}

export interface BossPhase {
  name: string;
  /** Health mark ("60%") for health phases, duration ("0.85 s") for cycles. */
  at: string;
  /** What changes, or what the boss says. */
  line?: string;
  /** True when `line` is something the boss says. */
  spoken?: boolean;
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
  /** Hero image (path under /public). Always screenshots[0]. */
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
  /** How you run into it. */
  encounter?: string;
  stats: BossStat[];
  abilities: BossAbility[];
  /** Health phases, or a repeating combat cycle. */
  phases?: { kind: "health" | "cycle"; label: string; steps: BossPhase[] };
  /** A line the boss says in-game. */
  quote?: string;
  homeZone?: string;
  homePlanet?: string;
  status: BossStatus;
  /** Long-form page for this boss outside /bosses/[slug] (e.g. /megabot). */
  featurePage?: { href: string; label: string };
}

const SHOT = "/bosses";

type RawBoss = Omit<Boss, "heroImage" | "factionId">;

const RAW_BOSSES: RawBoss[] = [
  {
    id: "megabot",
    token: "megabot",
    name: "MEGABOT",
    tagline: "The machine god. Its eyes are its weapons.",
    screenshots: [
      { src: `${SHOT}/megabot-orbital-strike.jpg`, alt: "MEGABOT calling an Orbital Strike" },
      { src: `${SHOT}/megabot-eye-beam.jpg`, alt: "MEGABOT firing from its eye" },
      { src: `${SHOT}/megabot-evil-eye-telegraph.jpg`, alt: "MEGABOT locking on with the Evil Eye" },
    ],
    color: { primary: "#ef4444", secondary: "#dc2626", accent: "#fca5a5" },
    tier: "Legendary",
    factionToken: "evil_robots",
    encounter: "Scales to your ship's power. Its full kit unlocks in its arena.",
    stats: [
      { label: "Hull", value: "50,000" },
      { label: "Power scaling", value: "0.75× – 12×" },
    ],
    abilities: [
      {
        name: "Evil Eye",
        text: "A tracking lance that pierces everything in its line.",
        detail: "Hitscan, 260 damage a second for 5 s. Running hands it the shot: close in and reverse across the sweep.",
        shot: 2,
      },
      {
        name: "Orbital Strike",
        text: "Three delayed impacts around your ship.",
        detail: "420 damage each, 260-unit blast. Arena only.",
        shot: 0,
      },
      { name: "Gravity Well", text: "Pulls your ship in.", detail: "Reaches 900 units. Arena only." },
      { name: "Minibot Swarm", text: "Releases a swarm of minibots." },
      {
        name: "Protocol Zero",
        text: "At 1% hull: a ten-second self-destruct countdown.",
        detail: "Be more than 3,000 units away when it ends.",
      },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Assembled", at: "100%", line: "ALL SYSTEMS NOMINAL. BEGINNING TERMINATION SEQUENCE.", spoken: true },
        { name: "Separated", at: "60%", line: "EACH COMPONENT IS SUFFICIENT TO END YOU.", spoken: true },
        { name: "Overdrive", at: "30%", line: "IMPOSSIBLE. RECALCULATING... RECALCULATING...", spoken: true },
        { name: "Core Meltdown", at: "1%", line: "THIS UNIT... WAS MERELY... A SCOUT...", spoken: true },
      ],
    },
    quote: "ORGANIC DETECTED. INITIATING PROTOCOL ZERO.",
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
    screenshots: [
      { src: `${SHOT}/mega-mecha-scout-render.jpg`, alt: "Mega Mecha Scout hull" },
      { src: `${SHOT}/mega-mecha-scout-volley.jpg`, alt: "Mega Mecha Scout missile volley closing on the player" },
    ],
    color: { primary: "#f97316", secondary: "#ea580c", accent: "#fdba74" },
    tier: "Epic",
    factionToken: "evil_robots",
    encounter: "Survival: arrives when the encounter timer runs out.",
    stats: [
      { label: "Hull", value: "2,400" },
      { label: "Shield", value: "550" },
      { label: "Reward", value: "1,100 XP · 2,200 cr" },
    ],
    abilities: [
      {
        name: "Missile Volleys",
        text: "Cluster, splitter and long-range homing rounds.",
        detail: "Mid volley: four rounds, one every 0.34 s. Its missiles outrun it.",
        shot: 1,
      },
      { name: "Machine Gun", text: "Opens up at close range.", shot: 1 },
      { name: "Escorts", text: "Calls in ordinary Mecha Scouts." },
    ],
    phases: {
      kind: "health",
      label: "Encounter",
      steps: [
        { name: "Arrival", at: "100%", line: "Biggest scout in the fleet.", spoken: true },
        { name: "Wounded", at: "50%", line: "You are hurting the paint.", spoken: true },
        { name: "Critical", at: "25%", line: "Structural. Irrelevant.", spoken: true },
        { name: "Defeat", at: "0%", line: "Scout... report... incomplete...", spoken: true },
      ],
    },
    quote: "You shot one. I have tubes.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
  },
  {
    id: "sidewinder",
    token: "sidewinder",
    name: "SideWinder",
    tagline: "It will not turn to face you and it will not fly where it is pointed.",
    screenshots: [
      { src: `${SHOT}/sidewinder-burn.jpg`, alt: "SideWinder mid lateral burn" },
      { src: `${SHOT}/sidewinder-turn.jpg`, alt: "SideWinder swinging its drive yoke" },
      { src: `${SHOT}/sidewinder-drift.jpg`, alt: "SideWinder drifting between burns" },
    ],
    color: { primary: "#fbbf24", secondary: "#d97706", accent: "#fde68a" },
    tier: "Rare",
    factionToken: "evil_robots",
    encounter: "A bounty contract. Kill it to earn Sustained Side Thrust.",
    stats: [
      { label: "Hull", value: "7,600" },
      { label: "Shield", value: "2,600" },
      { label: "Reward", value: "6,200 XP · 12,500 cr" },
    ],
    abilities: [
      {
        name: "Lateral Drive",
        text: "Charges, then burns sideways across your line.",
        detail: "Reverses its orbit every 2–3 burns.",
        shot: 0,
      },
      { name: "Drift Lance", text: "A heavy bolt from its free-turning gun cradle.", detail: "46 damage. Always ready.", shot: 1 },
      { name: "Crossfire", text: "A five-round fan, fired mid-burn.", detail: "22 damage per round." },
      { name: "Wake Charge", text: "Mines left in its wake.", detail: "34 damage. Last 5 s." },
    ],
    phases: {
      kind: "cycle",
      label: "Burn Cycle",
      steps: [
        { name: "Charging", at: "0.85 s", line: "The drift ring lights the side it will burn." },
        { name: "Sustaining", at: "1.25 s", line: "Full lateral burn. Crossfire and mines." },
        { name: "Coasting", at: "1.05 s", line: "No steering. Takes 1.65× damage." },
        { name: "Venting", at: "1.90 s", line: "Overheated after about three burns. Holds fire." },
      ],
    },
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
  },
  {
    id: "arkanvil-king",
    token: "arkanvil_king",
    name: "King Arkanvil Starhammer",
    tagline: "A forge-hull that charges its crystal and brings it down like a hammer.",
    screenshots: [
      { src: `${SHOT}/arkanvil-battery.jpg`, alt: "King Arkanvil's hull battery firing" },
      { src: `${SHOT}/arkanvil-hull.jpg`, alt: "Rune band, gem inlays and the Starhammer sigil" },
    ],
    color: { primary: "#a78bfa", secondary: "#7c3aed", accent: "#ddd6fe" },
    tier: "Epic",
    factionToken: "space_dwarves",
    encounter: "Holds court at his throne, and returns to it when you leave.",
    stats: [
      { label: "Hull", value: "4,000" },
      { label: "Shield", value: "1,200" },
      { label: "Reward", value: "4,600 XP · 9,800 cr" },
    ],
    abilities: [
      { name: "Crystal Charge", text: "Dashes in from range.", detail: "Beyond 640 units. 7.5 s cooldown." },
      { name: "Hammer Burst", text: "A lunge and shock at close quarters.", detail: "Inside 360 units. 9.5 s cooldown." },
      {
        name: "Turret Battery",
        text: "Eight twin-barrel mounts, firing in a ripple.",
        detail: "One mount at a time. Six-round magazines, 24 damage a bolt.",
        shot: 0,
      },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Stern", at: "100%", line: "Battery fires every 0.34 s." },
        { name: "Agitated", at: "60%", line: "Every 0.28 s." },
        { name: "Enraged", at: "25%", line: "Every 0.22 s." },
      ],
    },
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
    screenshots: [
      { src: `${SHOT}/bloom-queen.jpg`, alt: "Bloom Queen in Spore Thruster Assault" },
      { src: `${SHOT}/bloom-queen-formation.jpg`, alt: "Bloom Queen commanding a battle formation" },
    ],
    color: { primary: "#e879f9", secondary: "#c026d3", accent: "#f5d0fe" },
    tier: "Epic",
    factionToken: "mycelari",
    encounter: "Arrives when you come close, with five fungal warriors.",
    stats: [
      { label: "Hull", value: "12,000" },
      { label: "Shield", value: "500" },
      { label: "Reward", value: "4,500 XP · 9,500 cr" },
    ],
    abilities: [
      {
        name: "Spore Thruster Assault",
        text: "Charges, then dashes at her target.",
        detail: "5 s cooldown. A heavy hit forces it.",
        shot: 0,
      },
      { name: "Battle Formations", text: "Spear, Shield Wall, Encirclement.", detail: "Switches every 5 s.", shot: 1 },
      { name: "Crimson Conversion", text: "Turns enemies into fungal warriors.", detail: "Up to five at a time." },
      { name: "Paradise Protocol", text: "A spreading field that births Mycelari.", detail: "Grows to 2,000 units." },
      { name: "Convergence", text: "Shares one health pool with the Fungal Lord.", detail: "When he is within 1,000 units." },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Phase 1", at: "100%", line: "Orchestrates the hive." },
        { name: "Phase 2", at: "70%", line: "Commands up to 150 units." },
        { name: "Phase 3", at: "40%", line: "Paradise Protocol." },
      ],
    },
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
    screenshots: [
      { src: `${SHOT}/fungal-lord.jpg`, alt: "The Fungal Lord" },
      { src: `${SHOT}/fungal-lord-network.jpg`, alt: "The Fungal Lord linked to his network" },
    ],
    color: { primary: "#f87171", secondary: "#b91c1c", accent: "#fecaca" },
    factionToken: "mycelari",
    encounter: "Sleeps until you come within 800 units.",
    stats: [
      { label: "Hull", value: "8,000" },
      { label: "Shield", value: "2,000" },
      { label: "Reward", value: "4,000 XP · 9,000 cr" },
    ],
    abilities: [
      { name: "Spore Barrage", text: "Aimed spore volleys.", detail: "8 s of fire, 20 s cooldown. Faster each phase." },
      { name: "Orchestrating", text: "Summons fungal warriors and powers them up.", detail: "A warrior every 8 s.", shot: 1 },
      { name: "Network Overcharge", text: "Doubles his warriors' damage.", detail: "Ends in a ring of 100 spores." },
      { name: "Defensive Cocoon", text: "Holds still and rebuilds his shield." },
      { name: "Death Bloom", text: "His network collapses with him." },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Phase 1", at: "100%" },
        { name: "Phase 2", at: "80%" },
        { name: "Phase 3", at: "50%" },
        { name: "Phase 4", at: "25%" },
      ],
    },
    homeZone: "Zone 1: Fungal",
    homePlanet: "Lordspore",
    status: "live",
  },
  {
    id: "ursos",
    token: "ursos",
    name: "Ursos, Bear King",
    tagline: "Wild King and Guardian of Urthan Prime. Half fur, half steel.",
    screenshots: [
      { src: `${SHOT}/ursos-charge.jpg`, alt: "Ursos in a rampage charge" },
      { src: `${SHOT}/ursos-maw-beam.jpg`, alt: "Ursos firing his maw beam" },
      { src: `${SHOT}/ursos-hull.jpg`, alt: "Ursos" },
    ],
    color: { primary: "#34d399", secondary: "#059669", accent: "#a7f3d0" },
    factionToken: "wild_clans",
    encounter: "Spawns neutral. Hail him before you choose a fight.",
    stats: [
      { label: "Hull", value: "12,000" },
      { label: "Reward", value: "4,200 XP · 8,500 cr" },
    ],
    abilities: [
      {
        name: "Rampage Charge",
        text: "Winds up, then rams.",
        detail: "More likely each phase: 16%, 30%, 44%.",
        shot: 0,
      },
      { name: "Maw Beam", text: "A charged beam from the jaws.", detail: "Range 760, 48 damage.", shot: 1 },
      { name: "Claw Launch", text: "A thrown claw that splits into finger missiles.", detail: "132 damage." },
      { name: "Grapple Chain", text: "Drags you in.", detail: "Range 960, 86 damage." },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Phase 1", at: "100%", line: "Steel and claw. We settle this the old way.", spoken: true },
        { name: "Enrage", at: "65%" },
        { name: "Last Stand", at: "30%", line: "Good. Pain means the fight still matters.", spoken: true },
      ],
    },
    homeZone: "Zone 2: Wild",
    homePlanet: "Urthan Prime",
    status: "live",
  },
];

export const bosses: Record<string, Boss> = Object.fromEntries(
  RAW_BOSSES.map((b) => [
    b.id,
    {
      ...b,
      heroImage: b.screenshots[0].src,
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
