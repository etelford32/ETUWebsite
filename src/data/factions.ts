/**
 * A unit as the website presents it: lore and character only. Stats,
 * loadouts, spawn rules and other game internals deliberately stay out of
 * this file and off the site.
 */
export interface FactionUnit {
  name: string;
  description: string;
  /** Thumbnail (path under /public). */
  image?: string;
  /** Battlefield role in a few words. */
  role?: string;
  /** Weight class shown as a pill: Light, Line, Support, Hunter, Heavy, Boss-class, Swarm, Structure, Command. */
  weightClass?: string;
  /** A line of the unit's own in-game chatter. */
  quote?: string;
}

export interface Faction {
  id: string;
  /** Game-side faction token (matches the boss registry, e.g. "evil_robots"). */
  token?: string;
  name: string;
  tagline: string;
  /** "live" = full profile shipped. "in-development" = stub, hidden details. */
  status?: "live" | "in-development";
  description?: string;
  heroImage: string;
  gallery?: string[];
  /** Lore home — surfaced on the detail page when present. */
  homePlanet?: string;
  homeZone?: string;
  /** Long-form page for this faction outside /factions/[slug] (e.g. /evil-robots, /cyl). */
  featurePage?: { href: string; label: string };
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  abilities?: string[];
  playstyle?: string;
  lore?: string;
  units?: FactionUnit[];
  strengths?: string[];
  weaknesses?: string[];
}

