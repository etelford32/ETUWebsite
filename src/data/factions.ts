export interface FactionUnit {
  name: string;
  description: string;
  /** Thumbnail (path under /public). */
  image?: string;
  /** Game registry token, matching the spawn tables (e.g. "mecha_scout"). */
  token?: string;
  /** Battlefield role in a few words. */
  role?: string;
  /** Weight class shown as a pill: Light, Line, Support, Hunter, Heavy, Boss-class, Swarm, Structure, Command. */
  weightClass?: string;
  /** Headline numbers, four at most. */
  stats?: { label: string; value: string }[];
  /** Weapons, abilities and behaviours. */
  loadout?: string[];
  /** Survival wave ladder: point cost and the wave it unlocks at. */
  ladder?: { points: number; unlocksAtWave: number };
  /** Mecha Factory build order: seconds and resource cost. */
  forge?: { seconds: number; metal: number; energy: number };
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
    // The Evil Robots roster, taken from the game's own spawn presets, unit
    // reviews and design notes (UNIT_CAPABILITY_MATRIX, UNIT_BALANCE_MATRIX,
    // MECHAPRED-01, ASSAULTMECHA-01, MECHAFAC-01, the survival spawn ladder).
    units: [
      {
        token: "mecha_scout",
        name: "Mecha Scout",
        weightClass: "Light",
        role: "Recon harasser",
        image: "/evil-robots/units/mecha-scout.png",
        description:
          "The pest. It probes first and escalates only when provoked: every hit it takes bumps an aggro ladder from circle-probe to knife-pass to backpedal-fire, then decays back to watching. Its warning shots are deliberate misses. The unit that makes a fight start gradually instead of like a light switch.",
        stats: [
          { label: "Hull", value: "200" },
          { label: "Sensor", value: "900–1.9k" },
          { label: "Gun", value: "8.5/s" },
          { label: "XP", value: "130" },
        ],
        loadout: [
          "Machine gun: 4-round bursts of 2.5 at 950 u/s",
          "Warning shots: 0.5 damage, a deliberate 48-unit miss, every 10 s",
          "Aggro ladder 0→3, with evasion jukes on cooldown",
          "Recon shape when spawned as a pest: 65 hull, one shot every 3 s",
        ],
        ladder: { points: 1, unlocksAtWave: 1 },
        forge: { seconds: 14, metal: 90, energy: 18 },
        quote: "get the hecka outta here flyboy... this is robo territory.",
      },
      {
        token: "mini_mecha",
        name: "Mini Mecha",
        weightClass: "Line",
        role: "Weapon-triangle grunt",
        image: "/evil-robots/units/mini-mecha.png",
        description:
          "The stat stick. Three weapons drawing on one heat pool, so its damage is limited by cooling rather than ammunition. Runs in swarms, parents to Megabot, and takes any Assault Mecha within 420 units as its squad leader.",
        stats: [
          { label: "Hull", value: "280–520" },
          { label: "Heat", value: "100" },
          { label: "Reach", value: "920" },
          { label: "XP", value: "120" },
        ],
        loadout: [
          "Machine gun: 3-round bursts of 2.25 at 910 u/s, 920 reach",
          "Heavy blaster: 24 damage, 46 blast, every 1.18 s",
          "Shoulder rocket: 36 damage, 58 blast, every 3.2 s, two in the air at once",
          "Heat pool of 100 that cools at 34/s; boost 1.2× for one second every 6 s",
          "Own shield; levels 1–20 take it from 280 to 520 hull and 11 to 22 damage",
        ],
        ladder: { points: 3, unlocksAtWave: 5 },
        forge: { seconds: 26, metal: 150, energy: 22 },
        quote: "Unauthorized pilot identified. Pursuit authorized.",
      },
      {
        token: "mecha_medic",
        name: "Mecha Medic",
        weightClass: "Support",
        role: "Field repair",
        description:
          "Keeps the legion walking. It holds a 680-unit standoff behind the line, heals the mecha in front of it and rates the Assault Mecha as its highest-value patient. The hive fields one for every four mecha alive.",
        stats: [
          { label: "Hull", value: "320" },
          { label: "Speed", value: "140" },
          { label: "Standoff", value: "680" },
          { label: "XP", value: "260" },
        ],
        loadout: [
          "Heals mecha units in reach, Assault Mecha first (priority 3.0)",
          "Sidearm: 6 damage at 1.2/s, a deterrent rather than a weapon",
          "Its own state machine rather than the generic enemy brain",
        ],
        ladder: { points: 2, unlocksAtWave: 3 },
        forge: { seconds: 32, metal: 140, energy: 36 },
      },
      {
        token: "evil_robot",
        name: "Evil Robot",
        weightClass: "Line",
        role: "Rank and file",
        description:
          "The Empire's line fighter: a fast two-gun hull on the generic enemy brain that closes to an 820-unit standoff and holds it. No tricks and no state machine, and there are always more of them.",
        stats: [
          { label: "Hull", value: "420" },
          { label: "Speed", value: "210" },
          { label: "Standoff", value: "820" },
          { label: "XP", value: "150" },
        ],
        loadout: [
          "Twin volley: 2 rounds of 12 at 1.35/s",
          "Aggression radius 2,100 on range-and-avoidance AI",
        ],
      },
      {
        token: "mecha_predator",
        name: "Mecha Predator",
        weightClass: "Hunter",
        role: "Melee reactor-hunter",
        image: "/evil-robots/units/mecha-predator.png",
        description:
          "A quadruped built low and long, cheetah-shaped, with energy-sensing lattice eyes and retractable claws designed to pierce reactors. It sprints, pounces, locks its jaws on the hull and feeds, draining your energy into a capacitor it can spend on a lance.",
        stats: [
          { label: "Pounce", value: "320" },
          { label: "Capacitor", value: "420" },
          { label: "Contact", value: "140" },
          { label: "XP", value: "180" },
        ],
        loadout: [
          "Pounce: arms on launch, lands on arrival, every 1.15 s",
          "Maw lock: a feed bite that ticks contact damage every 0.25 s",
          "Energy drain: a tether from the jaws that charges the capacitor",
          "Capacitor lance: 150 charge a shot, harder the fuller the pool",
          "Sprint jets that spool up with real speed; turns peak near 470°/s",
        ],
        ladder: { points: 6, unlocksAtWave: 8 },
      },
      {
        token: "terminator",
        name: "Terminator",
        weightClass: "Heavy",
        role: "Dreadnought",
        image: "/evil-robots/units/terminator.png",
        description:
          "The dreadnought. Quad lasers, turret batteries, berserk missile racks and a point-defence screen that shoots your rounds out of the air before they arrive. It deploys with an Assault Mecha on its bow more often than not, and by wave fourteen it comes with an escort.",
        stats: [
          { label: "Hull", value: "900" },
          { label: "Volley", value: "4 × 24" },
          { label: "Reach", value: "950" },
          { label: "XP", value: "400" },
        ],
        loadout: [
          "Quad laser: bolts at 1,500 u/s",
          "Turret batteries on every flank",
          "Berserk missiles: 100 damage at 900 u/s",
          "Point defence that deletes incoming player fire in flight",
          "Vanguard: a 55% chance to bring an Assault Mecha, one per Terminator",
        ],
        ladder: { points: 10, unlocksAtWave: 12 },
      },
      {
        token: "assault_mecha",
        name: "Assault Mecha",
        weightClass: "Heavy",
        role: "The Iron Fist",
        image: "/evil-robots/units/assault-mecha.png",
        description:
          "MEGABOT's heavy: a MechWarrior-shaped walker that stands between a Terminator and whatever the Terminator is looking at, and answers the first exchange with everything on its shoulders. It can shell you all day from range, or close and open up with everything for nine seconds, cool for six, and do it again.",
        stats: [
          { label: "Hull", value: "2,400" },
          { label: "Shields", value: "550" },
          { label: "Speed", value: "118" },
          { label: "XP", value: "900" },
        ],
        loadout: [
          "Hellstorm pods: two 6-tube shoulder boxes of 14-damage homing rockets, a 6-missile ripple every 5.5 s",
          "Plasma cannon: 44 damage, 64 blast, 1.4 s charge, 3.4 s cooldown",
          "Twin railguns: 20 kinetic at 1,150 u/s, one arm every 0.8 s",
          "Autocannons: 5-round bursts of 3.0, the evil-robot machine-gun standard",
          "Heat cools at 14/s; the torso turns at 150°/s over legs at 95°/s; jump jets past 1,000 units",
          "Five states: hunting, bombarding, sieging, escorting a Terminator, defending the drop point",
          "Command aura: Mini Mechas within 420 units take it as squad leader",
        ],
      },
      {
        token: "mega_mecha_scout",
        name: "Mega Mecha Scout",
        weightClass: "Boss-class",
        role: "The first boss",
        image: "/evil-robots/units/mega-mecha-scout.png",
        description:
          "The scout's big sibling in heavier plate with hot trim and a red eye: the first encounter built to read like a boss, with its own header, threat panel and voice. It engages at 1,700 units, walks its missiles out one at a time so you can count them, and calls Mecha Scouts to escort it.",
        stats: [
          { label: "Hull", value: "2,400" },
          { label: "Shields", value: "550" },
          { label: "Engages", value: "1,700" },
          { label: "Effective", value: "2,950" },
        ],
        loadout: [
          "Long-range volley: 5–7 homing missiles released every 0.42–0.48 s",
          "Mid-range volley: two cluster and two splitter missiles, one every 0.34 s",
          "Punish volley: two rounds at 0.30 s when you get close",
          "Machine gun tracers, darts, and summoned Mecha Scout escorts",
          "Never runs two launchers at once, so there is always a gap to pick",
        ],
        ladder: { points: 25, unlocksAtWave: 20 },
      },
      {
        token: "nanobot",
        name: "Nanobot Swarm",
        weightClass: "Swarm",
        role: "Chaff and turrets",
        description:
          "The Empire's chaff: six-member nanite clusters seeded across the field at a steady rate, plus nanobot turrets rooted where the swarm gathers. Worth almost nothing each, worth a lot to whatever is hiding behind them.",
        stats: [
          { label: "Cluster", value: "6" },
          { label: "Spawn", value: "60/min" },
          { label: "Turrets", value: "14/min" },
          { label: "XP", value: "5 / 15" },
        ],
        loadout: [
          "Swarm spread: a 38-unit median across the cluster",
          "Turrets: 15 XP and 10 credits each, at most two per chunk",
          "Counts as a mecha unit for the collision and alliance tables",
        ],
      },
      {
        token: "mecha_factory",
        name: "Mecha Factory",
        weightClass: "Structure",
        role: "Roaming forge and hangar",
        image: "/evil-robots/units/mecha-factory.png",
        description:
          "A planet-scale roaming forge that feeds the legion. It cruises the map on long legs, keeps clear of hazards, earns metal and energy as it goes, forges one hull at a time, houses what it builds, launches patrol wings and calls damaged mecha home to dock.",
        stats: [
          { label: "Cruise", value: "14 u/s" },
          { label: "Income", value: "4.5 m/s" },
          { label: "Hangar", value: "6 / 4 / 2" },
          { label: "Deployed", value: "8 max" },
        ],
        loadout: [
          "Roams 1,400–3,600-unit legs, dwells 24–48 s, keeps 2,600 units clear of hazards",
          "Forge order: scout, mini, scout, medic, scout; Terminators launch last",
          "Launches a two-ship patrol wing every 40 s; escorts hold 520 units and leash at 1,400",
          "Docks any mecha under 45% hull for repair",
          "Searchlight arc and hazard lights you can read from across the map",
        ],
      },
      {
        token: "megabot_dominion_core",
        name: "Dominion Core",
        weightClass: "Command",
        role: "The robot hive at Mechatropolis",
        description:
          "The Empire's strategic mind. It registers your ship and every holding you take as a contact, scores targets, propagates pressure through the network and assembles waves against the highest-scoring one. Seat yourself as the Evil Robots and it sends nothing: the hive knows its overlord.",
        stats: [
          { label: "Wave 1", value: "4 pts" },
          { label: "Wave 10", value: "22 pts" },
          { label: "Wave 20", value: "42 pts" },
          { label: "Interval", value: "3→1 min" },
        ],
        loadout: [
          "Points per wave: 4 + 2 × (wave − 1); the interval starts at 180 s and shrinks 5 s a wave to a 60 s floor",
          "Budget spent highest-unlocked first: wave 1 is four scouts, wave 14 a Terminator with an escort",
          "Every holding you take is another contact; more contacts, more pressure, a steeper ladder",
          "Factory output, target scoring and wave legs run as strategic tasks with checkpoints",
        ],
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
