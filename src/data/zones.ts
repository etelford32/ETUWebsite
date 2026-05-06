import { getAllBosses, type Boss } from "./bosses";

export interface Zone {
  /** URL slug, e.g. "fungal", "evil", "outer-rim". */
  id: string;
  /** Zone number, 1–16. */
  number: number;
  /** Short name, e.g. "Fungal". */
  name: string;
  /** Full canonical label, e.g. "Zone 1: Fungal". */
  fullName: string;
  tagline: string;
  description: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  /**
   * Lower-case substrings the boss-registry's `homeZone` may contain when it
   * belongs to this zone. Match is case-insensitive includes().
   */
  aliases: readonly string[];
  heroImage: string;
}

export const zones: Record<string, Zone> = {
  fungal: {
    id: "fungal",
    number: 1,
    name: "Fungal",
    fullName: "Zone 1: Fungal",
    tagline: "Spore-grown worlds where biomass is currency.",
    description:
      "The Mycelari heartlands. Zone 1's planets pulse with mycelial light and rebuild themselves between visits — every Commander who lands feeds the network on the way back out.",
    color: { primary: "#a78bfa", secondary: "#8b5cf6", accent: "#c4b5fd" },
    aliases: ["fungal", "zone 1", "mycelari"],
    heroImage: "/Mycelari_Hero2.jpg",
  },
  wild: {
    id: "wild",
    number: 2,
    name: "Wild",
    fullName: "Zone 2: Wild",
    tagline: "Bark-clans and forest-moons that remember every hunter.",
    description:
      "Forest-moons of the Wild Clans, ruled by Bear-Lords and Ent-Councils. Zone 2 grows back faster than you can clear it, and the trees keep score.",
    color: { primary: "#10b981", secondary: "#059669", accent: "#6ee7b7" },
    aliases: ["wild", "zone 2", "forest", "natural"],
    heroImage: "/Wild_Race.jpg",
  },
  celestial: {
    id: "celestial",
    number: 3,
    name: "Celestial",
    fullName: "Zone 3: Celestial",
    tagline: "Light-tender archons holding the inner constellations.",
    description:
      "The Celestial Order's domain — gold-light cathedrals orbiting Aurelion. Doctrine is enforced by archons; trespass is recorded in the archive.",
    color: { primary: "#fbbf24", secondary: "#f59e0b", accent: "#fde68a" },
    aliases: ["celestial", "zone 3"],
    heroImage: "/etu_epic7.png",
  },
  evil: {
    id: "evil",
    number: 4,
    name: "Evil",
    fullName: "Zone 4: Evil",
    tagline: "Mechatropolis. The Machine Empire's forge.",
    description:
      "Home of MEGABOT and the rest of the evil-robot roster. Zone 4 is one giant production line — every kill makes the next one harder.",
    color: { primary: "#22d3ee", secondary: "#4f46e5", accent: "#67e8f9" },
    aliases: ["evil", "zone 4", "evil_robot", "megabot_arena"],
    heroImage: "/eveil_robot_hero1.jpg",
  },
  insect: {
    id: "insect",
    number: 5,
    name: "Insect",
    fullName: "Zone 5: Insect",
    tagline: "Hive-broods under one overqueen.",
    description:
      "Insectoid swarms commanded from Broodhome. Zone 5's biology is a single distributed mind — fight one and you fight the hive.",
    color: { primary: "#84cc16", secondary: "#65a30d", accent: "#bef264" },
    aliases: ["insect", "zone 5"],
    heroImage: "/Mycelari_Hero1.jpg",
  },
  water: {
    id: "water",
    number: 6,
    name: "Water",
    fullName: "Zone 6: Water",
    tagline: "Ocean alliances ruling the deep-water worlds.",
    description:
      "The Aquatic Alliance holds the deep-water worlds and the trenches between them. Tide-Kings engage on terrain you can't.",
    color: { primary: "#06b6d4", secondary: "#0891b2", accent: "#67e8f9" },
    aliases: ["water", "zone 6", "aquatic"],
    heroImage: "/etu_cover.png",
  },
  nova: {
    id: "nova",
    number: 7,
    name: "Nova",
    fullName: "Zone 7: Nova",
    tagline: "Sun-eater cults feeding on dying stars.",
    description:
      "Nova Cult territory. Hierophants conduct the rites of dying suns, and Helion's solar sanctum burns at the center of it all.",
    color: { primary: "#f97316", secondary: "#ea580c", accent: "#fdba74" },
    aliases: ["nova", "zone 7"],
    heroImage: "/Explore_Epic5.png",
  },
  "rogue-ai": {
    id: "rogue-ai",
    number: 8,
    name: "Rogue AI",
    fullName: "Zone 8: Rogue AI",
    tagline: "Dark-net intelligences scheming across dead satellites.",
    description:
      "Untethered AIs threading the Nullgrid mesh. Zone 8 doesn't have an army — it has a network, and you're already on it.",
    color: { primary: "#a855f7", secondary: "#9333ea", accent: "#d8b4fe" },
    aliases: ["rogue_ai", "zone 8", "rogue ai"],
    heroImage: "/ai_systems.jpg",
  },
  lava: {
    id: "lava",
    number: 9,
    name: "Lava",
    fullName: "Zone 9: Lava",
    tagline: "Magma Lords forged in the heart of Pyroclast.",
    description:
      "Pyroclast and its sibling forges. Zone 9 walks heavy — every step from a Magma Lord leaves a new caldera.",
    color: { primary: "#dc2626", secondary: "#b91c1c", accent: "#fca5a5" },
    aliases: ["lava", "zone 9"],
    heroImage: "/etu_epic.png",
  },
  crystal: {
    id: "crystal",
    number: 10,
    name: "Crystal",
    fullName: "Zone 10: Crystal",
    tagline: "Yllar's harmonic canyons. Light bends. Weapons forget.",
    description:
      "The Crystal Consortium and the Space Dwarves share Yllar under uneasy treaty. Zone 10 sings — and answers.",
    color: { primary: "#60a5fa", secondary: "#3b82f6", accent: "#93c5fd" },
    aliases: ["crystal", "zone 10"],
    heroImage: "/Crystal_Race.jpg",
  },
  nebula: {
    id: "nebula",
    number: 11,
    name: "Nebula",
    fullName: "Zone 11: Nebula",
    tagline: "Drifting gas-giants and the dust between them.",
    description:
      "Zone 11 is mostly absence — long-distance dust corridors and the small fleets that learned to navigate them. Boss roster pending.",
    color: { primary: "#e879f9", secondary: "#c026d3", accent: "#f5d0fe" },
    aliases: ["nebula", "zone 11"],
    heroImage: "/etu_cover.png",
  },
  ancient: {
    id: "ancient",
    number: 12,
    name: "Ancient",
    fullName: "Zone 12: Ancient",
    tagline: "Pre-spaceflight ruins. The galaxy's older inhabitants.",
    description:
      "Sealed worlds full of pre-spaceflight history. Zone 12 doesn't fight — it watches, and remembers, and waits. Boss roster pending.",
    color: { primary: "#a16207", secondary: "#854d0e", accent: "#fcd34d" },
    aliases: ["ancient", "zone 12"],
    heroImage: "/etu_epic.png",
  },
  ice: {
    id: "ice",
    number: 13,
    name: "Ice",
    fullName: "Zone 13: Ice",
    tagline: "Long-orbit raider hideouts. Cryth and its cousins.",
    description:
      "Frozen worlds the Ice Runners turned into staging grounds. Strikes come from the dark side and fade back into long-orbit before sensors lock.",
    color: { primary: "#7dd3fc", secondary: "#38bdf8", accent: "#bae6fd" },
    aliases: ["ice", "zone 13"],
    heroImage: "/Crystal_Race.jpg",
  },
  quantum: {
    id: "quantum",
    number: 14,
    name: "Quantum",
    fullName: "Zone 14: Quantum",
    tagline: "Paradox-physics labs. Their notes break causality.",
    description:
      "Q-Lab Prime and the research stations around it. Zone 14's physics doesn't always agree with itself — and neither do its results.",
    color: { primary: "#818cf8", secondary: "#6366f1", accent: "#c7d2fe" },
    aliases: ["quantum", "zone 14"],
    heroImage: "/physics.jpg",
  },
  wreckage: {
    id: "wreckage",
    number: 15,
    name: "Wreckage",
    fullName: "Zone 15: Wreckage",
    tagline: "Humanity's last great battle site.",
    description:
      "Where the Terran Federation's fleet went down — and where Space Jesus walked back out. Zone 15 is a graveyard with a heartbeat.",
    color: { primary: "#fbbf24", secondary: "#d97706", accent: "#fde68a" },
    aliases: ["wreckage", "zone 15", "zone_15_wreckage"],
    heroImage: "/etu_epic.png",
  },
  "outer-rim": {
    id: "outer-rim",
    number: 16,
    name: "Outer Rim",
    fullName: "Zone 16: Outer Rim",
    tagline: "Letters of marque from no one. Cargo from everyone.",
    description:
      "Outer Rim Pirates run Zone 16 from Corsair's Rest — the only law out here is which gun is loudest this hour.",
    color: { primary: "#ef4444", secondary: "#dc2626", accent: "#fecaca" },
    aliases: ["outer rim", "outer_rim", "zone 16", "pirate"],
    heroImage: "/Explore_Epic5.png",
  },
};

export function getZone(slug: string): Zone | undefined {
  return zones[slug];
}

export function getAllZones(): Zone[] {
  return Object.values(zones).sort((a, b) => a.number - b.number);
}

/**
 * Match a boss's `homeZone` string against this zone's aliases.
 * Falls back to false if the boss has no homeZone.
 */
export function bossBelongsToZone(boss: Boss, zone: Zone): boolean {
  if (!boss.homeZone) return false;
  const haystack = boss.homeZone.toLowerCase();
  return zone.aliases.some((alias) => haystack.includes(alias));
}

export function getBossesForZone(slug: string): Boss[] {
  const zone = zones[slug];
  if (!zone) return [];
  return getAllBosses().filter((boss) => bossBelongsToZone(boss, zone));
}

export function getZoneForBoss(boss: Boss): Zone | undefined {
  if (!boss.homeZone) return undefined;
  const haystack = boss.homeZone.toLowerCase();
  return getAllZones().find((z) => z.aliases.some((a) => haystack.includes(a)));
}