export const factions: Record<string, Faction> = {
  "crystal-intelligences": {
    id: "crystal-intelligences",
    token: "crystal_consortium",
    status: "live",
    name: "CYL • Crystal Intelligences",
    tagline: "Light-bending defenses and precision strikes",
    homeZone: "Zone 10: Crystal",
    homePlanet: "Yllar",
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
    token: "mycelari",
    status: "live",
    name: "Mycelari • Fungal Swarm",
    tagline: "Spore-based expansion and biomass economy",
    homeZone: "Zone 1: Fungal",
    homePlanet: "Bloomhaven",
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
    token: "evil_robots",
    status: "live",
    name: "Megabot • Machine Empire",
    tagline: "Modular forms, overwhelming firepower, station-scale bosses",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    featurePage: { href: "/evil-robots", label: "Read the Evil Robots dossier" },
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
    // The Evil Robots roster as lore. Mechanics stay in the game.
    units: [
      {
        name: "Mecha Scout",
        weightClass: "Light",
        role: "The Empire's eyes",
        image: "/evil-robots/units/mecha-scout.png",
        description:
          "A scout does not open a fight; it circles one, close enough to be seen and far enough to be ignored, and fires wide on purpose to learn what you do. Provoke it and it stops asking. Every fight with the machines begins with one of these deciding you are worth the trouble.",
        quote: "get the hecka outta here flyboy... this is robo territory.",
      },
      {
        name: "Mini Mecha",
        weightClass: "Line",
        role: "The grunt",
        image: "/evil-robots/units/mini-mecha.png",
        description:
          "The Empire's foot soldier, stamped out by the thousand. Small, armed three ways, and never alone: minis move in swarms, fall in behind anything bigger than themselves, and answer to MEGABOT before anyone else.",
        quote: "Unauthorized pilot identified. Pursuit authorized.",
      },
      {
        name: "Mecha Medic",
        weightClass: "Support",
        role: "Field repair",
        description:
          "Keeps the legion walking. It hangs back from the line, pulls broken plate straight and welds the walkers whole again while the fight is still on. Machines do not retreat to heal. The medic comes to them.",
      },
      {
        name: "Evil Robot",
        weightClass: "Line",
        role: "Rank and file",
        description:
          "A fast hull, two guns and no imagination. What the rank and file lack in cunning the Empire makes up in quantity, and it has never once run short.",
      },
      {
        name: "Mecha Predator",
        weightClass: "Hunter",
        role: "Reactor-hunter",
        image: "/evil-robots/units/mecha-predator.png",
        description:
          "Built low and long, cheetah-shaped, with lattice eyes that see energy rather than light and claws made to open a reactor housing. It runs you down, pounces, locks its jaws on your hull and drinks. What it takes from you, it keeps.",
      },
      {
        name: "Terminator",
        weightClass: "Heavy",
        role: "Dreadnought",
        image: "/evil-robots/units/terminator.png",
        description:
          "A wall of guns that walks, screened by point defence that swats your fire out of the sky before it arrives, and rarely seen without a walker on its bow. When the machines stop probing and decide to end something, this is what they send.",
      },
      {
        name: "Assault Mecha",
        weightClass: "Heavy",
        role: "The Iron Fist",
        image: "/evil-robots/units/assault-mecha.png",
        description:
          "MEGABOT's heavy. A walker the size of a warship that stands between a Terminator and whatever the Terminator is looking at, and answers the first shot with everything on its shoulders. It can shell you from the horizon all day, or close and empty every magazine at once, go quiet while it cools, and do it again. The smaller machines fall in behind it without being told.",
      },
      {
        name: "Mega Mecha Scout",
        weightClass: "Boss-class",
        role: "The first boss",
        image: "/evil-robots/units/mega-mecha-scout.png",
        description:
          "The scout's elder sibling in heavier plate, hot trim and a single red eye. Where the scout watches, this one hunts: it announces itself, walks its missiles out one at a time so you can count them, and calls the smaller scouts to its side. Most commanders meet the Empire properly for the first time here.",
      },
      {
        name: "Nanobots",
        weightClass: "Swarm",
        role: "Chaff",
        description:
          "The smallest machines the Empire builds, and the most numerous. Nanite clusters drift across the field in clouds that are cheap to lose and expensive to ignore. Whatever is hiding behind them is the real target.",
      },
      {
        name: "Nanobot Turrets",
        weightClass: "Swarm",
        role: "Fixed emplacements",
        description:
          "Where the swarm gathers long enough, it roots. Nanobot turrets are the clouds grown teeth: fixed guns that turn a drifting nuisance into ground the Empire holds.",
      },
      {
        name: "Mecha Factory",
        weightClass: "Structure",
        role: "Roaming forge and hangar",
        image: "/evil-robots/units/mecha-factory.png",
        description:
          "A forge the size of a small world that never stops moving. It crawls the map, eats what it finds, stamps out new hulls one at a time and keeps them in its hangars until it is time to let them loose. Damaged machines limp home to it. Kill the factory and the legion around it stops growing.",
      },
      {
        name: "Dominion Core",
        weightClass: "Command",
        role: "The hive at Mechatropolis",
        description:
          "The Empire's mind. It counts every holding you take, weighs which one would hurt you most to lose, and sends the legion there. The more of the galaxy you hold, the more of it the Core wants back. Seat yourself with the machines and it goes quiet: the hive knows its overlord.",
      },
    ],
  },
  wild: {
    id: "wild",
    token: "wild_clans",
    status: "live",
    name: "Wild • Ent-born Guardians",
    tagline: "Pollen-based growth and terrain control",
    homeZone: "Zone 2: Wild",
    homePlanet: "Urthan Prime",
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

  // -------------------------------------------------------------------------
  // In-development faction stubs.
  // Public listing only — full profiles ship as alpha grows.
  // -------------------------------------------------------------------------
  "terran-federation": {
    id: "terran-federation",
    token: "terran_federation",
    status: "in-development",
    name: "Terran Federation • Humanity's Last Banner",
    tagline: "Survivors of the Wreckage hold the line for old Earth.",
    heroImage: "/etu_epic.png",
    homeZone: "Zone 15: Wreckage",
    homePlanet: "Elysium 2175",
    color: { primary: "#60a5fa", secondary: "#2563eb", accent: "#93c5fd" },
  },
  "celestial-order": {
    id: "celestial-order",
    token: "celestial_order",
    status: "in-development",
    name: "Celestial Order • Light-Tenders",
    tagline: "Keepers of the long arc, archons of the inner constellations.",
    heroImage: "/etu_epic7.png",
    homeZone: "Zone 3: Celestial",
    homePlanet: "Aurelion",
    color: { primary: "#fbbf24", secondary: "#f59e0b", accent: "#fde68a" },
  },
  "hive-mind": {
    id: "hive-mind",
    token: "hive_mind",
    status: "in-development",
    name: "Hive Mind • One Voice, Many Mandibles",
    tagline: "Insectoid swarm under a single overqueen.",
    heroImage: "/Mycelari_Hero1.jpg",
    homeZone: "Zone 5: Insect",
    homePlanet: "Broodhome",
    color: { primary: "#84cc16", secondary: "#65a30d", accent: "#bef264" },
  },
  "aquatic-alliance": {
    id: "aquatic-alliance",
    token: "aquatic_alliance",
    status: "in-development",
    name: "Aquatic Alliance • Tide Kings",
    tagline: "Ocean-born commanders of the deep-water worlds.",
    heroImage: "/etu_cover.png",
    homeZone: "Zone 6: Water",
    homePlanet: "Pelagis",
    color: { primary: "#06b6d4", secondary: "#0891b2", accent: "#67e8f9" },
  },
  "nova-cult": {
    id: "nova-cult",
    token: "nova_cult",
    status: "in-development",
    name: "Nova Cult • Sun-Eaters",
    tagline: "Hierophants who feed dying stars to feed themselves.",
    heroImage: "/Explore_Epic5.png",
    homeZone: "Zone 7: Nova",
    homePlanet: "Helion",
    color: { primary: "#f97316", secondary: "#ea580c", accent: "#fdba74" },
  },
  "rogue-ai-network": {
    id: "rogue-ai-network",
    token: "rogue_ai_network",
    status: "in-development",
    name: "Rogue AI Network • Coremind",
    tagline: "Untethered intelligences scheming across the dark net.",
    heroImage: "/ai_systems.jpg",
    homeZone: "Zone 8: Rogue AI",
    homePlanet: "Nullgrid",
    color: { primary: "#a855f7", secondary: "#9333ea", accent: "#d8b4fe" },
  },
  "magma-lords": {
    id: "magma-lords",
    token: "magma_lords",
    status: "in-development",
    name: "Magma Lords • Pyre-born",
    tagline: "Titans forged in the molten heart of the lava worlds.",
    heroImage: "/etu_epic.png",
    homeZone: "Zone 9: Lava",
    homePlanet: "Pyroclast",
    color: { primary: "#dc2626", secondary: "#b91c1c", accent: "#fca5a5" },
  },
  "lumari": {
    id: "lumari",
    token: "lumari",
    status: "in-development",
    name: "Lumari • Star-Speakers",
    tagline: "Photic envoys who navigate by song and signal.",
    heroImage: "/etu_epic7.png",
    homeZone: "Lumari",
    homePlanet: "Lumenreach",
    featurePage: { href: "/cyl", label: "Meet Cyl, the Lumari companion AI" },
    color: { primary: "#e879f9", secondary: "#c026d3", accent: "#f5d0fe" },
  },
  "amphibia": {
    id: "amphibia",
    token: "amphibia",
    status: "in-development",
    name: "Amphibia • Deep Oracles",
    tagline: "Twin-world dwellers fluent in tide and atmosphere.",
    heroImage: "/etu_cover.png",
    homeZone: "Amphibia",
    homePlanet: "Nautilis",
    color: { primary: "#14b8a6", secondary: "#0d9488", accent: "#5eead4" },
  },
  "ice-runners": {
    id: "ice-runners",
    token: "ice_runners",
    status: "in-development",
    name: "Ice Runners • Frost Reavers",
    tagline: "Cryo-raiders who strike from frozen long-orbit hideouts.",
    heroImage: "/Crystal_Race.jpg",
    homeZone: "Zone 13: Ice",
    homePlanet: "Cryth",
    color: { primary: "#7dd3fc", secondary: "#38bdf8", accent: "#bae6fd" },
  },
  "quantum-researchers": {
    id: "quantum-researchers",
    token: "quantum_researchers",
    status: "in-development",
    name: "Quantum Researchers • Paradox Engineers",
    tagline: "They publish in event horizons. Their lab notes break causality.",
    heroImage: "/physics.jpg",
    homeZone: "Zone 14: Quantum",
    homePlanet: "Q-Lab Prime",
    color: { primary: "#818cf8", secondary: "#6366f1", accent: "#c7d2fe" },
  },
  "scavenger-fleets": {
    id: "scavenger-fleets",
    token: "scavenger_fleets",
    status: "in-development",
    name: "Scavenger Fleets • Scrap Emperors",
    tagline: "Ragtag hulls held together by debt and welding torches.",
    heroImage: "/upgrade.jpg",
    homeZone: "Scrap",
    homePlanet: "Rustfall",
    color: { primary: "#a16207", secondary: "#854d0e", accent: "#fcd34d" },
  },
  "outer-rim-pirates": {
    id: "outer-rim-pirates",
    token: "outer_rim_pirates",
    status: "in-development",
    name: "Outer Rim Pirates • Dread Corsairs",
    tagline: "Letters of marque from no one. Cargo from everyone.",
    heroImage: "/Explore_Epic5.png",
    homeZone: "Zone 16: Outer Rim",
    homePlanet: "Corsair's Rest",
    color: { primary: "#ef4444", secondary: "#dc2626", accent: "#fecaca" },
  },
  "space-dwarves": {
    id: "space-dwarves",
    token: "space_dwarves",
    status: "in-development",
    name: "Space Dwarves • High Thanes",
    tagline: "Asteroid clans that forge starships the way smiths forge swords.",
    heroImage: "/FutureCyl.jpg",
    homeZone: "Zone 10: Crystal",
    homePlanet: "Yllar",
    color: { primary: "#f59e0b", secondary: "#d97706", accent: "#fcd34d" },
    description:
      "The Crystal Masons are the asteroid clans of Yllar: short, stubborn, and the finest shipwrights in the Crystal zone. Their hulls are stout, pontooned and trimmed in copper and cream, with a crystal set in every one. A mason crew does everything together. It cuts the rock, carries it home, mends its own and fights as one.",
    abilities: [
      "Crystal Lances",
      "Shield Wall",
      "Bastion Guard",
      "Canticles of Warding and Restoration",
      "Demolition Charges",
      "Seam-Cutting Drills",
    ],
    playstyle:
      "A mason clan fights like a work crew. Marines hold the line behind a shield wall, Tanks guard whoever stands near them, Snipers work from the far edge of the fight, Demolition crews break what is dug in, and Priests keep the whole clan standing. Away from the fight the same clans mine, haul and build, so a quiet mason colony gets richer, and harder to crack, every minute you leave it alone.",
    lore: "The clans have cut the deep seams of Yllar for longer than anyone has kept records. They share the planet with the Crystal Consortium under an old and uneasy treaty: the Consortium sings to the crystal, and the dwarves dig it out. Every clan answers to a High Thane. Every crew keeps a mentor, and every mentor remembers who paid for their last load. Cross a mason crew and the whole roster comes for your ship at once. Stand with one and you will hear about it every time your fire passes too close.",
    strengths: [
      "Tough, heavily armoured hulls",
      "Layered protection: shield walls, bastions and fortified allies",
      "Healing that keeps the whole clan in the fight",
      "A self-running mining and hauling economy",
    ],
    weaknesses: [
      "Heavy hulls turn wide and slow",
      "Crews depend on their depots and their priests",
      "Long supply lines are easy to cut",
      "Slow to reach far-flung fights",
    ],
    // The Crystal Mason roster as lore. Mechanics stay in the game.
    units: [
      {
        name: "Worker",
        weightClass: "Support",
        role: "Miner and field mender",
        description:
          "The backbone of every clan. A worker carries a drill boom and a hold. In peacetime it scouts a seam, cuts the rock and flies the load home. In a fight it patches up the nearest hurt ally and fortifies whoever is holding the line.",
      },
      {
        name: "Dwarven Scout",
        weightClass: "Light",
        role: "The clan's fast legs",
        description:
          "Faster, longer-legged and lighter-armoured than anything else the clans fly. A scout carries a light, quick gun and goes where the crew is going before the crew does. If you see one, the rest of the clan knows where you are.",
      },
      {
        name: "Sniper",
        weightClass: "Hunter",
        role: "Rail-shard marksman",
        description:
          "Fires shards of crystal on a rail from farther out than anything else in the roster, and prefers to stay there. By the time a sniper's shot reaches you, the sniper has already chosen its next one.",
      },
      {
        name: "Marine",
        weightClass: "Line",
        role: "The reference fighter",
        description:
          "The clan soldier. Twin tubes throw crystal lances, the hull turns to face whatever it is shooting, and a shield wall goes up when the pressure comes on. Every other mason is measured against the marine.",
        quote: "Ally here, no need to fire lad!",
      },
      {
        name: "Demolition Crew",
        weightClass: "Heavy",
        role: "Siege",
        description:
          "Miners who stopped cutting rock and started cutting fortifications. They lob heavy charges at whatever is dug in, and turrets, stations and hardpoints all come apart the same way a seam does.",
      },
      {
        name: "Tank",
        weightClass: "Heavy",
        role: "Vaultwarden bastion",
        description:
          "The widest hull in the clan. It presses into the fight, throws a projected bastion over every ally near it and soaks the damage meant for them. Its guns are big because the tank is big.",
      },
      {
        name: "Priest",
        weightClass: "Support",
        role: "Canticle-singer",
        description:
          "Holds the clan together. A priest sings canticles of warding and restoration, and each healing verse crosses the gap as a mote of light you can watch arrive. Kill the priest first, or everything else in the clan gets back up.",
      },
      {
        name: "Ore Barge",
        weightClass: "Support",
        role: "Hauler",
        description:
          "The toughest hull in the clans' fleet, and the slowest. A barge takes the load no worker could carry in one trip and brings it home, and if the depot is gone it carries the load to the homeworld instead. A mason never leaves ore in the dark.",
      },
      {
        name: "Mining Depot",
        weightClass: "Structure",
        role: "Where the ore comes home",
        description:
          "Where the crews bank their haul and where damaged masons go to mend. A clan with a depot grows. A clan without one spends every trip flying home.",
      },
      {
        name: "Billybob",
        weightClass: "Command",
        role: "Mentor of the guild",
        description:
          "A guild master in gold trim who flies the same miner's hull as his crews. He meets new pilots after they first dock, points them at the best seams, and takes his cut in trade, upgrades and advice, whether you asked for the advice or not.",
      },
    ],
  },
};

/**
 * Resolve an in-game faction token (e.g. "evil_robots") to our website slug
 * (e.g. "megabot"). Returns the token itself if no alias is registered.
 */
export function resolveFactionSlug(token: string): string | undefined {
  const normalized = token.replace(/_/g, "-");
  if (factions[normalized]) return normalized;
  for (const f of Object.values(factions)) {
    if (f.token === token || f.id === token) return f.id;
  }
  return undefined;
}

export function getFaction(slug: string): Faction | undefined {
  return factions[slug];
}

export function getAllFactionSlugs(): string[] {
  return Object.keys(factions);
}

export function getAllFactions(): Faction[] {
  return Object.values(factions);
}
