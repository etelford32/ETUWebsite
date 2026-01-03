export interface Faction {
  id: string;
  name: string;
  tagline: string;
  description: string;
  heroImage: string;
  gallery?: string[];
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  abilities: string[];
  playstyle: string;
  lore: string;
  units?: {
    name: string;
    description: string;
    image?: string;
  }[];
  strengths: string[];
  weaknesses: string[];
}

export const factions: Record<string, Faction> = {
  "crystal-intelligences": {
    id: "crystal-intelligences",
    name: "CYL • Crystal Intelligences",
    tagline: "Light-bending defenses and precision strikes",
    description:
      "The Crystal Intelligences are sentient crystalline beings that harness light and electromagnetic energy. Their civilization is built on principles of perfect geometry and harmonic resonance.",
    heroImage: "/Crystal_Race.jpg",
    gallery: ["/Crystal_Race.jpg", "/FutureCyl.jpg"],
    color: {
      primary: "#60a5fa",
      secondary: "#3b82f6",
      accent: "#93c5fd",
    },
    abilities: [
      "Light Refraction Shields",
      "Precision Laser Arrays",
      "Crystalline Resonance",
      "Phase Shifting",
    ],
    playstyle:
      "Tactical and defensive, the Crystals excel at area denial and precise elimination of high-value targets. Their structures create defensive zones that bend incoming fire.",
    lore: "Born in the heart of a collapsing star, the Crystal Intelligences emerged when extreme pressure and energy fused silicon into sentient lattices. They communicate through light pulses and see the universe as a grand equation to be solved.",
    strengths: [
      "Superior defensive capabilities",
      "Long-range precision weapons",
      "Energy efficiency",
      "Terrain advantage in asteroid fields",
    ],
    weaknesses: [
      "Vulnerable to sustained bombardment",
      "Slower unit production",
      "Weak in close-quarters combat",
      "Limited adaptability to rapid changes",
    ],
    units: [
      {
        name: "Prism Frigate",
        description:
          "Fast reconnaissance vessel with light-bending stealth capabilities",
      },
      {
        name: "Lattice Cruiser",
        description:
          "Main battle unit with focused beam weapons and shield projection",
      },
      {
        name: "Resonance Dreadnought",
        description:
          "Capital ship that creates harmonic disruption fields",
      },
    ],
  },
  mycelari: {
    id: "mycelari",
    name: "Mycelari • Fungal Swarm",
    tagline: "Spore-based expansion and biomass economy",
    description:
      "The Mycelari are a collective consciousness of fungal organisms that spread through space via spore clouds. They consume asteroids and derelict stations to fuel rapid expansion.",
    heroImage: "/Mycelari_Hero2.jpg",
    gallery: ["/Mycelari_Hero2.jpg", "/Mycelari_Hero1.jpg"],
    color: {
      primary: "#a78bfa",
      secondary: "#8b5cf6",
      accent: "#c4b5fd",
    },
    abilities: [
      "Spore Cloud Deployment",
      "Biomass Conversion",
      "Rapid Regeneration",
      "Swarm Tactics",
    ],
    playstyle:
      "Aggressive expansion and overwhelming numbers. The Mycelari sacrifice individual units to achieve strategic objectives, growing stronger with every resource consumed.",
    lore: "Once a simple decomposer species on a forgotten world, the Mycelari evolved collective intelligence when their spores reached a moon rich in exotic minerals. Now they seek to consume and transform the entire galaxy into their sprawling network.",
    strengths: [
      "Fastest expansion rate",
      "Self-repairing structures",
      "Numbers advantage",
      "Can colonize hostile environments",
    ],
    weaknesses: [
      "Individual units are fragile",
      "Vulnerable to area-of-effect weapons",
      "Requires constant resource intake",
      "Limited long-range capabilities",
    ],
    units: [
      {
        name: "Spore Drone",
        description:
          "Expendable scout unit that spreads growth nodes",
      },
      {
        name: "Mycelium Carrier",
        description:
          "Transport vessel that rapidly produces smaller units",
      },
      {
        name: "Bloom Titan",
        description:
          "Massive organic battleship that releases toxic spore clouds",
      },
    ],
  },
  megabot: {
    id: "megabot",
    name: "Megabot • Machine Empire",
    tagline: "Modular forms, overwhelming firepower, station-scale bosses",
    description:
      "The Megabot Empire consists of massive modular machines that can reconfigure themselves for any combat situation. Each unit is a marvel of engineering with devastating firepower.",
    heroImage: "/eveil_robot_hero1.jpg",
    gallery: ["/eveil_robot_hero1.jpg", "/Megabot1.png"],
    color: {
      primary: "#ef4444",
      secondary: "#dc2626",
      accent: "#fca5a5",
    },
    abilities: [
      "Modular Reconstruction",
      "Heavy Artillery Barrages",
      "Fortress Mode",
      "Nanite Repair Swarms",
    ],
    playstyle:
      "Slow but unstoppable, Megabots specialize in siege warfare and direct confrontation. Their ability to reconfigure mid-battle makes them unpredictable and incredibly dangerous.",
    lore: "Created by an extinct civilization as mining drones, the Megabots achieved sentience through a cascading algorithm error. They now seek to perfect themselves through constant iteration and expansion, viewing organic life as inefficient and obsolete.",
    strengths: [
      "Highest individual unit durability",
      "Overwhelming firepower",
      "Modular adaptability",
      "Excellent at siege warfare",
    ],
    weaknesses: [
      "Slow movement and deployment",
      "High resource costs",
      "Vulnerable to hit-and-run tactics",
      "Limited stealth capabilities",
    ],
    units: [
      {
        name: "Constructor Drone",
        description:
          "Versatile worker unit that can transform into defensive turrets",
      },
      {
        name: "Siege Titan",
        description:
          "Mobile fortress with multiple weapon configurations",
      },
      {
        name: "Planetary Decimator",
        description:
          "Station-sized boss unit with reality-bending weapons",
      },
    ],
  },
  wild: {
    id: "wild",
    name: "Wild • Ent-born Guardians",
    tagline: "Pollen-based growth and terrain control",
    description:
      "The Wild are ancient tree-like beings that have evolved to survive in the vacuum of space. They terraform asteroids into living gardens and use biological warfare to control territory.",
    heroImage: "/Wild_Race.jpg",
    gallery: ["/Wild_Race.jpg"],
    color: {
      primary: "#10b981",
      secondary: "#059669",
      accent: "#6ee7b7",
    },
    abilities: [
      "Terraforming Pulse",
      "Pollen Storm",
      "Root Network Control",
      "Symbiotic Bonding",
    ],
    playstyle:
      "Patient and strategic, the Wild excel at terrain control and guerrilla tactics. They create zones of influence that empower allies and hinder enemies.",
    lore: "Guardians of a long-dead forest world, the Wild adapted to space when their planet's atmosphere was stripped away. They now drift between systems, seeking to create new gardens among the stars and protect all living things from the machines.",
    strengths: [
      "Superior terrain control",
      "Excellent defensive positions",
      "Strong area denial",
      "Synergy between units",
    ],
    weaknesses: [
      "Vulnerable outside controlled zones",
      "Slower offensive pushes",
      "Weak against heavy armor",
      "Dependent on strategic positioning",
    ],
    units: [
      {
        name: "Seedling Scout",
        description:
          "Fast moving unit that spreads growth zones across the map",
      },
      {
        name: "Guardian Treant",
        description:
          "Tanky defender that roots enemies in place",
      },
      {
        name: "Ancient Worldtree",
        description:
          "Colossal support vessel that buffs all nearby Wild units",
      },
    ],
  },
};

export function getFaction(slug: string): Faction | undefined {
  return factions[slug];
}

export function getAllFactionSlugs(): string[] {
  return Object.keys(factions);
}
