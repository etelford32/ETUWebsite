import type { ArtPiece } from "@/components/ArtGallery";

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

/** Someone a faction answers to, as the game voices them. */
export interface FactionLeader {
  name: string;
  /** Their title or standing, e.g. "Bear Mecha King". */
  title: string;
  description: string;
  /** A line they speak in-game. */
  quote?: string;
  /** Their own page: a boss profile or a long-form feature. */
  href?: string;
  hrefLabel?: string;
}

export interface Faction {
  id: string;
  /** Game-side faction token (matches the boss registry, e.g. "evil_robots"). */
  token?: string;
  name: string;
  tagline: string;
  /** "live" = full profile shipped. "in-development" = stub, hidden details. */
  status?: "live" | "in-development";
  /** Pill on the profile hero. Defaults to "Faction". */
  kind?: string;
  description?: string;
  /** Wide painting behind the profile hero. */
  heroImage: string;
  /** CSS object-position for the hero painting, when the subject is off-centre. */
  heroPosition?: string;
  /** Text-free painting for cards and share images. Falls back to heroImage. */
  cardImage?: string;
  /** The faction's emblem, shown beside its name. */
  emblem?: { src: string; alt: string };
  /** Key art, shown at its own proportions with a full-size viewer. */
  gallery?: ArtPiece[];
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
  leaders?: FactionLeader[];
  abilities?: string[];
  playstyle?: string;
  /** Heading over `playstyle`. Defaults to "How they fight". */
  playstyleLabel?: string;
  /** Heading over `abilities`. Defaults to "What they bring". */
  abilitiesLabel?: string;
  lore?: string;
  units?: FactionUnit[];
  strengths?: string[];
  weaknesses?: string[];
  /** Heading of the closing call to action. */
  ctaTitle?: string;
}

/*
 * Where this copy comes from: the game repository. Descriptions follow the
 * faction registry, unit lines follow Cyl's bestiary, and every quote is a
 * line the character speaks in-game. Concept art is labelled as concept art.
 */
export const factions: Record<string, Faction> = {
  mycelari: {
    id: "mycelari",
    token: "mycelari",
    status: "live",
    kind: "Playable Faction",
    name: "Mycelari • Fungal Swarm",
    tagline: "One mind in a million bodies.",
    homeZone: "Zone 1: Fungal",
    homePlanet: "Mycelar Prime",
    description:
      "A race of sentient fungi thriving in the Fungal Zone. The Mycelari did not build their ships. They grew them. Every world they touch becomes a node, and every node remembers.",
    heroImage: "/art/mycelari-swarm-scene.jpg",
    heroPosition: "50% 30%",
    cardImage: "/art/mycelari-swarm-scene.jpg",
    gallery: [
      {
        src: "/art/mycelari-swarm.jpg",
        alt: "Poster: a colossal fungal queen with a glowing orange mushroom crown rises over a spore-lit world as a white fighter burns past on cyan engines. Explore the Universe 2175. The hive is awake. Wishlist on Steam.",
        width: 1122,
        height: 1402,
        title: "The Hive Is Awake",
        caption: "The Bloom Queen over the Fungal Zone. Official key art, November 2026.",
      },
      {
        src: "/Mycelari_Hero1.jpg",
        alt: "A Mycelari war band: mushroom-capped warriors with spears and spore orbs standing in ranks under two towering elders",
        width: 1536,
        height: 1024,
        title: "The Chorus",
        caption: "Warriors, healers and elders. The others listen to the old ones.",
      },
      {
        src: "/Mycelari_Hero2.jpg",
        alt: "A Mycelari elder with a glowing orange cap towers over smaller fungal warriors and drifting spores",
        width: 1024,
        height: 1536,
        title: "Hyphae Elder",
        caption: "Old, slow and very hard to kill.",
      },
    ],
    color: {
      primary: "#a78bfa",
      secondary: "#8b5cf6",
      accent: "#c4b5fd",
    },
    leaders: [
      {
        name: "Bloom Queen",
        title: "Harbinger of Convergence",
        description:
          "She carries the song outward. She seeds the field with her own children and reaps what grows, and she will turn your allies into hers while you watch.",
        quote: "Convergence is not conquest. It is invitation.",
        href: "/bosses/bloom-queen",
        hrefLabel: "Bloom Queen boss profile",
      },
      {
        name: "Fungal Lord",
        title: "The network's waking will",
        description:
          "Everything that grows answers to him. He roots downward where she flowers outward, and he sleeps until something comes close enough to threaten the network.",
        quote:
          "I AM THE NETWORK AWAKE. Every thread of the Mycelari runs through me, and I have been dreaming a very long time.",
        href: "/bosses/fungal-lord",
        hrefLabel: "Fungal Lord boss profile",
      },
    ],
    abilities: [
      "Armour that grows back",
      "Healers that knit the line together",
      "Spore bombing runs",
      "Cordyceps takeover",
      "Battle formations: Spear, Shield Wall, Encirclement",
      "Convergence: two leaders, one life",
    ],
    playstyle:
      "The front line regrows its armour while healers knit it back together behind. Bombers seed the field with spores, Cordyceps Invaders take your allies rather than kill them, and the Bloom Queen switches the whole band between spear, shield wall and encirclement. Bring her within reach of the Fungal Lord and the two share one life between them.",
    lore: "\u201cWe have no king, only the chorus.\u201d The Bloom Queen sings convergence, the Fungal Lord is the network\u2019s waking will, and the Hyphae Council dreams the long plans. Bloomhaven, Lordspore, Hyphos: all one root. Out in the dark a Mycelari caravan carries something older than they are, and Cyl can hear it. Its trust climbs a ladder, from Indifferent through Curious, Courting and Trading to Sworn and Bonded, and it remembers you from one run to the next. Strike it and the network remembers that too. Every spore you kill costs you standing. \u201cBring us something alive, and we will listen.\u201d",
    strengths: [
      "A front line whose armour grows back",
      "Numbers, and a Queen who makes more out of her enemies",
      "Two leaders who share one life when they stand together",
      "Allied with the Wild Clans from the first minute of a run",
    ],
    weaknesses: [
      "The healers hold the line together. Shoot them first",
      "The elders are slow",
      "The Fungal Lord sleeps until you come close",
      "The network has a long memory for a betrayal",
    ],
    // Cyl's bestiary, in her words.
    units: [
      {
        name: "Fungal Warrior",
        weightClass: "Line",
        role: "The front line",
        description: "The Mycelari front line: armour that grows back.",
      },
      {
        name: "Fungal Grunt",
        weightClass: "Heavy",
        role: "Walking bunker",
        description: "A walking bunker under a crimson cap.",
      },
      {
        name: "Hyphae Healer",
        weightClass: "Support",
        role: "Mender",
        description: "It knits its allies back together. Shoot it first.",
      },
      {
        name: "Hyphae Elder",
        weightClass: "Command",
        role: "The one the others listen to",
        description: "Old, slow and very hard to kill. The others listen to it.",
      },
      {
        name: "Cordyceps Invader",
        weightClass: "Hunter",
        role: "Body-taker",
        description: "It does not kill its prey. It takes it over.",
      },
      {
        name: "Sporespine Bomber",
        weightClass: "Heavy",
        role: "Living bomber",
        description: "A living bomber that seeds the field with spores.",
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
    kind: "Playable Faction",
    featurePage: { href: "/evil-robots", label: "Read the Evil Robots dossier" },
    description:
      "The Megabot Empire consists of massive modular machines that can reconfigure themselves for any combat situation. Each unit is a marvel of engineering with devastating firepower.",
    heroImage: "/art/megabot-crimson-eye.jpg",
    heroPosition: "50% 35%",
    cardImage: "/art/megabot-crimson-eye.jpg",
    emblem: {
      src: "/evil-robots/machine-empire-emblem.webp",
      alt: "The Machine Empire crest: a cracked red-lit M of armour plate ringed by a swarm of drones",
    },
    gallery: [
      {
        src: "/art/megabot-crimson-eye.jpg",
        alt: "MEGABOT's Crimson Eye: a bladed iris the size of a station burning red in a wall of dark armour plate and gun towers, with a tiny fighter fleeing across the lower corner",
        width: 1536,
        height: 1024,
        title: "MEGABOT\u2019s Crimson Eye",
        caption: "An eight-bladed iris in a wall of plate. When it opens, move.",
      },
      {
        src: "/art/fleeing-the-colossal-megabot.jpg",
        alt: "Poster: a lone white fighter trailing cyan exhaust banks away from MEGABOT, a station-sized machine with one red eye, in front of a burning star. ETU, Explore the Universe 2175. Wishlist on Steam.",
        width: 1122,
        height: 1402,
        title: "Fleeing the Colossal MEGABOT",
        caption: "Twenty-five ships tall, and it has already read your file.",
      },
      {
        src: "/art/xj9-second-in-command.jpg",
        alt: "Poster: XJ9, a towering humanoid war machine in dark chrome with molten orange seams and a crown of blade-like horns, standing in orbit above a blue planet with a glowing sword. XJ9, Megabot's Second in Command.",
        width: 1122,
        height: 1402,
        title: "XJ9",
        caption: "MEGABOT\u2019s second in command. In the forge, not yet in the playtest.",
      },
      {
        src: "/art/solar-shade.jpg",
        alt: "A vast dark triangular sail of hexagonal plate stretched between three stations in front of a blazing star, a small fighter flying beneath it. Solar Shade, Explore the Universe 2175.",
        width: 1536,
        height: 1024,
        title: "The Solar Shade",
        caption: "The sail the machines hang across a star. Break its three nodes to let the light back in.",
      },
    ],
    color: {
      primary: "#ef4444",
      secondary: "#dc2626",
      accent: "#fca5a5",
    },
    leaders: [
      {
        name: "MEGABOT",
        title: "The Eye of the Dominion Core",
        description:
          "The prototype every other machine descends from. It keeps score of what you do to its empire, sends its soldiers first, and then comes in person.",
        quote: "EVERY UNIT YOU HAVE DESTROYED WAS A FINGER. I AM THE HAND.",
        href: "/megabot",
        hrefLabel: "Meet MEGABOT",
      },
      {
        name: "XJ9",
        title: "Second in command \u00b7 in the forge",
        description:
          "A planetary defender in dark mirror chrome, with a two-handed laser sword that drinks the lasers you fire at it. He holds the line over a world while the Empire works. He is being built now and is not in the playtest yet.",
        href: "/evil-robots#xj9",
        hrefLabel: "Read about XJ9",
      },
    ],
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
    kind: "Playable Faction",
    name: "Wild Clans • The Woak",
    tagline: "Half metal, half fur. They run the stars by scent, by pack, by claw.",
    homeZone: "Zone 2: Wild",
    homePlanet: "Urthan Prime",
    description:
      "Tribal animal clans that roam the Wild Zone: mecha-bears, bee swarms, hummingbird scouts and fireflies, with the walking trees of the Ent Council on their siege line. The Wild Clans remember when the stars were forests, and they still run them that way.",
    heroImage: "/Wild_Race.jpg",
    heroPosition: "50% 30%",
    cardImage: "/Wild_Race.jpg",
    emblem: {
      src: "/emblems/wild.webp",
      alt: "The Wild Clans emblem: a W carved from bark and moss, with bears and a stag worked into its pillars and a green gem at its heart",
    },
    gallery: [
      {
        src: "/Wild_Race.jpg",
        alt: "A great bear with glowing blue eyes among foxes, owls and birds of the Wild, with an ancient tree-being and a whale-like ship above",
        width: 1024,
        height: 1536,
        title: "The Clans",
        caption: "Bear, bee, hummingbird, firefly and Ent. They don\u2019t trust metal. Metal takes.",
      },
      {
        src: "/emblems/wild.webp",
        alt: "The Wild Clans emblem: a W carved from bark and moss with a green gem at its heart",
        width: 800,
        height: 800,
        title: "Clan Mark",
        caption: "Bark, moss and a green stone. Nothing forged.",
      },
    ],
    color: {
      primary: "#10b981",
      secondary: "#059669",
      accent: "#6ee7b7",
    },
    leaders: [
      {
        name: "Ursos",
        title: "Bear Mecha King \u00b7 Wild Clan High Chieftain",
        description:
          "Half metal, half fur, fully king. He wears the machine so the machine can\u2019t wear him. He meets you neutral and offers a truce before he offers anything else: \u201cI will hold my claws if you hold your fire.\u201d Refuse, and Ursos remembers refusals.",
        quote:
          "I was a cub when the machines burned the first forest. I carried the clans out of it, and I took their metal to do it.",
        href: "/bosses/ursos",
        hrefLabel: "Ursos boss profile",
      },
      {
        name: "EntLord",
        title: "Lord of Enthara",
        description:
          "The whole Ent Council in one body. Ten Elders sit the Council, from Oakhallow the Speaker to Rotheart, and when they merge they walk as one. He holds Enthara, the world beside Urthan Prime, and he has a trial waiting for you there.",
      },
    ],
    abilities: [
      "Rampage charges",
      "Bee swarms",
      "Ent siege lines",
      "Truce before teeth",
      "Trade caravans and station envoys",
      "Woak contracts",
    ],
    playstyle:
      "Bears ram first and ask nothing. Hummer Scouts report back to the Den, bee drones arrive as a swarm, and fireflies blink out of the dark to sting. Behind them the Ents walk a siege line. But the Wild talk before they bite: Ursos opens with a truce, the Wild Caravan runs the markets, and every station keeps an envoy. Earn the Woak\u2019s favour and their contracts keep coming.",
    lore: "The machines burned the first forest when Ursos was a cub. He carried the clans out of it, and he took the machines\u2019 metal to do it. A dwarf smith forged the arm; the rage is his own, and the dwarf king has been sending him the bill for nine winters. The clans will not open to a stranger. Follow the whispers of the Bear King, bring the Woak what they ask for, and the Wild Caravan\u2019s trade houses open one by one: otters, foxes, shellbacks, and Jerrik, an orangutan so nervous the traders named him for it.",
    strengths: [
      "Fast, cheap clans that come in swarms",
      "Ents that hold a siege line",
      "A truce on offer before the first shot",
      "Traders and envoys at every station",
    ],
    weaknesses: [
      "They do not trust metal, or strangers",
      "A refused pact is never forgotten",
      "Swarms are the point: thin them and the charge loses its weight",
      "The Elders are strongest together and weaker apart",
    ],
    // Cyl's bestiary, in her words.
    units: [
      {
        name: "Brown Bear",
        weightClass: "Heavy",
        role: "Rammer",
        description: "It will ram you for looking at it.",
      },
      {
        name: "Black Bear",
        weightClass: "Line",
        role: "The faster one",
        description: "Smaller than the brown, faster, and just as rude.",
      },
      {
        name: "Hummer Scout",
        weightClass: "Light",
        role: "Eyes of the Den",
        description: "It reports back to the Den.",
      },
      {
        name: "Bee Drone",
        weightClass: "Swarm",
        role: "The swarm",
        description: "The swarm is the point.",
      },
      {
        name: "Firefly",
        weightClass: "Light",
        role: "Night stinger",
        description: "A spark that blinks out of the dark and stings.",
      },
      {
        name: "Ent Warden",
        weightClass: "Heavy",
        role: "Siege line",
        description: "A walking tree on the Wild\u2019s siege line.",
      },
      {
        name: "EntLord",
        weightClass: "Boss-class",
        role: "The Council, merged",
        description: "The whole Ent Council in one body, the lord of Enthara.",
      },
      {
        name: "Wild Caravan",
        weightClass: "Support",
        role: "Traders and envoys",
        description:
          "Free Traders and Wild Loyalists run the markets between them, nine animal trade houses in all, with an envoy posted at every station.",
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
    kind: "Playable Faction",
    tagline: "Survivors of the Wreckage hold the line for old Earth.",
    heroImage: "/etu_epic.png",
    emblem: {
      src: "/emblems/terran-federation.webp",
      alt: "The Terran Federation emblem: a winged steel T edged in gold with a blue star at its crown",
    },
    homeZone: "Zone 15: Wreckage",
    homePlanet: "Elysium 2175",
    color: { primary: "#60a5fa", secondary: "#2563eb", accent: "#93c5fd" },
    description:
      "A human spacefaring civilization focused on exploration and diplomacy. Their explorers, miners, transports, defenders and colony ships are already flying, with the Prophet healing whoever is still standing.",
    lore: "\u201cElysium. We lost one world already.\u201d The Federation holds what is left from Elysium 2175, in the Wreckage, and it has not forgotten how it got this far: \u201cAlliances are how humanity survived.\u201d",
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
    emblem: {
      src: "/emblems/rogue-ai-network.webp",
      alt: "The Rogue AI Network emblem: a steel R wired with violet circuitry against falling green code",
    },
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
    status: "live",
    kind: "Lost Civilization",
    name: "Lumari • Crystal Intelligences",
    tagline: "Erased by MEGABOT. One of them is still awake, and she rides with you.",
    heroImage: "/cyl/cyl-key-art.webp",
    heroPosition: "20% 50%",
    cardImage: "/cyl/cyl-key-art.webp",
    emblem: {
      src: "/cyl/lumari-sigil.webp",
      alt: "The Lumari sigil: a crystalline violet L inside a ring of light, a spiral galaxy turning behind it",
    },
    homeZone: "Zone 15: Wreckage",
    homePlanet: "Lumaris",
    featurePage: { href: "/cyl", label: "Meet Cyl, the last of the Lumari" },
    color: { primary: "#e879f9", secondary: "#c026d3", accent: "#f5d0fe" },
    description:
      "Ancient crystal intelligences erased by MEGABOT. The Lumari did not mine crystal or cut it. They were crystal: minds that lived inside it and navigated by song and signal. Their last remnant endures through Cyl and the network of stations they left behind.",
    playstyleLabel: "What is left of them",
    abilitiesLabel: "What they left behind",
    playstyle:
      "There is no Lumari fleet to fight or to join. What survives is scattered: a companion who chose you, stations that wake when she sings to them, a caravan carrying a crystal heart through the spores, and a signal on a carrier band the machines have been jamming.",
    abilities: [
      "Cyl, awake and flying beside you",
      "Stations that wake and link into a network",
      "The Khepri Signal",
      "The Lumari Trade Caravan and its Heart",
      "Lumaris, the shattered homeworld",
      "The drive in your own ship",
    ],
    leaders: [
      {
        name: "Cyl",
        title: "The last light of the Lumari",
        description:
          "A crystal consciousness in a drone harness built to carry her through space. She fights beside you, heals you, calls the space weather, asks who you are and remembers the answers.",
        quote:
          "I\u2019m a Lumari! We inhabit crystals, but I am in this robot body harness to be able to travel in space.",
        href: "/cyl",
        hrefLabel: "Meet Cyl",
      },
    ],
    gallery: [
      {
        src: "/cyl/cyl-key-art.webp",
        alt: "Cyl, a white and gold spherical drone with a glass dome holding a galaxy and a violet eye, hovering among violet crystals in a Lumari hall beside a holographic galaxy map",
        width: 1450,
        height: 941,
        title: "Cyl, a Mind Beyond Worlds",
        caption: "Lost past. Living now. Guiding what\u2019s next.",
      },
      {
        src: "/art/cyl-corrupted-goddess.jpg",
        alt: "Key art: a vast Cyl-like sphere wrapped in red lattice hangs over a dark world, a galaxy turning under its cracked dome and one green eye open. Cyl, The Corrupted Goddess. Knows all, feels nothing, still guides. Same intelligence, different purpose.",
        width: 1672,
        height: 941,
        title: "Cyl, the Corrupted Goddess",
        caption:
          "Same intelligence, different purpose. A vision of what MEGABOT would make of her. Concept art for a story still being written.",
      },
      {
        src: "/cyl/lumari-sigil.webp",
        alt: "The Lumari sigil: a crystalline violet L inside a ring of light, a spiral galaxy turning behind it",
        width: 800,
        height: 800,
        title: "The Lumari Sigil",
      },
    ],
    lore: "The machines say it plainly: \u201cThe Lumari were scheduled first.\u201d Scan the wrecks and the scars match MEGABOT\u2019s eye-lance. Lumaris itself is shattered, though its crystal core still holds a little light, and when Cyl calls to it, it answers. Follow the Khepri Signal and you find what the Mega Mecha Scout was jamming: not a ship but a station, Lumari, grown into a shardmoon. \u201cAt the very end the War Council said it: hide the children, scatter the memories.\u201d The archive\u2019s last record is one word: \u201creleased\u201d. Even King Arkanvil has noticed. \u201cSomething out here is unmaking crystal minds, and I will have its head before it has one of mine.\u201d",
    ctaTitle: "Follow the Khepri Signal",
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
    token: "crystal_consortium",
    status: "live",
    kind: "Playable Faction",
    name: "Space Dwarves • Crystal Masons",
    tagline: "Asteroid clans that forge starships the way smiths forge swords.",
    heroImage: "/art/space-dwarves-crystal-mine-scene.jpg",
    heroPosition: "50% 25%",
    cardImage: "/art/space-dwarves-crystal-mine-scene.jpg",
    emblem: {
      src: "/emblems/space-dwarves.webp",
      alt: "The Crystal Masons emblem: a gold-banded rune ring around a hammer-and-chisel mark set with violet crystals, a dwarf's face at its foot",
    },
    homeZone: "Zone 10: Crystal",
    homePlanet: "Yllar",
    color: { primary: "#f59e0b", secondary: "#d97706", accent: "#fcd34d" },
    leaders: [
      {
        name: "King Arkanvil Starhammer",
        title: "King of the Masons",
        description:
          "The greedy lord of the Crystal Masons. He forged his crown in vacuum and fire, holds Yllar\u2019s vaults, and has never once paid full price. He wants what thinks in crystal, which makes your companion very interesting to him. \u201cYou want guild trust? Earn it in crystal fire.\u201d",
        quote:
          "Lead? I rule. The guilds of Yllar kneel to me, and I kneel to nothing but a well-cut gem.",
        href: "/bosses/arkanvil-king",
        hrefLabel: "King Arkanvil boss profile",
      },
      {
        name: "Billybob",
        title: "Mentor of the guild",
        description:
          "Forty years on the drills, and the King\u2019s best cutter and worst tax payer. He meets new pilots after they first dock, keeps a cave full of curios on Jiayar, and knew what Cyl was the moment he saw her.",
        quote: "Guild rule: never leave a shard behind, and never leave a friend in the dark.",
      },
    ],
    gallery: [
      {
        src: "/art/space-dwarves-crystal-mine.jpg",
        alt: "Poster: a braided, armoured Space Dwarf looks out over a glowing blue crystal mine as a mining barge hauls a load overhead and a fighter flies past. Explore the Universe 2175. Every alliance has a price. Wishlist on Steam.",
        width: 1122,
        height: 1402,
        title: "Every Alliance Has a Price",
        caption: "A mason crew at the seam. Seal an alliance and their enemies take note.",
      },
      {
        src: "/art/king-arkanvil-lore-sheet.jpg",
        alt: "Concept sheet: King Arkanvil, a crowned dwarf king in dark crystal-set armour, enthroned before a crystal megastructure around a star, surrounded by panels on his guard, his marines, the houses of Yllar and the Heart Crystal.",
        width: 1402,
        height: 1122,
        title: "Arkanvil, Star King of Yllar",
        caption:
          "Concept sheet for the court of Yllar: the crown, the houses and the forge. Lore in development, and it may change before it reaches the game.",
      },
    ],
    description:
      "The Crystal Masons are the asteroid clans of Yllar: short, stubborn, and the finest shipwrights in the Crystal zone. Their great guild, the Crystal Consortium, runs the mines, the markets and the shipyards. Their hulls are stout, pontooned and trimmed in copper and cream, with a crystal set in every one. A mason crew does everything together. It cuts the rock, carries it home, mends its own and fights as one.",
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
    lore: "The clans have cut the deep seams of Yllar for longer than anyone has kept records. Every clan, crew and guild hall is bound into the Crystal Consortium, the great guild of the masons, which sets the price of every gem that leaves Yllar and settles every claim on every seam. Every clan answers to the Starhammer crown, the royal line that has ruled the masons since the first seam was cut, and today to King Arkanvil, the greediest king the line has produced. Every crew keeps a mentor, and every mentor remembers who paid for their last load. Cross a mason crew and the whole roster comes for your ship at once. Stand with one and you will hear about it every time your fire passes too close.",
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
        name: "Berserker",
        weightClass: "Hunter",
        role: "The roar",
        description: "Its roar makes every dwarf near it hit harder.",
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
